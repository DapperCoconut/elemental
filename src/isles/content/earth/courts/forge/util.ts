import type { Fighter } from '../../../../../entities/Fighter';
import { mixC } from '../../../../art/IsleArt';
import { HEAT_RAMP } from './palette';

/**
 * Plumbing shared by the Forge Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art (the heat ramp lives here because every one of them glows).
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling a cart across the yard. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Do segments a→b and c→d cross? */
export function segsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
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

/** Metal colour at a heat 0..1: dull red at the bottom of the ramp, welding white at the top. */
export function heatColor(k: number): number {
  const t = clamp(k, 0, 1) * (HEAT_RAMP.length - 1);
  const i = Math.min(HEAT_RAMP.length - 2, Math.floor(t));
  return mixC(HEAT_RAMP[i], HEAT_RAMP[i + 1], t - i);
}
