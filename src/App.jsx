import { useEffect, useMemo, useState } from "react";
import ClientNutritionMacroHelper from "./ClientNutritionMacroHelper.jsx";
import {
  Activity,
  Bell,
  CheckCircle,
  ClipboardList,
  Copy,
  Dumbbell,
  Eye,
  Filter,
  Home,
  Inbox,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { getCurrentSession, getCurrentProfile, signInWithEmailPassword, signOutUser } from "./lib/noLimitSupabaseApi";
import { fetchBackendClients, fetchBackendPlans, fetchBackendWorkoutLogs, fetchBackendMessages, fetchBackendNotifications, fetchBackendNotificationPreferences, fetchBackendExerciseLibrary } from "./lib/noLimitBackendBridge";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";

const exerciseCategories = [
  "All",
  "Bodybuilding",
  "Calisthenics",
  "Conditioning",
  "CrossFit",
  "Mobility",
  "Olympic Weightlifting",
  "Powerlifting",
  "Sports Performance",
  "Strongman",
];

const ex = (name, categories, muscles, equipment) => ({
  name,
  categories,
  muscles,
  equipment,
});

const exerciseLibrary = [
  ex("90/90 Hip Switch", ["Mobility", "Sports Performance"], "Hips, glutes, adductors", "Bodyweight"),
  ex("Ab Wheel Rollout", ["Calisthenics", "Bodybuilding", "Sports Performance"], "Abs, lats, shoulders, hip flexors", "Ab wheel"),
  ex("Agility Ladder Drill", ["Sports Performance", "Conditioning"], "Calves, hips, quads, coordination", "Agility ladder"),
  ex("Air Squat", ["Calisthenics", "Mobility", "Conditioning"], "Quads, glutes, hamstrings, core", "Bodyweight"),
  ex("Arnold Press", ["Bodybuilding"], "Shoulders, triceps, upper chest", "Dumbbells"),
  ex("Assault Bike Sprint", ["Conditioning", "CrossFit", "Sports Performance"], "Quads, glutes, hamstrings, arms, lungs", "Assault bike"),
  ex("Atlas Stone Load", ["Strongman", "Sports Performance"], "Back, glutes, hamstrings, arms, grip", "Atlas stones, platform"),
  ex("Back Extension", ["Bodybuilding", "Powerlifting", "Sports Performance"], "Lower back, glutes, hamstrings", "Back extension bench"),
  ex("Back Squat", ["Powerlifting", "Bodybuilding", "Sports Performance", "CrossFit"], "Quads, glutes, hamstrings, core, upper back", "Barbell, rack, plates"),
  ex("Banded Ankle Mobility", ["Mobility", "Sports Performance"], "Ankles, calves", "Resistance band"),
  ex("Barbell Bench Press", ["Powerlifting", "Bodybuilding", "Sports Performance"], "Chest, triceps, front delts", "Barbell, bench, plates"),
  ex("Barbell Curl", ["Bodybuilding"], "Biceps, forearms", "Barbell"),
  ex("Barbell Hip Thrust", ["Bodybuilding", "Sports Performance", "Powerlifting"], "Glutes, hamstrings, core", "Barbell, bench, plates"),
  ex("Barbell Row", ["Bodybuilding", "Powerlifting", "Sports Performance"], "Lats, upper back, rear delts, biceps", "Barbell, plates"),
  ex("Battle Rope Waves", ["Conditioning", "CrossFit", "Sports Performance"], "Shoulders, arms, upper back, core", "Battle ropes"),
  ex("Bear Crawl", ["Calisthenics", "Conditioning", "Sports Performance"], "Shoulders, core, hips, quads", "Bodyweight"),
  ex("Bent-Knee Copenhagen Plank", ["Calisthenics", "Mobility", "Sports Performance"], "Adductors, obliques, hips", "Bench or box"),
  ex("Biceps Curl", ["Bodybuilding"], "Biceps, forearms", "Dumbbells"),
  ex("Board Press", ["Powerlifting"], "Chest, triceps, front delts", "Barbell, bench, boards"),
  ex("Box Jump", ["CrossFit", "Conditioning", "Sports Performance"], "Quads, glutes, calves, hamstrings", "Plyo box"),
  ex("Broad Jump", ["Sports Performance", "Conditioning"], "Glutes, hamstrings, quads, calves", "Open space"),
  ex("Bulgarian Split Squat", ["Bodybuilding", "Sports Performance", "Mobility"], "Quads, glutes, hamstrings, calves", "Bench, dumbbells optional"),
  ex("Burpee", ["Calisthenics", "Conditioning", "CrossFit"], "Full body, chest, legs, shoulders, core", "Bodyweight"),
  ex("Cable Fly", ["Bodybuilding"], "Chest, front delts", "Cable machine"),
  ex("Cable Woodchop", ["Bodybuilding", "Sports Performance"], "Obliques, abs, shoulders", "Cable machine"),
  ex("Calf Raise", ["Bodybuilding", "Sports Performance"], "Calves", "Machine, dumbbells, or bodyweight"),
  ex("Cat Cow", ["Mobility"], "Spine, hips, shoulders", "Bodyweight"),
  ex("Chest-Supported Row", ["Bodybuilding", "Sports Performance"], "Upper back, lats, rear delts, biceps", "Incline bench, dumbbells or machine"),
  ex("Chin-Up", ["Calisthenics", "Bodybuilding", "Sports Performance"], "Lats, biceps, upper back", "Pull-up bar"),
  ex("Clean and Jerk", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Full body, quads, glutes, traps, shoulders", "Barbell, plates"),
  ex("Clean Pull", ["Olympic Weightlifting", "Sports Performance"], "Glutes, hamstrings, quads, traps", "Barbell, plates"),
  ex("Close-Grip Bench Press", ["Powerlifting", "Bodybuilding"], "Triceps, chest, front delts", "Barbell, bench, plates"),
  ex("Couch Stretch", ["Mobility", "Sports Performance"], "Hip flexors, quads", "Wall or bench"),
  ex("Dead Bug", ["Mobility", "Calisthenics", "Sports Performance"], "Abs, hip flexors, deep core", "Bodyweight"),
  ex("Deadlift", ["Powerlifting", "Strongman", "Bodybuilding", "Sports Performance"], "Glutes, hamstrings, back, traps, grip", "Barbell, plates"),
  ex("Deficit Deadlift", ["Powerlifting", "Sports Performance"], "Glutes, hamstrings, back, quads", "Barbell, plates, platform"),
  ex("Dip", ["Calisthenics", "Bodybuilding", "Sports Performance"], "Chest, triceps, shoulders", "Dip bars"),
  ex("Double-Under", ["CrossFit", "Conditioning", "Sports Performance"], "Calves, shoulders, lungs", "Jump rope"),
  ex("Dumbbell Bench Press", ["Bodybuilding", "Sports Performance"], "Chest, triceps, front delts", "Dumbbells, bench"),
  ex("Dumbbell Lateral Raise", ["Bodybuilding"], "Side delts, traps", "Dumbbells"),
  ex("Dumbbell Snatch", ["CrossFit", "Conditioning", "Sports Performance"], "Glutes, hamstrings, back, shoulders", "Dumbbell"),
  ex("Face Pull", ["Bodybuilding", "Sports Performance", "Mobility"], "Rear delts, upper back, rotator cuff", "Cable machine or band"),
  ex("Farmer Carry", ["Strongman", "Conditioning", "Sports Performance", "CrossFit"], "Grip, traps, core, legs, upper back", "Dumbbells, kettlebells, farmer handles"),
  ex("Front Squat", ["Olympic Weightlifting", "CrossFit", "Sports Performance", "Bodybuilding"], "Quads, glutes, upper back, core", "Barbell, rack, plates"),
  ex("Glute Bridge", ["Bodybuilding", "Mobility", "Sports Performance"], "Glutes, hamstrings, core", "Bodyweight, barbell optional"),
  ex("Goblet Squat", ["Bodybuilding", "Mobility", "Sports Performance"], "Quads, glutes, hamstrings, core", "Dumbbell or kettlebell"),
  ex("Good Morning", ["Powerlifting", "Bodybuilding", "Sports Performance"], "Hamstrings, glutes, lower back", "Barbell"),
  ex("Hack Squat", ["Bodybuilding"], "Quads, glutes, hamstrings", "Hack squat machine"),
  ex("Hammer Curl", ["Bodybuilding"], "Biceps, brachialis, forearms", "Dumbbells"),
  ex("Hang Clean", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Quads, glutes, hamstrings, traps", "Barbell, plates"),
  ex("Hang Snatch", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Full body, shoulders, traps, hips", "Barbell, plates"),
  ex("Hip Airplane", ["Mobility", "Sports Performance"], "Glutes, hips, hamstrings, balance", "Bodyweight"),
  ex("Hollow Hold", ["Calisthenics", "CrossFit", "Sports Performance"], "Abs, hip flexors, quads", "Bodyweight"),
  ex("Incline Dumbbell Press", ["Bodybuilding", "Sports Performance"], "Upper chest, triceps, front delts", "Dumbbells, incline bench"),
  ex("Inverted Row", ["Calisthenics", "Bodybuilding", "Sports Performance"], "Lats, upper back, biceps", "Barbell, rings, or suspension trainer"),
  ex("Jump Rope", ["Conditioning", "CrossFit", "Sports Performance"], "Calves, shoulders, lungs", "Jump rope"),
  ex("Kettlebell Swing", ["Conditioning", "CrossFit", "Sports Performance"], "Glutes, hamstrings, back, core", "Kettlebell"),
  ex("Kipping Pull-Up", ["CrossFit", "Calisthenics"], "Lats, biceps, shoulders, core", "Pull-up bar"),
  ex("Landmine Press", ["Bodybuilding", "Sports Performance"], "Shoulders, upper chest, triceps, core", "Landmine attachment, barbell"),
  ex("Lat Pulldown", ["Bodybuilding"], "Lats, biceps, upper back", "Cable machine"),
  ex("Lateral Bound", ["Sports Performance", "Conditioning"], "Glutes, hips, quads, calves", "Open space"),
  ex("Leg Curl", ["Bodybuilding"], "Hamstrings, calves", "Leg curl machine"),
  ex("Leg Extension", ["Bodybuilding"], "Quads", "Leg extension machine"),
  ex("Leg Press", ["Bodybuilding", "Sports Performance"], "Quads, glutes, hamstrings", "Leg press machine"),
  ex("Log Press", ["Strongman", "Sports Performance"], "Shoulders, triceps, upper chest, core", "Strongman log"),
  ex("Lunge", ["Bodybuilding", "Calisthenics", "Sports Performance", "Mobility"], "Quads, glutes, hamstrings, calves", "Bodyweight, dumbbells optional"),
  ex("Medicine Ball Slam", ["Conditioning", "CrossFit", "Sports Performance"], "Abs, lats, shoulders, hips", "Medicine ball"),
  ex("Med Ball Rotational Throw", ["Sports Performance", "Conditioning"], "Obliques, hips, shoulders", "Medicine ball, wall"),
  ex("Mountain Climber", ["Calisthenics", "Conditioning", "CrossFit"], "Abs, shoulders, hip flexors, quads", "Bodyweight"),
  ex("Overhead Press", ["Powerlifting", "Strongman", "Bodybuilding", "Sports Performance"], "Shoulders, triceps, upper chest, core", "Barbell, rack, plates"),
  ex("Overhead Squat", ["Olympic Weightlifting", "CrossFit", "Mobility", "Sports Performance"], "Quads, glutes, shoulders, upper back, core", "Barbell or PVC"),
  ex("Paused Bench Press", ["Powerlifting", "Bodybuilding"], "Chest, triceps, front delts", "Barbell, bench, plates"),
  ex("Paused Squat", ["Powerlifting", "Sports Performance", "Bodybuilding"], "Quads, glutes, hamstrings, core", "Barbell, rack, plates"),
  ex("Pistol Squat", ["Calisthenics", "Mobility", "Sports Performance"], "Quads, glutes, balance, core", "Bodyweight"),
  ex("Plank", ["Calisthenics", "Mobility", "Sports Performance"], "Abs, shoulders, glutes", "Bodyweight"),
  ex("Plyo Push-Up", ["Sports Performance", "Calisthenics", "Conditioning"], "Chest, triceps, shoulders, core", "Bodyweight"),
  ex("Pogo Jump", ["Sports Performance", "Conditioning"], "Calves, ankles, foot stiffness", "Bodyweight"),
  ex("Power Clean", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Quads, glutes, traps, hamstrings", "Barbell, plates"),
  ex("Power Snatch", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Full body, traps, shoulders, legs", "Barbell, plates"),
  ex("Pull-Up", ["Calisthenics", "Bodybuilding", "CrossFit", "Sports Performance"], "Lats, biceps, upper back, core", "Pull-up bar"),
  ex("Push Press", ["Olympic Weightlifting", "Strongman", "CrossFit", "Sports Performance"], "Shoulders, triceps, legs, core", "Barbell, plates"),
  ex("Push-Up", ["Calisthenics", "Conditioning", "Sports Performance"], "Chest, triceps, shoulders, core", "Bodyweight"),
  ex("Rear Delt Fly", ["Bodybuilding", "Sports Performance"], "Rear delts, upper back", "Dumbbells or machine"),
  ex("Reverse Lunge", ["Bodybuilding", "Calisthenics", "Sports Performance", "Mobility"], "Quads, glutes, hamstrings", "Bodyweight or dumbbells"),
  ex("Romanian Deadlift", ["Bodybuilding", "Powerlifting", "Sports Performance"], "Hamstrings, glutes, lower back", "Barbell or dumbbells"),
  ex("Row Erg", ["Conditioning", "CrossFit", "Sports Performance"], "Back, legs, arms, lungs", "Rowing machine"),
  ex("Sandbag Carry", ["Strongman", "Conditioning", "Sports Performance"], "Core, upper back, legs, grip", "Sandbag"),
  ex("Seated Cable Row", ["Bodybuilding"], "Lats, upper back, biceps", "Cable row machine"),
  ex("Shoulder CARs", ["Mobility", "Sports Performance"], "Shoulders, rotator cuff, upper back", "Bodyweight"),
  ex("Shuttle Run", ["Conditioning", "Sports Performance"], "Quads, glutes, calves, lungs", "Cones, open space"),
  ex("Single-Leg RDL", ["Sports Performance", "Bodybuilding", "Mobility"], "Hamstrings, glutes, balance, core", "Bodyweight, dumbbells optional"),
  ex("Sit-Up", ["Calisthenics", "Conditioning"], "Abs, hip flexors", "Bodyweight"),
  ex("Ski Erg", ["Conditioning", "CrossFit", "Sports Performance"], "Lats, triceps, abs, lungs", "Ski erg"),
  ex("Sled Drag", ["Strongman", "Conditioning", "Sports Performance"], "Quads, glutes, hamstrings, calves", "Sled, straps"),
  ex("Sled Push", ["Conditioning", "Strongman", "Sports Performance"], "Quads, glutes, calves, core", "Sled, turf"),
  ex("Sled Sprint", ["Sports Performance", "Conditioning", "Strongman"], "Quads, glutes, hamstrings, calves", "Sled, turf"),
  ex("Snatch", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Full body, traps, shoulders, legs, core", "Barbell, plates"),
  ex("Snatch Pull", ["Olympic Weightlifting", "Sports Performance"], "Glutes, hamstrings, quads, traps", "Barbell, plates"),
  ex("Split Jerk", ["Olympic Weightlifting", "CrossFit", "Sports Performance"], "Shoulders, triceps, legs, core", "Barbell, plates"),
  ex("Sprint", ["Conditioning", "Sports Performance"], "Glutes, hamstrings, quads, calves", "Track, turf, open space"),
  ex("Step-Up", ["Bodybuilding", "Sports Performance", "Mobility"], "Quads, glutes, hamstrings", "Box or bench, dumbbells optional"),
  ex("T-Spine Rotation", ["Mobility", "Sports Performance"], "Thoracic spine, shoulders, upper back", "Bodyweight"),
  ex("Thruster", ["CrossFit", "Conditioning", "Olympic Weightlifting"], "Quads, glutes, shoulders, triceps", "Barbell or dumbbells"),
  ex("Tire Flip", ["Strongman", "Conditioning", "Sports Performance"], "Glutes, hamstrings, back, arms", "Tire"),
  ex("Toes-to-Bar", ["CrossFit", "Calisthenics"], "Abs, lats, hip flexors, grip", "Pull-up bar"),
  ex("Trap Bar Deadlift", ["Strongman", "Powerlifting", "Sports Performance", "Bodybuilding"], "Glutes, quads, hamstrings, back, traps", "Trap bar, plates"),
  ex("Trap Bar Jump", ["Sports Performance", "Conditioning"], "Glutes, quads, calves, hamstrings", "Trap bar, light plates"),
  ex("Triceps Pushdown", ["Bodybuilding"], "Triceps", "Cable machine"),
  ex("V-Up", ["Calisthenics", "Conditioning"], "Abs, hip flexors", "Bodyweight"),
  ex("Wall Ball", ["CrossFit", "Conditioning", "Sports Performance"], "Quads, glutes, shoulders, triceps, core", "Medicine ball, wall target"),
  ex("Walking Lunge", ["Bodybuilding", "Calisthenics", "Sports Performance"], "Quads, glutes, hamstrings, calves", "Bodyweight or dumbbells"),
  ex("World's Greatest Stretch", ["Mobility", "Sports Performance"], "Hips, hamstrings, calves, T-spine", "Bodyweight"),
  ex("Yoke Walk", ["Strongman", "Sports Performance", "Conditioning"], "Upper back, core, legs, traps", "Yoke"),
  ex("Zercher Carry", ["Strongman", "Sports Performance"], "Core, upper back, arms, legs", "Barbell or sandbag"),
].sort((a, b) => a.name.localeCompare(b.name));

const starterClients = [
  { id: "client-1", name: "Sample Client", email: "client@example.com", status: "Active" },
  { id: "client-2", name: "Athlete Demo", email: "athlete@example.com", status: "Active" },
];

const starterConversations = [
  {
    clientId: "client-1",
    clientName: "Sample Client",
    messages: [
      {
        id: "msg-1",
        sender: "Coach",
        body: "Welcome to No Limit Fitness. Your plan will be built with structure and adjusted around your progress.",
        sentAt: "Sample message",
        timestamp: 1,
        unreadForCoach: false,
        unreadForClient: true,
      },
      {
        id: "msg-2",
        sender: "Client",
        body: "Sounds good coach. I’m ready to start.",
        sentAt: "Sample message",
        timestamp: 2,
        unreadForCoach: true,
        unreadForClient: false,
      },
    ],
  },
  {
    clientId: "client-2",
    clientName: "Athlete Demo",
    messages: [
      {
        id: "msg-3",
        sender: "Coach",
        body: "Focus on clean form and controlled reps this week.",
        sentAt: "Sample message",
        timestamp: 3,
        unreadForCoach: false,
        unreadForClient: true,
      },
    ],
  },
];

const emptyTrackingEntry = {
  actualWeight: "",
  setsCompleted: "",
  repsCompleted: "",
  timeCompleted: "",
  restUsed: "",
  substitution: "",
  notes: "",
};

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const getTrackingKey = (planId, dayId, exerciseId) => `${planId}-${dayId}-${exerciseId}`;

const defaultNotificationPreferences = {
  completedWorkout: true,
  skippedWorkout: true,
  changedValues: true,
  substitutions: true,
  workoutNotes: true,
  planAssigned: true,
  messages: true,
};

const defaultServerSettings = {
  coachEmail: "",
  emailProvider: "Email Alerts",
  serverStatus: "Saved setting",
  notes: "Email alerts should be sent through a secure server route. Email Security.",
};

function copyPlanDaysForEdit(days) {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }));
}

function clonePlanDays(days) {
  return days.map((day) => ({
    ...day,
    id: makeId("day"),
    exercises: day.exercises.map((exercise) => ({ ...exercise, id: makeId("plan-exercise") })),
  }));
}

function createDefaultState() {
  return {
    clients: starterClients,
    savedPlans: [],
    workoutLogs: [],
    conversations: starterConversations,
    readActivityIds: [],
    notificationPreferences: defaultNotificationPreferences,
    serverSettings: defaultServerSettings,
  };
}

function normalizeClients(clients) {
  return clients.map((client) => ({ ...client, status: client.status || "Active" }));
}

function normalizeConversations(clients, conversations) {
  return clients.map((client) => {
    const existing = conversations.find((conversation) => conversation.clientId === client.id);
    if (existing) {
      return {
        ...existing,
        clientName: client.name,
        messages: Array.isArray(existing.messages) ? existing.messages : [],
      };
    }
    return { clientId: client.id, clientName: client.name, messages: [] };
  });
}

function loadInitialState() {
  const fallback = createDefaultState();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const clients = normalizeClients(Array.isArray(parsed.clients) ? parsed.clients : fallback.clients);

    return {
      clients,
      savedPlans: Array.isArray(parsed.savedPlans) ? parsed.savedPlans : [],
      workoutLogs: Array.isArray(parsed.workoutLogs) ? parsed.workoutLogs : [],
      conversations: normalizeConversations(
        clients,
        Array.isArray(parsed.conversations) ? parsed.conversations : fallback.conversations
      ),
      readActivityIds: Array.isArray(parsed.readActivityIds) ? parsed.readActivityIds : [],
      notificationPreferences: { ...defaultNotificationPreferences, ...(parsed.notificationPreferences || {}) },
      serverSettings: { ...defaultServerSettings, ...(parsed.serverSettings || {}) },
    };
  } catch (error) {
    console.warn("Could not load local No Limit Fitness data:", error);
    return fallback;
  }
}

function saveStateToLocalStorage(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save local No Limit Fitness data:", error);
  }
}


function getServerValue(source, keys, fallback = "") {
  if (!source || typeof source !== "object") return fallback;

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return fallback;
}

function normalizeServerTimestamp(value) {
  if (!value) return Date.now();

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function normalizeServerDateLabel(value) {
  if (!value) return new Date().toLocaleString();

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return String(value);

  return new Date(parsed).toLocaleString();
}

function normalizeServerSender(value) {
  const sender = String(value || "Coach").toLowerCase();
  return sender.includes("client") ? "Client" : "Coach";
}

function mapServerClientForApp(client) {
  return {
    id: String(getServerValue(client, ["id", "clientId", "client_id"], makeId("server-client"))),
    name: String(getServerValue(client, ["name", "fullName", "full_name"], "Server Client")),
    email: String(getServerValue(client, ["email"], "")),
    status: String(getServerValue(client, ["status"], "Active")),
  };
}

function mapServerPlanExerciseForApp(exercise) {
  return {
    id: String(getServerValue(exercise, ["id", "planExerciseId", "plan_exercise_id"], makeId("plan-exercise"))),
    exerciseId: String(getServerValue(exercise, ["exerciseId", "exercise_id"], "")),
    exerciseName: String(getServerValue(exercise, ["exerciseName", "exercise_name", "name"], "Server Exercise")),
    sets: String(getServerValue(exercise, ["sets", "assignedSets", "assigned_sets"], "")),
    repsOrTime: String(getServerValue(exercise, ["repsOrTime", "reps_or_time", "reps", "time"], "")),
    weightGuidance: String(getServerValue(exercise, ["weightGuidance", "weight_guidance"], "")),
    rest: String(getServerValue(exercise, ["rest", "restPeriod", "rest_period"], "")),
    notes: String(getServerValue(exercise, ["notes", "coachNotes", "coach_notes"], "")),
  };
}

function mapServerPlanDayForApp(day, index) {
  const exercises = Array.isArray(day?.exercises) ? day.exercises : [];

  return {
    id: String(getServerValue(day, ["id", "dayId", "day_id"], makeId("day"))),
    name: String(getServerValue(day, ["name", "dayName", "day_name"], `Day ${index + 1}`)),
    exercises: exercises.map(mapServerPlanExerciseForApp),
  };
}

function mapServerPlanForApp(plan, clients) {
  const clientId = String(getServerValue(plan, ["clientId", "client_id"], ""));
  const matchedClient = clients.find((client) => client.id === clientId);
  const createdAtRaw = getServerValue(plan, ["createdAt", "created_at", "updatedAt", "updated_at"], "");
  const days = Array.isArray(plan?.days) ? plan.days : [];

  return {
    id: String(getServerValue(plan, ["id", "planId", "plan_id"], makeId("saved-plan"))),
    planName: String(getServerValue(plan, ["planName", "plan_name", "name"], "Server Workout Plan")),
    clientId,
    clientName: String(getServerValue(plan, ["clientName", "client_name"], matchedClient?.name || "Server Client")),
    days: days.map(mapServerPlanDayForApp),
    createdAt: normalizeServerDateLabel(createdAtRaw),
    timestamp: normalizeServerTimestamp(createdAtRaw),
  };
}

function mapServerWorkoutEntryForApp(entry) {
  return {
    exerciseId: String(getServerValue(entry, ["exerciseId", "exercise_id"], "")),
    exerciseName: String(getServerValue(entry, ["exerciseName", "exercise_name", "name"], "Server Exercise")),
    assignedSets: String(getServerValue(entry, ["assignedSets", "assigned_sets", "sets"], "")),
    assignedRepsOrTime: String(getServerValue(entry, ["assignedRepsOrTime", "assigned_reps_or_time", "repsOrTime", "reps_or_time"], "")),
    assignedWeightGuidance: String(getServerValue(entry, ["assignedWeightGuidance", "assigned_weight_guidance", "weightGuidance", "weight_guidance"], "")),
    assignedRest: String(getServerValue(entry, ["assignedRest", "assigned_rest", "rest"], "")),
    actualWeight: String(getServerValue(entry, ["actualWeight", "actual_weight"], "")),
    setsCompleted: String(getServerValue(entry, ["setsCompleted", "sets_completed"], "")),
    repsCompleted: String(getServerValue(entry, ["repsCompleted", "reps_completed"], "")),
    timeCompleted: String(getServerValue(entry, ["timeCompleted", "time_completed"], "")),
    restUsed: String(getServerValue(entry, ["restUsed", "rest_used"], "")),
    substitution: String(getServerValue(entry, ["substitution", "exerciseSubstitution", "exercise_substitution"], "")),
    notes: String(getServerValue(entry, ["notes", "clientNotes", "client_notes"], "")),
  };
}

function mapServerWorkoutLogForApp(log, clients, plans) {
  const clientId = String(getServerValue(log, ["clientId", "client_id"], ""));
  const planId = String(getServerValue(log, ["planId", "plan_id"], ""));
  const matchedClient = clients.find((client) => client.id === clientId);
  const matchedPlan = plans.find((plan) => plan.id === planId);
  const submittedAtRaw = getServerValue(log, ["submittedAt", "submitted_at", "createdAt", "created_at"], "");
  const entries = Array.isArray(log?.entries) ? log.entries : [];
  const rawStatus = String(getServerValue(log, ["status"], "completed")).toLowerCase();

  return {
    id: String(getServerValue(log, ["id", "logId", "log_id"], makeId("workout-log"))),
    clientId,
    clientName: String(getServerValue(log, ["clientName", "client_name"], matchedClient?.name || "Server Client")),
    planId,
    planName: String(getServerValue(log, ["planName", "plan_name"], matchedPlan?.planName || "Server Workout Plan")),
    dayId: String(getServerValue(log, ["dayId", "day_id"], "")),
    dayName: String(getServerValue(log, ["dayName", "day_name"], "Server Workout")),
    status: rawStatus.includes("skip") ? "skipped" : "completed",
    submittedAt: normalizeServerDateLabel(submittedAtRaw),
    timestamp: normalizeServerTimestamp(submittedAtRaw),
    skipReason: String(getServerValue(log, ["skipReason", "skip_reason"], "")),
    entries: entries.map(mapServerWorkoutEntryForApp),
  };
}

function buildServerConversationsForApp(clients, messages) {
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
    const clientId = String(getServerValue(message, ["clientId", "client_id"], clients[0]?.id || ""));

    if (!clientId) return;

    if (!grouped.has(clientId)) {
      const matchedClient = clients.find((client) => client.id === clientId);

      grouped.set(clientId, {
        clientId,
        clientName: matchedClient?.name || "Server Client",
        messages: [],
      });
    }

    const sender = normalizeServerSender(getServerValue(message, ["sender", "senderRole", "sender_role"], "Coach"));
    const sentAtRaw = getServerValue(message, ["sentAt", "sent_at", "createdAt", "created_at"], "");

    grouped.get(clientId).messages.push({
      id: String(getServerValue(message, ["id", "messageId", "message_id"], makeId("message"))),
      sender,
      body: String(getServerValue(message, ["body", "message", "content"], "")),
      sentAt: normalizeServerDateLabel(sentAtRaw),
      timestamp: normalizeServerTimestamp(sentAtRaw),
      unreadForCoach: sender === "Client",
      unreadForClient: sender === "Coach",
    });
  });

  return Array.from(grouped.values()).map((conversation) => ({
    ...conversation,
    messages: conversation.messages.sort((a, b) => a.timestamp - b.timestamp),
  }));
}


const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";
const COACH_SESSION_LOCK_STORAGE_KEY = "no-limit-fitness-coach-session-lock-v1";
const PUBLIC_PORTAL_MODE = "client";
const PUBLIC_LANDING_TAB = "Client";

function hasCurrentTestUnlockUrl() {
  if (typeof window === "undefined") return false;

  try {
    return new URLSearchParams(window.location.search).get("testUnlock") === "true";
  } catch {
    return false;
  }
}

const PORTAL_VISIBLE_TABS_BY_MODE = {
  demo: [
    "Home",
    "Client",
    "Coach",
    "Clients",
    "Plans",
    "Tracker",
    "Messages",
    "Exercises",
    "Progress",
    "Login",
  ],
  coach: ["Client", 
    "Home",
    "Coach",
    "Clients",
    "Plans",
    "Tracker",
    "Messages",
    "Exercises",
    "Progress",
    "Login",
  ],
  client: ["Home", "Client", "Tracker", "Progress", "Messages", "Exercises", "Login"],
};

const PORTAL_LANDING_TAB_BY_MODE = {
  demo: "Home",
  coach: "Coach",
  client: "Client",
};

function getPortalTestUnlocked() {
  return hasCurrentTestUnlockUrl();
}

function hasCoachSessionLock() {
  if (typeof window === "undefined") return false;

  try {
    const savedMode = String(
      window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
    ).toLowerCase();

    const coachLock =
      window.localStorage.getItem(COACH_SESSION_LOCK_STORAGE_KEY) === "true";

    return coachLock || savedMode === "coach";
  } catch {
    return false;
  }
}

function isPortalTestUnlocked() {
  return hasCurrentTestUnlockUrl();
}

function getInitialPortalMode() {
  if (typeof window === "undefined") return PUBLIC_PORTAL_MODE;

  try {
    const savedMode = String(
      window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
    ).toLowerCase();

    const unlocked = getPortalTestUnlocked();

    if (unlocked && ["demo", "coach", "client"].includes(savedMode)) {
      return savedMode;
    }

    return unlocked ? "demo" : PUBLIC_PORTAL_MODE;
  } catch {
    return PUBLIC_PORTAL_MODE;
  }
}







function PortalModeControls({ portalMode, setPortalMode, setActiveTab }) {
  const modeLabel =
    portalMode === "coach"
      ? "Coach Portal"
      : portalMode === "client"
        ? "Client Portal"
        : "Demo Preview";

  const description =
    portalMode === "coach"
      ? "Coach view focuses on clients, plans, logs, messages, progress, and server tools."
      : portalMode === "client"
        ? "Client view focuses on assigned workouts, tracking, messages, and personal progress."
        : "Demo preview keeps every tab visible for testing and walkthroughs.";

  const options = [
    { id: "demo", label: "Demo Preview" },
    { id: "coach", label: "Coach Portal" },
    { id: "client", label: "Client Portal" },
  ];

  function selectPortalMode(nextMode) {
    try {
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, nextMode);
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setPortalMode(nextMode);
    setActiveTab(PORTAL_LANDING_TAB_BY_MODE[nextMode] || "Home");
  }

  return (
    <section
      aria-label="Portal mode controls"
      className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#00BF63]/30 bg-black/70 p-4 shadow-2xl shadow-black/40 backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Portal Mode
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            {modeLabel} Active
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-300">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isActive = portalMode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectPortalMode(option.id)}
                className={
                  isActive
                    ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                    : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// NLF_COACH_ASSIGNMENT_HELPERS_START
const NLF_COACH_ASSIGNMENT = {
  coachId: "coach-demo",
  coachName: "Coach",
};

function getClientCoachingStatus(client) {
  const explicitStatus = String(client?.coachingStatus || "").toLowerCase();
  const legacyStatus = String(client?.status || "").toLowerCase();

  if (explicitStatus === "archived" || legacyStatus === "archived") return "archived";
  if (explicitStatus === "active") return "active";
  if (explicitStatus === "unassigned") return "unassigned";
  if (client?.coachId || client?.coachName) return "active";

  return "unassigned";
}

function normalizeClientCoachingRecord(client, index = 0) {
  const status = getClientCoachingStatus(client);
  const nowLabel = client?.assignedAt || "";

  return {
    ...client,
    coachingStatus: status,
    coachId: status === "active" ? client?.coachId || NLF_COACH_ASSIGNMENT.coachId : client?.coachId || "",
    coachName: status === "active" ? client?.coachName || NLF_COACH_ASSIGNMENT.coachName : client?.coachName || "",
    assignedAt: status === "active" ? nowLabel : client?.assignedAt || "",
    archivedAt: status === "archived" ? client?.archivedAt || nowLabel : client?.archivedAt || "",
    archiveReason: client?.archiveReason || "",
    clientSortIndex: index,
  };
}

function formatClientAssignmentDate(value) {
  if (!value) return "Not set";

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return String(value);

  return new Date(parsed).toLocaleDateString();
}

function getClientStatusBadgeClass(status) {
  if (status === "active") {
    return "border-[#00BF63]/40 bg-[#00BF63]/15 text-[#00BF63]";
  }

  if (status === "archived") {
    return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
  }

  return "border-yellow-400/40 bg-yellow-400/10 text-yellow-300";
}

function getClientStatusLabel(status) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Unassigned";
}

function CoachClientAssignmentPanel({
  clients,
  clientActionNotice,
  onAssignClient,
  onArchiveClient,
  onReactivateClient,
  onViewArchivedClient,
}) {
  const normalizedClients = clients.map((client, index) =>
    normalizeClientCoachingRecord(client, index)
  );

  const activeClients = normalizedClients.filter(
    (client) => client.coachingStatus === "active"
  );
  const unassignedClients = normalizedClients.filter(
    (client) => client.coachingStatus === "unassigned"
  );
  const archivedClients = normalizedClients.filter(
    (client) => client.coachingStatus === "archived"
  );

  const groups = [
    {
      id: "active",
      title: "Active Clients",
      description: "Currently coached clients visible in normal coach workflow.",
      clients: activeClients,
      empty: "No active assigned clients yet.",
    },
    {
      id: "unassigned",
      title: "Unassigned Clients",
      description: "Clients created or imported but not attached to this coach yet.",
      clients: unassignedClients,
      empty: "No unassigned clients.",
    },
    {
      id: "archived",
      title: "Archived Clients",
      description: "Past clients are hidden from active coaching but their data stays saved.",
      clients: archivedClients,
      empty: "No archived clients yet.",
    },
  ];

  const renderClientCard = (client) => {
    const status = getClientCoachingStatus(client);
    const badgeClass = getClientStatusBadgeClass(status);

    return (
      <article
        key={client.id}
        className="rounded-2xl border border-white/10 bg-black/50 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black text-white">{client.name}</h4>
              <span
                className={
                  "rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] " +
                  badgeClass
                }
              >
                {getClientStatusLabel(status)}
              </span>
            </div>

            <p className="mt-1 text-sm text-white/60">{client.email || "No email saved"}</p>

            <div className="mt-3 grid gap-2 text-xs font-bold text-white/50 sm:grid-cols-2">
              <p>Coach: {client.coachName || "Not assigned"}</p>
              <p>Assigned: {formatClientAssignmentDate(client.assignedAt)}</p>
              <p>Archived: {formatClientAssignmentDate(client.archivedAt)}</p>
              <p>Reason: {client.archiveReason || "None"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {status === "unassigned" && (
              <button
                type="button"
                onClick={() => onAssignClient(client.id)}
                className="rounded-full bg-[#00BF63] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#00d36f]"
              >
                Assign to Me
              </button>
            )}

            {status === "active" && (
              <button
                type="button"
                onClick={() => onArchiveClient(client.id)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-yellow-400 hover:text-yellow-300"
              >
                Archive Client
              </button>
            )}

            {status === "archived" && (
              <>
                <button
                  type="button"
                  onClick={() => onReactivateClient(client.id)}
                  className="rounded-full bg-[#00BF63] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#00d36f]"
                >
                  Reactivate Client
                </button>

                <button
                  type="button"
                  onClick={() => onViewArchivedClient(client.id)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                >
                  View Past Data
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      aria-label="Coach client assignment manager"
      className="mb-6 rounded-3xl border border-[#00BF63]/25 bg-black/70 p-5 shadow-2xl shadow-black/30"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00BF63]">
            Coach Assignment
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Assign, Archive, and Review Clients
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Keep active coaching clean. Assign new clients, archive clients you are no longer coaching, and keep past data available for review.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.16em]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[#00BF63]">{activeClients.length}</p>
            <p className="mt-1 text-white/50">Active</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-yellow-300">{unassignedClients.length}</p>
            <p className="mt-1 text-white/50">Open</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-zinc-300">{archivedClients.length}</p>
            <p className="mt-1 text-white/50">Archived</p>
          </div>
        </div>
      </div>

      {clientActionNotice && (
        <p className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-3 text-sm font-black text-[#00BF63]">
          {clientActionNotice}
        </p>
      )}

      <div className="mt-5 grid gap-4">
        {groups.map((group) => (
          <div key={group.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-white">{group.title}</h3>
                <p className="text-sm text-white/55">{group.description}</p>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                {group.clients.length} total
              </p>
            </div>

            <div className="grid gap-3">
              {group.clients.length > 0 ? (
                group.clients.map(renderClientCard)
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
                  {group.empty}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
// NLF_COACH_ASSIGNMENT_HELPERS_END

// NLF_CLIENT_PORTAL_POLISH_HELPERS_START
function getFriendlyClientName(client) {
  return client?.name || client?.fullName || client?.clientName || "Client";
}

function getFriendlyPlanTitle(plan) {
  return (
    plan?.title ||
    plan?.name ||
    plan?.planName ||
    plan?.programName ||
    "Assigned Training Plan"
  );
}

function getFriendlyPlanGoal(plan) {
  return (
    plan?.goal ||
    plan?.focus ||
    plan?.trainingGoal ||
    plan?.description ||
    "Follow the assigned workouts and log notes after each session."
  );
}

function getFriendlyPlanDays(plan) {
  if (!plan || typeof plan !== "object") return [];

  const possibleArrays = [
    plan.days,
    plan.workouts,
    plan.trainingDays,
    plan.weeklyPlan,
    plan.sessions,
  ];

  for (const possibleArray of possibleArrays) {
    if (Array.isArray(possibleArray)) {
      return possibleArray;
    }
  }

  if (plan.week && typeof plan.week === "object") {
    return Object.entries(plan.week).map(([dayName, dayValue]) => ({
      day: dayName,
      ...(typeof dayValue === "object" && dayValue ? dayValue : { notes: String(dayValue) }),
    }));
  }

  return [];
}

function getFriendlyDayTitle(day, index) {
  return (
    day?.title ||
    day?.name ||
    day?.day ||
    day?.label ||
    day?.focus ||
    "Workout Day " + (index + 1)
  );
}

function getFriendlyDayExercises(day) {
  if (!day || typeof day !== "object") return [];

  const possibleArrays = [
    day.exercises,
    day.movements,
    day.lifts,
    day.items,
    day.blocks,
  ];

  for (const possibleArray of possibleArrays) {
    if (Array.isArray(possibleArray)) {
      return possibleArray;
    }
  }

  return [];
}

function getFriendlyExerciseName(exercise) {
  if (typeof exercise === "string") return exercise;

  return (
    exercise?.exercise ||
    exercise?.name ||
    exercise?.movement ||
    exercise?.lift ||
    "Exercise"
  );
}

function getFriendlyExerciseDose(exercise) {
  if (!exercise || typeof exercise === "string") return "See coach notes";

  const sets = exercise.sets || exercise.set || "";
  const reps = exercise.reps || exercise.repRange || exercise.targetReps || "";
  const rest = exercise.rest || exercise.restTime || "";

  const pieces = [];

  if (sets || reps) {
    pieces.push([sets, reps].filter(Boolean).join(" x "));
  }

  if (rest) {
    pieces.push("Rest " + rest);
  }

  return pieces.join(" • ") || exercise.notes || "See coach notes";
}

function findFriendlyAssignedPlan({ clients, savedPlans }) {
  const safeClients = Array.isArray(clients) ? clients : [];
  const safePlans = Array.isArray(savedPlans) ? savedPlans : [];

  const activeClient =
    safeClients.find((client) => getClientCoachingStatus(client) === "active") ||
    safeClients[0] ||
    null;

  if (!safePlans.length) {
    return {
      client: activeClient,
      plan: null,
      planDays: [],
      todayDay: null,
    };
  }

  const assignedPlan =
    safePlans.find(
      (plan) =>
        plan.clientId === activeClient?.id ||
        plan.assignedClientId === activeClient?.id ||
        plan.client === activeClient?.id ||
        plan.client === activeClient?.name ||
        plan.assignedTo === activeClient?.id ||
        plan.assignedTo === activeClient?.name
    ) || safePlans[0];

  const planDays = getFriendlyPlanDays(assignedPlan);
  const todayDay = planDays[0] || null;

  return {
    client: activeClient,
    plan: assignedPlan,
    planDays,
    todayDay,
  };
}

function ClientPortalMyPlanPanel({
  clients,
  savedPlans,
  workoutLogs,
  onOpenTracker,
  onOpenMessages,
  onOpenProgress,
}) {
  const { client, plan, planDays, todayDay } = findFriendlyAssignedPlan({
    clients,
    savedPlans,
  });

  const recentLogs = Array.isArray(workoutLogs) ? workoutLogs.slice(-3).reverse() : [];
  const todayExercises = getFriendlyDayExercises(todayDay).slice(0, 5);
  const [isNutritionCoachOpen, setIsNutritionCoachOpen] = useState(false);

  return (
    <section
      aria-label="Client My Plan dashboard"
      className="mb-28 rounded-3xl border border-[#00BF63]/25 bg-gradient-to-br from-black via-zinc-950 to-black p-4 shadow-2xl shadow-black/40 md:mb-6 md:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00BF63]">
            My Plan
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl">
            {client ? getFriendlyClientName(client) + "'s Training" : "Client Training Plan"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Simple view for what to do next, how to log it, and where to message your coach.
          </p>
        </div>

        <div aria-label="Client quick actions" className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
          <button
            type="button"
            onClick={onOpenTracker}
            className="min-h-12 rounded-2xl bg-[#00BF63] px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-black transition hover:bg-[#00d36f] md:min-h-0 md:rounded-full md:px-4 md:py-2 md:text-xs md:tracking-[0.18em]"
          >
            Log Workout
          </button>

          <button
            type="button"
            onClick={onOpenMessages}
            className="min-h-12 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-[#00BF63] hover:text-[#00BF63] md:min-h-0 md:rounded-full md:px-4 md:py-2 md:text-xs md:tracking-[0.18em]"
          >
            Message Coach
          </button>

          <button
            type="button"
            onClick={onOpenProgress}
            className="min-h-12 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-[#00BF63] hover:text-[#00BF63] md:min-h-0 md:rounded-full md:px-4 md:py-2 md:text-xs md:tracking-[0.18em]"
          >
            View Progress
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            Today's Workout
          </p>

          {plan ? (
            <>
              <h2 className="mt-2 text-2xl font-black text-white">
                {getFriendlyDayTitle(todayDay, 0)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {getFriendlyPlanTitle(plan)} — {getFriendlyPlanGoal(plan)}
              </p>

              <div className="mt-4 grid gap-2">
                {todayExercises.length > 0 ? (
                  todayExercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-black/40 p-3"
                    >
                      <p className="font-black text-white">
                        {index + 1}. {getFriendlyExerciseName(exercise)}
                      </p>
                      <p className="mt-1 text-sm text-white/55">
                        {getFriendlyExerciseDose(exercise)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
                    No exercise rows found yet. Ask your coach to assign or update the plan.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4">
              <h2 className="text-xl font-black text-white">
                No assigned plan found yet.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Once your coach assigns a plan, this area will show your workout, notes, and quick logging options.
              </p>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            This Week
          </p>

          <div className="mt-4 grid gap-2">
            {planDays.length > 0 ? (
              planDays.slice(0, 5).map((day, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-black/40 p-3"
                >
                  <p className="font-black text-white">
                    {getFriendlyDayTitle(day, index)}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {getFriendlyDayExercises(day).length || "Coach-set"} movements
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
                Weekly plan preview will show here after assignment.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
            <p className="text-sm font-black text-[#00BF63]">Coach Reminder</p>
            <p className="mt-1 text-sm leading-6 text-white/65">
              Log what you actually completed. Add notes for pain, swaps, missed reps, energy, or questions.
            </p>
          </div>
        </article>
      </div>

      <section
        aria-label="Mobile nutrition coach card"
        className="mt-4 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-4 shadow-xl shadow-black/30 md:hidden"
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
          Nutrition
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase text-white">
          No Limit Nutrition Coach
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
          Build target calories/macros or check a meal when you need it. This keeps the mobile dashboard clean while still keeping the full tool one tap away.
        </p>

        <button
          type="button"
          onClick={() => setIsNutritionCoachOpen((current) => !current)}
          className="mt-4 w-full rounded-2xl border border-[#00BF63]/40 bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black shadow-lg shadow-[#00BF63]/20 transition hover:bg-white"
        >
          {isNutritionCoachOpen ? "Hide Nutrition Coach" : "Open Nutrition Coach"}
        </button>
      </section>

      {isNutritionCoachOpen && (
        <div className="md:hidden">
          <ClientNutritionMacroHelper />
        </div>
      )}

      <div className="hidden md:block">
        <ClientNutritionMacroHelper />
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
              Recent Activity
            </p>
            <p className="mt-1 text-sm text-white/55">
              Your last logged notes and workouts will help your coach adjust the plan.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {recentLogs.length > 0 ? (
            recentLogs.map((log, index) => (
              <p
                key={log.id || index}
                className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/60"
              >
                {log.notes || log.clientNotes || log.summary || log.status || "Workout logged"}
              </p>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
              No recent workout logs yet. Use Tracker after your workout.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
// NLF_CLIENT_PORTAL_POLISH_HELPERS_END

export default function App() {
  const [initialState] = useState(loadInitialState);
  const [activeTab, setActiveTab] = useState(() => {
    const mode = getInitialPortalMode();

    if (!getPortalTestUnlocked() && !hasCoachSessionLock()) return PUBLIC_LANDING_TAB;
    if (mode === "coach") return "Coach";
    if (mode === "client") return "Client";

    return "Home";
  });

  const [portalMode, setPortalMode] = useState(() =>
    getPortalTestUnlocked() || hasCoachSessionLock()
      ? getInitialPortalMode()
      : PUBLIC_PORTAL_MODE
  );

  // BUNDLE_12M1C_COACH_PORTAL_LOCK
useEffect(() => {
  if (getPortalTestUnlocked()) return;

  const coachLocked = hasCoachSessionLock();

  if (coachLocked) {
    try {
      window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "coach");
      window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    document.body.dataset.portalMode = "coach";

    if (portalMode !== "coach") {
      setPortalMode("coach");
    }

    const coachTabs = PORTAL_VISIBLE_TABS_BY_MODE.coach || [];
    if (!coachTabs.includes(activeTab) || activeTab === "Client") {
      setActiveTab("Coach");
    }

    return;
  }

  try {
    window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
    window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, PUBLIC_PORTAL_MODE);
    window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
  } catch {
    // LocalStorage can fail in restricted browser modes.
  }

  document.body.dataset.portalMode = PUBLIC_PORTAL_MODE;

  if (portalMode !== PUBLIC_PORTAL_MODE) {
    setPortalMode(PUBLIC_PORTAL_MODE);
  }

  const publicVisibleTabs = PORTAL_VISIBLE_TABS_BY_MODE[PUBLIC_PORTAL_MODE] || [];
  if (!publicVisibleTabs.includes(activeTab)) {
    setActiveTab(PUBLIC_LANDING_TAB);
  }
}, [portalMode, activeTab]);
  useEffect(() => {
  const unlocked = getPortalTestUnlocked();
  const coachLocked = !unlocked && hasCoachSessionLock();
  const normalizedMode = coachLocked
    ? "coach"
    : String(portalMode || "login").toLowerCase();

  try {
    window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, normalizedMode);
    if (normalizedMode === "coach") {
      window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
    }
    if (normalizedMode === "client" || normalizedMode === "login") {
      window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
    }
  } catch {
    // LocalStorage can fail in restricted browser modes.
  }

  document.body.dataset.portalMode = normalizedMode;

  if (!unlocked && !coachLocked) {
    const publicVisibleTabs = PORTAL_VISIBLE_TABS_BY_MODE[PUBLIC_PORTAL_MODE] || [];

    if (!publicVisibleTabs.includes(activeTab)) {
      setActiveTab(PUBLIC_LANDING_TAB);
    }

    if (portalMode !== PUBLIC_PORTAL_MODE) {
      setPortalMode(PUBLIC_PORTAL_MODE);
    }

    return;
  }

  const visibleTabs =
    PORTAL_VISIBLE_TABS_BY_MODE[normalizedMode] ||
    PORTAL_VISIBLE_TABS_BY_MODE.coach ||
    [];

  const landingTab =
    PORTAL_LANDING_TAB_BY_MODE[normalizedMode] ||
    PORTAL_LANDING_TAB_BY_MODE.coach ||
    "Coach";

  if (!visibleTabs.includes(activeTab)) {
    setActiveTab(landingTab);
  }

  if (portalMode !== normalizedMode) {
    setPortalMode(normalizedMode);
  }
}, [portalMode, activeTab]);

const [clients, setClients] = useState(initialState.clients);
  const [clientForm, setClientForm] = useState({ name: "", email: "" });
  const [selectedClientProfileId, setSelectedClientProfileId] = useState(initialState.clients[0]?.id || "");
  const [clientActionNotice, setClientActionNotice] = useState("");

  const [savedPlans, setSavedPlans] = useState(initialState.savedPlans);
  const [selectedPlanDetailId, setSelectedPlanDetailId] = useState(initialState.savedPlans[0]?.id || "");

  const [workoutLogs, setWorkoutLogs] = useState(initialState.workoutLogs);
  const [selectedWorkoutLogId, setSelectedWorkoutLogId] = useState(initialState.workoutLogs[0]?.id || "");

  const [conversations, setConversations] = useState(initialState.conversations);
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialState.conversations[0]?.clientId || initialState.clients[0]?.id || ""
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [messageSender, setMessageSender] = useState("Coach");
  const [messageNotice, setMessageNotice] = useState("");

  const [readActivityIds, setReadActivityIds] = useState(initialState.readActivityIds);
  const [activityFilter, setActivityFilter] = useState("All");
  const [notificationPreferences, setNotificationPreferences] = useState(initialState.notificationPreferences);
  const [serverSettings, setServerSettings] = useState(initialState.serverSettings);
  const [editingPlanId, setEditingPlanId] = useState("");

  const [trackerClientId, setTrackerClientId] = useState(initialState.clients[0]?.id || "");
  const [selectedTrackerPlanId, setSelectedTrackerPlanId] = useState("");
  const [selectedTrackerDayId, setSelectedTrackerDayId] = useState("");
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [trackerMessage, setTrackerMessage] = useState("");
  const [skipReason, setSkipReason] = useState("");

  const [planDraft, setPlanDraft] = useState({
    planName: "",
    clientId: initialState.clients[0]?.id || "",
    days: [{ id: makeId("day"), name: "", exercises: [] }],
  });

  const [selectedDayId, setSelectedDayId] = useState(planDraft.days[0].id);
  const [planExerciseSearch, setPlanExerciseSearch] = useState("");
  const [planCategory, setPlanCategory] = useState("All");
  const [builderMessage, setBuilderMessage] = useState("");

  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("All");
  const [localSaveNotice, setLocalSaveNotice] = useState(
    "Local saving is active. Clients, plans, logs, skipped reasons, messages, unread indicators, activity read status, plan editing, notification preferences, server placeholders, and workout log details will stay after refresh."
  );

  // NLF_COACH_ASSIGNMENT_STATE_START
  const normalizedCoachClients = useMemo(
    () => clients.map((client, index) => normalizeClientCoachingRecord(client, index)),
    [clients]
  );

  const assignClientToCoach = (clientId) => {
    const assignedAt = new Date().toISOString();

    setClients((previousClients) =>
      previousClients.map((client) =>
        client.id === clientId
          ? {
              ...normalizeClientCoachingRecord(client),
              coachId: NLF_COACH_ASSIGNMENT.coachId,
              coachName: NLF_COACH_ASSIGNMENT.coachName,
              coachingStatus: "active",
              status: "Active",
              assignedAt: client.assignedAt || assignedAt,
              archivedAt: "",
              archiveReason: "",
            }
          : client
      )
    );

    const clientName =
      clients.find((client) => client.id === clientId)?.name || "Client";

    setClientActionNotice(clientName + " assigned to Coach.");
  };

  const archiveClientForCoach = (clientId) => {
    const archivedAt = new Date().toISOString();

    setClients((previousClients) =>
      previousClients.map((client) =>
        client.id === clientId
          ? {
              ...normalizeClientCoachingRecord(client),
              coachingStatus: "archived",
              status: "Archived",
              archivedAt,
              archiveReason: client.archiveReason || "No longer actively coached",
            }
          : client
      )
    );

    const clientName =
      clients.find((client) => client.id === clientId)?.name || "Client";

    setClientActionNotice(clientName + " archived. Past data is still available.");
  };

  const reactivateClientForCoach = (clientId) => {
    const assignedAt = new Date().toISOString();

    setClients((previousClients) =>
      previousClients.map((client) =>
        client.id === clientId
          ? {
              ...normalizeClientCoachingRecord(client),
              coachId: NLF_COACH_ASSIGNMENT.coachId,
              coachName: NLF_COACH_ASSIGNMENT.coachName,
              coachingStatus: "active",
              status: "Active",
              assignedAt: client.assignedAt || assignedAt,
              archivedAt: "",
              archiveReason: "",
            }
          : client
      )
    );

    const clientName =
      clients.find((client) => client.id === clientId)?.name || "Client";

    setClientActionNotice(clientName + " reactivated for active coaching.");
  };

  const viewArchivedClientForCoach = (clientId) => {
    setSelectedClientProfileId(clientId);

    const clientName =
      clients.find((client) => client.id === clientId)?.name || "Client";

    setClientActionNotice("Viewing saved history for " + clientName + ".");
  };
  // NLF_COACH_ASSIGNMENT_STATE_END

  useEffect(() => {
    saveStateToLocalStorage({ clients, savedPlans, workoutLogs, conversations, readActivityIds, notificationPreferences, serverSettings });
  }, [clients, savedPlans, workoutLogs, conversations, readActivityIds, notificationPreferences, serverSettings]);

  useEffect(() => {
    if (workoutLogs.length > 0 && !workoutLogs.some((log) => log.id === selectedWorkoutLogId)) {
      setSelectedWorkoutLogId(workoutLogs[0].id);
    }
    if (workoutLogs.length === 0) setSelectedWorkoutLogId("");
  }, [workoutLogs, selectedWorkoutLogId]);

  useEffect(() => {
    if (savedPlans.length > 0 && !savedPlans.some((plan) => plan.id === selectedPlanDetailId)) {
      setSelectedPlanDetailId(savedPlans[0].id);
    }
    if (savedPlans.length === 0) setSelectedPlanDetailId("");
  }, [savedPlans, selectedPlanDetailId]);

  const selectedClient = clients.find((client) => client.id === planDraft.clientId);
  const selectedDay = planDraft.days.find((day) => day.id === selectedDayId) || planDraft.days[0];

  const unreadCoachCount = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.messages.filter((m) => m.unreadForCoach).length, 0),
    [conversations]
  );

  const unreadClientCount = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.messages.filter((m) => m.unreadForClient).length, 0),
    [conversations]
  );
  const normalizedPortalMode = String(portalMode || PUBLIC_PORTAL_MODE).toLowerCase();
  const isPortalUnlocked = getPortalTestUnlocked() || hasCoachSessionLock();
const isLoggedIn =
    isPortalUnlocked &&
    (normalizedPortalMode === "coach" || normalizedPortalMode === "client");



  const messageUnreadCount =
    normalizedPortalMode === "client" ? unreadClientCount : unreadCoachCount;

  const tabs = [
    {
      id: "Home",
      icon: Home,
      isHomeAction: true,
    },
    { id: "Client", icon: Users },
    { id: "Clients", icon: Users },
    { id: "Coach", icon: ShieldCheck },
    { id: "Exercises", icon: Dumbbell },
    {
      id: "Messages",
      icon: MessageSquare,
      badge: messageUnreadCount,
      isMessageTab: true,
    },
    { id: "Plans", icon: ClipboardList },
    { id: "Progress", icon: TrendingUp },
    { id: "Tracker", icon: CheckCircle },
    {
      id: "Login",
      label: isLoggedIn ? "Logout" : "Login",
      icon: isLoggedIn ? LogOut : LogIn,
      isAccountAction: true,
    },
  ];

  const visibleTabs = isPortalUnlocked
    ? PORTAL_VISIBLE_TABS_BY_MODE[normalizedPortalMode] ||
      PORTAL_VISIBLE_TABS_BY_MODE.demo
    : PORTAL_VISIBLE_TABS_BY_MODE[PUBLIC_PORTAL_MODE];

  const visibleTabsSet = new Set(visibleTabs);
  const renderedTabs = tabs.filter((tab) => visibleTabsSet.has(tab.id));
  const homeNavTabs = renderedTabs.filter((tab) => tab.isHomeAction);
  const mainNavTabs = renderedTabs.filter(
    (tab) => !tab.isHomeAction && !tab.isAccountAction
  );
  const accountNavTabs = renderedTabs.filter((tab) => tab.isAccountAction);

  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const mobilePrimaryTabIds = ["Client", "Tracker", "Progress"];
  const mobilePrimaryTabLabels = {
    Client: "My Plan",
    Tracker: "Log",
    Progress: "Progress",
  };
  const mobilePrimaryTabs = mobilePrimaryTabIds
    .map((tabId) => renderedTabs.find((tab) => tab.id === tabId))
    .filter(Boolean);
  const mobileMoreOrder = ["Home", "Messages", "Exercises", "Login", "Coach", "Clients", "Plans"];
  const mobileMoreTabs = renderedTabs
    .filter((tab) => !mobilePrimaryTabIds.includes(tab.id))
    .sort((a, b) => {
      const aIndex = mobileMoreOrder.indexOf(a.id);
      const bIndex = mobileMoreOrder.indexOf(b.id);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  const isMobileMoreActive = mobileMoreTabs.some((tab) => tab.id === activeTab);

  function handleMobileTabNavigation(tab) {
    if (tab.id === "Login" && isLoggedIn) {
      handlePortalLogout();
      setIsMobileMoreOpen(false);
      return;
    }

    setActiveTab(tab.id);
    setIsMobileMoreOpen(false);
  }

  const filteredLibraryExercises = useMemo(() => {
    const search = librarySearch.toLowerCase();
    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(search) ||
        exercise.muscles.toLowerCase().includes(search) ||
        exercise.equipment.toLowerCase().includes(search) ||
        exercise.categories.join(" ").toLowerCase().includes(search);
      const matchesCategory = libraryCategory === "All" || exercise.categories.includes(libraryCategory);
      return matchesSearch && matchesCategory;
    });
  }, [librarySearch, libraryCategory]);

  const filteredBuilderExercises = useMemo(() => {
    const search = planExerciseSearch.toLowerCase();
    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(search) ||
        exercise.muscles.toLowerCase().includes(search) ||
        exercise.equipment.toLowerCase().includes(search) ||
        exercise.categories.join(" ").toLowerCase().includes(search);
      const matchesCategory = planCategory === "All" || exercise.categories.includes(planCategory);
      return matchesSearch && matchesCategory;
    });
  }, [planExerciseSearch, planCategory]);

  const coachNotifications = useMemo(() => {
    const activity = [];

    workoutLogs.forEach((log) => {
      activity.push({
        id: `workout-status-${log.id}`,
        type: "Workouts",
        title: log.status === "completed" ? "Client completed workout" : "Client skipped workout",
        detail:
          log.status === "skipped" && log.skipReason
            ? `${log.clientName} marked ${log.dayName} from ${log.planName} as skipped. Reason: ${log.skipReason}.`
            : `${log.clientName} marked ${log.dayName} from ${log.planName} as ${log.status}.`,
        time: log.submittedAt,
        timestamp: log.timestamp || 0,
        priority: log.status === "completed" ? "High" : "Medium",
      });

      const changedValues = log.entries.filter(
        (entry) => entry.actualWeight || entry.setsCompleted || entry.repsCompleted || entry.timeCompleted || entry.restUsed
      );
      const substitutions = log.entries.filter((entry) => entry.substitution);
      const notes = log.entries.filter((entry) => entry.notes);

      if (changedValues.length > 0) {
        activity.push({
          id: `workout-values-${log.id}`,
          type: "Workouts",
          title: "Client changed workout values",
          detail: `${log.clientName} entered tracking values for ${changedValues.length} exercise(s).`,
          time: log.submittedAt,
          timestamp: log.timestamp || 0,
          priority: "High",
        });
      }

      if (substitutions.length > 0) {
        activity.push({
          id: `workout-substitution-${log.id}`,
          type: "Substitutions",
          title: "Client changed assigned exercise",
          detail: `${log.clientName} substituted ${substitutions.length} exercise(s).`,
          time: log.submittedAt,
          timestamp: log.timestamp || 0,
          priority: "High",
        });
      }

      if (notes.length > 0) {
        activity.push({
          id: `workout-notes-${log.id}`,
          type: "Notes",
          title: "Client left workout note",
          detail: `${log.clientName} left notes on ${notes.length} exercise(s).`,
          time: log.submittedAt,
          timestamp: log.timestamp || 0,
          priority: "Medium",
        });
      }
    });

    savedPlans.forEach((plan) => {
      activity.push({
        id: `plan-assigned-${plan.id}`,
        type: "Plans",
        title: "Coach assigned new plan",
        detail: `${plan.planName} assigned to ${plan.clientName}.`,
        time: plan.createdAt,
        timestamp: plan.timestamp || 0,
        priority: "Medium",
      });
    });

    conversations.forEach((conversation) => {
      conversation.messages
        .filter((message) => message.timestamp > 10)
        .forEach((message) => {
          activity.push({
            id: `message-${message.id}`,
            type: "Messages",
            title: message.sender === "Client" ? "Client sent message" : "Coach sent message",
            detail: `${message.sender} message in ${conversation.clientName}'s conversation: ${message.body}`,
            time: message.sentAt,
            timestamp: message.timestamp || 0,
            priority: message.sender === "Client" ? "High" : "Low",
          });
        });
    });

    activity.push({
      id: "email-placeholder",
      type: "Email",
      title: "Email notifications not connected",
      detail: "Email alerts should be handled later through a secure notification service, not directly inside App.jsx.",
      time: "Frontend placeholder",
      timestamp: 0,
      priority: "Future",
      systemItem: true,
    });

    return activity
      .map((item) => ({ ...item, isRead: item.systemItem ? true : readActivityIds.includes(item.id) }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [savedPlans, workoutLogs, conversations, readActivityIds]);

  const unreadActivityCount = coachNotifications.filter((item) => !item.isRead).length;

  function markActivityRead(activityId) {
    setReadActivityIds((current) => (current.includes(activityId) ? current : [...current, activityId]));
  }

  function markAllActivityRead() {
    const readableIds = coachNotifications.filter((item) => !item.systemItem).map((item) => item.id);
    setReadActivityIds((current) => Array.from(new Set([...current, ...readableIds])));
  }

  function updatePlanField(field, value) {
    setPlanDraft((current) => ({ ...current, [field]: value }));
  }

  function addTrainingDay() {
    const unnamedDay = planDraft.days.find((day) => !String(day.name || "").trim());
    if (unnamedDay) {
      setSelectedDayId(unnamedDay.id);
      setBuilderMessage("Name every training day before adding another day.");
      return;
    }

    const newDay = { id: makeId("day"), name: "", exercises: [] };
    setPlanDraft((current) => ({ ...current, days: [...current.days, newDay] }));
    setSelectedDayId(newDay.id);
    setBuilderMessage("");
  }

  function updateTrainingDayName(dayId, value) {
    setPlanDraft((current) => ({ ...current, days: current.days.map((day) => (day.id === dayId ? { ...day, name: value } : day)) }));
  }

  function removeTrainingDay(dayId) {
    if (planDraft.days.length === 1) {
      setBuilderMessage("A plan needs at least one training day.");
      return;
    }
    const remainingDays = planDraft.days.filter((day) => day.id !== dayId);
    setPlanDraft((current) => ({ ...current, days: remainingDays }));
    if (selectedDayId === dayId) setSelectedDayId(remainingDays[0].id);
    setBuilderMessage("");
  }

  function addExerciseToSelectedDay(exercise) {
    if (!selectedDay) return;
    const planExercise = {
      id: makeId("plan-exercise"),
      exerciseName: exercise.name,
      categories: exercise.categories,
      muscles: exercise.muscles,
      equipment: exercise.equipment,
      sets: "3",
      repsOrTime: "8 - 12",
      weightGuidance: "Coach-guided",
      rest: "60 - 90 sec",
      notes: "",
    };
    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) => (day.id === selectedDay.id ? { ...day, exercises: [...day.exercises, planExercise] } : day)),
    }));
    setBuilderMessage(`${exercise.name} added to ${selectedDay.name}.`);
  }

  function updatePlanExercise(dayId, exerciseId, field, value) {
    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise)) }
          : day
      ),
    }));
  }

  function removePlanExercise(dayId, exerciseId) {
    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId ? { ...day, exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId) } : day
      ),
    }));
    setBuilderMessage("Exercise removed from plan.");
  }

  function savePlan() {
    const planName = planDraft.planName.trim();
    if (!planName) return setBuilderMessage("Add a plan name before saving.");
    if (!planDraft.clientId) return setBuilderMessage("Select a client before saving.");

    const assignedClient = clients.find((client) => client.id === planDraft.clientId);
    const unnamedTrainingDay = planDraft.days.find((day) => !String(day.name || "").trim());

    if (unnamedTrainingDay) {
      setSelectedDayId(unnamedTrainingDay.id);
      setBuilderMessage("Name every training day before saving.");
      return;
    }

    const exerciseCount = planDraft.days.reduce((total, day) => total + day.exercises.length, 0);
    if (exerciseCount === 0) return setBuilderMessage("Add at least one exercise before saving.");

    const planDays = planDraft.days.map((day) => ({
      ...day,
      name: day.name || "Unnamed Training Day",
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    }));

    if (editingPlanId) {
      const existingPlan = savedPlans.find((plan) => plan.id === editingPlanId);
      if (!existingPlan) {
        setEditingPlanId("");
        return setBuilderMessage("That saved plan no longer exists. Save it as a new plan instead.");
      }

      const updatedPlan = {
        ...existingPlan,
        planName,
        clientId: planDraft.clientId,
        clientName: assignedClient?.name || "Unassigned Client",
        updatedAt: new Date().toLocaleString(),
        updatedTimestamp: Date.now(),
        days: planDays,
      };

      setSavedPlans((current) => current.map((plan) => (plan.id === editingPlanId ? updatedPlan : plan)));
      setSelectedPlanDetailId(updatedPlan.id);
      setTrackerClientId(updatedPlan.clientId);
      setSelectedTrackerPlanId(updatedPlan.id);
      setSelectedTrackerDayId(updatedPlan.days[0]?.id || "");
      setSelectedClientProfileId(updatedPlan.clientId);
      setBuilderMessage("Plan changes saved. Tracker and plan details now use the edited version.");
      return;
    }

    const newPlan = {
      id: makeId("saved-plan"),
      planName,
      clientId: planDraft.clientId,
      clientName: assignedClient?.name || "Unassigned Client",
      createdAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      days: planDays,
    };

    setSavedPlans((current) => [newPlan, ...current]);
    setSelectedPlanDetailId(newPlan.id);
    setTrackerClientId(newPlan.clientId);
    setSelectedTrackerPlanId(newPlan.id);
    setSelectedTrackerDayId(newPlan.days[0]?.id || "");
    setSelectedClientProfileId(newPlan.clientId);
    setBuilderMessage("Plan saved locally and assigned to the selected client.");
  }

  function resetPlanBuilder() {
    const newDay = { id: makeId("day"), name: "", exercises: [] };
    setPlanDraft({ planName: "", clientId: clients[0]?.id || "", days: [newDay] });
    setSelectedDayId(newDay.id);
    setPlanExerciseSearch("");
    setPlanCategory("All");
    setEditingPlanId("");
    setBuilderMessage("Builder reset.");
  }

  function startEditPlan(planId) {
    const plan = savedPlans.find((item) => item.id === planId);
    if (!plan) return;
    setEditingPlanId(plan.id);
    setPlanDraft({
      planName: plan.planName,
      clientId: plan.clientId,
      days: copyPlanDaysForEdit(plan.days),
    });
    setSelectedDayId(plan.days[0]?.id || "");
    setPlanExerciseSearch("");
    setPlanCategory("All");
    setSelectedPlanDetailId(plan.id);
    setActiveTab("Plans");
    setBuilderMessage(`Editing "${plan.planName}". Make changes, then click Save Changes.`);
  }

  function duplicateSavedPlan(planId) {
    const plan = savedPlans.find((item) => item.id === planId);
    if (!plan) return;
    const duplicate = {
      ...plan,
      id: makeId("saved-plan"),
      planName: `${plan.planName} Copy`,
      createdAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      updatedAt: "",
      updatedTimestamp: null,
      days: clonePlanDays(plan.days),
    };
    setSavedPlans((current) => [duplicate, ...current]);
    setSelectedPlanDetailId(duplicate.id);
    setBuilderMessage(`Duplicated "${plan.planName}" locally.`);
  }

  function deleteSavedPlan(planId) {
    const plan = savedPlans.find((item) => item.id === planId);
    if (!plan) return;
    const remainingPlans = savedPlans.filter((item) => item.id !== planId);
    setSavedPlans(remainingPlans);
    setSelectedPlanDetailId((current) => (current === planId ? remainingPlans[0]?.id || "" : current));
    setSelectedTrackerPlanId((current) => (current === planId ? "" : current));
    if (editingPlanId === planId) setEditingPlanId("");
    setBuilderMessage(`Deleted saved plan "${plan.planName}" locally.`);
  }

  function toggleNotificationPreference(key) {
    setNotificationPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateServerSetting(field, value) {
    setServerSettings((current) => ({ ...current, [field]: value }));
  }

  function addClient() {
    const name = clientForm.name.trim();
    const email = clientForm.email.trim();
    if (!name) return;

    const newClient = { id: makeId("client"), name, email: email || "No email added", status: "Active" };
    setClients((current) => [...current, newClient]);
    setClientForm({ name: "", email: "" });
    setSelectedClientProfileId(newClient.id);
    setConversations((current) => [...current, { clientId: newClient.id, clientName: newClient.name, messages: [] }]);
    if (!planDraft.clientId) setPlanDraft((current) => ({ ...current, clientId: newClient.id }));
    setClientActionNotice(`${newClient.name} added and saved locally.`);
    setLocalSaveNotice(`${newClient.name} added and saved locally.`);
  }

  function updateClientStatus(clientId, status) {
    const client = clients.find((item) => item.id === clientId);
    setClients((current) => current.map((item) => (item.id === clientId ? { ...item, status } : item)));
    setClientActionNotice(`${client?.name || "Client"} status updated to ${status}.`);
  }

  function safeDeleteClient(clientId) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    const hasPlans = savedPlans.some((plan) => plan.clientId === clientId);
    const hasLogs = workoutLogs.some((log) => log.clientId === clientId);
    const conversation = conversations.find((item) => item.clientId === clientId);
    const hasMessages = conversation && conversation.messages.length > 0;

    if (hasPlans || hasLogs || hasMessages) {
      setClientActionNotice(`${client.name} has plans, logs, or messages. Safe delete blocked. Change status to Inactive instead.`);
      return;
    }

    const remainingClients = clients.filter((item) => item.id !== clientId);
    setClients(remainingClients);
    setConversations((current) => current.filter((conversation) => conversation.clientId !== clientId));
    setSelectedClientProfileId(remainingClients[0]?.id || "");
    setTrackerClientId((current) => (current === clientId ? remainingClients[0]?.id || "" : current));
    setPlanDraft((current) => ({ ...current, clientId: current.clientId === clientId ? remainingClients[0]?.id || "" : current.clientId }));
    setClientActionNotice(`${client.name} deleted safely.`);
  }

  function updateTrackingDraft(planId, dayId, exerciseId, field, value) {
    const key = getTrackingKey(planId, dayId, exerciseId);
    setTrackingDrafts((current) => ({ ...current, [key]: { ...(current[key] || emptyTrackingEntry), [field]: value } }));
  }

  function markWorkoutStatus(plan, day, status) {
    if (!plan || !day) {
      setTrackerMessage("Select a plan and training day first.");
      return;
    }

    const entries = day.exercises.map((exercise) => {
      const key = getTrackingKey(plan.id, day.id, exercise.id);
      const draft = trackingDrafts[key] || emptyTrackingEntry;
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.exerciseName,
        assignedSets: exercise.sets,
        assignedRepsOrTime: exercise.repsOrTime,
        assignedWeightGuidance: exercise.weightGuidance,
        assignedRest: exercise.rest,
        actualWeight: draft.actualWeight || "",
        setsCompleted: draft.setsCompleted || "",
        repsCompleted: draft.repsCompleted || "",
        timeCompleted: draft.timeCompleted || "",
        restUsed: draft.restUsed || "",
        substitution: draft.substitution || "",
        notes: draft.notes || "",
      };
    });

    const newLog = {
      id: makeId("workout-log"),
      clientId: plan.clientId,
      clientName: plan.clientName,
      planId: plan.id,
      planName: plan.planName,
      dayId: day.id,
      dayName: day.name,
      status,
      skipReason: status === "skipped" ? skipReason.trim() : "",
      submittedAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      entries,
    };

    setWorkoutLogs((current) => [newLog, ...current]);
    setSelectedWorkoutLogId(newLog.id);
    setSelectedClientProfileId(plan.clientId);
    setSkipReason("");
    setTrackerMessage(
      status === "completed"
        ? `${day.name} marked complete. Coach activity and workout log details updated.`
        : `${day.name} marked skipped. Coach activity and workout log details updated.`
    );
  }

  function deleteWorkoutLog(logId) {
    const log = workoutLogs.find((item) => item.id === logId);
    if (!log) return;
    const remainingLogs = workoutLogs.filter((item) => item.id !== logId);
    setWorkoutLogs(remainingLogs);
    setSelectedWorkoutLogId((current) => (current === logId ? remainingLogs[0]?.id || "" : current));
    setTrackerMessage(`${log.dayName} workout log deleted locally.`);
  }

  function selectConversation(clientId) {
    setSelectedConversationId(clientId);
    setMessageNotice("");
  }

  function markCoachMessagesRead(clientId) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.clientId === clientId
          ? { ...conversation, messages: conversation.messages.map((message) => ({ ...message, unreadForCoach: false })) }
          : conversation
      )
    );
    setMessageNotice("Coach unread messages marked as read.");
  }

  function markClientMessagesRead(clientId) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.clientId === clientId
          ? { ...conversation, messages: conversation.messages.map((message) => ({ ...message, unreadForClient: false })) }
          : conversation
      )
    );
    setMessageNotice("Client unread messages marked as read.");
  }

  function sendMessage() {
    const text = messageDraft.trim();
    if (!text) return setMessageNotice("Type a message before sending.");

    const selectedConversation = conversations.find((conversation) => conversation.clientId === selectedConversationId);
    if (!selectedConversation) return setMessageNotice("Select a conversation first.");

    const newMessage = {
      id: makeId("message"),
      sender: messageSender,
      body: text,
      sentAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      unreadForCoach: messageSender === "Client",
      unreadForClient: messageSender === "Coach",
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.clientId === selectedConversationId
          ? { ...conversation, messages: [...conversation.messages, newMessage] }
          : conversation
      )
    );
    setMessageDraft("");
    setMessageNotice(`${messageSender} message sent locally.`);
  }

  function openTrackerForClient(clientId) {
    setTrackerClientId(clientId);
    setSelectedTrackerPlanId("");
    setSelectedTrackerDayId("");
    setActiveTab("Tracker");
  }

  function openMessagesForClient(clientId) {
    setSelectedConversationId(clientId);
    setActiveTab("Messages");
  }

  function openPlansForClient(clientId) {
    const firstClientPlan = savedPlans.find((plan) => plan.clientId === clientId);
    if (firstClientPlan) setSelectedPlanDetailId(firstClientPlan.id);
    setActiveTab("Plans");
  }

  function clearLocalData() {
    const fallback = createDefaultState();
    const newDay = { id: makeId("day"), name: "", exercises: [] };
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setClients(fallback.clients);
    setSavedPlans([]);
    setSelectedPlanDetailId("");
    setWorkoutLogs([]);
    setSelectedWorkoutLogId("");
    setConversations(fallback.conversations);
    setReadActivityIds([]);
    setNotificationPreferences(fallback.notificationPreferences);
    setServerSettings(fallback.serverSettings);
    setEditingPlanId("");
    setSelectedConversationId(fallback.conversations[0]?.clientId || "");
    setSelectedClientProfileId(fallback.clients[0]?.id || "");
    setTrackerClientId(fallback.clients[0]?.id || "");
    setSelectedTrackerPlanId("");
    setSelectedTrackerDayId("");
    setTrackingDrafts({});
    setSkipReason("");
    setPlanDraft({ planName: "", clientId: fallback.clients[0]?.id || "", days: [newDay] });
    setSelectedDayId(newDay.id);
    setBuilderMessage("");
    setTrackerMessage("");
    setMessageNotice("");
    setClientActionNotice("");
    setActivityFilter("All");
    setLocalSaveNotice("Local data cleared. Starter data restored.");
  }

  async function handleImportServerDataIntoApp() {
    const [
      serverClients,
      serverPlans,
      serverWorkoutLogs,
      serverMessages,
    ] = await Promise.all([
      fetchBackendClients(),
      fetchBackendPlans(),
      fetchBackendWorkoutLogs(),
      fetchBackendMessages(),
    ]);

    const importedClients = Array.isArray(serverClients)
      ? serverClients.map(mapServerClientForApp)
      : [];

    if (importedClients.length === 0) {
      throw new Error("No server clients are visible. Sign in as coach first, then try importing again.");
    }

    const importedPlans = Array.isArray(serverPlans)
      ? serverPlans.map((plan) => mapServerPlanForApp(plan, importedClients))
      : [];

    const importedWorkoutLogs = Array.isArray(serverWorkoutLogs)
      ? serverWorkoutLogs.map((log) => mapServerWorkoutLogForApp(log, importedClients, importedPlans))
      : [];

    const importedConversations = buildServerConversationsForApp(
      importedClients,
      Array.isArray(serverMessages) ? serverMessages : []
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
      name: "",
      exercises: [],
    };

    setPlanDraft({
      planName: "",
      clientId: firstClient?.id || "",
      days: [newDay],
    });

    setSelectedDayId(newDay.id);

    const summary =
      "Server import complete: " +
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
        " LocalStorage now mirrors the imported server data until full live sync is finished."
    );

    setActiveTab("Home");

    return summary;
  }

  function handlePortalLogin(profile) {
    const role = String(profile?.role || "").toLowerCase();

    if (role === "coach") {
    try {
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "coach");
      window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setPortalMode("coach");
      setActiveTab("Coach");
      return;
    }

    if (role === "client") {
    try {
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "client");
      window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setPortalMode("client");
      setActiveTab("Client");
      return;
    }

    setPortalMode("demo");
    setActiveTab("Login");
  }

  

function handlePortalLogout() {
    try {
      window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
      window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "login");
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setPortalMode("login");
    setActiveTab("Login");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/images/gym-background.webp')" }} />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-black/90 to-black" />

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-black/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <button type="button" onClick={() => setActiveTab("Home")} className="flex items-center gap-3 text-left">
              <img src="/images/logo.png" alt="No Limit Fitness" className="h-14 w-14 rounded-2xl object-contain" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/50">Coach Portal</p>
                <h1 className="text-2xl font-black uppercase tracking-wide">
                  No Limit <span className="text-[#00BF63]">Fitness</span>
                </h1>
              </div>
            </button>

            <nav
              aria-label="Main navigation"
              className={["w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end", normalizedPortalMode === "client" ? "hidden md:flex" : "flex"].join(" ")}
            >
              {homeNavTabs.length > 0 && (
                <div
                  data-nlf-home-nav="true"
                  className="flex flex-wrap gap-2 border-b border-white/10 pb-3 lg:mr-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4"
                >
                  {homeNavTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const tabLabel = tab.label || tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={[
                          "relative flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-black uppercase tracking-wide transition",
                          isActive
                            ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20"
                            : "border-white/20 bg-white/10 text-white hover:border-[#00BF63] hover:bg-[#00BF63] hover:text-black",
                        ].join(" ")}
                      >
                        <Icon size={16} />
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              <div data-nlf-main-nav="true" className="flex flex-wrap gap-2">
                {mainNavTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isMessageTab = tab.id === "Messages";
                  const tabLabel = tab.label || tab.id;

                  const inactiveClass = isMessageTab
                    ? "border-[#00BF63]/40 bg-[#00BF63]/10 text-[#00BF63] shadow-lg shadow-[#00BF63]/10 hover:bg-[#00BF63] hover:text-black"
                    : "border-white/10 bg-white/5 text-white hover:border-[#00BF63]/70 hover:text-[#00BF63]";

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        "relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
                        isActive
                          ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20"
                          : inactiveClass,
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      {tabLabel}

                      {tab.badge > 0 && (
                        <span
                          className={[
                            "ml-1 rounded-full px-2 py-0.5 text-xs font-black",
                            isActive
                              ? "bg-black text-[#00BF63]"
                              : "bg-[#00BF63] text-black",
                          ].join(" ")}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {accountNavTabs.length > 0 && (
                <div
                  data-nlf-account-nav="true"
                  className="flex flex-wrap gap-2 border-t border-white/10 pt-3 lg:ml-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
                >
                  {accountNavTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const tabLabel = tab.label || tab.id;
                    const isLogout = tabLabel === "Logout";

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (tab.id === "Login" && isLoggedIn) {
                            handlePortalLogout();
                            return;
                          }

                          setActiveTab(tab.id);
                        }}
                        className={[
                          "relative flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-black uppercase tracking-wide transition",
                          isActive
                            ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20"
                            : isLogout
                              ? "border-red-400/40 bg-red-500/10 text-red-200 hover:border-red-300 hover:bg-red-500 hover:text-black"
                              : "border-[#00BF63]/60 bg-black text-[#00BF63] ring-1 ring-[#00BF63]/30 hover:bg-[#00BF63] hover:text-black",
                        ].join(" ")}
                      >
                        <Icon size={16} />
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </nav>
          </div>
</header>

        {normalizedPortalMode === "client" && (
          <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md rounded-[2rem] border border-[#00BF63]/35 bg-black/95 px-3 pb-3 pt-2 shadow-2xl shadow-[#00BF63]/15 ring-1 ring-white/10 backdrop-blur md:hidden"
          >
            {isMobileMoreOpen && (
              <div
                aria-label="Mobile More menu"
                className="absolute inset-x-0 bottom-24 max-h-[65vh] overflow-y-auto rounded-3xl border border-[#00BF63]/30 bg-black/95 p-3 shadow-2xl shadow-black/70 ring-1 ring-white/10"
              >
                <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
                  More Tools
                </p>

                <div className="grid gap-2">
                  {mobileMoreTabs.map((tab) => {
                    const Icon = tab.icon;
                    const tabLabel = tab.label || tab.id;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-label={tabLabel}
                        onClick={() => handleMobileTabNavigation(tab)}
                        className={[
                          "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-black transition",
                          isActive
                            ? "border-[#00BF63] bg-[#00BF63] text-black"
                            : "border-white/10 bg-white/[0.04] text-white hover:border-[#00BF63] hover:text-[#00BF63]",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={18} />
                          {tabLabel}
                        </span>

                        {tab.badge > 0 && (
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-xs font-black",
                              isActive ? "bg-black text-[#00BF63]" : "bg-[#00BF63] text-black",
                            ].join(" ")}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {mobilePrimaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const tabLabel = mobilePrimaryTabLabels[tab.id] || tab.label || tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-label={tabLabel}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMoreOpen(false);
                    }}
                    className={[
                      "flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[11px] font-black uppercase tracking-wide transition",
                      isActive
                        ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-[#00BF63] hover:text-[#00BF63]",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                    {tabLabel}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="More"
                onClick={() => setIsMobileMoreOpen((current) => !current)}
                className={[
                  "relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[11px] font-black uppercase tracking-wide transition ring-1",
                  isMobileMoreOpen || isMobileMoreActive
                    ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20 ring-[#00BF63]/30"
                    : "border-[#00BF63]/70 bg-[#00BF63]/15 text-[#00BF63] shadow-lg shadow-[#00BF63]/10 ring-[#00BF63]/20 hover:bg-[#00BF63] hover:text-black",
                ].join(" ")}
              >
                <span className="text-xl leading-none">☰</span>
                More
              </button>
            </div>
          </nav>
        )}

        <main className="mx-auto max-w-7xl px-4 py-8 pb-28 md:pb-8">
        {/* NLF_CLIENT_PORTAL_POLISH_PANEL_START */}
        {activeTab === "Client" && normalizedPortalMode === "client" && (
          <ClientPortalMyPlanPanel
            clients={clients}
            savedPlans={savedPlans}
            workoutLogs={workoutLogs}
            onOpenTracker={() => setActiveTab("Tracker")}
            onOpenMessages={() => setActiveTab("Messages")}
            onOpenProgress={() => setActiveTab("Progress")}
          />
        )}
        {/* NLF_CLIENT_PORTAL_POLISH_PANEL_END */}
        {/* NLF_COACH_ASSIGNMENT_PANEL_START */}
        {activeTab === "Clients" && normalizedPortalMode !== "client" && (
          <CoachClientAssignmentPanel
            clients={normalizedCoachClients}
            clientActionNotice={clientActionNotice}
            onAssignClient={assignClientToCoach}
            onArchiveClient={archiveClientForCoach}
            onReactivateClient={reactivateClientForCoach}
            onViewArchivedClient={viewArchivedClientForCoach}
          />
        )}
        {/* NLF_COACH_ASSIGNMENT_PANEL_END */}
          {activeTab === "Home" && (
            <HomeScreen
              setActiveTab={setActiveTab}
              clients={clients}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              exerciseCount={exerciseLibrary.length}
              unreadCoachCount={unreadCoachCount}
              unreadActivityCount={unreadActivityCount}
              localSaveNotice={localSaveNotice}
              clearLocalData={clearLocalData}
              notificationPreferences={notificationPreferences}
              toggleNotificationPreference={toggleNotificationPreference}
              serverSettings={serverSettings}
              updateServerSetting={updateServerSetting}
            />
          )}

          {activeTab === "Client" && normalizedPortalMode !== "client" && (
            <ClientDashboardScreen
              clients={clients}
              selectedClientProfileId={selectedClientProfileId}
              setSelectedClientProfileId={setSelectedClientProfileId}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              conversations={conversations}
              openTrackerForClient={openTrackerForClient}
              openMessagesForClient={openMessagesForClient}
              openPlansForClient={openPlansForClient}
              markClientMessagesRead={markClientMessagesRead}
            />
          )}

          {activeTab === "Coach" && (
            <CoachScreen
              notifications={coachNotifications}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              selectedWorkoutLogId={selectedWorkoutLogId}
              setSelectedWorkoutLogId={setSelectedWorkoutLogId}
              deleteWorkoutLog={deleteWorkoutLog}
              unreadCoachCount={unreadCoachCount}
              unreadActivityCount={unreadActivityCount}
              activityFilter={activityFilter}
              setActivityFilter={setActivityFilter}
              markActivityRead={markActivityRead}
              markAllActivityRead={markAllActivityRead}
            />
          )}

          {activeTab === "Clients" && (
            <ClientsScreen
              clients={clients}
              clientForm={clientForm}
              setClientForm={setClientForm}
              addClient={addClient}
              selectedClientProfileId={selectedClientProfileId}
              setSelectedClientProfileId={setSelectedClientProfileId}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              conversations={conversations}
              openTrackerForClient={openTrackerForClient}
              openMessagesForClient={openMessagesForClient}
              openPlansForClient={openPlansForClient}
              updateClientStatus={updateClientStatus}
              clientActionNotice={clientActionNotice}
            />
          )}

          {activeTab === "Plans" && (
            <PlansScreen
              clients={clients}
              planDraft={planDraft}
              selectedClient={selectedClient}
              selectedDay={selectedDay}
              selectedDayId={selectedDayId}
              setSelectedDayId={setSelectedDayId}
              updatePlanField={updatePlanField}
              addTrainingDay={addTrainingDay}
              updateTrainingDayName={updateTrainingDayName}
              removeTrainingDay={removeTrainingDay}
              planExerciseSearch={planExerciseSearch}
              setPlanExerciseSearch={setPlanExerciseSearch}
              planCategory={planCategory}
              setPlanCategory={setPlanCategory}
              filteredBuilderExercises={filteredBuilderExercises}
              addExerciseToSelectedDay={addExerciseToSelectedDay}
              updatePlanExercise={updatePlanExercise}
              removePlanExercise={removePlanExercise}
              savePlan={savePlan}
              resetPlanBuilder={resetPlanBuilder}
              builderMessage={builderMessage}
              savedPlans={savedPlans}
              selectedPlanDetailId={selectedPlanDetailId}
              setSelectedPlanDetailId={setSelectedPlanDetailId}
              editingPlanId={editingPlanId}
              startEditPlan={startEditPlan}
              duplicateSavedPlan={duplicateSavedPlan}
              deleteSavedPlan={deleteSavedPlan}
            />
          )}

          {activeTab === "Tracker" && (
            <TrackerScreen
              clients={clients}
              savedPlans={savedPlans}
              trackerClientId={trackerClientId}
              setTrackerClientId={setTrackerClientId}
              selectedTrackerPlanId={selectedTrackerPlanId}
              setSelectedTrackerPlanId={setSelectedTrackerPlanId}
              selectedTrackerDayId={selectedTrackerDayId}
              setSelectedTrackerDayId={setSelectedTrackerDayId}
              trackingDrafts={trackingDrafts}
              updateTrackingDraft={updateTrackingDraft}
              markWorkoutStatus={markWorkoutStatus}
              trackerMessage={trackerMessage}
              workoutLogs={workoutLogs}
              selectedWorkoutLogId={selectedWorkoutLogId}
              setSelectedWorkoutLogId={setSelectedWorkoutLogId}
              setActiveTab={setActiveTab}
              skipReason={skipReason}
              setSkipReason={setSkipReason}
              deleteWorkoutLog={deleteWorkoutLog}
            />
          )}

          {activeTab === "Messages" && (
            <MessagesScreen
              clients={clients}
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              selectConversation={selectConversation}
              messageSender={messageSender}
              setMessageSender={setMessageSender}
              messageDraft={messageDraft}
              setMessageDraft={setMessageDraft}
              sendMessage={sendMessage}
              markCoachMessagesRead={markCoachMessagesRead}
              markClientMessagesRead={markClientMessagesRead}
              messageNotice={messageNotice}
              unreadCoachCount={unreadCoachCount}
              unreadClientCount={unreadClientCount}
            />
          )}

          {activeTab === "Exercises" && (
            <ExercisesScreen
              librarySearch={librarySearch}
              setLibrarySearch={setLibrarySearch}
              libraryCategory={libraryCategory}
              setLibraryCategory={setLibraryCategory}
              filteredLibraryExercises={filteredLibraryExercises}
              totalExerciseCount={exerciseLibrary.length}
            />
          )}

          {activeTab === "Progress" && (
            <ProgressScreen
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              selectedWorkoutLogId={selectedWorkoutLogId}
              setSelectedWorkoutLogId={setSelectedWorkoutLogId}
              deleteWorkoutLog={deleteWorkoutLog}
            />
          )}

          {activeTab === "Login" && <LoginScreen onServerImport={handleImportServerDataIntoApp} 
              onPortalLogin={handlePortalLogin}
              onPortalLogout={handlePortalLogout} />}
        </main>
      </div>
    </div>
  );
}

function NotificationPreferencesPanel({ preferences, onToggle }) {
  const options = [
    ["completedWorkout", "Client completed workout"],
    ["skippedWorkout", "Client skipped workout"],
    ["changedValues", "Client changed sets, reps, weight, time, or rest"],
    ["substitutions", "Client changed assigned exercise"],
    ["workoutNotes", "Client left workout note"],
    ["planAssigned", "Coach assigned new plan"],
    ["messages", "Coach/client messages"],
  ];
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-start gap-3"><Bell className="mt-1 text-[#00BF63]" /><div><h3 className="text-xl font-black uppercase">Notification Preferences</h3><p className="mt-1 text-sm leading-6 text-white/60">Placeholder controls for which in-app and future email alerts should matter. These save locally for now.</p></div></div>
      <div className="space-y-3">
        {options.map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/75">
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(preferences[key])} onChange={() => onToggle(key)} className="h-5 w-5 accent-[#00BF63]" />
          </label>
        ))}
      </div>
    </div>
  );
}

function ServerSettingsPanel({ settings, onChange }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-start gap-3"><ShieldCheck className="mt-1 text-[#00BF63]" /><div><h3 className="text-xl font-black uppercase">Notification Settings</h3><p className="mt-1 text-sm leading-6 text-white/60">Saved setting. Later, these settings can connect to a secure notification service for personal email alerts.</p></div></div>
      <div className="space-y-3">
        <Input label="Coach Email For Future Alerts" value={settings.coachEmail} onChange={(value) => onChange("coachEmail", value)} placeholder="your-email@example.com" />
        <Select label="Notification Delivery" value={settings.emailProvider} onChange={(value) => onChange("emailProvider", value)} options={["Email Alerts", "Backup Email Alerts", "Server undecided"].map((item) => ({ label: item, value: item }))} />
        <Input label="Sync Status" value={settings.serverStatus} onChange={(value) => onChange("serverStatus", value)} placeholder="Saved setting" />
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100"><span className="font-black uppercase">Reminder:</span> {settings.notes}</div>
      </div>
    </div>
  );
}

function HomeScreen({ setActiveTab, clients, savedPlans, workoutLogs, exerciseCount, unreadCoachCount, unreadActivityCount, localSaveNotice, clearLocalData, notificationPreferences, toggleNotificationPreference, serverSettings, updateServerSetting }) {
  const homeCards = [
    { title: "Build Workout Plan", text: "Create structured training days, add exercises, and program coaching details.", icon: ClipboardList, target: "Plans" },
    { title: "Client Profiles", text: "Open client details, assigned plans, recent logs, and recent messages.", icon: Users, target: "Clients" },
    { title: "Client Tracker", text: "Open an assigned workout and log actual client performance.", icon: CheckCircle, target: "Tracker" },
    { title: "Messages", text: "Send local coach/client messages and track unread client replies.", icon: MessageSquare, target: "Messages" },
  ];

  return (
    <div>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-[#00BF63]">Built with structure. Backed by discipline.</p>
            <h2 className="text-4xl font-black uppercase leading-tight md:text-6xl">Coach-to-client workout tracking system.</h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">
              Build plans, assign them to clients, track completed and skipped workouts, manage messages, review coach activity, inspect detailed workout logs, and use a larger exercise library.
            </p>
            <div className="mt-6 rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4"><p className="text-sm font-bold text-[#00BF63]">{localSaveNotice}</p></div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => setActiveTab("Plans")} className="rounded-full bg-[#00BF63] px-6 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white">Build Plan</button>
              <button type="button" onClick={() => setActiveTab("Clients")} className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black">Client Profiles</button>
              <button type="button" onClick={clearLocalData} className="rounded-full border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-black uppercase tracking-wide text-red-300 transition hover:bg-red-500 hover:text-white">Clear Local Data</button>
            </div>
          </div>
          <div className="grid gap-3 rounded-[2rem] border border-[#00BF63]/30 bg-black/60 p-5">
            <StatCard label="Clients" value={clients.length} />
            <StatCard label="Saved Plans" value={savedPlans.length} />
            <StatCard label="Workout Logs" value={workoutLogs.length} />
            <StatCard label="Coach Unread" value={unreadCoachCount} />
            <StatCard label="Unread Activity" value={unreadActivityCount} />
            <StatCard label="Exercise Library" value={exerciseCount} />
          </div>
        </div>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {homeCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.title} type="button" onClick={() => setActiveTab(card.target)} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:-translate-y-1 hover:border-[#00BF63]/60 hover:bg-[#00BF63]/10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BF63] text-black"><Icon size={24} /></div>
              <h3 className="text-xl font-black uppercase">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{card.text}</p>
            </button>
          );
        })}
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <NotificationPreferencesPanel preferences={notificationPreferences} onToggle={toggleNotificationPreference} />
        <ServerSettingsPanel settings={serverSettings} onChange={updateServerSetting} />
      </section>
    </div>
  );
}

function ClientDashboardScreen({
  clients,
  selectedClientProfileId,
  setSelectedClientProfileId,
  savedPlans,
  workoutLogs,
  conversations,
  openTrackerForClient,
  openMessagesForClient,
  openPlansForClient,
  markClientMessagesRead,
}) {
  const [clientDashboardNotice, setClientDashboardNotice] = useState("");

  const selectedClient =
    clients.find((client) => client.id === selectedClientProfileId) || clients[0];

  const selectedPlans = selectedClient
    ? savedPlans.filter((plan) => plan.clientId === selectedClient.id)
    : [];

  const selectedLogs = selectedClient
    ? workoutLogs.filter((log) => log.clientId === selectedClient.id)
    : [];

  const selectedConversation = selectedClient
    ? conversations.find((conversation) => conversation.clientId === selectedClient.id)
    : null;

  const selectedMessages = selectedConversation?.messages || [];

  const completedLogs = selectedLogs.filter((log) => log.status === "completed");
  const skippedLogs = selectedLogs.filter((log) => log.status === "skipped");

  const clientUnreadCount = selectedMessages.filter(
    (message) => message.unreadForClient
  ).length;

  const coachUnreadCount = selectedMessages.filter(
    (message) => message.unreadForCoach
  ).length;

  const latestPlan = selectedPlans[0] || null;
  const todaysWorkout = latestPlan?.days?.[0] || null;

  const recentLogs = [...selectedLogs].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  const coachNotes = selectedPlans.flatMap((plan) =>
    plan.days.flatMap((day) =>
      day.exercises
        .filter((exercise) => exercise.notes)
        .map((exercise) => ({
          planName: plan.planName,
          dayName: day.name,
          exerciseName: exercise.exerciseName,
          notes: exercise.notes,
        }))
    )
  );

  return (
    <div>
      <SectionHeader
        eyebrow="Client Portal"
        title="Client Dashboard"
        description="Client-facing dashboard for assigned plans, today's workout, workout history, messages, and coach notes. Still frontend-only with local React state."
      />

      {!selectedClient ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-bold text-white/60">
            Add a client first to use the Client Dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {clientDashboardNotice && (
            <p className="rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 text-sm font-bold text-[#00BF63]">
              {clientDashboardNotice}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Assigned Plans" value={selectedPlans.length} />
            <StatCard label="Workout History" value={selectedLogs.length} />
            <StatCard label="Completed" value={completedLogs.length} />
            <StatCard label="Skipped" value={skippedLogs.length} />
            <StatCard label="Unread Messages" value={clientUnreadCount + coachUnreadCount} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Client Dashboard Selector
                </h3>

                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/50">
                  Client Dashboard Client
                </label>

                <select
                  aria-label="Client Dashboard Client"
                  value={selectedClient.id}
                  onChange={(event) => {
                    setSelectedClientProfileId(event.target.value);
                    setClientDashboardNotice("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#00BF63]"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>

                <div className="mt-4 space-y-3">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientProfileId(client.id);
                        setClientDashboardNotice("");
                      }}
                      className={
                        selectedClient.id === client.id
                          ? "w-full rounded-2xl border border-[#00BF63] bg-[#00BF63]/10 p-4 text-left transition"
                          : "w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-left transition hover:border-[#00BF63]/60"
                      }
                    >
                      <p className="font-black">{client.name}</p>
                      <p className="mt-1 text-sm text-white/55">{client.email}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                        {client.status}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                  Client Portal Summary
                </p>

                <h3 className="mt-2 text-2xl font-black uppercase">
                  {selectedClient.name}
                </h3>

                <p className="mt-1 text-sm text-white/55">{selectedClient.email}</p>

                <p className="mt-3 inline-flex rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase text-[#00BF63]">
                  {selectedClient.status}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openTrackerForClient(selectedClient.id)}
                    className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
                  >
                    Open Tracker
                  </button>

                  <button
                    type="button"
                    onClick={() => openMessagesForClient(selectedClient.id)}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    Open Messages
                  </button>

                  <button
                    type="button"
                    onClick={() => openPlansForClient(selectedClient.id)}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    View Plans
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      markClientMessagesRead(selectedClient.id);
                      setClientDashboardNotice("Client unread messages marked as read.");
                    }}
                    className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-5 py-3 text-sm font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
                  >
                    Mark Client Read
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Unread Messages
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                      Client unread
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#00BF63]">
                      {clientUnreadCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                      Coach unread
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#00BF63]">
                      {coachUnreadCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                  Today's Workout
                </p>

                {todaysWorkout ? (
                  <div className="mt-3">
                    <h3 className="text-2xl font-black uppercase text-white">
                      {todaysWorkout.name}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-white/65">
                      From {latestPlan.planName}
                    </p>

                    <div className="mt-4 space-y-3">
                      {todaysWorkout.exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="rounded-2xl border border-white/10 bg-black/40 p-4"
                        >
                          <p className="font-black text-white">{exercise.exerciseName}</p>

                          <div className="mt-2 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
                            <p>Sets: {exercise.sets}</p>
                            <p>Reps or Time: {exercise.repsOrTime}</p>
                            <p>Weight Guidance: {exercise.weightGuidance}</p>
                            <p>Rest Period: {exercise.rest}</p>
                          </div>

                          {exercise.notes && (
                            <p className="mt-3 rounded-xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3 text-sm font-bold text-[#00BF63]">
                              Coach Notes: {exercise.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-bold text-white/60">
                    No workout is assigned yet.
                  </p>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="mb-4 text-xl font-black uppercase">
                    Assigned Plans
                  </h3>

                  {selectedPlans.length === 0 ? (
                    <p className="text-sm font-bold text-white/55">
                      No plans assigned to this client yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="rounded-2xl border border-white/10 bg-black/40 p-4"
                        >
                          <h4 className="text-lg font-black uppercase">
                            {plan.planName}
                          </h4>

                          <p className="mt-1 text-sm text-white/65">
                            Client: {plan.clientName}
                          </p>

                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/40">
                            Created {plan.createdAt}
                          </p>

                          <div className="mt-3 space-y-3">
                            {plan.days.map((day) => (
                              <div
                                key={day.id}
                                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                              >
                                <p className="font-black text-[#00BF63]">
                                  {day.name}
                                </p>

                                <div className="mt-2 space-y-2">
                                  {day.exercises.map((exercise) => (
                                    <div key={exercise.id} className="text-sm text-white/70">
                                      <p className="font-bold text-white">
                                        {exercise.exerciseName}
                                      </p>
                                      <p>Sets: {exercise.sets}</p>
                                      <p>Reps or Time: {exercise.repsOrTime}</p>
                                      <p>Weight Guidance: {exercise.weightGuidance}</p>
                                      <p>Rest Period: {exercise.rest}</p>
                                      {exercise.notes && <p>Coach Notes: {exercise.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="mb-4 text-xl font-black uppercase">
                    Coach Notes
                  </h3>

                  {coachNotes.length === 0 ? (
                    <p className="text-sm font-bold text-white/55">
                      Coach notes will show here after they are added to a plan.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {coachNotes.map((note, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4"
                        >
                          <p className="font-black text-white">{note.exerciseName}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#00BF63]">
                            {note.planName} / {note.dayName}
                          </p>
                          <p className="mt-2 text-sm text-white/75">{note.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-1 text-xl font-black uppercase">
                  Workout History
                </h3>

                <p className="mb-4 text-sm font-bold text-white/45">
                  Recent Workout History
                </p>

                {recentLogs.length === 0 ? (
                  <p className="text-sm font-bold text-white/55">
                    No workout logs for this client yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-black uppercase">
                              {log.dayName}
                            </h4>

                            <p className="mt-1 text-sm text-white/65">
                              {log.clientName} {log.status} {log.dayName} from {log.planName}
                            </p>
                          </div>

                          <span className="rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                            {log.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/40">
                          {log.submittedAt}
                        </p>

                        {log.skipReason && (
                          <p className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">
                            Skip Reason: {log.skipReason}
                          </p>
                        )}

                        <div className="mt-4 space-y-3">
                          {log.entries?.map((entry) => (
                            <div
                              key={entry.exerciseId}
                              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70"
                            >
                              <p className="text-base font-black text-white">
                                {entry.exerciseName}
                              </p>

                              <p>Actual Weight Used: {entry.actualWeight || "N/A"}</p>
                              <p>Sets Completed: {entry.setsCompleted || "N/A"}</p>
                              <p>Reps Completed: {entry.repsCompleted || "N/A"}</p>
                              <p>Time Completed: {entry.timeCompleted || "N/A"}</p>
                              <p>Actual Rest Used: {entry.restUsed || "N/A"}</p>

                              {entry.substitution && (
                                <p>Exercise Substitution: {entry.substitution}</p>
                              )}

                              {entry.notes && <p>Client Notes: {entry.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Client Messages
                </h3>

                {selectedMessages.length === 0 ? (
                  <p className="text-sm font-bold text-white/55">
                    No messages for this client yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-[#00BF63]">
                            {message.sender}
                          </p>
                          <p className="text-xs text-white/40">{message.sentAt}</p>
                        </div>

                        {message.unreadForClient && (
                          <span className="mt-2 inline-flex rounded-full bg-[#00BF63] px-2 py-1 text-xs font-black uppercase text-black">
                            Unread Client
                          </span>
                        )}

                        {message.unreadForCoach && (
                          <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-black uppercase text-black">
                            Unread Coach
                          </span>
                        )}

                        <p className="mt-3 text-sm text-white/70">{message.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  All Client Dashboard Activity
                </h3>

                <div className="space-y-3">
                  {savedPlans.map((plan) => (
                    <p
                      key={plan.id}
                      className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/65"
                    >
                      {plan.planName} assigned to {plan.clientName}
                    </p>
                  ))}

                  {conversations.flatMap((conversation) =>
                    conversation.messages.map((message) => (
                      <p
                        key={conversation.clientId + "-" + message.id}
                        className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/65"
                      >
                        {message.sender} message in {conversation.clientName}'s conversation: {message.body}
                      </p>
                    ))
                  )}

                  {workoutLogs.map((log) => (
                    <p
                      key={log.id}
                      className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/65"
                    >
                      {log.clientName} {log.status} {log.dayName} from {log.planName}
                    </p>
                  ))}

                  {savedPlans.length === 0 &&
                    conversations.length === 0 &&
                    workoutLogs.length === 0 && (
                      <p className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/55">
                        Activity will show after plans, messages, or workout logs are created.
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function CoachScreen({ notifications, savedPlans, workoutLogs, selectedWorkoutLogId, setSelectedWorkoutLogId, deleteWorkoutLog, unreadCoachCount, unreadActivityCount, activityFilter, setActivityFilter, markActivityRead, markAllActivityRead }) {
  const filters = ["All", "Unread", "Workouts", "Substitutions", "Notes", "Plans", "Messages", "Email"];
  const filteredNotifications = notifications.filter((notification) => {
    if (activityFilter === "All") return true;
    if (activityFilter === "Unread") return !notification.isRead;
    return notification.type === activityFilter;
  });
  const selectedWorkoutLog = workoutLogs.find((log) => log.id === selectedWorkoutLogId) || workoutLogs[0] || null;

  return (
    <div>
      <SectionHeader eyebrow="Coach Dashboard" title="Command Center" description="A structured coach activity center for workout completions, skipped workouts, changed values, substitutions, client notes, assigned plans, messages, and workout log details." />
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Assigned Plans" value={savedPlans.length} />
        <StatCard label="Workout Logs" value={workoutLogs.length} />
        <StatCard label="Completed" value={workoutLogs.filter((log) => log.status === "completed").length} />
        <StatCard label="Unread Messages" value={unreadCoachCount} />
        <StatCard label="Unread Activity" value={unreadActivityCount} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3"><Bell className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Notification Types</h3></div>
            <div className="space-y-3">
              {["Client completed workout", "Client skipped workout", "Client changed assigned exercise", "Client changed sets, reps, weight, time, or rest", "Client left workout note", "Coach assigned new plan", "Coach sent message", "Client sent message"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white/75"><CheckCircle size={18} className="text-[#00BF63]" />{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-5">
            <div className="flex items-start gap-3"><Inbox className="mt-1 text-[#00BF63]" /><div><h3 className="font-black uppercase">Email Later</h3><p className="mt-1 text-sm leading-6 text-white/65">Personal email notifications should still be added later through a secure notification service. No email is sent from this frontend file.</p></div></div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3"><Activity className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Activity Center</h3></div>
            <button type="button" onClick={markAllActivityRead} className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-4 py-2 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black">Mark All Read</button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button key={filter} type="button" onClick={() => setActivityFilter(filter)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase transition ${activityFilter === filter ? "border-[#00BF63] bg-[#00BF63] text-black" : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"}`}>
                <Filter size={13} />{filter}
              </button>
            ))}
          </div>
          <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
            {filteredNotifications.map((notification) => (
              <div key={notification.id} className={`rounded-2xl border p-4 ${notification.isRead ? "border-white/10 bg-black/40" : "border-[#00BF63]/50 bg-[#00BF63]/10"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2"><ActivityPill label={notification.type} /><ActivityPill label={notification.priority} />{!notification.isRead && <UnreadPill label="Unread Activity" />}</div>
                    <p className="font-black text-white">{notification.title}</p>
                    <p className="mt-1 text-sm text-white/60">{notification.detail}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00BF63]">{notification.time}</p>
                  </div>
                  {!notification.isRead && (
                    <button type="button" onClick={() => markActivityRead(notification.id)} className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"><Eye size={14} />Read</button>
                  )}
                </div>
              </div>
            ))}
            {filteredNotifications.length === 0 && <EmptyState text="No activity matches this filter." />}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-5 flex items-center gap-3"><ClipboardList className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Workout Log Detail View</h3></div>
        {workoutLogs.length === 0 && <EmptyState text="No completed or skipped workouts yet. Use the Tracker tab to create a client workout log." />}
        {workoutLogs.length > 0 && (
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <WorkoutLogList logs={workoutLogs} selectedLogId={selectedWorkoutLog?.id} onSelect={setSelectedWorkoutLogId} />
            <WorkoutLogDetails log={selectedWorkoutLog} onDelete={deleteWorkoutLog} />
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsScreen({ clients, clientForm, setClientForm, addClient, selectedClientProfileId, setSelectedClientProfileId, savedPlans, workoutLogs, conversations, openTrackerForClient, openMessagesForClient, openPlansForClient, updateClientStatus, safeDeleteClient, clientActionNotice }) {
  const selectedClient = clients.find((client) => client.id === selectedClientProfileId) || clients[0];

  return (
    <div>
      <SectionHeader eyebrow="Clients" title="Client Management" description="Create clients locally, update client status, use safe delete, open a detailed client profile, review assigned plans, recent logs, and recent messages." />
      {clientActionNotice && <p className="mb-5 rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 text-sm font-bold text-[#00BF63]">{clientActionNotice}</p>}
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <h3 className="mb-4 text-xl font-black uppercase">Add Client</h3>
            <div className="space-y-3">
              <Input label="Client Name" value={clientForm.name} onChange={(value) => setClientForm((current) => ({ ...current, name: value }))} placeholder="Enter client name" />
              <Input label="Client Email" value={clientForm.email} onChange={(value) => setClientForm((current) => ({ ...current, email: value }))} placeholder="Enter client email" />
              <button type="button" onClick={addClient} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00BF63] px-5 py-3 font-black uppercase text-black transition hover:bg-white"><Plus size={18} />Add Client</button>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <h3 className="mb-4 text-xl font-black uppercase">Client List</h3>
            <div className="space-y-3">
              {clients.map((client) => (
                <button key={client.id} type="button" onClick={() => setSelectedClientProfileId(client.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedClient?.id === client.id ? "border-[#00BF63] bg-[#00BF63]/10" : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"}`}>
                  <p className="text-lg font-black">{client.name}</p>
                  <p className="mt-1 text-sm text-white/55">{client.email}</p>
                  <span className="mt-3 inline-flex rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">{client.status}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <ClientProfileDetails client={selectedClient} savedPlans={savedPlans} workoutLogs={workoutLogs} conversations={conversations} openTrackerForClient={openTrackerForClient} openMessagesForClient={openMessagesForClient} openPlansForClient={openPlansForClient} updateClientStatus={updateClientStatus} />
      </div>
    </div>
  );
}

function ClientProfileDetails({ client, savedPlans, workoutLogs, conversations, openTrackerForClient, openMessagesForClient, openPlansForClient, updateClientStatus, safeDeleteClient }) {
  if (!client) return <EmptyState text="Select a client to view profile details." />;

  const assignedPlans = savedPlans.filter((plan) => plan.clientId === client.id);
  const clientLogs = workoutLogs.filter((log) => log.clientId === client.id);
  const completedLogs = clientLogs.filter((log) => log.status === "completed");
  const skippedLogs = clientLogs.filter((log) => log.status === "skipped");
  const conversation = conversations.find((item) => item.clientId === client.id);
  const messages = conversation?.messages || [];
  const unreadCoach = messages.filter((message) => message.unreadForCoach).length;
  const unreadClient = messages.filter((message) => message.unreadForClient).length;

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Client Profile Detail View</p>
          <h3 className="mt-1 text-3xl font-black uppercase">{client.name}</h3>
          <p className="mt-1 text-sm text-white/60">{client.email}</p>
          <span className="mt-3 inline-flex rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">{client.status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openTrackerForClient(client.id)} className="rounded-full bg-[#00BF63] px-4 py-2 text-xs font-black uppercase text-black transition hover:bg-white">Open Tracker</button>
          <button type="button" onClick={() => openMessagesForClient(client.id)} className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-4 py-2 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black">Open Messages</button>
          <button type="button" onClick={() => openPlansForClient(client.id)} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]">View Plans</button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <Select label="Client Status" value={client.status} onChange={(value) => updateClientStatus(client.id, value)} options={[{ label: "Active", value: "Active" }, { label: "Paused", value: "Paused" }, { label: "Inactive", value: "Inactive" }]} />
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Assigned Plans" value={assignedPlans.length} />
        <StatCard label="Workout Logs" value={clientLogs.length} />
        <StatCard label="Completed" value={completedLogs.length} />
        <StatCard label="Skipped" value={skippedLogs.length} />
        <StatCard label="Coach Unread" value={unreadCoach} />
        <StatCard label="Client Unread" value={unreadClient} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <ProfilePanel title="Assigned Plans">
          {assignedPlans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-black">{plan.planName}</p>
              <p className="mt-1 text-sm text-white/55">Days: {plan.days.length} • Exercises: {plan.days.reduce((total, day) => total + day.exercises.length, 0)}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00BF63]">{plan.createdAt}</p>
            </div>
          ))}
          {assignedPlans.length === 0 && <EmptyState text="No plans assigned to this client yet." />}
        </ProfilePanel>
        <ProfilePanel title="Recent Workout Logs">
          {clientLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{log.dayName}</p><StatusPill status={log.status} /></div>
              <p className="mt-1 text-sm text-white/55">{log.planName}</p>
              {log.skipReason && <p className="mt-2 text-xs font-bold text-yellow-200">Skip Reason: {log.skipReason}</p>}
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/35">{log.submittedAt}</p>
            </div>
          ))}
          {clientLogs.length === 0 && <EmptyState text="No workout logs for this client yet." />}
        </ProfilePanel>
        <ProfilePanel title="Recent Messages">
          {messages.slice(-4).reverse().map((message) => (
            <div key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">{message.sender}</p>{message.unreadForCoach && <UnreadPill label="Unread Coach" />}{message.unreadForClient && <UnreadPill label="Unread Client" />}</div>
              <p className="text-sm leading-6 text-white/70">{message.body}</p>
            </div>
          ))}
          {messages.length === 0 && <EmptyState text="No messages for this client yet." />}
        </ProfilePanel>
      </div>
    </div>
  );
}

function PlansScreen({ clients, planDraft, selectedClient, selectedDay, selectedDayId, setSelectedDayId, updatePlanField, addTrainingDay, updateTrainingDayName, removeTrainingDay, planExerciseSearch, setPlanExerciseSearch, planCategory, setPlanCategory, filteredBuilderExercises, addExerciseToSelectedDay, updatePlanExercise, removePlanExercise, savePlan, resetPlanBuilder, builderMessage, savedPlans, selectedPlanDetailId, setSelectedPlanDetailId, editingPlanId, startEditPlan, duplicateSavedPlan, deleteSavedPlan }) {
  const builderModeLabel = editingPlanId ? "Editing Existing Plan" : "Creating New Plan";
  const builderModeDescription = editingPlanId
    ? "You are editing a saved plan. Make your changes, then click Save Changes. Use Cancel Editing to leave edit mode without saving new changes."
    : "You are building a new workout plan. Choose the client, add training days, add exercises, then click Save New Plan.";

  const totalExercises = planDraft.days.reduce((total, day) => total + day.exercises.length, 0);
  const selectedPlanDetail = savedPlans.find((plan) => plan.id === selectedPlanDetailId) || savedPlans[0] || null;

  return (
    <div>
      <SectionHeader
        eyebrow="Workout Plan Builder"
        title="Workout Builder"
        description="Coach-only workout creator and editor. Choose the client, build the days, add exercises, then save. Existing saved plans can be viewed, edited, copied, or deleted from the saved plan cards."
      />

      <div aria-label="Workout builder quick steps" className="mb-6 grid gap-3 md:grid-cols-4">
        {[
          ["1", "Choose Client", "Select who this plan belongs to before saving."],
          ["2", "Add Days", "Create the training split and name each workout day."],
          ["3", "Add Exercises", "Search, click Add, then edit sets, reps, rest, and notes."],
          ["4", "Save", "Use Save New Plan for a new workout or Save Changes when editing."],
        ].map(([step, title, text]) => (
          <div key={step} className="rounded-2xl border border-white/10 bg-black/45 p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#00BF63] text-sm font-black text-black">
              {step}
            </div>
            <p className="font-black uppercase tracking-wide text-white">{title}</p>
            <p className="mt-1 text-sm font-semibold text-white/60">{text}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3"><ClipboardList className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Plan Setup</h3></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Plan Name" value={planDraft.planName} onChange={(value) => updatePlanField("planName", value)} placeholder="Example: 4 Week Strength Plan" />
              <Select label="Select Client" value={planDraft.clientId} onChange={(value) => updatePlanField("clientId", value)} options={clients.map((client) => ({ label: client.name, value: client.id }))} />
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 md:grid-cols-3"><StatCard label="Selected Client" value={selectedClient?.name || "None"} /><StatCard label="Training Days" value={planDraft.days.length} /><StatCard label="Plan Exercises" value={totalExercises} /></div>
            <div
              aria-label="Workout builder mode"
              className={[
                "mt-4 rounded-3xl border p-4 shadow-xl shadow-black/20",
                editingPlanId
                  ? "border-yellow-400/40 bg-yellow-500/10"
                  : "border-[#00BF63]/35 bg-[#00BF63]/10",
              ].join(" ")}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-white">
                  {builderModeLabel}
                </p>
                {editingPlanId && (
                  <span className="w-fit rounded-full border border-yellow-400/40 bg-yellow-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-200">
                    Editing Active
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">
                {builderModeDescription}
              </p>
              <div className="mt-3 grid gap-2 text-xs leading-5 text-white/65 md:grid-cols-3">
                <p>
                  <span className="font-black text-white">Save:</span> stores the plan currently shown in the builder.
                </p>
                <p>
                  <span className="font-black text-white">Edit:</span> loads a saved plan back into this builder.
                </p>
                <p>
                  <span className="font-black text-white">Delete:</span> removes the saved plan card.
                </p>
              </div>
            </div>

            <div aria-label="Workout builder actions" className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={savePlan}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
              >
                <Save size={17} />
                {editingPlanId ? "Save Changes" : "Save New Plan"}
              </button>
              <button
                type="button"
                onClick={resetPlanBuilder}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                <X size={17} />
                {editingPlanId ? "Cancel Editing" : "Clear Builder"}
              </button>
            </div>
            {builderMessage && <p className="mt-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">{builderMessage}</p>}
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Dumbbell className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Add Exercises</h3></div><button type="button" onClick={addTrainingDay} className="flex items-center gap-2 rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-4 py-2 text-sm font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"><Plus size={16} />Add Day</button></div>
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]"><SearchInput value={planExerciseSearch} onChange={setPlanExerciseSearch} placeholder="Search exercises to add..." /><select value={planCategory} onChange={(event) => setPlanCategory(event.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#00BF63]">{exerciseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
            <ExercisePicker exercises={filteredBuilderExercises} onAdd={addExerciseToSelectedDay} />
          </div>
        </div>

        <div className="space-y-6">
          <TrainingDayBuilder planDraft={planDraft} selectedDay={selectedDay} selectedDayId={selectedDayId} setSelectedDayId={setSelectedDayId} updateTrainingDayName={updateTrainingDayName} removeTrainingDay={removeTrainingDay} updatePlanExercise={updatePlanExercise} removePlanExercise={removePlanExercise} />
          <SavedPlansPanel savedPlans={savedPlans} selectedPlanDetail={selectedPlanDetail} setSelectedPlanDetailId={setSelectedPlanDetailId} startEditPlan={startEditPlan} duplicateSavedPlan={duplicateSavedPlan} deleteSavedPlan={deleteSavedPlan} />
          <PlanDetailView plan={selectedPlanDetail} />
        </div>
      </div>
    </div>
  );
}

function ExercisePicker({ exercises, onAdd }) {
  return (
    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
      {exercises.map((exercise) => (
        <div key={exercise.name} className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <ExerciseSummary exercise={exercise} />
            <button type="button" onClick={() => onAdd(exercise)} className="shrink-0 rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white">Add</button>
          </div>
        </div>
      ))}
      {exercises.length === 0 && <EmptyState text="No exercises match your search." />}
    </div>
  );
}

function ExerciseSummary({ exercise }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">{exercise.categories.map((category) => <CategoryPill key={category}>{category}</CategoryPill>)}</div>
      <h4 className="text-lg font-black">{exercise.name}</h4>
      <p className="mt-1 text-sm text-white/55"><span className="font-bold text-white/80">Muscles:</span> {exercise.muscles}</p>
      <p className="mt-1 text-sm text-white/55"><span className="font-bold text-white/80">Equipment:</span> {exercise.equipment}</p>
    </div>
  );
}

function TrainingDayBuilder({ planDraft, selectedDay, selectedDayId, setSelectedDayId, updateTrainingDayName, removeTrainingDay, updatePlanExercise, removePlanExercise }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-center gap-3"><Activity className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Training Days</h3></div>
      <div className="mb-4 flex flex-wrap gap-2">
        {planDraft.days.map((day) => (
          <button key={day.id} type="button" onClick={() => setSelectedDayId(day.id)} className={`rounded-full border px-4 py-2 text-sm font-black transition ${selectedDayId === day.id ? "border-[#00BF63] bg-[#00BF63] text-black" : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"}`}>{day.name || "Unnamed Day"}</button>
        ))}
      </div>
      {selectedDay && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]"><Input label="Training Day Name" value={selectedDay.name} onChange={(value) => updateTrainingDayName(selectedDay.id, value)} placeholder="Example: Day 1 - Lower Body" /><button type="button" onClick={() => removeTrainingDay(selectedDay.id)} className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black uppercase text-red-300 transition hover:bg-red-500 hover:text-white"><Trash2 size={17} />Remove Day</button></div>
          <div className="space-y-4">
            {selectedDay.exercises.map((exercise, index) => (
              <div key={exercise.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Exercise {index + 1}</p><h4 className="mt-1 text-xl font-black">{exercise.exerciseName}</h4><div className="mt-2 flex flex-wrap gap-2">{exercise.categories.map((category) => <CategoryPill key={category}>{category}</CategoryPill>)}</div><p className="mt-2 text-sm text-white/50">{exercise.muscles} • {exercise.equipment}</p></div>
                  <button type="button" onClick={() => removePlanExercise(selectedDay.id, exercise.id)} className="rounded-full border border-red-500/30 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500 hover:text-white" aria-label="Remove exercise"><Trash2 size={18} /></button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Input label="Sets" value={exercise.sets} onChange={(value) => updatePlanExercise(selectedDay.id, exercise.id, "sets", value)} placeholder="Example: 3" />
                  <Input label="Reps or Time" value={exercise.repsOrTime} onChange={(value) => updatePlanExercise(selectedDay.id, exercise.id, "repsOrTime", value)} placeholder="Example: 8 - 12 or 30 sec" />
                  <Input label="Weight Guidance" value={exercise.weightGuidance} onChange={(value) => updatePlanExercise(selectedDay.id, exercise.id, "weightGuidance", value)} placeholder="Example: RPE 7" />
                  <Input label="Rest Period" value={exercise.rest} onChange={(value) => updatePlanExercise(selectedDay.id, exercise.id, "rest", value)} placeholder="Example: 60 - 90 sec" />
                  <div className="md:col-span-2"><Input label="Coach Notes" value={exercise.notes} onChange={(value) => updatePlanExercise(selectedDay.id, exercise.id, "notes", value)} placeholder="Tempo, form cue, substitution note, etc." /></div>
                </div>
              </div>
            ))}
            {selectedDay.exercises.length === 0 && <EmptyState text="No exercises added to this training day yet. Search the library and click Add." />}
          </div>
        </div>
      )}
    </div>
  );
}

function SavedPlansPanel({ savedPlans, selectedPlanDetail, setSelectedPlanDetailId, startEditPlan, duplicateSavedPlan, deleteSavedPlan }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <h3 className="mb-4 text-xl font-black uppercase">Saved Local Plans</h3>
      <div className="space-y-3">
        {savedPlans.map((plan) => (
          <div key={plan.id} className={`rounded-2xl border p-4 transition ${selectedPlanDetail?.id === plan.id ? "border-[#00BF63] bg-[#00BF63]/10" : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"}`}>
            <button type="button" onClick={() => setSelectedPlanDetailId(plan.id)} aria-label={`Select Plan ${plan.planName}`} className="w-full text-left">
              <p className="text-lg font-black">{plan.planName}</p>
              <p className="mt-1 text-sm text-white/60">Client: {plan.clientName}</p>
              <p className="mt-1 text-sm text-white/60">Days: {plan.days.length} • Exercises: {plan.days.reduce((total, day) => total + day.exercises.length, 0)}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00BF63]">Created: {plan.createdAt}</p>
              {plan.updatedAt && <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">Updated: {plan.updatedAt}</p>}
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => startEditPlan(plan.id)} className="flex items-center gap-2 rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-3 py-2 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"><ClipboardList size={14} />Edit This Plan</button>
              <button type="button" onClick={() => duplicateSavedPlan(plan.id)} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"><Copy size={14} />Copy Plan</button>
              <button type="button" onClick={() => deleteSavedPlan(plan.id)} className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-300 transition hover:bg-red-500 hover:text-white"><Trash2 size={14} />Delete Plan</button>
            </div>
          </div>
        ))}
        {savedPlans.length === 0 && <EmptyState text="No saved plans yet. Build one and save it locally." />}
      </div>
    </div>
  );
}

function PlanDetailView({ plan }) {
  if (!plan) return <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"><h3 className="mb-4 text-xl font-black uppercase">Plan Detail View</h3><EmptyState text="Save a plan to view plan details." /></div>;
  const exerciseCount = plan.days.reduce((total, day) => total + day.exercises.length, 0);
  return (
    <div className="rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-5">
      <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Plan Detail View</p><h3 className="mt-1 text-2xl font-black uppercase">{plan.planName}</h3><p className="mt-1 text-sm text-white/65">Assigned to {plan.clientName}</p>{plan.updatedAt && <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-yellow-200">Updated {plan.updatedAt}</p>}</div>
      <div className="mb-5 grid gap-3 md:grid-cols-3"><MiniProgram label="Assigned Client" value={plan.clientName} /><MiniProgram label="Training Days" value={plan.days.length} /><MiniProgram label="Exercises" value={exerciseCount} /></div>
      <div className="space-y-4">
        {plan.days.map((day) => (
          <div key={day.id} className="rounded-2xl border border-white/10 bg-black/50 p-4">
            <h4 className="text-lg font-black uppercase">{day.name}</h4>
            <div className="mt-3 space-y-3">
              {day.exercises.map((exercise, index) => (
                <div key={exercise.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">Exercise {index + 1}</p>
                  <h5 className="mt-1 text-lg font-black">{exercise.exerciseName}</h5>
                  <div className="mt-3 grid gap-3 md:grid-cols-4"><MiniProgram label="Sets" value={exercise.sets} /><MiniProgram label="Reps or Time" value={exercise.repsOrTime} /><MiniProgram label="Weight Guidance" value={exercise.weightGuidance} /><MiniProgram label="Rest Period" value={exercise.rest} /></div>
                  {exercise.notes && <p className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white/70"><span className="font-black text-white">Coach Notes:</span> {exercise.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackerScreen({ clients, savedPlans, trackerClientId, setTrackerClientId, selectedTrackerPlanId, setSelectedTrackerPlanId, selectedTrackerDayId, setSelectedTrackerDayId, trackingDrafts, updateTrackingDraft, markWorkoutStatus, trackerMessage, workoutLogs, selectedWorkoutLogId, setSelectedWorkoutLogId, setActiveTab, skipReason, setSkipReason, deleteWorkoutLog }) {
  const assignedPlans = savedPlans.filter((plan) => plan.clientId === trackerClientId);
  const selectedPlan = assignedPlans.find((plan) => plan.id === selectedTrackerPlanId) || assignedPlans[0] || null;
  const selectedDay = selectedPlan?.days.find((day) => day.id === selectedTrackerDayId) || selectedPlan?.days[0] || null;
  const selectedClient = clients.find((client) => client.id === trackerClientId);
  const clientLogs = workoutLogs.filter((log) => log.clientId === trackerClientId);

  return (
    <div>
      <SectionHeader eyebrow="Client Workout Tracker" title="Log The Work" description="Open an assigned plan and let the client enter actual weight, sets, reps, time, rest, substitutions, notes, and skipped workout reasons." />
      {savedPlans.length === 0 && <NoPlanNotice setActiveTab={setActiveTab} />}
      {savedPlans.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center gap-3"><Users className="text-[#00BF63]" /><h3 className="text-xl font-black uppercase">Tracker Setup</h3></div>
              <div className="space-y-4">
                <Select label="Client" value={trackerClientId} onChange={(value) => { setTrackerClientId(value); setSelectedTrackerPlanId(""); setSelectedTrackerDayId(""); }} options={clients.map((client) => ({ label: client.name, value: client.id }))} />
                <Select label="Assigned Plan" value={selectedPlan?.id || ""} onChange={(value) => { setSelectedTrackerPlanId(value); setSelectedTrackerDayId(""); }} options={assignedPlans.length > 0 ? assignedPlans.map((plan) => ({ label: plan.planName, value: plan.id })) : [{ label: "No plans assigned", value: "" }]} />
                <div className="rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Selected Client</p><p className="mt-2 text-2xl font-black">{selectedClient?.name || "No client selected"}</p><p className="mt-1 text-sm text-white/60">Assigned plans: {assignedPlans.length}</p></div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 text-xl font-black uppercase">Training Days</h3>
              {selectedPlan && <div className="flex flex-wrap gap-2">{selectedPlan.days.map((day) => <button key={day.id} type="button" onClick={() => setSelectedTrackerDayId(day.id)} className={`rounded-full border px-4 py-2 text-sm font-black transition ${selectedDay?.id === day.id ? "border-[#00BF63] bg-[#00BF63] text-black" : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"}`}>{day.name}</button>)}</div>}
              {!selectedPlan && <EmptyState text="This client does not have a saved plan assigned yet." />}
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 text-xl font-black uppercase">Recent Client Logs</h3>
              <WorkoutLogList logs={clientLogs.slice(0, 6)} selectedLogId={selectedWorkoutLogId} onSelect={setSelectedWorkoutLogId} onDelete={deleteWorkoutLog} />
              {clientLogs.length === 0 && <EmptyState text="No workout logs for this client yet." />}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Active Workout</p><h3 className="mt-1 text-2xl font-black uppercase">{selectedDay?.name || "No Day Selected"}</h3><p className="mt-1 text-sm text-white/60">{selectedPlan?.planName || "Select an assigned plan"}</p></div>
              {selectedPlan && selectedDay && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => markWorkoutStatus(selectedPlan, selectedDay, "completed")} className="rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white">Mark Complete</button><button type="button" onClick={() => markWorkoutStatus(selectedPlan, selectedDay, "skipped")} className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-black uppercase text-yellow-200 transition hover:bg-yellow-500 hover:text-black">Mark Skipped</button></div>}
            </div>
            {trackerMessage && <p className="mb-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">{trackerMessage}</p>}
            {selectedPlan && selectedDay && <ActiveWorkoutForm selectedPlan={selectedPlan} selectedDay={selectedDay} trackingDrafts={trackingDrafts} updateTrackingDraft={updateTrackingDraft} skipReason={skipReason} setSkipReason={setSkipReason} />}
            {!selectedPlan && <EmptyState text="Select a client with an assigned plan." />}
          </div>
        </div>
      )}
    </div>
  );
}

function NoPlanNotice({ setActiveTab }) {
  return (
    <div className="rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-6">
      <h3 className="text-xl font-black uppercase">No Assigned Plans Yet</h3>
      <p className="mt-2 text-sm leading-6 text-white/65">Build and save a workout plan first. Once saved, it will appear here for the selected client.</p>
      <button type="button" onClick={() => setActiveTab("Plans")} className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white">Build A Plan</button>
    </div>
  );
}

function ActiveWorkoutForm({ selectedPlan, selectedDay, trackingDrafts, updateTrackingDraft, skipReason, setSkipReason }) {
  return (
    <div className="space-y-4">
      <Input label="Skip Reason" value={skipReason} onChange={setSkipReason} placeholder="Optional: reason if this workout is marked skipped" />
      {selectedDay.exercises.map((exercise, index) => {
        const key = getTrackingKey(selectedPlan.id, selectedDay.id, exercise.id);
        const draft = trackingDrafts[key] || emptyTrackingEntry;
        const update = (field, value) => updateTrackingDraft(selectedPlan.id, selectedDay.id, exercise.id, field, value);
        return (
          <div key={exercise.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Exercise {index + 1}</p><h4 className="mt-1 text-xl font-black">{exercise.exerciseName}</h4><p className="mt-1 text-sm text-white/50">{exercise.muscles} • {exercise.equipment}</p></div>
            <div className="mb-4 grid gap-3 md:grid-cols-4"><MiniProgram label="Assigned Sets" value={exercise.sets} /><MiniProgram label="Assigned Reps/Time" value={exercise.repsOrTime} /><MiniProgram label="Weight Guidance" value={exercise.weightGuidance} /><MiniProgram label="Assigned Rest" value={exercise.rest} /></div>
            {exercise.notes && <div className="mb-4 rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">Coach Notes</p><p className="mt-1 text-sm text-white/70">{exercise.notes}</p></div>}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Input label="Actual Weight Used" value={draft.actualWeight} onChange={(value) => update("actualWeight", value)} placeholder="Example: 185 lb" />
              <Input label="Sets Completed" value={draft.setsCompleted} onChange={(value) => update("setsCompleted", value)} placeholder="Example: 3" />
              <Input label="Reps Completed" value={draft.repsCompleted} onChange={(value) => update("repsCompleted", value)} placeholder="Example: 10, 9, 8" />
              <Input label="Time Completed" value={draft.timeCompleted} onChange={(value) => update("timeCompleted", value)} placeholder="Example: 30 sec" />
              <Input label="Actual Rest Used" value={draft.restUsed} onChange={(value) => update("restUsed", value)} placeholder="Example: 90 sec" />
              <Input label="Exercise Substitution" value={draft.substitution} onChange={(value) => update("substitution", value)} placeholder="Example: DB press instead" />
              <div className="md:col-span-2 xl:col-span-3"><TextArea label="Client Notes" value={draft.notes} onChange={(value) => update("notes", value)} placeholder="Pain, difficulty, form notes, energy level, or anything coach should know..." /></div>
            </div>
          </div>
        );
      })}
      {selectedDay.exercises.length === 0 && <EmptyState text="This training day has no exercises." />}
    </div>
  );
}

function MessagesScreen({
  clients,
  conversations,
  selectedConversationId,
  selectConversation,
  messageSender,
  setMessageSender,
  messageDraft,
  setMessageDraft,
  sendMessage,
  markCoachMessagesRead,
  markClientMessagesRead,
  messageNotice,
  unreadCoachCount,
  unreadClientCount,
}) {
  const [messageSearch, setMessageSearch] = useState("");

  const normalizedMessageSearch = messageSearch.trim().toLowerCase();

  const conversationMatchesSearch = (conversation) => {
    if (!normalizedMessageSearch) return true;

    const client = clients.find((item) => item.id === conversation.clientId);

    const searchableText = [
      conversation.clientName,
      client?.email,
      ...conversation.messages.flatMap((message) => [
        message.sender,
        message.body,
        message.sentAt,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedMessageSearch);
  };

  const filteredConversations = conversations.filter(conversationMatchesSearch);

  const selectedConversation =
    conversations.find((conversation) => conversation.clientId === selectedConversationId) ||
    filteredConversations[0] ||
    conversations[0];

  const selectedClient = clients.find((client) => client.id === selectedConversation?.clientId);

  const visibleMessages = selectedConversation
    ? selectedConversation.messages.filter((message) => {
        if (!normalizedMessageSearch) return true;

        return [message.sender, message.body, message.sentAt]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedMessageSearch));
      })
    : [];

  const messagesToShow =
    normalizedMessageSearch && visibleMessages.length > 0
      ? visibleMessages
      : selectedConversation?.messages || [];

  return (
    <div>
      <SectionHeader
        eyebrow="Messages"
        title="Coach/Client Messaging"
        description="Search conversations and message text while keeping unread indicators saved locally."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Conversations" value={conversations.length} />
        <StatCard label="Coach Unread" value={unreadCoachCount} />
        <StatCard label="Client Unread" value={unreadClientCount} />
      </div>

      <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/55">
            Search Conversations
          </span>
          <input
            value={messageSearch}
            onChange={(event) => setMessageSearch(event.target.value)}
            placeholder="Search by client, email, sender, or message text..."
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div
          data-testid="message-conversation-list"
          className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#00BF63]" />
            <h3 className="text-xl font-black uppercase">Conversation List</h3>
          </div>

          <div className="space-y-3">
            {filteredConversations.map((conversation) => {
              const coachUnread = conversation.messages.filter((message) => message.unreadForCoach).length;
              const clientUnread = conversation.messages.filter((message) => message.unreadForClient).length;
              const lastMessage = conversation.messages[conversation.messages.length - 1];

              return (
                <button
                  key={conversation.clientId}
                  type="button"
                  onClick={() => selectConversation(conversation.clientId)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedConversation?.clientId === conversation.clientId
                      ? "border-[#00BF63] bg-[#00BF63]/10"
                      : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-black">{conversation.clientName}</p>
                    <div className="flex flex-wrap gap-2">
                      {coachUnread > 0 && <UnreadPill label={`Coach ${coachUnread}`} />}
                      {clientUnread > 0 && <UnreadPill label={`Client ${clientUnread}`} />}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-white/55">
                    {lastMessage ? `${lastMessage.sender}: ${lastMessage.body}` : "No messages yet."}
                  </p>
                </button>
              );
            })}

            {filteredConversations.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/55">
                No conversations match that search.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          {selectedConversation ? (
            <>
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                    Active Thread
                  </p>
                  <h3 className="mt-1 text-2xl font-black uppercase">
                    {selectedConversation.clientName}
                  </h3>
                  <p className="mt-1 text-sm text-white/55">
                    {selectedClient?.email || "No email added"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => markCoachMessagesRead(selectedConversation.clientId)}
                    className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-4 py-2 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
                  >
                    Mark Coach Read
                  </button>
                  <button
                    type="button"
                    onClick={() => markClientMessagesRead(selectedConversation.clientId)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    Mark Client Read
                  </button>
                </div>
              </div>

              {messageNotice && (
                <p className="mb-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">
                  {messageNotice}
                </p>
              )}

              <div className="mb-5 max-h-[520px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4">
                {messagesToShow.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl border p-4 ${
                      message.sender === "Coach"
                        ? "border-[#00BF63]/30 bg-[#00BF63]/10"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black uppercase text-white">
                        {message.sender}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.unreadForCoach && <UnreadPill label="Coach" />}
                        {message.unreadForClient && <UnreadPill label="Client" />}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-white/70">{message.body}</p>
                    <p className="mt-2 text-xs text-white/40">{message.sentAt}</p>
                  </div>
                ))}

                {messagesToShow.length === 0 && (
                  <EmptyState text="No messages in this conversation match that search." />
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-3 grid gap-3 md:grid-cols-[220px_1fr]">
                  <Select
                    label="Send As"
                    value={messageSender}
                    onChange={setMessageSender}
                    options={[
                      { label: "Coach", value: "Coach" },
                      { label: "Client", value: "Client" },
                    ]}
                  />
                  <TextArea
                    label="Message"
                    value={messageDraft}
                    onChange={setMessageDraft}
                    placeholder="Type a coach/client message..."
                  />
                </div>
                <button
                  type="button"
                  onClick={sendMessage}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00BF63] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
                > Send Message
                </button>
              </div>
            </>
          ) : (
            <EmptyState text="Select a conversation to start messaging." />
          )}
        </div>
      </div>
    </div>
  );
}

function ExercisesScreen({ librarySearch, setLibrarySearch, libraryCategory, setLibraryCategory, filteredLibraryExercises, totalExerciseCount }) {
  const categoryCount = libraryCategory === "All" ? totalExerciseCount : filteredLibraryExercises.length;
  return (
    <div>
      <SectionHeader eyebrow="Exercise Library" title="General Exercise Database" description="Search movements by exercise, muscle group, category, or equipment. Use this client-safe view for safe substitutions and exercise notes without changing your assigned plan." />
      <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]"><SearchInput value={librarySearch} onChange={setLibrarySearch} placeholder="Search exercises, muscle groups, equipment, or substitutions..." /><div className="flex flex-wrap gap-2">{exerciseCategories.map((category) => <button key={category} type="button" onClick={() => setLibraryCategory(category)} className={`rounded-full border px-4 py-2 text-sm font-black transition ${libraryCategory === category ? "border-[#00BF63] bg-[#00BF63] text-black" : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"}`}>{category}</button>)}</div></div>
        <p className="mt-4 text-sm font-bold text-white/60">Showing {filteredLibraryExercises.length} exercise(s). Total library: {totalExerciseCount}. Current category count: {categoryCount}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredLibraryExercises.map((exercise) => <ExerciseCard key={exercise.name} exercise={exercise} />)}</div>
      {filteredLibraryExercises.length === 0 && <EmptyState text="No exercises match your search." />}
    </div>
  );
}

function ProgressScreen({
  savedPlans,
  workoutLogs,
  selectedWorkoutLogId,
  setSelectedWorkoutLogId,
  deleteWorkoutLog,
}) {
  const completedLogs = workoutLogs.filter((log) => log.status === "completed");
  const skippedLogs = workoutLogs.filter((log) => log.status === "skipped");

  const selectedWorkoutLog =
    workoutLogs.find((log) => log.id === selectedWorkoutLogId) ||
    workoutLogs[0] ||
    null;

  const trackedEntries = workoutLogs.flatMap((log) =>
    (log.entries || []).map((entry) => ({
      ...entry,
      logId: log.id,
      clientName: log.clientName,
      planName: log.planName,
      dayName: log.dayName,
      status: log.status,
      submittedAt: log.submittedAt,
      timestamp: log.timestamp || 0,
    }))
  );

  const substitutions = trackedEntries.filter((entry) => entry.substitution);
  const notes = trackedEntries.filter((entry) => entry.notes);

  const completionRate =
    workoutLogs.length === 0
      ? 0
      : Math.round((completedLogs.length / workoutLogs.length) * 100);

  const clientNames = Array.from(
    new Set([
      ...savedPlans.map((plan) => plan.clientName),
      ...workoutLogs.map((log) => log.clientName),
    ])
  ).filter(Boolean);

  const clientStats = clientNames.map((clientName) => {
    const clientPlans = savedPlans.filter((plan) => plan.clientName === clientName);
    const clientLogs = workoutLogs.filter((log) => log.clientName === clientName);
    const clientCompleted = clientLogs.filter((log) => log.status === "completed");
    const clientSkipped = clientLogs.filter((log) => log.status === "skipped");

    const rate =
      clientLogs.length === 0
        ? 0
        : Math.round((clientCompleted.length / clientLogs.length) * 100);

    return {
      clientName,
      plans: clientPlans.length,
      logs: clientLogs.length,
      completed: clientCompleted.length,
      skipped: clientSkipped.length,
      rate,
    };
  });

  const recentExerciseHistory = [...trackedEntries].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  return (
    <div>
      <SectionHeader
        eyebrow="Progress"
        title="Tracking Comes Next"
        description="This screen now summarizes progress, client consistency, exercise history, completed workouts, skipped workouts, substitutions, and detailed workout logs."
      />

      <div className="mb-6 rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
          Frontend Step 1 Complete
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase text-white">
          Progress Dashboard
        </h3>
        <p className="mt-2 text-sm font-bold leading-6 text-white/65">
          Local React state and localStorage are still powering this screen. Server progress tables can come later after the frontend is stable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Saved Plans" value={savedPlans.length} />
        <StatCard label="Workout Logs" value={workoutLogs.length} />
        <StatCard label="Completed" value={completedLogs.length} />
        <StatCard label="Skipped" value={skippedLogs.length} />
        <StatCard label="Completion Rate" value={String(completionRate) + "%"} />
        <StatCard label="Substitutions" value={substitutions.length} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black uppercase">Progress Summary</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Workout notes logged
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {notes.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Exercise entries tracked
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {trackedEntries.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Completed sessions
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {completedLogs.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Skipped sessions
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {skippedLogs.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black uppercase">Client Consistency Stats</h3>

          {clientStats.length === 0 ? (
            <div className="mt-4">
              <EmptyState text="Create clients, assign plans, and log workouts to see consistency stats." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {clientStats.map((client) => (
                <div
                  key={client.clientName}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black uppercase">{client.clientName}</p>
                      <p className="mt-1 text-sm text-white/55">
                        {client.plans} plan(s) / {client.logs} workout log(s)
                      </p>
                    </div>

                    <span className="rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase text-[#00BF63]">
                      {client.rate}% complete
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-black uppercase text-white/40">Completed</p>
                      <p className="mt-1 text-lg font-black text-white">{client.completed}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-black uppercase text-white/40">Skipped</p>
                      <p className="mt-1 text-lg font-black text-white">{client.skipped}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-black uppercase text-white/40">Plans</p>
                      <p className="mt-1 text-lg font-black text-white">{client.plans}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-xl font-black uppercase">Exercise History</h3>

        {recentExerciseHistory.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="Exercise history will show after a client completes or skips a workout." />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {recentExerciseHistory.slice(0, 10).map((entry, index) => (
              <div
                key={entry.logId + "-" + entry.exerciseId + "-" + index}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black uppercase">{entry.exerciseName}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {entry.clientName} / {entry.planName} / {entry.dayName}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-white/70">
                    {entry.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
                  <p>Actual Weight Used: {entry.actualWeight || "N/A"}</p>
                  <p>Sets Completed: {entry.setsCompleted || "N/A"}</p>
                  <p>Reps Completed: {entry.repsCompleted || "N/A"}</p>
                  <p>Time Completed: {entry.timeCompleted || "N/A"}</p>
                  <p>Actual Rest Used: {entry.restUsed || "N/A"}</p>
                  <p>Submitted: {entry.submittedAt || "N/A"}</p>
                </div>

                {entry.substitution && (
                  <p className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">
                    Exercise Substitution: {entry.substitution}
                  </p>
                )}

                {entry.notes && (
                  <p className="mt-3 rounded-xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3 text-sm font-bold text-[#00BF63]">
                    Client Notes: {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black uppercase">Recent Workout Logs</h3>

          <div className="mt-4">
            <WorkoutLogList
              logs={workoutLogs.slice(0, 8)}
              selectedLogId={selectedWorkoutLog?.id}
              onSelect={setSelectedWorkoutLogId}
              onDelete={deleteWorkoutLog}
            />

            {workoutLogs.length === 0 && (
              <EmptyState text="No workout logs yet. Complete or skip a workout in the Tracker tab." />
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-black uppercase">Workout Log Details</h3>
          <WorkoutLogDetails log={selectedWorkoutLog} onDelete={deleteWorkoutLog} />
        </div>
      </div>
    </div>
  );
}


function ServerSyncPanel() {
  return null;
}

function LoginScreen(props = {}) {
  const { onPortalLogin, onPortalLogout } = props;
  const [coachEmail, setCoachEmail] = useState("coach@nolimittest.com");
  const [coachPassword, setCoachPassword] = useState("");
  const [clientEmail, setClientEmail] = useState("client@nolimittest.com");
  const [clientPassword, setClientPassword] = useState("");
  const [accountStatus, setAccountStatus] = useState(
    "Choose coach or client access to open the right portal."
  );

  function handleCheckStatus() {
    setAccountStatus("Account access is ready.");
  }

  function handlePortalLogin(event, loginType) {
    event.preventDefault();

    const isCoach = loginType === "coach";
    const email = isCoach ? coachEmail : clientEmail;
    const password = isCoach ? coachPassword : clientPassword;

    if (!email) {
      setAccountStatus("Enter the " + loginType + " email first.");
      return;
    }

    if (!password) {
      setAccountStatus("Enter the " + loginType + " password first.");
      return;
    }

    if (onPortalLogin) {
      onPortalLogin({
        email,
        full_name: isCoach ? "Coach" : "Client",
        role: loginType,
      });
    }

    setAccountStatus((isCoach ? "Coach" : "Client") + " access opened.");
  }

  function handleSignOut() {
    if (onPortalLogout) {
      onPortalLogout();
    }

    setAccountStatus("Signed out.");
  }

  return (
    <section className="rounded-[2rem] border border-[#00BF63]/25 bg-black/70 p-6 shadow-2xl shadow-black/30">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00BF63]">
        Login
      </p>

      <h1 className="mt-3 text-3xl font-black text-white">
        Account Access
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
        Sign in as a coach or client to open the right portal.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCheckStatus}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
        >
          Check Login Status
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-red-400 hover:text-red-300"
        >
          Sign Out
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
          Account Status
        </p>
        <p className="mt-2 text-sm font-bold text-white/75">{accountStatus}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(event) => handlePortalLogin(event, "coach")}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h3 className="text-xl font-black text-white">Coach Login</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Open coach tools for assigning clients, editing plans, reviewing progress, and messaging.
          </p>

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Coach Email
            <input
              value={coachEmail}
              onChange={(event) => setCoachEmail(event.target.value)}
              placeholder="coach@email.com"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
            />
          </label>

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Coach Password
            <input
              type="password"
              value={coachPassword}
              onChange={(event) => setCoachPassword(event.target.value)}
              placeholder="Enter coach password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
            />
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#00d36f]"
          >
            Coach Login
          </button>
        </form>

        <form
          onSubmit={(event) => handlePortalLogin(event, "client")}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
        >
          <h3 className="text-xl font-black text-white">Client Login</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Open the client portal for viewing the plan, logging workouts, checking progress, and messaging coach.
          </p>

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Client Email
            <input
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="client@email.com"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
            />
          </label>

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Client Password
            <input
              type="password"
              value={clientPassword}
              onChange={(event) => setClientPassword(event.target.value)}
              placeholder="Enter client password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
            />
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#00d36f]"
          >
            Client Login
          </button>
        </form>
      </div>
    </section>
  );
}

function WorkoutLogList({ logs, selectedLogId, onSelect, onDelete }) {
  return (
    <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
      {logs.map((log) => (
        <div key={log.id} className={`rounded-2xl border p-4 transition ${selectedLogId === log.id ? "border-[#00BF63] bg-[#00BF63]/10" : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"}`}>
          <button type="button" onClick={() => onSelect(log.id)} className="w-full text-left">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{log.clientName || log.dayName}</p><StatusPill status={log.status} /></div>
            <p className="mt-1 text-sm font-bold text-white/75">{log.dayName}</p>
            <p className="mt-1 text-sm text-white/55">{log.planName}</p>
            {log.skipReason && <p className="mt-2 text-xs font-bold text-yellow-200">Skip Reason: {log.skipReason}</p>}
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-white/35">{log.submittedAt}</p>
          </button>
          {onDelete && <button type="button" onClick={() => onDelete(log.id)} className="mt-3 flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-300 transition hover:bg-red-500 hover:text-white"><Trash2 size={14} />Delete Workout Log</button>}
        </div>
      ))}
    </div>
  );
}

function WorkoutLogDetails({ log, onDelete }) {
  if (!log) return <EmptyState text="Select a workout log to view details." />;

  return (
    <div className="rounded-2xl border border-[#00BF63]/30 bg-black/50 p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Selected Workout</p><h4 className="mt-1 text-2xl font-black uppercase">{log.dayName}</h4><p className="mt-1 text-sm text-white/60">{log.planName}</p></div>
        <div className="flex flex-wrap gap-2"><StatusPill status={log.status} />{onDelete && <button type="button" onClick={() => onDelete(log.id)} className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase text-red-300 transition hover:bg-red-500 hover:text-white">Delete Workout Log</button>}</div>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MiniProgram label="Client" value={log.clientName} /><MiniProgram label="Plan" value={log.planName} /><MiniProgram label="Training Day" value={log.dayName} /><MiniProgram label="Submitted" value={log.submittedAt} /></div>
      {log.skipReason && <div className="mb-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-200">Skip Reason</p><p className="mt-2 text-sm font-bold text-white">{log.skipReason}</p></div>}
      <div className="space-y-4">
        {log.entries.map((entry, index) => (
          <div key={`${entry.exerciseId}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Exercise {index + 1}</p><h5 className="mt-1 text-xl font-black">{entry.exerciseName}</h5></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MiniProgram label="Assigned Sets" value={entry.assignedSets} /><MiniProgram label="Assigned Reps/Time" value={entry.assignedRepsOrTime} /><MiniProgram label="Weight Guidance" value={entry.assignedWeightGuidance} /><MiniProgram label="Assigned Rest" value={entry.assignedRest} /><MiniProgram label="Actual Weight Used" value={entry.actualWeight || "Not entered"} /><MiniProgram label="Sets Completed" value={entry.setsCompleted || "Not entered"} /><MiniProgram label="Reps Completed" value={entry.repsCompleted || "Not entered"} /><MiniProgram label="Time Completed" value={entry.timeCompleted || "Not entered"} /><MiniProgram label="Actual Rest Used" value={entry.restUsed || "Not entered"} /><MiniProgram label="Exercise Substitution" value={entry.substitution || "No substitution"} /></div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Client Notes</p><p className="mt-2 text-sm leading-6 text-white/70">{entry.notes || "No client notes added."}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isCoach = message.sender === "Coach";
  return (
    <div className={`flex ${isCoach ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl border p-4 ${isCoach ? "border-[#00BF63]/40 bg-[#00BF63]/15" : "border-white/10 bg-white/[0.04]"}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">{message.sender}</p>{message.unreadForCoach && <UnreadPill label="Unread Coach" />}{message.unreadForClient && <UnreadPill label="Unread Client" />}</div>
        <p className="text-sm leading-6 text-white/80">{message.body}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-white/35">{message.sentAt}</p>
      </div>
    </div>
  );
}

function ExerciseCard({ exercise }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#00BF63]/60 hover:bg-[#00BF63]/10">
      <div className="mb-3 flex flex-wrap gap-2">{exercise.categories.map((category) => <CategoryPill key={category}>{category}</CategoryPill>)}</div>
      <h3 className="text-2xl font-black">{exercise.name}</h3>
      <div className="mt-4 space-y-2 text-sm text-white/65"><p><span className="font-black text-white">Muscles worked:</span> {exercise.muscles}</p><p><span className="font-black text-white">Equipment:</span> {exercise.equipment}</p></div>
    </div>
  );
}

function ProfilePanel({ title, children }) {
  return <div className="rounded-2xl border border-white/10 bg-black/40 p-4"><h4 className="mb-3 text-lg font-black uppercase">{title}</h4><div className="space-y-3">{children}</div></div>;
}

function SectionHeader({ eyebrow, title, description }) {
  return <div className="mb-6"><p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-[#00BF63]">{eyebrow}</p><h2 className="text-3xl font-black uppercase tracking-tight md:text-5xl">{title}</h2>{description && <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65 md:text-base">{description}</p>}</div>;
}

function StatCard({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">{label}</p><p className="mt-2 text-3xl font-black text-[#00BF63]">{value}</p></div>;
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-white/45">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]" /></label>;
}

function TextArea({ label, value, onChange, placeholder }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-white/45">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]" /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-white/45">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#00BF63]">{options.map((option) => <option key={`${option.label}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function SearchInput({ value, onChange, placeholder }) {
  return <div className="relative"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-white/10 bg-black py-3 pl-11 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]" /></div>;
}

function CategoryPill({ children }) {
  return <span className="rounded-full border border-[#00BF63]/30 bg-[#00BF63]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">{children}</span>;
}

function ActivityPill({ label }) {
  return <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/60">{label}</span>;
}

function UnreadPill({ label }) {
  return <span className="rounded-full bg-[#00BF63] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black">{label}</span>;
}

function StatusPill({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${status === "completed" ? "bg-[#00BF63]/15 text-[#00BF63]" : "bg-yellow-500/15 text-yellow-300"}`}>{status}</span>;
}

function MiniProgram({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">{label}</p><p className="mt-2 text-sm font-black text-white">{value || "—"}</p></div>;
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm font-bold text-white/45">{text}</div>;
}

// Bundle 2C update complete marker

