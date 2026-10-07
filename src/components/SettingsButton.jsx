import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const DEFAULT_SETTINGS = { enabled: true, shortcut: "Control+Shift+F8" };
const META_LABEL = /Mac/i.test(navigator.userAgent) ? "Cmd" : "Win";

function shortcutFromKey(event) {
    if (!event.code || /^(Control|Shift|Alt|Meta)/.test(event.code)) return null;

    // Bare letters would become global typing shortcuts. Allow function keys
    // on their own, but require Ctrl, Alt or Meta for other keys.
    if (!event.ctrlKey && !event.altKey && !event.metaKey
        && !/^F([1-9]|1[0-9]|2[0-4])$/.test(event.code)) {
        throw new Error(
            `Use Ctrl, Alt or ${META_LABEL} with another key, or a function key.`
        );
    }

    return [
        event.ctrlKey && "Control",
        event.altKey && "Alt",
        event.shiftKey && "Shift",
        event.metaKey && "Super",
        event.code
    ].filter(Boolean).join("+");
}

// Native events use lowercase modifiers in a different order from keydown.
function normalizeShortcut(shortcut) {
    const parts = shortcut.split("+");
    const key = parts.pop();
    const modifiers = new Set(parts.map(part => part.toLowerCase()));

    return [
        (modifiers.has("control") || modifiers.has("ctrl")) && "Control",
        modifiers.has("alt") && "Alt",
        modifiers.has("shift") && "Shift",
        (modifiers.has("super") || modifiers.has("cmd") || modifiers.has("command")) && "Super",
        key
    ].filter(Boolean).join("+");
}

function shortcutLabel(shortcut) {
    return normalizeShortcut(shortcut).replace(/Control/gi, "Ctrl")
        .replace(/Super/gi, META_LABEL)
        .replace(/Key([A-Z])/g, "$1")
        .replace(/Digit([0-9])/g, "$1")
        .replace(/\+/g, " + ");
}

