import type Phaser from 'phaser';
import type { BossEntryKit } from '../../../../boss/framework/BossDefs';
import { brandSigil, dim, lit, mixC, mulberry } from '../../../art/IsleArt';
import { OBS, crackPath, seam, starfield } from '../../../art/PinnacleArt';
import { FS, type FallenPose, type Pt, clampN, smooth } from './fallenState';

/**
 * Act IV — THE FALLEN KING: how he and his floor are painted.
 *
 * HIM: a man, no bigger than you. A judge's robe gone to ash, a cinder showing through every crack
 * in it and beating like a heart; a charred head with two ember eyes and a pale band across the
 * brow where a crown sat for a thousand years; white bands at the throat; the case-book under his
 * arm. No crown, no glass, no throne. He stands on a star-scar of his own.
 *
 * HIS FLOOR: the Fall coming apart. Under everything is the bare amber-and-bottle-green glass of
 * Fallpoint at night. Over it lie ten pieces of the ten isles' ground — basalt and brand, sea,
 * moss and thorn, cloud, flagstone, copper, venom, the Lot's checkers, brass, the Noon's glare —
 * and as his pool falls they break up and drift off one by one, first-freed first, until at the
 * end he is fighting on the glass with nothing behind him. When he cites a law, its isle's piece
 * flares (or, if it has already gone, comes back as a ghost for a moment).
 */

type G = Phaser.GameObjects.Graphics;
const TAU = Math.PI * 2;

/** The ember of the cinder under the robe, and its white-hot heart. */
export const EMBER = 0xff7a2a;
export const EMBER_HOT = 0xffd9a0;
/** Every Fallen has these eyes. */
export const EYE = 0xffa040;
const ASH = 0x3a3532;
const ASH_LIT = 0x5a544f;
const ASH_DARK = 0x221f1d;
const CHAR = 0x16100e;

/** One of the ten laws: its name and its isle's colours. `LAWS` order is the order the isles were freed. */
export interface Law { name: string; color: number; deep: number; light: number }

export const LAWS: Law[] = [
  { name: 'THE BRAND', color: 0xff6a2a, deep: 0x2a120c, light: 0xffc070 },
  { name: 'THE UNDERTOW', color: 0x2a9ac0, deep: 0x0c3048, light: 0xbfeeff },
  { name: 'THE PRUNING', color: 0x5aa83a, deep: 0x1e3a18, light: 0xc8f0a0 },
  { name: 'THE BREATH-TAX', color: 0xbcd8f0, deep: 0x5a7a9a, light: 0xffffff },
  { name: 'THE STONE TITHE', color: 0xb08850, deep: 0x4a3620, light: 0xe8d0a0 },
  { name: 'THE DRAW', color: 0x5ad0ff, deep: 0x14243a, light: 0xfff27a },
  { name: 'THE MARK', color: 0x8ad030, deep: 0x2a1a3a, light: 0xd0ff80 },
  { name: 'THE LOT', color: 0xd4a838, deep: 0x2e1650, light: 0xffe8a0 },
  { name: 'THE PART', color: 0xc89a48, deep: 0x3a2a14, light: 0xfff0c8 },
  { name: 'THE ENDLESS NOON', color: 0xfff0b0, deep: 0xb08a30, light: 0xffffff },
];

/** The heart's beat (0–1, sharp), shared by the robe's cracks and the floor's seams. */
export const beat = (tSec: number): number => Math.pow(Math.max(0, Math.sin(tSec * 5.2)), 6) + 0.6 * Math.pow(Math.max(0, Math.sin(tSec * 5.2 - 0.9)), 8);

// ── Him ──────────────────────────────────────────────────────────────

export interface FallenDraw {
  /** Seconds. */
  t: number;
  face: number;
  pose: FallenPose;
  hurt: boolean;
  /** The law on his page (or -1) and how fresh the citing is (1 = just now). */
  cite: number;
  citeK: number;
  walk: number;
  air: number;
  /** His pool: the lower, the wider the cracks. */
  hp: number;
}

