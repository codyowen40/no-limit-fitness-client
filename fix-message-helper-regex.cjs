const fs = require("fs");
const path = require("path");

const testPath = path.join(__dirname, "tests", "no-limit-fitness-app.spec.js");

if (!fs.existsSync(testPath)) {
  throw new Error("Could not find tests/no-limit-fitness-app.spec.js.");
}

let source = fs.readFileSync(testPath, "utf8");

const backupPath = path.join(
  __dirname,
  "tests",
  `no-limit-fitness-app-before-helper-regex-fix-${Date.now()}.spec.js`
);

fs.copyFileSync(testPath, backupPath);

const fixedHelpers = `async function expectMessagesEntryPoint(page, nav) {
  const navMessages = nav.getByRole("button", {
    name: /^Messages(?:\\s+\\d+)?$/,
  });

  const navMessageCount = await navMessages.count();

  if (navMessageCount > 0) {
    await expect(navMessages.first()).toBeVisible();
    return;
  }

  await expect(
    page.getByRole("button", {
      name: /Messages\\s+Send local coach\\/client messages/i,
    })
  ).toBeVisible();
}

async function openMessagesTab(page, nav) {
  const navMessages = nav.getByRole("button", {
    name: /^Messages(?:\\s+\\d+)?$/,
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
      name: /Messages\\s+Send local coach\\/client messages/i,
    })
    .click();
}

`;

const helperBlockPattern =
  /async function expectMessagesEntryPoint\(page, nav\)[\s\S]*?async function openMessagesTab\(page, nav\)[\s\S]*?\n}\s*\n/;

if (!helperBlockPattern.test(source)) {
  throw new Error("Could not find the two helper functions to replace.");
}

source = source.replace(helperBlockPattern, fixedHelpers);

fs.writeFileSync(testPath, source, "utf8");

console.log("Message helper regex fixed.");
console.log(`Backup saved at: ${backupPath}`);