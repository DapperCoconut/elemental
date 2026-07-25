import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Hunt renders: the hunter avatar (ball fists + eyes + a pair
 * of ears that grow into a snarling head as the beast comes out), the blood auras, and the
 * one-shot effects every hunt ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes hunt
 * hunt: the gash, the palette, and the effects built out of it.
 *
 * Colours must come from the HUNT palette below. Hunt has no colour-slot cosmetic yet, but every
 * call still routes through the owner's `huntColor` mapper, so the day one lands it is a table
 * edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.huntColor bound to one owner. */
export type HuntColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const HUNT = {
  /** Hide and dried blood — what everything is silhouetted against. */
  pitch: 0x1a0a06,
  hide: 0x3d1a0e,
  rust: 0x6b2412,
  /** The element's own heat. */
  ember: 0xcc4400,
  flare: 0xff6600,
  spark: 0xffaa44,
  /** Fresh blood. */
  gore: 0x8b0000,
  blood: 0xcc1111,
  fresh: 0xff2222,
  /** Teeth, claws and bone. */
  bone: 0xf2e3c8,
  /** Monster-hunter silver: the hybrid form's kit. */
  silver: 0xdddde6,
  steel: 0x9aa0ab,
  /** Blood Moon. */
  moon: 0xff5544,
  moonDark: 0x440d0d,
  smoke: 0x2a2420,
  white: 0xffffff,
} as const;

/** One coherent set of shades. `crust → body → wound → lit` runs dark to bright. */
export interface HuntTones {
  crust: number;
  body: number;
  wound: number;
  lit: number;
  spark: number;
}

/** Human form: gunpowder orange over dried blood. */
export const HUNTER_TONES: HuntTones = {
  crust: HUNT.hide, body: HUNT.ember, wound: HUNT.flare, lit: HUNT.spark, spark: HUNT.white,
};
/** The NPC's read darker so two hunters never blur together. */
export const NPC_TONES: HuntTones = {
  crust: HUNT.pitch, body: HUNT.rust, wound: HUNT.ember, lit: HUNT.flare, spark: HUNT.spark,
};
/** Beast form: it stops being about powder and starts being about blood. */
export const BEAST_TONES: HuntTones = {
  crust: 0x2c0606, body: HUNT.gore, wound: HUNT.blood, lit: HUNT.fresh, spark: HUNT.bone,
};
/** Blood Moon: everything under it runs hot red. */
export const MOON_TONES: HuntTones = {
  crust: HUNT.moonDark, body: HUNT.blood, wound: HUNT.moon, lit: 0xff8877, spark: HUNT.white,
};
/** Hybrid form: silver shot, silver blade, silver trim. */
export const SILVER_TONES: HuntTones = {
  crust: 0x3a3f46, body: HUNT.steel, wound: HUNT.silver, lit: 0xf2f4ff, spark: HUNT.white,
};

