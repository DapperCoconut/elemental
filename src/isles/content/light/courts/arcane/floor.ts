import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { anchorPylon, bookStack, rune, sigilCircle, slateBoard, slatePaving } from './art';
import {
  CHALK, GOLD, GOLD_DARK, MANA, MARBLE, MARBLE_DARK, MARBLE_LIT, MARBLE_SHADE, ROBE, ROBE_DARK, SCORCH, VIOLET,
} from './palette';

/**
 * The fight floor for every Arcane encounter: the Proving Flags behind the Academy, where students
 * duel for their seals. Slate paving scored with a century of practice circles; a faint great
 * circle burned across the middle (faint, so each rule's own art reads over it); the Academy's
 * colonnade and its ultramarine banners along the top under the HUD; brass anchor-pylons down
 * both sides; a slate-board and a stack of grimoires in the corners where the proctors sit.
 */
export const ARCANE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  slatePaving(g, { x: 0, y: 0, w: W, h: H }, rng, 48);
  // Glare: the noon washes the middle of the yard pale.
  glow(g, W / 2, (H + 96) / 2, 360, 0xffffff, 0.025, 5);
  // The great practice circle, faint.
  sigilCircle(g, W / 2, (H + 96) / 2, 250, 0.78, GOLD, 0.35, 6, 3);
  // Scorch rings from old duels.
  for (let i = 0; i < 9; i++) {
    const x = 80 + rng() * (W - 160), y = 140 + rng() * (H - 200);
    g.lineStyle(2, SCORCH, 0.2); g.strokeEllipse(x, y, 40 + rng() * 40, 26 + rng() * 20);
    if (rng() < 0.5) rune(g, x, y, 6, i, CHALK, 0.25, 1.2);
  }
  // The colonnade along the top: plinth, columns, banners, entablature.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(0, 0, W, 108);
  g.fillStyle(MARBLE, 1); g.fillRect(0, 0, W, 100);
  for (let x = 30; x < W; x += 90) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 9, 10, 18, 92);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 7, 10, 6, 92);
    g.fillStyle(GOLD, 1); g.fillRect(x - 12, 8, 24, 6);
  }
  for (let x = 75; x < W; x += 180) {
    g.fillStyle(ROBE_DARK, 1); g.fillRect(x - 13, 18, 26, 64);
    g.fillStyle(x % 360 < 180 ? ROBE : VIOLET, 1); g.fillRect(x - 12, 18, 24, 62);
    g.fillTriangle(x - 12, 80, x + 12, 80, x, 92);
    g.lineStyle(1.5, CHALK, 0.95); g.strokeCircle(x, 46, 8);
    rune(g, x, 46, 5, x / 180, CHALK, 0.9, 1.2);
  }
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(0, 104, W, 8);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(0, 104, W, 2);
  // Brass pylons down both sides, and a gilt kerb.
  for (const x of [22, W - 22]) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 16, 112, 32, H - 112);
    g.fillStyle(MARBLE, 1); g.fillRect(x - 14, 112, 28, H - 112);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x < W / 2 ? x + 14 : x - 16, 112, 2, H - 112);
  }
  for (let y = 230; y < H - 20; y += 170) { anchorPylon(g, 22, y, 0.6); anchorPylon(g, W - 22, y + 80, 0.6); }
  // A mana glint on each pylon crystal.
  for (let y = 230; y < H - 20; y += 170) { glow(g, 22, y - 66, 10, MANA, 0.05, 2); glow(g, W - 22, y + 14, 10, MANA, 0.05, 2); }
  // The proctors' corners.
  slateBoard(g, 92, H - 18, 70, rng);
  bookStack(g, W - 80, H - 22, 5, rng);
  bookStack(g, W - 104, H - 18, 3, rng);
  // A gilt kerb along the bottom.
  g.fillStyle(dim(MARBLE, 0.1), 1); g.fillRect(0, H - 12, W, 12);
  g.fillStyle(GOLD, 0.7); g.fillRect(0, H - 12, W, 1.5);
};
