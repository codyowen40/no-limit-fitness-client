import { expect, test } from "@playwright/test";

test.describe("Public logout flow", () => {
  test("logout returns to the public login screen without blanking the app", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|MY PLAN|Build Workout Plan/i);

    await page.getByRole("button", { name: /LOGOUT/i }).first().click();

    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).not.toHaveText("");
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|login|sign in|sign up|create account/i);
  });
});
