import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  BAIZE, BAIZE_DARK, BAIZE_DEEP, BAIZE_LIT, BRASS, BRASS_DARK, BRASS_LIT, BULLION, BULLION_DARK, BULLION_LIT, CARD_RED,
  CHIP_BLACK, GOLD, GOLD_DARK, GOLD_DEEP, GOLD_LIT, GOLD_PALE, IRON, IRON_DARK, IRON_LIT, IVORY, LACQUER, LACQUER_LIT,
  LAMP_GLOW, LAMP_GREEN, MARBLE, MARBLE_DARK, MARBLE_LIT, MARBLE_VEIN, MOLTEN, MOLTEN_LIT, PAPER, PAPER_DARK, PAVE_BLACK,
  PAVE_BLACK_LIT, PAVE_RED, PAVE_RED_LIT, SILVER, SILVER_DARK, SILVER_LIT, SOOT, STEEL, STEEL_LIT, TIMBER, TIMBER_DARK,
  TIMBER_LIT,
} from './palette';

/**
 * Treasury set pieces — the shapes only a mint has. Everything here is *struck*, *stacked* or
 * *weighed*: coins with milled rims and the King's profile, ingots with their assay stamps, the
 * screw-presses' flywheels, the round vault door with its spoked wheel, the brass balance in the
 * square. Gilt catches light on every top edge; soot from the presses greys the undersides. A
 * set piece is drawn upward from its base point `x,y`.
 */

export type Metal = 'gold' | 'silver';
export type Suit = 'spade' | 'heart' | 'diamond' | 'club';

const metalOf = (m: Metal) => (m === 'gold'
  ? { main: GOLD, lit: GOLD_LIT, dark: GOLD_DARK, deep: GOLD_DEEP }
  : { main: SILVER, lit: SILVER_LIT, dark: SILVER_DARK, deep: dim(SILVER_DARK, 0.4) });

// ── Coins, ingots, chips ─────────────────────────────────────────────

/**
 * A struck coin seen face-on (`squash` < 1 flattens it as it turns or lies at an angle). A milled
 * rim, a raised inner ring, and on the face either the King's profile (heads), a crowned wheel
 * (tails) or nothing (a fresh blank).
 */
export function coin(g: G, x: number, y: number, r: number, m: Metal = 'gold', squash = 1, face: 'head' | 'tail' | 'blank' = 'head'): void {
  const c = metalOf(m);
  const sq = Math.max(0.08, Math.abs(squash));
  g.fillStyle(c.deep, 1); g.fillEllipse(x, y + r * 0.12, r * 2 * sq + 1, r * 2 + 1);
  g.fillStyle(c.dark, 1); g.fillEllipse(x, y, r * 2 * sq, r * 2);
  g.fillStyle(c.main, 1); g.fillEllipse(x, y, r * 1.7 * sq, r * 1.7);
  if (sq < 0.3) { g.fillStyle(c.lit, 0.8); g.fillRect(x - 0.6, y - r * 0.8, 1.2, r * 1.6); return; }
  // Milling on the rim.
  if (r > 5) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      g.fillStyle(c.deep, 0.5); g.fillCircle(x + Math.cos(a) * r * 0.93 * sq, y + Math.sin(a) * r * 0.93, Math.max(0.6, r * 0.05));
    }
  }
  g.lineStyle(Math.max(1, r * 0.08), c.dark, 0.8); g.strokeEllipse(x, y, r * 1.36 * sq, r * 1.36);
  if (face === 'head' && r > 4) {
    // The King's profile: brow, nose, chin, a laurel at the back of the head.
    const s = r * 0.5;
    g.fillStyle(c.dark, 0.75);
    g.fillEllipse(x - s * 0.1 * sq, y - s * 0.1, s * 1.1 * sq, s * 1.3);
    g.fillTriangle(x + s * 0.4 * sq, y - s * 0.3, x + s * 0.78 * sq, y + s * 0.02, x + s * 0.38 * sq, y + s * 0.15);
    g.fillRect(x - s * 0.3 * sq, y + s * 0.4, s * 0.55 * sq, s * 0.5);
    g.fillStyle(c.lit, 0.6); g.fillEllipse(x - s * 0.3 * sq, y - s * 0.4, s * 0.4 * sq, s * 0.3);
  } else if (face === 'tail' && r > 4) {
    // The reverse: a little crowned wheel — the House's mark.
    const s = r * 0.48;
    g.lineStyle(Math.max(1, r * 0.07), c.dark, 0.85); g.strokeEllipse(x, y + s * 0.15, s * 1.5 * sq, s * 1.5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineBetween(x, y + s * 0.15, x + Math.cos(a) * s * 0.75 * sq, y + s * 0.15 + Math.sin(a) * s * 0.75);
    }
    g.fillStyle(c.dark, 0.85);
    g.fillTriangle(x - s * 0.6 * sq, y - s * 0.6, x - s * 0.3 * sq, y - s * 1.05, x, y - s * 0.6);
    g.fillTriangle(x, y - s * 0.6, x + s * 0.3 * sq, y - s * 1.05, x + s * 0.6 * sq, y - s * 0.6);
  }
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - r * 0.35 * sq, y - r * 0.45, r * 0.5 * sq, r * 0.28);
}

/** A coin lying flat on the floor, seen from above at a slant (an ellipse with a lit edge). */
export function coinFlat(g: G, x: number, y: number, r: number, m: Metal = 'gold'): void {
  const c = metalOf(m);
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 1, y + 2, r * 2.1, r * 1.1);
  g.fillStyle(c.dark, 1); g.fillEllipse(x, y + 1, r * 2, r * 1.05);
  g.fillStyle(c.main, 1); g.fillEllipse(x, y, r * 2, r * 1);
  g.lineStyle(1, c.dark, 0.7); g.strokeEllipse(x, y, r * 1.4, r * 0.66);
  g.fillStyle(c.lit, 0.8); g.fillEllipse(x - r * 0.4, y - r * 0.2, r * 0.6, r * 0.24);
}

/** A stack of coins, slightly out of true — each one's edge milled and lit. */
export function coinStack(g: G, x: number, y: number, n: number, r: number, m: Metal = 'gold', lean = 0): void {
  const c = metalOf(m);
  shadow(g, x, y + 2, r * 2.4, r * 0.9, 0.26);
  const t = Math.max(2, r * 0.3);
  for (let i = 0; i < n; i++) {
    const cx = x + Math.sin(i * 1.7) * r * 0.08 + lean * i, cy = y - i * t;
    g.fillStyle(c.deep, 1); g.fillEllipse(cx, cy + t * 0.5, r * 2, r * 0.9);
    g.fillStyle(c.dark, 1); g.fillRect(cx - r, cy - t * 0.1, r * 2, t * 0.6);
    for (let k = -r + 2; k < r - 1; k += 3) { g.fillStyle(c.deep, 0.5); g.fillRect(cx + k, cy, 1, t * 0.45); }
    g.fillStyle(c.main, 1); g.fillEllipse(cx, cy, r * 2, r * 0.9);
    g.fillStyle(c.lit, 0.55); g.fillEllipse(cx - r * 0.3, cy - r * 0.12, r * 0.9, r * 0.28);
  }
}

/**
 * A gold ingot in its classic trapezoid, seen three-quarters: a lit top, two shaded faces and
 * the assay stamp (a crowned wheel and a fineness mark) on its top face.
 */
