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
  `App-before-top-messages-tab-portal-fix-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

// Remove old unstable injected/runtime Messages buttons if any exist.
source = source.replace(
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g,
  "\n"
);

source = source.replace(
  /\n\s*<button[\s\S]*?data-nlf-runtime-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g,
  "\n"
);

// Make portal visibility rules allow Messages.
source = source.replace(
  /const\s+shouldShow\s*=\s*visibleTabs\.includes\(cleanLabel\)(?:\s*\|\|\s*cleanLabel\s*===\s*["']Messages["'])*\s*;/g,
  `const shouldShow = visibleTabs.includes(cleanLabel) || cleanLabel === "Messages";`
);

// Add Messages to tab arrays if Tracker goes straight to Exercises.
source = source.replace(
  /(["']Tracker["']\s*,\s*)(?!["']Messages["'])(["']Exercises["'])/g,
  `$1"Messages",\n        $2`
);

// Find the real App nav.
const appStartIndex = source.indexOf("export default function App");

if (appStartIndex === -1) {
  throw new Error("Could not find export default function App.");
}

const navStartIndex = source.indexOf("<nav", appStartIndex);

if (navStartIndex === -1) {
  throw new Error("Could not find opening <nav> inside App.jsx.");
}

const navCloseIndex = source.indexOf("</nav>", navStartIndex);

if (navCloseIndex === -1) {
  throw new Error("Could not find closing </nav> inside App.jsx.");
}

const navBlock = source.slice(navStartIndex, navCloseIndex + "</nav>".length);

const alreadyHasStableMessagesButton =
  navBlock.includes('data-nlf-top-messages-tab="true"');

if (!alreadyHasStableMessagesButton) {
  const messagesButton = `
          <button
            type="button"
            data-nlf-top-messages-tab="true"
            onClick={() => setActiveTab("Messages")}
            className={
              activeTab === "Messages"
                ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
                : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
            }
          >
            Messages
          </button>
`;

  source =
    source.slice(0, navCloseIndex) +
    messagesButton +
    source.slice(navCloseIndex);
}

// Prevent duplicate stable Messages buttons if this script is run twice.
const stableButtonPattern =
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-top-messages-tab="true"[\s\S]*?\n\s*<\/button>\s*/g;

const stableMatches = source.match(stableButtonPattern) || [];

if (stableMatches.length > 1) {
  let firstKept = false;

  source = source.replace(stableButtonPattern, (match) => {
    if (!firstKept) {
      firstKept = true;
      return match;
    }

    return "\n";
  });
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Top Messages tab fixed for coach/client portals.");
console.log("Messages should now show in the top nav for Demo, Coach, and Client.");
console.log(`Backup saved at: ${backupPath}`);