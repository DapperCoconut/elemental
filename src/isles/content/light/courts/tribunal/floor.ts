import type { ArenaFloor } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { glassPanel, marbleTerrace, robeSwag, scalesEmblem, sunburst, witnessStand } from './art';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, GLASS, GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, MARBLE_DEEP, MARBLE_LIT, MARBLE_SHADE,
  ROBE, ROBE_DARK, SUN,
} from './palette';

/**
 * The fight floor for every Tribunal encounter: the well of the Courthouse of Clarity. Polished
 * marble with a great gilt scales let into the middle; the high bench across the top under the
 * HUD, robed in purple; glass walls down both sides between gilt piers, the plaza glaring through
 * them; the public gallery's bronze rail along the bottom, a row of watching heads behind it. The
 * glass roof drops squares of hard noon straight down onto the floor — no slant, no shade.
 */
export const TRIBUNAL_FLOOR: ArenaFloor = (g, W, H, rng) => {
  marbleTerrace(g, { x: 0, y: 0, w: W, h: H }, rng, 80);
  // Squares of noon from the roof lights, straight down.
  for (let y = 150; y < H - 60; y += 150) {
    for (let x = 120; x < W - 80; x += 180) {
      g.fillStyle(SUN, 0.16); g.fillRect(x - 40, y - 26, 80, 52);
      g.lineStyle(1, GOLD_LIT, 0.18); g.strokeRect(x - 40, y - 26, 80, 52);
      g.lineStyle(1, GOLD_LIT, 0.12); g.lineBetween(x, y - 26, x, y + 26); g.lineBetween(x - 40, y, x + 40, y);
    }
  }
  // The great scales inlaid at the centre, in a ring of gold with the Despot's sun at the pivot.
  const cx = W / 2, cy = (H + 110) / 2;
  g.fillStyle(MARBLE_DEEP, 1); g.fillCircle(cx, cy, 132);
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(cx, cy, 126);
  g.lineStyle(4, GOLD_DARK, 1); g.strokeCircle(cx, cy, 122);
  g.lineStyle(2, GOLD, 1); g.strokeCircle(cx, cy, 118);
  g.lineStyle(1, GOLD, 0.6); g.strokeCircle(cx, cy, 100);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.fillStyle(GOLD_DARK, 0.7); g.fillRect(cx + Math.cos(a) * 109 - 1.5, cy + Math.sin(a) * 109 - 1.5, i % 4 === 3 ? 1 : 3, 3);
  }
  scalesEmblem(g, cx, cy + 8, 70, GOLD, 0.9);
  sunburst(g, cx, cy - 62, 14, GOLD, 1);
  // Gold rays out from the medallion to the corners.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    g.fillStyle(GOLD, 0.2);
    g.fillTriangle(cx + Math.cos(a - 0.05) * 140, cy + Math.sin(a - 0.05) * 140, cx + Math.cos(a + 0.05) * 140, cy + Math.sin(a + 0.05) * 140, cx + Math.cos(a) * 420, cy + Math.sin(a) * 420);
  }
  // The high bench across the top: purple panels, gilt edge, a gilt scales on its front.
  g.fillStyle(ROBE_DARK, 1); g.fillRect(0, 0, W, 104);
  for (let x = 0; x < W; x += 80) {
    g.fillStyle(ROBE, 1); g.fillRect(x + 6, 44, 68, 50);
    g.lineStyle(1.5, GOLD, 0.8); g.strokeRect(x + 10, 48, 60, 42);
  }
  g.fillStyle(GOLD_DARK, 1); g.fillRect(0, 98, W, 8);
  g.fillStyle(GOLD, 1); g.fillRect(0, 98, W, 4);
  g.fillStyle(GOLD_LIT, 0.8); g.fillRect(0, 98, W, 1);
  scalesEmblem(g, W / 2, 66, 20, GOLD_LIT, 1);
  for (let k = 0; k < 6; k++) robeSwag(g, k * 160, k * 160 + 160, 20, 18);
  // Glass walls down both sides between gilt piers, the plaza's glare through them.
  for (const x0 of [0, W - 46]) {
    g.fillStyle(lit(GLASS, 0.4), 1); g.fillRect(x0, 106, 46, H - 106);
    for (let y = 106; y < H; y += 92) glassPanel(g, x0 + 4, y + 4, 38, 84, 0.8);
    for (let y = 106; y < H; y += 92) { g.fillStyle(GOLD_DARK, 1); g.fillRect(x0, y - 3, 46, 6); g.fillStyle(GOLD, 1); g.fillRect(x0, y - 3, 46, 3); }
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x0 === 0 ? 44 : x0 - 2, 106, 4, H - 106);
    g.fillStyle(GLASS_LIT, 0.35); g.fillRect(x0 + 10, 120, 4, H - 160);
  }
  // Witness stands in two corners.
  witnessStand(g, 110, 190, 1, 0.8);
  witnessStand(g, W - 110, 190, 1, 0.8);
  // The public gallery rail along the bottom, heads in a row behind it.
  for (let i = 0; i < 34; i++) {
    const hx = 60 + i * 26 + rng() * 6;
    g.fillStyle([0x8a6a4a, 0x5a3a2a, 0xc8a87a, 0x3a2a20, 0xe8c8a8][i % 5], 1); g.fillCircle(hx, H - 8, 9);
    g.fillStyle(MARBLE_SHADE, 0.8); g.fillCircle(hx - 3, H - 11, 2);
  }
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(0, H - 26, W, 8);
  g.fillStyle(BRONZE, 1); g.fillRect(0, H - 26, W, 5);
  g.fillStyle(BRONZE_LIT, 0.8); g.fillRect(0, H - 26, W, 1.5);
  for (let x = 20; x < W; x += 40) { g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 2, H - 22, 4, 22); }
  // Glare off the gilt.
  glow(g, cx, cy, 160, SUN, 0.025, 4);
};
