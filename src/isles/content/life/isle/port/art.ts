import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { type G, dim, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Mossgate's own drawing kit — the palette and set-piece bricks for a harbour town grown inside a
 * fallen giant tree. Everything here is wood that was alive once and mostly still is: bark,
 * heartwood, moss, root, fungus, fern. Nothing is built square; everything is bored, hollowed or
 * grown. The Empress's brass and green turn up only where she has put them — on the tithe-scales.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** The forest floor outside the trunk: leaf litter over black loam. */
export const LITTER = 0x3a4626;
export const LITTER_ALT = 0x4a5230;
export const LOAM = 0x2a2a1a;

/** Moss — the town's roofing, carpeting and, in a pinch, bedding. */
export const MOSS = 0x4e7e34;
export const MOSS_DARK = 0x2e5222;
export const MOSS_LIT = 0x82b04a;

/** The Elder's bark: deep-furrowed, grey-brown, lichened. */
export const BARK = 0x4e3a2a;
export const BARK_DARK = 0x2a1e16;
export const BARK_LIT = 0x6e5640;
export const LICHEN = 0x9aa878;

/** The heartwood floor inside the hollow — pale, grained, polished by a century of feet. */
export const HEART = 0xb48e60;
export const HEART_ALT = 0xa07c52;
export const HEART_DARK = 0x6e5236;

/** Root — redder and smoother than bark, worn shiny where it is walked. */
export const ROOT = 0x5e4230;
export const ROOT_DARK = 0x33241a;
export const ROOT_LIT = 0x8a664a;

/** The peat shore and the green harbour water. */
export const PEAT = 0x3a3024;
export const PEAT_ALT = 0x4a3e2c;
export const SEA_SHALLOW = 0x2c6656;
export const SEA = 0x1c4a44;
export const SEA_DEEP = 0x123434;
export const FOAM = 0xdcecd8;

/** Firefly-jar light, the town's only street lighting. */
export const GLOW = 0xe6f27a;
/** Hearth / oven light. */
export const EMBER = 0xffb860;

/** The Empress's colours: leaf green and the brass of her weights. */
export const EMPRESS = 0x5ec24a;
export const EMPRESS_DARK = 0x24602a;
export const BRASS = 0xc9a44a;
export const BRASS_DARK = 0x7a6028;

/** A closed polygon fill from plain points. */
export function poly(g: G, pts: [number, number][], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
}

// ── Emblems ──────────────────────────────────────────────────────────

/**
 * Empress Verdigra's seal: a five-petal rose held between the open blades of a pair of shears.
 * Stamped on every tithe-weight, every pruning cart and the beam of the scales.
 */
export function verdigraSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  // The blades, open in a V behind the rose.
  g.fillStyle(color, a * 0.85);
  g.fillTriangle(x - r * 0.2, y + r * 0.2, x - r * 1.05, y - r * 0.95, x - r * 0.62, y - r * 1.05);
  g.fillTriangle(x + r * 0.2, y + r * 0.2, x + r * 1.05, y - r * 0.95, x + r * 0.62, y - r * 1.05);
  // Rings of the handles below.
  g.lineStyle(Math.max(1, r * 0.16), color, a);
  g.strokeCircle(x - r * 0.42, y + r * 0.72, r * 0.26);
  g.strokeCircle(x + r * 0.42, y + r * 0.72, r * 0.26);
  // The rose.
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    g.fillStyle(color, a);
    g.fillCircle(x + Math.cos(ang) * r * 0.32, y - r * 0.1 + Math.sin(ang) * r * 0.32, r * 0.3);
  }
  g.fillStyle(dim(color, 0.4), a); g.fillCircle(x, y - r * 0.1, r * 0.16);
}

/** A tithe-weight: a brass acorn with the seal on its belly and a ring through its cap. */
export function acornWeight(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 1, s * 2, s * 0.6);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - s * 0.9, s * 1.7, s * 1.9);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - s * 0.95, s * 1.5, s * 1.7);
  g.fillStyle(lit(BRASS, 0.35), 0.8); g.fillEllipse(x - s * 0.3, y - s * 1.25, s * 0.4, s * 0.6);
  // Cap, cross-hatched like a real acorn.
  g.fillStyle(dim(BRASS, 0.45), 1); g.fillEllipse(x, y - s * 1.75, s * 1.8, s * 0.9);
  g.lineStyle(1, dim(BRASS, 0.65), 0.8);
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * s * 0.3, y - s * 2.1, x + k * s * 0.3 + s * 0.2, y - s * 1.4);
  g.lineStyle(1.5, BRASS_DARK, 1); g.strokeCircle(x, y - s * 2.3, s * 0.28);
  verdigraSeal(g, x, y - s * 0.8, s * 0.36, EMPRESS_DARK, 0.85);
}

