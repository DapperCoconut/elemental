/**
 * Gold's billiards (R) — the ball physics, with no drawing and no fighters in it.
 *
 * Equal-mass balls on a felt-less floor: they roll, slow, knock into one another elastically,
 * come off the arena walls, and bounce off anything round the caller says is in the way (enemy
 * bodies). The arena kit and the codex preview both step the same function.
 */

export const BALL_R = 8;
/** Rolling resistance: a constant drag plus a share of the speed, so a ball slows and then stops. */
const DRAG_CONST = 150;
const DRAG_LINEAR = 0.55;
const STOP_SPEED = 14;
const WALL_RESTITUTION = 0.9;
const BALL_RESTITUTION = 0.96;
const BODY_RESTITUTION = 0.8;
/** No sub-step moves a ball further than this, so a fast ball cannot tunnel through another. */
const MAX_STEP = BALL_R * 0.9;

export interface Ball<O = string> {
  owner: O;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The number painted on it, 1–15. */
  n: number;
  /** Accumulated roll, for the painter to turn the number with. */
  roll: number;
  born: number;
  until: number;
}

export interface Bounds { left: number; right: number; top: number; bottom: number }

/** Something round a ball bounces off. `ref` is handed back to `onBody`. */
export interface BodyCircle<T> { x: number; y: number; r: number; ref: T }

export interface BallEvents<O, T> {
  /** Two balls clacked, at closing speed `speed`. */
  onClack?(x: number, y: number, speed: number): void;
  /** A ball came off a wall. */
  onWall?(x: number, y: number, speed: number): void;
  /** A ball struck a body at `speed` along the line between them. */
  onBody?(ball: Ball<O>, body: T, speed: number): void;
}

export function ballSpeed(b: Ball<unknown>): number { return Math.hypot(b.vx, b.vy); }

/**
 * Advance every ball by `dt` seconds. `bodiesFor(owner)` lists what that owner's balls bounce off
 * (and hurt) — a ball rolls straight through everything else.
 */
export function stepBalls<O, T>(
  balls: Ball<O>[], dt: number, bounds: Bounds,
  bodiesFor: (owner: O) => BodyCircle<T>[], ev: BallEvents<O, T> = {},
): void {
  if (!balls.length) return;
  let fastest = 0;
  for (const b of balls) fastest = Math.max(fastest, ballSpeed(b));
  if (fastest <= 0) return;
  const steps = Math.min(8, Math.max(1, Math.ceil((fastest * dt) / MAX_STEP)));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    for (const b of balls) {
      const v = ballSpeed(b);
      if (v <= 0) continue;
      const nv = v - (DRAG_CONST + DRAG_LINEAR * v) * h;
      if (nv <= STOP_SPEED) { b.vx = 0; b.vy = 0; continue; }
      b.vx *= nv / v;
      b.vy *= nv / v;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.roll += (nv * h) / BALL_R;

      // Walls.
      if (b.x < bounds.left + BALL_R) {
        b.x = bounds.left + BALL_R;
        if (b.vx < 0) { ev.onWall?.(b.x, b.y, -b.vx); b.vx = -b.vx * WALL_RESTITUTION; }
      } else if (b.x > bounds.right - BALL_R) {
        b.x = bounds.right - BALL_R;
        if (b.vx > 0) { ev.onWall?.(b.x, b.y, b.vx); b.vx = -b.vx * WALL_RESTITUTION; }
      }
      if (b.y < bounds.top + BALL_R) {
        b.y = bounds.top + BALL_R;
        if (b.vy < 0) { ev.onWall?.(b.x, b.y, -b.vy); b.vy = -b.vy * WALL_RESTITUTION; }
      } else if (b.y > bounds.bottom - BALL_R) {
        b.y = bounds.bottom - BALL_R;
        if (b.vy > 0) { ev.onWall?.(b.x, b.y, b.vy); b.vy = -b.vy * WALL_RESTITUTION; }
      }

      // Bodies: reflect off the surface, and report how hard it hit.
      for (const c of bodiesFor(b.owner)) {
        const dx = b.x - c.x;
        const dy = b.y - c.y;
        const min = BALL_R + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        b.x = c.x + nx * min;
        b.y = c.y + ny * min;
        const vn = b.vx * nx + b.vy * ny;
        if (vn >= 0) continue;
        b.vx -= (1 + BODY_RESTITUTION) * vn * nx;
        b.vy -= (1 + BODY_RESTITUTION) * vn * ny;
        ev.onBody?.(b, c.ref, -vn);
      }
    }

    // Ball against ball: equal masses swap their velocity along the line of centres.
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 4 * BALL_R * BALL_R) continue;
        const d = Math.sqrt(d2) || 0.001;
        const nx = dx / d;
        const ny = dy / d;
        const overlap = (2 * BALL_R - d) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (closing <= 0) continue;
        const j2 = ((1 + BALL_RESTITUTION) / 2) * closing;
        a.vx -= j2 * nx; a.vy -= j2 * ny;
        b.vx += j2 * nx; b.vy += j2 * ny;
        ev.onClack?.((a.x + b.x) / 2, (a.y + b.y) / 2, closing);
      }
    }
  }
}

/**
 * Where a handful of `count` balls comes to rest around `(cx, cy)`, thrown along `ang`: a loose
 * diamond, the same every time so both machines of an online match rack the same table.
 */
export function rackSpots(cx: number, cy: number, ang: number, count: number): { x: number; y: number }[] {
  const LAYOUT: [number, number][] = [[0, 0], [22, -15], [24, 13], [-8, -25], [-5, 27], [46, -2], [-30, 2]];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return LAYOUT.slice(0, count).map(([f, l]) => ({ x: cx + c * f - s * l, y: cy + s * f + c * l }));
}

/**
 * The first ball a cue thrust from `(ox, oy)` along the unit vector `(dx, dy)` would touch within
 * `reach`, or null. `halfWidth` is the cue tip's own half thickness.
 */
export function cueTarget<O>(
  balls: Ball<O>[], owner: O, ox: number, oy: number, dx: number, dy: number, reach: number, halfWidth: number,
): Ball<O> | null {
  let best: Ball<O> | null = null;
  let bestAlong = Infinity;
  for (const b of balls) {
    if (b.owner !== owner) continue;
    const rx = b.x - ox;
    const ry = b.y - oy;
    const along = rx * dx + ry * dy;
    if (along < 0 || along > reach + BALL_R) continue;
    const off = Math.abs(rx * -dy + ry * dx);
    if (off > BALL_R + halfWidth) continue;
    if (along < bestAlong) { bestAlong = along; best = b; }
  }
  return best;
}
