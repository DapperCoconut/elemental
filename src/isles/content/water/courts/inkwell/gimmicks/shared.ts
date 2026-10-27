/**
 * Types and small helpers shared by the Inkwell's five fight rules — one import line per rule
 * instead of five relative paths each.
 */
export type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
export type { Fighter } from '../../../../../../entities/Fighter';

import type { Fighter } from '../../../../../../entities/Fighter';

/** A fighter that can still be touched by the rule. */
export const live = (f: Fighter): boolean => f.active && f.hp > 0;

/**
 * Whether a fighter got an ability off since `sinceWall` (Date.now() time). The bot and the
 * player both stamp `lastPressAt` on every press that goes through.
 */
export function pressedSince(f: Fighter, sinceWall: number): boolean {
  return (f.lastPressAt ?? 0) > sinceWall;
}

/** True when the last press was a basic (Click) attack rather than a spell. */
export function lastPressWasClick(f: Fighter): boolean {
  const id = f.lastPressAbilityId;
  const ab = f.element?.abilities?.find((a) => a.id === id);
  return !!ab && ab.displayKey === 'Click';
}
