import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Remembrance Court's gimmicks, prince and charms. Mechanics only —
 * every file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry anything half across the room. */
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

/** A fighter's own colour (its element's), with a fallback for a fighter that has none. */
export function fighterColor(f: Fighter, fallback: number): number {
  const c = (f as { element?: { color?: number } }).element?.color;
  return typeof c === 'number' ? c : fallback;
}

/**
 * "Forget" a fighter's last-used ability for `ms`: lock it out where the fighter supports it,
 * and say which one went. Returns false when nothing could be locked (the caller silences instead).
 */
export function forgetLast(f: Fighter, ms: number): boolean {
  const id = (f as { lastLockableAbilityId?: string | null }).lastLockableAbilityId;
  const lock = (f as { lockAbility?: (id: string, ms: number) => void }).lockAbility;
  if (!id || typeof lock !== 'function') return false;
  lock.call(f, id, ms);
  return true;
}

/** Ease in-out on 0..1. */
export const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export type Slot = 'click' | 'e' | 'r' | 'f' | 'q';

/** Which key an ability sits on for a fighter (read off its element), or null if unknown. */
export function slotOfAbility(f: Fighter, abilityId: string): Slot | null {
  const list = (f as { element?: { abilities?: { id: string; displayKey?: string }[] } }).element?.abilities ?? [];
  const k = list.find((a) => a.id === abilityId)?.displayKey;
  if (k === 'Click') return 'click';
  if (k === 'E') return 'e';
  if (k === 'R') return 'r';
  if (k === 'F') return 'f';
  if (k === 'Q') return 'q';
  return null;
}

/** A slot string as a Slot, or null. */
export function asSlot(s: string | null | undefined): Slot | null {
  return s === 'click' || s === 'e' || s === 'r' || s === 'f' || s === 'q' ? s : null;
}
