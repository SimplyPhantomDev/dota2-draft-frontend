/*
Handles consent and snapshot capture as well as exposing
the saved draft to the UI, deciding when a reminder is due
and reporting or dismissal. Resolving an old draft releases
the pending slot so another draft can be captured.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  clearPendingDraft,
  createDraftSnapshot,
  getDraftKey,
  markDraftLeft,
  readPendingDraft,
  savePendingDraft,
} from "./draftSnapshots";
import { finishPendingDraft } from "./matchResults";

const REMINDER_DELAY_MS = 30 * 60 * 1000;

export function useDraftCapture({
  active,
  isPractice,
  selectedHeroes,
  prediction,
  manifest,
}) {
  const [enabled, setEnabled] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [returnedAt, setReturnedAt] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [captureRevision, setCaptureRevision] = useState(0);

  const settingsRevision = useRef(0);
  const lastCapturedKey = useRef(null);
  const capturedId = useRef(null);

  const onSettingsSaved = useCallback(settings => {
    settingsRevision.current += 1;

    const nextEnabled = settings.matchFeedbackEnabled === true;
    setEnabled(nextEnabled);

    if (!nextEnabled) {
      lastCapturedKey.current = null;
      capturedId.current = null;

      setPendingDraft(null);
      setReturnedAt(null);
      setError("");
      setMessage("");

      try {
        clearPendingDraft();
      } catch (error) {
        console.warn("[match-feedback] Could not clear draft", error);
      }
    }
  }, []);

  // A delayed settings load must not undo a more recent Save and close.
  useEffect(() => {
    if (!active || isPractice || !isTauri()) return;

    let live = true;
    const revision = settingsRevision.current;

    invoke("get_window_shortcut_settings")
      .then(result => {
        if (live && revision === settingsRevision.current) {
          onSettingsSaved(result.settings);
        }
      })
      .catch(error => {
        console.warn("[match-feedback] Could not load settings", error);
      });

    return () => {
      live = false;
    };
  }, [active, isPractice, onSettingsSaved]);

  // Keep the candidate current until focus is lost. Preserve older unresolved
  // drafts across edits and restarts, including missed close events.
  useEffect(() => {
    if (!active || isPractice || !enabled) return;

    try {
      const key = getDraftKey(selectedHeroes);
      const pending = readPendingDraft();

      setPendingDraft(pending);

      if (!key) {
        const owned = pending?.id === capturedId.current;

        lastCapturedKey.current = null;
        capturedId.current = null;

        if (owned && pending.firstLeftAt === null) {
          clearPendingDraft();
          setPendingDraft(null);
        }

        return;
      }

      if (
        key === lastCapturedKey.current
        || pending?.firstLeftAt
        || (pending && pending.id !== capturedId.current)
      ) {
        return;
      }

      const snapshot = createDraftSnapshot({
        selectedHeroes,
        prediction,
        manifest,
        appVersion: window.__APP_VERSION__,
      });

      if (snapshot) {
        savePendingDraft(snapshot);

        lastCapturedKey.current = key;
        capturedId.current = snapshot.id;

        setPendingDraft(snapshot);
        setMessage("");
        setError("");
      }
    } catch (error) {
      setError("The draft could not be saved. Check the console for details.");
      console.warn("[match-feedback] Could not save draft", error);
    }
  }, [
    active,
    isPractice,
    enabled,
    selectedHeroes,
    prediction,
    manifest,
    captureRevision,
  ]);

  // Returning triggers reminder eligibility. Time passing while the user
  // remains in the app must not interrupt drafting or imply a match was played.
  useEffect(() => {
    if (!active || isPractice || !enabled) return;

    function refreshPending() {
      try {
        setPendingDraft(readPendingDraft());
      } catch (error) {
        setError("The saved draft could not be read. Check the console for details.");
        console.warn("[match-feedback] Could not read draft", error);
      }
    }

    function markAway() {
      setReturnedAt(null);

      try {
        markDraftLeft();
      } catch (error) {
        console.warn("[match-feedback] Could not mark draft", error);
      }

      refreshPending();
    }

    function markReturn() {
      if (document.visibilityState === "hidden" || !document.hasFocus()) {
        return;
      }

      refreshPending();
      setReturnedAt(Date.now());
    }

    function visibilityChanged() {
      if (document.visibilityState === "hidden") {
        markAway();
      } else {
        markReturn();
      }
    }

    window.addEventListener("blur", markAway);
    window.addEventListener("pagehide", markAway);
    window.addEventListener("focus", markReturn);
    document.addEventListener("visibilitychange", visibilityChanged);

    if (document.visibilityState === "hidden" || !document.hasFocus()) {
      markAway();
    } else {
      markReturn();
    }

    return () => {
      window.removeEventListener("blur", markAway);
      window.removeEventListener("pagehide", markAway);
      window.removeEventListener("focus", markReturn);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [active, isPractice, enabled]);

  function resolveDraft(draftId, outcome) {
    if (
      !active
      || isPractice
      || !enabled
      || pendingDraft?.id !== draftId
    ) {
      return false;
    }

    try {
      const resolved = finishPendingDraft(draftId, outcome);

      // Prevent immediate recapture of this finished or dismissed draft.
      // Another complete draft already on screen can become the new candidate.
      lastCapturedKey.current = resolved.draftKey;
      capturedId.current = null;

      setPendingDraft(null);
      setError("");
      setMessage(
        outcome === "ally-win" || outcome === "ally-loss"
          ? "Result saved on this device."
          : "Draft dismissed."
      );

      setCaptureRevision(value => value + 1);
      return true;
    } catch (error) {
      setError(error.message || "The result could not be saved.");
      console.warn("[match-feedback] Could not finish draft", error);
      return false;
    }
  }

  const reminderDue =
    returnedAt !== null
    && pendingDraft?.firstLeftAt != null
    && returnedAt - Date.parse(pendingDraft.firstLeftAt) >= REMINDER_DELAY_MS;

  return {
    onSettingsSaved,
    enabled: active && !isPractice && enabled,
    pendingDraft,
    reminderDue,
    error,
    message,
    resolveDraft,
  };
}