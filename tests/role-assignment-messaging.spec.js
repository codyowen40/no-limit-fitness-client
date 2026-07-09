import { expect, test } from "@playwright/test";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "nlf-portal-mode-v1";
const TEST_UNLOCK_KEY = "nlf-test-unlock-v1";
const PUBLIC_PROFILE_KEY = "nlf-public-account-profile-v1";

function createMessagingState() {
  return {
    clients: [
      {
        id: "client-assigned",
        name: "Assigned Client",
        email: "assigned@example.com",
        status: "Active",
        coachId: "coach-primary",
        coachName: "No Limit Coach",
        coachingStatus: "assigned",
      },
      {
        id: "client-unassigned",
        name: "Unassigned Client",
        email: "unassigned@example.com",
        status: "Active",
      },
    ],
    savedPlans: [],
    workoutLogs: [],
    conversations: [
      {
        clientId: "client-assigned",
        clientName: "Assigned Client",
        messages: [
          {
            id: "assigned-message",
            sender: "Coach",
            body: "Assigned client thread only.",
            sentAt: "Sample message",
            timestamp: 1,
            unreadForCoach: false,
            unreadForClient: true,
          },
        ],
      },
      {
        clientId: "client-unassigned",
        clientName: "Unassigned Client",
        messages: [
          {
            id: "unassigned-message",
            sender: "Coach",
            body: "Unassigned client thread should not show.",
            sentAt: "Sample message",
            timestamp: 2,
            unreadForCoach: true,
            unreadForClient: true,
          },
        ],
      },
    ],
    readActivityIds: [],
    notificationPreferences: {},
    serverSettings: {},
  };
}

async function seedMessagingState(page, role) {
  await page.addInitScript(
    ({ storageKey, portalModeKey, testUnlockKey, profileKey, state, role }) => {
      window.localStorage.clear();
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, role);
      window.localStorage.setItem(
        profileKey,
        JSON.stringify({
          role,
          clientId: "client-assigned",
          name: role === "client" ? "Assigned Client" : "No Limit Coach",
          email: role === "client" ? "assigned@example.com" : "coach@nolimittest.com",
        })
      );
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      profileKey: PUBLIC_PROFILE_KEY,
      state: createMessagingState(),
      role,
    }
  );
}

async function openMessages(page, role) {
  await seedMessagingState(page, role);
  await page.goto("/?testUnlock=true&portalMode=" + role);

  const messagesButton = page.getByRole("button", { name: /^Messages(?:\\s+\\d+)?$/ }).first();

  if (await messagesButton.isVisible().catch(() => false)) {
    await messagesButton.click();
    return;
  }

  await page.getByRole("button", { name: /Messages/i }).first().click();
}

test.describe("Role and assignment messaging", () => {
  test("client mode only shows assigned coach conversation", async ({ page }) => {
    await openMessages(page, "client");

    await expect(page.getByRole("heading", { name: "Assigned Coach Messaging" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Assigned Client");
    await expect(page.locator("main")).toContainText("Assigned client thread only.");
    await expect(page.locator("main")).not.toContainText("Unassigned Client");
    await expect(page.locator("main")).not.toContainText("Unassigned client thread should not show.");
    await expect(page.locator("main")).toContainText("Messages send from your client account to your assigned coach.");
  });

  test("coach mode only shows assigned client conversations", async ({ page }) => {
    await openMessages(page, "coach");

    await expect(page.getByRole("heading", { name: "Assigned Client Messaging" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Assigned Client");
    await expect(page.locator("main")).toContainText("Assigned client thread only.");
    await expect(page.locator("main")).not.toContainText("Unassigned Client");
    await expect(page.locator("main")).not.toContainText("Unassigned client thread should not show.");
    await expect(page.locator("main")).toContainText("Messages send from your coach account to assigned clients.");
  });
});
