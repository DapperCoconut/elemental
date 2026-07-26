import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Ice renders: the frozen avatar (ball arms + eyes + a crown
 * of shards), the armour aura, and the one-shot effects every ice ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * ice ice: the faceted shard, the palette, and the effects built out of them.
 *
 * Colours must come from the ICE palette below. Ice has no skin yet, but every
 * call still routes through the owner's `iceColor` mapper, so the day one lands it is a table
 * edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.iceColor bound to one owner. */
export type IceColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const ICE = {
  abyss: 0x062338,
  deep: 0x0d3a5c,
  teal: 0x1a4a7a,
  steel: 0x2d6f9e,
  ice: 0x4fa3d9,
  sky: 0x88ccff,
  frost: 0xaaddff,
  pale: 0xcceeff,
  mist: 0xe6f7ff,
  white: 0xffffff,
  // Black Ice morph runs the same shapes through a void palette, so R+ reads as a different
  // substance rather than as the same ice with a filter over it.
  voidDeep: 0x220044,
  voidCore: 0x440066,
  voidBody: 0x6622aa,
  voidGlow: 0x9900ff,
  voidPale: 0xcc88ff,
} as const;

/** One coherent set of shades. `shell → body → facet → lit` runs dark to bright. */
export interface IceTones {
  shell: number;
  body: number;
  facet: number;
  lit: number;
  spark: number;
}

export const FROST_TONES: IceTones = {
  shell: ICE.teal, body: ICE.ice, facet: ICE.frost, lit: ICE.pale, spark: ICE.white,
};
export const VOID_TONES: IceTones = {
  shell: ICE.voidCore, body: ICE.voidBody, facet: ICE.voidGlow, lit: ICE.voidPale, spark: ICE.mist,
};

/** Pick the tone set for a shot. Every ice effect takes this rather than a bare colour. */
export const tonesFor = (isVoid: boolean): IceTones => (isVoid ? VOID_TONES : FROST_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A faceted shard: a crystal with a broad shoulder near the root, a long tapering point, and
 * deliberately unequal flanks. This is the primitive every ice shape is built from — spikes,
 * the beam, shatter debris, rink crystals and the avatar's crown all call it.
 *
 * `skew` slides the shoulder along the shaft (0 = centred, 1 = pushed toward the tip) and
 * pushes one flank wider than the other. A symmetric diamond reads as a UI icon; real ice is
 * never symmetric, so this shape refuses to be.
 */
export function iceShard(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  skew = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number, w: number) => ({
    x: cx + cos * len * f + px * w,
    y: cy + sin * len * f + py * w,
  });

  // Shoulders sit at different distances out AND at different widths, which is what makes the
  // silhouette read as a cleaved crystal rather than as a kite.
  const sA = 0.3 + skew * 0.16;
  const sB = 0.44 - skew * 0.14;
  const wA = halfW * (1 + skew * 0.5);
  const wB = -halfW * (1 - skew * 0.35);
  const a = at(sA, wA);
  const b = at(sB, wB);
  const midA = at(0.72, wA * 0.34);
  const midB = at(0.7, wB * 0.4);
  const tip = at(1, 0);
  const root = at(0, 0);

  g.beginPath();
  g.moveTo(root.x, root.y);
  g.lineTo(a.x, a.y);
  g.lineTo(midA.x, midA.y);
  g.lineTo(tip.x, tip.y);
  g.lineTo(midB.x, midB.y);
  g.lineTo(b.x, b.y);
  g.closePath();
  g.fillPath();
}

/**
 * Layered shard: a frosted outer shell, a solid body, an off-centre inner facet catching the
 * light, and a hard specular edge along the lit flank.
 *
 * `cluster` seeds two smaller shards at the root growing off at an angle. Without them a ring
 * of shards reads as a starburst of triangles; with them it reads as ice that grew there.
 */
export function iceShardLayered(
  g: Phaser.GameObjects.Graphics,
  tint: IceColorFn, tones: IceTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  skew: number, alpha: number,
  cluster = true,
): void {
  if (cluster) {
    g.fillStyle(tint(tones.shell), alpha * 0.55);
    iceShard(g, cx, cy, angle - 0.75, len * 0.36, halfW * 0.55, -skew);
    iceShard(g, cx, cy, angle + 0.62, len * 0.28, halfW * 0.48, skew);
  }

  g.fillStyle(tint(tones.shell), alpha * 0.45);
  iceShard(g, cx, cy, angle, len * 1.03, halfW * 1.45, skew);
  g.fillStyle(tint(tones.body), alpha * 0.92);
  iceShard(g, cx, cy, angle, len, halfW, skew);
  // Inner facet, pushed off-axis so the crystal looks like it has an internal plane.
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  g.fillStyle(tint(tones.facet), alpha * 0.8);
  iceShard(g, cx + px * halfW * 0.25, cy + py * halfW * 0.25, angle, len * 0.82, halfW * 0.42, skew * 0.5);

  // Specular edge on the lit flank only. Outlining the whole shard flattens it back to a decal.
  g.lineStyle(1.4, tint(tones.lit), alpha * 0.85);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + cos * len * (0.3 + skew * 0.16) + px * halfW * (1 + skew * 0.5),
    cy + sin * len * (0.3 + skew * 0.16) + py * halfW * (1 + skew * 0.5));
  g.lineTo(cx + cos * len, cy + sin * len);
  g.strokePath();
}

export interface ShatterOpts {
  /** Shards flung out of the break. Defaults to radius/6. */
  shards?: number;
  /** Sinking vapor puffs. Defaults to radius/26. */
  vapor?: number;
  /** Leave a rime mark on the ground. Default true. */
  rime?: boolean;
  /** Render depth of the crystal body. Default 6. */
  depth?: number;
  /** Total life of the crystal body in ms. Defaults to scale with radius. */
  duration?: number;
  /** Use the Black Ice palette. */
  isVoid?: boolean;
}