export function ingot(g: G, x: number, y: number, s: number, glowA = 0): void {
  const w = 30 * s, h = 11 * s, d = 12 * s;
  shadow(g, x, y + 2, w * 1.3, d * 0.9, 0.28);
  // Front face, side face, top.
  g.fillStyle(GOLD_DARK, 1);
  g.fillPoints([{ x: x - w / 2, y }, { x: x + w / 2, y }, { x: x + w / 2 - 4 * s, y: y - h }, { x: x - w / 2 + 4 * s, y: y - h }], true);
  g.fillStyle(GOLD_DEEP, 1);
  g.fillPoints([{ x: x + w / 2, y }, { x: x + w / 2 + 6 * s, y: y - d * 0.45 }, { x: x + w / 2 + 2 * s, y: y - h - d * 0.45 }, { x: x + w / 2 - 4 * s, y: y - h }], true);
  g.fillStyle(GOLD, 1);
  g.fillPoints([{ x: x - w / 2 + 4 * s, y: y - h }, { x: x + w / 2 - 4 * s, y: y - h }, { x: x + w / 2 + 2 * s, y: y - h - d * 0.45 }, { x: x - w / 2 + 10 * s, y: y - h - d * 0.45 }], true);
  g.fillStyle(GOLD_LIT, 0.8); g.fillRect(x - w / 2 + 6 * s, y - h - d * 0.38, w * 0.55, 1.6 * s);
  // The stamp.
  g.lineStyle(Math.max(1, s), GOLD_DARK, 0.9); g.strokeEllipse(x + s, y - h - d * 0.22, 8 * s, 3.4 * s);
  g.fillStyle(GOLD_DARK, 0.8); g.fillRect(x - w / 2 + 3 * s, y - h * 0.55, 6 * s, 1.5 * s); g.fillRect(x + 4 * s, y - h * 0.55, 8 * s, 1.5 * s);
  if (glowA > 0) glow(g, x, y - h * 0.6, w * 0.8, GOLD_LIT, glowA, 3);
}

/** A tidy stack of ingots, brick-bonded, three courses high at most. */
export function ingotPile(g: G, x: number, y: number, n: number, s: number): void {
  let placed = 0;
  for (let row = 0; placed < n; row++) {
    const inRow = Math.max(1, 3 - row);
    for (let k = 0; k < inRow && placed < n; k++, placed++) {
      ingot(g, x + (k - (inRow - 1) / 2) * 30 * s, y - row * 11 * s, s);
    }
  }
}

/** A gaming chip: ivory edge-spots round a coloured disc. The busted wear a black one. */
export function chip(g: G, x: number, y: number, r: number, color = CHIP_BLACK, squash = 0.55): void {
  g.fillStyle(dim(color, 0.5), 1); g.fillEllipse(x, y + r * 0.2, r * 2, r * 2 * squash);
  g.fillStyle(color, 1); g.fillEllipse(x, y, r * 2, r * 2 * squash);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillStyle(IVORY, 0.9); g.fillEllipse(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8 * squash, r * 0.36, r * 0.3 * squash);
  }
  g.lineStyle(1, IVORY, 0.5); g.strokeEllipse(x, y, r * 1.1, r * 1.1 * squash);
}

/** A Lot — the brass birth-token every child wears — hung on its chain. */
export function lotToken(g: G, x: number, y: number, r: number, n = 0): void {
  g.lineStyle(1, BRASS_DARK, 1);
  for (let i = 0; i < 4; i++) g.strokeEllipse(x, y - r - 3 - i * 4, 3, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r + 1);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r);
  g.fillStyle(BRASS_LIT, 0.6); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.35);
  // The stamped number, as tally-ticks (no text in the world).
  for (let k = 0; k < Math.min(4, 1 + (n % 4)); k++) { g.fillStyle(BRASS_DARK, 1); g.fillRect(x - r * 0.5 + k * r * 0.32, y - r * 0.3, 1.2, r * 0.6); }
}

/** A money-bag tied at the neck, a coin peeping out. */
export function moneyBag(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 26 * s, 8 * s);
  g.fillStyle(dim(0xc8a878, 0.35), 1); g.fillEllipse(x, y - 10 * s, 26 * s, 22 * s);
  g.fillStyle(0xc8a878, 1); g.fillEllipse(x - 1, y - 11 * s, 23 * s, 20 * s);
  g.fillStyle(0xc8a878, 1); g.fillTriangle(x - 6 * s, y - 20 * s, x + 6 * s, y - 20 * s, x, y - 26 * s);
  g.fillStyle(0xe0c89c, 1); g.fillEllipse(x - 5 * s, y - 14 * s, 7 * s, 6 * s);
  g.lineStyle(2 * s, BRASS_DARK, 1); g.lineBetween(x - 6 * s, y - 20 * s, x + 6 * s, y - 20 * s);
  // A wheel stencilled on the canvas.
  g.lineStyle(1.2 * s, dim(0xc8a878, 0.5), 1); g.strokeCircle(x, y - 9 * s, 4 * s);
  coin(g, x + 3 * s, y - 25 * s, 3 * s, 'gold', 1, 'blank');
}

// ── Roads and ground ─────────────────────────────────────────────────

/**
 * A road of card-red and card-black squares between two points, laid axis-aligned (the isle's
 * roads run straight in the Treasury). Gilt kerb lines either side.
 */
export function chequerRoad(g: G, a: Pt, b: Pt, w: number, cell = 32): void {
  const horiz = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const x0 = Math.min(a.x, b.x) - (horiz ? 0 : w / 2), y0 = Math.min(a.y, b.y) - (horiz ? w / 2 : 0);
  const x1 = Math.max(a.x, b.x) + (horiz ? 0 : w / 2), y1 = Math.max(a.y, b.y) + (horiz ? w / 2 : 0);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
  for (let y = y0; y < y1; y += cell) {
    for (let x = x0; x < x1; x += cell) {
      const k = (Math.floor(x / cell) + Math.floor(y / cell)) & 1;
      const cw = Math.min(cell, x1 - x), ch = Math.min(cell, y1 - y);
      g.fillStyle(k ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x, y, cw, ch);
      g.fillStyle(k ? PAVE_RED_LIT : PAVE_BLACK_LIT, 0.5); g.fillRect(x, y, cw, 2);
    }
  }
  g.lineStyle(2, GOLD_DARK, 0.9);
  if (horiz) { g.lineBetween(x0, y0 - 4, x1, y0 - 4); g.lineBetween(x0, y1 + 4, x1, y1 + 4); }
  else { g.lineBetween(x0 - 4, y0, x0 - 4, y1); g.lineBetween(x1 + 4, y0, x1 + 4, y1); }
}

/** A disc of red-and-black paving laid as a coin rosette — wedges round a gilt hub. */
export function rosettePlaza(g: G, cx: number, cy: number, r: number, squash = 0.7): void {
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(cx, cy, r * 2 + 16, (r * 2 + 16) * squash);
  g.fillStyle(MARBLE, 1); g.fillEllipse(cx, cy, r * 2 + 8, (r * 2 + 8) * squash);
  const n = 24;
  for (let ring = 0; ring < 3; ring++) {
    const r0 = r * (ring / 3), r1 = r * ((ring + 1) / 3);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + ring * 0.13, a1 = ((i + 1) / n) * Math.PI * 2 + ring * 0.13;
      g.fillStyle((i + ring) % 2 ? PAVE_RED : PAVE_BLACK, 1);
      g.fillPoints([
        { x: cx + Math.cos(a0) * r0, y: cy + Math.sin(a0) * r0 * squash },
        { x: cx + Math.cos(a0) * r1, y: cy + Math.sin(a0) * r1 * squash },
        { x: cx + Math.cos(a1) * r1, y: cy + Math.sin(a1) * r1 * squash },
        { x: cx + Math.cos(a1) * r0, y: cy + Math.sin(a1) * r0 * squash },
      ], true);
    }
    g.lineStyle(2, GOLD_DARK, 0.8); g.strokeEllipse(cx, cy, r1 * 2, r1 * 2 * squash);
  }
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(cx, cy, r * 0.5, r * 0.5 * squash);
  g.fillStyle(GOLD, 1); g.fillEllipse(cx, cy, r * 0.42, r * 0.42 * squash);
}

