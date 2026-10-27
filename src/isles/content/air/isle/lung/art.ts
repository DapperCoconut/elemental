import { type G, dim, lit } from '../../../../art/IsleArt';

/**
 * Shared drawing for the Lung — King Aerion's windmill-palace on Highspire's summit. His sigil,
 * the brass breath-meter every chest on the isle wears, the corked bottles of stolen breath, the
 * great leather bellows, weathervanes and windmill sails, and the becalmed: debtors laid asleep in
 * rows, barely breathing, a meter on every chest reading empty. Used by the palace, the warden
 * floor, the warden gimmicks and the King himself, so the Lung is painted in one hand.
 */

// ── Palette — sky through tall windows, pale limed oak, saddle leather, brass and bottle-glass ──

/** The open sky the palace stands in. */
export const SKY = 0x8ec8f0;
export const SKY_DEEP = 0x3a78b8;
export const CLOUD = 0xf2f8ff;
export const CLOUD_SHADE = 0xb8cce0;
/** Limed oak — windmill floors, scrubbed pale. */
export const OAK = 0xc8b494;
export const OAK_DARK = 0x6a5a44;
/** The bellows' hide. */
export const LEATHER = 0x7a4a2a;
export const LEATHER_DARK = 0x3a2214;
export const BRASS = 0xe0b84a;
export const BRASS_DARK = 0x8a6a22;
/** Bottle-glass, faintly blue, and the stolen breath swirling inside it. */
export const GLASS = 0xc8e8f8;
export const BREATH = 0xe8fbff;
export const CORK = 0xb88a5a;
/** The King's colour: a cold, high, royal sky-violet. */
export const ROYAL = 0x6a6ad8;
export const ROYAL_DEEP = 0x2a2a6a;
/** Sailcloth. */
export const SAILCLOTH = 0xe8dcc0;
export const IRON = 0x2a2e36;
/** The meters' warning red — the tax is overdue. */
export const OVERDUE = 0xe0443a;
/** The becalmed's skin goes grey-blue, like breath on cold glass. */
export const BECALMED_SKINS = [0xc8b8b0, 0xa89890, 0xb8a8a8, 0x988880, 0xd0c4bc, 0x8a7a74];

/**
 * King Aerion's sigil — a breath-meter's dial (a half-moon of brass with ticks and a needle laid
 * flat at EMPTY) under a crown of four tiny windmill sails. It is stamped on every meter on the
 * isle, every cork, and every ledger page that says a family has fallen behind.
 */
export function aerionSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  const w = Math.max(1.3, r * 0.12);
  g.lineStyle(w, color, a);
  g.beginPath(); g.arc(x, y + r * 0.3, r * 0.7, Math.PI, 0, false); g.strokePath();
  g.lineBetween(x - r * 0.7, y + r * 0.3, x + r * 0.7, y + r * 0.3);
  for (let k = 0; k <= 6; k++) {
    const ang = Math.PI + (k / 6) * Math.PI;
    g.lineBetween(x + Math.cos(ang) * r * 0.55, y + r * 0.3 + Math.sin(ang) * r * 0.55, x + Math.cos(ang) * r * 0.7, y + r * 0.3 + Math.sin(ang) * r * 0.7);
  }
  // The needle, laid down flat at EMPTY.
  g.lineBetween(x, y + r * 0.3, x - r * 0.5, y + r * 0.26);
  g.fillStyle(color, a); g.fillCircle(x, y + r * 0.3, r * 0.08);
  // The sail-crown: four little sails turning on a hub over the dial.
  const cy = y - r * 0.55;
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const ex = x + Math.cos(ang) * r * 0.42, ey = cy + Math.sin(ang) * r * 0.42;
    g.lineBetween(x, cy, ex, ey);
    const nx = -Math.sin(ang) * r * 0.1, ny = Math.cos(ang) * r * 0.1;
    g.fillTriangle(x + Math.cos(ang) * r * 0.14, cy + Math.sin(ang) * r * 0.14, ex, ey, ex + nx, ey + ny);
  }
  g.fillCircle(x, cy, r * 0.07);
}

