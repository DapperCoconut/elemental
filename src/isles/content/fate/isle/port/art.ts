import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { type G, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Tosswater's own drawing kit — the palette and set-piece bricks for a harbour where berths, bread
 * and children are all drawn by lot. The town is built out of the things a gambling isle has lying
 * about: houses cast as giant ivory dice (their windows are the pips), bollards that are dice too,
 * stacks of chips for chimney-pots, kiosks striped like a roulette wedge, and over all of it the
 * Croupier-King's colours — baize green, card red and black, and gilt on everything he owns.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** The lawns — mown so close they are baize, not grass. */
export const BAIZE = 0x2f7a4c;
export const BAIZE_ALT = 0x358456;
export const BAIZE_DARK = 0x1d5434;
export const BAIZE_LIT = 0x56a46e;
/** The roads: black and red squares like a board. */
export const SQ_RED = 0x9a2a32;
export const SQ_RED_DARK = 0x6a1a22;
export const SQ_BLACK = 0x24222a;
export const SQ_BLACK_LIT = 0x3a3842;
/** Card colours, for paint and bunting. */
export const CARD_RED = 0xc8303e;
export const CARD_BLACK = 0x1c1a22;
/** Gilt — the King's. */
export const GILT = 0xd8b04a;
export const GILT_DARK = 0x8a6a22;
export const GILT_LIT = 0xf6e09a;
/** Dice ivory and pip-black. */
export const IVORY = 0xf0e8d2;
export const IVORY_SHADE = 0xc8bc9c;
export const IVORY_DARK = 0x9a8e70;
export const PIP = 0x24202a;
/** Brass of the Lots and the drum. */
export const BRASS = 0xc89a3a;
export const BRASS_DARK = 0x7a5a1e;
export const BRASS_LIT = 0xf0cc70;
/** A croupier's green-shaded lamp. */
export const LAMP_GREEN = 0x5ad07e;
export const LAMP = 0xffe0a0;
/** Harbour stone and timber. */
export const STONE = 0x8a8478;
export const STONE_ALT = 0x96907e;
export const STONE_DARK = 0x56524a;
export const PLANK = 0x7e5e3e;
export const PLANK_DARK = 0x4a3424;
export const ROPE = 0xc8b080;
/** The sea off Tosswater: green-blue over a sandy floor. */
export const SEA_SHALLOW = 0x2e7a7c;
export const SEA = 0x1e5a6c;
export const SEA_DEEP = 0x143a4c;
export const FOAM = 0xe8f4ee;
/** Soil in the Allotments. */
export const SOIL = 0x4a3826;
export const SOIL_DARK = 0x32261a;
/** Poker-chip colours. */
export const CHIPS = [0xc8303e, 0x1c1a22, 0x2a6ac8, 0x2e9a5a, 0xf0e8d2, 0xd8b04a];
/** A busted croupier's black chip. */
export const BUST = 0x121016;

// ── Primitives ───────────────────────────────────────────────────────

/** A closed polygon fill from plain points. */
export function poly(g: G, pts: [number, number][], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
}

/** Pip offsets (unit square, -1..1) for each face of a die. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

/** The pips of face `n` (1–6) laid in a square of half-size `s` round cx,cy. */
export function pips(g: G, cx: number, cy: number, s: number, n: number, r: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  for (const [px, py] of PIPS[Math.max(1, Math.min(6, Math.round(n)))]) g.fillCircle(cx + px * s, cy + py * s, r);
}

/** One poker chip seen from above at a slant: rim, edge stripes, inlay. */
export function chip(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.fillStyle(dim(color, 0.45), a); g.fillEllipse(x, y + r * 0.22, r * 2, r * 0.9);
  g.fillStyle(color, a); g.fillEllipse(x, y, r * 2, r * 0.9);
  g.fillStyle(0xf8f4e8, a * 0.9);
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2;
    g.fillEllipse(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.36, r * 0.32, r * 0.16);
  }
  g.lineStyle(1, lit(color, 0.35), a * 0.8); g.strokeEllipse(x, y, r * 1.1, r * 0.5);
}

/** A stack of chips, bottom chip at x,y. */
export function chipStack(g: G, x: number, y: number, n: number, r: number, colors: number[] = CHIPS, seed = 0): void {
  shadow(g, x, y + r * 0.3, r * 2.4, r * 0.8, 0.28);
  for (let k = 0; k < n; k++) {
    const c = colors[(k + seed) % colors.length];
    const yy = y - k * r * 0.34;
    g.fillStyle(dim(c, 0.4), 1); g.fillRect(x - r, yy - r * 0.1, r * 2, r * 0.34);
    g.fillStyle(0xf8f4e8, 0.8);
    for (let s = -2; s <= 2; s++) g.fillRect(x + s * r * 0.42 - r * 0.08, yy - r * 0.08, r * 0.16, r * 0.3);
  }
  chip(g, x, y - (n - 1) * r * 0.34 - r * 0.12, r, colors[(n - 1 + seed) % colors.length]);
}

/** Bunting between two points: card-shaped pennants, alternating red and black, with a pip or a suit. */
export function bunting(g: G, a: Pt, b: Pt, sag: number, count: number, wave = 0): void {
  const at = (t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag });
  g.lineStyle(1.2, 0x3a3028, 0.9);
  g.beginPath();
  for (let i = 0; i <= 20; i++) { const p = at(i / 20); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
  g.strokePath();
  for (let i = 0; i < count; i++) {
    const p = at((i + 0.5) / count);
    const sway = Math.sin(wave * 2.2 + i * 0.9) * 2;
    const c = i % 2 ? CARD_BLACK : CARD_RED;
    g.fillStyle(IVORY, 1); g.fillRect(p.x - 5 + sway * 0.3, p.y, 10, 13);
    g.fillStyle(c, 1); g.fillRect(p.x - 4 + sway * 0.3, p.y + 1, 8, 11);
    g.fillStyle(IVORY, 0.9); g.fillCircle(p.x + sway * 0.3, p.y + 6.5, 1.6);
  }
}

// ── Dice ─────────────────────────────────────────────────────────────

/**
 * A die seen three-quarters on: front face, top face (a rhombus going back), right face in shade.
 * `x,y` is the front face's bottom centre; `s` the edge length. Faces are the pips shown.
 */
