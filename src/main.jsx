import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initSynergyMatrixUrl } from "./tauriDataset.js";
import { getVersion } from "@tauri-apps/api/app";

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);

(async () => {
  try {
    await initSynergyMatrixUrl();
  } catch (e) {
    console.warn("[dataset] init failed, using bundled JSON", e);
  }

  // Best-effort: app version (works in Tauri, will fail in plain web)
  try {
    window.__APP_VERSION__ = await getVersion();
  } catch {
    // ignore (web dev mode etc.)
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
})();
