export function groupAndSortHeroes(heroes) {
    heroes = Array.isArray(heroes) ? heroes : [];
    const attributeOrder = ['str', 'agi', 'int', 'all'];

    const grouped = {
        str: [],
        agi: [],
        int: [],
        all: []
    };

    for (const hero of heroes) {
        const attr = hero.primaryAttribute;
        if (grouped[attr]) {
            grouped[attr].push(hero);
        }
    }

    for (const attr of attributeOrder) {
        grouped[attr].sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
}