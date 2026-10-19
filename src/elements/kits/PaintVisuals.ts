import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Everything Paint draws.
 *
 * Paint is the element whose output is *what the player painted*, so the one thing this file has
 * to get right is that a stroke reads as wet paint rather than as a laser: a body in the colour,
 * a darker lip along one edge where it pooled, a glossy highlight along the other, and the odd
 * drip and fleck. Every stroke carries a seed so a line that sits on the floor for thirty
 * seconds is drawn the same on every frame instead of boiling.
 *
 * The palette carries the whole element's language: black is the plain brush (Splotch and the
 * canvases), orange is the fuse, the congealed ochre is the wall, and red / blue / green mean
 * the same thing on every ability that unlocks them — hurt, haste, heal. White and black are
 * Yin-Yang's and appear nowhere else.
 */

export type PaintColorFn = ColorFn;

export const PNT = {
  /** The plain brush — canvases, Splotch, Yin-Yang's black. */
  black: 0x1f1c26,
  blackLit: 0x4a4458,
  /** E — the fuse. */
  orange: 0xff8a1f,
  orangeDeep: 0xa34a05,
  /** R — the wall. Thick, dull, a little crusted. */
  congeal: 0xb08a5a,
  congealDeep: 0x5e4528,
  /** The three primaries. */
  red: 0xe8333a,
  redDeep: 0x7d0f16,
  blue: 0x2f7bff,
  blueDeep: 0x123d8c,
  green: 0x34c759,
  greenDeep: 0x13662a,
  /** Yin-Yang's light. */
  white: 0xfaf8f0,
  whiteDeep: 0xb9b4a6,
  /** Canvas, easel and the HUD. */
  canvas: 0xf3ead6,
  canvasDeep: 0xd9ccae,
  wood: 0x7a4f2c,
  woodLit: 0xa8743f,
  woodDark: 0x3c2614,
  gloss: 0xffffff,
  spark: 0xfff6d8,
  /** The element colour. */
  rose: 0xe0457b,
};

/** Every paint a dab can be. */
export type PaintKind = 'black' | 'orange' | 'congeal' | 'red' | 'blue' | 'green' | 'white';

export const PAINT_TONE: Record<PaintKind, number> = {
  black: PNT.black,
  orange: PNT.orange,
  congeal: PNT.congeal,
  red: PNT.red,
  blue: PNT.blue,
  green: PNT.green,
  white: PNT.white,
};

const DEEP: Record<PaintKind, number> = {
  black: 0x0a090d,
  orange: PNT.orangeDeep,
  congeal: PNT.congealDeep,
  red: PNT.redDeep,
  blue: PNT.blueDeep,
  green: PNT.greenDeep,
  white: PNT.whiteDeep,
};

/** The darker lip of a paint, for anything that only has the colour to go on. */
export function deepOf(kind: PaintKind): number { return DEEP[kind]; }

// ── Primitives ────────────────────────────────────────────────────────────

