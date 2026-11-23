import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  BAIZE, BAIZE_DARK, BAIZE_DEEP, BAIZE_LIT, BRICK, BRICK_DARK, BRICK_LIT, CANDLE, CARD_BLACK, CARD_RED, CARD_WHITE,
  CHALK, CRYSTAL, CRYSTAL_DEEP, CRYSTAL_LIT, EBONY, EBONY_LIT, FLAME, GILT, GILT_DARK, GILT_LIT, IVORY, IVORY_DARK,
  LAMP_GREEN, LAMP_GREEN_LIT, MIND, MIND_DARK, MIND_LIT, PAVE_BLACK, PAVE_RED, SLATE, SLATE_LIT, STONE, STONE_DARK,
  STONE_LIT, VELVET, VELVET_DARK, VELVET_LIT, WOOD, WOOD_DARK, WOOD_LIT,
} from './palette';

/**
 * Mind Court set pieces — a town where every window is watching. Everything here is drawn
 * *behind glass or velvet*: crystal balls on claw stands, curtains half-drawn on a lit room,
 * green-shaded lamps over little tables for two. The roads are paved in the isle's black and red;
 * the lawns are baize; and wherever a thought is being read, a pale violet light gets out.
 */

// ── Lettering ────────────────────────────────────────────────────────
// A stroke alphabet on a 4×6 grid, so boards, cards and signs can be lettered with Graphics
// alone (the spirit board's alphabet, a card's rank, the Exchange's chalked prices).

type Seg = [number, number, number, number];
const O_RING: Seg[] = [[1, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 5], [4, 5, 3, 6], [3, 6, 1, 6], [1, 6, 0, 5], [0, 5, 0, 1], [0, 1, 1, 0]];
const P_BOWL: Seg[] = [[0, 6, 0, 0], [0, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 2], [4, 2, 3, 3], [3, 3, 0, 3]];
const GLYPHS: Record<string, Seg[]> = {
  A: [[0, 6, 2, 0], [2, 0, 4, 6], [1, 3.5, 3, 3.5]],
  B: [[0, 0, 0, 6], [0, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 2], [4, 2, 3, 3], [0, 3, 3, 3], [3, 3, 4, 4], [4, 4, 4, 5], [4, 5, 3, 6], [3, 6, 0, 6]],
  C: [[4, 0, 1, 0], [1, 0, 0, 1], [0, 1, 0, 5], [0, 5, 1, 6], [1, 6, 4, 6]],
  D: [[0, 0, 0, 6], [0, 0, 3, 0], [3, 0, 4, 2], [4, 2, 4, 4], [4, 4, 3, 6], [3, 6, 0, 6]],
  E: [[4, 0, 0, 0], [0, 0, 0, 6], [0, 6, 4, 6], [0, 3, 3, 3]],
  F: [[4, 0, 0, 0], [0, 0, 0, 6], [0, 3, 3, 3]],
  G: [[4, 1, 3, 0], [3, 0, 1, 0], [1, 0, 0, 1], [0, 1, 0, 5], [0, 5, 1, 6], [1, 6, 3, 6], [3, 6, 4, 5], [4, 5, 4, 3], [4, 3, 2, 3]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[1, 0, 3, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
  J: [[1, 0, 4, 0], [3, 0, 3, 5], [3, 5, 2, 6], [2, 6, 1, 6], [1, 6, 0, 5]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.5], [1.4, 2.6, 4, 6]],
  L: [[0, 0, 0, 6], [0, 6, 4, 6]],
  M: [[0, 6, 0, 0], [0, 0, 2, 3], [2, 3, 4, 0], [4, 0, 4, 6]],
  N: [[0, 6, 0, 0], [0, 0, 4, 6], [4, 6, 4, 0]],
  O: O_RING,
  P: P_BOWL,
  Q: [...O_RING, [2.4, 4, 4, 6.4]],
  R: [...P_BOWL, [2, 3, 4, 6]],
  S: [[4, 1, 3, 0], [3, 0, 1, 0], [1, 0, 0, 1], [0, 1, 0, 2], [0, 2, 1, 3], [1, 3, 3, 3], [3, 3, 4, 4], [4, 4, 4, 5], [4, 5, 3, 6], [3, 6, 1, 6], [1, 6, 0, 5]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 5], [0, 5, 1, 6], [1, 6, 3, 6], [3, 6, 4, 5], [4, 5, 4, 0]],
  V: [[0, 0, 2, 6], [2, 6, 4, 0]],
  W: [[0, 0, 1, 6], [1, 6, 2, 3], [2, 3, 3, 6], [3, 6, 4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3], [4, 0, 2, 3], [2, 3, 2, 6]],
  Z: [[0, 0, 4, 0], [4, 0, 0, 6], [0, 6, 4, 6]],
  0: [...O_RING, [4, 1, 0, 5]],
  1: [[1, 1, 2, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
  2: [[0, 1, 1, 0], [1, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 2], [4, 2, 0, 6], [0, 6, 4, 6]],
  3: [[0, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 2], [4, 2, 3, 3], [1, 3, 3, 3], [3, 3, 4, 4], [4, 4, 4, 5], [4, 5, 3, 6], [3, 6, 0, 6]],
  4: [[3, 6, 3, 0], [3, 0, 0, 4], [0, 4, 4, 4]],
  5: [[4, 0, 0, 0], [0, 0, 0, 3], [0, 3, 3, 3], [3, 3, 4, 4], [4, 4, 4, 5], [4, 5, 3, 6], [3, 6, 0, 6]],
  6: [[3, 0, 1, 0], [1, 0, 0, 1], [0, 1, 0, 5], [0, 5, 1, 6], [1, 6, 3, 6], [3, 6, 4, 5], [4, 5, 4, 4], [4, 4, 3, 3], [3, 3, 0, 3]],
  7: [[0, 0, 4, 0], [4, 0, 1, 6]],
  8: [[1, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 2], [4, 2, 3, 3], [3, 3, 1, 3], [1, 3, 0, 2], [0, 2, 0, 1], [0, 1, 1, 0],
    [3, 3, 4, 4], [4, 4, 4, 5], [4, 5, 3, 6], [3, 6, 1, 6], [1, 6, 0, 5], [0, 5, 0, 4], [0, 4, 1, 3]],
  9: [[4, 3, 1, 3], [1, 3, 0, 2], [0, 2, 0, 1], [0, 1, 1, 0], [1, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 5], [4, 5, 3, 6], [3, 6, 1, 6]],
  '?': [[0, 1, 1, 0], [1, 0, 3, 0], [3, 0, 4, 1], [4, 1, 4, 2], [4, 2, 2, 3.5], [2, 3.5, 2, 4.4], [2, 5.6, 2, 6]],
  '!': [[2, 0, 2, 4.2], [2, 5.6, 2, 6]],
  '-': [[0.6, 3, 3.4, 3]],
};

/** Letter `text` centred on (cx, cy), `h` px tall, in strokes. Unknown characters are spaces. */
export function strokeText(g: G, text: string, cx: number, cy: number, h: number, color: number, alpha = 1, w = 2): void {
  const s = h / 6;
  const adv = s * 5.4;
  const x0 = cx - (text.length * adv - s * 1.4) / 2;
  const y0 = cy - h / 2;
  g.lineStyle(w, color, alpha);
  for (let i = 0; i < text.length; i++) {
    const segs = GLYPHS[text[i].toUpperCase()];
    if (!segs) continue;
    const ox = x0 + i * adv;
    for (const [a, b, c, d] of segs) g.lineBetween(ox + a * s, y0 + b * s, ox + c * s, y0 + d * s);
  }
}

// ── Cards and suits ──────────────────────────────────────────────────

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];
export const suitColor = (s: Suit): number => (s === 'heart' || s === 'diamond' ? CARD_RED : CARD_BLACK);

/** A suit pip, `s` ≈ its half-height. */
export function suitPip(g: G, x: number, y: number, s: number, suit: Suit, color = suitColor(suit), a = 1): void {
  g.fillStyle(color, a);
  switch (suit) {
    case 'heart':
      g.fillCircle(x - s * 0.48, y - s * 0.25, s * 0.55);
      g.fillCircle(x + s * 0.48, y - s * 0.25, s * 0.55);
      g.fillTriangle(x - s * 1.0, y - s * 0.05, x + s * 1.0, y - s * 0.05, x, y + s);
      break;
    case 'diamond':
      g.fillTriangle(x, y - s, x + s * 0.72, y, x, y + s);
      g.fillTriangle(x, y - s, x - s * 0.72, y, x, y + s);
      break;
    case 'spade':
      g.fillCircle(x - s * 0.46, y + s * 0.2, s * 0.52);
      g.fillCircle(x + s * 0.46, y + s * 0.2, s * 0.52);
      g.fillTriangle(x - s * 0.96, y + s * 0.1, x + s * 0.96, y + s * 0.1, x, y - s);
      g.fillTriangle(x, y + s * 0.2, x - s * 0.4, y + s, x + s * 0.4, y + s);
      break;
    case 'club':
      g.fillCircle(x, y - s * 0.45, s * 0.46);
      g.fillCircle(x - s * 0.5, y + s * 0.18, s * 0.46);
      g.fillCircle(x + s * 0.5, y + s * 0.18, s * 0.46);
      g.fillTriangle(x, y, x - s * 0.36, y + s, x + s * 0.36, y + s);
      break;
  }
}

/** A rank's label: 2–10, J, Q, K, A (rank 11–14). */
export const rankLabel = (r: number): string => (r <= 10 ? String(r) : ['J', 'Q', 'K', 'A'][r - 11]);

/**
 * A playing card `w` wide (h = 1.4w) centred on (x, y): face up with rank and pip, or (rank 0)
 * its back — the Mind Court's back is plum with a gilt open eye.
 */
export function playingCard(g: G, x: number, y: number, w: number, rank: number, suit: Suit, a = 1): void {
  const h = w * 1.4;
  g.fillStyle(0x000000, 0.25 * a); g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, w * 0.12);
  g.fillStyle(CARD_WHITE, a); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, w * 0.12);
  if (rank <= 0) {
    g.fillStyle(VELVET, a); g.fillRoundedRect(x - w / 2 + w * 0.09, y - h / 2 + w * 0.09, w * 0.82, h - w * 0.18, w * 0.08);
    g.lineStyle(Math.max(1, w * 0.04), GILT, a);
    for (let k = -3; k <= 3; k++) {
      g.lineBetween(x - w * 0.41, y + k * h * 0.12, x - w * 0.41 + w * 0.82 * 0.5, y + k * h * 0.12 - w * 0.2);
    }
    g.fillStyle(VELVET, a); g.fillEllipse(x, y, w * 0.64, w * 0.4);
    eye(g, x, y, w * 0.28, GILT, MIND, a);
    return;
  }
  const c = suitColor(suit);
  strokeText(g, rankLabel(rank), x - w * 0.26, y - h * 0.32, w * 0.24, c, a, Math.max(1.2, w * 0.05));
  suitPip(g, x - w * 0.26, y - h * 0.12, w * 0.1, suit, c, a);
  suitPip(g, x + w * 0.06, y + h * 0.12, w * 0.24, suit, c, a);
  g.lineStyle(1, c, 0.3 * a); g.strokeRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, w * 0.1);
}