export interface ShardBurstOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels the debris sinks over its life. Negative to make it float. */
  fall?: number;
  isVoid?: boolean;
}

// ── IceFx ─────────────────────────────────────────────────────────────────

/**
 * One-shot ice effects. Cheap to construct — build one per owner (or per cast, as the ability
 * files do) and hand it the owner's colour mapper.
 */
export class IceFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: IceColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding frost front. Unlike a blast ring this one is *crystalline*: the rim is a fixed
   * polygon of alternating long and short spokes that grows outward rigidly, so it reads as ice
   * spreading across a surface rather than as a shockwave.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const spokes = Phaser.Math.Clamp(Math.round(toR / 6), 12, 40);
    const lengths = Array.from({ length: spokes }, (_, i) => (i % 2 === 0 ? 1 : 0.9) * (0.94 + Math.random() * 0.12));
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.7)), c, 0.85 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const idx = i % spokes;
        const a = (idx / spokes) * TAU;
        const rr = r * lengths[idx];
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /** Blown-out white core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, isVoid = false): void {
    const tones = tonesFor(isVoid);
    this.flashIn(x, y, radius, tones.spark, tones.lit, depth);
  }

  /**
   * Rime creeping across the ground and then sublimating away. Built from branching feathers
   * rather than a disc — real frost grows along fracture lines, and a plain circle here reads
   * as an unfinished placeholder.
   */
  rime(x: number, y: number, radius: number, depth = 1, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const feathers = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + (Math.random() - 0.5) * 0.5,
      len: radius * (0.5 + Math.random() * 0.6),
      w: radius * (0.07 + Math.random() * 0.05),
      skew: (Math.random() - 0.5) * 1.2,
      branches: 2 + Math.floor(Math.random() * 2),
    }));
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.14 ? t / 0.14 : 1 - (t - 0.14) / 0.86;
      const grow = easeOut(Math.min(1, t * 2.6));
      g.fillStyle(this.tint(tones.shell), 0.22 * a);
      g.fillCircle(x, y, radius * 0.55 * grow);
      for (const f of feathers) {
        g.fillStyle(this.tint(tones.body), 0.55 * a);
        iceShard(g, x, y, f.ang, f.len * grow, f.w, f.skew);
        // Side branches, shorter and set back along the spine.
        for (let b = 1; b <= f.branches; b++) {
          const at = b / (f.branches + 1);
          const bx = x + Math.cos(f.ang) * f.len * grow * at;
          const by = y + Math.sin(f.ang) * f.len * grow * at;
          const side = b % 2 === 0 ? 1 : -1;
          g.fillStyle(this.tint(tones.facet), 0.5 * a);
          iceShard(g, bx, by, f.ang + side * 1.0, f.len * grow * 0.3 * (1 - at), f.w * 0.7, f.skew);
        }
      }
      g.fillStyle(this.tint(tones.lit), 0.3 * a * (1 - t));
      g.fillCircle(x, y, radius * 0.18 * grow);
    });
  }

  /**
   * Flung debris. Each fragment is a shard drawn at its own tumbling angle, sinking under
   * gravity — the tumble is what separates ice debris from a spray of dots.
   */
  shards(x: number, y: number, count: number, opts: ShardBurstOpts = {}): void {
    const tones = tonesFor(opts.isVoid ?? false);
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 540;
    const fall = opts.fall ?? 40;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.45 + Math.random() * 0.9),
        r: size * (0.55 + Math.random() * 0.85),
        spin: (Math.random() - 0.5) * 14,
        spin0: Math.random() * TAU,
        skew: (Math.random() - 0.5) * 1.4,
        delay: Math.random() * 0.18,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d + fall * lt * lt;
        const fade = 1 - lt * lt;
        const ang = p.spin0 + p.spin * lt;
        g.fillStyle(this.tint(tones.body), 0.9 * fade);
        iceShard(g, ex, ey, ang, p.r * 3.4 * fade, p.r * fade, p.skew);
        g.fillStyle(this.tint(tones.lit), 0.75 * fade * fade);
        iceShard(g, ex, ey, ang, p.r * 1.9 * fade, p.r * 0.4 * fade, p.skew);
      }
    });
  }

  /** Cold vapor rolling off an impact — it sinks and spreads rather than rising like smoke. */
  vapor(x: number, y: number, count: number, radius: number, depth = 4, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.3,
      oy: (Math.random() - 0.5) * radius * 0.6,
      r: radius * (0.26 + Math.random() * 0.32),
      drift: (Math.random() - 0.5) * 34,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1200, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const cx = x + p.ox + p.drift * lt;
        const cy = y + p.oy + 16 * lt;
        g.fillStyle(this.tint(tones.lit), 0.22 * (1 - lt));
        g.fillEllipse(cx, cy, p.r * (1.4 + lt * 2.4), p.r * (0.8 + lt * 1.1));
        g.fillStyle(this.tint(tones.facet), 0.1 * (1 - lt));
        g.fillEllipse(cx, cy, p.r * (0.9 + lt * 1.5), p.r * (0.5 + lt * 0.8));
      }
    });
  }

  /**
   * The body of a shatter: a cluster of crystals that grows out of the impact point, holds, and
   * then breaks apart. Reads as a mass of ice rather than as a disc being scaled.
   */
  crystalBloom(x: number, y: number, radius: number, duration: number, depth = 6, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const spikes = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + (Math.random() - 0.5) * 0.6,
      len: 0.55 + Math.random() * 0.6,
      w: 0.13 + Math.random() * 0.1,
      skew: (Math.random() - 0.5) * 1.3,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Frozen core the spikes are seated in.
      const core = easeOut(Math.min(1, t * 3.5));
      g.fillStyle(this.tint(tones.shell), 0.65 * fade);
      g.fillCircle(x, y, radius * 0.42 * core);
      g.fillStyle(this.tint(tones.body), 0.7 * fade);
      g.fillCircle(x, y, radius * 0.28 * core);

      for (const s of spikes) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        // Out fast, then the whole cluster slides apart as it dies.
        const grow = easeOut(Math.min(1, lt * 2.4));
        const drift = radius * 0.25 * easeIn(lt);
        const rx = x + Math.cos(s.ang) * drift;
        const ry = y + Math.sin(s.ang) * drift;
        iceShardLayered(
          g, this.tint, tones, rx, ry, s.ang,
          radius * s.len * grow, radius * s.w * (1 - lt * 0.3), s.skew, 0.9 * fade,
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.4) * 0.8);
        g.fillCircle(x, y, radius * 0.18);
      }
    });
  }

  /** White core + crystal bloom + stacked frost fronts + tumbling debris + vapor + rime. */
  shatter(x: number, y: number, radius: number, opts: ShatterOpts = {}): void {
    const isVoid = opts.isVoid ?? false;
    const tones = tonesFor(isVoid);
    const debris = opts.shards ?? Math.max(6, Math.round(radius / 6));
    const vaporCount = opts.vapor ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(340 + radius * 1.4);
    const depth = opts.depth ?? 6;

    if (opts.rime !== false) this.rime(x, y, radius * 0.6, 1, isVoid);
    this.crystalBloom(x, y, radius * 0.7, dur, depth, isVoid);
    this.flash(x, y, radius * 0.32, depth + 1, isVoid);
    this.ring(x, y, radius * 0.2, radius * 1.1, tones.lit, Math.round(dur * 0.75), 5, depth);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.15, radius * 1.35, tones.facet, dur, 4, depth));
    this.scene.time.delayedCall(170, () => this.ring(x, y, radius * 0.1, radius * 1.5, tones.body, dur, 3, depth));
    this.shards(x, y, debris, {
      speed: radius * 2.1, size: 3 + radius / 50,
      life: Math.round(dur * 1.4), fall: radius * 0.8, depth, isVoid,
    });
    if (vaporCount > 0) this.vapor(x, y, vaporCount, radius * 0.85, depth - 2, isVoid);
  }

  /**
   * The Frost Blast lance: a spine of nested shards laid along the beam with a white-hot core,
   * frost feathering off both flanks and a burst where it leaves the caster.
   */
  beam(x1: number, y1: number, x2: number, y2: number, isVoid = false, depth = 8): void {
    const tones = tonesFor(isVoid);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const feathers = Array.from({ length: Math.max(6, Math.round(dist / 90)) }, (_, i) => ({
      at: (i + 0.5) / Math.max(6, Math.round(dist / 90)),
      side: i % 2 === 0 ? 1 : -1,
      len: 22 + Math.random() * 26,
      w: 4 + Math.random() * 4,
      skew: (Math.random() - 0.5) * 1.2,
    }));
    this.anim(depth, 300, (g, t) => {
      const fade = 1 - easeIn(t);
      const reach = Math.min(1, t * 4);
      const ex = x1 + (x2 - x1) * reach;
      const ey = y1 + (y2 - y1) * reach;

      g.lineStyle(13 * fade, this.tint(tones.shell), 0.4 * fade);
      g.lineBetween(x1, y1, ex, ey);
      g.lineStyle(7 * fade, this.tint(tones.body), 0.7 * fade);
      g.lineBetween(x1, y1, ex, ey);
      g.lineStyle(2.5 * fade, this.tint(tones.spark), 0.95 * fade);
      g.lineBetween(x1, y1, ex, ey);

      // Crystals thrown out sideways along the lance as it passes.
      for (const f of feathers) {
        if (f.at > reach) continue;
        const fx = x1 + (x2 - x1) * f.at;
        const fy = y1 + (y2 - y1) * f.at;
        g.fillStyle(this.tint(tones.facet), 0.8 * fade);
        iceShard(g, fx, fy, angle + f.side * (Math.PI / 2), f.len * fade, f.w * fade, f.skew);
      }
    });
    this.shards(x1, y1, 6, { angle, spread: 0.5, speed: 220, size: 3, life: 380, fall: 30, depth, isVoid });
    this.ring(x1, y1, 8, 52, tones.lit, 320, 4, depth - 1);
  }

  /**
   * The Frozen Solid cone: spears of ice racing outward along the wedge, each one arriving on
   * its own beat, capped by a wall of frost across the far edge.
   */
  frostCone(x: number, y: number, angle: number, length: number, halfAngle: number, depth = 7, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const spears = Array.from({ length: 16 }, (_, i) => ({
      off: ((i / 15) - 0.5) * 2 * halfAngle,
      len: length * (0.72 + Math.random() * 0.35),
      w: 12 + Math.random() * 16,
      skew: (Math.random() - 0.5) * 1.3,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 520, (g, t) => {
      const fade = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
      // Wedge of freezing air the spears travel through.
      g.fillStyle(this.tint(tones.shell), 0.22 * fade);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(angle - halfAngle) * length, y + Math.sin(angle - halfAngle) * length);
      g.lineTo(x + Math.cos(angle + halfAngle) * length, y + Math.sin(angle + halfAngle) * length);
      g.closePath();
      g.fillPath();

      for (const s of spears) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const reach = easeOut(Math.min(1, lt * 1.6));
        iceShardLayered(
          g, this.tint, tones, x, y, angle + s.off,
          s.len * reach, s.w * (1 - lt * 0.4), s.skew, 0.85 * fade, false,
        );
      }

      // Frost wall thrown up across the mouth of the cone once the spears land.
      if (t > 0.25) {
        const wall = Math.min(1, (t - 0.25) / 0.35);
        g.lineStyle(6 * fade, this.tint(tones.lit), 0.55 * fade);
        g.beginPath();
        g.arc(x, y, length * 0.92, angle - halfAngle * wall, angle + halfAngle * wall);
        g.strokePath();
      }
    });
    this.ring(x, y, 10, 80, tones.lit, 400, 5, depth - 1);
  }

  /** Recoil frost at the throwing hand — sells that a shot actually left a body. */
  muzzleFrost(x: number, y: number, angle: number, scale = 1, depth = 6, isVoid = false): void {
    const tones = tonesFor(isVoid);
    this.anim(depth, 140, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(tones.lit), 0.75 * fade);
      iceShard(g, x, y, angle, 28 * scale * (0.6 + t * 0.9), 8 * scale * fade, 0.4);
      g.fillStyle(this.tint(tones.spark), 0.85 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.4));
      // Frost blown sideways as the shot leaves.
      g.fillStyle(this.tint(tones.facet), 0.45 * fade);
      iceShard(g, x, y, angle + Math.PI * 0.72, 14 * scale * fade, 3.4 * scale * fade, -0.3);
      iceShard(g, x, y, angle - Math.PI * 0.72, 14 * scale * fade, 3.4 * scale * fade, 0.3);
    });
    this.shards(x, y, 3, { angle, spread: 0.7, speed: 110, size: 2.2, life: 300, fall: 24, depth, isVoid });
  }

  /**
   * The wake carved by a skate or dash: twin blade scores along the path with chips thrown up
   * from between them, plus a burst at the launch point.
   */
  wake(x1: number, y1: number, x2: number, y2: number, depth = 4, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const chips = Math.max(3, Math.round(dist / 22));
    this.anim(depth, 500, (g, t) => {
      const fade = 1 - t;
      // Two blade scores, splayed slightly apart the way a pair of skates would cut.
      for (const s of [1, -1]) {
        g.lineStyle(3.5 * fade, this.tint(tones.lit), 0.65 * fade);
        g.beginPath();
        g.moveTo(x1 + px * s * 3, y1 + py * s * 3);
        g.lineTo(x2 + px * s * 7, y2 + py * s * 7);
        g.strokePath();
      }
      for (let i = 0; i < chips; i++) {
        const f = i / (chips - 1 || 1);
        const cx = x1 + (x2 - x1) * f;
        const cy = y1 + (y2 - y1) * f;
        const local = Math.max(0, fade - f * 0.3);
        if (local <= 0) continue;
        const side = i % 2 === 0 ? 1 : -1;
        g.fillStyle(this.tint(tones.body), 0.7 * local);
        iceShard(g, cx + px * side * 5, cy + py * side * 5,
          angle + side * 1.9, (7 + (1 - f) * 12) * local, 3 * local, side * 0.5);
      }
    });
    this.shards(x1, y1, 8, { angle: angle + Math.PI, spread: 0.9, speed: 150, size: 3, life: 480, fall: 40, depth, isVoid });
    this.ring(x1, y1, 6, 44, tones.lit, 360, 3, depth);
  }

  /** Ignition burst for a toggle or a stance: plates of ice slamming into place around a body. */
  bloom(x: number, y: number, radius: number, count = 10, depth = 5, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const plates = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU + (Math.random() - 0.5) * 0.4,
      skew: (Math.random() - 0.5) * 1.2,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, 460, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const p of plates) {
        const lt = Math.max(0, (t - p.delay) / (1 - p.delay));
        // Plates fly *inward* and lock, which is what makes a shell read as armour.
        const d = radius * (1.5 - easeOut(lt) * 0.7);
        iceShardLayered(
          g, this.tint, tones,
          x + Math.cos(p.ang) * d, y + Math.sin(p.ang) * d,
          p.ang + Math.PI, radius * 0.42, radius * 0.16, p.skew, 0.85 * fade, false,
        );
      }
    });
    this.ring(x, y, radius * 1.4, radius * 0.7, tones.lit, 380, 4, depth);
    this.shards(x, y, Math.round(count * 0.7), { speed: radius * 1.2, size: 2.8, life: 500, fall: 24, depth, isVoid });
  }

  /**
   * Inward-crystallising gather: shards falling in from the rim toward a growing core while a
   * containment ring squeezes shut. `follow` lets it track a moving caster through a channel.
   */
  channelFreeze(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, isVoid = false,
  ): void {
    const tones = tonesFor(isVoid);
    const streams = Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * TAU,
      spin: 0.9 + Math.random() * 1.2,
      phase: Math.random(),
      len: 0.28 + Math.random() * 0.3,
      skew: (Math.random() - 0.5) * 1.2,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 26) * 0.15;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(tones.facet), 0.75 * (1 - lt * 0.55));
        iceShard(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI, r * s.len, 3 * (1 - lt), s.skew);
      }

      // Core freezing solid, brighter and harder-edged as it compacts.
      const cr = radius * (0.08 + easeIn(t) * 0.32) * pulse;
      g.fillStyle(this.tint(tones.shell), 0.55);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(tones.body), 0.8);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.spark), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.3);

      g.lineStyle(3, this.tint(tones.lit), 0.45 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /** A column of ice erupting upward and fanning into a crown of spikes at its top. */
  icePillar(x: number, y: number, radius: number, height: number, depth = 7, isVoid = false): void {
    const tones = tonesFor(isVoid);
    const shafts = Array.from({ length: 5 }, (_, i) => ({
      ox: (i - 2) * radius * 0.4,
      h: height * (0.65 + Math.random() * 0.45),
      w: radius * (0.3 + Math.random() * 0.24),
      lean: (Math.random() - 0.5) * 0.34,
      skew: (Math.random() - 0.5) * 1.2,
      delay: i * 0.045,
    }));
    this.anim(depth, 760, (g, t) => {
      const fade = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
      g.fillStyle(this.tint(tones.shell), 0.5 * fade);
      g.fillEllipse(x, y, radius * 1.7, radius * 0.8);
      for (const s of shafts) {
        const rise = easeOut(Math.max(0, (t - s.delay) / (1 - s.delay)));
        iceShardLayered(
          g, this.tint, tones, x + s.ox, y + radius * 0.2,
          -Math.PI / 2 + s.lean, s.h * rise, s.w * (1 - t * 0.25), s.skew, 0.9 * fade,
        );
      }
    });
    this.shards(x, y - height * 0.4, 9, {
      speed: radius * 1.3, spread: 1, angle: -Math.PI / 2,
      size: 3.4, life: 780, fall: height * 0.7, depth, isVoid,
    });
  }

  /**
   * A living sheet of ice on the ground: a fractured, crystalline plate with a frost rim and
   * glints crawling across it. Painted into a caller-owned Graphics so the kit can repaint
   * every trail it owns in one pass.
   */
  static drawRink(
    g: Phaser.GameObjects.Graphics, tint: IceColorFn, tones: IceTones,
    x: number, y: number, radius: number, t: number, alpha: number, seed: number,
  ): void {
    // Rim is a fixed jagged polygon that does NOT wobble — ice is rigid, and a breathing edge
    // makes the patch read as liquid.
    const segs = 18;
    const rim = (rr: number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const idx = i % segs;
        const a = (idx / segs) * TAU;
        const jag = 0.86 + ((Math.sin(idx * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1 * 0.26;
        const px = x + Math.cos(a) * rr * jag, py = y + Math.sin(a) * rr * jag;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    g.fillStyle(tint(tones.shell), 0.42 * alpha);
    rim(radius); g.fillPath();
    g.fillStyle(tint(tones.body), 0.26 * alpha);
    rim(radius * 0.78); g.fillPath();
    g.lineStyle(1.5, tint(tones.lit), 0.6 * alpha);
    rim(radius); g.strokePath();

    // Fracture lines radiating from the middle — the tell that this is a frozen plate.
    g.lineStyle(1, tint(tones.lit), 0.4 * alpha);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + seed;
      g.beginPath();
      g.moveTo(x, y);
      const midA = a + 0.3;
      g.lineTo(x + Math.cos(a) * radius * 0.5, y + Math.sin(a) * radius * 0.5);
      g.lineTo(x + Math.cos(midA) * radius * 0.9, y + Math.sin(midA) * radius * 0.9);
      g.strokePath();
    }

    // Two glints sliding across the surface.
    for (let i = 0; i < 2; i++) {
      const p = t * (0.6 + i * 0.3) + seed + i * 2.2;
      const gx = x + Math.cos(p) * radius * 0.45;
      const gy = y + Math.sin(p) * radius * 0.3;
      g.fillStyle(tint(tones.spark), 0.35 * alpha);
      g.fillEllipse(gx, gy, radius * 0.35, radius * 0.08);
    }
  }

  /**
   * The impaling icicle: a long spike driven down through a target, with a cracked entry wound
   * and a bead of meltwater running off the point. Painted into a caller-owned Graphics because
   * the kit already redraws it every frame at a moving position.
   */
  static drawIcicle(
    g: Phaser.GameObjects.Graphics, tint: IceColorFn, tones: IceTones,
    x: number, y: number, t: number, charge: number,
  ): void {
    // Shard points *down* into the target, so it is drawn from above the head downward.
    const sway = Math.sin(t * 2.2) * 0.05;
    g.fillStyle(tint(tones.shell), 0.5);
    iceShard(g, x, y - 52, Math.PI / 2 + sway, 34, 9, 0.5);
    g.fillStyle(tint(tones.body), 0.96);
    iceShard(g, x, y - 50, Math.PI / 2 + sway, 30, 6.6, 0.5);
    g.fillStyle(tint(tones.lit), 0.85);
    iceShard(g, x - 1.5, y - 48, Math.PI / 2 + sway, 24, 2.6, 0.3);

    // Charge band: fills as the host takes damage, so the shatter is telegraphed.
    const bandY = y - 44;
    g.fillStyle(tint(tones.shell), 0.75);
    g.fillRect(x - 9, bandY, 18, 2.6);
    g.fillStyle(tint(tones.spark), 0.9);
    g.fillRect(x - 9, bandY, 18 * Phaser.Math.Clamp(charge, 0, 1), 2.6);

    // Cracked entry wound where it went in.
    g.lineStyle(1.4, tint(tones.lit), 0.75);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.5;
      g.beginPath();
      g.moveTo(x, y - 20);
      g.lineTo(x + Math.cos(a) * 8, y - 20 + Math.sin(a) * 5);
      g.strokePath();
    }
    // Bead of melt running off the point.
    const drip = (t * 0.9) % 1;
    g.fillStyle(tint(tones.lit), 0.7 * (1 - drip));
    g.fillCircle(x, y - 18 + drip * 10, 1.8 * (1 - drip * 0.5));
  }

  /**
   * The Snow perk's turret: three packed snowballs stacked into a squat gun emplacement, with a
   * hollowed barrel swinging round to face its mark, a magazine of loose snowballs riding on the
   * shoulders (one per frost stack of ammo), and a drift of settled snow round the base.
   *
   * It is deliberately *packed snow*, not carved ice — soft round masses with a crusted rim
   * rather than the faceted shards everything else in the element is built from, so a turret
   * standing in a field of ice spikes still reads at a glance.
   */
  static drawSnowTurret(
    g: Phaser.GameObjects.Graphics, tint: IceColorFn, tones: IceTones,
    x: number, y: number, aim: number, t: number, ammo: number, ready: number, alpha = 1,
  ): void {
    const breathe = 1 + Math.sin(t * 1.6) * 0.02;

    // Drift: the snow it was packed out of, still banked round its feet.
    g.fillStyle(tint(ICE.abyss), 0.3 * alpha);
    g.fillEllipse(x, y + 15, 54, 18);
    g.fillStyle(tint(tones.lit), 0.5 * alpha);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 0.2;
      g.fillEllipse(x + Math.cos(a) * 22, y + 13 + Math.sin(a) * 6, 16, 7);
    }

    // Body: two packed masses, the lower one squashed under the weight of the upper.
    g.fillStyle(tint(tones.shell), 0.9 * alpha);
    g.fillEllipse(x, y + 4, 46 * breathe, 34);
    g.fillStyle(tint(tones.body), 0.95 * alpha);
    g.fillEllipse(x, y + 2, 42 * breathe, 30);
    g.fillStyle(tint(tones.lit), 0.55 * alpha);
    g.fillEllipse(x - 6, y - 4, 22, 13);
    g.fillStyle(tint(tones.body), 0.96 * alpha);
    g.fillEllipse(x, y - 16, 30 * breathe, 25);
    g.fillStyle(tint(tones.lit), 0.5 * alpha);
    g.fillEllipse(x - 5, y - 21, 15, 9);
    // Crust: the wind-glazed rim every packed drift has.
    g.lineStyle(1.6, tint(tones.facet), 0.5 * alpha);
    g.strokeEllipse(x, y - 16, 30 * breathe, 25);
    g.strokeEllipse(x, y + 2, 42 * breathe, 30);

    // Barrel: a hollow tube of packed snow, swinging to the aim and jolting as it comes ready.
    const kick = 4 * (1 - Phaser.Math.Clamp(ready, 0, 1));
    const bx = x + Math.cos(aim) * (10 - kick);
    const by = y - 16 + Math.sin(aim) * (10 - kick);
    const ex = x + Math.cos(aim) * (34 - kick);
    const ey = y - 16 + Math.sin(aim) * (34 - kick);
    g.lineStyle(15, tint(tones.shell), 0.95 * alpha);
    g.lineBetween(bx, by, ex, ey);
    g.lineStyle(11, tint(tones.body), 0.95 * alpha);
    g.lineBetween(bx, by, ex, ey);
    g.fillStyle(tint(ICE.abyss), 0.85 * alpha);
    g.fillCircle(ex, ey, 4.6);
    // Cold bleeding out of the muzzle as it comes back up to pressure.
    g.fillStyle(tint(tones.spark), 0.35 * Phaser.Math.Clamp(ready, 0, 1) * alpha);
    g.fillCircle(ex, ey, 3 + Math.sin(t * 4) * 0.8);

    // Magazine: one loose snowball per round, riding round the shoulders.
    for (let i = 0; i < ammo; i++) {
      const a = -Math.PI / 2 + (i - (ammo - 1) / 2) * 0.62 + Math.sin(t * 1.1 + i) * 0.04;
      const px = x + Math.cos(a) * 26;
      const py = y - 8 + Math.sin(a) * 17;
      g.fillStyle(tint(tones.facet), 0.9 * alpha);
      g.fillCircle(px, py, 5.4);
      g.fillStyle(tint(tones.spark), 0.85 * alpha);
      g.fillCircle(px - 1.4, py - 1.6, 2.2);
    }

    // Two coal eyes, because it is still a thing made of snow.
    const ex1 = x + Math.cos(aim) * 6, ey1 = y - 20 + Math.sin(aim) * 4;
    const nx = -Math.sin(aim) * 5, ny = Math.cos(aim) * 3;
    g.fillStyle(tint(ICE.abyss), 0.9 * alpha);
    g.fillCircle(ex1 + nx, ey1 + ny, 2.3);
    g.fillCircle(ex1 - nx, ey1 - ny, 2.3);
  }

  /** One snowball in flight: a packed ball with a comet of powder trailing behind it. */
  static drawSnowball(
    g: Phaser.GameObjects.Graphics, tint: IceColorFn, tones: IceTones,
    x: number, y: number, angle: number, t: number,
  ): void {
    g.fillStyle(tint(tones.facet), 0.35);
    for (let i = 1; i <= 3; i++) {
      g.fillCircle(x - Math.cos(angle) * i * 7, y - Math.sin(angle) * i * 7, 6 - i * 1.3);
    }
    g.fillStyle(tint(tones.body), 0.95);
    g.fillCircle(x, y, 8);
    g.fillStyle(tint(tones.lit), 0.9);
    g.fillCircle(x - 2, y - 2.4, 4);
    g.fillStyle(tint(tones.spark), 0.8);
    g.fillCircle(x - 3 + Math.sin(t * 9) * 0.6, y - 3.4, 1.8);
  }

  /**
   * The curling stone: a squat granite slab seen in three-quarter view, with a polished running
   * band around its base, a bolted handle across the top, and a crust of rime that thickens with
   * every frost stack it has taken on. The handle and the crust turn with `spin` so the stone
   * visibly *rolls* as it slides — a disc sliding without rotation reads as a hovering token.
   *
   * Painted into a caller-owned Graphics because the kit already repaints it every frame.
   */
  static drawCurlingStone(
    g: Phaser.GameObjects.Graphics, tint: IceColorFn, tones: IceTones,
    x: number, y: number, spin: number, t: number, stacks: number, alpha = 1,
  ): void {
    const R = 17;

    // Shadow pooled under the slab — it's heavy, and it needs to sit *on* the floor.
    g.fillStyle(tint(ICE.abyss), 0.4 * alpha);
    g.fillEllipse(x, y + 8, R * 2.1, R * 0.9);

    // Granite body: a dark drum, drawn as a lower rim plus an upper face so it has thickness.
    g.fillStyle(tint(ICE.abyss), 0.96 * alpha);
    g.fillEllipse(x, y + 1, R * 2, R * 1.5);
    g.fillStyle(tint(tones.shell), 0.9 * alpha);
    g.fillEllipse(x, y - 3, R * 1.94, R * 1.42);
    // Running band: the polished ring the stone actually rides on.
    g.lineStyle(3, tint(tones.body), 0.8 * alpha);
    g.strokeEllipse(x, y + 3, R * 1.92, R * 1.24);
    // Top face, brighter and set back, with an off-centre sheen.
    g.fillStyle(tint(tones.body), 0.85 * alpha);
    g.fillEllipse(x, y - 6, R * 1.52, R * 1.02);
    g.fillStyle(tint(tones.facet), 0.45 * alpha);
    g.fillEllipse(x - R * 0.3, y - 8, R * 0.78, R * 0.44);

    // Rime crust: one shard per frost stack, growing off the rim and turning with the stone.
    for (let i = 0; i < stacks; i++) {
      const a = spin + (i / Math.max(1, stacks)) * TAU;
      const px = x + Math.cos(a) * R * 0.95;
      const py = y - 2 + Math.sin(a) * R * 0.66;
      g.fillStyle(tint(tones.facet), 0.75 * alpha);
      iceShard(g, px, py, a, 8 + stacks * 1.9, 3.4, 0.5);
      g.fillStyle(tint(tones.lit), 0.8 * alpha);
      iceShard(g, px, py, a, 5 + stacks * 1.2, 1.4, 0.3);
    }

    // Handle: a bolt through the middle and a grip bar swinging round as the stone rolls.
    const hx = Math.cos(spin) * R * 0.5;
    const hy = Math.sin(spin) * R * 0.3;
    g.lineStyle(3.4, tint(tones.shell), 0.95 * alpha);
    g.lineBetween(x - hx, y - 11 - hy, x + hx, y - 11 + hy);
    g.fillStyle(tint(tones.lit), 0.95 * alpha);
    g.fillCircle(x + hx, y - 11 + hy, 3.2);
    g.fillCircle(x - hx, y - 11 - hy, 3.2);
    g.fillStyle(tint(tones.body), alpha);
    g.fillCircle(x, y - 12, 4.4);
    g.fillStyle(tint(tones.spark), 0.9 * alpha);
    g.fillCircle(x - 1.5, y - 13.4, 1.7);

    // Cold breathing off the stone, tighter and brighter the more frost it holds.
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
    g.lineStyle(1.4, tint(tones.lit), (0.12 + stacks * 0.08) * pulse * alpha);
    g.strokeEllipse(x, y - 2, R * (2.25 + pulse * 0.35), R * (1.65 + pulse * 0.25));
  }

  /**
   * The block of ice around a frozen fighter: a faceted casing with an internal glow and rime
   * creeping up its faces. Painted into a caller-owned Graphics, one per frozen fighter.
   */
  static drawFrozenShell(
    g: Phaser.GameObjects.Graphics, tint: IceColorFn, tones: IceTones,
    x: number, y: number, t: number, alpha: number,
  ): void {
    const R = 30;
    // Casing: an irregular hexagonal prism seen face-on, deliberately not a circle.
    const pts: [number, number][] = [
      [-0.72, -0.9], [0.6, -1.0], [1.0, -0.15], [0.78, 0.92], [-0.55, 1.0], [-1.0, 0.1],
    ];
    const poly = (s: number) => {
      g.beginPath();
      pts.forEach(([px, py], i) => {
        const X = x + px * R * s, Y = y + py * R * s;
        if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
      });
      g.closePath();
    };

    g.fillStyle(tint(tones.shell), 0.42 * alpha);
    poly(1); g.fillPath();
    g.fillStyle(tint(tones.body), 0.28 * alpha);
    poly(0.82); g.fillPath();
    g.lineStyle(2.2, tint(tones.lit), 0.85 * alpha);
    poly(1); g.strokePath();

    // Internal facets catching the light, sliding as the block breathes.
    const shimmer = 0.5 + 0.5 * Math.sin(t * 2.4);
    g.lineStyle(1.4, tint(tones.spark), (0.3 + shimmer * 0.35) * alpha);
    g.beginPath();
    g.moveTo(x - R * 0.7, y - R * 0.5); g.lineTo(x + R * 0.2, y + R * 0.8);
    g.moveTo(x + R * 0.3, y - R * 0.85); g.lineTo(x + R * 0.85, y + R * 0.1);
    g.strokePath();

    // Rime spikes growing off the casing.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      const grow = 0.7 + 0.3 * Math.sin(t * 1.8 + i);
      g.fillStyle(tint(tones.lit), 0.7 * alpha);
      iceShard(g, x + Math.cos(a) * R * 0.85, y + Math.sin(a) * R * 0.85, a, 12 * grow, 3.4, 0.5);
    }
  }
}

