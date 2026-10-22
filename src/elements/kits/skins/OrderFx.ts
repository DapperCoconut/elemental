import Phaser from 'phaser';
import { TAU, easeIn, easeOut } from '../ElementVisuals';
import {
  RUI, RuinColorFn, RuinFx, chainRun, crackWeb, decayCoat, jitter, padlock, rubyJewel,
  ruinCluster, ruinRing, rustySpike, shrapnelShard, shredWedge, skinShard,
} from '../RuinVisuals';

/**
 * Everything the Order skin draws in place of Ruin's art.
 *
 * Ruin's two primitives are a spike and a crack. Order's are their opposites: a **column**
 * (whole, fluted, standing straight, with its base and capital still on) and an **inlay** (a
 * straight gold line set into polished marble, evenly spaced, ending in a neat diamond). Every
 * shape is symmetric, every edge is straight or a true curve, and nothing is pitted, bitten,
 * rusted or cracked.
 *
 * All colours still go through the owner's `tint`, keyed by Ruin's palette entries, so the
 * Order palette in `src/data/skins/order.ts` decides the final shade. The aliases below say
 * what each Ruin key *means* under that palette.
 *
 * Visual only: every function here has the same signature and footprint as the Ruin function it
 * stands in for, and none of them touches gameplay state.
 */

/** Ruin palette keys, named for what the Order palette turns them into. */
const O = {
  shadow: RUI.voidDark,
  vein: RUI.ash,
  cool: RUI.blood,
  floor: RUI.stone,
  lapis: RUI.ruby,
  shade: RUI.iron,
  marble: RUI.red,
  gold: RUI.rust,
  goldBright: RUI.decay,
  goldLit: RUI.ember,
  sky: RUI.ancient,
  gleam: RUI.bright,
  white: RUI.bone,
};

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/** A local-space quad (u0..u1 along, v0..v1 across) as world points. */
function quad(
  P: (u: number, v: number) => Phaser.Geom.Point, u0: number, u1: number, v0: number, v1: number,
): Phaser.Geom.Point[] {
  return [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
}

/** A small gold diamond — the terminal on every inlay line. */
function diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillPoints([
    new Phaser.Geom.Point(x, y - r), new Phaser.Geom.Point(x + r * 0.75, y),
    new Phaser.Geom.Point(x, y + r), new Phaser.Geom.Point(x - r * 0.75, y),
  ], true);
}

// ── Primitives (same signatures as RuinVisuals) ───────────────────────────

/**
 * Stands in for `rustySpike`. Pointing up, it is a **whole fluted column** — plinth, shaft,
 * astragal, capital, abacus — rising out of the floor. Pointing anywhere else (the R skewer, the
 * converging cage) it is a **marble lance**: a fluted shaft between gold collars with a gilt
 * pyramidion for a point, and clean symmetric fins where Ruin hangs its barbs.
 */