/** A baize lawn ruled like a ledger page: faint green ink lines and a red margin rule. */
export function ledgerLawn(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(BAIZE, 1); g.fillRect(x, y, w, h);
  for (let ly = y + 24; ly < y + h; ly += 40) { g.fillStyle(BAIZE_LIT, 0.35); g.fillRect(x, ly, w, 3); }
  for (let i = 0; i < (w * h) / 1800; i++) {
    const px = x + rng() * w, py = y + rng() * h;
    g.fillStyle(rng() < 0.5 ? BAIZE_DARK : BAIZE_LIT, 0.3); g.fillRect(px, py, 2, 1.2);
  }
}

// ── The suits, clipped in box ────────────────────────────────────────

/** One suit as a filled shape — used for topiary, inlays and badges. */
export function suitShape(g: G, x: number, y: number, s: number, suit: Suit, color: number): void {
  g.fillStyle(color, 1);
  switch (suit) {
    case 'heart':
      g.fillCircle(x - s * 0.5, y - s * 0.3, s * 0.55); g.fillCircle(x + s * 0.5, y - s * 0.3, s * 0.55);
      g.fillTriangle(x - s * 1.02, y - s * 0.1, x + s * 1.02, y - s * 0.1, x, y + s * 1.05);
      break;
    case 'diamond':
      g.fillPoints([{ x, y: y - s * 1.1 }, { x: x + s * 0.8, y }, { x, y: y + s * 1.1 }, { x: x - s * 0.8, y }], true);
      break;
    case 'spade':
      g.fillCircle(x - s * 0.5, y + s * 0.15, s * 0.55); g.fillCircle(x + s * 0.5, y + s * 0.15, s * 0.55);
      g.fillTriangle(x - s * 1.02, y - s * 0.05, x + s * 1.02, y - s * 0.05, x, y - s * 1.1);
      g.fillTriangle(x, y + s * 0.3, x - s * 0.4, y + s * 1.05, x + s * 0.4, y + s * 1.05);
      break;
    case 'club':
      g.fillCircle(x, y - s * 0.55, s * 0.48); g.fillCircle(x - s * 0.55, y + s * 0.1, s * 0.48); g.fillCircle(x + s * 0.55, y + s * 0.1, s * 0.48);
      g.fillTriangle(x, y, x - s * 0.4, y + s * 1.05, x + s * 0.4, y + s * 1.05);
      break;
  }
}

/** A box hedge clipped into a suit on a square planter — the isle's livery, even in the mint. */
export function suitTopiary(g: G, x: number, y: number, suit: Suit, s = 1): void {
  shadow(g, x, y + 2, 44 * s, 12 * s);
  // Planter: black lacquer with a gilt band.
  g.fillStyle(LACQUER, 1); g.fillRect(x - 15 * s, y - 16 * s, 30 * s, 16 * s);
  g.fillStyle(LACQUER_LIT, 1); g.fillRect(x - 15 * s, y - 16 * s, 30 * s, 3 * s);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 15 * s, y - 8 * s, 30 * s, 2 * s);
  const cy = y - 38 * s;
  suitShape(g, x + 1.5 * s, cy + 2 * s, 16 * s, suit, BAIZE_DEEP);
  suitShape(g, x, cy, 16 * s, suit, BAIZE_DARK);
  suitShape(g, x - 1.5 * s, cy - 2 * s, 13 * s, suit, BAIZE);
  for (let i = 0; i < 10; i++) {
    const a = i * 2.3;
    g.fillStyle(i % 2 ? BAIZE_LIT : BAIZE_DEEP, 0.7);
    g.fillRect(x + Math.cos(a) * 8 * s, cy + Math.sin(a) * 9 * s, 2 * s, 1.5 * s);
  }
  // A red ribbon bow on the hearts and diamonds.
  if (suit === 'heart' || suit === 'diamond') { g.fillStyle(CARD_RED, 1); g.fillTriangle(x - 5 * s, y - 20 * s, x, y - 18 * s, x - 5 * s, y - 16 * s); g.fillTriangle(x + 5 * s, y - 20 * s, x, y - 18 * s, x + 5 * s, y - 16 * s); }
}

// ── Street furniture ─────────────────────────────────────────────────

/** A cast-brass lamp-standard with a green glass shade, the banker's lamp writ large. */
export function bankLamp(g: G, x: number, y: number, lit_ = true): void {
  shadow(g, x, y + 1, 24, 7);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 7, y - 6, 14, 6);
  g.fillStyle(BRASS, 1); g.fillRect(x - 2.5, y - 66, 5, 62);
  g.fillStyle(BRASS_LIT, 0.6); g.fillRect(x - 2.5, y - 66, 1.5, 62);
  for (const yy of [y - 20, y - 46]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 4, yy, 8, 3); }
  // The shade: a green half-dome over a bright bulb.
  if (lit_) glow(g, x, y - 62, 30, LAMP_GLOW, 0.05, 3);
  g.fillStyle(dim(LAMP_GREEN, 0.4), 1); g.fillEllipse(x, y - 70, 26, 14);
  g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(x, y - 72, 24, 12);
  g.fillRect(x - 12, y - 72, 24, 4);
  g.fillStyle(lit(LAMP_GREEN, 0.35), 0.7); g.fillEllipse(x - 5, y - 75, 8, 3);
  if (lit_) { g.fillStyle(LAMP_GLOW, 1); g.fillEllipse(x, y - 67, 14, 4); }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 79, 2.5);
}

/** A sandstone bollard cut as a stack of three coins. */
export function coinBollard(g: G, x: number, y: number): void {
  coinStack(g, x, y, 4, 9, 'gold');
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(x, y - 14, 2);
}

/** A green-shaded clerk's desk set out in the open: ledger, inkwell, coin scale, a stool. */
export function clerksDesk(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 76, 16);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 34, y - 26, 4, 26); g.fillRect(x + 30, y - 26, 4, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 38, y - 32, 76, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 38, y - 32, 76, 2);
  g.fillStyle(INK_LEATHER, 1); g.fillRect(x - 30, y - 36, 50, 5);
  // Open ledger.
  g.fillStyle(PAPER, 1); g.fillRect(x - 24, y - 42, 22, 9); g.fillRect(x - 1, y - 42, 22, 9);
  g.lineStyle(0.8, 0x6a8a70, 0.8); for (let k = 0; k < 4; k++) { g.lineBetween(x - 22, y - 40 + k * 2, x - 4, y - 40 + k * 2); g.lineBetween(x + 1, y - 40 + k * 2, x + 19, y - 40 + k * 2); }
  g.lineStyle(0.8, CARD_RED, 0.8); g.lineBetween(x - 19, y - 42, x - 19, y - 33);
  // A little coin scale.
  g.fillStyle(BRASS, 1); g.fillRect(x + 27, y - 46, 2, 14);
  g.lineStyle(1.2, BRASS, 1); g.lineBetween(x + 20, y - 46, x + 36, y - 44);
  g.fillStyle(BRASS_LIT, 1); g.fillEllipse(x + 20, y - 40, 7, 2); g.fillEllipse(x + 36, y - 38, 7, 2);
  coinFlat(g, x + 36, y - 39.5, 2);
  // Inkwell and quill.
  g.fillStyle(LACQUER, 1); g.fillRect(x - 34, y - 39, 5, 5);
  g.lineStyle(1, PAPER, 1); g.lineBetween(x - 31, y - 39, x - 26, y - 50);
}
const INK_LEATHER = 0x2a5a3c;