/** An almond eye with an iris: the court's sign on every reader's door. */
export function eye(g: G, x: number, y: number, r: number, lid: number, iris: number, a = 1, open = 1): void {
  const hh = r * 0.62 * open;
  g.fillStyle(IVORY, a);
  g.fillTriangle(x - r, y, x, y - hh, x + r, y); g.fillTriangle(x - r, y, x, y + hh, x + r, y);
  g.fillEllipse(x, y, r * 1.3, hh * 1.5);
  if (open > 0.2) {
    g.fillStyle(iris, a); g.fillCircle(x, y, r * 0.42 * Math.min(1, open * 1.4));
    g.fillStyle(0x0c0a10, a); g.fillCircle(x, y, r * 0.18);
    g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(x - r * 0.14, y - r * 0.14, r * 0.08);
  }
  g.lineStyle(Math.max(1, r * 0.12), lid, a);
  g.beginPath(); g.arc(x, y + r * 0.8, r * 1.28, Math.PI * 1.22, Math.PI * 1.78, false); g.strokePath();
  g.beginPath(); g.arc(x, y - r * 0.8, r * 1.28, Math.PI * 0.22, Math.PI * 0.78, false); g.strokePath();
  for (let i = -2; i <= 2; i++) g.lineBetween(x + i * r * 0.3, y - hh * 0.9 - Math.abs(i) * -r * 0.05, x + i * r * 0.38, y - hh - r * 0.3);
}

// ── Small furniture ──────────────────────────────────────────────────

/**
 * A crystal ball on a gilt claw stand. `x, y` = the stand's foot. The swirl inside turns with
 * `t` (seconds) so the same painter serves pieces (t = 0) and `animate`.
 */
export function crystalBall(g: G, x: number, y: number, r: number, t = 0, inner = MIND): void {
  shadow(g, x, y + 1, r * 2.2, r * 0.6, 0.28);
  // The stand: a turned foot and three gilt claws round the ball.
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y - 2, r * 1.4, r * 0.42);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 4, r * 1.2, r * 0.34);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - r * 0.16, y - r * 0.7, r * 0.32, r * 0.66);
  const cy = y - r * 1.55;
  glow(g, x, cy, r * 1.6, inner, 0.05, 3);
  g.fillStyle(CRYSTAL_DEEP, 0.95); g.fillCircle(x, cy, r);
  g.fillStyle(CRYSTAL, 0.55); g.fillCircle(x, cy, r * 0.92);
  // The thought inside: two curling wisps.
  for (let k = 0; k < 2; k++) {
    const a0 = t * (k ? -1.3 : 1) + k * 2;
    g.lineStyle(r * 0.14, k ? MIND_LIT : inner, 0.6);
    g.beginPath(); g.arc(x + Math.cos(a0) * r * 0.2, cy + Math.sin(a0) * r * 0.15, r * (0.35 + k * 0.18), a0, a0 + 2.4, false); g.strokePath();
  }
  g.fillStyle(CRYSTAL_LIT, 0.85); g.fillEllipse(x - r * 0.38, cy - r * 0.42, r * 0.42, r * 0.26);
  g.fillStyle(CRYSTAL_LIT, 0.5); g.fillCircle(x + r * 0.42, cy + r * 0.38, r * 0.08);
  for (const k of [-1, 0, 1]) {
    const cx = x + k * r * 0.72;
    g.lineStyle(Math.max(1.5, r * 0.14), GILT, 1);
    g.lineBetween(x + k * r * 0.12, y - r * 0.66, cx, cy + r * 0.62);
    g.fillStyle(GILT_LIT, 1); g.fillCircle(cx, cy + r * 0.62, Math.max(1.2, r * 0.1));
  }
}

/** A street lamp with a green glass gaming shade. `x, y` = the post's foot. */
export function gamingLamp(g: G, x: number, y: number, h = 70): void {
  shadow(g, x, y, 22, 7, 0.3);
  g.fillStyle(EBONY, 1); g.fillRect(x - 4, y - 6, 8, 6);
  g.fillStyle(EBONY_LIT, 1); g.fillRect(x - 2, y - h, 4, h - 4);
  g.fillStyle(GILT, 1); g.fillCircle(x, y - h * 0.5, 3); g.fillRect(x - 5, y - 8, 10, 2);
  // The arm and the shade.
  g.lineStyle(2.5, EBONY_LIT, 1); g.lineBetween(x, y - h, x + 12, y - h - 6);
  const sx = x + 14, sy = y - h - 2;
  glow(g, sx, sy + 8, 26, CANDLE, 0.05, 3);
  g.fillStyle(dim(LAMP_GREEN, 0.3), 1); g.fillTriangle(sx - 13, sy + 4, sx + 13, sy + 4, sx, sy - 9);
  g.fillStyle(LAMP_GREEN, 1); g.fillTriangle(sx - 11, sy + 3, sx + 11, sy + 3, sx, sy - 8);
  g.fillStyle(LAMP_GREEN_LIT, 0.6); g.fillTriangle(sx - 7, sy + 1, sx - 2, sy + 1, sx - 2, sy - 5);
  g.fillStyle(GILT, 1); g.fillRect(sx - 12, sy + 3, 24, 2);
  g.fillStyle(CANDLE, 0.95); g.fillEllipse(sx, sy + 6, 10, 4);
}

