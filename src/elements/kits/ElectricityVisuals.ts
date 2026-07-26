import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Electricity renders: the live-wire avatar (plasma ball arms,
 * a lightning-rod crown, eyes), the crackling auras, and the one-shot effects every electric
 * ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * electricity electric: the bolt, the palette, and the effects built out of them.
 *
 * Colours must come from the ELECTRIC palette below. Electricity has no skin
 * yet, but every call still routes through the owner's `electricityColor` mapper, so the day one
 * lands it is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.electricityColor bound to one owner. */
export type ElectricColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const ELECTRIC = {
  /** Burnt ground and the dark side of a live wire. */
  tar: 0x120c00,
  ash: 0x3a2a00,
  copper: 0x8a5a00,
  amber: 0xcc8800,
  current: 0xffaa00,
  live: 0xffcc22,
  volt: 0xffee00,
  neon: 0xffff66,
  white: 0xffffff,
  /** Storm side — the NPC's charge and everything that falls out of a cloud. */
  abyss: 0x0e1a2a,
  steel: 0x224466,
  cobalt: 0x3377bb,
  arc: 0x66aaee,
  sky: 0x88ccff,
  pale: 0xcce8ff,
  /** Ball lightning runs violet so a loose orb never blurs into the caster's own sparks. */
  violet: 0x7733cc,
  plasma: 0xaa66ff,
  orchid: 0xcc88ff,
  /** Phoenix perk — the one warm, non-electric thing this element can be wearing. */
  ember: 0xff6600,
  flare: 0xff9900,
} as const;

/** One coherent set of shades for a bolt. `shell → glow → body → hot → core` runs dark to white. */
export interface BoltTones {
  shell: number;
  glow: number;
  body: number;
  hot: number;
  core: number;
}

/** The player's own current: hot yellow, the colour the whole element is keyed to. */
export const LIVE_TONES: BoltTones = {
  shell: ELECTRIC.ash, glow: ELECTRIC.amber, body: ELECTRIC.current,
  hot: ELECTRIC.volt, core: ELECTRIC.white,
};
/** The NPC runs cold blue, so two electricity fighters never blur together mid-fight. */
export const NPC_TONES: BoltTones = {
  shell: ELECTRIC.abyss, glow: ELECTRIC.steel, body: ELECTRIC.cobalt,
  hot: ELECTRIC.sky, core: ELECTRIC.pale,
};
/** Ball lightning and anything else that is loose, unstable and not attached to a caster. */
export const PLASMA_TONES: BoltTones = {
  shell: 0x1a0a2a, glow: ELECTRIC.violet, body: ELECTRIC.plasma,
  hot: ELECTRIC.orchid, core: ELECTRIC.white,
};
/** Storm clouds and everything that falls out of one. */
export const STORM_TONES: BoltTones = {
  shell: ELECTRIC.abyss, glow: ELECTRIC.cobalt, body: ELECTRIC.arc,
  hot: ELECTRIC.sky, core: ELECTRIC.white,
};
/** Phoenix perk. */
export const PHOENIX_TONES: BoltTones = {
  shell: 0x330800, glow: 0x993300, body: ELECTRIC.ember,
  hot: ELECTRIC.flare, core: ELECTRIC.neon,
};

export const tonesFor = (owner: 'player' | 'npc'): BoltTones =>
  (owner === 'player' ? LIVE_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

export interface Pt { x: number; y: number }

export interface BoltOpts {
  /** Sideways wander of the midpoints in px. Defaults to 12% of the span. */
  amplitude?: number;
  /** Kinks along the shaft. Defaults to one every ~22px, clamped to 3–26. */
  segments?: number;
}

/**
 * A bolt: a jagged polyline whose midpoints are re-rolled from scratch on the frame it is drawn.
 *
 * That re-rolling is the whole identity of the element. Every other primitive in the game is a
 * fixed shape that gets tweened; a bolt is never the same shape twice, and drawing one from a
 * cached path immediately reads as a static decal of lightning rather than lightning. Callers
 * that animate a bolt must call this inside the draw callback, not outside it.
 *
 * Both ends are pinned and the wander peaks in the middle, so a bolt always visibly connects the
 * two points it was asked to connect.
 */
export function boltPoints(
  x1: number, y1: number, x2: number, y2: number,
  opts: BoltOpts = {},
): Pt[] {
  const dx = x2 - x1, dy = y2 - y1;
  const span = Math.hypot(dx, dy) || 1;
  const segs = opts.segments ?? Phaser.Math.Clamp(Math.round(span / 22), 3, 26);
  const amp = opts.amplitude ?? span * 0.12;
  const px = -dy / span, py = dx / span;
  const ux = dx / span, uy = dy / span;

  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const pinned = i === 0 || i === segs;
    // Taper the wander toward the ends so the bolt starts and finishes where it was aimed.
    const taper = Math.sin(f * Math.PI);
    const off = pinned ? 0 : (Math.random() - 0.5) * 2 * amp * taper;
    // A little slide along the shaft as well — evenly spaced kinks read as a zigzag decoration.
    const slide = pinned ? 0 : (Math.random() - 0.5) * (span / segs) * 0.55;
    pts.push({
      x: x1 + dx * f + px * off + ux * slide,
      y: y1 + dy * f + py * off + uy * slide,
    });
  }
  return pts;
}

/**
 * Short forks thrown off a parent bolt. Real lightning branches; a single unbranched line reads
 * as a laser, which is a different element entirely.
 */
