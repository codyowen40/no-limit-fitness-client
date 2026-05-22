const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, "local-backups");
const backupDir = path.join(backupRoot, "backup-" + timestamp);

const itemsToCopy = [
  "src",
  "tests",
  "scripts",
  "package.json",
  "package-lock.json",
  "playwright.config.js",
  "vite.config.js",
  "index.html"
];

fs.mkdirSync(backupDir, { recursive: true });

for (const item of itemsToCopy) {
  const source = path.join(root, item);
  const destination = path.join(backupDir, item);

  if (!fs.existsSync(source)) continue;

  fs.cpSync(source, destination, {
    recursive: true,
    filter: (entry) => {
      return !entry.includes("node_modules") && !entry.includes("\\dist") && !entry.includes("/dist");
    }
  });
}

console.log("Local backup created:");
console.log(backupDir);
