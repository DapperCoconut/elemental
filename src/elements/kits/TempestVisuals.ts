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
  /** Upgrades — hail and its shrapnel. */
  ice: 0xc4ecff,
  iceDeep: 0x5aa6d6,
  /** Upgrades — thunderheads, rain and the puddles it leaves. */
  cloud: 0x2a3552,
  cloudLit: 0x6a7fa8,
  rain: 0x8fb4e8,
  puddle: 0x2c4e86,
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

// ── Upgrade painters ─────────────────────────────────────────────────────
// The shop upgrades bring the rest of the weather: ice, static, thunderheads and rain. Wind is
// still the base material — hail is wind that froze, static is wind that rubbed itself raw.

/** A hailstone: a faceted lump of ice with a frosted rim and two lit facets. */
export function hailStone(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, r: number, rot: number, alpha: number, seed = 0,
): void {
  const N = 7;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < N; i++) {
    const a = rot + (i / N) * TAU;
    const rr = r * (0.78 + jitter(seed, i) * 0.32);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(tint(TMP.ice), alpha * 0.25);
  g.fillCircle(x, y, r * 1.6);
  g.fillStyle(tint(TMP.iceDeep), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(TMP.ice), alpha);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.78 - r * 0.08, y + (p.y - y) * 0.78 - r * 0.1)), true);
  // Two facets catching the light, and a cracked seam across the middle.
  g.fillStyle(tint(TMP.white), alpha * 0.9);
  g.fillTriangle(x - r * 0.45, y - r * 0.15, x - r * 0.05, y - r * 0.55, x + r * 0.05, y - r * 0.1);
  g.fillStyle(tint(TMP.white), alpha * 0.5);
  g.fillTriangle(x + r * 0.1, y + r * 0.05, x + r * 0.5, y - r * 0.2, x + r * 0.35, y + r * 0.3);
  g.lineStyle(1, tint(TMP.iceDeep), alpha * 0.8);
  g.lineBetween(x - r * 0.6, y + r * 0.2, x + r * 0.55, y + r * 0.05);
}

/** One splinter of ice shrapnel, pointing along `ang`. */
export function iceShard(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, ang: number, len: number, alpha: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const w = len * 0.28;
  const tip = new Phaser.Geom.Point(x + ca * len * 0.6, y + sa * len * 0.6);
  const l = new Phaser.Geom.Point(x - ca * len * 0.4 - sa * w, y - sa * len * 0.4 + ca * w);
  const r = new Phaser.Geom.Point(x - ca * len * 0.4 + sa * w, y - sa * len * 0.4 - ca * w);
  // A frost trail behind it.
  g.lineStyle(w * 1.2, tint(TMP.ice), alpha * 0.25);
  g.lineBetween(x - ca * len * 1.4, y - sa * len * 1.4, x, y);
  g.fillStyle(tint(TMP.iceDeep), alpha);
  g.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
  g.fillStyle(tint(TMP.white), alpha * 0.85);
  g.fillTriangle(tip.x, tip.y, l.x, l.y, x - ca * len * 0.2, y - sa * len * 0.2);
}

/**
 * A static trail along `pts`: a faint singed band with arcs crackling between the points. `t`
 * re-rolls the arcs, so it fizzes; `alpha` fades it out at the end of its life.
 */
export function staticTrail(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, pts: { x: number; y: number }[], halfW: number, alpha: number, t: number, seed = 0,
): void {
  if (pts.length < 2) return;
  g.lineStyle(halfW * 2, tint(TMP.slate), alpha * 0.22);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
  g.lineStyle(halfW * 0.8, tint(TMP.bolt), alpha * 0.12);
  g.strokePath();
  const n = Math.floor(t * 16);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (jitter(seed + n, i) < 0.35) continue;
    lightning(g, tint(TMP.bolt), a.x, a.y, b.x, b.y, halfW * 0.7, 1.4, alpha * 0.85, seed + n * 7 + i);
    // A spark kicked up off the floor now and then.
    if (jitter(seed + n, i + 50) > 0.8) {
      g.fillStyle(tint(TMP.boltHot), alpha);
      g.fillCircle(b.x + (jitter(seed + n, i + 3) - 0.5) * halfW, b.y - 4 - jitter(seed + n, i + 4) * 8, 1.4);
    }
  }
}

