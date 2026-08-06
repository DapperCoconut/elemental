import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Fire renders: the living-flame avatar (ball arms + eyes
 * + body heat), the flame wreath aura, and the one-shot effects every fire ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * fire fire: the flame tongue, the palette, and the effects built out of them.
 *
 * Colours must come from the FIRE palette below — those exact values are the keys of every
 * fire skin's remap table, so anything drawn with an off-palette orange would stay orange on
 * a skinned character. Every call routes through the owner's `fireColor` mapper.
 */

/** `(base) => displayed` — SkinsKit.fireColor bound to one owner. */
export type FireColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const FIRE = {
  ember: 0x991100,
  deep: 0xcc1100,
  red: 0xff2200,
  core: 0xff4400,
  mid: 0xff5500,
  orange: 0xff6600,
  amber: 0xff8800,
  gold: 0xff9900,
  yellow: 0xffdd33,
  pale: 0xffff99,
  white: 0xffffff,
} as const;

/**
 * A tapered, slightly-curved flame tongue: wide at the root, pinched at the waist, drawn out
 * to a point that `curve` pushes sideways. This is the primitive every fire shape is built
 * from — jets, wreath licks, explosion lobes and the avatar's body heat all call it.
 */
export function flameTongue(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const tipX = cx + cos * len + px * curve;
  const tipY = cy + sin * len + py * curve;
  const midX = cx + cos * len * 0.5 + px * curve * 0.35;
  const midY = cy + sin * len * 0.5 + py * curve * 0.35;

  g.beginPath();
  g.moveTo(cx + px * halfW, cy + py * halfW);
  g.lineTo(midX + px * halfW * 0.82, midY + py * halfW * 0.82);
  g.lineTo(tipX, tipY);
  g.lineTo(midX - px * halfW * 0.82, midY - py * halfW * 0.82);
  g.lineTo(cx - px * halfW, cy - py * halfW);
  g.closePath();
  g.fillPath();

  // Rounded root and shoulder. Without these the polygon alone reads as a sharp spike, and a
  // ring of spikes looks like a starburst rather than a bloom of flame.
  g.fillCircle(cx, cy, halfW);
  g.fillCircle(midX, midY, halfW * 0.72);
  g.fillCircle(
    cx + cos * len * 0.78 + px * curve * 0.6,
    cy + sin * len * 0.78 + py * curve * 0.6,
    halfW * 0.34,
  );
}

/** Layered tongue: outer deep-red shell, orange body, pale-hot heart. */
export function flameTongueLayered(
  g: Phaser.GameObjects.Graphics,
  tint: FireColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, alpha: number,
): void {
  g.fillStyle(tint(FIRE.deep), alpha * 0.55);
  flameTongue(g, cx, cy, angle, len, halfW, curve);
  g.fillStyle(tint(FIRE.orange), alpha * 0.8);
  flameTongue(g, cx, cy, angle, len * 0.78, halfW * 0.68, curve * 0.8);
  g.fillStyle(tint(FIRE.yellow), alpha * 0.9);
  flameTongue(g, cx, cy, angle, len * 0.48, halfW * 0.4, curve * 0.5);
}

/**
 * The ground mark left by a live Pressure Bomb charge. Deliberately small and red — it says
 * "the blast lands here", not "this is how wide it will be", so it can be read at a glance
 * without hiding the fight underneath it.
 *
 * Redrawn every frame from `t` (0 the moment the charge is planted, 1 when it goes off): the
 * reticle closes in on the charge and the core strobes faster the nearer detonation gets.
 */
