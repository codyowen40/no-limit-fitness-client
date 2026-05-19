import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const COACH_LOCK_KEY = "no-limit-fitness-coach-session-lock-v1";

function buildState() {
  const client = {
    id: "bundle-12m1c-active",
    name: "Bundle 12M1C Active",
    email: "active.12m1c@nolimit.test",
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

test.describe("No Limit Fitness Bundle 12M.1C coach portal lock", () => {
  test("keeps coach portal active after reload without reverting to client portal", async ({ page }) => {
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(
      ({ storageKey, portalModeKey, coachLockKey, seededState }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(seededState));
        window.localStorage.setItem(portalModeKey, "coach");
        window.localStorage.setItem(coachLockKey, "true");
      },
      {
        storageKey: STORAGE_KEY,
        portalModeKey: PORTAL_MODE_KEY,
        coachLockKey: COACH_LOCK_KEY,
        seededState: buildState(),
      }
    );

    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("button", { name: /^Coach$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/i })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(nav.getByRole("button", { name: /^Coach$/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/i })).toBeVisible();

    const savedMode = await page.evaluate((portalModeKey) => {
      return window.localStorage.getItem(portalModeKey);
    }, PORTAL_MODE_KEY);

    expect(savedMode).toBe("coach");
  });
});
