import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Metal renders: the butcher's rig (gauntlet fists, eyes, a
 * chain slung over the crown), the blood and armour auras, and every one-shot effect its
 * abilities throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes metal
 * metal: the honed blade shard, the interlocking chain, and the blood that coats both.
 *
 * Every structural colour must come from the METAL palette below. Metal has no skin yet,
 * but every call still routes through the owner's `metalColor` mapper, so the day
 * one lands it is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.metalColor bound to one owner. */
export type MetalColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const METAL = {
  /** The dark everything here is bedded on. */
  shadow: 0x0d0a0c,
  char: 0x2b2228,
  /** Forged steel, from raw to polished. */
  iron: 0x5c6672,
  steel: 0x8fa0b0,
  chrome: 0xc9d6e2,
  white: 0xffffff,
  /** Blood, from days-old scab to fresh arterial spray. */
  clot: 0x3a0008,
  gore: 0x660011,
  blood: 0x990018,
  crimson: 0xcc0022,
  rose: 0xff3355,
  blush: 0xff8899,
  /** Heat — the sabre charge, and the mace once it goes molten. */
  ember: 0xff6600,
  flame: 0xffaa33,
  gold: 0xffdd44,
  goldHi: 0xffee88,
  /** Grips, pommels and everything that isn't the blade itself. */
  leather: 0x6b4a2b,
  brass: 0xd9b25a,
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
 * Metal's primitive: a blade shard — a sliver of forged steel with a fat, torn root, a slight
 * curve down its length and a point at the tip. The back is blunt and heavy, the front is honed
 * to nothing.
 *
 * Swords, clot spikes, mace spikes, shrapnel, the flail's teeth and the blood blade are all this
 * shape at different lengths and curvatures. The asymmetry is the whole point — a symmetric
 * spike reads as a crystal, a shard with a *back* and an *edge* reads as something that cuts.
 */
export function bladeShard(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  /** Sideways lean of the tip, as a fraction of length. Zero is a straight sliver. */
  curve = 0.12,
  segments = 7,
): void {
  const at = frame(cx, cy, angle);
  const back: Pt[] = [];
  const edge: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Taper: full width at the root, nothing at the tip, with the bulge biased toward the root.
    const w = halfW * Math.pow(1 - t, 0.72);
    const drift = curve * len * t * t;
    // The blunt back carries most of the thickness; the edge side is nearly straight.
    back.push(at(t * len, drift + w * 1.25));
    edge.push(at(t * len, drift - w * 0.55));
  }
  edge.reverse();
  fillPts(g, back.concat(edge));
}

/**
 * The primitive in four passes: a dark backing offset behind it, the steel body, a honed
 * highlight running the edge, and a runnel of blood down the spine. Without the last two a ring
 * of shards reads as a starburst rather than as a fistful of knives.
 */
export function bladeShardLayered(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  color: number, alpha: number, curve = 0.12, bloodied = true,
): void {
  const at = frame(cx, cy, angle);
  const shade = at(-1.5, 2.2);
  g.fillStyle(tint(METAL.shadow), alpha * 0.5);
  bladeShard(g, shade.x, shade.y, angle, len, halfW, curve);

  g.fillStyle(tint(color), alpha);
  bladeShard(g, cx, cy, angle, len, halfW, curve);

  // Honed edge — a thin bright sliver hugging the cutting side.
  g.fillStyle(tint(METAL.white), alpha * 0.75);
  const lit = at(1, -halfW * 0.34);
  bladeShard(g, lit.x, lit.y, angle, len * 0.94, halfW * 0.24, curve);

  if (bloodied) {
    // Blood pooled in the root and running a little way up the spine.
    g.fillStyle(tint(METAL.blood), alpha * 0.8);
    bladeShard(g, cx, cy, angle, len * 0.42, halfW * 0.6, curve);
    const root = at(0, halfW * 0.4);
    g.fillStyle(tint(METAL.crimson), alpha * 0.55);
    g.fillCircle(root.x, root.y, halfW * 0.7);
  }
}

/**
 * A real chain: interlocking oval links running along a slack catenary, alternating between
 * face-on and edge-on so it reads as a chain rather than a dashed line. Every tether, flail and
 * anchor in this element hangs off one.
 */
