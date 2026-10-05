import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function HoverTooltip({ initialPoint, children }) {
    const tooltipRef = useRef(null);

    // Measure before paint. Mouse movement only changes this tooltip's position;
    // it does not update React state or rerender the drafting screen.
    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        const margin = 12;
        let pointer = initialPoint;

        const positionTooltip = () => {
            const { width, height } = tooltip.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight;
            let left = pointer.x + margin;
            let top = pointer.y + margin;

            // Flip to the other side of the pointer when there is not enough room.
            if (left + width > viewportWidth - margin) {
                left = pointer.x - width - margin;
            }
            if (top + height > viewportHeight - margin) {
                top = pointer.y - height - margin;
            }

            tooltip.style.left = `${Math.max(
                margin,
                Math.min(left, viewportWidth - width - margin)
            )}px`;

            tooltip.style.top = `${Math.max(
                margin,
                Math.min(top, viewportHeight - height - margin)
            )}px`;
        };

        const handleMouseMove = (event) => {
            pointer = { x: event.clientX, y: event.clientY };
            positionTooltip();
        };

        positionTooltip();

        const observer = new ResizeObserver(positionTooltip);
        observer.observe(tooltip);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("resize", positionTooltip);

        return () => {
            observer.disconnect();
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", positionTooltip);
        };
    }, [initialPoint]);

    // Render outside the sidebar so its scroll area cannot clip the tooltip.
    return createPortal(
        <div
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed z-50 w-[300px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] overflow-hidden rounded-panel border border-line bg-surface-raised p-ui-md text-sm text-ink shadow-panel"
        >
            {children}
        </div>,
        document.body
    );
}