const ROLES = [
    "Carry", "Disabler", "Durable", "Escape",
    "Initiator", "Nuker", "Pusher", "Support",
];

const ATTRIBUTES = ["agi", "all", "int", "str"];

const POSITION_KEYS = [
    "bestGeometricShare",
    "weakestAssignedShare",
    "assignmentMass",
    "assignmentEntropy",
    "minimumClassificationCoverage",
    "maximumAssignedIntervalWidth",
    "minimumObservedHourFraction",
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const count = value => Number.isSafeInteger(value) && value >= 0;

const check = (condition, message) => {
    if (!condition) throw new Error(message);
};

const sigmoid = value => value >= 0
    ? 1 / (1 + Math.exp(-value))
    : Math.exp(value) / (1 + Math.exp(value));

// Pure JavaScript: no network, storage, Node APIs or live dataset dependencies.
export function createDraftPredictor(artifact) {
    const model = artifact?.model;
    const spec = model?.featureSpec;
    const catalog = spec?.catalog;
    const profile = catalog?.positionProfile;

    check(artifact?.schema === 1
        && artifact.kind === "d2dt-client-model-v1"
        && /^[a-f0-9]{64}$/i.test(artifact.modelId ?? "")
        && model?.schema === 1
        && model.kind === "draft-logistic-v1"
        && spec?.schema === 1
        && spec.featureSchema === "draft-tags-positions-v2"
        && spec.orientation === "radiant-minus-dire"
        && spec.target?.field === "target"
        && spec.target.one === "radiant-win"
        && spec.target.zero === "dire-win"
        && /^\d+\.\d+[a-z]?$/.test(spec.profilePatch ?? ""),
    "Unsupported bundled draft model.");

    check(catalog?.schema === 1
        && catalog.featureSchema === spec.featureSchema
        && same(catalog.roleTags, ROLES)
        && same(catalog.attributeTags, ATTRIBUTES)
        && catalog.positionAnalysisSchema === "draft-position-fit-v1"
        && catalog.positionSmoothingAlpha === 0.5
        && Array.isArray(catalog.heroes)
        && catalog.heroes.length >= 10
        && profile?.schema === 1
        && profile.profileSchema === "hero-position-observations-v1"
        && profile.filters?.gameModeIds?.length === 1
        && profile.filters.gameModeIds[0] === "ALL_PICK_RANKED"
        && profile.window?.requiredHours === 168
        && count(profile.window.commonHoursObserved)
        && profile.window.commonHoursObserved >= 1
        && profile.window.commonHoursObserved <= 168
        && Array.isArray(profile.heroes),
    "Unsupported bundled feature definitions.");

    const positionById = new Map(
        profile.heroes.map(hero => [hero.heroId, hero])
    );

    check(positionById.size === profile.heroes.length,
        "Duplicate bundled position profiles.");

    const heroes = new Map();

    for (const hero of [...catalog.heroes].sort((a, b) => a.heroId - b.heroId)) {
        const observed = positionById.get(hero.heroId);

        check(Number.isSafeInteger(hero.heroId)
            && hero.heroId > 0
            && !heroes.has(hero.heroId)
            && ATTRIBUTES.includes(hero.primaryAttribute)
            && Array.isArray(hero.roles)
            && hero.roles.length > 0
            && new Set(hero.roles).size === hero.roles.length
            && [...hero.roles].every(role => ROLES.includes(role))
            && count(observed?.classifiedMatches)
            && count(observed?.baselineMatches)
            && observed.baselineMatches >= observed.classifiedMatches
            && count(observed.usableHours)
            && observed.usableHours <= profile.window.commonHoursObserved
            && Array.isArray(observed.positions)
            && observed.positions.length === 5,
        "Invalid bundled hero profile.");

        const positions = [...observed.positions]
            .sort((a, b) => a.position - b.position);

        check(
            positions.reduce((sum, row) => sum + row.matches, 0)
            === observed.classifiedMatches,
            "Inconsistent bundled position counts."
        );

        const shares = positions.map((row, index) => {
            const interval = row.shareInterval95;

            check(row.position === index + 1
                && count(row.matches)
                && (observed.classifiedMatches === 0 || (
                    Number.isFinite(interval?.lower)
                    && Number.isFinite(interval?.upper)
                    && interval.lower >= 0
                    && interval.upper <= 1
                    && interval.lower <= interval.upper
                )),
            "Invalid bundled position observations.");

            return (row.matches + 0.5)
                / (observed.classifiedMatches + 2.5);
        });

        heroes.set(hero.heroId, {
            roles: [...hero.roles],
            attribute: hero.primaryAttribute,
            classified: observed.classifiedMatches,
            coverage: observed.baselineMatches
                ? observed.classifiedMatches / observed.baselineMatches
                : 0,
            hours: observed.usableHours / 168,
            shares,
            logShares: shares.map(Math.log),
            widths: positions.map(row => row.shareInterval95
                ? row.shareInterval95.upper - row.shareInterval95.lower
                : 0),
        });
    }

    const ids = [...heroes.keys()];

    const names = [
        ...ids.map(id => `hero.${id}`),
        ...ROLES.flatMap(role =>
            Array.from({ length: 6 }, (_, n) => `role.${role}.count.${n}`)
        ),
        ...ATTRIBUTES.flatMap(attr =>
            Array.from({ length: 6 }, (_, n) => `attribute.${attr}.count.${n}`)
        ),
        ...POSITION_KEYS.map(key => `position.${key}`),
    ];

    check(same(names, spec.featureNames)
        && Number.isFinite(model.intercept)
        && Array.isArray(model.coefficients)
        && model.coefficients.length === names.length
        && [...model.coefficients].every(Number.isFinite),
    "Bundled model feature order or coefficients do not match.");

    const coefficients = [...model.coefficients];
    const intercept = model.intercept;
    const patch = spec.profilePatch;
    const modelId = artifact.modelId;
    const positionCache = new Map();

    function positionValues(teamIds) {
        const sorted = [...teamIds].sort((a, b) => a - b);
        const key = sorted.join(",");

        if (positionCache.has(key)) return positionCache.get(key);

        const team = sorted.map(id => heroes.get(id));
        const assignments = [];

        function visit(chosen, remaining, logWeight) {
            if (!remaining.length) {
                assignments.push({ chosen, logWeight });
                return;
            }

            remaining.forEach((hero, index) => visit(
                [...chosen, hero],
                remaining.filter((_, i) => i !== index),
                logWeight + hero.logShares[chosen.length]
            ));
        }

        visit([], team, 0);

        const best = assignments.reduce(
            (a, b) => b.logWeight > a.logWeight ? b : a
        );

        const scaled = assignments.map(item =>
            Math.exp(item.logWeight - best.logWeight)
        );

        const total = scaled.reduce((sum, value) => sum + value, 0);

        const entropy = -scaled.reduce((sum, value) => {
            const weight = value / total;
            return sum + weight * Math.log(weight);
        }, 0);

        const values = [
            Math.exp(best.logWeight / 5),
            Math.min(...best.chosen.map(
                (hero, index) => hero.shares[index]
            )),
            Math.min(1, Math.exp(best.logWeight + Math.log(total))),
            Math.log(Math.min(120, Math.max(1, Math.exp(entropy))))
            / Math.log(120),
            Math.min(...team.map(hero => hero.coverage)),
            Math.max(...best.chosen.map(
                (hero, index) => hero.widths[index]
            )),
            Math.min(...team.map(hero => hero.hours)),
        ];

        if (positionCache.size >= 256) positionCache.clear();
        positionCache.set(key, values);

        return values;
    }

    function extract(allyIds, enemyIds) {
        const valid = team => Array.isArray(team)
            && team.length === 5
            && [...team].every(id =>
                Number.isSafeInteger(id)
                && heroes.has(id)
                && heroes.get(id).classified > 0
            );

        if (!valid(allyIds)
            || !valid(enemyIds)
            || new Set([...allyIds, ...enemyIds]).size !== 10) {
            return null;
        }

        const allies = new Set(allyIds);
        const enemies = new Set(enemyIds);

        const values = ids.map(id =>
            Number(allies.has(id)) - Number(enemies.has(id))
        );

        for (const [tags, field] of [
            [ROLES, "roles"],
            [ATTRIBUTES, "attribute"],
        ]) {
            for (const tag of tags) {
                const tally = team => team.filter(id => field === "roles"
                    ? heroes.get(id).roles.includes(tag)
                    : heroes.get(id).attribute === tag).length;

                const a = tally(allyIds);
                const b = tally(enemyIds);

                for (let n = 0; n <= 5; n++) {
                    values.push(Number(a === n) - Number(b === n));
                }
            }
        }

        const a = positionValues(allyIds);
        const b = positionValues(enemyIds);

        values.push(...a.map((value, index) => value - b[index]));

        return values.every(Number.isFinite) ? values : null;
    }

    function predict(input = {}) {
        if (!input || input.patch !== patch) return null;

        const values = extract(input.allyHeroIds, input.enemyHeroIds);
        if (!values) return null;

        const score = values.reduce(
            (sum, value, index) => sum + value * coefficients[index],
            0
        );

        if (!Number.isFinite(score)) return null;

        const allyAsRadiant = sigmoid(intercept + score);
        const allyAsDire = 1 - sigmoid(intercept - score);
        const ally = (allyAsRadiant + allyAsDire) / 2;

        return {
            ally,
            enemy: 1 - ally,
            allyAsRadiant,
            allyAsDire,
            method: "trained-model",
            predictorVersion: modelId,
            modelPatch: patch,
        };
    }

    // Check the actual exported examples once, before exposing the predictor.
    const examples = artifact.verification?.drafts;

    check(Array.isArray(examples) && examples.length > 0,
        "Bundled model reference checks are missing.");

    for (const example of examples) {
        const input = { ...example, patch };
        const actual = extract(input.allyHeroIds, input.enemyHeroIds);
        const result = predict(input);

        check(result
            && actual
            && Array.isArray(example.values)
            && actual.length === example.values.length
            && actual.every((value, index) =>
                Math.abs(value - example.values[index]) <= 1e-12
            )
            && ["ally", "enemy", "allyAsRadiant", "allyAsDire"].every(key =>
                Number.isFinite(example[key])
                && Math.abs(result[key] - example[key]) <= 1e-12
            ),
        "Bundled model does not reproduce the exported reference predictions.");
    }

    return Object.freeze({ predict, extract, patch, modelId });
}