/** Deterministic 0–1 noise, so a seeded stroke looks identical every frame. */
export function speck(seed: number, i: number): number {
  const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** The rim colour a paint sits on — black gets a pale one so it reads on a dark floor. */
function rimOf(kind: PaintKind): number {
  return kind === 'black' ? PNT.canvas : DEEP[kind];
}

/** Rim thickness each side, px. */
function rimW(kind: PaintKind): number {
  return kind === 'black' ? 2.5 : 1.5;
}

/** One segment of a stroke on a layer, or a lone blob (`linked: false`). `w` is the brush width. */
export interface PaintSeg {
  x: number; y: number; px: number; py: number; linked: boolean; w: number; kind: PaintKind;
}

/**
 * A whole layer of paint, drawn the way paint actually lies: every stroke of one colour is laid
 * as a single flat, opaque coat — first a slightly darker rim for all of them, then the body for
 * all of them — so strokes of the same colour merge seamlessly and paint laid over paint looks
 * exactly like paint, not like a pile of tubes. Colours are laid in the order they were last
 * used, so the newest colour sits on top.
 */
export function paintLayer(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  segs: PaintSeg[],
  alpha = 1,
): void {
  if (!segs.length) return;
  const order: PaintKind[] = [];
  for (const sg of segs) {
    const i = order.indexOf(sg.kind);
    if (i >= 0) order.splice(i, 1);
    order.push(sg.kind);
  }
  for (const kind of order) {
    for (let pass = 0; pass < 2; pass++) {
      const col = tint(pass === 0 ? rimOf(kind) : PAINT_TONE[kind]);
      const grow = pass === 0 ? rimW(kind) * 2 : 0;
      g.fillStyle(col, alpha);
      for (const sg of segs) {
        if (sg.kind !== kind) continue;
        const w = sg.w + grow;
        if (sg.linked) {
          g.lineStyle(w, col, alpha);
          g.lineBetween(sg.px, sg.py, sg.x, sg.y);
          g.fillCircle(sg.px, sg.py, w / 2);
        }
        g.fillCircle(sg.x, sg.y, w / 2);
      }
    }
  }
}

/** One stroke segment on its own — a flat coat on a slightly darker rim. */
export function paintStroke(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x0: number, y0: number, x1: number, y1: number,
  width: number, kind: PaintKind, alpha: number, _seed: number,
): void {
  paintLayer(g, tint, [{ x: x1, y: y1, px: x0, py: y0, linked: true, w: width, kind }], alpha);
}

/** An isolated blob — a flat coat on a darker rim, with a soft wet highlight. */
export function paintDab(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x: number, y: number, r: number, kind: PaintKind, alpha: number, _seed: number,
): void {
  g.fillStyle(tint(rimOf(kind)), alpha);
  g.fillCircle(x, y, r + rimW(kind));
  g.fillStyle(tint(PAINT_TONE[kind]), alpha);
  g.fillCircle(x, y, r);
  if (r >= 3) {
    g.fillStyle(tint(kind === 'white' ? PNT.spark : PNT.gloss), alpha * 0.22);
    g.fillCircle(x - r * 0.3, y - r * 0.32, r * 0.3);
  }
}

/** A splat: a central blob thrown out into droplets. `t` runs 0→1 over its life. */
export function paintSplat(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x: number, y: number, radius: number, kind: PaintKind, t: number, seed: number,
): void {
  const e = easeOut(t);
  const a = 1 - t;
  paintDab(g, tint, x, y, radius * (0.35 + e * 0.3), kind, a, seed);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + speck(seed, 20 + i) * 0.6;
    const d = radius * (0.45 + e * (0.6 + speck(seed, 40 + i) * 0.6));
    const r = radius * 0.12 * (1 - t * 0.5) * (0.6 + speck(seed, 60 + i));
    g.fillStyle(tint(PAINT_TONE[kind]), a);
    g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d, r);
  }
}

/** A paint brush, bristles first along `ang`. Used on the hand and in the HUD. */
export function paintBrush(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x: number, y: number, ang: number, len: number, kind: PaintKind, alpha: number, fat = 1,
): void {
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const nx = -cy;
  const ny = cx;
  const pt = (along: number, side: number) => new Phaser.Geom.Point(x + cx * along + nx * side, y + cy * along + ny * side);
  const w = len * 0.07 * fat;
  // Handle — lacquered wood, thickening toward the ferrule.
  g.fillStyle(tint(PNT.woodDark), alpha);
  g.fillPoints([pt(-len * 0.55, w * 0.7), pt(len * 0.05, w * 1.1), pt(len * 0.05, -w * 1.1), pt(-len * 0.55, -w * 0.7)], true);
  g.fillStyle(tint(PNT.rose), alpha);
  g.fillPoints([pt(-len * 0.53, w * 0.5), pt(len * 0.03, w * 0.85), pt(len * 0.03, -w * 0.85), pt(-len * 0.53, -w * 0.5)], true);
  g.lineStyle(1, tint(PNT.gloss), alpha * 0.35);
  g.lineBetween(x - cx * len * 0.5 + nx * w * 0.2, y - cy * len * 0.5 + ny * w * 0.2, x + nx * w * 0.3, y + ny * w * 0.3);
  // Ferrule — crimped tin.
  g.fillStyle(tint(0xc9cdd6), alpha);
  g.fillPoints([pt(len * 0.04, w * 1.25), pt(len * 0.2, w * 1.5), pt(len * 0.2, -w * 1.5), pt(len * 0.04, -w * 1.25)], true);
  g.lineStyle(1, tint(0x6c7280), alpha * 0.8);
  g.lineBetween(x + cx * len * 0.1 + nx * w * 1.35, y + cy * len * 0.1 + ny * w * 1.35, x + cx * len * 0.1 - nx * w * 1.35, y + cy * len * 0.1 - ny * w * 1.35);
  // Bristles — a fat flat head loaded with the current paint.
  g.fillStyle(tint(0x6b5233), alpha);
  g.fillPoints([pt(len * 0.19, w * 1.6), pt(len * 0.36, w * 1.8), pt(len * 0.47, 0), pt(len * 0.36, -w * 1.8), pt(len * 0.19, -w * 1.6)], true);
  g.fillStyle(tint(PAINT_TONE[kind]), alpha);
  g.fillPoints([pt(len * 0.3, w * 1.75), pt(len * 0.37, w * 1.8), pt(len * 0.49, 0), pt(len * 0.37, -w * 1.8), pt(len * 0.3, -w * 1.75)], true);
  g.fillStyle(tint(kind === 'white' ? PNT.spark : PNT.gloss), alpha * 0.4);
  g.fillCircle(x + cx * len * 0.4 + nx * w * 0.6, y + cy * len * 0.4 + ny * w * 0.6, Math.max(0.8, w * 0.5));
}

