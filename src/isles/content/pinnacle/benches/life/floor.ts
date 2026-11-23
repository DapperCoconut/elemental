import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, crackPath, glassFloor, seam, shard, starfield } from '../../../../art/PinnacleArt';
import { GREEN, glassLeaf, greenLeaf, obsidianTree, poly, rootSplit, vine } from './art';

/**
 * The Thorn Bench as a fighting floor: a square of polished black glass under the hanging shears.
 * The two blade tips come down into the top of the frame (over the HUD strip and just below it),
 * glass trees stand along both sides, and the floor is split everywhere by green roots — the
 * middle kept clear for the decrees to draw on. Painted once.
 */
export const BENCH_LIFE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 48, rng);
  // A soft violet reflection across the glass, and the darker margins.
  g.fillStyle(OBS.skyGlow, 0.08); g.fillEllipse(W / 2, H * 0.6, W * 0.9, H * 0.5);
  g.fillStyle(0x000000, 0.25); g.fillRect(0, 0, 70, H); g.fillRect(W - 70, 0, 70, H);
  // The sky through the roof, up behind the HUD.
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, 70);
  starfield(g, 0, 0, W, 70, rng, 70, 0);
  for (let x = 0; x <= W; x += 120) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x - 6, 0, 12, 76);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x - 2, 0, x - 2, 76);
  }
  g.fillStyle(OBS.facet, 1); g.fillRect(0, 70, W, 10);
  g.lineStyle(1.4, OBS.edge, 0.7); g.lineBetween(0, 70, W, 70);
  // Roots splitting the floor, green in the cracks.
  for (let i = 0; i < 22; i++) {
    const x = 60 + rng() * (W - 120), y = 110 + rng() * (H - 150);
    rootSplit(g, x, y, 40 + rng() * 70, rng() * Math.PI * 2, rng);
  }
  // Long vines in from both sides along the floor.
  for (let i = 0; i < 6; i++) {
    const west = i % 2 === 0;
    const y0 = 140 + i * 80 + rng() * 30;
    const pts = [{ x: west ? 0 : W, y: y0 }];
    for (let k = 1; k <= 5; k++) pts.push({ x: (west ? 0 : W) + (west ? 1 : -1) * k * (26 + rng() * 20), y: y0 + Math.sin(k + i) * 18 });
    vine(g, pts, 2.4, rng, { leaves: 12, bloom: 0.1 });
  }
  // Fallen glass leaves.
  for (let i = 0; i < 120; i++) glassLeaf(g, rng() * W, 96 + rng() * (H - 96), rng() * Math.PI * 2, 5 + rng() * 5, rng() < 0.05 ? 1 : 0, 0.85);
  for (let i = 0; i < 18; i++) greenLeaf(g, rng() * W, 110 + rng() * (H - 120), rng() * Math.PI * 2, 7, 0.7);
  // Glass trees along both margins, crowns half out of frame.
  obsidianTree(g, 38, 250, 0.75, rng, { lean: 10 });
  obsidianTree(g, 30, 520, 0.85, rng, { lean: 14, vines: 2 });
  obsidianTree(g, W - 36, 300, 0.8, rng, { lean: -12, vines: 2 });
  obsidianTree(g, W - 30, 600, 0.9, rng, { lean: -10 });
  // The bottom kerb: a step of obsidian with a seam.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, H - 18, W, 18);
  g.fillStyle(OBS.sheen, 1); g.fillRect(0, H - 18, W, 4);
  seam(g, crackPath({ x: 40, y: H - 9 }, { x: W - 40, y: H - 7 }, rng, 4, 12), 1, 0.6);
  for (const x of [120, 300, 690, 860]) shard(g, x, H - 14, 18, 26 + rng() * 14, (rng() - 0.5) * 10, 0.2);
  // The shears overhead: two blade tips hanging down into the top of the floor, and their shadow.
  poly(g, [W / 2 - 40, 96, W / 2 - 260, 330, W / 2 - 236, 340, W / 2 - 10, 120], 0x000000, 0.22);
  poly(g, [W / 2 + 40, 96, W / 2 + 260, 330, W / 2 + 236, 340, W / 2 + 10, 120], 0x000000, 0.22);
  for (const s of [-1, 1]) {
    const bx = W / 2 + s * 70, tipX = W / 2 + s * 200, tipY = 118;
    poly(g, [bx - 26, 0, bx + 26, 0, tipX, tipY], OBS.glass);
    poly(g, [bx + s * 6, 0, bx + 26 * s, 0, tipX, tipY], OBS.facet);
    g.lineStyle(4, OBS.seam, 0.25); g.lineBetween(bx - 26 * s, 0, tipX, tipY);
    g.lineStyle(1.5, OBS.edge, 0.95); g.lineBetween(bx - 26 * s, 0, tipX, tipY);
    g.fillStyle(GREEN.vine, 0.8); g.fillCircle(bx + (tipX - bx) * 0.6 - s * 6, tipY * 0.6, 3);
  }
};
