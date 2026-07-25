import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Plasma renders: the caged-lightning rig (containment-orb
 * hands, eyes, a forked corona), the chaos auras, and every one-shot effect its abilities throw
 * off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes plasma
 * plasma: the forked arc that re-rolls its own kinks every frame, and the boiling bead of
 * contained lightning that every orb in the element is made of.
 *
 * Every structural colour must come from the PLASMA palette below. Plasma has no colour-slot
 * cosmetic yet, but every call still routes through the owner's `plasmaColor` mapper, so the day
 * one lands it is a table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.plasmaColor bound to one owner. */
export type PlasmaColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const PLASMA = {
  /** The dark it all arcs against. */
  void: 0x1a0033,
  deep: 0x33006b,
  /** The element's own violet, from containment shell to open air. */
  violet: 0x6600cc,
  purple: 0xaa22ff,
  orchid: 0xcc44ff,
  magenta: 0xdd66ff,
  pink: 0xff44ff,
  blush: 0xff88ff,
  mist: 0xffaaff,
  /** Mastery — the storm wall and the orbital that rides it. */
  hot: 0xff2f8f,
  rose: 0xff88cc,
  /** Anything that has turned on its own caster. */
  red: 0xff2244,
  blood: 0xff4466,
  white: 0xffffff,
} as const;

export interface Pt { x: number; y: number }