/** Hand-drawn ring of paint — casts and the wall's edge. Broken into wobbling arcs. */
export function paintRing(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x: number, y: number, r: number, width: number, kind: PaintKind, alpha: number, seed: number, spin = 0,
): void {
  const steps = 32;
  let px = 0;
  let py = 0;
  for (let i = 0; i <= steps; i++) {
    const a = spin + (i / steps) * TAU;
    const rr = r * (1 + (speck(seed, i) - 0.5) * 0.08);
    const cx = x + Math.cos(a) * rr;
    const cy = y + Math.sin(a) * rr;
    if (i > 0 && i % 9 !== 0) {
      g.lineStyle(width, tint(PAINT_TONE[kind]), alpha);
      g.lineBetween(px, py, cx, cy);
    }
    px = cx;
    py = cy;
  }
}

/**
 * The Yin-Yang mark, drawn at `r` — the mastery's emblem on the HUD and on the rig's beret.
 * `spin` turns it.
 */
export function yinYang(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x: number, y: number, r: number, alpha: number, spin = 0,
): void {
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  g.fillStyle(tint(PNT.white), alpha);
  g.fillCircle(x, y, r);
  // The black half: a semicircle plus the head of the lower lobe, minus the upper one.
  g.fillStyle(tint(PNT.black), alpha);
  g.slice(x, y, r, spin - Math.PI / 2, spin + Math.PI / 2, false);
  g.fillPath();
  g.fillCircle(x + s * r * 0.5, y - c * r * 0.5, r * 0.5);
  g.fillStyle(tint(PNT.white), alpha);
  g.fillCircle(x - s * r * 0.5, y + c * r * 0.5, r * 0.5);
  g.fillStyle(tint(PNT.white), alpha);
  g.fillCircle(x + s * r * 0.5, y - c * r * 0.5, r * 0.14);
  g.fillStyle(tint(PNT.black), alpha);
  g.fillCircle(x - s * r * 0.5, y + c * r * 0.5, r * 0.14);
  g.lineStyle(1, tint(PNT.black), alpha);
  g.strokeCircle(x, y, r);
}

/**
 * A paint chip — Q+'s little bug made of a flake of dried paint. Six stubby legs, two eyes,
 * and the flake itself, cracked across the middle. `gait` runs the legs.
 */
