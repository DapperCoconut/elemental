import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  ANTE, BAIZE, BAIZE_DARK, BAIZE_DEEP, BAIZE_LIT, BELL, BRASS, BRASS_DARK, CARD_BLACK, CARD_BLACK_LIT, CARD_RED,
  CARD_RED_DARK, CARD_RED_LIT, CHIP_BLACK, CHIP_BLUE, CHIP_RED, CHIP_WHITE, COOKIE, COOKIE_DARK, COOKIE_LIT, GILT,
  GILT_DARK, GILT_LIT, HEDGE, HEDGE_DARK, HEDGE_LIT, IVORY, IVORY_DARK, IVORY_SHADE, LAMP_GLASS, LAMP_GLASS_LIT,
  LAMP_LIGHT, MAHOGANY, MAHOGANY_DARK, MAHOGANY_LIT, MOTLEY_GREEN, MOTLEY_PURPLE, PAVE_BLACK, PAVE_BLACK_LIT, PAVE_RED,
  PAVE_RED_DARK, POND_LIT, STONE, STONE_DARK, STONE_LIT, TAROT_NIGHT, TAROT_VIOLET, TAROT_VIOLET_LIT,
} from './palette';
import { isRed, type Suit } from './util';

/**
 * Card Court set pieces — the shapes only a card-sharps' town has. Everything here is *dealt*:
 * houses are houses of cards, leaning A-frames of ivory faces and lattice backs, storey on storey,
 * roped to the baize and held down with paperweights; lamps wear green glass shades so a dealer
 * can see your hands; roads are red and black squares edged in gilt. Where something is the
 * House's — a Lot on a chain, a black chip — it is brass or black, and the eye goes straight to it.
 */

type Pts = Pt[];

/** A local → world transform for a rotated card or tile. */
function frame(cx: number, cy: number, ang: number): (u: number, v: number) => Pt {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return (u, v) => ({ x: cx + u * ca - v * sa, y: cy + u * sa + v * ca });
}

// ── Pips, cards, dice, chips ─────────────────────────────────────────

/** A suit pip centred on (x, y), `s` its half-height. */
export function pip(g: G, x: number, y: number, s: number, suit: Suit, color: number, a = 1): void {
  g.fillStyle(color, a);
  switch (suit) {
    case 'heart':
      g.fillCircle(x - s * 0.5, y - s * 0.28, s * 0.56);
      g.fillCircle(x + s * 0.5, y - s * 0.28, s * 0.56);
      g.fillTriangle(x - s * 1.04, y - s * 0.12, x + s * 1.04, y - s * 0.12, x, y + s);
      break;
    case 'diamond':
      g.fillPoints([{ x, y: y - s }, { x: x + s * 0.74, y }, { x, y: y + s }, { x: x - s * 0.74, y }], true);
      break;
    case 'spade':
      g.fillCircle(x - s * 0.5, y + s * 0.18, s * 0.54);
      g.fillCircle(x + s * 0.5, y + s * 0.18, s * 0.54);
      g.fillTriangle(x - s * 1.02, y + s * 0.06, x + s * 1.02, y + s * 0.06, x, y - s);
      g.fillTriangle(x, y + s * 0.2, x - s * 0.42, y + s, x + s * 0.42, y + s);
      break;
    case 'club':
      g.fillCircle(x, y - s * 0.46, s * 0.46);
      g.fillCircle(x - s * 0.5, y + s * 0.1, s * 0.46);
      g.fillCircle(x + s * 0.5, y + s * 0.1, s * 0.46);
      g.fillTriangle(x, y - s * 0.1, x - s * 0.4, y + s, x + s * 0.4, y + s);
      break;
  }
}

export const suitColor = (s: Suit): number => (isRed(s) ? CARD_RED : CARD_BLACK);

/** Pip positions for ranks 1–6, in units of the card's half-width / half-height. */
const LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[0, -0.5], [0, 0.5]],
  3: [[0, -0.56], [0, 0], [0, 0.56]],
  4: [[-0.42, -0.5], [0.42, -0.5], [-0.42, 0.5], [0.42, 0.5]],
  5: [[-0.42, -0.52], [0.42, -0.52], [0, 0], [-0.42, 0.52], [0.42, 0.52]],
  6: [[-0.42, -0.56], [0.42, -0.56], [-0.42, 0], [0.42, 0], [-0.42, 0.56], [0.42, 0.56]],
};

export interface CardOpts {
  /** Face up (pips) or face down (lattice back). */
  face: boolean;
  suit?: Suit;
  /** 1–6 pips; 0 draws a court card (a little crown over one big pip). */
  rank?: number;
  /** The back's colour (red lattice by default). */
  back?: number;
  /** A joker's face: a fool's cap with three bells. */
  joker?: boolean;
  alpha?: number;
  /** Fewer strokes for many small cards in flight. */
  cheap?: boolean;
}

/**
 * A playing card centred on (cx, cy), `w`×`h`, turned by `ang`. Ivory face with its pips and corner
 * indices, or a lattice back inside a white border; a thin dark edge either way.
 */
export function card(g: G, cx: number, cy: number, w: number, h: number, ang: number, o: CardOpts): void {
  const a = o.alpha ?? 1;
  const hw = w / 2, hh = h / 2;
  const P = frame(cx, cy, ang);
  const quad = (u0: number, v0: number, u1: number, v1: number): Pts => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  g.fillStyle(CARD_BLACK, 0.55 * a); g.fillPoints(quad(-hw - 1, -hh - 1, hw + 1, hh + 1), true);
  g.fillStyle(IVORY, a); g.fillPoints(quad(-hw, -hh, hw, hh), true);
  if (!o.face) {
    const back = o.back ?? CARD_RED;
    const ins = Math.max(1.5, w * 0.1);
    g.fillStyle(back, a); g.fillPoints(quad(-hw + ins, -hh + ins, hw - ins, hh - ins), true);
    if (!o.cheap) {
      // The lattice: a diamond grid in a lighter ink, and a centre medallion.
      const step = Math.max(4, w * 0.24);
      g.lineStyle(1, lit(back, 0.35), 0.7 * a);
      for (let u = -hw + ins; u <= hw - ins + 0.1; u += step) {
        const p0 = P(u, -hh + ins), p1 = P(Math.min(hw - ins, u + (hh - ins) * 2), hh - ins);
        g.lineBetween(p0.x, p0.y, p1.x, p1.y);
        const q0 = P(u, hh - ins), q1 = P(Math.min(hw - ins, u + (hh - ins) * 2), -hh + ins);
        g.lineBetween(q0.x, q0.y, q1.x, q1.y);
      }
      g.fillStyle(lit(back, 0.5), a); g.fillCircle(cx, cy, Math.min(hw, hh) * 0.32);
      g.fillStyle(back, a); g.fillCircle(cx, cy, Math.min(hw, hh) * 0.2);
    }
    return;
  }
  if (o.joker) {
    // A fool's cap: three floppy points in motley, a bell on each.
    const c = P(0, hh * 0.25);
    const s = Math.min(hw, hh);
    g.fillStyle(MOTLEY_PURPLE, a); g.fillTriangle(c.x - s * 0.7, c.y, c.x - s * 0.05, c.y, c.x - s * 0.85, c.y - s * 0.95);
    g.fillStyle(MOTLEY_GREEN, a); g.fillTriangle(c.x - s * 0.3, c.y, c.x + s * 0.3, c.y, c.x, c.y - s * 1.15);
    g.fillStyle(MOTLEY_PURPLE, a); g.fillTriangle(c.x + s * 0.05, c.y, c.x + s * 0.7, c.y, c.x + s * 0.85, c.y - s * 0.95);
    g.fillStyle(BELL, a);
    g.fillCircle(c.x - s * 0.85, c.y - s * 0.95, s * 0.14); g.fillCircle(c.x, c.y - s * 1.15, s * 0.14); g.fillCircle(c.x + s * 0.85, c.y - s * 0.95, s * 0.14);
    g.fillStyle(0xf0c8a8, a); g.fillCircle(c.x, c.y + s * 0.3, s * 0.34);
    g.fillStyle(CARD_RED, a); g.fillCircle(c.x, c.y + s * 0.34, s * 0.08);
    g.lineStyle(1, CARD_BLACK, a); g.beginPath(); g.arc(c.x, c.y + s * 0.32, s * 0.18, 0.3, Math.PI - 0.3, false); g.strokePath();
    return;
  }
  const suit = o.suit ?? 'spade';
  const col = suitColor(suit);
  const rank = o.rank ?? 1;
  const ps = Math.min(hw, hh) * (rank <= 1 ? 0.55 : rank <= 3 ? 0.3 : 0.26);
  if (rank === 0) {
    // A court card: a gilt crown over one big pip, a frame line round the picture.
    const fr = quad(-hw * 0.7, -hh * 0.72, hw * 0.7, hh * 0.72);
    g.lineStyle(1, col, 0.6 * a); g.strokePoints(fr, true);
    const c = P(0, -hh * 0.3);
    g.fillStyle(GILT, a);
    g.fillRect(c.x - hw * 0.4, c.y, hw * 0.8, hh * 0.12);
    for (const k of [-1, 0, 1]) g.fillTriangle(c.x + k * hw * 0.3 - hw * 0.12, c.y, c.x + k * hw * 0.3 + hw * 0.12, c.y, c.x + k * hw * 0.3, c.y - hh * 0.2);
    const m = P(0, hh * 0.18);
    pip(g, m.x, m.y, Math.min(hw, hh) * 0.36, suit, col, a);
  } else {
    for (const [u, v] of LAYOUT[Math.max(1, Math.min(6, rank))]) {
      const p = P(u * hw, v * hh);
      pip(g, p.x, p.y, ps, suit, col, a);
    }
  }
  if (!o.cheap && w > 16) {
    // Corner indices: a tiny pip in two corners.
    const tl = P(-hw * 0.7, -hh * 0.72), br = P(hw * 0.7, hh * 0.72);
    pip(g, tl.x, tl.y, Math.max(1.4, w * 0.07), suit, col, a);
    pip(g, br.x, br.y, Math.max(1.4, w * 0.07), suit, col, a);
  }
}

/**
 * A leaning card seen from the front: a skewed quad from a base edge up to an apex edge, face or
 * back showing. The A-frames of a house of cards are made of these.
 */