export function die(g: G, x: number, y: number, s: number, front: number, top: number, side: number, body = IVORY, pip = PIP): void {
  const d = s * 0.42; // depth offset
  const x0 = x - s / 2, y0 = y - s;
  shadow(g, x + d * 0.4, y + 2, s * 1.4, s * 0.36, 0.3);
  // Right face.
  poly(g, [[x0 + s, y0], [x0 + s + d, y0 - d * 0.6], [x0 + s + d, y - d * 0.6], [x0 + s, y]], dim(body, 0.26));
  // Top face.
  poly(g, [[x0, y0], [x0 + d, y0 - d * 0.6], [x0 + s + d, y0 - d * 0.6], [x0 + s, y0]], lit(body, 0.08));
  // Front face, slightly rounded corners.
  g.fillStyle(body, 1); g.fillRoundedRect(x0, y0, s, s, s * 0.12);
  g.fillStyle(lit(body, 0.3), 0.5); g.fillRect(x0 + s * 0.08, y0 + s * 0.05, s * 0.84, s * 0.06);
  g.lineStyle(1, dim(body, 0.35), 0.7); g.strokeRoundedRect(x0, y0, s, s, s * 0.12);
  pips(g, x, y - s / 2, s * 0.28, front, s * 0.08, pip);
  // Top pips, squashed back along the rhombus.
  const tc = { x: x + d / 2, y: y0 - d * 0.3 };
  g.fillStyle(pip, 0.9);
  for (const [px, py] of PIPS[top]) g.fillEllipse(tc.x + px * s * 0.26 + py * d * 0.22, tc.y + py * d * 0.18, s * 0.13, s * 0.06);
  // Side pips, squashed sideways.
  const sc = { x: x0 + s + d / 2, y: y - s / 2 - d * 0.3 };
  g.fillStyle(dim(pip, 0.1), 0.85);
  for (const [px, py] of PIPS[side]) g.fillEllipse(sc.x + px * d * 0.24, sc.y + py * s * 0.26 - px * d * 0.14, s * 0.06, s * 0.13);
}

/** A dice bollard on the quay: a squat ivory die on a stone collar, a rope belayed round it. */
export function diceBollard(g: G, x: number, y: number, n: number, rope = true): void {
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x + 3, y + 1, 30, 10);
  g.fillStyle(STONE, 1); g.fillEllipse(x + 3, y - 1, 28, 8);
  die(g, x, y - 1, 20, n, ((n + 1) % 6) + 1, ((n + 3) % 6) + 1);
  if (rope) {
    g.lineStyle(2.4, ROPE, 1); g.strokeEllipse(x + 2, y - 7, 24, 7);
    g.lineStyle(2, dim(ROPE, 0.25), 1); g.lineBetween(x + 13, y - 6, x + 26, y + 6);
  }
}

/**
 * A dice house: a cottage cast as a giant die. The pips on the front are its round windows, lit
 * from inside; the top is a flat roof with a chip-stack chimney; a door is cut low in one corner,
 * through a pip. `x,y` front-wall base centre; `s` the edge. Returns the door point.
 */
export function diceHouse(g: G, x: number, y: number, s: number, face: number, glowCol: number, rng: () => number, o: { tint?: number; chimney?: boolean; washing?: boolean } = {}): Pt {
  const body = o.tint ?? IVORY;
  const d = s * 0.4;
  const x0 = x - s / 2, y0 = y - s;
  shadow(g, x + d * 0.4, y + 6, s * 1.5, 30);
  // Plinth: a step of harbour stone under it.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 6, y - 6, s + d + 10, 8);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 6, y - 8, s + 12, 5);
  // Right face (shade), with its own pips dark.
  poly(g, [[x0 + s, y0], [x0 + s + d, y0 - d * 0.6], [x0 + s + d, y - d * 0.6 - 6], [x0 + s, y - 6]], dim(body, 0.28));
  for (const [px, py] of PIPS[((face + 2) % 6) + 1]) {
    g.fillStyle(dim(body, 0.5), 1); g.fillEllipse(x0 + s + d / 2 + px * d * 0.24, y - s / 2 - d * 0.3 + py * s * 0.26 - px * d * 0.14, s * 0.06, s * 0.12);
  }
  // Top face: a flat roof, tarred, with a parapet.
  poly(g, [[x0, y0], [x0 + d, y0 - d * 0.6], [x0 + s + d, y0 - d * 0.6], [x0 + s, y0]], lit(body, 0.06));
  poly(g, [[x0 + 6, y0 - 2], [x0 + d + 2, y0 - d * 0.6 + 2], [x0 + s + d - 6, y0 - d * 0.6 + 2], [x0 + s - 2, y0 - 2]], 0x3a3438, 0.55);
  // Front face.
  g.fillStyle(dim(body, 0.35), 1); g.fillRoundedRect(x0 - 1, y0 - 1, s + 2, s - 4, s * 0.1);
  g.fillStyle(body, 1); g.fillRoundedRect(x0, y0, s, s - 6, s * 0.1);
  g.fillStyle(lit(body, 0.35), 0.5); g.fillRect(x0 + 8, y0 + 4, s - 16, 4);
  // Weathering: salt streaks and the odd crack.
  for (let i = 0; i < 6; i++) {
    const sx = x0 + 6 + rng() * (s - 12);
    g.lineStyle(1, dim(body, 0.14), 0.6); g.lineBetween(sx, y0 + 10, sx + (rng() - 0.5) * 4, y0 + 20 + rng() * (s - 40));
  }
  // The pips are windows: round, deep-set, lit, with a cross of glazing bars.
  const ps = s * 0.27, pr = s * 0.085;
  const cy = y - s / 2 - 4;
  const pipPts = PIPS[face];
  // The bottom-left pip (or the lowest-left) is the door instead of a window.
  let doorIdx = 0;
  pipPts.forEach(([px, py], i) => { if (py > pipPts[doorIdx][1] || (py === pipPts[doorIdx][1] && px < pipPts[doorIdx][0])) doorIdx = i; });
  pipPts.forEach(([px, py], i) => {
    if (i === doorIdx && face > 1) return;
    const wx = x + px * ps, wy = cy + py * ps;
    g.fillStyle(PIP, 1); g.fillCircle(wx, wy, pr + 2);
    g.fillStyle(glowCol, 0.16); g.fillCircle(wx, wy, pr + 9);
    g.fillStyle(glowCol, 0.95); g.fillCircle(wx, wy, pr);
    g.lineStyle(1.4, PIP, 1); g.lineBetween(wx - pr, wy, wx + pr, wy); g.lineBetween(wx, wy - pr, wx, wy + pr);
    g.fillStyle(lit(glowCol, 0.5), 0.7); g.fillCircle(wx - pr * 0.35, wy - pr * 0.35, pr * 0.25);
  });
  // The door: an arched black door low on the front, ringed like a pip.
  const [dpx] = face > 1 ? pipPts[doorIdx] : [0];
  const dx = x + dpx * ps * 0.9;
  g.fillStyle(PIP, 1); g.fillRoundedRect(dx - 13, y - 40, 26, 34, { tl: 13, tr: 13, bl: 0, br: 0 });
  g.fillStyle(SQ_RED_DARK, 1); g.fillRoundedRect(dx - 10, y - 37, 20, 31, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(GILT, 1); g.fillCircle(dx + 5, y - 20, 1.8);
  g.fillStyle(GILT, 0.9); g.fillRect(dx - 3, y - 33, 6, 4);
  // Chip-stack chimney on the roof.
  if (o.chimney !== false) chipStack(g, x0 + s * 0.78 + d * 0.5, y0 - d * 0.32, 5, 7, CHIPS, Math.floor(rng() * 6));
  // A washing line from the roof parapet: a shirt, a sock, a dealer's visor.
  if (o.washing) {
    const a = { x: x0 + 8, y: y0 - 4 }, b = { x: x0 + s + d - 6, y: y0 - d * 0.6 - 2 };
    g.lineStyle(1, 0x3a3028, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
    const cols = [0xe8e0d0, CARD_RED, 0x4a7ab8, 0x2e8a4a];
    for (let k = 0; k < 4; k++) {
      const t = 0.15 + k * 0.22;
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      g.fillStyle(cols[k], 1); g.fillRect(px - 4, py, 8, 9 + (k % 2) * 3);
    }
  }
  return { x: dx, y: y + 16 };
}

// ── The lottery bricks ───────────────────────────────────────────────

/**
 * A Lot — the brass token every child is given at birth: a disc stamped with four digits, on a
 * loop of chain. `snapped` draws it broken in two with a black chip hung in its place.
 */
export function lot(g: G, x: number, y: number, r: number, snapped = false, a = 1): void {
  if (snapped) {
    g.lineStyle(1, 0x8a8478, a); g.lineBetween(x, y - r - 6, x, y - r);
    g.fillStyle(BRASS_DARK, a); g.fillCircle(x - r * 0.35, y + 1, r * 0.8);
    g.fillStyle(BRASS, a); g.slice(x - r * 0.3, y, r * 0.75, Math.PI * 0.55, Math.PI * 1.45, false); g.fillPath();
    g.fillStyle(BUST, a); g.fillCircle(x + r * 0.45, y + 2, r * 0.7);
    g.lineStyle(1, 0x4a4450, a); g.strokeCircle(x + r * 0.45, y + 2, r * 0.5);
    return;
  }
  g.lineStyle(1, 0x8a8478, a); g.lineBetween(x, y - r - 6, x, y - r);
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y + 1, r);
  g.fillStyle(BRASS, a); g.fillCircle(x, y, r);
  g.lineStyle(1, BRASS_LIT, a * 0.8); g.strokeCircle(x, y, r * 0.7);
  g.fillStyle(BRASS_DARK, a);
  for (let k = 0; k < 4; k++) g.fillRect(x - r * 0.55 + k * r * 0.3, y - r * 0.15, r * 0.18, r * 0.3);
}

/** The House's mark: a gilt wheel of eight spokes in a ring, its hub a chip. Stamped on what he owns. */
export function houseWheel(g: G, x: number, y: number, r: number, a = 1, rot = 0): void {
  g.lineStyle(Math.max(1, r * 0.14), GILT, a); g.strokeCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.08), GILT, a);
  for (let k = 0; k < 8; k++) {
    const ang = rot + (k / 8) * Math.PI * 2;
    g.lineBetween(x + Math.cos(ang) * r * 0.25, y + Math.sin(ang) * r * 0.25, x + Math.cos(ang) * r, y + Math.sin(ang) * r);
  }
  g.fillStyle(CARD_RED, a); g.fillCircle(x, y, r * 0.28);
  g.fillStyle(GILT_LIT, a); g.fillCircle(x, y, r * 0.12);
}

