import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Rubber renders: the gum-creature rig (glossy fists, tracking
 * eyes, a spring coil bouncing off the crown), the vulcanized/bounce/fireball auras, and every
 * one-shot effect its abilities throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts. What stays here is what makes rubber rubber: a strand that thins as it
 * stretches, a ball that squashes into whatever it hits, and a ring that overshoots and wobbles
 * back instead of expanding cleanly.
 *
 * Every structural colour must come from the RUBBER palette below. Rubber has no colour-slot
 * cosmetic yet, but every call still routes through the owner's `rubberColor` mapper, so the day
 * one lands it is a table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.rubberColor bound to one owner. */
export type RubberColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const RUBBER = {
  /** Raw gum, from the dark inside of a stretched band to its lit surface. */
  gum: 0x330011,
  maroon: 0x992233,
  rose: 0xff5577,
  blush: 0xff77aa,
  pink: 0xffaacc,
  cream: 0xffddee,
  white: 0xffffff,
  /** Cured black — what Vulcanization turns the whole element into. */
  cured: 0x1a0d12,
  soot: 0x2e1a20,
  /** Heat, once the cure runs past 75%. */
  ember: 0xff4400,
  flame: 0xff7733,
  gold: 0xffcc66,
  charge: 0xffdd00,
  /** The Bouncy Anchor superball. */
  deepBlue: 0x1e5fd0,
  sky: 0x66aaff,
  ice: 0x88ccff,
  /** The anchor once it has been bounced clean off the arena. */
  navy: 0x1a2a6a,
  cobalt: 0x5588ff,
  /** Atom-Nhilego. */
  voidPurple: 0x2a1044,
  amethyst: 0xaa55ff,
  orchid: 0xcc88ff,
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

/** The bowed spine every strand is built on, sampled at `segments + 1` points. */
function strandSpine(
  x1: number, y1: number, x2: number, y2: number, bow: number, segments: number,
): { p: Pt; nx: number; ny: number; t: number }[] {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  // Perpendicular, so the bow pushes sideways off the run rather than along it.
  const px = -uy, py = ux;
  const out: { p: Pt; nx: number; ny: number; t: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const belly = 4 * t * (1 - t);
    out.push({
      p: { x: x1 + dx * t + px * bow * belly, y: y1 + dy * t + py * bow * belly },
      nx: px, ny: py, t,
    });
  }
  return out;
}

/**
 * Rubber's primitive: a **strand** — a length of elastic run between two points, bowed sideways
 * by however much slack it has, with an independent thickness at each end and rounded caps.
 *
 * The whole element is stretch. A punching arm, a slingshot fork, a tether, a bazooka's snaking
 * limb and a torn shred are all this shape with different endpoints, thicknesses and bow. The
 * thing that makes it read as rubber rather than as a rope is the *relationship* the callers keep:
 * the further it is stretched, the thinner and straighter it gets. `strandWidthFor` bakes that in.
 */
export function rubberStrand(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number,
  w1: number, w2: number, bow = 0, segments = 16,
): void {
  const spine = strandSpine(x1, y1, x2, y2, bow, segments);
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (const s of spine) {
    // Slight barrel: a stretched band is fattest just past its root, never a straight taper.
    const w = (w1 + (w2 - w1) * s.t) * (1 + 0.14 * Math.sin(s.t * Math.PI));
    top.push({ x: s.p.x + s.nx * w, y: s.p.y + s.ny * w });
    bot.push({ x: s.p.x - s.nx * w, y: s.p.y - s.ny * w });
  }
  bot.reverse();
  fillPts(g, top.concat(bot));
  g.fillCircle(x1, y1, w1);
  g.fillCircle(x2, y2, w2);
}

/**
 * The primitive in four passes: a dark backing dropped behind it, the gum body, a gloss stripe
 * running its length, and a lit cap at each end.
 *
 * The gloss is what sells it. A flat strand is a noodle; a strand with a highlight that follows
 * its bow is something wet, taut and about to let go.
 */
export function rubberStrandLayered(
  g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
  x1: number, y1: number, x2: number, y2: number,
  w1: number, w2: number, bow: number, color: number, alpha: number, gloss = true,
): void {
  g.fillStyle(tint(RUBBER.gum), alpha * 0.5);
  rubberStrand(g, x1 + 1.5, y1 + 2.2, x2 + 1.5, y2 + 2.2, w1 * 1.1, w2 * 1.1, bow);

  g.fillStyle(tint(color), alpha);
  rubberStrand(g, x1, y1, x2, y2, w1, w2, bow);

  if (!gloss) return;
  // Highlight riding the outside of the bow, thinner than the strand and pulled back off both
  // ends so it reads as a reflection rather than as a second strand.
  const spine = strandSpine(x1, y1, x2, y2, bow, 16);
  const lit: Pt[] = [];
  const litBack: Pt[] = [];
  for (let i = 2; i <= 14; i++) {
    const s = spine[i];
    const w = (w1 + (w2 - w1) * s.t) * 0.34;
    const off = (w1 + (w2 - w1) * s.t) * 0.36;
    lit.push({ x: s.p.x - s.nx * (off - w), y: s.p.y - s.ny * (off - w) });
    litBack.push({ x: s.p.x - s.nx * (off + w), y: s.p.y - s.ny * (off + w) });
  }
  litBack.reverse();
  g.fillStyle(tint(RUBBER.cream), alpha * 0.55);
  fillPts(g, lit.concat(litBack));
}

/**
 * Half-width for a strand at a given stretch. Rubber conserves volume: pulling it to twice its
 * resting length makes it visibly thinner, and that is the single cue that tells a player how
 * much tension they are holding.
 */
export function strandWidthFor(base: number, stretch: number): number {
  return base / Math.sqrt(Math.max(0.4, 1 + stretch * 1.9));
}

// ── Element shapes ────────────────────────────────────────────────────────

/**
 * A rubber ball: squashed along whatever direction it is travelling, with a dark occluded
 * underside, a hard specular blob and a seam that turns with its spin.
 *
 * @param squash 0 = at rest, 1 = fully flattened by impact or speed
 */
export function rubberBall(
  g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
  cx: number, cy: number, r: number, angle: number, squash: number,
  color: number, alpha: number, seam = 0, rim: number = RUBBER.pink,
): void {
  const s = Phaser.Math.Clamp(squash, 0, 1);
  const along = r * (1 + s * 0.55);
  const across = r * (1 - s * 0.34);
  const at = frame(cx, cy, angle);

  const body = (rx: number, ry: number, ox: number, oy: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      pts.push(at(ox + Math.cos(a) * rx, oy + Math.sin(a) * ry));
    }
    return pts;
  };

  g.fillStyle(tint(RUBBER.gum), alpha * 0.4);
  fillPts(g, body(along, across, 1.2, 2.2));
  g.fillStyle(tint(color), alpha);
  fillPts(g, body(along, across, 0, 0));
  // Occluded underside — a ball without one is a disc.
  g.fillStyle(tint(RUBBER.gum), alpha * 0.28);
  fillPts(g, body(along * 0.82, across * 0.5, 0, across * 0.44));
  // Seam, turning with the spin.
  if (seam !== 0) {
    g.lineStyle(Math.max(1, r * 0.12), tint(RUBBER.gum), alpha * 0.4);
    const sp: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      sp.push(at(-along + u * along * 2, Math.sin(u * Math.PI) * across * 0.7 * Math.cos(seam)));
    }
    strokePts(g, sp);
  }
  g.fillStyle(tint(RUBBER.white), alpha * 0.8);
  const hi = at(-along * 0.34, -across * 0.4);
  g.fillEllipse(hi.x, hi.y, along * 0.44, across * 0.3);
  g.lineStyle(Math.max(1.2, r * 0.13), tint(rim), alpha * 0.9);
  strokePts(g, body(along, across, 0, 0), true);
}