function leanCard(g: G, bx: number, by: number, ax: number, ay: number, cw: number, face: boolean, suit: Suit, back: number, shade: number): void {
  const pts: Pts = [{ x: bx - cw / 2, y: by }, { x: bx + cw / 2, y: by }, { x: ax + cw / 2, y: ay }, { x: ax - cw / 2, y: ay }];
  g.fillStyle(CARD_BLACK, 0.6); g.fillPoints(pts.map((p) => ({ x: p.x + 1, y: p.y + 1 })), true);
  g.fillStyle(dim(IVORY, shade), 1); g.fillPoints(pts, true);
  const mx = (bx + ax) / 2, my = (by + ay) / 2;
  if (face) {
    pip(g, mx, my, cw * 0.22, suit, dim(suitColor(suit), shade * 0.6));
    pip(g, bx + (ax - bx) * 0.15, by + (ay - by) * 0.12, cw * 0.09, suit, dim(suitColor(suit), shade * 0.6));
  } else {
    const k = 0.14;
    const inner: Pts = [
      { x: bx - cw / 2 + cw * k + (ax - bx) * k, y: by + (ay - by) * k },
      { x: bx + cw / 2 - cw * k + (ax - bx) * k, y: by + (ay - by) * k },
      { x: ax + cw / 2 - cw * k - (ax - bx) * k, y: ay - (ay - by) * k },
      { x: ax - cw / 2 + cw * k - (ax - bx) * k, y: ay - (ay - by) * k },
    ];
    g.fillStyle(dim(back, shade), 1); g.fillPoints(inner, true);
    g.lineStyle(1, lit(back, 0.3), 0.6);
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      g.lineBetween(inner[0].x + (inner[3].x - inner[0].x) * t, inner[0].y + (inner[3].y - inner[0].y) * t, inner[1].x + (inner[2].x - inner[1].x) * t, inner[1].y + (inner[2].y - inner[1].y) * t);
    }
  }
}

/** One ivory die, a top face with pips and a shaded front, `s` its half-size, turned by `ang`. */
export function die(g: G, x: number, y: number, s: number, face: number, ang = 0, a = 1): void {
  const P = frame(x, y, ang);
  const q = (r: number): Pts => [P(-r, -r), P(r, -r), P(r, r), P(-r, r)];
  g.fillStyle(0x000000, 0.25 * a); g.fillEllipse(x + 2, y + s * 1.05, s * 2.3, s * 0.7);
  // The front face below the top, then the top.
  g.fillStyle(IVORY_DARK, a); g.fillRoundedRect(x - s, y - s * 0.6, s * 2, s * 1.9, s * 0.35);
  g.fillStyle(IVORY_SHADE, a); g.fillPoints(q(s), true);
  g.fillStyle(IVORY, a); g.fillPoints(q(s * 0.88), true);
  g.fillStyle(0xffffff, 0.5 * a); g.fillCircle(P(-s * 0.5, -s * 0.5).x, P(-s * 0.5, -s * 0.5).y, s * 0.18);
  const spots: Record<number, [number, number][]> = {
    1: [[0, 0]], 2: [[-0.5, -0.5], [0.5, 0.5]], 3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]],
    4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
    5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
    6: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0], [0.5, 0], [-0.5, 0.55], [0.5, 0.55]],
  };
  for (const [u, v] of spots[Math.max(1, Math.min(6, face))]) {
    const p = P(u * s, v * s);
    g.fillStyle(face === 1 ? CARD_RED : CARD_BLACK, a); g.fillCircle(p.x, p.y, s * (face === 1 ? 0.26 : 0.16));
  }
}

/** A gaming chip seen from above: rim, edge spots, inlay ring. */
export function chip(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.fillStyle(dim(color, 0.35), a); g.fillEllipse(x, y + r * 0.18, r * 2, r * 1.3);
  g.fillStyle(color, a); g.fillEllipse(x, y, r * 2, r * 1.3);
  g.fillStyle(color === CHIP_WHITE ? CARD_RED : CHIP_WHITE, 0.9 * a);
  for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; g.fillEllipse(x + Math.cos(t) * r * 0.82, y + Math.sin(t) * r * 0.53, r * 0.3, r * 0.2); }
  g.lineStyle(1, lit(color, 0.4), 0.8 * a); g.strokeEllipse(x, y, r * 1.2, r * 0.78);
}

/** A stack of chips, `n` high, the top one showing its face. */
export function chipStack(g: G, x: number, y: number, n: number, r: number, color: number): void {
  shadow(g, x, y + 2, r * 2.6, r * 0.9, 0.25);
  for (let i = 0; i < n; i++) {
    const yy = y - i * r * 0.36;
    g.fillStyle(dim(color, 0.3), 1); g.fillEllipse(x, yy + r * 0.15, r * 2, r * 1.2);
    g.fillStyle(i % 2 ? color : lit(color, 0.1), 1); g.fillRect(x - r, yy - r * 0.05, r * 2, r * 0.22);
    g.fillStyle(CHIP_WHITE, 0.8); g.fillRect(x - r * 0.15, yy - r * 0.05, r * 0.3, r * 0.22);
  }
  chip(g, x, y - n * r * 0.36, r, color);
}

/** A brass Lot on its chain: the token every child is given at birth. */
export function lotToken(g: G, x: number, y: number, r: number, black = false): void {
  g.lineStyle(1, black ? 0x444448 : BRASS_DARK, 0.9);
  g.beginPath(); g.arc(x, y - r * 2.2, r * 1.6, 0.4, Math.PI - 0.4, false); g.strokePath();
  if (black) { chip(g, x, y, r, CHIP_BLACK); return; }
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y + 0.6, r);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r);
  g.lineStyle(1, BRASS_DARK, 1); g.strokeCircle(x, y, r * 0.62);
  g.fillStyle(lit(BRASS, 0.5), 0.8); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.22);
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * Baize lawn: a felt green with its nap brushed one way (long pale streaks), the odd chalk mark and
 * a scatter of dark tufts where it has been trodden.
 */
export function baizeNap(g: G, r: Rect, rng: () => number, density = 1): void {
  g.fillStyle(BAIZE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  // Broad brushed bands.
  for (let y = r.y; y < r.y + r.h; y += 46) {
    g.fillStyle(BAIZE_LIT, 0.18 + ((y / 46) % 2) * 0.08); g.fillRect(r.x, y, r.w, 22);
  }
  const n = Math.round((r.w * r.h) / 900 * density);
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.55) { g.lineStyle(1, BAIZE_LIT, 0.35); g.lineBetween(x, y, x + 8 + rng() * 10, y - 1); }
    else if (k < 0.9) { g.fillStyle(BAIZE_DARK, 0.45); g.fillRect(x, y, 2, 1.5); }
    else { g.fillStyle(0xf0f4e8, 0.25); g.fillRect(x, y, 3, 1); }
  }
}

/** Red-and-black chequer paving in squares of `size`, with a gilt kerb and dark grout. */
export function chequerPave(g: G, r: Rect, size: number, rng: () => number): void {
  g.fillStyle(PAVE_BLACK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y, j = 0; y < r.y + r.h; y += size, j++) {
    for (let x = r.x, i = 0; x < r.x + r.w; x += size, i++) {
      const red = (i + j) % 2 === 0;
      const w = Math.min(size, r.x + r.w - x), h = Math.min(size, r.y + r.h - y);
      g.fillStyle(red ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle(red ? lit(PAVE_RED, 0.12) : PAVE_BLACK_LIT, 0.5); g.fillRect(x + 1, y + 1, w - 2, 2);
      if (rng() < 0.08) { g.fillStyle(red ? PAVE_RED_DARK : 0x101014, 0.6); g.fillRect(x + 3 + rng() * (w - 8), y + 3 + rng() * (h - 8), 4, 2); }
    }
  }
  g.lineStyle(3, GILT_DARK, 1); g.strokeRect(r.x, r.y, r.w, r.h);
  g.lineStyle(1.5, GILT, 1); g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
}

/** A suit inlaid in gilt in the paving. */
export function suitInlay(g: G, x: number, y: number, s: number, suit: Suit, a = 0.85): void {
  pip(g, x, y + 1.5, s + 2, suit, GILT_DARK, a);
  pip(g, x, y, s, suit, GILT, a);
  pip(g, x - s * 0.15, y - s * 0.2, s * 0.35, suit, GILT_LIT, a * 0.6);
}

// ── Lamps, hedges, tables ────────────────────────────────────────────

/** A street lamp on a black post: a green banker's shade with a gilt rim and a pull-chain. */
export function greenLamp(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 24 * s, 7 * s, 0.3);
  g.fillStyle(CARD_BLACK, 1); g.fillRect(x - 3 * s, y - 70 * s, 6 * s, 70 * s);
  g.fillStyle(CARD_BLACK_LIT, 1); g.fillRect(x - 2 * s, y - 70 * s, 1.5 * s, 70 * s);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 7 * s, y - 6 * s, 14 * s, 6 * s);
  // The arm and the shade.
  g.lineStyle(2.5 * s, CARD_BLACK, 1); g.lineBetween(x, y - 68 * s, x + 14 * s, y - 74 * s);
  const sx = x + 14 * s, sy = y - 72 * s;
  g.fillStyle(LAMP_LIGHT, 0.35); g.fillTriangle(sx - 10 * s, sy + 6 * s, sx + 10 * s, sy + 6 * s, sx, sy + 30 * s);
  g.fillStyle(dim(LAMP_GLASS, 0.25), 1); g.fillPoints([{ x: sx - 13 * s, y: sy + 6 * s }, { x: sx + 13 * s, y: sy + 6 * s }, { x: sx + 7 * s, y: sy - 4 * s }, { x: sx - 7 * s, y: sy - 4 * s }], true);
  g.fillStyle(LAMP_GLASS, 1); g.fillPoints([{ x: sx - 12 * s, y: sy + 5 * s }, { x: sx + 12 * s, y: sy + 5 * s }, { x: sx + 6 * s, y: sy - 3 * s }, { x: sx - 6 * s, y: sy - 3 * s }], true);
  g.fillStyle(LAMP_GLASS_LIT, 0.7); g.fillRect(sx - 6 * s, sy - 1 * s, 4 * s, 4 * s);
  g.fillStyle(GILT, 1); g.fillRect(sx - 13 * s, sy + 5 * s, 26 * s, 2 * s);
  g.fillStyle(LAMP_LIGHT, 1); g.fillEllipse(sx, sy + 7 * s, 8 * s, 3 * s);
  g.lineStyle(1, GILT, 1); g.lineBetween(sx + 8 * s, sy + 6 * s, sx + 8 * s, sy + 14 * s);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(sx + 8 * s, sy + 15 * s, 1.6 * s);
}