/** Hedge clipped to a card suit, on a stone plinth. */
export function suitTopiary(g: G, x: number, y: number, suit: Suit, s = 1): void {
  shadow(g, x, y + 2, 50 * s, 14 * s);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 17 * s, y - 9 * s, 34 * s, 9 * s);
  g.fillStyle(STONE, 1); g.fillRect(x - 16 * s, y - 10 * s, 32 * s, 6 * s);
  g.fillStyle(BAIZE_DEEP, 1); g.fillRect(x - 4 * s, y - 18 * s, 8 * s, 10 * s);
  const cy = y - 38 * s;
  suitPip(g, x + 1.5 * s, cy + 2 * s, 22 * s, suit, BAIZE_DEEP);
  suitPip(g, x, cy, 22 * s, suit, BAIZE_DARK);
  suitPip(g, x - 2.5 * s, cy - 3 * s, 15 * s, suit, BAIZE);
  // Leaf nicks and a red or black ribbon tied round the stem.
  for (let i = 0; i < 10; i++) {
    const a = i * 2.3, d = 12 * s * ((i % 3) / 3 + 0.3);
    g.fillStyle(BAIZE_LIT, 0.6); g.fillRect(x + Math.cos(a) * d - 2 * s, cy + Math.sin(a) * d, 2 * s, 1.5 * s);
  }
  g.fillStyle(suit === 'heart' || suit === 'diamond' ? CARD_RED : CARD_BLACK, 1); g.fillRect(x - 5 * s, y - 16 * s, 10 * s, 3 * s);
}

/** A planchette: the heart-shaped pointer of a spirit board, with its round glass window. */
export function planchette(g: G, x: number, y: number, s: number, angle: number, glowA = 0): void {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const P = (fx: number, fy: number): Pt => ({ x: x + fx * ca - fy * sa, y: y + fx * sa + fy * ca });
  if (glowA > 0) glow(g, x, y, s * 2.2, MIND, 0.06 * glowA, 3);
  const tip = P(s * 1.5, 0), l = P(-s * 0.7, -s * 1.05), r = P(-s * 0.7, s * 1.05), back = P(-s * 1.05, 0);
  g.fillStyle(0x000000, 0.3); g.fillTriangle(tip.x + 3, tip.y + 4, l.x + 3, l.y + 4, r.x + 3, r.y + 4);
  g.fillStyle(WOOD_DARK, 1); g.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
  g.fillCircle(back.x, back.y, s * 0.86);
  g.fillStyle(WOOD_LIT, 1); g.fillTriangle(tip.x, tip.y, P(-s * 0.55, -s * 0.85).x, P(-s * 0.55, -s * 0.85).y, P(-s * 0.55, s * 0.85).x, P(-s * 0.55, s * 0.85).y);
  g.fillCircle(back.x, back.y, s * 0.72);
  // The window, over the letter it points at.
  const wv = P(s * 0.2, 0);
  g.fillStyle(GILT, 1); g.fillCircle(wv.x, wv.y, s * 0.46);
  g.fillStyle(CRYSTAL, 0.5 + glowA * 0.4); g.fillCircle(wv.x, wv.y, s * 0.36);
  g.fillStyle(CRYSTAL_LIT, 0.8); g.fillCircle(wv.x - s * 0.12, wv.y - s * 0.12, s * 0.1);
  // Felt feet.
  for (const p of [P(s * 1.1, 0), P(-s * 0.9, -s * 0.6), P(-s * 0.9, s * 0.6)]) { g.fillStyle(EBONY, 1); g.fillCircle(p.x, p.y, s * 0.12); }
}

/**
 * Where a spirit board's letters sit: A–M along an upper arc, N–Z along a lower one, the way a
 * real board is laid out. Returned in alphabet order.
 */
export function boardLetters(cx: number, cy: number, w: number, h: number): Pt[] {
  const pts: Pt[] = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 13; i++) {
      const k = (i / 12) * 2 - 1;
      const x = cx + k * w * 0.42;
      const y = cy + (row ? 0.1 : -0.18) * h + k * k * h * 0.16 * (row ? 1 : 1);
      pts.push({ x, y });
    }
  }
  return pts;
}

/** A spirit board laid flat: varnished wood, sun and moon in the corners, YES/NO, the alphabet. */
export function spiritBoard(g: G, cx: number, cy: number, w: number, h: number, a = 1, letterH = 0): void {
  const x0 = cx - w / 2, y0 = cy - h / 2;
  g.fillStyle(0x000000, 0.25 * a); g.fillRoundedRect(x0 + 6, y0 + 8, w, h, 22);
  g.fillStyle(WOOD_DARK, a); g.fillRoundedRect(x0, y0, w, h, 22);
  g.fillStyle(mixC(WOOD, 0xc89a5a, 0.35), a); g.fillRoundedRect(x0 + 8, y0 + 8, w - 16, h - 16, 18);
  // Grain.
  g.lineStyle(1, WOOD, 0.35 * a);
  for (let k = 1; k < 9; k++) g.lineBetween(x0 + 12, y0 + (h * k) / 9, x0 + w - 12, y0 + (h * k) / 9 + Math.sin(k) * 6);
  g.lineStyle(2, GILT_DARK, 0.8 * a); g.strokeRoundedRect(x0 + 14, y0 + 14, w - 28, h - 28, 14);
  // Sun and moon.
  const sun = { x: x0 + w * 0.1, y: y0 + h * 0.16 }, moon = { x: x0 + w * 0.9, y: y0 + h * 0.16 };
  g.fillStyle(GILT, a); g.fillCircle(sun.x, sun.y, h * 0.06);
  for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2; g.lineStyle(2, GILT, a); g.lineBetween(sun.x + Math.cos(an) * h * 0.08, sun.y + Math.sin(an) * h * 0.08, sun.x + Math.cos(an) * h * 0.11, sun.y + Math.sin(an) * h * 0.11); }
  g.fillStyle(IVORY, a); g.fillCircle(moon.x, moon.y, h * 0.06);
  g.fillStyle(mixC(WOOD, 0xc89a5a, 0.35), a); g.fillCircle(moon.x + h * 0.03, moon.y - h * 0.015, h * 0.055);
  const lh = letterH || h * 0.07;
  strokeText(g, 'YES', sun.x + w * 0.08, sun.y + 2, lh * 0.8, EBONY, a, 2);
  strokeText(g, 'NO', moon.x - w * 0.07, moon.y + 2, lh * 0.8, EBONY, a, 2);
  const L = boardLetters(cx, cy, w, h);
  for (let i = 0; i < 26; i++) strokeText(g, String.fromCharCode(65 + i), L[i].x, L[i].y, lh, EBONY, a, 2);
  strokeText(g, 'GOOD BYE', cx, y0 + h * 0.86, lh * 0.8, EBONY, a * 0.85, 2);
}

/** A spiral disc — the hypnotist's wheel. Black and ivory arms, gilt rim. `angle` turns it. */
export function spiralDisc(g: G, x: number, y: number, r: number, angle: number, a = 1): void {
  g.fillStyle(GILT_DARK, a); g.fillCircle(x, y, r + 5);
  g.fillStyle(GILT, a); g.fillCircle(x, y, r + 3);
  g.fillStyle(IVORY, a); g.fillCircle(x, y, r);
  const arms = 2;
  for (let k = 0; k < arms; k++) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const tt = i / 40;
      const an = angle + k * Math.PI + tt * Math.PI * 4;
      pts.push({ x: x + Math.cos(an) * r * tt, y: y + Math.sin(an) * r * tt });
    }
    g.lineStyle(r * 0.16, EBONY, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.strokePath();
  }
  g.fillStyle(MIND, a); g.fillCircle(x, y, r * 0.12);
  g.fillStyle(MIND_LIT, a); g.fillCircle(x - r * 0.03, y - r * 0.03, r * 0.05);
}

// ── Chess ────────────────────────────────────────────────────────────

export type PieceKind = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

