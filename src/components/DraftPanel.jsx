import React from "react";
import { motion } from "framer-motion";
import { TeamDropZone } from "./structures";

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
  setShowToolTip,
  buttonPulse,
  setButtonPulse,
  editHeroPoolMode,
  setEditHeroPoolMode,
  handleClear,
  handleClearBans
}) {
    return (
        <div className="mb-2 bg-gray-800 rounded shadow px-4 py-2 relative flex items-center justify-between">
            {/* App Title & Guide Button */}
            <div className="flex items-center flex-shrink-0 z-10">
                <h1 className="font-serif text-2xl font-bold tracking-widest text-white mr-2">D2 DT</h1>
                <button
                    onClick={() => {setShowGuide(prev => !prev);
                        setButtonPulse(true);
                        setTimeout(() => setButtonPulse(false), 500);
                    }}
                    className={`w-[30px] h-[30px] bg-white bg-opacity-0 text-black font-bold rounded transition-transform duration-200 ${
                        buttonPulse ? 'animate-pulse' : ''
                    }`}
                    title="Info"
                >
                    <img src={infoButtonIcon} alt="Info" className="filter invert"/>
                </button>
                {showToolTip && (
                    <motion.div
                        initial={{ opacity:0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-full left-20 ml-2 bg-white text-black text-sm px-2 py-1 rounded shadow-lg z-20"
                    >
                        Click here for a guide on how to use the app.
                        <div className="absolute -top-3 left-8 w-3 h-3 bg-white rotate-45 transform origin-bottom-left" />
                    </motion.div>
                )}
            </div>
            {/* Team DropZones + Pick Toggle */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 z-0">
                <TeamDropZone
                    team="ally"
                    selectedHeroes={selectedHeroes}
                    handleDrop={handleDrop}
                    handleHeroDeselect={handleHeroDeselect}
                />
                <div className="flex justify-center">
                    <button
                        onClick={() => setSelectedTeam(prev => prev === "ally" ? "enemy" : "ally")}
                        disabled={selectedHeroes.ally.length === 5 || selectedHeroes.enemy.length === 5}
                        className={`w-[215px] px-4 py-1 font-serif rounded-full text-white text-sm font-semibold transition 
                            ${selectedTeam === "ally" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                            ${selectedHeroes.ally.length === 5 || selectedHeroes.enemy.length === 5
                                ? "bg-gray-500 cursor-not-allowed opacity-50"
                                : ""
                        }`}
                    >
                        Picking for: {selectedTeam === "ally" ? "Ally Team" : "Enemy Team"}
                    </button>
                </div>
                <TeamDropZone
                    team="enemy"
                    selectedHeroes={selectedHeroes}
                    handleDrop={handleDrop}
                    handleHeroDeselect={handleHeroDeselect}
                    rolePredictions={enemyRolePredictions}
                />
            </div>
            {/* Pool Edit, Clear Bans, Clear All buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 z-10">
                <button
                    onClick={() => setEditHeroPoolMode(prev => !prev)}
                    className={`w-[71px] h-[60px] px-1 font-bold rounded transition-colors duration-150 ${
                        editHeroPoolMode
                            ? "bg-purple-600 text-white animate-pulse"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                    }`}
                >
                    {editHeroPoolMode ? "Editing Pool" : "Edit Pool"}
                </button>
                <button
                    onClick={handleClearBans}
                    className="w-[71px] h-[60px] bg-gray-200 hover:bg-gray-300 text-black font-bold rounded"
                >
                    Clear Bans
                </button>
                <button
                    onClick={handleClear}
                    className="w-[71px] h-[60px] bg-gray-200 hover:bg-gray-300 text-black font-bold rounded"
                >
                    Clear All
                </button>
            </div>
        </div>
    );
}

export default DraftPanel;