import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Water renders: the living-water avatar (ball arms + eyes
 * + a crown fountain), the surf aura, and the one-shot effects every water ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * water water: the ribbon, the palette, and the effects built out of them.
 *
 * Colours must come from the WATER palette below. Water has no skin yet, but
 * every call still routes through the owner's `waterColor` mapper, so the day one lands it is
 * a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.waterColor bound to one owner. */
export type WaterColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const WATER = {
  abyss: 0x00224d,
  deep: 0x00468c,
  ocean: 0x0066bb,
  blue: 0x0088dd,
  bright: 0x22aaee,
  cyan: 0x55ccff,
  sky: 0x88ddff,
  foam: 0xbbeeff,
  pale: 0xddf6ff,
  white: 0xffffff,
} as const;

/**
 * A water ribbon: a thin tail at the root swelling into a fat rounded head at the tip, bent
 * sideways by `curve` — the bend ramping up quadratically so it arcs like something thrown
 * rather than kinking at its root. This is the primitive every water shape is built from:
 * spray droplets, jets, splash crowns, the geyser fountain and the avatar's crown all call it.
 *
 * Note the shape is the inverse of a flame tongue — fire is fat at the root and points away,
 * water is pointed at the root and beads at the leading edge, because surface tension pulls
 * a moving droplet into a head with a trailing filament behind it.
 */
export function waterRibbon(
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

  const waist = at(0.38), shoulder = at(0.74), head = at(0.87), tip = at(1);
  const w1 = halfW * 0.5, w2 = halfW;

  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(waist.x + px * w1, waist.y + py * w1);
  g.lineTo(shoulder.x + px * w2, shoulder.y + py * w2);
  g.lineTo(tip.x, tip.y);
  g.lineTo(shoulder.x - px * w2, shoulder.y - py * w2);
  g.lineTo(waist.x - px * w1, waist.y - py * w1);
  g.closePath();
  g.fillPath();

  // Rounded head, shoulder and waist. Without them the bare polygon reads as a glass shard;
  // water needs the surface tension of a bead at the leading edge to read as a liquid.
  g.fillCircle(head.x, head.y, halfW);
  g.fillCircle(shoulder.x, shoulder.y, halfW * 0.9);
  g.fillCircle(waist.x, waist.y, halfW * 0.5);
}

/** Layered ribbon: deep shell, ocean-blue body, and a foam highlight riding the leading edge. */
export function waterRibbonLayered(
  g: Phaser.GameObjects.Graphics,
  tint: WaterColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, alpha: number,
): void {
  g.fillStyle(tint(WATER.deep), alpha * 0.5);
  waterRibbon(g, cx, cy, angle, len, halfW, curve);
  g.fillStyle(tint(WATER.blue), alpha * 0.85);
  waterRibbon(g, cx, cy, angle, len * 0.95, halfW * 0.7, curve * 0.92);

  // The highlight is rooted a third of the way out instead of at the tail, so the bright
  // band sits on the head where a wet surface would actually catch the light. Nesting it at
  // the root (the way fire does) makes the ribbon glow from within and stops reading as water.
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const f = 0.34;
  const rx = cx + cos * len * f + -sin * curve * f * f;
  const ry = cy + sin * len * f + cos * curve * f * f;
  g.fillStyle(tint(WATER.foam), alpha * 0.7);
  waterRibbon(g, rx, ry, angle, len * 0.55, halfW * 0.38, curve * 0.4);
}

export interface SplashOpts {
  /** Droplets flung outward. Defaults to radius/6. */
  drops?: number;
  /** Rising mist puffs. Defaults to radius/26. */
  mist?: number;
  /** Leave a drying wet mark on the ground. Default true. */
  wet?: boolean;
  /** Render depth of the water body. Default 6. */
  depth?: number;
  /** Total life of the water body in ms. Defaults to scale with radius. */
  duration?: number;
}

export interface SprayOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels of gravity sag over the droplet's life. Negative to make them float upward. */
  fall?: number;
}

