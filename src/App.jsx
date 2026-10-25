import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import HeroList from "./pages/HeroList";
import { loadTutorialDataset } from "./tutorial/loadTutorialDataset";
import TutorialSession from "./tutorial/TutorialSession";

function App() {
    const [tutorialDataset, setTutorialDataset] = useState(null);
    const [tutorialLoading, setTutorialLoading] = useState(false);
    const [tutorialError, setTutorialError] = useState("");
    const startingRef = useRef(false);
    const previousFocusRef = useRef(null);
    const normalActive = !tutorialLoading && !tutorialDataset;

    const startTutorial = useCallback(async () => {
        if (startingRef.current) return;

        startingRef.current = true;
        previousFocusRef.current = document.activeElement;
        setTutorialError("");
        setTutorialLoading(true);

        try {
            setTutorialDataset(await loadTutorialDataset());
        } catch (error) {
            console.error("Could not load tutorial data:", error);
            setTutorialError("The tutorial could not be opened. Please try again.");
        } finally {
            startingRef.current = false;
            setTutorialLoading(false);
        }
    }, []);

    // Restore focus after leaving practice or a failed loading attempt.
    useLayoutEffect(() => {
        if (!normalActive) return;

        const target = previousFocusRef.current;
        previousFocusRef.current = null;

        if (target?.isConnected) {
            target.focus({ preventScroll: true });
        }
    }, [normalActive]);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-screen overflow-hidden bg-canvas text-ink">
                {/* Preserve the real draft; practice owns separate state and data. */}
                <div
                    className="h-full"
                    hidden={Boolean(tutorialDataset)}
                    inert={!normalActive}
                >
                    <HeroList
                        active={normalActive}
                        onStartTutorial={startTutorial}
                        tutorialLoading={tutorialLoading}
                        tutorialError={tutorialError}
                    />
                </div>

                {tutorialDataset && (
                    <TutorialSession
                        dataset={tutorialDataset}
                        onExit={() => setTutorialDataset(null)}
                    />
                )}
            </div>
        </DndProvider>
    );
}

export default App;