export function boltBranches(pts: Pt[], count: number, lenFrac = 0.32): Pt[][] {
  if (pts.length < 3 || count <= 0) return [];
  const head = pts[0], tail = pts[pts.length - 1];
  const span = Math.hypot(tail.x - head.x, tail.y - head.y) || 1;
  const out: Pt[][] = [];
  for (let i = 0; i < count; i++) {
    const at = 1 + Math.floor(Math.random() * (pts.length - 2));
    const root = pts[at];
    // Forks lean forward off the parent, the way a real discharge keeps its momentum.
    const base = Math.atan2(tail.y - head.y, tail.x - head.x);
    const ang = base + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.8);
    const len = span * lenFrac * (0.45 + Math.random() * 0.8);
    out.push(boltPoints(
      root.x, root.y,
      root.x + Math.cos(ang) * len, root.y + Math.sin(ang) * len,
      { segments: 4, amplitude: len * 0.2 },
    ));
  }
  return out;
}

function tracePath(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

export interface BoltLayerOpts {
  /** Forks thrown off the shaft. Default 0. */
  branches?: number;
  /** Bright beads at the kinks. They are what stops a stack of strokes reading as a ribbon. */
  nodes?: boolean;
}

/**
 * Layered bolt: a wide soft corona, a body, a hot inner line, a white filament, and beads of
 * light at the kinks.
 *
 * The beads matter as much as the strokes. Four concentric lines along the same path blur into
 * one fat ribbon at gameplay zoom; a bright pip at every other vertex breaks that up and makes
 * the shaft read as a chain of discharges instead.
 */
export function boltLayered(
  g: Phaser.GameObjects.Graphics,
  tint: ElectricColorFn, tones: BoltTones,
  pts: Pt[], width: number, alpha: number,
  opts: BoltLayerOpts = {},
): void {
  if (pts.length < 2) return;

  const forks = opts.branches ? boltBranches(pts, opts.branches) : [];
  for (const f of forks) {
    g.lineStyle(width * 1.5, tint(tones.glow), alpha * 0.2);
    tracePath(g, f);
    g.lineStyle(width * 0.7, tint(tones.hot), alpha * 0.65);
    tracePath(g, f);
    g.lineStyle(width * 0.28, tint(tones.core), alpha * 0.85);
    tracePath(g, f);
  }

  g.lineStyle(width * 3.4, tint(tones.glow), alpha * 0.18);
  tracePath(g, pts);
  g.lineStyle(width * 1.9, tint(tones.body), alpha * 0.5);
  tracePath(g, pts);
  g.lineStyle(width, tint(tones.hot), alpha * 0.9);
  tracePath(g, pts);
  g.lineStyle(width * 0.38, tint(tones.core), alpha);
  tracePath(g, pts);

  if (opts.nodes !== false) {
    for (let i = 1; i < pts.length - 1; i += 2) {
      g.fillStyle(tint(tones.hot), alpha * 0.55);
      g.fillCircle(pts[i].x, pts[i].y, width * 0.95);
      g.fillStyle(tint(tones.core), alpha * 0.9);
      g.fillCircle(pts[i].x, pts[i].y, width * 0.36);
    }
  }
}

export interface SparkOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Downward drift in px over the spark's life. Sparks are hot metal — they fall. */
  fall?: number;
  tones?: BoltTones;
}

export interface DischargeOpts {
  /** Bolts thrown out of the blast. Defaults to radius/9. */
  arms?: number;
  /** Sparks flung clear. Defaults to radius/4. */
  sparks?: number;
  /** Leave a branching burn on the ground. Default true. */
  scorch?: boolean;
  depth?: number;
  duration?: number;
  tones?: BoltTones;
}

// ── ElectricityFx ─────────────────────────────────────────────────────────

