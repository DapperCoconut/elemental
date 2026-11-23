import Phaser from 'phaser';
import { OBS, crackPath, seam, shard, slab, mixC, lit, dim } from '../../../../art/PinnacleArt';
import { glow } from '../../../../art/IsleArt';
import { BRASS, BRASS_DIM, FELT, FELT_DEEP, FELT_GLOW, FELT_LIT, IVORY, IVORY_DIM, LOT_LILAC, ROUGE, ROUGE_DEEP, ROUGE_LIT } from './palette';

/**
 * The Lot Bench's drawn things — the gaming floor of Lotterhaven, remembered in black glass:
 * the dice fused into its walls, the Wheel of Sixty in its floor, the hanging hourglass, the
 * war-tables, the drum of the Draw, the six seats. Shared by the room, the fight floor, the six
 * decrees and the intro cinematic.
 */

type G = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }
const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── A stroke font: digits and the five ability keys ──────────────────

/** Polylines in a unit box (x 0–1 across 0.6 of the height, y 0–1 down). */
const FONT: Record<string, [number, number][][]> = {
  '0': [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], [[1, 0.1], [0, 0.9]]],
  '1': [[[0.25, 0.2], [0.55, 0], [0.55, 1]], [[0.2, 1], [0.9, 1]]],
  '2': [[[0, 0], [1, 0], [1, 0.5], [0, 0.5], [0, 1], [1, 1]]],
  '3': [[[0, 0], [1, 0], [1, 1], [0, 1]], [[0.25, 0.5], [1, 0.5]]],
  '4': [[[0, 0], [0, 0.55], [1, 0.55]], [[0.75, 0], [0.75, 1]]],
  '5': [[[1, 0], [0, 0], [0, 0.5], [1, 0.5], [1, 1], [0, 1]]],
  '6': [[[1, 0], [0, 0], [0, 1], [1, 1], [1, 0.5], [0, 0.5]]],
  '7': [[[0, 0], [1, 0], [0.4, 1]]],
  '8': [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], [[0, 0.5], [1, 0.5]]],
  '9': [[[1, 0.5], [0, 0.5], [0, 0], [1, 0], [1, 1], [0, 1]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.75, 0.5]]],
  F: [[[1, 0], [0, 0], [0, 1]], [[0, 0.5], [0.75, 0.5]]],
  R: [[[0, 1], [0, 0], [0.85, 0], [1, 0.15], [1, 0.38], [0.85, 0.5], [0, 0.5]], [[0.45, 0.5], [1, 1]]],
  Q: [[[0.15, 0], [0.85, 0], [1, 0.2], [1, 0.8], [0.85, 1], [0.15, 1], [0, 0.8], [0, 0.2], [0.15, 0]], [[0.55, 0.65], [1.05, 1.1]]],
  C: [[[1, 0], [0, 0], [0, 1], [1, 1]]],
  '?': [[[0, 0.15], [0.2, 0], [0.85, 0], [1, 0.2], [1, 0.4], [0.5, 0.6], [0.5, 0.75]], [[0.5, 0.92], [0.5, 1]]],
};

/** Draw a short string (digits, E/F/R/Q/C) centred on x, y, `h` tall. */
export function glyphs(g: G, str: string, x: number, y: number, h: number, color: number, a = 1, w = Math.max(1.2, h * 0.14)): void {
  const cw = h * 0.6, gap = h * 0.28;
  const total = str.length * cw + (str.length - 1) * gap;
  let ox = x - total / 2;
  g.lineStyle(w, color, a);
  for (const ch of str) {
    for (const line of FONT[ch] ?? FONT['?']) {
      g.beginPath();
      g.moveTo(ox + line[0][0] * cw, y - h / 2 + line[0][1] * h);
      for (let i = 1; i < line.length; i++) g.lineTo(ox + line[i][0] * cw, y - h / 2 + line[i][1] * h);
      g.strokePath();
    }
    ox += cw + gap;
  }
}

// ── Pips ─────────────────────────────────────────────────────────────

/** Pip positions on a die face, in -1..1 face coordinates. */
export function pipLayout(n: number): [number, number][] {
  const c: [number, number] = [0, 0];
  const tl: [number, number] = [-0.55, -0.55], tr: [number, number] = [0.55, -0.55];
  const bl: [number, number] = [-0.55, 0.55], br: [number, number] = [0.55, 0.55];
  const ml: [number, number] = [-0.55, 0], mr: [number, number] = [0.55, 0];
  switch (n) {
    case 1: return [c];
    case 2: return [tl, br];
    case 3: return [tl, c, br];
    case 4: return [tl, tr, bl, br];
    case 5: return [tl, tr, bl, br, c];
    default: return [tl, tr, ml, mr, bl, br];
  }
}

/** One glowing pip: the felt light trapped under the glass, a halo and a hot core. */
export function pip(g: G, x: number, y: number, r: number, color = FELT_GLOW, a = 1, squash = 1): void {
  g.fillStyle(color, 0.12 * a); g.fillEllipse(x, y, r * 4.4, r * 4.4 * squash);
  g.fillStyle(dim(color, 0.55), a); g.fillEllipse(x, y, r * 2.3, r * 2.3 * squash);
  g.fillStyle(color, a); g.fillEllipse(x, y, r * 1.7, r * 1.7 * squash);
  g.fillStyle(lit(color, 0.6), a); g.fillEllipse(x - r * 0.25, y - r * 0.25 * squash, r * 0.7, r * 0.7 * squash);
}

/**
 * A face of a cube in projection: `o` its corner, `u` and `v` its two edge vectors. Fills it,
 * shades it, edges it and sets pips on it.
 */
