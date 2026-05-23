import { expect, test } from "@playwright/test";

test.describe("Bundle 12U client release lock", () => {
  test("keeps clean public URL locked to login before account access", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#root")).toBeAttached();
    await expect(page.locator("#root")).toContainText(
      /No Limit Fitness|Login|Log In|Sign In|Sign Up|Create Account|Email/i
    );

    await expect(page.getByLabel("Client My Plan dashboard").first()).toHaveCount(0);
    await expect(page.getByLabel("Client nutrition and macros guide").first()).toHaveCount(0);
    await expect(page.getByLabel("Client exercise search and substitution guide").first()).toHaveCount(0);

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Messages$/ })).toHaveCount(0);
  });

  test("keeps sign up action available from the login gate", async ({ page }) => {
    await page.goto("/");

    const signupAction = page
      .getByRole("button", { name: /sign up|create account|get started/i })
      .or(page.getByRole("link", { name: /sign up|create account|get started/i }))
      .first();

    await expect(signupAction).toBeVisible();
  });

  test("keeps internal test unlock available for release regression coverage", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();
    await expect(page.getByLabel("Client nutrition and macros guide").first()).toBeVisible();
    await expect(page.getByLabel("Client exercise search and substitution guide").first()).toBeVisible();

    const nav = page.getByRole("navigation", { name: /Main navigation/i }).first();

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^(Client|My Plan)$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Messages$/ })).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Coach$/ })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toHaveCount(0);
  });

  test("keeps View Full Plan routing available when assigned plan action is present", async ({ page }) => {
    await page.goto("/?testUnlock=true");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const viewFullPlan = page.getByRole("button", { name: "View Full Plan" }).first();
    await expect(viewFullPlan).toBeVisible();

    await viewFullPlan.click();

    await expect(page.getByTestId("client-full-assigned-plan").first()).toBeVisible();
  });
});
