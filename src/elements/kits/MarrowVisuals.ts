import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Marrow draws.
 *
 * One material and one silhouette rule. The material is **living tissue** — bone on the outside,
 * hot red marrow in the cavity, and everything the element puts on the field is a *cell*, drawn
 * the way a cell is drawn in a textbook: a membrane, a cytoplasm, and a nucleus you can actually
 * see through it. The rule is that no two defenders share a shape, because five of them can be on
 * the board at once and the bone bar at the top of the screen has to be readable at 14 pixels:
 *
 *   - a **macrophage** is a lopsided amoeba with three pseudopods and a kidney-bean nucleus,
 *   - a **neutrophil** is a tight circle stuffed with granules around a three-lobed nucleus,
 *   - a **T-cell** is almost all nucleus, with a thin rim of cytoplasm and receptor forks on it,
 *   - a **killer T-cell** is the same silhouette gone heavy: dark, spurred, and full of red,
 *   - a **B-cell** wears its antibodies — actual Ys studded all the way round the membrane,
 *   - a **mast cell** is a fat bulb packed edge to edge with granules that heat up on the fuse,
 *   - an **antibody** is the one thing here that is not a cell at all: a bone-white Y.
 *
 * Each also owns a hue, and those hues are the whole HUD: violet macrophage, green neutrophil,
 * cyan T-cell, dark cyan killer, gold B-cell, magenta mast. Red is reserved — it never means a
 * cell, it always means inflammation. The one exception is deliberate and is the tell for it:
 * `redden` drags a whole cell onto the inflammation ramp, which is exactly what the Cell Janitor
 * macrophages and every cell under Autoimmunity are.
 */

export type MarrowColorFn = ColorFn;

/** The six things that can occupy a socket on the bone bar, plus the two that never do. */
export type CellKind = 'macrophage' | 'neutrophil' | 'tcell' | 'killer' | 'bcell' | 'mast';

export const MRW = {
  /** Under everything. */
  ink: 0x14090e,
  deep: 0x2a1219,
  /** The skeleton. */
  bone: 0xf1e7d0,
  boneShade: 0xc3b596,
  boneDeep: 0x8b7d63,
  /** What is inside the bone, and the element's whole identity. */
  marrow: 0xd1435c,
  marrowLit: 0xf5788c,
  marrowDeep: 0x8a2135,
  /** Serum: the pale fluid every cell floats in, and every heal is made of. */
  serum: 0xfbe3e6,
  /** Inflammation. Never used for a cell — red on this element always means the red bar. */
  inflame: 0xff3b3b,
  inflameLit: 0xff8a6b,
  /** Macrophage: violet, slow, enormous. */
  macro: 0x7b6cd9,
  macroLit: 0xa9a0f2,
  macroDark: 0x3f3573,
  /** Neutrophil: green, fast, disposable. */
  neut: 0x2fc79b,
  neutLit: 0x8ef0cd,
  neutDark: 0x156b53,
  /** T-cell: cyan, the only one that helps rather than fights. */
  tcell: 0x46c8f5,
  tcellLit: 0xb2ecff,
  tcellDark: 0x14607f,
  /** Killer T: the same family two shades down, so it reads as a heavier version of the medic. */
  killer: 0x1c7ea8,
  killerLit: 0x7fd2ee,
  killerDark: 0x0b3f56,
  /** B-cell: gold, and the only cell that is not a defender — it is a factory. */
  bcell: 0xe0a33c,
  bcellLit: 0xffd98a,
  bcellDark: 0x7a5312,
  /** Mast cell: magenta, and it is a bomb. */
  mast: 0xf05fa8,
  mastLit: 0xffb3d8,
  mastDark: 0x8a2059,
  /** The neutrophil's death rattle: a web of spiked protein. */
  net: 0xd9e86b,
  netDark: 0x6f7a26,
};

/** The hue each cell answers to, for anything that needs one colour per kind. */
export const CELL_TINT: Record<CellKind, number> = {
  macrophage: MRW.macro,
  neutrophil: MRW.neut,
  tcell: MRW.tcell,
  killer: MRW.killer,
  bcell: MRW.bcell,
  mast: MRW.mast,
};

/** Deterministic 0–1 noise, so a membrane keeps the same lumps between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 47.3 + i * 91.7) * 18733.517;
  return v - Math.floor(v);
}

/** Blend two colours channel-wise. `k` 0 = a, 1 = b. */
export function mix(a: number, b: number, k: number): number {
  const c = Phaser.Math.Clamp(k, 0, 1);
  const ch = (sh: number): number => Math.round((((a >> sh) & 0xff) * (1 - c)) + (((b >> sh) & 0xff) * c));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * A cell dragged onto the inflammation ramp — the Cell Janitor's macrophages, and everything on
 * the board while Autoimmunity is running.
 *
 * It is a *wrapper around the tint function* rather than a set of red constants, so one flag
 * reddens a whole cell without any of the painters below knowing it happened, and a skin still
 * gets the last word on the colour that comes out. Near-black is left alone: shadows and outlines
 * are structure, not hue, and reddening them turns every cell into a smear.
 */
export function redden(tint: MarrowColorFn, k: number): MarrowColorFn {
  if (k <= 0) return tint;
  return (c) => {
    const lum = (((c >> 16) & 0xff) * 0.3 + ((c >> 8) & 0xff) * 0.59 + (c & 0xff) * 0.11) / 255;
    if (lum < 0.14) return tint(c);
    const target = lum < 0.34 ? MRW.marrowDeep : lum < 0.66 ? MRW.inflame : MRW.inflameLit;
    return tint(mix(c, target, k));
  };
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/** A wobbling membrane outline: the shared skeleton of every cell in the kit. */
function membrane(
  x: number, y: number, r: number, n: number, seed: number, t: number, wobble: number,
): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.22 + Math.sin(t * 2.2 + i * 1.7 + seed) * wobble);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  return pts;
}

function scaled(pts: Phaser.Geom.Point[], x: number, y: number, k: number): Phaser.Geom.Point[] {
  return pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * k, y + (p.y - y) * k));
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * An antibody. Not a cell — a bone-white Y with two grabbing pads on the arms and a hinge where
 * they meet the stem, which is exactly the shape every diagram of an immunoglobulin uses. Drawn
 * small and drawn *often*: ten of these can be stuck to one body at a time.
 */
