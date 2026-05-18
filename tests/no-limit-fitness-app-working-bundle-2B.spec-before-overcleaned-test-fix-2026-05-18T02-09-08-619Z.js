import { test, expect } from "@playwright/test";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";

test.describe("No Limit Fitness full app test", () => {
  test("checks Bundle 2B features with expanded library, skip reason, and delete workout log", async ({
    page,
  }) => {
    test.setTimeout(90000);

    const testClientName = "Bundle 2B Test Client";
    const testClientEmail = "bundle2b@nolimittest.com";
    const testPlanName = "Bundle 2B Strength Plan";
    const clientWorkoutNotes =
      "Bundle 2B client note: form stayed controlled and knee felt good.";
    const skipReason = "Bundle 2B skipped workout because of schedule conflict.";
    const coachMessage = "Bundle 2B coach message test.";
    const clientMessage = "Bundle 2B client message test.";

    await page.goto("/");

    await page.evaluate((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, STORAGE_KEY);

    await page.reload();

    const nav = page.getByRole("navigation");

    await expect(
      page.getByRole("heading", { name: "No Limit Fitness" })
    ).toBeVisible();

    await test.step("Home page loads", async () => {
      await expect(
        page.getByRole("heading", {
          name: /Coach-to-client workout tracking system/i,
        })
      ).toBeVisible();

      await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();

      await expect(
        nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
      ).toBeVisible();

      await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
      await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();
    });

    await test.step("Create a test client", async () => {
      await nav.getByRole("button", { name: /^Clients$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Client Management" })
      ).toBeVisible();

      await page.getByLabel("Client Name").fill(testClientName);
      await page.getByLabel("Client Email").fill(testClientEmail);

      await page.getByRole("button", { name: /Add Client/i }).click();

      await expect(page.getByText(testClientName).first()).toBeVisible();
      await expect(page.getByText(testClientEmail).first()).toBeVisible();
    });

    await test.step("Bundle 2A client status still works", async () => {
      await page
        .getByRole("combobox", { name: "Client Status", exact: true })
        .selectOption("Paused");

      await expect(page.getByText(/status updated to Paused/i)).toBeVisible();

      await page
        .getByRole("combobox", { name: "Client Status", exact: true })
        .selectOption("Active");

      await expect(page.getByText(/status updated to Active/i)).toBeVisible();
    });

    await test.step("Expanded Exercise Library works", async () => {
      await nav.getByRole("button", { name: /^Exercises$/ }).click();

      await expect(
        page.getByRole("heading", { name: "General Exercise Database" })
      ).toBeVisible();

      await expect(page.getByText(/Total library:/i)).toBeVisible();

      const librarySearch = page.getByPlaceholder(
        /Search by exercise, muscle.*equipment/i
      );

      await librarySearch.fill("Back Squat");

      await expect(
        page.getByRole("heading", { name: "Back Squat" })
      ).toBeVisible();

      await expect(
        page.getByText("Quads, glutes, hamstrings, core, upper back")
      ).toBeVisible();

      await librarySearch.fill("Atlas Stone Load");

      await expect(
        page.getByRole("heading", { name: "Atlas Stone Load" })
      ).toBeVisible();

      await librarySearch.fill("");

      await expect(page.getByLabel("Sets")).toHaveCount(0);
      await expect(page.getByLabel("Reps or Time")).toHaveCount(0);
      await expect(page.getByLabel("Weight Guidance")).toHaveCount(0);
      await expect(page.getByLabel("Rest Period")).toHaveCount(0);
      await expect(page.getByLabel("Actual Weight Used")).toHaveCount(0);
    });

    await test.step("Build and save a workout plan", async () => {
      await nav.getByRole("button", { name: /^Plans$/ }).click();

      await expect(
        page.getByText("Workout Plan Builder", { exact: true })
      ).toBeVisible();

      await page.getByLabel("Plan Name").fill(testPlanName);

      await page
        .getByRole("combobox", { name: "Select Client", exact: true })
        .selectOption({ label: testClientName });

      await page.getByPlaceholder("Search exercises to add...").fill("Back Squat");

      await expect(
        page.getByRole("heading", { name: "Back Squat" })
      ).toBeVisible();

      await page.getByRole("button", { name: /^Add$/ }).first().click();

      await expect(page.getByText(/Back Squat added/i)).toBeVisible();

      await page.getByLabel("Sets").fill("4");
      await page.getByLabel("Reps or Time").fill("6 - 8");
      await page.getByLabel("Weight Guidance").fill("RPE 7 - 8");
      await page.getByLabel("Rest Period").fill("90 - 120 sec");

      await page
        .getByLabel("Coach Notes")
        .fill("Control the descent. Drive through the floor.");

      await page.getByRole("button", { name: /Save Plan Locally/i }).click();

      await expect(
        page.getByText(/Plan saved locally and assigned to the selected client/i)
      ).toBeVisible();

      await expect(page.getByText(testPlanName).first()).toBeVisible();
      await expect(page.getByText(`Client: ${testClientName}`).first()).toBeVisible();
    });

    await test.step("Track a completed workout", async () => {
      await nav.getByRole("button", { name: /^Tracker$/ }).click();

      await expect(
        page.getByText("Client Workout Tracker", { exact: true })
      ).toBeVisible();

      await page
        .getByRole("combobox", { name: "Client", exact: true })
        .selectOption({ label: testClientName });

      await page
        .getByRole("combobox", { name: "Assigned Plan", exact: true })
        .selectOption({ label: testPlanName });

      await expect(
        page.getByRole("heading", { name: "Back Squat" })
      ).toBeVisible();

      await page.getByLabel("Actual Weight Used").fill("225 lb");
      await page.getByLabel("Sets Completed").fill("4");
      await page.getByLabel("Reps Completed").fill("8, 8, 7, 6");
      await page.getByLabel("Time Completed").fill("N/A");
      await page.getByLabel("Actual Rest Used").fill("120 sec");
      await page.getByLabel("Exercise Substitution").fill("Goblet Squat");
      await page.getByLabel("Client Notes").fill(clientWorkoutNotes);

      await page.getByRole("button", { name: /Mark Complete/i }).click();

      await expect(page.getByText(/marked complete/i)).toBeVisible();
      await expect(page.getByText(clientWorkoutNotes).first()).toBeVisible();
    });

    await test.step("Bundle 2B skipped workout reason saves", async () => {
      await page.getByLabel(/Skip Reason/i).fill(skipReason);

      await page.getByRole("button", { name: /Mark Skipped/i }).click();

      await expect(page.getByText(/marked skipped/i)).toBeVisible();
      await expect(page.getByText(skipReason).first()).toBeVisible();
      await expect(page.getByText(/Skip Reason:/i).first()).toBeVisible();
    });

    await test.step("Messages tab still works", async () => {
      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();

      await page
        .getByRole("button", { name: new RegExp(testClientName) })
        .click();

      await expect(
        page.getByRole("heading", { name: "Coach/Client Messaging" })
      ).toBeVisible();

      await page
        .getByRole("combobox", { name: "Send As", exact: true })
        .selectOption("Coach");

      await page.getByLabel("Message").fill(coachMessage);
      await page.getByRole("button", { name: /Send Message/i }).click();

      await expect(page.getByText(coachMessage).first()).toBeVisible();

      await page
        .getByRole("combobox", { name: "Send As", exact: true })
        .selectOption("Client");

      await page.getByLabel("Message").fill(clientMessage);
      await page.getByRole("button", { name: /Send Message/i }).click();

      await expect(page.getByText(clientMessage).first()).toBeVisible();
      await expect(page.getByText(/Unread Coach/i).first()).toBeVisible();

      await page.getByRole("button", { name: /Mark Coach Read/i }).click();

      await expect(
        page.getByText(/Coach unread messages marked as read/i)
      ).toBeVisible();
    });

    await test.step("LocalStorage refresh keeps data", async () => {
      await page.reload();

      await expect(
        page.getByRole("heading", { name: "No Limit Fitness" })
      ).toBeVisible();

      await nav.getByRole("button", { name: /^Clients$/ }).click();
      await expect(page.getByText(testClientName).first()).toBeVisible();

      await nav.getByRole("button", { name: /^Plans$/ }).click();
      await expect(page.getByText(testPlanName).first()).toBeVisible();

      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();

      await page
        .getByRole("button", { name: new RegExp(testClientName) })
        .click();

      await expect(page.getByText(coachMessage).first()).toBeVisible();
      await expect(page.getByText(clientMessage).first()).toBeVisible();

      await nav.getByRole("button", { name: /^Tracker$/ }).click();

      await page
        .getByRole("combobox", { name: "Client", exact: true })
        .selectOption({ label: testClientName });

      await page
        .getByRole("combobox", { name: "Assigned Plan", exact: true })
        .selectOption({ label: testPlanName });

      await expect(page.getByText(skipReason).first()).toBeVisible();
    });

    await test.step("Coach dashboard shows Activity Center and workout log details", async () => {
      await nav.getByRole("button", { name: /^Coach$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Command Center" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Activity Center" })
      ).toBeVisible();

      await expect(page.getByText("Client completed workout").first()).toBeVisible();
      await expect(page.getByText("Client skipped workout").first()).toBeVisible();
      await expect(page.getByText(skipReason).first()).toBeVisible();
      await expect(page.getByText("Client changed workout values").first()).toBeVisible();

      await expect(
        page.getByText("Client changed assigned exercise").first()
      ).toBeVisible();

      await expect(page.getByText("Client left workout note").first()).toBeVisible();
      await expect(page.getByText("Coach assigned new plan").first()).toBeVisible();
      await expect(page.getByText("Coach sent message").first()).toBeVisible();
      await expect(page.getByText("Client sent message").first()).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Workout Log Detail View" })
      ).toBeVisible();

      await expect(page.getByText(testClientName).first()).toBeVisible();
      await expect(page.getByText(testPlanName).first()).toBeVisible();
      await expect(page.getByText("Back Squat").first()).toBeVisible();
      await expect(page.getByText("225 lb").first()).toBeVisible();
      await expect(page.getByText("8, 8, 7, 6").first()).toBeVisible();
      await expect(page.getByText("Goblet Squat").first()).toBeVisible();
      await expect(page.getByText(clientWorkoutNotes).first()).toBeVisible();
    });

    await test.step("Activity Center filters and read status work", async () => {
      const activityCenter = page
        .getByRole("heading", { name: "Activity Center" })
        .locator("xpath=ancestor::div[contains(@class, 'rounded-')][1]");

      await activityCenter.getByRole("button", { name: /^Unread$/ }).click();

      await expect(page.getByText("Client completed workout").first()).toBeVisible();
      await expect(page.getByText("Client skipped workout").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Workouts$/ }).click();

      await expect(page.getByText("Client completed workout").first()).toBeVisible();
      await expect(page.getByText("Client skipped workout").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Substitutions$/ }).click();

      await expect(
        page.getByText("Client changed assigned exercise").first()
      ).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Notes$/ }).click();

      await expect(page.getByText("Client left workout note").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Plans$/ }).click();

      await expect(page.getByText("Coach assigned new plan").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Messages$/ }).click();

      await expect(page.getByText("Coach sent message").first()).toBeVisible();
      await expect(page.getByText("Client sent message").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Unread$/ }).click();

      const readButtonCountBefore = await activityCenter
        .getByRole("button", { name: /^Read$/ })
        .count();

      expect(readButtonCountBefore).toBeGreaterThan(0);

      await activityCenter.getByRole("button", { name: /^Read$/ }).first().click();

      await expect(
        activityCenter.getByRole("button", { name: /^Read$/ })
      ).toHaveCount(readButtonCountBefore - 1);

      await activityCenter.getByRole("button", { name: /Mark All Read/i }).click();

      await expect(
        activityCenter.getByRole("button", { name: /^Read$/ })
      ).toHaveCount(0);

      await expect(
        activityCenter.getByText("No activity matches this filter.")
      ).toBeVisible();
    });

    await test.step("Client profile blocks unsafe delete", async () => {
      await nav.getByRole("button", { name: /^Clients$/ }).click();

      await page
        .getByRole("button", {
          name: new RegExp(`${testClientName}.*${testClientEmail}`, "s"),
        })
        .click();

      await expect(
        page.getByRole("heading", { name: testClientName })
      ).toBeVisible();

      await expect(page.getByText(testPlanName).first()).toBeVisible();
      await expect(page.getByText(skipReason).first()).toBeVisible();
      await expect(page.getByText(clientMessage).first()).toBeVisible();

      await page.getByRole("button", { name: /Safe Delete Client/i }).click();

      await expect(page.getByText(/Safe delete blocked/i)).toBeVisible();
    });

    await test.step("Progress page shows workout log details", async () => {
      await nav.getByRole("button", { name: /^Progress$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Tracking Comes Next" })
      ).toBeVisible();

      await expect(page.getByText("Workout Logs", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Skipped", { exact: true }).first()).toBeVisible();

      await expect(page.getByText(testClientName).first()).toBeVisible();
      await expect(page.getByText(testPlanName).first()).toBeVisible();
      await expect(page.getByText("Back Squat").first()).toBeVisible();
      await expect(page.getByText("225 lb").first()).toBeVisible();
      await expect(page.getByText("Goblet Squat").first()).toBeVisible();
      await expect(page.getByText(clientWorkoutNotes).first()).toBeVisible();
      await expect(page.getByText(skipReason).first()).toBeVisible();
    });

    await test.step("Bundle 2B delete workout log works", async () => {
      await nav.getByRole("button", { name: /^Progress$/ }).click();

      await expect(page.getByText(skipReason).first()).toBeVisible();

      const deleteButtonCountBefore = await page
        .getByRole("button", { name: /Delete Workout Log/i })
        .count();

      expect(deleteButtonCountBefore).toBeGreaterThan(0);

      await page.getByRole("button", { name: /Delete Workout Log/i }).first().click();

      await expect(page.getByText(skipReason)).toHaveCount(0);

      const deleteButtonCountAfter = await page
        .getByRole("button", { name: /Delete Workout Log/i })
        .count();

      expect(deleteButtonCountAfter).toBeLessThan(deleteButtonCountBefore);
    });

    await test.step("Login page loads", async () => {
      await nav.getByRole("button", { name: /^Login$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Authentication Later" })
      ).toBeVisible();

      await expect(page.getByText(/Supabase\/auth should come after/i)).toBeVisible();
    });
  });
});