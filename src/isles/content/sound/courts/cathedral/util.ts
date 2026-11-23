import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Cathedral Court's gimmicks, prince and charms. Mechanics only — every
 * file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a procession half round the nave. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

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

/** Ease in-out on 0..1. */
export const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * Tracks whether a fighter is standing still ("kneeling"): how long it has stayed within a few
 * pixels of where it was. Read every frame.
 */
export function stillness(): (f: Fighter, dt: number) => number {
  const last = new Map<Fighter, { x: number; y: number; still: number }>();
  return (f, dt) => {
    const s = last.get(f) ?? { x: f.x, y: f.y, still: 0 };
    const moved = Math.hypot(f.x - s.x, f.y - s.y);
    s.still = moved < 1.6 ? s.still + dt : 0;
    s.x = f.x; s.y = f.y;
    last.set(f, s);
    return s.still;
  };
}
