import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Crystal renders: the gem avatar (ball arms + eyes + a crown
 * of prisms), the halo aura, and the one-shot effects every crystal ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * crystal crystal: the prism, the palette, and the effects built out of them.
 *
 * Colours must come from the CRYSTAL palette below. Crystal has no colour-slot cosmetic yet, but
 * every call still routes through the owner's `crystalColor` mapper, so the day one lands it is
 * a table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.crystalColor bound to one owner. */
export type CrystalColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const CRYSTAL = {
  onyx: 0x0d1a2a,
  slate: 0x1a3350,
  azure: 0x2b6ea8,
  sky: 0x66bbdd,
  glass: 0x88ccff,
  prism: 0x88eeff,
  shine: 0xaaeeff,
  pale: 0xd8f4ff,
  white: 0xffffff,
  /** Refraction fringes — the split light a real prism throws. */
  violet: 0xaa44ff,
  orchid: 0xcc88ff,
  rose: 0xeeccff,
  magenta: 0xff44aa,
  gold: 0xffcc44,
  flare: 0xffee88,
  /** The NPC's lattice reads duller so two crystal fighters never blur together. */
  dull: 0x99ccee,
} as const;

/** One coherent set of shades. `shell → body → facet → lit` runs dark to bright. */
export interface CrystalTones {
  shell: number;
  body: number;
  facet: number;
  lit: number;
  spark: number;
  /** The two halves of the refraction fringe. */
  fringeA: number;
  fringeB: number;
}

export const CLEAR_TONES: CrystalTones = {
  shell: CRYSTAL.slate, body: CRYSTAL.azure, facet: CRYSTAL.glass,
  lit: CRYSTAL.prism, spark: CRYSTAL.white, fringeA: CRYSTAL.violet, fringeB: CRYSTAL.gold,
};
export const NPC_TONES: CrystalTones = {
  shell: CRYSTAL.onyx, body: CRYSTAL.slate, facet: CRYSTAL.dull,
  lit: CRYSTAL.shine, spark: CRYSTAL.pale, fringeA: CRYSTAL.orchid, fringeB: CRYSTAL.sky,
};
/** R+ Lattice Lace: an attuned lattice runs violet so the state is readable at a glance. */
export const ATTUNED_TONES: CrystalTones = {
  shell: 0x2a0d40, body: CRYSTAL.violet, facet: CRYSTAL.orchid,
  lit: CRYSTAL.rose, spark: CRYSTAL.white, fringeA: CRYSTAL.magenta, fringeB: CRYSTAL.prism,
};

export const tonesFor = (owner: 'player' | 'npc'): CrystalTones =>
  (owner === 'player' ? CLEAR_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A cut prism: a symmetric elongated hexagon — point, girdle, table, girdle, point.
 *
 * This is deliberately the opposite of the ice shard, which is asymmetric and organically
 * cleaved. Crystal is *cut*: every face is flat, every angle is repeated, and the silhouette is
 * mirror-symmetric. That precision is the whole read of the element, so the shape refuses the
 * jitter that every other primitive in the game leans on.
 *
 * `cut` slides the girdle along the shaft — low values give a long sharp lance, high values a
 * squat gem.
 */
export function crystalPrism(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  cut = 0.3,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number, w: number): [number, number] => [
    cx + cos * len * f + px * w,
    cy + sin * len * f + py * w,
  ];
  const pts: [number, number][] = [
    at(0, 0),
    at(cut, halfW),
    at(1 - cut, halfW),
    at(1, 0),
    at(1 - cut, -halfW),
    at(cut, -halfW),
  ];
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillPath();
}

export interface PrismLayerOpts {
  /** Girdle facet lines across the body. Default true. */
  facets?: boolean;
  /** Chromatic fringe offset in pixels. 0 disables it. Default 1.6. */
  fringe?: number;
  cut?: number;
}

/**
 * Layered prism: a chromatic fringe split off both flanks, a dark shell, a glass body, a bright
 * inner table, girdle lines and a hard specular along the lit edge.
 *
 * The fringe is the point. A prism's job is to split light, so every crystal shape carries a
 * violet ghost on one side and a gold ghost on the other. Without it the element is just blue
 * triangles.
 */
