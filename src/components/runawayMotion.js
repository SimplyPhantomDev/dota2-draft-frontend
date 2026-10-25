const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

function gap(body, pointer) {
    return Math.hypot(
        Math.max(body.x - pointer.x, 0, pointer.x - body.x - body.width),
        Math.max(body.y - pointer.y, 0, pointer.y - body.y - body.height)
    );
}

function away(body, pointer, bounds) {
    let x = body.x + body.width / 2 - pointer.x;
    let y = body.y + body.height / 2 - pointer.y;

    // If the cursor is exactly centered, head toward available space.
    if (Math.hypot(x, y) < 0.01) {
        x = (bounds.minX + bounds.maxX) / 2 - body.x;
        y = (bounds.minY + bounds.maxY) / 2 - body.y;
    }

    const length = Math.hypot(x, y);

    return length > 0.01
        ? { x: x / length, y: y / length }
        : { x: 1, y: 0 };
}

// Cross the cursor and land beyond it.
// Corners provide a fallback when the window is particularly small.
export function startDash(body, pointer, bounds) {
    const direction = away(body, pointer, bounds);
    const reach = 220 + Math.hypot(body.width, body.height) / 2;

    let target = {
        x: clamp(
            pointer.x - direction.x * reach - body.width / 2,
            bounds.minX,
            bounds.maxX
        ),
        y: clamp(
            pointer.y - direction.y * reach - body.height / 2,
            bounds.minY,
            bounds.maxY
        ),
    };

    if (
        gap({ ...body, ...target }, pointer) < 100
        || Math.hypot(target.x - body.x, target.y - body.y) < 100
    ) {
        const corners = [
            { x: bounds.minX, y: bounds.minY },
            { x: bounds.maxX, y: bounds.minY },
            { x: bounds.minX, y: bounds.maxY },
            { x: bounds.maxX, y: bounds.maxY },
        ];

        target = corners.reduce((best, point) =>
            gap({ ...body, ...point }, pointer)
                > gap({ ...body, ...best }, pointer)
                ? point
                : best
        );
    }

    body.dash = {
        fromX: body.x,
        fromY: body.y,
        toX: target.x,
        toY: target.y,
        elapsed: 0,
        duration: clamp(
            Math.hypot(target.x - body.x, target.y - body.y) / 6500,
            0.06,
            0.13
        ),
    };

    body.vx = 0;
    body.vy = 0;
    body.cooldown = 0.35;
}

function advanceDash(body, dt, reducedMotion) {
    const dash = body.dash;
    dash.elapsed += dt;

    const progress = reducedMotion
        ? 1
        : Math.min(1, dash.elapsed / dash.duration);

    // Fast departure, softer arrival.
    const eased = 1 - (1 - progress) ** 3;

    body.x = dash.fromX + (dash.toX - dash.fromX) * eased;
    body.y = dash.fromY + (dash.toY - dash.fromY) * eased;

    if (progress === 1) body.dash = null;
}

export function stepMotion(
    body,
    pointer,
    bounds,
    elapsed,
    reducedMotion = false
) {
    // Avoid a huge jump after the app has been inactive.
    const dt = clamp(elapsed, 0, 1 / 30);
    body.cooldown = Math.max(0, body.cooldown - dt);

    if (
        reducedMotion
        && pointer
        && !body.dash
        && body.cooldown === 0
        && gap(body, pointer) < 80
    ) {
        startDash(body, pointer, bounds);
    }

    // Finish the current dash before considering another direction.
    if (body.dash) {
        advanceDash(body, dt, reducedMotion);
        return;
    }

    if (reducedMotion) {
        body.vx = body.vy = 0;
        return;
    }

    const distance = pointer ? gap(body, pointer) : Infinity;

    // Fear increases smoothly inside a 220px comfort zone.
    const fear = Math.max(0, 1 - distance / 220);
    const speed = 1800 * fear ** 2.4;

    const direction = pointer
        ? away(body, pointer, bounds)
        : { x: 0, y: 0 };

    // Look ahead: if a wall would block most of the escape,
    // make a fast dash across the cursor instead.
    if (
        pointer
        && distance < 110
        && speed > 250
        && body.cooldown === 0
    ) {
        const travel = speed * 0.18;

        const aheadX = clamp(
            body.x + direction.x * travel,
            bounds.minX,
            bounds.maxX
        );
        const aheadY = clamp(
            body.y + direction.y * travel,
            bounds.minY,
            bounds.maxY
        );

        const progress =
            (aheadX - body.x) * direction.x
            + (aheadY - body.y) * direction.y;

        if (progress < travel * 0.35) {
            startDash(body, pointer, bounds);
            advanceDash(body, dt, false);
            return;
        }
    }

    // Respond quickly nearby; ease acceleration and braking farther away.
    const response = 1 - Math.exp(-(8 + fear ** 4 * 140) * dt);

    body.vx += (direction.x * speed - body.vx) * response;
    body.vy += (direction.y * speed - body.vy) * response;

    if (speed < 1 && Math.hypot(body.vx, body.vy) < 1) {
        body.vx = body.vy = 0;
    }

    const x = body.x + body.vx * dt;
    const y = body.y + body.vy * dt;

    body.x = clamp(x, bounds.minX, bounds.maxX);
    body.y = clamp(y, bounds.minY, bounds.maxY);

    if (body.x !== x) body.vx = 0;
    if (body.y !== y) body.vy = 0;
}