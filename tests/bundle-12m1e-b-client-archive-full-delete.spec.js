import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";
const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";
const COACH_LOCK_KEY = "no-limit-fitness-coach-session-lock-v1";

function buildState() {
  const alpha = {
    id: "bundle-12m1e-b-alpha",
    name: "Bundle Alpha Active",
    email: "alpha.active@nolimit.test",
    status: "Active",
    coachingStatus: "active",
    coachId: "coach-demo",
    coachName: "Coach",
    assignedAt: "2026-05-19T12:00:00.000Z",
  };

  const bravo = {
    id: "bundle-12m1e-b-bravo",
    name: "Bundle Bravo Active",
    email: "bravo.active@nolimit.test",
    status: "Active",
    coachingStatus: "active",
    coachId: "coach-demo",
    coachName: "Coach",
    assignedAt: "2026-05-19T12:00:00.000Z",
  };

  const archived = {
    id: "bundle-12m1e-b-archived",
    name: "Bundle Archived Delete",
    email: "archived.delete@nolimit.test",
    status: "Archived",
    coachingStatus: "archived",
    archivedAt: "2026-05-18T12:00:00.000Z",
    archiveReason: "Seeded archived client",
  };

  return {
    clients: [alpha, bravo, archived],
    savedPlans: [
      {
        id: "archived-plan",
        planName: "Archived Delete Plan",
        clientId: archived.id,
        clientName: archived.name,
        createdAt: "5/18/2026, 4:00:00 AM",
        timestamp: 1779076800000,
        days: [],
      },
    ],
    workoutLogs: [
      {
        id: "archived-log",
        clientId: archived.id,
        clientName: archived.name,
        planId: "archived-plan",
        planName: "Archived Delete Plan",
        dayId: "old-day",
        dayName: "Archived Day",
        status: "completed",
        submittedAt: "5/18/2026, 5:00:00 AM",
        timestamp: 1779080400000,
        entries: [],
      },
    ],
    conversations: [
      { clientId: alpha.id, clientName: alpha.name, messages: [] },
      { clientId: bravo.id, clientName: bravo.name, messages: [] },
      {
        clientId: archived.id,
        clientName: archived.name,
        messages: [
          {
            id: "archived-message",
            sender: "Coach",
            body: "Archived delete message.",
            sentAt: "5/18/2026, 6:00:00 AM",
            timestamp: 1779084000000,
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
  await expect(page.getByRole("navigation").first()).toBeVisible();
}

async function openTab(page, tabName) {
  const nav = page.getByRole("navigation").first();
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: new RegExp(tabName, "i") }).first().click();
}

test.describe("No Limit Fitness Bundle 12M.1E-B client archive full delete", () => {
  test("searches and collapses active clients while full delete stays archived-only", async ({ page }) => {
    await openUnlockedCoach(page);
    await openTab(page, "Clients");

    const activeWindow = page.getByTestId("active-client-window");
    const archivedWindow = page.getByTestId("archived-client-window");

    await expect(activeWindow).toContainText("Bundle Alpha Active");
    await expect(activeWindow).toContainText("Bundle Bravo Active");
    await expect(activeWindow).not.toContainText("Bundle Archived Delete");
    await expect(activeWindow.getByRole("button", { name: /Full Delete Archived Client/i })).toHaveCount(0);

    const search = activeWindow.getByLabel(/Search Clients/i);
    await search.fill("bravo");

    await expect(activeWindow).toContainText("Bundle Bravo Active");
    await expect(activeWindow).not.toContainText("Bundle Alpha Active");

    await activeWindow.getByRole("button", { name: /Hide Client List/i }).click();
    await expect(search).toBeHidden();
    await expect(activeWindow.getByRole("button", { name: /Show Client List/i })).toBeVisible();

    await archivedWindow.getByRole("button", { name: /Show Archived Clients/i }).click();

    await expect(archivedWindow).toContainText("Bundle Archived Delete");
    await expect(archivedWindow.getByRole("button", { name: /Full Delete Archived Client/i })).toBeVisible();

    await archivedWindow.getByRole("button", { name: /Full Delete Archived Client/i }).click();

    await expect(page.getByText(/fully deleted from archived records/i).first()).toBeVisible();
    await expect(archivedWindow).not.toContainText("Bundle Archived Delete");
  });
});