/**
 * A brass breath-meter, as worn on the chest — a round gauge, a needle, the red OVERDUE wedge at
 * the bottom of the scale. `fill` 0–1 sets the needle.
 */
export function breathMeter(g: G, x: number, y: number, r: number, fill: number, a = 1): void {
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(0xf4ecd8, a); g.fillCircle(x, y, r);
  // The scale runs from 7 o'clock (empty) round over the top to 5 o'clock (full).
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  g.lineStyle(Math.max(1, r * 0.22), OVERDUE, a * 0.9);
  g.beginPath(); g.arc(x, y, r * 0.72, a0, a0 + (a1 - a0) * 0.2, false); g.strokePath();
  g.lineStyle(Math.max(1, r * 0.1), 0x3a3a3a, a * 0.7);
  for (let k = 0; k <= 4; k++) {
    const ang = a0 + ((a1 - a0) * k) / 4;
    g.lineBetween(x + Math.cos(ang) * r * 0.6, y + Math.sin(ang) * r * 0.6, x + Math.cos(ang) * r * 0.85, y + Math.sin(ang) * r * 0.85);
  }
  const na = a0 + (a1 - a0) * Math.max(0, Math.min(1, fill));
  g.lineStyle(Math.max(1, r * 0.14), 0x1a1a1a, a);
  g.lineBetween(x, y, x + Math.cos(na) * r * 0.78, y + Math.sin(na) * r * 0.78);
  g.fillStyle(BRASS, a); g.fillCircle(x, y, Math.max(1, r * 0.16));
}

/**
 * A corked bottle of someone's breath: a round-bellied flask of blue glass, a cork with the
 * King's wax seal on it, a debt-tag on a string, and the breath inside turning slowly over
 * itself like a held sigh. `t` in seconds animates the swirl.
 */
export function breathBottle(g: G, x: number, y: number, s: number, t: number, a = 1, cracked = false): void {
  g.fillStyle(0x000000, 0.22 * a); g.fillEllipse(x, y + 1, 22 * s, 6 * s);
  // Belly and neck.
  g.fillStyle(dim(GLASS, 0.35), a * 0.7); g.fillCircle(x, y - 11 * s, 11 * s);
  g.fillRect(x - 4 * s, y - 30 * s, 8 * s, 12 * s);
  g.fillStyle(GLASS, a * 0.42); g.fillCircle(x, y - 11 * s, 10 * s);
  g.fillRect(x - 3 * s, y - 29 * s, 6 * s, 12 * s);
  // The breath, curling.
  for (let k = 0; k < 3; k++) {
    const ang = t * 1.6 + k * 2.1;
    g.fillStyle(BREATH, a * 0.75);
    g.fillEllipse(x + Math.cos(ang) * 4.5 * s, y - 11 * s + Math.sin(ang) * 3.5 * s, 7 * s, 4 * s);
  }
  // Highlight, cork and seal.
  g.fillStyle(0xffffff, a * 0.6); g.fillEllipse(x - 5 * s, y - 15 * s, 2.5 * s, 6 * s);
  g.fillStyle(CORK, a); g.fillRect(x - 3.5 * s, y - 35 * s, 7 * s, 6 * s);
  g.fillStyle(ROYAL, a); g.fillCircle(x, y - 33 * s, 2 * s);
  // The debt tag.
  g.lineStyle(1, 0x5a4a3a, a); g.lineBetween(x + 3 * s, y - 26 * s, x + 9 * s, y - 20 * s);
  g.fillStyle(0xf0e6c8, a); g.fillRect(x + 7 * s, y - 20 * s, 7 * s, 5 * s);
  if (cracked) {
    g.lineStyle(1.2, 0xffffff, a);
    g.lineBetween(x - 6 * s, y - 18 * s, x - 1 * s, y - 10 * s); g.lineBetween(x - 1 * s, y - 10 * s, x + 4 * s, y - 14 * s);
    g.lineBetween(x - 1 * s, y - 10 * s, x + 1 * s, y - 3 * s);
  }
}

