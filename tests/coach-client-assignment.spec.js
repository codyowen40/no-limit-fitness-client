import { expect, test } from "@playwright/test";

async function openMessagesTab(page) {
  const navMessages = page.getByRole("button", {
    name: /^Messages(?:\s+\d+)?$/,
  });

  const navCount = await navMessages.count();

  for (let index = 0; index < navCount; index += 1) {
    const button = navMessages.nth(index);

    if (await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }

  await page
    .getByRole("button", {
      name: /Messages\s+Send local coach\/client messages/i,
    })
    .click();
}

async function readSavedAppPayload(page) {
  const payload = await page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      const value = window.localStorage.getItem(key);

      try {
        const parsed = JSON.parse(value);

        if (
          parsed &&
          Array.isArray(parsed.clients) &&
          Array.isArray(parsed.conversations)
        ) {
          return { key, state: parsed };
        }
      } catch {
        // Ignore non-JSON localStorage values.
      }
    }

    return null;
  });

  expect(payload, "Expected saved No Limit Fitness app state in localStorage.").not.toBeNull();

  return payload;
}

async function installAssignedClientFixture(page) {
  return page.evaluate(() => {
    let payload = null;

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      const value = window.localStorage.getItem(key);

      try {
        const parsed = JSON.parse(value);

        if (
          parsed &&
          Array.isArray(parsed.clients) &&
          Array.isArray(parsed.conversations)
        ) {
          payload = { key, state: parsed };
          break;
        }
      } catch {
        // Ignore non-JSON localStorage values.
      }
    }

    if (!payload) {
      throw new Error("No saved app state found.");
    }

    const state = payload.state;

    if (!Array.isArray(state.clients)) state.clients = [];
    if (!Array.isArray(state.conversations)) state.conversations = [];

    let client =
      state.clients.find((item) => String(item.name || "").includes("Sample Client")) ||
      state.clients[0];

    if (!client) {
      client = {
        id: "client-assignment-fixture",
        name: "Assignment Fixture Client",
        email: "assignment-fixture@example.com",
      };

      state.clients.push(client);
    }

    client.id = client.id || "client-assignment-fixture";
    client.name = client.name || "Assignment Fixture Client";
    client.email = client.email || "assignment-fixture@example.com";
    client.coachId = "coach-no-limit-primary";
    client.coachName = "No Limit Coach";
    client.coachingStatus = "active";
    client.status = "Active";

    let conversation =
      state.conversations.find((item) => item.clientId === client.id) ||
      state.conversations.find((item) => String(item.clientName || "").includes(client.name));

    if (!conversation) {
      conversation = {
        id: "conversation-assignment-fixture",
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        coachUnread: 0,
        clientUnread: 0,
        messages: [],
      };

      state.conversations.push(conversation);
    }

    conversation.clientId = client.id;
    conversation.clientName = client.name;
    conversation.clientEmail = client.email;
    conversation.messages = Array.isArray(conversation.messages) ? conversation.messages : [];

    window.localStorage.setItem(payload.key, JSON.stringify(state));

    return {
      clientId: client.id,
      clientName: client.name,
      coachId: client.coachId,
      coachName: client.coachName,
    };
  });
}

