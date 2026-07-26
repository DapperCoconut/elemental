import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Gravity renders: the void-walker avatar (dark-star fists +
 * eyes + a tilted ring system over the crown), the well auras, and the one-shot effects every
 * gravity ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * gravity gravity: the spiral arm, the palette, and the effects built out of it.
 *
 * Colours must come from the GRAVITY palette below. Gravity has no skin yet, but
 * every call still routes through the owner's `gravityColor` mapper, so the day one lands it is
 * a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.gravityColor bound to one owner. */
export type GravityColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const GRAVITY = {
  /** The dark everything is silhouetted against. */
  void: 0x0a0614,
  abyss: 0x1a0a2e,
  deep: 0x2d1155,
  /** The element's own light. */
  purple: 0x5511aa,
  amethyst: 0x8844cc,
  violet: 0xaa44ff,
  lilac: 0xccbbee,
  pale: 0xe8dcff,
  white: 0xffffff,
  /** A meteor: cold rock over a molten core. */
  ash: 0x2a1a12,
  rock: 0x5a4438,
  magma: 0xff4422,
  fire: 0xff8822,
  ember: 0xffcc44,
  /** The moon you can ride. */
  moon: 0xccbbee,
  moonlit: 0xf2ecff,
  moonDark: 0x6b5a86,
} as const;

/** One coherent set of shades. `dark → body → lit → hot` runs deep to bright. */
export interface GravityTones {
  dark: number;
  body: number;
  lit: number;
  hot: number;
  spark: number;
}

/** The player's own well. */
export const VOID_TONES: GravityTones = {
  dark: GRAVITY.abyss, body: GRAVITY.purple, lit: GRAVITY.violet, hot: GRAVITY.lilac, spark: GRAVITY.white,
};
/** The NPC's reads deeper and colder so two gravity fighters never blur together. */
export const NPC_TONES: GravityTones = {
  dark: GRAVITY.void, body: GRAVITY.deep, lit: GRAVITY.amethyst, hot: GRAVITY.violet, spark: GRAVITY.lilac,
};
/** Anything falling: rock on the way in, magma on the way out. */
export const METEOR_TONES: GravityTones = {
  dark: GRAVITY.ash, body: GRAVITY.rock, lit: GRAVITY.magma, hot: GRAVITY.fire, spark: GRAVITY.ember,
};
/** The moon itself. */
export const MOON_TONES: GravityTones = {
  dark: GRAVITY.moonDark, body: GRAVITY.moon, lit: GRAVITY.moonlit, hot: GRAVITY.white, spark: GRAVITY.white,
};

