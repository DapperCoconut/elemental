import Phaser from 'phaser';
import type { Pt, Rect, Solid } from '../../../../IslesTypes';
import { type G, type HouseOpts, dim, house, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Brinehollow's own hand — the bricks the harbour town is drawn with.
 *
 * Brandmark's port was tar and black sand; Brinehollow is wet stone, grey-green timber and rope.
 * Everything here stands on legs or has a line of green slime across it at the height the sea
 * last reached. These helpers are shared by the area painter and the arena floor.
 */

// ── Palette ───────────────────────────────────────────────────────────

/** Salt-crusted upper-town rock and its mottling. */
export const ROCK = 0x4a524c;
export const ROCK_ALT = 0x5a625a;
/** Seawall and tithe-house stone: a cold grey with green in it. */
export const STONE = 0x6a7670;
export const STONE_DARK = 0x3a4442;
/** Tidal mud under the stilt quarter. */
export const MUD = 0x3c3a30;
export const MUD_WET = 0x2e322c;
/** Grey shingle beach. */
export const SHINGLE = 0x5e5e58;
export const SHINGLE_ALT = 0x76746a;
/** The sea, shallow to deep. */
export const SEA_SHALLOW = 0x2e6a6c;
export const SEA = 0x1e4e5a;
export const SEA_DEEP = 0x12343f;
export const FOAM = 0xe2f0ec;
/** The drowned quarter — greener, stiller, murkier than the open sea. */
export const SUNK = 0x1e3e3a;
export const SUNK_DEEP = 0x14302e;
/** Boardwalk timber, silver-grey with salt. */
export const PLANK = 0x7a6c58;
export const PLANK_DARK = 0x3e362c;
export const ROPE = 0xbaa678;
/** The tide mark: algae green-black, with a pale salt line above. */
export const TIDE = 0x263c30;
export const SALT = 0xe6e2d4;
export const BRASS = 0xc9a44a;
/** Whale-oil lamp glass — the town burns its lamps teal-gold. */
export const LAMP = 0xffd88a;
/** The Queen's colour: the teal of deep water in sunlight. */
export const QUEEN = 0x3aa0a8;
export const QUEEN_DARK = 0x1a5a62;

// ── The Undertow crest ───────────────────────────────────────────────

/**
 * Queen Maresa's crest: a whirlpool (a three-turn spiral drawn into its own centre) under a crown
 * of three points. It is stamped on the tithe-house, the ledgers and every coin she takes.
 */
export function crest(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.4, r * 0.16), color, a);
  g.beginPath();
  const turns = 2.6;
  const steps = 42;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * Math.PI * 2;
    const rr = r * (1 - t) * 0.92;
    const px = x + Math.cos(ang) * rr, py = y + 2 + Math.sin(ang) * rr * 0.8;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.fillStyle(color, a);
  for (const k of [-1, 0, 1]) {
    const cx = x + k * r * 0.5;
    const h = k === 0 ? r * 0.75 : r * 0.5;
    g.fillTriangle(cx - r * 0.18, y - r * 0.72, cx + r * 0.18, y - r * 0.72, cx, y - r * 0.72 - h);
  }
  g.fillRect(x - r * 0.7, y - r * 0.78, r * 1.4, Math.max(1.5, r * 0.12));
}

// ── Tide marks ───────────────────────────────────────────────────────

/**
 * The lines the sea leaves on a wall: a green-black band with dribbles hanging under it and a
 * thin crust of salt along its top. `levels` are heights above `yBase`, lowest (newest, darkest)
 * first — Brinehollow walls carry the history of every flood the Queen let in.
 */
export function tideMarks(g: G, x0: number, x1: number, yBase: number, levels: number[], rng: () => number): void {
  levels.forEach((lv, i) => {
    const y = yBase - lv;
    const a = 0.75 - i * 0.18;
    g.fillStyle(TIDE, a);
    g.beginPath();
    g.moveTo(x0, y + 4);
    for (let x = x0; x <= x1; x += 6) g.lineTo(x, y + Math.sin(x * 0.11 + i * 2) * 1.6);
    g.lineTo(x1, y + 4);
    g.closePath();
    g.fillPath();
    g.fillStyle(TIDE, a * 0.6);
    g.fillRect(x0, y, x1 - x0, 3);
    for (let x = x0 + 3; x < x1 - 2; x += 5 + rng() * 9) {
      g.fillRect(x, y + 2, 1.5, 3 + rng() * 9);
    }
    g.fillStyle(SALT, 0.35 * a + 0.1);
    g.fillRect(x0, y - 1.5, x1 - x0, 1.2);
  });
}

