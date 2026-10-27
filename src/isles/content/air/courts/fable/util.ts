import Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, lit, mixC, type G } from '../../../../art/IsleArt';

/**
 * The Fable Court's shared hand — the palette and the parts every painter here draws with: the
 * town, the fight floor, the five gimmicks, the charms and Prince Legend.
 *
 * The look in one line: a picture book left open in the wind. Everything is flat watercolour on
 * parchment with a dark ink line round it, like a plate in a children's book; houses are pop-up
 * paper standing out of open books; the land ends in a torn deckle edge with the cloud sea below.
 * The only hard, un-storybook things are the King's: brass breath-meters, iron chains, the
 * censors' red seal and the black smoke of the bonfire where unlicensed tales are burned.
 */

// ── Palette ─────────────────────────────────────────────────────────
/** The ink every outline is drawn in — a warm blue-black, never pure black. */
export const INK = 0x2a2236;
export const INK_SOFT = 0x4a4258;
/** Parchment: the page the whole court is painted on. */
export const PARCH = 0xeadcb4;
export const PARCH_LIT = 0xf6eed6;
export const PARCH_DARK = 0xbca878;
export const PAGE = 0xf8f0da;
/** Watercolour meadow on the ledge. */
export const MEADOW = 0x8ab45e;
export const MEADOW_LIT = 0xb4d47e;
export const MEADOW_DARK = 0x5a8a46;
/** Cobbles of the lanes: pale storybook stone. */
export const COBBLE = 0xd2c4a0;
export const COBBLE_DARK = 0xa49470;
/** Book-cloth for covers: the three colours of the Prince's licensed editions. */
export const CLOTH_RED = 0xb84a52;
export const CLOTH_BLUE = 0x3e5c9a;
export const CLOTH_GREEN = 0x3e7a5e;
export const CLOTH_PLUM = 0x6a3e7a;
/** Gilt — on spines, crowns, the hoard. */
export const GILT = 0xe0b04a;
export const GILT_LIT = 0xffe08a;
export const GILT_DARK = 0x8a6620;
/** The sky and the cloud sea below the torn edge. */
export const SKY = 0xa8d8f4;
export const CLOUD = 0xf6faff;
export const CLOUD_SHADE = 0xc6d6ec;
export const CLOUD_DEEP = 0x9ab0d0;
/** Beanstalk greens. */
export const BEAN = 0x4e9a36;
export const BEAN_DARK = 0x2e6a26;
export const BEAN_LIT = 0x8ad85a;
/** Plaster, timber and thatch of the storybook cottages. */
export const PLASTER = 0xf0e2c4;
export const TIMBER = 0x7a5232;
export const TIMBER_DARK = 0x4a301c;
export const THATCH = 0xd8b45a;
export const THATCH_DARK = 0xa07e30;
export const BRICK = 0xb85a3e;
export const BRICK_DARK = 0x7a3626;
export const STICKS = 0x9a7448;
/** The chained dragon: old bottle-green with a butter belly. */
export const DRAGON = 0x3e8a6a;
export const DRAGON_DARK = 0x22543e;
export const DRAGON_LIT = 0x6ab88e;
export const DRAGON_BELLY = 0xe8cc84;
/** Iron of chains and the censors' gear. */
export const IRON = 0x5a5a6a;
export const IRON_LIT = 0x8a8a9a;
/** The King's brass — breath-meters on every chest. */
export const BRASS = 0xc8a050;
export const BRASS_DARK = 0x7a5a24;
/** The censors' seal-red and the bonfire. */
export const SEAL = 0xa0202a;
export const EMBER = 0xff8a3a;
export const FLAME = 0xffd060;
export const SMOKE = 0x4a4450;
/** Myth: the Prince's own starry dark. */
export const MYTH = 0x7d5cff;
export const MYTH_LIT = 0xb8a4ff;
export const NIGHT = 0x1a1438;
export const STAR = 0xfff4c8;
/** The poisoned apple. */
export const APPLE = 0xd8303a;
export const POISON = 0x7ad84a;
/** Ownership tints used by fight rules: the player's side and the foe's side. */
export const MINE_C = 0x7ad8ff;
export const FOE_C = 0xffa04a;

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

/** Smallest signed difference between two angles. */
export const angDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** A point along a quadratic curve a → c → b at t. */
export function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── Ink and paper ───────────────────────────────────────────────────

/** A filled polygon with the storybook ink line round it. */
export function inked(g: G, pts: Pt[], fill: number, alpha = 1, line = 2): void {
  g.fillStyle(fill, alpha); g.fillPoints(pts.map((p) => P(p.x, p.y)), true, true);
  g.lineStyle(line, INK, 0.85 * alpha); g.strokePoints(pts.map((p) => P(p.x, p.y)), true, true);
}

/** A filled rect with an ink line. */
export function inkRect(g: G, x: number, y: number, w: number, h: number, fill: number, alpha = 1, line = 2): void {
  g.fillStyle(fill, alpha); g.fillRect(x, y, w, h);
  g.lineStyle(line, INK, 0.85 * alpha); g.strokeRect(x, y, w, h);
}

/** A filled ellipse with an ink line. */
export function inkEllipse(g: G, x: number, y: number, w: number, h: number, fill: number, alpha = 1, line = 2): void {
  g.fillStyle(fill, alpha); g.fillEllipse(x, y, w, h);
  g.lineStyle(line, INK, 0.85 * alpha); g.strokeEllipse(x, y, w, h);
}

/** A filled circle with an ink line. */
export function inkCircle(g: G, x: number, y: number, r: number, fill: number, alpha = 1, line = 2): void {
  g.fillStyle(fill, alpha); g.fillCircle(x, y, r);
  g.lineStyle(line, INK, 0.85 * alpha); g.strokeCircle(x, y, r);
}

/**
 * Lines of handwriting: `n` rows of looping script across a box — how the court draws words
 * without type. `seed` keeps the squiggles stable.
 */
export function scribble(g: G, x: number, y: number, w: number, n: number, gap: number, color: number, alpha: number, seed: number, thick = 1.2): void {
  g.lineStyle(thick, color, alpha);
  for (let r = 0; r < n; r++) {
    const yy = y + r * gap;
    const len = w * (r === n - 1 ? 0.45 + noise(seed + r) * 0.4 : 0.85 + noise(seed + r) * 0.15);
    g.beginPath(); g.moveTo(x, yy);
    for (let sx = 3; sx < len; sx += 3) {
      const k = noise(seed * 3.1 + r * 17 + sx * 0.37);
      g.lineTo(x + sx, yy - (k < 0.2 ? gap * 0.35 : k > 0.85 ? -gap * 0.2 : Math.sin(sx * 0.9) * gap * 0.12));
    }
    g.strokePath();
  }
}

