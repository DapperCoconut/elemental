import type { ArenaFloor } from '../../../../IslesTypes';
import { lit, mulberry } from '../../../../art/IsleArt';
import { baizeNap, card, cardHouse, chequerPave, chip, greenLamp, suitInlay } from './art';
import {
  BAIZE, BAIZE_DARK, CHIP_BLUE, CHIP_RED, CHIP_WHITE, GILT, GILT_DARK, IVORY, MAHOGANY, MAHOGANY_DARK, MAHOGANY_LIT,
} from './palette';
import { SUITS } from './util';

/**
 * The fight floor for every Card Court encounter: a baize lawn laid out like a table. Along the
 * top (half under the HUD) a strip of red-and-black paving with a row of card-houses and green
 * lamps behind it; down both sides a padded mahogany rail like a table's edge, chips stacked on it;
 * along the bottom the gilt-kerbed Cross Street. Chalked table-lines and the four suits in gilt
 * mark the felt. The middle is left open — decks, houses, tarot and the deck flung for pickup
 * bring their own.
 */
export const CARD_FLOOR: ArenaFloor = (g, W, H, rng) => {
  baizeNap(g, { x: 0, y: 0, w: W, h: H }, rng, 1.2);
  // Chalked table-lines: a great oval and two dealer's arcs.
  g.lineStyle(2, IVORY, 0.14); g.strokeEllipse(W / 2, (H + 110) / 2, W * 0.78, (H - 110) * 0.78);
  g.lineStyle(1.5, IVORY, 0.1); g.strokeEllipse(W / 2, (H + 110) / 2, W * 0.86, (H - 110) * 0.88);
  for (const k of [-1, 1]) { g.lineStyle(1.5, IVORY, 0.12); g.beginPath(); g.arc(W / 2 + k * W * 0.3, (H + 110) / 2, 70, 0, Math.PI * 2, false); g.strokePath(); }
  SUITS.forEach((s, i) => {
    const a = -Math.PI / 2 + (i / 4) * Math.PI * 2 + Math.PI / 4;
    suitInlay(g, W / 2 + Math.cos(a) * W * 0.36, (H + 110) / 2 + Math.sin(a) * (H - 110) * 0.36, 9, s, 0.5);
  });

  // The top: paving, then card-houses and lamps behind it along the back.
  g.fillStyle(BAIZE_DARK, 1); g.fillRect(0, 0, W, 100);
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 140;
    cardHouse(g, x, 92, 70, 2 + (i % 2), mulberry(31 + i), (['dome', 'bar', 'die'] as const)[i % 3], i % 2 ? CHIP_BLUE : 0xc9202f);
  }
  chequerPave(g, { x: 0, y: 94, w: W, h: 22 }, 22, rng);
  for (const x of [140, 420, 700]) greenLamp(g, x + 70, 104, 0.8);

  // Mahogany rails down both sides, padded red, chips on them.
  for (const x0 of [0, W - 30]) {
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x0, 116, 30, H - 116);
    g.fillStyle(MAHOGANY, 1); g.fillRect(x0 + 3, 116, 24, H - 116);
    g.fillStyle(MAHOGANY_LIT, 0.6); g.fillRect(x0 + (x0 ? 3 : 21), 116, 4, H - 116);
    const ex = x0 === 0 ? 30 : W - 36;
    g.fillStyle(0x7c1019, 1); g.fillRect(ex, 116, 6, H - 116);
    g.fillStyle(GILT, 0.8); g.fillRect(ex + (x0 ? 0 : 5), 116, 1.5, H - 116);
  }
  for (let y = 170; y < H - 50; y += 90) {
    chip(g, 15, y, 7, [CHIP_RED, CHIP_BLUE, CHIP_WHITE][(y / 90) % 3 | 0]);
    chip(g, W - 15, y + 45, 7, [CHIP_WHITE, CHIP_RED, CHIP_BLUE][(y / 90) % 3 | 0]);
  }

  // The bottom: the Cross Street's kerb and its first row of squares.
  chequerPave(g, { x: 0, y: H - 26, w: W, h: 26 }, 26, rng);
  g.fillStyle(GILT_DARK, 1); g.fillRect(0, H - 28, W, 3);

  // A few cards blown onto the felt, and a dropped chip.
  for (let i = 0; i < 16; i++) {
    card(g, 60 + rng() * (W - 120), 140 + rng() * (H - 200), 9, 13, rng() * 6, { face: rng() < 0.5, suit: SUITS[i % 4], rank: 1, cheap: true, alpha: 0.75 });
  }
  for (let i = 0; i < 5; i++) chip(g, 80 + rng() * (W - 160), 150 + rng() * (H - 220), 5, [CHIP_RED, CHIP_BLUE, CHIP_WHITE][i % 3], 0.8);
  g.fillStyle(lit(BAIZE, 0.1), 0.15); g.fillEllipse(W / 2, (H + 110) / 2, W * 0.5, (H - 110) * 0.4);
};
