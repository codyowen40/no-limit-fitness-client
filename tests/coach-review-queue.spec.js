import { expect, test } from "@playwright/test";


async function nlfOpenMainNavButton(page, name) {
  await page
    .getByRole("navigation", { name: /Main navigation/i })
    .first()
    .getByRole("button", { name, exact: true })
    .click();
}

async function nlfFindSavedPlanInLocalStorage(page, draftTitle) {
  return page.evaluate((title) => {
    function planMatchesTitle(plan) {
      if (!plan || typeof plan !== "object") return false;

      return [
        plan.planName,
        plan.title,
        plan.goal,
        plan.clientName,
        plan.source,
        plan.approvalStatus,
        plan.status,
      ]
        .filter(Boolean)
        .join(" ")
        .includes(title);
    }

    function normalizeSavedPlan(key, plan) {
      return {
        key,
        id: plan.id,
        title: plan.title,
        planName: plan.planName || plan.title,
        clientId: plan.clientId,
        clientName: plan.clientName,
        status: plan.status,
        approvalStatus: plan.approvalStatus,
        source: plan.source,
        dayCount: Array.isArray(plan.days) ? plan.days.length : 0,
      };
    }

    function scanForSavedPlans(value, key) {
      if (!value || typeof value !== "object") return [];

      const matches = [];

      if (Array.isArray(value.savedPlans)) {
        for (const plan of value.savedPlans) {
          if (planMatchesTitle(plan)) {
            matches.push(normalizeSavedPlan(key, plan));
          }
        }
      }

      for (const childValue of Object.values(value)) {
        if (childValue && typeof childValue === "object") {
          matches.push(...scanForSavedPlans(childValue, key));
        }
      }

      return matches;
    }

    const matches = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      const raw = window.localStorage.getItem(key);

      try {
        const parsed = JSON.parse(raw);
        matches.push(...scanForSavedPlans(parsed, key));
      } catch {
        // Ignore non-JSON localStorage entries.
      }
    }

    return (
      matches.find(
        (plan) =>
          plan.planName === title &&
          plan.approvalStatus === "coach-approved" &&
          plan.source === "Coach Review Queue"
      ) ||
      matches.find((plan) => plan.planName === title) ||
      null
    );
  }, draftTitle);
}


async function nlfCountSavedPlanMatchesInLocalStorage(page, draftTitle) {
  return page.evaluate((title) => {
    function planMatchesTitle(plan) {
      if (!plan || typeof plan !== "object") return false;

      return [plan.planName, plan.title]
        .filter(Boolean)
        .join(" ")
        .includes(title);
    }

    function scanForSavedPlans(value) {
      if (!value || typeof value !== "object") return [];

      const matches = [];

      if (Array.isArray(value.savedPlans)) {
        for (const plan of value.savedPlans) {
          if (planMatchesTitle(plan)) {
            matches.push({
              id: plan.id,
              planName: plan.planName || plan.title,
              approvalStatus: plan.approvalStatus,
              source: plan.source,
            });
          }
        }
      }

      for (const childValue of Object.values(value)) {
        if (childValue && typeof childValue === "object") {
          matches.push(...scanForSavedPlans(childValue));
        }
      }

      return matches;
    }

    const matches = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const raw = window.localStorage.getItem(window.localStorage.key(index));

      try {
        matches.push(...scanForSavedPlans(JSON.parse(raw)));
      } catch {
        // Ignore non-JSON localStorage entries.
      }
    }

    return matches;
  }, draftTitle);
}

async function createClientWorkoutDraft(page, draftTitle, draftNotes) {
  await page.goto("/?testUnlock=true&portalMode=client");

  await nlfOpenMainNavButton(page, "Build Workout Plan");

  await page.getByRole("button", { name: "Build a Plan" }).first().click();

  const builder = page.getByTestId("client-build-edit-plan-flow").first();

  await expect(builder).toBeVisible();

  const firstField = builder.locator("input:visible, textarea:visible").first();

  await expect(firstField).toBeVisible();

  await firstField.fill(draftTitle);

  const textAreas = builder.locator("textarea:visible");
  const textAreaCount = await textAreas.count();

  if (textAreaCount > 0) {
    await textAreas.last().fill(draftNotes);
  }

  await page.getByRole("button", { name: /Save Draft/i }).first().click();

  await expect(page.locator("body")).toContainText(draftTitle);
}

async function approveClientWorkoutDraft(page, draftTitle) {
  await page.goto("/?testUnlock=true&portalMode=coach");

  await nlfOpenMainNavButton(page, "Plans");

  await expect(page.getByTestId("coach-client-plan-review-queue").first()).toBeVisible();
  await expect(page.getByTestId("coach-pending-client-plan-draft").first()).toContainText(draftTitle);

  await page.getByRole("button", { name: /Approve Draft/i }).first().click();

  await expect(page.locator("body")).toContainText(/approved|assigned|active plan/i);
  await expect(page.locator("body")).toContainText(draftTitle);
}