/** A turned chess piece in ivory or ebony. `x, y` = its base; `s` 1 ≈ 40 px tall. */
export function chessPiece(g: G, x: number, y: number, kind: PieceKind, white: boolean, s = 1, a = 1): void {
  const body = white ? IVORY : EBONY;
  const side = white ? IVORY_DARK : dim(EBONY, 0.4);
  const hi = white ? 0xffffff : EBONY_LIT;
  shadow(g, x, y + 1, 30 * s, 9 * s, 0.3 * a);
  // Base and collar common to every piece.
  g.fillStyle(side, a); g.fillEllipse(x, y - 2 * s, 26 * s, 8 * s);
  g.fillStyle(body, a); g.fillEllipse(x, y - 4 * s, 24 * s, 7 * s);
  g.fillRect(x - 9 * s, y - 9 * s, 18 * s, 5 * s);
  const stemTop = kind === 'pawn' ? 18 : 26;
  g.fillStyle(body, a); g.fillTriangle(x - 8 * s, y - 8 * s, x + 8 * s, y - 8 * s, x - 3.5 * s, y - stemTop * s);
  g.fillTriangle(x + 8 * s, y - 8 * s, x + 3.5 * s, y - stemTop * s, x - 3.5 * s, y - stemTop * s);
  g.fillStyle(side, a); g.fillRect(x + 2 * s, y - (stemTop - 2) * s, 2 * s, (stemTop - 10) * s);
  g.fillStyle(body, a); g.fillEllipse(x, y - stemTop * s, 15 * s, 4 * s);
  const top = y - stemTop * s;
  switch (kind) {
    case 'pawn':
      g.fillStyle(body, a); g.fillCircle(x, top - 5 * s, 6 * s);
      g.fillStyle(hi, 0.5 * a); g.fillCircle(x - 2 * s, top - 7 * s, 2 * s);
      break;
    case 'rook':
      g.fillStyle(body, a); g.fillRect(x - 7 * s, top - 10 * s, 14 * s, 10 * s);
      for (const k of [-1, 0, 1]) g.fillRect(x + k * 5 * s - 2 * s, top - 14 * s, 4 * s, 5 * s);
      g.fillStyle(side, a); g.fillRect(x + 3 * s, top - 10 * s, 3 * s, 10 * s);
      break;
    case 'bishop':
      g.fillStyle(body, a); g.fillEllipse(x, top - 8 * s, 12 * s, 17 * s);
      g.fillCircle(x, top - 18 * s, 2.5 * s);
      g.lineStyle(1.5 * s, side, a); g.lineBetween(x - 3 * s, top - 4 * s, x + 4 * s, top - 12 * s);
      break;
    case 'knight':
      g.fillStyle(body, a);
      g.fillTriangle(x - 7 * s, top, x + 7 * s, top, x + 5 * s, top - 18 * s);
      g.fillTriangle(x - 7 * s, top, x + 5 * s, top - 18 * s, x - 6 * s, top - 14 * s);
      g.fillTriangle(x - 6 * s, top - 14 * s, x + 5 * s, top - 18 * s, x - 11 * s, top - 9 * s);
      g.fillStyle(side, a); g.fillCircle(x - 2 * s, top - 13 * s, 1.4 * s);
      g.lineStyle(1.5 * s, side, a); g.lineBetween(x + 5 * s, top - 18 * s, x + 6 * s, top - 6 * s);
      break;
    case 'queen':
      g.fillStyle(body, a); g.fillTriangle(x - 8 * s, top, x + 8 * s, top, x, top - 14 * s);
      for (let k = -2; k <= 2; k++) { g.fillTriangle(x + k * 3.5 * s - 2.5 * s, top - 8 * s, x + k * 3.5 * s + 2.5 * s, top - 8 * s, x + k * 3.5 * s, top - 16 * s); g.fillCircle(x + k * 3.5 * s, top - 16 * s, 1.5 * s); }
      g.fillStyle(GILT, a); g.fillRect(x - 7 * s, top - 6 * s, 14 * s, 2 * s);
      break;
    case 'king':
      g.fillStyle(body, a); g.fillTriangle(x - 8 * s, top, x + 8 * s, top, x, top - 16 * s);
      g.fillRect(x - 6 * s, top - 14 * s, 12 * s, 5 * s);
      g.fillStyle(GILT, a); g.fillRect(x - 1.5 * s, top - 26 * s, 3 * s, 12 * s); g.fillRect(x - 5 * s, top - 22 * s, 10 * s, 3 * s);
      break;
  }
}

/**
 * A *living* piece on the plaza board: a busted townsman standing a square, a black chip on his
 * chain, wearing a tall headdress in the shape of the piece he plays. `x, y` = his feet.
 */
export function livingPiece(g: G, x: number, y: number, kind: PieceKind, white: boolean, t: number, seed: number): void {
  const robe = white ? IVORY : EBONY;
  const trim = white ? GILT : CARD_RED;
  const sway = Math.sin(t * 1.3 + seed) * 1.2;
  shadow(g, x, y + 1, 22, 7, 0.3);
  g.fillStyle(dim(robe, 0.25), 1); g.fillEllipse(x, y - 9, 20, 18);
  g.fillStyle(robe, 1); g.fillEllipse(x, y - 11, 18, 18);
  g.fillStyle(trim, 1); g.fillRect(x - 9, y - 6, 18, 2);
  // Face and the black chip at the throat.
  g.fillStyle(0xd6b498, 1); g.fillCircle(x + sway * 0.3, y - 23, 6);
  g.fillStyle(CARD_BLACK, 1); g.fillCircle(x, y - 16, 2.4);
  g.lineStyle(1, GILT_DARK, 1); g.strokeCircle(x, y - 16, 2.4);
  // The headdress: the piece itself, in miniature, worn as a hat.
  chessPiece(g, x + sway, y - 27, kind, white, 0.48);
}

// ── Buildings ────────────────────────────────────────────────────────

/** A tasselled valance along a window or a booth. */
function valance(g: G, x0: number, y: number, w: number, color: number, tassel: number): void {
  g.fillStyle(dim(color, 0.3), 1); g.fillRect(x0, y, w, 8);
  g.fillStyle(color, 1); g.fillRect(x0, y, w, 6);
  for (let x = x0 + 4; x < x0 + w; x += 9) {
    g.fillStyle(color, 1); g.fillTriangle(x - 4, y + 6, x + 4, y + 6, x, y + 12);
    g.fillStyle(tassel, 1); g.fillCircle(x, y + 13, 1.6);
  }
}

/** Half-drawn velvet curtains in a lit window; `lightA` is the lamp-glow behind them. */
function curtainedWindow(g: G, x: number, y: number, w: number, h: number, curtain: number, ball: boolean, lightA = 1): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - w / 2 - 3, y - 3, w + 6, h + 6);
  g.fillStyle(mixC(0x2a1830, CANDLE, 0.45 * lightA), 1); g.fillRect(x - w / 2, y, w, h);
  glow(g, x, y + h * 0.6, w * 0.5, CANDLE, 0.05 * lightA, 2);
  if (ball) {
    g.fillStyle(CRYSTAL_DEEP, 1); g.fillCircle(x, y + h * 0.62, w * 0.16);
    g.fillStyle(MIND_LIT, 0.6); g.fillCircle(x, y + h * 0.62, w * 0.12);
    g.fillStyle(GILT, 1); g.fillRect(x - w * 0.12, y + h * 0.76, w * 0.24, 3);
  }
  // Curtains swagged back to each side.
  for (const k of [-1, 1]) {
    const ex = x + k * w / 2;
    g.fillStyle(dim(curtain, 0.25), 1); g.fillTriangle(ex, y, ex - k * w * 0.36, y, ex, y + h);
    g.fillStyle(curtain, 1); g.fillTriangle(ex, y, ex - k * w * 0.3, y, ex, y + h * 0.9);
    g.fillStyle(lit(curtain, 0.2), 0.5); g.fillTriangle(ex - k * 2, y, ex - k * w * 0.16, y, ex - k * 2, y + h * 0.6);
    g.fillStyle(GILT, 1); g.fillCircle(ex - k * 3, y + h * 0.55, 2);
  }
  valance(g, x - w / 2 - 2, y, w + 4, curtain, GILT);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - w / 2 - 5, y + h, w + 10, 4);
}

export interface ParlourOpts { wall: number; curtain: number; door: number; sign: 'eye' | 'hand' | 'moon' | 'card' }