export const tonesFor = (owner: 'player' | 'npc'): HuntTones =>
  (owner === 'player' ? HUNTER_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A gash: the crescent a claw leaves. It comes to a point at *both* ends and carries its mass in
 * the middle, bowed along its length — the opposite of every other primitive in the game, which
 * are all rooted at one end and taper away from it. That two-ended, bellied silhouette is the
 * whole read of the element: nothing hunt does is a jet or a shard, it is a wound.
 *
 * `curve` bows the centreline; `rip` tears one flank so a fresh cut never looks stamped.
 */
export function huntGash(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve = 0.32,
  rip = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const STEPS = 12;

  // Centreline bow and the belly profile that puts the mass in the middle.
  const bow = (f: number): number => curve * len * Math.sin(Math.PI * f);
  const w = (f: number): number => halfW * Math.pow(Math.sin(Math.PI * f), 0.62);

  const at = (f: number, side: number): [number, number] => {
    // The torn flank only ever bites into one side, which is what makes the cut directional.
    const tear = side < 0 && rip > 0 ? 1 - rip * (0.35 + 0.65 * Math.abs(Math.sin(f * 9.3))) : 1;
    const off = bow(f) + side * w(f) * tear;
    return [cx + cos * (f - 0.5) * len + px * off, cy + sin * (f - 0.5) * len + py * off];
  };

  g.beginPath();
  const start = at(0, 1);
  g.moveTo(start[0], start[1]);
  for (let i = 1; i <= STEPS; i++) { const p = at(i / STEPS, 1); g.lineTo(p[0], p[1]); }
  for (let i = STEPS; i >= 0; i--) { const p = at(i / STEPS, -1); g.lineTo(p[0], p[1]); }
  g.closePath();
  g.fillPath();
}

export interface GashLayerOpts {
  curve?: number;
  rip?: number;
  /** Bright bone edge along the outer flank. Default true. */
  edge?: boolean;
  /** Droplets flicked off the two points. Default true. */
  flick?: boolean;
}

/**
 * Layered gash: a dark crust, the body of the wound, a hot inner channel, a bone-bright edge
 * along the leading flank and two droplets thrown off the points.
 *
 * The edge is what stops a ring of gashes reading as a set of curved bananas — a real cut has
 * one lit lip where the flesh is turned up, and the eye reads depth off that alone.
 */
export function huntGashLayered(
  g: Phaser.GameObjects.Graphics,
  tint: HuntColorFn, tones: HuntTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  opts: GashLayerOpts = {},
): void {
  const curve = opts.curve ?? 0.32;
  const rip = opts.rip ?? 0.22;

  g.fillStyle(tint(tones.crust), alpha * 0.8);
  huntGash(g, cx, cy, angle, len * 1.05, halfW * 1.4, curve, rip * 0.5);
  g.fillStyle(tint(tones.body), alpha * 0.92);
  huntGash(g, cx, cy, angle, len, halfW, curve, rip);
  g.fillStyle(tint(tones.wound), alpha * 0.9);
  huntGash(g, cx, cy, angle, len * 0.9, halfW * 0.5, curve, rip);
  g.fillStyle(tint(tones.lit), alpha * 0.85);
  huntGash(g, cx, cy, angle, len * 0.62, halfW * 0.2, curve, 0);

  if (opts.edge !== false) {
    // One lit lip only. Outlining the whole gash flattens it to a decal.
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    g.lineStyle(Math.max(0.8, halfW * 0.24), tint(tones.spark), alpha * 0.6);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const off = curve * len * Math.sin(Math.PI * f) + halfW * Math.pow(Math.sin(Math.PI * f), 0.62);
      const x = cx + cos * (f - 0.5) * len + px * off;
      const y = cy + sin * (f - 0.5) * len + py * off;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  if (opts.flick !== false) {
    // Blood thrown off the two points, which is where a real claw leaves it.
    for (const s of [-0.5, 0.5]) {
      const x = cx + Math.cos(angle) * s * len * 1.02;
      const y = cy + Math.sin(angle) * s * len * 1.02;
      g.fillStyle(tint(tones.body), alpha * 0.7);
      g.fillCircle(x, y, halfW * 0.34);
      g.fillStyle(tint(tones.lit), alpha * 0.55);
      g.fillCircle(x, y, halfW * 0.16);
    }
  }
}

export interface FragOpts {
  /** Shrapnel slivers flung out. Defaults to radius/8. */
  shards?: number;
  /** Smoke puffs left behind. Defaults to radius/40. */
  smoke?: number;
  /** Leave a scorched, blood-flecked crater. Default true. */
  crater?: boolean;
  depth?: number;
  duration?: number;
  tones?: HuntTones;
}

export interface SplatterOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Blood falls. Positive values sink the droplets. */
  fall?: number;
  tones?: HuntTones;
}

// ── HuntFx ────────────────────────────────────────────────────────────────

/**
 * One-shot hunt effects. Cheap to construct — build one per owner and hand it the owner's
 * colour mapper.
 */
export class HuntFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: HuntColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Expanding front. Hunt's wobbles hard — nothing this element does is tidy. */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 5), 16, 64);
    const jitter = Array.from({ length: segs }, () => 0.84 + Math.random() * 0.32);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.6)), c, 0.85 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const k = i % segs;
        const a = (k / segs) * TAU;
        const rr = r * jitter[k];
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: HuntTones = HUNTER_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.wound, depth);
  }

  /**
   * A rake: three (or more) parallel gashes opening in sequence across the aim, each a beat
   * behind the last, then closing. This is hunt's signature — it is what a claw does, and it
   * replaces every "wide flat oval scaled sideways" the element used to draw.
   */
  rake(
    x: number, y: number, angle: number, len: number,
    count = 3, depth = 8, tones: HuntTones = HUNTER_TONES, spread = 13,
  ): void {
    const claws = Array.from({ length: count }, (_, i) => ({
      off: (i - (count - 1) / 2) * spread,
      delay: i * 0.07,
      len: len * (0.82 + Math.random() * 0.36),
      w: len * (0.055 + Math.random() * 0.03),
      curve: 0.2 + Math.random() * 0.25,
    }));
    // The gashes lie across the aim, so the rake sweeps through the target rather than at it.
    const across = angle + Math.PI / 2;
    const px = -Math.sin(across), py = Math.cos(across);
    this.anim(depth, 300, (g, t) => {
      for (const c of claws) {
        const lt = (t - c.delay) / (1 - c.delay);
        if (lt <= 0) continue;
        const open = lt < 0.3 ? easeOut(lt / 0.3) : 1;
        const fade = 1 - easeIn(Math.max(0, (lt - 0.35) / 0.65));
        huntGashLayered(
          g, this.tint, tones,
          x + px * c.off * -1 + Math.cos(angle) * lt * 6,
          y + py * c.off * -1 + Math.sin(angle) * lt * 6,
          across, c.len * open, c.w * open, fade, { curve: c.curve, rip: 0.3 },
        );
      }
    });
  }

  /** Blood thrown out of a wound: droplets that arc, sink and leave a smear where they land. */
  splatter(x: number, y: number, count: number, opts: SplatterOpts = {}): void {
    const tones = opts.tones ?? BEAST_TONES;
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 520;
    const fall = opts.fall ?? 44;
    const depth = opts.depth ?? 6;

    const drops = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a), ang: a,
        v: speed * (0.4 + Math.random()),
        r: size * (0.5 + Math.random() * 0.9),
        delay: Math.random() * 0.2,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const d of drops) {
        const lt = (t - d.delay) / (1 - d.delay);
        if (lt <= 0) continue;
        const dist = d.v * easeOut(lt) * (life / 1000);
        const ex = x + d.cos * dist;
        const ey = y + d.sin * dist + fall * lt * lt;
        const fade = 1 - lt * lt;
        // A droplet in flight is a teardrop, not a dot — stretch it along its travel.
        g.fillStyle(this.tint(tones.crust), 0.7 * fade);
        huntGash(g, ex, ey, d.ang, d.r * 4.4 * fade, d.r * 1.1 * fade, 0.1, 0);
        g.fillStyle(this.tint(tones.body), 0.9 * fade);
        g.fillCircle(ex, ey, d.r * fade);
        g.fillStyle(this.tint(tones.lit), 0.7 * fade);
        g.fillCircle(ex - d.r * 0.25, ey - d.r * 0.28, d.r * 0.36 * fade);
      }
    });
  }

  /** A pool of blood and powder-burn left where something went off. Hunt's scorch mark. */
  crater(x: number, y: number, radius: number, depth = 1, tones: HuntTones = HUNTER_TONES): void {
    const lobes = Array.from({ length: 8 }, (_, i) => ({
      ang: (i / 8) * TAU + Math.random() * 0.4,
      d: radius * (0.2 + Math.random() * 0.5),
      r: radius * (0.24 + Math.random() * 0.3),
    }));
    const flecks = Array.from({ length: 9 }, () => {
      const a = Math.random() * TAU;
      const d = radius * (0.5 + Math.random() * 0.8);
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, r: 1 + Math.random() * 2.4, ang: a };
    });
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94;
      g.fillStyle(this.tint(HUNT.pitch), 0.6 * a);
      for (const l of lobes) g.fillCircle(x + Math.cos(l.ang) * l.d, y + Math.sin(l.ang) * l.d * 0.7, l.r);
      g.fillStyle(this.tint(tones.crust), 0.35 * a);
      g.fillEllipse(x, y, radius * 1.4, radius * 0.95);
      for (const f of flecks) {
        g.fillStyle(this.tint(HUNT.gore), 0.6 * a);
        huntGash(g, f.x, f.y, f.ang, f.r * 3.4, f.r * 0.8, 0.2, 0.3);
      }
    });
  }

  /** Slivers of casing thrown out of a frag. Straight, hard and fast — not blood. */
  shrapnel(x: number, y: number, count: number, radius: number, depth = 6, tones: HuntTones = HUNTER_TONES): void {
    const bits = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        cos: Math.cos(a), sin: Math.sin(a), ang: a,
        v: radius * (1.4 + Math.random() * 1.4),
        len: 5 + Math.random() * 9,
        spin: (Math.random() - 0.5) * 22,
      };
    });
    this.anim(depth, 420, (g, t) => {
      for (const b of bits) {
        const d = b.v * easeOut(t) * 0.42;
        const ex = x + b.cos * d, ey = y + b.sin * d + 26 * t * t;
        const fade = 1 - t * t;
        g.lineStyle(2 * fade, this.tint(tones.spark), 0.85 * fade);
        const a = b.ang + b.spin * t * 0.05;
        g.lineBetween(ex, ey, ex - Math.cos(a) * b.len, ey - Math.sin(a) * b.len);
        g.lineStyle(1 * fade, this.tint(HUNT.silver), 0.9 * fade);
        g.lineBetween(ex, ey, ex - Math.cos(a) * b.len * 0.5, ey - Math.sin(a) * b.len * 0.5);
      }
    });
  }

  /** Smoke: powder haze that swells, lifts and thins. */
  smoke(x: number, y: number, count: number, radius: number, depth = 5): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius,
      oy: (Math.random() - 0.5) * radius * 0.7,
      r: radius * (0.3 + Math.random() * 0.35),
      drift: (Math.random() - 0.5) * 24,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 1300, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(HUNT.smoke), 0.34 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 26 * lt, p.r * (0.5 + lt * 1.5));
      }
    });
  }

  /**
   * The body of a frag: gash lobes blown out of the seat of the blast, holding then peeling
   * back. Reads as a shell coming apart rather than a disc being scaled.
   */
  fragBloom(x: number, y: number, radius: number, duration: number, depth = 6, tones: HuntTones = HUNTER_TONES): void {
    const lobes = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + Math.random() * 0.3,
      len: 0.66 + Math.random() * 0.36,
      w: 0.14 + Math.random() * 0.07,
      delay: Math.random() * 0.16,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      const core = easeOut(Math.min(1, t * 3.4));
      g.fillStyle(this.tint(tones.crust), 0.75 * fade);
      g.fillCircle(x, y, radius * 0.44 * core);
      g.fillStyle(this.tint(tones.body), 0.85 * fade);
      g.fillCircle(x, y, radius * 0.3 * core);
      for (const l of lobes) {
        const lt = Math.max(0, (t - l.delay) / (1 - l.delay));
        const grow = easeOut(Math.min(1, lt * 2.2));
        const drift = radius * (0.3 + 0.4 * easeIn(lt));
        huntGashLayered(
          g, this.tint, tones,
          x + Math.cos(l.ang) * drift, y + Math.sin(l.ang) * drift,
          l.ang + Math.PI / 2, radius * l.len * grow, radius * l.w * (1 - lt * 0.3), 0.9 * fade,
          { curve: 0.28, rip: 0.28, flick: false },
        );
      }
      if (t < 0.35) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.35) * 0.9);
        g.fillCircle(x, y, radius * 0.2);
      }
    });
  }

  /** Full frag: flash, lobes, two fronts, shrapnel, smoke and a crater. Six layers minimum. */
  frag(x: number, y: number, radius: number, opts: FragOpts = {}): void {
    const tones = opts.tones ?? HUNTER_TONES;
    const shards = opts.shards ?? Math.max(6, Math.round(radius / 8));
    const puffs = opts.smoke ?? Math.max(2, Math.round(radius / 40));
    const dur = opts.duration ?? Math.round(320 + radius * 1.3);
    const depth = opts.depth ?? 6;

    if (opts.crater !== false) this.crater(x, y, radius * 0.5, 1, tones);
    this.fragBloom(x, y, radius * 0.66, dur, depth, tones);
    this.flash(x, y, radius * 0.34, depth + 1, tones);
    this.ring(x, y, radius * 0.18, radius, tones.lit, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.15, radius * 1.3, tones.body, dur, 3.5, depth));
    this.shrapnel(x, y, shards, radius, depth, tones);
    this.splatter(x, y, Math.max(3, Math.round(radius / 16)), {
      speed: radius * 1.5, size: 2.8, life: Math.round(dur * 1.2), depth, tones: BEAST_TONES,
    });
    this.smoke(x, y, puffs, radius * 0.6, depth - 1);
  }

  /**
   * A shotgun blast: the wide sheet of flame off the muzzle, the wadding thrown out with it and
   * the recoil ring. `silver` swaps the cone to the hybrid form's cold shot.
   */
  muzzleBlast(x: number, y: number, angle: number, scale = 1, depth = 9, tones: HuntTones = HUNTER_TONES): void {
    const petals = Array.from({ length: 5 }, (_, i) => ({
      off: (i - 2) * 0.22,
      len: 1 - Math.abs(i - 2) * 0.16,
    }));
    this.anim(depth, 170, (g, t) => {
      const fade = 1 - t;
      const grow = 0.55 + t * 0.9;
      for (const p of petals) {
        huntGashLayered(
          g, this.tint, tones,
          x + Math.cos(angle + p.off) * 22 * scale * grow,
          y + Math.sin(angle + p.off) * 22 * scale * grow,
          angle + p.off + Math.PI / 2,
          34 * scale * p.len * grow, 6 * scale * fade, 0.9 * fade,
          { curve: 0.2, rip: 0.2, flick: false },
        );
      }
      g.fillStyle(this.tint(tones.spark), 0.95 * fade);
      g.fillCircle(x, y, 6 * scale * (1 - t * 0.35));
      g.fillStyle(this.tint(tones.wound), 0.6 * fade);
      g.fillCircle(x, y, 11 * scale * (1 - t * 0.2));
    });
    this.smoke(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16, 2, 12 * scale, depth - 2);
  }

  /**
   * A pounce: the smear a lunging body leaves, drawn as a run of gashes down the path with a
   * kick-off burst at the launch point.
   */
  pounce(x1: number, y1: number, x2: number, y2: number, depth = 5, tones: HuntTones = BEAST_TONES): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Phaser.Math.Clamp(Math.round(dist / 22), 3, 20);
    this.anim(depth, 340, (g, t) => {
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const local = Phaser.Math.Clamp(1 - Math.abs(t * 1.5 - f) * 2.6, 0, 1);
        if (local <= 0) continue;
        const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f;
        huntGashLayered(g, this.tint, tones, cx, cy, angle + Math.PI / 2,
          26 * local, 4.5 * local, 0.7 * local, { curve: 0.25, flick: false });
      }
    });
    this.splatter(x1, y1, 4, { speed: 70, angle: angle + Math.PI, spread: 0.8, size: 2.4, life: 420, depth, tones });
  }

  /**
   * A howl: open jaws of sound punching outward — arcs rather than closed rings, because a
   * roar is directionless but a mouth is not, and the gap sells the difference.
   */
  howl(x: number, y: number, radius: number, duration = 700, depth = 9, tones: HuntTones = BEAST_TONES): void {
    const mouths = 3;
    const teeth = 14;
    this.anim(depth, duration, (g, t) => {
      for (let m = 0; m < mouths; m++) {
        const lt = t * 1.3 - m * 0.15;
        if (lt <= 0 || lt >= 1) continue;
        const r = radius * easeOut(lt);
        const fade = (1 - lt) * (1 - m * 0.2);
        g.lineStyle(4.5 * fade, this.tint(tones.wound), 0.7 * fade);
        g.strokeCircle(x, y, r);
        // Fangs standing off the front — this is a mouth, not a shockwave.
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * TAU + m * 0.2;
          huntGashLayered(g, this.tint, tones,
            x + Math.cos(a) * r, y + Math.sin(a) * r, a + Math.PI / 2,
            radius * 0.17 * fade, radius * 0.032 * fade, 0.85 * fade,
            { curve: 0.3, flick: false, edge: false });
        }
      }
      if (t < 0.4) {
        const k = 1 - t / 0.4;
        g.fillStyle(this.tint(tones.crust), 0.7 * k);
        g.fillCircle(x, y, radius * 0.2 * (0.6 + t));
        g.fillStyle(this.tint(tones.spark), 0.9 * k);
        g.fillCircle(x, y, radius * 0.08 * (0.6 + t));
      }
    });
  }

  /**
   * The beast tearing out (or being forced back in): the body splits along a rosette of gashes
   * while a front slams off it. `outward` false runs the gashes inward for the revert.
   */
  transform(x: number, y: number, radius: number, tones: HuntTones, outward = true, depth = 8): void {
    const rips = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.3,
      delay: Math.random() * 0.2,
      len: 0.7 + Math.random() * 0.5,
    }));
    this.anim(depth, 460, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const r of rips) {
        const lt = Math.max(0, (t - r.delay) / (1 - r.delay));
        const k = outward ? easeOut(lt) : 1 - easeOut(lt);
        huntGashLayered(
          g, this.tint, tones,
          x + Math.cos(r.ang) * radius * (0.4 + k * 0.7),
          y + Math.sin(r.ang) * radius * (0.4 + k * 0.7),
          r.ang + Math.PI / 2, radius * r.len * 0.7, radius * 0.14, 0.9 * fade,
          { curve: 0.3, rip: 0.35 },
        );
      }
      g.fillStyle(this.tint(tones.spark), 0.7 * fade * (outward ? 1 - t : t));
      g.fillCircle(x, y, radius * 0.32);
    });
    this.ring(x, y, radius * (outward ? 0.2 : 1.4), radius * (outward ? 1.5 : 0.3), tones.lit, 420, 5, depth);
    this.splatter(x, y, 8, { speed: radius * 2.2, size: 3, life: 520, depth, tones: BEAST_TONES });
  }

  /**
   * Hungering channel: blood dragged inward toward a tightening ring — the wind-up before a
   * Blood Hunt teleport. `follow` lets it track a caster that can still be moved.
   */
  channelHunger(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 8, tones: HuntTones = BEAST_TONES,
  ): void {
    const streams = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU,
      spin: 0.6 + (i % 3) * 0.4,
      phase: i / 9,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 24) * 0.15;
      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        huntGashLayered(g, this.tint, tones,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r, a,
          r * 0.4, 3.4 * (1 - lt), 0.8 * (1 - lt * 0.5), { curve: 0.35, flick: false });
      }
      const cr = radius * (0.1 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(tones.crust), 0.6);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(tones.body), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.spark), 0.85 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.32);
      g.lineStyle(3, this.tint(tones.wound), 0.4 + 0.45 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /** Ignition burst for a toggle: gashes locking inward around a body. */
  bloom(x: number, y: number, radius: number, count = 8, depth = 5, tones: HuntTones = HUNTER_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({ ang: (i / count) * TAU, delay: (i % 3) * 0.06 }));
    this.anim(depth, 440, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const d = radius * (1.5 - easeOut(lt) * 0.8);
        huntGashLayered(g, this.tint, tones,
          x + Math.cos(s.ang) * d, y + Math.sin(s.ang) * d, s.ang + Math.PI / 2,
          radius * 0.55, radius * 0.13, 0.85 * fade, { curve: 0.3, flick: false });
      }
    });
    this.ring(x, y, radius * 1.4, radius * 0.6, tones.lit, 380, 3.5, depth);
  }

  // ── Caller-owned Graphics painters ──────────────────────────────────────

  /**
   * A live grenade: a ribbed casing with a lit fuse whose spark climbs as the fuse burns down,
   * plus a warning halo that tightens and beats faster the closer it is to going off.
   */
  static drawGrenade(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x: number, y: number, t: number, fuseLeft: number, isHeal: boolean,
  ): void {
    const urgency = Phaser.Math.Clamp(1 - fuseLeft / 3000, 0, 1);
    const shell = isHeal ? 0x2f4a24 : HUNT.hide;
    const trim = isHeal ? 0x44cc44 : tones.wound;

    g.fillStyle(tint(HUNT.pitch), 0.35);
    g.fillEllipse(x, y + 8, 20, 7);
    g.fillStyle(tint(shell), 1);
    g.fillCircle(x, y, 9);
    // Ribbed casing: the cross-hatch a frag actually carries.
    g.lineStyle(1.1, tint(HUNT.pitch), 0.85);
    for (let i = -1; i <= 1; i++) {
      g.lineBetween(x - 8, y + i * 4.2, x + 8, y + i * 4.2);
      g.lineBetween(x + i * 4.2, y - 8, x + i * 4.2, y + 8);
    }
    g.fillStyle(tint(trim), 0.5);
    g.fillCircle(x - 2.6, y - 2.8, 3.4);
    g.fillStyle(tint(HUNT.steel), 1);
    g.fillRect(x - 1.6, y - 13, 3.2, 5);

    // The fuse spark, climbing as the fuse shortens.
    const beat = 0.55 + 0.45 * Math.sin(t * (6 + urgency * 26));
    g.fillStyle(tint(tones.lit), 0.8 + 0.2 * beat);
    g.fillCircle(x, y - 13 - urgency * 2, 2 + urgency * 1.6 + beat);
    g.fillStyle(tint(HUNT.white), 0.8 * beat);
    g.fillCircle(x, y - 13 - urgency * 2, 1 + beat * 0.8);

    // Warning halo — tightens and brightens toward the bang.
    g.lineStyle(1.4, tint(trim), 0.25 + urgency * 0.5 * beat);
    g.strokeCircle(x, y, 16 - urgency * 5 + beat * 2);
  }

  /**
   * A Hunter's Trail mark: a pair of paw prints pressed into the ground with the blood scent
   * still steaming off them, fading as the mark ages. Beats a flat translucent disc.
   */
  static drawTrail(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn, tones: HuntTones,
    x: number, y: number, radius: number, angle: number, t: number, life: number,
  ): void {
    const a = Phaser.Math.Clamp(life, 0, 1);
    g.fillStyle(tint(tones.crust), 0.16 * a);
    g.fillCircle(x, y, radius);

    // Two prints, offset along the heading so the track reads as a stride.
    for (const s of [-1, 1]) {
      const px = x + Math.cos(angle) * s * radius * 0.32 - Math.sin(angle) * s * radius * 0.3;
      const py = y + Math.sin(angle) * s * radius * 0.32 + Math.cos(angle) * s * radius * 0.3;
      g.fillStyle(tint(HUNT.gore), 0.6 * a);
      // Pad.
      g.fillEllipse(px, py, radius * 0.42, radius * 0.36);
      // Four toes fanned in front of it.
      for (let i = 0; i < 4; i++) {
        const ta = angle + (i - 1.5) * 0.38;
        g.fillCircle(px + Math.cos(ta) * radius * 0.31, py + Math.sin(ta) * radius * 0.31, radius * 0.11);
      }
    }
    // Scent rising off the mark.
    g.fillStyle(tint(tones.wound), 0.22 * a * (0.5 + 0.5 * Math.sin(t * 3)));
    g.fillCircle(x, y - radius * 0.3 - (t * 6) % 8, radius * 0.18);
  }

  /**
   * Bleeding: a wound ring with drips running down out of it, drawn on the victim every frame.
   * A status the enemy carries has to be readable between ticks, not only on them.
   */
  static drawBleed(
    g: Phaser.GameObjects.Graphics, tint: HuntColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    g.lineStyle(2, tint(HUNT.blood), 0.45 * alpha);
    g.strokeCircle(x, y, radius * (1 + 0.04 * Math.sin(t * 4)));
    g.fillStyle(tint(HUNT.gore), 0.18 * alpha);
    g.fillCircle(x, y, radius);
    // Four drips on their own loops down the body.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.sin(t * 0.7 + i) * 0.4;
      const f = ((t * 0.9 + i * 0.31) % 1);
      const dx = x + Math.cos(a) * radius * 0.8;
      const dy = y + Math.sin(a) * radius * 0.5 + f * radius * 0.9;
      const fade = (1 - f) * alpha;
      g.fillStyle(tint(HUNT.blood), 0.85 * fade);
      huntGash(g, dx, dy, Math.PI / 2, 7 * fade, 1.9 * fade, 0.1, 0);
      g.fillStyle(tint(HUNT.fresh), 0.7 * fade);
      g.fillCircle(dx, dy + 3 * fade, 1.4 * fade);
    }
  }

  /**
   * A shriek box: the forward rectangle Hybrid form screams into, drawn as a throat of stacked
   * sound bars rather than a flat translucent slab.
   */
  shriekBox(
    cx: number, cy: number, angle: number, halfLen: number, halfWide: number,
    depth = 7, tones: HuntTones = SILVER_TONES,
  ): void {
    const bars = 7;
    this.anim(depth, 320, (g, t) => {
      const fade = 1 - easeIn(t);
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const px = -sin, py = cos;
      for (let i = 0; i < bars; i++) {
        const f = i / (bars - 1);
        // Each bar launches a beat after the one behind it, so the sound visibly travels.
        const local = Phaser.Math.Clamp(t * 2.2 - f * 0.8, 0, 1);
        if (local <= 0) continue;
        const along = (f - 0.5) * halfLen * 2;
        const w = halfWide * (0.55 + 0.45 * Math.sin(Math.PI * f)) * local;
        huntGashLayered(
          g, this.tint, tones,
          cx + cos * along, cy + sin * along,
          angle + Math.PI / 2, w * 2, 4.5 * fade, 0.75 * fade,
          { curve: 0.12, rip: 0.15, flick: false },
        );
      }
      // The mouth of the box.
      g.lineStyle(2 * fade, this.tint(tones.spark), 0.7 * fade);
      g.strokeRect(cx - halfLen, cy - halfWide, halfLen * 2, halfWide * 2);
      void px; void py;
    });
  }
}

