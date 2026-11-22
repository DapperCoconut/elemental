import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BASALT, DUST, FOAM, GRANITE, GRANITE_DARK, IRON, LIME, LIME_DARK, REGENT, ROPE, SAND_DARK, SAND_LIT, SANDSTONE, SEA,
  SEA_SHALLOW, SHALE, TIMBER, TIMBER_DARK, blockStack, drillMarks, frameSaw, gravaneSeal, poly, rockHouse, spalls, stoneBarge,
  strataFace,
} from './art';

/**
 * The fight floor for every Quarrymouth quest duel: the dressing-yard on the quay, where blocks come
 * down off the face to be squared before they go on the Scales. Along the top (half under the HUD)
 * the lower quarry face stands in its beds — sandstone, shale, limestone — with drill-scars down it
 * and two doorways cut into its foot. The floor is the yard's own bedrock, sawn flat in great slabs:
 * every slab still carries the parallel score-lines of the frame saw that cut it, and the joints are
 * packed with grey slurry and chips. A chalk-line runs across the middle where a block was marked
 * out and never cut. The treadwheel crane's long shadow lies over it from the right. Along the
 * bottom is the basalt kerb and the milky harbour, a loaded barge moored off it. The middle is clear.
 */
export const QUARRYMOUTH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 118;
  const BOT = H - 62;

  // Slurry under everything — it shows in the joints.
  g.fillStyle(mixC(SAND_DARK, SHALE, 0.4), 1); g.fillRect(0, 0, W, H);

  // ── The sawn slabs: big rectangles of bedrock, each scored by the saw in one direction.
  const rows = [TOP, TOP + 96, TOP + 214, TOP + 316, BOT];
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r], y1 = rows[r + 1];
    let x = -rng() * 80;
    while (x < W) {
      const sw = 150 + rng() * 170;
      const col = mixC(SANDSTONE, rng() < 0.5 ? LIME : SAND_LIT, rng() * 0.5);
      g.fillStyle(dim(col, 0.25), 1); g.fillRect(x + 2, y0 + 2, sw - 4, y1 - y0 - 4);
      g.fillStyle(col, 1); g.fillRect(x + 3, y0 + 3, sw - 6, y1 - y0 - 7);
      g.fillStyle(lit(col, 0.2), 0.5); g.fillRect(x + 3, y0 + 3, sw - 6, 2);
      // Saw-scores: fine parallel lines, horizontal or vertical by slab.
      const vert = rng() < 0.4;
      g.lineStyle(1, dim(col, 0.12), 0.55);
      if (vert) for (let k = x + 8; k < x + sw - 6; k += 4 + rng() * 2) g.lineBetween(k, y0 + 5, k, y1 - 6);
      else for (let k = y0 + 7; k < y1 - 6; k += 4 + rng() * 2) g.lineBetween(x + 5, k, x + sw - 6, k);
      // The odd fossil shell in the bed, and a drill-hole where a plug once went.
      if (rng() < 0.3) {
        const fx = x + 20 + rng() * (sw - 40), fy = y0 + 14 + rng() * (y1 - y0 - 28);
        g.lineStyle(1, dim(col, 0.35), 0.8);
        g.beginPath(); g.arc(fx, fy, 6, Math.PI, 0, false); g.strokePath();
        for (let k = -2; k <= 2; k++) g.lineBetween(fx, fy, fx + k * 2.6, fy - 5.5);
      }
      if (rng() < 0.35) { g.fillStyle(dim(col, 0.5), 1); g.fillCircle(x + 10 + rng() * (sw - 20), y0 + 10 + rng() * (y1 - y0 - 20), 3); }
      x += sw;
    }
    // Chips packed into the joint under this row.
    for (let cx = 0; cx < W; cx += 6 + rng() * 10) {
      g.fillStyle([LIME, SAND_LIT, SHALE][Math.floor(rng() * 3)], 0.8); g.fillRect(cx, y1 - 2 + (rng() - 0.5) * 2, 2 + rng() * 2, 2);
    }
  }
  // Dust scuffed pale where feet go, darker where the slurry has been washed.
  for (let i = 0; i < 20; i++) {
    g.fillStyle(DUST, 0.06 + rng() * 0.06);
    g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 60 + rng() * 140, 14 + rng() * 26);
  }
  // A chalk-line across the middle: a block marked out and never cut, the mason's sign at its corner.
  g.lineStyle(1.5, 0xf0ece0, 0.4);
  g.lineBetween(W * 0.22, H * 0.47, W * 0.78, H * 0.47);
  g.lineBetween(W * 0.22, H * 0.47, W * 0.22, H * 0.62); g.lineBetween(W * 0.78, H * 0.47, W * 0.78, H * 0.62);
  g.lineStyle(1, 0xf0ece0, 0.3); g.lineBetween(W * 0.22 + 6, H * 0.47 + 6, W * 0.22 + 14, H * 0.47 + 14); g.lineBetween(W * 0.22 + 14, H * 0.47 + 6, W * 0.22 + 6, H * 0.47 + 14);
  // The Regent's trilithon stencilled on a slab near the Scales' side — the yard's tithe-mark.
  gravaneSeal(g, W * 0.3, H * 0.74, 26, dim(SANDSTONE, 0.35), 0.5);
  // The crane's shadow, a long raked bar falling in from the right, and its rope's thinner line.
  poly(g, [[W, H * 0.24], [W, H * 0.29], [W * 0.62, H * 0.52], [W * 0.6, H * 0.5]], 0x000000, 0.12);
  g.lineStyle(1.5, 0x000000, 0.1); g.lineBetween(W * 0.61, H * 0.51, W * 0.6, H * 0.66);
  g.fillStyle(0x000000, 0.1); g.fillRect(W * 0.6 - 16, H * 0.66, 32, 20);

  // ── The lower face along the top, two doors cut into its foot.
  strataFace(g, 0, W, 0, TOP - 12, rng);
  for (let x = 40; x < W; x += 90 + rng() * 60) drillMarks(g, x, 8, TOP - 20, SANDSTONE, 0.5);
  rockHouse(g, 180, TOP - 6, 110, 74, { glow: 0xffa850 }, rng);
  rockHouse(g, W - 220, TOP - 6, 100, 70, {}, rng);
  g.fillStyle(0x000000, 0.25); g.fillRect(0, TOP - 12, W, 10);

  // ── The kerb and the harbour along the bottom.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, BOT, W, H - BOT);
  g.fillStyle(SEA, 1); g.fillRect(0, BOT + 30, W, H - BOT - 30);
  for (let x = 0; x < W; x += 28) { g.fillStyle(FOAM, 0.2 + rng() * 0.2); g.fillEllipse(x + 14, BOT + 8, 20, 3); }
  for (let i = 0; i < 10; i++) { g.fillStyle(DUST, 0.1); g.fillEllipse(rng() * W, BOT + 18 + rng() * 30, 80, 6); }
  g.fillStyle(BASALT, 1); g.fillRect(0, BOT - 10, W, 14);
  for (let x = 0; x < W; x += 22) { g.fillStyle(mixC(BASALT, GRANITE_DARK, 0.4), 1); g.fillRect(x + 1, BOT - 10, 20, 5); }
  for (let x = 90; x < W; x += 210) { g.lineStyle(2, IRON, 1); g.strokeCircle(x, BOT + 4, 4); }
  stoneBarge(g, W * 0.68, H - 6, 180, rng);

  // ── Yard clutter at the corners, out of the middle.
  frameSaw(g, 110, BOT - 34);
  blockStack(g, W - 110, BOT - 22, 4, 3, 18, LIME, rng);
  spalls(g, 230, BOT - 26, 12, rng);
  spalls(g, W - 70, TOP + 52, 10, rng);
  // A banker with a mallet and a coiled rope, under the left door.
  g.fillStyle(LIME_DARK, 1); g.fillRect(60, TOP + 26, 70, 22);
  g.fillStyle(LIME, 1); g.fillRect(60, TOP + 22, 70, 7);
  g.fillStyle(TIMBER, 1); g.fillEllipse(110, TOP + 18, 14, 10);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(110, TOP + 18, 124, TOP + 28);
  g.lineStyle(3, ROPE, 1); g.strokeEllipse(160, TOP + 46, 26, 9); g.strokeEllipse(160, TOP + 42, 18, 6);
  // A grey stain where the Regent's clerk sets his ledger-stand, and a granite bollard at the right door.
  blob(g, W - 160, TOP + 40, 30, 10, mixC(REGENT, SHALE, 0.5), 0.35, rng);
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(W - 290, TOP + 14, 14, 20);
  g.fillStyle(GRANITE, 1); g.fillEllipse(W - 283, TOP + 14, 16, 7);
};
