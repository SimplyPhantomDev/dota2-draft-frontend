import { exists, mkdir, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

export async function initSynergyMatrixUrl() {
  const dir = "datasets";
  const relPath = `${dir}/synergyMatrix.json`;

  // Ensure AppData/datasets exists
  await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });

  // If missing, seed it from the bundled file served by Vite/Tauri
  const hasFile = await exists(relPath, { baseDir: BaseDirectory.AppData });
  if (!hasFile) {
    const res = await fetch("/synergyMatrix.json");
    if (!res.ok) throw new Error(`Failed to seed synergyMatrix.json: ${res.status}`);
    const text = await res.text();
    await writeTextFile(relPath, text, { baseDir: BaseDirectory.AppData });
    console.log("[dataset] seeded local synergyMatrix.json");
  }

  // Point the app to the local file
  const dataDir = await appDataDir();
  const fullPath = await join(dataDir, relPath);
  window.__SYNERGY_MATRIX_URL__ = convertFileSrc(fullPath);

  console.log("[dataset] using local dataset url:", window.__SYNERGY_MATRIX_URL__);
}
