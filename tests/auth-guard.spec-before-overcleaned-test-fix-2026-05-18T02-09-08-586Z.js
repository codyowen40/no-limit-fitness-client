import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openInternalCoach(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "coach");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
}

test.describe("No Limit Fitness account access guard", () => {
  test("account access loads safely without exposing development database wording", async ({ page }) => {
    await openInternalCoach(page);

    const main = page.locator("main");
    await expect(page.locator("#root")).toBeAttached();
    await expect(main).toBeVisible();

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();
    const loginOrLogoutButton = nav.getByRole("button", { name: /^(Login|Logout)$/ }).first();

    if ((await loginOrLogoutButton.count()) > 0) {
      await loginOrLogoutButton.click();
    }

    await expect(main).toBeVisible();

    await expect(main).not.toContainText(/Account/i);
    await expect(main).not.toContainText(/Server/i);
    await expect(main).not.toContainText(/Data Sync/i);
    await expect(main).not.toContainText(/Account Guard/i);
    await expect(main).not.toContainText(/Test Panel/i);
    await expect(main).not.toContainText(/service-role/i);
    await expect(main).not.toContainText(/localStorage-first/i);
  });
});