// ── The mint ─────────────────────────────────────────────────────────

/**
 * A screw coin-press, the mint's workhorse: a squat iron anvil-block on a stone sill, two
 * columns, a crosshead, the great screw, and the balance-bar on top with a lead ball at each end
 * (two men swing it round; here it swings itself). `drop` 0 = die raised, 1 = struck. `spin` turns
 * the bar. `s` scales the whole press.
 */
export function coinPress(g: G, x: number, y: number, s = 1, drop = 0, spin = 0, hot = 0): void {
  shadow(g, x, y + 4, 120 * s, 26 * s);
  // Stone sill and anvil block.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 50 * s, y - 14 * s, 100 * s, 14 * s);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 50 * s, y - 16 * s, 100 * s, 5 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 26 * s, y - 34 * s, 52 * s, 20 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 24 * s, y - 36 * s, 48 * s, 6 * s);
  // The lower die and a blank waiting on it.
  g.fillStyle(STEEL, 1); g.fillRect(x - 10 * s, y - 42 * s, 20 * s, 6 * s);
  if (drop < 0.9) coin(g, x, y - 44 * s, 6 * s, 'gold', 0.4, 'blank');
  if (hot > 0) glow(g, x, y - 44 * s, 24 * s, MOLTEN_LIT, 0.08 * hot, 3);
  // Columns.
  for (const k of [-1, 1]) {
    const cx = x + k * 36 * s;
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 7 * s, y - 132 * s, 14 * s, 118 * s);
    g.fillStyle(IRON, 1); g.fillRect(cx - 5 * s, y - 132 * s, 10 * s, 118 * s);
    g.fillStyle(IRON_LIT, 0.6); g.fillRect(cx - 5 * s, y - 132 * s, 2.5 * s, 118 * s);
    // Bolts at the foot.
    g.fillStyle(BRASS, 1); g.fillCircle(cx - 8 * s, y - 20 * s, 2.2 * s); g.fillCircle(cx + 8 * s, y - 20 * s, 2.2 * s);
  }
  // Crosshead with gilt lettering-bar and the court's wheel.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 46 * s, y - 146 * s, 92 * s, 18 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 44 * s, y - 148 * s, 88 * s, 8 * s);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 30 * s, y - 138 * s, 60 * s, 4 * s);
  g.fillStyle(GOLD, 1); g.fillCircle(x, y - 137 * s, 5 * s);
  // The screw — threads shown as slanted bands; the ram and upper die ride it down.
  const ramY = y - 120 * s + drop * 70 * s;
  g.fillStyle(STEEL, 1); g.fillRect(x - 6 * s, y - 166 * s, 12 * s, ramY - (y - 166 * s));
  for (let ty = y - 164 * s; ty < ramY - 4; ty += 6 * s) { g.lineStyle(1.5 * s, IRON_DARK, 0.7); g.lineBetween(x - 6 * s, ty + 3 * s, x + 6 * s, ty); }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 18 * s, ramY, 36 * s, 14 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 16 * s, ramY, 32 * s, 5 * s);
  g.fillStyle(STEEL_LIT, 1); g.fillRect(x - 9 * s, ramY + 14 * s, 18 * s, 5 * s);
  // The balance-bar, foreshortened as it turns.
  const c = Math.cos(spin), sn = Math.sin(spin);
  const bx = 70 * s * c, by = 10 * s * sn;
  g.lineStyle(5 * s, IRON_DARK, 1); g.lineBetween(x - bx, y - 166 * s - by, x + bx, y - 166 * s + by);
  g.lineStyle(3 * s, IRON_LIT, 1); g.lineBetween(x - bx, y - 167 * s - by, x + bx, y - 167 * s + by);
  for (const k of [-1, 1]) {
    const ex = x + k * bx, ey = y - 166 * s + k * by;
    g.fillStyle(IRON_DARK, 1); g.fillCircle(ex, ey, 10 * s);
    g.fillStyle(IRON, 1); g.fillCircle(ex - 1, ey - 1, 8.5 * s);
    g.fillStyle(IRON_LIT, 0.7); g.fillCircle(ex - 3 * s, ey - 3 * s, 3 * s);
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 168 * s, 5 * s);
}

/**
 * The Royal Mint: a long sooty brick hall with a gilt cornice, five open arched bays (the presses
 * stand inside them, in the furnace glow), tall chimneys and the King's wheel in gilt over the
 * middle bay. `x,y` is the front wall's base centre; returns nothing — the presses are drawn
 * separately so they can thump.
 */
export function mintHall(g: G, x: number, y: number, w: number, h: number, bays: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.06, 30);
  const x0 = x - w / 2, top = y - h;
  const BRICK = 0x7a3a2c, BRICK_DARK = 0x4e241c;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0 - 4, top - 4, w + 8, h + 4);
  g.fillStyle(BRICK, 1); g.fillRect(x0, top, w, h);
  for (let by = top + 6; by < y - 4; by += 8) {
    const off = ((by - top) / 8) % 2 ? 0 : 9;
    for (let bx = x0 + off; bx < x0 + w - 6; bx += 18) {
      g.fillStyle(rng() < 0.5 ? dim(BRICK, 0.12) : lit(BRICK, 0.06), 0.7); g.fillRect(bx, by, 16, 6);
    }
  }
  // Soot climbing the wall from the bays.
  for (let i = 0; i < 40; i++) { g.fillStyle(SOOT, 0.12); g.fillCircle(x0 + rng() * w, top + rng() * h * 0.6, 10 + rng() * 20); }
  // Bays: arched openings, furnace-lit inside.
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const cx = x0 + bw * (i + 0.5);
    const aw = bw * 0.72, ah = h * 0.78;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - aw / 2 - 6, y - ah - 4, aw + 12, ah + 4);
    g.fillStyle(0x2a1410, 1); g.fillRect(cx - aw / 2, y - ah + aw / 2, aw, ah - aw / 2);
    g.fillEllipse(cx, y - ah + aw / 2, aw, aw);
    g.fillStyle(MOLTEN, 0.22); g.fillRect(cx - aw / 2, y - ah * 0.5, aw, ah * 0.5);
    g.fillStyle(MOLTEN_LIT, 0.15); g.fillEllipse(cx, y - 8, aw * 0.9, 18);
    // Keystone.
    g.fillStyle(MARBLE_LIT, 1); g.fillTriangle(cx - 7, y - ah - 4, cx + 7, y - ah - 4, cx, y - ah + 10);
  }
  // Gilt cornice and parapet.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x0 - 10, top - 14, w + 20, 14);
  g.fillStyle(GOLD, 1); g.fillRect(x0 - 10, top - 16, w + 20, 6);
  for (let bx = x0 - 6; bx < x0 + w + 6; bx += 16) { g.fillStyle(GOLD_LIT, 0.6); g.fillCircle(bx, top - 8, 2); }
  // Chimneys.
  for (const fx of [0.12, 0.38, 0.62, 0.88]) {
    const cx = x0 + w * fx;
    g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - 12, top - 74, 24, 60);
    g.fillStyle(BRICK, 1); g.fillRect(cx - 10, top - 74, 18, 60);
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 15, top - 80, 30, 8);
    g.fillStyle(SOOT, 0.8); g.fillEllipse(cx, top - 80, 22, 6);
  }
  // The King's wheel in gilt over the middle: a crowned wheel within a laurel.
  const wx = x, wy = top - 34;
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(wx, wy, 26);
  g.fillStyle(GOLD, 1); g.fillCircle(wx, wy, 23);
  g.lineStyle(2, GOLD_DARK, 1); g.strokeCircle(wx, wy, 15);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(wx, wy, wx + Math.cos(a) * 15, wy + Math.sin(a) * 15); }
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 0.6 + (i / 7) * Math.PI * 0.8;
    g.fillStyle(BAIZE_DARK, 1); g.fillEllipse(wx + Math.cos(a) * 30, wy + Math.sin(a) * 30, 8, 4);
    g.fillEllipse(wx - Math.cos(a) * 30, wy + Math.sin(a) * 30, 8, 4);
  }
  g.fillStyle(GOLD_LIT, 1); g.fillTriangle(wx - 10, wy - 24, wx, wy - 40, wx + 10, wy - 24);
}

