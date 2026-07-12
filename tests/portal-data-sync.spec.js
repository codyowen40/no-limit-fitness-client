import { expect, test } from "@playwright/test";

test.describe("Portal data synchronization", () => {
  test("applies shared data updates in place without reloading the document", async ({ page }) => {
    await page.goto("/?testUnlock=true&portalMode=coach");
    await page.getByRole("button", { name: "Clients", exact: true }).click();

    await page.evaluate(() => {
      window.__portalSyncDocumentMarker = "same-document";
      window.dispatchEvent(
        new CustomEvent("nlf-portal-state-synced", {
          detail: {
            payload: {
              clients: [
                {
                  id: "mirrored-client",
                  name: "Mirrored Client",
                  email: "mirrored@example.com",
                  status: "Active",
                  coachingStatus: "active",
                  coachId: "coach-primary",
                },
              ],
              savedPlans: [],
              workoutLogs: [],
              conversations: [
                { clientId: "mirrored-client", clientName: "Mirrored Client", messages: [] },
              ],
            },
          },
        })
      );
    });

    await expect(page.getByText("Mirrored Client", { exact: true }).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__portalSyncDocumentMarker)).toBe("same-document");
  });
});
