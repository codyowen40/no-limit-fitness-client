import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

const notificationPreferences = {
  completedWorkout: true,
  skippedWorkout: true,
  changedValues: true,
  substitutions: true,
  workoutNotes: true,
  planAssigned: true,
  messages: true,
};

const backendSettings = {
  coachEmail: "",
  emailProvider: "Supabase + Resend",
  backendStatus: "Frontend placeholder only",
  notes: "Email alerts should be sent from a backend later. Do not send email directly inside App.jsx.",
};

const testClient = {
  id: "client-workout-log-test",
  name: "Workout Log Test Client",
  email: "workout-log-test@example.com",
  status: "Active",
};

const testPlan = {
  id: "plan-workout-log-test",
  planName: "Workout Log Test Plan",
  clientId: testClient.id,
  clientName: testClient.name,
  createdAt: "Test seed",
  timestamp: 1710000000000,
  days: [
    {
      id: "day-lower-test",
      name: "Day 1 - Lower Body",
      exercises: [
        {
          id: "exercise-back-squat-test",
          exerciseId: "Back Squat",
          exerciseName: "Back Squat",
          sets: "4",
          repsOrTime: "8",
          weightGuidance: "225 - 245 lb",
          rest: "2 min",
          notes: "Keep form tight.",
        },
      ],
    },
  ],
};

const testConversation = {
  clientId: testClient.id,
  clientName: testClient.name,
  messages: [],
};

function createEntry(overrides = {}) {
  return {
    exerciseId: "exercise-back-squat-test",
    exerciseName: "Back Squat",
    assignedSets: "4",
    assignedRepsOrTime: "8",
    assignedWeightGuidance: "225 - 245 lb",
    assignedRest: "2 min",
    actualWeight: "",
    setsCompleted: "",
    repsCompleted: "",
    timeCompleted: "",
    restUsed: "",
    substitution: "",
    notes: "",
    ...overrides,
  };
}

function createCompletedLog(overrides = {}) {
  return {
    id: "workout-log-completed-test",
    clientId: testClient.id,
    clientName: testClient.name,
    planId: testPlan.id,
    planName: testPlan.planName,
    dayId: "day-lower-test",
    dayName: "Day 1 - Lower Body",
    status: "completed",
    skipReason: "",
    submittedAt: "Test completed time",
    timestamp: 1710000001000,
    entries: [
      createEntry({
        actualWeight: "235 lb",
        setsCompleted: "4",
        repsCompleted: "8",
        timeCompleted: "N/A",
        restUsed: "90 sec",
        substitution: "Goblet Squat",
        notes: "Completed workout note stays after refresh.",
      }),
    ],
    ...overrides,
  };
}

function createSkippedLog(overrides = {}) {
  return {
    id: "workout-log-skipped-test",
    clientId: testClient.id,
    clientName: testClient.name,
    planId: testPlan.id,
    planName: testPlan.planName,
    dayId: "day-lower-test",
    dayName: "Day 1 - Lower Body",
    status: "skipped",
    skipReason: "Client had overtime at work and moved training to tomorrow.",
    submittedAt: "Test skipped time",
    timestamp: 1710000002000,
    entries: [
      createEntry({
        notes: "Skipped workout note stays after refresh.",
      }),
    ],
    ...overrides,
  };
}

function createState(workoutLogs = []) {
  return {
    clients: [testClient],
    savedPlans: [testPlan],
    workoutLogs,
    conversations: [testConversation],
    readActivityIds: [],
    notificationPreferences,
    backendSettings,
  };
}

async function openSeededApp(page, workoutLogs = []) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(
    ({ storageKey, portalModeKey, testUnlockKey, state }) => {
      window.localStorage.clear();
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "demo");
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      state: createState(workoutLogs),
    }
  );

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("navigation")).toBeVisible();
}

async function openProgress(page) {
  const nav = page.getByRole("navigation");

  await nav.getByRole("button", { name: /^Progress$/ }).click();

  await expect(
    page.getByRole("heading", { name: "Tracking Comes Next" })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Workout Log Details" })
  ).toBeVisible();
}

