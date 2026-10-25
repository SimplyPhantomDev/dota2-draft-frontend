// Offer explicit submission of the saved result queue. An acknowledged report
// is removed individually; failures and cancellation preserve unsent reports.
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { readMatchResults, removeMatchResult } from "./matchResults";
import { submitMatchResult } from "./matchReportApi";

function readyResults(results, pendingId) {
    // An unfinished local save must be resolved before its result can be uploaded.
    return results.filter(result => result.draftId !== pendingId);
}

export default function MatchResultsUpload({ feedback }) {
    const enabled = Boolean(feedback?.enabled);

    const [count, setCount] = useState(0);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const activeRequest = useRef(null);
    const live = useRef(false);
    const pendingId = useRef(null);

    useLayoutEffect(() => {
        pendingId.current = feedback?.pendingDraft?.id;
    }, [feedback?.pendingDraft?.id]);

    // Closing/suspending the real workspace or disabling feedback cancels the batch.
    useEffect(() => {
        live.current = enabled;
        setSending(false);

        if (!enabled) return;

        return () => {
            live.current = false;

            const controller = activeRequest.current;
            activeRequest.current = null;
            controller?.abort();
        };
    }, [enabled]);

    // Saving a result changes feedback state. Returning to the app also refreshes
    // the count, without starting any network request.
    useEffect(() => {
        if (!enabled) return;

        function refresh() {
            try {
                setCount(
                    readyResults(readMatchResults(), pendingId.current).length
                );
            } catch (error) {
                setError("Saved results could not be read.");
                console.warn(
                    "[match-feedback] Could not read saved results",
                    error
                );
            }
        }

        refresh();
        window.addEventListener("focus", refresh);

        return () => window.removeEventListener("focus", refresh);
    }, [enabled, feedback?.pendingDraft, feedback?.message]);

    async function sendSavedResults() {
        if (!live.current || activeRequest.current) return;

        const controller = new AbortController();
        activeRequest.current = controller;

        setSending(true);
        setError("");
        setMessage("");

        let sent = 0;

        try {
            const batch = readyResults(
                readMatchResults(),
                pendingId.current
            );

            setCount(batch.length);

            for (const report of batch) {
                if (controller.signal.aborted || !live.current) return;

                await submitMatchResult(report, {
                    signal: controller.signal,
                });

                if (controller.signal.aborted || !live.current) return;

                try {
                    const remaining = removeMatchResult(report.draftId);

                    setCount(
                        readyResults(remaining, pendingId.current).length
                    );
                } catch {
                    throw new Error(
                        "The server received a result, but its local queue entry could not be cleared. Retry to finish syncing."
                    );
                }

                sent += 1;
                setMessage(
                    `Sent ${sent} ${sent === 1 ? "result" : "results"}.`
                );
            }
        } catch (error) {
            if (!controller.signal.aborted && live.current) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Sending failed. Please try again."
                );
            }
        } finally {
            if (activeRequest.current === controller) {
                activeRequest.current = null;

                if (live.current) setSending(false);
            }
        }
    }

    if (
        !enabled
    || (count === 0 && !message && !error && !sending)
    ) {
        return null;
    }

    return (
        <section
            aria-label="Send saved match results"
            className="space-y-ui-xs rounded-control border border-line p-ui-sm text-xs"
            onKeyDown={event => event.stopPropagation()}
        >
            {count > 0 && (
                <>
                    <p className="text-ink-muted">
                        Send saved teams, outcomes and prediction data to D2DT
                        for future model evaluation.
                    </p>

                    <button
                        type="button"
                        className="ui-button w-full"
                        disabled={sending}
                        onClick={sendSavedResults}
                    >
                        {sending
                            ? "Sending..."
                            : `${error ? "Retry sending" : "Send saved results"} (${count})`}
                    </button>
                </>
            )}

            {message && (
                <p role="status" className="text-ink-muted">
                    {message}
                </p>
            )}

            {error && (
                <p role="alert" className="text-danger">
                    {error}
                </p>
            )}
        </section>
    );
}