/** Where a green lamp's light lands — for `animate` (soft pool, flickering a touch). */
export function lampPool(g: G, x: number, y: number, s: number, t: number, seed: number): void {
  const f = 0.85 + Math.sin(t * 7 + seed) * 0.05 + Math.sin(t * 13 + seed * 2) * 0.04;
  g.fillStyle(LAMP_LIGHT, 0.05 * f); g.fillEllipse(x + 14 * s, y + 2, 70 * s, 26 * s);
  g.fillStyle(LAMP_LIGHT, 0.06 * f); g.fillEllipse(x + 14 * s, y + 2, 40 * s, 14 * s);
  glow(g, x + 14 * s, y - 64 * s, 12 * s, LAMP_GLASS_LIT, 0.07 * f, 3);
}

/** A box hedge seen from the front: flat-topped, clipped, a run of `w` from `x0`, base at `y`. */
export function boxHedge(g: G, x0: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x0 + w / 2, y + 2, w + 10, 14, 0.25);
  g.fillStyle(HEDGE_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(HEDGE, 1); g.fillRect(x0 + 2, y - h, w - 4, h - 4);
  g.fillStyle(HEDGE_LIT, 1); g.fillRect(x0 + 2, y - h, w - 4, 8);
  g.fillStyle(lit(HEDGE_LIT, 0.15), 0.6); g.fillRect(x0 + 2, y - h, w - 4, 2);
  for (let i = 0; i < w / 5; i++) {
    const px = x0 + 4 + rng() * (w - 8), py = y - h + 10 + rng() * (h - 16);
    g.fillStyle(rng() < 0.5 ? HEDGE_DARK : HEDGE_LIT, 0.55); g.fillRect(px, py, 3, 2);
  }
}

/**
 * Suit-topiary: a hedge clipped into a heart, spade, diamond or club on a short trunk, standing in
 * a gilt-banded tub. Shading in three greens; a thin gilt wire shows where the shears follow.
 */
export function suitTopiary(g: G, x: number, y: number, suit: Suit, s = 1): void {
  shadow(g, x, y + 2, 40 * s, 12 * s, 0.3);
  // The tub.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x - 13 * s, y - 18 * s, 26 * s, 18 * s);
  g.fillStyle(MAHOGANY, 1); g.fillRect(x - 12 * s, y - 18 * s, 24 * s, 16 * s);
  g.fillStyle(GILT, 1); g.fillRect(x - 13 * s, y - 18 * s, 26 * s, 3 * s); g.fillRect(x - 13 * s, y - 7 * s, 26 * s, 2 * s);
  g.fillStyle(CARD_BLACK, 1); g.fillRect(x - 2 * s, y - 32 * s, 4 * s, 14 * s);
  const cy = y - 52 * s, r = 22 * s;
  pip(g, x + 1.5 * s, cy + 2 * s, r, suit, HEDGE_DARK);
  pip(g, x, cy, r, suit, HEDGE);
  pip(g, x - 4 * s, cy - 4 * s, r * 0.55, suit, HEDGE_LIT, 0.8);
  // Leaf texture: nicks across the face.
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39, d = r * 0.6 * ((i % 4) / 4 + 0.25);
    g.fillStyle(i % 2 ? HEDGE_DARK : lit(HEDGE_LIT, 0.1), 0.6); g.fillRect(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 2.5 * s, 1.5 * s);
  }
}

/**
 * An outdoor card table: an oval of baize in a mahogany rail on turned legs, four chairs, a hand
 * dealt, chips stacked by each place, a deck at the dealer's elbow.
 */
export function cardTable(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 120 * s, 30 * s, 0.3);
  const chair = (cx: number, cy: number, back: boolean) => {
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(cx - 7 * s, cy - 4 * s, 14 * s, 6 * s);
    g.fillStyle(CARD_RED_DARK, 1); g.fillRect(cx - 7 * s, cy - 8 * s, 14 * s, 5 * s);
    if (back) { g.fillStyle(MAHOGANY, 1); g.fillRect(cx - 7 * s, cy - 22 * s, 14 * s, 14 * s); g.fillStyle(CARD_RED, 1); g.fillRect(cx - 5 * s, cy - 20 * s, 10 * s, 9 * s); }
  };
  chair(x - 30 * s, y - 34 * s, true);
  chair(x + 30 * s, y - 34 * s, true);
  // Legs.
  for (const k of [-1, 1]) { g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + k * 34 * s - 2 * s, y - 14 * s, 4 * s, 14 * s); }
  // The top.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillEllipse(x, y - 14 * s, 104 * s, 40 * s);
  g.fillStyle(MAHOGANY, 1); g.fillEllipse(x, y - 17 * s, 104 * s, 38 * s);
  g.fillStyle(MAHOGANY_LIT, 0.6); g.fillEllipse(x, y - 21 * s, 96 * s, 30 * s);
  g.fillStyle(BAIZE_DARK, 1); g.fillEllipse(x, y - 18 * s, 86 * s, 28 * s);
  g.fillStyle(BAIZE, 1); g.fillEllipse(x, y - 19 * s, 82 * s, 25 * s);
  g.lineStyle(1, GILT, 0.6); g.strokeEllipse(x, y - 19 * s, 60 * s, 16 * s);
  // A hand dealt, chips, the deck.
  for (let i = 0; i < 4; i++) card(g, x - 16 * s + i * 7 * s, y - 20 * s, 7 * s, 10 * s, -0.3 + i * 0.2, { face: i !== 1, suit: (['heart', 'spade', 'club', 'diamond'] as Suit[])[i], rank: 1 + (i % 3), cheap: true });
  chip(g, x + 22 * s, y - 22 * s, 4 * s, [CHIP_RED, CHIP_BLUE, CHIP_WHITE][Math.floor(rng() * 3)]);
  chip(g, x + 27 * s, y - 17 * s, 4 * s, CHIP_RED);
  g.fillStyle(CARD_RED_DARK, 1); g.fillRect(x - 32 * s, y - 24 * s, 9 * s, 7 * s);
  g.fillStyle(CARD_RED, 1); g.fillRect(x - 32 * s, y - 26 * s, 9 * s, 6 * s);
  chair(x - 40 * s, y + 6 * s, false);
  chair(x + 40 * s, y + 6 * s, false);
}

// ── Houses of cards ──────────────────────────────────────────────────

export type Weight = 'dome' | 'bar' | 'die';

/**
 * A paperweight: a millefiori glass dome, a brass bar weight with a lifting ring, or a great
 * ivory die. Set on the apex of a card-house, roped down to pegs, so the wind does not take it.
 */
export function paperweight(g: G, x: number, y: number, s: number, kind: Weight): void {
  if (kind === 'dome') {
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y, 30 * s, 7 * s);
    g.fillStyle(0x9ad8d0, 0.5); g.fillEllipse(x, y - 11 * s, 30 * s, 26 * s);
    // Millefiori: rings of tiny canes inside the glass.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, d = 7 * s;
      g.fillStyle([CARD_RED, GILT, CHIP_BLUE, IVORY][i % 4], 0.9); g.fillCircle(x + Math.cos(a) * d, y - 9 * s + Math.sin(a) * d * 0.55, 2 * s);
    }
    g.fillStyle(CARD_RED_LIT, 1); g.fillCircle(x, y - 9 * s, 2.6 * s);
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - 6 * s, y - 17 * s, 8 * s, 5 * s);
    g.lineStyle(1, 0xd8fff8, 0.6); g.strokeEllipse(x, y - 11 * s, 30 * s, 26 * s);
  } else if (kind === 'bar') {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 18 * s, y - 12 * s, 36 * s, 12 * s);
    g.fillStyle(BRASS, 1); g.fillRect(x - 17 * s, y - 13 * s, 34 * s, 9 * s);
    g.fillStyle(lit(BRASS, 0.4), 1); g.fillRect(x - 17 * s, y - 13 * s, 34 * s, 2 * s);
    g.lineStyle(2.5 * s, BRASS_DARK, 1); g.strokeCircle(x, y - 19 * s, 6 * s);
    g.lineStyle(1.2 * s, lit(BRASS, 0.3), 1); g.strokeCircle(x, y - 19.5 * s, 5.5 * s);
    // Stamped weight mark: a little spade.
    pip(g, x, y - 8.5 * s, 3 * s, 'spade', BRASS_DARK);
  } else {
    die(g, x, y - 12 * s, 12 * s, 6, 0.2);
  }
}

/**
 * A giant house of cards: storeys of A-frames, each pair of leaning cards meeting at an apex, a
 * flat card laid across each storey as its floor, and a pyramid narrowing to one frame at the top.
 * Faces and lattice backs alternate; windows in the triangles glow lamp-green; the ground-floor
 * door is a mahogany one let into a triangle. A paperweight sits on the apex, roped to pegs.
 * Returns the door point.
 */
