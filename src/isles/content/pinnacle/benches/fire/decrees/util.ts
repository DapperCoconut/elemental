import type { Fighter } from '../../../../../../entities/Fighter';
import type { GimmickCtx } from '../../../../../IslesTypes';

/**
 * Plumbing shared by the Ember Bench's six decrees. Mechanics only — every decree paints its
 * own art (the bench's shared drawings live in `../art.ts`).
 */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
/** A frame step clamped so a tab-switch hitch cannot carry a rule half across the floor. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);
/** Wrap an angle into (-π, π]. */
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The fighter on one side. */
export const side = (ctx: GimmickCtx, w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');

/** Distance from a point to a segment, and how far along it the nearest point is (0–1). */
export function segNear(px: number, py: number, x1: number, y1: number, x2: number, y2: number): { d: number; t: number } {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return { d: Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t)), t };
}

/** A point clamped onto the playfield, a margin in from every edge. */
export const inField = (ctx: GimmickCtx, x: number, y: number, pad = 50): { x: number; y: number } => ({
  x: clamp(x, pad, ctx.W - pad),
  y: clamp(y, ctx.top + pad, ctx.H - pad),
});
