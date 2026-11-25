import type { Fighter } from '../../../../../../entities/Fighter';

/**
 * Plumbing shared by the Confection Court's Fallen Five: a frame clock, liveness and clamping.
 * No art lives here — each gimmick paints its own things with the court's palette in `../art`.
 */

/**
 * A frame clock: seconds since the last call, clamped so a tab-switch hitch can't move a belt or
 * a pen a mile in one frame. Runs off the scene time the gimmick is handed.
 */
export function frameClock(): (time: number) => number {
  let last = -1;
  return (time: number) => {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (time - last) / 1000));
    last = time;
    return dt;
  };
}

/** Standing and fighting (not dead, not despawned). */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/** Clamp `v` into [a, b]. */
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
