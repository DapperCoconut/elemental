import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { HUNT_RED, TIMBER, TIMBER_DARK } from '../util';

/**
 * Small shared hand for the Wildhunt's Fallen Five: the checks every rule makes (is a fighter
 * still standing, how far is a point from a line) and the one figure several of them draw — a
 * hunt servant in oxblood livery, seen from just above, the way the court's own art sees people.
 */

/** Ember-gold: every Fallen's eyes, and the dream's tint on the things they work. */
export const EMBER = 0xffa040;

/** A fighter still in the fight. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/** Distance from (px,py) to the infinite line through (ox,oy) at angle `a`. */
export const lineDist = (px: number, py: number, ox: number, oy: number, a: number): number =>
  Math.abs((px - ox) * -Math.sin(a) + (py - oy) * Math.cos(a));

/** Signed smallest difference between two angles, in (-π, π]. */
export const angDiff = (a: number, b: number): number => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
};

/**
 * A hunt servant standing at (x, y) (feet): oxblood tabard over a shirt, a felt cap, arms that
 * hold whatever `held` draws at the hand point. `lean` tips the body forward along `dir`; `down`
 * (0..1) is how far he has fallen flat, struck.
 */
export function servant(
  g: G, x: number, y: number, dir: number, ph: number, lean: number, down: number,
  held?: (hx: number, hy: number) => void, alpha = 1,
): void {
  g.fillStyle(0x000000, 0.3 * alpha); g.fillEllipse(x, y + 2, 26, 8);
  if (down > 0.5) {
    // Flat on the turf: body along the ground, cap rolled off.
    g.fillStyle(dim(HUNT_RED, 0.3), alpha); g.fillEllipse(x - dir * 4, y - 3, 30, 11);
    g.fillStyle(HUNT_RED, alpha); g.fillEllipse(x - dir * 4, y - 4, 26, 8);
    g.fillStyle(0xd8b494, alpha); g.fillCircle(x + dir * 13, y - 4, 5);
    g.fillStyle(TIMBER_DARK, alpha); g.fillCircle(x + dir * 22, y + 1, 4);
    return;
  }
  const sway = Math.sin(ph) * 2;
  const bx = x + dir * lean * 5;
  // Legs.
  g.lineStyle(3.5, 0x3a2e22, alpha);
  g.lineBetween(x - 4, y, bx - 3 + Math.sin(ph) * 3, y - 13);
  g.lineBetween(x + 4, y, bx + 3 - Math.sin(ph) * 3, y - 13);
  // Tabard with its hem and belt.
  g.fillStyle(dim(HUNT_RED, 0.35), alpha); g.fillRoundedRect(bx - 9, y - 30 + sway, 18, 20, 4);
  g.fillStyle(HUNT_RED, alpha); g.fillRoundedRect(bx - 8, y - 30 + sway, 16, 18, 4);
  g.fillStyle(lit(HUNT_RED, 0.25), alpha); g.fillRect(bx - 6, y - 28 + sway, 3, 14);
  g.fillStyle(TIMBER, alpha); g.fillRect(bx - 8, y - 18 + sway, 16, 2.5);
  // Head and cap.
  g.fillStyle(0xd8b494, alpha); g.fillCircle(bx + dir * lean * 2, y - 35 + sway, 6);
  g.fillStyle(0x2a4a2a, alpha); g.fillEllipse(bx + dir * lean * 2, y - 39 + sway, 14, 6);
  g.fillStyle(EMBER, 0.9 * alpha); g.fillCircle(bx + dir * (lean * 2 + 3), y - 35 + sway, 1.1);
  // Arm out to the hand.
  const hx = bx + dir * 12, hy = y - 24 + sway;
  g.lineStyle(3, dim(HUNT_RED, 0.2), alpha); g.lineBetween(bx + dir * 4, y - 26 + sway, hx, hy);
  g.fillStyle(0xd8b494, alpha); g.fillCircle(hx, hy, 2.5);
  if (held) held(hx, hy);
}