export function antibody(
  g: Phaser.GameObjects.Graphics,
  tint: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  { size = 1, dark = 1, seed = 0, hot = 0 } = {},
): void {
  const s = size;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number): Phaser.Geom.Point => pt(x, y, ca, sa, u, v);

  if (hot > 0) {
    g.fillStyle(shade(tint(MRW.serum), dark), alpha * 0.3 * hot);
    g.fillCircle(x, y, 9 * s);
  }

  // Stem back, arms forward — so a stuck antibody visibly grips whatever it is stuck to.
  const hinge = P(0, 0);
  const tail = P(-6 * s, 0);
  g.lineStyle(2.4 * s, shade(tint(MRW.boneShade), dark), alpha * 0.95);
  g.lineBetween(tail.x, tail.y, hinge.x, hinge.y);

  for (const sd of [-1, 1]) {
    const bend = 0.72 + jitter(seed, sd > 0 ? 1 : 2) * 0.16;
    const arm = P(Math.cos(bend) * 7 * s, sd * Math.sin(bend) * 7 * s);
    g.lineStyle(2.1 * s, shade(tint(MRW.bone), dark), alpha);
    g.lineBetween(hinge.x, hinge.y, arm.x, arm.y);
    // The binding pad on the tip: the business end.
    g.fillStyle(shade(tint(MRW.bone), dark), alpha);
    g.fillCircle(arm.x, arm.y, 1.9 * s);
  }

  g.fillStyle(shade(tint(MRW.marrow), dark), alpha * 0.9);
  g.fillCircle(hinge.x, hinge.y, 1.5 * s);
}

/**
 * A macrophage. The biggest thing in the kit and the slowest, so it is drawn as a lopsided
 * amoeba rather than a circle: three pseudopods reaching out at fixed angles, a kidney-bean
 * nucleus pushed off centre, and vacuoles floating in the cytoplasm — the little bubbles of
 * whatever it ate last. `chew` opens a feeding cup along the facing.
 */
export function macrophage(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  { t = 0, size = 1, dark = 1, seed = 0, chew = 0, hurt = 0, red = 0 } = {},
): void {
  const tint = redden(tint0, red);
  const r = 15 * size;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);

  // Membrane: 11 lumps, with three of them hauled out into pseudopods that creep with time.
  const pts = membrane(x, y, r, 11, seed, t, 0.06);
  for (const i of [1, 5, 8]) {
    const a = (i / 11) * TAU;
    const reach = 1.35 + Math.sin(t * 1.6 + i + seed) * 0.22;
    pts[i] = new Phaser.Geom.Point(x + Math.cos(a) * r * reach, y + Math.sin(a) * r * reach);
  }

  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.5);
  g.fillPoints(scaled(pts, x, y, 1.14), true);
  g.fillStyle(shade(tint(MRW.macroDark), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(MRW.macro), dark), alpha);
  g.fillPoints(scaled(pts, x, y, 0.86), true);
  g.fillStyle(shade(tint(MRW.macroLit), dark), alpha * 0.55);
  g.fillEllipse(x - r * 0.24, y - r * 0.3, r * 0.9, r * 0.6);

  // Vacuoles.
  for (let i = 0; i < 4; i++) {
    const a = jitter(seed, 20 + i) * TAU + t * 0.4;
    const d = r * 0.52 * jitter(seed, 30 + i);
    g.fillStyle(shade(tint(MRW.serum), dark), alpha * 0.4);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.09 + jitter(seed, 40 + i) * 0.08));
  }

  // Kidney-bean nucleus: two overlapping ellipses with a bite out of the inner edge.
  const nx = x - ca * r * 0.18;
  const ny = y - sa * r * 0.18;
  g.fillStyle(shade(tint(MRW.macroDark), dark), alpha);
  g.fillEllipse(nx - r * 0.16, ny, r * 0.68, r * 0.56);
  g.fillEllipse(nx + r * 0.18, ny - r * 0.1, r * 0.56, r * 0.5);
  g.fillStyle(shade(tint(MRW.macro), dark), alpha * 0.85);
  g.fillEllipse(nx + r * 0.12, ny + r * 0.16, r * 0.34, r * 0.28);

  // The feeding cup: two lips opening along the facing while it is biting.
  if (chew > 0.02) {
    const open = chew * 0.85;
    for (const sd of [-1, 1]) {
      const a0 = ang + sd * (0.12 + open * 0.5);
      const lip: Phaser.Geom.Point[] = [
        new Phaser.Geom.Point(x + ca * r * 0.5, y + sa * r * 0.5),
        new Phaser.Geom.Point(x + Math.cos(a0) * r * 1.5, y + Math.sin(a0) * r * 1.5),
        new Phaser.Geom.Point(x + Math.cos(a0 + sd * 0.35) * r * 1.25, y + Math.sin(a0 + sd * 0.35) * r * 1.25),
      ];
      g.fillStyle(shade(tint(MRW.macroLit), dark), alpha * 0.95);
      g.fillPoints(lip, true);
    }
    g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.7 * chew);
    g.fillCircle(x + ca * r * 0.95, y + sa * r * 0.95, r * 0.42 * chew);
  }

  if (hurt > 0) {
    g.fillStyle(shade(tint(MRW.inflame), dark), alpha * hurt * 0.5);
    g.fillCircle(x, y, r * 1.5);
  }
}

/**
 * A neutrophil. Half the macrophage's size and twice its speed, so it is drawn tight and taut:
 * a near-circle streaked along its heading, packed with granules, around the one detail that
 * makes it unmistakably a neutrophil — a nucleus in three separate lobes joined by threads.
 */
export function neutrophil(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  { t = 0, size = 1, dark = 1, seed = 0, dash = 0, hurt = 0, red = 0 } = {},
): void {
  const tint = redden(tint0, red);
  const r = 10 * size;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number): Phaser.Geom.Point => pt(x, y, ca, sa, u, v);

  // A speed smear behind it — the thing is meant to read as quick even standing still.
  if (dash > 0.02) {
    for (let i = 1; i <= 3; i++) {
      const b = P(-r * 0.7 * i, 0);
      g.fillStyle(shade(tint(MRW.neut), dark), alpha * dash * 0.24 / i);
      g.fillCircle(b.x, b.y, r * (1 - i * 0.16));
    }
  }

  const pts = membrane(x, y, r, 9, seed, t, 0.05)
    // Stretched a little along the heading: a cell that is going somewhere.
    .map((p) => {
      const u = (p.x - x) * ca + (p.y - y) * sa;
      const v = -(p.x - x) * sa + (p.y - y) * ca;
      return pt(x, y, ca, sa, u * (1 + dash * 0.22), v * (1 - dash * 0.1));
    });

  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.5);
  g.fillPoints(scaled(pts, x, y, 1.16), true);
  g.fillStyle(shade(tint(MRW.neutDark), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(MRW.neut), dark), alpha);
  g.fillPoints(scaled(pts, x, y, 0.84), true);

  // Granules, packed close. These are the spiky proteins it will dump when it dies.
  for (let i = 0; i < 11; i++) {
    const a = jitter(seed, 50 + i) * TAU;
    const d = r * 0.68 * Math.sqrt(jitter(seed, 60 + i));
    g.fillStyle(shade(tint(MRW.neutLit), dark), alpha * 0.75);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.1);
  }

  // Three lobes on threads. The whole silhouette rests on this.
  const lobes: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 3; i++) {
    const a = ang + Math.PI * 0.62 + (i - 1) * 1.25 + Math.sin(t * 1.4 + i + seed) * 0.16;
    lobes.push(new Phaser.Geom.Point(x + Math.cos(a) * r * 0.36, y + Math.sin(a) * r * 0.36));
  }
  g.lineStyle(Math.max(0.6, r * 0.11), shade(tint(MRW.neutDark), dark), alpha * 0.9);
  g.lineBetween(lobes[0].x, lobes[0].y, lobes[1].x, lobes[1].y);
  g.lineBetween(lobes[1].x, lobes[1].y, lobes[2].x, lobes[2].y);
  for (const l of lobes) {
    g.fillStyle(shade(tint(MRW.neutDark), dark), alpha);
    g.fillCircle(l.x, l.y, r * 0.26);
  }

  if (hurt > 0) {
    g.fillStyle(shade(tint(MRW.inflame), dark), alpha * hurt * 0.5);
    g.fillCircle(x, y, r * 1.6);
  }
}

