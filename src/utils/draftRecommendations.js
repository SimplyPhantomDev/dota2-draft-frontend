import { calculatePoolSynergies, calculateSynergyPicks } from "./synergy";
import { getRecommendationDraft } from "./draftTeams";

export function calculateDraftRecommendations({
    selectedHeroes,
    recommendationTeam,
    bannedHeroes,
    roleFilter,
    matchupIndex,
    heroes,
    heroPool,
    filterByHeroPool,
}) {
    const empty = {
        fullDraftStats: null,
        poolSuggestions: [],
        globalSuggestions: [],
        fullPoolSynergies: [],
    };

    if (!selectedHeroes.ally.length && !selectedHeroes.enemy.length) {
        return empty;
    }

    const fullDraft = selectedHeroes.ally.length === 5
        && selectedHeroes.enemy.length === 5;

    const scoringDraft = fullDraft
        ? selectedHeroes
        : getRecommendationDraft(selectedHeroes, recommendationTeam);

    const inputs = {
        allyHeroIds: scoringDraft.ally.map(hero => hero.HeroId),
        enemyHeroIds: scoringDraft.enemy.map(hero => hero.HeroId),
        bannedHeroIds: bannedHeroes.map(hero => hero.HeroId),
        matchupIndex,
        heroes,
    };

    const result = calculateSynergyPicks({
        ...inputs,
        roleFilter: fullDraft ? null : roleFilter,
        fullDraft,
        heroPool: filterByHeroPool ? heroPool : null,
    });

    if (result?.mode === "fullDraft") {
        return { ...empty, fullDraftStats: result.teams };
    }

    return {
        ...empty,
        poolSuggestions: result?.inPool?.slice(0, 3) ?? [],
        globalSuggestions: result?.outPool?.slice(0, 10) ?? [],
        fullPoolSynergies: calculatePoolSynergies({ ...inputs, heroPool }),
    };
}