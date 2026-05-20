import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";
const COACH_LOCK_KEY = "no-limit-fitness-coach-session-lock-v1";

test.describe("No Limit Fitness Bundle 12M.1E-A hide demo controls", () => {
  test("keeps coach portal loading while hiding Demo Preview and Portal Mode controls", async ({ page }) => {
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(
      ({ portalModeKey, testUnlockKey, coachLockKey }) => {
        window.localStorage.setItem(portalModeKey, "coach");
        window.localStorage.setItem(testUnlockKey, "true");
        window.localStorage.setItem(coachLockKey, "true");
      },
      {
        portalModeKey: PORTAL_MODE_KEY,
        testUnlockKey: TEST_UNLOCK_KEY,
        coachLockKey: COACH_LOCK_KEY,
      }
    );

    await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("navigation").first()).toBeVisible();
    await expect(page.getByText(/Demo Preview/i)).toHaveCount(0);
    await expect(page.getByText(/Portal Mode/i)).toHaveCount(0);
  });
});