export function crystalPrismLayered(
  g: Phaser.GameObjects.Graphics,
  tint: CrystalColorFn, tones: CrystalTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  opts: PrismLayerOpts = {},
): void {
  const cut = opts.cut ?? 0.3;
  const fringe = opts.fringe ?? 1.6;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;

  if (fringe > 0) {
    g.fillStyle(tint(tones.fringeA), alpha * 0.4);
    crystalPrism(g, cx + px * fringe, cy + py * fringe, angle, len, halfW, cut);
    g.fillStyle(tint(tones.fringeB), alpha * 0.4);
    crystalPrism(g, cx - px * fringe, cy - py * fringe, angle, len, halfW, cut);
  }

  g.fillStyle(tint(tones.shell), alpha * 0.85);
  crystalPrism(g, cx, cy, angle, len, halfW, cut);
  g.fillStyle(tint(tones.body), alpha * 0.9);
  crystalPrism(g, cx, cy, angle, len * 0.96, halfW * 0.78, cut);
  g.fillStyle(tint(tones.facet), alpha * 0.85);
  crystalPrism(g, cx, cy, angle, len * 0.86, halfW * 0.42, cut);

  if (opts.facets !== false) {
    // Girdle lines: the two hard breaks that make the body read as cut rather than moulded.
    g.lineStyle(1.1, tint(tones.lit), alpha * 0.75);
    for (const f of [cut, 1 - cut]) {
      g.beginPath();
      g.moveTo(cx + cos * len * f + px * halfW, cy + sin * len * f + py * halfW);
      g.lineTo(cx + cos * len * f - px * halfW, cy + sin * len * f - py * halfW);
      g.strokePath();
    }
  }

  // Specular along one flank only — outlining the whole prism flattens it to a decal.
  g.lineStyle(1.4, tint(tones.spark), alpha * 0.8);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + cos * len * cut + px * halfW, cy + sin * len * cut + py * halfW);
  g.lineTo(cx + cos * len * (1 - cut) + px * halfW, cy + sin * len * (1 - cut) + py * halfW);
  g.lineTo(cx + cos * len, cy + sin * len);
  g.strokePath();
}

export interface ShatterOpts {
  /** Prisms flung out of the break. Defaults to radius/6. */
  shards?: number;
  /** Glittering dust. Defaults to radius/22. */
  dust?: number;
  /** Leave a scattering of splinters on the ground. Default true. */
  splinter?: boolean;
  depth?: number;
  duration?: number;
  tones?: CrystalTones;
}

export interface ShardBurstOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  fall?: number;
  tones?: CrystalTones;
}

// ── CrystalFx ─────────────────────────────────────────────────────────────

/**
 * One-shot crystal effects. Cheap to construct — build one per owner (or per cast, as the
 * ability files do) and hand it the owner's colour mapper.
 */
