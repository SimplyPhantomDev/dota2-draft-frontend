import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

function Score({ value, enemy }) {
    if (value == null) return <span className="text-ink-muted">—</span>;

    const score = Number(Number(value).toFixed(2));
    const colour = score === 0
        ? "text-ink-muted"
        : (enemy ? score < 0 : score > 0)
            ? "text-green-400"
            : "text-danger";

    return (
        <span className={`font-mono tabular-nums whitespace-nowrap ${colour}`}>
            {score > 0 ? "+" : ""}{score.toFixed(2)}
        </span>
    );
}

function Matchups({ title, rows, total, enemy }) {
    return (
        <section className="mt-ui-md">
            <div className="flex items-center justify-between gap-ui-sm font-semibold">
                <h3>{title}</h3>
                <Score value={total} enemy={enemy} />
            </div>

            {rows.length === 0 ? (
                <p className="mt-ui-xs text-sm text-ink-muted">
                    No heroes picked yet.
                </p>
            ) : (
                <ul className="mt-ui-xs space-y-ui-xs">
                    {rows.map(({ hero, score }) => (
                        <li key={hero.HeroId} className="flex items-center gap-ui-sm text-sm">
                            <img
                                src={hero.icon_url}
                                alt=""
                                className="aspect-video w-10 shrink-0 rounded-control object-cover"
                            />
                            <span className="min-w-0 flex-1 truncate" title={hero.name}>
                                {hero.name}
                            </span>
                            <Score value={score} enemy={enemy} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default function HeroInspector({
    inspection,
    selectedTeam,
    onPick,
    onClose,
    shortcutKey,
}) {
    const panelRef = useRef(null);
    const closeButtonRef = useRef(null);
    const enemy = selectedTeam === "enemy";
    const teamLabel = enemy ? "enemies" : "allies";

    // Focus the new tool once, without trapping focus. Restore the previous
    // control on close only if the user is still working inside the inspector.
    useLayoutEffect(() => {
        const previousFocus = document.activeElement;
        const panel = panelRef.current;
        closeButtonRef.current?.focus({ preventScroll: true });

        return () => {
            if (panel?.contains(document.activeElement) && previousFocus?.isConnected) {
                previousFocus.focus({ preventScroll: true });
            }
        };
    }, []);

    // A modeless portal keeps the draft interactive and avoids parent clipping.
    return createPortal(
        <section
            id="hero-inspector"
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="hero-inspector-title"
            aria-describedby="hero-inspector-help"
            className="fixed bottom-ui-lg right-ui-lg z-[60] flex max-h-[calc(100dvh-2rem)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-panel lg:right-[calc(clamp(17rem,22vw,22rem)+1.5rem)]"
        >
            <header className="flex shrink-0 items-center gap-ui-sm border-b border-line p-ui-md">
                <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label="Close hero inspector"
                    aria-keyshortcuts={shortcutKey}
                    onClick={onClose}
                    className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
                >
                    ×
                </button>

                <div className="min-w-0">
                    <h2 id="hero-inspector-title" className="font-semibold">
                        Hero inspector
                    </h2>
                    <p className={`text-sm ${enemy ? "text-danger" : "text-green-400"}`}>
                        Evaluating for {teamLabel}
                    </p>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-ui-md">
                {!inspection ? (
                    <p className="text-sm text-ink-muted">
                        Left-click a hero in the grid to inspect it.
                    </p>
                ) : (
                    <>
                        <div className="flex items-center gap-ui-sm">
                            <img
                                src={inspection.hero.icon_url}
                                alt=""
                                className="aspect-video w-16 shrink-0 rounded-control object-cover"
                            />
                            <h3 className="min-w-0 font-semibold">
                                {inspection.hero.name}
                            </h3>
                        </div>

                        <Matchups
                            title="Teammates"
                            rows={inspection.allyRows}
                            total={inspection.synergyScore}
                            enemy={enemy}
                        />
                        <Matchups
                            title="Opponents"
                            rows={inspection.enemyRows}
                            total={inspection.counterScore}
                            enemy={enemy}
                        />

                        <div className="mt-ui-md flex items-center justify-between gap-ui-sm border-t border-line pt-ui-sm font-semibold">
                            <span>Total</span>
                            <Score value={inspection.totalScore} enemy={enemy} />
                        </div>

                        {inspection.totalScore === null && (
                            <p className="mt-ui-xs text-sm text-ink-muted">
                                Some matchup data is unavailable.
                            </p>
                        )}
                    </>
                )}
            </div>

            <footer className="shrink-0 space-y-ui-sm border-t border-line p-ui-md">
                <button
                    type="button"
                    disabled={!inspection?.canPick}
                    aria-describedby={inspection?.pickBlockedReason
                        ? "hero-inspector-pick-status"
                        : undefined
                    }
                    onClick={() => {
                        if (inspection?.canPick) {
                            onPick(inspection.hero, inspection.team);
                        }
                    }}
                    className="ui-button ui-button-accent w-full whitespace-normal"
                >
                    {inspection
                        ? `Pick ${inspection.hero.name} for ${teamLabel}`
                        : "Select a hero first"
                    }
                </button>

                {inspection?.pickBlockedReason && (
                    <p
                        id="hero-inspector-pick-status"
                        role="status"
                        className="text-sm text-ink-muted"
                    >
                        {inspection.pickBlockedReason}
                    </p>
                )}

                <p id="hero-inspector-help" className="text-xs text-ink-muted">
                    Left-click to inspect. Drag to pick. Right-click to ban.
                    Positive scores favour the inspected hero.
                    Press <kbd className="font-mono text-ink">{shortcutKey}</kbd> to close.
                </p>
            </footer>
        </section>,
        document.body
    );
}