// ── Path helpers ──────────────────────────────────────────────────────────

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Deterministic hash in [-1, 1] — lets a bolt re-roll every frame without Math.random. */
function wob(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Plasma's primitive: an arc — a jagged polyline between two points whose kinks are re-rolled
 * from `seed` every frame, so a live bolt never sits still. The ends are pinned; everything
 * between them dances.
 *
 * Every bolt, every chain, every crawling surface arc and every wall of the Chaos Storm is one
 * of these. Nothing in this element may be a smooth line — a straight beam reads as light, a
 * bolt that twitches reads as electricity.
 */
export function arcPath(
  x1: number, y1: number, x2: number, y2: number,
  chaos: number, seed: number, segments = 6,
): Pt[] {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pts: Pt[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Envelope: pinned at both ends, loosest in the middle.
    const swing = chaos * Math.sin(Math.PI * t);
    const off = wob(seed + i * 7.31) * swing;
    const along = wob(seed + i * 3.17) * swing * 0.25;
    pts.push({
      x: x1 + dx * t + nx * off + (dx / len) * along,
      y: y1 + dy * t + ny * off + (dy / len) * along,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

/** The primitive in three passes: a wide violet haze, the coloured body, and a hot white core. */
export function arcBolt(
  g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
  x1: number, y1: number, x2: number, y2: number,
  chaos: number, seed: number, width: number, color: number, alpha: number, segments = 6,
): void {
  const pts = arcPath(x1, y1, x2, y2, chaos, seed, segments);
  g.lineStyle(width * 3.2, tint(PLASMA.violet), alpha * 0.16);
  strokePts(g, pts);
  g.lineStyle(width, tint(color), alpha * 0.92);
  strokePts(g, pts);
  g.lineStyle(Math.max(0.8, width * 0.34), tint(PLASMA.white), alpha);
  strokePts(g, pts);
}

/**
 * A fork: a bolt with short branches spitting off its kinks. Used wherever a strike is meant to
 * feel violent rather than tidy — impacts, the storm wall, an orbital's sweep.
 */
export function arcFork(
  g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
  x1: number, y1: number, x2: number, y2: number,
  chaos: number, seed: number, width: number, color: number, alpha: number,
): void {
  const pts = arcPath(x1, y1, x2, y2, chaos, seed, 7);
  arcBolt(g, tint, x1, y1, x2, y2, chaos, seed, width, color, alpha, 7);
  for (let i = 1; i < pts.length - 1; i++) {
    if (wob(seed + i * 19.7) < 0.25) continue;
    const p = pts[i];
    const a = Math.atan2(y2 - y1, x2 - x1) + wob(seed + i * 5.5) * 1.5;
    const l = chaos * (0.9 + wob(seed + i * 2.3) * 0.5);
    g.lineStyle(width * 0.6, tint(color), alpha * 0.7);
    strokePts(g, arcPath(p.x, p.y, p.x + Math.cos(a) * l, p.y + Math.sin(a) * l, chaos * 0.4, seed + i, 3));
  }
}

/**
 * A bead of contained plasma: a violet corona with irregular lobes, a magenta body, a white core
 * and arcs crawling over its surface. Every orb, seeker, blade and volt point is one of these,
 * so they all read as the same substance at different sizes.
 */
export function plasmaBead(
  g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
  cx: number, cy: number, radius: number, t: number,
  color: number, alpha: number, arcs = 4,
): void {
  // Corona: a lobed halo rather than a circle, so it boils.
  const lobes = 11;
  const pts: Pt[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU;
    const r = radius * (1.5 + 0.42 * Math.sin(t * 6 + i * 2.1));
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.fillStyle(tint(color), alpha * 0.18);
  fillPts(g, pts);

  g.fillStyle(tint(color), alpha * 0.85);
  g.fillCircle(cx, cy, radius);
  g.fillStyle(tint(PLASMA.blush), alpha * 0.8);
  g.fillCircle(cx, cy, radius * 0.6);
  g.fillStyle(tint(PLASMA.white), alpha);
  g.fillCircle(cx, cy, radius * 0.28);

  for (let i = 0; i < arcs; i++) {
    const a = t * 3.1 + (i / arcs) * TAU;
    const r = radius * (1.1 + 0.6 * Math.abs(Math.sin(t * 4 + i * 1.7)));
    g.lineStyle(1.4, tint(i % 2 === 0 ? PLASMA.white : PLASMA.mist), alpha * 0.75);
    strokePts(g, arcPath(
      cx + Math.cos(a) * radius * 0.3, cy + Math.sin(a) * radius * 0.3,
      cx + Math.cos(a + 0.5) * r, cy + Math.sin(a + 0.5) * r,
      radius * 0.35, t * 40 + i * 11, 3,
    ));
  }
}

/** A jagged closed ring — the shape every plasma shockwave takes instead of a smooth circle. */
export function arcRing(
  g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
  cx: number, cy: number, radius: number, chaos: number, seed: number,
  width: number, color: number, alpha: number,
): void {
  const segs = Math.max(14, Math.round(radius / 6));
  const pts: Pt[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * TAU;
    const r = radius * (1 + (wob(seed + i * 4.7) * chaos) / Math.max(radius, 1));
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.lineStyle(width * 3, tint(PLASMA.violet), alpha * 0.16);
  strokePts(g, pts, true);
  g.lineStyle(width, tint(color), alpha * 0.9);
  strokePts(g, pts, true);
  g.lineStyle(Math.max(0.8, width * 0.34), tint(PLASMA.white), alpha * 0.85);
  strokePts(g, pts, true);
}

// ── PlasmaFx ──────────────────────────────────────────────────────────────

export interface PlasmaBoomOpts {
  /** Bolts blown outward. Defaults to radius/9. */
  bolts?: number;
  /** Beads of plasma thrown clear. Defaults to bolts. */
  motes?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave scorched, crackling ground behind. Default true. */
  mark?: boolean;
}

/**
 * One-shot plasma effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class PlasmaFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: PlasmaColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the PLASMA default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 8, color: number = PLASMA.magenta): void {
    this.flashIn(x, y, radius, PLASMA.white, color, depth);
  }

  /**
   * A bolt between two points, re-rolling its kinks every frame it lives. This is the element's
   * workhorse: every chain, relay, strike and snap-back is one.
   */
  bolt(
    x1: number, y1: number, x2: number, y2: number,
    color: number = PLASMA.magenta, depth = 8, duration = 220, width = 3, chaos = 0,
  ): void {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const swing = chaos || Phaser.Math.Clamp(dist * 0.14, 8, 34);
    const base = Math.random() * 1000;
    this.anim(depth, duration, (g, t) => {
      const fade = 1 - easeIn(t);
      // A fresh seed each frame is exactly the point — the bolt must never hold still.
      arcFork(g, this.tint, x1, y1, x2, y2, swing, base + t * 97, width * (1 - t * 0.4), color, fade);
    });
  }

  /** A jagged shockwave expanding outward. */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 340, depth = 7, width = 3,
  ): void {
    const seed = Math.random() * 1000;
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      arcRing(g, this.tint, x, y, r, r * 0.09, seed + t * 40, width, color, (1 - t) * 0.9);
    });
  }

  /** Beads of plasma flung clear of something, fizzing out as they go. */
  motes(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number } = {},
  ): void {
    const speed = o.speed ?? 220;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 5;
    const life = o.life ?? 480;
    const depth = o.depth ?? 9;
    const color = o.color ?? PLASMA.orchid;

    const parts = Array.from({ length: count }, (_, i) => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 1),
        s: size * (0.5 + Math.random() * 0.9),
        seed: i * 3.7 + Math.random(),
        delay: Math.random() * 0.18,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        plasmaBead(g, this.tint, x + p.cos * d, y + p.sin * d, p.s * (1 - lt * 0.6),
          t * 4 + p.seed, color, 0.95 * (1 - lt * lt), 2);
      }
    });
  }

  /** Bolts spitting outward from a point in a rosette — a discharge with no travel. */
  discharge(
    x: number, y: number, radius: number, count: number, color: number,
    duration = 300, depth = 8,
  ): void {
    const base = Math.random() * 1000;
    const spokes = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.3,
      r: radius * (0.7 + Math.random() * 0.5),
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, duration, (g, t) => {
      for (const s of spokes) {
        const lt = Phaser.Math.Clamp((t - s.delay) / (1 - s.delay), 0, 1);
        if (lt <= 0) continue;
        const r = s.r * easeOut(lt);
        arcFork(g, this.tint, x, y, x + Math.cos(s.a) * r, y + Math.sin(s.a) * r,
          r * 0.18, base + t * 83 + s.a * 10, 2.6, color, 0.9 * (1 - lt * lt));
      }
    });
  }

  /**
   * A full detonation: white core, a rosette of forked bolts, staggered jagged shockwaves, beads
   * thrown clear and scorched, crackling ground left behind.
   */
  boom(x: number, y: number, radius: number, o: PlasmaBoomOpts = {}): void {
    const color = o.color ?? PLASMA.orchid;
    const bolts = o.bolts ?? Math.max(6, Math.round(radius / 9));
    const bits = o.motes ?? bolts;
    const dur = o.duration ?? Math.round(320 + radius * 1.1);
    const depth = o.depth ?? 8;

    if (o.mark !== false) this.scorch(x, y, radius * 0.7, depth - 6);
    this.flash(x, y, radius * 0.42, depth + 2, color);
    this.discharge(x, y, radius, bolts, color, Math.round(dur * 0.85), depth);
    this.ring(x, y, radius * 0.25, radius, color, Math.round(dur * 0.9), depth, 4);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.5, radius * 1.28, PLASMA.white, dur, depth, 2));
    this.motes(x, y, bits, {
      speed: radius * 2.1, size: 4 + radius / 16, life: Math.round(dur * 1.2), depth: depth + 1, color,
    });
  }

  /** Ground left scorched and crackling after something went off on it. */
  scorch(x: number, y: number, radius: number, depth = 2, color: number = PLASMA.deep): void {
    const seed = Math.random() * 1000;
    this.anim(depth, 1500, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(color), 0.34 * a);
      g.fillEllipse(x, y, radius * 2, radius * 1.1);
      // Static crawling over the burn.
      for (let i = 0; i < 5; i++) {
        const ang = seed + i * 1.7 + t * 3;
        const d = radius * (0.3 + ((i * 0.37) % 1) * 0.6);
        const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.7;
        g.lineStyle(1.2, this.tint(PLASMA.orchid), 0.6 * a);
        strokePts(g, arcPath(px, py, px + Math.cos(ang) * 9, py + Math.sin(ang) * 6, 4, seed + i + t * 60, 3));
      }
    });
  }

  /** The wind-up before something big: bolts converging inward onto a closing ring. */
  charge(
    x: number, y: number, radius: number, duration: number, color: number, depth = 7,
  ): void {
    const seed = Math.random() * 1000;
    this.anim(depth, duration, (g, t) => {
      const r = radius * (1 - easeOut(t) * 0.78);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + t * 5;
        arcBolt(g, this.tint, x + Math.cos(a) * radius, y + Math.sin(a) * radius,
          x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3,
          radius * 0.12, seed + i * 13 + t * 70, 2.2, color, 0.75 * t, 4);
      }
      arcRing(g, this.tint, x, y, r, r * 0.12, seed + t * 50, 2.4, PLASMA.white, 0.4 + 0.5 * t);
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state:
  // an orb's remaining fuse, a zone's dwell timer, how far an orbital has closed in.

  /** A seeker orb and its comet tail of spent plasma. */
  static drawSeeker(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    x: number, y: number, trail: Pt[], hostile: boolean, t: number,
  ): void {
    const color = hostile ? PLASMA.blood : PLASMA.magenta;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      const fade = i / trail.length;
      g.lineStyle(1 + fade * 3.4, tint(color), 0.1 + fade * 0.42);
      strokePts(g, arcPath(a.x, a.y, b.x, b.y, 3 * fade, t * 30 + i * 7, 3));
    }
    plasmaBead(g, tint, x, y, 6, t, color, 1, 3);
  }

  /** A chaos blade: a bead drawn out into a spinning sliver of plasma. */
  static drawBlade(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    x: number, y: number, angle: number, t: number, color: number = PLASMA.pink,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const at = (lx: number, ly: number): Pt => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos });
    g.fillStyle(tint(color), 0.18);
    fillPts(g, [at(-20, 0), at(0, -8), at(20, 0), at(0, 8)]);
    g.fillStyle(tint(color), 0.9);
    fillPts(g, [at(-15, 0), at(0, -4.4), at(15, 0), at(0, 4.4)]);
    g.fillStyle(tint(PLASMA.white), 1);
    fillPts(g, [at(-9, 0), at(0, -2), at(9, 0), at(0, 2)]);
    // Arcs whipping off both tips.
    for (const dir of [-1, 1]) {
      const tip = at(dir * 15, 0);
      g.lineStyle(1.4, tint(PLASMA.blush), 0.8);
      strokePts(g, arcPath(tip.x, tip.y, tip.x + cos * dir * 10, tip.y + sin * dir * 10, 6, t * 50 + dir, 3));
    }
  }

  /** The Unstable Arena floor: a crackling disc whose edge tightens as the fuse burns down. */
  static drawZone(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    x: number, y: number, radius: number, urgency: number, t: number,
  ): void {
    const color = urgency > 0.5 ? PLASMA.hot : PLASMA.purple;
    g.fillStyle(tint(PLASMA.deep), 0.18 + 0.16 * urgency);
    g.fillCircle(x, y, radius);
    // Static skittering across the floor of it.
    for (let i = 0; i < 9; i++) {
      const a = t * 0.6 + (i / 9) * TAU;
      const d = radius * (0.2 + ((i * 0.37) % 1) * 0.7);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      g.lineStyle(1.4, tint(color), 0.35 + 0.35 * urgency);
      strokePts(g, arcPath(px, py, px + Math.cos(a + 1) * 16, py + Math.sin(a + 1) * 16, 6, t * 40 + i * 9, 3));
    }
    arcRing(g, tint, x, y, radius, 3 + 5 * urgency, t * 30, 2.5 + 3 * urgency, color, 0.75 + 0.25 * urgency);
    // The countdown: a bright arm sweeping the rim as the dwell timer fills.
    if (urgency > 0) {
      const a0 = -Math.PI / 2;
      const pts: Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const a = a0 + (i / 24) * TAU * urgency;
        pts.push({ x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius });
      }
      g.lineStyle(4, tint(PLASMA.white), 0.5 + 0.4 * urgency);
      strokePts(g, pts);
    }
  }

  /** One end of a Plasma Current, with the live chain running between the pair. */
  static drawCurrent(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    ax: number, ay: number, bx: number, by: number, stopped: boolean, t: number,
  ): void {
    const color = stopped ? PLASMA.hot : PLASMA.orchid;
    // The chain: three arcs on their own beats, so it reads as current rather than as a wire.
    for (let i = 0; i < 3; i++) {
      arcBolt(g, tint, ax, ay, bx, by, 11 + i * 5, t * 60 + i * 23, 2.6 - i * 0.5, color, 0.85 - i * 0.2, 9);
    }
    plasmaBead(g, tint, ax, ay, 9, t, color, 1, 4);
    plasmaBead(g, tint, bx, by, 9, t + 0.4, color, 1, 4);
  }

  /** A Volt Point: a socket of plasma waiting to relay, with its charge count showing as pips. */
  static drawVoltPoint(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    x: number, y: number, charges: number, t: number,
  ): void {
    plasmaBead(g, tint, x, y, 11, t, PLASMA.magenta, 0.95, 5);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.7;
      const px = x + Math.cos(a) * 17, py = y + Math.sin(a) * 17;
      g.fillStyle(tint(i < charges ? PLASMA.white : PLASMA.void), i < charges ? 0.95 : 0.5);
      g.fillCircle(px, py, 2.4);
    }
    arcRing(g, tint, x, y, 15, 2, t * 25, 1.4, PLASMA.blush, 0.4 + 0.2 * Math.sin(t * 5));
  }

  /**
   * The Permanent Chaos orb: a heavy bead with its reach ring drawn around it, so "how close is
   * too close" is never a guess.
   */
  static drawPermanentOrb(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    x: number, y: number, radius: number, reach: number, arming: number, t: number,
  ): void {
    g.lineStyle(1.4, tint(PLASMA.magenta), (0.16 + 0.08 * Math.sin(t * 4)) * arming);
    g.strokeCircle(x, y, reach * (2 - arming));
    for (let i = 0; i < 6; i++) {
      const a = t * 0.5 + (i / 6) * TAU;
      g.lineStyle(1.2, tint(PLASMA.orchid), 0.22 * arming);
      strokePts(g, arcPath(
        x + Math.cos(a) * radius, y + Math.sin(a) * radius,
        x + Math.cos(a) * reach, y + Math.sin(a) * reach,
        14, t * 20 + i * 17, 4,
      ));
    }
    plasmaBead(g, tint, x, y, radius, t, PLASMA.purple, 1, 6);
  }

  /**
   * The Pure CHAOS! shell: a cage of forked bolts wrapped around the caster, strobing in its
   * last few seconds as a "duck, it's about to end" tell.
   */
  static drawEnvelope(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    x: number, y: number, remaining: number, t: number,
  ): void {
    const flicker = remaining < 4 ? 0.55 + 0.45 * Math.sin(t * 22) : 1;
    g.fillStyle(tint(PLASMA.purple), 0.13 * flicker);
    g.fillCircle(x, y, 30);
    arcRing(g, tint, x, y, 30, 4, t * 30, 2, PLASMA.magenta, 0.5 * flicker);
    for (let i = 0; i < 7; i++) {
      const a = t * 2.6 + (i / 7) * TAU;
      const r = 26 + Math.sin(t * 5 + i * 2.3) * 8;
      arcFork(g, tint, x + Math.cos(a) * 10, y + Math.sin(a) * 10,
        x + Math.cos(a) * r, y + Math.sin(a) * r, 7, t * 60 + i * 31, 2.4,
        i % 2 === 0 ? PLASMA.white : PLASMA.blush, 0.9 * flicker);
    }
  }

  /** The orbital electron and the tilted ring it rides, hotter the closer it gets. */
  static drawOrbital(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    cx: number, cy: number, ox: number, oy: number,
    radius: number, angle: number, tilt: number, closeness: number, t: number,
  ): void {
    const urgency = closeness > 0.7 ? 0.55 + 0.45 * Math.sin(t * 20) : 1;
    const project = (a: number, r: number): Pt => {
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.42;
      return { x: cx + px * Math.cos(tilt) - py * Math.sin(tilt), y: cy + px * Math.sin(tilt) + py * Math.cos(tilt) };
    };

    const path: Pt[] = [];
    for (let s = 0; s <= 48; s++) path.push(project((s / 48) * TAU, radius));
    g.lineStyle(1.6, tint(PLASMA.hot), (0.2 + 0.4 * closeness) * urgency);
    strokePts(g, path, true);

    // Nucleus haze on the caster, so it's obvious who the orbital belongs to.
    g.fillStyle(tint(PLASMA.hot), 0.1 + 0.16 * closeness);
    g.fillCircle(cx, cy, 16 + 8 * closeness);

    for (let s = 1; s <= 8; s++) {
      const p = project(angle - s * 0.09, radius);
      const fade = 1 - s / 9;
      g.fillStyle(tint(PLASMA.hot), 0.32 * fade * urgency);
      g.fillCircle(p.x, p.y, 7 * fade);
    }
    plasmaBead(g, tint, ox, oy, 9 + closeness * 3, t, PLASMA.hot, urgency, 4);
  }

  /**
   * The Chaos Storm: the condemned ground outside the ring, and a live crackling edge that gets
   * angrier the tighter the walls close.
   */
  static drawStorm(
    g: Phaser.GameObjects.Graphics, tint: PlasmaColorFn,
    W: number, H: number,
    b: { left: number; right: number; top: number; bottom: number; ratio: number },
    t: number,
  ): void {
    g.fillStyle(tint(PLASMA.deep), 0.16 + 0.16 * b.ratio);
    g.fillRect(0, 0, W, b.top);
    g.fillRect(0, b.bottom, W, H - b.bottom);
    g.fillRect(0, b.top, b.left, b.bottom - b.top);
    g.fillRect(b.right, b.top, W - b.right, b.bottom - b.top);

    // Static crawling over the dead ground — sparse, so it reads as menace not noise.
    for (let i = 0; i < 12; i++) {
      const along = Math.sin(t * 1.1 + i * 97.3) * 0.5 + 0.5;
      const side = i % 4;
      let sx: number, sy: number;
      if (side === 0) { sx = b.left + (b.right - b.left) * along; sy = b.top * (0.2 + 0.6 * ((i * 13) % 7) / 7); }
      else if (side === 1) { sx = b.left + (b.right - b.left) * along; sy = b.bottom + (H - b.bottom) * (0.2 + 0.6 * ((i * 17) % 7) / 7); }
      else if (side === 2) { sx = b.left * (0.2 + 0.6 * ((i * 11) % 7) / 7); sy = b.top + (b.bottom - b.top) * along; }
      else { sx = b.right + (W - b.right) * (0.2 + 0.6 * ((i * 19) % 7) / 7); sy = b.top + (b.bottom - b.top) * along; }
      g.lineStyle(1.3, tint(PLASMA.rose), 0.3);
      strokePts(g, arcPath(sx, sy, sx + 14, sy + 8, 7, t * 30 + i * 11, 3));
    }

    const heat = 0.5 + 0.5 * b.ratio;
    const edges: Array<[number, number, number, number]> = [
      [b.left, b.top, b.right, b.top],
      [b.right, b.top, b.right, b.bottom],
      [b.right, b.bottom, b.left, b.bottom],
      [b.left, b.bottom, b.left, b.top],
    ];
    for (let e = 0; e < edges.length; e++) {
      const [x1, y1, x2, y2] = edges[e];
      const segs = Math.max(8, Math.round(Math.hypot(x2 - x1, y2 - y1) / 34));
      arcBolt(g, tint, x1, y1, x2, y2, 4 + 7 * heat, t * 55 + e * 41, 3, PLASMA.hot, 0.55 + 0.3 * heat, segs);
    }

    const pulse = 4 + Math.sin(t * 7) * 1.6;
    for (const [cx, cy] of [[b.left, b.top], [b.right, b.top], [b.right, b.bottom], [b.left, b.bottom]]) {
      plasmaBead(g, tint, cx, cy, pulse, t, PLASMA.hot, 0.9, 3);
    }
  }
}

