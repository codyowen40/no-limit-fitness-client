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
  `App-before-fix-duplicate-messages-nav-final-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

// Remove ONLY the manually injected duplicate Messages button.
// Preserve the original Messages button that has the unread count.
const injectedMessagesButtonPattern =
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g;

const matches = source.match(injectedMessagesButtonPattern) || [];

if (matches.length === 0) {
  console.log("No injected duplicate Messages nav button found.");
} else {
  source = source.replace(injectedMessagesButtonPattern, "\n");
  console.log(`Removed ${matches.length} injected duplicate Messages nav button(s).`);
}

// Make sure Portal Bundle visibility logic keeps Messages visible.
source = source.replaceAll(
  `"Tracker",
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

source = source.replaceAll(
  `"Tracker",
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

console.log("Duplicate Messages nav cleanup complete.");
console.log("Original Messages nav button with unread count was preserved.");
console.log(`Backup saved at: ${backupPath}`);