/**
 * An elastic ring: it overshoots its target radius and springs back, and its edge ripples in
 * standing lobes on the way. Rubber does not emit clean shockwaves — everything it does boings.
 */
export function boingRing(
  g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
  cx: number, cy: number, radius: number, wobble: number, phase: number,
  color: number, alpha: number, width = 4, lobes = 6,
): void {
  const segs = Phaser.Math.Clamp(Math.round(radius / 3), 20, 72);
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * TAU;
    const r = radius * (1 + wobble * Math.cos(a * lobes + phase));
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.lineStyle(width * 1.8, tint(RUBBER.gum), alpha * 0.35);
  strokePts(g, pts.map((p) => ({ x: p.x, y: p.y + 1.6 })), true);
  g.lineStyle(width, tint(color), alpha);
  strokePts(g, pts, true);
  g.lineStyle(width * 0.34, tint(RUBBER.cream), alpha * 0.7);
  strokePts(g, pts.map((p) => ({ x: p.x - 0.8, y: p.y - 1 })), true);
}

/** A torn shred of rubber: an irregular lobed blob, deliberately never a circle. */
export function rubberShred(
  g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
  cx: number, cy: number, size: number, spin: number, seed: number,
  color: number, alpha: number,
): void {
  const at = frame(cx, cy, spin);
  const pts: Pt[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const r = size * (0.6 + 0.55 * Math.abs(Math.sin(seed + i * 2.399)));
    pts.push(at(Math.cos(a) * r, Math.sin(a) * r * 0.78));
  }
  g.fillStyle(tint(RUBBER.gum), alpha * 0.45);
  fillPts(g, pts.map((p) => ({ x: p.x + 1, y: p.y + 1.6 })));
  g.fillStyle(tint(color), alpha);
  fillPts(g, pts);
  g.fillStyle(tint(RUBBER.cream), alpha * 0.5);
  const hi = at(-size * 0.25, -size * 0.3);
  g.fillCircle(hi.x, hi.y, size * 0.24);
}

/** A fist: a ball with four knuckle bumps along its leading edge. */
export function rubberFist(
  g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
  cx: number, cy: number, angle: number, r: number, squash: number,
  color: number, alpha: number,
): void {
  rubberBall(g, tint, cx, cy, r, angle, squash, color, alpha, 0, RUBBER.pink);
  const at = frame(cx, cy, angle);
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) / 1.5;
    const k = at(r * (0.62 - Math.abs(off) * 0.12), off * r * 0.52);
    g.fillStyle(tint(color), alpha);
    g.fillCircle(k.x, k.y, r * 0.27);
    g.fillStyle(tint(RUBBER.cream), alpha * 0.45);
    g.fillCircle(k.x - r * 0.07, k.y - r * 0.09, r * 0.11);
  }
}

// ── RubberFx ──────────────────────────────────────────────────────────────

