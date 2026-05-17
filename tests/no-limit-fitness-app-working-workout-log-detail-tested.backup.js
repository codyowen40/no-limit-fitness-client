import { test, expect } from "@playwright/test";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";

test.describe("No Limit Fitness full app test", () => {
  test("checks full frontend flow including Messages, localStorage refresh, Activity Center, and Workout Log Details", async ({
    page,
  }) => {
    const testClientName = "LocalStorage Test Client";
    const testClientEmail = "localstorage-test@nolimittest.com";
    const testPlanName = "Playwright LocalStorage Strength Plan";
    const coachMessage = "Coach localStorage message from Playwright.";
    const clientMessage = "Client localStorage reply from Playwright.";
    const clientWorkoutNotes =
      "Felt strong today. Last set was tough but clean.";

    async function expectWorkoutLogDetailsVisible() {
      await expect(page.getByText("Selected Workout").first()).toBeVisible();
      await expect(page.getByText(testClientName).first()).toBeVisible();
      await expect(page.getByText(testPlanName).first()).toBeVisible();
      await expect(page.getByText("Day 1 - Upper Body").first()).toBeVisible();
      await expect(page.getByText("Back Squat").first()).toBeVisible();

      await expect(
        page.locator("div").filter({
          hasText: /Actual Weight Used\s*225 lb/i,
        }).first()
      ).toBeVisible();

      await expect(
        page.locator("div").filter({
          hasText: /Sets Completed\s*4/i,
        }).first()
      ).toBeVisible();

      await expect(
        page.locator("div").filter({
          hasText: /Reps Completed\s*8, 8, 7, 6/i,
        }).first()
      ).toBeVisible();

      await expect(
        page.locator("div").filter({
          hasText: /Time Completed\s*N\/A/i,
        }).first()
      ).toBeVisible();

      await expect(
        page.locator("div").filter({
          hasText: /Actual Rest Used\s*120 sec/i,
        }).first()
      ).toBeVisible();

      await expect(
        page.locator("div").filter({
          hasText: /Exercise Substitution\s*Goblet Squat/i,
        }).first()
      ).toBeVisible();

      await expect(page.getByText("Client Notes").first()).toBeVisible();
      await expect(page.getByText(clientWorkoutNotes).first()).toBeVisible();
    }

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

      await expect(page.getByText(/Local saving is active/i)).toBeVisible();
      await expect(page.getByText("Unread Activity")).toBeVisible();
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

    await test.step("Check Exercise Library", async () => {
      await nav.getByRole("button", { name: /^Exercises$/ }).click();

      await expect(
        page.getByRole("heading", { name: "General Exercise Database" })
      ).toBeVisible();

      await page
        .getByPlaceholder("Search by exercise, muscle, or equipment...")
        .fill("Back Squat");

      await expect(
        page.getByRole("heading", { name: "Back Squat" })
      ).toBeVisible();

      await expect(
        page.getByText("Quads, glutes, hamstrings, core, upper back")
      ).toBeVisible();

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

      await expect(page.getByText(`Client: ${testClientName}`).first()).toBeVisible();
    });

    await test.step("Track a client workout", async () => {
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
        page.locator("p").filter({ hasText: new RegExp(`^${testPlanName}$`) })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Back Squat" })
      ).toBeVisible();

      await expect(page.getByText("Assigned Sets")).toBeVisible();
      await expect(page.getByText("Assigned Reps/Time")).toBeVisible();
      await expect(page.getByText("Weight Guidance")).toBeVisible();
      await expect(page.getByText("Assigned Rest")).toBeVisible();

      await page.getByLabel("Actual Weight Used").fill("225 lb");
      await page.getByLabel("Sets Completed").fill("4");
      await page.getByLabel("Reps Completed").fill("8, 8, 7, 6");
      await page.getByLabel("Time Completed").fill("N/A");
      await page.getByLabel("Actual Rest Used").fill("120 sec");
      await page.getByLabel("Exercise Substitution").fill("Goblet Squat");
      await page.getByLabel("Client Notes").fill(clientWorkoutNotes);

      await page.getByRole("button", { name: /Mark Complete/i }).click();

      await expect(page.getByText(/marked complete/i)).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Recent Client Logs" })
      ).toBeVisible();

      await expect(
        page.locator("span").filter({ hasText: /^completed$/i })
      ).toBeVisible();
    });

    await test.step("Messages tab sends coach and client messages", async () => {
      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Coach/Client Messaging" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Conversation List" })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Sample Client/i })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Athlete Demo/i })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: new RegExp(testClientName, "i") })
      ).toBeVisible();

      await page
        .getByRole("button", { name: new RegExp(testClientName, "i") })
        .click();

      await expect(
        page.getByRole("heading", { name: testClientName })
      ).toBeVisible();

      await expect(page.getByText(testClientEmail)).toBeVisible();

      await page
        .getByRole("combobox", { name: "Send As", exact: true })
        .selectOption("Coach");

      await page.getByLabel("Message", { exact: true }).fill(coachMessage);

      await page.getByRole("button", { name: /Send Message/i }).click();

      await expect(page.getByText("Coach message sent locally.")).toBeVisible();
      await expect(page.getByText(coachMessage).first()).toBeVisible();
      await expect(page.getByText("Unread Client").first()).toBeVisible();

      await page
        .getByRole("combobox", { name: "Send As", exact: true })
        .selectOption("Client");

      await page.getByLabel("Message", { exact: true }).fill(clientMessage);

      await page.getByRole("button", { name: /Send Message/i }).click();

      await expect(page.getByText("Client message sent locally.")).toBeVisible();
      await expect(page.getByText(clientMessage).first()).toBeVisible();
      await expect(page.getByText("Unread Coach").first()).toBeVisible();
    });

    await test.step("Coach dashboard shows workout and message activity", async () => {
      await nav.getByRole("button", { name: /^Coach$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Command Center" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Activity Center" })
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(
            `${testClientName} marked Day 1 - Upper Body from ${testPlanName} as completed`,
            "i"
          )
        )
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(`${testClientName} entered tracking values for 1 exercise`, "i")
        )
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(`${testClientName} substituted 1 exercise`, "i")
        )
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(`${testClientName} left notes on 1 exercise`, "i")
        )
      ).toBeVisible();

      await expect(
        page.getByText(new RegExp(`${testPlanName} assigned to ${testClientName}`, "i"))
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(
            `Coach message in ${testClientName}'s conversation: ${coachMessage}`,
            "i"
          )
        )
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(
            `Client message in ${testClientName}'s conversation: ${clientMessage}`,
            "i"
          )
        )
      ).toBeVisible();
    });

    await test.step("Workout Log Detail View shows completed workout details on Coach page", async () => {
      await nav.getByRole("button", { name: /^Coach$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Workout Log Detail View" })
      ).toBeVisible();

      await expectWorkoutLogDetailsVisible();
    });

    await test.step("Activity Center filters and read status work", async () => {
      await nav.getByRole("button", { name: /^Coach$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Activity Center" })
      ).toBeVisible();

      const activityCenter = page
        .getByRole("heading", { name: "Activity Center" })
        .locator("xpath=ancestor::div[contains(@class, 'rounded-')][1]");

      await activityCenter.getByRole("button", { name: /^Unread$/ }).click();

      await expect(page.getByText("Client completed workout").first()).toBeVisible();
      await expect(page.getByText("Client changed workout values").first()).toBeVisible();
      await expect(page.getByText("Client changed assigned exercise").first()).toBeVisible();
      await expect(page.getByText("Client left workout note").first()).toBeVisible();
      await expect(page.getByText("Coach assigned new plan").first()).toBeVisible();
      await expect(page.getByText("Coach sent message").first()).toBeVisible();
      await expect(page.getByText("Client sent message").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Workouts$/ }).click();

      await expect(page.getByText("Client completed workout").first()).toBeVisible();
      await expect(page.getByText("Client changed workout values").first()).toBeVisible();

      await activityCenter.getByRole("button", { name: /^Substitutions$/ }).click();

      await expect(page.getByText("Client changed assigned exercise").first()).toBeVisible();

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

    await test.step("Progress page loads and shows Workout Log Details", async () => {
      await nav.getByRole("button", { name: /^Progress$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Tracking Comes Next" })
      ).toBeVisible();

      await expect(page.getByText(/Recent Workout Logs/i)).toBeVisible();
      await expect(page.getByText(testClientName).first()).toBeVisible();
      await expect(page.getByText(testPlanName).first()).toBeVisible();

      await expectWorkoutLogDetailsVisible();
    });

    await test.step("Login page loads", async () => {
      await nav.getByRole("button", { name: /^Login$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Authentication Later" })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { name: "Future Login Area" })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Login Coming Later/i })
      ).toBeDisabled();
    });

    await test.step("localStorage keeps clients, plans, logs, messages, Activity Center read status, and Workout Log Details after refresh", async () => {
      await page.reload();

      await expect(
        page.getByRole("heading", { name: "No Limit Fitness" })
      ).toBeVisible();

      await expect(page.getByText(/Local saving is active/i)).toBeVisible();

      await nav.getByRole("button", { name: /^Clients$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Client Management" })
      ).toBeVisible();

      await expect(page.getByText(testClientName).first()).toBeVisible();
      await expect(page.getByText(testClientEmail).first()).toBeVisible();

      await nav.getByRole("button", { name: /^Plans$/ }).click();

      await expect(
        page.getByText("Workout Plan Builder", { exact: true })
      ).toBeVisible();

      await expect(page.getByText(testPlanName).first()).toBeVisible();
      await expect(page.getByText(`Client: ${testClientName}`).first()).toBeVisible();

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

      await expect(
        page.getByRole("heading", { name: "Recent Client Logs" })
      ).toBeVisible();

      await expect(
        page.locator("p").filter({ hasText: testPlanName }).first()
      ).toBeVisible();

      await expect(
        page.locator("span").filter({ hasText: /^completed$/i })
      ).toBeVisible();

      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Coach/Client Messaging" })
      ).toBeVisible();

      await page
        .getByRole("button", { name: new RegExp(testClientName, "i") })
        .click();

      await expect(
        page.getByRole("heading", { name: testClientName })
      ).toBeVisible();

      await expect(page.getByText(testClientEmail)).toBeVisible();
      await expect(page.getByText(coachMessage).first()).toBeVisible();
      await expect(page.getByText(clientMessage).first()).toBeVisible();

      await expect(page.getByText("Unread Client").first()).toBeVisible();
      await expect(page.getByText("Unread Coach").first()).toBeVisible();

      await nav.getByRole("button", { name: /^Coach$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Activity Center" })
      ).toBeVisible();

      const activityCenter = page
        .getByRole("heading", { name: "Activity Center" })
        .locator("xpath=ancestor::div[contains(@class, 'rounded-')][1]");

      await activityCenter.getByRole("button", { name: /^Unread$/ }).click();

      await expect(
        activityCenter.getByText("No activity matches this filter.")
      ).toBeVisible();

      await expect(
        activityCenter.getByRole("button", { name: /^Read$/ })
      ).toHaveCount(0);

      await expect(
        page.getByRole("heading", { name: "Workout Log Detail View" })
      ).toBeVisible();

      await expectWorkoutLogDetailsVisible();
    });

    await test.step("message read status also saves after refresh", async () => {
      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Coach/Client Messaging" })
      ).toBeVisible();

      await page
        .getByRole("button", { name: new RegExp(testClientName, "i") })
        .click();

      await page.getByRole("button", { name: /Mark Coach Read/i }).click();

      await expect(
        page.getByText("Coach unread messages marked as read.")
      ).toBeVisible();

      await page.getByRole("button", { name: /Mark Client Read/i }).click();

      await expect(
        page.getByText("Client unread messages marked as read.")
      ).toBeVisible();

      await page.reload();

      await expect(
        page.getByRole("heading", { name: "No Limit Fitness" })
      ).toBeVisible();

      await nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Coach/Client Messaging" })
      ).toBeVisible();

      await page
        .getByRole("button", { name: new RegExp(testClientName, "i") })
        .click();

      await expect(page.getByText(coachMessage).first()).toBeVisible();
      await expect(page.getByText(clientMessage).first()).toBeVisible();

      await expect(page.getByText("Unread Client")).toHaveCount(0);
      await expect(page.getByText("Unread Coach")).toHaveCount(0);
    });
  });
});