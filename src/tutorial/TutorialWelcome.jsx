import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const WELCOME_LINES = [
  "Welcome to Dota 2 Drafting Tool and thank you so much for downloading this application!",
  "This tutorial is to help you find the ropes to get the maximum benefit out of this tool.",
  "You can see below control buttons for going ahead a step, skipping a step, and for exiting the tutorial.",
  "So if you feel like just finding the ropes yourself that's fine too. But, 'Don't say I never gave you anything.'",
];

export default function TutorialWelcome({
  onNext,
  onExit,
  portraitSrc = null,
  narratorName = "Your guide",
}) {
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [dialogue, setDialogue] = useState({
    page: 0,
    visibleCount: 0,
  });

  const text = WELCOME_LINES[dialogue.page];
  const complete =
    Boolean(reduceMotion) || dialogue.visibleCount >= text.length;

  // Keep drafting input blocked until the welcome is dismissed.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Restart typing for each page and ignore queued ticks from older pages.
  useEffect(() => {
    if (complete) return;

    const page = dialogue.page;

    const timer = setInterval(() => {
      setDialogue(current => {
        if (current.page !== page) return current;

        return {
          ...current,
          visibleCount: Math.min(current.visibleCount + 2, text.length),
        };
      });
    }, 30);

    return () => clearInterval(timer);
  }, [dialogue.page, text.length, complete]);

  function advanceDialogue() {
    if (!complete) {
      setDialogue(current => ({
        ...current,
        visibleCount: text.length,
      }));
    } else if (dialogue.page < WELCOME_LINES.length - 1) {
      setDialogue({
        page: dialogue.page + 1,
        visibleCount: 0,
      });
    } else {
      onNext();
    }
  }

  function handleWindowClick(event) {
    // Ignore backdrop clicks and controls. A Next click must advance only once.
    if (
      event.target === event.currentTarget ||
      event.target.closest("button, a, input, select, textarea")
    ) {
      return;
    }

    advanceDialogue();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tutorial-welcome-title"
      aria-describedby="tutorial-welcome-text"
      className="ui-panel m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden p-0 text-ink backdrop:bg-black/60 open:flex open:flex-col"
      onClick={handleWindowClick}
      onKeyDown={event => event.stopPropagation()}
      onCancel={event => {
        event.preventDefault();
        onExit();
      }}
    >
      <header className="flex shrink-0 items-center gap-ui-md border-b border-line p-ui-md">
        <button
          type="button"
          className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
          aria-label="Exit tutorial"
          onClick={onExit}
        >
          ×
        </button>

        <h2 id="tutorial-welcome-title" className="text-lg font-semibold">
          Welcome to D2DT
        </h2>

        <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-muted">
          {dialogue.page + 1} / {WELCOME_LINES.length}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-ui-lg sm:p-ui-2xl">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-ui-md sm:gap-ui-xl">
          <div className="flex w-20 flex-col items-center gap-ui-sm sm:w-32">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-surface-raised sm:h-32 sm:w-32">
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

          <div className="grid min-h-[9rem] min-w-0 font-serif text-[clamp(1.25rem,2.5vw,1.875rem)] leading-relaxed">
            {/* Reserve the tallest page to keep the window steady throughout. */}
            {WELCOME_LINES.map((line, index) => (
              <p
                key={index}
                aria-hidden="true"
                className="invisible col-start-1 row-start-1"
              >
                {line}
              </p>
            ))}

            <p
              id="tutorial-welcome-text"
              className="col-start-1 row-start-1"
            >
              {/* Announce each complete line instead of every typed character. */}
              <span
                className="sr-only"
                aria-live="polite"
                aria-atomic="true"
              >
                {text}
              </span>

              <span aria-hidden="true">
                {reduceMotion
                  ? text
                  : text.slice(0, dialogue.visibleCount)}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-ui-lg text-xs text-ink-muted">
          Click in this window or press Next to continue.
        </p>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-ui-sm border-t border-line p-ui-md">
        <button type="button" className="ui-button" onClick={onExit}>
          Exit tutorial
        </button>

        <div className="flex gap-ui-sm">
          <button
            type="button"
            className="ui-button"
            onClick={onNext}
            title="Skip the welcome"
          >
            Skip
          </button>

          <button
            type="button"
            autoFocus
            className="ui-button ui-button-accent"
            onClick={advanceDialogue}
          >
            Next
          </button>
        </div>
      </footer>
    </dialog>
  );
}