export function bombMarker(
  g: Phaser.GameObjects.Graphics,
  tint: FireColorFn,
  x: number, y: number,
  t: number,
  scale = 1,
): void {
  g.clear();
  // Quadratic on t, so the blink starts as a slow pulse and ends as a hard strobe.
  const blink = 0.5 + 0.5 * Math.sin(t * t * 46);
  const hot = tint(FIRE.red);
  const dark = tint(FIRE.deep);

  // Scorch under the charge — without it the reticle floats rather than sitting on the floor.
  g.fillStyle(dark, 0.14 + 0.08 * blink);
  g.fillEllipse(x, y, 30 * scale, 21 * scale);

  // Four arcs closing in: the fuse read as distance rather than as a number.
  const r = (17 - 8 * easeOut(t)) * scale;
  g.lineStyle(2 * scale, hot, 0.4 + 0.45 * blink);
  for (let i = 0; i < 4; i++) {
    const a0 = i * (Math.PI / 2) + 0.3;
    g.beginPath();
    g.arc(x, y, r, a0, a0 + Math.PI / 2 - 0.6);
    g.strokePath();
  }
  // Corner ticks pointing inward at the charge.
  g.lineStyle(1.5 * scale, hot, 0.25 + 0.4 * blink);
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2) + Math.PI / 4;
    const cos = Math.cos(a), sin = Math.sin(a);
    g.beginPath();
    g.moveTo(x + cos * (r + 3 * scale), y + sin * (r + 3 * scale));
    g.lineTo(x + cos * (r + 8 * scale), y + sin * (r + 8 * scale));
    g.strokePath();
  }

  // The charge itself: a dark shell with a core winding up inside it.
  g.fillStyle(dark, 0.85);
  g.fillCircle(x, y, 5.2 * scale);
  g.fillStyle(hot, 0.5 + 0.5 * blink);
  g.fillCircle(x, y, (2.4 + 1.6 * t) * scale * (0.75 + 0.25 * blink));
  g.fillStyle(tint(FIRE.white), 0.55 * blink * t);
  g.fillCircle(x, y, 1.7 * scale);
}

export interface ExplosionOpts {
  /** Ember shards flung outward. Defaults to radius/7. */
  shards?: number;
  /** Rising smoke puffs. Defaults to radius/26. */
  smoke?: number;
  /** Leave a fading burn mark on the ground. Default true. */
  scorch?: boolean;
  /** Render depth of the fireball. Default 6. */
  depth?: number;
  /** Total life of the fireball in ms. Defaults to scale with radius. */
  duration?: number;
}

// ── FireFx ────────────────────────────────────────────────────────────────

/**
 * One-shot fire effects. Cheap to construct — build one per owner (or per cast, as the
 * ability files do) and hand it the owner's colour mapper.
 */
