import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';

/**
 * The Candlewick Court's own drawing hand — shared by the area painter, the five encounter
 * gimmicks, the arena floor and Prince Tallow. Everything here is wax: poured, dripped, set,
 * guttered. Colours live here once so a puddle in a fight and a puddle in the street are the
 * same puddle.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** Fresh tallow — the colour of the whole court. */
export const WAX = 0xf3e3bf;
/** Wax in shade: the far side of a candle. */
export const WAX_SHADE = 0xd8c091;
/** Old wax gone yellow-brown at the base of things. */
export const WAX_OLD = 0xb89a62;
export const WAX_DARK = 0x6e4c22;
/** Molten wax: warmer, glossier, a touch of amber. */
export const MOLTEN = 0xf7d38a;
export const HONEY = 0xf2a91e;
export const HONEY_DARK = 0xa8650c;
export const STRAW = 0xc99a4a;
export const FLAME = 0xff8a1e;
export const FLAME_MID = 0xffc24a;
export const FLAME_CORE = 0xfff3c4;
export const WICK = 0x2a1d14;
export const SOOT = 0x3a2e2a;
export const BRASS = 0xc99a3a;
/** The red sealing wax the Inchwardens stamp their tax notices with. */
export const SEAL_RED = 0xb3202a;
export const WOOD = 0x6b4a2c;

/** Ownership tints used by the fights — the player's things vs the foe's. */
export const PLAYER_TINT = 0x6fc6ff;
export const FOE_TINT = 0xff6a3a;

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

// ── Flames ───────────────────────────────────────────────────────────

/**
 * A live candle flame: a teardrop that leans and stretches on its own clock (seeded so a
 * street of candles never flickers in step), a glow, a hot core. `s` ≈ flame height / 1.6.
 */
export function flame(g: G, x: number, y: number, s: number, t: number, seed = 0, glowA = 0.07): void {
  const k = seed * 1.7;
  const sway = Math.sin(t * 3.1 + k) * s * 0.22 + Math.sin(t * 7.3 + k * 2) * s * 0.08;
  const stretch = 1 + Math.sin(t * 5.2 + k * 3) * 0.12 + Math.sin(t * 11.7 + k) * 0.05;
  if (glowA > 0) {
    g.fillStyle(FLAME_MID, glowA); g.fillCircle(x, y - s * 0.6, s * 3.2);
    g.fillStyle(FLAME_MID, glowA * 1.3); g.fillCircle(x, y - s * 0.6, s * 1.9);
  }
  const layers: [number, number][] = [[FLAME, 1], [FLAME_MID, 0.7], [FLAME_CORE, 0.38]];
  for (const [c, f] of layers) {
    const r = s * 0.55 * f;
    g.fillStyle(c, 0.95);
    g.fillCircle(x, y - r * 0.2, r);
    g.fillTriangle(x - r, y - r * 0.25, x + r, y - r * 0.25, x + sway * f, y - s * 1.65 * stretch * f - r * 0.3);
  }
  // The blue foot every real candle flame has.
  g.fillStyle(0x6aa8ff, 0.5); g.fillEllipse(x, y + s * 0.05, s * 0.5, s * 0.22);
}

/** A thin curl of smoke off a snuffed wick. */
export function smokeCurl(g: G, x: number, y: number, t: number, a = 0.4, len = 40): void {
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    const ph = (t * 0.9 + f) % 1;
    const sx = x + Math.sin(t * 2.2 + i * 0.9) * (3 + f * 9);
    const sy = y - ph * len;
    g.fillStyle(0x9a948c, a * (1 - ph));
    g.fillCircle(sx, sy, 2 + ph * 5);
  }
}

// ── Candles ──────────────────────────────────────────────────────────

/**
 * A standing candle in three-quarter view: cylinder body with cylindrical shading, a rim with a
 * molten crater, runs of wax down the front and a set pool at the foot. Returns the wick tip,
 * where a flame goes. `melt` (0–1) lops one side of the top lower.
 */
