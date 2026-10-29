import '../App.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { groupAndSortHeroes } from '../utils/groupHeroes';
import { indexMatrix } from '../utils/indexMatrix';
import {
    getCounterVs,
    getSynergyWith,
    getWinProbability,
} from "../utils/synergy";
import { calculateDraftRecommendations } from "../utils/draftRecommendations";
import {
    getRecommendationDraft,
    TEAM_LABELS,
    PRACTICE_TEAM_LABELS,
} from "../utils/draftTeams";
import HeroInspector from '../components/HeroInspector';
import { calculateHeroInspection } from '../utils/heroInspection';
import { predictEnemyRoles } from '../utils/predictRoles';
import { calculateDraftWinProbability } from '../utils/draftWinProbability';
import infoButtonIcon from '../assets/info_button.png';
import questionMarkIcon from '../assets/question_mark.svg';
import { motion, AnimatePresence } from 'framer-motion';
import DraftPanel from '../components/DraftPanel';
import DraftOverview from '../components/DraftOverview';
import Sidebar from '../components/Sidebar';
import { DraggableHero } from '../components/structures';
import ReportIssueButton from '../components/ReportIssueButton';
import { useDraftCapture } from '../matchFeedback/useDraftCapture';

const TOOLTIP_KEY = "guideTooltipSeen";
const TEAM_SWITCH_KEY = "F2";
const DRAFT_OVERVIEW_KEY = "F3";
const HERO_INSPECTOR_KEY = "F4";