/** A crucible on a brazier, molten gold glowing in its lip. */
export function crucible(g: G, x: number, y: number, t = 0): void {
  shadow(g, x, y + 2, 50, 12);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 18, y - 22, 36, 22);
  g.fillStyle(MOLTEN, 0.6 + Math.sin(t * 5) * 0.15); g.fillRect(x - 14, y - 12, 28, 8);
  for (let k = -1; k <= 1; k++) { g.fillStyle(IRON, 1); g.fillRect(x + k * 12 - 2, y - 22, 4, 22); }
  g.fillStyle(0x5a4a40, 1); g.fillEllipse(x, y - 26, 34, 12);
  g.fillStyle(0x7a6658, 1); g.fillEllipse(x, y - 28, 30, 10);
  g.fillStyle(MOLTEN, 1); g.fillEllipse(x, y - 29, 24, 7);
  g.fillStyle(MOLTEN_LIT, 0.8); g.fillEllipse(x - 3, y - 30, 12, 3);
  glow(g, x, y - 30, 30, MOLTEN, 0.05, 3);
}

// ── The vault ────────────────────────────────────────────────────────

/**
 * The Great Vault door, set in the hillside: a round steel door as tall as a house, within a
 * gilt frame, its locking bolts showing round the rim, a five-spoked wheel at the centre and two
 * great hinges on the left. Drawn standing — `x,y` is its foot. `open` 0..1 swings it ajar.
 */
export function vaultDoor(g: G, x: number, y: number, r: number, open = 0): void {
  const cy = y - r;
  // Hillside masonry round it.
  g.fillStyle(dim(MARBLE_DARK, 0.3), 1); g.fillRect(x - r * 1.5, cy - r * 1.25, r * 3, r * 2.25);
  for (let by = cy - r * 1.2; by < y; by += 18) {
    for (let bx = x - r * 1.5 + (((by - cy) / 18) % 2 ? 0 : 14); bx < x + r * 1.5 - 10; bx += 28) {
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(bx, by, 26, 16);
      g.fillStyle(MARBLE, 0.5); g.fillRect(bx, by, 26, 2);
    }
  }
  // The frame.
  g.fillStyle(GOLD_DEEP, 1); g.fillCircle(x, cy, r * 1.14);
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(x, cy, r * 1.1);
  g.fillStyle(GOLD, 1); g.fillCircle(x, cy, r * 1.04);
  g.fillStyle(LACQUER, 1); g.fillCircle(x, cy, r * 0.98);
  if (open > 0) {
    // Ajar: a crescent of lamplit gold heaped inside, the door swung to the left on its hinges.
    g.fillStyle(GOLD_DEEP, 1); g.fillCircle(x, cy, r * 0.96);
    for (let i = 0; i < 14; i++) coinFlat(g, x - r * 0.4 + (i % 5) * r * 0.2, cy + r * 0.3 + Math.floor(i / 5) * 8 - 10, 5);
    ingotPile(g, x + r * 0.2, cy + r * 0.62, 6, 0.8);
  }
  const ox = x - open * r * 0.9;
  const sq = 1 - open * 0.65;
  // Door face: steel, concentric machined rings.
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(ox, cy, r * 1.92 * sq, r * 1.92);
  g.fillStyle(STEEL, 1); g.fillEllipse(ox, cy, r * 1.84 * sq, r * 1.84);
  for (let k = 1; k < 6; k++) { g.lineStyle(1.5, k % 2 ? IRON_LIT : STEEL_LIT, 0.6); g.strokeEllipse(ox, cy, r * 1.84 * sq * (1 - k * 0.13), r * 1.84 * (1 - k * 0.13)); }
  // Locking bolts round the rim.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillStyle(STEEL_LIT, 1); g.fillCircle(ox + Math.cos(a) * r * 0.84 * sq, cy + Math.sin(a) * r * 0.84, r * 0.06);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(ox + Math.cos(a) * r * 0.84 * sq + 1, cy + Math.sin(a) * r * 0.84 + 1, r * 0.03);
  }
  // The wheel.
  g.lineStyle(r * 0.06, BRASS_DARK, 1); g.strokeEllipse(ox, cy, r * 0.62 * sq, r * 0.62);
  g.lineStyle(r * 0.045, BRASS, 1); g.strokeEllipse(ox, cy, r * 0.6 * sq, r * 0.6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.lineStyle(r * 0.05, BRASS, 1); g.lineBetween(ox, cy, ox + Math.cos(a) * r * 0.42 * sq, cy + Math.sin(a) * r * 0.42);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(ox + Math.cos(a) * r * 0.42 * sq, cy + Math.sin(a) * r * 0.42, r * 0.05);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(ox, cy, r * 0.12);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(ox - 2, cy - 2, r * 0.07);
  // Combination dial above the wheel.
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(ox, cy - r * 0.55, r * 0.22 * sq, r * 0.22);
  g.fillStyle(SILVER, 1); g.fillEllipse(ox, cy - r * 0.55, r * 0.18 * sq, r * 0.18);
  // Hinges.
  for (const k of [-0.5, 0.5]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x - r * 1.08, cy + k * r - 12, 18, 24); g.fillStyle(STEEL_LIT, 0.8); g.fillRect(x - r * 1.06, cy + k * r - 10, 4, 20); }
  // Threshold: two marble steps.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - r * 0.9, y - 8, r * 1.8, 8);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - r * 1.0, y - 2, r * 2.0, 6);
}

/** A grassed hillside lip seen from the front — the ground rising behind the vault. */
export function hillLip(g: G, x0: number, x1: number, y: number, rng: () => number): void {
  g.fillStyle(BAIZE_DEEP, 1);
  g.beginPath(); g.moveTo(x0, y);
  for (let x = x0; x <= x1; x += 40) g.lineTo(x, y - 20 - Math.sin(x / 90) * 10 - rng() * 6);
  g.lineTo(x1, y); g.closePath(); g.fillPath();
  g.fillStyle(BAIZE_DARK, 1); g.fillRect(x0, y - 8, x1 - x0, 10);
}

// ── The counting-houses ──────────────────────────────────────────────

export interface BankOpts { wall: number; door?: number; sign?: 'coin' | 'scales' | 'bag' | 'key'; floors?: number; lampsLit?: boolean }

/**
 * A counting-house front: narrow, tall and proud — a marble ground floor with two columns either
 * side of a lacquered door, ranks of windows each with a green-shaded lamp glowing at a clerk's
 * desk, a cornice and a gilt pediment carrying the house's sign. Returns the door point.
 */