// ── HuntAura ──────────────────────────────────────────────────────────────

/**
 * Persistent blood aura clinging to a fighter (Blood Pact, Blood Moon, a bleeding victim).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class HuntAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private dripAccum = 0;
  private teeth: { ang: number; len: number; w: number; spin: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: HuntColorFn,
    private tones: HuntTones,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 7,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.teeth = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.45 + Math.random() * 0.3,
      w: 0.1 + Math.random() * 0.05,
      spin: 0.35 + Math.random() * 0.4,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }
  setTones(tones: HuntTones): void { this.tones = tones; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const beat = 0.8 + 0.2 * Math.sin(this.t * 4);
    g.fillStyle(this.tint(this.tones.crust), 0.24 * this.intensity * alpha * beat);
    g.fillCircle(x, y, this.radius * 0.95);
    g.lineStyle(2, this.tint(this.tones.wound), 0.45 * alpha * beat);
    g.strokeCircle(x, y, this.radius);

    for (const s of this.teeth) {
      const ang = s.ang + this.t * s.spin;
      huntGashLayered(
        g, this.tint, this.tones,
        x + Math.cos(ang) * this.radius * 0.72, y + Math.sin(ang) * this.radius * 0.72,
        ang + Math.PI / 2,
        this.radius * s.len * this.intensity, this.radius * s.w, 0.6 * alpha,
        { curve: 0.3, flick: false },
      );
    }

    this.dripAccum += delta;
    const interval = 380 / Math.max(0.4, this.intensity);
    if (this.dripAccum >= interval) {
      this.dripAccum = 0;
      const a = Math.random() * TAU;
      new HuntFx(this.scene, this.tint).splatter(
        x + Math.cos(a) * this.radius * 0.6, y + Math.sin(a) * this.radius * 0.6,
        1, { speed: 12, size: 2.2, life: 620, fall: 40, depth: 4, tones: this.tones },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── HuntAvatar ────────────────────────────────────────────────────────────

/** Hunt's three shapes. The rig reads the form and changes silhouette accordingly. */
export type HuntForm = 'human' | 'beast' | 'hybrid';

