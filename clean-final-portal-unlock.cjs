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
  `App-before-clean-final-portal-unlock-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.jsx`
);

fs.writeFileSync(backupPath, app, "utf8");

function removeFunction(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start === -1) return source;

  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) return source;

  let depth = 0;

  for (let i = openBrace; i < source.length; i += 1) {
    const char = source[i];

    if (char === "{") depth += 1;

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(0, start) + "\n" + source.slice(i + 1);
      }
    }
  }

  return source;
}

app = removeFunction(app, "isPortalTestUnlocked");
app = removeFunction(app, "TestUnlockedPortalModeControls");

if (!app.includes('const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";')) {
  app = app.replace(
    'const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";',
    `const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";
const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";`
  );
}

app = app.replace(
  'const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";',
  `const TEST_UNLOCK_STORAGE_KEY = "no-limit-fitness-test-unlocked-v1";

function isPortalTestUnlocked() {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);
    const urlUnlock = params.get("testUnlock") === "true";
    const storageUnlock =
      window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";

    return urlUnlock || storageUnlock;
  } catch {
    return false;
  }
}`
);

const headerEndPattern =
  /<\/nav>[\s\S]*?<main className="mx-auto max-w-7xl px-4 py-8">/;

if (!headerEndPattern.test(app)) {
  console.error("Could not find the header/nav/main section.");
  console.error("Stop here and send this message back to ChatGPT.");
  process.exit(1);
}

app = app.replace(
  headerEndPattern,
  `</nav>
          </div>

          {isPortalTestUnlocked() && (
            <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
          )}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">`
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Clean final portal unlock patch applied.");
console.log(`Backup saved here: ${backupPath}`);