// ── IceArmor ──────────────────────────────────────────────────────────────

/**
 * Persistent shell of ice plates around a fighter (Block Up, Black Ice Morph). Driven by
 * whoever owns it — call `update` every frame with the fighter's position.
 */
export class IceArmor {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private chipAccum = 0;
  private plates: { ang: number; len: number; w: number; skew: number; bob: number; phase: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: IceColorFn,
    private tones: IceTones,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 8,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.plates = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.45 + Math.random() * 0.3,
      w: 0.16 + Math.random() * 0.08,
      skew: (Math.random() - 0.5) * 1.2,
      bob: 0.03 + Math.random() * 0.05,
      phase: Math.random() * TAU,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }
  setTones(tones: IceTones): void { this.tones = tones; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    // Armour barely rotates — it is locked to the body, not orbiting it. A fast spin here makes
    // the shell read as a magic circle instead of as plating.
    const spin = this.t * 0.22;
    g.fillStyle(this.tint(this.tones.shell), 0.2 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * 0.95);

    for (const p of this.plates) {
      const bob = 1 + Math.sin(this.t * 2.2 + p.phase) * p.bob;
      const ang = p.ang + spin;
      iceShardLayered(
        g, this.tint, this.tones,
        x + Math.cos(ang) * this.radius * 0.5 * bob, y + Math.sin(ang) * this.radius * 0.5 * bob,
        ang, this.radius * p.len * this.intensity * bob, this.radius * p.w, p.skew,
        0.75 * alpha, false,
      );
    }

    this.chipAccum += delta;
    const interval = 420 / Math.max(0.4, this.intensity);
    if (this.chipAccum >= interval) {
      this.chipAccum = 0;
      new IceFx(this.scene, this.tint).shards(
        x + (Math.random() - 0.5) * this.radius * 1.3,
        y + (Math.random() - 0.5) * this.radius * 0.8,
        1, { speed: 18, size: 2.2, life: 700, fall: 34, depth: 4, isVoid: this.tones === VOID_TONES },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── IceAvatar ─────────────────────────────────────────────────────────────

/** Concentric discs of one frozen ball hand, outermost first. */
const ICE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: ICE.steel, alpha: 0.28 },
    { r: 6.4, color: ICE.ice, alpha: 0.92 },
    { r: 3.6, color: ICE.pale, alpha: 1 },
    // Hard, small, off-axis glint: ice takes a sharper specular than water does.
    { r: 1.4, color: ICE.white, alpha: 1, ox: -1.9, oy: -2 },
  ],
  eyeWhite: ICE.pale,
  eyePupil: ICE.abyss,
  // A frozen hand is rigid — it smears far less than a liquid one.
  squash: { div: 17, x: 0.34, y: 0.16 },
};

/**
 * The ice character rig: two frozen ball hands, a pair of eyes, and a crown of shards growing
 * off the head. The hands, eyes and gestures come from BaseAvatar; what ice adds is the chill
 * pooling underneath and the crystals above.
 */
export class IceAvatar extends BaseAvatar {
  private fx: IceFx;
  private tones: IceTones = FROST_TONES;

