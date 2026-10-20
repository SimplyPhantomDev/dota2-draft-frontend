/*
Saves a win or loss together with the original draft snapshot.
Result is saved before the pending draft is cleared, keeping a failed
write retryable. "Didn't play" and "Dismiss" clear the draft without
creating a result.
*/

import { clearPendingDraft, readPendingDraft } from "./draftSnapshots";

export const MATCH_RESULTS_KEY = "d2dt.match-feedback.results.v1";
const MAX_RESULTS = 1000;

export function readMatchResults(storage = localStorage) {
  const raw = storage.getItem(MATCH_RESULTS_KEY);
  if (raw === null) return [];

  const results = JSON.parse(raw);

  if (!Array.isArray(results) || results.some(result => (
    result?.schema !== 1
    || typeof result.draftId !== "string"
    || result.draft?.id !== result.draftId
    || !["ally-win", "ally-loss"].includes(result.outcome)
    || !Number.isFinite(Date.parse(result.reportedAt))
  ))) {
    throw new Error("The saved match results are invalid.");
  }

  return results;
}

// Persist the result before removing its draft.
// A failed write must leave the draft available to retry.
export function finishPendingDraft(draftId, outcome, storage = localStorage) {
  const draft = readPendingDraft(storage);

  if (!draft || draft.id !== draftId) {
    throw new Error("The saved draft changed. Please try again.");
  }

  if (!["ally-win", "ally-loss", "not-played", "dismiss"].includes(outcome)) {
    throw new Error("Unknown match outcome.");
  }

  if (outcome === "ally-win" || outcome === "ally-loss") {
    const results = readMatchResults(storage);
    const existing = results.find(result => result.draftId === draft.id);

    if (existing && existing.outcome !== outcome) {
      throw new Error("A different result was already saved for this draft.");
    }

    // Retrying after a partially completed save must not duplicate the result.
    if (!existing) {
      if (results.length >= MAX_RESULTS) {
        throw new Error("Local match-result storage is full.");
      }

      storage.setItem(MATCH_RESULTS_KEY, JSON.stringify([...results, {
        schema: 1,
        draftId: draft.id,
        outcome,
        reportedAt: new Date().toISOString(),
        source: "self-report",
        verification: "unverified",
        draft,
      }]));
    }
  }

  clearPendingDraft(storage);
  return draft;
}