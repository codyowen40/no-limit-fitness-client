import { expect, test } from "@playwright/test";

test.describe("Client core smoke coverage", () => {
  test("client portal core buttons and windows stay usable", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "HOME" }).first().click();
    await expect(page.getByText("CLIENT HOME").first()).toBeVisible();
    await expect(page.getByText("BUILD WORKOUT PLAN").first()).toBeVisible();

    await page.getByRole("button", { name: "Exercises" }).first().click();
    await expect(page.getByLabel("Client exercise search and substitution guide").first()).toBeVisible();
    await expect(page.getByText("Walk").first()).toBeVisible();
    await expect(page.getByText("Run").first()).toBeVisible();
    await expect(page.getByText("Stationary Bike").first()).toBeVisible();

    await page.getByRole("button", { name: "Client" }).first().click();
    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();
    await expect(page.getByText(/Build|Edit|Workout Plan/i).first()).toBeVisible();
    await expect(page.getByText(/Walk|Run|Squat|Press|Row/i).first()).toBeVisible();

    await page.getByRole("button", { name: "View Full Plan" }).first().click();
    await expect(page.getByTestId("client-full-assigned-plan").first()).toBeVisible();

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

  test("public login gate stays locked before account access", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("NO LIMIT FITNESS").first()).toBeVisible();
    await expect(page.getByLabel("Client My Plan dashboard").first()).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Sign In|Log In|Login/i }).first()).toBeVisible();
  });
});
