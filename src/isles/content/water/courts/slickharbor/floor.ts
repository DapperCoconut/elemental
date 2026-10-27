import type { ArenaFloor } from '../../../../IslesTypes';
import { dim } from '../../../../art/IsleArt';
import {
  CRUDE, SAFETY_RED, SEA, SEA_LIT, STEEL, STEEL_DARK, STEEL_LIT, TAR, TIMBER, TIMBER_DARK, blobPts, bollard,
  crudePuddle, drumEnd, hawserCoil, planks, queensMark, safetyStripes, sheenAt, slick,
} from './util';

/**
 * Slickharbor's fight floor — a stretch of the tarred quay. Long planks laid east–west, blotted
 * with tar seams and old spills; the harbour's black, rainbow-skinned water along the bottom
 * rail under a red-and-white quay-edge cap with bollards; a crude main on sleepers along the
 * top with its flanges weeping; tithe drums stacked in the corners; the Queen's lamp-and-tide
 * mark stencilled faintly where the craneman can read it from the cab. The middle is left calm so
 * every encounter's oil, tar and fire reads on top of it.
 */
export const SLICKHARBOR_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  const seaTop = H - 34;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 0, W, H);

  // The quay deck.
  planks(g, { x: 0, y: top, w: W, h: seaTop - top }, true, rng, TIMBER, 22);

  // Old spills soaked into the boards: a few dull ones, two that still hold a sheen.
  for (let i = 0; i < 10; i++) {
    g.fillStyle(CRUDE, 0.22 + rng() * 0.18);
    g.fillPoints(blobPts(40 + rng() * (W - 80), top + 40 + rng() * (seaTop - top - 80), 30 + rng() * 60, 10 + rng() * 22, i * 2.3), true, true);
  }
  slick(g, W * 0.18, top + 120, 46, 16, 3.1, 1.2, 0.55);
  slick(g, W * 0.82, seaTop - 90, 54, 18, 7.7, 3.4, 0.55);
  for (let i = 0; i < 6; i++) crudePuddle(g, 60 + rng() * (W - 120), top + 50 + rng() * (seaTop - top - 100), 8 + rng() * 10, i + 0.3, 0.55);

  // Capped well discs bolted through the deck.
  for (const c of [{ x: W * 0.3, y: (top + seaTop) / 2 + 60 }, { x: W * 0.7, y: (top + seaTop) / 2 - 70 }]) {
    g.fillStyle(STEEL_DARK, 1); g.fillCircle(c.x, c.y, 17);
    g.fillStyle(STEEL, 1); g.fillCircle(c.x, c.y, 14);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.fillStyle(STEEL_LIT, 1); g.fillCircle(c.x + Math.cos(a) * 10.5, c.y + Math.sin(a) * 10.5, 1.5);
    }
    g.fillStyle(SAFETY_RED, 0.8); g.fillCircle(c.x, c.y, 4);
  }

  // The Queen's mark, stencilled in faded gold.
  queensMark(g, W / 2, (top + seaTop) / 2 + 18, 64, 0xd8c070, 0.12);
  g.lineStyle(2, 0xd8c070, 0.1); g.strokeCircle(W / 2, (top + seaTop) / 2 - 4, 98);

  // Crude main on sleepers along the top rail.
  for (let x = 10; x < W; x += 64) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, top + 2, 12, 22); }
  g.fillStyle(0x000000, 0.35); g.fillRect(0, top + 18, W, 5);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(0, top + 4, W, 16);
  g.fillStyle(0x2c3036, 1); g.fillRect(0, top + 6, W, 11);
  g.fillStyle(STEEL_LIT, 0.5); g.fillRect(0, top + 8, W, 2);
  for (let x = 80; x < W; x += 160) {
    g.fillStyle(SAFETY_RED, 1); g.fillRect(x - 4, top + 2, 8, 20);
    g.fillStyle(CRUDE, 0.85); g.fillEllipse(x + 4, top + 26, 16, 5);
    g.fillStyle(CRUDE, 0.85); g.fillRect(x + 2, top + 20, 2, 5);
  }

  // Red-and-white kerbs down the sides.
  safetyStripes(g, { x: 0, y: top + 22, w: 12, h: seaTop - top - 22 }, 0.6, 16);
  safetyStripes(g, { x: W - 12, y: top + 22, w: 12, h: seaTop - top - 22 }, 0.6, 16);

  // The harbour along the bottom: slate water under a crude skin, sheen in long bands.
  g.fillStyle(SEA, 1); g.fillRect(0, seaTop, W, H - seaTop);
  for (let i = 0; i < 12; i++) {
    g.fillStyle(rng() < 0.6 ? CRUDE : SEA_LIT, 0.4);
    g.fillEllipse(rng() * W, seaTop + 8 + rng() * (H - seaTop - 10), 60 + rng() * 90, 6 + rng() * 6);
  }
  for (let i = 0; i < 9; i++) {
    g.lineStyle(1.5, sheenAt(i * 0.8 + rng()), 0.3);
    g.strokeEllipse(rng() * W, seaTop + 10 + rng() * (H - seaTop - 14), 50 + rng() * 80, 5 + rng() * 4);
  }
  // Quay-edge cap timber and bollards along it.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, seaTop - 6, W, 9);
  safetyStripes(g, { x: 0, y: seaTop - 4, w: W, h: 4 }, 0.7, 14);
  for (const bx of [120, 360, 600, 840]) bollard(g, bx, seaTop - 4, 0.9);
  for (const bx of [170, 650]) hawserCoil(g, bx, seaTop - 22, 11);

  // Tithe drums stacked in the corners.
  const corner = (cx: number, cy: number): void => {
    const cols = [0x3a1e18, 0x2a2a30, SAFETY_RED, 0x1e3a2a];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 3 - row; i++) {
      drumEnd(g, cx + (i - (2 - row) / 2) * 22, cy - row * 19, 11, cols[(i + row * 2) % cols.length]);
    }
  };
  corner(52, top + 48);
  corner(W - 52, top + 48);

  // Tar footprints crossing the deck, someone's shift path from the main to the water.
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const x = W * 0.12 + t * W * 0.25 + (i % 2) * 8, y = top + 40 + t * (seaTop - top - 80);
    g.fillStyle(TAR, 0.4); g.fillEllipse(x, y, 7, 4);
  }
  g.fillStyle(dim(TIMBER, 0.5), 0.3); g.fillRect(0, top, W, 2);
};
