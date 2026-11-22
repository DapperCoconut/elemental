import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Small mechanical helpers for the Grave Court's rules, prince and charms. No art lives here —
 * every file paints its own.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** Standing, breathing and in the fight. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step capped at a tenth of a second, so a hitch never teleports a coffin. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to the segment a–b. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Angle wrapped to (-π, π]. */
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** A per-call seconds clock for item scripts, which are handed only the scene time. */
export function ticker(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
    last = time;
    return dt;
  };
}

/** The other fighter. */
export const foeOf = (f: Fighter, a: Fighter, b: Fighter): Fighter => (f === a ? b : a);

/** Inside an axis-aligned box given by its centre and half-sizes. */
export const inBox = (x: number, y: number, cx: number, cy: number, hw: number, hh: number): boolean =>
  Math.abs(x - cx) < hw && Math.abs(y - cy) < hh;
