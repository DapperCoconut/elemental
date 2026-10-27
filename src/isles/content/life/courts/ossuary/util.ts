import type Phaser from 'phaser';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit } from '../../../../art/IsleArt';

/**
 * Shared bits for the Ossuary Court: its palette, a frame clock, a few geometry helpers, and the
 * props that turn up both in the world and in the fights — a skull, a long bone, a white lily, a
 * chapel candle, a skin of marrow-jelly, a rib. Anything bigger is drawn bespoke where it is used.
 */

type G = Phaser.GameObjects.Graphics;

/**
 * The court's colours. The Ossuary is where the Empress's garden puts its dead: black garden
 * loam, paths of crushed bone, violet-grey chapel stone, yew and cypress almost black against it,
 * and white everywhere it is not dark — bone, lilies, candle wax. The only warm colours are the
 * candles and the marrow in the wells; the only red is sinew. The Empress's verdigris shows on the
 * tithe-plates, nowhere else.
 */
export const O = {
  loam: 0x2e2622,
  loamLit: 0x46392f,
  loamDeep: 0x1c1613,
  moss: 0x3c4632,
  mossLit: 0x5a6a46,
  yew: 0x1f2c1d,
  yewLit: 0x33472b,
  cypress: 0x18241b,
  bone: 0xe6dcc4,
  boneLit: 0xfaf4e4,
  boneShade: 0xbdb195,
  boneDark: 0x857a62,
  gravel: 0xcbc1a8,
  gravelDark: 0x9e957f,
  stone: 0x6c6672,
  stoneLit: 0x8e8896,
  stoneDark: 0x45404b,
  slate: 0x37323d,
  lily: 0xf7f5ee,
  lilyShade: 0xd8d6ca,
  lilyThroat: 0xe8dc8a,
  stem: 0x4a6a3c,
  stemDark: 0x2f4527,
  marrow: 0xc0564a,
  marrowLit: 0xf0906c,
  marrowHot: 0xffcfa0,
  marrowDeep: 0x6a2228,
  sinew: 0xa3262e,
  sinewLit: 0xd8505a,
  candle: 0xffd27e,
  candleHot: 0xfff2c8,
  wax: 0xece2c6,
  iron: 0x2c2a30,
  ironLit: 0x5c5a64,
  timber: 0x4a3a30,
  timberLit: 0x6c5646,
  /** The Empress's livery — verdigris copper, with a little gilt. */
  verdigris: 0x3f9a80,
  gilt: 0xc9a84a,
  holy: 0xfff0b8,
  dusk: 0x8a7aa8,
};