function dieFace(g: G, o: P, u: P, v: P, fill: number, sheen: number, n: number, pipR: number, pipColor: number, pipA: number): void {
  const at = (s: number, t: number) => pt(o.x + u.x * s + v.x * t, o.y + u.y * s + v.y * t);
  g.fillStyle(fill, 1);
  g.fillPoints([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], true);
  // A diagonal sheen band, as the glass shows a far window.
  g.fillStyle(sheen, 0.55);
  g.fillPoints([at(0.08, 0), at(0.34, 0), at(0, 0.42), at(0, 0.16)], true);
  g.lineStyle(1.3, OBS.edge, 0.55);
  g.strokePoints([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], true);
  // Rounded corners: a soft inner bevel line.
  g.lineStyle(1, OBS.edge, 0.15);
  g.strokePoints([at(0.06, 0.06), at(0.94, 0.06), at(0.94, 0.94), at(0.06, 0.94)], true);
  const ux = Math.hypot(u.x, u.y), vy = Math.hypot(v.x, v.y);
  const squash = Math.min(1, vy / Math.max(1, ux));
  for (const [px, py] of pipLayout(n)) {
    const p = at(0.5 + px * 0.36, 0.5 + py * 0.36);
    pip(g, p.x, p.y, pipR, pipColor, pipA, squash);
  }
}

/**
 * A house-sized die of black glass fused into a wall: `x, y` the middle of its front face's
 * base, `s` the edge length, `faces` [front, top, side], `dir` which way the side face shows
 * (+1 right, -1 left), `glowK` 0–1 how bright the pips burn tonight. `rng` seeds its cracks.
 */
export function fusedDie(g: G, x: number, y: number, s: number, faces: [number, number, number], dir: 1 | -1, rng: () => number, glowK = 1): void {
  const dx = s * 0.34 * dir, dy = -s * 0.3;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + dx * 0.5, y + 4, s * 1.5, s * 0.28);
  const pr = s * 0.055;
  // Side face (the darkest), top (the brightest), front.
  const sideO = dir > 0 ? { x: x + s / 2, y: y - s } : { x: x - s / 2, y: y - s };
  dieFace(g, sideO, { x: dx, y: dy }, { x: 0, y: s }, OBS.glass, OBS.facet, faces[2], pr * 0.8, FELT_GLOW, 0.6 * glowK);
  dieFace(g, { x: x - s / 2, y: y - s }, { x: s, y: 0 }, { x: dx, y: dy }, OBS.sheen, lit(OBS.sheen, 0.12), faces[1], pr * 0.85, FELT_GLOW, 0.8 * glowK);
  dieFace(g, { x: x - s / 2, y: y - s }, { x: s, y: 0 }, { x: 0, y: s }, OBS.facet, OBS.sheen, faces[0], pr, FELT_GLOW, glowK);
  // The near edge catches a bright line, and the top's far rim.
  g.lineStyle(2, OBS.edge, 0.85);
  g.lineBetween(dir > 0 ? x + s / 2 : x - s / 2, y - s, dir > 0 ? x + s / 2 : x - s / 2, y);
  g.lineBetween(x - s / 2, y - s, x + s / 2, y - s);
  // Where the wall's glass grew over it: a ragged collar of shards round the back.
  for (let i = 0; i < 5; i++) {
    const bx = x - dir * s * (0.45 - i * 0.04) + (rng() - 0.5) * 8;
    shard(g, bx, y - s * (0.1 + i * 0.2), 14 + rng() * 14, 26 + rng() * 30, -dir * (6 + rng() * 10), 0.1);
  }
  // Cracks running out of the pips.
  for (let i = 0; i < 2; i++) {
    const a = { x: x - s * 0.3 + rng() * s * 0.6, y: y - s * 0.85 + rng() * s * 0.2 };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * s * 0.5, y: y - rng() * s * 0.2 }, rng, 6, 5), 1, 0.6);
  }
}

/**
 * A free die (the decree props, the cinematic): `x, y` centre, `s` edge, `rot` its in-plane
 * spin, `face` the number up. Seen from above: one face, a lit bevel.
 */
export function topDie(g: G, x: number, y: number, s: number, rot: number, face: number, pipColor = FELT_GLOW, a = 1): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const corner = (px: number, py: number) => pt(x + (px * c - py * sn) * s / 2, y + (px * sn + py * c) * s / 2);
  g.fillStyle(0x000000, 0.35 * a); g.fillEllipse(x + 4, y + s * 0.5, s * 1.1, s * 0.3);
  g.fillStyle(OBS.glass, a); g.fillPoints([corner(-1.08, -1.08), corner(1.08, -1.08), corner(1.08, 1.08), corner(-1.08, 1.08)], true);
  g.fillStyle(OBS.facet, a); g.fillPoints([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], true);
  g.fillStyle(OBS.sheen, 0.6 * a); g.fillPoints([corner(-1, -1), corner(0.2, -1), corner(-1, 0.2)], true);
  g.lineStyle(1.2, OBS.edge, 0.7 * a); g.strokePoints([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], true);
  for (const [px, py] of pipLayout(face)) {
    const p = corner(px * 0.62, py * 0.62);
    pip(g, p.x, p.y, s * 0.065, pipColor, a);
  }
}

// ── Lots: balls, tokens, chips ───────────────────────────────────────

