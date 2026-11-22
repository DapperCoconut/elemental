import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Umbral Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a shadow half across the room. */
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

/** A position history: where a fighter was, `delayMs` ago. */
export class Trail {
  private pts: { t: number; x: number; y: number }[] = [];
  push(t: number, x: number, y: number): void {
    const last = this.pts[this.pts.length - 1];
    if (last && t - last.t < 30) return;
    this.pts.push({ t, x, y });
    if (this.pts.length > 400) this.pts.splice(0, this.pts.length - 400);
  }
  /** The recorded point closest to `t` (the oldest one while the trail is still short). */
  at(t: number): { x: number; y: number } | null {
    if (!this.pts.length) return null;
    let best = this.pts[0];
    for (const p of this.pts) { if (p.t <= t) best = p; else break; }
    return { x: best.x, y: best.y };
  }
  /** Points between two times, oldest first (for drawing a footstep line). */
  span(t0: number, t1: number): { x: number; y: number }[] {
    return this.pts.filter((p) => p.t >= t0 && p.t <= t1);
  }
  clear(): void { this.pts = []; }
}