// ── Stilts and stilt houses ──────────────────────────────────────────

/** A row of pilings from the mud up to a floor at `y - lift`, barnacled and banded with tide. */
export function stilts(g: G, x: number, y: number, w: number, lift: number, rng: () => number): void {
  const n = Math.max(2, Math.round(w / 38));
  shadow(g, x, y + 2, w * 1.05, 16, 0.36);
  for (let i = 0; i < n; i++) {
    const px = x - w / 2 + 6 + (i * (w - 12)) / (n - 1);
    g.fillStyle(dim(PLANK_DARK, 0.25), 1); g.fillRect(px - 5, y - lift, 10, lift + 2);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(px - 4, y - lift, 8, lift);
    g.fillStyle(lit(PLANK_DARK, 0.18), 1); g.fillRect(px - 4, y - lift, 2, lift);
    // Wet foot, barnacles, a weed beard.
    g.fillStyle(TIDE, 0.85); g.fillRect(px - 4, y - lift * 0.45, 8, lift * 0.45);
    for (let k = 0; k < 4; k++) {
      g.fillStyle(0xd8d4c4, 0.8); g.fillCircle(px - 3 + rng() * 6, y - 4 - rng() * lift * 0.4, 1.2 + rng());
    }
    g.lineStyle(1, 0x3a5a3a, 0.8); g.lineBetween(px + 3, y - lift * 0.45, px + 5, y - lift * 0.45 + 8);
  }
  // Cross-bracing.
  g.lineStyle(3, PLANK_DARK, 1);
  for (let i = 0; i < n - 1; i++) {
    const a = x - w / 2 + 6 + (i * (w - 12)) / (n - 1);
    const b = x - w / 2 + 6 + ((i + 1) * (w - 12)) / (n - 1);
    g.lineBetween(a, y - lift + 4, b, y - 8);
  }
}

/**
 * A house on stilts: pilings, a plank floor-deck sticking out front, the house on top, tide marks
 * across the lower wall and a ladder down to the mud. `y` is the mud line (the piece's feet).
 */
export function stiltHouse(g: G, x: number, y: number, w: number, h: number, lift: number, o: HouseOpts, rng: () => number, marks: number[] = [10, 22]): Pt {
  stilts(g, x, y, w, lift, rng);
  const fy = y - lift;
  // Deck.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2 - 10, fy - 2, w + 20, 10);
  for (let k = 0; k < (w + 20) / 9; k++) {
    g.fillStyle(mixC(PLANK, 0x000000, rng() * 0.3), 1);
    g.fillRect(x - w / 2 - 9 + k * 9, fy - 1, 8, 7);
  }
  const door = house(g, x, fy - 2, w, h, o, rng);
  tideMarks(g, x - w / 2, x + w / 2, fy - 2, marks, rng);
  // Ladder from the door to the mud.
  g.lineStyle(2, PLANK_DARK, 1);
  g.lineBetween(x - 9, fy + 6, x - 9, y); g.lineBetween(x + 9, fy + 6, x + 9, y);
  for (let ry = fy + 12; ry < y; ry += 8) g.lineBetween(x - 9, ry, x + 9, ry);
  return door;
}

// ── Walkways ─────────────────────────────────────────────────────────

/** Boardwalk planks over a rect, laid across its length (`dir` is the run of the walk). */
export function planks(g: G, r: Rect, dir: 'h' | 'v', rng: () => number, base = PLANK): void {
  g.fillStyle(PLANK_DARK, 1); g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  if (dir === 'h') {
    for (let x = r.x; x < r.x + r.w; x += 12) {
      g.fillStyle(mixC(base, 0x000000, rng() * 0.28), 1);
      g.fillRect(x + 1, r.y, Math.min(10, r.x + r.w - x - 1), r.h);
      if (rng() < 0.2) { g.fillStyle(PLANK_DARK, 0.9); g.fillCircle(x + 5, r.y + 3 + rng() * (r.h - 6), 1.1); }
    }
  } else {
    for (let y = r.y; y < r.y + r.h; y += 12) {
      g.fillStyle(mixC(base, 0x000000, rng() * 0.28), 1);
      g.fillRect(r.x, y + 1, r.w, Math.min(10, r.y + r.h - y - 1));
      if (rng() < 0.2) { g.fillStyle(PLANK_DARK, 0.9); g.fillCircle(r.x + 3 + rng() * (r.w - 6), y + 5, 1.1); }
    }
  }
  g.fillStyle(SALT, 0.12);
  if (dir === 'h') g.fillRect(r.x, r.y, r.w, 2); else g.fillRect(r.x, r.y, 2, r.h);
}