/**
 * A séance parlour: a narrow tall townhouse with a bay window of drawn velvet and a crystal ball
 * lit behind it, a reader's sign hung on a gilt bracket, candles on the sill and a slate mansard
 * roof with a little round window like an eye. `x, y` = the front wall's base centre.
 */
export function seanceParlour(g: G, x: number, y: number, w: number, h: number, o: ParlourOpts, rng: () => number): Pt {
  shadow(g, x, y + 4, w * 1.1, 22);
  const x0 = x - w / 2, top = y - h;
  // Wall, with stucco blocks.
  g.fillStyle(dim(o.wall, 0.25), 1); g.fillRect(x0 - 2, top, w + 4, h);
  g.fillStyle(o.wall, 1); g.fillRect(x0, top, w, h);
  g.lineStyle(1, dim(o.wall, 0.15), 0.6);
  for (let yy = top + 16; yy < y; yy += 16) g.lineBetween(x0, yy, x0 + w, yy);
  g.fillStyle(lit(o.wall, 0.2), 0.5); g.fillRect(x0, top, 4, h);
  // Mansard roof in slate with an oculus.
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 10, top, x0 + w + 10, top, x0 + w - 8, top - 46);
  g.fillTriangle(x0 - 10, top, x0 + w - 8, top - 46, x0 + 8, top - 46);
  g.lineStyle(1, SLATE_LIT, 0.6);
  for (let k = 0; k < 4; k++) g.lineBetween(x0 - 8 + k * 4, top - k * 11, x0 + w + 8 - k * 4, top - k * 11);
  g.fillStyle(SLATE_LIT, 1); g.fillRect(x0 + 6, top - 50, w - 12, 5);
  g.fillStyle(STONE, 1); g.fillCircle(x, top - 24, 11);
  eye(g, x, top - 24, 8, GILT_DARK, MIND, 1, 0.9);
  // Chimney pots.
  g.fillStyle(BRICK, 1); g.fillRect(x0 + w - 22, top - 66, 12, 22);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0 + w - 24, top - 68, 16, 4);
  // Bay window on the ground floor, an upstairs window too.
  curtainedWindow(g, x - w * 0.18, y - h * 0.5, w * 0.42, h * 0.3, o.curtain, true, 1);
  curtainedWindow(g, x, top + h * 0.1, w * 0.36, h * 0.2, o.curtain, false, 0.6);
  // Candles on the sill.
  for (let k = 0; k < 3; k++) {
    const cx = x - w * 0.34 + k * w * 0.16, cy = y - h * 0.2 + 2;
    g.fillStyle(IVORY, 1); g.fillRect(cx - 1.5, cy - 8, 3, 8);
    g.fillStyle(FLAME, 1); g.fillEllipse(cx, cy - 11, 3, 5);
  }
  // The door: plum, a gilt knocker shaped like a hand.
  const dx = x + w * 0.27, dw = w * 0.26;
  g.fillStyle(STONE_DARK, 1); g.fillRect(dx - dw / 2 - 3, y - h * 0.46, dw + 6, h * 0.46);
  g.fillStyle(o.door, 1); g.fillRect(dx - dw / 2, y - h * 0.44, dw, h * 0.44);
  g.fillStyle(dim(o.door, 0.3), 1); g.fillRect(dx - dw / 2 + 3, y - h * 0.4, dw - 6, h * 0.16); g.fillRect(dx - dw / 2 + 3, y - h * 0.2, dw - 6, h * 0.16);
  g.fillStyle(GILT, 1); g.fillCircle(dx, y - h * 0.3, 2.6); g.fillRect(dx + dw * 0.3, y - h * 0.22, 2, 4);
  g.fillStyle(CRYSTAL, 0.6); g.fillTriangle(dx - dw / 2, y - h * 0.44, dx + dw / 2, y - h * 0.44, dx, y - h * 0.52);
  // The reader's sign on a bracket.
  const bx = x0 - 6, by = y - h * 0.72;
  g.lineStyle(2, GILT_DARK, 1); g.lineBetween(bx + 6, by, bx - 20, by); g.lineBetween(bx + 6, by + 8, bx - 6, by);
  g.lineStyle(1, GILT_DARK, 1); g.lineBetween(bx - 18, by, bx - 18, by + 6); g.lineBetween(bx - 2, by, bx - 2, by + 6);
  g.fillStyle(VELVET_DARK, 1); g.fillRoundedRect(bx - 26, by + 6, 32, 24, 5);
  g.lineStyle(1.5, GILT, 1); g.strokeRoundedRect(bx - 26, by + 6, 32, 24, 5);
  const sx = bx - 10, sy = by + 18;
  if (o.sign === 'eye') eye(g, sx, sy, 10, GILT, MIND);
  else if (o.sign === 'moon') { g.fillStyle(IVORY, 1); g.fillCircle(sx, sy, 8); g.fillStyle(VELVET_DARK, 1); g.fillCircle(sx + 4, sy - 2, 7); }
  else if (o.sign === 'card') suitPip(g, sx, sy, 8, 'spade', IVORY);
  else {
    g.fillStyle(IVORY, 1); g.fillRoundedRect(sx - 6, sy - 4, 12, 12, 3);
    for (let k = 0; k < 4; k++) g.fillRect(sx - 6 + k * 3.2, sy - 10, 2.4, 7);
    g.fillRect(sx + 6, sy - 2, 4, 2.4);
    eye(g, sx, sy + 2, 3.4, VELVET_DARK, MIND);
  }
  // Steps.
  g.fillStyle(STONE, 1); g.fillRect(dx - dw / 2 - 6, y - 4, dw + 12, 4);
  g.fillStyle(STONE_LIT, 1); g.fillRect(dx - dw / 2 - 8, y, dw + 16, 4);
  if (rng() < 0.5) { g.fillStyle(CARD_WHITE, 0.9); g.fillRect(x0 + 6, y - 14, 10, 13); g.fillStyle(CARD_RED, 1); g.fillCircle(x0 + 11, y - 8, 2); }
  return { x: dx, y: y + 14 };
}

/**
 * The Thought Exchange: a pillared hall under a gilt dome, where the readers' notes are bought
 * and sold. A great slate board on its face chalks the day's prices — a column of eyes, a column
 * of figures — and on the pediment a phrenologist's bust, its skull mapped into numbered lots.
 * `x, y` = the base centre of the front steps.
 */
