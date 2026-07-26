import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Subterfuge renders: the made-man rig (gloved hands, a fedora
 * with the week's takings stuffed in the hatband, a cigarette that is always lit), the bribe /
 * retainer / smoke auras, and every one-shot effect its daggers, guns and hires throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts. What stays here is what makes Subterfuge Subterfuge: the banknote.
 *
 * Every other element pays for its abilities with a cooldown. This one pays *cash*: recruits cost
 * money, bribes cost money, reloading costs money, and the mastery is literally a bigger wallet.
 * So the primitive is a banknote, and it is in everything — a hit sprays it, a bribe blooms it, a
 * recruit is hired out of a fistful of it, and the character wears it in his hat. Whatever
 * Subterfuge is doing, somebody is getting paid.
 */

/** `(base) => displayed` — CosmeticsKit.subterfugeColor bound to one owner. */
export type SubColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const SUB = {
  /** The suit. */
  ink: 0x0a0a0a,
  charcoal: 0x1a1a1a,
  slate: 0x2b2226,
  graphite: 0x3d3238,
  /** The house colour. */
  wine: 0x552222,
  crimson: 0xcc2233,
  blood: 0xdd2233,
  scarlet: 0xff3344,
  /** The money. */
  paper: 0xe8e2d0,
  paperShade: 0xc9c2ad,
  gold: 0xffdd33,
  brass: 0xddaa00,
  moneyGreen: 0x66dd66,
  /** Steel: daggers, guns, the specialist's plate. */
  steel: 0xc8ccd8,
  steelHi: 0xf0f4ff,
  white: 0xffffff,
  /** Smoke, and what is left after the fire. */
  ash: 0x9a9a92,
  ashDark: 0x5e5e57,
  ember: 0xff5522,
  flame: 0xff8844,
  /** The hires, each with its own trim. */
  rust: 0xdd6633,
  olive: 0x226633,
  navy: 0x444466,
  haze: 0x8899dd,
  wood: 0x885522,
  /** Borrowed light: the disco ball and the treachery that steals it. */
  neon: 0xcc88ff,
  volt: 0xffee00,
  acid: 0x66ff33,
} as const;

export interface Pt { x: number; y: number }

// ── Path helpers ──────────────────────────────────────────────────────────

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Local-to-world for a shape drawn along `angle` at (cx, cy). */
function frame(cx: number, cy: number, angle: number): (lx: number, ly: number) => Pt {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Subterfuge's primitive: a **banknote** — a long rectangle whose far half is folded over by
 * `fold`, so the sheet creases along its middle instead of staying a flat card.
 *
 * The crease is the whole trick. A flat rectangle tumbling through the air reads as a domino;
 * a rectangle that visibly bends across its short axis reads as paper, and paper is what makes
 * a spray of these read as *money* rather than as debris.
 */
export function banknote(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number,
  len: number, halfW: number, fold = 0.4,
): void {
  const at = frame(cx, cy, angle);
  const half = len / 2;
  // The fold pinches the sheet at the crease and lifts the far half toward edge-on.
  const creaseW = halfW * (1 - fold * 0.45);
  const farW = halfW * (1 - fold * 0.85);
  const farX = half * (1 - fold * 0.35);
  fillPts(g, [
    at(-half, -halfW), at(0, -creaseW), at(farX, -farW),
    at(farX, farW), at(0, creaseW), at(-half, halfW),
  ]);
}

/**
 * The note in five passes: a dropped shadow, the paper, the engraved border, the seal in the
 * middle and a denomination in one corner.
 *
 * The seal matters more than it should: a plain pale rectangle at gameplay zoom is a scrap of
 * litter, and a single dark oval in the centre of it is the difference between litter and cash.
 */
export function banknoteLayered(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  alpha: number, fold = 0.4, seal: number = SUB.crimson,
): void {
  g.fillStyle(tint(SUB.ink), alpha * 0.45);
  banknote(g, cx + 1, cy + 1.8, angle, len * 1.04, halfW * 1.1, fold);

  g.fillStyle(tint(SUB.paper), alpha);
  banknote(g, cx, cy, angle, len, halfW, fold);
  // Shaded far half, so the crease reads as a crease rather than as a printed line.
  const at = frame(cx, cy, angle);
  const half = len / 2;
  const creaseW = halfW * (1 - fold * 0.45);
  const farW = halfW * (1 - fold * 0.85);
  const farX = half * (1 - fold * 0.35);
  g.fillStyle(tint(SUB.paperShade), alpha * 0.9);
  fillPts(g, [at(0, -creaseW), at(farX, -farW), at(farX, farW), at(0, creaseW)]);

  if (len < 9) return;
  g.lineStyle(Math.max(0.6, len * 0.035), tint(seal), alpha * 0.8);
  strokePts(g, [
    at(-half * 0.86, -halfW * 0.66), at(farX * 0.86, -farW * 0.66),
    at(farX * 0.86, farW * 0.66), at(-half * 0.86, halfW * 0.66),
  ], true);
  g.fillStyle(tint(seal), alpha * 0.85);
  g.fillEllipse(cx, cy, len * 0.2, halfW * 0.95);
  g.fillStyle(tint(SUB.gold), alpha * 0.9);
  const corner = at(-half * 0.72, 0);
  g.fillCircle(corner.x, corner.y, halfW * 0.34);
}

// ── Element shapes ────────────────────────────────────────────────────────

/**
 * A stiletto: a long needle blade off a short crossguard, with a wrapped grip and a pommel.
 *
 * The click ability throws three of these and recalls them, so they have to read at speed and
 * from any angle — hence the crossguard, which is the one part of a knife that stays visible
 * when the blade is edge-on to you.
 */
export function stiletto(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  cx: number, cy: number, angle: number, len: number,
  trim: number, alpha: number,
): void {
  const at = frame(cx, cy, angle);
  const w = len * 0.09;
  g.fillStyle(tint(SUB.ink), alpha * 0.45);
  fillPts(g, [at(-len * 0.4 + 1, -w + 1.6), at(len * 0.6 + 1, 1.6), at(-len * 0.4 + 1, w + 1.6)]);
  // Blade: a long isoceles needle with a bright spine down the middle.
  g.fillStyle(tint(SUB.steel), alpha);
  fillPts(g, [at(-len * 0.1, -w), at(len * 0.6, 0), at(-len * 0.1, w)]);
  g.lineStyle(Math.max(0.7, len * 0.045), tint(SUB.steelHi), alpha * 0.9);
  strokePts(g, [at(-len * 0.06, 0), at(len * 0.52, 0)]);
  // Crossguard.
  g.fillStyle(tint(trim), alpha);
  fillPts(g, [at(-len * 0.16, -w * 2.1), at(-len * 0.06, -w * 2.1), at(-len * 0.06, w * 2.1), at(-len * 0.16, w * 2.1)]);
  // Grip and pommel.
  g.fillStyle(tint(SUB.charcoal), alpha);
  fillPts(g, [at(-len * 0.42, -w * 0.8), at(-len * 0.16, -w * 0.9), at(-len * 0.16, w * 0.9), at(-len * 0.42, w * 0.8)]);
  g.fillStyle(tint(trim), alpha);
  const p = at(-len * 0.46, 0);
  g.fillCircle(p.x, p.y, w * 1.15);
}

/**
 * One of the hires: shoulders in a suit, a collar, a tie in the house colour, a fedora and a
 * pair of shades. `bulk` widens the silhouette (the thug), `plate` puts a shield across the
 * chest (the specialist), `hat` can be dropped for the money runner who is in too much of a
 * hurry to keep one on.
 */
export function suitFigure(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, facing: number, r: number, t: number, alpha: number,
  o: { body?: number; trim?: number; bulk?: number; plate?: boolean; hat?: boolean; bag?: boolean } = {},
): void {
  const body = o.body ?? SUB.charcoal;
  const trim = o.trim ?? SUB.blood;
  const bulk = o.bulk ?? 1;
  const look = Math.cos(facing) < 0 ? -1 : 1;
  const bob = Math.sin(t * 4.2 + x * 0.05) * 1.2;
  const cy = y + bob;

  g.fillStyle(tint(SUB.ink), alpha * 0.4);
  g.fillEllipse(x, y + r * 0.95, r * 1.9, r * 0.55);
  // Shoulders: a trapezoid rather than a disc, which is what makes it read as a suit.
  g.fillStyle(tint(body), alpha);
  fillPts(g, [
    { x: x - r * 1.05 * bulk, y: cy + r * 0.85 },
    { x: x - r * 0.72 * bulk, y: cy - r * 0.15 },
    { x: x + r * 0.72 * bulk, y: cy - r * 0.15 },
    { x: x + r * 1.05 * bulk, y: cy + r * 0.85 },
  ]);
  // Lapels, opening into a V.
  g.fillStyle(tint(SUB.slate), alpha);
  fillPts(g, [{ x: x - r * 0.55, y: cy - r * 0.1 }, { x, y: cy + r * 0.6 }, { x: x - r * 0.1, y: cy - r * 0.14 }]);
  fillPts(g, [{ x: x + r * 0.55, y: cy - r * 0.1 }, { x, y: cy + r * 0.6 }, { x: x + r * 0.1, y: cy - r * 0.14 }]);
  // The tie.
  g.fillStyle(tint(trim), alpha);
  fillPts(g, [
    { x: x - r * 0.14, y: cy - r * 0.05 }, { x: x + r * 0.14, y: cy - r * 0.05 },
    { x: x + r * 0.1, y: cy + r * 0.75 }, { x: x - r * 0.1, y: cy + r * 0.75 },
  ]);
  if (o.plate) {
    // A riot shield strapped across the front.
    g.fillStyle(tint(SUB.navy), alpha * 0.95);
    fillPts(g, [
      { x: x - r * 0.85, y: cy - r * 0.05 }, { x: x + r * 0.85, y: cy - r * 0.05 },
      { x: x + r * 0.6, y: cy + r * 0.9 }, { x: x - r * 0.6, y: cy + r * 0.9 },
    ]);
    g.lineStyle(1.4, tint(SUB.haze), alpha * 0.9);
    strokePts(g, [{ x: x - r * 0.5, y: cy + r * 0.2 }, { x: x + r * 0.5, y: cy + r * 0.2 }]);
  }
  // Head and shades.
  g.fillStyle(tint(SUB.graphite), alpha);
  g.fillCircle(x, cy - r * 0.52, r * 0.52);
  g.fillStyle(tint(SUB.ink), alpha);
  fillPts(g, [
    { x: x - r * 0.46, y: cy - r * 0.62 }, { x: x + r * 0.46, y: cy - r * 0.62 },
    { x: x + r * 0.42, y: cy - r * 0.4 }, { x: x - r * 0.42, y: cy - r * 0.4 },
  ]);
  g.fillStyle(tint(SUB.scarlet), alpha * 0.8);
  g.fillCircle(x + look * r * 0.2, cy - r * 0.52, r * 0.09);
  if (o.hat !== false) {
    // Fedora: a crown with a dent, a band, and a brim wider on the near side.
    g.fillStyle(tint(SUB.ink), alpha);
    fillPts(g, [
      { x: x - r * 0.42, y: cy - r * 0.78 }, { x: x - r * 0.3, y: cy - r * 1.28 },
      { x: x + r * 0.3, y: cy - r * 1.28 }, { x: x + r * 0.42, y: cy - r * 0.78 },
    ]);
    g.fillStyle(tint(trim), alpha);
    fillPts(g, [
      { x: x - r * 0.42, y: cy - r * 0.86 }, { x: x + r * 0.42, y: cy - r * 0.86 },
      { x: x + r * 0.4, y: cy - r * 0.74 }, { x: x - r * 0.4, y: cy - r * 0.74 },
    ]);
    g.fillStyle(tint(SUB.ink), alpha);
    g.fillEllipse(x + look * r * 0.08, cy - r * 0.72, r * 1.5, r * 0.3);
  }
  if (o.bag) {
    // A satchel of takings swinging off the shoulder.
    const sw = Math.sin(t * 5 + x * 0.02) * r * 0.14;
    g.fillStyle(tint(SUB.wood), alpha);
    g.fillRect(x + look * r * 0.7 + sw - r * 0.28, cy + r * 0.2, r * 0.56, r * 0.46);
    g.fillStyle(tint(SUB.moneyGreen), alpha);
    g.fillRect(x + look * r * 0.7 + sw - r * 0.16, cy + r * 0.12, r * 0.32, r * 0.14);
  }
}

/** A drifting bank of cigarette smoke: overlapping lobes that roil on their own phases. */
export function smokeBank(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, radius: number, seed: number, t: number,
  color: number, alpha: number, lobes = 7,
): void {
  g.fillStyle(color, alpha);
  for (let i = 0; i < lobes; i++) {
    const a = seed + (i / lobes) * TAU + t * 0.18;
    const d = radius * (0.24 + 0.36 * Math.abs(Math.sin(seed * 3 + i * 2.1)));
    const r = radius * (0.46 + 0.3 * Math.abs(Math.sin(seed + i * 1.7 + t * 0.9)));
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.78, r);
  }
}

/** A lit cigarette: paper tube, a band of ash, and an ember that breathes. */
export function cigaretteShape(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  cx: number, cy: number, angle: number, len: number, burn: number, t: number, alpha: number,
): void {
  const at = frame(cx, cy, angle);
  const w = len * 0.14;
  // The tube shortens as it burns, so the stub is visibly nearly gone.
  const tip = len * (0.35 + burn * 0.65);
  g.fillStyle(tint(SUB.ink), alpha * 0.4);
  fillPts(g, [at(-len * 0.5 + 1, -w + 1.4), at(tip + 1, -w + 1.4), at(tip + 1, w + 1.4), at(-len * 0.5 + 1, w + 1.4)]);
  g.fillStyle(tint(SUB.paper), alpha);
  fillPts(g, [at(-len * 0.5, -w), at(tip, -w), at(tip, w), at(-len * 0.5, w)]);
  g.fillStyle(tint(SUB.brass), alpha);
  fillPts(g, [at(-len * 0.5, -w), at(-len * 0.24, -w), at(-len * 0.24, w), at(-len * 0.5, w)]);
  g.fillStyle(tint(SUB.ashDark), alpha * 0.9);
  fillPts(g, [at(tip - len * 0.12, -w), at(tip, -w), at(tip, w), at(tip - len * 0.12, w)]);
  const e = at(tip, 0);
  const glow = 0.6 + 0.4 * Math.sin(t * 3.1);
  g.fillStyle(tint(SUB.ember), alpha * 0.35 * glow);
  g.fillCircle(e.x, e.y, w * 2.4);
  g.fillStyle(tint(SUB.ember), alpha * (0.7 + 0.3 * glow));
  g.fillCircle(e.x, e.y, w * 1.05);
}

/** A mirrorball: a facetted sphere whose tiles catch the light as it turns. */
export function discoBallShape(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  cx: number, cy: number, radius: number, spin: number, alpha: number,
): void {
  g.fillStyle(tint(SUB.ink), alpha * 0.4);
  g.fillCircle(cx + 1, cy + 2, radius * 1.03);
  g.fillStyle(tint(SUB.slate), alpha);
  g.fillCircle(cx, cy, radius);
  // Tiles: latitude bands sliced into facets, each lit by where it is in the turn.
  for (let row = -2; row <= 2; row++) {
    const ry = (row / 3) * radius;
    const rw = Math.sqrt(Math.max(0, radius * radius - ry * ry));
    const cols = 9;
    for (let c = 0; c < cols; c++) {
      const a = spin + (c / cols) * TAU + row * 0.2;
      const lit = Math.max(0, Math.cos(a));
      if (Math.sin(a) < 0) continue; // back of the ball
      const tx = cx + Math.cos(a) * rw * 0.92;
      const tw = rw * 0.16 * Math.abs(Math.sin(a));
      g.fillStyle(tint(lit > 0.75 ? SUB.white : lit > 0.35 ? SUB.steelHi : SUB.steel), alpha * (0.35 + lit * 0.6));
      g.fillRect(tx - tw / 2, cy + ry - radius * 0.14, tw, radius * 0.28);
    }
  }
  g.lineStyle(1.2, tint(SUB.ink), alpha * 0.5);
  g.strokeCircle(cx, cy, radius);
  // The beams it throws.
  for (let i = 0; i < 6; i++) {
    const a = spin * 1.6 + (i / 6) * TAU;
    g.fillStyle(tint(SUB.neon), alpha * 0.16);
    fillPts(g, [
      { x: cx, y: cy },
      { x: cx + Math.cos(a - 0.08) * radius * 6, y: cy + Math.sin(a - 0.08) * radius * 6 },
      { x: cx + Math.cos(a + 0.08) * radius * 6, y: cy + Math.sin(a + 0.08) * radius * 6 },
    ]);
  }
}

// ── SubterfugeFx ──────────────────────────────────────────────────────────

export interface SubDealOpts {
  /** Notes thrown clear. Defaults to radius/9. */
  notes?: number;
  /** Concentric rings. Defaults to 2. */
  rings?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a scorch on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot Subterfuge effects. Cheap to construct — build one per owner and hand it that
 * owner's colour mapper.
 */
export class SubterfugeFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: SubColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the SUB default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 9, color: number = SUB.scarlet): void {
    this.flashIn(x, y, radius, SUB.white, color, depth);
  }

  /**
   * An expanding ring. Segment count scales with the radius, because a big blast drawn with
   * twelve segments reads as a dodecagon rather than as a shockwave.
   */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 420, depth = 8, width = 3,
  ): void {
    const n = Phaser.Math.Clamp(Math.round(to / 5), 16, 64);
    const jitter = Array.from({ length: n }, () => 0.92 + Math.random() * 0.16);
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      g.lineStyle(width * (1 - t * 0.5), this.tint(color), (1 - t) * 0.9);
      const pts: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const rr = r * jitter[i % n];
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      strokePts(g, pts, true);
    });
  }

  /** Cash thrown into the air, tumbling as it falls. */
  cash(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; seal?: number; gravity?: number } = {},
  ): void {
    const speed = o.speed ?? 220;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 16;
    const life = o.life ?? 760;
    const depth = o.depth ?? 9;
    const seal = o.seal ?? SUB.crimson;
    const gravity = o.gravity ?? 46;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.4 + Math.random()),
      s: size * (0.6 + Math.random() * 0.7),
      spin: (Math.random() - 0.5) * 11,
      flip: 3 + Math.random() * 5,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        // Notes flutter down rather than flying straight — they are paper.
        const fall = gravity * lt * lt;
        const flutter = Math.sin(lt * p.flip * 3) * 6;
        banknoteLayered(g, this.tint,
          x + Math.cos(p.a) * d + flutter, y + Math.sin(p.a) * d + fall,
          p.a + p.spin * lt, p.s, p.s * 0.34,
          0.95 * (1 - lt * lt),
          // The fold breathes as it turns, which is what sells the tumble.
          0.2 + 0.6 * Math.abs(Math.sin(lt * p.flip)), seal);
      }
    });
  }

  /** Cordite and cigarette smoke lifting off something. */
  smoke(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; drift?: number } = {},
  ): void {
    const speed = o.speed ?? 60;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 5;
    const life = o.life ?? 820;
    const depth = o.depth ?? 8;
    const color = o.color ?? SUB.ash;
    const drift = o.drift ?? -30;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.3 + Math.random()),
      s: size * (0.5 + Math.random()),
      seed: Math.random() * TAU,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        smokeBank(g,
          x + Math.cos(p.a) * d + Math.sin(p.seed + lt * 3) * 6,
          y + Math.sin(p.a) * d + drift * lt,
          p.s * (1 + lt * 1.4), p.seed, lt * 3, this.tint(color), 0.55 * (1 - lt * lt), 5);
      }
    });
  }

  /**
   * A bullet: a hot tracer that snaps down the line, a muzzle flare at the gun and a puff of
   * cordite behind it. Every one of the spray's fifty rounds goes through here, so it is kept
   * to three cheap layers.
   */
  tracer(
    sx: number, sy: number, ex: number, ey: number,
    o: { color?: number; depth?: number; duration?: number; width?: number } = {},
  ): void {
    const color = o.color ?? SUB.scarlet;
    const depth = o.depth ?? 8;
    const dur = o.duration ?? 130;
    const w = o.width ?? 2.2;
    const ang = Math.atan2(ey - sy, ex - sx);
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - t;
      // The round is drawn as a short travelling dash, not as a full-length beam.
      const head = Phaser.Math.Clamp(t * 3.2, 0, 1);
      const tail = Math.max(0, head - 0.4);
      const hx = sx + (ex - sx) * head, hy = sy + (ey - sy) * head;
      const tx = sx + (ex - sx) * tail, ty = sy + (ey - sy) * tail;
      g.lineStyle(w * 1.9, this.tint(color), fade * 0.3);
      strokePts(g, [{ x: tx, y: ty }, { x: hx, y: hy }]);
      g.lineStyle(w, this.tint(color), fade * 0.95);
      strokePts(g, [{ x: tx, y: ty }, { x: hx, y: hy }]);
      g.lineStyle(w * 0.4, this.tint(SUB.white), fade);
      strokePts(g, [{ x: tx, y: ty }, { x: hx, y: hy }]);
      // Muzzle flare: a four-pointed star at the gun for the first frames only.
      if (t > 0.35) return;
      const fk = 1 - t / 0.35;
      g.fillStyle(this.tint(SUB.gold), fk * 0.9);
      for (let i = 0; i < 4; i++) {
        const a = ang + i * (Math.PI / 2) + 0.4;
        fillPts(g, [
          { x: sx + Math.cos(a) * 12 * fk, y: sy + Math.sin(a) * 12 * fk },
          { x: sx + Math.cos(a + 0.5) * 3.5 * fk, y: sy + Math.sin(a + 0.5) * 3.5 * fk },
          { x: sx + Math.cos(a - 0.5) * 3.5 * fk, y: sy + Math.sin(a - 0.5) * 3.5 * fk },
        ]);
      }
      g.fillStyle(this.tint(SUB.white), fk);
      g.fillCircle(sx, sy, 3.2 * fk);
    });
  }

  /**
   * A transaction going badly: white core, a shockwave, banknotes flung clear, cordite, and a
   * scorch mark left on the pavement.
   */
  deal(x: number, y: number, radius: number, o: SubDealOpts = {}): void {
    const color = o.color ?? SUB.scarlet;
    const bits = o.notes ?? Math.max(4, Math.round(radius / 9));
    const rings = o.rings ?? 2;
    const dur = o.duration ?? Math.round(360 + radius * 1.2);
    const depth = o.depth ?? 9;

    if (o.mark !== false) this.scorch(x, y, radius * 0.55, depth - 6);
    this.flash(x, y, radius * 0.42, depth + 2, color);
    for (let i = 0; i < rings; i++) {
      this.scene.time.delayedCall(i * 80, () =>
        this.ring(x, y, radius * 0.2, radius * (1 + i * 0.28),
          i === 0 ? color : SUB.gold, Math.round(dur * (0.85 + i * 0.2)), depth, 3 - i * 0.9));
    }
    this.cash(x, y, bits, {
      speed: radius * 2.1, size: 13 + radius / 10, life: Math.round(dur * 1.5), depth: depth + 1,
    });
    this.smoke(x, y, bits, { speed: radius * 1.2, size: 6, life: Math.round(dur * 1.7), depth });
  }

  /** A scorch, and the chalk outline of whatever used to be standing there. */
  scorch(x: number, y: number, radius: number, depth = 3, outline = false): void {
    const seed = Math.random() * TAU;
    this.anim(depth, outline ? 3200 : 1500, (g, t) => {
      const a = (t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94) * 0.55;
      g.fillStyle(this.tint(SUB.ink), a * 0.7);
      for (let i = 0; i < 5; i++) {
        const ang = seed + i * 2.399;
        const d = radius * 0.35 * Math.abs(Math.sin(seed + i));
        g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.7, radius * (0.4 + 0.3 * Math.abs(Math.cos(seed + i))));
      }
      if (!outline) return;
      // The chalk outline: a lopsided body drawn round where they fell.
      g.lineStyle(2, this.tint(SUB.paper), a * 1.4);
      const pts: Pt[] = [];
      for (let i = 0; i <= 22; i++) {
        const ang = seed * 0.2 + (i / 22) * TAU;
        // Two lumps for the head and shoulders, then a sprawl.
        const rr = radius * (1.05 + 0.3 * Math.sin(ang * 3 + seed) + 0.16 * Math.sin(ang * 5));
        pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr * 0.72 });
      }
      strokePts(g, pts, true);
    });
  }

  /** A dagger's cut: a short bright arc with a couple of parallel scores behind it. */
  cut(
    x: number, y: number, angle: number, range: number,
    o: { color?: number; duration?: number; depth?: number; scores?: number } = {},
  ): void {
    const color = o.color ?? SUB.steelHi;
    const dur = o.duration ?? 220;
    const depth = o.depth ?? 10;
    const scores = o.scores ?? 2;
    this.anim(depth, dur, (g, t) => {
      const sweep = easeOut(t);
      const fade = 1 - easeIn(t);
      for (let s = 0; s < scores; s++) {
        const off = (s - (scores - 1) / 2) * 0.34;
        const arc: Pt[] = [];
        const from = angle - 0.7 + off;
        const to = from + 1.4 * sweep;
        for (let i = 0; i <= 8; i++) {
          const a = from + (to - from) * (i / 8);
          const rr = range * (0.6 + 0.4 * Math.sin((i / 8) * Math.PI));
          arc.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
        }
        g.lineStyle(3.6 - s * 0.9, this.tint(SUB.ink), fade * 0.5);
        strokePts(g, arc.map((p) => ({ x: p.x + 1, y: p.y + 1.6 })));
        g.lineStyle(2.4 - s * 0.6, this.tint(color), fade * 0.95);
        strokePts(g, arc);
      }
    });
  }

  /**
   * The Dark Treachery wind-up: black fog closing on the caster with banknotes spiralling
   * inward, so the two-second channel reads as a deal being struck rather than as a pause.
   */
  shakedown(
    x: number, y: number, radius: number, duration: number,
    o: { color?: number; depth?: number; follow?: () => { x: number; y: number } } = {},
  ): void {
    const color = o.color ?? SUB.ink;
    const depth = o.depth ?? 8;
    const follow = o.follow;
    this.anim(depth, duration, (g, t) => {
      const c = follow ? follow() : { x, y };
      const k = easeIn(t);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU - t * 2.6;
        const d = radius * (1.7 - k * 1.2);
        smokeBank(g, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d,
          radius * 0.36 * (0.6 + t), i * 1.7, t * 3, this.tint(color), 0.28 + 0.4 * t, 5);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 4;
        const d = radius * (1.5 - k * 1.25);
        banknoteLayered(g, this.tint, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d,
          a + Math.PI / 2, 15 * (1 - t * 0.4), 5 * (1 - t * 0.4), 0.5 + 0.5 * t,
          0.3 + 0.5 * Math.abs(Math.sin(t * 9 + i)), SUB.gold);
      }
      g.fillStyle(this.tint(SUB.crimson), 0.1 + 0.55 * t * t);
      g.fillCircle(c.x, c.y, 4 + radius * 0.2 * t);
    });
  }

  /** Money changing hands: notes travelling from one point to another along a curve. */
  payment(
    sx: number, sy: number, tx: number, ty: number,
    o: { count?: number; duration?: number; depth?: number; seal?: number } = {},
  ): void {
    const count = o.count ?? 5;
    const dur = o.duration ?? 480;
    const depth = o.depth ?? 11;
    const seal = o.seal ?? SUB.gold;
    // A bowed path, so a handoff never looks like a laser between two dots.
    const mx = (sx + tx) / 2 - (ty - sy) * 0.22;
    const my = (sy + ty) / 2 + (tx - sx) * 0.22;
    const lags = Array.from({ length: count }, (_, i) => i / count * 0.4);
    this.anim(depth, dur, (g, t) => {
      for (let i = 0; i < count; i++) {
        const lt = Phaser.Math.Clamp((t - lags[i]) / (1 - lags[i]), 0, 1);
        if (lt <= 0) continue;
        const u = easeOut(lt);
        const a2 = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        const px = a2 * sx + b * mx + c * tx;
        const py = a2 * sy + b * my + c * ty;
        banknoteLayered(g, this.tint, px, py, Math.atan2(ty - sy, tx - sx) + u * 5,
          14, 4.6, 1 - u * u, 0.3 + 0.55 * Math.abs(Math.sin(u * 9)), seal);
      }
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // a dagger's flight phase, a recruit's rank, how far down a cigarette has burned.

  /** A Molecular Cutter dagger, in flight, planted in the ground, or on its way back. */
  static drawDagger(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, angle: number, state: 'flying' | 'planted' | 'returning',
    trim: number, t: number, alpha: number,
  ): void {
    if (state === 'planted') {
      // Stuck point-first in the floor, quivering, casting a shadow.
      g.fillStyle(tint(SUB.ink), alpha * 0.35);
      g.fillEllipse(x, y + 8, 16, 5);
      stiletto(g, tint, x, y - 6, Math.PI / 2 + Math.sin(t * 12) * 0.045, 22, trim, alpha);
      return;
    }
    // In flight: a motion streak behind it, longer on the recall because it comes back hard.
    const trail = state === 'returning' ? 5 : 3;
    for (let i = trail; i >= 1; i--) {
      stiletto(g, tint, x - Math.cos(angle) * i * 7, y - Math.sin(angle) * i * 7,
        angle, 20 - i, trim, alpha * 0.16 * (trail + 1 - i));
    }
    stiletto(g, tint, x, y, angle, 22, trim, alpha);
  }

  /** A Blade Dance bodyguard orbiting its owner. */
  static drawOrbitDagger(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, angle: number, trim: number, remaining: number, alpha: number,
  ): void {
    // The blade fades as the contract runs out, so "about to leave" is readable.
    const a = alpha * Phaser.Math.Clamp(remaining * 3, 0.35, 1);
    g.fillStyle(tint(trim), a * 0.18);
    g.fillCircle(x, y, 13);
    stiletto(g, tint, x, y, angle, 20, trim, a);
  }

  /** One of the hires, drawn from its live state. */
  static drawRecruit(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, facing: number, r: number, t: number, alpha: number,
    o: { type: 'lackey' | 'runner' | 'thug' | 'specialist'; inverted: boolean; reloading: boolean; ignited: boolean; enemy: boolean },
  ): void {
    if (o.ignited) {
      // Soul copy: it is on fire and it knows.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 3;
        const h = r * (0.9 + 0.5 * Math.abs(Math.sin(t * 7 + i)));
        g.fillStyle(tint(i % 2 === 0 ? SUB.ember : SUB.flame), alpha * 0.6);
        fillPts(g, [
          { x: x + Math.cos(a) * r * 0.8, y: y + Math.sin(a) * r * 0.5 },
          { x: x + Math.cos(a + 0.5) * r * 0.8, y: y + Math.sin(a + 0.5) * r * 0.5 },
          { x: x + Math.cos(a + 0.25) * r * 0.4, y: y - h },
        ]);
      }
    }
    // Level V wears the palette inside out; an enemy hire wears a duller red so the two
    // sides never blur together in a crowd.
    const body = o.inverted ? SUB.blood : SUB.charcoal;
    const trim = o.inverted ? SUB.ink : o.enemy ? SUB.wine : SUB.blood;
    suitFigure(g, tint, x, y, facing, r, t, alpha * (o.reloading ? 0.62 : 1), {
      body, trim,
      bulk: o.type === 'thug' ? 1.22 : o.type === 'runner' ? 0.85 : 1,
      plate: o.type === 'specialist',
      hat: o.type !== 'runner',
      bag: o.type === 'runner',
    });
    // Each type carries the tool it actually uses.
    const look = Math.cos(facing) < 0 ? -1 : 1;
    if (o.type === 'thug') {
      g.fillStyle(tint(SUB.wood), alpha);
      const bx = x + look * r * 0.95, by = y - r * 0.1;
      const ba = facing + Math.sin(t * 2) * 0.2;
      const at = frame(bx, by, ba);
      fillPts(g, [at(-2, -r * 0.11), at(r * 1.25, -r * 0.2), at(r * 1.25, r * 0.2), at(-2, r * 0.11)]);
    } else if (o.type !== 'runner') {
      // A stubby machine pistol held across the body.
      g.fillStyle(tint(SUB.graphite), alpha);
      const at = frame(x + look * r * 0.75, y + r * 0.15, facing);
      fillPts(g, [at(-r * 0.2, -r * 0.14), at(r * 0.75, -r * 0.14), at(r * 0.75, r * 0.05), at(-r * 0.2, r * 0.05)]);
      fillPts(g, [at(-r * 0.2, 0), at(0, 0), at(-r * 0.06, r * 0.42), at(-r * 0.28, r * 0.42)]);
      if (o.reloading) {
        // The magazine hanging out of it says "not shooting" better than a dimmed sprite.
        g.fillStyle(tint(SUB.gold), alpha);
        const m = at(r * 0.1, r * 0.6);
        g.fillRect(m.x - 2, m.y - 4, 4, 9);
      }
    }
  }

  /** The disco ball from the Light copy, hanging and turning. */
  static drawDisco(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, t: number, alpha: number,
  ): void {
    // The wire it hangs from, so it reads as suspended rather than as floating.
    g.lineStyle(1.4, tint(SUB.graphite), alpha * 0.8);
    strokePts(g, [{ x, y: y - 200 }, { x, y: y - 22 }]);
    discoBallShape(g, tint, x, y, 22, t * 1.2, alpha);
  }

  /** A cloud of cigarette smoke sitting on the arena. */
  static drawSmokeCloud(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, radius: number, t: number, own: boolean, alpha: number,
    puffs: Array<{ ox: number; oy: number; r: number; phase: number; speed: number }>,
  ): void {
    // Your own cover is a thin haze you can see through; theirs is a wall.
    const col = own ? SUB.ash : SUB.ashDark;
    for (const p of puffs) {
      const drift = Math.sin(t * p.speed + p.phase) * radius * 0.12;
      smokeBank(g, x + p.ox + drift, y + p.oy + Math.cos(t * p.speed * 0.8 + p.phase) * radius * 0.08,
        p.r * (0.9 + 0.14 * Math.sin(t * p.speed * 1.3 + p.phase)), p.phase, t,
        tint(col), alpha * (own ? 0.3 : 0.62), 6);
    }
  }

  /** A cigarette being nursed by a fighter. */
  static drawCigarette(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, facing: number, burn: number, t: number, alpha: number,
  ): void {
    cigaretteShape(g, tint, x, y, facing * 0 + 0.12, 15, burn, t, alpha);
    void facing;
  }

  /** Atom-Nhilego's marked ground, counting down to the shot. */
  static drawNhilego(
    g: Phaser.GameObjects.Graphics, tint: SubColorFn,
    x: number, y: number, radius: number, charge: number, t: number, alpha: number,
  ): void {
    g.fillStyle(tint(SUB.neon), alpha * 0.12);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, tint(SUB.neon), alpha * (0.4 + 0.5 * charge));
    g.strokeCircle(x, y, radius);
    // A closing crosshair, so the timer is legible from across the arena.
    const k = 1 - charge;
    for (let i = 0; i < 4; i++) {
      const a = t * 0.8 + i * (Math.PI / 2);
      g.lineStyle(2.4, tint(SUB.neon), alpha * (0.5 + 0.5 * charge));
      strokePts(g, [
        { x: x + Math.cos(a) * radius * (0.35 + k * 0.7), y: y + Math.sin(a) * radius * (0.35 + k * 0.7) },
        { x: x + Math.cos(a) * radius * (0.6 + k * 0.7), y: y + Math.sin(a) * radius * (0.6 + k * 0.7) },
      ]);
    }
    g.fillStyle(tint(SUB.white), alpha * charge * 0.8);
    g.fillCircle(x, y, radius * 0.14 * charge);
  }
}

