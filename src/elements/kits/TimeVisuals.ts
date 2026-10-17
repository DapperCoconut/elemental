import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Time renders: the gunslinger avatar (brass fists + eyes + a
 * wide-brim hat), the clock-dial auras, and the one-shot effects every time ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes time
 * time: the clock hand, the palette, and the effects built out of it.
 *
 * Colours must come from the TIME palette below. Time has no skin yet, but every
 * call still routes through the owner's `sandColor` mapper (the element's id is `sand`), so the
 * day one lands it is a table edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.sandColor bound to one owner. */
export type TimeColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const TIME = {
  /** Sun-baked leather and shadow — what the brass is silhouetted against. */
  night: 0x2a1c0a,
  leather: 0x5a3a18,
  brass: 0xb8862b,
  /** Noon light. */
  gold: 0xffdd44,
  noon: 0xffee88,
  pale: 0xfff6c8,
  white: 0xffffff,
  /** The gun itself. */
  gun: 0x3c3c44,
  steel: 0x9aa0ab,
  /** Powder and an aged bullet: a round that has been in the air a while hits red-hot. */
  powder: 0xff8822,
  heat: 0xff4422,
  /** Stopped time. */
  indigo: 0x3a3f7a,
  frost: 0x88aaff,
  /** Bounty Hunter's own clock, running fast. */
  mint: 0x44ffaa,
  deepMint: 0x0f4433,
} as const;

/** One coherent set of shades. `shell → body → lit → hot` runs dark to bright. */
export interface TimeTones {
  shell: number;
  body: number;
  lit: number;
  hot: number;
  spark: number;
}

/** The player's brass: high noon. */
export const NOON_TONES: TimeTones = {
  shell: TIME.leather, body: TIME.brass, lit: TIME.gold, hot: TIME.noon, spark: TIME.white,
};
/** The NPC's runs darker so two gunslingers never blur together. */
export const NPC_TONES: TimeTones = {
  shell: TIME.night, body: 0x8a6520, lit: TIME.brass, hot: TIME.gold, spark: TIME.noon,
};
/** Stopped time: everything goes cold and blue. */
export const FROZEN_TONES: TimeTones = {
  shell: TIME.indigo, body: TIME.gun, lit: TIME.frost, hot: 0xccddff, spark: TIME.white,
};
/** Powder and an aged round. */
export const HEAT_TONES: TimeTones = {
  shell: 0x4a1a08, body: TIME.heat, lit: TIME.powder, hot: TIME.gold, spark: TIME.white,
};
/** Bounty Hunter: your own clock running fast. */
export const MINT_TONES: TimeTones = {
  shell: TIME.deepMint, body: 0x22aa77, lit: TIME.mint, hot: 0x88ffcc, spark: TIME.white,
};

export const tonesFor = (owner: 'player' | 'npc'): TimeTones =>
  (owner === 'player' ? NOON_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * A clock hand: a counterweighted pointer. It runs *backwards* past its own pivot into a stubby
 * tail, narrows down the shaft, swells into a lozenge two thirds along, and finishes at a needle
 * point.
 *
 * No other element here carries mass on both sides of its anchor, and that is the whole read:
 * a time shape has a pivot, and a pivot means it is going to turn. Every ray, spoke, muzzle
 * flare and detonation lobe in the element is built out of this one silhouette.
 */
export function timeHand(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  /** Counterweight length behind the pivot, as a fraction of `len`. */
  tail = 0.2,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const STEPS = 14;

  const width = (u: number): number => {
    if (u < 0) {
      // Counterweight: a rounded stub that swells then closes behind the pivot.
      const k = 1 + u / tail;              // 0 at the very back, 1 at the pivot
      return halfW * (0.35 + 0.75 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))) + 0.35 * k);
    }
    if (u < 0.66) return halfW * (1 - 0.42 * u);
    if (u < 0.86) return halfW * (0.72 + 0.85 * Math.sin(Math.PI * (u - 0.66) / 0.2));
    return halfW * 0.72 * (1 - (u - 0.86) / 0.14);
  };

  const at = (u: number, side: number): [number, number] => {
    const w = side * width(u);
    return [cx + cos * len * u + px * w, cy + sin * len * u + py * w];
  };

  g.beginPath();
  const back = at(-tail, 0.001);
  g.moveTo(back[0], back[1]);
  for (let i = 0; i <= STEPS; i++) {
    const u = -tail + (i / STEPS) * (1 + tail);
    const p = at(u, 1);
    g.lineTo(p[0], p[1]);
  }
  for (let i = STEPS; i >= 0; i--) {
    const u = -tail + (i / STEPS) * (1 + tail);
    const p = at(u, -1);
    g.lineTo(p[0], p[1]);
  }
  g.closePath();
  g.fillPath();
}

export interface HandLayerOpts {
  tail?: number;
  /** Draw the pivot bolt and its bored hole. Default true. */
  pivot?: boolean;
  /** Bright specular down one flank. Default true. */
  edge?: boolean;
}

/**
 * Layered hand: a gunmetal shell, the brass body, a lit inner spine, a needle-bright tip, and
 * the pivot bolt with its bored hole at the root.
 *
 * The pivot is what stops a fan of these reading as a starburst. A hand without a bolt is just
 * a spike; with one, the whole cluster reads as a mechanism.
 */
export function timeHandLayered(
  g: Phaser.GameObjects.Graphics,
  tint: TimeColorFn, tones: TimeTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  opts: HandLayerOpts = {},
): void {
  const tail = opts.tail ?? 0.2;

  g.fillStyle(tint(tones.shell), alpha * 0.85);
  timeHand(g, cx, cy, angle, len * 1.03, halfW * 1.4, tail);
  g.fillStyle(tint(tones.body), alpha * 0.95);
  timeHand(g, cx, cy, angle, len, halfW, tail);
  g.fillStyle(tint(tones.lit), alpha * 0.9);
  timeHand(g, cx, cy, angle, len * 0.95, halfW * 0.5, tail * 0.7);
  g.fillStyle(tint(tones.hot), alpha * 0.85);
  timeHand(g, cx, cy, angle, len * 0.7, halfW * 0.2, 0.05);

  if (opts.edge !== false) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    g.lineStyle(Math.max(0.7, halfW * 0.22), tint(tones.spark), alpha * 0.55);
    g.beginPath();
    g.moveTo(cx + px * halfW, cy + py * halfW);
    g.lineTo(cx + cos * len * 0.86 + px * halfW * 0.72, cy + sin * len * 0.86 + py * halfW * 0.72);
    g.lineTo(cx + cos * len, cy + sin * len);
    g.strokePath();
  }

  if (opts.pivot !== false) {
    g.fillStyle(tint(tones.shell), alpha * 0.95);
    g.fillCircle(cx, cy, halfW * 1.55);
    g.fillStyle(tint(tones.body), alpha);
    g.fillCircle(cx, cy, halfW * 1.1);
    g.fillStyle(tint(tones.spark), alpha * 0.85);
    g.fillCircle(cx - halfW * 0.3, cy - halfW * 0.32, halfW * 0.42);
    g.fillStyle(tint(TIME.night), alpha * 0.8);
    g.fillCircle(cx, cy, halfW * 0.34);
  }
}

