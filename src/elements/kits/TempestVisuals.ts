import Phaser from 'phaser';
import {
  ArmGesture, ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut,
} from './ElementVisuals';

/**
 * Everything Tempest draws.
 *
 * One material: **moving air**. Nothing in this kit is a solid — every effect is a streak of wind
 * made visible, the way a gust is visible only by what it carries. The primitive is `gust`: a
 * tapered ribbon that waves along its own length and curls at the head, drawn in three passes
 * (a soft pale shell, a white body, a thin hot core). Bursts are gusts thrown out of a point,
 * fronts are gusts marching along a rectangle, currents are gusts wound into a spiral, a landing
 * is gusts lying flat on the floor. The one thing that is not wind is the lightning, and it is
 * reserved: it only ever appears when the storm has an eye — the ping-pong currents after a dive.
 *
 * The character is a storm-blue orb wearing a **cloud ring**: a halo of cloud puffs orbiting the
 * crown. Mastery widens the ring and lets it spark. The Eye of the Storm is an ability tell, not
 * a costume — a huge electric eyeball painted over the whole body for as long as the currents
 * are live, and gone the moment they end.
 */

export type TempestColorFn = ColorFn;

export const TMP = {
  /** Under everything. */
  ink: 0x0b1020,
  /** The orb's rim. */
  deep: 0x1f2a44,
  slate: 0x33456b,
  /** The orb's body. */
  storm: 0x4f6d99,
  /** The orb's core, and the element's colour. */
  sky: 0x7fb4ff,
  /** Wind made visible. */
  gust: 0xc9e3ff,
  white: 0xf4f9ff,
  /** Lightning — the Eye only. */
  bolt: 0xfff3a6,
  boltHot: 0xffffff,
  /** The Eye of the Storm. */
  iris: 0x36d6ff,
  irisDeep: 0x0d6f99,
  pupil: 0x050a14,
  /** Floor shadows and the dust a landing kicks up. */
  shadow: 0x04060d,
  dust: 0x8794a8,
  /** The fall-speed arrow at full tilt. */
  red: 0xff4a3d,
};

/** Deterministic 0–1 noise, so a streak keeps its shape between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 47.3 + i * 91.7) * 18733.517;
  return v - Math.floor(v);
}

/** Blend two colours channel-wise. `k` 0 = a, 1 = b. */
export function mix(a: number, b: number, k: number): number {
  const c = Phaser.Math.Clamp(k, 0, 1);
  const ch = (sh: number): number => Math.round((((a >> sh) & 0xff) * (1 - c)) + (((b >> sh) & 0xff) * c));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A gust: one tapered ribbon of wind from `(x, y)` along `ang` for `len`, waving along its length
 * and curling at the head. `phase` animates the wave; `seed` picks the shape. Appends one filled
 * polygon — see `gustLayered` for the three-pass version.
 */
export function gust(
  g: Phaser.GameObjects.Graphics,
  color: number,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  { phase = 0, seed = 0, curl = 0.55 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const N = 11;
  const top: Phaser.Geom.Point[] = [];
  const bot: Phaser.Geom.Point[] = [];
  const wobble = 0.35 + jitter(seed, 1) * 0.3;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    // The wave along the body, and a hook at the head so the streak reads as a comma, not a bar.
    const wave = Math.sin(u * Math.PI * 1.3 + phase + seed) * halfW * wobble;
    const hook = u > 0.75 ? Math.sin((u - 0.75) / 0.25 * Math.PI * 0.5) * halfW * curl * 1.6 : 0;
    const v = wave + hook;
    const w = halfW * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.7) * (u > 0.72 ? 1 - (u - 0.72) * 1.6 : 1);
    top.push(pt(x, y, ca, sa, u * len, v - Math.max(0.4, w)));
    bot.push(pt(x, y, ca, sa, u * len, v + Math.max(0.4, w)));
  }
  g.fillStyle(color, alpha);
  g.fillPoints([...top, ...bot.reverse()], true);
}

/** The gust in three passes: pale shell, white body, hot core. */
export function gustLayered(
  g: Phaser.GameObjects.Graphics,
  tint: TempestColorFn,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  o: { phase?: number; seed?: number; curl?: number; hot?: number } = {},
): void {
  const hot = o.hot ?? 0;
  gust(g, tint(TMP.gust), x, y, ang, len, halfW * 1.45, alpha * 0.32, o);
  gust(g, tint(TMP.white), x, y, ang, len * 0.96, halfW * 0.9, alpha * 0.78, o);
  gust(g, tint(hot > 0 ? TMP.bolt : TMP.white), x + Math.cos(ang) * len * 0.1, y + Math.sin(ang) * len * 0.1,
    ang, len * 0.72, halfW * 0.32, alpha * (0.9 + hot * 0.1), o);
}

/**
 * A spiral of wind — `arms` streamers winding `turns` times from the centre out to `r`,
 * rotating with `phase`. Currents, the launch column and the grapple's updraft are all this.
 */
export function swirl(
  g: Phaser.GameObjects.Graphics,
  color: number,
  x: number, y: number, r: number, alpha: number,
  { arms = 3, turns = 1.1, phase = 0, width = 2.4, squash = 1, inner = 0.12 } = {},
): void {
  const N = 18;
  g.lineStyle(width, color, alpha);
  for (let a = 0; a < arms; a++) {
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const k = i / N;
      const ang = phase + (a / arms) * TAU + k * turns * TAU;
      const rr = r * (inner + (1 - inner) * k);
      const px = x + Math.cos(ang) * rr;
      const py = y + Math.sin(ang) * rr * squash;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
}

/** A single ^ — the rising-air glyph. */
export function chevron(
  g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number, alpha: number, width = 2,
): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(x - w, y + h);
  g.lineTo(x, y - h);
  g.lineTo(x + w, y + h);
  g.strokePath();
}

