import type Phaser from 'phaser';
import { type G, dim, lit, shadow } from '../../../../art/IsleArt';

/**
 * The House's own hand: the Croupier-King's casino-palace is baize and mahogany, gilt and
 * ivory, red and black. Everything here is a thing you could gamble with — a card, a die, a
 * chip, a wheel — drawn at the size of furniture, because in the House you are the stake.
 */

// ── Palette ──────────────────────────────────────────────────────────

export const BAIZE = 0x1e6a3a;
export const BAIZE_DEEP = 0x0f4224;
export const BAIZE_LIT = 0x3a9a5a;
export const CARD_RED = 0xc8202e;
export const CARD_RED_DEEP = 0x7a0e18;
export const CARD_BLACK = 0x1a1a22;
export const GILT = 0xd8a83a;
export const GILT_LIT = 0xffe08a;
export const GILT_DARK = 0x7a5418;
export const IVORY = 0xf2e8d0;
export const IVORY_SHADE = 0xc8b890;
export const MAHOGANY = 0x4a1e12;
export const MAHOGANY_LIT = 0x7a3420;
export const MAHOGANY_DEEP = 0x26100a;
export const LAMP_GREEN = 0x2a8a4a;
export const LAMP_GLOW = 0xd8ffb0;
export const VELVET = 0x5a0e24;
export const INK = 0x1a2440;
export const POCKET_GREEN = 0x1a8a4a;

export type Suit = 'heart' | 'diamond' | 'spade' | 'club';
export const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond'];
export const suitColor = (s: Suit): number => (s === 'heart' || s === 'diamond' ? CARD_RED : CARD_BLACK);

type V2 = Phaser.Types.Math.Vector2Like;

/** A point rotated by `a` about (cx, cy). */
const rot = (cx: number, cy: number, dx: number, dy: number, a: number): V2 => ({
  x: cx + dx * Math.cos(a) - dy * Math.sin(a),
  y: cy + dx * Math.sin(a) + dy * Math.cos(a),
});

// ── Suits ────────────────────────────────────────────────────────────

/** One suit pip, `s` ≈ its half-height. */
export function suitPip(g: G, x: number, y: number, s: number, suit: Suit, color = suitColor(suit), a = 1): void {
  g.fillStyle(color, a);
  switch (suit) {
    case 'heart':
      g.fillCircle(x - s * 0.45, y - s * 0.25, s * 0.52);
      g.fillCircle(x + s * 0.45, y - s * 0.25, s * 0.52);
      g.fillTriangle(x - s * 0.95, y - s * 0.05, x + s * 0.95, y - s * 0.05, x, y + s);
      break;
    case 'diamond':
      g.fillPoints([{ x, y: y - s }, { x: x + s * 0.7, y }, { x, y: y + s }, { x: x - s * 0.7, y }], true, true);
      break;
    case 'spade':
      g.fillCircle(x - s * 0.45, y + s * 0.2, s * 0.5);
      g.fillCircle(x + s * 0.45, y + s * 0.2, s * 0.5);
      g.fillTriangle(x - s * 0.92, y + s * 0.05, x + s * 0.92, y + s * 0.05, x, y - s);
      g.fillTriangle(x, y + s * 0.3, x - s * 0.35, y + s, x + s * 0.35, y + s);
      break;
    case 'club':
      g.fillCircle(x, y - s * 0.45, s * 0.45);
      g.fillCircle(x - s * 0.5, y + s * 0.15, s * 0.45);
      g.fillCircle(x + s * 0.5, y + s * 0.15, s * 0.45);
      g.fillTriangle(x, y, x - s * 0.35, y + s, x + s * 0.35, y + s);
      break;
  }
}

// ── Cards ────────────────────────────────────────────────────────────

/** What a card shows: its back, a blank face, or a suit with a count of pips (1 = an ace). */
export type CardFace = 'back' | 'blank' | { suit: Suit; pips: number; mark?: boolean };

/**
 * A playing card at (x, y) (its centre), `w`×`h`, turned by `a`. The back is the House's: oxblood
 * with a gilt lattice and the crowned wheel in the middle. A face is ivory with corner indices
 * and pips. `flip` 0–1 squashes it across its width (mid-turn).
 */
