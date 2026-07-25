import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Light renders: the racer avatar (lamp ball hands, a
 * prismatic crest worn as a crown, eyes), the speed auras, and the one-shot effects every
 * ability throws off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes light
 * light: the prism shard, the chromatic split it throws, and everything built out of them.
 *
 * Every structural colour must come from the LIGHT palette below. Light has no colour-slot
 * cosmetic yet, but every call still routes through the owner's `lightColor` mapper, so the day
 * one lands it is a table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.lightColor bound to one owner. */
export type LightColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const LIGHT = {
  /** Everything light does happens against its own shadow. */
  night: 0x14110a,
  shade: 0x0a0a12,
  /** The element's own pale gold — a lance at a crawl. */
  pale: 0xfff4a8,
  cream: 0xfff0c0,
  glow: 0xffffcc,
  /** Heat: a lance gains these as it accelerates. */
  gold: 0xffdd44,
  amber: 0xffaa22,
  ember: 0xff8800,
  hot: 0xff6622,
  red: 0xff2200,
  crimson: 0xff3333,
  /** The prism's three ways out. Chromatic fringing is built from exactly these. */
  prismR: 0xff3355,
  prismG: 0x33ff66,
  prismB: 0x3399ff,
  /** Ramps, blinks and anything made of cold glass. */
  cyan: 0x66ddff,
  sky: 0x88ddff,
  glass: 0xbfe9ff,
  steel: 0x445577,
  white: 0xffffff,
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

/** Blend two packed colours — a lance runs pale → red as it winds up. */
export function mixColor(a: number, b: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const out = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(k * 100));
  return Phaser.Display.Color.GetColor(out.r, out.g, out.b);
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Light's primitive: a prism shard — a long, sharp kite with a leading point, a shoulder set
 * back from it, and a tail that comes to a second point. Cut, not drawn: the shoulder is what
 * separates it from a plain triangle and gives every beam and lance a facet to catch light on.
 */
export function lightShard(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  /** Where along the shard the widest point sits. 0.3 = a spearhead, 0.5 = a diamond. */
  shoulder = 0.32,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
  const s = len * shoulder;
  fillPts(g, [
    at(len * 0.5, 0),
    at(len * 0.5 - s, -halfW),
    at(-len * 0.5 + s * 0.35, -halfW * 0.42),
    at(-len * 0.5, 0),
    at(-len * 0.5 + s * 0.35, halfW * 0.42),
    at(len * 0.5 - s, halfW),
  ]);
}

/**
 * The primitive with its chromatic split: the same shard drawn three times a hair apart in the
 * prism's three colours, then the body over it, then a white core.
 *
 * The split is the whole identity. Light passing through anything separates, so every solid
 * light object in this element fringes red on one flank and blue on the other — and that fringe,
 * not the colour of the body, is what says "this is light" at gameplay zoom.
 */
export function lightShardLayered(
  g: Phaser.GameObjects.Graphics, tint: LightColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  color: number, alpha: number, shoulder = 0.32, split = 1.6,
): void {
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  // Bloom.
  g.fillStyle(tint(color), alpha * 0.16);
  lightShard(g, cx, cy, angle, len * 1.15, halfW * 2.4, shoulder);
  // Chromatic fringes, one either side.
  g.fillStyle(tint(LIGHT.prismR), alpha * 0.55);
  lightShard(g, cx + nx * split, cy + ny * split, angle, len, halfW, shoulder);
  g.fillStyle(tint(LIGHT.prismB), alpha * 0.55);
  lightShard(g, cx - nx * split, cy - ny * split, angle, len, halfW, shoulder);
  // Body + core.
  g.fillStyle(tint(color), alpha * 0.95);
  lightShard(g, cx, cy, angle, len, halfW * 0.86, shoulder);
  g.fillStyle(tint(LIGHT.white), alpha);
  lightShard(g, cx, cy, angle, len * 0.9, halfW * 0.3, shoulder);
}

/**
 * A beam between two points, tapering at both ends, with the same chromatic split running down
 * its flanks. Streaks, flare trails and every hitscan lane are this.
 */
export function lightBeam(
  g: Phaser.GameObjects.Graphics, tint: LightColorFn,
  x1: number, y1: number, x2: number, y2: number,
  color: number, width: number, alpha: number, taper = 0.75,
): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const band = (off: number, w: number, col: number, a: number): void => {
    const hw = w / 2;
    const ex = x1 + nx * off, ey = y1 + ny * off;
    const fx = x2 + nx * off, fy = y2 + ny * off;
    const mx = (ex + fx) / 2, my = (ey + fy) / 2;
    // A lens, not a bar: pinched to `taper` at both ends and full width across the middle.
    // Without the midpoint there is nowhere for the width to live and the shape collapses.
    const t = hw * (1 - taper);
    g.fillStyle(tint(col), a);
    fillPts(g, [
      { x: ex + nx * t, y: ey + ny * t },
      { x: mx + nx * hw, y: my + ny * hw },
      { x: fx + nx * t, y: fy + ny * t },
      { x: fx - nx * t, y: fy - ny * t },
      { x: mx - nx * hw, y: my - ny * hw },
      { x: ex - nx * t, y: ey - ny * t },
    ]);
  };
  band(0, width * 2.6, color, alpha * 0.16);
  band(width * 0.34, width * 0.55, LIGHT.prismR, alpha * 0.6);
  band(-width * 0.34, width * 0.55, LIGHT.prismB, alpha * 0.6);
  band(0, width, color, alpha * 0.9);
  band(0, width * 0.3, LIGHT.white, alpha);
}

