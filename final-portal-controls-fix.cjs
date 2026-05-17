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
  `App-before-final-portal-controls-fix-${new Date()
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

if (!app.includes("function TestUnlockedPortalModeControls")) {
  app = app.replace(
    "export default function App() {",
    `function TestUnlockedPortalModeControls({ portalMode, setPortalMode, setActiveTab }) {
  let isUnlocked = false;

  try {
    isUnlocked =
      window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true";
  } catch {
    isUnlocked = false;
  }

  if (!isUnlocked) return null;

  const normalizedMode = String(portalMode || "demo").toLowerCase();

  const modeLabel =
    normalizedMode === "coach"
      ? "Coach Portal"
      : normalizedMode === "client"
        ? "Client Portal"
        : "Demo Preview";

  function choosePortalMode(nextMode) {
    try {
      window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, nextMode);
    } catch {
      // LocalStorage can fail in restricted browser modes.
    }

    setPortalMode(nextMode);

    if (nextMode === "coach") {
      setActiveTab("Coach");
      return;
    }

    if (nextMode === "client") {
      setActiveTab("Client");
      return;
    }

    setActiveTab("Home");
  }

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
          <p className="mt-1 max-w-3xl text-sm text-zinc-300">
            Test unlock is active. Demo, coach, and client portal routing can be checked safely.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choosePortalMode("demo")}
            className={
              normalizedMode === "demo"
                ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
            }
          >
            Demo Preview
          </button>

          <button
            type="button"
            onClick={() => choosePortalMode("coach")}
            className={
              normalizedMode === "coach"
                ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
            }
          >
            Coach Portal
          </button>

          <button
            type="button"
            onClick={() => choosePortalMode("client")}
            className={
              normalizedMode === "client"
                ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
            }
          >
            Client Portal
          </button>
        </div>
      </div>
    </section>
  );
}

export default function App() {`
  );
}

if (!app.includes("<TestUnlockedPortalModeControls")) {
  app = app.replace(
    "</nav>",
    `</nav>

            <TestUnlockedPortalModeControls
              portalMode={portalMode}
              setPortalMode={setPortalMode}
              setActiveTab={setActiveTab}
            />`
  );
}

fs.writeFileSync(appPath, app, "utf8");

console.log("Final portal controls fix applied.");
console.log(`Backup saved here: ${backupPath}`);