export function chainRun(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  x1: number, y1: number, x2: number, y2: number,
  /** How far the middle of the run sags, in pixels. */
  sag: number, color: number, alpha: number, thick = 1,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const links = Phaser.Math.Clamp(Math.round(dist / 13), 3, 26);

  for (let i = 0; i <= links; i++) {
    const t = i / links;
    // Gravity pulls the slack straight down, not perpendicular to the run — a chain hanging
    // between two points sags toward the floor whichever way the run is pointing.
    const droop = 4 * t * (1 - t) * sag;
    const px = x1 + dx * t;
    const py = y1 + dy * t + droop;
    // Tangent of the sagged path, so each link lies along the run rather than across it.
    const a = Math.atan2(dy / dist + (4 - 8 * t) * sag / dist, dx / dist);
    // Alternating face-on and edge-on links is what makes this read as a chain.
    const faceOn = i % 2 === 0;
    const rw = 7.5 * thick, rh = (faceOn ? 5.2 : 2.4) * thick;

    g.lineStyle(2.2 * thick, tint(METAL.shadow), alpha * 0.55);
    strokeOval(g, px, py + 1.5, a, rw, rh);
    g.lineStyle(2 * thick, tint(color), alpha);
    strokeOval(g, px, py, a, rw, rh);
    if (faceOn) {
      g.lineStyle(0.9 * thick, tint(METAL.chrome), alpha * 0.8);
      strokeOval(g, px - 0.6, py - 0.9, a, rw * 0.72, rh * 0.6);
    }
  }
}

function strokeOval(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, angle: number, rw: number, rh: number,
): void {
  const at = frame(cx, cy, angle);
  const pts: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    pts.push(at(Math.cos(a) * rw, Math.sin(a) * rh));
  }
  strokePts(g, pts, true);
}

/**
 * A splat of blood: an irregular lobed body with a few thrown droplets around it. Nothing here
 * may be a plain disc — a puddle of blood has a *shape*, and that shape is what sells the
 * element's whole resource economy.
 */
export function bloodSplat(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  cx: number, cy: number, radius: number, seed: number,
  color: number, alpha: number, satellites = true,
): void {
  const lobes = 13;
  const pts: Pt[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU;
    // Deterministic wobble, so a puddle doesn't boil frame to frame.
    const r = radius * (0.78 + 0.34 * Math.abs(Math.sin(seed + i * 2.399)));
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.82 });
  }
  g.fillStyle(tint(color), alpha);
  fillPts(g, pts);

  if (!satellites) return;
  for (let i = 0; i < 5; i++) {
    const a = seed * 1.7 + i * 1.9;
    const d = radius * (1.05 + ((i * 0.37) % 1) * 0.5);
    const r = radius * (0.07 + ((i * 0.61) % 1) * 0.1);
    g.fillStyle(tint(color), alpha * 0.85);
    g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r);
  }
}

/** A falling droplet: a fat head with a thin tail streaming back along its heading. */
export function bloodDrop(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  cx: number, cy: number, angle: number, size: number, color: number, alpha: number,
): void {
  const at = frame(cx, cy, angle);
  g.fillStyle(tint(color), alpha);
  fillPts(g, [at(-size * 2.6, 0), at(0, -size), at(size * 0.5, 0), at(0, size)]);
  g.fillCircle(cx, cy, size);
  g.fillStyle(tint(METAL.rose), alpha * 0.6);
  g.fillCircle(cx - size * 0.3, cy - size * 0.35, size * 0.34);
}

/**
 * A sword: leather grip, brass pommel and crossguard, and a blade built from the primitive so it
 * shares the element's edge and blood runnel. `bleed` paints the blade wet.
 */
export function sword(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  cx: number, cy: number, angle: number, len: number,
  blade: number, alpha: number, serrated: boolean, bleed: boolean,
): void {
  const at = frame(cx, cy, angle);
  const hilt = len * 0.18;

  // Grip and pommel, behind the guard.
  g.fillStyle(tint(METAL.leather), alpha);
  fillPts(g, [at(-2, -3.2), at(hilt, -3.2), at(hilt, 3.2), at(-2, 3.2)]);
  const pom = at(-3, 0);
  g.fillStyle(tint(METAL.brass), alpha);
  g.fillCircle(pom.x, pom.y, 5);
  g.fillStyle(tint(METAL.goldHi), alpha * 0.7);
  g.fillCircle(pom.x - 1.4, pom.y - 1.6, 2);

  // Crossguard — a swept bar with lit tips.
  g.fillStyle(tint(METAL.brass), alpha);
  fillPts(g, [at(hilt - 1, -12), at(hilt + 5, -10), at(hilt + 5, 10), at(hilt - 1, 12)]);
  g.fillStyle(tint(METAL.goldHi), alpha * 0.6);
  fillPts(g, [at(hilt - 1, -12), at(hilt + 5, -10), at(hilt + 5, -7), at(hilt - 1, -8.5)]);

  // Blade.
  const root = at(hilt + 4, 0);
  bladeShardLayered(g, tint, root.x, root.y, angle, len - hilt - 4, 6.4, blade, alpha, 0.02, bleed);

  if (serrated) {
    g.fillStyle(tint(blade), alpha);
    for (let d = hilt + 12; d < len - 10; d += len * 0.11) {
      const w = 5.5 * (1 - (d - hilt) / (len - hilt)) + 1.4;
      fillPts(g, [at(d, w), at(d + w * 1.6, w + 5), at(d + w * 2.4, w)]);
    }
  }
}

