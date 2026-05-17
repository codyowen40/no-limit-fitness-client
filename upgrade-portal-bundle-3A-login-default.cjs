const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const portalTestPath = path.join(__dirname, "tests", "portal-routing.spec.js");
const mainTestPath = path.join(__dirname, "tests", "no-limit-fitness-app.spec.js");

for (const filePath of [appPath, portalTestPath, mainTestPath]) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Could not find ${filePath}`);
  }
}

let appSource = fs.readFileSync(appPath, "utf8");
let mainTestSource = fs.readFileSync(mainTestPath, "utf8");

if (!appSource.trim()) {
  throw new Error("src/App.jsx is empty. Restore your latest stable backup.");
}

const timestamp = Date.now();

fs.copyFileSync(
  appPath,
  path.join(__dirname, "src", `App-before-portal-bundle-3A-login-default-${timestamp}.jsx`)
);

fs.copyFileSync(
  portalTestPath,
  path.join(
    __dirname,
    "tests",
    `portal-routing-before-portal-bundle-3A-login-default-${timestamp}.spec.js`
  )
);

fs.copyFileSync(
  mainTestPath,
  path.join(
    __dirname,
    "tests",
    `no-limit-fitness-app-before-portal-bundle-3A-login-default-${timestamp}.spec.js`
  )
);

// Remove old 3A block if this script is run more than once.
appSource = appSource.replace(
  /\n\s*\/\/ NLF_LOGIN_DEFAULT_3A_START[\s\S]*?\/\/ NLF_LOGIN_DEFAULT_3A_END\s*/g,
  "\n"
);

const appStartIndex = appSource.indexOf("export default function App");

if (appStartIndex === -1) {
  throw new Error("Could not find export default function App.");
}

const returnIndex = appSource.indexOf("\n  return (", appStartIndex);

if (returnIndex === -1) {
  throw new Error("Could not find App return block.");
}

const loginDefaultBlock = `
  // NLF_LOGIN_DEFAULT_3A_START
  const nlfTestUnlocked = (() => {
    try {
      return window.localStorage.getItem("no-limit-fitness-test-unlocked-v1") === "true";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const normalizedPortalMode = String(portalMode || "demo").toLowerCase();

    if (!nlfTestUnlocked && normalizedPortalMode === "demo" && activeTab !== "Login") {
      setActiveTab("Login");
    }
  }, [activeTab, portalMode, nlfTestUnlocked]);
  // NLF_LOGIN_DEFAULT_3A_END

`;

appSource =
  appSource.slice(0, returnIndex) +
  loginDefaultBlock +
  appSource.slice(returnIndex);

// Logout should return to Login instead of Home.
appSource = appSource.replace(
  /(setPortalMode\(["']demo["']\);\s*\n\s*)setActiveTab\(["']Home["']\);/g,
  `$1setActiveTab("Login");`
);

fs.writeFileSync(appPath, appSource, "utf8");

// Rewrite portal test for 3A.
const portalTestRewrite = `import { test, expect } from "@playwright/test";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

test.describe("No Limit Fitness portal routing", () => {
  test("starts on Login, then supports demo, coach, and client portal navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.removeItem(portalModeKey);
      window.localStorage.removeItem(testUnlockKey);
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.reload();

    const nav = page.getByRole("navigation");
    const portalControls = page.getByLabel("Portal mode controls");

    await expect(
      page.getByRole("heading", { name: "No Limit Fitness" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Authentication Later" })
    ).toBeVisible();

    await expect(portalControls).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

    await page.evaluate(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "demo");
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.reload();

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
    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).not.toBeVisible();

    await portalControls.getByRole("button", { name: "Client Portal" }).click();

    await expect(page.getByText("Client Portal Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Logout$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).not.toBeVisible();

    await nav.getByRole("button", { name: /^Logout$/ }).click();

    await expect(page.getByText("Demo Preview Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Authentication Later" })
    ).toBeVisible();
  });
});
`;

fs.writeFileSync(portalTestPath, portalTestRewrite, "utf8");

// Make the main full app test unlock the demo/admin flow.
if (!mainTestSource.includes("no-limit-fitness-test-unlocked-v1")) {
  const pageGotoPattern = /await page\.goto\("\/"\);\s*/;

  if (!pageGotoPattern.test(mainTestSource)) {
    console.log("Warning: Could not find await page.goto('/') in main test.");
  } else {
    mainTestSource = mainTestSource.replace(
      pageGotoPattern,
      `await page.goto("/");

    await page.evaluate(() => {
      window.localStorage.setItem("no-limit-fitness-test-unlocked-v1", "true");
      window.localStorage.setItem("no-limit-fitness-portal-mode-v1", "demo");
    });

    await page.reload();

`
    );
  }
}

mainTestSource = mainTestSource.replace(
  /window\.localStorage\.removeItem\(storageKey\);/g,
  `window.localStorage.removeItem(storageKey);
      window.localStorage.setItem("no-limit-fitness-test-unlocked-v1", "true");
      window.localStorage.setItem("no-limit-fitness-portal-mode-v1", "demo");`
);

fs.writeFileSync(mainTestPath, mainTestSource, "utf8");

console.log("Portal Bundle 3A installed.");
console.log("Normal app opens on Login first.");
console.log("Logout returns to Login.");
console.log("Tests unlock full Demo Preview flow with localStorage.");