export function orderSpike(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, ang: number,
  len: number, halfWidth: number, alpha: number,
  { barbs = 2 }: { seed?: number; wear?: number; barbs?: number; color?: number } = {},
): void {
  if (len <= 0.5 || halfWidth <= 0.1) return;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const upright = Math.abs(Phaser.Math.Angle.Wrap(ang + Math.PI / 2)) < 0.7;

  if (upright) {
    const w = halfWidth * 0.82;
    const sh = (pts: Phaser.Geom.Point[]) => pts.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 1.5));
    const outline = [P(0, -w * 1.5), P(len, -w * 1.55), P(len, w * 1.55), P(0, w * 1.5)];
    g.fillStyle(tint(O.shadow), alpha * 0.32);
    g.fillPoints(sh(outline), true);
    // Plinth.
    g.fillStyle(tint(O.shade), alpha);
    g.fillPoints(quad(P, 0, len * 0.1, -w * 1.45, w * 1.45), true);
    // Shaft: shaded body, lit left flank, flutes.
    g.fillStyle(tint(O.marble), alpha);
    g.fillPoints(quad(P, len * 0.1, len * 0.84, -w, w), true);
    g.fillStyle(tint(O.shade), alpha * 0.8);
    g.fillPoints(quad(P, len * 0.1, len * 0.84, w * 0.45, w), true);
    g.fillStyle(tint(O.white), alpha * 0.85);
    g.fillPoints(quad(P, len * 0.1, len * 0.84, -w, -w * 0.5), true);
    g.lineStyle(Math.max(0.6, w * 0.16), tint(O.vein), alpha * 0.45);
    for (const v of [-0.25, 0.2, 0.65]) {
      const a = P(len * 0.13, v * w), b = P(len * 0.81, v * w);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Astragal ring, capital, abacus.
    g.fillStyle(tint(O.gold), alpha);
    g.fillPoints(quad(P, len * 0.84, len * 0.88, -w * 1.1, w * 1.1), true);
    g.fillStyle(tint(O.marble), alpha);
    g.fillPoints([P(len * 0.88, -w * 1.1), P(len * 0.95, -w * 1.5), P(len * 0.95, w * 1.5), P(len * 0.88, w * 1.1)], true);
    g.fillStyle(tint(O.white), alpha);
    g.fillPoints(quad(P, len * 0.95, len, -w * 1.6, w * 1.6), true);
    g.lineStyle(1, tint(O.goldLit), alpha * 0.8);
    const t0 = P(len, -w * 1.6), t1 = P(len, w * 1.6);
    g.lineBetween(t0.x, t0.y, t1.x, t1.y);
    return;
  }

  // Marble lance.
  const w = halfWidth * 0.62;
  const body = [P(0, -w), P(len * 0.78, -w), P(len, 0), P(len * 0.78, w), P(0, w)];
  g.fillStyle(tint(O.shadow), alpha * 0.35);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x, p.y + 3)), true);
  g.fillStyle(tint(O.marble), alpha);
  g.fillPoints(quad(P, 0, len * 0.78, -w, w), true);
  g.fillStyle(tint(O.shade), alpha * 0.85);
  g.fillPoints(quad(P, 0, len * 0.78, w * 0.4, w), true);
  g.fillStyle(tint(O.white), alpha * 0.85);
  g.fillPoints(quad(P, 0, len * 0.78, -w, -w * 0.5), true);
  g.lineStyle(Math.max(0.6, w * 0.14), tint(O.vein), alpha * 0.4);
  for (const v of [-0.15, 0.25]) {
    const a = P(len * 0.06, v * w), b = P(len * 0.74, v * w);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  // Pyramidion: lit and shaded halves, gleam at the point.
  g.fillStyle(tint(O.goldLit), alpha);
  g.fillPoints([P(len * 0.76, -w * 1.15), P(len, 0), P(len * 0.76, 0)], true);
  g.fillStyle(tint(O.gold), alpha);
  g.fillPoints([P(len * 0.76, 0), P(len, 0), P(len * 0.76, w * 1.15)], true);
  const tip = P(len, 0);
  g.fillStyle(tint(O.gleam), alpha * 0.8);
  g.fillCircle(tip.x, tip.y, Math.max(1.2, w * 0.3));
  // Gold collars.
  g.fillStyle(tint(O.gold), alpha);
  g.fillPoints(quad(P, len * 0.03, len * 0.08, -w * 1.18, w * 1.18), true);
  g.fillPoints(quad(P, len * 0.7, len * 0.75, -w * 1.18, w * 1.18), true);
  // Fins: matched pairs, swept back, gold-edged.
  for (let i = 0; i < Math.min(2, Math.ceil(barbs / 2)); i++) {
    const s = 0.12 + i * 0.12;
    for (const side of [-1, 1]) {
      const fin = [P(len * (s + 0.1), side * w), P(len * s, side * w * 2.1), P(len * (s - 0.02), side * w)];
      g.fillStyle(tint(O.white), alpha * 0.95);
      g.fillPoints(fin, true);
      g.lineStyle(1, tint(O.gold), alpha * 0.85);
      g.lineBetween(fin[0].x, fin[0].y, fin[1].x, fin[1].y);
    }
  }
}

/**
 * Stands in for `shredWedge`: a polished marble chevron, perfectly symmetric, gold along both
 * leading edges with a lapis set in its heart. It leaves a straight ruled streak, not a smear.
 */
export function orderWedge(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, ang: number, len: number, alpha: number, spin: number, _seed = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const half = len * 0.44 * (0.82 + 0.18 * Math.cos(spin));
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Two ruled lines behind it.
  g.lineStyle(2, tint(O.sky), alpha * 0.25);
  for (const side of [-1, 1]) {
    const a = P(-len * 1.5, side * half * 0.45), b = P(-len * 0.3, side * half * 0.85);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  g.fillStyle(tint(O.white), alpha * 0.12);
  g.fillPoints([P(-len * 1.4, -half * 0.35), P(-len * 0.2, -half * 0.8), P(-len * 0.2, half * 0.8), P(-len * 1.4, half * 0.35)], true);

  const notch = len * 0.3;
  const tip = P(len * 0.62, 0);
  const body = [
    tip, P(-len * 0.32, -half), P(-len * 0.32 + notch, 0), P(-len * 0.32, half),
  ];
  g.fillStyle(tint(O.shadow), alpha * 0.35);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x, p.y + 3)), true);
  // Lit upper half, shaded lower half — a cut stone catches light on one facet.
  g.fillStyle(tint(O.white), alpha * 0.97);
  g.fillPoints([tip, P(-len * 0.32, -half), P(-len * 0.32 + notch, 0)], true);
  g.fillStyle(tint(O.shade), alpha * 0.95);
  g.fillPoints([tip, P(-len * 0.32 + notch, 0), P(-len * 0.32, half)], true);
  // A single smooth vein across both facets.
  g.lineStyle(1, tint(O.vein), alpha * 0.4);
  const v0 = P(-len * 0.2, -half * 0.6), v1 = P(len * 0.1, -half * 0.1), v2 = P(len * 0.05, half * 0.4);
  g.lineBetween(v0.x, v0.y, v1.x, v1.y);
  g.lineBetween(v1.x, v1.y, v2.x, v2.y);
  // Gold edging and the centre inlay.
  g.lineStyle(1.8, tint(O.gold), alpha * 0.95);
  g.strokePoints(body, true, true);
  g.lineStyle(1.2, tint(O.goldLit), alpha * 0.8);
  const c0 = P(-len * 0.32 + notch, 0);
  g.lineBetween(c0.x, c0.y, tip.x, tip.y);
  const gem = P(len * 0.08, 0);
  g.fillStyle(tint(O.lapis), alpha);
  diamond(g, gem.x, gem.y, len * 0.11);
  g.fillStyle(tint(O.sky), alpha * 0.8);
  g.fillCircle(gem.x - 1, gem.y - 1, len * 0.035);
  g.fillStyle(tint(O.gleam), alpha * 0.9);
  g.fillCircle(tip.x, tip.y, 1.8 + Math.abs(Math.sin(spin * 2)) * 1);
}