/**
 * The flail head: a knuckled iron ball wearing a ring of blade shards, its spikes turning with
 * the swing. Molten heat blooms out of the seams once it's really moving.
 */
export function flailHead(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  cx: number, cy: number, spin: number, radius: number,
  body: number, spikeColor: number, heat: number, alpha: number, spikes = 8,
): void {
  // Heat haze first, so the spikes sit on top of it.
  if (heat > 0.02) {
    g.fillStyle(tint(METAL.ember), alpha * 0.22 * heat);
    g.fillCircle(cx, cy, radius * (2.1 + 0.4 * heat));
  }
  g.fillStyle(tint(METAL.shadow), alpha * 0.45);
  g.fillEllipse(cx, cy + radius * 0.85, radius * 2.1, radius * 0.9);

  for (let i = 0; i < spikes; i++) {
    const a = spin + (i / spikes) * TAU;
    const bx = cx + Math.cos(a) * (radius - 1);
    const by = cy + Math.sin(a) * (radius - 1);
    bladeShardLayered(g, tint, bx, by, a, radius * 1.05, radius * 0.3, spikeColor, alpha, 0.06, false);
  }

  g.fillStyle(tint(METAL.char), alpha);
  g.fillCircle(cx, cy, radius);
  g.fillStyle(tint(body), alpha);
  g.fillCircle(cx, cy, radius * 0.86);
  // Riveted seams across the ball.
  g.lineStyle(1.2, tint(METAL.shadow), alpha * 0.6);
  strokePts(g, [{ x: cx - radius * 0.8, y: cy }, { x: cx + radius * 0.8, y: cy }]);
  for (let i = 0; i < 4; i++) {
    const a = spin * 0.4 + (i / 4) * TAU;
    g.fillStyle(tint(METAL.chrome), alpha * 0.8);
    g.fillCircle(cx + Math.cos(a) * radius * 0.55, cy + Math.sin(a) * radius * 0.55, radius * 0.11);
  }
  // Molten seams glowing through as the spin builds.
  if (heat > 0.02) {
    g.lineStyle(2, tint(METAL.flame), alpha * heat);
    strokeOval(g, cx, cy, spin, radius * 0.7, radius * 0.34);
  }
  g.fillStyle(tint(METAL.white), alpha * 0.55);
  g.fillCircle(cx - radius * 0.34, cy - radius * 0.38, radius * 0.2);
}

// ── MetalFx ───────────────────────────────────────────────────────────────