export function paintChip(
  g: Phaser.GameObjects.Graphics,
  tint: PaintColorFn,
  x: number, y: number, ang: number, r: number, kind: PaintKind, gait: number, alpha: number, seed: number,
): void {
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const nx = -cy;
  const ny = cx;
  // Legs.
  g.lineStyle(1.3, tint(DEEP[kind]), alpha * 0.9);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const along = (Math.floor(i / 2) - 1) * r * 0.55;
    const sw = Math.sin(gait + i * 1.1) * 0.5;
    const hx = x + cx * along;
    const hy = y + cy * along;
    const fx = hx + nx * side * r * 1.25 + cx * sw * r * 0.6;
    const fy = hy + ny * side * r * 1.25 + cy * sw * r * 0.6;
    g.lineBetween(hx, hy, fx, fy);
  }
  // The flake — an irregular hexagon of paint.
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ang + (i / 6) * TAU;
    const rr = r * (0.8 + speck(seed, i) * 0.35) * (i % 3 === 0 ? 1.15 : 1);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85));
  }
  g.fillStyle(tint(DEEP[kind]), alpha);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 0.8, p.y + 1.2)), true);
  g.fillStyle(tint(PAINT_TONE[kind]), alpha);
  g.fillPoints(pts, true);
  g.lineStyle(1, tint(DEEP[kind]), alpha * 0.7);
  g.lineBetween(x - nx * r * 0.7, y - ny * r * 0.7, x + nx * r * 0.2 + cx * 2, y + ny * r * 0.2 + cy * 2);
  g.fillStyle(tint(PNT.gloss), alpha * 0.5);
  g.fillCircle(x - cx * r * 0.2 - nx * r * 0.3, y - cy * r * 0.2 - ny * r * 0.3, r * 0.22);
  // Eyes on the leading edge.
  for (const side of [1, -1]) {
    const ex = x + cx * r * 0.6 + nx * side * r * 0.35;
    const ey = y + cy * r * 0.6 + ny * side * r * 0.35;
    g.fillStyle(tint(PNT.white), alpha);
    g.fillCircle(ex, ey, r * 0.26);
    g.fillStyle(tint(PNT.black), alpha);
    g.fillCircle(ex + cx * r * 0.1, ey + cy * r * 0.1, r * 0.13);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class PaintFx extends FxBase {
  /** Flecks thrown off a brush, a splat or a crumbling wall. */
  flecks(x: number, y: number, count: number, spread: number, kind: PaintKind, ms = 480, depth = 8): void {
    const seeds = Array.from({ length: count }, () => ({
      a: Math.random() * TAU,
      d: spread * (0.35 + Math.random() * 0.65),
      r: 1 + Math.random() * 2,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        g.fillStyle(this.tint(PAINT_TONE[kind]), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e + t * t * 10, p.r * (1 - t * 0.4));
      }
    });
  }

  /** A splat landing — a splotch hitting something, a bucket coming down. */
  splat(x: number, y: number, radius: number, kind: PaintKind, ms = 380, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => paintSplat(g, this.tint, x, y, radius, kind, t, seed));
  }

  /** Orange paint going off. */
  boom(x: number, y: number, radius: number, ms = 420, depth = 9): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, radius * 0.5, PNT.spark, PNT.orange, depth);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(PNT.orange), (1 - t) * 0.35);
      g.fillCircle(x, y, radius * (0.4 + e * 0.8));
      paintRing(g, this.tint, x, y, radius * (0.3 + e * 0.9), 3 * (1 - t) + 1, 'orange', 1 - t, seed, t);
      paintSplat(g, this.tint, x, y, radius * 0.8, 'orange', t, seed);
    });
  }

  /** A shot dying on a wall. */
  snap(x: number, y: number, kind: PaintKind, depth = 9): void {
    this.splat(x, y, 12, kind, 300, depth);
    this.flecks(x, y, 5, 18, kind, 360, depth);
  }

  /** An expanding painted ring — casts, the canvas closing, a transformation. */
  ring(x: number, y: number, r0: number, r1: number, kind: PaintKind, ms = 420, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      paintRing(g, this.tint, x, y, r0 + (r1 - r0) * easeOut(t), 3 * (1 - t) + 1.2, kind, 1 - t, seed, t);
    });
  }

  /**
   * E+ — a paint bucket arcing from the painter to the middle of a closed loop. `onLand` runs
   * when it comes down, which is when the inside actually gets painted.
   */
  bucket(x0: number, y0: number, x1: number, y1: number, ms: number, onLand: () => void, depth = 10): void {
    const peak = Math.max(60, Math.hypot(x1 - x0, y1 - y0) * 0.35);
    this.anim(depth, ms, (g, t) => {
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * peak;
      const spin = t * TAU * 1.5;
      const c = Math.cos(spin);
      const s = Math.sin(spin);
      const pt = (u: number, v: number) => new Phaser.Geom.Point(x + u * c - v * s, y + u * s + v * c);
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + 6, 18 * (0.5 + t * 0.5), 6);
      g.fillStyle(this.tint(0x9aa3b2), 1);
      g.fillPoints([pt(-8, -8), pt(8, -8), pt(6, 9), pt(-6, 9)], true);
      g.fillStyle(this.tint(PNT.orange), 1);
      g.fillPoints([pt(-8, -8), pt(8, -8), pt(7.5, -4), pt(-7.5, -4)], true);
      g.lineStyle(1.4, this.tint(0x5d6470), 1);
      g.beginPath();
      g.arc(x, y, 9, spin + Math.PI * 1.1, spin + Math.PI * 1.9);
      g.strokePath();
      // A ribbon of paint trailing out of the mouth.
      g.fillStyle(this.tint(PNT.orange), 0.9);
      g.fillCircle(x - (x1 - x0) * 0.03, y + 4, 3);
    });
    this.scene.time.delayedCall(ms, onLand);
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const PAINT_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: PNT.rose, alpha: 0.2 },
    { r: 7, color: PNT.canvas, alpha: 0.98 },
    { r: 2.6, color: 0xffffff, alpha: 0.9, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: PNT.white,
  eyePupil: PNT.black,
  squash: { div: 13, x: 0.45, y: 0.24 },
};