/** A green-shaded croupier's lamp on a brass post: the glass shade, its glow, a pull-chain. */
export function greenLamp(g: G, x: number, y: number, h = 60): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 1, 16, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2, y - h, 4, h);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 4, 12, 4); g.fillRect(x - 1, y - h, 2, h - 4);
  glow(g, x, y - h + 6, 26, LAMP_GREEN, 0.05, 4);
  g.fillStyle(0x1e5a32, 1); g.fillTriangle(x - 14, y - h + 6, x + 14, y - h + 6, x, y - h - 8);
  g.fillStyle(LAMP_GREEN, 0.9); g.fillTriangle(x - 11, y - h + 4, x + 11, y - h + 4, x, y - h - 5);
  g.fillStyle(LAMP, 1); g.fillEllipse(x, y - h + 7, 14, 4);
  g.lineStyle(1, BRASS, 0.9); g.lineBetween(x + 6, y - h + 6, x + 6, y - h + 16);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 6, y - h + 17, 1.5);
}

/**
 * A lottery kiosk: a booth striped red and black like a roulette wedge, a gilt pediment, a hatch
 * with a ticket roll, a slate of today's odds, and a prize-wheel on the roof (its spokes are drawn
 * by `kioskWheel` each frame). `x,y` front base centre.
 */
export function kiosk(g: G, x: number, y: number, w: number, label: string[], rng: () => number): void {
  const h = 62;
  shadow(g, x, y + 3, w * 1.25, 14);
  // Striped walls.
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle(i % 2 ? CARD_BLACK : CARD_RED, 1);
    g.fillRect(x - w / 2 + (w / stripes) * i, y - h, w / stripes + 0.5, h);
  }
  g.fillStyle(0x000000, 0.18); g.fillRect(x + w / 2 - 8, y - h, 8, h);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - w / 2 - 3, y - 6, w + 6, 6);
  // The hatch: a lit window, a ticket roll, a counter-board.
  g.fillStyle(PIP, 1); g.fillRect(x - w * 0.34, y - h + 12, w * 0.68, 26);
  g.fillStyle(LAMP, 0.85); g.fillRect(x - w * 0.31, y - h + 14, w * 0.62, 22);
  g.fillStyle(0xe8e0c8, 1); g.fillCircle(x - w * 0.18, y - h + 26, 5);
  g.fillStyle(0xc8bca0, 1); g.fillCircle(x - w * 0.18, y - h + 26, 2);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x - w * 0.18, y - h + 26, 12, 12);
  for (let k = 0; k < 3; k++) { g.fillStyle(CARD_RED, 0.8); g.fillRect(x - w * 0.18 + 2, y - h + 28 + k * 3, 8, 1); }
  g.fillStyle(PLANK, 1); g.fillRect(x - w * 0.38, y - h + 38, w * 0.76, 5);
  // A chalk slate of odds hung under the hatch.
  g.fillStyle(0x2a2e2a, 1); g.fillRect(x - w * 0.3, y - h + 46, w * 0.6, 12);
  g.fillStyle(0xe8e8e0, 0.8);
  for (let k = 0; k < label.length && k < 2; k++) {
    for (let c = 0; c < label[k].length; c++) if (label[k][c] !== ' ') g.fillRect(x - w * 0.27 + c * 3.2, y - h + 48 + k * 5, 2, 3);
  }
  // Gilt pediment with the House wheel.
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - w / 2 - 6, y - h + 1, x + w / 2 + 6, y - h + 1, x, y - h - 22);
  g.fillStyle(GILT, 1); g.fillTriangle(x - w / 2 - 2, y - h, x + w / 2 + 2, y - h, x, y - h - 19);
  houseWheel(g, x, y - h - 7, 5, 0.9);
  // The roof wheel's stand (the wheel turns in `kioskWheel`).
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2, y - h - 34, 4, 14);
  // Ticket stubs blown round the foot.
  for (let k = 0; k < 6; k++) {
    g.fillStyle(rng() < 0.5 ? 0xe8e0c8 : 0xf0c8c8, 0.85);
    g.fillRect(x - w / 2 - 14 + rng() * (w + 28), y + rng() * 10 - 2, 5, 3);
  }
}