/**
 * The rainbow fan a prism throws: wedges of the spectrum splaying out of a point. Used wherever
 * light is being *broken* rather than merely emitted — ramps, drills, the Q teleport chain.
 */
export function prismFan(
  g: Phaser.GameObjects.Graphics, tint: LightColorFn,
  cx: number, cy: number, angle: number, spread: number, len: number, alpha: number,
): void {
  const bands = [LIGHT.prismR, LIGHT.amber, LIGHT.pale, LIGHT.prismG, LIGHT.cyan, LIGHT.prismB];
  for (let i = 0; i < bands.length; i++) {
    const f = (i + 0.5) / bands.length;
    const a = angle - spread + f * spread * 2;
    const w = spread / bands.length;
    g.fillStyle(tint(bands[i]), alpha * 0.5);
    fillPts(g, [
      { x: cx, y: cy },
      { x: cx + Math.cos(a - w) * len, y: cy + Math.sin(a - w) * len },
      { x: cx + Math.cos(a + w) * len, y: cy + Math.sin(a + w) * len },
    ]);
  }
}

/**
 * An anamorphic lens flare: a blown-out core, a long horizontal streak through it, a shorter
 * vertical one, and a ring of ghosts down the axis. The single most "light" shape there is.
 */
export function lensFlare(
  g: Phaser.GameObjects.Graphics, tint: LightColorFn,
  cx: number, cy: number, scale: number, color: number, alpha: number, angle = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (lx: number, ly: number): Pt => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });

  g.fillStyle(tint(color), alpha * 0.28);
  g.fillCircle(cx, cy, 16 * scale);
  // Long streak + short cross.
  g.fillStyle(tint(LIGHT.white), alpha * 0.8);
  fillPts(g, [at(-46 * scale, 0), at(0, -2.6 * scale), at(46 * scale, 0), at(0, 2.6 * scale)]);
  g.fillStyle(tint(color), alpha * 0.75);
  fillPts(g, [at(0, -20 * scale), at(2.2 * scale, 0), at(0, 20 * scale), at(-2.2 * scale, 0)]);
  // Ghosts running down the axis, the way a real lens repeats an aperture.
  for (const [d, r, c] of [[0.42, 3.4, LIGHT.prismG], [0.7, 5, LIGHT.prismB], [-0.55, 4, LIGHT.prismR]] as const) {
    const p = at(46 * scale * d, 0);
    g.fillStyle(tint(c), alpha * 0.3);
    g.fillCircle(p.x, p.y, r * scale);
  }
  g.fillStyle(tint(LIGHT.white), alpha);
  g.fillCircle(cx, cy, 4.4 * scale);
}

// ── LightFx ───────────────────────────────────────────────────────────────

export interface LightBoomOpts {
  /** Shards thrown clear. Defaults to radius/9. */
  shards?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Scorch the floor with a burn ring. Default true. */
  mark?: boolean;
}