export function countingHouse(g: G, x: number, y: number, w: number, h: number, o: BankOpts, rng: () => number): Pt {
  shadow(g, x, y + 4, w * 1.12, 22);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(dim(o.wall, 0.4), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 2);
  g.fillStyle(o.wall, 1); g.fillRect(x0, top, w, h);
  // Rusticated ground floor in marble.
  const gf = Math.min(64, h * 0.38);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, y - gf, w, gf);
  for (let by = y - gf + 2; by < y; by += 12) { g.fillStyle(MARBLE, 1); g.fillRect(x0 + 2, by, w - 4, 9); }
  // Upper floors: windows with green lamps.
  const floors = o.floors ?? Math.max(1, Math.floor((h - gf - 30) / 44));
  const cols = Math.max(2, Math.floor(w / 34));
  for (let f = 0; f < floors; f++) {
    const wy = y - gf - 18 - f * 44;
    for (let c = 0; c < cols; c++) {
      const wx = x0 + (w / cols) * (c + 0.5);
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(wx - 9, wy - 26, 18, 28);
      g.fillStyle(0x1c2a22, 1); g.fillRect(wx - 7, wy - 24, 14, 24);
      if (o.lampsLit !== false && rng() < 0.75) {
        g.fillStyle(LAMP_GLOW, 0.25); g.fillRect(wx - 7, wy - 12, 14, 12);
        g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(wx, wy - 8, 10, 5);
        g.fillStyle(LAMP_GLOW, 0.9); g.fillRect(wx - 3, wy - 6, 6, 1.5);
      }
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(wx - 1, wy - 24, 2, 24);
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(wx - 11, wy + 2, 22, 3);
    }
  }
  // Cornice and pediment.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 8, top - 10, w + 16, 12);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 8, top - 12, w + 16, 5);
  g.fillStyle(MARBLE, 1); g.fillTriangle(x0 - 4, top - 12, x0 + w + 4, top - 12, x, top - 12 - w * 0.28);
  g.lineStyle(2, GOLD_DARK, 1); g.strokeTriangle(x0 - 4, top - 12, x0 + w + 4, top - 12, x, top - 12 - w * 0.28);
  const sx = x, sy = top - 12 - w * 0.11;
  switch (o.sign ?? 'coin') {
    case 'coin': coin(g, sx, sy, 9, 'gold', 1, 'head'); break;
    case 'scales':
      g.lineStyle(2, GOLD, 1); g.lineBetween(sx, sy - 8, sx, sy + 6); g.lineBetween(sx - 11, sy - 6, sx + 11, sy - 6);
      g.fillStyle(GOLD, 1); g.fillEllipse(sx - 11, sy + 2, 10, 4); g.fillEllipse(sx + 11, sy + 2, 10, 4);
      g.lineBetween(sx - 11, sy - 6, sx - 14, sy + 1); g.lineBetween(sx - 11, sy - 6, sx - 8, sy + 1);
      g.lineBetween(sx + 11, sy - 6, sx + 8, sy + 1); g.lineBetween(sx + 11, sy - 6, sx + 14, sy + 1);
      break;
    case 'bag': moneyBag(g, sx, sy + 10, 0.6); break;
    case 'key':
      g.lineStyle(3, GOLD, 1); g.strokeCircle(sx - 7, sy, 5); g.lineBetween(sx - 2, sy, sx + 12, sy);
      g.lineBetween(sx + 8, sy, sx + 8, sy + 5); g.lineBetween(sx + 12, sy, sx + 12, sy + 6);
      break;
  }
  // Columns either side of the door.
  for (const k of [-1, 1]) {
    const cx = x + k * 22;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 6, y - gf - 6, 12, gf + 6);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - 5, y - gf - 6, 5, gf + 6);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - 8, y - gf - 10, 16, 5);
  }
  // Lacquered door with brass furniture.
  const door = o.door ?? LACQUER;
  g.fillStyle(MARBLE_DARK, 1); g.fillRoundedRect(x - 14, y - 40, 28, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
  g.fillStyle(door, 1); g.fillRoundedRect(x - 12, y - 38, 24, 38, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.lineStyle(1, lit(door, 0.2), 1); g.strokeRect(x - 9, y - 30, 7, 12); g.strokeRect(x + 2, y - 30, 7, 12);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 18, 2);
  g.fillStyle(BRASS, 1); g.fillRect(x - 8, y - 9, 16, 2);
  // Steps.
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 20, y - 2, 40, 4);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 24, y + 2, 48, 4);
  return { x, y: y + 18 };
}

// ── The Exchequer ────────────────────────────────────────────────────

/**
 * Prince Bullion's Exchequer: a gilt palace on a marble podium. A colonnade of six columns, an
 * attic storey of gold-leaf panels, and over it a dome built like a stack of coins (each course
 * milled), topped by a gold sovereign on its edge. Over the door, his Lot — a brass token that
 * has never once been drawn — set in a sunburst.
 */
export function exchequer(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.1, 34);
  const x0 = x - w / 2;
  // Podium.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 16, y - 30, w + 32, 30);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 16, y - 32, w + 32, 8);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 16, y - 32, w + 32, 2);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? MARBLE : MARBLE_LIT, 1); g.fillRect(x - 70 - k * 8, y - 24 + k * 6, 140 + k * 16, 6); }
  const wallTop = y - 32 - h;
  // Back wall, gold-leaf panels.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x0, wallTop, w, h);
  for (let px = x0 + 6; px < x0 + w - 20; px += 30) {
    g.fillStyle(GOLD, 1); g.fillRect(px, wallTop + 10, 24, h - 20);
    g.fillStyle(GOLD_LIT, 0.5); g.fillRect(px, wallTop + 10, 24, 3);
    for (let i = 0; i < 3; i++) { g.fillStyle(GOLD_PALE, 0.25); g.fillRect(px + rng() * 20, wallTop + 14 + rng() * (h - 30), 3, 2); }
  }
  // Colonnade.
  const n = 6;
  for (let i = 0; i < n; i++) {
    const cx = x0 + 16 + (i / (n - 1)) * (w - 32);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 9, wallTop + 6, 18, h - 6);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - 8, wallTop + 6, 7, h - 6);
    for (let f = -6; f <= 6; f += 4) { g.lineStyle(1, MARBLE_VEIN, 0.4); g.lineBetween(cx + f, wallTop + 10, cx + f, y - 36); }
    g.fillStyle(GOLD, 1); g.fillRect(cx - 12, wallTop + 2, 24, 7);
    g.fillStyle(GOLD, 1); g.fillRect(cx - 11, y - 38, 22, 6);
  }
  // Entablature and attic.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 12, wallTop - 18, w + 24, 18);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 12, wallTop - 20, w + 24, 5);
  for (let fx = x0; fx < x0 + w; fx += 22) coin(g, fx + 11, wallTop - 9, 5, 'gold', 1, (fx / 22) % 2 ? 'head' : 'tail');
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - w * 0.32, wallTop - 52, w * 0.64, 32);
  g.fillStyle(GOLD, 1); g.fillRect(x - w * 0.32 + 3, wallTop - 50, w * 0.64 - 6, 28);
  // The coin-stack dome: courses narrowing upward, every one milled.
  let cy = wallTop - 54;
  for (let k = 0; k < 7; k++) {
    const rw = w * (0.3 - k * 0.032);
    g.fillStyle(GOLD_DEEP, 1); g.fillEllipse(x, cy + 3, rw * 2, rw * 0.42);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x - rw, cy - 9, rw * 2, 10);
    for (let mx = -rw + 3; mx < rw - 2; mx += 4) { g.fillStyle(GOLD_DEEP, 0.55); g.fillRect(x + mx, cy - 7, 1.5, 7); }
    g.fillStyle(GOLD, 1); g.fillEllipse(x, cy - 9, rw * 2, rw * 0.42);
    g.fillStyle(GOLD_LIT, 0.55); g.fillEllipse(x - rw * 0.3, cy - 11, rw * 0.9, rw * 0.12);
    cy -= 12;
  }
  // The sovereign on its edge.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 3, cy - 10, 6, 12);
  coin(g, x, cy - 30, 20, 'gold', 1, 'head');
  // The door: a gilt grille before a black lacquer door.
  g.fillStyle(LACQUER, 1); g.fillRoundedRect(x - 30, y - 32 - h * 0.7, 60, h * 0.7, { tl: 28, tr: 28, bl: 0, br: 0 });
  g.lineStyle(2, GOLD, 1);
  for (let gx = x - 24; gx <= x + 24; gx += 8) g.lineBetween(gx, y - 32 - h * 0.62, gx, y - 34);
  g.lineBetween(x - 28, y - 32 - h * 0.35, x + 28, y - 32 - h * 0.35);
  // His Lot in a sunburst over the door.
  const ly = y - 32 - h * 0.7 - 16;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.lineStyle(2, GOLD_LIT, 0.9); g.lineBetween(x + Math.cos(a) * 12, ly + Math.sin(a) * 12, x + Math.cos(a) * (i % 2 ? 20 : 26), ly + Math.sin(a) * (i % 2 ? 20 : 26));
  }
  lotToken(g, x, ly, 10, 7);
  // Gilt urns on the podium corners.
  for (const k of [-1, 1]) {
    const ux = x + k * (w / 2 + 4);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(ux - 5, y - 46, 10, 14);
    g.fillStyle(GOLD, 1); g.fillEllipse(ux, y - 52, 22, 18);
    g.fillStyle(GOLD_LIT, 0.6); g.fillEllipse(ux - 4, y - 55, 7, 5);
    coinStack(g, ux, y - 60, 3, 6, 'gold');
  }
}