export function cardHouse(g: G, x: number, y: number, w: number, storeys: number, rng: () => number, weight: Weight = 'dome', back = CARD_RED): Pt {
  shadow(g, x, y + 4, w * 1.1, w * 0.22, 0.32);
  const sh = w * 0.38;
  const suits: Suit[] = ['heart', 'spade', 'diamond', 'club'];
  const frames0 = Math.max(storeys, 3);
  let apexY = y;
  for (let k = 0; k < storeys; k++) {
    const nf = Math.max(1, frames0 - k);
    const fw = w / frames0;
    const span = nf * fw;
    const x0 = x - span / 2;
    const by = y - k * sh;
    const ty = by - sh + 4;
    const cw = fw * 0.24;
    for (let f = 0; f < nf; f++) {
      const fx0 = x0 + f * fw + cw * 0.5, fx1 = x0 + (f + 1) * fw - cw * 0.5, ax = x0 + (f + 0.5) * fw;
      // The window (or the door) in the triangle, then the two leaning cards over it.
      const doorHere = k === 0 && f === Math.floor(nf / 2);
      if (doorHere) {
        g.fillStyle(MAHOGANY_DARK, 1); g.fillTriangle(ax - fw * 0.24, by, ax + fw * 0.24, by, ax, by - sh * 0.62);
        g.fillStyle(MAHOGANY, 1); g.fillTriangle(ax - fw * 0.2, by, ax + fw * 0.2, by, ax, by - sh * 0.56);
        g.fillStyle(GILT, 1); g.fillCircle(ax + fw * 0.07, by - sh * 0.18, 1.8);
      } else {
        g.fillStyle(dim(IVORY, 0.55), 1); g.fillTriangle(ax - fw * 0.3, by, ax + fw * 0.3, by, ax, by - sh * 0.8);
        const lampOn = rng() < 0.7;
        g.fillStyle(lampOn ? LAMP_GLASS_LIT : dim(LAMP_GLASS, 0.5), lampOn ? 0.75 : 0.6);
        g.fillTriangle(ax - fw * 0.14, by - sh * 0.18, ax + fw * 0.14, by - sh * 0.18, ax, by - sh * 0.52);
        g.lineStyle(1, MAHOGANY_DARK, 1); g.lineBetween(ax, by - sh * 0.18, ax, by - sh * 0.5);
      }
      const s0 = suits[(k * 3 + f) % 4], s1 = suits[(k * 3 + f + 1) % 4];
      leanCard(g, fx0, by, ax - cw * 0.35, ty, cw, (f + k) % 2 === 0, s0, back, 0.04);
      leanCard(g, fx1, by, ax + cw * 0.35, ty, cw, (f + k) % 2 === 1, s1, back, 0.16);
    }
    // The floor card across the top of the storey.
    if (k < storeys - 1) {
      const fl = span - fw * 0.5;
      g.fillStyle(CARD_BLACK, 0.5); g.fillRect(x - fl / 2, ty - 3, fl, 6);
      g.fillStyle(IVORY_SHADE, 1); g.fillRect(x - fl / 2, ty - 4, fl, 5);
      g.fillStyle(IVORY, 1); g.fillRect(x - fl / 2, ty - 4, fl, 2);
      for (let i = 0; i < fl / 30; i++) pip(g, x - fl / 2 + 14 + i * 30, ty - 1.5, 1.8, suits[i % 4], suitColor(suits[i % 4]), 0.8);
    }
    apexY = ty;
  }
  // A rolled-card chimney on the top frame, its smoke drawn in animate.
  g.fillStyle(IVORY_SHADE, 1); g.fillRect(x + w * 0.06, apexY - 2, 7, 12);
  g.fillStyle(back, 1); g.fillRect(x + w * 0.06 + 1, apexY + 2, 5, 3);
  // The paperweight and its ropes.
  for (const k of [-1, 1]) {
    g.lineStyle(1.2, 0xe8dcc0, 0.8);
    g.lineBetween(x + k * 6, apexY - 6, x + k * w * 0.62, y + 2);
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + k * w * 0.62 - 2, y - 3, 4, 7);
  }
  paperweight(g, x, apexY, Math.max(0.7, w / 170), weight);
  // A brass house-number Lot nailed by the door.
  lotToken(g, x + w * 0.2, y - 18, 4);
  return { x, y: y + 16 };
}

/** A card-house's chimney smoke and a loose card flapping on it — `animate`. */
export function cardHouseLife(g: G, x: number, y: number, w: number, storeys: number, t: number, seed: number): void {
  const sh = w * 0.38;
  const top = y - storeys * sh + 4;
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.25 + i / 4 + seed) % 1;
    g.fillStyle(0xd8d8d0, 0.22 * (1 - ph)); g.fillCircle(x + w * 0.06 + 3 + ph * 18 + Math.sin(t + i) * 3, top - 8 - ph * 40, 4 + ph * 7);
  }
  // A loose card on the second storey, lifting in the wind.
  const fx = x - w * 0.3, fy = y - sh * 1.2;
  const lift = Math.max(0, Math.sin(t * 1.3 + seed * 9)) * 0.5;
  card(g, fx, fy, 10, 14, -0.4 - lift, { face: false, cheap: true });
}

// ── The Dealing Hall ─────────────────────────────────────────────────

/**
 * Prince Ante's Dealing Hall: a mahogany hall on a cream plinth, tall arched windows lit green,
 * gilt pilasters capped with ivory dice, and over it all — instead of a roof — a single enormous
 * green-glass banker's lamp shade with a gilt rim, a brass finial and a pull-chain as long as a
 * man. Over the doors a gilt cartouche carries the four suits; a dealer's shoe stands on the step.
 */
export function dealingHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): Pt {
  shadow(g, x, y + 8, w * 1.1, 40);
  const x0 = x - w / 2;
  // Plinth and steps.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 14, y - 26, w + 28, 26);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 12, y - 28, w + 24, 20);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 12, y - 28, w + 24, 3);
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x - 64 - k * 8, y - 10 + k * 4, 128 + k * 16, 5); }
  const wallTop = y - 28 - h;
  // Walls: mahogany panels.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x0, wallTop, w, h);
  g.fillStyle(MAHOGANY, 1); g.fillRect(x0 + 3, wallTop + 3, w - 6, h - 6);
  for (let py = wallTop + 8; py < y - 34; py += 18) { g.lineStyle(1, MAHOGANY_LIT, 0.35); g.lineBetween(x0 + 4, py, x0 + w - 4, py); }
  // Arched windows between gilt pilasters.
  const bays = 6;
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + i * bw + bw / 2;
    if (Math.abs(bx - x) < bw * 0.8) continue;
    const wy = wallTop + h * 0.18, wh = h * 0.6;
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(bx - bw * 0.3 - 2, wy - 2, bw * 0.6 + 4, wh + 4);
    g.fillStyle(dim(LAMP_GLASS, 0.3), 1); g.fillRect(bx - bw * 0.3, wy, bw * 0.6, wh);
    g.fillStyle(LAMP_GLASS_LIT, 0.55); g.fillRect(bx - bw * 0.3, wy + wh * 0.35, bw * 0.6, wh * 0.65);
    g.beginPath(); g.fillStyle(dim(LAMP_GLASS, 0.3), 1); g.arc(bx, wy, bw * 0.3, Math.PI, 0, false); g.fillPath();
    g.lineStyle(2, GILT, 1); g.beginPath(); g.arc(bx, wy, bw * 0.3, Math.PI, 0, false); g.strokePath();
    g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(bx, wy - bw * 0.3, bx, wy + wh); g.lineBetween(bx - bw * 0.3, wy + wh * 0.4, bx + bw * 0.3, wy + wh * 0.4);
    // Silhouettes at the tables inside: a dealer's visor, a player's hat.
    if (rng() < 0.7) {
      g.fillStyle(0x0a1a10, 0.6); g.fillCircle(bx - 4, wy + wh * 0.62, 5); g.fillRect(bx - 9, wy + wh * 0.62 + 4, 10, 12);
      g.fillStyle(LAMP_GLASS, 0.8); g.fillRect(bx - 9, wy + wh * 0.62 - 4, 10, 2);
    }
  }
  for (let i = 0; i <= bays; i++) {
    const px = x0 + i * bw;
    g.fillStyle(GILT_DARK, 1); g.fillRect(px - 5, wallTop, 10, h);
    g.fillStyle(GILT, 1); g.fillRect(px - 3, wallTop, 6, h);
    g.fillStyle(GILT_LIT, 0.6); g.fillRect(px - 3, wallTop, 1.5, h);
  }
  // Cornice.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x0 - 10, wallTop - 10, w + 20, 12);
  g.fillStyle(GILT, 1); g.fillRect(x0 - 10, wallTop - 12, w + 20, 6);
  for (let cx = x0 - 6; cx < x0 + w + 6; cx += 16) pip(g, cx + 8, wallTop - 3, 2.4, (['spade', 'heart', 'club', 'diamond'] as Suit[])[Math.floor((cx - x0) / 16 + 8) % 4], GILT_DARK);
  // Dice on the corner pilasters.
  die(g, x0, wallTop - 26, 13, 6, 0.1);
  die(g, x0 + w, wallTop - 26, 13, 1, -0.1);
  // The great lamp shade over the hall.
  const sw = w * 0.86, sh = h * 0.95;
  const sTop = wallTop - 14 - sh;
  g.fillStyle(LAMP_LIGHT, 0.12); g.fillEllipse(x, wallTop - 10, sw * 1.05, 34);
  g.fillStyle(dim(LAMP_GLASS, 0.45), 1);
  g.fillPoints([{ x: x - sw / 2 - 6, y: wallTop - 12 }, { x: x + sw / 2 + 6, y: wallTop - 12 }, { x: x + sw * 0.26, y: sTop }, { x: x - sw * 0.26, y: sTop }], true);
  g.fillStyle(LAMP_GLASS, 1);
  g.fillPoints([{ x: x - sw / 2, y: wallTop - 14 }, { x: x + sw / 2, y: wallTop - 14 }, { x: x + sw * 0.24, y: sTop + 2 }, { x: x - sw * 0.24, y: sTop + 2 }], true);
  // Leaded seams and a long highlight down the glass.
  g.lineStyle(1.5, dim(LAMP_GLASS, 0.5), 0.8);
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    g.lineBetween(x - sw / 2 + sw * t, wallTop - 14, x - sw * 0.24 + sw * 0.48 * t, sTop + 2);
  }
  g.lineBetween(x - sw * 0.38, wallTop - 14 - sh * 0.5, x + sw * 0.38, wallTop - 14 - sh * 0.5);
  g.fillStyle(LAMP_GLASS_LIT, 0.45);
  g.fillPoints([{ x: x - sw * 0.36, y: wallTop - 16 }, { x: x - sw * 0.3, y: wallTop - 16 }, { x: x - sw * 0.16, y: sTop + 4 }, { x: x - sw * 0.19, y: sTop + 4 }], true);
  // Gilt rims top and bottom, the finial and the chain.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - sw / 2 - 6, wallTop - 16, sw + 12, 6);
  g.fillStyle(GILT, 1); g.fillRect(x - sw / 2 - 6, wallTop - 17, sw + 12, 3);
  g.fillStyle(GILT, 1); g.fillRect(x - sw * 0.25, sTop - 2, sw * 0.5, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 8, sTop - 22, 16, 20);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, sTop - 22, 12, 18);
  g.fillStyle(GILT, 1); g.fillCircle(x, sTop - 26, 7);
  pip(g, x, sTop - 26, 4, 'diamond', CARD_RED);
  g.lineStyle(1.5, GILT, 1); g.lineBetween(x + sw * 0.18, sTop + 6, x + sw * 0.2, wallTop - 12);
  for (let k = 0; k < 6; k++) { g.fillStyle(GILT_LIT, 1); g.fillCircle(x + sw * 0.18 + k * 0.6, sTop + 10 + k * ((wallTop - sTop - 22) / 6), 1.4); }
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x + sw * 0.2, wallTop - 10, 3);
  // The doors: double, mahogany, with a cartouche of the four suits above.
  const dh = h * 0.72;
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 40, y - 28 - dh, 80, dh);
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x - 36, y - 28 - dh + 4, 72, dh - 4);
  g.fillStyle(LAMP_GLASS_LIT, 0.35); g.fillRect(x - 30, y - 28 - dh + 10, 26, dh * 0.4); g.fillRect(x + 4, y - 28 - dh + 10, 26, dh * 0.4);
  g.lineStyle(2, GILT, 1); g.lineBetween(x, y - 28 - dh + 4, x, y - 28);
  g.fillStyle(GILT, 1); g.fillCircle(x - 5, y - 28 - dh * 0.4, 2.5); g.fillCircle(x + 5, y - 28 - dh * 0.4, 2.5);
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y - 28 - dh - 14, 110, 30);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 28 - dh - 15, 104, 26);
  g.fillStyle(IVORY, 1); g.fillEllipse(x, y - 28 - dh - 15, 88, 18);
  (['spade', 'heart', 'club', 'diamond'] as Suit[]).forEach((s, i) => pip(g, x - 30 + i * 20, y - 28 - dh - 15, 6, s, suitColor(s)));
  // A dealer's shoe on the step, and chips dropped beside it.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + 76, y - 22, 26, 12);
  g.fillStyle(MAHOGANY, 1); g.fillPoints([{ x: x + 76, y: y - 22 }, { x: x + 102, y: y - 22 }, { x: x + 102, y: y - 30 }, { x: x + 84, y: y - 30 }], true);
  card(g, x + 80, y - 26, 6, 8, -0.6, { face: false, cheap: true });
  chip(g, x - 92, y - 8, 4, CHIP_RED); chip(g, x - 84, y - 5, 4, CHIP_BLUE);
  return { x, y: y + 16 };
}

