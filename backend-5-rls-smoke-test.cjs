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

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Login failed for ${email}: ${error.message}`);
  }

  if (!data.user?.id) {
    throw new Error(`Login did not return a user for ${email}.`);
  }

  return data.user;
}

async function signOut(supabase) {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
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

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL in .env.local");
  }

  if (!supabasePublishableKey) {
    throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
  }

  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("Backend 5 RLS smoke test");
  console.log("Passwords are only used locally for this test.");
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
  const testPlanName = `Backend 5 RLS Test Plan ${timestamp}`;
  const coachMessageBody = `Backend 5 coach message ${timestamp}`;
  const clientMessageBody = `Backend 5 client message ${timestamp}`;
  const clientWorkoutNote = `Backend 5 client completed workout note ${timestamp}`;

  console.log("");
  console.log("1. Signing in as coach...");

  const coachUser = await signIn(
    supabase,
    "coach@nolimittest.com",
    coachPassword
  );

  const coachProfile = await getProfile(supabase, coachUser.id);

  if (coachProfile.role !== "coach") {
    throw new Error(`Expected coach role. Got: ${coachProfile.role}`);
  }

  console.log(`Coach profile verified: ${coachProfile.email} / ${coachProfile.role}`);

  console.log("");
  console.log("2. Reading linked client as coach...");

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("email", "client@nolimittest.com")
    .single();

  if (clientError) throw clientError;

  console.log(`Client row verified: ${clientRow.name} / ${clientRow.email}`);

  console.log("");
  console.log("3. Reading Supabase exercise library...");

  const { data: backSquat, error: exerciseError } = await supabase
    .from("exercise_library")
    .select("*")
    .eq("name", "Back Squat")
    .single();

  if (exerciseError) throw exerciseError;

  console.log(`Exercise verified: ${backSquat.name}`);

  console.log("");
  console.log("4. Coach creates workout plan...");

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      coach_id: coachProfile.id,
      client_id: clientRow.id,
      plan_name: testPlanName,
      status: "Active",
    })
    .select()
    .single();

  if (planError) throw planError;

  const { data: day, error: dayError } = await supabase
    .from("workout_days")
    .insert({
      plan_id: plan.id,
      day_name: "Backend 5 Strength Day",
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
      sets: "4",
      reps_or_time: "6 - 8",
      weight_guidance: "RPE 7 - 8",
      rest_period: "90 - 120 sec",
      coach_notes: "Backend 5 test coach note.",
    })
    .select()
    .single();

  if (planExerciseError) throw planExerciseError;

  console.log(`Plan created: ${plan.plan_name}`);

  console.log("");
  console.log("5. Coach sends message and notification...");

  const { error: coachMessageError } = await supabase.from("messages").insert({
    client_id: clientRow.id,
    sender_profile_id: coachProfile.id,
    sender_role: "coach",
    body: coachMessageBody,
    unread_for_coach: false,
    unread_for_client: true,
  });

  if (coachMessageError) throw coachMessageError;

  const { error: coachNotificationError } = await supabase
    .from("notifications")
    .insert({
      coach_id: coachProfile.id,
      client_id: clientRow.id,
      type: "coach_assigned_plan",
      title: "Coach assigned new plan",
      body: testPlanName,
      is_read: false,
    });

  if (coachNotificationError) throw coachNotificationError;

  await signOut(supabase);

  console.log("");
  console.log("6. Signing in as client...");

  const clientUser = await signIn(
    supabase,
    "client@nolimittest.com",
    clientPassword
  );

  const clientProfile = await getProfile(supabase, clientUser.id);

  if (clientProfile.role !== "client") {
    throw new Error(`Expected client role. Got: ${clientProfile.role}`);
  }

  console.log(`Client profile verified: ${clientProfile.email} / ${clientProfile.role}`);

  console.log("");
  console.log("7. Client reads assigned plan...");

  const { data: clientPlan, error: clientPlanError } = await supabase
    .from("workout_plans")
    .select(`
      id,
      plan_name,
      workout_days (
        id,
        day_name,
        plan_exercises (
          id,
          exercise_name,
          sets,
          reps_or_time,
          weight_guidance,
          rest_period,
          coach_notes
        )
      )
    `)
    .eq("id", plan.id)
    .single();

  if (clientPlanError) throw clientPlanError;

  console.log(`Client can read assigned plan: ${clientPlan.plan_name}`);

  console.log("");
  console.log("8. Client completes workout...");

  const { data: workoutLog, error: workoutLogError } = await supabase
    .from("workout_logs")
    .insert({
      client_id: clientRow.id,
      plan_id: plan.id,
      workout_day_id: day.id,
      plan_name: testPlanName,
      day_name: "Backend 5 Strength Day",
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
      actual_weight: "225 lb",
      sets_completed: "4",
      reps_completed: "8, 8, 7, 6",
      time_completed: "N/A",
      actual_rest: "120 sec",
      exercise_substitution: "",
      client_notes: clientWorkoutNote,
    });

  if (workoutEntryError) throw workoutEntryError;

  const { error: clientMessageError } = await supabase.from("messages").insert({
    client_id: clientRow.id,
    sender_profile_id: clientProfile.id,
    sender_role: "client",
    body: clientMessageBody,
    unread_for_coach: true,
    unread_for_client: false,
  });

  if (clientMessageError) throw clientMessageError;

  const { error: clientNotificationError } = await supabase
    .from("notifications")
    .insert({
      coach_id: clientRow.coach_id,
      client_id: clientRow.id,
      type: "client_completed_workout",
      title: "Client completed workout",
      body: clientWorkoutNote,
      is_read: false,
    });

  if (clientNotificationError) throw clientNotificationError;

  console.log("Client workout log created.");

  await signOut(supabase);

  console.log("");
  console.log("9. Coach reads completed workout, messages, and notifications...");

  await signIn(supabase, "coach@nolimittest.com", coachPassword);

  const { data: coachWorkoutLog, error: coachWorkoutLogError } = await supabase
    .from("workout_logs")
    .select(`
      *,
      workout_entries (*)
    `)
    .eq("id", workoutLog.id)
    .single();

  if (coachWorkoutLogError) throw coachWorkoutLogError;

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientRow.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (messagesError) throw messagesError;

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("*")
    .eq("client_id", clientRow.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (notificationsError) throw notificationsError;

  console.log(`Coach can read workout log: ${coachWorkoutLog.plan_name}`);
  console.log(`Coach can read recent messages: ${messages.length}`);
  console.log(`Coach can read recent notifications: ${notifications.length}`);

  await signOut(supabase);

  console.log("");
  console.log("Backend 5 RLS smoke test passed.");
  console.log("");
  console.log("Verified:");
  console.log("- Coach login works");
  console.log("- Client login works");
  console.log("- Coach can create assigned plans");
  console.log("- Client can read assigned plans");
  console.log("- Client can complete workouts");
  console.log("- Coach can read completed workouts");
  console.log("- Messages table works");
  console.log("- Notifications table works");
}

main().catch((error) => {
  console.log("");
  console.error("Backend 5 RLS smoke test failed.");
  console.error(error.message || error);
  process.exit(1);
});