test.describe("No Limit Fitness workout log details", () => {
  test("saves a completed workout with client-entered values and keeps it after refresh", async ({
    page,
  }) => {
    await openSeededApp(page, [createCompletedLog()]);
    await openProgress(page);

    await expect(page.getByText(testClient.name).first()).toBeVisible();
    await expect(page.getByText(testPlan.planName).first()).toBeVisible();
    await expect(page.getByText("Back Squat").first()).toBeVisible();

    await expect(page.getByText(/Actual Weight Used:\s*235 lb/i).first()).toBeVisible();
    await expect(page.getByText(/Sets Completed:\s*4/i).first()).toBeVisible();
    await expect(page.getByText(/Reps Completed:\s*8/i).first()).toBeVisible();
    await expect(page.getByText(/Actual Rest Used:\s*90 sec/i).first()).toBeVisible();

    await expect(
      page.getByText(/^Exercise Substitution: Goblet Squat$/)
    ).toBeVisible();

    await expect(
      page.getByText(/^Client Notes: Completed workout note stays after refresh\.$/)
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openProgress(page);

    await expect(page.getByText(testClient.name).first()).toBeVisible();
    await expect(page.getByText(/Actual Weight Used:\s*235 lb/i).first()).toBeVisible();

    await expect(
      page.getByText(/^Client Notes: Completed workout note stays after refresh\.$/)
    ).toBeVisible();
  });

  test("saves a skipped workout reason and keeps it after refresh", async ({ page }) => {
    const skippedLog = createSkippedLog();

    await openSeededApp(page, [skippedLog]);
    await openProgress(page);

    await expect(page.getByText(testClient.name).first()).toBeVisible();
    await expect(page.getByText(testPlan.planName).first()).toBeVisible();
    await expect(page.getByText("skipped").first()).toBeVisible();

    await expect(page.getByText(skippedLog.skipReason).first()).toBeVisible();

    await expect(
      page.getByText(/^Client Notes: Skipped workout note stays after refresh\.$/)
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openProgress(page);

    await expect(page.getByText(skippedLog.skipReason).first()).toBeVisible();

    await expect(
      page.getByText(/^Client Notes: Skipped workout note stays after refresh\.$/)
    ).toBeVisible();
  });

  test("deletes a workout log locally and keeps it deleted after refresh", async ({
    page,
  }) => {
    const deleteMeLog = createCompletedLog({
      id: "workout-log-delete-me-test",
      dayName: "Day 1 - Delete Me",
      timestamp: 1710000003000,
      entries: [
        createEntry({
          actualWeight: "225 lb",
          setsCompleted: "3",
          repsCompleted: "8",
          restUsed: "2 min",
          notes: "Temporary log should be deleted.",
        }),
      ],
    });

    const keepMeLog = createCompletedLog({
      id: "workout-log-keep-me-test",
      dayName: "Day 2 - Keep Me",
      timestamp: 1710000004000,
      entries: [
        createEntry({
          actualWeight: "245 lb",
          setsCompleted: "4",
          repsCompleted: "6",
          restUsed: "2 min",
          notes: "Stored log should remain after reload.",
        }),
      ],
    });

    await openSeededApp(page, [deleteMeLog, keepMeLog]);
    await openProgress(page);

    await expect(page.getByText(/Temporary log should be deleted/i).first()).toBeVisible();
    await expect(page.getByText(/Stored log should remain after reload/i).first()).toBeVisible();

    const deleteButtonCountBefore = await page
      .getByRole("button", { name: /Delete Workout Log/i })
      .count();

    expect(deleteButtonCountBefore).toBeGreaterThan(0);

    await page.getByRole("button", { name: /Delete Workout Log/i }).first().click();

    await expect(page.getByText(/Temporary log should be deleted/i)).toHaveCount(0);
    await expect(page.getByText(/Stored log should remain after reload/i).first()).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openProgress(page);

    await expect(page.getByText(/Temporary log should be deleted/i)).toHaveCount(0);
    await expect(page.getByText(/Stored log should remain after reload/i).first()).toBeVisible();
  });
});