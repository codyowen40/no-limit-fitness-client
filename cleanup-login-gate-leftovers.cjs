const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const cssPath = path.join(__dirname, "src", "index.css");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx.");
}

if (!fs.existsSync(cssPath)) {
  throw new Error("Could not find src/index.css.");
}

let appSource = fs.readFileSync(appPath, "utf8");
let cssSource = fs.readFileSync(cssPath, "utf8");

const timestamp = Date.now();

fs.copyFileSync(
  appPath,
  path.join(__dirname, "src", `App-before-cleanup-login-gate-leftovers-${timestamp}.jsx`)
);

fs.copyFileSync(
  cssPath,
  path.join(__dirname, "src", `index-before-cleanup-login-gate-leftovers-${timestamp}.css`)
);

// Remove leftover Login Gate App.jsx block if it exists.
appSource = appSource.replace(
  /\n\s*\/\/ NLF_LOGIN_GATE_START[\s\S]*?\/\/ NLF_LOGIN_GATE_END\s*/g,
  "\n"
);

// Remove leftover Login Gate CSS that hides portal controls.
cssSource = cssSource.replace(
  /\n\/\* NLF_LOGIN_GATE_CSS_START \*\/[\s\S]*?\/\* NLF_LOGIN_GATE_CSS_END \*\/\n?/g,
  "\n"
);

fs.writeFileSync(appPath, appSource, "utf8");
fs.writeFileSync(cssPath, cssSource, "utf8");

console.log("Login Gate leftovers removed.");
console.log("Portal mode controls should be visible again.");
console.log("Backups saved in src folder.");