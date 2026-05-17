const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx.");
}

let source = fs.readFileSync(appPath, "utf8");

if (!source.includes("Backend 7 Sync Panel")) {
  throw new Error("This script expects the clean Backend 7 version. Restore App-working-backend-7-sync-panel.jsx first.");
}

const backupPath = path.join(
  __dirname,
  "src",
  `App-before-backend-8-safe-install-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const backendMappingHelpers = `
function getBackendValue(source, keys, fallback = "") {
  if (!source || typeof source !== "object") return fallback;

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return fallback;
}

function normalizeBackendTimestamp(value) {
  if (!value) return Date.now();

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function normalizeBackendDateLabel(value) {
  if (!value) return new Date().toLocaleString();

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return String(value);

  return new Date(parsed).toLocaleString();
}

function normalizeBackendSender(value) {
  const sender = String(value || "Coach").toLowerCase();
  return sender.includes("client") ? "Client" : "Coach";
}

function mapBackendClientForApp(client) {
  return {
    id: String(getBackendValue(client, ["id", "clientId", "client_id"], makeId("backend-client"))),
    name: String(getBackendValue(client, ["name", "fullName", "full_name"], "Backend Client")),
    email: String(getBackendValue(client, ["email"], "")),
    status: String(getBackendValue(client, ["status"], "Active")),
  };
}

function mapBackendPlanExerciseForApp(exercise) {
  return {
    id: String(getBackendValue(exercise, ["id", "planExerciseId", "plan_exercise_id"], makeId("plan-exercise"))),
    exerciseId: String(getBackendValue(exercise, ["exerciseId", "exercise_id"], "")),
    exerciseName: String(getBackendValue(exercise, ["exerciseName", "exercise_name", "name"], "Backend Exercise")),
    sets: String(getBackendValue(exercise, ["sets", "assignedSets", "assigned_sets"], "")),
    repsOrTime: String(getBackendValue(exercise, ["repsOrTime", "reps_or_time", "reps", "time"], "")),
    weightGuidance: String(getBackendValue(exercise, ["weightGuidance", "weight_guidance"], "")),
    rest: String(getBackendValue(exercise, ["rest", "restPeriod", "rest_period"], "")),
    notes: String(getBackendValue(exercise, ["notes", "coachNotes", "coach_notes"], "")),
  };
}

function mapBackendPlanDayForApp(day, index) {
  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];

  return {
    id: String(getBackendValue(day, ["id", "dayId", "day_id"], makeId("day"))),
    name: String(getBackendValue(day, ["name", "dayName", "day_name"], \`Day \${index + 1}\`)),
    exercises: exercises.map(mapBackendPlanExerciseForApp),
  };
}

function mapBackendPlanForApp(plan, clients) {
  const clientId = String(getBackendValue(plan, ["clientId", "client_id"], ""));
  const matchedClient = clients.find((client) => client.id === clientId);
  const createdAtRaw = getBackendValue(plan, ["createdAt", "created_at", "updatedAt", "updated_at"], "");
  const days = Array.isArray(plan?.days) ? plan.days : [];

  return {
    id: String(getBackendValue(plan, ["id", "planId", "plan_id"], makeId("saved-plan"))),
    planName: String(getBackendValue(plan, ["planName", "plan_name", "name"], "Backend Workout Plan")),
    clientId,
    clientName: String(getBackendValue(plan, ["clientName", "client_name"], matchedClient?.name || "Backend Client")),
    days: days.map(mapBackendPlanDayForApp),
    createdAt: normalizeBackendDateLabel(createdAtRaw),
    timestamp: normalizeBackendTimestamp(createdAtRaw),
  };
}

function mapBackendWorkoutEntryForApp(entry) {
  return {
    exerciseId: String(getBackendValue(entry, ["exerciseId", "exercise_id"], "")),
    exerciseName: String(getBackendValue(entry, ["exerciseName", "exercise_name", "name"], "Backend Exercise")),
    assignedSets: String(getBackendValue(entry, ["assignedSets", "assigned_sets", "sets"], "")),
    assignedRepsOrTime: String(getBackendValue(entry, ["assignedRepsOrTime", "assigned_reps_or_time", "repsOrTime", "reps_or_time"], "")),
    assignedWeightGuidance: String(getBackendValue(entry, ["assignedWeightGuidance", "assigned_weight_guidance", "weightGuidance", "weight_guidance"], "")),
    assignedRest: String(getBackendValue(entry, ["assignedRest", "assigned_rest", "rest"], "")),
    actualWeight: String(getBackendValue(entry, ["actualWeight", "actual_weight"], "")),
    setsCompleted: String(getBackendValue(entry, ["setsCompleted", "sets_completed"], "")),
    repsCompleted: String(getBackendValue(entry, ["repsCompleted", "reps_completed"], "")),
    timeCompleted: String(getBackendValue(entry, ["timeCompleted", "time_completed"], "")),
    restUsed: String(getBackendValue(entry, ["restUsed", "rest_used"], "")),
    substitution: String(getBackendValue(entry, ["substitution", "exerciseSubstitution", "exercise_substitution"], "")),
    notes: String(getBackendValue(entry, ["notes", "clientNotes", "client_notes"], "")),
  };
}

function mapBackendWorkoutLogForApp(log, clients, plans) {
  const clientId = String(getBackendValue(log, ["clientId", "client_id"], ""));
  const planId = String(getBackendValue(log, ["planId", "plan_id"], ""));
  const matchedClient = clients.find((client) => client.id === clientId);
  const matchedPlan = plans.find((plan) => plan.id === planId);
  const submittedAtRaw = getBackendValue(log, ["submittedAt", "submitted_at", "createdAt", "created_at"], "");
  const entries = Array.isArray(log?.entries) ? log.entries : [];
  const rawStatus = String(getBackendValue(log, ["status"], "completed")).toLowerCase();

  return {
    id: String(getBackendValue(log, ["id", "logId", "log_id"], makeId("workout-log"))),
    clientId,
    clientName: String(getBackendValue(log, ["clientName", "client_name"], matchedClient?.name || "Backend Client")),
    planId,
    planName: String(getBackendValue(log, ["planName", "plan_name"], matchedPlan?.planName || "Backend Workout Plan")),
    dayId: String(getBackendValue(log, ["dayId", "day_id"], "")),
    dayName: String(getBackendValue(log, ["dayName", "day_name"], "Backend Workout")),
    status: rawStatus.includes("skip") ? "skipped" : "completed",
    submittedAt: normalizeBackendDateLabel(submittedAtRaw),
    timestamp: normalizeBackendTimestamp(submittedAtRaw),
    skipReason: String(getBackendValue(log, ["skipReason", "skip_reason"], "")),
    entries: entries.map(mapBackendWorkoutEntryForApp),
  };
}

function buildBackendConversationsForApp(clients, messages) {
  const grouped = new Map();

  clients.forEach((client) => {
    grouped.set(client.id, {
      clientId: client.id,
      clientName: client.name,
      messages: [],
    });
  });

  const normalizedMessages = Array.isArray(messages) ? messages : [];

  normalizedMessages.forEach((message) => {
    const clientId = String(getBackendValue(message, ["clientId", "client_id"], clients[0]?.id || ""));

    if (!clientId) return;

    if (!grouped.has(clientId)) {
      const matchedClient = clients.find((client) => client.id === clientId);

      grouped.set(clientId, {
        clientId,
        clientName: matchedClient?.name || "Backend Client",
        messages: [],
      });
    }

    const sender = normalizeBackendSender(getBackendValue(message, ["sender", "senderRole", "sender_role"], "Coach"));
    const sentAtRaw = getBackendValue(message, ["sentAt", "sent_at", "createdAt", "created_at"], "");

    grouped.get(clientId).messages.push({
      id: String(getBackendValue(message, ["id", "messageId", "message_id"], makeId("message"))),
      sender,
      body: String(getBackendValue(message, ["body", "message", "content"], "")),
      sentAt: normalizeBackendDateLabel(sentAtRaw),
      timestamp: normalizeBackendTimestamp(sentAtRaw),
      unreadForCoach: sender === "Client",
      unreadForClient: sender === "Coach",
    });
  });

  return Array.from(grouped.values()).map((conversation) => ({
    ...conversation,
    messages: conversation.messages.sort((a, b) => a.timestamp - b.timestamp),
  }));
}
`;

if (!source.includes("function mapBackendClientForApp")) {
  source = source.replace(
    "export default function App()",
    `${backendMappingHelpers}\nexport default function App()`
  );
}

const importHandler = `
  async function handleImportBackendDataIntoApp() {
    const [
      backendClients,
      backendPlans,
      backendWorkoutLogs,
      backendMessages,
    ] = await Promise.all([
      fetchBackendClients(),
      fetchBackendPlans(),
      fetchBackendWorkoutLogs(),
      fetchBackendMessages(),
    ]);

    const importedClients = Array.isArray(backendClients)
      ? backendClients.map(mapBackendClientForApp)
      : [];

    if (importedClients.length === 0) {
      throw new Error("No backend clients are visible. Sign in as coach first, then try importing again.");
    }

    const importedPlans = Array.isArray(backendPlans)
      ? backendPlans.map((plan) => mapBackendPlanForApp(plan, importedClients))
      : [];

    const importedWorkoutLogs = Array.isArray(backendWorkoutLogs)
      ? backendWorkoutLogs.map((log) => mapBackendWorkoutLogForApp(log, importedClients, importedPlans))
      : [];

    const importedConversations = buildBackendConversationsForApp(
      importedClients,
      Array.isArray(backendMessages) ? backendMessages : []
    );

    const firstClient = importedClients[0] || null;
    const firstPlan = importedPlans[0] || null;
    const firstDay = firstPlan?.days?.[0] || null;
    const firstLog = importedWorkoutLogs[0] || null;

    setClients(importedClients);
    setSavedPlans(importedPlans);
    setWorkoutLogs(importedWorkoutLogs);
    setConversations(importedConversations);
    setReadActivityIds([]);

    setSelectedClientProfileId(firstClient?.id || "");
    setTrackerClientId(firstClient?.id || "");
    setSelectedConversationId(firstClient?.id || "");

    setSelectedPlanDetailId(firstPlan?.id || "");
    setSelectedTrackerPlanId(firstPlan?.id || "");
    setSelectedTrackerDayId(firstDay?.id || "");

    setSelectedWorkoutLogId(firstLog?.id || "");

    setTrackingDrafts({});
    setSkipReason("");
    setBuilderMessage("");
    setTrackerMessage("");
    setMessageNotice("");
    setClientActionNotice("");
    setActivityFilter("All");

    const newDay = {
      id: makeId("day"),
      name: "Day 1 - Upper Body",
      exercises: [],
    };

    setPlanDraft({
      planName: "",
      clientId: firstClient?.id || "",
      days: [newDay],
    });

    setSelectedDayId(newDay.id);

    const summary =
      "Backend import complete: " +
      importedClients.length +
      " clients, " +
      importedPlans.length +
      " plans, " +
      importedWorkoutLogs.length +
      " workout logs, and " +
      importedConversations.reduce((total, conversation) => total + conversation.messages.length, 0) +
      " messages imported into the real app flow.";

    setLocalSaveNotice(
      summary +
        " LocalStorage now mirrors the imported backend data until full live sync is finished."
    );

    setActiveTab("Home");

    return summary;
  }
`;

if (!source.includes("async function handleImportBackendDataIntoApp()")) {
  source = source.replace(
    '\n  return (\n    <div className="min-h-screen bg-black text-white">',
    `${importHandler}\n  return (\n    <div className="min-h-screen bg-black text-white">`
  );
}

source = source.replace(
  "function BackendSyncPanel()",
  "function BackendSyncPanel({ onBackendImport })"
);

source = source.replace(
  "function LoginScreen()",
  "function LoginScreen({ onBackendImport })"
);

source = source.replace(
  "<BackendSyncPanel />",
  "<BackendSyncPanel onBackendImport={onBackendImport} />"
);

source = source.replace(
  '{activeTab === "Login" && <LoginScreen />}',
  '{activeTab === "Login" && <LoginScreen onBackendImport={handleImportBackendDataIntoApp} />}'
);

const panelHandler = `
  async function handleImportBackendIntoApp() {
    if (!onBackendImport) {
      setBackendStatus("Backend import handler is not connected yet.");
      return;
    }

    setBackendLoading(true);
    setBackendStatus("Importing Supabase data into the real app flow...");

    try {
      const summary = await onBackendImport();
      setBackendStatus(summary);
    } catch (error) {
      setBackendStatus("Backend app import failed: " + (error.message || String(error)));
    } finally {
      setBackendLoading(false);
    }
  }
`;

if (!source.includes("async function handleImportBackendIntoApp()")) {
  source = source.replace(
    "\n  const exercises = backendSnapshot?.exercises || [];",
    `\n${panelHandler}\n  const exercises = backendSnapshot?.exercises || [];`
  );
}

if (!source.includes("Import Backend Data Into App Flow")) {
  source = source.replace(
    `        <button
          type="button"
          onClick={handleLoadBackendData}
          disabled={backendLoading}
          className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
        >
          Load Backend Data
        </button>`,
    `        <button
          type="button"
          onClick={handleLoadBackendData}
          disabled={backendLoading}
          className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
        >
          Load Backend Data
        </button>

        <button
          type="button"
          onClick={handleImportBackendIntoApp}
          disabled={backendLoading}
          className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-5 py-3 text-sm font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black disabled:opacity-50"
        >
          Import Backend Data Into App Flow
        </button>`
  );
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Backend 8 safe install complete.");
console.log(`Backup saved at: ${backupPath}`);