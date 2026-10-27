/**
 * Types and small helpers shared by the Spore Court's five fight rules — one import line per
 * rule instead of five relative paths each.
 */
export type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
export type { Fighter } from '../../../../../../entities/Fighter';

import type { Fighter } from '../../../../../../entities/Fighter';

/** A fighter that can still be touched by the rule. */
export const live = (f: Fighter): boolean => f.active && f.hp > 0;

/** Which side a fighter is, as the rules key their state. */
export type Side = 'p' | 'n';
export const SIDES: Side[] = ['p', 'n'];
