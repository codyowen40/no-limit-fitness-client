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
  `App-before-remove-runtime-messages-nav-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const runtimeEffectPattern =
  /\n\s*useEffect\(\(\)\s*=>\s*\{\s*\n\s*function getCleanNavLabel\(button\)[\s\S]*?ensureRuntimeMessagesNavButton[\s\S]*?\n\s*\},\s*\[activeTab,\s*portalMode\]\);\s*/;

const matches = source.match(runtimeEffectPattern);

if (!matches) {
  console.log("Runtime Messages nav effect was not found.");
  console.log("No runtime duplicate removal was needed.");
} else {
  source = source.replace(runtimeEffectPattern, "\n");
  console.log("Runtime Messages nav effect removed.");
}

// Remove any leftover old injected Messages button from source.
source = source.replace(
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g,
  "\n"
);

// Keep the real Messages button visible through portal visibility logic.
source = source.replaceAll(
  `const shouldShow = visibleTabs.includes(cleanLabel);`,
  `const shouldShow = visibleTabs.includes(cleanLabel) || cleanLabel === "Messages";`
);

source = source.replaceAll(
  `const shouldShow = visibleTabs.includes(cleanLabel) || cleanLabel === "Messages" || cleanLabel === "Messages";`,
  `const shouldShow = visibleTabs.includes(cleanLabel) || cleanLabel === "Messages";`
);

// Clean duplicate Messages entries in tab lists.
source = source.replaceAll(
  `"Tracker",
        "Messages",
        "Messages",
        "Exercises"`,
  `"Tracker",
        "Messages",
        "Exercises"`
);

source = source.replaceAll(
  `"Tracker",
      "Messages",
      "Messages",
      "Exercises"`,
  `"Tracker",
      "Messages",
      "Exercises"`
);

fs.writeFileSync(appPath, source, "utf8");

console.log("Messages nav cleanup complete.");
console.log("Only the original Messages button with unread count should remain.");
console.log(`Backup saved at: ${backupPath}`);