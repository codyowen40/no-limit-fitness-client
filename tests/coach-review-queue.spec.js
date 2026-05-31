import { expect, test } from "@playwright/test";

test.describe("Coach review queue", () => {
  test("coach can see and approve a client workout draft", async ({ page }) => {
    const draftTitle = "Coach Review Strength Draft";

    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();

    const firstField = builder.locator("input:visible, textarea:visible").first();

    await expect(firstField).toBeVisible();

    await firstField.fill(draftTitle);

    const textAreas = builder.locator("textarea:visible");
    const textAreaCount = await textAreas.count();

    if (textAreaCount > 0) {
      await textAreas.last().fill("Day 1 - Back Squat, Bench Press, Row. Coach review required before assignment.");
    }

    await page.getByRole("button", { name: /Save Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(draftTitle);

    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Plans" })
      .click();

    await expect(page.getByTestId("coach-client-plan-review-queue").first()).toBeVisible();
    await expect(page.getByTestId("coach-pending-client-plan-draft").first()).toContainText(draftTitle);

    await page.getByRole("button", { name: /Approve Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(/approved|assigned|active plan/i);
    await expect(page.locator("body")).toContainText(draftTitle);
  });

  test("approved client draft becomes visible as the client assigned plan", async ({ page }) => {
    const draftTitle = "Approved Client Assigned Draft";

    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();

    const firstField = builder.locator("input:visible, textarea:visible").first();

    await expect(firstField).toBeVisible();

    await firstField.fill(draftTitle);

    const textAreas = builder.locator("textarea:visible");
    const textAreaCount = await textAreas.count();

    if (textAreaCount > 0) {
      await textAreas.last().fill("Day 1 - Squat, Bench, Deadlift assistance. Approved plan should show in client view.");
    }

    await page.getByRole("button", { name: /Save Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(draftTitle);

    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Plans" })
      .click();

    await expect(page.getByTestId("coach-client-plan-review-queue").first()).toBeVisible();
    await expect(page.getByTestId("coach-pending-client-plan-draft").first()).toContainText(draftTitle);

    await page.getByRole("button", { name: /Approve Draft/i }).first().click();

    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "View Full Plan" }).first().click();

    await expect(page.getByTestId("client-full-assigned-plan").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(draftTitle);
  });
});
