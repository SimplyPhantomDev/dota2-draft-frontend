import { useLayoutEffect, useRef, useState } from "react";
import TutorialDialogue from "./TutorialDialogue";
import tutorialScript from "./tutorialScript.json";

const WELCOME = tutorialScript.welcome;

export default function TutorialWelcome({
  onNext,
  onExit,
  portraitSrc = null,
  narratorName = "Your guide",
}) {
  const dialogRef = useRef(null);
  const [page, setPage] = useState(0);

  // Only the introduction is modal; the shared stage supplies its dimming.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function finishWelcome() {
    const { left, top, width, height } =
      dialogRef.current.getBoundingClientRect();

    onNext({ left, top, width, height });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tutorial-welcome-title"
      aria-describedby="tutorial-welcome-text"
      className="ui-panel m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden p-0 text-ink backdrop:bg-transparent open:flex open:flex-col"
      onKeyDown={event => event.stopPropagation()}
      onCancel={event => {
        event.preventDefault();
        onExit();
      }}
    >
      <TutorialDialogue
        title={WELCOME.title}
        line={WELCOME.lines[page]}
        reserveLines={WELCOME.lines}
        pageLabel={`${page + 1} / ${WELCOME.lines.length}`}
        onNext={() => page < WELCOME.lines.length - 1
          ? setPage(page + 1)
          : finishWelcome()}
        onSkip={finishWelcome}
        onExit={onExit}
        skipLabel="Skip the welcome"
        autoFocusNext
        titleId="tutorial-welcome-title"
        textId="tutorial-welcome-text"
        portraitSrc={portraitSrc}
        narratorName={narratorName}
      />
    </dialog>
  );
}