export function playingCard(g: G, x: number, y: number, w: number, h: number, a: number, face: CardFace, alpha = 1, flip = 1): void {
  const hw = (w / 2) * Math.max(0.04, Math.abs(flip)), hh = h / 2;
  const corners = (pad: number): V2[] => [
    rot(x, y, -hw + pad, -hh + pad, a), rot(x, y, hw - pad, -hh + pad, a), rot(x, y, hw - pad, hh - pad, a), rot(x, y, -hw + pad, hh - pad, a),
  ];
  g.fillStyle(0x000000, 0.28 * alpha);
  g.fillPoints(corners(0).map((p) => ({ x: p.x + 3, y: p.y + 4 })), true, true);
  g.fillStyle(face === 'back' ? 0xe8dcc0 : IVORY, alpha); g.fillPoints(corners(0), true, true);
  if (face === 'back') {
    g.fillStyle(CARD_RED_DEEP, alpha); g.fillPoints(corners(Math.min(hw, hh) * 0.16), true, true);
    // The gilt lattice, as diagonals inside the border.
    g.lineStyle(1, GILT, 0.55 * alpha);
    const n = 4;
    for (let i = 1; i < n; i++) {
      const f = i / n;
      const a0 = rot(x, y, -hw * 0.8 + hw * 1.6 * f, -hh * 0.82, a), a1 = rot(x, y, -hw * 0.8, -hh * 0.82 + hh * 1.64 * f, a);
      const b0 = rot(x, y, hw * 0.8 - hw * 1.6 * f, hh * 0.82, a), b1 = rot(x, y, hw * 0.8, hh * 0.82 - hh * 1.64 * f, a);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    }
    if (hw > 6) wheelSeal(g, x, y, Math.min(hw, hh) * 0.46, GILT, 0.85 * alpha);
    return;
  }
  g.lineStyle(1, IVORY_SHADE, alpha); g.strokePoints(corners(Math.min(hw, hh) * 0.08), true, true);
  if (face === 'blank' || hw < 5) return;
  const s = Math.min(hw, hh);
  const c = suitColor(face.suit);
  // Corner indices: a little pip top-left and bottom-right.
  const tl = rot(x, y, -hw * 0.66, -hh * 0.72, a), br = rot(x, y, hw * 0.66, hh * 0.72, a);
  suitPip(g, tl.x, tl.y, s * 0.16, face.suit, c, alpha);
  suitPip(g, br.x, br.y, s * 0.16, face.suit, c, alpha);
  if (face.pips <= 1) {
    suitPip(g, x, y, s * 0.5, face.suit, c, alpha);
    g.lineStyle(1.5, GILT, 0.8 * alpha); g.strokeCircle(x, y, s * 0.72);
  } else {
    const n = Math.min(6, face.pips);
    for (let i = 0; i < n; i++) {
      const col = n <= 3 ? 0 : (i % 2 ? 1 : -1);
      const row = n <= 3 ? i - (n - 1) / 2 : Math.floor(i / 2) - (Math.ceil(n / 2) - 1) / 2;
      const p = rot(x, y, col * hw * 0.36, row * hh * 0.42, a);
      suitPip(g, p.x, p.y, s * 0.2, face.suit, c, alpha);
    }
  }
  if (face.mark) {
    // A card-marker's nick of ink in the top-right corner.
    const m = rot(x, y, hw * 0.72, -hh * 0.78, a);
    g.fillStyle(INK, 0.9 * alpha); g.fillCircle(m.x, m.y, Math.max(1.5, s * 0.1));
  }
}

// ── Dice ─────────────────────────────────────────────────────────────

/** The pips of a die face on a −1…1 square (so a burst can be laid out the same way). */
export const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.6, -0.6], [0.6, 0.6]],
  3: [[-0.6, -0.6], [0, 0], [0.6, 0.6]],
  4: [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]],
  5: [[-0.6, -0.6], [0.6, -0.6], [0, 0], [-0.6, 0.6], [0.6, 0.6]],
  6: [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0], [0.6, 0], [-0.6, 0.6], [0.6, 0.6]],
};