/** The Dealing Hall's lamp, breathing: the shade's glow and a column of light under it. */
export function hallLampGlow(g: G, x: number, y: number, w: number, h: number, t: number): void {
  const wallTop = y - 28 - h;
  const f = 0.8 + Math.sin(t * 1.3) * 0.1 + Math.sin(t * 5.1) * 0.04;
  glow(g, x, wallTop - 30, w * 0.4, LAMP_GLASS_LIT, 0.035 * f, 4);
  g.fillStyle(LAMP_LIGHT, 0.08 * f); g.fillEllipse(x, y + 30, 220, 50);
}

// ── The Shuffling Mill ───────────────────────────────────────────────

/**
 * The Shuffling Mill: a timber tower on a brick base where the House's decks are shuffled by the
 * cartload. A hopper of uncut decks on the roof, a pair of great riffle drums on the front face
 * (their cards drawn turning in `millRiffle`), a chute spilling shuffled decks onto a belt into
 * crates, and at its side a treadwheel walked by busted croupiers with black chips on their chains.
 */
export function shuffleMill(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 8, 380, 50);
  // Brick base.
  g.fillStyle(0x5a2a22, 1); g.fillRect(x - 130, y - 70, 260, 70);
  for (let by = y - 70; by < y; by += 10) {
    for (let bx = x - 130 + ((by / 10) % 2) * 10; bx < x + 130; bx += 20) {
      g.fillStyle(rng() < 0.5 ? 0x7a3a2e : 0x6a3226, 1); g.fillRect(bx + 1, by + 1, 18, 8);
    }
  }
  // The arch the belt comes out of.
  g.fillStyle(0x1a0e0a, 1); g.fillRect(x + 60, y - 46, 50, 46);
  g.beginPath(); g.fillStyle(0x1a0e0a, 1); g.arc(x + 85, y - 46, 25, Math.PI, 0, false); g.fillPath();
  // Timber tower.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillPoints([{ x: x - 112, y: y - 70 }, { x: x + 112, y: y - 70 }, { x: x + 90, y: y - 290 }, { x: x - 90, y: y - 290 }], true);
  g.fillStyle(MAHOGANY, 1); g.fillPoints([{ x: x - 106, y: y - 72 }, { x: x + 106, y: y - 72 }, { x: x + 86, y: y - 286 }, { x: x - 86, y: y - 286 }], true);
  for (let k = 0; k < 14; k++) {
    const t = k / 14;
    const yy = y - 72 - t * 214, hw = 106 - t * 20;
    g.lineStyle(1, MAHOGANY_DARK, 0.7); g.lineBetween(x - hw, yy, x + hw, yy);
  }
  // Cross-bracing.
  g.lineStyle(4, MAHOGANY_DARK, 1);
  g.lineBetween(x - 104, y - 80, x + 88, y - 280); g.lineBetween(x + 104, y - 80, x - 88, y - 280);
  // Roof and hopper of uncut decks.
  g.fillStyle(CARD_BLACK, 1); g.fillTriangle(x - 110, y - 286, x + 110, y - 286, x, y - 340);
  g.fillStyle(CARD_BLACK_LIT, 1); g.fillTriangle(x - 104, y - 288, x, y - 288, x, y - 336);
  g.fillStyle(MAHOGANY_DARK, 1); g.fillPoints([{ x: x - 40, y: y - 330 }, { x: x + 40, y: y - 330 }, { x: x + 56, y: y - 372 }, { x: x - 56, y: y - 372 }], true);
  for (let i = 0; i < 7; i++) card(g, x - 40 + i * 13, y - 372, 12, 16, -0.3 + rng() * 0.6, { face: rng() < 0.3, suit: 'heart', rank: 1, cheap: true });
  // The drum housings on the front face (drums drawn in animate).
  for (const k of [-1, 1]) {
    g.fillStyle(MAHOGANY_DARK, 1); g.fillCircle(x + k * 44, y - 180, 46);
    g.fillStyle(GILT_DARK, 1); g.fillCircle(x + k * 44, y - 180, 42);
    g.fillStyle(0x1a0e0a, 1); g.fillCircle(x + k * 44, y - 180, 38);
  }
  // The chute and the belt out of the arch into crates.
  g.fillStyle(IVORY_DARK, 1); g.fillPoints([{ x: x + 20, y: y - 140 }, { x: x + 40, y: y - 140 }, { x: x + 100, y: y - 46 }, { x: x + 80, y: y - 46 }], true);
  g.fillStyle(0x2a2420, 1); g.fillRect(x + 60, y - 12, 150, 12);
  g.fillStyle(0x3a3430, 1); for (let bx = x + 62; bx < x + 210; bx += 12) g.fillRect(bx, y - 12, 2, 12);
  for (const [cx, n] of [[x + 170, 3], [x + 210, 5]] as [number, number][]) {
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(cx - 18, y - 30, 36, 30);
    g.fillStyle(MAHOGANY, 1); g.fillRect(cx - 16, y - 28, 32, 26);
    for (let i = 0; i < n; i++) { g.fillStyle(i % 2 ? CARD_RED : CHIP_BLUE, 1); g.fillRect(cx - 14 + i * 6, y - 36, 5, 8); }
  }
  // The treadwheel on the west side.
  const tx = x - 170, ty = y - 60;
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(tx - 6, ty, 12, 60);
  g.lineStyle(6, MAHOGANY_DARK, 1); g.strokeCircle(tx, ty, 54);
  g.lineStyle(3, MAHOGANY_LIT, 1); g.strokeCircle(tx, ty, 54);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineStyle(2, MAHOGANY, 1); g.lineBetween(tx, ty, tx + Math.cos(a) * 52, ty + Math.sin(a) * 52); }
  g.fillStyle(GILT, 1); g.fillCircle(tx, ty, 6);
  g.lineStyle(3, MAHOGANY_DARK, 1); g.lineBetween(tx, ty, x - 104, y - 120);
}

/**
 * The mill's moving parts — `animate`: the two riffle drums turning against each other, half-decks
 * arcing off each and interleaving into one, and the treadwheel's walkers.
 */
export function millRiffle(g: G, x: number, y: number, t: number): void {
  for (const k of [-1, 1]) {
    const cx = x + k * 44, cy = y - 180;
    const a0 = t * 2.4 * k;
    for (let i = 0; i < 10; i++) {
      const a = a0 + (i / 10) * Math.PI * 2;
      g.lineStyle(3, i % 2 ? IVORY : CARD_RED, 0.9);
      g.lineBetween(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
    }
    g.fillStyle(GILT, 1); g.fillCircle(cx, cy, 8);
    g.fillStyle(GILT_DARK, 1); g.fillCircle(cx, cy, 3);
  }
  // Cards flicking off both drums and meeting in the middle.
  for (let i = 0; i < 8; i++) {
    const ph = (t * 1.6 + i / 8) % 1;
    const side = i % 2 ? 1 : -1;
    const px = x + side * 44 * (1 - ph), py = y - 180 - 30 - Math.sin(ph * Math.PI) * 30 + ph * 40;
    card(g, px, py, 9, 12, side * (1 - ph) * 1.2, { face: false, back: side > 0 ? CARD_RED : CHIP_BLUE, cheap: true, alpha: 0.95 });
  }
  // Decks sliding down the chute and along the belt.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.4 + i / 4) % 1;
    const bx = ph < 0.4 ? x + 30 + (ph / 0.4) * 60 : x + 90 + ((ph - 0.4) / 0.6) * 110;
    const by = ph < 0.4 ? y - 140 + (ph / 0.4) * 94 : y - 16;
    g.fillStyle(CARD_RED_DARK, 1); g.fillRect(bx - 6, by - 4, 12, 7);
    g.fillStyle(CARD_RED, 1); g.fillRect(bx - 6, by - 6, 12, 5);
  }
  // Two walkers in the treadwheel, a black chip at each throat.
  const tx = x - 170, ty = y - 60;
  for (const k of [-1, 1]) {
    const bob = Math.abs(Math.sin(t * 4 + k)) * 3;
    const px = tx + k * 12, py = ty + 34 - bob;
    g.fillStyle(0x3a3a40, 1); g.fillRect(px - 5, py - 14, 10, 14);
    g.fillStyle(0xd8b89a, 1); g.fillCircle(px, py - 19, 5);
    g.fillStyle(LAMP_GLASS, 1); g.fillRect(px - 6, py - 24, 12, 2.5);
    g.fillStyle(CHIP_BLACK, 1); g.fillCircle(px, py - 11, 2.2);
    g.lineStyle(2, 0x2a2a30, 1); g.lineBetween(px - 2, py, px - 2 - Math.sin(t * 8 + k) * 4, py + 10); g.lineBetween(px + 2, py, px + 2 + Math.sin(t * 8 + k) * 4, py + 10);
  }
  for (let k = 0; k < 8; k++) {
    const a = t * 1.2 + (k / 8) * Math.PI * 2;
    g.lineStyle(2, MAHOGANY_LIT, 0.9); g.lineBetween(tx + Math.cos(a) * 46, ty + Math.sin(a) * 46, tx + Math.cos(a) * 54, ty + Math.sin(a) * 54);
  }
}

