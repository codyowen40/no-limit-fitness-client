
// NLF_COACH_REVIEW_QUEUE_BRIDGE
const NLF_COACH_REVIEW_QUEUE_KEY = "no-limit-fitness-coach-review-queue-v1";
const NLF_APPROVED_CLIENT_PLAN_KEY = "no-limit-fitness-approved-client-plan-v1";

function nlfSafeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function nlfGetCoachReviewQueue() {
  if (typeof window === "undefined") return [];

  const parsed = nlfSafeJsonParse(
    window.localStorage.getItem(NLF_COACH_REVIEW_QUEUE_KEY),
    []
  );

  return Array.isArray(parsed) ? parsed : [];
}

function nlfSetCoachReviewQueue(queue) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(NLF_COACH_REVIEW_QUEUE_KEY, JSON.stringify(queue));
}

function nlfGetApprovedClientPlans() {
  if (typeof window === "undefined") return [];

  const parsed = nlfSafeJsonParse(
    window.localStorage.getItem(NLF_APPROVED_CLIENT_PLAN_KEY),
    []
  );

  return Array.isArray(parsed) ? parsed : [];
}

function nlfSetApprovedClientPlans(plans) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(NLF_APPROVED_CLIENT_PLAN_KEY, JSON.stringify(plans));
}

function nlfIsVisibleElement(element) {
  if (!element) return false;

  const box = element.getBoundingClientRect();

  return box.width > 0 && box.height > 0;
}

function nlfGetCurrentPortalMode() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  return (
    params.get("portalMode") ||
    document.body?.dataset?.portalMode ||
    window.localStorage.getItem("no-limit-fitness-portal-mode-v1") ||
    ""
  ).toLowerCase();
}

function nlfCaptureClientWorkoutDraft() {
  if (typeof window === "undefined") return;

  const fields = Array.from(document.querySelectorAll("input, textarea"))
    .filter(nlfIsVisibleElement)
    .map((element) => String(element.value || "").trim())
    .filter(Boolean);

  const title =
    fields.find((value) => /draft|plan|strength|workout|squat|bench|deadlift/i.test(value)) ||
    fields[0] ||
    "Client Workout Draft";

  const notes = fields
    .filter((value) => value !== title)
    .join("\n\n")
    .trim();

  const queue = nlfGetCoachReviewQueue();
  const existingIndex = queue.findIndex((item) => item.title === title);

  const draft = {
    id:
      existingIndex >= 0
        ? queue[existingIndex].id
        : "client-draft-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    title,
    notes,
    clientName: "Sample Client",
    status: "pending",
    createdAt: existingIndex >= 0 ? queue[existingIndex].createdAt : Date.now(),
    updatedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = {
      ...queue[existingIndex],
      ...draft,
      status: queue[existingIndex].status === "approved" ? "approved" : "pending",
    };
  } else {
    queue.unshift(draft);
  }

  nlfSetCoachReviewQueue(queue);
  nlfNotifyCoachReviewQueueChanged();
}

function nlfApproveClientWorkoutDraft(draftId) {
  const queue = nlfGetCoachReviewQueue();
  const draft = queue.find((item) => item.id === draftId);

  if (!draft) return;

  const approvedDraft = {
    ...draft,
    status: "approved",
    approvedAt: Date.now(),
  };

  const nextQueue = queue.filter((item) => item.id !== draftId);

  const approvedPlans = nlfGetApprovedClientPlans().filter(
    (item) => item.title !== approvedDraft.title
  );

  approvedPlans.unshift(approvedDraft);

  nlfSetCoachReviewQueue(nextQueue);
  nlfSetApprovedClientPlans(approvedPlans);
  nlfNotifyCoachReviewQueueChanged();
}


function nlfNotifyCoachReviewQueueChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("nlf-coach-review-queue-changed", {
      detail: {
        queue: nlfGetCoachReviewQueue(),
        approvedPlans: nlfGetApprovedClientPlans(),
      },
    })
  );
}

function nlfQueueClientWorkoutDraftFromSavedPlan(savedPlan) {
  if (typeof window === "undefined" || !savedPlan || typeof savedPlan !== "object") return;

  const title =
    savedPlan.title ||
    savedPlan.planTitle ||
    savedPlan.planName ||
    savedPlan.workoutTitle ||
    "Client Workout Draft";

  const clientName =
    savedPlan.clientName ||
    savedPlan.client ||
    savedPlan.assignedClientName ||
    savedPlan.name ||
    "Sample Client";

  const notes =
    savedPlan.notes ||
    savedPlan.summary ||
    savedPlan.description ||
    (() => {
      try {
        return JSON.stringify(savedPlan, null, 2);
      } catch {
        return "Client-created workout draft saved for coach review.";
      }
    })();

  const draft = {
    ...savedPlan,
    id:
      savedPlan.id ||
      "client-workout-draft-" +
        String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title,
    clientName,
    notes,
    status: "pending",
    submittedAt: savedPlan.submittedAt || savedPlan.createdAt || new Date().toISOString(),
  };

  const queue = nlfGetCoachReviewQueue();
  const existingIndex = queue.findIndex((item) => item.id === draft.id || item.title === draft.title);

  if (existingIndex >= 0) {
    queue[existingIndex] = {
      ...queue[existingIndex],
      ...draft,
      status: "pending",
    };
  } else {
    queue.unshift(draft);
  }

  nlfSetCoachReviewQueue(queue);
  nlfNotifyCoachReviewQueueChanged();
}

// NLF_LOGOUT_BLANK_SCREEN_GUARD
function nlfClearAuthOnlyStorage() {
  if (typeof window === "undefined") return;

  const shouldRemoveKey = (key) => {
    const normalizedKey = String(key || "").toLowerCase();

    if (normalizedKey.includes("app-local-state")) return false;

    return (
      normalizedKey.includes("auth") ||
      normalizedKey.includes("session") ||
      normalizedKey.includes("login") ||
      normalizedKey.includes("signed") ||
      normalizedKey.includes("current-user") ||
      normalizedKey.includes("portal-mode") ||
      normalizedKey.includes("test-unlocked")
    );
  };

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    try {
      const keys = [];

      for (let index = 0; index < storage.length; index += 1) {
        keys.push(storage.key(index));
      }

      keys.filter(Boolean).forEach((key) => {
        if (shouldRemoveKey(key)) {
          storage.removeItem(key);
        }
      });
    } catch {
      // Keep logout safe even when storage is unavailable.
    }
  });
}

function nlfReturnToPublicLogin() {
  if (typeof window === "undefined") return;

  nlfClearAuthOnlyStorage();

  try {
    document.body.dataset.portalMode = "";
  } catch {
    // No-op.
  }

  window.setTimeout(() => {
    window.location.assign("/");
  }, 0);
}

if (typeof window !== "undefined" && !window.__nlfLogoutGuardInstalled) {
  window.__nlfLogoutGuardInstalled = true;

  window.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      const button = target && target.closest ? target.closest("button") : null;

      if (!button) return;

      const label = [
        button.getAttribute("aria-label") || "",
        button.textContent || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      if (label === "logout" || label.includes("logout")) {
        event.preventDefault();
        event.stopPropagation();
        nlfReturnToPublicLogin();
      }
    },
    true
  );
}

﻿import { useEffect, useMemo, useState } from "react";
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
  ex("Walk", ["Conditioning", "Recovery", "General Fitness"], "Calves, glutes, hamstrings, quads, lungs", "Treadmill or open space"),
  ex("Run", ["Conditioning", "Sports Performance", "Fat Loss"], "Quads, glutes, calves, hamstrings, lungs", "Treadmill, track, or open space"),
  ex("Stair Master", ["Conditioning", "Fat Loss", "Legs"], "Glutes, quads, hamstrings, calves, lungs", "Stair master machine"),
  ex("Elliptical", ["Conditioning", "Low Impact", "Fat Loss"], "Quads, glutes, hamstrings, calves, lungs", "Elliptical machine"),
  ex("Stationary Bike", ["Conditioning", "Low Impact", "Fat Loss"], "Quads, hamstrings, glutes, calves, lungs", "Stationary bike"),
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
  { id: "client-1", name: "Sample Client", email: "client@example.com", status: "Active", coachId: "coach-primary", coachName: "No Limit Coach", coachingStatus: "assigned" },
  { id: "client-2", name: "Athlete Client", email: "athlete@example.com", status: "Active", coachId: "coach-primary", coachName: "No Limit Coach", coachingStatus: "assigned" },
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
        body: "Sounds good coach. Iâ€™m ready to start.",
        sentAt: "Sample message",
        timestamp: 2,
        unreadForCoach: true,
        unreadForClient: false,
      },
    ],
  },
  {
    clientId: "client-2",
    clientName: "Athlete Client",
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
const PUBLIC_LANDING_TAB = "Login";

function hasCurrentTestUnlockUrl() {
  if (typeof window === "undefined") return false;

  try {
    return new URLSearchParams(window.location.search).get("testUnlock") === "true";
  } catch {
    return false;
  }
}

const PORTAL_VISIBLE_TABS_BY_MODE = {
  coach: [
    "Coach",
    "Clients",
    "Plans",
    "Tracker",
    "Messages",
    "Exercises",
    "Progress",
    "Login",
  ],
  client: ["Home", "Client", "Nutrition", "Plans", "Tracker", "Progress", "Messages", "Exercises", "Login"],
};

const PORTAL_LANDING_TAB_BY_MODE = {
  coach: "Coach",
  client: "Client",
};

function getRequestedTestUnlockPortalMode() {
  if (typeof window === "undefined") return PUBLIC_PORTAL_MODE;

  const validModes = ["coach", "client"];

  try {
    const params = new URLSearchParams(window.location.search);
    const urlMode = String(
      params.get("portalMode") || params.get("mode") || params.get("view") || ""
    ).toLowerCase();

    if (validModes.includes(urlMode)) return urlMode;

    const savedMode = String(
      window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
    ).toLowerCase();

    if (validModes.includes(savedMode)) return savedMode;
  } catch {
    // URL/localStorage can fail in restricted browser modes.
  }

  return PUBLIC_PORTAL_MODE;
}

function getInitialTabForPortalMode(mode) {
  if (mode === "coach") return "Coach";
  return "Client";
}

function getPortalTestUnlocked() {
  if (typeof window === "undefined") return false;

  // Clean public URL must stay locked.
  // Only the explicit regression URL can bypass the login gate.
  if (!hasCurrentTestUnlockUrl()) return false;

  const requestedMode = getRequestedTestUnlockPortalMode();

  try {
    window.localStorage.setItem(TEST_UNLOCK_STORAGE_KEY, "true");
    window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, requestedMode);

    if (requestedMode === "coach") {
      window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
    }
  } catch {
    // LocalStorage can fail in restricted browser modes.
  }

  return true;
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
    if (hasCurrentTestUnlockUrl()) {
      const requestedMode = getRequestedTestUnlockPortalMode();

      window.localStorage.setItem(TEST_UNLOCK_STORAGE_KEY, "true");
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, requestedMode);

      if (requestedMode === "coach") {
        window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
      } else {
        window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
      }

      return requestedMode;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedMode = String(
      params.get("portalMode") || params.get("mode") || params.get("view") || ""
    ).toLowerCase();

    const savedMode = String(
      window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
    ).toLowerCase();

    const validModes = ["coach", "client"];

    if (validModes.includes(requestedMode)) return requestedMode;
    if (validModes.includes(savedMode)) return savedMode;
  } catch {
    // LocalStorage and URL parsing can fail in restricted browser modes.
  }

  return PUBLIC_PORTAL_MODE;
}







function PortalModeControls() {
  return null;
}

// NLF_COACH_ASSIGNMENT_HELPERS_START
const NLF_COACH_ASSIGNMENT = {
  coachId: "coach-primary",
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

  return pieces.join(" â€¢ ") || exercise.notes || "See coach notes";
}


function nlfNormalizeApprovedPlanDays(approvedPlan) {
  const rawDays =
    approvedPlan?.planDays ||
    approvedPlan?.trainingDays ||
    approvedPlan?.workoutDays ||
    approvedPlan?.days ||
    [];

  if (Array.isArray(rawDays)) {
    return rawDays.length
      ? rawDays.map((day, index) => ({
          id: day.id || `approved-day-${index + 1}`,
          name: day.name || day.title || `Day ${index + 1}`,
          exercises: Array.isArray(day.exercises) ? day.exercises : [],
        }))
      : [
          {
            id: "approved-day-1",
            name: "Day 1",
            exercises: [],
          },
        ];
  }

  const dayCount = Number(rawDays);
  const safeDayCount = Number.isFinite(dayCount) && dayCount > 0 ? Math.min(dayCount, 7) : 1;

  return Array.from({ length: safeDayCount }, (_, index) => ({
    id: `approved-day-${index + 1}`,
    name: `Day ${index + 1}`,
    exercises: [],
  }));
}

function nlfFindClientForApprovedPlan(approvedPlan, clients) {
  const safeClients = Array.isArray(clients) ? clients : [];
  const preferredClientText = String(
    approvedPlan?.clientId ||
      approvedPlan?.clientName ||
      approvedPlan?.client ||
      approvedPlan?.assignedClientName ||
      approvedPlan?.email ||
      ""
  ).toLowerCase();

  return (
    safeClients.find((client) => String(client.id || "").toLowerCase() === preferredClientText) ||
    safeClients.find((client) => String(client.name || "").toLowerCase() === preferredClientText) ||
    safeClients.find((client) => String(client.email || "").toLowerCase() === preferredClientText) ||
    safeClients.find((client) => getClientCoachingStatus(client) === "active") ||
    safeClients[0] ||
    null
  );
}

function nlfApprovedPlanToSavedPlan(approvedPlan, clients) {
  const client = nlfFindClientForApprovedPlan(approvedPlan, clients);
  const planName =
    approvedPlan?.planName ||
    approvedPlan?.title ||
    approvedPlan?.planTitle ||
    approvedPlan?.workoutTitle ||
    "Coach-Approved Workout Plan";

  const clientId = approvedPlan?.clientId || client?.id || "approved-client";
  const clientName =
    approvedPlan?.clientName ||
    approvedPlan?.client ||
    approvedPlan?.assignedClientName ||
    client?.name ||
    "Client";

  const sourceDraftId = approvedPlan?.sourceDraftId || approvedPlan?.id || planName;
  const safeId = String(sourceDraftId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    ...approvedPlan,
    id: approvedPlan?.savedPlanId || `coach-approved-plan-${safeId || "active"}`,
    sourceDraftId,
    source: "Coach Review Queue",
    status: "approved",
    approvalStatus: "coach-approved",
    planName,
    title: approvedPlan?.title || planName,
    clientId,
    clientName,
    goal:
      approvedPlan?.goal ||
      approvedPlan?.description ||
      "Coach-approved active workout plan assigned from the review queue.",
    days: nlfNormalizeApprovedPlanDays(approvedPlan),
    createdTimestamp: approvedPlan?.createdTimestamp || approvedPlan?.submittedAt || approvedPlan?.approvedAt || new Date().toISOString(),
    updatedTimestamp: approvedPlan?.updatedTimestamp || approvedPlan?.approvedAt || new Date().toISOString(),
    approvedAt: approvedPlan?.approvedAt || new Date().toISOString(),
    assignedAt: approvedPlan?.assignedAt || approvedPlan?.approvedAt || new Date().toISOString(),
  };
}

function nlfSavedPlanDedupeKeys(plan) {
  if (!plan || typeof plan !== "object") return [];

  const planName = plan.planName || plan.title || plan.planTitle || "";
  const clientKey = plan.clientId || plan.clientName || plan.client || "";
  const keys = [];

  if (plan.id) keys.push("id:" + plan.id);
  if (plan.sourceDraftId) keys.push("sourceDraftId:" + plan.sourceDraftId);

  if (clientKey && planName) {
    keys.push("clientPlan:" + clientKey + "::" + planName);
  }

  if (plan.source === "Coach Review Queue" && plan.approvalStatus === "coach-approved" && planName) {
    keys.push("coachApproved:" + planName);
  }

  return keys;
}

function nlfMergeApprovedPlansIntoSavedPlans(currentSavedPlans, approvedPlans, clients) {
  const current = Array.isArray(currentSavedPlans) ? currentSavedPlans : [];
  const approved = Array.isArray(approvedPlans) ? approvedPlans : [];

  if (approved.length === 0) return current;

  const approvedSavedPlans = approved.map((plan) => nlfApprovedPlanToSavedPlan(plan, clients));
  const next = [];
  const seenKeys = new Set();

  function hasSeenKey(plan) {
    return nlfSavedPlanDedupeKeys(plan).some((key) => seenKeys.has(key));
  }

  function rememberPlan(plan) {
    nlfSavedPlanDedupeKeys(plan).forEach((key) => seenKeys.add(key));
  }

  function addUniquePlan(plan) {
    if (!plan || typeof plan !== "object") return;

    if (hasSeenKey(plan)) return;

    next.push(plan);
    rememberPlan(plan);
  }

  approvedSavedPlans.forEach(addUniquePlan);
  current.forEach(addUniquePlan);

  const currentSignature = current
    .map((plan) =>
      [
        plan.id || "",
        plan.sourceDraftId || "",
        plan.clientId || "",
        plan.clientName || "",
        plan.planName || plan.title || "",
        plan.updatedTimestamp || "",
        plan.approvalStatus || "",
        plan.source || "",
      ].join("::")
    )
    .join("|");

  const nextSignature = next
    .map((plan) =>
      [
        plan.id || "",
        plan.sourceDraftId || "",
        plan.clientId || "",
        plan.clientName || "",
        plan.planName || plan.title || "",
        plan.updatedTimestamp || "",
        plan.approvalStatus || "",
        plan.source || "",
      ].join("::")
    )
    .join("|");

  return currentSignature === nextSignature ? current : next;
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

// NLF_BUNDLE_12W_CLIENT_PLAN_DRAFT_HELPERS
const CLIENT_PLAN_DRAFT_STORAGE_KEY = "no-limit-fitness-client-plan-draft-v1";

function getStoredClientPlanDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CLIENT_PLAN_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    return {
      title: String(parsed.title || "Starter Workout Plan"),
      goal: String(parsed.goal || "Build consistency, strength, and conditioning."),
      days: String(parsed.days || "3"),
      savedAt: String(parsed.savedAt || ""),
    };
  } catch {
    return null;
  }
}

function saveStoredClientPlanDraft(draft) {
  if (typeof window === "undefined") return null;

  const cleanDraft = {
    title: String(draft?.title || "Starter Workout Plan"),
    goal: String(draft?.goal || "Build consistency, strength, and conditioning."),
    days: String(draft?.days || "3"),
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CLIENT_PLAN_DRAFT_STORAGE_KEY, JSON.stringify(cleanDraft));
  } catch {
    // Ignore localStorage failures in restricted browser modes.
  }

  return cleanDraft;
}


function useNlfCoachReviewSnapshot() {
  const readSnapshot = () => ({
    queue: nlfGetCoachReviewQueue(),
    approvedPlans: nlfGetApprovedClientPlans(),
  });

  const [snapshot, setSnapshot] = useState(readSnapshot);

  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());

    window.addEventListener("storage", refresh);
    window.addEventListener("nlf-coach-review-queue-changed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("nlf-coach-review-queue-changed", refresh);
    };
  }, []);

  return snapshot;
}

