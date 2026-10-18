import Phaser from 'phaser';
import {
  ArmGesture, ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut,
} from './ElementVisuals';

/**
 * Everything Myth draws.
 *
 * One material: **the void with stars in it**. Every solid thing in this kit — the body, the
 * star mace on the whip, the beast, the phantom maces, the rocket's cloud — is a disc of black
 * with pinpricks of starlight inside it and a thin violet rim, as if a hole had been cut in the
 * arena and the night was showing through. The one thing that is not void is Excalibur: a dark
 * blade with a living eye for a hilt, carried behind the back and only drawn for Truth Breaker.
 * The crowd that rings the arena is painted in flat plum silhouettes so it never competes with
 * the fight; the Echo Shards it throws are the only cyan in the palette, so a shard reads from
 * across the screen.
 *
 * Final Destiny's guns are drawn here too, but in *screen* space — `MythView` paints them at the
 * bottom of the first-person frame.
 */

export type MythColorFn = ColorFn;

export const MYTH = {
  /** The void. */
  void: 0x05030c,
  deep: 0x110a22,
  dusk: 0x1f1540,
  /** The rim of every void disc, and the element's colour family. */
  violet: 0x3b2a6b,
  iris: 0x7d5cff,
  haze: 0xb39dff,
  /** Starlight. */
  star: 0xfff6d5,
  starBlue: 0xa9c7ff,
  white: 0xffffff,
  /** Excalibur. */
  blade: 0x120c20,
  bladeEdge: 0x8e7cc3,
  gold: 0xffd166,
  eye: 0xffc83d,
  pupil: 0x1a0608,
  red: 0xff4a5e,
  /** The star mace and the phantom maces. */
  mace: 0xf3e9ff,
  /** Echo Shards — the only cyan in the kit. */
  shard: 0x8ff0ff,
  shardDeep: 0x2fa6c8,
  /** The crowd. */
  crowdDark: 0x241c3a,
  crowdLit: 0x5d4d8f,
  crowdHot: 0xd9b8ff,
  /** The rocket's cloud. */
  cloud: 0x241a3a,
  /** Final Destiny gun metal. */
  gunDark: 0x1a1424,
  gunMid: 0x33294a,
  gunLight: 0x6b5a95,
};

/** Deterministic 0–1 noise, so a pinprick keeps its place between frames. */
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

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── Primitives ────────────────────────────────────────────────────────────

/** A spiky star: `points` tips, inner radius a fraction of `r`. */
export function star(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number,
  { points = 4, rot = 0, inner = 0.42 }: { points?: number; rot?: number; inner?: number } = {},
): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * TAU;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(color, alpha);
  g.fillPoints(pts, true);
}

/** `n` pinpricks of starlight scattered inside a circle. `phase` makes them twinkle. */
export function pinpricks(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, seed: number, n: number,
  phase = 0, alpha = 1,
): void {
  for (let i = 0; i < n; i++) {
    const a = jitter(seed, i * 3) * TAU;
    const d = Math.sqrt(jitter(seed, i * 3 + 1)) * r * 0.86;
    const tw = 0.55 + 0.45 * Math.sin(phase * (1.5 + jitter(seed, i * 3 + 2)) + i * 1.7);
    const big = jitter(seed, i * 5) > 0.82;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    g.fillStyle(tint(big ? MYTH.starBlue : MYTH.star), alpha * tw);
    if (big) star(g, px, py, 2.4, tint(MYTH.star), alpha * tw, { points: 4 });
    else g.fillCircle(px, py, 0.9);
  }
}

/** A hole cut in the arena: black disc, violet rim, stars inside. */
export function voidDisc(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, alpha: number, seed: number,
  phase = 0, stars = -1,
): void {
  g.fillStyle(tint(MYTH.iris), alpha * 0.22);
  g.fillCircle(x, y, r * 1.22);
  g.fillStyle(tint(MYTH.violet), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillCircle(x, y, r * 0.84);
  pinpricks(g, tint, x, y, r * 0.84, seed, stars < 0 ? Math.max(3, Math.round(r / 2.2)) : stars, phase, alpha);
}

/**
 * Excalibur. A dark tapered blade from the hilt at `(x, y)` along `ang` for `len`, a short
 * crossguard, and the hilt itself: an eye, `open` 0–1 (a closed eye is a lid line).
 */
export function excalibur(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, ang: number, len: number, alpha: number,
  open: number, { width = 7, glow = 0 }: { width?: number; glow?: number } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pt = (u: number, v: number): Phaser.Geom.Point => P(x + ca * u - sa * v, y + sa * u + ca * v);
  // Blade: a long spearhead, fuller down the middle.
  const hw = width / 2;
  const blade = [pt(10, -hw), pt(len * 0.86, -hw * 0.75), pt(len, 0), pt(len * 0.86, hw * 0.75), pt(10, hw)];
  if (glow > 0) {
    g.fillStyle(tint(MYTH.gold), alpha * 0.35 * glow);
    g.fillPoints([pt(8, -hw * 2.2), pt(len * 0.9, -hw * 1.6), pt(len + 6, 0), pt(len * 0.9, hw * 1.6), pt(8, hw * 2.2)], true);
  }
  g.fillStyle(tint(MYTH.blade), alpha);
  g.fillPoints(blade, true);
  g.lineStyle(1.1, tint(MYTH.bladeEdge), alpha * 0.9);
  g.strokePoints(blade, true, true);
  g.lineStyle(1, tint(MYTH.bladeEdge), alpha * 0.45);
  const f0 = pt(14, 0);
  const f1 = pt(len * 0.8, 0);
  g.lineBetween(f0.x, f0.y, f1.x, f1.y);
  // Crossguard: two short curled tines.
  g.lineStyle(2.4, tint(MYTH.gold), alpha);
  const g0 = pt(10, -hw * 1.9);
  const g1 = pt(10, hw * 1.9);
  g.lineBetween(g0.x, g0.y, g1.x, g1.y);
  // The hilt is an eye.
  const ex = x - ca * 2;
  const ey = y - sa * 2;
  g.fillStyle(tint(MYTH.blade), alpha);
  g.fillEllipse(ex, ey, 11, 8);
  g.lineStyle(1, tint(MYTH.gold), alpha * 0.85);
  g.strokeEllipse(ex, ey, 11, 8);
  const o = Phaser.Math.Clamp(open, 0, 1);
  if (o > 0.08) {
    g.fillStyle(tint(MYTH.star), alpha * 0.95);
    g.fillEllipse(ex, ey, 9, 5.5 * o);
    g.fillStyle(tint(MYTH.eye), alpha);
    g.fillCircle(ex, ey, 2.4 * Math.max(0.6, o));
    g.fillStyle(tint(MYTH.pupil), alpha);
    g.fillCircle(ex, ey, 1.1);
  } else {
    g.lineStyle(1.2, tint(MYTH.gold), alpha * 0.8);
    g.lineBetween(ex - 4, ey, ex + 4, ey);
  }
  // Pommel: a single pinprick star.
  const pm = pt(-7, 0);
  star(g, pm.x, pm.y, 2.6, tint(MYTH.star), alpha, { points: 4, rot: ang });
}

/**
 * The whip: a tapered rope from `(x0, y0)` toward `(x1, y1)`, waving along its length with a
 * crack that travels tip-ward as `t` runs 0→1, ending in the star mace. Three passes.
 */
export function whip(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x0: number, y0: number, x1: number, y1: number, t: number,
  seed: number, alpha = 1,
): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const N = 16;
  const reach = Phaser.Math.Clamp(t < 0.5 ? t * 2 : 1, 0, 1);
  const crack = t < 0.5 ? 0 : (t - 0.5) * 2;
  const top: Phaser.Geom.Point[] = [];
  const bot: Phaser.Geom.Point[] = [];
  const spine: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    // The lash: a wave that lives near the handle while it reaches and snaps straight at the tip.
    const wave = Math.sin(u * Math.PI * 2.2 - t * 9 + seed) * (1 - u) * 14 * (1 - crack * 0.8) * reach;
    const w = (6.5 - u * 5) * 0.5;
    const ux = u * len * reach;
    const px = x0 + ca * ux - sa * wave;
    const py = y0 + sa * ux + ca * wave;
    spine.push(P(px, py));
    top.push(P(px - sa * -w, py + ca * -w));
    bot.push(P(px - sa * w, py + ca * w));
  }
  g.fillStyle(tint(MYTH.haze), alpha * 0.3);
  g.fillPoints([...top.map((p, i) => P(p.x * 1 + (p.x - spine[i].x) * 1.6, p.y + (p.y - spine[i].y) * 1.6)), ...bot.map((p, i) => P(p.x + (p.x - spine[i].x) * 1.6, p.y + (p.y - spine[i].y) * 1.6)).reverse()], true);
  g.fillStyle(tint(MYTH.iris), alpha * 0.95);
  g.fillPoints([...top, ...bot.reverse()], true);
  g.lineStyle(1, tint(MYTH.star), alpha * 0.7);
  g.strokePoints(spine, false, false);
  // The star mace at the tip.
  const tip = spine[spine.length - 1];
  const mr = 8 + crack * 3;
  starMace(g, tint, tip.x, tip.y, mr, alpha, seed, t * 12, crack);
}