/**
 * A rope bridge: slatted planks with water showing between them, hung from two hand-ropes on
 * posts. The ropes are re-drawn swaying in `animate`; this is the baked deck.
 */
export function ropeBridgeDeck(g: G, r: Rect, dir: 'h' | 'v', rng: () => number): void {
  if (dir === 'h') {
    for (let x = r.x; x < r.x + r.w; x += 11) {
      const missing = rng() < 0.06;
      if (missing) continue;
      g.fillStyle(PLANK_DARK, 1); g.fillRect(x, r.y + 2, 9, r.h - 4);
      g.fillStyle(mixC(PLANK, 0x000000, rng() * 0.35), 1); g.fillRect(x + 1, r.y + 3, 7, r.h - 6);
    }
    g.lineStyle(1.5, dim(ROPE, 0.25), 1);
    g.lineBetween(r.x, r.y + 5, r.x + r.w, r.y + 5); g.lineBetween(r.x, r.y + r.h - 5, r.x + r.w, r.y + r.h - 5);
  } else {
    for (let y = r.y; y < r.y + r.h; y += 11) {
      if (rng() < 0.06) continue;
      g.fillStyle(PLANK_DARK, 1); g.fillRect(r.x + 2, y, r.w - 4, 9);
      g.fillStyle(mixC(PLANK, 0x000000, rng() * 0.35), 1); g.fillRect(r.x + 3, y + 1, r.w - 6, 7);
    }
    g.lineStyle(1.5, dim(ROPE, 0.25), 1);
    g.lineBetween(r.x + 5, r.y, r.x + 5, r.y + r.h); g.lineBetween(r.x + r.w - 5, r.y, r.x + r.w - 5, r.y + r.h);
  }
}

/** A sagging rope between two points (hand-ropes, washing lines). `sag` in px at the middle. */
export function ropeLine(g: G, a: Pt, b: Pt, sag: number, width: number, color: number, alpha = 1): void {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
}

/** A mooring post / bridge post with a rope collar. */
export function post(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 1, 14, 5);
  g.fillStyle(dim(PLANK_DARK, 0.3), 1); g.fillRect(x - 4, y - h, 8, h);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 3, y - h, 6, h);
  g.fillStyle(lit(PLANK_DARK, 0.25), 1); g.fillRect(x - 3, y - h, 2, h);
  g.fillStyle(TIDE, 0.8); g.fillRect(x - 3, y - h * 0.35, 6, h * 0.35);
  g.lineStyle(2, ROPE, 1); g.lineBetween(x - 4, y - h + 6, x + 4, y - h + 8); g.lineBetween(x - 4, y - h + 9, x + 4, y - h + 11);
}

/** A whale-oil street lamp: an iron crook with a teal-gold glass hanging off it. */
export function oilLamp(g: G, x: number, y: number): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(0x24302e, 1); g.fillRect(x - 2, y - 54, 4, 54);
  g.fillRect(x - 7, y - 3, 14, 3);
  g.lineStyle(3, 0x24302e, 1);
  g.beginPath(); g.arc(x + 8, y - 54, 8, Math.PI, Math.PI * 1.9, false); g.strokePath();
  g.fillStyle(0x24302e, 1); g.fillRect(x + 12, y - 52, 6, 3);
  g.fillStyle(0x1a2422, 1); g.fillRoundedRect(x + 9, y - 49, 12, 15, 3);
  g.fillStyle(LAMP, 0.92); g.fillRect(x + 11, y - 47, 8, 10);
  g.fillStyle(QUEEN, 0.35); g.fillRect(x + 11, y - 47, 8, 3);
  g.fillStyle(LAMP, 0.1); g.fillCircle(x + 15, y - 42, 22);
}

