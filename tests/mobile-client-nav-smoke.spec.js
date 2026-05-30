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
});
