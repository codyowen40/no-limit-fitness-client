import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openCleanPublicUrl(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });
}

async function openUnlockedMode(page, mode) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey, nextMode }) => {
    window.localStorage.setItem(portalModeKey, nextMode);
    window.localStorage.setItem(testUnlockKey, "true");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY, nextMode: mode });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
}

test.describe("No Limit Fitness portal routing", () => {
  test("clean public URL starts in client portal mode", async ({ page }) => {
    await openCleanPublicUrl(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.getByLabel("Portal mode controls")).toHaveCount(0);

    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /Messages/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);
  });

  test("internal test unlock still supports demo coach and client portal routing", async ({ page }) => {
    await openUnlockedMode(page, "demo");

    const controls = page.getByLabel("Portal mode controls").first();
    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(controls).toBeVisible();
    await expect(page.getByText("Demo Preview Active")).toBeVisible();

    await controls.getByRole("button", { name: "Coach Portal" }).click();
    await expect(page.getByText("Coach Portal Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();

    await controls.getByRole("button", { name: "Client Portal" }).click();
    await expect(page.getByText("Client Portal Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /Messages/i })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);
  });
});
