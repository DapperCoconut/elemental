import type { ArenaFloor } from '../../../../IslesTypes';
import { lit } from '../../../../art/IsleArt';
import { cable, compassPost, horseshoe, ironCrag, ironPlate, pylon, slateGround } from './art';
import {
  AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET, BRASS, BRASS_DARK, FILINGS, FILINGS_LIT, IRON_DARK, NORTH, SLATE_DEEP, SOUTH,
} from './palette';

/**
 * The fight floor for every Lodestar encounter: a yard of wet slate on the crag, the filings in it
 * combed into long curves toward a lodestone somewhere off the top of the picture. Across the top
 * (half under the HUD) a rim of black iron crag with two pylons and the Grid's cable sagging
 * between them, and the aurora above it all; red and blue boundary stones down the sides; puddles
 * with the sky in them. The middle is left open — the stone, the poles, the needle and the
 * curtains bring their own.
 */
export const LODESTAR_FLOOR: ArenaFloor = (g, W, H, rng) => {
  slateGround(g, { x: 0, y: 0, w: W, h: H }, rng, 1.2);
  // The filings, all bending toward the stone somewhere north-east.
  const sx = W * 0.75, sy = -260;
  for (let i = 0; i < 46; i++) {
    let x = (i / 46) * (W + 400) - 200, y = H + 20;
    for (let s = 0; s < 70; s++) {
      const a = Math.atan2(sy - y, sx - x) + Math.sin(i * 1.7) * 0.15;
      const nx = x + Math.cos(a) * 12, ny = y + Math.sin(a) * 12;
      if (ny < 110) break;
      if (s % 2 === 0) { g.lineStyle(1.4, i % 3 ? FILINGS : FILINGS_LIT, 0.5); g.lineBetween(x, y, nx, ny); }
      x = nx; y = ny;
    }
  }
  // Puddles with the aurora in them.
  for (let i = 0; i < 9; i++) {
    const x = 80 + rng() * (W - 160), y = 160 + rng() * (H - 220);
    const w = 40 + rng() * 60;
    g.fillStyle(SLATE_DEEP, 0.8); g.fillEllipse(x, y, w, w * 0.3);
    g.fillStyle([AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET][i % 3], 0.18); g.fillEllipse(x - w * 0.1, y - 1, w * 0.6, w * 0.12);
  }
  // A couple of iron plates set flush in the slate, and lost horseshoes.
  ironPlate(g, W * 0.18, H * 0.72, 60, 38, 0.2);
  ironPlate(g, W * 0.84, H * 0.42, 54, 34, -0.4);
  for (let i = 0; i < 5; i++) horseshoe(g, 100 + rng() * (W - 200), 180 + rng() * (H - 260), 0.8, rng() * Math.PI * 2, i % 2 === 0);
  // The rim: black crag across the top, the aurora over it.
  g.fillStyle(0x0a0e14, 1); g.fillRect(0, 0, W, 110);
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 170;
    const c = [AURORA_GREEN, AURORA_TEAL, AURORA_VIOLET][i % 3];
    g.fillStyle(c, 0.12); g.fillRect(x - 50, 0, 100, 80);
    g.fillStyle(lit(c, 0.3), 0.18); g.fillRect(x - 50, 62, 100, 18);
  }
  for (let x = -20; x < W + 40; x += 70) ironCrag(g, x, 118, 0.9 + ((x / 70) % 3) * 0.15, rng);
  const a = pylon(g, 120, 116, 104), b = pylon(g, W - 120, 116, 104);
  cable(g, { x: a.x - 18, y: a.y }, { x: b.x - 18, y: b.y }, 36);
  cable(g, { x: a.x + 18, y: a.y }, { x: b.x + 18, y: b.y }, 40);
  // Boundary stones down the sides: red on the west, blue on the east, with compass posts between.
  for (let y = 170; y < H - 30; y += 110) {
    for (const [x, c] of [[18, NORTH], [W - 18, SOUTH]] as [number, number][]) {
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 4, 26, 8);
      g.fillStyle(IRON_DARK, 1); g.fillRect(x - 9, y - 26, 18, 28);
      g.fillStyle(c, 1); g.fillRect(x - 9, y - 26, 18, 7);
    }
    compassPost(g, 46, y + 55, -0.8);
    compassPost(g, W - 46, y + 55, -2.2);
  }
  // A brass survey line along the bottom.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(0, H - 14, W, 4);
  g.fillStyle(BRASS, 1); g.fillRect(0, H - 15, W, 2);
  for (let x = 20; x < W; x += 40) { g.fillStyle(BRASS, 1); g.fillRect(x, H - 20, 2, 8); }
};
