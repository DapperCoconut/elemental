import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Web Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling a spider across the room. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Where along a segment (0..1) the nearest point to p lies. */
export function segT(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  return l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
}

/** Do segments ab and cd cross? (Strict: touching ends do not count.) */
export function segCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Which side of the line ab a point lies on (sign of the cross product). */
export const sideOf = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number =>
  Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));

/** Wrap an angle into (-π, π]. */
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Seconds since the last call, read off the scene clock a script is handed. */
export function clock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
    last = time;
    return dt;
  };
}

/**
 * The line through two points, clipped to a box — a wire strung wall to wall. Returns the two
 * wall points, or null if the line misses the box.
 */
export function wallToWall(ax: number, ay: number, bx: number, by: number, x0: number, y0: number, x1: number, y1: number): [number, number, number, number] | null {
  const dx = bx - ax, dy = by - ay;
  let t0 = -Infinity, t1 = Infinity;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  if (!clip(-dx, ax - x0) || !clip(dx, x1 - ax) || !clip(-dy, ay - y0) || !clip(dy, y1 - ay)) return null;
  if (!isFinite(t0) || !isFinite(t1)) return null;
  return [ax + dx * t0, ay + dy * t0, ax + dx * t1, ay + dy * t1];
}

/**
 * A fighter's speed tracker: call `step(f, dt)` every frame; `speed` is px/s, smoothed a little.
 * A walk is ≈200 px/s; anything over ~380 is a dash, a blink or a shove.
 */
export function mover(f: Fighter): { step(dt: number): number; readonly speed: number; readonly px: number; readonly py: number } {
  let px = f.x, py = f.y, speed = 0;
  return {
    step(dt) {
      const d = Math.hypot(f.x - px, f.y - py);
      const v = dt > 0 ? d / dt : 0;
      // A teleport across the room reads as one huge frame; treat it as a dash all the same.
      speed = v > speed ? v : speed * 0.6 + v * 0.4;
      px = f.x; py = f.y;
      return speed;
    },
    get speed() { return speed; },
    get px() { return px; },
    get py() { return py; },
  };
}
