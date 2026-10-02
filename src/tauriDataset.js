import { exists, mkdir, writeTextFile, readTextFile, rename, BaseDirectory } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

export async function initSynergyMatrixUrl() {
    const dir = "datasets";
    const relPath = `${dir}/synergyMatrix.json`;
    const heroesRelPath = `${dir}/heroes.json`;

    // Ensure AppData/datasets exists
    await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });

    const manifestRelPath = `${dir}/manifest.json`;
    const fsOptions = { baseDir: BaseDirectory.AppData };

    let cachedManifest = null;
    if (await exists(manifestRelPath, fsOptions)) {
        try {
            cachedManifest = JSON.parse(
                await readTextFile(manifestRelPath, fsOptions)
            );
        } catch {
            // Reinitialize an unreadable manifest from the bundled set.
        }
    }

    const hasMatrix = await exists(relPath, fsOptions);
    const hasHeroes = await exists(heroesRelPath, fsOptions);

    // The old, locally generated manifests did not contain these hashes.
    const needsSeed =
        !hasMatrix ||
        !hasHeroes ||
        !cachedManifest?.sha256 ||
        !cachedManifest?.heroesSha256 ||
        !Number.isFinite(Date.parse(cachedManifest?.generatedAt));

    if (needsSeed) {
        const files = ["synergyMatrix.json", "heroes.json", "manifest.json"];
        const [matrixText, heroesText, bundledManifestText] =
            await Promise.all(files.map(async (file) => {
                const res = await fetch(`/${file}`);
                if (!res.ok) {
                    throw new Error(`Failed to load bundled ${file}: ${res.status}`);
                }
                return res.text();
            }));

        const bundledManifest = JSON.parse(bundledManifestText);
        if (
            !bundledManifest.sha256 ||
            !bundledManifest.heroesSha256 ||
            !Number.isFinite(Date.parse(bundledManifest.generatedAt))
        ) {
            throw new Error("Bundled dataset manifest is invalid");
        }
        JSON.parse(matrixText);
        JSON.parse(heroesText);

        // Copy the matching dataset files and preserve the original manifest.
        await writeTextFile(relPath, matrixText, fsOptions);
        await writeTextFile(heroesRelPath, heroesText, fsOptions);
        await writeTextFile(manifestRelPath, bundledManifestText, fsOptions);
    }

    // Point the app to the local file
    const dataDir = await appDataDir();
    const fullPath = await join(dataDir, relPath);
    const heroesFullPath = await join(dataDir, heroesRelPath);
    window.__SYNERGY_MATRIX_URL__ = convertFileSrc(fullPath);
    window.__HEROES_URL__ = convertFileSrc(heroesFullPath);

    const manifestText = await readTextFile(`${dir}/manifest.json`, { baseDir: BaseDirectory.AppData });
    const manifest = JSON.parse(manifestText);
    window.__LOCAL_DATASET_MANIFEST__ = manifest;

    const REMOTE_MANIFEST_URL =
        "https://raw.githubusercontent.com/SimplyPhantomDev/d2dt-dataset/main/manifest.json";

    (async () => {
        try {
            // Add a cache-buster
            const sep = REMOTE_MANIFEST_URL.includes("?") ? "&" : "?";
            const manifestUrl = `${REMOTE_MANIFEST_URL}${sep}t=${Date.now()}`;
            const r = await fetch(manifestUrl, { cache: "no-store" });

            if (!r.ok) throw new Error(`remote manifest fetch failed: ${r.status}`);

            const remote = await r.json();

            const localTime = Date.parse(manifest.generatedAt);
            const remoteTime = Date.parse(remote.generatedAt);

            if (Number.isFinite(localTime) && Number.isFinite(remoteTime) && remoteTime > localTime) {

                // Download the dataset file referenced by the remote manifest
                const remoteDataUrl = new URL(remote.file, REMOTE_MANIFEST_URL).toString();
                const remoteHeroesUrl = new URL("heroes.json", REMOTE_MANIFEST_URL).toString();

                const dataRes = await fetch(remoteDataUrl, { cache: "no-store" });
                if (!dataRes.ok) throw new Error(`remote dataset fetch failed ${dataRes.status}`);

                const heroesRes = await fetch(remoteHeroesUrl, { cache: "no-store" });
                if (!heroesRes.ok) throw new Error(`remote heroes fetch failed ${heroesRes.status}`);

                const text = await dataRes.text();
                const tmpRelPath = `${dir}/synergyMatrix.json.tmp`;

                const heroesText = await heroesRes.text();
                const heroesTmpRelPath = `${dir}/heroes.json.tmp`;

                // Temporary write first
                await writeTextFile(tmpRelPath, text, { baseDir: BaseDirectory.AppData });
                await writeTextFile(heroesTmpRelPath, heroesText, { baseDir: BaseDirectory.AppData });

                // Swap atomically
                await rename(tmpRelPath, relPath, {
                    oldPathBaseDir: BaseDirectory.AppData,
                    newPathBaseDir: BaseDirectory.AppData
                });

                await rename(heroesTmpRelPath, heroesRelPath, {
                    oldPathBaseDir: BaseDirectory.AppData,
                    newPathBaseDir: BaseDirectory.AppData
                });

                // Then update local manifest
                await writeTextFile(`${dir}/manifest.json`, JSON.stringify(remote, null, 2), {
                    baseDir: BaseDirectory.AppData
                });

                window.location.reload();
            } else {
            }
        } catch (e) {
            console.warn("[dataset] remote check failed (ignored):", e);
        }
    })();
}
