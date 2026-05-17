import { test, expect } from "@playwright/test";

test.describe("No Limit Fitness full app test", () => {
  test("checks the full frontend flow including Messages", async ({ page }) => {
    await page.goto("/");

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

      await page.getByLabel("Client Name").fill("Test Client");
      await page.getByLabel("Client Email").fill("testclient@nolimittest.com");

      await page.getByRole("button", { name: /Add Client/i }).click();

      await expect(page.getByText("Test Client")).toBeVisible();
      await expect(page.getByText("testclient@nolimittest.com")).toBeVisible();
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

      await page
        .getByLabel("Plan Name")
        .fill("Playwright Full Test Strength Plan");

      await page
        .getByRole("combobox", { name: "Select Client", exact: true })
        .selectOption({ label: "Test Client" });

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

      await expect(page.getByText("Client: Test Client")).toBeVisible();
    });

    await test.step("Track a client workout", async () => {
      await nav.getByRole("button", { name: /^Tracker$/ }).click();

      await expect(
        page.getByText("Client Workout Tracker", { exact: true })
      ).toBeVisible();

      await page
        .getByRole("combobox", { name: "Client", exact: true })
        .selectOption({ label: "Test Client" });

      await page
        .getByRole("combobox", { name: "Assigned Plan", exact: true })
        .selectOption({ label: "Playwright Full Test Strength Plan" });

      await expect(
        page.locator("p").filter({
          hasText: /^Playwright Full Test Strength Plan$/,
        })
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

      await page
        .getByLabel("Client Notes")
        .fill("Felt strong today. Last set was tough but clean.");

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
        page.getByRole("button", { name: /Test Client/i })
      ).toBeVisible();

      await page.getByRole("button", { name: /Test Client/i }).click();

      await expect(
        page.getByRole("heading", { name: "Test Client" })
      ).toBeVisible();

      await expect(page.getByText("testclient@nolimittest.com")).toBeVisible();

      await page
        .getByRole("combobox", { name: "Send As", exact: true })
        .selectOption("Coach");

      await page
        .getByLabel("Message", { exact: true })
        .fill("Coach test message from Playwright.");

      await page.getByRole("button", { name: /Send Message/i }).click();

      await expect(page.getByText("Coach message sent locally.")).toBeVisible();

      await expect(
        page.getByText("Coach test message from Playwright.").first()
      ).toBeVisible();

      await expect(page.getByText("Unread Client").first()).toBeVisible();

      await page
        .getByRole("combobox", { name: "Send As", exact: true })
        .selectOption("Client");

      await page
        .getByLabel("Message", { exact: true })
        .fill("Client test reply from Playwright.");

      await page.getByRole("button", { name: /Send Message/i }).click();

      await expect(page.getByText("Client message sent locally.")).toBeVisible();

      await expect(
        page.getByText("Client test reply from Playwright.").first()
      ).toBeVisible();

      await expect(page.getByText("Unread Coach").first()).toBeVisible();

      await page.getByRole("button", { name: /Mark Coach Read/i }).click();

      await expect(
        page.getByText("Coach unread messages marked as read.")
      ).toBeVisible();

      await page.getByRole("button", { name: /Mark Client Read/i }).click();

      await expect(
        page.getByText("Client unread messages marked as read.")
      ).toBeVisible();
    });

    await test.step("Coach dashboard shows workout and message activity", async () => {
      await nav.getByRole("button", { name: /^Coach$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Command Center" })
      ).toBeVisible();

      await expect(
        page.getByText(
          /Test Client marked Day 1 - Upper Body from Playwright Full Test Strength Plan as completed/i
        )
      ).toBeVisible();

      await expect(
        page.getByText(/Test Client entered tracking values for 1 exercise/i)
      ).toBeVisible();

      await expect(
        page.getByText(/Test Client substituted 1 exercise/i)
      ).toBeVisible();

      await expect(
        page.getByText(/Test Client left notes on 1 exercise/i)
      ).toBeVisible();

      await expect(
        page.getByText(
          /Playwright Full Test Strength Plan assigned to Test Client/i
        )
      ).toBeVisible();

      await expect(
        page.getByText(
          /Coach message in Test Client's conversation: Coach test message from Playwright./i
        )
      ).toBeVisible();

      await expect(
        page.getByText(
          /Client message in Test Client's conversation: Client test reply from Playwright./i
        )
      ).toBeVisible();
    });

    await test.step("Progress page loads", async () => {
      await nav.getByRole("button", { name: /^Progress$/ }).click();

      await expect(
        page.getByRole("heading", { name: "Tracking Comes Next" })
      ).toBeVisible();

      await expect(page.getByText(/Recent Workout Logs/i)).toBeVisible();
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
  });
});