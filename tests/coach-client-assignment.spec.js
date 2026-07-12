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

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

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
﻿
test("client weekly check-in appears in coach nutrition review", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.location.search.includes("portalMode=coach")) {
      window.localStorage.removeItem("nlf-client-weekly-checkins-v1");
      window.localStorage.removeItem("nlf-coach-client-checkin-notes-v1");
    }
  });

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  await page.getByTestId("client-dashboard-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("client-checkins-workspace").first()).toBeVisible();

  const clientCheckInForm = page.getByTestId("client-weekly-checkin-form").first();

  await expect(clientCheckInForm).toBeVisible();

  await clientCheckInForm.getByLabel("Client Check-In Weight").fill("198.4");
  await clientCheckInForm.getByLabel("Client Waist Measurement").fill("34.5");
  await clientCheckInForm.getByLabel("Weekly Adherence Score").selectOption("75");
  await clientCheckInForm.getByLabel("Weekly Workouts Completed").fill("4");
  await clientCheckInForm.getByLabel("Weekly Protein Consistency").selectOption("4");
  await clientCheckInForm.getByLabel("Weekly Hunger Score").selectOption("4");
  await clientCheckInForm.getByLabel("Weekly Energy Score").selectOption("2");
  await clientCheckInForm.getByLabel("Weekly Sleep Score").selectOption("2");
  await clientCheckInForm.getByLabel("Weekly Stress Score").selectOption("4");
  await clientCheckInForm.getByLabel("Weekly Recovery Score").selectOption("2");
  await clientCheckInForm.getByLabel("Front Progress Photo Note").fill("Front photo uploaded and waist looks tighter.");
  await clientCheckInForm.getByLabel("Side Progress Photo Note").fill("Side photo uploaded.");
  await clientCheckInForm.getByLabel("Back Progress Photo Note").fill("Back photo uploaded.");
  await clientCheckInForm
    .getByRole("textbox", { name: "Client Weekly Check-In Notes", exact: true })
    .fill("Energy was low, hunger was high, and sleep was rough this week.");

  await clientCheckInForm.getByRole("button", { name: "Save Weekly Client Check-In" }).click();

  await expect(page.getByTestId("client-weekly-checkin-status").first()).toContainText("Weekly client check-in saved");
  await expect(page.getByTestId("client-latest-weekly-checkin").first()).toContainText("198.4");

  await page.evaluate(() => {
    window.localStorage.setItem(
      "nlf-client-weekly-checkins-v1",
      JSON.stringify([
        {
          id: "client-weekly-checkin-test",
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
          clientCheckInNotes: "Energy was low, hunger was high, and sleep was rough this week.",
          frontPhotoNote: "Front photo uploaded and waist looks tighter.",
          sidePhotoNote: "Side photo uploaded.",
          backPhotoNote: "Back photo uploaded.",
          savedAt: "Test check-in"
        }
      ])
    );
  });

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("coach-checkins-workspace").first()).toBeVisible();

  const coachCheckInPanel = page.getByTestId("coach-client-weekly-checkin-panel").first();

  await expect(coachCheckInPanel).toBeVisible();
  await expect(coachCheckInPanel).toContainText("Weekly Client Feedback");
  await expect(coachCheckInPanel).toContainText("198.4");
  await expect(coachCheckInPanel).toContainText("Front photo uploaded");
  await expect(coachCheckInPanel).toContainText("Hunger is high");
  await expect(coachCheckInPanel).toContainText("Energy is low");
  await expect(coachCheckInPanel).toContainText("Sleep score is poor");
  await expect(coachCheckInPanel).toContainText("Progress photo notes were logged");

  await coachCheckInPanel
    .getByRole("textbox", { name: "Coach Client Check-In Notes", exact: true })
    .fill("Keep calories steady this week and fix sleep before adjusting macros.");

  await coachCheckInPanel.getByRole("button", { name: "Save Coach Check-In Notes" }).click();

  await expect(page.getByTestId("coach-client-checkin-status").first()).toContainText("Coach check-in notes saved");
});
﻿
test("client can upload progress photos and coach can review them", async ({ page }) => {
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );

  await page.addInitScript(() => {
    if (!window.location.search.includes("portalMode=coach")) {
      window.localStorage.removeItem("nlf-client-progress-photos-v1");
      window.localStorage.removeItem("nlf-coach-progress-photo-review-notes-v1");
    }
  });

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  await page.getByTestId("client-dashboard-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("client-checkins-workspace").first()).toBeVisible();

  const photoPanel = page.getByTestId("client-progress-photo-upload-panel").first();

  await expect(photoPanel).toBeVisible();

  await photoPanel.getByLabel("Progress Photo Date").fill("2026-07-11");
  await photoPanel.getByLabel("Progress Photo Check-In Notes").fill("Same lighting and morning check-in.");

  await photoPanel.locator('input[type="file"][aria-label="Front Progress Photo Upload"]').setInputFiles({
    name: "front-progress.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(photoPanel.getByTestId("front-progress-photo-preview")).toBeVisible();

  await photoPanel.locator('input[type="file"][aria-label="Side Progress Photo Upload"]').setInputFiles({
    name: "side-progress.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(photoPanel.getByTestId("side-progress-photo-preview")).toBeVisible();

  await photoPanel.locator('input[type="file"][aria-label="Back Progress Photo Upload"]').setInputFiles({
    name: "back-progress.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(photoPanel.getByTestId("back-progress-photo-preview")).toBeVisible();

  await photoPanel.getByRole("textbox", { name: "Front Progress Photo Upload Note", exact: true }).fill("Front view looks tighter.");
  await photoPanel.getByRole("textbox", { name: "Side Progress Photo Upload Note", exact: true }).fill("Side waist looks improved.");
  await photoPanel.getByRole("textbox", { name: "Back Progress Photo Upload Note", exact: true }).fill("Back photo uploaded.");

  await photoPanel.getByRole("button", { name: "Save Progress Photos" }).click();

  await expect(page.getByTestId("client-progress-photo-status").first()).toContainText("Progress photos saved");
  await expect(page.getByTestId("client-latest-progress-photo-checkin").first()).toContainText("2026-07-11");

  await page.evaluate(() => {
    const tinyDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

    window.localStorage.setItem(
      "nlf-client-progress-photos-v1",
      JSON.stringify([
        {
          id: "progress-photo-checkin-test",
          photoDate: "2026-07-11",
          photoCheckInNotes: "Same lighting and morning check-in.",
          frontPhotoNote: "Front view looks tighter.",
          sidePhotoNote: "Side waist looks improved.",
          backPhotoNote: "Back photo uploaded.",
          frontPhoto: {
            name: "front-progress.png",
            type: "image/png",
            size: 68,
            dataUrl: tinyDataUrl,
            addedAt: "Test"
          },
          sidePhoto: {
            name: "side-progress.png",
            type: "image/png",
            size: 68,
            dataUrl: tinyDataUrl,
            addedAt: "Test"
          },
          backPhoto: {
            name: "back-progress.png",
            type: "image/png",
            size: 68,
            dataUrl: tinyDataUrl,
            addedAt: "Test"
          },
          savedAt: "Test photo check-in"
        }
      ])
    );
  });

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("coach-checkins-workspace").first()).toBeVisible();

  const coachPhotoPanel = page.getByTestId("coach-progress-photo-review-panel").first();

  await expect(coachPhotoPanel).toBeVisible();
  await expect(coachPhotoPanel).toContainText("Progress Photo Review");
  await expect(coachPhotoPanel).toContainText("2026-07-11");
  await expect(coachPhotoPanel.getByTestId("coach-front-progress-photo").first()).toBeVisible();
  await expect(coachPhotoPanel.getByTestId("coach-side-progress-photo").first()).toBeVisible();
  await expect(coachPhotoPanel.getByTestId("coach-back-progress-photo").first()).toBeVisible();
  await expect(coachPhotoPanel).toContainText("Side waist looks improved");

  await coachPhotoPanel
    .getByRole("textbox", { name: "Coach Progress Photo Notes", exact: true })
    .fill("Progress photos reviewed. Keep nutrition steady and compare same lighting next week.");

  await coachPhotoPanel.getByRole("button", { name: "Save Coach Photo Notes" }).click();

  await expect(page.getByTestId("coach-progress-photo-review-status").first()).toContainText("Coach progress photo notes saved");
});
﻿
test("coach command center shows nutrition check-in risk summary cards", async ({ page }) => {
  await page.addInitScript(() => {
    const tinyDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

    window.localStorage.setItem(
      "nlf-nutrition-history-v1",
      JSON.stringify({
        targets: [
          {
            id: "target-coach-command-test",
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
            id: "meal-coach-command-test",
            title: "Meal Builder Estimate",
            calories: 950,
            protein: 34,
            carbs: 110,
            fat: 32,
            confidence: "High",
            matches: [
              { id: "item-1", name: "Light Beer", category: "Alcohol", calories: 105 },
              { id: "item-2", name: "Sweet Tea", category: "Drink", calories: 160 },
              { id: "item-3", name: "Pizza Rolls", category: "Convenience", calories: 220 }
            ]
          }
        ]
      })
    );

    window.localStorage.setItem(
      "nlf-client-weekly-checkins-v1",
      JSON.stringify([
        {
          id: "client-command-checkin-current",
          checkInDate: "2026-07-11",
          checkInWeight: "198.4",
          waistMeasurement: "34.5",
          adherenceScore: "70",
          workoutsCompleted: "4",
          proteinConsistency: "4",
          hungerScore: "4",
          energyScore: "2",
          sleepScore: "2",
          stressScore: "4",
          digestionScore: "3",
          recoveryScore: "2",
          clientCheckInNotes: "Energy was low this week.",
          savedAt: "Test current"
        },
        {
          id: "client-command-checkin-previous",
          checkInDate: "2026-07-04",
          checkInWeight: "200.0",
          waistMeasurement: "35",
          adherenceScore: "80",
          workoutsCompleted: "3",
          proteinConsistency: "3",
          hungerScore: "3",
          energyScore: "3",
          sleepScore: "3",
          stressScore: "3",
          digestionScore: "3",
          recoveryScore: "3",
          clientCheckInNotes: "Previous week.",
          savedAt: "Test previous"
        }
      ])
    );

    window.localStorage.setItem(
      "nlf-client-progress-photos-v1",
      JSON.stringify([
        {
          id: "photo-command-test",
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

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  const commandSummary = page.getByTestId("coach-command-summary-cards").first();

  await expect(commandSummary).toBeVisible();
  await expect(commandSummary).toContainText("Client Nutrition And Check-In Risk Summary");
  await expect(page.getByTestId("coach-command-weight-card").first()).toContainText("1.6 lb down");
  await expect(page.getByTestId("coach-command-target-card").first()).toContainText("2100 cal");
  await expect(page.getByTestId("coach-command-meal-card").first()).toContainText("950 cal");
  await expect(page.getByTestId("coach-command-photo-card").first()).toContainText("3/3");
  await expect(page.getByTestId("coach-command-risk-card").first()).toContainText("High");
  await expect(page.getByTestId("coach-command-summary-counts").first()).toContainText("Check-ins: 2");
  await expect(page.getByTestId("coach-command-risk-flags").first()).toContainText("Alcohol appears");
  await expect(page.getByTestId("coach-command-risk-flags").first()).toContainText("Sleep is poor");
  await expect(page.getByTestId("coach-command-recommended-action").first()).toContainText("Prioritize recovery first");

  await commandSummary.getByRole("button", { name: "Refresh Command Summary" }).click();

  await expect(page.getByTestId("coach-command-summary-status").first()).toContainText("Coach command summary refreshed");
});
﻿
test("coach can generate weekly action plan and client can view it", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.location.search.includes("portalMode=client")) {
      window.localStorage.removeItem("nlf-coach-client-weekly-action-plans-v1");
    }

    const tinyDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

    window.localStorage.setItem(
      "nlf-nutrition-history-v1",
      JSON.stringify({
        targets: [
          {
            id: "target-action-plan-test",
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
            id: "meal-action-plan-test",
            title: "Meal Builder Estimate",
            calories: 950,
            protein: 34,
            carbs: 110,
            fat: 32,
            confidence: "High",
            matches: [
              { id: "item-1", name: "Light Beer", category: "Alcohol", calories: 105 },
              { id: "item-2", name: "Sweet Tea", category: "Drink", calories: 160 }
            ]
          }
        ]
      })
    );

    window.localStorage.setItem(
      "nlf-client-weekly-checkins-v1",
      JSON.stringify([
        {
          id: "client-action-checkin-current",
          checkInDate: "2026-07-11",
          checkInWeight: "198.4",
          waistMeasurement: "34.5",
          adherenceScore: "70",
          workoutsCompleted: "4",
          proteinConsistency: "4",
          hungerScore: "4",
          energyScore: "2",
          sleepScore: "2",
          stressScore: "4",
          digestionScore: "3",
          recoveryScore: "2",
          clientCheckInNotes: "Energy was low this week.",
          savedAt: "Test current"
        }
      ])
    );

    window.localStorage.setItem(
      "nlf-client-progress-photos-v1",
      JSON.stringify([
        {
          id: "photo-action-test",
          photoDate: "2026-07-11",
          photoCheckInNotes: "Same lighting.",
          frontPhoto: { name: "front.png", dataUrl: tinyDataUrl },
          sidePhoto: { name: "side.png", dataUrl: tinyDataUrl },
          backPhoto: { name: "back.png", dataUrl: tinyDataUrl },
          savedAt: "Test"
        }
      ])
    );
  });

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("coach-checkins-workspace").first()).toBeVisible();

  const actionPlanPanel = page.getByTestId("coach-weekly-action-plan-generator").first();

  await expect(actionPlanPanel).toBeVisible();
  await expect(actionPlanPanel).toContainText("Turn Risk Flags Into A Client Plan");
  await expect(page.getByTestId("coach-action-plan-risk-snapshot").first()).toContainText("Sleep is poor");
  await expect(page.getByTestId("coach-action-plan-risk-snapshot").first()).toContainText("Alcohol appears");

  await actionPlanPanel.getByRole("button", { name: "Generate Weekly Action Plan" }).click();

  await expect(page.getByTestId("coach-weekly-action-plan-status").first()).toContainText("Weekly action plan generated");
  await expect(actionPlanPanel.getByLabel("Coach Weekly Action Plan Title")).toHaveValue("Recovery First Weekly Plan");
  await expect(actionPlanPanel.getByLabel("Coach Weekly Priority Focus")).toHaveValue("Recovery, sleep, and consistency");

  await actionPlanPanel
    .getByRole("textbox", { name: "Coach Weekly Client Message", exact: true })
    .fill("Focus on sleep, protein, water, and steady training this week.");

  await actionPlanPanel.getByRole("button", { name: "Save Weekly Action Plan" }).click();

  await expect(page.getByTestId("coach-weekly-action-plan-status").first()).toContainText("Weekly coach action plan saved");
  await expect(page.getByTestId("coach-saved-action-plan-card").first()).toContainText("Recovery First Weekly Plan");
  await expect(page.getByTestId("coach-saved-action-plan-card").first()).toContainText("Focus on sleep");

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  const clientActionPlanPanel = page.getByTestId("client-latest-coach-action-plan").first();

  await expect(clientActionPlanPanel).toBeVisible();
  await expect(page.getByTestId("client-coach-action-plan-card").first()).toContainText("Recovery First Weekly Plan");
  await expect(page.getByTestId("client-coach-action-plan-card").first()).toContainText("Focus on sleep");
});
﻿
test("client can complete coach action plan and coach can review completion", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.location.search.includes("portalMode=coach")) {
      window.localStorage.removeItem("nlf-client-action-plan-completions-v1");
      window.localStorage.removeItem("nlf-coach-action-plan-completion-review-notes-v1");
    }

    window.localStorage.setItem(
      "nlf-coach-client-weekly-action-plans-v1",
      JSON.stringify([
        {
          id: "coach-weekly-action-plan-completion-test",
          planTitle: "Recovery First Weekly Plan",
          priorityFocus: "Recovery, sleep, and consistency",
          nutritionAction: "Hit protein first, reduce alcohol, and keep calories steady.",
          trainingAction: "Keep training controlled and avoid adding extra volume.",
          habitAction: "Set a simple sleep target and prep one high-protein meal option.",
          clientMessage: "Focus on sleep, protein, water, and steady training this week.",
          coachInternalNote: "Generated from low energy and poor sleep.",
          flags: ["Sleep is poor", "Energy is low"],
          savedAt: "Test action plan"
        }
      ])
    );
  });

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  await page.getByTestId("client-dashboard-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("client-checkins-workspace").first()).toBeVisible();

  const completionPanel = page.getByTestId("client-action-plan-completion-tracker").first();

  await expect(completionPanel).toBeVisible();
  await expect(completionPanel).toContainText("Mark This Week Complete");
  await expect(page.getByTestId("client-action-plan-completion-card").first()).toContainText("Recovery First Weekly Plan");

  await completionPanel.getByRole("checkbox", { name: "Nutrition Action Complete" }).check();
  await completionPanel.getByRole("checkbox", { name: "Training Recovery Action Complete" }).check();
  await completionPanel.getByRole("checkbox", { name: "Habit Action Complete" }).check();
  await completionPanel.getByRole("checkbox", { name: "Coach Message Reviewed" }).check();

  await completionPanel
    .getByRole("textbox", { name: "Client Action Plan Completion Notes", exact: true })
    .fill("I completed the plan, hit protein, kept workouts controlled, and slept better.");

  await completionPanel.getByRole("button", { name: "Save Action Plan Completion" }).click();

  await expect(page.getByTestId("client-action-plan-completion-status").first()).toContainText("Action plan completion saved");
  await expect(page.getByTestId("client-latest-action-plan-completion").first()).toContainText("100% complete");

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("coach-checkins-workspace").first()).toBeVisible();

  const coachCompletionPanel = page.getByTestId("coach-action-plan-completion-review").first();

  await expect(coachCompletionPanel).toBeVisible();
  await expect(coachCompletionPanel).toContainText("Client Action Plan Follow-Through");
  await expect(page.getByTestId("coach-action-plan-completion-score").first()).toContainText("100%");
  await expect(page.getByTestId("coach-action-plan-completion-label").first()).toContainText("Complete");
  await expect(page.getByTestId("coach-latest-action-plan-completion").first()).toContainText("I completed the plan");

  await coachCompletionPanel
    .getByRole("textbox", { name: "Coach Action Plan Completion Review Notes", exact: true })
    .fill("Client completed all weekly actions. Next plan can progress slightly.");

  await coachCompletionPanel.getByRole("button", { name: "Save Completion Review Notes" }).click();

  await expect(page.getByTestId("coach-action-plan-completion-review-status").first()).toContainText("Coach completion review notes saved");
});
﻿
test("coach can generate weekly adjustment and client can view it", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.location.search.includes("portalMode=client")) {
      window.localStorage.removeItem("nlf-coach-weekly-adjustment-recommendations-v1");
    }

    window.localStorage.setItem(
      "nlf-nutrition-history-v1",
      JSON.stringify({
        targets: [
          {
            id: "target-adjustment-test",
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
            id: "meal-adjustment-test",
            title: "Meal Builder Estimate",
            calories: 850,
            protein: 40,
            carbs: 95,
            fat: 25,
            confidence: "High",
            matches: [
              { id: "item-1", name: "Chicken bowl", category: "Meal", calories: 650 }
            ]
          }
        ]
      })
    );

    window.localStorage.setItem(
      "nlf-client-weekly-checkins-v1",
      JSON.stringify([
        {
          id: "client-adjustment-checkin-current",
          checkInDate: "2026-07-11",
          checkInWeight: "198.4",
          waistMeasurement: "34.5",
          adherenceScore: "80",
          workoutsCompleted: "4",
          proteinConsistency: "4",
          hungerScore: "3",
          energyScore: "2",
          sleepScore: "2",
          stressScore: "4",
          digestionScore: "3",
          recoveryScore: "2",
          clientCheckInNotes: "Energy was low this week.",
          savedAt: "Test current"
        },
        {
          id: "client-adjustment-checkin-previous",
          checkInDate: "2026-07-04",
          checkInWeight: "200.0",
          waistMeasurement: "35",
          adherenceScore: "80",
          workoutsCompleted: "3",
          proteinConsistency: "3",
          hungerScore: "3",
          energyScore: "3",
          sleepScore: "3",
          stressScore: "3",
          digestionScore: "3",
          recoveryScore: "3",
          clientCheckInNotes: "Previous week.",
          savedAt: "Test previous"
        }
      ])
    );

    window.localStorage.setItem(
      "nlf-client-progress-photos-v1",
      JSON.stringify([
        {
          id: "photo-adjustment-test",
          photoDate: "2026-07-11",
          photoCheckInNotes: "Same lighting.",
          frontPhoto: { name: "front.png", dataUrl: "data:image/png;base64,test" },
          sidePhoto: { name: "side.png", dataUrl: "data:image/png;base64,test" },
          backPhoto: { name: "back.png", dataUrl: "data:image/png;base64,test" },
          savedAt: "Test"
        }
      ])
    );

    window.localStorage.setItem(
      "nlf-coach-client-weekly-action-plans-v1",
      JSON.stringify([
        {
          id: "coach-action-plan-adjustment-test",
          planTitle: "Recovery First Weekly Plan",
          priorityFocus: "Recovery, sleep, and consistency",
          nutritionAction: "Hit protein first and keep calories steady.",
          trainingAction: "Keep training controlled.",
          habitAction: "Sleep target.",
          clientMessage: "Focus on sleep and recovery.",
          savedAt: "Test"
        }
      ])
    );

    window.localStorage.setItem(
      "nlf-client-action-plan-completions-v1",
      JSON.stringify([
        {
          id: "client-completion-adjustment-test",
          actionPlanId: "coach-action-plan-adjustment-test",
          planTitle: "Recovery First Weekly Plan",
          priorityFocus: "Recovery, sleep, and consistency",
          nutritionComplete: true,
          trainingComplete: true,
          habitComplete: true,
          messageReviewed: true,
          completedItems: 4,
          totalItems: 4,
          completionPercent: 100,
          clientCompletionNotes: "Completed all actions.",
          savedAt: "Test"
        }
      ])
    );
  });

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();
  await expect(page.getByTestId("coach-checkins-workspace").first()).toBeVisible();

  const adjustmentPanel = page.getByTestId("coach-weekly-adjustment-recommendation").first();

  await expect(adjustmentPanel).toBeVisible();
  await expect(adjustmentPanel).toContainText("Coach Recommendation Engine");
  await expect(page.getByTestId("coach-adjustment-data-snapshot").first()).toContainText("Completion: 100%");
  await expect(page.getByTestId("coach-adjustment-risk-flags").first()).toContainText("Sleep is poor");

  await adjustmentPanel.getByRole("button", { name: "Generate Weekly Adjustment" }).click();

  await expect(page.getByTestId("coach-weekly-adjustment-status").first()).toContainText("Weekly adjustment recommendation generated");
  await expect(adjustmentPanel.getByLabel("Coach Adjustment Recommendation Type")).toHaveValue("Prioritize Recovery");
  await expect(adjustmentPanel.getByLabel("Coach Adjustment Summary")).toHaveValue("Keep calories steady and fix recovery first.");

  await adjustmentPanel
    .getByRole("textbox", { name: "Coach Adjustment Client Message", exact: true })
    .fill("Keep calories steady this week and focus on sleep, recovery, protein, and water.");

  await adjustmentPanel.getByRole("button", { name: "Save Weekly Adjustment" }).click();

  await expect(page.getByTestId("coach-weekly-adjustment-status").first()).toContainText("Weekly adjustment saved");
  await expect(page.getByTestId("coach-saved-adjustment-card").first()).toContainText("Prioritize Recovery");
  await expect(page.getByTestId("coach-saved-adjustment-card").first()).toContainText("Keep calories steady");

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  const clientAdjustmentPanel = page.getByTestId("client-latest-coach-adjustment").first();

  await expect(clientAdjustmentPanel).toBeVisible();
  await expect(page.getByTestId("client-coach-adjustment-card").first()).toContainText("Prioritize Recovery");
  await expect(page.getByTestId("client-coach-adjustment-card").first()).toContainText("Keep calories steady this week");
});

