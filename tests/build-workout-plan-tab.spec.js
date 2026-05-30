import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan tab", () => {
  test("top tab uses the full working exercise library with one larger search", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await expect(page.getByText("Build or edit your workout plan").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Build a Plan" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Workout Plan" }).first()).toBeVisible();

    await expect(page.getByText("Client-Safe Exercise Library").first()).toBeVisible();
    await expect(page.getByText("General Exercise Database").first()).toBeVisible();

    await expect(page.getByLabel("Client quick home and exercise search")).toHaveCount(0);
    await expect(page.getByText("Exercise Search and Substitution Guide")).toHaveCount(1);
    await expect(page.getByLabel("Search exercises")).toHaveCount(1);

    const guide = page.getByLabel("Client exercise search and substitution guide").first();
    const search = page.getByLabel("Search exercises").first();

    await expect(guide).toBeVisible();
    await expect(search).toBeVisible();

    const searchBox = await search.boundingBox();
    expect(searchBox?.height || 0).toBeGreaterThanOrEqual(56);
    expect(searchBox?.width || 0).toBeGreaterThanOrEqual(250);

    await search.fill("Stationary Bike");
    await expect(page.getByText("Stationary Bike").first()).toBeVisible();

    await search.fill("Back Squat");
    await expect(page.getByText("Back Squat").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();
  });
});