/** The prize wheel over a kiosk, turning: alternate red/black wedges, gilt rim, a clapper at the top. */
export function kioskWheel(g: G, x: number, y: number, r: number, rot: number): void {
  const n = 10;
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2;
    g.fillStyle(k === 0 ? 0x2e9a5a : k % 2 ? CARD_BLACK : CARD_RED, 1);
    g.slice(x, y, r, a0, a1, false); g.fillPath();
  }
  g.lineStyle(2, GILT, 1); g.strokeCircle(x, y, r);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y, r * 0.22);
  g.fillStyle(GILT, 1); g.fillTriangle(x - 3, y - r - 5, x + 3, y - r - 5, x, y - r + 3);
}

/** A gull, standing or flapping; `flap` 0–1, `dir` ±1. */
export function gull(g: G, x: number, y: number, flap: number, dir: number): void {
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 2, 14, 4);
  g.fillStyle(0xf4f4f0, 1); g.fillEllipse(x, y - 5, 13, 7);
  g.fillStyle(0xf4f4f0, 1); g.fillCircle(x + dir * 6, y - 9, 3.6);
  g.fillStyle(0xe8a030, 1); g.fillTriangle(x + dir * 9, y - 10, x + dir * 9, y - 8, x + dir * 13, y - 9);
  g.fillStyle(PIP, 1); g.fillCircle(x + dir * 7, y - 10, 0.9);
  const wy = y - 6 - flap * 8;
  g.fillStyle(0xa8aeb4, 1);
  g.fillTriangle(x - dir * 2, y - 6, x - dir * 12, wy - 2, x + dir * 3, y - 4);
  g.fillStyle(0x3a3a40, 1); g.fillTriangle(x - dir * 10, wy - 1, x - dir * 13, wy - 3, x - dir * 8, wy + 1);
  g.lineStyle(1, 0xe8a030, 1); g.lineBetween(x - 1, y - 2, x - 1, y + 1); g.lineBetween(x + 2, y - 2, x + 2, y + 1);
}

// ── The big pieces ───────────────────────────────────────────────────

/**
 * The cradle of the great brass drum: two gilt A-frames on a stepped dais of black and red marble,
 * a crank, a brass chute with a tray for the drawn Lot, and a rope barrier on chip-stack posts.
 * The barrel itself turns in `drumBarrel`. `x,y` is the dais's front centre.
 */
export function drumCradle(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 230, 40);
  // Stepped dais, chequered.
  for (let k = 0; k < 3; k++) {
    const w = 210 - k * 26, yy = y - k * 8;
    g.fillStyle(STONE_DARK, 1); g.fillRect(x - w / 2, yy - 8, w, 9);
    const n = Math.round(w / 15);
    for (let i = 0; i < n; i++) { g.fillStyle((i + k) % 2 ? SQ_RED : SQ_BLACK, 1); g.fillRect(x - w / 2 + i * (w / n), yy - 8, w / n + 0.5, 6); }
    g.fillStyle(GILT, 0.7); g.fillRect(x - w / 2, yy - 9, w, 1.5);
  }
  const top = y - 24;
  // The A-frames.
  for (const sx of [-1, 1]) {
    const fx = x + sx * 78;
    g.lineStyle(7, GILT_DARK, 1); g.lineBetween(fx - 18, top, fx, top - 92); g.lineBetween(fx + 18, top, fx, top - 92);
    g.lineStyle(4, GILT, 1); g.lineBetween(fx - 18, top, fx, top - 92); g.lineBetween(fx + 18, top, fx, top - 92);
    g.lineStyle(3, GILT_DARK, 1); g.lineBetween(fx - 10, top - 40, fx + 10, top - 40);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(fx, top - 92, 8);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx, top - 92, 4);
  }
  // The crank on the right.
  g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(x + 86, top - 92, x + 104, top - 92);
  g.lineStyle(4, BRASS, 1); g.lineBetween(x + 104, top - 92, x + 104, top - 68);
  g.fillStyle(PLANK_DARK, 1); g.fillRoundedRect(x + 100, top - 70, 8, 16, 3);
  // The chute and its tray, front centre.
  g.fillStyle(BRASS_DARK, 1); poly(g, [[x - 9, top - 46], [x + 9, top - 46], [x + 16, top - 8], [x - 16, top - 8]], BRASS_DARK);
  g.fillStyle(BRASS, 1); poly(g, [[x - 6, top - 46], [x + 6, top - 46], [x + 12, top - 10], [x - 12, top - 10]], BRASS);
  g.fillStyle(SQ_BLACK, 1); g.fillEllipse(x, top - 6, 40, 12);
  g.fillStyle(0x1e5a32, 1); g.fillEllipse(x, top - 7, 34, 9);
  // Rope barrier on chip-stack posts round the front.
  const posts = [-104, -52, 52, 104];
  for (const px of posts) chipStack(g, x + px, y + 18, 6, 6, [CARD_RED, CARD_BLACK]);
  g.lineStyle(2.5, CARD_RED, 1);
  for (let i = 0; i < posts.length - 1; i++) {
    if (posts[i] === -52) continue; // the gap the caller walks through
    const ax = x + posts[i], bx = x + posts[i + 1];
    g.beginPath(); g.moveTo(ax, y + 4);
    for (let k = 1; k <= 8; k++) { const t = k / 8; g.lineTo(ax + (bx - ax) * t, y + 4 + Math.sin(t * Math.PI) * 8); }
    g.strokePath();
  }
}

/**
 * The great brass drum's barrel, turning: a cylinder on its side between the frames, brass staves
 * sliding round as it rolls, hoops, a grille window through which the Lots tumble and glint, and
 * the House wheel on its end-cap. `rot` is the roll in radians; `x,y` the axle.
 */
export function drumBarrel(g: G, x: number, y: number, rot: number, t: number): void {
  const L = 140, R = 44;
  // Back of the barrel, shaded.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - L / 2, y - R, L, R * 2);
  // Staves: lines round the cylinder, foreshortened by cos, that slide as it rolls.
  for (let k = 0; k < 14; k++) {
    const a = rot + (k / 14) * Math.PI * 2;
    const c = Math.cos(a);
    if (c < 0) continue;
    const sy = y + Math.sin(a) * R;
    const shade = 0.25 + c * 0.6;
    g.fillStyle(mixC(BRASS_DARK, BRASS_LIT, shade), 1);
    g.fillRect(x - L / 2, sy - 3.2 * c - 1, L, 6.4 * c + 1);
  }
  // The grille window, where the Lots show tumbling inside.
  const wa = rot % (Math.PI * 2);
  const wy = y + Math.sin(wa) * R * 0.75;
  if (Math.cos(wa) > 0.2) {
    const wh = 30 * Math.cos(wa);
    g.fillStyle(0x1a140a, 1); g.fillRect(x - 34, wy - wh / 2, 68, wh);
    for (let i = 0; i < 9; i++) {
      const lx = x - 28 + ((i * 17 + t * 60) % 56);
      const ly = wy - wh / 2 + 4 + Math.abs(Math.sin(t * 3 + i * 1.7)) * Math.max(1, wh - 8);
      g.fillStyle(i % 3 === 0 ? BRASS_LIT : BRASS, 1); g.fillCircle(lx, ly, 3.2);
    }
    g.lineStyle(1.5, BRASS_DARK, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(x - 34 + i * 13.6, wy - wh / 2, x - 34 + i * 13.6, wy + wh / 2);
  }
  // Hoops.
  for (const hx of [-L / 2 + 6, -L / 6, L / 6, L / 2 - 6]) {
    g.fillStyle(GILT_DARK, 1); g.fillRect(x + hx - 3, y - R - 1, 6, R * 2 + 2);
    g.fillStyle(GILT, 1); g.fillRect(x + hx - 2, y - R, 3, R * 2);
  }
  // Top highlight and the end-caps.
  g.fillStyle(0xffffff, 0.12); g.fillRect(x - L / 2, y - R * 0.7, L, 5);
  for (const sx of [-1, 1]) {
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x + sx * L / 2, y, 22, R * 2 + 4);
    g.fillStyle(BRASS, 1); g.fillEllipse(x + sx * L / 2, y, 16, R * 2 - 2);
  }
  houseWheel(g, x + L / 2, y, 14, 0.9, rot);
}

