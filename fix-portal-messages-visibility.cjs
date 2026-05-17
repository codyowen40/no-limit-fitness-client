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
  `App-before-fix-portal-messages-visibility-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

// Remove any old manually injected duplicate Messages button.
// This preserves the real Messages nav button with unread count.
const injectedMessagesButtonPattern =
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g;

source = source.replace(injectedMessagesButtonPattern, "\n");

// Make Portal Bundle visibility logic always allow the real Messages nav button.
const oldShouldShow =
  "const shouldShow = visibleTabs.includes(cleanLabel);";

const newShouldShow =
  "const shouldShow = visibleTabs.includes(cleanLabel) || cleanLabel === \"Messages\";";

if (source.includes(oldShouldShow)) {
  source = source.replace(oldShouldShow, newShouldShow);
} else if (!source.includes('cleanLabel === "Messages"')) {
  throw new Error(
    "Could not find portal visibility shouldShow line. No changes made."
  );
}

// Clean possible repeated Messages entries if previous scripts added them.
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

console.log("Portal Messages visibility fixed.");
console.log("The real Messages nav button will stay visible.");
console.log(`Backup saved at: ${backupPath}`);