/**
 * An ivory die seen from a little above: a front face showing `face`, a lighter top and a
 * shaded side, rounded corners, a gilt rim on the King's dice. `s` is the edge; (x, y) the
 * front face's centre; `a` turns the whole die (it is tumbling); `pipColor` red for the one.
 */
export function die(g: G, x: number, y: number, s: number, face: number, a = 0, alpha = 1, gilt = false): void {
  const h = s / 2, d = s * 0.28;
  const p = (dx: number, dy: number): V2 => rot(x, y, dx, dy, a);
  shadow(g, x + 4, y + h + 4, s * 1.3, s * 0.36, 0.3 * alpha);
  // Top and side (the depth).
  g.fillStyle(lit(IVORY, 0.4), alpha);
  g.fillPoints([p(-h, -h), p(h, -h), p(h + d, -h - d), p(-h + d, -h - d)], true, true);
  g.fillStyle(IVORY_SHADE, alpha);
  g.fillPoints([p(h, -h), p(h + d, -h - d), p(h + d, h - d), p(h, h)], true, true);
  // Front.
  g.fillStyle(IVORY, alpha);
  g.fillPoints([p(-h, -h), p(h, -h), p(h, h), p(-h, h)], true, true);
  g.lineStyle(Math.max(1, s * 0.04), gilt ? GILT : dim(IVORY_SHADE, 0.2), alpha);
  g.strokePoints([p(-h, -h), p(h, -h), p(h, h), p(-h, h)], true, true);
  const f = Math.max(1, Math.min(6, Math.round(face)));
  for (const [px, py] of PIPS[f]) {
    const q = p(px * h * 0.72, py * h * 0.72);
    g.fillStyle(f === 1 ? CARD_RED : CARD_BLACK, alpha); g.fillCircle(q.x, q.y, s * (f === 1 ? 0.13 : 0.085));
    g.fillStyle(0xffffff, 0.35 * alpha); g.fillCircle(q.x - s * 0.02, q.y - s * 0.02, s * 0.03);
  }
  // Three pips glimpsed on the top face, for the look of a real die.
  for (let i = -1; i <= 1; i++) {
    const q = p(i * h * 0.5 + d * 0.5, -h - d * 0.5);
    g.fillStyle(CARD_BLACK, 0.6 * alpha); g.fillEllipse(q.x, q.y, s * 0.08, s * 0.04);
  }
}

// ── Chips ────────────────────────────────────────────────────────────

/** A casino chip lying flat: a disc with edge spots and an inlay ring. */
export function chip(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(dim(color, 0.4), alpha); g.fillEllipse(x, y + r * 0.16, r * 2, r * 1.2);
  g.fillStyle(color, alpha); g.fillEllipse(x, y, r * 2, r * 1.2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillStyle(IVORY, 0.9 * alpha); g.fillEllipse(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.49, r * 0.3, r * 0.18);
  }
  g.lineStyle(1, lit(color, 0.4), alpha); g.strokeEllipse(x, y, r * 1.2, r * 0.72);
}

/** A stack of chips, base at (x, y). */
export function chipStack(g: G, x: number, y: number, n: number, color: number, r = 9): void {
  shadow(g, x, y + 2, r * 2.6, r * 0.9, 0.3);
  for (let i = 0; i < n; i++) {
    const cy = y - i * r * 0.36;
    g.fillStyle(dim(color, 0.45), 1); g.fillEllipse(x, cy + r * 0.18, r * 2, r * 1.1);
    g.fillStyle(i % 2 ? color : lit(color, 0.08), 1); g.fillEllipse(x, cy, r * 2, r * 1.1);
    g.fillStyle(IVORY, 0.8); g.fillRect(x - r * 0.9, cy + r * 0.1, r * 0.3, r * 0.2); g.fillRect(x + r * 0.5, cy + r * 0.1, r * 0.3, r * 0.2);
  }
  const top = y - (n - 1) * r * 0.36;
  g.lineStyle(1, lit(color, 0.45), 1); g.strokeEllipse(x, top, r * 1.2, r * 0.66);
}

// ── The Wheel ────────────────────────────────────────────────────────

/** European order of the pockets round the wheel (0 is the green). */
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const pocketColor = (n: number): number => (n === 0 ? POCKET_GREEN : WHEEL_ORDER.indexOf(n) % 2 ? CARD_RED : CARD_BLACK);

