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
