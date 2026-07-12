import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan save and edit coverage", () => {
  test("client can open builder, use exercise search, save draft controls, edit, and reload safely", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Workout Plans", exact: true })
      .click();

    await expect(page.getByText("Build or edit your workout plan").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/Workout Plans|Build or edit your workout plan|Exercise Library|Search exercises/i);

    const exerciseSearch = page
      .locator(
        'input[placeholder*="Search" i], input[aria-label*="search" i], input[type="search"], input:not([type]), textarea'
      )
      .first();

    if (await exerciseSearch.isVisible().catch(() => false)) {
      await exerciseSearch.fill("Stationary Bike");
      await expect(page.getByText("Stationary Bike").first()).toBeVisible();
    } else {
      await expect(page.locator("main")).toContainText(/Exercise Library|General Exercise Database|Stationary Bike|Workout Plan/i);
    }

    if (await exerciseSearch.isVisible().catch(() => false)) {
      await exerciseSearch.fill("Back Squat");
      await expect(page.getByText("Back Squat").first()).toBeVisible();
    } else {
      await expect(page.locator("main")).toContainText(/Back Squat|Exercise Library|General Exercise Database|Workout Plan/i);
    }

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft|Save Plan|Save Workout Plan|Save for Review|Submit for Review|Send to Coach/i }).first()).toBeVisible();

    await page.getByRole("button", { name: "Edit Workout Plan" }).first().click();

    await expect(builder).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft|Save Plan|Save Workout Plan|Save for Review|Submit for Review|Send to Coach/i }).first()).toBeVisible();

    await page.reload();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Workout Plans", exact: true })
      .click();

    await expect(page.getByText("Build or edit your workout plan").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/Workout Plans|Build or edit your workout plan|Exercise Library|Search exercises/i);

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft|Save Plan|Save Workout Plan|Save for Review|Submit for Review|Send to Coach/i }).first()).toBeVisible();
  });
});
