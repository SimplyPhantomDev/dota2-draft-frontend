import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeroList from "../pages/HeroList";
import TutorialWelcome from "./TutorialWelcome";
import TutorialDialogue from "./TutorialDialogue";
import TutorialStage from "./TutorialStage";
import tutorialScript from "./tutorialScript.json";
import { calculateSynergyPicks } from "../utils/synergy";
import { useDragLayer } from "react-dnd";
import useSideSwitchEasterEgg from "./useSideSwitchEasterEgg";
import {
    canPerformPoolAction,
    isPoolTaskComplete,
    personalizePoolScript,
} from "./heroPoolLesson";

const LESSONS = {
    "first-pick": {
        script: tutorialScript.firstPick,
        team: "ally",
        nextPhase: "picking-side",
        endDraft: {
            ally: [tutorialScript.firstPick.heroId],
            enemy: [],
            bans: [],
            team: "ally",
        },
    },
    "picking-side": {
        script: tutorialScript.pickingSide,
        team: "enemy",
        allowTeamSwitch: true,
        nextPhase: "dragging",
        endDraft: {
            ally: [tutorialScript.firstPick.heroId],
            enemy: [tutorialScript.pickingSide.heroId],
            bans: [],
            team: "enemy",
        },
    },
    "dragging": {
        script: tutorialScript.dragging,
        pickSource: "drop",
        nextPhase: "ban-and-correction",
        endDraft: {
            ally: [
                tutorialScript.firstPick.heroId,
                ...tutorialScript.dragging.picks
                    .filter(pick => pick.team === "ally")
                    .map(pick => pick.heroId),
            ],
            enemy: [
                tutorialScript.pickingSide.heroId,
                ...tutorialScript.dragging.picks
                    .filter(pick => pick.team === "enemy")
                    .map(pick => pick.heroId),
            ],
            bans: [],
            team: "enemy",
        },
    },
    "ban-and-correction": {
        script: tutorialScript.banAndCorrection,
        nextPhase: "recommendations",
        endDraft: {
            ally: [
                tutorialScript.firstPick.heroId,
                ...tutorialScript.dragging.picks
                    .filter(pick => pick.team === "ally")
                    .map(pick => pick.heroId),
            ],
            enemy: [tutorialScript.pickingSide.heroId],
            bans: [tutorialScript.banAndCorrection.heroId],
            team: "enemy",
        },
    },
    "recommendations": {
        script: tutorialScript.recommendations,
        nextPhase: "hero-pool",
        endDraft: {
            ally: [
                tutorialScript.firstPick.heroId,
                ...tutorialScript.dragging.picks
                    .filter(pick => pick.team === "ally")
                    .map(pick => pick.heroId),
                tutorialScript.recommendations.heroId,
            ],
            enemy: [tutorialScript.pickingSide.heroId],
            bans: [tutorialScript.banAndCorrection.heroId],
            team: "ally",
            roleFilter: "Support",
        },
    },
    "hero-pool": {
        script: tutorialScript.heroPool,
        nextPhase: "practice",
        endDraft: {
            ally: [
                tutorialScript.firstPick.heroId,
                ...tutorialScript.dragging.picks
                    .filter(pick => pick.team === "ally")
                    .map(pick => pick.heroId),
                tutorialScript.recommendations.heroId,
            ],
            enemy: [tutorialScript.pickingSide.heroId],
            bans: [tutorialScript.banAndCorrection.heroId],
            team: "ally",
            roleFilter: null,
            heroPool: tutorialScript.heroPool.skipHeroIds,
            filterByHeroPool: true,
        },
    },
};