/** A lot-ball out of the drum: a glass sphere in its side's colour with an ivory number disc. */
export function lotBall(g: G, x: number, y: number, r: number, color: number, n: number, a = 1): void {
  g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(x + r * 0.2, y + r * 0.9, r * 1.8, r * 0.5);
  g.fillStyle(dim(color, 0.45), a); g.fillCircle(x, y, r);
  g.fillStyle(color, a); g.fillCircle(x - r * 0.1, y - r * 0.1, r * 0.86);
  g.fillStyle(IVORY, a); g.fillCircle(x - r * 0.05, y - r * 0.05, r * 0.5);
  if (r >= 6) glyphs(g, String(n % 100), x - r * 0.05, y - r * 0.05, r * 0.5, OBS.glass, a, Math.max(1, r * 0.1));
  g.fillStyle(0xffffff, 0.75 * a); g.fillEllipse(x - r * 0.45, y - r * 0.5, r * 0.4, r * 0.25);
}

/** A Lot: the brass token every child of Lotterhaven wears at the throat, on its chain. */
export function lotToken(g: G, x: number, y: number, r: number, n: number, a = 1, snapped = false): void {
  g.lineStyle(1, BRASS_DIM, 0.8 * a);
  g.beginPath(); g.arc(x, y - r * 1.9, r * 1.3, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
  if (snapped) {
    // The busted wear a black chip on the chain instead.
    g.fillStyle(OBS.glass, a); g.fillCircle(x, y, r);
    g.lineStyle(1.2, OBS.edge, 0.6 * a); g.strokeCircle(x, y, r);
    for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2; g.fillStyle(OBS.facet, a); g.fillRect(x + Math.cos(ang) * r * 0.75 - 1, y + Math.sin(ang) * r * 0.75 - 1, 2, 2); }
    glyphs(g, String(n), x, y, r * 0.8, OBS.seamLit, a, 1);
    return;
  }
  g.fillStyle(BRASS_DIM, a); g.fillCircle(x, y, r);
  g.fillStyle(BRASS, a); g.fillCircle(x - r * 0.08, y - r * 0.08, r * 0.86);
  g.lineStyle(1, BRASS_DIM, a); g.strokeCircle(x, y, r * 0.66);
  glyphs(g, String(n), x, y, r * 0.7, BRASS_DIM, a, 1);
}

/** A stack of glass chips on the floor, `n` high, in a colour, edged with ivory notches. */
export function chipStack(g: G, x: number, y: number, n: number, color: number, r = 9): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 2, r * 2.4, r * 0.9);
  for (let i = 0; i < n; i++) {
    const cy = y - i * r * 0.36;
    g.fillStyle(dim(color, 0.45), 1); g.fillEllipse(x, cy + r * 0.12, r * 2, r * 0.8);
    g.fillStyle(color, 1); g.fillEllipse(x, cy, r * 2, r * 0.8);
    g.fillStyle(IVORY, 0.85);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + i; g.fillRect(x + Math.cos(a) * r * 0.88 - 1, cy + Math.sin(a) * r * 0.34 - 0.6, 2, 1.4); }
  }
  g.lineStyle(1, lit(color, 0.4), 0.7); g.strokeEllipse(x, y - (n - 1) * r * 0.36, r * 1.3, r * 0.5);
}

// ── The drum of the Draw ─────────────────────────────────────────────

/**
 * The drum: a glass barrel on an obsidian A-frame with brass hoops and a crank, balls tumbling
 * inside. `x, y` the barrel's centre, `r` its half-height, `rot` how far it has turned (radians),
 * `balls` the colours inside (drawn tumbling), `fb` the false bottom's hidden balls (0 = none).
 */
export function drum(g: G, x: number, y: number, r: number, rot: number, balls: number[], fb = 0, t = 0, mouth = 0): void {
  const hw = r * 1.35;
  // The A-frame legs and the floor plate.
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + r * 1.55, hw * 2.6, r * 0.5);
  for (const sx of [-1, 1]) {
    g.fillStyle(OBS.glass, 1);
    g.fillPoints([pt(x + sx * (hw + 6), y), pt(x + sx * (hw + 16), y), pt(x + sx * (hw + 30), y + r * 1.5), pt(x + sx * (hw - 6), y + r * 1.5)], true);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x + sx * (hw + 16), y, x + sx * (hw + 30), y + r * 1.5);
  }
  slab(g, x, y + r * 1.56, hw * 2 + 70, 10);
  // The false bottom: a glass box under the barrel with the favourites' lots in it.
  if (fb > 0) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x - r * 0.7, y + r * 0.95, r * 1.4, r * 0.42);
    g.lineStyle(1, OBS.seam, 0.7); g.strokeRect(x - r * 0.7, y + r * 0.95, r * 1.4, r * 0.42);
    for (let i = 0; i < fb; i++) {
      const bx = x - r * 0.45 + i * (r * 0.9 / Math.max(1, fb - 1));
      g.fillStyle(ROUGE, 0.55); g.fillCircle(bx, y + r * 1.17, r * 0.13);
    }
  }
  // The barrel: back half, balls, then the glass over them.
  g.fillStyle(OBS.glass, 0.95); g.fillRect(x - hw, y - r, hw * 2, r * 2);
  g.fillStyle(FELT_DEEP, 0.5); g.fillRect(x - hw, y - r * 0.2, hw * 2, r * 1.2);
  balls.forEach((c, i) => {
    const ph = rot * (1 + (i % 3) * 0.17) + i * 2.399;
    const bx = x + Math.sin(i * 1.7 + rot * 0.4) * hw * 0.78;
    const by = y + Math.cos(ph) * r * 0.68 * (0.55 + 0.45 * Math.abs(Math.sin(ph * 0.5 + i)));
    lotBall(g, bx, by, Math.max(4, r * 0.16), c, 1 + ((i * 7) % 59));
  });
  // Staves turning past: the glass catches a band of light at each.
  for (let k = 0; k < 8; k++) {
    const a = rot + (k / 8) * Math.PI * 2;
    const sy = y - Math.cos(a) * r;
    if (Math.sin(a) < 0) continue;
    g.lineStyle(1.2, OBS.edge, 0.12 + 0.3 * Math.sin(a)); g.lineBetween(x - hw, sy, x + hw, sy);
  }
  g.fillStyle(0xffffff, 0.06); g.fillRect(x - hw, y - r * 0.85, hw * 2, r * 0.25);
  // Brass hoops and end caps.
  for (const hx of [-hw, -hw * 0.33, hw * 0.33, hw]) {
    g.lineStyle(hx === -hw || hx === hw ? 4 : 2.5, BRASS_DIM, 1); g.lineBetween(x + hx, y - r, x + hx, y + r);
    g.lineStyle(1, BRASS, 0.8); g.lineBetween(x + hx - 1, y - r, x + hx - 1, y + r);
  }
  for (const sx of [-1, 1]) {
    g.fillStyle(OBS.facet, 1); g.fillEllipse(x + sx * hw, y, r * 0.5, r * 2);
    g.lineStyle(1.4, OBS.edge, 0.7); g.strokeEllipse(x + sx * hw, y, r * 0.5, r * 2);
    g.fillStyle(BRASS, 1); g.fillCircle(x + sx * hw, y, r * 0.12);
  }
  // The crank wheel on the right, turning with the barrel.
  const cx = x + hw + r * 0.5, cy = y;
  g.lineStyle(3, BRASS_DIM, 1); g.strokeCircle(cx, cy, r * 0.45);
  for (let k = 0; k < 6; k++) { const a = rot + (k / 6) * Math.PI * 2; g.lineStyle(1.5, BRASS, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45); }
  g.fillStyle(IVORY_DIM, 1); g.fillCircle(cx + Math.cos(rot) * r * 0.45, cy + Math.sin(rot) * r * 0.45, 3);
  // The mouth: a chute at the front, lit when a lot is coming.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - r * 0.22, y + r * 0.7, r * 0.44, r * 0.3);
  g.lineStyle(1.4, mouth > 0 ? FELT_GLOW : OBS.edge, 0.5 + mouth * 0.5); g.strokeRect(x - r * 0.22, y + r * 0.7, r * 0.44, r * 0.3);
  if (mouth > 0) glow(g, x, y + r * 0.85, r * 0.6, FELT_GLOW, 0.05 * mouth + 0.02 * Math.sin(t * 20), 3);
}