  constructor(scene: Phaser.Scene, tint: IceColorFn, depth = 6) {
    super(scene, tint, depth, ICE_AVATAR);
    this.fx = new IceFx(scene, tint);
  }

  /**
   * Black Ice Morph swaps the whole rig onto the void palette, so the transformation is
   * readable on the character itself and not only on what it throws.
   */
  setVoid(on: boolean): void {
    const next = on ? VOID_TONES : FROST_TONES;
    if (next === this.tones) return;
    this.tones = next;
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(next.body), 0.92));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(next.lit), 1));
    this.setEyeWhite(on ? ICE.voidPale : (this.mastered ? ICE.white : ICE.pale));
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered ice
   * user is identifiable at a glance before they cast anything: white eyes, a wider rime halo
   * and a hard rim on each hand, a taller crown, and three shards orbiting the head. Shape
   * changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ICE.white : (this.tones === VOID_TONES ? ICE.voidPale : ICE.pale));
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(this.tint(on ? this.tones.facet : ICE.steel), on ? 0.34 : 0.28);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(ICE.white), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed chips of ice. */
  protected emitTrail(x: number, y: number): void {
    this.fx.shards(x, y, 1, { speed: 14, size: 2, life: 520, fall: 30, depth: 5, isVoid: this.tones === VOID_TONES });
  }

  /** The chill pooling under the character, with rime creeping outward along the ground. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(this.tones.shell), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 5, 56 * this.intensity, 32 * this.intensity);
    g.fillStyle(this.tint(this.tones.body), a * 0.14 * this.intensity);
    g.fillEllipse(x, y + 6, 36 * this.intensity, 20 * this.intensity);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * TAU + Math.sin(this.t * 0.5) * 0.2;
      const reach = (13 + Math.sin(this.t * 1.6 + i * 1.3) * 4) * this.intensity;
      g.fillStyle(this.tint(this.tones.facet), a * 0.5);
      iceShard(g, x, y + 6, ang, reach, 2.6, (i % 2 ? 1 : -1) * 0.5);
    }
  }

  /**
   * The crown: shards growing off the top of the head, each on its own slow bob. Rooted at
   * y - 18 so they never cover the face, and drawn over the sprite so their lit edges show
   * rather than only the dark tips clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.35 : 1;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const p = this.t * 1.6 + i * 1.4;
      // Ice doesn't sway — it *grows*. The crown breathes in length rather than leaning.
      const height = (20 + Math.sin(p) * 3.5) * this.intensity * scale;
      iceShardLayered(
        g, this.tint, this.tones,
        x + side * 7, rootY,
        -Math.PI / 2 + side * 0.4, height, 5 * scale, side * 0.6, a * 0.95, false,
      );
    }

    // Mastery orbit: three shards circling the head on a shallow ellipse, each tumbling on its
    // own axis so the crown reads as ice in motion, not as beads on a wire.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.4 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 24;
        const cy = y - 30 + Math.sin(p) * 7;
        const spin = this.t * 2.2 + i * 2;
        g.fillStyle(this.tint(this.tones.body), alpha * 0.8);
        iceShard(g, cx, cy, spin, 11, 3.2, 0.6);
        g.fillStyle(this.tint(this.tones.spark), alpha * 0.85);
        iceShard(g, cx, cy, spin, 6, 1.2, 0.4);
      }
    }
  }
}
