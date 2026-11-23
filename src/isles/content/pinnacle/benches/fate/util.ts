import type { Fighter } from '../../../../../entities/Fighter';

/** Small shared helpers for the Lot Bench's decrees. */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];
export const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');

/** A fighter still in the fight. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A frame step in seconds, never a huge one after a hitch. */
export const stepOf = (dt: number): number => clamp(dt, 0, 0.05);

/** Shuffle a copy (seeded). */
export function shuffled<T>(xs: T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
