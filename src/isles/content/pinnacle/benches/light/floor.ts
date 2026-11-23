import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, crackPath, glassFloor, seam } from '../../../../art/PinnacleArt';
import { NOON, ceilingSeam, crackCaustic, lightPool, sunShaft, wallMirror } from './art';

/**
 * The fighting floor for all six Noon Bench decrees: a square of the nave's black glass under the
 * Ceiling Seam. The Seam's split plates hang along the top (half under the HUD), pouring gold down
 * onto the floor; obsidian mirrors line both sides; the brass meridian runs down the middle under
 * everything, its hour-marks all reading noon. The centre is kept open — the decrees bring the rest.
 */
export const LIGHT_BENCH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 64, rng);
  // The light from above: a broad warm wash falling off toward the bottom of the picture.
  for (let i = 0; i < 6; i++) { g.fillStyle(NOON.gold, 0.035); g.fillRect(0, 96, W, (H - 96) * (1 - i * 0.15)); }
  lightPool(g, W / 2, 200, 420, 120, 1.6);
  // The meridian: brass down the middle, faint, its marks every 80 px.
  g.fillStyle(NOON.brassDark, 0.8); g.fillRect(W / 2 - 4, 96, 8, H - 96);
  g.fillStyle(NOON.brass, 0.7); g.fillRect(W / 2 - 2, 96, 4, H - 96);
  for (let y = 140; y < H; y += 80) { g.fillStyle(NOON.brass, 0.7); g.fillRect(W / 2 - 16, y - 1, 32, 2); }
  // Gold crack-light thrown across the floor by the split overhead.
  for (let i = 0; i < 5; i++) crackCaustic(g, 80 + i * 200 + rng() * 60, 120 + rng() * 60, 140 + rng() * 140, 301 + i * 7, 0.8, Math.PI / 2 + (rng() - 0.5) * 0.8);
  // The King's violet in the old cracks, low in the picture where the gold does not reach.
  for (let i = 0; i < 8; i++) {
    const a = { x: rng() * W, y: H * 0.55 + rng() * H * 0.4 };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 180, y: a.y + (rng() - 0.5) * 80 }, rng, 8, 5), 1, 0.5);
  }
  // Rays coming down out of the Seam.
  for (let i = 0; i < 5; i++) {
    const x0 = 120 + i * 180;
    sunShaft(g, x0, 90, x0 + (x0 - W / 2) * 0.35, H * 0.8, 16, 120, 0.4);
  }
  // Mirrors down both sides, half off the picture.
  for (let y = 260, i = 0; y < H; y += 170, i++) {
    wallMirror(g, 8, y, 44, 120, -1, i % 2, 700 + i);
    wallMirror(g, W - 8, y + 80, 44, 120, 1, (i + 1) % 2, 800 + i);
  }
  // The Seam along the top: the underside of the throne-hall floor, split, gold coming through.
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, 60);
  ceilingSeam(g, W / 2, 112, W + 60, 112, 0, 1013, 0.9);
};