export class FireFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: FireColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding shockwave that thins as it grows. Stroked as a jittered polygon rather than a
   * true circle — a perfect ring reads as a UI element, a ragged one reads as a blast front.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 5, depth = 6): void {
    const c = this.tint(color);
    // Segment count tracks the radius: a fixed count turns big blasts into visible polygons.
    const segs = Phaser.Math.Clamp(Math.round(toR / 3.5), 36, 110);
    const jitter = Array.from({ length: segs }, () => 0.94 + Math.random() * 0.12);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t)), c, 0.9 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        // Jitter relaxes as the front expands, so the wave smooths out as it dies.
        const rr = r * (1 + (jitter[i % segs] - 1) * (1 - t * 0.6));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
  }

  /** Blown-out white core — the first two frames of any real explosion. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, FIRE.white, FIRE.pale, depth);
  }

  /**
   * A lingering ground burn. Deliberately faint and blotchy — a solid disc reads as a bug,
   * while a ragged char with a few cooling embers reads as damage left behind.
   */
  scorch(x: number, y: number, radius: number, depth = 1): void {
    const blots = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.55;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75,
        r: radius * (0.3 + Math.random() * 0.45),
      };
    });
    this.anim(depth, 2200, (g, t) => {
      const a = (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
      // Cooling glow burns off first, leaving only the char behind.
      const glow = Math.max(0, 1 - t * 3.5);
      for (const b of blots) {
        g.fillStyle(this.tint(FIRE.ember), 0.14 * a);
        g.fillEllipse(b.x, b.y, b.r * 2, b.r * 1.6);
        if (glow > 0) {
          g.fillStyle(this.tint(FIRE.deep), 0.2 * glow);
          g.fillEllipse(b.x, b.y, b.r * 0.9, b.r * 0.7);
        }
      }
    });
  }

  /**
   * Flung embers: bright specks that arc outward, slow down, drift up as they cool and
   * shrink to nothing. The workhorse behind every "that felt like it hit" moment.
   */
  embers(
    x: number, y: number, count: number,
    opts: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; rise?: number } = {},
  ): void {
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 520;
    const rise = opts.rise ?? 34;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      const v = speed * (0.45 + Math.random() * 0.9);
      return {
        cos: Math.cos(a), sin: Math.sin(a), v,
        r: size * (0.5 + Math.random() * 0.9),
        hot: Math.random() < 0.45,
        delay: Math.random() * 0.18,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const travel = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * travel;
        const ey = y + p.sin * travel - rise * easeIn(lt);
        const fade = 1 - lt;
        g.fillStyle(this.tint(p.hot ? FIRE.yellow : FIRE.orange), 0.9 * fade);
        g.fillCircle(ex, ey, p.r * fade);
        g.fillStyle(this.tint(FIRE.white), 0.5 * fade * fade);
        g.fillCircle(ex, ey, p.r * fade * 0.45);
      }
    });
  }

  /** Greasy smoke puffs that swell and drift upward — the tail end of a big blast. */
  smoke(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.25 + Math.random() * 0.3),
      drift: (Math.random() - 0.5) * 30,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1100, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(FIRE.ember), 0.3 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 46 * lt, p.r * (0.6 + lt * 1.1));
      }
    });
  }

  /**
   * Boiling fireball made of overlapping lobes that swell, roll and collapse — the visual
   * centre of every fire detonation. Reads as volume rather than a flat expanding disc.
   */
  fireball(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const lobes = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.5,
      off: 0.25 + Math.random() * 0.4,
      r: 0.4 + Math.random() * 0.28,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.35 + easeOut(Math.min(1, t * 1.5)) * 0.75;
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const wob = t * 9;

      const shell = [
        { c: FIRE.deep, s: 1.05, a: 0.55 },
        { c: FIRE.core, s: 0.86, a: 0.8 },
        { c: FIRE.amber, s: 0.62, a: 0.85 },
        { c: FIRE.yellow, s: 0.36, a: 0.9 },
      ];
      for (const layer of shell) {
        g.fillStyle(this.tint(layer.c), layer.a * fade);
        g.fillCircle(x, y, radius * grow * layer.s);
        for (const l of lobes) {
          const lr = radius * grow * layer.s * l.r * (0.85 + Math.sin(wob + l.phase) * 0.15);
          const ld = radius * grow * layer.s * l.off;
          g.fillCircle(x + Math.cos(l.ang) * ld, y + Math.sin(l.ang) * ld, lr);
        }
      }
      // Hot heart, first half only.
      if (t < 0.5) {
        g.fillStyle(this.tint(FIRE.white), (1 - t / 0.5) * 0.85);
        g.fillCircle(x, y, radius * grow * 0.22);
      }
    });
  }

  /** Flash + fireball + stacked shockwaves + shrapnel + smoke + scorch. The whole package. */
  explosion(x: number, y: number, radius: number, opts: ExplosionOpts = {}): void {
    const shards = opts.shards ?? Math.round(radius / 7);
    const smokeCount = opts.smoke ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(320 + radius * 1.5);
    const depth = opts.depth ?? 6;

    if (opts.scorch !== false) this.scorch(x, y, radius * 0.6);
    this.fireball(x, y, radius * 0.78, dur, depth);
    this.flash(x, y, radius * 0.4, depth + 1);
    this.ring(x, y, radius * 0.2, radius * 1.12, FIRE.pale, Math.round(dur * 0.75), 6, depth);
    this.scene.time.delayedCall(70, () => this.ring(x, y, radius * 0.15, radius * 1.35, FIRE.amber, dur, 4, depth));
    this.scene.time.delayedCall(150, () => this.ring(x, y, radius * 0.1, radius * 1.5, FIRE.deep, dur, 3, depth));
    this.embers(x, y, shards, { speed: radius * 2.4, size: 3.2 + radius / 45, life: Math.round(dur * 1.4), rise: radius * 0.4, depth });
    if (smokeCount > 0) this.smoke(x, y, smokeCount, radius * 0.85, depth - 2);
  }

  /**
   * Flamethrower breath: three nested tongues of unequal length that flap and re-roll every
   * tick, so the held stream churns instead of strobing one fixed triangle.
   */
  flameJet(x: number, y: number, angle: number, length: number, depth = 4): void {
    const licks = Array.from({ length: 5 }, (_, i) => ({
      off: (i - 2) * 0.13,
      len: length * (0.62 + Math.random() * 0.45),
      w: 12 + Math.random() * 9,
      curve: (Math.random() - 0.5) * 26,
    }));
    this.anim(depth, 190, (g, t) => {
      const grow = 0.55 + easeOut(t) * 0.55;
      const fade = 1 - easeIn(t);
      for (const l of licks) {
        flameTongueLayered(
          g, this.tint,
          x + Math.cos(angle + l.off) * 16, y + Math.sin(angle + l.off) * 16,
          angle + l.off, l.len * grow, l.w, l.curve * t, 0.7 * fade,
        );
      }
      // Muzzle bloom where the stream leaves the caster.
      g.fillStyle(this.tint(FIRE.pale), 0.55 * fade);
      g.fillCircle(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 11 * grow);
    });
    if (Math.random() < 0.5) {
      this.embers(x + Math.cos(angle) * length * 0.7, y + Math.sin(angle) * length * 0.7, 2,
        { angle, spread: 0.5, speed: 90, size: 2.4, life: 380, depth });
    }
  }

  /** Recoil puff at the barrel — sells that a projectile was actually thrown. */
  muzzleFlash(x: number, y: number, angle: number, scale = 1, depth = 6): void {
    this.anim(depth, 130, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(FIRE.pale), 0.8 * fade);
      flameTongue(g, x, y, angle, 26 * scale * (0.6 + t * 0.9), 9 * scale * fade);
      g.fillStyle(this.tint(FIRE.white), 0.85 * fade);
      g.fillCircle(x, y, 6 * scale * (1 - t * 0.4));
    });
    this.embers(x, y, 3, { angle, spread: 0.7, speed: 110, size: 2.2, life: 300, depth });
  }

  /** Comet streak left behind a dash: a tapered tail of flame plus scattered sparks. */
  dashTrail(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const puffs = Math.max(3, Math.round(dist / 26));
    this.anim(depth, 380, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < puffs; i++) {
        const f = i / (puffs - 1 || 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        // Tail is fattest at the start of the dash and burns off from the back forward.
        const local = Math.max(0, fade - f * 0.35);
        const r = (5 + (1 - f) * 12) * local;
        if (r <= 0) continue;
        g.fillStyle(this.tint(FIRE.deep), 0.5 * local);
        g.fillCircle(px, py, r * 1.35);
        g.fillStyle(this.tint(FIRE.orange), 0.7 * local);
        g.fillCircle(px, py, r);
        g.fillStyle(this.tint(FIRE.yellow), 0.8 * local);
        g.fillCircle(px, py, r * 0.5);
      }
    });
    this.embers(x1, y1, 8, { angle: angle + Math.PI, spread: 0.9, speed: 150, size: 3, life: 480, depth });
  }

  /**
   * Ground-hugging flame burst: a ring of tongues thrown outward from a point. Used where
   * something erupts rather than detonates (dash launch, wreath ignition).
   */
  bloom(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const seeds = Array.from({ length: petals }, (_, i) => ({
      // Uneven lengths, staggered roots and per-petal delays: petals fired from one point at
      // one length read as a starburst, so every one of these is deliberately out of step.
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.9,
      root: radius * (0.1 + Math.random() * 0.3),
      len: radius * (0.35 + Math.random() * 0.75),
      w: radius * (0.2 + Math.random() * 0.16),
      curve: (Math.random() - 0.5) * radius * 0.6,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 460, (g, t) => {
      // Molten pool at the base so the petals grow out of something.
      const pool = 1 - easeIn(t);
      g.fillStyle(this.tint(FIRE.core), 0.45 * pool);
      g.fillCircle(x, y, radius * 0.45 * easeOut(t));
      g.fillStyle(this.tint(FIRE.amber), 0.5 * pool);
      g.fillCircle(x, y, radius * 0.3 * easeOut(t));
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        const rx = x + Math.cos(s.ang) * s.root * grow;
        const ry = y + Math.sin(s.ang) * s.root * grow;
        flameTongueLayered(g, this.tint, rx, ry, s.ang, s.len * grow, s.w * (1 - lt * 0.45), s.curve * lt, 0.75 * fade);
      }
    });
    this.ring(x, y, radius * 0.15, radius, FIRE.amber, 400, 4, depth);
  }

  /**
   * Inward-spiralling gather: streaks of fire drawn from the rim toward a point while a core
   * swells. `follow` lets it track a moving caster during a channel.
   */
  channelCharge(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streaks = Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * TAU,
      spin: 1.6 + Math.random() * 1.4,
      phase: Math.random(),
      len: 0.3 + Math.random() * 0.3,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 34) * 0.15;

      // Streaks fall in from the rim, looping faster as the charge builds.
      for (const s of streaks) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.lineStyle(2.5 * (1 - lt), this.tint(FIRE.gold), 0.75 * (1 - lt * 0.6));
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.lineTo(cx + Math.cos(a - s.len) * r * 0.72, cy + Math.sin(a - s.len) * r * 0.72);
        g.strokePath();
      }

      // Swelling core.
      const cr = radius * (0.08 + easeIn(t) * 0.34) * pulse;
      g.fillStyle(this.tint(FIRE.deep), 0.5);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(FIRE.core), 0.75);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(FIRE.yellow), 0.9);
      g.fillCircle(cx, cy, cr * 0.55);
      g.fillStyle(this.tint(FIRE.white), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.25);

      // Containment ring closing in.
      g.lineStyle(3, this.tint(FIRE.amber), 0.5 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /**
   * Column of fire punching upward — the vertical half of a very big blast. Kept to a few
   * broad tongues: thin ones just read as scratches over the fireball beneath.
   */
  firePillar(x: number, y: number, radius: number, height: number, depth = 7): void {
    const licks = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.42,
      h: height * (0.7 + Math.random() * 0.4),
      w: radius * (0.44 + Math.random() * 0.22),
      sway: (Math.random() - 0.5) * radius * 0.4,
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 760, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Hot throat at the base, so the column looks anchored in the blast.
      g.fillStyle(this.tint(FIRE.pale), 0.55 * fade);
      g.fillEllipse(x, y, radius * 1.5, radius * 0.7);
      for (const l of licks) {
        const rise = easeOut(Math.max(0, (t - l.delay) / (1 - l.delay)));
        flameTongueLayered(
          g, this.tint,
          x + l.ox, y + radius * 0.2,
          -Math.PI / 2, l.h * rise, l.w * (1 - t * 0.35),
          l.sway * rise + Math.sin(t * 8 + l.phase) * 8, 0.8 * fade,
        );
      }
    });
    this.embers(x, y - height * 0.4, 8, { speed: radius * 1.2, spread: 0.9, angle: -Math.PI / 2, size: 4, life: 800, rise: height * 0.35, depth });
  }
}