/**
 * One-shot light effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class LightFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: LightColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the LIGHT default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 9, color: number = LIGHT.pale): void {
    this.flashIn(x, y, radius, LIGHT.white, color, depth);
  }

  /** A lens flare popping and fading — every notable light event opens with one. */
  flare(x: number, y: number, scale = 1, depth = 11, color: number = LIGHT.pale, angle = 0): void {
    this.anim(depth, 300, (g, t) => {
      const pop = t < 0.2 ? easeOut(t / 0.2) : 1 - easeIn((t - 0.2) / 0.8);
      lensFlare(g, this.tint, x, y, scale * (0.6 + pop * 0.7), color, pop, angle);
    });
  }

  /**
   * An expanding front, drawn as a ring of shards standing on end rather than a stroked circle,
   * so even a shockwave is made of the element's own primitive.
   */
  ring(
    x: number, y: number, fromR: number, toR: number, color: number,
    duration = 400, width = 5, depth = 7,
  ): void {
    const spokes = Phaser.Math.Clamp(Math.round(toR / 9), 10, 44);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU + t * 0.5;
        g.fillStyle(this.tint(i % 3 === 0 ? LIGHT.white : color), 0.8 * fade);
        lightShard(g, x + Math.cos(a) * r, y + Math.sin(a) * r, a, width * 3.2 * (1 - t * 0.4), width * (1 - t * 0.4));
      }
    });
  }

  /** Shards flung out of something, spinning as they go. */
  shards(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; fall?: number } = {},
  ): void {
    const speed = o.speed ?? 210;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 14;
    const life = o.life ?? 460;
    const depth = o.depth ?? 9;
    const color = o.color ?? LIGHT.pale;
    const fall = o.fall ?? 0;

    const parts = Array.from({ length: count }, (_, i) => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a), a,
        v: speed * (0.45 + Math.random() * 0.9),
        s: size * (0.6 + Math.random() * 0.8),
        spin: (Math.random() - 0.5) * 9,
        col: i % 4 === 0 ? LIGHT.prismR : i % 4 === 1 ? LIGHT.prismG : i % 4 === 2 ? LIGHT.prismB : color,
        delay: Math.random() * 0.18,
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
        g.fillStyle(this.tint(p.col), 0.9 * fade);
        lightShard(g, cx, cy, p.a + p.spin * lt, p.s * (1 - lt * 0.4), p.s * 0.24);
      }
    });
  }

  /**
   * A full detonation: white core, a lens flare, a prism fan blown outward, staggered shard
   * rings, spinning shards and a scorch ring left behind.
   */
  boom(x: number, y: number, radius: number, o: LightBoomOpts = {}): void {
    const color = o.color ?? LIGHT.pale;
    const shardCount = o.shards ?? Math.max(6, Math.round(radius / 9));
    const dur = o.duration ?? Math.round(320 + radius * 1.1);
    const depth = o.depth ?? 9;

    if (o.mark !== false) this.burnMark(x, y, radius * 0.7, depth - 7);
    this.flash(x, y, radius * 0.4, depth + 2, color);
    this.flare(x, y, radius / 46, depth + 3, color);

    // The prism fan: the blast splitting into its spectrum as it goes.
    this.anim(depth, dur, (g, t) => {
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + t * 0.9;
        prismFan(g, this.tint, x, y, a, 0.5, radius * (0.35 + easeOut(t) * 0.75), fade * 0.75);
      }
    });

    this.ring(x, y, radius * 0.2, radius * 1.05, color, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.15, radius * 1.3, LIGHT.white, dur, 3, depth));
    this.shards(x, y, shardCount, { speed: radius * 2.2, size: 10 + radius / 8, life: Math.round(dur * 1.2), depth: depth + 1, color });
  }

  /** A one-shot beam thrown between two points, fading from the far end back. */
  beam(
    x1: number, y1: number, x2: number, y2: number, color: number,
    width = 7, duration = 260, depth = 10,
  ): void {
    this.anim(depth, duration, (g, t) => {
      const fade = 1 - easeIn(t);
      lightBeam(g, this.tint, x1, y1, x2, y2, color, width * (1 - t * 0.5), 0.95 * fade);
    });
    this.flare(x2, y2, 0.7, depth + 1, color, Math.atan2(y2 - y1, x2 - x1));
  }

  /** Motion streaks trailing something fast — the tell for speed itself. */
  speedLines(x: number, y: number, angle: number, scale = 1, depth = 8, color: number = LIGHT.pale): void {
    const lines = Array.from({ length: 6 }, () => ({
      off: (Math.random() - 0.5) * 30 * scale,
      len: (26 + Math.random() * 40) * scale,
      delay: Math.random() * 0.3,
    }));
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    this.anim(depth, 300, (g, t) => {
      for (const l of lines) {
        const lt = (t - l.delay) / (1 - l.delay);
        if (lt <= 0) continue;
        const back = 10 + lt * 60 * scale;
        const sx = x - Math.cos(angle) * back + nx * l.off;
        const sy = y - Math.sin(angle) * back + ny * l.off;
        g.fillStyle(this.tint(color), 0.7 * (1 - lt));
        lightShard(g, sx, sy, angle, l.len * (1 - lt * 0.4), 2.2 * (1 - lt), 0.5);
      }
    });
  }

  /** Sparks of prism colour thrown off a hit, a boost, or anything that just went right. */
  sparkle(x: number, y: number, count: number, radius: number, depth = 11, color: number = LIGHT.gold): void {
    const motes = Array.from({ length: count }, (_, i) => ({
      ox: (Math.random() - 0.5) * radius * 1.7,
      oy: (Math.random() - 0.5) * radius * 1.4,
      drift: (Math.random() - 0.5) * 30,
      r: 1.6 + Math.random() * 2.2,
      phase: Math.random() * TAU,
      col: i % 3 === 0 ? LIGHT.prismG : i % 3 === 1 ? LIGHT.prismB : color,
      delay: Math.random() * 0.28,
    }));
    this.anim(depth, 720, (g, t) => {
      for (const m of motes) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const cx = x + m.ox + m.drift * lt;
        const cy = y + m.oy - 20 * lt;
        const tw = Math.max(0, Math.sin(t * 12 + m.phase));
        if (tw <= 0.02) continue;
        g.fillStyle(this.tint(m.col), 0.9 * (1 - lt) * tw);
        fillPts(g, [
          { x: cx - m.r * 5.5 * tw, y: cy }, { x: cx, y: cy - m.r * 0.8 },
          { x: cx + m.r * 5.5 * tw, y: cy }, { x: cx, y: cy + m.r * 0.8 },
        ]);
        fillPts(g, [
          { x: cx, y: cy - m.r * 5.5 * tw }, { x: cx + m.r * 0.8, y: cy },
          { x: cx, y: cy + m.r * 5.5 * tw }, { x: cx - m.r * 0.8, y: cy },
        ]);
      }
    });
  }

  /** A scorch ring burnt into the floor where light landed hard. */
  burnMark(x: number, y: number, radius: number, depth = 2, color: number = LIGHT.amber): void {
    this.anim(depth, 1600, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(LIGHT.shade), 0.34 * a);
      g.fillEllipse(x, y, radius * 2, radius * 1.05);
      g.lineStyle(3, this.tint(color), 0.4 * a);
      g.strokeEllipse(x, y, radius * 1.5, radius * 0.8);
      g.lineStyle(1.4, this.tint(LIGHT.hot), 0.3 * a);
      g.strokeEllipse(x, y, radius * 0.9, radius * 0.48);
    });
  }

  /** A puff of superheated steam off a charging engine. `heat` 0→1 runs it grey → red. */
  steam(x: number, y: number, heat: number, depth = 11): void {
    const col = mixColor(LIGHT.glass, LIGHT.red, heat);
    const puffs = Array.from({ length: 3 }, () => ({
      ox: (Math.random() - 0.5) * 14,
      r: 3.5 + Math.random() * 3 + heat * 3,
      drift: (Math.random() - 0.5) * 16,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 520, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(col), 0.6 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y - 30 * lt, p.r * (1 + lt * 1.3));
      }
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // a lance's acceleration ratio, a ramp's remaining charges, a rider's place on the shaft.

  /**
   * The light lance: a shard held out at arm's length, heating from pale to red as acceleration
   * builds and trailing a wake of its own colour. The wake is what turns "a triangle in front of
   * the fighter" into "a fighter riding a beam".
   */
  static drawLance(
    g: Phaser.GameObjects.Graphics, tint: LightColorFn,
    x: number, y: number, angle: number, ratio: number, t: number,
    enhanced: boolean, alpha = 1,
  ): void {
    const heat = Phaser.Math.Clamp(ratio, 0, 1);
    const color = enhanced ? mixColor(LIGHT.amber, LIGHT.red, heat) : mixColor(LIGHT.pale, LIGHT.red, heat);
    const len = (enhanced ? 62 : 44) * (1 + heat * 0.35);
    const hw = (enhanced ? 11 : 7) * (1 + heat * 0.25);
    const dist = enhanced ? 44 : 34;
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;

    // Wake: three ghosts of the lance strung back toward the caster, brighter the faster you go.
    for (let i = 3; i >= 1; i--) {
      const back = dist - i * 11;
      g.fillStyle(tint(color), alpha * 0.16 * heat * (1 - i * 0.22));
      lightShard(g, x + Math.cos(angle) * back, y + Math.sin(angle) * back, angle, len * 0.8, hw * 1.3);
    }

    lightShardLayered(g, tint, cx, cy, angle, len, hw, color, alpha, 0.3, 1.6 + heat * 2.4);

    // Heat haze rolling off the tip once it is really moving.
    if (heat > 0.4) {
      const tipX = cx + Math.cos(angle) * len * 0.5;
      const tipY = cy + Math.sin(angle) * len * 0.5;
      for (let i = 0; i < 3; i++) {
        const p = (t * 2.4 + i / 3) % 1;
        g.fillStyle(tint(LIGHT.hot), alpha * 0.4 * (heat - 0.4) * (1 - p));
        g.fillCircle(tipX + Math.cos(angle) * p * 20, tipY + Math.sin(angle) * p * 20, 3 + p * 7);
      }
    }
    // Enhanced: a gold collar at the base, so an impaling lance reads before it lands.
    if (enhanced) {
      g.fillStyle(tint(LIGHT.gold), alpha * 0.9);
      lightShard(g, x + Math.cos(angle) * (dist - len * 0.42), y + Math.sin(angle) * (dist - len * 0.42),
        angle + Math.PI / 2, hw * 3.4, 3, 0.5);
    }
  }

  /**
   * A prism ramp: a wedge of cut glass standing on the floor, with the spectrum caught inside it
   * and a lit leading lip. It is a jump *and* a prism, so it has to look like both.
   */
  static drawRamp(
    g: Phaser.GameObjects.Graphics, tint: LightColorFn,
    x: number, y: number, angle: number, t: number, alpha = 1,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const at = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });

    g.fillStyle(tint(LIGHT.shade), alpha * 0.35);
    g.fillEllipse(x, y + 8, 52, 16);

    // The wedge: low at the back, high at the leading lip.
    const body = [at(-24, -9), at(24, -14), at(24, 14), at(-24, 9)];
    g.fillStyle(tint(LIGHT.glass), alpha * 0.55);
    fillPts(g, body);
    g.lineStyle(2, tint(LIGHT.white), alpha * 0.85);
    strokePts(g, body, true);

    // The spectrum caught inside the glass, sliding as it refracts.
    const bands = [LIGHT.prismR, LIGHT.amber, LIGHT.prismG, LIGHT.cyan, LIGHT.prismB];
    for (let i = 0; i < bands.length; i++) {
      const f = -20 + ((i * 9 + t * 22) % 40);
      g.fillStyle(tint(bands[i]), alpha * 0.5);
      fillPts(g, [at(f, -11), at(f + 5, -11), at(f + 5, 11), at(f, 11)]);
    }

    // Lit leading lip, pulsing so an armed ramp is readable from across the arena.
    g.fillStyle(tint(LIGHT.white), alpha * (0.6 + 0.4 * Math.sin(t * 6)));
    fillPts(g, [at(22, -14), at(26, -14), at(26, 14), at(22, 14)]);
  }

  /** A light streak left across the arena — a beam that lingers and still bites. */
  static drawStreak(
    g: Phaser.GameObjects.Graphics, tint: LightColorFn,
    x1: number, y1: number, x2: number, y2: number, width: number,
    color: number, alpha: number, t: number,
  ): void {
    lightBeam(g, tint, x1, y1, x2, y2, color, width, alpha);
    // Pulses running the length of it, so a lingering streak never looks like a static bar.
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    for (let i = 0; i < 2; i++) {
      const f = (t * 0.8 + i / 2) % 1;
      g.fillStyle(tint(LIGHT.white), alpha * 0.7 * (1 - Math.abs(f - 0.5) * 1.4));
      lightShard(g, x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, ang, Math.min(46, dist * 0.2), width * 0.7);
    }
  }

  /** The prism drill: a boring head of stacked shards, spinning as it grinds forward. */
  static drawDrill(
    g: Phaser.GameObjects.Graphics, tint: LightColorFn,
    x: number, y: number, angle: number, t: number, biting: boolean, alpha = 1,
  ): void {
    const spin = t * (biting ? 26 : 11);
    // Three flutes around the axis, each catching the light on its own phase.
    for (let i = 0; i < 3; i++) {
      const ph = spin + (i / 3) * TAU;
      const off = Math.sin(ph) * 7;
      const nx = -Math.sin(angle), ny = Math.cos(angle);
      g.fillStyle(tint(Math.cos(ph) > 0 ? LIGHT.white : LIGHT.ember), alpha * 0.85);
      lightShard(g, x + nx * off, y + ny * off, angle, 30, 5, 0.28);
    }
    lightShardLayered(g, tint, x, y, angle, 40, 9, LIGHT.red, alpha, 0.22, 2);
    if (biting) {
      // Grinding: sparks and a spectrum spray off the contact point.
      const tipX = x + Math.cos(angle) * 20, tipY = y + Math.sin(angle) * 20;
      prismFan(g, tint, tipX, tipY, angle, 0.9, 22 + Math.sin(t * 30) * 6, alpha * 0.8);
      g.fillStyle(tint(LIGHT.white), alpha * (0.5 + 0.5 * Math.sin(t * 40)));
      g.fillCircle(tipX, tipY, 4);
    }
  }

  /**
   * The Killer Kebab shaft: a gold spit running out past the last rider, with a spiral of heat
   * turning along it and a barbed point on the end.
   */
  static drawKebabShaft(
    g: Phaser.GameObjects.Graphics, tint: LightColorFn,
    x: number, y: number, angle: number, len: number, ratio: number, t: number, alpha = 1,
  ): void {
    const color = mixColor(LIGHT.amber, LIGHT.red, Phaser.Math.Clamp(ratio, 0, 1));
    const ex = x + Math.cos(angle) * len, ey = y + Math.sin(angle) * len;
    lightBeam(g, tint, x, y, ex, ey, color, 8, alpha, 0.25);
    // Heat spiralling down the spit.
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    for (let i = 0; i < 10; i++) {
      const f = i / 10;
      const w = Math.sin(f * 9 - t * 8) * 5;
      g.fillStyle(tint(LIGHT.cream), alpha * 0.8);
      g.fillCircle(x + Math.cos(angle) * len * f + nx * w, y + Math.sin(angle) * len * f + ny * w, 1.8);
    }
    // Barbed point.
    g.fillStyle(tint(LIGHT.white), alpha);
    lightShard(g, ex, ey, angle, 20, 6, 0.24);
    g.fillStyle(tint(color), alpha * 0.9);
    lightShard(g, ex - Math.cos(angle) * 9, ey - Math.sin(angle) * 9, angle + Math.PI, 14, 7, 0.3);
  }

  /** The spike run through one rider — drawn separately so it sits over the skewered fighter. */
  static drawSpike(
    g: Phaser.GameObjects.Graphics, tint: LightColorFn,
    x: number, y: number, angle: number, t: number, alpha = 1,
  ): void {
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin(t * 8));
    lightShardLayered(g, tint, x, y, angle, 64, 5, LIGHT.amber, alpha * pulse, 0.2, 1.2);
    // Blood-hot glow where the shaft passes through.
    g.fillStyle(tint(LIGHT.hot), alpha * 0.4 * pulse);
    g.fillCircle(x, y, 9);
  }
}