export interface DetonateOpts {
  /** Brass casings thrown out. Defaults to radius/9. */
  shells?: number;
  /** Powder smoke puffs. Defaults to radius/40. */
  smoke?: number;
  /** Leave a powder-burn mark on the ground. Default true. */
  burn?: boolean;
  depth?: number;
  duration?: number;
  tones?: TimeTones;
}

export interface HandBurstOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  fall?: number;
  tones?: TimeTones;
}

// ── TimeFx ────────────────────────────────────────────────────────────────

/**
 * One-shot time effects. Cheap to construct — build one per owner and hand it the owner's
 * colour mapper.
 */
export class TimeFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: TimeColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding front, drawn as a clock bezel: a perfectly round rim carrying minute ticks, with
   * four longer hour marks. Time's fronts do not wobble — a clock that wobbles is broken.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const ticks = Phaser.Math.Clamp(Math.round(toR / 7), 12, 48);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 0.85 * (1 - t * t);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.65)), c, fade);
      g.strokeCircle(x, y, r);
      // Ticks turn with the front, so the ring reads as a dial rather than a shockwave.
      const spin = t * 0.6;
      for (let i = 0; i < ticks; i++) {
        const a = spin + (i / ticks) * TAU;
        const long = i % Math.max(1, Math.round(ticks / 4)) === 0;
        const inner = r * (long ? 0.86 : 0.93);
        g.lineStyle(long ? width * 0.7 : width * 0.35, c, fade * (long ? 1 : 0.7));
        g.beginPath();
        g.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
        g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        g.strokePath();
      }
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: TimeTones = NOON_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.lit, depth);
  }

  /**
   * A burst of clock hands flung outward, each turning on its own pivot as it goes. Time's
   * answer to shrapnel: what comes out of a broken clock is its movement.
   */
  hands(x: number, y: number, count: number, opts: HandBurstOpts = {}): void {
    const tones = opts.tones ?? NOON_TONES;
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3.4;
    const life = opts.life ?? 560;
    const fall = opts.fall ?? 30;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.45 + Math.random() * 0.9),
        r: size * (0.55 + Math.random() * 0.85),
        spin0: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 14,
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
        timeHandLayered(g, this.tint, tones, ex, ey, p.spin0 + p.spin * lt,
          p.r * 4 * fade, p.r * 0.75 * fade, 0.9 * fade, { edge: false });
      }
    });
  }

  /** Brass casings ejected and tumbling — the tell that a real gun just cycled. */
  shells(x: number, y: number, count: number, angle: number, depth = 6): void {
    const bits = Array.from({ length: count }, () => ({
      a: angle + Math.PI / 2 + (Math.random() - 0.5) * 0.9,
      v: 60 + Math.random() * 80,
      spin: (Math.random() - 0.5) * 26,
      spin0: Math.random() * TAU,
      len: 5 + Math.random() * 3,
    }));
    this.anim(depth, 620, (g, t) => {
      for (const b of bits) {
        const d = b.v * easeOut(t) * 0.6;
        const ex = x + Math.cos(b.a) * d;
        const ey = y + Math.sin(b.a) * d + 90 * t * t;
        const fade = 1 - easeIn(Math.max(0, (t - 0.6) / 0.4));
        const a = b.spin0 + b.spin * t;
        g.fillStyle(this.tint(TIME.leather), 0.9 * fade);
        g.fillEllipse(ex, ey, b.len * 1.5, b.len * 0.75);
        g.fillStyle(this.tint(TIME.brass), 0.95 * fade);
        timeHand(g, ex, ey, a, b.len, b.len * 0.28, 0.5);
        g.fillStyle(this.tint(TIME.noon), 0.8 * fade);
        g.fillCircle(ex - Math.cos(a) * b.len * 0.4, ey - Math.sin(a) * b.len * 0.4, b.len * 0.22);
      }
    });
  }

  /** Powder smoke: hangs low, drifts, thins. */
  smoke(x: number, y: number, count: number, radius: number, depth = 5): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius,
      oy: (Math.random() - 0.5) * radius * 0.6,
      r: radius * (0.3 + Math.random() * 0.4),
      drift: (Math.random() - 0.5) * 20,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 1200, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(TIME.leather), 0.28 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 18 * lt, p.r * (0.5 + lt * 1.4));
      }
    });
  }

  /** A powder burn scorched into the dirt, with brass glinting in it as it cools. */
  burnMark(x: number, y: number, radius: number, depth = 1, tones: TimeTones = NOON_TONES): void {
    const lobes = Array.from({ length: 7 }, (_, i) => ({
      ang: (i / 7) * TAU + Math.random() * 0.4,
      d: radius * (0.2 + Math.random() * 0.5),
      r: radius * (0.25 + Math.random() * 0.3),
    }));
    const glints = Array.from({ length: 5 }, () => {
      const a = Math.random() * TAU;
      const d = radius * (0.3 + Math.random() * 0.7);
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, a, phase: Math.random() * TAU };
    });
    this.anim(depth, 2300, (g, t) => {
      const a = t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94;
      g.fillStyle(this.tint(TIME.night), 0.55 * a);
      for (const l of lobes) g.fillCircle(x + Math.cos(l.ang) * l.d, y + Math.sin(l.ang) * l.d * 0.7, l.r);
      g.fillStyle(this.tint(tones.shell), 0.3 * a);
      g.fillEllipse(x, y, radius * 1.4, radius * 0.95);
      for (const gl of glints) {
        const tw = Math.max(0, Math.sin(t * 8 + gl.phase));
        g.fillStyle(this.tint(tones.lit), 0.8 * a * tw);
        timeHand(g, gl.x, gl.y, gl.a, 6, 1.2, 0.3);
      }
    });
  }

  /**
   * The body of a time detonation: a rosette of clock hands blown off a central pivot, holding
   * then flying apart. Reads as a movement coming to pieces, not a disc being scaled.
   */
  handBloom(x: number, y: number, radius: number, duration: number, depth = 6, tones: TimeTones = NOON_TONES): void {
    const spokes = Array.from({ length: 12 }, (_, i) => ({
      // Evenly spaced by design: this is a mechanism, and a crooked one reads as a mistake.
      ang: (i / 12) * TAU,
      len: 0.66 + (i % 3) * 0.14,
      w: 0.075 + (i % 2) * 0.025,
      delay: (i % 4) * 0.05,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.32 ? 1 : 1 - (t - 0.32) / 0.68;
      const core = easeOut(Math.min(1, t * 3.4));
      g.fillStyle(this.tint(tones.shell), 0.72 * fade);
      g.fillCircle(x, y, radius * 0.4 * core);
      g.fillStyle(this.tint(tones.body), 0.8 * fade);
      g.fillCircle(x, y, radius * 0.26 * core);
      for (const s of spokes) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(Math.min(1, lt * 2.3));
        const drift = radius * 0.3 * easeIn(lt);
        // Everything turns as it goes, because everything here is on a pivot.
        timeHandLayered(
          g, this.tint, tones,
          x + Math.cos(s.ang) * drift, y + Math.sin(s.ang) * drift,
          s.ang + lt * 1.2, radius * s.len * grow, radius * s.w * (1 - lt * 0.3), 0.92 * fade,
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.4) * 0.9);
        g.fillCircle(x, y, radius * 0.17);
      }
    });
  }

  /** Full detonation: flash, hand rosette, two dial fronts, casings, smoke and a burn mark. */
  detonate(x: number, y: number, radius: number, opts: DetonateOpts = {}): void {
    const tones = opts.tones ?? HEAT_TONES;
    const brass = opts.shells ?? Math.max(3, Math.round(radius / 9));
    const puffs = opts.smoke ?? Math.max(2, Math.round(radius / 40));
    const dur = opts.duration ?? Math.round(320 + radius * 1.3);
    const depth = opts.depth ?? 6;

    if (opts.burn !== false) this.burnMark(x, y, radius * 0.5, 1, tones);
    this.handBloom(x, y, radius * 0.68, dur, depth, tones);
    this.flash(x, y, radius * 0.32, depth + 1, tones);
    this.ring(x, y, radius * 0.18, radius, tones.lit, Math.round(dur * 0.7), 4.5, depth);
    this.scene.time.delayedCall(85, () => this.ring(x, y, radius * 0.15, radius * 1.3, tones.body, dur, 3, depth));
    this.hands(x, y, Math.max(5, Math.round(radius / 10)), {
      speed: radius * 1.8, size: 3 + radius / 46, life: Math.round(dur * 1.3), depth, tones,
    });
    this.shells(x, y, brass, 0, depth);
    this.smoke(x, y, puffs, radius * 0.6, depth - 1);
  }

  /**
   * A revolver going off: the six-point star of flame off the cylinder gap, the long lance out
   * of the barrel, a casing and a puff of powder.
   */
  muzzleFire(x: number, y: number, angle: number, scale = 1, depth = 9, tones: TimeTones = HEAT_TONES): void {
    this.anim(depth, 160, (g, t) => {
      const fade = 1 - t;
      const grow = 0.5 + t;
      // The barrel lance.
      timeHandLayered(g, this.tint, tones, x, y, angle, 34 * scale * grow, 6 * scale * fade, 0.92 * fade,
        { pivot: false, tail: 0.05 });
      // The star of gas escaping the cylinder gap.
      for (let i = 0; i < 6; i++) {
        const a = angle + (i - 2.5) * 0.42;
        g.fillStyle(this.tint(i % 2 === 0 ? tones.lit : tones.hot), 0.65 * fade);
        timeHand(g, x, y, a, 15 * scale * grow * (1 - Math.abs(i - 2.5) * 0.16), 2.6 * scale * fade, 0.1);
      }
      g.fillStyle(this.tint(tones.spark), 0.95 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.4));
    });
    this.shells(x, y, 1, angle, depth - 1);
    this.smoke(x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, 2, 9 * scale, depth - 2);
  }

  /**
   * A rifle beam, held for as long as time is stopped: a hard core with a brass jacket and the
   * dust it has knocked out of the air still hanging along its path.
   */
  static drawBeam(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x1: number, y1: number, x2: number, y2: number, t: number, alpha: number,
  ): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);

    g.lineStyle(6, tint(tones.shell), 0.4 * alpha);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(3.4, tint(tones.body), 0.8 * alpha);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1.5, tint(tones.spark), 0.95 * alpha);
    g.lineBetween(x1, y1, x2, y2);

    // Dust hanging in the channel: the reason a stopped-time shot reads as *held*.
    const motes = Phaser.Math.Clamp(Math.round(dist / 40), 3, 22);
    for (let i = 0; i < motes; i++) {
      const f = (i + 0.5) / motes;
      const off = Math.sin(f * 21 + t * 1.4) * 4;
      const cx = x1 + (x2 - x1) * f + px * off;
      const cy = y1 + (y2 - y1) * f + py * off;
      g.fillStyle(tint(tones.lit), 0.5 * alpha * (0.5 + 0.5 * Math.sin(t * 3 + i)));
      g.fillCircle(cx, cy, 1.6);
    }
    // The pivot the shot swung out of.
    timeHandLayered(g, tint, tones, x1, y1, angle, 22, 3.4, 0.9 * alpha, { pivot: true, edge: false });
  }

  /**
   * A lasso: a braided rope with a live loop at the far end, sagging under its own weight.
   * Painted into a caller-owned Graphics because the kit repositions both ends every frame.
   */
  static drawRope(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x1: number, y1: number, x2: number, y2: number, t: number, loop: boolean,
  ): void {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const steps = Phaser.Math.Clamp(Math.round(dist / 12), 4, 30);
    const sag = Math.min(24, dist * 0.13);

    // Two strands, offset out of phase — that is what makes rope read as braided.
    for (const s of [1, -1]) {
      g.lineStyle(s > 0 ? 2.6 : 1.4, tint(s > 0 ? tones.shell : tones.lit), s > 0 ? 0.9 : 0.75);
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const off = sag * Math.sin(Math.PI * f) + s * 1.8 * Math.sin(f * 16 + t * 3);
        const cx = x1 + dx * f + px * off, cy = y1 + dy * f + py * off;
        if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
      }
      g.strokePath();
    }

    if (loop) {
      // The honda loop, spinning open at the throwing end.
      const spin = t * 4;
      g.lineStyle(2.4, tint(tones.body), 0.95);
      g.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * TAU;
        const cx = x2 + Math.cos(a) * 13 + Math.cos(spin) * 2;
        const cy = y2 + Math.sin(a) * 13 * 0.55;
        if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy);
      }
      g.closePath();
      g.strokePath();
      g.fillStyle(tint(tones.lit), 0.9);
      g.fillCircle(x2 + Math.cos(spin) * 13, y2 + Math.sin(spin) * 13 * 0.55, 2.4);
    }
  }

  /**
   * A rewind drag: ghosts of the body strung back along the path it is being hauled through,
   * each one a beat older and fainter than the last.
   */
  rewind(x1: number, y1: number, x2: number, y2: number, depth = 5, tones: TimeTones = NOON_TONES): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const ghosts = Phaser.Math.Clamp(Math.round(dist / 34), 2, 12);
    this.anim(depth, 420, (g, t) => {
      for (let i = 0; i < ghosts; i++) {
        const f = i / (ghosts - 1 || 1);
        const local = Phaser.Math.Clamp(1 - Math.abs(t * 1.5 - f) * 2.4, 0, 1);
        if (local <= 0) continue;
        const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f;
        g.lineStyle(2, this.tint(tones.lit), 0.5 * local);
        g.strokeCircle(cx, cy, 20 * (0.7 + local * 0.4));
        timeHandLayered(g, this.tint, tones, cx, cy, angle + Math.PI - t * 4,
          16 * local, 2.6 * local, 0.7 * local, { edge: false });
      }
    });
  }

  /**
   * Always Noon: the sun stopping overhead. Long hands sweep out to the rim, hold, and the
   * whole dial locks — the moment the world stops.
   */
  sunstop(x: number, y: number, radius: number, depth = 12, tones: TimeTones = NOON_TONES): void {
    const rays = 12;
    this.anim(depth, 750, (g, t) => {
      const grow = easeOut(Math.min(1, t * 2.2));
      const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      // The dial itself.
      g.lineStyle(4 * fade, this.tint(tones.lit), 0.7 * fade);
      g.strokeCircle(x, y, radius * grow);
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * TAU;
        // The hands stop turning at t≈0.5 — that stall is the whole point of the ability.
        const lock = Math.min(0.5, t) * 2.4;
        timeHandLayered(g, this.tint, tones, x, y, a + lock,
          radius * grow * (i % 3 === 0 ? 1 : 0.72), radius * 0.045, 0.9 * fade,
          { pivot: i === 0 });
      }
      g.fillStyle(this.tint(tones.hot), 0.75 * fade);
      g.fillCircle(x, y, radius * 0.2 * grow);
      g.fillStyle(this.tint(tones.spark), 0.9 * fade);
      g.fillCircle(x, y, radius * 0.09 * grow);
    });
    this.ring(x, y, radius * 0.2, radius * 1.5, tones.hot, 700, 5, depth - 1);
  }

  /** Ignition burst for a toggle or an aura: hands falling inward and locking onto a pivot. */
  bloom(x: number, y: number, radius: number, count = 8, depth = 5, tones: TimeTones = NOON_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({ ang: (i / count) * TAU, delay: (i % 3) * 0.06 }));
    this.anim(depth, 440, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const d = radius * (1.5 - easeOut(lt) * 0.85);
        timeHandLayered(g, this.tint, tones,
          x + Math.cos(s.ang) * d, y + Math.sin(s.ang) * d, s.ang + Math.PI,
          radius * 0.5, radius * 0.1, 0.85 * fade, { pivot: false });
      }
    });
    this.ring(x, y, radius * 1.45, radius * 0.6, tones.lit, 380, 3.5, depth);
  }

  /** Inward-winding channel: the mainspring being tightened before something is let go. */
  wind(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: TimeTones = NOON_TONES,
  ): void {
    const streams = Array.from({ length: 10 }, (_, i) => ({
      ang: (i / 10) * TAU, spin: 0.7 + (i % 3) * 0.35, phase: i / 10,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.88 + Math.sin(t * 24) * 0.12;
      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        timeHandLayered(g, this.tint, tones,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI,
          r * 0.38, 2.8 * (1 - lt), 0.8 * (1 - lt * 0.5), { pivot: false });
      }
      const cr = radius * (0.1 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(tones.shell), 0.62);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(tones.body), 0.88);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.spark), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.3);
      g.lineStyle(3, this.tint(tones.lit), 0.4 + 0.45 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  // ── Caller-owned Graphics painters ──────────────────────────────────────

  /**
   * A time puddle: a sundial pressed into the ground — a face with hour ticks, a gnomon shadow
   * sweeping round it, and the dust it drags. Painted into a caller-owned Graphics because the
   * kit already keeps the pool alive and knows how much life it has left.
   */
  static drawPuddle(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    g.fillStyle(tint(tones.shell), 0.28 * alpha);
    g.fillEllipse(x, y + 2, radius * 2.1, radius * 1.35);
    g.fillStyle(tint(tones.body), 0.24 * alpha);
    g.fillEllipse(x, y, radius * 1.75, radius * 1.1);

    // Hour ticks around the rim.
    g.lineStyle(1.6, tint(tones.lit), 0.55 * alpha);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const long = i % 3 === 0;
      const inner = radius * (long ? 0.72 : 0.82);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner * 0.66);
      g.lineTo(x + Math.cos(a) * radius * 0.95, y + Math.sin(a) * radius * 0.95 * 0.66);
      g.strokePath();
    }
    g.lineStyle(1.8, tint(tones.lit), 0.5 * alpha);
    g.strokeEllipse(x, y, radius * 2, radius * 1.32);

    // The gnomon shadow sweeping the face.
    const a = t * 0.9;
    g.fillStyle(tint(tones.shell), 0.5 * alpha);
    timeHand(g, x, y, a, radius * 0.85, radius * 0.1, 0.18);
    g.fillStyle(tint(tones.hot), 0.6 * alpha);
    timeHand(g, x, y, a, radius * 0.7, radius * 0.045, 0.14);
    g.fillStyle(tint(tones.spark), 0.7 * alpha * (0.6 + 0.4 * Math.sin(t * 4)));
    g.fillCircle(x, y, radius * 0.11);
  }

  /**
   * A dial locked around a fighter: the bounty aura, the frozen field, the speed aura. A bezel
   * with ticks, a hand sweeping the remaining time, and a soft fill.
   *
   * `progress` runs 1 → 0 over the effect's life, so the sweeping hand is the countdown.
   */
  static drawDial(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x: number, y: number, radius: number, t: number, progress: number, alpha: number,
  ): void {
    const beat = 0.85 + 0.15 * Math.sin(t * 4);
    g.fillStyle(tint(tones.shell), 0.14 * alpha * beat);
    g.fillCircle(x, y, radius);
    g.lineStyle(2.4, tint(tones.lit), 0.55 * alpha * beat);
    g.strokeCircle(x, y, radius);
    g.lineStyle(1.2, tint(tones.body), 0.4 * alpha);
    g.strokeCircle(x, y, radius * 0.86);

    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const long = i % 6 === 0;
      g.lineStyle(long ? 2.4 : 1, tint(tones.lit), (long ? 0.7 : 0.4) * alpha);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * radius * (long ? 0.84 : 0.9), y + Math.sin(a) * radius * (long ? 0.84 : 0.9));
      g.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      g.strokePath();
    }

    // The remaining-time wedge, closing as the effect runs out.
    const end = -Math.PI / 2 + Phaser.Math.Clamp(progress, 0, 1) * TAU;
    g.fillStyle(tint(tones.hot), 0.16 * alpha);
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, radius * 0.82, -Math.PI / 2, end, false);
    g.closePath();
    g.fillPath();

    // And the hand pointing at it.
    timeHandLayered(g, tint, tones, x, y, end, radius * 0.7, radius * 0.05, 0.9 * alpha, { edge: false });
  }

  /**
   * The reload minigame, as a clock face rather than a bar.
   *
   * Both of Time's reloads are timing checks against a moving marker, and a bar buried the one
   * thing that matters — how far the marker still has to travel — in a few pixels of horizontal
   * space over the character's head. A dial gives the whole cycle a full 360°: the sweeping hand
   * is the marker, the coloured arcs are the windows, and the gap between them is legible from
   * across the arena. Nothing else in the kit is a bar either, so this also stops the reload
   * reading as a health bar.
   *
   * `zones` are fractions of the same 0→1 progress the hand sweeps, each carrying its own state
   * so a caught band goes green and a missed one goes red without the caller repainting anything.
   */
  static drawReloadDial(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x: number, y: number, radius: number, progress: number, t: number,
    zones: { start: number; end: number; state: 'pending' | 'hit' | 'missed' }[],
    failed: boolean,
  ): void {
    const p = Phaser.Math.Clamp(progress, 0, 1);
    const top = -Math.PI / 2;
    const beat = 0.85 + 0.15 * Math.sin(t * 6);
    const rim = failed ? TIME.heat : tones.lit;

    // A brass pocket watch: bow and crown on top, a knurled case, then the dark enamel face the
    // arcs are laid on so they never float over the arena floor.
    const caseR = radius * 1.2;
    const caseCol = failed ? 0x8a2a10 : tones === FROZEN_TONES ? TIME.steel : TIME.brass;
    g.fillStyle(tint(TIME.night), 0.5);
    g.fillCircle(x + 1, y + 2.5, caseR + 1);
    // Bow (ring) and winding crown.
    g.lineStyle(2.2, tint(caseCol), 0.95);
    g.strokeCircle(x, y - caseR - radius * 0.34, radius * 0.22);
    g.fillStyle(tint(caseCol), 1);
    g.fillRoundedRect(x - radius * 0.2, y - caseR - radius * 0.2, radius * 0.4, radius * 0.3, 1.5);
    g.fillStyle(tint(TIME.pale), 0.6);
    g.fillRect(x - radius * 0.12, y - caseR - radius * 0.17, radius * 0.08, radius * 0.24);
    // Case: dark rim, brass body, a lit upper-left bevel.
    g.fillStyle(tint(TIME.night), 1);
    g.fillCircle(x, y, caseR);
    g.fillStyle(tint(caseCol), 1);
    g.fillCircle(x, y, caseR - 1);
    g.lineStyle(1.6, tint(TIME.pale), 0.55);
    g.beginPath();
    g.arc(x, y, caseR - 1.6, Math.PI * 0.95, Math.PI * 1.6, false);
    g.strokePath();
    g.lineStyle(1.4, tint(TIME.night), 0.5);
    g.beginPath();
    g.arc(x, y, caseR - 1.6, Math.PI * 1.95, Math.PI * 2.6, false);
    g.strokePath();
    // Knurling round the case edge.
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      g.lineStyle(0.8, tint(TIME.night), 0.35);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * (caseR - 2.4), y + Math.sin(a) * (caseR - 2.4));
      g.lineTo(x + Math.cos(a) * (caseR - 0.6), y + Math.sin(a) * (caseR - 0.6));
      g.strokePath();
    }
    g.fillStyle(tint(TIME.night), 0.95);
    g.fillCircle(x, y, radius + 0.8);
    g.fillStyle(tint(failed ? 0x4a1a08 : tones.shell), 0.96);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, tint(rim), 0.75 * beat);
    g.strokeCircle(x, y, radius);
    // Small seconds sub-dial at six o'clock, always running.
    const sdY = y + radius * 0.42;
    g.lineStyle(0.8, tint(rim), 0.4);
    g.strokeCircle(x, sdY, radius * 0.2);
    g.lineStyle(0.9, tint(TIME.pale), 0.7);
    g.beginPath();
    g.moveTo(x, sdY);
    g.lineTo(x + Math.cos(t * 6) * radius * 0.17, sdY + Math.sin(t * 6) * radius * 0.17);
    g.strokePath();

    // Hour ticks around the bezel — the same twelve the rest of Time's art uses.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const long = i % 3 === 0;
      g.lineStyle(long ? 1.8 : 0.9, tint(rim), (long ? 0.65 : 0.35));
      g.beginPath();
      g.moveTo(x + Math.cos(a) * radius * (long ? 0.82 : 0.87), y + Math.sin(a) * radius * (long ? 0.82 : 0.87));
      g.lineTo(x + Math.cos(a) * radius * 0.97, y + Math.sin(a) * radius * 0.97);
      g.strokePath();
    }

    // The track the hand has already covered, laid in as a swept wedge.
    if (p > 0.001) {
      g.fillStyle(tint(failed ? TIME.heat : tones.body), 0.3);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, radius * 0.78, top, top + p * TAU, false);
      g.closePath();
      g.fillPath();
    }

    // The windows. A pending band pulses so it is obviously the thing to hit.
    for (const z of zones) {
      const a0 = top + Phaser.Math.Clamp(z.start, 0, 1) * TAU;
      const a1 = top + Phaser.Math.Clamp(z.end, 0, 1) * TAU;
      const color = z.state === 'hit' ? 0x44ff44 : z.state === 'missed' ? 0xff3333 : TIME.gold;
      const alpha = z.state === 'pending' ? 0.7 + 0.3 * beat : 0.95;
      g.fillStyle(tint(color), alpha);
      g.beginPath();
      g.arc(x, y, radius * 0.97, a0, a1, false);
      g.arc(x, y, radius * 0.72, a1, a0, true);
      g.closePath();
      g.fillPath();
      // A hard leading edge, so the exact moment the window opens is unambiguous.
      g.lineStyle(1.6, tint(TIME.white), 0.7 * alpha);
      g.beginPath();
      g.moveTo(x + Math.cos(a0) * radius * 0.72, y + Math.sin(a0) * radius * 0.72);
      g.lineTo(x + Math.cos(a0) * radius * 0.97, y + Math.sin(a0) * radius * 0.97);
      g.strokePath();
    }

    // The hand: the marker you are timing against.
    const hand = top + p * TAU;
    g.fillStyle(tint(failed ? TIME.heat : TIME.white), 0.95);
    timeHand(g, x, y, hand, radius * 0.9, radius * 0.055, 0.22);
    g.fillStyle(tint(rim), 1);
    g.fillCircle(x, y, radius * 0.13);
    g.fillStyle(tint(TIME.white), 0.9);
    g.fillCircle(x + Math.cos(hand) * radius * 0.9, y + Math.sin(hand) * radius * 0.9, radius * 0.09);
    // Crystal glint across the glass.
    g.fillStyle(tint(TIME.white), 0.16);
    g.fillEllipse(x - radius * 0.35, y - radius * 0.45, radius * 0.9, radius * 0.38);
  }

  /**
   * A "WANTED" handbill pinned over a marked fighter, sized to the label text laid on it: torn
   * parchment, a nail at the top, a red ink rule under the header, and a gentle sway.
   */
  static drawBountyTag(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, x: number, y: number,
    w: number, h: number, t: number, alpha = 1,
  ): void {
    const sway = Math.sin(t * 2.4) * 0.8;
    const l = x - w / 2 + sway, r = x + w / 2 + sway, top = y - h / 2, bot = y + h / 2;
    g.fillStyle(tint(TIME.night), 0.45 * alpha);
    g.fillRect(l + 1.5, top + 2, w, h);
    // Paper with ragged bottom edge.
    g.fillStyle(tint(0xe8d3a0), 0.97 * alpha);
    g.beginPath();
    g.moveTo(l, top);
    g.lineTo(r, top);
    g.lineTo(r, bot - 1);
    const teeth = Math.max(4, Math.round(w / 5));
    for (let i = teeth; i >= 0; i--) {
      g.lineTo(l + (i / teeth) * w, bot + (i % 2 === 0 ? 1.5 : -1));
    }
    g.closePath();
    g.fillPath();
    // Aged edges and a corner stain.
    g.lineStyle(1, tint(0x8a6a3a), 0.7 * alpha);
    g.strokeRect(l + 1.5, top + 1.5, w - 3, h - 3);
    g.fillStyle(tint(0xb08850), 0.25 * alpha);
    g.fillCircle(r - 4, top + 4, 3.5);
    // Red rule under the header line.
    g.fillStyle(tint(0x8a1a10), 0.75 * alpha);
    g.fillRect(l + 4, y - 0.5, w - 8, 1);
    // Nail.
    g.fillStyle(tint(TIME.gun), alpha);
    g.fillCircle(x + sway, top + 1, 2);
    g.fillStyle(tint(TIME.steel), alpha);
    g.fillCircle(x + sway - 0.5, top + 0.5, 0.8);
  }

  /**
   * The revolver cylinder swinging out while it reloads: six chambers, the loaded ones brass,
   * the spent ones dark, turning as rounds go in.
   */
  static drawCylinder(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x: number, y: number, radius: number, angle: number, loaded: number,
  ): void {
    g.fillStyle(tint(TIME.night), 0.35);
    g.fillCircle(x, y + 3, radius * 1.05);
    g.fillStyle(tint(TIME.gun), 1);
    g.fillCircle(x, y, radius);
    g.lineStyle(1.4, tint(TIME.steel), 0.9);
    g.strokeCircle(x, y, radius);
    for (let i = 0; i < 6; i++) {
      const a = angle + (i / 6) * TAU;
      const cx = x + Math.cos(a) * radius * 0.58;
      const cy = y + Math.sin(a) * radius * 0.58;
      g.fillStyle(tint(TIME.night), 1);
      g.fillCircle(cx, cy, radius * 0.26);
      if (i < loaded) {
        g.fillStyle(tint(tones.body), 1);
        g.fillCircle(cx, cy, radius * 0.19);
        g.fillStyle(tint(tones.spark), 0.8);
        g.fillCircle(cx - radius * 0.05, cy - radius * 0.06, radius * 0.07);
      }
    }
    g.fillStyle(tint(TIME.steel), 1);
    g.fillCircle(x, y, radius * 0.16);
  }

  /**
   * The Time Bomb: a strapped-on pocket watch with a winding crown, two hands and a blinking
   * bead. `heat` runs 0 → 1 over its whole 30 second ripening, and everything reads off it —
   * the casing reddens, the halo swells, the bead blinks faster, wisps start coming off the
   * top. You should be able to tell across the arena how badly the thing on you is going to
   * hurt without reading a number.
   *
   * The slow hand points at `heat` (how ripe) and the fast one just runs, because a clock that
   * has stopped moving is a clock that has already gone off.
   */
  static drawBomb(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn, tones: TimeTones,
    x: number, y: number, radius: number, t: number, heat: number, alpha: number,
  ): void {
    const h = Phaser.Math.Clamp(heat, 0, 1);
    // The tick you can hear coming: 1Hz fresh, 4Hz ripe.
    const beat = 0.5 + 0.5 * Math.sin(t * TAU * (1 + h * 3));
    const r = radius * (1 + 0.07 * beat * (0.3 + h));
    const casing = mixTone(tones.body, TIME.heat, h);

    if (h > 0.02) {
      g.fillStyle(tint(TIME.heat), 0.16 * h * alpha * (0.6 + 0.4 * beat));
      g.fillCircle(x, y, r * (1.9 + 0.5 * beat));
    }
    // Contact shadow, so it sits against the body it is strapped to.
    g.fillStyle(tint(TIME.night), 0.4 * alpha);
    g.fillEllipse(x, y + r * 0.5, r * 2, r * 1.15);

    g.fillStyle(tint(casing), alpha);
    g.fillCircle(x, y, r);
    g.lineStyle(1.6, tint(tones.shell), 0.9 * alpha);
    g.strokeCircle(x, y, r);
    g.fillStyle(tint(tones.spark), 0.26 * alpha);
    g.fillCircle(x - r * 0.34, y - r * 0.36, r * 0.3);

    // Two leather straps lashing it on — the tell that it is stuck, not held.
    g.lineStyle(2.2, tint(tones.shell), 0.75 * alpha);
    for (const o of [-0.44, 0.44]) {
      g.beginPath();
      g.moveTo(x - r * 1.08, y + r * o);
      g.lineTo(x + r * 1.08, y + r * o);
      g.strokePath();
    }

    // Winding crown and its ring.
    g.fillStyle(tint(TIME.steel), alpha);
    g.fillRect(x - r * 0.17, y - r * 1.36, r * 0.34, r * 0.4);
    g.lineStyle(1.6, tint(TIME.steel), alpha);
    g.strokeCircle(x, y - r * 1.52, r * 0.2);

    // The face.
    g.fillStyle(tint(TIME.pale), 0.9 * alpha);
    g.fillCircle(x, y, r * 0.62);
    g.lineStyle(1, tint(tones.shell), 0.7 * alpha);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const inner = r * (i % 3 === 0 ? 0.4 : 0.5);
      g.beginPath();
      g.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
      g.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
      g.strokePath();
    }
    g.fillStyle(tint(mixTone(tones.shell, TIME.heat, h)), 0.95 * alpha);
    timeHand(g, x, y, -Math.PI / 2 + h * TAU, r * 0.44, r * 0.09, 0.2);
    g.fillStyle(tint(TIME.heat), 0.95 * alpha);
    timeHand(g, x, y, t * 2.2, r * 0.56, r * 0.055, 0.16);
    g.fillStyle(tint(TIME.night), alpha);
    g.fillCircle(x, y, r * 0.09);

    // The bead.
    g.fillStyle(tint(beat > 0.7 ? TIME.white : TIME.heat), (0.35 + 0.65 * h) * alpha * (0.4 + 0.6 * beat));
    g.fillCircle(x + r * 0.64, y - r * 0.64, r * 0.22);

    // Heat coming off a ripe one.
    if (h > 0.35) {
      g.lineStyle(1.4, tint(TIME.powder), 0.5 * ((h - 0.35) / 0.65) * alpha);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.5;
        const wob = Math.sin(t * 5 + i) * 0.25;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05);
        g.lineTo(x + Math.cos(a + wob) * r * 1.75, y + Math.sin(a + wob) * r * 1.75);
        g.strokePath();
      }
    }
  }

  /**
   * The Time Bomb's arming ring: a white bezel closing in on the bomb. Unfilled on purpose —
   * you are meant to watch the gap between the rim and the casing, because that gap is the
   * whole skill check. Inward-pointing ticks make the closing readable at speed, and the rim
   * goes pale gold for the fraction of a second where a re-cast lands on the beat.
   */
  static drawTimingRing(
    g: Phaser.GameObjects.Graphics, tint: TimeColorFn,
    x: number, y: number, ringR: number, t: number, onBeat: boolean,
  ): void {
    const rim = onBeat ? TIME.pale : TIME.white;
    const w = onBeat ? 3.6 : 2.4;
    g.lineStyle(w, tint(rim), onBeat ? 1 : 0.85);
    g.strokeCircle(x, y, ringR);
    g.lineStyle(1, tint(rim), 0.35);
    g.strokeCircle(x, y, ringR * 0.9);

    const spin = t * 0.7;
    for (let i = 0; i < 24; i++) {
      const a = spin + (i / 24) * TAU;
      const long = i % 6 === 0;
      g.lineStyle(long ? w * 0.8 : w * 0.4, tint(rim), (long ? 0.9 : 0.5) * (onBeat ? 1 : 0.8));
      g.beginPath();
      g.moveTo(x + Math.cos(a) * ringR, y + Math.sin(a) * ringR);
      g.lineTo(x + Math.cos(a) * ringR * (long ? 0.8 : 0.87), y + Math.sin(a) * ringR * (long ? 0.8 : 0.87));
      g.strokePath();
    }

    if (onBeat) {
      for (let i = 0; i < 4; i++) {
        const a = spin + (i / 4) * TAU;
        g.fillStyle(tint(TIME.white), 0.9);
        g.fillCircle(x + Math.cos(a) * ringR, y + Math.sin(a) * ringR, w * 0.9);
      }
    }
  }
}

