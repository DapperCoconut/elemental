import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Soul renders: the shade avatar (ball arms + eyes + a torn
 * shroud streaming off the crown), the wisp shroud aura, and the one-shot effects every soul
 * ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes soul
 * soul: the wisp, the palette, and the effects built out of it.
 *
 * Colours must come from the SOUL palette below. Soul has no skin yet, but every
 * call still routes through the owner's `soulColor` mapper, so the day one lands it is a table
 * edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.soulColor bound to one owner. */
export type SoulColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const SOUL = {
  /** The dark under-tones a spirit is silhouetted against. */
  void: 0x140820,
  crypt: 0x2e1440,
  grape: 0x552266,
  /** The body of a shade. */
  amethyst: 0x7733aa,
  orchid: 0x9955ee,
  lilac: 0xccaaff,
  pale: 0xeeddff,
  white: 0xffffff,
  /** Hell's Torment — the fire that eats an amalgam from the inside. */
  scar: 0x882222,
  flame: 0xff4411,
  ember: 0xff6622,
  cinder: 0xffaa44,
  /** Angered graves and the blood-price upgrades. */
  blood: 0xff2222,
  /** Alpha bile and spitter shots. */
  rot: 0x33cc44,
  bile: 0x114411,
  /** Headstones and bone. */
  bone: 0xd8ccb8,
  stone: 0x776688,
  /** Soul Lord at 25 kills — the ascended, angelic gold. */
  umber: 0x5a3a08,
  bronze: 0xa8701a,
  gold: 0xf2b833,
  sun: 0xffe07a,
  halo: 0xfff6cc,
} as const;

/** One coherent set of shades. `shroud → body → glow → core` runs dark to bright. */
export interface SoulTones {
  shroud: number;
  body: number;
  glow: number;
  core: number;
  spark: number;
}

/** The player's own spirits: warm violet, bright core. */
export const SPIRIT_TONES: SoulTones = {
  shroud: SOUL.crypt, body: SOUL.amethyst, glow: SOUL.orchid, core: SOUL.lilac, spark: SOUL.pale,
};
/** The NPC's read colder and darker so two soul fighters never blur together. */
export const NPC_TONES: SoulTones = {
  shroud: SOUL.void, body: SOUL.grape, glow: SOUL.amethyst, core: SOUL.orchid, spark: SOUL.lilac,
};
/** Hell's Torment: a spirit burning out. */
export const TORMENT_TONES: SoulTones = {
  shroud: SOUL.scar, body: SOUL.flame, glow: SOUL.ember, core: SOUL.cinder, spark: SOUL.white,
};
/** Angered graves and their zombies. */
export const ANGERED_TONES: SoulTones = {
  shroud: 0x440d0d, body: SOUL.scar, glow: SOUL.blood, core: 0xff7777, spark: SOUL.white,
};
/** Alpha bile — the anti-heal cone and recruited spitter shots. */
export const ROT_TONES: SoulTones = {
  shroud: SOUL.bile, body: 0x228833, glow: SOUL.rot, core: 0x88ee99, spark: SOUL.white,
};

/** Soul Lord ascended (25 kills): every soul ability burns gold instead of violet. */
export const GOLD_TONES: SoulTones = {
  shroud: SOUL.umber, body: SOUL.bronze, glow: SOUL.gold, core: SOUL.sun, spark: SOUL.halo,
};

export const tonesFor = (owner: 'player' | 'npc'): SoulTones =>
  (owner === 'player' ? SPIRIT_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A wisp: the tattered tail of a spirit. Fat and rounded at the *root* — the head end, where the
 * soul still holds together — then narrowing along a lateral sine wave into nothing, the way a
 * sheet of cloth does when it is falling apart.
 *
 * This is deliberately the inverse of the fire tongue (which is fat at the waist and licks
 * forward) and of the growth pod (which carries its mass at the tip). A soul wisp is *leaving*:
 * the mass is behind it and the far end is already gone. `wave` drives the ripple, so passing the
 * same value to a cluster makes a shroud breathe as one piece and varying it makes a crowd.
 */
export function soulWisp(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  wave = 0,
  /** Ripple amplitude as a fraction of `halfW`. 0 gives a straight taper. */
  sway = 0.9,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const STEPS = 11;

  // Half-width and lateral drift at a fraction `f` along the wisp.
  const w = (f: number): number => halfW * Math.pow(1 - f, 0.55) * (1 + 0.18 * Math.sin(f * 5.5 + wave));
  const drift = (f: number): number => Math.sin(f * 3.4 + wave) * halfW * sway * f;

  const at = (f: number, side: number): [number, number] => {
    const off = drift(f) + side * w(f);
    return [cx + cos * len * f + px * off, cy + sin * len * f + py * off];
  };

  g.beginPath();
  const start = at(0, 1);
  g.moveTo(start[0], start[1]);
  for (let i = 1; i <= STEPS; i++) {
    const p = at(i / STEPS, 1);
    g.lineTo(p[0], p[1]);
  }
  for (let i = STEPS; i >= 0; i--) {
    const p = at(i / STEPS, -1);
    g.lineTo(p[0], p[1]);
  }
  g.closePath();
  g.fillPath();
}

export interface WispLayerOpts {
  /** Torn strips hanging off the back half. Default 2; 0 gives a clean wisp. */
  tatters?: number;
  /** Draw the rounded head bulb and waist bead. Default true. */
  beads?: boolean;
  sway?: number;
}

/**
 * Layered wisp: an outer shroud, the body, an inner glow, a hot pip at the head, plus torn
 * strips peeling off the tail and rounded beads at the head and waist.
 *
 * The beads matter as much as they do for fire. Without them a ring of wisps reads as a spiky
 * starburst; with them the same ring reads as one soft mass with things trailing out of it.
 */
export function soulWispLayered(
  g: Phaser.GameObjects.Graphics,
  tint: SoulColorFn, tones: SoulTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number, wave = 0,
  opts: WispLayerOpts = {},
): void {
  const sway = opts.sway ?? 0.9;
  const tatters = opts.tatters ?? 2;

  g.fillStyle(tint(tones.shroud), alpha * 0.55);
  soulWisp(g, cx, cy, angle, len * 1.06, halfW * 1.35, wave, sway);
  g.fillStyle(tint(tones.body), alpha * 0.85);
  soulWisp(g, cx, cy, angle, len, halfW, wave, sway);
  g.fillStyle(tint(tones.glow), alpha * 0.9);
  soulWisp(g, cx, cy, angle, len * 0.78, halfW * 0.55, wave + 0.4, sway);
  g.fillStyle(tint(tones.core), alpha * 0.95);
  soulWisp(g, cx, cy, angle, len * 0.42, halfW * 0.26, wave + 0.8, sway * 0.6);

  // Torn strips: short wisps peeling out of the back half at shallow angles.
  for (let i = 0; i < tatters; i++) {
    const s = i % 2 === 0 ? 1 : -1;
    const f = 0.42 + i * 0.17;
    const off = Math.sin(f * 3.4 + wave) * halfW * sway * f;
    const bx = cx + Math.cos(angle) * len * f - Math.sin(angle) * off;
    const by = cy + Math.sin(angle) * len * f + Math.cos(angle) * off;
    g.fillStyle(tint(tones.body), alpha * 0.5);
    soulWisp(g, bx, by, angle + s * (0.5 + 0.18 * Math.sin(wave + i)), len * 0.34, halfW * 0.36, wave + i, sway);
  }

  if (opts.beads !== false) {
    // Head bulb and waist bead — the mass that stops a cluster reading as a starburst.
    g.fillStyle(tint(tones.body), alpha * 0.7);
    g.fillCircle(cx, cy, halfW * 1.12);
    g.fillStyle(tint(tones.glow), alpha * 0.85);
    g.fillCircle(cx, cy, halfW * 0.72);
    g.fillStyle(tint(tones.spark), alpha * 0.9);
    g.fillCircle(cx - halfW * 0.22, cy - halfW * 0.26, halfW * 0.3);
    const wf = 0.34;
    const woff = Math.sin(wf * 3.4 + wave) * halfW * sway * wf;
    g.fillStyle(tint(tones.glow), alpha * 0.5);
    g.fillCircle(
      cx + Math.cos(angle) * len * wf - Math.sin(angle) * woff,
      cy + Math.sin(angle) * len * wf + Math.cos(angle) * woff,
      halfW * 0.5,
    );
  }
}

export interface ImmolateOpts {
  /** Wisps flung out of the burst. Defaults to radius/7. */
  wisps?: number;
  /** Drifting motes left behind. Defaults to radius/20. */
  motes?: number;
  /** Leave an ectoplasm stain on the ground. Default true. */
  stain?: boolean;
  depth?: number;
  duration?: number;
  tones?: SoulTones;
}

export interface WispBurstOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Spirits fall *up*, not down — negative values are the whole point. */
  rise?: number;
  tones?: SoulTones;
}

// ── SoulFx ────────────────────────────────────────────────────────────────

/**
 * One-shot soul effects. Cheap to construct — build one per owner and hand it the owner's
 * colour mapper.
 */
