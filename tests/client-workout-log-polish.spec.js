import { expect, test } from "@playwright/test";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

const testClient = {
  id: "client-workout-polish",
  name: "Workout Polish Client",
  email: "workout-polish@example.com",
  status: "Active",
};

const testPlan = {
  id: "plan-workout-polish",
  planName: "Workout Polish Plan",
  clientId: testClient.id,
  clientName: testClient.name,
  createdAt: "Test seed",
  timestamp: 1710000000000,
  days: [
    {
      id: "day-workout-polish",
      name: "Day 1 - Strength",
      exercises: [
        {
          id: "exercise-workout-polish",
          exerciseId: "Back Squat",
          exerciseName: "Back Squat",
          sets: "3",
          repsOrTime: "8",
          weightGuidance: "RPE 7",
          rest: "90 sec",
          notes: "Move with control.",
        },
      ],
    },
    {
      id: "day-rest-polish",
      name: "Day 2 - Recovery",
      exercises: [],
    },
    {
      id: "day-conditioning-polish",
      name: "Day 3 - Conditioning",
      exercises: [
        {
          id: "exercise-conditioning-polish",
          exerciseId: "Walk",
          exerciseName: "Walk",
          sets: "1",
          repsOrTime: "20 min",
          weightGuidance: "Easy pace",
          rest: "As needed",
          notes: "Stay conversational.",
        },
      ],
    },
  ],
};

const existingLog = {
  id: "workout-log-polish-existing",
  clientId: testClient.id,
  clientName: testClient.name,
  planId: testPlan.id,
  planName: testPlan.planName,
  dayId: "day-workout-polish",
  dayName: "Day 1 - Strength",
  status: "completed",
  skipReason: "",
  workoutDate: "2026-07-10",
  workoutDateLabel: "July 10, 2026",
  submittedAt: "July 10, 2026",
  timestamp: 1710000001000,
  entries: [],
};

const seededState = {
  clients: [testClient],
  savedPlans: [testPlan],
  workoutLogs: [existingLog],
  conversations: [{ clientId: testClient.id, clientName: testClient.name, messages: [] }],
  readActivityIds: [],
  notificationPreferences: {},
  serverSettings: {},
};

test.describe("Client workout log polish", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ storageKey, portalModeKey, testUnlockKey, state }) => {
        window.localStorage.clear();
        window.localStorage.setItem(testUnlockKey, "true");
        window.localStorage.setItem(portalModeKey, "client");
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      },
      {
        storageKey: STORAGE_KEY,
        portalModeKey: PORTAL_MODE_KEY,
        testUnlockKey: TEST_UNLOCK_KEY,
        state: seededState,
      }
    );
    await page.goto("/?testUnlock=true&portalMode=client");
    await page
      .getByRole("navigation", { name: /Mobile navigation/i })
      .getByRole("button", { name: /^Log$/i })
      .click();
  });

  test("puts the active workout before history and keeps client history read-only", async ({ page }) => {
    await expect(page.getByTestId("active-workout-form")).toBeVisible();
    await expect(page.getByTestId("recent-workout-logs")).toBeVisible();
    await expect(page.getByLabel("Client", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Delete Workout Log/i })).toHaveCount(0);

    const order = await page.evaluate(() => {
      const active = document.querySelector('[data-testid="active-workout-form"]');
      const history = document.querySelector('[data-testid="recent-workout-logs"]');
      return active && history
        ? active.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0;
    });

    expect(order).toBeTruthy();
  });

  test("validates meaningful completion details and clears the saved draft", async ({ page }) => {
    await page.getByRole("button", { name: "Save Completed Workout", exact: true }).click();
    await expect(page.getByText("Enter at least one completed result or note before saving this workout.")).toBeVisible();

    const setsCompleted = page.getByLabel("Sets Completed").first();
    const repsCompleted = page.getByLabel("Reps Completed").first();
    await setsCompleted.fill("3");
    await repsCompleted.fill("8, 8, 8");
    await page.getByRole("button", { name: "Save Completed Workout", exact: true }).click();

    await expect(page.getByText(/marked complete|portals are synchronized/i)).toBeVisible();
    await expect(setsCompleted).toHaveValue("");
    await expect(repsCompleted).toHaveValue("");
  });

  test("requires a reason before logging a skipped workout", async ({ page }) => {
    await page.getByRole("button", { name: "Log Selected Day as Skipped", exact: true }).click();
    await expect(page.getByText("Add a skip reason before logging this workout as skipped.")).toBeVisible();
  });

  test("logs days out of order and can skip a day with no exercises", async ({ page }) => {
    const dayPicker = page.getByTestId("training-day-picker");

    await dayPicker.getByRole("button", { name: /Day 3 - Conditioning/ }).click();
    await expect(page.getByTestId("active-workout-form")).toContainText("Day 3 - Conditioning");
    await page.getByLabel("Sets Completed").fill("1");
    await page.getByRole("button", { name: "Save Completed Workout", exact: true }).click();
    await expect(dayPicker.getByRole("button", { name: /Day 3 - Conditioning/ })).toContainText("completed");

    await dayPicker.getByRole("button", { name: /Day 2 - Recovery/ }).click();
    await expect(page.getByRole("button", { name: "Save Completed Workout", exact: true })).toHaveCount(0);
    await page.getByLabel("Skip Reason").fill("Recovery day intentionally skipped.");
    await page.getByRole("button", { name: "Log Selected Day as Skipped", exact: true }).click();
    await expect(dayPicker.getByRole("button", { name: /Day 2 - Recovery/ })).toContainText("skipped");

    await dayPicker.getByRole("button", { name: /Day 1 - Strength/ }).click();
    await expect(page.getByTestId("active-workout-form")).toContainText("Day 1 - Strength");
  });
  test("places save actions after the workout inputs", async ({ page }) => {
    const order = await page.evaluate(() => {
      const actions = document.querySelector('[data-testid="workout-submit-actions"]');
      const notes = Array.from(document.querySelectorAll("textarea")).find((field) => field.labels?.[0]?.textContent?.includes("Client Notes"));
      return notes && actions ? Boolean(notes.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
    });
    expect(order).toBe(true);
  });
  test("collapses and restores sticky workout actions", async ({ page }) => {
    const actions = page.getByTestId("workout-submit-actions");
    await actions.getByRole("button", { name: "Collapse workout actions" }).click();
    await expect(actions).toHaveAttribute("data-collapsed", "true");
    await expect(actions.getByRole("button", { name: "Save Completed Workout" })).toHaveCount(0);
    await actions.getByRole("button", { name: "Expand workout actions" }).click();
    await expect(actions.getByRole("button", { name: "Save Completed Workout" })).toBeVisible();
  });
});
