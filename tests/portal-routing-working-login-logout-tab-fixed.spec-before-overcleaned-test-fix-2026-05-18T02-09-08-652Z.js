import { test, expect } from "@playwright/test";

test.describe("No Limit Fitness portal routing", () => {
  test("toggles demo, coach, and client portal navigation", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation");
    const portalControls = page.getByLabel("Portal mode controls");

    await expect(
      page.getByRole("heading", { name: "No Limit Fitness" })
    ).toBeVisible();

    await expect(portalControls).toBeVisible();

    await portalControls.getByRole("button", { name: "Demo Preview" }).click();

    await expect(page.getByText("Demo Preview Active")).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(
      nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
    ).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

    await portalControls.getByRole("button", { name: "Coach Portal" }).click();

    await expect(page.getByText("Coach Portal Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(
      nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
    ).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).not.toBeVisible();

    await portalControls.getByRole("button", { name: "Client Portal" }).click();

    await expect(page.getByText("Client Portal Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(
      nav.getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
    ).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).not.toBeVisible();

    await nav.getByRole("button", { name: /^Logout$/ }).click();

    await expect(page.getByText("Demo Preview Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
  });
});
