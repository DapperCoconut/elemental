import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt, Rect } from '../../../../IslesTypes';

/** Small maths shared by the Brass Court's gimmicks, items and prince. */

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
/** Live and in the fight. */
export const alive = (f: Fighter | null | undefined): f is Fighter => !!f && f.active && f.hp > 0;
/** Seconds, clamped so a hitch never teleports anything. */
export const stepDt = (dt: number): number => Math.min(Math.max(dt, 0), 0.05);

/** Angle folded into (-π, π]. */
export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r <= -Math.PI) r += Math.PI * 2;
  return r;
}

/** Distance from point p to segment a–b, and how far along it (0–1) the nearest point lies. */
export function segInfo(px: number, py: number, ax: number, ay: number, bx: number, by: number): { d: number; t: number } {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  const t = L2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
  return { d: Math.hypot(px - (ax + dx * t), py - (ay + dy * t)), t };
}

/** Is a world point inside the view (with a margin)? */
export const inView = (x: number, y: number, v: Rect, pad = 160): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** Points round a rotated ellipse (Phaser can't rotate a fillEllipse). */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot: number, n = 22): Pt[] {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
  }
  return pts;
}

/** Point on a closed polyline at fraction u (0–1) of its length, and the heading there. */
export function alongLoop(pts: Pt[], u: number): { x: number; y: number; a: number } {
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    lens.push(l); total += l;
  }
  let d = (((u % 1) + 1) % 1) * total;
  for (let i = 0; i < pts.length; i++) {
    if (d <= lens[i]) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const k = lens[i] > 0 ? d / lens[i] : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    d -= lens[i];
  }
  return { x: pts[0].x, y: pts[0].y, a: 0 };
}

/** Length of a closed polyline. */
export function loopLength(pts: Pt[]): number {
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}
