import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

function planExercise(id, exerciseName, sets, repsOrTime, weightGuidance, rest, notes) {
  return {
    id,
    exerciseId: id + "-library",
    exerciseName,
    sets,
    repsOrTime,
    weightGuidance,
    rest,
    notes,
  };
}

function buildSeedState() {
  const clients = [
    {
      id: "bundle-7-client-alpha",
      name: "Bundle Seven Alpha",
      email: "bundle7alpha@nolimittest.com",
      status: "Active",
    },
    {
      id: "bundle-7-client-beta",
      name: "Bundle Seven Beta",
      email: "bundle7beta@nolimittest.com",
      status: "Inactive",
    },
  ];

  const savedPlans = [
    {
      id: "bundle-7-plan-strength",
      planName: "Bundle 7 Strength Base",
      clientId: clients[0].id,
      clientName: clients[0].name,
      createdAt: "5/17/2026, 4:00:00 AM",
      timestamp: 1778990400000,
      days: [
        {
          id: "bundle-7-day-lower",
          name: "Bundle 7 Lower Strength Day",
          exercises: [
            planExercise("bundle-7-ex-squat", "Back Squat", "4", "5", "RPE 7", "2 - 3 min", "Brace hard and drive up."),
            planExercise("bundle-7-ex-row", "Barbell Row", "3", "8 - 10", "Controlled", "90 sec", "Pause at the ribs."),
          ],
        },
        {
          id: "bundle-7-day-upper",
          name: "Bundle 7 Upper Volume Day",
          exercises: [
            planExercise("bundle-7-ex-bench", "Barbell Bench Press", "4", "6", "RPE 8", "2 min", "Stay tight on the bench."),
            planExercise("bundle-7-ex-pulldown", "Lat Pulldown", "3", "10 - 12", "Moderate", "75 sec", "Pull elbows down."),
          ],
        },
      ],
    },
    {
      id: "bundle-7-plan-conditioning",
      planName: "Bundle 7 Conditioning Reset",
      clientId: clients[1].id,
      clientName: clients[1].name,
      createdAt: "5/17/2026, 4:05:00 AM",
      timestamp: 1778990700000,
      days: [
        {
          id: "bundle-7-day-conditioning",
          name: "Bundle 7 Conditioning Day",
          exercises: [
            planExercise("bundle-7-ex-bike", "Assault Bike Sprint", "6", "20 sec", "Hard sprint", "100 sec", "Stay powerful."),
          ],
        },
      ],
    },
  ];

  const workoutLogs = [
    {
      id: "bundle-7-log-seeded-complete",
      clientId: clients[0].id,
      clientName: clients[0].name,
      planId: savedPlans[0].id,
      planName: savedPlans[0].planName,
      dayId: savedPlans[0].days[0].id,
      dayName: savedPlans[0].days[0].name,
      status: "completed",
      skipReason: "",
      submittedAt: "5/17/2026, 4:10:00 AM",
      timestamp: 1778991000000,
      entries: [
        {
          exerciseId: "bundle-7-ex-squat",
          exerciseName: "Back Squat",
          assignedSets: "4",
          assignedRepsOrTime: "5",
          assignedWeightGuidance: "RPE 7",
          assignedRest: "2 - 3 min",
          actualWeight: "205 lb",
          setsCompleted: "4",
          repsCompleted: "5",
          timeCompleted: "",
          restUsed: "2 min",
          substitution: "Safety bar squat",
          notes: "Seeded Bundle 7 progress note.",
        },
      ],
    },
  ];

  const conversations = [
    {
      clientId: clients[0].id,
      clientName: clients[0].name,
      messages: [
        {
          id: "bundle-7-message-coach-seed",
          sender: "Coach",
          body: "Bundle 7 coach seed message.",
          sentAt: "5/17/2026, 4:12:00 AM",
          timestamp: 1778991120000,
          unreadForCoach: false,
          unreadForClient: true,
        },
      ],
    },
    {
      clientId: clients[1].id,
      clientName: clients[1].name,
      messages: [
        {
          id: "bundle-7-message-client-seed",
          sender: "Client",
          body: "Bundle 7 client seed message.",
          sentAt: "5/17/2026, 4:13:00 AM",
          timestamp: 1778991180000,
          unreadForCoach: true,
          unreadForClient: false,
        },
      ],
    },
  ];

  return {
    clients,
    savedPlans,
    workoutLogs,
    conversations,
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
      coachEmail: "coach-bundle7@nolimittest.com",
      emailProvider: "Account + Resend",
      backendStatus: "Bundle 7 frontend placeholder check",
      notes: "Bundle 7 confirms notification settings stay local until Account import is intentional.",
    },
  };
}

