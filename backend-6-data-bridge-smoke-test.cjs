const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const { createClient } = require("@supabase/supabase-js");

function readEnvLocal() {
  const envPath = path.join(__dirname, ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local was not found.");
  }

  const envText = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    env[key] = value;
  }

  return env;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizePlan(plan) {
  return {
    id: plan.id,
    clientId: plan.client_id,
    clientName: plan.clients?.name || "",
    planName: plan.plan_name,
    days: [...(plan.workout_days || [])]
      .sort((a, b) => (a.day_order || 0) - (b.day_order || 0))
      .map((day) => ({
        id: day.id,
        name: day.day_name,
        exercises: [...(day.plan_exercises || [])]
          .sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0))
          .map((exercise) => ({
            id: exercise.id,
            exerciseName: exercise.exercise_name,
            sets: exercise.sets || "",
            repsOrTime: exercise.reps_or_time || "",
            weightGuidance: exercise.weight_guidance || "",
            rest: exercise.rest_period || "",
            notes: exercise.coach_notes || "",
          })),
      })),
  };
}

function normalizeWorkoutLog(log) {
  return {
    id: log.id,
    clientId: log.client_id,
    clientName: log.clients?.name || "",
    planName: log.plan_name || "",
    dayName: log.day_name || "",
    status: log.status,
    skipReason: log.skip_reason || "",
    submittedAt: formatDateTime(log.submitted_at || log.created_at),
    entries: (log.workout_entries || []).map((entry) => ({
      id: entry.id,
      exerciseName: entry.exercise_name,
      actualWeight: entry.actual_weight || "",
      setsCompleted: entry.sets_completed || "",
      repsCompleted: entry.reps_completed || "",
      timeCompleted: entry.time_completed || "",
      restUsed: entry.actual_rest || "",
      substitution: entry.exercise_substitution || "",
      notes: entry.client_notes || "",
    })),
  };
}

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Login failed for ${email}: ${error.message}`);
  }

  return data.user;
}

async function signOut(supabase) {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

async function getProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data;
}

async function main() {
  const env = readEnvLocal();

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  assert(supabaseUrl, "Missing VITE_SUPABASE_URL in .env.local");
  assert(
    supabasePublishableKey,
    "Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.local"
  );

  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("Backend 6 Data Bridge smoke test");
  console.log("Passwords stay local in this terminal.");
  console.log("");

  const coachPassword = await rl.question(
    "Enter coach@nolimittest.com password: "
  );

  const clientPassword = await rl.question(
    "Enter client@nolimittest.com password: "
  );

  rl.close();

  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  const timestamp = Date.now();
  const planName = `Backend 6 Bridge Plan ${timestamp}`;
  const clientNote = `Backend 6 bridge client note ${timestamp}`;
  const coachMessage = `Backend 6 bridge coach message ${timestamp}`;
  const clientMessage = `Backend 6 bridge client message ${timestamp}`;

  console.log("");
  console.log("1. Coach login...");

  const coachUser = await signIn(
    supabase,
    "coach@nolimittest.com",
    coachPassword
  );

  const coachProfile = await getProfile(supabase, coachUser.id);

  assert(coachProfile.role === "coach", "Coach profile role was not coach.");

  console.log(`Coach verified: ${coachProfile.email}`);

  console.log("");
  console.log("2. Coach reads client and exercise library...");

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("email", "client@nolimittest.com")
    .single();

  if (clientError) throw clientError;

  const { data: backSquat, error: exerciseError } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("name", "Back Squat")
    .single();

  if (exerciseError) throw exerciseError;

  assert(clientRow.id, "Client row missing id.");
  assert(backSquat.id, "Back Squat missing id.");

  console.log(`Client verified: ${clientRow.name}`);
  console.log(`Exercise verified: ${backSquat.name}`);

  console.log("");
  console.log("3. Coach creates backend plan using bridge-shaped data...");

  const appPlanShape = {
    coachId: coachProfile.id,
    clientId: clientRow.id,
    planName,
    days: [
      {
        name: "Backend 6 Strength Day",
        exercises: [
          {
            exerciseLibraryId: backSquat.id,
            exerciseName: "Back Squat",
            sets: "5",
            repsOrTime: "5 - 7",
            weightGuidance: "RPE 8",
            rest: "120 sec",
            notes: "Backend 6 bridge coach note.",
          },
        ],
      },
    ],
  };

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      coach_id: appPlanShape.coachId,
      client_id: appPlanShape.clientId,
      plan_name: appPlanShape.planName,
      status: "Active",
    })
    .select()
    .single();

  if (planError) throw planError;

  const { data: day, error: dayError } = await supabase
    .from("workout_days")
    .insert({
      plan_id: plan.id,
      day_name: appPlanShape.days[0].name,
      day_order: 1,
    })
    .select()
    .single();

  if (dayError) throw dayError;

  const { data: planExercise, error: planExerciseError } = await supabase
    .from("plan_exercises")
    .insert({
      workout_day_id: day.id,
      exercise_library_id: backSquat.id,
      exercise_name: "Back Squat",
      exercise_order: 1,
      sets: "5",
      reps_or_time: "5 - 7",
      weight_guidance: "RPE 8",
      rest_period: "120 sec",
      coach_notes: "Backend 6 bridge coach note.",
    })
    .select()
    .single();

  if (planExerciseError) throw planExerciseError;

  console.log(`Plan created: ${plan.plan_name}`);

  console.log("");
  console.log("4. Coach reads and normalizes backend plan...");

  const { data: coachPlanRead, error: coachPlanReadError } = await supabase
    .from("workout_plans")
    .select(`
      *,
      clients (
        name,
        email
      ),
      workout_days (
        *,
        plan_exercises (*)
      )
    `)
    .eq("id", plan.id)
    .single();

  if (coachPlanReadError) throw coachPlanReadError;

  const normalizedCoachPlan = normalizePlan(coachPlanRead);

  assert(
    normalizedCoachPlan.planName === planName,
    "Normalized coach plan name mismatch."
  );

  assert(
    normalizedCoachPlan.days[0].exercises[0].exerciseName === "Back Squat",
    "Normalized coach plan exercise mismatch."
  );

  console.log(`Normalized plan verified: ${normalizedCoachPlan.planName}`);

  console.log("");
  console.log("5. Coach sends backend message and notification...");

  const { error: coachMessageError } = await supabase.from("messages").insert({
    client_id: clientRow.id,
    sender_profile_id: coachProfile.id,
    sender_role: "coach",
    body: coachMessage,
    unread_for_coach: false,
    unread_for_client: true,
  });

  if (coachMessageError) throw coachMessageError;

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      coach_id: coachProfile.id,
      client_id: clientRow.id,
      type: "coach_assigned_plan",
      title: "Coach assigned new plan",
      body: planName,
      is_read: false,
    });

  if (notificationError) throw notificationError;

  await signOut(supabase);

  console.log("");
  console.log("6. Client login and assigned plan read...");

  const clientUser = await signIn(
    supabase,
    "client@nolimittest.com",
    clientPassword
  );

  const clientProfile = await getProfile(supabase, clientUser.id);

  assert(clientProfile.role === "client", "Client profile role was not client.");

  const { data: clientPlanRead, error: clientPlanReadError } = await supabase
    .from("workout_plans")
    .select(`
      *,
      clients (
        name,
        email
      ),
      workout_days (
        *,
        plan_exercises (*)
      )
    `)
    .eq("id", plan.id)
    .single();

  if (clientPlanReadError) throw clientPlanReadError;

  const normalizedClientPlan = normalizePlan(clientPlanRead);

  assert(
    normalizedClientPlan.planName === planName,
    "Client could not normalize assigned plan."
  );

  console.log(`Client can read normalized plan: ${normalizedClientPlan.planName}`);

  console.log("");
  console.log("7. Client completes backend workout log...");

  const { data: workoutLog, error: workoutLogError } = await supabase
    .from("workout_logs")
    .insert({
      client_id: clientRow.id,
      plan_id: plan.id,
      workout_day_id: day.id,
      plan_name: planName,
      day_name: "Backend 6 Strength Day",
      status: "completed",
      skip_reason: "",
    })
    .select()
    .single();

  if (workoutLogError) throw workoutLogError;

  const { error: workoutEntryError } = await supabase
    .from("workout_entries")
    .insert({
      workout_log_id: workoutLog.id,
      plan_exercise_id: planExercise.id,
      exercise_name: "Back Squat",
      actual_weight: "245 lb",
      sets_completed: "5",
      reps_completed: "7, 7, 6, 6, 5",
      time_completed: "N/A",
      actual_rest: "120 sec",
      exercise_substitution: "Box Squat",
      client_notes: clientNote,
    });

  if (workoutEntryError) throw workoutEntryError;

  const { error: clientMessageError } = await supabase.from("messages").insert({
    client_id: clientRow.id,
    sender_profile_id: clientProfile.id,
    sender_role: "client",
    body: clientMessage,
    unread_for_coach: true,
    unread_for_client: false,
  });

  if (clientMessageError) throw clientMessageError;

  await signOut(supabase);

  console.log("");
  console.log("8. Coach reads and normalizes logs/messages/notifications...");

  await signIn(supabase, "coach@nolimittest.com", coachPassword);

  const { data: coachLogRead, error: coachLogReadError } = await supabase
    .from("workout_logs")
    .select(`
      *,
      clients (
        name,
        email
      ),
      workout_entries (*)
    `)
    .eq("id", workoutLog.id)
    .single();

  if (coachLogReadError) throw coachLogReadError;

  const normalizedLog = normalizeWorkoutLog(coachLogRead);

  assert(normalizedLog.planName === planName, "Normalized workout log plan mismatch.");
  assert(normalizedLog.entries[0].notes === clientNote, "Normalized workout note mismatch.");
  assert(normalizedLog.entries[0].substitution === "Box Squat", "Normalized substitution mismatch.");

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientRow.id)
    .in("body", [coachMessage, clientMessage]);

  if (messagesError) throw messagesError;

  assert(messages.length >= 2, "Expected coach and client bridge messages.");

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("*")
    .eq("client_id", clientRow.id)
    .eq("body", planName);

  if (notificationsError) throw notificationsError;

  assert(notifications.length >= 1, "Expected bridge notification.");

  await signOut(supabase);

  console.log("");
  console.log("Backend 6 Data Bridge smoke test passed.");
  console.log("");
  console.log("Verified:");
  console.log("- Backend rows can be shaped like the React app state");
  console.log("- Exercise Library can feed the frontend");
  console.log("- Clients can feed the frontend");
  console.log("- Plans can feed the frontend");
  console.log("- Workout logs can feed the frontend");
  console.log("- Messages can feed the frontend");
  console.log("- Notifications can feed the frontend");
}

main().catch((error) => {
  console.log("");
  console.error("Backend 6 Data Bridge smoke test failed.");
  console.error(error.message || error);
  process.exit(1);
});