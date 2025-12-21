import { TeamDropZone } from "./structures";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

function DraftPanel({
    selectedHeroes,
    selectedTeam,
    setSelectedTeam,
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
    const panelRef = useRef(null);
    const leftRef = useRef(null);
    const centerRef = useRef(null);
    const actionsMeasureRef = useRef(null);

    // when true -> action buttons move down to the "Bans row"
    const [dockActionsBelow, setDockActionsBelow] = useState(false);

    const ActionButtons = ({ size = "large" }) => {
        const btnClass =
            size === "large"
                ? "w-[71px] h-[60px] text-m"
                : "w-[71px] h-[60px] text-m";

        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setEditHeroPoolMode((prev) => !prev)}
                    className={`${btnClass} px-1 font-bold rounded transition-colors duration-150 ${editHeroPoolMode
                            ? "bg-purple-600 text-white animate-pulse"
                            : "bg-purple-300 text-black hover:bg-gray-300"
                        }`}
                >
                    {editHeroPoolMode ? "EDITING" : "EDIT POOL"}
                </button>

                <button
                    onClick={handleClearBans}
                    className={`${btnClass} bg-gray-200 hover:bg-gray-300 text-black font-bold rounded`}
                >
                    CLEAR BANS
                </button>

                <button
                    onClick={handleClear}
                    className={`${btnClass} bg-red-400 hover:bg-gray-300 text-black font-bold rounded`}
                >
                    CLEAR ALL
                </button>
            </div>
        );
    };

    const recomputeDocking = useCallback(() => {
        const panelEl = panelRef.current;
        const leftEl = leftRef.current;
        const centerEl = centerRef.current;
        const measureEl = actionsMeasureRef.current;
        if (!panelEl || !leftEl || !centerEl || !measureEl) return;

        const panelW = panelEl.getBoundingClientRect().width;
        const leftW = leftEl.getBoundingClientRect().width;

        // use scrollWidth to avoid getting lied to by shrinking layouts
        const centerW = Math.max(
            centerEl.getBoundingClientRect().width,
            centerEl.scrollWidth
        );

        const actionsW = measureEl.getBoundingClientRect().width;

        // Tailwind px-4 = 16px left + 16px right
        const horizontalPadding = 32;

        // grid gap-4 ~= 16px between columns (left | center | right)
        const gaps = 32;

        // small safety buffer so it docks a bit BEFORE it looks cramped
        const safety = 16;

        const needed = leftW + centerW + actionsW + horizontalPadding + gaps + safety;

        setDockActionsBelow(needed > panelW);
    }, []);

    useLayoutEffect(() => {
        recomputeDocking();

        const ro = new ResizeObserver(() => recomputeDocking());
        if (panelRef.current) ro.observe(panelRef.current);
        if (leftRef.current) ro.observe(leftRef.current);
        if (centerRef.current) ro.observe(centerRef.current);

        window.addEventListener("resize", recomputeDocking);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recomputeDocking);
        };
    }, [recomputeDocking]);

    return (
        <div
            ref={panelRef}
            className="mb-2 bg-gray-800 rounded shadow px-4 py-2"
        >
            {/* hidden measurement node so we get actions width reliably */}
            <div
                ref={actionsMeasureRef}
                className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none"
            >
                <ActionButtons size="large" />
            </div>

            {/* ===================== ROW 1 ===================== */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* Left: Title + Guide */}
                <div ref={leftRef} className="relative flex items-center flex-shrink-0">
                    <h1 className="font-serif text-2xl font-bold tracking-widest text-white mr-2">
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
                    ref={centerRef}
                    className="justify-self-center flex items-center gap-6"
                >
                    <TeamDropZone
                        team="ally"
                        selectedHeroes={selectedHeroes}
                        handleDrop={handleDrop}
                        handleHeroDeselect={handleHeroDeselect}
                    />

                    <button
                        onClick={() => setSelectedTeam((prev) => (prev === "ally" ? "enemy" : "ally"))}
                        disabled={selectedHeroes.ally.length === 5 || selectedHeroes.enemy.length === 5}
                        className={`w-[215px] px-4 py-1 font-serif rounded-full text-white text-sm font-semibold transition 
              ${selectedTeam === "ally"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                            }
              ${selectedHeroes.ally.length === 5 || selectedHeroes.enemy.length === 5
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

                {/* Right: actions if not docked */}
                <div className="justify-self-end">
                    {!dockActionsBelow && <ActionButtons size="large" />}
                </div>
            </div>
            {/* ===================== BANS BLOCK (thin header row + slots row) ===================== */}
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] grid-rows-[18px,auto] gap-x-4">
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
                            <img src={layoutDefaultIcon} alt="Default Layout" className="w-12 h-12" />
                            <img src={layoutRowIcon} alt="Row Layout" className="w-12 h-12" />
                        </div>
                    </button>
                </div>

                {/* Top middle: THIN "Bans:" row */}
                <div className="col-start-2 row-start-1 flex items-center justify-center justify-self-center">
                    <span className="text-xs font-semibold text-white leading-none">Bans:</span>
                </div>

                {/* Right: docked action buttons span both rows (ONLY when needed) */}
                <div className="col-start-3 row-span-2 self-center justify-self-end">
                    {dockActionsBelow && <ActionButtons size="large" />}
                </div>

                {/* Bottom middle: ban slots */}
                <div className="col-start-2 row-start-2 flex justify-center gap-2 mt-1 justify-self-center">
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            className="w-[71px] h-[40px] bg-gray-900 border border-gray-700 rounded flex items-center justify-center overflow-hidden"
                        >
                            {bannedHeroes[i] && (
                                <div
                                    className="relative group w-full h-full cursor-pointer"
                                    onClick={() => handleBanRemove(bannedHeroes[i])}
                                >
                                    <img
                                        src={bannedHeroes[i].icon_url}
                                        alt={bannedHeroes[i].name}
                                        className="object-contain w-full h-full filter grayscale"
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