/**
 * Stands in for `crackWeb`: gold lines inlaid into the floor, radiating at even angles and
 * ending in diamonds, with a ruled ring at two-thirds reach. `grow` still sweeps it open.
 */
export function orderInlay(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, seed: number, alpha: number, grow = 1,
  { runs = 7, color = RUI.voidDark, width = 2, squash = 1 } = {},
): void {
  if (grow <= 0.01) return;
  // Ruin's dark crack colours become gold; its glowing seams keep their (mapped) hue.
  const c = color === RUI.voidDark || color === RUI.ash || color === RUI.blood ? O.gold : color;
  const reach = r * 0.92 * grow;
  const rot = jitter(seed, 0) * TAU;
  const lw = Math.max(0.6, width * 0.6);
  for (let i = 0; i < runs; i++) {
    const a = rot + (i / runs) * TAU;
    const ex = x + Math.cos(a) * reach;
    const ey = y + Math.sin(a) * reach * squash;
    g.lineStyle(lw, tint(c), alpha * 0.85);
    g.lineBetween(x + Math.cos(a) * reach * 0.18, y + Math.sin(a) * reach * 0.18 * squash, ex, ey);
    g.fillStyle(tint(c), alpha * 0.9);
    diamond(g, ex, ey, lw * 1.6 + 0.8);
  }
  g.lineStyle(lw, tint(c), alpha * 0.6);
  g.strokeEllipse(x, y, reach * 1.3, reach * 1.3 * squash);
  g.fillStyle(tint(c), alpha * 0.7);
  diamond(g, x, y, lw * 1.8 + 1);
}

/**
 * Stands in for `ruinRing`: a polished mosaic floor following the caster — marble disc, gold
 * rim, a band of tiles, an eight-point compass star filling in as the fuse runs. In the last
 * third a ring of whole columns rises evenly round the rim.
 */
export function orderRing(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, t: number, alpha: number, charge: number, seed = 0,
): void {
  const sq = 0.62;
  g.fillStyle(tint(O.marble), alpha * (0.1 + charge * 0.16));
  g.fillEllipse(x, y, r * 2, r * 2 * sq);
  g.fillStyle(tint(O.white), alpha * (0.06 + charge * 0.1));
  g.fillEllipse(x, y, r * 1.64, r * 1.64 * sq);

  g.lineStyle(2 + charge * 2.5, tint(O.gold), alpha * (0.6 + charge * 0.4));
  g.strokeEllipse(x, y, r * 2, r * 2 * sq);
  g.lineStyle(1.2, tint(O.lapis), alpha * (0.35 + charge * 0.4));
  g.strokeEllipse(x, y, r * 1.64, r * 1.64 * sq);

  // Tile seams across the band between the two rings.
  const rot = seed + t * 0.1;
  g.lineStyle(1, tint(O.gold), alpha * (0.3 + charge * 0.4));
  for (let i = 0; i < 24; i++) {
    const a = rot + (i / 24) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    g.lineBetween(x + c * r * 0.82, y + s * r * 0.82 * sq, x + c * r, y + s * r * sq);
  }

  // Compass star, growing in with the fuse.
  const star = r * 0.62 * easeOut(charge);
  if (star > 2) {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 16; i++) {
      const a = rot * 0.5 + (i / 16) * TAU;
      const d = i % 2 === 0 ? star : star * 0.38;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * d, y + Math.sin(a) * d * sq));
    }
    g.fillStyle(tint(O.goldBright), alpha * (0.14 + charge * 0.22));
    g.fillPoints(pts, true);
    g.lineStyle(1.2, tint(O.goldLit), alpha * (0.3 + charge * 0.5));
    g.strokePoints(pts, true, true);
    g.fillStyle(tint(O.lapis), alpha * 0.6 * charge);
    diamond(g, x, y, 4 + charge * 3);
  }

  const push = Math.max(0, charge - 0.62) / 0.38;
  if (push <= 0) return;
  for (let i = 0; i < 12; i++) {
    const a = rot + (i / 12) * TAU;
    const sx = x + Math.cos(a) * r * 0.9;
    const sy = y + Math.sin(a) * r * 0.9 * sq;
    orderSpike(g, tint, sx, sy + 4, -Math.PI / 2, 8 + push * 16, 4, alpha * 0.95);
  }
}

