import '../App.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { groupAndSortHeroes } from '../utils/groupHeroes';
import { calculateSynergyPicks, calculatePoolSynergies, getCounterVs, getSynergyWith, getWinProbability } from '../utils/synergy';
import { predictEnemyRoles } from '../utils/predictRoles';
import infoButtonIcon from '../assets/info_button.png';
import layoutDefaultIcon from '../assets/layout_default.svg';
import layoutRowIcon from '../assets/layout_row.svg';
import questionMarkIcon from '../assets/question_mark.svg';
import { motion, AnimatePresence } from 'framer-motion';
import useIsMobile from '../hooks/useIsMobile';
import DraftPanel from '../components/DraftPanel';
import Sidebar from '../components/Sidebar';
import { DraggableHero } from '../components/structures';
import MobileDraftColumn from '../components/MobileDraftColumn';
import MobileHeroPicker from '../components/MobileHeroPicker';

const TOOLTIP_KEY = "guideTooltipSeen";

export default function HeroList() {

  //==============================================
  //============= Drafting State =================
  //==============================================

  // Selected heroes for both teams
  const [selectedHeroes, setSelectedHeroes] = useState({
    ally: [],
    enemy: []
  });

  // Selected heroes for both teams for mobile
  const [mobileSelectedHeroes, setMobileSelectedHeroes] = useState({
    ally: Array(5).fill(null),
    enemy: Array(5).fill(null),
  });

  // Heroes that have been banned from the draft
  const [bannedHeroes, setBannedHeroes] = useState([]);

  // Heroes that have been banned on mobile
  const [mobileBannedHeroes, setMobileBannedHeroes] = useState(() => new Set());

  // Which slot are we picking for
  const [mobilePicker, setMobilePicker] = useState(null);

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

  // Environment mode: either mobile or desktop
  const isMobile = useIsMobile();

  // Layout mode: "default" = 2x2, "row" = 4x1
  const [gridMode, setGridMode] = useState("default");

  // Whether to show the tool's short tutorial
  const [showGuide, setShowGuide] = useState(false);

  // Whether to show the breakdown of the user's entire hero pool's synergies
  const [showPoolBreakdown, setShowPoolBreakdown] = useState(false);

  // Button pulse effect (used for visual alerts)
  const [buttonPulse, setButtonPulse] = useState(false);

  // Tooltip visibility toggle for info box to help users begin using the tool
  const [showToolTip, setShowToolTip] = useState(false);

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
    if (!showToolTip) return;
    const timeout = setTimeout(() => {
      setShowToolTip(false);
      try { localStorage.setItem(TOOLTIP_KEY, "1"); } catch {}
    }, 5000);
    return () => clearTimeout(timeout);
  }, [showToolTip]);

  // Track if the user has already seen the tooltip for guide
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOOLTIP_KEY) === "1";
      if (!seen) setShowToolTip(true);
    } catch {
      // if storage is blocked, fail open (will show tooltip once this session)
      setShowToolTip(true)
    }
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

  // Track both team sizes to automatically change team selection is need be
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
  //================== Helpers ===================
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

  /**
   * Helper function that helps finding a hero object based on a hero's ID
   * @param {*} id the ID of the hero being searched
   * @param {*} groups all heroes in the designated attribute groups
   * @returns hero object, if search unsuccessful then null
   */
  function findHeroById(id, groups) {
    const needle = Number(id);
    const pools = [groups?.str, groups?.agi, groups?.int, groups?.all];
    for (const arr of pools) {
      if (!arr) continue;
      const h = arr.find(x => x.HeroId === id);
      if (h) return h;
    }
    return null;
  }

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
   * Handles selecting a hero by clicking on desktop
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
   * Handles selecting a hero in a mobile environment
   * @param {*} team the team into which the hero is to be picked
   * @param {*} slot  the slot of the team where the hero will be added
   * @param {*} heroId the id of the hero that will be added
   */
  const handleMobilePick = (team, slot, heroId) => {
    const hero = heroById.get(heroId);
    if (!hero) return;

    // If you’re in Pool Editing Mode, let desktop function handle it
    if (editHeroPoolMode) {
      handleHeroClick(hero);
      return;
    }

    // === Slot-aware Draft Pick Logic ===
    // Block duplicates
    if (selectedHeroes[team].some(h => h?.HeroId === hero.HeroId)) return;

    // If team already has 5 picks and slot is out of range, abort
    if (selectedHeroes[team].length >= 5 && (slot == null || slot > 4)) return;

    // Lock to prevent double-click races
    if (typeof lockHero === "function") lockHero(hero.HeroId);

    // Place into specific slot, or append if slot is the next index
    const teamPicks = [...selectedHeroes[team]];

    if (typeof slot === "number") {
      // Ensure array has 5 positions so assignment doesn’t create holes
      while (teamPicks.length < 5) teamPicks.push(null);

      teamPicks[slot] = hero;
    } else {
      // Fallback: behave like your desktop click (append)
      teamPicks.push(hero);
    }

    setSelectedHeroes({
      ...selectedHeroes,
      [team]: teamPicks,
    });

    if (typeof unlockHero === "function") unlockHero(hero.HeroId);
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
    const query = searchQuery.toLowerCase();
    const nameMatch = hero.name.toLowerCase().includes(query);
    const aliasMatch = hero.aliases?.some(alias => alias.toLowerCase().includes(query));
    return nameMatch || aliasMatch;
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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="h-12 flex items-center justify-between px-3 border-b border-gray-800">
          <div className="font-bold">Dota2 Drafter</div>
          <button aria-label="Menu">☰</button>
        </div>

        <div className="p-3 grid grid-cols-2 gap-3">
          <MobileDraftColumn
            title="Ally"
            picks={mobileSelectedHeroes.ally}
            onSlotTap={(slot) => setMobilePicker({ team: "ally", slot })}
          />
          <MobileDraftColumn
            title="Enemy"
            picks={mobileSelectedHeroes.enemy}
            onSlotTap={(slot) => setMobilePicker({ team: "enemy", slot })}
          />
        </div>

        <div className="p-3">
          <button className="w-full py-3 rounded border border-gray-700">
            ▲ Suggestions / Analysis
          </button>
        </div>

        {mobilePicker && (
          <MobileHeroPicker
            team={mobilePicker.team}
            slot={mobilePicker.slot}
            heroes={heroes} // existing grouped heroes object
            selectedHeroes={mobileSelectedHeroes}         // mobile state only
            bannedHeroes={[...mobileBannedHeroes]}        // for overlay/disable in the picker
            onClose={() => setMobilePicker(null)}
            onPick={(heroId) => {
              // place hero into the chosen team/slot in MOBILE state
              setMobileSelectedHeroes(prev => {
                const next = { ...prev, [mobilePicker.team]: [...prev[mobilePicker.team]] };
                next[mobilePicker.team][mobilePicker.slot] = findHeroById(heroId, heroes);
                return next;
              });
              setMobilePicker(null);
            }}
            onBan={(heroId) => {
              setMobileBannedHeroes(prev => new Set(prev).add(heroId));
            }}
            onUnban={(heroId) => {
              setMobileBannedHeroes(prev => {
                const s = new Set(prev); s.delete(heroId); return s;
              });
            }}
          />
        )}
      </div>
    );
  }

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
      <DraftPanel
        selectedHeroes={selectedHeroes}
        selectedTeam={selectedTeam}
        setSelectedTeam={setSelectedTeam}
        handleDrop={handleDrop}
        handleHeroDeselect={handleHeroDeselect}
        enemyRolePredictions={enemyRolePredictions}
        showToolTip={showToolTip}
        setShowGuide={setShowGuide}
        infoButtonIcon={infoButtonIcon}
        buttonPulse={buttonPulse}
        setButtonPulse={setButtonPulse}
        editHeroPoolMode={editHeroPoolMode}
        setEditHeroPoolMode={setEditHeroPoolMode}
        handleClear={handleClear}
        handleClearBans={handleClearBans}
      />
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
        <Sidebar
          suggestedHeroes={suggestedHeroes}
          poolSuggestions={poolSuggestions}
          globalSuggestions={globalSuggestions}
          selectedHeroes={selectedHeroes}
          hoveredHero={hoveredHero}
          setHoveredHero={setHoveredHero}
          hoveredSuggestedHero={hoveredSuggestedHero}
          setHoveredSuggestedHero={setHoveredSuggestedHero}
          matchupData={matchupData}
          getSynergyWith={getSynergyWith}
          getCounterVs={getCounterVs}
          fullDraftStats={fullDraftStats}
          filterByHeroPool={filterByHeroPool}
          setFilterByHeroPool={setFilterByHeroPool}
          heroPool={heroPool}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          showPoolBreakdown={showPoolBreakdown}
          setShowPoolBreakdown={setShowPoolBreakdown}
          fullPoolSynergies={fullPoolSynergies}
          showGuide={showGuide}
          setShowGuide={setShowGuide}
          updateSynergySuggestions={updateSynergySuggestions}
          mousePosition={mousePosition}
          showWinrateInfo={showWinrateInfo}
          setShowWinrateInfo={setShowWinrateInfo}
          getWinProbability={getWinProbability}
          hasPicks={hasPicks}
          bannedHeroes={bannedHeroes}
          infoButtonIcon={infoButtonIcon}
          questionMarkIcon={questionMarkIcon}
        />
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