export const tonesFor = (owner: 'player' | 'npc'): GravityTones =>
  (owner === 'player' ? VOID_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A spiral arm: a wedge of matter falling in. It is widest at its outer end and narrows to a
 * needle at the inner one, and its centreline *curls* — it never travels in a straight line,
 * because nothing near a well does.
 *
 * That curl is the whole read of the element. Fire licks outward, soul streams away, hunt tears
 * across, time pivots — gravity spirals in. Every ray, shockwave spoke, ejecta streak and
 * accretion band here is this one shape at a different scale.
 */
export function gravArm(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  startAngle: number,
  outerR: number, innerR: number,
  halfW: number,
  /** Radians of sweep between the outer end and the inner one. */
  curl = 1.1,
): void {
  const STEPS = 14;
  const at = (f: number, side: number): [number, number] => {
    const r = outerR + (innerR - outerR) * f;
    const a = startAngle + curl * f;
    // Mass at the outer end, needle at the inner: the profile of something being drawn in.
    const w = side * halfW * Math.pow(1 - f, 0.68);
    // Width is measured along the tangent, so the arm keeps its thickness through the bend.
    const tx = -Math.sin(a), ty = Math.cos(a);
    return [cx + Math.cos(a) * r + tx * w, cy + Math.sin(a) * r + ty * w];
  };

  g.beginPath();
  const start = at(0, 1);
  g.moveTo(start[0], start[1]);
  for (let i = 1; i <= STEPS; i++) { const p = at(i / STEPS, 1); g.lineTo(p[0], p[1]); }
  for (let i = STEPS; i >= 0; i--) { const p = at(i / STEPS, -1); g.lineTo(p[0], p[1]); }
  g.closePath();
  g.fillPath();
}

/** Deterministic 0→1 noise. One meteor keeps the same silhouette frame to frame. */
function rnd(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * An irregular rock outline: a closed polygon whose vertex radii are jittered by a seed, so the
 * same seed always produces the same lump. Leaves the path open for the caller to fill or stroke.
 */
function rockPath(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number,
  spin: number, seed: number, jitter = 0.3, verts = 13,
): void {
  g.beginPath();
  for (let i = 0; i <= verts; i++) {
    const k = i % verts;
    const a = spin + (k / verts) * TAU;
    const rr = r * (1 - jitter * 0.5 + jitter * rnd(seed + k * 1.7));
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
}

/**
 * A tongue of flame or smoke torn off a moving body: widest where it leaves the source and
 * tapering to nothing, with a centreline that wanders further out the further it travels.
 *
 * This is the inverse profile of `gravArm` — mass at the *inner* end, not the outer — because a
 * trail is being shed, not drawn in.
 */
function plume(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number,
  len: number, halfW: number, wobble: number, phase: number,
): void {
  const STEPS = 12;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const at = (f: number, side: number): [number, number] => {
    const along = len * f;
    const drift = Math.sin(f * 3.4 + phase) * wobble * f;
    const w = side * halfW * Math.pow(1 - f, 0.75) * (0.85 + 0.3 * Math.sin(f * 9 + phase * 2));
    const cross = drift + w;
    return [cx + ca * along - sa * cross, cy + sa * along + ca * cross];
  };
  g.beginPath();
  const start = at(0, 1);
  g.moveTo(start[0], start[1]);
  for (let i = 1; i <= STEPS; i++) { const p = at(i / STEPS, 1); g.lineTo(p[0], p[1]); }
  for (let i = STEPS; i >= 0; i--) { const p = at(i / STEPS, -1); g.lineTo(p[0], p[1]); }
  g.closePath();
  g.fillPath();
}

/**
 * A stellar flare: a star whose points are *pinched* rather than straight-sided, sampled from a
 * continuous polar curve so the waist between each pair of points curves inward.
 *
 * `points` must be even (2 = a single glare bar, 4 = the classic sparkle). `sharp` controls how
 * narrow the points get — higher is needlier.
 */
function starburst(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  outer: number, inner: number,
  points: number, rot: number, sharp = 3,
): void {
  const STEPS = points * 14;
  g.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const a = rot + (i / STEPS) * TAU;
    const lobe = Math.pow(Math.abs(Math.cos((points / 2) * (a - rot))), sharp);
    const rr = inner + (outer - inner) * lobe;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
}

export interface ArmLayerOpts {
  curl?: number;
  /** Bright bead at the outer end, where the mass is. Default true. */
  head?: boolean;
  /** Hard specular along the leading flank. Default true. */
  edge?: boolean;
}

/**
 * Layered arm: a dark outer shell, the body, a lit inner band, a hot needle, a bead of mass at
 * the outer end and a specular along the leading flank.
 *
 * The head bead does for gravity what the rounded fills do for fire: without it a ring of arms
 * reads as a pinwheel of spikes, and with it the same ring reads as matter in orbit.
 */
export function gravArmLayered(
  g: Phaser.GameObjects.Graphics,
  tint: GravityColorFn, tones: GravityTones,
  cx: number, cy: number,
  startAngle: number, outerR: number, innerR: number, halfW: number,
  alpha: number,
  opts: ArmLayerOpts = {},
): void {
  const curl = opts.curl ?? 1.1;

  g.fillStyle(tint(tones.dark), alpha * 0.8);
  gravArm(g, cx, cy, startAngle, outerR * 1.02, innerR, halfW * 1.4, curl);
  g.fillStyle(tint(tones.body), alpha * 0.92);
  gravArm(g, cx, cy, startAngle, outerR, innerR, halfW, curl);
  g.fillStyle(tint(tones.lit), alpha * 0.9);
  gravArm(g, cx, cy, startAngle, outerR * 0.97, innerR, halfW * 0.52, curl);
  g.fillStyle(tint(tones.hot), alpha * 0.85);
  gravArm(g, cx, cy, startAngle, outerR * 0.85, innerR, halfW * 0.2, curl);

  if (opts.edge !== false) {
    g.lineStyle(Math.max(0.7, halfW * 0.24), tint(tones.spark), alpha * 0.5);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const r = outerR + (innerR - outerR) * f;
      const a = startAngle + curl * f;
      const w = halfW * Math.pow(1 - f, 0.68);
      const x = cx + Math.cos(a) * r - Math.sin(a) * w;
      const y = cy + Math.sin(a) * r + Math.cos(a) * w;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  if (opts.head !== false) {
    const hx = cx + Math.cos(startAngle) * outerR;
    const hy = cy + Math.sin(startAngle) * outerR;
    g.fillStyle(tint(tones.body), alpha * 0.8);
    g.fillCircle(hx, hy, halfW * 1.15);
    g.fillStyle(tint(tones.lit), alpha * 0.9);
    g.fillCircle(hx, hy, halfW * 0.7);
    g.fillStyle(tint(tones.spark), alpha * 0.85);
    g.fillCircle(hx - halfW * 0.22, hy - halfW * 0.26, halfW * 0.3);
  }
}

export interface ImpactOpts {
  /** Rock ejecta thrown out. Defaults to radius/8. */
  rocks?: number;
  /** Dust plumes left behind. Defaults to radius/40. */
  dust?: number;
  /** Leave a crater scar. Default true. */
  crater?: boolean;
  depth?: number;
  duration?: number;
  tones?: GravityTones;
}

export interface ArmBurstOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  fall?: number;
  tones?: GravityTones;
}

// ── GravityFx ─────────────────────────────────────────────────────────────

/**
 * One-shot gravity effects. Cheap to construct — build one per owner and hand it the owner's
 * colour mapper.
 */
export class GravityFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: GravityColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding front, drawn as a lensing ring: a perfectly round rim with a violet ghost bent
   * out ahead of it and a dark band behind. Gravity's fronts don't wobble — space is smooth;
   * it's the *light* that gets bent.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      // Dark band behind the front: the space it has already swept clean.
      g.lineStyle(width * 1.9 * (1 - t * 0.5), this.tint(GRAVITY.abyss), 0.4 * fade);
      g.strokeCircle(x, y, r * 0.93);
      // Lensed ghost, running a beat ahead.
      g.lineStyle(width * 0.6 * (1 - t * 0.6), this.tint(GRAVITY.violet), 0.45 * fade);
      g.strokeCircle(x, y, r * 1.06);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.65)), c, 0.85 * fade);
      g.strokeCircle(x, y, r);
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: GravityTones = VOID_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.lit, depth);
  }

  /**
   * Matter thrown out of (or drawn into) a point along curling paths. `speed` negative pulls
   * inward, which is how every implosion in the element is drawn.
   */
  arms(x: number, y: number, count: number, opts: ArmBurstOpts = {}): void {
    const tones = opts.tones ?? VOID_TONES;
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 560;
    const fall = opts.fall ?? 0;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.45 + Math.random() * 0.9),
      r: size * (0.55 + Math.random() * 0.85),
      curl: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 1.1),
      delay: Math.random() * 0.18,
    }));

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const fade = 1 - lt * lt;
        gravArmLayered(
          g, this.tint, tones, x, y + fall * lt * lt,
          p.a + p.curl * lt * 0.5, Math.abs(d), Math.abs(d) - p.r * 5 * fade,
          p.r * fade, 0.9 * fade, { curl: p.curl * 0.5, edge: false },
        );
      }
    });
  }

  /** Broken rock tumbling out of an impact and falling back down. */
  rocks(x: number, y: number, count: number, radius: number, depth = 6): void {
    const bits = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: radius * (1.2 + Math.random() * 1.5),
        r: 2 + Math.random() * 4,
        spin: (Math.random() - 0.5) * 18,
        spin0: Math.random() * TAU,
        facets: 5 + Math.floor(Math.random() * 3),
      };
    });
    this.anim(depth, 620, (g, t) => {
      for (const b of bits) {
        const d = b.v * easeOut(t) * 0.45;
        const ex = x + b.cos * d, ey = y + b.sin * d + radius * 0.9 * t * t;
        const fade = 1 - t * t;
        const spin = b.spin0 + b.spin * t;
        // A chunk, not a dot: an irregular polygon with a lit top face.
        for (const [shade, scale, off] of [[GRAVITY.ash, 1.15, 0], [GRAVITY.rock, 1, -0.6], [GRAVITY.magma, 0.42, -1]] as const) {
          g.fillStyle(this.tint(shade), (shade === GRAVITY.magma ? 0.8 : 0.95) * fade);
          g.beginPath();
          for (let i = 0; i <= b.facets; i++) {
            const a = spin + (i / b.facets) * TAU;
            const rr = b.r * scale * (0.75 + 0.35 * Math.sin(i * 2.3 + b.spin0));
            const px = ex + Math.cos(a) * rr, py = ey + off + Math.sin(a) * rr;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath();
          g.fillPath();
        }
      }
    });
  }

  /** Dust kicked up: hangs, spreads and settles. */
  dust(x: number, y: number, count: number, radius: number, depth = 5): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius,
      oy: (Math.random() - 0.5) * radius * 0.5,
      r: radius * (0.3 + Math.random() * 0.4),
      drift: (Math.random() - 0.5) * 26,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 1400, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(GRAVITY.rock), 0.26 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 10 * lt, p.r * (0.5 + lt * 1.7));
      }
    });
  }

  /** A crater scar: a dark bowl with a raised lip and cooling cracks. */
  crater(x: number, y: number, radius: number, depth = 1, tones: GravityTones = METEOR_TONES): void {
    const cracks = Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * TAU + Math.random() * 0.5,
      len: radius * (0.6 + Math.random() * 0.7),
      curl: (Math.random() - 0.5) * 0.8,
    }));
    this.anim(depth, 2600, (g, t) => {
      const a = t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94;
      g.fillStyle(this.tint(GRAVITY.void), 0.6 * a);
      g.fillEllipse(x, y, radius * 2, radius * 1.3);
      g.fillStyle(this.tint(tones.dark), 0.5 * a);
      g.fillEllipse(x, y - radius * 0.06, radius * 1.6, radius * 1.05);
      g.lineStyle(2, this.tint(tones.body), 0.55 * a);
      g.strokeEllipse(x, y, radius * 2, radius * 1.3);
      for (const c of cracks) {
        // Cracks curl, because even a fracture near a well doesn't run straight.
        g.fillStyle(this.tint(tones.lit), 0.5 * a * (0.5 + 0.5 * Math.sin(t * 4 + c.a)));
        gravArm(g, x, y, c.a, c.len, radius * 0.3, 1.6, c.curl);
      }
    });
  }

  /**
   * The body of an impact: rock lobes blown out of the seat of the hit along curling paths,
   * over a hot core that flares and dies.
   */
  impactBloom(x: number, y: number, radius: number, duration: number, depth = 6, tones: GravityTones = METEOR_TONES): void {
    const lobes = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + Math.random() * 0.3,
      len: 0.7 + Math.random() * 0.4,
      w: 0.12 + Math.random() * 0.07,
      curl: (i % 2 === 0 ? 1 : -1) * (0.5 + Math.random() * 0.6),
      delay: Math.random() * 0.16,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      const core = easeOut(Math.min(1, t * 3.4));
      g.fillStyle(this.tint(tones.dark), 0.75 * fade);
      g.fillCircle(x, y, radius * 0.42 * core);
      g.fillStyle(this.tint(tones.body), 0.85 * fade);
      g.fillCircle(x, y, radius * 0.28 * core);
      for (const l of lobes) {
        const lt = Math.max(0, (t - l.delay) / (1 - l.delay));
        const grow = easeOut(Math.min(1, lt * 2.2));
        gravArmLayered(
          g, this.tint, tones, x, y,
          l.ang + lt * l.curl * 0.6,
          radius * l.len * grow, radius * 0.15,
          radius * l.w * (1 - lt * 0.3), 0.92 * fade, { curl: l.curl, edge: false },
        );
      }
      if (t < 0.35) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.35) * 0.9);
        g.fillCircle(x, y, radius * 0.2);
      }
    });
  }

  /** Full impact: flash, rock bloom, two lensing fronts, ejecta, dust and a crater. */
  impact(x: number, y: number, radius: number, opts: ImpactOpts = {}): void {
    const tones = opts.tones ?? METEOR_TONES;
    const rocks = opts.rocks ?? Math.max(5, Math.round(radius / 8));
    const dust = opts.dust ?? Math.max(2, Math.round(radius / 40));
    const dur = opts.duration ?? Math.round(340 + radius * 1.3);
    const depth = opts.depth ?? 6;

    if (opts.crater !== false) this.crater(x, y, radius * 0.5, 1, tones);
    this.impactBloom(x, y, radius * 0.7, dur, depth, tones);
    this.flash(x, y, radius * 0.34, depth + 1, tones);
    this.ring(x, y, radius * 0.18, radius, tones.lit, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.15, radius * 1.35, GRAVITY.violet, dur, 3.5, depth));
    this.rocks(x, y, rocks, radius, depth);
    this.dust(x, y, dust, radius * 0.65, depth - 1);
  }

  /**
   * A well: matter spiralling into a dark core with a lensed photon ring around it. This is
   * gravity's signature, and every pull in the element resolves to it.
   *
   * `follow` lets it track a moving cursor through a hold.
   */
  well(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 5, tones: GravityTones = VOID_TONES,
  ): void {
    const streams = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU, spin: 0.8 + (i % 3) * 0.4, phase: i / 9,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) * 1.6 + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        gravArmLayered(g, this.tint, tones, cx, cy,
          s.ang + t * s.spin * TAU, r, r * 0.25, 3.6 * (1 - lt * 0.6), 0.85 * (1 - lt * 0.4),
          { curl: 1.5, edge: false });
      }
      // Accretion disc, then the event horizon, then the photon ring bent around it.
      g.fillStyle(this.tint(tones.body), 0.3);
      g.fillEllipse(cx, cy, radius * 1.3, radius * 0.45);
      g.fillStyle(this.tint(GRAVITY.void), 0.95);
      g.fillCircle(cx, cy, radius * 0.2);
      g.lineStyle(2.4, this.tint(tones.hot), 0.8);
      g.strokeCircle(cx, cy, radius * 0.27);
      g.lineStyle(1.2, this.tint(tones.spark), 0.5);
      g.strokeCircle(cx, cy, radius * 0.33);
    });
  }

  /**
   * A tear in spacetime along a line: the rift itself, the light bent either side of it, and
   * the debris being pulled toward the seam. Space Slash's telegraph and its release both read
   * off this.
   */
  rift(
    x1: number, y1: number, x2: number, y2: number,
    duration = 500, depth = 6, tones: GravityTones = VOID_TONES,
  ): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const teeth = Phaser.Math.Clamp(Math.round(dist / 26), 3, 24);
    const seeds = Array.from({ length: teeth }, (_, i) => ({
      f: (i + 0.5) / teeth,
      side: i % 2 === 0 ? 1 : -1,
      len: 10 + Math.random() * 16,
      curl: (Math.random() - 0.5) * 1.6,
    }));
    this.anim(depth, duration, (g, t) => {
      // The seam widens, holds, then snaps shut.
      const open = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn(Math.max(0, (t - 0.6) / 0.4));
      if (open <= 0) return;
      // Light bent either side of the tear.
      for (const s of [1, -1]) {
        g.lineStyle(3 * open, this.tint(tones.lit), 0.35 * open);
        g.lineBetween(x1 + px * s * 5 * open, y1 + py * s * 5 * open, x2 + px * s * 5 * open, y2 + py * s * 5 * open);
      }
      // The tear: black at the centre with a hot lip.
      g.lineStyle(7 * open, this.tint(GRAVITY.void), 0.9 * open);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(2.5 * open, this.tint(tones.hot), 0.95 * open);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(1 * open, this.tint(tones.spark), 0.8 * open);
      g.lineBetween(x1, y1, x2, y2);
      // Matter falling into the seam along both flanks.
      for (const s of seeds) {
        const bx = x1 + (x2 - x1) * s.f + px * s.side * s.len * (1 - open) * 1.6;
        const by = y1 + (y2 - y1) * s.f + py * s.side * s.len * (1 - open) * 1.6;
        gravArmLayered(g, this.tint, tones, bx, by,
          angle + (s.side > 0 ? Math.PI / 2 : -Math.PI / 2), s.len * open, 2, 2.4 * open, 0.7 * open,
          { curl: s.curl, edge: false, head: false });
      }
    });
  }

  /**
   * A star coming apart on the floor: its flare blows open while the core it was wrapped around
   * pinches shut. Pairs with `drawStar` so a Starfall landing resolves the same shape it fell as.
   */
  starBurst(x: number, y: number, radius: number, depth = 8, tones: GravityTones = VOID_TONES): void {
    this.anim(depth, 420, (g, t) => {
      const grow = easeOut(t);
      const fade = 1 - t * t;
      g.fillStyle(this.tint(tones.lit), 0.45 * fade);
      starburst(g, x, y, radius * (0.35 + grow * 0.85), 2, 4, t * 1.4, 3.2);
      g.fillStyle(this.tint(tones.spark), 0.8 * fade);
      starburst(g, x, y, radius * (0.2 + grow * 0.45), 1.4, 4, -t * 2.2, 2.6);
      // The core it was built around, pinching shut as the light leaves.
      g.fillStyle(this.tint(GRAVITY.void), 0.75 * (1 - grow));
      g.fillCircle(x, y, radius * 0.17 * (1 - grow));
    });
  }

  /** Ignition burst for an aura or a summon: arms falling inward and locking into orbit. */
  bloom(x: number, y: number, radius: number, count = 8, depth = 5, tones: GravityTones = VOID_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({ ang: (i / count) * TAU, delay: (i % 3) * 0.06 }));
    this.anim(depth, 460, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const outer = radius * (1.6 - easeOut(lt) * 0.8);
        gravArmLayered(g, this.tint, tones, x, y, s.ang + lt * 0.9,
          outer, outer * 0.55, radius * 0.13, 0.85 * fade, { curl: 1.2, edge: false });
      }
    });
    this.ring(x, y, radius * 1.5, radius * 0.6, tones.lit, 400, 3.5, depth);
  }

  // ── Caller-owned Graphics painters ──────────────────────────────────────

  /**
   * A meteor shadow on the ground, with the rock itself visibly falling into it. `progress` runs
   * 0 → 1 as the impact approaches: the shadow tightens and darkens, and the meteor grows out of
   * the sky. `frozen` shadows (held for a recorded Meteor Rain pattern) instead sit and breathe
   * with a lock ring around them, so a placed marker never reads as an incoming one.
   */
  static drawShadow(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn, tones: GravityTones,
    x: number, y: number, radius: number, t: number, progress: number, frozen: boolean,
  ): void {
    const p = Phaser.Math.Clamp(progress, 0, 1);
    const tight = frozen ? 0.8 : 1 - p * 0.45;
    const dark = frozen ? 0.45 : 0.4 + p * 0.45;

    g.fillStyle(tint(GRAVITY.void), dark * 0.7);
    g.fillEllipse(x, y, radius * 2 * tight, radius * 1.35 * tight);
    g.fillStyle(tint(tones.dark), dark);
    g.fillEllipse(x, y, radius * 1.5 * tight, radius * 1 * tight);
    g.lineStyle(2, tint(tones.lit), 0.55 + (frozen ? 0.2 * Math.sin(t * 5) : p * 0.4));
    g.strokeEllipse(x, y, radius * 2 * tight, radius * 1.35 * tight);

    if (frozen) {
      // A held marker: three arms locked around it, turning slowly. Unmistakably *placed*.
      for (let i = 0; i < 3; i++) {
        const a = t * 0.9 + (i / 3) * TAU;
        gravArmLayered(g, tint, tones, x, y, a, radius * 1.5, radius * 0.9, 2.6, 0.7, { curl: 0.9, edge: false });
      }
      return;
    }

    // The rock coming in: grows and drops toward the mark as the fuse runs out. It falls from
    // proportionally further up the bigger it is, so the Lunar Landing moon enters off-screen.
    const fall = (1 - p) * (60 + radius * 1.2);
    const mr = radius * (0.22 + p * 0.52);
    GravityFx.drawMeteor(g, tint, tones, x, y - fall, mr, t, p, x * 0.137 + y * 0.311);
  }

  /**
   * A meteor in flight. Not a ball — a tumbling lump of crust with molten fissures venting
   * through it, an ablating leading face that burns hottest at the nose, and a ragged plume of
   * smoke and fire torn off behind, shedding sparks and broken chunks as it comes.
   *
   * The read is deliberately two-sided: rock and fire on the underside where the atmosphere is
   * tearing at it, and a cold rim-light in the owner's own colour along the top — which is what
   * keeps a falling rock looking like *gravity's* rock rather than fire's.
   *
   * `heat` runs 0 → 1 with the fuse: the plume lengthens and brightens as it accelerates in.
   * `seed` fixes the silhouette, so one meteor keeps its shape and no two look identical.
   */
  static drawMeteor(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn, tones: GravityTones,
    x: number, y: number, r: number, t: number, heat = 1, seed = 0,
  ): void {
    const flick = 0.72 + 0.28 * Math.sin(t * 17 + seed);
    const spin = t * 0.8 + seed;
    // A stage-sized rock would otherwise drag a stage-sized smoke plume over the playfield, so the
    // trail gets proportionally shorter the bigger the thing throwing it is.
    const tail = r * (2.4 + heat * 2.6) * Phaser.Math.Clamp(60 / r, 0.5, 1);
    const UP = -Math.PI / 2;
    const lw = (f: number) => Math.max(0.6, r * f);

    // Heat bloom: the air around it is already glowing before anything else is drawn.
    g.fillStyle(tint(GRAVITY.magma), 0.15 * flick);
    g.fillCircle(x, y + r * 0.2, r * 1.95);
    g.fillStyle(tint(GRAVITY.fire), 0.13);
    g.fillCircle(x, y + r * 0.35, r * 1.25);

    // Smoke: wide, dark, and lagging — it sits behind everything hot.
    for (const s of [-1, 1]) {
      g.fillStyle(tint(GRAVITY.ash), 0.3);
      plume(g, x, y - r * 0.3, UP + s * 0.1, tail * 1.15, r * 0.95, r * 0.5, t * 3 + s * 2 + seed);
    }
    // Fire, in three tightening layers down to an ember core.
    g.fillStyle(tint(GRAVITY.magma), 0.72);
    plume(g, x, y - r * 0.2, UP + 0.05, tail, r * 0.72, r * 0.4, t * 4.4 + seed);
    g.fillStyle(tint(GRAVITY.fire), 0.78 * flick);
    plume(g, x, y - r * 0.2, UP - 0.04, tail * 0.78, r * 0.44, r * 0.3, t * 5.6 + seed * 2);
    g.fillStyle(tint(GRAVITY.ember), 0.85 * flick);
    plume(g, x, y - r * 0.3, UP, tail * 0.48, r * 0.2, r * 0.16, t * 7 + seed * 3);

    // Streaks of bent light flanking the entry path — the element's own colour, not the fire's.
    for (const s of [-1, 1]) {
      g.lineStyle(lw(0.05), tint(tones.lit), 0.22 + heat * 0.22);
      g.lineBetween(x + s * r * 1.2, y - r * 0.3, x + s * r * 1.5, y - tail * 0.6);
    }

    // Sparks streaming off, and broken chunks tumbling away behind them.
    for (let i = 0; i < 7; i++) {
      const ph = (t * 1.7 + i / 7) % 1;
      g.fillStyle(tint(ph < 0.5 ? GRAVITY.ember : GRAVITY.fire), (1 - ph) * 0.85);
      g.fillCircle(x + Math.sin(t * 3 + i * 2) * r * 0.55 * ph, y - r * 0.6 - ph * tail * 1.05, r * 0.15 * (1 - ph));
    }
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.05 + i / 3) % 1;
      const cx = x + (rnd(seed + 60 + i) - 0.5) * r * 1.6 * ph;
      const cy = y - r * 0.8 - ph * tail * 0.7;
      const cr = r * 0.17 * (1 - ph * 0.55);
      g.fillStyle(tint(GRAVITY.ash), 0.9 * (1 - ph));
      rockPath(g, cx, cy, cr, spin * 2.4 + i, seed + 70 + i);
      g.fillPath();
      g.fillStyle(tint(GRAVITY.magma), 0.75 * (1 - ph));
      g.fillCircle(cx, cy, cr * 0.42);
    }

    // The body: a hard dark mass, the crust over it, then the face turned to the light.
    g.fillStyle(tint(GRAVITY.void), 0.9);
    rockPath(g, x, y, r * 1.12, spin, seed);
    g.fillPath();
    g.fillStyle(tint(GRAVITY.ash), 1);
    rockPath(g, x, y, r, spin, seed);
    g.fillPath();
    g.fillStyle(tint(GRAVITY.rock), 1);
    rockPath(g, x - r * 0.13, y - r * 0.15, r * 0.8, spin, seed + 4, 0.36);
    g.fillPath();
    // A shadowed facet on the trailing shoulder, so the lump reads as faceted and not smeared.
    g.fillStyle(tint(GRAVITY.void), 0.3);
    rockPath(g, x + r * 0.34, y - r * 0.3, r * 0.4, spin * 1.3, seed + 9, 0.45, 7);
    g.fillPath();

    // Molten fissures: the crust has cracked and the core is venting through it. Glued to the
    // body's spin, so the whole rock tumbles as one thing.
    for (let i = 0; i < 4; i++) {
      const a = spin + rnd(seed + 30 + i) * TAU;
      const curl = (i % 2 === 0 ? 1 : -1) * (0.4 + rnd(seed + 40 + i) * 0.5);
      g.fillStyle(tint(GRAVITY.magma), 0.5 + 0.35 * Math.sin(t * 9 + i * 2));
      gravArm(g, x, y, a, r * 0.94, r * 0.08, r * 0.11, curl);
      g.fillStyle(tint(GRAVITY.ember), 0.55 * flick);
      gravArm(g, x, y, a, r * 0.66, r * 0.08, r * 0.045, curl);
    }

    // The ablating leading face: the underside is being burned away as it comes down.
    g.lineStyle(lw(0.17), tint(GRAVITY.fire), 0.85 * flick);
    g.beginPath();
    g.arc(x, y, r * 0.95, Math.PI * 0.16, Math.PI * 0.84, false);
    g.strokePath();
    g.lineStyle(lw(0.07), tint(GRAVITY.ember), 0.95);
    g.beginPath();
    g.arc(x, y, r * 0.84, Math.PI * 0.28, Math.PI * 0.72, false);
    g.strokePath();
    // The nose, where all of that heat is concentrated.
    g.fillStyle(tint(GRAVITY.ember), 0.85 * flick);
    g.fillCircle(x, y + r * 0.78, r * 0.24);
    g.fillStyle(tint(GRAVITY.white), 0.55 * flick);
    g.fillCircle(x, y + r * 0.78, r * 0.1);

    // Cold rim-light over the top: the well's own light catching the crust it hasn't burned yet.
    g.lineStyle(lw(0.07), tint(tones.lit), 0.45);
    g.beginPath();
    g.arc(x - r * 0.1, y - r * 0.12, r * 0.88, Math.PI * 1.14, Math.PI * 1.88, false);
    g.strokePath();
  }

  /**
   * A magma pool left by a meteor: a crusted rim over a molten centre, with the crust visibly
   * cracking as it cools.
   */
  static drawFirePool(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    const segs = 14;
    g.fillStyle(tint(GRAVITY.ash), 0.75 * alpha);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * TAU;
      const r = radius * (0.95 + 0.12 * Math.sin(t * 1.6 + i * 1.9));
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.72;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(GRAVITY.magma), 0.6 * alpha);
    g.fillEllipse(x, y, radius * 1.4, radius * 1);
    g.fillStyle(tint(GRAVITY.fire), 0.55 * alpha * (0.7 + 0.3 * Math.sin(t * 3)));
    g.fillEllipse(x, y, radius * 0.9, radius * 0.62);
    // Crust plates floating on it.
    for (let i = 0; i < 4; i++) {
      const a = t * 0.4 + (i / 4) * TAU;
      g.fillStyle(tint(GRAVITY.rock), 0.85 * alpha);
      gravArm(g, x, y, a, radius * 0.8, radius * 0.25, radius * 0.16, 0.7);
    }
    g.fillStyle(tint(GRAVITY.ember), 0.8 * alpha * (0.5 + 0.5 * Math.sin(t * 5)));
    g.fillCircle(x, y, radius * 0.14);
  }

  /**
   * The ridden moon: a cratered body with a hard terminator, lit from the same side as
   * everything else here, and a faint halo of dust it drags along.
   */
  static drawMoon(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    x: number, y: number, radius: number, t: number, hpFrac: number,
  ): void {
    g.fillStyle(tint(GRAVITY.lilac), 0.12);
    g.fillCircle(x, y, radius * 1.35);
    g.fillStyle(tint(GRAVITY.moonDark), 1);
    g.fillCircle(x, y, radius);
    g.fillStyle(tint(GRAVITY.moon), 1);
    g.fillCircle(x - radius * 0.1, y - radius * 0.12, radius * 0.92);
    g.fillStyle(tint(GRAVITY.moonlit), 0.75);
    g.fillCircle(x - radius * 0.28, y - radius * 0.3, radius * 0.55);

    // Craters: darker discs with a lit lower lip, fixed to the body so it reads as solid.
    const craters: [number, number, number][] = [
      [-0.35, 0.2, 0.22], [0.3, -0.28, 0.16], [0.12, 0.42, 0.13],
      [0.48, 0.18, 0.1], [-0.15, -0.45, 0.11],
    ];
    for (const [ox, oy, r] of craters) {
      g.fillStyle(tint(GRAVITY.moonDark), 0.85);
      g.fillCircle(x + ox * radius, y + oy * radius, r * radius);
      g.fillStyle(tint(GRAVITY.moonlit), 0.35);
      g.fillCircle(x + ox * radius, y + oy * radius + r * radius * 0.3, r * radius * 0.6);
    }

    // Damage: the more it has taken, the more of it is visibly cracked open.
    if (hpFrac < 1) {
      const cracks = Math.round((1 - hpFrac) * 5);
      for (let i = 0; i < cracks; i++) {
        const a = (i / 5) * TAU + 0.4;
        g.fillStyle(tint(GRAVITY.abyss), 0.85);
        gravArm(g, x, y, a, radius * 0.95, radius * 0.15, radius * 0.07, 0.9);
      }
    }
    // Dust it drags along behind.
    for (let i = 0; i < 5; i++) {
      const a = t * 0.6 + (i / 5) * TAU;
      g.fillStyle(tint(GRAVITY.lilac), 0.25);
      g.fillCircle(x + Math.cos(a) * radius * 1.25, y + Math.sin(a) * radius * 0.5, 2.2);
    }
  }

  /**
   * The Gravity Anchor: a driven spike with the space around it visibly bent, and the tether
   * running from it to whatever it has hold of.
   */
  static drawAnchor(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn, tones: GravityTones,
    ax: number, ay: number, tx: number, ty: number, t: number, strain: number,
  ): void {
    // The tether: a curling line, bowed by the strain on it.
    const dx = tx - ax, dy = ty - ay;
    const dist = Math.hypot(dx, dy) || 1;
    const px = -dy / dist, py = dx / dist;
    const steps = Phaser.Math.Clamp(Math.round(dist / 14), 3, 26);
    const bow = -Math.min(30, dist * 0.14) * (1 - strain);
    g.lineStyle(3, tint(tones.dark), 0.7);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const off = bow * Math.sin(Math.PI * f);
      const cx = ax + dx * f + px * off, cy = ay + dy * f + py * off;
      if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
    }
    g.strokePath();
    g.lineStyle(1.4, tint(tones.hot), 0.55 + strain * 0.4);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const off = bow * Math.sin(Math.PI * f);
      const cx = ax + dx * f + px * off, cy = ay + dy * f + py * off;
      if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
    }
    g.strokePath();

    // The anchor: a well pinned to the floor, with arms turning around it.
    g.fillStyle(tint(GRAVITY.void), 0.55);
    g.fillEllipse(ax, ay, 34, 13);
    for (let i = 0; i < 4; i++) {
      const a = -t * 1.4 + (i / 4) * TAU;
      gravArmLayered(g, tint, tones, ax, ay, a, 17, 5, 3, 0.85, { curl: 1.3, edge: false });
    }
    g.fillStyle(tint(GRAVITY.void), 1);
    g.fillCircle(ax, ay, 5);
    g.lineStyle(2, tint(tones.hot), 0.9);
    g.strokeCircle(ax, ay, 7 + Math.sin(t * 6) * 0.8);
  }

  /**
   * A caught projectile in orbit (Gravity Aura): the round itself, held inside a little cage of
   * bent space, so it reads as *captured* rather than as a stray dot.
   */
  static drawCaughtOrb(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn, tones: GravityTones,
    x: number, y: number, t: number,
  ): void {
    for (let i = 0; i < 3; i++) {
      const a = t * 2.4 + (i / 3) * TAU;
      gravArmLayered(g, tint, tones, x, y, a, 11, 4, 2, 0.8, { curl: 1.4, edge: false, head: false });
    }
    g.fillStyle(tint(tones.dark), 0.95);
    g.fillCircle(x, y, 5.5);
    g.fillStyle(tint(tones.lit), 1);
    g.fillCircle(x, y, 3.6);
    g.fillStyle(tint(tones.spark), 0.9);
    g.fillCircle(x - 1.1, y - 1.2, 1.5);
  }

  /**
   * A falling Starfall star: a collapsed star being dragged out of the sky. A void core inside a
   * lensed photon ring, wrapped in a pinched stellar flare, with matter still spiralling into it
   * and a wake of bent light stretched out behind.
   *
   * Deliberately the opposite read to `drawMeteor`: no rock and no fire anywhere on it — only
   * light, void and the element's own colour. A meteor is a thing that fell; a Starfall star is a
   * thing that *collapsed*, and the pinched four-point flare is the only silhouette in gravity
   * that says so. That is what keeps a rain of twenty of them from reading as small meteors.
   */
  static drawStar(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn, tones: GravityTones,
    x: number, y: number, t: number,
  ): void {
    // Phase comes in per-orb, so twenty stars twinkle and turn out of step with each other.
    const twinkle = 0.86 + 0.14 * Math.sin(t * 9);
    const spin = t * 0.35;

    // The wake: the column of space it has already fallen through, still lit.
    g.fillStyle(tint(tones.dark), 0.5);
    plume(g, x, y - 3, -Math.PI / 2, 34, 4.2, 2.2, t * 3.4);
    g.fillStyle(tint(tones.lit), 0.4);
    plume(g, x, y - 3, -Math.PI / 2, 24, 1.9, 1.6, t * 4.6);

    // Matter still falling into it, cycling inward — it is feeding the whole way down.
    for (let i = 0; i < 3; i++) {
      const phase = (t * 1.3 + i / 3) % 1;
      const r = 21 * (1 - easeIn(phase));
      gravArmLayered(g, tint, tones, x, y, (i / 3) * TAU + t * 1.1, r, r * 0.3,
        2.2 * (1 - phase * 0.5), 0.62 * (1 - phase * 0.35), { curl: 1.5, edge: false, head: false });
    }

    // Glare: a long vertical smear of light along the fall, then the pinched four-point flare.
    g.fillStyle(tint(tones.lit), 0.4);
    starburst(g, x, y, 27 * twinkle, 1.4, 2, Math.PI / 2, 3.4);
    g.fillStyle(tint(tones.hot), 0.8);
    starburst(g, x, y, 17 * twinkle, 2, 4, spin, 3);
    g.fillStyle(tint(tones.spark), 0.9 * twinkle);
    starburst(g, x, y, 9.5 * twinkle, 1.4, 4, -spin * 1.6, 2.4);

    // Light bent around it: a round photon ring with a squashed ghost outside it.
    g.lineStyle(1, tint(GRAVITY.violet), 0.35);
    g.strokeEllipse(x, y, 21, 15);
    g.lineStyle(1.4, tint(tones.spark), 0.6);
    g.strokeCircle(x, y, 6.6 + Math.sin(t * 6) * 0.5);

    // And the hole at the middle of all that light.
    g.fillStyle(tint(GRAVITY.void), 1);
    g.fillCircle(x, y, 4.4);
    g.lineStyle(1.2, tint(tones.hot), 0.9);
    g.strokeCircle(x, y, 5.1);
  }

  // ── Anti-Grav (F+) ──────────────────────────────────────────────────────

  /**
   * The Anti-Grav landing mark: the patch of ground the caster is about to arrive on.
   *
   * Read entirely off `progress` (0 = just launched, 1 = touchdown). Far away it is a wide,
   * faint smudge with a slow ring; as the fall closes it darkens, tightens and the caster
   * themself resolves out of the sky above it as a speck that grows into a dark star. The
   * shadow *shrinking* while the body *grows* is the whole depth cue — a shadow that only
   * ever grew would read as something rising, not falling.
   */
  static drawLandingShadow(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn, tones: GravityTones,
    x: number, y: number, t: number, progress: number,
  ): void {
    const p = Phaser.Math.Clamp(progress, 0, 1);
    // Wide and vague at altitude, tight and black at touchdown.
    const r = 70 - 44 * easeIn(p);
    const dark = 0.16 + 0.6 * p * p;

    g.fillStyle(tint(GRAVITY.void), dark);
    g.fillEllipse(x, y, r * 2, r * 0.82);
    g.fillStyle(tint(tones.dark), dark * 0.55);
    g.fillEllipse(x, y, r * 2.5, r * 1.05);

    // Space starting to bow toward the point of arrival.
    for (let i = 0; i < 5; i++) {
      const phase = (t * (0.7 + p) + i / 5) % 1;
      const ar = r * 1.5 * (1 - easeIn(phase));
      g.fillStyle(tint(tones.lit), 0.35 * (1 - phase) * (0.4 + p * 0.6));
      gravArm(g, x, y, (i / 5) * TAU + t * 0.9, ar, ar * 0.3, 3.2 * (1 - phase * 0.5) * (0.6 + p), 1.5);
    }

    // The countdown ring: sweeps in once per fall and closes exactly on impact.
    g.lineStyle(2 + 2.5 * p, tint(tones.hot), 0.35 + 0.55 * p);
    g.strokeEllipse(x, y, r * 2 * (1.35 - 0.35 * p), r * 0.82 * (1.35 - 0.35 * p));

    // The caster falling into it — nothing for the first half, then a dark star growing fast.
    if (p > 0.45) {
      const fp = (p - 0.45) / 0.55;
      const bodyY = y - 210 * (1 - easeIn(fp));
      const br = 4 + 13 * fp;
      g.fillStyle(tint(GRAVITY.violet), 0.3);
      g.fillCircle(x, bodyY, br * 1.9);
      g.fillStyle(tint(tones.body), 0.9);
      g.fillCircle(x, bodyY, br);
      g.fillStyle(tint(GRAVITY.void), 1);
      g.fillCircle(x, bodyY, br * 0.55);
      g.fillStyle(tint(tones.spark), 0.85);
      g.fillCircle(x - br * 0.3, bodyY - br * 0.32, br * 0.22);
      // The column of air it is coming down through.
      g.fillStyle(tint(tones.lit), 0.28 * fp);
      plume(g, x, bodyY - br, -Math.PI / 2, 70 * fp, 5 * fp, 2.4, t * 4);
    }
  }

  // ── Moon Rider (Q+) ─────────────────────────────────────────────────────

  /**
   * Night over the whole arena while the moon is up: a deep wash with a star field punched
   * through it. The stars are seeded off their index, so they hold still and only twinkle —
   * a re-rolled sky every frame would strobe.
   */
  static drawNight(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    w: number, h: number, t: number, intensity: number,
  ): void {
    const a = Phaser.Math.Clamp(intensity, 0, 1);
    if (a <= 0.01) return;
    // Dark enough to read as night, light enough that both fighters stay legible under it —
    // the arena still has to be playable while the moon is up.
    g.fillStyle(tint(GRAVITY.void), 0.34 * a);
    g.fillRect(0, 0, w, h);
    g.fillStyle(tint(GRAVITY.abyss), 0.16 * a);
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 90; i++) {
      const sx = rnd(i * 1.7) * w;
      const sy = rnd(i * 3.1 + 5) * h;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rnd(i) * 1.8) + i));
      const r = 0.7 + rnd(i * 5.3) * 1.5;
      g.fillStyle(tint(i % 7 === 0 ? GRAVITY.lilac : GRAVITY.pale), 0.75 * twinkle * a);
      g.fillCircle(sx, sy, r);
      if (i % 11 === 0) {
        g.fillStyle(tint(GRAVITY.white), 0.4 * twinkle * a);
        starburst(g, sx, sy, r * 5, r * 0.5, 4, 0, 3);
      }
    }
  }

  /**
   * The moonlight pool the ridden moon drags across the ground, and the lit rim it throws on
   * the arena edge it is currently hugging. Meant to be drawn on an ADD-blended layer over
   * the night wash — that is what makes it read as light rather than more paint.
   */
  static drawMoonlight(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    x: number, y: number, radius: number, t: number,
  ): void {
    const pulse = 1 + 0.045 * Math.sin(t * 2.2);
    for (let i = 6; i >= 1; i--) {
      g.fillStyle(tint(GRAVITY.moonlit), 0.035 + i * 0.006);
      g.fillCircle(x, y, radius * i * 1.5 * pulse);
    }
    g.fillStyle(tint(GRAVITY.white), 0.14);
    g.fillCircle(x, y, radius * 1.5);
  }

  /**
   * A firefly: a soft blown-out mote with a hard core. Draw on the same ADD layer as the
   * moonlight. `glow` 0→1 is its own blink phase, so a swarm never pulses in unison.
   */
  static drawFirefly(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    x: number, y: number, glow: number,
  ): void {
    if (glow <= 0.02) return;
    g.fillStyle(tint(0xccff88), 0.06 * glow);
    g.fillCircle(x, y, 9);
    g.fillStyle(tint(0xddff99), 0.14 * glow);
    g.fillCircle(x, y, 5);
    g.fillStyle(tint(0xeeffbb), 0.5 * glow);
    g.fillCircle(x, y, 2.1);
    g.fillStyle(tint(GRAVITY.white), 0.85 * glow);
    g.fillCircle(x, y, 1);
  }

  /**
   * The flying moon: `drawMoon`'s body plus the things that only make sense once it is moving —
   * a compression bow-wave out front and a wake of torn dust behind. `heading` is its direction
   * of travel in radians.
   */
  static drawFlyingMoon(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    x: number, y: number, radius: number, t: number, hpFrac: number, heading: number,
  ): void {
    const bx = Math.cos(heading), by = Math.sin(heading);
    // Wake: matter it has ripped loose, curling as it falls behind.
    for (let i = 0; i < 7; i++) {
      const f = (i + (t * 2.6) % 1) / 7;
      const d = radius * (1.1 + f * 2.6);
      const spread = (rnd(i * 9.7) - 0.5) * radius * 1.1 * f;
      g.fillStyle(tint(GRAVITY.moonDark), 0.35 * (1 - f));
      g.fillCircle(x - bx * d - by * spread, y - by * d + bx * spread, radius * 0.34 * (1 - f * 0.6));
    }
    // Bow-wave: space piling up in front of something this heavy.
    g.lineStyle(2.6, tint(GRAVITY.lilac), 0.5);
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = heading - 1.0 + (i / 12) * 2.0;
      const rr = radius * (1.28 + 0.05 * Math.sin(t * 7 + i));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();

    GravityFx.drawMoon(g, tint, x, y, radius, t, hpFrac);
  }

  /**
   * The Crushing Field (Q+ F): the whole screen visibly pulled down. Sheets of matter raking
   * downward, sagging pressure lines, a black press along the top and a lit compression band
   * where everything is piling up against the floor.
   *
   * `strength` 0→1 ramps the whole thing in and out so it never snaps on or off.
   */
  static drawCrushField(
    g: Phaser.GameObjects.Graphics, tint: GravityColorFn,
    w: number, h: number, t: number, strength: number,
  ): void {
    const s = Phaser.Math.Clamp(strength, 0, 1);
    if (s <= 0.01) return;

    // The press: dark at the top, weight coming down out of it.
    for (let i = 0; i < 6; i++) {
      g.fillStyle(tint(GRAVITY.void), 0.06 * s);
      g.fillRect(0, 0, w, h * (0.1 + i * 0.06));
    }

    // Rain of falling matter — fast, dense, and always straight down.
    for (let i = 0; i < 46; i++) {
      const sx = rnd(i * 2.3) * w;
      const speed = 1.6 + rnd(i * 7.1) * 2.4;
      const fy = ((t * speed + rnd(i * 4.9)) % 1) * (h + 120) - 60;
      const len = 26 + rnd(i * 11.3) * 46;
      g.fillStyle(tint(i % 4 === 0 ? GRAVITY.violet : GRAVITY.amethyst), (0.16 + 0.2 * rnd(i * 3.7)) * s);
      g.fillRect(sx, fy, 1.6 + rnd(i * 6.1) * 1.6, len);
    }

    // Pressure lines: horizontals that sag more the lower down they sit.
    for (let row = 1; row < 8; row++) {
      const baseY = (row / 8) * h;
      const sag = (row / 8) * 26 * (0.7 + 0.3 * Math.sin(t * 2.4 + row));
      g.lineStyle(1.2, tint(GRAVITY.lilac), 0.16 * s);
      g.beginPath();
      for (let i = 0; i <= 18; i++) {
        const px = (i / 18) * w;
        const py = baseY + Math.sin((i / 18) * Math.PI) * sag;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }

    // Floor: everything that fell is stacking up against it.
    const floorPulse = 0.5 + 0.5 * Math.sin(t * 5);
    g.fillStyle(tint(GRAVITY.violet), 0.1 * s * (0.6 + floorPulse * 0.4));
    g.fillRect(0, h - 26, w, 26);
    g.lineStyle(2.5, tint(GRAVITY.lilac), 0.4 * s);
    g.beginPath();
    for (let i = 0; i <= 26; i++) {
      const px = (i / 26) * w;
      g.lineTo(px, h - 22 + Math.sin(t * 6 + i * 0.7) * 3);
    }
    g.strokePath();

    // And a hard vignette, because the edges of the screen are being squeezed too.
    for (let i = 0; i < 5; i++) {
      const inset = i * 7;
      g.lineStyle(9, tint(GRAVITY.void), 0.07 * s * (5 - i) / 5);
      g.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    }
  }
}

