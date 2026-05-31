import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan tab", () => {
  test("uses one merged full exercise library search", async ({ page }) => {
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

    const visibleInputs = page.locator("input:visible");
    await expect(visibleInputs).toHaveCount(1);

    const search = visibleInputs.first();

    await expect(search).toBeVisible();

    const box = await search.boundingBox();

    expect(box?.height || 0).toBeGreaterThanOrEqual(60);
    expect(box?.width || 0).toBeGreaterThanOrEqual(250);

    await search.fill("Stationary Bike");
    await expect(page.getByText("Stationary Bike").first()).toBeVisible();

    await search.fill("Back Squat");
    await expect(page.getByText("Back Squat").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft/i }).first()).toBeVisible();
  });
});