test.describe("Coach review queue", () => {
  test("coach can see and approve a client workout draft", async ({ page }) => {
    const draftTitle = "Coach Review Strength Draft";

    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();

    const firstField = builder.locator("input:visible, textarea:visible").first();

    await expect(firstField).toBeVisible();

    await firstField.fill(draftTitle);

    const textAreas = builder.locator("textarea:visible");
    const textAreaCount = await textAreas.count();

    if (textAreaCount > 0) {
      await textAreas.last().fill("Day 1 - Back Squat, Bench Press, Row. Coach review required before assignment.");
    }

    await page.getByRole("button", { name: /Save Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(draftTitle);

    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Plans" })
      .click();

    await expect(page.getByTestId("coach-client-plan-review-queue").first()).toBeVisible();
    await expect(page.getByTestId("coach-pending-client-plan-draft").first()).toContainText(draftTitle);

    await page.getByRole("button", { name: /Approve Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(/approved|assigned|active plan/i);
    await expect(page.locator("body")).toContainText(draftTitle);
  });

  test("approved client draft becomes visible as the client assigned plan", async ({ page }) => {
    const draftTitle = "Approved Client Assigned Draft";

    await page.goto("/?testUnlock=true&portalMode=client");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Build Workout Plan", exact: true })
      .click();

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();

    const firstField = builder.locator("input:visible, textarea:visible").first();

    await expect(firstField).toBeVisible();

    await firstField.fill(draftTitle);

    const textAreas = builder.locator("textarea:visible");
    const textAreaCount = await textAreas.count();

    if (textAreaCount > 0) {
      await textAreas.last().fill("Day 1 - Squat, Bench, Deadlift assistance. Approved plan should show in client view.");
    }

    await page.getByRole("button", { name: /Save Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(draftTitle);

    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Plans" })
      .click();

    await expect(page.getByTestId("coach-client-plan-review-queue").first()).toBeVisible();
    await expect(page.getByTestId("coach-pending-client-plan-draft").first()).toContainText(draftTitle);

    await page.getByRole("button", { name: /Approve Draft/i }).first().click();

    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page.getByRole("button", { name: "View Full Plan" }).first().click();

    await expect(page.getByTestId("client-full-assigned-plan").first()).toBeVisible();
    await expect(page.locator("body")).toContainText(draftTitle);
  });
  test("approved client draft syncs into normal assigned plans for tracker flow", async ({ page }) => {
    const draftTitle = "Approved Normal Assigned Plan Draft";

    await page.goto("/?testUnlock=true&portalMode=client");

    await nlfOpenMainNavButton(page, "Build Workout Plan");

    await page.getByRole("button", { name: "Build a Plan" }).first().click();

    const builder = page.getByTestId("client-build-edit-plan-flow").first();

    await expect(builder).toBeVisible();

    const firstField = builder.locator("input:visible, textarea:visible").first();

    await expect(firstField).toBeVisible();

    await firstField.fill(draftTitle);

    const textAreas = builder.locator("textarea:visible");
    const textAreaCount = await textAreas.count();

    if (textAreaCount > 0) {
      await textAreas.last().fill("Day 1 - Squat, Bench, Deadlift assistance. This should become a normal saved assigned plan.");
    }

    await page.getByRole("button", { name: /Save Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(draftTitle);

    await page.goto("/?testUnlock=true&portalMode=coach");

    await nlfOpenMainNavButton(page, "Plans");

    await expect(page.getByTestId("coach-client-plan-review-queue").first()).toBeVisible();
    await expect(page.getByTestId("coach-pending-client-plan-draft").first()).toContainText(draftTitle);

    await page.getByRole("button", { name: /Approve Draft/i }).first().click();

    await expect(page.locator("body")).toContainText(/approved|assigned|active plan/i);
    await expect(page.locator("body")).toContainText(draftTitle);

    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await expect
      .poll(async () => nlfFindSavedPlanInLocalStorage(page, draftTitle), {
        timeout: 7000,
      })
      .toEqual(
        expect.objectContaining({
          planName: draftTitle,
          approvalStatus: "coach-approved",
          source: "Coach Review Queue",
        })
      );

    const savedPlan = await nlfFindSavedPlanInLocalStorage(page, draftTitle);

    expect(savedPlan.dayCount).toBeGreaterThan(0);

    await nlfOpenMainNavButton(page, "Tracker");

    await expect(page.getByText("Client Workout Tracker", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText(draftTitle);
  });

  test("approved client draft does not duplicate normal assigned plans after reload", async ({ page }) => {
    const draftTitle = "Approved Duplicate Guard Draft";

    await createClientWorkoutDraft(
      page,
      draftTitle,
      "Day 1 - Squat, Bench, Deadlift assistance. Duplicate guard should keep one normal assigned plan."
    );

    await approveClientWorkoutDraft(page, draftTitle);

    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await expect
      .poll(async () => nlfFindSavedPlanInLocalStorage(page, draftTitle), {
        timeout: 7000,
      })
      .toEqual(
        expect.objectContaining({
          planName: draftTitle,
          approvalStatus: "coach-approved",
          source: "Coach Review Queue",
        })
      );

    await page.reload();

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const matches = await nlfCountSavedPlanMatchesInLocalStorage(page, draftTitle);
    const coachApprovedMatches = matches.filter(
      (plan) =>
        plan.planName === draftTitle &&
        plan.approvalStatus === "coach-approved" &&
        plan.source === "Coach Review Queue"
    );

    expect(coachApprovedMatches).toHaveLength(1);
  });

});
