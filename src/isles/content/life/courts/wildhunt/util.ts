import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, lit, mixC, type G } from '../../../../art/IsleArt';

/**
 * The Wildhunt's shared hand — the palette and the parts (hoof- and paw-prints, antlers, hounds,
 * stags, falcons, spears, reed hides, log walls, great forest trees, the Gardener's mark) that the
 * lodge town, the fight floor, the gimmicks, the charms and Prince Fang all draw with.
 *
 * The look in one line: deep shade and warm timber. The forest is near-black green with gold
 * coming through in shafts; everything people built is round logs, end-grain and antler; the only
 * loud colour is the hunt's oxblood livery — and the red it leaves on the ford.
 */

// ── Palette ─────────────────────────────────────────────────────────
/** Forest floor: dark loam under a skin of moss and leaf litter. */
export const LOAM = 0x2a2216;
export const LOAM_LIT = 0x4a3c26;
export const MOSS = 0x3e5a2a;
export const MOSS_DARK = 0x22341a;
export const MOSS_LIT = 0x6a8a3a;
export const FERN = 0x2e5226;
export const FERN_LIT = 0x5a8a3e;
/** Autumn in the canopy. */
export const LEAF_GOLD = 0xc89a3a;
export const LEAF_RUST = 0xa4522a;
export const LEAF_GREEN = 0x4a6e2a;
/** Living bark — oak and pine. */
export const BARK = 0x4a3626;
export const BARK_DARK = 0x241a12;
export const BARK_LIT = 0x6e5238;
/** Lodge timber: peeled round logs, honey where the light catches. */
export const TIMBER = 0x7a5634;
export const TIMBER_DARK = 0x3e2a1a;
export const TIMBER_LIT = 0xa8804e;
/** End-grain: the cut face of a log, pale with rings. */
export const ENDGRAIN = 0xc8a46e;
/** Bark-shingle roofs, mossed over. */
export const SHINGLE = 0x3a2e26;
export const SHINGLE_LIT = 0x5a4a3a;
/** Antler and bone. */
export const ANTLER = 0xe0d0b0;
export const ANTLER_DARK = 0x9a8662;
/** The river and its ford. */
export const RIVER = 0x24423c;
export const RIVER_DEEP = 0x16302c;
export const RIVER_LIT = 0x5a8a7a;
export const FOAM = 0xd8e8dc;
export const GRAVEL = 0x8a7a62;
/** The Wildhunt livery: oxblood and hunter green, the Empress's verdigris-gold on the trim. */
export const HUNT_RED = 0x8a2a1e;
export const HUNT_RED_LIT = 0xc8483a;
export const HUNT_GREEN = 0x2a4a2a;
export const VERDIGRIS = 0x6ab89a;
export const GILT = 0xc8a040;
/** Pelts. */
export const FUR = 0x7a5e44;
export const FUR_LIT = 0xa8865e;
export const WOLF = 0x6e6e68;
export const WOLF_DARK = 0x34342f;
export const WOLF_LIT = 0xa8a89a;
export const BLOOD = 0x8a1a14;
/** Meadow grass of the deer park. */
export const GRASS = 0x5a7a34;
export const GRASS_LIT = 0x8aaa4a;
/** Ownership tints used by fight rules: the player's side and the foe's side. */
export const MINE_C = 0x7ad8ff;
export const FOE_C = 0xffa04a;
/** A shaft of sunlight through the canopy. */
export const SUN = 0xffe8a0;

// ── Small maths ─────────────────────────────────────────────────────

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const inRect = (x: number, y: number, r: Rect): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** True when a point (with margin) lies inside the camera rect — animators skip the rest. */
export const inView = (x: number, y: number, view: Rect, m = 140): boolean =>
  x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;

/** Deterministic hash noise (0..1) — flicker and placement that do not crawl. */
export const noise = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Seconds since the previous call, from the frame clock itself (clamped to 0.1s). */
export function frameClock(): (time: number) => number {
  let last = -1;
  return (time: number) => {
    const d = last < 0 ? 0 : Math.min(0.1, Math.max(0, (time - last) / 1000));
    last = time;
    return d;
  };
}

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** A wobbly closed outline around (x, y). Stable for a given seed. */
export function blobPts(x: number, y: number, rx: number, ry: number, seed: number, lumps = 11, wob = 0.22): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const k = 1 - wob / 2 + noise(seed * 31.7 + i * 7.3) * wob;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k));
  }
  return pts;
}

