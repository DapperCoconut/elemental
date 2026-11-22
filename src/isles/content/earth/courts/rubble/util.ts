import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt, Rect } from '../../../../IslesTypes';

/**
 * Plumbing shared by the Rubble Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a falling pillar half across the yard. */
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

/** Turn angle `a` toward `b` by at most `step` radians. */
export function turnToward(a: number, b: number, step: number): number {
  const d = wrapAngle(b - a);
  return a + clamp(d, -step, step);
}

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

/** Is a world point inside the painter's view rect, with a margin? */
export const inView = (x: number, y: number, v: Rect, m = 120): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Push a fighter out of a circle (stone you cannot walk through). Returns the shove applied. */
export function shoveOut(f: Fighter, c: Pt, r: number, nudge: (f: Fighter, dx: number, dy: number) => void): boolean {
  const d = dist(c.x, c.y, f.x, f.y);
  if (d >= r || d < 0.001) return false;
  const k = (r - d) / d;
  nudge(f, (f.x - c.x) * k, (f.y - c.y) * k);
  return true;
}
