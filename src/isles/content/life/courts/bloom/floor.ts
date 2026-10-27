import type { ArenaFloor } from '../../../../IslesTypes';
import { lit } from '../../../../art/IsleArt';
import { cloche, flower, flowerPot, roseBush, stripeBed, titheStake, yewWall } from './art';
import {
  BLOOM_GOLD, BLOOM_PINK, BLOOM_RED, BLOOM_VIOLET, BLOOM_WHITE, BOX, BOX_DARK, BOX_LIT, GRAVEL, GRAVEL_DARK,
  LAWN, LAWN_LIT,
} from './palette';

/**
 * The fight floor for every Bloom encounter: a mown lawn between clipped hedges. The top edge is
 * a yew wall over a striped border bed (half under the HUD), the sides are box-edged gravel with
 * pots and a cloched rose, and the bottom is a strip of raked gravel. The middle is left open —
 * the blooms, pollen, hedges, dial and vines bring their own.
 */
export const BLOOM_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Mown stripes, diagonal for the arena so it never reads as the world map.
  g.fillStyle(LAWN, 1); g.fillRect(0, 0, W, H);
  for (let i = -H; i < W; i += 96) {
    g.fillStyle(LAWN_LIT, 0.4);
    g.fillTriangle(i, H, i + 48, H, i + 48 + H * 0.6, 0);
    g.fillTriangle(i, H, i + H * 0.6, 0, i + 48 + H * 0.6, 0);
  }
  for (let i = 0; i < 200; i++) {
    const x = rng() * W, y = 110 + rng() * (H - 110);
    if (rng() < 0.15) { g.fillStyle(BLOOM_WHITE, 0.8); g.fillCircle(x, y, 1.4); }
    else { g.fillStyle(lit(LAWN, 0.2), 0.3); g.fillRect(x, y, 1.5, 2); }
  }
  // The top: a yew wall and a striped border in front of it.
  yewWall(g, 0, 70, W, 56);
  stripeBed(g, { x: 20, y: 76, w: W - 40, h: 26 },
    [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_WHITE, BLOOM_PINK, BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_WHITE, BLOOM_PINK, BLOOM_RED, BLOOM_GOLD],
    rng, { vertical: true, stakes: false });
  for (let i = 0; i < 6; i++) titheStake(g, 80 + i * 160, 112, i + 1, i === 3);
  // Box-edged gravel down both sides.
  for (const x0 of [0, W - 34]) {
    g.fillStyle(GRAVEL_DARK, 1); g.fillRect(x0, 104, 34, H - 104);
    g.fillStyle(GRAVEL, 1); g.fillRect(x0 + 2, 104, 30, H - 104);
    const ex = x0 === 0 ? 34 : W - 40;
    g.fillStyle(BOX_DARK, 1); g.fillRect(ex, 104, 6, H - 104);
    g.fillStyle(BOX, 1); g.fillRect(ex, 104, 5, H - 104);
    g.fillStyle(BOX_LIT, 0.6); g.fillRect(ex, 104, 5, 2);
  }
  for (let y = 180; y < H - 60; y += 140) {
    flowerPot(g, 17, y, 1, [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET][(y / 140) % 3 | 0], rng);
    flowerPot(g, W - 17, y + 70, 1, [BLOOM_PINK, BLOOM_WHITE, BLOOM_RED][(y / 140) % 3 | 0], rng);
  }
  // A cloched rose in two corners.
  for (const [x, y, c] of [[80, H - 56, BLOOM_RED], [W - 80, 170, BLOOM_WHITE]] as [number, number, number][]) {
    roseBush(g, x, y, 0.9, c, rng);
    cloche(g, x, y, 24);
  }
  // Raked gravel along the bottom, edged in box.
  g.fillStyle(BOX_DARK, 1); g.fillRect(0, H - 30, W, 6);
  g.fillStyle(BOX, 1); g.fillRect(0, H - 31, W, 5);
  g.fillStyle(GRAVEL, 1); g.fillRect(0, H - 24, W, 24);
  g.lineStyle(1, GRAVEL_DARK, 0.5);
  for (let k = 0; k < 4; k++) g.lineBetween(0, H - 20 + k * 5, W, H - 20 + k * 5);
  // A few fallen petals, swept nowhere near enough.
  for (let i = 0; i < 26; i++) flower(g, 60 + rng() * (W - 120), 130 + rng() * (H - 190), 1.6, BLOOM_PINK, 'bud');
};