export default function HeroList({
    practiceDataset = null,
    tutorial = null,
    practiceSeed = null,
    active = true,
    onStartTutorial = null,
    tutorialLoading = false,
    tutorialError = "",
}) {
    const isPractice = practiceDataset !== null;
    const teamLabels = isPractice ? PRACTICE_TEAM_LABELS : TEAM_LABELS;
    const datasetManifest =
        practiceDataset?.manifest ?? window.__LOCAL_DATASET_MANIFEST__;
    const beforeTutorialAction = tutorial?.beforeAction;
    const reportTutorialDraft = tutorial?.onDraftChange;
    const reportTutorialPool = tutorial?.onPoolChange;
    const reportTutorialInspector = tutorial?.onInspectorChange;
    const reportTutorialOverview = tutorial?.onOverviewChange;
    const tutorialSearchAllowed = tutorial?.allowSearch !== false;
    const tutorialTargetHeroIds = tutorial?.targetHeroIds;
    const recommendationSideLocked =
        isPractice && tutorial?.allowRecommendationSwitch !== true;

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

    // Modernized static matchup data (synergy/counter values between heroes)
    const [matchupIndex, setMatchupIndex] = useState(
        () => practiceDataset?.matchupIndex ?? {}
    );

    // The team currently being drafted
    const [selectedTeam, setSelectedTeam] = useState("ally");

    // Viewing the other side's best picks never changes where clicks add heroes.
    const [recommendationTeamState, setRecommendationTeam] = useState("ally");

    // Current tutorial lessons always use Radiant recommendations.
    const recommendationTeam = recommendationSideLocked
        ? "ally"
        : recommendationTeamState;

    // Heroes that are temporarily click-locked (Emergency fallback for quick inputs)
    const [clickLockedHeroes, setClickLockedHeroes] = useState(new Set());

    // All hero data grouped by attribute (STR, AGI, INT, UNI)
    const [heroes, setHeroes] = useState(
        () => practiceDataset?.heroes ?? {}
    );

    // Filtering suggestions by selected role (e.g., "carry", "support")
    const [roleFilter, setRoleFilter] = useState(null);

    // Static hero role data (hero-specific position data)
    const [heroRoleMap, setHeroRoleMap] = useState(null);

    const [rolePredictions, setRolePredictions] = useState({
        ally: {},
        enemy: {},
    });

    //==============================================
    //================ UI State ====================
    //==============================================


    // Layout mode: "default" = 2x2, "row" = 4x1
    const [gridMode, setGridMode] = useState("default");

    // Whether to show the tool's short tutorial
    const [showGuide, setShowGuide] = useState(false);

    // Whether to show the breakdown of the user's entire hero pool's synergies
    const [showPoolBreakdown, setShowPoolBreakdown] = useState(false);

    // Picked-hero analysis is available before either team is complete.
    const [showDraftOverview, setShowDraftOverview] = useState(false);

    const [showHeroInspector, setShowHeroInspector] = useState(false);
    const [inspectorMoves, setInspectorMoves] = useState(0);

    // Retain the floating panel's location while it is closed during this session.
    const [inspectorPosition, setInspectorPosition] = useState(null);

    // Only hero-grid clicks change this candidate; drop actions never replace it.
    const [inspectedHero, setInspectedHero] = useState(null);

    // Button pulse effect (used for visual alerts)
    const [buttonPulse, setButtonPulse] = useState(false);

    // Tooltip visibility toggle for info box to help users begin using the tool
    const [showToolTip, setShowToolTip] = useState(false);

    // Currently hovered hero (for synergy breakdown display)
    const [hoveredHero, setHoveredHero] = useState(null);

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
    // Recover safely from invalid saved data or unavailable browser storage.
    const [heroPool, setHeroPool] = useState(() => {

        // Practice owns a temporary pool and never reads the user's saved pool.
        if (isPractice) return [];

        try {
            const saved = localStorage.getItem("heroPool");
            if (!saved) return [];

            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];

            // Store each positive integer hero ID once; discard malformed entries.
            return [...new Set(
                parsed.filter(id => Number.isSafeInteger(id) && id > 0)
            )];
        } catch (error) {
            console.warn("Could not load the saved hero pool:", error);
            return [];
        }
    });

    // Whether to show suggestions based on the user's hero pool or not
    const [filterByHeroPool, setFilterByHeroPool] = useState(!isPractice);

    // Whether "Hero Pool Manipulation" mode is active (click to add/remove heroes)
    const [editHeroPoolMode, setEditHeroPoolMode] = useState(false);

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

    // The floating inspector animates to and from this toolbar button.
    const inspectorButtonRef = useRef(null);

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

    const recommendationDraft = getRecommendationDraft(
        selectedHeroes,
        recommendationTeam
    );

    const {
        fullDraftStats,
        poolSuggestions,
        globalSuggestions,
        fullPoolSynergies,
    } = useMemo(() => calculateDraftRecommendations({
        selectedHeroes,
        recommendationTeam,
        bannedHeroes,
        roleFilter,
        matchupIndex,
        heroes,
        heroPool,
        filterByHeroPool,
    }), [
        selectedHeroes,
        recommendationTeam,
        bannedHeroes,
        roleFilter,
        matchupIndex,
        heroes,
        heroPool,
        filterByHeroPool,
    ]);

    // The button and focused shortcut share the same availability rule.
    const canSwitchTeam =
        selectedHeroes.ally.length < 5 && selectedHeroes.enemy.length < 5;

    // Every draft input passes this gate before changing state during a lesson.
    const requestTutorialAction = useCallback(
        action => beforeTutorialAction?.(action) !== false,
        [beforeTutorialAction]
    );

    // Include bans so the tutorial confirms actions after state is committed.
    // Report committed filters as well as picks, bans and the picking side.
    useEffect(() => {
        reportTutorialDraft?.(
            selectedHeroes,
            selectedTeam,
            bannedHeroes,
            roleFilter,
            recommendationTeam
        );
    }, [
        selectedHeroes,
        selectedTeam,
        bannedHeroes,
        roleFilter,
        recommendationTeam,
        reportTutorialDraft,
    ]);

    useEffect(() => {
        reportTutorialOverview?.(showDraftOverview);
    }, [reportTutorialOverview, showDraftOverview]);

    // Report pool controls after React commits each accepted tutorial input.
    useEffect(() => {
        reportTutorialPool?.({
            heroPool,
            editing: editHeroPoolMode,
            filtering: filterByHeroPool,
            breakdownOpen: showPoolBreakdown
                && filterByHeroPool && hasPicks
                && recommendationDraft.ally.length < 5,
        });
    }, [
        heroPool,
        editHeroPoolMode,
        filterByHeroPool,
        showPoolBreakdown,
        hasPicks,
        recommendationDraft.ally.length,
        reportTutorialPool,
    ]);

    // Report the inspector and draft together after React commits. This confirms
    // that a drop updated the draft without replacing the inspected candidate.
    useEffect(() => {
        reportTutorialInspector?.({
            open: showHeroInspector,
            heroId: inspectedHero?.HeroId ?? null,
            team: selectedTeam,
            moves: inspectorMoves,
            allyHeroIds: selectedHeroes.ally.map(hero => hero.HeroId),
            enemyHeroIds: selectedHeroes.enemy.map(hero => hero.HeroId),
            bannedHeroIds: bannedHeroes.map(hero => hero.HeroId),
        });
    }, [
        reportTutorialInspector,
        showHeroInspector,
        inspectedHero,
        selectedTeam,
        inspectorMoves,
        selectedHeroes,
        bannedHeroes,
    ]);

    // Skipping prepares the draft that the following lesson expects.
    useEffect(() => {
        if (!practiceDataset || !practiceSeed) return;

        const resolveHeroes = ids => ids
            .map(id => practiceDataset.heroById.get(id))
            .filter(Boolean);

        setSelectedHeroes({
            ally: resolveHeroes(practiceSeed.ally),
            enemy: resolveHeroes(practiceSeed.enemy),
        });
        setBannedHeroes(resolveHeroes(practiceSeed.bans));
        setSelectedTeam(practiceSeed.team);
        setRecommendationTeam(practiceSeed.recommendationTeam ?? "ally");
        setRoleFilter(practiceSeed.roleFilter ?? null);
        if (Array.isArray(practiceSeed.heroPool)) {
            setHeroPool(practiceSeed.heroPool);
        }
        setFilterByHeroPool(practiceSeed.filterByHeroPool ?? false);
        setEditHeroPoolMode(false);
        setShowPoolBreakdown(false);
        setShowHeroInspector(false);
        setShowDraftOverview(false);
        setInspectedHero(null);
        setInspectorMoves(0);
        setSearchQuery("");
    }, [practiceDataset, practiceSeed]);

    const handleTeamSwitch = useCallback((source = "keyboard") => {
        if (!canSwitchTeam) return;
        if (!requestTutorialAction({
            type: "team-switch",
            team: selectedTeam === "ally" ? "enemy" : "ally",
            source,
        })) return;

        setSelectedTeam(team => team === "ally" ? "enemy" : "ally");
    }, [canSwitchTeam, requestTutorialAction, selectedTeam]);

    const handleRecommendationSwitch = () => {
        const team = recommendationTeam === "ally" ? "enemy" : "ally";

        if (!requestTutorialAction({
            type: "recommendation-side",
            team,
        })) return;

        if (recommendationSideLocked) return;

        setHoveredSuggestedHero(null);
        setRecommendationTeam(team);
    };

    const toggleDraftOverview = useCallback(() => {
        const open = !showDraftOverview;
        if (!requestTutorialAction({ type: "overview", value: open })) return;
        setShowDraftOverview(open);
    }, [requestTutorialAction, showDraftOverview]);

    const closeDraftOverview = useCallback(() => {
        if (!requestTutorialAction({ type: "overview", value: false })) return false;
        setShowDraftOverview(false);
        return true;
    }, [requestTutorialAction]);

    const toggleHeroInspector = useCallback(() => {
        if (!requestTutorialAction({
            type: "inspector",
            value: !showHeroInspector,
        })) return;

        setEditHeroPoolMode(false);
        setShowPoolBreakdown(false);
        setShowHeroInspector(open => !open);
    }, [requestTutorialAction, showHeroInspector]);

    const closeHeroInspector = useCallback(() => {
        if (!requestTutorialAction({ type: "inspector", value: false })) return;
        setShowHeroInspector(false);
    }, [requestTutorialAction]);

    const beforeInspectorMove = useCallback(
        () => requestTutorialAction({ type: "inspector-move" }),
        [requestTutorialAction]
    );

    const reportInspectorMoved = useCallback(
        () => setInspectorMoves(count => count + 1),
        []
    );

    const togglePoolEdit = useCallback(() => {
        if (!requestTutorialAction({
            type: "pool-edit-mode",
            value: !editHeroPoolMode,
        })) return;

        setShowHeroInspector(false);
        setEditHeroPoolMode(editing => !editing);
    }, [requestTutorialAction, editHeroPoolMode]);

    // Recalculate from the live draft while keeping the candidate independent.
    const heroInspection = useMemo(() => calculateHeroInspection({
        hero: inspectedHero,
        selectedTeam,
        selectedHeroes,
        bannedHeroes,
        matchupIndex,
    }), [inspectedHero, selectedTeam, selectedHeroes, bannedHeroes, matchupIndex]);

    // The first stored team is Radiant. Recommendation-side changes never
    // affect the model input order or the displayed win probabilities.
    const draftWinProbability = useMemo(() => calculateDraftWinProbability({
        allyHeroIds: selectedHeroes.ally.map(hero => hero.HeroId),
        enemyHeroIds: selectedHeroes.enemy.map(hero => hero.HeroId),
        matchupIndex,
        patch: datasetManifest?.patch,
    }), [selectedHeroes, matchupIndex, datasetManifest?.patch]);

    const matchFeedback = useDraftCapture({
        active,
        isPractice,
        selectedHeroes,
        prediction: draftWinProbability,
        manifest: datasetManifest,
    });

    //==============================================
    //=========== Data Initialization ==============
    //==============================================

    // Load and group hero data from local JSON on mount
    useEffect(() => {
        if (isPractice) return;
        const heroesUrl = window.__HEROES_URL__ || "/heroes.json";
        console.log("[heroes] heroesUrl:", heroesUrl);

        fetch(heroesUrl)
            .then((res) => {
                return res.json();
            })
            .then((data) => {
                const grouped = groupAndSortHeroes(data);
                setHeroes(grouped);
            })
            .catch((err) => console.error("Failed to load static hero data:", err));
    }, [isPractice]);

    // Load synergy matrix from local JSON on mount
    useEffect(() => {
        if (isPractice) return;
        const datasetUrl = window.__SYNERGY_MATRIX_URL__ || "/synergyMatrix.json";
        fetch(datasetUrl)
            .then((res) => {
                return res.json();
            })
            .then((data) => {
                setMatchupIndex(indexMatrix(data));
            })
            .catch((err) => console.error("[synergy] Failed to load synergy data", err));
    }, [isPractice]);

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

    // Position hints are independent of which side is being recommended.
    useEffect(() => {
        if (!heroRoleMap) return;

        setRolePredictions({
            ally: predictEnemyRoles(
                selectedHeroes.ally.map(hero => hero.HeroId),
                heroRoleMap
            ),
            enemy: predictEnemyRoles(
                selectedHeroes.enemy.map(hero => hero.HeroId),
                heroRoleMap
            ),
        });
    }, [selectedHeroes, heroRoleMap]);

    //==============================================
    //========== Hero Pool Persistence =============
    //==============================================

    // Save pool edits when storage is available; failed saves will not break drafting.
    useEffect(() => {
        if (isPractice) return;
        try {
            localStorage.setItem("heroPool", JSON.stringify(heroPool));
        } catch (error) {
            console.warn("Could not save the hero pool:", error);
        }
    }, [heroPool, isPractice]);

    // Automatically disable filter if hero pool is too small
    useEffect(() => {
        if (heroPool.length < 3 && filterByHeroPool) {
            setFilterByHeroPool(false);
        }
    }, [heroPool, filterByHeroPool]);

    //==============================================
    //========= Keyboard & Search Logic ============
    //==============================================

    // Handle focused shortcuts before ordinary typing can activate hero search.
    useEffect(() => {
        // The hidden real draft must not react to keys entered during practice.
        if (!active) return;
        const handleKeyDown = (e) => {
            if (e.defaultPrevented || e.isComposing || !document.hasFocus()
                || document.visibilityState === "hidden") return;

            // Modal dialogs own keyboard input. Floating pool panels remain interactive.
            if (document.querySelector('dialog[open]:not([aria-modal="false"])')) return;

            const el = document.activeElement;
            const tag = el?.tagName?.toLowerCase();
            const editing = tag === "input" || tag === "textarea"
                || tag === "select" || el?.isContentEditable;

            // Search can stay focused during drafting; other fields own their keystrokes.
            if (editing && el !== searchInputRef.current) return;

            if (e.code === TEAM_SWITCH_KEY
                && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                e.preventDefault();
                if (!e.repeat) handleTeamSwitch();
                return;
            }

            if (e.code === DRAFT_OVERVIEW_KEY
                && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                e.preventDefault();
                if (!e.repeat) toggleDraftOverview();
                return;
            }

            if (e.code === HERO_INSPECTOR_KEY
                && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                e.preventDefault();
                if (!e.repeat) toggleHeroInspector();
                return;
            }

            // Navigation and modified shortcuts must not move focus into hero search.
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key.length !== 1 && e.key !== "Backspace") return;
            if (!tutorialSearchAllowed) return;

            // Preserve keyboard activation of buttons and links with Space.
            if (e.key === " " && el?.closest('button, a[href], [role="button"]')) return;

            if (document.activeElement !== searchInputRef.current) {
                searchInputRef.current?.focus();
            }

            const now = Date.now();

            if (e.key === "Backspace") {
                const timeSinceInteraction = now - lastInteractionRef.current;
                if (bypassTimerRef.current || timeSinceInteraction > 2000) {
                    setSearchQuery("");
                }
            }

            lastInteractionRef.current = now;
            bypassTimerRef.current = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        active,
        handleTeamSwitch,
        toggleDraftOverview,
        toggleHeroInspector,
        tutorialSearchAllowed,
    ]);

    //==============================================
    //========== UI Behavior & Layout ==============
    //==============================================

    // Automatically hide tooltip for guide after 5 seconds.
    useEffect(() => {
        if (isPractice || !active || !showToolTip) return;

        const timeout = setTimeout(() => {
            setShowToolTip(false);
            try {
                localStorage.setItem(TOOLTIP_KEY, "1");
            } catch {
                // Dismissing the hint still works when storage is unavailable.
            }
        }, 5000);

        return () => clearTimeout(timeout);
    }, [showToolTip, isPractice, active]);

    // Practice must not read or change the user's guide preference.
    useEffect(() => {
        if (isPractice) return;

        try {
            const seen = localStorage.getItem(TOOLTIP_KEY) === "1";
            if (!seen) setShowToolTip(true);
        } catch {
            setShowToolTip(true);
        }
    }, [isPractice]);

    // Re-measure on return from practice; hidden containers have no size.
    useEffect(() => {
        if (!active) return;

        const updateRect = () => {
            if (containerRef.current) {
                setContainerRect(containerRef.current.getBoundingClientRect());
            }
        };

        updateRect();

        // Docked narration can resize the grid without resizing the window.
        const observer = new ResizeObserver(updateRect);
        if (containerRef.current) observer.observe(containerRef.current);

        window.addEventListener("resize", updateRect);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateRect);
        };
    }, [active]);

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

    //==============================================
    //=============== Draft Actions ================
    //==============================================

    /**
   * Clears all bans and recalculates suggestions without any banned heroes
   */
    const handleClearBans = () => {
        if (!requestTutorialAction({ type: "clear-bans" })) return;
        setBannedHeroes([]);
    };

    /**
   * Handles selecting a hero by clicking on desktop
   * - Adds to ally or enemy draft depending on selected team
   * - Updates hero Pool if in edit mode
   * - Shows status message if in edit mode
   * @param {*} hero The hero object being interacted with
   */
    const handleHeroClick = (hero) => {
        if (!requestTutorialAction({
            type: editHeroPoolMode
                ? "pool-hero"
                : showHeroInspector ? "inspect" : "pick",
            value: editHeroPoolMode ? !heroPool.includes(hero.HeroId) : undefined,
            heroId: hero.HeroId,
            team: selectedTeam,
            source: "click",
        })) return;
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


        // Inspection changes only the candidate. Actual picks still use handleDrop.
        if (showHeroInspector) {
            setInspectedHero(hero);
            if (beforeTutorialAction) setSearchQuery("");
            return;
        }

        // === Draft Pick Logic ===
        handleDrop(hero, selectedTeam, "click");
    };

    /**
   * Handles dropping a hero card into a team (drag-and-drop).
   * @param {*} hero The hero object being dragged
   * @param {*} team The team the hero is being dragged to
   * @param {*} source From which state of the app the drop is being done
   */
    // The source distinguishes a normal click from a drag-and-drop tutorial action.
    const handleDrop = (hero, team, source = "drop") => {
        if (!requestTutorialAction({
            type: "pick",
            heroId: hero.HeroId,
            team,
            source,
        })) return;

        if (clickLockedHeroes.has(hero.HeroId)) return;
        if (bannedHeroes.some(h => h.HeroId === hero.HeroId)) return;

        setSelectedHeroes(prev => {
            const alreadyPicked =
                prev.ally.some(h => h.HeroId === hero.HeroId) ||
                prev.enemy.some(h => h.HeroId === hero.HeroId);

            if (alreadyPicked || prev[team].length >= 5) return prev;

            return {
                ...prev,
                [team]: [...prev[team], hero],
            };
        });

        if (beforeTutorialAction) setSearchQuery("");
    };

    /**
   * Deselects a hero from the team and updates synergy suggestions.
   * @param {*} hero The hero object being removed
   * @param {*} team The team the hero is being removed from
   */
    const handleHeroDeselect = (hero, team) => {

        if (!requestTutorialAction({
            type: "remove-pick",
            heroId: hero.HeroId,
            team,
        })) return;

        const newSelected = {
            ...selectedHeroes,
            [team]: selectedHeroes[team].filter(h => h.HeroId !== hero.HeroId),
        };

        setSelectedHeroes(newSelected);
    };

    /**
   * Clears all picks, bans, suggestions and locked heroes (not hero pool)
   */
    const handleClear = () => {
        if (!requestTutorialAction({ type: "clear-draft" })) return;

        setSelectedHeroes({ ally: [], enemy: [] });
        setBannedHeroes([]);
        setClickLockedHeroes(new Set());
    };

    /**
   * Removes a single hero from the bans
   * @param {*} hero The hero being removed from the bans
   */
    const handleBanRemove = (hero) => {
        if (!requestTutorialAction({ type: "unban" })) return;
        const updatedBans = bannedHeroes.filter(h => h.HeroId !== hero.HeroId);
        setBannedHeroes(updatedBans);
    };

    /**
   * Bans a hero (maximum of 16). Uses locking to prevent double-clicks.
   * @param {*} hero The hero object being banned
   */
    const handleHeroBan = (hero) => {
        if (!requestTutorialAction({ type: "ban", heroId: hero.HeroId }) ||
            bannedHeroes.length >= 16 ||
            clickLockedHeroes.has(hero.HeroId)) return;

        lockHero(hero.HeroId);

        const updatedBans = [...bannedHeroes, hero];

        setBannedHeroes(updatedBans);
        if (beforeTutorialAction) setSearchQuery("");

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
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const nameMatch = hero.name.toLowerCase().includes(query);
        const aliasMatch = hero.aliases?.some(alias => alias.toLowerCase().includes(query));
        return nameMatch || aliasMatch;
    };

    // Bring a matching unfinished lesson hero into view when searching.
    useEffect(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!active || !tutorialTargetHeroIds?.length || !query) return;

        const hero = tutorialTargetHeroIds
            .map(id => practiceDataset?.heroById.get(id))
            .find(candidate => candidate && (
                candidate.name.toLowerCase().includes(query) ||
                candidate.aliases?.some(alias => alias.toLowerCase().includes(query))
            ));

        if (!hero) return;

        containerRef.current
            ?.querySelector(`[data-hero-id="${hero.HeroId}"]`)
            ?.scrollIntoView({
                block: "nearest",
                inline: "nearest",
                behavior: "auto",
            });
    }, [active, tutorialTargetHeroIds, searchQuery, practiceDataset]);

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
            <div
                key={attr}
                className={`flex-1 min-w-0 border-2 rounded-lg p-ui-md space-y-ui-sm 2xl:p-ui-lg ${border} ${bg}`}
            >
                <h2 className={`text-xl font-bold mb-2 ${text}`}>{label}</h2>
                {/* Let each attribute panel choose how many readable cards fit across its width. */}
                <motion.div
                    layout="position"
                    className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,5.5rem),1fr))] gap-ui-sm transition-all duration-300 ease-in-out">
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
                                isPicked={!editHeroPoolMode && isPicked}
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
        <div
            className={`px-ui-sm pt-ui-sm bg-canvas text-ink h-full overflow-hidden flex flex-col transition-shadow duration-300
    ${editHeroPoolMode ? "shadow-[0_0_40px_10px_rgba(128,0,128,0.5)]" : ""}`}
        >
            {/* === Search Input (invisible, global key listener) === */}
            <input
                type="text"
                disabled={!tutorialSearchAllowed}
                className="opacity-0 absolute"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchInputRef}
            />
            {/* Drafting Panel with Title */}
            <DraftPanel
                teamLabels={teamLabels}
                selectedHeroes={selectedHeroes}
                selectedTeam={selectedTeam}
                handleTeamSwitch={handleTeamSwitch}
                canSwitchTeam={canSwitchTeam}
                teamSwitchKey={TEAM_SWITCH_KEY}
                sideButtonRunaway={tutorial?.sideButtonRunaway ?? false}
                toggleDraftOverview={toggleDraftOverview}
                draftOverviewKey={DRAFT_OVERVIEW_KEY}
                showHeroInspector={showHeroInspector}
                toggleHeroInspector={toggleHeroInspector}
                heroInspectorKey={HERO_INSPECTOR_KEY}
                inspectorButtonRef={inspectorButtonRef}
                handleDrop={handleDrop}
                handleHeroDeselect={handleHeroDeselect}
                rolePredictions={rolePredictions}
                setShowGuide={setShowGuide}
                infoButtonIcon={infoButtonIcon}
                buttonPulse={buttonPulse}
                setButtonPulse={setButtonPulse}
                editHeroPoolMode={editHeroPoolMode}
                onTogglePoolEdit={togglePoolEdit}
                handleClear={handleClear}
                handleClearBans={handleClearBans}
                bannedHeroes={bannedHeroes}
                handleBanRemove={handleBanRemove}
                gridMode={gridMode}
                setGridMode={setGridMode}
                requestTutorialAction={requestTutorialAction}
            />

            {/* Portals live outside the hidden workspace; suspend them explicitly. */}
            {active && showDraftOverview && (
                <DraftOverview
                    teamLabels={teamLabels}
                    selectedHeroes={selectedHeroes}
                    matchupIndex={matchupIndex}
                    heroes={heroes}
                    onClose={closeDraftOverview}
                    shortcutKey={DRAFT_OVERVIEW_KEY}
                    tutorialMode={Boolean(tutorial?.overviewLesson)}
                    bottomInset={tutorial?.overviewLesson?.bottomInset ?? 0}
                    tutorialTarget={tutorial?.highlight}
                />
            )}

            {active && <AnimatePresence>
                {showHeroInspector && (
                    <HeroInspector
                        key="hero-inspector"
                        teamLabels={teamLabels}
                        inspection={heroInspection}
                        selectedTeam={selectedTeam}
                        onPick={handleDrop}
                        onClose={closeHeroInspector}
                        shortcutKey={HERO_INSPECTOR_KEY}
                        initialPosition={inspectorPosition}
                        onPositionChange={setInspectorPosition}
                        triggerRef={inspectorButtonRef}
                        beforeMove={beforeInspectorMove}
                        onMoved={reportInspectorMoved}
                        bottomInset={tutorial?.inspectorLesson?.bottomInset ?? 0}
                    />
                )}
            </AnimatePresence>}

            {/* Main Hero Grid Area */}
            <div
                className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(17rem,22vw,22rem)] gap-ui-md overflow-hidden"
            >
                <div
                    ref={containerRef}
                    data-tutorial-target="hero-grid"
                    className="relative col-start-1 row-start-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pb-16"
                >
                    {searchQuery && containerRect && (
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

                {/* Share the hero column's grid cell so cards scroll behind the glass. */}
                <footer className="ui-footer col-start-1 row-start-1 self-end">
                    {!isPractice && <ReportIssueButton />}
                </footer>

                {/* === Sidebar Panel (suggestions / full draft analysis) === */}
                <Sidebar
                    onSettingsSaved={matchFeedback.onSettingsSaved}
                    matchFeedback={matchFeedback}
                    feedbackHeroes={heroes}
                    active={active}
                    isPractice={isPractice}
                    onStartTutorial={onStartTutorial}
                    tutorialLoading={tutorialLoading}
                    tutorialError={tutorialError}
                    teamLabels={teamLabels}
                    recommendationTeam={recommendationTeam}
                    recommendationDraft={recommendationDraft}
                    onRecommendationSwitch={handleRecommendationSwitch}
                    poolSuggestions={poolSuggestions}
                    globalSuggestions={globalSuggestions}
                    selectedHeroes={selectedHeroes}
                    hoveredHero={hoveredHero}
                    setHoveredHero={setHoveredHero}
                    hoveredSuggestedHero={hoveredSuggestedHero}
                    setHoveredSuggestedHero={setHoveredSuggestedHero}
                    matchupIndex={matchupIndex}
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
                    showWinrateInfo={showWinrateInfo}
                    setShowWinrateInfo={setShowWinrateInfo}
                    draftWinProbability={draftWinProbability}
                    getWinProbability={getWinProbability}
                    hasPicks={hasPicks}
                    infoButtonIcon={infoButtonIcon}
                    questionMarkIcon={questionMarkIcon}
                    patch={datasetManifest?.patch}
                    lastUpdated={
                        datasetManifest?.generatedAt
                            ? new Date(datasetManifest.generatedAt).toLocaleDateString()
                            : null
                    }
                    requestTutorialAction={requestTutorialAction}
                    comparisonLabel={tutorial?.comparisonLabel}
                    onRecommendationHover={tutorial?.onRecommendationHover}
                    pinnedRecommendation={tutorial?.pinnedRecommendation}
                    breakdownBottomInset={tutorial?.breakdownBottomInset}
                    suppressRecommendationTooltip={tutorial?.suppressRecommendationTooltip}
                    poolTutorial={tutorial?.poolLesson}
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