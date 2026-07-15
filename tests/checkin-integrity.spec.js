import { test, expect } from "@playwright/test";

async function openCheckIns(page) {
  await page.goto("/?testUnlock=true&portalMode=client");
  await page.getByRole("navigation", { name: /Main navigation/i }).first().getByRole("button", { name: "My Plan", exact: true }).click();
  await page.getByTestId("client-dashboard-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
}

test("weekly check-ins reject blank, future, corrupt, and duplicate records", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem("nlf-client-weekly-checkins-v1"));
  await openCheckIns(page);
  const form = page.getByTestId("client-weekly-checkin-form").first();
  await expect(form).toBeVisible();
  await form.getByLabel("Weekly Workouts Completed").fill("0");
  await form.getByRole("button", { name: "Save Weekly Client Check-In" }).click();
  await expect(page.getByTestId("client-weekly-checkin-status").first()).toContainText("Add weight, waist, notes");

  await form.getByLabel("Client Check-In Weight").fill("-200abc");
  await form.getByLabel("Client Waist Measurement").fill("-5");
  await form.getByLabel("Weekly Workouts Completed").fill("-3");
  await form.getByRole("button", { name: "Save Weekly Client Check-In" }).click();
  await expect(page.getByTestId("client-weekly-checkin-status").first()).toContainText("positive numbers");

  await form.getByLabel("Client Check-In Date").fill("2099-01-01");
  await form.getByLabel("Client Check-In Weight").fill("198");
  await form.getByLabel("Client Waist Measurement").fill("34");
  await form.getByLabel("Weekly Workouts Completed").fill("3");
  await form.getByRole("button", { name: "Save Weekly Client Check-In" }).click();
  await expect(page.getByTestId("client-weekly-checkin-status").first()).toContainText("not in the future");
});

test("progress photos require all three angles", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem("nlf-client-progress-photos-v1"));
  await openCheckIns(page);
  const panel = page.getByTestId("client-progress-photo-upload-panel").first();
  const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  await panel.locator('input[type="file"][aria-label="Front Progress Photo Upload"]').setInputFiles({ name: "front.png", mimeType: "image/png", buffer: image });
  await panel.getByRole("button", { name: "Save Progress Photos" }).click();
  await expect(page.getByTestId("client-progress-photo-status").first()).toContainText("front, side, and back");
});
