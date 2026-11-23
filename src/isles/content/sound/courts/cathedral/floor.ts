import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import { candle, choirStalls, lancet, tuningFork } from './art';
import {
  ASHLAR, ASHLAR_DARK, ASHLAR_LIT, CANDLELIGHT, FLAG, FLAG_DARK, FLAG_LIT, GILT, GLASS_COLORS, GROUT, OAK, OAK_DARK,
  OAK_LIT, SNOW, WAX,
} from './palette';

/**
 * The fight floor for every Cathedral encounter: the nave. Long pale limestone slabs laid in
 * courses, worn hollow down the middle by pilgrims' knees, with brass memorial plates let into
 * them — every one engraved with a fork and a name, the voices given to the Organ. The top edge
 * is the choir screen under the HUD with lancets lit from the chancel behind; the sides are the
 * column bases of the arcades with pews' ends and racks of votives; cold window light falls across
 * the floor in long blue-white panes, and warm candlelight pools at the sides.
 */
export const CATHEDRAL_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Slabs in staggered courses.
  g.fillStyle(GROUT, 1); g.fillRect(0, 0, W, H);
  const SH = 44;
  for (let y = 96, row = 0; y < H; y += SH, row++) {
    const off = row % 2 ? 0 : 60;
    for (let x = -off; x < W; x += 120) {
      const t = rng();
      g.fillStyle(t < 0.33 ? FLAG : t < 0.66 ? lit(FLAG, 0.06) : dim(FLAG, 0.05), 1);
      g.fillRect(x + 1, y + 1, 118, SH - 2);
      g.fillStyle(FLAG_LIT, 0.25); g.fillRect(x + 1, y + 1, 118, 3);
    }
  }
  // The middle worn smooth and pale by knees.
  g.fillStyle(lit(FLAG, 0.15), 0.25); g.fillRect(W / 2 - 110, 96, 220, H - 96);
  // Memorial brasses: a fork and three lines of "name" on each.
  for (let i = 0; i < 9; i++) {
    const x = 120 + (i % 3) * 360 + (rng() - 0.5) * 60, y = 180 + Math.floor(i / 3) * 150 + (rng() - 0.5) * 40;
    g.fillStyle(dim(GILT, 0.35), 0.8); g.fillRect(x - 16, y - 22, 32, 44);
    g.fillStyle(GILT, 0.6); g.fillRect(x - 14, y - 20, 28, 40);
    tuningFork(g, x, y + 2, 18, dim(GILT, 0.5), 0.8);
    for (let l = 0; l < 3; l++) { g.lineStyle(1, dim(GILT, 0.5), 0.8); g.lineBetween(x - 10, y + 8 + l * 4, x + 10, y + 8 + l * 4); }
  }
  // Cold window light: long panes of blue-white laid diagonally across the floor.
  for (let i = 0; i < 5; i++) {
    const x0 = 60 + i * 200;
    g.fillStyle(0xd8e8ff, 0.07); g.fillTriangle(x0, 96, x0 + 70, 96, x0 + 230, H);
    g.fillTriangle(x0, 96, x0 + 160, H, x0 + 230, H);
    g.fillStyle(GLASS_COLORS[i % 5], 0.05); g.fillTriangle(x0 + 20, 96, x0 + 50, 96, x0 + 190, H);
  }
  // The choir screen along the top, under the HUD: oak tracery, lancets lit from the chancel behind.
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(0, 0, W, 100);
  g.fillStyle(ASHLAR, 1); g.fillRect(0, 0, W, 92);
  for (let i = 0; i < 8; i++) lancet(g, 60 + i * 120, 84, 30, 70, i, 0.75);
  choirStalls(g, W / 2 - 120, 100, 7, 34);
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, 96, W, 10);
  g.fillStyle(OAK_LIT, 1); g.fillRect(0, 96, W, 3);
  // Column bases down both sides, each with a votive rack between.
  for (const side of [0, 1]) {
    const x = side ? W - 26 : 26;
    for (let y = 160; y < H; y += 150) {
      g.fillStyle(ASHLAR_DARK, 1); g.fillCircle(x, y, 26);
      g.fillStyle(ASHLAR, 1); g.fillCircle(x, y - 2, 22);
      g.fillStyle(ASHLAR_LIT, 1); g.fillCircle(x - 6, y - 8, 8);
      // A rack of votives at the column's foot, lit.
      for (let k = 0; k < 5; k++) candle(g, x + (side ? -40 : 40) + (k - 2) * 7, y + 60, 6 + (k % 3) * 3, rng() < 0.8, WAX);
      glow(g, x + (side ? -40 : 40), y + 50, 50, CANDLELIGHT, 0.035, 3);
    }
    // Pew-ends between the columns.
    for (let y = 230; y < H - 20; y += 150) {
      const px = side ? W - 70 : 70;
      g.fillStyle(OAK_DARK, 1); g.fillRect(px - 6, y, 12, 40);
      g.fillStyle(OAK, 1); g.fillRect(px - 5, y, 8, 38);
      g.fillStyle(OAK_LIT, 1); g.fillCircle(px - 1, y - 2, 6);
    }
  }
  // Snow trodden in from the stair, along the bottom edge.
  for (let i = 0; i < 18; i++) { g.fillStyle(SNOW, 0.35); g.fillEllipse(W / 2 + (rng() - 0.5) * 300, H - 10 - rng() * 30, 30 + rng() * 30, 6); }
  g.fillStyle(FLAG_DARK, 0.4); g.fillRect(0, H - 6, W, 6);
};