/**
 * A roulette wheel at (cx, cy), radius `r`, turned by `spin`: a mahogany bowl, the gilt ball
 * track, a ring of red and black pockets with ivory frets, the cone with its gilt spokes and
 * the four-armed turret on top. `squash` flattens it for perspective (1 = seen from above).
 */
export function rouletteWheel(g: G, cx: number, cy: number, r: number, spin: number, squash = 1, alpha = 1): void {
  const E = (x: number, y: number, rx: number, ry: number) => g.fillEllipse(x, y, rx * 2, ry * 2 * squash);
  g.fillStyle(MAHOGANY_DEEP, alpha); E(cx, cy + r * 0.06, r * 1.02, r * 1.02);
  g.fillStyle(MAHOGANY, alpha); E(cx, cy, r, r);
  g.fillStyle(MAHOGANY_LIT, alpha); E(cx, cy - r * 0.02 * squash, r * 0.96, r * 0.96);
  // The ball track.
  g.fillStyle(dim(MAHOGANY, 0.3), alpha); E(cx, cy, r * 0.9, r * 0.9);
  g.lineStyle(2, GILT, 0.7 * alpha); g.strokeEllipse(cx, cy, r * 1.8, r * 1.8 * squash);
  // Pockets.
  const N = WHEEL_ORDER.length;
  for (let i = 0; i < N; i++) {
    const a0 = spin + (i / N) * Math.PI * 2, a1 = spin + ((i + 1) / N) * Math.PI * 2;
    const ro = r * 0.8, ri = r * 0.6;
    g.fillStyle(pocketColor(WHEEL_ORDER[i]), alpha);
    g.fillPoints([
      { x: cx + Math.cos(a0) * ro, y: cy + Math.sin(a0) * ro * squash }, { x: cx + Math.cos(a1) * ro, y: cy + Math.sin(a1) * ro * squash },
      { x: cx + Math.cos(a1) * ri, y: cy + Math.sin(a1) * ri * squash }, { x: cx + Math.cos(a0) * ri, y: cy + Math.sin(a0) * ri * squash },
    ], true, true);
    g.lineStyle(1, IVORY, 0.7 * alpha);
    g.lineBetween(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri * squash, cx + Math.cos(a0) * ro, cy + Math.sin(a0) * ro * squash);
  }
  g.lineStyle(2, GILT, 0.9 * alpha); g.strokeEllipse(cx, cy, r * 1.6, r * 1.6 * squash); g.strokeEllipse(cx, cy, r * 1.2, r * 1.2 * squash);
  // The cone.
  g.fillStyle(MAHOGANY_LIT, alpha); E(cx, cy, r * 0.58, r * 0.58);
  g.fillStyle(lit(MAHOGANY_LIT, 0.15), alpha); E(cx - r * 0.06, cy - r * 0.06 * squash, r * 0.4, r * 0.4);
  for (let k = 0; k < 8; k++) {
    const a = spin + (k / 8) * Math.PI * 2;
    g.lineStyle(2, GILT_DARK, alpha);
    g.lineBetween(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18 * squash, cx + Math.cos(a) * r * 0.56, cy + Math.sin(a) * r * 0.56 * squash);
  }
  // The turret: a gilt cross with ball finials.
  g.fillStyle(GILT_DARK, alpha); E(cx, cy, r * 0.16, r * 0.16);
  for (let k = 0; k < 4; k++) {
    const a = spin * 1.0 + (k / 4) * Math.PI * 2;
    const ex = cx + Math.cos(a) * r * 0.3, ey = cy + Math.sin(a) * r * 0.3 * squash;
    g.lineStyle(Math.max(2, r * 0.04), GILT, alpha); g.lineBetween(cx, cy, ex, ey);
    g.fillStyle(GILT_LIT, alpha); g.fillCircle(ex, ey, Math.max(2, r * 0.035));
  }
  g.fillStyle(GILT_LIT, alpha); E(cx, cy - r * 0.02 * squash, r * 0.08, r * 0.08);
}

// ── The King's sigil ─────────────────────────────────────────────────