/**
 * Stands in for `padlock`: a seal of white marble with a gold shackle and gold border, a lapis
 * boss round the keyhole. Same outline and swing as Ruin's lock so Lockdown reads identically.
 */
export function orderPadlock(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, size: number, alpha: number, shackle = 1, wobble = 0,
): void {
  const tilt = Math.sin(wobble) * 0.1;
  const ca = Math.cos(tilt);
  const sa = Math.sin(tilt);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  const open = (1 - shackle) * 0.9;
  const hoop = (off: number, dy: number) => {
    g.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * (Math.PI - open);
      const p = P(Math.cos(a) * size * 0.42 + off, -size * 0.55 + dy + Math.sin(a) * size * 0.42);
      if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
    }
    g.strokePath();
  };
  g.lineStyle(size * 0.22, tint(O.gold), alpha);
  hoop(0, 0);
  g.lineStyle(size * 0.07, tint(O.goldLit), alpha * 0.8);
  hoop(-size * 0.03, -size * 0.03);

  const body = [P(-size * 0.64, -size * 0.5), P(size * 0.64, -size * 0.5), P(size * 0.64, size * 0.55), P(-size * 0.64, size * 0.55)];
  g.fillStyle(tint(O.shadow), alpha * 0.4);
  g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x, p.y + 2.5)), true);
  g.fillStyle(tint(O.marble), alpha);
  g.fillPoints(body, true);
  g.fillStyle(tint(O.white), alpha * 0.9);
  g.fillPoints([P(-size * 0.64, -size * 0.5), P(size * 0.64, -size * 0.5), P(size * 0.64, -size * 0.2), P(-size * 0.64, -size * 0.2)], true);
  g.fillStyle(tint(O.shade), alpha * 0.7);
  g.fillPoints([P(-size * 0.64, size * 0.36), P(size * 0.64, size * 0.36), P(size * 0.64, size * 0.55), P(-size * 0.64, size * 0.55)], true);
  g.lineStyle(1.6, tint(O.gold), alpha);
  g.strokePoints(body, true, true);
  // A smooth vein, and gold studs in the corners.
  g.lineStyle(0.9, tint(O.vein), alpha * 0.4);
  const a0 = P(-size * 0.55, size * 0.3), a1 = P(-size * 0.1, size * 0.1), a2 = P(size * 0.5, size * 0.25);
  g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  g.lineBetween(a1.x, a1.y, a2.x, a2.y);
  g.fillStyle(tint(O.goldLit), alpha);
  for (const [u, v] of [[-0.48, -0.34], [0.48, -0.34], [-0.48, 0.38], [0.48, 0.38]]) {
    const r = P(u * size, v * size);
    g.fillCircle(r.x, r.y, size * 0.075);
  }
  const key = P(0, size * 0.04);
  g.fillStyle(tint(O.lapis), alpha);
  g.fillCircle(key.x, key.y, size * 0.3);
  g.lineStyle(1, tint(O.gold), alpha);
  g.strokeCircle(key.x, key.y, size * 0.3);
  g.fillStyle(tint(O.shadow), alpha);
  g.fillCircle(key.x, key.y - size * 0.04, size * 0.11);
  g.fillPoints([P(-size * 0.06, size * 0.02), P(size * 0.06, size * 0.02), P(size * 0.04, size * 0.24), P(-size * 0.04, size * 0.24)], true);
}

/** Stands in for `chainRun`: polished gold links, alternating flat and edge-on. */
export function orderChain(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, sag = 14, _seed = 0,
): void {
  const links = Math.max(3, Math.round(Phaser.Math.Distance.Between(x0, y0, x1, y1) / 13));
  for (let i = 0; i < links; i++) {
    const s = i / (links - 1);
    const lx = x0 + (x1 - x0) * s;
    const ly = y0 + (y1 - y0) * s + Math.sin(s * Math.PI) * sag;
    const wide = i % 2 === 0;
    g.lineStyle(2.6, tint(wide ? O.gold : O.goldBright), alpha * 0.95);
    g.strokeEllipse(lx, ly, wide ? 10 : 5, wide ? 5.5 : 8.5);
    if (wide) {
      g.lineStyle(1, tint(O.gleam), alpha * 0.6);
      g.lineBetween(lx - 3, ly - 2.2, lx + 1, ly - 2.6);
    }
  }
}

