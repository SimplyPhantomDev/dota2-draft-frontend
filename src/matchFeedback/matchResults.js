/*
Saves a win or loss together with the original draft snapshot.
Result is saved before the pending draft is cleared, keeping a failed
write retryable. "Didn't play" and "Dismiss" clear the draft without
creating a result.
*/

import { clearPendingDraft, readPendingDraft } from "./draftSnapshots";

export const MATCH_RESULTS_KEY = "d2dt.match-feedback.results.v1";
const MAX_RESULTS = 1000;

function validMatchId(value) {
    return typeof value === "string"
    && /^[1-9][0-9]{0,18}$/.test(value)
    && BigInt(value) <= 9223372036854775807n;
}

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
    || (result.matchId != null && !validMatchId(result.matchId))
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
export function finishPendingDraft(
    draftId,
    outcome,
    storage = localStorage,
    rawMatchId = "",
) {
    const draft = readPendingDraft(storage);

    if (!draft || draft.id !== draftId) {
        throw new Error("The saved draft changed. Please try again.");
    }

    if (!["ally-win", "ally-loss", "not-played", "dismiss"].includes(outcome)) {
        throw new Error("Unknown match outcome.");
    }

    if (outcome === "ally-win" || outcome === "ally-loss") {
        const matchId = rawMatchId == null
            ? ""
            : typeof rawMatchId === "string"
                ? rawMatchId.trim()
                : rawMatchId;

        if (matchId !== "" && !validMatchId(matchId)) {
            throw new Error(
                "Enter a valid Dota match ID using digits only, or leave it blank."
            );
        }

        const results = readMatchResults(storage);
        const existing = results.find(result => result.draftId === draft.id);

        if (existing && existing.outcome !== outcome) {
            throw new Error("A different result was already saved for this draft.");
        }

        // A partial-save retry must preserve the original report and its upload hash.
        if (existing && (existing.matchId ?? "") !== matchId) {
            throw new Error(
                existing.matchId
                    ? `This result was already saved with match ID ${existing.matchId}. Use that ID to retry.`
                    : "This result was already saved without a match ID. Leave the field blank to retry."
            );
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
                ...(matchId === "" ? {} : { matchId }),
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