/**
 * A T-cell. Almost all nucleus — the textbook read on a lymphocyte is "a nucleus wearing a coat
 * two sizes too small" — with receptor forks studded around the rim, and one helping tentacle
 * that reaches out to whoever it is currently propping up. `reach` runs 0→1 as it extends.
 */
export function tcell(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  {
    t = 0, size = 1, dark = 1, seed = 0, reach = 0, hurt = 0, red = 0,
    to = null as { x: number; y: number } | null,
  } = {},
): void {
  const tint = redden(tint0, red);
  const r = 11 * size;

  // The helping tentacle goes down first, so the cell body sits over its root.
  if (reach > 0.02 && to) {
    const ex = x + (to.x - x) * reach;
    const ey = y + (to.y - y) * reach;
    g.lineStyle(2.6 * size, shade(tint(MRW.tcellDark), dark), alpha * 0.8);
    g.lineBetween(x, y, ex, ey);
    g.lineStyle(1.3 * size, shade(tint(MRW.tcellLit), dark), alpha * 0.95);
    g.lineBetween(x, y, ex, ey);
    // A hand of three fingers at the far end.
    const a = Math.atan2(ey - y, ex - x);
    for (let i = -1; i <= 1; i++) {
      g.lineStyle(1.1 * size, shade(tint(MRW.tcellLit), dark), alpha * 0.9);
      g.lineBetween(ex, ey, ex + Math.cos(a + i * 0.55) * 5 * size, ey + Math.sin(a + i * 0.55) * 5 * size);
    }
    g.fillStyle(shade(tint(MRW.serum), dark), alpha * 0.5 * reach);
    g.fillCircle(ex, ey, 4 * size);
  }

  const pts = membrane(x, y, r, 10, seed, t, 0.04);
  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.45);
  g.fillPoints(scaled(pts, x, y, 1.14), true);
  g.fillStyle(shade(tint(MRW.tcellLit), dark), alpha);
  g.fillPoints(pts, true);

  // Receptor forks: tiny Ys around the rim, which is what makes it a *T*-cell and not a blob.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + t * 0.3 + seed;
    const bx = x + Math.cos(a) * r * 0.98;
    const by = y + Math.sin(a) * r * 0.98;
    g.lineStyle(1 * size, shade(tint(MRW.tcell), dark), alpha * 0.9);
    g.lineBetween(bx, by, bx + Math.cos(a) * 2.6 * size, by + Math.sin(a) * 2.6 * size);
    const tipX = bx + Math.cos(a) * 2.6 * size;
    const tipY = by + Math.sin(a) * 2.6 * size;
    g.lineBetween(tipX, tipY, tipX + Math.cos(a + 0.7) * 2 * size, tipY + Math.sin(a + 0.7) * 2 * size);
    g.lineBetween(tipX, tipY, tipX + Math.cos(a - 0.7) * 2 * size, tipY + Math.sin(a - 0.7) * 2 * size);
  }

  // The nucleus, filling nearly the whole cell.
  g.fillStyle(shade(tint(MRW.tcellDark), dark), alpha);
  g.fillCircle(x + Math.cos(ang) * r * 0.06, y + Math.sin(ang) * r * 0.06, r * 0.7);
  g.fillStyle(shade(tint(MRW.tcell), dark), alpha * 0.6);
  g.fillEllipse(x - r * 0.2, y - r * 0.24, r * 0.5, r * 0.34);

  if (hurt > 0) {
    g.fillStyle(shade(tint(MRW.inflame), dark), alpha * hurt * 0.5);
    g.fillCircle(x, y, r * 1.6);
  }
}

/**
 * A killer T-cell (F+). The medic's silhouette with the mercy taken out of it: same round
 * lymphocyte, half again the size, in the dark end of the cyan — and where the T-cell had
 * receptor forks it has four hooked spurs, and where it had a pale nucleus it has a cluster of
 * red granzyme granules showing through the membrane. `strike` swings the two front tentacles out
 * along the facing; `dash` streaks the whole body backward into a lunge trail.
 */