// ── Growing things ───────────────────────────────────────────────────

/** A drape of moss along a top edge, with strands hanging off it. */
export function mossDrape(g: G, x0: number, x1: number, y: number, rng: () => number, depth = 10): void {
  for (let x = x0; x < x1; x += 7) {
    const d = depth * (0.5 + rng() * 0.8);
    g.fillStyle(rng() < 0.5 ? MOSS : MOSS_DARK, 1);
    g.fillEllipse(x + 3, y + d * 0.3, 12, d);
  }
  for (let x = x0 + 4; x < x1; x += 6) {
    g.fillStyle(MOSS_LIT, 0.55); g.fillCircle(x + rng() * 3, y - 2 + rng() * 3, 2 + rng() * 1.5);
  }
  // Strands hanging under the lip.
  for (let k = 0; k < (x1 - x0) / 18; k++) {
    const sx = x0 + 6 + rng() * (x1 - x0 - 12);
    const len = 6 + rng() * 16;
    g.lineStyle(1.5, MOSS_DARK, 0.9); g.lineBetween(sx, y + 3, sx + (rng() - 0.5) * 3, y + 3 + len);
    g.fillStyle(MOSS, 0.9); g.fillCircle(sx, y + 3 + len, 1.6);
  }
}

/** A cluster of shelf fungus on a trunk or wall. */
export function bracket(g: G, x: number, y: number, s: number, color = 0xc8a070): void {
  for (let k = 0; k < 3; k++) {
    const yy = y + k * s * 0.7, ww = s * (2 - k * 0.45);
    g.fillStyle(dim(color, 0.45), 1); g.fillEllipse(x + k * s * 0.15, yy + 1.5, ww, s * 0.62);
    g.fillStyle(color, 1); g.fillEllipse(x + k * s * 0.15, yy, ww, s * 0.5);
    g.lineStyle(1, lit(color, 0.3), 0.8); g.strokeEllipse(x + k * s * 0.15, yy - 1, ww * 0.7, s * 0.25);
  }
}

/** A fern clump — a fan of fronds, each frond a rib with leaflets. */
export function fern(g: G, x: number, y: number, s: number, color: number, rng: () => number): void {
  shadow(g, x, y + 1, s * 2, s * 0.5, 0.25);
  const n = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.6 + (rng() - 0.5) * 0.15;
    const len = s * (0.8 + rng() * 0.45);
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.75;
    const col = i % 2 ? color : dim(color, 0.18);
    g.lineStyle(1.5, dim(col, 0.3), 1); g.lineBetween(x, y, ex, ey);
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const px = x + (ex - x) * t, py = y + (ey - y) * t;
      const l = (1 - t) * s * 0.28 + 2;
      const nx = -Math.sin(a), ny = Math.cos(a) * 0.75;
      g.lineStyle(2, col, 1);
      g.lineBetween(px, py, px + nx * l - Math.cos(a) * 2, py + ny * l - 2);
      g.lineBetween(px, py, px - nx * l - Math.cos(a) * 2, py - ny * l - 2);
    }
  }
}

/** A ring of toadstools — red caps flecked white, the odd brown one. */
export function toadstools(g: G, x: number, y: number, s: number, rng: () => number): void {
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * s * 3, py = y + (rng() - 0.5) * s;
    const sz = s * (0.5 + rng() * 0.6);
    const cap = rng() < 0.7 ? 0xc0402e : 0x8a6038;
    shadow(g, px, py + 1, sz * 1.6, sz * 0.4, 0.25);
    g.fillStyle(0xe8dcc0, 1); g.fillRect(px - sz * 0.18, py - sz * 0.9, sz * 0.36, sz * 0.9);
    g.fillStyle(dim(cap, 0.35), 1); g.fillEllipse(px, py - sz * 0.9, sz * 1.5, sz * 0.9);
    g.fillStyle(cap, 1); g.fillEllipse(px, py - sz, sz * 1.4, sz * 0.75);
    if (cap === 0xc0402e) for (let k = 0; k < 3; k++) { g.fillStyle(0xf4eedc, 1); g.fillCircle(px - sz * 0.4 + k * sz * 0.4, py - sz * 1.1 + (k % 2) * 2, sz * 0.12 + 0.6); }
  }
}

