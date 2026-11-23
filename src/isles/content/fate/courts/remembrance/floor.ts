import type { ArenaFloor } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { fmn, greenLamp, memoryBottle, threeBalls } from './art';
import {
  BRICK, BRICK_DARK, GILT, LAMP_LIGHT, LETHE, LETHE_DEEP, LETHE_LIT, MEMORY_COLORS, PAPER, PAVE_BLACK, PAVE_RED,
  SEPIA_DEEP, SEPIA_LIT, STONE, STONE_DARK, TIMBER, TIMBER_DARK,
} from './palette';

/**
 * The fight floor for every Remembrance encounter: Pawn Row's paving at dusk. The isle's black and
 * red squares, set on the diamond and walked pale; the back edge is a run of shopfronts (half
 * under the HUD) whose windows are full of bottled memories; window boxes of forget-me-nots and
 * green-shaded lamps down both sides; and along the bottom the pale Lethe gutter where lapsed
 * bottles are rinsed on their way down the hill. The middle is left open — bottles, beds, frames,
 * pages and pools bring their own.
 */
export const REMEMBRANCE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Paving on the diamond.
  g.fillStyle(PAVE_BLACK, 1); g.fillRect(0, 0, W, H);
  const S = 46;
  for (let y = -S; y < H + S; y += S / 2) {
    const row = Math.round(y / (S / 2));
    for (let x = (row % 2) * (S / 2) - S; x < W + S; x += S) {
      const red = ((Math.round(x / S) + row) % 2 + 2) % 2 === 0;
      g.fillStyle(red ? PAVE_RED : PAVE_BLACK, 1);
      g.fillTriangle(x, y - S / 2, x + S / 2, y, x, y + S / 2);
      g.fillTriangle(x, y - S / 2, x - S / 2, y, x, y + S / 2);
    }
  }
  // A sepia wash, walked pale in a broad band across the middle.
  g.fillStyle(SEPIA_LIT, 0.16); g.fillRect(0, 0, W, H);
  g.fillStyle(SEPIA_LIT, 0.1); g.fillEllipse(W / 2, (H + 100) / 2, W * 0.9, H * 0.6);
  for (let i = 0; i < 160; i++) { g.fillStyle(lit(SEPIA_LIT, 0.3), 0.1); g.fillCircle(rng() * W, 110 + rng() * (H - 110), 1 + rng() * 2.5); }

  // The back edge: shopfronts with glowing bottle windows and gilt balls.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(0, 0, W, 118);
  for (let x = 0; x < W; x += 160) {
    g.fillStyle(BRICK, 1); g.fillRect(x + 2, 0, 156, 114);
    g.fillStyle(0x1e1a16, 1); g.fillRect(x + 14, 30, 100, 72);
    for (let s = 0; s < 2; s++) {
      for (let bx = x + 22; bx < x + 110; bx += 11) memoryBottle(g, bx, 60 + s * 32, 0.7, MEMORY_COLORS[Math.floor(rng() * MEMORY_COLORS.length)], 0.8);
    }
    glow(g, x + 64, 66, 50, LAMP_LIGHT, 0.03, 3);
    g.lineStyle(2, TIMBER, 1); g.strokeRect(x + 14, 30, 100, 72);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 122, 44, 28, 70);
    threeBalls(g, x + 120, 18, 0.8);
  }
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 112, W, 8);
  g.fillStyle(STONE, 1); g.fillRect(0, 112, W, 4);

  // Down both sides: kerbs with window boxes of forget-me-nots and green lamps.
  for (const x0 of [0, W - 26]) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(x0, 120, 26, H - 120);
    g.fillStyle(STONE, 1); g.fillRect(x0 + 2, 120, 22, H - 120);
    for (let y = 150; y < H - 50; y += 70) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 3, y, 20, 12);
      for (let k = 0; k < 4; k++) fmn(g, x0 + 6 + k * 5, y - 1, 2, 1);
    }
  }
  for (const [x, y] of [[44, 300], [W - 44, 470]] as [number, number][]) greenLamp(g, x, y);

  // The Lethe gutter along the bottom, pale and still, a rinsed bottle caught in it.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, H - 30, W, 30);
  g.fillStyle(LETHE_DEEP, 1); g.fillRect(0, H - 24, W, 20);
  g.fillStyle(LETHE, 1); g.fillRect(0, H - 22, W, 14);
  for (let x = 20; x < W; x += 70) { g.lineStyle(1, LETHE_LIT, 0.5); g.strokeEllipse(x + rng() * 30, H - 15, 30, 5); }
  memoryBottle(g, 620, H - 10, 0.8, 0xc8d6d2, 0.2);

  // Lapsed tickets and pressed petals blown across the paving.
  for (let i = 0; i < 30; i++) {
    const x = 60 + rng() * (W - 120), y = 140 + rng() * (H - 200);
    if (rng() < 0.55) { g.fillStyle(PAPER, 0.75); g.fillRect(x, y, 10, 6); g.fillStyle(0xa83a2a, 0.7); g.fillRect(x + 1, y + 2, 8, 1.5); }
    else fmn(g, x, y, 1.7, 0.7);
  }
  // A gilt ring let into the paving at the heart, where the pledge-table stands on market days.
  g.lineStyle(3, GILT, 0.3); g.strokeCircle(W / 2, (H + 110) / 2, 150);
  // A sepia hush pressing in at the edges.
  for (let i = 0; i < 6; i++) { g.lineStyle(40, SEPIA_DEEP, 0.045); g.strokeRect(i * 18, i * 18, W - i * 36, H - i * 36); }
};