/**
 * The weekly numbers board: a tall black board in a gilt frame on two posts, rows of white enamel
 * number tiles, a red banner header and a green lamp either side. One row's tiles flip over in
 * `boardFlip`. `x,y` base centre.
 */
export const BOARD = { w: 170, h: 150, rows: 6, cols: 4 };
export function numbersBoard(g: G, x: number, y: number, rng: () => number): void {
  const { w, h } = BOARD;
  const top = y - 30 - h;
  shadow(g, x, y + 2, w * 1.1, 16);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2 + 10, y - 34, 8, 34); g.fillRect(x + w / 2 - 18, y - 34, 8, 34);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - w / 2 - 6, top - 6, w + 12, h + 12);
  g.fillStyle(GILT, 1); g.fillRect(x - w / 2 - 4, top - 4, w + 8, h + 8);
  g.fillStyle(0x16161c, 1); g.fillRect(x - w / 2, top, w, h);
  // Header banner: THE DRAW, in dots of gilt.
  g.fillStyle(CARD_RED, 1); g.fillRect(x - w / 2 + 6, top + 6, w - 12, 18);
  g.fillStyle(GILT_LIT, 1);
  for (let c = 0; c < 22; c++) if ((c * 7) % 5 !== 0) g.fillRect(x - w / 2 + 16 + c * 6.3, top + 12, 3.5, 6);
  // Tiles.
  for (let r = 0; r < BOARD.rows; r++) {
    for (let c = 0; c < BOARD.cols; c++) {
      const tx = x - w / 2 + 12 + c * 38, ty = top + 32 + r * 19;
      g.fillStyle(0xe8e4d8, 1); g.fillRect(tx, ty, 32, 15);
      g.fillStyle(PIP, 1);
      for (let d = 0; d < 4; d++) { const on = rng(); if (on > 0.2) g.fillRect(tx + 3 + d * 7.4, ty + 3, 4.6, 9); }
    }
  }
  // A paper notice pinned to the post.
  g.fillStyle(0xe8dcc0, 1); g.fillRect(x + w / 2 - 26, y - 64, 22, 28);
  g.lineStyle(1, 0x8a7a60, 1); for (let k = 0; k < 6; k++) g.lineBetween(x + w / 2 - 23, y - 59 + k * 4, x + w / 2 - 8, y - 59 + k * 4);
  g.fillStyle(CARD_RED, 1); g.fillCircle(x + w / 2 - 15, y - 63, 2);
  greenLamp(g, x - w / 2 - 18, y, 92);
  greenLamp(g, x + w / 2 + 18, y, 92);
}

/**
 * The Draw Hall: a civic hall with a gilt dome and a clock in its drum, a portico of four columns
 * painted like stacked chips, a red-and-black frieze of card pips, tall green-lit windows, and
 * "THE DRAW" spelt in gilt letters on the entablature. `x,y` front base centre.
 */
export function drawHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 8, w * 1.12, 40);
  // Steps.
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? STONE : STONE_ALT, 1); g.fillRect(x - 90 - k * 8, y - 16 + k * 4, 180 + k * 16, 5);
  }
  // Body: pale stone with ashlar coursing.
  const top = y - 16 - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(0xd8d0bc, 1); g.fillRect(x0, top, w, h);
  for (let r = 0; r < h / 14; r++) {
    g.lineStyle(1, 0xb0a890, 0.7); g.lineBetween(x0, top + r * 14, x0 + w, top + r * 14);
    for (let c = (r % 2) * 20; c < w; c += 40) g.lineBetween(x0 + c, top + r * 14, x0 + c, top + r * 14 + 14);
  }
  // Tall windows, green-lit, in the wings.
  for (const wx of [x0 + 34, x0 + 74, x0 + w - 74, x0 + w - 34]) {
    g.fillStyle(0x3a3428, 1); g.fillRoundedRect(wx - 12, top + 24, 24, h - 44, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(LAMP_GREEN, 0.75); g.fillRoundedRect(wx - 9, top + 27, 18, h - 50, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.fillStyle(LAMP, 0.35); g.fillRect(wx - 9, top + h * 0.5, 18, 3);
    g.lineStyle(1.5, 0x3a3428, 1); g.lineBetween(wx, top + 27, wx, top + h - 23);
  }
  // Portico: four chip-stack columns holding an entablature.
  const colY = y - 16;
  for (const cx of [-72, -26, 26, 72]) {
    const px = x + cx;
    for (let k = 0; k < Math.floor((h + 4) / 7); k++) {
      const c = k % 2 ? CARD_RED : 0xe8e0cc;
      g.fillStyle(dim(c, 0.3), 1); g.fillRect(px - 10, colY - k * 7 - 7, 20, 7);
      g.fillStyle(c, 1); g.fillRect(px - 9, colY - k * 7 - 7, 15, 6);
    }
  }
  // Entablature with lettering and a frieze of pips.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 100, top - 8, 200, 28);
  g.fillStyle(SQ_BLACK, 1); g.fillRect(x - 96, top - 5, 192, 22);
  g.fillStyle(GILT_LIT, 1);
  // "THE DRAW", blocky.
  const glyphs = ['111 101 111', '101 101 111', '111 110 111', '000 000 000', '110 101 110', '111 110 101', '010 111 101', '101 101 111'];
  glyphs.forEach((gl, i) => {
    const rows = gl.split(' ');
    for (let ry = 0; ry < 3; ry++) for (let rx = 0; rx < 3; rx++) if (rows[ry][rx] === '1') g.fillRect(x - 78 + i * 20 + rx * 4, top + rx * 0 + ry * 5 - 1, 3.5, 4);
  });
  for (let k = 0; k < 24; k++) {
    g.fillStyle(k % 2 ? CARD_RED : CARD_BLACK, 1);
    g.fillCircle(x0 + 10 + k * ((w - 20) / 23), top + h * 0.12, 2.4);
  }
  // Pediment.
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 110, top - 8, x + 110, top - 8, x, top - 52);
  g.fillStyle(0xd8d0bc, 1); g.fillTriangle(x - 102, top - 10, x + 102, top - 10, x, top - 46);
  houseWheel(g, x, top - 24, 12, 1);
  // The dome on its drum, with the clock.
  const dy = top - 46;
  g.fillStyle(0xc8c0aa, 1); g.fillRect(x - 46, dy - 34, 92, 34);
  g.fillStyle(0xe8e0cc, 1); g.fillCircle(x, dy - 17, 14);
  g.lineStyle(2, GILT_DARK, 1); g.strokeCircle(x, dy - 17, 14);
  g.lineStyle(1.5, PIP, 1); g.lineBetween(x, dy - 17, x, dy - 27); g.lineBetween(x, dy - 17, x + 7, dy - 14);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle(PIP, 1); g.fillRect(x + Math.cos(a) * 11 - 0.7, dy - 17 + Math.sin(a) * 11 - 0.7, 1.4, 1.4); }
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, dy - 34, 104, 76);
  g.fillStyle(GILT, 1); g.fillEllipse(x, dy - 36, 96, 70);
  g.fillStyle(SQ_BLACK, 1); g.fillRect(x - 52, dy - 34, 104, 4);
  for (let k = 1; k < 6; k++) { g.lineStyle(1.5, GILT_DARK, 0.8); const a = Math.PI + (k / 6) * Math.PI; g.lineBetween(x + Math.cos(a) * 48, dy - 36 + Math.sin(a) * 4, x, dy - 70); }
  g.fillStyle(GILT_LIT, 0.55); g.fillEllipse(x - 16, dy - 54, 22, 12);
  // Lantern and a die finial.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 3, dy - 82, 6, 12);
  die(g, x, dy - 82, 12, 6, 5, 3, GILT_LIT, GILT_DARK);
  // Doors: two tall black doors, open a crack, lamp light between.
  g.fillStyle(0x221e1a, 1); g.fillRoundedRect(x - 22, colY - 66, 44, 66, { tl: 22, tr: 22, bl: 0, br: 0 });
  g.fillStyle(LAMP, 0.6); g.fillRect(x - 2, colY - 58, 4, 58);
  g.fillStyle(GILT, 1); g.fillCircle(x - 6, colY - 30, 2); g.fillCircle(x + 6, colY - 30, 2);
  // Notices pasted either side of the door.
  for (const nx of [x - 48, x + 48]) {
    g.fillStyle(0xe8dcc0, 1); g.fillRect(nx - 8, colY - 56, 16, 20);
    g.lineStyle(1, 0x8a7a60, 1); for (let k = 0; k < 4; k++) g.lineBetween(nx - 6, colY - 52 + k * 4, nx + 6, colY - 52 + k * 4);
    g.fillStyle(CARD_RED, 1); g.fillCircle(nx, colY - 57, 1.6);
  }
  greenLamp(g, x - 104, y - 2, 70);
  greenLamp(g, x + 104, y - 2, 70);
  // Litter of ticket stubs on the steps.
  for (let k = 0; k < 10; k++) { g.fillStyle(rng() < 0.5 ? 0xe8e0c8 : 0xf0c8c8, 0.8); g.fillRect(x - 80 + rng() * 160, y - 14 + rng() * 14, 5, 3); }
}