export default function SettingsButton() {
    const desktop = isTauri();
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(null);
    const [draft, setDraft] = useState(DEFAULT_SETTINGS);
    const [capturing, setCapturing] = useState(false);
    const [operation, setOperation] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const dialogRef = useRef(null);
    const triggerRef = useRef(null);
    const closeRef = useRef(null);
    const captureButtonRef = useRef(null);
    const captureRef = useRef(false);
    const busyRef = useRef(false);
    const sessionRef = useRef(0);
    const unlistenRef = useRef(null);
    const pauseQueueRef = useRef(Promise.resolve());

    // Serialize pause/resume requests so a slow close cannot undo a newer open.
    const pauseShortcut = useCallback(paused => {
        const request = pauseQueueRef.current.catch(() => {}).then(() =>
            invoke("set_window_shortcut_paused", { paused })
        );
        pauseQueueRef.current = request;
        return request;
    }, []);

    // Clear capture suspension after a webview reload, and resume on unmount.
    useEffect(() => {
        if (!desktop) return;
        pauseShortcut(false).catch(console.warn);

        return () => {
            sessionRef.current += 1;
            unlistenRef.current?.();
            unlistenRef.current = null;
            pauseShortcut(false).catch(console.warn);
        };
    }, [desktop, pauseShortcut]);

    useLayoutEffect(() => {
        if (!open) return;

        const dialog = dialogRef.current;
        const trigger = triggerRef.current;

        if (!dialog.open) dialog.showModal();
        closeRef.current?.focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
            trigger?.focus({ preventScroll: true });
        };
    }, [open]);

    function finishCapture(shortcut) {
        if (!captureRef.current) return;

        captureRef.current = false;
        setCapturing(false);
        setDraft(previous => ({
            ...previous,
            shortcut: normalizeShortcut(shortcut)
        }));
        setError("");
        setMessage("");
        captureButtonRef.current?.focus({ preventScroll: true });
    }

    async function openDialog() {
        const session = ++sessionRef.current;
        setSaved(null);
        setError("");
        setMessage("");
        setOpen(true);
        if (!desktop) return;

        try {
            await pauseShortcut(true);
            if (session !== sessionRef.current) return;

            const unlisten = await listen("window-shortcut-captured", event => {
                if (session === sessionRef.current) finishCapture(event.payload);
            });

            if (session !== sessionRef.current) {
                unlisten();
                return;
            }

            unlistenRef.current = unlisten;

            const result = await invoke("get_window_shortcut_settings");
            if (session !== sessionRef.current) return;

            setSaved(result);
            setDraft(result.settings);
            setError(result.error || "");
        } catch (err) {
            if (session === sessionRef.current) setError(String(err));
        }
    }

    async function closeDialog() {
        if (busyRef.current) return;
        busyRef.current = true;
        setOperation("closing");
        captureRef.current = false;
        setCapturing(false);

        try {
            if (desktop) await pauseShortcut(false);

            sessionRef.current += 1;
            unlistenRef.current?.();
            unlistenRef.current = null;
            setOpen(false);
        } catch (err) {
            setError(
                "Could not resume the shortcut. Try closing again. " + String(err)
            );
        } finally {
            busyRef.current = false;
            setOperation(null);
        }
    }

    function handleKeyDown(event) {
        event.stopPropagation();
        if (!captureRef.current) return;

        if ((event.key === "Escape" || event.key === "Tab")
            && !event.ctrlKey && !event.altKey && !event.metaKey) {
            if (event.key === "Escape") event.preventDefault();
            captureRef.current = false;
            setCapturing(false);
            return;
        }

        event.preventDefault();
        if (event.repeat) return;

        try {
            const shortcut = shortcutFromKey(event);
            if (shortcut) finishCapture(shortcut);
        } catch (err) {
            setError(err.message);
        }
    }

    async function saveSettings(event) {
        event.preventDefault();
        if (busyRef.current || captureRef.current || !saved?.available) return;

        busyRef.current = true;
        setOperation("saving");
        setError("");
        setMessage("");

        try {
            const result = await invoke("set_window_shortcut_settings", {
                settings: draft
            });
            setSaved(result);
            setDraft(result.settings);
            setError(result.error || "");
            setMessage("Settings saved.");
        } catch (err) {
            setError(String(err));
        } finally {
            busyRef.current = false;
            setOperation(null);
        }
    }

    const changed = saved && (
        draft.enabled !== saved.settings.enabled
        || normalizeShortcut(draft.shortcut) !== normalizeShortcut(saved.settings.shortcut)
        || (draft.enabled && !saved.active)
    );
    const canEdit = Boolean(saved?.available) && !operation;

    return (
        <>
            <button ref={triggerRef} type="button" title="Settings"
                aria-label="Settings" aria-haspopup="dialog" aria-expanded={open}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                onKeyDown={event => event.stopPropagation()} onClick={openDialog}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinejoin="round"
                    className="h-5 w-5" aria-hidden="true">
                    <path d="M9.5 3h5l.4 2.5 2.1 1.2 2.3-.9 2.5 4.4-2 1.5v.6l2 1.5-2.5 4.4-2.3-.9-2.1 1.2-.4 2.5h-5l-.4-2.5-2.1-1.2-2.3.9-2.5-4.4 2-1.5v-.6l-2-1.5 2.5-4.4 2.3.9 2.1-1.2Z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </button>

            {open && createPortal(
                <dialog ref={dialogRef} aria-labelledby="settings-title"
                    className="ui-panel m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-hidden p-0 text-ink backdrop:bg-black/60 open:flex open:flex-col"
                    onKeyDown={handleKeyDown}
                    onCancel={event => {
                        event.preventDefault();
                        closeDialog();
                    }}>
                    <header className="flex shrink-0 items-center justify-between gap-ui-md border-b border-line p-ui-md">
                        <h2 id="settings-title" className="text-lg font-semibold">
                            Settings
                        </h2>
                        <button ref={closeRef} type="button"
                            aria-label="Close settings"
                            className="ui-button h-9 w-9 p-0 text-lg"
                            disabled={Boolean(operation)}
                            onClick={closeDialog}>×</button>
                    </header>

                    <form onSubmit={saveSettings} aria-busy={Boolean(operation)}
                        className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto p-ui-md">
                            {!desktop ? (
                                <p className="text-sm text-ink-muted">
                                    Window shortcuts are available in the desktop app.
                                </p>
                            ) : (
                                <>
                                    <h3 className="mb-ui-md font-semibold">
                                        Window shortcut
                                    </h3>

                                    {!saved && !error && (
                                        <p role="status" className="text-sm text-ink-muted">
                                            Loading settings...
                                        </p>
                                    )}

                                    <fieldset disabled={!canEdit}
                                        className="space-y-ui-md">
                                        <legend className="sr-only">
                                            Window shortcut preferences
                                        </legend>

                                        <label className="flex items-center gap-ui-sm text-sm">
                                            <input type="checkbox"
                                                checked={draft.enabled}
                                                className="h-4 w-4 accent-accent"
                                                onChange={event => {
                                                    setDraft(previous => ({
                                                        ...previous,
                                                        enabled: event.target.checked
                                                    }));
                                                    setMessage("");
                                                }} />
                                            Enable window shortcut
                                        </label>

                                        <p className="text-sm text-ink-muted">
                                            Bring the app forward from your game,
                                            or minimize it when focused.
                                        </p>

                                        <div className="rounded-control border border-line bg-surface-raised p-ui-md">
                                            <p className="mb-ui-sm break-words font-mono text-sm"
                                                aria-live="polite">
                                                {capturing
                                                    ? "Press your shortcut..."
                                                    : shortcutLabel(draft.shortcut)}
                                            </p>

                                            <div className="flex flex-wrap gap-ui-sm">
                                                <button ref={captureButtonRef}
                                                    type="button"
                                                    className="ui-button"
                                                    aria-pressed={capturing}
                                                    onClick={() => {
                                                        captureRef.current = !captureRef.current;
                                                        setCapturing(captureRef.current);
                                                        setError("");
                                                        setMessage("");
                                                    }}>
                                                    {capturing
                                                        ? "Cancel recording"
                                                        : "Change shortcut"}
                                                </button>

                                                <button type="button"
                                                    className="ui-button"
                                                    onClick={() => {
                                                        captureRef.current = false;
                                                        setCapturing(false);
                                                        setDraft(DEFAULT_SETTINGS);
                                                        setError("");
                                                        setMessage("");
                                                    }}>
                                                    Restore default
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs leading-relaxed text-ink-muted">
                                            Use a function key, or Ctrl, Alt or {META_LABEL} with another key.
                                            Esc cancels recording.
                                            The window shortcut is paused while Settings is open.
                                        </p>
                                    </fieldset>
                                </>
                            )}

                            {error && (
                                <p role="alert"
                                    className="mt-ui-md break-words text-sm text-danger">
                                    {error}
                                </p>
                            )}
                            {message && (
                                <p role="status" className="mt-ui-md text-sm text-ink">
                                    {message}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-end gap-ui-sm border-t border-line p-ui-md">
                            {desktop && (
                                <button type="submit"
                                    className="ui-button ui-button-accent"
                                    disabled={!canEdit || !changed || capturing}>
                                    {operation === "saving" ? "Saving..." : "Save"}
                                </button>
                            )}

                            <button type="button" className="ui-button"
                                disabled={Boolean(operation)}
                                onClick={closeDialog}>
                                {operation === "closing"
                                    ? "Closing..."
                                    : changed ? "Cancel" : "Close"}
                            </button>
                        </div>
                    </form>
                </dialog>,
                document.body
            )}
        </>
    );
}