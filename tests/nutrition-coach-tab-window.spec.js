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

test("Nutrition Coach calculates and saves macro targets with age height and gender formula", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await nutritionCoachWindow.getByRole("button", { name: /Build My Target/i }).click();

  await expect(page.getByTestId("featured-nutrition-goal-selector")).toBeVisible();
  await expect(page.getByTestId("macro-target-calculator")).toBeVisible();

  await page.getByLabel("Nutrition Goal").selectOption("fat-loss");
  await page.getByLabel("Body Weight").fill("200");
  await page.getByLabel("Height Feet").fill("5");
  await page.getByLabel("Height Inches").fill("11");
  await page.getByLabel("Age").fill("35");
  await page.getByLabel("Gender Formula").selectOption("male");
  await page.getByLabel("Training Days").fill("5");
  await page.getByLabel("Activity Level").selectOption("high");
  await page.getByRole("button", { name: "Calculate Targets" }).click();

  await expect(page.getByTestId("nutrition-target-result")).toBeVisible();
  await expect(page.getByTestId("nutrition-target-result")).toContainText("BMR Estimate");
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Maintenance");
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Daily Calories");
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Protein Goal");
  await expect(page.getByTestId("nutrition-target-result")).toContainText("Weekly Trend");

  await page.getByRole("button", { name: "Save Macro Target" }).click();

  await expect(page.getByTestId("nutrition-save-status")).toContainText("Macro target saved");
  await expect(page.getByTestId("nutrition-history-panel")).toBeVisible();
  await expect(page.getByTestId("saved-nutrition-target").first()).toContainText("Weight Loss");
});

test("Nutrition Coach estimates real world convenience foods and drinks through text fallback", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i }).click();

  await page
    .getByLabel("Meal Description")
    .fill("moderate glass of sweet tea, Kool-Aid, ramen noodles, chips, 2 hot dogs, and pizza rolls");

  await page.getByRole("button", { name: "Estimate Meal" }).click();

  await expect(page.getByTestId("meal-check-result")).toBeVisible();
  await expect(page.getByTestId("meal-check-result")).toContainText("Sweet Tea");
  await expect(page.getByTestId("meal-check-result")).toContainText("Kool-Aid");
  await expect(page.getByTestId("meal-check-result")).toContainText("Ramen Noodles");
  await expect(page.getByTestId("meal-check-result")).toContainText("Hot Dog");
  await expect(page.getByTestId("meal-check-result")).toContainText("Pizza Rolls");

  await page.getByRole("button", { name: "Save Meal Estimate" }).click();

  await expect(page.getByTestId("nutrition-save-status")).toContainText("Meal estimate saved");
});

test("Nutrition Coach estimates alcohol drinks from liquor stores and gas stations", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i }).click();

  await page
    .getByLabel("Meal Description")
    .fill("2 light beers, 1 tallboy, 40 oz malt liquor, vodka cranberry, and hard seltzer");

  await page.getByRole("button", { name: "Estimate Meal" }).click();

  await expect(page.getByTestId("meal-check-result")).toBeVisible();
  await expect(page.getByTestId("meal-check-result")).toContainText("Light Beer");
  await expect(page.getByTestId("meal-check-result")).toContainText("Tallboy Beer");
  await expect(page.getByTestId("meal-check-result")).toContainText("Malt Liquor 40 oz");
  await expect(page.getByTestId("meal-check-result")).toContainText("Vodka Cranberry");
  await expect(page.getByTestId("meal-check-result")).toContainText("Hard Seltzer");
  await expect(page.getByTestId("meal-check-result")).toContainText("Alcohol adds calories quickly");
});

test("Nutrition Coach builds meals from database search and manual nutrition labels", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i }).click();

  await expect(page.getByTestId("food-search-builder")).toBeVisible();
  await page.getByLabel("Search Food Database").fill("sweet tea");
  await page.getByLabel("Food Quantity").fill("2");
  await page.getByRole("button", { name: /Add Sweet Tea/i }).first().click();

  await expect(page.getByTestId("meal-builder-item").first()).toContainText("Sweet Tea");
  await expect(page.getByTestId("meal-builder-total")).toContainText("Current Meal Total");

  await page.getByLabel("Manual Food Name").fill("Dollar General Frozen Meal");
  await page.getByLabel("Manual Serving").fill("1 tray");
  await page.getByLabel("Manual Calories").fill("430");
  await page.getByLabel("Manual Protein").fill("22");
  await page.getByLabel("Manual Carbs").fill("48");
  await page.getByLabel("Manual Fat").fill("14");
  await page.getByRole("button", { name: "Add Manual Label Food" }).click();

  await expect(page.getByTestId("meal-builder-item").last()).toContainText("Dollar General Frozen Meal");

  await page.getByRole("button", { name: "Estimate Meal" }).click();

  await expect(page.getByTestId("meal-check-result")).toBeVisible();
  await expect(page.getByTestId("meal-check-result")).toContainText("Meal Builder Estimate");
  await expect(page.getByTestId("meal-check-result")).toContainText("Sweet Tea");
  await expect(page.getByTestId("meal-check-result")).toContainText("Dollar General Frozen Meal");

  await page.getByRole("button", { name: "Save Meal Estimate" }).click();

  await expect(page.getByTestId("nutrition-save-status")).toContainText("Meal estimate saved");
  await expect(page.getByTestId("nutrition-history-panel")).toBeVisible();
});