/** A point along a quadratic curve a → c → b at t. */
export function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

// ── Tracks ──────────────────────────────────────────────────────────

/** A cloven hoofprint pointing along `a` — two teardrop halves with a split between. */
export function hoofprint(g: G, x: number, y: number, a: number, s: number, color: number, alpha: number): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  g.fillStyle(color, alpha);
  for (const side of [-1, 1]) {
    const cx = x + nx * side * s * 0.32, cy = y + ny * side * s * 0.32;
    g.fillTriangle(
      cx - ux * s * 0.5 + nx * side * s * 0.22, cy - uy * s * 0.5 + ny * side * s * 0.22,
      cx - ux * s * 0.5 - nx * side * s * 0.18, cy - uy * s * 0.5 - ny * side * s * 0.18,
      cx + ux * s * 0.7, cy + uy * s * 0.7,
    );
    g.fillCircle(cx - ux * s * 0.42, cy - uy * s * 0.42, s * 0.22);
  }
}

/** A dog's pawprint pointing along `a` — a heel pad and four toes. */
export function pawprint(g: G, x: number, y: number, a: number, s: number, color: number, alpha: number): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  g.fillStyle(color, alpha);
  g.fillEllipse(x - ux * s * 0.2, y - uy * s * 0.2, s * 0.8, s * 0.7);
  for (let k = 0; k < 4; k++) {
    const off = (k - 1.5) * 0.36;
    const fwd = 0.55 + (k === 1 || k === 2 ? 0.14 : 0);
    g.fillCircle(x + ux * s * fwd + nx * s * off, y + uy * s * fwd + ny * s * off, s * 0.17);
  }
}

// ── Antler, bone, horn ──────────────────────────────────────────────

/**
 * One antler rising from (x, y): a curved beam with `tines` points off its inner side. `dir` is
 * -1 for the left antler, +1 for the right. Thickness scales with `s`.
 */
export function antler(g: G, x: number, y: number, s: number, dir: number, color = ANTLER, tines = 4, alpha = 1): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push({ x: x + dir * (Math.sin(t * 1.4) * s * 0.9), y: y - t * s * 1.5 });
  }
  g.lineStyle(Math.max(1.5, s * 0.13), dim(color, 0.35), alpha);
  g.beginPath(); g.moveTo(pts[0].x + 1, pts[0].y + 1); for (const p of pts) g.lineTo(p.x + 1, p.y + 1); g.strokePath();
  g.lineStyle(Math.max(1.2, s * 0.1), color, alpha);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(Math.max(1, s * 0.075), color, alpha);
  for (let k = 0; k < tines; k++) {
    const p = pts[2 + Math.min(5, Math.round(k * 1.6))];
    const len = s * (0.42 - k * 0.04);
    g.lineBetween(p.x, p.y, p.x - dir * len * 0.35, p.y - len);
  }
  // Brow tine forward and the burr at the base.
  g.lineBetween(pts[1].x, pts[1].y, pts[1].x + dir * s * 0.1 - dir * s * 0.45, pts[1].y - s * 0.12);
  g.fillStyle(dim(color, 0.2), alpha); g.fillCircle(x, y, Math.max(1.5, s * 0.11));
}

/** A pair of antlers on a skull plate — a trophy, a gate crest, a crown. */
export function antlerPair(g: G, x: number, y: number, s: number, color = ANTLER, alpha = 1, skull = true): void {
  antler(g, x - s * 0.18, y, s, -1, color, 4, alpha);
  antler(g, x + s * 0.18, y, s, 1, color, 4, alpha);
  if (!skull) return;
  g.fillStyle(dim(color, 0.3), alpha);
  g.fillTriangle(x - s * 0.26, y - s * 0.06, x + s * 0.26, y - s * 0.06, x, y + s * 0.55);
  g.fillStyle(color, alpha);
  g.fillTriangle(x - s * 0.22, y - s * 0.04, x + s * 0.22, y - s * 0.04, x, y + s * 0.5);
  g.fillStyle(dim(color, 0.65), alpha);
  g.fillCircle(x - s * 0.1, y + s * 0.08, s * 0.05); g.fillCircle(x + s * 0.1, y + s * 0.08, s * 0.05);
}