export class CrystalFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: CrystalColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding refraction front, drawn as a perfect polygon with a chromatic double a beat
   * behind it. Crystal fronts do not wobble — the whole element trades on precision, so the
   * ring is regular and the *colour* does the moving instead.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 4), 24, 90);
    const poly = (g: Phaser.GameObjects.Graphics, r: number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    };
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const lag = fromR + (toR - fromR) * easeOut(Math.max(0, t - 0.12));
      g.lineStyle(Math.max(0.5, width * 0.5 * (1 - t * 0.7)), this.tint(CRYSTAL.violet), 0.45 * (1 - t * t));
      poly(g, lag * 1.03);
      g.lineStyle(Math.max(0.5, width * 0.5 * (1 - t * 0.7)), this.tint(CRYSTAL.gold), 0.45 * (1 - t * t));
      poly(g, lag * 0.97);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.7)), c, 0.85 * (1 - t * t));
      poly(g, r);
    });
  }

  /** Blown-out white core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: CrystalTones = CLEAR_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.lit, depth);
  }

  /**
   * A lens-flare star: four long spikes, four short ones, a chromatic halo and a hot pip.
   * This is crystal's signature effect — it is what light hitting a cut face actually does, and
   * it is the cheapest way to say "gem" without drawing a gem.
   */
  glint(x: number, y: number, size: number, depth = 9, tones: CrystalTones = CLEAR_TONES, spin = 0): void {
    this.anim(depth, 280, (g, t) => {
      const grow = t < 0.25 ? easeOut(t / 0.25) : 1 - easeIn((t - 0.25) / 0.75);
      const s = size * grow;
      if (s <= 0.4) return;

      // Chromatic halo behind the star.
      g.fillStyle(this.tint(tones.fringeA), 0.22 * grow);
      g.fillCircle(x - 1.5, y, s * 0.5);
      g.fillStyle(this.tint(tones.fringeB), 0.22 * grow);
      g.fillCircle(x + 1.5, y, s * 0.5);

      for (let i = 0; i < 8; i++) {
        const a = spin + (i / 8) * TAU;
        const long = i % 2 === 0;
        g.fillStyle(this.tint(long ? tones.spark : tones.lit), (long ? 0.9 : 0.55) * grow);
        crystalPrism(g, x, y, a, s * (long ? 1 : 0.42), s * (long ? 0.07 : 0.05), 0.15);
      }
      g.fillStyle(this.tint(tones.spark), 0.95 * grow);
      g.fillCircle(x, y, s * 0.1);
    });
  }

  /**
   * A scattering of splinters left on the ground that catch the light and then dim out. Stands
   * in for the scorch/stain every other element leaves — crystal doesn't stain, it litters.
   */
  splinters(x: number, y: number, radius: number, depth = 1, tones: CrystalTones = CLEAR_TONES): void {
    const bits = Array.from({ length: 11 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.8;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75,
        ang: Math.random() * TAU,
        len: radius * (0.1 + Math.random() * 0.16),
        w: radius * 0.03,
        twinkle: Math.random() * TAU,
      };
    });
    this.anim(depth, 2200, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      for (const b of bits) {
        g.fillStyle(this.tint(tones.body), 0.7 * a);
        crystalPrism(g, b.x, b.y, b.ang, b.len, b.w, 0.28);
        // Each splinter catches the light on its own beat.
        const tw = Math.max(0, Math.sin(t * 9 + b.twinkle));
        g.fillStyle(this.tint(tones.spark), 0.8 * a * tw);
        crystalPrism(g, b.x, b.y, b.ang, b.len * 0.5, b.w * 0.5, 0.28);
      }
    });
  }

  /** Flung debris: prisms tumbling end over end and sinking under gravity. */
  shards(x: number, y: number, count: number, opts: ShardBurstOpts = {}): void {
    const tones = opts.tones ?? CLEAR_TONES;
    const speed = opts.speed ?? 140;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 540;
    const fall = opts.fall ?? 38;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.45 + Math.random() * 0.9),
        r: size * (0.55 + Math.random() * 0.85),
        spin: (Math.random() - 0.5) * 16,
        spin0: Math.random() * TAU,
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
        crystalPrismLayered(g, this.tint, tones, ex, ey, ang, p.r * 3.4 * fade, p.r * fade, 0.9 * fade,
          { facets: false, fringe: 1 });
      }
    });
  }

  /** Glittering dust that hangs, twinkles and drifts. */
  dust(x: number, y: number, count: number, radius: number, depth = 4, tones: CrystalTones = CLEAR_TONES): void {
    const motes = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.4,
      oy: (Math.random() - 0.5) * radius * 1.1,
      drift: (Math.random() - 0.5) * 24,
      r: 1.2 + Math.random() * 2,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1200, (g, t) => {
      for (const m of motes) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const cx = x + m.ox + m.drift * lt;
        const cy = y + m.oy - 18 * lt;
        const tw = Math.max(0, Math.sin(t * 14 + m.phase));
        g.fillStyle(this.tint(tones.lit), 0.5 * (1 - lt));
        g.fillCircle(cx, cy, m.r);
        g.fillStyle(this.tint(tones.spark), 0.9 * (1 - lt) * tw);
        crystalPrism(g, cx - m.r * 2 * tw, cy, 0, m.r * 4 * tw, m.r * 0.25, 0.2);
        crystalPrism(g, cx, cy - m.r * 2 * tw, Math.PI / 2, m.r * 4 * tw, m.r * 0.25, 0.2);
      }
    });
  }

  /**
   * The body of a shatter: a rosette of prisms that grows out of the impact point, holds, and
   * then flies apart. Reads as a mass of cut stone rather than as a disc being scaled.
   */
  prismBloom(x: number, y: number, radius: number, duration: number, depth = 6, tones: CrystalTones = CLEAR_TONES): void {
    const spikes = Array.from({ length: 12 }, (_, i) => ({
      // Regularly spaced by design — a crystal rosette that grew crooked reads as a mistake.
      ang: (i / 12) * TAU,
      len: 0.6 + (i % 3) * 0.16,
      w: 0.11 + (i % 2) * 0.04,
      delay: (i % 4) * 0.05,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const core = easeOut(Math.min(1, t * 3.5));
      g.fillStyle(this.tint(tones.shell), 0.7 * fade);
      g.fillCircle(x, y, radius * 0.4 * core);
      g.fillStyle(this.tint(tones.body), 0.75 * fade);
      g.fillCircle(x, y, radius * 0.26 * core);

      for (const s of spikes) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(Math.min(1, lt * 2.3));
        const drift = radius * 0.28 * easeIn(lt);
        crystalPrismLayered(
          g, this.tint, tones,
          x + Math.cos(s.ang) * drift, y + Math.sin(s.ang) * drift, s.ang,
          radius * s.len * grow, radius * s.w * (1 - lt * 0.3), 0.92 * fade,
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.4) * 0.85);
        g.fillCircle(x, y, radius * 0.16);
      }
    });
  }

  /** White core + prism rosette + chromatic fronts + tumbling debris + dust + splinters. */
  shatter(x: number, y: number, radius: number, opts: ShatterOpts = {}): void {
    const tones = opts.tones ?? CLEAR_TONES;
    const debris = opts.shards ?? Math.max(6, Math.round(radius / 6));
    const dustCount = opts.dust ?? Math.round(radius / 22);
    const dur = opts.duration ?? Math.round(330 + radius * 1.4);
    const depth = opts.depth ?? 6;

    if (opts.splinter !== false) this.splinters(x, y, radius * 0.6, 1, tones);
    this.prismBloom(x, y, radius * 0.68, dur, depth, tones);
    this.flash(x, y, radius * 0.3, depth + 1, tones);
    this.glint(x, y, radius * 1.1, depth + 2, tones);
    this.ring(x, y, radius * 0.2, radius * 1.1, tones.lit, Math.round(dur * 0.75), 5, depth);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.15, radius * 1.35, tones.facet, dur, 4, depth));
    this.shards(x, y, debris, {
      speed: radius * 2.1, size: 3 + radius / 50,
      life: Math.round(dur * 1.4), fall: radius * 0.7, depth, tones,
    });
    if (dustCount > 0) this.dust(x, y, dustCount, radius * 0.9, depth - 2, tones);
  }

  /**
   * A refracted path: the bright line a beam takes, split into its violet and gold halves along
   * the way, with a glint at each end. Used for portal redirects and mirror deflections, so a
   * shot that changed direction is legible instead of teleporting.
   */
  refract(x1: number, y1: number, x2: number, y2: number, depth = 8, tones: CrystalTones = CLEAR_TONES): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(angle), py = Math.cos(angle);
    this.anim(depth, 260, (g, t) => {
      const fade = 1 - easeIn(t);
      // The split widens as the light travels, which is what a prism actually does.
      const split = 1 + t * 3.5;
      g.lineStyle(2.5 * fade, this.tint(tones.fringeA), 0.55 * fade);
      g.lineBetween(x1 + px * split, y1 + py * split, x2 + px * split, y2 + py * split);
      g.lineStyle(2.5 * fade, this.tint(tones.fringeB), 0.55 * fade);
      g.lineBetween(x1 - px * split, y1 - py * split, x2 - px * split, y2 - py * split);
      g.lineStyle(4 * fade, this.tint(tones.lit), 0.8 * fade);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(1.4 * fade, this.tint(tones.spark), 0.95 * fade);
      g.lineBetween(x1, y1, x2, y2);
    });
    this.glint(x1, y1, 26, depth + 1, tones);
    this.glint(x2, y2, 22, depth + 1, tones);
  }

  /** Recoil facet at the throwing hand — sells that a shot actually left a body. */
  muzzlePrism(x: number, y: number, angle: number, scale = 1, depth = 6, tones: CrystalTones = CLEAR_TONES): void {
    this.anim(depth, 140, (g, t) => {
      const fade = 1 - t;
      crystalPrismLayered(g, this.tint, tones, x, y, angle,
        28 * scale * (0.6 + t * 0.9), 7 * scale * fade, 0.8 * fade, { facets: false });
      g.fillStyle(this.tint(tones.spark), 0.9 * fade);
      g.fillCircle(x, y, 4.5 * scale * (1 - t * 0.4));
      for (const s of [1, -1]) {
        g.fillStyle(this.tint(s > 0 ? tones.fringeA : tones.fringeB), 0.5 * fade);
        crystalPrism(g, x, y, angle + s * Math.PI * 0.72, 14 * scale * fade, 3 * scale * fade, 0.25);
      }
    });
    this.glint(x, y, 22 * scale, depth + 1, tones, angle);
  }

  /**
   * The trail carved by a teleport or a dash: a corridor of prisms strung along the path that
   * catch the light in sequence, plus a burst at each end.
   */
  translate(x1: number, y1: number, x2: number, y2: number, depth = 5, tones: CrystalTones = CLEAR_TONES): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Phaser.Math.Clamp(Math.round(dist / 26), 3, 20);
    this.anim(depth, 420, (g, t) => {
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        // A wave of light runs along the corridor from the entry point to the exit.
        const local = Phaser.Math.Clamp(1 - Math.abs(t * 1.6 - f) * 3, 0, 1);
        if (local <= 0) continue;
        const cx = x1 + (x2 - x1) * f;
        const cy = y1 + (y2 - y1) * f;
        crystalPrismLayered(g, this.tint, tones, cx, cy, angle + Math.PI / 2,
          22 * local, 5 * local, 0.75 * local, { facets: false });
      }
    });
    this.glint(x1, y1, 34, depth + 2, tones);
    this.glint(x2, y2, 40, depth + 2, tones);
    this.ring(x2, y2, 6, 46, tones.lit, 380, 3, depth);
  }

  /** Ignition burst for a summon or a toggle: prisms locking into place around a body. */
  bloom(x: number, y: number, radius: number, count = 10, depth = 5, tones: CrystalTones = CLEAR_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      delay: (i % 3) * 0.06,
    }));
    this.anim(depth, 460, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        // Facets fly *inward* and lock, so a shell reads as assembled rather than exploded.
        const d = radius * (1.5 - easeOut(lt) * 0.75);
        crystalPrismLayered(g, this.tint, tones,
          x + Math.cos(s.ang) * d, y + Math.sin(s.ang) * d, s.ang + Math.PI,
          radius * 0.42, radius * 0.13, 0.85 * fade);
      }
    });
    this.ring(x, y, radius * 1.4, radius * 0.7, tones.lit, 380, 4, depth);
    this.glint(x, y, radius * 1.3, depth + 2, tones);
  }

  /**
   * Inward-crystallising gather: prisms falling in from the rim toward a growing core while a
   * containment ring squeezes shut. `follow` lets it track a moving caster through a channel.
   */
  channelFacet(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: CrystalTones = CLEAR_TONES,
  ): void {
    const streams = Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * TAU,
      spin: 0.8 + (i % 3) * 0.35,
      phase: i / 12,
      len: 0.3 + (i % 4) * 0.06,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.88 + Math.sin(t * 26) * 0.12;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        crystalPrismLayered(g, this.tint, tones,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI,
          r * s.len, 3 * (1 - lt), 0.8 * (1 - lt * 0.5), { facets: false });
      }

      const cr = radius * (0.1 + easeIn(t) * 0.32) * pulse;
      g.fillStyle(this.tint(tones.shell), 0.6);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(tones.body), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.spark), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.3);

      g.lineStyle(3, this.tint(tones.lit), 0.45 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /**
   * A crystal node: a cut lance with a chromatic fringe, girdle facets and a light running the
   * length of it. Painted into a caller-owned Graphics because the kit already repositions and
   * re-angles every node each frame.
   */
  static drawNode(
    g: Phaser.GameObjects.Graphics, tint: CrystalColorFn, tones: CrystalTones,
    x: number, y: number, angle: number, w: number, h: number, t: number, gateway: boolean,
  ): void {
    // Nodes are drawn along their own long axis, which is perpendicular to the placing aim.
    const along = angle + Math.PI / 2;
    const half = h / 2;

    g.fillStyle(tint(CRYSTAL.onyx), 0.28);
    g.fillEllipse(x, y + 4, h * 0.5, w * 1.4);

    // Two halves growing out of the middle, so the lance reads as one cut stone.
    for (const s of [1, -1]) {
      crystalPrismLayered(g, tint, tones, x, y, along + (s > 0 ? 0 : Math.PI), half, w / 2, 0.95,
        { cut: gateway ? 0.16 : 0.24 });
    }

    // A highlight sliding along the lance — the tell that it is live and reflective.
    const slide = ((t * 0.55) % 1) * 2 - 1;
    const hx = x + Math.cos(along) * half * slide;
    const hy = y + Math.sin(along) * half * slide;
    g.fillStyle(tint(tones.spark), 0.85);
    crystalPrism(g, hx - Math.cos(along) * 6, hy - Math.sin(along) * 6, along, 12, w * 0.3, 0.2);

    if (gateway) {
      // Gateway nodes let things through rather than bouncing them, so they read as a slot:
      // an open channel down the middle instead of a solid core.
      g.lineStyle(1.6, tint(CRYSTAL.rose), 0.85);
      g.beginPath();
      g.moveTo(x + Math.cos(along) * half * 0.85, y + Math.sin(along) * half * 0.85);
      g.lineTo(x - Math.cos(along) * half * 0.85, y - Math.sin(along) * half * 0.85);
      g.strokePath();
    }
  }

  /**
   * A portal gate: a ring of prisms standing on end around an aperture that swirls. Painted
   * into a caller-owned Graphics so the kit can repaint both gates in one pass.
   */
  static drawPortal(
    g: Phaser.GameObjects.Graphics, tint: CrystalColorFn, tones: CrystalTones,
    x: number, y: number, radius: number, t: number, hue: number, alpha: number,
  ): void {
    const spin = t * 0.9;

    // Aperture: nested discs falling inward, brightest at the mouth.
    g.fillStyle(tint(CRYSTAL.onyx), 0.55 * alpha);
    g.fillCircle(x, y, radius);
    for (let i = 0; i < 4; i++) {
      const f = ((t * 0.7 + i / 4) % 1);
      g.fillStyle(tint(hue), 0.28 * (1 - f) * alpha);
      g.fillCircle(x, y, radius * (0.15 + f * 0.8));
    }
    g.fillStyle(tint(tones.spark), 0.7 * alpha * (0.6 + 0.4 * Math.sin(t * 5)));
    g.fillCircle(x, y, radius * 0.16);

    // Standing stones around the rim, each catching the light in turn.
    for (let i = 0; i < 8; i++) {
      const a = spin + (i / 8) * TAU;
      const lean = a + Math.PI / 2;
      const lit = 0.55 + 0.45 * Math.sin(t * 4 + i);
      crystalPrismLayered(
        g, tint, tones,
        x + Math.cos(a) * radius * 0.92, y + Math.sin(a) * radius * 0.92,
        lean, radius * 0.5, radius * 0.14, (0.55 + lit * 0.4) * alpha,
        { facets: false, fringe: 1.2 },
      );
    }

    g.lineStyle(2, tint(hue), 0.85 * alpha);
    g.strokeCircle(x, y, radius);
  }

  /**
   * The Crystal Shredder chakram: a counter-rotating faceted hub carrying a ring of raked blade
   * prisms, each smearing a motion-blur arc behind it and glinting as it passes the top of its
   * sweep. Blades that have shredded something are simply absent, so the weapon visibly wears
   * down over its life instead of vanishing all at once.
   *
   * While it is parked (`moving` false) the hub keeps turning but a targeting reticle opens
   * around it — the tell that Atune can still fling it back out.
   *
   * Painted into a caller-owned Graphics because the kit already drives its position and spin.
   */
  static drawShredder(
    g: Phaser.GameObjects.Graphics, tint: CrystalColorFn, tones: CrystalTones,
    x: number, y: number, radius: number, angle: number,
    blades: readonly boolean[], t: number, moving: boolean, grow: number,
  ): void {
    const n = blades.length;
    const r = radius * grow;
    const bladeLen = r * 0.85;
    const bladeW = r * (n > 6 ? 0.16 : 0.24);

    g.fillStyle(tint(CRYSTAL.onyx), 0.3);
    g.fillEllipse(x, y + r * 0.35, r * 2.2, r * 0.7);

    // Motion blur first, so live blades sit on top of their own smear.
    for (let i = 0; i < n; i++) {
      if (!blades[i]) continue;
      const base = angle + (i / n) * TAU;
      for (let k = 1; k <= 3; k++) {
        const a = base - k * 0.16;
        const fade = (1 - k / 4) * 0.3;
        g.fillStyle(tint(k === 1 ? tones.facet : tones.fringeA), fade);
        crystalPrism(g, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42,
          a + 0.7, bladeLen, bladeW * 0.7, 0.22);
      }
    }

    // Blades, raked forward off the rim like saw teeth rather than spokes off a wheel.
    for (let i = 0; i < n; i++) {
      if (!blades[i]) continue;
      const a = angle + (i / n) * TAU;
      crystalPrismLayered(
        g, tint, tones,
        x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42,
        a + 0.7, bladeLen, bladeW, 0.95, { facets: false, fringe: 1.2 },
      );
      // Each tooth catches the light once per revolution, at the top of its sweep.
      const phase = Math.sin(a);
      if (phase < -0.86) {
        const tipX = x + Math.cos(a) * r * 0.42 + Math.cos(a + 0.7) * bladeLen;
        const tipY = y + Math.sin(a) * r * 0.42 + Math.sin(a + 0.7) * bladeLen;
        const lit = (-phase - 0.86) / 0.14;
        g.fillStyle(tint(tones.spark), 0.9 * lit);
        for (let k = 0; k < 4; k++) {
          const sa = (k / 4) * TAU + a;
          crystalPrism(g, tipX, tipY, sa, r * 0.4 * lit, r * 0.025, 0.15);
        }
      }
    }

    // Hub: a counter-rotating rosette around a hot core, so the chakram reads as machined.
    const hub = -angle * 1.6;
    for (let i = 0; i < 6; i++) {
      const a = hub + (i / 6) * TAU;
      g.fillStyle(tint(i % 2 === 0 ? tones.body : tones.facet), 0.95);
      crystalPrism(g, x, y, a, r * 0.42, r * 0.13, 0.3);
    }
    g.fillStyle(tint(tones.shell), 0.95);
    g.fillCircle(x, y, r * 0.2);
    g.fillStyle(tint(tones.spark), 0.6 + 0.4 * Math.sin(t * 9));
    g.fillCircle(x, y, r * 0.11);
    g.lineStyle(1.6, tint(tones.lit), 0.85);
    g.strokeCircle(x, y, r * 0.34);

    if (!moving) {
      // Parked: a reticle breathing around the hub says it is still live and re-throwable.
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      g.lineStyle(1.6, tint(tones.fringeB), 0.35 + pulse * 0.4);
      g.strokeCircle(x, y, r * (1.3 + pulse * 0.12));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + t * 0.6;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45);
        g.lineTo(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75);
        g.strokePath();
      }
    }
  }

  /**
   * A Trick of the Light clone: a hollow prism figure that is visibly *not* solid — the body is
   * an outline with a bright core and a chromatic ghost, so it reads as an illusion even
   * standing still.
   */
  static drawMirage(
    g: Phaser.GameObjects.Graphics, tint: CrystalColorFn, tones: CrystalTones,
    x: number, y: number, radius: number, facing: number, t: number, alpha: number,
  ): void {
    const beat = 0.85 + 0.15 * Math.sin(t * 4);

    // Chromatic ghosts offset either side — the standing tell of a duplicate.
    for (const [s, c] of [[1, tones.fringeA], [-1, tones.fringeB]] as const) {
      g.fillStyle(tint(c), 0.22 * alpha);
      g.fillCircle(x + s * 2.5, y, radius * beat);
    }
    g.fillStyle(tint(tones.body), 0.35 * alpha);
    g.fillCircle(x, y, radius * beat);
    g.lineStyle(2, tint(tones.lit), 0.85 * alpha);
    g.strokeCircle(x, y, radius * beat);

    // Six facets standing off the body, and a lance pointing where it will shoot.
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + (i / 6) * TAU;
      g.fillStyle(tint(tones.facet), 0.7 * alpha);
      crystalPrism(g, x + Math.cos(a) * radius * 0.55, y + Math.sin(a) * radius * 0.55, a, radius * 0.6, radius * 0.14, 0.25);
    }
    crystalPrismLayered(g, tint, tones, x, y, facing, radius * 1.5, radius * 0.2, 0.9 * alpha, { facets: false });
    g.fillStyle(tint(tones.spark), 0.9 * alpha);
    g.fillCircle(x, y, radius * 0.2);
  }
}