/** The case-book: shut (leather and a violet clasp) or open on a law (pages lit in its isle's colour). */
function book(g: G, x: number, y: number, open: boolean, law: number, k: number): void {
  if (!open) {
    g.fillStyle(0x1a110e, 1); g.fillRect(x - 6, y - 8, 12, 15);
    g.fillStyle(0x3a2620, 1); g.fillRect(x - 5, y - 7, 10, 13);
    g.fillStyle(0xd8ccb0, 0.8); g.fillRect(x + 5, y - 6, 1.5, 11);
    g.fillStyle(OBS.seam, 0.9); g.fillRect(x - 1, y - 2, 6, 3);
    return;
  }
  const c = law >= 0 ? LAWS[law] : null;
  if (c) { g.fillStyle(c.color, 0.12 + 0.18 * k); g.fillCircle(x, y - 4, 18); }
  g.fillStyle(0x2a1a14, 1);
  g.fillPoints([{ x: x - 13, y: y - 6 }, { x: x, y: y - 3 }, { x: x + 13, y: y - 6 }, { x: x + 13, y: y + 5 }, { x: x, y: y + 7 }, { x: x - 13, y: y + 4 }], true);
  g.fillStyle(0xeee2c4, 1);
  g.fillPoints([{ x: x - 12, y: y - 7 }, { x: x - 0.5, y: y - 4 }, { x: x - 0.5, y: y + 5 }, { x: x - 12, y: y + 3 }], true);
  g.fillPoints([{ x: x + 12, y: y - 7 }, { x: x + 0.5, y: y - 4 }, { x: x + 0.5, y: y + 5 }, { x: x + 12, y: y + 3 }], true);
  g.lineStyle(0.8, c ? dim(c.color, 0.3) : 0x6a5a48, 0.8);
  for (let i = 0; i < 3; i++) {
    g.lineBetween(x - 10, y - 4 + i * 2.6, x - 2.5, y - 2 + i * 2.6);
    g.lineBetween(x + 2.5, y - 2 + i * 2.6, x + 10, y - 4 + i * 2.6);
  }
  if (c) {
    // A little of the law's own mark on the right-hand page.
    g.fillStyle(c.color, 0.85); g.fillCircle(x + 6, y + 2.5, 1.8);
    g.lineStyle(1, c.light, 0.4 + 0.5 * k); g.strokeCircle(x + 6, y + 2.5, 3);
  }
}

/** The gavel he never had in the hall: a short black-glass head on a charred haft. */
function gavel(g: G, hx: number, hy: number, a: number): void {
  const ex = hx + Math.cos(a) * 16, ey = hy + Math.sin(a) * 16;
  g.lineStyle(3, 0x2a1c14, 1); g.lineBetween(hx, hy, ex, ey);
  const px = -Math.sin(a), py = Math.cos(a);
  g.fillStyle(OBS.glass, 1);
  g.fillPoints([{ x: ex + px * 8, y: ey + py * 8 }, { x: ex + px * 8 + Math.cos(a) * 6, y: ey + py * 8 + Math.sin(a) * 6 }, { x: ex - px * 8 + Math.cos(a) * 6, y: ey - py * 8 + Math.sin(a) * 6 }, { x: ex - px * 8, y: ey - py * 8 }], true);
  g.lineStyle(1, OBS.edge, 0.8); g.lineBetween(ex + px * 8, ey + py * 8, ex - px * 8, ey - py * 8);
  g.lineStyle(1, EMBER, 0.7); g.lineBetween(ex + px * 3 + Math.cos(a) * 3, ey + py * 3 + Math.sin(a) * 3, ex - px * 2 + Math.cos(a) * 3, ey - py * 2 + Math.sin(a) * 3);
}