export function thoughtExchange(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.06, 30);
  const x0 = x - w / 2, top = y - h;
  // Steps.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x0 - 14 + k * 8, y - 4 - k * 6, w + 28 - k * 16, 6); }
  const fy = y - 26;
  // The hall behind the colonnade.
  g.fillStyle(dim(STONE, 0.35), 1); g.fillRect(x0 + 10, top, w - 20, fy - top);
  // The prices board between the middle columns.
  const bw = w * 0.42, bh = h * 0.42, bx = x - bw / 2, byy = fy - bh - h * 0.12;
  g.fillStyle(WOOD_DARK, 1); g.fillRect(bx - 6, byy - 6, bw + 12, bh + 12);
  g.fillStyle(SLATE, 1); g.fillRect(bx, byy, bw, bh);
  strokeText(g, 'THOUGHTS', x, byy + 10, 9, CHALK, 0.9, 1.5);
  for (let r = 0; r < 4; r++) {
    const ry = byy + 26 + r * (bh - 30) / 4;
    eye(g, bx + 16, ry + 4, 6, CHALK, SLATE_LIT, 0.8);
    strokeText(g, String(10 + Math.floor(rng() * 89)), bx + bw - 24, ry + 4, 8, CHALK, 0.85, 1.3);
    g.lineStyle(1, CHALK, 0.4); g.lineBetween(bx + 28, ry + 4, bx + bw - 44, ry + 4);
  }
  // Columns.
  const n = 6;
  for (let i = 0; i < n; i++) {
    const cx = x0 + 22 + (i * (w - 44)) / (n - 1);
    if (Math.abs(cx - x) < bw / 2 + 4) continue;
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 12, top + 20, 24, fy - top - 20);
    g.fillStyle(STONE, 1); g.fillRect(cx - 10, top + 20, 18, fy - top - 20);
    g.lineStyle(1, STONE_DARK, 0.6); for (let k = -6; k <= 6; k += 4) g.lineBetween(cx + k, top + 24, cx + k, fy - 6);
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 15, top + 14, 30, 7); g.fillRect(cx - 14, fy - 7, 28, 7);
  }
  // Entablature and pediment.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 6, top - 4, w + 12, 20);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 4, top - 6, w + 8, 16);
  g.fillStyle(GILT, 1); g.fillRect(x0 - 4, top + 6, w + 8, 3);
  g.fillStyle(STONE_LIT, 1); g.fillTriangle(x0 - 10, top - 6, x0 + w + 10, top - 6, x, top - 70);
  g.fillStyle(STONE, 1); g.fillTriangle(x0 + 10, top - 10, x0 + w - 10, top - 10, x, top - 62);
  // The phrenologist's bust in the pediment, its head mapped into lots.
  const hx = x, hy = top - 32;
  g.fillStyle(IVORY_DARK, 1); g.fillEllipse(hx, hy + 2, 34, 30);
  g.fillStyle(IVORY, 1); g.fillEllipse(hx - 1, hy, 32, 28);
  g.lineStyle(1, GILT_DARK, 0.9);
  g.lineBetween(hx - 14, hy - 2, hx + 14, hy - 2); g.lineBetween(hx, hy - 14, hx, hy + 10); g.lineBetween(hx - 10, hy - 10, hx + 10, hy + 6);
  for (let i = 0; i < 6; i++) { g.fillStyle(GILT_DARK, 0.9); g.fillCircle(hx - 9 + (i % 3) * 9, hy - 7 + Math.floor(i / 3) * 9, 1.1); }
  // The dome behind, gilt with ribs, an eye lantern on top.
  const dr = Math.min(120, w * 0.22);
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, top - 64, dr * 2 + 8, dr * 1.1);
  g.fillStyle(GILT, 1); g.fillEllipse(x, top - 66, dr * 2, dr);
  g.fillStyle(GILT_LIT, 0.6); g.fillEllipse(x - dr * 0.4, top - 80, dr * 0.6, dr * 0.3);
  g.lineStyle(1.5, GILT_DARK, 0.8);
  for (let k = 1; k < 8; k++) { const a = Math.PI + (k / 8) * Math.PI; g.lineBetween(x + Math.cos(a) * dr, top - 66, x + Math.cos(a) * dr * 0.12, top - 66 - dr * 0.48); }
  g.fillStyle(STONE, 1); g.fillRect(x - 10, top - 66 - dr * 0.5 - 16, 20, 18);
  eye(g, x, top - 66 - dr * 0.5 - 7, 7, GILT_DARK, MIND);
  g.fillStyle(GILT, 1); g.fillTriangle(x - 12, top - 66 - dr * 0.5 - 16, x + 12, top - 66 - dr * 0.5 - 16, x, top - 66 - dr * 0.5 - 30);
  // The doors, open, lamp-lit, and a bell on a bracket for the closing of trade.
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 22, fy - h * 0.1, 44, h * 0.1);
  g.fillStyle(mixC(0x1a1410, CANDLE, 0.4), 1); g.fillRect(x - 16, fy - h * 0.1 + 4, 32, h * 0.1 - 4);
  g.lineStyle(2, GILT_DARK, 1); g.lineBetween(x0 + w - 30, top + 30, x0 + w - 6, top + 30);
  g.fillStyle(GILT, 1); g.fillTriangle(x0 + w - 14, top + 32, x0 + w - 2, top + 32, x0 + w - 8, top + 46); g.fillCircle(x0 + w - 8, top + 47, 2);
}

/**
 * The Swoon Playhouse: the hypnotist's theatre. Red brick, an arched marquee ringed with bulbs,
 * a great spiral disc mounted over the doors (turned in `animate`, drawn here at rest), and
 * playbills pasted either side. `x, y` = the base centre.
 */
export function playhouse(g: G, x: number, y: number, w: number, h: number): void {
  shadow(g, x, y + 6, w * 1.08, 30);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0 - 3, top, w + 6, h);
  g.fillStyle(BRICK, 1); g.fillRect(x0, top, w, h);
  for (let yy = top + 6; yy < y; yy += 8) {
    for (let xx = x0 + ((yy / 8) % 2) * 9; xx < x0 + w; xx += 18) { g.fillStyle(BRICK_LIT, 0.25); g.fillRect(xx, yy, 16, 6); }
  }
  // A stepped parapet with gilt urns.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x0 - 6 + k * 30, top - 14 - k * 12, w + 12 - k * 60, 14); }
  for (const ux of [x0 + 10, x0 + w - 10]) { g.fillStyle(GILT, 1); g.fillEllipse(ux, top - 24, 14, 18); g.fillRect(ux - 3, top - 36, 6, 6); }
  // The spiral at rest: over the marquee.
  spiralDisc(g, x, top + h * 0.28, Math.min(64, w * 0.16), 0);
  // The marquee: an arch of bulbs over a velvet board.
  const my = y - h * 0.44, mw = w * 0.6;
  g.fillStyle(VELVET_DARK, 1); g.fillRect(x - mw / 2, my - 22, mw, 26);
  g.fillStyle(VELVET, 1); g.fillRect(x - mw / 2 + 3, my - 19, mw - 6, 20);
  strokeText(g, 'THE GREAT SWOON', x, my - 9, 10, GILT_LIT, 1, 1.6);
  for (let k = 0; k <= 14; k++) { g.fillStyle(CANDLE, 1); g.fillCircle(x - mw / 2 + (k * mw) / 14, my - 26, 2.4); g.fillCircle(x - mw / 2 + (k * mw) / 14, my + 7, 2.4); }
  // The arched entrance and its doors.
  const dw = w * 0.36;
  g.fillStyle(STONE, 1); g.fillRect(x - dw / 2 - 8, my + 10, dw + 16, y - my - 10);
  g.fillStyle(0x24121a, 1); g.fillRect(x - dw / 2, my + 16, dw, y - my - 16);
  g.fillStyle(VELVET, 1);
  for (const k of [-1, 1]) g.fillRect(x + k * dw / 4 - dw / 4 + 3, my + 20, dw / 2 - 6, y - my - 22);
  g.fillStyle(GILT, 1); g.fillCircle(x - 6, y - (y - my) * 0.4, 2.4); g.fillCircle(x + 6, y - (y - my) * 0.4, 2.4);
  // Playbills: a spiral, a swooning lady, ADMIT ONE.
  for (const [px, k] of [[x0 + w * 0.12, 0], [x0 + w * 0.88, 1]] as [number, number][]) {
    const py = y - h * 0.36;
    g.fillStyle(IVORY, 1); g.fillRect(px - 22, py - 30, 44, 60);
    g.lineStyle(1, GILT_DARK, 1); g.strokeRect(px - 20, py - 28, 40, 56);
    if (k === 0) spiralDisc(g, px, py - 6, 13, 1.3);
    else {
      g.fillStyle(VELVET, 1); g.fillEllipse(px, py, 14, 30); g.fillStyle(0xd6b498, 1); g.fillCircle(px - 4, py - 14, 5);
      g.lineStyle(1, EBONY, 1); g.lineBetween(px + 2, py - 18, px + 10, py - 22);
    }
    strokeText(g, k ? 'NIGHTLY' : 'SLEEP', px, py + 18, 6, CARD_RED, 1, 1.2);
  }
  // Steps.
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - dw / 2 - 14, y - 4, dw + 28, 6);
}

/**
 * The Deep Think — Prince Gambit's hall. An octagonal tower faced in black and ivory chequer,
 * gilt quoins, and on its roof a vast crystal ball held in a gilt claw, a violet thought turning
 * inside it (animated in `animate`). One round window under the ball is an eye: the lid opens
 * once the prince has fallen. `x, y` = the base centre of the door.
 */
