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
  `App-before-portal-controls-unlock-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.jsx`
);

fs.writeFileSync(backupPath, app, "utf8");

if (!app.includes('const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";')) {
  app = app.replace(
    'const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";',
    `const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";`
  );
}

const oldAlwaysVisible = `<PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />`;

const oldConditional = `{isTestUnlocked && (
          <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
        )}`;

const newConditional = `{(() => {
          let portalControlsUnlocked = false;

          try {
            portalControlsUnlocked =
              window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";
          } catch {
            portalControlsUnlocked = false;
          }

          return portalControlsUnlocked ? (
            <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
          ) : null;
        })()}`;

if (app.includes(oldConditional)) {
  app = app.replace(oldConditional, newConditional);
} else if (app.includes(oldAlwaysVisible)) {
  app = app.replace(oldAlwaysVisible, newConditional);
} else {
  console.error("Could not find PortalModeControls render line.");
  console.error("Stop here and send this message back to ChatGPT.");
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("Portal controls unlock patch applied.");
console.log(`Backup saved here: ${backupPath}`);