/** A brass breath-meter — the King's gauge worn over every heart on Highspire. */
export function breathMeter(g: G, x: number, y: number, r: number, frac: number, alpha = 1): void {
  g.fillStyle(BRASS_DARK, alpha); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(BRASS, alpha); g.fillCircle(x, y, r);
  g.fillStyle(PAGE, alpha); g.fillCircle(x, y, r * 0.72);
  g.lineStyle(Math.max(1, r * 0.14), SEAL, 0.8 * alpha);
  g.beginPath(); g.arc(x, y, r * 0.58, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * 0.25, false); g.strokePath();
  const a = Math.PI * 0.75 + Math.PI * 1.5 * clamp(frac, 0, 1);
  g.lineStyle(Math.max(1, r * 0.12), INK, alpha); g.lineBetween(x, y, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
  g.fillStyle(INK, alpha); g.fillCircle(x, y, Math.max(1, r * 0.12));
}

/** The censors' seal: a red wax disc stamped with a breath-meter dial, ribbon tails below. */
export function censorSeal(g: G, x: number, y: number, r: number, alpha = 1): void {
  g.fillStyle(dim(SEAL, 0.3), alpha);
  g.fillTriangle(x - r * 0.5, y + r * 0.4, x - r * 0.1, y + r * 0.6, x - r * 0.7, y + r * 1.7);
  g.fillTriangle(x + r * 0.5, y + r * 0.4, x + r * 0.1, y + r * 0.6, x + r * 0.7, y + r * 1.7);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.fillStyle(SEAL, alpha); g.fillCircle(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, r * 0.3);
  }
  g.fillStyle(SEAL, alpha); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.12), lit(SEAL, 0.35), alpha); g.strokeCircle(x, y, r * 0.66);
  g.lineBetween(x, y, x + r * 0.4, y - r * 0.3);
}

/** A quill pen pointing along `a`, nib at (x, y). */
export function quill(g: G, x: number, y: number, a: number, s: number, vane = PAGE, alpha = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const bx = x - ux * s, by = y - uy * s;
  inked(g, [
    { x: x - ux * s * 0.2, y: y - uy * s * 0.2 },
    { x: bx + nx * s * 0.18, y: by + ny * s * 0.18 },
    { x: bx - ux * s * 0.15, y: by - uy * s * 0.15 },
    { x: bx - nx * s * 0.08, y: by - ny * s * 0.08 },
  ], vane, alpha, 1.4);
  g.lineStyle(1, INK_SOFT, 0.6 * alpha);
  for (let k = 1; k < 6; k++) {
    const t = 0.3 + k * 0.13;
    g.lineBetween(x - ux * s * t, y - uy * s * t, x - ux * s * (t + 0.05) + nx * s * 0.14, y - uy * s * (t + 0.05) + ny * s * 0.14);
  }
  g.lineStyle(Math.max(1.4, s * 0.06), INK, alpha); g.lineBetween(x, y, x - ux * s * 1.1, y - uy * s * 1.1);
  g.fillStyle(INK, alpha); g.fillTriangle(x, y, x - ux * s * 0.2 + nx * s * 0.05, y - uy * s * 0.2 + ny * s * 0.05, x - ux * s * 0.2 - nx * s * 0.05, y - uy * s * 0.2 - ny * s * 0.05);
}

/** A ribbon bookmark hanging from (x, y) down `len`, forked tail. */
export function bookmark(g: G, x: number, y: number, len: number, w: number, color: number, alpha = 1, sway = 0): void {
  const ex = x + sway, ey = y + len;
  inked(g, [
    { x: x - w / 2, y }, { x: x + w / 2, y }, { x: ex + w / 2, y: ey }, { x: ex, y: ey - w * 0.7 }, { x: ex - w / 2, y: ey },
  ], color, alpha, 1.4);
}

// ── Books ───────────────────────────────────────────────────────────

/**
 * An open book lying flat, seen from above-and-in-front: two page blocks either side of a gutter,
 * a cloth cover peeking round the edge. `x, y` is the middle of its front (bottom) edge.
 * `text` writes faint lines on the pages.
 */
export function openBook(g: G, x: number, y: number, w: number, d: number, cover: number, alpha = 1, text = true, seed = 1): void {
  g.fillStyle(0x000000, 0.22 * alpha); g.fillEllipse(x + 6, y + 4, w * 1.08, d * 0.5);
  // Cover boards.
  inked(g, [
    { x: x - w / 2 - 6, y: y + 2 }, { x: x + w / 2 + 6, y: y + 2 }, { x: x + w / 2 + 2, y: y - d - 2 }, { x: x - w / 2 - 2, y: y - d - 2 },
  ], cover, alpha, 2);
  // Page blocks: thick edges at the front.
  for (const side of [-1, 1]) {
    const ox = side * 3;
    inked(g, [
      { x: x + ox, y: y - 6 }, { x: x + side * (w / 2 - 2), y: y - 3 }, { x: x + side * (w / 2 - 5), y: y - d + 4 }, { x: x + ox, y: y - d + 1 },
    ], PAGE, alpha, 1.6);
    g.fillStyle(PARCH_DARK, alpha); g.fillRect(Math.min(x + ox, x + side * (w / 2 - 2)), y - 6, w / 2 - 5, 4);
    if (text) scribble(g, Math.min(x + ox, x + side * (w / 2 - 6)) + 8, y - d + 14, w / 2 - 24, Math.max(1, Math.floor((d - 24) / 9)), 9, INK_SOFT, 0.35 * alpha, seed + side * 13, 1);
  }
  // The gutter's shade and a bookmark down the middle.
  g.fillStyle(INK, 0.18 * alpha); g.fillRect(x - 3, y - d + 1, 6, d - 6);
}

/** A closed book, cover-up, lying flat — clasped. */
export function closedBook(g: G, x: number, y: number, w: number, d: number, cover: number, alpha = 1, clasp = GILT): void {
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x + 6, y + 4, w * 1.08, d * 0.5);
  inkRect(g, x - w / 2, y - 8, w, 8, PAGE, alpha, 1.4);
  for (let k = 1; k < 5; k++) { g.lineStyle(1, PARCH_DARK, 0.7 * alpha); g.lineBetween(x - w / 2 + 2, y - 8 + k * 1.6, x + w / 2 - 2, y - 8 + k * 1.6); }
  inked(g, [{ x: x - w / 2 - 3, y: y - 7 }, { x: x + w / 2 + 3, y: y - 7 }, { x: x + w / 2, y: y - d }, { x: x - w / 2, y: y - d }], cover, alpha, 2);
  g.lineStyle(1.4, lit(cover, 0.3), 0.7 * alpha); g.strokeRect(x - w / 2 + 8, y - d + 6, w - 16, d - 20);
  g.fillStyle(clasp, alpha); g.fillRect(x + w / 2 - 12, y - d * 0.62, 14, 10);
}

/**
 * A pop-up house: an open book on the ground with a paper cottage standing up out of its gutter —
 * fold-lines on the walls, a tab at the base. `shut` draws the book closed over a becalmed
 * household instead, a brass breath-meter hung on the clasp like a padlock.
 */