/** The whip's tip, and the phantoms it leaves: a void disc with four spikes and a hot star inside. */
export function starMace(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, alpha: number, seed: number,
  rot = 0, hot = 0,
): void {
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * TAU;
    const p0 = P(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
    const p1 = P(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75);
    const p2 = P(x + Math.cos(a + 0.28) * r * 0.7, y + Math.sin(a + 0.28) * r * 0.7);
    g.fillStyle(tint(MYTH.mace), alpha * 0.9);
    g.fillPoints([p0, p1, p2], true);
  }
  voidDisc(g, tint, x, y, r, alpha, seed, rot, 4);
  star(g, x, y, r * (0.5 + hot * 0.35), tint(hot > 0.5 ? MYTH.gold : MYTH.star), alpha, { points: 4, rot: -rot * 0.7 });
}

/** A crescent sweep across `ang ± half`, radius `r`, bright at `t` 0 and fading out. */
export function slashArc(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, ang: number, r: number, half: number,
  t: number, { color = MYTH.star, core = MYTH.gold }: { color?: number; core?: number } = {},
): void {
  const N = 16;
  const a0 = ang - half;
  const sweep = half * 2 * Math.min(1, t * 2.6);
  const outer: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const a = a0 + sweep * k;
    const fade = 1 - Math.abs(k - Math.min(1, t * 2.6)) * 0.6;
    const ro = r * (0.92 + 0.08 * Math.sin(k * Math.PI)) * fade;
    const ri = r * 0.5 * (1 + 0.2 * (1 - t));
    outer.push(P(x + Math.cos(a) * ro, y + Math.sin(a) * ro));
    inner.push(P(x + Math.cos(a) * ri, y + Math.sin(a) * ri));
  }
  const a = (1 - t) * 0.95;
  g.fillStyle(tint(color), a * 0.75);
  g.fillPoints([...outer, ...inner.slice().reverse()], true);
  g.lineStyle(2.2 * (1 - t * 0.5), tint(core), a);
  g.strokePoints(outer, false, false);
}

/** The portal the beast pours out of: an upright ring facing `ang`, swirling stars inside. */
export function portal(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, ang: number, open: number, phase: number,
  seed: number, alpha = 1,
): void {
  // The ring is perpendicular to the beast's path, so it reads as a doorway it came through.
  const w = 20 * open;
  const h = 58 * open;
  const rot = ang + Math.PI / 2;
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  const ring = (rx: number, ry: number): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const u = Math.cos(a) * rx;
      const v = Math.sin(a) * ry;
      pts.push(P(x + ca * u - sa * v, y + sa * u + ca * v));
    }
    return pts;
  };
  g.fillStyle(tint(MYTH.iris), alpha * 0.25);
  g.fillPoints(ring(h * 1.25, w * 1.6), true);
  g.fillStyle(tint(MYTH.violet), alpha);
  g.fillPoints(ring(h, w), true);
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillPoints(ring(h * 0.84, w * 0.78), true);
  // A swirl of stars being pulled through.
  for (let i = 0; i < 9; i++) {
    const a = phase * 2.2 + (i / 9) * TAU;
    const rr = (0.2 + 0.6 * jitter(seed, i)) * h * 0.78;
    const u = Math.cos(a) * rr * 0.3;
    const v = Math.sin(a) * rr;
    g.fillStyle(tint(i % 3 === 0 ? MYTH.starBlue : MYTH.star), alpha * (0.5 + 0.5 * Math.sin(phase * 3 + i)));
    g.fillCircle(x + ca * u - sa * v, y + sa * u + ca * v, i % 3 === 0 ? 1.6 : 1);
  }
  g.lineStyle(1.4, tint(MYTH.haze), alpha * 0.75);
  g.strokePoints(ring(h, w), true, true);
}

/**
 * The beast: a serpent of void drawn from a trail of points, tail first. `pts[0]` is the head.
 * The head is a bigger disc with two gold star eyes and an open maw full of pale teeth; the
 * body carries a ridge of spines.
 */
export function beast(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, pts: { x: number; y: number }[], headAng: number, phase: number,
  alpha: number, seed: number, headR = 30,
): void {
  if (pts.length === 0) return;
  // Haze under the whole body.
  for (let i = pts.length - 1; i >= 1; i--) {
    const k = 1 - i / pts.length;
    const r = headR * (0.35 + 0.55 * k);
    g.fillStyle(tint(MYTH.iris), alpha * 0.12);
    g.fillCircle(pts[i].x, pts[i].y, r * 1.5);
  }
  for (let i = pts.length - 1; i >= 1; i--) {
    const k = 1 - i / pts.length;
    const r = headR * (0.35 + 0.55 * k);
    voidDisc(g, tint, pts[i].x, pts[i].y, r, alpha, seed + i, phase, 3);
    // A spine every other segment, standing off the back (perpendicular to travel).
    if (i % 2 === 0 && i < pts.length - 1) {
      const a = Math.atan2(pts[i - 1].y - pts[i].y, pts[i - 1].x - pts[i].x) - Math.PI / 2;
      const b = P(pts[i].x + Math.cos(a) * r * 0.8, pts[i].y + Math.sin(a) * r * 0.8);
      const tp = P(pts[i].x + Math.cos(a) * r * 1.6, pts[i].y + Math.sin(a) * r * 1.6);
      const b2 = P(pts[i].x + Math.cos(a + 0.5) * r * 0.75, pts[i].y + Math.sin(a + 0.5) * r * 0.75);
      g.fillStyle(tint(MYTH.haze), alpha * 0.85);
      g.fillPoints([b, tp, b2], true);
    }
  }
  // The head.
  const h = pts[0];
  const ca = Math.cos(headAng);
  const sa = Math.sin(headAng);
  const pt = (u: number, v: number): Phaser.Geom.Point => P(h.x + ca * u - sa * v, h.y + sa * u + ca * v);
  voidDisc(g, tint, h.x, h.y, headR, alpha, seed, phase, 6);
  // Horns swept back.
  for (const side of [-1, 1]) {
    g.fillStyle(tint(MYTH.haze), alpha * 0.9);
    g.fillPoints([pt(-headR * 0.3, side * headR * 0.7), pt(-headR * 1.35, side * headR * 1.05), pt(-headR * 0.55, side * headR * 0.45)], true);
  }
  // The maw: a dark wedge opening and closing with the phase, lined with teeth.
  const gape = 0.35 + 0.25 * Math.sin(phase * 4);
  const jaw = [pt(headR * 0.2, 0), pt(headR * 1.25, -headR * gape), pt(headR * 1.25, headR * gape)];
  g.fillStyle(tint(MYTH.red), alpha * 0.55);
  g.fillPoints(jaw, true);
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillPoints([pt(headR * 0.3, 0), pt(headR * 1.1, -headR * gape * 0.7), pt(headR * 1.1, headR * gape * 0.7)], true);
  g.fillStyle(tint(MYTH.mace), alpha);
  for (let i = 0; i < 4; i++) {
    const u = headR * (0.45 + i * 0.18);
    for (const side of [-1, 1]) {
      const v = side * headR * gape * (0.35 + i * 0.16);
      g.fillPoints([pt(u - 2.5, v), pt(u + 2.5, v), pt(u, v - side * 5)], true);
    }
  }
  // Two gold star eyes.
  for (const side of [-1, 1]) {
    const e = pt(headR * 0.15, side * headR * 0.5);
    star(g, e.x, e.y, 4.2, tint(MYTH.gold), alpha, { points: 4, rot: phase });
    g.fillStyle(tint(MYTH.pupil), alpha);
    g.fillCircle(e.x, e.y, 1.3);
  }
}

