export const NO_LIMIT_SYNC_SCHEMA_VERSION = "no-limit-fitness-sync-v1";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  completedWorkout: true,
  skippedWorkout: true,
  changedValues: true,
  substitutions: true,
  workoutNotes: true,
  planAssigned: true,
  messages: true,
};

export const DEFAULT_BACKEND_SETTINGS = {
  coachEmail: "",
  emailProvider: "Supabase + Resend",
  backendStatus: "Frontend placeholder only",
  notes:
    "Email alerts should be sent from a backend later. Do not send email directly inside App.jsx.",
};

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanId(value, fallback) {
  return cleanText(value, fallback).replace(/\s+/g, "-").toLowerCase();
}

function cleanTimestamp(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function normalizeClient(client, index = 0) {
  const source = asObject(client);
  const id = cleanId(source.id, "client-" + (index + 1));
  const name = cleanText(source.name, "Client " + (index + 1));

  return {
    id,
    name,
    email: cleanText(source.email),
    status: cleanText(source.status, "Active"),
    notes: cleanText(source.notes),
    createdAt: cleanText(source.createdAt),
    timestamp: cleanTimestamp(source.timestamp, index + 1),
  };
}

export function normalizePlanExercise(exercise, index = 0) {
  const source = asObject(exercise);
  const id = cleanId(source.id, "exercise-" + (index + 1));
  const exerciseName = cleanText(source.exerciseName || source.name, "Exercise " + (index + 1));

  return {
    id,
    exerciseId: cleanText(source.exerciseId, id),
    exerciseName,
    muscles: cleanText(source.muscles),
    equipment: cleanText(source.equipment),
    sets: cleanText(source.sets),
    repsOrTime: cleanText(source.repsOrTime),
    weightGuidance: cleanText(source.weightGuidance),
    rest: cleanText(source.rest),
    notes: cleanText(source.notes),
  };
}

export function normalizeWorkoutDay(day, index = 0) {
  const source = asObject(day);
  const id = cleanId(source.id, "day-" + (index + 1));

  return {
    id,
    name: cleanText(source.name, "Day " + (index + 1)),
    exercises: asArray(source.exercises).map((exercise, exerciseIndex) =>
      normalizePlanExercise(exercise, exerciseIndex)
    ),
  };
}

export function normalizeSavedPlan(plan, index = 0, clientById = new Map()) {
  const source = asObject(plan);
  const id = cleanId(source.id, "plan-" + (index + 1));
  const clientId = cleanText(source.clientId);
  const matchedClient = clientById.get(clientId);

  return {
    id,
    planName: cleanText(source.planName || source.name, "Workout Plan " + (index + 1)),
    clientId,
    clientName: cleanText(source.clientName, matchedClient?.name || ""),
    createdAt: cleanText(source.createdAt),
    timestamp: cleanTimestamp(source.timestamp, index + 1),
    days: asArray(source.days).map((day, dayIndex) => normalizeWorkoutDay(day, dayIndex)),
  };
}

export function normalizeWorkoutEntry(entry, index = 0) {
  const source = asObject(entry);
  const id = cleanId(source.id, "entry-" + (index + 1));

  return {
    id,
    exerciseId: cleanText(source.exerciseId),
    exerciseName: cleanText(source.exerciseName, "Exercise " + (index + 1)),
    assignedSets: cleanText(source.assignedSets),
    assignedRepsOrTime: cleanText(source.assignedRepsOrTime),
    assignedWeightGuidance: cleanText(source.assignedWeightGuidance),
    assignedRest: cleanText(source.assignedRest),
    actualWeight: cleanText(source.actualWeight),
    setsCompleted: cleanText(source.setsCompleted),
    repsCompleted: cleanText(source.repsCompleted),
    timeCompleted: cleanText(source.timeCompleted),
    restUsed: cleanText(source.restUsed),
    substitution: cleanText(source.substitution),
    notes: cleanText(source.notes),
  };
}

export function normalizeWorkoutLog(log, index = 0, clientById = new Map()) {
  const source = asObject(log);
  const id = cleanId(source.id, "workout-log-" + (index + 1));
  const clientId = cleanText(source.clientId);
  const matchedClient = clientById.get(clientId);

  return {
    id,
    clientId,
    clientName: cleanText(source.clientName, matchedClient?.name || ""),
    planId: cleanText(source.planId),
    planName: cleanText(source.planName),
    dayId: cleanText(source.dayId),
    dayName: cleanText(source.dayName),
    status: cleanText(source.status, "completed").toLowerCase(),
    skipReason: cleanText(source.skipReason),
    submittedAt: cleanText(source.submittedAt),
    timestamp: cleanTimestamp(source.timestamp, index + 1),
    entries: asArray(source.entries).map((entry, entryIndex) =>
      normalizeWorkoutEntry(entry, entryIndex)
    ),
  };
}

export function normalizeConversation(conversation, index = 0, clientById = new Map()) {
  const source = asObject(conversation);
  const clientId = cleanText(source.clientId);
  const matchedClient = clientById.get(clientId);

  return {
    clientId,
    clientName: cleanText(source.clientName, matchedClient?.name || "Client " + (index + 1)),
    messages: asArray(source.messages).map((message, messageIndex) => {
      const messageSource = asObject(message);

      return {
        id: cleanId(messageSource.id, "message-" + (messageIndex + 1)),
        sender: cleanText(messageSource.sender, "Coach"),
        body: cleanText(messageSource.body),
        sentAt: cleanText(messageSource.sentAt),
        timestamp: cleanTimestamp(messageSource.timestamp, messageIndex + 1),
        unreadForCoach: Boolean(messageSource.unreadForCoach),
        unreadForClient: Boolean(messageSource.unreadForClient),
      };
    }),
  };
}

export function normalizeLocalState(value) {
  const source = asObject(value);

  const clients = asArray(source.clients).map((client, index) =>
    normalizeClient(client, index)
  );

  const clientById = new Map(clients.map((client) => [client.id, client]));

  const savedPlans = asArray(source.savedPlans).map((plan, index) =>
    normalizeSavedPlan(plan, index, clientById)
  );

  const workoutLogs = asArray(source.workoutLogs).map((log, index) =>
    normalizeWorkoutLog(log, index, clientById)
  );

  const conversationMap = new Map();

  asArray(source.conversations).forEach((conversation, index) => {
    const normalizedConversation = normalizeConversation(conversation, index, clientById);

    if (normalizedConversation.clientId) {
      conversationMap.set(normalizedConversation.clientId, normalizedConversation);
    }
  });

  clients.forEach((client) => {
    if (!conversationMap.has(client.id)) {
      conversationMap.set(client.id, {
        clientId: client.id,
        clientName: client.name,
        messages: [],
      });
    }
  });

  return {
    clients,
    savedPlans,
    workoutLogs,
    conversations: Array.from(conversationMap.values()),
    readActivityIds: asArray(source.readActivityIds).map((id) => cleanText(id)).filter(Boolean),
    notificationPreferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...asObject(source.notificationPreferences),
    },
    backendSettings: {
      ...DEFAULT_BACKEND_SETTINGS,
      ...asObject(source.backendSettings),
    },
  };
}