test("check-ins workspace contains moved check-in tools and coach can generate workout log from notes", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("nlf-coach-generated-workout-logs-v1");
  });

  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();
  await expect(page.getByTestId("client-checkins-workspace")).toHaveCount(0);

  await page.getByTestId("client-dashboard-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();

  await expect(page.getByTestId("client-checkins-workspace").first()).toBeVisible();
  await expect(page.getByTestId("client-checkins-workspace").first()).toContainText("Client Check-Ins Workspace");
  await expect(page.getByTestId("client-checkins-workspace").first()).toContainText("Weekly Client Check-In");
  await expect(page.getByTestId("client-checkins-workspace").first()).toContainText("Progress Photos");
  await expect(page.getByTestId("client-checkins-workspace").first()).toContainText("Action Plan Completion");

  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: "Nutrition Coach", exact: true })
    .click();

  await expect(page.getByTestId("nutrition-coach-window").first()).toBeVisible();
  await expect(page.getByTestId("client-weekly-checkin-form")).toHaveCount(0);
  await expect(page.getByTestId("client-progress-photo-upload-panel")).toHaveCount(0);

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();
  await expect(page.getByTestId("coach-checkins-workspace")).toHaveCount(0);

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();

  const coachCheckIns = page.getByTestId("coach-checkins-workspace").first();

  await expect(coachCheckIns).toBeVisible();
  await expect(coachCheckIns).toContainText("Coach Check-Ins Workspace");
  await expect(coachCheckIns).toContainText("Workout Notes Parser");

  const workoutGenerator = page.getByTestId("coach-workout-notes-log-generator").first();

  await workoutGenerator
    .getByRole("textbox", { name: "Paste Workout Notes", exact: true })
    .fill(`Client: Jordan
Date: 2026-07-11
Workout: Upper Body Strength
Bench Press 3x8 @ 135
Lat Pulldown 3x10 @ 100
DB Shoulder Press 2x12 @ 35
Notes: Strong form, fatigue on last set.`);

  await workoutGenerator.getByRole("button", { name: "Generate Workout Log" }).click();

  await expect(page.getByTestId("coach-workout-log-generator-status").first()).toContainText("Workout log generated");
  await expect(page.getByTestId("coach-generated-workout-log").first()).toContainText("Jordan");
  await expect(page.getByTestId("coach-generated-workout-log").first()).toContainText("Upper Body Strength");
  await expect(page.getByTestId("coach-generated-workout-log").first()).toContainText("Bench Press");
  await expect(page.getByTestId("coach-generated-workout-log").first()).toContainText("135 lb");

  await workoutGenerator.getByRole("button", { name: "Save Edited Workout Log" }).click();

  await expect(page.getByTestId("coach-workout-log-generator-status").first()).toContainText("Edited workout log saved");
  await expect(page.getByTestId("coach-latest-saved-workout-log").first()).toContainText("Jordan");
});

