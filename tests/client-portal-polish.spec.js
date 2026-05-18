import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openPublicClient(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });
}

async function openInternalDemo(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "demo");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
}

test.describe("No Limit Fitness client portal polish", () => {
  test("slims public client portal and shows a clear My Plan dashboard", async ({ page }) => {
    await openPublicClient(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^(Login|Logout)$/ })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);

    await expect(page.locator("main")).toContainText("My Plan");
    await expect(page.locator("main")).toContainText("Today's Workout");
    await expect(page.locator("main")).toContainText("This Week");
    await expect(page.getByRole("button", { name: /Log Workout/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Message Coach/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /View Progress/i })).toBeVisible();
    await nav.getByRole("button", { name: /^Exercises$/ }).click();
    await expect(page.locator("main")).toContainText("Exercise Library");
    await expect(page.locator("main")).toContainText("safe substitutions");
    await nav.getByRole("button", { name: /^Exercises$/ }).click();
    await expect(page.locator("main")).toContainText("Exercise Library");
    await expect(page.locator("main")).toContainText("safe substitutions");

    await nav.getByRole("button", { name: /^Client$/ }).click();
    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();

    await page.getByRole("button", { name: /Log Workout/i }).click();
    await expect(page.locator("main")).toBeVisible();
  });

  test("keeps full internal demo navigation available for coach testing", async ({ page }) => {
    await openInternalDemo(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
  });
});