/** A puff of cloud: four overlapping circles, shaded underneath and lit on top. */
function cloudPuff(g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(tint(TMP.ink), alpha * 0.55);
  g.fillEllipse(x, y + r * 0.45, r * 3.4, r * 1.2);
  g.fillStyle(tint(TMP.cloud), alpha);
  g.fillCircle(x - r * 0.95, y + r * 0.15, r * 0.75);
  g.fillCircle(x + r * 0.95, y + r * 0.2, r * 0.7);
  g.fillCircle(x, y - r * 0.15, r);
  g.fillStyle(tint(TMP.cloudLit), alpha * 0.8);
  g.fillCircle(x - r * 0.25, y - r * 0.45, r * 0.55);
  g.fillCircle(x + r * 0.65, y - r * 0.05, r * 0.38);
}

/**
 * A thundercloud hanging `lift` px over `(x, y)`: the strike circle `r` on the floor under it, a
 * cluster of puffs, rain falling to the floor and a flicker inside when it is about to strike.
 * `charge` 0–1 is how close the next strike is.
 */
export function thunderCloud(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn,
  x: number, y: number, r: number, lift: number, alpha: number, t: number, charge: number, seed = 0,
): void {
  // The reach on the floor.
  g.fillStyle(tint(TMP.cloud), alpha * 0.12);
  g.fillEllipse(x, y, r * 2, r * 1.2);
  g.lineStyle(1.4, tint(TMP.bolt), alpha * (0.25 + charge * 0.35));
  g.strokeEllipse(x, y, r * 2, r * 1.2);
  const cy = y - lift;
  // Rain under the cloud.
  for (let i = 0; i < 14; i++) {
    const k = (t * 1.8 + jitter(seed, i)) % 1;
    const rx = x + (jitter(seed, i + 20) - 0.5) * r * 1.1;
    const ry = cy + 10 + k * lift;
    g.lineStyle(1, tint(TMP.rain), alpha * 0.5 * (1 - k * 0.5));
    g.lineBetween(rx, ry, rx - 2, ry + 9);
  }
  const drift = Math.sin(t * 0.9 + seed) * 4;
  cloudPuff(g, tint, x - 26 + drift, cy + 4, 15, alpha);
  cloudPuff(g, tint, x + 24 + drift, cy + 6, 14, alpha);
  cloudPuff(g, tint, x + drift, cy - 6, 20, alpha);
  // The charge, glowing through the bottom of the cloud.
  if (charge > 0.6) {
    const f = (charge - 0.6) / 0.4;
    g.fillStyle(tint(TMP.bolt), alpha * f * (0.25 + 0.25 * Math.sin(t * 40)));
    g.fillEllipse(x + drift, cy + 8, 50, 14);
  }
}

/** A rain puddle: a dark pool with rings spreading out of it where the drops land. */
export function rainPuddle(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, r: number, alpha: number, t: number, seed = 0,
): void {
  g.fillStyle(tint(TMP.puddle), alpha * 0.45);
  g.fillEllipse(x, y, r * 2, r * 1.25);
  g.fillStyle(tint(TMP.rain), alpha * 0.18);
  g.fillEllipse(x - r * 0.2, y - r * 0.15, r * 1.1, r * 0.55);
  g.lineStyle(1.2, tint(TMP.rain), alpha * 0.45);
  g.strokeEllipse(x, y, r * 2, r * 1.25);
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.9 + i / 3 + jitter(seed, i) * 0.3) % 1;
    const rx = x + (jitter(seed, i + 7) - 0.5) * r;
    const ry = y + (jitter(seed, i + 9) - 0.5) * r * 0.5;
    g.lineStyle(1, tint(TMP.white), alpha * (1 - k) * 0.6);
    g.strokeEllipse(rx, ry, 4 + k * 18, 2 + k * 10);
  }
}

