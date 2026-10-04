import { exists, mkdir, writeTextFile, readTextFile, rename, BaseDirectory } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

const DIR = "datasets";
const SLOTS = [DIR + "/cache-a", DIR + "/cache-b"];
const ACTIVE = DIR + "/active.json";
const PENDING = DIR + "/pending.json";
const OPTIONS = { baseDir: BaseDirectory.AppData };
const RENAME_OPTIONS = {
    oldPathBaseDir: BaseDirectory.AppData,
    newPathBaseDir: BaseDirectory.AppData
};
const REMOTE_MANIFEST_URL =
    "https://raw.githubusercontent.com/SimplyPhantomDev/d2dt-dataset/main/manifest.json";

function requireValid(condition, message) {
    if (!condition) throw new Error(message);
}

function validateManifest(m) {
    requireValid(
        m && m.schema === 1 &&
        typeof m.generatedAt === "string" && Number.isFinite(Date.parse(m.generatedAt)) &&
        m.file === "synergyMatrix.json" && m.heroesFile === "heroes.json" &&
        Number.isSafeInteger(m.bytes) && m.bytes > 0 &&
        Number.isSafeInteger(m.heroesBytes) && m.heroesBytes > 0 &&
        typeof m.sha256 === "string" && /^[a-f0-9]{64}$/i.test(m.sha256) &&
        typeof m.heroesSha256 === "string" && /^[a-f0-9]{64}$/i.test(m.heroesSha256),
        "Invalid dataset manifest"
    );
}

async function verifyFile(text, bytes, hash, name) {
    const encoded = new TextEncoder().encode(text);
    requireValid(encoded.byteLength === bytes, name + " size does not match its manifest");
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const actual = Array.from(new Uint8Array(digest), byte =>
        byte.toString(16).padStart(2, "0")
    ).join("");
    requireValid(actual === hash.toLowerCase(), name + " hash does not match its manifest");
}

// Verify both exact file contents and the structure expected by the scoring code.
async function validateDataset(data) {
    const m = data.manifest;
    validateManifest(m);
    await Promise.all([
        verifyFile(data.matrixText, m.bytes, m.sha256, m.file),
        verifyFile(data.heroesText, m.heroesBytes, m.heroesSha256, m.heroesFile)
    ]);

    const heroes = JSON.parse(data.heroesText);
    const matrix = JSON.parse(data.matrixText);
    requireValid(Array.isArray(heroes) && heroes.length > 0, "Invalid hero list");
    const ids = new Set();
    for (const hero of heroes) {
        requireValid(
            hero && Number.isSafeInteger(hero.HeroId) && hero.HeroId > 0 &&
            !ids.has(hero.HeroId) && typeof hero.name === "string" && hero.name.length > 0 &&
            typeof hero.icon_url === "string" && hero.icon_url.length > 0 &&
            ["str", "agi", "int", "all"].includes(hero.primaryAttribute) &&
            Array.isArray(hero.roles) && hero.roles.every(role => typeof role === "string") &&
            (hero.aliases === undefined || (Array.isArray(hero.aliases) &&
                hero.aliases.every(alias => typeof alias === "string"))),
            "Invalid or duplicate hero entry"
        );
        ids.add(hero.HeroId);
    }
    requireValid(
        matrix && typeof matrix === "object" && !Array.isArray(matrix) &&
        Object.keys(matrix).length === ids.size,
        "Matrix does not match the hero list"
    );
    for (const id of ids) {
        const row = matrix[String(id)];
        requireValid(row && row.heroId === id, "Missing or invalid matrix row");
        for (const key of ["with", "vs"]) {
            const pairs = row[key];
            requireValid(Array.isArray(pairs) && pairs.length === ids.size - 1,
                "Incomplete matrix pair coverage");
            const seen = new Set();
            for (const pair of pairs) {
                requireValid(pair && ids.has(pair.heroId2) && pair.heroId2 !== id &&
                    !seen.has(pair.heroId2) && Number.isFinite(pair.synergy),
                    "Invalid or duplicate matrix pair");
                seen.add(pair.heroId2);
            }
        }
    }
}

async function fetchText(url, signal) {
    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) throw new Error("Dataset fetch failed: " + response.status);
    return response.text();
}

async function readCached(dir) {
    try {
        if (!await exists(dir + "/manifest.json", OPTIONS)) return null;
        const [manifestText, matrixText, heroesText] = await Promise.all([
            readTextFile(dir + "/manifest.json", OPTIONS),
            readTextFile(dir + "/synergyMatrix.json", OPTIONS),
            readTextFile(dir + "/heroes.json", OPTIONS)
        ]);
        const data = { dir, manifestText, manifest: JSON.parse(manifestText), matrixText, heroesText };
        await validateDataset(data);
        return data;
    } catch (error) {
        console.warn("[dataset] unusable cached dataset:", dir, error);
        return null;
    }
}

