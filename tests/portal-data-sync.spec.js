import { expect, test } from "@playwright/test";

test.describe("Portal data synchronization", () => {
  test("applies shared data updates in place without reloading the document", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.getByRole("button", { name: "Clients", exact: true }).click();

    await page.evaluate(() => {
      window.__portalSyncDocumentMarker = "same-document";
      window.dispatchEvent(
        new CustomEvent("nlf-portal-state-synced", {
          detail: {
            payload: {
              clients: [
                {
                  id: "mirrored-client",
                  name: "Mirrored Client",
                  email: "mirrored@example.com",
                  status: "Active",
                  coachingStatus: "active",
                  coachId: "coach-primary",
                },
              ],
              savedPlans: [],
              workoutLogs: [],
              conversations: [
                { clientId: "mirrored-client", clientName: "Mirrored Client", messages: [] },
              ],
            },
          },
        })
      );
    });

    await expect(page.getByText("Mirrored Client", { exact: true }).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__portalSyncDocumentMarker)).toBe("same-document");
  });

  test("client and coach portals render one correctly branded application shell", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");
    await expect(page.getByRole("navigation", { name: /Main navigation/i })).toHaveCount(1);
    await expect(page.getByText("Client Portal", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("client-workout-plans-hub")).toHaveCount(0);

    await page.goto("/?testUnlock=true&portalMode=coach");
    await expect(page.getByRole("navigation", { name: /Main navigation/i })).toHaveCount(1);
    await expect(page.getByText("Coach Portal", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Client My Plan dashboard")).toHaveCount(0);
  });

  test("exercise library includes required client substitutions", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");
    await page.getByRole("button", { name: "Exercise Library", exact: true }).click();

    for (const exerciseName of [
      "Bird Dog",
      "Side-Lying Clamshell",
      "Standing Hip Abduction",
      "One-Arm Household-Item Row",
      "One-Arm Dumbbell Row",
      "Close-Grip Cable Row",
    ]) {
      await page.getByPlaceholder(/Search exercises/i).fill(exerciseName);
      await expect(page.getByText(exerciseName, { exact: true }).first()).toBeVisible();
    }
  });

  test("client dashboard never falls back to another client's plan", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("nlf-portal-state-synced", {
          detail: {
            payload: {
              clients: [
                { id: "kristen", name: "Kristen Gryzik", email: "kristen@example.com", status: "Active", coachingStatus: "active" },
              ],
              savedPlans: [
                {
                  id: "louise-plan",
                  clientId: "louise",
                  clientName: "Louise B",
                  planName: "Louise B – 7 Day Strength, Cardio & Confidence Plan",
                  days: [{ id: "louise-day", name: "Day 1", exercises: [] }],
                },
              ],
              workoutLogs: [],
              conversations: [],
            },
          },
        })
      );
    });

    await expect(page.getByText("Kristen Gryzik's Training", { exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Louise B – 7 Day Strength, Cardio & Confidence Plan");
    await expect(page.getByText("No assigned plan found yet.", { exact: true })).toBeVisible();
  });

  test("client full plan exposes all seven clickable days and saved exercise names", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");
    await page.evaluate(() => {
      const days = Array.from({ length: 7 }, (_, index) => ({
        id: `day-${index + 1}`,
        name: `Day ${index + 1}`,
        exercises: [{ id: `exercise-${index + 1}`, exerciseName: index === 0 ? "Brisk Walk" : "Bird Dog", sets: "3", repsOrTime: "10 reps" }],
      }));
      window.dispatchEvent(new CustomEvent("nlf-portal-state-synced", { detail: { payload: {
        clients: [{ id: "louise", name: "Louise Boquet", email: "louise@example.com", status: "Active", coachingStatus: "active" }],
        savedPlans: [{ id: "seven-day-plan", clientId: "louise", clientName: "Louise Boquet", planName: "Seven Day Plan", days }],
        workoutLogs: [], conversations: [],
      } } }));
    });

    await expect(page.getByText("1. Brisk Walk", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "View Full Plan", exact: true }).click();
    const fullPlan = page.getByTestId("client-full-assigned-plan");
    for (let day = 1; day <= 7; day += 1) {
      await expect(fullPlan.getByRole("tab", { name: `Day ${day}`, exact: true })).toBeVisible();
    }
    await fullPlan.getByRole("tab", { name: "Day 7", exact: true }).click();
    await expect(page.getByTestId("selected-client-plan-day")).toContainText("Bird Dog");
  });
});
