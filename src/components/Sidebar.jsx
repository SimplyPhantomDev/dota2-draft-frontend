
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
    mousePosition,
    showWinrateInfo,
    setShowWinrateInfo,
    getWinProbability,
    hasPicks,
    bannedHeroes,
    infoButtonIcon,
    patch,
    lastUpdated
}) {
    return (
        <div className="relative min-w-[260px] max-w-[350px] flex-[1] bg-gray-800 rounded shadow flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-2">
                {suggestedHeroes.length === 0 && hasPicks === false ? (
                    <p className="text-gray-400 text-sm italic">
                        Pick a hero to see recommendations.
                    </p>
                ) : (
                    <>
                        {fullDraftStats ? (
                            <>
                                {/* Header Row */}
                                <div className="flex items-center justify-between text-xs font-bold text-gray-300 border-b border-gray-600 mb-1">
                                    <span className="w-10 text-left">Ally</span>
                                    <span className="w-10 text-right">Score</span>
                                    <div className="border-1 border-gray-500 h-6 mx-1" />
                                    <span className="w-10 text-left">Score</span>
                                    <span className="w-10 text-right">Enemy</span>
                                </div>

                                {/* 5 rows for each hero */}
                                {Array.from({ length: 5 }).map((_, i) => {
                                    const ally = fullDraftStats.ally[i];
                                    const enemy = fullDraftStats.enemy[i];
                                    return (
                                        <div key={i} className="flex items-center justify-between bg-gray-700 rounded px-2 py-1">
                                            <img
                                                src={ally.icon_url}
                                                alt={ally.name}
                                                className="w-10 h-10 object-contain"
                                                onMouseEnter={() => setHoveredHero({ ...ally, team: 'ally' })}
                                                onMouseLeave={() => setHoveredHero(null)}
                                            />
                                            <span
                                                className={`text-sm font-mono w-10 text-right ${ally.totalScore > 0 ? 'text-green-400' :
                                                    ally.totalScore < 0 ? 'text-red-400' :
                                                        'text-gray-400'
                                                    }`}
                                            >
                                                {ally.totalScore > 0 ? '+' : ''}{ally.totalScore}
                                            </span>
                                            <div className="border-1 border-gray-600 h-6 mx-1" />
                                            <span
                                                className={`text-sm font-mono w-10 text-left ${enemy.totalScore > 0 ? 'text-red-400' :
                                                    enemy.totalScore < 0 ? 'text-green-400' :
                                                        'text-gray-400'
                                                    }`}
                                            >
                                                {enemy.totalScore > 0 ? '+' : ''}{enemy.totalScore}
                                            </span>
                                            <img
                                                src={enemy.icon_url}
                                                alt={enemy.name}
                                                className="w-10 h-10 object-contain"
                                                onMouseEnter={() => setHoveredHero({ ...enemy, team: 'enemy' })}
                                                onMouseLeave={() => setHoveredHero(null)}
                                            />
                                        </div>
                                    );
                                })}
                                {/* Totals */}
                                <div className="mt-2 flex items-center justify-center gap-2 text-lg font-bold">
                                    <span className="text-green-400">
                                        {fullDraftStats.ally.reduce((sum, h) => sum + parseFloat(h.totalScore), 0).toFixed(1)}
                                    </span>
                                    <span className="text-gray-400 text-sm">vs</span>
                                    <span className="text-red-400">
                                        {fullDraftStats.enemy.reduce((sum, h) => sum + parseFloat(h.totalScore), 0).toFixed(1)}
                                    </span>
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
                                    <div
                                        className="fixed bg-gray-900 border border-gray-600 rounded p-4 text-sm shadow-lg z-50 w-[300px] max-h-[400px] overflow-y-auto pointer-events-none"
                                        style={{
                                            top: `${mousePosition.y + 10}px`,
                                            left: `${mousePosition.x + 10}px`,
                                        }}
                                    >
                                        <h3 className="text-white font-bold mb-2">
                                            Synergy breakdown: {hoveredHero.name}
                                        </h3>
                                        <ul className="text-gray-300 space-y-1">
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
                                                        <li key={other.HeroId} className="flex justify-between">
                                                            <span>{other.name}</span>
                                                            <span
                                                                className={`font-mono ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-400'
                                                                    }`}
                                                            >
                                                                {score > 0 ? '+' : ''}{score.toFixed(2)}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-gray-300 border-b border-gray-600 mb-1">
                                    <span className="w-10">Hero</span>
                                    <span className="flex-1 pl-2">Name</span>
                                    <span className="text-right pr-1">Synergy</span>
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
                                                    <div
                                                        key={`pool-${hero.HeroId}`}
                                                        onMouseEnter={() => setHoveredSuggestedHero(hero)}
                                                        onMouseLeave={() => setHoveredSuggestedHero(null)}
                                                        className="flex items-center justify-between bg-purple-800/30 rounded px-2 py-1"
                                                    >
                                                        <img
                                                            src={hero.icon_url}
                                                            alt={hero.name}
                                                            className="w-16 h-10 object-contain mr-2"
                                                        />
                                                        <span className="flex-1 text-sm font-medium text-white truncate">
                                                            {hero.name}
                                                        </span>
                                                        <span className="text-green-400 text-sm font-mono pl-2">
                                                            {hero.totalScore}
                                                            {hero.synergyBonus > 0 && (
                                                                <span className="ml-2 text-[10px] font-semibold text-purple-300 border border-purple-500 rounded px-1 py-[1px]">
                                                                    +{hero.synergyBonus}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}

                                                <div className="text-[10px] uppercase text-gray-400 px-2 py-1 mt-2 tracking-wide font-semibold">
                                                    Other Strong Picks
                                                </div>
                                            </>
                                        )}
                                        {globalSuggestions.map((hero) => (
                                            <div
                                                key={`global-${hero.HeroId}`}
                                                onMouseEnter={() => setHoveredSuggestedHero(hero)}
                                                onMouseLeave={() => setHoveredSuggestedHero(null)}
                                                className="flex items-center justify-between bg-gray-700 rounded px-2 py-1"
                                            >
                                                <img
                                                    src={hero.icon_url}
                                                    alt={hero.name}
                                                    className="w-16 h-10 object-contain mr-2"
                                                />
                                                <span className="flex-1 text-sm font-medium text-white truncate">
                                                    {hero.name}
                                                </span>
                                                <span className="text-green-400 text-sm font-mono pl-2">
                                                    {hero.totalScore}
                                                    {hero.synergyBonus > 0 && (
                                                        <span className="ml-2 text-[10px] font-semibold text-purple-300 border border-purple-500 rounded px-1 py-[1px]">
                                                            +{hero.synergyBonus}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
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
            {/* === User Guide Box === */}
            {showGuide && (
                <div className="relative bg-gray-700 text-white text-sm rounded-lg p-3 mt-2 shadow-lg guide-flash">
                    <button
                        onClick={() => setShowGuide(false)}
                        className="absolute top-1 right-2 text-gray-300 hover:text-white text-lg font-bold"
                    >
                        ×
                    </button>
                    <p className="text-gray-300">
                        <strong>Guide:</strong><br />
                        Welcome to the ultimate Dota 2 drafting tool. Hero suggestions will show up as you pick. Select heroes either by clicking or dragging them,
                        ban them with right-click, and get real-time synergy data to heroes still remaining in the pool. Full draft analysis appears once both teams are filled.
                        Hero matchup data will be updated using STRATZ API once a week to maintain the integrity of the app. <br /><br />
                        Typing at any time starts a search function that is very familiar to people from Dota 2. Use the hero pool toggle button below to set your personalized
                        hero pool and the tool will still suggest globally great hero choices but also three best choices from your hero pool. Clicking on the info button near
                        the title of your own hero pool suggestions shows your entire hero pool broken down into synergy scores. Hovering over hero suggestions shows more details
                        as to where the number comes from, including any draft trait bonuses (Disabler / Pusher / Initiator) added when your draft is missing key tools early.
                        Trait bonuses are only guidance for recommendations and are NOT included in the final full draft analysis once both teams are filled. <br /><br />
                        If you encounter any bugs or problems, you can file a bug report using the button at the bottom of the screen. Do not abuse this functionality, as the
                        button loses its purpose and I will stop receiving and reading the bug reports. Good luck in your games! <br />
                        <i>- Phantom (the developer)</i>
                    </p>
                </div>
            )}
            {/* === Suggestion Filters: Pool & Role === */}
            <div className="flex flex-wrap justify-between mt-4 border-t border-gray-700 pt-2">
                <p className="text-gray-300 text-sm mb-1">Suggestion filters:</p>
                <div className="relative group">
                    <button
                        onClick={() => setFilterByHeroPool(prev => !prev)}
                        disabled={heroPool.length < 3}
                        className={`px-2 py-1 rounded text-xs font-bold transition duration-300 ${filterByHeroPool ? "bg-purple-700 text-white" : "bg-gray-700 text-gray-300"}
                            ${heroPool.length < 3 ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-600"}`}
                    >
                        {filterByHeroPool ? "Hero Pool: ON" : "Hero Pool: OFF"}
                    </button>
                    {heroPool.length < 3 && (
                        <div
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-gray-500 text-white text-[11px] px-3 py-2 rounded shadow-lg opacity-0 
                                group-hover:opacity-100 transition-opacity duration-300 z-50">
                            You need at least 3 heroes in your hero pool to activate this feature.
                        </div>
                    )}
                </div>
                <div className="flex mb-3 space-x-2">
                    <button
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
                        className={`px-3 py-1 rounded text-sm font-semibold transition-colors duration-150 ${roleFilter === "Carry"
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-300"
                            }`}
                    >
                        Carry
                    </button>

                    <button
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
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors duration-150 ${roleFilter === "Support"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-600 text-gray-300"
                            }`}
                    >
                        Support
                    </button>
                </div>
            </div>
            {/* === App Footer Info === */}
            <div className="text-white text-xs border-t border-gray-700 pt-2">
                <p>Patch: {patch ?? "unknown"}</p>
                <p>Last updated: {lastUpdated ?? "unknown"}</p>
            </div>
        </div>
    );
}

export default Sidebar;