// ── FireWreath ────────────────────────────────────────────────────────────

/**
 * Persistent ring of licking flame around a fighter (Flame Body / Burning Body / molten).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class FireWreath {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private emberAccum = 0;
  private licks: { ang: number; len: number; w: number; speed: number; phase: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: FireColorFn,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 11,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.licks = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.7 + Math.random() * 0.6,
      w: 0.16 + Math.random() * 0.1,
      speed: 3 + Math.random() * 4,
      phase: Math.random() * TAU,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const spin = this.t * 0.55;
    const glow = 0.22 * this.intensity * alpha;
    g.fillStyle(this.tint(FIRE.core), glow);
    g.fillCircle(x, y, this.radius * (0.92 + Math.sin(this.t * 5) * 0.05));

    for (const l of this.licks) {
      const wob = Math.sin(this.t * l.speed + l.phase);
      const len = this.radius * l.len * (0.8 + wob * 0.28) * this.intensity;
      const ang = l.ang + spin + wob * 0.12;
      flameTongueLayered(
        g, this.tint,
        x + Math.cos(ang) * this.radius * 0.55, y + Math.sin(ang) * this.radius * 0.55,
        ang, len, this.radius * l.w, wob * this.radius * 0.28,
        0.62 * alpha,
      );
    }

    // Occasional ember lifting off the wreath.
    this.emberAccum += delta;
    const interval = 260 / Math.max(0.4, this.intensity);
    if (this.emberAccum >= interval) {
      this.emberAccum = 0;
      new FireFx(this.scene, this.tint).embers(
        x + (Math.random() - 0.5) * this.radius * 1.3,
        y + (Math.random() - 0.5) * this.radius * 0.8,
        1, { speed: 22, size: 2.6, life: 700, rise: 44, depth: 4 },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── FireAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one glowing ball hand, outermost first. */
