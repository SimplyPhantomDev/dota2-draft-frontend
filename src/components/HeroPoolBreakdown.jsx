import { useEffect, useRef } from "react";

export default function HeroPoolBreakdown({ heroes, onClose }) {
    const dialogRef = useRef(null);

    // showModal places the dialog above the app and manages modal focus.
    // Cleanup also closes it if its parent removes it.
    useEffect(() => {
        const dialog = dialogRef.current;
        dialog.showModal();

        return () => {
            if (dialog.open) dialog.close();
        };
    }, []);

    // Close before unmounting so focus returns to the opening button.
    const closeDialog = () => {
        dialogRef.current.close();
        onClose();
    };

    const handleBackdropClick = (event) => {
        if (event.target !== event.currentTarget) return;

        const bounds = event.currentTarget.getBoundingClientRect();

        if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
        ) {
            closeDialog();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="hero-pool-breakdown-title"
            className="m-auto w-[28rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-panel border border-line bg-surface p-0 text-ink shadow-panel backdrop:bg-black/60 open:flex open:flex-col"
            onCancel={(event) => {
                event.preventDefault();
                closeDialog();
            }}
            onClick={handleBackdropClick}
            onKeyDown={(event) => {
                // Prevent typing here from triggering the global hero search.
                event.stopPropagation();
            }}
        >
            <header className="flex shrink-0 items-center justify-between gap-ui-sm border-b border-line p-ui-md">
                <h2
                    id="hero-pool-breakdown-title"
                    className="font-semibold"
                >
                    Full Hero Pool Breakdown
                </h2>

                <button
                    type="button"
                    aria-label="Close hero pool breakdown"
                    onClick={closeDialog}
                    className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
                >
                    ×
                </button>
            </header>

            <div
                className="min-h-0 flex-1 overflow-y-auto p-ui-md"
                tabIndex={0}
                role="region"
                aria-label="Hero pool scores"
            >
                {heroes.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                        No pool suggestions available for this draft.
                    </p>
                ) : (
                    <ul className="space-y-ui-sm">
                        {heroes.map((hero) => {
                            const score = Number(hero.totalScore);

                            return (
                                <li
                                    key={hero.HeroId}
                                    className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-ui-sm rounded-control bg-surface-raised p-ui-sm"
                                >
                                    <img
                                        src={hero.icon_url}
                                        alt=""
                                        className="aspect-video w-full rounded-control object-cover"
                                    />

                                    <span
                                        className="min-w-0 truncate text-sm"
                                        title={hero.name}
                                    >
                                        {hero.name}
                                    </span>

                                    <span
                                        className={`shrink-0 font-mono text-sm tabular-nums ${
                                            score > 0
                                                ? "text-green-400"
                                                : score < 0
                                                    ? "text-danger"
                                                    : "text-ink-muted"
                                        }`}
                                    >
                                        {hero.totalScore}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </dialog>
    );
}