/**
 * Stands in for `decayCoat`. Order's Q doesn't rot a fighter, it *sets them in order*: a cool
 * marble wash, a ruled gold grid laid over them that fills in with the stacks, and small marble
 * tiles circling them in perfect formation.
 */
export function orderCoat(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, t: number, alpha: number, stacks: number, _seed = 0,
): void {
  const depth = Math.min(1, stacks / 6);
  g.fillStyle(tint(O.white), alpha * (0.08 + depth * 0.18));
  g.fillCircle(x, y, r);
  g.fillStyle(tint(O.sky), alpha * (0.05 + depth * 0.1));
  g.fillCircle(x, y, r * 0.75);

  // The grid: chords at even spacing, more of them as the stacks climb.
  const lines = 1 + Math.min(4, Math.ceil(stacks / 2));
  g.lineStyle(1.2, tint(O.gold), alpha * (0.35 + depth * 0.4));
  for (let i = 1; i <= lines; i++) {
    const d = r * ((i / (lines + 1)) * 2 - 1);
    const h = Math.sqrt(Math.max(0, r * r - d * d));
    g.lineBetween(x + d, y - h, x + d, y + h);
    g.lineBetween(x - h, y + d, x + h, y + d);
  }
  g.lineStyle(1.6, tint(O.goldLit), alpha * (0.4 + depth * 0.4));
  g.strokeCircle(x, y, r);

  const n = 3 + Math.min(6, stacks);
  for (let i = 0; i < n; i++) {
    const a = t * 0.8 + (i / n) * TAU;
    const tx = x + Math.cos(a) * r * 1.15;
    const ty = y + Math.sin(a) * r * 0.45 - 4;
    g.fillStyle(tint(O.white), alpha * 0.85);
    g.fillRect(tx - 1.6, ty - 1.6, 3.2, 3.2);
    g.lineStyle(0.8, tint(O.gold), alpha * 0.7);
    g.strokeRect(tx - 1.6, ty - 1.6, 3.2, 3.2);
  }
}

/** Stands in for `rubyJewel`: a cut sapphire in a gold claw setting. */
export function orderJewel(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, t: number, alpha: number, seed = 0,
): void {
  const pulse = 1 + Math.sin(t * 3.4 + seed) * 0.05;
  const rr = r * pulse;
  const P = (dx: number, dy: number) => new Phaser.Geom.Point(x + dx, y + dy);
  g.fillStyle(tint(O.gold), alpha * 0.95);
  g.fillPoints([P(-rr * 1.2, 0), P(0, -rr * 1.25), P(rr * 1.2, 0), P(0, rr * 1.25)], true);
  const gem = [P(0, -rr), P(rr * 0.78, 0), P(0, rr), P(-rr * 0.78, 0)];
  g.fillStyle(tint(O.lapis), alpha);
  g.fillPoints(gem, true);
  g.fillStyle(tint(O.sky), alpha * 0.9);
  g.fillPoints([gem[3], gem[0], P(0, 0)], true);
  g.fillStyle(tint(O.cool), alpha * 0.6);
  g.fillPoints([gem[1], gem[2], P(0, 0)], true);
  g.lineStyle(1, tint(O.goldLit), alpha * 0.8);
  g.strokePoints(gem, true, true);
  g.fillStyle(tint(O.white), alpha * 0.85);
  g.fillCircle(x - rr * 0.24, y - rr * 0.3, rr * 0.17);
  g.fillStyle(tint(O.sky), alpha * 0.16 * pulse);
  g.fillCircle(x, y, rr * 2.1);
}

/**
 * Stands in for `ruinCluster`: where Ruin grows a splinter of crystal, Order sets down a single
 * dressed **marble block**, squared and gold-banded, with a lapis seal on top that lights as the
 * fuse runs. It grows out of the floor the same way and is about the same footprint.
 */
