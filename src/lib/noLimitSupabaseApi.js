import { supabase } from "./supabaseClient";

const SUPABASE_NOT_CONFIGURED_MESSAGE =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, restart Vite, then try again.";

function getSupabaseClient() {
  return supabase || null;
}

function isSupabaseClientReady(client) {
  return Boolean(
    client &&
      client.auth &&
      typeof client.auth.getSession === "function" &&
      typeof client.from === "function"
  );
}

export function getSupabaseStatus() {
  const client = getSupabaseClient();
  const configured = isSupabaseClientReady(client);

  return {
    configured,
    hasClient: Boolean(client),
    hasAuth: Boolean(client?.auth),
    hasDatabase: typeof client?.from === "function",
    message: configured ? "Supabase client is configured." : SUPABASE_NOT_CONFIGURED_MESSAGE,
  };
}

export function isSupabaseConfigured() {
  return getSupabaseStatus().configured;
}

export function createSupabaseUnavailableError() {
  const error = new Error(SUPABASE_NOT_CONFIGURED_MESSAGE);
  error.name = "SupabaseConfigurationError";
  error.code = "SUPABASE_NOT_CONFIGURED";
  error.isSupabaseUnavailable = true;
  return error;
}

function requireSupabase() {
  const client = getSupabaseClient();

  if (!isSupabaseClientReady(client)) {
    throw createSupabaseUnavailableError();
  }

  return client;
}

function getOptionalSupabase(context) {
  const client = getSupabaseClient();

  if (!isSupabaseClientReady(client)) {
    console.warn(`${context}: ${SUPABASE_NOT_CONFIGURED_MESSAGE}`);
    return null;
  }

  return client;
}

function isMissingSingleRowError(error) {
  return error?.code === "PGRST116";
}

function normalizeRequiredText(value, fallback = "") {
  return String(value || fallback).trim();
}

export async function getCurrentSession() {
  const client = getOptionalSupabase("getCurrentSession");

  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data?.session || null;
}

export async function signInWithEmailPassword(email, password) {
  const client = requireSupabase();

  const cleanEmail = normalizeRequiredText(email);
  const cleanPassword = normalizeRequiredText(password);

  if (!cleanEmail || !cleanPassword) {
    throw new Error("Email and password are required for Supabase login.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutUser() {
  const client = getOptionalSupabase("signOutUser");

  if (!client) {
    return true;
  }

  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }

  return true;
}

export async function getCurrentProfile() {
  const client = getOptionalSupabase("getCurrentProfile");

  if (!client) {
    return null;
  }

  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error && !isMissingSingleRowError(error)) {
    throw error;
  }

  return data || null;
}