/** An Echo Shard: a spinning cyan crystal with a facet line and a glint. `phase` spins it. */
export function shard(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, size: number, phase: number, alpha = 1,
): void {
  const sx = Math.max(0.18, Math.abs(Math.cos(phase)));
  const pulse = 0.5 + 0.5 * Math.sin(phase * 1.7);
  const pts = [P(x, y - size), P(x + size * 0.62 * sx, y - size * 0.15), P(x + size * 0.3 * sx, y + size * 0.6), P(x, y + size), P(x - size * 0.3 * sx, y + size * 0.6), P(x - size * 0.62 * sx, y - size * 0.15)];
  // Two-step halo, breathing.
  g.fillStyle(tint(MYTH.shard), alpha * (0.18 + pulse * 0.12));
  g.fillCircle(x, y, size * 1.7);
  g.fillStyle(tint(MYTH.shard), alpha * 0.3);
  g.fillCircle(x, y, size * 1.15);
  g.fillStyle(tint(MYTH.void), alpha * 0.8);
  g.fillPoints(pts.map((p) => P(x + (p.x - x) * 1.18, y + (p.y - y) * 1.12)), true);
  g.fillStyle(tint(MYTH.shardDeep), alpha);
  g.fillPoints(pts, true);
  // Lit facets: the upper-left planes catch the light.
  g.fillStyle(tint(MYTH.shard), alpha * 0.92);
  g.fillPoints([pts[0], pts[1], P(x, y + size * 0.1), pts[5]], true);
  g.fillStyle(tint(MYTH.white), alpha * (0.35 + pulse * 0.3));
  g.fillPoints([pts[0], P(x, y + size * 0.1), pts[5]], true);
  g.lineStyle(1, tint(MYTH.white), alpha * 0.8);
  g.lineBetween(x, y - size, x, y + size);
  g.lineStyle(0.8, tint(MYTH.white), alpha * 0.45);
  g.lineBetween(pts[5].x, pts[5].y, pts[1].x, pts[1].y);
  star(g, x - size * 0.25 * sx, y - size * 0.45, size * (0.3 + pulse * 0.15), tint(MYTH.white), alpha, { points: 4 });
}

/**
 * One spectator: a flat plum silhouette — head, shoulders, two arms. `bounce` lifts the whole
 * figure (0 = seated, 1 = full jump); `armsUp` 0–1 raises the arms from the lap to the sky.
 */
export function crowdFigure(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, color: number, lit: number, bounce: number,
  armsUp: number, alpha = 1,
): void {
  const yy = y - bounce * s * 1.4;
  const c = mix(color, MYTH.crowdHot, lit * 0.8);
  g.fillStyle(c, alpha);
  // Shoulders: a rounded wedge.
  g.fillPoints([P(x - s * 0.95, yy + s * 0.9), P(x - s * 0.7, yy + s * 0.05), P(x + s * 0.7, yy + s * 0.05), P(x + s * 0.95, yy + s * 0.9)], true);
  g.fillCircle(x, yy - s * 0.45, s * 0.42);
  // Arms: from the shoulder, down at rest and straight up when cheering.
  g.lineStyle(Math.max(1, s * 0.22), c, alpha);
  for (const side of [-1, 1]) {
    const ax = x + side * s * 0.6;
    const ay = yy + s * 0.2;
    const a = Math.PI / 2 * (1 - armsUp) + (-Math.PI / 2) * armsUp + side * 0.35 * armsUp;
    g.lineBetween(ax, ay, ax + Math.cos(a) * s * 0.8 + side * s * 0.25 * (1 - armsUp), ay + Math.sin(a) * s * 0.8);
  }
}

/** A speech bubble with its tail pointing at `(tx, ty)`. */
export function bubble(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, tx: number, ty: number, fill: number,
  stroke: number, alpha: number,
): void {
  const r = 8;
  g.fillStyle(0x000000, alpha * 0.35);
  g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, r);
  g.fillStyle(fill, alpha * 0.94);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.fillStyle(0xffffff, alpha * 0.06);
  g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 2, w - 6, Math.min(8, h * 0.35), { tl: r - 2, tr: r - 2, bl: 2, br: 2 });
  // The tail: a wedge from the nearest edge down to the speaker.
  const bx = Phaser.Math.Clamp(tx, x - w / 2 + 16, x + w / 2 - 16);
  const by = ty < y ? y - h / 2 : y + h / 2;
  g.fillPoints([P(bx - 7, by), P(bx + 7, by), P(tx, ty)], true);
  g.lineStyle(1.5, stroke, alpha);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.lineBetween(bx - 7, by, tx, ty);
  g.lineBetween(bx + 7, by, tx, ty);
}

/** The rocket's lingering cloud: a cluster of void puffs, twinkling. */
export function cloud(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, phase: number, seed: number,
  alpha: number,
): void {
  for (let i = 0; i < 7; i++) {
    const a = jitter(seed, i) * TAU + phase * 0.3 * (i % 2 ? 1 : -1);
    const d = r * (0.15 + 0.5 * jitter(seed, i + 9));
    const rr = r * (0.38 + 0.22 * jitter(seed, i + 20)) * (1 + 0.06 * Math.sin(phase * 2 + i));
    g.fillStyle(tint(MYTH.cloud), alpha * 0.8);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, rr);
  }
  pinpricks(g, tint, x, y, r * 0.8, seed, 9, phase, alpha);
  g.lineStyle(1, tint(MYTH.iris), alpha * 0.45);
  g.strokeCircle(x, y, r);
}

/** A crosshair for the first-person frame: four ticks that spread with `spread`. */
export function crosshair(g: Phaser.GameObjects.Graphics, x: number, y: number, spread: number, color: number): void {
  const gap = 5 + spread;
  g.lineStyle(2, color, 0.95);
  g.lineBetween(x - gap - 8, y, x - gap, y);
  g.lineBetween(x + gap, y, x + gap + 8, y);
  g.lineBetween(x, y - gap - 8, x, y - gap);
  g.lineBetween(x, y + gap, x, y + gap + 8);
  g.fillStyle(color, 0.9);
  g.fillCircle(x, y, 1.4);
}

// ── Q+ Slayer cues ───────────────────────────────────────────────────────────

/**
 * A spent grenade lying where it burst, still live for Slayer's second blast: a cracked black
 * casing glowing red through the seams, an ember ring pulsing round it and smoke curling up.
 * `(x, y)` is where it touches the floor; `s` scales it (the first-person billboard shrinks it).
 */
export function spentGrenade(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, phase: number, alpha: number, seed: number, s = 1,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(phase * 7 + seed);
  g.lineStyle(Math.max(1, 2 * s), tint(MYTH.red), alpha * (0.35 + 0.4 * pulse));
  g.strokeEllipse(x, y, 34 * s * (1 + pulse * 0.25), 12 * s * (1 + pulse * 0.25));
  g.fillStyle(tint(MYTH.red), alpha * 0.18 * (0.6 + pulse));
  g.fillEllipse(x, y, 26 * s, 9 * s);
  // Smoke: three puffs rising and thinning out.
  for (let i = 0; i < 3; i++) {
    const k = (phase * 0.7 + i / 3 + jitter(seed, i)) % 1;
    g.fillStyle(tint(MYTH.haze), alpha * 0.32 * (1 - k));
    g.fillCircle(x + Math.sin(phase * 2 + i * 2.1) * 5 * s * k, y - 6 * s - k * 30 * s, (3 + k * 6) * s);
  }
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillCircle(x, y - 4 * s, 6 * s);
  g.lineStyle(Math.max(1, 1.4 * s), tint(MYTH.red), alpha * (0.6 + 0.4 * pulse));
  for (let i = 0; i < 3; i++) {
    const a = jitter(seed, i + 5) * TAU;
    g.lineBetween(x, y - 4 * s, x + Math.cos(a) * 6 * s, y - 4 * s + Math.sin(a) * 6 * s);
  }
  g.fillStyle(tint(MYTH.gold), alpha * pulse);
  g.fillCircle(x, y - 4 * s, 1.6 * s);
}

