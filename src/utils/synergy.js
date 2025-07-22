export const calculateSynergyPicks = ({ allyHeroIds = [], enemyHeroIds = [], bannedHeroIds = [], roleFilter = null, fullDraft = false, matchupData, heroes, heroPool = null, filterByHeroPool }) => {
  if (!matchupData || !heroes || Object.keys(matchupData).length === 0 || Object.keys(heroes).length === 0) return null;

  const allHeroes = Object.values(heroes).flat(); // strength, agility, etc combined
  const pickedSet = new Set([...allyHeroIds, ...enemyHeroIds, ...bannedHeroIds]);

  if (fullDraft && allyHeroIds.length === 5 && enemyHeroIds.length === 5) {
    const teamStats = { ally: [], enemy: [] };

    for (const teamName of ["ally", "enemy"]) {
      const teamIds = teamName === "ally" ? allyHeroIds : enemyHeroIds;
      const opponentIds = teamName === "ally" ? enemyHeroIds : allyHeroIds;

      for (const heroId of teamIds) {
        const data = matchupData[heroId];
        if (!data) continue;

        const synergy = data.with
          .filter(({ heroId2 }) => teamIds.includes(heroId2))
          .reduce((sum, { synergy }) => sum + synergy, 0);

        const counter = data.vs
          .filter(({ heroId2 }) => opponentIds.includes(heroId2))
          .reduce((sum, { synergy }) => sum + synergy, 0);

        const hero = allHeroes.find(h => h.HeroId === heroId);
        if (!hero) continue;

        teamStats[teamName].push({
          HeroId: hero.HeroId,
          name: hero.name,
          icon_url: hero.icon_url,
          synergyScore: synergy.toFixed(2),
          counterScore: counter.toFixed(2),
          totalScore: (synergy + counter).toFixed(2),
        });
      }
    }

    return { mode: "fullDraft", teams: teamStats };
  }

  const synergyScores = {};
  const counterScores = {};

  for (const hero of allHeroes) {
    const id = hero.HeroId;
    if (pickedSet.has(id)) continue;

    const withSynergies = matchupData[id]?.with || [];
    const vsSynergies = matchupData[id]?.vs || [];

    for (const { heroId2, synergy } of withSynergies) {
      if (allyHeroIds.includes(heroId2)) {
        synergyScores[id] = (synergyScores[id] || 0) + synergy;
      }
    }

    for (const { heroId2, synergy } of vsSynergies) {
      if (enemyHeroIds.includes(heroId2)) {
        counterScores[id] = (counterScores[id] || 0) + synergy;
      }
    }
  }

  const combinedScores = {};
  for (const hero of allHeroes) {
    const id = hero.HeroId;
    const isPickedOrBanned = pickedSet.has(id);
    const roleMismatch = roleFilter && !hero.roles.includes(roleFilter);
    if (isPickedOrBanned || roleMismatch) continue;

    const synergy = synergyScores[id] || 0;
    const counter = counterScores[id] || 0;
    const total = synergy + counter;

    combinedScores[id] = {
      HeroId: hero.HeroId,
      name: hero.name,
      icon_url: hero.icon_url,
      synergyScore: synergy.toFixed(2),
      counterScore: counter.toFixed(2),
      totalScore: total.toFixed(2),
    };
  }

  const allSuggestions = Object.values(combinedScores).sort((a, b) => b.totalScore - a.totalScore);

  let inPool = [];
  let outPool = [];

  for (const hero of allSuggestions) {
    if (heroPool && heroPool.includes(hero.HeroId)) {
      inPool.push(hero);
    } else {
      outPool.push(hero);
    }
  }

  // Return both groups for separate rendering
  return {
    mode: "suggestion",
    inPool,
    outPool,
  };
};

export const calculatePoolSynergies = ({ heroPool = [], allyHeroIds = [], enemyHeroIds = [], bannedHeroIds = [], matchupData, heroes }) => {
  if (!matchupData || !heroes || heroPool.length === 0) return [];

  const allHeroes = Object.values(heroes).flat();
  const pickedSet = new Set([...allyHeroIds, ...enemyHeroIds, ...bannedHeroIds]);

  const synergyScores = {};
  const counterScores = {};

  for (const id of heroPool){
    if (pickedSet.has(id)) continue;

    const withSynergies = matchupData[id]?.with || [];
    const vsSynergies = matchupData[id]?.vs || [];

    for (const { heroId2, synergy } of withSynergies) {
      if (allyHeroIds.includes(heroId2)) {
        synergyScores[id] = (synergyScores[id] || 0) + synergy;
      }
    }

    for (const { heroId2, synergy } of vsSynergies) {
      if (enemyHeroIds.includes(heroId2)) {
        counterScores[id] = (counterScores[id] || 0) + synergy;
      }
    }
  }

  const poolStats = [];

  for (const id of heroPool) {
    if (pickedSet.has(id)) continue;

    const hero = allHeroes.find(h => h.HeroId === id);
    if (!hero) continue;

    const synergy = synergyScores[id] || 0;
    const counter = counterScores[id] || 0;
    const total = synergy + counter;

    poolStats.push({
      HeroId: hero.HeroId,
      name: hero.name,
      icon_url: hero.icon_url,
      totalScore: total.toFixed(2),
    });
  }

  return poolStats.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
};

export const getSynergyWith = (matchupData, heroId, otherId) => {
  const entry = matchupData?.[heroId]?.with?.find(pair => pair.heroId2 === otherId);
  return entry?.synergy ?? 0;
};

export const getCounterVs = (matchupData, heroId, enemyId) => {
  const entry = matchupData?.[heroId]?.vs?.find(pair => pair.heroId2 === enemyId);
  return entry?.synergy ?? 0;
};

export function getWinProbability(delta) {
    const maxWinrate = 80;
    const minWinrate = 20;
    const growthRate = 0.025;
    const adjusted = delta * growthRate;

    const probability = 50 + (maxWinrate - 50) * Math.tanh(adjusted);
    return Math.max(minWinrate, Math.min(maxWinrate, probability.toFixed(2)));
  }