export async function getExerciseLibrary() {
  const client = getOptionalSupabase("getExerciseLibrary");

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getClients() {
  const client = getOptionalSupabase("getClients");

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createClientRecord({
  coachId,
  name,
  email,
  status = "Active",
  notes = "",
}) {
  const client = requireSupabase();

  const cleanName = normalizeRequiredText(name);

  if (!cleanName) {
    throw new Error("Client name is required.");
  }

  const { data, error } = await client
    .from("clients")
    .insert({
      coach_id: coachId || null,
      name: cleanName,
      email: normalizeRequiredText(email),
      status: status || "Active",
      notes: notes || "",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateClientStatus(clientId, status) {
  const client = requireSupabase();

  if (!clientId) {
    throw new Error("Client ID is required.");
  }

  const { data, error } = await client
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
  const client = getOptionalSupabase("getWorkoutPlansWithDetails");

  if (!client) {
    return [];
  }

  const { data, error } = await client
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
  const client = requireSupabase();

  const cleanPlanName = normalizeRequiredText(planName);

  if (!cleanPlanName) {
    throw new Error("Plan name is required.");
  }

  const { data: plan, error: planError } = await client
    .from("workout_plans")
    .insert({
      coach_id: coachId || null,
      client_id: clientId || null,
      plan_name: cleanPlanName,
      status: "Active",
    })
    .select()
    .single();

  if (planError) {
    throw planError;
  }

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];

    const { data: workoutDay, error: dayError } = await client
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

    const exercises = Array.isArray(day.exercises) ? day.exercises : [];

    if (exercises.length > 0) {
      const exerciseRows = exercises.map((exercise, exerciseIndex) => ({
        workout_day_id: workoutDay.id,
        exercise_library_id: exercise.exerciseLibraryId || null,
        exercise_name: exercise.exerciseName || "Exercise",
        exercise_order: exerciseIndex + 1,
        sets: exercise.sets || "",
        reps_or_time: exercise.repsOrTime || "",
        weight_guidance: exercise.weightGuidance || "",
        rest_period: exercise.rest || "",
        coach_notes: exercise.notes || "",
      }));

      const { error: exerciseError } = await client
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
  const client = getOptionalSupabase("getWorkoutLogsWithEntries");

  if (!client) {
    return [];
  }

  const { data, error } = await client
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
  const client = requireSupabase();

  if (!clientId) {
    throw new Error("Client ID is required.");
  }

  if (!status) {
    throw new Error("Workout status is required.");
  }

  const { data: workoutLog, error: logError } = await client
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

  const safeEntries = Array.isArray(entries) ? entries : [];

  if (safeEntries.length > 0) {
    const entryRows = safeEntries.map((entry) => ({
      workout_log_id: workoutLog.id,
      plan_exercise_id: entry.planExerciseId || null,
      exercise_name: entry.exerciseName || "Exercise",
      actual_weight: entry.actualWeight || "",
      sets_completed: entry.setsCompleted || "",
      reps_completed: entry.repsCompleted || "",
      time_completed: entry.timeCompleted || "",
      actual_rest: entry.restUsed || "",
      exercise_substitution: entry.substitution || "",
      client_notes: entry.notes || "",
    }));

    const { error: entryError } = await client
      .from("workout_entries")
      .insert(entryRows);

    if (entryError) {
      throw entryError;
    }
  }

  return workoutLog;
}

export async function getMessagesForClient(clientId) {
  const client = getOptionalSupabase("getMessagesForClient");

  if (!client || !clientId) {
    return [];
  }

  const { data, error } = await client
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
  const client = requireSupabase();

  const cleanBody = normalizeRequiredText(body);

  if (!clientId) {
    throw new Error("Client ID is required.");
  }

  if (!cleanBody) {
    throw new Error("Message body is required.");
  }

  const cleanSenderRole = String(senderRole || "coach").toLowerCase();

  const { data, error } = await client
    .from("messages")
    .insert({
      client_id: clientId,
      sender_profile_id: senderProfileId,
      sender_role: cleanSenderRole,
      body: cleanBody,
      unread_for_coach: cleanSenderRole === "client",
      unread_for_client: cleanSenderRole === "coach",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markMessagesRead(clientId, readerRole) {
  const client = requireSupabase();

  if (!clientId) {
    throw new Error("Client ID is required.");
  }

  const updatePayload =
    readerRole === "coach"
      ? { unread_for_coach: false }
      : { unread_for_client: false };

  const { data, error } = await client
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
  const client = getOptionalSupabase("getNotifications");

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function markNotificationRead(notificationId) {
  const client = requireSupabase();

  if (!notificationId) {
    throw new Error("Notification ID is required.");
  }

  const { data, error } = await client
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
  const client = getOptionalSupabase("getNotificationPreferences");

  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("notification_preferences")
    .select("*")
    .single();

  if (error && !isMissingSingleRowError(error)) {
    throw error;
  }

  return data || null;
}

export async function upsertNotificationPreferences(preferences) {
  const client = requireSupabase();

  if (!preferences || typeof preferences !== "object") {
    throw new Error("Notification preferences are required.");
  }

  const { data, error } = await client
    .from("notification_preferences")
    .upsert(preferences, { onConflict: "coach_id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}