test.describe("Coach/client assignment data coverage", () => {
  test("coach-assigned client data supports role-locked messaging", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    const fixture = await installAssignedClientFixture(page);

    await page.reload();

    const initialPayload = await readSavedAppPayload(page);
    const assignedClient = initialPayload.state.clients.find(
      (client) => client.id === fixture.clientId
    );

    expect(assignedClient).toBeTruthy();
    expect(assignedClient.coachId).toBe("coach-no-limit-primary");
    expect(assignedClient.coachName).toBe("No Limit Coach");
    expect(String(assignedClient.coachingStatus || assignedClient.status || "").toLowerCase()).toMatch(/active|assigned/);

    const assignedConversation = initialPayload.state.conversations.find(
      (conversation) => conversation.clientId === fixture.clientId
    );

    expect(assignedConversation).toBeTruthy();

    await openMessagesTab(page);

    await expect(
      page.getByRole("heading", { name: /Coach\/Client Messaging|Assigned Client Messaging|Assigned Coach Messaging/ })
    ).toBeVisible();

    const conversationButton = page
      .getByRole("button", { name: new RegExp(fixture.clientName) })
      .first();

    if (await conversationButton.isVisible().catch(() => false)) {
      await conversationButton.click();
    }

    await expect(page.getByLabel("Send As")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Signed-in role");
    await expect(page.locator("main")).toContainText("Coach");

    const messageBody = `Coach assignment route locked message ${Date.now()}`;

    await page.getByLabel("Message", { exact: true }).fill(messageBody);
    await page.getByRole("button", { name: /Send Message/i }).click();

    await expect(page.locator("main")).toContainText(messageBody);
    await expect(page.locator("main")).toContainText("Coach message sent locally.");

    await page.waitForFunction((body) => {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const value = window.localStorage.getItem(window.localStorage.key(index));

        try {
          const parsed = JSON.parse(value);

          if (!parsed || !Array.isArray(parsed.conversations)) continue;

          return parsed.conversations.some((conversation) =>
            Array.isArray(conversation.messages) &&
            conversation.messages.some((message) => message.body === body)
          );
        } catch {
          // Ignore non-JSON localStorage values.
        }
      }

      return false;
    }, messageBody);

    const updatedPayload = await readSavedAppPayload(page);
    const updatedConversation = updatedPayload.state.conversations.find((conversation) =>
      Array.isArray(conversation.messages) &&
      conversation.messages.some((message) => message.body === messageBody)
    );

    expect(updatedConversation).toBeTruthy();
    expect(updatedConversation.clientId).toBe(fixture.clientId);

    const savedMessage = updatedConversation.messages.find(
      (message) => message.body === messageBody
    );

    expect(savedMessage.sender).toBe("Coach");

    const routedClient = updatedPayload.state.clients.find(
      (client) => client.id === updatedConversation.clientId
    );

    expect(routedClient).toBeTruthy();
    expect(routedClient.coachId).toBe("coach-no-limit-primary");
    expect(routedClient.coachName).toBe("No Limit Coach");
  });
  test("coach operating system dashboard stays coach-only", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    const fixture = await installAssignedClientFixture(page);

    await page.reload();

    const coachNavButton = page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Coach", exact: true });

    if (await coachNavButton.isVisible().catch(() => false)) {
      await coachNavButton.click();
    }

    const main = page.locator("main");

    await expect(main).toContainText("Coach Command Center");
    await expect(main).toContainText("Active Clients");
    await expect(main).toContainText("Plans Awaiting Review");
    await expect(main).toContainText("Recent Workout Logs");
    await expect(main).toContainText("Unread Client Messages");
    await expect(main).toContainText("Clients Needing Attention");
    await expect(main).toContainText("Client Profile Hub");
    await expect(main).toContainText("Progress Snapshot");
    await expect(main).toContainText("Recent Activity");
    await expect(main).toContainText(fixture.clientName);
    await expect(main).not.toContainText("Send As");

    await page.goto("/?testUnlock=true&portalMode=client");

    const clientMain = page.locator("main");

    await expect(clientMain).not.toContainText("Clients Needing Attention");
    await expect(clientMain).not.toContainText("Client Profile Hub");
    await expect(clientMain).not.toContainText("Coach Command Center");
  });

  test("coach can log a client session from the client profile hub", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    await expect(page.getByText("Coach Command Center").first()).toBeVisible();
    await expect(page.getByTestId("coach-session-logger")).toBeVisible();

    await page.getByLabel("Coach session exercise").fill("Back Squat");
    await page.getByLabel("Coach session sets").fill("4");
    await page.getByLabel("Coach session reps").fill("8");
    await page.getByLabel("Coach session weight").fill("185 lb");
    await page.getByLabel("Coach session notes").fill("Coach logged session from the profile hub.");

    await page.getByRole("button", { name: "Save Coach Session" }).click();

    await expect(page.getByTestId("coach-session-status")).toContainText("Coach session saved");
    await expect(page.locator("main")).toContainText("Coach Logged Session");
    await expect(page.locator("main")).toContainText("Back Squat");

    await expect
      .poll(async () => {
        const payload = await readSavedAppPayload(page);
        return payload.state.workoutLogs.some(
          (log) =>
            log.loggedBy === "Coach" &&
            log.source === "Coach Session Logger" &&
            log.dayName === "Coach Logged Session" &&
            Array.isArray(log.entries) &&
            log.entries.some(
              (entry) =>
                entry.exerciseName === "Back Squat" &&
                entry.setsCompleted === "4" &&
                entry.repsCompleted === "8" &&
                entry.actualWeight === "185 lb"
            )
        );
      })
      .toBe(true);
  });

});

