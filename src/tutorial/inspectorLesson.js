// Match tutorial requests to the live inspector without changing normal drafting.
export function canPerformInspectorAction(action, expected, state) {
    // Repositioning remains available so the floating tool cannot trap a task.
    if (action.type === "inspector-move") return state.open;
    if (!expected || action.type !== expected.type) return false;
    if (expected.inspectedHeroId != null
        && state.heroId !== expected.inspectedHeroId) return false;
    if (action.type !== "inspector" && !state.open) return false;

    return ["heroId", "team", "source", "value"].every(
        key => expected[key] === undefined || action[key] === expected[key]
    );
}

// Confirm committed UI state, rather than advancing from a click alone.
export function isInspectorTaskComplete(action, state, pending) {
    if (!action || !pending) return false;
    if (action.inspectedHeroId != null
        && state.heroId !== action.inspectedHeroId) return false;

    switch (action.type) {
        case "inspector":
            return state.open === action.value;
        case "inspector-move":
            return state.open && state.moves > pending.moves;
        case "inspect":
            return state.open && state.heroId === action.heroId
                && state.team === action.team
                && !state.allyHeroIds.includes(action.heroId)
                && !state.enemyHeroIds.includes(action.heroId);
        case "team-switch":
            return state.open && state.team === action.team;
        case "pick":
            return state.open && (action.team === "ally"
                ? state.allyHeroIds : state.enemyHeroIds).includes(action.heroId);
        case "ban":
            return state.open && state.bannedHeroIds.includes(action.heroId);
        default:
            return false;
    }
}