/** A jagged bolt from a to b. `seed` fixes the kinks; a changing seed makes it crackle. */
export function lightning(
  g: Phaser.GameObjects.Graphics,
  color: number,
  x1: number, y1: number, x2: number, y2: number, jag: number, width: number, alpha: number, seed = 0,
): void {
  const n = 5;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const off = (jitter(seed, i) - 0.5) * 2 * jag;
    g.lineTo(x1 + dx * k + nx * off, y1 + dy * k + ny * off);
  }
  g.lineTo(x2, y2);
  g.strokePath();
}

/**
 * A rectangle rotated to `ang` with its near edge centred on `(x, y)` — the shape of a front.
 * Returned as points so the same geometry paints the floor, the slam and the preview.
 */
export function frontPoints(x: number, y: number, ang: number, len: number, halfW: number): Phaser.Geom.Point[] {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  return [pt(x, y, ca, sa, 0, -halfW), pt(x, y, ca, sa, len, -halfW), pt(x, y, ca, sa, len, halfW), pt(x, y, ca, sa, 0, halfW)];
}

/** The live floor painting of a front: a translucent lane with gusts marching down it. */
export function frontLane(
  g: Phaser.GameObjects.Graphics,
  tint: TempestColorFn,
  x: number, y: number, ang: number, len: number, halfW: number, alpha: number,
  { t = 0, seed = 0 } = {},
): void {
  const pts = frontPoints(x, y, ang, len, halfW);
  g.fillStyle(tint(TMP.sky), alpha * 0.14);
  g.fillPoints(pts, true);
  g.lineStyle(1.6, tint(TMP.gust), alpha * 0.5);
  g.strokePoints(pts, true);
  // Gusts marching along the lane: six of them, spaced by phase so they flow continuously.
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  for (let i = 0; i < 6; i++) {
    const k = ((t * 0.9 + i / 6 + jitter(seed, i) * 0.1) % 1);
    const u = k * (len - 50);
    const v = (jitter(seed, i + 10) - 0.5) * halfW * 1.3;
    const p = pt(x, y, ca, sa, u, v);
    const fade = Math.sin(k * Math.PI);
    gustLayered(g, tint, p.x, p.y, ang, 52, 5, alpha * (0.35 + fade * 0.45), { phase: t * 6 + i, seed: seed + i });
  }
  // Arrowheads on the far edge, so the direction reads even with the gusts between frames.
  for (const s of [-0.5, 0, 0.5]) {
    const p = pt(x, y, ca, sa, len - 14, s * halfW * 1.2);
    const q = pt(x, y, ca, sa, len - 4, s * halfW * 1.2);
    const l = pt(x, y, ca, sa, len - 14, s * halfW * 1.2 - 6);
    const r = pt(x, y, ca, sa, len - 14, s * halfW * 1.2 + 6);
    g.lineStyle(2, tint(TMP.white), alpha * 0.6);
    g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(q.x, q.y); g.lineTo(r.x, r.y); g.strokePath();
    g.lineStyle(1, tint(TMP.white), alpha * 0.3);
    g.lineBetween(p.x, p.y, q.x, q.y);
  }
}

/** A current on the floor: a spiral of rising air with chevrons climbing out of it. */
export function current(
  g: Phaser.GameObjects.Graphics,
  tint: TempestColorFn,
  x: number, y: number, r: number, alpha: number,
  { t = 0, seed = 0, life = 1 } = {},
): void {
  g.fillStyle(tint(TMP.sky), alpha * 0.1);
  g.fillEllipse(x, y, r * 2.2, r * 1.3);
  g.lineStyle(1.5, tint(TMP.gust), alpha * 0.45);
  g.strokeEllipse(x, y, r * 2.2, r * 1.3);
  swirl(g, tint(TMP.white), x, y, r, alpha * 0.7, { arms: 3, turns: 1.2, phase: -t * 2.6 + seed, width: 2.2, squash: 0.6 });
  swirl(g, tint(TMP.gust), x, y, r * 0.7, alpha * 0.5, { arms: 2, turns: 0.9, phase: t * 3.1 + seed, width: 1.4, squash: 0.6 });
  // Chevrons climb out of the spiral and fade as they go.
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.6 + i / 4 + jitter(seed, i) * 0.2) % 1;
    const cx = x + (jitter(seed, i + 4) - 0.5) * r * 0.9;
    chevron(g, tint(TMP.white), cx, y - k * 52 - 4, 6 + k * 3, 4, alpha * (1 - k) * 0.8 * life, 2);
  }
}

// ── TempestFx — one-shot effects ─────────────────────────────────────────

