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
  `App-before-runtime-messages-nav-fix-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

// Remove old manually injected duplicate Messages buttons.
source = source.replace(
  /\n\s*<button\s*\n\s*type="button"\s*\n\s*data-nlf-messages-nav="true"[\s\S]*?\n\s*<\/button>\s*/g,
  "\n"
);

// Make existing portal visibility logic keep Messages visible.
source = source.replaceAll(
  `const shouldShow = visibleTabs.includes(cleanLabel);`,
  `const shouldShow = visibleTabs.includes(cleanLabel) || cleanLabel === "Messages";`
);

const appStartIndex = source.indexOf("export default function App");

if (appStartIndex === -1) {
  throw new Error("Could not find export default function App.");
}

const returnIndex = source.indexOf("\n  return (", appStartIndex);

if (returnIndex === -1) {
  throw new Error("Could not find App return block.");
}

const runtimeMessagesNavEffect = `
  useEffect(() => {
    function getCleanNavLabel(button) {
      return String(button?.textContent || "")
        .replace(/\\s+\\d+$/, "")
        .trim();
    }

    function ensureRuntimeMessagesNavButton() {
      const nav = document.querySelector("nav");

      if (!nav) return;

      const navButtons = Array.from(nav.querySelectorAll("button"));
      const existingMessagesButtons = navButtons.filter(
        (button) => getCleanNavLabel(button) === "Messages"
      );

      existingMessagesButtons.forEach((button, index) => {
        if (index === 0) {
          button.style.display = "";
          button.setAttribute("data-portal-visible", "true");
        } else if (button.getAttribute("data-nlf-runtime-messages-nav") === "true") {
          button.remove();
        }
      });

      if (existingMessagesButtons.length > 0) return;

      const button = document.createElement("button");

      button.type = "button";
      button.textContent = "Messages";
      button.setAttribute("data-nlf-runtime-messages-nav", "true");

      button.className =
        activeTab === "Messages"
          ? "rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black"
          : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]";

      button.addEventListener("click", () => {
        setActiveTab("Messages");
      });

      nav.insertBefore(button, nav.querySelector('button:last-child'));
    }

    ensureRuntimeMessagesNavButton();

    const animationFrame = window.requestAnimationFrame(() => {
      ensureRuntimeMessagesNavButton();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeTab, portalMode]);

`;

if (!source.includes("ensureRuntimeMessagesNavButton")) {
  source =
    source.slice(0, returnIndex) +
    runtimeMessagesNavEffect +
    source.slice(returnIndex);
}

fs.writeFileSync(appPath, source, "utf8");

console.log("Runtime Messages nav fix installed.");
console.log("The app will keep one visible Messages nav button.");
console.log(`Backup saved at: ${backupPath}`);