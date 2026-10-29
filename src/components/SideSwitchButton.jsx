import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { startDash, stepMotion } from "./runawayMotion";

export default function SideSwitchButton({
    teamLabels,
    selectedTeam,
    canSwitchTeam,
    teamSwitchKey,
    onSwitch,
    runaway = false,
}) {
    const homeRef = useRef(null);
    const flyingRef = useRef(null);
    const pointerRef = useRef(null);
    const motionRef = useRef(null);
    const boundsRef = useRef(null);
    const [position, setPosition] = useState(null);

    const reducedMotionRef = useRef(false);
    reducedMotionRef.current = Boolean(useReducedMotion());

    const paint = useCallback(() => {
        const body = motionRef.current;
        const node = flyingRef.current;

        if (!body || !node) return;

        const transform = `translate3d(${body.x}px, ${body.y}px, 0)`;

        if (node.style.transform !== transform) {
            node.style.transform = transform;
        }
    }, []);

    const attachFlyingRef = useCallback(node => {
        flyingRef.current = node;
        paint();
    }, [paint]);

    const panic = useCallback(() => {
        const body = motionRef.current;
        const bounds = boundsRef.current;

        if (!body || !bounds || !pointerRef.current) return;

        startDash(body, pointerRef.current, bounds);
        stepMotion(
            body,
            pointerRef.current,
            bounds,
            1 / 120,
            reducedMotionRef.current
        );

        paint();
    }, [paint]);

    useLayoutEffect(() => {
        if (!runaway) {
            motionRef.current = null;
            setPosition(null);
            return;
        }

        const home = homeRef.current.getBoundingClientRect();

        motionRef.current = {
            x: home.left,
            y: home.top,
            width: home.width,
            height: home.height,
            vx: 0,
            vy: 0,
            cooldown: 0,
            dash: null,
        };

        function resize() {
            const rect = homeRef.current.getBoundingClientRect();
            const body = motionRef.current;

            body.width = Math.min(
                rect.width,
                Math.max(1, window.innerWidth - 16)
            );
            body.height = Math.min(
                rect.height,
                Math.max(1, window.innerHeight - 16)
            );

            const bounds = {
                minX: 8,
                minY: 8,
                maxX: Math.max(8, window.innerWidth - body.width - 8),
                maxY: Math.max(8, window.innerHeight - body.height - 8),
            };

            boundsRef.current = bounds;

            body.x = Math.max(bounds.minX, Math.min(bounds.maxX, body.x));
            body.y = Math.max(bounds.minY, Math.min(bounds.maxY, body.y));
            body.dash = null;
            body.vx = body.vy = 0;

            setPosition({ width: body.width, height: body.height });
            paint();
        }

        resize();

        let frame;
        let previousTime = null;

        function tick(time) {
            const elapsed = previousTime === null
                ? 1 / 60
                : (time - previousTime) / 1000;

            previousTime = time;

            stepMotion(
                motionRef.current,
                pointerRef.current,
                boundsRef.current,
                elapsed,
                reducedMotionRef.current
            );

            paint();
            frame = requestAnimationFrame(tick);
        }

        function move(event) {
            pointerRef.current = {
                x: event.clientX,
                y: event.clientY,
            };
        }

        function leave(event) {
            if (!event.relatedTarget) pointerRef.current = null;
        }

        const observer = new ResizeObserver(resize);
        observer.observe(homeRef.current);

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerout", leave);
        window.addEventListener("resize", resize);

        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerout", leave);
            window.removeEventListener("resize", resize);
        };
    }, [runaway, paint]);


    const className = `inline-grid place-items-center whitespace-nowrap px-ui-sm py-ui-xs font-serif rounded-full text-white text-sm font-semibold text-center leading-tight 2xl:leading-5 transition-colors
    ${selectedTeam === "ally"
        ? "bg-green-600 hover:bg-green-700"
        : "bg-red-600 hover:bg-red-700"}
    ${!canSwitchTeam
        ? "bg-gray-500 cursor-not-allowed opacity-50"
        : ""}`;

    const label = (
        <>
            {Object.values(teamLabels).map(label => (
                <span
                    key={label}
                    aria-hidden="true"
                    className="invisible col-start-1 row-start-1"
                >
                    <span className="block 2xl:inline">Picking for:</span>{" "}
                    <span className="block 2xl:inline">{label}</span>
                </span>
            ))}

            <span className="col-start-1 row-start-1">
                <span className="block 2xl:inline">Picking for:</span>{" "}
                <span className="block 2xl:inline">
                    {teamLabels[selectedTeam]}
                </span>
            </span>
        </>
    );

    const common = {
        type: "button",
        className,
        disabled: !canSwitchTeam,
        title: `Switch pick team (${teamSwitchKey})`,
        "aria-keyshortcuts": teamSwitchKey,
    };

    return (
        <>
            <span
                ref={homeRef}
                data-tutorial-target="picking-side"
                className="inline-grid"
            >
                <button
                    {...common}
                    style={{ visibility: runaway ? "hidden" : "visible" }}
                    aria-hidden={runaway || undefined}
                    tabIndex={runaway ? -1 : 0}
                    onClick={event => {
                        pointerRef.current = {
                            x: event.clientX,
                            y: event.clientY,
                        };

                        onSwitch(event.detail > 0 ? "pointer" : "keyboard");
                    }}
                >
                    {label}
                </button>
            </span>

            {runaway && position && createPortal(
                <button
                    {...common}
                    ref={attachFlyingRef}
                    style={{
                        ...position,
                        position: "fixed",
                        left: 0,
                        top: 0,
                        zIndex: 90,
                        willChange: "transform",
                        transition: "none",
                    }}
                    onPointerDown={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);

                        pointerRef.current = {
                            x: event.clientX,
                            y: event.clientY,
                        };

                        panic()
                    }}
                    onClick={event => {
                        event.stopPropagation();

                        if (event.detail === 0) onSwitch("keyboard");
                        else panic()
                    }}
                >
                    {label}
                </button>,
                document.body
            )}
        </>
    );
}