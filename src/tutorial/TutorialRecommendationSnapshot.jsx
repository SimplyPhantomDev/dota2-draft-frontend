import { RecommendationRow } from "../components/Sidebar";

export default function TutorialRecommendationSnapshot({ heroes }) {
    return (
        <>
            <h2
                id="tutorial-before-title"
                className="mb-ui-sm shrink-0 text-center text-sm font-semibold"
            >
                BEFORE
            </h2>

            <div
                tabIndex={0}
                aria-label="Before recommendations"
                className="min-h-0 flex-1 space-y-ui-sm overflow-y-auto"
            >
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-ui-sm border-b border-line px-ui-sm py-ui-xs text-xs font-semibold text-ink-muted">
                    <span>Hero</span>
                    <span>Name</span>
                    <span className="text-right">Score</span>
                </div>

                {heroes.map(hero => (
                    <RecommendationRow key={hero.HeroId} hero={hero} />
                ))}
            </div>
        </>
    );
}