export function popupHouse(g: G, x: number, y: number, s: number, cover: number, wall: number, roof: number, shut: boolean, rng: () => number, seed: number): void {
  const w = 190 * s, d = 92 * s;
  if (shut) {
    closedBook(g, x, y, w, d, cover, 1, BRASS);
    breathMeter(g, x + w / 2 - 4, y - d * 0.62 + 18, 9 * s, 0.05);
    g.lineStyle(2, IRON, 1); g.lineBetween(x + w / 2 - 4, y - d * 0.62 + 5, x + w / 2 - 4, y - d * 0.62 + 10);
    // A paper chimney poking out of the shut pages, and a curl of breath-smoke that is not there.
    g.fillStyle(wall, 1); g.fillRect(x - w * 0.18, y - d - 10 * s, 12 * s, 12 * s);
    g.lineStyle(1.4, INK, 0.8); g.strokeRect(x - w * 0.18, y - d - 10 * s, 12 * s, 12 * s);
    return;
  }
  openBook(g, x, y, w, d, cover, 1, true, seed);
  // The cottage: front wall and a side wall folded back, so it reads as paper standing up.
  const hx = x, hy = y - d * 0.42, hw = 92 * s, hh = 74 * s;
  const sideW = 26 * s;
  inked(g, [{ x: hx + hw / 2, y: hy }, { x: hx + hw / 2 + sideW, y: hy - 10 * s }, { x: hx + hw / 2 + sideW, y: hy - hh - 10 * s }, { x: hx + hw / 2, y: hy - hh }], dim(wall, 0.18), 1, 1.6);
  inkRect(g, hx - hw / 2, hy - hh, hw, hh, wall, 1, 1.8);
  // Timber framing lines.
  g.lineStyle(3 * s, TIMBER, 0.9);
  g.lineBetween(hx - hw / 2 + 4, hy - hh * 0.5, hx + hw / 2 - 4, hy - hh * 0.5);
  g.lineBetween(hx - hw / 2 + 4, hy - hh + 4, hx - hw / 2 + 20 * s, hy - hh * 0.5);
  g.lineBetween(hx + hw / 2 - 4, hy - hh + 4, hx + hw / 2 - 20 * s, hy - hh * 0.5);
  // Roof: a steep folded card roof, the fold line down the ridge.
  inked(g, [{ x: hx - hw / 2 - 10 * s, y: hy - hh + 2 }, { x: hx + hw / 2 + 10 * s, y: hy - hh + 2 }, { x: hx + hw / 2 + sideW * 0.5, y: hy - hh - 44 * s }, { x: hx - hw / 2 + 12 * s, y: hy - hh - 44 * s }], roof, 1, 1.8);
  inked(g, [{ x: hx + hw / 2 + 10 * s, y: hy - hh + 2 }, { x: hx + hw / 2 + sideW + 6 * s, y: hy - hh - 8 * s }, { x: hx + hw / 2 + sideW * 0.5 + 6 * s, y: hy - hh - 50 * s }, { x: hx + hw / 2 + sideW * 0.5, y: hy - hh - 44 * s }], dim(roof, 0.2), 1, 1.4);
  g.lineStyle(1, dim(roof, 0.35), 0.8);
  for (let k = 1; k < 4; k++) { const yy = hy - hh + 2 - k * 11 * s; g.lineBetween(hx - hw / 2 - 10 * s + k * 5 * s, yy, hx + hw / 2 + 10 * s - k * 2 * s, yy); }
  // Door with a round top and a window either side.
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(hx - 10 * s, hy - 34 * s, 20 * s, 34 * s, { tl: 9 * s, tr: 9 * s, bl: 0, br: 0 });
  g.lineStyle(1.4, INK, 0.9); g.strokeRoundedRect(hx - 10 * s, hy - 34 * s, 20 * s, 34 * s, { tl: 9 * s, tr: 9 * s, bl: 0, br: 0 });
  for (const side of [-1, 1]) {
    const wx = hx + side * 28 * s, wy = hy - hh * 0.3;
    g.fillStyle(0xffe6a0, 1); g.fillRect(wx - 8 * s, wy - 8 * s, 16 * s, 14 * s);
    g.lineStyle(1.4, INK, 0.9); g.strokeRect(wx - 8 * s, wy - 8 * s, 16 * s, 14 * s); g.lineBetween(wx, wy - 8 * s, wx, wy + 6 * s);
  }
  // Paper tabs at the base where it is glued into the gutter.
  g.fillStyle(PARCH_DARK, 1); g.fillRect(hx - hw / 2 + 6, hy - 2, 14, 5); g.fillRect(hx + hw / 2 - 20, hy - 2, 14, 5);
  // A flower box under one window, dots of watercolour.
  for (let k = 0; k < 5; k++) { g.fillStyle(rng() < 0.5 ? CLOTH_RED : GILT_LIT, 1); g.fillCircle(hx - 36 * s + k * 4 * s, hy - hh * 0.3 + 9 * s, 2 * s); }
}

// ── The cloud sea and the torn edge ─────────────────────────────────

/** A soft cumulus puff (several overlapping circles, shaded underneath). */
export function cloudPuff(g: G, x: number, y: number, s: number, alpha = 1, shade = CLOUD_SHADE): void {
  g.fillStyle(shade, alpha * 0.9);
  g.fillEllipse(x, y + s * 0.18, s * 2.2, s * 0.7);
  g.fillStyle(CLOUD, alpha);
  g.fillCircle(x - s * 0.6, y, s * 0.42); g.fillCircle(x, y - s * 0.22, s * 0.56); g.fillCircle(x + s * 0.55, y - s * 0.02, s * 0.44);
  g.fillEllipse(x, y + s * 0.08, s * 1.9, s * 0.5);
}

/**
 * The deckle edge where the land stops: a ragged paper line along a polyline, with the torn fibres
 * showing pale and a lip of rock below it before the drop. `outward` (±1, ±1) points to the cloud.
 */
export function tornEdge(g: G, pts: Pt[], ox: number, oy: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 7));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const j = (rng() - 0.3) * 6;
      // Rock lip below the paper, then the fibres.
      g.fillStyle(0x8a7a6a, 1); g.fillRect(x + ox * (4 + j) - 4, y + oy * (4 + j) - 4, 9, 9 + Math.abs(oy) * 18);
      g.fillStyle(0x6a5a50, 1); g.fillRect(x + ox * (12 + j) - 3, y + oy * (12 + j) - 3, 7, 7 + Math.abs(oy) * 14);
      g.fillStyle(PARCH_LIT, 1); g.fillCircle(x + ox * j * 0.4, y + oy * j * 0.4, 3.5 + rng() * 2);
    }
  }
  g.lineStyle(2, INK, 0.7);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
}

// ── The beanstalk, the giant and the goose ──────────────────────────

/**
 * A beanstalk: two twisting vines climbing from (x, base) up to `topY`, heart-shaped leaves off
 * the twists, curling tendrils. `t` sways it (seconds); `grow` 0..1 draws it part-grown.
 */