/** A firefly jar on a crook of root — Mossgate's street lamp. The glow is animated separately. */
export function fireflyJar(g: G, x: number, y: number): void {
  shadow(g, x, y, 16, 5);
  // The crook: a bent root stake.
  g.lineStyle(4, ROOT_DARK, 1);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1, y - 40); g.lineTo(x + 2, y - 52); g.lineTo(x + 12, y - 56); g.strokePath();
  g.lineStyle(2, ROOT_LIT, 0.6); g.lineBetween(x - 1, y - 2, x - 2, y - 40);
  // The jar hanging off the hook.
  g.lineStyle(1, 0x2a2a20, 1); g.lineBetween(x + 12, y - 56, x + 12, y - 50);
  g.fillStyle(0x3a4a3a, 0.9); g.fillRoundedRect(x + 6, y - 50, 12, 15, 4);
  g.fillStyle(0xc8e0a8, 0.35); g.fillRoundedRect(x + 7, y - 49, 10, 13, 3);
  g.fillStyle(0x5a4a30, 1); g.fillRect(x + 6, y - 52, 12, 3);
}

/** Where a firefly jar's light sits, for the animator. */
export const jarLight = (x: number, y: number): Pt => ({ x: x + 12, y: y - 43 });

// ── Wood you can live in ─────────────────────────────────────────────

export interface LogOpts {
  bark: number;
  /** Which end shows its cut face (the door is in it). */
  face: 'w' | 'e';
  glow?: number;
  door?: number;
  /** Little pipe of a hollow twig, for smoke. */
  flue?: boolean;
  /** Bracket fungus on the flank. */
  fungus?: boolean;
}

/**
 * A hollow-log house: a fallen bough lying east–west, seen three-quarters from the south. `x,y` is
 * the middle of its base. One end is the cut face — the growth rings and a round door bored through
 * them; round windows are bored along the flank; moss grows thick along the top like thatch.
 * Returns the door point.
 */