// ── PlasmaAura ────────────────────────────────────────────────────────────

export type PlasmaAuraStyle =
  | 'chaos'   // the Chaos debuff: something is going to burst out of you soon
  | 'pure'    // Pure CHAOS!: the caster wrapped in raw lightning
  | 'wind';   // the R-hold wind-up, and any other charge held on the body

/**
 * A persistent plasma effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape*: chaos boils outward, the Pure CHAOS shell cages, a wind-up
 * converges. Several can be up at once, so they must stay separable at a glance.
 */
export class PlasmaAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: PlasmaColorFn,
    private style: PlasmaAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setIntensity(v: number): void { this.intensity = v; }
  setAngle(a: number): void { this.angle = a; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = Phaser.Math.Clamp(this.intensity, 0, 1);
    const r = this.radius;

    switch (this.style) {
      case 'chaos': {
        // Plasma boiling out of the victim, thickening as the next orb release nears.
        g.fillStyle(this.tint(PLASMA.pink), 0.16 * alpha);
        g.fillCircle(x, y, r);
        for (let i = 0; i < 6; i++) {
          const a = this.t * 1.4 + (i / 6) * TAU;
          const p = (this.t * 0.9 + i / 6) % 1;
          const d = r * (0.4 + p * 0.9);
          plasmaBead(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d,
            3.4 * (1 - p * 0.5), this.t + i, PLASMA.blush, 0.85 * alpha * (1 - p), 2);
        }
        arcRing(g, this.tint, x, y, r, 3, this.t * 30, 1.8, PLASMA.pink, (0.4 + 0.25 * k) * alpha);
        break;
      }
      case 'pure': {
        PlasmaFx.drawEnvelope(g, this.tint, x, y, this.intensity, this.t);
        break;
      }
      case 'wind': {
        // Bolts hauled in toward the hands, tighter and brighter as the hold builds.
        const close = 1 - k * 0.6;
        for (let i = 0; i < 6; i++) {
          const a = this.angle + Math.sin(this.t * 3 + i) * 0.6 + (i / 6) * TAU;
          arcBolt(g, this.tint, x + Math.cos(a) * r * 1.6 * close, y + Math.sin(a) * r * 1.6 * close,
            x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3,
            r * 0.2, this.t * 60 + i * 19, 2.2, PLASMA.orchid, (0.4 + 0.5 * k) * alpha, 4);
        }
        arcRing(g, this.tint, x, y, r * close, 3, this.t * 40, 2, PLASMA.white, (0.3 + 0.4 * k) * alpha);
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── PlasmaAvatar ──────────────────────────────────────────────────────────

/** Concentric discs of one containment-orb hand, outermost first. */
const PLASMA_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: PLASMA.purple, alpha: 0.22 },
    { r: 7.4, color: PLASMA.void, alpha: 0.95 },
    { r: 4.6, color: PLASMA.magenta, alpha: 1 },
    { r: 1.8, color: PLASMA.white, alpha: 1, ox: -1.9, oy: -2 },
  ],
  eyeWhite: PLASMA.blush,
  eyePupil: PLASMA.void,
  // Weightless: the hands whip around and streak hard.
  squash: { div: 11, x: 0.6, y: 0.32 },
};

