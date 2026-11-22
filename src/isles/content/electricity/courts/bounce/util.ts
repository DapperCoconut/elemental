import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Bounce Court's gimmicks, prince and charms. Mechanics only — every file
 * draws its own rubber.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling a ball through a wall. */
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

/** A springy ease: overshoots and settles, the way rubber does. */
export const boing = (k: number): number => {
  const c = clamp(k, 0, 1);
  return 1 - Math.cos(c * Math.PI * 2.5) * Math.exp(-c * 5);
};

/** Height of a hop at progress k (0..1) for a peak of h. */
export const hop = (k: number, h: number): number => 4 * h * k * (1 - clamp(k, 0, 1));