export class TempestFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: TempestColorFn = (c) => c) {
    super(scene, tint);
  }

  /** A jittered expanding ring; segment count scales with radius so a big blast stays round. */
  ring(x: number, y: number, r0: number, r1: number, ms: number, color: number, width = 3, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const n = Math.max(18, Math.round(r / 5));
      g.lineStyle(width * (1 - t * 0.6), this.tint(color), (1 - t) * 0.85);
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.06);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
  }

  /** A puff of dust off the floor. */
  dust(x: number, y: number, count: number, spread: number, ms: number, depth = 4): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.6, d: spread * (0.4 + Math.random() * 0.6), r: 3 + Math.random() * 4,
    }));
    this.anim(depth, ms, (g, t) => {
      for (const s of seeds) {
        const k = easeOut(t);
        g.fillStyle(this.tint(TMP.dust), (1 - t) * 0.45);
        g.fillCircle(x + Math.cos(s.a) * s.d * k, y + Math.sin(s.a) * s.d * k * 0.5 - k * 6, s.r * (1 + k));
      }
    });
  }

  /**
   * A Gale Burst going off: flash, a ring, eight gusts thrown out of the point, dust under it.
   * `boost` adds the rising chevrons of a self-hit that bought elevation.
   */
  burst(x: number, y: number, r: number, { boost = false, big = false } = {}): void {
    this.flashIn(x, y, r * 0.5, TMP.white, TMP.sky, 10);
    this.ring(x, y, r * 0.3, r * 1.15, 320, TMP.gust, 3);
    this.ring(x, y, r * 0.2, r * 0.85, 420, TMP.white, 2);
    const n = big ? 12 : 8;
    const seed = Math.random() * 999;
    this.anim(9, 380, (g, t) => {
      const k = easeOut(t);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + seed;
        const d = r * (0.2 + k * 0.9);
        gustLayered(g, this.tint, x + Math.cos(a) * d * 0.4, y + Math.sin(a) * d * 0.4, a, r * 0.55 * (1 - k * 0.3), 5 - k * 2,
          (1 - t) * 0.9, { phase: t * 8, seed: seed + i, curl: 0.4 });
      }
    });
    this.dust(x, y, 6, r * 0.8, 450);
    if (boost) {
      this.anim(9, 520, (g, t) => {
        for (let i = 0; i < 5; i++) {
          const k = (t + i / 5) % 1;
          chevron(g, this.tint(TMP.white), x + (jitter(seed, i) - 0.5) * r * 0.8, y - k * 70, 7, 4, (1 - k) * (1 - t * 0.5), 2.2);
        }
      });
    }
  }

  /** The comet behind a Kick Blast roll — call it off a short accumulator while rolling. */
  rollTrail(x: number, y: number, ang: number): void {
    const seed = Math.random() * 999;
    this.anim(4, 260, (g, t) => {
      gustLayered(g, this.tint, x, y, ang + Math.PI, 42 * (1 - t * 0.4), 6 * (1 - t), (1 - t) * 0.8, { phase: t * 5, seed });
    });
  }

  /** A kick landing on a body: a flash and a fan of gusts along the roll. */
  kickHit(x: number, y: number, ang: number): void {
    this.flashIn(x, y, 18, TMP.white, TMP.sky, 10);
    const seed = Math.random() * 999;
    this.anim(9, 300, (g, t) => {
      const k = easeOut(t);
      for (let i = -2; i <= 2; i++) {
        const a = ang + i * 0.28;
        gustLayered(g, this.tint, x + Math.cos(a) * 10, y + Math.sin(a) * 10, a, 48 * (0.4 + k * 0.6), 5, (1 - t) * 0.9,
          { phase: t * 6, seed: seed + i });
      }
    });
  }

  /** The flash of a front being laid down: the lane lights edge to edge, then settles. */
  frontPlace(x: number, y: number, ang: number, len: number, halfW: number): void {
    this.anim(9, 360, (g, t) => {
      const pts = frontPoints(x, y, ang, len * easeOut(t), halfW);
      g.fillStyle(this.tint(TMP.white), (1 - t) * 0.35);
      g.fillPoints(pts, true);
      g.lineStyle(2.5, this.tint(TMP.gust), (1 - t) * 0.9);
      g.strokePoints(pts, true);
    });
  }

  /**
   * A front slam: the whole lane goes white, two shockwaves run its length, lightning runs its
   * edges, and gusts are thrown off both long sides. `k` is the height the slam came from, 0–1.
   */
  frontSlam(x: number, y: number, ang: number, len: number, halfW: number, k: number): void {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const seed = Math.random() * 999;
    this.anim(10, 160, (g, t) => {
      g.fillStyle(this.tint(TMP.white), (1 - t) * 0.9);
      g.fillPoints(frontPoints(x, y, ang, len, halfW * (1 + t * 0.3)), true);
    });
    this.anim(9, 520, (g, t) => {
      const e = easeOut(t);
      const pts = frontPoints(x, y, ang, len, halfW * (1 + e * 0.5));
      g.lineStyle(3 * (1 - t), this.tint(TMP.gust), (1 - t) * 0.9);
      g.strokePoints(pts, true);
      // Two bars of pressure racing down the lane.
      for (const s of [0, 0.5]) {
        const u = ((e + s) % 1) * len;
        const a = pt(x, y, ca, sa, u, -halfW * 1.3);
        const b = pt(x, y, ca, sa, u, halfW * 1.3);
        g.lineStyle(4 * (1 - t), this.tint(TMP.white), (1 - t) * 0.7);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      // Lightning down both edges, re-rolled each frame so it crackles.
      for (const side of [-1, 1]) {
        const a = pt(x, y, ca, sa, 0, side * halfW);
        const b = pt(x, y, ca, sa, len, side * halfW);
        lightning(g, this.tint(TMP.bolt), a.x, a.y, b.x, b.y, 7 + k * 6, 1.6, (1 - t) * 0.85, seed + Math.floor(t * 20) + side);
      }
      // Gusts blown off the long sides.
      for (let i = 0; i < 6; i++) {
        const u = (i + 0.5) / 6 * len;
        for (const side of [-1, 1]) {
          const p = pt(x, y, ca, sa, u, side * halfW * (1 + e * 1.2));
          gustLayered(g, this.tint, p.x, p.y, ang + side * Math.PI / 2, 40 + k * 30, 5, (1 - t) * 0.8, { phase: t * 7, seed: seed + i * 2 + side });
        }
      }
    });
    this.dust((pt(x, y, ca, sa, len / 2, 0)).x, (pt(x, y, ca, sa, len / 2, 0)).y, 10 + Math.round(k * 8), halfW * 1.6, 600);
  }

  /** The launch out of a current: a column of rings and chevrons climbing off the floor. */
  launch(x: number, y: number): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 22, TMP.white, TMP.sky, 9);
    this.anim(9, 650, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 4; i++) {
        const k = Math.max(0, Math.min(1, e * 1.4 - i * 0.18));
        if (k <= 0) continue;
        g.lineStyle(2.4 * (1 - k), this.tint(TMP.gust), (1 - k) * 0.8);
        g.strokeEllipse(x, y - k * 120, 56 - k * 30, 20 - k * 10);
      }
      for (let i = 0; i < 7; i++) {
        const k = (e * 1.6 + i / 7) % 1;
        chevron(g, this.tint(TMP.white), x + (jitter(seed, i) - 0.5) * 36, y - 10 - k * 150, 8, 5, (1 - k) * (1 - t * 0.4), 2.4);
      }
      swirl(g, this.tint(TMP.white), x, y, 30 + e * 24, (1 - t) * 0.7, { arms: 3, turns: 1, phase: -t * 9 + seed, squash: 0.55 });
    });
  }

  /**
   * A landing shockwave. `k` is the fall speed, 0–1: more rings, more gusts, a longer dust
   * cloud and a lightning crown at the top end — a dive and a hop must not look the same.
   */
  landing(x: number, y: number, r: number, k: number): void {
    this.flashIn(x, y, 14 + k * 24, TMP.white, TMP.sky, 10);
    this.ring(x, y, 10, r, 360 + k * 200, TMP.white, 3.5);
    this.ring(x, y, 6, r * 0.8, 480 + k * 200, TMP.gust, 2.5);
    if (k > 0.45) this.ring(x, y, 4, r * 1.15, 600, TMP.sky, 2);
    const n = 8 + Math.round(k * 8);
    const seed = Math.random() * 999;
    this.anim(9, 420 + k * 220, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + seed;
        const d = r * (0.25 + e * 0.8);
        // Flat to the floor: the vertical component is squashed, so the wave hugs the ground.
        gustLayered(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, a, (30 + k * 30) * (1 - e * 0.3), 5,
          (1 - t) * 0.9, { phase: t * 8, seed: seed + i, curl: 0.3 });
      }
      if (k > 0.7) {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + t * 3;
          lightning(g, this.tint(TMP.bolt), x, y - 6, x + Math.cos(a) * r * 0.7, y - 6 + Math.sin(a) * r * 0.35,
            6, 1.5, (1 - t) * 0.8, seed + i + Math.floor(t * 16));
        }
      }
    });
    this.dust(x, y, 8 + Math.round(k * 10), r * 1.1, 550 + k * 250);
  }

  /** A body slammed into a wall: a flash on the wall and gusts fanning back off it. `nx, ny` is the wall normal. */
  wallSlam(x: number, y: number, nx: number, ny: number, { electric = false } = {}): void {
    const a0 = Math.atan2(ny, nx);
    this.flashIn(x, y, 20, TMP.white, electric ? TMP.bolt : TMP.sky, 10);
    const seed = Math.random() * 999;
    this.anim(9, 340, (g, t) => {
      const e = easeOut(t);
      for (let i = -2; i <= 2; i++) {
        const a = a0 + i * 0.5;
        gustLayered(g, this.tint, x + Math.cos(a) * 8, y + Math.sin(a) * 8, a, 46 * (0.3 + e * 0.7), 5, (1 - t) * 0.9,
          { phase: t * 7, seed: seed + i, hot: electric ? 1 : 0 });
      }
      // The wall itself takes a crack: a short bar along it.
      g.lineStyle(4 * (1 - t), this.tint(TMP.white), (1 - t) * 0.8);
      g.lineBetween(x - ny * 26 * (1 + e), y + nx * 26 * (1 + e), x + ny * 26 * (1 + e), y - nx * 26 * (1 + e));
      if (electric) {
        for (let i = 0; i < 3; i++) {
          const s = (i - 1) * 0.8;
          lightning(g, this.tint(TMP.bolt), x, y, x + Math.cos(a0 + s) * 40, y + Math.sin(a0 + s) * 40, 7, 1.6, (1 - t) * 0.9,
            seed + i + Math.floor(t * 14));
        }
      }
    });
  }

  /** The grapple catching: a tight ring and a crackle of wind lines around the pair. */
  grabSnap(x: number, y: number): void {
    this.flashIn(x, y, 20, TMP.white, TMP.sky, 10);
    this.ring(x, y, 40, 14, 260, TMP.gust, 3);
    const seed = Math.random() * 999;
    this.anim(9, 420, (g, t) => {
      swirl(g, this.tint(TMP.white), x, y, 34 + t * 10, (1 - t) * 0.8, { arms: 4, turns: 0.8, phase: -t * 10 + seed, squash: 0.7 });
    });
  }

  /** A trail streak for anything travelling fast through the air (dives, the grapple dash). */
  streak(x: number, y: number, ang: number, len: number): void {
    const seed = Math.random() * 999;
    this.anim(9, 220, (g, t) => {
      gustLayered(g, this.tint, x, y, ang + Math.PI, len * (1 - t * 0.3), 5 * (1 - t), (1 - t) * 0.8, { phase: t * 4, seed });
    });
  }

  /** The Eye opening: a flash of lightning out of the body in every direction. */
  eyeOpen(x: number, y: number): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 34, TMP.boltHot, TMP.bolt, 10);
    this.anim(10, 420, (g, t) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + seed;
        const d = 30 + easeOut(t) * 70;
        lightning(g, this.tint(TMP.bolt), x, y, x + Math.cos(a) * d, y + Math.sin(a) * d, 8, 1.8, (1 - t) * 0.9, seed + i + Math.floor(t * 12));
      }
    });
  }
}

