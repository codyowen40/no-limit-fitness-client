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
  `App-before-force-portal-controls-unlock-${new Date()
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

if (!app.includes("function getTestUnlockStatus()")) {
  app = app.replace(
    'const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";',
    `const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";

function getTestUnlockStatus() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}`
  );
}

if (!app.includes("const showPortalControls = getTestUnlockStatus();")) {
  const portalModeStatePattern =
    /const \[portalMode, setPortalMode\] = useState\(\(\) => \{[\s\S]*?\n\s*\}\);/;

  if (!portalModeStatePattern.test(app)) {
    console.error("Could not find portalMode state block.");
    console.error("Stop here and send this message back to ChatGPT.");
    process.exit(1);
  }

  app = app.replace(
    portalModeStatePattern,
    (match) => `${match}

  const showPortalControls = getTestUnlockStatus();`
  );
}

const replacement = `{showPortalControls && (
          <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
        )}`;

const patterns = [
  /\{isTestUnlocked && \(\s*<PortalModeControls portalMode=\{portalMode\} setPortalMode=\{setPortalMode\} \/>\s*\)\}/,
  /\{\(\(\) => \{[\s\S]*?return portalControlsUnlocked \? \(\s*<PortalModeControls portalMode=\{portalMode\} setPortalMode=\{setPortalMode\} \/>\s*\) : null;[\s\S]*?\}\)\(\)\}/,
  /<PortalModeControls portalMode=\{portalMode\} setPortalMode=\{setPortalMode\} \/>/,
];

let replacedPortalControls = false;

for (const pattern of patterns) {
  if (pattern.test(app)) {
    app = app.replace(pattern, replacement);
    replacedPortalControls = true;
    break;
  }
}

if (!replacedPortalControls) {
  console.error("Could not find PortalModeControls render line.");
  console.error("Stop here and send this message back to ChatGPT.");
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");

console.log("Force portal controls unlock patch applied.");
console.log(`Backup saved here: ${backupPath}`);