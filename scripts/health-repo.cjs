const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function run(command) {
  console.log("\n$ " + command);
  execSync(command, { stdio: "inherit", shell: true });
}

function exists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

console.log("No Limit Fitness repo health check");
console.log("Working directory:", process.cwd());

run("git status --short");

if (!exists("src/App.jsx")) {
  console.error("ERROR: Missing src/App.jsx");
  process.exit(1);
}

if (!exists("package.json")) {
  console.error("ERROR: Missing package.json");
  process.exit(1);
}

if (!exists("tests")) {
  console.error("ERROR: Missing tests folder");
  process.exit(1);
}

console.log("\nHealth check complete. Core project files are present.");
