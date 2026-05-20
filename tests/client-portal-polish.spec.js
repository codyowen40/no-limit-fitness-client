import { test, expect } from "@playwright/test";

const LOCAL_URL = "http://localhost:5173/";
const TEST_UNLOCK_URL = "http://localhost:5173/?testUnlock=true";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

async function openPublicClient(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.removeItem(portalModeKey);
    window.localStorage.removeItem(testUnlockKey);
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });
}

async function openInternalDemo(page) {
  await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
    window.localStorage.setItem(testUnlockKey, "true");
    window.localStorage.setItem(portalModeKey, "demo");
  }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

  await page.goto(TEST_UNLOCK_URL, { waitUntil: "domcontentloaded" });
}

test.describe("No Limit Fitness client portal polish", () => {
  test("slims public client portal and shows a clear My Plan dashboard", async ({ page }) => {
    await openPublicClient(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^(Login|Logout)$/ })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);

    await expect(page.locator("main")).toContainText("My Plan");
    await expect(page.locator("main")).toContainText("Today's Workout");
    await expect(page.locator("main")).toContainText("This Week");

    await expect(page.getByRole("button", { name: /Log Workout/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Message Coach/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /View Progress/i })).toBeVisible();

    await expect(page.getByLabel("No Limit Nutrition Coach")).toBeVisible();
    await expect(page.locator("main")).toContainText("What do you need help with today?");
    await expect(page.getByRole("button", { name: /^Build My Target$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Check What I Ate$/ })).toBeVisible();

    await page.getByRole("button", { name: /^Build My Target$/ }).click();

    await expect(page.locator("main")).toContainText("Basic Questions");

    await page.getByLabel("Sex").selectOption("male");
    await page.getByLabel("Age").fill("32");
    await page.getByLabel("Height feet").fill("6");
    await page.getByLabel("Height inches").fill("0");
    await page.getByLabel("Current body weight in pounds").fill("200");
    await page.getByLabel("Main goal").selectOption("lean-bulk");
    await page.getByLabel("Meals per day").selectOption("4");
    await page.getByLabel("Job or daily activity").selectOption("physical-job");

    await page.getByRole("button", { name: /Show My Target/i }).click();

    await expect(page.locator("main")).toContainText("estimated maintenance");
    await expect(page.locator("main")).toContainText("Lean Bulk");
    await expect(page.locator("main")).toContainText("Goal Comparison");
    await expect(page.locator("main")).toContainText("Calories Are The Baseline");
    await expect(page.locator("main")).toContainText("Example Flexible Option");
    await expect(page.locator("main")).toContainText("meals do not have to be split perfectly even");

    await page.getByRole("button", { name: /^Check What I Ate$/ }).click();

    await expect(page.locator("main")).toContainText("Portion-Smart Meal Check");
    await expect(page.locator("main")).toContainText("Portion size + brand + cooking method");

    await page
      .getByLabel("Meal description")
      .fill("3 eggs, 2 pieces of toast, a banana, and a Premier Protein shake");

    await page.getByRole("button", { name: /Estimate Meal/i }).click();

    await expect(page.locator("main")).toContainText("Estimated Meal Feedback");
    await expect(page.locator("main")).toContainText("Estimate confidence");
    await expect(page.locator("main")).toContainText("Good protein");
    await expect(page.locator("main")).toContainText("Accuracy Note");
    await expect(page.locator("main")).toContainText("One Helpful Follow-Up");

    await nav.getByRole("button", { name: /^Exercises$/ }).click();
    await expect(page.locator("main")).toContainText("Exercise Library");
    await expect(page.locator("main")).toContainText("safe substitutions");

    await nav.getByRole("button", { name: /^Client$/ }).click();
    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();

    await page.getByRole("button", { name: /Log Workout/i }).click();
    await expect(page.locator("main")).toBeVisible();
  });

  test("layers public client navigation on mobile without removing functions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPublicClient(page);

    const mobileNav = page.getByRole("navigation", { name: /Mobile navigation/i });
    const desktopNav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();
    await expect(page.getByLabel("Client quick actions")).toBeVisible();

    await expect(page.getByLabel("Mobile nutrition coach card")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Open Nutrition Coach$/ })).toBeVisible();
    await expect(page.getByLabel("No Limit Nutrition Coach")).toBeHidden();

    await page.getByRole("button", { name: /^Open Nutrition Coach$/ }).click();
    await expect(page.locator("main")).toContainText("What do you need help with today?");
    await expect(page.getByRole("button", { name: /^Build My Target$/ })).toBeVisible();


    await expect(mobileNav.getByRole("button", { name: /^My Plan$/ })).toBeVisible();
    await expect(mobileNav.getByRole("button", { name: /^Log$/ })).toBeVisible();
    await expect(mobileNav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(mobileNav.getByRole("button", { name: /^More$/ })).toBeVisible();

    await expect(desktopNav.getByRole("button", { name: /^Exercises$/ })).toBeHidden();

    await mobileNav.getByRole("button", { name: /^More$/ }).click();

    const moreMenu = page.getByLabel("Mobile More menu");

    await expect(moreMenu).toBeVisible();
    await expect(moreMenu.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(moreMenu.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })).toBeVisible();
    await expect(moreMenu.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(moreMenu.getByRole("button", { name: /^(Login|Logout)$/ })).toBeVisible();

    await moreMenu.getByRole("button", { name: /^Exercises$/ }).click();
    await expect(page.locator("main")).toContainText("Exercise Library");
    await expect(page.locator("main")).toContainText("safe substitutions");

    await mobileNav.getByRole("button", { name: /^More$/ }).click();
    await moreMenu.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ }).click();
    await expect(page.locator("main")).toContainText("Messages");

    await mobileNav.getByRole("button", { name: /^Log$/ }).click();
    await expect(page.locator("main")).toBeVisible();

    await mobileNav.getByRole("button", { name: /^My Plan$/ }).click();
    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();
  });

  test("plain public client URL ignores stale test unlock storage", async ({ page }) => {
    await page.addInitScript(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "demo");
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.goto(LOCAL_URL, { waitUntil: "domcontentloaded" });

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(page.getByLabel("Client My Plan dashboard")).toBeVisible();
    await expect(page.getByText(/Portal Mode/i)).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);
  });

  test("keeps full internal demo navigation available for coach testing", async ({ page }) => {
    await openInternalDemo(page);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();

    await nav.getByRole("button", { name: /^Plans$/ }).click();
    await expect(page.getByLabel("Workout builder mode")).toBeVisible();
    await expect(page.getByLabel("Workout builder actions")).toBeVisible();
    await expect(page.locator("main")).toContainText("Creating New Plan");
    await expect(page.getByRole("button", { name: /^Save New Plan$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Clear Builder$/ })).toBeVisible();
  });
});

test("Bundle 12S client nutrition macros guide stays visible in My Plan", async ({ page }) => {
  await page.goto("/");

  const dashboard = page.getByLabel("Client My Plan dashboard").first();

  if (!(await dashboard.isVisible().catch(() => false))) {
    const navigationTargets = [
      page.getByRole("button", { name: /^Client$/ }).first(),
      page.getByRole("link", { name: /^Client$/ }).first(),
      page.getByRole("button", { name: /client portal/i }).first(),
      page.getByRole("link", { name: /client portal/i }).first(),
      page.getByRole("button", { name: /my plan/i }).first(),
      page.getByRole("link", { name: /my plan/i }).first(),
    ];

    for (const target of navigationTargets) {
      if (await target.count()) {
        await target.click().catch(() => {});
        if (await dashboard.isVisible().catch(() => false)) break;
      }
    }
  }

  await expect(dashboard).toBeVisible();

  const nutrition = page.getByLabel("Client nutrition and macros guide").first();
  await expect(nutrition).toBeVisible();
  await expect(nutrition).toContainText(/calories/i);
  await expect(nutrition).toContainText(/protein/i);
  await expect(nutrition).toContainText(/carbs/i);
  await expect(nutrition).toContainText(/fats/i);
});
