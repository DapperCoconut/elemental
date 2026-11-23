import type { Fighter } from '../../../../../../entities/Fighter';
import type { GimmickCtx } from '../../../../../IslesTypes';

/** Small shared helpers for the Thorn Bench's six decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** dt in seconds, clamped so a hitch never teleports a rule. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.05);

/** The fighter for a side. */
export const fighterOf = (ctx: GimmickCtx, w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
/** The other side. */
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
/** Keep a point on the playfield. */
export const inField = (ctx: GimmickCtx, x: number, y: number, pad = 50): { x: number; y: number } => ({
  x: clamp(x, pad, ctx.W - pad),
  y: clamp(y, ctx.top + pad, ctx.H - pad),
});