/** The second blast as a standing fireball (first person): red, gold-cored, void heart, star shrapnel. `t` 0–1. */
export function redBlast(g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, t: number): void {
  const k = easeOut(Math.min(1, t * 1.4));
  const a = 1 - t;
  g.fillStyle(tint(MYTH.red), a * 0.5);
  g.fillCircle(x, y, r * (0.45 + 0.55 * k));
  g.fillStyle(tint(MYTH.gold), a * 0.75 * (1 - k * 0.6));
  g.fillCircle(x, y, r * 0.55 * (0.4 + 0.6 * k));
  g.fillStyle(tint(MYTH.white), Math.max(0, 1 - t * 3));
  g.fillCircle(x, y, r * 0.3);
  g.fillStyle(tint(MYTH.void), a * 0.7);
  g.fillCircle(x, y, r * 0.28 * k);
  g.lineStyle(Math.max(1.5, r * 0.06), tint(MYTH.red), a);
  g.strokeCircle(x, y, r * (0.5 + 0.7 * k));
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * TAU + 0.3;
    const d = r * (0.3 + 0.95 * k);
    star(g, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.8, Math.max(2, r * 0.1 * a), tint(i % 2 ? MYTH.gold : MYTH.red), a, { points: 4, rot: ang + t * 4 });
  }
}

/** The gun butt connecting: a white starburst with hard gold crack lines. `t` 0–1. */
export function buttImpact(g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, t: number): void {
  const k = easeOut(t);
  const a = 1 - t;
  g.fillStyle(tint(MYTH.white), a * 0.85);
  star(g, x, y, r * (0.5 + 0.6 * k), tint(MYTH.white), a, { points: 8, inner: 0.3, rot: 0.2 });
  g.lineStyle(Math.max(1.5, r * 0.08), tint(MYTH.gold), a);
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU + 0.4;
    g.lineBetween(x + Math.cos(ang) * r * 0.4 * k, y + Math.sin(ang) * r * 0.4 * k, x + Math.cos(ang) * r * (0.7 + 0.8 * k), y + Math.sin(ang) * r * (0.7 + 0.8 * k));
  }
  g.lineStyle(Math.max(1, r * 0.05), tint(MYTH.white), a * 0.8);
  g.strokeCircle(x, y, r * (0.4 + 1.1 * k));
}

/** Stunned: gold stars wheeling round a point above the head. */
export function stunCrown(g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, r: number, phase: number, alpha: number): void {
  g.lineStyle(Math.max(1, r * 0.08), tint(MYTH.gold), alpha * 0.35);
  g.strokeEllipse(x, y, r * 2, r * 0.7);
  for (let i = 0; i < 4; i++) {
    const ang = phase * 5 + (i / 4) * TAU;
    const front = Math.sin(ang) > 0;
    star(g, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.35, Math.max(2, r * (front ? 0.32 : 0.22)), tint(MYTH.gold), alpha * (front ? 1 : 0.6), { points: 5, rot: phase * 3 + i });
  }
}

// ── Final Destiny — the five guns, in screen space ───────────────────────────
//
// Each is drawn in a local frame where (0, 0) is the grip and the barrel runs up and to the
// left toward the centre of the screen. `recoil` 0–1 kicks it back and up. The muzzle point is
// returned so the view can put the flash on it.

export type GunKind = 'pistol' | 'shotgun' | 'launcher' | 'rifle' | 'rocket';

function gunFrame(x: number, y: number, recoil: number, scale: number, twist: number): (u: number, v: number) => Phaser.Geom.Point {
  // Barrel axis: toward the upper-left. Recoil pulls along the axis and rotates up a touch;
  // `twist` swings the whole gun (Slayer's butt slam).
  const ang = -2.42 + recoil * 0.12 + twist;
  const kick = recoil * 14 * scale;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const ox = x - ca * kick;
  const oy = y - sa * kick + recoil * 6 * scale;
  // +v is the gun's underside (grip, magazine, pump): the barrel axis turned a quarter clockwise
  // on screen, so it falls toward the bottom of the frame.
  return (u, v) => P(ox + (ca * u + sa * v) * scale, oy + (sa * u - ca * v) * scale);
}

/** The edge width every plate is stroked at; `gun` sets it from its scale. */
let plateEdge = 1.2;

function plate(g: Phaser.GameObjects.Graphics, pts: Phaser.Geom.Point[], fill: number, edge: number): void {
  g.fillStyle(fill, 1);
  g.fillPoints(pts, true);
  g.lineStyle(plateEdge, edge, 0.95);
  g.strokePoints(pts, true, true);
}

/**
 * A Final Destiny gun at `(x, y)` (the grip). `scale` blows the whole model up — the first-person
 * frame draws it large so it reads against the dark floor; the codex previews draw it at 1.
 */
export function gun(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, kind: GunKind, x: number, y: number, recoil: number, phase: number,
  scale = 1, twist = 0,
): { x: number; y: number } {
  const f = gunFrame(x, y, recoil, scale, twist);
  const dark = tint(MYTH.gunDark);
  const mid = tint(MYTH.gunMid);
  // A brighter edge at scale so the silhouette pops off the frame.
  const light = scale > 1 ? mix(tint(MYTH.gunLight), tint(MYTH.haze), 0.45) : tint(MYTH.gunLight);
  plateEdge = 1.2 * Math.max(1, scale * 0.9);
  // Two hands on every gun: void discs with a star glint, one at the grip, one forward.
  const hand = (u: number, v: number, r: number): void => {
    const p = f(u, v);
    voidDisc(g, tint, p.x, p.y, r * scale, 1, 7 + u, phase, 3);
  };
  let muzzle: Phaser.Geom.Point;
  switch (kind) {
    case 'pistol': {
      plate(g, [f(-6, 14), f(8, 14), f(22, 52), f(8, 52)], dark, light);         // grip
      plate(g, [f(-4, -4), f(78, -4), f(78, 12), f(-4, 12)], mid, light);        // slide
      plate(g, [f(30, 12), f(78, 12), f(78, 20), f(36, 20)], dark, light);       // frame
      plate(g, [f(60, -8), f(84, -8), f(84, 0), f(60, 0)], dark, light);         // barrel
      g.lineStyle(1, light, 0.6);
      for (let i = 0; i < 4; i++) { const a = f(10 + i * 8, -4); const b = f(10 + i * 8, 12); g.lineBetween(a.x, a.y, b.x, b.y); }
      hand(2, 30, 11);
      muzzle = f(86, -4);
      break;
    }
    case 'shotgun': {
      plate(g, [f(-40, 6), f(-6, 2), f(0, 22), f(-34, 30)], mix(dark, 0x3a2614, 0.5), light);   // stock
      plate(g, [f(-6, -6), f(60, -6), f(60, 18), f(-6, 18)], mid, light);                       // receiver
      plate(g, [f(40, -12), f(124, -12), f(124, -2), f(40, -2)], dark, light);                  // upper barrel
      plate(g, [f(40, 0), f(124, 0), f(124, 10), f(40, 10)], dark, light);                      // lower barrel
      plate(g, [f(50, 12), f(96, 12), f(96, 22), f(50, 22)], mix(dark, 0x3a2614, 0.5), light);  // pump
      g.lineStyle(1, light, 0.5);
      for (let i = 0; i < 5; i++) { const a = f(56 + i * 8, 12); const b = f(56 + i * 8, 22); g.lineBetween(a.x, a.y, b.x, b.y); }
      hand(4, 26, 11);
      hand(72, 24, 10);
      muzzle = f(126, -1);
      break;
    }
    case 'launcher': {
      plate(g, [f(-36, 4), f(-4, 0), f(0, 20), f(-30, 26)], dark, light);                       // stock
      plate(g, [f(-4, -6), f(44, -6), f(44, 20), f(-4, 20)], mid, light);                       // body
      plate(g, [f(30, -16), f(104, -16), f(104, 12), f(30, 12)], dark, light);                  // fat tube
      // The drum: three visible grenades in a cylinder.
      const c = f(18, 4);
      g.fillStyle(dark, 1); g.fillCircle(c.x, c.y, 15 * scale);
      g.lineStyle(plateEdge, light, 0.9); g.strokeCircle(c.x, c.y, 15 * scale);
      for (let i = 0; i < 3; i++) {
        const a = phase * 0.4 + (i / 3) * TAU;
        g.fillStyle(tint(MYTH.iris), 1); g.fillCircle(c.x + Math.cos(a) * 8 * scale, c.y + Math.sin(a) * 8 * scale, 3.6 * scale);
        star(g, c.x + Math.cos(a) * 8 * scale, c.y + Math.sin(a) * 8 * scale, 2.2 * scale, tint(MYTH.star), 1);
      }
      g.lineStyle(2, light, 0.6);
      for (let i = 0; i < 3; i++) { const a = f(50 + i * 16, -16); const b = f(50 + i * 16, 12); g.lineBetween(a.x, a.y, b.x, b.y); }
      hand(6, 32, 11);
      hand(66, 20, 10);
      muzzle = f(106, -2);
      break;
    }
    case 'rifle': {
      plate(g, [f(-56, 4), f(-8, 0), f(-4, 18), f(-50, 26)], mix(dark, 0x3a2614, 0.6), light);  // long stock
      plate(g, [f(-8, -6), f(52, -6), f(52, 14), f(-8, 14)], mid, light);                       // receiver
      plate(g, [f(44, -3), f(168, -3), f(168, 5), f(44, 5)], dark, light);                      // long barrel
      plate(g, [f(10, -20), f(50, -20), f(50, -8), f(10, -8)], dark, light);                    // scope body
      const s0 = f(12, -14); const s1 = f(48, -14);
      g.fillStyle(tint(MYTH.shard), 0.8); g.fillCircle(s1.x, s1.y, 5 * scale);
      g.fillStyle(tint(MYTH.shardDeep), 0.9); g.fillCircle(s0.x, s0.y, 4 * scale);
      plate(g, [f(-2, 14), f(14, 14), f(20, 36), f(4, 36)], dark, light);                       // grip
      plate(g, [f(20, 14), f(34, 14), f(34, 32), f(20, 32)], dark, light);                      // magazine
      hand(6, 26, 10);
      hand(96, 10, 9);
      muzzle = f(170, 1);
      break;
    }
    case 'rocket': {
      // A shoulder tube, drawn fat with a sight on top and the rocket's nose showing.
      plate(g, [f(-40, -14), f(130, -14), f(130, 22), f(-40, 22)], dark, light);
      plate(g, [f(-44, -18), f(-28, -18), f(-28, 26), f(-44, 26)], mid, light);                 // rear ring
      plate(g, [f(114, -18), f(132, -18), f(132, 26), f(114, 26)], mid, light);                 // front ring
      plate(g, [f(30, -30), f(70, -30), f(70, -14), f(30, -14)], mid, light);                   // sight block
      const n = f(140, 4);
      g.fillStyle(tint(MYTH.void), 1); g.fillPoints([f(130, -8), f(150, 4), f(130, 16)], true);
      g.lineStyle(1.2, tint(MYTH.red), 0.9); g.strokePoints([f(130, -8), f(150, 4), f(130, 16)], true, true);
      star(g, n.x - 6 * scale, n.y, 3 * scale, tint(MYTH.red), 0.9 + 0.1 * Math.sin(phase * 8));
      plate(g, [f(0, 22), f(16, 22), f(20, 44), f(4, 44)], dark, light);                        // grip
      g.lineStyle(1.5, light, 0.5);
      for (let i = 0; i < 6; i++) { const a = f(-20 + i * 22, -14); const b = f(-20 + i * 22, 22); g.lineBetween(a.x, a.y, b.x, b.y); }
      hand(8, 34, 11);
      hand(86, 30, 10);
      muzzle = f(152, 4);
      break;
    }
  }
  return { x: muzzle.x, y: muzzle.y };
}

