import type { GimmickCtx, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';

/** Small shared helpers for the Gale Bench's six decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
export const fighterOf = (ctx: GimmickCtx, w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** dt in seconds, capped so a hitch never teleports a rule along. */
export const stepOf = (dt: number): number => clampN(dt, 0, 0.05);
/** A point the bot can walk to: inside the arena, under the HUD. */
export const inArena = (ctx: GimmickCtx, x: number, y: number): Pt => ({ x: clampN(x, 60, ctx.W - 60), y: clampN(y, ctx.top + 40, ctx.H - 50) });
