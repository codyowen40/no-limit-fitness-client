import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan save and edit coverage", () => {
  test("client can open builder, use exercise search, save draft controls, edit, and reload safely", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await expect(page.getByText("Build or edit your workout plan").first()).toBeVisible();
    await expect(page.getByText("Client-Safe Exercise Library").first()).toBeVisible();

    const search = page.locator("input:visible").first();

    await expect(search).toBeVisible();

    await search.fill("Stationary Bike");
    await expect(page.getByText("Stationary Bike").first()).toBeVisible();

    await search.fill("Back Squat");
    await expect(page.getByText("Back Squat").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();

    await page.getByRole("button", { name: "Edit Workout Plan" }).first().click();

    await expect(builder).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();

    await page.reload();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await expect(page.getByText("Build or edit your workout plan").first()).toBeVisible();
    await expect(page.getByText("Client-Safe Exercise Library").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();
  });
});
