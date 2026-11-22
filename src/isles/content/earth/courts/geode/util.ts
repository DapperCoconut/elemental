import type { Fighter } from '../../../../../entities/Fighter';

/**
 * Plumbing shared by the Geode Court's gimmicks, prince and charms. Mechanics only — every file
 * paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot carry a crystal half across the floor. */
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

/** Where two segments cross, or null. */
export function segCross(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number,
): { x: number; y: number } | null {
  const r1x = bx - ax, r1y = by - ay, r2x = dx - cx, r2y = dy - cy;
  const den = r1x * r2y - r1y * r2x;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((cx - ax) * r2y - (cy - ay) * r2x) / den;
  const u = ((cx - ax) * r1y - (cy - ay) * r1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: ax + r1x * t, y: ay + r1y * t };
}

/**
 * A ray cast inside a box, reflecting off its walls: the polyline it traces over `bounces`
 * bounces (or until `maxLen` is spent). The Prince's Brilliant Cut and the floor panels use it.
 */
export function bounceRay(
  x: number, y: number, a: number, box: { x0: number; y0: number; x1: number; y1: number }, bounces: number, maxLen = 4000,
): { x: number; y: number }[] {
  const pts = [{ x, y }];
  let dx = Math.cos(a), dy = Math.sin(a);
  let left = maxLen;
  for (let b = 0; b <= bounces && left > 0; b++) {
    const tx = dx > 0 ? (box.x1 - x) / dx : dx < 0 ? (box.x0 - x) / dx : Infinity;
    const ty = dy > 0 ? (box.y1 - y) / dy : dy < 0 ? (box.y0 - y) / dy : Infinity;
    let t = Math.min(tx, ty, left);
    if (t < 0) t = 0;
    x += dx * t; y += dy * t; left -= t;
    pts.push({ x, y });
    if (left <= 0) break;
    if (tx <= ty) dx = -dx; else dy = -dy;
  }
  return pts;
}

/** Ease in-out on 0..1. */
export const ease = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
