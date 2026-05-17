import { supabase } from "./supabaseClient";

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function getTimestamp(value) {
  if (!value) return Date.now();

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export function normalizeBackendExercise(exercise) {
  return {
    id: exercise.id,
    name: exercise.name,
    categories: exercise.categories || [],
    musclesWorked: exercise.muscles_worked || "",
    equipment: exercise.equipment || "",
    createdAt: formatDateTime(exercise.created_at),
    updatedAt: formatDateTime(exercise.updated_at),
  };
}

export function normalizeBackendClient(client) {
  return {
    id: client.id,
    coachId: client.coach_id,
    profileId: client.profile_id,
    name: client.name,
    email: client.email,
    status: client.status || "Active",
    notes: client.notes || "",
    createdAt: formatDateTime(client.created_at),
    updatedAt: formatDateTime(client.updated_at),
  };
}

export function normalizeBackendPlan(plan) {
  const days = [...(plan.workout_days || [])]
    .sort((a, b) => (a.day_order || 0) - (b.day_order || 0))
    .map((day) => ({
      id: day.id,
      name: day.day_name,
      order: day.day_order || 1,
      exercises: [...(day.plan_exercises || [])]
        .sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0))
        .map((exercise) => ({
          id: exercise.id,
          exerciseLibraryId: exercise.exercise_library_id,
          exerciseName: exercise.exercise_name,
          exerciseOrder: exercise.exercise_order || 1,
          sets: exercise.sets || "",
          repsOrTime: exercise.reps_or_time || "",
          weightGuidance: exercise.weight_guidance || "",
          rest: exercise.rest_period || "",
          notes: exercise.coach_notes || "",
          createdAt: formatDateTime(exercise.created_at),
          updatedAt: formatDateTime(exercise.updated_at),
        })),
    }));

  return {
    id: plan.id,
    coachId: plan.coach_id,
    clientId: plan.client_id,
    clientName: plan.clients?.name || "",
    clientEmail: plan.clients?.email || "",
    planName: plan.plan_name,
    status: plan.status || "Active",
    createdAt: formatDateTime(plan.created_at),
    updatedAt: formatDateTime(plan.updated_at),
    days,
  };
}

export function normalizeBackendWorkoutLog(log) {
  return {
    id: log.id,
    clientId: log.client_id,
    clientName: log.clients?.name || "",
    clientEmail: log.clients?.email || "",
    planId: log.plan_id,
    workoutDayId: log.workout_day_id,
    planName: log.plan_name || "",
    dayName: log.day_name || "",
    status: log.status,
    skipReason: log.skip_reason || "",
    submittedAt: formatDateTime(log.submitted_at || log.created_at),
    timestamp: getTimestamp(log.submitted_at || log.created_at),
    entries: (log.workout_entries || []).map((entry) => ({
      id: entry.id,
      exerciseId: entry.plan_exercise_id,
      exerciseName: entry.exercise_name,
      actualWeight: entry.actual_weight || "",
      setsCompleted: entry.sets_completed || "",
      repsCompleted: entry.reps_completed || "",
      timeCompleted: entry.time_completed || "",
      restUsed: entry.actual_rest || "",
      substitution: entry.exercise_substitution || "",
      notes: entry.client_notes || "",
      createdAt: formatDateTime(entry.created_at),
    })),
  };
}

export function normalizeBackendMessage(message) {
  return {
    id: message.id,
    clientId: message.client_id,
    clientName: message.clients?.name || "",
    senderProfileId: message.sender_profile_id,
    senderRole: message.sender_role,
    sender: message.sender_role === "coach" ? "Coach" : "Client",
    body: message.body,
    unreadForCoach: Boolean(message.unread_for_coach),
    unreadForClient: Boolean(message.unread_for_client),
    sentAt: formatDateTime(message.created_at),
    timestamp: getTimestamp(message.created_at),
  };
}

export function normalizeBackendNotification(notification) {
  return {
    id: notification.id,
    coachId: notification.coach_id,
    clientId: notification.client_id,
    clientName: notification.clients?.name || "",
    type: notification.type,
    title: notification.title,
    body: notification.body || "",
    read: Boolean(notification.is_read),
    createdAt: formatDateTime(notification.created_at),
    timestamp: getTimestamp(notification.created_at),
  };
}

