import { exists, mkdir, writeTextFile, readTextFile, rename, BaseDirectory } from "@tauri-apps/plugin-fs";
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

        const manifestRelPath = `${dir}/manifest.json`;
        const hasManifest = await exists(manifestRelPath, { baseDir: BaseDirectory.AppData });

        if (!hasManifest) {
            const bytes = new TextEncoder().encode(text).length;

            const manifest = {
                schema: 1,
                generatedAt: new Date().toISOString(),
                file: "synergyMatrix.json",
                bytes
            };

            await writeTextFile(manifestRelPath, JSON.stringify(manifest, null, 2), {
                baseDir: BaseDirectory.AppData
            });

            console.log("[dataset] seeded local manifest.json");
        }
    }

    // Point the app to the local file
    const dataDir = await appDataDir();
    const fullPath = await join(dataDir, relPath);
    window.__SYNERGY_MATRIX_URL__ = convertFileSrc(fullPath);

    console.log("[dataset] using local dataset url:", window.__SYNERGY_MATRIX_URL__);

    const manifestText = await readTextFile(`${dir}/manifest.json`, { baseDir: BaseDirectory.AppData });
    const manifest = JSON.parse(manifestText);
    console.log("[dataset] local manifest:", manifest);

    const REMOTE_MANIFEST_URL =
        "https://raw.githubusercontent.com/SimplyPhantomDev/d2dt-dataset/refs/heads/main/manifest.json";

    (async () => {
        try {
            // Add a cache-buster
            const sep = REMOTE_MANIFEST_URL.includes("?") ? "&" : "?";
            const manifestUrl = `${REMOTE_MANIFEST_URL}${sep}t=${Date.now()}`;
            const r = await fetch(manifestUrl, { cache: "no-store" });

            if (!r.ok) throw new Error(`remote manifest fetch failed: ${r.status}`);

            const remote = await r.json();
            console.log("[dataset] remote manifest:", remote);

            const localTime = Date.parse(manifest.generatedAt);
            const remoteTime = Date.parse(remote.generatedAt);

            if (Number.isFinite(localTime) && Number.isFinite(remoteTime) && remoteTime > localTime) {
                console.log("[dataset] UPDATE AVAILABLE (remote newer)");

                // Download the dataset file referenced by the remote manifest
                const remoteDataUrl = new URL(remote.file, REMOTE_MANIFEST_URL).toString();
                console.log("[dataset] downloading:", remoteDataUrl);

                const dataRes = await fetch(remoteDataUrl, { cache: "no-store" });
                if (!dataRes.ok) throw new Error(`remote dataset fetch failed ${dataRes.status}`);

                const text = await dataRes.text();
                const tmpRelPath = `${dir}/synergyMatrix.json.tmp`;

                // Temporary write first
                await writeTextFile(tmpRelPath, text, { baseDir: BaseDirectory.AppData });

                // Swap atomically
                await rename(tmpRelPath, relPath, {
                    oldPathBaseDir: BaseDirectory.AppData,
                    newPathBaseDir: BaseDirectory.AppData
                });

                // Then update local manifest
                await writeTextFile(`${dir}/manifest.json`, JSON.stringify(remote, null, 2), {
                    baseDir: BaseDirectory.AppData
                });

                console.log("[dataset] update downloaded and saved. Reloading...");
                window.location.reload();
            } else {
                console.log("[dataset] up to date");
            }
        } catch (e) {
            console.warn("[dataset] remote check failed (ignored):", e);
        }
    })();
}