async function openSeededApp(page, mode = "demo", state = buildSeedState()) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(
    ({ storageKey, portalModeKey, testUnlockKey, portalMode, seededState }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(seededState));
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, portalMode);
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      portalMode: mode,
      seededState: state,
    }
  );

  await page.goto("http://localhost:5173/?testUnlock=true", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
}

async function readStoredState(page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function openTab(page, tabName) {
  const nav = page.getByRole("navigation");
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: new RegExp(tabName, "i") }).first().click();
  await expect(page.locator("main")).toBeVisible();
}



async function openTrackerForAlpha(page) {
  await openTab(page, "Tracker");

  const main = page.getByRole("main");

  await expect(main).toBeVisible();

  const trackerSelects = main.locator("select");

  await expect(trackerSelects.first()).toBeVisible();

  await trackerSelects.nth(0).selectOption("bundle-7-client-alpha");
  await trackerSelects.nth(1).selectOption("bundle-7-plan-strength");

  await expect(
    main.getByRole("button", { name: /Bundle 7 Lower Strength Day/i }).first()
  ).toBeVisible();

  await main
    .getByRole("button", { name: /Bundle 7 Lower Strength Day/i })
    .first()
    .click();

  await expect(main.getByLabel("Actual Weight Used").first()).toBeVisible();
}

async function expectMainText(page, text) {
  await expect(page.locator("main")).toContainText(text, { timeout: 10000 });
}

