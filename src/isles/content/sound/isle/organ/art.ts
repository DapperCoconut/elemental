import { type G, dim, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * The Great Organ's palette and set pieces — shared by the area painter, the warden floor, the
 * warden gimmicks, Cadenza's signatures and his baton.
 *
 * The Organ is built of three things: tin-and-lead pipe metal (the "silver" — cold, polished,
 * banded with reflections), black oak casework with gilt carving, and the leather of the bellows
 * that breathe for it. Over all of it hangs the Maestro's notation: staves, clefs, fermatas, the
 * D.C. sign — and in the Voice Loft, the white silk ribbons of the muted, tied round the pipes
 * their voices are sealed in.
 */

export const SILVER = 0xc8d0dc;
export const SILVER_LIT = 0xf2f6fc;
export const SILVER_DARK = 0x5a6474;
export const SILVER_DEEP = 0x2a303c;
export const GILT = 0xd8b048;
export const GILT_LIT = 0xffe8a0;
export const GILT_DARK = 0x7a5a18;
export const OAK = 0x3a2416;
export const OAK_LIT = 0x5e3c24;
export const OAK_DARK = 0x1c100a;
export const LEATHER = 0x8a4a2a;
export const LEATHER_LIT = 0xb87048;
export const LEATHER_DARK = 0x4a2414;
export const IVORY = 0xf0e8d0;
export const EBONY = 0x18141a;
export const CANDLE = 0xffd27a;
export const GHOST = 0xbfe4ff;
export const GHOST_DEEP = 0x4a7ab0;
export const RIBBON = 0xfaf8f2;
export const WAX_RED = 0xa82030;
export const ROSE_RED = 0xc83040;
export const ROSE_BLUE = 0x3050c8;
export const ROSE_GOLD = 0xe8b830;
export const VIOLET = 0x6a3aa0;
export const INK = 0x14101a;

/**
 * A flue pipe standing on its foot: the conical foot, the flat mouth with its upper lip and
 * languid, and the long body with banded reflections. `x,y` is the foot's tip (its base line).
 * `sealed` ties a white silk ribbon round it under a red wax seal — a voice is inside.
 */
export function organPipe(
  g: G, x: number, y: number, w: number, h: number,
  o: { metal?: number; sealed?: boolean; glow?: number; mouthOpen?: number } = {},
): void {
  const m = o.metal ?? SILVER;
  const foot = Math.min(h * 0.22, w * 1.6);
  const top = y - h;
  // The conical foot, narrowing to the toe that sits in the windchest.
  g.fillStyle(dim(m, 0.45), 1);
  g.fillTriangle(x - w / 2, y - foot, x + w / 2, y - foot, x, y);
  g.fillStyle(m, 1);
  g.fillTriangle(x - w / 2 + 2, y - foot, x + w / 2 - 6, y - foot, x - 1, y - 2);
  // The body: a cylinder shaded across its width in bands.
  const bands = [0.55, 0.3, 0, -0.35, -0.6, -0.2, 0.25];
  const bw = w / bands.length;
  for (let i = 0; i < bands.length; i++) {
    const k = bands[i];
    g.fillStyle(k >= 0 ? dim(m, k) : lit(m, -k), 1);
    g.fillRect(x - w / 2 + i * bw, top, bw + 0.6, h - foot);
  }
  // The rolled top lip.
  g.fillStyle(dim(m, 0.5), 1); g.fillEllipse(x, top, w, Math.max(3, w * 0.28));
  g.fillStyle(SILVER_DEEP, 1); g.fillEllipse(x, top, w * 0.72, Math.max(2, w * 0.16));
  // The mouth: a flat cut a third of the way up, the upper lip pressed flat, the languid below.
  const my = y - foot - 2;
  const mh = Math.max(5, w * 0.42) * (1 + (o.mouthOpen ?? 0) * 0.8);
  const mw = w * 0.58;
  g.fillStyle(lit(m, 0.25), 1);
  g.fillTriangle(x - mw / 2, my, x + mw / 2, my, x, my - mh * 1.7);
  g.fillStyle(SILVER_DEEP, 1); g.fillRect(x - mw / 2, my - mh * 0.45, mw, mh * 0.45);
  if (o.glow) {
    g.fillStyle(GHOST, 0.25 * o.glow); g.fillRect(x - mw / 2 - 2, my - mh * 0.6, mw + 4, mh * 0.75);
    g.fillStyle(SILVER_LIT, 0.8 * o.glow); g.fillRect(x - mw / 2 + 1, my - mh * 0.4, mw - 2, 2);
  }
  g.fillStyle(dim(m, 0.4), 1); g.fillRect(x - mw / 2 - 1, my, mw + 2, 2);
  // A long highlight and a shadow seam.
  g.fillStyle(SILVER_LIT, 0.55); g.fillRect(x - w * 0.22, top + 4, Math.max(1.5, w * 0.08), h - foot - mh * 2 - 6);
  g.fillStyle(SILVER_DEEP, 0.4); g.fillRect(x + w * 0.38, top + 2, 1.2, h - foot - 4);
  if (o.sealed) {
    // Ribbon wound twice round the body, a bow, and the red wax seal pressed over the knot.
    const ry = top + (h - foot) * 0.45;
    g.fillStyle(RIBBON, 1); g.fillRect(x - w / 2 - 1, ry, w + 2, 4); g.fillRect(x - w / 2 - 1, ry + 7, w + 2, 3);
    g.fillStyle(0xd8d4c8, 1); g.fillRect(x - w / 2 - 1, ry + 3, w + 2, 1);
    g.fillStyle(RIBBON, 1);
    g.fillTriangle(x, ry + 4, x - 9, ry - 3, x - 8, ry + 9);
    g.fillTriangle(x, ry + 4, x + 9, ry - 3, x + 8, ry + 9);
    g.fillTriangle(x - 2, ry + 6, x - 6, ry + 20, x - 1, ry + 18);
    g.fillTriangle(x + 2, ry + 6, x + 7, ry + 22, x + 2, ry + 19);
    g.fillStyle(dim(WAX_RED, 0.3), 1); g.fillCircle(x, ry + 5, 4.5);
    g.fillStyle(WAX_RED, 1); g.fillCircle(x - 0.5, ry + 4.5, 3.6);
    g.fillStyle(lit(WAX_RED, 0.4), 1); g.fillRect(x - 1.5, ry + 3, 2, 1.2);
  }
}

/**
 * A ghostly mouth singing out of a sealed pipe's mouth: a pale oval with dark lips and a faint
 * face round it — eyes as two smudges above. `open` 0..1 is how wide it sings.
 */
export function ghostMouth(g: G, x: number, y: number, s: number, open: number, a = 1): void {
  g.fillStyle(GHOST, 0.12 * a); g.fillEllipse(x, y - 8 * s, 30 * s, 40 * s);
  g.fillStyle(GHOST, 0.2 * a); g.fillEllipse(x, y - 6 * s, 20 * s, 28 * s);
  // Eyes: closed, sorrowing.
  g.lineStyle(1.4 * s, GHOST_DEEP, 0.7 * a);
  g.beginPath(); g.arc(x - 4.5 * s, y - 14 * s, 2.6 * s, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.beginPath(); g.arc(x + 4.5 * s, y - 14 * s, 2.6 * s, 0.2, Math.PI - 0.2, false); g.strokePath();
  // The mouth: an O that opens with the note.
  const mh = (2 + open * 7) * s;
  g.fillStyle(GHOST_DEEP, 0.85 * a); g.fillEllipse(x, y - 4 * s, (6 + open * 3) * s, mh);
  g.fillStyle(0x0a1a2a, 0.9 * a); g.fillEllipse(x, y - 4 * s + 0.5, (4 + open * 2) * s, mh * 0.7);
  g.lineStyle(1, SILVER_LIT, 0.5 * a); g.strokeEllipse(x, y - 4 * s, (6 + open * 3) * s, mh);
}

/** Five stave lines, `w` long from `x`, the top line at `y`. */
export function staveLines(g: G, x: number, y: number, w: number, gap: number, color: number, a = 1, width = 1.5): void {
  g.lineStyle(width, color, a);
  for (let i = 0; i < 5; i++) g.lineBetween(x, y + i * gap, x + w, y + i * gap);
}

/** A crotchet: a tilted filled head with a stem (up or down) and an optional flag. */
export function noteHead(g: G, x: number, y: number, s: number, color: number, a = 1, stem: 1 | -1 | 0 = 1, flag = false): void {
  g.fillStyle(color, a);
  g.fillEllipse(x, y, 9 * s, 6.4 * s);
  if (stem !== 0) {
    const sx = stem > 0 ? x + 4 * s : x - 4 * s;
    g.lineStyle(1.6 * s, color, a);
    g.lineBetween(sx, y, sx, y - stem * 22 * s);
    if (flag) {
      g.beginPath();
      g.moveTo(sx, y - stem * 22 * s);
      g.lineTo(sx + 6 * s, y - stem * 14 * s);
      g.lineTo(sx + 4 * s, y - stem * 8 * s);
      g.strokePath();
    }
  }
}

/** A treble clef, drawn as its spiral, its spine and its tail curl. `x,y` = the spiral's centre. */
export function trebleClef(g: G, x: number, y: number, s: number, color: number, a = 1, width = 2): void {
  g.lineStyle(width * s, color, a);
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    const ang = -Math.PI / 2 + k * Math.PI * 2.6;
    const r = (3 + k * 9) * s;
    const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.lineTo(x + 2 * s, y - 26 * s);
  g.lineTo(x + 6 * s, y - 30 * s);
  g.lineTo(x + 3 * s, y - 20 * s);
  g.lineTo(x - 1 * s, y + 22 * s);
  g.strokePath();
  g.fillStyle(color, a); g.fillCircle(x - 4 * s, y + 21 * s, 3 * s);
}

/** A fermata: an arc with a dot under it — hold. */
export function fermata(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.lineStyle(3 * s, color, a);
  g.beginPath(); g.arc(x, y, 14 * s, Math.PI, 0, false); g.strokePath();
  g.fillStyle(color, a); g.fillCircle(x, y - 3 * s, 3 * s);
}

/** The segno — the D.C. sign: a slanted S with a stroke through it and two dots. */
export function segno(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.lineStyle(3 * s, color, a);
  g.beginPath(); g.arc(x - 1 * s, y - 7 * s, 7 * s, Math.PI * 0.1, Math.PI * 1.55, true); g.strokePath();
  g.beginPath(); g.arc(x + 1 * s, y + 7 * s, 7 * s, Math.PI * 1.1, Math.PI * 0.55, true); g.strokePath();
  g.lineBetween(x - 12 * s, y + 14 * s, x + 12 * s, y - 14 * s);
  g.fillStyle(color, a); g.fillCircle(x - 11 * s, y + 2 * s, 2.4 * s); g.fillCircle(x + 11 * s, y - 2 * s, 2.4 * s);
}

/**
 * A great bellows (a "lung"): a wedge of oxblood leather folded into ribs between two oak
 * boards, weights on the top board, brass hinges. `breath` 0..1 is how full it is. Drawn
 * standing on its base line at `y`, its nozzle towards `face` (+1 east, -1 west).
 */
export function bellows(g: G, x: number, y: number, w: number, h: number, breath: number, face: 1 | -1, rng?: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 20);
  const hb = h * (0.45 + breath * 0.55);
  const back = x - face * w / 2;
  const front = x + face * w / 2;
  // The bottom board.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - w / 2, y - 12, w, 12);
  g.fillStyle(OAK, 1); g.fillRect(x - w / 2, y - 12, w, 8);
  // Leather folds: each rib a darker crease and a lit ridge, fanning from the hinge.
  const ribs = 6;
  for (let i = ribs; i >= 1; i--) {
    const k = i / ribs;
    const ry = y - 12 - hb * k;
    const inset = (1 - k) * 4 + Math.sin(i * 1.7) * 2;
    g.fillStyle(i % 2 ? LEATHER : dim(LEATHER, 0.22), 1);
    g.fillPoints([
      { x: back, y: y - 12 }, { x: front - face * inset, y: ry + hb / ribs }, { x: front - face * (inset + 6), y: ry }, { x: back, y: y - 14 },
    ], true, true);
    g.lineStyle(2, LEATHER_LIT, 0.8); g.lineBetween(back, y - 13, front - face * (inset + 6), ry);
    g.lineStyle(1, LEATHER_DARK, 0.9); g.lineBetween(back, y - 12, front - face * inset, ry + hb / ribs);
  }
  // The top board, hinged at the back, its far end lifted by the breath.
  const ty = y - 12 - hb;
  g.fillStyle(OAK_DARK, 1);
  g.fillPoints([{ x: back, y: y - 16 }, { x: front, y: ty - 4 }, { x: front, y: ty + 6 }, { x: back, y: y - 6 }], true, true);
  g.fillStyle(OAK_LIT, 1);
  g.fillPoints([{ x: back, y: y - 18 }, { x: front, y: ty - 6 }, { x: front, y: ty }, { x: back, y: y - 12 }], true, true);
  // Iron weights stacked on the top board.
  for (let i = 0; i < 3; i++) {
    const f = 0.35 + i * 0.2;
    const wx = back + (front - back) * f, wy = (y - 18) + (ty - 6 - (y - 18)) * f;
    g.fillStyle(0x2a2a30, 1); g.fillRect(wx - 9, wy - 12, 18, 12);
    g.fillStyle(0x5a5a64, 1); g.fillRect(wx - 9, wy - 12, 18, 3);
    g.fillStyle(0x8a8a94, 1); g.fillRect(wx - 2, wy - 16, 4, 4);
  }
  // Brass hinge plates at the back.
  g.fillStyle(GILT_DARK, 1); g.fillRect(back - 4, y - 24, 8, 16);
  g.fillStyle(GILT, 1); g.fillRect(back - 3, y - 23, 6, 4); g.fillRect(back - 3, y - 15, 6, 4);
  // The nozzle: a brass trunk out of the front.
  const ny = y - 12 - hb * 0.4;
  g.fillStyle(GILT_DARK, 1); g.fillRect(Math.min(front, front + face * 34), ny - 9, 34, 18);
  g.fillStyle(GILT, 1); g.fillRect(Math.min(front, front + face * 34), ny - 8, 34, 8);
  g.fillStyle(GILT_LIT, 0.8); g.fillRect(Math.min(front, front + face * 34), ny - 7, 34, 2);
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(front + face * 34, ny, 10, 26);
  g.fillStyle(0x1a1008, 1); g.fillEllipse(front + face * 35, ny, 6, 18);
  if (rng) {
    // Patches stitched on the leather where it has split from breathing.
    for (let i = 0; i < 3; i++) {
      const px = back + (front - back) * (0.3 + rng() * 0.5), py = y - 14 - hb * (0.2 + rng() * 0.5);
      g.fillStyle(dim(LEATHER, 0.35), 1); g.fillRect(px - 6, py - 4, 12, 8);
      g.lineStyle(1, IVORY, 0.6);
      for (let k = -5; k <= 5; k += 3) g.lineBetween(px + k, py - 5, px + k, py - 3);
    }
  }
}

/** A drawstop knob on its stem: a turned ivory face lettered in black, a ring of gilt. */
export function stopKnob(g: G, x: number, y: number, s: number, drawn: boolean, label = 0): void {
  const out = drawn ? 10 * s : 3 * s;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 3 * s, y - out, 6 * s, out);
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y - out, 10 * s);
  g.fillStyle(GILT, 1); g.fillCircle(x, y - out - 0.5, 9 * s);
  g.fillStyle(IVORY, 1); g.fillCircle(x, y - out - 1, 7 * s);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 2 * s, y - out - 3 * s, 2 * s);
  g.lineStyle(1.2 * s, EBONY, 0.9);
  // A tiny engraved glyph per stop: a wave (diapason), a mouth (vox humana), or a star.
  if (label === 0) { g.beginPath(); g.arc(x - 2 * s, y - out - 1, 2 * s, Math.PI, 0, false); g.arc(x + 2 * s, y - out - 1, 2 * s, Math.PI, 0, true); g.strokePath(); }
  else if (label === 1) g.strokeEllipse(x, y - out - 1, 5 * s, 3 * s);
  else { g.lineBetween(x - 3 * s, y - out - 1, x + 3 * s, y - out - 1); g.lineBetween(x, y - out - 4 * s, x, y - out + 2 * s); }
}

