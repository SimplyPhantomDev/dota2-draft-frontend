import { useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { getTutorialStageLayout } from "./tutorialStageLayout";

export default function TutorialStage({
  workspaceRef,
  target,
  placement = "over-sidebar",
  initialFrame,
  showDialogue,
  children,
}) {
  const maskId = `tutorial-mask-${useId().replace(/:/g, "")}`;
  const reduceMotion = useReducedMotion();
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const sidebar = workspace.querySelector(
      '[data-tutorial-target="recommendations"]'
    );
    const element = target
      ? workspace.querySelector(`[data-tutorial-target="${target}"]`)
      : null;

    let live = true;

    function measure() {
      if (!live) return;

      const next = getTutorialStageLayout({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        workspaceRect: workspace.getBoundingClientRect(),
        sidebarRect: sidebar?.getBoundingClientRect(),
        targetRect: element?.getBoundingClientRect(),
        placement,
      });

      setLayout(previous => {
        // Fade a dismissed spotlight in place instead of moving it to (0, 0).
        if (!element && previous) next.hole = previous.hole;

        return previous && JSON.stringify(previous) === JSON.stringify(next)
          ? previous
          : next;
      });
    }

    measure();

    const observer = new ResizeObserver(measure);
    for (const node of new Set([workspace, sidebar, element])) {
      if (node) observer.observe(node);
    }

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      live = false;
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [workspaceRef, target, placement]);

  if (!layout) return null;

  const transition = reduceMotion
    ? { duration: 0 }
    : {
        type: "tween",
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      };

  const spotlight = {
    ...layout.hole,
    opacity: layout.hasSpotlight ? 1 : 0,
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${layout.viewportWidth} ${layout.viewportHeight}`}
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={layout.viewportWidth}
            height={layout.viewportHeight}
            style={{ maskType: "luminance" }}
          >
            <rect width="100%" height="100%" fill="white" />

            <Motion.rect
              fill="black"
              initial={false}
              animate={spotlight}
              transition={transition}
            />
          </mask>
        </defs>

        {/* The target is an opening in one continuous dimming layer. */}
        <rect
          width="100%"
          height="100%"
          fill="black"
          opacity="0.6"
          mask={`url(#${maskId})`}
        />

        <Motion.rect
          fill="none"
          stroke="rgb(var(--color-accent))"
          strokeWidth="2"
          initial={false}
          animate={spotlight}
          transition={transition}
        />
      </svg>

      {showDialogue && (
        <Motion.section
          aria-labelledby="first-pick-title"
          className="ui-panel pointer-events-auto absolute flex flex-col overflow-hidden text-ink"
          initial={reduceMotion || !initialFrame ? false : initialFrame}
          animate={layout.frame}
          transition={transition}
        >
          {children}
        </Motion.section>
      )}
    </div>,
    document.body
  );
}