/**
 * The plasma character rig: two hands that are really containment orbs, a pair of eyes, and a
 * forked corona standing off the crown. An arc jumps between the two hands whenever they get
 * close, and a second one grounds itself off the crown — the fighter is visibly *live*, which is
 * the read no amount of purple tint would buy.
 */
export class PlasmaAvatar extends BaseAvatar {
  private fx: PlasmaFx;
  /** Warm for the player, cold for the NPC, so two plasma fighters never blur together. */
  private accent: number;

  constructor(scene: Phaser.Scene, tint: PlasmaColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, PLASMA_AVATAR);
    this.fx = new PlasmaFx(scene, tint);
    this.accent = owner === 'player' ? PLASMA.magenta : PLASMA.orchid;
  }

  /**
   * Mastery tell — Chaos Storm, made visible: white-hot eyes, a wider containment corona on each
   * hand with a hot rim, and a second forked crown that turns the other way (drawn in
   * drawExtras). Shape changes, not brighter tints.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? PLASMA.white : PLASMA.blush);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 15.5 : 12));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(PLASMA.hot), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed loose plasma. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 45, size: 3.6, life: 340, depth: 5, color: this.accent });
  }

  /** Both hands cupped around a compressing knot of lightning. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const squeeze = 0.5 + 0.5 * Math.sin(this.t * 7);
    return {
      ang: this.facing + side * (0.5 + squeeze * 0.25),
      dist: 19 + squeeze * 5,
      scale: idle.scale * (1.1 + squeeze * 0.2),
    };
  }

  /** A violet pool of charge underfoot, spitting the odd ground arc. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(this.accent), a * 0.16 * k);
    g.fillEllipse(x, y + 7, 56 * k, 24 * k);
    for (let i = 0; i < 3; i++) {
      const ang = this.t * 1.1 + (i / 3) * TAU;
      const d = 20 * k;
      g.lineStyle(1.3, this.tint(PLASMA.orchid), a * 0.6);
      strokePts(g, arcPath(x, y + 7, x + Math.cos(ang) * d, y + 7 + Math.sin(ang) * d * 0.5,
        6, this.t * 40 + i * 13, 3));
    }
  }

  /**
   * The arc between the hands, and the crown: two prongs standing off the head with lightning
   * jumping the gap. Rooted above the head so it never covers the face, and drawn over the
   * sprite so the bolts read instead of vanishing behind the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // ── The arc between the two hands ──
    const [x0, y0] = [this.armX[0], this.armY[0]];
    const [x1, y1] = [this.armX[1], this.armY[1]];
    const gap = Math.hypot(x1 - x0, y1 - y0);
    if (gap > 4 && gap < 90) {
      const strength = Phaser.Math.Clamp(1 - gap / 90, 0.15, 1) * this.intensity;
      arcBolt(g, this.tint, x0, y0, x1, y1, gap * 0.22, this.t * 90, 2.2, this.accent, alpha * 0.8 * strength, 5);
    }

    // ── The crown ──
    const rootY = y - 19;
    const span = (this.mastered ? 17 : 13) * this.intensity;
    for (const dir of [-1, 1]) {
      const px = x + dir * span;
      g.fillStyle(this.tint(PLASMA.void), alpha);
      fillPts(g, [
        { x: px - 2.6, y: rootY + 5 }, { x: px + 2.6, y: rootY + 5 },
        { x: px + 1.4, y: rootY - 9 }, { x: px - 1.4, y: rootY - 9 },
      ]);
      g.fillStyle(this.tint(PLASMA.purple), alpha * 0.9);
      g.fillCircle(px, rootY - 9, 2.6);
    }
    // Lightning jumping the gap between the prongs, on two beats.
    for (let i = 0; i < 2; i++) {
      arcFork(g, this.tint, x - span, rootY - 9, x + span, rootY - 9,
        6 + i * 4, this.t * 70 + i * 37, 2.2 - i * 0.7,
        i === 0 ? PLASMA.white : PLASMA.blush, a * 0.95);
    }

    // ── Mastery: a counter-rotating cage and three beads orbiting the head ──
    if (this.mastered) {
      for (let i = 0; i < 5; i++) {
        const ang = -this.t * 1.9 + (i / 5) * TAU;
        arcBolt(g, this.tint, x + Math.cos(ang) * 10, rootY - 2 + Math.sin(ang) * 5,
          x + Math.cos(ang) * 30, rootY - 2 + Math.sin(ang) * 15,
          6, this.t * 50 + i * 23, 1.8, PLASMA.hot, alpha * 0.8, 4);
      }
      for (let i = 0; i < 3; i++) {
        const ang = this.t * 1.4 + (i / 3) * TAU;
        plasmaBead(g, this.tint, x + Math.cos(ang) * 30, rootY - 4 + Math.sin(ang) * 11,
          3.4, this.t + i, PLASMA.hot, alpha * 0.95, 2);
      }
    }
  }
}