export function killerT(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  { t = 0, size = 1, dark = 1, seed = 0, strike = 0, dash = 0, hurt = 0, red = 0 } = {},
): void {
  const tint = redden(tint0, red);
  const r = 14 * size;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number): Phaser.Geom.Point => pt(x, y, ca, sa, u, v);

  // The lunge trail: three fading copies dragged out behind it.
  if (dash > 0.02) {
    for (let i = 1; i <= 3; i++) {
      const b = P(-r * 0.9 * i, 0);
      g.fillStyle(shade(tint(MRW.killer), dark), alpha * dash * 0.26 / i);
      g.fillCircle(b.x, b.y, r * (1 - i * 0.15));
    }
  }

  // The two striking tentacles, thrown out ahead and barbed at the tip.
  if (strike > 0.02) {
    for (const sd of [-1, 1]) {
      const a = ang + sd * 0.34;
      const len = r * (1.5 + strike * 2.4);
      const ex = x + Math.cos(a) * len;
      const ey = y + Math.sin(a) * len;
      g.lineStyle(3 * size * strike + 0.8, shade(tint(MRW.killerDark), dark), alpha * 0.9);
      g.lineBetween(x, y, ex, ey);
      g.lineStyle(1.5 * size * strike + 0.4, shade(tint(MRW.killerLit), dark), alpha);
      g.lineBetween(x, y, ex, ey);
      for (const b of [-1, 1]) {
        g.lineStyle(1.2 * size, shade(tint(MRW.inflame), dark), alpha * strike);
        g.lineBetween(ex, ey, ex + Math.cos(a + b * 0.8) * 6 * size, ey + Math.sin(a + b * 0.8) * 6 * size);
      }
    }
  }

  const pts = membrane(x, y, r, 10, seed, t, 0.045);
  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.5);
  g.fillPoints(scaled(pts, x, y, 1.16), true);
  g.fillStyle(shade(tint(MRW.killerDark), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(MRW.killer), dark), alpha);
  g.fillPoints(scaled(pts, x, y, 0.84), true);

  // Four hooked spurs, which is what the receptor forks grew into.
  for (let i = 0; i < 4; i++) {
    const a = ang + (i - 1.5) * 1.32 + Math.sin(t * 1.5 + i + seed) * 0.08;
    const bx = x + Math.cos(a) * r * 0.95;
    const by = y + Math.sin(a) * r * 0.95;
    const tx = bx + Math.cos(a) * 4.4 * size;
    const ty = by + Math.sin(a) * 4.4 * size;
    g.lineStyle(1.9 * size, shade(tint(MRW.killerLit), dark), alpha * 0.95);
    g.lineBetween(bx, by, tx, ty);
    g.lineBetween(tx, ty, tx + Math.cos(a + 1.05) * 3.2 * size, ty + Math.sin(a + 1.05) * 3.2 * size);
  }

  // Granzyme: the red it is carrying, visible through the membrane.
  for (let i = 0; i < 6; i++) {
    const a = jitter(seed, 150 + i) * TAU + t * 0.5;
    const d = r * 0.5 * Math.sqrt(jitter(seed, 160 + i));
    g.fillStyle(shade(tint(i % 2 ? MRW.inflame : MRW.marrow), dark), alpha * 0.9);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.14);
  }
  g.fillStyle(shade(tint(MRW.killerDark), dark), alpha * 0.9);
  g.fillCircle(x + ca * r * 0.1, y + sa * r * 0.1, r * 0.42);
  g.fillStyle(shade(tint(MRW.killerLit), dark), alpha * 0.5);
  g.fillEllipse(x - r * 0.22, y - r * 0.26, r * 0.44, r * 0.3);

  if (hurt > 0) {
    g.fillStyle(shade(tint(MRW.inflame), dark), alpha * hurt * 0.5);
    g.fillCircle(x, y, r * 1.6);
  }
}

/**
 * A B-cell (Click+). The one cell in the kit that wears its function: a plump gold body with
 * eight actual antibodies studded round the membrane, stems in and arms out, which is precisely
 * what surface immunoglobulin is. `charge` runs 0→1 as it winds up to launch a pair, brightening
 * the two it is about to throw.
 */
export function bcell(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  { t = 0, size = 1, dark = 1, seed = 0, charge = 0, hurt = 0, red = 0 } = {},
): void {
  const tint = redden(tint0, red);
  const r = 11 * size;

  if (charge > 0.02) {
    g.fillStyle(shade(tint(MRW.bcellLit), dark), alpha * 0.22 * charge);
    g.fillCircle(x, y, r * (1.9 + charge * 0.5));
  }

  const pts = membrane(x, y, r, 12, seed, t, 0.05);
  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.5);
  g.fillPoints(scaled(pts, x, y, 1.16), true);
  g.fillStyle(shade(tint(MRW.bcellDark), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(MRW.bcell), dark), alpha);
  g.fillPoints(scaled(pts, x, y, 0.84), true);
  g.fillStyle(shade(tint(MRW.bcellLit), dark), alpha * 0.5);
  g.fillEllipse(x - r * 0.26, y - r * 0.3, r * 0.6, r * 0.4);

  // Surface immunoglobulin: eight real antibodies, arms outward, riding the membrane.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.5 + seed;
    const lit = charge > 0.02 && i % 4 === 0;
    antibody(g, tint, x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02, a,
      alpha * (lit ? 1 : 0.85), { size: 0.5 * size, dark, seed: seed + i, hot: lit ? charge : 0 });
  }

  // The nucleus, pushed away from the facing so the cell has a front.
  g.fillStyle(shade(tint(MRW.bcellDark), dark), alpha);
  g.fillCircle(x - Math.cos(ang) * r * 0.2, y - Math.sin(ang) * r * 0.2, r * 0.52);
  g.fillStyle(shade(tint(MRW.serum), dark), alpha * 0.35);
  g.fillCircle(x - Math.cos(ang) * r * 0.28, y - Math.sin(ang) * r * 0.3, r * 0.2);

  if (hurt > 0) {
    g.fillStyle(shade(tint(MRW.inflame), dark), alpha * hurt * 0.55);
    g.fillCircle(x, y, r * 1.6);
  }
}

/**
 * One cytokine pellet (R+). Small on purpose — seven of them go out at once and they have to
 * read as a *spray* rather than as seven bullets: a pale core, four short spines, and a stubby
 * green streak trailing the direction of travel.
 */
export function cytokine(
  g: Phaser.GameObjects.Graphics,
  tint: MarrowColorFn,
  x: number, y: number, ang: number, alpha: number,
  { size = 1, dark = 1, seed = 0, t = 0 } = {},
): void {
  const r = 3.4 * size;
  const back = pt(x, y, Math.cos(ang), Math.sin(ang), -r * 2.6, 0);
  g.lineStyle(1.6 * size, shade(tint(MRW.neutDark), dark), alpha * 0.55);
  g.lineBetween(back.x, back.y, x, y);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + t * 6 + seed;
    g.lineStyle(1.1 * size, shade(tint(MRW.neut), dark), alpha * 0.9);
    g.lineBetween(x, y, x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9);
  }
  g.fillStyle(shade(tint(MRW.neut), dark), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(shade(tint(MRW.neutLit), dark), alpha);
  g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.5);
}

/**
 * A mast cell. A fat bulb packed edge to edge with granules, and the granules are the timer:
 * they start magenta and heat toward the inflammation red as the fuse runs down, while the whole
 * cell swells and starts to shake. `fuse` runs 1 (just summoned) → 0 (about to go).
 */
export function mastCell(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  x: number, y: number, alpha: number,
  { t = 0, size = 1, dark = 1, seed = 0, fuse = 1, hurt = 0, red = 0 } = {},
): void {
  const tint = redden(tint0, red);
  const heat = 1 - Phaser.Math.Clamp(fuse, 0, 1);
  const shake = heat * heat * 2.2;
  const cx = x + Math.sin(t * 34 + seed) * shake;
  const cy = y + Math.cos(t * 41 + seed) * shake;
  const r = 13 * size * (1 + heat * 0.22);

  g.fillStyle(shade(tint(MRW.inflame), dark), alpha * 0.18 * heat);
  g.fillCircle(cx, cy, r * 2);

  const pts = membrane(cx, cy, r, 12, seed, t, 0.035);
  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.45);
  g.fillPoints(scaled(pts, cx, cy, 1.12), true);
  g.fillStyle(shade(tint(MRW.mastDark), dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(shade(tint(MRW.mast), dark), alpha);
  g.fillPoints(scaled(pts, cx, cy, 0.88), true);

  // Granules — 18 of them, and there is barely room. Each one is a fifth of the payload.
  for (let i = 0; i < 18; i++) {
    const a = jitter(seed, 70 + i) * TAU;
    const d = r * 0.74 * Math.sqrt(jitter(seed, 90 + i));
    const lit = jitter(seed, 110 + i) < heat;
    g.fillStyle(shade(tint(lit ? MRW.inflame : MRW.mastLit), dark), alpha * (lit ? 0.95 : 0.7));
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.11 + jitter(seed, 130 + i) * 0.05));
  }

  g.fillStyle(shade(tint(MRW.mastLit), dark), alpha * 0.4);
  g.fillEllipse(cx - r * 0.28, cy - r * 0.32, r * 0.6, r * 0.36);

  if (hurt > 0) {
    g.fillStyle(shade(tint(MRW.serum), dark), alpha * hurt * 0.55);
    g.fillCircle(cx, cy, r * 1.4);
  }
}