export function hollowLog(g: G, x: number, y: number, len: number, r: number, o: LogOpts, rng: () => number): Pt {
  const top = y - r * 2;
  const x0 = x - len / 2, x1 = x + len / 2;
  shadow(g, x, y + 3, len * 1.1, 20, 0.36);
  // The flank: a long cylinder, darker underneath.
  g.fillStyle(dim(o.bark, 0.5), 1); g.fillRoundedRect(x0 - 2, top - 2, len + 4, r * 2 + 4, r);
  g.fillStyle(o.bark, 1); g.fillRoundedRect(x0, top, len, r * 2, r * 0.95);
  g.fillStyle(dim(o.bark, 0.25), 1); g.fillRoundedRect(x0, y - r * 0.7, len, r * 0.7, { tl: 0, tr: 0, bl: r * 0.6, br: r * 0.6 });
  g.fillStyle(lit(o.bark, 0.12), 1); g.fillRect(x0 + r * 0.5, top + r * 0.35, len - r, 3);
  // Bark furrows running along the bough.
  for (let k = 0; k < len / 9; k++) {
    const fx = x0 + 8 + rng() * (len - 16), fy = top + 6 + rng() * (r * 2 - 12);
    g.lineStyle(1.5, dim(o.bark, 0.35), 0.8); g.lineBetween(fx, fy, fx + 10 + rng() * 22, fy + (rng() - 0.5) * 2);
  }
  for (let k = 0; k < len / 30; k++) { g.fillStyle(LICHEN, 0.35); g.fillEllipse(x0 + rng() * len, top + r * 0.4 + rng() * r, 8 + rng() * 8, 4); }
  // Round windows bored along the flank, lit from inside.
  const wins = Math.max(1, Math.floor(len / 70));
  for (let i = 0; i < wins; i++) {
    const wx = x0 + len * ((i + 1) / (wins + 1)) + (o.face === 'w' ? 14 : -14);
    const wy = top + r * 0.95;
    g.fillStyle(dim(o.bark, 0.6), 1); g.fillCircle(wx, wy, 10);
    if (o.glow) {
      g.fillStyle(o.glow, 0.12); g.fillCircle(wx, wy, 18);
      g.fillStyle(o.glow, 0.9); g.fillCircle(wx, wy, 7.5);
      g.lineStyle(1.5, dim(o.bark, 0.6), 1); g.lineBetween(wx - 7, wy, wx + 7, wy); g.lineBetween(wx, wy - 7, wx, wy + 7);
    } else {
      g.fillStyle(0x141008, 1); g.fillCircle(wx, wy, 7.5);
    }
  }
  // The cut end: an ellipse of pale rings, the round door through its middle.
  const ex = o.face === 'w' ? x0 + r * 0.25 : x1 - r * 0.25;
  g.fillStyle(dim(o.bark, 0.5), 1); g.fillEllipse(ex, y - r, r * 1.1, r * 2.1);
  g.fillStyle(HEART, 1); g.fillEllipse(ex, y - r, r * 0.95, r * 1.9);
  for (let k = 1; k < 6; k++) { g.lineStyle(1, HEART_DARK, 0.45); g.strokeEllipse(ex, y - r, r * 0.95 * (k / 6), r * 1.9 * (k / 6)); }
  const door = o.door ?? 0x4a3020;
  g.fillStyle(0x1a120c, 1); g.fillEllipse(ex, y - r * 0.72, r * 0.62, r * 1.3);
  g.fillStyle(door, 1); g.fillEllipse(ex, y - r * 0.7, r * 0.52, r * 1.18);
  g.lineStyle(1, dim(door, 0.4), 1); g.lineBetween(ex, y - r * 1.28, ex, y - r * 0.12);
  g.fillStyle(BRASS, 1); g.fillCircle(ex + r * 0.14, y - r * 0.68, 1.6);
  // A flue of hollow twig poking up out of the moss.
  if (o.flue) {
    const fx = x + (o.face === 'w' ? len * 0.25 : -len * 0.25);
    g.fillStyle(dim(o.bark, 0.3), 1); g.fillRect(fx - 5, top - 26, 10, 30);
    g.fillStyle(dim(o.bark, 0.6), 1); g.fillEllipse(fx, top - 26, 11, 4);
  }
  if (o.fungus) bracket(g, x + (o.face === 'w' ? len * 0.36 : -len * 0.36), y - r * 0.6, 7);
  // Moss thatch along the top.
  mossDrape(g, x0 + r * 0.4, x1 - r * 0.4, top + 2, rng, 12);
  return { x: ex, y: y + 18 };
}

/**
 * A burl house — a great round knot that grew on the Elder's flank, broken off and hollowed. Squat,
 * domed, ridged like a walnut, with a crooked door and a stone flue. `x,y` is the base middle.
 */
export function burlHouse(g: G, x: number, y: number, w: number, h: number, wood: number, rng: () => number, glowCol = EMBER): void {
  shadow(g, x, y + 3, w * 1.2, 22, 0.38);
  g.fillStyle(dim(wood, 0.5), 1); g.fillEllipse(x, y - h * 0.5, w + 6, h + 6);
  g.fillStyle(wood, 1); g.fillEllipse(x, y - h * 0.5, w, h);
  // Burl ridges: swirled knots all over.
  for (let k = 0; k < 16; k++) {
    const a = rng() * Math.PI * 2, d = rng() * 0.42;
    const kx = x + Math.cos(a) * w * d, ky = y - h * 0.5 + Math.sin(a) * h * d;
    g.lineStyle(1.5, dim(wood, 0.35), 0.7); g.strokeEllipse(kx, ky, 10 + rng() * 12, 6 + rng() * 6);
    g.fillStyle(dim(wood, 0.45), 0.6); g.fillCircle(kx, ky, 1.6);
  }
  g.fillStyle(lit(wood, 0.16), 0.7); g.fillEllipse(x - w * 0.15, y - h * 0.8, w * 0.5, h * 0.18);
  // A flat floor-line where it was cut level.
  g.fillStyle(dim(wood, 0.3), 1); g.fillRect(x - w * 0.46, y - 6, w * 0.92, 6);
  // Crooked door and two lit windows.
  g.fillStyle(0x1a120c, 1); poly(g, [[x - 13, y], [x + 14, y], [x + 11, y - 34], [x - 2, y - 40], [x - 12, y - 32]], 0x1a120c);
  poly(g, [[x - 10, y], [x + 11, y], [x + 9, y - 31], [x - 2, y - 36], [x - 9, y - 30]], 0x5a3a22);
  for (const s of [-1, 1]) {
    const wx = x + s * w * 0.28, wy = y - h * 0.52;
    g.fillStyle(dim(wood, 0.6), 1); g.fillEllipse(wx, wy, 20, 16);
    g.fillStyle(glowCol, 0.12); g.fillCircle(wx, wy, 20);
    g.fillStyle(glowCol, 0.9); g.fillEllipse(wx, wy, 15, 11);
  }
  mossDrape(g, x - w * 0.32, x + w * 0.32, y - h * 0.97, rng, 14);
}