export function orderBlock(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, charge: number, t: number, alpha: number, seed = 0,
): void {
  const grow = easeOut(Math.min(1, charge * 1.6));
  const hot = charge * charge;
  const s = r * 0.85 * grow;
  if (s < 1) return;
  const h = s * 0.95 * (0.6 + 0.4 * grow);
  const P = (dx: number, dy: number) => new Phaser.Geom.Point(x + dx, y + dy);

  g.fillStyle(tint(O.shadow), alpha * 0.35);
  g.fillEllipse(x + 2, y + s * 0.42, s * 2.3, s * 0.9);

  // An isometric cube: top rhombus, left and right faces.
  const top = [P(0, -h - s * 0.5), P(s, -h), P(0, -h + s * 0.5), P(-s, -h)];
  const left = [P(-s, -h), P(0, -h + s * 0.5), P(0, s * 0.5), P(-s, 0)];
  const right = [P(0, -h + s * 0.5), P(s, -h), P(s, 0), P(0, s * 0.5)];
  g.fillStyle(tint(O.marble), alpha);
  g.fillPoints(left, true);
  g.fillStyle(tint(O.shade), alpha);
  g.fillPoints(right, true);
  g.fillStyle(tint(O.white), alpha);
  g.fillPoints(top, true);
  // One clean vein down the lit face.
  g.lineStyle(0.9, tint(O.vein), alpha * 0.45);
  g.lineBetween(x - s * 0.75, y - h * 0.7, x - s * 0.3, y - h * 0.2);
  g.lineBetween(x - s * 0.3, y - h * 0.2, x - s * 0.15, y + s * 0.2);
  // Gold band round the middle and gold edges on the top.
  const bandY = -h * 0.45;
  g.lineStyle(Math.max(1, s * 0.12), tint(O.gold), alpha * 0.95);
  g.lineBetween(x - s, y + bandY, x, y + bandY + s * 0.5);
  g.lineBetween(x, y + bandY + s * 0.5, x + s, y + bandY);
  g.lineStyle(1, tint(O.goldLit), alpha * (0.6 + hot * 0.4));
  g.strokePoints(top, true, true);

  // The seal on top, brightening with the fuse.
  const cy = y - h;
  g.fillStyle(tint(O.sky), alpha * (0.15 + hot * 0.5));
  g.fillEllipse(x, cy, s * (1 + hot * 0.6), s * 0.5 * (1 + hot * 0.6));
  g.fillStyle(tint(O.lapis), alpha * (0.6 + hot * 0.4));
  diamond(g, x, cy, s * 0.28 + Math.sin(t * 14) * hot * 1.2);
  g.fillStyle(tint(O.gleam), alpha * hot * 0.9);
  g.fillCircle(x, cy, s * 0.1 + 0.5);
  if (hot > 0.05) {
    orderInlay(g, tint, x, y, r * 1.4, seed + 5, alpha * hot * 0.6, grow, { runs: 6, squash: 0.5, width: 1.4 });
  }
}

/** Stands in for `shrapnelShard`: a squared marble tessera thrown out on a ruled line. */
export function orderTile(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, ang: number, len: number, alpha: number, _seed = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = len * 0.34;
  g.lineStyle(1.4, tint(O.sky), alpha * 0.35);
  const s0 = P(-len * 2, 0), s1 = P(-w, 0);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  const tile = [P(w, 0), P(0, -w), P(-w, 0), P(0, w)];
  g.fillStyle(tint(O.white), alpha);
  g.fillPoints(tile, true);
  g.fillStyle(tint(O.shade), alpha * 0.8);
  g.fillPoints([P(w, 0), P(0, w), P(-w, 0)], true);
  g.lineStyle(1, tint(O.gold), alpha * 0.9);
  g.strokePoints(tile, true, true);
}

/** Stands in for `skinShard`: a square marble facing plate tumbling over, gold-edged. */
export function orderPlate(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, ang: number, size: number, alpha: number, spin: number, _seed = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const flat = 0.25 + Math.abs(Math.cos(spin)) * 0.75;
  const hu = size * 0.6;
  const hv = size * 0.6 * flat;
  g.lineStyle(1.2, tint(O.sky), alpha * 0.25);
  const t0 = P(-size * 2.2, 0), t1 = P(-hu, 0);
  g.lineBetween(t0.x, t0.y, t1.x, t1.y);
  const face = Math.cos(spin) >= 0;
  const plate = [P(-hu, -hv), P(hu, -hv), P(hu, hv), P(-hu, hv)];
  g.fillStyle(tint(face ? O.white : O.marble), alpha * 0.95);
  g.fillPoints(plate, true);
  g.fillStyle(tint(face ? O.shade : O.cool), alpha * 0.7);
  g.fillPoints([P(-hu, hv * 0.3), P(hu, hv * 0.3), P(hu, hv), P(-hu, hv)], true);
  g.lineStyle(1.2, tint(O.gold), alpha * 0.9);
  g.strokePoints(plate, true, true);
  g.fillStyle(tint(O.gold), alpha * 0.8);
  diamond(g, x, y, Math.max(1, hv * 0.35));
}

/**
 * Stands in for the kit's inline "ruin crack" floor sore: a polished marble medallion set into
 * the floor — gold rim, inlaid star, a soft blue ring breathing where Ruin's teal seam is.
 */
export function orderMedallion(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x: number, y: number, r: number, t: number, seed: number,
): void {
  const pulse = 0.95 + Math.sin(t * 2 + seed) * 0.03;
  g.fillStyle(tint(O.floor), 0.4);
  g.fillEllipse(x, y + 2, r * 2 * pulse, r * 1.24 * pulse);
  g.fillStyle(tint(O.marble), 0.55);
  g.fillEllipse(x, y, r * 2 * pulse, r * 1.24 * pulse);
  g.fillStyle(tint(O.white), 0.4);
  g.fillEllipse(x - r * 0.15, y - r * 0.1, r * 1.3, r * 0.7);
  g.lineStyle(2, tint(O.gold), 0.75);
  g.strokeEllipse(x, y, r * 2 * pulse, r * 1.24 * pulse);
  g.lineStyle(1.4, tint(O.sky), 0.3 + Math.sin(t * 3 + seed) * 0.12);
  g.strokeEllipse(x, y, r * 1.5, r * 0.93);
  orderInlay(g, tint, x, y, r * 0.95, seed, 0.6, 1, { runs: 8, squash: 0.62, width: 1.8 });
}