export interface RubberBoomOpts {
  /** Shreds thrown clear. Defaults to radius/9. */
  shreds?: number;
  /** Elastic rings, each a beat behind the last. Defaults to 2. */
  rings?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a scuff on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot rubber effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class RubberFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: RubberColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the RUBBER default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 9, color: number = RUBBER.rose): void {
    this.flashIn(x, y, radius, RUBBER.white, color, depth);
  }

  /**
   * The signature: a ring that shoots past its target radius, springs back under it, and settles.
   * Everything this element does bounces, including its shockwaves.
   */
  boing(
    x: number, y: number, from: number, to: number, color: number,
    duration = 420, depth = 8, width = 5,
  ): void {
    const phase = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      // Damped overshoot: past `to` at ~60%, back under, then settled.
      const spring = 1 - Math.cos(t * Math.PI * 1.9) * Math.exp(-t * 3.4);
      const r = from + (to - from) * Phaser.Math.Clamp(spring * 0.72, 0, 1.35);
      const a = (1 - easeIn(t)) * 0.9;
      boingRing(g, this.tint, x, y, r, 0.055 * (1 - t), phase + t * 5, color, a, width * (1 - t * 0.5));
    });
  }

  /** Torn rubber flung out of something and bouncing along the ground. */
  shreds(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const speed = o.speed ?? 220;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 7;
    const life = o.life ?? 620;
    const depth = o.depth ?? 9;
    const color = o.color ?? RUBBER.rose;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.4 + Math.random()),
      s: size * (0.5 + Math.random() * 0.9),
      spin: (Math.random() - 0.5) * 14,
      seed: Math.random() * 10,
      hop: 0.6 + Math.random() * 0.8,
      delay: Math.random() * 0.18,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        // A shred that bounces reads as rubber; one that arcs and lands reads as debris.
        const bounce = Math.abs(Math.sin(lt * Math.PI * 2.4)) * (1 - lt) * 26 * p.hop;
        rubberShred(g, this.tint, x + Math.cos(p.a) * d, y + Math.sin(p.a) * d + 60 * lt * lt - bounce,
          p.s * (1 - lt * 0.3), p.a + p.spin * lt, p.seed, color, 0.95 * (1 - lt * lt));
      }
    });
  }

  /** Fine rubber dust — what a scuffed skid or a hot band gives off. */
  motes(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; drift?: number } = {},
  ): void {
    const speed = o.speed ?? 100;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 2.2;
    const life = o.life ?? 620;
    const depth = o.depth ?? 8;
    const color = o.color ?? RUBBER.blush;
    const drift = o.drift ?? 26;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.3 + Math.random()),
      s: size * (0.5 + Math.random()),
      delay: Math.random() * 0.22,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const px = x + Math.cos(p.a) * d;
        const py = y + Math.sin(p.a) * d + drift * lt * lt;
        g.fillStyle(this.tint(color), 0.85 * (1 - lt * lt));
        g.fillCircle(px, py, p.s * (1 - lt * 0.5));
      }
    });
  }

  /** A band letting go: the strand whips thin, snaps, and both halves recoil out of frame. */
  snap(
    x1: number, y1: number, x2: number, y2: number,
    o: { color?: number; width?: number; duration?: number; depth?: number } = {},
  ): void {
    const color = o.color ?? RUBBER.rose;
    const w = o.width ?? 5;
    const dur = o.duration ?? 300;
    const depth = o.depth ?? 9;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const flip = Math.random() < 0.5 ? 1 : -1;
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - easeIn(t);
      // Both halves whip away from where the break happened, curling as they go.
      const curl = flip * 40 * easeOut(t);
      const back = easeOut(t);
      rubberStrandLayered(g, this.tint, x1, y1,
        mx + (x1 - mx) * back, my + (y1 - my) * back,
        w * fade, 1, curl, color, fade);
      rubberStrandLayered(g, this.tint, x2, y2,
        mx + (x2 - mx) * back, my + (y2 - my) * back,
        w * fade, 1, -curl, color, fade);
    });
    this.motes(mx, my, 6, { speed: 120, size: 2, life: 420, color });
  }

  /** A skid mark: two dark scuffs the shape of something that slid rather than landed. */
  scuff(x: number, y: number, radius: number, depth = 3, color: number = RUBBER.gum): void {
    const a = Math.random() * TAU;
    this.anim(depth, 1500, (g, t) => {
      const alpha = (t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92) * 0.42;
      const at = frame(x, y, a);
      for (const off of [-radius * 0.3, radius * 0.3]) {
        const p1 = at(-radius, off);
        const p2 = at(radius, off * 1.4);
        g.fillStyle(this.tint(color), alpha);
        rubberStrand(g, p1.x, p1.y, p2.x, p2.y, radius * 0.16, radius * 0.05, radius * 0.2);
      }
    });
  }

  /** A dash smear: the body stretched into a comet along its own path, the way rubber would. */
  smear(
    x1: number, y1: number, x2: number, y2: number,
    o: { color?: number; width?: number; duration?: number; depth?: number } = {},
  ): void {
    const color = o.color ?? RUBBER.rose;
    const w = o.width ?? 16;
    const dur = o.duration ?? 340;
    const depth = o.depth ?? 6;
    const a = Math.atan2(y2 - y1, x2 - x1);
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - t;
      rubberStrandLayered(g, this.tint, x1, y1, x2, y2, w * 0.3 * fade, w * fade, 0, color, 0.5 * fade);
      rubberBall(g, this.tint, x2, y2, w * 0.75 * fade, a, 0.6, color, 0.7 * fade);
    });
  }

  /**
   * A full impact: white core, an elastic ring that overshoots, a second one behind it, shreds
   * torn loose, dust, a scuff on the floor and a squash-flattened core.
   */
  boom(x: number, y: number, radius: number, o: RubberBoomOpts = {}): void {
    const color = o.color ?? RUBBER.rose;
    const bits = o.shreds ?? Math.max(4, Math.round(radius / 9));
    const rings = o.rings ?? 2;
    const dur = o.duration ?? Math.round(360 + radius * 1.2);
    const depth = o.depth ?? 9;

    if (o.mark !== false) this.scuff(x, y, radius * 0.55, depth - 6, RUBBER.gum);
    this.flash(x, y, radius * 0.42, depth + 2, color);
    for (let i = 0; i < rings; i++) {
      this.scene.time.delayedCall(i * 90, () =>
        this.boing(x, y, radius * 0.2, radius * (1 + i * 0.24),
          i === 0 ? color : RUBBER.cream, Math.round(dur * (0.85 + i * 0.2)), depth, 6 - i * 2));
    }
    this.shreds(x, y, bits, {
      speed: radius * 2.3, size: 6 + radius / 12, life: Math.round(dur * 1.3), depth: depth + 1, color,
    });
    this.motes(x, y, bits * 2, { speed: radius * 1.7, size: 2.2, life: Math.round(dur * 1.4), depth, color: RUBBER.pink });
  }

  /**
   * A wind-up: strands coiling *inward* onto a point with a containment ring tightening behind
   * them, so a released punch reads as stored tension rather than as a sudden decision.
   */
  windUp(
    x: number, y: number, radius: number, duration: number,
    o: { color?: number; depth?: number; follow?: () => { x: number; y: number } } = {},
  ): void {
    const color = o.color ?? RUBBER.rose;
    const depth = o.depth ?? 7;
    const follow = o.follow;
    this.anim(depth, duration, (g, t) => {
      const c = follow ? follow() : { x, y };
      const k = easeIn(t);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + t * 4.2;
        const d = radius * (1.5 - k * 1.15);
        rubberStrandLayered(g, this.tint,
          c.x + Math.cos(a) * d, c.y + Math.sin(a) * d,
          c.x + Math.cos(a + 0.9) * d * 0.4, c.y + Math.sin(a + 0.9) * d * 0.4,
          3.5 * (1 - k * 0.4), 1.4, 10 * (1 - k), color, 0.35 + 0.5 * t);
      }
      boingRing(g, this.tint, c.x, c.y, radius * (1.55 - k * 1.1), 0.05, t * 8,
        t > 0.94 ? RUBBER.charge : color, 0.35 + 0.5 * t, 2 + t * 2);
    });
  }

  /** Heat coming off cured rubber: a shimmer of rising wisps. */
  heatBurst(x: number, y: number, radius: number, depth = 8): void {
    this.anim(depth, 620, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + i;
        const d = radius * (0.4 + t * 0.9);
        rubberStrandLayered(g, this.tint,
          x + Math.cos(a) * d, y + Math.sin(a) * d,
          x + Math.cos(a) * d * 0.6, y + Math.sin(a) * d * 0.6 - 22 * t,
          4 * fade, 1, 9 * Math.sin(t * 7 + i), i % 2 === 0 ? RUBBER.flame : RUBBER.gold, fade * 0.85, false);
      }
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // how far a punch has extended, how much tension a band is under, how fast a ball is going.

  /**
   * The stretching punch arm: a strand from the shoulder out to the fist, visibly thinning as it
   * extends and bowing under its own recoil, ending in a knuckled fist that squashes on contact.
   */
  static drawPunchArm(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    fromX: number, fromY: number, fistX: number, fistY: number,
    reachRatio: number, hot: boolean, t: number,
  ): void {
    const angle = Math.atan2(fistY - fromY, fistX - fromX);
    const body = hot ? RUBBER.flame : RUBBER.rose;
    // The further it goes, the thinner the arm — volume has to come from somewhere.
    const w = strandWidthFor(9, reachRatio);
    // The arm lags the fist: a whip-bow that flattens out as the punch lands.
    const bow = 16 * (1 - reachRatio) * Math.sin(t * 9);
    rubberStrandLayered(g, tint, fromX, fromY, fistX, fistY, w * 1.5, w, bow, body, 0.95);
    if (hot) {
      g.fillStyle(tint(RUBBER.gold), 0.25 + 0.15 * Math.sin(t * 14));
      rubberStrand(g, fromX, fromY, fistX, fistY, w * 2.1, w * 1.5, bow);
    }
    rubberFist(g, tint, fistX, fistY, angle, 13, Phaser.Math.Clamp(reachRatio * 0.5, 0, 0.5), body, 1);
  }

  /**
   * The slingshot: two strands running to their wall anchors, thinning as the pouch is hauled
   * back, plus the pouch itself cradling whoever is about to be fired out of it.
   */
  static drawSlingV(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    px: number, py: number, ax: number, ay: number, bx: number, by: number,
    tension: number, t: number,
  ): void {
    const w = strandWidthFor(6, tension * 1.6);
    for (const [hx, hy] of [[ax, ay], [bx, by]] as const) {
      rubberStrandLayered(g, tint, hx, hy, px, py, 5, w, 6 * (1 - tension) * Math.sin(t * 3), RUBBER.rose, 0.92);
      // The wall clamp: a bolted pad the band is anchored through.
      g.fillStyle(tint(RUBBER.gum), 0.9);
      g.fillCircle(hx, hy, 8);
      g.fillStyle(tint(RUBBER.pink), 0.95);
      g.fillCircle(hx, hy, 5.5);
      g.fillStyle(tint(RUBBER.white), 0.8);
      g.fillCircle(hx - 1.6, hy - 1.8, 2.2);
    }
    // Pouch: a band of leather-thick rubber wrapped across the pull direction.
    const mid = Math.atan2((ay + by) / 2 - py, (ax + bx) / 2 - px);
    const at = frame(px, py, mid + Math.PI / 2);
    const p1 = at(-14, 0), p2 = at(14, 0);
    rubberStrandLayered(g, tint, p1.x, p1.y, p2.x, p2.y, 4.5, 4.5, -9, RUBBER.maroon, 0.95);
    // Tension marks: the tighter it is pulled, the more the band whitens where it strains.
    if (tension > 0.4) {
      g.lineStyle(1.6, tint(RUBBER.cream), (tension - 0.4) * 1.4);
      strokePts(g, [{ x: ax, y: ay }, { x: px, y: py }, { x: bx, y: by }]);
    }
  }

  /**
   * The Rubber Banding tether: a strand from anchor to owner that sags when slack, thins and
   * straightens under tension, and whitens at the anchor once it is close to snapping taut.
   */
  static drawBand(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    ax: number, ay: number, px: number, py: number, tension: number, t: number,
  ): void {
    const w = strandWidthFor(5.5, tension * 2.2);
    // Slack hangs; taut is dead straight. That contrast is how a player reads their leash.
    const sag = (1 - tension) * 34 + Math.sin(t * 2.6) * 3 * (1 - tension);
    rubberStrandLayered(g, tint, ax, ay, px, py, w, w * 1.2, sag, RUBBER.blush, 0.9);
    if (tension > 0.55) {
      // Strain: the band pales and starts to buzz.
      const strain = (tension - 0.55) / 0.45;
      g.fillStyle(tint(RUBBER.cream), strain * 0.55);
      rubberStrand(g, ax, ay, px, py, w * 0.4, w * 0.4, sag + Math.sin(t * 30) * strain * 3);
    }
  }

  /** The anchor: dead weight in a rubber collar, or the glossy superball F+ turns it into. */
  static drawAnchor(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    x: number, y: number, radius: number, bouncy: boolean, hot: boolean, spin: number, t: number,
  ): void {
    g.fillStyle(tint(RUBBER.gum), 0.4);
    g.fillEllipse(x, y + radius * 0.9, radius * 2.1, radius * 0.8);
    if (hot) {
      // Fire mode telegraphs its 3 s pulse with a breathing heat ring.
      g.fillStyle(tint(RUBBER.flame), 0.16 + 0.1 * Math.sin(t * 5));
      g.fillCircle(x, y, radius * (2.4 + 0.25 * Math.sin(t * 5)));
    }
    if (bouncy) {
      rubberBall(g, tint, x, y, radius, spin, 0, RUBBER.deepBlue, 1, spin, RUBBER.ice);
      // Two stripes, so the spin is legible while it rolls.
      for (const off of [-0.5, 0.5]) {
        const at = frame(x, y, spin);
        const s1 = at(-radius * 0.9, off * radius * 0.75);
        const s2 = at(radius * 0.9, off * radius * 0.75);
        g.fillStyle(tint(RUBBER.sky), 0.75);
        rubberStrand(g, s1.x, s1.y, s2.x, s2.y, radius * 0.11, radius * 0.11, 0);
      }
    } else {
      rubberBall(g, tint, x, y, radius, spin, 0, RUBBER.cured, 1, 0, RUBBER.rose);
      // The collar the band is knotted through.
      g.lineStyle(3, tint(RUBBER.rose), 0.95);
      g.strokeCircle(x, y, radius * 0.68);
    }
  }

  /**
   * The Bazooka fist: the arm snakes along every position the fist has visited, so a shot that
   * has been round three walls drags a genuine rubber tangle behind it.
   */
  static drawBazookaArm(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    ownerX: number, ownerY: number, path: Pt[], fx: number, fy: number, hot: boolean, t: number,
  ): void {
    const color = hot ? RUBBER.flame : RUBBER.rose;
    let px = ownerX, py = ownerY;
    const total = Math.max(1, path.length);
    // Sampled, not per-point: a 200-point path drawn strand-by-strand is both slow and mush.
    const step = Math.max(1, Math.floor(total / 26));
    for (let i = 0; i < total; i += step) {
      const p = path[i];
      const u = i / total;
      const w = strandWidthFor(8, u * 1.4);
      rubberStrandLayered(g, tint, px, py, p.x, p.y, w, w, 0, color, 0.85, false);
      px = p.x; py = p.y;
    }
    rubberStrandLayered(g, tint, px, py, fx, fy, 5.5, 6, 0, color, 0.9, false);
    rubberFist(g, tint, fx, fy, Math.atan2(fy - py, fx - px), 15, 0.25, color, 1);
    if (hot) {
      g.fillStyle(tint(RUBBER.gold), 0.3 + 0.15 * Math.sin(t * 16));
      g.fillCircle(fx, fy, 20);
    }
  }

  /** One Rubberage ball: squashed along its heading, spinning, and glowing if the rubber is cured. */
  static drawRageBall(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    x: number, y: number, vx: number, vy: number, radius: number,
    hot: boolean, maxSpeed: number, t: number,
  ): void {
    const speed = Math.hypot(vx, vy);
    const a = Math.atan2(vy, vx);
    // The faster it goes the more it stretches — the swarm visibly winds up over its 10 s.
    const squash = Phaser.Math.Clamp(speed / maxSpeed, 0, 1) * 0.6;
    if (hot) {
      g.fillStyle(tint(RUBBER.flame), 0.22);
      g.fillCircle(x, y, radius * 2.4);
    }
    // Motion ghost, one frame back.
    rubberBall(g, tint, x - vx * 0.012, y - vy * 0.012, radius * 0.85, a, squash,
      hot ? RUBBER.ember : RUBBER.maroon, 0.35, 0, hot ? RUBBER.gold : RUBBER.blush);
    rubberBall(g, tint, x, y, radius, a, squash,
      hot ? RUBBER.flame : RUBBER.rose, 1, t * 6 + x * 0.05, hot ? RUBBER.gold : RUBBER.pink);
  }

  /** The Bounce Form paddle: a flattened capsule that ripples along its length. */
  static drawBounceForm(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    const at = frame(x, y, angle);
    const half = 48;
    const top: Pt[] = [], bot: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      // The whole slab wobbles as one taut membrane, not as a rigid bar.
      const h = 9 * (0.7 + 0.5 * Math.sin(u * Math.PI)) * (1 + 0.16 * Math.sin(t * 12 - u * 5));
      top.push(at(-half + u * half * 2, -h));
      bot.push(at(-half + u * half * 2, h));
    }
    bot.reverse();
    g.fillStyle(tint(RUBBER.gum), 0.45);
    fillPts(g, top.concat(bot).map((p) => ({ x: p.x + 1.5, y: p.y + 2.5 })));
    g.fillStyle(tint(RUBBER.rose), 0.98);
    fillPts(g, top.concat(bot));
    // Gloss: a thin band hugging the top edge, so the slab reads as a wet membrane.
    g.fillStyle(tint(RUBBER.cream), 0.5);
    fillPts(g, top.concat(top.slice().reverse().map((p) => ({ x: p.x, y: p.y + 3.4 }))));
    g.lineStyle(2.4, tint(RUBBER.pink), 1);
    strokePts(g, top.concat(bot), true);
    // The reflect radius, marked so the player knows where their paddle actually catches.
    boingRing(g, tint, x, y, 50, 0.03, t * 4, RUBBER.pink, 0.22 + 0.1 * Math.sin(t * 6), 2);
  }

  /** An Atom-Nhilego collapse zone: a purple bubble contracting onto its fuse. */
  static drawNhilegoZone(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    x: number, y: number, radius: number, fuse: number, mine: boolean, t: number,
  ): void {
    // fuse: 0 just opened → 1 about to go off.
    const r = radius * (1 - 0.12 * fuse + 0.03 * Math.sin(t * 6));
    const rim = mine ? RUBBER.orchid : RUBBER.rose;
    g.fillStyle(tint(RUBBER.voidPurple), 0.5 + 0.2 * fuse);
    g.fillCircle(x, y, r);
    g.fillStyle(tint(RUBBER.amethyst), 0.1 + 0.14 * fuse);
    g.fillCircle(x, y, r * 0.7);
    // Strands hauling the bubble's own skin inward — this is a *collapse*, not a puddle.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + t * 0.6;
      const outer = r * (1 - 0.05 * Math.sin(t * 5 + i));
      rubberStrandLayered(g, tint,
        x + Math.cos(a) * outer, y + Math.sin(a) * outer,
        x + Math.cos(a) * r * (0.5 - fuse * 0.3), y + Math.sin(a) * r * (0.5 - fuse * 0.3),
        3.2, 1.2, 6 * Math.sin(t * 3 + i), rim, 0.45 + 0.4 * fuse, false);
    }
    boingRing(g, tint, x, y, r, 0.03 + 0.03 * fuse, t * 5, rim, 0.85, 3);
    g.fillStyle(tint(RUBBER.white), 0.25 + 0.5 * fuse * fuse);
    g.fillCircle(x, y, 4 + 10 * fuse * fuse);
  }

  /** The bounced-off anchor, flying free with a stack of after-images behind it. */
  static drawFreeAnchor(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    x: number, y: number, vx: number, vy: number, radius: number,
  ): void {
    const a = Math.atan2(vy, vx);
    for (let i = 4; i >= 1; i--) {
      rubberBall(g, tint, x - vx * 0.008 * i, y - vy * 0.008 * i, radius * (1 - i * 0.07), a, 0.5,
        RUBBER.cobalt, 0.16 * (5 - i), 0, RUBBER.ice);
    }
    rubberBall(g, tint, x, y, radius, a, 0.5, RUBBER.navy, 1, a, RUBBER.cobalt);
  }

  /**
   * The Bouncy House coating: a padded rubber bumper strip running the arena walls, segmented
   * into bulges so it reads as something a body would rebound off rather than as a border.
   */
  static drawWallCoating(
    g: Phaser.GameObjects.Graphics, tint: RubberColorFn,
    bx: number, by: number, bw: number, bh: number, hot: boolean, t: number,
  ): void {
    const color = hot ? RUBBER.flame : RUBBER.rose;
    const runs: [number, number, number, number][] = [
      [bx, by, bx + bw, by],
      [bx + bw, by, bx + bw, by + bh],
      [bx + bw, by + bh, bx, by + bh],
      [bx, by + bh, bx, by],
    ];
    for (let r = 0; r < runs.length; r++) {
      const [x1, y1, x2, y2] = runs[r];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const pads = Math.max(3, Math.round(len / 90));
      for (let i = 0; i < pads; i++) {
        const u0 = i / pads, u1 = (i + 1) / pads;
        const ax = x1 + (x2 - x1) * u0, ay = y1 + (y2 - y1) * u0;
        const cx = x1 + (x2 - x1) * u1, cy = y1 + (y2 - y1) * u1;
        // Each pad breathes on its own phase, so the whole ring never pulses in lockstep.
        const puff = 5 + 1.6 * Math.sin(t * 2.4 + i * 1.3 + r);
        rubberStrandLayered(g, tint, ax, ay, cx, cy, puff, puff, 0, color, 0.6, true);
      }
    }
  }
}

