import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initSynergyMatrixUrl } from "./tauriDataset.js";
import { getVersion } from "@tauri-apps/api/app";

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);

async function readBundledManifest() {
    const response = await fetch("/manifest.json");

    if (!response.ok) {
        throw new Error("Bundled manifest could not be read.");
    }

    const manifest = await response.json();

    if (manifest?.schema !== 1
        || !/^\d+\.\d+[a-z]?$/.test(manifest.patch ?? "")) {
        throw new Error("Bundled manifest has no valid patch.");
    }

    return manifest;
}

(async () => {
    try {
        await initSynergyMatrixUrl();
    } catch (error) {
        console.warn("[dataset] init failed, using bundled JSON", error);

        delete window.__SYNERGY_MATRIX_URL__;
        delete window.__HEROES_URL__;
        delete window.__LOCAL_DATASET_MANIFEST__;

        // Read bundled metadata once so browser and native fallback mode
        // can check compatibility with the trained model.
        try {
            window.__LOCAL_DATASET_MANIFEST__ = await readBundledManifest();
        } catch (manifestError) {
            console.warn("[dataset] Bundled metadata unavailable", manifestError);
        }
    }

    try {
        window.__APP_VERSION__ = await getVersion();
    } catch {
        // App version is unavailable in ordinary browser development.
    }

    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
})();