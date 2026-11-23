import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Noon Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a sunbeam half across the plaza. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Distance from a point to the infinite line through (x, y) at angle a. */
export const lineDist = (px: number, py: number, x: number, y: number, a: number): number =>
  Math.abs((px - x) * Math.sin(a) - (py - y) * Math.cos(a));

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

/** The point where a ray from (x, y) at angle a leaves the arena box. */
export function rayEnd(x: number, y: number, a: number, W: number, top: number, H: number): { x: number; y: number } {
  const c = Math.cos(a), s = Math.sin(a);
  let t = 4000;
  if (c > 1e-6) t = Math.min(t, (W - x) / c); else if (c < -1e-6) t = Math.min(t, -x / c);
  if (s > 1e-6) t = Math.min(t, (H - y) / s); else if (s < -1e-6) t = Math.min(t, (top - y) / s);
  return { x: x + c * Math.max(0, t), y: y + s * Math.max(0, t) };
}
