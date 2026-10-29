import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDraftPredictor } from "../src/model/createDraftPredictor.js";

const artifact = JSON.parse(await readFile(
    new URL("../src/model/draftModel.json", import.meta.url),
    "utf8"
));

const predictor = createDraftPredictor(artifact);
let checks = 0;

const close = (a, b) => {
    assert(Math.abs(a - b) <= 1e-12);
    checks++;
};

function* permutations(items) {
    if (!items.length) {
        yield [];
    } else {
        for (let i = 0; i < items.length; i++) {
            const remaining = items.filter((_, index) => index !== i);

            for (const rest of permutations(remaining)) {
                yield [items[i], ...rest];
            }
        }
    }
}

const examples = artifact.verification.drafts.map(example => {
    const input = { ...example, patch: predictor.patch };
    const result = predictor.predict(input);

    close(result.ally, example.ally);
    close(result.ally + result.enemy, 1);

    const swapped = predictor.predict({
        ...input,
        allyHeroIds: input.enemyHeroIds,
        enemyHeroIds: input.allyHeroIds,
    });

    close(result.ally + swapped.ally, 1);

    for (const field of ["allyHeroIds", "enemyHeroIds"]) {
        for (const order of permutations(input[field])) {
            close(
                predictor.predict({ ...input, [field]: order }).ally,
                result.ally
            );
        }
    }

    for (const invalid of [
        { ...input, patch: "unsupported-patch" },
        { ...input, allyHeroIds: input.allyHeroIds.slice(1) },
        { ...input, enemyHeroIds: input.allyHeroIds },
        { ...input, allyHeroIds: [999999, ...input.allyHeroIds.slice(1)] },
    ]) {
        assert.equal(predictor.predict(invalid), null);
        checks++;
    }

    const hundredths = Math.round(result.ally * 10000);

    return {
        name: example.name,
        allyPercent: hundredths / 100,
        enemyPercent: (10000 - hundredths) / 100,
    };
});

console.log(JSON.stringify({
    modelId: predictor.modelId,
    patch: predictor.patch,
    checks,
    examples,
}, null, 2));