// ── Fortune-tellers, shops, the Cutting Stone ────────────────────────

/**
 * A fortune-teller's tent: a peaked tent in violet and night-blue stripes sewn with gold stars,
 * flap tied back on a lamp-lit table with a crystal ball, a board of tarot pinned outside, and a
 * pennant with an eye on the pole. Returns the door point.
 */
export function fortuneTent(g: G, x: number, y: number, s: number, rng: () => number): Pt {
  shadow(g, x, y + 4, 140 * s, 30 * s);
  const w = 120 * s, h = 110 * s;
  const stripes = 7;
  for (let i = 0; i < stripes; i++) {
    const a0 = x - w / 2 + (i / stripes) * w, a1 = x - w / 2 + ((i + 1) / stripes) * w;
    g.fillStyle(i % 2 ? TAROT_NIGHT : TAROT_VIOLET, 1);
    g.fillPoints([{ x: a0, y }, { x: a1, y }, { x: x + (a1 - x) * 0.05, y: y - h }, { x: x + (a0 - x) * 0.05, y: y - h }], true);
  }
  // Scalloped valance.
  for (let i = 0; i < 9; i++) {
    const vx = x - w * 0.46 + i * (w * 0.92 / 8);
    g.fillStyle(GILT, 1); g.fillCircle(vx, y - h * 0.42, 6 * s);
    g.fillStyle(TAROT_VIOLET_LIT, 1); g.fillCircle(vx, y - h * 0.42 - 1, 4.5 * s);
  }
  for (let i = 0; i < 12; i++) {
    const sx = x + (rng() - 0.5) * w * 0.7, sy = y - h * (0.5 + rng() * 0.4);
    g.fillStyle(GILT_LIT, 0.9); g.fillTriangle(sx - 2 * s, sy, sx + 2 * s, sy, sx, sy - 4 * s); g.fillTriangle(sx - 2 * s, sy - 2.5 * s, sx + 2 * s, sy - 2.5 * s, sx, sy + 1.5 * s);
  }
  // The open flap and the lit table inside.
  g.fillStyle(0x100a18, 1); g.fillTriangle(x - 26 * s, y, x + 26 * s, y, x, y - h * 0.62);
  g.fillStyle(0xffd890, 0.25); g.fillTriangle(x - 20 * s, y, x + 20 * s, y, x, y - h * 0.5);
  g.fillStyle(TAROT_VIOLET, 1); g.fillTriangle(x - 26 * s, y, x - 14 * s, y, x - 4 * s, y - h * 0.6);
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x - 12 * s, y - 14 * s, 24 * s, 5 * s);
  g.fillStyle(0xb8e0ff, 0.8); g.fillCircle(x, y - 22 * s, 7 * s);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 2 * s, y - 24 * s, 2 * s);
  // Pole and pennant with an eye.
  g.lineStyle(2 * s, GILT_DARK, 1); g.lineBetween(x, y - h, x, y - h - 26 * s);
  g.fillStyle(GILT, 1); g.fillTriangle(x, y - h - 26 * s, x + 24 * s, y - h - 20 * s, x, y - h - 14 * s);
  g.fillStyle(TAROT_NIGHT, 1); g.fillEllipse(x + 9 * s, y - h - 20 * s, 9 * s, 5 * s);
  g.fillStyle(IVORY, 1); g.fillCircle(x + 9 * s, y - h - 20 * s, 1.6 * s);
  // A board of tarot pinned up beside the flap.
  const bx = x + w * 0.52, by = y;
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(bx - 2, by - 50 * s, 4, 50 * s);
  g.fillStyle(MAHOGANY, 1); g.fillRect(bx - 18 * s, by - 56 * s, 36 * s, 26 * s);
  for (let i = 0; i < 3; i++) tarotCard(g, bx - 11 * s + i * 11 * s, by - 43 * s, 9 * s, 0, i as Arcanum, 1);
  return { x, y: y + 16 };
}

/** The faces of the three tarot cards the Card Court reads: the Tower, the Hanged Man, the Star. */
export type Arcanum = 0 | 1 | 2;

/**
 * A tarot card (taller than a playing card, violet border, gold frame) with its arcanum painted:
 * the Tower struck by lightning, the Hanged Man upside down from his beam, the Star over water.
 * `face` 0 draws the back (a gold sun in violet). `w` is its width.
 */
export function tarotCard(g: G, x: number, y: number, w: number, ang: number, arc: Arcanum, face: number, a = 1, sx = 1): void {
  const h = w * 1.7;
  const P0 = frame(x, y, ang);
  /** `sx` squeezes the card across (a card turning over shows edge-on halfway). */
  const P = (u: number, v: number): Pt => P0(u * sx, v);
  const q = (u0: number, v0: number, u1: number, v1: number): Pts => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  g.fillStyle(0x000000, 0.4 * a); g.fillPoints(q(-w / 2 - 1, -h / 2 - 1, w / 2 + 1, h / 2 + 1), true);
  g.fillStyle(TAROT_VIOLET, a); g.fillPoints(q(-w / 2, -h / 2, w / 2, h / 2), true);
  g.fillStyle(GILT, a); g.fillPoints(q(-w / 2 + 2, -h / 2 + 2, w / 2 - 2, h / 2 - 2), true);
  const k = face;
  if (k <= 0.01) {
    g.fillStyle(TAROT_NIGHT, a); g.fillPoints(q(-w / 2 + 3, -h / 2 + 3, w / 2 - 3, h / 2 - 3), true);
    g.fillStyle(GILT, a); g.fillCircle(x, y, w * 0.18);
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      g.lineStyle(1, GILT, a); g.lineBetween(x + Math.cos(t) * w * 0.2, y + Math.sin(t) * w * 0.2, x + Math.cos(t) * w * 0.34, y + Math.sin(t) * w * 0.34);
    }
    return;
  }
  g.fillStyle(arc === 2 ? 0x1a2a5a : IVORY, a); g.fillPoints(q(-w / 2 + 3, -h / 2 + 3, w / 2 - 3, h / 2 - 3), true);
  const p = (u: number, v: number) => P(u * w, v * h);
  if (arc === 0) {
    // The Tower: a grey tower, its crown blown off, a jag of lightning, two figures falling.
    const b0 = p(-0.18, 0.38), b1 = p(0.18, 0.38), t0 = p(-0.14, -0.15), t1 = p(0.14, -0.15);
    g.fillStyle(0x8a8a90, a); g.fillPoints([b0, b1, t1, t0], true);
    g.fillStyle(0xffb030, a); const w0 = p(0, 0.05); g.fillRect(w0.x - 1.5, w0.y - 2, 3, 4);
    const c = p(0.06, -0.24);
    g.fillStyle(GILT, a); g.fillTriangle(c.x - 4, c.y + 2, c.x + 4, c.y + 2, c.x + 2, c.y - 4);
    g.lineStyle(1.5, 0xfff0a0, a);
    const l0 = p(0.3, -0.45), l1 = p(0.12, -0.3), l2 = p(0.2, -0.28), l3 = p(0.02, -0.16);
    g.lineBetween(l0.x, l0.y, l1.x, l1.y); g.lineBetween(l1.x, l1.y, l2.x, l2.y); g.lineBetween(l2.x, l2.y, l3.x, l3.y);
    const f0 = p(-0.3, 0), f1 = p(0.3, 0.12);
    g.fillStyle(CARD_RED, a); g.fillCircle(f0.x, f0.y, 1.8); g.fillCircle(f1.x, f1.y, 1.8);
  } else if (arc === 1) {
    // The Hanged Man: a beam, a rope, a man hung by one ankle, his other leg crossed.
    const b0 = p(-0.34, -0.36), b1 = p(0.34, -0.36);
    g.lineStyle(2.5, 0x6a4a2a, a); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    const r0 = p(0, -0.36), r1 = p(0, -0.22);
    g.lineStyle(1, 0x6a4a2a, a); g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    const leg = p(0, -0.06), body = p(0, 0.12), head = p(0, 0.27);
    g.lineStyle(2, CHIP_BLUE, a); g.lineBetween(r1.x, r1.y, leg.x, leg.y);
    const cross = p(0.12, -0.12);
    g.lineBetween(leg.x, leg.y, cross.x, cross.y);
    g.lineStyle(3, CARD_RED, a); g.lineBetween(leg.x, leg.y, body.x, body.y);
    g.fillStyle(0xf0c8a8, a); g.fillCircle(head.x, head.y, w * 0.09);
    g.lineStyle(1, GILT, a); g.strokeCircle(head.x, head.y, w * 0.14);
  } else {
    // The Star: a great eight-point star, small stars round it, water at the foot poured from a jug.
    const c = p(0, -0.18);
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + ang, r = i % 2 ? w * 0.16 : w * 0.3;
      g.fillStyle(0xfff4b0, a); g.fillTriangle(c.x, c.y, c.x + Math.cos(t - 0.3) * w * 0.07, c.y + Math.sin(t - 0.3) * w * 0.07, c.x + Math.cos(t) * r, c.y + Math.sin(t) * r);
    }
    for (const [u, v] of [[-0.28, -0.38], [0.28, -0.36], [-0.3, 0], [0.3, 0.02]]) { const s = p(u, v); g.fillStyle(0xfff4b0, a); g.fillCircle(s.x, s.y, 1.3); }
    const w0 = p(-0.4, 0.3), w1 = p(0.4, 0.42);
    g.fillStyle(0x4a8ac8, a); g.fillRect(Math.min(w0.x, w1.x), w0.y, Math.abs(w1.x - w0.x), Math.abs(w1.y - w0.y) + 2);
    const j = p(0.12, 0.16);
    g.lineStyle(1.2, 0xbfe8ff, a); g.lineBetween(j.x, j.y, j.x - 3, j.y + w * 0.3);
  }
}

