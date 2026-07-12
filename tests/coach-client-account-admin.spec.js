import { expect, test } from "@playwright/test";

test.describe("Coach client account administration", () => {
  test("coach-only Clients screen exposes secure credential creation with local validation", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: "Clients", exact: true })
      .click();

    const admin = page.getByTestId("coach-client-account-admin");
    await expect(admin).toBeVisible();
    await expect(admin.getByRole("heading", { name: "Create Client Login" })).toBeVisible();
    await expect(admin.getByLabel("Temporary Password", { exact: true })).toHaveAttribute("minlength", "8");

    await admin.getByLabel("Client First Name").fill("New");
    await admin.getByLabel("Client Last Name").fill("Secure Client");
    await admin.getByLabel("New Client Email").fill("secure-client@example.com");
    await admin.getByLabel("Temporary Password", { exact: true }).fill("temporary-one");
    await admin.getByLabel("Confirm Temporary Password", { exact: true }).fill("temporary-two");
    await admin.getByRole("button", { name: "Create Secure Client Login" }).click();

    await expect(admin.getByRole("status")).toHaveText("Passwords do not match.");
  });

  test("manually added clients remain after reload", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.getByRole("button", { name: "Clients", exact: true }).click();

    await page.getByPlaceholder("Enter client name").fill("Persistent Client");
    await page.getByPlaceholder("Enter client email").fill("persistent@example.com");
    await page.getByRole("button", { name: "Add Client", exact: true }).click();
    await expect(page.getByText("Persistent Client", { exact: true }).first()).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Clients", exact: true }).click();
    await expect(page.getByText("Persistent Client", { exact: true }).first()).toBeVisible();
  });

  test("client portal cannot access coach credential administration", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");
    await expect(page.getByTestId("coach-client-account-admin")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clients", exact: true })).toHaveCount(0);
  });
});
