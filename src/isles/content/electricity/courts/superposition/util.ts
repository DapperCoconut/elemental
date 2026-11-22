import type { Fighter } from '../../../../../entities/Fighter';
import type { Rect } from '../../../../IslesTypes';

/**
 * Plumbing shared by the Superposition Court's gimmicks, prince and charms. Mechanics only — every
 * file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling anything across the room. */
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

/** Is a point inside the camera view (with a margin)? For keeping `animate` light. */
export const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/**
 * Where a fighter is looking, read off `GimmickCtx.facing` (the player's aim; a bot's heading,
 * or its opponent when it stands still). The bot's look is eased so a jink does not snap its
 * cone round. One tracker per fighter, ticked once a frame; `angle` is in radians.
 */
export class Gaze {
  angle = 0;
  private primed = false;

  constructor(private readonly face: (f: Fighter) => number, private readonly f: Fighter, private readonly eased: boolean) {}

  update(dt: number): void {
    const want = this.face(this.f);
    if (!this.primed || !this.eased) { this.primed = true; this.angle = want; return; }
    this.angle = wrapAngle(this.angle + wrapAngle(want - this.angle) * Math.min(1, dt * 7));
  }

  /** Is (x, y) inside this fighter's cone of sight (half-angle `half`, out to `reach`)? */
  sees(x: number, y: number, half: number, reach = 2000): boolean {
    const d = dist(this.f.x, this.f.y, x, y);
    if (d > reach) return false;
    if (d < 1) return true;
    return Math.abs(wrapAngle(Math.atan2(y - this.f.y, x - this.f.x) - this.angle)) < half;
  }
}
