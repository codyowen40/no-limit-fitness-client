import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function resetAndOpenDemo(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.clear();
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "demo");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).toBeAttached();
}

async function openCleanLogin(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).toBeAttached();
}

test.describe("No Limit Fitness Bundle 3 stable test", () => {
  test("checks Bundle 3 stable app pages and login/auth panel", async ({ page }) => {
    await resetAndOpenDemo(page);

    const nav = page.getByRole("navigation");

    await test.step("Home dashboard loads", async () => {
      await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();

      await expect(
        page.getByRole("heading", {
          name: "Coach-to-client workout tracking system.",
        })
      ).toBeVisible();

      await expect(
        page.getByText("Built with structure. Backed by discipline.")
      ).toBeVisible();

      await expect(page.getByText("Clients").first()).toBeVisible();
      await expect(page.getByText("Saved Plans").first()).toBeVisible();
      await expect(page.getByText("Workout Logs").first()).toBeVisible();
      await expect(page.getByText("Exercise Library").first()).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Build Workout Plan/i }).first()
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Client Profiles/i }).first()
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Client Tracker/i }).first()
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Messages/i }).first()
      ).toBeVisible();
    });

    await test.step("Demo navigation tabs are visible", async () => {
      await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

      await expect(
        nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).first()
      ).toBeVisible();
    });

    await test.step("Client page loads", async () => {
      await nav.getByRole("button", { name: /^Client$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/client/i);
    });

    await test.step("Coach page loads", async () => {
      await nav.getByRole("button", { name: /^Coach$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/coach/i);
    });

    await test.step("Clients page loads", async () => {
      await nav.getByRole("button", { name: /^Clients$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/client/i);
    });

    await test.step("Plans page loads", async () => {
      await nav.getByRole("button", { name: /^Plans$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/plan/i);
    });

    await test.step("Tracker page loads", async () => {
      await nav.getByRole("button", { name: /^Tracker$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/workout|tracker|training/i);
    });

    await test.step("Exercise library page loads", async () => {
      await nav.getByRole("button", { name: /^Exercises$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/exercise/i);
      await expect(page.getByText("Back Squat").first()).toBeVisible();
    });

    await test.step("Progress page loads", async () => {
      await nav.getByRole("button", { name: /^Progress$/ }).click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/progress|tracking|workout logs/i);
    });

    await test.step("Messages page loads", async () => {
      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).first().click();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).toContainText(/message/i);
    });

    await test.step("Clean Login page loads with Supabase auth panel", async () => {
      await openCleanLogin(page);

      await expect(
        page.getByRole("heading", { name: "Authentication Later" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Supabase Login Test Panel" })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Check Current Session" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Coach Login" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Client Login" })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Test Supabase Coach Login" })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Test Supabase Client Login" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Role-Based Screen Plan" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Supabase-Ready Structure" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Do not send email directly inside App.jsx" })
      ).toBeVisible();
    });
  });
});