async function readPointer(path) {
    try {
        if (!await exists(path, OPTIONS)) return null;
        const pointer = JSON.parse(await readTextFile(path, OPTIONS));
        requireValid(pointer && SLOTS.includes(pointer.dir), "Invalid dataset cache pointer");
        return await readCached(pointer.dir);
    } catch (error) {
        console.warn("[dataset] unusable cache pointer:", path, error);
        return null;
    }
}

// Write and read back a complete set before publishing a pointer to it.
async function writeCached(dir, data) {
    await mkdir(dir, { ...OPTIONS, recursive: true });
    await Promise.all([
        writeTextFile(dir + "/synergyMatrix.json", data.matrixText, OPTIONS),
        writeTextFile(dir + "/heroes.json", data.heroesText, OPTIONS)
    ]);
    await writeTextFile(dir + "/manifest.json", data.manifestText, OPTIONS);
    const saved = await readCached(dir);
    requireValid(saved, "Saved dataset failed verification");
    return saved;
}

async function writePointer(path, dir) {
    await writeTextFile(path + ".tmp", JSON.stringify({ dir }), OPTIONS);
    await rename(path + ".tmp", path, RENAME_OPTIONS);
}

// Download into the inactive slot; startup activates it only after verification.
async function stageUpdate(active, pending, signal) {
    const manifestText = await fetchText(
        REMOTE_MANIFEST_URL + "?t=" + Date.now(),
        signal
    );
    const manifest = JSON.parse(manifestText);
    validateManifest(manifest);

    const latestKnown = Math.max(
        Date.parse(active.manifest.generatedAt),
        pending ? Date.parse(pending.manifest.generatedAt) : -Infinity
    );
    if (Date.parse(manifest.generatedAt) <= latestKnown) return;

    const [matrixText, heroesText] = await Promise.all([
        fetchText(new URL(manifest.file, REMOTE_MANIFEST_URL).toString(), signal),
        fetchText(new URL(manifest.heroesFile, REMOTE_MANIFEST_URL).toString(), signal)
    ]);

    const data = { manifestText, manifest, matrixText, heroesText };
    await validateDataset(data);

    const dir = active.dir === SLOTS[0] ? SLOTS[1] : SLOTS[0];
    await writeCached(dir, data);
    await writePointer(PENDING, dir);

    console.info("[dataset] verified update ready:", manifest.generatedAt);
}

export async function initSynergyMatrixUrl() {
    await mkdir(DIR, { ...OPTIONS, recursive: true });
    let active = await readPointer(ACTIVE);
    const pending = await readPointer(PENDING);

    // main.jsx awaits this function before rendering, so activation cannot erase a draft.
    if (pending && (!active || Date.parse(pending.manifest.generatedAt) >
        Date.parse(active.manifest.generatedAt))) {
        try {
            await rename(PENDING, ACTIVE, RENAME_OPTIONS);
            active = pending;
        } catch (error) {
            console.warn("[dataset] could not activate the pending dataset:", error);
            // If the active cache is broken, the verified pending files can still serve this launch.
            if (!active) active = pending;
        }
    }

    if (!active) {
        // Migrate the old flat cache when valid; otherwise recover from the bundled set.
        let data = await readCached(DIR);
        if (!data) {
            const [manifestText, matrixText, heroesText] = await Promise.all([
                fetchText("/manifest.json"), fetchText("/synergyMatrix.json"), fetchText("/heroes.json")
            ]);
            data = { manifestText, manifest: JSON.parse(manifestText), matrixText, heroesText };
            await validateDataset(data);
        }
        active = await writeCached(SLOTS[0], data);
        await writePointer(ACTIVE, active.dir);
    }

    // main.jsx is still waiting: check and activate updates before the draft screen opens.
    // Cancel slow network requests after eight seconds and keep the verified local dataset.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    try {
        await stageUpdate(active, pending, controller.signal);

        const ready = await readPointer(PENDING);
        if (
            ready &&
            Date.parse(ready.manifest.generatedAt) >
            Date.parse(active.manifest.generatedAt)
        ) {
            await rename(PENDING, ACTIVE, RENAME_OPTIONS);
            active = ready;
        }
    } catch (error) {
        console.warn("[dataset] startup update skipped; using cached data:", error);
    } finally {
        clearTimeout(timeoutId);
    }

    const dataDir = await appDataDir();
    window.__SYNERGY_MATRIX_URL__ = convertFileSrc(
        await join(dataDir, active.dir, "synergyMatrix.json")
    );
    window.__HEROES_URL__ = convertFileSrc(
        await join(dataDir, active.dir, "heroes.json")
    );
    window.__LOCAL_DATASET_MANIFEST__ = active.manifest;
}