// ── The Wheel of Sixty ───────────────────────────────────────────────

/** How flat the wheel reads on the floor (y squash). */
export const WHEEL_SQ = 0.8;

/**
 * The wheel's still parts — the bowl sunk in the glass floor, the outer rim and the ball track,
 * the sixty seat-plates round the rim (one engraved per councilor). Baked into the ground once.
 */
export function wheelBowl(g: G, cx: number, cy: number, R: number, rng: () => number): void {
  const sq = WHEEL_SQ;
  // The bowl's shadow and stepped rims, outside in.
  g.fillStyle(0x000000, 0.55); g.fillEllipse(cx, cy + 14, R * 2.28, R * 2.28 * sq);
  const rims: [number, number][] = [[1.12, OBS.glass], [1.08, OBS.facet], [1.04, OBS.glass], [1.0, mixC(OBS.glass, OBS.facet, 0.4)]];
  for (const [k, c] of rims) { g.fillStyle(c, 1); g.fillEllipse(cx, cy, R * 2 * k, R * 2 * k * sq); }
  g.lineStyle(2, OBS.edge, 0.55); g.strokeEllipse(cx, cy, R * 2.24, R * 2.24 * sq);
  g.lineStyle(1, OBS.edge, 0.3); g.strokeEllipse(cx, cy, R * 2.08, R * 2.08 * sq);
  // The ball track: a dark groove with a pale lip.
  g.fillStyle(0x05040a, 1); g.fillEllipse(cx, cy, R * 1.98, R * 1.98 * sq);
  g.lineStyle(1.5, OBS.edge, 0.5); g.strokeEllipse(cx, cy, R * 1.86, R * 1.86 * sq);
  // Diamond deflectors on the track (eight, the old way).
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = cx + Math.cos(a) * R * 0.96, y = cy + Math.sin(a) * R * 0.96 * sq;
    g.fillStyle(OBS.sheen, 1); g.fillPoints([pt(x, y - 5), pt(x + 4, y), pt(x, y + 5), pt(x - 4, y)], true);
    g.lineStyle(1, OBS.edge, 0.8); g.strokePoints([pt(x, y - 5), pt(x + 4, y), pt(x, y + 5), pt(x - 4, y)], true);
  }
  // Sixty engraved plates round the outer rim — one per seat, a felt notch every sixth.
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const x0 = cx + Math.cos(a) * R * 1.06, y0 = cy + Math.sin(a) * R * 1.06 * sq;
    const x1 = cx + Math.cos(a) * R * 1.11, y1 = cy + Math.sin(a) * R * 1.11 * sq;
    g.lineStyle(i % 6 === 0 ? 2.5 : 1, i % 6 === 0 ? FELT_LIT : OBS.edge, i % 6 === 0 ? 0.8 : 0.35);
    g.lineBetween(x0, y0, x1, y1);
  }
  // Old violet cracks out from the rim into the floor.
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2;
    const p0 = { x: cx + Math.cos(a) * R * 1.12, y: cy + Math.sin(a) * R * 1.12 * sq };
    const p1 = { x: cx + Math.cos(a) * R * (1.35 + rng() * 0.4), y: cy + Math.sin(a) * R * (1.35 + rng() * 0.4) * sq };
    seam(g, crackPath(p0, p1, rng, 9, 6), 1.3, 0.75);
  }
}

