import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, shard } from '../../../../art/PinnacleArt';
import { fenPool, fenUnderGlass, mistBank, reeds, registerFace, still } from './art';
import { VEN_DEEP } from './palette';

/**
 * The fight floor for all six Venom Bench decrees: a stretch of the bowl's glass floor with the fen
 * under it. The Register runs along the top (half under the HUD), the bowl's rim shards lean in
 * down both sides, a still drips in each top corner and two broken pools sit in the bottom corners.
 * The middle is left clear — every decree brings its own furniture.
 */
export const PIN_SLIME_FLOOR: ArenaFloor = (g, W, H, rng) => {
  fenUnderGlass(g, { x: 0, y: 0, w: W, h: H }, rng, 64, 1.4);
  for (let y = 160; y < H; y += 120) mistBank(g, 120 + rng() * (W - 240), y, 360, rng, 1);
  // The Register along the top.
  registerFace(g, -30, W + 30, -60, 104, rng);
  // Rim shards down the sides.
  for (let y = 130; y < H + 40; y += 30) {
    shard(g, 4 + rng() * 10, y, 26 + rng() * 14, 30 + rng() * 40, 8 + rng() * 6, rng() * 0.5);
    shard(g, W - 4 - rng() * 10, y, 26 + rng() * 14, 30 + rng() * 40, -8 - rng() * 6, rng() * 0.5);
  }
  g.lineStyle(2, OBS.seam, 0.3); g.lineBetween(30, 120, 30, H); g.lineBetween(W - 30, 120, W - 30, H);
  // Corners: stills above, broken pools below, reeds.
  still(g, 76, 196, 0.8, rng);
  still(g, W - 92, 196, 0.8, rng);
  fenPool(g, 70, H - 50, 46, rng);
  fenPool(g, W - 70, H - 50, 46, rng);
  reeds(g, 120, H - 90, 6, 30, rng);
  reeds(g, W - 130, H - 100, 5, 26, rng);
  // The Register weeps at its foot.
  for (let x = 20; x < W; x += 30) { g.fillStyle(VEN_DEEP, 0.45); g.fillEllipse(x + rng() * 8, 112, 10 + rng() * 8, 4); }
};
