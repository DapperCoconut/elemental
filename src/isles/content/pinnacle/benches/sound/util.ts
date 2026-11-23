import type { Fighter } from '../../../../../entities/Fighter';
import type { GimmickCtx } from '../../../../IslesTypes';

/** Small shared helpers for the Choir Bench's six decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];

/** In the fight and standing. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A frame step in seconds, never a huge one after a hitch. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.05);
/** The angle `a` folded into −π…π. */
export const wrap = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
};

/** The fighter behind a side, and that side's opponent. */
export const fighterOf = (ctx: GimmickCtx, w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
/** Banner / float colour for a side: the player rose-white, the councilor violet. */
export const css = (w: Who): string => (w === 'player' ? '#ffd0ea' : '#c9b0ff');
