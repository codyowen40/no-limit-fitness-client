import { expect, test } from "@playwright/test";

test.describe("Public logout flow", () => {
  test("logout returns to the public login screen without blanking the app", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|MY PLAN|Build Workout Plan/i);

    await page.getByRole("button", { name: /LOGOUT/i }).first().click();

    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("body")).not.toHaveText("");
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|login|sign in|sign up|create account/i);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("nlf-public-account-access-v1")))
      .toBeNull();
  });

  test("logout clears a real client account session without requiring a refresh", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.setItem("nlf-public-account-access-v1", "true");
      window.localStorage.setItem("no-limit-fitness-portal-mode-v1", "client");
    });
    await page.reload();
    await expect(page.getByLabel("Client overview").first()).toBeVisible();

    await page.getByRole("button", { name: /LOGOUT/i }).first().click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Client Access" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Coach Access" })).toBeVisible();
    await expect(page.getByLabel("Client My Plan dashboard")).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("nlf-public-account-access-v1")))
      .toBeNull();
  });
});
