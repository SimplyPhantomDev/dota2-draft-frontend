import { predictLocalDraft } from "../model/localDraftModel";
// Draft storage keeps legacy key names: ally is Radiant and enemy is Dire.
// The model's known-Radiant prediction includes its learned map-side advantage.
export function calculateDraftWinProbability({
    allyHeroIds = [],
    enemyHeroIds = [],
    matchupIndex,
    patch = null,
} = {}) {
    const learned = predictLocalDraft({
        allyHeroIds,
        enemyHeroIds,
        patch,
    });


    // The first stored team is Radiant; use its known-side prediction.
    if (learned) {
        return {
            ...learned,
            ally: learned.allyAsRadiant,
            enemy: 1 - learned.allyAsRadiant,
        };
    }

    if (
        !matchupIndex ||
        !Array.isArray(allyHeroIds) || allyHeroIds.length !== 5 ||
        !Array.isArray(enemyHeroIds) || enemyHeroIds.length !== 5
    ) {
        return null;
    }

    const allyKeys = allyHeroIds.map(String);
    const enemyKeys = enemyHeroIds.map(String);

    // A complete draft must contain ten different heroes.
    if (new Set([...allyKeys, ...enemyKeys]).size !== 10) return null;

    const mean = values =>
        values.reduce((sum, value) => sum + value, 0) / values.length;

    function getTeamStrength(teamKeys, opponentKeys) {
        const strengths = [];

        for (const heroKey of teamKeys) {
            const entry = matchupIndex[heroKey];
            const baseline = entry?.baseline?.winRate;

            if (
                !Number.isFinite(baseline) || baseline < 0 || baseline > 1 ||
                !(entry.withMap instanceof Map) || !(entry.vsMap instanceof Map)
            ) {
                return null;
            }

            const withScores = teamKeys
                .filter(key => key !== heroKey)
                .map(key => entry.withMap.get(key));
            const vsScores = opponentKeys.map(key => entry.vsMap.get(key));

            // Missing matchup data must not silently become a neutral score.
            if ([...withScores, ...vsScores].some(value => !Number.isFinite(value))) {
                return null;
            }

            // Synergy values are percentage-point adjustments.
            // Give the ally and enemy averages equal weight, then convert to 0–1.
            strengths.push(baseline + (mean(withScores) + mean(vsScores)) / 200);
        }

        return mean(strengths);
    }

    const allyStrength = getTeamStrength(allyKeys, enemyKeys);
    const enemyStrength = getTeamStrength(enemyKeys, allyKeys);

    if (
        allyStrength === null || enemyStrength === null ||
        !Number.isFinite(allyStrength) || !Number.isFinite(enemyStrength)
    ) {
        return null;
    }

    // Reconcile the ally estimate with the enemy's implied loss estimate.
    // Swapping teams reverses the result; the two outputs always sum to one.
    const ally = Math.max(0, Math.min(1, (allyStrength + 1 - enemyStrength) / 2));

    return {
        ally,
        enemy: 1 - ally,
        method: "hero-winrates",
        predictorVersion: "baseline-average-v1",
    };
}