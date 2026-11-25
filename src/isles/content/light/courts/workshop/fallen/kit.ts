import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { IRON_DARK, LIME_DARK } from '../palette';

/**
 * Plumbing shared by the Workshop's Fallen Five — mechanics and HUD bits only. Each rule file
 * paints its own machine.
 */

/** Every Fallen has ember-gold eyes. */
export const EMBER_EYE = 0xffa040;

/** Health left, 0..1. */
export const hpRatio = (f: Fighter): number => (f.maxHp > 0 ? f.hp / f.maxHp : 1);

/** Unit vector from a to b (east if they coincide). */
export function unit(ax: number, ay: number, bx: number, by: number): { x: number; y: number } {
  const d = Math.hypot(bx - ax, by - ay);
  return d < 0.001 ? { x: 1, y: 0 } : { x: (bx - ax) / d, y: (by - ay) / d };
}

/** A dark rounded plate behind a HUD readout. */
export function hudPlate(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, w, h, 5);
  g.lineStyle(1, LIME_DARK, 0.45); g.strokeRoundedRect(x, y, w, h, 5);
}

/** An arrowhead at (x, y) pointing along `a`. */
export function arrowHead(g: G, x: number, y: number, a: number, s: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillTriangle(
    x + Math.cos(a) * s, y + Math.sin(a) * s,
    x + Math.cos(a + 2.5) * s * 0.8, y + Math.sin(a + 2.5) * s * 0.8,
    x + Math.cos(a - 2.5) * s * 0.8, y + Math.sin(a - 2.5) * s * 0.8,
  );
}

/** A coiled spring drawn from (x1, y1) to (x2, y2): `turns` loops of radius `r`, steel with a lit edge. */
export function coil(g: G, x1: number, y1: number, x2: number, y2: number, turns: number, r: number, color: number, alpha = 1): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const nx = -uy, ny = ux;
  const steps = Math.max(8, turns * 10);
  g.lineStyle(3, IRON_DARK, alpha * 0.9);
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = Math.sin(t * turns * Math.PI * 2) * r;
    const px = x1 + ux * len * t + nx * w, py = y1 + uy * len * t + ny * w;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.lineStyle(1.5, color, alpha);
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = Math.sin(t * turns * Math.PI * 2) * r;
    const px = x1 + ux * len * t + nx * w, py = y1 + uy * len * t + ny * w - 1;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/** A rivet: a dark dot with a lit cap. */
export function rivet(g: G, x: number, y: number, color: number, r = 2): void {
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y + 0.6, r);
  g.fillStyle(color, 1); g.fillCircle(x - 0.4, y - 0.4, r * 0.7);
}
