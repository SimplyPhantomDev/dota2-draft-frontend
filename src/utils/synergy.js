export const calculateSynergyPicks = ({
  allyHeroIds = [],
  enemyHeroIds = [],
  bannedHeroIds = [],
  roleFilter = null,
  fullDraft = false,
  matchupIndex,
  heroes,
  heroPool = null,
}) => {
  if (!matchupIndex || !heroes || Object.keys(matchupIndex).length === 0 || Object.keys(heroes).length === 0) {
    return null;
  }

  const DRAFT_BONUS = 2;
  const CRUCIAL_TRIGGER_PICKS = 2;
  const SECONDARY_TRIGGER_PICKS = 3;

  const allHeroes = Object.values(heroes).flat(); // strength, agility, etc combined
  const heroById = new Map(allHeroes.map(h => [h.HeroId, h]));
  const countRoleOnAllies = (role) =>
    allyHeroIds.reduce((acc, hid) => {
      const h = heroById.get(hid);
      return acc + (((h?.roles) || []).includes(role) ? 1 : 0);
    }, 0);
  const pickedSet = new Set([...allyHeroIds, ...enemyHeroIds, ...bannedHeroIds]);

  // Because index uses String keys
  const allyKeys = allyHeroIds.map(String);
  const enemyKeys = enemyHeroIds.map(String);

  // ----- FULL DRAFT MODE -----
  if (fullDraft && allyHeroIds.length === 5 && enemyHeroIds.length === 5) {
    const teamStats = { ally: [], enemy: [] };

    const allyTeamKeys = allyHeroIds.map(String);
    const enemyTeamKeys = enemyHeroIds.map(String);

    for (const teamName of ["ally", "enemy"]) {
      const teamIds = teamName === "ally" ? allyHeroIds : enemyHeroIds;
      const teamKeys = teamName === "ally" ? allyTeamKeys : enemyTeamKeys;
      const opponentKeys = teamName === "ally" ? enemyTeamKeys : allyTeamKeys;

      for (const heroId of teamIds) {
        const entry = matchupIndex[String(heroId)];
        if (!entry) continue;

        let synergy = 0;
        const selfKey = String(heroId);

        // Sum synergy with teammates (exclude self)
        for (const mateKey of teamKeys) {
          if (mateKey === selfKey) continue;
          synergy += entry.withMap.get(mateKey) ?? 0;
        }

        // Sum counter vs opponents
        let counter = 0;
        for (const oppKey of opponentKeys) {
          counter += entry.vsMap.get(oppKey) ?? 0;
        }

        const hero = heroById.get(heroId);
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

  // ----- SUGGESTION MODE -----
  const suggestions = [];

  const needsDisable =
    allyHeroIds.length >= SECONDARY_TRIGGER_PICKS && countRoleOnAllies("Disabler") === 0;

  const needsPush =
    allyHeroIds.length >= SECONDARY_TRIGGER_PICKS && countRoleOnAllies("Pusher") === 0;

  const needsInitiator =
    allyHeroIds.length >= CRUCIAL_TRIGGER_PICKS && countRoleOnAllies("Initiator") === 0;

  for (const hero of allHeroes) {
    const id = hero.HeroId;
    if (pickedSet.has(id)) continue;

    const roleMismatch = roleFilter && !(hero.roles || []).includes(roleFilter);
    if (roleMismatch) continue;

    const entry = matchupIndex[String(id)];
    if (!entry) continue;

    const bonuses = [];
    let synergyBase = 0;

    for (const allyKey of allyKeys) {
      synergyBase += entry.withMap.get(allyKey) ?? 0;
    }

    let synergyBonus = 0;

    if (needsDisable && (hero.roles || []).includes("Disabler")) {
      synergyBonus += DRAFT_BONUS;
      bonuses.push({
        type: "needsDisable",
        label: "No disablers in team",
        value: DRAFT_BONUS,
      });
    }

    if (needsPush && (hero.roles || []).includes("Pusher")) {
      synergyBonus += DRAFT_BONUS;
      bonuses.push({
        type: "needsPush",
        label: "No pushers in team",
        value: DRAFT_BONUS,
      });
    }

    if (needsInitiator && (hero.roles || []).includes("Initiator")) {
      synergyBonus += DRAFT_BONUS;
      bonuses.push({
        type: "needsInitiator",
        label: "No initiator in team",
        value: DRAFT_BONUS,
      });
    }

    let counter = 0;
    for (const enemyKey of enemyKeys) {
      counter += entry.vsMap.get(enemyKey) ?? 0;
    }

    const synergy = synergyBase + synergyBonus;
    const total = synergy + counter;

    suggestions.push({
      HeroId: hero.HeroId,
      name: hero.name,
      icon_url: hero.icon_url,
      synergyScore: synergy.toFixed(2),
      counterScore: counter.toFixed(2),
      totalScore: total.toFixed(2),
      synergyBase,
      synergyBonus,
      bonuses,
    });
  }

  // Sort by numeric value (strings from toFixed still subtract fine, but this is explicit)
  suggestions.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));

  const inPool = [];
  const outPool = [];

  for (const h of suggestions) {
    if (heroPool && heroPool.includes(h.HeroId)) inPool.push(h);
    else outPool.push(h);
  }

  return { mode: "suggestion", inPool, outPool };
};


export const calculatePoolSynergies = ({
  heroPool = [],
  allyHeroIds = [],
  enemyHeroIds = [],
  bannedHeroIds = [],
  matchupIndex,
  heroes,
}) => {
  if (!matchupIndex || !heroes || heroPool.length === 0) return [];

  const DRAFT_BONUS = 2;
  const CRUCIAL_TRIGGER_PICKS = 2;
  const SECONDARY_TRIGGER_PICKS = 3;

  const allHeroes = Object.values(heroes).flat();
  const heroById = new Map(allHeroes.map(h => [h.HeroId, h]));
  const countRoleOnAllies = (role) =>
    allyHeroIds.reduce((acc, hid) => {
      const h = heroById.get(hid);
      return acc + (((h?.roles) || []).includes(role) ? 1 : 0);
    }, 0);
  const pickedSet = new Set([...allyHeroIds, ...enemyHeroIds, ...bannedHeroIds]);

  const allyKeys = allyHeroIds.map(String);
  const enemyKeys = enemyHeroIds.map(String);

  const allyDisablerCount = allyHeroIds.reduce((acc, hid) => {
    const h = heroById.get(hid);
    return acc + (((h?.roles) || []).includes("Disabler") ? 1 : 0);
  }, 0);

  const needsDisable =
    allyHeroIds.length >= SECONDARY_TRIGGER_PICKS && countRoleOnAllies("Disabler") === 0;

  const needsPush =
    allyHeroIds.length >= SECONDARY_TRIGGER_PICKS && countRoleOnAllies("Pusher") === 0;

  const needsInitiator =
    allyHeroIds.length >= CRUCIAL_TRIGGER_PICKS && countRoleOnAllies("Initiator") === 0;

  const poolStats = [];

  for (const id of heroPool) {
    if (pickedSet.has(id)) continue;

    const entry = matchupIndex[String(id)];
    const hero = heroById.get(id);
    if (!entry || !hero) continue;

    const bonuses = [];
    let synergyBase = 0;
    for (const allyKey of allyKeys) {
      synergyBase += entry.withMap.get(allyKey) ?? 0;
    }

    let counter = 0;
    for (const enemyKey of enemyKeys) {
      counter += entry.vsMap.get(enemyKey) ?? 0;
    }

    let synergyBonus = 0;
    if (needsDisable && (hero.roles || []).includes("Disabler")) {
      synergyBonus += DRAFT_BONUS;
      bonuses.push({
        type: "needsDisable",
        label: "No disablers in team",
        value: DRAFT_BONUS,
      });
    }

    if (needsPush && (hero.roles || []).includes("Pusher")) {
      synergyBonus += DRAFT_BONUS;
      bonuses.push({
        type: "needsPush",
        label: "No pushers in team",
        value: DRAFT_BONUS,
      });
    }

    if (needsInitiator && (hero.roles || []).includes("Initiator")) {
      synergyBonus += DRAFT_BONUS;
      bonuses.push({
        type: "needsInitiator",
        label: "No initiator in team",
        value: DRAFT_BONUS,
      });
    }

    const total = (synergyBase + synergyBonus) + counter;

    poolStats.push({
      HeroId: hero.HeroId,
      name: hero.name,
      icon_url: hero.icon_url,
      totalScore: total.toFixed(2),
      synergyBase,
      synergyBonus,
      bonuses,
    });
  }

  return poolStats.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
};

export const getSynergyWith = (matchupIndex, heroId, allyId) => {
  return matchupIndex?.[String(heroId)]?.withMap?.get(String(allyId)) ?? 0;
};

export const getCounterVs = (matchupIndex, heroId, enemyId) => {
  return matchupIndex?.[String(heroId)]?.vsMap?.get(String(enemyId)) ?? 0;
};

export function getWinProbability(delta) {
  const maxWinrate = 80;
  const minWinrate = 20;
  const growthRate = 0.025;
  const adjusted = delta * growthRate;

  const probability = 50 + (maxWinrate - 50) * Math.tanh(adjusted);
  return Math.max(minWinrate, Math.min(maxWinrate, probability.toFixed(2)));
}

