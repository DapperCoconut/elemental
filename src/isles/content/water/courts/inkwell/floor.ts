import type { ArenaFloor } from '../../../../IslesTypes';
import { BLUE, BLUE_LIT, GREY, INK, INK_SOFT, PAPER, PAPER_DEEP, PAPER_SHADE, WHITE } from './palette';
import { hatchRect, inkBlot, scribble } from './inkArt';

/**
 * The Inkwell Court's fighting floor — a page on the scriptorium's great proof-table.
 *
 * The fight is fought on a sheet of ruled rag-paper pinned to the table: blue rule-lines and a
 * double margin, printer's crop marks in the corners, a ghost paragraph of old text that shows
 * through, the ring an inkwell left, and the table's own black wood showing at the edges with the
 * Queen's blue seal pressed into the bottom corner. Low contrast in the middle — the five rules
 * draw their bars, pens, prints, seals and blots over it.
 */
export const INKWELL_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  // The proof-table: black wood, its grain in soft black strokes.
  g.fillStyle(INK, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) {
    const y = rng() * H;
    g.lineStyle(1 + rng() * 2, INK_SOFT, 0.8);
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x / 120 + i) * 6);
    g.strokePath();
  }
  // The sheet, pinned a little crooked over the table, with a hatched shadow under its edge.
  const px = 12, py = top - 4, pw = W - 24, ph = H - top - 6;
  hatchRect(g, { x: px + 8, y: py + 8, w: pw, h: ph }, 5, INK_SOFT, 0.9, 1.2);
  g.fillStyle(PAPER, 1); g.fillRect(px, py, pw, ph);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle(rng() < 0.7 ? PAPER_SHADE : WHITE, 0.3 + rng() * 0.4);
    g.fillRect(px + rng() * pw, py + rng() * ph, 1 + rng() * 2.5, 1);
  }
  for (let i = 0; i < 16; i++) {
    g.fillStyle(PAPER_SHADE, 0.3 + rng() * 0.2);
    g.fillEllipse(px + rng() * pw, py + rng() * ph, 60 + rng() * 140, 30 + rng() * 60);
  }
  // Rule-lines and the double margin.
  for (let y = py + 30; y < py + ph - 8; y += 32) { g.lineStyle(1.2, BLUE_LIT, 0.4); g.lineBetween(px, y, px + pw, y); }
  g.lineStyle(1.5, BLUE, 0.45); g.lineBetween(px + 70, py, px + 70, py + ph);
  g.lineStyle(1, BLUE, 0.3); g.lineBetween(px + 76, py, px + 76, py + ph);
  // A ghost paragraph showing through from the other side (mirror-written).
  for (let row = 0; row < 7; row++) {
    scribble(g, px + 110, py + 30 + row * 32 - 6, pw * 0.36, rng, GREY, 0.18);
    scribble(g, px + pw * 0.55, py + ph - 40 - row * 32 - 6, pw * 0.38, rng, GREY, 0.16);
  }
  // One censored line, long ago — a faded bar with text peeking at its ends.
  g.fillStyle(INK, 0.22); g.fillRect(px + pw * 0.58, py + 30 + 32 * 2 - 12, pw * 0.28, 16);
  // The ring an inkwell left on the sheet.
  g.lineStyle(5, INK, 0.14); g.strokeEllipse(px + pw - 120, py + 70, 96, 70);
  g.lineStyle(2, INK, 0.18); g.strokeEllipse(px + pw - 118, py + 72, 104, 76);
  // Old blots, soaked in and dried pale.
  for (let i = 0; i < 9; i++) inkBlot(g, px + 40 + rng() * (pw - 80), py + 40 + rng() * (ph - 80), 6 + rng() * 14, rng, INK, 0.12, false);
  // Printer's crop marks in each corner.
  g.lineStyle(1.5, INK, 0.7);
  for (const [cx, cy, sx, sy] of [[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]] as const) {
    g.lineBetween(cx + sx * 8, cy + sy * 22, cx + sx * 8, cy + sy * 40);
    g.lineBetween(cx + sx * 22, cy + sy * 8, cx + sx * 40, cy + sy * 8);
    g.strokeCircle(cx + sx * 26, cy + sy * 26, 6);
    g.lineBetween(cx + sx * 18, cy + sy * 26, cx + sx * 34, cy + sy * 26);
    g.lineBetween(cx + sx * 26, cy + sy * 18, cx + sx * 26, cy + sy * 34);
  }
  // Drawing pins: black heads with a white glint.
  for (const [x, y] of [[px + 14, py + 14], [px + pw - 14, py + 14], [px + 14, py + ph - 14], [px + pw - 14, py + ph - 14]] as const) {
    g.fillStyle(INK, 1); g.fillCircle(x, y, 6);
    g.fillStyle(WHITE, 0.8); g.fillCircle(x - 2, y - 2, 2);
  }
  // A dog-eared corner, bottom-right, and the Queen's seal pressed beside it.
  g.fillStyle(PAPER_DEEP, 1); g.fillTriangle(px + pw, py + ph - 34, px + pw - 34, py + ph, px + pw - 34, py + ph - 34);
  g.lineStyle(1.5, INK, 0.8); g.strokeTriangle(px + pw, py + ph - 34, px + pw - 34, py + ph, px + pw - 34, py + ph - 34);
  g.fillStyle(BLUE, 0.6); g.fillCircle(px + pw - 70, py + ph - 26, 12);
  g.lineStyle(1.5, BLUE_LIT, 0.6); g.strokeCircle(px + pw - 70, py + ph - 26, 9);
  // The sheet's ink border.
  g.lineStyle(2.5, INK, 1); g.strokeRect(px, py, pw, ph);
};
