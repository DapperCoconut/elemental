import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Galeward Court's gimmicks, prince and charms. Mechanics only — every
 * file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling a kite across the yard. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Do segments AB and CD cross? */
export function segsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Wrap an angle into (-π, π]. */
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Turn `a` toward `b` by at most `step` radians. */
export function turnToward(a: number, b: number, step: number): number {
  const d = wrapAngle(b - a);
  return a + clamp(d, -step, step);
}

/** Seconds since the last call, read off the scene clock a script is handed. */
export function clock(): (time: number) => number {
  let last = -1;
  return (time) => {
    const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
    last = time;
    return dt;
  };
}

/** Ease in-out on 0..1. */
export const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * Watches one fighter's ability bar and reports each fresh cast. There is no cast hook in a
 * gimmick, but every cast restarts a cooldown, so a ratio that drops sharply between two frames
 * is a cast. Defensive about a fighter without an element (the validator's stand-ins).
 */
export function castWatcher(f: Fighter): () => number {
  const last = new Map<string, number>();
  return () => {
    const abilities = f.element?.abilities;
    if (!abilities || typeof f.getCooldownRatio !== 'function') return 0;
    let casts = 0;
    for (const ab of abilities) {
      const r = f.getCooldownRatio(ab.id);
      const prev = last.get(ab.id);
      if (prev !== undefined && prev - r > 0.25) casts++;
      last.set(ab.id, r);
    }
    return casts;
  };
}

/**
 * Tracks a fighter's speed from frame to frame — a dash reads as a burst well past walking
 * pace. Returns px/s.
 */
export function speedometer(f: Fighter): (dt: number) => number {
  let lx = f.x, ly = f.y;
  let v = 0;
  return (dt) => {
    const d = Math.hypot(f.x - lx, f.y - ly);
    lx = f.x; ly = f.y;
    if (dt > 0) v = v * 0.5 + (d / dt) * 0.5;
    return v;
  };
}
