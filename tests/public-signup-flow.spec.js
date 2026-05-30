import { expect, test } from "@playwright/test";

test.describe("Public sign-up flow", () => {
  test("client can open sign-up and create access without blanking the app", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("NO LIMIT FITNESS").first()).toBeVisible();

    const signUpButton = page.getByRole("button", { name: /sign up|create account|get started/i }).first();
    await expect(signUpButton).toBeVisible();
    await signUpButton.click();

    const visibleInputs = page.locator("input:visible");
    await expect(visibleInputs.first()).toBeVisible();

    const emailInput = page
      .locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
      .first();

    const passwordInput = page
      .locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]')
      .first();

    if ((await page.locator('input[name*="name" i], input[placeholder*="name" i]').count()) > 0) {
      await page
        .locator('input[name*="name" i], input[placeholder*="name" i]')
        .first()
        .fill("Test Client");
    }

    await expect(emailInput).toBeVisible();
    await emailInput.fill("newclient@nolimittest.com");

    if ((await passwordInput.count()) > 0) {
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill("test123");
    }

    await page
      .getByRole("button", { name: /create account|sign up|get started|continue/i })
      .last()
      .click();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const clientDashboard = page.getByLabel("Client My Plan dashboard").first();
    await expect(clientDashboard).toContainText(/Training|TODAY'S WORKOUT|Coach Reminder/i);

    await page.getByRole("button", { name: "HOME" }).first().click();
    await expect(page.getByRole("navigation", { name: /Main navigation/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|Client Training Home|Build Workout Plan|MY PLAN|TODAY'S WORKOUT/i);
  });
});