// ── CrystalHalo ───────────────────────────────────────────────────────────

/**
 * Persistent ring of prisms orbiting a fighter (the mastery passive, Crystal Realm).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class CrystalHalo {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private glintAccum = 0;
  private facets: { ang: number; len: number; w: number; tilt: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: CrystalColorFn,
    private tones: CrystalTones,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 8,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.facets = Array.from({ length: count }, (_, i) => ({
      // Evenly spaced and evenly sized: a crystal halo is a machined thing.
      ang: (i / count) * TAU,
      len: 0.42 + (i % 2) * 0.12,
      w: 0.13,
      tilt: (i % 2 === 0 ? 1 : -1) * 0.35,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const spin = this.t * 0.75;
    g.fillStyle(this.tint(this.tones.shell), 0.2 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * 0.92);

    for (const f of this.facets) {
      const ang = f.ang + spin;
      const bob = 1 + Math.sin(this.t * 3 + f.ang * 2) * 0.06;
      crystalPrismLayered(
        g, this.tint, this.tones,
        x + Math.cos(ang) * this.radius * 0.55 * bob, y + Math.sin(ang) * this.radius * 0.55 * bob,
        ang + Math.PI / 2 + f.tilt,
        this.radius * f.len * this.intensity, this.radius * f.w, 0.72 * alpha,
        { facets: false },
      );
    }

    this.glintAccum += delta;
    const interval = 520 / Math.max(0.4, this.intensity);
    if (this.glintAccum >= interval) {
      this.glintAccum = 0;
      const a = Math.random() * TAU;
      new CrystalFx(this.scene, this.tint).glint(
        x + Math.cos(a) * this.radius * 0.6, y + Math.sin(a) * this.radius * 0.6,
        16, 5, this.tones, a,
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── CrystalAvatar ─────────────────────────────────────────────────────────

/** Concentric discs of one gem ball hand, outermost first. */
const CRYSTAL_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: CRYSTAL.azure, alpha: 0.3 },
    { r: 6.4, color: CRYSTAL.glass, alpha: 0.9 },
    { r: 3.4, color: CRYSTAL.pale, alpha: 1 },
    // Small, hard, off-axis: a cut face takes the tightest specular of any element here.
    { r: 1.3, color: CRYSTAL.white, alpha: 1, ox: -2, oy: -2 },
  ],
  eyeWhite: CRYSTAL.pale,
  eyePupil: CRYSTAL.onyx,
  // A gem hand is rigid — almost no smear at all.
  squash: { div: 19, x: 0.28, y: 0.12 },
};

