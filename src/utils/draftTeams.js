// Existing storage, scoring and tutorial code uses these two internal keys.
// In ordinary drafts their meaning is fixed: ally = Radiant, enemy = Dire.
export const TEAM_LABELS = Object.freeze({
    ally: "Radiant",
    enemy: "Dire",
});

// Keep the existing practice script readable until its terminology is updated.
export const PRACTICE_TEAM_LABELS = Object.freeze({
    ally: "Ally Team",
    enemy: "Enemy Team",
});

// The scoring engine calls the team receiving a recommendation "ally".
// Reverse only its input view; the actual draft keeps its original order.
export function getRecommendationDraft(selectedHeroes, recommendationTeam) {
    return recommendationTeam === "enemy"
        ? { ally: selectedHeroes.enemy, enemy: selectedHeroes.ally }
        : selectedHeroes;
}