/** Concentric discs of one fist, outermost first. */
const HUNT_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: HUNT.rust, alpha: 0.3 },
    { r: 6.8, color: HUNT.ember, alpha: 0.95 },
    { r: 3.6, color: HUNT.spark, alpha: 1 },
    { r: 1.5, color: HUNT.white, alpha: 1, ox: -2.2, oy: -2.2 },
  ],
  eyeWhite: HUNT.bone,
  eyePupil: HUNT.pitch,
  // A fist is heavy: a lot of stretch along travel, very little squash across it.
  squash: { div: 12, x: 0.58, y: 0.2 },
};

/**
 * The hunt character rig: two heavy fists, a pair of eyes, and a set of ears above the crown
 * that grow into a full snarling head as the beast comes out. The hands, eyes and gestures come
 * from BaseAvatar; what hunt adds is the form change, the claws that sprout on the fists in
 * beast form, and the blood pooling underfoot.
 */
export class HuntAvatar extends BaseAvatar {
  private fx: HuntFx;
  private tones: HuntTones;
  private form: HuntForm = 'human';
  /** Eased toward 1 in beast form so the head grows rather than popping. */
  private beastness = 0;
  private moon = false;

  constructor(scene: Phaser.Scene, tint: HuntColorFn, tones: HuntTones = HUNTER_TONES, depth = 6) {
    super(scene, tint, depth, HUNT_AVATAR);
    this.fx = new HuntFx(scene, tint);
    this.tones = tones;
    if (tones !== HUNTER_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.body), 0.95));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.lit), 1));
    }
  }

  /**
   * Which of hunt's three shapes the character is wearing. Beast and hybrid are separate
   * silhouettes, not tints — the ears grow, the muzzle comes out, the fists sprout claws.
   */
  setForm(form: HuntForm): void {
    if (form === this.form) return;
    this.form = form;
    const tones = form === 'beast' ? BEAST_TONES : form === 'hybrid' ? SILVER_TONES : this.tones;
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.body), 0.95));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.lit), 1));
    this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(tones.crust), 0.34));
  }

  /** Blood Moon overhead — everything the character wears runs red under it. */
  setMoon(on: boolean): void { this.moon = on; }

  /** Colours for whatever the character is currently wearing. */
  private activeTones(): HuntTones {
    if (this.moon) return MOON_TONES;
    if (this.form === 'beast') return BEAST_TONES;
    if (this.form === 'hybrid') return SILVER_TONES;
    return this.tones;
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered hunt
   * user is identifiable at a glance before they cast anything: bone-white eyes, a heavy corona
   * and a hard rim on each fist, taller ears, and a rack of trophy fangs strung above the head.
   * Shape changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? HUNT.white : HUNT.bone);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10);
      halo.setFillStyle(this.tint(on ? this.tones.wound : HUNT.rust), on ? 0.34 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(HUNT.bone), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving fists sling blood. */
  protected emitTrail(x: number, y: number): void {
    this.fx.splatter(x, y, 1, { speed: 10, size: 2, life: 480, fall: 30, depth: 5, tones: this.activeTones() });
  }

  /** Blood pooling under the character, with the claw marks it has been leaving in the ground. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const tones = this.activeTones();
    g.fillStyle(this.tint(tones.crust), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 7, 54 * this.intensity, 25 * this.intensity);
    g.fillStyle(this.tint(tones.body), a * 0.2 * this.intensity);
    g.fillEllipse(x, y + 6, 36 * this.intensity, 17 * this.intensity);
    // Three gouges scored into the floor, turning slowly under the character.
    for (let i = 0; i < 3; i++) {
      const ang = this.t * 0.5 + (i / 3) * TAU;
      huntGashLayered(
        g, this.tint, tones,
        x + Math.cos(ang) * 13, y + 7 + Math.sin(ang) * 6,
        ang + Math.PI / 2, (16 + Math.sin(this.t * 2 + i) * 3) * this.intensity, 2.6,
        a * 0.4, { curve: 0.3, flick: false, edge: false },
      );
    }
  }

  /**
   * The ears — and, once the beast is out, the whole head. Rooted at the crown so nothing ever
   * covers the face, and drawn over the sprite so the lit edges show.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // Ease toward the form so the change is a growth, not a pop.
    const want = this.form === 'human' ? 0 : this.form === 'hybrid' ? 0.55 : 1;
    this.beastness += (want - this.beastness) * 0.12;
    const b = this.beastness;
    const tones = this.activeTones();
    const rootY = y - 18;
    const scale = (this.mastered ? 1.28 : 1) * this.intensity;

    // Ears: two swept triangles that lengthen and lean back as the beast comes out.
    for (const s of [-1, 1]) {
      const baseX = x + s * (7 + b * 2.5);
      const h = (13 + b * 12) * scale;
      const lean = s * (0.34 + b * 0.2) + Math.sin(this.t * 2 + s) * 0.05;
      const ang = -Math.PI / 2 + lean;
      g.fillStyle(this.tint(tones.crust), 0.95 * alpha);
      g.beginPath();
      g.moveTo(baseX - s * 5.2 * scale, rootY + 2);
      g.lineTo(baseX + s * 5.2 * scale, rootY + 2);
      g.lineTo(baseX + Math.cos(ang) * h, rootY + Math.sin(ang) * h);
      g.closePath();
      g.fillPath();
      // Inner ear, offset so the ear reads as a cone rather than a flat triangle.
      g.fillStyle(this.tint(tones.body), 0.9 * alpha);
      g.beginPath();
      g.moveTo(baseX - s * 3 * scale, rootY + 1);
      g.lineTo(baseX + s * 3.4 * scale, rootY + 1);
      g.lineTo(baseX + Math.cos(ang) * h * 0.72, rootY + Math.sin(ang) * h * 0.72);
      g.closePath();
      g.fillPath();
      g.fillStyle(this.tint(tones.lit), 0.5 * a);
      g.fillCircle(baseX + Math.cos(ang) * h * 0.85, rootY + Math.sin(ang) * h * 0.85, 1.5 * scale);
    }

    if (b > 0.12) {
      // The muzzle: a snout pushing out along the aim, with fangs top and bottom.
      const mx = x + Math.cos(this.facing) * 13 * b;
      const my = y - 12 + Math.sin(this.facing) * 8 * b;
      const len = 15 * b * scale;
      g.fillStyle(this.tint(tones.crust), 0.95 * alpha);
      huntGash(g, mx, my, this.facing, len * 1.5, 6.5 * b * scale, 0.12, 0);
      g.fillStyle(this.tint(tones.body), 0.9 * alpha);
      huntGash(g, mx, my, this.facing, len * 1.3, 4.2 * b * scale, 0.12, 0);
      const snarl = 0.6 + 0.4 * Math.sin(this.t * 5);
      for (let i = 0; i < 4; i++) {
        const f = (i - 1.5) * 0.3;
        const fx2 = mx + Math.cos(this.facing) * (len * 0.55) - Math.sin(this.facing) * f * 4.5 * scale;
        const fy2 = my + Math.sin(this.facing) * (len * 0.55) + Math.cos(this.facing) * f * 4.5 * scale;
        g.fillStyle(this.tint(HUNT.bone), 0.95 * alpha);
        huntGash(g, fx2, fy2, this.facing + Math.PI / 2, 5 * b * scale * snarl, 1.3 * b * scale, 0.4, 0);
      }
      // Eyeshine punching through the snarl.
      g.fillStyle(this.tint(this.moon ? HUNT.moon : tones.lit), 0.55 * alpha * b);
      g.fillCircle(x - 7, y - 5, 3.4 * b);
      g.fillCircle(x + 7, y - 5, 3.4 * b);
    }

    // Mastery: a string of trophy fangs hanging above the head, swinging on its own beat.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.1 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 24;
        const cy = y - 31 + Math.sin(p) * 7;
        g.fillStyle(this.tint(HUNT.bone), 0.95 * alpha);
        huntGash(g, cx, cy, p + Math.PI / 2, 12, 3, 0.4, 0);
        g.fillStyle(this.tint(tones.body), 0.55 * alpha);
        g.fillCircle(cx, cy, 1.6);
      }
    }
  }
}
