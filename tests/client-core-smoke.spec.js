import { expect, test } from "@playwright/test";

test.describe("Client core smoke coverage", () => {
  test("client portal core buttons and windows stay usable", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client overview").first()).toBeVisible();

  await page.getByRole("navigation", { name: /Main navigation/i }).first().getByRole("button", { name: "My Plan", exact: true }).click();
  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await expect(page.getByRole("navigation", { name: /Main navigation/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/NO LIMIT FITNESS|Client Training Home|Workout Plans|MY PLAN|TODAY'S WORKOUT/i);
    const mainNavigation = page.getByRole("navigation", { name: /Main navigation/i }).first();
    await expect(mainNavigation.getByRole("button", { name: "My Plan", exact: true })).toBeVisible();
    await expect(mainNavigation.getByRole("button", { name: "Plans", exact: true })).toHaveCount(0);

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Exercise Library", exact: true })
      .click();

    const exerciseLibrary = page.getByTestId("client-safe-exercise-library");
    await expect(exerciseLibrary).toBeVisible();
    await expect(page.getByTestId("client-safe-exercise-grid")).toBeVisible();
    await expect(page.getByTestId("exercise-card").first()).toBeVisible();
    await expect(page.getByTestId("client-build-edit-plan-flow")).toHaveCount(0);

    await page.getByRole("button", { name: "Client" }).first().click();
    await expect(page.getByLabel("Client overview").first()).toBeVisible();

  await page.getByRole("navigation", { name: /Main navigation/i }).first().getByRole("button", { name: "My Plan", exact: true }).click();
  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "My Plan", exact: true })
      .click();

    await expect(page.getByRole("button", { name: "Build a Plan", exact: true })).toHaveCount(0);

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Client", exact: true })
      .click();

    await expect(page.getByLabel("Client overview").first()).toBeVisible();

  await page.getByRole("navigation", { name: /Main navigation/i }).first().getByRole("button", { name: "My Plan", exact: true }).click();
  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "View Full Plan" }).first().click();
    await expect(page.getByTestId("client-full-assigned-plan").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Nutrition Coach", exact: true })
      .click();

    const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

    await expect(nutritionCoachWindow).toBeVisible();
    await expect(nutritionCoachWindow.getByRole("button", { name: /Build My Target/i })).toBeVisible();
    await expect(nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i })).toBeVisible();
  });

  test("public login gate stays locked before account access", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("NO LIMIT FITNESS").first()).toBeVisible();
    await expect(page.getByLabel("Client overview").first()).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Sign In|Log In|Login/i }).first()).toBeVisible();
  });
});
﻿
test("client dashboard shows nutrition check-in and progress photo summary cards", async ({ page }) => {
  await page.addInitScript(() => {
    const tinyDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

    window.localStorage.setItem(
      "nlf-nutrition-history-v1",
      JSON.stringify({
        targets: [
          {
            id: "target-summary-test",
            goal: "fat-loss",
            goalLabel: "Weight Loss",
            dailyCalories: 2100,
            maintenanceCalories: 2600,
            protein: 200,
            carbs: 190,
            fat: 65,
            savedAt: "Test"
          }
        ],
        meals: [
          {
            id: "meal-summary-test",
            title: "Meal Builder Estimate",
            calories: 950,
            protein: 34,
            carbs: 110,
            fat: 32,
            confidence: "High",
            matches: [
              { id: "item-1", name: "Light Beer", category: "Alcohol", calories: 105 },
              { id: "item-2", name: "Pizza Rolls", category: "Convenience", calories: 220 }
            ]
          }
        ]
      })
    );

    window.localStorage.setItem(
      "nlf-client-weekly-checkins-v1",
      JSON.stringify([
        {
          id: "client-checkin-summary-test",
          checkInDate: "2026-07-11",
          checkInWeight: "198.4",
          waistMeasurement: "34.5",
          adherenceScore: "75",
          workoutsCompleted: "4",
          proteinConsistency: "4",
          hungerScore: "4",
          energyScore: "2",
          sleepScore: "2",
          stressScore: "4",
          digestionScore: "3",
          recoveryScore: "2",
          clientCheckInNotes: "Energy was low this week.",
          frontPhotoNote: "Front photo uploaded.",
          sidePhotoNote: "Side photo uploaded.",
          backPhotoNote: "Back photo uploaded.",
          savedAt: "Test"
        }
      ])
    );

    window.localStorage.setItem(
      "nlf-client-progress-photos-v1",
      JSON.stringify([
        {
          id: "photo-summary-test",
          photoDate: "2026-07-11",
          photoCheckInNotes: "Same lighting.",
          frontPhoto: { name: "front.png", dataUrl: tinyDataUrl },
          sidePhoto: { name: "side.png", dataUrl: tinyDataUrl },
          backPhoto: { name: "back.png", dataUrl: tinyDataUrl },
          frontPhotoNote: "Front view looks tighter.",
          sidePhotoNote: "Side waist looks improved.",
          backPhotoNote: "Back photo uploaded.",
          savedAt: "Test"
        }
      ])
    );
  });

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client overview").first()).toBeVisible();

  await page.getByRole("navigation", { name: /Main navigation/i }).first().getByRole("button", { name: "My Plan", exact: true }).click();
  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  const summaryPanel = page.getByTestId("client-dashboard-checkin-summary").first();

  await expect(summaryPanel).toBeVisible();
  await expect(summaryPanel).toContainText("Nutrition, Check-In, And Photo Summary");
  await expect(page.getByTestId("client-dashboard-target-card").first()).toContainText("2100 cal");
  await expect(page.getByTestId("client-dashboard-meal-card").first()).toContainText("950 cal");
  await expect(page.getByTestId("client-dashboard-checkin-card").first()).toContainText("198.4 lb");
  await expect(page.getByTestId("client-dashboard-photo-card").first()).toContainText("3/3");
  await expect(page.getByTestId("client-dashboard-summary-counts").first()).toContainText("Targets: 1");
  await expect(page.getByTestId("client-dashboard-action-flags").first()).toContainText("Energy is low");
  await expect(page.getByTestId("client-dashboard-action-flags").first()).toContainText("Alcohol appeared");

  await summaryPanel.getByRole("button", { name: "Refresh Summary" }).click();

  await expect(page.getByTestId("client-dashboard-summary-status").first()).toContainText("Dashboard summary refreshed");
});
