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

export function useDraftCapture({
  active,
  isPractice,
  selectedHeroes,
  prediction,
  manifest,
}) {
  const [enabled, setEnabled] = useState(false);
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

      try {
        clearPendingDraft();
      } catch (error) {
        console.warn("[match-feedback] Could not clear draft", error);
      }
    }
  }, []);

  // Load consent from the same native settings used by Save and close.
  // A delayed load must not overwrite settings saved more recently.
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

  // Keep the candidate current while drafting. Once the user leaves,
  // preserve that exact draft and prediction for later result reporting.
  useEffect(() => {
    if (!active || isPractice || !enabled) return;

    try {
      const key = getDraftKey(selectedHeroes);
      const pending = readPendingDraft();

      if (!key) {
        const owned = pending?.id === capturedId.current;
        lastCapturedKey.current = null;
        capturedId.current = null;

        if (owned && pending.firstLeftAt === null) {
          clearPendingDraft();
        }

        return;
      }

      // Also protect a prior session's draft if its close event was missed.
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
      }
    } catch (error) {
      console.warn("[match-feedback] Could not save draft", error);
    }
  }, [active, isPractice, enabled, selectedHeroes, prediction, manifest]);

  // Record leaving the application without assuming a match has started.
  // Tutorial sessions and suspended workspaces do not register listeners.
  useEffect(() => {
    if (!active || isPractice || !enabled) return;

    function markAway() {
      try {
        markDraftLeft();
      } catch (error) {
        console.warn("[match-feedback] Could not mark draft", error);
      }
    }

    function visibilityChanged() {
      if (document.visibilityState === "hidden") markAway();
    }

    window.addEventListener("blur", markAway);
    window.addEventListener("pagehide", markAway);
    document.addEventListener("visibilitychange", visibilityChanged);

    // Settings can finish loading after the user has left the window.
    if (document.visibilityState === "hidden" || !document.hasFocus()) {
      markAway();
    }

    return () => {
      window.removeEventListener("blur", markAway);
      window.removeEventListener("pagehide", markAway);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [active, isPractice, enabled]);

  return onSettingsSaved;
}