/** Lucan's seal: a small wheel of eight spokes under a three-pointed crown. */
export function wheelSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1, r * 0.14), color, a); g.strokeCircle(x, y + r * 0.15, r * 0.62);
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2;
    g.lineStyle(Math.max(1, r * 0.08), color, a);
    g.lineBetween(x, y + r * 0.15, x + Math.cos(t) * r * 0.6, y + r * 0.15 + Math.sin(t) * r * 0.6);
  }
  g.fillStyle(color, a); g.fillCircle(x, y + r * 0.15, r * 0.16);
  // Crown points.
  g.fillTriangle(x - r * 0.6, y - r * 0.42, x - r * 0.36, y - r * 0.42, x - r * 0.52, y - r * 0.95);
  g.fillTriangle(x - r * 0.14, y - r * 0.42, x + r * 0.14, y - r * 0.42, x, y - r * 1.05);
  g.fillTriangle(x + r * 0.36, y - r * 0.42, x + r * 0.6, y - r * 0.42, x + r * 0.52, y - r * 0.95);
  g.fillRect(x - r * 0.62, y - r * 0.48, r * 1.24, r * 0.12);
}

// ── Furniture ────────────────────────────────────────────────────────

/**
 * A green-shaded gaming lamp hanging on a brass rod from above `top`: the shade is a deep green
 * cone with a gilt rim, and its pool of light falls on whatever is under it.
 */
export function greenLamp(g: G, x: number, y: number, s = 1, lightOn = true, top = y - 80 * s): void {
  g.lineStyle(2 * s, GILT_DARK, 1); g.lineBetween(x, top, x, y - 10 * s);
  g.fillStyle(dim(LAMP_GREEN, 0.4), 1); g.fillTriangle(x - 22 * s, y, x + 22 * s, y, x, y - 16 * s);
  g.fillStyle(LAMP_GREEN, 1); g.fillTriangle(x - 20 * s, y - 1, x + 20 * s, y - 1, x, y - 15 * s);
  g.fillStyle(lit(LAMP_GREEN, 0.3), 0.6); g.fillTriangle(x - 12 * s, y - 3, x - 4 * s, y - 3, x - 2 * s, y - 12 * s);
  g.fillStyle(GILT, 1); g.fillRect(x - 22 * s, y - 1, 44 * s, 3 * s);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y - 16 * s, 2.5 * s);
  if (lightOn) { g.fillStyle(LAMP_GLOW, 0.9); g.fillEllipse(x, y + 2 * s, 18 * s, 4 * s); }
}

/** The croupier's rake: a long ebony stick with a small gilt-edged blade at the end. */
export function rake(g: G, x0: number, y0: number, x1: number, y1: number, a = 1): void {
  g.lineStyle(3, CARD_BLACK, a); g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(1, lit(CARD_BLACK, 0.3), a); g.lineBetween(x0, y0 - 1, x1, y1 - 1);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const px = -Math.sin(ang) * 9, py = Math.cos(ang) * 9;
  g.lineStyle(4, CARD_BLACK, a); g.lineBetween(x1 - px, y1 - py, x1 + px, y1 + py);
  g.lineStyle(1.5, GILT, a); g.lineBetween(x1 - px + Math.cos(ang) * 2, y1 - py + Math.sin(ang) * 2, x1 + px + Math.cos(ang) * 2, y1 + py + Math.sin(ang) * 2);
}

/**
 * A gaming table seen from the front at its base (x, y): mahogany apron on turned legs, a baize
 * top in a half-kidney with a gilt rail, chip stacks, a deck in a shoe, a rake lying across, and
 * a green lamp hanging over it all. The House has hundreds of these. Nobody has won at one.
 */
