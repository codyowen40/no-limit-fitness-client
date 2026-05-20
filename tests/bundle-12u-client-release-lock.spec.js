import { test, expect } from "@playwright/test";

test.describe("Bundle 12U client release lock", () => {
  test("keeps public client portal clean and client-safe", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#root")).toBeAttached();

    const dashboard = page.getByLabel("Client My Plan dashboard").first();
    await expect(dashboard).toBeVisible();

    await expect(page.getByLabel("Client nutrition and macros guide").first()).toBeVisible();
    await expect(page.getByLabel("Client exercise search and substitution guide").first()).toBeVisible();

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages$/ })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toHaveCount(0);

    await expect(page.getByText(/Demo Preview|Portal Mode|Supabase|backend|database/i)).toHaveCount(0);
  });

  test("keeps coach test unlock available without public demo wording", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.locator("#root")).toBeAttached();

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();

    await expect(page.getByText(/Demo Preview|Portal Mode/i)).toHaveCount(0);
  });

  test("keeps View Full Plan routing available when assigned plan action is present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const viewFullPlan = page.getByRole("button", { name: "View Full Plan" }).first();

    if ((await viewFullPlan.count()) > 0) {
      await expect(viewFullPlan).toBeVisible();
      await viewFullPlan.click();
      await expect(page.getByTestId("client-full-assigned-plan").first()).toBeVisible();
    }
  });
});