export interface MetalBoomOpts {
  /** Blade shards thrown clear. Defaults to radius/8. */
  shards?: number;
  /** Blood droplets sprayed with them. Defaults to shards. */
  spray?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a splat on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot metal effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class MetalFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: MetalColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the METAL default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 8, color: number = METAL.rose): void {
    this.flashIn(x, y, radius, METAL.white, color, depth);
  }

  /**
   * A shockwave: a jittered expanding ring, segmented finely enough that a big blast still reads
   * as a wave rather than as a polygon.
   */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 340, depth = 7, width = 4,
  ): void {
    const segs = Math.max(18, Math.round(to / 4));
    const wobble = Array.from({ length: segs }, () => 0.86 + Math.random() * 0.28);
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      const a = (1 - t) * 0.9;
      for (const [col, mult, w] of [[METAL.shadow, 1.06, width * 1.7], [color, 1, width], [METAL.white, 0.96, width * 0.34]] as const) {
        g.lineStyle(w, this.tint(col), a * (col === METAL.shadow ? 0.4 : 1));
        const pts: Pt[] = [];
        for (let i = 0; i < segs; i++) {
          const ang = (i / segs) * TAU;
          const rr = r * mult * wobble[i];
          pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
        }
        strokePts(g, pts, true);
      }
    });
  }

  /** Blade shards thrown clear of an impact, spinning and falling. */
  shards(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; fall?: number } = {},
  ): void {
    const speed = o.speed ?? 210;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 15;
    const life = o.life ?? 480;
    const depth = o.depth ?? 9;
    const color = o.color ?? METAL.steel;
    const fall = o.fall ?? 70;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a), a,
        v: speed * (0.45 + Math.random() * 0.95),
        s: size * (0.55 + Math.random() * 0.85),
        spin: (Math.random() - 0.5) * 16,
        delay: Math.random() * 0.16,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const cx = x + p.cos * d;
        const cy = y + p.sin * d + fall * lt * lt;
        const fade = 1 - lt * lt;
        bladeShardLayered(g, this.tint, cx, cy, p.a + p.spin * lt, p.s, p.s * 0.22, color, 0.95 * fade, 0.1, true);
      }
    });
  }

  /** Blood thrown out of a wound: droplets on ballistic arcs, tails pointing the way they fly. */
  spray(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const speed = o.speed ?? 190;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 3.4;
    const life = o.life ?? 560;
    const depth = o.depth ?? 6;
    const color = o.color ?? METAL.crimson;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        a, v: speed * (0.35 + Math.random() * 1.1),
        s: size * (0.5 + Math.random() * 0.9),
        delay: Math.random() * 0.2,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const cx = x + Math.cos(p.a) * d;
        const cy = y + Math.sin(p.a) * d + 150 * lt * lt;
        bloodDrop(g, this.tint, cx, cy, p.a, p.s * (1 - lt * 0.4), color, 0.95 * (1 - lt * lt));
      }
    });
  }

  /** Sparks off steel striking steel. */
  sparks(x: number, y: number, count: number, angle: number, depth = 10, color: number = METAL.goldHi): void {
    const parts = Array.from({ length: count }, () => ({
      a: angle + (Math.random() - 0.5) * 2.2,
      v: 110 + Math.random() * 230,
      w: 1 + Math.random() * 1.5,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, 300, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const at = (f: number): Pt => ({
          x: x + Math.cos(p.a) * p.v * easeOut(f) * 0.3,
          y: y + Math.sin(p.a) * p.v * easeOut(f) * 0.3 + 60 * f * f,
        });
        g.lineStyle(p.w * (1 - lt), this.tint(color), 0.95 * (1 - lt));
        strokePts(g, [at(Math.max(0, lt - 0.22)), at(lt)]);
      }
    });
  }

  /**
   * A sword swing: the blade sweeps an arc, a crescent of torn air follows the tip, and a couple
   * of afterimages lag behind the swing so it reads as one motion rather than a static prop.
   */
  slash(
    cx: number, cy: number, angle: number, reach: number,
    o: { color?: number; serrated?: boolean; bleed?: boolean; arc?: number; duration?: number; depth?: number } = {},
  ): void {
    const color = o.color ?? METAL.chrome;
    const arc = o.arc ?? Phaser.Math.DegToRad(105);
    const dur = o.duration ?? 260;
    const depth = o.depth ?? 9;

    this.anim(depth, dur, (g, t) => {
      // Fast on the way through, then a short hang at the end of the swing.
      const swing = t < 0.55 ? easeOut(t / 0.55) : 1;
      const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      const a = angle - arc / 2 + arc * swing;

      // Crescent of torn air trailing the tip.
      const trail = Phaser.Math.DegToRad(52);
      const inner: Pt[] = [];
      const outer: Pt[] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const aa = a - trail * u;
        const w = (1 - u) * (1 - u);
        inner.push({ x: cx + Math.cos(aa) * reach * 0.42, y: cy + Math.sin(aa) * reach * 0.42 });
        outer.push({ x: cx + Math.cos(aa) * (reach * (0.98 + 0.06 * w)), y: cy + Math.sin(aa) * (reach * (0.98 + 0.06 * w)) });
      }
      inner.reverse();
      g.fillStyle(this.tint(color), 0.2 * fade);
      fillPts(g, outer.concat(inner));
      g.fillStyle(this.tint(METAL.white), 0.42 * fade);
      const lip: Pt[] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const aa = a - trail * u;
        lip.push({ x: cx + Math.cos(aa) * reach * (1 - 0.04 * u), y: cy + Math.sin(aa) * reach * (1 - 0.04 * u) });
      }
      for (let i = 16; i >= 0; i--) {
        const u = i / 16;
        const aa = a - trail * u;
        const r = reach * (0.9 - 0.05 * u);
        lip.push({ x: cx + Math.cos(aa) * r, y: cy + Math.sin(aa) * r });
      }
      fillPts(g, lip);

      // Two ghost blades behind the live one.
      for (let k = 2; k >= 1; k--) {
        sword(g, this.tint, cx, cy, a - k * 0.2, reach, color, 0.16 * fade, !!o.serrated, false);
      }
      sword(g, this.tint, cx, cy, a, reach, color, fade, !!o.serrated, o.bleed !== false);
    });
  }

  /**
   * A full detonation: white core, a torn shockwave, blade shrapnel, a blood spray and a splat
   * left behind on the floor.
   */
  boom(x: number, y: number, radius: number, o: MetalBoomOpts = {}): void {
    const color = o.color ?? METAL.crimson;
    const bits = o.shards ?? Math.max(4, Math.round(radius / 8));
    const drops = o.spray ?? bits;
    const dur = o.duration ?? Math.round(320 + radius * 1.1);
    const depth = o.depth ?? 8;

    if (o.mark !== false) this.splat(x, y, radius * 0.6, depth - 6);
    this.flash(x, y, radius * 0.4, depth + 2, color);
    this.ring(x, y, radius * 0.2, radius, color, Math.round(dur * 0.85), depth, 5);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.4, radius * 1.3, METAL.white, dur, depth, 2));
    this.shards(x, y, bits, {
      speed: radius * 2.2, size: 12 + radius / 8, life: Math.round(dur * 1.25), depth: depth + 1, color: METAL.steel,
    });
    this.spray(x, y, drops, { speed: radius * 1.9, size: 3.6, life: Math.round(dur * 1.4), depth, color });
  }

  /** Blood settling on the floor where something opened up. */
  splat(x: number, y: number, radius: number, depth = 2, color: number = METAL.gore): void {
    const seed = Math.random() * 10;
    this.anim(depth, 1500, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      bloodSplat(g, this.tint, x, y, radius, seed, color, 0.55 * a);
    });
  }

  /** A single drip falling off something — transfusion, a wet blade, a bleeding fighter. */
  drip(x: number, y: number, depth = 3, color: number = METAL.blood): void {
    const ox = (Math.random() - 0.5) * 26;
    const fallTo = 18 + Math.random() * 12;
    const size = 2 + Math.random() * 1.6;
    this.anim(depth, 400, (g, t) => {
      bloodDrop(g, this.tint, x + ox, y + 6 + fallTo * easeIn(t), Math.PI / 2, size * (1 - t * 0.5), color, 0.95 * (1 - t * t));
    });
  }

  /** A chain snapping taut between two points — the tether landing, the anchor biting. */
  chainSnap(x1: number, y1: number, x2: number, y2: number, depth = 7, color: number = METAL.steel): void {
    this.anim(depth, 300, (g, t) => {
      const fade = 1 - easeIn(t);
      chainRun(g, this.tint, x1, y1, x2, y2, 46 * (1 - easeOut(t)), color, 0.95 * fade, 1);
    });
    this.sparks(x2, y2, 5, Math.atan2(y1 - y2, x1 - x2), depth + 1, METAL.goldHi);
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // a flail's spin, a puddle's remaining blood, how far a shard has flown.

  /** A blood puddle on the floor, drying down as its blood is drained out of it. */
  static drawPuddle(
    g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
    x: number, y: number, radius: number, fullness: number, seed: number, draining: boolean, t: number,
  ): void {
    const r = radius * (0.28 + fullness * 0.72);
    bloodSplat(g, tint, x, y, r * 1.12, seed, METAL.clot, 0.4);
    bloodSplat(g, tint, x, y, r, seed + 1.3, METAL.gore, 0.72);
    bloodSplat(g, tint, x - r * 0.12, y - r * 0.14, r * 0.55, seed + 2.7, METAL.blood, 0.6, false);
    // A wet highlight so it reads as liquid rather than as a stain.
    g.fillStyle(tint(METAL.rose), 0.22 + (draining ? 0.16 * Math.abs(Math.sin(t * 6)) : 0));
    g.fillEllipse(x - r * 0.24, y - r * 0.3, r * 0.5, r * 0.22);
    if (draining) {
      // Threads of blood being pulled up out of it.
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + (i / 4) * TAU;
        const p = (t * 1.4 + i / 4) % 1;
        g.fillStyle(tint(METAL.crimson), 0.7 * (1 - p));
        bloodDrop(g, tint, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.4 - p * 22, -Math.PI / 2, 2.6 * (1 - p * 0.5), METAL.crimson, 0.8 * (1 - p));
      }
    }
  }

  /** A pool of burning slag dripped by the molten mace. */
  static drawFirePuddle(
    g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
    x: number, y: number, radius: number, life: number, t: number,
  ): void {
    bloodSplat(g, tint, x, y, radius, x * 0.03, METAL.char, 0.55 * life, false);
    bloodSplat(g, tint, x, y, radius * 0.78, x * 0.03 + 1.1, METAL.ember, 0.6 * life, false);
    g.fillStyle(tint(METAL.flame), (0.4 + 0.25 * Math.sin(t * 8 + x)) * life);
    g.fillEllipse(x, y, radius * 0.9, radius * 0.5);
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.8 + i / 3) % 1;
      g.fillStyle(tint(METAL.gold), 0.8 * (1 - p) * life);
      g.fillCircle(x + Math.sin(t * 3 + i * 2.1) * radius * 0.5, y - p * 20, 1.8 * (1 - p) + 0.6);
    }
  }

  /** A blood shard in flight, tail streaming behind it. */
  static drawShardBolt(
    g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
    x: number, y: number, angle: number, size: number, color: number, t: number,
  ): void {
    for (let k = 3; k >= 1; k--) {
      const back = k * 7;
      g.fillStyle(tint(color), 0.16 * (4 - k));
      bladeShard(g, x - Math.cos(angle) * back, y - Math.sin(angle) * back, angle, size * 0.8, size * 0.16, 0.05);
    }
    bladeShardLayered(g, tint, x, y, angle, size, size * 0.2, color, 1, 0.05, true);
    g.fillStyle(tint(METAL.rose), 0.35 + 0.2 * Math.sin(t * 12 + x * 0.1));
    g.fillCircle(x, y, size * 0.2);
  }

  /** The Ground Anchor stake: a chain-wrapped spike driven into the floor. */
  static drawStake(
    g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
    x: number, y: number, reach: number, t: number,
  ): void {
    // The reach ring, marked so it reads even at low alpha.
    g.lineStyle(1.5, tint(METAL.crimson), 0.18 + 0.08 * Math.sin(t * 3));
    g.strokeCircle(x, y, reach);
    for (let i = 0; i < 10; i++) {
      const a = t * 0.5 + (i / 10) * TAU;
      g.lineStyle(2, tint(METAL.gore), 0.3);
      strokePts(g, [
        { x: x + Math.cos(a) * (reach - 8), y: y + Math.sin(a) * (reach - 8) },
        { x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach },
      ]);
    }
    g.fillStyle(tint(METAL.shadow), 0.5);
    g.fillEllipse(x, y + 6, 26, 10);
    bladeShardLayered(g, tint, x, y - 22, Math.PI / 2, 30, 6, METAL.iron, 1, 0, false);
    // A short length of chain coiled at its foot.
    chainRun(g, tint, x - 14, y + 2, x + 14, y + 2, 6 + Math.sin(t * 2) * 2, METAL.steel, 0.9, 0.8);
    g.fillStyle(tint(METAL.crimson), 0.45 + 0.3 * Math.abs(Math.sin(t * 4)));
    g.fillCircle(x, y - 20, 4);
  }

  /** The Steel Shield barrier: a riveted kite plate the caster holds out in front. */
  static drawBarrier(
    g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
    x: number, y: number, angle: number, red: boolean, t: number, alpha = 1,
  ): void {
    const at = frame(x, y, angle);
    const face = red ? METAL.crimson : METAL.steel;
    const rim = red ? METAL.rose : METAL.chrome;
    const h = 34, w = 8;

    g.fillStyle(tint(METAL.shadow), alpha * 0.5);
    fillPts(g, [at(-w + 2, -h), at(w + 2, -h * 0.75), at(w + 2, h * 0.75), at(-w + 2, h)]);
    g.fillStyle(tint(METAL.char), alpha);
    fillPts(g, [at(-w, -h), at(w, -h * 0.72), at(w, h * 0.72), at(-w, h)]);
    g.fillStyle(tint(face), alpha);
    fillPts(g, [at(-w + 2, -h + 3), at(w - 1, -h * 0.68), at(w - 1, h * 0.68), at(-w + 2, h - 3)]);
    // Lit leading edge, plus a boss and rivets down the spine.
    g.fillStyle(tint(rim), alpha * 0.9);
    fillPts(g, [at(w - 3, -h * 0.7), at(w, -h * 0.68), at(w, h * 0.68), at(w - 3, h * 0.7)]);
    const boss = at(0, 0);
    g.fillStyle(tint(METAL.brass), alpha);
    g.fillCircle(boss.x, boss.y, 5.5);
    g.fillStyle(tint(METAL.goldHi), alpha * 0.8);
    g.fillCircle(boss.x - 1.5, boss.y - 1.7, 2.2);
    for (const oy of [-h * 0.5, h * 0.5]) {
      const p = at(-w * 0.3, oy);
      g.fillStyle(tint(METAL.chrome), alpha * 0.85);
      g.fillCircle(p.x, p.y, 1.7);
    }
    // A red shield is wet, and it drips.
    if (red) {
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.7 + i / 3) % 1;
        const d = at(w - 2, -h * 0.5 + i * h * 0.5);
        bloodDrop(g, tint, d.x, d.y + p * 16, Math.PI / 2, 2.4 * (1 - p * 0.4), METAL.blood, alpha * (1 - p));
      }
    }
    g.lineStyle(1.6, tint(rim), alpha * (0.55 + 0.25 * Math.sin(t * 5)));
    strokePts(g, [at(-w, -h), at(w, -h * 0.72), at(w, h * 0.72), at(-w, h)], true);
  }
}