// ── SubterfugeAura ────────────────────────────────────────────────────────

export type SubAuraStyle =
  | 'bribed'      // bought off — hitting softer, and embarrassed about it
  | 'ignited'     // Soul copy: burning down toward a burnout
  | 'overcharge'  // Electricity copy
  | 'retainer'    // Q+ On Retainer: a contract still open
  | 'covered'     // hidden inside your own smoke
  | 'stunned';    // clobbered by a thug

/**
 * A persistent Subterfuge effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*, because two or three can be up at once: a bribe rains money on
 * you, an ignite climbs, an overcharge crackles outward, a retainer hangs overhead like a
 * signed contract, cover pools at your feet and a stun rings your head.
 */
export class SubterfugeAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: SubColorFn,
    private style: SubAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually a remaining fraction, 0–1. */
  setIntensity(v: number): void { this.intensity = v; }
  setAngle(a: number): void { this.angle = a; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = Phaser.Math.Clamp(this.intensity, 0, 1);
    const r = this.radius;
    const t = this.t;

    switch (this.style) {
      case 'bribed': {
        // Money raining down on them, and a censor bar across the eyes.
        for (let i = 0; i < 5; i++) {
          const p = (t * 0.65 + i / 5) % 1;
          const ox = Math.sin(i * 2.3 + t * 0.7) * r * 1.1;
          banknoteLayered(g, this.tint, x + ox, y - r * 1.6 + p * r * 3,
            i * 1.4 + t * 2.5, 15, 5, alpha * 0.9 * (1 - p * 0.4),
            0.25 + 0.6 * Math.abs(Math.sin(t * 5 + i)), SUB.gold);
        }
        g.fillStyle(this.tint(SUB.ink), alpha * 0.95);
        g.fillRect(x - r * 0.62, y - r * 0.34, r * 1.24, r * 0.34);
        g.fillStyle(this.tint(SUB.blood), alpha * 0.9);
        g.fillRect(x - r * 0.62, y - r * 0.34, r * 1.24 * k, 2);
        break;
      }
      case 'ignited': {
        // Fire climbing the body, dimming as the fuse runs out.
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU;
          const h = r * (0.6 + 0.8 * Math.abs(Math.sin(t * 8 + i * 1.7)));
          g.fillStyle(this.tint(i % 2 === 0 ? SUB.ember : SUB.flame), alpha * 0.55 * (0.4 + k * 0.6));
          fillPts(g, [
            { x: x + Math.cos(a) * r * 0.75, y: y + r * 0.4 },
            { x: x + Math.cos(a + 0.6) * r * 0.75, y: y + r * 0.4 },
            { x: x + Math.cos(a + 0.3) * r * 0.4, y: y + r * 0.4 - h },
          ]);
        }
        break;
      }
      case 'overcharge': {
        // A cage of jagged arcs, re-rolled every frame.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 3;
          const pts: Pt[] = [];
          for (let j = 0; j <= 5; j++) {
            const aa = a + (j / 5) * 1.4;
            const rr = r * (1 + (Math.random() - 0.5) * 0.32);
            pts.push({ x: x + Math.cos(aa) * rr, y: y + Math.sin(aa) * rr });
          }
          g.lineStyle(2, this.tint(SUB.volt), alpha * 0.85);
          strokePts(g, pts);
        }
        break;
      }
      case 'retainer': {
        // A signed contract hanging over your head, corner curling.
        const bob = Math.sin(t * 2.1) * 2.4;
        const cy = y - r * 1.9 + bob;
        g.fillStyle(this.tint(SUB.ink), alpha * 0.4);
        g.fillRect(x - 11, cy - 13, 23, 28);
        g.fillStyle(this.tint(SUB.paper), alpha * 0.95);
        fillPts(g, [
          { x: x - 12, y: cy - 15 }, { x: x + 12, y: cy - 15 },
          { x: x + 12, y: cy + 9 }, { x: x + 6, y: cy + 15 }, { x: x - 12, y: cy + 15 },
        ]);
        g.lineStyle(1, this.tint(SUB.slate), alpha * 0.7);
        for (let i = 0; i < 4; i++) strokePts(g, [{ x: x - 8, y: cy - 9 + i * 5 }, { x: x + 8 - i, y: cy - 9 + i * 5 }]);
        g.fillStyle(this.tint(SUB.blood), alpha);
        g.fillCircle(x + 7, cy + 9, 3);
        break;
      }
      case 'covered': {
        // Haze pooling round the feet and rising — you are somewhere in here.
        smokeBank(g, x, y + r * 0.3, r * (1 + k * 0.35), 0.6, t, this.tint(SUB.ash), alpha * 0.3, 7);
        break;
      }
      case 'stunned': {
        // Stars going round, which is the one universal shorthand for "clobbered".
        for (let i = 0; i < 3; i++) {
          const a = t * 6 + (i / 3) * TAU;
          const sx = x + Math.cos(a) * r * 0.8;
          const sy = y - r * 1.15 + Math.sin(a) * r * 0.24;
          g.fillStyle(this.tint(SUB.gold), alpha * 0.95);
          const pts: Pt[] = [];
          for (let j = 0; j < 10; j++) {
            const aa = (j / 10) * TAU + a;
            const rr = j % 2 === 0 ? 5 : 2.2;
            pts.push({ x: sx + Math.cos(aa) * rr, y: sy + Math.sin(aa) * rr });
          }
          fillPts(g, pts);
        }
        void this.angle;
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── SubterfugeAvatar ──────────────────────────────────────────────────────

/** Concentric discs of one gloved hand, outermost first. */
const SUB_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: SUB.ink, alpha: 0.28 },
    { r: 7.4, color: SUB.charcoal, alpha: 1 },
    { r: 4.6, color: SUB.slate, alpha: 1 },
    { r: 1.9, color: SUB.blood, alpha: 1, ox: -2.1, oy: -2.3 },
  ],
  eyeWhite: SUB.paper,
  eyePupil: SUB.ink,
  // Heavy leather gloves: they swing hard and smear a lot.
  squash: { div: 13, x: 0.55, y: 0.3 },
};