/** A curled hunting horn (bugle-style), mouth toward `dir`. */
export function huntingHorn(g: G, x: number, y: number, s: number, dir: number, alpha = 1): void {
  g.lineStyle(s * 0.22, dim(GILT, 0.45), alpha);
  g.beginPath(); g.arc(x, y, s * 0.6, Math.PI * 0.2, Math.PI * 1.75, false); g.strokePath();
  g.lineStyle(s * 0.15, GILT, alpha);
  g.beginPath(); g.arc(x, y, s * 0.6, Math.PI * 0.2, Math.PI * 1.75, false); g.strokePath();
  const bx = x + dir * s * 0.55, by = y - s * 0.32;
  g.fillStyle(GILT, alpha);
  g.fillTriangle(bx, by - s * 0.05, bx + dir * s * 0.62, by - s * 0.42, bx + dir * s * 0.62, by + s * 0.32);
  g.fillStyle(lit(GILT, 0.4), alpha); g.fillEllipse(bx + dir * s * 0.62, by - s * 0.05, s * 0.12, s * 0.74);
  g.lineStyle(1.2, HUNT_RED, alpha); g.lineBetween(x - s * 0.5, y + s * 0.2, x + s * 0.3, y + s * 0.62);
}

/** A boar-spear from (x1,y1) (butt) to (x2,y2) (point): ash shaft, crossbar lugs, leaf blade. */
export function spear(g: G, x1: number, y1: number, x2: number, y2: number, alpha = 1, color = 0xd8d8d0): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  g.lineStyle(3.4, 0x2a1a10, alpha); g.lineBetween(x1, y1, x2 - ux * 14, y2 - uy * 14);
  g.lineStyle(2.2, 0xb08a5a, alpha); g.lineBetween(x1, y1, x2 - ux * 14, y2 - uy * 14);
  // Crossbar lugs below the blade (to stop a boar riding up the shaft).
  const lx = x2 - ux * 16, ly = y2 - uy * 16;
  g.lineStyle(2.4, 0x5a5a58, alpha); g.lineBetween(lx + nx * 6, ly + ny * 6, lx - nx * 6, ly - ny * 6);
  g.fillStyle(color, alpha);
  g.fillTriangle(x2 - ux * 15 + nx * 4.5, y2 - uy * 15 + ny * 4.5, x2 - ux * 15 - nx * 4.5, y2 - uy * 15 - ny * 4.5, x2, y2);
  g.fillStyle(0xffffff, 0.5 * alpha); g.fillTriangle(x2 - ux * 14, y2 - uy * 14, x2 - ux * 12 + nx * 3, y2 - uy * 12 + ny * 3, x2, y2);
  // A tuft of red at the socket — the Wildhunt's.
  g.fillStyle(HUNT_RED, alpha); g.fillCircle(x2 - ux * 19, y2 - uy * 19, 2.2);
}

// ── Beasts ──────────────────────────────────────────────────────────

/**
 * A running hound in profile, facing `dir` (±1), legs on gait phase `ph` (radians). `s` ~ 1 is a
 * dog the size of a player. Lean, long-eared, oxblood collar.
 */