// ── Root ─────────────────────────────────────────────────────────────

/**
 * One of the Great Root's arches: a thick gnarled root climbing out of the mud at `x0`, arching
 * over, and diving back in at `x1`. Drawn as a chain of overlapping discs so it swells and pinches
 * like real root; bark-lit along the top, moss in the crook, rootlets hanging from the span.
 */
export function rootArch(g: G, x0: number, x1: number, base: number, h: number, thick: number, rng: () => number): void {
  const n = Math.max(24, Math.floor((x1 - x0) / 5));
  const pts: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    // A slightly lopsided arch, fattest at the feet.
    const y = base - Math.sin(t * Math.PI) * h - Math.sin(t * Math.PI * 3) * h * 0.04;
    const r = thick * (0.55 + 0.45 * Math.abs(Math.cos(t * Math.PI))) * (0.92 + Math.sin(i * 1.7) * 0.08);
    pts.push({ x, y, r });
  }
  // The feet, spreading into the mud.
  for (const fx of [x0, x1]) {
    shadow(g, fx, base + 2, thick * 3.2, thick * 0.9, 0.4);
    g.fillStyle(ROOT_DARK, 1); g.fillEllipse(fx, base - 2, thick * 2.8, thick * 1.1);
    for (let k = 0; k < 3; k++) {
      const dx = (k - 1) * thick * 0.9;
      g.lineStyle(thick * 0.35, ROOT_DARK, 1); g.lineBetween(fx, base - thick * 0.3, fx + dx * 1.4, base + 4);
    }
  }
  for (const p of pts) { g.fillStyle(ROOT_DARK, 1); g.fillCircle(p.x, p.y, p.r + 2); }
  for (const p of pts) { g.fillStyle(ROOT, 1); g.fillCircle(p.x, p.y, p.r); }
  for (const p of pts) { g.fillStyle(ROOT_LIT, 0.7); g.fillCircle(p.x - p.r * 0.15, p.y - p.r * 0.45, p.r * 0.38); }
  // Bark scars across the root.
  for (let i = 2; i < pts.length - 2; i += 3) {
    const p = pts[i];
    g.lineStyle(1.2, ROOT_DARK, 0.6); g.lineBetween(p.x - p.r * 0.3, p.y - p.r * 0.6, p.x + p.r * 0.2, p.y + p.r * 0.5);
  }
  // Moss riding the crown of the arch.
  for (let i = Math.floor(n * 0.25); i < n * 0.75; i += 2) {
    const p = pts[i];
    g.fillStyle(rng() < 0.5 ? MOSS : MOSS_DARK, 0.95); g.fillEllipse(p.x, p.y - p.r * 0.7, p.r * 1.3, p.r * 0.6);
    if (rng() < 0.4) { g.fillStyle(MOSS_LIT, 0.7); g.fillCircle(p.x, p.y - p.r * 0.9, 2); }
  }
  // Rootlets dangling from the underside of the span.
  for (let i = Math.floor(n * 0.2); i < n * 0.8; i += 3) {
    const p = pts[i];
    const len = 8 + rng() * 22;
    g.lineStyle(1.2, ROOT_DARK, 0.85);
    g.beginPath(); g.moveTo(p.x, p.y + p.r * 0.8);
    g.lineTo(p.x + (rng() - 0.5) * 4, p.y + p.r * 0.8 + len * 0.5);
    g.lineTo(p.x + (rng() - 0.5) * 6, p.y + p.r * 0.8 + len);
    g.strokePath();
  }
  // Barnacles and green weed at the wet feet.
  for (const fx of [x0, x1]) {
    for (let k = 0; k < 7; k++) { g.fillStyle(0xd8d4c0, 0.9); g.fillCircle(fx - thick + rng() * thick * 2, base - 4 - rng() * thick * 0.8, 1.4); }
    g.fillStyle(0x2a5a3a, 0.8); g.fillEllipse(fx, base - 2, thick * 2.2, 5);
  }
}

