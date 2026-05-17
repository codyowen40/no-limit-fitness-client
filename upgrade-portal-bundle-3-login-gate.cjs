const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const cssPath = path.join(__dirname, "src", "index.css");
const portalTestPath = path.join(__dirname, "tests", "portal-routing.spec.js");
const mainTestPath = path.join(__dirname, "tests", "no-limit-fitness-app.spec.js");

for (const filePath of [appPath, cssPath, portalTestPath, mainTestPath]) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Could not find ${filePath}`);
  }
}

let appSource = fs.readFileSync(appPath, "utf8");
let cssSource = fs.readFileSync(cssPath, "utf8");
let mainTestSource = fs.readFileSync(mainTestPath, "utf8");

if (!appSource.trim()) {
  throw new Error("src/App.jsx is empty. Restore your latest stable backup.");
}

const timestamp = Date.now();

fs.copyFileSync(
  appPath,
  path.join(__dirname, "src", `App-before-portal-bundle-3-login-gate-${timestamp}.jsx`)
);

fs.copyFileSync(
  cssPath,
  path.join(__dirname, "src", `index-before-portal-bundle-3-login-gate-${timestamp}.css`)
);

fs.copyFileSync(
  portalTestPath,
  path.join(
    __dirname,
    "tests",
    `portal-routing-before-portal-bundle-3-login-gate-${timestamp}.spec.js`
  )
);

fs.copyFileSync(
  mainTestPath,
  path.join(
    __dirname,
    "tests",
    `no-limit-fitness-app-before-portal-bundle-3-login-gate-${timestamp}.spec.js`
  )
);

// Remove old login gate block if re-running.
appSource = appSource.replace(
  /\n\s*\/\/ NLF_LOGIN_GATE_START[\s\S]*?\/\/ NLF_LOGIN_GATE_END\s*/g,
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

const loginGateBlock = `
  // NLF_LOGIN_GATE_START
  const nlfTestUnlocked = (() => {
    try {
      return window.localStorage.getItem("no-limit-fitness-test-unlocked-v1") === "true";
    } catch {
      return false;
    }
  })();

  const isLoginGateActive =
    String(portalMode || "demo").toLowerCase() === "demo" && !nlfTestUnlocked;

  useEffect(() => {
    document.body.dataset.nlfLoginGate = isLoginGateActive ? "true" : "false";
    document.body.dataset.nlfTestUnlocked = nlfTestUnlocked ? "true" : "false";
  }, [isLoginGateActive, nlfTestUnlocked]);

  useEffect(() => {
    if (isLoginGateActive && activeTab !== "Login") {
      setActiveTab("Login");
    }
  }, [isLoginGateActive, activeTab]);
  // NLF_LOGIN_GATE_END

`;

appSource =
  appSource.slice(0, returnIndex) + loginGateBlock + appSource.slice(returnIndex);

// Logout should return to Login screen, not Home.
appSource = appSource.replace(
  /(setPortalMode\(["']demo["']\);\s*\n\s*)setActiveTab\(["']Home["']\);/g,
  `$1setActiveTab("Login");`
);

// Make sure Login/Logout stay visible through portal visibility logic.
appSource = appSource.replace(
  /const\s+shouldShow\s*=\s*visibleTabs\.includes\(cleanLabel\)(?:\s*\|\|\s*cleanLabel\s*===\s*["']Messages["'])*(?:\s*\|\|\s*cleanLabel\s*===\s*["']Login["'])*(?:\s*\|\|\s*cleanLabel\s*===\s*["']Logout["'])*\s*;/g,
  `const shouldShow =
          visibleTabs.includes(cleanLabel) ||
          cleanLabel === "Messages" ||
          cleanLabel === "Login" ||
          cleanLabel === "Logout";`
);

fs.writeFileSync(appPath, appSource, "utf8");

// CSS login gate polish.
cssSource = cssSource.replace(
  /\n\/\* NLF_LOGIN_GATE_CSS_START \*\/[\s\S]*?\/\* NLF_LOGIN_GATE_CSS_END \*\/\n?/g,
  "\n"
);

const loginGateCss = `

/* NLF_LOGIN_GATE_CSS_START */
/* Login Gate:
   - Public users see Login first.
   - Portal switcher is hidden from normal users.
   - Tests can unlock old demo routing with localStorage.
*/

body:not([data-nlf-test-unlocked="true"]) [aria-label="Portal mode controls"] {
  display: none !important;
}

body[data-nlf-login-gate="true"] nav button {
  display: none !important;
}

body[data-nlf-login-gate="true"] nav button:nth-of-type(9) {
  display: inline-flex !important;
  margin-left: auto !important;
  border-color: rgba(0, 191, 99, 0.9) !important;
  background: rgba(0, 191, 99, 0.16) !important;
  color: #ffffff !important;
  box-shadow: 0 0 0 1px rgba(0, 191, 99, 0.3), 0 12px 30px rgba(0, 191, 99, 0.12);
  text-transform: none !important;
  font-weight: 900 !important;
}

body[data-nlf-login-gate="true"] nav button:nth-of-type(9):hover {
  background: #00BF63 !important;
  color: #000000 !important;
}
/* NLF_LOGIN_GATE_CSS_END */
`;

fs.writeFileSync(cssPath, `${cssSource.trimEnd()}${loginGateCss}\n`, "utf8");

// Rewrite portal routing test for Login Gate.
const portalTestRewrite = `import { test, expect } from "@playwright/test";

const PORTAL_MODE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_KEY = "no-limit-fitness-test-unlocked-v1";

test.describe("No Limit Fitness portal routing", () => {
  test("shows login gate first, then supports coach and client portal routing", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.removeItem(portalModeKey);
      window.localStorage.removeItem(testUnlockKey);
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.reload();

    const nav = page.getByRole("navigation");

    await expect(
      page.getByRole("heading", { name: "No Limit Fitness" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Authentication Later" })
    ).toBeVisible();

    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).not.toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).not.toBeVisible();
    await expect(page.getByLabel("Portal mode controls")).not.toBeVisible();

    await page.evaluate(({ portalModeKey, testUnlockKey }) => {
      window.localStorage.setItem(testUnlockKey, "true");
      window.localStorage.setItem(portalModeKey, "demo");
    }, { portalModeKey: PORTAL_MODE_KEY, testUnlockKey: TEST_UNLOCK_KEY });

    await page.reload();

    const portalControls = page.getByLabel("Portal mode controls");

    await expect(portalControls).toBeVisible();

    await portalControls.getByRole("button", { name: "Demo Preview" }).click();

    await expect(page.getByText("Demo Preview Active")).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Login$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Home$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Client$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Coach$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Clients$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Plans$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Tracker$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Exercises$/ })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Progress$/ })).toBeVisible();
    await expect(
      nav.getByRole("button", { name: /^Messages(?:\\\\s+\\\\d+)?$/ })
    ).toBeVisible();

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
  });
});
`;

fs.writeFileSync(portalTestPath, portalTestRewrite, "utf8");

// Patch main full app test so it can still run the complete demo/admin flow.
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

console.log("Portal Bundle 3 Login Gate installed.");
console.log("Initial app view now opens on Login.");
console.log("Portal switcher is hidden for normal users.");
console.log("Logout returns to Login.");
console.log("Tests have a localStorage unlock so the full app test can still run.");