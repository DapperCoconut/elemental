import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, mixC } from '../../../../art/IsleArt';
import { balloon, crankWheel, meter, porthole, springLamp } from './art';
import {
  ARC_BLUE, BRICK, BRICK_DARK, COPPER, COPPER_DARK, COPPER_LIT, INSULATOR, IRON, IRON_LIT, LATEX_LIT, RUBBER,
  RUBBER_SHEEN, TILE, TILE_DARK, TILE_LIT, TILE_RED, TILE_RED_LIT, TOY_COLORS, TOY_YELLOW, WINDOW,
} from './palette';

/**
 * The fight floor for every Bounce encounter: a back yard of the rubber town at night. Rubber
 * tile underfoot, glossy from the rain, framed by a red-and-black chequer border; along the top
 * (half under the HUD) the backs of crank-houses — porthole windows, crank wheels, brass meters
 * — with the Grid's cable sagging across from pylon to pylon; spring lamps down the sides and a
 * cluster of tethered gasbags in two corners. The middle is left open for each fight's rule.
 */
export const BOUNCE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Rubber tile, laid in a running bond.
  g.fillStyle(TILE_DARK, 1); g.fillRect(0, 0, W, H);
  const T = 32;
  for (let r = 0; r * T * 0.7 < H; r++) {
    for (let x = (r % 2) * T * 0.5 - T; x < W + T; x += T) {
      const y = r * T * 0.7;
      const k = rng();
      g.fillStyle(k < 0.08 ? RUBBER : k < 0.55 ? TILE : mixC(TILE, TILE_LIT, 0.3), 1);
      g.fillRoundedRect(x + 1.5, y + 1.5, T - 3, T * 0.7 - 3, 6);
      g.fillStyle(TILE_LIT, 0.25); g.fillRoundedRect(x + 4, y + 3, T - 12, 3, 2);
    }
  }
  // Puddles catching the storm-light.
  for (let i = 0; i < 9; i++) {
    const x = 80 + rng() * (W - 160), y = 150 + rng() * (H - 220);
    g.fillStyle(ARC_BLUE, 0.06); g.fillEllipse(x, y, 60 + rng() * 80, 14 + rng() * 14);
    g.fillStyle(0xffffff, 0.05); g.fillEllipse(x - 10, y - 3, 30, 4);
  }
  // A red-and-black chequer border.
  const B = 18;
  for (const [x0, y0, w, h] of [[0, 100, W, B], [0, H - B, W, B], [0, 100, B, H - 100], [W - B, 100, B, H - 100]] as [number, number, number, number][]) {
    for (let y = y0; y < y0 + h; y += B) {
      for (let x = x0; x < x0 + w; x += B) {
        const k = ((x / B) + (y / B)) & 1;
        g.fillStyle(k ? TILE_RED : RUBBER, 1); g.fillRect(x, y, B, B);
        if (k) { g.fillStyle(TILE_RED_LIT, 0.4); g.fillRect(x + 2, y + 2, B - 4, 3); }
      }
    }
  }
  g.lineStyle(2, TOY_YELLOW, 0.6); g.strokeRect(B + 2, 100 + B + 2, W - B * 2 - 4, H - 100 - B * 2 - 4);

  // The backs of the crank-houses along the top.
  const houses = 6;
  const hw = W / houses;
  for (let i = 0; i < houses; i++) {
    const x0 = i * hw;
    const wall = [0x5a3a3a, 0x4a3a4a, 0x5a4a3a, 0x4a4050][i % 4];
    g.fillStyle(dim(wall, 0.3), 1); g.fillRect(x0, 0, hw, 102);
    g.fillStyle(wall, 1); g.fillRect(x0 + 3, 4, hw - 6, 96);
    for (let y = 8; y < 100; y += 7) { g.lineStyle(1, dim(wall, 0.25), 0.5); g.lineBetween(x0 + 3, y, x0 + hw - 3, y); }
    // Bulging rubber eaves.
    g.fillStyle(RUBBER, 1); g.fillEllipse(x0 + hw / 2, 4, hw + 10, 26);
    g.fillStyle(RUBBER_SHEEN, 0.35); g.fillEllipse(x0 + hw * 0.36, 0, hw * 0.3, 6);
    const on = rng() < 0.6;
    porthole(g, x0 + hw * 0.3, 44, 9, on);
    porthole(g, x0 + hw * 0.7, 44, 9, on && rng() < 0.8);
    meter(g, x0 + hw * 0.5, 78, 1.1, on ? 0.6 : 0.05, !on);
    crankWheel(g, x0 + hw - 14, 66, 12, rng() * 6);
    if (on) glow(g, x0 + hw * 0.5, 44, 50, WINDOW, 0.02, 2);
  }
  g.fillStyle(BRICK_DARK, 1); g.fillRect(0, 98, W, 6);
  g.fillStyle(BRICK, 1); g.fillRect(0, 98, W, 3);

  // Two pylons and the Grid cable sagging between them over the yard.
  for (const x of [30, W - 30]) {
    g.lineStyle(4, IRON, 1); g.lineBetween(x - 10, 104, x - 3, 8); g.lineBetween(x + 10, 104, x + 3, 8);
    for (let y = 20; y < 100; y += 16) { g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(x - 9, y + 14, x + 9, y); }
    g.fillStyle(IRON, 1); g.fillRect(x - 20, 14, 40, 4);
    for (const k of [-1, 1]) { g.fillStyle(INSULATOR, 0.9); g.fillEllipse(x + k * 16, 10, 7, 4); }
  }
  for (const [y, sag] of [[8, 40], [10, 52]] as [number, number][]) {
    g.lineStyle(3, COPPER_DARK, 0.9);
    g.beginPath(); g.moveTo(46, y);
    for (let i = 1; i <= 24; i++) { const k = i / 24; g.lineTo(46 + (W - 92) * k, y + Math.sin(k * Math.PI) * sag); }
    g.strokePath();
    g.lineStyle(1, COPPER_LIT, 0.6);
    g.beginPath(); g.moveTo(46, y - 1);
    for (let i = 1; i <= 24; i++) { const k = i / 24; g.lineTo(46 + (W - 92) * k, y - 1 + Math.sin(k * Math.PI) * sag); }
    g.strokePath();
  }
  // Drops to each attic.
  for (let i = 0; i < houses; i++) {
    const x = i * hw + hw / 2, k = x / W;
    g.lineStyle(1.5, COPPER, 0.7); g.lineBetween(x, 10 + Math.sin(k * Math.PI) * 52, x, 2);
  }

  // Spring lamps down both sides.
  for (let y = 210; y < H - 40; y += 150) { springLamp(g, 9, y, 0.8); springLamp(g, W - 9, y + 70, 0.8); }
  // Gasbags tethered in two corners.
  for (const [cx, cy] of [[60, H - 30], [W - 60, 150]] as [number, number][]) {
    for (let k = 0; k < 4; k++) balloon(g, cx + (k - 1.5) * 9, cy, 9 + (k % 2) * 3, TOY_COLORS[(k + cx) % TOY_COLORS.length], 34 + k * 8, (k - 1.5) * 6);
    g.fillStyle(IRON, 1); g.fillRoundedRect(cx - 12, cy - 4, 24, 10, 3);
  }
  // Chalk: a hopscotch someone started, and a tally of strikes on the wall line.
  for (let i = 0; i < 5; i++) { g.lineStyle(1.5, LATEX_LIT, 0.35); g.strokeRect(W - 180 + (i % 2) * 26, H - 60 - i * 22, 26, 22); }
  for (let i = 0; i < 7; i++) { g.lineStyle(1.5, LATEX_LIT, 0.5); g.lineBetween(120 + i * 6, 112, 118 + i * 6, 128); }
  g.lineStyle(1.5, LATEX_LIT, 0.5); g.lineBetween(116, 124, 160, 116);
};