/** What a pocket shows: 0 dark, 1 a seat still held, 2 a seat emptied (the shell cracked — starlight). */
export type PocketState = 0 | 1 | 2;

/**
 * The wheel's turning parts, drawn every frame: sixty pockets (rouge and glass, a felt fret
 * between each bench's six), the cone and its spokes, the spindle, and the ball. `rot` radians;
 * `pocket(i)` the state of pocket i; `mine` the first pocket of this bench (its six get a lilac
 * rim); `ball` the ball's angle and radius fraction (null = none); `flare` 0–1 on the ball's pocket.
 */
export function wheelSpin(
  g: G, cx: number, cy: number, R: number, rot: number, t: number,
  pocket: (i: number) => PocketState, mine: number,
  ball: { a: number; k: number; flare: number; pocket: number } | null,
): void {
  const sq = WHEEL_SQ;
  const r1 = R * 0.6, r2 = R * 0.86;
  const P = (a: number, r: number) => pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq);
  for (let i = 0; i < 60; i++) {
    const a0 = rot + (i / 60) * Math.PI * 2, a1 = rot + ((i + 1) / 60) * Math.PI * 2;
    const st = pocket(i);
    const base = st === 2 ? mixC(OBS.star, OBS.starDeep, 0.3) : i % 2 ? ROUGE_DEEP : OBS.glass;
    g.fillStyle(base, 1);
    g.fillPoints([P(a0, r1), P(a1, r1), P(a1, r2), P(a0, r2)], true);
    if (st === 1 && i % 2) { g.fillStyle(ROUGE, 0.55); g.fillPoints([P(a0, r1 + 3), P(a1, r1 + 3), P(a1, r2 - 3), P(a0, r2 - 3)], true); }
    if (st === 2) { g.fillStyle(OBS.starCore, 0.5 + 0.3 * Math.sin(t * 3 + i)); g.fillPoints([P(a0 + 0.01, r1 + 5), P(a1 - 0.01, r1 + 5), P(a1 - 0.01, r2 - 6), P(a0 + 0.01, r2 - 6)], true); }
    // Frets: a felt bar between benches, a thin glass edge between seats.
    const fret = i % 6 === 0;
    g.lineStyle(fret ? 2.6 : 1, fret ? FELT_LIT : OBS.edge, fret ? 0.95 : 0.4);
    const f0 = P(a0, r1), f1 = P(a0, r2 + 4);
    g.lineBetween(f0.x, f0.y, f1.x, f1.y);
    // A little ivory number-tick on the outer lip.
    const tk = P((a0 + a1) / 2, r2 + 8);
    g.fillStyle(st === 2 ? OBS.starCore : IVORY_DIM, st === 2 ? 1 : 0.55); g.fillCircle(tk.x, tk.y, st === 2 ? 2 : 1.2);
  }
  // This bench's six pockets: a lilac rim along their outside.
  g.lineStyle(3, LOT_LILAC, 0.5 + 0.2 * Math.sin(t * 2));
  g.beginPath();
  for (let k = 0; k <= 12; k++) {
    const a = rot + ((mine + (k / 12) * 6) / 60) * Math.PI * 2;
    const p = P(a, r2 + 13);
    if (k === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
  }
  g.strokePath();
  g.lineStyle(1.5, OBS.edge, 0.6); g.strokeEllipse(cx, cy, r2 * 2, r2 * 2 * sq);
  g.lineStyle(1.5, OBS.edge, 0.6); g.strokeEllipse(cx, cy, r1 * 2, r1 * 2 * sq);
  // The cone: a raised glass dome, lit on its upper-left.
  g.fillStyle(OBS.facet, 1); g.fillEllipse(cx, cy, r1 * 2, r1 * 2 * sq);
  g.fillStyle(OBS.sheen, 0.5); g.fillEllipse(cx - r1 * 0.2, cy - r1 * 0.2 * sq, r1 * 1.3, r1 * 1.3 * sq);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(cx, cy, r1 * 0.9, r1 * 0.9 * sq);
  // Four spokes (the turret), turning with the wheel, and a violet seam down each.
  for (let k = 0; k < 4; k++) {
    const a = rot * 1 + (k / 4) * Math.PI * 2;
    const tip = P(a, r1 * 0.95), base = P(a, r1 * 0.2);
    g.lineStyle(7, OBS.glass, 1); g.lineBetween(base.x, base.y, tip.x, tip.y);
    g.lineStyle(2, OBS.edge, 0.6); g.lineBetween(base.x, base.y - 2, tip.x, tip.y - 2);
    seam(g, [base, tip], 0.9, 0.5, 0.3 + 0.3 * Math.sin(t * 2 + k));
    g.fillStyle(OBS.sheen, 1); g.fillCircle(tip.x, tip.y - 2, 5);
  }
  // The spindle: a short shard standing in the middle.
  shard(g, cx, cy + 6, 26, 46, 2, 0.4);
  g.fillStyle(OBS.seam, 0.25 + 0.1 * Math.sin(t * 1.4)); g.fillCircle(cx + 2, cy - 30, 9);
  g.fillStyle(OBS.seamLit, 1); g.fillCircle(cx + 2, cy - 30, 2.5);
  // The ball.
  if (ball) {
    const r = r2 + (R * 0.97 - r2) * ball.k;
    const b = P(ball.a, r);
    if (ball.flare > 0) {
      const a0 = rot + (ball.pocket / 60) * Math.PI * 2, a1 = rot + ((ball.pocket + 1) / 60) * Math.PI * 2;
      const lucky = pocket(ball.pocket) === 2;
      g.fillStyle(lucky ? OBS.starCore : FELT_GLOW, 0.35 * ball.flare);
      g.fillPoints([P(a0, r1 - 6), P(a1, r1 - 6), P(a1, r2 + 10), P(a0, r2 + 10)], true);
      glow(g, b.x, b.y, 30, lucky ? OBS.star : FELT_GLOW, 0.05 * ball.flare, 4);
    }
    g.fillStyle(0x000000, 0.4); g.fillEllipse(b.x + 2, b.y + 4, 11, 5);
    g.fillStyle(IVORY_DIM, 1); g.fillCircle(b.x, b.y, 5.5);
    g.fillStyle(IVORY, 1); g.fillCircle(b.x - 0.8, b.y - 0.8, 4.4);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(b.x - 2, b.y - 2, 1.6);
  }
}