/** The Fallen King, whole, at (x, y) — torso centre; the hem is about y + 20. */
export function drawFallen(g: G, x: number, y0: number, o: FallenDraw): void {
  const t = o.t;
  const lift = o.air * 46;
  const y = y0 - lift;
  const fx = Math.cos(o.face), fy = Math.sin(o.face);
  const px = -fy, py = fx;
  const b = beat(t);
  const crack = 0.45 + (1 - clampN(o.hp, 0, 1)) * 0.55;

  // The star-scar under his feet: a scorch with six burnt rays (every Fallen stands on one).
  const sk = 1 - o.air * 0.5;
  g.fillStyle(0x000000, 0.3 * sk); g.fillEllipse(x, y0 + 21, 52 * sk, 15 * sk);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    g.lineStyle(2, 0x2a1408, 0.4 * sk);
    g.lineBetween(x + Math.cos(a) * 10, y0 + 21 + Math.sin(a) * 3, x + Math.cos(a) * 34, y0 + 21 + Math.sin(a) * 10);
    g.fillStyle(EMBER, 0.35 * (0.5 + 0.5 * Math.sin(t * 3 + i))); g.fillCircle(x + Math.cos(a) * 30, y0 + 21 + Math.sin(a) * 9, 1.2);
  }
  // The law he reads, round him like weather.
  if (o.cite >= 0 && o.citeK > 0) {
    const c = LAWS[o.cite];
    for (let i = 3; i >= 1; i--) { g.fillStyle(c.color, 0.05 * o.citeK); g.fillCircle(x, y - 6, 22 + i * 12); }
  }

  // The robe: a bell of ash, the hem ragged and stirring, leaning back when he dashes.
  const sway = Math.sin(o.walk * 0.07) * 2.5 + Math.sin(t * 2.1) * 1.1;
  const lean = o.pose === 'dash' ? 7 : 0;
  const hem: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    const rag = (i % 2 ? 4 : 0) + ((i * 7) % 3);
    const hx = x - 21 + 42 * k + sway - fx * lean;
    hem.push({ x: hx, y: y + 18 + rag * 0.6 + Math.sin(t * 6 + i * 1.3) * 1.6 - fy * lean });
  }
  const robe: Pt[] = [{ x: x - 11, y: y - 13 }, { x: x - 16 + sway * 0.4, y: y + 2 }, ...hem.slice(0), { x: x + 16 + sway * 0.4, y: y + 2 }, { x: x + 11, y: y - 13 }];
  g.fillStyle(ASH_DARK, 1); g.fillPoints(robe.map((p) => ({ x: p.x, y: p.y + 1.5 })), true);
  g.fillStyle(ASH, 1); g.fillPoints(robe, true);
  // The front panel, a shade lighter, and the folds.
  g.fillStyle(ASH_LIT, 0.55);
  g.fillPoints([{ x: x - 5, y: y - 12 }, { x: x + 5, y: y - 12 }, { x: x + 9 + sway * 0.7, y: y + 19 }, { x: x - 9 + sway * 0.7, y: y + 19 }], true);
  g.lineStyle(1.2, ASH_DARK, 0.8);
  for (const k of [-0.55, 0, 0.55]) g.lineBetween(x + k * 10, y - 8, x + k * 18 + sway, y + 19);
  // The cracks: the cinder showing through, beating.
  const rng = mulberry(7177);
  for (let i = 0; i < 4; i++) {
    const ax = x - 10 + rng() * 20, ay = y - 8 + rng() * 10;
    const bx = ax + (rng() - 0.5) * 18, by = ay + 8 + rng() * 12;
    const pts = crackPath({ x: ax, y: ay }, { x: bx, y: by }, rng, 3, 4);
    if (i / 4 < crack) seam(g, pts, 0.7 + crack * 0.6, 0.6 + b * 0.4, b, EMBER);
  }
  // Ash lifting off him.
  for (let i = 0; i < 7; i++) {
    const k = (t * 0.6 + i / 7) % 1;
    const ax = x + Math.sin(i * 2.3 + t) * 14 + k * 6, ay = y + 10 - k * 46;
    g.fillStyle(i % 3 === 0 ? EMBER : 0x9a928a, (1 - k) * (i % 3 === 0 ? 0.7 : 0.45));
    g.fillRect(ax, ay, 1.6, 1.6);
  }

  // Hands, by pose.
  const sh = [{ x: x - 11, y: y - 9 }, { x: x + 11, y: y - 9 }];
  let hb: Pt, hr: Pt;
  switch (o.pose) {
    case 'cite': hb = { x: x + fx * 15 - px * 7, y: y + fy * 9 - py * 7 }; hr = { x: x + fx * 6 + px * 12, y: y - 20 }; break;
    case 'inhale': hb = { x: x - 7, y: y - 5 }; hr = { x: x + 7, y: y - 5 }; break;
    case 'gavel': hb = { x: x - 4, y: y - 34 }; hr = { x: x + 4, y: y - 34 }; break;
    case 'struck': hb = { x: x + fx * 20 - px * 4, y: y + fy * 12 + 8 }; hr = { x: x + fx * 20 + px * 4, y: y + fy * 12 + 8 }; break;
    case 'dash': hb = { x: x - fx * 16 - px * 9, y: y - fy * 10 + 4 }; hr = { x: x - fx * 16 + px * 9, y: y - fy * 10 + 4 }; break;
    case 'gnomon': hb = { x: x - 6, y: y - 38 }; hr = { x: x + 6, y: y - 38 }; break;
    default: hb = { x: x - 16, y: y + 1 }; hr = { x: x + 16 + fx * 3, y: y + 2 + fy * 3 };
  }
  for (const [s, h] of [[sh[0], hb], [sh[1], hr]] as const) {
    g.lineStyle(7, ASH_DARK, 1); g.lineBetween(s.x, s.y, h.x, h.y);
    g.lineStyle(5, ASH, 1); g.lineBetween(s.x, s.y, h.x, h.y);
  }

  // The judge's bands at the throat.
  g.fillStyle(0xd8d2c8, 0.95); g.fillRect(x - 4, y - 13, 3, 7); g.fillRect(x + 1, y - 13, 3, 7);
  g.lineStyle(0.8, 0x8a827a, 0.8); g.lineBetween(x, y - 13, x, y - 6);

  // The head: charred, seamed with the same fire, a pale band where the crown sat.
  const hx = x + fx * 1.5, hy = y - 24;
  g.fillStyle(0x000000, 0.3); g.fillCircle(hx, hy + 2, 11);
  g.fillStyle(CHAR, 1); g.fillCircle(hx, hy, 11);
  g.fillStyle(0x2a201c, 1); g.fillCircle(hx - 3, hy - 3, 6);
  seam(g, [{ x: hx - 7, y: hy + 4 }, { x: hx - 3, y: hy + 6 }, { x: hx + 1, y: hy + 3 }], 0.6, 0.5 + b * 0.5, b, EMBER);
  if (crack > 0.7) seam(g, [{ x: hx + 4, y: hy - 9 }, { x: hx + 6, y: hy - 3 }, { x: hx + 9, y: hy }], 0.6, 0.7, b, EMBER);
  g.lineStyle(2, 0x9a8c7c, 0.55); g.beginPath(); g.arc(hx, hy, 9.5, Math.PI * 1.12, Math.PI * 1.88, false); g.strokePath();
  if (fy > -0.55) {
    for (const s of [-1, 1]) {
      const ex = hx + fx * 4 + px * s * 4, ey = hy + 1 + fy * 2.5 + py * s * 1.2;
      g.fillStyle(EYE, 0.25); g.fillCircle(ex, ey, 4);
      g.fillStyle(EYE, 1); g.fillCircle(ex, ey, 1.9);
      g.fillStyle(0xfff4d0, 1); g.fillCircle(ex, ey, 0.8);
    }
  }

  // What the hands hold.
  const ball = (h: Pt): void => {
    g.fillStyle(0x0c0806, 1); g.fillCircle(h.x, h.y + 1, 5.2);
    g.fillStyle(0x1e1614, 1); g.fillCircle(h.x, h.y, 5);
    g.fillStyle(EMBER, 0.35 + b * 0.4); g.fillCircle(h.x + 1.5, h.y - 1.5, 1.4);
  };
  if (o.pose === 'cite') book(g, hb.x, hb.y, true, o.cite, o.citeK);
  else if (o.pose === 'gnomon') book(g, x, y - 46, true, 9, 1);
  else if (o.pose === 'rest' || o.pose === 'inhale' || o.pose === 'dash') book(g, hb.x, hb.y + 2, false, -1, 0);
  if (o.pose === 'gavel') gavel(g, x, y - 34, -Math.PI / 2);
  if (o.pose === 'struck') gavel(g, (hb.x + hr.x) / 2, (hb.y + hr.y) / 2, o.face);
  ball(hb); ball(hr);

  // The heart: a point of the old star at the breastbone, seen through the robe.
  g.fillStyle(EMBER, 0.12 + b * 0.18); g.fillCircle(x, y - 2, 9);
  g.fillStyle(EMBER_HOT, 0.45 + b * 0.5); g.fillCircle(x, y - 2, 1.8 + b * 1.4);
  if (o.hurt) { g.fillStyle(0xffffff, 0.35); g.fillCircle(x, y - 4, 22); }
}

