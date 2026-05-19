import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";
const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";
const COACH_LOCK_KEY = "no-limit-fitness-coach-session-lock-v1";

function buildState() {
  const alpha = {
    id: "bundle-12m1d-b-alpha",
    name: "Bundle Alpha Message Client",
    email: "alpha.message@nolimit.test",
    status: "Active",
    coachingStatus: "active",
    coachId: "coach-demo",
    coachName: "Coach",
    assignedAt: "2026-05-19T12:00:00.000Z",
  };

  const bravo = {
    id: "bundle-12m1d-b-bravo",
    name: "Bundle Bravo Message Client",
    email: "bravo.message@nolimit.test",
    status: "Active",
    coachingStatus: "active",
    coachId: "coach-demo",
    coachName: "Coach",
    assignedAt: "2026-05-19T12:00:00.000Z",
  };

  return {
    clients: [alpha, bravo],
    savedPlans: [],
    workoutLogs: [],
    conversations: [
      {
        clientId: alpha.id,
        clientName: alpha.name,
        messages: [
          {
            id: "alpha-message",
            sender: "Coach",
            body: "Alpha needs squat form review.",
            sentAt: "5/19/2026, 5:00:00 AM",
            timestamp: 1779166800000,
            unreadForCoach: false,
            unreadForClient: true,
          },
        ],
      },
      {
        clientId: bravo.id,
        clientName: bravo.name,
        messages: [
          {
            id: "bravo-message",
            sender: "Client",
            body: "Bravo asked about shoulder mobility.",
            sentAt: "5/19/2026, 6:00:00 AM",
            timestamp: 1779170400000,
            unreadForCoach: true,
            unreadForClient: false,
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
  };
}

async function openUnlockedCoach(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(
    ({ storageKey, portalModeKey, testUnlockKey, coachLockKey, seededState }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(seededState));
      window.localStorage.setItem(portalModeKey, "coach");
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(coachLockKey, "true");
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      coachLockKey: COACH_LOCK_KEY,
      seededState: buildState(),
    }
  );

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).toBeAttached();
  await expect(page.getByRole("navigation").first()).toBeVisible();
}

async function openTab(page, tabName) {
  const nav = page.getByRole("navigation").first();
  await expect(nav).toBeVisible();

  const targetButton = nav
    .getByRole("button", { name: new RegExp(tabName, "i") })
    .first();

  await expect(targetButton).toBeVisible();
  await targetButton.click();

  if (tabName === "Messages") {
    await expect(page.getByText(/Coach\/Client Messaging/i)).toBeVisible();
    return;
  }

  await expect(page.getByRole("navigation").first()).toBeVisible();
}

test.describe("No Limit Fitness Bundle 12M.1D-B message search", () => {
  test("searches conversations by client email and message body", async ({ page }) => {
    await openUnlockedCoach(page);
    await openTab(page, "Messages");

    const main = page.getByRole("main");
    const list = page.getByTestId("message-conversation-list");

    await expect(list).toContainText("Bundle Alpha Message Client");
    await expect(list).toContainText("Bundle Bravo Message Client");

    await main.getByPlaceholder(/Search by client/i).fill("shoulder mobility");

    await expect(list).not.toContainText("Bundle Alpha Message Client");
    await expect(list).toContainText("Bundle Bravo Message Client");
    await expect(list).toContainText("Bravo asked about shoulder mobility");

    await main.getByPlaceholder(/Search by client/i).fill("alpha.message");

    await expect(list).toContainText("Bundle Alpha Message Client");
    await expect(list).not.toContainText("Bundle Bravo Message Client");
    await expect(list).toContainText("Alpha needs squat form review");
  });
});
