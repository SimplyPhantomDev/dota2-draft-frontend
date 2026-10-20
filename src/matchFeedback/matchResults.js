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

// Remove one result after server acknowledgement or explicit dismissal.
// Reading the latest queue preserves results added while a request was in flight.
export function removeMatchResult(draftId, storage = localStorage) {
  const results = readMatchResults(storage);
  const remaining = results.filter(result => result.draftId !== draftId);

  if (remaining.length !== results.length) {
    storage.setItem(MATCH_RESULTS_KEY, JSON.stringify(remaining));
  }

  return remaining;
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
  } else {
    // A result write may previously have succeeded while pending-draft cleanup
    // failed. Explicit dismissal must discard that unfinished result too.
    removeMatchResult(draft.id, storage);
  }

  clearPendingDraft(storage);
  return draft;
}