/** Grey ghosts of him where he has just been (dashes, slipped shots). */
export function drawTrail(g: G, now: number): void {
  for (const a of FS.trail) {
    const k = 1 - (now - a.at) / 500;
    if (k <= 0) continue;
    g.fillStyle(0x8a827a, 0.16 * k);
    g.fillPoints([{ x: a.x - 11, y: a.y - 13 }, { x: a.x + 11, y: a.y - 13 }, { x: a.x + 20, y: a.y + 19 }, { x: a.x - 20, y: a.y + 19 }], true);
    g.fillCircle(a.x, a.y - 24, 10);
    g.fillStyle(EMBER, 0.3 * k); g.fillCircle(a.x, a.y - 2, 2);
  }
}

// ── The floor ────────────────────────────────────────────────────────

/** Fallpoint's glass: sea boiled amber and bottle-green. */
const AMBER = 0x8a6420;
const BOTTLE = 0x1e4a2a;
const GLASS_DEEP = 0x0e1e16;
/** The crater bowl's centre and radii on the arena floor. */
const BOWL = { x: 480, y: 372, rx: 500, ry: 270 };

/** The night sky in the HUD strip — one star missing — and the glass bowl with what the sea left in it. */
export function paintFallpoint(g: G, W: number, H: number): void {
  const rng = mulberry(4401);
  g.fillStyle(0x050912, 1); g.fillRect(0, 0, W, H);
  // Sky over the strip, banded to a horizon of black sea.
  for (let i = 0; i < 6; i++) { g.fillStyle(mixC(0x03040a, 0x16203e, i / 6), 1); g.fillRect(0, i * 15, W, 15); }
  starfield(g, 0, 0, W, 82, rng, 90, 0, 0xdde4ff);
  // The gap where a star was: a faint ring round nothing.
  g.lineStyle(1, 0x5a6a9a, 0.4); g.strokeCircle(612, 34, 7);
  g.lineStyle(1, 0x5a6a9a, 0.18); g.strokeCircle(612, 34, 12);
  g.fillStyle(0x0a1224, 1); g.fillRect(0, 84, W, 12);
  g.lineStyle(1, 0x2a3a5a, 0.7); g.lineBetween(0, 85, W, 85);
  // The sea round the reef, with long glints.
  g.fillStyle(0x07101e, 1); g.fillRect(0, 96, W, H - 96);
  for (let i = 0; i < 60; i++) {
    const sx = rng() * W, sy = 100 + rng() * (H - 100);
    g.lineStyle(1, 0x2a4a6a, 0.2 + rng() * 0.25); g.lineBetween(sx, sy, sx + 10 + rng() * 20, sy);
  }
  // The bowl of fused glass.
  g.fillStyle(0x1a3020, 1); g.fillEllipse(BOWL.x, BOWL.y, BOWL.rx * 2 + 24, BOWL.ry * 2 + 20);
  g.fillStyle(BOTTLE, 1); g.fillEllipse(BOWL.x, BOWL.y, BOWL.rx * 2, BOWL.ry * 2);
  // Facets: amber and green planes, fused unevenly.
  for (let i = 0; i < 170; i++) {
    const a = rng() * TAU, d = Math.sqrt(rng()) * 0.95;
    const cx = BOWL.x + Math.cos(a) * BOWL.rx * d, cy = BOWL.y + Math.sin(a) * BOWL.ry * d;
    const s = 14 + rng() * 30, r0 = rng() * TAU;
    const tone = rng();
    g.fillStyle(tone < 0.45 ? AMBER : tone < 0.85 ? 0x2a5a34 : GLASS_DEEP, 0.18 + rng() * 0.3);
    g.fillTriangle(cx + Math.cos(r0) * s, cy + Math.sin(r0) * s * 0.7, cx + Math.cos(r0 + 2.1) * s, cy + Math.sin(r0 + 2.1) * s * 0.7, cx + Math.cos(r0 + 4.2) * s, cy + Math.sin(r0 + 4.2) * s * 0.7);
  }
  // The bowl's rings, where the boiling sea set in layers.
  for (let i = 1; i <= 5; i++) {
    g.lineStyle(1.2, i % 2 ? AMBER : 0x4a8a5a, 0.18);
    g.strokeEllipse(BOWL.x, BOWL.y, BOWL.rx * 2 * (i / 5.4), BOWL.ry * 2 * (i / 5.4));
  }
  // What the sea left in it: shells, a ship's timbers, startled fish, sand.
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU, d = 0.2 + rng() * 0.7;
    const cx = BOWL.x + Math.cos(a) * BOWL.rx * d, cy = BOWL.y + Math.sin(a) * BOWL.ry * d;
    g.lineStyle(1.4, 0xd8c8a0, 0.3);
    g.beginPath(); for (let k = 0; k < 14; k++) { const r = 1 + k * 0.45, aa = k * 0.7; if (k === 0) g.moveTo(cx, cy); else g.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r); } g.strokePath();
  }
  for (const [tx, ty, ta] of [[250, 460, 0.3], [700, 250, -0.5]] as const) {
    for (let k = 0; k < 3; k++) {
      const ox = tx + Math.cos(ta + Math.PI / 2) * k * 9, oy = ty + Math.sin(ta + Math.PI / 2) * k * 9;
      const ex = ox + Math.cos(ta) * 90, ey = oy + Math.sin(ta) * 90;
      g.lineStyle(7, 0x3a2414, 0.5); g.lineBetween(ox, oy, ex - k * 12, ey);
      g.fillStyle(0x8a7a5a, 0.5); g.fillCircle(ox + Math.cos(ta) * 12, oy + Math.sin(ta) * 12, 1.4); g.fillCircle(ex - k * 12 - Math.cos(ta) * 10, ey - Math.sin(ta) * 10, 1.4);
    }
  }
  for (let i = 0; i < 9; i++) {
    const cx = BOWL.x + (rng() - 0.5) * BOWL.rx * 1.5, cy = BOWL.y + (rng() - 0.5) * BOWL.ry * 1.4;
    const a = rng() * TAU, ca = Math.cos(a), sa = Math.sin(a);
    g.fillStyle(0x9ab8a0, 0.28); g.fillEllipse(cx, cy, 14, 6);
    g.fillTriangle(cx - ca * 7, cy - sa * 3, cx - ca * 12 - sa * 4, cy - sa * 5 + ca * 4, cx - ca * 12 + sa * 4, cy - sa * 5 - ca * 4);
    g.fillStyle(0x0a140c, 0.6); g.fillCircle(cx + ca * 4, cy + sa * 1.5, 0.9);
  }
  for (let i = 0; i < 260; i++) {
    const a = rng() * TAU, d = Math.sqrt(rng());
    g.fillStyle(0xe8d0a0, 0.12 + rng() * 0.16);
    g.fillRect(BOWL.x + Math.cos(a) * BOWL.rx * d, BOWL.y + Math.sin(a) * BOWL.ry * d, 1.2, 1.2);
  }
  // The sky in the glass: the same stars, faint, and the gap.
  starfield(g, 40, 120, W - 80, H - 140, rng, 70, 0, 0x9ab0e0);
}

