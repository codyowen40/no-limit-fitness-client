import { expect, test } from "@playwright/test";

test.describe("Workout Plans", () => {
  test("client navigation uses My Plan and does not expose plan building", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");
    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();
    await expect(nav.getByRole("button", { name: "My Plan", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Workout Plans", exact: true })).toHaveCount(0);
    await nav.getByRole("button", { name: "My Plan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Build a Plan", exact: true })).toHaveCount(0);
  });

  test("coach can choose one through seven training days", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.getByRole("button", { name: "Workout Plans", exact: true }).click();
    const selector = page.getByLabel("Training Days Per Week");
    await expect(selector.locator("option")).toHaveCount(7);
    await selector.selectOption("7");
    await expect(page.getByRole("button", { name: "Day 7", exact: true })).toBeVisible();
    await selector.selectOption("1");
    await expect(page.getByRole("button", { name: "Day 7", exact: true })).toHaveCount(0);
  });

  test("coach plan title remains distinct from exercise search", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.getByRole("button", { name: "Workout Plans", exact: true }).click();
    await expect(page.getByLabel("Plan Name")).toBeVisible();
    await expect(page.getByPlaceholder("Search exercises to add...")).toBeVisible();
    await expect(page.getByLabel("Plan Name")).not.toHaveAttribute("placeholder", /Search exercises/i);
  });
});