/** Channel-wise blend between two palette colours — `t` 0 keeps `a`, 1 lands on `b`. */
function mixTone(a: number, b: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const mix = (shift: number): number => {
    const ca = (a >> shift) & 0xff, cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * k) & 0xff;
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

// ── TimeDial ──────────────────────────────────────────────────────────────

/**
 * A persistent dial locked around a fighter — Remain, Frozen Field, a Bounty aura, the Bounty
 * Hunter speed aura. Driven by whoever owns it: call `update` every frame with the position and
 * how much of the effect is left.
 */
export class TimeDial {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private tickAccum = 0;

  constructor(
    private scene: Phaser.Scene,
    private tint: TimeColorFn,
    private tones: TimeTones,
    private radius: number,
    depth = 3,
    /** Sheds a hand every so often. Off for big, quiet field auras. */
    private sheds = true,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setTones(tones: TimeTones): void { this.tones = tones; }
  setRadius(r: number): void { this.radius = r; }

  update(delta: number, x: number, y: number, progress: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    TimeFx.drawDial(g, this.tint, this.tones, x, y, this.radius, this.t, progress, alpha);

    if (this.sheds) {
      this.tickAccum += delta;
      if (this.tickAccum >= 620) {
        this.tickAccum = 0;
        const a = Math.random() * TAU;
        new TimeFx(this.scene, this.tint).hands(
          x + Math.cos(a) * this.radius * 0.7, y + Math.sin(a) * this.radius * 0.7,
          1, { speed: 16, size: 2, life: 620, fall: 12, depth: 4, tones: this.tones },
        );
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── TimeAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one brass fist, outermost first. */
const TIME_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: TIME.brass, alpha: 0.28 },
    { r: 6.6, color: TIME.gold, alpha: 0.95 },
    { r: 3.5, color: TIME.noon, alpha: 1 },
    { r: 1.4, color: TIME.white, alpha: 1, ox: -2.2, oy: -2.2 },
  ],
  eyeWhite: TIME.pale,
  eyePupil: TIME.night,
  // A gun hand snaps: fast, hard, almost no smear.
  squash: { div: 17, x: 0.34, y: 0.14 },
};

/**
 * The time character rig: a plain orb of polished brass (the baked `elem-sand` texture), two
 * brass fists, a pair of eyes, and the gunslinger's wide-brim hat over the crown. The hat is the
 * only costume — the body alone says "time".
 *
 * The orb carries an engraved chapter ring and a pocket-watch chain; each fist has a ticking
 * clock hand on the knuckle. Mastery adds regalia on top: a taller gilded hat with a sheriff's
 * star, a Roman bezel turning behind the crown, a gold clock ring underfoot, an opened watch
 * fob, white eyes and wide rimmed coronas on the fists.
 */
export class TimeAvatar extends BaseAvatar {
  private fx: TimeFx;
  private tones: TimeTones;
  /** Reputation Repair: true while the rewind is charged, false while it is spent. Null when unmastered. */
  private repairReady: boolean | null = null;
  /** Time is stopped — the whole rig goes cold and the hands stall. */
  private frozen = false;

  constructor(scene: Phaser.Scene, tint: TimeColorFn, tones: TimeTones = NOON_TONES, depth = 6) {
    super(scene, tint, depth, TIME_AVATAR);
    this.fx = new TimeFx(scene, tint);
    this.tones = tones;
    if (tones !== NOON_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.lit), 0.95));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.hot), 1));
    }
  }

  /** Mastery passive: whether the rewind is charged and waiting. Null when unmastered. */
  setRepairReady(ready: boolean | null): void { this.repairReady = ready; }

  /** Always Noon is up — the rig freezes over. */
  setFrozen(on: boolean): void {
    if (on === this.frozen) return;
    this.frozen = on;
    const t = on ? FROZEN_TONES : this.tones;
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(t.lit), 0.95));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(t.hot), 1));
  }

  private activeTones(): TimeTones { return this.frozen ? FROZEN_TONES : this.tones; }

  /**
   * Mastery tell — white eyes and a wide corona with a hard rim on each fist; `drawExtras`
   * enlarges and gilds the hat, pins a sheriff's star to its band and hangs a spinning Roman
   * bezel behind the crown; `drawGlow` lays a slow gold clock ring on the ground. Shape changes,
   * not just a tint — a tint alone vanishes at play zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? TIME.white : TIME.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14.5 : 10);
      halo.setFillStyle(this.tint(on ? this.tones.lit : TIME.brass), on ? 0.36 : 0.28);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.5, this.tint(TIME.pale), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving fists shed brass. */
  protected emitTrail(x: number, y: number): void {
    this.fx.hands(x, y, 1, { speed: 12, size: 1.8, life: 560, fall: 14, depth: 5, tones: this.activeTones() });
  }

  /**
   * A soft brass light pooled under the character. The Reputation Repair charge reads in its
   * pulse: a charged rewind breathes quickly, a spent one barely stirs; frozen time holds still.
   */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const tones = this.activeTones();
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    const rate = this.frozen ? 0 : this.repairReady === true ? 4 : this.repairReady === false ? 0.6 : 1.6;
    const pulse = 1 + 0.08 * Math.sin(this.t * rate);
    g.fillStyle(this.tint(tones.body), a * (this.mastered ? 0.3 : 0.22) * k);
    g.fillCircle(x, y, 28 * k * pulse);
    g.fillStyle(this.tint(tones.shell), a * 0.2 * k);
    g.fillEllipse(x, y + 8, 36 * k, 14 * k);

    if (this.mastered) {
      // A gilded clock face laid flat under the boots, its twelve studs creeping round.
      const cy = y + 12;
      const spin = this.frozen ? 0 : this.t * 0.4;
      g.lineStyle(2, this.tint(tones.lit), a * 0.7);
      g.strokeEllipse(x, cy, 64, 22);
      g.lineStyle(1, this.tint(tones.hot), a * 0.45);
      g.strokeEllipse(x, cy, 54, 18);
      for (let i = 0; i < 12; i++) {
        const ang = spin + (i / 12) * TAU;
        const big = i % 3 === 0;
        g.fillStyle(this.tint(big ? tones.hot : tones.lit), a * (big ? 0.95 : 0.6));
        g.fillCircle(x + Math.cos(ang) * 32, cy + Math.sin(ang) * 11, big ? 1.9 : 1.1);
      }
    }
  }

  /**
   * Engraving on the brass orb: a fine chapter ring round the rim with twelve hour studs, and a
   * pocket-watch chain swagged across the belly to a fob at the hip. Mastered, the chain turns
   * gold and the fob opens into a lit little watch face. Kept to the rim and the lower half so
   * the eyes stay clear.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const tones = this.activeTones();
    const m = this.mastered;
    g.lineStyle(1, this.tint(tones.shell), 0.45 * alpha);
    g.strokeCircle(x, y, 17.5);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * TAU - Math.PI / 2;
      const big = i % 3 === 0;
      const r0 = big ? 14.6 : 15.8;
      g.lineStyle(big ? 1.6 : 0.9, this.tint(big ? tones.shell : tones.body), (big ? 0.7 : 0.5) * alpha);
      g.beginPath();
      g.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
      g.lineTo(x + Math.cos(ang) * 17.3, y + Math.sin(ang) * 17.3);
      g.strokePath();
    }
    // Watch chain: a sagging run of links from the left flank to a fob low on the right.
    const sway = Math.sin(this.t * 2.2) * 1.2;
    const chain = m ? tones.hot : TIME.steel;
    for (let i = 0; i <= 7; i++) {
      const u = i / 7;
      const cx = x - 12 + u * 22;
      const cy = y + 5 + Math.sin(u * Math.PI) * 6 + sway * u;
      g.fillStyle(this.tint(TIME.night), 0.5 * alpha);
      g.fillCircle(cx, cy + 0.7, 1.35);
      g.fillStyle(this.tint(chain), 0.95 * alpha);
      g.fillCircle(cx, cy, 1.15);
    }
    const fx = x + 10, fy = y + 9 + sway;
    g.fillStyle(this.tint(tones.shell), 0.95 * alpha);
    g.fillCircle(fx, fy, m ? 4.4 : 3.4);
    g.fillStyle(this.tint(m ? tones.lit : tones.body), alpha);
    g.fillCircle(fx, fy, m ? 3.5 : 2.5);
    if (m) {
      g.fillStyle(this.tint(TIME.pale), alpha);
      g.fillCircle(fx, fy, 2.5);
      g.lineStyle(0.9, this.tint(TIME.night), 0.9 * alpha);
      const hand = this.frozen ? -1 : this.t * 3;
      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(fx + Math.cos(hand) * 2.2, fy + Math.sin(hand) * 2.2);
      g.strokePath();
    }
  }

  /**
   * The hat: a wide brim with a crowned crease and a band. Rooted at the crown so it never
   * covers the face, and drawn over the sprite so its lit edge shows. Mastered, it stands taller
   * and its band and crown edge are gilded.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const tones = this.activeTones();
    const m = this.mastered;
    const rootY = y - 18;
    const scale = (m ? 1.15 : 1) * (0.94 + this.intensity * 0.06);
    // A hat rides the head: it tips toward the aim, and a spent rewind pulls it down over the eyes.
    const tilt = Math.cos(this.facing) * 0.14 + (this.repairReady === false ? 0.1 : 0);
    const brimW = 26 * scale;
    const brimY = rootY + 3;

    // Brim — an ellipse with the far edge turned up, so it reads as felt rather than a disc.
    g.fillStyle(this.tint(TIME.night), 0.35 * alpha);
    g.fillEllipse(x + tilt * 8, brimY + 2, brimW * 2.05, 11 * scale);
    g.fillStyle(this.tint(tones.shell), 0.98 * alpha);
    g.fillEllipse(x + tilt * 8, brimY, brimW * 2, 10.5 * scale);
    g.fillStyle(this.tint(TIME.night), 0.4 * alpha);
    g.fillEllipse(x + tilt * 8, brimY - 1.6 * scale, brimW * 1.7, 6.5 * scale);
    if (m) {
      g.lineStyle(1.4, this.tint(tones.lit), 0.85 * alpha);
      g.strokeEllipse(x + tilt * 8, brimY, brimW * 2, 10.5 * scale);
    }

    // Crown, creased down the middle.
    const crownH = (13 + (m ? 3 : 0)) * scale;
    const cx = x + tilt * 6;
    g.fillStyle(this.tint(tones.shell), 0.98 * alpha);
    g.fillRoundedRect(cx - 11 * scale, brimY - crownH, 22 * scale, crownH, 5 * scale);
    g.fillStyle(this.tint(TIME.night), 0.55 * alpha);
    g.fillRect(cx - 1.4 * scale, brimY - crownH + 2, 2.8 * scale, crownH - 4);
    // Hat band — gilded once mastered — and the light along the crown's top edge.
    g.fillStyle(this.tint(m ? tones.lit : tones.body), 0.95 * alpha);
    g.fillRect(cx - 11 * scale, brimY - 5 * scale, 22 * scale, (m ? 4 : 3.4) * scale);
    g.lineStyle(m ? 2 : 1.4, this.tint(m ? tones.hot : tones.lit), (m ? 0.9 : 0.6) * a);
    g.beginPath();
    g.moveTo(cx - 9 * scale, brimY - crownH + 2);
    g.lineTo(cx + 9 * scale, brimY - crownH + 2);
    g.strokePath();
    // Band buckle — a small brass square on every hat.
    g.fillStyle(this.tint(m ? tones.hot : tones.lit), 0.95 * alpha);
    g.fillRect(cx + 5 * scale, brimY - 5.2 * scale, 3.6 * scale, 3.8 * scale);
    g.fillStyle(this.tint(tones.shell), 0.9 * alpha);
    g.fillRect(cx + 6 * scale, brimY - 4.2 * scale, 1.6 * scale, 1.8 * scale);

    // Knuckle detail on each fist: a tiny clock hand ticking round the brass.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      const ang = this.frozen ? -Math.PI / 2 : this.t * (i === 0 ? 2 : -2) + i;
      g.fillStyle(this.tint(tones.shell), 0.85 * alpha);
      timeHand(g, hx, hy, ang, 4.6, 0.75, 0.25);
      g.fillStyle(this.tint(TIME.night), 0.9 * alpha);
      g.fillCircle(hx, hy, 0.9);
    }

    if (!m) return;

    // Sheriff's star pinned on the band.
    const sx = cx - 4 * scale, sy = brimY - 3.2 * scale;
    const sr = 4.4 * scale;
    g.fillStyle(this.tint(TIME.night), 0.6 * alpha);
    this.star(g, sx + 0.6, sy + 0.8, sr, 5);
    g.fillStyle(this.tint(tones.hot), alpha);
    this.star(g, sx, sy, sr, 5);
    g.fillStyle(this.tint(TIME.white), 0.9 * alpha);
    g.fillCircle(sx - 0.6, sy - 0.8, 1.1 * scale);

    // A Roman bezel turning behind the crown — a halo made of a clock.
    const bx = cx, by = brimY - crownH - 5 * scale;
    const br = 9 * scale;
    const spin = this.frozen ? 0 : this.t * 0.9;
    g.lineStyle(2, this.tint(tones.lit), 0.85 * a);
    g.beginPath();
    g.arc(bx, by, br, Math.PI * 0.95, Math.PI * 2.05, false);
    g.strokePath();
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + (i / 6) * Math.PI;
      const pulse = 0.6 + 0.4 * Math.sin(spin * 3 - i * 0.9);
      g.fillStyle(this.tint(i === 3 ? TIME.white : tones.hot), pulse * alpha);
      g.fillCircle(bx + Math.cos(ang) * br, by + Math.sin(ang) * br, i === 3 ? 2 : 1.3);
    }
    g.fillStyle(this.tint(tones.hot), 0.95 * alpha);
    timeHand(g, bx, by + br * 0.35, -Math.PI / 2 + Math.sin(spin) * 0.6, br * 0.8, 1.1, 0.15);
  }

  private star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, n: number): void {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const ang = -Math.PI / 2 + (i / (n * 2)) * TAU;
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
  }
}
