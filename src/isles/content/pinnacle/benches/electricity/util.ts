import type { Fighter } from '../../../../../entities/Fighter';

/** Small shared helpers for the Storm Bench's decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A frame step in seconds, clamped so a hitch never teleports a rule. */
export const stepOf = (dt: number): number => clamp(dt, 0, 0.05);
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');

/** Distance from point p to segment a–b. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy || 1;
  const t = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
