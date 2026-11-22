import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, mixC } from '../../../../art/IsleArt';
import { crystalPoint, cutGem, geodeStone, gritFloor, hexFlags, spectrumBand } from './art';
import {
  AGATE_A, AGATE_B, AGATE_C, AGATE_D, AMETHYST, AMETHYST_DARK, AMETHYST_DEEP, AMETHYST_LIT, CHALCEDONY, CITRINE,
  DUST, QUARTZ, RIND, RIND_DARK,
} from './palette';

/**
 * The fight floor for every Geode encounter: the cutting-floor at the bottom of the geode. The
 * middle is paved in pale hexagonal quartz flags worn smooth; the top edge (half under the HUD)
 * is the geode's own wall — rind, agate bands and a forest of amethyst points leaning in; the
 * sides are banded chalcedony; the bottom is a lip of grit where the offcuts and a split geode or
 * two lie in the dust. A smear of spectrum from the crack lies across one corner. The prisms,
 * crystals, rods, stones and plates bring their own.
 */
export const GEODE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  gritFloor(g, { x: 0, y: 0, w: W, h: H }, rng, 0.8);
  hexFlags(g, { x: 70, y: 150, w: W - 140, h: H - 210 }, 30, rng);
  // Worn track across the flags where the carts run, and dust in the grout.
  g.fillStyle(DUST, 0.12); g.fillEllipse(W / 2, H / 2 + 50, W * 0.8, 160);
  // The top wall: agate bands under the HUD, points leaning in over the floor.
  const bands = [RIND_DARK, RIND, AGATE_A, AGATE_B, AGATE_C, AGATE_D, CHALCEDONY, AMETHYST_DEEP];
  bands.forEach((c, i) => {
    g.fillStyle(c, 1);
    g.fillPoints([
      { x: 0, y: 0 }, { x: W, y: 0 },
      { x: W, y: 14 + i * 13 + Math.sin(i) * 3 },
      ...Array.from({ length: 13 }, (_, k) => ({ x: W - (k * W) / 12, y: 14 + i * 13 + Math.sin(k * 0.9 + i) * 5 })),
      { x: 0, y: 14 + i * 13 },
    ], true);
  });
  for (let x = 10; x < W; x += 26 + rng() * 14) {
    const len = 24 + rng() * 34;
    crystalPoint(g, x, 120 + rng() * 6, 10 + rng() * 8, len, (rng() - 0.5) * 0.6 + Math.PI, mixC(AMETHYST, AMETHYST_LIT, rng() * 0.4));
  }
  for (let x = 20; x < W; x += 40 + rng() * 30) crystalPoint(g, x, 132, 6 + rng() * 4, 14 + rng() * 12, (rng() - 0.5) * 0.8, AMETHYST);
  // Side walls: banded chalcedony with points.
  for (const left of [true, false]) {
    for (let i = 0; i < 4; i++) {
      g.fillStyle([AGATE_A, AGATE_B, CHALCEDONY, AMETHYST_DARK][i], 1);
      const w = 44 - i * 10;
      g.fillRect(left ? 0 : W - w, 120, w, H - 120);
    }
    for (let y = 170; y < H - 40; y += 54 + rng() * 30) {
      const x = left ? 34 : W - 34;
      crystalPoint(g, x, y, 10, 26 + rng() * 14, left ? 1.2 : -1.2, mixC(AMETHYST, AMETHYST_LIT, rng() * 0.3));
    }
  }
  // The bottom lip: grit, offcuts and split geodes.
  g.fillStyle(dim(AGATE_D, 0.1), 1); g.fillRect(0, H - 40, W, 40);
  g.lineStyle(2, AGATE_B, 1); g.lineBetween(0, H - 40, W, H - 40);
  for (let i = 0; i < 6; i++) geodeStone(g, 80 + i * 160 + rng() * 40, H - 10, 12 + rng() * 5, 1, i % 2 ? AMETHYST : CITRINE);
  for (let i = 0; i < 18; i++) cutGem(g, 60 + rng() * (W - 120), H - 26 + rng() * 14, 2.5, [AMETHYST, QUARTZ, CITRINE][i % 3], 0.7);
  // A smear of spectrum across the floor from the crack.
  spectrumBand(g, W * 0.12, 120, 0.75, 520, 0.22, 0.07);
  spectrumBand(g, W * 0.88, 120, Math.PI - 0.9, 380, 0.16, 0.05);
};
