import { useCallback, useMemo, useRef, useState } from "react";
import HeroList from "../pages/HeroList";
import TutorialWelcome from "./TutorialWelcome";
import TutorialDialogue from "./TutorialDialogue";
import TutorialStage from "./TutorialStage";
import tutorialScript from "./tutorialScript.json";

const LESSON = tutorialScript.firstPick;
const SUCCESS_PAGE = LESSON.lines.findIndex(
  line => line.id === LESSON.successLineId
);

export default function TutorialSession({ dataset, onExit }) {
  const [phase, setPhase] = useState("welcome");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [practiceSeed, setPracticeSeed] = useState(null);
  const [completedLineId, setCompletedLineId] = useState(null);
  const [initialFrame, setInitialFrame] = useState(null);

  const workspaceRef = useRef(null);
  const lastInterruptionRef = useRef(0);
  const line = LESSON.lines[page];

  const spotlight = phase === "first-pick"
    && !(line.releaseHighlightOnComplete && completedLineId === line.id)
    ? line.highlight ?? null
    : null;

  const onLineComplete = useCallback(
    id => setCompletedLineId(id),
    []
  );

  const beforeAction = useCallback(action => {
    if (phase !== "first-pick") return true;

    // Accept Dazzle before the search explanation without requiring typing.
    if (
      !picked
      && action.type === "pick"
      && action.source === "click"
      && action.heroId === LESSON.heroId
      && action.team === "ally"
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
  }, [phase, picked]);

  const onDraftChange = useCallback(draft => {
    if (phase !== "first-pick" || picked) return;

    if (draft.ally.some(hero => hero.HeroId === LESSON.heroId)) {
      setPicked(true);
      setFeedback("");
      setPage(SUCCESS_PAGE);
    }
  }, [phase, picked]);

  const tutorial = useMemo(() => phase === "first-pick" ? {
    beforeAction,
    onDraftChange,
    highlight: spotlight,
    targetHeroId: picked ? null : LESSON.heroId,
  } : null, [phase, beforeAction, onDraftChange, spotlight, picked]);

  function advanceLesson() {
    if (line.waitForPick && !picked) return;

    setFeedback("");

    if (page < LESSON.lines.length - 1) setPage(page + 1);
    else setPhase("practice");
  }

  function skipLesson() {
    // Later lessons can rely on Dazzle being present when this lesson is skipped.
    setPracticeSeed({
      ally: [LESSON.heroId],
      enemy: [],
      bans: [],
      team: "ally",
    });
    setPhase("practice");
    setFeedback("");
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      onKeyDown={event => {
        if (phase === "first-pick" && event.key === "Escape") {
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

      <div ref={workspaceRef} className="min-h-0 flex-1">
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
          showDialogue={phase === "first-pick"}
        >
          <TutorialDialogue
            compact
            title={LESSON.title}
            titleId="first-pick-title"
            textId="first-pick-text"
            line={line}
            reserveLines={LESSON.lines}
            pageLabel={`${page + 1} / ${LESSON.lines.length}`}
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