export function candle(g: G, x: number, y: number, w: number, h: number, color: number, rng: () => number, melt = 0.2, lean = 0): Pt {
  const topL = y - h + h * melt * 0.25;
  const topR = y - h;
  const ry = Math.max(3, w * 0.17);
  // Foot pool.
  g.fillStyle(dim(color, 0.18), 0.9); g.fillEllipse(x + w * 0.08, y, w * 1.55, ry * 2.6);
  g.fillStyle(lit(color, 0.1), 0.9); g.fillEllipse(x + w * 0.04, y - 1, w * 1.3, ry * 1.9);
  // Body, as three vertical bands for the round read.
  const band = (fx0: number, fx1: number, c: number): void => {
    const xa = x - w / 2 + w * fx0, xb = x - w / 2 + w * fx1;
    const ta = topL + (topR - topL) * fx0, tb = topL + (topR - topL) * fx1;
    g.fillStyle(c, 1);
    g.fillPoints([
      new Phaser.Geom.Point(xa, y), new Phaser.Geom.Point(xb, y),
      new Phaser.Geom.Point(xb + lean, tb), new Phaser.Geom.Point(xa + lean, ta),
    ], true, true);
  };
  band(0, 1, dim(color, 0.35));
  band(0.03, 0.97, color);
  band(0.62, 0.97, dim(color, 0.12));
  band(0.82, 0.97, dim(color, 0.22));
  band(0.08, 0.24, lit(color, 0.22));
  // Rim + crater.
  const cx = x + lean, cy = (topL + topR) / 2;
  g.fillStyle(lit(color, 0.12), 1); g.fillEllipse(cx, cy, w, ry * 2);
  g.fillStyle(dim(color, 0.12), 1); g.fillEllipse(cx + 1, cy + 1, w * 0.74, ry * 1.3);
  g.fillStyle(MOLTEN, 0.8); g.fillEllipse(cx + 1, cy + 1.5, w * 0.6, ry * 0.95);
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(cx - w * 0.14, cy, w * 0.18, ry * 0.4);
  // Runs of wax down the front.
  const runs = Math.max(2, Math.floor(w / 14));
  for (let i = 0; i < runs; i++) {
    const fx = 0.1 + (0.8 * (i + rng() * 0.6)) / runs;
    const rx = x - w / 2 + w * fx + lean * (1 - 0.2);
    const top = topL + (topR - topL) * fx + 2;
    const len = 8 + rng() * Math.min(h * 0.55, 60);
    const rw = 3 + rng() * Math.max(3, w * 0.06);
    g.fillStyle(dim(color, 0.2), 0.8); g.fillRoundedRect(rx - rw / 2 + 1, top, rw, len + 1, rw / 2);
    g.fillStyle(lit(color, 0.14), 1); g.fillRoundedRect(rx - rw / 2, top - 1, rw, len, rw / 2);
    g.fillCircle(rx, top + len - 1, rw * 0.7);
    g.fillStyle(0xffffff, 0.3); g.fillRect(rx - rw * 0.25, top + 2, 1.2, len * 0.6);
  }
  // Wick.
  const wx = cx + w * 0.02, wy = cy - 1;
  g.lineStyle(Math.max(1.5, w * 0.04), WICK, 1);
  g.lineBetween(wx, wy, wx + 1.5, wy - Math.max(6, w * 0.12));
  return { x: wx + 1.5, y: wy - Math.max(6, w * 0.12) };
}

export interface CandleHouseOpts {
  wax: number;
  /** Window glow colour. */
  glow?: number;
  /** 0–1: how far one side of the top has slumped. */
  melt?: number;
  /** Top leans sideways by this many px. */
  lean?: number;
  /** Rows of windows. */
  rows?: number;
  door?: number;
  /** A stub: burnt down nearly to the door. No upper windows. */
  stub?: boolean;
}

/**
 * A house that *is* a candle — a fat wax cylinder with a door cut into its foot, arched windows
 * glowing through the wax, a sag where the heat has slumped it and a wick on top that the family
 * must keep lit for the King. `x,y` is the front base. Returns the wick tip.
 */
