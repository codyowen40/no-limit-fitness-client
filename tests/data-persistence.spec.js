import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openUnlockedDemo(page, options = {}) {
  const { clearAppState = true } = options;

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(
    ({ storageKey, portalModeKey, testUnlockKey, shouldClearAppState }) => {
      if (shouldClearAppState) {
        window.localStorage.removeItem(storageKey);
      }

      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "coach");
    },
    {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
      shouldClearAppState: clearAppState,
    }
  );

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.getByRole("navigation").first()).toBeVisible();
}

async function openClientsPage(page) {
  const nav = page.getByRole("navigation").first();

  await nav.getByRole("button", { name: /^Clients$/ }).click();

  await expect(
    page.getByRole("heading", { name: "Client Management" })
  ).toBeVisible();

  return nav;
}

test.describe("No Limit Fitness local data persistence", () => {
  test("saves a new client locally and keeps it after refresh", async ({ page }) => {
    const clientName = "Bundle 5A Persistence Client";
    const clientEmail = "bundle5a.persistence@nolimittest.com";

    await openUnlockedDemo(page);

    const nav = await openClientsPage(page);

    await page.getByLabel("Client Name").fill(clientName);
    await page.getByLabel("Client Email").fill(clientEmail);
    await page.getByRole("button", { name: /^Add Client$/ }).click();

    await expect(page.getByText(clientName).first()).toBeVisible();
    await expect(page.getByText(clientEmail).first()).toBeVisible();

    const savedStateBeforeRefresh = await page.evaluate(({ storageKey }) => {
      const rawState = window.localStorage.getItem(storageKey);
      return rawState ? JSON.parse(rawState) : null;
    }, { storageKey: STORAGE_KEY });

    expect(savedStateBeforeRefresh).toBeTruthy();

    expect(
      savedStateBeforeRefresh.clients.some((client) => client.name === clientName)
    ).toBeTruthy();

    expect(
      savedStateBeforeRefresh.clients.some((client) => client.email === clientEmail)
    ).toBeTruthy();

    expect(
      savedStateBeforeRefresh.conversations.some(
        (conversation) => conversation.clientName === clientName
      )
    ).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByRole("navigation").first()).toBeVisible();

    await nav.getByRole("button", { name: /^Clients$/ }).click();

    await expect(page.getByText(clientName).first()).toBeVisible();
    await expect(page.getByText(clientEmail).first()).toBeVisible();
  });

  test("falls back safely when local data is corrupted", async ({ page }) => {
    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(storageKey, "{bad-json");
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "coach");
    }, {
      storageKey: STORAGE_KEY,
      portalModeKey: PORTAL_MODE_KEY,
      testUnlockKey: TEST_UNLOCK_KEY,
    });

    await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.getByRole("navigation").first()).toBeVisible();

    await openClientsPage(page);

    await expect(page.getByText("Sample Client").first()).toBeVisible();
    await expect(page.getByText("Athlete Demo").first()).toBeVisible();
  });

  test("clear local data resets custom client data", async ({ page }) => {
    const clientName = "Bundle 5A Clear Test Client";
    const clientEmail = "bundle5a.clear@nolimittest.com";

    await openUnlockedDemo(page);

    const nav = await openClientsPage(page);

    await page.getByLabel("Client Name").fill(clientName);
    await page.getByLabel("Client Email").fill(clientEmail);
    await page.getByRole("button", { name: /^Add Client$/ }).click();

    await expect(page.getByText(clientName).first()).toBeVisible();
    await expect(page.getByText(clientEmail).first()).toBeVisible();

    await nav.getByRole("button", { name: /^Home$/ }).click();

    await expect(
      page.getByRole("heading", {
        name: "Coach-to-client workout tracking system.",
      })
    ).toBeVisible();

    await page.getByRole("button", { name: /^Clear Local Data$/ }).click();

    await expect(
      page.getByText("Local data cleared. Starter data restored.")
    ).toBeVisible();

    await nav.getByRole("button", { name: /^Clients$/ }).click();

    await expect(page.getByText("Sample Client").first()).toBeVisible();
    await expect(page.getByText("Athlete Demo").first()).toBeVisible();
    await expect(page.getByText(clientName)).toHaveCount(0);
    await expect(page.getByText(clientEmail)).toHaveCount(0);
  });
});