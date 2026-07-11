import { expect, test } from "@playwright/test";

test("Nutrition Coach top tab opens the working Nutrition Coach window", async ({ page }) => {
  await page.goto("/?testUnlock=true");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Nutrition Coach", exact: true })
      .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await expect(nutritionCoachWindow).toBeVisible();
  await expect(nutritionCoachWindow.getByRole("button", { name: /Build My Target/i })).toBeVisible();
  await expect(nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i })).toBeVisible();
});

test("Nutrition Coach calculates macro targets and meal estimates", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await nutritionCoachWindow.getByRole("button", { name: /Build My Target/i }).click();
  await expect(page.getByTestId("macro-target-calculator")).toBeVisible();

  await page.getByLabel("Body Weight").fill("200");
  await page.getByLabel("Nutrition Goal").selectOption("fat-loss");
  await page.getByLabel("Training Days").fill("5");
  await page.getByLabel("Activity Level").selectOption("high");
  await page.getByRole("button", { name: "Calculate Targets" }).click();

  await expect(page.getByTestId("nutrition-target-result")).toBeVisible();
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Daily Calories");
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Protein Goal");
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Coach Tip");

  await page.getByRole("button", { name: "Start Over" }).click();
  await nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i }).click();

  await expect(page.getByTestId("meal-check-estimator")).toBeVisible();
  await page.getByLabel("Meal Description").fill("Large chicken bowl with rice, cheese, avocado, and sauce");
  await page.getByRole("button", { name: "Estimate Meal" }).click();

  await expect(page.getByTestId("meal-check-result")).toBeVisible();
  await expect(page.getByTestId("meal-check-result")).toContainText("Meal Estimate");
  await expect(page.getByTestId("meal-check-result")).toContainText("Protein");
  await expect(page.getByTestId("meal-check-result")).toContainText("Coach Tip");
});