/**
 * The painter: a canvas-linen orb (the baked `elem-chalk` — the id outlived the element) wearing
 * a slouched red beret, its body spattered with every colour it has ever worn, an oversized
 * paint brush in the casting hand and a wooden palette on the other thumb. The brush's bristles
 * are always loaded with the paint in hand, so the brush *is* the readout.
 *
 * Mastered: a turning Yin-Yang medallion pins the beret, the beret goes black-and-white quartered,
 * a ring of white and black droplets orbits the body, and the brush handle turns to ivory.
 */
export class PaintAvatar extends BaseAvatar {
  private paint: PaintKind = 'black';
  /** 0–1 — how hard the brush is pressing, i.e. is paint being laid. */
  private draw = 0;
  private drawTarget = 0;
  /** Big brush for Masterpiece. */
  private fat = 1;

  constructor(scene: Phaser.Scene, tint: PaintColorFn, depth = 6) {
    super(scene, tint, depth, PAINT_AVATAR);
  }

  /** Which paint is loaded on the brush. */
  setPaint(kind: PaintKind): void {
    if (kind === this.paint) return;
    this.paint = kind;
    this.forEachHandLayer(0, (glow) => glow.setFillStyle(this.tint(PAINT_TONE[kind]), this.mastered ? 0.4 : 0.22));
  }

  /** True while paint is being laid — the hand presses and drips. */
  setDrawing(on: boolean): void { this.drawTarget = on ? 1 : 0; }

