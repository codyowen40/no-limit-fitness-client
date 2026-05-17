import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";
const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openUnlockedDemo(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ storageKey, portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(storageKey);
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "demo");
  }, {
    storageKey: STORAGE_KEY,
    portalModeKey: PORTAL_MODE_KEY,
    testUnlockKey: TEST_UNLOCK_KEY,
  });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("main")).toBeVisible();
}

test.describe("No Limit Fitness nav polish", () => {
  test("offsets Home and Login while keeping main tabs alphabetical", async ({
    page,
  }) => {
    await openUnlockedDemo(page);

    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const homeNav = page.locator('[data-nlf-home-nav="true"]');
    const mainNav = page.locator('[data-nlf-main-nav="true"]');
    const accountNav = page.locator('[data-nlf-account-nav="true"]');

    await expect(nav).toBeVisible();
    await expect(homeNav).toBeVisible();
    await expect(mainNav).toBeVisible();
    await expect(accountNav).toBeVisible();

    await expect(homeNav.getByRole("button", { name: /^Home$/ })).toBeVisible();

    await expect(
      accountNav.getByRole("button", { name: /^(Login|Logout)$/ })
    ).toBeVisible();

    await expect(mainNav.getByRole("button", { name: /^Home$/ })).toHaveCount(0);

    await expect(
      mainNav.getByRole("button", { name: /^(Login|Logout)$/ })
    ).toHaveCount(0);

    await expect(
      mainNav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
    ).toHaveCount(1);

    const mainLabels = await mainNav.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) =>
        String(button.textContent || "")
          .replace(/\s*\d+$/, "")
          .trim()
      )
    );

    expect(mainLabels).toEqual([
      "Client",
      "Clients",
      "Coach",
      "Exercises",
      "Messages",
      "Plans",
      "Progress",
      "Tracker",
    ]);

    const messagesButton = mainNav.getByRole("button", {
      name: /^Messages(?:\s+\d+)?$/,
    });

    const messagesClassName = await messagesButton.evaluate((button) =>
      String(button.className || "")
    );

    expect(messagesClassName).not.toContain("uppercase");
  });
});
