import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openCleanLogin(page) {
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

async function openUnlockedDemo(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(storageKey);
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "demo");
  }, {
    storageKey: STORAGE_KEY,
    portalModeKey: PORTAL_MODE_KEY,
    testUnlockKey: TEST_UNLOCK_KEY,
  });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByText("Demo Preview Active").first()).toBeVisible();
}

async function openNavTab(page, tabName) {
  const nav = page.getByRole("navigation");

  await expect(nav).toBeVisible();

  await nav
    .getByRole("button", {
      name: new RegExp("^" + tabName + "(?:\\s+\\d+)?$", "i"),
    })
    .first()
    .click();

  await expect(page.locator("main")).toBeVisible();
}

test.describe("No Limit Fitness final release readiness", () => {
  test("login-first shell is safe without forcing Supabase auth", async ({ page }) => {
    await openCleanLogin(page);

    const main = page.locator("main");

    await expect(main).toContainText("Authentication Later");
    await expect(main).toContainText("Auth Guard Status");
    await expect(main).toContainText("Supabase Login Test Panel");
    await expect(main).toContainText("Supabase Data Bridge Preview");
    await expect(main).toContainText("Do not send email directly inside App.jsx");

    await expect(
      page.getByRole("button", { name: "Check Current Session" })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();

    await page.getByRole("button", { name: "Check Current Session" }).click();

    await expect(page.locator("#root")).toBeAttached();
    await expect(main).toContainText(/Auth Status/i);

    await page.getByRole("button", { name: "Sign Out" }).click();

    await expect(page.locator("#root")).toBeAttached();
    await expect(main).toContainText(/Auth Status/i);
  });

  test("demo mode release navigation opens every major page", async ({ page }) => {
    await openUnlockedDemo(page);

    const nav = page.getByRole("navigation");

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

    await openNavTab(page, "Home");
    await expect(page.locator("main")).toContainText("Coach-to-client workout tracking system.");

    await openNavTab(page, "Client");
    await expect(page.locator("main")).toContainText(/Client/i);

    await openNavTab(page, "Coach");
    await expect(page.locator("main")).toContainText(/Command Center|Coach/i);

    await openNavTab(page, "Clients");
    await expect(page.locator("main")).toContainText("Client Management");

    await openNavTab(page, "Plans");
    await expect(page.locator("main")).toContainText(/Plan/i);

    await openNavTab(page, "Tracker");
    await expect(page.locator("main")).toContainText("Log The Work");

    await openNavTab(page, "Messages");
    await expect(page.locator("main")).toContainText(/Message/i);

    await openNavTab(page, "Exercises");
    await expect(page.locator("main")).toContainText("General Exercise Database");

    await openNavTab(page, "Progress");
    await expect(page.locator("main")).toContainText("Tracking Comes Next");

    await openNavTab(page, "Login");
    await expect(page.locator("main")).toContainText("Authentication Later");
  });

  test("mobile viewport can access key release pages", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await openUnlockedDemo(page);

    await openNavTab(page, "Home");
    await expect(page.locator("main")).toContainText("Coach-to-client workout tracking system.");

    await openNavTab(page, "Clients");
    await expect(page.locator("main")).toContainText("Client Management");

    await openNavTab(page, "Tracker");
    await expect(page.locator("main")).toContainText("Log The Work");

    await openNavTab(page, "Exercises");
    await expect(page.locator("main")).toContainText("General Exercise Database");

    await openNavTab(page, "Login");
    await expect(page.locator("main")).toContainText("Supabase Login Test Panel");
  });

  test("corrupted local storage still recovers before release", async ({ page }) => {
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(storageKey, "{bad-json");
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "demo");
    }, {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
    });

    await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("Demo Preview Active").first()).toBeVisible();

    await openNavTab(page, "Clients");

    await expect(page.locator("main")).toContainText("Sample Client");
    await expect(page.locator("main")).toContainText("Athlete Demo");
  });
});
