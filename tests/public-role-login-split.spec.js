import { expect, test } from "@playwright/test";

test.describe("Public role login split", () => {
  test("public gate separates client and coach login pages", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Client Login" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Client Access" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Coach Access" })).toBeVisible();

    await page.getByRole("button", { name: "Coach Access" }).click();

    await expect(page.getByRole("heading", { name: "Coach Login" })).toBeVisible();
    await expect(page.getByLabel("Coach Email")).toBeVisible();
    await expect(page.getByLabel("Coach Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toHaveCount(0);

    await page.getByLabel("Coach Email").fill("coach@nolimittest.com");
    await page.getByLabel("Coach Password").fill("test123");
    await page.getByRole("button", { name: "Open Coach Portal" }).click();

    await expect(page.locator("body")).toContainText(/Coach Portal|Command Center|Coach Dashboard/i);
    await expect(page.getByLabel("Client My Plan dashboard").first()).toHaveCount(0);
  });
});