/** One of the ten pieces: its seat on the floor, its outline, and the chips it sheds. */
interface Patch { x: number; y: number; r: number; pts: Pt[]; chips: { a: number; d: number; s: number }[] }

const PATCHES: Patch[] = (() => {
  const out: Patch[] = [];
  for (let i = 0; i < 10; i++) {
    const rng = mulberry(9100 + i * 37);
    const a = -Math.PI / 2 + (i / 10) * TAU + 0.18;
    const x = 480 + Math.cos(a) * 330, y = 368 + Math.sin(a) * 178;
    const r = 78 + rng() * 22;
    const pts: Pt[] = [];
    for (let k = 0; k < 14; k++) {
      const aa = (k / 14) * TAU;
      const rr = r * (0.78 + rng() * 0.3);
      pts.push({ x: x + Math.cos(aa) * rr, y: y + Math.sin(aa) * rr * 0.72 });
    }
    const chips = Array.from({ length: 6 }, () => ({ a: rng() * TAU, d: r * (0.7 + rng() * 0.3), s: 6 + rng() * 10 }));
    out.push({ x, y, r, pts, chips });
  }
  return out;
})();

/** How much of piece `i` is left at this pool (1 whole → 0 gone): first-freed breaks first. */
export const patchKeep = (i: number, hp: number): number => clampN((hp - (0.91 - i * 0.09)) / 0.09, 0, 1);

