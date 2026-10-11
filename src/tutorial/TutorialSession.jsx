import { useState } from "react";
import HeroList from "../pages/HeroList";
import TutorialWelcome from "./TutorialWelcome";

export default function TutorialSession({ dataset, onExit }) {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <section className="flex h-full min-h-0 flex-col">
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

      <div className="min-h-0 flex-1">
        <HeroList practiceDataset={dataset} />
      </div>

      {showWelcome && (
        <TutorialWelcome
          onNext={() => setShowWelcome(false)}
          onExit={onExit}
        />
      )}
    </section>
  );
}