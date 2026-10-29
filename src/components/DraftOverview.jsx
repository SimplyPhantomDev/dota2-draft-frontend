import { useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { calculateSynergyPicks } from "../utils/synergy";

function Score({ value }) {
    if (value == null) return <span className="text-ink-muted">—</span>;

    // Normalize rounded negative zero before choosing the label and colour.
    const score = Number(Number(value).toFixed(2));
    const colour = score === 0
        ? "text-ink-muted"
        : score > 0
            ? "text-green-400"
            : "text-danger";

    return (
        <span className={`font-mono tabular-nums whitespace-nowrap ${colour}`}>
            {score > 0 ? "+" : ""}{score.toFixed(2)}
        </span>
    );
}

function TeamScores({ team, label, picks, scores }) {
    const scoresById = new Map((scores ?? []).map(hero => [hero.HeroId, hero]));

    return (
        <section data-tutorial-target={`overview-${team}`} className="ui-panel min-w-0 overflow-hidden">
            <header className="flex items-center justify-between gap-ui-sm border-b border-line bg-surface-raised p-ui-md">
                <h3 className={`font-semibold ${team === "ally" ? "text-green-400" : "text-danger"}`}>
                    {label}
                </h3>

                <span className="text-sm text-ink-muted">
                    {picks.length}/5 picked
                </span>
            </header>

            {picks.length === 0 ? (
                <p className="p-ui-md text-sm text-ink-muted">
                    No heroes picked for this team yet.
                </p>
            ) : (
                <table className="w-full table-fixed text-sm">
                    <caption className="sr-only">
                        {label} current hero scores
                    </caption>

                    <colgroup>
                        <col className="w-[44%]" />
                        <col />
                        <col />
                        <col />
                    </colgroup>

                    <thead className="text-xs text-ink-muted">
                        <tr>
                            <th scope="col" className="px-ui-sm py-ui-sm text-left">
                                Hero
                            </th>
                            <th
                                data-tutorial-target={`overview-column-${team}-synergy`}
                                scope="col" className="px-ui-sm py-ui-sm text-right"
                            >
                                Allies
                            </th>
                            <th
                                data-tutorial-target={`overview-column-${team}-counter`}
                                scope="col" className="px-ui-sm py-ui-sm text-right"
                            >
                                Enemies
                            </th>
                            <th
                                data-tutorial-target={`overview-column-${team}-total`}
                                scope="col" className="px-ui-sm py-ui-sm text-right"
                            >
                                Total
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {picks.map(hero => {
                            const score = scoresById.get(hero.HeroId);

                            return (
                                <tr key={hero.HeroId} className="border-t border-line">
                                    <th
                                        scope="row"
                                        className="px-ui-sm py-ui-sm text-left font-normal"
                                    >
                                        <div className="flex min-w-0 items-center gap-ui-sm">
                                            <img
                                                src={hero.icon_url}
                                                alt=""
                                                className="aspect-video w-12 shrink-0 rounded-control object-cover"
                                            />

                                            <span
                                                className="min-w-0 truncate"
                                                title={hero.name}
                                            >
                                                {hero.name}
                                            </span>
                                        </div>
                                    </th>

                                    <td
                                        data-tutorial-target={`overview-column-${team}-synergy`}
                                        className="px-ui-sm py-ui-sm text-right"
                                    >
                                        <Score
                                            value={score?.synergyScore}
                                        />
                                    </td>

                                    <td
                                        data-tutorial-target={`overview-column-${team}-counter`}
                                        className="px-ui-sm py-ui-sm text-right"
                                    >
                                        <Score
                                            value={score?.counterScore}
                                        />
                                    </td>

                                    <td
                                        data-tutorial-target={`overview-column-${team}-total`}
                                        className="px-ui-sm py-ui-sm text-right font-semibold"
                                    >
                                        <Score
                                            value={score?.totalScore}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </section>
    );
}

export default function DraftOverview({
    teamLabels,
    selectedHeroes,
    matchupIndex,
    heroes,
    onClose,
    shortcutKey,
    tutorialMode = false,
    bottomInset = 0,
    tutorialTarget = null,
}) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);

    // Reuse picked-hero scoring, including its rounding and enemy perspective.
    // An explicit analysis request skips recommendation composition bonuses.
    const stats = useMemo(() => calculateSynergyPicks({
        allyHeroIds: selectedHeroes.ally.map(hero => hero.HeroId),
        enemyHeroIds: selectedHeroes.enemy.map(hero => hero.HeroId),
        fullDraft: true,
        matchupIndex,
        heroes,
    })?.teams ?? null, [selectedHeroes, matchupIndex, heroes]);

    // Practice uses a modeless dialog so the narrator remains reachable.
    // Normal drafting retains native modal focus and backdrop behaviour.
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (tutorialMode) dialog.show();
        else dialog.showModal();
        closeButtonRef.current?.focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
        };
    }, [tutorialMode]);

    // Bring the narrated table or column into this panel's own scroll area.
    // Scrolling here must not move the surrounding application or narrator.
    useLayoutEffect(() => {
        if (!tutorialMode || !tutorialTarget) return;
        const content = dialogRef.current.querySelector('[data-tutorial-target="overview-content"]');
        const target = content?.querySelector(`[data-tutorial-target="${tutorialTarget}"]`);
        if (!target) return;

        const bounds = target.getBoundingClientRect();
        const viewport = content.getBoundingClientRect();
        if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) {
            content.scrollTop += bounds.top - viewport.top - 8;
        }
    }, [tutorialMode, tutorialTarget, bottomInset]);

    const closeDialog = () => {
        if (onClose() === false) return;
        dialogRef.current.close();
    };

    const handleBackdropClick = (event) => {
        if (event.target !== event.currentTarget) return;

        const bounds = event.currentTarget.getBoundingClientRect();

        if (
            event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom
        ) {
            closeDialog();
        }
    };

    return createPortal(
        <dialog
            id="draft-overview-dialog"
            data-tutorial-target="draft-overview"
            ref={dialogRef}
            aria-modal={!tutorialMode}
            aria-labelledby="draft-overview-title"
            aria-describedby="draft-overview-description"
            className="m-auto w-[70rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-panel border border-line bg-surface p-0 text-ink shadow-panel backdrop:bg-black/60 open:flex open:flex-col"
            style={tutorialMode ? {
                position: "fixed",
                zIndex: 60,
                margin: 0,
                top: 16,
                left: "50%",
                right: "auto",
                bottom: "auto",
                transform: "translateX(-50%)",
                width: "min(55rem, calc(100vw - 2rem))",
                maxHeight: `calc(100dvh - ${bottomInset + 32}px)`,
            } : undefined}
            onCancel={(event) => {
                event.preventDefault();
                closeDialog();
            }}
            onClick={handleBackdropClick}
            onKeyDown={(event) => {
                // The modal owns keys; F2 and hero search must remain inactive.
                event.stopPropagation();

                if (event.defaultPrevented || event.nativeEvent?.isComposing) return;

                if (
                    (event.code === shortcutKey || (tutorialMode && event.key === "Escape")) &&
                    !event.ctrlKey && !event.altKey &&
                    !event.shiftKey && !event.metaKey
                ) {
                    event.preventDefault();
                    if (!event.repeat) closeDialog();
                }
            }}
        >
            <header className="flex shrink-0 items-start gap-ui-md border-b border-line p-ui-lg">
                <button
                    ref={closeButtonRef}
                    data-tutorial-target="overview-close"
                    type="button"
                    aria-label="Close draft overview"
                    aria-keyshortcuts={`${shortcutKey} Escape`}
                    onClick={closeDialog}
                    className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
                >
                    ×
                </button>

                <div className="min-w-0">
                    <h2
                        id="draft-overview-title"
                        className="text-lg font-semibold"
                    >
                        Draft overview
                    </h2>

                    <p
                        id="draft-overview-description"
                        className="mt-ui-xs text-sm text-ink-muted"
                    >
                        Teammate synergy and opponent matchups for the heroes picked so far.
                    </p>
                </div>
            </header>

            <div data-tutorial-target="overview-content" className="min-h-0 flex-1 overflow-y-auto p-ui-lg">
                {!stats && (
                    selectedHeroes.ally.length > 0 ||
                    selectedHeroes.enemy.length > 0
                ) && (
                    <p role="status" className="mb-ui-md text-sm text-ink-muted">
                        Matchup data is unavailable. Scores will appear when it loads.
                    </p>
                )}

                <div className="grid gap-ui-lg lg:grid-cols-2">
                    {["ally", "enemy"].map(team => (
                        <TeamScores
                            team={team}
                            label={teamLabels[team]}
                            picks={selectedHeroes[team]}
                            scores={stats?.[team]}
                            key={team}
                        />
                    ))}
                </div>
            </div>

            <footer className="shrink-0 space-y-ui-xs border-t border-line px-ui-lg py-ui-md text-sm text-ink-muted">
                <p>
                    Current picks only; composition bonuses are excluded.
                    Positive scores favour the hero's own team.
                </p>

                <p>
                    Press <kbd className="font-mono text-ink">{shortcutKey}</kbd>
                    {tutorialMode
                        ? " or use the X to close this window."
                        : " or Escape to close this window."}
                </p>
            </footer>
        </dialog>,
        document.body
    );
}