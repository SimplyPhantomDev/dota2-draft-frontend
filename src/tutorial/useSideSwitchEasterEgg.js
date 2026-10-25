import { useCallback, useRef, useState } from "react";

export default function useSideSwitchEasterEgg(config, onFeedback) {
    const clicks = useRef({ total: 0, streak: 0 });
    const [escaped, setEscaped] = useState(false);

    const breakStreak = useCallback(() => {
        clicks.current.streak = 0;
    }, []);

    const reset = useCallback(() => {
        clicks.current = { total: 0, streak: 0 };
        setEscaped(false);
    }, []);

    const recordSwitch = useCallback(source => {
        // Keyboard shortcuts remain available when the button escapes.
        if (source !== "pointer") {
            breakStreak();
            onFeedback("");
            return;
        }

        const count = clicks.current;
        count.total += 1;
        count.streak += 1;

        if (count.total === config.escapeAfter) {
            onFeedback(config.escapeText);
        } else if (count.streak === config.warnAfter) {
            onFeedback(config.text);
        } else if (count.streak === 1) {
            onFeedback("");
        }

        if (count.total >= config.escapeAfter) setEscaped(true);
    }, [config, onFeedback, breakStreak]);

    return { escaped, recordSwitch, breakStreak, reset };
}