// ── Shop-upgrade art ────────────────────────────────────────────────────────

/**
 * World Shatter's rift: a jagged crack of starlight cut into the floor from `(x0, y0)` to
 * `(x1, y1)` — a void gash with a gold lip that pulses while it is ready to be stepped through.
 */
export function rift(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x0: number, y0: number, x1: number, y1: number, seed: number,
  phase: number, alpha: number, ready: boolean, open = 1,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const n = Math.max(4, Math.round(len / 14));
  const top: Phaser.Geom.Point[] = [];
  const bot: Phaser.Geom.Point[] = [];
  const spine: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const taper = Math.sin(k * Math.PI);
    const w = (3 + 6 * taper) * open;
    const zig = (jitter(seed, i) - 0.5) * 9 * taper;
    const cx = x0 + ux * len * k - uy * zig;
    const cy = y0 + uy * len * k + ux * zig;
    spine.push(P(cx, cy));
    top.push(P(cx - uy * w, cy + ux * w));
    bot.push(P(cx + uy * w, cy - ux * w));
  }
  const pulse = ready ? 0.65 + 0.35 * Math.sin(phase * 5 + seed) : 0.4;
  g.fillStyle(tint(MYTH.gold), alpha * 0.18 * pulse);
  g.fillPoints([...top.map((p) => P(p.x - uy * 4, p.y + ux * 4)), ...bot.reverse().map((p) => P(p.x + uy * 4, p.y - ux * 4))], true);
  bot.reverse();
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillPoints([...top, ...[...bot].reverse()], true);
  g.lineStyle(1.6, tint(ready ? MYTH.gold : MYTH.violet), alpha * pulse);
  g.strokePoints(top, false);
  g.strokePoints(bot, false);
  // Stars down in the crack, and a few hairline fractures off its sides.
  for (let i = 1; i < n; i += 2) {
    const sp = spine[i];
    g.fillStyle(tint(jitter(seed, i + 40) > 0.6 ? MYTH.starBlue : MYTH.star), alpha * (0.5 + 0.5 * Math.sin(phase * 3 + i)));
    g.fillCircle(sp.x, sp.y, 1.1);
  }
  g.lineStyle(1, tint(MYTH.haze), alpha * 0.4);
  for (let i = 1; i < n; i += 3) {
    const sp = spine[i];
    const side = jitter(seed, i + 60) > 0.5 ? 1 : -1;
    const fl = 6 + jitter(seed, i + 70) * 8;
    g.lineBetween(sp.x, sp.y, sp.x - uy * fl * side + ux * 4, sp.y + ux * fl * side + uy * 4);
  }
}

/** A beyonder's black spear: a long shaft and a violet-lit leaf blade, pointing along `ang`. */
export function spear(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, ang: number, len: number, alpha: number,
): void {
  if (alpha <= 0) return;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pt = (u: number, v: number): Phaser.Geom.Point => P(x + ca * u - sa * v, y + sa * u + ca * v);
  const w = Math.max(1.2, len * 0.06);
  g.lineStyle(w, tint(MYTH.void), alpha);
  g.lineBetween(pt(-len * 0.75, 0).x, pt(-len * 0.75, 0).y, pt(len * 0.05, 0).x, pt(len * 0.05, 0).y);
  const blade = [pt(0, -w * 1.7), pt(len * 0.25, 0), pt(0, w * 1.7), pt(-len * 0.04, 0)];
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillPoints(blade, true);
  g.lineStyle(1, tint(MYTH.iris), alpha * 0.9);
  g.strokePoints(blade, true, true);
  g.fillStyle(tint(MYTH.haze), alpha * 0.7);
  g.fillCircle(pt(len * 0.2, 0).x, pt(len * 0.2, 0).y, Math.max(0.8, w * 0.5));
}

/**
 * A beyonder: a black, hooded figure with no face but two pale points for eyes, a ragged
 * cloak, and a black spear held up and back over the shoulder (`throwK` 0 cocked → 1 thrown
 * forward). Drawn standing at `(x, y)` — its feet — facing `ang`.
 */
export function beyonder(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, ang: number, alpha: number, phase: number,
  throwK: number,
): void {
  if (alpha <= 0) return;
  const face = Math.cos(ang) >= 0 ? 1 : -1;
  // A cold halo so the black reads against the black beast.
  g.fillStyle(tint(MYTH.iris), alpha * 0.16);
  g.fillEllipse(x, y - 16, 34, 46);
  // The cloak: a ragged wedge flaring at the hem, fluttering.
  const hem = (i: number): number => y + 2 + Math.sin(phase * 7 + i * 1.7) * 1.6;
  const cloak = [P(x - 4 * face, y - 26), P(x + 5 * face, y - 26), P(x + 11 * face, hem(0)), P(x + 6 * face, hem(1) - 3),
    P(x + 2 * face, hem(2)), P(x - 3 * face, hem(3) - 3), P(x - 8 * face, hem(4)), P(x - 11 * face, hem(5) - 2)];
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillPoints(cloak, true);
  g.lineStyle(1, tint(MYTH.violet), alpha * 0.9);
  g.strokePoints(cloak, true, true);
  // The hood, and its two eyes.
  g.fillStyle(tint(MYTH.void), alpha);
  g.fillPoints([P(x - 6, y - 26), P(x + 1 * face, y - 39), P(x + 7 * face, y - 30), P(x + 6, y - 24)], true);
  g.fillCircle(x + face, y - 30, 5.5);
  g.lineStyle(1, tint(MYTH.violet), alpha * 0.8);
  g.strokeCircle(x + face, y - 30, 5.5);
  g.fillStyle(tint(MYTH.starBlue), alpha);
  g.fillCircle(x + 2.5 * face, y - 30.5, 1.1);
  g.fillCircle(x + 5 * face, y - 30.5, 1.1);
  // The spear: cocked back over the shoulder, swinging through as it throws.
  const cocked = -Math.PI / 2 - 0.35 * face;
  const spearAng = cocked + Phaser.Math.Angle.Wrap(ang - cocked) * throwK;
  const handX = x + (6 - 10 * (1 - throwK)) * face;
  const handY = y - 28 - 4 * (1 - throwK);
  spear(g, tint, handX, handY, spearAng, 34, alpha);
  voidDisc(g, tint, handX, handY, 3.5, alpha, 5, phase, 0);
}