export function hound(g: G, x: number, y: number, dir: number, s: number, ph: number, coat = 0x8a6a4a, alpha = 1, collar = HUNT_RED): void {
  const d = dir;
  g.fillStyle(0x000000, 0.28 * alpha); g.fillEllipse(x, y + 12 * s, 34 * s, 7 * s);
  // Legs: two pairs swinging opposite.
  const leg = (hx: number, sw: number): void => {
    const fx = x + d * hx * s + Math.sin(sw) * 7 * s;
    g.lineStyle(3 * s, dim(coat, 0.35), alpha);
    g.lineBetween(x + d * hx * s, y + 1 * s, fx, y + 11 * s);
  };
  leg(10, ph); leg(7, ph + Math.PI); leg(-9, ph + Math.PI * 0.5); leg(-12, ph + Math.PI * 1.5);
  // Body: deep chest, tucked waist.
  g.fillStyle(dim(coat, 0.3), alpha); g.fillEllipse(x, y - 2 * s, 30 * s, 13 * s);
  g.fillStyle(coat, alpha); g.fillEllipse(x + d * 2 * s, y - 3 * s, 27 * s, 11 * s);
  g.fillStyle(lit(coat, 0.25), alpha); g.fillEllipse(x + d * 4 * s, y - 6 * s, 16 * s, 3.5 * s);
  // Tail streaming back.
  g.lineStyle(2.4 * s, coat, alpha);
  g.lineBetween(x - d * 13 * s, y - 5 * s, x - d * 22 * s, y - 9 * s + Math.sin(ph * 2) * 2 * s);
  // Neck, head, muzzle.
  const hx = x + d * 15 * s, hy = y - 9 * s;
  g.fillStyle(coat, alpha); g.fillEllipse(hx, hy, 11 * s, 9 * s);
  g.fillStyle(dim(coat, 0.15), alpha); g.fillEllipse(hx + d * 7 * s, hy + 1.5 * s, 9 * s, 5 * s);
  g.fillStyle(0x161210, alpha); g.fillCircle(hx + d * 11 * s, hy + 1 * s, 1.6 * s);
  // Long drop ear.
  g.fillStyle(dim(coat, 0.45), alpha); g.fillEllipse(hx - d * 2 * s, hy + 2 * s, 4 * s, 8 * s);
  g.fillStyle(0xfff0c0, alpha); g.fillCircle(hx + d * 3 * s, hy - 2 * s, 1.1 * s);
  g.fillStyle(collar, alpha); g.fillRect(hx - d * 6 * s - 2 * s, hy + 1 * s, 4 * s, 6 * s);
}

/**
 * A stag in profile facing `dir` (±1). `head` 0 = head up, 1 = head lowered to charge (antlers
 * forward). `ph` is the gait phase; `stuck` shakes the head as it tugs its antlers free.
 */