// ── LightAura ─────────────────────────────────────────────────────────────

export type LightAuraStyle =
  | 'boost'    // Ramp / trick / blink boost: streak lines dragging behind
  | 'redline'  // Click+ danger zone: the frame glowing hot around the body
  | 'charge'   // E+ Steam Charge: energy winding into the chest
  | 'kebab';   // Mastery window: the gold corona that says the lance can impale

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: boost drags, redline shimmers, charge compresses inward, kebab
 * orbits. Two can be up at once (a boosted, enhanced lance), so they must stay separable.
 */
export class LightAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: LightColorFn,
    private style: LightAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** For boost/redline this is the acceleration ratio; for charge, how long it has been held. */
  setIntensity(v: number): void { this.intensity = v; }
  /** Heading, so trailing effects know which way "behind" is. */
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
      case 'boost': {
        // Streaks dragged out behind the heading — the faster you go, the longer they run.
        const back = this.angle + Math.PI;
        const nx = -Math.sin(this.angle), ny = Math.cos(this.angle);
        g.fillStyle(this.tint(LIGHT.pale), 0.1 * alpha * (0.4 + k));
        g.fillCircle(x, y, r);
        for (let i = 0; i < 5; i++) {
          const p = (this.t * (1.4 + k * 2.4) + i / 5) % 1;
          const off = (i - 2) * 7;
          const d = 12 + p * (34 + k * 46);
          g.fillStyle(this.tint(i % 2 === 0 ? LIGHT.pale : LIGHT.gold), 0.8 * alpha * (1 - p));
          lightShard(g, x + Math.cos(back) * d + nx * off, y + Math.sin(back) * d + ny * off,
            this.angle, (16 + k * 26) * (1 - p * 0.4), 2.4 * (1 - p * 0.4), 0.5);
        }
        break;
      }
      case 'redline': {
        // The body running hot: a shimmering rim that jitters harder the deeper into the red.
        for (let i = 0; i < 3; i++) {
          const wob = Math.sin(this.t * 33 + i * 2.1) * (1.4 + k * 2.6);
          g.lineStyle(2 - i * 0.5, this.tint(i === 0 ? LIGHT.white : LIGHT.red), (0.7 - i * 0.2) * alpha * k);
          g.strokeCircle(x + wob, y - wob * 0.6, r + i * 4);
        }
        g.fillStyle(this.tint(LIGHT.red), 0.14 * alpha * k);
        g.fillCircle(x, y, r * 1.25);
        break;
      }
      case 'charge': {
        // Light being wound in rather than thrown out: shards spiralling toward the chest.
        for (let i = 0; i < 6; i++) {
          const p = (this.t * 1.5 + i / 6) % 1;
          const a = this.angle + i * 1.05 + this.t * 3;
          const d = r * (1.6 - p * 1.3);
          g.fillStyle(this.tint(mixColor(LIGHT.glass, LIGHT.red, k)), 0.85 * alpha * p);
          lightShard(g, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI, 14 * p, 3 * p, 0.4);
        }
        g.fillStyle(this.tint(mixColor(LIGHT.white, LIGHT.red, k)), (0.35 + 0.5 * k) * alpha);
        g.fillCircle(x, y, 5 + k * 7);
        break;
      }
      case 'kebab': {
        // A gold corona with skewers orbiting it — the lance is loaded and it is about to hurt.
        g.fillStyle(this.tint(LIGHT.amber), 0.14 * alpha);
        g.fillCircle(x, y, r * 1.15);
        g.lineStyle(2, this.tint(LIGHT.gold), (0.5 + 0.3 * Math.sin(this.t * 6)) * alpha);
        g.strokeCircle(x, y, r);
        for (let i = 0; i < 4; i++) {
          const a = this.t * 2.2 + (i / 4) * TAU;
          g.fillStyle(this.tint(LIGHT.cream), 0.9 * alpha);
          lightShard(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, a + Math.PI / 2, 14, 3, 0.3);
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── LightAvatar ───────────────────────────────────────────────────────────

/** Concentric discs of one lamp ball hand, outermost first. */
const LIGHT_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: LIGHT.pale, alpha: 0.26 },
    { r: 6.8, color: LIGHT.gold, alpha: 0.92 },
    { r: 4, color: LIGHT.glow, alpha: 1 },
    { r: 1.6, color: LIGHT.white, alpha: 1, ox: -2, oy: -2 },
  ],
  eyeWhite: LIGHT.glow,
  eyePupil: LIGHT.night,
  // A driver's hands: they snap to the wheel and smear hard on the straights.
  squash: { div: 11, x: 0.6, y: 0.32 },
};