/** A muzzle flash: a hot star with a halo, fading over `t`. */
export function muzzleFlash(g: Phaser.GameObjects.Graphics, tint: MythColorFn, x: number, y: number, size: number, t: number): void {
  const a = 1 - t;
  g.fillStyle(tint(MYTH.gold), a * 0.35);
  g.fillCircle(x, y, size * (1 + t));
  star(g, x, y, size * (1.4 - t * 0.6), tint(MYTH.star), a, { points: 4, rot: t * 2 });
  star(g, x, y, size * (0.8 - t * 0.3), tint(MYTH.white), a, { points: 4, rot: Math.PI / 4 });
}

// ── One-shot effects ────────────────────────────────────────────────────────

export class MythFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: MythColorFn = (c) => c) {
    super(scene, tint);
  }

  /** A jittered expanding ring with a few stars thrown out of it. */
  ring(x: number, y: number, r0: number, r1: number, ms: number, color: number, width = 3, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const n = Math.max(18, Math.round(r / 5));
      g.lineStyle(width * (1 - t * 0.6), this.tint(color), (1 - t) * 0.85);
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.05);
        if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.strokePath();
    });
  }

  /** Stars flung from a point. */
  starSpray(x: number, y: number, count: number, spread: number, ms: number, depth = 9, color = MYTH.star): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + Math.random() * 0.7, d: spread * (0.4 + Math.random() * 0.6), r: 2 + Math.random() * 2.5, rot: Math.random() * TAU,
    }));
    this.anim(depth, ms, (g, t) => {
      const k = easeOut(t);
      for (const s of seeds) {
        star(g, x + Math.cos(s.a) * s.d * k, y + Math.sin(s.a) * s.d * k, s.r * (1 - t * 0.5), this.tint(color), 1 - t, { points: 4, rot: s.rot + t * 3 });
      }
    });
  }

  /** The star mace landing: a hot four-point flash and a ring. */
  tipHit(x: number, y: number): void {
    this.flashIn(x, y, 14, this.tint(MYTH.gold), this.tint(MYTH.iris), 10);
    this.anim(10, 320, (g, t) => {
      star(g, x, y, 22 * (1 - t * 0.4), this.tint(MYTH.star), 1 - t, { points: 4, rot: t * 1.5 });
      star(g, x, y, 12, this.tint(MYTH.white), 1 - t, { points: 4, rot: Math.PI / 4 });
    });
    this.ring(x, y, 6, 34, 300, MYTH.mace, 2.5, 10);
  }

  /** A plain whip graze: a small violet flick. */
  graze(x: number, y: number): void {
    this.anim(9, 220, (g, t) => {
      g.fillStyle(this.tint(MYTH.iris), (1 - t) * 0.8);
      g.fillCircle(x, y, 6 + t * 10);
    });
  }

  /** Truth Breaker's sweep, with the word on it: nothing on the other side gets a say. */
  slash(x: number, y: number, ang: number, r: number, half: number, depth = 9): void {
    this.anim(depth, 300, (g, t) => slashArc(g, this.tint, x, y, ang, r, half, t));
    this.anim(depth + 1, 260, (g, t) => {
      const p = { x: x + Math.cos(ang) * r * 0.72, y: y + Math.sin(ang) * r * 0.72 };
      star(g, p.x, p.y, 10 * (1 - t * 0.5), this.tint(MYTH.gold), 1 - t, { points: 4, rot: t });
    });
  }

  /** The dash of a recast Truth Breaker: a streak of blade-light with stars peeling off it. */
  dashTrail(x0: number, y0: number, x1: number, y1: number): void {
    const seed = Math.random() * 999;
    this.anim(8, 340, (g, t) => {
      const a = 1 - t;
      g.lineStyle(10 * a, this.tint(MYTH.iris), a * 0.35);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(3 * a, this.tint(MYTH.star), a * 0.9);
      g.lineBetween(x0, y0, x1, y1);
      for (let i = 0; i < 7; i++) {
        const k = jitter(seed, i);
        const px = x0 + (x1 - x0) * k;
        const py = y0 + (y1 - y0) * k + (jitter(seed, i + 7) - 0.5) * 24 * t;
        star(g, px, py, 3 * a, this.tint(MYTH.star), a, { points: 4, rot: k * 5 });
      }
    });
  }

  /** The flip over the beast: a ring of stars thrown up around the body. */
  flip(x: number, y: number): void {
    this.starSpray(x, y - 10, 10, 44, 520, 9, MYTH.starBlue);
    this.ring(x, y, 10, 40, 360, MYTH.haze, 2, 9);
  }

  /** A shard arriving from the crowd. */
  shardGain(x: number, y: number): void {
    this.anim(12, 600, (g, t) => {
      shard(g, this.tint, x, y - 30 - t * 10, 9 + (1 - t) * 6, t * 6, 1 - t * 0.6);
      star(g, x, y - 30, 18 * (1 - t), this.tint(MYTH.shard), 1 - t, { points: 4, rot: t * 2 });
    });
    this.starSpray(x, y - 30, 8, 30, 500, 12, MYTH.shard);
  }

  /** A grenade or rocket going off. */
  explosion(x: number, y: number, r: number, depth = 10): void {
    this.flashIn(x, y, r * 0.5, this.tint(MYTH.star), this.tint(MYTH.iris), depth);
    this.anim(depth, 420, (g, t) => {
      const k = easeOut(t);
      g.fillStyle(this.tint(MYTH.iris), (1 - t) * 0.35);
      g.fillCircle(x, y, r * (0.4 + 0.6 * k));
      g.fillStyle(this.tint(MYTH.void), (1 - t) * 0.7);
      g.fillCircle(x, y, r * 0.55 * k);
      pinpricks(g, this.tint, x, y, r * 0.55 * k, 31, 7, t * 8, 1 - t);
    });
    this.ring(x, y, r * 0.3, r * 1.05, 360, MYTH.haze, 3, depth);
    this.starSpray(x, y, 9, r * 0.9, 480, depth);
  }

  /** Slayer's second blast: a grenade going off again, bigger and red. */
  redExplosion(x: number, y: number, r: number, depth = 10): void {
    this.flashIn(x, y, r * 0.55, this.tint(MYTH.gold), this.tint(MYTH.red), depth);
    this.anim(depth, 480, (g, t) => {
      const k = easeOut(t);
      g.fillStyle(this.tint(MYTH.red), (1 - t) * 0.4);
      g.fillCircle(x, y, r * (0.4 + 0.6 * k));
      g.fillStyle(this.tint(MYTH.void), (1 - t) * 0.75);
      g.fillCircle(x, y, r * 0.5 * k);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t;
        star(g, x + Math.cos(a) * r * 0.7 * k, y + Math.sin(a) * r * 0.7 * k, 5 * (1 - t), this.tint(MYTH.red), 1 - t, { points: 4, rot: a });
      }
    });
    this.ring(x, y, r * 0.3, r * 1.1, 400, MYTH.red, 4, depth);
    this.starSpray(x, y, 10, r, 520, depth, MYTH.gold);
  }

  /** A barrage spear striking the floor: a black shaft quivering upright and a little burst. */
  spearLand(x: number, y: number): void {
    this.anim(9, 520, (g, t) => {
      const a = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      const wob = Math.sin(t * 40) * (1 - t) * 0.12;
      spear(g, this.tint, x, y - 2, -Math.PI / 2 + wob, 26, a);
      g.fillStyle(this.tint(MYTH.red), (1 - t) * 0.5);
      g.fillEllipse(x, y, 18 * (0.5 + t), 6 * (0.5 + t));
    });
    this.starSpray(x, y, 4, 16, 300, 9, MYTH.red);
  }

  /** A 2D muzzle flash at the gun, for the arena-side view of a Destiny shot. */
  muzzle(x: number, y: number, ang: number, size: number): void {
    this.anim(10, 140, (g, t) => {
      const px = x + Math.cos(ang) * 18;
      const py = y + Math.sin(ang) * 18;
      muzzleFlash(g, this.tint, px, py, size, t);
    });
  }

  /** The rifle's tracer: one bright line, gone in a blink. */
  tracer(x0: number, y0: number, x1: number, y1: number): void {
    this.anim(10, 200, (g, t) => {
      g.lineStyle(4 * (1 - t), this.tint(MYTH.haze), (1 - t) * 0.6);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(1.5, this.tint(MYTH.star), 1 - t);
      g.lineBetween(x0, y0, x1, y1);
    });
  }

  /** The headshot's little crown of stars. */
  headshot(x: number, y: number): void {
    this.starSpray(x, y - 22, 6, 22, 420, 11, MYTH.gold);
    this.anim(11, 300, (g, t) => {
      star(g, x, y - 24 - t * 8, 9 * (1 - t), this.tint(MYTH.gold), 1 - t, { points: 5, rot: -Math.PI / 2 });
    });
  }

  /** Determination firing: a column of stars rising around the body. */
  determination(x: number, y: number): void {
    this.ring(x, y, 12, 56, 500, MYTH.gold, 3, 10);
    this.anim(10, 700, (g, t) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t * 2;
        const r = 22 + 10 * Math.sin(t * Math.PI);
        star(g, x + Math.cos(a) * r, y - t * 40 + Math.sin(a) * r * 0.4, 3.5 * (1 - t), this.tint(MYTH.star), 1 - t, { points: 4, rot: a });
      }
    });
  }
}

