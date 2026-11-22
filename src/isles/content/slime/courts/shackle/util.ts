import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Shackle Court's gimmicks, prince and charms. Mechanics only — every
 * file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling an iron ball through a wall. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.05);

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

/** The fighter's E / R / F abilities — the ones a manacle can close on. Empty for a fighter without a kit. */
export function lockableAbilities(f: Fighter): { id: string; key: string }[] {
  const abilities = f.element?.abilities ?? [];
  return abilities
    .filter((a) => a.displayKey === 'E' || a.displayKey === 'R' || a.displayKey === 'F')
    .map((a) => ({ id: a.id, key: a.displayKey }));
}

/** Abilities already locked out on a fighter (none for a fighter that cannot be locked). */
export function lockedIds(f: Fighter): Set<string> {
  return new Set(typeof f.lockedAbilities === 'function' ? f.lockedAbilities() : []);
}

/** Lock one ability for `ms` — false if this fighter cannot be locked (then the caller silences instead). */
export function lockOne(f: Fighter, id: string, ms: number): boolean {
  if (typeof f.lockAbility !== 'function') return false;
  f.lockAbility(id, ms);
  return true;
}
