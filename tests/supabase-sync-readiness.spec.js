import { test, expect } from "@playwright/test";
import {
  createSupabaseSyncPayload,
  normalizeLocalState,
  summarizeSyncPayload,
  validateLocalStateForSync,
} from "../src/lib/noLimitSyncPayload.js";

const LOCAL_URL = "http://localhost:5173/";
const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

function buildBundle8State() {
  return {
    clients: [
      {
        id: "bundle-8-client",
        name: "Bundle Eight Client",
        email: "bundle8@nolimittest.com",
        status: "Active",
        notes: "Ready for backend sync.",
      },
    ],
    savedPlans: [
      {
        id: "bundle-8-plan",
        planName: "Bundle 8 Sync Plan",
        clientId: "bundle-8-client",
        clientName: "Bundle Eight Client",
        days: [
          {
            id: "bundle-8-day-1",
            name: "Day 1 - Strength",
            exercises: [
              {
                id: "bundle-8-ex-1",
                exerciseId: "back-squat",
                exerciseName: "Back Squat",
                sets: "4",
                repsOrTime: "6 - 8",
                weightGuidance: "RPE 7",
                rest: "2 min",
                notes: "Brace hard.",
              },
              {
                id: "bundle-8-ex-2",
                exerciseId: "barbell-row",
                exerciseName: "Barbell Row",
                sets: "3",
                repsOrTime: "8 - 10",
                weightGuidance: "Controlled",
                rest: "90 sec",
                notes: "Pause at ribs.",
              },
            ],
          },
        ],
      },
    ],
    workoutLogs: [
      {
        id: "bundle-8-log",
        clientId: "bundle-8-client",
        clientName: "Bundle Eight Client",
        planId: "bundle-8-plan",
        planName: "Bundle 8 Sync Plan",
        dayId: "bundle-8-day-1",
        dayName: "Day 1 - Strength",
        status: "completed",
        skipReason: "",
        entries: [
          {
            id: "bundle-8-entry",
            exerciseId: "bundle-8-ex-1",
            exerciseName: "Back Squat",
            assignedSets: "4",
            assignedRepsOrTime: "6 - 8",
            assignedWeightGuidance: "RPE 7",
            assignedRest: "2 min",
            actualWeight: "225 lb",
            setsCompleted: "4",
            repsCompleted: "8, 8, 7, 6",
            timeCompleted: "",
            restUsed: "2 min",
            substitution: "Safety Bar Squat",
            notes: "Ready for sync.",
          },
        ],
      },
    ],
    conversations: [
      {
        clientId: "bundle-8-client",
        clientName: "Bundle Eight Client",
        messages: [
          {
            id: "bundle-8-message",
            sender: "Coach",
            body: "Bundle 8 sync message.",
            unreadForCoach: false,
            unreadForClient: true,
          },
        ],
      },
    ],
    readActivityIds: [],
    notificationPreferences: {
      completedWorkout: true,
      skippedWorkout: true,
      changedValues: true,
      substitutions: true,
      workoutNotes: true,
      planAssigned: true,
      messages: true,
    },
    backendSettings: {
      coachEmail: "bundle8coach@nolimittest.com",
      emailProvider: "Supabase + Resend",
      backendStatus: "Bundle 8 backend-ready.",
    },
  };
}

async function openCleanLogin(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, {
    storageKey: STORAGE_KEY,
    portalModeKey: PORTAL_MODE_KEY,
    testUnlockKey: TEST_UNLOCK_KEY,
  });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
}

