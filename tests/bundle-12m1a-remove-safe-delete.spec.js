import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";
const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

function buildState() {
  const client = {
    id: "bundle-12m1a-active",
    name: "Bundle 12M1A Active",
    email: "active.12m1a@nolimit.test",
    status: "Active",
    coachingStatus: "active",
    coachId: "coach-demo",
    coachName: "Coach",
    assignedAt: "2026-05-19T12:00:00.000Z",
  };

  return {
    clients: [client],
    savedPlans: [],
    workoutLogs: [],
    conversations: [{ clientId: client.id, clientName: client.name, messages: [] }],
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
    ({ storageKey, portalModeKey, testUnlockKey, seededState }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(seededState));
      window.localStorage.setItem(portalModeKey, "coach");
      window.localStorage.setItem(testUnlockKey, "true");
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      seededState: buildState(),
    }
  );

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
}

async function openTab(page, tabName) {
  const nav = page.getByRole("navigation").first();
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: new RegExp("^" + tabName + "$", "i") }).first().click();
  await expect(page.locator("main")).toBeVisible();
}

test.describe("No Limit Fitness Bundle 12M.1A remove Safe Delete", () => {
  test("keeps Archive Client visible and removes Safe Delete from active client profile", async ({ page }) => {
    await openUnlockedCoach(page);
    await openTab(page, "Clients");

    const main = page.getByRole("main");

    await expect(main).toContainText("Bundle 12M1A Active");
    await expect(main.getByRole("button", { name: /^Archive Client$/i })).toBeVisible();
    await expect(main.getByRole("button", { name: /Safe Delete Client/i })).toHaveCount(0);
  });
});
