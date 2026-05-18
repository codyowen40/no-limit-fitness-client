import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function clearPortalState(page) {
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
}

async function clickNav(page, tabName) {
  const mobileNav = page.getByRole("navigation", { name: /Mobile navigation/i });
  const isMobileNavVisible = await mobileNav.isVisible().catch(() => false);

  if (isMobileNavVisible) {
    const mobilePrimaryLabels = {
      Client: "My Plan",
      Tracker: "Log",
      Progress: "Progress",
    };

    const primaryLabel = mobilePrimaryLabels[tabName];

    if (primaryLabel) {
      await mobileNav
        .getByRole("button", { name: new RegExp("^" + primaryLabel + "$", "i") })
        .click();
      await expect(page.locator("main")).toBeVisible();
      return;
    }

    await mobileNav.getByRole("button", { name: /^More$/i }).click();

    const moreMenu = page.getByLabel("Mobile More menu");
    const pattern =
      tabName === "Messages"
        ? /^Messages(?:\s+\d+)?$/i
        : new RegExp("^" + tabName + "$", "i");

    await moreMenu.getByRole("button", { name: pattern }).first().click();
    await expect(page.locator("main")).toBeVisible();
    return;
  }

  const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();
  const pattern =
    tabName === "Messages"
      ? /^Messages(?:\s+\d+)?$/i
      : new RegExp("^" + tabName + "$", "i");

  await nav.getByRole("button", { name: pattern }).first().click();
  await expect(page.locator("main")).toBeVisible();
}

test.describe("No Limit Fitness final release readiness", () => {
  test("public clean URL opens client portal without demo confusion", async ({ page }) => {
    await clearPortalState(page);
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();

    await expect(page.getByLabel("Portal mode controls")).toHaveCount(0);
    await expect(page.getByText("Demo Preview Active")).toHaveCount(0);
    await expect(page.getByText("Coach Portal Active")).toHaveCount(0);
    await expect(page.getByText("Client Portal Active")).toHaveCount(0);

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
  });

  test("internal demo mode release navigation still opens every major page", async ({ page }) => {
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

  test("mobile viewport can access key client release pages", async ({ page }) => {
    await clearPortalState(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await clickNav(page, "Client");
    await clickNav(page, "Messages");
    await clickNav(page, "Tracker");
  });

  test("corrupted local storage still recovers before release", async ({ page }) => {
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(storageKey, "{broken-json");
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
  });
});

