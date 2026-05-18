import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

const bundleClient = {
  id: "bundle-6-client",
  name: "Bundle Six Client",
  email: "bundle6.client@nolimittest.com",
  status: "Active",
  notes: "Seeded client for Bundle 6 regression.",
};

const bundleSecondClient = {
  id: "bundle-6-second-client",
  name: "Bundle Six Second Client",
  email: "bundle6.second@nolimittest.com",
  status: "Lead",
  notes: "Second seeded client for Bundle 6 regression.",
};

const bundlePlan = {
  id: "bundle-6-plan",
  planName: "Bundle 6 Strength Plan",
  clientId: bundleClient.id,
  clientName: bundleClient.name,
  createdAt: "Bundle 6 seeded plan",
  timestamp: 1800000000000,
  days: [
    {
      id: "bundle-6-day",
      name: "Day 1 - Strength",
      exercises: [
        {
          id: "bundle-6-exercise-squat",
          exerciseId: "back-squat",
          exerciseName: "Back Squat",
          muscles: "Quads, glutes, hamstrings, core",
          equipment: "Barbell, rack, plates",
          sets: "4",
          repsOrTime: "6 - 8",
          weightGuidance: "225 lb",
          rest: "2 min",
          notes: "Brace and keep depth consistent.",
        },
      ],
    },
  ],
};

const completedLog = {
  id: "bundle-6-completed-log",
  clientId: bundleClient.id,
  clientName: bundleClient.name,
  planId: bundlePlan.id,
  planName: bundlePlan.planName,
  dayId: "bundle-6-day",
  dayName: "Day 1 - Strength",
  status: "completed",
  skipReason: "",
  submittedAt: "Bundle 6 completed workout",
  timestamp: 1800000001000,
  entries: [
    {
      exerciseId: "bundle-6-exercise-squat",
      exerciseName: "Back Squat",
      assignedSets: "4",
      assignedRepsOrTime: "6 - 8",
      assignedWeightGuidance: "225 lb",
      assignedRest: "2 min",
      actualWeight: "235 lb",
      setsCompleted: "4",
      repsCompleted: "8, 8, 7, 6",
      timeCompleted: "Not timed",
      restUsed: "2 min",
      substitution: "Safety Bar Squat",
      notes: "Bundle 6 completed workout note should persist.",
    },
  ],
};

const skippedLog = {
  id: "bundle-6-skipped-log",
  clientId: bundleClient.id,
  clientName: bundleClient.name,
  planId: bundlePlan.id,
  planName: bundlePlan.planName,
  dayId: "bundle-6-day",
  dayName: "Day 1 - Strength",
  status: "skipped",
  skipReason: "Bundle 6 schedule conflict.",
  submittedAt: "Bundle 6 skipped workout",
  timestamp: 1800000002000,
  entries: [],
};

function buildSeedState() {
  return {
    clients: [bundleClient, bundleSecondClient],
    savedPlans: [bundlePlan],
    workoutLogs: [completedLog, skippedLog],
    conversations: [
      {
        clientId: bundleClient.id,
        clientName: bundleClient.name,
        messages: [
          {
            id: "bundle-6-client-message",
            sender: "Client",
            body: "Bundle 6 client check-in before testing.",
            sentAt: "Bundle 6 seeded message",
            timestamp: 1800000003000,
            unreadForCoach: true,
            unreadForClient: false,
          },
          {
            id: "bundle-6-coach-message",
            sender: "Coach",
            body: "Bundle 6 coach reply before testing.",
            sentAt: "Bundle 6 seeded message",
            timestamp: 1800000004000,
            unreadForCoach: false,
            unreadForClient: true,
          },
        ],
      },
      {
        clientId: bundleSecondClient.id,
        clientName: bundleSecondClient.name,
        messages: [],
      },
    ],
    readActivityIds: [],
    notificationPreferences: {
      completedWorkout: true,
      skippedWorkout: false,
      changedValues: true,
      substitutions: true,
      workoutNotes: true,
      planAssigned: true,
      messages: true,
    },
    backendSettings: {
      coachEmail: "bundle6-original@nolimittest.com",
      emailProvider: "Account + Resend",
      backendStatus: "Bundle 6 original backend placeholder.",
      notes: "Email alerts should be sent from a backend later. Do not send email directly inside App.jsx.",
    },
  };
}

async function openSeededDemo(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(
    ({ storageKey, portalModeKey, testUnlockKey, seedState }) => {
      window.localStorage.clear();
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "demo");
      window.localStorage.setItem(storageKey, JSON.stringify(seedState));
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      seedState: buildSeedState(),
    }
  );

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.getByText("Demo Preview Active").first()).toBeVisible();
}

async function openTab(page, tabName) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: new RegExp(`^${tabName}(?:\\s+\\d+)?$`, "i") })
    .click();
}

async function openBundleConversation(page) {
  await openTab(page, "Messages");

  const main = page.getByRole("main");

  await expect(main).toBeVisible();

  await expect(
    main.getByText("Bundle 6 client check-in before testing.", { exact: true }).first()
  ).toBeVisible();
}

