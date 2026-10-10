import { TeamDropZone } from "./structures";
import { OverviewIcon, InspectionIcon, GridLayoutIcon, RowLayoutIcon } from "./DraftIcons";

function DraftPanel({
    selectedHeroes,
    selectedTeam,
    handleTeamSwitch,
    canSwitchTeam,
    teamSwitchKey,
    openDraftOverview,
    draftOverviewKey,
    showHeroInspector,
    toggleHeroInspector,
    heroInspectorKey,
    inspectorButtonRef,
    handleDrop,
    handleHeroDeselect,
    enemyRolePredictions,
    showToolTip,
    setShowGuide,
    infoButtonIcon,
    buttonPulse,
    setButtonPulse,
    editHeroPoolMode,
    onTogglePoolEdit,
    handleClear,
    handleClearBans,
    bannedHeroes,
    handleBanRemove,
    gridMode,
    setGridMode,
}) {
    const ActionButtons = () => {
        const buttonSize = "w-[71px] h-[60px] text-xs";

        return (
            <div className="flex items-center gap-ui-sm">
                <button
                    type="button"
                    onClick={onTogglePoolEdit}
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
                {/* Left: title + view controls */}
                <div className="relative flex items-center gap-ui-xs">
                    <h1 className="mr-ui-sm shrink-0 whitespace-nowrap text-center
                            font-display text-2xl font-bold leading-none tracking-widest text-ink 2xl:leading-8">
                        D2<span className="block 2xl:inline"> DT</span>
                    </h1>

                    <button
                        type="button"
                        onClick={() => {
                            setShowGuide((prev) => !prev);
                            setButtonPulse(true);
                            setTimeout(() => setButtonPulse(false), 500);
                        }}
                        aria-label="Toggle drafting guide"
                        title="Drafting guide"
                        className={`ui-button h-9 w-9 shrink-0 p-0 ${buttonPulse ? "animate-pulse" : ""}`}
                    >
                        <img
                            src={infoButtonIcon}
                            alt=""
                            className="h-5 w-5 invert"
                        />
                    </button>

                    <button
                        type="button"
                        onClick={openDraftOverview}
                        aria-label="Open draft overview"
                        aria-haspopup="dialog"
                        aria-controls="draft-overview-dialog"
                        aria-keyshortcuts={draftOverviewKey}
                        title={`Draft overview (${draftOverviewKey})`}
                        className="ui-button h-9 w-9 shrink-0 p-0"
                    >
                        <OverviewIcon />
                    </button>
                    <button
                        ref={inspectorButtonRef}
                        type="button"
                        onClick={toggleHeroInspector}
                        aria-label="Hero inspector"
                        aria-pressed={showHeroInspector}
                        aria-haspopup="dialog"
                        aria-controls="hero-inspector"
                        aria-keyshortcuts={heroInspectorKey}
                        title={`${showHeroInspector ? "Close" : "Open"} hero inspector (${heroInspectorKey})`}
                        className="ui-button ui-button-accent h-9 w-9 shrink-0 p-0"
                    >
                        <InspectionIcon />
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
                        className={`inline-grid place-items-center whitespace-nowrap px-ui-sm py-ui-xs font-serif rounded-full text-white text-sm font-semibold text-center leading-tight 2xl:leading-5 transition
                            ${selectedTeam === "ally"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                            }
                            ${!canSwitchTeam
                                ? "bg-gray-500 cursor-not-allowed opacity-50"
                                : ""
                            }`}
                    >
                        {/* Match the responsive wrapping in both labels to keep
                        the button's size stable when switching teams. */}
                        <span
                            aria-hidden="true"
                            className="invisible col-start-1 row-start-1"
                        >
                            <span className="block 2xl:inline">Picking for:</span>{" "}
                            <span className="block 2xl:inline">Enemy Team</span>
                        </span>

                        <span className="col-start-1 row-start-1">
                            <span className="block 2xl:inline">Picking for:</span>{" "}
                            <span className="block 2xl:inline">
                                {selectedTeam === "ally" ? "Ally Team" : "Enemy Team"}
                            </span>
                        </span>
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
                {/* Left: one layout switch spans both rows */}
                <div className="row-span-2 self-center justify-self-start">
                    <button
                        type="button"
                        role="switch"
                        aria-label="Four-column hero layout"
                        aria-checked={gridMode === "row"}
                        onClick={() => setGridMode((prev) =>
                            prev === "default" ? "row" : "default"
                        )}
                        title={gridMode === "row"
                            ? "Four-column layout — switch to 2 × 2"
                            : "2 × 2 layout — switch to four columns"
                        }
                        className="relative h-11 w-24 shrink-0 cursor-pointer rounded-full border border-line bg-surface-raised p-ui-xs transition-colors duration-150 hover:border-accent/50 motion-reduce:transition-none"
                    >
                        <span
                            aria-hidden="true"
                            className="relative grid h-full grid-cols-2"
                        >
                            {/* Half-width travel keeps the highlight aligned with either icon. */}
                            <span
                                className={`absolute inset-y-0 left-0 w-1/2 rounded-full border border-accent/50 bg-accent/20 transition-transform duration-200 motion-reduce:transition-none ${gridMode === "row"
                                    ? "translate-x-full"
                                    : "translate-x-0"
                                    }`}
                            />

                            <span
                                className={`relative z-10 flex items-center justify-center ${gridMode === "default"
                                    ? "text-accent"
                                    : "text-ink-muted"
                                    }`}
                            >
                                <GridLayoutIcon />
                            </span>

                            <span
                                className={`relative z-10 flex items-center justify-center ${gridMode === "row"
                                    ? "text-accent"
                                    : "text-ink-muted"
                                    }`}
                            >
                                <RowLayoutIcon />
                            </span>
                        </span>
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