export function validateLocalStateForSync(value) {
  const state = normalizeLocalState(value);
  const errors = [];
  const warnings = [];

  if (state.clients.length === 0) {
    warnings.push("No clients are available to sync.");
  }

  state.clients.forEach((client) => {
    if (!client.name) {
      errors.push("A client is missing a name.");
    }
  });

  state.savedPlans.forEach((plan) => {
    if (!plan.planName) {
      errors.push("A workout plan is missing a plan name.");
    }

    if (!plan.clientId) {
      warnings.push("Workout plan " + plan.id + " is not assigned to a client.");
    }

    if (plan.days.length === 0) {
      errors.push("Workout plan " + plan.planName + " has no training days.");
    }

    plan.days.forEach((day) => {
      if (day.exercises.length === 0) {
        warnings.push("Workout day " + day.name + " has no exercises.");
      }
    });
  });

  state.workoutLogs.forEach((log) => {
    if (!log.clientId) {
      warnings.push("Workout log " + log.id + " is missing a client ID.");
    }

    if (!["completed", "skipped"].includes(log.status)) {
      warnings.push("Workout log " + log.id + " has an unusual status.");
    }

    if (log.status === "skipped" && !log.skipReason) {
      warnings.push("Skipped workout log " + log.id + " has no skip reason.");
    }
  });

  state.conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      if (!message.body) {
        warnings.push("Conversation for " + conversation.clientName + " has an empty message.");
      }
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    state,
  };
}