/**
 * The pawnshop under the three gold balls: a narrow, tall, crooked shop of black timber, a bow
 * window crowded with pledges (watches, rings, fiddles — and Lots, on a velvet board), the three
 * balls hung from a scrolled iron bracket. `x,y` front base centre.
 */
export function pawnShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.2, 22);
  // Leaning walls of black weatherboard.
  poly(g, [[x0, y], [x0 + 4, top], [x0 + w + 6, top - 4], [x0 + w, y]], 0x2a2420);
  for (let k = 0; k < h / 9; k++) { g.lineStyle(1, 0x3e362e, 1); g.lineBetween(x0 + 1, y - k * 9, x0 + w, y - k * 9 - 0.4 * k * 0.1); }
  // A tall gable with a jettied attic.
  poly(g, [[x0 - 8, top + 2], [x0 + w + 12, top - 2], [x + 6, top - h * 0.5]], 0x1a1614);
  poly(g, [[x0 - 2, top], [x0 + w + 6, top - 3], [x + 6, top - h * 0.46]], SQ_RED_DARK);
  g.fillStyle(LAMP, 0.85); g.fillCircle(x + 4, top - h * 0.2, 7);
  g.lineStyle(1.5, 0x1a1614, 1); g.lineBetween(x - 3, top - h * 0.2, x + 11, top - h * 0.2); g.lineBetween(x + 4, top - h * 0.2 - 7, x + 4, top - h * 0.2 + 7);
  // The bow window full of pledges.
  const bx = x - w * 0.12, by = y - 30;
  g.fillStyle(0x1a1614, 1); g.fillRoundedRect(bx - w * 0.34, by - 54, w * 0.68, 54, 6);
  g.fillStyle(LAMP, 0.55); g.fillRect(bx - w * 0.31, by - 51, w * 0.62, 48);
  g.fillStyle(0x6a1a2a, 1); g.fillRect(bx - w * 0.29, by - 24, w * 0.58, 20); // velvet board
  for (let k = 0; k < 7; k++) lot(g, bx - w * 0.25 + k * (w * 0.5 / 6), by - 13, 3.4, false, 0.95);
  // Pocket watches on hooks, a fiddle, rings in a dish.
  for (let k = 0; k < 4; k++) {
    const wx = bx - w * 0.24 + k * 14;
    g.lineStyle(1, BRASS, 1); g.lineBetween(wx, by - 50, wx, by - 42);
    g.fillStyle(BRASS, 1); g.fillCircle(wx, by - 38, 4.5); g.fillStyle(0xf0ead8, 1); g.fillCircle(wx, by - 38, 3);
  }
  g.fillStyle(0x8a4a22, 1); g.fillEllipse(bx + w * 0.2, by - 36, 9, 18); g.fillRect(bx + w * 0.2 - 1, by - 50, 2, 8);
  g.fillStyle(GILT, 1); for (let k = 0; k < 4; k++) g.fillCircle(bx + w * 0.08 + k * 3, by - 30 + (k % 2), 1.6);
  g.lineStyle(2, 0x1a1614, 1); for (let k = 1; k < 4; k++) g.lineBetween(bx - w * 0.34 + k * w * 0.17, by - 54, bx - w * 0.34 + k * w * 0.17, by);
  // The door, barred.
  const dx = x + w * 0.32;
  g.fillStyle(0x120e0c, 1); g.fillRect(dx - 12, y - 40, 24, 40);
  g.fillStyle(0x3a2a22, 1); g.fillRect(dx - 10, y - 38, 20, 38);
  g.lineStyle(1.5, 0x8a8478, 1); for (let k = 0; k < 3; k++) g.lineBetween(dx - 10, y - 30 + k * 10, dx + 10, y - 30 + k * 10);
  g.fillStyle(GILT, 1); g.fillCircle(dx + 6, y - 18, 1.6);
  // Bracket and the three gold balls.
  const kx = x0 + w + 4, ky = top + 20;
  g.lineStyle(3, 0x1a1614, 1); g.lineBetween(kx, ky, kx + 40, ky);
  g.lineStyle(2, 0x1a1614, 1); g.beginPath(); g.arc(kx + 12, ky + 12, 12, Math.PI, Math.PI * 1.5, false); g.strokePath();
  g.lineStyle(1, 0x5a5048, 1); g.lineBetween(kx + 36, ky, kx + 36, ky + 12);
  const balls: [number, number][] = [[kx + 30, ky + 20], [kx + 42, ky + 20], [kx + 36, ky + 31]];
  for (const [bx2, by2] of balls) {
    g.fillStyle(GILT_DARK, 1); g.fillCircle(bx2, by2 + 1, 7);
    g.fillStyle(GILT, 1); g.fillCircle(bx2, by2, 6.5);
    g.fillStyle(GILT_LIT, 0.9); g.fillCircle(bx2 - 2, by2 - 2, 2.2);
  }
  for (let k = 0; k < 4; k++) { g.fillStyle(0x000000, 0.2); g.fillRect(x0 + rng() * w, y - rng() * 8, 4, 2); }
}

