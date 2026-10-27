import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, dim, lit } from '../../../../art/IsleArt';
import { foamEdge, sandRipples, shells, starfish, wormCasts } from './art';
import {
  BARNACLE, BUOY, DRIFT, DRIFT_DARK, DRIFT_LIT, MUD, PAINT_BLUE, PAINT_CREAM, PAINT_GREEN, PILE, PILE_WET, ROPE,
  SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, SHINGLE, WEED, WEED_DARK, WETSAND, WETSAND_DARK, WETSAND_LIT,
} from './palette';

/**
 * The fight floor for every Tidewater encounter: a stretch of open flats at low water, between
 * the stilt houses of the Low Walk (their piles and platforms along the top, half under the
 * HUD) and the sea (a strip of surf along the bottom). Ripple-marks run across the sand, a creek
 * fan shines in the corner, and the piles along both sides wear the high water mark. The centre
 * is left open — the tide, the crabs, the rips, the buoy and the bottles bring their own.
 */
export const TIDEWATER_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Wet sand, banded a touch darker toward the sea.
  g.fillStyle(WETSAND, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(WETSAND_DARK, 0.05 + i * 0.025);
    g.fillRect(0, H * 0.4 + i * H * 0.1, W, H * 0.1);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle(rng() < 0.5 ? WETSAND_LIT : WETSAND_DARK, 0.15 + rng() * 0.15);
    g.fillEllipse(rng() * W, 110 + rng() * (H - 110), 60 + rng() * 140, 16 + rng() * 34);
  }
  sandRipples(g, { x: 0, y: 112, w: W, h: H - 140 }, WETSAND_DARK, 0.4, rng, 15);
  wormCasts(g, { x: 30, y: 130, w: W - 60, h: H - 180 }, 60, rng);
  shells(g, { x: 20, y: 120, w: W - 40, h: H - 160 }, 90, rng);
  // Shining standing water left in the hollows.
  for (let i = 0; i < 8; i++) {
    const x = 60 + rng() * (W - 120), y = 150 + rng() * (H - 230);
    blob(g, x, y, 24 + rng() * 36, 6 + rng() * 8, SEA_SHALLOW, 0.5, rng);
    g.fillStyle(SEA_LIT, 0.3); g.fillEllipse(x - 4, y - 2, 14, 2);
  }
  // A creek fan in the bottom-left, braiding out to the sea.
  for (const [x0, y0, x1, y1] of [[0, H * 0.62, 150, H - 20], [40, H * 0.55, 230, H - 18], [0, H * 0.75, 90, H - 18]] as [number, number, number, number][]) {
    g.lineStyle(14, MUD, 0.6); g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(8, SEA_DEEP, 0.7); g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(3, SEA_LIT, 0.4); g.lineBetween(x0 + 2, y0, x1 + 2, y1);
  }
  // A starfish and a dropped crab line, the flats' only furniture.
  starfish(g, W * 0.82, H * 0.42, 9, 0xd9733e, 0.4);
  starfish(g, W * 0.18, H * 0.3, 7, 0xb0466a, 1.2);
  g.lineStyle(1.5, ROPE, 0.7);
  g.beginPath(); g.moveTo(W * 0.62, H * 0.84);
  for (let k = 0; k <= 10; k++) g.lineTo(W * 0.62 + k * 9, H * 0.84 + Math.sin(k * 1.3) * 6);
  g.strokePath();
  g.fillStyle(BUOY, 1); g.fillCircle(W * 0.62 + 92, H * 0.84 + 3, 4);

  // The Low Walk's houses along the top: piles, platforms, the bottoms of clapboard walls.
  const paints = [PAINT_BLUE, PAINT_CREAM, PAINT_GREEN, PAINT_CREAM, PAINT_BLUE, PAINT_GREEN];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const w = W / n;
    const x0 = i * w;
    const c = paints[i % paints.length];
    // Wall, above the platform (under the HUD).
    g.fillStyle(dim(c, 0.45), 1); g.fillRect(x0 + 6, 0, w - 12, 56);
    g.fillStyle(c, 1); g.fillRect(x0 + 8, 0, w - 16, 54);
    for (let y = 6; y < 54; y += 7) { g.fillStyle(dim(c, 0.16), 0.8); g.fillRect(x0 + 8, y, w - 16, 1.3); }
    g.fillStyle(dim(c, 0.55), 1); g.fillRect(x0 + w / 2 - 10, 22, 20, 32);
    g.fillStyle(0x2a2f33, 1); g.fillRect(x0 + w * 0.22, 14, 14, 14);
    // Platform and piles.
    g.fillStyle(DRIFT_DARK, 1); g.fillRect(x0, 54, w, 9);
    g.fillStyle(DRIFT_LIT, 1); g.fillRect(x0, 54, w, 2);
    for (let k = 0; k < 4; k++) {
      const px = x0 + 14 + k * ((w - 28) / 3);
      g.fillStyle(PILE, 1); g.fillRect(px - 4, 62, 8, 48);
      g.fillStyle(PILE_WET, 1); g.fillRect(px - 4, 86, 8, 24);
      g.fillStyle(WEED, 0.9); g.fillRect(px - 4, 84, 8, 3);
      g.fillStyle(BARNACLE, 0.8); g.fillCircle(px - 1, 96, 1.3); g.fillCircle(px + 2, 104, 1.3);
    }
    g.lineStyle(2, PILE_WET, 0.8);
    g.lineBetween(x0 + 14, 108, x0 + w - 14, 66); g.lineBetween(x0 + 14, 66, x0 + w - 14, 108);
  }
  // Shadow of the platforms on the sand, and a wrack line under them.
  g.fillStyle(0x000000, 0.18); g.fillRect(0, 108, W, 10);
  for (let x = 0; x < W; x += 7) {
    g.fillStyle(rng() < 0.6 ? WEED_DARK : DRIFT, 0.7); g.fillEllipse(x + rng() * 6, 120 + rng() * 5, 7, 2.5);
  }

  // Piles down both sides, every one wearing the mark.
  for (const x of [10, W - 10]) {
    for (let y = 150; y < H - 40; y += 96) {
      g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 4, 22, 7);
      g.fillStyle(PILE, 1); g.fillRect(x - 6, y - 40, 12, 42);
      g.fillStyle(PILE_WET, 1); g.fillRect(x - 6, y - 18, 12, 20);
      g.fillStyle(WEED, 0.9); g.fillRect(x - 6, y - 20, 12, 3);
      g.fillStyle(DRIFT_LIT, 1); g.fillEllipse(x, y - 40, 12, 4);
    }
    g.lineStyle(1.5, ROPE, 0.6);
    for (let y = 150; y < H - 140; y += 96) g.lineBetween(x, y - 30, x, y + 66);
  }

  // The sea along the bottom: shallows, foam, and a couple of rotten piles standing in it.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, H - 26, W, 26);
  g.fillStyle(SEA, 1); g.fillRect(0, H - 14, W, 14);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, H - 5, W, 5);
  foamEdge(g, 0, W, (x) => H - 26 + Math.sin(x * 0.03) * 2, 2.5, 0.75);
  for (const x of [W * 0.3, W * 0.71]) {
    g.fillStyle(PILE_WET, 1); g.fillRect(x - 4, H - 40, 8, 30);
    g.fillStyle(lit(SHINGLE, 0.1), 1); g.fillEllipse(x, H - 40, 8, 3);
  }
};