// ── TempestAvatar — the character rig ───────────────────────────────────

const TEMPEST_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: TMP.gust, alpha: 0.3 },
    { r: 8.4, color: TMP.sky, alpha: 1 },
    { r: 5.4, color: TMP.white, alpha: 1 },
    { r: 2.2, color: 0xffffff, alpha: 0.9, ox: -2, oy: -2 },
  ],
  eyeWhite: TMP.white,
  eyePupil: TMP.pupil,
  squash: { div: 12, x: 0.55, y: 0.3 },
};

/**
 * The storm: a plain orb in the element's blue with pale ball hands and one accessory — a
 * **cloud ring**, a halo of cloud puffs orbiting the crown. Tempest is bodyless (ArenaScene hands
 * it `elem-bodyless`), so the orb is painted here in `drawBody` — which is what lets the kit draw
 * the whole character lifted off the floor while the physics body stays where it is.
 *
 * Three live tells, all on what is already there: `setAir` streams wind off the body while
 * airborne, `setFall` leans the ring and the streaks with the fall, and `setEye` opens the Eye
 * of the Storm — a huge electric eyeball painted over the whole body while the ping-pong
 * currents are live. Detail: a slow cyclone spiral and storm bands on the orb, wind wisps
 * curling round the hands. Mastered: the cloud ring becomes a gold-lit thunderhead with a crown
 * of three lightning bolts standing out of it, rain falls past the body, a lightning seam
 * crackles across the orb, the ring widens and sparks, the hand coronas and wisps go bolt-gold
 * and the eyes go lightning-yellow.
 */
