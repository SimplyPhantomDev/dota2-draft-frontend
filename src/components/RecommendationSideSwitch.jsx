import { TEAM_LABELS } from "../utils/draftTeams";

export default function RecommendationSideSwitch({
    team,
    onSwitch,
    teamLabels = TEAM_LABELS,
}) {
    const dire = team === "enemy";

    return (
        <div className="mb-ui-sm shrink-0 space-y-ui-xs">
            <p className="text-center text-xs text-ink-muted">
                Recommendations for
            </p>

            <button
                type="button"
                role="switch"
                aria-label={`${teamLabels.enemy} recommendations`}
                aria-checked={dire}
                title="Change which team's next picks are recommended"
                data-tutorial-target="recommendation-side"
                data-recommendation-team={team}
                onClick={onSwitch}
                className="relative grid w-full grid-cols-2 rounded-full border border-line bg-surface-raised p-1 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full border transition-transform duration-200 motion-reduce:transition-none ${dire
                        ? "translate-x-full border-red-400/40 bg-red-400/15"
                        : "border-green-400/40 bg-green-400/15"
                    }`}
                />

                <span className={`relative px-ui-xs py-ui-xs ${dire
                    ? "text-ink-muted" : "text-green-400"}`}>
                    {teamLabels.ally}
                </span>

                <span className={`relative px-ui-xs py-ui-xs ${dire
                    ? "text-danger" : "text-ink-muted"}`}>
                    {teamLabels.enemy}
                </span>
            </button>
        </div>
    );
}