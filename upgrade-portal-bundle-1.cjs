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
  `App-before-portal-bundle-1-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

function ensureReactHookImport(code, hookName) {
  const defaultNamedPattern =
    /import\s+React\s*,\s*\{\s*([^}]+)\s*\}\s*from\s*["']react["'];?/;

  if (defaultNamedPattern.test(code)) {
    return code.replace(defaultNamedPattern, (match, hooks) => {
      const hookList = hooks
        .split(",")
        .map((hook) => hook.trim())
        .filter(Boolean);

      if (!hookList.includes(hookName)) {
        hookList.push(hookName);
      }

      return `import React, { ${hookList.join(", ")} } from "react";`;
    });
  }

  const namedPattern = /import\s*\{\s*([^}]+)\s*\}\s*from\s*["']react["'];?/;

  if (namedPattern.test(code)) {
    return code.replace(namedPattern, (match, hooks) => {
      const hookList = hooks
        .split(",")
        .map((hook) => hook.trim())
        .filter(Boolean);

      if (!hookList.includes(hookName)) {
        hookList.push(hookName);
      }

      return `import { ${hookList.join(", ")} } from "react";`;
    });
  }

  const reactDefaultPattern = /import\s+React\s+from\s*["']react["'];?/;

  if (reactDefaultPattern.test(code)) {
    return code.replace(
      reactDefaultPattern,
      `import React from "react";\nimport { ${hookName} } from "react";`
    );
  }

  return `import { ${hookName} } from "react";\n${code}`;
}

source = ensureReactHookImport(source, "useState");
source = ensureReactHookImport(source, "useEffect");

const portalComponent = `
const PORTAL_MODE_STORAGE_KEY = "no-limit-fitness-portal-mode-v1";

function PortalModeControls({ portalMode, setPortalMode }) {
  const modeLabel =
    portalMode === "coach"
      ? "Coach Portal"
      : portalMode === "client"
        ? "Client Portal"
        : "Demo Preview";

  const description =
    portalMode === "coach"
      ? "Coach view focuses on clients, plans, logs, messages, progress, and backend tools."
      : portalMode === "client"
        ? "Client view focuses on assigned workouts, tracking, messages, and personal progress."
        : "Demo preview keeps every tab visible for testing and walkthroughs.";

  const options = [
    { id: "demo", label: "Demo Preview" },
    { id: "coach", label: "Coach Portal" },
    { id: "client", label: "Client Portal" },
  ];

  return (
    <section
      aria-label="Portal mode controls"
      className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#00BF63]/30 bg-black/70 p-4 shadow-2xl shadow-black/40 backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Portal Mode
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            {modeLabel} Active
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-300">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isActive = portalMode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPortalMode(option.id)}
                className={
                  isActive
                    ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                    : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
`;

if (!source.includes("function PortalModeControls")) {
  const appFunctionIndex = source.indexOf("export default function App");

  if (appFunctionIndex === -1) {
    throw new Error("Could not find export default function App.");
  }

  source =
    source.slice(0, appFunctionIndex) +
    portalComponent +
    "\n" +
    source.slice(appFunctionIndex);
}

const portalStateBlock = `
  const [portalMode, setPortalMode] = useState(() => {
    try {
      return window.localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || "demo";
    } catch {
      return "demo";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, portalMode);
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    document.body.dataset.portalMode = portalMode;

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

    const hiddenTabsByPortalMode = {
      demo: [],
      coach: ["Client"],
      client: ["Coach", "Clients", "Plans"],
    };

    const landingTabByPortalMode = {
      demo: "Home",
      coach: "Coach",
      client: "Client",
    };

    const hiddenTabs = hiddenTabsByPortalMode[portalMode] || [];

    if (hiddenTabs.includes(activeTab)) {
      setActiveTab(landingTabByPortalMode[portalMode] || "Home");
    }

    window.requestAnimationFrame(() => {
      const visibleTabs = visibleTabsByPortalMode[portalMode] || visibleTabsByPortalMode.demo;

      document.querySelectorAll("nav button").forEach((button) => {
        const cleanLabel = String(button.textContent || "")
          .replace(/\\s+\\d+$/, "")
          .trim();

        const shouldShow = visibleTabs.includes(cleanLabel);

        button.style.display = shouldShow ? "" : "none";
        button.setAttribute("data-portal-visible", shouldShow ? "true" : "false");
      });
    });
  }, [portalMode, activeTab]);
`;

if (!source.includes("const [portalMode, setPortalMode]")) {
  const activeTabPattern =
    /const\s*\[\s*activeTab\s*,\s*setActiveTab\s*\]\s*=\s*useState\([\s\S]*?\);\s*/;

  if (!activeTabPattern.test(source)) {
    throw new Error("Could not find activeTab state in App.jsx.");
  }

  source = source.replace(activeTabPattern, (match) => match + portalStateBlock);
}

if (!source.includes("<PortalModeControls portalMode={portalMode}")) {
  const appFunctionIndex = source.indexOf("export default function App");
  const navCloseIndex = source.indexOf("</nav>", appFunctionIndex);

  if (navCloseIndex === -1) {
    throw new Error("Could not find closing </nav> inside App.");
  }

  source =
    source.slice(0, navCloseIndex + "</nav>".length) +
    `\n\n        <PortalModeControls portalMode={portalMode} setPortalMode={setPortalMode} />` +
    source.slice(navCloseIndex + "</nav>".length);
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Portal Bundle 1 installed.");
console.log(`Backup saved at: ${backupPath}`);