// ── The character ─────────────────────────────────────────────────────────

const MYTH_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: MYTH.iris, alpha: 0.26 },
    { r: 9, color: MYTH.violet, alpha: 1 },
    { r: 6.8, color: MYTH.void, alpha: 1 },
    { r: 1.9, color: MYTH.star, alpha: 0.95, ox: -2, oy: -2 },
    { r: 1.1, color: MYTH.starBlue, alpha: 0.9, ox: 2.2, oy: 1.6 },
  ],
  eyeWhite: MYTH.star,
  eyePupil: MYTH.void,
  squash: { div: 16, x: 0.42, y: 0.24 },
};

/**
 * Myth's rig: the void orb (the sprite) with a slow drift of pinprick stars around the crown,
 * and Excalibur carried diagonally across the back — tip up over one shoulder, the eye of the
 * hilt showing at the other hip. Truth Breaker brings the blade round into the hand and opens
 * the eye; Final Destiny puts a gun in both hands; Determination wraps the body in a slow ring
 * of star streaks. Detail: a nebula and a twinkling constellation on the orb, a star mote
 * circling each hand. Mastered (ready before the mastery exists): a crown of five gold stars
 * over the head, a gold-lined planetary ring with a moon orbiting the body, a gold rim on the
 * orb, gold constellation lines, gold hand rims and coronas, gold eyes, and the hilt's eye
 * staying open.
 */
export class MythAvatar extends BaseAvatar {
  private bladeOut = 0;
  private bladeTarget = 0;
  private eyeOpen = 0;
  private eyeTarget = 0;
  private determined = 0;
  private determinedTarget = 0;
  private gunKind: GunKind | null = null;
  private gunRecoil = 0;
  private flipT = 0;
  private flipDur = 0;
  private sparkle = 0;

  constructor(scene: Phaser.Scene, tint: MythColorFn, depth = 6) {
    super(scene, tint, depth, MYTH_AVATAR);
  }

  /** Excalibur drawn (1) or carried behind the back (0). Lerped. */
  setBlade(out: boolean): void { this.bladeTarget = out ? 1 : 0; }

  /** The hilt's eye. Open while the blade is drawn; Mastery keeps it open. */
  setEye(open: boolean): void { this.eyeTarget = open ? 1 : 0; }

  setDetermined(on: boolean): void { this.determinedTarget = on ? 1 : 0; }

  /** Final Destiny: the gun in hand, or none. */
  setGun(kind: GunKind | null): void { this.gunKind = kind; }

  /** A shot was fired: kick the gun. */
  recoil(): void { this.gunRecoil = 1; }

  /** The flip over the beast: a hop that lasts `ms`. Height is read back through `flipLift`. */
  flip(ms: number): void { this.flipT = 0.0001; this.flipDur = ms; }

  /** px the body is drawn above its feet this frame — the kit lifts the sprite by the same amount. */
  flipLift(): number {
    if (this.flipT <= 0) return 0;
    return Math.sin(Math.min(1, this.flipT / this.flipDur) * Math.PI) * 34;
  }

