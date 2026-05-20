import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

async function openClientExerciseLibrary(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("no-limit-fitness-portal-mode-v1", "client");
    window.localStorage.removeItem("no-limit-fitness-coach-session-lock-v1");
  });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });
  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });

  const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();
  await expect(nav).toBeVisible();

  await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
  await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);

  await nav.getByRole("button", { name: /^Exercises$/ }).click();

  await expect(
    page.getByRole("heading", { name: /Client-Safe Exercise Library/i })
  ).toBeVisible();
}

test.describe("No Limit Fitness Bundle 12N client-safe exercise library", () => {
  test("shows searchable exercise instructions and substitutions without coach edit controls", async ({ page }) => {
    await openClientExerciseLibrary(page);

    await expect(page.getByTestId("client-safe-exercise-library")).toBeVisible();
    await expect(page.getByText(/Coach edit controls are not available/i)).toBeVisible();

    const search = page.getByPlaceholder(/Search exercises/i);
    await search.fill("machine press");

    await expect(page.getByTestId("exercise-card").first()).toBeVisible();
    await expect(page.getByText(/Substitution Options/i).first()).toBeVisible();
    await expect(page.getByText(/Instructions\/Notes/i).first()).toBeVisible();

    await expect(page.getByRole("button", { name: /Add to Plan/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Remove exercise/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Save Exercise/i })).toHaveCount(0);
  });
});