/**
 * The Cutting Stone at the crossing: a cream plinth with a gilt band and, on top, a deck of cards
 * big as a hay-cart — its edges drawn as stacked lines, the top card face-down, one card fanned out
 * sideways where the last cut was made. Every quarrel in the court is settled by a cut here.
 */
export function cuttingStone(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 140, 34);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 56, y - 34, 112, 34);
  g.fillStyle(STONE, 1); g.fillRect(x - 54, y - 36, 108, 30);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 54, y - 36, 108, 4);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 56, y - 20, 112, 6);
  g.fillStyle(GILT, 1); g.fillRect(x - 56, y - 21, 112, 3);
  for (let i = 0; i < 4; i++) suitInlay(g, x - 36 + i * 24, y - 10, 4, (['spade', 'heart', 'club', 'diamond'] as Suit[])[i], 0.9);
  // The deck: edges stacked up, then the top card.
  const dw = 70, dh = 46;
  for (let i = 0; i < 14; i++) {
    const yy = y - 38 - i * 2;
    g.fillStyle(i % 2 ? IVORY : IVORY_SHADE, 1); g.fillRect(x - dw / 2, yy - 2, dw, 2.5);
  }
  g.fillStyle(IVORY_DARK, 1); g.fillRect(x + dw / 2 - 2, y - 66, 2, 28);
  const top = y - 68;
  g.fillStyle(CARD_BLACK, 0.5); g.fillPoints([{ x: x - dw / 2 - 4, y: top }, { x: x + dw / 2 - 4, y: top }, { x: x + dw / 2 + 4, y: top - dh * 0.36 }, { x: x - dw / 2 + 4, y: top - dh * 0.36 }], true);
  g.fillStyle(IVORY, 1); g.fillPoints([{ x: x - dw / 2 - 3, y: top - 1 }, { x: x + dw / 2 - 3, y: top - 1 }, { x: x + dw / 2 + 3, y: top - dh * 0.36 + 1 }, { x: x - dw / 2 + 3, y: top - dh * 0.36 + 1 }], true);
  g.fillStyle(CARD_RED, 1); g.fillPoints([{ x: x - dw / 2 + 3, y: top - 4 }, { x: x + dw / 2 - 7, y: top - 4 }, { x: x + dw / 2 - 1, y: top - dh * 0.36 + 4 }, { x: x - dw / 2 + 7, y: top - dh * 0.36 + 4 }], true);
  g.lineStyle(1, CARD_RED_LIT, 0.7);
  for (let i = 0; i < 6; i++) g.lineBetween(x - dw / 2 + 8 + i * 10, top - 4, x - dw / 2 + 14 + i * 10, top - dh * 0.36 + 4);
  // The fanned card from the last cut, face up: the ace of spades, as it always is.
  card(g, x + dw / 2 + 6, top + 10, 22, 32, 0.5, { face: true, suit: 'spade', rank: 1 });
}

/**
 * The Fortune Cookie bakery: a narrow cream shop with a striped red-and-ivory awning, a bay of
 * cookies in the window, and on the roof a fortune cookie as big as a barrel with its slip of paper
 * curling out — a lucky number printed on it in red. Returns the door point.
 */
export function cookieShop(g: G, x: number, y: number, rng: () => number): Pt {
  const w = 150, h = 92;
  shadow(g, x, y + 4, w * 1.15, 30);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, top, w + 8, h);
  g.fillStyle(0xf0e2c4, 1); g.fillRect(x0, top + 2, w, h - 2);
  // Timber framing.
  g.lineStyle(3, MAHOGANY, 1); g.strokeRect(x0 + 2, top + 4, w - 4, h - 6);
  g.lineBetween(x0 + 2, top + h * 0.45, x0 + w - 2, top + h * 0.45);
  // Roof.
  g.fillStyle(CARD_RED_DARK, 1); g.fillTriangle(x0 - 14, top + 4, x0 + w + 14, top + 4, x, top - 46);
  g.fillStyle(CARD_RED, 1); g.fillTriangle(x0 - 8, top + 2, x0 + w + 8, top + 2, x, top - 42);
  for (let i = 1; i < 6; i++) { g.lineStyle(1, CARD_RED_DARK, 0.7); g.lineBetween(x0 - 8 + i * 6, top + 2 - i * 7.3, x0 + w + 8 - i * 6, top + 2 - i * 7.3); }
  // The great fortune cookie on the ridge.
  const cx = x, cy = top - 46;
  g.fillStyle(COOKIE_DARK, 1); g.fillEllipse(cx, cy + 4, 70, 34);
  g.fillStyle(COOKIE, 1); g.fillEllipse(cx - 12, cy, 46, 30); g.fillEllipse(cx + 12, cy, 46, 30);
  g.fillStyle(COOKIE_LIT, 1); g.fillEllipse(cx - 16, cy - 6, 22, 10);
  g.fillStyle(COOKIE_DARK, 1); g.fillTriangle(cx - 4, cy + 12, cx + 4, cy + 12, cx, cy - 10);
  g.fillStyle(IVORY, 1); g.fillPoints([{ x: cx + 2, y: cy + 4 }, { x: cx + 48, y: cy - 2 }, { x: cx + 52, y: cy + 6 }, { x: cx + 4, y: cy + 10 }], true);
  for (let i = 0; i < 4; i++) { g.fillStyle(CARD_RED, 1); g.fillRect(cx + 18 + i * 7, cy + 1 + i * 0.2, 4, 4); }
  // Awning in stripes, scalloped.
  for (let i = 0; i < 10; i++) {
    g.fillStyle(i % 2 ? IVORY : CARD_RED, 1);
    g.fillPoints([{ x: x0 - 6 + i * ((w + 12) / 10), y: top + h * 0.42 }, { x: x0 - 6 + (i + 1) * ((w + 12) / 10), y: top + h * 0.42 }, { x: x0 - 10 + (i + 1) * ((w + 20) / 10), y: top + h * 0.58 }, { x: x0 - 10 + i * ((w + 20) / 10), y: top + h * 0.58 }], true);
    g.fillStyle(i % 2 ? IVORY : CARD_RED, 1); g.fillCircle(x0 - 10 + (i + 0.5) * ((w + 20) / 10), top + h * 0.58, (w + 20) / 20);
  }
  // Window full of cookies, door.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x0 + 10, top + h * 0.64, 70, h * 0.3);
  g.fillStyle(0xffe8b0, 0.85); g.fillRect(x0 + 12, top + h * 0.66, 66, h * 0.26);
  for (let i = 0; i < 9; i++) {
    const kx = x0 + 18 + (i % 5) * 13 + (i > 4 ? 6 : 0), ky = top + h * 0.74 + (i > 4 ? 9 : 0);
    g.fillStyle(COOKIE_DARK, 1); g.fillEllipse(kx, ky + 1, 11, 7);
    g.fillStyle(rng() < 0.2 ? COOKIE_LIT : COOKIE, 1); g.fillEllipse(kx, ky, 10, 6);
  }
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + 22, top + h * 0.6, 36, h * 0.4);
  g.fillStyle(MAHOGANY, 1); g.fillRect(x + 25, top + h * 0.63, 30, h * 0.37);
  g.fillStyle(GILT, 1); g.fillCircle(x + 50, top + h * 0.82, 2);
  // Chalkboard by the door.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillTriangle(x + 70, y, x + 92, y, x + 81, y - 34);
  g.fillStyle(0x223028, 1); g.fillRect(x + 72, y - 30, 18, 22);
  g.lineStyle(1, 0xf0f0e0, 0.7); for (let i = 0; i < 4; i++) g.lineBetween(x + 74, y - 26 + i * 5, x + 86 - (i % 2) * 4, y - 26 + i * 5);
  return { x: x + 40, y: y + 16 };
}

/**
 * Sleeve & Deck, the charm shop: a tall narrow mahogany front with a gilt fascia, a green awning,
 * a window of fanned decks and charms on velvet, and over the door a gilt hand fanning five cards.
 */
