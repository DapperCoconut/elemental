import type { Fighter } from '../../../../../entities/Fighter';
import type { Rect } from '../../../../IslesTypes';

/**
 * Plumbing shared by the Dunesea Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a ship half across the arena. */
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

/** Is a world point within `m` px of the camera view? (painter `animate*` culling) */
export const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/**
 * How fast a fighter is moving, smoothed — read off its position each frame (gimmicks may not read
 * velocity). Feed it every update; `speed` is px/s.
 */
export class Gait {
  speed = 0;
  private lx = NaN;
  private ly = NaN;
  constructor(private readonly f: Fighter) {}
  step(dt: number): number {
    if (Number.isNaN(this.lx) || dt <= 0) { this.lx = this.f.x; this.ly = this.f.y; return this.speed; }
    const inst = Math.hypot(this.f.x - this.lx, this.f.y - this.ly) / dt;
    this.lx = this.f.x; this.ly = this.f.y;
    this.speed += (Math.min(inst, 900) - this.speed) * Math.min(1, dt * 8);
    return this.speed;
  }
}
