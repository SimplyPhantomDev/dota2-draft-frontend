/**
 * Evaluate one hero for the selected team using the current draft.
 * Scores always describe the inspected hero's perspective.
 * Composition bonuses and win probability are intentionally excluded.
 */
export function calculateHeroInspection({
    hero,
    selectedTeam,
    selectedHeroes,
    bannedHeroes = [],
    matchupIndex,
}) {
    if (!hero || !["ally", "enemy"].includes(selectedTeam)) return null;

    const heroKey = String(hero.HeroId);
    const opponentTeam = selectedTeam === "ally" ? "enemy" : "ally";
    const entry = matchupIndex?.[heroKey];

    // Keep every drafted hero visible; unavailable pair data remains null.
    // Exclude the inspected hero itself if it has already been picked.
    const buildRows = (picks, map) => picks
        .filter(pick => String(pick.HeroId) !== heroKey)
        .map(pick => {
            const value = map?.get(String(pick.HeroId));

            return {
                hero: pick,
                score: Number.isFinite(value) ? value : null,
            };
        });

    const allyRows = buildRows(selectedHeroes[selectedTeam], entry?.withMap);
    const enemyRows = buildRows(selectedHeroes[opponentTeam], entry?.vsMap);

    // Missing data must not look like a genuine zero-score matchup.
    const sumRows = (rows, map) => {
        if (!map || rows.some(row => row.score === null)) return null;
        return rows.reduce((total, row) => total + row.score, 0);
    };

    const synergyScore = sumRows(allyRows, entry?.withMap);
    const counterScore = sumRows(enemyRows, entry?.vsMap);
    const totalScore = synergyScore === null || counterScore === null
        ? null
        : synergyScore + counterScore;

    const isHero = pick => String(pick.HeroId) === heroKey;
    const isPicked = selectedHeroes.ally.some(isHero) ||
        selectedHeroes.enemy.some(isHero);
    const isBanned = bannedHeroes.some(isHero);

    let pickBlockedReason = null;

    if (isBanned) {
        pickBlockedReason = "This hero is banned.";
    } else if (isPicked) {
        pickBlockedReason = "This hero has already been picked.";
    } else if (selectedHeroes[selectedTeam].length >= 5) {
        pickBlockedReason = `The ${selectedTeam} team is full.`;
    }

    return {
        hero,
        team: selectedTeam,
        allyRows,
        enemyRows,
        synergyScore,
        counterScore,
        totalScore,
        canPick: pickBlockedReason === null,
        pickBlockedReason,
    };
}