export function sleeveShop(g: G, x: number, y: number, rng: () => number): Pt {
  const w = 130, h = 120;
  shadow(g, x, y + 4, w * 1.2, 30);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x0 - 3, top, w + 6, h);
  g.fillStyle(MAHOGANY, 1); g.fillRect(x0, top + 3, w, h - 3);
  // Upper storey: two windows, lit.
  for (const k of [-1, 1]) {
    g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + k * 32 - 14, top + 12, 28, 30);
    g.fillStyle(LAMP_GLASS_LIT, 0.6); g.fillRect(x + k * 32 - 12, top + 14, 24, 26);
    g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(x + k * 32, top + 14, x + k * 32, top + 40);
  }
  // Roof: a flat parapet with card-suit crenellations.
  g.fillStyle(CARD_BLACK, 1); g.fillRect(x0 - 6, top - 10, w + 12, 12);
  for (let i = 0; i < 5; i++) pip(g, x0 + 13 + i * 26, top - 16, 6, (['spade', 'heart', 'club', 'diamond', 'spade'] as Suit[])[i], i % 2 ? CARD_RED : CARD_BLACK);
  // Fascia.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x0 - 4, top + 48, w + 8, 14);
  g.fillStyle(GILT, 1); g.fillRect(x0 - 4, top + 48, w + 8, 10);
  for (let i = 0; i < 8; i++) { g.fillStyle(CARD_BLACK, 0.8); g.fillRect(x0 + 10 + i * 14, top + 51, 9, 4); }
  // Green awning.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? LAMP_GLASS : dim(LAMP_GLASS, 0.3), 1);
    g.fillPoints([{ x: x0 + i * (w / 8), y: top + 62 }, { x: x0 + (i + 1) * (w / 8), y: top + 62 }, { x: x0 - 6 + (i + 1) * ((w + 12) / 8), y: top + 74 }, { x: x0 - 6 + i * ((w + 12) / 8), y: top + 74 }], true);
  }
  // Window of decks and charms on red velvet.
  g.fillStyle(CARD_RED_DARK, 1); g.fillRect(x0 + 8, top + 78, 66, 34);
  for (let i = 0; i < 5; i++) card(g, x0 + 22 + i * 9, top + 96, 9, 13, -0.5 + i * 0.25, { face: i % 2 === 0, suit: (['spade', 'heart', 'club', 'diamond', 'heart'] as Suit[])[i], rank: 1, cheap: true });
  for (let i = 0; i < 3; i++) { g.fillStyle([GILT, 0x9ad8d0, IVORY][i], 1); g.fillCircle(x0 + 62, top + 86 + i * 9, 3); }
  g.fillStyle(0xffffff, 0.15); g.fillRect(x0 + 10, top + 80, 8, 30);
  // Door and the hand sign.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + 18, top + 76, 34, h - 76);
  g.fillStyle(LAMP_GLASS_LIT, 0.3); g.fillRect(x + 22, top + 80, 26, 16);
  g.fillStyle(GILT, 1); g.fillCircle(x + 46, top + 104, 2);
  const hx = x0 + w + 6, hy = top + 70;
  g.lineStyle(2, GILT_DARK, 1); g.lineBetween(x0 + w, hy - 20, hx + 20, hy - 20);
  for (let i = 0; i < 5; i++) card(g, hx + 14 + (i - 2) * 4, hy - 6 - Math.abs(i - 2) * 1.5, 9, 13, (i - 2) * 0.28, { face: true, suit: (['heart', 'spade', 'diamond', 'club', 'heart'] as Suit[])[i], rank: 1, cheap: true });
  g.fillStyle(GILT, 1); g.fillEllipse(hx + 14, hy + 4, 14, 8);
  void rng;
  return { x: x + 35, y: y + 16 };
}

/**
 * Ninian's print stall: a canvas-topped stall with an iron hand press, uncut sheets of cards pegged
 * on a line to dry, inks in pots and a stack of brand-new decks in their wrappers.
 */
export function printStall(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 150, 26);
  // Posts and canvas.
  for (const k of [-1, 1]) { g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + k * 64 - 2, y - 80, 4, 80); }
  g.fillStyle(0xe8dcc0, 1); g.fillPoints([{ x: x - 74, y: y - 78 }, { x: x + 74, y: y - 78 }, { x: x + 64, y: y - 96 }, { x: x - 64, y: y - 96 }], true);
  for (let i = 0; i < 7; i++) { g.fillStyle(CARD_RED, 0.7); g.fillRect(x - 70 + i * 21, y - 80, 10, 4); }
  // The line of drying sheets.
  g.lineStyle(1, 0x5a4a3a, 1); g.lineBetween(x - 62, y - 70, x + 62, y - 70);
  for (let i = 0; i < 4; i++) {
    const sx = x - 52 + i * 34;
    g.fillStyle(IVORY, 1); g.fillRect(sx - 12, y - 70, 24, 22);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const s = (['heart', 'spade', 'diamond', 'club'] as Suit[])[(i + r + c) % 4];
      pip(g, sx - 8 + c * 8, y - 64 + r * 10, 2.2, s, suitColor(s));
    }
    g.lineStyle(0.8, IVORY_DARK, 1); g.strokeRect(sx - 12, y - 70, 24, 22);
  }
  // The counter and the press.
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x - 66, y - 34, 132, 34);
  g.fillStyle(MAHOGANY, 1); g.fillRect(x - 64, y - 36, 128, 8);
  g.fillStyle(0x3a3a40, 1); g.fillRect(x - 46, y - 62, 8, 28); g.fillRect(x - 22, y - 62, 8, 28); g.fillRect(x - 48, y - 66, 38, 6);
  g.lineStyle(3, 0x3a3a40, 1); g.lineBetween(x - 30, y - 66, x - 4, y - 80);
  g.fillStyle(CARD_BLACK, 1); g.fillCircle(x - 4, y - 80, 3);
  for (let i = 0; i < 3; i++) { g.fillStyle([CARD_RED, CARD_BLACK, GILT][i], 1); g.fillRect(x + 6 + i * 12, y - 44, 9, 8); }
  for (let i = 0; i < 4; i++) { g.fillStyle(rng() < 0.5 ? CARD_RED : CHIP_BLUE, 1); g.fillRect(x + 44, y - 40 - i * 5, 14, 4); }
}

/**
 * The court's waystone: an ivory obelisk on a cream plinth, a pip let into each face in gilt, and
 * a die balanced on its point.
 */
export function cardWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 50, 14);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 20, y - 12, 40, 12);
  g.fillStyle(STONE, 1); g.fillRect(x - 18, y - 14, 36, 9);
  g.fillStyle(IVORY_SHADE, 1); g.fillPoints([{ x: x - 12, y: y - 14 }, { x: x + 12, y: y - 14 }, { x: x + 6, y: y - 72 }, { x: x - 6, y: y - 72 }], true);
  g.fillStyle(IVORY, 1); g.fillPoints([{ x: x - 12, y: y - 14 }, { x: x, y: y - 14 }, { x: x, y: y - 72 }, { x: x - 6, y: y - 72 }], true);
  suitInlay(g, x - 2, y - 34, 5, 'spade');
  suitInlay(g, x - 1, y - 54, 3.5, 'heart');
  g.fillStyle(GILT, 1); g.fillTriangle(x - 7, y - 72, x + 7, y - 72, x, y - 80);
  die(g, x, y - 88, 7, 5, 0.6);
}

/** The waystone's glint and the die on its tip, turning very slowly — `animate`. */
export function waystoneLife(g: G, x: number, y: number, t: number): void {
  glow(g, x, y - 46, 26, GILT_LIT, 0.03 + Math.sin(t * 2) * 0.012, 3);
  const ph = (t * 0.3) % 1;
  g.fillStyle(0xffffff, 0.4 * Math.sin(ph * Math.PI)); g.fillRect(x - 10 + ph * 18, y - 70 + ph * 50, 2, 6);
}

/**
 * The Draw notice board: a black board under a little gilt roof, the week's drawn numbers on brass
 * Lot discs in rows, each stamped across in red — and the King's crest at the top.
 */
export function drawBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 90, 16);
  for (const k of [-1, 1]) { g.fillStyle(MAHOGANY_DARK, 1); g.fillRect(x + k * 36 - 3, y - 90, 6, 90); }
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 48, y - 92, x + 48, y - 92, x, y - 112);
  g.fillStyle(GILT, 1); g.fillTriangle(x - 42, y - 94, x + 42, y - 94, x, y - 108);
  g.fillStyle(CARD_BLACK, 1); g.fillRect(x - 42, y - 92, 84, 56);
  g.lineStyle(2, GILT, 1); g.strokeRect(x - 42, y - 92, 84, 56);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const lx = x - 32 + c * 16, ly = y - 80 + r * 16;
    lotToken(g, lx, ly, 5);
    if (rng() < 0.4) { g.lineStyle(2, CARD_RED, 0.9); g.lineBetween(lx - 6, ly + 5, lx + 6, ly - 5); }
  }
  pip(g, x, y - 100, 4, 'diamond', CARD_RED);
}

/**
 * A spade-shaped lily pad on the baize pond with a white water-lily — the pond's "aces" — for
 * `animate` (it bobs).
 */
export function aceLily(g: G, x: number, y: number, s: number, flower: boolean): void {
  pip(g, x + 1, y + 1, s, 'spade', dim(BAIZE_DEEP, 0.2), 0.7);
  pip(g, x, y, s, 'spade', 0x3f8a4a, 0.95);
  g.lineStyle(1, 0x2a6a36, 0.8); g.lineBetween(x, y - s * 0.8, x, y + s * 0.6);
  if (flower) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(IVORY, 1); g.fillEllipse(x + Math.cos(a) * s * 0.3, y - s * 0.1 + Math.sin(a) * s * 0.2, s * 0.4, s * 0.24); }
    g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y - s * 0.1, s * 0.15);
  }
}

/** The baize pond's kerb: a cream stone rim, gilt-edged, with a suit at each corner. */
export function pondKerb(g: G, r: Rect): void {
  g.lineStyle(14, STONE_DARK, 1); g.strokeRoundedRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 26);
  g.lineStyle(10, STONE, 1); g.strokeRoundedRect(r.x - 6, r.y - 8, r.w + 12, r.h + 12, 26);
  g.lineStyle(2, GILT, 1); g.strokeRoundedRect(r.x - 12, r.y - 14, r.w + 24, r.h + 24, 30);
  const corners: [number, number, Suit][] = [[r.x - 6, r.y - 8, 'spade'], [r.x + r.w + 6, r.y - 8, 'heart'], [r.x - 6, r.y + r.h + 4, 'club'], [r.x + r.w + 6, r.y + r.h + 4, 'diamond']];
  for (const [cx, cy, s] of corners) { g.fillStyle(STONE_LIT, 1); g.fillCircle(cx, cy, 12); suitInlay(g, cx, cy, 6, s); }
  g.lineStyle(1, POND_LIT, 0.4); g.strokeRoundedRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 20);
}

/** Lerp a colour toward card red — used for the Prince's tells. */
export const toRed = (c: number, t: number): number => mixC(c, CARD_RED, t);

/** A small fanned hand of cards (the Prince's ruff, a charm's icon) round (x, y). */
export function fan(g: G, x: number, y: number, n: number, w: number, spread: number, upAng: number, faceUp: boolean, alpha = 1): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const a = upAng + t * spread;
    const cx = x + Math.cos(a) * w * 0.9, cy = y + Math.sin(a) * w * 0.9;
    const s = (['spade', 'heart', 'club', 'diamond'] as Suit[])[i % 4];
    card(g, cx, cy, w, w * 1.4, a + Math.PI / 2, { face: faceUp, suit: s, rank: i % 3 === 0 ? 0 : 1, cheap: true, alpha, back: ANTE });
  }
}