// ── WaterFx ───────────────────────────────────────────────────────────────

/**
 * One-shot water effects. Cheap to construct — build one per owner (or per cast, as the
 * ability files do) and hand it the owner's colour mapper.
 */
export class WaterFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: WaterColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding ripple. Only lightly jittered — unlike a blast front, a real ripple front stays
   * smooth, so the wobble here is a slow sine around the ring rather than per-vertex noise.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    // Segment count tracks the radius: a fixed count turns big ripples into visible polygons.
    const segs = Phaser.Math.Clamp(Math.round(toR / 3), 40, 120);
    const phase = Math.random() * TAU;
    const lobes = 3 + Math.floor(Math.random() * 3);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const wob = (1 - t) * 0.035;
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.7)), c, 0.85 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * (1 + Math.sin(a * lobes + phase) * wob);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
  }

  /** Blown-out foam core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, WATER.white, WATER.pale, depth);
  }

  /**
   * A lingering damp mark that dries from the edges in. Deliberately blotchy and short of a
   * full disc — a solid circle reads as a bug, while a ragged wet patch with a couple of
   * beads still catching the light reads as water left behind.
   */
  wetPatch(x: number, y: number, radius: number, depth = 1): void {
    const blots = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.55;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75,
        r: radius * (0.3 + Math.random() * 0.45),
      };
    });
    const beads = Array.from({ length: 4 }, () => {
      const a = Math.random() * TAU;
      const d = radius * (0.2 + Math.random() * 0.5);
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, r: 1.6 + Math.random() * 2.2 };
    });
    this.anim(depth, 2200, (g, t) => {
      const a = (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
      for (const b of blots) {
        g.fillStyle(this.tint(WATER.deep), 0.16 * a);
        g.fillEllipse(b.x, b.y, b.r * 2, b.r * 1.6);
        g.fillStyle(this.tint(WATER.ocean), 0.1 * a);
        g.fillEllipse(b.x, b.y, b.r * 1.2, b.r * 0.9);
      }
      // Beads evaporate first, so the patch dulls before it disappears.
      const bead = Math.max(0, 1 - t * 2.6);
      for (const b of beads) {
        g.fillStyle(this.tint(WATER.sky), 0.5 * bead);
        g.fillCircle(b.x, b.y, b.r * bead);
        g.fillStyle(this.tint(WATER.white), 0.6 * bead * bead);
        g.fillCircle(b.x - b.r * 0.25, b.y - b.r * 0.3, b.r * 0.35 * bead);
      }
    });
  }

  /**
   * Flung droplets. Each one is drawn as a ribbon spanning where it *was* to where it *is*,
   * so a fast spray reads as streaks and a dying one settles into round beads. Gravity sags
   * the arc — the single thing that most separates a water burst from a fire one.
   */
  spray(x: number, y: number, count: number, opts: SprayOpts = {}): void {
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.2;
    const life = opts.life ?? 520;
    const fall = opts.fall ?? 44;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      const v = speed * (0.45 + Math.random() * 0.9);
      return {
        cos: Math.cos(a), sin: Math.sin(a), v,
        r: size * (0.5 + Math.random() * 0.9),
        foam: Math.random() < 0.4,
        delay: Math.random() * 0.18,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const prev = Math.max(0, lt - 0.1);
        const secs = life / 1000;
        const cur = { d: p.v * easeOut(lt) * secs, s: fall * lt * lt };
        const old = { d: p.v * easeOut(prev) * secs, s: fall * prev * prev };
        const ex = x + p.cos * cur.d, ey = y + p.sin * cur.d + cur.s;
        const bx = x + p.cos * old.d, by = y + p.sin * old.d + old.s;
        const stretch = Math.hypot(ex - bx, ey - by);
        const fade = 1 - lt * lt;
        const ang = stretch > 0.4 ? Math.atan2(ey - by, ex - bx) : 0;
        g.fillStyle(this.tint(p.foam ? WATER.foam : WATER.cyan), 0.9 * fade);
        waterRibbon(g, bx, by, ang, stretch + p.r * 1.5, p.r * fade);
        g.fillStyle(this.tint(WATER.white), 0.5 * fade * fade);
        g.fillCircle(ex, ey, p.r * fade * 0.4);
      }
    });
  }

  /** Fine mist that swells and drifts upward — the tail end of a big impact. */
  mist(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.25 + Math.random() * 0.3),
      drift: (Math.random() - 0.5) * 26,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1100, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(WATER.pale), 0.26 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 38 * lt, p.r * (0.6 + lt * 1.2));
        g.fillStyle(this.tint(WATER.sky), 0.12 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 38 * lt, p.r * (0.4 + lt * 0.8));
      }
    });
  }

  /**
   * The heaving body of water at the centre of an impact: overlapping lobes that swell, roll
   * and collapse, capped by a bright foam skin. Reads as volume rather than a flat disc.
   */
  waterDome(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const lobes = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.5,
      off: 0.25 + Math.random() * 0.4,
      r: 0.4 + Math.random() * 0.28,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.35 + easeOut(Math.min(1, t * 1.5)) * 0.8;
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      const wob = t * 8;

      const shell = [
        { c: WATER.deep, s: 1.05, a: 0.5 },
        { c: WATER.ocean, s: 0.86, a: 0.75 },
        { c: WATER.bright, s: 0.6, a: 0.8 },
        { c: WATER.foam, s: 0.32, a: 0.85 },
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
      // Foam skin stretched over the swell, and a white cap while it is still rising.
      g.lineStyle(2.5, this.tint(WATER.pale), 0.5 * fade);
      g.strokeCircle(x, y, radius * grow * 0.95);
      if (t < 0.45) {
        g.fillStyle(this.tint(WATER.white), (1 - t / 0.45) * 0.7);
        g.fillCircle(x, y, radius * grow * 0.2);
      }
    });
  }

  /**
   * Ring of ribbons thrown up and out of a pool — the crown a real splash throws before it
   * falls back. Used wherever water erupts rather than detonates.
   */
  crown(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const seeds = Array.from({ length: petals }, (_, i) => ({
      // Uneven lengths, staggered roots and per-petal delays: petals fired from one point at
      // one length read as a starburst, so every one of these is deliberately out of step.
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.8,
      root: radius * (0.12 + Math.random() * 0.3),
      len: radius * (0.4 + Math.random() * 0.7),
      w: radius * (0.14 + Math.random() * 0.12),
      curve: (Math.random() - 0.5) * radius * 0.5,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 460, (g, t) => {
      // Pool at the base so the petals rise out of something.
      const pool = 1 - easeIn(t);
      g.fillStyle(this.tint(WATER.ocean), 0.4 * pool);
      g.fillCircle(x, y, radius * 0.45 * easeOut(t));
      g.fillStyle(this.tint(WATER.sky), 0.42 * pool);
      g.fillCircle(x, y, radius * 0.28 * easeOut(t));
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        const rx = x + Math.cos(s.ang) * s.root * grow;
        const ry = y + Math.sin(s.ang) * s.root * grow;
        // Petals sag outward as they lose momentum, so the crown falls apart instead of
        // freezing mid-air the way a fixed-angle burst does.
        waterRibbonLayered(
          g, this.tint, rx, ry, s.ang,
          s.len * grow, s.w * (1 - lt * 0.4), s.curve * lt, 0.8 * fade,
        );
      }
    });
    this.ring(x, y, radius * 0.15, radius, WATER.sky, 400, 3, depth);
  }

  /** Foam burst + heaving dome + stacked ripples + crown + droplets + mist + damp mark. */
  splash(x: number, y: number, radius: number, opts: SplashOpts = {}): void {
    const drops = opts.drops ?? Math.round(radius / 6);
    const mistCount = opts.mist ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(320 + radius * 1.5);
    const depth = opts.depth ?? 6;

    if (opts.wet !== false) this.wetPatch(x, y, radius * 0.6);
    this.waterDome(x, y, radius * 0.72, dur, depth);
    this.flash(x, y, radius * 0.34, depth + 1);
    this.crown(x, y, radius * 0.9, Math.max(8, Math.round(radius / 9)), depth);
    this.ring(x, y, radius * 0.2, radius * 1.12, WATER.pale, Math.round(dur * 0.75), 5, depth);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.15, radius * 1.38, WATER.cyan, dur, 4, depth));
    this.scene.time.delayedCall(170, () => this.ring(x, y, radius * 0.1, radius * 1.55, WATER.deep, dur, 3, depth));
    this.spray(x, y, drops, {
      speed: radius * 2.2, size: 3 + radius / 50,
      life: Math.round(dur * 1.4), fall: radius * 0.9, depth,
    });
    if (mistCount > 0) this.mist(x, y, mistCount, radius * 0.85, depth - 2);
  }

  /**
   * Pressurised stream: nested ribbons of unequal length that flap and re-roll every tick, so
   * a held hose churns instead of strobing one fixed triangle. Droplets shear off the edges.
   */
  waterJet(x: number, y: number, angle: number, length: number, depth = 4): void {
    const licks = Array.from({ length: 5 }, (_, i) => ({
      off: (i - 2) * 0.12,
      len: length * (0.62 + Math.random() * 0.45),
      w: 10 + Math.random() * 8,
      curve: (Math.random() - 0.5) * 24,
    }));
    this.anim(depth, 190, (g, t) => {
      const grow = 0.55 + easeOut(t) * 0.55;
      const fade = 1 - easeIn(t);
      for (const l of licks) {
        waterRibbonLayered(
          g, this.tint,
          x + Math.cos(angle + l.off) * 16, y + Math.sin(angle + l.off) * 16,
          angle + l.off, l.len * grow, l.w, l.curve * t, 0.7 * fade,
        );
      }
      // Nozzle bloom where the stream leaves the caster.
      g.fillStyle(this.tint(WATER.pale), 0.5 * fade);
      g.fillCircle(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 10 * grow);
    });
    if (Math.random() < 0.5) {
      this.spray(x + Math.cos(angle) * length * 0.7, y + Math.sin(angle) * length * 0.7, 2,
        { angle, spread: 0.5, speed: 90, size: 2.4, life: 380, fall: 30, depth });
    }
  }

  /** Recoil burst at the nozzle — sells that a shot was actually thrown. */
  muzzleSpray(x: number, y: number, angle: number, scale = 1, depth = 6): void {
    this.anim(depth, 130, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(WATER.pale), 0.75 * fade);
      waterRibbon(g, x, y, angle, 26 * scale * (0.6 + t * 0.9), 8 * scale * fade);
      g.fillStyle(this.tint(WATER.white), 0.8 * fade);
      g.fillCircle(x, y, 5.5 * scale * (1 - t * 0.4));
      // Back-blast: the water shoved sideways as the shot leaves.
      g.fillStyle(this.tint(WATER.cyan), 0.4 * fade);
      waterRibbon(g, x, y, angle + Math.PI * 0.72, 13 * scale * fade, 3.5 * scale * fade);
      waterRibbon(g, x, y, angle - Math.PI * 0.72, 13 * scale * fade, 3.5 * scale * fade);
    });
    this.spray(x, y, 3, { angle, spread: 0.7, speed: 110, size: 2.2, life: 300, fall: 26, depth });
  }

  /**
   * The wake left behind a dash: a tapered channel of displaced water with foam curling off
   * both flanks, plus droplets kicked backward out of the launch point.
   */
  wake(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const puffs = Math.max(3, Math.round(dist / 24));
    this.anim(depth, 400, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < puffs; i++) {
        const f = i / (puffs - 1 || 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        // Wake is fattest at the start and drains off from the back forward.
        const local = Math.max(0, fade - f * 0.35);
        const r = (5 + (1 - f) * 11) * local;
        if (r <= 0) continue;
        g.fillStyle(this.tint(WATER.deep), 0.45 * local);
        g.fillCircle(px, py, r * 1.3);
        g.fillStyle(this.tint(WATER.blue), 0.6 * local);
        g.fillCircle(px, py, r);
        // Foam flares out sideways behind the runner — the V of a boat wake.
        const spreadOut = (6 + f * 20) * local;
        for (const s of [1, -1]) {
          g.fillStyle(this.tint(WATER.foam), 0.55 * local);
          waterRibbon(
            g, px, py, angle + s * (Math.PI / 2), spreadOut, 2.6 * local,
            s * 5 * f,
          );
        }
      }
    });
    this.spray(x1, y1, 9, { angle: angle + Math.PI, spread: 0.9, speed: 150, size: 3, life: 480, fall: 50, depth });
    this.ring(x1, y1, 6, 46, WATER.pale, 380, 3, depth);
  }

  /**
   * Inward-spiralling gather: water drawn from the rim toward a compressing core while a
   * containment ring squeezes shut. `follow` lets it track a moving caster during a channel.
   */
  channelVortex(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streams = Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * TAU,
      spin: 1.6 + Math.random() * 1.4,
      phase: Math.random(),
      len: 0.3 + Math.random() * 0.3,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 30) * 0.15;

      // Streams fall in from the rim, orbiting faster as the pressure builds.
      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(WATER.cyan), 0.7 * (1 - lt * 0.6));
        waterRibbon(
          g,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r,
          a + Math.PI * 0.72, r * s.len, 2.6 * (1 - lt),
          r * 0.2,
        );
      }

      // Compressing core.
      const cr = radius * (0.08 + easeIn(t) * 0.32) * pulse;
      g.fillStyle(this.tint(WATER.deep), 0.5);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(WATER.ocean), 0.75);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(WATER.sky), 0.85);
      g.fillCircle(cx, cy, cr * 0.55);
      g.fillStyle(this.tint(WATER.white), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.22);

      // Containment ring closing in.
      g.lineStyle(3, this.tint(WATER.foam), 0.45 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /**
   * Column of water punching upward, spreading into a cap at its top and raining back down.
   * Kept to a few broad ribbons: thin ones read as scratches over the dome beneath.
   */
  waterSpout(x: number, y: number, radius: number, height: number, depth = 7): void {
    const jets = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.42,
      h: height * (0.7 + Math.random() * 0.4),
      w: radius * (0.4 + Math.random() * 0.22),
      sway: (Math.random() - 0.5) * radius * 0.4,
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 760, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Boiling throat at the base, so the column looks anchored in the water below.
      g.fillStyle(this.tint(WATER.pale), 0.5 * fade);
      g.fillEllipse(x, y, radius * 1.5, radius * 0.7);
      for (const j of jets) {
        const rise = easeOut(Math.max(0, (t - j.delay) / (1 - j.delay)));
        waterRibbonLayered(
          g, this.tint,
          x + j.ox, y + radius * 0.2,
          -Math.PI / 2, j.h * rise, j.w * (1 - t * 0.3),
          j.sway * rise + Math.sin(t * 7 + j.phase) * 7, 0.85 * fade,
        );
      }
      // Cap of spray blown off the top once the column tops out.
      if (t > 0.3) {
        const cap = (t - 0.3) / 0.7;
        g.fillStyle(this.tint(WATER.foam), 0.45 * fade);
        g.fillEllipse(x, y - height * 0.9, radius * (1.4 + cap * 2.4), radius * (0.5 + cap * 0.9));
      }
    });
    this.spray(x, y - height * 0.5, 9, {
      speed: radius * 1.2, spread: 0.9, angle: -Math.PI / 2,
      size: 3.6, life: 800, fall: height * 0.8, depth,
    });
  }

  /**
   * The cheap per-drop impact used by Pain Rain: one animation covering a small crown, a
   * ripple and a handful of beads. Two hundred of these run at once, so it deliberately does
   * everything inside a single Graphics rather than composing the full `splash` stack.
   */
  dropImpact(x: number, y: number, radius: number, depth = 8): void {
    const petals = Array.from({ length: 6 }, (_, i) => ({
      ang: (i / 6) * TAU + Math.random() * 0.6,
      len: radius * (0.35 + Math.random() * 0.45),
      w: radius * 0.11,
    }));
    this.anim(depth, 320, (g, t) => {
      const fade = 1 - easeIn(t);
      const grow = easeOut(t);
      // Ripple front.
      g.lineStyle(3 * fade, this.tint(WATER.pale), 0.8 * fade);
      g.strokeCircle(x, y, radius * (0.2 + grow * 1.0));
      g.lineStyle(2 * fade, this.tint(WATER.cyan), 0.5 * fade);
      g.strokeCircle(x, y, radius * (0.1 + grow * 0.6));
      // Pool and crown.
      g.fillStyle(this.tint(WATER.ocean), 0.5 * fade);
      g.fillCircle(x, y, radius * 0.32 * (1 - t * 0.4));
      for (const p of petals) {
        g.fillStyle(this.tint(WATER.foam), 0.8 * fade);
        waterRibbon(g, x, y, p.ang, p.len * grow, p.w * fade, 0);
      }
      g.fillStyle(this.tint(WATER.white), 0.85 * (1 - Math.min(1, t * 2.5)));
      g.fillCircle(x, y, radius * 0.16);
    });
  }

  /**
   * The falling-drop marker Pain Rain leaves on the ground before impact, painted into a
   * caller-owned Graphics because there is one per drop and animating 200 tweens would cost
   * more than the effect is worth. Reads as a targeting reticle made of water rings.
   */
  static drawRainMarker(
    g: Phaser.GameObjects.Graphics, tint: WaterColorFn,
    x: number, y: number, radius: number,
  ): void {
    g.fillStyle(tint(WATER.abyss), 0.4);
    g.fillEllipse(x, y, radius * 2, radius * 1.5);
    g.lineStyle(1.5, tint(WATER.cyan), 0.75);
    g.strokeCircle(x, y, radius);
    g.lineStyle(1, tint(WATER.sky), 0.5);
    g.strokeCircle(x, y, radius * 0.55);
    // Four ticks around the rim, so the marker reads as aimed rather than as a stray blob.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      g.lineStyle(1.5, tint(WATER.foam), 0.7);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * radius * 0.85, y + Math.sin(a) * radius * 0.85);
      g.lineTo(x + Math.cos(a) * radius * 1.3, y + Math.sin(a) * radius * 1.3);
      g.strokePath();
    }
    // The drop itself, hanging above the mark.
    g.fillStyle(tint(WATER.blue), 0.9);
    waterRibbon(g, x, y - radius * 2.4, Math.PI / 2, radius * 1.1, radius * 0.34);
    g.fillStyle(tint(WATER.white), 0.7);
    g.fillCircle(x - radius * 0.12, y - radius * 1.6, radius * 0.14);
  }

  /**
   * A living pool of water: rippling surface, foam rim and drifting highlights. Painted into
   * a caller-owned Graphics so the kit can repaint every puddle it owns in one pass.
   */
  static drawPool(
    g: Phaser.GameObjects.Graphics, tint: WaterColorFn,
    x: number, y: number, radius: number, t: number, alpha: number, seed: number,
  ): void {
    // Rim wobbles on two out-of-phase sine lobes; a true circle reads as a UI decal.
    const segs = Phaser.Math.Clamp(Math.round(radius / 2.2), 24, 64);
    const rim = (rr: number, wob: number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const r = rr * (1 + Math.sin(a * 3 + t * 1.4 + seed) * wob + Math.sin(a * 5 - t * 0.9 + seed) * wob * 0.6);
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    g.fillStyle(tint(WATER.deep), 0.5 * alpha);
    rim(radius, 0.045); g.fillPath();
    g.fillStyle(tint(WATER.ocean), 0.55 * alpha);
    rim(radius * 0.86, 0.05); g.fillPath();
    g.fillStyle(tint(WATER.blue), 0.4 * alpha);
    rim(radius * 0.6, 0.07); g.fillPath();

    g.lineStyle(2, tint(WATER.foam), 0.55 * alpha);
    rim(radius * 0.98, 0.045); g.strokePath();

    // Surface glints drifting across the pool.
    for (let i = 0; i < 3; i++) {
      const a = t * (0.5 + i * 0.22) + seed + i * 2.1;
      const d = radius * (0.2 + 0.42 * ((i + 1) / 4));
      const gx = x + Math.cos(a) * d;
      const gy = y + Math.sin(a) * d * 0.8;
      g.fillStyle(tint(WATER.pale), 0.4 * alpha);
      g.fillEllipse(gx, gy, radius * 0.3, radius * 0.09);
    }
  }
}