// ── RubberAura ────────────────────────────────────────────────────────────

export type RubberAuraStyle =
  | 'vulc'      // Vulcanization: cured skin, and heat once it runs hot
  | 'fireball'  // a vulcanized sling launch, riding across the arena alight
  | 'ball'      // Q+ purple player-ball
  | 'burn'      // the fire DOT, seen on the victim
  | 'bounce';   // Bounce Form's reflect field

/**
 * A persistent rubber effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: a cure plates you, a fireball trails, a ball squashes, a burn
 * licks upward and a reflect field encloses. Several can be up at once, so they must stay
 * separable at a glance.
 */
export class RubberAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: RubberColorFn,
    private style: RubberAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually how far along the effect is — the cure level, or a remaining fraction. */
  setIntensity(v: number): void { this.intensity = v; }
  /** Facing, for the styles that have a front. */
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
      case 'vulc': {
        // Cured plating creeping over the body, and heat only once it is properly hot.
        const hot = k >= 0.75;
        const plates = Math.round(3 + k * 6);
        for (let i = 0; i < plates; i++) {
          const a = (i / plates) * TAU + t * 0.25;
          const px = x + Math.cos(a) * r * 0.88;
          const py = y + Math.sin(a) * r * 0.82;
          g.fillStyle(this.tint(hot ? RUBBER.soot : RUBBER.cured), alpha * (0.5 + 0.4 * k));
          rubberShred(g, this.tint, px, py, 7 + k * 3, a, i * 1.7, hot ? RUBBER.soot : RUBBER.cured, alpha * (0.5 + 0.4 * k));
        }
        boingRing(g, this.tint, x, y, r * (1 + 0.03 * Math.sin(t * 4)), 0.03, t * 3,
          hot ? RUBBER.flame : RUBBER.maroon, alpha * (0.3 + 0.5 * k), 2 + k * 2);
        if (hot) {
          g.fillStyle(this.tint(RUBBER.flame), alpha * 0.16 * (0.8 + 0.2 * Math.sin(t * 6)));
          g.fillCircle(x, y, r * 1.15);
          // Wisps peeling off the cure.
          for (let i = 0; i < 4; i++) {
            const p = (t * 1.3 + i / 4) % 1;
            const a = (i / 4) * TAU + Math.sin(t + i) * 0.5;
            rubberStrandLayered(g, this.tint,
              x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.6,
              x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.4 - 20 * p,
              3.4 * (1 - p), 1, 7 * Math.sin(t * 6 + i), RUBBER.gold, alpha * 0.8 * (1 - p), false);
          }
        }
        break;
      }
      case 'fireball': {
        // A body that has become a burning ball: stretched along its heading, shedding flame.
        g.fillStyle(this.tint(RUBBER.ember), alpha * 0.2);
        g.fillCircle(x, y, r * 1.5);
        rubberBall(g, this.tint, x, y, r * 0.95, this.angle, 0.45, RUBBER.flame, alpha * 0.75, 0, RUBBER.gold);
        for (let i = 0; i < 5; i++) {
          const p = (t * 2.2 + i / 5) % 1;
          const back = this.angle + Math.PI + (i - 2) * 0.22;
          rubberStrandLayered(g, this.tint,
            x + Math.cos(back) * r * 0.6, y + Math.sin(back) * r * 0.6,
            x + Math.cos(back) * r * (0.9 + p * 1.6), y + Math.sin(back) * r * (0.9 + p * 1.6),
            5 * (1 - p), 1, 10 * Math.sin(t * 9 + i), i % 2 ? RUBBER.gold : RUBBER.ember,
            alpha * 0.85 * (1 - p), false);
        }
        break;
      }
      case 'ball': {
        // Q+ : you *are* one of the swarm now, and the aura is the gloss on your shell.
        g.fillStyle(this.tint(RUBBER.amethyst), alpha * 0.16);
        g.fillCircle(x, y, r * 1.1);
        rubberBall(g, this.tint, x, y, r * 0.7, this.angle, 0.45, RUBBER.amethyst, alpha * 0.85,
          t * 7, RUBBER.orchid);
        boingRing(g, this.tint, x, y, r * 0.95, 0.05, t * 9, RUBBER.orchid, alpha * 0.55, 2);
        break;
      }
      case 'burn': {
        // On the victim: licks rising off them, so the DOT is readable between ticks.
        g.fillStyle(this.tint(RUBBER.ember), alpha * 0.2);
        g.fillCircle(x, y, r);
        for (let i = 0; i < 6; i++) {
          const p = (t * 1.9 + i / 6) % 1;
          const ox = Math.sin(i * 2.4 + t * 3) * r * 0.6;
          rubberStrandLayered(g, this.tint,
            x + ox, y + r * 0.4,
            x + ox * 0.5, y + r * 0.4 - (10 + p * 26),
            4.5 * (1 - p), 1, 6 * Math.sin(t * 8 + i), p < 0.5 ? RUBBER.ember : RUBBER.gold,
            alpha * 0.9 * (1 - p), false);
        }
        break;
      }
      case 'bounce': {
        // The reflect field: a taut membrane you can see incoming fire would slap off.
        for (let i = 0; i < 3; i++) {
          boingRing(g, this.tint, x, y, r * (0.7 + i * 0.2), 0.045, t * (6 - i * 1.4),
            i === 1 ? RUBBER.pink : RUBBER.rose, alpha * (0.5 - i * 0.12), 3 - i * 0.6);
        }
        g.fillStyle(this.tint(RUBBER.rose), alpha * 0.1 * (0.8 + 0.2 * Math.sin(t * 7)));
        g.fillCircle(x, y, r * k);
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── RubberAvatar ──────────────────────────────────────────────────────────

/** Concentric discs of one glossy gum fist, outermost first. */
const RUBBER_AVATAR: AvatarSpec = {
  hands: [
    { r: 12.5, color: RUBBER.rose, alpha: 0.2 },
    { r: 8, color: RUBBER.maroon, alpha: 1 },
    { r: 5.4, color: RUBBER.rose, alpha: 1 },
    { r: 2.2, color: RUBBER.white, alpha: 1, ox: -2.4, oy: -2.6 },
  ],
  eyeWhite: RUBBER.cream,
  eyePupil: RUBBER.gum,
  // Rubber hands are the loosest thing in the game: they lag hard and smear a long way.
  squash: { div: 9, x: 0.78, y: 0.42 },
};

/**
 * The rubber character rig: two glossy gum fists on very loose springs, a pair of tracking eyes,
 * and a coiled spring bouncing off the crown that compresses and rebounds as the fighter moves.
 *
 * The spring is the idea. This element's whole vocabulary is *stored tension*, and a character
 * wearing a visible coil that is always half-compressed reads as rubber before it has thrown
 * anything.
 */
export class RubberAvatar extends BaseAvatar {
  private fx: RubberFx;
  /** Hot for the player, cool for the NPC, so two rubber fighters never blur together. */
  private accent: number;
  /** The crown coil's own spring state, so it overshoots the body rather than tracking it. */
  private coil = 0;
  private coilVel = 0;
  private lastY = 0;

  constructor(scene: Phaser.Scene, tint: RubberColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, RUBBER_AVATAR);
    this.fx = new RubberFx(scene, tint);
    this.accent = owner === 'player' ? RUBBER.rose : RUBBER.cobalt;
  }

  /**
   * Mastery tell — Vulcanization, made visible: the fists go cured black under a hot rim, the
   * eyes turn molten, the corona widens and the crown coil gains a turn (see drawExtras). Shape
   * changes, not brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? RUBBER.gold : RUBBER.cream);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 16.5 : 12.5));
    this.forEachHandLayer(1, (shell) => {
      shell.setFillStyle(this.tint(on ? RUBBER.cured : RUBBER.maroon), 1);
      if (on) shell.setStrokeStyle(2, this.tint(RUBBER.flame), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving fists shed rubber dust. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 30, size: 2, life: 420, depth: 5, color: this.accent, drift: 14 });
  }

  /** Both fists hauled back behind the shoulders, shaking — the punch and the sling wind-up. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const strain = 0.5 + 0.5 * Math.sin(this.t * 9);
    return {
      ang: this.facing + Math.PI + side * (0.5 + strain * 0.2),
      dist: 30 + strain * 8,
      scale: idle.scale * (1.15 + strain * 0.2),
    };
  }

  /**
   * A squashed contact shadow that flattens as the character picks up speed, plus the elastic
   * arms — both belong under the sprite so nothing here can cover the face.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(RUBBER.gum), a * 0.3 * k);
    g.fillEllipse(x, y + 11, 52 * k, 16 * k);
    g.fillStyle(this.tint(this.accent), a * 0.14 * k);
    g.fillCircle(x, y, 27 * k);
    // A slow resting bounce in the shadow, so a standing character still feels springy.
    const bob = 0.5 + 0.5 * Math.sin(this.t * 3.2);
    g.fillStyle(this.tint(this.accent), a * 0.1);
    g.fillEllipse(x, y + 12, (56 + bob * 10) * k, (10 - bob * 3) * k);

    // ── Elastic arms: the hands are physically attached, and the strands show it ──
    // Drawn on the *under* layer and rooted at the chest, not the body centre: an arm swinging
    // across the head would otherwise sit on top of the face and blank the eyes out.
    const rootX = x, rootY = y + 3;
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      const reach = Math.hypot(hx - rootX, hy - rootY);
      const w = strandWidthFor(6.5 * this.intensity, Math.max(0, reach / 30 - 1));
      // The bow lags the swing: the arm always trails the fist a little.
      const bow = Phaser.Math.Clamp((reach - 26) * 0.4, -14, 14) * (i === 0 ? 1 : -1);
      rubberStrandLayered(g, this.tint, rootX, rootY, hx, hy, w * 1.4, w,
        bow + Math.sin(this.t * 5 + i * 2) * 3,
        this.mastered ? RUBBER.cured : RUBBER.maroon, alpha * 0.95);
    }
  }

  /**
   * The crown: a compression spring on its own damped oscillator, so it lags the body and
   * overshoots on every stop. (The arms live on the under layer — see `drawGlow`.)
   *
   * Rooted above the head so it never covers the face, and drawn over the sprite so the coil
   * reads instead of only its dark tips clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // ── The crown coil ──
    const rootY = y - 18;
    // Damped spring driven by the body's own vertical motion.
    const drop = this.lastY === 0 ? 0 : (y - this.lastY);
    this.lastY = y;
    this.coilVel += (-this.coil * 0.5 - this.coilVel * 0.16) + drop * 0.5;
    this.coil = Phaser.Math.Clamp(this.coil + this.coilVel * 0.25, -9, 9);

    const turns = this.mastered ? 4 : 3;
    const height = 20 * this.intensity - this.coil;
    const wide = 8 * this.intensity + this.coil * 0.4;
    const color = this.mastered ? RUBBER.cured : RUBBER.rose;
    let px = x, py = rootY;
    for (let i = 1; i <= turns * 2; i++) {
      const u = i / (turns * 2);
      const nx = x + (i % 2 === 0 ? -wide : wide) * (1 - u * 0.25);
      const ny = rootY - height * u;
      rubberStrandLayered(g, this.tint, px, py, nx, ny, 3.4, 3.2, 0, color, alpha * 0.95);
      px = nx; py = ny;
    }
    // The knob on top, squashed by however hard the spring is loaded.
    rubberBall(g, this.tint, px, py, 6 * this.intensity, 0,
      Phaser.Math.Clamp(Math.abs(this.coil) / 9, 0, 0.7),
      this.mastered ? RUBBER.flame : RUBBER.pink, alpha, 0,
      this.mastered ? RUBBER.gold : RUBBER.cream);

    // ── Mastery: heat coming off the cure, and a hot band round the middle ──
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = (this.t * 1.1 + i / 3) % 1;
        const ox = Math.sin(i * 2.1 + this.t * 2.6) * 14;
        rubberStrandLayered(g, this.tint,
          x + ox, rootY - 2, x + ox * 0.5, rootY - 2 - (8 + p * 22),
          3.2 * (1 - p), 1, 6 * Math.sin(this.t * 7 + i), RUBBER.gold, alpha * 0.85 * (1 - p), false);
      }
      const bandY = y + 4;
      rubberStrandLayered(g, this.tint, x - 21, bandY, x + 21, bandY, 3.6, 3.6,
        3 * Math.sin(this.t * 4), RUBBER.flame, alpha * 0.9);
    }
    void a;
  }
}