export function beanstalk(g: G, x: number, base: number, topY: number, t: number, grow = 1, alpha = 1, thick = 1): void {
  const h = (base - topY) * clamp(grow, 0, 1);
  if (h <= 2) { g.fillStyle(BEAN_LIT, alpha); g.fillEllipse(x, base - 3, 10 * thick, 6 * thick); return; }
  const steps = Math.max(6, Math.floor(h / 10));
  for (const ph of [0, Math.PI]) {
    const col = ph ? BEAN_DARK : BEAN;
    g.lineStyle(9 * thick, INK, 0.7 * alpha);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, yy = base - u * h;
      const xx = x + Math.sin(u * 9 + ph + t * 0.6) * 9 * thick * (1 - u * 0.4) + Math.sin(t * 0.8 + u * 2) * u * 8;
      if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokePath();
    g.lineStyle(6 * thick, col, alpha);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, yy = base - u * h;
      const xx = x + Math.sin(u * 9 + ph + t * 0.6) * 9 * thick * (1 - u * 0.4) + Math.sin(t * 0.8 + u * 2) * u * 8;
      if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokePath();
  }
  // Leaves at intervals, alternating sides; tendril curls between.
  for (let i = 1; i < steps; i += 2) {
    const u = i / steps, yy = base - u * h;
    const xx = x + Math.sin(t * 0.8 + u * 2) * u * 8;
    const side = i % 4 === 1 ? 1 : -1;
    const lx = xx + side * 16 * thick, ly = yy - 2;
    const flap = Math.sin(t * 2 + i) * 0.2;
    g.fillStyle(BEAN_DARK, alpha); g.fillTriangle(xx, yy, lx + side * 6 * thick, ly - 8 * thick + flap * 10, lx, ly + 6 * thick);
    g.fillStyle(BEAN_LIT, alpha);
    g.fillCircle(lx - side * 2 * thick, ly - 3 * thick + flap * 6, 6 * thick); g.fillCircle(lx + side * 3 * thick, ly - 1 * thick + flap * 6, 6 * thick);
    g.fillTriangle(lx - side * 7 * thick, ly - 1 * thick, lx + side * 9 * thick, ly + 1 * thick, lx + side * 2 * thick, ly + 11 * thick);
    g.lineStyle(1, INK, 0.5 * alpha); g.lineBetween(xx, yy, lx + side * 1 * thick, ly + 3 * thick);
    if (i % 3 === 0) {
      g.lineStyle(1.4, BEAN_LIT, alpha);
      g.beginPath(); g.arc(xx - side * 10 * thick, yy - 6 * thick, 4 * thick, 0, Math.PI * 1.6, side < 0); g.strokePath();
    }
  }
}

/**
 * A giant's hobnailed boot in profile, toe toward `dir`, sole at y. `s` 1 is about 150px long.
 * `lift` raises it off the ground (for a stomp coming down).
 */
export function giantBoot(g: G, x: number, y: number, s: number, dir: number, lift = 0, alpha = 1): void {
  const d = dir, by = y - lift;
  const leather = 0x6a4228, leatherLit = 0x8e5c3a;
  inked(g, [
    { x: x - d * 70 * s, y: by }, { x: x + d * 78 * s, y: by }, { x: x + d * 86 * s, y: by - 14 * s }, { x: x + d * 70 * s, y: by - 38 * s },
    { x: x + d * 22 * s, y: by - 52 * s }, { x: x + d * 8 * s, y: by - 120 * s }, { x: x - d * 52 * s, y: by - 124 * s }, { x: x - d * 60 * s, y: by - 40 * s },
  ], leather, alpha, 2.4);
  // Turned-down cuff at the top.
  inked(g, [{ x: x + d * 12 * s, y: by - 112 * s }, { x: x - d * 58 * s, y: by - 116 * s }, { x: x - d * 60 * s, y: by - 136 * s }, { x: x + d * 14 * s, y: by - 134 * s }], leatherLit, alpha, 2);
  // Sole and heel, hobnails.
  g.fillStyle(0x2e2018, alpha); g.fillRect(Math.min(x - d * 70 * s, x + d * 82 * s), by - 8 * s, 152 * s, 8 * s);
  g.fillStyle(0x2e2018, alpha); g.fillRect(Math.min(x - d * 66 * s, x - d * 36 * s), by - 14 * s, 30 * s, 14 * s);
  g.fillStyle(IRON_LIT, alpha);
  for (let k = 0; k < 8; k++) g.fillCircle(x - d * 64 * s + d * k * 19 * s, by - 2 * s, 1.8 * s);
  // Laces criss-crossing up the front, a patch on the toe.
  g.lineStyle(2 * s, PARCH, alpha);
  for (let k = 0; k < 4; k++) {
    const yy = by - 56 * s - k * 14 * s;
    g.lineBetween(x + d * (14 - k * 2) * s, yy, x + d * (2 - k * 2) * s, yy - 12 * s);
    g.lineBetween(x + d * (2 - k * 2) * s, yy, x + d * (14 - k * 2) * s, yy - 12 * s);
  }
  g.fillStyle(leatherLit, alpha); g.fillRoundedRect(x + d * 36 * s - 12 * s, by - 36 * s, 24 * s, 16 * s, 4 * s);
  g.lineStyle(1, INK, 0.7 * alpha);
  for (let k = 0; k < 6; k++) g.lineBetween(x + d * 36 * s - 10 * s + k * 4 * s, by - 36 * s, x + d * 36 * s - 10 * s + k * 4 * s, by - 34 * s);
  g.fillStyle(lit(leather, 0.3), 0.6 * alpha); g.fillEllipse(x - d * 20 * s, by - 90 * s, 18 * s, 40 * s);
}

/**
 * A white goose in profile, facing `dir`, waddle phase `ph`. `golden` gilds her (the Golden
 * Goose); `honk` opens the beak and stretches the neck.
 */