export default function TutorialSession({ dataset, onExit }) {
    const [phase, setPhase] = useState("welcome");
    const [page, setPage] = useState(0);
    const [picked, setPicked] = useState(false);
    const [pickingSide, setPickingSide] = useState("ally");
    const [practiceDraft, setPracticeDraft] = useState({ ally: [], enemy: [] });
    const [practiceRoleFilter, setPracticeRoleFilter] = useState(null);
    const [practiceBans, setPracticeBans] = useState([]);
    const [poolState, setPoolState] = useState({
        heroPool: [],
        editing: false,
        filtering: false,
        breakdownOpen: false,
    });
    const [poolChoices, setPoolChoices] = useState([]);
    const [highlightReadyId, setHighlightReadyId] = useState(null);
    const pendingPoolAction = useRef(null);
    const [pinnedRecommendation, setPinnedRecommendation] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [practiceSeed, setPracticeSeed] = useState(null);
    const [completedLineId, setCompletedLineId] = useState(null);
    const [initialFrame, setInitialFrame] = useState(null);
    const [beforeRecommendations, setBeforeRecommendations] = useState(null);
    const [dialogueReserve, setDialogueReserve] = useState(0);

    const workspaceRef = useRef(null);
    const lastInterruptionRef = useRef(0);
    const {
        escaped: sideButtonRunaway,
        recordSwitch,
        breakStreak,
        reset: resetSideSwitches,
    } = useSideSwitchEasterEgg(
        tutorialScript.sideSwitchEasterEgg,
        setFeedback
    );

    const isLesson = Boolean(LESSONS[phase]);
    const lesson = LESSONS[phase] ?? LESSONS["first-pick"];
    const script = useMemo(() => phase === "hero-pool"
        ? personalizePoolScript(
            lesson.script,
            poolChoices,
            dataset.heroById,
            practiceDraft,
            practiceBans
        )
        : lesson.script,
    [phase, lesson, poolChoices, dataset.heroById, practiceDraft, practiceBans]);

    const line = script.lines[page];
    const successPage = script.lines.findIndex(
        item => item.id === script.successLineId
    );

    // Removal and banning lessons have no required picks.
    const requiredPicks = useMemo(() => script.picks ?? (
        lesson.team ? [{ heroId: script.heroId, team: lesson.team }] : []
    ), [script, lesson.team]);

    const targetHeroIds = useMemo(() => {
        if (["ban", "pick"].includes(line.action?.type)) {
            return [line.action.heroId];
        }
        if (picked) return [];

        return requiredPicks
            .filter(pick => !practiceDraft[pick.team].some(
                hero => hero.HeroId === pick.heroId
            ))
            .map(pick => pick.heroId);
    }, [line.action, picked, requiredPicks, practiceDraft]);

    const draggedHeroId = useDragLayer(monitor => monitor.isDragging()
        ? monitor.getItem()?.hero?.HeroId ?? null
        : null);

    // Action pages advance after the committed draft confirms the action.
    const waitingForInput = Boolean(
        line.action || (line.waitForPick && !picked)
    );

    const showComparison = isLesson
        && picked
        && line.compareRecommendations === true
        && beforeRecommendations !== null;

    const showPinnedBreakdown = Boolean(
        pinnedRecommendation && line.keepBreakdown
    );

    const requiredRole = line.action?.requiresRoleFilter;

    const dialoguePlacement = requiredRole && practiceRoleFilter !== requiredRole
        ? "beside-sidebar"
        : line.placement ?? "over-sidebar";

    const taskHighlight = requiredRole
        ? practiceRoleFilter !== requiredRole
            ? "support-filter"
            : pickingSide !== line.action.team
                ? sideButtonRunaway ? "hero-grid" : "picking-side"
                : "hero-grid"
        : null;

    const poolTaskHighlight = line.action?.type === "pool-select"
        ? poolState.editing ? "hero-grid" : "pool-edit"
        : null;

    const cuePending = line.highlightAfter && highlightReadyId !== line.id;

    const lineHighlight = cuePending
        ? line.highlightBefore ?? null
        : poolTaskHighlight ?? taskHighlight ?? (
            sideButtonRunaway ? "hero-grid" : (
                line.highlightWhileDragging?.[draggedHeroId]
                ?? line.highlightByPickingSide?.[pickingSide]
                ?? line.highlight
                ?? null
            )
        );
    const spotlight = isLesson
        && !(line.releaseHighlightOnComplete && completedLineId === line.id)
        ? lineHighlight
        : null;

    const onLineComplete = useCallback(
        id => setCompletedLineId(id),
        []
    );

    const onHighlightReady = useCallback(id => setHighlightReadyId(id), []);
    const onPoolChange = useCallback(state => setPoolState(state), []);

    // Wait for an accepted input AND its committed UI state. Restoring a skip
    // seed must never complete the next task without the user's input.
    useEffect(() => {
        if (phase !== "hero-pool"
            || pendingPoolAction.current !== line.id
            || !isPoolTaskComplete(line.action, poolState, practiceRoleFilter)) return;

        pendingPoolAction.current = null;

        if (line.action.type === "pool-select") {
            setPoolChoices([...poolState.heroPool]);
        }

        resetSideSwitches();
        setFeedback("");
        setPage(script.lines.findIndex(
            item => item.id === line.action.successLineId
        ));
    }, [
        phase,
        line,
        poolState,
        practiceRoleFilter,
        script.lines,
        resetSideSwitches,
    ]);

    const beforeAction = useCallback(action => {
        if (!isLesson) return true;

        const poolLesson = phase === "hero-pool";

        if (poolLesson
            && canPerformPoolAction(
                action,
                line.action,
                poolState,
                dataset.heroById
            )) {
            pendingPoolAction.current = line.id;
            setFeedback("");
            return true;
        }

        if (
            !poolLesson
            && !picked
            && (lesson.allowTeamSwitch || line.action?.allowTeamSwitch)
            && action.type === "team-switch"
        ) {
            recordSwitch(action.source);
            return true;
        }

        // Another attempted action ends the consecutive-click streak.
        breakStreak();

        const expectedAction = line.action;

        if (
            !poolLesson
            && action.type === "role-filter"
            && expectedAction?.requiresRoleFilter === action.value
        ) {
            setFeedback("");
            return true;
        }

        if (
            !poolLesson
            && expectedAction
            && action.type === expectedAction.type
            && action.heroId === expectedAction.heroId
            && (!expectedAction.team || action.team === expectedAction.team)
            && (!expectedAction.source || action.source === expectedAction.source)
            && (!expectedAction.requiresRoleFilter
                || practiceRoleFilter === expectedAction.requiresRoleFilter)
        ) {
            setFeedback("");
            return true;
        }

        // Enforce the requested input method and each hero's destination.
        if (
            !poolLesson
            && !picked
            && action.type === "pick"
            && action.source === (lesson.pickSource ?? "click")
            && requiredPicks.some(pick =>
                pick.heroId === action.heroId && pick.team === action.team
            )
        ) {
            setFeedback("");
            return true;
        }

        const context = {
            ...action,
            phase,
            expectedAction: expectedAction?.type,
        };

        const specificReply = tutorialScript.interruptions.find(reply =>
            reply.when
            && Object.entries(reply.when).every(([key, expected]) =>
                Array.isArray(expected)
                    ? expected.includes(context[key])
                    : context[key] === expected
            )
        );

        // A relevant reply takes priority, even during the generic cooldown.
        if (specificReply) {
            lastInterruptionRef.current = Date.now();
            setFeedback(specificReply.text);
            return false;
        }

        const now = Date.now();
        const replies = tutorialScript.interruptions.filter(reply => !reply.when);

        if (replies.length > 0 && now - lastInterruptionRef.current >= 1500) {
            lastInterruptionRef.current = now;
            setFeedback(replies[Math.floor(Math.random() * replies.length)].text);
        }

        return false;
    }, [
        isLesson,
        lesson,
        requiredPicks,
        picked,
        line.action,
        line.id,
        phase,
        recordSwitch,
        breakStreak,
        practiceRoleFilter,
        poolState,
        dataset.heroById,
    ]);

    const onDraftChange = useCallback((draft, team, bans = [], roleFilter = null) => {
        setPickingSide(team);
        setPracticeDraft(draft);
        setPracticeRoleFilter(roleFilter);
        setPracticeBans(bans);

        if (!isLesson || picked || phase === "hero-pool") return;

        const expectedAction = line.action;

        if (expectedAction) {
            const complete = expectedAction.type === "remove-pick"
                ? !draft[expectedAction.team].some(
                    hero => hero.HeroId === expectedAction.heroId
                )
                : expectedAction.type === "ban"
                    ? bans.some(hero => hero.HeroId === expectedAction.heroId)
                    : expectedAction.type === "pick"
                    && draft[expectedAction.team].some(
                        hero => hero.HeroId === expectedAction.heroId
                    )
                    && (!expectedAction.requiresRoleFilter
                        || roleFilter === expectedAction.requiresRoleFilter);

            if (complete) {
                resetSideSwitches();
                setFeedback("");
                setPage(script.lines.findIndex(
                    item => item.id === expectedAction.successLineId
                ));
            }

            return;
        }

        if (requiredPicks.length === 0) return;

        const complete = requiredPicks.every(pick =>
            draft[pick.team].some(hero => hero.HeroId === pick.heroId)
        );

        if (complete) {
            if (phase === "picking-side") {
                // Recreate the exact draft before Weaver using the shared scoring engine.
                // This avoids capturing stale rows while the live sidebar recalculates.
                const before = calculateSynergyPicks({
                    allyHeroIds: draft.ally.map(hero => hero.HeroId),
                    enemyHeroIds: draft.enemy
                        .filter(hero => hero.HeroId !== script.heroId)
                        .map(hero => hero.HeroId),
                    heroes: dataset.heroes,
                    matchupIndex: dataset.matchupIndex,
                });

                setBeforeRecommendations(before?.outPool.slice(0, 10) ?? []);
            }

            resetSideSwitches();
            setPicked(true);
            setFeedback("");
            setPage(successPage);
        }
    }, [isLesson, script, requiredPicks, successPage, picked, phase, dataset, line.action, resetSideSwitches]);

    const onRecommendationHover = useCallback((hero, point) => {
        const expectedAction = line.action;

        if (
            !isLesson
            || expectedAction?.type !== "hover-recommendation"
            || hero.HeroId !== expectedAction.heroId
        ) return;

        resetSideSwitches();

        setPinnedRecommendation({
            hero,
            point,
            draft: {
                ally: [...practiceDraft.ally],
                enemy: [...practiceDraft.enemy],
            },
        });

        setFeedback("");
        setPage(script.lines.findIndex(
            item => item.id === expectedAction.successLineId
        ));
    }, [isLesson, line.action, practiceDraft, script, resetSideSwitches]);

    const tutorial = useMemo(() => isLesson ? {
        beforeAction,
        onDraftChange,
        onPoolChange,
        poolLesson: phase === "hero-pool"
            ? { bottomInset: dialogueReserve }
            : null,
        allowSearch: phase !== "hero-pool"
            || line.action?.type === "pool-select",
        highlight: spotlight,
        comparisonLabel: showComparison ? "AFTER" : null,
        targetHeroIds,
        sideButtonRunaway,
        onRecommendationHover,
        pinnedRecommendation: showPinnedBreakdown ? pinnedRecommendation : null,
        breakdownBottomInset: showPinnedBreakdown ? dialogueReserve : 0,
        suppressRecommendationTooltip:
            ["recommendations", "hero-pool"].includes(phase),
    } : null, [
        isLesson,
        beforeAction,
        onDraftChange,
        spotlight,
        showComparison,
        targetHeroIds,
        sideButtonRunaway,
        onRecommendationHover,
        showPinnedBreakdown,
        pinnedRecommendation,
        dialogueReserve,
        phase,
        onPoolChange,
        line.action,
    ]);


    function finishLesson() {
        resetSideSwitches();
        setBeforeRecommendations(null);
        setDialogueReserve(0);
        setPinnedRecommendation(null);
        pendingPoolAction.current = null;
        setHighlightReadyId(null);
        setPage(0);
        setPicked(false);
        setFeedback("");
        setCompletedLineId(null);
        lastInterruptionRef.current = 0;
        setPhase(lesson.nextPhase);
    }

    function advanceLesson() {
        if (waitingForInput) return;

        breakStreak();
        setFeedback("");

        if (page < script.lines.length - 1) setPage(page + 1);
        else finishLesson();
    }

    function skipLesson() {
        // Preserve completed personal choices; otherwise provide five defaults.
        setPracticeSeed(phase === "hero-pool" ? {
            ...lesson.endDraft,
            heroPool: poolChoices.length === script.requiredHeroes
                ? poolChoices
                : poolState.heroPool.length === script.requiredHeroes
                    ? poolState.heroPool
                    : script.skipHeroIds,
        } : lesson.endDraft);

        finishLesson();
    }

    return (
        <section
            className="flex h-full min-h-0 flex-col"
            onKeyDown={event => {
                if (isLesson && event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    onExit();
                }
            }}
        >
            <header className="flex shrink-0 items-center justify-between gap-ui-md border-b border-line px-ui-md py-ui-xs">
                <div className="min-w-0">
                    <h1 className="text-sm font-semibold text-accent">
                        Tutorial practice
                    </h1>

                    <p className="text-xs text-ink-muted">
                        Fixed practice data
                        {dataset.manifest?.patch
                            ? ` · Patch ${dataset.manifest.patch}`
                            : ""}
                    </p>
                </div>

                <button
                    type="button"
                    className="ui-button shrink-0"
                    onClick={onExit}
                >
                    Exit tutorial
                </button>
            </header>

            <div
                ref={workspaceRef}
                className="min-h-0 flex-1"
                style={{ paddingBottom: dialogueReserve }}
            >
                <HeroList
                    practiceDataset={dataset}
                    tutorial={tutorial}
                    practiceSeed={practiceSeed}
                />
            </div>

            {phase === "welcome" && (
                <TutorialWelcome
                    onNext={rect => {
                        setInitialFrame(rect);
                        setPhase("first-pick");
                    }}
                    onExit={onExit}
                />
            )}

            {phase !== "practice" && (
                <TutorialStage
                    workspaceRef={workspaceRef}
                    target={spotlight}
                    placement={dialoguePlacement}
                    initialFrame={initialFrame}
                    showDialogue={isLesson}
                    comparisonRows={showComparison ? beforeRecommendations : null}
                    onReserveSpace={setDialogueReserve}
                    pointToBonus={line.pointToBonus}
                    dimBackground={line.dimBackground !== false}
                >
                    <TutorialDialogue
                        compact
                        title={script.title}
                        titleId="tutorial-lesson-title"
                        textId="tutorial-lesson-text"
                        line={line}
                        reserveLines={script.lines}
                        pageLabel={`${page + 1} / ${script.lines.length}`}
                        canAdvance={!waitingForInput}
                        hint={sideButtonRunaway
                            ? tutorialScript.sideSwitchEasterEgg.runawayHint
                            : line.action?.type === "pool-select"
                                ? `${line.hint} (${poolState.heroPool.length}/${script.requiredHeroes})`
                                : line.hint}
                        feedback={feedback}
                        onNext={advanceLesson}
                        onLineComplete={onLineComplete}
                        onHighlightReady={onHighlightReady}
                        onSkip={skipLesson}
                        onExit={onExit}
                    />
                </TutorialStage>
            )}
        </section>
    );
}