export function gamingTable(g: G, x: number, y: number, w: number, rng: () => number, lamp = true): void {
  const d = w * 0.36;
  shadow(g, x, y + 4, w * 1.1, 24, 0.4);
  // Legs.
  for (const lx of [x - w * 0.42, x - w * 0.16, x + w * 0.16, x + w * 0.42]) {
    g.fillStyle(MAHOGANY_DEEP, 1); g.fillRect(lx - 3, y - 30, 7, 30);
    g.fillStyle(MAHOGANY_LIT, 1); g.fillRect(lx - 2, y - 30, 2, 30);
    g.fillStyle(GILT_DARK, 1); g.fillRect(lx - 4, y - 3, 9, 3);
  }
  // Apron.
  g.fillStyle(MAHOGANY, 1); g.fillRect(x - w / 2, y - 42, w, 14);
  g.fillStyle(MAHOGANY_LIT, 1); g.fillRect(x - w / 2, y - 42, w, 3);
  for (let k = 0; k < 6; k++) { g.fillStyle(GILT_DARK, 0.8); g.fillCircle(x - w / 2 + 10 + k * (w - 20) / 5, y - 35, 2); }
  // Top: the rail and the baize.
  const ty = y - 42;
  g.fillStyle(MAHOGANY_DEEP, 1); g.fillEllipse(x, ty - d * 0.42, w + 10, d + 10);
  g.fillStyle(MAHOGANY_LIT, 1); g.fillEllipse(x, ty - d * 0.44, w + 6, d + 4);
  g.fillStyle(BAIZE, 1); g.fillEllipse(x, ty - d * 0.42, w - 6, d - 8);
  g.fillStyle(BAIZE_LIT, 0.35); g.fillEllipse(x, ty - d * 0.5, w * 0.6, d * 0.36);
  // The layout chalked on the felt: a betting arc and a row of boxes.
  g.lineStyle(1.5, GILT_LIT, 0.55);
  g.beginPath(); g.arc(x, ty - d * 0.9, w * 0.34, 0.35, Math.PI - 0.35, false); g.strokePath();
  for (let k = 0; k < 5; k++) g.strokeRect(x - w * 0.3 + k * w * 0.12, ty - d * 0.5, w * 0.09, d * 0.14);
  // Chips.
  const cols = [CARD_RED, CARD_BLACK, GILT, 0x2a5ab8, IVORY];
  for (let k = 0; k < 4; k++) chipStack(g, x - w * 0.3 + rng() * w * 0.6, ty - d * 0.28 - rng() * d * 0.2, 2 + Math.floor(rng() * 5), cols[Math.floor(rng() * cols.length)], 5);
  // The shoe with its deck, and a spread of three face-down cards.
  g.fillStyle(CARD_BLACK, 1); g.fillRect(x + w * 0.24, ty - d * 0.72, 22, 12);
  g.fillStyle(CARD_RED_DEEP, 1); g.fillRect(x + w * 0.24 + 2, ty - d * 0.72 + 2, 16, 8);
  for (let k = 0; k < 3; k++) playingCard(g, x - 20 + k * 14, ty - d * 0.62, 12, 17, -0.2 + k * 0.2, 'back');
  rake(g, x - w * 0.42, ty - d * 0.1, x - w * 0.08, ty - d * 0.4);
  if (lamp) greenLamp(g, x, ty - d - 44, 1.1, true, ty - d - 140);
}

/**
 * One of the busted: a numbered croupier's black chip, worn on a chain where a Lot should be.
 * Drawn at a person's throat (x, y) — the white number on it is all the name they are allowed.
 */
export function blackChip(g: G, x: number, y: number, r = 5, a = 1): void {
  g.lineStyle(1, GILT_DARK, 0.9 * a); g.lineBetween(x - r * 1.6, y - r * 2, x, y - r * 0.6); g.lineBetween(x + r * 1.6, y - r * 2, x, y - r * 0.6);
  g.fillStyle(0x0a0a0e, a); g.fillCircle(x, y, r);
  g.lineStyle(1, 0x4a4a52, a); g.strokeCircle(x, y, r * 0.7);
  g.fillStyle(IVORY, 0.85 * a); g.fillRect(x - r * 0.3, y - r * 0.4, r * 0.6, r * 0.8);
}

/** A brass Lot on its chain: a little token stamped with a number. */
export function lotToken(g: G, x: number, y: number, r = 5, a = 1): void {
  g.fillStyle(GILT_DARK, a); g.fillCircle(x, y + 0.6, r);
  g.fillStyle(GILT, a); g.fillCircle(x, y, r);
  g.lineStyle(1, GILT_LIT, a); g.strokeCircle(x, y, r * 0.66);
  g.fillStyle(GILT_DARK, a); g.fillRect(x - r * 0.35, y - r * 0.3, r * 0.7, r * 0.6);
}
