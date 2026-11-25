import type { Fighter } from '../../../../../../entities/Fighter';
import type { Rect } from '../../../../../IslesTypes';
import { type G } from '../../../../../art/IsleArt';

/**
 * Small shared helpers for the Slumber Court's Fallen Five — the things all five fights need and
 * that the court's own art file does not carry: liveness, clamping, rect tests, the ember-gold
 * the star puts into everything it touches, and a "star-scorch" glint drawn on the Fallen's own
 * set pieces so the dream's work shows on the furniture too.
 */

/** The star's ember-gold — every Fallen's eyes, and the scorch on the things they work. */
export const EMBER = 0xffa040;
export const EMBER_DEEP = 0x8a3a12;

/** Up and fighting. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Inside a rect (with an optional inset; negative grows it). */
export const inRect = (r: Rect, x: number, y: number, inset = 0): boolean =>
  x > r.x + inset && x < r.x + r.w - inset && y > r.y + inset && y < r.y + r.h - inset;

/** A thin ember crack with a hot core — the star's scorch, drawn across a thing the dream bent. */
export function scorch(g: G, x: number, y: number, len: number, angle: number, a = 1): void {
  const c = Math.cos(angle), s = Math.sin(angle);
  const pts = [0, 0.3, 0.55, 0.8, 1].map((k, i) => ({
    x: x + c * len * k + -s * (i % 2 ? 3 : -2),
    y: y + s * len * k + c * (i % 2 ? 3 : -2),
  }));
  g.lineStyle(3, EMBER_DEEP, a * 0.6);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(1.2, EMBER, a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
}

/** A rounded HUD plate in screen space, low on the left, under the rule's own meter. */
export function hudPlate(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x140e24, 0.78); g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(1.5, EMBER, 0.55); g.strokeRoundedRect(x, y, w, h, 8);
}