test("coach can edit generated workout log before saving", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("nlf-coach-generated-workout-logs-v1");
  });

  await page.goto("/?testUnlock=true&portalMode=coach");

  await expect(page.getByText("Coach Command Center").first()).toBeVisible();

  await page.getByTestId("coach-command-tab-strip").getByRole("tab", { name: "Check-Ins", exact: true }).click();

  const workoutGenerator = page.getByTestId("coach-workout-notes-log-generator").first();

  await expect(workoutGenerator).toBeVisible();

  await workoutGenerator
    .getByRole("textbox", { name: "Paste Workout Notes", exact: true })
    .fill(`Client: Jordan
Date: 2026-07-11
Workout: Upper Body Strength
Bench Press 3x8 @ 135
Lat Pulldown 3x10 @ 100
DB Shoulder Press 2x12 @ 35
Notes: Strong form, fatigue on last set.`);

  await workoutGenerator.getByRole("button", { name: "Generate Workout Log" }).click();

  await expect(page.getByTestId("coach-workout-log-generator-status").first()).toContainText("Workout log generated");
  await expect(page.getByTestId("coach-generated-workout-log").first()).toContainText("Bench Press");

  await workoutGenerator.getByLabel("Generated Client Name").fill("Jordan Smith");
  await workoutGenerator.getByLabel("Generated Workout Focus").fill("Upper Body Strength - Edited");
  await workoutGenerator.getByLabel("Exercise 1 Name").fill("Barbell Bench Press");
  await workoutGenerator.getByLabel("Exercise 1 Sets").fill("4");
  await workoutGenerator.getByLabel("Exercise 1 Reps").fill("6");
  await workoutGenerator.getByLabel("Exercise 1 Weight").fill("145 lb");
  await workoutGenerator.getByLabel("Exercise 1 Notes").fill("Smooth reps after warm-up.");

  await workoutGenerator.getByRole("button", { name: "Remove" }).nth(1).click();

  await expect(page.getByTestId("coach-generated-workout-log-totals").first()).toContainText("2 exercises");
  await expect(page.getByTestId("coach-generated-workout-log-totals").first()).toContainText("6 total sets");

  await workoutGenerator.getByRole("button", { name: "Add Exercise Row" }).click();

  await workoutGenerator.getByLabel("Exercise 3 Name").fill("Face Pull");
  await workoutGenerator.getByLabel("Exercise 3 Sets").fill("3");
  await workoutGenerator.getByLabel("Exercise 3 Reps").fill("15");
  await workoutGenerator.getByLabel("Exercise 3 Weight").fill("40 lb");
  await workoutGenerator.getByLabel("Exercise 3 Notes").fill("Controlled tempo.");

  await expect(page.getByTestId("coach-generated-workout-log-totals").first()).toContainText("3 exercises");
  await expect(page.getByTestId("coach-generated-workout-log-totals").first()).toContainText("9 total sets");

  await workoutGenerator
    .getByRole("textbox", { name: "Generated Coach Notes", exact: true })
    .fill("Edited after reviewing Notepad notes. Keep pressing volume steady.");

  await workoutGenerator.getByRole("button", { name: "Save Edited Workout Log" }).click();

  await expect(page.getByTestId("coach-workout-log-generator-status").first()).toContainText("Edited workout log saved");
  await expect(page.getByTestId("coach-latest-saved-workout-log").first()).toContainText("Jordan Smith");
  await expect(page.getByTestId("coach-latest-saved-workout-log").first()).toContainText("Upper Body Strength - Edited");
  await expect(page.getByTestId("coach-latest-saved-workout-log").first()).toContainText("Barbell Bench Press");
  await expect(page.getByTestId("coach-latest-saved-workout-log").first()).toContainText("Face Pull");
});

test("workout plans tab combines builder and previous plans", async ({ page }) => {
  await page.goto("/?testUnlock=true&portalMode=client");

  await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

  const workoutPlansButton = page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name: /Workout Plans/i })
    .first();

  await workoutPlansButton.click();

  const workoutPlansHub = page.getByTestId("client-workout-plans-hub").first();

  await expect(workoutPlansHub).toBeVisible();
  await expect(workoutPlansHub).toContainText("Workout Plans");
  await expect(page.getByTestId("workout-plans-builder-section").first()).toBeVisible();

  await page
    .getByTestId("workout-plans-view-switcher")
    .getByRole("tab", { name: "Previous Plans", exact: true })
    .click();

  await expect(page.getByTestId("workout-plans-previous-section").first()).toBeVisible();

  await page
    .getByTestId("workout-plans-view-switcher")
    .getByRole("tab", { name: "Show Both", exact: true })
    .click();

  await expect(page.getByTestId("workout-plans-builder-section").first()).toBeVisible();
  await expect(page.getByTestId("workout-plans-previous-section").first()).toBeVisible();
});
