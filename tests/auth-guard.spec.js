import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openLoginPanel(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

  await nav.getByRole("button", { name: /^Login$/ }).click();
}

test.describe("No Limit Fitness auth guard", () => {
  test("login auth panel loads safely without forcing real Supabase auth", async ({ page }) => {
    await openLoginPanel(page);

    await expect(page.locator("main")).toContainText(/Supabase|Authentication|Login/i);
    await expect(page.getByRole("button", { name: /Check Current Session/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Out/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Test Supabase Coach Login/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Test Supabase Client Login/i })).toBeVisible();
  });
});
