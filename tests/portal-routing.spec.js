import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function clearPortalState(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.reload({ waitUntil: "domcontentloaded" });
}

async function openPortalMode(page, mode) {
  await page.evaluate(({ portalModeKey, testUnlockKey, nextMode }) => {
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, nextMode);
  }, {
    portalModeKey: PORTAL_MODE_KEY,
    testUnlockKey: TEST_UNLOCK_KEY,
    nextMode: mode,
  });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).toBeAttached();
}

test.describe("No Limit Fitness portal routing", () => {
  test("starts locked, then supports demo, coach, and client portal navigation", async ({
    page,
  }) => {
    await clearPortalState(page);

    let nav = page.getByRole("navigation");

    await expect(
      page.getByRole("heading", { name: "Authentication Later" })
    ).toBeVisible();

    await openPortalMode(page, "demo");

    nav = page.getByRole("navigation");

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();

    await expect(
      nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).first()
    ).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

    await openPortalMode(page, "coach");

    nav = page.getByRole("navigation");

    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeHidden();

    await openPortalMode(page, "client");

    nav = page.getByRole("navigation");

    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeHidden();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeHidden();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeHidden();

    await nav.getByRole("button", { name: /^Logout$/ }).click();

    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    nav = page.getByRole("navigation");

    await expect(
      page.getByRole("heading", { name: "Authentication Later" })
    ).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeHidden();
    await expect(page.getByLabel("Portal mode controls").first()).toBeHidden();
  });
});