/** A surface root snaking across the ground (baked into the ground). */
export function groundRoot(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(2, Math.floor(len / 6));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const r = w * (0.5 + 0.5 * (1 - (i + t) / pts.length)) * (0.9 + rng() * 0.15);
      g.fillStyle(ROOT_DARK, 1); g.fillCircle(x, y + 1.5, r + 1.5);
      g.fillStyle(ROOT, 1); g.fillCircle(x, y, r);
      g.fillStyle(ROOT_LIT, 0.45); g.fillCircle(x - r * 0.2, y - r * 0.4, r * 0.4);
    }
  }
}

// ── Harbour bits ─────────────────────────────────────────────────────

/** A coracle — a round wicker-and-hide boat — upturned on the peat to dry. */
export function coracle(g: G, x: number, y: number, r: number, hide: number): void {
  shadow(g, x, y + 2, r * 2.4, r * 0.7);
  g.fillStyle(dim(hide, 0.45), 1); g.fillEllipse(x, y - r * 0.4, r * 2.2, r * 1.3);
  g.fillStyle(hide, 1); g.fillEllipse(x, y - r * 0.5, r * 2, r * 1.1);
  g.lineStyle(1, dim(hide, 0.4), 0.8);
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * r * 0.35, y - r, x + k * r * 0.42, y);
  g.strokeEllipse(x, y - r * 0.5, r * 1.4, r * 0.6);
  g.fillStyle(lit(hide, 0.2), 0.6); g.fillEllipse(x - r * 0.3, y - r * 0.8, r * 0.8, r * 0.25);
}

/** A wicker eel-trap, long and tapered, lying on its side. */
export function eelTrap(g: G, x: number, y: number, len: number): void {
  shadow(g, x, y + 2, len * 1.1, 8);
  poly(g, [[x - len / 2, y - 12], [x + len / 2, y - 5], [x + len / 2, y - 1], [x - len / 2, y]], 0x8a6a3a);
  g.lineStyle(1, 0x4a3a1e, 0.9);
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    const xx = x - len / 2 + len * t;
    g.lineBetween(xx, y - 12 + 7 * t, xx, y - 0.5 * t);
  }
  g.fillStyle(0x2a2012, 1); g.fillEllipse(x - len / 2, y - 6, 6, 12);
}

/** A tangle of netting heaped on the quay, floats of dried gourd tied in. */
export function netHeap(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, s * 2.6, s * 0.7);
  g.fillStyle(0x5a5a3a, 1); g.fillEllipse(x, y - s * 0.4, s * 2.4, s * 1);
  g.lineStyle(1, 0x2e2e1e, 0.8);
  for (let k = 0; k < 10; k++) {
    const a = rng() * Math.PI;
    g.lineBetween(x - Math.cos(a) * s, y - s * 0.4 - Math.sin(a) * s * 0.3, x + Math.cos(a) * s, y - s * 0.4 + Math.sin(a) * s * 0.3);
  }
  for (let k = 0; k < 4; k++) {
    g.fillStyle(0xc8a050, 1); g.fillEllipse(x - s + rng() * s * 2, y - s * 0.3 - rng() * s * 0.5, 7, 5);
  }
}

/** A mooring stake: a peeled sapling trunk driven into the mud, rope-wrapped near the top. */
export function stake(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 1, 14, 5);
  g.fillStyle(0x6a5a40, 1); g.fillRect(x - 3.5, y - h, 7, h);
  g.fillStyle(lit(0x6a5a40, 0.3), 1); g.fillRect(x - 3.5, y - h, 2, h);
  g.fillStyle(0x8a7a50, 1); g.fillEllipse(x, y - h, 7, 3);
  g.lineStyle(2, 0xb8a070, 1);
  for (let k = 0; k < 3; k++) g.lineBetween(x - 4, y - h + 6 + k * 3, x + 4, y - h + 8 + k * 3);
  g.fillStyle(0x2a5a3a, 0.8); g.fillRect(x - 3.5, y - 9, 7, 9);
}

/** A rope line that sags between two points. */
export function sagLine(g: G, a: Pt, b: Pt, sag: number, width: number, color: number, alpha = 1): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
    if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
}

/** Blend helper re-exported for the floor and the area. */
export { mixC };
