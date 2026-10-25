import { useCallback, useMemo, useRef, useState } from "react";
import HeroList from "../pages/HeroList";
import TutorialWelcome from "./TutorialWelcome";
import TutorialDialogue from "./TutorialDialogue";
import TutorialStage from "./TutorialStage";
import tutorialScript from "./tutorialScript.json";
import { calculateSynergyPicks } from "../utils/synergy";
import { useDragLayer } from "react-dnd";
import useSideSwitchEasterEgg from "./useSideSwitchEasterEgg";

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
    nextPhase: "practice",
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
};

export default function TutorialSession({ dataset, onExit }) {
  const [phase, setPhase] = useState("welcome");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(false);
  const [pickingSide, setPickingSide] = useState("ally");
  const [practiceDraft, setPracticeDraft] = useState({ ally: [], enemy: [] });
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
  const script = lesson.script;

  const line = script.lines[page];
  const successPage = script.lines.findIndex(
    item => item.id === script.successLineId
  );

  // Removal and banning lessons have no required picks.
  const requiredPicks = useMemo(() => script.picks ?? (
    lesson.team ? [{ heroId: script.heroId, team: lesson.team }] : []
  ), [script, lesson.team]);

  const targetHeroIds = useMemo(() => {
    if (line.action?.type === "ban") return [line.action.heroId];
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

  const lineHighlight = sideButtonRunaway ? "hero-grid" : (
    line.highlightWhileDragging?.[draggedHeroId]
    ?? line.highlightByPickingSide?.[pickingSide]
    ?? line.highlight
    ?? null
  );
  const spotlight = isLesson
    && !(line.releaseHighlightOnComplete && completedLineId === line.id)
    ? lineHighlight
    : null;

  const onLineComplete = useCallback(
    id => setCompletedLineId(id),
    []
  );

  const beforeAction = useCallback(action => {
    if (!isLesson) return true;

    if (!picked && lesson.allowTeamSwitch && action.type === "team-switch") {
      recordSwitch(action.source);
      return true;
    }

    // Another attempted action ends the consecutive-click streak.
    breakStreak();

    const expectedAction = line.action;

    if (
      expectedAction
      && action.type === expectedAction.type
      && action.heroId === expectedAction.heroId
      && (!expectedAction.team || action.team === expectedAction.team)
    ) {
      setFeedback("");
      return true;
    }

    // Enforce the requested input method and each hero's destination.
    if (
      !picked
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
  }, [isLesson, lesson, requiredPicks, picked, line.action, phase, recordSwitch, breakStreak]);

  const onDraftChange = useCallback((draft, team, bans = []) => {
    setPickingSide(team);
    setPracticeDraft(draft);

    if (!isLesson || picked) return;

    const expectedAction = line.action;

    if (expectedAction) {
      const complete = expectedAction.type === "remove-pick"
        ? !draft[expectedAction.team].some(
          hero => hero.HeroId === expectedAction.heroId
        )
        : expectedAction.type === "ban"
        && bans.some(hero => hero.HeroId === expectedAction.heroId);

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

  const tutorial = useMemo(() => isLesson ? {
    beforeAction,
    onDraftChange,
    highlight: spotlight,
    comparisonLabel: showComparison ? "AFTER" : null,
    targetHeroIds,
    sideButtonRunaway,
  } : null, [
    isLesson,
    beforeAction,
    onDraftChange,
    spotlight,
    showComparison,
    targetHeroIds,
    sideButtonRunaway,
  ]);


  function finishLesson() {
    resetSideSwitches();
    setBeforeRecommendations(null);
    setDialogueReserve(0);
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
    // Preserve the exact draft expected by the following lesson.
    setPracticeSeed(lesson.endDraft);
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
        style={{ paddingBottom: showComparison ? dialogueReserve : 0 }}
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
          placement={line.placement ?? "over-sidebar"}
          initialFrame={initialFrame}
          showDialogue={isLesson}
          comparisonRows={showComparison ? beforeRecommendations : null}
          onReserveSpace={setDialogueReserve}
          pointToBonus={line.pointToBonus}
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
              : line.hint}
            feedback={feedback}
            onNext={advanceLesson}
            onLineComplete={onLineComplete}
            onSkip={skipLesson}
            onExit={onExit}
          />
        </TutorialStage>
      )}
    </section>
  );
}