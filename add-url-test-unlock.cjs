const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("Could not find src/App.jsx.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  process.cwd(),
  "src",
  `App-before-url-test-unlock-${new Date().toISOString().replace(/[:.]/g, "-")}.jsx`
);

fs.writeFileSync(backupPath, app, "utf8");

if (!app.includes('const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";')) {
  app = app.replace(
    'const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";',
    `const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";`
  );
}

if (!app.includes("function isPortalTestUnlocked()")) {
  app = app.replace(
    'const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";',
    `const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";

function isPortalTestUnlocked() {
  if (typeof window === "undefined") return false;

  try {
    const urlUnlock =
      new URLSearchParams(window.location.search).get("testUnlock") === "true";
    const storageUnlock =
      window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";

    return urlUnlock || storageUnlock;
  } catch {
    return false;
  }
}`
  );
}

app = app.replaceAll(
  `window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true"`,
  `isPortalTestUnlocked()`
);

app = app.replaceAll(
  `<PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />`,
  `{isPortalTestUnlocked() && (
          <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
        )}`
);

app = app.replaceAll(
  `<TestUnlockedPortalModeControls
              portalMode={portalMode}
              setPortalMode={setPortalMode}
              setActiveTab={setActiveTab}
            />`,
  `{isPortalTestUnlocked() && (
            <TestUnlockedPortalModeControls
              portalMode={portalMode}
              setPortalMode={setPortalMode}
              setActiveTab={setActiveTab}
            />
            )}`
);

fs.writeFileSync(appPath, app, "utf8");

console.log("URL test unlock patch applied.");
console.log(`Backup saved here: ${backupPath}`);