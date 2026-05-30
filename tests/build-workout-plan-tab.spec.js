import { expect, test } from "@playwright/test";

test("Build Workout Plan top tab contains builder and exercise library", async ({ page }) => {
  await page.goto("/?testUnlock=true");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Build Workout Plan", exact: true })
    .click();

  await expect(page.getByLabel("Build Workout Plan workspace").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Build a Plan" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Workout Plan" }).first()).toBeVisible();
  await expect(page.getByLabel("Client exercise search and substitution guide").first()).toBeVisible();
  await expect(page.getByText("Walk").first()).toBeVisible();
  await expect(page.getByText("Run").first()).toBeVisible();
  await expect(page.getByText("Stationary Bike").first()).toBeVisible();

  await page.getByRole("button", { name: "Build a Plan" }).first().click();

  await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();
});
