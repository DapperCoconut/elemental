import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Oil renders: the crude-and-machinery avatar (ball arms +
 * lamp eyes + a wellhead spout that becomes a locomotive's twin stacks once mastered), the
 * clinging Oily coating, the Drone Array lattice, and the one-shot effects and machine parts
 * every oil ability is built out of.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * oil oil: the viscous glob, the iridescent film, and the industrial hardware.
 *
 * Colours must come from the OIL palette below. Oil has no skin yet, but every
 * call still routes through the owner's `oilColor` mapper, so the day one lands it is a table
 * edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.oilColor bound to one owner. */
export type OilColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const OIL = {
  tar: 0x07050a,
  crude: 0x140d08,
  sludge: 0x2b1c0c,
  brown: 0x5a3a12,
  rust: 0x8a4f14,
  amber: 0xc47a2a,
  gold: 0xffaa00,
  flame: 0xff6600,
  ember: 0xff2200,
  violet: 0x7a4fd0,
  teal: 0x2fd6c0,
  steel: 0x555f6b,
  chrome: 0xb8c4d0,
  white: 0xffffff,
} as const;

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A viscous glob of crude: a long thin filament at the root that necks in and then swells into
 * a heavy rounded head at the leading edge, bent sideways by `curve`. This is the primitive
 * every oil shape is built from — spatter, gushes, puddle rims, the coating's drips and the
 * avatar's wellhead all call it.
 *
 * It is neither a flame tongue nor a water ribbon. Fire is fat at the root and points away;
 * water beads at the head with a short tail. Oil is heavier than water and far more viscous,
 * so the tail is long and wire-thin and the head necks in sharply behind it — the pinch you
 * get watching syrup fall off a spoon.
 */
export function oilGlob(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number) => ({
    x: cx + cos * len * f + px * curve * f * f,
    y: cy + sin * len * f + py * curve * f * f,
  });

  const neck = at(0.52), shoulder = at(0.74), tip = at(1);
  const head = at(0.86);
  const wRoot = halfW * 0.14, wNeck = halfW * 0.26, wSh = halfW * 0.92;

  g.beginPath();
  g.moveTo(cx + px * wRoot, cy + py * wRoot);
  g.lineTo(neck.x + px * wNeck, neck.y + py * wNeck);
  g.lineTo(shoulder.x + px * wSh, shoulder.y + py * wSh);
  g.lineTo(tip.x, tip.y);
  g.lineTo(shoulder.x - px * wSh, shoulder.y - py * wSh);
  g.lineTo(neck.x - px * wNeck, neck.y - py * wNeck);
  g.lineTo(cx - px * wRoot, cy - py * wRoot);
  g.closePath();
  g.fillPath();

  // Rounded head, shoulder, neck and root. Without them the bare polygon reads as a dart;
  // crude only reads as a liquid once surface tension has balled the leading edge up.
  g.fillCircle(head.x, head.y, halfW);
  g.fillCircle(shoulder.x, shoulder.y, halfW * 0.86);
  g.fillCircle(neck.x, neck.y, halfW * 0.26);
  g.fillCircle(cx, cy, wRoot);
}

/**
 * Layered glob: opaque tar shell, crude body, and the iridescent film riding the head.
 *
 * The film is the whole point. Crude oil painted flat black is indistinguishable from shadow;
 * what makes a slick read as oil is the thin rainbow interference sheen sitting on its surface,
 * so every layered glob gets a violet-into-teal crescent offset to one flank of the head.
 */
export function oilGlobLayered(
  g: Phaser.GameObjects.Graphics,
  tint: OilColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, alpha: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;

  g.fillStyle(tint(OIL.tar), alpha * 0.92);
  oilGlob(g, cx, cy, angle, len, halfW, curve);
  g.fillStyle(tint(OIL.crude), alpha * 0.95);
  oilGlob(g, cx, cy, angle, len * 0.94, halfW * 0.8, curve * 0.9);

  const f = 0.86;
  const hx = cx + cos * len * f + px * curve * f * f;
  const hy = cy + sin * len * f + py * curve * f * f;
  g.fillStyle(tint(OIL.violet), alpha * 0.5);
  g.fillCircle(hx - px * halfW * 0.32, hy - py * halfW * 0.32, halfW * 0.46);
  g.fillStyle(tint(OIL.teal), alpha * 0.55);
  g.fillCircle(
    hx - px * halfW * 0.44 - cos * halfW * 0.16,
    hy - py * halfW * 0.44 - sin * halfW * 0.16,
    halfW * 0.24,
  );
  g.fillStyle(tint(OIL.chrome), alpha * 0.5);
  g.fillCircle(
    hx - px * halfW * 0.5 + cos * halfW * 0.2,
    hy - py * halfW * 0.5 + sin * halfW * 0.2,
    halfW * 0.13,
  );
}

/** A tapered lick — the secondary shape burning crude needs, and only burning crude. */
function lick(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number, curve: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const midX = cx + cos * len * 0.5 + px * curve * 0.35;
  const midY = cy + sin * len * 0.5 + py * curve * 0.35;
  g.beginPath();
  g.moveTo(cx + px * halfW, cy + py * halfW);
  g.lineTo(midX + px * halfW * 0.8, midY + py * halfW * 0.8);
  g.lineTo(cx + cos * len + px * curve, cy + sin * len + py * curve);
  g.lineTo(midX - px * halfW * 0.8, midY - py * halfW * 0.8);
  g.lineTo(cx - px * halfW, cy - py * halfW);
  g.closePath();
  g.fillPath();
  g.fillCircle(cx, cy, halfW);
  g.fillCircle(midX, midY, halfW * 0.7);
}

/**
 * Burning crude: a sooty red base under an orange body under a gold heart. Oil fire is dirtier
 * than fire's own flame — the outer shell is deliberately dark so ignited puddles still read
 * as oil that has caught rather than as somebody else's fireball.
 */
export function oilFlame(
  g: Phaser.GameObjects.Graphics,
  tint: OilColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, alpha: number,
): void {
  g.fillStyle(tint(OIL.sludge), alpha * 0.6);
  lick(g, cx, cy, angle, len * 1.05, halfW * 1.1, curve);
  g.fillStyle(tint(OIL.ember), alpha * 0.6);
  lick(g, cx, cy, angle, len, halfW, curve);
  g.fillStyle(tint(OIL.flame), alpha * 0.85);
  lick(g, cx, cy, angle, len * 0.72, halfW * 0.64, curve * 0.8);
  g.fillStyle(tint(OIL.gold), alpha * 0.9);
  lick(g, cx, cy, angle, len * 0.4, halfW * 0.34, curve * 0.5);
}

export interface OilExplosionOpts {
  /** Crude spatter flung outward. Defaults to radius/7. */
  spatter?: number;
  /** Rising smoke columns. Defaults to radius/22. */
  smoke?: number;
  /** Leave a fading slick on the ground. Default true. */
  slick?: boolean;
  /** Render depth of the fireball. Default 6. */
  depth?: number;
  /** Total life of the fireball in ms. Defaults to scale with radius. */
  duration?: number;
  /** Steel shrapnel (barrel staves, drone chassis) thrown out on top of the crude. */
  debris?: number;
}

export interface SpatterOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels of gravity sag over the glob's life. Crude falls harder than water. */
  fall?: number;
  /** Draw the globs alight instead of as cold crude. */
  burning?: boolean;
}

// ── OilFx ─────────────────────────────────────────────────────────────────

/**
 * One-shot oil effects, plus the static painters for every piece of hardware the element puts
 * on the field. Cheap to construct — build one per owner and hand it that owner's mapper.
 */