test.describe("No Limit Fitness Bundle 8 backend sync readiness", () => {
  test("normalizes partial local data without breaking required sections", async () => {
    const partialState = {
      clients: [
        {
          id: "partial-client",
          name: "Partial Client",
          email: "partial@nolimittest.com",
        },
      ],
      savedPlans: "not-an-array",
      workoutLogs: null,
      conversations: [
        {
          clientId: "partial-client",
          messages: "not-an-array",
        },
      ],
      notificationPreferences: {
        messages: false,
      },
      backendSettings: {
        coachEmail: "partialcoach@nolimittest.com",
      },
    };

    const normalized = normalizeLocalState(partialState);

    expect(normalized.clients).toHaveLength(1);
    expect(normalized.clients[0].status).toBe("Active");
    expect(normalized.savedPlans).toEqual([]);
    expect(normalized.workoutLogs).toEqual([]);
    expect(normalized.conversations[0].clientName).toBe("Partial Client");
    expect(normalized.conversations[0].messages).toEqual([]);
    expect(normalized.notificationPreferences.completedWorkout).toBe(true);
    expect(normalized.notificationPreferences.messages).toBe(false);
    expect(normalized.backendSettings.emailProvider).toBe("Supabase + Resend");
  });

  test("creates a Supabase-ready payload with expected table buckets", async () => {
    const payload = createSupabaseSyncPayload(buildBundle8State(), {
      generatedAt: "2026-05-17T00:00:00.000Z",
    });

    expect(payload.schemaVersion).toBe("no-limit-fitness-sync-v1");
    expect(payload.status).toBe("ready");
    expect(payload.validation.ok).toBe(true);

    expect(payload.summary.clients).toBe(1);
    expect(payload.summary.workout_plans).toBe(1);
    expect(payload.summary.workout_days).toBe(1);
    expect(payload.summary.plan_exercises).toBe(2);
    expect(payload.summary.workout_logs).toBe(1);
    expect(payload.summary.workout_entries).toBe(1);
    expect(payload.summary.messages).toBe(1);

    expect(payload.tables.clients[0].name).toBe("Bundle Eight Client");
    expect(payload.tables.workout_plans[0].client_id).toBe("bundle-8-client");
    expect(payload.tables.workout_days[0].plan_id).toBe("bundle-8-plan");
    expect(payload.tables.plan_exercises[0].workout_day_id).toBe("bundle-8-day-1");
    expect(payload.tables.workout_entries[0].exercise_substitution).toBe("Safety Bar Squat");
    expect(payload.tables.messages[0].unread_for_client).toBe(true);
  });

  test("blocks invalid sync data when a plan has no training days", async () => {
    const invalidState = buildBundle8State();

    invalidState.savedPlans[0] = {
      ...invalidState.savedPlans[0],
      days: [],
    };

    const validation = validateLocalStateForSync(invalidState);
    const payload = createSupabaseSyncPayload(invalidState, {
      generatedAt: "2026-05-17T00:00:00.000Z",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("has no training days");
    expect(payload.status).toBe("blocked");
  });

  test("summarizes payload counts without needing Supabase", async () => {
    const payload = createSupabaseSyncPayload(buildBundle8State(), {
      generatedAt: "2026-05-17T00:00:00.000Z",
    });

    const summary = summarizeSyncPayload(payload);

    expect(summary.clients).toBe(1);
    expect(summary.workout_plans).toBe(1);
    expect(summary.workout_entries).toBe(1);
    expect(summary.notification_preferences).toBe(1);
    expect(summary.backend_settings).toBe(1);
  });

  test("login auth and backend bridge panels load safely without forcing real auth", async ({
    page,
  }) => {
    await openCleanLogin(page);

    const main = page.locator("main");

    await expect(main).toContainText("Authentication Later");
    await expect(main).toContainText("Auth Guard Status");
    await expect(main).toContainText("Supabase Login Test Panel");
    await expect(main).toContainText("Supabase Data Bridge Preview");
    await expect(main).toContainText("Do not send email directly inside App.jsx");

    await expect(
      page.getByRole("button", { name: "Check Current Session" })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();

    await page.getByRole("button", { name: "Check Current Session" }).click();

    await expect(page.locator("#root")).toBeAttached();
    await expect(main).toContainText(/Auth Status/i);

    await page.getByRole("button", { name: "Sign Out" }).click();

    await expect(page.locator("#root")).toBeAttached();
    await expect(main).toContainText(/Auth Status/i);
  });
});