export class TempestAvatar extends BaseAvatar {
  private air = 0;
  private airTarget = 0;
  private fall = 0;
  private fallTarget = 0;
  private eye = 0;
  private eyeTarget = 0;
  private flare = 0;
  private sparkSeed = 0;

  constructor(scene: Phaser.Scene, tint: TempestColorFn, depth = 6) {
    super(scene, tint, depth, TEMPEST_AVATAR);
  }

  /** 1 while airborne, 0 on the floor. Lerped. */
  setAir(on: boolean): void { this.airTarget = on ? 1 : 0; }

  /** Fall speed as a 0–1 fraction of terminal. */
  setFall(v: number): void { this.fallTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** The Eye of the Storm: open while the ping-pong currents are live. */
  setEye(on: boolean): void { this.eyeTarget = on ? 1 : 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 360);
    this.air += (this.airTarget - this.air) * Math.min(1, delta / 220);
    this.fall += (this.fallTarget - this.fall) * Math.min(1, delta / 160);
    this.eye += (this.eyeTarget - this.eye) * Math.min(1, delta / (this.eyeTarget > this.eye ? 180 : 320));
    this.sparkSeed += delta;
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? TMP.bolt : TMP.white);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 16.5 : 13);
      glow.setAlpha(on ? 0.5 : 0.3);
      glow.setFillStyle(this.tint(on ? TMP.bolt : TMP.gust), on ? 0.5 : 0.3);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new TempestFx(this.scene, this.tint).streak(x, y, this.facing, 16);
  }

  /** Arms out wide for balance in the air, or one hand thrown out to hold a grappled body. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'ride') {
      const flap = Math.sin(this.t * 7 + side) * 0.18;
      return { ang: this.facing + side * (Math.PI / 2 - 0.2) + flap, dist: 38 + Math.sin(this.t * 7) * 3, scale: idle.scale * 1.1 };
    }
    if (hold === 'reach') {
      return side > 0
        ? { ang: this.holdAngle, dist: 44, scale: idle.scale * 1.25 }
        : { ang: this.holdAngle + Math.PI * 0.85, dist: 18, scale: idle.scale * 0.9 };
    }
    return null;
  }

  /** A pool of pale light, and — airborne — wind streaming off the underside of the body. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(TMP.sky), a * (this.mastered ? 0.3 : 0.22));
    g.fillCircle(x, y + 2, 26 + this.air * 6);
    if (this.mastered) {
      // Rain falling from the thunderhead past the body, and a gold flicker in the glow.
      g.fillStyle(this.tint(TMP.bolt), a * 0.12 * (0.5 + 0.5 * Math.sin(this.t * 11)));
      g.fillCircle(x, y - 10, 30);
      for (let i = 0; i < 7; i++) {
        const k = (this.t * 1.6 + i / 7) % 1;
        const rx = x + (jitter(11, i) - 0.5) * 50;
        const ry = y - 24 + k * 50;
        g.lineStyle(1, this.tint(TMP.gust), alpha * 0.45 * Math.sin(k * Math.PI));
        g.lineBetween(rx, ry, rx - 1.5, ry + 6);
      }
    }
    if (this.air > 0.05) {
      // Streaks peel off below and behind: the direction of travel is up when rising, and the
      // fall leans them the other way.
      const lean = this.fall * 0.9;
      for (let i = 0; i < 5; i++) {
        const k = ((this.t * 1.8 + i / 5) % 1);
        const ox = (jitter(7, i) - 0.5) * 34;
        const ang = Math.PI / 2 - lean * 0.6 + (jitter(7, i + 5) - 0.5) * 0.4;
        gustLayered(g, this.tint, x + ox, y + 12 + k * 26, ang, 28 + this.fall * 22, 4, this.air * (1 - k) * 0.8,
          { phase: this.t * 6 + i, seed: i * 3, curl: 0.3 });
      }
    }
  }

  /** The storm orb, painted the way `bakeOrb` bakes a sprite: dark rim → light core, one glint. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    g.fillStyle(this.tint(TMP.deep), alpha);
    g.fillCircle(x, y, 22);
    g.fillStyle(this.tint(TMP.slate), alpha);
    g.fillCircle(x, y, 19.5);
    g.fillStyle(this.tint(TMP.storm), alpha);
    g.fillCircle(x, y + 1, 16);
    g.fillStyle(this.tint(mix(TMP.storm, TMP.sky, 0.55)), alpha);
    g.fillCircle(x, y + 2.5, 12);
    g.fillStyle(this.tint(TMP.sky), alpha * 0.85);
    g.fillEllipse(x, y + 7, 16, 8);
    g.lineStyle(2.5, this.tint(TMP.sky), alpha * 0.55);
    g.strokeCircle(x, y, 21);
    g.lineStyle(2, this.tint(TMP.white), alpha * 0.45);
    g.beginPath();
    g.arc(x, y, 18.5, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
    g.fillStyle(this.tint(0xffffff), alpha * 0.85);
    g.fillEllipse(x - 6.5, y - 8, 8, 5);

    // A cyclone seen from above, turning slowly on the belly: three pale spiral bands.
    swirl(g, this.tint(TMP.gust), x, y + 7, 12, alpha * 0.4,
      { arms: 3, turns: 0.75, phase: -this.t * (1.2 + this.air * 2), width: 1.6, squash: 0.5, inner: 0.2 });
    // Darker storm bands across the lower body.
    g.lineStyle(1.6, this.tint(TMP.slate), alpha * 0.6);
    g.beginPath(); g.arc(x, y - 3, 19, Math.PI * 0.25, Math.PI * 0.75); g.strokePath();
    g.lineStyle(1, this.tint(TMP.deep), alpha * 0.5);
    g.beginPath(); g.arc(x, y - 8, 21, Math.PI * 0.3, Math.PI * 0.7); g.strokePath();
    // Mastered: a lightning seam crackling across the body.
    if (this.mastered) {
      const n = Math.floor(this.sparkSeed / 120);
      lightning(g, this.tint(TMP.bolt), x - 15, y + 6, x + 14, y + 12, 3, 1.2, alpha * 0.75, n);
    }
  }

  /** Little wind wisps curling round each hand. */
  private handWisps(g: Phaser.GameObjects.Graphics, alpha: number): void {
    for (let h = 0; h < 2; h++) {
      const hx = this.armX[h], hy = this.armY[h];
      const spin = this.t * (3 + this.air * 2) * (h ? 1 : -1);
      for (let i = 0; i < 2; i++) {
        const a0 = spin + i * Math.PI;
        g.lineStyle(1.2, this.tint(this.mastered ? TMP.bolt : TMP.gust), alpha * 0.65);
        g.beginPath();
        g.arc(hx, hy, 11 + i * 1.5, a0, a0 + 1.3);
        g.strokePath();
      }
    }
  }

  /**
   * The cloud ring at the crown (`y - 18`), and the Eye of the Storm when it is open. The ring
   * leans into a fall and spins faster while airborne; mastery widens it and sparks between the
   * puffs. The Eye is painted last, over everything, because it *is* the character while it lasts.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const crown = y - 19 - this.air * 3;
    const rx = (m ? 20 : 16) * (1 + this.flare * 0.12);
    const ry = (m ? 7 : 5.5) * (1 + this.fall * 0.5);
    const spin = this.t * (1.2 + this.air * 1.6 + this.eye * 2.5);
    const lean = Math.cos(this.facing) * 2 + this.fall * 2;
    const puffs = m ? 8 : 6;
    this.handWisps(g, alpha);
    if (m) {
      // Mastered only: a crown of three lightning bolts standing up out of the thunderhead.
      const n = Math.floor(this.sparkSeed / 110);
      for (let i = -1; i <= 1; i++) {
        const bx = x + lean + i * 8;
        const h = 14 - Math.abs(i) * 4 + Math.sin(this.t * 6 + i) * 1.5;
        g.fillStyle(this.tint(TMP.bolt), alpha * 0.22);
        g.fillCircle(bx, crown - h * 0.6, 5);
        lightning(g, this.tint(TMP.bolt), bx, crown - 1, bx + i * 3, crown - h, 2.2, 2, alpha, n + i * 7);
        g.fillStyle(this.tint(TMP.boltHot), alpha);
        g.fillCircle(bx + i * 3, crown - h, 1.6);
      }
    }
    for (let i = 0; i < puffs; i++) {
      const ang = spin + (i / puffs) * TAU;
      const px = x + lean + Math.cos(ang) * rx;
      const py = crown + Math.sin(ang) * ry;
      // Back of the ring is dimmer and smaller: a cheap read on depth.
      const front = (Math.sin(ang) + 1) / 2;
      const r = (m ? 4.6 : 3.8) * (0.7 + front * 0.5);
      if (m) {
        // Mastered: the ring is a thunderhead — dark puffs lit gold from underneath.
        g.fillStyle(this.tint(TMP.bolt), alpha * (0.3 + front * 0.3) * (0.7 + 0.3 * Math.sin(this.t * 7 + i)));
        g.fillCircle(px, py + r * 0.35, r * 1.15);
        g.fillStyle(this.tint(TMP.slate), alpha * (0.6 + front * 0.35));
        g.fillCircle(px, py, r);
        g.fillStyle(this.tint(TMP.storm), alpha * (0.5 + front * 0.4));
        g.fillCircle(px - r * 0.3, py - r * 0.35, r * 0.6);
      } else {
        g.fillStyle(this.tint(TMP.gust), alpha * (0.45 + front * 0.4));
        g.fillCircle(px, py, r);
        g.fillStyle(this.tint(TMP.white), alpha * (0.5 + front * 0.45));
        g.fillCircle(px - r * 0.3, py - r * 0.3, r * 0.6);
      }
    }
    if (m) {
      // Mastered: the ring sparks. One short bolt between two puffs, re-rolled every few frames.
      const n = Math.floor(this.sparkSeed / 90);
      const i = n % puffs;
      const a0 = spin + (i / puffs) * TAU;
      const a1 = spin + ((i + 1) / puffs) * TAU;
      lightning(g, this.tint(TMP.bolt), x + lean + Math.cos(a0) * rx, crown + Math.sin(a0) * ry,
        x + lean + Math.cos(a1) * rx, crown + Math.sin(a1) * ry, 3, 1.3, alpha * 0.85, n);
    }

    if (this.eye > 0.02) this.drawEye(g, x, y, alpha);
  }

  /** The Eye of the Storm: sclera, electric iris, pupil on the aim, bolts crackling off the rim. */
  private drawEye(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const k = easeOut(this.eye);
    const R = 21 * k;
    const look = this.facing;
    g.fillStyle(this.tint(TMP.ink), alpha * 0.9 * k);
    g.fillCircle(x, y, R + 2);
    g.fillStyle(this.tint(TMP.white), alpha * k);
    g.fillEllipse(x, y, R * 2, R * 1.7);
    // Veins: four short bolts from the rim in toward the iris.
    const n = Math.floor(this.sparkSeed / 70);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.6;
      lightning(g, this.tint(TMP.irisDeep), x + Math.cos(a) * R, y + Math.sin(a) * R * 0.85,
        x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.5, 2.5, 1.1, alpha * k * 0.7, n + i);
    }
    const ix = x + Math.cos(look) * 4.5 * k;
    const iy = y + Math.sin(look) * 3.5 * k;
    g.fillStyle(this.tint(TMP.irisDeep), alpha * k);
    g.fillCircle(ix, iy, 11.5 * k);
    g.fillStyle(this.tint(TMP.iris), alpha * k);
    g.fillCircle(ix, iy, 9.5 * k);
    // Spokes in the iris, turning: the storm seen from above.
    g.lineStyle(1.2, this.tint(TMP.white), alpha * k * 0.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + this.t * 2.2;
      g.lineBetween(ix + Math.cos(a) * 4 * k, iy + Math.sin(a) * 4 * k, ix + Math.cos(a) * 9 * k, iy + Math.sin(a) * 9 * k);
    }
    g.fillStyle(this.tint(TMP.pupil), alpha * k);
    g.fillCircle(ix + Math.cos(look) * 1.5, iy + Math.sin(look) * 1.2, 4.6 * k);
    g.fillStyle(this.tint(0xffffff), alpha * k * 0.9);
    g.fillCircle(ix - 3.5 * k, iy - 3.5 * k, 1.8 * k);
    // Bolts off the rim, two or three at a time, re-rolled to crackle.
    for (let i = 0; i < 3; i++) {
      const a = ((n + i * 5) % 12) / 12 * TAU;
      const len = 12 + jitter(n, i) * 14;
      lightning(g, this.tint(TMP.bolt), x + Math.cos(a) * R, y + Math.sin(a) * R * 0.85,
        x + Math.cos(a) * (R + len), y + Math.sin(a) * (R * 0.85 + len), 5, 1.6, alpha * k * 0.9, n * 3 + i);
    }
  }
}

