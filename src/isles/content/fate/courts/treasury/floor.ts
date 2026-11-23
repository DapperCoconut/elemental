import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { bankLamp, coinFlat, coinStack, ingotPile, moneyBag } from './art';
import {
  BAIZE, BAIZE_DARK, BAIZE_LIT, BRASS, BRASS_DARK, GOLD, GOLD_DARK, LACQUER, LACQUER_LIT, LAMP_GLOW, LAMP_GREEN, MARBLE,
  MARBLE_DARK, MARBLE_LIT, MARBLE_VEIN, PAPER, PAVE_BLACK, PAVE_RED,
} from './palette';

/**
 * The fight floor for every Treasury encounter: the counting-house hall. A floor of polished
 * marble laid in great red-and-black lozenges, ruled with brass strips like a ledger; down the
 * top wall (half under the HUD) a run of tellers' counters with their green lamps and coin
 * scales; strongroom bars down both sides; coin sacks and ingot stacks in the corners. The middle
 * is left clear for the presses, the strongbox, the gilt, the turnstiles and the pans.
 */
export const TREASURY_FLOOR: ArenaFloor = (g, W, H, rng) => {
  g.fillStyle(MARBLE, 1); g.fillRect(0, 0, W, H);
  // Lozenges: diamonds of card red and card black on the white marble.
  const DW = 96, DH = 64;
  for (let row = 0; row * DH / 2 < H + DH; row++) {
    for (let col = 0; col * DW < W + DW; col++) {
      const cx = col * DW + (row % 2 ? DW / 2 : 0), cy = 100 + row * (DH / 2);
      const k = (row + col) % 3;
      if (k === 2) continue;
      g.fillStyle(k ? PAVE_RED : PAVE_BLACK, 0.85);
      g.fillPoints([{ x: cx, y: cy - DH / 2 + 3 }, { x: cx + DW / 2 - 4, y: cy }, { x: cx, y: cy + DH / 2 - 3 }, { x: cx - DW / 2 + 4, y: cy }], true);
    }
  }
  // Veins in the marble.
  for (let i = 0; i < 40; i++) {
    const x = rng() * W, y = 110 + rng() * (H - 110);
    g.lineStyle(1, MARBLE_VEIN, 0.35);
    g.lineBetween(x, y, x + 20 + rng() * 50, y + (rng() - 0.5) * 30);
  }
  // Ledger rules: brass strips let into the floor.
  for (let y = 180; y < H - 40; y += 110) { g.fillStyle(BRASS_DARK, 0.5); g.fillRect(40, y, W - 80, 2); }
  g.fillStyle(0xc8283a, 0.35); g.fillRect(96, 104, 2, H - 134);
  // The tellers' counters along the top wall.
  g.fillStyle(LACQUER, 1); g.fillRect(0, 0, W, 112);
  for (let x = 0; x < W; x += 120) {
    g.fillStyle(BAIZE_DARK, 1); g.fillRect(x + 10, 30, 100, 60);
    g.fillStyle(LAMP_GLOW, 0.1); g.fillRect(x + 10, 60, 100, 30);
    g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(x + 60, 66, 30, 12);
    g.fillStyle(LAMP_GLOW, 0.9); g.fillRect(x + 52, 70, 16, 2);
    g.fillStyle(PAPER, 1); g.fillRect(x + 22, 80, 22, 8);
    coinStack(g, x + 90, 90, 4, 5);
    g.lineStyle(2, BRASS, 1); for (let gx = x + 16; gx < x + 108; gx += 9) g.lineBetween(gx, 30, gx, 62);
  }
  g.fillStyle(dim(MARBLE_DARK, 0.2), 1); g.fillRect(0, 100, W, 14);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(0, 100, W, 4);
  g.fillStyle(GOLD, 1); g.fillRect(0, 110, W, 2);
  // Strongroom bars down both sides.
  for (const x0 of [0, W - 30]) {
    g.fillStyle(LACQUER_LIT, 1); g.fillRect(x0, 114, 30, H - 114);
    for (let y = 120; y < H; y += 14) { g.fillStyle(LACQUER, 1); g.fillRect(x0 + 2, y, 26, 10); }
    for (let bx = x0 + 4; bx < x0 + 30; bx += 7) { g.fillStyle(BRASS_DARK, 1); g.fillRect(bx, 114, 3, H - 114); g.fillStyle(lit(BRASS, 0.2), 0.6); g.fillRect(bx, 114, 1, H - 114); }
  }
  // A strip of baize runner along the bottom.
  g.fillStyle(BAIZE_DARK, 1); g.fillRect(30, H - 28, W - 60, 28);
  g.fillStyle(BAIZE, 1); g.fillRect(30, H - 26, W - 60, 22);
  g.fillStyle(BAIZE_LIT, 0.4); g.fillRect(30, H - 26, W - 60, 3);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(30, H - 30, W - 60, 2);
  // Coin sacks, ingots and lamps in the corners.
  moneyBag(g, 70, H - 50, 1.3); moneyBag(g, 100, H - 40, 1);
  ingotPile(g, W - 90, H - 40, 6, 0.9);
  bankLamp(g, 60, 190); bankLamp(g, W - 60, 190);
  // A few dropped coins nobody has dared pick up.
  for (let i = 0; i < 14; i++) coinFlat(g, 80 + rng() * (W - 160), 140 + rng() * (H - 200), 3 + rng() * 2);
};