export class SoulFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: SoulColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding front, drawn as a wobbling polygon whose vertices breathe on their own phases —
   * a soul front is a held breath escaping, so it never comes out perfectly round.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    // Segment count scales with radius: a fixed count makes a big blast read as a polygon.
    const segs = Phaser.Math.Clamp(Math.round(toR / 5), 18, 72);
    const jitter = Array.from({ length: segs }, () => 0.86 + Math.random() * 0.28);
    const phase = Array.from({ length: segs }, () => Math.random() * TAU);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.65)), c, 0.85 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const k = i % segs;
        const a = (k / segs) * TAU;
        const rr = r * jitter[k] * (1 + 0.05 * Math.sin(t * 9 + phase[k]));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: SoulTones = SPIRIT_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.glow, depth);
  }

  /**
   * Spirits leaving: wisps flung outward that slow, turn upward and fade. Soul's answer to
   * every other element's shrapnel — debris falls, souls rise.
   */
  wisps(x: number, y: number, count: number, opts: WispBurstOpts = {}): void {
    const tones = opts.tones ?? SPIRIT_TONES;
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 620;
    const rise = opts.rise ?? -34;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a), ang: a,
        v: speed * (0.4 + Math.random() * 0.95),
        r: size * (0.6 + Math.random() * 0.8),
        wave: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 2.4,
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d + rise * lt * lt;
        const fade = 1 - lt * lt;
        soulWispLayered(
          g, this.tint, tones, ex, ey,
          p.ang + p.spin * lt, p.r * 4.2 * fade, p.r * fade, 0.9 * fade,
          p.wave + t * 7, { tatters: 1 },
        );
      }
    });
  }

  /** Motes of leftover spirit that hang, drift upward and wink out one by one. */
  motes(x: number, y: number, count: number, radius: number, depth = 4, tones: SoulTones = SPIRIT_TONES): void {
    const bits = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.5,
      oy: (Math.random() - 0.5) * radius * 1.1,
      drift: (Math.random() - 0.5) * 22,
      r: 1.3 + Math.random() * 2.2,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.35,
    }));
    this.anim(depth, 1400, (g, t) => {
      for (const m of bits) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const cx = x + m.ox + m.drift * lt + Math.sin(t * 6 + m.phase) * 3;
        const cy = y + m.oy - 30 * lt;
        const fade = (1 - lt) * (0.55 + 0.45 * Math.sin(t * 11 + m.phase));
        g.fillStyle(this.tint(tones.glow), 0.5 * fade);
        g.fillCircle(cx, cy, m.r * 1.8);
        g.fillStyle(this.tint(tones.spark), 0.9 * fade);
        g.fillCircle(cx, cy, m.r * 0.7);
      }
    });
  }

  /**
   * Ectoplasm left where something died: a dark irregular stain that keeps a couple of wisps
   * curling out of it before it soaks away. Soul's equivalent of a scorch mark.
   */
  stain(x: number, y: number, radius: number, depth = 1, tones: SoulTones = SPIRIT_TONES): void {
    const lobes = Array.from({ length: 7 }, (_, i) => ({
      ang: (i / 7) * TAU + Math.random() * 0.5,
      d: radius * (0.2 + Math.random() * 0.5),
      r: radius * (0.28 + Math.random() * 0.3),
    }));
    const curls = Array.from({ length: 3 }, () => ({
      ang: -Math.PI / 2 + (Math.random() - 0.5) * 1.4,
      ox: (Math.random() - 0.5) * radius,
      wave: Math.random() * TAU,
    }));
    this.anim(depth, 2600, (g, t) => {
      const a = t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94;
      g.fillStyle(this.tint(tones.shroud), 0.55 * a);
      for (const l of lobes) {
        g.fillCircle(x + Math.cos(l.ang) * l.d, y + Math.sin(l.ang) * l.d * 0.65, l.r);
      }
      g.fillStyle(this.tint(tones.body), 0.3 * a);
      g.fillEllipse(x, y, radius * 1.3, radius * 0.85);
      for (const c of curls) {
        soulWispLayered(g, this.tint, tones, x + c.ox, y, c.ang,
          radius * 0.55 * a, radius * 0.1, 0.5 * a, c.wave + t * 5, { tatters: 0, beads: false });
      }
    });
  }

  /**
   * The body of a soul detonation: a rosette of wisps that blows out of the point, holds, then
   * peels away upward. Reads as a crowd of spirits escaping rather than as a disc being scaled.
   */
  wispBloom(x: number, y: number, radius: number, duration: number, depth = 6, tones: SoulTones = SPIRIT_TONES): void {
    const spikes = Array.from({ length: 13 }, (_, i) => ({
      ang: (i / 13) * TAU + Math.random() * 0.22,
      len: 0.62 + Math.random() * 0.32,
      w: 0.1 + Math.random() * 0.06,
      wave: Math.random() * TAU,
      delay: Math.random() * 0.18,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.32 ? 1 : 1 - (t - 0.32) / 0.68;
      const core = easeOut(Math.min(1, t * 3.2));
      g.fillStyle(this.tint(tones.shroud), 0.72 * fade);
      g.fillCircle(x, y, radius * 0.42 * core);
      g.fillStyle(this.tint(tones.body), 0.8 * fade);
      g.fillCircle(x, y, radius * 0.27 * core);

      for (const s of spikes) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(Math.min(1, lt * 2.1));
        const drift = radius * 0.3 * easeIn(lt);
        soulWispLayered(
          g, this.tint, tones,
          x + Math.cos(s.ang) * drift, y + Math.sin(s.ang) * drift - radius * 0.25 * lt * lt,
          s.ang, radius * s.len * grow, radius * s.w * (1 - lt * 0.35), 0.92 * fade,
          s.wave + t * 9,
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.4) * 0.85);
        g.fillCircle(x, y, radius * 0.18);
      }
    });
  }

  /**
   * Full detonation — flash, boiling wisp body, two staggered fronts, flung spirits, drifting
   * motes and a lingering stain. Six layers, because one expanding disc always reads as a
   * placeholder.
   */
  immolate(x: number, y: number, radius: number, opts: ImmolateOpts = {}): void {
    const tones = opts.tones ?? SPIRIT_TONES;
    const flung = opts.wisps ?? Math.max(6, Math.round(radius / 7));
    const moteCount = opts.motes ?? Math.round(radius / 20);
    const dur = opts.duration ?? Math.round(340 + radius * 1.5);
    const depth = opts.depth ?? 6;

    if (opts.stain !== false) this.stain(x, y, radius * 0.55, 1, tones);
    this.wispBloom(x, y, radius * 0.7, dur, depth, tones);
    this.flash(x, y, radius * 0.32, depth + 1, tones);
    this.ring(x, y, radius * 0.18, radius * 1.05, tones.core, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.14, radius * 1.35, tones.glow, dur, 3.5, depth));
    this.wisps(x, y, flung, {
      speed: radius * 1.9, size: 3 + radius / 45,
      life: Math.round(dur * 1.4), rise: -radius * 0.55, depth, tones,
    });
    if (moteCount > 0) this.motes(x, y, moteCount, radius * 0.9, depth - 2, tones);
  }

  /**
   * A shriek: nested open mouths of sound punching outward, each a ring of wisps rather than a
   * line, with a hollow skull-socket core that flares on the first frames. Death Whistle and
   * Soul Screech both read off this.
   */
  shriek(x: number, y: number, radius: number, duration = 620, depth = 8, tones: SoulTones = SPIRIT_TONES): void {
    const mouths = 3;
    const teeth = Array.from({ length: 16 }, (_, i) => ({
      ang: (i / 16) * TAU,
      len: 0.16 + Math.random() * 0.14,
      wave: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      for (let m = 0; m < mouths; m++) {
        const lt = t * 1.35 - m * 0.16;
        if (lt <= 0 || lt >= 1) continue;
        const r = radius * easeOut(lt);
        const fade = (1 - lt) * (1 - m * 0.22);
        g.lineStyle(4 * fade, this.tint(tones.glow), 0.7 * fade);
        g.strokeCircle(x, y, r);
        for (const th of teeth) {
          soulWispLayered(
            g, this.tint, tones,
            x + Math.cos(th.ang) * r, y + Math.sin(th.ang) * r,
            th.ang, radius * th.len * fade, radius * 0.035 * fade, 0.8 * fade,
            th.wave + t * 12, { tatters: 0, beads: false },
          );
        }
      }
      // The socket the sound comes out of.
      if (t < 0.45) {
        const k = 1 - t / 0.45;
        g.fillStyle(this.tint(tones.shroud), 0.75 * k);
        g.fillCircle(x, y, radius * 0.22 * (0.6 + t));
        g.fillStyle(this.tint(tones.spark), 0.9 * k);
        g.fillCircle(x, y, radius * 0.09 * (0.6 + t));
      }
    });
  }

  /**
   * Something being pulled up out of the ground: a column of wisps rising through a widening
   * mouth, with dirt-dark lobes shouldered aside at the base. Arise and the graves use it.
   */
  soulRise(x: number, y: number, height: number, duration = 620, depth = 5, tones: SoulTones = SPIRIT_TONES): void {
    const strands = Array.from({ length: 7 }, (_, i) => ({
      ox: (i - 3) * 5.5,
      wave: Math.random() * TAU,
      len: 0.65 + Math.random() * 0.45,
      delay: Math.random() * 0.22,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
      // The mouth in the ground.
      g.fillStyle(this.tint(tones.shroud), 0.6 * fade);
      g.fillEllipse(x, y + 4, 34 * easeOut(Math.min(1, t * 3)), 12 * easeOut(Math.min(1, t * 3)));
      for (const s of strands) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const rise = height * s.len * easeOut(lt);
        soulWispLayered(
          g, this.tint, tones,
          x + s.ox, y + 2 - rise * 0.15,
          -Math.PI / 2, rise, 5.5 * (1 - lt * 0.45), 0.9 * fade,
          s.wave + t * 8, { tatters: 1 },
        );
      }
      if (t < 0.35) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.35) * 0.7);
        g.fillCircle(x, y, 9);
      }
    });
  }

  /**
   * Ignition burst for a toggle, a summon or a grave: wisps falling *inward* and knitting into a
   * body, so the thing reads as assembled rather than exploded.
   */
  bloom(x: number, y: number, radius: number, count = 9, depth = 5, tones: SoulTones = SPIRIT_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      wave: Math.random() * TAU,
      delay: (i % 3) * 0.06,
    }));
    this.anim(depth, 480, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const d = radius * (1.6 - easeOut(lt) * 0.9);
        soulWispLayered(
          g, this.tint, tones,
          x + Math.cos(s.ang) * d, y + Math.sin(s.ang) * d,
          s.ang + Math.PI, radius * 0.5, radius * 0.14, 0.85 * fade, s.wave + t * 8,
        );
      }
    });
    this.ring(x, y, radius * 1.5, radius * 0.6, tones.core, 400, 3, depth);
  }

  /**
   * Inward-gathering channel: spirits spiralling into a growing core while a containment ring
   * closes. `follow` lets it track a moving caster.
   */
  gather(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: SoulTones = SPIRIT_TONES,
  ): void {
    const streams = Array.from({ length: 10 }, (_, i) => ({
      ang: (i / 10) * TAU,
      spin: 0.7 + (i % 3) * 0.4,
      phase: i / 10,
      wave: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.86 + Math.sin(t * 22) * 0.14;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        soulWispLayered(
          g, this.tint, tones,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI,
          r * 0.34, 3.2 * (1 - lt), 0.8 * (1 - lt * 0.5), s.wave + t * 9, { tatters: 0 },
        );
      }

      const cr = radius * (0.1 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(tones.shroud), 0.62);
      g.fillCircle(cx, cy, cr * 1.55);
      g.fillStyle(this.tint(tones.body), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.spark), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.32);

      g.lineStyle(3, this.tint(tones.glow), 0.4 + 0.42 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /** Recoil wisp at the throwing hand — sells that something actually left a body. */
  muzzleWisp(x: number, y: number, angle: number, scale = 1, depth = 6, tones: SoulTones = SPIRIT_TONES): void {
    const wave = Math.random() * TAU;
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      soulWispLayered(g, this.tint, tones, x, y, angle,
        26 * scale * (0.55 + t), 6.5 * scale * fade, 0.85 * fade, wave + t * 10, { tatters: 1 });
      for (const s of [1, -1]) {
        soulWispLayered(g, this.tint, tones, x, y, angle + s * 0.75,
          14 * scale * fade, 3 * scale * fade, 0.5 * fade, wave + s + t * 10, { tatters: 0, beads: false });
      }
      g.fillStyle(this.tint(tones.spark), 0.9 * fade);
      g.fillCircle(x, y, 4.2 * scale * (1 - t * 0.4));
    });
  }

  /**
   * A spectral tether between two points — the telegraph a recruited variant draws before it
   * charges, and the thread a whistle pulls its amalgams along.
   */
  tether(x1: number, y1: number, x2: number, y2: number, duration = 400, depth = 6, tones: SoulTones = SPIRIT_TONES): void {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const steps = Phaser.Math.Clamp(Math.round(dist / 18), 3, 26);
    const wave = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      const fade = 1 - easeIn(t);
      const px = -Math.sin(angle), py = Math.cos(angle);
      g.lineStyle(3 * fade, this.tint(tones.glow), 0.6 * fade);
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const off = Math.sin(f * 9 + wave + t * 14) * 4 * Math.sin(f * Math.PI);
        const cx = x1 + (x2 - x1) * f + px * off, cy = y1 + (y2 - y1) * f + py * off;
        if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
      }
      g.strokePath();
      // Beads running the thread, so the direction of pull is readable.
      for (let i = 0; i < 4; i++) {
        const f = ((t * 1.4 + i / 4) % 1);
        const off = Math.sin(f * 9 + wave + t * 14) * 4 * Math.sin(f * Math.PI);
        g.fillStyle(this.tint(tones.spark), 0.8 * fade);
        g.fillCircle(x1 + (x2 - x1) * f + px * off, y1 + (y2 - y1) * f + py * off, 2.6);
      }
    });
  }

  // ── Caller-owned Graphics painters ──────────────────────────────────────

  /**
   * A Lantern Light puddle: a pool of spirit light with a rippling rim and a couple of wisps
   * standing out of it. Painted into a caller-owned Graphics because the kit already keeps the
   * pool alive and knows how much life it has left.
   */
  static drawPuddle(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    const segs = 16;
    g.fillStyle(tint(tones.shroud), 0.4 * alpha);
    g.fillEllipse(x, y + 2, radius * 2.3, radius * 1.5);

    g.fillStyle(tint(tones.body), 0.55 * alpha);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * TAU;
      const r = radius * (0.9 + 0.14 * Math.sin(t * 3 + i * 1.7));
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.72;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    g.lineStyle(1.6, tint(tones.core), 0.7 * alpha);
    g.strokeEllipse(x, y, radius * 1.7, radius * 1.2);

    // Two wisps curling off the pool — the tell that it is soul and not water.
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      soulWispLayered(g, tint, tones, x + s * radius * 0.4, y,
        -Math.PI / 2 + s * 0.25, radius * (0.85 + 0.2 * Math.sin(t * 2.4 + i * 2)), radius * 0.16,
        0.6 * alpha, t * 3 + i * 2, { tatters: 0, beads: false });
    }
    g.fillStyle(tint(tones.spark), 0.65 * alpha * (0.6 + 0.4 * Math.sin(t * 5)));
    g.fillCircle(x, y, radius * 0.2);
  }

  /**
   * A spirit shot (recruited spitter bile, or an alpha's cone). A wisp-tailed bolt rather than
   * a dot, so the direction it is travelling is readable at speed.
   */
  static drawShot(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, angle: number, radius: number, t: number,
  ): void {
    soulWispLayered(g, tint, tones, x, y, angle + Math.PI, radius * 3.4, radius * 0.85, 0.85, t * 9, { tatters: 1 });
    g.fillStyle(tint(tones.core), 0.95);
    g.fillCircle(x, y, radius * 0.8);
    g.fillStyle(tint(tones.spark), 0.9);
    g.fillCircle(x - radius * 0.25, y - radius * 0.28, radius * 0.32);
  }

  /** A Hell's Torment ember: a burning scrap of spirit, tail streaming behind its travel. */
  static drawEmber(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn,
    x: number, y: number, angle: number, radius: number, t: number, big: boolean,
  ): void {
    const tones = TORMENT_TONES;
    soulWispLayered(g, tint, tones, x, y, angle + Math.PI, radius * (big ? 4.4 : 3.2), radius * 0.9, 0.9, t * 12, { tatters: big ? 2 : 1 });
    g.fillStyle(tint(SOUL.cinder), 0.95);
    g.fillCircle(x, y, radius * 0.62);
    g.fillStyle(tint(SOUL.white), 0.85);
    g.fillCircle(x, y, radius * 0.26);
  }

  /** Angered aura: a boiling red halo and two hot eye-pips glaring out of it. */
  static drawAngeredAura(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn,
    x: number, y: number, radius: number, t: number,
  ): void {
    const segs = 14;
    g.fillStyle(tint(ANGERED_TONES.shroud), 0.35);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * TAU;
      const r = radius * (1.05 + 0.13 * Math.sin(t * 6 + i * 2.1));
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.lineStyle(2, tint(SOUL.blood), 0.7);
    g.strokeCircle(x, y, radius);
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i / 3) * TAU;
      soulWispLayered(g, tint, ANGERED_TONES, x + Math.cos(a) * radius * 0.9, y + Math.sin(a) * radius * 0.9,
        a, radius * 0.5, radius * 0.12, 0.55, t * 7 + i, { tatters: 0, beads: false });
    }
    g.fillStyle(tint(SOUL.blood), 0.95);
    g.fillCircle(x - radius * 0.33, y - radius * 0.28, radius * 0.13);
    g.fillCircle(x + radius * 0.33, y - radius * 0.28, radius * 0.13);
    g.fillStyle(tint(SOUL.white), 0.8);
    g.fillCircle(x - radius * 0.33, y - radius * 0.3, radius * 0.05);
    g.fillCircle(x + radius * 0.33, y - radius * 0.3, radius * 0.05);
  }

  /**
   * The alpha's crown: the other amalgams it is stitched out of, a ring of screaming heads
   * orbiting its bulk with their mouths open.
   */
  static drawAlphaCrown(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, radius: number, t: number, hostile: boolean,
  ): void {
    const faceTones = hostile ? ANGERED_TONES : tones;
    g.fillStyle(tint(tones.shroud), 0.4);
    g.fillCircle(x, y, radius * 1.15);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + t * 0.9;
      const hx = x + Math.cos(a) * radius;
      const hy = y + Math.sin(a) * radius * 0.8;
      const bob = Math.sin(t * 3 + k) * 1.6;
      // A head: skull dome, two sockets, an open jaw, and the wisp it trails.
      soulWispLayered(g, tint, faceTones, hx, hy + bob, a, radius * 0.55, radius * 0.16, 0.6, t * 5 + k, { tatters: 0, beads: false });
      g.fillStyle(tint(faceTones.body), 0.95);
      g.fillCircle(hx, hy + bob, radius * 0.3);
      g.fillStyle(tint(SOUL.void), 0.9);
      g.fillCircle(hx - radius * 0.11, hy + bob - radius * 0.06, radius * 0.08);
      g.fillCircle(hx + radius * 0.11, hy + bob - radius * 0.06, radius * 0.08);
      g.fillEllipse(hx, hy + bob + radius * 0.16, radius * 0.2, radius * 0.16 * (0.6 + 0.4 * Math.sin(t * 7 + k)));
      g.fillStyle(tint(faceTones.spark), 0.85);
      g.fillCircle(hx - radius * 0.11, hy + bob - radius * 0.07, radius * 0.03);
      g.fillCircle(hx + radius * 0.11, hy + bob - radius * 0.07, radius * 0.03);
    }
  }

  /**
   * Strength in Numbers: the bond between two of your amalgams, drawn as a slack thread of
   * spirit with light crawling along it toward whichever end is further from the caster.
   */
  static drawBond(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x1: number, y1: number, x2: number, y2: number, t: number, strength: number,
  ): void {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const px = -dy / dist, py = dx / dist;
    const steps = Phaser.Math.Clamp(Math.round(dist / 16), 3, 22);
    g.lineStyle(1 + strength * 1.6, tint(tones.glow), 0.14 + strength * 0.3);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const off = Math.sin(f * Math.PI) * 9 + Math.sin(f * 8 + t * 3) * 2.5;
      const cx = x1 + dx * f + px * off, cy = y1 + dy * f + py * off;
      if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
    }
    g.strokePath();
    const f = (t * 0.4) % 1;
    const off = Math.sin(f * Math.PI) * 9 + Math.sin(f * 8 + t * 3) * 2.5;
    g.fillStyle(tint(tones.spark), 0.3 + strength * 0.5);
    g.fillCircle(x1 + dx * f + px * off, y1 + dy * f + py * off, 2.2);
  }

  /**
   * A cloud of decay: the rot a zombie leaves where it fell. Layered smoke lobes turning on
   * their own axes, bone-flecked, with a ragged perimeter so it reads as a volume rather than
   * a circle painted on the floor.
   */
  static drawDecay(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    g.fillStyle(tint(SOUL.bile), 0.2 * alpha);
    g.fillCircle(x, y, radius);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 0.35;
      const r = radius * (0.42 + 0.16 * Math.sin(t * 1.4 + i * 2));
      const lx = x + Math.cos(a) * radius * 0.44;
      const ly = y + Math.sin(a) * radius * 0.44;
      g.fillStyle(tint(i % 2 ? SOUL.rot : 0x228833), 0.16 * alpha);
      g.fillCircle(lx, ly, r);
    }
    // The ragged rim.
    g.lineStyle(1.6, tint(SOUL.rot), 0.4 * alpha);
    g.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * TAU;
      const r = radius * (0.94 + 0.07 * Math.sin(a * 5 + t * 2));
      const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
    }
    g.strokePath();
    // Flecks of what is left of the body, drifting up out of it.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 1.1;
      const f = ((t * 0.5 + i / 6) % 1);
      const r = radius * (0.2 + f * 0.7);
      g.fillStyle(tint(SOUL.bone), (1 - f) * 0.55 * alpha);
      g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r - f * 8, 1.6);
    }
  }

  /**
   * A Lantern of the Damned wisp: a flame of spirit with a little screaming face in its head,
   * licking backwards along its travel. `small` is a split shard — the same shape, no face.
   */
  static drawLantern(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, angle: number, radius: number, t: number, small = false,
  ): void {
    const flick = 1 + 0.12 * Math.sin(t * 22);
    // Halo, then the flame tail streaming behind, then the bright head.
    g.fillStyle(tint(tones.glow), 0.22);
    g.fillCircle(x, y, radius * 2.1 * flick);
    soulWispLayered(g, tint, tones, x, y, angle + Math.PI, radius * (small ? 3 : 4.2) * flick, radius * 1.05, 0.9, t * 14, { tatters: small ? 0 : 2 });
    // Two side tongues so it reads as fire, not a comet.
    if (!small) {
      g.fillStyle(tint(tones.glow), 0.7);
      for (const s of [-1, 1]) {
        soulWisp(g, x, y, angle + Math.PI + s * 0.55, radius * 2.2 * flick, radius * 0.45, t * 16 + s, 0.6);
      }
    }
    g.fillStyle(tint(tones.body), 1);
    g.fillCircle(x, y, radius);
    g.fillStyle(tint(tones.core), 1);
    g.fillCircle(x, y, radius * 0.72);
    g.fillStyle(tint(tones.spark), 0.95);
    g.fillCircle(x - radius * 0.22, y - radius * 0.25, radius * 0.32);
    if (!small) {
      // The damned soul inside: two dark eyes and a gasping mouth, facing its travel.
      const fx = Math.cos(angle) * radius * 0.18, fy = Math.sin(angle) * radius * 0.18;
      g.fillStyle(tint(SOUL.void), 0.85);
      g.fillCircle(x + fx - radius * 0.28, y + fy - radius * 0.12, radius * 0.14);
      g.fillCircle(x + fx + radius * 0.28, y + fy - radius * 0.12, radius * 0.14);
      g.fillEllipse(x + fx, y + fy + radius * 0.28, radius * 0.24, radius * (0.22 + 0.1 * Math.sin(t * 9)));
    }
  }

  /**
   * The soul beam charging in the caster's hand: rings of spirit spiralling in onto a point, and
   * a thin sight line out along the aim that firms up as the charge fills.
   */
  static drawBeamCharge(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, angle: number, length: number, charge: number, t: number,
  ): void {
    const c = Phaser.Math.Clamp(charge, 0, 1);
    const ex = x + Math.cos(angle) * length, ey = y + Math.sin(angle) * length;
    g.lineStyle(1 + c * 2, tint(tones.glow), 0.12 + c * 0.3);
    g.lineBetween(x, y, ex, ey);
    for (let i = 0; i < 5; i++) {
      const f = ((t * 1.6 + i / 5) % 1);
      const r = 26 * (1 - f) + 4;
      const a = i * 1.3 + t * 5;
      g.fillStyle(tint(tones.core), 0.6 * f);
      g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.8 + c * 1.4);
    }
    g.fillStyle(tint(tones.glow), 0.35 + c * 0.25);
    g.fillCircle(x, y, 5 + c * 8);
    g.fillStyle(tint(tones.spark), 0.9);
    g.fillCircle(x, y, 2 + c * 4);
    if (c >= 1) {
      g.lineStyle(1.6, tint(tones.spark), 0.5 + 0.4 * Math.sin(t * 18));
      g.strokeCircle(x, y, 15);
    }
  }

  /**
   * The soul beam itself: a straight shaft of spirit, a hot white core inside a wide soft band,
   * with wisps peeling off its length. `life` runs 1 → 0 as it fades.
   */
  static drawBeam(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x1: number, y1: number, x2: number, y2: number, width: number, life: number, t: number,
  ): void {
    const w = width * (0.4 + 0.6 * life);
    g.lineStyle(w * 2.2, tint(tones.shroud), 0.25 * life);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(w * 1.4, tint(tones.glow), 0.55 * life);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(w * 0.7, tint(tones.core), 0.9 * life);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(Math.max(1, w * 0.25), tint(tones.spark), life);
    g.lineBetween(x1, y1, x2, y2);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    g.fillStyle(tint(tones.glow), 0.5 * life);
    for (let i = 0; i < 6; i++) {
      const f = (i + 0.5) / 6;
      const side = i % 2 ? 1 : -1;
      soulWisp(g, x1 + Math.cos(ang) * len * f, y1 + Math.sin(ang) * len * f,
        ang + side * 1.9, w * 1.4, w * 0.3, t * 10 + i, 0.8);
    }
    g.fillStyle(tint(tones.spark), 0.8 * life);
    g.fillCircle(x2, y2, w * 0.8);
  }

  /**
   * Hemorrhage: the soul aura a beam leaves on what it hit — a bleeding ring of spirit that
   * drips, and hurts everything else standing in it.
   */
  static drawHemorrhage(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, radius: number, t: number, life: number,
  ): void {
    const a = Math.min(1, life * 3);
    g.fillStyle(tint(tones.body), 0.1 * a);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, tint(tones.glow), 0.55 * a);
    g.strokeCircle(x, y, radius * (0.96 + 0.04 * Math.sin(t * 6)));
    g.fillStyle(tint(tones.glow), 0.45 * a);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + t * 1.2;
      soulWisp(g, x + Math.cos(ang) * radius * 0.92, y + Math.sin(ang) * radius * 0.92,
        ang, radius * 0.3, 2.4, t * 8 + i, 0.7);
    }
    // Drips of spirit running off the bearer.
    for (let i = 0; i < 4; i++) {
      const f = (t * 0.9 + i / 4) % 1;
      g.fillStyle(tint(SOUL.blood), (1 - f) * 0.7 * a);
      g.fillCircle(x + (i - 1.5) * 7, y + 6 + f * 18, 2.2 * (1 - f * 0.5));
    }
  }

  /** A Soul Lord orbiting orb: a bright bead of spirit with a short comet tail behind it. */
  static drawSoulOrb(
    g: Phaser.GameObjects.Graphics, tint: SoulColorFn, tones: SoulTones,
    x: number, y: number, travel: number, radius: number, t: number,
  ): void {
    g.fillStyle(tint(tones.glow), 0.25);
    g.fillCircle(x, y, radius * 1.9);
    soulWispLayered(g, tint, tones, x, y, travel + Math.PI, radius * 2.6, radius * 0.8, 0.75, t * 10, { tatters: 0, beads: false });
    g.fillStyle(tint(tones.core), 1);
    g.fillCircle(x, y, radius);
    g.fillStyle(tint(tones.spark), 1);
    g.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.4);
  }
}

