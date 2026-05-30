import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan tab", () => {
  test("top tab opens one merged builder and working exercise search workspace", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    const guide = page.getByLabel("Client exercise search and substitution guide").first();
    await expect(guide).toBeVisible();

    await expect(page.getByLabel("Client quick home and exercise search")).toHaveCount(0);

    const search = guide.getByPlaceholder(/search/i).first();
    await expect(search).toBeVisible();

    const searchBox = await search.boundingBox();
    expect(searchBox?.height || 0).toBeGreaterThanOrEqual(56);

    await search.fill("Walk");
    await expect(guide.getByText("Walk").first()).toBeVisible();

    await search.fill("Stationary Bike");
    await expect(guide.getByText("Stationary Bike").first()).toBeVisible();
    await expect(guide.getByText("Walk")).toHaveCount(0);

    await search.fill("zzzzzz");
    await expect(guide.getByText("No matching exercises found.").first()).toBeVisible();

    await search.fill("");

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();
  });
});