/** Stands in for the kit's ruinic lightning: a ruled beam of light, gold in a blue sheath. */
export function orderBeam(
  g: Phaser.GameObjects.Graphics,
  tint: RuinColorFn,
  x0: number, y0: number, x1: number, y1: number, fade: number,
): void {
  g.lineStyle(6, tint(O.sky), fade * 0.3);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(2.2, tint(O.goldLit), fade * 0.9);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(0.9, tint(O.white), fade);
  g.lineBetween(x0, y0, x1, y1);
  g.fillStyle(tint(O.gold), fade);
  diamond(g, x1, y1, 4);
}

/** Stands in for the kit's shed decay flecks: a small square of white marble with a gold edge. */
export function orderFleck(g: Phaser.GameObjects.Graphics, tint: RuinColorFn, x: number, y: number, fade: number): void {
  g.fillStyle(tint(O.white), fade * 0.6);
  g.fillRect(x, y, 2.8, 2.8);
  g.lineStyle(0.6, tint(O.gold), fade * 0.5);
  g.strokeRect(x, y, 2.8, 2.8);
}

// ── The swap table ────────────────────────────────────────────────────────

/** The painting functions RuinKit calls by name, so a skin can hand in its own set. */
export interface RuinArt {
  rustySpike: typeof rustySpike;
  shredWedge: typeof shredWedge;
  crackWeb: typeof crackWeb;
  ruinRing: typeof ruinRing;
  padlock: typeof padlock;
  chainRun: typeof chainRun;
  decayCoat: typeof decayCoat;
  rubyJewel: typeof rubyJewel;
  ruinCluster: typeof ruinCluster;
  shrapnelShard: typeof shrapnelShard;
  skinShard: typeof skinShard;
}

export const RUIN_ART: RuinArt = {
  rustySpike, shredWedge, crackWeb, ruinRing, padlock, chainRun, decayCoat, rubyJewel,
  ruinCluster, shrapnelShard, skinShard,
};

export const ORDER_ART: RuinArt = {
  rustySpike: orderSpike,
  shredWedge: orderWedge,
  crackWeb: orderInlay,
  ruinRing: orderRing,
  padlock: orderPadlock,
  chainRun: orderChain,
  decayCoat: orderCoat,
  rubyJewel: orderJewel,
  ruinCluster: orderBlock,
  shrapnelShard: orderTile,
  skinShard: orderPlate,
};

// ── Floating text ─────────────────────────────────────────────────────────

/** Ruin's call-outs, rewritten for Order. Applied in order as plain substring swaps. */
const ORDER_LINES: [string, string][] = [
  ['🩸 RUSTY SKEWER', '🏛️ MARBLE LANCE'],
  ['🔻 SPIKES OF RUIN', '🏛️ PILLARS OF ORDER'],
  ['☠️ UNSTOPPABLE DECAY', '⚖️ UNSTOPPABLE ORDER'],
  ['☠️ NOTHING LEFT TO ROT', '⚖️ ALL IS IN ORDER'],
  ['🦠 DECAY', '⚖️ ORDER'],
  ['RUIN CRACKS', 'MARBLE MEDALLIONS'],
  ['🕳️', '🏛️'],
  ['🦎 SECOND SKIN', '🏛️ SECOND FACADE'],
  ['🦎 NOTHING LEFT TO SHED', '🏛️ NOTHING LEFT TO RESURFACE'],
  ['🦎', '🏛️'],
  ['⚡ RUINIC LIGHTNING', '✨ RULED LIGHT'],
  ['RUSTED', 'SET IN STONE'],
  ['⚙️', '🗿'],
  ['🩸 TRANSFUSION', '✨ TRANSFUSION'],
  ['🩸 SKEWERED', '🏛️ IMPALED'],
  ['🧱 TORN OFF', '🏛️ SET IN PLACE'],
  ['🩸', '🏛️'],
  ['🔻 RUINED', '⚖️ CORRECTED'],
  ['BUFFS TURNED', 'BUFFS CORRECTED'],
  ['🔻', '⚖️'],
  ['🏚️', '🏛️'],
  ['RAZED', 'CLEARED AWAY'],
  ['🪓', '⚖️'],
  ['🦷 LOCKJAW', '📜 EDICT'],
  ['🔓 UNLOCKED', '📜 EDICT LIFTED'],
  ['LOCKED 20s', 'SEALED 20s'],
  ['🔒', '📜'],
  ['✂️ SHREDDED', '✨ PURIFIED'],
];

