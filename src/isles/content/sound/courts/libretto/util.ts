import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Libretto Court's gimmicks, prince and charms. Mechanics only — every
 * file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a crane half across the room. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Distance from a point to the infinite line through (x,y) at angle a. */
export function lineDist(px: number, py: number, x: number, y: number, a: number): number {
  return Math.abs((px - x) * Math.sin(a) - (py - y) * Math.cos(a));
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

/** Where a segment from (x1,y1) to (x2,y2) leaves a box, clipped to it — for lines across a room. */
export function chord(x: number, y: number, a: number, x0: number, y0: number, x1: number, y1: number): [number, number, number, number] {
  const c = Math.cos(a), s = Math.sin(a);
  let tMin = -1e6, tMax = 1e6;
  if (Math.abs(c) > 1e-6) {
    const ta = (x0 - x) / c, tb = (x1 - x) / c;
    tMin = Math.max(tMin, Math.min(ta, tb)); tMax = Math.min(tMax, Math.max(ta, tb));
  } else if (x < x0 || x > x1) return [x, y, x, y];
  if (Math.abs(s) > 1e-6) {
    const ta = (y0 - y) / s, tb = (y1 - y) / s;
    tMin = Math.max(tMin, Math.min(ta, tb)); tMax = Math.min(tMax, Math.max(ta, tb));
  } else if (y < y0 || y > y1) return [x, y, x, y];
  return [x + c * tMin, y + s * tMin, x + c * tMax, y + s * tMax];
}
