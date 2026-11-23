import type { ArenaFloor } from '../../../../IslesTypes';
import { aurielStatue, clearFigure, marbleSlabs, ropePost, queueRope, strawUrn, sunburstInlay } from './art';
import { GOLD, GOLD_DARK, GOLD_LIT, LIME, LIME_DARK, LIME_LIT, MARBLE_DEEP, MARBLE_LIT, SCORCH } from './palette';

/**
 * The fight floor for every Noon encounter: a stretch of the sun-plaza. Great marble slabs throw
 * the glare back up; a gilt sunburst is inlaid at the middle; along the top (half under the HUD)
 * stands a colonnade of the Despot's statues; down both sides run limestone kerbs with straw
 * urns and the brass rope-posts of a queue, a few Clears waiting in it. The open middle is left
 * for the lens, the bell, the awnings, the mirrors and the sun dogs to bring their own.
 */
export const NOON_FLOOR: ArenaFloor = (g, W, H, rng) => {
  marbleSlabs(g, { x: 0, y: 0, w: W, h: H }, 80, rng);
  // A wash of glare toward the middle, where the sun stands on the stone.
  for (let i = 0; i < 6; i++) { g.fillStyle(MARBLE_LIT, 0.06); g.fillEllipse(W / 2, (H + 100) / 2, W * (1 - i * 0.14), (H - 100) * (1 - i * 0.14)); }
  sunburstInlay(g, W / 2, (H + 100) / 2, 200, 16, 0.62, 0.55);
  // Gilt meridian lines ruled through the paving, north–south and east–west.
  g.lineStyle(2, GOLD_DARK, 0.45); g.lineBetween(W / 2, 110, W / 2, H); g.lineBetween(0, (H + 100) / 2, W, (H + 100) / 2);
  g.lineStyle(1, GOLD_LIT, 0.45); g.lineBetween(W / 2 - 1, 110, W / 2 - 1, H); g.lineBetween(0, (H + 100) / 2 - 1, W, (H + 100) / 2 - 1);
  // A few old scorch rings, where the Glass has been practised.
  for (let i = 0; i < 4; i++) {
    const x = 120 + rng() * (W - 240), y = 160 + rng() * (H - 260);
    g.fillStyle(SCORCH, 0.08); g.fillEllipse(x, y, 60, 34);
    g.lineStyle(1, SCORCH, 0.12); g.strokeEllipse(x, y, 70, 40);
  }
  // The colonnade of statues along the top, over a limestone terrace step.
  g.fillStyle(LIME_DARK, 1); g.fillRect(0, 84, W, 26);
  g.fillStyle(LIME, 1); g.fillRect(0, 84, W, 20);
  g.fillStyle(LIME_LIT, 1); g.fillRect(0, 84, W, 3);
  for (let x = 70; x < W; x += 160) aurielStatue(g, x, 108, 0.62);
  // Limestone kerbs down both sides.
  for (const x0 of [0, W - 30]) {
    g.fillStyle(LIME_DARK, 1); g.fillRect(x0, 110, 30, H - 110);
    g.fillStyle(LIME, 1); g.fillRect(x0 + 2, 110, 26, H - 110);
    g.fillStyle(x0 ? MARBLE_DEEP : LIME_LIT, 0.8); g.fillRect(x0 === 0 ? 28 : W - 30, 110, 2, H - 110);
  }
  for (let y = 190; y < H - 40; y += 150) { strawUrn(g, 15, y, 0.7, rng); strawUrn(g, W - 15, y + 75, 0.7, rng); }
  // A queue rope across the bottom corner, three Clears waiting along it.
  const qy = H - 18;
  for (let i = 0; i < 4; i++) ropePost(g, 600 + i * 90, qy);
  for (let i = 0; i < 3; i++) queueRope(g, 600 + i * 90, qy, 690 + i * 90, qy);
  for (let i = 0; i < 3; i++) clearFigure(g, 640 + i * 90, qy - 6, 0.8, 1, -1);
  // Gilt studs at the slab corners near the sunburst.
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.fillStyle(GOLD, 0.7); g.fillCircle(W / 2 + Math.cos(a) * 250, (H + 100) / 2 + Math.sin(a) * 155, 2.5); }
};