/**
 * The Herald's weather over the whole arena: the sky darkens, rain slants across everything and
 * gales tear through sideways. `k` fades it in and out; `w`, `h` is the logical arena.
 */
export function stormSky(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, w: number, h: number, t: number, k: number,
): void {
  g.fillStyle(tint(TMP.ink), 0.22 * k);
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const s = jitter(31, i);
    const sp = 1.4 + jitter(32, i) * 0.8;
    const yy = ((t * sp + s) % 1) * (h + 60) - 30;
    const xx = ((jitter(33, i) * w + t * 140) % (w + 40)) - 20 - (yy / h) * 30;
    g.lineStyle(1, tint(TMP.rain), 0.4 * k);
    g.lineBetween(xx, yy, xx - 5, yy + 15);
  }
  // Gales: long ribbons of wind blowing across the screen.
  for (let i = 0; i < 5; i++) {
    const kk = (t * 0.55 + i / 5 + jitter(34, i) * 0.2) % 1;
    const yy = h * (0.12 + jitter(35, i) * 0.76);
    gustLayered(g, tint, -160 + kk * (w + 320), yy, 0.08, 150, 5, 0.32 * k * Math.sin(kk * Math.PI),
      { phase: t * 6 + i, seed: 40 + i, curl: 0.3 });
  }
}

/**
 * Mastery — Unrelenting Storm: the bank of cloud that hangs along the top of the arena for the
 * whole match. Grey and lit from above while it idles; `dark` 0–1 (the Herald's weather) lowers
 * it, blackens it, thickens it and sets lightning walking through its belly. `k` fades the whole
 * bank in and out, and `x0`–`x1` at `y` is the top edge it hangs from.
 */
export function stormBank(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x0: number, x1: number, y: number, t: number, dark: number, k: number,
): void {
  if (k <= 0) return;
  const w = x1 - x0;
  const drop = 10 + dark * 18;
  // The shade it throws on the floor under it, deepening with the weather.
  g.fillStyle(tint(TMP.shadow), k * (0.12 + dark * 0.2));
  g.fillRect(x0, y, w, drop + 26);
  const n = Math.ceil(w / 52) + 1;
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < n; i++) {
      const seed = 71 + layer * 37;
      const drift = ((t * (6 + layer * 4)) % 52) * (layer ? -1 : 1);
      const x = x0 + i * 52 + drift + (jitter(seed, i) - 0.5) * 18;
      if (x < x0 - 40 || x > x1 + 40) continue;
      const r = (12 + jitter(seed, i + 9) * 9) * (1 + dark * 0.45);
      const yy = y + drop * (layer ? 0.55 : 1) - 4 + Math.sin(t * 0.7 + i) * 2;
      // Grey to near-black: lerp the two cloud colours toward ink as the weather turns.
      g.fillStyle(tint(mix(TMP.cloudLit, TMP.ink, dark * 0.85)), k * (layer ? 0.5 : 0.85) * 0.55);
      g.fillEllipse(x, yy + r * 0.5, r * 3.2, r * 1.1);
      g.fillStyle(tint(mix(TMP.cloud, TMP.ink, dark * 0.7)), k * (layer ? 0.55 : 0.92));
      g.fillCircle(x - r * 0.9, yy + r * 0.1, r * 0.72);
      g.fillCircle(x + r * 0.9, yy + r * 0.15, r * 0.68);
      g.fillCircle(x, yy - r * 0.2, r);
      g.fillStyle(tint(mix(TMP.cloudLit, TMP.slate, dark)), k * (layer ? 0.4 : 0.75) * (1 - dark * 0.55));
      g.fillCircle(x - r * 0.25, yy - r * 0.5, r * 0.5);
    }
  }
  // Rain hanging from the belly: a few strands at idle, a curtain in the Herald's weather.
  const strands = Math.round(10 + dark * 40);
  for (let i = 0; i < strands; i++) {
    const kk = (t * (1.6 + jitter(74, i)) + jitter(75, i)) % 1;
    const rx = x0 + jitter(76, i) * w;
    const ry = y + drop + 8 + kk * (30 + dark * 40);
    g.lineStyle(1, tint(TMP.rain), k * (0.35 + dark * 0.3) * (1 - kk));
    g.lineBetween(rx, ry, rx - 2, ry + 8);
  }
  // Lightning walking through the cloud once it has turned.
  if (dark > 0.35) {
    const beat = Math.floor(t * 3);
    for (let i = 0; i < 2; i++) {
      const on = jitter(beat, i) > 0.45;
      if (!on) continue;
      const lx = x0 + jitter(beat + 3, i) * w;
      const ly = y + drop * 0.6;
      lightning(g, tint(TMP.bolt), lx, ly, lx + (jitter(beat, i + 5) - 0.5) * 160, ly + (jitter(beat, i + 6) - 0.2) * 14, 7,
        1.6, k * (dark - 0.35) * 1.4, beat * 7 + i);
      g.fillStyle(tint(TMP.bolt), k * dark * 0.18);
      g.fillEllipse(lx, ly, 120, 26);
    }
  }
}

