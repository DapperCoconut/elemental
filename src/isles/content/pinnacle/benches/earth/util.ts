import Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import type { Pt } from '../../../../IslesTypes';

/**
 * Small shared helpers for the Stone Bench: who is who, distances, clamps, and a polygon fill that
 * takes plain points.
 */

export type Who = 'player' | 'npc';
export const WHO: Who[] = ['player', 'npc'];

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A frame step in seconds, capped so a hitch never teleports anything. */
export const stepDt = (dt: number): number => clamp(dt, 0, 0.05);

/** Fill a polygon from plain points. */
export function poly(g: Phaser.GameObjects.Graphics, pts: Pt[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
}

/** Stroke a polyline through plain points. */
export function line(g: Phaser.GameObjects.Graphics, pts: Pt[], w: number, color: number, alpha = 1): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/**
 * Where a point sits against a segment a→b: `d` its distance to the segment, `t` how far along
 * (0–1, clamped), `side` which side of the line it is on (+1 / −1, along the left normal).
 */
export function segDist(px: number, py: number, a: Pt, b: Pt): { d: number; t: number; side: number } {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = clamp(((px - a.x) * vx + (py - a.y) * vy) / len2, 0, 1);
  const cx = a.x + vx * t, cy = a.y + vy * t;
  const cross = vx * (py - a.y) - vy * (px - a.x);
  return { d: Math.hypot(px - cx, py - cy), t, side: cross >= 0 ? 1 : -1 };
}

/** A fighter's element colour (falls back to bone where there is none, as in a headless run). */
export function colourOf(f: Fighter, fallback = 0xd9cfb4): number {
  return f.element?.color ?? fallback;
}