const FIRE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: FIRE.core, alpha: 0.28 },
    { r: 6.4, color: FIRE.amber, alpha: 0.9 },
    { r: 3.6, color: FIRE.yellow, alpha: 1 },
    { r: 1.5, color: FIRE.white, alpha: 0.9, ox: -1, oy: -1 },
  ],
  eyeWhite: FIRE.pale,
  eyePupil: 0x1a0600,
  squash: { div: 14, x: 0.5, y: 0.28 },
};

/**
 * The fire character rig: two little glowing ball arms plus a pair of eyes and a halo of
 * body heat, all layered over the fighter sprite. The arms, eyes and gestures come from
 * BaseAvatar; what fire adds is the heat haze beneath and the plume off the crown.
 */
export class FireAvatar extends BaseAvatar {
  private fx: FireFx;

  constructor(scene: Phaser.Scene, tint: FireColorFn, depth = 6) {
    super(scene, tint, depth, FIRE_AVATAR);
    this.fx = new FireFx(scene, tint);
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself so a mastered fire
   * user is identifiable at a glance, before they cast anything: white-hot eyes, a wider
   * corona on each hand, a taller plume, and a crown of embers orbiting the head.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? FIRE.white : FIRE.pale);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 12.5 : 9);
      glow.setFillStyle(this.tint(on ? FIRE.amber : FIRE.core), on ? 0.35 : 0.28);
    });
  }

  /** Fast-moving arms shed sparks. */
  protected emitTrail(x: number, y: number): void {
    this.fx.embers(x, y, 1, { speed: 18, size: 2.2, life: 420, rise: 26, depth: 5 });
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(FIRE.gold), a * 0.3 * this.intensity);
    g.fillCircle(x, y, 27 * this.intensity);
  }

  /**
   * Flames rising off the crown, plus the mastery ember crown. Rooted at `y - 18` so the
   * tongues never cover the face, and drawn over the sprite so their bright middles show
   * instead of just the dark tips poking out past the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const mastery = this.mastered ? 1.3 : 1;
    for (let i = 0; i < 5; i++) {
      const p = this.t * 3.4 + i * 1.7;
      const ang = -Math.PI / 2 + (i - 2) * 0.46 + Math.sin(p) * 0.2;
      const len = (26 + Math.sin(p * 1.3) * 9) * this.intensity * mastery;
      flameTongueLayered(g, this.tint, x, y - 18, ang, len, 8.5 * mastery, Math.sin(p) * 6, a);
    }

    // Mastery crown: three embers circling the head on a shallow ellipse.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.5 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 21;
        const cy = y - 27 + Math.sin(p) * 6;
        g.fillStyle(this.tint(FIRE.gold), alpha * 0.5);
        g.fillCircle(cx, cy, 5);
        g.fillStyle(this.tint(FIRE.yellow), alpha * 0.95);
        g.fillCircle(cx, cy, 3);
        g.fillStyle(this.tint(FIRE.white), alpha * 0.9);
        g.fillCircle(cx, cy, 1.4);
      }
    }
  }
}
