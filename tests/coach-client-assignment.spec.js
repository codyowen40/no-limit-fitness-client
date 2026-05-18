import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openCoachClients(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "coach");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();
  await nav.getByRole("button", { name: /^Clients$/ }).click();
}

test.describe("No Limit Fitness coach client assignment", () => {
  test("lets coach assign archive and reactivate clients while preserving the Clients section", async ({ page }) => {
    await openCoachClients(page);

    const panel = page.getByLabel("Coach client assignment manager");

    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Coach Assignment");
    await expect(panel).toContainText("Active Clients");
    await expect(panel).toContainText("Unassigned Clients");
    await expect(panel).toContainText("Archived Clients");

    const firstAvailableAction = panel
      .getByRole("button", { name: /Assign to Me|Archive Client|Reactivate Client/i })
      .first();

    await expect(firstAvailableAction).toBeVisible();
    await firstAvailableAction.click();

    await expect(panel).toContainText(/assigned|archived|reactivated|Past data/i);

    await page.reload({ waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();
    await nav.getByRole("button", { name: /^Clients$/ }).click();

    await expect(page.getByLabel("Coach client assignment manager")).toBeVisible();
  });
});