export class OilFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: OilColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding shockwave that thins as it grows. Stroked as a jittered polygon rather than a
   * true circle — a perfect ring reads as a UI element, a ragged one as a blast front.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 5, depth = 6): void {
    const c = this.tint(color);
    // Segment count tracks the radius: a fixed count turns big blasts into visible polygons.
    const segs = Phaser.Math.Clamp(Math.round(toR / 3.5), 36, 110);
    const jitter = Array.from({ length: segs }, () => 0.93 + Math.random() * 0.14);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t)), c, 0.9 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * (1 + (jitter[i % segs] - 1) * (1 - t * 0.6));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
  }

  /** Blown-out ignition core — the first two frames of any real oil detonation. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, OIL.white, OIL.gold, depth);
  }

  /**
   * A lingering slick left on the ground: ragged black blotches with a rainbow film drifting
   * across them. Deliberately blotchy — a solid disc reads as a bug, a ragged stain with a
   * sheen still crawling over it reads as spilled crude.
   */
  slick(x: number, y: number, radius: number, depth = 1): void {
    const blots = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.55;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75,
        r: radius * (0.3 + Math.random() * 0.45),
      };
    });
    this.anim(depth, 2600, (g, t) => {
      const a = (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
      for (const b of blots) {
        g.fillStyle(this.tint(OIL.tar), 0.34 * a);
        g.fillEllipse(b.x, b.y, b.r * 2, b.r * 1.6);
        g.fillStyle(this.tint(OIL.crude), 0.22 * a);
        g.fillEllipse(b.x, b.y, b.r * 1.3, b.r * 1);
      }
      // Interference film crawling over the stain — the tell that it is oil, not a burn mark.
      for (let i = 0; i < 3; i++) {
        const p = t * 2.2 + i * 2.1;
        const d = radius * (0.15 + 0.4 * ((i + 1) / 4));
        const gx = x + Math.cos(p) * d, gy = y + Math.sin(p) * d * 0.7;
        g.fillStyle(this.tint(i % 2 ? OIL.violet : OIL.teal), 0.2 * a);
        g.fillEllipse(gx, gy, radius * 0.42, radius * 0.14);
      }
    });
  }

  /**
   * Flung crude. Each glob is drawn spanning where it *was* to where it *is*, so a fast throw
   * reads as streaks and a dying one settles into heavy round beads. Gravity sags the arc
   * harder than water's — crude is heavier and it lands rather than misting.
   */
  spatter(x: number, y: number, count: number, opts: SpatterOpts = {}): void {
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 540;
    const fall = opts.fall ?? 60;
    const depth = opts.depth ?? 6;
    const burning = opts.burning ?? false;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      const v = speed * (0.45 + Math.random() * 0.9);
      return {
        cos: Math.cos(a), sin: Math.sin(a), v,
        r: size * (0.5 + Math.random() * 0.9),
        lit: burning && Math.random() < 0.7,
        delay: Math.random() * 0.18,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const prev = Math.max(0, lt - 0.1);
        const secs = life / 1000;
        const ex = x + p.cos * p.v * easeOut(lt) * secs;
        const ey = y + p.sin * p.v * easeOut(lt) * secs + fall * lt * lt;
        const bx = x + p.cos * p.v * easeOut(prev) * secs;
        const by = y + p.sin * p.v * easeOut(prev) * secs + fall * prev * prev;
        const stretch = Math.hypot(ex - bx, ey - by);
        const fade = 1 - lt * lt;
        const ang = stretch > 0.4 ? Math.atan2(ey - by, ex - bx) : baseAngle;
        if (p.lit) {
          oilFlame(g, this.tint, bx, by, ang, stretch + p.r * 2, p.r * fade, 0, 0.85 * fade);
        } else {
          oilGlobLayered(g, this.tint, bx, by, ang, stretch + p.r * 1.8, p.r * fade, 0, 0.95 * fade);
        }
      }
    });
  }

  /**
   * Thick greasy smoke. Fatter, slower and darker than fire's — burning crude makes a column
   * of soot, and that column is half of what tells you an oil blast from any other blast.
   */
  smoke(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.3 + Math.random() * 0.35),
      drift: (Math.random() - 0.5) * 26,
      lobes: Array.from({ length: 3 }, () => ({
        a: Math.random() * TAU, d: 0.3 + Math.random() * 0.4, s: 0.4 + Math.random() * 0.3,
      })),
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1500, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const cx = x + p.ox + p.drift * lt;
        const cy = y + p.oy - 58 * lt;
        const rr = p.r * (0.6 + lt * 1.4);
        // Built out of overlapping lobes rather than one disc, so the column boils.
        g.fillStyle(this.tint(OIL.tar), 0.4 * (1 - lt));
        g.fillCircle(cx, cy, rr);
        for (const l of p.lobes) {
          g.fillCircle(cx + Math.cos(l.a) * rr * l.d, cy + Math.sin(l.a) * rr * l.d, rr * l.s);
        }
        g.fillStyle(this.tint(OIL.sludge), 0.18 * (1 - lt));
        g.fillCircle(cx, cy - rr * 0.2, rr * 0.6);
      }
    });
  }

  /**
   * Hard white machine sparks: short bright streaks flung off metal, fading in a few frames.
   * Half of Oil's kit is machinery, and nothing sells "that was a mechanism" like sparks.
   */
  sparks(
    x: number, y: number, count: number,
    opts: { speed?: number; spread?: number; angle?: number; life?: number; depth?: number; fall?: number } = {},
  ): void {
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const life = opts.life ?? 340;
    const fall = opts.fall ?? 70;
    const depth = opts.depth ?? 7;
    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random()),
        w: 1 + Math.random() * 1.4,
        hot: Math.random() < 0.5,
        delay: Math.random() * 0.2,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const prev = Math.max(0, lt - 0.16);
        const secs = life / 1000;
        const ex = x + p.cos * p.v * easeOut(lt) * secs, ey = y + p.sin * p.v * easeOut(lt) * secs + fall * lt * lt;
        const bx = x + p.cos * p.v * easeOut(prev) * secs, by = y + p.sin * p.v * easeOut(prev) * secs + fall * prev * prev;
        const fade = 1 - lt;
        g.lineStyle(p.w * fade, this.tint(p.hot ? OIL.white : OIL.gold), 0.95 * fade);
        g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.strokePath();
      }
    });
  }

  /**
   * The boiling body of an oil detonation: a black crude fireball with an orange heart burning
   * through it. Layered outside-in so the soot shell reads first and the fire shows through the
   * gaps, which is what a real fuel explosion looks like and what a plain fireball does not.
   */
  crudeBurst(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const lobes = Array.from({ length: 10 }, (_, i) => ({
      ang: (i / 10) * TAU + Math.random() * 0.5,
      off: 0.25 + Math.random() * 0.42,
      r: 0.4 + Math.random() * 0.3,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.35 + easeOut(Math.min(1, t * 1.5)) * 0.8;
      const fade = t < 0.32 ? 1 : 1 - (t - 0.32) / 0.68;
      const wob = t * 9;

      const shell = [
        { c: OIL.ember, s: 1.06, a: 0.5 },
        { c: OIL.flame, s: 0.9, a: 0.72 },
        { c: OIL.gold, s: 0.6, a: 0.8 },
        { c: OIL.white, s: 0.26, a: 0.75 },
      ];
      for (const layer of shell) {
        g.fillStyle(this.tint(layer.c), layer.a * fade);
        g.fillCircle(x, y, radius * grow * layer.s);
        for (const l of lobes) {
          const lr = radius * grow * layer.s * l.r * (0.85 + Math.sin(wob + l.phase) * 0.16);
          const ld = radius * grow * layer.s * l.off;
          g.fillCircle(x + Math.cos(l.ang) * ld, y + Math.sin(l.ang) * ld, lr);
        }
      }
      // Soot cloaking the fireball from the outside in, so the blast dirties as it dies.
      const soot = easeIn(Math.min(1, t * 1.4));
      for (const l of lobes) {
        const lr = radius * grow * l.r * (0.9 + Math.sin(wob * 0.7 + l.phase) * 0.2);
        const ld = radius * grow * (l.off + 0.28) * (0.8 + soot * 0.5);
        g.fillStyle(this.tint(OIL.tar), 0.62 * soot * fade);
        g.fillCircle(x + Math.cos(l.ang) * ld, y + Math.sin(l.ang) * ld, lr);
      }
    });
  }

  /** Ignition flash + crude fireball + stacked shockwaves + spatter + shrapnel + smoke + slick. */
  explosion(x: number, y: number, radius: number, opts: OilExplosionOpts = {}): void {
    const globs = opts.spatter ?? Math.round(radius / 7);
    const smokeCount = opts.smoke ?? Math.round(radius / 22);
    const dur = opts.duration ?? Math.round(340 + radius * 1.6);
    const depth = opts.depth ?? 6;

    if (opts.slick !== false) this.slick(x, y, radius * 0.62);
    this.crudeBurst(x, y, radius * 0.78, dur, depth);
    this.flash(x, y, radius * 0.42, depth + 1);
    this.ring(x, y, radius * 0.2, radius * 1.12, OIL.gold, Math.round(dur * 0.7), 6, depth);
    this.scene.time.delayedCall(70, () => this.ring(x, y, radius * 0.15, radius * 1.35, OIL.flame, dur, 4, depth));
    this.scene.time.delayedCall(160, () => this.ring(x, y, radius * 0.1, radius * 1.55, OIL.sludge, dur, 3, depth));
    this.spatter(x, y, globs, {
      speed: radius * 2.3, size: 3.2 + radius / 45,
      life: Math.round(dur * 1.4), fall: radius * 1.1, burning: true, depth,
    });
    this.sparks(x, y, Math.max(4, Math.round(radius / 8)), { speed: radius * 2.6, life: 380, depth: depth + 1 });
    if (opts.debris) this.shrapnel(x, y, opts.debris, radius, depth);
    if (smokeCount > 0) this.smoke(x, y, smokeCount, radius * 0.9, depth - 2);
  }

  /** Torn steel thrown out of a blast: tumbling plates, not particles. */
  shrapnel(x: number, y: number, count: number, radius: number, depth = 6): void {
    const bits = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: radius * (1.4 + Math.random() * 1.6),
        w: 3 + Math.random() * 4, h: 1.6 + Math.random() * 2.2,
        spin: (Math.random() - 0.5) * 22,
        rot: Math.random() * TAU,
      };
    });
    this.anim(depth, 620, (g, t) => {
      for (const b of bits) {
        const d = b.v * easeOut(t) * 0.62;
        const bx = x + b.cos * d, by = y + b.sin * d + radius * 1.1 * t * t;
        const rot = b.rot + b.spin * t;
        const fade = 1 - easeIn(t);
        const cs = Math.cos(rot), sn = Math.sin(rot);
        g.fillStyle(this.tint(OIL.steel), 0.9 * fade);
        g.beginPath();
        g.moveTo(bx + cs * b.w - sn * b.h, by + sn * b.w + cs * b.h);
        g.lineTo(bx - cs * b.w - sn * b.h, by - sn * b.w + cs * b.h);
        g.lineTo(bx - cs * b.w + sn * b.h, by - sn * b.w - cs * b.h);
        g.lineTo(bx + cs * b.w + sn * b.h, by + sn * b.w - cs * b.h);
        g.closePath(); g.fillPath();
        g.lineStyle(1, this.tint(OIL.chrome), 0.7 * fade);
        g.strokePath();
      }
    });
  }

  /**
   * A fired beam: outer bloom, gold body, white heart, plus a muzzle flare at the emitter and
   * a splash of sparks where it lands. Used by drone lasers, the shield generator's point
   * defence and the turret — every one of Oil's hitscan weapons goes through this.
   */
  beam(
    x1: number, y1: number, x2: number, y2: number,
    opts: { width?: number; color?: number; duration?: number; depth?: number; impact?: number } = {},
  ): void {
    const w = opts.width ?? 3;
    const c = opts.color ?? OIL.gold;
    const dur = opts.duration ?? 190;
    const depth = opts.depth ?? 8;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    this.anim(depth, dur, (g, t) => {
      const fade = 1 - easeIn(t);
      // The beam pinches from both ends as it dies rather than simply fading, so a burst of
      // them reads as discrete shots instead of one flickering sheet.
      const k = easeIn(t) * 0.18;
      const ax = x1 + (x2 - x1) * k, ay = y1 + (y2 - y1) * k;
      g.lineStyle(w * 3.2 * fade, this.tint(c), 0.22 * fade);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(x2, y2); g.strokePath();
      g.lineStyle(w * fade, this.tint(c), 0.85 * fade);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(x2, y2); g.strokePath();
      g.lineStyle(w * 0.42 * fade, this.tint(OIL.white), 0.95 * fade);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(x2, y2); g.strokePath();
      // Muzzle flare and impact bloom.
      g.fillStyle(this.tint(OIL.white), 0.8 * fade);
      g.fillCircle(x1, y1, w * 1.5 * fade);
      g.fillStyle(this.tint(c), 0.6 * fade);
      g.fillCircle(x2, y2, (opts.impact ?? w * 2.4) * (0.6 + easeOut(t) * 0.9) * fade);
      g.fillStyle(this.tint(OIL.white), 0.9 * fade * fade);
      g.fillCircle(x2, y2, (opts.impact ?? w * 2.4) * 0.4 * fade);
    });
    this.sparks(x2, y2, 3, { angle: ang + Math.PI, spread: 1.1, speed: 130, life: 280, depth: depth + 1 });
  }

  /** Recoil flare at a barrel — sells that something was actually fired rather than teleported. */
  muzzleFlash(x: number, y: number, angle: number, scale = 1, depth = 8): void {
    this.anim(depth, 140, (g, t) => {
      const fade = 1 - t;
      // Star-shaped flash: a long axis along the bore, two short flanks. A plain disc at the
      // muzzle reads as a bubble; the cross is what makes it read as a discharge.
      g.fillStyle(this.tint(OIL.gold), 0.85 * fade);
      lick(g, x, y, angle, 24 * scale * (0.6 + t * 0.9), 7 * scale * fade, 0);
      lick(g, x, y, angle + Math.PI * 0.62, 11 * scale * fade, 3.4 * scale * fade, 0);
      lick(g, x, y, angle - Math.PI * 0.62, 11 * scale * fade, 3.4 * scale * fade, 0);
      g.fillStyle(this.tint(OIL.white), 0.9 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.4));
    });
    this.sparks(x, y, 4, { angle, spread: 0.6, speed: 140, life: 260, depth });
    this.smoke(x, y, 1, 6 * scale, depth - 3);
  }

  /**
   * Pressurised crude leaving a nozzle: nested globs of unequal length that flap and re-roll
   * every tick, so a held stream churns instead of strobing one fixed triangle.
   */
  gush(x: number, y: number, angle: number, length: number, depth = 4): void {
    const jets = Array.from({ length: 4 }, (_, i) => ({
      off: (i - 1.5) * 0.14,
      len: length * (0.6 + Math.random() * 0.5),
      w: 9 + Math.random() * 7,
      curve: (Math.random() - 0.5) * 22,
    }));
    this.anim(depth, 200, (g, t) => {
      const grow = 0.55 + easeOut(t) * 0.55;
      const fade = 1 - easeIn(t);
      for (const j of jets) {
        oilGlobLayered(
          g, this.tint,
          x + Math.cos(angle + j.off) * 14, y + Math.sin(angle + j.off) * 14,
          angle + j.off, j.len * grow, j.w, j.curve * t, 0.85 * fade,
        );
      }
      g.fillStyle(this.tint(OIL.tar), 0.55 * fade);
      g.fillCircle(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, 9 * grow);
    });
  }

  /**
   * The streak left behind something dragged or ridden across the ground: a smeared crude
   * track with tread notches stamped into it, plus spatter kicked out of the back.
   */
  skid(x1: number, y1: number, x2: number, y2: number, depth = 3): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(3, Math.round(dist / 22));
    this.anim(depth, 520, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const px = x1 + (x2 - x1) * f, py = y1 + (y2 - y1) * f;
        // Track is fattest where the wheel bit hardest and drains off from the back forward.
        const local = Math.max(0, fade - f * 0.3);
        const r = (5 + (1 - f) * 10) * local;
        if (r <= 0) continue;
        g.fillStyle(this.tint(OIL.tar), 0.6 * local);
        g.fillEllipse(px, py, r * 2.4, r * 1.5);
        g.fillStyle(this.tint(i % 2 ? OIL.violet : OIL.teal), 0.16 * local);
        g.fillEllipse(px, py, r * 1.5, r * 0.7);
        // Tread notches stamped across the track.
        g.lineStyle(1.6 * local, this.tint(OIL.sludge), 0.5 * local);
        g.beginPath();
        g.moveTo(px + Math.cos(angle + Math.PI / 2) * r, py + Math.sin(angle + Math.PI / 2) * r);
        g.lineTo(px - Math.cos(angle + Math.PI / 2) * r, py - Math.sin(angle + Math.PI / 2) * r);
        g.strokePath();
      }
    });
    this.spatter(x1, y1, 7, { angle: angle + Math.PI, spread: 0.9, speed: 150, size: 3, life: 500, fall: 70, depth });
  }

  /**
   * Ground-hugging eruption: a ring of globs thrown out of a welling pool. Used where crude
   * bursts up out of something rather than detonating.
   */
  gusher(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const seeds = Array.from({ length: petals }, (_, i) => ({
      // Uneven lengths, staggered roots and per-petal delays: petals fired from one point at
      // one length read as a starburst, so every one of these is deliberately out of step.
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.9,
      root: radius * (0.1 + Math.random() * 0.3),
      len: radius * (0.35 + Math.random() * 0.75),
      w: radius * (0.16 + Math.random() * 0.14),
      curve: (Math.random() - 0.5) * radius * 0.6,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 480, (g, t) => {
      const pool = 1 - easeIn(t);
      g.fillStyle(this.tint(OIL.tar), 0.6 * pool);
      g.fillCircle(x, y, radius * 0.45 * easeOut(t));
      g.fillStyle(this.tint(OIL.violet), 0.2 * pool);
      g.fillCircle(x, y, radius * 0.3 * easeOut(t));
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        oilGlobLayered(
          g, this.tint,
          x + Math.cos(s.ang) * s.root * grow, y + Math.sin(s.ang) * s.root * grow,
          s.ang, s.len * grow, s.w * (1 - lt * 0.4), s.curve * lt, 0.9 * fade,
        );
      }
    });
    this.ring(x, y, radius * 0.15, radius, OIL.amber, 400, 4, depth);
  }

  /**
   * Pressure building in a vessel: hex containment plates squeezing shut around a core while
   * crude is drawn in off the rim. `follow` lets it track a moving caster during a channel.
   */
  channelPressure(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streaks = Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * TAU,
      spin: 1.4 + Math.random() * 1.4,
      phase: Math.random(),
      len: 0.3 + Math.random() * 0.3,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 32) * 0.15;

      for (const s of streaks) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(OIL.crude), 0.85 * (1 - lt * 0.5));
        oilGlob(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI, r * s.len, 2.8 * (1 - lt));
      }

      // Compressing core: crude under pressure heating from black to gold.
      const cr = radius * (0.08 + easeIn(t) * 0.34) * pulse;
      g.fillStyle(this.tint(OIL.tar), 0.85);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(OIL.rust), 0.6 + 0.3 * easeIn(t));
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(OIL.gold), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.55);
      g.fillStyle(this.tint(OIL.white), 0.9 * easeIn(t) * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.24);

      // Six containment plates closing in, each drawn as a short arc segment of a hex.
      const rr = radius * (1 - easeIn(t) * 0.55) * pulse;
      g.lineStyle(3, this.tint(OIL.chrome), 0.4 + 0.45 * easeIn(t));
      for (let i = 0; i < 6; i++) {
        const a0 = (i / 6) * TAU + t * 1.2 + 0.14;
        const a1 = ((i + 1) / 6) * TAU + t * 1.2 - 0.14;
        g.beginPath();
        g.moveTo(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr);
        g.lineTo(cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr);
        g.strokePath();
      }
    });
  }

  /**
   * Column of burning crude punching upward — the vertical half of a very big blast. Kept to
   * a few broad licks under a rolling soot cap; thin ones read as scratches over the fireball.
   */
  oilPillar(x: number, y: number, radius: number, height: number, depth = 7): void {
    const licks = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.42,
      h: height * (0.7 + Math.random() * 0.4),
      w: radius * (0.44 + Math.random() * 0.22),
      sway: (Math.random() - 0.5) * radius * 0.4,
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 820, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      g.fillStyle(this.tint(OIL.gold), 0.5 * fade);
      g.fillEllipse(x, y, radius * 1.5, radius * 0.7);
      for (const l of licks) {
        const rise = easeOut(Math.max(0, (t - l.delay) / (1 - l.delay)));
        oilFlame(
          g, this.tint, x + l.ox, y + radius * 0.2,
          -Math.PI / 2, l.h * rise, l.w * (1 - t * 0.35),
          l.sway * rise + Math.sin(t * 8 + l.phase) * 8, 0.85 * fade,
        );
      }
      // Soot cap rolling off the top — the mushroom every fuel fire makes.
      if (t > 0.25) {
        const cap = (t - 0.25) / 0.75;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 1.6;
          g.fillStyle(this.tint(OIL.tar), 0.42 * fade);
          g.fillCircle(
            x + Math.cos(a) * radius * (0.5 + cap * 1.9),
            y - height * (0.85 + cap * 0.3) + Math.sin(a) * radius * 0.4,
            radius * (0.5 + cap * 0.5),
          );
        }
      }
    });
    this.spatter(x, y - height * 0.4, 8, {
      speed: radius * 1.3, spread: 0.9, angle: -Math.PI / 2,
      size: 4, life: 850, fall: height * 0.9, burning: true, depth,
    });
  }

  // ── Static hardware painters ────────────────────────────────────────────
  // Everything below paints into a caller-owned Graphics so the kit can repaint every drone,
  // barrel and puddle it owns in one pass per frame rather than spawning an animation each.

  /**
   * A living pool of crude: wobbling rim, iridescent film crawling across the surface, and
   * bubbles welling up and popping. The ignited variant burns from the rim inward with a soot
   * haze over it, so "this one is alight" is legible from across the arena.
   */
  static drawPuddle(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    x: number, y: number, radius: number, t: number, alpha: number, seed: number, ignited: boolean,
  ): void {
    const segs = Phaser.Math.Clamp(Math.round(radius / 2.2), 22, 60);
    const rim = (rr: number, wob: number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        // Two out-of-phase lobes: a true circle reads as a UI decal, not a spill.
        const r = rr * (1 + Math.sin(a * 3 + t * 0.9 + seed) * wob + Math.sin(a * 5 - t * 0.6 + seed) * wob * 0.6);
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    g.fillStyle(tint(OIL.tar), 0.85 * alpha);
    rim(radius, 0.06); g.fillPath();
    g.fillStyle(tint(OIL.crude), 0.9 * alpha);
    rim(radius * 0.84, 0.07); g.fillPath();

    // Interference film. Three slow bands on different orbits — this is the whole reason a
    // black disc on a dark floor still reads as oil rather than as a hole.
    for (let i = 0; i < 3; i++) {
      const a = t * (0.35 + i * 0.18) + seed + i * 2.1;
      const d = radius * (0.16 + 0.4 * ((i + 1) / 4));
      const gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d * 0.8;
      g.fillStyle(tint(i === 1 ? OIL.teal : OIL.violet), 0.24 * alpha);
      g.fillEllipse(gx, gy, radius * 0.5, radius * 0.16);
      g.fillStyle(tint(i === 1 ? OIL.violet : OIL.teal), 0.14 * alpha);
      g.fillEllipse(gx, gy + radius * 0.06, radius * 0.34, radius * 0.09);
    }

    // Bubbles welling up and popping on a per-bubble loop.
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.5 + i * 0.37 + seed) % 1;
      const ba = seed * 3 + i * 2.4;
      const bd = radius * (0.2 + (i / 3) * 0.5);
      const bx = x + Math.cos(ba) * bd, by = y + Math.sin(ba) * bd * 0.8;
      const br = radius * 0.1 * Math.sin(p * Math.PI);
      if (br <= 0.2) continue;
      g.fillStyle(tint(OIL.sludge), 0.7 * alpha);
      g.fillCircle(bx, by, br);
      g.fillStyle(tint(OIL.chrome), 0.35 * alpha);
      g.fillCircle(bx - br * 0.3, by - br * 0.3, br * 0.3);
    }

    if (!ignited) {
      g.lineStyle(1.5, tint(OIL.sludge), 0.5 * alpha);
      rim(radius * 0.97, 0.06); g.strokePath();
      return;
    }

    // Alight: licks around the rim, a hot bed underneath, and soot drifting off the top.
    g.fillStyle(tint(OIL.ember), 0.28 * alpha);
    g.fillCircle(x, y, radius * 0.9);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + t * 0.5;
      const wob = Math.sin(t * (3 + i * 0.4) + i);
      oilFlame(
        g, tint,
        x + Math.cos(a) * radius * 0.62, y + Math.sin(a) * radius * 0.62,
        a, radius * (0.34 + wob * 0.14), radius * 0.15, wob * radius * 0.2, 0.85 * alpha,
      );
    }
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.35 + i * 0.33) % 1;
      g.fillStyle(tint(OIL.tar), 0.3 * (1 - p) * alpha);
      g.fillCircle(x + Math.sin(t + i * 2) * radius * 0.3, y - p * radius * 1.3, radius * (0.2 + p * 0.35));
    }
  }

  /**
   * A quadcopter drone drawn in its own local space (centre at 0,0) so the owning Graphics can
   * be tweened and read for position exactly as the old plain circle was. Rotors blur, the
   * chassis carries a lens that looks along `aim`, and the magazine lights count remaining
   * shots — the ammo state used to be a colour swap nobody could read at speed.
   */
  static drawDrone(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    aim: number, spin: number, shots: number, maxShots: number,
    scale: number, overcharged: boolean,
  ): void {
    const s = scale;
    const shell = overcharged ? OIL.teal : OIL.steel;
    const lamp = overcharged ? OIL.white : shots > 0 ? OIL.gold : OIL.rust;

    // Under-glow, so a dark chassis still reads over a dark floor.
    g.fillStyle(tint(lamp), 0.16);
    g.fillCircle(0, 0, 13 * s);

    // Four rotor booms and their blurred discs.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * TAU;
      const bx = Math.cos(a) * 9 * s, by = Math.sin(a) * 9 * s;
      g.lineStyle(2.4 * s, tint(OIL.crude), 0.95);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(bx, by); g.strokePath();
      g.fillStyle(tint(shell), 0.9);
      g.fillCircle(bx, by, 2.6 * s);
      // Blur disc plus two visible blades caught mid-rotation.
      g.fillStyle(tint(OIL.chrome), 0.16);
      g.fillCircle(bx, by, 5.4 * s);
      const r = spin * (i % 2 ? -1 : 1);
      g.lineStyle(1.2 * s, tint(OIL.chrome), 0.55);
      g.beginPath();
      g.moveTo(bx + Math.cos(r) * 5.2 * s, by + Math.sin(r) * 5.2 * s);
      g.lineTo(bx - Math.cos(r) * 5.2 * s, by - Math.sin(r) * 5.2 * s);
      g.strokePath();
    }

    // Chassis.
    g.fillStyle(tint(OIL.crude), 1);
    g.fillCircle(0, 0, 6.2 * s);
    g.lineStyle(1.4 * s, tint(shell), 0.95);
    g.strokeCircle(0, 0, 6.2 * s);
    g.fillStyle(tint(OIL.tar), 1);
    g.fillCircle(0, 0, 4.2 * s);

    // Camera lens on a short stalk, pointing where the drone is aiming.
    const lx = Math.cos(aim) * 5.4 * s, ly = Math.sin(aim) * 5.4 * s;
    g.fillStyle(tint(lamp), 0.9);
    g.fillCircle(lx, ly, 2.6 * s);
    g.fillStyle(tint(OIL.white), 0.9);
    g.fillCircle(lx - 0.7 * s, ly - 0.7 * s, 1 * s);

    // Magazine lights: one pip per remaining shot, dark ones for spent rounds.
    for (let i = 0; i < maxShots; i++) {
      const a = -Math.PI / 2 + (i - (maxShots - 1) / 2) * 0.42;
      const px = Math.cos(a) * 3.1 * s, py = Math.sin(a) * 3.1 * s;
      g.fillStyle(tint(i < shots ? OIL.gold : OIL.sludge), i < shots ? 0.95 : 0.7);
      g.fillCircle(px, py, 0.9 * s);
    }

    if (overcharged) {
      // Containment arcs jumping across the shell while it is overcharged.
      g.lineStyle(1.4 * s, tint(OIL.white), 0.7);
      for (let i = 0; i < 3; i++) {
        const a0 = spin * 1.7 + i * 2.1;
        g.beginPath();
        g.moveTo(Math.cos(a0) * 7 * s, Math.sin(a0) * 7 * s);
        g.lineTo(Math.cos(a0 + 1.1) * 10 * s, Math.sin(a0 + 1.1) * 10 * s);
        g.lineTo(Math.cos(a0 + 1.8) * 7.5 * s, Math.sin(a0 + 1.8) * 7.5 * s);
        g.strokePath();
      }
    }
  }

  /**
   * Gasoline perk (divine): the hardware bolted onto a special airframe, drawn on top of the
   * standard drone in the same local space. Each one is the tool it actually uses — a case of
   * medicine, a ram, a bomb rack, a gold star — so a glance at the orbit says what is up there.
   */
  static drawDroneBadge(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    kind: 'med' | 'bash' | 'blast' | 'prime', spin: number,
  ): void {
    if (kind === 'med') {
      // A white case slung under the chassis with a red cross on it.
      g.fillStyle(tint(OIL.white), 0.95);
      g.fillRect(-4.4, 2.6, 8.8, 6.2);
      g.fillStyle(tint(OIL.ember), 0.95);
      g.fillRect(-0.9, 3.6, 1.8, 4.2);
      g.fillRect(-3, 4.8, 6, 1.8);
      g.lineStyle(1, tint(OIL.steel), 0.9);
      g.strokeRect(-4.4, 2.6, 8.8, 6.2);
      return;
    }
    if (kind === 'bash') {
      // A blunt steel ram out the nose, braced back to the chassis.
      const a = spin * 0.4;
      g.fillStyle(tint(OIL.chrome), 0.95);
      g.fillCircle(Math.cos(a) * 10, Math.sin(a) * 10, 3.4);
      g.lineStyle(2.4, tint(OIL.steel), 0.95);
      g.beginPath();
      g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      g.strokePath();
      return;
    }
    if (kind === 'blast') {
      // Two bombs on a rack, nose down.
      for (const side of [-1, 1]) {
        g.fillStyle(tint(OIL.tar), 0.95);
        g.fillCircle(side * 4.6, 4.4, 2.8);
        g.fillStyle(tint(OIL.ember), 0.9);
        g.fillCircle(side * 4.6, 2.2, 1.1);
      }
      g.lineStyle(1.2, tint(OIL.steel), 0.9);
      g.lineBetween(-4.6, 2.4, 4.6, 2.4);
      return;
    }
    // Prime: a gold star riding above the chassis, turning with the rotors.
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 5.4 : 2.4;
      const a = -Math.PI / 2 + (i / 10) * TAU + spin * 0.25;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r - 9 });
    }
    g.fillStyle(tint(OIL.gold), 0.95);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
  }

  /** One Blast-Drone bomb in flight, drawn in local space and tumbled by its own rotation. */
  static drawBomb(g: Phaser.GameObjects.Graphics, tint: OilColorFn): void {
    g.fillStyle(tint(OIL.tar), 1);
    g.fillCircle(0, 0, 5.4);
    g.fillStyle(tint(OIL.steel), 0.9);
    g.fillRect(-1.2, -8.4, 2.4, 4);
    g.fillStyle(tint(OIL.ember), 0.95);
    g.fillCircle(0, -9.2, 1.8);
    g.lineStyle(1.2, tint(OIL.chrome), 0.6);
    g.strokeCircle(0, 0, 5.4);
  }

  /**
   * A steel drum rolling on its side, drawn in local space with its axis across the direction
   * of travel. Staves scroll with `roll`, so the barrel visibly turns as it crosses the arena
   * rather than sliding — the single thing the old flat circle could not say.
   */
  static drawBarrel(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    roll: number, alpha: number, hot: boolean,
  ): void {
    const L = 21, W = 14;

    g.fillStyle(tint(OIL.tar), 0.35 * alpha);
    g.fillEllipse(2, 3, L * 2.2, W * 2.3);

    // Drum body — slightly barrelled, so the silhouette isn't a plain box.
    g.fillStyle(tint(OIL.crude), alpha);
    g.fillEllipse(0, 0, L * 2, W * 2.2);
    g.fillStyle(tint(OIL.sludge), alpha);
    g.fillRect(-L, -W, L * 2, W * 2);
    g.fillStyle(tint(OIL.crude), alpha);
    g.fillEllipse(-L, 0, 9, W * 2);
    g.fillStyle(tint(OIL.tar), alpha);
    g.fillEllipse(L, 0, 9, W * 2);

    // Staves scrolling along the roll axis.
    for (let i = 0; i < 7; i++) {
      const sx = (((roll * 7 + i * 6.4) % (L * 2)) + L * 2) % (L * 2) - L;
      const shade = 0.25 + 0.35 * (0.5 + 0.5 * Math.cos((sx / L) * Math.PI));
      g.lineStyle(1.6, tint(OIL.tar), shade * alpha);
      g.beginPath(); g.moveTo(sx, -W * 0.94); g.lineTo(sx, W * 0.94); g.strokePath();
    }

    // Two chrome hoops and a hazard band.
    for (const hx of [-L * 0.5, L * 0.5]) {
      g.lineStyle(3, tint(OIL.chrome), 0.75 * alpha);
      g.beginPath(); g.moveTo(hx, -W); g.lineTo(hx, W); g.strokePath();
    }
    g.fillStyle(tint(hot ? OIL.flame : OIL.gold), 0.9 * alpha);
    g.fillRect(-3, -W, 6, W * 2);
    g.fillStyle(tint(OIL.tar), 0.85 * alpha);
    for (let i = 0; i < 4; i++) g.fillRect(-3, -W + i * (W / 2) + 1, 6, 3);

    // Bung cap and the specular band along the top of the drum.
    g.fillStyle(tint(OIL.chrome), 0.85 * alpha);
    g.fillCircle(-L * 0.72, -W * 0.42, 2.6);
    g.fillStyle(tint(OIL.chrome), 0.28 * alpha);
    g.fillEllipse(0, -W * 0.58, L * 1.6, 3.4);

    if (hot) {
      g.fillStyle(tint(OIL.flame), 0.3 * alpha);
      g.fillEllipse(0, 0, L * 2.6, W * 2.8);
    }
  }

  /**
   * Coal: a faceted lump with a heart still glowing. Drawn in local space; `seed` keeps each
   * lump's facets fixed so a field of them doesn't boil.
   */
  static drawCoal(g: Phaser.GameObjects.Graphics, tint: OilColorFn, t: number, seed: number): void {
    const glow = 0.55 + 0.45 * Math.sin(t * 3 + seed);
    g.fillStyle(tint(OIL.gold), 0.22 * glow);
    g.fillCircle(0, 0, 13);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + seed;
      const r = 7 + ((Math.sin(seed * 9 + i * 4.3) + 1) / 2) * 3.4;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    g.fillStyle(tint(OIL.tar), 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.closePath(); g.fillPath();
    // Lit top facet and the ember cracks running through it.
    g.fillStyle(tint(OIL.steel), 0.5);
    g.beginPath();
    g.moveTo(pts[5].x, pts[5].y); g.lineTo(pts[6].x, pts[6].y); g.lineTo(pts[0].x, pts[0].y);
    g.closePath(); g.fillPath();
    g.lineStyle(1.6, tint(OIL.flame), 0.6 + 0.35 * glow);
    g.beginPath();
    g.moveTo(-5, 2); g.lineTo(-1, -1); g.lineTo(2, 3); g.lineTo(6, 0);
    g.strokePath();
    g.fillStyle(tint(OIL.gold), 0.85 * glow);
    g.fillCircle(-1, -1, 1.6);
  }

  /**
   * The Shield Generator: a hexagonal steel plinth with a counter-rotating rotor and a lens
   * whose brightness tracks the charge left. Scrap picked up by the F+ upgrade builds as grime
   * over the plinth, so a filthy generator is visibly a well-used one.
   */
  static drawGenerator(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    x: number, y: number, t: number, charged: boolean, scrap: number, chargeRatio: number, fieldR: number,
  ): void {
    const grime = Math.min(1, scrap / 10);
    const lit = charged ? OIL.teal : OIL.steel;

    if (charged) {
      // Field dome: a hex lattice fading outward, pulsing with the charge remaining.
      const pulse = 0.75 + 0.25 * Math.sin(t * 4);
      g.fillStyle(tint(OIL.teal), 0.05 * pulse);
      g.fillCircle(x, y, fieldR);
      g.lineStyle(1, tint(OIL.teal), (0.1 + 0.2 * chargeRatio) * pulse);
      for (let r = fieldR * 0.35; r <= fieldR; r += fieldR * 0.32) {
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * TAU + t * 0.25;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      g.lineStyle(2, tint(OIL.teal), 0.3 + 0.35 * chargeRatio);
      g.strokeCircle(x, y, fieldR);
    }

    // Plinth: hexagonal plate with bolts at the corners.
    const R = 18;
    const hex = (rr: number, rot: number) => {
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU + rot;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };
    g.fillStyle(tint(OIL.tar), 0.5);
    g.fillEllipse(x + 2, y + 4, R * 2.2, R * 1.4);
    g.fillStyle(tint(OIL.steel), 0.95 - grime * 0.5);
    hex(R, -Math.PI / 6); g.fillPath();
    g.lineStyle(2.5, tint(lit), 0.95);
    hex(R, -Math.PI / 6); g.strokePath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU - Math.PI / 6;
      g.fillStyle(tint(OIL.chrome), 0.8 - grime * 0.5);
      g.fillCircle(x + Math.cos(a) * R * 0.78, y + Math.sin(a) * R * 0.78, 1.8);
    }

    // Rotor spinning inside the plinth, faster while charged.
    g.lineStyle(2, tint(lit), 0.85);
    hex(R * 0.6, t * (charged ? 1.8 : 0.3)); g.strokePath();

    // Lens.
    const glow = charged ? 0.5 + 0.5 * chargeRatio : 0.18;
    g.fillStyle(tint(lit), 0.35 * glow + 0.15);
    g.fillCircle(x, y, 9);
    g.fillStyle(tint(charged ? OIL.chrome : OIL.crude), 0.9);
    g.fillCircle(x, y, 6);
    g.fillStyle(tint(charged ? OIL.white : OIL.sludge), glow);
    g.fillCircle(x, y, 3.4);

    // Grime: crude blotches building over the plate as the generator eats projectiles.
    if (grime > 0) {
      for (let i = 0; i < 5; i++) {
        const a = i * 2.3;
        g.fillStyle(tint(OIL.tar), 0.5 * grime);
        g.fillEllipse(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, R * 0.5 * grime + 3, R * 0.34 * grime + 2);
      }
    }
  }

  /**
   * The mastery Turret: an armoured pintle with twin barrels tracking the aim, a recoil kick
   * fed from `heat`, and a framed health bar. Barrels glow as sustained fire heats them, so a
   * turret that has been hosing down the arena looks like one.
   */
  static drawTurret(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    x: number, y: number, radius: number, aim: number, hpRatio: number, mounted: boolean,
    heat: number, recoil: number,
  ): void {
    const shell = mounted ? OIL.teal : OIL.steel;

    g.fillStyle(tint(OIL.tar), 0.55);
    g.fillEllipse(x + 2, y + 5, radius * 2.4, radius * 1.5);

    // Base plate with bolt heads.
    g.fillStyle(tint(OIL.crude), 0.98);
    g.fillCircle(x, y, radius);
    g.lineStyle(3, tint(shell), 0.95);
    g.strokeCircle(x, y, radius);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.fillStyle(tint(OIL.chrome), 0.65);
      g.fillCircle(x + Math.cos(a) * (radius - 4), y + Math.sin(a) * (radius - 4), 1.7);
    }

    // Turret head, offset back along the aim by the recoil.
    const kick = recoil * 4;
    const hx = x - Math.cos(aim) * kick, hy = y - Math.sin(aim) * kick;
    g.fillStyle(tint(OIL.steel), 0.95);
    g.fillCircle(hx, hy, radius * 0.62);
    g.fillStyle(tint(OIL.crude), 0.95);
    g.fillCircle(hx, hy, radius * 0.42);

    // Twin barrels, with the heat glow riding their muzzles.
    const px = -Math.sin(aim), py = Math.cos(aim);
    for (const s of [1, -1]) {
      const rx = hx + px * s * 5, ry = hy + py * s * 5;
      const mx = rx + Math.cos(aim) * (radius + 15), my = ry + Math.sin(aim) * (radius + 15);
      g.lineStyle(5.5, tint(OIL.crude), 1);
      g.beginPath(); g.moveTo(rx, ry); g.lineTo(mx, my); g.strokePath();
      g.lineStyle(2, tint(shell), 0.9);
      g.beginPath(); g.moveTo(rx, ry); g.lineTo(mx, my); g.strokePath();
      if (heat > 0.02) {
        g.fillStyle(tint(OIL.flame), 0.45 * heat);
        g.fillCircle(mx, my, 5 * heat + 2);
        g.fillStyle(tint(OIL.gold), 0.7 * heat);
        g.fillCircle(mx, my, 2.6 * heat + 1);
      }
    }
    // Ammo feed running back off the head.
    g.lineStyle(3, tint(OIL.sludge), 0.9);
    g.beginPath();
    g.moveTo(hx, hy);
    g.lineTo(hx - Math.cos(aim) * (radius + 6), hy - Math.sin(aim) * (radius + 6));
    g.strokePath();

    // Health bar in a steel frame.
    const barW = radius * 2;
    const barY = y - radius - 12;
    g.fillStyle(tint(OIL.tar), 0.85);
    g.fillRect(x - barW / 2 - 1, barY - 1, barW + 2, 7);
    g.fillStyle(hpRatio > 0.35 ? 0x44dd66 : 0xdd4444, 0.95);
    g.fillRect(x - barW / 2, barY, barW * Math.max(0, hpRatio), 5);
    g.lineStyle(1, tint(OIL.chrome), 0.6);
    g.strokeRect(x - barW / 2 - 1, barY - 1, barW + 2, 7);
  }

  /**
   * One car of the train. `lead` draws the locomotive — boiler, stack, headlamp and cowcatcher;
   * otherwise a hopper wagon. Both sit on visible wheels and carry a coupling stub, so the
   * chain of segments reads as a train instead of a string of beads.
   */
  static drawTrainCar(
    g: Phaser.GameObjects.Graphics, tint: OilColorFn,
    x: number, y: number, angle: number, t: number, lead: boolean, overload: boolean, index: number,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    const at = (f: number, s: number) => ({ x: x + cos * f + px * s, y: y + sin * f + py * s });
    const body = overload ? OIL.rust : OIL.sludge;
    const trim = overload ? OIL.flame : OIL.chrome;
    // The locomotive has to cover the radius-22 fighter body it is drawn over, or the sprite
    // pokes out from behind its own train.
    const L = lead ? 23 : 15, W = lead ? 16 : 11;

    g.fillStyle(tint(OIL.tar), 0.45);
    g.fillEllipse(x + 2, y + 4, L * 2.2, W * 2.2);

    // Wheels first, so the chassis sits on top of them.
    for (const f of [-L * 0.55, L * 0.55]) {
      for (const s of [-1, 1]) {
        const w = at(f, s * (W - 1));
        g.fillStyle(tint(OIL.tar), 1);
        g.fillCircle(w.x, w.y, 3.4);
        g.lineStyle(1.4, tint(trim), 0.8);
        // Spoke caught mid-rotation, so the wheels visibly turn.
        const r = t * 9 + index;
        g.beginPath();
        g.moveTo(w.x + Math.cos(r) * 3, w.y + Math.sin(r) * 3);
        g.lineTo(w.x - Math.cos(r) * 3, w.y - Math.sin(r) * 3);
        g.strokePath();
      }
    }

    // Chassis.
    const c1 = at(L, -W), c2 = at(L, W), c3 = at(-L, W), c4 = at(-L, -W);
    g.fillStyle(tint(body), 0.98);
    g.beginPath();
    g.moveTo(c1.x, c1.y); g.lineTo(c2.x, c2.y); g.lineTo(c3.x, c3.y); g.lineTo(c4.x, c4.y);
    g.closePath(); g.fillPath();
    g.lineStyle(2, tint(trim), 0.9);
    g.strokePath();

    // Coupling stub off the back.
    const cp = at(-L - 4, 0);
    g.lineStyle(3, tint(OIL.steel), 0.9);
    g.beginPath(); g.moveTo(at(-L, 0).x, at(-L, 0).y); g.lineTo(cp.x, cp.y); g.strokePath();

    if (!lead) {
      // Hopper load: crude heaped above the sides, with the film on it.
      const load = at(0, 0);
      g.fillStyle(tint(OIL.tar), 1);
      g.fillEllipse(load.x, load.y, L * 1.4, W * 1.4);
      g.fillStyle(tint(overload ? OIL.flame : OIL.violet), 0.4);
      g.fillEllipse(load.x - 1, load.y - 1, L * 0.7, W * 0.5);
      return;
    }

    // ── Locomotive ──────────────────────────────────────────────────────
    // Boiler running the length of the car, capped by a chrome smokebox door.
    const boiler = at(2, 0);
    g.fillStyle(tint(OIL.crude), 1);
    g.fillEllipse(boiler.x, boiler.y, L * 1.7, W * 1.3);
    const door = at(L * 0.8, 0);
    g.fillStyle(tint(trim), 0.9);
    g.fillCircle(door.x, door.y, W * 0.52);
    g.fillStyle(tint(OIL.tar), 0.9);
    g.fillCircle(door.x, door.y, W * 0.3);

    // Cowcatcher: three prongs off the nose.
    for (const s of [-1, 0, 1]) {
      const a = at(L + 7, s * 5);
      g.lineStyle(2, tint(OIL.steel), 0.95);
      g.beginPath(); g.moveTo(at(L, s * 6).x, at(L, s * 6).y); g.lineTo(a.x, a.y); g.strokePath();
    }

    // Headlamp and the cone of light it throws down the track.
    const lampP = at(L + 2, 0);
    g.fillStyle(tint(OIL.gold), 0.18);
    g.beginPath();
    g.moveTo(lampP.x, lampP.y);
    g.lineTo(at(L + 62, -22).x, at(L + 62, -22).y);
    g.lineTo(at(L + 62, 22).x, at(L + 62, 22).y);
    g.closePath(); g.fillPath();
    g.fillStyle(tint(OIL.white), 0.95);
    g.fillCircle(lampP.x, lampP.y, 3);

    // Chimney, and the smoke standing out of it. Puffs run on a phase loop rather than being
    // spawned, so the stack keeps smoking however long the morph lasts.
    const stack = at(L * 0.55, 0);
    g.fillStyle(tint(OIL.tar), 1);
    g.fillCircle(stack.x, stack.y, 4.4);
    g.lineStyle(1.6, tint(trim), 0.9);
    g.strokeCircle(stack.x, stack.y, 4.4);
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.5 + i * 0.25) % 1;
      const puff = at(L * 0.55 - p * 26, Math.sin(p * 5 + i) * 6);
      g.fillStyle(tint(overload ? OIL.flame : OIL.tar), (overload ? 0.55 : 0.42) * (1 - p));
      g.fillCircle(puff.x, puff.y - p * 4, 3 + p * 8);
    }
    if (overload) {
      // Firebox roaring out from under the boiler.
      const fire = at(-L * 0.5, 0);
      g.fillStyle(tint(OIL.flame), 0.4 + 0.2 * Math.sin(t * 12));
      g.fillEllipse(fire.x, fire.y, L * 0.9, W * 1.1);
      g.fillStyle(tint(OIL.gold), 0.6);
      g.fillEllipse(fire.x, fire.y, L * 0.5, W * 0.6);
    }
  }
}