test("coach can review saved nutrition targets meals and notes", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  const nutritionCoachWindow = page.getByTestId("nutrition-coach-window").last();

  await nutritionCoachWindow.getByRole("button", { name: /Build My Target/i }).click();

  await page.getByLabel("Nutrition Goal").selectOption("fat-loss");
  await page.getByLabel("Body Weight").fill("200");
  await page.getByLabel("Height Feet").fill("5");
  await page.getByLabel("Height Inches").fill("11");
  await page.getByLabel("Age").fill("35");
  await page.getByLabel("Gender Formula").selectOption("male");
  await page.getByLabel("Activity Level").selectOption("high");
  await page.getByRole("button", { name: "Calculate Targets" }).click();
  await page.getByRole("button", { name: "Save Macro Target" }).click();

  await expect(page.getByTestId("nutrition-save-status")).toContainText("Macro target saved");

  await page.getByRole("button", { name: "Start Over" }).click();
  await nutritionCoachWindow.getByRole("button", { name: /Check What I Ate/i }).click();

  await page
    .getByLabel("Meal Description")
    .fill("moderate sweet tea, 2 beers, ramen noodles, chips, and pizza rolls");

  await page.getByRole("button", { name: "Estimate Meal" }).click();
  await page.getByRole("button", { name: "Save Meal Estimate" }).click();

  await expect(page.getByTestId("nutrition-save-status")).toContainText("Meal estimate saved");

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  const reviewPanel = page.getByTestId("coach-nutrition-review-panel");

  await expect(reviewPanel).toBeVisible();
  await expect(reviewPanel).toContainText("Client Nutrition Activity");
  await expect(page.getByTestId("coach-latest-nutrition-target")).toContainText("Weight Loss");
  await expect(page.getByTestId("coach-latest-meal-review")).toContainText("Meal");
  await expect(page.getByTestId("coach-nutrition-flags")).toContainText("Alcohol appears");
  await expect(page.getByTestId("coach-nutrition-flags")).toContainText("Liquid calories");

  await page
    .getByRole("textbox", { name: "Coach Nutrition Notes", exact: true })
    .fill("Review sweet drinks, alcohol logs, and protein consistency next check-in.");
  await page.getByRole("button", { name: "Save Coach Nutrition Notes" }).click();

  await expect(page.getByTestId("coach-nutrition-review-status")).toContainText("Coach nutrition notes saved");
});
﻿
test("coach can save weekly nutrition check-in report", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nlf-nutrition-history-v1",
      JSON.stringify({
        targets: [
          {
            id: "target-test",
            goal: "fat-loss",
            goalLabel: "Weight Loss",
            dailyCalories: 2100,
            maintenanceCalories: 2600,
            protein: 200,
            carbs: 190,
            fat: 65,
            savedAt: "Test week"
          }
        ],
        meals: [
          {
            id: "meal-1",
            title: "Meal Builder Estimate",
            calories: 950,
            protein: 34,
            carbs: 110,
            fat: 32,
            confidence: "High",
            matches: [
              { id: "item-1", name: "Sweet Tea", category: "Drink", calories: 160 },
              { id: "item-2", name: "Light Beer", category: "Alcohol", calories: 105 },
              { id: "item-3", name: "Pizza Rolls", category: "Convenience", calories: 220 }
            ]
          },
          {
            id: "meal-2",
            title: "Meal Estimate",
            calories: 620,
            protein: 18,
            carbs: 80,
            fat: 24,
            confidence: "Moderate",
            matches: [
              { id: "item-4", name: "Kool-Aid", category: "Drink", calories: 150 },
              { id: "item-5", name: "Ramen Noodles", category: "Convenience", calories: 380 }
            ]
          },
          {
            id: "meal-3",
            title: "Meal Estimate",
            calories: 500,
            protein: 35,
            carbs: 45,
            fat: 12,
            confidence: "Moderate",
            matches: [
              { id: "item-6", name: "Chicken Breast", category: "Protein", calories: 185 },
              { id: "item-7", name: "White Rice", category: "Carb", calories: 205 }
            ]
          }
        ]
      })
    );
  });

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  const weeklyPanel = page.getByTestId("weekly-nutrition-checkin-panel");

  await expect(weeklyPanel).toBeVisible();
  await expect(weeklyPanel).toContainText("Nutrition Report");
  await expect(page.getByTestId("weekly-nutrition-summary")).toContainText("Avg Meal Calories");
  await expect(page.getByTestId("weekly-nutrition-summary")).toContainText("Avg Protein");
  await expect(page.getByTestId("weekly-nutrition-recommendations")).toContainText("Main Adjustment");

  await page.getByLabel("Weekly Starting Weight").fill("200");
  await page.getByLabel("Weekly Ending Weight").fill("198.5");

  await expect(weeklyPanel).toContainText("1.5 lb down");

  await page
    .getByLabel("Weekly Coach Nutrition Notes")
    .fill("Keep protein consistent and reduce sweet drinks during the week.");

  await page.getByRole("button", { name: "Save Weekly Check-In" }).click();

  await expect(page.getByTestId("weekly-nutrition-checkin-status")).toContainText("Weekly nutrition check-in saved");
});
