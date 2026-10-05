import { useEffect, useRef, useState } from "react";
import HoverTooltip from "./HoverTooltip";

function RecommendationRow({
    hero,
    fromPool = false,
    onMouseEnter,
    onMouseLeave
}) {
    const score = Number(hero.totalScore);
    const scoreColor = score > 0
        ? "text-green-400"
        : score < 0
            ? "text-danger"
            : "text-ink-muted";

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-ui-sm rounded-control px-ui-sm py-ui-xs
                ${fromPool ? "bg-accent/10" : "bg-surface-raised"}`}
        >
            <img
                src={hero.icon_url}
                alt={hero.name}
                className="aspect-video w-full rounded-control object-cover"
            />

            <span
                className="min-w-0 truncate text-sm font-medium text-ink"
                title={hero.name}
            >
                {hero.name}
            </span>

            {/* Stack the included bonus below the total so it cannot crowd the name. */}
            <div className="flex flex-col items-end gap-0.5">
                <span
                    className={`whitespace-nowrap font-mono text-sm tabular-nums ${scoreColor}`}
                >
                    {hero.totalScore}
                </span>

                {hero.synergyBonus > 0 && (
                    <span
                        className="rounded border border-accent/40 px-ui-xs text-[10px] font-semibold leading-4 text-accent"
                        title="Draft adjustment included in the total score"
                    >
                        +{Number(hero.synergyBonus).toFixed(2)}
                    </span>
                )}
            </div>
        </div>
    );
}

function Sidebar({
    suggestedHeroes,
    poolSuggestions,
    globalSuggestions,
    selectedHeroes,
    hoveredHero,
    setHoveredHero,
    hoveredSuggestedHero,
    setHoveredSuggestedHero,
    matchupIndex,
    getSynergyWith,
    getCounterVs,
    fullDraftStats,
    filterByHeroPool,
    setFilterByHeroPool,
    heroPool,
    roleFilter,
    setRoleFilter,
    showPoolBreakdown,
    setShowPoolBreakdown,
    fullPoolSynergies,
    questionMarkIcon,
    showGuide,
    setShowGuide,
    updateSynergySuggestions,
    showWinrateInfo,
    setShowWinrateInfo,
    getWinProbability,
    hasPicks,
    bannedHeroes,
    infoButtonIcon,
    patch,
    lastUpdated
}) {
    const sidebarScrollRef = useRef(null);

    const [tooltipPoint, setTooltipPoint] = useState({ x: 0, y: 0 });

    // The guide sits above recommendations; bring it into view whenever it opens.
    useEffect(() => {
        if (showGuide && sidebarScrollRef.current) {
            sidebarScrollRef.current.scrollTop = 0;
        }
    }, [showGuide]);

    return (
        <div className="ui-panel relative min-h-0 min-w-0 flex flex-col p-ui-md 2xl:p-ui-lg">
            <div
                ref={sidebarScrollRef}
                className="min-h-0 flex-1 overflow-y-auto space-y-ui-sm"
            >
                {/* === User Guide Box === */}
                {showGuide && (
                    <section
                        aria-labelledby="drafting-guide-title"
                        className="rounded-control border border-line bg-surface-raised text-sm guide-flash"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-ui-sm rounded-t-control border-b border-line bg-surface-raised px-ui-md py-ui-xs">
                            <h2 id="drafting-guide-title" className="font-semibold text-ink">
                                Guide
                            </h2>

                            <button
                                type="button"
                                aria-label="Close guide"
                                onClick={() => setShowGuide(false)}
                                className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
                            >
                                ×
                            </button>
                        </div>

                        <p className="p-ui-md leading-relaxed text-ink-muted">
                            Welcome to the ultimate Dota 2 drafting tool. Hero suggestions will show up as you pick. Select heroes either by clicking or dragging them,
                            ban them with right-click, and get real-time synergy data to heroes still remaining in the pool. Full draft analysis appears once both teams are filled.
                            Hero matchup data will be updated using STRATZ API once a week to maintain the integrity of the app. <br /><br />

                            Typing at any time starts a search function that is very familiar to people from Dota 2. Use the hero pool toggle button above to set your personalized
                            hero pool and the tool will still suggest globally great hero choices but also three best choices from your hero pool as long as the filter in turned on. Clicking on the info button near
                            the title of your own hero pool suggestions shows your entire hero pool broken down into synergy scores. Hovering over hero suggestions shows more details
                            as to where the number comes from, including any draft trait bonuses (Disabler / Pusher / Initiator) added when your draft is missing key tools early.
                            Trait bonuses are only guidance for recommendations and are NOT included in the final full draft analysis once both teams are filled. <br /><br />

                            If you encounter any bugs or problems, you can file a bug report using the button at the bottom of the screen. Do not abuse this functionality, as the
                            button loses its purpose and I will stop receiving and reading the bug reports. Good luck in your games! <br />
                            <i>- Phantom (the developer)</i>
                        </p>
                    </section>
                )}
                {suggestedHeroes.length === 0 && hasPicks === false ? (
                    <p className="text-ink-muted text-sm italic">
                        Pick a hero to see recommendations.
                    </p>
                ) : (
                    <>
                        {fullDraftStats ? (
                            <>
                                {/* One table keeps headers and all five hero rows aligned. */}
                                <table className="w-full border-separate border-spacing-x-0 border-spacing-y-ui-xs text-sm">
                                    <caption className="sr-only">Full draft hero scores</caption>

                                    <thead className="text-xs font-semibold text-ink-muted">
                                        <tr>
                                            <th scope="col" className="border-b border-line px-ui-xs pb-ui-sm text-left">
                                                Ally
                                            </th>
                                            <th scope="col" aria-label="Ally score" className="border-b border-line px-ui-xs pb-ui-sm text-right">
                                                Score
                                            </th>
                                            <th scope="col" aria-label="Enemy score" className="border-b border-l border-line px-ui-xs pb-ui-sm text-left">
                                                Score
                                            </th>
                                            <th scope="col" className="border-b border-line px-ui-xs pb-ui-sm text-right">
                                                Enemy
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {Array.from({ length: 5 }).map((_, i) => {
                                            const ally = fullDraftStats.ally[i];
                                            const enemy = fullDraftStats.enemy[i];

                                            return (
                                                <tr key={i}>
                                                    <td className="rounded-l-control bg-surface-raised px-ui-xs py-ui-xs align-middle">
                                                        <img
                                                            src={ally.icon_url}
                                                            alt={ally.name}
                                                            className="block aspect-video w-12 rounded-control object-cover"
                                                            onMouseEnter={(event) => {
                                                                setTooltipPoint({ x: event.clientX, y: event.clientY });
                                                                setHoveredHero({ ...ally, team: 'ally' });
                                                            }}
                                                            onMouseLeave={() => setHoveredHero(null)}
                                                        />
                                                    </td>

                                                    <td
                                                        className={`bg-surface-raised px-ui-xs py-ui-xs text-right align-middle font-mono tabular-nums whitespace-nowrap ${ally.totalScore > 0
                                                            ? 'text-green-400'
                                                            : ally.totalScore < 0
                                                                ? 'text-danger'
                                                                : 'text-ink-muted'}`}
                                                    >
                                                        {ally.totalScore > 0 ? '+' : ''}{ally.totalScore}
                                                    </td>

                                                    {/* Enemy colours are reversed: positive enemy scores favour the opposing team. */}
                                                    <td
                                                        className={`border-l border-line bg-surface-raised px-ui-xs py-ui-xs text-left align-middle font-mono tabular-nums whitespace-nowrap ${enemy.totalScore > 0
                                                            ? 'text-danger'
                                                            : enemy.totalScore < 0
                                                                ? 'text-green-400'
                                                                : 'text-ink-muted'}`}
                                                    >
                                                        {enemy.totalScore > 0 ? '+' : ''}{enemy.totalScore}
                                                    </td>

                                                    <td className="rounded-r-control bg-surface-raised px-ui-xs py-ui-xs align-middle">
                                                        <img
                                                            src={enemy.icon_url}
                                                            alt={enemy.name}
                                                            className="ml-auto block aspect-video w-12 rounded-control object-cover"
                                                            onMouseEnter={(event) => {
                                                                setTooltipPoint({ x: event.clientX, y: event.clientY });
                                                                setHoveredHero({ ...enemy, team: 'enemy' });
                                                            }}
                                                            onMouseLeave={() => setHoveredHero(null)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div className="grid grid-cols-2 gap-ui-md border-t border-line pt-ui-sm">
                                    <div className="min-w-0 text-center">
                                        <p className="text-xs text-ink-muted">Ally total</p>
                                        <p className="font-mono text-lg font-semibold tabular-nums text-green-400">
                                            {fullDraftStats.ally.reduce((sum, h) => sum + parseFloat(h.totalScore), 0).toFixed(1)}
                                        </p>
                                    </div>

                                    <div className="min-w-0 text-center">
                                        <p className="text-xs text-ink-muted">Enemy total</p>
                                        <p className="font-mono text-lg font-semibold tabular-nums text-danger">
                                            {fullDraftStats.enemy.reduce((sum, h) => sum + parseFloat(h.totalScore), 0).toFixed(1)}
                                        </p>
                                    </div>
                                </div>
                                {/* Outcome prediction */}
                                <div className="mt-1 text-center relative group">
                                    {(() => {
                                        const allyTotal = fullDraftStats.ally.reduce((sum, h) => sum + parseFloat(h.totalScore), 0);
                                        const enemyTotal = fullDraftStats.enemy.reduce((sum, h) => sum + parseFloat(h.totalScore), 0);
                                        const delta = allyTotal - enemyTotal;
                                        const allyWin = getWinProbability(delta);
                                        const enemyWin = ((100 - allyWin)).toFixed(2);

                                        return (
                                            <span className="text-lg font-bold">
                                                <span className="text-green-400">{allyWin}%</span>
                                                <span className="text-gray-400 mx-1">/</span>
                                                <span className="text-red-400">{enemyWin}%</span>

                                                <button
                                                    onClick={() => setShowWinrateInfo(prev => !prev)}
                                                    className="ml-2 text-xs bg-white bg-opacity-0 rounded-full w-4 h-4 inline-flex items-center justify-center hover:bg-gray-600"
                                                    title="Winrate info"
                                                >
                                                    <img src={infoButtonIcon} alt="WinrateInfo" className="filter invert" />
                                                </button>
                                            </span>
                                        );
                                    })()}
                                    {showWinrateInfo && (
                                        <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-[260px] bg-gray-900 text-white text-xs p-3 rounded shadow-lg z-10">
                                            <p>
                                                NOTE! Winrate calculations are made purely based on the synergy scores of each hero.
                                                Win probability will never be above 80% for this reason. Cooperation and coordination
                                                can turn the tide even against the heaviest of outdrafts in Dota.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {hoveredHero && (
                                    <HoverTooltip initialPoint={tooltipPoint}>
                                        <h3 className="mb-ui-sm break-words font-semibold text-ink">
                                            Synergy breakdown: {hoveredHero.name}
                                        </h3>
                                        <ul className="space-y-ui-xs text-ink-muted">
                                            {(hoveredHero.team === 'ally'
                                                ? [...selectedHeroes.ally, ...selectedHeroes.enemy]
                                                : [...selectedHeroes.enemy, ...selectedHeroes.ally]
                                            )
                                                .filter(h => h.HeroId !== hoveredHero.HeroId)
                                                .map(other => {
                                                    const entry = matchupIndex?.[String(hoveredHero.HeroId)];
                                                    const sameTeam = ((hoveredHero.team === 'ally' && selectedHeroes.ally.some(h => h.HeroId === other.HeroId))
                                                        || (hoveredHero.team === 'enemy' && selectedHeroes.enemy.some(h => h.HeroId === other.HeroId)));

                                                    const score = sameTeam
                                                        ? (entry?.withMap?.get(String(other.HeroId)) ?? 0)
                                                        : (entry?.vsMap?.get(String(other.HeroId)) ?? 0);

                                                    return (
                                                        <li
                                                            key={other.HeroId}
                                                            className="flex items-start justify-between gap-ui-sm"
                                                        >
                                                            <span className={`shrink-0 font-mono tabular-nums ${score > 0
                                                                    ? 'text-green-400'
                                                                    : score < 0
                                                                        ? 'text-danger'
                                                                        : 'text-ink-muted'
                                                                }`}>{other.name}</span>
                                                        </li>
                                                    );
                                                })}
                                        </ul>
                                    </HoverTooltip>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-ui-sm border-b border-line px-ui-sm py-ui-xs text-xs font-semibold text-ink-muted">
                                    <span>Hero</span>
                                    <span>Name</span>
                                    <span className="text-right">Score</span>
                                </div>

                                {selectedHeroes.ally.length < 5 && (
                                    <>
                                        {filterByHeroPool && (
                                            <>
                                                <div className="flex items-center justify-between px-2 py-1">
                                                    <div className="text-[10px] uppercase text-purple-400 px-2 py-1 tracking-wide font-semibold">
                                                        From Your Hero Pool
                                                    </div>
                                                    <button
                                                        className="p-1 hover:opacity-80"
                                                        onClick={() => setShowPoolBreakdown((prev) => !prev)}
                                                    >
                                                        <img src={questionMarkIcon} alt="info" className="w-4 h-4 filter invert" />
                                                    </button>
                                                </div>
                                                {poolSuggestions.map((hero) => (
                                                    <RecommendationRow
                                                        key={`pool-${hero.HeroId}`}
                                                        hero={hero}
                                                        fromPool
                                                        onMouseEnter={() => setHoveredSuggestedHero(hero)}
                                                        onMouseLeave={() => setHoveredSuggestedHero(null)}
                                                    />
                                                ))}

                                                <div className="text-[10px] uppercase text-gray-400 px-2 py-1 mt-2 tracking-wide font-semibold">
                                                    Other Strong Picks
                                                </div>
                                            </>
                                        )}
                                        {globalSuggestions.map((hero) => (
                                            <RecommendationRow
                                                key={`global-${hero.HeroId}`}
                                                hero={hero}
                                                onMouseEnter={() => setHoveredSuggestedHero(hero)}
                                                onMouseLeave={() => setHoveredSuggestedHero(null)}
                                            />
                                        ))}
                                    </>
                                )}
                                {selectedHeroes.ally.length === 5 && (
                                    <div className="text-small text-gray-400 mt-4 px-2 py-2 text-center">
                                        Remove an allied hero to receive suggestions.
                                        {selectedHeroes.enemy.length < 5 && (
                                            <div className="py-4">Fill out the enemy team for a full draft breakdown.</div>
                                        )}
                                    </div>
                                )}
                                {hoveredSuggestedHero && (
                                    <div className="absolute right-4 bottom-36 bg-gray-900 border border-gray-600 rounded opacity-90 p-6 text-sm shadow-lg z-30 w-[320px] max-h-[400px] overflow-y-auto pointer-events-none">
                                        <h3 className="text-white font-bold mb-2">{hoveredSuggestedHero.name} Breakdown</h3>

                                        <div className="mb-2">
                                            <p className="text-green-400 font-semibold mb-1">Synergy with Allies</p>
                                            {selectedHeroes.ally.length === 0 ? (
                                                <p className="text-gray-500 italic">No allies selected</p>
                                            ) : (
                                                selectedHeroes.ally.map(ally => {
                                                    const score = getSynergyWith(matchupIndex, hoveredSuggestedHero.HeroId, ally.HeroId);
                                                    return (
                                                        <div key={ally.HeroId} className="flex justify-between text-gray-300">
                                                            <span>{ally.name}</span>
                                                            <span className={score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : ""}>
                                                                {score > 0 ? "+" : ""}
                                                                {score.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-red-400 font-semibold mb-1">Effectiveness vs Enemies</p>
                                            {selectedHeroes.enemy.length === 0 ? (
                                                <p className="text-gray-500 italic">No enemies selected</p>
                                            ) : (
                                                selectedHeroes.enemy.map(enemy => {
                                                    const score = getCounterVs(matchupIndex, hoveredSuggestedHero.HeroId, enemy.HeroId);
                                                    return (
                                                        <div key={enemy.HeroId} className="flex justify-between text-gray-300">
                                                            <span>{enemy.name}</span>
                                                            <span className={score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : ""}>
                                                                {score > 0 ? "+" : ""}
                                                                {score.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {hoveredSuggestedHero?.bonuses?.length > 0 && (
                                            <div className="mt-3 pt-2 border-t border-gray-700">
                                                <p className="text-purple-300 font-semibold mb-1">Draft adjustment</p>
                                                {hoveredSuggestedHero.bonuses.map((b) => (
                                                    <div key={b.type} className="flex justify-between text-gray-300">
                                                        <span>{b.label}</span>
                                                        <span className="text-purple-300 font-mono">
                                                            +{Number(b.value).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {showPoolBreakdown && (
                                    <div className="absolute top-4 right-[360px] bg-gray-900 border border-purple-500 rounded-lg p-4 shadow-lg w-[300px] max-h-[80vh] overflow-y-auto z-50">
                                        <div className="flex justify-between items-center mb-3">
                                            <h2 className="text-purple-400 text-sm font-semibold uppercase">Full Hero Pool Breakdown</h2>
                                            <button onClick={() => setShowPoolBreakdown(false)} className="text-white hover:text-red-400 text-lg font-bold">
                                                ×
                                            </button>
                                        </div>
                                        {fullPoolSynergies.map((hero) => (
                                            <div key={`breakdown-${hero.HeroId}`} className="flex items-center justify-between mb-2">
                                                <div className="flex items-center">
                                                    <img src={hero.icon_url} alt={hero.name} className="w-14 h-8 mr-2" />
                                                    <span className="text-white text-sm truncate max-w-[140px]">{hero.name}</span>
                                                </div>
                                                <span
                                                    className={`text-sm font-mono ${parseFloat(hero.totalScore) >= 0 ? "text-green-400" : "text-red-400"
                                                        }`}
                                                >
                                                    {hero.totalScore}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* === Suggestion Filters: Pool & Role === */}
            <div className="mt-ui-md shrink-0 space-y-ui-sm border-t border-line pt-ui-sm">
                <div className="flex flex-wrap items-start justify-between gap-ui-sm">
                    <p className="py-ui-sm text-sm text-ink-muted">
                        Suggestion filters
                    </p>

                    <div className="ml-auto flex flex-col items-end gap-ui-xs">
                        <button
                            type="button"
                            onClick={() => setFilterByHeroPool(prev => !prev)}
                            disabled={heroPool.length < 3}
                            aria-pressed={filterByHeroPool}
                            aria-describedby={heroPool.length < 3 ? "hero-pool-filter-help" : undefined}
                            className="ui-button ui-button-accent text-xs"
                        >
                            {filterByHeroPool ? "Hero Pool: ON" : "Hero Pool: OFF"}
                        </button>

                        {heroPool.length < 3 && (
                            <p
                                id="hero-pool-filter-help"
                                className="max-w-[7.5rem] text-right text-xs text-ink-muted"
                            >
                                Requires 3+ heroes.
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-ui-sm">
                    <button
                        type="button"
                        aria-pressed={roleFilter === "Carry"}
                        className="ui-button ui-button-accent w-full"
                        onClick={() => {
                            const newFilter = roleFilter === "Carry" ? null : "Carry";
                            setRoleFilter(newFilter);
                            updateSynergySuggestions(
                                selectedHeroes.ally,
                                selectedHeroes.enemy,
                                bannedHeroes,
                                newFilter
                            );
                        }}
                    >
                        Carry
                    </button>

                    <button
                        type="button"
                        aria-pressed={roleFilter === "Support"}
                        className="ui-button ui-button-accent w-full"
                        onClick={() => {
                            const newFilter = roleFilter === "Support" ? null : "Support";
                            setRoleFilter(newFilter);
                            updateSynergySuggestions(
                                selectedHeroes.ally,
                                selectedHeroes.enemy,
                                bannedHeroes,
                                newFilter
                            );
                        }}
                    >
                        Support
                    </button>
                </div>
            </div>
            {/* === App Footer Info === */}
            <dl className="mt-ui-sm shrink-0 space-y-ui-xs border-t border-line pt-ui-sm text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-x-ui-sm">
                    <dt className="text-ink-muted">Patch</dt>
                    <dd className="font-mono text-ink">{patch ?? "unknown"}</dd>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-x-ui-sm">
                    <dt className="text-ink-muted">Last updated</dt>
                    <dd className="text-ink">{lastUpdated ?? "unknown"}</dd>
                </div>
            </dl>
        </div>
    );
}

export default Sidebar;