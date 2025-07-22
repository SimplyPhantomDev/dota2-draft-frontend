const ROLE_ORDER = ["safelane", "midlane", "offlane", "support", "hard support"];

export function predictEnemyRoles(enemyheroIds, heroRoleMap) {
    if (!enemyheroIds || enemyheroIds.length === 0) return {};

    // Build lookup for result
    const assignedRoles = new Set();
    const assignments = {};

    // Convert to array of objects with role data
    const heroesWithData = enemyheroIds.map(HeroId => {
        const roles = heroRoleMap[HeroId];
        return {
            HeroId,
            primary: roles?.primary || [],
            secondary: roles?.secondary || [],
            fallback: roles?.fallback || null,
        };
    });

    // Sort by fewest primary roles, then by HeroId for determinism
    heroesWithData.sort((a, b) => {
        if (a.primary.length !== b.primary.length) {
            return a.primary.length - b.primary.length;
        }

        return a.HeroId - b.HeroId;
    });

    // Try to assign roles to each hero
    for (const hero of heroesWithData) {
        const allOptions = [
            ...hero.primary,
            ...hero.secondary,
            ...(hero.fallback ? [hero.fallback] : []),
        ];

        let assigned = false;

        for (const role of allOptions) {
            if (!assignedRoles.has(role)) {
                assignments[hero.HeroId] = role;
                assignedRoles.add(role);
                assigned = true;
                break;
            }
        }

        if (!assigned) {
            assignments[hero.HeroId] = "?";
        }
    }

    return assignments;
}