/**
 * One dendritic tentacle, whipped out from the caster toward the cursor. Tapers along its length
 * and frays into branching dendrites at the tip, so five of them together read as a hand of
 * feelers rather than five spears. `grip` runs 0→1 over the strike.
 */
export function dendrite(
  g: Phaser.GameObjects.Graphics,
  tint: MarrowColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number,
  { seed = 0, grip = 1, dark = 1, hit = false } = {},
): void {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const len = Phaser.Math.Distance.Between(x0, y0, x1, y1);
  const bow = (jitter(seed, 1) - 0.5) * len * 0.22;
  const nx = Math.cos(a + Math.PI / 2);
  const ny = Math.sin(a + Math.PI / 2);

  // Three tapering segments along a bowed spine.
  let px = x0;
  let py = y0;
  for (let i = 1; i <= 3; i++) {
    const k = i / 3;
    const bend = Math.sin(k * Math.PI) * bow;
    const qx = x0 + (x1 - x0) * k + nx * bend;
    const qy = y0 + (y1 - y0) * k + ny * bend;
    g.lineStyle((5.4 - i * 1.3) * grip, shade(tint(i < 3 ? MRW.marrowDeep : MRW.marrow), dark), alpha);
    g.lineBetween(px, py, qx, qy);
    px = qx; py = qy;
  }

  // Dendrites: the tip frays into four forks, each of which forks again.
  for (let i = 0; i < 4; i++) {
    const fa = a + (i - 1.5) * 0.42 + (jitter(seed, 10 + i) - 0.5) * 0.3;
    const fl = 9 + jitter(seed, 20 + i) * 7;
    const ex = px + Math.cos(fa) * fl * grip;
    const ey = py + Math.sin(fa) * fl * grip;
    g.lineStyle(1.7 * grip, shade(tint(MRW.marrowLit), dark), alpha * 0.95);
    g.lineBetween(px, py, ex, ey);
    for (const sd of [-1, 1]) {
      g.lineStyle(1 * grip, shade(tint(MRW.marrowLit), dark), alpha * 0.8);
      g.lineBetween(ex, ey, ex + Math.cos(fa + sd * 0.6) * fl * 0.5, ey + Math.sin(fa + sd * 0.6) * fl * 0.5);
    }
  }

  if (hit) {
    g.fillStyle(shade(tint(MRW.serum), dark), alpha * 0.5);
    g.fillCircle(px, py, 7);
  }
}

/**
 * A NET — the web of spiked protein a dying neutrophil throws out. Chords strung between random
 * points on the rim, barbed along their length, over a faint haze so the affected ground is
 * obvious even where no strand happens to cross it.
 */
export function netWeb(
  g: Phaser.GameObjects.Graphics,
  tint: MarrowColorFn,
  x: number, y: number, r: number, alpha: number,
  { t = 0, seed = 0, dark = 1 } = {},
): void {
  g.fillStyle(shade(tint(MRW.netDark), dark), alpha * 0.16);
  g.fillCircle(x, y, r);
  g.lineStyle(1.5, shade(tint(MRW.net), dark), alpha * 0.5);
  g.strokeCircle(x, y, r);

  const rim = (i: number): Phaser.Geom.Point => {
    const a = jitter(seed, i) * TAU + Math.sin(t * 0.6 + i) * 0.05;
    return new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r);
  };

  for (let i = 0; i < 11; i++) {
    const p0 = rim(i * 2);
    const p1 = rim(i * 2 + 1);
    g.lineStyle(1.3, shade(tint(MRW.net), dark), alpha * (0.5 + 0.3 * Math.sin(t * 3 + i)));
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    // Barbs: short ticks perpendicular to the strand. This is why standing in it hurts.
    const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const n = 4;
    for (let k = 1; k <= n; k++) {
      const bx = p0.x + (p1.x - p0.x) * (k / (n + 1));
      const by = p0.y + (p1.y - p0.y) * (k / (n + 1));
      const sd = k % 2 ? 1 : -1;
      g.lineStyle(1, shade(tint(MRW.net), dark), alpha * 0.7);
      g.lineBetween(bx, by, bx + Math.cos(a + sd * 1.4) * 4, by + Math.sin(a + sd * 1.4) * 4);
    }
  }
}

/**
 * A length of bone: a shaft with two knuckles at each end. The HUD's five sockets are cut into
 * one of these, and the avatar's ribs and pauldrons are made of them.
 */
export function boneShaft(
  g: Phaser.GameObjects.Graphics,
  tint: MarrowColorFn,
  x: number, y: number, w: number, h: number, alpha: number,
  { dark = 1 } = {},
): void {
  const k = h * 0.62;
  g.fillStyle(shade(tint(MRW.ink), dark), alpha * 0.55);
  g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, h * 0.5);
  g.fillStyle(shade(tint(MRW.boneDeep), dark), alpha);
  for (const ex of [x, x + w]) {
    g.fillCircle(ex, y - h * 0.1, k);
    g.fillCircle(ex, y + h * 1.1, k);
  }
  g.fillRoundedRect(x, y, w, h, h * 0.42);
  g.fillStyle(shade(tint(MRW.bone), dark), alpha);
  for (const ex of [x, x + w]) {
    g.fillCircle(ex, y - h * 0.1, k * 0.82);
    g.fillCircle(ex, y + h * 1.1, k * 0.82);
  }
  g.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, h * 0.4);
  // The lit face along the top of the shaft.
  g.fillStyle(shade(tint(MRW.serum), dark), alpha * 0.4);
  g.fillRoundedRect(x + 3, y + 2, w - 6, h * 0.3, h * 0.15);
}

/**
 * A cell drawn small enough to sit in a bone socket or a status box. Deliberately not the same
 * code path as the full cell — at 7px across the nucleus lobes and receptor forks turn to mud,
 * so each kind keeps only the one feature that identifies it.
 */
