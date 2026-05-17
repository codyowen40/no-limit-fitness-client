import { supabase } from "./supabaseClient";

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithEmailPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  return true;
}

export async function getCurrentProfile() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getExerciseLibrary() {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createClientRecord({ coachId, name, email, status = "Active", notes = "" }) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      coach_id: coachId,
      name,
      email,
      status,
      notes,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateClientStatus(clientId, status) {
  const { data, error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", clientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getWorkoutPlansWithDetails() {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(`
      *,
      workout_days (
        *,
        plan_exercises (*)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createWorkoutPlanWithDetails({
  coachId,
  clientId,
  planName,
  days = [],
}) {
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      plan_name: planName,
      status: "Active",
    })
    .select()
    .single();

  if (planError) {
    throw planError;
  }

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];

    const { data: workoutDay, error: dayError } = await supabase
      .from("workout_days")
      .insert({
        plan_id: plan.id,
        day_name: day.name || `Day ${dayIndex + 1}`,
        day_order: dayIndex + 1,
      })
      .select()
      .single();

    if (dayError) {
      throw dayError;
    }

    const exercises = day.exercises || [];

    if (exercises.length > 0) {
      const exerciseRows = exercises.map((exercise, exerciseIndex) => ({
        workout_day_id: workoutDay.id,
        exercise_library_id: exercise.exerciseLibraryId || null,
        exercise_name: exercise.exerciseName,
        exercise_order: exerciseIndex + 1,
        sets: exercise.sets || "",
        reps_or_time: exercise.repsOrTime || "",
        weight_guidance: exercise.weightGuidance || "",
        rest_period: exercise.rest || "",
        coach_notes: exercise.notes || "",
      }));

      const { error: exerciseError } = await supabase
        .from("plan_exercises")
        .insert(exerciseRows);

      if (exerciseError) {
        throw exerciseError;
      }
    }
  }

  return plan;
}

export async function getWorkoutLogsWithEntries() {
  const { data, error } = await supabase
    .from("workout_logs")
    .select(`
      *,
      workout_entries (*)
    `)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createWorkoutLogWithEntries({
  clientId,
  planId = null,
  workoutDayId = null,
  planName = "",
  dayName = "",
  status,
  skipReason = "",
  entries = [],
}) {
  const { data: workoutLog, error: logError } = await supabase
    .from("workout_logs")
    .insert({
      client_id: clientId,
      plan_id: planId,
      workout_day_id: workoutDayId,
      plan_name: planName,
      day_name: dayName,
      status,
      skip_reason: skipReason,
    })
    .select()
    .single();

  if (logError) {
    throw logError;
  }

  if (entries.length > 0) {
    const entryRows = entries.map((entry) => ({
      workout_log_id: workoutLog.id,
      plan_exercise_id: entry.planExerciseId || null,
      exercise_name: entry.exerciseName,
      actual_weight: entry.actualWeight || "",
      sets_completed: entry.setsCompleted || "",
      reps_completed: entry.repsCompleted || "",
      time_completed: entry.timeCompleted || "",
      actual_rest: entry.restUsed || "",
      exercise_substitution: entry.substitution || "",
      client_notes: entry.notes || "",
    }));

    const { error: entryError } = await supabase
      .from("workout_entries")
      .insert(entryRows);

    if (entryError) {
      throw entryError;
    }
  }

  return workoutLog;
}

export async function getMessagesForClient(clientId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function sendMessage({
  clientId,
  senderProfileId = null,
  senderRole,
  body,
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      client_id: clientId,
      sender_profile_id: senderProfileId,
      sender_role: senderRole,
      body,
      unread_for_coach: senderRole === "client",
      unread_for_client: senderRole === "coach",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markMessagesRead(clientId, readerRole) {
  const updatePayload =
    readerRole === "coach"
      ? { unread_for_coach: false }
      : { unread_for_client: false };

  const { data, error } = await supabase
    .from("messages")
    .update(updatePayload)
    .eq("client_id", clientId)
    .select();

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getNotificationPreferences() {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

export async function upsertNotificationPreferences(preferences) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(preferences, { onConflict: "coach_id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}