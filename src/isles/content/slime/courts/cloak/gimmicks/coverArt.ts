import { type G } from '../../../../../art/IsleArt';

/** A rain-butt: an oak barrel, iron hoops, a slick of black water on its lid. */
export function barrelArt(g: G, x: number, y: number, s: number): void {
  g.fillStyle(0x2e2419, 1); g.fillRect(x - 13 * s, y - 34 * s, 26 * s, 34 * s);
  g.fillStyle(0x4c3b2c, 1); g.fillRect(x - 11 * s, y - 34 * s, 22 * s, 34 * s);
  g.fillStyle(0x6b5541, 0.7); g.fillRect(x - 9 * s, y - 34 * s, 4 * s, 34 * s);
  for (const k of [0.15, 0.5, 0.85]) { g.fillStyle(0x2a2a30, 1); g.fillRect(x - 13 * s, y - 34 * s + k * 30 * s, 26 * s, 3 * s); }
  g.fillStyle(0x2e2419, 1); g.fillEllipse(x, y - 34 * s, 26 * s, 8 * s);
  g.fillStyle(0x0e1416, 1); g.fillEllipse(x, y - 34 * s, 20 * s, 5 * s);
  g.fillStyle(0x4a6a52, 0.5); g.fillEllipse(x - 3 * s, y - 35 * s, 7 * s, 1.6 * s);
}
