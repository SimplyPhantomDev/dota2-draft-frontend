import { useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { calculateSynergyPicks } from "../utils/synergy";

function Score({ value, enemy }) {
    if (value == null) return <span className="text-ink-muted">—</span>;

    // Normalize rounded negative zero before choosing the label and colour.
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

function TeamScores({ team, picks, scores }) {
    const label = team === "ally" ? "Ally team" : "Enemy team";
    const scoresById = new Map((scores ?? []).map(hero => [hero.HeroId, hero]));

    return (
        <section className="ui-panel min-w-0 overflow-hidden">
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
                            <th scope="col" className="px-ui-sm py-ui-sm text-right">
                                Allies
                            </th>
                            <th scope="col" className="px-ui-sm py-ui-sm text-right">
                                Enemies
                            </th>
                            <th scope="col" className="px-ui-sm py-ui-sm text-right">
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

                                    <td className="px-ui-sm py-ui-sm text-right">
                                        <Score
                                            value={score?.synergyScore}
                                            enemy={team === "enemy"}
                                        />
                                    </td>

                                    <td className="px-ui-sm py-ui-sm text-right">
                                        <Score
                                            value={score?.counterScore}
                                            enemy={team === "enemy"}
                                        />
                                    </td>

                                    <td className="px-ui-sm py-ui-sm text-right font-semibold">
                                        <Score
                                            value={score?.totalScore}
                                            enemy={team === "enemy"}
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
    selectedHeroes,
    matchupIndex,
    heroes,
    onClose,
    shortcutKey,
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

    // A native modal contains focus and blocks drafting behind the overview.
    // Close during cleanup so native focus restoration also works on unmount.
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        dialog.showModal();
        closeButtonRef.current?.focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
        };
    }, []);

    const closeDialog = () => {
        dialogRef.current.close();
        onClose();
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
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby="draft-overview-title"
            aria-describedby="draft-overview-description"
            className="m-auto w-[70rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-panel border border-line bg-surface p-0 text-ink shadow-panel backdrop:bg-black/60 open:flex open:flex-col"
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
                    event.code === shortcutKey &&
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
                        Ally synergy and enemy matchups for the heroes picked so far.
                    </p>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-ui-lg">
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
                            key={team}
                            team={team}
                            picks={selectedHeroes[team]}
                            scores={stats?.[team]}
                        />
                    ))}
                </div>
            </div>

            <footer className="shrink-0 space-y-ui-xs border-t border-line px-ui-lg py-ui-md text-sm text-ink-muted">
                <p>
                    Current picks only; composition bonuses are excluded.
                    Positive enemy scores favour the enemy team.
                </p>

                <p>
                    Press <kbd className="font-mono text-ink">{shortcutKey}</kbd>
                    {" "}or Escape to close this window.
                </p>
            </footer>
        </dialog>,
        document.body
    );
}