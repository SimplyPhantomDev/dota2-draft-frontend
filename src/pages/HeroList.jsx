import { useEffect, useState, useRef, useCallback } from "react";
import { groupAndSortHeroes } from "../utils/groupHeroes";
import { DraggableHero, TeamDropZone } from "../utils/structures";
import { calculateSynergyPicks, getWinProbability } from "../utils/synergy";
import infoButtonIcon from '../assets/info_button.png';
import layoutDefaultIcon from '../assets/layout_default.svg';
import layoutRowIcon from '../assets/layout_row.svg';
import '../App.css';
import { motion, AnimatePresence } from "framer-motion"


export default function HeroList() {

  const [selectedHeroes, setSelectedHeroes] = useState({
    ally: [],
    enemy: []
  });

  const [suggestedHeroes, setSuggestedHeroes] = useState([]);

  const [matchupData, setMatchupData] = useState({});

  const [selectedTeam, setSelectedTeam] = useState("ally");
  
  const [bannedHeroes, setBannedHeroes] = useState([]);

  const [clickLockedHeroes, setClickLockedHeroes] = useState(new Set());

  const [heroes, setHeroes] = useState({});
  
  const[roleFilter, setRoleFilter] = useState(null);

  const [fullDraftStats, setFullDraftStats] = useState(null);

  const [gridMode, setGridMode] = useState("default");

  const [showGuide, setShowGuide] = useState(false);

  const [buttonPulse, setButtonPulse] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [showToolTip, setShowToolTip] = useState(true);

  const [hoveredHero, setHoveredHero] = useState(null);

  const [hoveredHeroPosition, setHoveredHeroPosition] = useState({ x: 0, y: 0 });

  const [showWinrateInfo, setShowWinrateInfo] = useState(false);

  const searchInputRef = useRef(null);

  const searchTimeoutRef = useRef(null);

  const hasPicks = selectedHeroes.ally.length > 0 || selectedHeroes.enemy.length > 0;

  const updateSynergySuggestions = useCallback((
  ally = selectedHeroes.ally,
  enemy = selectedHeroes.enemy,
  bans = bannedHeroes,
  role = roleFilter
) => {
  if (!ally.length && !enemy.length) {
    setSuggestedHeroes([]);
    setFullDraftStats(null);
    return;
  }

  const result = calculateSynergyPicks({
    allyHeroIds: ally.map(h => h.HeroId),
    enemyHeroIds: enemy.map(h => h.HeroId),
    bannedHeroIds: bans.map(h => h.HeroId),
    roleFilter: ally.length === 5 && enemy.length === 5 ? null : role,
    fullDraft: ally.length === 5 && enemy.length === 5,
    matchupData,
    heroes
  });

  if (result?.mode === "fullDraft") {
    setFullDraftStats(result.teams);
    setSuggestedHeroes([]);
  } else {
    setSuggestedHeroes(result);
    setFullDraftStats(null);
  }
  }, [selectedHeroes.ally, selectedHeroes.enemy, bannedHeroes, roleFilter, matchupData, heroes]);

  const lockHero = (heroId) => {
    setClickLockedHeroes(prev => {
    const updated = new Set(prev);
    updated.add(heroId);
    return updated;
  });
  };

  const unlockHero = (heroId) => {
    setClickLockedHeroes((prev) => {
      const updated = new Set(prev);
      updated.delete(heroId);
      return updated;
    });
  };

  const handleClearBans = () => {
      setBannedHeroes([]);
      updateSynergySuggestions(selectedHeroes.ally, selectedHeroes.enemy, []);
  };

  const handleHeroClick = (hero) => {
  if (clickLockedHeroes.has(hero.HeroId)) return;

  const team = selectedTeam;

  // Prevent over-picking
  if (selectedHeroes[team].length >= 5) return;

  // Prevent duplicate pick (just in case)
  if (selectedHeroes[team].some(h => h.HeroId === hero.HeroId)) return;

  lockHero(hero.HeroId);

  const updatedSelected = {
    ...selectedHeroes,
    [team]: [...selectedHeroes[team], hero],
  };

  setSelectedHeroes(updatedSelected);

  unlockHero(hero.HeroId);
  };


  const handleDrop = (hero, team) => {
    if (clickLockedHeroes.has(hero.HeroId)) return;

    setSelectedHeroes(prev => {
      if (prev[team].some(h => h.HeroId === hero.HeroId)) return prev;
      if (prev[team].length >= 5) return prev;

      lockHero(hero.HeroId);

      const updated = {
        ...prev,
        [team]: [...prev[team], hero]
      };

      unlockHero(hero.HeroId);

      return updated;
    });
  };

  const handleHeroDeselect = (hero, team) => {

    const newSelected = {
      ...selectedHeroes,
      [team]: selectedHeroes[team].filter(h => h.HeroId !== hero.HeroId),
    };

    setSelectedHeroes(newSelected);

    updateSynergySuggestions(newSelected.ally, newSelected.enemy, bannedHeroes);
  };

  const handleClear = () => {
    setSelectedHeroes({ ally: [], enemy: [] });
    setSuggestedHeroes([]);
    setBannedHeroes([]);
    setClickLockedHeroes(new Set());
  };

  const handleBanRemove = (hero) => {
    const updatedBans = bannedHeroes.filter(h => h.HeroId !== hero.HeroId);
    setBannedHeroes(updatedBans);
  };

  const handleHeroBan = (hero) => {
    if (bannedHeroes.length >= 16) return;
    if (clickLockedHeroes.has(hero.HeroId)) return;

    lockHero(hero.HeroId);

    const updatedBans = [...bannedHeroes, hero];

    setBannedHeroes(updatedBans)

    unlockHero(hero.HeroId);
  };

  const isHeroMatch = (hero) => {
    if(!searchQuery.trim()) return true;
    return hero.name.toLowerCase().includes(searchQuery.toLowerCase());
  };

  useEffect(() => {
    fetch("/heroes.json")
    .then((res) => res.json())
    .then((data) => {
      const grouped = groupAndSortHeroes(data);
      setHeroes(grouped);
    })
    .catch((err) => console.error("Failed to load static hero data:", err));
  }, []);

  useEffect(() => {
    fetch("/synergyMatrix.json")
      .then((res) => res.json())
      .then((data) => {
        setMatchupData(data);
      })
      .catch((err) => console.error("Failed to load synergy data", err));
  }, []);

  useEffect(() => {
  if (selectedHeroes.ally.length > 0 || selectedHeroes.enemy.length > 0) {
    updateSynergySuggestions();
  } else {
    // Clear suggestions if all heroes are removed
    setSuggestedHeroes([]);
  }
  }, [selectedHeroes, bannedHeroes]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // Don't start timeout if search is empty
    if (!searchQuery) return;

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Start new timeout
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery("");
    }, 3000); // 3 seconds, search timeout

    // Clear timeout on unmount
    return () => {
      clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
  const timeout = setTimeout(() => setShowToolTip(false), 5000); // Timeout for tooltip to disappear
  return () => clearTimeout(timeout);
  }, []);

  function renderAttributeColumn(attr) {
    const colorMap = {
    str: { border: "border-transparent", bg: "strength-gradient", text: "text-white", label: "Strength" },
    agi: { border: "border-transparent", bg: "agility-gradient", text: "text-white", label: "Agility" },
    int: { border: "border-transparent", bg: "intelligence-gradient", text: "text-white", label: "Intelligence" },
    all: { border: "border-transparent", bg: "universal-gradient", text: "text-white", label: "Universal" },
    };

    const { border, bg, text, label } = colorMap[attr];

    return (
      <div key={attr} className={`flex-1 border-2 rounded-lg p-4 space-y-2 ${border} ${bg}`}>
        <h2 className={`text-xl font-bold mb-2 ${text}`}>{label}</h2>
        <motion.div
          layout="position"
          className="flex flex-wrap gap-2 transition-all duration-300 ease-in-out">
          {heroes[attr]?.map((hero) => {
            const isPicked =
              selectedHeroes.ally.some(h => h.HeroId === hero.HeroId) ||
              selectedHeroes.enemy.some(h => h.HeroId === hero.HeroId) ||
              bannedHeroes.some(h => h.HeroId === hero.HeroId) ||
              clickLockedHeroes.has(hero.HeroId);

            return (
              <DraggableHero
                key={hero.HeroId}
                hero={hero}
                isPicked={isPicked}
                handleHeroClick={handleHeroClick}
                handleHeroBan={handleHeroBan}
                grayscale={searchQuery ? !isHeroMatch(hero) : false}
                highlight={searchQuery ? isHeroMatch(hero) : false}
              />
            );
          })}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="p-2 bg-black text-white h-screen overflow-hidden flex flex-col">
      {/* Hidden search functionality */}
      <input
        type="text"
        className="opacity-0 absolute"
        autoFocus
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ref={searchInputRef}
      />
      {/* Drafting Panel with Title */}
      <div className="mb-2 bg-gray-800 rounded shadow px-4 py-2 relative flex items-center justify-between">
        <div className="flex items-center flex-shrink-0 z-10">
          <h1 className="font-serif text-2xl font-bold text-white mr-2">Dota 2 Counter Tool</h1>
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
                className="absolute top-full left-60 ml-2 bg-white text-black text-sm px-2 py-1 rounded shadow-lg z-20"
              >
                Click here for a guide on how to use the app.
                <div className="absolute -top-3 left-8 w-3 h-3 bg-white rotate-45 transform origin-bottom-left" />
              </motion.div>
            )}
        </div>
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
              className={`w-[215px] px-4 py-1 font-serif rounded-full text-white text-sm font-semibold transition 
              ${selectedTeam === "ally" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              Picking for: {selectedTeam === "ally" ? "Ally Team" : "Enemy Team"}
            </button>
          </div>
          <TeamDropZone
          team="enemy"
          selectedHeroes={selectedHeroes}
          handleDrop={handleDrop}
          handleHeroDeselect={handleHeroDeselect}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 z-10">
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
        <div className="flex flex-col items-center w-full">
          <div className="relative w-full h-6 mb-1">
            <button
              onClick={() => setGridMode(prev => prev === "default" ? "row" : "default")}
              className="absolute top-1/2 transform -translate-y-1/2 w-28 h-12 mt-6 bg-gray-800 rounded transition-colors duration-300 ease-in-out flex items-center justify-between"
              title="Toggle Grid Layout"
            >

              <div
                  className={`absolute w-12 h-12 bg-gray-600 rounded shadow-md transform transition-transform duration-300 ease-in-out z-10 ${
                    gridMode === "row" ? "translate-x-16" : "translate-x-0"
                  }`}
                />
              {/* Icon 1: Default Layout */}
              <div className="flex justify-between items-center w-full z-20">
                <img
                  src={layoutDefaultIcon}
                  alt="Default Layout"
                  className={`w-12 h-12 transition-opacity duration-300 ease-in-out ${
                    gridMode === "default" ? "opacity-100" : "opacity-100"
                  }`}
                />
                {/* Icon 2: Row Layout */}
                <img
                  src={layoutRowIcon}
                  alt="Row Layout"
                  className={`w-12 h-12 transition-opacity duration-300 ease-in-out ${
                    gridMode === "row" ? "opacity-100" : "opacity-100"
                  }`}
                />
              </div>
            </button>
            <h2 className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-white mb-1">Bans:</h2>
          </div>
          <div className="flex justify-center mb-2 gap-2">

            {/*Render in 16 hero slots for potential bans, the maximum number in normal dota game without duplicate picks */}
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

      <div className="flex flex-1 overflow-hidden">
        {/* Main hero area */}
        <div className="flex flex-col flex-1 pr-3 overflow-y-auto gap-4 relative">
          {searchQuery && (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-0">
            <span className="font-serif text-[100px] font-bold uppercase text-white opacity-50 select-none tracking-widest">
              {searchQuery}
            </span>
          </div>
        )}
          <AnimatePresence mode="wait">
            {gridMode === "default" ? (
              <motion.div
                key="default-layout"
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex gap-4">
                  {["str", "agi"].map((attr) => renderAttributeColumn(attr))}
                </div>
                <div className="flex gap-4 mt-4">
                  {["int", "all"].map((attr) => renderAttributeColumn(attr))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="row-layout"
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex gap-4"
              >
                {["str", "agi", "int", "all"].map((attr) => renderAttributeColumn(attr))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The sidebar */}
        <div className="min-w-[260px] max-w-[350px] flex-[1] bg-gray-800 rounded shadow flex flex-col p-4">
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
                      <div className="border-1 border-gray-500 h-6 mx-1"/>
                      <span className="w-10 text-left">Score</span>
                      <span className="w-10 text-right">Enemy</span>
                    </div>

                    {/* 5 rows for each hero */}
                    {Array.from({ length: 5}).map((_, i) => {
                      const ally = fullDraftStats.ally[i];
                      const enemy = fullDraftStats.enemy[i];
                      return (
                        <div key={i} className="flex items-center justify-between bg-gray-700 rounded px-2 py-1">
                          <img
                            src={ally.icon_url}
                            alt={ally.name}
                            className="w-10 h-10 object-contain"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredHero({ ...ally, team: 'ally' });
                              setHoveredHeroPosition({ x: rect.left, y: rect.bottom });}}
                            onMouseLeave={() => setHoveredHero(null)}
                          />
                          <span
                            className={`text-sm font-mono w-10 text-right ${
                              ally.totalScore > 0 ? 'text-green-400' :
                              ally.totalScore < 0 ? 'text-red-400' :
                              'text-gray-400'
                            }`}
                          >
                            {ally.totalScore > 0 ? '+' : ''}{ally.totalScore}
                          </span>
                          <div className="border-1 border-gray-600 h-6 mx-1" />
                          <span
                            className={`text-sm font-mono w-10 text-left ${
                              enemy.totalScore > 0 ? 'text-red-400' :
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
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredHero({ ...enemy, team: 'enemy' });
                              setHoveredHeroPosition({ x: rect.left, y: rect.bottom });}}
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
                                <img src={infoButtonIcon} alt="WinrateInfo" className="filter invert"/>
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
                        className="absolute bg-gray-900 border border-gray-600 rounded p-4 text-sm shadow-lg z-30 w-[300px] max-h-[400px] overflow-y-auto"
                        style={{
                          top: `${hoveredHeroPosition.y}px`,
                          left: `${hoveredHeroPosition.x}px`,
                          transform: 'translate(-100%, 0)' // align top-right of box to the hovered icon
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
                              const heroMatchup = matchupData?.[String(hoveredHero.HeroId)];

                              const sameTeam = (
                                (hoveredHero.team === 'ally' && selectedHeroes.ally.some(h => h.HeroId === other.HeroId)) ||
                                (hoveredHero.team === 'enemy' && selectedHeroes.enemy.some(h => h.HeroId === other.HeroId))
                              );

                              const relation = sameTeam
                                ? heroMatchup?.with?.find(entry => entry.heroId2 === other.HeroId)
                                : heroMatchup?.vs?.find(entry => entry.heroId2 === other.HeroId);

                              const score = typeof relation?.synergy === 'number' ? relation.synergy : 0;
                              
                              return (
                                <li key={other.HeroId} className="flex justify-between">
                                  <span>{other.name}</span>
                                  <span
                                    className={`font-mono ${
                                      score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-gray-400'
                                    }`}
                                  >
                                    {score > 0 ? '+' : ''}{score.toFixed(1)}
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
                    {suggestedHeroes.map((hero) => (
                      <div
                        key={hero.HeroId}
                        className="flex items-center justify-between bg-gray-700 rounded px-2 py-1"
                      >
                        <img
                          src={hero.icon_url}
                          alt={hero.name}
                          className="w-10 h-10 object-contain mr-2"
                        />
                        <span className="flex-1 text-sm font-medium text-white truncate">
                          {hero.name}
                        </span>
                        <span className="text-green-400 text-sm font-mono pl-2">
                          {hero.totalScore}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
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
                Hero matchup data will be updated using STRATZ API once a week to maintain the integrity of the app. <br /><br/>
                Typing at any time starts a search function that will reset in 3 seconds of inactivity, a familiar function from the Dota 2 game client. Normal typing rules of course apply. Aliases will be supported later down the line.
              </p>
            </div>
          )}
          <div className="mt-4 border-t border-gray-700 pt-2">
            <p className="text-gray-300 text-sm mb-1">Suggestion filters:</p>
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
                className={`px-3 py-1 rounded text-sm font-semobold transition-colors duration-150 ${
                  roleFilter === "Carry"
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
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors duration-150 ${
                  roleFilter === "Support"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300"
                }`}
              >
                Support
              </button>
            </div>
          </div>
          <div className="text-white text-xs border-t border-gray-700 pt-2">
            <p>Patch: 7.39c</p>
            <p>Last updated: July 11</p>
          </div>
        </div>
      </div>
    </div>
  );
}