/**
 * Gale Uppercut: a body thrown into the air. The tag rides over it — a little storm-slate pill with
 * an arrow that points up while it climbs and down (reddening) while it falls, and `boosts` pips
 * for every Click that has juggled it higher.
 */
export function knockTag(
  g: Phaser.GameObjects.Graphics, tint: TempestColorFn, x: number, y: number, rising: boolean, fallK: number,
  boosts: number, alpha: number,
): void {
  g.fillStyle(tint(TMP.ink), alpha * 0.72);
  g.fillRoundedRect(x - 15, y - 9, 30, 18, 9);
  g.lineStyle(1, tint(TMP.gust), alpha * 0.55);
  g.strokeRoundedRect(x - 15, y - 9, 30, 18, 9);
  const c = rising ? tint(TMP.white) : tint(mix(TMP.white, TMP.red, fallK));
  chevron(g, c, x - 5, y + (rising ? 2 : -2), 5, rising ? 3 : -3, alpha, 2);
  chevron(g, c, x - 5, y + (rising ? -2 : 2), 5, rising ? 3 : -3, alpha * 0.6, 2);
  for (let i = 0; i < Math.min(3, boosts); i++) {
    g.fillStyle(tint(TMP.bolt), alpha);
    g.fillCircle(x + 4 + i * 4.5, y, 1.8);
  }
}

/** A skull in a forecast card. */
function skull(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number): void {
  g.fillStyle(0xf2f0e6, alpha);
  g.fillCircle(x, y, r);
  g.fillRoundedRect(x - r * 0.6, y + r * 0.4, r * 1.2, r * 0.75, r * 0.2);
  g.fillStyle(0x111111, alpha);
  g.fillCircle(x - r * 0.4, y + r * 0.05, r * 0.3);
  g.fillCircle(x + r * 0.4, y + r * 0.05, r * 0.3);
  g.fillTriangle(x, y + r * 0.3, x - r * 0.13, y + r * 0.55, x + r * 0.13, y + r * 0.55);
  for (let i = -1; i <= 1; i++) g.fillRect(x + i * r * 0.3 - 0.6, y + r * 0.75, 1.2, r * 0.35);
}

const HERALD_TICKER =
  '⚠ BREAKING: SEVERE STORM WARNING IN EFFECT  •  TOTAL ANNIHILATION EXPECTED BY THIS AFTERNOON  •  '
  + 'SEEK SHELTER IMMEDIATELY  •  THERE IS NO SHELTER  •  HAIL THE SIZE OF REGRETS  •  '
  + 'WINDS GUSTING TO "YES"  •  CHANCE OF DOOM: 100%  •  ';

/**
 * Herald of Doom: the Tempest cuts in on the broadcast. A screen-space TV segment slides down
 * over the top of the arena — the storm orb in a tie at the weather map with a pointer, the
 * channel bug, a 5-day forecast of nothing but skulls and DEATH, and a red BREAKING ticker
 * crawling across the bottom. Purely a tell: it does not pause anything, and the weather it
 * forecasts starts when the slam lands.
 */
