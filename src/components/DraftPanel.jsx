import { TeamDropZone } from "./structures";

function DraftPanel({
    selectedHeroes,
    selectedTeam,
    handleTeamSwitch,
    canSwitchTeam,
    teamSwitchKey,
    handleDrop,
    handleHeroDeselect,
    enemyRolePredictions,
    showToolTip,
    setShowGuide,
    infoButtonIcon,
    buttonPulse,
    setButtonPulse,
    editHeroPoolMode,
    setEditHeroPoolMode,
    handleClear,
    handleClearBans,
    bannedHeroes,
    handleBanRemove,
    gridMode,
    setGridMode,
    layoutDefaultIcon,
    layoutRowIcon,
}) {
    const ActionButtons = () => {
        const buttonSize = "w-[71px] h-[60px] text-xs";

        return (
            <div className="flex items-center gap-ui-sm">
                <button
                    type="button"
                    onClick={() => setEditHeroPoolMode((prev) => !prev)}
                    aria-pressed={editHeroPoolMode}
                    className={`ui-button ui-button-accent px-ui-xs ${buttonSize}`}
                >
                    {editHeroPoolMode ? "EDITING" : "EDIT POOL"}
                </button>

                <button
                    type="button"
                    onClick={handleClearBans}
                    className={`ui-button px-ui-xs ${buttonSize}`}
                >
                    CLEAR BANS
                </button>

                <button
                    type="button"
                    onClick={handleClear}
                    className={`ui-button ui-button-danger px-ui-xs ${buttonSize}`}
                >
                    CLEAR ALL
                </button>
            </div>
        );
    };

    return (
        <div className="ui-panel shrink-0 mb-ui-sm px-ui-lg py-ui-sm">
            {/* ===================== ROW 1 ===================== */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-ui-sm 2xl:gap-ui-lg">
                {/* Left: Title + Guide */}
                <div className="relative flex items-center">
                    <h1 className="font-display whitespace-nowrap text-2xl font-bold tracking-widest text-ink mr-ui-sm">
                        D2 DT
                    </h1>

                    <button
                        onClick={() => {
                            setShowGuide((prev) => !prev);
                            setButtonPulse(true);
                            setTimeout(() => setButtonPulse(false), 500);
                        }}
                        className={`w-[30px] h-[30px] bg-white bg-opacity-0 text-black font-bold rounded transition-transform duration-200 ${buttonPulse ? "animate-pulse" : ""
                            }`}
                        title="Info"
                    >
                        <img src={infoButtonIcon} alt="Info" className="filter invert" />
                    </button>
                </div>

                {/* Center: dropzones + toggle */}
                <div
                    className="grid w-full min-w-0 max-w-[88rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-ui-sm justify-self-center 2xl:gap-ui-lg"
                >
                    <TeamDropZone
                        team="ally"
                        selectedHeroes={selectedHeroes}
                        handleDrop={handleDrop}
                        handleHeroDeselect={handleHeroDeselect}
                    />

                    <button
                        onClick={handleTeamSwitch}
                        disabled={!canSwitchTeam}
                        title={`Switch pick team (${teamSwitchKey})`}
                        aria-keyshortcuts={teamSwitchKey}
                        className={`whitespace-nowrap px-ui-sm py-ui-xs font-serif rounded-full text-white text-sm font-semibold transition
                            ${selectedTeam === "ally"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                            }
                            ${!canSwitchTeam
                                ? "bg-gray-500 cursor-not-allowed opacity-50"
                                : ""
                            }`}
                    >
                        Picking for: {selectedTeam === "ally" ? "Ally Team" : "Enemy Team"}
                    </button>

                    <TeamDropZone
                        team="enemy"
                        selectedHeroes={selectedHeroes}
                        handleDrop={handleDrop}
                        handleHeroDeselect={handleHeroDeselect}
                        rolePredictions={enemyRolePredictions}
                    />
                </div>

                {/* Wide windows: actions share the team row. */}
                <div className="hidden justify-self-end 2xl:block">
                    <ActionButtons />
                </div>
            </div>
            {/* ===================== BANS BLOCK (thin header row + slots row) ===================== */}
            <div className="mt-ui-sm grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[18px_auto] gap-x-ui-sm">
                {/* Left: grid toggle spans both rows */}
                <div className="row-span-2 self-center justify-self-start">
                    <button
                        onClick={() => setGridMode((prev) => (prev === "default" ? "row" : "default"))}
                        className="relative w-28 h-12 bg-gray-900 rounded-lg transition-colors duration-300 ease-in-out flex items-center justify-between"
                        title="Toggle Grid Layout"
                    >
                        <div
                            className={`absolute w-12 h-12 bg-gray-600 rounded-lg shadow-md transform transition-transform duration-300 ease-in-out z-10 ${gridMode === "row" ? "translate-x-16" : "translate-x-0"
                                }`}
                        />
                        <div className="flex justify-between items-center w-full z-20">
                            <img
                                src={layoutDefaultIcon}
                                alt="Grid Layout"
                                className="w-12 h-12"
                            />
                            <img src={layoutRowIcon} alt="Row Layout" className="w-12 h-12" />
                        </div>
                    </button>
                </div>

                {/* Top middle: THIN "Bans:" row */}
                <div className="col-start-2 row-start-1 flex items-center justify-center justify-self-center">
                    <span className="text-xs font-semibold text-white leading-none">Bans:</span>
                </div>

                {/* Below 1536px, actions move beside the two rows of bans. */}
                <div className="col-start-3 row-span-2 self-center justify-self-end 2xl:hidden">
                    <ActionButtons />
                </div>

                {/* Bottom middle: ban slots */}
                <div className="col-start-2 row-start-2 mt-ui-xs grid w-full min-w-0 max-w-[34rem] grid-cols-8 gap-ui-xs justify-self-center 2xl:max-w-[68rem] 2xl:grid-cols-[repeat(16,minmax(0,1fr))]">
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            className="min-w-0 aspect-video bg-surface-raised border border-line rounded-control flex items-center justify-center overflow-hidden"
                        >
                            {bannedHeroes[i] && (
                                <div
                                    className="relative group w-full h-full cursor-pointer"
                                    onClick={() => handleBanRemove(bannedHeroes[i])}
                                >
                                    <img
                                        src={bannedHeroes[i].icon_url}
                                        alt={bannedHeroes[i].name}
                                        className="object-cover w-full h-full filter grayscale"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                        <span className="text-red-400 font-bold text-[10px]">REMOVE</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default DraftPanel;