// ── MetalAura ─────────────────────────────────────────────────────────────

export type MetalAuraStyle =
  | 'bleed'      // Aggressive Bleeding: open wounds and a steady drip
  | 'clot'       // Clot Armor: a shell of scabbed plate with shards ready to burst
  | 'charge'     // Mighty Sabre / Ground Anchor / Blood Blade wind-up
  | 'transfuse'; // Blood Transfusion: blood being drawn up out of the ground

/**
 * A persistent metal effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: bleeding runs downward, clot armour encloses, a charge converges
 * and a transfusion rises. Several can be up at once, so they must stay separable at a glance.
 */
export class MetalAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: MetalColorFn,
    private style: MetalAuraStyle,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually how far along the effect is — a charge ratio, or the shield's remaining fraction. */
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

    switch (this.style) {
      case 'bleed': {
        // Wounds around the body, each weeping a drop that falls and fades.
        g.fillStyle(this.tint(METAL.gore), 0.2 * alpha);
        g.fillCircle(x, y, r);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + Math.sin(this.t * 0.7 + i) * 0.2;
          const wx = x + Math.cos(a) * r * 0.66;
          const wy = y + Math.sin(a) * r * 0.6;
          g.fillStyle(this.tint(METAL.blood), 0.85 * alpha);
          g.fillCircle(wx, wy, 2.6 + Math.sin(this.t * 5 + i * 2) * 0.7);
          const p = (this.t * 1.1 + i / 5) % 1;
          bloodDrop(g, this.tint, wx, wy + p * 24, Math.PI / 2, 2.4 * (1 - p * 0.5), METAL.crimson, 0.85 * alpha * (1 - p));
        }
        g.lineStyle(2, this.tint(METAL.crimson), (0.3 + 0.2 * Math.sin(this.t * 5)) * alpha);
        g.strokeCircle(x, y, r);
        break;
      }
      case 'clot': {
        // Overlapping scabbed plates, with blade shards standing ready under them.
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + this.t * 0.35;
          const px = x + Math.cos(a) * r * 0.9;
          const py = y + Math.sin(a) * r * 0.9;
          g.fillStyle(this.tint(i % 2 === 0 ? METAL.clot : METAL.gore), (0.55 + 0.35 * k) * alpha);
          fillPts(g, [
            { x: px + Math.cos(a + 1.1) * 8, y: py + Math.sin(a + 1.1) * 8 },
            { x: px + Math.cos(a) * 7, y: py + Math.sin(a) * 7 },
            { x: px + Math.cos(a - 1.1) * 8, y: py + Math.sin(a - 1.1) * 8 },
            { x: px - Math.cos(a) * 6, y: py - Math.sin(a) * 6 },
          ]);
        }
        // The shards it will spit when the plate cracks — tighter the more armour is left.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU - this.t * 0.6;
          const d = r * (0.5 + (1 - k) * 0.45);
          bladeShardLayered(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a,
            11, 2.6, METAL.crimson, 0.75 * alpha, 0.08, false);
        }
        g.lineStyle(2.4, this.tint(METAL.rose), (0.35 + 0.3 * k) * alpha);
        g.strokeCircle(x, y, r);
        break;
      }
      case 'charge': {
        // Steel converging on the fists, closing tighter the fuller the charge.
        g.fillStyle(this.tint(METAL.gold), 0.1 * alpha * (0.4 + k));
        g.fillCircle(x, y, r * (1.5 - k * 0.5));
        for (let i = 0; i < 7; i++) {
          const a = this.t * 3.2 + (i / 7) * TAU;
          const d = r * (1.7 - k * 1.1) + Math.sin(this.t * 8 + i) * 2;
          bladeShardLayered(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI,
            10 + k * 8, 2.4, k >= 1 ? METAL.goldHi : METAL.gold, (0.5 + 0.5 * k) * alpha, 0.1, false);
        }
        g.lineStyle(2, this.tint(k >= 1 ? METAL.goldHi : METAL.brass), (0.35 + 0.5 * k) * alpha);
        g.strokeCircle(x, y, r * (1.5 - k * 0.5));
        if (k >= 1) {
          // Full charge: a hard rim and a bright edge on the aim.
          g.fillStyle(this.tint(METAL.goldHi), 0.5 * alpha * (0.5 + 0.5 * Math.sin(this.t * 18)));
          g.fillCircle(x + Math.cos(this.angle) * r, y + Math.sin(this.angle) * r, 6);
        }
        break;
      }
      case 'transfuse': {
        // Blood climbing the body — the opposite direction to bleeding, so the two never blur.
        g.fillStyle(this.tint(METAL.crimson), 0.12 * alpha);
        g.fillEllipse(x, y + 12, r * 2.2, r * 0.7);
        for (let i = 0; i < 7; i++) {
          const p = (this.t * 1.6 + i / 7) % 1;
          const a = (i / 7) * TAU + Math.sin(this.t + i) * 0.3;
          const d = r * (1 - p * 0.7);
          bloodDrop(g, this.tint, x + Math.cos(a) * d, y + 16 - p * 34, -Math.PI / 2,
            2.6 * (1 - p * 0.4), METAL.rose, 0.9 * alpha * (1 - p * 0.7));
        }
        g.lineStyle(2, this.tint(METAL.rose), (0.25 + 0.2 * Math.sin(this.t * 7)) * alpha);
        g.strokeCircle(x, y, r);
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── MetalAvatar ───────────────────────────────────────────────────────────

/** Concentric discs of one gauntleted fist, outermost first. */
const METAL_AVATAR: AvatarSpec = {
  hands: [
    { r: 11.5, color: METAL.crimson, alpha: 0.2 },
    { r: 7.6, color: METAL.char, alpha: 1 },
    { r: 4.8, color: METAL.iron, alpha: 1 },
    { r: 1.8, color: METAL.chrome, alpha: 1, ox: -2.1, oy: -2.2 },
  ],
  eyeWhite: METAL.steel,
  eyePupil: METAL.shadow,
  // Armoured hands: heavy, so they lag and smear like something with weight behind them.
  squash: { div: 17, x: 0.42, y: 0.24 },
};

/**
 * The metal character rig: two gauntleted fists with knuckle blades, a pair of eyes, and a
 * length of chain slung over the crown with a hook swinging off the end of it.
 *
 * The knuckle blades are the idea — this element's whole vocabulary is *edges*, and a fighter
 * whose fists are visibly bladed reads as metal before it has swung anything.
 */
export class MetalAvatar extends BaseAvatar {
  private fx: MetalFx;
  /** Warm for the player, cold for the NPC, so two metal fighters never blur together. */
  private accent: number;

  constructor(scene: Phaser.Scene, tint: MetalColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, METAL_AVATAR);
    this.fx = new MetalFx(scene, tint);
    this.accent = owner === 'player' ? METAL.crimson : METAL.steel;
  }

  /**
   * Mastery tell — Natural Clot, made visible: the fists grow a scabbed outer shell and a
   * crimson rim, the eyes go blood-red, and a gorget of clotted plate rides the shoulders (drawn
   * in drawExtras). Shape changes, not brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? METAL.rose : METAL.steel);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 15 : 11.5));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(METAL.crimson), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving fists sling blood off the blades. */
  protected emitTrail(x: number, y: number): void {
    this.fx.spray(x, y, 1, { speed: 40, size: 2.4, life: 380, depth: 5, color: METAL.blood });
  }

  /** Both fists hauled in behind the guard, shaking — the charged sabre and the raised shield. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const grip = 0.5 + 0.5 * Math.sin(this.t * 6);
    return {
      ang: this.facing + side * (0.42 + grip * 0.16),
      dist: 20 + grip * 6,
      scale: idle.scale * (1.12 + grip * 0.14),
    };
  }

  /** Blood pooled underfoot, with a drop or two escaping the edge of it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    bloodSplat(g, this.tint, x, y + 8, 24 * k, 3.1, this.accent, a * 0.2);
    g.fillStyle(this.tint(METAL.gore), a * 0.16 * k);
    g.fillEllipse(x, y + 9, 52 * k, 20 * k);
  }

  /**
   * Knuckle blades on each fist, plus the crown: a chain looped over the head with a hook
   * hanging off it, rocking as the fighter moves. Rooted above the head so it never covers the
   * face, and drawn over the sprite so the steel reads instead of only its dark tips clearing
   * the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // ── Knuckle blades ──
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      const out = Math.atan2(hy - y, hx - x);
      for (let k = -1; k <= 1; k++) {
        bladeShardLayered(g, this.tint, hx, hy, out + k * 0.46, 11 * this.intensity, 2.4,
          this.mastered ? METAL.crimson : METAL.steel, alpha * 0.95, 0.08, false);
      }
    }

    // ── The crown chain ──
    const rootY = y - 20;
    const rock = Math.sin(this.t * 1.6) * 0.22;
    const span = 20 * this.intensity;
    chainRun(g, this.tint, x - span, rootY, x + span, rootY - 2, 9 + Math.sin(this.t * 2.4) * 3,
      METAL.steel, a * 0.95, 0.85);
    // The hook, swinging off the right-hand end.
    const hookA = Math.PI / 2 + rock;
    const hx = x + span + Math.cos(hookA) * 4;
    const hy = rootY + Math.sin(hookA) * 10;
    bladeShardLayered(g, this.tint, hx, hy, hookA + 0.5, 14, 3.2, METAL.iron, a * 0.95, 0.55, true);

    // ── Mastery: a gorget of clotted plate, and shards orbiting the head ──
    if (this.mastered) {
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        const px = x + Math.cos(ang) * 21;
        const py = y - 6 + Math.sin(ang) * 15;
        g.fillStyle(this.tint(i % 2 === 0 ? METAL.clot : METAL.gore), alpha * 0.9);
        fillPts(g, [
          { x: px - 5, y: py - 3 }, { x: px + 5, y: py - 4 },
          { x: px + 4, y: py + 4 }, { x: px - 4, y: py + 3 },
        ]);
        g.fillStyle(this.tint(METAL.blood), alpha * 0.5);
        g.fillCircle(px - 1, py - 1, 1.8);
      }
      for (let i = 0; i < 3; i++) {
        const ang = this.t * 1.5 + (i / 3) * TAU;
        bladeShardLayered(g, this.tint, x + Math.cos(ang) * 28, rootY - 6 + Math.sin(ang) * 9, ang + Math.PI / 2,
          12, 2.6, METAL.rose, alpha * 0.9, 0.1, false);
      }
    }
  }
}