/** The isle's own ground inside piece `i`. `a` alpha, `t` seconds. */
function patchGround(g: G, i: number, p: Patch, a: number, t: number): void {
  const L = LAWS[i];
  const rng = mulberry(500 + i * 11);
  const inner = (s = 0.62): Pt => { const aa = rng() * TAU, d = Math.sqrt(rng()) * s; return { x: p.x + Math.cos(aa) * p.r * d, y: p.y + Math.sin(aa) * p.r * d * 0.72 }; };
  switch (i) {
    case 0: { // Brandmark: basalt, lava in the cracks, the brand on the stone.
      for (let k = 0; k < 4; k++) { const q = inner(); const e = inner(); seam(g, crackPath(q, e, rng, 6, 4), 1, a * 0.8, 0.5 + 0.5 * Math.sin(t * 2 + k), L.color); }
      const q = inner(0.3); brandSigil(g, q.x, q.y, 12, L.color, 0.5 * a);
      break;
    }
    case 1: { // The sea: swell lines and foam, moving.
      for (let k = 0; k < 7; k++) {
        const q = inner(0.55);
        const off = Math.sin(t * 1.4 + k) * 5;
        g.lineStyle(2, L.light, 0.45 * a); g.beginPath(); g.arc(q.x + off, q.y, 9, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
        g.fillStyle(0xffffff, 0.35 * a); g.fillCircle(q.x + off + 9, q.y - 2, 1.5);
      }
      break;
    }
    case 2: { // Thornwild: moss, tufts, a thorn runner, flowers.
      for (let k = 0; k < 16; k++) { const q = inner(); g.lineStyle(1.4, L.light, 0.5 * a); g.lineBetween(q.x, q.y, q.x - 2, q.y - 5); g.lineBetween(q.x, q.y, q.x + 2, q.y - 5); }
      const vine: Pt[] = []; for (let k = 0; k < 8; k++) vine.push({ x: p.x - p.r * 0.5 + k * p.r * 0.14, y: p.y + Math.sin(k * 1.3) * 10 });
      g.lineStyle(2.2, 0x3a5a22, a); g.strokePoints(vine);
      for (const v of vine) { g.fillStyle(0x1a2a10, a); g.fillTriangle(v.x - 2, v.y, v.x + 2, v.y, v.x, v.y - 6); }
      for (let k = 0; k < 4; k++) { const q = inner(0.5); g.fillStyle(0xe85a7a, 0.8 * a); g.fillCircle(q.x, q.y, 2.4); g.fillStyle(0xffe07a, a); g.fillCircle(q.x, q.y, 0.9); }
      break;
    }
    case 3: { // Highspire: cloud tufts drifting over pale air.
      for (let k = 0; k < 5; k++) {
        const q = inner(0.5); const dx = Math.sin(t * 0.5 + k * 1.7) * 8;
        for (let j = 0; j < 4; j++) { g.fillStyle(0xffffff, 0.45 * a); g.fillCircle(q.x + dx + j * 7 - 10, q.y - (j % 2) * 4, 7 - Math.abs(j - 1.5)); }
      }
      g.lineStyle(1, 0xffffff, 0.4 * a);
      for (let k = 0; k < 3; k++) { const q = inner(0.5); g.lineBetween(q.x - 16, q.y, q.x + 16, q.y); }
      break;
    }
    case 4: { // The Earth isle: flagstones and grout, pebbles.
      for (let k = 0; k < 9; k++) {
        const q = inner(0.55); const w = 14 + rng() * 10, h = 10 + rng() * 6;
        g.fillStyle(lit(L.color, 0.12 + rng() * 0.15), 0.7 * a); g.fillRect(q.x - w / 2, q.y - h / 2, w, h);
        g.lineStyle(1, L.deep, 0.6 * a); g.strokeRect(q.x - w / 2, q.y - h / 2, w, h);
      }
      for (let k = 0; k < 8; k++) { const q = inner(); g.fillStyle(L.deep, 0.6 * a); g.fillCircle(q.x, q.y, 1.6); }
      break;
    }
    case 5: { // Voltreach: copper plates on slate, a spark jumping between rivets.
      for (let k = 0; k < 4; k++) { const q = inner(0.45); g.lineStyle(2, 0xb87a3a, 0.6 * a); g.strokeRect(q.x - 12, q.y - 8, 24, 16); g.fillStyle(0xd89a5a, 0.7 * a); g.fillCircle(q.x - 10, q.y - 6, 1.4); g.fillCircle(q.x + 10, q.y + 6, 1.4); }
      if (Math.floor(t * 7 + i) % 3 === 0) {
        const q = inner(0.4), e = inner(0.4);
        g.lineStyle(1.5, L.light, 0.9 * a);
        g.strokePoints([q, { x: (q.x + e.x) / 2 + (rng() - 0.5) * 14, y: (q.y + e.y) / 2 + (rng() - 0.5) * 14 }, e]);
      }
      break;
    }
    case 6: { // The venom marsh: green ooze, purple sheen, bubbles that rise and pop.
      for (let k = 0; k < 5; k++) { const q = inner(0.5); g.fillStyle(0x5a2a6a, 0.35 * a); g.fillEllipse(q.x, q.y, 26, 12); }
      for (let k = 0; k < 8; k++) {
        const q = inner(0.55); const ph = (t * 0.7 + k * 0.37) % 1;
        g.lineStyle(1, L.light, (1 - ph) * 0.7 * a); g.strokeCircle(q.x, q.y, 1.5 + ph * 4);
        g.fillStyle(0xffffff, (1 - ph) * 0.5 * a); g.fillCircle(q.x - 1, q.y - 1.5, 0.8);
      }
      break;
    }
    case 7: { // Lotterhaven: the checkered board, and a die lying on it.
      const s = 12;
      for (let cy = -2; cy <= 2; cy++) for (let cx = -3; cx <= 3; cx++) {
        if ((cx + cy) % 2) continue;
        g.fillStyle(L.color, 0.3 * a); g.fillRect(p.x + cx * s - s / 2, p.y + cy * s - s / 2, s, s);
      }
      g.fillStyle(0xf4ecd8, 0.9 * a); g.fillRoundedRect(p.x + 20, p.y - 30, 16, 16, 3);
      g.fillStyle(L.deep, a); for (const [dx, dy] of [[4, 4], [12, 12], [8, 8]]) g.fillCircle(p.x + 20 + dx, p.y - 30 + dy, 1.5);
      break;
    }
    case 8: { // Choirholm: brass, and the rings a great bell leaves in it.
      for (let k = 0; k < 4; k++) { const ph = (t * 0.4 + k / 4) % 1; g.lineStyle(1.5, L.light, (1 - ph) * 0.5 * a); g.strokeEllipse(p.x, p.y, p.r * 1.4 * ph, p.r * 1.0 * ph); }
      g.lineStyle(1, dim(L.color, 0.4), 0.5 * a);
      for (let k = 0; k < 5; k++) g.lineBetween(p.x - p.r * 0.5, p.y + 18 + k * 3, p.x + p.r * 0.5, p.y + 18 + k * 3);
      g.fillStyle(dim(L.color, 0.5), 0.8 * a); g.fillEllipse(p.x - 12, p.y + 24, 5, 3.5); g.fillEllipse(p.x + 6, p.y + 21, 5, 3.5);
      break;
    }
    default: { // Solmara: glare, and the rays of a sun that will not move.
      for (let k = 0; k < 12; k++) {
        const aa = (k / 12) * TAU + t * 0.05;
        g.fillStyle(0xffffff, 0.28 * a);
        g.fillTriangle(p.x, p.y, p.x + Math.cos(aa - 0.06) * p.r * 0.7, p.y + Math.sin(aa - 0.06) * p.r * 0.5, p.x + Math.cos(aa + 0.06) * p.r * 0.7, p.y + Math.sin(aa + 0.06) * p.r * 0.5);
      }
      g.fillStyle(0xffffff, 0.5 * a); g.fillCircle(p.x, p.y, 8);
    }
  }
}

/** Piece `i` at `keep` (its ground shrinking, its chips drifting off), `flare` lighting its rim. */
function drawPatch(g: G, i: number, keep: number, flare: number, ghost: boolean, t: number): void {
  const p = PATCHES[i];
  const L = LAWS[i];
  const a = ghost ? 0.4 * flare : keep;
  if (a <= 0.01) return;
  const sc = ghost ? 1 : 0.55 + 0.45 * keep;
  const pts = p.pts.map((q) => ({ x: p.x + (q.x - p.x) * sc, y: p.y + (q.y - p.y) * sc }));
  g.fillStyle(0x000000, 0.25 * a); g.fillPoints(pts.map((q) => ({ x: q.x + 3, y: q.y + 4 })), true);
  g.fillStyle(L.deep, 0.92 * a); g.fillPoints(pts, true);
  g.fillStyle(L.color, 0.28 * a); g.fillPoints(pts.map((q) => ({ x: p.x + (q.x - p.x) * 0.8, y: p.y + (q.y - p.y) * 0.8 })), true);
  patchGround(g, i, { ...p, r: p.r * sc }, a, t);
  g.lineStyle(2, lit(L.color, 0.3), (0.35 + flare * 0.6) * a); g.strokePoints(pts, true);
  if (!ghost && keep < 1) {
    // Breaking: an ember seam through it and its edge flaking off into the night.
    seam(g, [pts[2], { x: p.x, y: p.y }, pts[9]], 1, 1 - keep, beat(t), EMBER);
    for (const c of p.chips) {
      const d = c.d + (1 - keep) * 70;
      const cx = p.x + Math.cos(c.a) * d, cy = p.y + Math.sin(c.a) * d * 0.72 - (1 - keep) * 12;
      g.fillStyle(L.deep, keep * 0.9);
      g.fillTriangle(cx - c.s / 2, cy, cx + c.s / 2, cy - c.s * 0.3, cx, cy + c.s * 0.5);
      g.fillStyle(L.color, keep * 0.4); g.fillCircle(cx, cy, c.s * 0.2);
    }
  }
}

/** The living floor: steam off the rim, the ten pieces breaking up, the cited law flaring. */
export function drawDream(g: G, tSec: number, hp: number, now: number): void {
  // Steam where the sea meets the glass.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    const k = (tSec * 0.25 + i * 0.37) % 1;
    const x = BOWL.x + Math.cos(a) * (BOWL.rx + 4), y = BOWL.y + Math.sin(a) * (BOWL.ry + 4) - k * 26;
    g.fillStyle(0xc8d4e0, 0.09 * (1 - k)); g.fillCircle(x, y, 10 + k * 14);
  }
  const citeK = FS.cite >= 0 ? clampN(1 - (now - FS.citeAt) / 1600, 0, 1) : 0;
  for (let i = 0; i < 10; i++) {
    const keep = patchKeep(i, hp);
    const flare = i === FS.cite ? citeK : 0;
    if (keep > 0) drawPatch(g, i, keep, flare, false, tSec);
    else if (flare > 0) drawPatch(g, i, 0, flare, true, tSec);
  }
  // Fewer isles, more sky: the reflected stars brighten as the dream thins.
  const bare = clampN((0.3 - hp) / 0.3, 0, 1);
  if (bare > 0) starfield(g, 60, 130, 840, 470, mulberry(77), Math.round(40 * bare), tSec, 0xdde4ff);
}

