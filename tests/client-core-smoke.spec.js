import { expect, test } from "@playwright/test";

test.describe("Client core smoke coverage", () => {
  test("client portal core buttons and windows stay usable", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "HOME" }).first().click();
    await expect(page.getByRole("navigation", { name: /Main navigation/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|Client Training Home|Build Workout Plan|MY PLAN|TODAY'S WORKOUT/i);
    await expect(page.getByRole("button", { name: "Build Workout Plan", exact: true }).first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await expect(page.getByLabel("Client exercise search and substitution guide").first()).toBeVisible();
    await expect(page.getByLabel("Client exercise search and substitution guide").first()).toBeVisible();
    await expect(page.getByText("Walk").first()).toBeVisible();
    await expect(page.getByText("Run").first()).toBeVisible();
    await expect(page.getByText("Stationary Bike").first()).toBeVisible();

    await page.getByRole("button", { name: "Client" }).first().click();
    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();
    await expect(page.getByText(/Walk|Run|Stationary Bike/i).first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Client", exact: true })
      .click();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

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