// ── SoulShroud ────────────────────────────────────────────────────────────

/**
 * Persistent veil of wisps clinging to a body (Hell's Torment burn, the mastery passive, the
 * Carrion Call buff). Driven by whoever owns it — call `update` every frame with the position.
 */
export class SoulShroud {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private moteAccum = 0;
  private strands: { ang: number; len: number; w: number; wave: number; spin: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: SoulColorFn,
    private tones: SoulTones,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 8,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.strands = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.55 + Math.random() * 0.4,
      w: 0.15 + Math.random() * 0.07,
      wave: Math.random() * TAU,
      spin: 0.5 + Math.random() * 0.6,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }
  setTones(tones: SoulTones): void { this.tones = tones; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    g.fillStyle(this.tint(this.tones.shroud), 0.22 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * 0.9);

    for (const s of this.strands) {
      const ang = s.ang + this.t * s.spin;
      const bob = 1 + Math.sin(this.t * 2.6 + s.ang * 2) * 0.1;
      soulWispLayered(
        g, this.tint, this.tones,
        x + Math.cos(ang) * this.radius * 0.42 * bob, y + Math.sin(ang) * this.radius * 0.42 * bob,
        ang, this.radius * s.len * this.intensity, this.radius * s.w, 0.62 * alpha,
        s.wave + this.t * 5, { tatters: 1, beads: false },
      );
    }

    this.moteAccum += delta;
    const interval = 460 / Math.max(0.4, this.intensity);
    if (this.moteAccum >= interval) {
      this.moteAccum = 0;
      const a = Math.random() * TAU;
      new SoulFx(this.scene, this.tint).motes(
        x + Math.cos(a) * this.radius * 0.5, y + Math.sin(a) * this.radius * 0.5,
        1, 8, 5, this.tones,
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── SoulAmalgamBody ───────────────────────────────────────────────────────

/** The extra feature a recruited invasion variant wears on its amalgam silhouette. */
export type AmalgamQuirk = 'bulk' | 'lean' | 'sac' | 'halo' | 'horns' | 'gut';

export interface AmalgamBodySpec {
  /** Body radius in px — 18 for a plain amalgam, scaled by the husk's `sizeMult`. */
  size: number;
  /** A recruited variant's own colour, worn as a patch on the belly. */
  fleshColor?: number;
  quirk?: AmalgamQuirk;
  /** Alpha amalgam: a heavier mass with more heads, more arms and a second seam. */
  alpha?: boolean;
  depth?: number;
}

/** Everything the kit knows about an amalgam this frame. Cheap to rebuild per call. */
export interface AmalgamBodyState {
  x: number;
  y: number;
  /** Velocity — drives the shamble cadence, the lean, and the motion smear. */
  vx: number;
  vy: number;
  /** The husk sprite's alpha, so the hit flash still reads on the drawn body. */
  alpha: number;
  /** 1 normally; the bite lunge pops it above 1. */
  pop: number;
  /** Angle toward whatever it is hunting. Null means look where it walks. */
  aim: number | null;
  tones: SoulTones;
  /** Mid-lunge: the mass stretches along travel and every mouth opens wide. */
  dashing?: boolean;
  /** Hell's Torment: the seams split and glow from the inside. */
  burning?: boolean;
  /** The Inflamed tier: permanent split seams, venting heat. */
  inflamed?: boolean;
  /** Angered tier: a boiling red rim around the whole mass. */
  angered?: boolean;
}

/** One of the bodies making up the mass. */
interface Lobe {
  ox: number;
  oy: number;
  r: number;
  phase: number;
  /** Blaster gut / spitter sac: lit from inside and pulsing. */
  lit?: boolean;
}

/** An arm: two segments and a small clawed hand, on its own place in the walk cycle. */
interface Limb {
  side: -1 | 1;
  /** Shoulder height in body units. */
  oy: number;
  len: number;
  thick: number;
  phase: number;
  /** Drawn behind the mass in shroud tones — only the alpha grows these. */
  back: boolean;
}

/** A head — the main one, or the smaller one budding off a shoulder. */
interface Head {
  ox: number;
  oy: number;
  r: number;
  phase: number;
  main: boolean;
}

/** The stitch line holding the mass together: a gentle curve with cross-stitches along it. */
interface Seam {
  x1: number; y1: number;
  cx: number; cy: number;
  x2: number; y2: number;
  stitches: number;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/**
 * The body of a raised amalgam, repainted from scratch every frame.
 *
 * Several corpses sewn into one thing — but drawn as ONE clean silhouette: the lobes are filled
 * flat in a single tone over a single dark outline, so they merge into one shape instead of a
 * pile of shaded discs. On that shape sit exactly the things that read at gameplay zoom: a main
 * skull, at most one (alpha: two) smaller head budding off a shoulder, a pair of arms, and one
 * clean stitched seam. Variant colour is a belly patch, and every state (burning, angered,
 * lunging) is a single layer on top rather than more clutter.
 *
 * The kit owns the state (tier, burn, buff, lunge) and hands it in each frame. The *structure* is
 * rolled once in the constructor, so no two amalgams in a horde share a silhouette.
 */
export class SoulAmalgamBody {
  private g: Phaser.GameObjects.Graphics;
  /** Ground shadow, kept separate because one Graphics can only hold one depth. */
  private under: Phaser.GameObjects.Graphics;
  private t = 0;
  /** Shamble phase, advanced by how fast it is actually moving — a still amalgam idles. */
  private walk = 0;
  private lobes: Lobe[] = [];
  private limbs: Limb[] = [];
  private heads: Head[] = [];
  private seams: Seam[] = [];
  /** Lagged lean and smear, so a change of direction reads as weight shifting. */
  private leanX = 0;
  private smear = 0;
  private travel = 0;
  private eyeAng = 0;
  private last: AmalgamBodyState | null = null;

  constructor(
    private scene: Phaser.Scene,
    private tint: SoulColorFn,
    private spec: AmalgamBodySpec,
  ) {
    const depth = spec.depth ?? 6;
    this.under = scene.add.graphics().setDepth(depth - 2);
    this.g = scene.add.graphics().setDepth(depth);
    this.build();
  }

  /** Rolls the creature: a torso, two shoulders, its heads, its arms and its seam. */
  private build(): void {
    const big = !!this.spec.alpha;
    const lean = this.spec.quirk === 'lean';
    const lobe = (ox: number, oy: number, r: number, lit = false): Lobe => ({ ox, oy, r, lit, phase: Math.random() * TAU });

    // Torso and two shoulders: near-symmetric, so the silhouette reads as a body, not a heap.
    this.lobes.push(lobe(0, 0.1, lean ? 0.8 : 0.92));
    const sh = big ? 0.6 : rnd(0.46, 0.52);
    const lift = rnd(0.28, 0.36);
    this.lobes.push(lobe(-0.56, -lift, sh));
    this.lobes.push(lobe(0.56, -lift + rnd(-0.05, 0.05), sh * rnd(0.9, 1.05)));
    if (this.spec.quirk === 'bulk' || big) {
      this.lobes.push(lobe(-0.5, 0.48, 0.46));
      this.lobes.push(lobe(0.5, 0.48, 0.46));
    }
    if (this.spec.quirk === 'gut') this.lobes.push(lobe(0, 0.42, 0.5, true));
    if (this.spec.quirk === 'sac') this.lobes.push(lobe(-0.72, -0.62, 0.3, true));

    // Heads: one where a head belongs; a smaller one on a shoulder half the time (alpha: both).
    this.heads.push({ ox: 0, oy: -0.92, r: big ? 0.52 : 0.46, phase: Math.random() * TAU, main: true });
    const sides: (-1 | 1)[] = big ? [-1, 1] : Math.random() < 0.5 ? [Math.random() < 0.5 ? -1 : 1] : [];
    for (const s of sides) {
      this.heads.push({ ox: s * 0.66, oy: -0.66, r: 0.26, phase: Math.random() * TAU, main: false });
    }

    // One pair of arms; the alpha grows a second pair behind the mass.
    const arm = (side: -1 | 1, back: boolean): Limb => ({
      side, back,
      oy: back ? -0.15 : 0.02,
      len: lean ? 1.25 : 1.05,
      thick: lean ? 0.11 : 0.15,
      phase: Math.random() * TAU,
    });
    this.limbs.push(arm(-1, false), arm(1, false));
    if (big) this.limbs.push(arm(-1, true), arm(1, true));

    // The seam: one clean curve across the chest, mirrored at random so a horde varies.
    const flip = Math.random() < 0.5 ? -1 : 1;
    this.seams.push({ x1: -0.62 * flip, y1: -0.22, cx: 0, cy: 0.1, x2: 0.5 * flip, y2: 0.62, stitches: 4 });
    if (big) this.seams.push({ x1: 0.66 * flip, y1: -0.3, cx: 0.35 * flip, cy: -0.05, x2: 0.12 * flip, y2: 0.35, stitches: 3 });
  }

  update(delta: number, st: AmalgamBodyState): void {
    if (!this.g.active) return;
    const dt = delta / 1000;
    this.t += dt;
    const speed = Math.hypot(st.vx, st.vy);
    const spd01 = Math.min(1, speed / 160);
    this.walk += dt * (0.5 + spd01 * 2.4);
    if (speed > 5) this.travel = Math.atan2(st.vy, st.vx);
    this.eyeAng = st.aim ?? this.travel;

    const k = Math.min(1, 7 * dt);
    this.leanX += (Phaser.Math.Clamp(st.vx / 150, -1, 1) - this.leanX) * k;
    this.smear += (((st.dashing ? 0.24 : 0) + spd01 * 0.06) - this.smear) * k;

    this.last = st;
    this.paint(st, 1, 1, 0);
  }

  /**
   * A body-space (units of `size`) → world-space mapper carrying the whole pose: the lunge pop,
   * the shamble bob, the lean of the upper mass, and the stretch along travel. Everything drawn
   * goes through it, so the creature deforms as one piece.
   */
  private mapper(st: AmalgamBodyState, S: number, sink: number): (ox: number, oy: number) => [number, number] {
    const bob = Math.sin(this.walk * TAU * 2) * S * 0.04 + sink;
    const cos = Math.cos(this.travel);
    const sin = Math.sin(this.travel);
    const smear = this.smear;
    const lean = this.leanX;
    return (ox, oy) => {
      let px = ox * S + lean * Math.max(0, 0.4 - oy) * S * 0.45;
      let py = oy * S;
      if (smear > 0.002) {
        const along = px * cos + py * sin;
        const across = -px * sin + py * cos;
        const a2 = along * (1 + smear);
        const c2 = across * (1 - smear * 0.5);
        px = a2 * cos - c2 * sin;
        py = a2 * sin + c2 * cos;
      }
      return [st.x + px, st.y + py + bob];
    };
  }

  private paint(st: AmalgamBodyState, sizeScale: number, alphaMult: number, sink: number): void {
    const g = this.g;
    const u = this.under;
    g.clear();
    u.clear();
    const a = st.alpha * alphaMult;
    if (a <= 0.02) return;
    const S = this.spec.size * st.pop * sizeScale;
    const tx = this.mapper(st, S, sink);

    // Ground: one soft shadow and a faint pool of the owner's light. Nothing else down there.
    const [gx, gy] = tx(0, 0.98);
    u.fillStyle(this.tint(SOUL.void), a * 0.32);
    u.fillEllipse(gx, gy + S * 0.1, S * 2.0, S * 0.6);
    u.fillStyle(this.tint(st.tones.body), a * 0.14);
    u.fillEllipse(gx, gy + S * 0.04, S * 1.3, S * 0.4);

    if (st.dashing) this.drawSmear(g, st, S, a, tx);
    for (const l of this.limbs) if (l.back) this.drawLimb(g, st, l, S, a, tx);
    this.drawMass(g, st, S, a, tx);
    this.drawSeams(g, st, S, a, tx);
    // Heads back-to-front: the shoulder heads sit under the main skull's outline.
    for (const h of this.heads) if (!h.main) this.drawHead(g, st, h, S, a, tx);
    for (const h of this.heads) if (h.main) this.drawHead(g, st, h, S, a, tx);
    for (const l of this.limbs) if (!l.back) this.drawLimb(g, st, l, S, a, tx);
    if (st.angered) this.drawAngeredRim(g, S, a, tx);
    if (this.spec.alpha) SoulFx.drawAlphaCrown(g, this.tint, st.tones, ...tx(0, -0.1), S * 0.95, this.t, !!st.angered);
  }

  private lobeR(l: Lobe, S: number): number {
    return l.r * S * (1 + 0.04 * Math.sin(this.t * 2.2 + l.phase));
  }

  /**
   * The mass: one dark outline under every lobe, then every lobe filled flat in one tone so they
   * fuse into a single silhouette. Shading is one highlight and one shadow for the whole shape.
   */
  private drawMass(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const rim = Math.max(1.5, S * 0.1);
    g.fillStyle(this.tint(tones.shroud), a);
    for (const l of this.lobes) {
      const [cx, cy] = tx(l.ox, l.oy);
      g.fillCircle(cx, cy, this.lobeR(l, S) + rim);
    }
    g.fillStyle(this.tint(tones.body), a);
    for (const l of this.lobes) {
      const [cx, cy] = tx(l.ox, l.oy);
      g.fillCircle(cx, cy, this.lobeR(l, S));
    }
    const torso = this.lobes[0];
    const [tcx, tcy] = tx(torso.ox, torso.oy);
    const tr = this.lobeR(torso, S);
    // One shadow under the belly, one highlight across the chest.
    g.fillStyle(this.tint(tones.shroud), a * 0.35);
    g.fillEllipse(tcx, tcy + tr * 0.55, tr * 1.5, tr * 0.6);
    g.fillStyle(this.tint(tones.glow), a * 0.3);
    g.fillEllipse(tcx - tr * 0.2, tcy - tr * 0.35, tr * 1.0, tr * 0.55);
    // A recruited variant keeps its own colour as a clean patch on the belly.
    if (this.spec.fleshColor !== undefined) {
      g.fillStyle(this.tint(this.spec.fleshColor), a * 0.55);
      g.fillEllipse(tcx, tcy + tr * 0.32, tr * 0.95, tr * 0.62);
      g.lineStyle(Math.max(1, S * 0.05), this.tint(tones.shroud), a * 0.6);
      g.strokeEllipse(tcx, tcy + tr * 0.32, tr * 0.95, tr * 0.62);
    }
    for (const l of this.lobes) {
      if (!l.lit) continue;
      const [cx, cy] = tx(l.ox, l.oy);
      const r = this.lobeR(l, S);
      const heat = 0.5 + 0.5 * Math.sin(this.t * 4 + l.phase);
      g.fillStyle(this.tint(tones.core), a * (0.35 + 0.3 * heat));
      g.fillCircle(cx, cy, r * (0.55 + 0.1 * heat));
      g.fillStyle(this.tint(tones.spark), a * 0.6);
      g.fillCircle(cx, cy, r * 0.22);
    }
  }

  /** Point on a seam's quadratic curve at `f`. */
  private seamAt(s: Seam, f: number): [number, number] {
    const m = 1 - f;
    return [m * m * s.x1 + 2 * m * f * s.cx + f * f * s.x2, m * m * s.y1 + 2 * m * f * s.cy + f * f * s.y2];
  }

  /**
   * The stitching: one smooth seam with neat cross-stitches. A burning or Inflamed amalgam has
   * it split open, glowing from inside — and vents heat from the shoulders.
   */
  private drawSeams(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const hot = st.burning || st.inflamed;
    for (const s of this.seams) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) pts.push(tx(...this.seamAt(s, i / 10)));
      const line = (w: number, color: number, alpha: number): void => {
        g.lineStyle(w, this.tint(color), alpha);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.strokePath();
      };
      line(Math.max(1.2, S * 0.08), st.tones.shroud, a * 0.9);
      if (hot) line(Math.max(1, S * 0.05), SOUL.flame, a * (0.55 + 0.4 * Math.sin(this.t * 6)));
      // Cross-stitches, perpendicular to the seam.
      for (let i = 0; i < s.stitches; i++) {
        const f = (i + 0.5) / s.stitches;
        const [ax, ay] = this.seamAt(s, f - 0.02);
        const [bx, by] = this.seamAt(s, f + 0.02);
        const d = Math.hypot(bx - ax, by - ay) || 1;
        const nx = -(by - ay) / d * 0.13;
        const ny = (bx - ax) / d * 0.13;
        const [mx, my] = this.seamAt(s, f);
        const [p1x, p1y] = tx(mx - nx, my - ny);
        const [p2x, p2y] = tx(mx + nx, my + ny);
        g.lineStyle(Math.max(1, S * 0.055), this.tint(hot ? SOUL.cinder : SOUL.bone), a * 0.95);
        g.lineBetween(p1x, p1y, p2x, p2y);
      }
    }
    if (st.inflamed || st.burning) {
      for (const s of [-1, 1]) {
        const [vx, vy] = tx(s * 0.55, -0.62);
        soulWispLayered(
          g, this.tint, TORMENT_TONES, vx, vy, -Math.PI / 2 + s * 0.3,
          S * (0.45 + 0.15 * Math.sin(this.t * 3 + s)), S * 0.11, a * 0.65,
          this.t * 6 + s, { tatters: 0, beads: false },
        );
      }
    }
  }

  /**
   * A head: a clean skull — outline, dome, two sockets whose pips track the prey, and a mouth that
   * works. The shoulder heads are the same drawing, smaller.
   */
  private drawHead(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, h: Head, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const bob = Math.sin(this.walk * TAU + h.phase) * (h.main ? 0.03 : 0.05);
    const [x, y] = tx(h.ox, h.oy + bob);
    const r = h.r * S;
    const jaw = st.dashing || st.burning ? 1 : 0.45 + 0.35 * Math.max(0, Math.sin(this.t * (h.main ? 3.2 : 4.6) + h.phase));

    g.fillStyle(this.tint(tones.shroud), a);
    g.fillCircle(x, y, r + Math.max(1.5, S * 0.1));
    g.fillStyle(this.tint(tones.body), a);
    g.fillCircle(x, y, r);
    g.fillStyle(this.tint(tones.glow), a * 0.3);
    g.fillEllipse(x - r * 0.2, y - r * 0.38, r * 1.1, r * 0.6);

    // Mouth: one dark slot with three bone teeth along its top edge.
    const my = y + r * 0.48;
    g.fillStyle(this.tint(SOUL.void), a * 0.9);
    g.fillEllipse(x, my, r * 0.8, r * 0.5 * jaw);
    g.fillStyle(this.tint(SOUL.bone), a * 0.95);
    for (let i = 0; i < 3; i++) {
      g.fillRect(x - r * 0.28 + i * r * 0.22, my - r * 0.24 * jaw, r * 0.12, r * 0.18 * jaw);
    }

    // Sockets, with pips shifted toward the prey. Blinks on a per-head clock.
    const ex = Math.cos(this.eyeAng) * r * 0.1;
    const ey = Math.sin(this.eyeAng) * r * 0.1;
    const lid = (this.t * 0.42 + h.phase) % 1 > 0.95 ? 0.15 : 1;
    const flare = st.dashing ? 1.3 : 1;
    for (const s of [-1, 1]) {
      const sx = x + s * r * 0.36;
      const sy = y - r * 0.08;
      g.fillStyle(this.tint(SOUL.void), a * 0.95);
      g.fillEllipse(sx, sy, r * 0.5, r * 0.46);
      g.fillStyle(this.tint(tones.core), a * lid);
      g.fillCircle(sx + ex, sy + ey, r * 0.15 * flare * lid);
      g.fillStyle(this.tint(tones.spark), a * lid);
      g.fillCircle(sx + ex - r * 0.04, sy + ey - r * 0.04, r * 0.06 * flare * lid);
    }

    if (h.main && this.spec.quirk === 'horns') {
      for (const s of [-1, 1]) {
        g.fillStyle(this.tint(SOUL.bone), a);
        g.beginPath();
        g.moveTo(x + s * r * 0.55, y - r * 0.6);
        g.lineTo(x + s * r * 0.95, y - r * 1.45);
        g.lineTo(x + s * r * 0.25, y - r * 0.88);
        g.closePath();
        g.fillPath();
      }
    }
    if (h.main && this.spec.quirk === 'halo') {
      g.lineStyle(Math.max(1.2, r * 0.14), this.tint(SOUL.bone), a * 0.9);
      g.strokeEllipse(x, y - r * 1.25, r * 1.5, r * 0.42);
    }
  }

  /** An arm: two tapered segments, rounded joints and a small three-clawed hand. */
  private drawLimb(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, l: Limb, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const moving = Math.min(1, Math.hypot(st.vx, st.vy) / 160);
    const swing = Math.sin(this.walk * TAU + l.phase) * (0.18 + 0.28 * moving);
    // Arms hang down-and-out; front arms reach a little toward the prey.
    const rest = l.side < 0 ? Math.PI * 0.68 : Math.PI * 0.32;
    let upper = rest + swing * l.side;
    if (!l.back) upper = Phaser.Math.Angle.RotateTo(upper, this.eyeAng, 0.25);
    const fore = upper + 0.45 * -l.side;

    const rx = l.side * 0.78;
    const ry = l.oy;
    const ex = rx + Math.cos(upper) * l.len * 0.5;
    const ey = ry + Math.sin(upper) * l.len * 0.5;
    const hx = ex + Math.cos(fore) * l.len * 0.48;
    const hy = ey + Math.sin(fore) * l.len * 0.48;
    const [x0, y0] = tx(rx, ry);
    const [x1, y1] = tx(ex, ey);
    const [x2, y2] = tx(hx, hy);

    const w = l.thick * S;
    const outline = this.tint(tones.shroud);
    const fill = this.tint(l.back ? tones.shroud : tones.body);
    // Outline first, then the fill — the same two-pass trick as the mass, so the arm is clean.
    g.lineStyle(w * 2 + 3, outline, a);
    g.lineBetween(x0, y0, x1, y1);
    g.lineBetween(x1, y1, x2, y2);
    g.fillStyle(outline, a);
    g.fillCircle(x1, y1, w + 1.5);
    g.fillCircle(x2, y2, w * 1.25 + 1.5);
    g.lineStyle(w * 2, fill, a);
    g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(w * 1.7, fill, a);
    g.lineBetween(x1, y1, x2, y2);
    g.fillStyle(fill, a);
    g.fillCircle(x1, y1, w);
    g.fillCircle(x2, y2, w * 1.25);
    // Claws: three small bone hooks off the hand.
    g.fillStyle(this.tint(SOUL.bone), a * 0.95);
    for (let i = -1; i <= 1; i++) {
      const ang = fore + i * 0.45;
      const bx = x2 + Math.cos(ang) * w * 1.1;
      const by = y2 + Math.sin(ang) * w * 1.1;
      const px = -Math.sin(ang) * w * 0.25;
      const py = Math.cos(ang) * w * 0.25;
      g.beginPath();
      g.moveTo(bx + px, by + py);
      g.lineTo(bx + Math.cos(ang) * w * 0.9, by + Math.sin(ang) * w * 0.9);
      g.lineTo(bx - px, by - py);
      g.closePath();
      g.fillPath();
    }
  }

  /** Angered tier: one clean red rim around the whole mass, pulsing. */
  private drawAngeredRim(
    g: Phaser.GameObjects.Graphics, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
    const [cx, cy] = tx(0, -0.15);
    g.lineStyle(Math.max(1.5, S * 0.1), this.tint(SOUL.blood), a * (0.45 + 0.3 * pulse));
    g.strokeEllipse(cx, cy, S * (2.6 + 0.12 * pulse), S * (2.5 + 0.12 * pulse));
  }

  /** Mid-lunge: two clean streamers of spirit trailing off the back of the mass. */
  private drawSmear(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const back = this.travel + Math.PI;
    for (const off of [-0.35, 0.35]) {
      const [px, py] = tx(Math.cos(back) * 0.6 - Math.sin(back) * off, Math.sin(back) * 0.5 + Math.cos(back) * off);
      soulWispLayered(
        g, this.tint, st.tones, px, py, back, S * (0.9 + 0.2 * Math.sin(this.t * 9 + off)), S * 0.16, a * 0.5,
        this.t * 10 + off, { tatters: 0, beads: false },
      );
    }
  }

  /**
   * Death: the stitches give and the whole thing sinks in on itself. Tween-backed, so a scene
   * restart kills it — the kit hands the body over here instead of destroying it.
   */
  collapse(): void {
    const st = this.last;
    if (!st || !this.g.active) { this.destroy(); return; }
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 340,
      onUpdate: (tw) => {
        if (!this.g.active) return;
        const p = Number(tw.getValue());
        this.paint(st, 1 - p * 0.5, 1 - p, p * this.spec.size * 0.6);
      },
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.g.destroy();
    this.under.destroy();
  }
}

// ── SoulAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one spirit ball hand, outermost first. */
const SOUL_AVATAR: AvatarSpec = {
  hands: [
    { r: 10.5, color: SOUL.amethyst, alpha: 0.28 },
    { r: 6.6, color: SOUL.orchid, alpha: 0.85 },
    { r: 3.6, color: SOUL.lilac, alpha: 1 },
    { r: 1.5, color: SOUL.pale, alpha: 1, ox: -2, oy: -2.2 },
  ],
  eyeWhite: SOUL.lilac,
  eyePupil: SOUL.void,
  // A hand made of vapour smears badly — soul takes the loosest squash of any element here.
  squash: { div: 11, x: 0.62, y: 0.34 },
};

/**
 * The soul character rig: two spirit ball hands, a pair of eyes, and a torn shroud streaming off
 * the crown. The hands, eyes and gestures come from BaseAvatar; what soul adds is the pool of
 * grave-light underfoot and the cowl above.
 */
export class SoulAvatar extends BaseAvatar {
  private fx: SoulFx;
  private tones: SoulTones;
  private readonly baseTones: SoulTones;
  /** Soul Lord at 25 kills: a golden, haloed, winged figure. */
  private ascended = false;
  /** 0 → 1 over the transformation, so the wings unfold rather than pop in. */
  private ascendT = 0;

  constructor(scene: Phaser.Scene, tint: SoulColorFn, tones: SoulTones = SPIRIT_TONES, depth = 6) {
    super(scene, tint, depth, SOUL_AVATAR);
    this.fx = new SoulFx(scene, tint);
    this.tones = tones;
    this.baseTones = tones;
    if (tones !== SPIRIT_TONES) this.paintHands(tones);
  }

  private paintHands(tones: SoulTones): void {
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.glow), 0.85));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.core), 1));
  }

  /**
   * Soul Lord ascension: the whole character turns gold — hands, eyes, the body under them —
   * the torn cowl becomes a halo and a pair of feathered wings unfolds behind it.
   */
  setAscended(on: boolean): void {
    if (on === this.ascended) return;
    this.ascended = on;
    this.tones = on ? GOLD_TONES : this.baseTones;
    this.paintHands(this.tones);
    this.forEachHandLayer(3, (spark) => spark.setFillStyle(this.tint(on ? SOUL.halo : SOUL.pale), 1));
    // Re-run the mastery tell against the new tones: it owns the outer halo and the eye white.
    this.applyMastery(this.mastered);
    this.forEachHandLayer(0, (halo) => { if (on) halo.setFillStyle(this.tint(SOUL.gold), 0.32); });
    if (!on) this.ascendT = 0;
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered soul
   * user is identifiable at a glance before they cast anything: white-hot eyes, a wide corona on
   * each hand, a taller and wider cowl, and three attendant spirits circling the head. Shape
   * changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? SOUL.white : this.tones.core);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14.5 : 10.5);
      halo.setFillStyle(this.tint(on ? this.tones.core : SOUL.amethyst), on ? 0.32 : 0.28);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.5, this.tint(SOUL.pale), 0.85);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed loose spirit. */
  protected emitTrail(x: number, y: number): void {
    this.fx.wisps(x, y, 1, { speed: 12, size: 2.2, life: 620, rise: -18, depth: 5, tones: this.tones });
  }

  /** Grave-light pooling under the character, with wisps standing out of the floor. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    if (this.ascended) {
      this.ascendT = Math.min(1, this.ascendT + 0.02);
      this.drawWings(g, x, y, a);
    }
    g.fillStyle(this.tint(this.tones.shroud), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 7, 54 * this.intensity, 26 * this.intensity);
    g.fillStyle(this.tint(this.tones.body), a * 0.22 * this.intensity);
    g.fillEllipse(x, y + 5, 38 * this.intensity, 19 * this.intensity);
    if (this.mastered && !this.ascended) {
      // Mastered: a necromancer's rune circle turning slowly on the ground.
      const rx = 33 * this.intensity, ry = 15 * this.intensity, cy = y + 8;
      g.lineStyle(1.6, this.tint(this.tones.core), a * 0.75);
      g.strokeEllipse(x, cy, rx * 2, ry * 2);
      g.lineStyle(1, this.tint(this.tones.glow), a * 0.5);
      g.strokeEllipse(x, cy, rx * 1.6, ry * 1.6);
      for (let i = 0; i < 8; i++) {
        const u = this.t * 0.6 + (i / 8) * TAU;
        const px = x + Math.cos(u) * rx * 0.9, py = cy + Math.sin(u) * ry * 0.9;
        g.fillStyle(this.tint(i % 2 ? SOUL.white : this.tones.core), a * 0.9);
        g.fillRect(px - 1, py - 2, 2, 4);
      }
    }
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + Math.sin(this.t * 0.7 + i * 1.3) * 0.5;
      const ox = (i - 2) * 8.5;
      soulWispLayered(
        g, this.tint, this.tones, x + ox, y + 8, ang,
        (11 + Math.sin(this.t * 2.4 + i) * 4) * this.intensity, 2.6, a * 0.4,
        this.t * 4 + i * 1.7, { tatters: 0, beads: false },
      );
    }
  }

  /**
   * The cowl: a torn hood of spirit streaming up and back off the crown, with the shreds of it
   * peeling away. Rooted at y - 18 so it never covers the face, and drawn over the sprite so its
   * lit edges show rather than only the dark tips clearing the body.
   */
  /**
   * Ascended wings: two fans of long gold feathers behind the body, beating slowly. Drawn on the
   * glow layer, under the sprite, so the body sits in front of them.
   */
  private drawWings(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const open = easeOut(this.ascendT);
    const beat = Math.sin(this.t * 2.4) * 0.12;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        // Feathers fan from up-and-out (i=0) to out-and-down (i=4).
        const spread = (-0.95 + i * 0.32 + beat) * open;
        const ang = side < 0 ? Math.PI - spread : spread;
        const len = (34 - i * 3.5) * open;
        const rx = x + side * 8, ry = y - 4;
        const tipX = rx + Math.cos(ang) * len, tipY = ry + Math.sin(ang) * len;
        const px = -Math.sin(ang) * 4.6, py = Math.cos(ang) * 4.6;
        g.fillStyle(this.tint(SOUL.bronze), a * 0.9);
        g.beginPath();
        g.moveTo(rx + px * 1.2, ry + py * 1.2);
        g.lineTo(tipX, tipY);
        g.lineTo(rx - px * 1.2, ry - py * 1.2);
        g.closePath();
        g.fillPath();
        g.fillStyle(this.tint(i % 2 ? SOUL.gold : SOUL.sun), a);
        g.beginPath();
        g.moveTo(rx + px * 0.7, ry + py * 0.7);
        g.lineTo(rx + Math.cos(ang) * len * 0.94, ry + Math.sin(ang) * len * 0.94);
        g.lineTo(rx - px * 0.7, ry - py * 0.7);
        g.closePath();
        g.fillPath();
      }
    }
  }

  /** Ascended: a gold body over the sprite, under the eyes — the whole character turns golden. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (!this.ascended) { this.drawShroud(g, x, y, alpha); return; }
    const k = this.ascendT;
    g.fillStyle(this.tint(SOUL.bronze), alpha * k);
    g.fillCircle(x, y, 21);
    g.fillStyle(this.tint(SOUL.gold), alpha * k);
    g.fillCircle(x, y, 19);
    g.fillStyle(this.tint(SOUL.sun), alpha * 0.85 * k);
    g.fillCircle(x - 2, y - 3, 13);
    g.fillStyle(this.tint(SOUL.halo), alpha * 0.8 * k);
    g.fillEllipse(x - 6.5, y - 8.5, 8, 5);
    g.lineStyle(1.6, this.tint(SOUL.halo), alpha * 0.7 * k);
    g.strokeCircle(x, y, 20.5);
  }

  /**
   * The grave-shroud: a tattered dark hem across the lower body with a stitched trim. Mastered,
   * the trim burns white and a soul sigil — a ringed eye with three rays — glows on the chest
   * below the face band.
   */
  private drawShroud(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const top = y + 6;
    const pts: Array<[number, number]> = [];
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const ang = (20 + (i / N) * 140) * (Math.PI / 180);
      const sway = Math.sin(this.t * 3 + i * 1.3) * 0.8;
      const r = (i % 2 ? 21 : 18) + sway;
      pts.push([x + Math.cos(ang) * r, y + Math.max(6.5, Math.sin(ang) * r)]);
    }
    g.fillStyle(this.tint(this.tones.shroud), alpha * 0.72);
    g.beginPath();
    g.moveTo(x + 20.5, top);
    for (const [px, py] of pts) g.lineTo(px, py);
    g.lineTo(x - 20.5, top);
    g.closePath();
    g.fillPath();
    // Stitched trim along the top of the hem.
    g.lineStyle(1.2, this.tint(this.mastered ? SOUL.white : this.tones.glow), alpha * (this.mastered ? 0.85 : 0.5));
    g.lineBetween(x - 20, top, x + 20, top);
    for (let sx = -17; sx <= 17; sx += 4.25) {
      g.lineBetween(x + sx - 1, top - 1.5, x + sx + 1, top + 1.5);
    }
    // Two hanging tatters.
    for (const side of [-1, 1]) {
      const sw = Math.sin(this.t * 2.6 + side) * 1.5;
      g.fillStyle(this.tint(this.tones.body), alpha * 0.6);
      g.fillTriangle(x + side * 9 - 2, top + 2, x + side * 9 + 2, top + 2, x + side * 10 + sw, top + 13);
    }
    if (this.mastered) {
      const pulse = 0.55 + 0.45 * Math.sin(this.t * 3.5);
      const sy = y + 13;
      g.fillStyle(this.tint(this.tones.core), alpha * 0.35 * pulse);
      g.fillCircle(x, sy, 6.5);
      g.lineStyle(1.3, this.tint(SOUL.white), alpha * (0.6 + pulse * 0.4));
      g.strokeCircle(x, sy, 4);
      g.fillStyle(this.tint(SOUL.white), alpha);
      g.fillEllipse(x, sy, 4, 2.2);
      g.fillStyle(this.tint(SOUL.void), alpha);
      g.fillCircle(x, sy, 0.9);
      for (const ra of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
        g.lineBetween(x + Math.cos(ra) * 5, sy + Math.sin(ra) * 5, x + Math.cos(ra) * 7.5, sy + Math.sin(ra) * 7.5);
      }
    }
  }

  /**
   * The Lantern of the Damned, hung off the right hand on a short chain. A soul flame flickers
   * in the cage; mastered, the cage is gilded and the flame burns white-hot inside a wide halo.
   */
  private drawLantern(g: Phaser.GameObjects.Graphics, alpha: number): void {
    const hx = this.armX[1], hy = this.armY[1];
    const sway = Math.sin(this.t * 2.2) * 2.2;
    const lx = hx + sway, ly = hy + 12;
    const m = this.mastered || this.ascended;
    const metal = m ? SOUL.gold : SOUL.stone;
    const metalHi = m ? SOUL.sun : SOUL.bone;
    const flick = 0.75 + 0.25 * Math.sin(this.t * 13) * Math.sin(this.t * 7.3);
    // Halo.
    g.fillStyle(this.tint(m ? SOUL.halo : this.tones.glow), alpha * (m ? 0.3 : 0.18) * flick);
    g.fillCircle(lx, ly + 1, m ? 13 : 8);
    // Chain.
    g.lineStyle(1, this.tint(metal), alpha * 0.9);
    g.lineBetween(hx, hy + 3, lx, ly - 6);
    // Cap and ring.
    g.fillStyle(this.tint(metal), alpha);
    g.fillTriangle(lx - 4.5, ly - 4, lx + 4.5, ly - 4, lx, ly - 7.5);
    g.strokeCircle(lx, ly - 8, 1.4);
    // Glass with flame.
    g.fillStyle(this.tint(SOUL.void), alpha * 0.85);
    g.fillRect(lx - 3.6, ly - 4, 7.2, 8.5);
    g.fillStyle(this.tint(m ? SOUL.sun : this.tones.glow), alpha * flick);
    g.fillEllipse(lx, ly + 0.5, 4.2, 6.5 * flick);
    g.fillStyle(this.tint(SOUL.white), alpha * (m ? 1 : 0.7));
    g.fillEllipse(lx, ly + 1.4, 1.8, 3);
    // Cage bars and base.
    g.lineStyle(1, this.tint(metalHi), alpha);
    g.strokeRect(lx - 3.6, ly - 4, 7.2, 8.5);
    g.lineBetween(lx, ly - 4, lx, ly + 4.5);
    g.fillStyle(this.tint(metal), alpha);
    g.fillRect(lx - 4.5, ly + 4.5, 9, 2);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    this.drawLantern(g, alpha);
    if (this.ascended) {
      // The cowl is gone: a bright halo floats above the crown instead.
      const hy = y - 30 + Math.sin(this.t * 2) * 1.5;
      g.lineStyle(6, this.tint(SOUL.gold), alpha * 0.35);
      g.strokeEllipse(x, hy, 30, 9);
      g.lineStyle(3, this.tint(SOUL.sun), alpha);
      g.strokeEllipse(x, hy, 26, 7);
      g.lineStyle(1.2, this.tint(SOUL.halo), alpha);
      g.strokeEllipse(x, hy - 0.5, 24, 6);
      return;
    }
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.32 : 1;
    // The cowl leans away from the aim, as though the character is always walking into wind.
    const lean = -Math.PI / 2 - Math.cos(this.facing) * 0.32;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const height = 24 * this.intensity * scale * (1 - Math.abs(side) * 0.22);
      soulWispLayered(
        g, this.tint, this.tones,
        x + side * 7, rootY,
        lean + side * 0.5, height, 5.4 * scale, a * 0.95,
        this.t * 3.4 + i * 1.6, { tatters: 1 },
      );
    }

    // Mastery: attendant spirits circling the head, each a little screaming face.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.15 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 25;
        const cy = y - 30 + Math.sin(p) * 8;
        soulWispLayered(g, this.tint, this.tones, cx, cy, p + Math.PI / 2,
          13, 3.4, alpha * 0.9, this.t * 6 + i * 2, { tatters: 1 });
        g.fillStyle(this.tint(SOUL.void), 0.85 * alpha);
        g.fillCircle(cx - 1.4, cy - 0.8, 0.9);
        g.fillCircle(cx + 1.4, cy - 0.8, 0.9);
      }
    }
  }
}
