const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx.");
}

let source = fs.readFileSync(appPath, "utf8");

if (!source.trim()) {
  throw new Error("src/App.jsx is empty. Restore your last working checkpoint.");
}

const backupPath = path.join(
  __dirname,
  "src",
  `App-before-portal-bundle-2-auto-login-routing-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

if (!source.includes("function PortalModeControls")) {
  throw new Error(
    "Portal Bundle 1 is missing. Install Portal Bundle 1 before Portal Bundle 2."
  );
}

if (!source.includes("const [portalMode, setPortalMode]")) {
  throw new Error(
    "portalMode state was not found. Restore the saved Portal Bundle 1 version first."
  );
}

function addPropsToLoginScreenDefinition(code) {
  const destructuredPattern = /function LoginScreen\(\s*\{\s*([^}]*)\s*\}\s*\)/;

  if (destructuredPattern.test(code)) {
    return code.replace(destructuredPattern, (match, props) => {
      const propList = props
        .split(",")
        .map((prop) => prop.trim())
        .filter(Boolean);

      for (const prop of ["onBackendImport", "onPortalLogin", "onPortalLogout"]) {
        if (!propList.includes(prop)) {
          propList.push(prop);
        }
      }

      return `function LoginScreen({ ${propList.join(", ")} })`;
    });
  }

  const emptyPattern = /function LoginScreen\(\s*\)/;

  if (emptyPattern.test(code)) {
    return code.replace(
      emptyPattern,
      "function LoginScreen({ onBackendImport, onPortalLogin, onPortalLogout })"
    );
  }

  throw new Error("Could not find LoginScreen function definition.");
}

source = addPropsToLoginScreenDefinition(source);

const appStartIndex = source.indexOf("export default function App");

if (appStartIndex === -1) {
  throw new Error("Could not find export default function App.");
}

const appReturnIndex = source.indexOf("\n  return (", appStartIndex);

if (appReturnIndex === -1) {
  throw new Error("Could not find App return block.");
}

const portalLoginHandlers = `
  function handlePortalLogin(profile) {
    const role = String(profile?.role || "").toLowerCase();

    if (role === "coach") {
      setPortalMode("coach");
      setActiveTab("Coach");
      return;
    }

    if (role === "client") {
      setPortalMode("client");
      setActiveTab("Client");
      return;
    }

    setPortalMode("demo");
    setActiveTab("Home");
  }

  function handlePortalLogout() {
    setPortalMode("demo");
    setActiveTab("Home");
  }

`;

if (!source.includes("function handlePortalLogin(profile)")) {
  source =
    source.slice(0, appReturnIndex) +
    portalLoginHandlers +
    source.slice(appReturnIndex);
}

source = source.replace(/<LoginScreen\b([\s\S]*?)\/>/g, (match, props) => {
  let nextProps = props;

  if (!nextProps.includes("onPortalLogin=")) {
    nextProps += "\n              onPortalLogin={handlePortalLogin}";
  }

  if (!nextProps.includes("onPortalLogout=")) {
    nextProps += "\n              onPortalLogout={handlePortalLogout}";
  }

  if (!nextProps.includes("onBackendImport=") && source.includes("handleImportBackendDataIntoApp")) {
    nextProps += "\n              onBackendImport={handleImportBackendDataIntoApp}";
  }

  return `<LoginScreen${nextProps} />`;
});

if (!source.includes("onPortalLogin(profile);")) {
  source = source.replace(/setAuthProfile\(profile\);\s*/g, (match) => {
    return `${match}
      if (onPortalLogin) {
        onPortalLogin(profile);
      }
`;
  });
}

if (!source.includes("onPortalLogout();")) {
  const signOutPattern =
    /await signOutUser\(\);\s*\n\s*setAuthProfile\(null\);\s*\n\s*setAuthStatus\("Signed out of Supabase\."\);/;

  if (signOutPattern.test(source)) {
    source = source.replace(signOutPattern, (match) => {
      return match.replace(
        'setAuthStatus("Signed out of Supabase.");',
        `setAuthStatus("Signed out of Supabase.");

      if (onPortalLogout) {
        onPortalLogout();
      }`
      );
    });
  } else {
    console.log(
      "Warning: Could not find exact sign out block. Login routing was still installed."
    );
  }
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Portal Bundle 2 automatic login routing installed.");
console.log("Coach login routes to Coach Portal.");
console.log("Client login routes to Client Portal.");
console.log("Sign out routes back to Demo Preview.");
console.log(`Backup saved at: ${backupPath}`);