export function cellGlyph(
  g: Phaser.GameObjects.Graphics,
  tint0: MarrowColorFn,
  kind: CellKind,
  x: number, y: number, r: number, alpha: number,
  { t = 0, dark = 1, red = 0 } = {},
): void {
  const tint = redden(tint0, red);
  const pulse = 1 + Math.sin(t * 3 + r) * 0.04;
  const R = r * pulse;
  switch (kind) {
    case 'macrophage': {
      // Three pseudopods, and they are the whole read.
      g.fillStyle(shade(tint(MRW.macroDark), dark), alpha);
      for (let i = 0; i < 3; i++) {
        const a = t * 0.7 + (i / 3) * TAU;
        g.fillCircle(x + Math.cos(a) * R * 0.85, y + Math.sin(a) * R * 0.85, R * 0.42);
      }
      g.fillCircle(x, y, R);
      g.fillStyle(shade(tint(MRW.macro), dark), alpha);
      g.fillCircle(x, y, R * 0.82);
      g.fillStyle(shade(tint(MRW.macroDark), dark), alpha);
      g.fillEllipse(x - R * 0.1, y, R * 0.72, R * 0.56);
      break;
    }
    case 'neutrophil': {
      g.fillStyle(shade(tint(MRW.neutDark), dark), alpha);
      g.fillCircle(x, y, R);
      g.fillStyle(shade(tint(MRW.neut), dark), alpha);
      g.fillCircle(x, y, R * 0.84);
      // Three lobes.
      for (let i = 0; i < 3; i++) {
        const a = t * 1.1 + (i / 3) * TAU;
        g.fillStyle(shade(tint(MRW.neutDark), dark), alpha);
        g.fillCircle(x + Math.cos(a) * R * 0.36, y + Math.sin(a) * R * 0.36, R * 0.28);
      }
      break;
    }
    case 'tcell': {
      g.fillStyle(shade(tint(MRW.tcellLit), dark), alpha);
      g.fillCircle(x, y, R);
      g.fillStyle(shade(tint(MRW.tcellDark), dark), alpha);
      g.fillCircle(x, y, R * 0.7);
      // Four receptor stubs.
      for (let i = 0; i < 4; i++) {
        const a = t * 0.5 + (i / 4) * TAU;
        g.lineStyle(Math.max(0.8, R * 0.14), shade(tint(MRW.tcell), dark), alpha);
        g.lineBetween(x + Math.cos(a) * R, y + Math.sin(a) * R,
          x + Math.cos(a) * R * 1.4, y + Math.sin(a) * R * 1.4);
      }
      break;
    }
    case 'killer': {
      // The T-cell's disc gone dark, with the granzyme showing and two forward spurs.
      g.fillStyle(shade(tint(MRW.killerDark), dark), alpha);
      g.fillCircle(x, y, R * 1.06);
      g.fillStyle(shade(tint(MRW.killer), dark), alpha);
      g.fillCircle(x, y, R * 0.86);
      for (let i = 0; i < 3; i++) {
        const a = t * 0.6 + (i / 3) * TAU;
        g.fillStyle(shade(tint(MRW.inflame), dark), alpha);
        g.fillCircle(x + Math.cos(a) * R * 0.36, y + Math.sin(a) * R * 0.36, R * 0.2);
      }
      for (const sd of [-1, 1]) {
        const a = sd * 0.5;
        g.lineStyle(Math.max(0.9, R * 0.16), shade(tint(MRW.killerLit), dark), alpha);
        g.lineBetween(x + Math.cos(a) * R, y + Math.sin(a) * R,
          x + Math.cos(a) * R * 1.55, y + Math.sin(a) * R * 1.55);
      }
      break;
    }
    case 'bcell': {
      g.fillStyle(shade(tint(MRW.bcellDark), dark), alpha);
      g.fillCircle(x, y, R);
      g.fillStyle(shade(tint(MRW.bcell), dark), alpha);
      g.fillCircle(x, y, R * 0.84);
      // Four surface Ys, cut down to the stem-and-arms that survive at this size.
      for (let i = 0; i < 4; i++) {
        const a = t * 0.5 + (i / 4) * TAU;
        const bx = x + Math.cos(a) * R * 0.9;
        const by = y + Math.sin(a) * R * 0.9;
        const tx = bx + Math.cos(a) * R * 0.5;
        const ty = by + Math.sin(a) * R * 0.5;
        g.lineStyle(Math.max(0.8, R * 0.13), shade(tint(MRW.bone), dark), alpha);
        g.lineBetween(bx, by, tx, ty);
        g.lineBetween(tx, ty, tx + Math.cos(a + 0.8) * R * 0.34, ty + Math.sin(a + 0.8) * R * 0.34);
        g.lineBetween(tx, ty, tx + Math.cos(a - 0.8) * R * 0.34, ty + Math.sin(a - 0.8) * R * 0.34);
      }
      break;
    }
    default: {
      g.fillStyle(shade(tint(MRW.mastDark), dark), alpha);
      g.fillCircle(x, y, R);
      g.fillStyle(shade(tint(MRW.mast), dark), alpha);
      g.fillCircle(x, y, R * 0.84);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t;
        g.fillStyle(shade(tint(MRW.mastLit), dark), alpha * 0.9);
        g.fillCircle(x + Math.cos(a) * R * 0.45, y + Math.sin(a) * R * 0.45, R * 0.17);
      }
      break;
    }
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class MarrowFx extends FxBase {
  /** Serum: pale droplets drifting up. Every heal in the kit is made of these. */
  serum(x: number, y: number, count = 6, spread = 22, ms = 620, depth = 10, dark = 1): void {
    const seeds = Array.from({ length: count }, () => ({
      a: -Math.PI * 0.75 + Math.random() * Math.PI * 0.5,
      d: spread * (0.4 + Math.random()),
      s: 1.6 + Math.random() * 2.2,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        g.fillStyle(shade(this.tint(MRW.serum), dark), (1 - t) * 0.85);
        g.fillCircle(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e - e * 14, p.s * (1 - t * 0.4));
      }
    });
  }

  /** A bite: two jaw arcs closing on the point, plus a spray. */
  bite(x: number, y: number, ang: number, r = 22, ms = 300, depth = 11, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const close = easeOut(t);
      for (const sd of [-1, 1]) {
        g.lineStyle(3.4 * (1 - t) + 1, shade(this.tint(MRW.macroLit), dark), (1 - t) * 0.95);
        g.beginPath();
        g.arc(x, y, r * (1 - close * 0.45),
          ang + sd * (0.9 - close * 0.75), ang + sd * (0.2 - close * 0.15), sd < 0);
        g.strokePath();
      }
    });
    this.spray(x, y, MRW.marrow, 5, 18, ms + 120, depth, dark);
  }

  /** Cytoplasm and blood thrown off an impact. */
  spray(x: number, y: number, color = MRW.marrow, count = 6, spread = 22, ms = 480, depth = 9, dark = 1): void {
    const seeds = Array.from({ length: count }, () => ({
      a: Math.random() * TAU,
      d: spread * (0.4 + Math.random()),
      s: 1.5 + Math.random() * 2.2,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        g.fillStyle(shade(this.tint(color), dark), (1 - t) * 0.9);
        g.fillEllipse(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e + easeIn(t) * 14,
          p.s, p.s * 1.5);
      }
    });
  }

  /** A cell coming apart: the membrane tears into arcs and the granules scatter. */
  lyse(x: number, y: number, color: number, r = 16, ms = 460, depth = 10, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.5, MRW.serum, color, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + jitter(seed, i);
        const d = r * (0.6 + jitter(seed, 20 + i)) * e;
        g.lineStyle(2.6 * (1 - t) + 0.6, shade(this.tint(color), dark), (1 - t) * 0.9);
        g.beginPath();
        g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.3 * (1 - t * 0.5), a - 1, a + 1, false);
        g.strokePath();
      }
    });
  }

  /** The mast cell going off: a hoop of granules thrown out and a wall of heat. */
  degranulate(x: number, y: number, r = 110, ms = 620, depth = 11, dark = 1): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.3, MRW.serum, MRW.mastLit, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(8 * (1 - t) + 1, shade(this.tint(MRW.mast), dark), (1 - t) * 0.75);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(3 * (1 - t) + 1, shade(this.tint(MRW.inflame), dark), (1 - t) * 0.6);
      g.strokeCircle(x, y, r * e * 0.78);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU + jitter(seed, i) * 0.4;
        const d = r * e * (0.7 + jitter(seed, 30 + i) * 0.4);
        g.fillStyle(shade(this.tint(i % 3 === 0 ? MRW.inflame : MRW.mastLit), dark), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3.4 * (1 - t) + 0.8);
      }
    });
  }

  /** Heat coming off an inflamed body: rising red shimmer. */
  inflame(x: number, y: number, r = 30, ms = 560, depth = 4, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * jitter(seed, 20 + i);
        g.fillStyle(shade(this.tint(i % 2 ? MRW.inflame : MRW.inflameLit), dark), (1 - t) * 0.4);
        g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 22,
          6 * (1 - t) + 2, 9 * (1 - t) + 2);
      }
    });
  }

  /** An antibody locking on: a bone-white ring snapping tight. */
  latch(x: number, y: number, ms = 340, depth = 12, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.6 * (1 - t) + 0.6, shade(this.tint(MRW.bone), dark), (1 - t) * 0.9);
      g.strokeCircle(x, y, 20 * (1 - e) + 5);
    });
  }

  /** The cytokine shotgun leaving a neutrophil: a short green cone of exhaust. */
  cytoBlast(x: number, y: number, ang: number, ms = 320, depth = 10, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const sd of [-1, 1]) {
        g.lineStyle(3.2 * (1 - t) + 0.8, shade(this.tint(MRW.neutLit), dark), (1 - t) * 0.85);
        g.beginPath();
        g.arc(x, y, 16 + e * 26, ang + sd * 0.1, ang + sd * 0.42, sd < 0);
        g.strokePath();
      }
      g.fillStyle(shade(this.tint(MRW.neut), dark), (1 - t) * 0.5);
      g.fillCircle(x + Math.cos(ang) * e * 12, y + Math.sin(ang) * e * 12, 6 * (1 - t) + 1);
    });
  }

  /** A killer T lunging: the line it went through, drawn as a spur-tipped rip. */
  lunge(x0: number, y0: number, x1: number, y1: number, ms = 340, depth = 11, dark = 1): void {
    const a = Math.atan2(y1 - y0, x1 - x0);
    this.anim(depth, ms, (g, t) => {
      g.lineStyle(7 * (1 - t) + 1, shade(this.tint(MRW.killerDark), dark), (1 - t) * 0.55);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(2.6 * (1 - t) + 0.6, shade(this.tint(MRW.killerLit), dark), (1 - t) * 0.9);
      g.lineBetween(x0, y0, x1, y1);
      for (const sd of [-1, 1]) {
        g.lineStyle(1.6 * (1 - t) + 0.4, shade(this.tint(MRW.inflame), dark), (1 - t) * 0.8);
        g.lineBetween(x1, y1, x1 + Math.cos(a + sd * 0.7) * 14 * (1 - t), y1 + Math.sin(a + sd * 0.7) * 14 * (1 - t));
      }
    });
  }

  /** A NET snapping open across the floor. */
  netSnap(x: number, y: number, r: number, ms = 520, depth = 5, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      netWeb(g, this.tint, x, y, r * e, (1 - t) * 0.9, { t: t * 3, seed, dark });
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const MARROW_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: MRW.marrowDeep, alpha: 0.34 },
    { r: 7.4, color: MRW.marrow, alpha: 0.9 },
    { r: 2.8, color: MRW.serum, alpha: 0.95, ox: -1.8, oy: -2 },
  ],
  eyeWhite: MRW.bone,
  eyePupil: MRW.deep,
  squash: { div: 13, x: 0.5, y: 0.3 },
};

