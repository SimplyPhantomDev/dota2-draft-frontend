// Pool lesson rules and dialogue use the practice dataset, never saved preferences.
export function canPerformPoolAction(action, expected, state, heroById) {
    if (!expected) return false;

    if (expected.type === "pool-select") {
        if (action.type === "pool-edit-mode") {
            return action.value === true && !state.editing;
        }

        return action.type === "pool-hero"
            && state.editing
            && heroById.has(action.heroId)
            && (state.heroPool.includes(action.heroId)
                ? action.value === false
                : action.value === true && state.heroPool.length < expected.count);
    }

    return action.type === expected.type
        && action.value === expected.value;
}

export function isPoolTaskComplete(expected, state, roleFilter) {
    switch (expected?.type) {
        case "role-filter":
            return roleFilter === expected.value;
        case "pool-select":
            return state.editing && state.heroPool.length === expected.count;
        case "pool-edit-mode":
            return state.editing === expected.value;
        case "pool-filter":
            return state.filtering === expected.value;
        case "pool-breakdown":
            return state.breakdownOpen === expected.value;
        default:
            return false;
    }
}

export function personalizePoolScript(script, choices, heroById, draft, bans) {
    const heroes = choices.map(id => heroById.get(id)).filter(Boolean);

    const unavailable = new Set([
        ...draft.ally,
        ...draft.enemy,
        ...bans,
    ].map(hero => hero.HeroId));

    const first = heroes[0];
    const firstAvailable = heroes.find(hero => !unavailable.has(hero.HeroId));
    const reactions = [];

    // Carry and Support are dataset tags; a flex hero can carry both tags.
    if (heroes.length === script.requiredHeroes) {
        if (heroes.every(hero => hero.roles?.includes("Support"))) {
            reactions.push(script.reactions.supports);
        } else if (heroes.every(hero => hero.roles?.includes("Carry"))) {
            reactions.push(script.reactions.carries);
        }

        if (choices.includes(105)) reactions.push(script.reactions.techies);

        const microHeroes = [82, 113].filter(id => choices.includes(id));

        if (microHeroes.length) {
            reactions.push(microHeroes.length === 2
                ? script.reactions.microBoth
                : script.reactions.microOne);
        }
    }

    const names = heroes.length < 2
        ? heroes[0]?.name ?? "your chosen heroes"
        : `${heroes.slice(0, -1).map(hero => hero.name).join(", ")} and ${heroes.at(-1).name}`;

    return {
        ...script,
        lines: script.lines.flatMap(line => {
            if (line.id === "pool-reaction" && reactions.length) {
                return reactions.map((text, index) => ({
                    ...line,
                    id: index === 0 ? line.id : `${line.id}-${index}`,
                    text,
                }));
            }

            let text = line.text.replaceAll("{poolNames}", names);

            if (line.id === "pool-feed") {
                text = !firstAvailable
                    ? script.unavailableText
                    : unavailable.has(first?.HeroId)
                        ? script.firstUnavailableText
                        : text;
            }

            return [{
                ...line,
                text: text
                    .replaceAll("{firstHero}", first?.name ?? "your hero")
                    .replaceAll("{firstAvailable}", firstAvailable?.name ?? "your hero"),
            }];
        }),
    };
}