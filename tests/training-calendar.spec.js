import { test, expect } from "@playwright/test";

test("coach schedules assigned training events in week and month views", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=coach");
  await page.getByRole("navigation").getByRole("button", { name: "Calendar", exact: true }).click();

  const calendar = page.getByTestId("training-calendar");
  await expect(calendar.getByRole("heading", { name: "Training Calendar" })).toBeVisible();
  await calendar.getByLabel("Event Title").fill("Strength Coaching Session");
  await calendar.getByLabel("Assign Client").selectOption({ index: 1 });
  const target = new Date();
  target.setHours(10, 0, 0, 0);
  const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  target.setHours(11);
  const end = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await calendar.getByLabel("Start Date and Time").fill(local);
  await expect(calendar.getByLabel("End Date and Time")).toHaveValue(end);
  await calendar.getByLabel("Location").fill("Main Gym");
  await calendar.getByRole("button", { name: "Save Event" }).click();

  await expect(calendar.getByText("Strength Coaching Session")).toBeVisible();
  await expect(calendar.getByText("Main Gym")).toBeVisible();
  await calendar.getByRole("button", { name: "month", exact: true }).click();
  await expect(calendar.getByLabel("Month weekdays")).toContainText("Sunday");
  await expect(calendar.getByLabel("Month weekdays")).toContainText("Saturday");
  await expect(calendar.getByText("Strength Coaching Session")).toBeVisible();
});