export const OCOL = {
  bone: '#f3ead2',
  red: '#ff6a5a',
  sinew: '#ff7a80',
  green: '#a8f0b0',
  marrow: '#ffb08a',
  holy: '#fff0b8',
  lily: '#ffffff',
  dusk: '#c8b8ff',
  gold: '#ffd77a',
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

/** Is p inside the triangle abc? (Sign test.) */
export function inTriangle(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const s = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/**
 * A small seeded jitter so a shape drawn every frame keeps the same form: the same seed and index
 * always return the same number in 0..1.
 */
export const jit = (seed: number, i: number): number => {
  const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ── Props ────────────────────────────────────────────────────────────

export interface SkullOpts {
  /** 0 shut – 1 gaping. */
  jaw?: number;
  /** Colour of a light in the sockets, if any. */
  eye?: number;
  eyeA?: number;
  /** Bone colour (a skull long in the loam is darker). */
  tone?: number;
  /** Turned a little to one side, −1..1. */
  turn?: number;
}

/**
 * A skull seen from the front: domed cranium, cheekbones, dark sockets, a triangle nose and a
 * row of teeth on a hinged jaw that can drop open. `s` is the cranium's half-width.
 */
export function drawSkull(g: G, x: number, y: number, s: number, alpha = 1, o: SkullOpts = {}): void {
  const tone = o.tone ?? O.bone;
  const jaw = o.jaw ?? 0;
  const turn = (o.turn ?? 0) * s * 0.18;
  g.fillStyle(dim(tone, 0.45), alpha); g.fillEllipse(x, y + 0.5, s * 2.15, s * 1.95);
  g.fillStyle(tone, alpha); g.fillEllipse(x, y, s * 2, s * 1.8);
  // Cheekbones and the upper jaw.
  g.fillStyle(tone, alpha); g.fillRoundedRect(x - s * 0.72, y + s * 0.2, s * 1.44, s * 0.62, s * 0.2);
  g.fillStyle(lit(tone, 0.4), alpha * 0.8); g.fillEllipse(x - s * 0.35 + turn, y - s * 0.45, s * 0.8, s * 0.42);
  // Sockets.
  const ey = y + s * 0.02;
  g.fillStyle(0x0e0a0c, alpha); g.fillEllipse(x - s * 0.42 + turn, ey, s * 0.6, s * 0.56); g.fillEllipse(x + s * 0.42 + turn, ey, s * 0.6, s * 0.56);
  if (o.eye !== undefined && (o.eyeA ?? 1) > 0) {
    const ea = (o.eyeA ?? 1) * alpha;
    g.fillStyle(o.eye, ea * 0.25); g.fillCircle(x - s * 0.42 + turn, ey, s * 0.5); g.fillCircle(x + s * 0.42 + turn, ey, s * 0.5);
    g.fillStyle(o.eye, ea); g.fillCircle(x - s * 0.42 + turn, ey, s * 0.14); g.fillCircle(x + s * 0.42 + turn, ey, s * 0.14);
  }
  // Nose.
  g.fillStyle(0x1a1214, alpha); g.fillTriangle(x - s * 0.12 + turn, y + s * 0.46, x + s * 0.12 + turn, y + s * 0.46, x + turn, y + s * 0.24);
  // Upper teeth.
  const ty = y + s * 0.66;
  g.fillStyle(dim(tone, 0.3), alpha); g.fillRect(x - s * 0.5, ty, s, s * 0.22);
  for (let i = 0; i < 6; i++) { g.fillStyle(lit(tone, 0.2), alpha); g.fillRect(x - s * 0.48 + i * s * 0.165, ty + 0.5, s * 0.13, s * 0.2); }
  // The jaw, dropped by `jaw`.
  const jy = ty + s * 0.24 + jaw * s * 0.5;
  if (jaw > 0.05) { g.fillStyle(0x0e0a0c, alpha); g.fillRect(x - s * 0.48, ty + s * 0.22, s * 0.96, jy - ty - s * 0.22); }
  g.fillStyle(dim(tone, 0.4), alpha); g.fillRoundedRect(x - s * 0.62, jy - 1, s * 1.24, s * 0.42, s * 0.16);
  g.fillStyle(tone, alpha); g.fillRoundedRect(x - s * 0.58, jy - 1.5, s * 1.16, s * 0.36, s * 0.14);
  for (let i = 0; i < 6; i++) { g.fillStyle(lit(tone, 0.2), alpha); g.fillRect(x - s * 0.48 + i * s * 0.165, jy - 1.5, s * 0.13, s * 0.16); }
}

/**
 * A long bone between two points: a shaft with a knuckled double knob at each end. Used for
 * femurs planted in the Bone Garden, javelins, trellis spars and scattered remains alike.
 */
export function drawBone(g: G, x1: number, y1: number, x2: number, y2: number, w: number, color = O.bone, alpha = 1): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a) * w * 0.5, ny = Math.cos(a) * w * 0.5;
  g.lineStyle(w + 2, dim(color, 0.45), alpha); g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(w, color, alpha); g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(Math.max(1, w * 0.3), lit(color, 0.45), alpha * 0.8);
  g.lineBetween(x1 + nx * 0.5, y1 + ny * 0.5, x2 + nx * 0.5, y2 + ny * 0.5);
  for (const [x, y] of [[x1, y1], [x2, y2]] as [number, number][]) {
    g.fillStyle(dim(color, 0.45), alpha); g.fillCircle(x + nx, y + ny, w * 0.75); g.fillCircle(x - nx, y - ny, w * 0.75);
    g.fillStyle(color, alpha); g.fillCircle(x + nx, y + ny, w * 0.64); g.fillCircle(x - nx, y - ny, w * 0.64);
  }
}

/**
 * A white trumpet lily on its stem: two leaves, a curved stem, and a flower whose six petals curl
 * back from a pale-gold throat. `open` 0 is a closed green-white bud; `sway` bends the stem.
 */
export function drawLily(g: G, x: number, y: number, s: number, open = 1, sway = 0, alpha = 1): void {
  const hx = x + sway * s * 0.6, hy = y - s * 2.1;
  g.lineStyle(Math.max(1, s * 0.16), O.stem, alpha);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + sway * s * 0.25, y - s); g.lineTo(hx, hy); g.strokePath();
  g.fillStyle(O.stem, alpha);
  g.fillTriangle(x, y - s * 0.4, x - s * 0.7, y - s * 0.9, x - s * 0.1, y - s * 0.8);
  g.fillTriangle(x, y - s * 0.7, x + s * 0.7, y - s * 1.2, x + s * 0.1, y - s * 1.1);
  if (open < 0.2) {
    g.fillStyle(lit(O.stem, 0.5), alpha); g.fillEllipse(hx, hy - s * 0.25, s * 0.42, s * 0.9);
    return;
  }
  const k = open;
  // Back petals, then front petals, flaring out from the throat.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.42 * k;
    const len = s * (0.75 + 0.25 * k);
    const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len * 0.8 - s * 0.1;
    g.fillStyle(i % 2 ? O.lilyShade : O.lily, alpha);
    g.fillTriangle(hx - s * 0.12, hy, hx + s * 0.12, hy, tx, ty);
    g.fillCircle(tx, ty, s * 0.12);
  }
  g.fillStyle(O.lilyThroat, alpha * 0.9); g.fillEllipse(hx, hy - s * 0.12, s * 0.3, s * 0.36);
  // Stamens.
  g.lineStyle(1, 0xb08a3a, alpha);
  for (let i = -1; i <= 1; i++) g.lineBetween(hx, hy - s * 0.1, hx + i * s * 0.18, hy - s * 0.55);
}

/** A chapel candle: a wax stub with drips, and its wick. The flame is drawn by `drawFlame`. */
export function drawCandle(g: G, x: number, y: number, h: number, w = 6): void {
  g.fillStyle(dim(O.wax, 0.35), 1); g.fillRect(x - w / 2 - 1, y - h - 1, w + 2, h + 1);
  g.fillStyle(O.wax, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(lit(O.wax, 0.5), 1); g.fillRect(x - w / 2, y - h, w * 0.3, h);
  g.fillStyle(O.wax, 1); g.fillCircle(x + w * 0.3, y - h + 3, w * 0.25); g.fillRect(x + w * 0.2, y - h + 3, w * 0.22, h * 0.4);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 0.5, y - h - 3, 1, 3);
}

/** A candle flame (animated): a soft halo, an amber tongue and a white core. */
export function drawFlame(g: G, x: number, y: number, t: number, s = 1, alpha = 1): void {
  const f = 0.85 + Math.sin(t * 11 + x * 0.7) * 0.1 + Math.sin(t * 17 + y) * 0.05;
  g.fillStyle(O.candle, 0.1 * alpha); g.fillCircle(x, y - 4 * s, 14 * s * f);
  g.fillStyle(O.candle, 0.95 * alpha); g.fillEllipse(x + Math.sin(t * 6 + x) * 0.6, y - 4 * s * f, 4.4 * s, 9 * s * f);
  g.fillStyle(O.candleHot, alpha); g.fillEllipse(x, y - 3 * s, 2 * s, 4.4 * s * f);
}

/**
 * A skin of marrow-jelly (the wells, the gimmick's pools): a deep red rim, amber flesh that wobbles,
 * a few slow blisters swelling and bursting, and a glossy highlight. `heat` 0–1 brightens it.
 */
export function drawMarrow(g: G, x: number, y: number, rx: number, ry: number, t: number, seed: number, heat = 0.5, alpha = 1): void {
  const wob = Math.sin(t * 2.2 + seed) * 0.04;
  g.fillStyle(O.marrowDeep, alpha); g.fillEllipse(x, y, rx * 2 * (1 + wob), ry * 2 * (1 - wob));
  g.fillStyle(O.marrow, alpha); g.fillEllipse(x, y + ry * 0.05, rx * 1.78 * (1 - wob), ry * 1.7 * (1 + wob));
  g.fillStyle(O.marrowLit, (0.35 + heat * 0.45) * alpha); g.fillEllipse(x, y + ry * 0.12, rx * 1.1, ry * 0.95);
  if (heat > 0.6) { g.fillStyle(O.marrowHot, (heat - 0.6) * 1.6 * alpha); g.fillEllipse(x, y + ry * 0.15, rx * 0.6, ry * 0.5); }
  // Blisters: each swells for a while, then pops into a ring.
  for (let i = 0; i < 4; i++) {
    const ph = (t * (0.35 + jit(seed, i) * 0.3) + jit(seed, i + 9)) % 1;
    const bx = x + (jit(seed, i + 3) - 0.5) * rx * 1.2, by = y + (jit(seed, i + 6) - 0.5) * ry * 1.1;
    if (ph < 0.8) { g.fillStyle(O.marrowHot, 0.55 * alpha); g.fillCircle(bx, by, 1 + ph * rx * 0.08); }
    else { g.lineStyle(1, O.marrowHot, (1 - ph) * 4 * alpha); g.strokeEllipse(bx, by, rx * 0.3 * ph, ry * 0.3 * ph); }
  }
  g.fillStyle(0xffffff, 0.3 * alpha); g.fillEllipse(x - rx * 0.4, y - ry * 0.35, rx * 0.5, ry * 0.18);
}

/** One rib: a curved bone arcing from a root point, `a` the direction it reaches, `bend` its curl. */
export function drawRib(g: G, x: number, y: number, a: number, len: number, w: number, bend = 0.6, color = O.bone, alpha = 1): void {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    const aa = a + bend * k * k;
    pts.push({ x: x + Math.cos(aa) * len * k, y: y + Math.sin(aa) * len * k });
  }
  for (const [ww, c] of [[w + 2, dim(color, 0.45)], [w, color]] as [number, number][]) {
    g.lineStyle(ww, c, alpha);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.strokePath();
  }
  g.fillStyle(color, alpha); g.fillCircle(pts[8].x, pts[8].y, w * 0.55);
}

/** A tithe-plate: the Empress's verdigris disc with a pruning-hook stamped on it. */
export function drawTithePlate(g: G, x: number, y: number, r: number): void {
  g.fillStyle(dim(O.verdigris, 0.45), 1); g.fillCircle(x, y, r + 1);
  g.fillStyle(O.verdigris, 1); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.18), O.gilt, 1);
  g.beginPath(); g.arc(x + r * 0.15, y - r * 0.1, r * 0.45, Math.PI * 0.9, Math.PI * 1.9, false); g.strokePath();
  g.lineBetween(x - r * 0.3, y - r * 0.05, x - r * 0.2, y + r * 0.6);
}