/** A crab pot: a domed willow trap with its funnel mouth, stacked or alone. */
export function crabPot(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 1, s * 2.4, s * 0.7, 0.28);
  g.fillStyle(0x4a3c2a, 1); g.fillEllipse(x, y - s * 0.7, s * 2.2, s * 1.6);
  g.fillStyle(0x7a6440, 1); g.fillEllipse(x, y - s * 0.78, s * 2, s * 1.4);
  g.lineStyle(1, 0x3a2e1e, 0.9);
  for (let k = -3; k <= 3; k++) g.lineBetween(x + k * s * 0.28, y - s * 1.4, x + k * s * 0.32, y - s * 0.1);
  for (let k = 0; k < 3; k++) {
    g.beginPath(); g.arc(x, y - s * 0.1, s * (0.4 + k * 0.3), Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  }
  g.fillStyle(0x1a140e, 1); g.fillEllipse(x + s * 0.5, y - s * 0.6, s * 0.5, s * 0.4);
  if (rng() < 0.5) { g.fillStyle(0xc8503a, 1); g.fillCircle(x - s * 0.5, y - s * 0.4, s * 0.16); }
}

/** An upturned skiff hauled up the shingle, keel to the sky, patched. */
export function upturnedSkiff(g: G, x: number, y: number, len: number, hull: number): void {
  shadow(g, x, y + 2, len * 1.1, 14, 0.35);
  g.fillStyle(dim(hull, 0.45), 1); g.fillEllipse(x, y - 10, len, 26);
  g.fillStyle(hull, 1); g.fillEllipse(x, y - 13, len - 6, 20);
  g.fillStyle(lit(hull, 0.18), 1); g.fillEllipse(x, y - 17, len - 22, 6);
  g.lineStyle(2, dim(hull, 0.55), 1); g.lineBetween(x - len / 2 + 6, y - 14, x + len / 2 - 6, y - 14);
  // A patch in another colour.
  g.fillStyle(mixC(hull, 0x8a8a7a, 0.5), 1); g.fillRect(x - 6, y - 12, 12, 7);
  g.fillStyle(0x1a1410, 1); for (const k of [-4, 0, 4]) g.fillCircle(x + k, y - 11, 0.9);
  // Props under the gunwale.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - len / 2 + 8, y - 4, 4, 6); g.fillRect(x + len / 2 - 12, y - 4, 4, 6);
}

/** A kelp-drying rack: ribbons of brown weed hung over a pole, dripping. */
export function kelpRack(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 1, w + 10, 12, 0.25);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - w / 2, y - 56, 4, 56); g.fillRect(x + w / 2 - 4, y - 56, 4, 56);
  g.fillRect(x - w / 2 - 2, y - 58, w + 4, 4);
  for (let k = 0; k < w / 7; k++) {
    const kx = x - w / 2 + 6 + k * 7;
    const len = 22 + rng() * 22;
    g.fillStyle(rng() < 0.5 ? 0x5a4a22 : 0x3e4a22, 0.95);
    g.fillRoundedRect(kx - 2.5, y - 56, 5, len, 2);
    g.fillStyle(0x7a6a32, 0.6); g.fillRect(kx - 1, y - 54, 1, len - 4);
  }
}

// ── Solids ───────────────────────────────────────────────────────────

/**
 * Solids for `region` minus every `keep` rect — a body of water with walkways cut out of it.
 * The region is swept in `step`-px rows; any row that touches a keep rect leaves that span open
 * (walkable wins), and identical rows are merged so the result stays a handful of rects.
 */
export function carve(region: Rect, keep: Rect[], step = 10): Solid[] {
  const out: Solid[] = [];
  let prevKey = '';
  let open: { x0: number; x1: number; y: number }[] = [];
  const flush = (yEnd: number): void => {
    for (const o of open) out.push({ kind: 'rect', x: o.x0, y: o.y, w: o.x1 - o.x0, h: yEnd - o.y });
    open = [];
  };
  for (let y = region.y; y < region.y + region.h; y += step) {
    const y1 = Math.min(region.y + region.h, y + step);
    let spans: [number, number][] = [[region.x, region.x + region.w]];
    for (const k of keep) {
      if (k.y >= y1 || k.y + k.h <= y) continue;
      const next: [number, number][] = [];
      for (const [a, b] of spans) {
        if (k.x >= b || k.x + k.w <= a) { next.push([a, b]); continue; }
        if (k.x > a) next.push([a, k.x]);
        if (k.x + k.w < b) next.push([k.x + k.w, b]);
      }
      spans = next;
    }
    const key = spans.map(([a, b]) => `${a}:${b}`).join(',');
    if (key !== prevKey) {
      flush(y);
      open = spans.map(([a, b]) => ({ x0: a, x1: b, y }));
      prevKey = key;
    }
  }
  flush(region.y + region.h);
  return out.filter((s) => s.kind === 'rect' && s.w > 0 && s.h > 0);
}

/** A closed polygon fill from plain points. */
export function poly(g: G, pts: [number, number][], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
}

export const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