export function goose(g: G, x: number, y: number, dir: number, s: number, ph: number, golden = false, honk = 0, alpha = 1): void {
  const d = dir;
  const body = golden ? 0xf4e0a0 : 0xf4f2ea, shade = golden ? 0xc8a050 : 0xc8c8c0;
  g.fillStyle(0x000000, 0.22 * alpha); g.fillEllipse(x, y + 12 * s, 34 * s, 8 * s);
  // Orange feet, waddling.
  for (const k of [-1, 1]) {
    const fx = x + k * 5 * s + Math.sin(ph + (k > 0 ? Math.PI : 0)) * 3 * s;
    g.lineStyle(2 * s, 0xe08a2a, alpha); g.lineBetween(x + k * 4 * s, y + 4 * s, fx, y + 11 * s);
    g.fillStyle(0xe08a2a, alpha); g.fillTriangle(fx - 4 * s, y + 12 * s, fx + 4 * s, y + 12 * s, fx + d * 5 * s, y + 10 * s);
  }
  inkEllipse(g, x - d * 2 * s, y - 2 * s, 30 * s, 18 * s, body, alpha, 1.6);
  // Tail tuft and a folded wing.
  g.fillStyle(body, alpha); g.fillTriangle(x - d * 14 * s, y - 6 * s, x - d * 22 * s, y - 12 * s, x - d * 15 * s, y + 2 * s);
  g.fillStyle(shade, alpha); g.fillEllipse(x - d * 4 * s, y - 4 * s, 18 * s, 9 * s);
  g.lineStyle(1, INK, 0.5 * alpha); g.lineBetween(x - d * 10 * s, y - 3 * s, x + d * 2 * s, y - 6 * s);
  // Long neck, head, beak.
  const nx = x + d * (10 + honk * 4) * s, ny = y - (20 + honk * 6) * s;
  g.lineStyle(6 * s, INK, 0.7 * alpha); g.lineBetween(x + d * 8 * s, y - 6 * s, nx, ny);
  g.lineStyle(4.5 * s, body, alpha); g.lineBetween(x + d * 8 * s, y - 6 * s, nx, ny);
  inkCircle(g, nx, ny, 5 * s, body, alpha, 1.2);
  g.fillStyle(0xf0902a, alpha);
  g.fillTriangle(nx + d * 3 * s, ny - 2 * s, nx + d * 3 * s, ny + 1.5 * s, nx + d * 11 * s, ny - honk * 3 * s);
  if (honk > 0.2) g.fillTriangle(nx + d * 3 * s, ny + 1 * s, nx + d * 3 * s, ny + 3 * s, nx + d * 10 * s, ny + 3 * s + honk * 3 * s);
  g.fillStyle(INK, alpha); g.fillCircle(nx + d * 1.5 * s, ny - 1.5 * s, 1.1 * s);
  if (golden) { g.fillStyle(GILT_LIT, 0.8 * alpha); g.fillCircle(x - d * 6 * s, y - 9 * s, 2 * s); g.fillCircle(nx - d * 1 * s, ny - 4 * s, 1.4 * s); }
}

/** A golden egg, a highlight and a glint. */
export function goldenEgg(g: G, x: number, y: number, s: number, t: number, alpha = 1): void {
  g.fillStyle(0x000000, 0.22 * alpha); g.fillEllipse(x, y + 7 * s, 14 * s, 4 * s);
  inkEllipse(g, x, y, 12 * s, 15 * s, GILT, alpha, 1.2);
  g.fillStyle(GILT_LIT, alpha); g.fillEllipse(x - 2 * s, y - 3 * s, 4 * s, 6 * s);
  const tw = (Math.sin(t * 4 + x) + 1) / 2;
  if (tw > 0.7) {
    g.lineStyle(1.2, 0xffffff, (tw - 0.7) * 3 * alpha);
    g.lineBetween(x + 3 * s, y - 9 * s, x + 3 * s, y - 15 * s); g.lineBetween(x, y - 12 * s, x + 6 * s, y - 12 * s);
  }
}

// ── The three little houses and the wolf ────────────────────────────

export type PigHouse = 'straw' | 'sticks' | 'brick';

/**
 * One of the three little pigs' houses: `fallen` 0..1 blows it apart (straw scatters, sticks
 * topple, brick never moves). `x, y` is the middle of the front base.
 */
export function pigHouse(g: G, kind: PigHouse, x: number, y: number, s: number, fallen: number, rng: () => number, alpha = 1): void {
  const w = 64 * s, h = 46 * s;
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x + 4, y + 3, w * 1.3, 14 * s);
  if (kind === 'straw') {
    if (fallen > 0) {
      // A heap of thatch and loose straws, blown flat.
      g.fillStyle(THATCH_DARK, alpha); g.fillEllipse(x, y - 6 * s, w * (1 + fallen * 0.4), 16 * s);
      g.fillStyle(THATCH, alpha); g.fillEllipse(x - 4, y - 9 * s, w * (0.8 + fallen * 0.3), 12 * s);
      g.lineStyle(1.4, THATCH, alpha);
      for (let k = 0; k < 18; k++) { const a = rng() * Math.PI; const r = (10 + rng() * 40) * s; g.lineBetween(x + Math.cos(a) * r, y - 4 * s - Math.sin(a) * r * 0.3, x + Math.cos(a) * r + 6 * s, y - 6 * s - Math.sin(a) * r * 0.3); }
      return;
    }
    inkRect(g, x - w / 2, y - h, w, h, THATCH, alpha, 1.6);
    g.lineStyle(1, THATCH_DARK, alpha);
    for (let k = 0; k < 14; k++) { const xx = x - w / 2 + 3 + k * (w - 6) / 13; g.lineBetween(xx, y - h + 2, xx + (rng() - 0.5) * 3, y - 1); }
    inked(g, [{ x: x - w / 2 - 8 * s, y: y - h + 2 }, { x: x + w / 2 + 8 * s, y: y - h + 2 }, { x, y: y - h - 34 * s }], THATCH_DARK, alpha, 1.6);
    g.lineStyle(1, THATCH, alpha);
    for (let k = 0; k < 8; k++) g.lineBetween(x + (k - 4) * 8 * s, y - h, x + (k - 4) * 3 * s, y - h - 26 * s);
  } else if (kind === 'sticks') {
    if (fallen > 0) {
      g.lineStyle(3 * s, STICKS, alpha);
      for (let k = 0; k < 12; k++) { const a = (rng() - 0.5) * 0.6; const xx = x + (rng() - 0.5) * w * 1.3; g.lineBetween(xx - Math.cos(a) * 18 * s, y - 4 * s + Math.sin(a) * 6, xx + Math.cos(a) * 18 * s, y - 8 * s - Math.sin(a) * 6); }
      g.lineStyle(1.2, INK, 0.6 * alpha); g.strokeEllipse(x, y - 6 * s, w * 1.2, 14 * s);
      return;
    }
    g.fillStyle(dim(STICKS, 0.4), alpha); g.fillRect(x - w / 2, y - h, w, h);
    g.lineStyle(3.2 * s, STICKS, alpha);
    for (let k = 0; k < 10; k++) { const xx = x - w / 2 + 4 + k * (w - 8) / 9; g.lineBetween(xx, y, xx + (rng() - 0.5) * 4, y - h - 3); }
    g.lineStyle(2.4 * s, lit(STICKS, 0.15), alpha); g.lineBetween(x - w / 2 - 2, y - h * 0.3, x + w / 2 + 2, y - h * 0.35); g.lineBetween(x - w / 2 - 2, y - h * 0.75, x + w / 2 + 2, y - h * 0.7);
    g.lineStyle(1.6, INK, 0.8 * alpha); g.strokeRect(x - w / 2, y - h, w, h);
    g.lineStyle(3 * s, STICKS, alpha);
    g.lineBetween(x - w / 2 - 8 * s, y - h + 4, x + 4 * s, y - h - 32 * s); g.lineBetween(x + w / 2 + 8 * s, y - h + 4, x - 4 * s, y - h - 32 * s);
    for (let k = 0; k < 6; k++) g.lineBetween(x - w / 2 + k * w / 5, y - h, x - 2 + k * 0.8, y - h - 28 * s);
  } else {
    inkRect(g, x - w / 2, y - h, w, h, BRICK, alpha, 1.8);
    for (let r = 0; r < 6; r++) {
      const yy = y - h + 2 + r * (h / 6);
      g.lineStyle(1, BRICK_DARK, 0.9 * alpha); g.lineBetween(x - w / 2, yy, x + w / 2, yy);
      for (let xx = x - w / 2 + (r % 2) * 7 * s; xx < x + w / 2; xx += 14 * s) g.lineBetween(xx, yy, xx, yy + h / 6);
    }
    inked(g, [{ x: x - w / 2 - 6 * s, y: y - h + 2 }, { x: x + w / 2 + 6 * s, y: y - h + 2 }, { x, y: y - h - 30 * s }], 0x8a3a3a, alpha, 1.8);
    inkRect(g, x + w * 0.2, y - h - 30 * s, 9 * s, 16 * s, BRICK_DARK, alpha, 1.2);
  }
  if (kind !== 'straw' || fallen <= 0) {
    // A round door and a little window.
    g.fillStyle(TIMBER_DARK, alpha); g.fillRoundedRect(x - 7 * s, y - 20 * s, 14 * s, 20 * s, { tl: 7 * s, tr: 7 * s, bl: 0, br: 0 });
    g.fillStyle(0xffe6a0, alpha); g.fillRect(x + w * 0.18, y - h * 0.7, 9 * s, 9 * s);
    g.lineStyle(1.2, INK, 0.8 * alpha); g.strokeRect(x + w * 0.18, y - h * 0.7, 9 * s, 9 * s);
  }
}