// ── The Scales of Tribute ────────────────────────────────────────────

/**
 * The Scales of Tribute in the square: a brass balance taller than a house on a marble plinth,
 * its beam crowned with the King's wheel, two great pans on chains. `tilt` in radians tips the
 * beam (+ = right pan down). Weights stand stacked in the pans.
 */
export function tributeScales(g: G, x: number, y: number, s = 1, tilt = 0, weightsL = 3, weightsR = 3): void {
  shadow(g, x, y + 4, 240 * s, 36 * s, 0.24);
  // Plinth.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 40 * s, y - 34 * s, 80 * s, 34 * s);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 44 * s, y - 38 * s, 88 * s, 8 * s);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 44 * s, y - 38 * s, 88 * s, 2 * s);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 32 * s, y - 26 * s, 64 * s, 3 * s);
  // Column.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 8 * s, y - 214 * s, 16 * s, 176 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6 * s, y - 214 * s, 10 * s, 176 * s);
  g.fillStyle(BRASS_LIT, 0.7); g.fillRect(x - 6 * s, y - 214 * s, 3 * s, 176 * s);
  for (const yy of [y - 80 * s, y - 150 * s]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 11 * s, yy, 22 * s, 5 * s); }
  // Beam.
  const by = y - 214 * s, L = 120 * s;
  const ca = Math.cos(tilt), sa = Math.sin(tilt);
  const lx = x - ca * L, ly = by - sa * L, rx = x + ca * L, ry = by + sa * L;
  g.lineStyle(9 * s, BRASS_DARK, 1); g.lineBetween(lx, ly, rx, ry);
  g.lineStyle(5 * s, BRASS, 1); g.lineBetween(lx, ly - 1, rx, ry - 1);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(lx, ly, 5 * s); g.fillCircle(rx, ry, 5 * s);
  // Pointer and crown.
  g.lineStyle(3 * s, BRASS_DARK, 1); g.lineBetween(x, by, x - sa * 40 * s, by + ca * 40 * s);
  g.fillStyle(GOLD, 1); g.fillCircle(x, by, 11 * s);
  g.lineStyle(1.5 * s, GOLD_DARK, 1); g.strokeCircle(x, by, 7 * s);
  g.fillStyle(GOLD_LIT, 1); g.fillTriangle(x - 8 * s, by - 10 * s, x, by - 24 * s, x + 8 * s, by - 10 * s);
  // Pans on chains.
  const pan = (px: number, py: number, n: number) => {
    const drop = 110 * s;
    for (const k of [-1, 0, 1]) {
      g.lineStyle(1.5 * s, BRASS_DARK, 1); g.lineBetween(px, py, px + k * 26 * s, py + drop);
    }
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(px, py + drop + 4 * s, 64 * s, 20 * s);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, py + drop, 60 * s, 16 * s);
    g.fillStyle(BRASS_LIT, 0.5); g.fillEllipse(px - 10 * s, py + drop - 3 * s, 22 * s, 4 * s);
    for (let i = 0; i < n; i++) weight(g, px - 14 * s + (i % 3) * 14 * s, py + drop - 2 * s - Math.floor(i / 3) * 12 * s, 0.6 * s);
  };
  pan(lx, ly, weightsL);
  pan(rx, ry, weightsR);
}

/** A brass bell-weight with a ring handle — what the scales hurl. */
export function weight(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(BRASS_DARK, 1); g.fillPoints([{ x: x - 10 * s, y }, { x: x + 10 * s, y }, { x: x + 6 * s, y: y - 16 * s }, { x: x - 6 * s, y: y - 16 * s }], true);
  g.fillStyle(BRASS, 1); g.fillPoints([{ x: x - 8 * s, y: y - 1 }, { x: x + 4 * s, y: y - 1 }, { x: x + 1 * s, y: y - 15 * s }, { x: x - 5 * s, y: y - 15 * s }], true);
  g.fillStyle(BRASS_LIT, 0.6); g.fillRect(x - 5 * s, y - 14 * s, 2 * s, 12 * s);
  g.lineStyle(2 * s, BRASS_DARK, 1); g.strokeCircle(x, y - 19 * s, 3.5 * s);
}

// ── The toll bridge ──────────────────────────────────────────────────

/** A brass turnstile: a post with three arms seen as they turn (`a` radians). */
export function turnstile(g: G, x: number, y: number, a: number, s = 1, color = BRASS): void {
  shadow(g, x, y + 1, 30 * s, 8 * s);
  g.fillStyle(dim(color, 0.4), 1); g.fillRect(x - 4 * s, y - 30 * s, 8 * s, 30 * s);
  g.fillStyle(color, 1); g.fillRect(x - 3 * s, y - 30 * s, 5 * s, 30 * s);
  for (let i = 0; i < 3; i++) {
    const b = a + (i / 3) * Math.PI * 2;
    const ex = x + Math.cos(b) * 22 * s, ey = y - 22 * s + Math.sin(b) * 7 * s;
    g.lineStyle(3 * s, dim(color, 0.3), 1); g.lineBetween(x, y - 22 * s, ex, ey + 1);
    g.lineStyle(2 * s, lit(color, 0.2), 1); g.lineBetween(x, y - 23 * s, ex, ey);
    g.fillStyle(lit(color, 0.3), 1); g.fillCircle(ex, ey, 2 * s);
  }
  g.fillStyle(lit(color, 0.35), 1); g.fillCircle(x, y - 32 * s, 4 * s);
}

/**
 * The tollbooth: a little striped hut in red and black with a gilt cupola, a price board (all
 * tally marks and coin symbols), a hatch with a green lamp, and the toll-box on its post.
 */
export function tollBooth(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 80, 16);
  for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x - 27 + i * 9, y - 62, 9, 62); }
  g.fillStyle(PAPER, 1); g.fillRect(x - 14, y - 50, 28, 20);
  g.fillStyle(LAMP_GLOW, 0.3); g.fillRect(x - 12, y - 48, 24, 16);
  g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(x, y - 44, 10, 4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 16, y - 30, 32, 3);
  // Roof and cupola.
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(x - 34, y - 62, x + 34, y - 62, x, y - 86);
  g.fillStyle(GOLD, 1); g.fillTriangle(x - 30, y - 63, x + 30, y - 63, x, y - 84);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x, y - 90, 5);
  // Price board on a post.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 36, y - 52, 3, 52);
  g.fillStyle(LACQUER, 1); g.fillRect(x + 28, y - 70, 30, 22);
  g.lineStyle(1, GOLD, 1); g.strokeRect(x + 28, y - 70, 30, 22);
  for (let k = 0; k < 3; k++) { coin(g, x + 34, y - 65 + k * 7, 2.4, 'gold', 1, 'blank'); g.fillStyle(PAPER, 0.8); g.fillRect(x + 40, y - 66 + k * 7, 4 + k * 5, 1.4); }
}