// ── The hanging hourglass ────────────────────────────────────────────

/**
 * The great hourglass that hangs over the bench on a chain from the dark: obsidian caps and
 * three rods, two glass bulbs, and the sand — ivory, faintly lilac — running. `x` centre,
 * `y` the middle (waist), `s` scale (1 ≈ 90 px wide, 220 tall), `k` 0–1 how much has run.
 */
export function hourglass(g: G, x: number, y: number, s: number, k: number, t: number, chainTop: number): void {
  const hw = 44 * s, hh = 100 * s;
  // The chain.
  for (let cy = chainTop; cy < y - hh - 14 * s; cy += 9 * s) {
    g.lineStyle(2 * s, OBS.facet, 1); g.strokeEllipse(x, cy, 5 * s, 9 * s);
    g.lineStyle(1, OBS.edge, 0.35); g.strokeEllipse(x - 0.5, cy - 0.5, 5 * s, 9 * s);
  }
  // Back rod.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 2 * s, y - hh, 4 * s, hh * 2);
  // The bulbs (glass), drawn as two lobes meeting at the waist.
  const bulb = (dir: -1 | 1) => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 14; i++) {
      const f = i / 14;
      const w = hw * 0.92 * Math.sin(Math.PI * (0.08 + f * 0.9)) * (0.25 + 0.75 * Math.pow(f, 0.6));
      pts.push(pt(x - w, y + dir * hh * (1 - f) * 0.94));
    }
    for (let i = 14; i >= 0; i--) {
      const f = i / 14;
      const w = hw * 0.92 * Math.sin(Math.PI * (0.08 + f * 0.9)) * (0.25 + 0.75 * Math.pow(f, 0.6));
      pts.push(pt(x + w, y + dir * hh * (1 - f) * 0.94));
    }
    return pts;
  };
  const top = bulb(-1), bot = bulb(1);
  g.fillStyle(OBS.glass, 0.55); g.fillPoints(top, true); g.fillPoints(bot, true);
  // Sand in the top bulb (shrinking), the stream, the heap below (growing).
  const sand = mixC(IVORY_DIM, LOT_LILAC, 0.25);
  const topH = hh * 0.8 * (1 - k);
  if (topH > 2) {
    g.fillStyle(sand, 0.9);
    g.fillTriangle(x - hw * 0.62 * (topH / (hh * 0.8)), y - 8 * s - topH, x + hw * 0.62 * (topH / (hh * 0.8)), y - 8 * s - topH, x, y - 4 * s);
    g.fillStyle(lit(sand, 0.3), 0.5); g.fillEllipse(x, y - 8 * s - topH, hw * 1.2 * (topH / (hh * 0.8)), 6 * s);
  }
  if (k < 1) {
    g.lineStyle(1.6 * s, lit(sand, 0.2), 0.9); g.lineBetween(x, y - 4 * s, x, y + hh * 0.9 - hh * 0.55 * k);
    for (let i = 0; i < 4; i++) { const fy = y + ((t * 140 + i * 40) % (hh * 0.8)); g.fillStyle(IVORY, 0.8); g.fillCircle(x + Math.sin(t * 9 + i) * 1.2, fy, 1.1 * s); }
  }
  const heap = hh * 0.6 * k;
  g.fillStyle(sand, 0.95); g.fillTriangle(x - hw * 0.8, y + hh * 0.92, x + hw * 0.8, y + hh * 0.92, x, y + hh * 0.92 - heap - 4 * s);
  // Glass highlights.
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokePoints(top, true); g.strokePoints(bot, true);
  g.lineStyle(3 * s, 0xffffff, 0.12); g.lineBetween(x - hw * 0.55, y - hh * 0.7, x - hw * 0.3, y - hh * 0.2);
  g.lineBetween(x - hw * 0.55, y + hh * 0.25, x - hw * 0.35, y + hh * 0.7);
  // Caps and front rods.
  for (const cy of [y - hh - 8 * s, y + hh + 8 * s]) {
    g.fillStyle(OBS.glass, 1); g.fillEllipse(x, cy, hw * 2.3, 16 * s);
    g.fillStyle(OBS.sheen, 1); g.fillEllipse(x, cy - 3 * s, hw * 2.1, 9 * s);
    g.lineStyle(1, OBS.edge, 0.7); g.strokeEllipse(x, cy, hw * 2.3, 16 * s);
  }
  for (const sx of [-1, 1]) {
    g.fillStyle(OBS.facet, 1); g.fillRect(x + sx * hw * 1.02 - 3 * s, y - hh - 4 * s, 6 * s, hh * 2 + 8 * s);
    g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x + sx * hw * 1.02 - 2 * s, y - hh, x + sx * hw * 1.02 - 2 * s, y + hh);
  }
  seam(g, [{ x: x + hw * 1.02, y: y - hh * 0.3 }, { x: x + hw * 1.02 - 1, y: y + hh * 0.1 }], 0.8, 0.5, 0.2);
}

// ── War-tables ───────────────────────────────────────────────────────