export function stag(g: G, x: number, y: number, dir: number, s: number, ph: number, head: number, alpha = 1, stuck = 0): void {
  const d = dir;
  const coat = 0x8a5e3a;
  g.fillStyle(0x000000, 0.3 * alpha); g.fillEllipse(x, y + 26 * s, 60 * s, 12 * s);
  const leg = (hx: number, sw: number): void => {
    const kx = x + d * hx * s + Math.sin(sw) * 5 * s;
    g.lineStyle(3.6 * s, dim(coat, 0.4), alpha);
    g.lineBetween(x + d * hx * s, y + 4 * s, kx, y + 16 * s);
    g.lineBetween(kx, y + 16 * s, kx + Math.sin(sw) * 3 * s, y + 26 * s);
    g.fillStyle(0x1a1410, alpha); g.fillRect(kx + Math.sin(sw) * 3 * s - 1.5 * s, y + 24 * s, 3 * s, 3 * s);
  };
  leg(16, ph); leg(12, ph + Math.PI); leg(-14, ph + Math.PI * 0.5); leg(-18, ph + Math.PI * 1.5);
  g.fillStyle(dim(coat, 0.35), alpha); g.fillEllipse(x, y - 2 * s, 50 * s, 22 * s);
  g.fillStyle(coat, alpha); g.fillEllipse(x + d * 1 * s, y - 3 * s, 47 * s, 19 * s);
  g.fillStyle(lit(coat, 0.2), alpha); g.fillEllipse(x + d * 3 * s, y - 9 * s, 30 * s, 5 * s);
  // Pale rump patch and flicked tail.
  g.fillStyle(0xe8dcc0, alpha); g.fillEllipse(x - d * 21 * s, y - 4 * s, 8 * s, 11 * s);
  // Shaggy neck ruff of a rutting stag.
  const nx = x + d * 20 * s, ny = y - 10 * s;
  g.fillStyle(dim(coat, 0.25), alpha);
  g.fillTriangle(nx - d * 8 * s, ny - 4 * s, nx + d * 6 * s, ny - 8 * s, nx + d * 2 * s, ny + 12 * s);
  // Head: raised or lowered.
  const jit = stuck ? Math.sin(stuck * 40) * 3 * s : 0;
  const hx = x + d * (28 + head * 8) * s + jit, hy = y - (20 - head * 22) * s;
  g.fillStyle(coat, alpha); g.fillEllipse(hx, hy, 12 * s, 9 * s);
  g.fillStyle(dim(coat, 0.2), alpha); g.fillEllipse(hx + d * 7 * s, hy + 2 * s + head * 1.5 * s, 9 * s, 6 * s);
  g.fillStyle(0x161210, alpha); g.fillCircle(hx + d * 11 * s, hy + 3 * s, 1.5 * s);
  g.fillStyle(0x1a1410, alpha); g.fillCircle(hx + d * 1 * s, hy - 1.5 * s, 1.4 * s);
  g.fillStyle(dim(coat, 0.3), alpha); g.fillEllipse(hx - d * 5 * s, hy - 4 * s, 7 * s, 3 * s);
  // Antlers: swept back with head up, levelled forward when charging.
  const ax = hx - d * 2 * s, ay = hy - 5 * s;
  if (head < 0.5) {
    antler(g, ax - d * 2 * s, ay, 22 * s, -d, ANTLER, 4, alpha);
    antler(g, ax + d * 2 * s, ay, 22 * s, d, lit(ANTLER, 0.1), 4, alpha);
  } else {
    // Forward-pointing rack: tines like a row of spears.
    g.lineStyle(3 * s, ANTLER_DARK, alpha); g.lineBetween(ax, ay, ax + d * 30 * s, ay - 2 * s);
    g.lineStyle(2.2 * s, ANTLER, alpha); g.lineBetween(ax, ay - 1, ax + d * 30 * s, ay - 3 * s);
    for (let k = 0; k < 4; k++) {
      const tx = ax + d * (8 + k * 7) * s;
      g.lineBetween(tx, ay - 2 * s, tx + d * 6 * s, ay - (8 + (k % 2) * 4) * s);
      g.lineBetween(tx, ay - 1 * s, tx + d * 6 * s, ay + 5 * s);
    }
  }
}

/**
 * A falcon seen from below / above: swept wings at flap phase `fl` (−1..1), facing angle `a`.
 * `s` ~ 1 is a bird about 40px across.
 */
export function falcon(g: G, x: number, y: number, a: number, fl: number, s: number, alpha = 1, stoop = 0): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const span = (20 - stoop * 12) * s, sweep = (6 + stoop * 10) * s;
  const lift = fl * 5 * s;
  const P = (fx: number, fy: number): Phaser.Geom.Point => new Phaser.Geom.Point(x + ux * fx + nx * fy, y + uy * fx + ny * fy);
  g.fillStyle(0x3a3226, alpha);
  for (const side of [-1, 1]) {
    g.fillPoints([P(4 * s, side * 3 * s), P(-sweep, side * (span + lift)), P(-sweep - 5 * s, side * (span - 4 * s + lift)), P(-6 * s, side * 4 * s)], true);
  }
  g.fillStyle(0x6a5a44, alpha);
  for (const side of [-1, 1]) g.fillPoints([P(3 * s, side * 3 * s), P(-sweep * 0.8, side * (span * 0.75 + lift)), P(-5 * s, side * 4 * s)], true);
  // Body, barred breast, tail.
  g.fillStyle(0x4a3e30, alpha); g.fillEllipse(x, y, 7 * s, 7 * s);
  g.fillPoints([P(-3 * s, 3 * s), P(-14 * s, 4.5 * s), P(-14 * s, -4.5 * s), P(-3 * s, -3 * s)], true);
  g.fillStyle(0xd8c8a8, alpha); g.fillCircle(x + ux * 2 * s, y + uy * 2 * s, 3 * s);
  // Head and yellow beak.
  g.fillStyle(0x2a2420, alpha); g.fillCircle(x + ux * 7 * s, y + uy * 7 * s, 3.4 * s);
  g.fillStyle(0xe8c040, alpha); g.fillCircle(x + ux * 10 * s, y + uy * 10 * s, 1.3 * s);
}

