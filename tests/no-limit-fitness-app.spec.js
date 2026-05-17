import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openCleanPublicUrl(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, {
    storageKey: STORAGE_KEY,
    portalModeKey: PORTAL_MODE_KEY,
    testUnlockKey: TEST_UNLOCK_KEY,
  });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
}

async function openInternalDemo(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.setItem(portalModeKey, "demo");
    window.localStorage.setItem(testUnlockKey, "true");
  }, {
    portalModeKey: PORTAL_MODE_KEY,
    testUnlockKey: TEST_UNLOCK_KEY,
  });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
}

async function clickNav(page, tabName) {
  const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

  const pattern =
    tabName === "Messages"
      ? /^Messages(?:\s+\d+)?$/
      : new RegExp("^" + tabName + "$", "i");

  await nav.getByRole("button", { name: pattern }).first().click();
  await expect(page.locator("main")).toBeVisible();
}

test.describe("No Limit Fitness Bundle 3 stable test", () => {
  test("checks Bundle 3 stable app pages and login/auth panel", async ({ page }) => {
    await openCleanPublicUrl(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);

    await clickNav(page, "Login");

    await expect(page.locator("main")).toContainText(/Authentication|Supabase|Login/i);
    await expect(page.getByRole("button", { name: /Check Current Session/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Out/i })).toBeVisible();

    await openInternalDemo(page);

    for (const tab of [
      "Home",
      "Client",
      "Coach",
      "Clients",
      "Exercises",
      "Messages",
      "Plans",
      "Progress",
      "Tracker",
      "Login",
    ]) {
      await clickNav(page, tab);
    }
  });
});