  flipping(): boolean { return this.flipT > 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.bladeOut += (this.bladeTarget - this.bladeOut) * Math.min(1, delta / (this.bladeTarget > this.bladeOut ? 70 : 260));
    this.eyeOpen += (this.eyeTarget - this.eyeOpen) * Math.min(1, delta / 160);
    this.determined += (this.determinedTarget - this.determined) * Math.min(1, delta / 200);
    this.gunRecoil = Math.max(0, this.gunRecoil - delta / 130);
    this.sparkle += delta / 1000;
    if (this.flipT > 0) {
      this.flipT += delta;
      if (this.flipT >= this.flipDur) this.flipT = 0;
    }
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.eyeTarget = on ? 1 : this.eyeTarget;
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 16 : 13);
      glow.setAlpha(on ? 0.42 : 0.26);
      glow.setFillStyle(this.tint(on ? MYTH.gold : MYTH.iris), 0.26);
    });
    this.forEachHandLayer(1, (rim) => {
      if (on) rim.setStrokeStyle(1.6, this.tint(MYTH.gold), 0.95);
      else rim.setStrokeStyle();
    });
    this.setEyeWhite(on ? MYTH.gold : MYTH.star);
  }

  /**
   * Painted on the void orb under the face: a faint nebula and a small constellation whose
   * stars twinkle and whose lines are drawn in — violet normally, gold once mastered.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const drift = this.sparkle * 0.2;
    // Nebula wisps.
    g.fillStyle(this.tint(MYTH.iris), alpha * 0.16);
    g.fillEllipse(x + 4 + Math.sin(drift) * 2, y + 9, 26, 9);
    g.fillStyle(this.tint(m ? MYTH.gold : MYTH.haze), alpha * 0.1);
    g.fillEllipse(x - 5 + Math.cos(drift) * 2, y + 12, 18, 6);
    // The constellation: five stars on the lower body.
    const pts: [number, number][] = [[-12, 6], [-5, 13], [3, 9], [10, 15], [13, 5]];
    g.lineStyle(0.9, this.tint(m ? MYTH.gold : MYTH.haze), alpha * (m ? 0.75 : 0.45));
    for (let i = 0; i < pts.length - 1; i++) {
      g.lineBetween(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1]);
    }
    for (let i = 0; i < pts.length; i++) {
      const tw = 0.55 + 0.45 * Math.sin(this.sparkle * (2 + i * 0.3) + i * 1.9);
      const big = i === 2;
      if (big) star(g, x + pts[i][0], y + pts[i][1], 2.8 * (0.8 + tw * 0.3), this.tint(m ? MYTH.gold : MYTH.star), alpha * tw, { points: 4 });
      else {
        g.fillStyle(this.tint(i % 2 ? MYTH.starBlue : MYTH.star), alpha * tw);
        g.fillCircle(x + pts[i][0], y + pts[i][1], 1.1);
      }
    }
    if (m) {
      // A thin gold rim round the void: the orb is set like a jewel.
      g.lineStyle(1.4, this.tint(MYTH.gold), alpha * (0.55 + 0.2 * Math.sin(this.sparkle * 3)));
      g.strokeCircle(x, y, 21.5);
    }
  }

  /**
   * Mastered only: a planetary ring tilted round the body with a small moon riding it. The far
   * half is painted from the glow (behind the sprite), the near half from the extras.
   */
  private orbitRing(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, front: boolean): void {
    const tilt = -0.28;
    const R = 31, RY = 9;
    const c = Math.cos(tilt), sn = Math.sin(tilt);
    const at = (u: number): [number, number] => {
      const ex = Math.cos(u) * R, ey = Math.sin(u) * RY;
      return [x + ex * c - ey * sn, y + 4 + ex * sn + ey * c];
    };
    const from = front ? 0 : Math.PI, to = front ? Math.PI : TAU;
    g.lineStyle(2.4, this.tint(MYTH.iris), a * (front ? 0.55 : 0.3));
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const [px, py] = at(from + ((to - from) * i) / 16);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    g.lineStyle(1, this.tint(MYTH.gold), a * (front ? 0.9 : 0.45));
    g.strokePath();
    const mu = this.sparkle * 1.3;
    const muN = ((mu % TAU) + TAU) % TAU;
    if ((muN < Math.PI) === front) {
      const [mx, my] = at(mu);
      g.fillStyle(this.tint(MYTH.gold), a * 0.3);
      g.fillCircle(mx, my, 6);
      g.fillStyle(this.tint(MYTH.star), a);
      g.fillCircle(mx, my, 3);
      g.fillStyle(this.tint(MYTH.gold), a);
      g.fillCircle(mx + 0.8, my + 0.6, 2);
    }
  }

  /** Mastered only: a crown of five gold stars arcing over the head, joined like a constellation. */
  private starCrown(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const cx = x + Math.cos(this.facing) * 1.5;
    const cy = y - 26;
    const pts: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const u = Math.PI * (1.15 + (i / 4) * 0.7);
      pts.push([cx + Math.cos(u) * 16, cy + 10 + Math.sin(u) * 12 - (i === 2 ? 3 : 0)]);
    }
    g.fillStyle(this.tint(MYTH.gold), a * 0.12);
    g.fillEllipse(cx, cy + 2, 40, 16);
    g.lineStyle(1, this.tint(MYTH.gold), a * 0.7);
    for (let i = 0; i < 4; i++) g.lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    for (let i = 0; i < 5; i++) {
      const tw = 0.75 + 0.25 * Math.sin(this.sparkle * 4 + i * 1.3);
      const r = (i === 2 ? 5.2 : 3.4) * tw;
      g.fillStyle(this.tint(MYTH.gold), a * 0.3);
      g.fillCircle(pts[i][0], pts[i][1], r * 1.5);
      star(g, pts[i][0], pts[i][1], r, this.tint(i === 2 ? MYTH.star : MYTH.gold), a, { points: i === 2 ? 8 : 4, rot: this.sparkle * (i === 2 ? 0.6 : 0) });
    }
  }

  protected emitTrail(x: number, y: number): void {
    new MythFx(this.scene, this.tint).starSpray(x, y, 2, 10, 260, 7, MYTH.starBlue);
  }

  /** Both hands on the gun, or one hand wrapped round the hilt while the blade is out. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'brace' && this.gunKind) {
      return side > 0
        ? { ang: this.facing + 0.12, dist: 30, scale: idle.scale * 1.05 }
        : { ang: this.facing - 0.3, dist: 17, scale: idle.scale * 0.95 };
    }
    return null;
  }

  /** The void pool under the body, the star drift, and Excalibur across the back. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(MYTH.iris), a * (this.mastered ? 0.26 : 0.18));
    g.fillCircle(x, y + 2, 26);
    if (this.mastered) {
      g.fillStyle(this.tint(MYTH.gold), a * 0.1);
      g.fillCircle(x, y + 2, 34);
      this.orbitRing(g, x, y, alpha, false);
    }
    // Determination: a ring of star streaks orbiting low around the body.
    if (this.determined > 0.02) {
      const d = this.determined;
      for (let i = 0; i < 6; i++) {
        const ang = this.sparkle * 3.2 + (i / 6) * TAU;
        const r = 30 + 4 * Math.sin(this.sparkle * 5 + i);
        const px = x + Math.cos(ang) * r;
        const py = y + 6 + Math.sin(ang) * r * 0.45;
        g.lineStyle(2, this.tint(MYTH.gold), a * d * 0.7);
        g.lineBetween(px, py, x + Math.cos(ang - 0.5) * r, y + 6 + Math.sin(ang - 0.5) * r * 0.45);
        star(g, px, py, 3.2, this.tint(MYTH.star), a * d, { points: 4, rot: ang });
      }
    }
    // Excalibur behind the back: under the sprite, diagonal from the right hip up over the
    // left shoulder. Only the tip and the hilt's eye show past the body, which is the point.
    const back = 1 - this.bladeOut;
    if (back > 0.02) {
      const ba = -Math.PI * 0.62 + Math.cos(this.facing) * 0.18;
      excalibur(g, this.tint, x + 13, y + 10, ba, 60, a * back, this.eyeOpen * 0.6 + (this.mastered ? 0.4 : 0), { width: 6 });
    }
  }

  /** The star drift round the crown, the drawn blade, and the gun. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // A mote of starlight circling each hand.
    for (let h = 0; h < 2; h++) {
      const ang = this.sparkle * (h ? 3 : -3);
      const mx = this.armX[h] + Math.cos(ang) * 11, my = this.armY[h] + Math.sin(ang) * 11;
      star(g, mx, my, 2.2, this.tint(this.mastered ? MYTH.gold : MYTH.starBlue), a, { points: 4, rot: ang });
    }
    if (this.mastered) {
      this.orbitRing(g, x, y, alpha, true);
      this.starCrown(g, x, y, alpha);
    }
    // Three stars drifting around the crown, never over the face.
    for (let i = 0; i < 3; i++) {
      const ang = this.sparkle * (0.9 + i * 0.25) + (i / 3) * TAU;
      const px = x + Math.cos(ang) * 22;
      const py = y - 20 + Math.sin(ang) * 6;
      const tw = 0.6 + 0.4 * Math.sin(this.sparkle * 4 + i * 2);
      star(g, px, py, 2.6 * tw, this.tint(i === 1 ? MYTH.starBlue : MYTH.star), a * tw, { points: 4, rot: ang });
    }
    if (this.bladeOut > 0.02) {
      // In the hand, along the aim.
      const hx = x + Math.cos(this.facing) * 16;
      const hy = y + Math.sin(this.facing) * 16;
      excalibur(g, this.tint, hx, hy, this.facing, 46 * this.bladeOut, a * this.bladeOut, Math.max(this.eyeOpen, this.bladeOut), { width: 7, glow: this.bladeOut });
    }
    if (this.gunKind) {
      this.drawHeldGun(g, x, y, a);
    }
  }

  /** A small side-on gun along the aim, for everyone watching from the arena. */
  private drawHeldGun(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const ang = this.facing;
    const kick = this.gunRecoil * 6;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const pt = (u: number, v: number): Phaser.Geom.Point => P(x + ca * (u - kick) - sa * v, y + sa * (u - kick) + ca * v);
    const len = this.gunKind === 'rifle' ? 46 : this.gunKind === 'rocket' ? 40 : this.gunKind === 'pistol' ? 22 : 34;
    const thick = this.gunKind === 'rocket' ? 9 : this.gunKind === 'launcher' ? 7 : 4;
    g.fillStyle(this.tint(MYTH.gunDark), a);
    g.fillPoints([pt(8, -thick / 2), pt(8 + len, -thick / 2), pt(8 + len, thick / 2), pt(8, thick / 2)], true);
    g.lineStyle(1, this.tint(MYTH.gunLight), a * 0.8);
    g.strokePoints([pt(8, -thick / 2), pt(8 + len, -thick / 2), pt(8 + len, thick / 2), pt(8, thick / 2)], true, true);
    if (this.gunKind === 'shotgun') {
      g.fillStyle(this.tint(MYTH.gunMid), a);
      g.fillPoints([pt(16, 2), pt(30, 2), pt(30, 6), pt(16, 6)], true);
    }
    if (this.gunKind === 'rifle') {
      g.fillStyle(this.tint(MYTH.shard), a * 0.9);
      const s = pt(22, -6);
      g.fillCircle(s.x, s.y, 2.2);
    }
    if (this.gunKind === 'rocket') {
      const n = pt(8 + len + 5, 0);
      star(g, n.x, n.y, 3.5, this.tint(MYTH.red), a);
    }
    if (this.gunRecoil > 0.05) {
      const m = pt(10 + len, 0);
      muzzleFlash(g, this.tint, m.x, m.y, 9, 1 - this.gunRecoil);
    }
  }
}
