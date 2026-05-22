const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = process.cwd();

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function lineOf(text, needle) {
  const index = text.indexOf(needle);
  if (index === -1) return "not found";
  return text.slice(0, index).split(/\\r?\\n/).length;
}

function listTest(name, text, needle) {
  console.log(name + ": " + lineOf(text, needle));
}

const appPath = path.join(root, "src", "App.jsx");
const pkgPath = path.join(root, "package.json");
const clientPolishPath = path.join(root, "tests", "client-portal-polish.spec.js");
const releaseLockPath = path.join(root, "tests", "bundle-12u-client-release-lock.spec.js");

const app = read(appPath);
const pkgRaw = read(pkgPath);
const clientPolish = read(clientPolishPath);
const releaseLock = read(releaseLockPath);

let pkg = {};
try {
  pkg = JSON.parse(pkgRaw);
} catch (error) {
  console.log("ERROR: package.json is not valid JSON.");
  console.log(error.message);
  process.exit(1);
}

console.log("");
console.log("No Limit Fitness repo map");
console.log("-------------------------");
console.log("App.jsx size: " + app.length);
console.log("package.json size: " + pkgRaw.length);
console.log("");

const appNeedles = [
  ["ClientPortalMyPlanPanel", "function ClientPortalMyPlanPanel"],
  ["Client My Plan dashboard", "Client My Plan dashboard"],
  ["Client nutrition and macros guide", "Client nutrition and macros guide"],
  ["Client exercise search and substitution guide", "Client exercise search and substitution guide"],
  ["Client full assigned plan test id", "client-full-assigned-plan"],
  ["View Full Plan", "View Full Plan"],
  ["Main navigation", "Main navigation"],
  ["Messages", "Messages"],
  ["CoachClientAssignmentPanel", "function CoachClientAssignmentPanel"],
  ["Archived Clients", "Archived Clients"],
  ["Client List", "Client List"],
  ["Exercise Library", "Exercise Library"],
];

for (const [label, needle] of appNeedles) {
  console.log(label + ": line " + lineOf(app, needle));
}

console.log("");
console.log("Tests:");
listTest("client-portal-polish Bundle 12S", clientPolish, "Bundle 12S");
listTest("client-portal-polish Bundle 12T", clientPolish, "Bundle 12T");
listTest("client full assigned plan routing", clientPolish, "client full assigned plan routing");
listTest("bundle-12u release lock", releaseLock, "Bundle 12U client release lock");

console.log("");
console.log("Package scripts found:");
const scripts = pkg.scripts || {};
Object.keys(scripts).sort().forEach((name) => {
  console.log("- " + name);
});

console.log("");
console.log("Git status:");
try {
  const status = execSync("git status --short", { cwd: root, encoding: "utf8" }).trim();
  console.log(status || "clean");
} catch (error) {
  console.log("git status unavailable: " + error.message);
}