/**
 * Great leather bellows seen from above, nozzle pointing along `ang`. `open` 0–1: how full of
 * air they are (folds spread wide when full, crushed flat when blown).
 */
export function bellows(g: G, x: number, y: number, len: number, ang: number, open: number, a = 1): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u: number, v: number): { x: number; y: number } => ({ x: x + ca * u - sa * v, y: y + sa * u + ca * v });
  const half = len * (0.22 + 0.2 * open);
  // The two boards, hinged at the nozzle end.
  const back0 = P(-len * 0.5, -half), back1 = P(-len * 0.5, half), front0 = P(len * 0.35, -len * 0.12), front1 = P(len * 0.35, len * 0.12);
  g.fillStyle(0x000000, 0.25 * a);
  g.fillTriangle(back0.x + 6, back0.y + 8, back1.x + 6, back1.y + 8, front1.x + 6, front1.y + 8);
  // Hide, with folds.
  g.fillStyle(LEATHER_DARK, a);
  g.fillTriangle(back0.x, back0.y, back1.x, back1.y, front0.x, front0.y);
  g.fillTriangle(back1.x, back1.y, front1.x, front1.y, front0.x, front0.y);
  g.fillStyle(LEATHER, a);
  const inset = 0.88;
  const b0 = P(-len * 0.5 * inset, -half * inset), b1 = P(-len * 0.5 * inset, half * inset);
  g.fillTriangle(b0.x, b0.y, b1.x, b1.y, front0.x, front0.y);
  g.fillTriangle(b1.x, b1.y, front1.x, front1.y, front0.x, front0.y);
  g.lineStyle(2, LEATHER_DARK, a * 0.8);
  for (let k = 1; k < 6; k++) {
    const u = -len * 0.5 + (k / 6) * len * 0.85;
    const v = half * (1 - (k / 6) * 0.85) * 0.92;
    const p0 = P(u, -v), p1 = P(u, v);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  // Brass studs along the board edges, the handles, and the nozzle.
  g.fillStyle(BRASS, a);
  for (let k = 0; k <= 4; k++) {
    const f = k / 4;
    const e0 = P(-len * 0.5 + f * len * 0.85, -half * (1 - f * 0.86)), e1 = P(-len * 0.5 + f * len * 0.85, half * (1 - f * 0.86));
    g.fillCircle(e0.x, e0.y, 2.4); g.fillCircle(e1.x, e1.y, 2.4);
  }
  const h0 = P(-len * 0.62, -half * 0.7), h1 = P(-len * 0.62, half * 0.7);
  g.lineStyle(5, OAK_DARK, a); g.lineBetween(back0.x, back0.y, h0.x, h0.y); g.lineBetween(back1.x, back1.y, h1.x, h1.y);
  const n0 = P(len * 0.3, 0), n1 = P(len * 0.62, 0);
  g.lineStyle(len * 0.11, BRASS_DARK, a); g.lineBetween(n0.x, n0.y, n1.x, n1.y);
  g.lineStyle(len * 0.07, BRASS, a); g.lineBetween(n0.x, n0.y, n1.x, n1.y);
  g.fillStyle(lit(BRASS, 0.3), a); g.fillCircle(n1.x, n1.y, len * 0.05);
}

/**
 * One of the becalmed, laid on a pallet: a grey-blue sleeper under a thin blanket, a brass meter
 * strapped on their chest reading empty, and a glass tube running from their lips to the pipes.
 * They breathe — once every four seconds or so, so shallow you have to watch for it.
 */