/**
 * The Big Bad Wolf's head and shoulders, facing `dir`. `puff` 0..1 swells the cheeks for the huff;
 * `blow` 0..1 opens the mouth and streams the breath out.
 */
export function bigBadWolf(g: G, x: number, y: number, dir: number, s: number, puff: number, blow: number, alpha = 1): void {
  const d = dir;
  const fur = 0x6e6a78, furLit = 0x9a96a6, furDark = 0x3e3a46;
  inkEllipse(g, x, y + 10 * s, 40 * s, 26 * s, furDark, alpha, 1.6);
  inkEllipse(g, x, y - 6 * s, (34 + puff * 10) * s, (30 + puff * 6) * s, fur, alpha, 1.8);
  for (const side of [-1, 1]) {
    inked(g, [{ x: x + side * 8 * s, y: y - 20 * s }, { x: x + side * 18 * s, y: y - 18 * s }, { x: x + side * 15 * s, y: y - 38 * s }], fur, alpha, 1.4);
    g.fillStyle(0xd8a0a8, alpha); g.fillTriangle(x + side * 11 * s, y - 21 * s, x + side * 16 * s, y - 20 * s, x + side * 15 * s, y - 32 * s);
  }
  // Cheeks puffed out.
  if (puff > 0) { g.fillStyle(furLit, alpha); g.fillCircle(x + d * 10 * s, y - 2 * s, (5 + puff * 9) * s); g.lineStyle(1.2, INK, 0.7 * alpha); g.strokeCircle(x + d * 10 * s, y - 2 * s, (5 + puff * 9) * s); }
  // Long snout, nose, yellow eye under a wicked brow.
  inked(g, [{ x: x + d * 8 * s, y: y - 10 * s }, { x: x + d * 34 * s, y: y - 4 * s }, { x: x + d * 34 * s, y: y + (2 + blow * 6) * s }, { x: x + d * 8 * s, y: y + 4 * s }], furLit, alpha, 1.4);
  g.fillStyle(INK, alpha); g.fillCircle(x + d * 34 * s, y - 3 * s, 3 * s);
  if (blow > 0.1) { g.fillStyle(0x6a1a22, alpha); g.fillEllipse(x + d * 30 * s, y + 2 * s, 8 * s, (2 + blow * 7) * s); }
  g.fillStyle(0xffd84a, alpha); g.fillCircle(x + d * 6 * s, y - 12 * s, 3.2 * s);
  g.fillStyle(INK, alpha); g.fillCircle(x + d * 6.6 * s, y - 12 * s, 1.4 * s);
  g.lineStyle(2, INK, alpha); g.lineBetween(x + d * 1 * s, y - 17 * s, x + d * 11 * s, y - 15 * s);
  // Teeth.
  g.fillStyle(0xffffff, alpha);
  for (let k = 0; k < 3; k++) g.fillTriangle(x + d * (20 + k * 4) * s, y + 3 * s, x + d * (22 + k * 4) * s, y + 3 * s, x + d * (21 + k * 4) * s, y + 7 * s);
}

// ── The mirror and the apple ────────────────────────────────────────

/**
 * The Stepmother's magic mirror on its gilt stand: an oval glass with a pale face in it.
 * `face` 0..1 brings the face up out of the glass; `glare` tints it.
 */
export function magicMirror(g: G, x: number, y: number, s: number, t: number, face: number, glare = 0x9ad8ff, alpha = 1): void {
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x, y + 2, 60 * s, 14 * s);
  // Stand: clawed feet and a post.
  g.lineStyle(5 * s, GILT_DARK, alpha); g.lineBetween(x - 20 * s, y, x, y - 24 * s); g.lineBetween(x + 20 * s, y, x, y - 24 * s);
  g.lineStyle(3 * s, GILT, alpha); g.lineBetween(x - 20 * s, y, x, y - 24 * s); g.lineBetween(x + 20 * s, y, x, y - 24 * s);
  // Frame: a scalloped gilt oval.
  const cy = y - 70 * s;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    g.fillStyle(k % 2 ? GILT : GILT_DARK, alpha); g.fillCircle(x + Math.cos(a) * 30 * s, cy + Math.sin(a) * 42 * s, 6 * s);
  }
  inkEllipse(g, x, cy, 58 * s, 82 * s, GILT, alpha, 2);
  g.fillStyle(mixC(0x1a2a3a, glare, 0.25), alpha); g.fillEllipse(x, cy, 46 * s, 70 * s);
  // Sheen sliding across the glass.
  const sh = ((t * 0.3) % 1) * 2 - 1;
  g.fillStyle(0xffffff, 0.12 * alpha); g.fillEllipse(x + sh * 14 * s, cy - 6 * s, 10 * s, 50 * s);
  // The face in the glass.
  if (face > 0) {
    const a = face * alpha;
    g.fillStyle(lit(glare, 0.6), 0.55 * a); g.fillEllipse(x, cy, 30 * s, 42 * s);
    g.fillStyle(INK, 0.8 * a);
    g.fillEllipse(x - 7 * s, cy - 6 * s, 6 * s, 3 * s); g.fillEllipse(x + 7 * s, cy - 6 * s, 6 * s, 3 * s);
    g.lineStyle(1.6 * s, INK, 0.7 * a);
    g.beginPath(); g.arc(x, cy + 8 * s, 6 * s, 0.2, Math.PI - 0.2, false); g.strokePath();
  }
  // Crest: a crown on the frame's head.
  g.fillStyle(GILT_LIT, alpha);
  g.fillTriangle(x - 10 * s, cy - 44 * s, x - 4 * s, cy - 44 * s, x - 8 * s, cy - 56 * s);
  g.fillTriangle(x - 3 * s, cy - 44 * s, x + 3 * s, cy - 44 * s, x, cy - 60 * s);
  g.fillTriangle(x + 4 * s, cy - 44 * s, x + 10 * s, cy - 44 * s, x + 8 * s, cy - 56 * s);
}

