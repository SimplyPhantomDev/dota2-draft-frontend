import { groupAndSortHeroes } from "../utils/groupHeroes";
import { indexMatrix } from "../utils/indexMatrix";

// Load the fixed practice files only when the tutorial is opened.
// These imports are independent of Tauri's active dataset and its update checks.
export async function loadTutorialDataset() {
  const [heroesModule, matrixModule, manifestModule] = await Promise.all([
    import("./data/heroes.json"),
    import("./data/synergyMatrix.json"),
    import("./data/manifest.json"),
  ]);

  const heroList = heroesModule.default;

  // Fresh grouped arrays and maps keep each practice session independent.
  return {
    heroes: groupAndSortHeroes(heroList),
    heroById: new Map(heroList.map(hero => [hero.HeroId, hero])),
    matchupIndex: indexMatrix(matrixModule.default),
    manifest: manifestModule.default,
  };
}