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
 * Colours must come from the SOUL palette below. Soul has no colour-slot cosmetic yet, but every
 * call still routes through the owner's `soulColor` mapper, so the day one lands it is a table
 * edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.soulColor bound to one owner. */
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
   * The lantern arc: a spark thrown from the caster to the cursor along a slack, wavering cord
   * of spirit light, with a bloom where it lands. Replaces the old straight line + dot.
   */
  lanternArc(x1: number, y1: number, x2: number, y2: number, depth = 6, tones: SoulTones = SPIRIT_TONES): void {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    const sagSign = Math.random() < 0.5 ? 1 : -1;
    const sag = Math.min(26, dist * 0.16) * sagSign;
    const steps = Phaser.Math.Clamp(Math.round(dist / 12), 4, 26);
    const wave = Math.random() * TAU;

    this.anim(depth, 220, (g, t) => {
      const fade = 1 - easeIn(t);
      const px = -Math.sin(angle), py = Math.cos(angle);
      g.lineStyle(2.6 * fade, this.tint(tones.glow), 0.55 * fade);
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        // Slack cord: a parabola across the span with a live ripple riding it.
        const off = sag * Math.sin(f * Math.PI) + Math.sin(f * 7 + wave + t * 9) * 3.5;
        const cx = x1 + dx * f + px * off, cy = y1 + dy * f + py * off;
        if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
      }
      g.strokePath();
      // The spark itself, running the cord.
      const f = Math.min(1, t * 1.6);
      const off = sag * Math.sin(f * Math.PI);
      const sx = x1 + dx * f + px * off, sy = y1 + dy * f + py * off;
      soulWispLayered(g, this.tint, tones, sx, sy, angle + Math.PI, 16 * fade, 3.4 * fade, 0.9 * fade,
        wave + t * 10, { tatters: 1 });
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
  /** A recruited variant's own colour, bled into the lower flesh. */
  fleshColor?: number;
  quirk?: AmalgamQuirk;
  /** Alpha amalgam: a heavier mass with more heads, more arms and thicker seams. */
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
  /** Breath amplitude as a fraction of `r`. */
  wob: number;
  /** Lower lobes take the variant's flesh colour; upper ones stay spirit. */
  lower: boolean;
  /** Blaster gut: lit from inside and pulsing. */
  lit?: boolean;
}

/** A spare arm. Two segments, a clawed hand, and its own place in the walk cycle. */
interface Limb {
  ang: number;
  len: number;
  thick: number;
  phase: number;
  /** Drawn behind the mass, in shroud tones — the depth cue that gives the thing bulk. */
  back: boolean;
  claws: number;
}

/** A head — the main one, or one of the spares budding off a shoulder. */
interface Head {
  ox: number;
  oy: number;
  r: number;
  phase: number;
  main: boolean;
}

/** A seam knitting one lobe to the torso. */
interface Seam {
  from: Lobe;
  to: Lobe;
  sutures: number;
}

/** Bone that didn't get covered back over. */
interface Spur {
  ox: number;
  oy: number;
  ang: number;
  len: number;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/**
 * The body of a raised amalgam, repainted from scratch every frame.
 *
 * An amalgam is several corpses sewn into one thing, so it is drawn as a *mass* rather than a
 * disc: a torso with shoulder humps and haunches that each breathe on their own phase, seams of
 * bone suture hauling every junction together, spare arms sprouting where arms have no business
 * being, and the heads of everyone it was made of — one where a head belongs and the rest budding
 * off the shoulders, all of them screaming.
 *
 * The kit owns the state (tier, burn, buff, lunge) and hands it in each frame. The *structure* is
 * rolled once in the constructor, so no two amalgams in a horde share a silhouette.
 */
export class SoulAmalgamBody {
  private g: Phaser.GameObjects.Graphics;
  /** Ground pool, kept separate because one Graphics can only hold one depth. */
  private under: Phaser.GameObjects.Graphics;
  private t = 0;
  /** Shamble phase, advanced by how fast it is actually moving — a still amalgam idles. */
  private walk = 0;
  private lobes: Lobe[] = [];
  private limbs: Limb[] = [];
  private heads: Head[] = [];
  private seams: Seam[] = [];
  private spurs: Spur[] = [];
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

  /** Rolls the creature: which bodies it is made of, where their heads and arms ended up. */
  private build(): void {
    const big = !!this.spec.alpha;
    const lean = this.spec.quirk === 'lean';
    const lobe = (ox: number, oy: number, r: number, lower: boolean, lit = false): Lobe => ({
      ox, oy, r, lower, lit, phase: Math.random() * TAU, wob: rnd(0.04, 0.1),
    });

    // Torso, then the bodies pressed onto it. Every offset is in units of `size`.
    const torso = lobe(0, 0.06, lean ? 0.78 : 0.9, false);
    this.lobes.push(torso);
    const shoulderR = big ? rnd(0.56, 0.66) : rnd(0.42, 0.54);
    this.lobes.push(lobe(-rnd(0.48, 0.62), -rnd(0.28, 0.42), shoulderR, false));
    this.lobes.push(lobe(rnd(0.48, 0.62), -rnd(0.28, 0.42), shoulderR * rnd(0.85, 1.1), false));
    this.lobes.push(lobe(-rnd(0.3, 0.46), rnd(0.42, 0.56), rnd(0.34, 0.46), true));
    this.lobes.push(lobe(rnd(0.3, 0.46), rnd(0.42, 0.56), rnd(0.34, 0.46), true));
    if (big || Math.random() < 0.55) this.lobes.push(lobe(rnd(-0.24, 0.24), -rnd(0.55, 0.7), rnd(0.3, 0.4), false));
    if (this.spec.quirk === 'bulk') {
      this.lobes.push(lobe(-rnd(0.6, 0.8), rnd(0.1, 0.3), rnd(0.4, 0.5), true));
      this.lobes.push(lobe(rnd(0.6, 0.8), rnd(0.1, 0.3), rnd(0.4, 0.5), true));
    }
    if (this.spec.quirk === 'gut') this.lobes.push(lobe(rnd(-0.1, 0.1), rnd(0.3, 0.4), rnd(0.52, 0.62), true, true));
    if (this.spec.quirk === 'sac') this.lobes.push(lobe(-rnd(0.65, 0.8), -rnd(0.5, 0.65), rnd(0.3, 0.38), false, true));

    // Every lobe but the torso is stitched onto it.
    for (let i = 1; i < this.lobes.length; i++) {
      this.seams.push({ from: torso, to: this.lobes[i], sutures: Math.round(rnd(3, 5)) });
    }

    // Heads: one where a head belongs, the rest budding off the upper mass.
    this.heads.push({ ox: rnd(-0.1, 0.1), oy: -rnd(0.88, 1.0), r: big ? 0.5 : rnd(0.4, 0.47), phase: Math.random() * TAU, main: true });
    const extras = big ? 3 : Math.random() < 0.45 ? 2 : 1;
    for (let i = 0; i < extras; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.heads.push({
        ox: side * rnd(0.45, 0.78), oy: -rnd(0.4, 0.78),
        r: rnd(0.19, 0.28), phase: Math.random() * TAU, main: false,
      });
    }

    // Arms. Half hang behind the mass so the silhouette has depth.
    const count = big ? Math.round(rnd(5, 6)) : Math.round(rnd(3, 4));
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.limbs.push({
        ang: side < 0 ? Math.PI - rnd(-0.35, 0.85) : rnd(-0.35, 0.85),
        len: lean ? rnd(1.2, 1.55) : rnd(0.88, 1.35),
        thick: lean ? rnd(0.1, 0.14) : rnd(0.13, 0.2),
        phase: Math.random() * TAU,
        back: i >= count - Math.max(1, Math.floor(count / 2)),
        claws: Math.round(rnd(2, 4)),
      });
    }

    // Bone that never got covered back over.
    for (let i = 0; i < Math.round(rnd(2, 4)); i++) {
      const a = rnd(0, TAU);
      this.spurs.push({ ox: Math.cos(a) * rnd(0.4, 0.8), oy: Math.sin(a) * rnd(0.3, 0.6), ang: a, len: rnd(0.2, 0.36) });
    }
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
    this.smear += (((st.dashing ? 0.26 : 0) + spd01 * 0.1) - this.smear) * k;

    this.last = st;
    this.paint(st, 1, 1, 0);
  }

  /**
   * A body-space (units of `size`) → world-space mapper carrying the whole pose: the lunge pop,
   * the shamble bob, the lean of the upper mass, and the stretch along travel. Everything drawn
   * goes through it, so the creature deforms as one piece.
   */
  private mapper(st: AmalgamBodyState, S: number, sink: number): (ox: number, oy: number) => [number, number] {
    const bob = Math.sin(this.walk * TAU * 2) * S * 0.05 + sink;
    const cos = Math.cos(this.travel);
    const sin = Math.sin(this.travel);
    const smear = this.smear;
    const lean = this.leanX;
    return (ox, oy) => {
      let px = ox * S + lean * Math.max(0, 0.4 - oy) * S * 0.55;
      let py = oy * S;
      if (smear > 0.002) {
        const along = px * cos + py * sin;
        const across = -px * sin + py * cos;
        const a2 = along * (1 + smear);
        const c2 = across * (1 - smear * 0.55);
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
    const tones = st.tones;
    const tx = this.mapper(st, S, sink);

    this.drawGround(u, st, S, a, tx);
    for (const l of this.limbs) if (l.back) this.drawLimb(g, st, l, S, a, tx);
    this.drawMass(g, st, S, a, tx);
    this.drawSeams(g, st, S, a, tx);
    this.drawSpurs(g, S, a, tx);
    // Leaked spirit off the crown, under the heads so the faces stay the read.
    for (let i = 0; i < 3; i++) {
      const [wx, wy] = tx((i - 1) * 0.24, -0.95);
      soulWispLayered(
        g, this.tint, tones, wx, wy,
        -Math.PI / 2 + Math.sin(this.t * 1.7 + i * 2) * 0.4,
        S * (0.5 + 0.18 * Math.sin(this.t * 2.6 + i)), S * 0.12, a * 0.5,
        this.t * 4 + i * 2, { tatters: 1, beads: false },
      );
    }
    for (const h of this.heads) this.drawHead(g, st, h, S, a, tx);
    for (const l of this.limbs) if (!l.back) this.drawLimb(g, st, l, S, a, tx);
    if (st.angered) this.drawAngeredRim(g, S, a, tx);
    if (st.dashing) this.drawSmear(g, st, S, a, tx);
    if (this.spec.alpha) SoulFx.drawAlphaCrown(g, this.tint, tones, ...tx(0, -0.1), S * 0.95, this.t, !!st.angered);
  }

  /** Grave-light pooling under it, with wisps standing out of the floor. */
  private drawGround(
    u: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const [gx, gy] = tx(0, 0.95);
    u.fillStyle(this.tint(SOUL.void), a * 0.34);
    u.fillEllipse(gx, gy + S * 0.12, S * 2.1, S * 0.72);
    u.fillStyle(this.tint(st.tones.shroud), a * 0.3);
    u.fillEllipse(gx, gy + S * 0.06, S * 1.6, S * 0.55);
    u.fillStyle(this.tint(st.tones.body), a * 0.16);
    u.fillEllipse(gx, gy, S * 1.05, S * 0.34);
    for (let i = 0; i < 3; i++) {
      soulWispLayered(
        u, this.tint, st.tones, gx + (i - 1) * S * 0.5, gy,
        -Math.PI / 2 + Math.sin(this.t * 0.9 + i * 1.4) * 0.45,
        S * (0.3 + 0.12 * Math.sin(this.t * 2.2 + i)), S * 0.1, a * 0.32,
        this.t * 3.5 + i * 1.7, { tatters: 0, beads: false },
      );
    }
  }

  /** The mass itself: a shroud halo behind every lobe, then the flesh, then rim light. */
  private drawMass(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const flesh = this.spec.fleshColor;
    const rOf = (l: Lobe): number => l.r * S * (1 + l.wob * Math.sin(this.t * 2.2 + l.phase));

    // Halo pass first for every lobe, so no lobe's halo paints over a neighbour's body.
    g.fillStyle(this.tint(tones.shroud), a * 0.85);
    for (const l of this.lobes) {
      const [cx, cy] = tx(l.ox, l.oy);
      g.fillCircle(cx, cy + rOf(l) * 0.06, rOf(l) * 1.12);
    }
    for (const l of this.lobes) {
      const r = rOf(l);
      const [cx, cy] = tx(l.ox, l.oy);
      g.fillStyle(this.tint(tones.body), a * 0.95);
      g.fillCircle(cx, cy, r);
      // A recruited variant keeps its own colour in the meat it brought with it.
      if (flesh && l.lower) {
        g.fillStyle(this.tint(flesh), a * 0.34);
        g.fillCircle(cx, cy + r * 0.18, r * 0.76);
      }
      // Underside shade, then a rim light up-left: two circles is enough to round a disc off.
      g.fillStyle(this.tint(SOUL.void), a * 0.16);
      g.fillCircle(cx + r * 0.24, cy + r * 0.3, r * 0.55);
      g.fillStyle(this.tint(tones.glow), a * 0.2);
      g.fillCircle(cx - r * 0.22, cy - r * 0.28, r * 0.6);
      // Blaster gut / spitter sac: lit from inside and swelling.
      if (l.lit) {
        const heat = 0.5 + 0.5 * Math.sin(this.t * 4 + l.phase);
        g.fillStyle(this.tint(tones.core), a * (0.3 + 0.3 * heat));
        g.fillCircle(cx, cy, r * (0.55 + 0.1 * heat));
        g.lineStyle(1.4, this.tint(tones.spark), a * 0.6);
        g.strokeCircle(cx, cy, r * 0.78);
      }
    }
  }

  /**
   * The stitching. Each seam runs from the torso into the lobe it is holding on, with bone
   * sutures crossing it and a frayed thread end where the surgeon gave up. A burning or Inflamed
   * amalgam has its seams split open, glowing from the inside.
   */
  private drawSeams(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const hot = st.burning || st.inflamed;
    for (let si = 0; si < this.seams.length; si++) {
      const s = this.seams[si];
      // The seam sits on the junction: from just inside the torso to just inside the lobe.
      const dx = s.to.ox - s.from.ox;
      const dy = s.to.oy - s.from.oy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const [x1, y1] = tx(s.from.ox + nx * s.from.r * 0.45, s.from.oy + ny * s.from.r * 0.45);
      const [x2, y2] = tx(s.to.ox - nx * s.to.r * 0.2, s.to.oy - ny * s.to.r * 0.2);

      g.lineStyle(Math.max(1, S * 0.11), this.tint(tones.shroud), a * 0.85);
      g.lineBetween(x1, y1, x2, y2);
      if (hot) {
        const heat = 0.55 + 0.45 * Math.sin(this.t * 6 + si * 1.7);
        g.lineStyle(Math.max(1, S * 0.07), this.tint(SOUL.scar), a * 0.9);
        g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(Math.max(0.8, S * 0.035), this.tint(SOUL.flame), a * (0.4 + 0.5 * heat));
        g.lineBetween(x1, y1, x2, y2);
      }
      // Sutures crossing it, each nodding on its own phase.
      const px = -ny;
      const py = nx;
      for (let i = 0; i < s.sutures; i++) {
        const f = (i + 0.5) / s.sutures;
        const cx = x1 + (x2 - x1) * f;
        const cy = y1 + (y2 - y1) * f;
        const w = S * 0.16 * (1 + 0.14 * Math.sin(this.t * 3 + i + si));
        g.lineStyle(Math.max(0.8, S * 0.055), this.tint(SOUL.bone), a * 0.9);
        g.lineBetween(cx - px * w, cy - py * w, cx + px * w, cy + py * w);
        if (hot) {
          g.fillStyle(this.tint(SOUL.cinder), a * 0.7 * (0.4 + 0.6 * Math.sin(this.t * 7 + i * 2)));
          g.fillCircle(cx, cy, S * 0.045);
        }
      }
      // One thread end left hanging off the seam.
      if (si % 2 === 0) {
        soulWispLayered(
          g, this.tint, hot ? TORMENT_TONES : tones, x2, y2,
          Math.atan2(y2 - y1, x2 - x1) + 0.6, S * 0.3, S * 0.05, a * 0.55,
          this.t * 5 + si, { tatters: 0, beads: false },
        );
      }
    }
    // Inflamed vents heat off the shoulders even when nothing is burning it.
    if (st.inflamed) {
      for (const s of [-1, 1]) {
        const [vx, vy] = tx(s * 0.5, -0.5);
        soulWispLayered(
          g, this.tint, TORMENT_TONES, vx, vy, -Math.PI / 2 + s * 0.35,
          S * (0.55 + 0.2 * Math.sin(this.t * 3 + s)), S * 0.13, a * 0.6,
          this.t * 6 + s, { tatters: 1, beads: false },
        );
      }
    }
  }

  /** Rib shards and bone spurs pushing out through the flesh. */
  private drawSpurs(
    g: Phaser.GameObjects.Graphics, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    for (const s of this.spurs) {
      const [bx, by] = tx(s.ox, s.oy);
      const len = s.len * S;
      const tipX = bx + Math.cos(s.ang) * len;
      const tipY = by + Math.sin(s.ang) * len;
      const w = len * 0.28;
      const px = -Math.sin(s.ang) * w;
      const py = Math.cos(s.ang) * w;
      g.fillStyle(this.tint(SOUL.bone), a * 0.9);
      g.beginPath();
      g.moveTo(bx + px, by + py);
      g.lineTo(tipX, tipY);
      g.lineTo(bx - px, by - py);
      g.closePath();
      g.fillPath();
      g.fillStyle(this.tint(SOUL.stone), a * 0.5);
      g.fillCircle(bx, by, w * 0.8);
    }
  }

  /**
   * A head: skull dome, sunken sockets with pips that track whatever it is hunting, and a jaw
   * that hangs open and works. The spare heads are the same drawing at a third the size — a
   * shoulder growing a face is the whole point of the creature.
   */
  private drawHead(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, h: Head, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const bob = Math.sin(this.walk * TAU + h.phase) * (h.main ? 0.03 : 0.06);
    const [x, y] = tx(h.ox, h.oy + bob);
    const r = h.r * S;
    // Wide open while lunging or burning; otherwise a slack, working jaw.
    const scream = st.dashing || st.burning ? 0.85 : 0.35;
    const jaw = scream + (1 - scream) * Math.max(0, Math.sin(this.t * (h.main ? 3.4 : 5) + h.phase));

    g.fillStyle(this.tint(tones.shroud), a * 0.9);
    g.fillCircle(x, y, r * 1.14);
    g.fillStyle(this.tint(tones.body), a);
    g.fillCircle(x, y, r);
    g.fillStyle(this.tint(tones.glow), a * 0.3);
    g.fillCircle(x - r * 0.24, y - r * 0.3, r * 0.55);

    // The mouth: a dark socket with bone teeth across the top of it.
    const my = y + r * 0.5;
    g.fillStyle(this.tint(SOUL.void), a * 0.92);
    g.fillEllipse(x, my, r * 0.95, r * 0.85 * jaw);
    const teeth = h.main ? 4 : 3;
    g.fillStyle(this.tint(SOUL.bone), a * 0.9);
    for (let i = 0; i < teeth; i++) {
      const f = (i + 0.5) / teeth;
      g.fillRect(x - r * 0.45 + r * 0.9 * f - r * 0.05, my - r * 0.42 * jaw, r * 0.1, r * 0.3 * jaw);
    }

    // Sockets and the pips burning in them, offset toward whatever it is hunting.
    const ex = Math.cos(this.eyeAng) * r * 0.13;
    const ey = Math.sin(this.eyeAng) * r * 0.13;
    // Blink: a shared clock offset per head, so a crowd of faces never blinks in unison.
    const blinkPhase = (this.t * 0.42 + h.phase) % 1;
    const lid = blinkPhase > 0.94 ? 0.12 : 1;
    for (const s of [-1, 1]) {
      const sx = x + s * r * 0.37;
      const sy = y - r * 0.16;
      g.fillStyle(this.tint(SOUL.void), a * 0.9);
      g.fillCircle(sx, sy, r * 0.26);
      const flare = st.dashing ? 1.35 : 1;
      g.fillStyle(this.tint(tones.glow), a * 0.55 * lid);
      g.fillCircle(sx + ex, sy + ey, r * 0.2 * flare * lid);
      g.fillStyle(this.tint(tones.spark), a * 0.95 * lid);
      g.fillCircle(sx + ex, sy + ey, r * 0.1 * flare * lid);
    }

    if (h.main && this.spec.quirk === 'horns') {
      for (const s of [-1, 1]) {
        g.fillStyle(this.tint(SOUL.bone), a * 0.95);
        g.beginPath();
        g.moveTo(x + s * r * 0.6, y - r * 0.55);
        g.lineTo(x + s * r * 1.05, y - r * 1.5);
        g.lineTo(x + s * r * 0.28, y - r * 0.85);
        g.closePath();
        g.fillPath();
      }
    }
    if (h.main && this.spec.quirk === 'halo') {
      for (let i = 0; i < 6; i++) {
        const ang = this.t * 0.8 + (i / 6) * TAU;
        g.fillStyle(this.tint(SOUL.bone), a * 0.85);
        g.fillCircle(x + Math.cos(ang) * r * 1.25, y - r * 1.15 + Math.sin(ang) * r * 0.3, r * 0.11);
      }
    }
  }

  /** A spare arm: two tapered segments, a knuckle at each joint, and a clawed hand. */
  private drawLimb(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, l: Limb, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const tones = st.tones;
    const swing = Math.sin(this.walk * TAU + l.phase) * (0.2 + 0.32 * Math.min(1, Math.hypot(st.vx, st.vy) / 160));
    // Front arms half-reach toward whatever it is hunting; back arms just swing.
    let upper = l.ang + swing * 0.7;
    if (!l.back) upper = Phaser.Math.Angle.RotateTo(upper, this.eyeAng, 0.3);
    const fore = upper + (0.5 + swing * 0.6) * (l.ang > Math.PI / 2 || l.ang < -Math.PI / 2 ? -1 : 1);

    const rx = Math.cos(l.ang) * 0.74;
    const ry = Math.sin(l.ang) * 0.5 + 0.05;
    const exU = rx + Math.cos(upper) * l.len * 0.55;
    const eyU = ry + Math.sin(upper) * l.len * 0.55;
    const hxU = exU + Math.cos(fore) * l.len * 0.5;
    const hyU = eyU + Math.sin(fore) * l.len * 0.5;
    const [x0, y0] = tx(rx, ry);
    const [x1, y1] = tx(exU, eyU);
    const [x2, y2] = tx(hxU, hyU);

    const col = l.back ? tones.shroud : tones.body;
    const w = l.thick * S;
    g.lineStyle(w * 1.9, this.tint(col), a * 0.95);
    g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(w * 1.5, this.tint(col), a * 0.95);
    g.lineBetween(x1, y1, x2, y2);
    g.fillStyle(this.tint(col), a * 0.95);
    g.fillCircle(x0, y0, w * 1.1);
    g.fillCircle(x1, y1, w * 0.95);
    g.fillCircle(x2, y2, w * 1.05);
    if (!l.back) {
      g.lineStyle(w * 0.55, this.tint(tones.glow), a * 0.5);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(this.tint(tones.glow), a * 0.4);
      g.fillCircle(x2, y2, w * 0.6);
    }
    // Claws, fanned off the hand along the forearm.
    for (let i = 0; i < l.claws; i++) {
      const ang = fore + (i - (l.claws - 1) / 2) * 0.42;
      const tipX = x2 + Math.cos(ang) * w * 1.9;
      const tipY = y2 + Math.sin(ang) * w * 1.9;
      const px = -Math.sin(ang) * w * 0.22;
      const py = Math.cos(ang) * w * 0.22;
      g.fillStyle(this.tint(SOUL.bone), a * 0.9);
      g.beginPath();
      g.moveTo(x2 + px, y2 + py);
      g.lineTo(tipX, tipY);
      g.lineTo(x2 - px, y2 - py);
      g.closePath();
      g.fillPath();
    }
  }

  /** Angered tier: a boiling red rim that never quite settles into a circle. */
  private drawAngeredRim(
    g: Phaser.GameObjects.Graphics, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const segs = 18;
    g.lineStyle(Math.max(1.2, S * 0.09), this.tint(SOUL.blood), a * 0.55);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const ang = ((i % segs) / segs) * TAU;
      const rr = 1.2 + 0.11 * Math.sin(this.t * 6 + i * 2.1);
      const [px, py] = tx(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.85 - 0.05);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    for (let i = 0; i < 3; i++) {
      const ang = this.t * 1.5 + (i / 3) * TAU;
      const [px, py] = tx(Math.cos(ang) * 1.1, Math.sin(ang) * 0.9);
      soulWispLayered(
        g, this.tint, ANGERED_TONES, px, py, ang, S * 0.5, S * 0.12, a * 0.5,
        this.t * 7 + i, { tatters: 0, beads: false },
      );
    }
  }

  /** Mid-lunge: torn spirit streaming out of the back of the mass. */
  private drawSmear(
    g: Phaser.GameObjects.Graphics, st: AmalgamBodyState, S: number, a: number,
    tx: (ox: number, oy: number) => [number, number],
  ): void {
    const back = this.travel + Math.PI;
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * 0.35;
      const [px, py] = tx(Math.cos(back) * 0.7 - Math.sin(back) * off, Math.sin(back) * 0.55 + Math.cos(back) * off);
      soulWispLayered(
        g, this.tint, st.tones, px, py, back, S * (0.9 + 0.25 * Math.sin(this.t * 9 + i)), S * 0.17, a * 0.6,
        this.t * 10 + i, { tatters: 1, beads: false },
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

  constructor(scene: Phaser.Scene, tint: SoulColorFn, tones: SoulTones = SPIRIT_TONES, depth = 6) {
    super(scene, tint, depth, SOUL_AVATAR);
    this.fx = new SoulFx(scene, tint);
    this.tones = tones;
    if (tones !== SPIRIT_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.glow), 0.85));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.core), 1));
    }
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
    g.fillStyle(this.tint(this.tones.shroud), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 7, 54 * this.intensity, 26 * this.intensity);
    g.fillStyle(this.tint(this.tones.body), a * 0.22 * this.intensity);
    g.fillEllipse(x, y + 5, 38 * this.intensity, 19 * this.intensity);
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
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
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
