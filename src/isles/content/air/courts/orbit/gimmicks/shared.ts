/**
 * Types and small helpers shared by the Orbit Court's five fight rules — one import line per
 * rule instead of five relative paths each.
 */
export type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
export type { Fighter } from '../../../../../../entities/Fighter';

import type { Fighter } from '../../../../../../entities/Fighter';
import type { GimmickCtx } from '../../../../../IslesTypes';

/** A fighter that can still be touched by the rule. */
export const live = (f: Fighter): boolean => f.active && f.hp > 0;

/** Which side a fighter is, as the rules key their state. */
export type Side = 'p' | 'n';
export const SIDES: Side[] = ['p', 'n'];

/** The fighter on a side. */
export const fighterOf = (ctx: GimmickCtx, k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);

/** Arena-safe bounds for a rule that moves fighters about. */
export const PAD = 34;
export const clampIn = (ctx: GimmickCtx, x: number, y: number): { x: number; y: number } => ({
  x: Math.max(PAD, Math.min(ctx.W - PAD, x)),
  y: Math.max(ctx.top + PAD * 0.6, Math.min(ctx.H - PAD, y)),
});