export function candleHouse(g: G, x: number, y: number, w: number, h: number, o: CandleHouseOpts, rng: () => number): Pt {
  shadow(g, x + 6, y + 4, w * 1.5, 26, 0.28);
  const tip = candle(g, x, y, w, h, o.wax, rng, o.melt ?? 0.3, o.lean ?? 0);
  // A sag bulge where the wax slumped — lumps hanging off one shoulder.
  const side = (o.lean ?? 0) >= 0 ? 1 : -1;
  const sagY = y - h * 0.62;
  g.fillStyle(dim(o.wax, 0.1), 1);
  g.fillEllipse(x + side * w * 0.47, sagY, w * 0.22, h * 0.2);
  g.fillStyle(lit(o.wax, 0.08), 1);
  g.fillEllipse(x + side * w * 0.45, sagY - 3, w * 0.16, h * 0.14);
  // Windows: arched, glowing through.
  const glowC = o.glow ?? HONEY;
  const rows = o.stub ? 0 : (o.rows ?? Math.max(1, Math.floor(h / 70)));
  for (let r = 0; r < rows; r++) {
    const wy = y - 58 - r * 58 - (r % 2) * 6;
    if (wy < y - h + 26) break;
    const cols = w > 110 ? 2 : 1;
    for (let c = 0; c < cols; c++) {
      const wx = cols === 1 ? x + (r % 2 ? -w * 0.18 : w * 0.16) : x + (c === 0 ? -w * 0.24 : w * 0.2);
      g.fillStyle(dim(o.wax, 0.45), 1); g.fillRoundedRect(wx - 9, wy - 14, 18, 22, { tl: 9, tr: 9, bl: 2, br: 2 });
      g.fillStyle(glowC, 0.18); g.fillCircle(wx, wy - 4, 18);
      g.fillStyle(glowC, 0.95); g.fillRoundedRect(wx - 7, wy - 12, 14, 18, { tl: 7, tr: 7, bl: 1, br: 1 });
      g.fillStyle(lit(glowC, 0.5), 0.9); g.fillRect(wx - 1, wy - 12, 2, 18);
      // Wax has crept over the sill.
      g.fillStyle(lit(o.wax, 0.1), 1); g.fillRoundedRect(wx - 10, wy + 6, 20, 4, 2);
      g.fillCircle(wx - 6, wy + 11, 2.2);
    }
  }
  // Door, carved into the foot.
  const door = o.door ?? WOOD;
  g.fillStyle(dim(o.wax, 0.5), 1); g.fillRoundedRect(x - 14, y - 38, 28, 38, { tl: 13, tr: 13, bl: 0, br: 0 });
  g.fillStyle(door, 1); g.fillRoundedRect(x - 11, y - 35, 22, 35, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.lineStyle(1.5, dim(door, 0.35), 1); g.lineBetween(x, y - 34, x, y);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 6, y - 16, 2);
  // The tithe mark: a little brass plate over the door with the King's ring.
  g.fillStyle(BRASS, 0.9); g.fillRoundedRect(x - 6, y - 46, 12, 7, 2);
  g.lineStyle(1.2, SEAL_RED, 1); g.strokeCircle(x, y - 42.5, 2.4);
  return tip;
}

// ── Bees and hives ───────────────────────────────────────────────────

/** A straw skep: coiled bands stacked into a dome, an entrance hole at the foot. */
export function skep(g: G, x: number, y: number, s: number, honey = 0): void {
  shadow(g, x, y + 2, s * 2.3, s * 0.6, 0.3);
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const f = i / bands;
    const bw = s * 2 * Math.cos(f * Math.PI * 0.45) * (1 - f * 0.25);
    const by = y - s * 0.18 - f * s * 1.55;
    g.fillStyle(dim(STRAW, 0.35), 1); g.fillEllipse(x, by + 2, bw + 3, s * 0.44);
    g.fillStyle(i % 2 ? STRAW : lit(STRAW, 0.08), 1); g.fillEllipse(x, by, bw, s * 0.4);
    g.lineStyle(1, dim(STRAW, 0.25), 0.8);
    for (let k = -2; k <= 2; k++) g.lineBetween(x + k * bw * 0.18, by - s * 0.15, x + k * bw * 0.18 + 2, by + s * 0.15);
  }
  g.fillStyle(lit(STRAW, 0.18), 1); g.fillCircle(x, y - s * 1.75, s * 0.28);
  // Entrance.
  g.fillStyle(0x1a120a, 1); g.fillEllipse(x, y - s * 0.22, s * 0.42, s * 0.24);
  if (honey > 0) {
    g.fillStyle(HONEY, 0.95);
    g.fillRoundedRect(x - s * 0.1, y - s * 0.16, s * 0.2, s * 0.25 + honey * s * 0.45, s * 0.1);
    g.fillCircle(x, y - s * 0.16 + s * 0.25 + honey * s * 0.45, s * 0.13);
  }
}

/** One bee — a striped dot with a wing flicker. */
export function bee(g: G, x: number, y: number, t: number, seed: number, s = 1): void {
  const flap = Math.sin(t * 40 + seed * 3) > 0;
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(x - 1.5 * s, y - 2.6 * s, 3.4 * s, flap ? 3 * s : 1.4 * s);
  g.fillEllipse(x + 1.5 * s, y - 2.6 * s, 3.4 * s, flap ? 3 * s : 1.4 * s);
  g.fillStyle(0xf2b21e, 1); g.fillEllipse(x, y, 5 * s, 3.6 * s);
  g.fillStyle(0x1a120a, 1); g.fillRect(x - 0.6 * s, y - 1.8 * s, 1.2 * s, 3.6 * s);
}