// ── GravityWell ───────────────────────────────────────────────────────────

/**
 * A persistent well locked to a point or a fighter — the Grav Bomb vortex, the Meteor Rain
 * recording aura, the mastery's captured-orb halo. Driven by whoever owns it: call `update`
 * every frame with the position and how charged it is.
 */
export class GravityWell {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: GravityColorFn,
    private tones: GravityTones,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setTones(tones: GravityTones): void { this.tones = tones; }
  setRadius(r: number): void { this.radius = r; }

  /** `charge` 0→1 tightens the spiral and opens the horizon. */
  update(delta: number, x: number, y: number, charge = 0, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const t = this.t;
    const c = Phaser.Math.Clamp(charge, 0, 1);

    // The catchment: a dim disc with a lensed rim.
    g.fillStyle(this.tint(this.tones.dark), (0.1 + c * 0.14) * alpha);
    g.fillCircle(x, y, this.radius);
    g.lineStyle(2, this.tint(this.tones.lit), (0.45 + c * 0.4) * alpha);
    g.strokeCircle(x, y, this.radius);
    g.lineStyle(1, this.tint(GRAVITY.violet), 0.3 * alpha);
    g.strokeCircle(x, y, this.radius * (1.05 + 0.03 * Math.sin(t * 3)));

    // Arms winding in — faster and tighter the more charge is on it.
    for (let i = 0; i < 6; i++) {
      const phase = (t * (0.55 + c * 0.9) + i / 6) % 1;
      const r = this.radius * (1 - easeIn(phase));
      gravArmLayered(
        g, this.tint, this.tones, x, y,
        (i / 6) * TAU + t * (0.7 + c), r, r * 0.3,
        (2.4 + c * 2.4) * (1 - phase * 0.5), (0.5 + c * 0.4) * alpha,
        { curl: 1.4 + c, edge: false },
      );
    }

    // The horizon only opens once the thing is actually charged.
    if (c > 0.05) {
      g.fillStyle(this.tint(GRAVITY.void), 0.9 * alpha * c);
      g.fillCircle(x, y, this.radius * 0.16 * c);
      g.lineStyle(2, this.tint(this.tones.hot), 0.85 * alpha * c);
      g.strokeCircle(x, y, this.radius * 0.22 * c);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── GravityAvatar ─────────────────────────────────────────────────────────

/** Concentric discs of one dark-star fist, outermost first. */
const GRAVITY_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: GRAVITY.purple, alpha: 0.3 },
    { r: 6.8, color: GRAVITY.amethyst, alpha: 0.95 },
    // Gravity's hands are the only ones here whose *core* is darker than their shell — a fist
    // with a hole in it reads as a well without needing anything else.
    { r: 3.4, color: GRAVITY.void, alpha: 1 },
    { r: 1.5, color: GRAVITY.pale, alpha: 1, ox: -2.4, oy: -2.4 },
  ],
  eyeWhite: GRAVITY.pale,
  eyePupil: GRAVITY.void,
  // Heavy: a lot of drag, and it smears along its travel.
  squash: { div: 10, x: 0.6, y: 0.3 },
};

