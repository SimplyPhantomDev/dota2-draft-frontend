import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initSynergyMatrixUrl } from "./tauriDataset.js";

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);

initSynergyMatrixUrl()
  .catch((e) => console.warn("[dataset] init failed, using bundled JSON", e))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });