import type Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit } from '../../../../art/IsleArt';

/**
 * Shared bits for the Stormeye Court: its palette, a frame clock, a few geometry helpers, and the
 * props that turn up both in the world and in the fights — a copper lightning rod, a jagged bolt,
 * a storm cloud, a hailstone, a slanting sheet of rain, a brass breath-meter and a corked bottle of
 * taxed breath. Anything bigger is drawn bespoke where it is used.
 */

type G = Phaser.GameObjects.Graphics;

/**
 * The court's colours. Stormeye is a walled town in the calm eye of a storm that never ends: wet
 * slate and blue-grey granite, black puddles that hold the sky, cobbles slick as fish, and every
 * roof bristling with copper — rods, gutters, weathercocks — gone green where the rain runs off it.
 * The townsfolk wear yellow oilskins because yellow is the only colour you can find in a squall.
 * Beyond the walls the gale is bruise-purple and never still. The King's brass shows on the
 * breath-meters, and the lightning is the whitest thing on the isle.
 */
export const S = {
  slate: 0x3c4552,
  slateLit: 0x56606e,
  slateDark: 0x262c36,
  granite: 0x6a7380,
  graniteLit: 0x8b94a2,
  graniteDark: 0x48505c,
  cobble: 0x4e5866,
  cobbleLit: 0x6c7684,
  wet: 0x2a323e,
  puddle: 0x1c2430,
  puddleLit: 0x7a8ca8,
  moss: 0x3e5244,
  copper: 0xc07a44,
  copperLit: 0xe8a66c,
  copperDark: 0x7a4428,
  verdigris: 0x4fa08c,
  verdigrisLit: 0x86d0bc,
  brass: 0xc9a440,
  brassLit: 0xf0d27a,
  brassDark: 0x7a6224,
  oilskin: 0xe8c23a,
  oilskinDark: 0xa8862a,
  timber: 0x4a3e36,
  timberLit: 0x6a5a4c,
  glass: 0xbfe0f0,
  glassDark: 0x6a90a8,
  water: 0x3a5a6e,
  waterLit: 0x6a94aa,
  waterDeep: 0x1e3444,
  /** The gale beyond the walls. */
  gale: 0x4a4466,
  galeLit: 0x7a74a0,
  galeDark: 0x2a2640,
  cloud: 0x5a5a78,
  cloudLit: 0x8c8cae,
  cloudDark: 0x34344c,
  /** The calm eye — the one patch of blue sky in Stormeye. */
  eye: 0x8ec8f0,
  eyeLit: 0xd8f0ff,
  bolt: 0xf4f0ff,
  boltGlow: 0xb8a8ff,
  boltHot: 0xfff8c0,
  hail: 0xe4f2fa,
  hailShade: 0xa8c4d4,
  rain: 0xa8bcd8,
  lamp: 0xffd88a,
  mercury: 0xd0d8e0,
  red: 0xd04848,
};

export const SCOL = {
  bolt: '#f4f0ff',
  violet: '#c8b8ff',
  red: '#ff6a5a',
  green: '#a8f0b0',
  blue: '#a8d8ff',
  ice: '#e4f6ff',
  brass: '#ffd77a',
  rain: '#b8cce8',
  oil: '#ffe08a',
};

/**
 * A frame clock driven by the scene time each `update` is handed. Gimmicks and item scripts
 * derive their own step from it, so they behave the same whatever unit the caller's `dt` is in.
 */
export class Clock {
  private last = -1;
  /** Seconds since the previous tick, clamped so a hitch never teleports anything. */
  tick(time: number): number {
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, (time - this.last) / 1000));
    this.last = time;
    return dt;
  }
}

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const vx = x2 - x1, vy = y2 - y1;
  const L2 = vx * vx + vy * vy;
  let t = L2 > 0 ? ((px - x1) * vx + (py - y1) * vy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

/**
 * A small seeded jitter so a shape drawn every frame keeps the same form: the same seed and index
 * always return the same number in 0..1.
 */
export const jit = (seed: number, i: number): number => {
  const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Wrap an angle into −π..π. */
export const wrapA = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};

// ── Props ────────────────────────────────────────────────────────────

/**
 * A copper lightning rod: a tall green-streaked shaft on a granite footing, glass insulators
 * banded up it, a crown of three points at the tip and a braided earth-strap running down into the
 * ground. `glow` 0–1 lights the tip as charge gathers. `x,y` is the foot.
 */
export function drawRod(g: G, x: number, y: number, h: number, glow = 0, alpha = 1): void {
  g.fillStyle(0x000000, 0.3 * alpha); g.fillEllipse(x, y + 2, 28, 8);
  g.fillStyle(S.graniteDark, alpha); g.fillRect(x - 9, y - 10, 18, 12);
  g.fillStyle(S.granite, alpha); g.fillRect(x - 8, y - 12, 16, 4);
  g.fillStyle(S.copperDark, alpha); g.fillRect(x - 3, y - h, 6, h - 8);
  g.fillStyle(S.copper, alpha); g.fillRect(x - 2, y - h, 4, h - 8);
  g.fillStyle(S.copperLit, alpha * 0.9); g.fillRect(x - 2, y - h, 1.5, h - 8);
  // Verdigris where the rain runs.
  for (let i = 0; i < 4; i++) { g.fillStyle(S.verdigris, alpha * 0.7); g.fillRect(x - 2, y - h * (0.2 + i * 0.2), 4, 3 + i); }
  // Glass insulators.
  for (const k of [0.35, 0.7]) {
    g.fillStyle(S.glassDark, alpha); g.fillEllipse(x, y - h * k, 12, 6);
    g.fillStyle(S.glass, alpha); g.fillEllipse(x, y - h * k - 1, 10, 4);
  }
  // The crown of points.
  const ty = y - h;
  g.fillStyle(S.copperLit, alpha);
  g.fillTriangle(x - 2, ty, x + 2, ty, x, ty - 12);
  g.fillTriangle(x - 6, ty + 2, x - 3, ty + 2, x - 7, ty - 7);
  g.fillTriangle(x + 3, ty + 2, x + 6, ty + 2, x + 7, ty - 7);
  g.fillStyle(S.copper, alpha); g.fillRect(x - 7, ty, 14, 3);
  // The earth-strap.
  g.lineStyle(1.5, S.copperDark, alpha);
  g.beginPath(); g.moveTo(x + 2, y - h * 0.3);
  for (let i = 1; i <= 5; i++) g.lineTo(x + 4 + (i % 2) * 2, y - h * 0.3 + i * h * 0.06);
  g.strokePath();
  if (glow > 0.02) {
    g.fillStyle(S.boltGlow, 0.18 * glow * alpha); g.fillCircle(x, ty - 6, 18 + glow * 10);
    g.fillStyle(S.bolt, 0.8 * glow * alpha); g.fillCircle(x, ty - 8, 3 + glow * 2);
  }
}

/**
 * A lightning bolt between two points: a jagged main channel that wanders off the straight line
 * and comes back, a few short forks, a violet glow under it and a white-hot core. `seed` fixes the
 * shape; `wiggle` is how far it may wander, in px.
 */
export function drawBolt(g: G, x1: number, y1: number, x2: number, y2: number, seed: number, alpha = 1, w = 3, wiggle = 18): void {
  const n = 9;
  const pts: { x: number; y: number }[] = [];
  const dx = x2 - x1, dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const off = i === 0 || i === n ? 0 : (jit(seed, i) - 0.5) * 2 * wiggle * Math.sin(u * Math.PI);
    pts.push({ x: x1 + dx * u + nx * off, y: y1 + dy * u + ny * off });
  }
  const trace = (lw: number, c: number, a: number) => {
    g.lineStyle(lw, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.strokePath();
  };
  trace(w * 4, S.boltGlow, 0.18 * alpha);
  trace(w * 1.8, S.boltGlow, 0.55 * alpha);
  trace(w, S.bolt, alpha);
  // Forks off three of the joints.
  for (let k = 0; k < 3; k++) {
    const i = 2 + Math.floor(jit(seed, k + 20) * (n - 3));
    const p = pts[i];
    const fa = Math.atan2(dy, dx) + (jit(seed, k + 30) < 0.5 ? -1 : 1) * (0.5 + jit(seed, k + 40) * 0.6);
    const fl = L * (0.08 + jit(seed, k + 50) * 0.1);
    const mx = p.x + Math.cos(fa) * fl * 0.5 + (jit(seed, k + 60) - 0.5) * 8, my = p.y + Math.sin(fa) * fl * 0.5;
    g.lineStyle(w * 0.6, S.bolt, 0.8 * alpha);
    g.lineBetween(p.x, p.y, mx, my);
    g.lineBetween(mx, my, p.x + Math.cos(fa) * fl, p.y + Math.sin(fa) * fl);
  }
}

/**
 * A storm cloud: a flat-bottomed heap of overlapping puffs, darker underneath, with a lit crown.
 * `s` is the half-width. Drawn in the fights' air layer and in the world's gale.
 */
export function drawCloud(g: G, x: number, y: number, s: number, alpha = 1, tone = S.cloud, seed = 1): void {
  g.fillStyle(dim(tone, 0.35), alpha); g.fillEllipse(x, y + s * 0.18, s * 2.1, s * 0.62);
  for (let i = 0; i < 5; i++) {
    const px = x + (i - 2) * s * 0.42 + (jit(seed, i) - 0.5) * s * 0.15;
    const r = s * (0.32 + jit(seed, i + 7) * 0.18) * (i === 2 ? 1.25 : 1);
    g.fillStyle(tone, alpha); g.fillCircle(px, y - r * 0.35, r);
  }
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * s * 0.45;
    g.fillStyle(lit(tone, 0.25), alpha * 0.8); g.fillCircle(px - s * 0.06, y - s * 0.32, s * 0.2);
  }
}

/** A hailstone: a lumpy white ball with a blue shadow side and a glint. */
export function drawHailstone(g: G, x: number, y: number, r: number, alpha = 1): void {
  g.fillStyle(S.hailShade, alpha); g.fillCircle(x + r * 0.12, y + r * 0.12, r);
  g.fillStyle(S.hail, alpha); g.fillCircle(x - r * 0.06, y - r * 0.06, r * 0.86);
  g.fillStyle(0xffffff, alpha * 0.9); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.28);
}

/**
 * A sheet of slanting rain over a rect: short streaks raking down to the right, scrolling with
 * time. Cheap enough for a per-frame overlay.
 */
export function drawRainSheet(g: G, x: number, y: number, w: number, h: number, t: number, density: number, alpha = 0.5, slant = 0.35, seed = 3): void {
  const n = Math.floor((w * h) / 2200 * density);
  g.lineStyle(1, S.rain, alpha);
  for (let i = 0; i < n; i++) {
    const fx = jit(seed, i), fy = jit(seed + 1, i);
    const sp = 0.8 + jit(seed + 2, i) * 0.6;
    const yy = y + ((fy * h + t * 520 * sp) % h);
    const xx = x + ((fx * w + t * 520 * sp * slant) % w);
    g.lineBetween(xx, yy, xx + 12 * slant, yy + 12);
  }
}

/**
 * The King's brass breath-meter: a round gauge strapped over the heart, a needle across a dial of
 * five ticks and a tiny bellows-wheel on its side. `k` 0–1 is where the needle sits.
 */
export function drawMeter(g: G, x: number, y: number, r: number, k = 0.5, alpha = 1): void {
  g.fillStyle(S.brassDark, alpha); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(S.brass, alpha); g.fillCircle(x, y, r);
  g.fillStyle(0xf4ecd4, alpha); g.fillCircle(x, y, r * 0.74);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.85 + i * 0.325);
    g.lineStyle(1, 0x3a3020, alpha);
    g.lineBetween(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  }
  const na = Math.PI * (0.85 + k * 1.3);
  g.lineStyle(Math.max(1, r * 0.14), S.red, alpha); g.lineBetween(x, y, x + Math.cos(na) * r * 0.66, y + Math.sin(na) * r * 0.66);
  g.fillStyle(S.brassDark, alpha); g.fillCircle(x, y, r * 0.14);
  g.fillStyle(S.brassLit, alpha * 0.8); g.fillCircle(x - r * 0.45, y - r * 0.5, r * 0.18);
}

/**
 * A corked bottle of taxed breath: a round-bellied glass flask, a wax-sealed cork, a brass tally
 * tag on a string — and inside, a little curl of trapped mist. `x,y` is its base.
 */
export function drawBreathBottle(g: G, x: number, y: number, s: number, t = 0, alpha = 1): void {
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x, y + 1, s * 1.6, s * 0.4);
  g.fillStyle(S.glassDark, alpha * 0.9); g.fillCircle(x, y - s * 0.75, s * 0.8);
  g.fillRect(x - s * 0.28, y - s * 1.85, s * 0.56, s * 0.7);
  g.fillStyle(S.glass, alpha * 0.55); g.fillCircle(x, y - s * 0.75, s * 0.7);
  // The trapped breath, turning.
  const a = t * 2;
  g.fillStyle(0xffffff, alpha * 0.65);
  g.fillEllipse(x + Math.cos(a) * s * 0.2, y - s * 0.78 + Math.sin(a) * s * 0.12, s * 0.7, s * 0.3);
  g.fillStyle(0xffffff, alpha * 0.4); g.fillEllipse(x - Math.cos(a) * s * 0.18, y - s * 0.62, s * 0.5, s * 0.2);
  g.fillStyle(0xffffff, alpha * 0.8); g.fillRect(x - s * 0.5, y - s * 1.15, s * 0.16, s * 0.4);
  // Cork and seal.
  g.fillStyle(0xa8805a, alpha); g.fillRect(x - s * 0.24, y - s * 2.05, s * 0.48, s * 0.3);
  g.fillStyle(S.red, alpha); g.fillCircle(x, y - s * 1.85, s * 0.2);
  g.lineStyle(1, S.brassDark, alpha); g.lineBetween(x + s * 0.24, y - s * 1.8, x + s * 0.6, y - s * 1.4);
  g.fillStyle(S.brass, alpha); g.fillRect(x + s * 0.5, y - s * 1.45, s * 0.3, s * 0.36);
}

/**
 * A weathercock on a spindle: a strutting copper rooster on a crossed N-S-E-W, turned by `a`
 * (radians, 0 = facing right). Drawn flat — its shadow is the giveaway that it turns.
 */
export function drawWeathercock(g: G, x: number, y: number, s: number, a: number, alpha = 1): void {
  g.lineStyle(1.5, S.copperDark, alpha); g.lineBetween(x, y, x, y - s * 1.6);
  g.lineBetween(x - s * 0.7, y - s * 0.6, x + s * 0.7, y - s * 0.6);
  g.fillStyle(S.copperDark, alpha); g.fillCircle(x, y - s * 0.6, 1.6);
  const face = Math.cos(a);
  const w = Math.max(0.25, Math.abs(face)) * (face >= 0 ? 1 : -1);
  const cy = y - s * 1.6;
  // Body, tail and comb, squashed by how side-on it is.
  g.fillStyle(S.verdigris, alpha); g.fillEllipse(x, cy - s * 0.2, s * 0.9 * Math.abs(w), s * 0.5);
  g.fillTriangle(x - s * 0.45 * w, cy - s * 0.2, x - s * 0.8 * w, cy - s * 0.8, x - s * 0.2 * w, cy - s * 0.35);
  g.fillCircle(x + s * 0.35 * w, cy - s * 0.5, s * 0.18);
  g.fillStyle(S.red, alpha); g.fillTriangle(x + s * 0.3 * w, cy - s * 0.66, x + s * 0.44 * w, cy - s * 0.66, x + s * 0.38 * w, cy - s * 0.82);
  g.fillStyle(S.copperLit, alpha); g.fillTriangle(x + s * 0.5 * w, cy - s * 0.52, x + s * 0.5 * w, cy - s * 0.44, x + s * 0.68 * w, cy - s * 0.48);
}
