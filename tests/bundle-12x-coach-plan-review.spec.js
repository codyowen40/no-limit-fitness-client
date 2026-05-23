import { expect, test } from "@playwright/test";

const draft = {
  title: "Client Review Strength Plan",
  goal: "Build strength, consistency, and conditioning with coach review.",
  days: "4",
  savedAt: "Test run",
};

test.describe("Bundle 12X coach plan review", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.evaluate((draftPayload) => {
      window.localStorage.setItem(
        "no-limit-fitness-client-plan-draft-v1",
        JSON.stringify(draftPayload)
      );

      window.localStorage.setItem(
        "no-limit-fitness-client-plan-draft-review-status-v1",
        JSON.stringify({
          status: "pending",
          message: "Workout plan draft submitted for coach review.",
          updatedAt: "Test run",
        })
      );

      window.localStorage.removeItem("no-limit-fitness-client-approved-plan-v1");
    }, draft);
  });

  test("coach can review and approve a client workout draft", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.getByRole("button", { name: "Plans" }).first().click();

    await expect(page.getByTestId("coach-client-plan-review-queue")).toBeVisible();
    await expect(page.getByTestId("coach-pending-client-plan-draft")).toContainText(
      "Client Review Strength Plan"
    );
    await expect(page.getByTestId("coach-client-plan-review-status")).toContainText(
      "Pending Coach Review"
    );

    await page.getByRole("button", { name: "Approve Draft" }).click();

    await expect(page.getByTestId("coach-client-plan-review-status")).toContainText(
      "Approved by Coach"
    );
    await expect(page.getByText("Client Review Strength Plan - Coach Approved")).toBeVisible();
  });

  test("approved client draft becomes visible as the client assigned plan", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await page.getByRole("button", { name: "Plans" }).first().click();
    await page.getByRole("button", { name: "Approve Draft" }).click();

    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const assignedPlan = page.getByTestId("client-approved-assigned-plan");
    await expect(assignedPlan).toBeVisible();
    await expect(assignedPlan).toContainText("Client Review Strength Plan - Coach Approved");
    await expect(assignedPlan).toContainText("4 training days per week");

    await expect(page.getByTestId("client-approved-assigned-plan-days")).toBeVisible();
    await expect(page.getByTestId("client-plan-draft-review-status").first()).toContainText(
      "Approved by Coach"
    );
  });
});