export function deepThink(g: G, x: number, y: number, w: number, h: number): void {
  shadow(g, x, y + 8, w * 1.1, 34);
  const x0 = x - w / 2, top = y - h;
  // Plinth of steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x0 - 16 + k * 8, y - 6 - k * 6, w + 32 - k * 16, 7); }
  const fy = y - 22;
  // The chequered faces: a front face and two raked side faces.
  const SQ = 16;
  const face = (fx0: number, fw: number, shade: number) => {
    for (let yy = top; yy < fy; yy += SQ) {
      for (let xx = fx0; xx < fx0 + fw; xx += SQ) {
        const k = (Math.floor((xx - fx0) / SQ) + Math.floor((yy - top) / SQ)) % 2;
        g.fillStyle(dim(k ? IVORY : EBONY, shade), 1); g.fillRect(xx, yy, Math.min(SQ, fx0 + fw - xx), Math.min(SQ, fy - yy));
      }
    }
  };
  const side = w * 0.18;
  face(x0, side, 0.35);
  face(x0 + w - side, side, 0.35);
  face(x0 + side, w - side * 2, 0);
  for (const qx of [x0 + side, x0 + w - side]) { g.fillStyle(GILT_DARK, 1); g.fillRect(qx - 3, top, 6, fy - top); g.fillStyle(GILT, 1); g.fillRect(qx - 2, top, 3, fy - top); }
  // Cornice.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x0 - 8, top - 12, w + 16, 14);
  g.fillStyle(GILT, 1); g.fillRect(x0 - 6, top - 14, w + 12, 9);
  for (let bx = x0; bx < x0 + w; bx += 22) { g.fillStyle(GILT_LIT, 1); g.fillRect(bx + 4, top - 22, 6, 9); }
  // The claw and the great ball on the roof.
  const br = Math.min(96, w * 0.28), bcy = top - 22 - br * 0.9;
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, top - 18, br * 1.6, 22);
  glow(g, x, bcy, br * 1.5, MIND, 0.045, 4);
  g.fillStyle(CRYSTAL_DEEP, 1); g.fillCircle(x, bcy, br);
  g.fillStyle(CRYSTAL, 0.45); g.fillCircle(x, bcy, br * 0.94);
  g.fillStyle(MIND_DARK, 0.35); g.fillCircle(x + br * 0.1, bcy + br * 0.15, br * 0.6);
  g.fillStyle(CRYSTAL_LIT, 0.8); g.fillEllipse(x - br * 0.4, bcy - br * 0.45, br * 0.42, br * 0.22);
  for (const k of [-1, -0.35, 0.35, 1]) {
    const tx = x + k * br * 0.9, ty = bcy + br * 0.35 - Math.abs(k) * br * 0.1;
    g.lineStyle(9, GILT_DARK, 1); g.lineBetween(x + k * br * 0.4, top - 18, tx, ty);
    g.lineStyle(6, GILT, 1); g.lineBetween(x + k * br * 0.4, top - 20, tx, ty);
    g.fillStyle(GILT_LIT, 1); g.fillTriangle(tx - 4, ty, tx + 4, ty, tx + k * 4, ty - 12);
  }
  // The eye window under the ball (lid shut: the open one is a `when` piece over it).
  const ey = top + (fy - top) * 0.26;
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, ey, 30);
  g.fillStyle(EBONY, 1); g.fillCircle(x, ey, 26);
  g.fillStyle(GAMBIT_LID, 1); g.fillEllipse(x, ey, 46, 10);
  g.lineStyle(2, GILT, 1); g.lineBetween(x - 22, ey, x + 22, ey);
  for (let i = -3; i <= 3; i++) g.lineBetween(x + i * 6, ey + 2, x + i * 7, ey + 8);
  // Tall arched door with a knight's head knocker.
  const dw = w * 0.2, dh = (fy - top) * 0.46;
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - dw / 2 - 5, fy - dh - 5, dw + 10, dh + 5);
  g.fillStyle(GAMBIT_DOOR, 1); g.fillRect(x - dw / 2, fy - dh, dw, dh);
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, fy - dh, dw / 2 + 5);
  g.fillStyle(GAMBIT_DOOR, 1); g.fillCircle(x, fy - dh, dw / 2);
  g.lineStyle(1.5, GILT, 0.8); g.lineBetween(x, fy - dh - dw / 2, x, fy);
  chessPiece(g, x + dw * 0.22, fy - dh * 0.4, 'knight', true, 0.36);
  // Banners of the King's colours either side: black and red, the Wheel stitched on.
  for (const k of [-1, 1]) {
    const bx = x + k * (w / 2 - side - 26), byy = top + 18;
    g.fillStyle(k < 0 ? CARD_BLACK : CARD_RED, 1); g.fillRect(bx - 12, byy, 24, 70);
    g.fillTriangle(bx - 12, byy + 70, bx + 12, byy + 70, bx, byy + 82);
    g.lineStyle(1.5, GILT, 1); g.strokeCircle(bx, byy + 30, 8);
    for (let s = 0; s < 8; s++) { const a = (s / 8) * Math.PI * 2; g.lineBetween(bx, byy + 30, bx + Math.cos(a) * 8, byy + 30 + Math.sin(a) * 8); }
  }
}
const GAMBIT_LID = 0x3a2a70;
const GAMBIT_DOOR = 0x2a1a50;

/** The eye window of the Deep Think, open: drawn over the shut one once Gambit has fallen. */
export function deepThinkEyeOpen(g: G, x: number, y: number, w: number, h: number): void {
  const top = y - h, fy = y - 22;
  const ey = top + (fy - top) * 0.26;
  g.fillStyle(EBONY, 1); g.fillCircle(x, ey, 26);
  eye(g, x, ey, 22, GILT, MIND, 1, 1);
}

/**
 * A reading booth: a striped canopy over a little table for two under a green-shaded lamp,
 * where a bet is checked before the House will take it. A sign hangs from the valance: BETS
 * READ. `x, y` = the front edge's centre.
 */
export function readingBooth(g: G, x: number, y: number, stripe: number, rng: () => number): void {
  shadow(g, x, y + 2, 120, 24);
  // Posts.
  for (const k of [-1, 1]) { g.fillStyle(WOOD_DARK, 1); g.fillRect(x + k * 50 - 2, y - 82, 4, 82); }
  // Table, cloth, two chairs.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 3, y - 28, 6, 22);
  g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(x, y - 30, 58, 16);
  g.fillStyle(dim(LAMP_GREEN, 0.3), 1); g.fillRect(x - 29, y - 30, 58, 6);
  for (const k of [-1, 1]) {
    const cx = x + k * 38;
    g.fillStyle(WOOD, 1); g.fillRect(cx - 7, y - 22, 14, 4); g.fillRect(cx + k * 5 - 2, y - 40, 4, 22);
    g.fillStyle(VELVET, 1); g.fillRect(cx - 7, y - 26, 14, 4);
  }
  // On the table: a deck, a chip stack and the Lot-ledger.
  playingCard(g, x - 12, y - 33, 9, 0, 'spade');
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? CARD_RED : IVORY, 1); g.fillEllipse(x + 12, y - 32 - k * 2, 9, 4); }
  // The lamp over it.
  g.lineStyle(1, EBONY, 1); g.lineBetween(x, y - 86, x, y - 62);
  glow(g, x, y - 40, 30, CANDLE, 0.06, 3);
  g.fillStyle(LAMP_GREEN, 1); g.fillTriangle(x - 13, y - 56, x + 13, y - 56, x, y - 68);
  g.fillStyle(CANDLE, 0.9); g.fillEllipse(x, y - 55, 12, 4);
  // Canopy: striped, scalloped.
  for (let i = 0; i < 8; i++) {
    const sx = x - 60 + i * 15;
    g.fillStyle(i % 2 ? stripe : IVORY, 1); g.fillTriangle(sx, y - 84, sx + 15, y - 84, sx + 7.5 + (i - 3.5) * 2, y - 104);
    g.fillRect(sx, y - 84, 15, 6);
    g.fillStyle(i % 2 ? stripe : IVORY, 1); g.fillCircle(sx + 7.5, y - 78, 7.5);
  }
  g.fillStyle(GILT, 1); g.fillCircle(x, y - 108, 3);
  // The sign: BETS READ, with an eye.
  g.fillStyle(EBONY, 1); g.fillRect(x - 26, y - 72, 52, 12);
  strokeText(g, 'BETS READ', x, y - 66, 6, GILT_LIT, 1, 1.1);
  if (rng() < 0.5) { g.fillStyle(CARD_WHITE, 1); g.fillRect(x + 40, y - 10, 8, 10); }
}

