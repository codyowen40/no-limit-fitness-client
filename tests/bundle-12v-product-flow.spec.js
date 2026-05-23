import { expect, test } from "@playwright/test";

test.describe("Bundle 12V product flow", () => {
  test("client can open Build/Edit Plan flow from My Plan", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByLabel("Client build edit workout plan flow")).toBeVisible();
    await expect(page.getByTestId("client-plan-draft-preview")).toBeVisible();

    await page.getByRole("button", { name: "Save Plan Draft" }).click();

    await expect(page.getByText("Workout plan draft saved for coach review.")).toBeVisible();
  });

  test("Nutrition Coach top tab opens nutrition tools", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.getByRole("button", { name: "Nutrition Coach" }).first().click();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();
    await expect(page.getByLabel("Client nutrition and macros guide").first()).toBeVisible();
  });

  test("cardio exercises are available in exercise search", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.getByRole("button", { name: "Exercises" }).first().click();

    for (const exercise of ["Walk", "Run", "Stair Master", "Elliptical", "Stationary Bike"]) {
      await page.getByPlaceholder(/search/i).first().fill(exercise);
      await expect(page.getByText(exercise).first()).toBeVisible();
    }
  });

  test("mobile Home button is available from bottom navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?testUnlock=true");

    await expect(page.getByRole("button", { name: "Home" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Home" }).first().click();

    await expect(page.getByText("Build Workout Plan").first()).toBeVisible();
  });

  test("public sign up opens the locked client portal", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Client Login").first()).toBeVisible();

    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.getByLabel("Name").fill("Bundle 12V Client");
    await page.getByLabel("Email").fill("bundle12v@example.com");
    await page.getByLabel("Password").fill("Password123!");

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();
  });
});
