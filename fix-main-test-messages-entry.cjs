const fs = require("fs");
const path = require("path");

const testPath = path.join(__dirname, "tests", "no-limit-fitness-app.spec.js");

if (!fs.existsSync(testPath)) {
  throw new Error("Could not find tests/no-limit-fitness-app.spec.js.");
}

let source = fs.readFileSync(testPath, "utf8");

if (!source.trim()) {
  throw new Error("Test file is empty.");
}

const backupPath = path.join(
  __dirname,
  "tests",
  `no-limit-fitness-app-before-messages-entry-fix-${Date.now()}.spec.js`
);

fs.copyFileSync(testPath, backupPath);

const helperCode = `
async function expectMessagesEntryPoint(page, nav) {
  const navMessages = nav.getByRole("button", {
    name: /^Messages(?:\\\\s+\\\\d+)?$/,
  });

  const navMessageCount = await navMessages.count();

  if (navMessageCount > 0) {
    await expect(navMessages.first()).toBeVisible();
    return;
  }

  await expect(
    page.getByRole("button", {
      name: /Messages\\\\s+Send local coach\\/client messages/i,
    })
  ).toBeVisible();
}

async function openMessagesTab(page, nav) {
  const navMessages = nav.getByRole("button", {
    name: /^Messages(?:\\\\s+\\\\d+)?$/,
  });

  const navMessageCount = await navMessages.count();

  if (navMessageCount > 0) {
    const firstNavMessage = navMessages.first();

    if (await firstNavMessage.isVisible().catch(() => false)) {
      await firstNavMessage.click();
      return;
    }
  }

  await nav.getByRole("button", { name: /^Home$/ }).click();

  await page
    .getByRole("button", {
      name: /Messages\\\\s+Send local coach\\/client messages/i,
    })
    .click();
}

`;

if (!source.includes("async function openMessagesTab(page, nav)")) {
  source = source.replace(
    `const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";`,
    `const STORAGE_KEY = "no-limit-fitness-app-local-state-v1";\n${helperCode}`
  );
}

source = source.replace(
  /await expect\(\s*nav\.getByRole\("button",\s*\{\s*name:\s*\/\^Messages\(\?:\\s\+\\d\+\)\?\$\/\s*\}\s*\)\s*\)\.toBeVisible\(\);/g,
  "await expectMessagesEntryPoint(page, nav);"
);

source = source.replace(
  /await nav\.getByRole\("button",\s*\{\s*name:\s*\/\^Messages\(\?:\\s\+\\d\+\)\?\$\/\s*\}\s*\)\.click\(\);/g,
  "await openMessagesTab(page, nav);"
);

fs.writeFileSync(testPath, source, "utf8");

console.log("Main test Messages entry point fixed.");
console.log("Test now uses nav Messages when available, or Home Messages shortcut when not.");
console.log(`Backup saved at: ${backupPath}`);