/**
 * A war-table of the conscription: an obsidian table whose top is a felt map of an isle under
 * glass — ink coasts, provinces, rouge pins for the drawn, little glass soldiers marching.
 * `x` centre, `y` base line, `w` × `d` the top.
 */
export function warTable(g: G, x: number, y: number, w: number, d: number, rng: () => number): void {
  const topY = y - 46 - d;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4, w * 1.1, 22);
  // Legs.
  for (const sx of [-1, 1]) slab(g, x + sx * (w / 2 - 14), y, 16, 48);
  slab(g, x, y - 8, w - 50, 10);
  // The top: a glass slab with the felt map sunk into it.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - w / 2 - 6, topY - 6, w + 12, d + 16);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - w / 2 - 6, topY + d + 2, w + 12, 8);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(x - w / 2 - 6, topY - 6, w + 12, d + 16);
  g.fillStyle(FELT_DEEP, 1); g.fillRect(x - w / 2, topY, w, d);
  // An isle: a ragged coast blob in felt.
  const isle: Phaser.Geom.Point[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 0.62 + rng() * 0.3;
    isle.push(pt(x + Math.cos(a) * w * 0.42 * rr, topY + d / 2 + Math.sin(a) * d * 0.4 * rr));
  }
  g.fillStyle(FELT, 1); g.fillPoints(isle, true);
  g.lineStyle(1.2, FELT_LIT, 0.8); g.strokePoints(isle, true);
  // Province borders in ink, a few hills, a road.
  for (let i = 0; i < 3; i++) {
    const a = { x: x - w * 0.35 + rng() * w * 0.7, y: topY + 4 };
    const b = { x: x - w * 0.35 + rng() * w * 0.7, y: topY + d - 4 };
    g.lineStyle(1, OBS.glass, 0.7);
    const p = crackPath(a, b, rng, 6, 5);
    g.beginPath(); g.moveTo(p[0].x, p[0].y); for (const q of p) g.lineTo(q.x, q.y); g.strokePath();
  }
  for (let i = 0; i < 5; i++) {
    const hx = x - w * 0.3 + rng() * w * 0.6, hy = topY + d * 0.25 + rng() * d * 0.5;
    g.fillStyle(FELT_LIT, 0.8); g.fillTriangle(hx - 4, hy + 3, hx + 4, hy + 3, hx, hy - 4);
  }
  // Pins: rouge for the drawn, ivory for the spared, a few with paper flags.
  for (let i = 0; i < 9; i++) {
    const px = x - w * 0.36 + rng() * w * 0.72, py = topY + 6 + rng() * (d - 12);
    const red = rng() < 0.6;
    g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(px, py, px, py - 7);
    g.fillStyle(red ? ROUGE_LIT : IVORY, 1); g.fillCircle(px, py - 8, 2.2);
    if (red && rng() < 0.4) { g.fillStyle(IVORY, 0.9); g.fillTriangle(px, py - 14, px + 7, py - 12, px, py - 10); }
  }
  // Glass soldiers in a column, marching to the edge of the map.
  for (let i = 0; i < 6; i++) {
    const sx = x - w * 0.2 + i * 9, sy = topY + d * 0.72;
    g.fillStyle(OBS.sheen, 1); g.fillRect(sx - 2, sy - 7, 4, 7);
    g.fillStyle(OBS.edge, 0.9); g.fillCircle(sx, sy - 9, 2);
  }
  // A compass rose in the corner.
  const kx = x + w / 2 - 16, ky = topY + 14;
  g.lineStyle(1, IVORY_DIM, 0.8); g.strokeCircle(kx, ky, 8);
  g.fillStyle(IVORY, 0.9); g.fillTriangle(kx - 2, ky, kx + 2, ky, kx, ky - 10);
  g.fillStyle(IVORY_DIM, 0.7); g.fillTriangle(kx - 2, ky, kx + 2, ky, kx, ky + 8);
  // The glass over it all.
  g.fillStyle(0xffffff, 0.05); g.fillTriangle(x - w / 2, topY, x, topY, x - w / 2, topY + d);
}

// ── Seats ────────────────────────────────────────────────────────────

/** The device inlaid in each seat's plinth. */
export type Emblem = 'die' | 'chip' | 'hourglass' | 'ticket' | 'eye' | 'flag';

/** An emblem in felt light, `s` its half-size. */
export function emblem(g: G, kind: Emblem, x: number, y: number, s: number, color = FELT_GLOW, a = 1): void {
  g.fillStyle(color, 0.1 * a); g.fillCircle(x, y, s * 1.8);
  g.lineStyle(Math.max(1.2, s * 0.14), color, a);
  g.fillStyle(color, a);
  switch (kind) {
    case 'die':
      g.strokeRoundedRect(x - s, y - s, s * 2, s * 2, s * 0.3);
      for (const [px, py] of pipLayout(5)) g.fillCircle(x + px * s * 0.6, y + py * s * 0.6, s * 0.16);
      break;
    case 'chip':
      g.strokeCircle(x, y, s); g.strokeCircle(x, y, s * 0.55);
      for (let i = 0; i < 6; i++) { const a2 = (i / 6) * Math.PI * 2; g.fillRect(x + Math.cos(a2) * s * 0.8 - 1.5, y + Math.sin(a2) * s * 0.8 - 1.5, 3, 3); }
      break;
    case 'hourglass':
      g.strokeTriangle(x - s * 0.8, y - s, x + s * 0.8, y - s, x, y);
      g.strokeTriangle(x - s * 0.8, y + s, x + s * 0.8, y + s, x, y);
      g.fillTriangle(x - s * 0.5, y + s, x + s * 0.5, y + s, x, y + s * 0.35);
      break;
    case 'ticket':
      g.strokeRect(x - s * 0.7, y - s, s * 1.4, s * 2);
      g.strokeCircle(x, y - s * 0.62, s * 0.18);
      g.lineBetween(x - s * 0.4, y, x + s * 0.4, y); g.lineBetween(x - s * 0.4, y + s * 0.4, x + s * 0.3, y + s * 0.4);
      break;
    case 'eye':
      g.beginPath(); g.arc(x, y + s * 0.9, s * 1.35, Math.PI * 1.22, Math.PI * 1.78, false); g.strokePath();
      g.beginPath(); g.arc(x, y - s * 0.9, s * 1.35, Math.PI * 0.22, Math.PI * 0.78, false); g.strokePath();
      g.fillCircle(x, y, s * 0.32);
      break;
    case 'flag':
      g.lineBetween(x - s * 0.6, y + s, x - s * 0.6, y - s);
      g.fillTriangle(x - s * 0.6, y - s, x + s, y - s * 0.6, x - s * 0.6, y - s * 0.15);
      break;
  }
}

