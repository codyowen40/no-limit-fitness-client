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
  `App-before-top-nav-alphabetical-titlecase-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const polishEffectPattern =
  /\n\s*\/\/ NLF_TOP_NAV_POLISH_START[\s\S]*?\/\/ NLF_TOP_NAV_POLISH_END\s*/g;

source = source.replace(polishEffectPattern, "\n");

const appStartIndex = source.indexOf("export default function App");

if (appStartIndex === -1) {
  throw new Error("Could not find export default function App.");
}

const returnIndex = source.indexOf("\n  return (", appStartIndex);

if (returnIndex === -1) {
  throw new Error("Could not find App return block.");
}

const polishEffect = `
  // NLF_TOP_NAV_POLISH_START
  useEffect(() => {
    function getCleanNavLabel(button) {
      return String(button?.textContent || "")
        .replace(/\\s+\\d+$/, "")
        .trim();
    }

    function polishTopNavigation() {
      const nav = document.querySelector("nav");

      if (!nav) return;

      const buttons = Array.from(nav.querySelectorAll("button"));

      buttons.forEach((button) => {
        const cleanLabel = getCleanNavLabel(button);

        if (cleanLabel === "Messages") {
          button.style.textTransform = "none";
          button.classList.remove("uppercase");
        }
      });

      const sortedButtons = buttons.slice().sort((firstButton, secondButton) => {
        const firstLabel = getCleanNavLabel(firstButton).toLowerCase();
        const secondLabel = getCleanNavLabel(secondButton).toLowerCase();

        return firstLabel.localeCompare(secondLabel);
      });

      sortedButtons.forEach((button) => {
        nav.appendChild(button);
      });
    }

    polishTopNavigation();

    const animationFrame = window.requestAnimationFrame(polishTopNavigation);
    const timer = window.setTimeout(polishTopNavigation, 150);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, [activeTab, portalMode]);
  // NLF_TOP_NAV_POLISH_END

`;

source =
  source.slice(0, returnIndex) + polishEffect + source.slice(returnIndex);

fs.writeFileSync(appPath, source, "utf8");

console.log("Top nav polished.");
console.log("Messages now displays as title case.");
console.log("Top navigation tabs are alphabetized.");
console.log(`Backup saved at: ${backupPath}`);