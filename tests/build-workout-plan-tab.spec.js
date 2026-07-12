import { expect, test } from "@playwright/test";

test.describe("Build Workout Plan tab", () => {
  test("uses one merged full exercise library search", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Workout Plans", exact: true })
      .click();

    await expect(page.getByText("Build or edit your workout plan").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Build a Plan" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Workout Plan" }).first()).toBeVisible();

    await expect(page.locator("main")).toContainText(/Build Workout Plan|Edit Workout Plan|Workout Plan/i);

    await expect(page.getByLabel("Client quick home and exercise search")).toHaveCount(0);

    await expect(page.locator("main")).toContainText(/Build Workout Plan|Edit Workout Plan|Workout Plan/i);

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await expect(page.getByTestId("client-build-edit-plan-flow").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/Save Draft|Save Changes|Save Workout Plan|Submit.*Review|Send.*Coach/i);

    const clientDaySelector = page.getByTestId("client-plan-draft-days-select");
    await expect(clientDaySelector.locator("option")).toHaveCount(7);
    await clientDaySelector.selectOption("1");
    await expect(clientDaySelector).toHaveValue("1");
    await clientDaySelector.selectOption("7");
    await expect(clientDaySelector).toHaveValue("7");
  });

  test("coach can choose one through seven training days", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Workout Plans", exact: true })
      .click();

    const coachDaySelector = page.getByLabel("Training Days Per Week");
    await expect(coachDaySelector.locator("option")).toHaveCount(7);
    await coachDaySelector.selectOption("7");
    await expect(coachDaySelector).toHaveValue("7");
    await expect(page.getByRole("button", { name: "Day 7", exact: true })).toBeVisible();
    await coachDaySelector.selectOption("1");
    await expect(coachDaySelector).toHaveValue("1");
    await expect(page.getByRole("button", { name: "Day 7", exact: true })).toHaveCount(0);
  });
  test("plan title fields are not mislabeled as exercise search", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Workout Plans", exact: true })
      .click();

    await page.getByRole("button", { name: /^Build a Plan$/i }).first().click();

    await expect(page.getByLabel("Plan Name").first()).toBeVisible();
    await expect(page.getByTestId("client-plan-draft-title-input").first()).toBeVisible();

    const mislabeledPlanNameFields = await page
      .getByTestId("client-plan-draft-title-input")
      .evaluateAll((nodes) =>
        nodes.filter(
          (node) =>
            node.getAttribute("aria-label") === "Search exercises" ||
            node.getAttribute("placeholder") === "Search exercises" ||
            node.getAttribute("data-testid") === "exercise-library-search-input"
        ).length
      );

    expect(mislabeledPlanNameFields).toBe(0);

    await expect(page.getByTestId("client-plan-draft-title-input").first()).toHaveAttribute("aria-label", "Plan Name");
  });

});