// ── WaterSurf ─────────────────────────────────────────────────────────────

/**
 * Persistent ring of surging water around a fighter (Slipstream, geyser boost). Driven by
 * whoever owns it — call `update` every frame with the fighter's position.
 */
export class WaterSurf {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private dropAccum = 0;
  private ribbons: { ang: number; len: number; w: number; speed: number; phase: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: WaterColorFn,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 10,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.ribbons = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.7 + Math.random() * 0.6,
      w: 0.13 + Math.random() * 0.08,
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

    const spin = this.t * 1.1;
    const glow = 0.2 * this.intensity * alpha;
    g.fillStyle(this.tint(WATER.ocean), glow);
    g.fillCircle(x, y, this.radius * (0.92 + Math.sin(this.t * 4) * 0.05));

    for (const r of this.ribbons) {
      const wob = Math.sin(this.t * r.speed + r.phase);
      const len = this.radius * r.len * (0.8 + wob * 0.28) * this.intensity;
      const ang = r.ang + spin + wob * 0.1;
      waterRibbonLayered(
        g, this.tint,
        x + Math.cos(ang) * this.radius * 0.5, y + Math.sin(ang) * this.radius * 0.5,
        ang, len, this.radius * r.w, wob * this.radius * 0.3,
        0.6 * alpha,
      );
    }

    // Occasional droplet flung off the surge.
    this.dropAccum += delta;
    const interval = 260 / Math.max(0.4, this.intensity);
    if (this.dropAccum >= interval) {
      this.dropAccum = 0;
      new WaterFx(this.scene, this.tint).spray(
        x + (Math.random() - 0.5) * this.radius * 1.3,
        y + (Math.random() - 0.5) * this.radius * 0.8,
        1, { speed: 30, size: 2.6, life: 700, fall: 40, depth: 4 },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── WaterAvatar ───────────────────────────────────────────────────────────

/** Concentric discs of one liquid ball hand, outermost first. */
const WATER_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: WATER.ocean, alpha: 0.3 },
    { r: 6.4, color: WATER.blue, alpha: 0.92 },
    { r: 3.6, color: WATER.cyan, alpha: 1 },
    // Glint sits up-and-left of centre: a wet sphere reads as wet only if the specular
    // highlight is off-axis. Dead centre and it looks like a glowing bulb instead.
    { r: 1.6, color: WATER.white, alpha: 0.95, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: WATER.pale,
  eyePupil: WATER.abyss,
  // A liquid hand stretches more than a solid one.
  squash: { div: 13, x: 0.6, y: 0.34 },
};

/**
 * The water character rig: two liquid ball hands, a pair of eyes, and a fountain playing off
 * the crown that arcs over and drips. The hands, eyes and gestures come from BaseAvatar; what
 * water adds is the wet sheen beneath and the fountain above.
 */
export class WaterAvatar extends BaseAvatar {
  private fx: WaterFx;

  constructor(scene: Phaser.Scene, tint: WaterColorFn, depth = 6) {
    super(scene, tint, depth, WATER_AVATAR);
    this.fx = new WaterFx(scene, tint);
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself so a mastered water
   * user is identifiable at a glance, before they cast anything: pale-white eyes, a wider
   * halo and foam ring on each hand, a taller fountain, and a tide of droplets orbiting the
   * head. Shape changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? WATER.white : WATER.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 12.5 : 9);
      halo.setFillStyle(this.tint(on ? WATER.cyan : WATER.ocean), on ? 0.34 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(WATER.foam), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed droplets. */
  protected emitTrail(x: number, y: number): void {
    this.fx.spray(x, y, 1, { speed: 20, size: 2.2, life: 420, fall: 34, depth: 5 });
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(WATER.ocean), a * 0.28 * this.intensity);
    g.fillEllipse(x, y + 4, 56 * this.intensity, 40 * this.intensity);
    g.fillStyle(this.tint(WATER.bright), a * 0.14 * this.intensity);
    g.fillEllipse(x, y + 6, 34 * this.intensity, 22 * this.intensity);
  }

  /**
   * Water playing off the top of the head: three jets that rise, arc over under gravity and
   * shed a droplet at the end of each fall. Rooted at the crown (y - 18) so it never covers
   * the face, and drawn over the sprite so the bright middles show rather than dark tips.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const mastery = this.mastered ? 1.35 : 1;
    const rootY = y - 18;

    for (let i = 0; i < 3; i++) {
      const side = i - 1;
      const p = this.t * 2.6 + i * 1.9;
      const lift = (20 + Math.sin(p) * 5) * this.intensity * mastery;
      const outward = side * (15 + Math.sin(p * 0.8) * 3.5);

      // Rising leg of the jet. Fat and well spread — three narrow jets rooted at one point
      // merge into a single spiky clump and read as a crown of thorns rather than water.
      waterRibbonLayered(
        g, this.tint, x + side * 7, rootY,
        -Math.PI / 2 + side * 0.34, lift, 6.4 * mastery, outward * 0.7, a * 0.95,
      );
      // Falling leg, arcing outward and back down — this is the half that makes it read as a
      // fountain rather than as a static plume standing on end.
      const fallAng = Math.PI / 2 + side * 0.85;
      const apexX = x + side * 7 + outward * 0.8;
      const apexY = rootY - lift;
      waterRibbonLayered(
        g, this.tint, apexX, apexY,
        fallAng, lift * 0.8, 4.2 * mastery, outward * 1.3, a * 0.8,
      );
      // The bead about to break off the end of the fall.
      const dropT = (this.t * 1.4 + i * 0.33) % 1;
      const dx = apexX + Math.cos(fallAng) * lift * 0.8 + outward * 1.3;
      const dy = apexY + Math.sin(fallAng) * lift * 0.8 + dropT * 14;
      g.fillStyle(this.tint(WATER.sky), alpha * 0.8 * (1 - dropT));
      waterRibbon(g, dx, dy - 5, Math.PI / 2, 6, 2.4 * (1 - dropT * 0.5));
    }

    // Mastery tide: four droplets circling the head on a shallow ellipse, each stretched
    // along its own orbit so the crown reads as water in motion, not as beads on a wire.
    if (this.mastered) {
      for (let i = 0; i < 4; i++) {
        const p = this.t * 1.6 + (i / 4) * TAU;
        const cx = x + Math.cos(p) * 22;
        const cy = y - 28 + Math.sin(p) * 6.5;
        const tangent = Math.atan2(Math.cos(p) * 6.5, -Math.sin(p) * 22);
        g.fillStyle(this.tint(WATER.ocean), alpha * 0.5);
        waterRibbon(g, cx, cy, tangent, 11, 3.4);
        g.fillStyle(this.tint(WATER.cyan), alpha * 0.9);
        waterRibbon(g, cx, cy, tangent, 8, 2.2);
        g.fillStyle(this.tint(WATER.white), alpha * 0.85);
        g.fillCircle(cx + Math.cos(tangent) * 6, cy + Math.sin(tangent) * 6, 1.3);
      }
    }
  }
}
