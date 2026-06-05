import { expect, test } from "@playwright/test";

test.describe("Mobile client navigation smoke coverage", () => {
  test("mobile bottom nav uses social-style primary buttons with a menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    const mobileNav = page.getByRole("navigation", { name: /Mobile navigation/i });

    await expect(mobileNav).toBeVisible();

    for (const label of ["Plan", "Log", "Build", "Msg", "Menu"]) {
      await expect(
        mobileNav.getByRole("button", { name: new RegExp("^" + label + "$", "i") })
      ).toBeVisible();
    }

    for (const hiddenPrimary of ["Home", "Nutrition", "Plans", "Progress", "Logout", "More"]) {
      await expect(
        mobileNav.getByRole("button", { name: new RegExp("^" + hiddenPrimary + "$", "i") })
      ).toHaveCount(0);
    }

    await expect(page.getByLabel("Mobile More menu")).toHaveCount(0);

    await mobileNav.getByRole("button", { name: /^Menu$/i }).click();

    const mobileMenu = page.getByLabel("Mobile tab menu");

    await expect(mobileMenu).toBeVisible();

    for (const label of ["Home", "Nutrition", "Plans", "Progress", "Logout"]) {
      await expect(
        mobileMenu.getByRole("button", { name: new RegExp("^" + label + "$", "i") })
      ).toBeVisible();
    }

    await mobileNav.getByRole("button", { name: /^Plan$/i }).click();
    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await mobileNav.getByRole("button", { name: /^Build$/i }).click();
    await expect(page.locator("body")).toContainText(/Build Workout Plan|Exercise Library|Search exercises/i);

    await mobileNav.getByRole("button", { name: /^Log$/i }).click();
    await expect(page.locator("body")).toContainText(/Client Workout Tracker|Assigned Plan|Mark Complete/i);

    await mobileNav.getByRole("button", { name: /^Menu$/i }).click();
    await mobileMenu.getByRole("button", { name: /^Nutrition$/i }).click();
    await expect(page.locator("body")).toContainText(/Nutrition Coach|calories|protein/i);

    await mobileNav.getByRole("button", { name: /^Msg$/i }).click();
    await expect(page.locator("body")).toContainText(/Messages|Conversation|Send Message/i);
  });

  test("client messages use signed-in client role without Send As", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=client");

    await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
      .click();

    await expect(page.getByLabel("Send As")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Signed-in role");
    await expect(page.locator("main")).toContainText("Client");

    await page.getByLabel("Message").fill("Client role locked message");
    await page.getByRole("button", { name: /^Send Message$/ }).click();

    await expect(page.locator("main")).toContainText("Client role locked message");
    await expect(page.locator("main")).toContainText("Client message sent locally.");
  });

  test("coach messages use signed-in coach role without Send As", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");

    await page
      .getByRole("navigation", { name: /Main navigation/i })
      .first()
      .getByRole("button", { name: /^Messages(?:\s+\d+)?$/ })
      .click();

    await expect(page.getByLabel("Send As")).toHaveCount(0);
    await expect(page.locator("main")).toContainText("Signed-in role");
    await expect(page.locator("main")).toContainText("Coach");

    await page.getByLabel("Message").fill("Coach role locked message");
    await page.getByRole("button", { name: /^Send Message$/ }).click();

    await expect(page.locator("main")).toContainText("Coach role locked message");
    await expect(page.locator("main")).toContainText("Coach message sent locally.");
  });

  test("mobile social-style bottom nav fits at narrow phone widths", async ({ page }) => {
    for (const width of [360, 375, 390]) {
      await page.setViewportSize({ width, height: 844 });

      await page.goto("/?testUnlock=true&portalMode=client");

      await expect(page.getByLabel("Client My Plan dashboard").first()).toBeVisible();

      const mobileNav = page.getByRole("navigation", { name: /Mobile navigation/i });

      await expect(mobileNav).toBeVisible();
      await expect(mobileNav.getByRole("button", { name: /^More$/i })).toHaveCount(0);
      await expect(page.getByLabel("Mobile More menu")).toHaveCount(0);

      const expectedLabels = ["Plan", "Log", "Build", "Msg", "Menu"];
      const navBox = await mobileNav.boundingBox();

      expect(navBox).not.toBeNull();

      for (const label of expectedLabels) {
        const button = mobileNav.getByRole("button", {
          name: new RegExp("^" + label + "$", "i"),
        });

        await expect(button).toBeVisible();

        const buttonBox = await button.boundingBox();

        expect(buttonBox).not.toBeNull();
        expect(buttonBox.x).toBeGreaterThanOrEqual(navBox.x - 1);
        expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
      }

      await mobileNav.getByRole("button", { name: /^Menu$/i }).click();
      await expect(page.getByLabel("Mobile tab menu")).toBeVisible();

      await mobileNav.getByRole("button", { name: /^Msg$/i }).click();
      await expect(page.locator("body")).toContainText(/Messages|Conversation|Send Message/i);

      await mobileNav.getByRole("button", { name: /^Build$/i }).click();
      await expect(page.locator("body")).toContainText(/Build Workout Plan|Exercise Library|Search exercises/i);
    }
  });

});
