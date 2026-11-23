import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, CARD_RED, FOAM, GILT, GILT_DARK, GILT_LIT, IVORY, LAMP, LAMP_GREEN, SEA, SEA_SHALLOW, SQ_BLACK,
  SQ_BLACK_LIT, SQ_RED, SQ_RED_DARK, STONE, STONE_DARK, chip, chipStack, diceBollard, greenLamp, houseWheel, lot, poly,
} from './art';

/**
 * The fight floor for every Tosswater quest duel: the Draw Square at the foot of the Hall, where
 * the drum turns. The floor is the square's paving — big black and red marble squares laid like a
 * board, worn pale down the middle where the queue shuffles past the board every week, a gilt line
 * inlaid round the edge of each. Along the top (half under the HUD) runs the Hall's portico: chip-
 * stack columns, green-lit windows, the numbers board between them. The House wheel is inlaid off
 * centre in brass, and a week's litter is everywhere — ticket stubs, a dropped Lot, chips the gulls
 * missed. Along the bottom, the quay's edge: dice bollards, rope, and the green harbour beyond.
 */
export const TOSSWATER_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 118;
  const BOT = H - 60;

  g.fillStyle(SQ_BLACK, 1); g.fillRect(0, 0, W, H);

  // ── The chequered marble.
  const S = 64;
  for (let r = 0; r * S < BOT - TOP + S; r++) {
    for (let c = 0; c * S < W + S; c++) {
      const x = c * S - 20, y = TOP + r * S;
      if (y >= BOT) continue;
      const red = (r + c) % 2 === 0;
      const base = red ? SQ_RED : SQ_BLACK;
      // Wear: squares down the middle are scuffed paler where the queue walks.
      const mid = 1 - Math.min(1, Math.abs(x + S / 2 - W / 2) / (W * 0.4));
      const col = mixC(base, red ? 0xc8746a : 0x5a5862, mid * 0.18 + rng() * 0.05);
      g.fillStyle(col, 1); g.fillRect(x, y, S, Math.min(S, BOT - y));
      // Marble veining.
      for (let v = 0; v < 2; v++) {
        const vx = x + rng() * S, vy = y + rng() * S;
        g.lineStyle(1, red ? lit(col, 0.18) : SQ_BLACK_LIT, 0.45);
        g.lineBetween(vx, vy, vx + (rng() - 0.5) * 40, Math.min(BOT, vy + (rng() - 0.5) * 40));
      }
      g.fillStyle(0xffffff, red ? 0.05 : 0.04); g.fillRect(x + 3, y + 3, S - 6, 3);
      g.lineStyle(1, GILT_DARK, 0.5); g.strokeRect(x, y, S, Math.min(S, BOT - y));
    }
  }
  // A few cracked squares, mended with brass staples.
  for (let k = 0; k < 6; k++) {
    const cx = 60 + rng() * (W - 120), cy = TOP + 30 + rng() * (BOT - TOP - 60);
    if (Math.abs(cx - W / 2) < 160 && Math.abs(cy - H * 0.58) < 120) continue;
    g.lineStyle(1.2, 0x0a0a0e, 0.8); g.lineBetween(cx - 20, cy - 6, cx, cy + 2); g.lineBetween(cx, cy + 2, cx + 18, cy - 4);
    g.fillStyle(BRASS, 0.9); g.fillRect(cx - 8, cy - 3, 3, 7); g.fillRect(cx + 7, cy - 4, 3, 7);
  }

  // The House wheel inlaid in brass, off centre, half buried under scuffs.
  houseWheel(g, W / 2 + 150, H * 0.66, 46, 0.4);
  g.lineStyle(2, BRASS, 0.2); g.strokeCircle(W / 2 + 150, H * 0.66, 60);
  for (let i = 0; i < 24; i++) {
    g.fillStyle(SQ_BLACK, 0.25); g.fillEllipse(W / 2 + 90 + rng() * 120, H * 0.66 - 50 + rng() * 100, 6 + rng() * 14, 3);
  }

  // The drum's long shadow falling across the square from the top.
  poly(g, [[W * 0.36, TOP], [W * 0.64, TOP], [W * 0.7, TOP + 120], [W * 0.3, TOP + 120]], 0x000000, 0.12);
  g.fillStyle(0x000000, 0.08); g.fillEllipse(W / 2, TOP + 124, W * 0.42, 30);

  // ── Litter: ticket stubs, chips the gulls missed, a dropped Lot.
  for (let i = 0; i < 60; i++) {
    const lx = rng() * W, ly = TOP + 10 + rng() * (BOT - TOP - 20);
    if (Math.abs(lx - W / 2) < 170 && Math.abs(ly - H * 0.58) < 110) continue;
    g.fillStyle(rng() < 0.6 ? 0xe8e0c8 : 0xf0c8c8, 0.8);
    g.fillRect(lx, ly, 5 + rng() * 3, 3);
  }
  for (let i = 0; i < 9; i++) {
    const cx = 40 + rng() * (W - 80), cy = TOP + 20 + rng() * (BOT - TOP - 40);
    if (Math.abs(cx - W / 2) < 170 && Math.abs(cy - H * 0.58) < 110) continue;
    chip(g, cx, cy, 5, [CARD_RED, 0x2a6ac8, 0x2e9a5a, IVORY][i % 4]);
  }
  lot(g, 110, H * 0.72, 5);

  // ── The Hall's portico along the top.
  g.fillStyle(0xd8d0bc, 1); g.fillRect(0, 0, W, TOP);
  for (let r = 0; r < TOP / 14; r++) { g.lineStyle(1, 0xb0a890, 0.7); g.lineBetween(0, r * 14, W, r * 14); }
  // Windows, green-lit, between the columns.
  for (let k = 0; k < 6; k++) {
    const wx = 80 + k * 160;
    if (k === 2 || k === 3) continue;
    g.fillStyle(0x3a3428, 1); g.fillRoundedRect(wx - 16, 14, 32, TOP - 30, { tl: 16, tr: 16, bl: 0, br: 0 });
    g.fillStyle(LAMP_GREEN, 0.7); g.fillRoundedRect(wx - 12, 18, 24, TOP - 36, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.lineStyle(1.5, 0x3a3428, 1); g.lineBetween(wx, 18, wx, TOP - 18);
  }
  // Chip-stack columns.
  for (let k = 0; k <= 6; k++) {
    const px = k * 160;
    for (let s = 0; s < TOP / 7; s++) {
      const c = s % 2 ? CARD_RED : 0xe8e0cc;
      g.fillStyle(dim(c, 0.3), 1); g.fillRect(px - 12, TOP - s * 7 - 7, 24, 7);
      g.fillStyle(c, 1); g.fillRect(px - 11, TOP - s * 7 - 7, 18, 6);
    }
  }
  // The numbers board in the middle bay.
  const bx = W / 2, bw = 260;
  g.fillStyle(GILT_DARK, 1); g.fillRect(bx - bw / 2 - 6, 4, bw + 12, TOP - 14);
  g.fillStyle(GILT, 1); g.fillRect(bx - bw / 2 - 4, 6, bw + 8, TOP - 18);
  g.fillStyle(0x16161c, 1); g.fillRect(bx - bw / 2, 10, bw, TOP - 26);
  g.fillStyle(CARD_RED, 1); g.fillRect(bx - bw / 2 + 6, 14, bw - 12, 14);
  g.fillStyle(GILT_LIT, 1); for (let c = 0; c < 34; c++) if (c % 6) g.fillRect(bx - bw / 2 + 14 + c * 7, 18, 4, 6);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const tx = bx - bw / 2 + 10 + c * 41, ty = 34 + r * 18;
    g.fillStyle(0xe8e4d8, 1); g.fillRect(tx, ty, 36, 14);
    g.fillStyle(0x24202a, 1); for (let d = 0; d < 4; d++) if (rng() > 0.15) g.fillRect(tx + 3 + d * 8.4, ty + 3, 5, 8);
  }
  // Steps down from the portico.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : 0xa09a8a, 1); g.fillRect(0, TOP - 2 + k * 5, W, 5); }
  g.fillStyle(0x000000, 0.25); g.fillRect(0, TOP + 13, W, 4);
  // Green lamps at the foot of the steps.
  greenLamp(g, 200, TOP + 30, 50);
  greenLamp(g, W - 200, TOP + 30, 50);

  // ── The quay's edge along the bottom: kerb, bollards, rope, the harbour.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, BOT, W, H - BOT);
  g.fillStyle(SEA, 1); g.fillRect(0, BOT + 30, W, H - BOT - 30);
  for (let x = 0; x < W; x += 28) { g.fillStyle(FOAM, 0.22 + rng() * 0.2); g.fillEllipse(x + 14, BOT + 10, 20, 3); }
  for (let k = 0; k < 14; k++) { g.fillStyle(GILT_LIT, 0.25); g.fillEllipse(rng() * W, BOT + 20 + rng() * 30, 6, 1.5); }
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, BOT - 10, W, 12);
  g.fillStyle(STONE, 1); g.fillRect(0, BOT - 12, W, 6);
  for (let x = 0; x < W; x += 46) { g.lineStyle(1, STONE_DARK, 0.8); g.lineBetween(x, BOT - 12, x, BOT - 6); }
  const bolls = [70, 250, 430, 530, 710, 890];
  bolls.forEach((bx2, i) => diceBollard(g, bx2, BOT - 12, (i % 6) + 1, i % 2 === 0));
  // Rope swagged between the bollards at the corners.
  g.lineStyle(2, 0xc8b080, 0.9);
  for (const [a, b] of [[70, 250], [710, 890]] as [number, number][]) {
    g.beginPath(); g.moveTo(a + 4, BOT - 22);
    for (let k = 1; k <= 10; k++) { const t = k / 10; g.lineTo(a + 4 + (b - a) * t, BOT - 22 + Math.sin(t * Math.PI) * 10); }
    g.strokePath();
  }

  // ── Corner clutter, out of the middle.
  // A stack of chips the croupiers left, bottom left.
  chipStack(g, 150, BOT - 40, 7, 9, [CARD_RED, SQ_BLACK, IVORY]);
  chipStack(g, 176, BOT - 34, 4, 9, [SQ_BLACK, CARD_RED]);
  // A sack of Lots waiting for the drum, bottom right, mouth open, brass spilling.
  const sx = W - 140, sy = BOT - 34;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(sx, sy + 6, 70, 16);
  g.fillStyle(0x8a7a5a, 1); g.fillEllipse(sx, sy - 14, 54, 44);
  g.fillStyle(0x6a5a3e, 1); g.fillEllipse(sx, sy - 34, 30, 10);
  g.lineStyle(2, 0x4a3a24, 1); g.lineBetween(sx - 10, sy - 38, sx + 12, sy - 36);
  g.fillStyle(SQ_RED_DARK, 1); g.fillRect(sx - 10, sy - 20, 20, 12);
  for (let k = 0; k < 9; k++) lot(g, sx + 30 + rng() * 40, sy - 2 + rng() * 14, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(sx - 8, sy - 18, 16, 2);
  // A caller's stool with a dropped visor, top left under the steps.
  g.fillStyle(0x4a3424, 1); g.fillRect(90, TOP + 54, 4, 20); g.fillRect(114, TOP + 54, 4, 20);
  g.fillStyle(0x6a4a2e, 1); g.fillEllipse(104, TOP + 54, 34, 10);
  g.fillStyle(0x1e5a32, 0.9); g.fillEllipse(126, TOP + 78, 22, 8);
  g.lineStyle(1, 0x1a1a1a, 0.8); g.strokeEllipse(126, TOP + 78, 22, 8);
  g.fillStyle(LAMP, 0.12); g.fillEllipse(W - 200, TOP + 30, 70, 26);
};
