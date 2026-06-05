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
      page.getByRole("heading", { name: "Coach/Client Messaging" })
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
});