/**
 * One-shot electric effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class ElectricityFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ElectricColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: BoltTones = LIVE_TONES): void {
    this.flashIn(x, y, radius, tones.core, tones.hot, depth);
  }

  /**
   * A live arc between two points, re-rolled every frame for its whole (short) life. This is the
   * workhorse: chain shocks, the tether from a bolt to a body, the crackle between two hands.
   */
  arc(
    x1: number, y1: number, x2: number, y2: number,
    opts: { width?: number; duration?: number; depth?: number; branches?: number; tones?: BoltTones } = {},
  ): void {
    const tones = opts.tones ?? LIVE_TONES;
    const width = opts.width ?? 2.4;
    const branches = opts.branches ?? 1;
    this.anim(opts.depth ?? 8, opts.duration ?? 150, (g, t) => {
      // Flickers rather than fading smoothly — a dimmer switch is the wrong verb for an arc.
      const fade = (1 - t) * (0.65 + Math.random() * 0.35);
      boltLayered(g, this.tint, tones, boltPoints(x1, y1, x2, y2), width, fade, { branches });
    });
  }

  /**
   * Chain shock: an arc plus a pop at each end. Used wherever current jumps from a source to a
   * body, so a tick of shock damage has a visible cause rather than just a number.
   */
  chain(x1: number, y1: number, x2: number, y2: number, tones: BoltTones = LIVE_TONES, depth = 8): void {
    this.arc(x1, y1, x2, y2, { width: 2.6, duration: 170, depth, branches: 2, tones });
    this.flash(x2, y2, 12, depth + 1, tones);
    this.sparks(x2, y2, 5, { speed: 110, size: 2, life: 300, depth, tones });
  }

  /**
   * Expanding shock front, drawn as a closed bolt loop whose kinks are re-rolled each frame, so
   * the front visibly crackles outward instead of scaling like a disc.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 5), 16, 72);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      const jag = Math.max(1.5, r * 0.055);
      const pts: Pt[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r + (Math.random() - 0.5) * jag;
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      g.lineStyle(Math.max(0.5, width * 2.4 * (1 - t * 0.6)), c, 0.16 * fade);
      tracePath(g, pts);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.6)), c, 0.75 * fade);
      tracePath(g, pts);
      g.lineStyle(Math.max(0.4, width * 0.35), this.tint(ELECTRIC.white), 0.85 * fade);
      tracePath(g, pts);
    });
  }

  /** Flung sparks: hot pips that streak along their own velocity and sink as they cool. */
  sparks(x: number, y: number, count: number, opts: SparkOpts = {}): void {
    const tones = opts.tones ?? LIVE_TONES;
    const speed = opts.speed ?? 160;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 2.6;
    const life = opts.life ?? 420;
    const fall = opts.fall ?? 42;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 1.1),
        r: size * (0.5 + Math.random() * 0.9),
        delay: Math.random() * 0.2,
        flick: Math.random() * TAU,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d + fall * lt * lt;
        // Every spark flickers on its own beat, so a shower never strobes as one block.
        const fade = (1 - lt * lt) * (0.6 + 0.4 * Math.sin(t * 30 + p.flick));
        if (fade <= 0.02) continue;
        // Streaked backward along its own travel — a spark is a line, not a dot.
        const tailX = ex - p.cos * p.r * 3.2, tailY = ey - p.sin * p.r * 3.2 - fall * lt * 0.2;
        g.lineStyle(p.r * 1.6, this.tint(tones.body), fade * 0.55);
        g.lineBetween(tailX, tailY, ex, ey);
        g.lineStyle(p.r * 0.7, this.tint(tones.core), fade);
        g.lineBetween(tailX, tailY, ex, ey);
        g.fillStyle(this.tint(tones.core), fade);
        g.fillCircle(ex, ey, p.r * 0.6);
      }
    });
  }

  /**
   * A Lichtenberg burn: the branching fern current actually leaves when it earths itself. This
   * is electricity's ground mark — it doesn't stain like oil or splinter like crystal, it etches
   * a fractal into the floor and then cools out of it.
   */
  scorch(x: number, y: number, radius: number, depth = 1, tones: BoltTones = LIVE_TONES): void {
    // Grown once, at spawn: the burn is a permanent mark, so unlike a live arc it must not
    // re-roll its shape every frame.
    const limbs: { pts: Pt[]; w: number; delay: number }[] = [];
    const grow = (fx: number, fy: number, ang: number, len: number, w: number, depthLeft: number, delay: number) => {
      const ex = fx + Math.cos(ang) * len;
      const ey = fy + Math.sin(ang) * len * 0.75;
      limbs.push({ pts: boltPoints(fx, fy, ex, ey, { segments: 3, amplitude: len * 0.14 }), w, delay });
      if (depthLeft <= 0) return;
      const forks = depthLeft > 1 ? 2 : 1 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < forks; i++) {
        grow(
          ex, ey,
          ang + (Math.random() - 0.5) * 1.5,
          len * (0.5 + Math.random() * 0.22),
          w * 0.62, depthLeft - 1, delay + 0.05,
        );
      }
    };
    const roots = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < roots; i++) {
      grow(x, y, (i / roots) * TAU + Math.random() * 0.5, radius * 0.42, 2.6, 2, 0);
    }

    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94;
      g.fillStyle(this.tint(ELECTRIC.tar), 0.4 * a);
      g.fillEllipse(x, y, radius * 1.2, radius * 0.85);
      for (const l of limbs) {
        const lt = Phaser.Math.Clamp((t - l.delay) * 8, 0, 1);
        if (lt <= 0) continue;
        g.lineStyle(l.w * 1.7, this.tint(tones.shell), 0.75 * a * lt);
        tracePath(g, l.pts);
        // The etch stays hot for the first beat, then goes to plain char.
        g.lineStyle(l.w * 0.7, this.tint(tones.hot), 0.8 * a * lt * Math.max(0, 1 - t * 3));
        tracePath(g, l.pts);
      }
    });
  }

  /** Rising ionised haze left behind by a big discharge. */
  smoke(x: number, y: number, count: number, radius: number, depth = 4, tones: BoltTones = LIVE_TONES): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.3,
      oy: (Math.random() - 0.5) * radius * 0.8,
      drift: (Math.random() - 0.5) * 30,
      r: radius * (0.16 + Math.random() * 0.2),
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 1300, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(tones.shell), 0.32 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 34 * lt, p.r * (1 + lt * 1.5));
      }
    });
  }

  /**
   * The body of a discharge: a star of bolts thrown out of the blast point that whip and re-roll
   * while they hold, then snap out. Reads as current earthing itself rather than as a disc.
   */
  arcStar(x: number, y: number, radius: number, count: number, duration: number, depth = 6, tones: BoltTones = LIVE_TONES): void {
    const arms = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU + Math.random() * 0.4,
      len: 0.55 + Math.random() * 0.6,
      delay: (i % 3) * 0.06,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      const core = easeOut(Math.min(1, t * 4));
      g.fillStyle(this.tint(tones.glow), 0.5 * fade);
      g.fillCircle(x, y, radius * 0.35 * core);
      g.fillStyle(this.tint(tones.hot), 0.7 * fade);
      g.fillCircle(x, y, radius * 0.2 * core);

      for (const a of arms) {
        const lt = Math.max(0, (t - a.delay) / (1 - a.delay));
        const reach = radius * a.len * easeOut(Math.min(1, lt * 2.4));
        if (reach < 2) continue;
        boltLayered(
          g, this.tint, tones,
          boltPoints(x, y, x + Math.cos(a.ang) * reach, y + Math.sin(a.ang) * reach),
          Math.max(1.2, radius * 0.035), 0.95 * fade,
          { branches: reach > 40 ? 1 : 0 },
        );
      }
      if (t < 0.35) {
        g.fillStyle(this.tint(tones.core), (1 - t / 0.35) * 0.9);
        g.fillCircle(x, y, radius * 0.16);
      }
    });
  }

  /**
   * Full detonation, six layers deep: white core, a star of earthing bolts, two staggered shock
   * fronts, flung sparks, ionised haze, and a branching burn left on the floor. A single
   * expanding disc always reads as placeholder.
   */
  discharge(x: number, y: number, radius: number, opts: DischargeOpts = {}): void {
    const tones = opts.tones ?? LIVE_TONES;
    const arms = opts.arms ?? Math.max(5, Math.round(radius / 9));
    const sparkCount = opts.sparks ?? Math.max(6, Math.round(radius / 4));
    const dur = opts.duration ?? Math.round(320 + radius * 1.3);
    const depth = opts.depth ?? 6;

    if (opts.scorch !== false) this.scorch(x, y, radius * 0.7, 1, tones);
    this.arcStar(x, y, radius * 0.95, arms, dur, depth, tones);
    this.flash(x, y, radius * 0.34, depth + 2, tones);
    this.ring(x, y, radius * 0.2, radius * 1.05, tones.hot, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(70, () =>
      this.ring(x, y, radius * 0.15, radius * 1.35, tones.body, dur, 3.5, depth));
    this.sparks(x, y, sparkCount, {
      speed: radius * 2.4, size: 2.2 + radius / 60,
      life: Math.round(dur * 1.3), fall: radius * 0.6, depth, tones,
    });
    this.smoke(x, y, Math.max(2, Math.round(radius / 34)), radius * 0.8, depth - 2, tones);
  }

  /** Recoil arc at the throwing hand — sells that a shot actually left a body. */
  muzzleArc(x: number, y: number, angle: number, scale = 1, depth = 6, tones: BoltTones = LIVE_TONES): void {
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      // A short cone of forks kicking back off the hand.
      for (const s of [-1, 0, 1]) {
        const a = angle + s * 0.5;
        const len = 26 * scale * (0.5 + t * 0.9) * (s === 0 ? 1 : 0.65);
        boltLayered(
          g, this.tint, tones,
          boltPoints(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, { segments: 4 }),
          2.4 * scale, 0.9 * fade,
        );
      }
      g.fillStyle(this.tint(tones.core), 0.9 * fade);
      g.fillCircle(x, y, 4.5 * scale * (1 - t * 0.4));
      g.fillStyle(this.tint(tones.glow), 0.4 * fade);
      g.fillCircle(x, y, 11 * scale * (0.6 + t));
    });
  }

  /**
   * The corridor a teleport leaves: a spine of bolt running the whole path with rungs across it,
   * plus a burst at the departure point and the arrival point. Without the corridor a blink is
   * indistinguishable from a rendering glitch.
   */
  teleport(x1: number, y1: number, x2: number, y2: number, depth = 5, tones: BoltTones = LIVE_TONES): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(ang), py = Math.cos(ang);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const rungs = Phaser.Math.Clamp(Math.round(dist / 30), 2, 14);

    this.anim(depth, 320, (g, t) => {
      const fade = 1 - easeIn(t);
      boltLayered(g, this.tint, tones, boltPoints(x1, y1, x2, y2, { amplitude: 14 }), 3.4, 0.9 * fade, { branches: 3 });
      for (let i = 1; i < rungs; i++) {
        const f = i / rungs;
        // Rungs snap outward as the wave of light runs down the corridor.
        const local = Phaser.Math.Clamp(1 - Math.abs(t * 1.5 - f) * 3.4, 0, 1);
        if (local <= 0) continue;
        const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f;
        const w = 16 * local;
        boltLayered(
          g, this.tint, tones,
          boltPoints(cx - px * w, cy - py * w, cx + px * w, cy + py * w, { segments: 3 }),
          1.8, 0.8 * local * fade, { nodes: false },
        );
      }
    });
    this.ring(x1, y1, 26, 6, tones.body, 260, 3, depth);
    this.ring(x2, y2, 6, 44, tones.hot, 340, 4, depth);
    this.flash(x2, y2, 18, depth + 2, tones);
    this.sparks(x2, y2, 10, { speed: 190, size: 2.4, life: 380, depth, tones });
  }

  /**
   * Inward-charging gather: arcs falling in from the rim toward a swelling core while a
   * containment ring squeezes shut. `follow` lets it track a caster who can still move.
   */
  chargeGather(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: BoltTones = LIVE_TONES,
  ): void {
    const feeds = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU,
      spin: 0.6 + (i % 3) * 0.3,
      phase: i / 9,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.86 + Math.sin(t * 30) * 0.14;

      for (const f of feeds) {
        const lt = (t * (1 + f.phase) + f.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = f.ang + t * f.spin * TAU;
        if (r < 3) continue;
        boltLayered(
          g, this.tint, tones,
          boltPoints(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, cx + Math.cos(a) * r, cy + Math.sin(a) * r,
            { segments: 4 }),
          1.8, 0.7 * (1 - lt * 0.55), { nodes: false },
        );
      }

      const cr = radius * (0.1 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(tones.glow), 0.5);
      g.fillCircle(cx, cy, cr * 1.6);
      g.fillStyle(this.tint(tones.hot), 0.8);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.core), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.35);

      // Containment ring closing in, jittering harder the tighter it gets.
      const rr = radius * (1 - easeIn(t) * 0.5) * pulse;
      const segs = 28;
      const pts: Pt[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const j = rr + (Math.random() - 0.5) * (2 + easeIn(t) * 5);
        pts.push({ x: cx + Math.cos(a) * j, y: cy + Math.sin(a) * j });
      }
      g.lineStyle(2.6, this.tint(tones.body), 0.4 + 0.45 * easeIn(t));
      tracePath(g, pts);
    });
  }

  /**
   * A strike falling out of the sky: a bolt down from above the target, a hard flash where it
   * lands and a front running out along the floor.
   */
  skyStrike(x: number, y: number, height = 220, depth = 7, tones: BoltTones = STORM_TONES): void {
    this.anim(depth, 260, (g, t) => {
      // The strike is at full brightness for the first third, then gutters out in flickers.
      const fade = t < 0.3 ? 1 : (1 - (t - 0.3) / 0.7) * (0.4 + Math.random() * 0.6);
      boltLayered(
        g, this.tint, tones,
        boltPoints(x + (Math.random() - 0.5) * 26, y - height, x, y, { amplitude: 26 }),
        3.6, fade, { branches: 4 },
      );
    });
    this.flash(x, y, 28, depth + 1, tones);
    this.ring(x, y, 8, 74, tones.hot, 380, 4, depth - 1);
    this.sparks(x, y, 12, { speed: 200, size: 2.6, life: 420, spread: Math.PI, angle: -Math.PI / 2, depth, tones });
    this.scorch(x, y, 40, 1, tones);
  }

  /** Ignition burst for a stance or a toggle: current locking into a shell around a body. */
  ignite(x: number, y: number, radius: number, depth = 5, tones: BoltTones = LIVE_TONES): void {
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - easeIn(t);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        // Arcs fly *inward* and lock, so the shell reads as assembled rather than exploded.
        const d = radius * (1.6 - easeOut(t) * 0.7);
        boltLayered(
          g, this.tint, tones,
          boltPoints(x + Math.cos(a) * d * 1.25, y + Math.sin(a) * d * 1.25, x + Math.cos(a) * d * 0.6, y + Math.sin(a) * d * 0.6,
            { segments: 4 }),
          2.2, 0.85 * fade, { nodes: false },
        );
      }
    });
    this.ring(x, y, radius * 1.5, radius * 0.75, tones.hot, 380, 4, depth);
    this.flash(x, y, radius * 0.5, depth + 2, tones);
  }

  /**
   * A storm cloud: a boiling dark mass with current lit up inside it, occasionally throwing a
   * fork out of its underside. Painted into a caller-owned Graphics because the kit already owns
   * the cloud's position and lifetime.
   */
  static drawStormCloud(
    g: Phaser.GameObjects.Graphics, tint: ElectricColorFn, tones: BoltTones,
    x: number, y: number, radius: number, t: number, alpha: number, charge: number,
  ): void {
    // Lobes boiling around the mass — a cloud is a cluster, never one circle.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 0.25;
      const bob = 1 + Math.sin(t * 1.7 + i * 1.3) * 0.14;
      g.fillStyle(tint(tones.shell), 0.55 * alpha);
      g.fillCircle(x + Math.cos(a) * radius * 0.5, y + Math.sin(a) * radius * 0.36,
        radius * 0.46 * bob);
    }
    g.fillStyle(tint(ELECTRIC.abyss), 0.6 * alpha);
    g.fillEllipse(x, y, radius * 1.7, radius * 1.1);

    // Interior flicker: sheet lightning inside the mass, brighter as the pulse approaches.
    const heat = 0.25 + charge * 0.7;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.1 + (i / 3) * TAU;
      const d = radius * 0.4;
      g.fillStyle(tint(tones.glow), 0.25 * alpha * heat * (0.5 + 0.5 * Math.sin(t * 7 + i * 2)));
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, radius * 0.4);
    }

    // Live current threading through the cloud, re-rolled every frame.
    for (let i = 0; i < 2; i++) {
      const a0 = t * 0.9 + i * 2.4;
      boltLayered(
        g, tint, tones,
        boltPoints(
          x + Math.cos(a0) * radius * 0.7, y + Math.sin(a0) * radius * 0.42,
          x - Math.cos(a0) * radius * 0.7, y - Math.sin(a0) * radius * 0.42,
          { segments: 6, amplitude: radius * 0.2 },
        ),
        1.8, alpha * (0.35 + heat * 0.55), { nodes: false },
      );
    }

    // A charged cloud sags and glows along its underside just before it fires.
    if (charge > 0.55) {
      const lit = (charge - 0.55) / 0.45;
      g.fillStyle(tint(tones.hot), 0.35 * alpha * lit);
      g.fillEllipse(x, y + radius * 0.5, radius * 1.2 * lit, radius * 0.3 * lit);
    }
  }

  /**
   * Ball lightning: an unstable violet orb with a caged shell of arcs whipping around it and
   * sparks shedding off. Tier drives how many cage wires it carries and how hard it flickers —
   * a tier-4 ball is visibly a different object, not the same one scaled up.
   */
  static drawBallLightning(
    g: Phaser.GameObjects.Graphics, tint: ElectricColorFn, tones: BoltTones,
    x: number, y: number, radius: number, t: number, tier: number,
  ): void {
    const wires = 3 + tier;
    const beat = 0.86 + 0.14 * Math.sin(t * 11);

    g.fillStyle(tint(tones.glow), 0.16);
    g.fillCircle(x, y, radius * 2.2 * beat);
    g.fillStyle(tint(tones.shell), 0.5);
    g.fillCircle(x, y, radius * 1.15);
    g.fillStyle(tint(tones.body), 0.75);
    g.fillCircle(x, y, radius * 0.8 * beat);
    g.fillStyle(tint(tones.hot), 0.85);
    g.fillCircle(x, y, radius * 0.45 * beat);
    g.fillStyle(tint(tones.core), 0.6 + 0.4 * Math.sin(t * 17));
    g.fillCircle(x, y, radius * 0.2);

    // Cage: arcs bowed around the orb on their own axes, re-rolled each frame.
    for (let i = 0; i < wires; i++) {
      const a = t * (1.4 + (i % 3) * 0.4) + (i / wires) * TAU;
      const r = radius * (1.05 + 0.25 * Math.sin(t * 3 + i));
      boltLayered(
        g, tint, tones,
        boltPoints(
          x + Math.cos(a) * r, y + Math.sin(a) * r,
          x - Math.cos(a) * r, y - Math.sin(a) * r,
          { segments: 5, amplitude: radius * 0.5 },
        ),
        1.5 + tier * 0.2, 0.75, { nodes: false },
      );
    }

    // Loose current earthing off the surface — the tell that this thing is not stable.
    if (Math.random() < 0.4 + tier * 0.1) {
      const a = Math.random() * TAU;
      const len = radius * (1.4 + Math.random() * 1.2);
      boltLayered(
        g, tint, tones,
        boltPoints(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, { segments: 4 }),
        1.6, 0.8, { branches: 1 },
      );
    }
  }

  /**
   * A Kinetic Bomb: a caged charge pack. Loose, it tumbles with a homing arc trailing it;
   * latched, it clamps onto its victim and its meter visibly fills as the victim takes damage,
   * so the payoff is readable before it lands.
   */
  static drawKineticBomb(
    g: Phaser.GameObjects.Graphics, tint: ElectricColorFn, tones: BoltTones,
    x: number, y: number, t: number, attached: boolean, charge: number,
  ): void {
    const r = attached ? 11 : 9;
    const beat = attached ? 0.9 + 0.1 * Math.sin(t * (6 + charge * 22)) : 1;

    g.fillStyle(tint(tones.glow), 0.2);
    g.fillCircle(x, y, r * 2.1 * beat);
    g.fillStyle(tint(ELECTRIC.tar), 0.9);
    g.fillCircle(x, y, r);
    g.fillStyle(tint(tones.body), 0.85);
    g.fillCircle(x, y, r * 0.72 * beat);
    g.fillStyle(tint(tones.core), 0.5 + 0.5 * charge);
    g.fillCircle(x, y, r * 0.3);

    // Three bands caging the charge, spun so the pack reads as machined rather than as a bead.
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i / 3) * Math.PI;
      g.lineStyle(2, tint(tones.hot), 0.9);
      g.beginPath();
      g.arc(x, y, r * 1.05, a, a + Math.PI * 0.62, false);
      g.strokePath();
    }

    if (attached) {
      // Charge meter: a ring that closes as the victim feeds it, so you can read the payload.
      g.lineStyle(3, tint(ELECTRIC.tar), 0.7);
      g.strokeCircle(x, y, r * 1.7);
      g.lineStyle(3, tint(tones.core), 0.95);
      g.beginPath();
      g.arc(x, y, r * 1.7, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(charge, 0, 1), false);
      g.strokePath();
      // Barbs biting into the body it has latched onto.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        g.lineStyle(2.2, tint(tones.body), 0.8);
        g.lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1 + 4);
      }
    } else {
      // In flight it drags a live arc behind it.
      boltLayered(
        g, tint, tones,
        boltPoints(x, y, x - Math.cos(t * 9) * 2, y - 22, { segments: 4, amplitude: 6 }),
        1.6, 0.55, { nodes: false },
      );
    }
  }
}

