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
  `App-before-cleanup-portal-jsx-error-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.jsx`
);

fs.writeFileSync(backupPath, app, "utf8");

function replaceOrFail(pattern, replacement, label) {
  if (!pattern.test(app)) {
    console.error(`Could not find section: ${label}`);
    console.error("Stop here and send this message back to ChatGPT.");
    process.exit(1);
  }

  app = app.replace(pattern, replacement);
}

if (!app.includes('const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";')) {
  app = app.replace(
    'const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";',
    `const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";`
  );
}

if (app.includes("function TestUnlockedPortalModeControls")) {
  replaceOrFail(
    /function TestUnlockedPortalModeControls\([\s\S]*?\nexport default function App\(\) \{/,
    "export default function App() {",
    "remove broken TestUnlockedPortalModeControls"
  );
}

if (!app.includes("function isPortalTestUnlocked()")) {
  app = app.replace(
    'const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";',
    `const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";

function isPortalTestUnlocked() {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("testUnlock") === "true" ||
      window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}`
  );
}

replaceOrFail(
  /<\/nav>[\s\S]*?<main className="mx-auto max-w-7xl px-4 py-8">/,
  `</nav>

            {isPortalTestUnlocked() && (
              <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">`,
  "header portal controls render section"
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Cleaned up broken portal JSX.");
console.log(`Backup saved here: ${backupPath}`);