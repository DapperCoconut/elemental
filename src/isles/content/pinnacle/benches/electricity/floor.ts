import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, crackPath, glassFloor, seam, shard } from '../../../../art/PinnacleArt';
import { BRASS, COPPER, COPPER_DARK, COPPER_LIT, VOLT, bolt, cable, leydenJar, meterDial } from './art';

/**
 * The fighting floor for all six Storm Bench decrees: the conductor's well of black glass. The
 * top is the wall of the room — a face of glass shards with the Meter set in it, needle pinned,
 * and a rank of Leyden jars to either side; trunk cables come down the two side walls and run
 * in under the floor, and the floor itself is polished obsidian with a copper border inlay and
 * arcs frozen in the glass like flies in amber. The middle is left clear — every decree brings
 * its own floor furniture.
 */
export const STORM_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 64, rng);
  // Frozen arcs trapped down in the glass: dim, still, everywhere.
  for (let i = 0; i < 14; i++) {
    const x = 60 + rng() * (W - 120), y = 130 + rng() * (H - 180);
    const a = rng() * Math.PI * 2, l = 40 + rng() * 90;
    bolt(g, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i * 7.7 + 3, 1, VOLT, 0.16, 1);
  }
  // Violet seams in the glass.
  for (let i = 0; i < 7; i++) {
    const a = { x: rng() * W, y: 120 + rng() * (H - 140) };
    const b = { x: a.x + (rng() - 0.5) * 260, y: a.y + (rng() - 0.5) * 160 };
    seam(g, crackPath(a, b, rng, 10, 6), 1.2, 0.55);
  }
  // Copper border inlay, double-lined, with brass rivets at the corners of each tile-run.
  g.lineStyle(4, COPPER_DARK, 1); g.strokeRect(46, 126, W - 92, H - 150);
  g.lineStyle(1.5, COPPER_LIT, 0.7); g.strokeRect(50, 130, W - 100, H - 158);
  for (let x = 46; x <= W - 46; x += 96) {
    g.fillStyle(BRASS, 0.9); g.fillCircle(x, 126, 2.5); g.fillCircle(x, H - 24, 2.5);
  }
  // The back wall: a face of shards from the top edge down to y≈118.
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, 118);
  for (let x = -20; x < W + 40; x += 34 + rng() * 22) shard(g, x, 120, 50 + rng() * 30, 90 + rng() * 60, (rng() - 0.5) * 14, rng() * 0.5);
  g.fillStyle(OBS.sheen, 1); g.fillRect(0, 116, W, 5);
  g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(0, 116, W, 116);
  // Arcs crawling inside the wall.
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * (W - 120) / 4 + (rng() - 0.5) * 60;
    bolt(g, x, 30 + rng() * 30, x + (rng() - 0.5) * 80, 104, i * 11.3, 1.2, VOLT, 0.45, 1);
  }
  // Trunk cables down both side walls, bending in under the floor at the foot.
  cable(g, [{ x: 18, y: 0 }, { x: 22, y: H * 0.55 }, { x: 70, y: H - 30 }, { x: 260, y: H + 10 }], 26);
  cable(g, [{ x: W - 18, y: 0 }, { x: W - 22, y: H * 0.5 }, { x: W - 76, y: H - 26 }, { x: W - 300, y: H + 10 }], 26);
  // Rank of jars on the wall either side of the Meter.
  for (let i = 0; i < 4; i++) {
    leydenJar(g, 90 + i * 62, 118, 0.62, 0.35 + i * 0.12, i * 0.7, VOLT);
    leydenJar(g, W - 90 - i * 62, 118, 0.62, 0.35 + i * 0.12, i * 0.9 + 3, VOLT);
  }
  // Bus bars from the jars to the Meter.
  g.lineStyle(5, COPPER_DARK, 1); g.lineBetween(90, 60, W - 90, 60);
  g.lineStyle(2, COPPER, 1); g.lineBetween(90, 59, W - 90, 59);
  // The Meter, set in the wall, needle pinned at the stop.
  meterDial(g, W / 2, 120, 108, 1, 1.3, { mask: false });
};
