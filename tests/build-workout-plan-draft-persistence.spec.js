import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan draft persistence", () => {
  test("client saved workout draft stays visible after reload", async ({ page }) => {
    const draftTitle = "Client Reload Strength Draft";

    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();

    const draftTitleField = builder
      .locator('input:visible, textarea:visible')
      .first();

    await expect(draftTitleField).toBeVisible();

    await draftTitleField.fill(draftTitle);

    const textAreas = builder.locator("textarea:visible");
    const textAreaCount = await textAreas.count();

    if (textAreaCount > 0) {
      await textAreas.last().fill("Day 1 - Back Squat, Bench Press, Row. Keep reps controlled and log notes.");
    }

    await page.getByRole("button", { name: /Save Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(/saved|draft|review|updated/i);
    await expect(page.locator("body")).toContainText(draftTitle);

    await page.reload();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await expect(page.locator("body")).toContainText(draftTitle);

    await page.getByRole("button", { name: "Edit Workout Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(draftTitle);
  });
});