/** An apple — red and shining, or poisoned (a green sheen and a skull-white bite). */
export function apple(g: G, x: number, y: number, r: number, poisoned: boolean, spin = 0, alpha = 1): void {
  inkCircle(g, x, y, r, APPLE, alpha, 1.2);
  g.fillStyle(0xffffff, 0.45 * alpha); g.fillEllipse(x - r * 0.35, y - r * 0.35, r * 0.5, r * 0.3);
  const sx = x + Math.cos(spin) * r * 0.2, sy = y - r * 0.9;
  g.lineStyle(1.6, TIMBER_DARK, alpha); g.lineBetween(sx, sy, sx + 1, sy - r * 0.5);
  g.fillStyle(BEAN, alpha); g.fillEllipse(sx + r * 0.35, sy - r * 0.3, r * 0.6, r * 0.28);
  if (poisoned) {
    g.fillStyle(POISON, 0.45 * alpha); g.fillCircle(x + r * 0.2, y + r * 0.1, r * 0.55);
    g.fillStyle(PAGE, alpha); g.fillCircle(x + Math.cos(spin + 1) * r * 0.5, y + Math.sin(spin + 1) * r * 0.5, r * 0.32);
  }
}

// ── The dragon and its hoard ────────────────────────────────────────

/**
 * A heap of treasure: coins, a goblet, a crown, a gem or two. `s` 1 is about 90px across.
 */
export function hoardPile(g: G, x: number, y: number, s: number, rng: () => number, alpha = 1): void {
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x + 4, y + 4, 100 * s, 24 * s);
  g.fillStyle(GILT_DARK, alpha); g.fillEllipse(x, y - 6 * s, 92 * s, 30 * s);
  g.fillStyle(GILT, alpha); g.fillEllipse(x, y - 10 * s, 80 * s, 26 * s);
  g.fillStyle(GILT, alpha); g.fillEllipse(x - 4 * s, y - 18 * s, 50 * s, 20 * s);
  for (let k = 0; k < 26; k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
    const cx = x + Math.cos(a) * r * 40 * s, cy = y - 12 * s + Math.sin(a) * r * 12 * s;
    g.fillStyle(rng() < 0.5 ? GILT_LIT : GILT, alpha); g.fillEllipse(cx, cy, 7 * s, 4 * s);
    g.lineStyle(0.8, GILT_DARK, alpha); g.strokeEllipse(cx, cy, 7 * s, 4 * s);
  }
  // A goblet and a crown, a ruby and a sapphire.
  const gx = x + 18 * s, gy = y - 22 * s;
  g.fillStyle(GILT_LIT, alpha); g.fillTriangle(gx - 6 * s, gy - 12 * s, gx + 6 * s, gy - 12 * s, gx, gy - 2 * s); g.fillRect(gx - 1, gy - 2 * s, 2, 6 * s); g.fillRect(gx - 4 * s, gy + 4 * s, 8 * s, 2 * s);
  const cx = x - 18 * s, cy = y - 24 * s;
  g.fillStyle(GILT_LIT, alpha); g.fillRect(cx - 8 * s, cy - 2 * s, 16 * s, 5 * s);
  for (let k = 0; k < 3; k++) g.fillTriangle(cx - 8 * s + k * 6 * s, cy - 2 * s, cx - 4 * s + k * 6 * s, cy - 2 * s, cx - 6 * s + k * 6 * s, cy - 9 * s);
  g.fillStyle(APPLE, alpha); g.fillCircle(cx, cy, 1.6 * s); g.fillStyle(0x4a7aff, alpha); g.fillCircle(x + 2 * s, y - 14 * s, 2.4 * s);
}

/**
 * A dragon seen from above, curled round a point: a long scaled body on an arc, folded wings, a
 * horned head at one end and a spaded tail at the other. `wake` 0..1 lifts the head and opens the
 * eyes; `t` breathes the flanks.
 */