// ── The entry: the Supernova's light goes to a point; the hall is gone; he is standing there ──

export const FALLEN_ENTRY_MS = 7600;
const T_POINT = 1700;
export const T_SWAP = 2000;
const T_REVEAL = 3500;
const T_LAND = 4200;
const T_FORMED = 4500;

/** Ash gathering into a man where the light came down, then him. */
export function fallenEntryGround(g: G, k: BossEntryKit): void {
  if (k.t < T_SWAP) return;
  const tS = k.time / 1000;
  const form = clampN((k.t - (T_LAND - 500)) / (T_FORMED - T_LAND + 500), 0, 1);
  if (k.t < T_FORMED) {
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + tS * 1.2;
      const d = (1 - smooth(form)) * (60 + (i % 5) * 14) + 4;
      g.fillStyle(i % 4 === 0 ? EMBER : 0x8a827a, 0.3 + form * 0.5);
      g.fillRect(k.x + Math.cos(a) * d, k.y - 6 + Math.sin(a) * d * 0.6, 2, 2);
    }
    return;
  }
  drawFallen(g, k.x, k.y, {
    t: tS, face: Math.atan2(k.player.y - k.y, k.player.x - k.x), pose: k.t < 6100 ? 'rest' : 'cite',
    hurt: false, cite: -1, citeK: 0, walk: 0, air: 0, hp: 1,
  });
}