/**
 * The spinning-top lighthouse's rock and plinth: a black skerry, a round stone plinth with a gilt
 * rail, the keeper's whip hanging on a hook. The top itself spins in `topSpin`. `x,y` base centre.
 */
export function topPlinth(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 150, 40);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    g.fillStyle(k % 2 ? 0x2e2c30 : 0x3a383c, 1);
    g.fillEllipse(x + Math.cos(a) * 52, y + Math.sin(a) * 12 - 2, 46 + rng() * 14, 26);
  }
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y - 8, 96, 30);
  g.fillStyle(STONE, 1); g.fillEllipse(x, y - 12, 92, 26);
  g.fillStyle(STONE_ALT, 1); g.fillEllipse(x, y - 14, 78, 18);
  g.lineStyle(2, GILT, 1); g.strokeEllipse(x, y - 18, 86, 22);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(x + Math.cos(a) * 43, y - 18 + Math.sin(a) * 11, x + Math.cos(a) * 43, y - 10 + Math.sin(a) * 11); }
  // The whip on its post.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x + 46, y - 54, 4, 44);
  g.lineStyle(1.5, 0x3a2a1a, 1);
  g.beginPath(); g.moveTo(x + 48, y - 52);
  for (let k = 1; k <= 10; k++) g.lineTo(x + 48 + Math.sin(k * 0.8) * 5, y - 52 + k * 4);
  g.strokePath();
}

/**
 * The lighthouse proper: a great spinning top, striped red and ivory, standing on its point on the
 * plinth and turning; its body precesses a little, the stripes slide round, a gilt crown holds the
 * lamp at its stem. Drawn per frame. `x,y` is the point it spins on.
 */
export function topSpin(g: G, x: number, y: number, t: number): void {
  const wob = Math.sin(t * 0.9) * 0.05;
  const lean = (dy: number): number => x + dy * wob;
  const H = 150, R = 50;
  const cy = y - 60; // widest point
  // Shadow cast round the plinth, rotating.
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x + Math.cos(t * 1.4) * 8, y - 6, 70, 14);
  // Lower cone to the point.
  poly(g, [[lean(-60) - R, cy], [lean(-60) + R, cy], [x, y - 10]], 0xb8283a);
  // Stripes on the body: bands that slide by phase.
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const ph = (t * 2.6 + i / bands) % 1;
    const sx = Math.sin(ph * Math.PI * 2) * R;
    const front = Math.cos(ph * Math.PI * 2) > 0;
    if (!front) continue;
    g.lineStyle(7, IVORY, 0.95);
    g.lineBetween(lean(-60) + sx, cy, x + sx * 0.12, y - 12);
    g.lineBetween(lean(-60) + sx, cy, lean(-120) + sx * 0.4, cy - 52);
  }
  // Upper dome: rounded shoulder over the widest band.
  g.fillStyle(0xc8303e, 1); g.fillEllipse(lean(-60), cy, R * 2, 26);
  g.fillStyle(GILT, 1); g.fillEllipse(lean(-60), cy, R * 2, 8);
  g.fillStyle(GILT_LIT, 0.8); g.fillEllipse(lean(-60) - 16, cy - 2, 20, 3);
  poly(g, [[lean(-60) - R + 2, cy - 4], [lean(-60) + R - 2, cy - 4], [lean(-120) + 16, cy - 54], [lean(-120) - 16, cy - 54]], 0xd8384a, 0.92);
  for (let i = 0; i < bands; i++) {
    const ph = (t * 2.6 + i / bands) % 1;
    if (Math.cos(ph * Math.PI * 2) <= 0) continue;
    const sx = Math.sin(ph * Math.PI * 2);
    g.lineStyle(6, IVORY, 0.9); g.lineBetween(lean(-60) + sx * (R - 4), cy - 4, lean(-120) + sx * 15, cy - 54);
  }
  // Highlight down the body.
  g.fillStyle(0xffffff, 0.12); g.fillEllipse(lean(-80) - 22, cy - 14, 10, 50);
  // The stem with the lamp room: gilt crown, glass, a green-shaded lamp inside.
  const sy = cy - 54;
  g.fillStyle(GILT_DARK, 1); g.fillRect(lean(-130) - 18, sy - 8, 36, 10);
  g.fillStyle(0x223a3a, 1); g.fillRect(lean(-140) - 14, sy - 32, 28, 24);
  g.fillStyle(LAMP, 0.9); g.fillRect(lean(-140) - 11, sy - 29, 22, 18);
  g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(lean(-140), sy - 32, lean(-140), sy - 8);
  g.fillStyle(GILT, 1); g.fillTriangle(lean(-150) - 18, sy - 32, lean(-150) + 18, sy - 32, lean(-160), sy - H * 0.36);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(lean(-165), sy - H * 0.37, 4);
}

/**
 * The Lot Wall: a long wall of old red brick under a gilt coping, hung nail by nail with the Lots
 * of the busted — snapped in two, a black chip on each chain where the brass was. Some have a
 * scrap of ribbon tied on, or a pressed flower. `x,y` base centre.
 */
export function lotWall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.05, 18);
  g.fillStyle(0x5a2a22, 1); g.fillRect(x0, top, w, h);
  for (let r = 0; r < h / 8; r++) {
    for (let c = (r % 2) * 9; c < w; c += 18) {
      g.fillStyle(mixC(0x8a3a2a, 0x6a2a22, rng()), 1); g.fillRect(x0 + c + 1, top + r * 8 + 1, 16, 6);
    }
  }
  g.fillStyle(GILT_DARK, 1); g.fillRect(x0 - 6, top - 10, w + 12, 10);
  g.fillStyle(GILT, 1); g.fillRect(x0 - 6, top - 12, w + 12, 5);
  // The hung Lots.
  for (let i = 0; i < w / 9; i++) {
    for (let r = 0; r < 3; r++) {
      if (rng() < 0.18) continue;
      const lx = x0 + 6 + i * 9 + (r % 2) * 4, ly = top + 14 + r * ((h - 22) / 3) + rng() * 4;
      g.fillStyle(0x8a8478, 1); g.fillRect(lx - 0.7, ly - 7, 1.4, 2);
      lot(g, lx, ly, 3, true, 0.95);
      if (rng() < 0.08) { g.fillStyle([0xe8a0b8, 0x6aa0e8, 0xf0e070][Math.floor(rng() * 3)], 1); g.fillRect(lx - 1, ly - 5, 4, 2); g.fillRect(lx + 1, ly - 4, 1.5, 5); }
    }
  }
  // A brass plaque in the middle.
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 34, y - h * 0.5 - 12, 68, 24, 4);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 32, y - h * 0.5 - 10, 64, 20, 3);
  g.fillStyle(BRASS_DARK, 1); for (let k = 0; k < 9; k++) g.fillRect(x - 26 + k * 6, y - h * 0.5 - 3, 4, 6);
  // Candle stubs and a jar of flowers at the foot.
  for (let k = 0; k < 7; k++) {
    const cx = x0 + 30 + rng() * (w - 60);
    g.fillStyle(0xe8e0c8, 1); g.fillRect(cx - 2, y - 8, 4, 7);
    g.fillStyle(0xffd070, 0.9); g.fillCircle(cx, y - 10, 2);
  }
  g.fillStyle(0x8ab8b0, 0.7); g.fillRect(x + 50, y - 14, 10, 13);
  g.fillStyle(0x4a8a3a, 1); g.fillRect(x + 54, y - 22, 2, 9);
  g.fillStyle(0x6a8ae8, 1); g.fillCircle(x + 52, y - 23, 3); g.fillCircle(x + 58, y - 22, 3);
}