export function sleeper(g: G, x: number, y: number, s: number, t: number, skin: number, tube = true): void {
  const breath = Math.max(0, Math.sin(t * 1.5 + x * 0.013)) ** 6;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 3 * s, 64 * s, 12 * s);
  // Pallet.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 32 * s, y - 8 * s, 64 * s, 12 * s);
  g.fillStyle(dim(OAK, 0.2), 1); g.fillRect(x - 30 * s, y - 10 * s, 60 * s, 8 * s);
  // Blanket and body.
  g.fillStyle(0x5a6a8a, 1); g.fillRoundedRect(x - 18 * s, y - 16 * s - breath * 1.5 * s, 44 * s, 12 * s + breath * 1.5 * s, 4 * s);
  g.fillStyle(lit(0x5a6a8a, 0.15), 1); g.fillRect(x - 18 * s, y - 16 * s - breath * 1.5 * s, 44 * s, 2 * s);
  // Head on a thin pillow.
  g.fillStyle(0xe8e0d0, 1); g.fillEllipse(x - 24 * s, y - 10 * s, 14 * s, 8 * s);
  g.fillStyle(skin, 1); g.fillCircle(x - 22 * s, y - 14 * s, 6.5 * s);
  g.lineStyle(1, dim(skin, 0.5), 1); g.lineBetween(x - 25 * s, y - 15 * s, x - 23 * s, y - 15 * s);
  // The meter on the chest.
  breathMeter(g, x - 6 * s, y - 18 * s - breath * 1.5 * s, 4.5 * s, 0.03, 1);
  if (tube) {
    g.lineStyle(1.5 * s, GLASS, 0.7); g.lineBetween(x - 18 * s, y - 13 * s, x - 30 * s, y - 26 * s);
  }
  // The breath itself, when it comes — a faint puff that is drawn up the tube.
  if (breath > 0.15) {
    g.fillStyle(BREATH, breath * 0.6); g.fillCircle(x - 28 * s, y - 22 * s - breath * 8 * s, 2.5 * s);
  }
}

/** A weathervane (seen from above): an arrow with a fletched tail on a brass hub. */
export function weathervane(g: G, x: number, y: number, ang: number, len: number, a = 1, col = IRON): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const head = { x: x + ca * len, y: y + sa * len }, tail = { x: x - ca * len * 0.85, y: y - sa * len * 0.85 };
  g.lineStyle(Math.max(3, len * 0.045), col, a); g.lineBetween(tail.x, tail.y, head.x, head.y);
  g.lineStyle(Math.max(1, len * 0.015), lit(col, 0.35), a); g.lineBetween(tail.x, tail.y, head.x, head.y);
  // The arrowhead.
  const nx = -sa, ny = ca;
  g.fillStyle(col, a);
  g.fillTriangle(head.x + ca * len * 0.12, head.y + sa * len * 0.12, head.x + nx * len * 0.08, head.y + ny * len * 0.08, head.x - nx * len * 0.08, head.y - ny * len * 0.08);
  // The fletched tail: a broad scroll of sheet iron that takes the wind.
  const f0 = { x: tail.x + ca * len * 0.28, y: tail.y + sa * len * 0.28 };
  g.fillTriangle(tail.x + nx * len * 0.16, tail.y + ny * len * 0.16, tail.x - nx * len * 0.16, tail.y - ny * len * 0.16, f0.x, f0.y);
  g.fillStyle(BRASS, a * 0.85);
  g.fillTriangle(tail.x + nx * len * 0.1, tail.y + ny * len * 0.1, tail.x - nx * len * 0.1, tail.y - ny * len * 0.1, f0.x - ca * 4, f0.y - sa * 4);
  // The hub.
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y, Math.max(5, len * 0.07));
  g.fillStyle(BRASS, a); g.fillCircle(x, y, Math.max(3.5, len * 0.05));
}

/**
 * A windmill sail-arm: a whip of timber with a lattice of laths, half clothed in sailcloth.
 * `ang` points from the hub to the tip.
 */
