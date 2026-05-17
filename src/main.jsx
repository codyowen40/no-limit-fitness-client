import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import {
  installLiveTestPortalStateSync,
  loadLiveTestPortalState,
} from "./lib/liveTestPortalSync.js";

async function startApp() {
  await loadLiveTestPortalState();

  installLiveTestPortalStateSync();

  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

startApp();