/** A honeycomb cell outline (pointy-top hex). */
export function hexPath(g: G, x: number, y: number, r: number, fill: number, a: number, stroke?: number): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + (i * Math.PI) / 3;
    pts.push(new Phaser.Geom.Point(x + Math.cos(ang) * r, y + Math.sin(ang) * r));
  }
  g.fillStyle(fill, a); g.fillPoints(pts, true, true);
  if (stroke !== undefined) { g.lineStyle(1.2, stroke, a); g.strokePoints(pts, true, true); }
}

// ── Wax on the floor ─────────────────────────────────────────────────

/**
 * A wax puddle, from molten (glossy, rippling) through skinning over (`set` 0→1, a dull crust
 * with cracks) — the one look every drip in the court uses.
 */
export function waxPuddle(g: G, x: number, y: number, r: number, t: number, set: number, tint = MOLTEN, seed = 0): void {
  const base = mixC(tint, 0xe9e2d2, set);
  g.fillStyle(dim(base, 0.3), 0.55); g.fillEllipse(x + 2, y + 3, r * 2.1, r * 1.5);
  const lumps = 8;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const k = 0.86 + Math.sin(seed * 3.1 + i * 1.9) * 0.12 + (1 - set) * Math.sin(t * 2 + i) * 0.03;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.72 * k));
  }
  g.fillStyle(base, 0.92); g.fillPoints(pts, true, true);
  if (set < 1) {
    const gloss = 1 - set;
    g.fillStyle(0xffffff, 0.35 * gloss); g.fillEllipse(x - r * 0.3, y - r * 0.22, r * 0.6, r * 0.18);
    g.lineStyle(1.2, lit(tint, 0.35), 0.5 * gloss);
    const rip = (t * 0.7 + seed) % 1;
    g.strokeEllipse(x, y, r * 1.6 * rip, r * 1.1 * rip);
  }
  if (set > 0.3) {
    g.lineStyle(1, dim(base, 0.35), (set - 0.3) * 1.2);
    for (let i = 0; i < 4; i++) {
      const a = seed + i * 1.6;
      g.lineBetween(x, y, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.5);
    }
  }
}

/** Rounded wax block: set wax in three-quarter view, with drips on its face. */
export function waxBlock(g: G, x: number, y: number, r: number, color = 0xeee4cc): void {
  const w = r * 2, h = r * 1.35;
  shadow(g, x, y + 2, w * 1.15, r * 0.6, 0.3);
  g.fillStyle(dim(color, 0.35), 1); g.fillRoundedRect(x - r - 1, y - h - 1, w + 2, h + 2, 8);
  g.fillStyle(dim(color, 0.08), 1); g.fillRoundedRect(x - r, y - h, w, h, 7);
  g.fillStyle(lit(color, 0.12), 1); g.fillRoundedRect(x - r, y - h, w, r * 0.62, 7);
  for (let i = 0; i < 3; i++) {
    const dx = x - r * 0.6 + i * r * 0.55;
    const len = 6 + ((i * 7) % 9);
    g.fillStyle(lit(color, 0.18), 1); g.fillRoundedRect(dx - 2, y - h + r * 0.5, 4, len, 2);
    g.fillCircle(dx, y - h + r * 0.5 + len, 2.6);
  }
}

/** A lit taper on a brass stick — the cathedral's candle, scaled. `wax` 0–1 is how much is left. */
export function taperOnStick(g: G, x: number, y: number, wax: number, s = 1): Pt {
  shadow(g, x, y + 2, 26 * s, 8 * s, 0.3);
  g.fillStyle(dim(BRASS, 0.35), 1); g.fillEllipse(x, y, 24 * s, 9 * s);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 1.5 * s, 21 * s, 7 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 2.2 * s, y - 16 * s, 4.4 * s, 15 * s);
  g.fillStyle(lit(BRASS, 0.3), 1); g.fillEllipse(x, y - 16 * s, 14 * s, 5 * s);
  const h = (10 + wax * 44) * s;
  const top = y - 17 * s - h;
  g.fillStyle(dim(WAX, 0.25), 1); g.fillRect(x - 4.5 * s, top, 9 * s, h);
  g.fillStyle(WAX, 1); g.fillRect(x - 4 * s, top, 7 * s, h);
  g.fillStyle(lit(WAX, 0.3), 1); g.fillRect(x - 3.2 * s, top, 2 * s, h);
  g.fillStyle(lit(WAX, 0.15), 1); g.fillRoundedRect(x + 1 * s, top + 2 * s, 2.6 * s, 6 * s + wax * 8 * s, 1.3 * s);
  g.lineStyle(1.4 * s, WICK, 1); g.lineBetween(x, top, x, top - 4 * s);
  return { x, y: top - 4 * s };
}