// ── Built things ────────────────────────────────────────────────────

/** End-grain of a log: a pale disc with growth rings and a dark heart check. */
export function logEnd(g: G, x: number, y: number, r: number, alpha = 1): void {
  g.fillStyle(dim(ENDGRAIN, 0.45), alpha); g.fillCircle(x, y, r + 1.2);
  g.fillStyle(ENDGRAIN, alpha); g.fillCircle(x, y, r);
  g.lineStyle(1, dim(ENDGRAIN, 0.3), 0.7 * alpha);
  for (let k = 1; k <= 3; k++) g.strokeCircle(x + k * 0.3, y, r * (k / 4));
  g.lineStyle(1, dim(ENDGRAIN, 0.55), 0.8 * alpha); g.lineBetween(x, y, x + r * 0.7, y - r * 0.3);
}

/** A wall of stacked round logs over a rect, ends showing at both sides. */
export function logWall(g: G, r: Rect, rng: () => number, logD = 14): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  for (let y = r.y + r.h - logD; y >= r.y - 1; y -= logD) {
    const c = mixC(TIMBER, rng() < 0.5 ? 0x000000 : 0xffffff, rng() * 0.1);
    g.fillStyle(c, 1); g.fillRoundedRect(r.x - 6, y, r.w + 12, logD - 1, logD / 2 - 1);
    g.fillStyle(lit(c, 0.18), 0.8); g.fillRect(r.x, y + 2, r.w, 2);
    g.fillStyle(dim(c, 0.35), 0.6); g.fillRect(r.x, y + logD - 4, r.w, 2);
    // Knots.
    if (rng() < 0.6) { g.fillStyle(dim(c, 0.45), 1); g.fillEllipse(r.x + rng() * r.w, y + logD / 2, 5, 3); }
    logEnd(g, r.x - 6, y + logD / 2 - 0.5, logD / 2 - 1);
    logEnd(g, r.x + r.w + 6, y + logD / 2 - 0.5, logD / 2 - 1);
  }
}

/** A steep bark-shingle roof (triangle) over `w` at `y`, peak `h` above, with moss on the slopes. */
export function shingleRoof(g: G, x: number, y: number, w: number, h: number, rng: () => number, overhang = 18): void {
  g.fillStyle(dim(SHINGLE, 0.45), 1);
  g.fillTriangle(x - w / 2 - overhang - 4, y + 4, x + w / 2 + overhang + 4, y + 4, x, y - h - 4);
  g.fillStyle(SHINGLE, 1);
  g.fillTriangle(x - w / 2 - overhang, y, x + w / 2 + overhang, y, x, y - h);
  // Shingle courses.
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    const yy = y - h * t, half = (w / 2 + overhang) * (1 - t);
    g.lineStyle(1.5, SHINGLE_LIT, 0.55); g.lineBetween(x - half, yy, x + half, yy);
    for (let s = -half; s < half; s += 9 + rng() * 5) { g.lineStyle(1, dim(SHINGLE, 0.4), 0.6); g.lineBetween(x + s, yy, x + s, yy + h / 8); }
  }
  for (let i = 0; i < (w / 14); i++) {
    const t = 0.1 + rng() * 0.7, side = rng() < 0.5 ? -1 : 1;
    const half = (w / 2 + overhang) * (1 - t);
    g.fillStyle(rng() < 0.5 ? MOSS : MOSS_LIT, 0.75);
    g.fillEllipse(x + side * rng() * half, y - h * t, 10 + rng() * 14, 4 + rng() * 4);
  }
  // Crossed ridge-poles at the peak.
  g.lineStyle(4, TIMBER_DARK, 1);
  g.lineBetween(x - 14, y - h - 14, x + 4, y - h + 4); g.lineBetween(x + 14, y - h - 14, x - 4, y - h + 4);
}