/**
 * The crystal character rig: two gem ball hands, a pair of eyes, and a crown of prisms standing
 * off the head. The hands, eyes and gestures come from BaseAvatar; what crystal adds is the
 * light pooling underneath and the cut stones above.
 */
export class CrystalAvatar extends BaseAvatar {
  private fx: CrystalFx;
  private tones: CrystalTones;

  constructor(scene: Phaser.Scene, tint: CrystalColorFn, tones: CrystalTones = CLEAR_TONES, depth = 6) {
    super(scene, tint, depth, CRYSTAL_AVATAR);
    this.fx = new CrystalFx(scene, tint);
    this.tones = tones;
    if (tones !== CLEAR_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.facet), 0.9));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.spark), 1));
    }
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered crystal
   * user is identifiable at a glance before they cast anything: white eyes, a wider refraction
   * halo and a hard rim on each hand, a taller crown, and three prisms orbiting the head.
   * Shape changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CRYSTAL.white : CRYSTAL.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(this.tint(on ? this.tones.lit : CRYSTAL.azure), on ? 0.32 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(CRYSTAL.white), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed chips of cut stone. */
  protected emitTrail(x: number, y: number): void {
    this.fx.shards(x, y, 1, { speed: 14, size: 2, life: 520, fall: 26, depth: 5, tones: this.tones });
  }

  /** Refracted light pooling under the character, split into its coloured halves. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(this.tones.fringeA), a * 0.14 * this.intensity);
    g.fillEllipse(x - 4, y + 6, 52 * this.intensity, 28 * this.intensity);
    g.fillStyle(this.tint(this.tones.fringeB), a * 0.14 * this.intensity);
    g.fillEllipse(x + 4, y + 6, 52 * this.intensity, 28 * this.intensity);
    g.fillStyle(this.tint(this.tones.body), a * 0.22 * this.intensity);
    g.fillEllipse(x, y + 5, 38 * this.intensity, 21 * this.intensity);
    // Light spokes fanning out along the floor.
    for (let i = 0; i < 6; i++) {
      const ang = this.t * 0.3 + (i / 6) * TAU;
      g.fillStyle(this.tint(this.tones.facet), a * 0.35);
      crystalPrism(g, x, y + 6, ang, (16 + Math.sin(this.t * 2 + i) * 4) * this.intensity, 2.4, 0.2);
    }
  }

  /**
   * The crown: prisms standing off the top of the head, each catching the light in turn.
   * Rooted at y - 18 so they never cover the face, and drawn over the sprite so their lit faces
   * show rather than only the dark bases clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.35 : 1;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      // Crystal doesn't sway or breathe — the crown is fixed and the *light* moves across it.
      const height = 21 * this.intensity * scale * (1 - Math.abs(side) * 0.18);
      crystalPrismLayered(
        g, this.tint, this.tones,
        x + side * 7.5, rootY,
        -Math.PI / 2 + side * 0.42, height, 4.6 * scale, a * 0.95,
      );
      const lit = Math.max(0, Math.sin(this.t * 3 - i * 1.2));
      if (lit > 0.1) {
        g.fillStyle(this.tint(this.tones.spark), alpha * 0.8 * lit);
        crystalPrism(g, x + side * 7.5, rootY, -Math.PI / 2 + side * 0.42, height * 0.7, 1.4 * scale, 0.22);
      }
    }

    // Mastery orbit: three prisms circling the head on a shallow ellipse, each turning on its
    // own axis so the crown reads as cut stone in motion, not as beads on a wire.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.3 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 24;
        const cy = y - 30 + Math.sin(p) * 7;
        crystalPrismLayered(g, this.tint, this.tones, cx, cy, this.t * 1.8 + i * 2,
          12, 3.2, alpha * 0.9, { facets: false });
      }
    }
  }
}
