import { useEffect, useState, useRef, useCallback } from "react";
import { groupAndSortHeroes } from "../utils/groupHeroes";
import { DraggableHero, TeamDropZone } from "../utils/structures";
import { calculateSynergyPicks, calculatePoolSynergies, getCounterVs, getSynergyWith, getWinProbability } from "../utils/synergy";
import { predictEnemyRoles } from "../utils/predictRoles";
import infoButtonIcon from '../assets/info_button.png';
import layoutDefaultIcon from '../assets/layout_default.svg';
import layoutRowIcon from '../assets/layout_row.svg';
import '../App.css';
import { motion, AnimatePresence } from "framer-motion"


export default function HeroList() {


  //==============================================
  //============= Drafting State =================
  //==============================================

  // Selected heroes for both teams
  const [selectedHeroes, setSelectedHeroes] = useState({
    ally: [],
    enemy: []
  });

  // Heroes that have been banned from the draft
  const [bannedHeroes, setBannedHeroes] = useState([]);

  // Static matchup data (synergy/counter values between heroes)
  const [matchupData, setMatchupData] = useState({});

  // The team currently being drafted
  const [selectedTeam, setSelectedTeam] = useState("ally");

  // Heroes that are temporarily click-locked (Emergency fallback for quick inputs)
  const [clickLockedHeroes, setClickLockedHeroes] = useState(new Set());

  // All hero data grouped by attribute (STR, AGI, INT, UNI)
  const [heroes, setHeroes] = useState({});

  // Suggestions calculated based on current draft and filters
  const [suggestedHeroes, setSuggestedHeroes] = useState([]);

  // Full synergy breakdown shown when both teams have their teams' full
  const [fullDraftStats, setFullDraftStats] = useState(null);
  
  // Filtering suggestions by selected role (e.g., "carry", "support")
  const[roleFilter, setRoleFilter] = useState(null);

  // Static hero role data (hero-specific position data)
  const [heroRoleMap, setHeroRoleMap] = useState(null);

  // Predicitons of the enemy team hero positions based on picks
  const [enemyRolePredictions, setEnemyRolePredictions] = useState({});

  //==============================================
  //================ UI State ====================
  //==============================================

  // Layout mode: "default" = 2x2, "row" = 4x1
  const [gridMode, setGridMode] = useState("default");

  // Whether to show the tool's short tutorial
  const [showGuide, setShowGuide] = useState(false);

  // Whether to show the breakdown of the user's entire hero pool's synergies
  const [showPoolBreakdown, setShowPoolBreakdown] = useState(false);

  // Button pulse effect (used for visual alerts)
  const [buttonPulse, setButtonPulse] = useState(false);

  // Tooltip visibility toggle for info box to help users begin using the tool
  const [showToolTip, setShowToolTip] = useState(true);

  // Currently hovered hero (for synergy breakdown display)
  const [hoveredHero, setHoveredHero] = useState(null);

  // Tracking logic for user's mouse position
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Show/hide specific information about how winrate prediction is calculated
  const [showWinrateInfo, setShowWinrateInfo] = useState(false);

  // Hero search bar input value
  const [searchQuery, setSearchQuery] = useState("");

  // Container position (used for centering search word)
  const [containerRect, setContainerRect] = useState(null);

  // Currently hovered hero from the draft suggestions (for suggested picks panel)
  const [hoveredSuggestedHero, setHoveredSuggestedHero] = useState(null);

  //==============================================
  //============ Hero Pool System ================
  //==============================================

  // User specific hero pool (stored in localStorage and editable by user)
  const [heroPool, setHeroPool] = useState(() => {
    const saved = localStorage.getItem('heroPool');
    return saved ? JSON.parse(saved) : [];
  });

  // Synergy scores of all heroes within the hero pool, positive and negative
  const [fullPoolSynergies, setFullPoolSynergies] = useState([]);

  // Whether to show suggestions based on the user's hero pool or not
  const [filterByHeroPool, setFilterByHeroPool] = useState(true);

  // Whether "Hero Pool Manipulation" mode is active (click to add/remove heroes)
  const [editHeroPoolMode, setEditHeroPoolMode] = useState(false);

  // Suggestions from the user's hero pool
  const [poolSuggestions, setPoolSuggestions] = useState([]);

  // Best picks only taking draft into account
  const [globalSuggestions, setGlobalSuggestions] = useState([]);

  //==============================================
  //============= Status Messages ================
  //==============================================

  // Status message shown when user interacts with the hero pool editing tool
  const [statusMessage, setStatusMessage] = useState(null);

  // Cosmetic useState added to add a slight fade out to the status message
  const [showStatus, setShowStatus] = useState(false);

  //==============================================
  //=========== Refs (DOM + Timing) ==============
  //==============================================

  // Ref to the container where all the hero cards are rendered
  const containerRef = useRef(null);

  // Ref to the search input for automatic focus on keyboard input
  const searchInputRef = useRef(null);

  // Timeout used to delay fade-out of hero pool edit status message
  const fadeTimeoutRef = useRef(null);

  // Timeout used to delay removal of status messages
  const removeTimeoutRef = useRef(null);

  // Timestamp of last user interaction (used for search backspace logic)
  const lastInteractionRef = useRef(Date.now());

  // Flag to bypass above timestamp with quick inputs when searching
  // and picking heroes quickly
  const bypassTimerRef = useRef(false);

  //==============================================
  //============== Derived Values ================
  //==============================================

  // True if either team has selected at least one hero
  const hasPicks = selectedHeroes.ally.length > 0 || selectedHeroes.enemy.length > 0;

  //==============================================
  //=========== Data Initialization ==============
  //==============================================

  // Load and group hero data from local JSON on mount
  useEffect(() => {
    fetch("/heroes.json")
    .then((res) => res.json())
    .then((data) => {
      const grouped = groupAndSortHeroes(data);
      setHeroes(grouped);
    })
    .catch((err) => console.error("Failed to load static hero data:", err));
  }, []);

  // Load synergy matrix from local JSON on mount
  useEffect(() => {
    fetch("/synergyMatrix.json")
      .then((res) => res.json())
      .then((data) => {
        setMatchupData(data);
      })
      .catch((err) => console.error("Failed to load synergy data", err));
  }, []);

  // Load hero-specific position data from local JSON on mount
  useEffect(() => {
    fetch("/hero-roles.json")
      .then(res => res.json())
      .then(data => setHeroRoleMap(data))
      .catch(err => {
        console.error("Failed to load hero-roles.json", err);
        setHeroRoleMap({});
      });
  }, []);

  //==============================================
  //=========== Synergy Suggestions ==============
  //==============================================

  // Recalculate suggestions when hero pool filter is toggled
  useEffect(() => {
    updateSynergySuggestions();
  }, [filterByHeroPool]);

  // Recalculate or clear suggestions when selected or banned heroes change
  useEffect(() => {
  if (selectedHeroes.ally.length > 0 || selectedHeroes.enemy.length > 0) {
    updateSynergySuggestions();
  } else {
    setSuggestedHeroes([]); // Clear if no picks
  }
  }, [selectedHeroes, bannedHeroes]);

  // Assign enemy hero roles based on already picked heroes in the enemy team
  useEffect(() => {
    if (!heroRoleMap || selectedHeroes.enemy.length === 0) return;

    const ids = selectedHeroes.enemy.map(h => h.HeroId);
    const predictions = predictEnemyRoles(ids, heroRoleMap);
    setEnemyRolePredictions(predictions);
  }, [selectedHeroes.enemy, heroRoleMap]);

  // Trigger synergy calculations for all heroes within the user's hero pool
  useEffect(() => {
    const storedPool = JSON.parse(localStorage.getItem("heroPool")) || [];

    const results = calculatePoolSynergies({
      heroPool: storedPool,
      allyHeroIds: selectedHeroes.ally.map(h => h.HeroId),
      enemyHeroIds: selectedHeroes.enemy.map(h => h.HeroId),
      bannedHeroIds: bannedHeroes.map(h => h.HeroId),
      matchupData,
      heroes
    });

    setFullPoolSynergies(results);
  }, [selectedHeroes, bannedHeroes, matchupData, heroes]);

  //==============================================
  //========== Hero Pool Persistence =============
  //==============================================

  // Save hero pool to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('heroPool', JSON.stringify(heroPool));
  }, [heroPool]);

  // Automatically disable filter if hero pool is too small
  useEffect(() => {
    if (heroPool.length < 3 && filterByHeroPool) {
      setFilterByHeroPool(false);
    }
  }, [heroPool, filterByHeroPool]);

  //==============================================
  //========= Keyboard & Search Logic ============
  //==============================================

  // Handle typing and backspace logic for search bar focus and clearing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus();
      }

      if (e.key.length === 1 || e.key === "Backspace") {
        const now = Date.now();

        if (e.key === "Backspace") {
          const timeSinceInteraction = now - lastInteractionRef.current;
          if (bypassTimerRef.current || timeSinceInteraction > 2000) {
            setSearchQuery("");
          }
        }

        lastInteractionRef.current = now;
        bypassTimerRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //==============================================
  //========== UI Behavior & Layout ==============
  //==============================================

  // Automatically hide tooltip for guide after 5 seconds
  useEffect(() => {
  const timeout = setTimeout(() => setShowToolTip(false), 5000); // Timeout for tooltip to disappear
  return () => clearTimeout(timeout);
  }, []);

  // Track container's screen dimensions for positioning of search element
  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, []);

  useEffect(() => {
    const allyFull = selectedHeroes.ally.length === 5;
    const enemyFull = selectedHeroes.enemy.length === 5;

    // Auto-switch to the team that still has space
    if (allyFull && !enemyFull) {
      setSelectedTeam("enemy");
    } else if (enemyFull && !allyFull) {
      setSelectedTeam("ally");
    }
  }, [selectedHeroes]);

  // Track user's mouse movement to determine when the user is hovering a hero
  // in the full draft stats to make the synergy breakdown show correctly
  useEffect(() => {
    const handleMouseMove = (e) => {
      const boxWidth = 300;
      const boxHeight = 400;
      const margin = 10;

      const x = Math.min(e.clientX + margin, window.innerWidth - boxWidth - margin);
      const y = Math.min(e.clientY + margin, window.innerHeight - boxHeight - margin);

      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  //==============================================
  //========= Synergy Suggestion Engine ==========
  //==============================================

  /**
   * Updates synergy suggestions or final draft stats based on the current draft state.
   * 
   * This function:
   * - Gathers selected heroes, bans, roles, and filter settings
   * - Calls the core synergy calculation engine
   * - Decides whether to show:
   *   - Full team synergy stats (if both team are full), OR
   *   - Suggested heroes to pick next (split into hero pool and global is hero pool toggle is on)
   * 
   * It is memoized to avoid unnecessary recalculations.
   */

  const updateSynergySuggestions = useCallback((
    ally = selectedHeroes.ally,    // Selected heroes on the user's team
    enemy = selectedHeroes.enemy,  // Selected heroes on the enemy team
    bans = bannedHeroes,           // Banned heroes
    role = roleFilter              // Current role filter (e.g. carry, support)
  ) => {

    // If no heroes are picked on either team, clear all suggestions and stats
    if (!ally.length && !enemy.length) {
      setSuggestedHeroes([]);
      setFullDraftStats(null);
      return;
    }

    // Run synergy engine with all draft-related inputs
    const result = calculateSynergyPicks({
      allyHeroIds: ally.map(h => h.HeroId),
      enemyHeroIds: enemy.map(h => h.HeroId),
      bannedHeroIds: bans.map(h => h.HeroId),
      roleFilter: ally.length === 5 && enemy.length === 5 ? null : role,
      fullDraft: ally.length === 5 && enemy.length === 5,
      matchupData,
      heroes,
      heroPool: filterByHeroPool && heroPool.length > 0 ? heroPool : null,
      filterByHeroPool
    });

    // === CASE 1: Full Draft Complete ===
    // Show full synergy breakdown for both teams
    if (result?.mode === "fullDraft") {
      setFullDraftStats(result.teams);
      setSuggestedHeroes([]); // No suggestions needed anymore
    }
    
    // === CASE 2: Still Drafting - Show Suggestions ===
    // Show top synergy picks (in and out of personal hero pool)
    else if (result?.mode === "suggestion"){
      const { inPool = [], outPool = [] } = result;
      setPoolSuggestions(inPool.slice(0, 3));     // Limit in-pool picks to top 3
      setGlobalSuggestions(outPool.slice(0, 10)); // Limit global picks to top 10
      setFullDraftStats(null);                    // Clear full drafts view
    }
  }, [
    selectedHeroes.ally,
    selectedHeroes.enemy,
    bannedHeroes,
    roleFilter,
    matchupData,
    heroes,
    heroPool,
    filterByHeroPool
  ]);

  //==============================================
  //============== Locking Helpers ===============
  //==============================================

  /**
   * Locks a hero to prevent it from being clicked or selected multiple times during
   * This helper is only called through other components 
   * @param {*} heroId The unique identifier of the hero being interacted with
   */
  const lockHero = (heroId) => {
    setClickLockedHeroes(prev => {
    const updated = new Set(prev);
    updated.add(heroId);
    return updated;
  });
  };

  /**
   * Unlocks a previously locked hero, restoring interactivity.
   * @param {*} heroId The unique identifier of the hero whose interactivity is being restored
   */
  const unlockHero = (heroId) => {
    setClickLockedHeroes((prev) => {
      const updated = new Set(prev);
      updated.delete(heroId);
      return updated;
    });
  };

  //==============================================
  //=============== Draft Actions ================
  //==============================================

  /**
   * Clears all bans and recalculates suggestions without any banned heroes
   */
  const handleClearBans = () => {
      setBannedHeroes([]);
      updateSynergySuggestions(selectedHeroes.ally, selectedHeroes.enemy, []);
  };

  /**
   * Handles selecting a hero by clicking
   * - Adds to ally or enemy draft depending on selected team
   * - Updates hero Pool if in edit mode
   * - Shows status message if in edit mode
   * @param {*} hero The hero object being interacted with
   */
  const handleHeroClick = (hero) => {
    if (clickLockedHeroes.has(hero.HeroId)) return;

    bypassTimerRef.current = true;

    // === Pool Editing Mode ===
    if (editHeroPoolMode) {
      const inPool = heroPool.includes(hero.HeroId);
      const updatedPool = inPool
        ? heroPool.filter(id => id !== hero.HeroId)
        : [...heroPool, hero.HeroId];

        setHeroPool(updatedPool);

        clearTimeout(fadeTimeoutRef.current);
        clearTimeout(removeTimeoutRef.current);

        setStatusMessage({
          text: `${hero.name} has been ${inPool ? "removed from" : "added to"} the hero pool.`,
          type: inPool ? "removed" : "added"
        });
        setShowStatus(true);

        fadeTimeoutRef.current = setTimeout(() => setShowStatus(false), 1800);
        removeTimeoutRef.current = setTimeout(() => setStatusMessage(null), 2200);
        return;
    }


    // === Draft Pick Logic ===
    const team = selectedTeam;
    if (selectedHeroes[team].length >= 5) return;
    if (selectedHeroes[team].some(h => h.HeroId === hero.HeroId)) return;

    lockHero(hero.HeroId);

    const updatedSelected = {
      ...selectedHeroes,
      [team]: [...selectedHeroes[team], hero],
    };

    setSelectedHeroes(updatedSelected);

    unlockHero(hero.HeroId);
  };

  /**
   * Handles dropping a hero card into a team (drag-and-drop).
   * @param {*} hero The hero object being dragged
   * @param {*} team The team the hero is being dragged to
   * @returns 
   */
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

  /**
   * Deselects a hero from the team and updates synergy suggestions.
   * @param {*} hero The hero object being removed
   * @param {*} team The team the hero is being removed from
   */
  const handleHeroDeselect = (hero, team) => {

    const newSelected = {
      ...selectedHeroes,
      [team]: selectedHeroes[team].filter(h => h.HeroId !== hero.HeroId),
    };

    setSelectedHeroes(newSelected);

    updateSynergySuggestions(newSelected.ally, newSelected.enemy, bannedHeroes);
  };

  /**
   * Clears all picks, bans, suggestions and locked heroes (not hero pool)
   */
  const handleClear = () => {
    setSelectedHeroes({ ally: [], enemy: [] });
    setSuggestedHeroes([]);
    setBannedHeroes([]);
    setClickLockedHeroes(new Set());
  };

  /**
   * Removes a single hero from the bans
   * @param {*} hero The hero being removed from the bans
   */
  const handleBanRemove = (hero) => {
    const updatedBans = bannedHeroes.filter(h => h.HeroId !== hero.HeroId);
    setBannedHeroes(updatedBans);
  };

  /**
   * Bans a hero (maximum of 16). Uses locking to prevent double-clicks.
   * @param {*} hero The hero object being banned
   */
  const handleHeroBan = (hero) => {
    if (bannedHeroes.length >= 16) return;
    if (clickLockedHeroes.has(hero.HeroId)) return;

    lockHero(hero.HeroId);

    const updatedBans = [...bannedHeroes, hero];

    setBannedHeroes(updatedBans)

    unlockHero(hero.HeroId);
  };

  //==============================================
  //========= Search & Filtering Helpers =========
  //==============================================

  /**
   * Checks whether a hero's name matches the current search query.
   * @param {*} hero the hero object which's name is being inspected
   * @returns true if there's no query or the hero name includes the query
   */
  const isHeroMatch = (hero) => {
    if(!searchQuery.trim()) return true;
    return hero.name.toLowerCase().includes(searchQuery.toLowerCase());
  };

  //==============================================
  //=============== Render Helpers ===============
  //==============================================

  /**
   * Renders a single attribute column (STR, AGI, INT, UNI).
   * Includes hero grid with proper styling and interactivity.
   * @param {*} attr the attribute whiches column is being rendered (for color coding)
   */
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
                glowPurple={editHeroPoolMode && heroPool.includes(hero.HeroId)}
              />
            );
          })}
        </motion.div>
      </div>
    );
  };

  return (
    // === Main App Container ===
    <div className={`p-2 text-white h-screen overflow-hidden flex flex-col transition-shadow duration-300 ${
      editHeroPoolMode ? "bg-black shadow-[0_0_40px_10px_rgba(128,0,128,0.5)]" : "bg-black"
    }`}>
      {/* === Search Input (invisible, global key listener) === */}
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
        <div className="flex flex-col items-center w-full">
          <div className="relative w-full h-6 mb-1">
            <button
              onClick={() => setGridMode(prev => prev === "default" ? "row" : "default")}
              className="absolute ml-4 top-1/2 transform -translate-y-1/2 w-28 h-12 mt-6 bg-gray-800 rounded transition-colors duration-300 ease-in-out flex items-center justify-between"
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
          {/* === Ban Slots (16 max) === */}
          <div className="flex justify-center mb-2 gap-2">
            {/* Each slot: empty or contains a banned hero with "REMOVE" hover overlay */}
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

      {/* Main Hero Grid Area */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex flex-col flex-1 pr-3 overflow-y-auto gap-4 relative">
          {searchQuery && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: containerRect.left + containerRect.width / 2,
              top: containerRect.top + containerRect.height / 2,
              transform: "translate(-50%, -50%)",
            }}
          >
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

        {/* === Sidebar Panel (suggestions / full draft analysis) === */}
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
                            onMouseEnter={() => setHoveredHero({ ...ally, team: 'ally' })}
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
                              const heroMatchup = matchupData?.[String(hoveredHero.HeroId)];

                              const sameTeam = (
                                (hoveredHero.team === 'ally' && selectedHeroes.ally.some(h => h.HeroId === other.HeroId)) ||
                                (hoveredHero.team === 'enemy' && selectedHeroes.enemy.some(h => h.HeroId === other.HeroId))
                              );

                              console.log('Hovered hero:', hoveredHero);

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
                                <img src={infoButtonIcon} alt="info" className="w-4 h-4 filter invert" />
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
                              const score = getSynergyWith(matchupData, hoveredSuggestedHero.HeroId, ally.HeroId);
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
                              const score = getCounterVs(matchupData, hoveredSuggestedHero.HeroId, enemy.HeroId);
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
                              className={`text-sm font-mono ${
                                parseFloat(hero.totalScore) >= 0 ? "text-green-400" : "text-red-400"
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
                Hero matchup data will be updated using STRATZ API once a week to maintain the integrity of the app. <br /><br/>
                Typing at any time starts a search function that is very familiar to people from Dota 2. Aliases will be supported later down the line. Use the hero pool
                toggle button below to set your personalized hero pool and the tool will still suggest globally great hero choices but also three best choices from your
                hero pool. Clicking on the info button near the title of your own hero pool suggestions shows your entire hero pool broken down into synergy scores. 
                Hovering over hero suggestions shows more details as to where the number comes from. This feature also works when inspecting a full draft.
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
                className={`px-2 py-1 rounded text-xs font-bold transition duration-300 ${
                  filterByHeroPool ? "bg-purple-700 text-white" : "bg-gray-700 text-gray-300"}
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
          {/* === App Footer Info === */}
          <div className="text-white text-xs border-t border-gray-700 pt-2">
            <p>Patch: 7.39c</p>
            <p>Last updated: July 16</p>
          </div>
        </div>{/* end sidebar */}
      </div>{/* end hero+sidebar split */}
    {/* === Status Toast (Bottom left) === */}
    {statusMessage && (
      <div
        className={`fixed bottom-4 left-4 px-4 py-2 rounded shadow-lg text-sm font-semibold z-50
          transition-opacity duration-400 ease-in-out
          ${showStatus ? "opacity-100" : "opacity-0"}
          ${statusMessage.type === "added" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
      >
        {statusMessage.text}
      </div>
    )}
    </div>
  );
}