/** The toll-box: an iron-bound gilt coffer on a post, a slot in its lid. */
export function tollBox(g: G, x: number, y: number, s = 1, struck = 0): void {
  shadow(g, x, y + 2, 34 * s, 8 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3 * s, y - 26 * s, 6 * s, 26 * s);
  const by = y - 26 * s - struck * 3;
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 15 * s, by - 18 * s, 30 * s, 18 * s);
  g.fillStyle(GOLD, 1); g.fillRect(x - 14 * s, by - 18 * s, 28 * s, 6 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 15 * s, by - 13 * s, 30 * s, 2 * s); g.fillRect(x - 6 * s, by - 18 * s, 2 * s, 18 * s); g.fillRect(x + 4 * s, by - 18 * s, 2 * s, 18 * s);
  g.fillStyle(LACQUER, 1); g.fillRect(x - 5 * s, by - 17 * s, 10 * s, 2 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, by - 6 * s, 2 * s);
}

// ── The court's waystone ─────────────────────────────────────────────

/** The Treasury waystone: a marble plinth carrying an upright gold sovereign, a coin slot below. */
export function treasuryWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 48, 12);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 16, y - 30, 32, 30);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 18, y - 34, 36, 6);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 14, y - 28, 6, 24);
  g.fillStyle(LACQUER, 1); g.fillRect(x - 6, y - 18, 12, 2);
  coin(g, x, y - 52, 16, 'gold', 1, 'tail');
  glow(g, x, y - 52, 20, GOLD_LIT, 0.05, 2);
}

/** A bench in black iron and green slats, a gilt coin cast into each end. */
export function bench(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 70, 12);
  g.fillStyle(LACQUER, 1); g.fillRect(x - 30, y - 14, 4, 14); g.fillRect(x + 26, y - 14, 4, 14);
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? BAIZE_DARK : BAIZE, 1); g.fillRect(x - 32, y - 16 - k * 5, 64, 3.5); }
  coin(g, x - 28, y - 24, 3.5, 'gold', 1, 'blank'); coin(g, x + 28, y - 24, 3.5, 'gold', 1, 'blank');
}

/** A queue-rope of red velvet between brass stanchions (the Wager-Tithe queues). */
export function queueRope(g: G, a: Pt, b: Pt, n: number): void {
  const post = (x: number, y: number) => {
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y, 12, 4);
    g.fillStyle(BRASS, 1); g.fillRect(x - 2, y - 26, 4, 26);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 27, 3);
  };
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    if (i < n) {
      const nx = a.x + (b.x - a.x) * ((i + 1) / n), ny = a.y + (b.y - a.y) * ((i + 1) / n);
      g.lineStyle(3, dim(CARD_RED, 0.3), 1);
      g.beginPath(); g.moveTo(x, y - 22);
      for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(x + (nx - x) * u, y - 22 + (ny - y) * u + Math.sin(u * Math.PI) * 7); }
      g.strokePath();
      g.lineStyle(2, CARD_RED, 1);
      g.beginPath(); g.moveTo(x, y - 23);
      for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(x + (nx - x) * u, y - 23 + (ny - y) * u + Math.sin(u * Math.PI) * 7); }
      g.strokePath();
    }
    post(x, y);
  }
}

/** A banker's stall: a striped awning, a counter of coin-trays and a little sign of the wheel. */
export function exchangeStall(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 150, 22);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 64, y - 70, 4, 70); g.fillRect(x + 60, y - 70, 4, 70);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 60, y - 34, 120, 34);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 60, y - 34, 120, 3);
  g.fillStyle(BAIZE, 1); g.fillRect(x - 58, y - 40, 116, 6);
  for (let k = 0; k < 4; k++) {
    const tx = x - 48 + k * 32;
    g.fillStyle(LACQUER, 1); g.fillRect(tx - 12, y - 44, 24, 6);
    for (let i = 0; i < 5; i++) coinFlat(g, tx - 8 + rng() * 16, y - 42 + rng() * 2, 2.6, k % 2 ? 'silver' : 'gold');
  }
  // Awning in red and black.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? PAVE_RED : PAVE_BLACK, 1);
    g.fillPoints([{ x: x - 68 + i * 17, y: y - 84 }, { x: x - 51 + i * 17, y: y - 84 }, { x: x - 51 + i * 17, y: y - 66 }, { x: x - 59.5 + i * 17, y: y - 60 }, { x: x - 68 + i * 17, y: y - 66 }], true);
  }
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 70, y - 88, 140, 5);
  coin(g, x, y - 98, 9, 'gold', 1, 'tail');
}

/** A green-shaded glass lamp's pool of light on the ground, for `animate` (a slow flicker). */
export function lampPool(g: G, x: number, y: number, t: number, seed: number): void {
  const f = 0.85 + Math.sin(t * 3 + seed) * 0.05 + Math.sin(t * 7.3 + seed * 2) * 0.03;
  g.fillStyle(LAMP_GLOW, 0.06 * f); g.fillEllipse(x, y + 2, 90, 30);
  g.fillStyle(LAMP_GLOW, 0.05 * f); g.fillEllipse(x, y + 2, 50, 16);
}

/** A coin spinning on its edge in the air (`t` seconds), for flourishes over stacks and roofs. */
export function spinningCoin(g: G, x: number, y: number, r: number, t: number, m: Metal = 'gold'): void {
  const sq = Math.cos(t * 6);
  coin(g, x, y, r, m, sq, sq > 0 ? 'head' : 'tail');
}

/** A soot plume off a chimney, for `animateOver`. */
export function sootPlume(g: G, x: number, y: number, t: number, seed: number): void {
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.25 + i / 6 + seed) % 1;
    g.fillStyle(mixC(SOOT, 0x8a8480, ph), 0.3 * (1 - ph));
    g.fillCircle(x + Math.sin(t + i + seed * 9) * 6 + ph * 30, y - ph * 90, 6 + ph * 16);
  }
}

/** A shower of sparks off a struck die, for a press as it lands (`k` 0..1 since the strike). */
export function strikeSparks(g: G, x: number, y: number, k: number, seed = 0): void {
  if (k >= 1) return;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI + (i / 9) * Math.PI + Math.sin(seed + i) * 0.2;
    const d = 6 + k * (26 + (i % 3) * 10);
    g.fillStyle(i % 2 ? MOLTEN_LIT : GOLD_PALE, 1 - k);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + k * k * 18, 1.6);
  }
}

/** A sheet of ledger paper with green rules and a red margin — the HUD's ledger cards. */
export function ledgerCard(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x000000, 0.3); g.fillRect(x + 2, y + 2, w, h);
  g.fillStyle(PAPER, 1); g.fillRect(x, y, w, h);
  g.fillStyle(PAPER_DARK, 1); g.fillRect(x, y, w, 3);
  g.lineStyle(0.8, 0x6a9a7a, 0.6); for (let ly = y + 8; ly < y + h; ly += 5) g.lineBetween(x + 2, ly, x + w - 2, ly);
  g.lineStyle(1, CARD_RED, 0.7); g.lineBetween(x + 8, y + 3, x + 8, y + h);
}

/** Bullion's colours, re-exported for the art of his signatures. */
export const BULLION_TONES = { main: BULLION, lit: BULLION_LIT, dark: BULLION_DARK };
