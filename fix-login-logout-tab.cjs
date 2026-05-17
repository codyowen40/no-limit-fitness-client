const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx.");
}

let source = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `App-before-login-logout-tab-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

if (!source.includes("LogOut")) {
  source = source.replace(/(\bLogIn,\s*\n)/, "$1  LogOut,\n");
}

if (!source.includes("const isLoggedIn =")) {
  source = source.replace(
    /(\s+const tabs = \[)/,
    `
  const normalizedPortalMode = String(portalMode || "demo").toLowerCase();
  const isLoggedIn =
    normalizedPortalMode === "coach" || normalizedPortalMode === "client";

$1`
  );
}

source = source.replace(
  /\{\s*id:\s*"Login"\s*,\s*icon:\s*LogIn\s*(?:,\s*[^}]*)?\}/,
  `{ id: "Login", label: isLoggedIn ? "Logout" : "Login", icon: isLoggedIn ? LogOut : LogIn, isAccountAction: true }`
);

source = source.replace(
  /onClick=\{\(\) => setActiveTab\(tab\.id\)\}/,
  `onClick={() => {
                      if (tab.id === "Login" && isLoggedIn) {
                        const demoPortalMode =
                          portalMode === "Coach" || portalMode === "Client"
                            ? "Demo"
                            : "demo";

                        setPortalMode(demoPortalMode);
                        setActiveTab("Home");
                        return;
                      }

                      setActiveTab(tab.id);
                    }}`
);

source = source.replace(
  /\{tab\.id\}\s*\n\s*\{tab\.badge > 0 &&/,
  `{tab.label || tab.id}
                    {tab.badge > 0 &&`
);

fs.writeFileSync(appPath, source, "utf8");

console.log("Login/Logout tab fix installed.");
console.log("Not logged in / Demo Preview = Login");
console.log("Coach or Client Portal = Logout");
console.log("Clicking Logout returns to Demo Preview and Home.");
console.log(`Backup saved at: ${backupPath}`);