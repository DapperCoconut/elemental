import Phaser from 'phaser';
import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import { FLAME, FLAME_CORE, FLAME_MID, HONEY, HONEY_DARK, WAX, WAX_OLD, WAX_SHADE, candle, hexPath } from './art';

/**
 * The Candlewick fighting floor — the Chandlers' Guild yard where the court settles its quarrels.
 * A floor of pale wax poured into a honeycomb mould (gold cells where the honey-wax was used),
 * two drip-runnels cut diagonally across it to drain the hot wax off, old spills pooled and set
 * where they fell, and a row of guild candles along the top and bottom walls.
 */
export const candlewickFloor: ArenaFloor = (g, W, H, rng) => {
  g.fillStyle(mixC(WAX, WAX_SHADE, 0.35), 1); g.fillRect(0, 0, W, H);

  // Honeycomb mould.
  const r = 22;
  const dx = r * Math.sqrt(3), dy = r * 1.5;
  for (let row = 0, y = 96 - r; y < H + r; row++, y += dy) {
    for (let x = (row % 2) * (dx / 2) - dx; x < W + dx; x += dx) {
      const gold = rng() < 0.09;
      const c = gold ? mixC(HONEY, WAX, 0.45) : mixC(WAX, rng() < 0.5 ? 0xffffff : WAX_SHADE, rng() * 0.25);
      hexPath(g, x, y, r - 1.5, c, 1);
      if (gold) { g.fillStyle(0xffffff, 0.18); g.fillEllipse(x - 5, y - 6, 12, 5); }
    }
  }
  // Grout lines read as the mould's ridges.
  for (let row = 0, y = 96 - r; y < H + r; row++, y += dy) {
    for (let x = (row % 2) * (dx / 2) - dx; x < W + dx; x += dx) {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
      }
      g.lineStyle(1.5, dim(WAX_SHADE, 0.2), 0.55); g.strokePoints(pts, true, true);
    }
  }

  // Two drip-runnels, cut corner to corner.
  for (const [x0, y0, x1, y1] of [[-20, 120, W + 20, H - 40], [W + 20, 130, -20, H - 30]]) {
    g.lineStyle(16, dim(WAX_OLD, 0.15), 0.5); g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(9, mixC(HONEY, WAX, 0.5), 0.75); g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(2, 0xffffff, 0.35); g.lineBetween(x0, y0 - 3, x1, y1 - 3);
  }

  // Old spills, set where they fell.
  for (let i = 0; i < 14; i++) {
    const x = 60 + rng() * (W - 120), y = 130 + rng() * (H - 190);
    const rx = 16 + rng() * 34;
    g.fillStyle(dim(WAX, 0.12), 0.6); g.fillEllipse(x + 2, y + 2, rx * 2, rx * 1.2);
    g.fillStyle(lit(WAX, 0.12), 0.9); g.fillEllipse(x, y, rx * 1.9, rx * 1.1);
    g.fillStyle(0xffffff, 0.25); g.fillEllipse(x - rx * 0.35, y - rx * 0.2, rx * 0.5, rx * 0.18);
  }

  // A gold guild-mark at the centre: a hive inside the court's ring.
  const cx = W / 2, cy = (H + 96) / 2;
  g.lineStyle(4, HONEY_DARK, 0.5); g.strokeCircle(cx, cy, 64);
  g.lineStyle(1.5, HONEY, 0.6); g.strokeCircle(cx, cy, 56);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(mixC(HONEY, WAX, 0.3), 0.7);
    g.fillEllipse(cx, cy + 16 - i * 11, 52 - i * 10, 12);
  }

  // Guild candles along the walls (baked, so the flames are still).
  for (let x = 30; x < W; x += 62) {
    for (const y of [110, H - 8]) {
      const tip = candle(g, x + (rng() - 0.5) * 10, y, 14 + rng() * 6, 22 + rng() * 26, mixC(WAX, HONEY, rng() * 0.2), rng, 0.4);
      g.fillStyle(FLAME_MID, 0.16); g.fillCircle(tip.x, tip.y - 4, 13);
      g.fillStyle(FLAME, 0.95); g.fillTriangle(tip.x - 3, tip.y, tip.x + 3, tip.y, tip.x, tip.y - 11);
      g.fillStyle(FLAME_CORE, 0.95); g.fillCircle(tip.x, tip.y - 2, 2);
    }
  }
};