/** A reader's waystone: a black obelisk with a gilt eye that opens when you attune. */
export function mindWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 14);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 20, y - 10, 40, 10);
  g.fillStyle(STONE, 1); g.fillRect(x - 18, y - 12, 36, 6);
  g.fillStyle(EBONY, 1); g.fillTriangle(x - 13, y - 12, x + 13, y - 12, x + 7, y - 70);
  g.fillTriangle(x - 13, y - 12, x + 7, y - 70, x - 7, y - 70);
  g.fillStyle(EBONY_LIT, 1); g.fillTriangle(x - 13, y - 12, x - 7, y - 70, x - 4, y - 12);
  g.fillStyle(GILT, 1); g.fillTriangle(x - 7, y - 70, x + 7, y - 70, x, y - 84);
  eye(g, x, y - 44, 8, GILT, MIND);
  for (let k = 0; k < 4; k++) suitPip(g, x - 6 + (k % 2) * 12, y - 24 + Math.floor(k / 2) * 0, 2.6, (['spade', 'heart', 'diamond', 'club'] as Suit[])[k], GILT, 0.9);
}

/**
 * The séance well's kerb: a ring of dark stone carved with the alphabet, an iron hoop overhead
 * hung with chimes, and three little brass bells on cords. The water is drawn by the ground and
 * animated by the area. `x, y` = the well's centre; rx/ry its basin.
 */
export function seanceWellKerb(g: G, x: number, y: number, rx: number, ry: number): void {
  g.lineStyle(14, STONE_DARK, 1); g.strokeEllipse(x, y + 4, rx * 2 + 14, ry * 2 + 14);
  g.lineStyle(10, STONE, 1); g.strokeEllipse(x, y, rx * 2 + 12, ry * 2 + 12);
  g.lineStyle(2, STONE_LIT, 0.8); g.strokeEllipse(x, y - 3, rx * 2 + 6, ry * 2 + 4);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    strokeText(g, String.fromCharCode(65 + i), x + Math.cos(a) * (rx + 6), y + Math.sin(a) * (ry + 6), 6, VELVET_DARK, 0.75, 1);
  }
}

/** The iron hoop and chimes over the well (a piece: drawn standing up from the kerb's back). */
export function wellHoop(g: G, x: number, y: number, rx: number): void {
  for (const k of [-1, 1]) { g.fillStyle(EBONY, 1); g.fillRect(x + k * rx * 0.8 - 3, y - 120, 6, 120); }
  g.lineStyle(5, EBONY, 1);
  g.beginPath(); g.arc(x, y - 120, rx * 0.8, Math.PI, 0, false); g.strokePath();
  g.lineStyle(2, GILT, 1);
  g.beginPath(); g.arc(x, y - 121, rx * 0.8, Math.PI, 0, false); g.strokePath();
  g.fillStyle(GILT, 1); g.fillCircle(x, y - 120 - rx * 0.8, 5);
  eye(g, x, y - 120 - rx * 0.8, 6, GILT_DARK, MIND);
  for (let i = 0; i < 5; i++) {
    const cx = x - rx * 0.5 + (i * rx) / 4;
    const cy = y - 120 - Math.sqrt(Math.max(0, (rx * 0.8) ** 2 - (cx - x) ** 2));
    g.lineStyle(1, GILT_DARK, 1); g.lineBetween(cx, cy, cx, cy + 22 + (i % 2) * 8);
    g.fillStyle(i % 2 ? GILT : CRYSTAL, 1); g.fillRect(cx - 1.5, cy + 20 + (i % 2) * 8, 3, 12);
  }
}

/** A stone balustrade along the sea wall, gilt-capped every few posts. */
export function balustrade(g: G, x0: number, x1: number, y: number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - 8, x1 - x0, 10);
  for (let x = x0 + 8; x < x1; x += 14) {
    g.fillStyle(STONE_DARK, 1); g.fillEllipse(x + 1, y - 18, 8, 16);
    g.fillStyle(STONE, 1); g.fillEllipse(x, y - 19, 7, 15);
    g.fillStyle(STONE_LIT, 0.7); g.fillEllipse(x - 1.5, y - 22, 2, 6);
  }
  g.fillStyle(STONE, 1); g.fillRect(x0, y - 32, x1 - x0, 7);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0, y - 33, x1 - x0, 2);
  for (let x = x0; x < x1; x += 140) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(x - 8, y - 40, 16, 40);
    g.fillStyle(STONE, 1); g.fillRect(x - 7, y - 42, 14, 40);
    g.fillStyle(GILT, 1); g.fillCircle(x, y - 46, 5);
  }
}

/** The Arbiter's chair: a tall ladder-seat over the board, a clock and a bell at the top. */
export function arbiterChair(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 50, 14);
  for (const k of [-1, 1]) { g.fillStyle(WOOD_DARK, 1); g.fillRect(x + k * 16 - 3, y - 110, 6, 110); }
  for (let r = 0; r < 4; r++) { g.fillStyle(WOOD, 1); g.fillRect(x - 16, y - 20 - r * 24, 32, 4); }
  g.fillStyle(WOOD_LIT, 1); g.fillRect(x - 22, y - 112, 44, 8);
  g.fillStyle(VELVET, 1); g.fillRect(x - 20, y - 118, 40, 6);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 20, y - 150, 40, 32);
  // The game clock: two faces, one button up.
  for (const k of [-1, 1]) {
    g.fillStyle(IVORY, 1); g.fillCircle(x + k * 10, y - 134, 8);
    g.lineStyle(1.5, EBONY, 1); g.lineBetween(x + k * 10, y - 134, x + k * 10 + k * 3, y - 140);
  }
  g.fillStyle(GILT, 1); g.fillRect(x - 13, y - 156, 6, 6); g.fillRect(x + 7, y - 153, 6, 3);
}

/** Lawn: baize, brushed in alternate directions like a fresh-ironed table. */
export function baizeLawn(g: G, x0: number, y0: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(BAIZE, 1); g.fillRect(x0, y0, w, h);
  for (let y = y0; y < y0 + h; y += 48) {
    if (((y - y0) / 48) % 2) continue;
    g.fillStyle(BAIZE_LIT, 0.32); g.fillRect(x0, y, w, 48);
  }
  for (let i = 0; i < (w * h) / 2200; i++) {
    const x = x0 + rng() * w, y = y0 + rng() * h;
    const k = rng();
    if (k < 0.04) { g.fillStyle(rng() < 0.5 ? CARD_RED : IVORY, 0.8); g.fillCircle(x, y, 1.6); } // a dropped chip
    else if (k < 0.5) { g.fillStyle(BAIZE_DARK, 0.35); g.fillRect(x, y, 2, 1.2); }
    else { g.fillStyle(BAIZE_LIT, 0.3); g.fillRect(x, y, 1.5, 2); }
  }
}

/** A road paved in black and red squares, edged in gilt-capped kerb. Axis-aligned. */
export function chequerRoad(g: G, x0: number, y0: number, w: number, h: number, sq = 24): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  for (let y = y0; y < y0 + h; y += sq) {
    for (let x = x0; x < x0 + w; x += sq) {
      const k = (Math.floor((x - x0) / sq) + Math.floor((y - y0) / sq)) % 2;
      g.fillStyle(k ? PAVE_RED : PAVE_BLACK, 1);
      g.fillRect(x, y, Math.min(sq, x0 + w - x), Math.min(sq, y0 + h - y));
      g.fillStyle(0xffffff, 0.05); g.fillRect(x, y, Math.min(sq, x0 + w - x), 2);
    }
  }
  g.lineStyle(2, GILT_DARK, 0.7); g.strokeRect(x0 - 3, y0 - 3, w + 6, h + 6);
}

/** A playbill kiosk: a round column pasted with bills, a little gilt dome. */
export function billKiosk(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(EBONY, 1); g.fillRect(x - 15, y - 76, 30, 76);
  const colors = [IVORY, CARD_RED, VELVET_LIT, GILT_LIT, CRYSTAL];
  for (let k = 0; k < 4; k++) {
    g.fillStyle(colors[Math.floor(rng() * colors.length)], 0.95); g.fillRect(x - 13, y - 70 + k * 16, 26, 14);
    if (k === 1) spiralDisc(g, x, y - 47, 5, k);
    if (k === 2) eye(g, x, y - 31, 6, EBONY, MIND);
  }
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 18, y - 80, 36, 6);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 84, 30, 14); g.fillCircle(x, y - 94, 3);
}
