import artifact from "./draftModel.json";
import { createDraftPredictor } from "./createDraftPredictor";

// Static import bundles the model into the app. Initialise and verify it once.
let predictor = null;

try {
    predictor = createDraftPredictor(artifact);
} catch (error) {
    console.warn(
        "[draft-model] Bundled model unavailable; using the fallback estimator.",
        error
    );
}

export function predictLocalDraft(input) {
    return predictor?.predict(input) ?? null;
}