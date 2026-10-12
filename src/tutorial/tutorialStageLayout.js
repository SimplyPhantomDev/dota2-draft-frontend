const MARGIN = 8;
const SPOTLIGHT_PADDING = 8;
const PANEL_GAP = 24;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// Measurements are viewport coordinates because the stage is a fixed portal.
export function getTutorialStageLayout({
  viewportWidth,
  viewportHeight,
  workspaceRect,
  sidebarRect,
  targetRect,
  placement,
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

  if (placement === "beside-sidebar") {
    const besideLeft = anchor.left - width - PANEL_GAP;

    if (besideLeft >= MARGIN) {
      left = besideLeft;
    } else {
      // A very narrow viewport has no room beside the sidebar.
      width = Math.min(560, availableWidth);
      height = Math.min(280, availableHeight);
      left = (viewportWidth - width) / 2;
      top = viewportHeight - MARGIN - height;
    }
  }

  const holeLeft = targetRect
    ? Math.max(2, targetRect.left - SPOTLIGHT_PADDING)
    : 0;
  const holeTop = targetRect
    ? Math.max(2, targetRect.top - SPOTLIGHT_PADDING)
    : 0;
  const holeRight = targetRect
    ? Math.min(
        viewportWidth - 2,
        targetRect.left + targetRect.width + SPOTLIGHT_PADDING
      )
    : 0;
  const holeBottom = targetRect
    ? Math.min(
        viewportHeight - 2,
        targetRect.top + targetRect.height + SPOTLIGHT_PADDING
      )
    : 0;

  return {
    viewportWidth,
    viewportHeight,
    frame: { left, top, width, height },
    hole: {
      attrX: holeLeft,
      attrY: holeTop,
      width: Math.max(0, holeRight - holeLeft),
      height: Math.max(0, holeBottom - holeTop),
      rx: 20,
    },
    hasSpotlight: Boolean(targetRect),
  };
}