/**
 * The host.
 *
 * The whole character is one idea: the ribcage is *open*. Four rib pairs are hinged out from a
 * cracked sternum and the marrow cavity behind them is lit, and that is where every cell in the
 * kit comes from — you can see them budding off the edge of the opening before they leave.
 *
 * `setInflammation` is the tell that matters. It is the red bar made visible on the body: the
 * cavity goes from a dull ember to a furnace, heat haze lifts off the shoulders, and at the top
 * end the ribs themselves start to glow through. Anyone fighting Marrow should be able to read
 * how inflamed the host is without looking at the HUD.
 */
export class MarrowAvatar extends BaseAvatar {
  /** 0–1 of the inflammation bar. Lerped so a spike does not pop. */
  private inflam = 0;
  private inflamTarget = 0;
  /** How much of the summon cap is filled, 0–1 — drives the cells budding round the cavity. */
  private brood = 0;
  private broodTarget = 0;
  private flare = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: MarrowColorFn, depth = 6) {
    super(scene, tint, depth, MARROW_AVATAR);
  }

  /** Inflammation as a 0–1 fraction of the 100-point bar. */
  setInflammation(v: number): void { this.inflamTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Occupied summon slots as a 0–1 fraction of the cap. */
  setBrood(v: number): void { this.broodTarget = Phaser.Math.Clamp(v, 0, 1); }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 360);
    this.inflam += (this.inflamTarget - this.inflam) * Math.min(1, delta / 300);
    this.brood += (this.broodTarget - this.brood) * Math.min(1, delta / 420);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 16 : 13);
      glow.setAlpha(on ? 0.58 : 0.34);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new MarrowFx(this.scene, this.tint).serum(x, y, 2, 8, 340, 4);
  }

  /** A pool of feverish light, hotter the more inflamed the host is. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(MRW.marrowDeep), a * 0.42);
    g.fillEllipse(x, y + 16, 44 + this.inflam * 26, 15);
    g.fillStyle(this.tint(MRW.inflame), a * (0.1 + this.inflam * 0.4));
    g.fillEllipse(x, y + 16, 24 + this.inflam * 24, 9);
  }

  /**
   * The open ribcage: four rib pairs hinged out from a split sternum, with the marrow cavity
   * burning behind them. The cavity is drawn before the ribs so the ribs read as being in front
   * of the light rather than painted on top of it.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const breathe = Math.sin(this.t * 2.4) * 0.7;
    const heat = this.inflam;

    // ── The cavity ──
    g.fillStyle(this.tint(MRW.deep), alpha * 0.95);
    g.fillEllipse(x, y - 2, 17, 22);
    g.fillStyle(this.tint(MRW.marrowDeep), alpha * (0.7 + heat * 0.3));
    g.fillEllipse(x, y - 1, 13 + breathe, 18 + breathe);
    g.fillStyle(this.tint(heat > 0.5 ? MRW.inflame : MRW.marrow), alpha * (0.5 + heat * 0.5));
    g.fillEllipse(x, y - 1, 8 + breathe + heat * 3, 13 + breathe + heat * 3);
    g.fillStyle(this.tint(MRW.serum), alpha * (0.25 + heat * 0.5) * (0.7 + 0.3 * Math.sin(this.t * 7)));
    g.fillEllipse(x - 1, y - 4, 4 + heat * 3, 6 + heat * 3);

    // ── The ribs ──
    // Hinged out from the sternum, opening a little wider with inflammation.
    for (let i = 0; i < 4; i++) {
      const k = i / 3;
      const ry = y - 10 + i * 6;
      const span = (9 + i * 1.6) * (1 + heat * 0.16);
      const hinge = 0.34 + heat * 0.3 + Math.sin(this.t * 2.4 + i) * 0.04;
      for (const sd of [-1, 1]) {
        g.lineStyle(2.6 - k * 0.5, this.tint(MRW.boneDeep), alpha * 0.9);
        g.beginPath();
        g.moveTo(x + sd * 2, ry);
        g.lineTo(x + sd * (span * 0.7), ry + hinge * 5);
        g.lineTo(x + sd * span, ry + hinge * 12);
        g.strokePath();
        g.lineStyle(1.5 - k * 0.3, this.tint(MRW.bone), alpha);
        g.beginPath();
        g.moveTo(x + sd * 2, ry - 0.4);
        g.lineTo(x + sd * (span * 0.7), ry + hinge * 5 - 0.4);
        g.lineTo(x + sd * span, ry + hinge * 12 - 0.4);
        g.strokePath();
      }
    }

    // Split sternum: two plates pulled apart down the middle.
    for (const sd of [-1, 1]) {
      g.fillStyle(this.tint(MRW.bone), alpha * 0.95);
      g.fillPoints([
        new Phaser.Geom.Point(x + sd * 1.6, y - 13),
        new Phaser.Geom.Point(x + sd * 4.4, y - 11),
        new Phaser.Geom.Point(x + sd * 3.6, y + 9),
        new Phaser.Geom.Point(x + sd * 1.2, y + 8),
      ], true);
    }

    // Pelvis bar, so the torso has a bottom edge.
    g.lineStyle(2.4, this.tint(MRW.boneShade), alpha * 0.85);
    g.lineBetween(x - 8, y + 11, x + 8, y + 11);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;
    const heat = this.inflam;

    // ── Clavicle pauldrons ──
    // Two short bones laid across the shoulders. They are the only hard silhouette the
    // character has, and they keep the open chest from reading as a hole in a blob.
    for (const sd of [-1, 1]) {
      const px = x + sd * 12;
      const py = y - 12;
      g.fillStyle(this.tint(MRW.boneDeep), alpha * 0.95);
      g.fillEllipse(px, py, 12, 6);
      g.fillStyle(this.tint(MRW.bone), alpha);
      g.fillEllipse(px - sd * 0.6, py - 0.8, 10, 4.4);
      g.fillStyle(this.tint(MRW.boneShade), alpha * 0.9);
      g.fillCircle(px + sd * 5, py, 2.6);
    }

    // ── Fever haze ──
    // Rising red wisps off the shoulders, entirely driven by the inflammation bar.
    if (heat > 0.03) {
      for (let i = 0; i < 6; i++) {
        const ph = (this.t * 0.9 + i / 6) % 1;
        const px = x + (jitter(this.seed, 200 + i) - 0.5) * 26;
        const py = y - 6 - ph * (18 + heat * 20);
        g.fillStyle(this.tint(i % 2 ? MRW.inflame : MRW.inflameLit), alpha * heat * (1 - ph) * 0.5);
        g.fillEllipse(px, py, 3.4 + heat * 2, 6 + heat * 4);
      }
    }

    // ── The brood ──
    // Cells budding off the lip of the cavity, one visible per occupied slot. They orbit slowly
    // and they are the same glyphs the bone bar uses, so the two read as the same information.
    const buds = Math.round(this.brood * 5);
    for (let i = 0; i < buds; i++) {
      const ang = this.t * 0.8 + (i / Math.max(1, buds)) * TAU;
      const rx = x + Math.cos(ang) * 21;
      const ry = y - 2 + Math.sin(ang) * 12;
      const kinds: CellKind[] = ['macrophage', 'neutrophil', 'tcell'];
      cellGlyph(g, this.tint, kinds[i % 3], rx, ry, 3.4, alpha * 0.85, { t: this.t + i });
    }

    // ── Vertebral crest ──
    // A short stack of vertebrae over the crown, brightening with the flare of a cast.
    for (let i = 0; i < 3; i++) {
      const vy = crown - i * 5 + Math.sin(this.t * 2 + i) * 0.6;
      g.fillStyle(this.tint(MRW.boneDeep), alpha * (0.85 + this.flare * 0.15));
      g.fillEllipse(x, vy, 9 - i * 1.6, 4 - i * 0.5);
      g.fillStyle(this.tint(MRW.bone), alpha);
      g.fillEllipse(x, vy - 0.5, 7 - i * 1.4, 2.6 - i * 0.3);
      // The spinous process out the back.
      g.lineStyle(1.4, this.tint(MRW.boneShade), alpha * 0.9);
      g.lineBetween(x, vy, x - 5 - i, vy - 3 - i);
    }

    // Mastered: the marrow itself crowns them — a burning bead over the vertebrae.
    if (this.mastered) {
      const my = crown - 16;
      g.fillStyle(this.tint(MRW.marrowDeep), alpha * 0.6);
      g.fillCircle(x, my, 7 + Math.sin(this.t * 4) * 0.8);
      g.fillStyle(this.tint(MRW.marrow), alpha * 0.95);
      g.fillCircle(x, my, 4.4);
      g.fillStyle(this.tint(MRW.serum), alpha);
      g.fillCircle(x - 1.2, my - 1.4, 1.7);
    }
  }
}
