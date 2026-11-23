import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import { crystalBall, eye, gamingLamp, suitPip, SUITS } from './art';
import {
  CANDLE, CARD_RED, EBONY, FLAME, GILT, GILT_DARK, IVORY, MIND, STONE_DARK, VELVET, VELVET_DARK, VELVET_LIT, WOOD,
  WOOD_DARK, WOOD_LIT,
} from './palette';

/**
 * The fight floor for every Mind Court encounter: the back room of a séance parlour on Séance
 * Row, cleared for a reading. A plum carpet patterned in small gilt eyes and suit-pips, a dark
 * wainscot along the back wall with the curtains drawn (half under the HUD) and a crystal ball
 * on a sideboard, chairs pushed back to the walls, candle sconces down the sides and a lamp in
 * each lower corner. The middle is left bare — the board, the cards, the floating furniture,
 * the wheel and the cord bring their own.
 */
export const MIND_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // The carpet: plum with a lattice of gilt diamonds, an eye or a pip in each.
  g.fillStyle(VELVET_DARK, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(VELVET, 1); g.fillRect(30, 110, W - 60, H - 140);
  const S = 64;
  for (let y = 110; y < H - 30; y += S / 2) {
    for (let x = 30 + (((y - 110) / (S / 2)) % 2) * (S / 2); x < W - 30; x += S) {
      g.lineStyle(1, GILT_DARK, 0.35);
      g.lineBetween(x, y - S / 4, x + S / 4, y); g.lineBetween(x + S / 4, y, x, y + S / 4);
      g.lineBetween(x, y + S / 4, x - S / 4, y); g.lineBetween(x - S / 4, y, x, y - S / 4);
      if (rng() < 0.18) eye(g, x, y, 7, GILT_DARK, MIND, 0.35);
      else if (rng() < 0.3) suitPip(g, x, y, 4, SUITS[Math.floor(rng() * 4)], GILT_DARK, 0.4);
    }
  }
  // A worn path across the middle where the chairs used to be.
  g.fillStyle(dim(VELVET, 0.15), 0.4); g.fillEllipse(W / 2, (H + 110) / 2, 640, 300);
  // The carpet's fringed border.
  g.lineStyle(4, GILT, 0.7); g.strokeRect(34, 114, W - 68, H - 148);
  g.lineStyle(1.5, CARD_RED, 0.6); g.strokeRect(42, 122, W - 84, H - 164);
  for (let x = 34; x < W - 34; x += 6) { g.lineStyle(1, GILT_DARK, 0.6); g.lineBetween(x, H - 34, x + 1, H - 26); }
  // Floorboards round the carpet.
  for (const [x0, w] of [[0, 30], [W - 30, 30]] as [number, number][]) {
    for (let y = 104; y < H; y += 22) { g.fillStyle(y % 44 ? WOOD : dim(WOOD, 0.1), 1); g.fillRect(x0, y, w, 21); }
  }
  for (let x = 0; x < W; x += 40) { g.fillStyle(x % 80 ? WOOD : dim(WOOD, 0.1), 1); g.fillRect(x, H - 26, 39, 26); }

  // The back wall: wainscot and drawn curtains, the sideboard with the ball.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(0, 0, W, 108);
  for (let x = 0; x < W; x += 96) {
    g.fillStyle(dim(WOOD, 0.2), 1); g.fillRect(x + 8, 44, 80, 56);
    g.lineStyle(1.5, WOOD_LIT, 0.4); g.strokeRect(x + 12, 48, 72, 48);
  }
  for (const k of [0, 1]) {
    const cx = k ? W * 0.78 : W * 0.22;
    g.fillStyle(dim(VELVET, 0.3), 1); g.fillRect(cx - 90, 0, 180, 100);
    for (let i = 0; i < 9; i++) {
      g.fillStyle(i % 2 ? VELVET : VELVET_LIT, 1); g.fillRect(cx - 90 + i * 20, 0, 12, 100 - (i % 3) * 3);
    }
    g.fillStyle(GILT, 1); g.fillRect(cx - 96, 0, 192, 6);
    for (let x = cx - 90; x < cx + 90; x += 9) { g.fillStyle(GILT_DARK, 1); g.fillCircle(x, 10, 2); }
  }
  g.fillStyle(WOOD, 1); g.fillRect(W / 2 - 70, 78, 140, 22);
  g.fillStyle(WOOD_LIT, 1); g.fillRect(W / 2 - 74, 76, 148, 5);
  crystalBall(g, W / 2, 78, 15, 0.6);
  for (const k of [-1, 1]) { g.fillStyle(IVORY, 1); g.fillRect(W / 2 + k * 50 - 2, 62, 4, 14); g.fillStyle(FLAME, 1); g.fillEllipse(W / 2 + k * 50, 58, 4, 7); }
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 104, W, 6);

  // Candle sconces down the side walls, their light pooled on the boards.
  for (let y = 190; y < H - 60; y += 130) {
    for (const x of [14, W - 14]) {
      glow(g, x, y, 46, CANDLE, 0.04, 3);
      g.fillStyle(GILT_DARK, 1); g.fillRect(x - 4, y, 8, 10);
      g.fillStyle(IVORY, 1); g.fillRect(x - 2, y - 12, 4, 12);
      g.fillStyle(FLAME, 1); g.fillEllipse(x, y - 15, 4, 7);
    }
  }
  // Chairs pushed back against the walls.
  for (const [x, y] of [[64, 150], [W - 64, 150], [64, H - 70], [W - 64, H - 70], [200, 130], [W - 200, 130]] as [number, number][]) {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 12, y - 2, 24, 6); g.fillRect(x - 10, y - 22, 3, 22); g.fillRect(x + 7, y - 22, 3, 22);
    g.fillStyle(VELVET_LIT, 1); g.fillRect(x - 11, y - 5, 22, 5);
    g.fillStyle(WOOD, 1); g.fillRect(x - 10, y - 22, 20, 4);
  }
  // A lamp in each lower corner, a scatter of dropped cards and a chip or two.
  gamingLamp(g, 70, H - 30, 48);
  gamingLamp(g, W - 90, H - 30, 48);
  for (let i = 0; i < 14; i++) {
    const x = 70 + rng() * (W - 140), y = 140 + rng() * (H - 200);
    if (rng() < 0.5) { g.fillStyle(IVORY, 0.85); g.fillRect(x, y, 7, 10); g.fillStyle(rng() < 0.5 ? CARD_RED : EBONY, 1); g.fillCircle(x + 3.5, y + 5, 1.6); }
    else { g.fillStyle(rng() < 0.5 ? CARD_RED : lit(EBONY, 0.1), 1); g.fillEllipse(x, y, 8, 4); }
  }
};
