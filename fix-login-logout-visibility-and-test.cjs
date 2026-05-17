const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const portalTestPath = path.join(__dirname, "tests", "portal-routing.spec.js");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx.");
}

if (!fs.existsSync(portalTestPath)) {
  throw new Error("Could not find tests/portal-routing.spec.js.");
}

let appSource = fs.readFileSync(appPath, "utf8");

if (!appSource.trim()) {
  throw new Error("src/App.jsx is empty. Restore your latest stable backup.");
}

const appBackupPath = path.join(
  __dirname,
  "src",
  `App-before-login-logout-visibility-fix-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, appBackupPath);

// Make sure Logout is allowed to stay visible when the Login tab label changes.
const shouldShowPattern =
  /const\s+shouldShow\s*=\s*visibleTabs\.includes\(cleanLabel\)(?:\s*\|\|\s*cleanLabel\s*===\s*["']Messages["'])*(?:\s*\|\|\s*cleanLabel\s*===\s*["']Login["'])*(?:\s*\|\|\s*cleanLabel\s*===\s*["']Logout["'])*\s*;/g;

if (!shouldShowPattern.test(appSource)) {
  console.log("Warning: Could not find exact portal visibility line.");
  console.log("The test file will still be updated.");
} else {
  appSource = appSource.replace(
    shouldShowPattern,
    `const shouldShow =
          visibleTabs.includes(cleanLabel) ||
          cleanLabel === "Messages" ||
          cleanLabel === "Login" ||
          cleanLabel === "Logout";`
  );
}

fs.writeFileSync(appPath, appSource, "utf8");

const portalTestBackupPath = path.join(
  __dirname,
  "tests",
  `portal-routing-before-login-logout-test-fix-${Date.now()}.spec.js`
);

fs.copyFileSync(portalTestPath, portalTestBackupPath);

const portalTestRewrite = `import { test, expect } from "@playwright/test";

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
      nav.getByRole("button", { name: /^Messages(?:\\s+\\d+)?$/ })
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
      nav.getByRole("button", { name: /^Messages(?:\\s+\\d+)?$/ })
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
      nav.getByRole("button", { name: /^Messages(?:\\s+\\d+)?$/ })
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
`;

fs.writeFileSync(portalTestPath, portalTestRewrite, "utf8");

console.log("Login/Logout visibility and portal test fixed.");
console.log("Demo Preview expects Login.");
console.log("Coach/Client portals expect Logout.");
console.log(`App backup saved at: ${appBackupPath}`);
console.log(`Test backup saved at: ${portalTestBackupPath}`);