/** A woven reed hide — a low dome of bundled reeds with a dark slot to watch from. */
export function reedHide(g: G, x: number, y: number, r: number, t: number, alpha = 1, front = false): void {
  const h = r * 1.15;
  if (!front) {
    g.fillStyle(0x000000, 0.3 * alpha); g.fillEllipse(x, y + 4, r * 2.4, r * 0.8);
    g.fillStyle(0x5a5228, alpha); g.fillEllipse(x, y - h * 0.4, r * 2.1, h * 1.3);
  }
  // Reed bundles: vertical strokes, leaning, tips swaying.
  for (let i = 0; i < 18; i++) {
    const u = i / 17 - 0.5;
    const bx = x + u * r * 2.0;
    const top = y - h * (1 - u * u * 2.6) - 6;
    const sway = Math.sin(t * 1.6 + i * 0.7) * 2.5;
    const c = i % 3 === 0 ? 0xb8a860 : i % 3 === 1 ? 0x8a7e3e : 0xa89a4e;
    g.lineStyle(front ? 3 : 4, c, alpha * (front ? 0.85 : 1));
    g.lineBetween(bx, y, bx + sway + u * 6, top);
    // Seed heads.
    g.fillStyle(0x6a4a2a, alpha); g.fillEllipse(bx + sway + u * 6, top - 3, 3, 7);
  }
  // Binding twine round the waist.
  g.lineStyle(2, 0x4a3a1e, alpha); g.strokeEllipse(x, y - h * 0.35, r * 2.0, r * 0.5);
  if (!front) {
    // The watching slot.
    g.fillStyle(0x0e0c08, 0.85 * alpha); g.fillRoundedRect(x - r * 0.45, y - h * 0.62, r * 0.9, 6, 3);
  }
}

/**
 * A great forest tree: buttress roots, a furrowed trunk and a heavy canopy — `kind` 'oak'
 * (broad, autumn-touched) or 'pine' (tall dark tiers). `y` is the base.
 */
export function bigTree(g: G, x: number, y: number, s: number, kind: 'oak' | 'pine', rng: () => number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x + 8, y + 4, s * 2.6, s * 0.7);
  // Roots.
  g.fillStyle(BARK_DARK, 1);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (0.05 + k * 0.22);
    const rx = x + Math.cos(a) * s * 0.75, ry = y + Math.sin(a) * s * 0.12;
    g.fillTriangle(x - s * 0.18, y - s * 0.3, x + s * 0.18, y - s * 0.3, rx, ry);
  }
  const tw = kind === 'oak' ? s * 0.42 : s * 0.3;
  const th = kind === 'oak' ? s * 1.9 : s * 2.4;
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - tw / 2 - 2, y - th, tw + 4, th);
  g.fillStyle(BARK, 1); g.fillRect(x - tw / 2, y - th, tw, th);
  g.fillStyle(BARK_LIT, 0.8); g.fillRect(x - tw / 2 + 2, y - th, tw * 0.22, th);
  // Furrows.
  for (let k = 0; k < 6; k++) {
    const fx = x - tw / 2 + 3 + rng() * (tw - 6);
    g.lineStyle(1.4, BARK_DARK, 0.8); g.lineBetween(fx, y - th + rng() * 20, fx + (rng() - 0.5) * 4, y - 6 - rng() * 30);
  }
  if (kind === 'oak') {
    // Limbs up into the crown.
    g.lineStyle(s * 0.14, BARK, 1);
    g.lineBetween(x, y - th * 0.8, x - s * 0.8, y - th - s * 0.4);
    g.lineBetween(x, y - th * 0.85, x + s * 0.75, y - th - s * 0.5);
    const cy = y - th - s * 0.55;
    const blobs: [number, number, number][] = [[-0.85, 0.15, 0.7], [0.85, 0.1, 0.72], [0, -0.35, 0.85], [-0.4, 0.3, 0.6], [0.45, 0.35, 0.6], [0, 0.2, 0.75]];
    for (const [bx, by, br] of blobs) { g.fillStyle(dim(LEAF_GREEN, 0.55), 1); g.fillCircle(x + bx * s, cy + by * s + 4, br * s); }
    for (const [bx, by, br] of blobs) { g.fillStyle(rng() < 0.3 ? mixC(LEAF_GREEN, LEAF_GOLD, 0.45) : LEAF_GREEN, 1); g.fillCircle(x + bx * s, cy + by * s, br * s * 0.92); }
    for (let i = 0; i < 9; i++) {
      g.fillStyle(rng() < 0.5 ? LEAF_GOLD : lit(LEAF_GREEN, 0.15), 0.55);
      g.fillCircle(x + (rng() - 0.5) * s * 1.8, cy - s * 0.3 + (rng() - 0.5) * s * 0.8, s * (0.12 + rng() * 0.16));
    }
  } else {
    for (let k = 0; k < 5; k++) {
      const ty = y - th * 0.45 - k * s * 0.42;
      const w = s * (1.05 - k * 0.18);
      g.fillStyle(dim(0x1e3a26, 0.4), 1); g.fillTriangle(x - w - 3, ty + 4, x + w + 3, ty + 4, x, ty - s * 0.75);
      g.fillStyle(0x1e3a26, 1); g.fillTriangle(x - w, ty, x + w, ty, x, ty - s * 0.72);
      g.fillStyle(0x2e5236, 0.8); g.fillTriangle(x - w * 0.8, ty - 2, x - w * 0.1, ty - 2, x - w * 0.15, ty - s * 0.55);
    }
  }
}