// ── OilCoat ───────────────────────────────────────────────────────────────

/**
 * The Oily debuff made visible: a film of crude clinging to the fighter, sagging into drips
 * that grow off the underside and break away, with the interference sheen crawling over it.
 * Switch `setBurning` on and the same coating catches, so "coated" and "coated and alight" are
 * two readings of one continuous tell rather than two unrelated blobs.
 */
export class OilCoat {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private burning = false;
  private drips: { ang: number; phase: number; speed: number; w: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: OilColorFn,
    private radius = 26,
    depth = 7,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.drips = Array.from({ length: 5 }, (_, i) => ({
      ang: Math.PI * 0.18 + (i / 4) * Math.PI * 0.64,
      phase: Math.random(),
      speed: 0.6 + Math.random() * 0.5,
      w: 2.2 + Math.random() * 1.6,
    }));
  }

  setBurning(on: boolean): void { this.burning = on; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const R = this.radius;

    // The film itself: a wobbling skin a shade larger than the body.
    const segs = 30;
    g.fillStyle(this.tint(OIL.tar), 0.55 * alpha);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * TAU;
      const r = R * (1 + Math.sin(a * 3 + this.t * 1.6) * 0.05 + Math.sin(a * 5 - this.t) * 0.03);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fillPath();

    // Sheen bands drifting across the film.
    for (let i = 0; i < 2; i++) {
      const p = this.t * (0.6 + i * 0.3) + i * 2.2;
      g.fillStyle(this.tint(i ? OIL.teal : OIL.violet), 0.3 * alpha);
      g.fillEllipse(x + Math.cos(p) * R * 0.4, y + Math.sin(p) * R * 0.35, R * 0.7, R * 0.2);
    }

    // Drips running off the underside and pinching away.
    for (const d of this.drips) {
      const p = (this.t * d.speed + d.phase) % 1;
      const rx = x + Math.cos(d.ang) * R * 0.9;
      const ry = y + Math.sin(d.ang) * R * 0.9;
      const len = 5 + p * 16;
      g.fillStyle(this.tint(OIL.tar), 0.85 * alpha * (1 - p * 0.5));
      oilGlob(g, rx, ry, Math.PI / 2, len, d.w * (1 - p * 0.35));
      if (p > 0.85) {
        // The bead that just broke off, falling free.
        g.fillStyle(this.tint(OIL.crude), 0.8 * alpha);
        g.fillCircle(rx, ry + len + (p - 0.85) * 40, d.w * 0.8);
      }
    }

    if (!this.burning) return;

    // Alight: licks running up the film and soot lifting off the top.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.62;
      const wob = Math.sin(this.t * (5 + i) + i * 1.7);
      oilFlame(
        this.g, this.tint,
        x + Math.cos(a) * R * 0.75, y + Math.sin(a) * R * 0.75,
        a, R * (0.42 + wob * 0.16), R * 0.16, wob * R * 0.2, 0.9 * alpha,
      );
    }
    for (let i = 0; i < 3; i++) {
      const p = (this.t * 0.6 + i * 0.33) % 1;
      g.fillStyle(this.tint(OIL.tar), 0.32 * (1 - p) * alpha);
      g.fillCircle(x + Math.sin(this.t * 2 + i * 2) * R * 0.4, y - R - p * R * 1.4, R * (0.18 + p * 0.3));
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── DroneArrayLattice ─────────────────────────────────────────────────────

/**
 * The Drone Array mastery passive: an armour lattice of hexagonal plates orbiting the caster,
 * one plate per drone currently flying. Drawn at a low depth so a stance aura layered over it
 * reads as one silhouette rather than fighting it, and empty when no drone is up — the plates
 * are the resistance, so the tell has to vanish the instant the last drone is spent.
 */
export class DroneArrayLattice {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private plates = 0;

  constructor(private scene: Phaser.Scene, private tint: OilColorFn, depth = 2) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setPlates(n: number): void { this.plates = n; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02 || this.plates <= 0) return;

    const R = 34;
    const spin = this.t * 0.7;
    g.fillStyle(this.tint(OIL.teal), 0.05 * alpha * Math.min(1, this.plates / 4));
    g.fillCircle(x, y, R);

    for (let i = 0; i < this.plates; i++) {
      const a = spin + (i / this.plates) * TAU;
      const cx = x + Math.cos(a) * R;
      const cy = y + Math.sin(a) * R * 0.62;
      const scale = 0.75 + 0.25 * Math.sin(a);
      const s = 7 * scale;
      g.fillStyle(this.tint(OIL.crude), 0.75 * alpha);
      g.lineStyle(1.6, this.tint(OIL.teal), 0.85 * alpha);
      g.beginPath();
      for (let k = 0; k <= 6; k++) {
        const ka = (k / 6) * TAU + a;
        const px = cx + Math.cos(ka) * s, py = cy + Math.sin(ka) * s;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fillPath(); g.strokePath();
      g.fillStyle(this.tint(OIL.chrome), 0.6 * alpha);
      g.fillCircle(cx, cy, 1.6 * scale);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── Machinery ─────────────────────────────────────────────────────────────

/**
 * A hydraulic hose arm: a run of ribbed rubber segments between two chromed collars, sagging
 * under its own weight between the shoulder and the hand it feeds.
 *
 * Drawn on the *body* layer so it passes over the sprite but under the ball hand — a hose painted
 * over the fist would swallow the thing it is plumbed into.
 */
export function hoseArm(
  g: Phaser.GameObjects.Graphics, tint: OilColorFn,
  sx: number, sy: number, hx: number, hy: number, alpha: number, armoured: boolean,
): void {
  const dx = hx - sx, dy = hy - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  // Stop short of the fist so the last collar reads as a coupling, not a sleeve.
  const run = Math.max(4, len - 4);
  const segs = Phaser.Math.Clamp(Math.round(run / 6), 2, 6);
  // Gravity sag, deepest at the middle of the run.
  const sag = Math.min(5, run * 0.14);

  const pt = (u: number, off: number): { x: number; y: number } => ({
    x: sx + ux * run * u + px * off,
    y: sy + uy * run * u + py * off + Math.sin(u * Math.PI) * sag,
  });

  // Casing.
  g.lineStyle(armoured ? 7.4 : 6.4, tint(OIL.tar), alpha * 0.95);
  const spine: { x: number; y: number }[] = [];
  for (let i = 0; i <= 8; i++) spine.push(pt(i / 8, 0));
  g.beginPath();
  g.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < spine.length; i++) g.lineTo(spine[i].x, spine[i].y);
  g.strokePath();
  g.lineStyle(armoured ? 4.6 : 3.8, tint(OIL.crude), alpha * 0.95);
  g.beginPath();
  g.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < spine.length; i++) g.lineTo(spine[i].x, spine[i].y);
  g.strokePath();
  // Specular film along the upper edge — the one thing that says rubber-with-oil-on-it.
  g.lineStyle(1.2, tint(OIL.violet), alpha * 0.4);
  g.beginPath();
  const top = spine.map((p) => ({ x: p.x + px * 1.8, y: p.y + py * 1.8 }));
  g.moveTo(top[0].x, top[0].y);
  for (let i = 1; i < top.length; i++) g.lineTo(top[i].x, top[i].y);
  g.strokePath();

  // Ribbed collars along the run, plus a heavier chromed coupling at each end.
  for (let i = 1; i < segs; i++) {
    const p = pt(i / segs, 0);
    g.lineStyle(armoured ? 2 : 1.6, tint(OIL.steel), alpha * 0.85);
    g.lineBetween(p.x + px * 3.4, p.y + py * 3.4, p.x - px * 3.4, p.y - py * 3.4);
  }
  for (const u of [0, 1]) {
    const p = pt(u, 0);
    g.fillStyle(tint(armoured ? OIL.chrome : OIL.steel), alpha);
    g.fillCircle(p.x, p.y, armoured ? 4 : 3.4);
    g.fillStyle(tint(OIL.tar), alpha * 0.8);
    g.fillCircle(p.x, p.y, armoured ? 2 : 1.7);
  }
}

/**
 * A pressure gauge: a brass bezel over a pale dial with a needle swept by `value` (0–1) across
 * the bottom three-quarters of the face, and a red arc over the last fifth. The single readable
 * instrument on the character — everything else on the torso is plumbing.
 */
export function pressureGauge(
  g: Phaser.GameObjects.Graphics, tint: OilColorFn,
  cx: number, cy: number, r: number, value: number, alpha: number, lit: boolean,
): void {
  g.fillStyle(tint(OIL.tar), alpha);
  g.fillCircle(cx, cy, r + 1.4);
  g.fillStyle(tint(lit ? OIL.chrome : OIL.steel), alpha);
  g.fillCircle(cx, cy, r + 0.7);
  g.fillStyle(tint(lit ? OIL.gold : OIL.brown), alpha);
  g.fillCircle(cx, cy, r);
  g.fillStyle(tint(OIL.sludge), alpha * 0.35);
  g.fillCircle(cx - r * 0.25, cy - r * 0.25, r * 0.62);

  // Redline over the top fifth of the sweep.
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  g.lineStyle(1.5, tint(OIL.ember), alpha * 0.9);
  g.beginPath();
  g.arc(cx, cy, r * 0.78, a1 - (a1 - a0) * 0.2, a1, false);
  g.strokePath();
  // Tick marks.
  g.lineStyle(0.8, tint(OIL.tar), alpha * 0.7);
  for (let i = 0; i <= 4; i++) {
    const ta = a0 + (a1 - a0) * (i / 4);
    g.lineBetween(
      cx + Math.cos(ta) * r * 0.55, cy + Math.sin(ta) * r * 0.55,
      cx + Math.cos(ta) * r * 0.85, cy + Math.sin(ta) * r * 0.85,
    );
  }
  // Needle.
  const na = a0 + (a1 - a0) * Phaser.Math.Clamp(value, 0, 1);
  g.lineStyle(1.6, tint(OIL.tar), alpha);
  g.lineBetween(cx, cy, cx + Math.cos(na) * r * 0.82, cy + Math.sin(na) * r * 0.82);
  g.fillStyle(tint(OIL.chrome), alpha);
  g.fillCircle(cx, cy, 1.3);
  // Glass glint, always up-left, so the dial reads as covered rather than open.
  g.fillStyle(tint(OIL.white), alpha * 0.22);
  g.fillEllipse(cx - r * 0.3, cy - r * 0.36, r * 0.8, r * 0.42);
}

/** A valve handwheel seen face-on: a rim, four spokes and a hub nut. */
export function valveWheel(
  g: Phaser.GameObjects.Graphics, tint: OilColorFn,
  cx: number, cy: number, r: number, spin: number, alpha: number,
): void {
  g.lineStyle(2.4, tint(OIL.rust), alpha);
  g.strokeCircle(cx, cy, r);
  g.lineStyle(1.2, tint(OIL.amber), alpha * 0.7);
  g.strokeCircle(cx, cy, r - 1);
  g.lineStyle(1.6, tint(OIL.rust), alpha * 0.95);
  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * Math.PI * 2;
    g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.fillStyle(tint(OIL.steel), alpha);
  g.fillCircle(cx, cy, r * 0.34);
  g.fillStyle(tint(OIL.chrome), alpha * 0.8);
  g.fillCircle(cx - 0.5, cy - 0.5, r * 0.18);
}

// ── OilAvatar ─────────────────────────────────────────────────────────────

/** Concentric discs of one crude-and-chrome ball hand, outermost first. */
const OIL_AVATAR: AvatarSpec = {
  hands: [
    // Warm halo first: a hand made of near-black crude is invisible on a dark floor without it.
    { r: 9, color: OIL.amber, alpha: 0.24 },
    { r: 6.6, color: OIL.crude, alpha: 0.98 },
    { r: 3.4, color: OIL.sludge, alpha: 0.9 },
    // Iridescent specular up-and-left of centre — the film is what says oil rather than shadow.
    { r: 1.8, color: OIL.teal, alpha: 0.9, ox: -1.9, oy: -1.9 },
  ],
  eyeWhite: OIL.gold,
  eyePupil: OIL.tar,
  // Crude is heavier and stickier than water, so a moving hand smears further and rebounds less.
  squash: { div: 15, x: 0.55, y: 0.3 },
};

/**
 * The oil character rig: a machine that runs on crude and knows it.
 *
 * The torso is a **riveted drum** — banded, dented, with an iridescent slick crawling across the
 * plate and a **pressure gauge** on the chest whose needle climbs with the character's own
 * intensity, over a **valve handwheel** that turns while the gauge is high. **Hydraulic hose
 * arms** run from the shoulder couplings out to the crude ball hands, sagging under their own
 * weight. Above the face, a dented **steel hard hat** with a lamp, and standing out of it a
 * **wellhead** with crude boiling up and running down both sides of the head.
 *
 * Mastery turns the wellhead into a **locomotive**: twin smokestacks where the spout was, a
 * boiler band across the chest, armoured hoses, bolts orbiting the crown, and a gauge that sits
 * in the redline permanently.
 */
export class OilAvatar extends BaseAvatar {
  private fx: OilFx;

  constructor(scene: Phaser.Scene, tint: OilColorFn, depth = 6) {
    super(scene, tint, depth, OIL_AVATAR);
    this.fx = new OilFx(scene, tint);
  }

  /** Where one hose leaves the drum, given the hand it has to reach. */
  private shoulderFor(i: number, x: number, y: number): { x: number; y: number } {
    const ang = Math.atan2(this.armY[i] - y, this.armX[i] - x);
    return { x: x + Math.cos(ang) * 10, y: y + 2 + Math.sin(ang) * 6 };
  }

  /**
   * Whether hand `i` is close enough to the body to plumb a hose to it. The rig lerps its hands
   * from wherever they were last, and on a fighter's first frame that is the world origin — so a
   * hose drawn between body and hand would streak across the arena once. Skip that frame.
   */
  private handSettled(i: number, x: number, y: number): boolean {
    return Math.hypot(this.armX[i] - x, this.armY[i] - y) < 70;
  }

  /**
   * Mastery tell — the wellhead becomes a locomotive. Permanent and silhouette-level, so a
   * mastered oil user is identifiable before they cast anything: white headlamp eyes, a wider
   * corona and a chrome collar on each hand, twin smokestacks instead of the spout, and three
   * bolts orbiting the head. Shape changes, not a tint — a tint alone vanishes at play zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? OIL.white : OIL.gold);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 12.5 : 9);
      halo.setFillStyle(this.tint(on ? OIL.gold : OIL.amber), on ? 0.32 : 0.24);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(OIL.chrome), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands sling crude. */
  protected emitTrail(x: number, y: number): void {
    this.fx.spatter(x, y, 1, { speed: 18, size: 2.2, life: 460, fall: 40, depth: 5 });
  }

  /**
   * A pool of crude the character is standing in, plus a warm rim so the near-black body still
   * separates from the arena floor.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(OIL.tar), a * 0.5 * this.intensity);
    g.fillEllipse(x, y + 6, 60 * this.intensity, 38 * this.intensity);
    g.fillStyle(this.tint(OIL.amber), a * 0.26 * this.intensity);
    g.fillCircle(x, y, 28 * this.intensity);
    g.fillStyle(this.tint(OIL.violet), a * 0.16 * this.intensity);
    g.fillEllipse(x, y + 8, 34 * this.intensity, 14 * this.intensity);
  }

  /**
   * The drum torso: hose arms, banded plate, the slick crawling over it, and the instruments.
   * Painted on the body layer — over the sprite, under the hands and the eyes — so the character
   * is the machine rather than standing in front of one.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const k = this.intensity;
    // Pressure: idle sits low and breathing, a stance buff pins it near the redline.
    const psi = Phaser.Math.Clamp((k - 1) * 1.6 + 0.28 + Math.sin(this.t * 1.7) * 0.06
      + (this.mastered ? 0.42 : 0), 0, 1);

    // ── Hose arms ──
    // First, so the drum plate closes over the shoulder couplings.
    for (let i = 0; i < 2; i++) {
      if (!this.handSettled(i, x, y)) continue;
      const s = this.shoulderFor(i, x, y);
      hoseArm(g, this.tint, s.x, s.y, this.armX[i], this.armY[i], alpha, this.mastered);
    }

    // ── Drum plate ──
    // A barrel, not a box: the sides bow out and the base is wider than the shoulders.
    const drum: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(x - 11, y + 0.5),
      new Phaser.Geom.Point(x + 11, y + 0.5),
      new Phaser.Geom.Point(x + 15, y + 9),
      new Phaser.Geom.Point(x + 13, y + 18),
      new Phaser.Geom.Point(x - 13, y + 18),
      new Phaser.Geom.Point(x - 15, y + 9),
    ];
    g.fillStyle(this.tint(OIL.tar), alpha);
    g.fillPoints(drum, true);
    g.fillStyle(this.tint(OIL.crude), alpha);
    g.fillPoints(drum.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.9, y + (p.y - y) * 0.94)), true);
    // Lit plate down the left, so a near-black barrel still has a form.
    g.fillStyle(this.tint(OIL.sludge), alpha * 0.8);
    g.fillPoints([
      new Phaser.Geom.Point(x - 10, y + 1.4),
      new Phaser.Geom.Point(x - 4, y + 1.4),
      new Phaser.Geom.Point(x - 5.5, y + 16.6),
      new Phaser.Geom.Point(x - 11.6, y + 16.6),
    ], true);

    // ── Iridescent slick ──
    // A band of film crawling across the plate on a slow loop — the reason the drum reads as wet.
    const slick = (this.t * 0.24) % 1;
    for (let i = 0; i < 3; i++) {
      const u = (slick + i / 3) % 1;
      const sy = y + 2 + u * 14;
      g.fillStyle(this.tint(i % 2 === 0 ? OIL.violet : OIL.teal), alpha * 0.16 * (1 - Math.abs(u - 0.5)));
      g.fillEllipse(x + Math.sin(this.t * 0.9 + i * 2) * 3, sy, 22 - u * 5, 3.4);
    }

    // ── Bands and rivets ──
    for (const [by, half] of [[y + 3.4, 13.6], [y + 15.2, 13]] as const) {
      g.fillStyle(this.tint(OIL.steel), alpha * 0.95);
      g.fillRect(x - half, by - 1.6, half * 2, 3.2);
      g.fillStyle(this.tint(OIL.chrome), alpha * 0.55);
      g.fillRect(x - half, by - 1.6, half * 2, 1.1);
      for (let i = 0; i < 5; i++) {
        const rx = x - half + 2.4 + (i / 4) * (half * 2 - 4.8);
        g.fillStyle(this.tint(OIL.chrome), alpha * 0.85);
        g.fillCircle(rx, by, 0.9);
      }
    }

    // ── Instruments ──
    // Gauge high on the chest, handwheel below it turning faster the more pressure is behind it.
    valveWheel(g, this.tint, x + 6.5, y + 12.6, 4.6, this.t * (0.6 + psi * 3.4), alpha * 0.95);
    pressureGauge(g, this.tint, x - 5.4, y + 9.6, 5.2, psi, alpha, this.mastered);
    // Feed pipe from the gauge down into the wheel's stem.
    g.lineStyle(2, this.tint(OIL.steel), alpha * 0.8);
    g.lineBetween(x - 5.4, y + 15, x + 2, y + 12.6);

    // ── Mastery: boiler band and a bleed valve venting steam ──
    if (this.mastered) {
      g.fillStyle(this.tint(OIL.rust), alpha * 0.9);
      g.fillRect(x - 14, y + 8.6, 28, 2);
      g.fillStyle(this.tint(OIL.gold), alpha * (0.4 + 0.3 * Math.sin(this.t * 6)));
      g.fillRect(x - 14, y + 8.6, 28, 0.9);
      for (let i = 0; i < 2; i++) {
        const p = (this.t * 1.4 + i / 2) % 1;
        g.fillStyle(this.tint(OIL.chrome), alpha * 0.22 * (1 - p));
        g.fillCircle(x + 13 + p * 10, y + 6 - p * 8, 2 + p * 5);
      }
    }
  }

  /**
   * The crown rig. Unmastered: a steel wellhead with crude welling out of it and two ropes of
   * oil running down either side, pinching off into drips. Mastered: twin locomotive stacks
   * standing where the spout was, each smoking, with bolts orbiting the head.
   *
   * Rooted at `y - 18` so nothing covers the face, and drawn over the sprite so the chrome and
   * the sheen show rather than only the dark tips clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const lean = Math.cos(this.facing) * 2;

    // ── Hard hat ──
    // A dented steel shell with a brim over the eyes and a lamp on the front. Always present:
    // it is what turns the top of the disc into a head, and its brim frames the face from above
    // the way the wellhead alone never did.
    g.fillStyle(this.tint(OIL.tar), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x - 15 + lean, rootY + 6),
      new Phaser.Geom.Point(x - 12 + lean, rootY - 1),
      new Phaser.Geom.Point(x + 12 + lean, rootY - 1),
      new Phaser.Geom.Point(x + 15 + lean, rootY + 6),
      new Phaser.Geom.Point(x + 11 + lean, rootY + 8),
      new Phaser.Geom.Point(x - 11 + lean, rootY + 8),
    ], true);
    g.fillStyle(this.tint(this.mastered ? OIL.rust : OIL.steel), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x - 12.6 + lean, rootY + 5.4),
      new Phaser.Geom.Point(x - 10 + lean, rootY - 0.2),
      new Phaser.Geom.Point(x + 10 + lean, rootY - 0.2),
      new Phaser.Geom.Point(x + 12.6 + lean, rootY + 5.4),
    ], true);
    // Ridge down the crown and a specular along the left of it.
    g.fillStyle(this.tint(OIL.chrome), alpha * 0.5);
    g.fillRect(x - 1.4 + lean, rootY - 0.6, 2.8, 6);
    g.fillStyle(this.tint(OIL.chrome), alpha * 0.3);
    g.fillPoints([
      new Phaser.Geom.Point(x - 9.4 + lean, rootY + 4.6),
      new Phaser.Geom.Point(x - 7.6 + lean, rootY + 0.4),
      new Phaser.Geom.Point(x - 4.6 + lean, rootY + 0.4),
      new Phaser.Geom.Point(x - 6.6 + lean, rootY + 4.6),
    ], true);
    // Brim over the brow.
    g.fillStyle(this.tint(OIL.tar), alpha);
    g.fillEllipse(x + lean, rootY + 7, 30, 5);
    g.fillStyle(this.tint(OIL.sludge), alpha * 0.9);
    g.fillEllipse(x + lean, rootY + 6.4, 27, 3.4);
    // Lamp, throwing a short cone the way the character is looking.
    const lx = x + lean + Math.cos(this.facing) * 3;
    g.fillStyle(this.tint(OIL.steel), alpha);
    g.fillCircle(lx, rootY + 3.4, 3);
    g.fillStyle(this.tint(OIL.gold), alpha * (0.75 + 0.25 * Math.sin(this.t * 3)));
    g.fillCircle(lx, rootY + 3.4, 1.9);
    g.fillStyle(this.tint(OIL.white), alpha * 0.8);
    g.fillCircle(lx - 0.6, rootY + 2.8, 0.8);
    g.fillStyle(this.tint(OIL.gold), alpha * 0.1);
    g.fillPoints([
      new Phaser.Geom.Point(lx, rootY + 3.4),
      new Phaser.Geom.Point(lx + Math.cos(this.facing - 0.35) * 26, rootY + 3.4 + Math.sin(this.facing - 0.35) * 26),
      new Phaser.Geom.Point(lx + Math.cos(this.facing + 0.35) * 26, rootY + 3.4 + Math.sin(this.facing + 0.35) * 26),
    ], true);

    if (!this.mastered) {
      // Wellhead: a short steel neck with a flange, crude boiling out of the top.
      g.fillStyle(this.tint(OIL.steel), alpha * 0.95);
      g.fillRect(x - 4, rootY - 10, 8, 11);
      g.fillStyle(this.tint(OIL.chrome), alpha * 0.9);
      g.fillRect(x - 6.5, rootY - 12, 13, 3.5);
      g.fillStyle(this.tint(OIL.tar), alpha * 0.9);
      g.fillEllipse(x, rootY - 12, 11, 3.4);

      // Crude welling up out of the head and falling back — three globs on their own loops.
      for (let i = 0; i < 3; i++) {
        const p = this.t * 2.2 + i * 2.1;
        const lift = (9 + Math.sin(p) * 5) * this.intensity;
        const ang = -Math.PI / 2 + (i - 1) * 0.5 + Math.sin(p * 0.8) * 0.15;
        oilGlobLayered(g, this.tint, x, rootY - 12, ang, lift, 5.2, Math.sin(p) * 5, a);
      }

      // Two ropes of oil running down the sides of the head, pinching off at the bottom.
      for (const side of [-1, 1]) {
        const p = (this.t * 0.8 + (side > 0 ? 0.5 : 0)) % 1;
        const rx = x + side * 12;
        oilGlobLayered(g, this.tint, rx, rootY - 6, Math.PI / 2, 12 + p * 12, 3.6, side * 3, a * 0.9);
        if (p > 0.7) {
          g.fillStyle(this.tint(OIL.tar), alpha * 0.85);
          g.fillCircle(rx + side * 3, rootY + 8 + (p - 0.7) * 46, 2.6);
        }
      }
      return;
    }

    // ── Mastered: locomotive stacks ───────────────────────────────────────
    g.fillStyle(this.tint(OIL.crude), alpha * 0.95);
    g.fillRect(x - 13, rootY - 7, 26, 8);
    g.lineStyle(1.6, this.tint(OIL.chrome), alpha * 0.9);
    g.strokeRect(x - 13, rootY - 7, 26, 8);

    for (const side of [-1, 1]) {
      const sx = x + side * 7.5;
      // Tapered stack with a flared cap.
      g.fillStyle(this.tint(OIL.tar), alpha);
      g.beginPath();
      g.moveTo(sx - 3.6, rootY - 6);
      g.lineTo(sx + 3.6, rootY - 6);
      g.lineTo(sx + 2.6, rootY - 22);
      g.lineTo(sx - 2.6, rootY - 22);
      g.closePath(); g.fillPath();
      g.fillStyle(this.tint(OIL.chrome), alpha * 0.9);
      g.fillRect(sx - 4.4, rootY - 25, 8.8, 3.4);
      g.fillStyle(this.tint(OIL.flame), alpha * (0.4 + 0.3 * Math.sin(this.t * 9 + side)));
      g.fillEllipse(sx, rootY - 24, 6, 2.2);

      // Smoke standing out of the stack on a phase loop, so it never stops for a restart.
      for (let i = 0; i < 4; i++) {
        const p = (this.t * 0.9 + i * 0.25 + (side > 0 ? 0.12 : 0)) % 1;
        const puffX = sx + side * p * 9 + Math.sin(p * 6 + i) * 3;
        const puffY = rootY - 26 - p * 26;
        g.fillStyle(this.tint(OIL.tar), alpha * 0.45 * (1 - p));
        g.fillCircle(puffX, puffY, 3 + p * 8);
        g.fillStyle(this.tint(OIL.sludge), alpha * 0.2 * (1 - p));
        g.fillCircle(puffX + 1, puffY - 1, 2 + p * 5);
      }
    }

    // Bolts orbiting the head on a shallow ellipse.
    for (let i = 0; i < 3; i++) {
      const p = this.t * 1.4 + (i / 3) * TAU;
      const cx = x + Math.cos(p) * 22;
      const cy = y - 28 + Math.sin(p) * 6.5;
      g.fillStyle(this.tint(OIL.steel), alpha * 0.9);
      g.beginPath();
      for (let k = 0; k <= 6; k++) {
        const ka = (k / 6) * TAU + p * 2;
        const px = cx + Math.cos(ka) * 4, py = cy + Math.sin(ka) * 4;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fillPath();
      g.fillStyle(this.tint(OIL.chrome), alpha * 0.9);
      g.fillCircle(cx, cy, 1.6);
    }
  }

  /**
   * Oil's own sustained poses. `ride` throws both arms out wide for balance while the barrel
   * runs away underneath; `brace` hauls them in tight behind the turret's shield.
   */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'ride') {
      const bob = Math.sin(this.t * 7 + side * 1.4);
      return {
        ang: this.facing + side * (Math.PI / 2) + bob * 0.14,
        dist: 40 + bob * 4,
        scale: idle.scale * 1.15,
      };
    }
    if (hold === 'brace') {
      const shake = (Math.random() - 0.5) * 0.1;
      return {
        ang: this.holdAngle + side * 0.42 + shake,
        dist: 20 + Math.random() * 2,
        scale: idle.scale * 1.2,
      };
    }
    return null;
  }
}
