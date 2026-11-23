import type { ArenaFloor } from '../../../../IslesTypes';
import { auriel, paintPot, splat } from './art';
import {
  CANVAS, CANVAS_DARK, GOLD, GOLD_DARK, LIME_WET, PAVE, PAVE_DARK, PAVE_LIT, PIGMENTS, SKY, SKY_LIT, STONE, STONE_DARK,
  STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from './palette';

/**
 * The fight floor for every Mural encounter: a painters' yard behind the Great Mural. Big white
 * flags laid on the diagonal (so it never reads as the world), the foot of a mural along the top
 * under the HUD — painted sky and the hem of the Despot's robe — scaffold poles down both sides
 * hung with dust-sheets, drop-cloths and pots in the corners, and paint spilled everywhere a
 * painter has ever stood. The middle is left open — the wheel, the doors, the rollers, the
 * numbers and the easel bring their own.
 */
export const MURAL_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Diagonal limestone flags.
  g.fillStyle(PAVE, 1); g.fillRect(0, 0, W, H);
  const S = 56;
  for (let i = -H; i < W + H; i += S) {
    g.lineStyle(1.5, PAVE_DARK, 0.45); g.lineBetween(i, 0, i + H, H);
    g.lineStyle(1.5, PAVE_DARK, 0.45); g.lineBetween(i, H, i + H, 0);
  }
  for (let i = 0; i < 70; i++) {
    const x = rng() * W, y = 100 + rng() * (H - 100);
    g.fillStyle(rng() < 0.5 ? PAVE_LIT : PAVE_DARK, 0.35); g.fillRect(x, y, 18 + rng() * 26, 2);
  }
  // The foot of a mural along the top: noon sky, the hem of His robe, gilt frame band.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, W, 108);
  g.fillStyle(SKY, 1); g.fillRect(0, 0, W, 92);
  for (let i = 0; i < 5; i++) { g.fillStyle(SKY_LIT, 0.25); g.fillRect(0, i * 14, W, 7); }
  g.fillStyle(STONE_LIT, 1); g.fillRect(0, 70, W, 22);
  for (let x = 30; x < W; x += 60) {
    if (Math.abs(x - W / 2) < 90) continue;
    const c = PIGMENTS[Math.floor(rng() * PIGMENTS.length)];
    g.fillStyle(c, 1); g.fillEllipse(x, 80, 16, 12);
    g.fillStyle(0xf0c8a0, 1); g.fillCircle(x + 2, 70, 4);
  }
  auriel(g, W / 2, 92, 0.95);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(0, 92, W, 8);
  g.fillStyle(GOLD, 1); g.fillRect(0, 93, W, 4);
  g.fillStyle(STONE, 1); g.fillRect(0, 100, W, 10);
  g.fillStyle(STONE_LIT, 1); g.fillRect(0, 100, W, 3);
  // A censor's square of wet lime on the mural, drips running.
  g.fillStyle(LIME_WET, 1); g.fillRect(W * 0.28, 60, 34, 26);
  for (let k = 0; k < 3; k++) g.fillRect(W * 0.28 + 4 + k * 11, 86, 3, 8 + k * 5);
  // Scaffold poles and dust-sheets down both sides.
  for (const x of [14, W - 14]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, 104, 8, H - 104);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 4, 104, 3, H - 104);
    for (let y = 150; y < H; y += 120) { g.lineStyle(2, 0xc8b088, 1); g.strokeCircle(x, y, 6); }
  }
  for (const [x, y, d] of [[30, 200, 1], [W - 30, 360, -1]] as [number, number, number][]) {
    g.fillStyle(CANVAS_DARK, 1); g.fillRect(d > 0 ? x : x - 46, y, 46, 130);
    g.fillStyle(CANVAS, 1); g.fillRect(d > 0 ? x : x - 44, y, 42, 126);
    for (let k = 1; k < 4; k++) { g.lineStyle(1, CANVAS_DARK, 0.8); g.lineBetween((d > 0 ? x : x - 44) + k * 11, y, (d > 0 ? x : x - 44) + k * 11 + 2, y + 124); }
    for (let i = 0; i < 6; i++) splat(g, (d > 0 ? x + 6 : x - 38) + rng() * 30, y + 10 + rng() * 110, 2 + rng() * 2, PIGMENTS[i % PIGMENTS.length], rng, 0.85);
  }
  // Drop-cloths and pots in the bottom corners, a trestle of brushes.
  for (const [x, y] of [[110, H - 60], [W - 140, H - 50]] as [number, number][]) {
    g.fillStyle(CANVAS_DARK, 1); g.fillRect(x - 70, y - 26, 140, 52);
    g.fillStyle(CANVAS, 1); g.fillRect(x - 72, y - 28, 140, 52);
    for (let i = 0; i < 8; i++) splat(g, x - 66 + rng() * 128, y - 22 + rng() * 42, 2 + rng() * 4, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], rng, 0.85);
    for (let i = 0; i < 3; i++) paintPot(g, x - 40 + i * 30, y + 6, PIGMENTS[(i + (x > W / 2 ? 3 : 0)) % PIGMENTS.length], 1.1);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(W - 120, 140, 80, 6); g.fillRect(W - 116, 146, 4, 26); g.fillRect(W - 48, 146, 4, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(W - 120, 138, 80, 3);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(PIGMENTS[i], 1); g.fillRect(W - 114 + i * 12, 128, 4, 10);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(W - 113 + i * 12, 112, 2, 16);
  }
  // Paint spilled everywhere a painter ever stood.
  for (let i = 0; i < 40; i++) splat(g, 50 + rng() * (W - 100), 130 + rng() * (H - 180), 2 + rng() * 6, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], rng, 0.5);
  // The bottom kerb: white stone, a gutter of run-off colour.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, H - 14, W, 14);
  g.fillStyle(STONE, 1); g.fillRect(0, H - 14, W, 4);
  for (let x = 0; x < W; x += 40) { g.fillStyle(PIGMENTS[(x / 40) % PIGMENTS.length], 0.6); g.fillRect(x, H - 8, 40, 3); }
  // Hard noon: a glare at the very top of the yard.
  g.fillStyle(0xffffff, 0.06); g.fillRect(0, 104, W, 40);
  g.lineStyle(1, TIMBER, 0.2); g.strokeRect(2, 2, W - 4, H - 4);
};
