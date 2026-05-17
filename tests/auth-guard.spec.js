import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openCleanLogin(page) {
  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

  await page.evaluate(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).toBeAttached();
}

test.describe("No Limit Fitness auth guard", () => {
  test("login auth panel loads safely without forcing real Supabase auth", async ({
    page,
  }) => {
    await openCleanLogin(page);

    await expect(
      page.getByRole("heading", { name: "Authentication Later" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Auth Guard Status" })
    ).toBeVisible();

    await expect(
      page.getByText("Supabase Configuration")
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Supabase Login Test Panel" })
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Check Current Session" })
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Coach Login" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Client Login" })
    ).toBeVisible();

    await expect(
      page.getByLabel("Coach Email")
    ).toBeVisible();

    await expect(
      page.getByLabel("Coach Password")
    ).toBeVisible();

    await expect(
      page.getByLabel("Client Email")
    ).toBeVisible();

    await expect(
      page.getByLabel("Client Password")
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Test Supabase Coach Login" })
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Test Supabase Client Login" })
    ).toBeVisible();

    await expect(page.locator("main")).toContainText(/Auth Status/i);

    await page.getByRole("button", { name: "Check Current Session" }).click();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("main")).toContainText(/Auth Status/i);
  });
});