/**
 * The Gardener's mark — Empress Verdigra's, stamped on every tithe-tally in Thornwild: a
 * five-petal rose held between the open blades of a pair of shears.
 */
export function gardenersMark(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.2, r * 0.14), color, a);
  g.lineBetween(x - r * 0.95, y - r * 0.95, x + r * 0.35, y + r * 0.6);
  g.lineBetween(x + r * 0.95, y - r * 0.95, x - r * 0.35, y + r * 0.6);
  g.strokeCircle(x - r * 0.5, y + r * 0.85, r * 0.24); g.strokeCircle(x + r * 0.5, y + r * 0.85, r * 0.24);
  g.fillStyle(color, a);
  for (let k = 0; k < 5; k++) {
    const an = -Math.PI / 2 + (k / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(an) * r * 0.26, y - r * 0.2 + Math.sin(an) * r * 0.26, r * 0.2);
  }
}

/** Scattered fallen leaves over a rect — gold, rust and green. */
export function leafLitter(g: G, r: Rect, rng: () => number, n: number, alpha = 0.7): void {
  const cols = [LEAF_GOLD, LEAF_RUST, LEAF_GREEN, 0x7a5a2a];
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const a = rng() * Math.PI;
    const s = 2.5 + rng() * 3;
    g.fillStyle(cols[Math.floor(rng() * cols.length)], alpha * (0.5 + rng() * 0.5));
    g.fillTriangle(x + Math.cos(a) * s, y + Math.sin(a) * s, x - Math.cos(a) * s, y - Math.sin(a) * s, x + Math.cos(a + 1.6) * s * 0.6, y + Math.sin(a + 1.6) * s * 0.6);
  }
}

/** A fern frond clump — the forest floor's undergrowth. */
export function fernClump(g: G, x: number, y: number, s: number, rng: () => number): void {
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.42 + (rng() - 0.5) * 0.2;
    const len = s * (0.8 + rng() * 0.4);
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.7;
    g.lineStyle(1.6, k % 2 ? FERN : FERN_LIT, 0.95); g.lineBetween(x, y, ex, ey);
    for (let j = 1; j < 6; j++) {
      const t = j / 6;
      const px = x + (ex - x) * t, py = y + (ey - y) * t;
      const ln = s * 0.22 * (1 - t * 0.6);
      g.lineBetween(px, py, px + Math.cos(a - 1.2) * ln, py + Math.sin(a - 1.2) * ln);
      g.lineBetween(px, py, px + Math.cos(a + 1.2) * ln, py + Math.sin(a + 1.2) * ln);
    }
  }
}
