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

    await expect(page.getByText("CLIENT HOME").first()).toBeVisible();
    await expect(page.getByText("Client Training Home").first()).toBeVisible();

    await mobileMyPlanButton.click();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();
    await expect(page.getByText("TODAY'S WORKOUT").first()).toBeVisible();
  });
});
