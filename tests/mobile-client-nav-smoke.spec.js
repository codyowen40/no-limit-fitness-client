import { expect, test } from "@playwright/test";

test.describe("Mobile client navigation smoke coverage", () => {
  test("mobile bottom Home and My Plan buttons stay usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const mobileHomeButton = page.locator('button[aria-label="Home"]').first();
    const mobileMyPlanButton = page.locator('button[aria-label="My Plan"]').first();

    await expect(mobileHomeButton).toBeVisible();
    await expect(mobileMyPlanButton).toBeVisible();

    await mobileHomeButton.click();

    await expect(mobileHomeButton).toBeVisible();
    await expect(mobileMyPlanButton).toBeVisible();
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|Client Training Home|Build Workout Plan|MY PLAN|TODAY'S WORKOUT/i);

    await mobileMyPlanButton.click();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();
    await expect(page.getByText("TODAY'S WORKOUT").first()).toBeVisible();
  });
  test("client messages use signed-in client role without Send As", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
      .click();

    await expect(page.getByLabel("Send As")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Signed-in role");
    await expect(page.locator("main")).toContainText("Client");

    await page.getByLabel("Message").fill("Client role locked message");
    await page.getByRole("button", { name: /^Send Message$/ }).click();

    await expect(page.locator("main")).toContainText("Client role locked message");
    await expect(page.locator("main")).toContainText("Client message sent locally.");
  });

  test("coach messages use signed-in coach role without Send As", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
      .click();

    await expect(page.getByLabel("Send As")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Signed-in role");
    await expect(page.locator("main")).toContainText("Coach");

    await page.getByLabel("Message").fill("Coach role locked message");
    await page.getByRole("button", { name: /^Send Message$/ }).click();

    await expect(page.locator("main")).toContainText("Coach role locked message");
    await expect(page.locator("main")).toContainText("Coach message sent locally.");
  });

});