/**
 * The Subterfuge character rig: two gloved fists, a pair of tracking eyes, and a fedora with
 * the week's takings fanned out of the hatband — plus a cigarette that is always lit.
 *
 * The hat is the idea. Nothing else in this kit throws elements around; it pays people to do
 * things. So what has to read on the character is *money and a suit* — a figure who is
 * visibly carrying more cash than he can fit anywhere sensible, before he has cast anything.
 */
export class SubterfugeAvatar extends BaseAvatar {
  private fx: SubterfugeFx;
  /** Crimson for the player, wine for the NPC, so two Subterfuge fighters never blur together. */
  private accent: number;
  /** Wallet fraction, 0–1 — how many notes are actually in the hatband. */
  private wallet = 1;
  /** Cigarette burn, 0–1, or -1 when nothing is lit. */
  private cig = -1;

  constructor(scene: Phaser.Scene, tint: SubColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, SUB_AVATAR);
    this.fx = new SubterfugeFx(scene, tint);
    this.accent = owner === 'player' ? SUB.blood : SUB.wine;
  }

  /** How full the wallet is, 0–1. Notes leave the hatband as it empties. */
  setWallet(v: number): void { this.wallet = Phaser.Math.Clamp(v, 0, 1); }
  /** Burn remaining on the lit cigarette, 0–1; -1 for none. */
  setCigarette(v: number): void { this.cig = v; }

  /**
   * Mastery tell — Big Pockets and Smoke Break, made visible: the fists gain gold knuckle
   * rings, the eyes go gold, and (in drawExtras) the hat gains a wider brim and a second row
   * of notes, a briefcase rides at the hip, and a cigarette stays lit whether or not Smoke
   * Break is running. Shape changes, not brighter tints — a tint alone vanishes in play.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SUB.gold : SUB.paper);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 15 : 11));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2.4, this.tint(SUB.gold), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed cash. */
  protected emitTrail(x: number, y: number): void {
    this.fx.cash(x, y, 1, { speed: 24, size: 9, life: 620, depth: 5, gravity: 30, seal: this.accent });
  }

  /** Hands drawn in low and together — counting a roll of notes. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const count = 0.5 + 0.5 * Math.sin(this.t * 6);
    return {
      ang: this.facing + side * 0.34,
      dist: 21 + count * 3,
      scale: idle.scale * (1 + count * 0.08),
    };
  }

  /** The pool of light a man in a suit stands in, and his shadow. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(SUB.ink), a * 0.4);
    g.fillEllipse(x, y + 12, 50 * k, 17 * k);
    g.fillStyle(this.tint(this.accent), a * 0.12 * k);
    g.fillCircle(x, y, 25 * k);
    if (this.mastered) {
      // Big Pockets: notes lie scattered round his feet because he cannot hold them all.
      for (let i = 0; i < 4; i++) {
        const ang = this.t * 0.3 + (i / 4) * TAU;
        banknoteLayered(g, this.tint,
          x + Math.cos(ang) * 30, y + 14 + Math.sin(ang) * 9,
          ang * 2, 13, 4.4, a * 0.5, 0.15, SUB.gold);
      }
    }
  }

  /**
   * The knuckle rings, and the crown: a fedora with banknotes fanned out of the hatband, a lit
   * cigarette off one side, and — once mastered — a briefcase riding at the hip.
   *
   * Rooted above the head so it never covers the face, and drawn over the sprite so the hat and
   * the cash actually read instead of only the dark crown clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const tint = this.tint;

    // ── Knuckle rings on each fist ──
    if (this.mastered) {
      for (let i = 0; i < 2; i++) {
        const hx = this.armX[i], hy = this.armY[i];
        if (hx === 0 && hy === 0) continue;
        const out = Math.atan2(hy - y, hx - x);
        for (let d = -1; d <= 1; d++) {
          const ang = out + d * 0.55;
          g.fillStyle(tint(SUB.gold), alpha * 0.95);
          g.fillCircle(hx + Math.cos(ang) * 5.4, hy + Math.sin(ang) * 5.4, 2);
        }
      }
    }

    // ── The hat ──
    const bob = Math.sin(this.t * 1.9) * 1.8;
    const rootY = y - 19 + bob;
    const brim = (this.mastered ? 30 : 24) * this.intensity;
    const crown = 13 * this.intensity;
    // Brim first, tilted toward the aim so the hat has a front.
    const tilt = Math.cos(this.facing) * 0.12;
    g.fillStyle(tint(SUB.ink), alpha * 0.45);
    g.fillEllipse(x + 1, rootY + 3.5, brim * 2.05, brim * 0.5);
    g.fillStyle(tint(SUB.charcoal), alpha);
    g.fillEllipse(x + Math.cos(this.facing) * 3, rootY + 2, brim * 2, brim * 0.46);
    // Crown, with a dent down the middle.
    g.fillStyle(tint(SUB.ink), alpha);
    fillPts(g, [
      { x: x - crown * 0.72, y: rootY + 2 }, { x: x - crown * 0.55, y: rootY - crown + tilt * 8 },
      { x: x, y: rootY - crown * 0.82 + tilt * 8 },
      { x: x + crown * 0.55, y: rootY - crown + tilt * 8 }, { x: x + crown * 0.72, y: rootY + 2 },
    ]);
    // Hatband in the house colour.
    g.fillStyle(tint(this.mastered ? SUB.gold : this.accent), alpha);
    g.fillRect(x - crown * 0.7, rootY - 4, crown * 1.4, 3.4);

    // ── The takings, fanned out of the band ──
    const rows = this.mastered ? 2 : 1;
    const per = 3;
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < per; i++) {
        // Notes leave from the outside in as the wallet empties.
        const idx = row * per + i;
        if (idx >= Math.ceil(this.wallet * rows * per + 0.001)) continue;
        const lean = (i - (per - 1) / 2) * 0.42 + Math.sin(this.t * 1.6 + idx) * 0.06;
        const ang = -Math.PI / 2 + lean;
        const d = 9 + row * 6;
        banknoteLayered(g, tint,
          x + Math.cos(ang) * d, rootY - 3 + Math.sin(ang) * d,
          ang + Math.PI / 2, 15, 5.2, alpha * 0.95, 0.12, this.mastered ? SUB.gold : this.accent);
      }
    }

    // ── The cigarette ──
    const burn = this.cig >= 0 ? this.cig : this.mastered ? 0.7 + 0.3 * Math.sin(this.t * 0.4) : -1;
    if (burn >= 0) {
      const side = Math.cos(this.facing) < 0 ? -1 : 1;
      const cx = x + side * 9;
      const cy = y - 1;
      cigaretteShape(g, tint, cx, cy, side > 0 ? 0.18 : Math.PI - 0.18, 14, burn, this.t, alpha);
      // A ribbon of smoke rising off it and bending away.
      for (let i = 0; i < 4; i++) {
        const p = (this.t * 0.55 + i / 4) % 1;
        smokeBank(g, cx + side * 8 + Math.sin(this.t * 2 + i) * 5 * p, cy - 4 - p * 24,
          2.6 + p * 6, i * 1.9, this.t, tint(SUB.ash), alpha * 0.45 * (1 - p), 4);
      }
    }

    // ── Mastery: the briefcase ──
    if (this.mastered) {
      const side = Math.cos(this.facing) < 0 ? 1 : -1;
      const bx = x + side * 26;
      const by = y + 6 + Math.sin(this.t * 2.3) * 2;
      g.fillStyle(tint(SUB.ink), alpha * 0.4);
      g.fillEllipse(bx, by + 12, 22, 6);
      g.fillStyle(tint(SUB.wood), alpha);
      g.fillRect(bx - 10, by - 7, 20, 14);
      g.lineStyle(1.4, tint(SUB.brass), alpha);
      strokePts(g, [{ x: bx - 10, y: by }, { x: bx + 10, y: by }]);
      g.fillStyle(tint(SUB.brass), alpha);
      g.fillRect(bx - 2.4, by - 2, 5, 4);
      strokePts(g, [{ x: bx - 5, y: by - 7 }, { x: bx - 5, y: by - 12 }, { x: bx + 5, y: by - 12 }, { x: bx + 5, y: by - 7 }]);
    }
    void a;
  }
}
