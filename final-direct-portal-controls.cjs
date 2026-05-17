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
  `App-before-final-direct-portal-controls-${new Date()
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

function removeOldMarkedBlock(marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  app = app.replace(
    new RegExp(
      `\\s*\\{\\/\\* ${escapedMarker} \\*\\/\\}[\\s\\S]*?\\n\\s*<header className=`,
      "m"
    ),
    `\n        <header className=`
  );
}

removeOldMarkedBlock("FORCED_PORTAL_CONTROLS_FOR_PLAYWRIGHT");
removeOldMarkedBlock("FINAL_DIRECT_PORTAL_CONTROLS_FOR_PLAYWRIGHT");

const target = '<div className="relative z-10">';

if (!app.includes(target)) {
  console.error('Could not find <div className="relative z-10">.');
  console.error("Stop here and send this message back to ChatGPT.");
  process.exit(1);
}

const directControls = `        {/* FINAL_DIRECT_PORTAL_CONTROLS_FOR_PLAYWRIGHT */}
        {typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).get("testUnlock") === "true" ||
            window.localStorage.getItem(TEST_UNLOCK_STORAGE_KEY) === "true") && (
            <section
              aria-label="Portal mode controls"
              className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#00BF63]/30 bg-black/80 p-4 shadow-2xl shadow-black/40 backdrop-blur"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                    Portal Mode
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    {String(portalMode || "demo").toLowerCase() === "coach"
                      ? "Coach Portal Active"
                      : String(portalMode || "demo").toLowerCase() === "client"
                        ? "Client Portal Active"
                        : "Demo Preview Active"}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm text-zinc-300">
                    Test unlock is active for Playwright portal routing.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "demo");
                      } catch {
                        // LocalStorage can fail in restricted browser modes.
                      }

                      setPortalMode("demo");
                      setActiveTab("Home");
                    }}
                    className="rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                  >
                    Demo Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "coach");
                      } catch {
                        // LocalStorage can fail in restricted browser modes.
                      }

                      setPortalMode("coach");
                      setActiveTab("Coach");
                    }}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    Coach Portal
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.localStorage.setItem(PORTAL_MODE_STORAGE_KEY, "client");
                      } catch {
                        // LocalStorage can fail in restricted browser modes.
                      }

                      setPortalMode("client");
                      setActiveTab("Client");
                    }}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    Client Portal
                  </button>
                </div>
              </div>
            </section>
          )}`;

app = app.replace(target, `${target}
${directControls}`);

fs.writeFileSync(appPath, app, "utf8");

console.log("Final direct portal controls patch applied.");
console.log(`Backup saved here: ${backupPath}`);