export class HeraldBroadcast extends FxBase {
  constructor(scene: Phaser.Scene, tint: TempestColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * `screenW` centres it; `scale` and `top` let a preview box fit the whole segment. The set is
   * drawn in its own 470×268 space and placed by moving and scaling the Graphics and the texts.
   */
  play(screenW: number, ms = 2600, depth = 24, { scale = 1, top = 14 } = {}): void {
    const W = 470;
    const H = 268;
    const x0 = 0;
    const left = screenW / 2 - (W * scale) / 2;
    const tint = this.tint;
    const g = this.gfx(depth).setScrollFactor(0).setScale(scale);
    const txt = (s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text => {
      const o = this.scene.add.text(0, 0, s, {
        fontSize: `${size}px`, fontFamily: 'Arial Black', color, ...extra,
      }).setScrollFactor(0).setDepth(depth + 0.02);
      this.sink?.(o);
      return o;
    };
    const channel = txt('⛈ TEMPEST 7  STORM WATCH', 11, '#f4f9ff');
    const live = txt('● LIVE', 10, '#ff4a3d');
    const headline = txt('EXTENDED FORECAST', 12, '#fff3a6');
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'].map((d) => txt(d, 9, '#c9e3ff').setOrigin(0.5));
    const deaths = days.map(() => txt('DEATH', 9, '#ff4a3d').setOrigin(0.5));
    const breaking = txt('BREAKING', 10, '#ffffff');
    // The crawl is one Text per word: Phaser's Text renderer ignores crops, so a word is simply
    // hidden whenever it is not wholly inside the band.
    const words = HERALD_TICKER.split(' ').filter(Boolean).map((w) => txt(w, 10, '#ffffff', { fontFamily: 'Arial' }));
    const wordX: number[] = [];
    let tickerW = 0;
    for (const w of words) { wordX.push(tickerW); tickerW += w.width + 4; }
    const all = [channel, live, headline, ...days, ...deaths, breaking, ...words];
    const start = this.scene.time.now;

    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: ms,
      onUpdate: (tw) => {
        if (!g.active) return;
        const t = Number(tw.getValue());
        const sec = (this.scene.time.now - start) / 1000;
        // Slides down, holds, slides back up.
        const inK = easeOut(Math.min(1, t / 0.12));
        const outK = t > 0.88 ? easeOut((t - 0.88) / 0.12) : 0;
        const slideY = top - ((1 - inK) + outK) * (H + 30) * scale;
        const y0 = 0;
        g.setPosition(left, slideY);
        // Texts are laid out in the set's own space too, then carried to the screen.
        const at = (o: Phaser.GameObjects.Text, lx: number, ly: number): Phaser.GameObjects.Text =>
          o.setPosition(left + lx * scale, slideY + ly * scale).setScale(scale);
        g.clear();
        // The set: a bezel, a studio-blue backdrop.
        g.fillStyle(0x05070d, 0.92);
        g.fillRoundedRect(x0 - 6, y0 - 6, W + 12, H + 12, 10);
        g.fillStyle(0x16233f, 1);
        g.fillRect(x0, y0, W, H);
        g.fillStyle(0x1f3360, 1);
        g.fillRect(x0, y0, W, 26);
        // The map: the arena as a little green-grey board under a red storm spiral.
        const mx = x0 + 170;
        const my = y0 + 40;
        const mw = 284;
        const mh = 104;
        g.fillStyle(0x2f4a3a, 1);
        g.fillRect(mx, my, mw, mh);
        g.lineStyle(1, 0x557a62, 0.8);
        for (let i = 1; i < 6; i++) g.lineBetween(mx + (mw * i) / 6, my, mx + (mw * i) / 6, my + mh);
        for (let i = 1; i < 3; i++) g.lineBetween(mx, my + (mh * i) / 3, mx + mw, my + mh * i / 3);
        g.fillStyle(0xff4a3d, 0.25);
        g.fillCircle(mx + mw * 0.55, my + mh * 0.5, 54);
        swirl(g, 0xff4a3d, mx + mw * 0.55, my + mh * 0.5, 50, 0.95, { arms: 4, turns: 1.2, phase: -sec * 5, width: 3 });
        swirl(g, 0xffd166, mx + mw * 0.55, my + mh * 0.5, 30, 0.8, { arms: 3, turns: 1, phase: -sec * 7, width: 2 });
        for (let i = 0; i < 3; i++) {
          const a = sec * 3 + i * 2.1;
          lightning(g, 0xfff3a6, mx + mw * 0.55, my + mh * 0.5, mx + mw * 0.55 + Math.cos(a) * 60, my + mh * 0.5 + Math.sin(a) * 40,
            6, 1.5, 0.8, Math.floor(sec * 12) + i);
        }
        g.lineStyle(2, 0x0b1020, 1);
        g.strokeRect(mx, my, mw, mh);
        // The forecaster: the storm orb in a tie, cloud ring and all, pointing at the map.
        const fx = x0 + 82;
        const fy = y0 + 112;
        const bob = Math.sin(sec * 5) * 2;
        g.fillStyle(0x0b1020, 1);
        g.fillRoundedRect(fx - 46, fy + 30, 92, 70, 18);
        g.fillStyle(0x23314f, 1);
        g.fillRoundedRect(fx - 42, fy + 32, 84, 66, 16);
        g.fillStyle(0xf4f9ff, 1);
        g.fillTriangle(fx - 12, fy + 32, fx + 12, fy + 32, fx, fy + 52);
        g.fillStyle(0xff4a3d, 1);
        g.fillTriangle(fx - 5, fy + 34, fx + 5, fy + 34, fx, fy + 42);
        g.fillTriangle(fx - 6, fy + 42, fx + 6, fy + 42, fx, fy + 66);
        g.fillStyle(tint(TMP.deep), 1);
        g.fillCircle(fx, fy + bob, 34);
        g.fillStyle(tint(TMP.storm), 1);
        g.fillCircle(fx, fy + bob, 30);
        g.fillStyle(tint(TMP.sky), 0.8);
        g.fillCircle(fx - 6, fy - 6 + bob, 18);
        swirl(g, tint(TMP.gust), fx, fy + bob, 24, 0.35, { arms: 3, turns: 0.8, phase: sec * 1.5, width: 1.6 });
        for (let i = 0; i < 6; i++) {
          const a = sec * 1.4 + (i / 6) * TAU;
          const px = fx + Math.cos(a) * 34;
          const py = fy - 36 + Math.sin(a) * 7 + bob;
          g.fillStyle(tint(Math.sin(a) > 0 ? TMP.white : TMP.gust), 0.95);
          g.fillCircle(px, py, 7);
        }
        // The eyes, fixed on the camera, and a grim little smile.
        for (const s of [-1, 1]) {
          g.fillStyle(0xf4f9ff, 1);
          g.fillCircle(fx + s * 11, fy - 2 + bob, 7);
          g.fillStyle(0x050a14, 1);
          g.fillCircle(fx + s * 11 + 1.5, fy - 1 + bob, 3.4);
        }
        g.lineStyle(2, 0x050a14, 1);
        g.beginPath();
        g.arc(fx, fy + 10 + bob, 9, 0.2, Math.PI - 0.2);
        g.strokePath();
        // A ball hand on a pointer, tapping the storm.
        const tap = Math.sin(sec * 9) * 6;
        const hx = fx + 44;
        const hy = fy + 22 + bob;
        g.lineStyle(3, 0x8a6a3a, 1);
        g.lineBetween(hx, hy, mx + mw * 0.55 - 30 + tap, my + mh * 0.5 + 6);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(mx + mw * 0.55 - 30 + tap, my + mh * 0.5 + 6, 2.5);
        g.fillStyle(tint(TMP.sky), 1);
        g.fillCircle(hx, hy, 8);
        g.fillStyle(tint(TMP.white), 1);
        g.fillCircle(hx - 2, hy - 2, 4);
        // The five-day forecast.
        const cy = y0 + 172;
        for (let i = 0; i < 5; i++) {
          const cx = mx + 2 + i * 57;
          g.fillStyle(0x0b1020, 0.9);
          g.fillRoundedRect(cx, cy, 52, 62, 6);
          g.lineStyle(1, 0x3d5a8c, 1);
          g.strokeRoundedRect(cx, cy, 52, 62, 6);
          skull(g, cx + 26, cy + 30 + Math.sin(sec * 6 + i) * 1.5, 10, 1);
          at(days[i], cx + 26, cy + 9);
          at(deaths[i], cx + 26, cy + 53);
        }
        // The ticker.
        const ty = y0 + H - 22;
        g.fillStyle(0x0b1020, 1);
        g.fillRect(x0, ty, W, 22);
        g.fillStyle(0xc81e1e, 1);
        g.fillRect(x0, ty, 74, 22);
        g.fillTriangle(x0 + 74, ty, x0 + 84, ty + 11, x0 + 74, ty + 22);
        at(channel, x0 + 10, y0 + 6);
        const blink = Math.floor(sec * 2.5) % 2 === 0;
        at(live, x0 + W - 52, y0 + 7).setAlpha(blink ? 1 : 0.35);
        at(headline, mx, cy - 20);
        at(breaking, x0 + 8, ty + 5);
        // Crawl right to left through the band.
        const scroll = sec * 120;
        const bandX = x0 + 90;
        const bandW = W - 96;
        for (let i = 0; i < words.length; i++) {
          const wx = (((wordX[i] - scroll) % tickerW) + tickerW) % tickerW;
          at(words[i], bandX + wx, ty + 4).setVisible(wx + words[i].width <= bandW);
        }
      },
      onComplete: () => {
        g.destroy();
        for (const o of all) o.destroy();
      },
    });
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

  // ── Upgrades ─────────────────────────────────────────────────────────

  /** A hailstone breaking: a frosty flash, a ring of rime and a few chips tumbling out. */
  shatter(x: number, y: number, r: number): void {
    this.flashIn(x, y, r * 0.4, TMP.white, TMP.ice, 10);
    this.ring(x, y, r * 0.2, r * 0.8, 300, TMP.ice, 2.5);
    const chips = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * TAU + Math.random(), d: r * (0.5 + Math.random() * 0.4) }));
    this.anim(9, 360, (g, t) => {
      const e = easeOut(t);
      for (const c of chips) {
        iceShard(g, this.tint, x + Math.cos(c.a) * c.d * e, y + Math.sin(c.a) * c.d * e, c.a + t * 4, 7, 1 - t);
      }
    });
  }

  /** The warning before a bolt: a ring tightening on the spot it will hit. */
  strikeWarn(x: number, y: number, r: number, ms: number): void {
    this.anim(4, ms, (g, t) => {
      g.fillStyle(this.tint(TMP.bolt), 0.08 + t * 0.14);
      g.fillEllipse(x, y, r * 2, r * 1.2);
      g.lineStyle(1.6, this.tint(TMP.bolt), 0.4 + t * 0.5);
      g.strokeEllipse(x, y, r * 2 * (1.6 - t * 0.6), r * 1.2 * (1.6 - t * 0.6));
    });
  }

  /** A bolt out of the sky onto `(x, y)`: a white column, a forked crown and a scorch. */
  strike(x: number, y: number, r: number, fromY = y - 420): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.8, TMP.boltHot, TMP.bolt, 10);
    this.ring(x, y, 6, r * 1.1, 320, TMP.bolt, 2.5);
    this.anim(10, 260, (g, t) => {
      const a = (1 - t);
      lightning(g, this.tint(TMP.bolt), x + (jitter(seed, 1) - 0.5) * 40, fromY, x, y, 22, 6 * a, 0.35 * a, seed + Math.floor(t * 10));
      lightning(g, this.tint(TMP.boltHot), x + (jitter(seed, 1) - 0.5) * 40, fromY, x, y, 22, 2.4 * a, a, seed + Math.floor(t * 10));
      for (let i = 0; i < 3; i++) {
        const ang = Math.PI + (i + 0.5) / 3 * Math.PI;
        lightning(g, this.tint(TMP.bolt), x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.5 + r * 0.4, 6, 1.4, a * 0.8, seed + i + 9);
      }
    });
    this.anim(4, 900, (g, t) => {
      g.fillStyle(this.tint(TMP.shadow), (1 - t) * 0.45);
      g.fillEllipse(x, y, r * 1.2, r * 0.7);
    });
  }

  /** The Cyclone: a tall funnel spun up out of the floor where the Tempest stands. */
  cyclone(x: number, y: number): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 26, TMP.white, TMP.sky, 9);
    this.anim(9, 900, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - t;
      for (let i = 0; i < 7; i++) {
        const k = i / 6;
        const yy = y - k * 170 * e;
        const rr = 16 + k * 46;
        swirl(g, this.tint(i % 2 ? TMP.gust : TMP.white), x + Math.sin(t * 9 + i) * 6 * k, yy, rr, fade * (0.8 - k * 0.3),
          { arms: 3, turns: 0.7, phase: -t * 14 + i + seed, width: 2.4 - k, squash: 0.35 });
      }
      g.lineStyle(2.4, this.tint(TMP.white), fade * 0.7);
      g.strokeEllipse(x, y, 70 + e * 30, 24 + e * 10);
    });
    this.dust(x, y, 10, 60, 600);
  }

  /**
   * Gale Uppercut landing: a fist of wind driven up under the body — a flash, a column of gusts
   * climbing out of the floor, rising chevrons and a ring thrown flat around the feet.
   */
  uppercut(x: number, y: number): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 22, TMP.white, TMP.sky, 10);
    this.ring(x, y + 8, 8, 64, 340, TMP.gust, 3, 4);
    this.anim(9, 520, (g, t) => {
      const e = easeOut(t);
      const fade = 1 - t;
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        gustLayered(g, this.tint, x + (jitter(seed, i) - 0.5) * 22, y + 14 - k * 30 * e, -Math.PI / 2 + (jitter(seed, i + 5) - 0.5) * 0.5,
          60 + e * 90, 6 - k * 2, fade * (0.95 - k * 0.3), { phase: t * 10 + i, seed: seed + i, curl: 0.5 });
      }
      for (let i = 0; i < 4; i++) {
        const k = (t * 1.6 + i / 4) % 1;
        chevron(g, this.tint(TMP.white), x + (i - 1.5) * 10, y - 20 - k * 90, 8, 5, fade * (1 - k), 2.4);
      }
    });
    this.dust(x, y, 8, 50, 480);
  }

  /** A launched body slammed back into the floor: a crater ring, cracks and dust. */
  knockSlam(x: number, y: number, k: number): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 20 + k * 20, TMP.white, TMP.storm, 9);
    this.ring(x, y, 10, 50 + k * 50, 380, TMP.white, 3.5, 4);
    this.anim(4, 900, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(TMP.shadow), fade * 0.5);
      g.fillEllipse(x, y + 12, 50 + k * 30, 18 + k * 8);
      g.lineStyle(2, this.tint(TMP.dust), fade * 0.8);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + seed;
        const r1 = 14 + k * 10;
        const r2 = r1 + 14 + jitter(seed, i) * (18 + k * 20);
        const mx = x + Math.cos(a + 0.2) * (r1 + r2) / 2;
        const my = y + 12 + Math.sin(a + 0.2) * (r1 + r2) / 4;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r1, y + 12 + Math.sin(a) * r1 * 0.5);
        g.lineTo(mx, my);
        g.lineTo(x + Math.cos(a) * r2, y + 12 + Math.sin(a) * r2 * 0.5);
        g.strokePath();
      }
    });
    this.dust(x, y, 10, 50 + k * 40, 600);
  }

  /** A static trail biting a body. */
  staticZap(x: number, y: number): void {
    const seed = Math.random() * 999;
    this.anim(10, 200, (g, t) => {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + seed;
        lightning(g, this.tint(TMP.bolt), x, y + 12, x + Math.cos(a) * 18, y + Math.sin(a) * 14 - 6, 5, 1.4, 1 - t, seed + i);
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