// ── ElectricityAura ───────────────────────────────────────────────────────

export type AuraStyle =
  | 'charge'    // Pain Battery: current being crushed inward, hurting to hold
  | 'overcharge' // Restart: a full-body cage of current, the loudest stance the element has
  | 'shield'    // Kinetic Shield (mastery passive): a quiet standing field that thickens with power
  | 'phoenix';  // Phoenix perk: the one warm aura electricity can be wearing

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it — call
 * `update` every frame with the fighter's position.
 *
 * Styles differ in *shape*, not just colour: the shield is a smooth standing field, the charge
 * aura collapses inward, overcharge cages the whole body in arcs and phoenix sheds feathers of
 * flame. Two of these can be up at once, so they must stay distinguishable at a glance.
 */
export class ElectricityAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;

  constructor(
    private scene: Phaser.Scene,
    private tint: ElectricColorFn,
    private style: AuraStyle,
    private tones: BoltTones,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** 0–1 for `shield` (how charged), 1+ for the rest (how loud). */
  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = this.intensity;

    switch (this.style) {
      case 'shield': {
        if (k <= 0.02) return;
        // A smooth standing field — no whipping, because it is passive protection, not a cast.
        const r = this.radius * (0.8 + k * 0.3);
        g.fillStyle(this.tint(this.tones.glow), 0.1 * k * alpha);
        g.fillCircle(x, y, r);
        g.lineStyle(2 + k * 2, this.tint(this.tones.body), (0.25 + k * 0.35) * alpha);
        g.strokeCircle(x, y, r * (0.97 + 0.03 * Math.sin(this.t * 3)));
        // Charge beads sliding around the rim: how full the battery is, readable at a glance.
        const beads = Math.max(2, Math.round(3 + k * 7));
        for (let i = 0; i < beads; i++) {
          const a = this.t * 1.2 + (i / beads) * TAU;
          g.fillStyle(this.tint(this.tones.core), 0.85 * alpha);
          g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6 + k * 1.4);
        }
        break;
      }
      case 'charge': {
        // Current being crushed toward the body — the visual cost of holding the button.
        g.fillStyle(this.tint(this.tones.shell), 0.22 * alpha * k);
        g.fillCircle(x, y, this.radius * 1.15);
        for (let i = 0; i < 7; i++) {
          const a = this.t * 2.2 + (i / 7) * TAU;
          const pull = 0.45 + 0.55 * ((this.t * 1.6 + i / 7) % 1);
          boltLayered(
            g, this.tint, this.tones,
            boltPoints(
              x + Math.cos(a) * this.radius * 1.35, y + Math.sin(a) * this.radius * 1.35,
              x + Math.cos(a) * this.radius * pull * 0.5, y + Math.sin(a) * this.radius * pull * 0.5,
              { segments: 4 },
            ),
            1.9 * k, 0.7 * alpha, { nodes: false },
          );
        }
        g.fillStyle(this.tint(this.tones.hot), (0.4 + 0.3 * Math.sin(this.t * 16)) * alpha);
        g.fillCircle(x, y, this.radius * 0.3);
        break;
      }
      case 'overcharge': {
        // A cage: arcs running pole to pole around the whole body, plus a hard rim.
        g.fillStyle(this.tint(this.tones.glow), 0.16 * alpha);
        g.fillCircle(x, y, this.radius * 1.25);
        for (let i = 0; i < 5; i++) {
          const a = this.t * 3.4 + (i / 5) * Math.PI;
          boltLayered(
            g, this.tint, this.tones,
            boltPoints(
              x + Math.cos(a) * this.radius, y + Math.sin(a) * this.radius,
              x - Math.cos(a) * this.radius, y - Math.sin(a) * this.radius,
              { segments: 6, amplitude: this.radius * 0.4 },
            ),
            2.2, 0.8 * alpha, { nodes: false },
          );
        }
        const segs = 30;
        const pts: Pt[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i % segs) / segs * TAU;
          const rr = this.radius * (1 + 0.05 * Math.sin(this.t * 5)) + (Math.random() - 0.5) * 4;
          pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
        }
        g.lineStyle(3, this.tint(this.tones.core), 0.85 * alpha);
        tracePath(g, pts);
        break;
      }
      case 'phoenix': {
        // Feathers of flame lifting off the body — warm, and shaped nothing like a bolt, so a
        // reviving player is never confused with a charged one.
        g.fillStyle(this.tint(PHOENIX_TONES.glow), 0.2 * alpha);
        g.fillCircle(x, y, this.radius * 1.2);
        for (let i = 0; i < 9; i++) {
          const p = (this.t * 1.4 + i / 9) % 1;
          const a = -Math.PI / 2 + Math.sin(this.t * 2 + i) * 1.5;
          const lift = p * this.radius * 1.5;
          const w = (1 - p) * 6;
          g.fillStyle(this.tint(p < 0.4 ? PHOENIX_TONES.hot : PHOENIX_TONES.body), (1 - p) * 0.75 * alpha);
          g.fillEllipse(
            x + Math.cos(a) * this.radius * 0.6 + Math.sin(this.t * 5 + i) * 4,
            y + Math.sin(a) * this.radius * 0.4 - lift,
            w, w * 2.4,
          );
        }
        g.lineStyle(2, this.tint(PHOENIX_TONES.core), 0.6 * alpha);
        g.strokeCircle(x, y, this.radius * (0.95 + 0.05 * Math.sin(this.t * 7)));
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── ElectricityAvatar ─────────────────────────────────────────────────────

/** Concentric discs of one plasma ball hand, outermost first. */
const ELECTRIC_AVATAR: AvatarSpec = {
  hands: [
    { r: 10.5, color: ELECTRIC.amber, alpha: 0.26 },
    { r: 6.6, color: ELECTRIC.current, alpha: 0.9 },
    { r: 3.6, color: ELECTRIC.neon, alpha: 1 },
    { r: 1.5, color: ELECTRIC.white, alpha: 1, ox: -2, oy: -2 },
  ],
  eyeWhite: ELECTRIC.neon,
  eyePupil: ELECTRIC.tar,
  // Plasma has almost no mass — the hands smear hard and snap back.
  squash: { div: 11, x: 0.62, y: 0.34 },
};

/**
 * The electricity character rig: two plasma ball hands with current arcing between them, a pair
 * of eyes, and a lightning-rod crown standing off the head with a discharge dancing across the
 * prongs. Hands, eyes and gestures come from BaseAvatar; what electricity adds is the arcing.
 */
export class ElectricityAvatar extends BaseAvatar {
  private fx: ElectricityFx;
  private tones: BoltTones;
  /** Throttles the arc that jumps between the two hands, so it snaps rather than streams. */
  private handArcAt = 0;
  private handArcOn = false;

  constructor(scene: Phaser.Scene, tint: ElectricColorFn, tones: BoltTones = LIVE_TONES, depth = 6) {
    super(scene, tint, depth, ELECTRIC_AVATAR);
    this.fx = new ElectricityFx(scene, tint);
    this.tones = tones;
    if (tones !== LIVE_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.body), 0.9));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.hot), 1));
      this.setEyeWhite(tones.hot);
    }
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character, so a mastered electricity
   * user is identifiable before they cast anything: white-hot eyes, a much wider corona and a
   * hard rim on each hand, a taller five-prong rod, and charge motes orbiting the head. Shape
   * changes, not just brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ELECTRIC.white : (this.tones === LIVE_TONES ? ELECTRIC.neon : this.tones.hot));
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14.5 : 10.5);
      halo.setFillStyle(this.tint(on ? this.tones.hot : ELECTRIC.amber), on ? 0.3 : 0.26);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(ELECTRIC.white), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed sparks. */
  protected emitTrail(x: number, y: number): void {
    this.fx.sparks(x, y, 2, { speed: 40, size: 1.8, life: 340, fall: 22, depth: 5, tones: this.tones });
  }

  /** Pain Battery's brace: hands hauled in tight to the chest and shaking. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    return {
      ang: this.facing + Math.PI + side * 0.5 + (Math.random() - 0.5) * 0.2,
      dist: 14 + Math.random() * 3,
      scale: idle.scale * 1.25,
    };
  }

  /** Current pooling under the character, with tendrils crawling out along the floor. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(this.tones.glow), a * 0.16 * k);
    g.fillEllipse(x, y + 6, 54 * k, 26 * k);
    g.fillStyle(this.tint(this.tones.body), a * 0.2 * k);
    g.fillEllipse(x, y + 6, 34 * k, 16 * k);
    // Ground tendrils, re-rolled every frame so the floor never stops crawling.
    for (let i = 0; i < 5; i++) {
      const ang = this.t * 0.5 + (i / 5) * TAU;
      const len = (13 + Math.sin(this.t * 3 + i) * 5) * k;
      boltLayered(
        g, this.tint, this.tones,
        boltPoints(x, y + 6, x + Math.cos(ang) * len, y + 6 + Math.sin(ang) * len * 0.45, { segments: 3 }),
        1.4, a * 0.55, { nodes: false },
      );
    }
  }

  /**
   * The lightning rod: prongs standing off the crown with a discharge jumping across their tips.
   * Rooted at y - 18 so they never cover the face, and drawn over the sprite so the lit tips
   * show rather than only the dark bases clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.35 : 1;
    const tips: Pt[] = [];

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const height = 20 * this.intensity * scale * (1 - Math.abs(side) * 0.2);
      const bx = x + side * 7.5;
      const lean = -Math.PI / 2 + side * 0.4;
      const tx = bx + Math.cos(lean) * height;
      const ty = rootY + Math.sin(lean) * height;
      tips.push({ x: tx, y: ty });
      // Solid prongs — the rod is hardware, so it is the one part of this element that holds
      // its shape frame to frame.
      g.lineStyle(3.4 * scale, this.tint(this.tones.shell), alpha * 0.95);
      g.lineBetween(bx, rootY, tx, ty);
      g.lineStyle(1.8 * scale, this.tint(this.tones.body), alpha * 0.95);
      g.lineBetween(bx, rootY, tx, ty);
      const lit = 0.4 + 0.6 * Math.max(0, Math.sin(this.t * 6 - i * 1.1));
      g.fillStyle(this.tint(this.tones.hot), alpha * 0.9 * lit);
      g.fillCircle(tx, ty, 3 * scale);
      g.fillStyle(this.tint(this.tones.core), alpha * lit);
      g.fillCircle(tx, ty, 1.3 * scale);
    }

    // Current jumping between adjacent tips — the rod is live, and this is the cheapest way to
    // say so without adding another GameObject.
    for (let i = 0; i < tips.length - 1; i++) {
      if (Math.random() > (this.mastered ? 0.5 : 0.28)) continue;
      boltLayered(
        g, this.tint, this.tones,
        boltPoints(tips[i].x, tips[i].y, tips[i + 1].x, tips[i + 1].y, { segments: 4, amplitude: 5 }),
        1.5 * scale, a * 0.9, { nodes: false },
      );
    }

    // Mastery orbit: charge motes circling the head on a shallow ellipse, each trailing a spark.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 2.2 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 25;
        const cy = y - 31 + Math.sin(p) * 7;
        g.fillStyle(this.tint(this.tones.glow), alpha * 0.4);
        g.fillCircle(cx, cy, 5.5);
        g.fillStyle(this.tint(this.tones.core), alpha * 0.95);
        g.fillCircle(cx, cy, 2.2);
      }
    }
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    super.update(delta, x, y, alpha);
    // An arc snapping between the two hands, on its own irregular beat. Continuous would read as
    // a rope; a snap every few hundred ms reads as a body that is genuinely live.
    this.handArcAt -= delta;
    if (this.handArcAt <= 0) {
      this.handArcAt = (this.mastered ? 180 : 420) + Math.random() * 500;
      this.handArcOn = alpha > 0.02 && Math.random() < (this.intensity > 1 ? 0.9 : 0.55);
      if (this.handArcOn) {
        this.fx.arc(this.armX[0], this.armY[0], this.armX[1], this.armY[1], {
          width: 1.8, duration: 130, depth: 7, branches: this.mastered ? 2 : 1, tones: this.tones,
        });
      }
    }
  }
}