export function normalizeBackendNotificationPreferences(preferences) {
  if (!preferences) return null;

  return {
    id: preferences.id,
    coachId: preferences.coach_id,
    clientCompletedWorkout: Boolean(preferences.client_completed_workout),
    clientSkippedWorkout: Boolean(preferences.client_skipped_workout),
    clientChangedExercise: Boolean(preferences.client_changed_exercise),
    clientChangedValues: Boolean(preferences.client_changed_values),
    clientLeftNote: Boolean(preferences.client_left_note),
    coachAssignedPlan: Boolean(preferences.coach_assigned_plan),
    coachSentMessage: Boolean(preferences.coach_sent_message),
    clientSentMessage: Boolean(preferences.client_sent_message),
    coachEmail: preferences.coach_email || "",
    futureEmailProvider: preferences.future_email_provider || "Supabase + Resend",
    backendStatus: preferences.backend_status || "",
    createdAt: formatDateTime(preferences.created_at),
    updatedAt: formatDateTime(preferences.updated_at),
  };
}

export async function fetchBackendExerciseLibrary() {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map(normalizeBackendExercise);
}

export async function fetchBackendClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeBackendClient);
}

export async function fetchBackendPlans() {
  const { data, error } = await supabase
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
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeBackendPlan);
}

export async function fetchBackendWorkoutLogs() {
  const { data, error } = await supabase
    .from("workout_logs")
    .select(`
      *,
      clients (
        name,
        email
      ),
      workout_entries (*)
    `)
    .order("submitted_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeBackendWorkoutLog);
}

export async function fetchBackendMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map(normalizeBackendMessage);
}

export async function fetchBackendNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeBackendNotification);
}

export async function fetchBackendNotificationPreferences() {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") throw error;

  return normalizeBackendNotificationPreferences(data);
}

export async function createBackendClient({ coachId, name, email, status = "Active", notes = "" }) {
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

  if (error) throw error;

  return normalizeBackendClient(data);
}

export async function updateBackendClientStatus(clientId, status) {
  const { data, error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", clientId)
    .select()
    .single();

  if (error) throw error;

  return normalizeBackendClient(data);
}

export async function createBackendPlanFromAppPlan({
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

  if (planError) throw planError;

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

    if (dayError) throw dayError;

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

      if (exerciseError) throw exerciseError;
    }
  }

  return plan;
}

export async function createBackendWorkoutLogFromAppLog({
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

  if (logError) throw logError;

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

    if (entryError) throw entryError;
  }

  return workoutLog;
}

export async function sendBackendMessage({
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
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .single();

  if (error) throw error;

  return normalizeBackendMessage(data);
}

export async function markBackendMessagesRead(clientId, readerRole) {
  const updatePayload =
    readerRole === "coach"
      ? { unread_for_coach: false }
      : { unread_for_client: false };

  const { data, error } = await supabase
    .from("messages")
    .update(updatePayload)
    .eq("client_id", clientId)
    .select(`
      *,
      clients (
        name,
        email
      )
    `);

  if (error) throw error;

  return (data || []).map(normalizeBackendMessage);
}

export async function createBackendNotification({
  coachId,
  clientId,
  type,
  title,
  body = "",
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      coach_id: coachId,
      client_id: clientId,
      type,
      title,
      body,
      is_read: false,
    })
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .single();

  if (error) throw error;

  return normalizeBackendNotification(data);
}

export async function markBackendNotificationRead(notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select(`
      *,
      clients (
        name,
        email
      )
    `)
    .single();

  if (error) throw error;

  return normalizeBackendNotification(data);
}

export async function saveBackendNotificationPreferences(preferences) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        coach_id: preferences.coachId,
        client_completed_workout: preferences.clientCompletedWorkout,
        client_skipped_workout: preferences.clientSkippedWorkout,
        client_changed_exercise: preferences.clientChangedExercise,
        client_changed_values: preferences.clientChangedValues,
        client_left_note: preferences.clientLeftNote,
        coach_assigned_plan: preferences.coachAssignedPlan,
        coach_sent_message: preferences.coachSentMessage,
        client_sent_message: preferences.clientSentMessage,
        coach_email: preferences.coachEmail,
        future_email_provider: preferences.futureEmailProvider,
        backend_status: preferences.backendStatus,
      },
      { onConflict: "coach_id" }
    )
    .select()
    .single();

  if (error) throw error;

  return normalizeBackendNotificationPreferences(data);
}