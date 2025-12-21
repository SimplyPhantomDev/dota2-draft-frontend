// mergeHeroesAliases.js
// Usage (Windows):
//   node mergeHeroesAliases.js "C:\Users\tompp\Desktop\dota2-counter-tool\backend\heroes.json"

const fs = require("fs");
const path = require("path");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

const newHeroesPath = process.argv[2];
if (!newHeroesPath) {
  console.error('Missing argument. Example: node mergeHeroesAliases.js "C:\\path\\to\\heroes.json"');
  process.exit(1);
}

const appHeroesPath = path.join(process.cwd(), "public", "heroes.json");
if (!fs.existsSync(appHeroesPath)) {
  console.error("Could not find:", appHeroesPath);
  process.exit(1);
}

if (!fs.existsSync(newHeroesPath)) {
  console.error("Could not find:", newHeroesPath);
  process.exit(1);
}

const appHeroes = readJson(appHeroesPath);
const newHeroes = readJson(newHeroesPath);

// Build alias map from current app heroes.json
const aliasMap = new Map();
for (const h of appHeroes) {
  if (!h || h.HeroId == null) continue;
  if (Array.isArray(h.aliases) && h.aliases.length > 0) {
    aliasMap.set(h.HeroId, h.aliases);
  }
}

// Merge aliases into the new heroes list
let mergedAliasCount = 0;
const merged = newHeroes.map((h) => {
  if (!h || h.HeroId == null) return h;

  // If the new file already has aliases, keep them. Otherwise pull from app aliasMap.
  if (Array.isArray(h.aliases) && h.aliases.length > 0) return h;

  const aliases = aliasMap.get(h.HeroId);
  if (aliases) {
    mergedAliasCount++;
    return { ...h, aliases };
  }
  return h;
});

// If app had any heroes that don't exist in newHeroes, append them (rare, but safe)
const newIds = new Set(merged.filter(Boolean).map((h) => h.HeroId));
const extras = appHeroes.filter((h) => h && h.HeroId != null && !newIds.has(h.HeroId));
if (extras.length > 0) {
  console.warn(`[warn] App heroes.json had ${extras.length} hero(es) not present in the new file. Appending them.`);
}

const finalList = merged.concat(extras);

// Write back into the app’s public/heroes.json
writeJson(appHeroesPath, finalList);

console.log("✅ Wrote updated heroes.json to:", appHeroesPath);
console.log("Aliases merged onto heroes:", mergedAliasCount);
console.log("Total heroes written:", finalList.length);

// Quick sanity checks
const snap = finalList.find((h) => h?.HeroId === 128);
const largo = finalList.find((h) => h?.HeroId === 155);

console.log("Snapfire aliases:", snap?.aliases);
console.log("Largo present:", !!largo, largo ? { HeroId: largo.HeroId, name: largo.name, primaryAttribute: largo.primaryAttribute } : null);
