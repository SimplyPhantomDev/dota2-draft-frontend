import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export default function TutorialDialogue({
    title,
    line,
    reserveLines = [line],
    pageLabel,
    onNext,
    onLineComplete,
    onHighlightReady,
    onSkip,
    onExit,
    canAdvance = true,
    hint = "Click in this window or press Next to continue.",
    skipLabel = "Skip lesson",
    feedback = "",
    compact = false,
    autoFocusNext = false,
    titleId = "tutorial-dialogue-title",
    textId = "tutorial-dialogue-text",
    portraitSrc = null,
    narratorName = "Your guide",
}) {
    const reduceMotion = useReducedMotion();
    const [typing, setTyping] = useState({ id: line.id, count: 0 });

    const visibleCount = typing.id === line.id ? typing.count : 0;
    const complete =
        Boolean(reduceMotion) || visibleCount >= line.text.length;

    const typingIntervalMs = line.typingIntervalMs ?? 50;
    const charactersPerTick = line.charactersPerTick ?? 2;

    useEffect(() => {
        if (complete) return;

        // Cleanup prevents old ticks from affecting another dialogue line.
        let live = true;

        const timer = setInterval(() => {
            if (!live) return;

            setTyping(current => ({
                id: line.id,
                count: Math.min(
                    (current.id === line.id ? current.count : 0) + charactersPerTick,
                    line.text.length
                ),
            }));
        }, typingIntervalMs);

        return () => {
            live = false;
            clearInterval(timer);
        };
    }, [
        line.id,
        line.text.length,
        complete,
        typingIntervalMs,
        charactersPerTick,
    ]);

    // End-of-sentence cues wait until the actual text finishes appearing.
    // Clicking to reveal the rest and reduced motion also count as completion.
    useEffect(() => {
        if (complete) onLineComplete?.(line.id);
    }, [complete, line.id, onLineComplete]);

    const cueStart = line.highlightAfter
        ? line.text.indexOf(line.highlightAfter)
        : -1;

    const highlightReady = cueStart >= 0 && (
        complete || visibleCount >= cueStart + line.highlightAfter.length
    );

    useEffect(() => {
        if (highlightReady) onHighlightReady?.(line.id);
    }, [highlightReady, line.id, onHighlightReady]);

    function advanceDialogue() {
        if (!complete) {
            setTyping({ id: line.id, count: line.text.length });
        } else if (canAdvance) {
            onNext();
        }
    }

    function handleWindowClick(event) {
        // Buttons perform their own action without also advancing through bubbling.
        if (event.target.closest("button, a, input, select, textarea")) return;
        advanceDialogue();
    }

    return (
        <div
            data-tutorial-dialogue
            className="flex min-h-0 flex-1 flex-col select-none"
            onClick={handleWindowClick}
        >
            <header
                className={`flex shrink-0 items-center gap-ui-md border-b border-line
                    ${compact ? "px-ui-md py-ui-xs" : "p-ui-md"}`}
            >
                <button
                    type="button"
                    className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
                    aria-label="Exit tutorial"
                    onClick={onExit}
                >
                    ×
                </button>

                <h2 id={titleId} className="text-lg font-semibold">
                    {title}
                </h2>

                <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-muted">
                    {pageLabel}
                </span>
            </header>

            <div
                data-tutorial-dialogue-scroll
                className={compact
                    ? "min-h-0 flex-1 overflow-y-auto px-ui-md py-ui-xs"
                    : "min-h-0 flex-1 overflow-y-auto p-ui-lg sm:p-ui-2xl"}
            >
                <div
                    className={`grid items-start gap-ui-md ${compact
                        ? "grid-cols-1"
                        : "grid-cols-[auto_minmax(0,1fr)] sm:gap-ui-xl"
                    }`}
                >
                    <div
                        className={`flex flex-col items-center gap-ui-sm ${compact ? "mx-auto w-16" : "w-20 sm:w-32"
                        }`}
                    >
                        <div
                            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-surface-raised ${compact ? "h-16 w-16" : "h-20 w-20 sm:h-32 sm:w-32"
                            }`}
                            data-tutorial-narrator
                        >
                            {portraitSrc ? (
                                <img
                                    src={portraitSrc}
                                    alt={narratorName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    aria-hidden="true"
                                    className="h-1/2 w-1/2 text-ink-muted"
                                >
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                                </svg>
                            )}
                        </div>

                        <p className="text-center text-xs text-ink-muted">
                            {narratorName}
                        </p>
                    </div>

                    <div
                        className={`grid min-w-0 font-serif leading-relaxed
              ${compact
            ? "min-h-[3.5rem] text-[clamp(1rem,1.4vw,1.25rem)]"
            : "min-h-[9rem] text-[clamp(1.25rem,2.5vw,1.875rem)]"}`}
                    >
                        {/* Reserve the tallest line to keep the frame steady. */}
                        {reserveLines.map(item => (
                            <p
                                key={item.id}
                                aria-hidden="true"
                                className={`invisible col-start-1 row-start-1 ${item.appearance === "fine-print"
                                    ? "text-xs leading-relaxed"
                                    : ""
                                }`}
                            >
                                {item.text}
                            </p>
                        ))}

                        <p
                            id={textId}
                            className={`col-start-1 row-start-1 ${line.appearance === "fine-print"
                                ? "text-xs leading-relaxed text-ink-muted"
                                : ""
                            }`}
                        >
                            <span
                                className="sr-only"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {line.text}
                            </span>

                            <span aria-hidden="true">
                                {reduceMotion
                                    ? line.text
                                    : line.text.slice(0, visibleCount)}
                            </span>
                        </p>
                    </div>
                </div>

                {compact && (
                    <p
                        role="status"
                        className="mt-ui-sm min-h-[2rem] text-xs leading-4 text-accent"
                    >
                        {feedback}
                    </p>
                )}
            </div>

            <footer
                className={`grid shrink-0 items-center gap-ui-sm border-t border-line ${compact
                    ? "grid-cols-[auto_1fr] p-ui-sm"
                    : "grid-cols-2 p-ui-md sm:grid-cols-3"
                }`}
            >
                <button
                    type="button"
                    className="ui-button col-start-1 row-start-1 justify-self-start"
                    onClick={onExit}
                >
                    Exit tutorial
                </button>

                <p
                    className={`text-center text-xs text-ink-muted ${compact
                        ? "col-span-2 col-start-1 row-start-2"
                        : "col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                    }`}
                >
                    {hint}
                </p>

                <div
                    className={`row-start-1 flex justify-self-end gap-ui-sm ${compact ? "col-start-2" : "col-start-2 sm:col-start-3"
                    }`}
                >
                    <button
                        type="button"
                        className="ui-button"
                        onClick={onSkip}
                        title={skipLabel}
                    >
                        Skip
                    </button>

                    <button
                        type="button"
                        autoFocus={autoFocusNext}
                        disabled={complete && !canAdvance}
                        className="ui-button ui-button-accent"
                        onClick={advanceDialogue}
                    >
                        Next
                    </button>
                </div>
            </footer>
        </div>
    );
}