/**
 * The gravity character rig: two dark-star fists, a pair of eyes, and a tilted ring system
 * orbiting the crown. The hands, eyes and gestures come from BaseAvatar; what gravity adds is
 * the ring, the moons riding it, and the well pooling underfoot.
 */
export class GravityAvatar extends BaseAvatar {
  private fx: GravityFx;
  private tones: GravityTones;
  /** Riding the moon — the rig sits higher and the ring tilts flat. */
  private riding = false;

  constructor(scene: Phaser.Scene, tint: GravityColorFn, tones: GravityTones = VOID_TONES, depth = 6) {
    super(scene, tint, depth, GRAVITY_AVATAR);
    this.fx = new GravityFx(scene, tint);
    this.tones = tones;
    if (tones !== VOID_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.lit), 0.95));
    }
  }

  /** Moon Rider is up: the ring flattens out into an orbital plane. */
  setRiding(on: boolean): void { this.riding = on; }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered gravity
   * user is identifiable at a glance before they cast anything: white eyes, a much wider event
   * horizon on each fist with a hard photon rim, a second ring, and three moons riding it.
   * Shape changes, not just brighter tints.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? GRAVITY.white : GRAVITY.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 15 : 11);
      halo.setFillStyle(this.tint(on ? this.tones.lit : GRAVITY.purple), on ? 0.34 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(GRAVITY.pale), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving fists shed matter, which curls as it goes. */
  protected emitTrail(x: number, y: number): void {
    this.fx.arms(x, y, 1, { speed: 14, size: 2.2, life: 620, depth: 5, tones: this.tones });
  }

  /** A well pooling under the character, with matter falling in toward its feet. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(GRAVITY.void), a * 0.34 * this.intensity);
    g.fillEllipse(x, y + 7, 54 * this.intensity, 24 * this.intensity);
    g.fillStyle(this.tint(this.tones.body), a * 0.2 * this.intensity);
    g.fillEllipse(x, y + 6, 36 * this.intensity, 16 * this.intensity);
    for (let i = 0; i < 5; i++) {
      const phase = (this.t * 0.6 + i / 5) % 1;
      const r = 26 * this.intensity * (1 - phase * 0.85);
      g.fillStyle(this.tint(this.tones.lit), a * 0.35 * (1 - phase));
      gravArm(g, x, y + 6, (i / 5) * TAU + this.t * 0.8, r, r * 0.3, 2.4 * (1 - phase * 0.5), 1.5);
    }
  }

  /**
   * The ring system: an inclined band of matter orbiting the head with moons riding it. Rooted
   * at the crown so it never covers the face, and drawn over the sprite so the near half of the
   * ring passes in front of the body — which is what sells it as an orbit rather than a halo.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 22;
    const scale = (this.mastered ? 1.25 : 1) * (0.94 + this.intensity * 0.08);
    // Riding the moon flattens the ring into a proper orbital plane.
    const tiltY = (this.riding ? 0.16 : 0.34) * scale;
    const rings = this.mastered ? 2 : 1;

    for (let k = 0; k < rings; k++) {
      const rx = (25 + k * 7) * scale;
      const ry = rx * tiltY;
      const lean = 0.28 + k * 0.1;
      const segs = 30;
      // Far half first, then the moons, then the near half — that ordering is the depth cue.
      for (const half of [0, 1]) {
        g.lineStyle((2.6 - k * 0.7) * scale, this.tint(half === 0 ? this.tones.dark : this.tones.lit),
          (half === 0 ? 0.7 : 0.9) * alpha);
        g.beginPath();
        for (let i = 0; i <= segs / 2; i++) {
          const ang = Math.PI * (half + i / (segs / 2));
          const ox = Math.cos(ang) * rx, oy = Math.sin(ang) * ry;
          const px = x + ox * Math.cos(lean) - oy * Math.sin(lean);
          const py = rootY + ox * Math.sin(lean) + oy * Math.cos(lean);
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    }

    // Moons riding the ring — one unmastered, three once mastered.
    const moons = this.mastered ? 3 : 1;
    for (let i = 0; i < moons; i++) {
      const ang = this.t * 1.1 + (i / moons) * TAU;
      const rx = 25 * scale, ry = rx * tiltY, lean = 0.28;
      const ox = Math.cos(ang) * rx, oy = Math.sin(ang) * ry;
      const px = x + ox * Math.cos(lean) - oy * Math.sin(lean);
      const py = rootY + ox * Math.sin(lean) + oy * Math.cos(lean);
      const near = Math.sin(ang) > 0;
      const r = (near ? 3.6 : 2.6) * scale;
      g.fillStyle(this.tint(GRAVITY.moonDark), 0.95 * alpha);
      g.fillCircle(px, py, r);
      g.fillStyle(this.tint(GRAVITY.moon), 0.95 * alpha);
      g.fillCircle(px - r * 0.22, py - r * 0.24, r * 0.72);
      g.fillStyle(this.tint(GRAVITY.moonlit), 0.8 * a);
      g.fillCircle(px - r * 0.4, py - r * 0.42, r * 0.32);
    }
  }
}
