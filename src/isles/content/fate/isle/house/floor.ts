import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import {
  BAIZE, BAIZE_DEEP, BAIZE_LIT, CARD_BLACK, CARD_RED, CARD_RED_DEEP, GILT, GILT_DARK, GILT_LIT, IVORY, MAHOGANY,
  MAHOGANY_DEEP, MAHOGANY_LIT, VELVET, blackChip, chipStack, greenLamp, suitPip, wheelSeal,
} from './art';

/**
 * The warden arena: a private salon off the gaming floors, where the House settles its quarrels.
 * Herringbone parquet in mahogany and ebony, a great baize carpet laid over it with a gilt rope
 * border and the four suits woven into its corners, the back wall in oxblood velvet with gilt
 * pilasters, mirrors and a row of green lamps over the high-stakes tables, and two of the busted
 * standing either side of the door with their black chips at their throats, not looking.
 */
export const HOUSE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(0, 0, W, H);
  // Herringbone parquet.
  const L = 44, T = 14;
  for (let y = top - L; y < H + L; y += T * 2) {
    for (let x = -L; x < W + L; x += L) {
      const k = Math.floor(x / L + y / (T * 2)) % 2 === 0;
      const c = k ? MAHOGANY : dim(MAHOGANY, 0.35);
      g.fillStyle(c, 1);
      g.fillPoints([{ x, y }, { x: x + L, y: y + L / 2 }, { x: x + L, y: y + L / 2 + T }, { x, y: y + T }], true, true);
      g.fillStyle(rng() < 0.5 ? CARD_BLACK : dim(MAHOGANY, 0.55), 1);
      g.fillPoints([{ x: x + L, y: y + T }, { x, y: y + L / 2 + T }, { x, y: y + L / 2 + T * 2 }, { x: x + L, y: y + T * 2 }], true, true);
      if (rng() < 0.15) { g.fillStyle(lit(MAHOGANY, 0.2), 0.3); g.fillRect(x + 6, y + 4, L - 12, 1); }
    }
  }
  // The back wall: velvet panels between gilt pilasters, a mirror in every other bay.
  g.fillStyle(VELVET, 1); g.fillRect(0, top, W, 64);
  for (let x = 0; x < W; x += 80) {
    g.fillStyle(dim(VELVET, 0.25), 1); g.fillRect(x + 6, top + 6, 68, 50);
    if ((x / 80) % 2 === 1) {
      g.fillStyle(0x3a4a48, 1); g.fillRoundedRect(x + 14, top + 8, 52, 44, 18);
      g.fillStyle(0x8aa8a0, 0.25); g.fillRoundedRect(x + 18, top + 12, 44, 36, 14);
      g.lineStyle(2, GILT, 1); g.strokeRoundedRect(x + 14, top + 8, 52, 44, 18);
      g.fillStyle(0xffffff, 0.2); g.fillRect(x + 24, top + 14, 3, 26);
    } else {
      for (let i = 0; i < 3; i++) suitPip(g, x + 22 + i * 18, top + 30, 5, (['spade', 'heart', 'club'] as const)[i], dim(GILT, 0.35), 0.8);
    }
    g.fillStyle(GILT_DARK, 1); g.fillRect(x - 3, top, 7, 64);
    g.fillStyle(GILT, 1); g.fillRect(x - 2, top, 3, 64);
  }
  g.fillStyle(GILT, 1); g.fillRect(0, top + 62, W, 4);
  g.fillStyle(MAHOGANY_LIT, 1); g.fillRect(0, top + 66, W, 6);
  // High-stakes tables along the back wall, under their lamps.
  for (const tx of [160, 480, 800]) {
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillEllipse(tx, top + 86, 170, 30);
    g.fillStyle(BAIZE, 1); g.fillEllipse(tx, top + 84, 158, 22);
    for (let k = 0; k < 4; k++) chipStack(g, tx - 50 + k * 30, top + 86, 2 + ((k * 3 + tx) % 4), [CARD_RED, CARD_BLACK, GILT, IVORY][k], 5);
    g.fillStyle(0xd8ffb0, 0.06); g.fillEllipse(tx, top + 86, 220, 60);
    greenLamp(g, tx, top + 58, 1, true, top);
  }
  // The great carpet: baize with a gilt rope border.
  const cx0 = 70, cy0 = top + 120, cw = W - 140, ch = H - top - 150;
  g.fillStyle(0x000000, 0.35); g.fillRect(cx0 + 4, cy0 + 6, cw, ch);
  g.fillStyle(BAIZE_DEEP, 1); g.fillRect(cx0, cy0, cw, ch);
  g.fillStyle(BAIZE, 1); g.fillRect(cx0 + 14, cy0 + 14, cw - 28, ch - 28);
  // The nap of the felt.
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.5 ? BAIZE_LIT : BAIZE_DEEP, 0.25);
    g.fillRect(cx0 + 16 + rng() * (cw - 32), cy0 + 16 + rng() * (ch - 32), 2, 1);
  }
  // Rope border: a twisted gilt cord, dashed light and dark.
  for (let x = cx0 + 8; x < cx0 + cw - 8; x += 10) {
    g.fillStyle(GILT, 1); g.fillEllipse(x, cy0 + 7, 9, 5); g.fillEllipse(x, cy0 + ch - 7, 9, 5);
    g.fillStyle(GILT_DARK, 1); g.fillRect(x + 3, cy0 + 5, 2, 4); g.fillRect(x + 3, cy0 + ch - 9, 2, 4);
  }
  for (let y = cy0 + 8; y < cy0 + ch - 8; y += 10) {
    g.fillStyle(GILT, 1); g.fillEllipse(cx0 + 7, y, 5, 9); g.fillEllipse(cx0 + cw - 7, y, 5, 9);
    g.fillStyle(GILT_DARK, 1); g.fillRect(cx0 + 5, y + 3, 4, 2); g.fillRect(cx0 + cw - 9, y + 3, 4, 2);
  }
  // The four suits in the carpet's corners.
  const corners: [number, number, 'spade' | 'heart' | 'club' | 'diamond'][] = [
    [cx0 + 52, cy0 + 52, 'spade'], [cx0 + cw - 52, cy0 + 52, 'heart'], [cx0 + 52, cy0 + ch - 52, 'diamond'], [cx0 + cw - 52, cy0 + ch - 52, 'club'],
  ];
  for (const [x, y, s] of corners) {
    g.lineStyle(2, GILT, 0.6); g.strokeCircle(x, y, 28);
    suitPip(g, x, y, 16, s, s === 'heart' || s === 'diamond' ? CARD_RED : CARD_BLACK, 0.85);
  }
  // A betting layout chalked across the middle: the numbers in their boxes, faint, rubbed.
  const mx = W / 2, my = (cy0 + cy0 + ch) / 2;
  g.lineStyle(2, IVORY, 0.12);
  for (let k = -6; k <= 6; k++) g.strokeRect(mx + k * 44 - 20, my - 150, 40, 54);
  for (let k = -6; k <= 6; k++) g.strokeRect(mx + k * 44 - 20, my + 96, 40, 54);
  // The King's crowned wheel inlaid in the centre.
  g.fillStyle(BAIZE_DEEP, 0.8); g.fillCircle(mx, my, 92);
  g.lineStyle(4, GILT, 0.8); g.strokeCircle(mx, my, 88);
  g.lineStyle(2, GILT_DARK, 0.8); g.strokeCircle(mx, my, 78);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    g.fillStyle(k % 2 ? CARD_RED : CARD_BLACK, 0.7);
    g.fillTriangle(mx + Math.cos(a) * 78, my + Math.sin(a) * 78, mx + Math.cos(a + 0.35) * 78, my + Math.sin(a + 0.35) * 78, mx + Math.cos(a + 0.17) * 88, my + Math.sin(a + 0.17) * 88);
  }
  wheelSeal(g, mx, my + 4, 54, GILT, 0.8);
  wheelSeal(g, mx, my + 4, 50, GILT_LIT, 0.2);
  // A spill of chips and a dropped card or two, where somebody's last wager went.
  for (let i = 0; i < 14; i++) {
    const x = cx0 + 40 + rng() * (cw - 80), y = cy0 + 40 + rng() * (ch - 80);
    if (Math.hypot(x - mx, y - my) < 110) continue;
    g.fillStyle([CARD_RED, CARD_BLACK, GILT][i % 3], 0.8); g.fillEllipse(x, y, 12, 7);
    g.fillStyle(IVORY, 0.6); g.fillEllipse(x, y, 5, 3);
  }
  // The busted, either side at the carpet's foot: dark-coated croupiers with black chips.
  for (const bx of [36, W - 36]) {
    const by = H - 70;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(bx, by + 4, 34, 10);
    g.fillStyle(0x16161c, 1); g.fillRoundedRect(bx - 13, by - 46, 26, 48, 9);
    g.fillStyle(IVORY, 1); g.fillTriangle(bx - 5, by - 44, bx + 5, by - 44, bx, by - 30);
    g.fillStyle(CARD_RED_DEEP, 1); g.fillTriangle(bx - 3, by - 38, bx + 3, by - 38, bx, by - 34);
    g.fillStyle(0xc8a888, 1); g.fillCircle(bx, by - 54, 9);
    g.fillStyle(0x1e4a2a, 1); g.fillRect(bx - 11, by - 61, 22, 4); // the dealer's eyeshade
    blackChip(g, bx, by - 36, 4);
  }
};