/** Over everything: the white collapsing, the dark, the point of light coming down. */
export function fallenEntryOver(g: G, k: BossEntryKit): void {
  const { W, H } = k;
  const tS = k.time / 1000;
  if (k.t < T_SWAP) {
    // The hall goes black under a sea of white that pulls itself into one point.
    const c = smooth(k.t / T_POINT);
    g.fillStyle(0x000000, smooth(k.t / 500)); g.fillRect(0, 0, W, H);
    const R = 1100 * Math.pow(1 - c, 2.2) + 3;
    for (let i = 4; i >= 1; i--) { g.fillStyle(i > 2 ? OBS.star : OBS.starCore, i === 1 ? 1 : 0.22); g.fillCircle(k.fromX, k.fromY, R * (0.4 + i * 0.2)); }
    if (k.t < 260) { g.fillStyle(0xffffff, 1 - k.t / 260); g.fillRect(0, 0, W, H); }
    return;
  }
  // The dark lifting off a floor that was not there before.
  const reveal = smooth((k.t - T_SWAP) / (T_REVEAL - T_SWAP));
  if (reveal < 1) { g.fillStyle(0x000000, 1 - reveal); g.fillRect(0, 0, W, H); }
  if (k.t < T_FORMED) {
    // The point falls, slowly, to where he will be.
    const d = smooth((k.t - T_SWAP) / (T_LAND - T_SWAP));
    const x = k.fromX + (k.x - k.fromX) * d, y = k.fromY + (k.y - 4 - k.fromY) * d;
    const pulse = 0.6 + 0.4 * Math.sin(tS * 9);
    for (let i = 3; i >= 1; i--) { g.fillStyle(OBS.star, 0.08 * pulse); g.fillCircle(x, y, 6 + i * 7); }
    g.fillStyle(OBS.starCore, 1); g.fillCircle(x, y, 2.4);
    g.lineStyle(1, OBS.star, 0.3); g.lineBetween(x, y - 30 * (1 - d), x, y);
  }
}
