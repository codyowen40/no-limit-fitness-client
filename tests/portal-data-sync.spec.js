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

  test("client overview excludes coach administration and libraries paginate by role", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");
    const overview = page.getByLabel("Client overview");
    await expect(overview).toBeVisible();
    await expect(overview).not.toContainText("Client Profiles");
    await expect(overview).not.toContainText("Clear Local Data");
    await page.getByRole("button", { name: "Exercise Library", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Client-Safe Exercise Library" })).toBeVisible();
    await expect(page.getByTestId("exercise-card")).toHaveCount(24);

    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.getByRole("button", { name: "Exercise Library", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Coach Exercise Library" })).toBeVisible();
    await expect(page.getByTestId("exercise-card")).toHaveCount(24);
    await expect(page.getByRole("button", { name: "Show More Exercises", exact: true })).toBeVisible();
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

  test("Caleb's login stays blank instead of falling back to Louise's plan", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await page.evaluate(() => {
      window.localStorage.setItem("nlf-public-account-profile-v1", JSON.stringify({
        id: "caleb-auth-profile",
        clientId: "caleb",
        name: "Caleb",
        email: "caleb@example.com",
        role: "client",
      }));
      window.dispatchEvent(
        new CustomEvent("nlf-portal-state-synced", {
          detail: {
            payload: {
              clients: [
                { id: "louise", profileId: "louise-auth-profile", name: "Louise B", email: "louise@example.com", status: "Active", coachingStatus: "active" },
                { id: "caleb", profileId: "caleb-auth-profile", name: "Caleb", email: "caleb@example.com", status: "Active", coachingStatus: "active" },
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

    await expect(page.getByText("Caleb’s Dashboard", { exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Louise B – 7 Day Strength, Cardio & Confidence Plan");
    await expect(page.getByText("No workout plan assigned", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "My Plan", exact: true }).click();
    await expect(page.getByLabel("Client My Plan dashboard")).toContainText("No assigned workout plan is available yet.");
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
        savedPlans: [
          { id: "seven-day-plan", clientId: "louise", clientName: "Louise Boquet", planName: "Seven Day Plan", status: "Active", days },
          { id: "unassigned-plan", clientId: "louise", clientName: "Louise Boquet", planName: "Hidden Unassigned Plan", status: "Unassigned", days },
        ],
        workoutLogs: [], conversations: [],
      } } }));
    });

    await page.getByRole("button", { name: "My Plan", exact: true }).click();
    await expect(page.getByText("1. Brisk Walk", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Home", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Assigned Workout Plan")).toHaveValue("seven-day-plan");
    await expect(page.getByLabel("Assigned Workout Plan").getByRole("option", { name: "Hidden Unassigned Plan" })).toHaveCount(0);
    await page.getByRole("button", { name: "View Full Plan", exact: true }).click();
    const fullPlan = page.getByTestId("client-full-assigned-plan");
    for (let day = 1; day <= 7; day += 1) {
      await expect(fullPlan.getByRole("tab", { name: `Day ${day}`, exact: true })).toBeVisible();
    }
    await fullPlan.getByRole("tab", { name: "Day 7", exact: true }).click();
    await expect(page.getByTestId("selected-client-plan-day")).toContainText("Bird Dog");
    const todayWorkout = page.getByText("Today's Workout", { exact: true }).locator("..");
    await expect(todayWorkout).toContainText("Day 7");
    await expect(todayWorkout).toContainText("Bird Dog");
  });

  test("coach plan library can assign, unassign, edit, and mirror deletion to the client", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("nlf-portal-state-synced", { detail: { payload: {
      clients: [
        { id: "louise", name: "Louise Boquet", email: "louise@example.com", status: "Active", coachingStatus: "active", coachId: "coach-primary" },
        { id: "caleb", name: "Caleb", email: "caleb@example.com", status: "Active", coachingStatus: "active", coachId: "coach-primary" },
      ],
      savedPlans: [{ id: "editable-plan", clientId: "louise", clientName: "Louise Boquet", planName: "Editable Plan", status: "Active", days: [{ id: "day-1", name: "Day 1", exercises: [{ id: "exercise-1", exerciseName: "Bird Dog", sets: "3", repsOrTime: "10" }] }] }],
      workoutLogs: [], conversations: [],
    } } })));
    await page.getByRole("button", { name: "Workout Plans", exact: true }).click();
    const library = page.getByTestId("coach-workout-plan-library");
    await expect(library.getByLabel("Workout Plan")).toHaveValue("");
    await expect(library.getByLabel("Workout Plan").getByRole("option", { name: "None Assigned", exact: true })).toHaveCount(1);
    await expect(library.getByLabel("Client to Assign").getByRole("option", { name: /None Assigned/i })).toHaveCount(0);
    await expect(library.getByTestId("plan-assignment-status")).toContainText("No plan selected");
    await library.getByLabel("Workout Plan").selectOption("editable-plan");
    await library.getByRole("button", { name: "Edit Original", exact: true }).click({ force: true });
    await expect(page.getByText("Editing Existing Plan", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save As New Plan", exact: true })).toBeVisible();
    await library.getByRole("button", { name: "Unassign Plan", exact: true }).click();
    await expect(library.getByTestId("plan-assignment-status")).toContainText("Unassigned");
    await library.getByLabel("Client to Assign").selectOption("caleb");
    await library.getByRole("button", { name: "Save Assignment", exact: true }).click();
    await expect(library.getByTestId("plan-assignment-status")).toContainText("Caleb");
    await page.getByRole("button", { name: "Delete Plan", exact: true }).click();
    await expect(page.getByText("Editable Plan", { exact: true })).toHaveCount(0);

    await page.evaluate(() => window.localStorage.setItem("nlf-public-account-profile-v1", JSON.stringify({
      id: "caleb-profile",
      clientId: "caleb",
      name: "Caleb",
      email: "caleb@example.com",
      role: "client",
    })));
    await page.goto("/?testUnlock=true&portalMode=client");
    await page.getByRole("button", { name: "My Plan", exact: true }).click();
    await expect(page.getByLabel("Client My Plan dashboard")).toContainText("No assigned workout plan is available yet.");
    await expect(page.locator("main")).not.toContainText("Editable Plan");
  });
});
