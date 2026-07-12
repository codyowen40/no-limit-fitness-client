import { expect, test } from "@playwright/test";

test("client My Plan shows only coach-assigned plans and no client-side builder", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("nlf-portal-state-synced", { detail: { payload: {
    clients: [{ id: "client-1", name: "Sample Client", email: "client@example.com", status: "Active", coachingStatus: "active", coachId: "coach-primary" }],
    savedPlans: [{ id: "assigned-plan", clientId: "client-1", clientName: "Sample Client", planName: "Coach Assigned Plan", status: "Active", days: [{ id: "day-1", name: "Day 1", exercises: [{ id: "ex-1", exerciseName: "Bird Dog" }] }] }],
    workoutLogs: [], conversations: [],
  } } })));
  await page.getByRole("button", { name: "My Plan", exact: true }).click();
  await expect(page.getByLabel("Assigned Workout Plan")).toHaveValue("assigned-plan");
  await expect(page.getByLabel("Assigned Workout Plan").getByRole("option", { name: "Coach Assigned Plan" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Build a Plan", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit Workout Plan", exact: true })).toHaveCount(0);
});