/** A keyboard manual, `keys` white keys wide from `x` (left) on the line `y` (its front edge). */
export function manual(g: G, x: number, y: number, keyW: number, keys: number, depth: number, pressed: (i: number) => number = () => 0): void {
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 6, y - depth - 6, keys * keyW + 12, depth + 10);
  for (let i = 0; i < keys; i++) {
    const p = pressed(i);
    const kx = x + i * keyW;
    g.fillStyle(p > 0 ? mixC(IVORY, CANDLE, p * 0.7) : IVORY, 1); g.fillRect(kx + 0.5, y - depth + p * 2, keyW - 1, depth - p * 2);
    g.fillStyle(0xc8c0a8, 1); g.fillRect(kx + 0.5, y - 3, keyW - 1, 3);
  }
  for (let i = 0; i < keys - 1; i++) {
    const n = i % 7;
    if (n === 2 || n === 6) continue;
    g.fillStyle(EBONY, 1); g.fillRect(x + (i + 1) * keyW - keyW * 0.3, y - depth, keyW * 0.6, depth * 0.6);
    g.fillStyle(0x4a4450, 1); g.fillRect(x + (i + 1) * keyW - keyW * 0.3 + 1, y - depth, 1, depth * 0.55);
  }
}

/** A church candle on a pricket: wax, drips, and the flame (flicker `t`, seconds). */
export function candle(g: G, x: number, y: number, s: number, t: number, lit_ = true): void {
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 6 * s, y - 3 * s, 12 * s, 3 * s);
  g.fillStyle(IVORY, 1); g.fillRect(x - 3 * s, y - 20 * s, 6 * s, 17 * s);
  g.fillStyle(0xd8d0b8, 1); g.fillRect(x + 1 * s, y - 20 * s, 2 * s, 17 * s);
  g.fillStyle(IVORY, 1); g.fillCircle(x - 3 * s, y - 14 * s, 1.4 * s); g.fillRect(x - 4 * s, y - 14 * s, 1.4 * s, 6 * s);
  if (!lit_) return;
  const f = Math.sin(t * 13 + x) * 0.8;
  g.fillStyle(CANDLE, 0.15); g.fillCircle(x, y - 26 * s, 9 * s);
  g.fillStyle(CANDLE, 0.95); g.fillEllipse(x + f * 0.5, y - 25 * s, 4 * s, 9 * s);
  g.fillStyle(0xffffff, 0.9); g.fillEllipse(x + f * 0.3, y - 24 * s, 1.8 * s, 4 * s);
}

