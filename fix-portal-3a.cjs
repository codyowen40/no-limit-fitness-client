const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("Could not find src/App.jsx. Make sure you are in the project folder.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  process.cwd(),
  "src",
  `App-before-portal-3a-fix-${new Date().toISOString().replace(/[:.]/g, "-")}.jsx`
);

fs.writeFileSync(backupPath, app, "utf8");

function replaceOrFail(pattern, replacement, label) {
  if (!pattern.test(app)) {
    console.error(`Could not apply patch: ${label}`);
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

replaceOrFail(
  /const \[activeTab, setActiveTab\] = useState\("Home"\);/,
  `const [activeTab, setActiveTab] = useState(() => {
    try {
      const isUnlocked =
        window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";
      const savedMode = String(
        window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
      ).toLowerCase();

      if (!isUnlocked) return "Login";
      if (savedMode === "coach") return "Coach";
      if (savedMode === "client") return "Client";

      return "Home";
    } catch {
      return "Login";
    }
  });`,
  "activeTab login-first state"
);

replaceOrFail(
  /const \[portalMode, setPortalMode\] = useState\(\(\) => \{\s*try \{\s*return window\.localStorage\.getItem\(PORTAL_MODE_STORAGE_KEY\) \|\| "demo";\s*\} catch \{\s*return "demo";\s*\}\s*\}\);/,
  `const [portalMode, setPortalMode] = useState(() => {
    try {
      const isUnlocked =
        window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";
      const savedMode = String(
        window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
      ).toLowerCase();

      if (!isUnlocked) return "login";
      if (savedMode === "coach") return "coach";
      if (savedMode === "client") return "client";
      if (savedMode === "demo") return "demo";

      return "demo";
    } catch {
      return "login";
    }
  });

  const [isTestUnlocked, setIsTestUnlocked] = useState(() => {
    try {
      return window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });`,
  "portalMode test unlock state"
);

replaceOrFail(
  /<PortalModeControls portalMode=\{portalMode\} setPortalMode=\{setPortalMode\} \/>/,
  `{isTestUnlocked && (
          <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />
        )}`,
  "hide portal controls until test unlock"
);

replaceOrFail(
  /if \(tab\.id === "Login" && isLoggedIn\) \{\s*const demoPortalMode =[\s\S]*?setActiveTab\("Home"\);\s*return;\s*\}/,
  `if (tab.id === "Login" && isLoggedIn) {
                        try {
                          window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
                          window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "login");
                        } catch {
                          // LocalStorage can fail in restricted browser modes.
                        }

                        setIsTestUnlocked(false);
                        setPortalMode("login");
                        setActiveTab("Login");
                        return;
                      }`,
  "logout nav button behavior"
);

replaceOrFail(
  /function handlePortalLogout\(\) \{\s*setPortalMode\("demo"\);\s*setActiveTab\("Login"\);\s*\}/,
  `function handlePortalLogout() {
    try {
      window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "login");
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setIsTestUnlocked(false);
    setPortalMode("login");
    setActiveTab("Login");
  }`,
  "handlePortalLogout behavior"
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Portal Bundle 3A app patch applied.");
console.log(`Backup saved here: ${backupPath}`);