test.describe("No Limit Fitness Bundle 6 mega regression", () => {
  test.beforeEach(async ({ page }) => {
    await openSeededDemo(page);
  });

  test("checks demo, coach, and client portal visibility rules", async ({ page }) => {
    const nav = page.getByRole("navigation");

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();

    await page.evaluate((portalModeKey) => {
      window.localStorage.setItem(portalModeKey, "coach");
    }, PORTAL_MODE_KEY);

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();

    await page.evaluate((portalModeKey) => {
      window.localStorage.setItem(portalModeKey, "client");
    }, PORTAL_MODE_KEY);

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();
  });

  test("keeps notification preferences and notification settings after refresh", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Coach-to-client workout tracking system." })
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Notification Preferences" })).toBeVisible();
    await expect(page.getByLabel("Client completed workout")).toBeChecked();
    await expect(page.getByLabel("Client skipped workout")).not.toBeChecked();

    await page.getByLabel("Client skipped workout").check();
    await page.getByLabel("Coach Email For Future Alerts").fill("bundle6-updated@nolimittest.com");
    await page.getByLabel("Future Email Provider").selectOption("App undecided");
    await page.getByLabel("Sync Status").fill("Bundle 6 settings persisted after refresh.");

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("Client skipped workout")).toBeChecked();
    await expect(page.getByLabel("Coach Email For Future Alerts")).toHaveValue(
      "bundle6-updated@nolimittest.com"
    );
    await expect(page.getByLabel("Future Email Provider")).toHaveValue("App undecided");
    await expect(page.getByLabel("Sync Status")).toHaveValue(
      "Bundle 6 settings persisted after refresh."
    );
  });

  test("sends coach and client messages and keeps them after refresh", async ({ page }) => {
    await openBundleConversation(page);

    const main = page.getByRole("main");

    await expect(
      main.getByText("Bundle 6 client check-in before testing.", { exact: true }).first()
    ).toBeVisible();

    await expect(
      main.getByText("Bundle 6 coach reply before testing.", { exact: true }).first()
    ).toBeVisible();

    await main.getByRole("button", { name: /Mark Coach Read/i }).click();
    await expect(main.getByText("Coach unread messages marked as read.")).toBeVisible();

    await main.getByLabel("Send As").selectOption("Coach");
    await main.getByLabel("Message").fill("Coach bundle 6 message should persist.");
    await main.getByRole("button", { name: /Send Message/i }).click();

    await expect(main.getByText("Coach message sent locally.")).toBeVisible();
    await expect(
      main.getByText("Coach bundle 6 message should persist.", { exact: true })
    ).toBeVisible();

    await main.getByLabel("Send As").selectOption("Client");
    await main.getByLabel("Message").fill("Client bundle 6 reply should persist.");
    await main.getByRole("button", { name: /Send Message/i }).click();

    await expect(main.getByText("Client message sent locally.")).toBeVisible();
    await expect(
      main.getByText("Client bundle 6 reply should persist.", { exact: true })
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openBundleConversation(page);

    await expect(
      page.getByRole("main").getByText("Coach bundle 6 message should persist.", {
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("main").getByText("Client bundle 6 reply should persist.", {
        exact: true,
      })
    ).toBeVisible();
  });

  test("shows progress summaries and seeded workout log details after refresh", async ({ page }) => {
    await openTab(page, "Progress");

    const main = page.getByRole("main");

    await expect(main.getByRole("heading", { name: "Tracking Comes Next" })).toBeVisible();
    await expect(main.getByText("Bundle Six Client").first()).toBeVisible();
    await expect(main.getByText("Bundle 6 Strength Plan").first()).toBeVisible();
    await expect(main.getByText("Day 1 - Strength").first()).toBeVisible();
    await expect(main.getByText("Bundle 6 schedule conflict.").first()).toBeVisible();
    await expect(
      main.getByText("Bundle 6 completed workout note should persist.").first()
    ).toBeVisible();
    await expect(main.getByText("Safety Bar Squat").first()).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await openTab(page, "Progress");

    await expect(
      page.getByRole("main").getByText("Bundle 6 completed workout note should persist.").first()
    ).toBeVisible();

    await expect(
      page.getByRole("main").getByText("Bundle 6 schedule conflict.").first()
    ).toBeVisible();
  });

  test("keeps Exercise Library searchable and separate from programming fields", async ({ page }) => {
    await openTab(page, "Exercises");

    const main = page.getByRole("main");

    await expect(main.getByRole("heading", { name: "General Exercise Database" })).toBeVisible();
    await expect(
      main.getByText(/does not show sets, reps, time, weight, or rest/i)
    ).toBeVisible();

    await main
      .getByPlaceholder("Search by exercise, muscle, category, or equipment...")
      .fill("Back Squat");

    await expect(main.getByRole("heading", { name: /^Back Squat$/ })).toBeVisible();
    await expect(main.getByText(/Muscles worked:/i).first()).toBeVisible();
    await expect(main.getByText(/Equipment:/i).first()).toBeVisible();

    await expect(main.getByText(/^Sets$/i)).toHaveCount(0);
    await expect(main.getByText(/^Reps$/i)).toHaveCount(0);
    await expect(main.getByText(/^Rest$/i)).toHaveCount(0);
    await expect(main.getByText(/^Weight$/i)).toHaveCount(0);

    await main
      .getByPlaceholder("Search by exercise, muscle, category, or equipment...")
      .fill("No Such Bundle 6 Exercise");

    await expect(main.getByText("No exercises match your search.")).toBeVisible();
  });
});