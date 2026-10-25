import { useId, useLayoutEffect, useState } from "react";

function intersect(rects) {
    return {
        left: Math.max(...rects.map(rect => rect.left)),
        top: Math.max(...rects.map(rect => rect.top)),
        right: Math.min(...rects.map(rect => rect.right)),
        bottom: Math.min(...rects.map(rect => rect.bottom)),
    };
}

function fits(rect, bounds) {
    return rect.width > 0 && rect.height > 0
        && rect.left >= bounds.left && rect.right <= bounds.right
        && rect.top >= bounds.top && rect.bottom <= bounds.bottom;
}

function arrowPath(portrait, badge) {
    const portraitCenterX = (portrait.left + portrait.right) / 2;
    const badgeCenterX = (badge.left + badge.right) / 2;
    const rightward = badgeCenterX >= portraitCenterX;

    const startX = rightward ? portrait.right + 4 : portrait.left - 4;
    const startY = (portrait.top + portrait.bottom) / 2;
    const endX = rightward ? badge.left - 6 : badge.right + 6;
    const endY = (badge.top + badge.bottom) / 2;
    const dx = endX - startX;
    const dy = endY - startY;

    // Each arrow fans directly toward its badge, crossing the rows freely.
    return [
        "M", startX, startY,
        "C", startX + dx * 0.3, startY + dy * 0.2,
        endX - dx * 0.3, endY,
        endX, endY,
    ].map(value => typeof value === "number"
        ? Math.round(value * 10) / 10
        : value).join(" ");
}

function measureArrows(workspace, dialogue, bonusType) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const empty = { width, height, paths: [] };
    const sidebar = workspace?.querySelector(
        '[data-tutorial-target="recommendations"]'
    );
    const list = sidebar?.querySelector(
        "[data-tutorial-recommendations-scroll]"
    );
    const portrait = dialogue?.querySelector("[data-tutorial-narrator]");
    const speech = dialogue?.querySelector("[data-tutorial-dialogue-scroll]");

    if (!sidebar || !list || !portrait || !speech) return empty;

    const viewport = { left: 0, top: 0, right: width, bottom: height };
    const portraitRect = portrait.getBoundingClientRect();
    const speechClip = intersect([
        viewport,
        dialogue.getBoundingClientRect(),
        speech.getBoundingClientRect(),
    ]);

    if (!fits(portraitRect, speechClip)) return empty;

    const sidebarRect = sidebar.getBoundingClientRect();
    const listClip = intersect([
        viewport,
        sidebarRect,
        list.getBoundingClientRect(),
    ]);

    const paths = [...sidebar.querySelectorAll("[data-tutorial-bonuses]")]
        .filter(badge => badge.dataset.tutorialBonuses
            .split(/\s+/).includes(bonusType))
        .flatMap(badge => {
            const row = badge.closest("[data-tutorial-recommendation]");
            const badgeRect = badge.getBoundingClientRect();

            // A scrolled-out or clipped badge must not receive an arrow.
            if (!row || !fits(badgeRect, listClip)) return [];

            return [{
                id: row.dataset.tutorialRecommendation,
                d: arrowPath(portraitRect, badgeRect),
            }];
        });

    return { width, height, paths };
}

export default function TutorialBonusArrows({
    workspaceRef,
    dialogueRef,
    bonusType,
}) {
    const markerId = "tutorial-bonus-arrow-" + useId()
        .replace(/[^a-zA-Z0-9_-]/g, "");
    const [geometry, setGeometry] = useState(null);

    useLayoutEffect(() => {
        let frame;
        let live = true;
        let previous = "";

        function update() {
            if (!live) return;

            const next = measureArrows(
                workspaceRef.current,
                dialogueRef.current,
                bonusType
            );
            const signature = JSON.stringify(next);

            if (signature !== previous) {
                previous = signature;
                setGeometry(next);
            }

            // Also follow the dialogue's animated movement, which does not resize it.
            frame = requestAnimationFrame(update);
        }

        update();

        return () => {
            live = false;
            cancelAnimationFrame(frame);
        };
    }, [workspaceRef, dialogueRef, bonusType]);

    if (!geometry?.paths.length) return null;

    return (
        <svg
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            style={{ color: "rgb(var(--color-accent))" }}
        >
            <defs>
                <marker
                    id={markerId}
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                >
                    <path
                        d="M 1 1 L 7 4 L 1 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </marker>
            </defs>

            <g
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.65"
            >
                {geometry.paths.map(path => (
                    <path
                        key={path.id}
                        d={path.d}
                        markerEnd={`url(#${markerId})`}
                    />
                ))}
            </g>
        </svg>
    );
}