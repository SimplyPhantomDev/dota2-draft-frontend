const MARGIN = 8;
const SPOTLIGHT_PADDING = 8;
const PANEL_GAP = 24;
const MIN_DIALOGUE_WIDTH = 240;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// Measurements are viewport coordinates because the stage is a fixed portal.
export function getTutorialStageLayout({
    viewportWidth,
    viewportHeight,
    workspaceRect,
    sidebarRect,
    targetRect,
    placement,
    comparing = false,
    avoidRect = null,
}) {
    const availableWidth = Math.max(0, viewportWidth - MARGIN * 2);
    const availableHeight = Math.max(0, viewportHeight - MARGIN * 2);
    const anchor = sidebarRect ?? workspaceRect ?? {
        left: MARGIN,
        top: MARGIN,
        width: availableWidth,
        height: availableHeight,
    };

    let width = Math.min(anchor.width, availableWidth);
    let height = Math.min(560, viewportHeight * 0.68, availableHeight);
    let left = clamp(anchor.left, MARGIN, viewportWidth - MARGIN - width);
    let top = clamp(
        anchor.top + (anchor.height - height) / 2,
        MARGIN,
        viewportHeight - MARGIN - height
    );

    let comparisonFrame = null;
    let reserveBottom = 0;
    let highlightedRect = targetRect;

    if (comparing) {
        const comparisonWidth = Math.min(
            anchor.width,
            Math.max(0, anchor.left - PANEL_GAP - MARGIN)
        );

        comparisonFrame = {
            left: anchor.left - PANEL_GAP - comparisonWidth,
            top: anchor.top,
            width: comparisonWidth,
            height: anchor.height,
        };

        const roomForDialogue = comparisonFrame.left - PANEL_GAP - MARGIN;

        if (roomForDialogue >= Math.min(width, MIN_DIALOGUE_WIDTH)) {
            width = Math.min(width, roomForDialogue);
            left = comparisonFrame.left - PANEL_GAP - width;
        } else {
            // Reserve real workspace space so the docked dialogue covers neither list.
            reserveBottom = Math.min(280, viewportHeight * 0.4);
            width = Math.min(560, availableWidth);
            height = Math.max(0, reserveBottom - MARGIN);
            left = (viewportWidth - width) / 2;
            top = viewportHeight - MARGIN - height;
        }

        if (targetRect) {
            const highlightLeft = Math.min(targetRect.left, comparisonFrame.left);
            const highlightTop = Math.min(targetRect.top, comparisonFrame.top);

            highlightedRect = {
                left: highlightLeft,
                top: highlightTop,
                width: Math.max(
                    targetRect.left + targetRect.width,
                    comparisonFrame.left + comparisonFrame.width
                ) - highlightLeft,
                height: Math.max(
                    targetRect.top + targetRect.height,
                    comparisonFrame.top + comparisonFrame.height
                ) - highlightTop,
            };
        }
    } else if (["beside-breakdown", "beside-inspector"].includes(placement)
        && (avoidRect ?? targetRect)) {
        const obstruction = avoidRect ?? targetRect;
        const roomLeft = obstruction.left - PANEL_GAP - MARGIN;
        const roomRight = viewportWidth - MARGIN
            - (obstruction.left + obstruction.width + PANEL_GAP);

        if (
            Math.max(roomLeft, roomRight)
            >= Math.min(width, MIN_DIALOGUE_WIDTH)
        ) {
            const useLeft = roomLeft >= roomRight;

            width = Math.min(width, useLeft ? roomLeft : roomRight);
            left = useLeft
                ? obstruction.left - PANEL_GAP - width
                : obstruction.left + obstruction.width + PANEL_GAP;

            top = clamp(
                obstruction.top + (obstruction.height - height) / 2,
                MARGIN,
                viewportHeight - MARGIN - height
            );
        } else {
            reserveBottom = Math.min(280, viewportHeight * 0.4);
            width = Math.min(560, availableWidth);
            height = Math.max(0, reserveBottom - MARGIN);
            left = (viewportWidth - width) / 2;
            top = viewportHeight - MARGIN - height;
        }
    } else if (placement === "beside-sidebar") {
        const besideLeft = anchor.left - width - PANEL_GAP;

        if (besideLeft >= MARGIN) {
            left = besideLeft;
        } else {
            reserveBottom = Math.min(280, viewportHeight * 0.4);
            width = Math.min(560, availableWidth);
            height = Math.max(0, reserveBottom - MARGIN);
            left = (viewportWidth - width) / 2;
            top = viewportHeight - MARGIN - height;
        }
    }

    const holeLeft = highlightedRect
        ? Math.max(2, highlightedRect.left - SPOTLIGHT_PADDING)
        : 0;
    const holeTop = highlightedRect
        ? Math.max(2, highlightedRect.top - SPOTLIGHT_PADDING)
        : 0;
    const holeRight = highlightedRect
        ? Math.min(
            viewportWidth - 2,
            highlightedRect.left + highlightedRect.width + SPOTLIGHT_PADDING
        )
        : 0;
    const holeBottom = highlightedRect
        ? Math.min(
            viewportHeight - 2,
            highlightedRect.top + highlightedRect.height + SPOTLIGHT_PADDING
        )
        : 0;

    return {
        viewportWidth,
        viewportHeight,
        frame: { left, top, width, height },
        comparisonFrame,
        reserveBottom,
        hole: {
            attrX: holeLeft,
            attrY: holeTop,
            width: Math.max(0, holeRight - holeLeft),
            height: Math.max(0, holeBottom - holeTop),
            rx: 20,
        },
        hasSpotlight: Boolean(highlightedRect),
    };
}