import { expect, test } from "@playwright/test";

test.describe("Bundle 12W client plan draft persistence", () => {
  test("client can save a workout plan draft and see it on My Plan", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await page.getByTestId("client-plan-draft-title-input").fill("Bundle 12W Strength Draft");
    await page.getByTestId("client-plan-draft-goal-input").fill("Build strength with controlled weekly progression.");
    await page.getByTestId("client-plan-draft-days-select").selectOption("4");

    await page.getByRole("button", { name: "Save Plan Draft" }).click();

    await expect(page.getByText("Workout plan draft saved for coach review.")).toBeVisible();

    const savedDraft = page.getByTestId("client-saved-plan-draft");
    await expect(savedDraft).toBeVisible();
    await expect(savedDraft).toContainText("Bundle 12W Strength Draft");
    await expect(savedDraft).toContainText("Build strength with controlled weekly progression.");
    await expect(savedDraft).toContainText("4 training days per week");
  });

  test("client saved workout plan draft persists after reload", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await page.getByTestId("client-plan-draft-title-input").fill("Reload Safe Draft");
    await page.getByTestId("client-plan-draft-goal-input").fill("Keep the saved draft visible after reload.");
    await page.getByTestId("client-plan-draft-days-select").selectOption("5");

    await page.getByRole("button", { name: "Save Plan Draft" }).click();

    await page.reload();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const savedDraft = page.getByTestId("client-saved-plan-draft");
    await expect(savedDraft).toBeVisible();
    await expect(savedDraft).toContainText("Reload Safe Draft");
    await expect(savedDraft).toContainText("Keep the saved draft visible after reload.");
    await expect(savedDraft).toContainText("5 training days per week");
  });

  test("client can edit an existing saved workout plan draft", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    await page.getByTestId("client-plan-draft-title-input").fill("Original Draft");
    await page.getByTestId("client-plan-draft-goal-input").fill("Original goal.");
    await page.getByTestId("client-plan-draft-days-select").selectOption("3");

    await page.getByRole("button", { name: "Save Plan Draft" }).click();

    await page.getByRole("button", { name: "Edit Saved Draft" }).click();

    await page.getByTestId("client-plan-draft-title-input").fill("Updated Draft");
    await page.getByTestId("client-plan-draft-goal-input").fill("Updated goal after client review.");
    await page.getByTestId("client-plan-draft-days-select").selectOption("2");

    await page.getByRole("button", { name: "Save Plan Draft" }).click();

    const savedDraft = page.getByTestId("client-saved-plan-draft");
    await expect(savedDraft).toContainText("Updated Draft");
    await expect(savedDraft).toContainText("Updated goal after client review.");
    await expect(savedDraft).toContainText("2 training days per week");
  });
});