/**
 * The Draw Bell's tower: a slim campanile of pale stone with a gilt cupola, an open belfry with the
 * bell that rings the Draw in, a clock face whose hands are a croupier's rake and a die on a stick.
 * `x,y` base centre.
 */
export function bellTower(g: G, x: number, y: number, rng: () => number): void {
  const w = 70, h = 230;
  shadow(g, x, y + 4, w * 1.6, 22);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - w / 2 - 4, y - 14, w + 8, 14);
  g.fillStyle(0xd8d0bc, 1); g.fillRect(x - w / 2, y - h, w, h - 12);
  for (let r = 0; r < h / 16; r++) { g.lineStyle(1, 0xb0a890, 0.7); g.lineBetween(x - w / 2, y - 14 - r * 16, x + w / 2, y - 14 - r * 16); }
  g.fillStyle(0x000000, 0.12); g.fillRect(x + w / 2 - 12, y - h, 12, h - 12);
  // Door.
  g.fillStyle(0x221e1a, 1); g.fillRoundedRect(x - 12, y - 46, 24, 34, { tl: 12, tr: 12, bl: 0, br: 0 });
  // Clock: rake and die-stick for hands.
  const cy = y - h + 88;
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, cy, 27);
  g.fillStyle(IVORY, 1); g.fillCircle(x, cy, 24);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle(k % 3 ? PIP : CARD_RED, 1); g.fillCircle(x + Math.cos(a) * 19, cy + Math.sin(a) * 19, k % 3 ? 1.3 : 2.4); }
  g.lineStyle(2, PIP, 1); g.lineBetween(x, cy, x + 12, cy - 9);
  g.lineBetween(x + 9, cy - 13, x + 15, cy - 5);
  g.lineStyle(1.5, PIP, 1); g.lineBetween(x, cy, x - 3, cy - 18);
  g.fillStyle(PIP, 1); g.fillRect(x - 6, cy - 22, 6, 6);
  // Belfry with the bell.
  const by = y - h + 46;
  g.fillStyle(0x2a2420, 1); g.fillRoundedRect(x - 24, by - 34, 48, 40, { tl: 20, tr: 20, bl: 0, br: 0 });
  g.fillStyle(BRASS_DARK, 1); poly(g, [[x - 16, by], [x + 16, by], [x + 10, by - 22], [x - 10, by - 22]], BRASS_DARK);
  g.fillStyle(BRASS, 1); poly(g, [[x - 14, by - 2], [x + 12, by - 2], [x + 8, by - 22], [x - 8, by - 22]], BRASS);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x - 8, by - 18, 3, 14);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, by, 34, 6);
  // Cupola.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - w / 2 - 6, y - h - 6, w + 12, 8);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - h - 8, w, 50);
  g.fillStyle(GILT_LIT, 0.6); g.fillEllipse(x - 10, y - h - 20, 16, 10);
  g.fillStyle(SQ_BLACK, 1); g.fillRect(x - w / 2 - 6, y - h - 7, w + 12, 3);
  g.fillStyle(GILT, 1); g.fillRect(x - 2, y - h - 48, 4, 16);
  houseWheel(g, x, y - h - 52, 8, 1);
  bunting(g, { x: x - w / 2, y: y - h + 120 }, { x: x - w / 2 - 110, y: y - 40 }, 18, 9);
  for (let k = 0; k < 5; k++) { g.fillStyle(0x000000, 0.15); g.fillRect(x - w / 2 + rng() * w, y - rng() * 6, 3, 2); }
}

/** A clinker hull on the boatwright's stocks: keel up on trestles, half-planked, a berth-number on the bow. */
export function hullOnStocks(g: G, x: number, y: number, len: number, rng: () => number): void {
  shadow(g, x, y + 4, len * 1.1, 26);
  for (const tx of [-len * 0.34, 0, len * 0.34]) {
    g.fillStyle(PLANK_DARK, 1); g.fillRect(x + tx - 14, y - 26, 28, 5);
    g.fillRect(x + tx - 12, y - 26, 4, 26); g.fillRect(x + tx + 8, y - 26, 4, 26);
  }
  // Hull side.
  const top = y - 70;
  poly(g, [[x - len / 2, top], [x + len / 2 + 14, top - 12], [x + len / 2 - 10, y - 26], [x - len / 2 + 20, y - 26]], 0x6a4a2e);
  for (let k = 0; k < 6; k++) {
    const yy = top + 4 + k * 7;
    g.fillStyle(k % 2 ? 0x7a5a3a : 0x5a3e26, 1);
    poly(g, [[x - len / 2 + k * 3, yy], [x + len / 2 + 12 - k * 4, yy - 12 + k * 1.2], [x + len / 2 + 12 - k * 4, yy - 7 + k * 1.2], [x - len / 2 + k * 3, yy + 5]], k % 2 ? 0x7a5a3a : 0x5a3e26);
  }
  // Ribs showing where the planking stops.
  for (let k = 0; k < 6; k++) { g.lineStyle(3, PLANK_DARK, 1); const rx = x - len / 2 + 14 + k * 12; g.lineBetween(rx, top - 2, rx + 6, y - 28); }
  g.fillStyle(CARD_RED, 1); g.fillRect(x - len / 2 - 2, top - 3, len + 18, 4);
  // The berth number on the bow, in a gilt chip.
  chip(g, x + len / 2 - 6, top + 16, 9, CARD_RED);
  g.fillStyle(GILT_LIT, 1); g.fillRect(x + len / 2 - 10, top + 14, 2, 4); g.fillRect(x + len / 2 - 6, top + 14, 2, 4);
  // Shavings and a saw.
  for (let k = 0; k < 14; k++) { g.fillStyle(0xd8b888, 0.9); g.fillEllipse(x - len / 2 + rng() * len, y - 2 + rng() * 10, 5, 2); }
  g.fillStyle(0x9a9a9a, 1); poly(g, [[x + 20, y + 2], [x + 52, y - 2], [x + 52, y + 4], [x + 20, y + 6]], 0x9a9a9a);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x + 12, y, 10, 6);
}
