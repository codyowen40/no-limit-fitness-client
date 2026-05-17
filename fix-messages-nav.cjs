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
  `App-before-fix-messages-nav-v3-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

// Remove any previously injected Messages nav button first.
const injectedMessagesButtonPattern =
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g;

source = source.replace(injectedMessagesButtonPattern, "\n");

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
const navAlreadyHasMessages = />\s*Messages\s*</.test(navBlock) || /Messages\s*\{/.test(navBlock);

if (!navAlreadyHasMessages) {
  const messagesButton = `
          <button
            type="button"
            data-nlf-messages-nav="true"
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

// Make sure Portal Bundle 1 visibility logic does not hide Messages.
source = source.replace(
  `"Tracker",
        "Exercises"`,
  `"Tracker",
        "Messages",
        "Exercises"`
);

source = source.replace(
  `"Tracker",
        "Messages",
        "Messages",
        "Exercises"`,
  `"Tracker",
        "Messages",
        "Exercises"`
);

source = source.replace(
  `"Tracker",
        "Exercises"`,
  `"Tracker",
        "Messages",
        "Exercises"`
);

fs.writeFileSync(appPath, source, "utf8");

console.log("Messages nav button fixed with v3 fixer.");
console.log(`Backup saved at: ${backupPath}`);