/** The floor shadow of a lifted body: smaller and fainter the higher it is, with the chevron ladder counting the gap. */
export function liftShadow(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, lift: number, alpha: number,
): void {
  const k = Math.min(1, lift / 220);
  g.fillStyle(tint(TMP.shadow), alpha * (0.42 - k * 0.22));
  g.fillEllipse(x, y + 15, 40 - k * 18, 14 - k * 7);
  const rungs = Math.max(0, Math.floor(lift / 16));
  for (let i = 1; i <= rungs; i++) {
    const yy = y + 15 - (lift * i) / (rungs + 1);
    const w = 5 - (i / (rungs + 1)) * 2.5;
    chevron(g, tint(TMP.gust), x, yy, w, 2, alpha * 0.35, 1.2);
  }
}

/**
 * The fall-speed gauge beside a flying body, drawn as a little barometer: a glass tube in a
 * storm-slate casing with cloud-puff caps, height ticks filling from the bottom like a rising
 * column, and an arrow with a wind tail that reddens and stretches with speed.
 */
export function fallGauge(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, speedK: number, heightK: number, alpha: number,
): void {
  const H = 56;
  const top = y - H / 2;
  const t = performance.now() / 1000;
  // Casing.
  g.fillStyle(tint(TMP.ink), alpha * 0.75);
  g.fillRoundedRect(x - 6.5, top - 4, 13, H + 8, 6.5);
  g.fillStyle(tint(TMP.deep), alpha * 0.9);
  g.fillRoundedRect(x - 5, top - 2.5, 10, H + 5, 5);
  // The glass, with the height column rising in it.
  g.fillStyle(tint(TMP.slate), alpha * 0.8);
  g.fillRoundedRect(x - 2.6, top, 5.2, H, 2.6);
  const colH = H * Phaser.Math.Clamp(heightK, 0, 1);
  if (colH > 1) {
    g.fillStyle(tint(TMP.sky), alpha * 0.85);
    g.fillRoundedRect(x - 2.6, top + H - colH, 5.2, colH, 2.6);
    g.fillStyle(tint(TMP.white), alpha * 0.6);
    g.fillRect(x - 1.6, top + H - colH + 1, 1, Math.max(0, colH - 2));
  }
  // Height ticks along the casing, lit as the column passes them.
  const ticks = 6;
  for (let i = 0; i < ticks; i++) {
    const lit = heightK * ticks > i;
    const yy = top + H - (i / (ticks - 1)) * H;
    g.lineStyle(1.6, tint(lit ? TMP.white : TMP.slate), alpha * (lit ? 0.95 : 0.55));
    g.lineBetween(x - 8, yy, x - 5, yy);
  }
  // Cloud-puff caps top and bottom.
  for (const [cy, k] of [[top - 4, 1], [top + H + 4, 0.85]] as [number, number][]) {
    g.fillStyle(tint(TMP.gust), alpha * 0.85);
    g.fillCircle(x - 3.5 * k, cy, 3.2 * k);
    g.fillCircle(x + 3.5 * k, cy, 3.2 * k);
    g.fillCircle(x, cy - 1.6 * k, 4 * k);
    g.fillStyle(tint(TMP.white), alpha * 0.8);
    g.fillCircle(x - 1, cy - 2.4 * k, 1.8 * k);
  }
  // The arrow: pale when hovering, blood red at terminal velocity, longer the faster you fall,
  // trailing a wind tail above it.
  const c = mix(TMP.white, TMP.red, speedK);
  const ax = x + 12;
  const ay = top + H * (0.25 + speedK * 0.5);
  const len = 10 + speedK * 16;
  for (let i = 0; i < 3; i++) {
    const wob = Math.sin(t * 9 + i * 2) * 1.5;
    g.lineStyle(1, tint(TMP.gust), alpha * (0.25 + speedK * 0.35) * (1 - i * 0.25));
    g.lineBetween(ax - 3 + i * 3 + wob, ay - len - 6 - i * 3, ax - 3 + i * 3, ay - len + 4);
  }
  g.lineStyle(5, tint(TMP.ink), alpha * 0.55);
  g.lineBetween(ax, ay - len, ax, ay + len);
  g.lineStyle(3.2, tint(c), alpha * (0.75 + speedK * 0.25));
  g.lineBetween(ax, ay - len, ax, ay + len);
  g.fillStyle(tint(c), alpha * (0.8 + speedK * 0.2));
  g.fillTriangle(ax - 6 - speedK * 3, ay + len - 7, ax + 6 + speedK * 3, ay + len - 7, ax, ay + len + 2);
  if (speedK > 0.6) {
    g.fillStyle(tint(TMP.red), alpha * (speedK - 0.6) * 1.2);
    g.fillCircle(ax, ay + len, 5 + Math.sin(t * 20) * 1);
  }
}

/** A charge pip shaped as a lightning bolt — lit or spent. For counters that ride over a body. */
export function boltPip(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, lit: boolean, alpha: number,
): void {
  const pts = [
    new Phaser.Geom.Point(x + 1.5, y - 6), new Phaser.Geom.Point(x - 3, y + 0.8),
    new Phaser.Geom.Point(x - 0.2, y + 0.8), new Phaser.Geom.Point(x - 1.5, y + 6),
    new Phaser.Geom.Point(x + 3, y - 0.8), new Phaser.Geom.Point(x + 0.2, y - 0.8),
  ];
  if (lit) {
    g.fillStyle(tint(TMP.bolt), alpha * 0.3);
    g.fillCircle(x, y, 6.5);
  }
  g.fillStyle(tint(TMP.ink), alpha * 0.85);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + (p.x - x) * 0.35, p.y + (p.y - y) * 0.2)), true);
  g.fillStyle(tint(lit ? TMP.bolt : TMP.slate), alpha);
  g.fillPoints(pts, true);
  if (lit) {
    g.fillStyle(tint(TMP.boltHot), alpha * 0.9);
    g.fillCircle(x + 0.6, y - 2.4, 0.9);
  }
}
