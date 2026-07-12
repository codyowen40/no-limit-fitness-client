import { expect, test } from "@playwright/test";

test("coach workout plan library keeps overwrite and Save As actions distinct", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=coach");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("nlf-portal-state-synced", { detail: { payload: {
    clients: [{ id: "client-1", name: "Sample Client", email: "client@example.com", status: "Active", coachingStatus: "active", coachId: "coach-primary" }],
    savedPlans: [{ id: "plan-1", clientId: "client-1", clientName: "Sample Client", planName: "Original Plan", status: "Active", days: [{ id: "day-1", name: "Day 1", exercises: [{ id: "ex-1", exerciseName: "Bird Dog", categories: [] }] }] }],
    workoutLogs: [], conversations: [],
  } } })));
  await page.getByRole("button", { name: "Workout Plans", exact: true }).click();
  await page.getByTestId("coach-workout-plan-library").getByRole("button", { name: "Edit Original" }).evaluate((button) => button.click());
  await expect(page.getByRole("button", { name: "Save Changes", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save As New Plan", exact: true })).toBeVisible();
});
