import type { Fighter } from '../../../../../../entities/Fighter';
import type { GimmickCtx } from '../../../../../IslesTypes';

/** Small shared helpers for the Tide Bench's six decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A frame's dt in seconds, capped so a hitch never teleports anything. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.05);
export const fighterOf = (ctx: GimmickCtx, w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
export const otherOf = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
/** Where in the arena a point may sit: inside the walls, below the HUD. */
export const inArena = (ctx: GimmickCtx, x: number, y: number, pad = 60): { x: number; y: number } => ({
  x: clamp(x, pad, ctx.W - pad),
  y: clamp(y, ctx.top + pad, ctx.H - pad),
});
/** The css colour each side's claims are shown in: you in sea-white, the council in its violet. */
export const SIDE_CSS: Record<Who, string> = { player: '#d4f0ff', npc: '#c9b0ff' };
