import { useCallback, useMemo, useRef, useState } from "react";
import HeroList from "../pages/HeroList";
import TutorialWelcome from "./TutorialWelcome";
import TutorialDialogue from "./TutorialDialogue";
import TutorialStage from "./TutorialStage";
import tutorialScript from "./tutorialScript.json";
import { calculateSynergyPicks } from "../utils/synergy";

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
    nextPhase: "practice",
    endDraft: {
      ally: [tutorialScript.firstPick.heroId],
      enemy: [tutorialScript.pickingSide.heroId],
      bans: [],
      team: "enemy",
    },
  },
};

export default function TutorialSession({ dataset, onExit }) {
  const [phase, setPhase] = useState("welcome");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(false);
  const [pickingSide, setPickingSide] = useState("ally");
  const [feedback, setFeedback] = useState("");
  const [practiceSeed, setPracticeSeed] = useState(null);
  const [completedLineId, setCompletedLineId] = useState(null);
  const [initialFrame, setInitialFrame] = useState(null);
  const [beforeRecommendations, setBeforeRecommendations] = useState(null);
  const [dialogueReserve, setDialogueReserve] = useState(0);

  const workspaceRef = useRef(null);
  const lastInterruptionRef = useRef(0);

  const isLesson = Boolean(LESSONS[phase]);
  const lesson = LESSONS[phase] ?? LESSONS["first-pick"];
  const script = lesson.script;
  const line = script.lines[page];
  const successPage = script.lines.findIndex(
    item => item.id === script.successLineId
  );

  const showComparison = isLesson
    && picked
    && line.compareRecommendations === true
    && beforeRecommendations !== null;

  const lineHighlight = line.highlightByPickingSide?.[pickingSide]
    ?? line.highlight
    ?? null;

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
      return true;
    }

    // The lesson accepts only a left-click pick of its hero for its team.
    if (
      !picked
      && action.type === "pick"
      && action.source === "click"
      && action.heroId === script.heroId
      && action.team === lesson.team
    ) {
      return true;
    }

    const now = Date.now();

    if (now - lastInterruptionRef.current >= 1500) {
      lastInterruptionRef.current = now;
      const replies = tutorialScript.interruptions;
      setFeedback(replies[Math.floor(Math.random() * replies.length)].text);
    }

    return false;
  }, [isLesson, lesson, script, picked]);

  const onDraftChange = useCallback((draft, team) => {
    setPickingSide(team);

    if (!isLesson || picked) return;

    if (draft[lesson.team].some(hero => hero.HeroId === script.heroId)) {
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

      setPicked(true);
      setFeedback("");
      setPage(successPage);
    }
  }, [isLesson, lesson, script, successPage, picked, phase, dataset]);

  const tutorial = useMemo(() => isLesson ? {
    beforeAction,
    onDraftChange,
    highlight: spotlight,
    comparisonLabel: showComparison ? "After" : null,
    targetHeroId: picked ? null : script.heroId,
  } : null, [
    isLesson,
    beforeAction,
    onDraftChange,
    spotlight,
    picked,
    script,
    showComparison,
  ]);

  function finishLesson() {
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
    if (line.waitForPick && !picked) return;

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
        >
          <TutorialDialogue
            compact
            title={script.title}
            titleId="tutorial-lesson-title"
            textId="tutorial-lesson-text"
            line={line}
            reserveLines={script.lines}
            pageLabel={`${page + 1} / ${script.lines.length}`}
            canAdvance={!line.waitForPick || picked}
            hint={line.hint}
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