/**
 * A councilor's seat: a tall obsidian chair on a stepped plinth — five shards for a back, a
 * mask-shaped hollow at its crown where the councilor's mask is hung while they sit, arms and a
 * seat slab, and the seat's emblem in felt light on the plinth's face. `x` centre, `y` base.
 */
export function councilSeat(g: G, x: number, y: number, s: number, kind: Emblem, rng: () => number): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 4, 170 * s, 30 * s);
  // The plinth: three steps.
  slab(g, x, y, 150 * s, 20 * s, rng, 1);
  slab(g, x, y - 20 * s, 124 * s, 18 * s);
  slab(g, x, y - 38 * s, 100 * s, 16 * s);
  emblem(g, kind, x, y - 10 * s, 7 * s, FELT_GLOW, 0.95);
  const sy = y - 54 * s;
  // The back: shards, outer first.
  shard(g, x - 34 * s, sy - 18 * s, 30 * s, 110 * s, -10 * s, 0.1);
  shard(g, x + 34 * s, sy - 18 * s, 30 * s, 116 * s, 10 * s, 0.1);
  shard(g, x - 16 * s, sy - 18 * s, 34 * s, 160 * s, -4 * s, 0.2);
  shard(g, x + 16 * s, sy - 18 * s, 34 * s, 166 * s, 4 * s, 0.2);
  shard(g, x, sy - 18 * s, 40 * s, 200 * s, 0, 0.32);
  // The mask-hollow near the crown: an empty kite cut into the glass, its slit dark.
  const mx = x, my = sy - 150 * s;
  g.fillStyle(0x05040a, 1);
  g.fillPoints([pt(mx - 9 * s, my - 14 * s), pt(mx, my - 17 * s), pt(mx + 9 * s, my - 14 * s), pt(mx + 14 * s, my - 3 * s), pt(mx, my + 15 * s), pt(mx - 14 * s, my - 3 * s)], true);
  g.lineStyle(1, OBS.edge, 0.5);
  g.strokePoints([pt(mx - 9 * s, my - 14 * s), pt(mx, my - 17 * s), pt(mx + 9 * s, my - 14 * s), pt(mx + 14 * s, my - 3 * s), pt(mx, my + 15 * s), pt(mx - 14 * s, my - 3 * s)], true);
  // Arms and the seat.
  slab(g, x - 38 * s, sy, 18 * s, 40 * s);
  slab(g, x + 38 * s, sy, 18 * s, 40 * s);
  slab(g, x, sy, 60 * s, 22 * s);
  // Felt inlay down the seat-back's middle shard.
  g.lineStyle(2 * s, FELT, 0.8); g.lineBetween(x, sy - 30 * s, x, sy - 120 * s);
  g.lineStyle(0.8 * s, FELT_GLOW, 0.7); g.lineBetween(x, sy - 30 * s, x, sy - 120 * s);
  for (let i = 0; i < 4; i++) { g.fillStyle(FELT_GLOW, 0.8); g.fillCircle(x, sy - 40 * s - i * 22 * s, 1.6 * s); }
  seam(g, crackPath({ x: x + 20 * s, y: sy - 150 * s }, { x: x + 12 * s, y: sy - 40 * s }, rng, 4, 5), 0.9, 0.6);
  // Fallen chips at the foot, rouge and glass.
  for (let i = 0; i < 3; i++) chipStack(g, x - 60 * s + i * 54 * s + rng() * 10, y + 14 * s, 1 + Math.floor(rng() * 3), i % 2 ? ROUGE : OBS.facet, 5 * s);
}

/** Roulette rouge with a lit bevel — a cloth of the auction block, a drape. */
export function drape(g: G, x: number, y: number, w: number, h: number, t = 0): void {
  const folds = Math.max(3, Math.round(w / 14));
  for (let i = 0; i < folds; i++) {
    const fx = x - w / 2 + (i / folds) * w;
    const sway = Math.sin(t * 1.3 + i) * 1.5;
    g.fillStyle(i % 2 ? ROUGE : ROUGE_DEEP, 1);
    g.fillPoints([pt(fx, y), pt(fx + w / folds, y), pt(fx + w / folds + sway, y + h), pt(fx + sway, y + h + (i % 2 ? 4 : 0))], true);
  }
  g.lineStyle(1, ROUGE_LIT, 0.6); g.lineBetween(x - w / 2, y, x + w / 2, y);
  g.fillStyle(IVORY_DIM, 0.8);
  for (let i = 0; i < folds; i++) g.fillCircle(x - w / 2 + (i + 0.5) * (w / folds), y + h + 2, 1.6);
}
