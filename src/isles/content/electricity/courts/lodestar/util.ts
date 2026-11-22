import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt } from '../../../../IslesTypes';

/**
 * Plumbing shared by the Lodestar Court's gimmicks, prince and charms. Mechanics only — every
 * file paints its own art.
 */

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** A frame step clamped so a tab-switch hitch cannot fling a plate across the yard. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.1);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** Distance from a point to a polyline. */
export function lineDist(px: number, py: number, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
  return best;
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

/**
 * A circular arc through two points, bulging `bulge` px off their midpoint (sign picks the
 * side; 0 is the straight line). The shape iron filings take between two poles, near enough.
 */
export function fieldArc(a: Pt, b: Pt, bulge: number, n = 28): Pt[] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // A parabola is a close stand-in for the arc and never folds back on itself.
    const off = bulge * 4 * t * (1 - t);
    pts.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
  }
  return pts;
}

/** A point a fraction `t` of the way along a polyline (by vertex count — the arcs are even). */
export function along(pts: Pt[], t: number): Pt {
  const f = clamp(t, 0, 1) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const k = f - i;
  return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
}
