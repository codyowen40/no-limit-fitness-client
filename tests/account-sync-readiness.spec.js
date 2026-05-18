import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function expectNoDevelopmentWording(page) {
  const main = page.locator("main");

  await expect(main).toBeVisible();

  await expect(main).not.toContainText(/Supabase/i);
  await expect(main).not.toContainText(/Data Bridge/i);
  await expect(main).not.toContainText(/Auth Guard/i);
  await expect(main).not.toContainText(/Test Panel/i);
  await expect(main).not.toContainText(/service-role/i);
  await expect(main).not.toContainText(/localStorage-first/i);
  await expect(main).not.toContainText(/VITE_SUPABASE/i);
  await expect(main).not.toContainText(/RLS policies/i);
  await expect(main).not.toContainText(/test account/i);
  await expect(main).not.toContainText(/Resend/i);
  await expect(main).not.toContainText(/SendGrid/i);
}

test.describe("No Limit Fitness account sync readiness", () => {
  test("coach view loads cleanly without development database panels", async ({ page }) => {
    await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "coach");
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();

    await expectNoDevelopmentWording(page);
  });

  test("public client URL stays clean", async ({ page }) => {
    await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.removeItem(portalModeKey);
      window.localStorage.removeItem(testUnlockKey);
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();

    await expectNoDevelopmentWording(page);
  });
});