test.describe("No Limit Fitness Bundle 7 mega regression", () => {
  test("loads a full seeded local app state and keeps the full storage shape", async ({ page }) => {
    await openSeededApp(page);

    const stored = await readStoredState(page);
    expect(stored.clients).toHaveLength(2);
    expect(stored.savedPlans).toHaveLength(2);
    expect(stored.workoutLogs).toHaveLength(1);
    expect(stored.conversations).toHaveLength(2);
    expect(stored.notificationPreferences.messages).toBe(true);
    expect(stored.backendSettings.emailProvider).toBe("Account + Resend");
  });

  test("shows seeded plans, clients, messages, logs, and notification settings across demo tabs", async ({ page }) => {
    await openSeededApp(page);

    await openTab(page, "Clients");
    await expectMainText(page, "Bundle Seven Alpha");
    await expectMainText(page, "bundle7alpha@nolimittest.com");

    await openTab(page, "Plans");
    await expectMainText(page, "Bundle 7 Strength Base");
    await expectMainText(page, "Bundle 7 Lower Strength Day");
    await expectMainText(page, "Back Squat");

    await openTab(page, "Tracker");
    await expectMainText(page, "Bundle 7 Strength Base");
    await expectMainText(page, "Bundle 7 Lower Strength Day");

    await openTab(page, "Messages");
    await expectMainText(page, "Bundle 7 coach seed message.");
    await expectMainText(page, "Bundle Seven Beta");

    await openTab(page, "Progress");
    await expectMainText(page, "Seeded Bundle 7 progress note.");
    await expectMainText(page, "Safety bar squat");

    await openTab(page, "Login");
    await expectMainText(page, "Shared Data Sync");
    await expectMainText(page, "Do not send email directly inside App.jsx");
  });

  test("keeps coach-only and client-only portal navigation rules with seeded data", async ({ page }) => {
    await openSeededApp(page, "coach");

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("button", { name: /Coach/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /Clients/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /Plans/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /Client$/i })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /Tracker/i })).toBeVisible();

    await page.evaluate(
      ({ portalModeKey }) => window.localStorage.setItem(portalModeKey, "client"),
      { portalModeKey: PORTAL_MODE_KEY }
    );
    await page.reload({ waitUntil: "domcontentloaded" });

    const clientNav = page.getByRole("navigation");
    await expect(clientNav.getByRole("button", { name: /Client$/i })).toBeVisible();
    await expect(clientNav.getByRole("button", { name: /Tracker/i })).toBeVisible();
    await expect(clientNav.getByRole("button", { name: /Progress/i })).toBeVisible();
    await expect(clientNav.getByRole("button", { name: /Coach/i })).toHaveCount(0);
    await expect(clientNav.getByRole("button", { name: /Clients/i })).toHaveCount(0);
  });

  test("normalizes a partial saved state without losing required app sections", async ({ page }) => {
    const partialState = {
      clients: [
        {
          id: "bundle-7-partial-client",
          name: "Bundle Seven Partial",
          email: "partial@nolimittest.com",
        },
      ],
      savedPlans: "not-an-array",
      workoutLogs: null,
      conversations: [
        {
          clientId: "bundle-7-partial-client",
          clientName: "Wrong Name Should Normalize",
          messages: "not-an-array",
        },
      ],
      notificationPreferences: { messages: false },
      backendSettings: { coachEmail: "partial-coach@nolimittest.com" },
    };

    await openSeededApp(page, "demo", partialState);

    await expect.poll(async () => {
      const stored = await readStoredState(page);
      return stored.clients[0].status;
    }).toBe("Active");

    const stored = await readStoredState(page);
    expect(stored.savedPlans).toEqual([]);
    expect(stored.workoutLogs).toEqual([]);
    expect(stored.conversations[0].clientName).toBe("Bundle Seven Partial");
    expect(stored.conversations[0].messages).toEqual([]);
    expect(stored.notificationPreferences.completedWorkout).toBe(true);
    expect(stored.notificationPreferences.messages).toBe(false);
    expect(stored.backendSettings.emailProvider).toBe("Account + Resend");
  });

  test("keeps plan builder validation safe before saving an incomplete custom plan", async ({ page }) => {
    await openSeededApp(page);
    await openTab(page, "Plans");

    await page.getByLabel("Plan Name").fill("");
    await page.getByRole("button", { name: /Save Plan Locally|Update Plan Locally/i }).click();
    await expectMainText(page, "Add a plan name before saving.");

    await page.getByLabel("Plan Name").fill("Bundle 7 Validation Plan");
    await page.getByRole("button", { name: /Save Plan Locally|Update Plan Locally/i }).click();
    await expectMainText(page, "Add at least one exercise before saving.");
  });

  test("completes a seeded workout, writes actual performance, and keeps it after refresh", async ({ page }) => {
    await openSeededApp(page);
    await openTrackerForAlpha(page);

    await page.getByLabel("Actual Weight Used").first().fill("225 lb");
    await page.getByLabel("Sets Completed").first().fill("4");
    await page.getByLabel("Reps Completed").first().fill("5");
    await page.getByLabel("Actual Rest Used").first().fill("2 min");
    await page.getByLabel("Exercise Substitution").first().fill("Box squat");
    await page.getByLabel("Client Notes").first().fill("Bundle 7 completed workout note.");
    await page.getByRole("button", { name: /Mark Complete/i }).click();

    await expectMainText(page, "marked complete");

    await expect.poll(async () => {
      const stored = await readStoredState(page);
      const completedLog = stored.workoutLogs.find((log) =>
        log.entries?.some((entry) => entry.notes === "Bundle 7 completed workout note.")
      );

      return completedLog?.entries?.[0]?.actualWeight;
    }).toBe("225 lb");

    const stored = await readStoredState(page);
    const completedLog = stored.workoutLogs.find((log) =>
      log.entries?.some((entry) => entry.notes === "Bundle 7 completed workout note.")
    );

    expect(completedLog).toBeTruthy();
    expect(completedLog.status).toBe("completed");
    expect(completedLog.entries[0].substitution).toBe("Box squat");
    expect(completedLog.entries[0].notes).toBe("Bundle 7 completed workout note.");

    await page.reload({ waitUntil: "domcontentloaded" });
    await openTab(page, "Progress");
    await expectMainText(page, "Bundle 7 completed workout note.");
    await expectMainText(page, "Box squat");
  });

  test("skips a seeded workout, stores the reason, and keeps it after refresh", async ({ page }) => {
    await openSeededApp(page);
    await openTrackerForAlpha(page);

    await page.getByLabel("Skip Reason").fill("Bundle 7 travel recovery day.");
    await page.getByRole("button", { name: /Mark Skipped/i }).click();

    await expectMainText(page, "marked skipped");

    await expect.poll(async () => {
      const stored = await readStoredState(page);
      const skippedLog = stored.workoutLogs.find(
        (log) => log.skipReason === "Bundle 7 travel recovery day."
      );

      return skippedLog?.skipReason;
    }).toBe("Bundle 7 travel recovery day.");

    const stored = await readStoredState(page);
    const skippedLog = stored.workoutLogs.find(
      (log) => log.skipReason === "Bundle 7 travel recovery day."
    );

    expect(skippedLog).toBeTruthy();
    expect(skippedLog.status).toBe("skipped");

    await page.reload({ waitUntil: "domcontentloaded" });
    await openTab(page, "Progress");
    await expectMainText(page, "Bundle 7 travel recovery day.");
  });

  test("sends coach and client messages with unread flags saved locally", async ({ page }) => {
    await openSeededApp(page);
    await openTab(page, "Messages");

    await page.getByRole("button", { name: /Bundle Seven Alpha/i }).first().click();

    await page.getByLabel("Send As").selectOption("Coach");
    await page.getByLabel("Message").fill("Bundle 7 coach follow-up after the lift.");
    await page.getByRole("button", { name: /Send Message/i }).click();
    await expectMainText(page, "Coach message sent locally.");

    await page.getByLabel("Send As").selectOption("Client");
    await page.getByLabel("Message").fill("Bundle 7 client reply with readiness update.");
    await page.getByRole("button", { name: /Send Message/i }).click();
    await expectMainText(page, "Client message sent locally.");

    await expect.poll(async () => {
      const stored = await readStoredState(page);
      const conversation = stored.conversations.find((item) => item.clientId === "bundle-7-client-alpha");
      return conversation.messages.some((message) => message.body === "Bundle 7 client reply with readiness update.");
    }).toBe(true);

    const stored = await readStoredState(page);
    const conversation = stored.conversations.find((item) => item.clientId === "bundle-7-client-alpha");
    const coachMessage = conversation.messages.find((message) => message.body === "Bundle 7 coach follow-up after the lift.");
    const clientMessage = conversation.messages.find((message) => message.body === "Bundle 7 client reply with readiness update.");

    expect(coachMessage.unreadForClient).toBe(true);
    expect(coachMessage.unreadForCoach).toBe(false);
    expect(clientMessage.unreadForCoach).toBe(true);
    expect(clientMessage.unreadForClient).toBe(false);

    await page.reload({ waitUntil: "domcontentloaded" });
    await openTab(page, "Messages");
    await expectMainText(page, "Bundle 7 coach follow-up after the lift.");
    await expectMainText(page, "Bundle 7 client reply with readiness update.");
  });

  test("marks message unread states as read without deleting conversation history", async ({ page }) => {
    await openSeededApp(page);
    await openTab(page, "Messages");

    await page.getByRole("button", { name: /Bundle Seven Alpha/i }).first().click();
    await page.getByRole("button", { name: /Mark Coach Read/i }).click();
    await expectMainText(page, "Coach unread messages marked as read.");

    await page.getByRole("button", { name: /Mark Client Read/i }).click();
    await expectMainText(page, "Client unread messages marked as read.");

    await expect.poll(async () => {
      const stored = await readStoredState(page);
      const conversation = stored.conversations.find((item) => item.clientId === "bundle-7-client-alpha");
      return conversation.messages.every((message) => message.unreadForCoach === false && message.unreadForClient === false);
    }).toBe(true);

    const stored = await readStoredState(page);
    const conversation = stored.conversations.find((item) => item.clientId === "bundle-7-client-alpha");
    expect(conversation.messages.length).toBeGreaterThan(0);
  });

  test("keeps Exercise Library searchable and free of programming fields", async ({ page }) => {
    await openSeededApp(page);
    await openTab(page, "Exercises");

    await page.getByPlaceholder("Search by exercise, muscle, category, or equipment...").fill("Back Squat");
    await expectMainText(page, "Back Squat");
    await expectMainText(page, "Quads, glutes, hamstrings, core, upper back");
    await expect(page.locator("main")).not.toContainText("Sets:");
    await expect(page.locator("main")).not.toContainText("Reps:");
    await expect(page.locator("main")).not.toContainText("Rest:");
    await expect(page.locator("main")).not.toContainText("Weight Guidance");
  });

  test("deletes a workout log from Progress and keeps it deleted after reload", async ({ page }) => {
    await openSeededApp(page);
    await openTab(page, "Progress");

    await expectMainText(page, "Seeded Bundle 7 progress note.");
    await page.getByRole("button", { name: /Delete Workout Log/i }).first().click();
    await expect.poll(async () => {
      const stored = await readStoredState(page);
      return stored.workoutLogs.find((log) => log.id === "bundle-7-log-seeded-complete");
    }).toBeUndefined();

    await expect(page.locator("main")).not.toContainText("Seeded Bundle 7 progress note.");

    await page.reload({ waitUntil: "domcontentloaded" });
    await openTab(page, "Progress");
    await expect(page.locator("main")).not.toContainText("Seeded Bundle 7 progress note.");
  });
});