/**
 * The light character rig: two lamp ball hands, a pair of eyes, and a prismatic crest over the
 * crown that rakes back with speed. Hands, eyes and gestures come from BaseAvatar; what light
 * adds is the pool of headlight underfoot and the crest above.
 */
export class LightAvatar extends BaseAvatar {
  private fx: LightFx;
  /** Warm crest for the player, cold for the NPC, so two light racers never blur together. */
  private accent: number;
  /** 0 = standing still, 1 = flat out. Rakes the crest and stretches the glow. */
  private speed = 0;

  constructor(scene: Phaser.Scene, tint: LightColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, LIGHT_AVATAR);
    this.fx = new LightFx(scene, tint);
    this.accent = owner === 'player' ? LIGHT.pale : LIGHT.cyan;
    if (owner === 'npc') {
      this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(LIGHT.cyan), 0.26));
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(LIGHT.sky), 0.92));
    }
  }

  /** Acceleration ratio, 0→1. Drives the crest rake and the length of the ground streak. */
  setSpeed(v: number): void { this.speed = Phaser.Math.Clamp(v, 0, 1); }

  /**
   * Mastery tell — Unstoppable, made visible: amber eyes, a wider corona and a gold rim on each
   * hand, a five-shard crest instead of three, and a bull-bar chevron thrown out ahead of the
   * face. Shape changes, not brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? LIGHT.amber : LIGHT.glow);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 15 : 11);
      halo.setFillStyle(this.tint(on ? LIGHT.amber : this.accent), on ? 0.3 : 0.26);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(LIGHT.gold), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed shards. */
  protected emitTrail(x: number, y: number): void {
    this.fx.shards(x, y, 1, { speed: 26, size: 9, life: 380, depth: 5, color: this.accent });
  }

  /** Both hands out on the wheel while something is carrying you. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'ride') return null;
    const shake = Math.sin(this.t * 24 + side) * 0.05 * this.speed;
    return {
      ang: this.facing + side * (0.62 - this.speed * 0.2) + shake,
      dist: 26 + this.speed * 8,
      scale: idle.scale * (1.05 + this.speed * 0.2),
    };
  }

  /** The headlight pool: a wedge of light thrown forward, stretching as speed builds. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(LIGHT.pale), a * 0.14 * k);
    g.fillEllipse(x, y + 6, 50 * k, 22 * k);
    // Beam cast along the heading — this is what makes the rig read as *aimed*.
    const reach = 34 + this.speed * 70;
    const spread = 0.42 - this.speed * 0.18;
    g.fillStyle(this.tint(this.accent), a * (0.1 + this.speed * 0.18));
    fillPts(g, [
      { x, y: y + 4 },
      { x: x + Math.cos(this.facing - spread) * reach, y: y + 4 + Math.sin(this.facing - spread) * reach * 0.55 },
      { x: x + Math.cos(this.facing) * reach * 1.2, y: y + 4 + Math.sin(this.facing) * reach * 0.66 },
      { x: x + Math.cos(this.facing + spread) * reach, y: y + 4 + Math.sin(this.facing + spread) * reach * 0.55 },
    ]);
  }

  /**
   * The crest: a fan of prism shards over the crown, raked back as speed builds so the character
   * visibly leans into a straight. Rooted at y - 20 so it never covers the face, and drawn over
   * the sprite so the bright edges read instead of only the dark tips clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 20;
    const count = this.mastered ? 5 : 3;
    const scale = (this.mastered ? 1.25 : 1) * this.intensity;
    // Rake: the whole crest lies down toward the back as the car winds up.
    const rake = this.speed * 0.7;
    const back = this.facing + Math.PI;

    // Straight up at rest, laid over toward the back the harder you are accelerating.
    const rakeAng = Phaser.Math.Angle.RotateTo(-Math.PI / 2, back, rake);
    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(0.5, (count - 1) / 2);
      const lean = side * 0.5 + Math.sin(this.t * 2.2 + i) * 0.05;
      const ang = rakeAng + lean;
      const len = (17 - Math.abs(side) * 3) * scale;
      const cx = x + Math.sin(lean) * 11 * scale + Math.cos(back) * rake * 8;
      const cy = rootY - Math.cos(lean) * 5 * scale;
      lightShardLayered(
        g, this.tint, cx + Math.cos(ang) * len * 0.5, cy + Math.sin(ang) * len * 0.5, ang,
        len, 3.4 * scale,
        i % 2 === 0 ? this.accent : LIGHT.gold, a * 0.95, 0.3, 1.1,
      );
    }

    // Mastery: a bull-bar chevron thrown out ahead of the face, plus an orbiting halo.
    if (this.mastered) {
      const fx = x + Math.cos(this.facing) * 20;
      const fy = y + Math.sin(this.facing) * 20 - 4;
      g.fillStyle(this.tint(LIGHT.gold), alpha * 0.9);
      lightShard(g, fx, fy, this.facing + Math.PI / 2, 26, 3.4, 0.5);
      g.fillStyle(this.tint(LIGHT.amber), alpha * 0.85);
      lightShard(g, fx + Math.cos(this.facing) * 5, fy + Math.sin(this.facing) * 5,
        this.facing + Math.PI / 2, 16, 2.6, 0.5);
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.8 + (i / 3) * TAU;
        g.fillStyle(this.tint(LIGHT.cream), alpha * 0.9);
        lightShard(g, x + Math.cos(p) * 25, y - 30 + Math.sin(p) * 7, p + Math.PI / 2, 11, 2.4, 0.4);
      }
    }
  }
}
