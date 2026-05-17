import { test, expect } from "@playwright/test";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openCleanPublicUrl(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto("/", { waitUntil: "domcontentloaded" });
}

async function openInternalDemoUrl(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.setItem(portalModeKey, "demo");
    window.localStorage.setItem(testUnlockKey, "true");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto("/?testUnlock=true", { waitUntil: "domcontentloaded" });
}

async function expectNavButton(nav, namePattern) {
  await expect(nav.getByRole("button", { name: namePattern })).toBeVisible();
}

async function expectNoNavButton(nav, namePattern) {
  await expect(nav.getByRole("button", { name: namePattern })).toHaveCount(0);
}

test.describe("No Limit Fitness public client URL", () => {
  test("opens clean URL directly into the client portal without demo controls", async ({ page }) => {
    await openCleanPublicUrl(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();

    await expect(page.getByLabel("Portal mode controls")).toHaveCount(0);
    await expect(page.getByText("Demo Preview Active")).toHaveCount(0);
    await expect(page.getByText("Coach Portal Active")).toHaveCount(0);
    await expect(page.getByText("Client Portal Active")).toHaveCount(0);

    await expectNavButton(nav, /^Home$/);
    await expectNavButton(nav, /^Client$/);
    await expectNavButton(nav, /^Exercises$/);
    await expectNavButton(nav, /^Messages(?:\s+\d+)?$/);
    await expectNavButton(nav, /^Progress$/);
    await expectNavButton(nav, /^Tracker$/);
    await expectNavButton(nav, /^(Login|Logout)$/);

    await expectNoNavButton(nav, /^Coach$/);
    await expectNoNavButton(nav, /^Clients$/);
    await expectNoNavButton(nav, /^Plans$/);

    await expect(page.locator("main")).toContainText(/Client|Dashboard|Messages|Progress|Tracker/i);
  });

  test("keeps internal demo preview available through the test unlock URL without requiring visible switcher controls", async ({ page }) => {
    await openInternalDemoUrl(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();

    await expectNavButton(nav, /^Home$/);
    await expectNavButton(nav, /^Client$/);
    await expectNavButton(nav, /^Coach$/);
    await expectNavButton(nav, /^Clients$/);
    await expectNavButton(nav, /^Exercises$/);
    await expectNavButton(nav, /^Messages(?:\s+\d+)?$/);
    await expectNavButton(nav, /^Plans$/);
    await expectNavButton(nav, /^Progress$/);
    await expectNavButton(nav, /^Tracker$/);
  });
});