  /** 1 normally; the Masterpiece brush is much fatter. */
  setBrushSize(v: number): void { this.fat = v; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.draw += (this.drawTarget - this.draw) * Math.min(1, delta / 140);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 11);
      glow.setAlpha(on ? 0.4 : 0.2);
    });
    this.forEachHandLayer(1, (core) => {
      if (on) core.setStrokeStyle(1.5, this.tint(PNT.black), 0.9);
      else core.setStrokeStyle();
    });
    this.setEyeWhite(on ? PNT.spark : PNT.white);
  }

  /** Spatter across the linen body — a few blots and a drip, in every colour the painter uses. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const lean = Math.cos(this.facing) * 1.2;
    const blots: [number, number, number, PaintKind][] = [
      [-11, 9, 3.2, 'red'], [10, 11, 2.6, 'blue'], [-3, 15, 2.2, 'green'], [12, 3, 1.8, 'orange'], [-14, 2, 1.5, 'black'],
    ];
    blots.forEach(([bx, by, r, k], i) => paintDab(g, this.tint, x + bx + lean, y + by, r, k, alpha * 0.9, 11 + i * 7));
    // A long drip running off the red blot.
    g.lineStyle(1.6, this.tint(PNT.red), alpha * 0.85);
    g.lineBetween(x - 11 + lean, y + 11, x - 11.5 + lean, y + 17);
    g.fillStyle(this.tint(PNT.red), alpha * 0.85);
    g.fillCircle(x - 11.5 + lean, y + 17.5, 1.3);
  }

  /** The wooden palette held on the off hand, its wells full. */
  private palette(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const hx = this.armX[0];
    const hy = this.armY[0];
    g.fillStyle(this.tint(PNT.woodDark), alpha);
    g.fillEllipse(hx + 1, hy + 1.5, 19, 12);
    g.fillStyle(this.tint(PNT.woodLit), alpha);
    g.fillEllipse(hx, hy, 18, 11);
    // The thumb hole.
    g.fillStyle(this.tint(PNT.woodDark), alpha);
    g.fillCircle(hx - 5, hy + 1.5, 1.8);
    const wells: PaintKind[] = this.mastered ? ['white', 'black', 'red', 'blue', 'green'] : ['red', 'blue', 'green', 'orange', 'black'];
    wells.forEach((k, i) => {
      const ang = -2.4 + i * 0.75;
      g.fillStyle(this.tint(PAINT_TONE[k]), alpha);
      g.fillCircle(hx + 1 + Math.cos(ang) * 5.5, hy + Math.sin(ang) * 3.4, 1.7);
    });
  }

  protected emitTrail(x: number, y: number): void {
    if (this.paint === 'black' && !this.mastered) return;
    new PaintFx(this.scene, this.tint).flecks(x, y, 1, 6, this.paint, 420);
  }

  /** A puddle of the paint in hand under the painter, spreading while it works. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(PNT.rose), a * (this.mastered ? 0.2 : 0.12) * k);
    g.fillCircle(x, y, 27 * k);
    g.fillStyle(this.tint(PAINT_TONE[this.paint]), a * this.draw * 0.16);
    g.fillEllipse(x, y + 12, 38, 12);
  }

  /** The beret, the medallion (mastered) and the brush. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 2;

    // ── The beret: slouched, a stalk on top, a paint stain on the band ──
    const bx = x + lean;
    const by = y - 17;
    g.fillStyle(this.tint(m ? PNT.black : PNT.redDeep), alpha);
    g.fillEllipse(bx - 3, by - 1, 27, 10);
    g.fillStyle(this.tint(m ? PNT.white : PNT.red), alpha);
    g.fillEllipse(bx - 3.5, by - 2.4, 24, 7.5);
    if (m) {
      // Quartered: two black quarters laid over the white crown.
      g.fillStyle(this.tint(PNT.black), alpha);
      g.slice(bx - 3.5, by - 2.4, 11.5, -Math.PI / 2, 0, false);
      g.fillPath();
      g.slice(bx - 3.5, by - 2.4, 11.5, Math.PI / 2, Math.PI, false);
      g.fillPath();
    }
    g.fillStyle(this.tint(PNT.gloss), alpha * 0.25);
    g.fillEllipse(bx - 8, by - 4, 9, 2.4);
    g.fillStyle(this.tint(m ? PNT.white : PNT.redDeep), alpha);
    g.fillRect(bx - 1, by - 7.5, 2, 3.5);
    g.fillCircle(bx, by - 7.8, 1.4);
    paintDab(g, this.tint, bx + 5, by + 0.5, 1.6, m ? 'black' : 'blue', alpha, 4);

    if (m) {
      // Mastered: a Yin-Yang medallion turning on the brim, and droplets orbiting the body.
      yinYang(g, this.tint, bx - 9, by + 0.5, 3.6, alpha, this.t * 1.6);
      for (let i = 0; i < 6; i++) {
        const ang = this.t * 1.2 + (i / 6) * TAU;
        const ox = x + Math.cos(ang) * 25;
        const oy = y + 4 + Math.sin(ang) * 9;
        const k: PaintKind = i % 2 === 0 ? 'white' : 'black';
        g.fillStyle(this.tint(k === 'white' ? PNT.white : PNT.rose), alpha * 0.2);
        g.fillCircle(ox, oy, 4);
        paintDab(g, this.tint, ox, oy, 1.9, k, alpha * 0.95, 30 + i);
      }
    }

    this.palette(g, alpha);

    // ── The brush, gripped in the casting hand and angled along its reach ──
    const hx = this.armX[1];
    const hy = this.armY[1];
    const ang = Math.atan2(hy - y, hx - x);
    const len = (m ? 30 : 27) * (0.9 + this.fat * 0.1) + this.draw * 3;
    const sx = hx + Math.cos(ang) * 4;
    const sy = hy + Math.sin(ang) * 4;
    paintBrush(g, this.tint, sx, sy, ang, len, this.paint, alpha, this.fat);
    if (m) {
      // Ivory handle stripe.
      g.lineStyle(1.4, this.tint(PNT.white), alpha * 0.8);
      g.lineBetween(sx - Math.cos(ang) * len * 0.5, sy - Math.sin(ang) * len * 0.5, sx, sy);
    }
    if (this.draw > 0.3) {
      const tip = len * 0.5 + 4;
      g.fillStyle(this.tint(PAINT_TONE[this.paint]), alpha * this.draw * (0.5 + 0.5 * Math.sin(this.t * 14)));
      g.fillCircle(hx + Math.cos(ang) * tip, hy + Math.sin(ang) * tip + 2, 1.8 * this.fat);
    }
  }
}
