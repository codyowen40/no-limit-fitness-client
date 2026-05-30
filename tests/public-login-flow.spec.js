import { expect, test } from "@playwright/test";

test.describe("Public login flow", () => {
  test("client can sign in from public login without blanking the app", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("NO LIMIT FITNESS").first()).toBeVisible();

    const emailInput = page
      .locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
      .first();

    const passwordInput = page
      .locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]')
      .first();

    await expect(emailInput).toBeVisible();
    await emailInput.fill("client@nolimittest.com");

    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("test123");

    await page
      .getByRole("button", { name: /sign in|log in|login|continue/i })
      .first()
      .click();

    const clientDashboard = page.getByLabel("Client My Plan dashboard").first();

    await expect(clientDashboard).toBeVisible();
    await expect(clientDashboard).toContainText(/Training|TODAY'S WORKOUT|Coach Reminder/i);

    await page.getByRole("button", { name: "HOME" }).first().click();
    await expect(page.getByRole("navigation", { name: /Main navigation/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|Client Training Home|Build Workout Plan|MY PLAN|TODAY'S WORKOUT/i);
  });
});
