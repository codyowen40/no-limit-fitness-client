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
  `App-before-fix-unlock-routing-state-${new Date()
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
    if (source[i] === "{") depth += 1;

    if (source[i] === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(0, start) + "\n" + source.slice(i + 1);
      }
    }
  }

  return source;
}

app = app.replace(
  /\n\s*\/\/ NLF_LOGIN_DEFAULT_3A_START[\s\S]*?\/\/ NLF_LOGIN_DEFAULT_3A_END\s*\n/g,
  "\n"
);

app = removeFunction(app, "getPortalTestUnlocked");
app = removeFunction(app, "isPortalTestUnlocked");
app = removeFunction(app, "getInitialPortalMode");

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

function getPortalTestUnlocked() {
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
}

function isPortalTestUnlocked() {
  return getPortalTestUnlocked();
}

function getInitialPortalMode() {
  if (typeof window === "undefined") return "login";

  try {
    const savedMode = String(
      window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || ""
    ).toLowerCase();

    if (["login", "demo", "coach", "client"].includes(savedMode)) {
      return savedMode;
    }

    return getPortalTestUnlocked() ? "demo" : "login";
  } catch {
    return "login";
  }
}`
);

const activeToPortalPattern =
  /const \[activeTab, setActiveTab\] = useState[\s\S]*?\n\s*const \[portalMode, setPortalMode\]/;

if (!activeToPortalPattern.test(app)) {
  console.error("Could not find activeTab to portalMode state section.");
  console.error("Stop here and send this message back to ChatGPT.");
  process.exit(1);
}

app = app.replace(
  activeToPortalPattern,
  `const [activeTab, setActiveTab] = useState(() => {
    const mode = getInitialPortalMode();

    if (!getPortalTestUnlocked()) return "Login";
    if (mode === "coach") return "Coach";
    if (mode === "client") return "Client";

    return "Home";
  });

  const [portalMode, setPortalMode]`
);

const portalStatePattern =
  /const \[portalMode, setPortalMode\] = useState\(\(\) => \{[\s\S]*?\n\s*\}\);/;

if (portalStatePattern.test(app)) {
  app = app.replace(
    portalStatePattern,
    `const [portalMode, setPortalMode] = useState(getInitialPortalMode);`
  );
} else {
  app = app.replace(
    /const \[portalMode, setPortalMode\] = useState\([^;]*\);/,
    `const [portalMode, setPortalMode] = useState(getInitialPortalMode);`
  );
}

if (!app.includes("NLF_TEST_UNLOCK_ROUTING_EFFECT_START")) {
  app = app.replace(
    `const [portalMode, setPortalMode] = useState(getInitialPortalMode);`,
    `const [portalMode, setPortalMode] = useState(getInitialPortalMode);

  // NLF_TEST_UNLOCK_ROUTING_EFFECT_START
  useEffect(() => {
    const unlocked = getPortalTestUnlocked();
    const normalizedMode = String(portalMode || "demo").toLowerCase();

    const visibleTabsByPortalMode = {
      demo: [
        "Home",
        "Client",
        "Coach",
        "Clients",
        "Plans",
        "Tracker",
        "Messages",
        "Exercises",
        "Progress",
        "Login",
      ],
      coach: [
        "Home",
        "Coach",
        "Clients",
        "Plans",
        "Tracker",
        "Messages",
        "Exercises",
        "Progress",
        "Login",
      ],
      client: [
        "Home",
        "Client",
        "Tracker",
        "Messages",
        "Exercises",
        "Progress",
        "Login",
      ],
    };

    const landingTabByPortalMode = {
      demo: "Home",
      coach: "Coach",
      client: "Client",
    };

    if (!unlocked) {
      if (activeTab !== "Login") setActiveTab("Login");
      return;
    }

    const visibleTabs =
      visibleTabsByPortalMode[normalizedMode] || visibleTabsByPortalMode.demo;
    const landingTab = landingTabByPortalMode[normalizedMode] || "Home";

    if (activeTab === "Login" || !visibleTabs.includes(activeTab)) {
      setActiveTab(landingTab);
    }
  }, [activeTab, portalMode]);
  // NLF_TEST_UNLOCK_ROUTING_EFFECT_END`
  );
}

app = removeFunction(app, "handlePortalLogout");

const appReturnTarget = `return (
    <div className="min-h-screen bg-black text-white">`;

if (!app.includes(appReturnTarget)) {
  console.error("Could not find App return block.");
  console.error("Stop here and send this message back to ChatGPT.");
  process.exit(1);
}

app = app.replace(
  appReturnTarget,
  `function handlePortalLogout() {
    try {
      window.localStorage.removeItem(TEST_UNLOCK_STORAGE_KEY);
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "login");
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setPortalMode("login");
    setActiveTab("Login");
  }

  ${appReturnTarget}`
);

app = app.replace(
  /if \(tab\.id === "Login" && isLoggedIn\) \{[\s\S]*?return;\s*\}/,
  `if (tab.id === "Login" && isLoggedIn) {
                        handlePortalLogout();
                        return;
                      }`
);

fs.writeFileSync(appPath, app, "utf8");

console.log("Unlock routing state fix applied.");
console.log(`Backup saved here: ${backupPath}`);