function CoachReviewQueuePanel() {
  const { queue, approvedPlans } = useNlfCoachReviewSnapshot();
  const pendingDrafts = queue.filter((item) => item.status !== "approved");
  const approvedDrafts = approvedPlans;

  return (
    <section
      data-testid="coach-client-plan-review-queue"
      aria-label="Coach client plan review queue"
      className="mb-6 rounded-3xl border border-[#00BF63]/30 bg-black/70 p-5 shadow-2xl shadow-black/40"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00BF63]">
            Coach Review Queue
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase text-white">
            Client Workout Drafts
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Review client-created workout drafts, approve the plan, and send the approved version into the client assigned-plan view.
          </p>
        </div>

        <p
          data-testid="coach-review-approval-status"
          aria-live="polite"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/60"
        >
          {approvedDrafts.length ? approvedDrafts.length + " approved" : pendingDrafts.length + " pending"}
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        {pendingDrafts.length ? (
          pendingDrafts.map((draft) => (
            <article
              key={draft.id || draft.title}
              data-testid="coach-pending-client-plan-draft"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{draft.title || "Client Workout Draft"}</h3>
                  <p className="mt-1 text-sm font-bold text-white/55">
                    Client: {draft.clientName || "Sample Client"} • Status: Pending coach review
                  </p>
                  {draft.notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{draft.notes}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  data-testid="coach-approve-client-plan-draft"
                  onClick={() => nlfApproveClientWorkoutDraft(draft.id)}
                  className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
                >
                  Approve Draft
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
            No pending client workout drafts. Approved plans stay available in the client assigned-plan view.
          </p>
        )}

        {approvedDrafts.length ? (
          <div className="rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
            <p className="text-sm font-black text-[#00BF63]">Recently Approved</p>
            <div className="mt-3 grid gap-2">
              {approvedDrafts.slice(0, 3).map((draft) => (
                <p key={draft.id || draft.title} className="text-sm font-bold text-white/70">
                  {draft.title || "Approved Workout Draft"} is now active for {draft.clientName || "client"}.
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ClientApprovedWorkoutPlanPanel() {
  const { approvedPlans } = useNlfCoachReviewSnapshot();
  const activePlan = approvedPlans[0];

  if (!activePlan) return null;

  const activePlanTitle =
    activePlan.planName ||
    activePlan.title ||
    activePlan.planTitle ||
    "Coach-approved workout plan";

  return (
    <div
      data-testid="client-approved-workout-plan-bridge"
      aria-label="Coach-approved assigned plan status"
      className="mb-4 rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 px-4 py-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
            Coach-approved active plan
          </p>
          <p className="mt-1 text-sm font-bold text-white/75">
            Active assigned plan: {activePlanTitle}
          </p>
        </div>

        <p className="w-fit rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/55">
          Synced to Tracker, Progress, and client profile
        </p>
      </div>
    </div>
  );
}

﻿﻿function ClientProgressPhotoUploadPanel() {
  const PROGRESS_PHOTOS_STORAGE_KEY = "nlf-client-progress-photos-v1";

  function readSavedProgressPhotos() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(PROGRESS_PHOTOS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getTodayDate() {
    try {
      return new Date().toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }

  const [savedPhotoCheckIns, setSavedPhotoCheckIns] = useState(readSavedProgressPhotos);
  const [photoDate, setPhotoDate] = useState(getTodayDate);
  const [frontPhoto, setFrontPhoto] = useState(null);
  const [sidePhoto, setSidePhoto] = useState(null);
  const [backPhoto, setBackPhoto] = useState(null);
  const [frontPhotoNote, setFrontPhotoNote] = useState("");
  const [sidePhotoNote, setSidePhotoNote] = useState("");
  const [backPhotoNote, setBackPhotoNote] = useState("");
  const [photoCheckInNotes, setPhotoCheckInNotes] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");

  function saveProgressPhotos(nextPhotos) {
    if (typeof window === "undefined") return true;

    try {
      window.localStorage.setItem(PROGRESS_PHOTOS_STORAGE_KEY, JSON.stringify(nextPhotos));
      return true;
    } catch {
      setPhotoStatus("Photos were too large to save locally. Use smaller images or fewer photos.");
      return false;
    }
  }

  function readPhotoFile(file, angleLabel, setter) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoStatus(angleLabel + " must be an image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setter({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result || ""),
        addedAt: new Date().toLocaleString(),
      });

      setPhotoStatus(angleLabel + " photo ready to save.");
    };

    reader.onerror = () => {
      setPhotoStatus("Could not read " + angleLabel.toLowerCase() + " photo.");
    };

    reader.readAsDataURL(file);
  }

  function saveProgressPhotoCheckIn() {
    if (!frontPhoto && !sidePhoto && !backPhoto) {
      setPhotoStatus("Add at least one progress photo before saving.");
      return;
    }

    const nextCheckIn = {
      id: makeId("progress-photo-checkin"),
      photoDate,
      frontPhoto,
      sidePhoto,
      backPhoto,
      frontPhotoNote,
      sidePhotoNote,
      backPhotoNote,
      photoCheckInNotes,
      savedAt: new Date().toLocaleString(),
    };

    const nextSaved = [nextCheckIn, ...savedPhotoCheckIns].slice(0, 8);
    const saved = saveProgressPhotos(nextSaved);

    if (!saved) return;

    setSavedPhotoCheckIns(nextSaved);
    setPhotoStatus("Progress photos saved for coach review.");
  }

  function clearPendingPhotos() {
    setFrontPhoto(null);
    setSidePhoto(null);
    setBackPhoto(null);
    setFrontPhotoNote("");
    setSidePhotoNote("");
    setBackPhotoNote("");
    setPhotoCheckInNotes("");
    setPhotoStatus("Pending progress photos cleared.");
  }

  const latestPhotoCheckIn = savedPhotoCheckIns[0] || null;

  return (
    <section
      data-testid="client-progress-photo-upload-panel"
      aria-label="Client progress photo upload"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/50 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Progress Photos
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Upload Front, Side, And Back Photos
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Save visual progress with notes so the coach can compare changes alongside weight, waist, adherence, and nutrition logs.
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black uppercase text-white/55">
          {savedPhotoCheckIns.length} saved
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/50">Photo Date</span>
          <input
            aria-label="Progress Photo Date"
            value={photoDate}
            onChange={(event) => setPhotoDate(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="2026-07-11"
          />
        </label>

        <label className="space-y-2 md:col-span-3">
          <span className="text-xs font-black uppercase text-white/50">Overall Photo Notes</span>
          <input
            aria-label="Progress Photo Check-In Notes"
            value={photoCheckInNotes}
            onChange={(event) => setPhotoCheckInNotes(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Same lighting, same time of day, relaxed pose, noticeable waist change, etc."
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">Front</p>
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Upload Front Photo</span>
            <input
              aria-label="Front Progress Photo Upload"
              type="file"
              accept="image/*"
              onChange={(event) => readPhotoFile(event.target.files?.[0], "Front", setFrontPhoto)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-[#00BF63] file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-black"
            />
          </label>
          {frontPhoto && (
            <img
              data-testid="front-progress-photo-preview"
              src={frontPhoto.dataUrl}
              alt="Front progress preview"
              className="mt-3 h-56 w-full rounded-2xl border border-white/10 object-cover"
            />
          )}
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Front Note</span>
            <input
              aria-label="Front Progress Photo Upload Note"
              value={frontPhotoNote}
              onChange={(event) => setFrontPhotoNote(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Front photo note"
            />
          </label>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">Side</p>
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Upload Side Photo</span>
            <input
              aria-label="Side Progress Photo Upload"
              type="file"
              accept="image/*"
              onChange={(event) => readPhotoFile(event.target.files?.[0], "Side", setSidePhoto)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-[#00BF63] file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-black"
            />
          </label>
          {sidePhoto && (
            <img
              data-testid="side-progress-photo-preview"
              src={sidePhoto.dataUrl}
              alt="Side progress preview"
              className="mt-3 h-56 w-full rounded-2xl border border-white/10 object-cover"
            />
          )}
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Side Note</span>
            <input
              aria-label="Side Progress Photo Upload Note"
              value={sidePhotoNote}
              onChange={(event) => setSidePhotoNote(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Side photo note"
            />
          </label>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">Back</p>
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Upload Back Photo</span>
            <input
              aria-label="Back Progress Photo Upload"
              type="file"
              accept="image/*"
              onChange={(event) => readPhotoFile(event.target.files?.[0], "Back", setBackPhoto)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-[#00BF63] file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-black"
            />
          </label>
          {backPhoto && (
            <img
              data-testid="back-progress-photo-preview"
              src={backPhoto.dataUrl}
              alt="Back progress preview"
              className="mt-3 h-56 w-full rounded-2xl border border-white/10 object-cover"
            />
          )}
          <label className="mt-3 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Back Note</span>
            <input
              aria-label="Back Progress Photo Upload Note"
              value={backPhotoNote}
              onChange={(event) => setBackPhotoNote(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Back photo note"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveProgressPhotoCheckIn}
          className="rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
        >
          Save Progress Photos
        </button>

        <button
          type="button"
          onClick={clearPendingPhotos}
          className="rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase text-white/55 transition hover:border-red-400 hover:text-red-300"
        >
          Clear Pending Photos
        </button>
      </div>

      {photoStatus && (
        <p
          data-testid="client-progress-photo-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {photoStatus}
        </p>
      )}

      {latestPhotoCheckIn && (
        <div
          data-testid="client-latest-progress-photo-checkin"
          className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Latest Saved Photo Check-In
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {latestPhotoCheckIn.photoDate || "Latest"} | saved {latestPhotoCheckIn.savedAt}
          </p>
          <p className="mt-2 text-sm font-bold text-white/55">
            Front: {latestPhotoCheckIn.frontPhoto ? "saved" : "none"} | Side: {latestPhotoCheckIn.sidePhoto ? "saved" : "none"} | Back: {latestPhotoCheckIn.backPhoto ? "saved" : "none"}
          </p>
        </div>
      )}
    </section>
  );
}

function ClientWeeklyNutritionCheckInForm() {
  const CLIENT_WEEKLY_CHECKINS_STORAGE_KEY = "nlf-client-weekly-checkins-v1";

  function readClientCheckIns() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getTodayDate() {
    try {
      return new Date().toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }

  const [checkIns, setCheckIns] = useState(readClientCheckIns);
  const [checkInDate, setCheckInDate] = useState(getTodayDate);
  const [checkInWeight, setCheckInWeight] = useState("");
  const [waistMeasurement, setWaistMeasurement] = useState("");
  const [adherenceScore, setAdherenceScore] = useState("80");
  const [workoutsCompleted, setWorkoutsCompleted] = useState("3");
  const [proteinConsistency, setProteinConsistency] = useState("3");
  const [hungerScore, setHungerScore] = useState("3");
  const [energyScore, setEnergyScore] = useState("3");
  const [sleepScore, setSleepScore] = useState("3");
  const [stressScore, setStressScore] = useState("3");
  const [digestionScore, setDigestionScore] = useState("3");
  const [recoveryScore, setRecoveryScore] = useState("3");
  const [clientCheckInNotes, setClientCheckInNotes] = useState("");
  const [frontPhotoNote, setFrontPhotoNote] = useState("");
  const [sidePhotoNote, setSidePhotoNote] = useState("");
  const [backPhotoNote, setBackPhotoNote] = useState("");
  const [checkInStatus, setCheckInStatus] = useState("");

  function saveClientCheckIns(nextCheckIns) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY, JSON.stringify(nextCheckIns));
    } catch {
      // Ignore local storage failures in restricted browser modes.
    }
  }

  function saveClientWeeklyCheckIn(event) {
    event.preventDefault();

    const nextCheckIn = {
      id: makeId("client-weekly-checkin"),
      checkInDate,
      checkInWeight,
      waistMeasurement,
      adherenceScore,
      workoutsCompleted,
      proteinConsistency,
      hungerScore,
      energyScore,
      sleepScore,
      stressScore,
      digestionScore,
      recoveryScore,
      clientCheckInNotes,
      frontPhotoNote,
      sidePhotoNote,
      backPhotoNote,
      savedAt: new Date().toLocaleString(),
    };

    const nextCheckIns = [nextCheckIn, ...checkIns].slice(0, 12);

    setCheckIns(nextCheckIns);
    saveClientCheckIns(nextCheckIns);
    setCheckInStatus("Weekly client check-in saved for coach review.");
  }

  const latestCheckIn = checkIns[0] || null;

  return (
    <section
      data-testid="client-weekly-checkin-form"
      aria-label="Client weekly nutrition check-in"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Weekly Client Check-In
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Weight, Habits, Recovery, And Photo Notes
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Save a weekly update so the coach can compare scale trend, adherence, hunger, sleep, recovery, and progress-photo notes.
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black uppercase text-white/55">
          {checkIns.length} saved
        </span>
      </div>

      <form onSubmit={saveClientWeeklyCheckIn} className="mt-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Date</span>
            <input
              aria-label="Client Check-In Date"
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="2026-07-11"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Current Weight</span>
            <input
              aria-label="Client Check-In Weight"
              value={checkInWeight}
              onChange={(event) => setCheckInWeight(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="198.5"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Waist</span>
            <input
              aria-label="Client Waist Measurement"
              value={waistMeasurement}
              onChange={(event) => setWaistMeasurement(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="34.5"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Adherence</span>
            <select
              aria-label="Weekly Adherence Score"
              value={adherenceScore}
              onChange={(event) => setAdherenceScore(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            >
              <option value="100">100%</option>
              <option value="90">90%</option>
              <option value="80">80%</option>
              <option value="75">75%</option>
              <option value="60">60%</option>
              <option value="50">50%</option>
              <option value="25">25%</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Workouts Done</span>
            <input
              aria-label="Weekly Workouts Completed"
              value={workoutsCompleted}
              onChange={(event) => setWorkoutsCompleted(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="3"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Protein</span>
            <select aria-label="Weekly Protein Consistency" value={proteinConsistency} onChange={(event) => setProteinConsistency(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="5">5 - excellent</option>
              <option value="4">4 - good</option>
              <option value="3">3 - okay</option>
              <option value="2">2 - low</option>
              <option value="1">1 - poor</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Hunger</span>
            <select aria-label="Weekly Hunger Score" value={hungerScore} onChange={(event) => setHungerScore(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="1">1 - very low</option>
              <option value="2">2 - low</option>
              <option value="3">3 - normal</option>
              <option value="4">4 - high</option>
              <option value="5">5 - very high</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Energy</span>
            <select aria-label="Weekly Energy Score" value={energyScore} onChange={(event) => setEnergyScore(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="5">5 - excellent</option>
              <option value="4">4 - good</option>
              <option value="3">3 - okay</option>
              <option value="2">2 - low</option>
              <option value="1">1 - very low</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Sleep</span>
            <select aria-label="Weekly Sleep Score" value={sleepScore} onChange={(event) => setSleepScore(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="5">5 - excellent</option>
              <option value="4">4 - good</option>
              <option value="3">3 - okay</option>
              <option value="2">2 - poor</option>
              <option value="1">1 - very poor</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Stress</span>
            <select aria-label="Weekly Stress Score" value={stressScore} onChange={(event) => setStressScore(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="1">1 - very low</option>
              <option value="2">2 - low</option>
              <option value="3">3 - normal</option>
              <option value="4">4 - high</option>
              <option value="5">5 - very high</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Digestion</span>
            <select aria-label="Weekly Digestion Score" value={digestionScore} onChange={(event) => setDigestionScore(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="5">5 - excellent</option>
              <option value="4">4 - good</option>
              <option value="3">3 - okay</option>
              <option value="2">2 - off</option>
              <option value="1">1 - poor</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Recovery</span>
            <select aria-label="Weekly Recovery Score" value={recoveryScore} onChange={(event) => setRecoveryScore(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
              <option value="5">5 - excellent</option>
              <option value="4">4 - good</option>
              <option value="3">3 - okay</option>
              <option value="2">2 - low</option>
              <option value="1">1 - poor</option>
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Front Photo Note</span>
            <input
              aria-label="Front Progress Photo Note"
              value={frontPhotoNote}
              onChange={(event) => setFrontPhotoNote(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Front photo uploaded / looks leaner"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Side Photo Note</span>
            <input
              aria-label="Side Progress Photo Note"
              value={sidePhotoNote}
              onChange={(event) => setSidePhotoNote(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Side photo uploaded"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Back Photo Note</span>
            <input
              aria-label="Back Progress Photo Note"
              value={backPhotoNote}
              onChange={(event) => setBackPhotoNote(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Back photo uploaded"
            />
          </label>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-xs font-black uppercase text-white/50">Client Notes</span>
          <textarea
            aria-label="Client Weekly Check-In Notes"
            value={clientCheckInNotes}
            onChange={(event) => setClientCheckInNotes(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="How did the week go? Any missed meals, hunger, alcohol, events, cravings, sleep issues, or schedule problems?"
          />
        </label>

        <button
          type="submit"
          className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
        >
          Save Weekly Client Check-In
        </button>
      </form>

      {checkInStatus && (
        <p
          data-testid="client-weekly-checkin-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-black/40 p-4 text-sm font-black text-[#00BF63]"
        >
          {checkInStatus}
        </p>
      )}

      {latestCheckIn && (
        <div
          data-testid="client-latest-weekly-checkin"
          className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Latest Saved Check-In
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {latestCheckIn.checkInWeight || "—"} lb | {latestCheckIn.adherenceScore}% adherence | saved {latestCheckIn.savedAt}
          </p>
          <p className="mt-2 text-sm font-bold text-white/55">
            Energy {latestCheckIn.energyScore}/5 | Sleep {latestCheckIn.sleepScore}/5 | Hunger {latestCheckIn.hungerScore}/5 | Recovery {latestCheckIn.recoveryScore}/5
          </p>
        </div>
      )}
    </section>
  );
}

function NutritionCoachScreen() {
  const NUTRITION_HISTORY_STORAGE_KEY = "nlf-nutrition-history-v1";
  const CUSTOM_FOODS_STORAGE_KEY = "nlf-custom-foods-v1";

  function getSavedNutritionHistory() {
    if (typeof window === "undefined") return { targets: [], meals: [] };

    try {
      const raw = window.localStorage.getItem(NUTRITION_HISTORY_STORAGE_KEY);
      if (!raw) return { targets: [], meals: [] };

      const parsed = JSON.parse(raw);

      return {
        targets: Array.isArray(parsed.targets) ? parsed.targets : [],
        meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      };
    } catch {
      return { targets: [], meals: [] };
    }
  }

  function saveNutritionHistory(nextHistory) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(NUTRITION_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // Ignore local storage failures in restricted browser modes.
    }
  }

  function getSavedCustomFoods() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(CUSTOM_FOODS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCustomFoods(nextFoods) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(CUSTOM_FOODS_STORAGE_KEY, JSON.stringify(nextFoods));
    } catch {
      // Ignore local storage failures in restricted browser modes.
    }
  }

  const [nutritionMode, setNutritionMode] = useState("");
  const [bodyWeight, setBodyWeight] = useState("180");
  const [heightFeet, setHeightFeet] = useState("5");
  const [heightInches, setHeightInches] = useState("10");
  const [age, setAge] = useState("30");
  const [genderFormula, setGenderFormula] = useState("male");
  const [goal, setGoal] = useState("fat-loss");
  const [trainingDays, setTrainingDays] = useState("4");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [targetResult, setTargetResult] = useState(null);

  const [mealText, setMealText] = useState("");
  const [mealResult, setMealResult] = useState(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedFoodName, setSelectedFoodName] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [mealItems, setMealItems] = useState([]);
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualServing, setManualServing] = useState("1 serving");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");

  const [customFoods, setCustomFoods] = useState(getSavedCustomFoods);
  const [nutritionHistory, setNutritionHistory] = useState(getSavedNutritionHistory);
  const [nutritionSaveStatus, setNutritionSaveStatus] = useState("");

  useEffect(() => {
    saveNutritionHistory(nutritionHistory);
  }, [nutritionHistory]);

  useEffect(() => {
    saveCustomFoods(customFoods);
  }, [customFoods]);

  const baseFoodDatabase = useMemo(
    () => [
      // Proteins and staples
      { name: "Chicken Breast", category: "Protein", keywords: ["chicken breast", "grilled chicken", "chicken"], serving: "4 oz cooked", calories: 185, protein: 35, carbs: 0, fat: 4 },
      { name: "Chicken Thigh", category: "Protein", keywords: ["chicken thigh", "dark meat chicken"], serving: "4 oz cooked", calories: 230, protein: 28, carbs: 0, fat: 12 },
      { name: "Chicken Nuggets", category: "Convenience", keywords: ["chicken nuggets", "nuggets"], serving: "6 pieces", calories: 270, protein: 15, carbs: 17, fat: 16 },
      { name: "Turkey Deli Meat", category: "Protein", keywords: ["turkey deli", "deli turkey", "turkey slices"], serving: "3 oz", calories: 90, protein: 18, carbs: 2, fat: 1 },
      { name: "Lean Ground Beef", category: "Protein", keywords: ["lean ground beef", "ground beef", "beef"], serving: "4 oz cooked", calories: 230, protein: 26, carbs: 0, fat: 13 },
      { name: "Steak", category: "Protein", keywords: ["steak"], serving: "4 oz cooked", calories: 260, protein: 29, carbs: 0, fat: 16 },
      { name: "Pork Chop", category: "Protein", keywords: ["pork chop"], serving: "4 oz cooked", calories: 250, protein: 30, carbs: 0, fat: 14 },
      { name: "Bacon", category: "Protein", keywords: ["bacon"], serving: "2 slices", calories: 90, protein: 6, carbs: 0, fat: 7 },
      { name: "Sausage Patty", category: "Protein", keywords: ["sausage patty", "breakfast sausage", "sausage"], serving: "1 patty", calories: 180, protein: 9, carbs: 1, fat: 16 },
      { name: "Hot Dog", category: "Convenience", keywords: ["hot dog", "hotdog"], serving: "1 hot dog", calories: 150, protein: 5, carbs: 2, fat: 13 },
      { name: "Salmon", category: "Protein", keywords: ["salmon"], serving: "4 oz cooked", calories: 235, protein: 25, carbs: 0, fat: 14 },
      { name: "Tuna", category: "Protein", keywords: ["tuna"], serving: "1 can", calories: 130, protein: 29, carbs: 0, fat: 1 },
      { name: "Egg", category: "Protein", keywords: ["egg", "eggs"], serving: "1 large egg", calories: 70, protein: 6, carbs: 1, fat: 5 },
      { name: "Egg Whites", category: "Protein", keywords: ["egg whites"], serving: "1/2 cup", calories: 65, protein: 13, carbs: 1, fat: 0 },
      { name: "Greek Yogurt", category: "Protein", keywords: ["greek yogurt", "yogurt"], serving: "1 cup", calories: 130, protein: 20, carbs: 9, fat: 0 },
      { name: "Cottage Cheese", category: "Protein", keywords: ["cottage cheese"], serving: "1 cup", calories: 185, protein: 25, carbs: 8, fat: 5 },
      { name: "Whey Protein", category: "Protein", keywords: ["whey protein", "protein shake", "protein powder"], serving: "1 scoop", calories: 120, protein: 24, carbs: 3, fat: 2 },

      // Carbs and boxed/canned foods
      { name: "White Rice", category: "Carb", keywords: ["white rice", "rice"], serving: "1 cup cooked", calories: 205, protein: 4, carbs: 45, fat: 0 },
      { name: "Brown Rice", category: "Carb", keywords: ["brown rice"], serving: "1 cup cooked", calories: 215, protein: 5, carbs: 45, fat: 2 },
      { name: "Spanish Rice", category: "Carb", keywords: ["spanish rice", "mexican rice"], serving: "1 cup", calories: 230, protein: 5, carbs: 44, fat: 5 },
      { name: "Fried Rice", category: "Convenience", keywords: ["fried rice"], serving: "1 cup", calories: 330, protein: 12, carbs: 45, fat: 12 },
      { name: "Pasta", category: "Carb", keywords: ["pasta", "spaghetti", "noodles"], serving: "1 cup cooked", calories: 220, protein: 8, carbs: 43, fat: 1 },
      { name: "Mac and Cheese", category: "Convenience", keywords: ["mac and cheese", "macaroni and cheese", "boxed mac"], serving: "1 cup prepared", calories: 350, protein: 10, carbs: 47, fat: 14 },
      { name: "Ramen Noodles", category: "Convenience", keywords: ["ramen", "ramen noodles", "instant noodles"], serving: "1 package", calories: 380, protein: 8, carbs: 52, fat: 14 },
      { name: "Canned Ravioli", category: "Convenience", keywords: ["ravioli", "beef ravioli", "canned ravioli"], serving: "1 cup", calories: 250, protein: 9, carbs: 36, fat: 8 },
      { name: "SpaghettiOs", category: "Convenience", keywords: ["spaghettios", "canned spaghetti"], serving: "1 cup", calories: 170, protein: 6, carbs: 32, fat: 2 },
      { name: "Canned Soup", category: "Convenience", keywords: ["canned soup", "chicken noodle soup", "soup"], serving: "1 cup", calories: 120, protein: 7, carbs: 15, fat: 4 },
      { name: "Chili", category: "Convenience", keywords: ["chili", "canned chili"], serving: "1 cup", calories: 300, protein: 18, carbs: 30, fat: 12 },
      { name: "Oats", category: "Carb", keywords: ["oats", "oatmeal"], serving: "1 cup cooked", calories: 155, protein: 6, carbs: 27, fat: 3 },
      { name: "Instant Oatmeal Packet", category: "Convenience", keywords: ["instant oatmeal", "oatmeal packet"], serving: "1 packet", calories: 160, protein: 4, carbs: 32, fat: 2 },
      { name: "Bread", category: "Carb", keywords: ["bread", "toast"], serving: "1 slice", calories: 80, protein: 3, carbs: 15, fat: 1 },
      { name: "White Bun", category: "Carb", keywords: ["bun", "hamburger bun", "hot dog bun"], serving: "1 bun", calories: 140, protein: 4, carbs: 26, fat: 2 },
      { name: "Tortilla", category: "Carb", keywords: ["tortilla", "wrap"], serving: "1 medium tortilla", calories: 140, protein: 4, carbs: 24, fat: 4 },
      { name: "Bagel", category: "Carb", keywords: ["bagel"], serving: "1 plain bagel", calories: 280, protein: 10, carbs: 56, fat: 2 },
      { name: "Pancake", category: "Carb", keywords: ["pancake", "pancakes"], serving: "2 medium pancakes", calories: 230, protein: 6, carbs: 38, fat: 6 },
      { name: "Waffle", category: "Carb", keywords: ["waffle", "waffles"], serving: "2 frozen waffles", calories: 210, protein: 5, carbs: 30, fat: 8 },
      { name: "Potato", category: "Carb", keywords: ["potato", "baked potato"], serving: "1 medium potato", calories: 160, protein: 4, carbs: 37, fat: 0 },
      { name: "Mashed Potatoes", category: "Carb", keywords: ["mashed potatoes"], serving: "1 cup", calories: 240, protein: 4, carbs: 35, fat: 9 },
      { name: "Sweet Potato", category: "Carb", keywords: ["sweet potato"], serving: "1 medium sweet potato", calories: 115, protein: 2, carbs: 27, fat: 0 },
      { name: "Black Beans", category: "Carb", keywords: ["black beans", "beans"], serving: "1/2 cup", calories: 115, protein: 8, carbs: 20, fat: 0 },
      { name: "Refried Beans", category: "Carb", keywords: ["refried beans"], serving: "1/2 cup", calories: 120, protein: 6, carbs: 18, fat: 3 },

      // Drinks
      { name: "Water", category: "Drink", keywords: ["water", "bottled water"], serving: "1 bottle", calories: 0, protein: 0, carbs: 0, fat: 0 },
      { name: "Sweet Tea", category: "Drink", keywords: ["sweet tea", "sweet iced tea"], serving: "moderate 16 oz glass", calories: 160, protein: 0, carbs: 40, fat: 0 },
      { name: "Unsweet Tea", category: "Drink", keywords: ["unsweet tea", "unsweetened tea"], serving: "16 oz", calories: 0, protein: 0, carbs: 0, fat: 0 },
      { name: "Kool-Aid", category: "Drink", keywords: ["kool-aid", "koolaid", "cool aid", "coolaid"], serving: "12 oz glass", calories: 150, protein: 0, carbs: 38, fat: 0 },
      { name: "Lemonade", category: "Drink", keywords: ["lemonade"], serving: "12 oz", calories: 150, protein: 0, carbs: 40, fat: 0 },
      { name: "Regular Soda", category: "Drink", keywords: ["soda", "coke", "pepsi", "mountain dew", "sprite", "dr pepper"], serving: "12 oz can", calories: 150, protein: 0, carbs: 39, fat: 0 },
      { name: "Diet Soda", category: "Drink", keywords: ["diet soda", "diet coke", "diet pepsi", "zero sugar soda", "coke zero"], serving: "12 oz can", calories: 0, protein: 0, carbs: 0, fat: 0 },
      { name: "Sports Drink", category: "Drink", keywords: ["gatorade", "powerade", "sports drink"], serving: "20 oz bottle", calories: 140, protein: 0, carbs: 36, fat: 0 },
      { name: "Energy Drink", category: "Drink", keywords: ["monster", "red bull", "energy drink"], serving: "16 oz can", calories: 210, protein: 0, carbs: 54, fat: 0 },
      { name: "Sugar Free Energy Drink", category: "Drink", keywords: ["zero sugar energy drink", "sugar free energy drink", "monster zero", "red bull sugar free"], serving: "16 oz can", calories: 10, protein: 0, carbs: 2, fat: 0 },
      { name: "Orange Juice", category: "Drink", keywords: ["orange juice", "oj"], serving: "8 oz", calories: 110, protein: 2, carbs: 26, fat: 0 },
      { name: "Apple Juice", category: "Drink", keywords: ["apple juice"], serving: "8 oz", calories: 115, protein: 0, carbs: 28, fat: 0 },
      { name: "Chocolate Milk", category: "Drink", keywords: ["chocolate milk"], serving: "1 cup", calories: 200, protein: 8, carbs: 30, fat: 5 },
      { name: "Black Coffee", category: "Drink", keywords: ["black coffee", "coffee"], serving: "12 oz", calories: 5, protein: 0, carbs: 1, fat: 0 },
      { name: "Coffee With Cream And Sugar", category: "Drink", keywords: ["coffee with cream", "coffee with sugar", "cream and sugar coffee"], serving: "12 oz", calories: 120, protein: 1, carbs: 18, fat: 5 },
      { name: "Bottled Frappuccino", category: "Drink", keywords: ["frappuccino", "bottled coffee", "iced coffee"], serving: "13.7 oz bottle", calories: 290, protein: 9, carbs: 47, fat: 6 },

      // Alcohol
      { name: "Light Beer", category: "Alcohol", keywords: ["light beer", "lite beer"], serving: "12 oz can or bottle", calories: 105, protein: 1, carbs: 6, fat: 0 },
      { name: "Regular Beer", category: "Alcohol", keywords: ["beer", "regular beer", "lager"], serving: "12 oz can or bottle", calories: 150, protein: 2, carbs: 13, fat: 0 },
      { name: "IPA Beer", category: "Alcohol", keywords: ["ipa", "craft beer", "ipa beer"], serving: "12 oz can or bottle", calories: 220, protein: 2, carbs: 18, fat: 0 },
      { name: "Tallboy Beer", category: "Alcohol", keywords: ["tallboy", "tall boy", "24 oz beer"], serving: "24 oz can", calories: 300, protein: 4, carbs: 26, fat: 0 },
      { name: "Malt Liquor 40 oz", category: "Alcohol", keywords: ["40 oz", "forty ounce", "malt liquor", "malt beer"], serving: "40 oz bottle", calories: 520, protein: 5, carbs: 48, fat: 0 },
      { name: "Flavored Malt Beverage", category: "Alcohol", keywords: ["flavored malt beverage", "malt beverage", "hard lemonade", "wine cooler"], serving: "12 oz bottle or can", calories: 220, protein: 0, carbs: 32, fat: 0 },
      { name: "Hard Seltzer", category: "Alcohol", keywords: ["hard seltzer", "spiked seltzer"], serving: "12 oz can", calories: 100, protein: 0, carbs: 2, fat: 0 },
      { name: "Canned Cocktail", category: "Alcohol", keywords: ["canned cocktail", "ready to drink cocktail", "premixed cocktail"], serving: "12 oz can", calories: 250, protein: 0, carbs: 28, fat: 0 },
      { name: "Small Canned Cocktail", category: "Alcohol", keywords: ["buzzball", "buzz ball", "small canned cocktail"], serving: "200 ml container", calories: 290, protein: 0, carbs: 34, fat: 0 },
      { name: "Red Wine", category: "Alcohol", keywords: ["red wine"], serving: "5 oz glass", calories: 125, protein: 0, carbs: 4, fat: 0 },
      { name: "White Wine", category: "Alcohol", keywords: ["white wine"], serving: "5 oz glass", calories: 120, protein: 0, carbs: 4, fat: 0 },
      { name: "Vodka Shot", category: "Alcohol", keywords: ["vodka shot", "vodka"], serving: "1.5 oz shot", calories: 100, protein: 0, carbs: 0, fat: 0 },
      { name: "Whiskey Shot", category: "Alcohol", keywords: ["whiskey shot", "whisky shot", "whiskey", "bourbon"], serving: "1.5 oz shot", calories: 105, protein: 0, carbs: 0, fat: 0 },
      { name: "Tequila Shot", category: "Alcohol", keywords: ["tequila shot", "tequila"], serving: "1.5 oz shot", calories: 100, protein: 0, carbs: 0, fat: 0 },
      { name: "Vodka Cranberry", category: "Alcohol", keywords: ["vodka cranberry"], serving: "1 mixed drink", calories: 190, protein: 0, carbs: 24, fat: 0 },
      { name: "Margarita", category: "Alcohol", keywords: ["margarita"], serving: "1 drink", calories: 250, protein: 0, carbs: 30, fat: 0 },

      // Snacks and convenience foods
      { name: "Potato Chips", category: "Snack", keywords: ["potato chips", "chips"], serving: "1 oz bag", calories: 150, protein: 2, carbs: 15, fat: 10 },
      { name: "Nacho Cheese Chips", category: "Snack", keywords: ["doritos", "nacho chips", "nacho cheese chips"], serving: "1 oz bag", calories: 150, protein: 2, carbs: 18, fat: 8 },
      { name: "Cheetos", category: "Snack", keywords: ["cheetos", "cheese puffs"], serving: "1 oz bag", calories: 160, protein: 2, carbs: 15, fat: 10 },
      { name: "Pretzels", category: "Snack", keywords: ["pretzels"], serving: "1 oz", calories: 110, protein: 3, carbs: 23, fat: 1 },
      { name: "Popcorn", category: "Snack", keywords: ["popcorn"], serving: "3 cups popped", calories: 160, protein: 3, carbs: 18, fat: 9 },
      { name: "Peanut Butter Crackers", category: "Snack", keywords: ["peanut butter crackers"], serving: "1 pack", calories: 200, protein: 5, carbs: 22, fat: 10 },
      { name: "Granola Bar", category: "Snack", keywords: ["granola bar"], serving: "1 bar", calories: 140, protein: 3, carbs: 25, fat: 4 },
      { name: "Protein Bar", category: "Snack", keywords: ["protein bar"], serving: "1 bar", calories: 220, protein: 20, carbs: 24, fat: 7 },
      { name: "Pop Tart", category: "Snack", keywords: ["pop tart", "pop-tart"], serving: "1 pastry", calories: 200, protein: 2, carbs: 38, fat: 5 },
      { name: "Cereal", category: "Snack", keywords: ["cereal", "frosted flakes", "fruit loops", "cinnamon toast crunch"], serving: "1 cup", calories: 150, protein: 2, carbs: 33, fat: 2 },
      { name: "Candy Bar", category: "Snack", keywords: ["candy bar", "snickers", "milky way", "reeses", "kit kat", "twix"], serving: "1 bar", calories: 250, protein: 4, carbs: 33, fat: 12 },
      { name: "Cookies", category: "Snack", keywords: ["cookies", "oreo", "chocolate chip cookies"], serving: "3 cookies", calories: 160, protein: 2, carbs: 25, fat: 7 },
      { name: "Donut", category: "Snack", keywords: ["donut", "doughnut"], serving: "1 donut", calories: 260, protein: 4, carbs: 31, fat: 14 },
      { name: "Honey Bun", category: "Snack", keywords: ["honey bun"], serving: "1 pastry", calories: 330, protein: 4, carbs: 45, fat: 15 },
      { name: "Beef Jerky", category: "Snack", keywords: ["beef jerky", "jerky"], serving: "1 oz", calories: 90, protein: 11, carbs: 6, fat: 2 },
      { name: "Frozen Pizza", category: "Convenience", keywords: ["frozen pizza"], serving: "1/3 pizza", calories: 380, protein: 17, carbs: 42, fat: 17 },
      { name: "Pizza Rolls", category: "Convenience", keywords: ["pizza rolls"], serving: "6 rolls", calories: 220, protein: 7, carbs: 30, fat: 8 },
      { name: "Corn Dog", category: "Convenience", keywords: ["corn dog"], serving: "1 corn dog", calories: 220, protein: 7, carbs: 24, fat: 10 },
      { name: "Frozen Burrito", category: "Convenience", keywords: ["frozen burrito", "bean burrito", "beef burrito", "burrito"], serving: "1 burrito", calories: 320, protein: 12, carbs: 45, fat: 10 },
      { name: "Taquitos", category: "Convenience", keywords: ["taquitos"], serving: "3 taquitos", calories: 270, protein: 9, carbs: 27, fat: 14 },
      { name: "Chicken Pot Pie", category: "Convenience", keywords: ["chicken pot pie", "pot pie"], serving: "1 small pie", calories: 430, protein: 12, carbs: 42, fat: 24 },
      { name: "Frozen Dinner", category: "Convenience", keywords: ["frozen dinner", "tv dinner", "microwave meal"], serving: "1 meal", calories: 420, protein: 20, carbs: 50, fat: 15 },

      // Fast-food style items
      { name: "Burger", category: "Fast Food", keywords: ["burger", "cheeseburger", "hamburger"], serving: "1 burger", calories: 540, protein: 28, carbs: 40, fat: 30 },
      { name: "Double Cheeseburger", category: "Fast Food", keywords: ["double cheeseburger"], serving: "1 sandwich", calories: 700, protein: 40, carbs: 42, fat: 42 },
      { name: "Chicken Sandwich", category: "Fast Food", keywords: ["chicken sandwich"], serving: "1 sandwich", calories: 520, protein: 28, carbs: 45, fat: 25 },
      { name: "Fries", category: "Fast Food", keywords: ["fries", "french fries"], serving: "medium order", calories: 365, protein: 4, carbs: 48, fat: 17 },
      { name: "Pizza", category: "Fast Food", keywords: ["pizza"], serving: "1 slice", calories: 285, protein: 12, carbs: 36, fat: 10 },
      { name: "Taco", category: "Fast Food", keywords: ["taco"], serving: "1 taco", calories: 180, protein: 9, carbs: 18, fat: 9 },
      { name: "Nachos", category: "Fast Food", keywords: ["nachos"], serving: "1 order", calories: 550, protein: 18, carbs: 55, fat: 30 },

      // Produce and toppings
      { name: "Banana", category: "Produce", keywords: ["banana"], serving: "1 medium banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
      { name: "Apple", category: "Produce", keywords: ["apple"], serving: "1 medium apple", calories: 95, protein: 0, carbs: 25, fat: 0 },
      { name: "Avocado", category: "Produce", keywords: ["avocado"], serving: "1/2 avocado", calories: 160, protein: 2, carbs: 9, fat: 15 },
      { name: "Broccoli", category: "Produce", keywords: ["broccoli"], serving: "1 cup", calories: 55, protein: 4, carbs: 11, fat: 1 },
      { name: "Salad Greens", category: "Produce", keywords: ["salad", "lettuce", "greens", "spinach"], serving: "2 cups", calories: 25, protein: 2, carbs: 5, fat: 0 },
      { name: "Cheese", category: "Topping", keywords: ["cheese", "shredded cheese"], serving: "1 oz", calories: 110, protein: 7, carbs: 1, fat: 9 },
      { name: "Olive Oil", category: "Topping", keywords: ["olive oil", "oil"], serving: "1 tbsp", calories: 120, protein: 0, carbs: 0, fat: 14 },
      { name: "Butter", category: "Topping", keywords: ["butter"], serving: "1 tbsp", calories: 100, protein: 0, carbs: 0, fat: 11 },
      { name: "Peanut Butter", category: "Topping", keywords: ["peanut butter"], serving: "2 tbsp", calories: 190, protein: 8, carbs: 7, fat: 16 },
      { name: "Mayo", category: "Topping", keywords: ["mayo", "mayonnaise"], serving: "1 tbsp", calories: 95, protein: 0, carbs: 0, fat: 10 },
      { name: "Ranch", category: "Topping", keywords: ["ranch"], serving: "2 tbsp", calories: 130, protein: 1, carbs: 2, fat: 14 },
      { name: "BBQ Sauce", category: "Topping", keywords: ["bbq sauce", "barbecue sauce"], serving: "2 tbsp", calories: 60, protein: 0, carbs: 14, fat: 0 },
      { name: "Ketchup", category: "Topping", keywords: ["ketchup"], serving: "1 tbsp", calories: 20, protein: 0, carbs: 5, fat: 0 },
      { name: "Salsa", category: "Topping", keywords: ["salsa"], serving: "1/4 cup", calories: 20, protein: 1, carbs: 4, fat: 0 },
    ],
    []
  );

  const foodDatabase = useMemo(() => {
    return [...customFoods, ...baseFoodDatabase];
  }, [baseFoodDatabase, customFoods]);

  const filteredFoodOptions = useMemo(() => {
    const query = foodSearch.trim().toLowerCase();

    if (!query) {
      return foodDatabase.slice(0, 12);
    }

    return foodDatabase
      .filter((food) => {
        const nameMatch = food.name.toLowerCase().includes(query);
        const categoryMatch = String(food.category || "").toLowerCase().includes(query);
        const keywordMatch = Array.isArray(food.keywords)
          ? food.keywords.some((keyword) => keyword.toLowerCase().includes(query))
          : false;

        return nameMatch || categoryMatch || keywordMatch;
      })
      .slice(0, 12);
  }, [foodDatabase, foodSearch]);

  function getGoalLabel(value) {
    if (value === "fat-loss") return "Weight Loss";
    if (value === "muscle-gain") return "Muscle Gain";
    return "Maintain";
  }

  function escapeRegex(value) {
    return String(value).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  function readSimpleQuantity(text, keyword) {
    const escapedKeyword = escapeRegex(keyword);

    const beforePattern = new RegExp(
      "(?:^|\\b)(\\d+(?:\\.\\d+)?)\\s*(?:x|servings?|cups?|slices?|pieces?|tbsp|tablespoons?|scoops?|eggs?|oz|ounces?|cans?|bottles?|glasses?)?\\s+(?:" +
        escapedKeyword +
        ")s?\\b",
      "i"
    );

    const beforeMatch = text.match(beforePattern);
    if (beforeMatch?.[1]) {
      return Math.min(Math.max(Number(beforeMatch[1]) || 1, 0.25), 10);
    }

    const wordPattern = new RegExp("\\b(one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:" + escapedKeyword + ")s?\\b", "i");
    const wordMatch = text.match(wordPattern);

    if (wordMatch?.[1]) {
      const wordNumbers = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      return wordNumbers[wordMatch[1].toLowerCase()] || 1;
    }

    const largePattern = new RegExp("\\b(large|big|extra|double|supersize)\\b.{0,24}\\b(?:" + escapedKeyword + ")s?\\b|\\b(?:" + escapedKeyword + ")s?\\b.{0,24}\\b(large|big|extra|double|supersize)\\b", "i");
    if (largePattern.test(text)) return 1.5;

    const smallPattern = new RegExp("\\b(small|light|half|mini)\\b.{0,24}\\b(?:" + escapedKeyword + ")s?\\b|\\b(?:" + escapedKeyword + ")s?\\b.{0,24}\\b(small|light|half|mini)\\b", "i");
    if (smallPattern.test(text)) return 0.5;

    return 1;
  }

  function estimateFoodMatches(text) {
    const lowerText = text.toLowerCase();
    const usedNames = new Set();

    return foodDatabase
      .map((food) => {
        const matchedKeyword = [...(food.keywords || [food.name])]
          .sort((a, b) => b.length - a.length)
          .find((keyword) => new RegExp("\\b" + escapeRegex(keyword) + "s?\\b", "i").test(lowerText));

        if (!matchedKeyword || usedNames.has(food.name)) return null;

        usedNames.add(food.name);

        const multiplier = readSimpleQuantity(lowerText, matchedKeyword);

        return createMealItem(food, multiplier, "Text Match", matchedKeyword);
      })
      .filter(Boolean);
  }

  function createMealItem(food, quantity = 1, source = "Database", matchedKeyword = food.name) {
    const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 0.25), 10);

    return {
      id: makeId("meal-item"),
      name: food.name,
      category: food.category || source,
      serving: food.serving || "1 serving",
      matchedKeyword,
      multiplier: safeQuantity,
      calories: Math.round((Number(food.calories) || 0) * safeQuantity),
      protein: Math.round((Number(food.protein) || 0) * safeQuantity),
      carbs: Math.round((Number(food.carbs) || 0) * safeQuantity),
      fat: Math.round((Number(food.fat) || 0) * safeQuantity),
      source,
    };
  }

  function getMealTotals(items) {
    return items.reduce(
      (sum, item) => ({
        calories: sum.calories + (Number(item.calories) || 0),
        protein: sum.protein + (Number(item.protein) || 0),
        carbs: sum.carbs + (Number(item.carbs) || 0),
        fat: sum.fat + (Number(item.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  function buildCoachTip(matches) {
    const hasAlcohol = matches.some((item) => item.category === "Alcohol");
    const hasDrinkCalories = matches.some((item) =>
      ["Sweet Tea", "Kool-Aid", "Lemonade", "Regular Soda", "Sports Drink", "Energy Drink", "Orange Juice", "Apple Juice", "Chocolate Milk", "Bottled Frappuccino"].includes(item.name)
    );
    const hasConvenienceFood = matches.some((item) =>
      ["Convenience", "Snack", "Fast Food"].includes(item.category)
    );
    const hasAddedFat = matches.some((item) =>
      ["Olive Oil", "Butter", "Peanut Butter", "Mayo", "Ranch", "Avocado", "Cheese"].includes(item.name)
    );
    const hasProtein = matches.some((item) => Number(item.protein) >= 20);

    if (hasAlcohol) {
      return "Alcohol adds calories quickly and can affect recovery, sleep, hydration, and consistency. Track it honestly, check labels when possible, and avoid treating it like a normal carb/protein source.";
    }

    if (hasDrinkCalories) {
      return "Liquid calories can add up fast. Sweet tea, Kool-Aid, soda, juice, and energy drinks should be counted like food.";
    }

    if (hasConvenienceFood) {
      return "Convenience foods are easy to underestimate. Check the label when possible, especially serving size, sodium, and calories.";
    }

    if (!hasProtein) {
      return "Protein looks low from the matched foods. Add a lean protein source if this is a training meal.";
    }

    if (hasAddedFat) {
      return "Fats from sauces, oils, cheese, avocado, nuts, and dressings can move calories fast. Measure those when possible.";
    }

    return "This looks like a usable training meal. Match portions to the goal and workout timing.";
  }

  function calculateTargets(event) {
    event.preventDefault();

    const weightLb = Math.max(Number(bodyWeight) || 0, 1);
    const totalHeightInches =
      Math.max(Number(heightFeet) || 0, 0) * 12 + Math.max(Number(heightInches) || 0, 0);
    const safeHeightInches = Math.max(totalHeightInches || 70, 36);
    const safeAge = Math.min(Math.max(Number(age) || 30, 13), 90);
    const days = Math.max(Number(trainingDays) || 0, 0);

    const weightKg = weightLb / 2.20462;
    const heightCm = safeHeightInches * 2.54;

    const maleBmr = 10 * weightKg + 6.25 * heightCm - 5 * safeAge + 5;
    const femaleBmr = 10 * weightKg + 6.25 * heightCm - 5 * safeAge - 161;
    const bmr =
      genderFormula === "female"
        ? femaleBmr
        : genderFormula === "average"
          ? (maleBmr + femaleBmr) / 2
          : maleBmr;

    const activityMultiplier =
      activityLevel === "high" ? 1.65 : activityLevel === "low" ? 1.25 : 1.45;

    const maintenanceCalories = Math.round(bmr * activityMultiplier);
    const goalMultiplier = goal === "fat-loss" ? 0.82 : goal === "muscle-gain" ? 1.1 : 1;
    const minimumCalories = genderFormula === "female" ? 1200 : genderFormula === "average" ? 1350 : 1500;

    const dailyCalories = Math.max(
      Math.round(maintenanceCalories * goalMultiplier),
      goal === "fat-loss" ? minimumCalories : 0
    );

    const proteinMultiplier = goal === "fat-loss" ? 1.0 : goal === "muscle-gain" ? 0.95 : 0.85;
    const protein = Math.round(weightLb * proteinMultiplier);
    const fat = Math.round(Math.max(weightLb * 0.3, dailyCalories * 0.22 / 9));
    const carbs = Math.max(Math.round((dailyCalories - protein * 4 - fat * 9) / 4), 0);
    const calorieDifference = dailyCalories - maintenanceCalories;
    const estimatedWeeklyChange = Math.abs((calorieDifference * 7) / 3500).toFixed(1);

    const coachNote =
      goal === "fat-loss"
        ? "This uses age, height, body weight, activity, and gender/formula factor. Keep the deficit moderate and adjust from 2 weeks of scale trend, energy, and gym performance."
        : goal === "muscle-gain"
          ? "This uses a controlled surplus. Watch strength, recovery, and weekly body-weight trend before raising calories again."
          : "This is a maintenance starting point. Adjust from weekly progress, hunger, energy, and workout performance.";

    setTargetResult({
      id: makeId("nutrition-target"),
      goal,
      goalLabel: getGoalLabel(goal),
      bodyWeight: weightLb,
      heightFeet,
      heightInches,
      age: safeAge,
      genderFormula,
      trainingDays: days,
      activityLevel,
      bmr: Math.round(bmr),
      maintenanceCalories,
      dailyCalories,
      protein,
      carbs,
      fat,
      estimatedWeeklyChange,
      coachNote,
      savedAt: new Date().toLocaleString(),
    });

    setNutritionSaveStatus("");
  }

  function addSelectedFoodItem(foodOverride = null) {
    const selectedFood =
      foodOverride ||
      foodDatabase.find((food) => food.name === selectedFoodName) ||
      filteredFoodOptions[0];

    if (!selectedFood) {
      setNutritionSaveStatus("Search for a food before adding it.");
      return;
    }

    const nextItem = createMealItem(selectedFood, selectedQuantity, selectedFood.category || "Database");

    setMealItems((current) => [...current, nextItem]);
    setSelectedFoodName("");
    setFoodSearch("");
    setSelectedQuantity("1");
    setMealResult(null);
    setNutritionSaveStatus("Added " + selectedFood.name + " to the meal.");
  }

  function addManualFoodItem() {
    const name = manualFoodName.trim();

    if (!name) {
      setNutritionSaveStatus("Enter a food name from the nutrition label.");
      return;
    }

    const manualFood = {
      id: makeId("custom-food"),
      name,
      category: "Custom Label",
      keywords: [name.toLowerCase()],
      serving: manualServing.trim() || "1 serving",
      calories: Math.max(Number(manualCalories) || 0, 0),
      protein: Math.max(Number(manualProtein) || 0, 0),
      carbs: Math.max(Number(manualCarbs) || 0, 0),
      fat: Math.max(Number(manualFat) || 0, 0),
    };

    setCustomFoods((current) => [manualFood, ...current.filter((food) => food.name.toLowerCase() !== name.toLowerCase())].slice(0, 30));
    setMealItems((current) => [...current, createMealItem(manualFood, 1, "Custom Label")]);
    setManualFoodName("");
    setManualServing("1 serving");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setMealResult(null);
    setNutritionSaveStatus("Custom food saved and added to meal.");
  }

  function removeMealItem(itemId) {
    setMealItems((current) => current.filter((item) => item.id !== itemId));
    setMealResult(null);
  }

  function clearMealBuilder() {
    setMealItems([]);
    setMealText("");
    setMealResult(null);
    setNutritionSaveStatus("Meal builder cleared.");
  }

  function estimateMeal(event) {
    event.preventDefault();

    const builtMealItems = mealItems.length > 0 ? mealItems : [];
    const text = mealText.trim();
    const textMatches = builtMealItems.length > 0 ? [] : estimateFoodMatches(text);
    const matches = builtMealItems.length > 0 ? builtMealItems : textMatches;

    if (!text && matches.length === 0) {
      setMealResult({
        id: makeId("meal-estimate"),
        title: "Add a meal first",
        calories: "—",
        protein: "—",
        carbs: "—",
        fat: "—",
        confidence: "Low",
        matches: [],
        coachTip: "Search foods, add label items, or type a meal description so the estimate is useful.",
        savedAt: new Date().toLocaleString(),
      });
      setNutritionSaveStatus("");
      return;
    }

    if (matches.length === 0) {
      setMealResult({
        id: makeId("meal-estimate"),
        title: "General Meal Estimate",
        mealText: text,
        calories: 500,
        protein: 25,
        carbs: 55,
        fat: 18,
        confidence: "Low",
        matches: [],
        coachTip: "No specific foods were matched. Add label details or search foods like sweet tea, Kool-Aid, chicken, ramen, pizza rolls, chips, beer, burger, rice, eggs, oil, or cheese for a better estimate.",
        savedAt: new Date().toLocaleString(),
      });
      setNutritionSaveStatus("");
      return;
    }

    const totals = getMealTotals(matches);
    const confidence = matches.length >= 5 ? "High" : matches.length >= 2 ? "Moderate" : "Low";

    setMealResult({
      id: makeId("meal-estimate"),
      title: builtMealItems.length > 0 ? "Meal Builder Estimate" : "Meal Estimate",
      mealText: text,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      confidence,
      matches,
      coachTip: buildCoachTip(matches),
      savedAt: new Date().toLocaleString(),
    });

    setNutritionSaveStatus("");
  }

  function saveTargetResult() {
    if (!targetResult) return;

    setNutritionHistory((current) => ({
      ...current,
      targets: [{ ...targetResult, id: makeId("saved-nutrition-target"), savedAt: new Date().toLocaleString() }, ...current.targets].slice(0, 8),
    }));

    setNutritionSaveStatus("Macro target saved to nutrition history.");
  }

  function saveMealResult() {
    if (!mealResult) return;

    setNutritionHistory((current) => ({
      ...current,
      meals: [{ ...mealResult, id: makeId("saved-meal-estimate"), savedAt: new Date().toLocaleString() }, ...current.meals].slice(0, 8),
    }));

    setNutritionSaveStatus("Meal estimate saved to nutrition history.");
  }

  function resetNutritionMode() {
    setNutritionMode("");
    setTargetResult(null);
    setMealResult(null);
    setNutritionSaveStatus("");
  }

  const mealBuilderTotals = getMealTotals(mealItems);

  return (
    <section
      data-testid="nutrition-coach-window"
      aria-label="Nutrition Coach workspace"
      className="rounded-3xl border border-[#00BF63]/25 bg-black/70 p-5 shadow-2xl shadow-black/40"
    >
      <div className="rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00BF63]">
          No Limit Nutrition Coach
        </p>
        <h2 className="mt-3 text-3xl font-black uppercase text-white">
          Build your target. Check your meals. Stay consistent.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
          A practical nutrition tool with a searchable food database, manual label entry, custom foods, meal totals, and saved history.
        </p>
      </div>

      <ClientWeeklyNutritionCheckInForm />

      <ClientProgressPhotoUploadPanel />

      {!nutritionMode && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            aria-label="Build My Target"
            onClick={() => {
              setNutritionMode("target");
              setTargetResult(null);
              setNutritionSaveStatus("");
            }}
            className="rounded-3xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-5 text-left transition hover:border-[#00BF63] hover:bg-[#00BF63]/15"
          >
            <span className="block text-lg font-black uppercase text-white">
              Build My Target
            </span>
            <span className="mt-2 block text-sm leading-6 text-white/65">
              Calculate calories and macros using age, height, gender/formula factor, body weight, activity, and goal.
            </span>
          </button>

          <button
            type="button"
            aria-label="Check What I Ate"
            onClick={() => {
              setNutritionMode("meal");
              setMealResult(null);
              setNutritionSaveStatus("");
            }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-[#00BF63]/60 hover:bg-white/[0.06]"
          >
            <span className="block text-lg font-black uppercase text-white">
              Check What I Ate
            </span>
            <span className="mt-2 block text-sm leading-6 text-white/65">
              Search foods, add label items, build a meal, and save the estimate.
            </span>
          </button>
        </div>
      )}

      {nutritionMode === "target" && (
        <form
          data-testid="macro-target-calculator"
          onSubmit={calculateTargets}
          className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5"
        >
          <button
            type="button"
            onClick={resetNutritionMode}
            className="mb-4 rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase text-white/70"
          >
            Start Over
          </button>

          <h3 className="text-xl font-black uppercase text-white">Macro Target Calculator</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Uses a BMR-based starting point, then adjusts for activity and goal. Review and adjust from real progress.
          </p>

          <div
            data-testid="featured-nutrition-goal-selector"
            className="mx-auto mt-6 max-w-2xl rounded-[2rem] border-2 border-[#00BF63] bg-[#00BF63]/15 p-5 text-center shadow-2xl shadow-[#00BF63]/20"
          >
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
              Primary Goal
            </p>
            <h4 className="mt-2 text-2xl font-black uppercase text-white">
              Choose The Main Outcome First
            </h4>
            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-white/65">
              This drives the calorie adjustment, macro split, weekly trend estimate, and coach recommendation.
            </p>

            <label className="mx-auto mt-5 block max-w-md space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                Goal
              </span>
              <select
                aria-label="Nutrition Goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="w-full rounded-3xl border-2 border-[#00BF63] bg-black px-5 py-4 text-center text-base font-black uppercase tracking-[0.12em] text-white shadow-xl shadow-[#00BF63]/20 outline-none transition focus:border-white focus:ring-4 focus:ring-[#00BF63]/25"
              >
                <option value="fat-loss">Weight Loss</option>
                <option value="maintain">Maintain</option>
                <option value="muscle-gain">Muscle Gain</option>
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-white/50">Body Weight</span>
              <input aria-label="Body Weight" value={bodyWeight} onChange={(event) => setBodyWeight(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="180" />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-white/50">Height Feet</span>
              <input aria-label="Height Feet" value={heightFeet} onChange={(event) => setHeightFeet(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="5" />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-white/50">Height Inches</span>
              <input aria-label="Height Inches" value={heightInches} onChange={(event) => setHeightInches(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="10" />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-white/50">Age</span>
              <input aria-label="Age" value={age} onChange={(event) => setAge(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="30" />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-white/50">Gender / Formula</span>
              <select aria-label="Gender Formula" value={genderFormula} onChange={(event) => setGenderFormula(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
                <option value="male">Male Formula</option>
                <option value="female">Female Formula</option>
                <option value="average">Average Formula</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-white/50">Training Days</span>
              <input aria-label="Training Days" value={trainingDays} onChange={(event) => setTrainingDays(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="4" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-black uppercase text-white/50">Activity</span>
              <select aria-label="Activity Level" value={activityLevel} onChange={(event) => setActivityLevel(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]">
                <option value="low">Low Activity</option>
                <option value="moderate">Moderate Activity</option>
                <option value="high">High Activity</option>
              </select>
            </label>
          </div>

          <button type="submit" className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white">
            Calculate Targets
          </button>

          {targetResult && (
            <div data-testid="nutrition-target-result" className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5">
              <h4 className="text-lg font-black uppercase text-white">Daily Nutrition Targets</h4>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">BMR Estimate</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.bmr}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Maintenance</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.maintenanceCalories}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Daily Calories</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.dailyCalories}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Protein Goal</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.protein}g</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Carbs</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.carbs}g</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Fats</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.fat}g</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Weekly Trend</p>
                  <p className="mt-1 text-2xl font-black text-white">{targetResult.estimatedWeeklyChange} lb</p>
                </div>
              </div>

              <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
                Coach Tip: {targetResult.coachNote}
              </p>

              <button type="button" onClick={saveTargetResult} className="mt-4 rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black">
                Save Macro Target
              </button>
            </div>
          )}
        </form>
      )}

      {nutritionMode === "meal" && (
        <form data-testid="meal-check-estimator" onSubmit={estimateMeal} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <button type="button" onClick={resetNutritionMode} className="mb-4 rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase text-white/70">
            Start Over
          </button>

          <h3 className="text-xl font-black uppercase text-white">Advanced Meal Logger</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Search common foods, add exact nutrition-label values, build a meal total, or use the text estimator as a fallback.
          </p>

          <section data-testid="food-search-builder" className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.5fr]">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Search Food Database</span>
                <input
                  aria-label="Search Food Database"
                  value={foodSearch}
                  onChange={(event) => {
                    setFoodSearch(event.target.value);
                    setSelectedFoodName("");
                  }}
                  className="w-full rounded-2xl border border-[#00BF63]/30 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                  placeholder="Search sweet tea, Kool-Aid, beer, ramen, chicken, chips..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Quantity</span>
                <input
                  aria-label="Food Quantity"
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-[#00BF63]/30 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                  placeholder="1"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {filteredFoodOptions.map((food) => (
                <button
                  key={food.name}
                  type="button"
                  onClick={() => {
                    setSelectedFoodName(food.name);
                    addSelectedFoodItem(food);
                  }}
                  className="rounded-2xl border border-white/10 bg-black/40 p-3 text-left transition hover:border-[#00BF63]"
                >
                  <span className="block text-sm font-black text-white">Add {food.name}</span>
                  <span className="block text-xs font-bold uppercase text-[#00BF63]">
                    {food.category} | {food.serving}
                  </span>
                  <span className="mt-1 block text-xs text-white/50">
                    {food.calories} cal | {food.protein}g protein | {food.carbs}g carbs | {food.fat}g fat
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section data-testid="manual-label-entry" className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
              Manual Label Entry
            </p>
            <h4 className="mt-2 text-lg font-black uppercase text-white">
              Add Exact Package Or Restaurant Macros
            </h4>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Use this when the item is not in the database or the label is more accurate than the estimate.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-6">
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase text-white/50">Food Name</span>
                <input aria-label="Manual Food Name" value={manualFoodName} onChange={(event) => setManualFoodName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="Dollar General frozen meal" />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Serving</span>
                <input aria-label="Manual Serving" value={manualServing} onChange={(event) => setManualServing(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="1 tray" />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Calories</span>
                <input aria-label="Manual Calories" value={manualCalories} onChange={(event) => setManualCalories(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="420" />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Protein</span>
                <input aria-label="Manual Protein" value={manualProtein} onChange={(event) => setManualProtein(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="22" />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Carbs</span>
                <input aria-label="Manual Carbs" value={manualCarbs} onChange={(event) => setManualCarbs(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="45" />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-white/50">Fat</span>
                <input aria-label="Manual Fat" value={manualFat} onChange={(event) => setManualFat(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]" placeholder="14" />
              </label>
            </div>

            <button type="button" onClick={addManualFoodItem} className="mt-4 rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black">
              Add Manual Label Food
            </button>
          </section>

          <section data-testid="meal-builder-total" className="mt-5 rounded-3xl border border-white/10 bg-black/50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Meal Builder
                </p>
                <h4 className="mt-2 text-lg font-black uppercase text-white">
                  Current Meal Total
                </h4>
              </div>
              <button type="button" onClick={clearMealBuilder} className="w-fit rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase text-white/55 transition hover:border-red-400 hover:text-red-300">
                Clear Meal
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-black uppercase text-[#00BF63]">Calories</p>
                <p className="mt-1 text-2xl font-black text-white">{mealBuilderTotals.calories}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-black uppercase text-[#00BF63]">Protein</p>
                <p className="mt-1 text-2xl font-black text-white">{mealBuilderTotals.protein}g</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-black uppercase text-[#00BF63]">Carbs</p>
                <p className="mt-1 text-2xl font-black text-white">{mealBuilderTotals.carbs}g</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-black uppercase text-[#00BF63]">Fat</p>
                <p className="mt-1 text-2xl font-black text-white">{mealBuilderTotals.fat}g</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {mealItems.length > 0 ? (
                mealItems.map((item) => (
                  <div key={item.id} data-testid="meal-builder-item" className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black text-white">{item.name}</p>
                      <p className="text-xs font-bold uppercase text-[#00BF63]">
                        {item.multiplier} serving(s) | {item.serving} | {item.category}
                      </p>
                      <p className="text-xs text-white/45">
                        {item.calories} cal | {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fat
                      </p>
                    </div>
                    <button type="button" onClick={() => removeMealItem(item.id)} className="w-fit rounded-full border border-red-400/40 px-3 py-2 text-xs font-black uppercase text-red-300">
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/45">
                  No meal items added yet. Search foods or enter a label above.
                </p>
              )}
            </div>
          </section>

          <label className="mt-5 block space-y-2">
            <span className="text-xs font-black uppercase text-white/50">Fallback Meal Description</span>
            <textarea
              aria-label="Meal Description"
              value={mealText}
              onChange={(event) => setMealText(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="Example: moderate sweet tea, 2 beers, ramen, chips, and 2 hot dogs"
            />
          </label>

          <p className="mt-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs font-bold leading-5 text-yellow-100/80">
            Food and alcohol estimates are for nutrition tracking only. Labels vary by brand, serving size, container size, proof, and preparation.
          </p>

          <button type="submit" className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white">
            Estimate Meal
          </button>

          {mealResult && (
            <div data-testid="meal-check-result" className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="text-lg font-black uppercase text-white">{mealResult.title}</h4>
                  <p className="mt-1 text-sm font-bold text-white/55">
                    Estimate Confidence: {mealResult.confidence}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs font-black uppercase text-white/55">
                  Advanced logger
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Calories</p>
                  <p className="mt-1 text-2xl font-black text-white">{mealResult.calories}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Protein</p>
                  <p className="mt-1 text-2xl font-black text-white">{mealResult.protein}g</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Carbs</p>
                  <p className="mt-1 text-2xl font-black text-white">{mealResult.carbs}g</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Fats</p>
                  <p className="mt-1 text-2xl font-black text-white">{mealResult.fat}g</p>
                </div>
              </div>

              {mealResult.matches.length > 0 && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                    Matched Foods
                  </p>
                  <div className="mt-3 grid gap-2">
                    {mealResult.matches.map((item) => (
                      <div key={item.id || item.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70">
                        <span className="font-black text-white">{item.name}</span>
                        <span className="text-white/45"> — {item.multiplier} serving(s), base: {item.serving}</span>
                        <span className="block text-xs font-bold uppercase text-[#00BF63]">
                          {item.calories} cal | {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fat
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
                Coach Tip: {mealResult.coachTip}
              </p>

              <button type="button" onClick={saveMealResult} className="mt-4 rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black">
                Save Meal Estimate
              </button>
            </div>
          )}
        </form>
      )}

      {nutritionSaveStatus && (
        <p data-testid="nutrition-save-status" className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]">
          {nutritionSaveStatus}
        </p>
      )}

      {(nutritionHistory.targets.length > 0 || nutritionHistory.meals.length > 0) && (
        <section data-testid="nutrition-history-panel" className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
            Saved Nutrition History
          </p>
          <h3 className="mt-2 text-xl font-black uppercase text-white">
            Recent Targets And Meals
          </h3>

          {nutritionHistory.targets.length > 0 && (
            <div className="mt-4 grid gap-3">
              {nutritionHistory.targets.slice(0, 3).map((item) => (
                <div key={item.id} data-testid="saved-nutrition-target" className="rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
                  <p className="text-sm font-black text-white">
                    {item.goalLabel} — {item.dailyCalories} calories
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase text-white/55">
                    {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fats | saved {item.savedAt}
                  </p>
                </div>
              ))}
            </div>
          )}

          {nutritionHistory.meals.length > 0 && (
            <div className="mt-4 grid gap-3">
              {nutritionHistory.meals.slice(0, 3).map((item) => (
                <div key={item.id} data-testid="saved-meal-estimate" className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-sm font-black text-white">
                    {item.title} — {item.calories} calories
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase text-white/55">
                    {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fats | confidence {item.confidence}
                  </p>
                  {item.mealText && (
                    <p className="mt-2 text-sm text-white/50">{item.mealText}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}


﻿function WeeklyNutritionCheckInReport({ nutritionHistory }) {
  const WEEKLY_CHECK_IN_STORAGE_KEY = "nlf-weekly-nutrition-checkin-v1";

  function readSavedCheckIn() {
    if (typeof window === "undefined") {
      return {
        startingWeight: "",
        endingWeight: "",
        checkInNotes: "",
      };
    }

    try {
      const raw = window.localStorage.getItem(WEEKLY_CHECK_IN_STORAGE_KEY);
      if (!raw) {
        return {
          startingWeight: "",
          endingWeight: "",
          checkInNotes: "",
        };
      }

      const parsed = JSON.parse(raw);

      return {
        startingWeight: parsed.startingWeight || "",
        endingWeight: parsed.endingWeight || "",
        checkInNotes: parsed.checkInNotes || "",
      };
    } catch {
      return {
        startingWeight: "",
        endingWeight: "",
        checkInNotes: "",
      };
    }
  }

  const savedCheckIn = readSavedCheckIn();
  const [startingWeight, setStartingWeight] = useState(savedCheckIn.startingWeight);
  const [endingWeight, setEndingWeight] = useState(savedCheckIn.endingWeight);
  const [checkInNotes, setCheckInNotes] = useState(savedCheckIn.checkInNotes);
  const [checkInStatus, setCheckInStatus] = useState("");

  const savedTargets = Array.isArray(nutritionHistory?.targets) ? nutritionHistory.targets : [];
  const savedMeals = Array.isArray(nutritionHistory?.meals) ? nutritionHistory.meals : [];
  const latestTarget = savedTargets[0] || null;

  const numericMeals = savedMeals.filter((meal) => Number.isFinite(Number(meal.calories)));

  const mealTotals = numericMeals.reduce(
    (sum, meal) => ({
      calories: sum.calories + (Number(meal.calories) || 0),
      protein: sum.protein + (Number(meal.protein) || 0),
      carbs: sum.carbs + (Number(meal.carbs) || 0),
      fat: sum.fat + (Number(meal.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const mealCount = numericMeals.length || 0;
  const averageMealCalories = mealCount ? Math.round(mealTotals.calories / mealCount) : 0;
  const averageProtein = mealCount ? Math.round(mealTotals.protein / mealCount) : 0;
  const averageCarbs = mealCount ? Math.round(mealTotals.carbs / mealCount) : 0;
  const averageFat = mealCount ? Math.round(mealTotals.fat / mealCount) : 0;

  const proteinReadyMeals = numericMeals.filter((meal) => Number(meal.protein) >= 25);
  const proteinConsistency = mealCount ? Math.round((proteinReadyMeals.length / mealCount) * 100) : 0;

  const alcoholMeals = savedMeals.filter((meal) =>
    Array.isArray(meal.matches) &&
    meal.matches.some((item) =>
      String(item.category || "").toLowerCase() === "alcohol" ||
      /beer|vodka|whiskey|tequila|malt liquor|seltzer|wine|cocktail|margarita/i.test(String(item.name || ""))
    )
  );

  const liquidCalorieMeals = savedMeals.filter((meal) =>
    Array.isArray(meal.matches) &&
    meal.matches.some((item) =>
      /sweet tea|kool-aid|koolaid|soda|juice|lemonade|energy drink|frappuccino|chocolate milk/i.test(String(item.name || ""))
    )
  );

  const convenienceMeals = savedMeals.filter((meal) =>
    Array.isArray(meal.matches) &&
    meal.matches.some((item) =>
      /Convenience|Snack|Fast Food/i.test(String(item.category || ""))
    )
  );

  const highCalorieMeals = savedMeals.filter((meal) => Number(meal.calories) >= 800);

  const startWeightNumber = Number(startingWeight);
  const endWeightNumber = Number(endingWeight);
  const hasWeightTrend = Number.isFinite(startWeightNumber) && startWeightNumber > 0 && Number.isFinite(endWeightNumber) && endWeightNumber > 0;
  const weightChange = hasWeightTrend ? Number((endWeightNumber - startWeightNumber).toFixed(1)) : 0;
  const weightTrendLabel = !hasWeightTrend
    ? "Add weights"
    : weightChange < 0
      ? Math.abs(weightChange).toFixed(1) + " lb down"
      : weightChange > 0
        ? weightChange.toFixed(1) + " lb up"
        : "No change";

  const primaryRecommendation =
    mealCount < 3
      ? "Get at least 3 saved meal logs before making a major calorie change."
      : alcoholMeals.length > 0
        ? "Address alcohol first before cutting food calories. Alcohol can affect recovery, sleep, hydration, and consistency."
        : liquidCalorieMeals.length > 0
          ? "Start with liquid calories. Sweet tea, Kool-Aid, soda, juice, and coffee drinks can be reduced without changing meals much."
          : proteinConsistency < 60
            ? "Improve protein consistency before changing calories. Aim for a clear protein source in most meals."
            : highCalorieMeals.length > 0
              ? "Audit high-calorie meals for serving size, sauces, oils, snacks, and drink calories."
              : "Nutrition logs look usable. Make small adjustments based on weight trend, hunger, energy, and training performance.";

  const weightRecommendation =
    !hasWeightTrend
      ? "Enter starting and ending weight to compare nutrition logs against scale trend."
      : latestTarget?.goal === "fat-loss" && weightChange > 0
        ? "Weight is trending up during a weight-loss goal. Review adherence, drinks, alcohol, snacks, and portions before lowering calories."
        : latestTarget?.goal === "fat-loss" && weightChange < -2
          ? "Weight is dropping quickly. Check energy, hunger, sleep, and workout performance before keeping the deficit this aggressive."
          : latestTarget?.goal === "muscle-gain" && weightChange <= 0
            ? "Muscle-gain goal is not showing a weight increase. Consider a small calorie increase if training performance and adherence are strong."
            : "Weight trend is reasonable. Keep the plan steady unless energy, hunger, or performance says otherwise.";

  function saveWeeklyCheckIn() {
    const payload = {
      startingWeight,
      endingWeight,
      checkInNotes,
      savedAt: new Date().toLocaleString(),
    };

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WEEKLY_CHECK_IN_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore local storage failures in restricted browser modes.
      }
    }

    setCheckInStatus("Weekly nutrition check-in saved.");
  }

  return (
    <section
      data-testid="weekly-nutrition-checkin-panel"
      aria-label="Weekly nutrition check-in report"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Weekly Check-In
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Nutrition Report
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Summarize saved meals, protein consistency, drink/alcohol flags, convenience-food patterns, and weight trend before making adjustments.
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black uppercase text-white/55">
          {mealCount} meal log(s)
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/50">Starting Weight</span>
          <input
            aria-label="Weekly Starting Weight"
            value={startingWeight}
            onChange={(event) => setStartingWeight(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="200"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/50">Ending Weight</span>
          <input
            aria-label="Weekly Ending Weight"
            value={endingWeight}
            onChange={(event) => setEndingWeight(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="198.5"
          />
        </label>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-[#00BF63]">Weight Trend</p>
          <p className="mt-1 text-2xl font-black text-white">{weightTrendLabel}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-[#00BF63]">Latest Goal</p>
          <p className="mt-1 text-2xl font-black text-white">{latestTarget?.goalLabel || "—"}</p>
        </div>
      </div>

      <div
        data-testid="weekly-nutrition-summary"
        className="mt-5 grid gap-3 md:grid-cols-4"
      >
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-white/45">Avg Meal Calories</p>
          <p className="mt-1 text-3xl font-black text-white">{averageMealCalories}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-white/45">Avg Protein</p>
          <p className="mt-1 text-3xl font-black text-white">{averageProtein}g</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-white/45">Avg Carbs</p>
          <p className="mt-1 text-3xl font-black text-white">{averageCarbs}g</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-white/45">Avg Fat</p>
          <p className="mt-1 text-3xl font-black text-white">{averageFat}g</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#00BF63]/20 bg-black/40 p-4">
          <p className="text-xs font-black uppercase text-[#00BF63]">Protein Consistency</p>
          <p className="mt-1 text-3xl font-black text-white">{proteinConsistency}%</p>
        </div>
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
          <p className="text-xs font-black uppercase text-red-100/70">Alcohol Logs</p>
          <p className="mt-1 text-3xl font-black text-white">{alcoholMeals.length}</p>
        </div>
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
          <p className="text-xs font-black uppercase text-yellow-100/70">Liquid Calories</p>
          <p className="mt-1 text-3xl font-black text-white">{liquidCalorieMeals.length}</p>
        </div>
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4">
          <p className="text-xs font-black uppercase text-orange-100/70">Convenience Logs</p>
          <p className="mt-1 text-3xl font-black text-white">{convenienceMeals.length}</p>
        </div>
      </div>

      <div
        data-testid="weekly-nutrition-recommendations"
        className="mt-5 grid gap-3 md:grid-cols-2"
      >
        <div className="rounded-3xl border border-[#00BF63]/20 bg-black/40 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Main Adjustment
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/70">
            {primaryRecommendation}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Weight Trend Decision
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/70">
            {weightRecommendation}
          </p>
        </div>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
          Weekly Coach Notes
        </span>
        <textarea
          aria-label="Weekly Coach Nutrition Notes"
          value={checkInNotes}
          onChange={(event) => setCheckInNotes(event.target.value)}
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
          placeholder="Example: Keep protein consistent, replace sweet tea during the week, limit alcohol to one planned day, and recheck weight trend next week."
        />
      </label>

      <button
        type="button"
        onClick={saveWeeklyCheckIn}
        className="mt-4 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
      >
        Save Weekly Check-In
      </button>

      {checkInStatus && (
        <p
          data-testid="weekly-nutrition-checkin-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {checkInStatus}
        </p>
      )}
    </section>
  );
}

﻿﻿function CoachProgressPhotoReviewPanel() {
  const PROGRESS_PHOTOS_STORAGE_KEY = "nlf-client-progress-photos-v1";
  const COACH_PROGRESS_PHOTO_NOTES_STORAGE_KEY = "nlf-coach-progress-photo-review-notes-v1";

  function readSavedProgressPhotos() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(PROGRESS_PHOTOS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function readCoachPhotoNotes() {
    if (typeof window === "undefined") return "";

    try {
      return window.localStorage.getItem(COACH_PROGRESS_PHOTO_NOTES_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  const [progressPhotoCheckIns, setProgressPhotoCheckIns] = useState(readSavedProgressPhotos);
  const [coachPhotoNotes, setCoachPhotoNotes] = useState(readCoachPhotoNotes);
  const [photoReviewStatus, setPhotoReviewStatus] = useState("");

  const latestPhotoCheckIn = progressPhotoCheckIns[0] || null;

  function refreshProgressPhotos() {
    setProgressPhotoCheckIns(readSavedProgressPhotos());
    setPhotoReviewStatus("Progress photo review refreshed.");
  }

  function saveCoachPhotoReviewNotes() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COACH_PROGRESS_PHOTO_NOTES_STORAGE_KEY, coachPhotoNotes);
      } catch {
        // Ignore local storage failures in restricted browser modes.
      }
    }

    setPhotoReviewStatus("Coach progress photo notes saved.");
  }

  return (
    <section
      data-testid="coach-progress-photo-review-panel"
      aria-label="Coach progress photo review"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Progress Photo Review
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Front, Side, And Back Comparison
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Review the latest saved progress photos alongside check-in notes, weight trend, and nutrition adherence.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshProgressPhotos}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Progress Photos
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Saved Photo Check-Ins</p>
          <p className="mt-1 text-3xl font-black text-white">{progressPhotoCheckIns.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Latest Date</p>
          <p className="mt-1 text-3xl font-black text-white">{latestPhotoCheckIn?.photoDate || "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Angles Saved</p>
          <p className="mt-1 text-3xl font-black text-white">
            {latestPhotoCheckIn
              ? [latestPhotoCheckIn.frontPhoto, latestPhotoCheckIn.sidePhoto, latestPhotoCheckIn.backPhoto].filter(Boolean).length
              : 0}
            /3
          </p>
        </div>
      </div>

      {latestPhotoCheckIn ? (
        <div
          data-testid="coach-latest-progress-photo-checkin"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Photo Check-In
          </p>
          <h4 className="mt-2 text-xl font-black text-white">
            {latestPhotoCheckIn.photoDate || "Latest Photo Check-In"}
          </h4>

          {latestPhotoCheckIn.photoCheckInNotes && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Client Photo Notes: {latestPhotoCheckIn.photoCheckInNotes}
            </p>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Front</p>
              {latestPhotoCheckIn.frontPhoto ? (
                <img
                  data-testid="coach-front-progress-photo"
                  src={latestPhotoCheckIn.frontPhoto.dataUrl}
                  alt="Coach front progress review"
                  className="mt-3 h-72 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/40">
                  No front photo saved.
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-white/55">
                {latestPhotoCheckIn.frontPhotoNote || "No front note."}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Side</p>
              {latestPhotoCheckIn.sidePhoto ? (
                <img
                  data-testid="coach-side-progress-photo"
                  src={latestPhotoCheckIn.sidePhoto.dataUrl}
                  alt="Coach side progress review"
                  className="mt-3 h-72 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/40">
                  No side photo saved.
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-white/55">
                {latestPhotoCheckIn.sidePhotoNote || "No side note."}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Back</p>
              {latestPhotoCheckIn.backPhoto ? (
                <img
                  data-testid="coach-back-progress-photo"
                  src={latestPhotoCheckIn.backPhoto.dataUrl}
                  alt="Coach back progress review"
                  className="mt-3 h-72 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-white/10 p-4 text-sm font-bold text-white/40">
                  No back photo saved.
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-white/55">
                {latestPhotoCheckIn.backPhotoNote || "No back note."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No progress photos saved yet. Ask the client to upload front, side, and back photos from Nutrition Coach.
        </p>
      )}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Coach Progress Photo Notes
          </span>
          <textarea
            aria-label="Coach Progress Photo Notes"
            value={coachPhotoNotes}
            onChange={(event) => setCoachPhotoNotes(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Example: Waist appears tighter from side view. Keep calories steady and compare same lighting next week."
          />
        </label>

        <button
          type="button"
          onClick={saveCoachPhotoReviewNotes}
          className="mt-4 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
        >
          Save Coach Photo Notes
        </button>
      </div>

      {photoReviewStatus && (
        <p
          data-testid="coach-progress-photo-review-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {photoReviewStatus}
        </p>
      )}
    </section>
  );
}

function CoachClientWeeklyCheckInPanel() {
  const CLIENT_WEEKLY_CHECKINS_STORAGE_KEY = "nlf-client-weekly-checkins-v1";
  const COACH_CLIENT_CHECKIN_NOTES_STORAGE_KEY = "nlf-coach-client-checkin-notes-v1";

  function readClientCheckIns() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function readCoachNotes() {
    if (typeof window === "undefined") return "";

    try {
      return window.localStorage.getItem(COACH_CLIENT_CHECKIN_NOTES_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  const [clientCheckIns, setClientCheckIns] = useState(readClientCheckIns);
  const [coachCheckInNotes, setCoachCheckInNotes] = useState(readCoachNotes);
  const [coachCheckInStatus, setCoachCheckInStatus] = useState("");

  const latestCheckIn = clientCheckIns[0] || null;
  const previousCheckIn = clientCheckIns[1] || null;

  const latestWeight = Number(latestCheckIn?.checkInWeight);
  const previousWeight = Number(previousCheckIn?.checkInWeight);
  const hasWeightChange = Number.isFinite(latestWeight) && Number.isFinite(previousWeight);
  const weightChange = hasWeightChange ? Number((latestWeight - previousWeight).toFixed(1)) : 0;
  const weightChangeLabel = !hasWeightChange
    ? "Need 2 check-ins"
    : weightChange < 0
      ? Math.abs(weightChange).toFixed(1) + " lb down"
      : weightChange > 0
        ? weightChange.toFixed(1) + " lb up"
        : "No change";

  const lowAdherence = Number(latestCheckIn?.adherenceScore) < 75;
  const highHunger = Number(latestCheckIn?.hungerScore) >= 4;
  const lowEnergy = Number(latestCheckIn?.energyScore) <= 2;
  const poorSleep = Number(latestCheckIn?.sleepScore) <= 2;
  const highStress = Number(latestCheckIn?.stressScore) >= 4;
  const lowRecovery = Number(latestCheckIn?.recoveryScore) <= 2;
  const photoNotesLogged = Boolean(
    latestCheckIn?.frontPhotoNote ||
      latestCheckIn?.sidePhotoNote ||
      latestCheckIn?.backPhotoNote
  );

  function refreshClientCheckIns() {
    setClientCheckIns(readClientCheckIns());
    setCoachCheckInStatus("Client weekly check-ins refreshed.");
  }

  function saveCoachClientCheckInNotes() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COACH_CLIENT_CHECKIN_NOTES_STORAGE_KEY, coachCheckInNotes);
      } catch {
        // Ignore local storage failures in restricted browser modes.
      }
    }

    setCoachCheckInStatus("Coach check-in notes saved.");
  }

  return (
    <section
      data-testid="coach-client-weekly-checkin-panel"
      aria-label="Coach client weekly check-in review"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Client Check-In Review
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Weekly Client Feedback
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Review the client’s weekly weight, adherence, hunger, energy, sleep, stress, recovery, and progress-photo notes.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshClientCheckIns}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Client Check-Ins
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Saved Check-Ins</p>
          <p className="mt-1 text-3xl font-black text-white">{clientCheckIns.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Latest Weight</p>
          <p className="mt-1 text-3xl font-black text-white">{latestCheckIn?.checkInWeight || "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Weight Change</p>
          <p className="mt-1 text-3xl font-black text-white">{weightChangeLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Adherence</p>
          <p className="mt-1 text-3xl font-black text-white">{latestCheckIn?.adherenceScore || "—"}%</p>
        </div>
      </div>

      {latestCheckIn ? (
        <div
          data-testid="coach-latest-client-checkin"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Client Check-In
          </p>
          <h4 className="mt-2 text-xl font-black text-white">
            {latestCheckIn.checkInDate || "Latest Week"} — {latestCheckIn.checkInWeight || "—"} lb
          </h4>

          <div className="mt-4 grid gap-3 md:grid-cols-6">
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Protein {latestCheckIn.proteinConsistency}/5
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Hunger {latestCheckIn.hungerScore}/5
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Energy {latestCheckIn.energyScore}/5
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Sleep {latestCheckIn.sleepScore}/5
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Stress {latestCheckIn.stressScore}/5
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Recovery {latestCheckIn.recoveryScore}/5
            </p>
          </div>

          {latestCheckIn.clientCheckInNotes && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Client Notes: {latestCheckIn.clientCheckInNotes}
            </p>
          )}

          {(latestCheckIn.frontPhotoNote || latestCheckIn.sidePhotoNote || latestCheckIn.backPhotoNote) && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                Progress Photo Notes
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-white/60">
                  Front: {latestCheckIn.frontPhotoNote || "—"}
                </p>
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-white/60">
                  Side: {latestCheckIn.sidePhotoNote || "—"}
                </p>
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-white/60">
                  Back: {latestCheckIn.backPhotoNote || "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No client weekly check-ins saved yet.
        </p>
      )}

      {(lowAdherence || highHunger || lowEnergy || poorSleep || highStress || lowRecovery || photoNotesLogged) && (
        <div
          data-testid="coach-client-checkin-flags"
          className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">
            Client Check-In Flags
          </p>

          <div className="mt-3 grid gap-2">
            {lowAdherence && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Adherence is below 75%. Review barriers before changing calories.
              </p>
            )}
            {highHunger && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Hunger is high. Review protein, fiber, meal timing, sleep, and deficit size.
              </p>
            )}
            {lowEnergy && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Energy is low. Check sleep, recovery, calories, alcohol, and training load.
              </p>
            )}
            {poorSleep && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Sleep score is poor. Avoid aggressive adjustments until sleep improves.
              </p>
            )}
            {highStress && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Stress is high. Keep the plan simple and focus on consistency.
              </p>
            )}
            {lowRecovery && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Recovery is low. Review training volume, sleep, calories, and hydration.
              </p>
            )}
            {photoNotesLogged && (
              <p className="rounded-2xl border border-[#00BF63]/20 bg-black/30 p-3 text-sm font-bold text-[#00BF63]">
                Progress photo notes were logged. Compare visual trend with scale and adherence before changing the plan.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Coach Check-In Notes
          </span>
          <textarea
            aria-label="Coach Client Check-In Notes"
            value={coachCheckInNotes}
            onChange={(event) => setCoachCheckInNotes(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Example: Address sleep first, keep calories steady, and compare next progress photos before changing macros."
          />
        </label>

        <button
          type="button"
          onClick={saveCoachClientCheckInNotes}
          className="mt-4 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
        >
          Save Coach Check-In Notes
        </button>
      </div>

      {coachCheckInStatus && (
        <p
          data-testid="coach-client-checkin-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {coachCheckInStatus}
        </p>
      )}
    </section>
  );
}

function CoachNutritionReviewPanel() {
  const NUTRITION_HISTORY_STORAGE_KEY = "nlf-nutrition-history-v1";
  const COACH_NUTRITION_NOTES_STORAGE_KEY = "nlf-coach-nutrition-review-notes-v1";

  function readNutritionHistory() {
    if (typeof window === "undefined") return { targets: [], meals: [] };

    try {
      const raw = window.localStorage.getItem(NUTRITION_HISTORY_STORAGE_KEY);
      if (!raw) return { targets: [], meals: [] };

      const parsed = JSON.parse(raw);

      return {
        targets: Array.isArray(parsed.targets) ? parsed.targets : [],
        meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      };
    } catch {
      return { targets: [], meals: [] };
    }
  }

  function readCoachNutritionNotes() {
    if (typeof window === "undefined") return "";

    try {
      return window.localStorage.getItem(COACH_NUTRITION_NOTES_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  const [nutritionHistory, setNutritionHistory] = useState(readNutritionHistory);
  const [coachNutritionNotes, setCoachNutritionNotes] = useState(readCoachNutritionNotes);
  const [reviewStatus, setReviewStatus] = useState("");

  const savedTargets = Array.isArray(nutritionHistory.targets) ? nutritionHistory.targets : [];
  const savedMeals = Array.isArray(nutritionHistory.meals) ? nutritionHistory.meals : [];

  const latestTarget = savedTargets[0] || null;
  const latestMeal = savedMeals[0] || null;

  const alcoholMeals = savedMeals.filter((meal) =>
    Array.isArray(meal.matches) &&
    meal.matches.some((item) =>
      String(item.category || "").toLowerCase() === "alcohol" ||
      /beer|vodka|whiskey|tequila|malt liquor|seltzer|wine|cocktail|margarita/i.test(String(item.name || ""))
    )
  );

  const liquidCalorieMeals = savedMeals.filter((meal) =>
    Array.isArray(meal.matches) &&
    meal.matches.some((item) =>
      /sweet tea|kool-aid|koolaid|soda|juice|lemonade|energy drink|frappuccino|chocolate milk/i.test(String(item.name || ""))
    )
  );

  const convenienceMeals = savedMeals.filter((meal) =>
    Array.isArray(meal.matches) &&
    meal.matches.some((item) =>
      /Convenience|Snack|Fast Food/i.test(String(item.category || ""))
    )
  );

  const highCalorieMeals = savedMeals.filter((meal) => Number(meal.calories) >= 800);

  function refreshNutritionReview() {
    setNutritionHistory(readNutritionHistory());
    setReviewStatus("Nutrition review refreshed.");
  }

  function saveCoachNutritionNotes() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COACH_NUTRITION_NOTES_STORAGE_KEY, coachNutritionNotes);
      } catch {
        // Ignore local storage failures in restricted browser modes.
      }
    }

    setReviewStatus("Coach nutrition notes saved.");
  }

  return (
    <section
      data-testid="coach-nutrition-review-panel"
      aria-label="Coach nutrition review"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-5 shadow-xl shadow-black/30"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Nutrition Review
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Client Nutrition Activity
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Review saved macro targets, meals, alcohol/liquid-calorie flags, convenience-food patterns, and coach notes.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshNutritionReview}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Nutrition Review
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Saved Targets</p>
          <p className="mt-1 text-3xl font-black text-white">{savedTargets.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Saved Meals</p>
          <p className="mt-1 text-3xl font-black text-white">{savedMeals.length}</p>
        </div>
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
          <p className="text-xs font-black uppercase text-yellow-100/70">Liquid Calories</p>
          <p className="mt-1 text-3xl font-black text-white">{liquidCalorieMeals.length}</p>
        </div>
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
          <p className="text-xs font-black uppercase text-red-100/70">Alcohol Logs</p>
          <p className="mt-1 text-3xl font-black text-white">{alcoholMeals.length}</p>
        </div>
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4">
          <p className="text-xs font-black uppercase text-orange-100/70">High-Cal Meals</p>
          <p className="mt-1 text-3xl font-black text-white">{highCalorieMeals.length}</p>
        </div>
      </div>

      <WeeklyNutritionCheckInReport nutritionHistory={nutritionHistory} />

      <CoachClientWeeklyCheckInPanel />

      <CoachProgressPhotoReviewPanel />

      {latestTarget ? (
        <div
          data-testid="coach-latest-nutrition-target"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Macro Target
          </p>
          <h4 className="mt-2 text-xl font-black text-white">
            {latestTarget.goalLabel || "Nutrition Target"} — {latestTarget.dailyCalories} calories
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Protein: {latestTarget.protein}g
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Carbs: {latestTarget.carbs}g
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Fats: {latestTarget.fat}g
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Maintenance: {latestTarget.maintenanceCalories || "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No saved macro targets yet. Ask the client to use Nutrition Coach and save a target.
        </p>
      )}

      {latestMeal ? (
        <div
          data-testid="coach-latest-meal-review"
          className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Latest Meal Estimate
          </p>
          <h4 className="mt-2 text-xl font-black text-white">
            {latestMeal.title || "Meal Estimate"} — {latestMeal.calories} calories
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Protein: {latestMeal.protein}g
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Carbs: {latestMeal.carbs}g
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Fats: {latestMeal.fat}g
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Confidence: {latestMeal.confidence || "—"}
            </p>
          </div>

          {Array.isArray(latestMeal.matches) && latestMeal.matches.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Matched Items
              </p>
              <div className="mt-3 grid gap-2">
                {latestMeal.matches.slice(0, 6).map((item, index) => (
                  <p
                    key={item.id || item.name || index}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-white/65"
                  >
                    <span className="text-white">{item.name}</span>
                    <span className="text-white/40"> — {item.calories} cal | {item.category || "Food"}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No saved meal estimates yet. Ask the client to log and save meals.
        </p>
      )}

      {(alcoholMeals.length > 0 || liquidCalorieMeals.length > 0 || convenienceMeals.length > 0 || highCalorieMeals.length > 0) && (
        <div
          data-testid="coach-nutrition-flags"
          className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">
            Coach Review Flags
          </p>
          <div className="mt-3 grid gap-2">
            {alcoholMeals.length > 0 && (
              <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm font-bold text-red-100/80">
                Alcohol appears in {alcoholMeals.length} saved meal log(s). Review sleep, recovery, calories, and consistency.
              </p>
            )}
            {liquidCalorieMeals.length > 0 && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Liquid calories appear in {liquidCalorieMeals.length} saved meal log(s). Review sweet tea, soda, juice, coffee drinks, and energy drinks.
              </p>
            )}
            {convenienceMeals.length > 0 && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Convenience or snack foods appear in {convenienceMeals.length} saved meal log(s). Check label accuracy and serving sizes.
              </p>
            )}
            {highCalorieMeals.length > 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/70">
                {highCalorieMeals.length} meal log(s) are 800+ calories. Review portion size and daily calorie fit.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Coach Nutrition Notes
          </span>
          <textarea
            aria-label="Coach Nutrition Notes"
            value={coachNutritionNotes}
            onChange={(event) => setCoachNutritionNotes(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Example: Reduce sweet drinks to weekends only. Keep protein at each meal. Review alcohol logs before next check-in."
          />
        </label>

        <button
          type="button"
          onClick={saveCoachNutritionNotes}
          className="mt-4 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
        >
          Save Coach Nutrition Notes
        </button>
      </div>

      {reviewStatus && (
        <p
          data-testid="coach-nutrition-review-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {reviewStatus}
        </p>
      )}
    </section>
  );
}


﻿﻿﻿﻿function ClientLatestCoachAdjustmentPanel() {
  const COACH_WEEKLY_ADJUSTMENTS_STORAGE_KEY = "nlf-coach-weekly-adjustment-recommendations-v1";

  function readSavedAdjustments() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(COACH_WEEKLY_ADJUSTMENTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const [savedAdjustments, setSavedAdjustments] = useState(readSavedAdjustments);
  const [clientAdjustmentStatus, setClientAdjustmentStatus] = useState("");

  function refreshLatestAdjustment() {
    setSavedAdjustments(readSavedAdjustments());
    setClientAdjustmentStatus("Latest coach adjustment refreshed.");
  }

  const latestAdjustment = savedAdjustments[0] || null;

  return (
    <section
      data-testid="client-latest-coach-adjustment"
      aria-label="Client latest coach adjustment"
      className="mb-5 rounded-3xl border border-[#00BF63]/25 bg-black/50 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Coach Adjustment
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Latest Weekly Adjustment
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Your coach’s latest weekly plan adjustment will show here after review.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshLatestAdjustment}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Adjustment
        </button>
      </div>

      {latestAdjustment ? (
        <div
          data-testid="client-coach-adjustment-card"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Saved {latestAdjustment.savedAt || "recently"}
          </p>
          <h4 className="mt-2 text-xl font-black text-white">{latestAdjustment.recommendationType}</h4>
          <p className="mt-2 text-sm font-black uppercase text-white/55">
            {latestAdjustment.adjustmentSummary || "No summary saved."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Calories: {latestAdjustment.calorieAdjustment || "—"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Nutrition: {latestAdjustment.nutritionAdjustment || "—"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Recovery: {latestAdjustment.trainingRecoveryAdjustment || "—"}
            </p>
          </div>

          <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/75">
            Coach Message: {latestAdjustment.clientMessage || "No message saved."}
          </p>
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No coach adjustment has been saved yet.
        </p>
      )}

      {clientAdjustmentStatus && (
        <p
          data-testid="client-coach-adjustment-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {clientAdjustmentStatus}
        </p>
      )}
    </section>
  );
}

function ClientActionPlanCompletionTracker() {
  const COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY = "nlf-coach-client-weekly-action-plans-v1";
  const CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY = "nlf-client-action-plan-completions-v1";

  function readJsonStorage(key, fallback) {
    if (typeof window === "undefined") return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function readSavedPlans() {
    const saved = readJsonStorage(COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  function readSavedCompletions() {
    const saved = readJsonStorage(CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  const [savedPlans, setSavedPlans] = useState(readSavedPlans);
  const [savedCompletions, setSavedCompletions] = useState(readSavedCompletions);
  const [nutritionComplete, setNutritionComplete] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [habitComplete, setHabitComplete] = useState(false);
  const [messageReviewed, setMessageReviewed] = useState(false);
  const [clientCompletionNotes, setClientCompletionNotes] = useState("");
  const [completionStatus, setCompletionStatus] = useState("");

  const latestPlan = savedPlans[0] || null;
  const latestCompletion = savedCompletions[0] || null;

  function refreshCompletionTracker() {
    setSavedPlans(readSavedPlans());
    setSavedCompletions(readSavedCompletions());
    setCompletionStatus("Action plan completion tracker refreshed.");
  }

  function saveActionPlanCompletion() {
    if (!latestPlan) {
      setCompletionStatus("No coach action plan is available to complete yet.");
      return;
    }

    const completedItems = [
      nutritionComplete,
      trainingComplete,
      habitComplete,
      messageReviewed,
    ].filter(Boolean).length;

    const completionPercent = Math.round((completedItems / 4) * 100);

    const nextCompletion = {
      id: "client-action-plan-completion-" + Date.now(),
      actionPlanId: latestPlan.id,
      planTitle: latestPlan.planTitle,
      priorityFocus: latestPlan.priorityFocus,
      nutritionComplete,
      trainingComplete,
      habitComplete,
      messageReviewed,
      completedItems,
      totalItems: 4,
      completionPercent,
      clientCompletionNotes,
      savedAt: new Date().toLocaleString(),
    };

    const nextCompletions = [nextCompletion, ...savedCompletions].slice(0, 12);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY, JSON.stringify(nextCompletions));
      } catch {
        setCompletionStatus("Could not save action plan completion locally.");
        return;
      }
    }

    setSavedCompletions(nextCompletions);
    setCompletionStatus("Action plan completion saved for coach review.");
  }

  return (
    <section
      data-testid="client-action-plan-completion-tracker"
      aria-label="Client action plan completion tracker"
      className="mb-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Action Plan Completion
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Mark This Week Complete
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Track whether the coach’s nutrition, training/recovery, and habit actions were completed this week.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCompletionTracker}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Completion
        </button>
      </div>

      {latestPlan ? (
        <div
          data-testid="client-action-plan-completion-card"
          className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Completing: {latestPlan.planTitle}
          </p>
          <p className="mt-2 text-sm font-black uppercase text-white/55">
            Priority: {latestPlan.priorityFocus || "—"}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input
                aria-label="Nutrition Action Complete"
                type="checkbox"
                checked={nutritionComplete}
                onChange={(event) => setNutritionComplete(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/20 bg-black accent-[#00BF63]"
              />
              <span>
                <span className="block text-sm font-black uppercase text-white">Nutrition Action</span>
                <span className="mt-1 block text-sm leading-6 text-white/60">
                  {latestPlan.nutritionAction || "No nutrition action saved."}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input
                aria-label="Training Recovery Action Complete"
                type="checkbox"
                checked={trainingComplete}
                onChange={(event) => setTrainingComplete(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/20 bg-black accent-[#00BF63]"
              />
              <span>
                <span className="block text-sm font-black uppercase text-white">Training / Recovery Action</span>
                <span className="mt-1 block text-sm leading-6 text-white/60">
                  {latestPlan.trainingAction || "No training or recovery action saved."}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input
                aria-label="Habit Action Complete"
                type="checkbox"
                checked={habitComplete}
                onChange={(event) => setHabitComplete(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/20 bg-black accent-[#00BF63]"
              />
              <span>
                <span className="block text-sm font-black uppercase text-white">Habit Action</span>
                <span className="mt-1 block text-sm leading-6 text-white/60">
                  {latestPlan.habitAction || "No habit action saved."}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input
                aria-label="Coach Message Reviewed"
                type="checkbox"
                checked={messageReviewed}
                onChange={(event) => setMessageReviewed(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-white/20 bg-black accent-[#00BF63]"
              />
              <span>
                <span className="block text-sm font-black uppercase text-white">Coach Message Reviewed</span>
                <span className="mt-1 block text-sm leading-6 text-white/60">
                  {latestPlan.clientMessage || "No coach message saved."}
                </span>
              </span>
            </label>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
              Client Completion Notes
            </span>
            <textarea
              aria-label="Client Action Plan Completion Notes"
              value={clientCompletionNotes}
              onChange={(event) => setClientCompletionNotes(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
              placeholder="What got done? What was hard? What should coach know before the next adjustment?"
            />
          </label>

          <button
            type="button"
            onClick={saveActionPlanCompletion}
            className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
          >
            Save Action Plan Completion
          </button>
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No coach action plan is saved yet.
        </p>
      )}

      {completionStatus && (
        <p
          data-testid="client-action-plan-completion-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-black/40 p-4 text-sm font-black text-[#00BF63]"
        >
          {completionStatus}
        </p>
      )}

      {latestCompletion && (
        <div
          data-testid="client-latest-action-plan-completion"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-black/40 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Completion
          </p>
          <h4 className="mt-2 text-xl font-black text-white">
            {latestCompletion.completionPercent}% complete
          </h4>
          <p className="mt-2 text-sm font-bold text-white/60">
            {latestCompletion.completedItems}/{latestCompletion.totalItems} items completed | saved {latestCompletion.savedAt}
          </p>
          {latestCompletion.clientCompletionNotes && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold leading-6 text-white/70">
              {latestCompletion.clientCompletionNotes}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ClientLatestCoachActionPlanPanel() {
  const COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY = "nlf-coach-client-weekly-action-plans-v1";

  function readSavedActionPlans() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const [savedActionPlans, setSavedActionPlans] = useState(readSavedActionPlans);
  const [clientPlanStatus, setClientPlanStatus] = useState("");

  function refreshLatestCoachPlan() {
    setSavedActionPlans(readSavedActionPlans());
    setClientPlanStatus("Latest coach action plan refreshed.");
  }

  const latestPlan = savedActionPlans[0] || null;

  return (
    <section
      data-testid="client-latest-coach-action-plan"
      aria-label="Client latest coach action plan"
      className="mb-5 rounded-3xl border border-[#00BF63]/25 bg-black/50 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Coach Action Plan
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Latest Weekly Focus
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Your latest coach-saved weekly plan will show here after review.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshLatestCoachPlan}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Coach Plan
        </button>
      </div>

      {latestPlan ? (
        <div
          data-testid="client-coach-action-plan-card"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Saved {latestPlan.savedAt || "recently"}
          </p>
          <h4 className="mt-2 text-xl font-black text-white">{latestPlan.planTitle}</h4>
          <p className="mt-2 text-sm font-black uppercase text-white/55">
            Priority: {latestPlan.priorityFocus || "—"}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Nutrition: {latestPlan.nutritionAction || "—"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Training / Recovery: {latestPlan.trainingAction || "—"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Habit: {latestPlan.habitAction || "—"}
            </p>
          </div>

          <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/75">
            Coach Message: {latestPlan.clientMessage || "No message saved."}
          </p>
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No coach weekly action plan saved yet.
        </p>
      )}

      {clientPlanStatus && (
        <p
          data-testid="client-coach-action-plan-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {clientPlanStatus}
        </p>
      )}
    </section>
  );
}

function ClientDashboardCheckInSummaryCards() {
  const NUTRITION_HISTORY_STORAGE_KEY = "nlf-nutrition-history-v1";
  const CLIENT_WEEKLY_CHECKINS_STORAGE_KEY = "nlf-client-weekly-checkins-v1";
  const PROGRESS_PHOTOS_STORAGE_KEY = "nlf-client-progress-photos-v1";

  function readJsonStorage(key, fallback) {
    if (typeof window === "undefined") return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function buildSummary() {
    const nutritionHistory = readJsonStorage(NUTRITION_HISTORY_STORAGE_KEY, { targets: [], meals: [] });
    const clientCheckIns = readJsonStorage(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY, []);
    const progressPhotos = readJsonStorage(PROGRESS_PHOTOS_STORAGE_KEY, []);

    const savedTargets = Array.isArray(nutritionHistory.targets) ? nutritionHistory.targets : [];
    const savedMeals = Array.isArray(nutritionHistory.meals) ? nutritionHistory.meals : [];
    const savedCheckIns = Array.isArray(clientCheckIns) ? clientCheckIns : [];
    const savedPhotos = Array.isArray(progressPhotos) ? progressPhotos : [];

    return {
      latestTarget: savedTargets[0] || null,
      latestMeal: savedMeals[0] || null,
      latestCheckIn: savedCheckIns[0] || null,
      latestPhotoCheckIn: savedPhotos[0] || null,
      targetCount: savedTargets.length,
      mealCount: savedMeals.length,
      checkInCount: savedCheckIns.length,
      photoCount: savedPhotos.length,
    };
  }

  const [summary, setSummary] = useState(buildSummary);
  const [summaryStatus, setSummaryStatus] = useState("");

  function refreshSummary() {
    setSummary(buildSummary());
    setSummaryStatus("Dashboard summary refreshed.");
  }

  const latestTarget = summary.latestTarget;
  const latestMeal = summary.latestMeal;
  const latestCheckIn = summary.latestCheckIn;
  const latestPhotoCheckIn = summary.latestPhotoCheckIn;

  const lowAdherence = Number(latestCheckIn?.adherenceScore) > 0 && Number(latestCheckIn?.adherenceScore) < 75;
  const highHunger = Number(latestCheckIn?.hungerScore) >= 4;
  const lowEnergy = Number(latestCheckIn?.energyScore) <= 2;
  const poorSleep = Number(latestCheckIn?.sleepScore) <= 2;
  const highCalorieMeal = Number(latestMeal?.calories) >= 800;
  const hasAlcohol = Array.isArray(latestMeal?.matches) &&
    latestMeal.matches.some((item) =>
      String(item.category || "").toLowerCase() === "alcohol" ||
      /beer|vodka|whiskey|tequila|malt liquor|seltzer|wine|cocktail|margarita/i.test(String(item.name || ""))
    );

  const photoAnglesSaved = latestPhotoCheckIn
    ? [latestPhotoCheckIn.frontPhoto, latestPhotoCheckIn.sidePhoto, latestPhotoCheckIn.backPhoto].filter(Boolean).length
    : 0;

  return (
    <section
      data-testid="client-dashboard-checkin-summary"
      aria-label="Client dashboard check-in summary"
      className="mb-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5 shadow-xl shadow-black/20"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Progress Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase text-white">
            Nutrition, Check-In, And Photo Summary
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Quick view of your latest saved target, meal, weekly check-in, and progress-photo check-in.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshSummary}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Summary
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div
          data-testid="client-dashboard-target-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Macro Target</p>
          {latestTarget ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{latestTarget.dailyCalories} cal</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/55">
                {latestTarget.goalLabel || "Goal"} | {latestTarget.protein}g protein
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No saved target yet.</p>
          )}
        </div>

        <div
          data-testid="client-dashboard-meal-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Latest Meal</p>
          {latestMeal ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{latestMeal.calories} cal</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/55">
                {latestMeal.protein}g protein | {latestMeal.confidence || "—"} confidence
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No saved meal yet.</p>
          )}
        </div>

        <div
          data-testid="client-dashboard-checkin-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Weekly Check-In</p>
          {latestCheckIn ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{latestCheckIn.checkInWeight || "—"} lb</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/55">
                {latestCheckIn.adherenceScore || "—"}% adherence | sleep {latestCheckIn.sleepScore || "—"}/5
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No weekly check-in yet.</p>
          )}
        </div>

        <div
          data-testid="client-dashboard-photo-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Photo Check-In</p>
          {latestPhotoCheckIn ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{photoAnglesSaved}/3</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/55">
                angles saved | {latestPhotoCheckIn.photoDate || "latest"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No progress photos yet.</p>
          )}
        </div>
      </div>

      <div
        data-testid="client-dashboard-summary-counts"
        className="mt-4 grid gap-3 md:grid-cols-4"
      >
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Targets: {summary.targetCount}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Meals: {summary.mealCount}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Check-ins: {summary.checkInCount}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Photo logs: {summary.photoCount}
        </p>
      </div>

      {(lowAdherence || highHunger || lowEnergy || poorSleep || highCalorieMeal || hasAlcohol) && (
        <div
          data-testid="client-dashboard-action-flags"
          className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">
            Action Flags
          </p>

          <div className="mt-3 grid gap-2">
            {lowAdherence && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Adherence is under 75%. Focus on consistency before changing the plan.
              </p>
            )}
            {highHunger && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Hunger is high. Review protein, meal timing, fiber, and sleep.
              </p>
            )}
            {lowEnergy && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Energy is low. Check sleep, recovery, calories, and hydration.
              </p>
            )}
            {poorSleep && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Sleep score is low. Fix sleep before making aggressive nutrition changes.
              </p>
            )}
            {highCalorieMeal && (
              <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/70">
                Latest meal is 800+ calories. Review portions, sauces, drinks, and snacks.
              </p>
            )}
            {hasAlcohol && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Alcohol appeared in the latest meal log. Track it honestly and watch recovery.
              </p>
            )}
          </div>
        </div>
      )}

      {summaryStatus && (
        <p
          data-testid="client-dashboard-summary-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-black/40 p-4 text-sm font-black text-[#00BF63]"
        >
          {summaryStatus}
        </p>
      )}
    </section>
  );
}

function ClientPortalMyPlanPanel({
  clients,
  savedPlans,
  workoutLogs,
  onOpenTracker,
  onOpenMessages,
  onOpenProgress,
  forceNutritionCoachOpen = false,
  forceBuildWorkoutPlanOpen = false,
  onOpenPlans = () => {},
}) {

  // NLF_BUNDLE_12V_CLIENT_PLAN_BUILDER_STATE
  const storedClientPlanDraft = getStoredClientPlanDraft();
  const [isClientPlanBuilderOpen, setIsClientPlanBuilderOpen] = useState(false);
  const [clientSavedPlanDraft, setClientSavedPlanDraft] = useState(storedClientPlanDraft);
  const [clientPlanDraftTitle, setClientPlanDraftTitle] = useState(
    storedClientPlanDraft?.title || "Starter Workout Plan"
  );
  const [clientPlanDraftGoal, setClientPlanDraftGoal] = useState(
    storedClientPlanDraft?.goal || "Build consistency, strength, and conditioning."
  );
  const [clientPlanDraftDays, setClientPlanDraftDays] = useState(storedClientPlanDraft?.days || "3");
  const [clientPlanDraftStatus, setClientPlanDraftStatus] = useState("");

  
  const [buildWorkoutExerciseSearch, setBuildWorkoutExerciseSearch] = useState("");
const handleSaveClientPlanDraft = () => {
    const savedDraft = saveStoredClientPlanDraft({
      title: clientPlanDraftTitle,
      goal: clientPlanDraftGoal,
      days: clientPlanDraftDays,
    });

    setClientSavedPlanDraft(savedDraft);
    nlfQueueClientWorkoutDraftFromSavedPlan(savedDraft);
    setClientPlanDraftStatus("Workout plan draft saved for coach review.");
  };

  const handleEditClientPlanDraft = () => {
    if (clientSavedPlanDraft) {
      setClientPlanDraftTitle(clientSavedPlanDraft.title);
      setClientPlanDraftGoal(clientSavedPlanDraft.goal);
      setClientPlanDraftDays(clientSavedPlanDraft.days);
    }

    setClientPlanDraftStatus("");
    setIsClientPlanBuilderOpen(true);

    window.setTimeout(() => {
      document
        .querySelector('[data-testid="client-build-edit-plan-flow"]')
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const { client, plan, planDays, todayDay } = findFriendlyAssignedPlan({
    clients,
    savedPlans,
  });

  const recentLogs = Array.isArray(workoutLogs) ? workoutLogs.slice(-3).reverse() : [];
  const todayExercises = getFriendlyDayExercises(todayDay).slice(0, 5);

  // NLF_NUTRITION_TOP_TAB_EARLY_RETURN
  if (forceNutritionCoachOpen) {
    return (
      <NutritionCoachScreen />
    );
  }

  const buildWorkoutExerciseOptions = [
    {
      name: "Walk",
      category: "Conditioning",
      equipment: "Treadmill / Outdoors",
      notes: "Low-impact conditioning, recovery work, and steady-state cardio.",
    },
    {
      name: "Run",
      category: "Conditioning",
      equipment: "Treadmill / Outdoors",
      notes: "Higher-impact conditioning. Use controlled pacing and progress gradually.",
    },
    {
      name: "Stair Master",
      category: "Conditioning",
      equipment: "Machine",
      notes: "Leg and glute-focused conditioning with controlled posture and pace.",
    },
    {
      name: "Elliptical",
      category: "Conditioning",
      equipment: "Machine",
      notes: "Lower-impact conditioning option for steady-state or interval work.",
    },
    {
      name: "Stationary Bike",
      category: "Conditioning",
      equipment: "Machine",
      notes: "Low-impact conditioning option for intervals, recovery, or endurance.",
    },
    {
      name: "Goblet Squat",
      category: "Lower Body",
      equipment: "Dumbbell / Kettlebell",
      notes: "Squat pattern option. Keep the torso controlled and brace each rep.",
    },
    {
      name: "Dumbbell Press",
      category: "Upper Body",
      equipment: "Dumbbells",
      notes: "Pressing pattern option. Keep shoulder control and avoid rushing reps.",
    },
    {
      name: "Row",
      category: "Upper Body",
      equipment: "Cable / Dumbbell / Machine",
      notes: "Pulling pattern option. Match the plan�s movement pattern before swapping.",
    },
  ];

  const normalizedBuildWorkoutExerciseSearch = buildWorkoutExerciseSearch.trim().toLowerCase();

  const filteredBuildWorkoutExercises = buildWorkoutExerciseOptions.filter((exercise) =>
    [exercise.name, exercise.category, exercise.equipment, exercise.notes]
      .join(" ")
      .toLowerCase()
      .includes(normalizedBuildWorkoutExerciseSearch)
  );

  // NLF_BUILD_WORKOUT_PLAN_TOP_TAB_WORKSPACE
  if (forceBuildWorkoutPlanOpen) {
    return (
      <section
       
        className="mb-28 rounded-3xl border border-[#00BF63]/25 bg-gradient-to-br from-black via-zinc-950 to-black p-4 shadow-2xl shadow-black/40 md:mb-6 md:p-5"
      >
        <section className="mb-5 rounded-3xl border border-[#00BF63]/30 bg-black/60 p-5 shadow-xl shadow-black/30">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
            Build Workout Plan
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase text-white">
            Build or edit your workout plan
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Open the builder, create a draft, search exercise options, and keep your training organized.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-nlf-client-build-plan-action="true"
              onClick={handleEditClientPlanDraft}
              className="rounded-2xl border border-[#00BF63]/40 bg-[#00BF63] px-5 py-4 text-left text-sm font-black uppercase tracking-wide text-black shadow-lg shadow-[#00BF63]/20 transition hover:bg-white"
            >
              Build a Plan
            </button>

            <button
              type="button"
              data-nlf-client-edit-plan-action="true"
              onClick={handleEditClientPlanDraft}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left text-sm font-black uppercase tracking-wide text-white transition hover:border-[#00BF63]/70 hover:text-[#00BF63]"
            >
              Edit Workout Plan
            </button>
          </div>
        </section>

        {clientSavedPlanDraft && (
          <section className="mb-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
                  Saved Draft
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {clientSavedPlanDraft.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                  {clientSavedPlanDraft.goal}
                </p>
                <p className="mt-2 text-sm font-bold text-[#00BF63]">
                  {clientSavedPlanDraft.days} training days per week
                </p>
              </div>

              <button
                type="button"
                onClick={handleEditClientPlanDraft}
                className="rounded-full border border-[#00BF63]/50 px-5 py-3 text-sm font-black uppercase tracking-wide text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
              >
                Edit Saved Draft
              </button>
            </div>
          </section>
        )}

        {isClientPlanBuilderOpen && (
          <section
            data-testid="client-build-edit-plan-flow"
            aria-label="Client build edit workout plan flow"
            className="mb-5 rounded-3xl border border-[#00BF63]/30 bg-black/60 p-5 shadow-xl shadow-black/30"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
                  Build / Edit Plan
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  Client Workout Plan Builder
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
                  Create a simple client-side plan draft, adjust the goal, and save the draft before coach review.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsClientPlanBuilderOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/60 transition hover:border-[#00BF63]/60 hover:text-[#00BF63]"
              >
                Close Builder
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_0.5fr]">
              <label className="grid gap-2 text-sm font-bold text-white/80 md:col-span-1">
                Plan Name
                <input
                  data-testid="client-plan-draft-title-input"
                  aria-label="Plan Name"
                  value={clientPlanDraftTitle}
                  onChange={(event) => setClientPlanDraftTitle(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
                  placeholder="Starter Workout Plan"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/80">
                Goal
                <input
                  value={clientPlanDraftGoal}
                  onChange={(event) => setClientPlanDraftGoal(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/80">
                Days
                <select
                  value={clientPlanDraftDays}
                  onChange={(event) => setClientPlanDraftDays(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#00BF63]"
                >
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveClientPlanDraft}
                className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
              >
                Save Draft
              </button>

              {clientPlanDraftStatus && (
                <p className="rounded-full border border-[#00BF63]/30 bg-[#00BF63]/10 px-4 py-3 text-sm font-bold text-[#00BF63]">
                  {clientPlanDraftStatus}
                </p>
              )}
            </div>
          </section>
        )}

        
        {/* Duplicate exercise search block removed. The full Client-Safe Exercise Library is the single search source below. */}

      </section>
    );
  }

return (
    <section
      aria-label="Client My Plan dashboard"
      className="mb-28 rounded-3xl border border-[#00BF63]/25 bg-gradient-to-br from-black via-zinc-950 to-black p-4 shadow-2xl shadow-black/40 md:mb-6 md:p-5"
    >
      <ClientDashboardCheckInSummaryCards />

      <ClientLatestCoachActionPlanPanel />

      <ClientActionPlanCompletionTracker />

      <ClientLatestCoachAdjustmentPanel />

        {/* NLF_BUILD_WORKOUT_PLAN_MERGED_WORKSPACE */}

        {/* Duplicate exercise search block removed. The full Client-Safe Exercise Library is the single search source below. */}

        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const fullPlan = document.querySelector('[data-testid="client-full-assigned-plan"]');
              if (fullPlan) {
                fullPlan.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
          >
            View Full Plan
          </button>
        </div>

        <section
          id="client-full-assigned-plan"
          data-testid="client-full-assigned-plan"
          aria-label="Client full assigned plan"
          className="mb-5 rounded-3xl border border-[#00BF63]/25 bg-white/[0.04] p-5 shadow-xl shadow-black/20"
        >
          <ClientApprovedWorkoutPlanPanel />
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
            Full Assigned Plan
          </p>
          <h3 className="mt-2 text-xl font-black text-white">Assigned Workout Plan</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Your full assigned workout plan, training focus, exercise work, and weekly structure appear here.
          </p>
        </section>
        {/* Nutrition Coach is rendered only by the top Nutrition Coach tab. */}
{/* NLF_BUNDLE_12W_SAVED_CLIENT_PLAN_DRAFT_CARD */}
        {clientSavedPlanDraft && (
          <section
            data-testid="client-saved-plan-draft"
            aria-label="Client saved workout plan draft"
            className="mb-5 rounded-3xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-5 shadow-xl shadow-black/20"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
                  Saved Draft
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {clientSavedPlanDraft.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                  {clientSavedPlanDraft.goal}
                </p>
                <p className="mt-2 text-sm font-bold text-[#00BF63]">
                  {clientSavedPlanDraft.days} training days per week
                </p>
              </div>

              <button
                type="button"
                onClick={handleEditClientPlanDraft}
                className="rounded-full border border-[#00BF63]/50 px-5 py-3 text-sm font-black uppercase tracking-wide text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
              >
                Edit Saved Draft
              </button>
            </div>
          </section>
        )}

        {/* NLF_BUNDLE_12V_CLIENT_PLAN_BUILDER_PANEL */}
        {isClientPlanBuilderOpen && (
          <section
            data-testid="client-build-edit-plan-flow"
            aria-label="Client build edit workout plan flow"
            className="mb-5 rounded-3xl border border-[#00BF63]/30 bg-black/60 p-5 shadow-xl shadow-black/30"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
                  Build / Edit Plan
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  Client Workout Plan Builder
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
                  Create a simple client-side plan draft, adjust the goal, and save the draft before coach review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClientPlanBuilderOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/70 transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-white/80 md:col-span-1">
                Plan Name
                <input
                  data-testid="client-plan-draft-title-input"
                  aria-label="Plan Name"
                  value={clientPlanDraftTitle}
                  onChange={(event) => setClientPlanDraftTitle(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
                  placeholder="Starter Workout Plan"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/80 md:col-span-1">
                Training Days
                <select
                  data-testid="client-plan-draft-days-select"
                  value={clientPlanDraftDays}
                  onChange={(event) => setClientPlanDraftDays(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#00BF63]"
                >
                  <option value="2">2 days / week</option>
                  <option value="3">3 days / week</option>
                  <option value="4">4 days / week</option>
                  <option value="5">5 days / week</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-white/80 md:col-span-1">
                Goal
                <input
                  data-testid="client-plan-draft-goal-input"
                  value={clientPlanDraftGoal}
                  onChange={(event) => setClientPlanDraftGoal(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-[#00BF63]"
                  placeholder="Strength, fat loss, conditioning..."
                />
              </label>
            </div>

            <div
              data-testid="client-plan-draft-preview"
              className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Draft Preview
              </p>
              <h4 className="mt-2 text-lg font-black text-white">{clientPlanDraftTitle || "Untitled Plan"}</h4>
              <p className="mt-1 text-sm text-white/65">{clientPlanDraftGoal || "No goal entered yet."}</p>
              <p className="mt-2 text-sm font-bold text-[#00BF63]">{clientPlanDraftDays} training days per week</p>
            </div>

            {clientPlanDraftStatus && (
              <p className="mt-4 rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 px-4 py-3 text-sm font-bold text-[#00BF63]">
                {clientPlanDraftStatus}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveClientPlanDraft}
                className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
              >
                Save Plan Draft
              </button>
              <button
                type="button"
                onClick={onOpenPlans || (() => {})}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black uppercase tracking-wide text-white/70 transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                Open Full Plan Builder
              </button>
            </div>
          </section>
        )}

        {/* Nutrition Coach moved to the top Nutrition Coach tab. */}
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
              <button
                type="button"
                data-nlf-client-build-plan-action="true"
                onClick={() => {
                  setIsClientPlanBuilderOpen(true);
                  setClientPlanDraftStatus("");
                  window.setTimeout(() => {
                    document
                      .querySelector('[data-testid="client-build-edit-plan-flow"]')
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 0);
                }}
                className="min-h-12 rounded-2xl border border-[#00BF63]/40 bg-[#00BF63]/10 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black md:min-h-0 md:rounded-full md:px-4 md:py-2 md:text-xs md:tracking-[0.18em]"
              >
                Build a Plan
              </button>
              <button
                type="button"
                data-nlf-client-edit-plan-action="true"
                onClick={() => {
                  setIsClientPlanBuilderOpen(true);
                  setClientPlanDraftStatus("");
                  window.setTimeout(() => {
                    document
                      .querySelector('[data-testid="client-build-edit-plan-flow"]')
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 0);
                }}
                className="min-h-12 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:border-[#00BF63] hover:text-[#00BF63] md:min-h-0 md:rounded-full md:px-4 md:py-2 md:text-xs md:tracking-[0.18em]"
              >
                Edit Workout Plan
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
                {getFriendlyPlanTitle(plan)} â€” {getFriendlyPlanGoal(plan)}
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
      {/* Nutrition Coach moved out of My Plan. Use the top Nutrition Coach tab for the full tool. */}
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


// NLF_BUNDLE_12Z_LOGIN_GATE_START
function getNoLimitPublicAccountAccess() {
  try {
    return window.localStorage.getItem("nlf-public-account-access-v1") === "true";
  } catch {
    return false;
  }
}


function saveNoLimitPublicAccountAccess(profile) {
  const safeRole = String(profile?.role || "client").toLowerCase() === "coach" ? "coach" : "client";

  try {
    window.localStorage.setItem("nlf-public-account-access-v1", "true");
    window.localStorage.setItem(
      "nlf-public-account-profile-v1",
      JSON.stringify({
        ...profile,
        role: safeRole,
      })
    );
    window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, safeRole);

    if (safeRole === "coach") {
      window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
    }
  } catch {
    // LocalStorage can fail in restricted browser modes.
  }
}


function NoLimitFitnessPublicLoginGate({ authMode, setAuthMode, onUnlock }) {
  const isSignup = authMode === "signup";
  const [accountType, setAccountType] = useState("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountStatus, setAccountStatus] = useState("");

  const isCoachLogin = accountType === "coach";
  const isClientSignup = accountType === "client" && isSignup;
  const accountLabel = isCoachLogin ? "Coach" : "Client";
  const pageTitle = isCoachLogin ? "Coach Login" : isClientSignup ? "Create Client Account" : "Client Login";
  const pageDescription = isCoachLogin
    ? "Coach accounts open client management, assigned plans, review queues, messages, and coach activity."
    : "Client accounts open your training plan, tracker, progress, messages, exercises, and nutrition tools.";

  function selectAccountType(nextType) {
    setAccountType(nextType);
    setAccountStatus("");

    if (nextType === "coach") {
      setAuthMode("login");
      setEmail("coach@nolimittest.com");
      return;
    }

    setEmail("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const safeEmail = email.trim();
    const safePassword = password.trim();

    if (!safeEmail || !safePassword) {
      setAccountStatus("Enter an email and password to continue.");
      return;
    }

    const profile = {
      name: isCoachLogin ? "No Limit Coach" : name.trim() || "No Limit Client",
      email: safeEmail,
      createdAt: new Date().toISOString(),
      mode: isClientSignup ? "signup" : "login",
      role: accountType,
    };

    saveNoLimitPublicAccountAccess(profile);
    setAccountStatus(
      isCoachLogin
        ? "Coach login accepted. Opening your coach portal."
        : isClientSignup
          ? "Client account created. Opening your client portal."
          : "Client login accepted. Opening your client portal."
    );
    onUnlock(profile);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,191,99,0.18),_transparent_36%),linear-gradient(135deg,_rgba(0,0,0,1),_rgba(13,13,13,0.95))]"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-black/95 to-black" />

      <section
        aria-label={pageTitle}
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10"
      >
        <div className="rounded-[2rem] border border-[#00BF63]/25 bg-zinc-950/90 p-6 shadow-2xl shadow-black/60 md:p-8">
          <div className="flex items-center gap-4">
            <img
              src="/images/logo.png"
              alt="No Limit Fitness"
              className="h-16 w-16 rounded-2xl object-contain"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#00BF63]">
                No Limit Fitness
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase leading-none text-white">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div
            aria-label="Choose account login type"
            className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/40 p-2"
          >
            {[
              { id: "client", label: "Client Access" },
              { id: "coach", label: "Coach Access" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={accountType === option.id}
                onClick={() => selectAccountType(option.id)}
                className={[
                  "rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition",
                  accountType === option.id
                    ? "bg-[#00BF63] text-black"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-[#00BF63] hover:text-[#00BF63]",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm leading-6 text-white/65">
            {pageDescription}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            {isClientSignup && (
              <label className="grid gap-2 text-sm font-bold text-white/80">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  name="name"
                  placeholder="Your name"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
                />
              </label>
            )}

            <label className="grid gap-2 text-sm font-bold text-white/80">
              {accountLabel} Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                name="email"
                type="email"
                placeholder={isCoachLogin ? "coach@nolimittest.com" : "client@nolimittest.com"}
                className="rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-white/80">
              {accountLabel} Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                name="password"
                type="password"
                placeholder="Password"
                className="rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
              />
            </label>

            {accountStatus && (
              <p className="rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 px-4 py-3 text-sm font-bold text-[#00BF63]">
                {accountStatus}
              </p>
            )}

            <button
              type="submit"
              className="rounded-2xl bg-[#00BF63] px-5 py-4 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-[#00d36f]"
            >
              {isCoachLogin ? "Open Coach Portal" : isClientSignup ? "Create Account" : "Log In"}
            </button>

            {accountType === "client" && (
              <button
                type="button"
                onClick={() => {
                  setAccountStatus("");
                  setAuthMode(isSignup ? "login" : "signup");
                }}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                {isSignup ? "Back to Login" : "Sign Up"}
              </button>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
// NLF_BUNDLE_12Z_LOGIN_GATE_END


function NoLimitFitnessAppShell() {
  const [initialState] = useState(loadInitialState);
  const [activeTab, setActiveTab] = useState(() => {
    if (hasCurrentTestUnlockUrl()) return getInitialTabForPortalMode(getRequestedTestUnlockPortalMode());
    if (getNoLimitPublicAccountAccess()) return "Client";

    const mode = getInitialPortalMode();

    if (hasCoachSessionLock()) {
      return mode === "coach" ? "Coach" : "Client";
    }

    return PUBLIC_LANDING_TAB;
  });

  // NLF_ACTIVE_TAB_BODY_DATASET
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.activeTab = String(activeTab || "");
  }, [activeTab]);


  const [portalMode, setPortalMode] = useState(() =>
    hasCurrentTestUnlockUrl() || hasCoachSessionLock() || getNoLimitPublicAccountAccess()
      ? getInitialPortalMode()
      : PUBLIC_PORTAL_MODE
  );

  // BUNDLE_12U_TEST_UNLOCK_RECOVERY
  useEffect(() => {
    if (!hasCurrentTestUnlockUrl()) {
      try {
        window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
      } catch {
        // Ignore storage failures in restricted browser modes.
      }

      return;
    }

    const requestedMode = getRequestedTestUnlockPortalMode();
    const requestedTabs = PORTAL_VISIBLE_TABS_BY_MODE[requestedMode] || PORTAL_VISIBLE_TABS_BY_MODE.client || ["Client"];
    const requestedLandingTab = getInitialTabForPortalMode(requestedMode);

    try {
      window.localStorage.setItem(TEST_UNLOCK_STORAGE_KEY, "true");
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, requestedMode);

      if (requestedMode === "coach") {
        window.localStorage.setItem(COACH_SESSION_LOCK_STORAGE_KEY, "true");
      } else {
        window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
      }

      document.body.dataset.portalMode = requestedMode;
    } catch {
      // Ignore storage failures in restricted browser modes.
    }

    if (portalMode !== requestedMode) {
      setPortalMode(requestedMode);
    }

    if (!requestedTabs.includes(activeTab)) {
      setActiveTab(requestedLandingTab);
    }
  }, [activeTab, portalMode]);

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
    window.localStorage.setItem(
      PORTAL_MODE_STORAGE_KEY,
      hasCurrentTestUnlockUrl() ? getRequestedTestUnlockPortalMode() : PUBLIC_PORTAL_MODE
    );
    window.localStorage.removeItem(COACH_SESSION_LOCK_STORAGE_KEY);
  } catch {
    // LocalStorage can fail in restricted browser modes.
  }

  document.body.dataset.portalMode = hasCurrentTestUnlockUrl()
      ? getRequestedTestUnlockPortalMode()
      : PUBLIC_PORTAL_MODE;

  if (portalMode !== PUBLIC_PORTAL_MODE) {
    setPortalMode(PUBLIC_PORTAL_MODE);
  }

  const publicVisibleTabs = PORTAL_VISIBLE_TABS_BY_MODE[PUBLIC_PORTAL_MODE] || [];
  if (!publicVisibleTabs.includes(activeTab)) {
    setActiveTab(PUBLIC_LANDING_TAB);
  }
}, [portalMode, activeTab]);
  useEffect(() => {
  const publicAccountAccess = getNoLimitPublicAccountAccess();
  const unlocked = getPortalTestUnlocked() || publicAccountAccess;
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

  const unassignClientFromCoach = (clientId) => {
    const client = clients.find((item) => item.id === clientId);

    setClients((previousClients) =>
      previousClients.map((item) =>
        item.id === clientId
          ? {
              ...item,
              coachId: "",
              coachName: "",
              coachingStatus: "unassigned",
              status: "Unassigned",
              assignedAt: "",
              archivedAt: "",
              archiveReason: "",
            }
          : item
      )
    );

    setClientActionNotice(
      (client?.name || "Client") + " unassigned from active coaching."
    );
  };

  const fullDeleteArchivedClient = (clientId) => {
    const client = clients.find((item) => item.id === clientId);

    if (!client) return;

    const statusText = String(client.coachingStatus || client.status || "").toLowerCase();
    const isArchived = statusText.includes("archived") || Boolean(client.archivedAt);

    if (!isArchived) {
      setClientActionNotice("Archive this client before using Full Delete.");
      return;
    }

    const remainingClients = clients.filter((item) => item.id !== clientId);
    const fallbackClient =
      remainingClients.find((item) =>
        String(item.coachingStatus || item.status || "").toLowerCase().includes("active")
      ) ||
      remainingClients[0] ||
      null;

    setClients(remainingClients);
    setSavedPlans((current) => current.filter((plan) => plan.clientId !== clientId));
    setWorkoutLogs((current) => current.filter((log) => log.clientId !== clientId));
    setConversations((current) =>
      current.filter((conversation) => conversation.clientId !== clientId)
    );
    setReadActivityIds((current) =>
      current.filter((activityId) => !String(activityId).includes(clientId))
    );

    setSelectedClientProfileId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );
    setTrackerClientId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );
    setSelectedConversationId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );
    setPlanDraft((current) => ({
      ...current,
      clientId: current.clientId === clientId ? fallbackClient?.id || "" : current.clientId,
    }));

    setClientActionNotice(
      client.name +
        " fully deleted from archived records. Profile, plans, logs, and messages were removed."
    );
  };

  const viewArchivedClientForCoach = (clientId) => {
    setSelectedClientProfileId(clientId);

    const clientName =
      clients.find((client) => client.id === clientId)?.name || "Client";

    setClientActionNotice("Viewing saved history for " + clientName + ".");
  };
  // NLF_COACH_ASSIGNMENT_STATE_END


  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncApprovedPlansIntoSavedPlans = () => {
      const approvedPlans = nlfGetApprovedClientPlans();

      if (!approvedPlans.length) return;

      setSavedPlans((current) => nlfMergeApprovedPlansIntoSavedPlans(current, approvedPlans, clients));
    };

    syncApprovedPlansIntoSavedPlans();

    window.addEventListener("storage", syncApprovedPlansIntoSavedPlans);
    window.addEventListener("nlf-coach-review-queue-changed", syncApprovedPlansIntoSavedPlans);

    return () => {
      window.removeEventListener("storage", syncApprovedPlansIntoSavedPlans);
      window.removeEventListener("nlf-coach-review-queue-changed", syncApprovedPlansIntoSavedPlans);
    };
  }, [clients]);

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
  const isPortalUnlocked =
    getPortalTestUnlocked() || hasCoachSessionLock() || getNoLimitPublicAccountAccess();
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
    { id: "Nutrition", label: "Nutrition Coach", icon: ClipboardList },
    { id: "Clients", icon: Users },
    { id: "Coach", icon: ShieldCheck },
    { id: "Exercises", label: "Build Workout Plan", icon: Dumbbell },
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobilePrimaryTabLabels = {
    Client: "Plan",
    Tracker: "Log",
    Exercises: "Build",
    Messages: "Msg",
  };

  const mobileMenuTabLabels = {
    Home: "Home",
    Nutrition: "Nutrition",
    Plans: "Plans",
    Progress: "Progress",
    Login: isLoggedIn ? "Logout" : "Login",
    Coach: "Coach",
    Clients: "Clients",
  };

  const mobilePrimaryTabIds = ["Client", "Tracker", "Exercises", "Messages"];
  const mobileMenuTabIds = ["Home", "Nutrition", "Plans", "Progress", "Login", "Coach", "Clients"];

  const mobilePrimaryTabs = mobilePrimaryTabIds
    .map((tabId) => renderedTabs.find((tab) => tab.id === tabId))
    .filter(Boolean);

  const mobileMenuTabs = mobileMenuTabIds
    .map((tabId) => renderedTabs.find((tab) => tab.id === tabId))
    .filter(Boolean);

  const isMobileMenuActive = mobileMenuTabs.some((tab) => tab.id === activeTab);

  function getMobilePrimaryTabLabel(tab) {
    return mobilePrimaryTabLabels[tab.id] || tab.label || tab.id;
  }

  function getMobileMenuTabLabel(tab) {
    if (tab.id === "Login") {
      return isLoggedIn ? "Logout" : "Login";
    }

    return mobileMenuTabLabels[tab.id] || tab.label || tab.id;
  }

  function handleMobileTabNavigation(tab) {
    if (tab.id === "Login" && isLoggedIn) {
      handlePortalLogout();
      setIsMobileMenuOpen(false);
      return;
    }

    setActiveTab(tab.id);
    setIsMobileMenuOpen(false);
  }

  const filteredLibraryExercises = useMemo(() => {
    const search = librarySearch.trim().toLowerCase();

    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        !search || getClientSafeExerciseSearchText(exercise).includes(search);
      const matchesCategory =
        libraryCategory === "All" || exercise.categories.includes(libraryCategory);

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

    const archivedAt = new Date().toISOString();

    const fallbackClient =
      clients.find(
        (item) => item.id !== clientId && getClientCoachingStatus(item) === "active"
      ) ||
      clients.find((item) => item.id !== clientId) ||
      null;

    setClients((current) =>
      current.map((item) =>
        item.id === clientId
          ? {
              ...normalizeClientCoachingRecord(item),
              coachingStatus: "archived",
              status: "Archived",
              archivedAt,
              archiveReason: item.archiveReason || "Archived by Safe Delete",
            }
          : item
      )
    );

    setSelectedClientProfileId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );

    setTrackerClientId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );

    setSelectedConversationId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );

    setPlanDraft((current) => ({
      ...current,
      clientId:
        current.clientId === clientId
          ? fallbackClient?.id || ""
          : current.clientId,
    }));

    setClientActionNotice(
      client.name +
        " archived. Safe Delete now preserves records and removes the client from active workflow."
    );
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

  function saveCoachSessionForClient({
    clientId,
    exerciseName,
    setsCompleted,
    repsCompleted,
    actualWeight,
    notes,
  }) {
    const client = clients.find((item) => item.id === clientId) || clients[0] || {};
    const clientPlans = savedPlans.filter(
      (plan) => plan.clientId === client?.id || plan.clientName === client?.name
    );
    const activePlan = clientPlans[0] || null;
    const now = new Date();

    const cleanExerciseName = String(exerciseName || "").trim() || "Coach Logged Exercise";
    const cleanSets = String(setsCompleted || "").trim() || "3";
    const cleanReps = String(repsCompleted || "").trim() || "10";
    const cleanWeight = String(actualWeight || "").trim();
    const cleanNotes = String(notes || "").trim();

    const newLog = {
      id: makeId("coach-session-log"),
      clientId: client?.id || clientId || "",
      clientName: client?.name || "Client",
      planId: activePlan?.id || "",
      planName: activePlan?.planName || activePlan?.title || "Coach Logged Session",
      dayId: "coach-session",
      dayName: "Coach Logged Session",
      status: "completed",
      submittedAt: now.toLocaleString(),
      timestamp: now.getTime(),
      source: "Coach Session Logger",
      loggedBy: "Coach",
      coachLogged: true,
      skipReason: "",
      entries: [
        {
          exerciseId: "coach-session-exercise",
          exerciseName: cleanExerciseName,
          assignedSets: cleanSets,
          assignedRepsOrTime: cleanReps,
          assignedWeightGuidance: cleanWeight,
          assignedRest: "",
          actualWeight: cleanWeight,
          setsCompleted: cleanSets,
          repsCompleted: cleanReps,
          timeCompleted: "",
          restUsed: "",
          substitution: "",
          notes: cleanNotes || "Logged by coach during session.",
        },
      ],
    };

    setWorkoutLogs((current) => [newLog, ...current]);
    setSelectedWorkoutLogId(newLog.id);
    setSelectedClientProfileId(newLog.clientId);
    setTrackerMessage("Coach session saved for " + newLog.clientName + ".");

    return newLog;
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

  function archiveConversation(clientId) {
    const archiveKey = nlfGetMessagingArchiveKey(nlfResolveMessageSenderRole(normalizedPortalMode));

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.clientId !== clientId) return conversation;

        const archivedFor = nlfNormalizeArchivedFor(conversation);

        if (archivedFor.includes(archiveKey)) return conversation;

        return {
          ...conversation,
          archivedFor: [...archivedFor, archiveKey],
        };
      })
    );

    setSelectedConversationId((current) => (current === clientId ? "" : current));
    setMessageNotice("Conversation archived from your active inbox.");
  }

  function restoreConversation(clientId) {
    const archiveKey = nlfGetMessagingArchiveKey(nlfResolveMessageSenderRole(normalizedPortalMode));

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.clientId !== clientId) return conversation;

        return {
          ...conversation,
          archivedFor: nlfNormalizeArchivedFor(conversation).filter((key) => key !== archiveKey),
        };
      })
    );

    setSelectedConversationId(clientId);
    setMessageNotice("Conversation restored to your active inbox.");
  }

  function sendMessage() {
    const text = messageDraft.trim();
    if (!text) return setMessageNotice("Type a message before sending.");

    const selectedConversation = conversations.find((conversation) => conversation.clientId === selectedConversationId);
    if (!selectedConversation) return setMessageNotice("Select a conversation first.");

    const newMessage = {
      id: makeId("message"),
      sender: nlfResolveMessageSenderRole(normalizedPortalMode),
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
    setMessageNotice(`${nlfResolveMessageSenderRole(normalizedPortalMode)} message sent locally.`);
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

  // Bundle 12Y.1 public account gate start
  function handlePublicAccountSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const authAction = String(formData.get("authAction") || "signup");
    const name = String(formData.get("name") || "").trim() || "No Limit Client";
    const email = String(formData.get("email") || "").trim().toLowerCase();

    if (!email) {
      setAccountStatus("Enter your email to continue.");
      return;
    }

    const existingClient = clients.find(
      (client) => String(client.email || "").trim().toLowerCase() === email
    );

    const clientId = existingClient?.id || "public-client-" + Date.now();
    const clientName = existingClient?.name || name;

    if (!existingClient) {
      setClients((current) => [
        ...current,
        {
          id: clientId,
          name: clientName,
          email,
          status: "Active",
          coachingStatus: "active",
          coachId: "",
          coachName: "",
          createdAt: new Date().toISOString(),
          accountSource: "Public sign up",
        },
      ]);
    }

    setSelectedClientProfileId(clientId);
    setTrackerClientId(clientId);
    setSelectedConversationId(clientId);

    handlePortalLogin({ role: "client" });
    setActiveTab("Client");
    setAccountStatus(
      authAction === "login"
        ? "Logged in. Opening your client portal."
        : "Account created. Opening your client portal."
    );
  }

  const hasActiveTestUnlockUrl =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("testUnlock") === "true";

  if (!isLoggedIn && !hasActiveTestUnlockUrl) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#00BF63]">
              No Limit Fitness
            </p>

            <h1 className="mt-4 text-3xl font-black uppercase tracking-wide sm:text-4xl">
              Client Login
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/70">
              Log in or create your client account to open your training plan, tracker, progress,
              messages, exercises, and nutrition coach.
            </p>

            <form
              aria-label="No Limit Fitness login and sign up"
              className="mt-6 space-y-4"
              onSubmit={handlePublicAccountSubmit}
            >
              <label className="block text-sm font-black uppercase tracking-wide text-white/70">
                Name
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-[#00BF63]"
                />
              </label>

              <label className="block text-sm font-black uppercase tracking-wide text-white/70">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-[#00BF63]"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  name="authAction"
                  value="login"
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:border-[#00BF63] hover:bg-[#00BF63] hover:text-black"
                >
                  Login
                </button>

                <button
                  type="submit"
                  name="authAction"
                  value="signup"
                  className="rounded-full border border-[#00BF63] bg-[#00BF63] px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
                >
                  Sign Up
                </button>
              </div>
            </form>

            {accountStatus ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-white/70">
                {accountStatus}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }
  // Bundle 12Y.1 public account gate end

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/images/gym-background.webp')" }} />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-black via-black/90 to-black" />

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
                         aria-hidden="true">
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
            className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-[1.75rem] border border-[#00BF63]/35 bg-black/95 px-3 py-2 shadow-2xl shadow-[#00BF63]/15 ring-1 ring-white/10 backdrop-blur md:hidden"
          >
            {isMobileMenuOpen && (
              <div
                aria-label="Mobile tab menu"
                className="absolute inset-x-0 bottom-[4.75rem] rounded-[1.5rem] border border-[#00BF63]/30 bg-black/95 p-3 shadow-2xl shadow-black/70 ring-1 ring-white/10"
              >
                <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#00BF63]">
                  Menu
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {mobileMenuTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const tabLabel = getMobileMenuTabLabel(tab);

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-label={tabLabel}
                        onClick={() => handleMobileTabNavigation(tab)}
                        className={[
                          "flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-wide transition",
                          isActive
                            ? "border-[#00BF63] bg-[#00BF63] text-black"
                            : "border-white/10 bg-white/[0.04] text-white/75 hover:border-[#00BF63] hover:text-[#00BF63]",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={16} aria-hidden="true" />
                          {tabLabel}
                        </span>

                        {tab.badge > 0 && (
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[10px] font-black",
                              isActive ? "bg-black text-[#00BF63]" : "bg-[#00BF63] text-black",
                            ].join(" ")}
                            aria-hidden="true"
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

            <div className="grid grid-cols-5 items-end gap-1">
              {mobilePrimaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const tabLabel = getMobilePrimaryTabLabel(tab);
                const isBuildAction = tab.id === "Exercises";

                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-label={tabLabel}
                    onClick={() => handleMobileTabNavigation(tab)}
                    className={[
                      "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 py-2 text-[10px] font-black uppercase leading-tight tracking-tight transition ring-1",
                      isBuildAction ? "min-h-[3.75rem] -translate-y-2" : "min-h-[3.1rem]",
                      isActive
                        ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20 ring-[#00BF63]/30"
                        : isBuildAction
                          ? "border-[#00BF63]/80 bg-[#00BF63]/15 text-[#00BF63] shadow-lg shadow-[#00BF63]/10 ring-[#00BF63]/25 hover:bg-[#00BF63] hover:text-black"
                          : "border-white/10 bg-white/[0.04] text-white/70 ring-white/5 hover:border-[#00BF63] hover:text-[#00BF63]",
                    ].join(" ")}
                  >
                    <Icon size={isBuildAction ? 20 : 16} aria-hidden="true" />
                    <span className="max-w-full truncate">{tabLabel}</span>

                    {tab.badge > 0 && (
                      <span
                        className={[
                          "absolute right-0.5 top-0.5 rounded-full px-1 py-0.5 text-[8px] font-black leading-none",
                          isActive ? "bg-black text-[#00BF63]" : "bg-[#00BF63] text-black",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Menu"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
                className={[
                  "relative flex min-h-[3.1rem] flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 py-2 text-[10px] font-black uppercase leading-tight tracking-tight transition ring-1",
                  isMobileMenuOpen || isMobileMenuActive
                    ? "border-[#00BF63] bg-[#00BF63] text-black shadow-lg shadow-[#00BF63]/20 ring-[#00BF63]/30"
                    : "border-white/10 bg-white/[0.04] text-white/70 ring-white/5 hover:border-[#00BF63] hover:text-[#00BF63]",
                ].join(" ")}
              >
                <span className="text-lg leading-none" aria-hidden="true">☰</span>
                <span className="max-w-full truncate">Menu</span>
              </button>
            </div>
          </nav>
        )}

        <main className="mx-auto max-w-7xl px-4 py-8 pb-28 md:pb-8">
        {/* NLF_CLIENT_PORTAL_POLISH_PANEL_START */}
        {["Home", "Client", "Nutrition", "Exercises"].includes(activeTab) && normalizedPortalMode === "client" && (
          <ClientPortalMyPlanPanel
            clients={clients}
            savedPlans={savedPlans}
            workoutLogs={workoutLogs}
            onOpenTracker={() => setActiveTab("Tracker")}
            onOpenMessages={() => setActiveTab("Messages")}
            onOpenProgress={() => setActiveTab("Progress")}
                onOpenPlans={() => setActiveTab("Plans")}
                forceNutritionCoachOpen={activeTab === "Nutrition"}
            forceBuildWorkoutPlanOpen={activeTab === "Exercises"}
              />
        )}
        {/* NLF_CLIENT_PORTAL_POLISH_PANEL_END */}
        {/* Bundle 12N: ClientsScreen is now the single coach client-management surface. */}
          {/* NLF_NUTRITION_COACH_TOP_TAB_WINDOW */}
          {activeTab === "Nutrition" && (
            <NutritionCoachScreen />
          )}

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
              clients={clients}
              notifications={coachNotifications}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              conversations={conversations}
              selectedWorkoutLogId={selectedWorkoutLogId}
              setSelectedWorkoutLogId={setSelectedWorkoutLogId}
              deleteWorkoutLog={deleteWorkoutLog}
              onSaveCoachSessionLog={saveCoachSessionForClient}
              unreadCoachCount={unreadCoachCount}
              unreadActivityCount={unreadActivityCount}
              activityFilter={activityFilter}
              setActivityFilter={setActivityFilter}
              markActivityRead={markActivityRead}
              markAllActivityRead={markAllActivityRead}
              openTrackerForClient={openTrackerForClient}
              openMessagesForClient={openMessagesForClient}
              openPlansForClient={openPlansForClient}
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
              safeDeleteClient={safeDeleteClient}
              clientActionNotice={clientActionNotice}
              onAssignClient={assignClientToCoach}
              onArchiveClient={archiveClientForCoach}
              onReactivateClient={reactivateClientForCoach}
              onViewArchivedClient={viewArchivedClientForCoach}
              onUnassignClient={unassignClientFromCoach}
              fullDeleteArchivedClient={fullDeleteArchivedClient}
            />
          )}

          {activeTab === "Plans" && (
            <>
              <CoachReviewQueuePanel />
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
            </>
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
              messageSender={nlfResolveMessageSenderRole(normalizedPortalMode)}
              setMessageSender={setMessageSender}
              messageDraft={messageDraft}
              setMessageDraft={setMessageDraft}
              sendMessage={sendMessage}
              markCoachMessagesRead={markCoachMessagesRead}
              markClientMessagesRead={markClientMessagesRead}
              archiveConversation={archiveConversation}
              restoreConversation={restoreConversation}
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


﻿﻿﻿﻿function CoachWeeklyAdjustmentRecommendationPanel() {
  const NUTRITION_HISTORY_STORAGE_KEY = "nlf-nutrition-history-v1";
  const CLIENT_WEEKLY_CHECKINS_STORAGE_KEY = "nlf-client-weekly-checkins-v1";
  const PROGRESS_PHOTOS_STORAGE_KEY = "nlf-client-progress-photos-v1";
  const COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY = "nlf-coach-client-weekly-action-plans-v1";
  const CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY = "nlf-client-action-plan-completions-v1";
  const COACH_WEEKLY_ADJUSTMENTS_STORAGE_KEY = "nlf-coach-weekly-adjustment-recommendations-v1";

  function readJsonStorage(key, fallback) {
    if (typeof window === "undefined") return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function readSavedAdjustments() {
    const saved = readJsonStorage(COACH_WEEKLY_ADJUSTMENTS_STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  function buildAdjustmentSnapshot() {
    const nutritionHistory = readJsonStorage(NUTRITION_HISTORY_STORAGE_KEY, { targets: [], meals: [] });
    const clientCheckIns = readJsonStorage(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY, []);
    const progressPhotos = readJsonStorage(PROGRESS_PHOTOS_STORAGE_KEY, []);
    const actionPlans = readJsonStorage(COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY, []);
    const completions = readJsonStorage(CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY, []);

    const savedTargets = Array.isArray(nutritionHistory.targets) ? nutritionHistory.targets : [];
    const savedMeals = Array.isArray(nutritionHistory.meals) ? nutritionHistory.meals : [];
    const savedCheckIns = Array.isArray(clientCheckIns) ? clientCheckIns : [];
    const savedPhotos = Array.isArray(progressPhotos) ? progressPhotos : [];
    const savedActionPlans = Array.isArray(actionPlans) ? actionPlans : [];
    const savedCompletions = Array.isArray(completions) ? completions : [];

    const latestTarget = savedTargets[0] || null;
    const latestMeal = savedMeals[0] || null;
    const latestCheckIn = savedCheckIns[0] || null;
    const previousCheckIn = savedCheckIns[1] || null;
    const latestPhotoCheckIn = savedPhotos[0] || null;
    const latestActionPlan = savedActionPlans[0] || null;
    const latestCompletion = savedCompletions[0] || null;

    const latestWeight = Number(latestCheckIn?.checkInWeight);
    const previousWeight = Number(previousCheckIn?.checkInWeight);
    const hasWeightChange = Number.isFinite(latestWeight) && Number.isFinite(previousWeight);
    const weightChange = hasWeightChange ? Number((latestWeight - previousWeight).toFixed(1)) : 0;

    const hasAlcohol = Array.isArray(latestMeal?.matches) &&
      latestMeal.matches.some((item) =>
        String(item.category || "").toLowerCase() === "alcohol" ||
        /beer|vodka|whiskey|tequila|malt liquor|seltzer|wine|cocktail|margarita/i.test(String(item.name || ""))
      );

    const hasLiquidCalories = Array.isArray(latestMeal?.matches) &&
      latestMeal.matches.some((item) =>
        /sweet tea|kool-aid|koolaid|soda|juice|lemonade|energy drink|frappuccino|chocolate milk/i.test(String(item.name || ""))
      );

    const highCalorieMeal = Number(latestMeal?.calories) >= 800;
    const lowAdherence = Number(latestCheckIn?.adherenceScore) > 0 && Number(latestCheckIn?.adherenceScore) < 75;
    const highHunger = Number(latestCheckIn?.hungerScore) >= 4;
    const lowEnergy = Number(latestCheckIn?.energyScore) <= 2;
    const poorSleep = Number(latestCheckIn?.sleepScore) <= 2;
    const highStress = Number(latestCheckIn?.stressScore) >= 4;
    const lowRecovery = Number(latestCheckIn?.recoveryScore) <= 2;
    const completionPercent = Number(latestCompletion?.completionPercent || 0);
    const lowCompletion = latestCompletion ? completionPercent < 75 : false;

    const photoAnglesSaved = latestPhotoCheckIn
      ? [latestPhotoCheckIn.frontPhoto, latestPhotoCheckIn.sidePhoto, latestPhotoCheckIn.backPhoto].filter(Boolean).length
      : 0;

    const flags = [];

    if (!latestTarget) flags.push("No macro target saved");
    if (!latestMeal) flags.push("No meal log saved");
    if (!latestCheckIn) flags.push("No weekly check-in saved");
    if (poorSleep) flags.push("Sleep is poor");
    if (lowEnergy) flags.push("Energy is low");
    if (lowRecovery) flags.push("Recovery is low");
    if (highStress) flags.push("Stress is high");
    if (lowAdherence) flags.push("Adherence is below 75%");
    if (lowCompletion) flags.push("Action plan completion is below 75%");
    if (highHunger) flags.push("Hunger is high");
    if (hasAlcohol) flags.push("Alcohol appears in latest meal log");
    if (hasLiquidCalories) flags.push("Liquid calories appear in latest meal log");
    if (highCalorieMeal) flags.push("Latest meal is 800+ calories");
    if (photoAnglesSaved > 0 && photoAnglesSaved < 3) flags.push("Progress photo check-in is incomplete");

    return {
      latestTarget,
      latestMeal,
      latestCheckIn,
      previousCheckIn,
      latestPhotoCheckIn,
      latestActionPlan,
      latestCompletion,
      hasWeightChange,
      weightChange,
      photoAnglesSaved,
      completionPercent,
      flags,
      hasAlcohol,
      hasLiquidCalories,
      highCalorieMeal,
      lowAdherence,
      lowCompletion,
      highHunger,
      lowEnergy,
      poorSleep,
      highStress,
      lowRecovery,
    };
  }

  function createRecommendation(snapshot) {
    const currentCalories = Number(snapshot.latestTarget?.dailyCalories || 0);
    const reducedCalories = currentCalories ? Math.max(currentCalories - 150, 1200) : "";
    const increasedCalories = currentCalories ? currentCalories + 150 : "";

    if (!snapshot.latestTarget || !snapshot.latestCheckIn) {
      return {
        recommendationType: "Collect More Data",
        adjustmentSummary: "Do not adjust calories yet.",
        calorieAdjustment: "No calorie change until target, check-in, and meal data are saved.",
        nutritionAdjustment: "Have the client save a macro target, meal log, weekly check-in, and progress photos before changing the plan.",
        trainingRecoveryAdjustment: "Keep training normal and collect recovery feedback.",
        habitAdjustment: "Set a minimum requirement: one weekly check-in and one meal log before the next review.",
        clientMessage: "Before we change the plan, we need a clean check-in and nutrition log so the next adjustment is based on real data.",
      };
    }

    if (snapshot.poorSleep || snapshot.lowEnergy || snapshot.lowRecovery) {
      return {
        recommendationType: "Prioritize Recovery",
        adjustmentSummary: "Keep calories steady and fix recovery first.",
        calorieAdjustment: "No calorie cut this week. Keep target near " + currentCalories + " calories.",
        nutritionAdjustment: "Hit protein, reduce alcohol, keep hydration consistent, and avoid making the deficit more aggressive.",
        trainingRecoveryAdjustment: "Keep training controlled. Do not add extra volume until sleep, energy, and recovery improve.",
        habitAdjustment: "Set a sleep target, keep a consistent weigh-in routine, and prep one easy high-protein meal option.",
        clientMessage: "This week we are keeping the plan steady. The focus is better sleep, energy, protein, water, and recovery before making a harder nutrition change.",
      };
    }

    if (snapshot.lowCompletion || snapshot.lowAdherence) {
      return {
        recommendationType: "Adherence Reset",
        adjustmentSummary: "Do not change numbers until execution improves.",
        calorieAdjustment: "Keep calories steady at " + currentCalories + " and simplify the plan.",
        nutritionAdjustment: "Reduce decision fatigue with repeatable meals, protein at each meal, and a planned backup option for busy days.",
        trainingRecoveryAdjustment: "Keep workouts realistic and avoid adding extra work until follow-through improves.",
        habitAdjustment: "Pick two non-negotiables: protein target and weekly check-in completion.",
        clientMessage: "Before we change calories, we need a more consistent week. The goal is not perfection. The goal is to make the plan easier to follow.",
      };
    }

    if (snapshot.hasAlcohol || snapshot.hasLiquidCalories || snapshot.highCalorieMeal) {
      return {
        recommendationType: "Tighten Food Quality",
        adjustmentSummary: "Keep calories steady and clean up drink/snack calories.",
        calorieAdjustment: "No calorie change this week. Keep target near " + currentCalories + " calories while improving food quality.",
        nutritionAdjustment: "Audit drinks, sauces, snacks, alcohol, and convenience foods before changing macros.",
        trainingRecoveryAdjustment: "Keep workouts steady and watch recovery after alcohol or low-sleep days.",
        habitAdjustment: "Log all drinks and add one high-protein meal before high-risk meals or social events.",
        clientMessage: "We are not changing your numbers yet. This week is about tightening up drinks, snacks, alcohol, and protein consistency.",
      };
    }

    if (snapshot.hasWeightChange && snapshot.weightChange >= 0.5 && !snapshot.highHunger) {
      return {
        recommendationType: "Reduce Calories Slightly",
        adjustmentSummary: "Weight is trending up or stalled with decent adherence. Apply a small calorie decrease.",
        calorieAdjustment: currentCalories ? "Reduce target from " + currentCalories + " to about " + reducedCalories + " calories." : "Reduce calories slightly if current target is known.",
        nutritionAdjustment: "Remove 100-150 calories from fats or carbs while keeping protein steady.",
        trainingRecoveryAdjustment: "Keep training steady and monitor performance.",
        habitAdjustment: "Track the same weigh-in routine and save next week’s check-in.",
        clientMessage: "Since consistency looks better and the trend needs a nudge, we are making a small adjustment instead of a big change.",
      };
    }

    if (snapshot.hasWeightChange && snapshot.weightChange <= -2 && snapshot.highHunger) {
      return {
        recommendationType: "Increase Calories Slightly",
        adjustmentSummary: "Weight is dropping fast with high hunger. Add a small amount back.",
        calorieAdjustment: currentCalories ? "Increase target from " + currentCalories + " to about " + increasedCalories + " calories." : "Increase calories slightly if current target is known.",
        nutritionAdjustment: "Add 100-150 calories from carbs around training or another high-protein snack.",
        trainingRecoveryAdjustment: "Monitor training performance, energy, and hunger.",
        habitAdjustment: "Keep check-ins consistent and report hunger honestly.",
        clientMessage: "The trend may be moving too fast with hunger high, so we are adding a small amount back to protect energy and consistency.",
      };
    }

    return {
      recommendationType: "Keep Plan Steady",
      adjustmentSummary: "No major adjustment needed this week.",
      calorieAdjustment: "Keep target near " + currentCalories + " calories.",
      nutritionAdjustment: "Continue hitting protein, logging meals, and comparing weekly trend data.",
      trainingRecoveryAdjustment: "Keep workouts consistent and monitor performance.",
      habitAdjustment: "Save the next weekly check-in and progress photos under similar conditions.",
      clientMessage: "The plan looks stable enough to keep going. Let’s collect another clean week before changing calories or macros.",
    };
  }

  const [snapshot, setSnapshot] = useState(buildAdjustmentSnapshot);
  const [savedAdjustments, setSavedAdjustments] = useState(readSavedAdjustments);
  const [recommendationType, setRecommendationType] = useState("");
  const [adjustmentSummary, setAdjustmentSummary] = useState("");
  const [calorieAdjustment, setCalorieAdjustment] = useState("");
  const [nutritionAdjustment, setNutritionAdjustment] = useState("");
  const [trainingRecoveryAdjustment, setTrainingRecoveryAdjustment] = useState("");
  const [habitAdjustment, setHabitAdjustment] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [coachAdjustmentNotes, setCoachAdjustmentNotes] = useState("");
  const [adjustmentStatus, setAdjustmentStatus] = useState("");

  function refreshAdjustmentSnapshot() {
    setSnapshot(buildAdjustmentSnapshot());
    setSavedAdjustments(readSavedAdjustments());
    setAdjustmentStatus("Adjustment snapshot refreshed.");
  }

  function generateWeeklyAdjustment() {
    const nextSnapshot = buildAdjustmentSnapshot();
    const recommendation = createRecommendation(nextSnapshot);

    setSnapshot(nextSnapshot);
    setRecommendationType(recommendation.recommendationType);
    setAdjustmentSummary(recommendation.adjustmentSummary);
    setCalorieAdjustment(recommendation.calorieAdjustment);
    setNutritionAdjustment(recommendation.nutritionAdjustment);
    setTrainingRecoveryAdjustment(recommendation.trainingRecoveryAdjustment);
    setHabitAdjustment(recommendation.habitAdjustment);
    setClientMessage(recommendation.clientMessage);
    setCoachAdjustmentNotes(
      nextSnapshot.flags.length
        ? "Generated from: " + nextSnapshot.flags.join(", ")
        : "Generated from stable trend data with no major risk flags."
    );
    setAdjustmentStatus("Weekly adjustment recommendation generated.");
  }

  function saveWeeklyAdjustment() {
    const nextAdjustment = {
      id: "coach-weekly-adjustment-" + Date.now(),
      recommendationType: recommendationType || "Weekly Adjustment",
      adjustmentSummary,
      calorieAdjustment,
      nutritionAdjustment,
      trainingRecoveryAdjustment,
      habitAdjustment,
      clientMessage,
      coachAdjustmentNotes,
      flags: snapshot.flags,
      weightChange: snapshot.weightChange,
      completionPercent: snapshot.completionPercent,
      latestWeight: snapshot.latestCheckIn?.checkInWeight || "",
      latestCalories: snapshot.latestMeal?.calories || "",
      latestTargetCalories: snapshot.latestTarget?.dailyCalories || "",
      savedAt: new Date().toLocaleString(),
    };

    const nextAdjustments = [nextAdjustment, ...savedAdjustments].slice(0, 12);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COACH_WEEKLY_ADJUSTMENTS_STORAGE_KEY, JSON.stringify(nextAdjustments));
      } catch {
        setAdjustmentStatus("Could not save weekly adjustment locally.");
        return;
      }
    }

    setSavedAdjustments(nextAdjustments);
    setAdjustmentStatus("Weekly adjustment saved for client.");
  }

  const latestSavedAdjustment = savedAdjustments[0] || null;

  return (
    <section
      data-testid="coach-weekly-adjustment-recommendation"
      aria-label="Coach weekly adjustment recommendation"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Weekly Adjustment
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Coach Recommendation Engine
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Combine check-ins, weight trend, meal logs, action-plan completion, and progress photos into one weekly adjustment recommendation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAdjustmentSnapshot}
            className="rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase text-white/55 transition hover:border-[#00BF63] hover:text-[#00BF63]"
          >
            Refresh Adjustment Snapshot
          </button>

          <button
            type="button"
            onClick={generateWeeklyAdjustment}
            className="rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
          >
            Generate Weekly Adjustment
          </button>
        </div>
      </div>

      <div
        data-testid="coach-adjustment-data-snapshot"
        className="mt-5 grid gap-3 md:grid-cols-5"
      >
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-black uppercase text-white/65">
          Weight Change: {snapshot.hasWeightChange ? snapshot.weightChange + " lb" : "Need 2 check-ins"}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-black uppercase text-white/65">
          Completion: {snapshot.latestCompletion ? snapshot.completionPercent + "%" : "No completion"}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-black uppercase text-white/65">
          Latest Meal: {snapshot.latestMeal?.calories || "—"} cal
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-black uppercase text-white/65">
          Target: {snapshot.latestTarget?.dailyCalories || "—"} cal
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-black uppercase text-white/65">
          Photos: {snapshot.photoAnglesSaved}/3
        </p>
      </div>

      <div
        data-testid="coach-adjustment-risk-flags"
        className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-4"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">
          Adjustment Inputs
        </p>

        {snapshot.flags.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {snapshot.flags.map((flag) => (
              <p
                key={flag}
                className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/75"
              >
                {flag}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/55">
            No major adjustment flags found.
          </p>
        )}
      </div>

      <div
        data-testid="coach-generated-adjustment"
        className="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Recommendation Type</span>
          <input
            aria-label="Coach Adjustment Recommendation Type"
            value={recommendationType}
            onChange={(event) => setRecommendationType(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Generate or type recommendation"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Adjustment Summary</span>
          <input
            aria-label="Coach Adjustment Summary"
            value={adjustmentSummary}
            onChange={(event) => setAdjustmentSummary(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Short summary"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Calorie Adjustment</span>
          <textarea
            aria-label="Coach Calorie Adjustment"
            value={calorieAdjustment}
            onChange={(event) => setCalorieAdjustment(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Calorie change or no change"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Nutrition Adjustment</span>
          <textarea
            aria-label="Coach Nutrition Adjustment"
            value={nutritionAdjustment}
            onChange={(event) => setNutritionAdjustment(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Nutrition adjustment"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Training / Recovery Adjustment</span>
          <textarea
            aria-label="Coach Training Recovery Adjustment"
            value={trainingRecoveryAdjustment}
            onChange={(event) => setTrainingRecoveryAdjustment(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Training or recovery adjustment"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Habit Adjustment</span>
          <textarea
            aria-label="Coach Habit Adjustment"
            value={habitAdjustment}
            onChange={(event) => setHabitAdjustment(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Habit adjustment"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-black uppercase text-white/45">Client Adjustment Message</span>
          <textarea
            aria-label="Coach Adjustment Client Message"
            value={clientMessage}
            onChange={(event) => setClientMessage(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Client-facing adjustment message"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-black uppercase text-white/45">Coach Adjustment Notes</span>
          <textarea
            aria-label="Coach Adjustment Internal Notes"
            value={coachAdjustmentNotes}
            onChange={(event) => setCoachAdjustmentNotes(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Private coach notes about why this adjustment was chosen"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={saveWeeklyAdjustment}
        className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
      >
        Save Weekly Adjustment
      </button>

      {adjustmentStatus && (
        <p
          data-testid="coach-weekly-adjustment-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {adjustmentStatus}
        </p>
      )}

      {latestSavedAdjustment && (
        <div
          data-testid="coach-saved-adjustment-card"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Saved Adjustment
          </p>
          <h4 className="mt-2 text-xl font-black text-white">{latestSavedAdjustment.recommendationType}</h4>
          <p className="mt-2 text-sm font-bold text-white/65">
            {latestSavedAdjustment.adjustmentSummary || "No summary saved."}
          </p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
            {latestSavedAdjustment.clientMessage || "No client message saved."}
          </p>
        </div>
      )}
    </section>
  );
}

function CoachActionPlanCompletionReviewPanel() {
  const CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY = "nlf-client-action-plan-completions-v1";
  const COACH_COMPLETION_REVIEW_NOTES_STORAGE_KEY = "nlf-coach-action-plan-completion-review-notes-v1";

  function readJsonStorage(key, fallback) {
    if (typeof window === "undefined") return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function readSavedCompletions() {
    const saved = readJsonStorage(CLIENT_ACTION_PLAN_COMPLETIONS_STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  function readCoachReviewNotes() {
    if (typeof window === "undefined") return "";

    try {
      return window.localStorage.getItem(COACH_COMPLETION_REVIEW_NOTES_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  const [savedCompletions, setSavedCompletions] = useState(readSavedCompletions);
  const [coachCompletionReviewNotes, setCoachCompletionReviewNotes] = useState(readCoachReviewNotes);
  const [completionReviewStatus, setCompletionReviewStatus] = useState("");

  const latestCompletion = savedCompletions[0] || null;

  const completionPercent = Number(latestCompletion?.completionPercent || 0);
  const completionLabel =
    completionPercent >= 100
      ? "Complete"
      : completionPercent >= 75
        ? "Strong"
        : completionPercent >= 50
          ? "Partial"
          : latestCompletion
            ? "Low"
            : "No completion yet";

  function refreshCompletionReview() {
    setSavedCompletions(readSavedCompletions());
    setCompletionReviewStatus("Action plan completion review refreshed.");
  }

  function saveCompletionReviewNotes() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COACH_COMPLETION_REVIEW_NOTES_STORAGE_KEY, coachCompletionReviewNotes);
      } catch {
        setCompletionReviewStatus("Could not save completion review notes locally.");
        return;
      }
    }

    setCompletionReviewStatus("Coach completion review notes saved.");
  }

  return (
    <section
      data-testid="coach-action-plan-completion-review"
      aria-label="Coach action plan completion review"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Completion Review
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Client Action Plan Follow-Through
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Review whether the client completed the coach-saved weekly action plan before making the next adjustment.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCompletionReview}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Completion Review
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Completion Logs</p>
          <p className="mt-1 text-3xl font-black text-white">{savedCompletions.length}</p>
        </div>

        <div
          data-testid="coach-action-plan-completion-score"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p className="text-xs font-black uppercase text-white/45">Completion Score</p>
          <p className="mt-1 text-3xl font-black text-white">
            {latestCompletion ? latestCompletion.completionPercent + "%" : "—"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-black uppercase text-white/45">Completed Items</p>
          <p className="mt-1 text-3xl font-black text-white">
            {latestCompletion ? latestCompletion.completedItems + "/" + latestCompletion.totalItems : "—"}
          </p>
        </div>

        <div
          data-testid="coach-action-plan-completion-label"
          className="rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Status</p>
          <p className="mt-1 text-3xl font-black text-white">{completionLabel}</p>
        </div>
      </div>

      {latestCompletion ? (
        <div
          data-testid="coach-latest-action-plan-completion"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Client Completion
          </p>
          <h4 className="mt-2 text-xl font-black text-white">
            {latestCompletion.planTitle || "Weekly Action Plan"}
          </h4>
          <p className="mt-2 text-sm font-black uppercase text-white/55">
            Priority: {latestCompletion.priorityFocus || "—"}
          </p>

          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Nutrition: {latestCompletion.nutritionComplete ? "Done" : "Not done"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Training: {latestCompletion.trainingComplete ? "Done" : "Not done"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Habit: {latestCompletion.habitComplete ? "Done" : "Not done"}
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/70">
              Message: {latestCompletion.messageReviewed ? "Reviewed" : "Not reviewed"}
            </p>
          </div>

          {latestCompletion.clientCompletionNotes && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
              Client Notes: {latestCompletion.clientCompletionNotes}
            </p>
          )}

          {completionPercent < 75 && (
            <p
              data-testid="coach-action-plan-completion-flag"
              className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100/80"
            >
              Completion is under 75%. Review barriers before increasing plan difficulty.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/45">
          No client completion has been saved yet.
        </p>
      )}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Coach Completion Review Notes
          </span>
          <textarea
            aria-label="Coach Action Plan Completion Review Notes"
            value={coachCompletionReviewNotes}
            onChange={(event) => setCoachCompletionReviewNotes(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Example: Client completed nutrition and habit actions but missed recovery action. Keep next plan simple."
          />
        </label>

        <button
          type="button"
          onClick={saveCompletionReviewNotes}
          className="mt-4 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
        >
          Save Completion Review Notes
        </button>
      </div>

      {completionReviewStatus && (
        <p
          data-testid="coach-action-plan-completion-review-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {completionReviewStatus}
        </p>
      )}
    </section>
  );
}

function CoachWeeklyActionPlanGenerator() {
  const NUTRITION_HISTORY_STORAGE_KEY = "nlf-nutrition-history-v1";
  const CLIENT_WEEKLY_CHECKINS_STORAGE_KEY = "nlf-client-weekly-checkins-v1";
  const PROGRESS_PHOTOS_STORAGE_KEY = "nlf-client-progress-photos-v1";
  const COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY = "nlf-coach-client-weekly-action-plans-v1";

  function readJsonStorage(key, fallback) {
    if (typeof window === "undefined") return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function readSavedActionPlans() {
    const saved = readJsonStorage(COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  function buildRiskSnapshot() {
    const nutritionHistory = readJsonStorage(NUTRITION_HISTORY_STORAGE_KEY, { targets: [], meals: [] });
    const clientCheckIns = readJsonStorage(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY, []);
    const progressPhotos = readJsonStorage(PROGRESS_PHOTOS_STORAGE_KEY, []);

    const savedTargets = Array.isArray(nutritionHistory.targets) ? nutritionHistory.targets : [];
    const savedMeals = Array.isArray(nutritionHistory.meals) ? nutritionHistory.meals : [];
    const savedCheckIns = Array.isArray(clientCheckIns) ? clientCheckIns : [];
    const savedPhotos = Array.isArray(progressPhotos) ? progressPhotos : [];

    const latestTarget = savedTargets[0] || null;
    const latestMeal = savedMeals[0] || null;
    const latestCheckIn = savedCheckIns[0] || null;
    const latestPhotoCheckIn = savedPhotos[0] || null;

    const hasAlcohol = Array.isArray(latestMeal?.matches) &&
      latestMeal.matches.some((item) =>
        String(item.category || "").toLowerCase() === "alcohol" ||
        /beer|vodka|whiskey|tequila|malt liquor|seltzer|wine|cocktail|margarita/i.test(String(item.name || ""))
      );

    const hasLiquidCalories = Array.isArray(latestMeal?.matches) &&
      latestMeal.matches.some((item) =>
        /sweet tea|kool-aid|koolaid|soda|juice|lemonade|energy drink|frappuccino|chocolate milk/i.test(String(item.name || ""))
      );

    const highCalorieMeal = Number(latestMeal?.calories) >= 800;
    const lowAdherence = Number(latestCheckIn?.adherenceScore) > 0 && Number(latestCheckIn?.adherenceScore) < 75;
    const highHunger = Number(latestCheckIn?.hungerScore) >= 4;
    const lowEnergy = Number(latestCheckIn?.energyScore) <= 2;
    const poorSleep = Number(latestCheckIn?.sleepScore) <= 2;
    const highStress = Number(latestCheckIn?.stressScore) >= 4;
    const lowRecovery = Number(latestCheckIn?.recoveryScore) <= 2;

    const photoAnglesSaved = latestPhotoCheckIn
      ? [latestPhotoCheckIn.frontPhoto, latestPhotoCheckIn.sidePhoto, latestPhotoCheckIn.backPhoto].filter(Boolean).length
      : 0;

    const flags = [];

    if (poorSleep) flags.push("Sleep is poor");
    if (lowEnergy) flags.push("Energy is low");
    if (lowRecovery) flags.push("Recovery is low");
    if (highStress) flags.push("Stress is high");
    if (lowAdherence) flags.push("Adherence is below 75%");
    if (highHunger) flags.push("Hunger is high");
    if (hasAlcohol) flags.push("Alcohol appears in latest meal log");
    if (hasLiquidCalories) flags.push("Liquid calories appear in latest meal log");
    if (highCalorieMeal) flags.push("Latest meal is 800+ calories");
    if (photoAnglesSaved > 0 && photoAnglesSaved < 3) flags.push("Progress photo check-in is incomplete");

    return {
      latestTarget,
      latestMeal,
      latestCheckIn,
      latestPhotoCheckIn,
      photoAnglesSaved,
      flags,
      poorSleep,
      lowEnergy,
      lowRecovery,
      highStress,
      lowAdherence,
      highHunger,
      hasAlcohol,
      hasLiquidCalories,
      highCalorieMeal,
    };
  }

  function createSuggestedPlan(snapshot) {
    if (snapshot.poorSleep || snapshot.lowEnergy || snapshot.lowRecovery) {
      return {
        title: "Recovery First Weekly Plan",
        priority: "Recovery, sleep, and consistency",
        nutritionAction: "Keep calories steady this week. Hit protein first, reduce alcohol, drink water with each meal, and avoid cutting harder until sleep and energy improve.",
        trainingAction: "Keep training controlled. Avoid adding extra volume. Track soreness, sleep, and performance before increasing intensity.",
        habitAction: "Set a simple sleep target, prep one high-protein meal option, and keep the same weigh-in routine for the next check-in.",
        clientMessage: "This week we are not chasing a harder plan. We are going to stabilize sleep, energy, protein, and consistency first so the next adjustment is based on better data.",
      };
    }

    if (snapshot.hasAlcohol || snapshot.hasLiquidCalories) {
      return {
        title: "Liquid Calories And Weekend Control Plan",
        priority: "Alcohol, drinks, and weekend consistency",
        nutritionAction: "Keep the current macro target. Replace weekday liquid calories with zero-calorie options and limit alcohol to one planned day if the client chooses to drink.",
        trainingAction: "Keep workouts normal but monitor recovery after alcohol or low-sleep days.",
        habitAction: "Log all drinks before the next check-in and add one high-protein meal before any social event.",
        clientMessage: "The main focus this week is honest drink tracking and better weekend control. We are keeping the plan simple so consistency improves.",
      };
    }

    if (snapshot.lowAdherence) {
      return {
        title: "Adherence Reset Weekly Plan",
        priority: "Execution before adjustment",
        nutritionAction: "Do not lower calories yet. Simplify meals, repeat easy protein options, and reduce the number of decisions during busy days.",
        trainingAction: "Keep workouts realistic and schedule them earlier in the day when possible.",
        habitAction: "Pick two non-negotiables: protein at each meal and one planned grocery/convenience backup meal.",
        clientMessage: "Before we change numbers, we need a more consistent week. The goal is not perfection. The goal is to make the plan easier to follow.",
      };
    }

    if (snapshot.highHunger || snapshot.highCalorieMeal) {
      return {
        title: "Hunger And Portion Control Plan",
        priority: "Protein, fiber, and meal structure",
        nutritionAction: "Keep protein high, add more filling foods, watch sauces/snacks, and build meals around lean protein before carbs or fats.",
        trainingAction: "Keep training steady and monitor whether hunger spikes on harder workout days.",
        habitAction: "Use a planned snack or protein option before the highest-risk meal of the day.",
        clientMessage: "This week we are going to control hunger without making the plan harder. More structure, better protein, and fewer surprise calories.",
      };
    }

    return {
      title: "Steady Progress Weekly Plan",
      priority: "Stay consistent and monitor trend",
      nutritionAction: "Keep the current target steady. Continue logging meals and compare next check-in weight, waist, photos, and adherence.",
      trainingAction: "Keep workouts consistent and track performance.",
      habitAction: "Save one weekly check-in and progress photos using the same lighting and timing.",
      clientMessage: "Everything looks stable enough to keep the plan steady. Let’s collect another clean week of data before making changes.",
    };
  }

  const [riskSnapshot, setRiskSnapshot] = useState(buildRiskSnapshot);
  const [savedActionPlans, setSavedActionPlans] = useState(readSavedActionPlans);
  const [planTitle, setPlanTitle] = useState("");
  const [priorityFocus, setPriorityFocus] = useState("");
  const [nutritionAction, setNutritionAction] = useState("");
  const [trainingAction, setTrainingAction] = useState("");
  const [habitAction, setHabitAction] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [coachInternalNote, setCoachInternalNote] = useState("");
  const [actionPlanStatus, setActionPlanStatus] = useState("");

  function refreshRiskSnapshot() {
    setRiskSnapshot(buildRiskSnapshot());
    setSavedActionPlans(readSavedActionPlans());
    setActionPlanStatus("Action plan snapshot refreshed.");
  }

  function generateWeeklyActionPlan() {
    const snapshot = buildRiskSnapshot();
    const suggested = createSuggestedPlan(snapshot);

    setRiskSnapshot(snapshot);
    setPlanTitle(suggested.title);
    setPriorityFocus(suggested.priority);
    setNutritionAction(suggested.nutritionAction);
    setTrainingAction(suggested.trainingAction);
    setHabitAction(suggested.habitAction);
    setClientMessage(suggested.clientMessage);
    setCoachInternalNote(
      snapshot.flags.length
        ? "Generated from flags: " + snapshot.flags.join(", ")
        : "Generated from a clear risk snapshot."
    );
    setActionPlanStatus("Weekly action plan generated.");
  }

  function saveWeeklyActionPlan() {
    const nextPlan = {
      id: "coach-weekly-action-plan-" + Date.now(),
      planTitle: planTitle || "Weekly Coach Action Plan",
      priorityFocus,
      nutritionAction,
      trainingAction,
      habitAction,
      clientMessage,
      coachInternalNote,
      flags: riskSnapshot.flags,
      latestWeight: riskSnapshot.latestCheckIn?.checkInWeight || "",
      latestCalories: riskSnapshot.latestMeal?.calories || "",
      latestTargetCalories: riskSnapshot.latestTarget?.dailyCalories || "",
      photoAnglesSaved: riskSnapshot.photoAnglesSaved,
      savedAt: new Date().toLocaleString(),
    };

    const nextPlans = [nextPlan, ...savedActionPlans].slice(0, 12);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(COACH_WEEKLY_ACTION_PLANS_STORAGE_KEY, JSON.stringify(nextPlans));
      } catch {
        setActionPlanStatus("Could not save weekly action plan locally.");
        return;
      }
    }

    setSavedActionPlans(nextPlans);
    setActionPlanStatus("Weekly coach action plan saved for client.");
  }

  const latestSavedPlan = savedActionPlans[0] || null;

  return (
    <section
      data-testid="coach-weekly-action-plan-generator"
      aria-label="Coach weekly action plan generator"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-black/60 p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Weekly Action Plan
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Turn Risk Flags Into A Client Plan
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Generate a simple weekly plan from saved nutrition, check-in, and progress-photo data. Edit it before saving it for the client.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshRiskSnapshot}
            className="rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase text-white/55 transition hover:border-[#00BF63] hover:text-[#00BF63]"
          >
            Refresh Snapshot
          </button>

          <button
            type="button"
            onClick={generateWeeklyActionPlan}
            className="rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
          >
            Generate Weekly Action Plan
          </button>
        </div>
      </div>

      <div
        data-testid="coach-action-plan-risk-snapshot"
        className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-4"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">
          Current Risk Snapshot
        </p>

        {riskSnapshot.flags.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {riskSnapshot.flags.map((flag) => (
              <p
                key={flag}
                className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/75"
              >
                {flag}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/55">
            No major flags found yet.
          </p>
        )}
      </div>

      <div
        data-testid="coach-generated-action-plan"
        className="mt-5 grid gap-4 md:grid-cols-2"
      >
        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Plan Title</span>
          <input
            aria-label="Coach Weekly Action Plan Title"
            value={planTitle}
            onChange={(event) => setPlanTitle(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Generate or type a plan title"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Priority Focus</span>
          <input
            aria-label="Coach Weekly Priority Focus"
            value={priorityFocus}
            onChange={(event) => setPriorityFocus(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Main focus for the week"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Nutrition Action</span>
          <textarea
            aria-label="Coach Weekly Nutrition Action"
            value={nutritionAction}
            onChange={(event) => setNutritionAction(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Nutrition action for the week"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Training / Recovery Action</span>
          <textarea
            aria-label="Coach Weekly Training Recovery Action"
            value={trainingAction}
            onChange={(event) => setTrainingAction(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Training or recovery action for the week"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Habit Action</span>
          <textarea
            aria-label="Coach Weekly Habit Action"
            value={habitAction}
            onChange={(event) => setHabitAction(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Simple weekly habit focus"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase text-white/45">Client Message</span>
          <textarea
            aria-label="Coach Weekly Client Message"
            value={clientMessage}
            onChange={(event) => setClientMessage(event.target.value)}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Client-facing message"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-black uppercase text-white/45">Coach Internal Notes</span>
          <textarea
            aria-label="Coach Weekly Internal Notes"
            value={coachInternalNote}
            onChange={(event) => setCoachInternalNote(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
            placeholder="Private coach notes about why this plan was chosen"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={saveWeeklyActionPlan}
        className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
      >
        Save Weekly Action Plan
      </button>

      {actionPlanStatus && (
        <p
          data-testid="coach-weekly-action-plan-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4 text-sm font-black text-[#00BF63]"
        >
          {actionPlanStatus}
        </p>
      )}

      {latestSavedPlan && (
        <div
          data-testid="coach-saved-action-plan-card"
          className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            Latest Saved Client Plan
          </p>
          <h4 className="mt-2 text-xl font-black text-white">{latestSavedPlan.planTitle}</h4>
          <p className="mt-2 text-sm font-bold text-white/65">
            Priority: {latestSavedPlan.priorityFocus || "—"}
          </p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-6 text-white/70">
            {latestSavedPlan.clientMessage || "No client message saved."}
          </p>
        </div>
      )}
    </section>
  );
}

function CoachDashboardCommandSummaryCards() {
  const NUTRITION_HISTORY_STORAGE_KEY = "nlf-nutrition-history-v1";
  const CLIENT_WEEKLY_CHECKINS_STORAGE_KEY = "nlf-client-weekly-checkins-v1";
  const PROGRESS_PHOTOS_STORAGE_KEY = "nlf-client-progress-photos-v1";

  function readJsonStorage(key, fallback) {
    if (typeof window === "undefined") return fallback;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function buildCoachSummary() {
    const nutritionHistory = readJsonStorage(NUTRITION_HISTORY_STORAGE_KEY, { targets: [], meals: [] });
    const clientCheckIns = readJsonStorage(CLIENT_WEEKLY_CHECKINS_STORAGE_KEY, []);
    const progressPhotos = readJsonStorage(PROGRESS_PHOTOS_STORAGE_KEY, []);

    const savedTargets = Array.isArray(nutritionHistory.targets) ? nutritionHistory.targets : [];
    const savedMeals = Array.isArray(nutritionHistory.meals) ? nutritionHistory.meals : [];
    const savedCheckIns = Array.isArray(clientCheckIns) ? clientCheckIns : [];
    const savedPhotos = Array.isArray(progressPhotos) ? progressPhotos : [];

    return {
      latestTarget: savedTargets[0] || null,
      latestMeal: savedMeals[0] || null,
      latestCheckIn: savedCheckIns[0] || null,
      previousCheckIn: savedCheckIns[1] || null,
      latestPhotoCheckIn: savedPhotos[0] || null,
      targetCount: savedTargets.length,
      mealCount: savedMeals.length,
      checkInCount: savedCheckIns.length,
      photoCount: savedPhotos.length,
    };
  }

  const [coachSummary, setCoachSummary] = useState(buildCoachSummary);
  const [summaryStatus, setSummaryStatus] = useState("");

  function refreshCoachSummary() {
    setCoachSummary(buildCoachSummary());
    setSummaryStatus("Coach command summary refreshed.");
  }

  const latestTarget = coachSummary.latestTarget;
  const latestMeal = coachSummary.latestMeal;
  const latestCheckIn = coachSummary.latestCheckIn;
  const previousCheckIn = coachSummary.previousCheckIn;
  const latestPhotoCheckIn = coachSummary.latestPhotoCheckIn;

  const latestWeight = Number(latestCheckIn?.checkInWeight);
  const previousWeight = Number(previousCheckIn?.checkInWeight);
  const hasWeightChange = Number.isFinite(latestWeight) && Number.isFinite(previousWeight);
  const weightChange = hasWeightChange ? Number((latestWeight - previousWeight).toFixed(1)) : 0;
  const weightTrendLabel = !latestCheckIn
    ? "No check-in"
    : !hasWeightChange
      ? latestCheckIn.checkInWeight + " lb"
      : weightChange < 0
        ? Math.abs(weightChange).toFixed(1) + " lb down"
        : weightChange > 0
          ? weightChange.toFixed(1) + " lb up"
          : "No change";

  const hasAlcohol = Array.isArray(latestMeal?.matches) &&
    latestMeal.matches.some((item) =>
      String(item.category || "").toLowerCase() === "alcohol" ||
      /beer|vodka|whiskey|tequila|malt liquor|seltzer|wine|cocktail|margarita/i.test(String(item.name || ""))
    );

  const hasLiquidCalories = Array.isArray(latestMeal?.matches) &&
    latestMeal.matches.some((item) =>
      /sweet tea|kool-aid|koolaid|soda|juice|lemonade|energy drink|frappuccino|chocolate milk/i.test(String(item.name || ""))
    );

  const hasConvenienceFood = Array.isArray(latestMeal?.matches) &&
    latestMeal.matches.some((item) =>
      /Convenience|Snack|Fast Food/i.test(String(item.category || ""))
    );

  const highCalorieMeal = Number(latestMeal?.calories) >= 800;
  const lowAdherence = Number(latestCheckIn?.adherenceScore) > 0 && Number(latestCheckIn?.adherenceScore) < 75;
  const highHunger = Number(latestCheckIn?.hungerScore) >= 4;
  const lowEnergy = Number(latestCheckIn?.energyScore) <= 2;
  const poorSleep = Number(latestCheckIn?.sleepScore) <= 2;
  const highStress = Number(latestCheckIn?.stressScore) >= 4;
  const lowRecovery = Number(latestCheckIn?.recoveryScore) <= 2;

  const photoAnglesSaved = latestPhotoCheckIn
    ? [latestPhotoCheckIn.frontPhoto, latestPhotoCheckIn.sidePhoto, latestPhotoCheckIn.backPhoto].filter(Boolean).length
    : 0;

  const riskFlags = [
    hasAlcohol,
    hasLiquidCalories,
    hasConvenienceFood,
    highCalorieMeal,
    lowAdherence,
    highHunger,
    lowEnergy,
    poorSleep,
    highStress,
    lowRecovery,
    photoAnglesSaved > 0 && photoAnglesSaved < 3,
  ].filter(Boolean).length;

  const riskLabel =
    riskFlags >= 6
      ? "High"
      : riskFlags >= 3
        ? "Moderate"
        : riskFlags >= 1
          ? "Low"
          : "Clear";

  const recommendedAction =
    !latestCheckIn && !latestMeal && !latestTarget
      ? "Client needs to save a macro target, meal log, and weekly check-in before the next review."
      : poorSleep || lowEnergy || lowRecovery
        ? "Prioritize recovery first. Review sleep, energy, hydration, training load, alcohol, and calories before cutting harder."
        : hasAlcohol
          ? "Review alcohol before adjusting food. Check sleep, recovery, weekend intake, and liquid calories."
          : lowAdherence
            ? "Address adherence barriers before changing calories or macros."
            : highHunger
              ? "Review meal timing, protein, fiber, sleep, and deficit size."
              : highCalorieMeal || hasLiquidCalories
                ? "Audit drinks, sauces, snacks, and portion sizes before making a macro change."
                : "No urgent nutrition risk. Review trend and keep the plan steady unless performance or adherence changes.";

  return (
    <section
      data-testid="coach-command-summary-cards"
      aria-label="Coach command center nutrition summary"
      className="mt-5 rounded-3xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-5 shadow-xl shadow-black/20"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#00BF63]">
            Coach Command Snapshot
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">
            Client Nutrition And Check-In Risk Summary
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Fast view of saved targets, meals, weekly check-ins, photos, and coaching risks before opening the full review sections.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCoachSummary}
          className="w-fit rounded-full border border-[#00BF63] px-5 py-3 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
        >
          Refresh Command Summary
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <div
          data-testid="coach-command-weight-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Weight Trend</p>
          <p className="mt-2 text-2xl font-black text-white">{weightTrendLabel}</p>
          <p className="mt-1 text-xs font-bold uppercase text-white/45">
            {coachSummary.checkInCount} check-in(s)
          </p>
        </div>

        <div
          data-testid="coach-command-target-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Macro Target</p>
          {latestTarget ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{latestTarget.dailyCalories} cal</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/45">
                {latestTarget.goalLabel || "Goal"} | {latestTarget.protein}g protein
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No target saved.</p>
          )}
        </div>

        <div
          data-testid="coach-command-meal-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Latest Meal</p>
          {latestMeal ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{latestMeal.calories} cal</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/45">
                {latestMeal.protein}g protein | {latestMeal.confidence || "—"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No meal saved.</p>
          )}
        </div>

        <div
          data-testid="coach-command-photo-card"
          className="rounded-3xl border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs font-black uppercase text-[#00BF63]">Photos</p>
          {latestPhotoCheckIn ? (
            <>
              <p className="mt-2 text-2xl font-black text-white">{photoAnglesSaved}/3</p>
              <p className="mt-1 text-xs font-bold uppercase text-white/45">
                angles | {latestPhotoCheckIn.photoDate || "latest"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm font-bold text-white/45">No photos saved.</p>
          )}
        </div>

        <div
          data-testid="coach-command-risk-card"
          className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-4"
        >
          <p className="text-xs font-black uppercase text-yellow-100/70">Risk Level</p>
          <p className="mt-2 text-2xl font-black text-white">{riskLabel}</p>
          <p className="mt-1 text-xs font-bold uppercase text-yellow-100/55">
            {riskFlags} active flag(s)
          </p>
        </div>
      </div>

      <div
        data-testid="coach-command-summary-counts"
        className="mt-4 grid gap-3 md:grid-cols-4"
      >
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Targets: {coachSummary.targetCount}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Meals: {coachSummary.mealCount}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Check-ins: {coachSummary.checkInCount}
        </p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-black uppercase text-white/55">
          Photo logs: {coachSummary.photoCount}
        </p>
      </div>

      {(riskFlags > 0) && (
        <div
          data-testid="coach-command-risk-flags"
          className="mt-5 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">
            Risk Flags
          </p>

          <div className="mt-3 grid gap-2">
            {hasAlcohol && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Alcohol appears in the latest meal log.
              </p>
            )}
            {hasLiquidCalories && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Liquid calories appear in the latest meal log.
              </p>
            )}
            {hasConvenienceFood && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Convenience or snack foods appear in the latest meal log.
              </p>
            )}
            {highCalorieMeal && (
              <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/70">
                Latest meal is 800+ calories.
              </p>
            )}
            {lowAdherence && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Weekly adherence is below 75%.
              </p>
            )}
            {highHunger && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Hunger is high.
              </p>
            )}
            {lowEnergy && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Energy is low.
              </p>
            )}
            {poorSleep && (
              <p className="rounded-2xl border border-red-400/20 bg-black/30 p-3 text-sm font-bold text-red-100/80">
                Sleep is poor.
              </p>
            )}
            {highStress && (
              <p className="rounded-2xl border border-yellow-400/20 bg-black/30 p-3 text-sm font-bold text-yellow-100/80">
                Stress is high.
              </p>
            )}
            {lowRecovery && (
              <p className="rounded-2xl border border-orange-400/20 bg-black/30 p-3 text-sm font-bold text-orange-100/80">
                Recovery is low.
              </p>
            )}
            {photoAnglesSaved > 0 && photoAnglesSaved < 3 && (
              <p className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm font-bold text-white/70">
                Progress photo check-in is incomplete.
              </p>
            )}
          </div>
        </div>
      )}

      <div
        data-testid="coach-command-recommended-action"
        className="mt-5 rounded-3xl border border-[#00BF63]/20 bg-black/40 p-5"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
          Recommended Coach Action
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-white/70">
          {recommendedAction}
        </p>
      </div>

      {summaryStatus && (
        <p
          data-testid="coach-command-summary-status"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-black/40 p-4 text-sm font-black text-[#00BF63]"
        >
          {summaryStatus}
        </p>
      )}
    </section>
  );
}

function CoachScreen({
  clients = [],
  notifications = [],
  savedPlans = [],
  workoutLogs = [],
  conversations = [],
  selectedWorkoutLogId,
  setSelectedWorkoutLogId,
  deleteWorkoutLog,
  onSaveCoachSessionLog = () => {},
  unreadCoachCount = 0,
  unreadActivityCount = 0,
  activityFilter,
  setActivityFilter,
  markActivityRead,
  markAllActivityRead,
  openTrackerForClient = () => {},
  openMessagesForClient = () => {},
  openPlansForClient = () => {},
}) {
  const [selectedCoachClientId, setSelectedCoachClientId] = useState("");
  const [coachSessionExercise, setCoachSessionExercise] = useState("Back Squat");
  const [coachSessionSets, setCoachSessionSets] = useState("3");
  const [coachSessionReps, setCoachSessionReps] = useState("10");
  const [coachSessionWeight, setCoachSessionWeight] = useState("");
  const [coachSessionNotes, setCoachSessionNotes] = useState("");
  const [coachSessionStatus, setCoachSessionStatus] = useState("");

  const safeClients = Array.isArray(clients) ? clients : [];
  const safePlans = Array.isArray(savedPlans) ? savedPlans : [];
  const safeLogs = Array.isArray(workoutLogs) ? workoutLogs : [];
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const { queue } = useNlfCoachReviewSnapshot();
  const pendingDrafts = Array.isArray(queue)
    ? queue.filter((item) => item.status !== "approved")
    : [];

  const filters = ["All", "Unread", "Workouts", "Substitutions", "Notes", "Plans", "Messages", "Email"];
  const filteredNotifications = safeNotifications.filter((notification) => {
    if (activityFilter === "All") return true;
    if (activityFilter === "Unread") return !notification.isRead;
    return notification.type === activityFilter;
  });

  const activeClients = safeClients.filter((client) => {
    const status = String(client?.coachingStatus || client?.status || "").toLowerCase();

    return status !== "archived" && status !== "unassigned";
  });

  function itemMatchesClient(item, client) {
    if (!item || !client) return false;

    const clientId = String(client.id || "");
    const clientName = String(client.name || "").toLowerCase();
    const itemClientId = String(item.clientId || item.client_id || "");
    const itemClientName = String(item.clientName || item.client || item.name || "").toLowerCase();

    return Boolean(
      (clientId && itemClientId === clientId) ||
        (clientName && itemClientName.includes(clientName))
    );
  }

  function getClientConversation(client) {
    return (
      safeConversations.find((conversation) => itemMatchesClient(conversation, client)) ||
      safeConversations.find((conversation) => conversation.clientId === client?.id) ||
      null
    );
  }

  function getClientPlans(client) {
    return safePlans.filter((plan) => itemMatchesClient(plan, client));
  }

  function getClientLogs(client) {
    return safeLogs.filter((log) => itemMatchesClient(log, client));
  }

  function getClientUnreadMessages(client) {
    const conversation = getClientConversation(client);
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    const messageUnreadCount = messages.filter((message) => message.unreadForCoach).length;
    const conversationUnreadCount = Number(conversation?.coachUnread || conversation?.unreadForCoach || 0);

    return Math.max(messageUnreadCount, conversationUnreadCount);
  }

  function getClientPendingDrafts(client) {
    return pendingDrafts.filter((draft) => itemMatchesClient(draft, client));
  }

  function getClientAttentionReasons(client) {
    const reasons = [];
    const unreadMessages = getClientUnreadMessages(client);
    const clientDrafts = getClientPendingDrafts(client);
    const clientPlans = getClientPlans(client);
    const clientLogs = getClientLogs(client);

    if (unreadMessages > 0) reasons.push(unreadMessages + " unread message" + (unreadMessages === 1 ? "" : "s"));
    if (clientDrafts.length > 0) reasons.push(clientDrafts.length + " plan awaiting review");
    if (clientPlans.length === 0) reasons.push("no assigned plan");
    if (clientLogs.length === 0) reasons.push("no workout logs yet");

    return reasons;
  }

  const clientsNeedingAttention = activeClients
    .map((client) => ({
      client,
      reasons: getClientAttentionReasons(client),
    }))
    .filter((item) => item.reasons.length > 0);

  const selectedClient =
    activeClients.find((client) => client.id === selectedCoachClientId) ||
    activeClients[0] ||
    safeClients[0] ||
    null;

  const selectedClientPlans = selectedClient ? getClientPlans(selectedClient) : [];
  const selectedClientLogs = selectedClient ? getClientLogs(selectedClient) : [];
  const selectedClientConversation = selectedClient ? getClientConversation(selectedClient) : null;
  const selectedClientMessages = Array.isArray(selectedClientConversation?.messages)
    ? selectedClientConversation.messages.slice(-3).reverse()
    : [];
  const selectedClientUnreadCount = selectedClient ? getClientUnreadMessages(selectedClient) : 0;
  const selectedClientPendingDraftCount = selectedClient ? getClientPendingDrafts(selectedClient).length : 0;

  const selectedWorkoutLog =
    safeLogs.find((log) => log.id === selectedWorkoutLogId) ||
    safeLogs[0] ||
    null;

  const recentWorkoutLogs = safeLogs
    .slice()
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
    .slice(0, 4);

  const recentMessages = safeConversations
    .flatMap((conversation) =>
      (Array.isArray(conversation.messages) ? conversation.messages : []).map((message) => ({
        ...message,
        clientName: conversation.clientName,
        clientId: conversation.clientId,
      }))
    )
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
    .slice(0, 4);

  const recentActivityItems = [
    ...pendingDrafts.slice(0, 3).map((draft) => ({
      id: "draft-" + (draft.id || draft.title || draft.planName),
      label: "Plan Review",
      title: draft.title || draft.planName || "Client workout draft",
      detail: draft.clientName || "Client plan awaiting review",
    })),
    ...recentWorkoutLogs.map((log) => ({
      id: "log-" + (log.id || log.timestamp || log.dayName),
      label: "Workout Log",
      title: log.dayName || log.planName || "Workout logged",
      detail: log.clientName || log.status || "Client activity recorded",
    })),
    ...recentMessages.map((message) => ({
      id: "message-" + (message.id || message.timestamp || message.body),
      label: "Message",
      title: message.clientName || "Client message",
      detail: message.body || "Message activity",
    })),
  ].slice(0, 8);

  function handleCoachSessionSubmit(event) {
    event.preventDefault();

    if (!selectedClient) {
      setCoachSessionStatus("Select a client before saving a coach session.");
      return;
    }

    const savedLog = onSaveCoachSessionLog({
      clientId: selectedClient.id,
      exerciseName: coachSessionExercise,
      setsCompleted: coachSessionSets,
      repsCompleted: coachSessionReps,
      actualWeight: coachSessionWeight,
      notes: coachSessionNotes,
    });

    setCoachSessionStatus(
      "Coach session saved for " +
        (savedLog?.clientName || selectedClient.name || "client") +
        ". Workout history and progress are updated."
    );
    setCoachSessionNotes("");
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Coach Dashboard"
        title="Coach Command Center"
        description="Manage assigned clients, plan reviews, workout logs, messages, and progress from one production-facing workspace."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Clients" value={activeClients.length} />
        <StatCard label="Plans Awaiting Review" value={pendingDrafts.length} />
        <StatCard label="Recent Workout Logs" value={recentWorkoutLogs.length} />
        <StatCard label="Unread Client Messages" value={unreadCoachCount} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section
          data-testid="coach-clients-needing-attention"
          className="rounded-[1.5rem] border border-[#00BF63]/25 bg-white/[0.04] p-5"
        >
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
                Coach workflow
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase text-white">
                Clients Needing Attention
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Prioritize clients with unread messages, plan reviews, missing plans, or missing workout history.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black uppercase text-white/60">
              {clientsNeedingAttention.length} flagged
            </span>
          </div>

          <div className="space-y-3">
            {clientsNeedingAttention.slice(0, 6).map(({ client, reasons }) => (
              <div
                key={client.id || client.name}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-white">{client.name || "Client"}</h4>
                    <p className="mt-1 text-sm text-white/55">{client.email || "No email on file"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-[#00BF63]/25 bg-[#00BF63]/10 px-3 py-1 text-xs font-bold text-[#00BF63]"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCoachClientId(client.id)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                    >
                      View Client
                    </button>
                    <button
                      type="button"
                      onClick={() => openMessagesForClient(client.id)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => openPlansForClient(client.id)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                    >
                      Review Plan
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {clientsNeedingAttention.length === 0 && (
              <EmptyState text="No clients need attention right now." />
            )}
          </div>
        </section>

      <CoachDashboardCommandSummaryCards />

      <CoachWeeklyActionPlanGenerator />

      <CoachActionPlanCompletionReviewPanel />

      <CoachWeeklyAdjustmentRecommendationPanel />

      <CoachNutritionReviewPanel />

        <section
          data-testid="coach-client-profile-hub"
          className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
        >
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
              Client management
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-white">
              Client Profile Hub
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Review a client’s plan, logs, messages, and progress snapshot from one coach view.
            </p>
          </div>

          {selectedClient ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
                <h4 className="text-xl font-black text-white">{selectedClient.name || "Client"}</h4>
                <p className="mt-1 text-sm text-white/65">{selectedClient.email || "No email on file"}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#00BF63]">
                  {selectedClient.coachName || "No Limit Coach"} · {getClientStatusLabel(getClientCoachingStatus(selectedClient))}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Assigned Plan Summary</p>
                  <p className="mt-2 text-2xl font-black text-white">{selectedClientPlans.length}</p>
                  <p className="mt-1 text-sm text-white/55">
                    {selectedClientPlans[0]?.title || selectedClientPlans[0]?.planName || "No assigned plan yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Progress Snapshot</p>
                  <p className="mt-2 text-2xl font-black text-white">{selectedClientLogs.length}</p>
                  <p className="mt-1 text-sm text-white/55">Workout logs saved</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Unread Messages</p>
                  <p className="mt-2 text-2xl font-black text-white">{selectedClientUnreadCount}</p>
                  <p className="mt-1 text-sm text-white/55">Client messages waiting</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs font-black uppercase text-[#00BF63]">Plan Reviews</p>
                  <p className="mt-2 text-2xl font-black text-white">{selectedClientPendingDraftCount}</p>
                  <p className="mt-1 text-sm text-white/55">Drafts awaiting coach review</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs font-black uppercase text-[#00BF63]">Recent Messages</p>
                <div className="mt-3 space-y-2">
                  {selectedClientMessages.map((message) => (
                    <p key={message.id || message.timestamp || message.body} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65">
                      <span className="font-bold text-white">{message.sender || "Message"}:</span> {message.body}
                    </p>
                  ))}
                  {selectedClientMessages.length === 0 && (
                    <p className="text-sm text-white/45">No recent messages yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs font-black uppercase text-[#00BF63]">Coach Notes</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Coach-only notes can be connected to saved client records in the next database-backed phase.
                </p>
              </div>

              <form
                data-testid="coach-session-logger"
                onSubmit={handleCoachSessionSubmit}
                className="rounded-2xl border border-[#00BF63]/25 bg-black/50 p-4"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">
                      Coach Session Logger
                    </p>
                    <h4 className="mt-2 text-xl font-black uppercase text-white">
                      Log Session For Client
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Record a coach-led workout, save it to this client’s history, and update their progress snapshot.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white/55">
                    Coach logged
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase text-white/50">Exercise</span>
                    <input
                      aria-label="Coach session exercise"
                      value={coachSessionExercise}
                      onChange={(event) => setCoachSessionExercise(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                      placeholder="Back Squat"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Sets</span>
                    <input
                      aria-label="Coach session sets"
                      value={coachSessionSets}
                      onChange={(event) => setCoachSessionSets(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                      placeholder="3"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase text-white/50">Reps</span>
                    <input
                      aria-label="Coach session reps"
                      value={coachSessionReps}
                      onChange={(event) => setCoachSessionReps(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                      placeholder="10"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase text-white/50">Weight</span>
                    <input
                      aria-label="Coach session weight"
                      value={coachSessionWeight}
                      onChange={(event) => setCoachSessionWeight(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                      placeholder="135 lb"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase text-white/50">Session Notes</span>
                    <textarea
                      aria-label="Coach session notes"
                      value={coachSessionNotes}
                      onChange={(event) => setCoachSessionNotes(event.target.value)}
                      className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[#00BF63]"
                      placeholder="Technique notes, pain flags, substitutions, or next-step adjustments."
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    data-testid="coach-session-status"
                    aria-live="polite"
                    className="text-sm font-bold text-white/65"
                  >
                    {coachSessionStatus || "Ready to save this session to the client profile."}
                  </p>
                  <button
                    type="submit"
                    className="rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase text-black transition hover:bg-white"
                  >
                    Save Coach Session
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openMessagesForClient(selectedClient.id)}
                  className="rounded-full bg-[#00BF63] px-4 py-2 text-xs font-black uppercase text-black"
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={() => openPlansForClient(selectedClient.id)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                >
                  Review Plans
                </button>
                <button
                  type="button"
                  onClick={() => openTrackerForClient(selectedClient.id)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                >
                  View Progress
                </button>
              </div>
            </div>
          ) : (
            <EmptyState text="Add or assign a client to open the client profile hub." />
          )}
        </section>
      </div>

      <section
        data-testid="coach-recent-activity"
        className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">
              Coach timeline
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase text-white">Recent Activity</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Recent plan reviews, workout logs, and client messages across your assigned roster.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-black uppercase text-white/60">
            {recentActivityItems.length} updates
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {recentActivityItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase text-[#00BF63]">{item.label}</p>
              <h4 className="mt-2 font-black text-white">{item.title}</h4>
              <p className="mt-1 line-clamp-2 text-sm text-white/55">{item.detail}</p>
            </div>
          ))}
          {recentActivityItems.length === 0 && (
            <EmptyState text="Recent activity will show after clients send messages, submit plans, or log workouts." />
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Bell className="text-[#00BF63]" />
              <h3 className="text-xl font-black uppercase">Notification Types</h3>
            </div>
            <div className="space-y-3">
              {[
                "Client completed workout",
                "Client skipped workout",
                "Client changed assigned exercise",
                "Client changed sets, reps, weight, time, or rest",
                "Client left workout note",
                "Coach assigned new plan",
                "Coach sent message",
                "Client sent message",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white/75"
                >
                  <CheckCircle size={18} className="text-[#00BF63]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="text-[#00BF63]" />
              <h3 className="text-xl font-black uppercase">Activity Inbox</h3>
            </div>
            <button
              type="button"
              onClick={markAllActivityRead}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
            >
              Mark All Read
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActivityFilter(filter)}
                className={
                  activityFilter === filter
                    ? "rounded-full bg-[#00BF63] px-3 py-2 text-xs font-black uppercase text-black"
                    : "rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white/70 transition hover:border-[#00BF63] hover:text-[#00BF63]"
                }
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00BF63]">
                      {notification.type || "Activity"}
                    </p>
                    <h4 className="mt-1 font-black text-white">{notification.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-white/55">{notification.message}</p>
                  </div>
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() => markActivityRead(notification.id)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && <EmptyState text="No activity matches this filter." />}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-5 flex items-center gap-3">
          <ClipboardList className="text-[#00BF63]" />
          <h3 className="text-xl font-black uppercase">Workout Log Detail View</h3>
        </div>
        {safeLogs.length === 0 && <EmptyState text="No completed or skipped workouts yet. Use the Tracker tab to create a client workout log." />}
        {safeLogs.length > 0 && (
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <WorkoutLogList logs={safeLogs} selectedLogId={selectedWorkoutLog?.id} onSelect={setSelectedWorkoutLogId} />
            <WorkoutLogDetails log={selectedWorkoutLog} onDelete={deleteWorkoutLog} />
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsScreen({
  clients,
  clientForm,
  setClientForm,
  addClient,
  selectedClientProfileId,
  setSelectedClientProfileId,
  savedPlans,
  workoutLogs,
  conversations,
  openTrackerForClient,
  openMessagesForClient,
  openPlansForClient,
  updateClientStatus,
  safeDeleteClient,
  clientActionNotice,
  onAssignClient,
  onArchiveClient,
  onReactivateClient,
  onViewArchivedClient,
  onUnassignClient,
  fullDeleteArchivedClient,
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [showActiveClientList, setShowActiveClientList] = useState(true);
  const [showArchivedClients, setShowArchivedClients] = useState(false);
  const [selectedArchivedClientId, setSelectedArchivedClientId] = useState("");

  const getCoachStatus = (client) => {
    const statusText = String(client.coachingStatus || client.status || "").toLowerCase();

    if (statusText.includes("archived") || client.archivedAt) return "archived";
    if (statusText.includes("unassigned")) return "unassigned";
    if (statusText.includes("active")) return "active";

    return client.coachId ? "active" : "unassigned";
  };

  const formatDate = (value) => {
    if (!value) return "Not set";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const searchableText = (client) =>
    [client.name, client.email, client.status, client.coachingStatus, client.coachName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const normalizedSearch = clientSearch.trim().toLowerCase();

  const matchesSearch = (client) => {
    if (!normalizedSearch) return true;
    return searchableText(client).includes(normalizedSearch);
  };

  const activeClients = clients.filter((client) => getCoachStatus(client) === "active");
  const unassignedClients = clients.filter((client) => getCoachStatus(client) === "unassigned");
  const archivedClients = clients.filter((client) => getCoachStatus(client) === "archived");

  const searchedActiveClients = activeClients.filter(matchesSearch);
  const searchedUnassignedClients = unassignedClients.filter(matchesSearch);

  const selectedClient =
    normalizedSearch
      ? searchedActiveClients.find((client) => client.id === selectedClientProfileId) ||
        searchedActiveClients[0] ||
        null
      : activeClients.find((client) => client.id === selectedClientProfileId) ||
        activeClients[0] ||
        null;

  const selectedArchivedClient =
    archivedClients.find((client) => client.id === selectedArchivedClientId) || null;

  const renderStatusPill = (status) => {
    const classes =
      status === "active"
        ? "border-[#00BF63]/40 bg-[#00BF63]/10 text-[#00BF63]"
        : status === "archived"
          ? "border-zinc-400/40 bg-zinc-400/10 text-zinc-200"
          : "border-yellow-400/40 bg-yellow-400/10 text-yellow-200";

    return (
      <span className={"rounded-full border px-3 py-1 text-xs font-black uppercase " + classes}>
        {status}
      </span>
    );
  };

  const renderClientCard = (client) => {
    const status = getCoachStatus(client);
    const isSelected = selectedClient?.id === client.id;

    return (
      <div
        key={client.id}
        className={
          "rounded-2xl border p-4 transition " +
          (isSelected ? "border-[#00BF63] bg-[#00BF63]/10" : "border-white/10 bg-black/40")
        }
      >
        <button
          type="button"
          onClick={() => setSelectedClientProfileId(client.id)}
          className="w-full text-left"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-white">{client.name}</p>
              <p className="text-sm text-white/55">{client.email}</p>
            </div>
            {renderStatusPill(status)}
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Assigned: {formatDate(client.assignedAt)}
          </p>
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          {status === "active" && (
            <>
              <button
                type="button"
                onClick={() => onArchiveClient?.(client.id)}
                className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase text-yellow-200 transition hover:bg-yellow-400 hover:text-black"
              >
                Archive Client
              </button>
              <button
                type="button"
                onClick={() => onUnassignClient?.(client.id)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                Unassign
              </button>
            </>
          )}

          {status === "unassigned" && (
            <button
              type="button"
              onClick={() => onAssignClient?.(client.id)}
              className="rounded-full bg-[#00BF63] px-4 py-2 text-xs font-black uppercase text-black transition hover:bg-white"
            >Assign to Me</button>
          )}
        </div>
      </div>
    );
  };

  const renderArchivedClientCard = (client) => {
    const isSelected = selectedArchivedClientId === client.id;

    return (
      <div
        key={client.id}
        className={
          "rounded-2xl border p-4 transition " +
          (isSelected ? "border-zinc-200 bg-zinc-500/15" : "border-zinc-500/30 bg-zinc-500/10")
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black text-white">{client.name}</p>
            <p className="text-sm text-white/55">{client.email}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Archived: {formatDate(client.archivedAt)}
            </p>
          </div>
          {renderStatusPill("archived")}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedArchivedClientId(client.id);
              onViewArchivedClient?.(client.id);
            }}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
          >
            View Past Data
          </button>
          <button
            type="button"
            onClick={() => onReactivateClient?.(client.id)}
            className="rounded-full bg-[#00BF63] px-4 py-2 text-xs font-black uppercase text-black transition hover:bg-white"
          >Reactivate Client</button>
          <button
            type="button"
            onClick={() => fullDeleteArchivedClient?.(client.id)}
            className="rounded-full border border-red-500/40 bg-red-500/15 px-4 py-2 text-xs font-black uppercase text-red-200 transition hover:bg-red-500 hover:text-white"
          >
            Full Delete Archived Client
          </button>
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Coach client assignment manager" className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00BF63]">Coach Assignment</p>
        <h2 className="mt-2 text-3xl font-black uppercase text-white">
          Client Management
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-white/60">
          Add clients, manage active coaching, search the client list, and keep archived clients separated from the active workflow.
        </p>
      </div>

      {clientActionNotice && (
        <p className="rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 text-sm font-bold text-[#00BF63]">
          {clientActionNotice}
        </p>
      )}

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-xl font-black uppercase">Add Client</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/55">
              Client Name
            </span>
            <input
              value={clientForm.name}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Enter client name"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/55">
              Client Email
            </span>
            <input
              value={clientForm.email}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="Enter client email"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
            />
          </label>

          <button
            type="button"
            onClick={addClient}
            className="mt-auto rounded-2xl bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
          >
            Add Client
          </button>
        </div>
      </section>

      <section
        data-testid="active-client-window"
        className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
              Client Directory
            </p>
            <h3 className="text-2xl font-black uppercase">Active Client Window</h3>
            <p className="mt-1 text-sm text-white/55">
              Search active and unassigned clients. Archived clients stay hidden below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowActiveClientList((current) => !current)}
            className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-4 py-2 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
          >
            {showActiveClientList ? "Hide Client List" : "Show Client List"}
          </button>
        </div>

        <div className={showActiveClientList ? "space-y-4" : "hidden"}>
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/55">
              Search Clients
            </span>
            <input
              aria-label="Search Clients"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Search active or unassigned clients..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#00BF63]"
            />
          </label>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <p className="text-sm font-black uppercase text-white/70">
                Active Clients ({searchedActiveClients.length})
              </p>
              {searchedActiveClients.map(renderClientCard)}
              {searchedActiveClients.length === 0 && (
                <EmptyState text="No active clients match that search." />
              )}

              <div className="pt-3">
                <p className="mb-3 text-sm font-black uppercase text-white/70">
                  Unassigned Clients ({searchedUnassignedClients.length})
                </p>
                {searchedUnassignedClients.length > 0 ? (
                  <div className="space-y-3">
                    {searchedUnassignedClients.map(renderClientCard)}
                  </div>
                ) : (
                  <EmptyState text="No unassigned clients match that search." />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              {selectedClient ? (
                <ClientProfileDetails
                  client={selectedClient}
                  savedPlans={savedPlans}
                  workoutLogs={workoutLogs}
                  conversations={conversations}
                  openTrackerForClient={openTrackerForClient}
                  openMessagesForClient={openMessagesForClient}
                  openPlansForClient={openPlansForClient}
                  updateClientStatus={updateClientStatus}
                />
              ) : (
                <EmptyState text="No active client selected." />
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        data-testid="archived-client-window"
        className="rounded-[1.5rem] border border-zinc-500/20 bg-zinc-500/5 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">
              Archived Clients
            </p>
            <h3 className="text-2xl font-black uppercase">Archived Client Window</h3>
            <p className="mt-1 text-sm text-white/55">
              Archived clients stay out of active workflow. Full Delete is only available here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowArchivedClients((current) => !current)}
            className="rounded-full border border-zinc-400/40 bg-zinc-400/10 px-4 py-2 text-xs font-black uppercase text-zinc-200 transition hover:bg-zinc-200 hover:text-black"
          >
            {showArchivedClients
              ? "Hide Archived Clients"
              : "Show Archived Clients (" + archivedClients.length + ")"}
          </button>
        </div>

        {showArchivedClients && (
          <div className="mt-5 space-y-4">
            <div className="space-y-3">
              {archivedClients.map(renderArchivedClientCard)}
              {archivedClients.length === 0 && (
                <EmptyState text="No archived clients yet." />
              )}
            </div>

            {selectedArchivedClient && (
              <div className="rounded-2xl border border-zinc-500/30 bg-black/35 p-4">
                <ClientProfileDetails
                  client={selectedArchivedClient}
                  savedPlans={savedPlans}
                  workoutLogs={workoutLogs}
                  conversations={conversations}
                  openTrackerForClient={openTrackerForClient}
                  openMessagesForClient={openMessagesForClient}
                  openPlansForClient={openPlansForClient}
                  updateClientStatus={updateClientStatus}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </section>
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
              <p className="mt-1 text-sm text-white/55">Days: {plan.days.length} â€¢ Exercises: {plan.days.reduce((total, day) => total + day.exercises.length, 0)}</p>
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
                  <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Exercise {index + 1}</p><h4 className="mt-1 text-xl font-black">{exercise.exerciseName}</h4><div className="mt-2 flex flex-wrap gap-2">{exercise.categories.map((category) => <CategoryPill key={category}>{category}</CategoryPill>)}</div><p className="mt-2 text-sm text-white/50">{exercise.muscles} â€¢ {exercise.equipment}</p></div>
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
              <p className="mt-1 text-sm text-white/60">Days: {plan.days.length} â€¢ Exercises: {plan.days.reduce((total, day) => total + day.exercises.length, 0)}</p>
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
            <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">Exercise {index + 1}</p><h4 className="mt-1 text-xl font-black">{exercise.exerciseName}</h4><p className="mt-1 text-sm text-white/50">{exercise.muscles} â€¢ {exercise.equipment}</p></div>
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



function nlfReadPublicAccountProfile() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("nlf-public-account-profile-v1");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function nlfMessageMatchText(value) {
  return String(value || "").trim().toLowerCase();
}

function nlfFindCurrentClientForMessaging(clients) {
  const safeClients = Array.isArray(clients) ? clients : [];
  const profile = nlfReadPublicAccountProfile();

  if (!safeClients.length) return null;

  const profileId = nlfMessageMatchText(profile?.clientId || profile?.id);
  const profileEmail = nlfMessageMatchText(profile?.email);
  const profileName = nlfMessageMatchText(profile?.name);

  const matchedClient = safeClients.find((client) => {
    return (
      (profileId && nlfMessageMatchText(client.id) === profileId) ||
      (profileEmail && nlfMessageMatchText(client.email) === profileEmail) ||
      (profileName && nlfMessageMatchText(client.name) === profileName)
    );
  });

  return matchedClient || safeClients[0] || null;
}

function nlfIsAssignedCoachClient(client) {
  if (!client) return false;

  const assignmentStatus = nlfMessageMatchText(client.coachingStatus || client.assignmentStatus);

  return Boolean(
    client.coachId ||
      client.coachName ||
      assignmentStatus.includes("assigned") ||
      assignmentStatus.includes("active")
  );
}

function nlfGetMessagingScope({ clients, conversations, messageSender }) {
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const signedInRole = nlfResolveMessageSenderRole(messageSender);

  if (signedInRole === "Client") {
    const currentClient = nlfFindCurrentClientForMessaging(safeClients);

    if (!currentClient || !nlfIsAssignedCoachClient(currentClient)) {
      return [];
    }

    return safeConversations.filter(
      (conversation) => conversation.clientId === currentClient.id
    );
  }

  const assignedClientIds = new Set(
    safeClients.filter(nlfIsAssignedCoachClient).map((client) => client.id)
  );

  if (assignedClientIds.size === 0) return [];

  return safeConversations.filter((conversation) =>
    assignedClientIds.has(conversation.clientId)
  );
}

function nlfCountScopedUnreadMessages(conversations, unreadKey) {
  return (Array.isArray(conversations) ? conversations : []).reduce((total, conversation) => {
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    return total + messages.filter((message) => message?.[unreadKey]).length;
  }, 0);
}

function nlfResolveMessageSenderRole(portalModeValue) {
  const queryMode =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("portalMode")
      : "";

  const mode = String(queryMode || portalModeValue || "").toLowerCase();

  if (mode.includes("coach") || mode.includes("admin")) return "Coach";
  if (mode.includes("client")) return "Client";

  return "Coach";
}

function nlfGetMessagingArchiveKey(messageSender) {
  const role = nlfResolveMessageSenderRole(messageSender);
  const profile = nlfReadPublicAccountProfile();
  const profileKey =
    nlfMessageMatchText(profile?.id || profile?.clientId || profile?.email || profile?.name) ||
    "local-user";

  return `${role.toLowerCase()}:${profileKey}`;
}

function nlfNormalizeArchivedFor(conversation) {
  return Array.isArray(conversation?.archivedFor)
    ? conversation.archivedFor.filter(Boolean)
    : [];
}

function nlfIsConversationArchivedFor(conversation, archiveKey) {
  return nlfNormalizeArchivedFor(conversation).includes(archiveKey);
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
  archiveConversation,
  restoreConversation,
  messageNotice,
  unreadCoachCount,
  unreadClientCount,
}) {
  const [messageSearch, setMessageSearch] = useState("");
  const [conversationView, setConversationView] = useState("active");

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

  const signedInMessageRole = nlfResolveMessageSenderRole(messageSender);
  const scopedConversations = nlfGetMessagingScope({
    clients,
    conversations,
    messageSender,
  });
  const currentMessagingClient =
    signedInMessageRole === "Client" ? nlfFindCurrentClientForMessaging(clients) : null;
  const assignedClientCount = (Array.isArray(clients) ? clients : []).filter(nlfIsAssignedCoachClient).length;
  const hasMessagingAssignment =
    signedInMessageRole === "Client"
      ? Boolean(currentMessagingClient && nlfIsAssignedCoachClient(currentMessagingClient))
      : assignedClientCount > 0;
  const noAssignmentText =
    signedInMessageRole === "Client" ? "No coach assigned yet." : "No assigned clients yet.";
  const assignmentEmptyText = hasMessagingAssignment ? "No active conversations." : noAssignmentText;
  const archiveKey = nlfGetMessagingArchiveKey(signedInMessageRole);
  const activeScopedConversations = scopedConversations.filter(
    (conversation) => !nlfIsConversationArchivedFor(conversation, archiveKey)
  );
  const archivedScopedConversations = scopedConversations.filter((conversation) =>
    nlfIsConversationArchivedFor(conversation, archiveKey)
  );
  const conversationsForCurrentView =
    conversationView === "archived" ? archivedScopedConversations : activeScopedConversations;
  const scopedCoachUnreadCount = nlfCountScopedUnreadMessages(activeScopedConversations, "unreadForCoach");
  const scopedClientUnreadCount = nlfCountScopedUnreadMessages(activeScopedConversations, "unreadForClient");

  const filteredConversations = conversationsForCurrentView.filter(conversationMatchesSearch);

  const selectedConversation =
    conversationsForCurrentView.find((conversation) => conversation.clientId === selectedConversationId) ||
    filteredConversations[0] ||
    conversationsForCurrentView[0];

  const selectedClient = clients.find((client) => client.id === selectedConversation?.clientId);

  const activeEmptyText =
    scopedConversations.length === 0
      ? assignmentEmptyText
      : activeScopedConversations.length === 0
        ? "No active conversations."
        : "No conversations match that search.";
  const archivedEmptyText =
    scopedConversations.length === 0
      ? assignmentEmptyText
      : archivedScopedConversations.length === 0
        ? "No archived conversations."
        : "No conversations match that search.";
  const emptyConversationText =
    conversationView === "archived" ? archivedEmptyText : activeEmptyText;

  const selectedEmptyText =
    scopedConversations.length === 0
      ? assignmentEmptyText
      : conversationsForCurrentView.length === 0
        ? conversationView === "archived"
          ? "No archived conversations."
          : "No active conversations."
        : "Select a conversation to start messaging.";

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
        title={signedInMessageRole === "Client" ? "Assigned Coach Messaging" : "Assigned Client Messaging"}
        description={
          signedInMessageRole === "Client"
            ? "Message your assigned coach and keep your thread saved locally."
            : "Message assigned clients and track unread replies saved locally."
        }
      />

      {messageNotice && (
        <p
          data-testid="message-notice"
          className="mb-4 rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 text-sm font-semibold text-[#00BF63]"
        >
          {messageNotice}
        </p>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Conversations" value={conversationsForCurrentView.length} />
        <StatCard label="Coach Unread" value={scopedCoachUnreadCount} />
        <StatCard label="Client Unread" value={scopedClientUnreadCount} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3">
        <button
          type="button"
          aria-pressed={conversationView === "active"}
          onClick={() => setConversationView("active")}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
            conversationView === "active"
              ? "bg-[#00BF63] text-black"
              : "border border-white/15 bg-white/5 text-white/70 hover:border-[#00BF63] hover:text-[#00BF63]"
          }`}
        >
          Active Conversations
        </button>
        <button
          type="button"
          aria-pressed={conversationView === "archived"}
          onClick={() => setConversationView("archived")}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
            conversationView === "archived"
              ? "bg-[#00BF63] text-black"
              : "border border-white/15 bg-white/5 text-white/70 hover:border-[#00BF63] hover:text-[#00BF63]"
          }`}
        >
          Archived Conversations
        </button>
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
                {emptyConversationText}
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
                  {conversationView === "archived" ? (
                    <button
                      type="button"
                      onClick={() => restoreConversation(selectedConversation.clientId)}
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                    >
                      Restore Conversation
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => archiveConversation(selectedConversation.clientId)}
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                    >
                      Archive Conversation
                    </button>
                  )}
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
                  <div className="rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">
                      Signed-in role
                    </p>
                    <p className="mt-2 text-lg font-black text-white">{signedInMessageRole}</p>
                    <p className="mt-1 text-xs font-bold text-white/55">
                      {signedInMessageRole === "Client"
                        ? "Messages send from your client account to your assigned coach."
                        : "Messages send from your coach account to assigned clients."}
                    </p>
                  </div>
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
            <EmptyState text={selectedEmptyText} />
          )}
        </div>
      </div>
    </div>
  );
}

// NLF_CLIENT_SAFE_EXERCISE_LIBRARY_START
function uniqueClientExerciseItems(items) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function getClientSafeExerciseInstructions(exercise) {
  const rawInstruction =
    exercise?.instructions ||
    exercise?.instruction ||
    exercise?.notes ||
    exercise?.coachNotes ||
    exercise?.description ||
    "";

  if (rawInstruction) return String(rawInstruction);

  const name = String(exercise?.name || "exercise").toLowerCase();
  const categories = Array.isArray(exercise?.categories) ? exercise.categories : [];

  if (categories.includes("Mobility")) {
    return "Move with control, own the range of motion, and keep the reps smooth. Do not rush the position.";
  }

  if (categories.includes("Conditioning") || categories.includes("CrossFit")) {
    return "Keep the pace controlled enough to maintain form. Scale the speed, load, or range before form breaks down.";
  }

  if (name.includes("squat") || name.includes("lunge") || name.includes("step-up")) {
    return "Brace first, keep the movement controlled, and drive through the full foot. Use the assigned depth and tempo from your plan.";
  }

  if (name.includes("deadlift") || name.includes("rdl") || name.includes("hinge")) {
    return "Set your brace, keep the weight close, and move with control. Use the assigned load guidance from your coach.";
  }

  if (name.includes("press") || name.includes("bench") || name.includes("push-up") || name.includes("dip")) {
    return "Control the lowering phase, press with intent, and keep the reps clean. Stop the set before form falls apart.";
  }

  if (name.includes("row") || name.includes("pull") || name.includes("chin-up") || name.includes("pulldown")) {
    return "Start each rep under control, pull through the target muscles, and avoid rushing the return.";
  }

  return "Use controlled reps, stay within a safe range, and follow the sets, reps, rest, and coach notes in your assigned plan.";
}

function getClientSafeExerciseSubstitutions(exercise) {
  const provided =
    exercise?.substitutions ||
    exercise?.alternatives ||
    exercise?.substitutionOptions ||
    exercise?.swaps ||
    [];

  const providedItems = Array.isArray(provided)
    ? provided
    : String(provided || "")
        .split(/[,\n]/)
        .map((item) => item.trim());

  const name = String(exercise?.name || "").toLowerCase();
  const equipment = String(exercise?.equipment || "").toLowerCase();
  const categories = Array.isArray(exercise?.categories) ? exercise.categories : [];
  const generated = [];

  if (name.includes("squat")) {
    generated.push("Goblet Squat", "Box Squat", "Leg Press");
  }

  if (name.includes("lunge") || name.includes("split squat")) {
    generated.push("Reverse Lunge", "Step-Up", "Assisted Split Squat");
  }

  if (name.includes("deadlift") || name.includes("rdl")) {
    generated.push("Trap Bar Deadlift", "Romanian Deadlift", "Hip Hinge Pattern");
  }

  if (name.includes("bench") || name.includes("press") || name.includes("push-up")) {
    generated.push("Dumbbell Press", "Push-Up", "Machine Press");
  }

  if (name.includes("row") || name.includes("pull-up") || name.includes("chin-up") || name.includes("pulldown")) {
    generated.push("Band Row", "Cable Row", "Assisted Pull-Up");
  }

  if (name.includes("curl")) {
    generated.push("Dumbbell Curl", "Cable Curl", "Band Curl");
  }

  if (name.includes("carry")) {
    generated.push("Farmer Carry", "Suitcase Carry", "Sandbag Carry");
  }

  if (categories.includes("Mobility")) {
    generated.push("Reduced Range Variation", "Assisted Mobility Drill", "Tempo Mobility Drill");
  }

  if (categories.includes("Conditioning") || categories.includes("CrossFit")) {
    generated.push("Low-Impact Bike", "Row Erg", "Marching Intervals");
  }

  if (equipment.includes("barbell")) {
    generated.push("Dumbbell Variation", "Machine Variation", "Bodyweight Pattern");
  }

  if (equipment.includes("cable")) {
    generated.push("Band Variation", "Dumbbell Variation", "Machine Variation");
  }

  if (equipment.includes("bodyweight")) {
    generated.push("Assisted Variation", "Tempo Bodyweight Variation", "Reduced Range of Motion");
  }

  if (generated.length === 0) {
    generated.push("Lighter Load Variation", "Machine Variation", "Bodyweight Variation");
  }

  return uniqueClientExerciseItems([...providedItems, ...generated]).slice(0, 4);
}

function getClientSafeExerciseSearchText(exercise) {
  return [
    exercise?.name,
    exercise?.muscles,
    exercise?.equipment,
    Array.isArray(exercise?.categories) ? exercise.categories.join(" ") : "",
    getClientSafeExerciseInstructions(exercise),
    getClientSafeExerciseSubstitutions(exercise).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
// NLF_CLIENT_SAFE_EXERCISE_LIBRARY_END

function ExercisesScreen({ librarySearch, setLibrarySearch, libraryCategory, setLibraryCategory, filteredLibraryExercises, totalExerciseCount }) {
  const categoryCount =
    libraryCategory === "All" ? totalExerciseCount : filteredLibraryExercises.length;

  return (
    <div>
      <SectionHeader
        eyebrow="Exercises"
        title="Client-Safe Exercise Library"
        description="Search exercise names, muscle groups, equipment, instructions, and substitution options without exposing coach-only edit controls."
      />

      <div
        data-testid="client-safe-exercise-library"
        className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
      >
        <div className="mb-5">
          <h2 className="text-2xl font-black text-white">
            General Exercise Database
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-white/60">
            Browse movement guidance, equipment needs, muscle groups, and safe substitutions without programming fields.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <SearchInput
            value={librarySearch}
            onChange={setLibrarySearch}
            placeholder="Search exercises, muscle groups, equipment, or substitutions..."
          />

          <div className="flex flex-wrap gap-2">
            {exerciseCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setLibraryCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                  libraryCategory === category
                    ? "border-[#00BF63] bg-[#00BF63] text-black"
                    : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniProgram label="Showing" value={filteredLibraryExercises.length} />
          <MiniProgram label="Total Library" value={totalExerciseCount} />
          <MiniProgram label="Category Count" value={categoryCount} />
        </div>

        <p
          data-testid="exercise-library-count"
          className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-3 text-sm font-bold text-[#00BF63]"
        >
          Showing {filteredLibraryExercises.length} exercise(s). Coach edit controls are not available in this client-safe view.
        </p>
      </div>

      <div data-testid="client-safe-exercise-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLibraryExercises.map((exercise) => (
          <ExerciseCard key={exercise.name} exercise={exercise} />
        ))}
      </div>

      {filteredLibraryExercises.length === 0 && (
        <EmptyState text="No exercises match your search. Try a muscle group, equipment type, or substitution term." />
      )}
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


function ClientNutritionMacrosPanel() {
  const macroCards = [
    {
      label: "Calories",
      value: "2,200 - 2,500",
      note: "Start here, then adjust based on weight trend, energy, and training performance.",
    },
    {
      label: "Protein",
      value: "160g - 200g",
      note: "Keeps recovery, muscle retention, and strength progress supported.",
    },
    {
      label: "Carbs",
      value: "220g - 300g",
      note: "Fuel for hard sessions, steps, and daily energy.",
    },
    {
      label: "Fats",
      value: "60g - 80g",
      note: "Supports hormones, joints, and steady appetite control.",
    },
  ];

  const goalOptions = [
    {
      title: "Fat Loss",
      text: "Slight calorie deficit, high protein, steady carbs around training.",
    },
    {
      title: "Lean Muscle",
      text: "Small calorie surplus, consistent meals, progressive training.",
    },
    {
      title: "Maintenance",
      text: "Stable calories, balanced macros, keep performance moving.",
    },
  ];

  const mealBreakdown = [
    "Breakfast: protein + carbs",
    "Lunch: protein + carbs + vegetables",
    "Pre/Post Workout: easy carbs + lean protein",
    "Dinner: protein + vegetables + fats",
  ];

  return (
    <section
      aria-label="Client nutrition and macros guide"
      data-testid="client-nutrition-macros"
      className="mt-4 rounded-3xl border border-[#00BF63]/25 bg-black/45 p-4 shadow-xl shadow-black/30"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00BF63]">
            Nutrition / Macros
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            Simple macro starting point
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
            Use this as a client-friendly starting guide. Adjust calories and macros based on goal,
            consistency, weekly check-ins, and how training performance feels.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70">
          Coach-reviewed before final use
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {macroCards.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-white/60">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {goalOptions.map((goal) => (
          <div key={goal.title} className="rounded-2xl border border-[#00BF63]/15 bg-[#00BF63]/5 p-4">
            <p className="font-black text-white">{goal.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{goal.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
        <p className="font-black text-white">Simple meal macro breakdown</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {mealBreakdown.map((meal) => (
            <div key={meal} className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white/70">
              {meal}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function ExerciseCard({ exercise }) {
  const instructions = getClientSafeExerciseInstructions(exercise);
  const substitutions = getClientSafeExerciseSubstitutions(exercise);

  return (
    <div
      data-testid="exercise-card"
      className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#00BF63]/60 hover:bg-[#00BF63]/10"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {exercise.categories.map((category) => (
          <CategoryPill key={category}>{category}</CategoryPill>
        ))}
      </div>

      <h3 className="text-2xl font-black">{exercise.name}</h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniProgram label="Muscle Group" value={exercise.muscles} />
        <MiniProgram label="Equipment" value={exercise.equipment} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/70">
        <p>
          <span className="font-black text-white">Muscles worked:</span> {exercise.muscles}
        </p>
        <p>
          <span className="font-black text-white">Equipment:</span> {exercise.equipment}
        </p>
      </div><div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
          Instructions/Notes
        </p>
        <p className="mt-2 text-sm leading-6 text-white/70">{instructions}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-[#00BF63]/25 bg-[#00BF63]/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">
          Substitution Options
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {substitutions.map((substitution) => (
            <span
              key={substitution}
              className="rounded-full border border-[#00BF63]/30 bg-black/35 px-3 py-1 text-xs font-black uppercase text-white/75"
            >
              {substitution}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs font-bold leading-5 text-white/50">
          Use substitutions when equipment is unavailable or your coach approves the swap.
        </p>
      </div>
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
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">{label}</p><p className="mt-2 text-sm font-black text-white">{value || "â€”"}</p></div>;
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm font-bold text-white/45">{text}</div>;
}

// Bundle 12S nutrition macros guide stable

// Bundle 12U messages nav accessibility fix marker

// Bundle 12Y.1 client plan nutrition update complete


// NLF_BUNDLE_12Z_APP_EXPORT_START
export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [accountUnlocked, setAccountUnlocked] = useState(() => getNoLimitPublicAccountAccess());

  const internalTestUnlocked = getPortalTestUnlocked() || hasCoachSessionLock();

  if (!internalTestUnlocked && !accountUnlocked) {
    return (
      <NoLimitFitnessPublicLoginGate
        authMode={authMode}
        setAuthMode={setAuthMode}
        onUnlock={() => setAccountUnlocked(true)}
      />
    );
  }

  return <NoLimitFitnessAppShell />;
}
// NLF_BUNDLE_12Z_APP_EXPORT_END

// Bundle 12Z test unlock client-mode fix