export function createSupabaseSyncPayload(value, options = {}) {
  const validation = validateLocalStateForSync(value);
  const state = validation.state;

  const workoutDays = [];
  const planExercises = [];

  state.savedPlans.forEach((plan) => {
    plan.days.forEach((day, dayIndex) => {
      workoutDays.push({
        id: day.id,
        plan_id: plan.id,
        day_name: day.name,
        day_order: dayIndex + 1,
      });

      day.exercises.forEach((exercise, exerciseIndex) => {
        planExercises.push({
          id: exercise.id,
          workout_day_id: day.id,
          exercise_library_id: exercise.exerciseId,
          exercise_name: exercise.exerciseName,
          exercise_order: exerciseIndex + 1,
          sets: exercise.sets,
          reps_or_time: exercise.repsOrTime,
          weight_guidance: exercise.weightGuidance,
          rest_period: exercise.rest,
          coach_notes: exercise.notes,
        });
      });
    });
  });

  const workoutEntries = [];

  state.workoutLogs.forEach((log) => {
    log.entries.forEach((entry, entryIndex) => {
      workoutEntries.push({
        id: entry.id,
        workout_log_id: log.id,
        plan_exercise_id: entry.exerciseId,
        exercise_name: entry.exerciseName,
        exercise_order: entryIndex + 1,
        actual_weight: entry.actualWeight,
        sets_completed: entry.setsCompleted,
        reps_completed: entry.repsCompleted,
        time_completed: entry.timeCompleted,
        actual_rest: entry.restUsed,
        exercise_substitution: entry.substitution,
        client_notes: entry.notes,
      });
    });
  });

  const messages = [];

  state.conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      messages.push({
        id: message.id,
        client_id: conversation.clientId,
        sender_role: message.sender.toLowerCase(),
        body: message.body,
        created_at_label: message.sentAt,
        unread_for_coach: message.unreadForCoach,
        unread_for_client: message.unreadForClient,
      });
    });
  });

  const payload = {
    schemaVersion: NO_LIMIT_SYNC_SCHEMA_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    source: "localStorage",
    status: validation.ok ? "ready" : "blocked",
    tables: {
      clients: state.clients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        status: client.status,
        notes: client.notes,
      })),
      workout_plans: state.savedPlans.map((plan) => ({
        id: plan.id,
        client_id: plan.clientId,
        plan_name: plan.planName,
        status: "Active",
      })),
      workout_days: workoutDays,
      plan_exercises: planExercises,
      workout_logs: state.workoutLogs.map((log) => ({
        id: log.id,
        client_id: log.clientId,
        plan_id: log.planId,
        workout_day_id: log.dayId,
        plan_name: log.planName,
        day_name: log.dayName,
        status: log.status,
        skip_reason: log.skipReason,
      })),
      workout_entries: workoutEntries,
      messages,
      notification_preferences: [state.notificationPreferences],
      backend_settings: [state.backendSettings],
    },
    validation: {
      ok: validation.ok,
      errors: validation.errors,
      warnings: validation.warnings,
    },
  };

  return {
    ...payload,
    summary: summarizeSyncPayload(payload),
  };
}

export function summarizeSyncPayload(payloadOrState) {
  if (payloadOrState?.tables) {
    return Object.fromEntries(
      Object.entries(payloadOrState.tables).map(([tableName, rows]) => [
        tableName,
        Array.isArray(rows) ? rows.length : 0,
      ])
    );
  }

  const payload = createSupabaseSyncPayload(payloadOrState, {
    generatedAt: "summary-only",
  });

  return payload.summary;
}
