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
  `App-before-backend-8-import-fix-v3-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const requiredNames = [
  "fetchBackendClients",
  "fetchBackendPlans",
  "fetchBackendWorkoutLogs",
  "fetchBackendMessages",
  "fetchBackendNotifications",
  "fetchBackendNotificationPreferences",
  "fetchBackendExerciseLibrary",
];

const bridgeImportPattern =
  /import\s*\{[\s\S]*?\}\s*from\s*["']\.\/lib\/noLimitBackendBridge["'];?\s*/g;

const matchesBefore = source.match(bridgeImportPattern) || [];

source = source.replace(bridgeImportPattern, "");

const cleanBridgeImport = `import {
  ${requiredNames.sort().join(",\n  ")},
} from "./lib/noLimitBackendBridge";
`;

const importPattern = /import[\s\S]*?from\s*["'][^"']+["'];?\s*/g;

let lastImportEnd = 0;
let match;

while ((match = importPattern.exec(source)) !== null) {
  lastImportEnd = importPattern.lastIndex;
}

if (lastImportEnd > 0) {
  source =
    source.slice(0, lastImportEnd) +
    cleanBridgeImport +
    source.slice(lastImportEnd);
} else {
  source = cleanBridgeImport + "\n" + source;
}

const matchesAfter = source.match(bridgeImportPattern) || [];

if (matchesAfter.length !== 1) {
  throw new Error(
    `Backend bridge import fix failed. Expected 1 import, found ${matchesAfter.length}.`
  );
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Backend 8 duplicate import fix v3 complete.");
console.log(`Backend bridge imports before fix: ${matchesBefore.length}`);
console.log(`Backend bridge imports after fix: ${matchesAfter.length}`);
console.log(`Backup saved at: ${backupPath}`);