/**
 * The Maestro's mark — a treble clef crowned with a conductor's baton laid across its head, in a
 * ring of five stave lines bent round into a circle.
 */
export function cadenzaSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1, r * 0.03), color, a);
  for (let i = 0; i < 5; i++) g.strokeCircle(x, y, r * (0.78 + i * 0.055));
  trebleClef(g, x, y + r * 0.1, r / 34, color, a, 2.4);
  g.lineStyle(Math.max(2, r * 0.07), color, a);
  g.lineBetween(x - r * 0.55, y - r * 0.5, x + r * 0.6, y - r * 0.78);
  g.fillStyle(color, a); g.fillCircle(x - r * 0.55, y - r * 0.5, r * 0.07);
}

/** Black oak casework panel with a gilt-edged arch and carved quatrefoil — the Organ's skin. */
export function casePanel(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(OAK_DARK, 1); g.fillRect(x, y, w, h);
  g.fillStyle(OAK, 1); g.fillRect(x + 3, y + 3, w - 6, h - 6);
  g.lineStyle(1.5, GILT_DARK, 0.9); g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  const cx = x + w / 2, cy = y + h * 0.45, r = Math.min(w, h) * 0.18;
  g.fillStyle(OAK_DARK, 1);
  for (let k = 0; k < 4; k++) g.fillCircle(cx + Math.cos((k * Math.PI) / 2) * r * 0.6, cy + Math.sin((k * Math.PI) / 2) * r * 0.6, r * 0.55);
  g.lineStyle(1.2, GILT, 0.8);
  for (let k = 0; k < 4; k++) g.strokeCircle(cx + Math.cos((k * Math.PI) / 2) * r * 0.6, cy + Math.sin((k * Math.PI) / 2) * r * 0.6, r * 0.55);
  g.fillStyle(OAK_LIT, 0.5); g.fillRect(x + 4, y + 4, w - 8, 2);
}