export function orderLine(text: string): string {
  let out = text;
  for (const [from, to] of ORDER_LINES) out = out.split(from).join(to);
  return out;
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** RuinFx with every one-shot redrawn intact. Same method signatures, same timings. */
export class OrderFx extends RuinFx {
  shed(x: number, y: number, r: number, ms = 620, depth = 11): void {
    const plates = 25;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2, this.tint(O.gold), t * 0.7);
      g.strokeCircle(x, y, r * 0.8);
      for (let i = 0; i < plates; i++) {
        const a = (i / plates) * TAU;
        const d = r * (0.9 + e * 1.6);
        orderPlate(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a, r * 0.3, (1 - t) * 0.95, t * 5 + i * 0.4);
      }
    });
  }

  unform(x: number, y: number, r = 40, ms = 480, depth = 12): void {
    this.anim(depth, ms, (g, t) => {
      const e = 1 - easeOut(t);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const d = r * (0.4 + e * 1.5);
        orderSpike(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI, 18 + e * 10, 5, (1 - t) * 0.9, { barbs: 0 });
      }
      g.lineStyle(2.5, this.tint(O.goldLit), (1 - t) * 0.6);
      g.strokeCircle(x, y, r * (0.4 + e * 1.2));
    });
  }

  shatter(x: number, y: number, count = 8, spread = 34, color = RUI.red, ms = 460, depth = 10): void {
    const parts = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.2, d: spread * (0.6 + Math.random() * 0.4), s: 2.6 + Math.random() * 2, i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of parts) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e;
        const s = p.s * (1 - t * 0.4);
        g.fillStyle(this.tint(p.i % 3 === 0 ? O.white : color), (1 - t) * 0.9);
        g.fillRect(px - s, py - s, s * 2, s * 2);
        g.lineStyle(0.8, this.tint(O.gold), (1 - t) * 0.8);
        g.strokeRect(px - s, py - s, s * 2, s * 2);
      }
    });
  }

  spikeBurst(x: number, y: number, count = 10, r = 60, ms = 520, depth = 10, seed = 0): void {
    this.anim(depth, ms, (g, t) => {
      const up = t < 0.28 ? easeOut(t / 0.28) : 1 - easeIn((t - 0.28) / 0.72);
      // Inner ring and outer ring of columns, evenly spaced — a colonnade, not a spike field.
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + seed;
        const d = r * (i % 2 === 0 ? 0.85 : 0.5);
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d * 0.62;
        orderSpike(g, this.tint, sx, sy + 6, -Math.PI / 2, (26 + (i % 2) * 10) * up, 6 * up, 1);
      }
    });
  }

  ring(x: number, y: number, r0: number, r1: number, color = RUI.red, ms = 460, depth = 9): void {
    const c = color === RUI.red ? O.gold : color;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      g.lineStyle(3.5 * (1 - t) + 0.8, this.tint(c), (1 - t) * 0.85);
      g.strokeEllipse(x, y, r * 2, r * 1.4);
      g.lineStyle(1.2, this.tint(O.white), (1 - t) * 0.6);
      g.strokeEllipse(x, y, r * 1.68, r * 1.18);
      g.fillStyle(this.tint(O.goldLit), (1 - t) * 0.8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        diamond(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 2.6);
      }
    });
  }

  rustPuff(x: number, y: number, count = 7, spread = 22, ms = 520, depth = 9): void {
    const parts = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU, d: spread * (0.5 + Math.random() * 0.5), s: 1.4 + Math.random() * 1.8, i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of parts) {
        // Marble dust rises and stays square — it settles upward, the opposite of falling rust.
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e * 0.6 - e * 12;
        g.fillStyle(this.tint(p.i % 2 === 0 ? O.white : O.goldLit), (1 - t) * 0.75);
        g.fillRect(px, py, p.s, p.s);
      }
    });
  }

  crack(x: number, y: number, r = 50, ms = 620, depth = 4): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      orderInlay(g, this.tint, x, y, r, seed, 1 - t, Math.min(1, t * 2.4), { runs: 8, squash: 0.65, width: 2.6 });
    });
  }

  lockSnap(x0: number, y0: number, x1: number, y1: number, ms = 520, depth = 11): void {
    this.anim(depth, ms, (g, t) => {
      const reach = Math.min(1, t * 3);
      const alpha = 1 - Math.max(0, (t - 0.55) / 0.45);
      orderChain(g, this.tint, x0, y0, x0 + (x1 - x0) * reach, y0 + (y1 - y0) * reach, alpha, 18 * (1 - reach));
      if (t > 0.28) {
        orderPadlock(g, this.tint, x1, y1 - 34, 13 + (1 - alpha) * 4, alpha, Math.min(1, (t - 0.28) / 0.25), t * 20);
      }
    });
    this.flashIn(x1, y1, 22, O.goldLit, O.white, depth);
  }

  bite(x: number, y: number, size = 26, color = RUI.red, depth = 10): void {
    this.flashIn(x, y, size * 0.55, O.gleam, color, depth);
    this.shatter(x, y, 6, size, color, 420, depth);
  }
}