export function sailArm(g: G, hx: number, hy: number, ang: number, len: number, width: number, a = 1, cloth = SAILCLOTH): void {
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
  const s0 = len * 0.16;
  const P = (u: number, v: number): { x: number; y: number } => ({ x: hx + ca * u + nx * v, y: hy + sa * u + ny * v });
  // Sailcloth on the lattice (the trailing side).
  const c0 = P(s0, 2), c1 = P(len, 2), c2 = P(len, width), c3 = P(s0, width * 0.85);
  g.fillStyle(cloth, a * 0.85); g.fillTriangle(c0.x, c0.y, c1.x, c1.y, c2.x, c2.y); g.fillTriangle(c0.x, c0.y, c2.x, c2.y, c3.x, c3.y);
  // The lattice.
  g.lineStyle(2, OAK_DARK, a);
  const l0 = P(s0, width * 0.85), l1 = P(len, width);
  g.lineBetween(l0.x, l0.y, l1.x, l1.y);
  for (let k = 0; k <= 8; k++) {
    const u = s0 + ((len - s0) * k) / 8;
    const p0 = P(u, 0), p1 = P(u, width * (0.85 + 0.15 * (k / 8)));
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
  // The whip.
  const w0 = P(0, 0), w1 = P(len, 0);
  g.lineStyle(Math.max(4, width * 0.18), dim(OAK_DARK, 0.2), a); g.lineBetween(w0.x, w0.y, w1.x, w1.y);
  g.lineStyle(Math.max(2, width * 0.08), OAK, a); g.lineBetween(w0.x, w0.y, w1.x, w1.y);
}

/** A soft cumulus puff (several overlapping circles, shaded underneath). */
export function cloudPuff(g: G, x: number, y: number, s: number, a = 1, col = CLOUD): void {
  g.fillStyle(CLOUD_SHADE, a * 0.8);
  g.fillEllipse(x, y + 6 * s, 70 * s, 22 * s);
  g.fillStyle(col, a);
  g.fillCircle(x - 20 * s, y, 15 * s); g.fillCircle(x, y - 8 * s, 20 * s); g.fillCircle(x + 22 * s, y - 2 * s, 14 * s);
  g.fillEllipse(x, y + 4 * s, 66 * s, 18 * s);
  g.fillStyle(0xffffff, a * 0.6); g.fillCircle(x - 6 * s, y - 14 * s, 7 * s);
}

/** A streak of visible wind — a thin comet of air with a curl at its head. */
export function windStreak(g: G, x: number, y: number, ang: number, len: number, a = 0.5, col = BREATH): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  g.lineStyle(2, col, a);
  g.lineBetween(x - ca * len, y - sa * len, x, y);
  g.lineStyle(1.2, col, a * 0.6);
  g.beginPath(); g.arc(x - sa * 4, y + ca * 4, 4, ang - Math.PI / 2, ang + Math.PI, false); g.strokePath();
}

/** A great brass pipe run (horizontal or vertical), with collars at intervals. */
export function pipe(g: G, x0: number, y0: number, x1: number, y1: number, w: number): void {
  g.lineStyle(w + 4, BRASS_DARK, 1); g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(w, BRASS, 1); g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(Math.max(1, w * 0.25), lit(BRASS, 0.35), 1);
  const horiz = Math.abs(x1 - x0) > Math.abs(y1 - y0);
  if (horiz) g.lineBetween(x0, y0 - w * 0.25, x1, y1 - w * 0.25); else g.lineBetween(x0 - w * 0.25, y0, x1 - w * 0.25, y1);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.floor(len / 90);
  for (let k = 1; k < n; k++) {
    const f = k / n;
    const cx = x0 + (x1 - x0) * f, cy = y0 + (y1 - y0) * f;
    g.fillStyle(BRASS_DARK, 1);
    if (horiz) g.fillRect(cx - 3, cy - w * 0.7, 6, w * 1.4); else g.fillRect(cx - w * 0.7, cy - 3, w * 1.4, 6);
  }
}