export function curledDragon(g: G, cx: number, cy: number, R: number, t: number, wake: number, headA: number, alpha = 1): void {
  const a0 = headA - Math.PI * 1.55, a1 = headA;
  const n = 30;
  const breath = 1 + Math.sin(t * 1.4) * 0.04 * (1 - wake * 0.5);
  const pt = (u: number): Pt => {
    const a = a0 + (a1 - a0) * u;
    const r = R * (0.62 + u * 0.38);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.62 };
  };
  // Body: tail end thin, shoulders thick.
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = pt(u);
    const w = (6 + Math.sin(u * Math.PI * 0.9) * 22 + u * 6) * breath;
    g.fillStyle(INK, 0.8 * alpha); g.fillCircle(p.x, p.y, w + 2);
  }
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = pt(u);
    const w = (6 + Math.sin(u * Math.PI * 0.9) * 22 + u * 6) * breath;
    g.fillStyle(DRAGON, alpha); g.fillCircle(p.x, p.y, w);
    g.fillStyle(DRAGON_LIT, 0.5 * alpha); g.fillCircle(p.x - w * 0.25, p.y - w * 0.3, w * 0.4);
  }
  // Ridge spines down the back.
  for (let i = 2; i < n; i += 2) {
    const u = i / n, p = pt(u), q = pt(Math.min(1, u + 0.02));
    const a = Math.atan2(q.y - p.y, q.x - p.x) - Math.PI / 2;
    const h = 5 + Math.sin(u * Math.PI) * 8;
    g.fillStyle(DRAGON_DARK, alpha);
    g.fillTriangle(p.x + Math.cos(a + 1.6) * 4, p.y + Math.sin(a + 1.6) * 4, p.x - Math.cos(a + 1.6) * 4, p.y - Math.sin(a + 1.6) * 4, p.x + Math.cos(a) * h, p.y + Math.sin(a) * h);
  }
  // Tail spade.
  const tp = pt(0), tq = pt(0.04);
  const ta = Math.atan2(tp.y - tq.y, tp.x - tq.x);
  inked(g, [
    { x: tp.x + Math.cos(ta) * 16, y: tp.y + Math.sin(ta) * 16 },
    { x: tp.x + Math.cos(ta + 2.2) * 9, y: tp.y + Math.sin(ta + 2.2) * 9 },
    { x: tp.x, y: tp.y },
    { x: tp.x + Math.cos(ta - 2.2) * 9, y: tp.y + Math.sin(ta - 2.2) * 9 },
  ], DRAGON_DARK, alpha, 1.4);
  // Folded wing over the shoulders.
  const sp = pt(0.72), sq = pt(0.5);
  inked(g, [{ x: sp.x, y: sp.y - 8 }, { x: sq.x + 6, y: sq.y - 30 }, { x: sq.x - 18, y: sq.y - 12 }, { x: pt(0.6).x, y: pt(0.6).y + 4 }], DRAGON_DARK, alpha, 1.6);
  g.lineStyle(1.2, DRAGON_LIT, 0.7 * alpha); g.lineBetween(sp.x, sp.y - 8, sq.x - 6, sq.y - 20);
  // Head: lifts and turns with `wake`.
  const hp = pt(1), hq = pt(0.96);
  const ha = Math.atan2(hp.y - hq.y, hp.x - hq.x);
  const hx = hp.x + Math.cos(ha) * (18 + wake * 14), hy = hp.y + Math.sin(ha) * (18 + wake * 14) - wake * 10;
  inkEllipse(g, hx, hy, 46, 30, DRAGON, alpha, 1.8);
  inkEllipse(g, hx + Math.cos(ha) * 20, hy + Math.sin(ha) * 12, 26, 18, DRAGON_LIT, alpha, 1.4);
  for (const side of [-1, 1]) {
    const bx = hx - Math.cos(ha) * 14 + Math.cos(ha + side * Math.PI / 2) * 10, by = hy - Math.sin(ha) * 10 + Math.sin(ha + side * Math.PI / 2) * 8;
    inked(g, [{ x: bx, y: by }, { x: bx - Math.cos(ha) * 20 + Math.cos(ha + side * 1.8) * 8, y: by - Math.sin(ha) * 14 - 10 }, { x: bx + Math.cos(ha) * 4, y: by - 2 }], DRAGON_BELLY, alpha, 1.2);
    // Eyes: shut lines asleep, slit gold awake.
    const ex = hx + Math.cos(ha) * 4 + Math.cos(ha + side * Math.PI / 2) * 9, ey = hy + Math.sin(ha) * 3 + Math.sin(ha + side * Math.PI / 2) * 6 - 3;
    if (wake < 0.35) { g.lineStyle(1.6, INK, alpha); g.lineBetween(ex - 4, ey, ex + 4, ey + 1); }
    else { g.fillStyle(0xffd84a, alpha); g.fillEllipse(ex, ey, 8, 6 * wake); g.fillStyle(INK, alpha); g.fillRect(ex - 0.8, ey - 3 * wake, 1.6, 6 * wake); }
  }
  // Nostrils, and asleep a curl of smoke.
  const nx = hx + Math.cos(ha) * 30, ny = hy + Math.sin(ha) * 18;
  g.fillStyle(INK, alpha); g.fillCircle(nx + Math.cos(ha + 1.4) * 3, ny + Math.sin(ha + 1.4) * 3, 1.6); g.fillCircle(nx + Math.cos(ha - 1.4) * 3, ny + Math.sin(ha - 1.4) * 3, 1.6);
}

// ── Storybook trees, fence and lamp ─────────────────────────────────

/**
 * A storybook tree: a round watercolour crown with a swirl drawn in it, an ink outline, a
 * crooked trunk with one knot-hole. `kind` 'round' or 'poplar' (tall and thin).
 */
export function storyTree(g: G, x: number, y: number, s: number, kind: 'round' | 'poplar', rng: () => number, tint = 0): void {
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x + 8, y + 3, s * 1.8, s * 0.5);
  const lean = (rng() - 0.5) * s * 0.15;
  g.lineStyle(s * 0.2 + 3, INK, 0.85); g.lineBetween(x, y, x + lean, y - s * 1.0);
  g.lineStyle(s * 0.2, TIMBER, 1); g.lineBetween(x, y, x + lean, y - s * 1.0);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x + lean * 0.5, y - s * 0.5, s * 0.07, s * 0.1);
  const leaf = mixC(MEADOW_DARK, tint || MEADOW_DARK, tint ? 0.5 : 0);
  if (kind === 'round') {
    const cx = x + lean, cy = y - s * 1.45;
    inkCircle(g, cx, cy, s * 0.75, leaf, 1, 2.2);
    g.fillStyle(lit(leaf, 0.22), 0.8); g.fillCircle(cx - s * 0.22, cy - s * 0.2, s * 0.42);
    g.lineStyle(1.6, dim(leaf, 0.35), 0.8);
    g.beginPath(); g.arc(cx + s * 0.08, cy + s * 0.05, s * 0.42, 0.2, Math.PI * 1.4, false); g.strokePath();
    g.beginPath(); g.arc(cx + s * 0.08, cy + s * 0.05, s * 0.2, Math.PI, Math.PI * 2.3, false); g.strokePath();
  } else {
    const cx = x + lean, cy = y - s * 1.7;
    inkEllipse(g, cx, cy, s * 0.7, s * 1.9, leaf, 1, 2.2);
    g.fillStyle(lit(leaf, 0.22), 0.8); g.fillEllipse(cx - s * 0.12, cy - s * 0.3, s * 0.32, s * 1.1);
    g.lineStyle(1.4, dim(leaf, 0.35), 0.8);
    for (let k = 0; k < 4; k++) g.lineBetween(cx - s * 0.18, cy - s * 0.6 + k * s * 0.35, cx + s * 0.15, cy - s * 0.5 + k * s * 0.35);
  }
}

/** A drawn picket fence between two points, ink-lined. */
export function picketFence(g: G, a: Pt, b: Pt, color = PAGE): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.floor(len / 14));
  g.lineStyle(3, INK, 0.8); g.lineBetween(a.x, a.y - 10, b.x, b.y - 10); g.lineBetween(a.x, a.y - 20, b.x, b.y - 20);
  g.lineStyle(2, color, 1); g.lineBetween(a.x, a.y - 10, b.x, b.y - 10); g.lineBetween(a.x, a.y - 20, b.x, b.y - 20);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    inked(g, [{ x: x - 3, y }, { x: x + 3, y }, { x: x + 3, y: y - 26 }, { x, y: y - 31 }, { x: x - 3, y: y - 26 }], color, 1, 1.2);
  }
}

/** A storybook lamp-post: curly iron, a lantern with a candle in it. */
export function storyLamp(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x + 3, y + 2, 20, 6);
  g.lineStyle(5, INK, 0.85); g.lineBetween(x, y, x, y - 58);
  g.lineStyle(3, IRON, 1); g.lineBetween(x, y, x, y - 58);
  g.lineStyle(2, IRON, 1); g.beginPath(); g.arc(x + 7, y - 58, 7, Math.PI, Math.PI * 1.9, false); g.strokePath();
  inked(g, [{ x: x + 7, y: y - 62 }, { x: x + 17, y: y - 62 }, { x: x + 19, y: y - 46 }, { x: x + 5, y: y - 46 }], 0xffe6a0, 1, 1.4);
  g.fillStyle(IRON, 1); g.fillTriangle(x + 4, y - 62, x + 20, y - 62, x + 12, y - 70);
}
