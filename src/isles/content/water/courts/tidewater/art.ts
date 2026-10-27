import Phaser from 'phaser';
import { dim, glow, lit, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BARNACLE, BRASS, BRASS_DARK, BRASS_LIT, BUOY, BUOY_DARK, DRIFT, DRIFT_DARK, DRIFT_LIT, FOAM, LAMP, MUD_DARK,
  PAINT_CREAM, PILE, PILE_WET, ROPE, ROPE_DARK, SAND_DARK, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, SHINGLE,
  SHINGLE_DARK, WEED, WEED_DARK, WETSAND_DARK, WETSAND_LIT,
} from './palette';

/**
 * Tidewater set pieces — the shapes only a tide town has. Everything here is built to be read
 * against a line: the high water mark. Below it timber is tarred black, weeded green and crusted
 * with barnacles; above it the paint is chalky and dry. A player should be able to tell how high
 * the Queen lets the sea come just by looking at the stilts.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── Ground marks ─────────────────────────────────────────────────────

/** Ripple-marks left in wet sand by the last ebb: rows of shallow wavy ridges. */
export function sandRipples(g: G, r: Rect, color: number, alpha: number, rng: () => number, spacing = 14): void {
  g.lineStyle(1.6, color, alpha);
  const phase = rng() * 10;
  for (let y = r.y + spacing / 2; y < r.y + r.h; y += spacing + rng() * 4) {
    g.beginPath();
    let first = true;
    for (let x = r.x; x <= r.x + r.w; x += 10) {
      const yy = y + Math.sin(x * 0.045 + phase + y * 0.02) * 3.2 + Math.sin(x * 0.011 + y) * 2;
      if (first) { g.moveTo(x, yy); first = false; } else g.lineTo(x, yy);
    }
    g.strokePath();
  }
}

/** Lugworm casts and blow-holes — the little coils that say the sand is alive. */
export function wormCasts(g: G, r: Rect, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.lineStyle(1.4, WETSAND_DARK, 0.7);
    g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 1.6, false); g.strokePath();
    g.beginPath(); g.arc(x + 2, y + 1, 1.4, Math.PI, Math.PI * 2.6, false); g.strokePath();
    g.fillStyle(MUD_DARK, 0.6); g.fillCircle(x + 9 + rng() * 4, y + 3, 1.2);
  }
}

/** Shells scattered on the sand: cockles, razors, the odd whelk. */
export function shells(g: G, r: Rect, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.5) {
      g.fillStyle(k < 0.25 ? BARNACLE : 0xe8c9a8, 0.9); g.fillEllipse(x, y, 5, 4);
      g.lineStyle(0.8, SAND_DARK, 0.7); g.lineBetween(x, y - 2, x, y + 2);
    } else if (k < 0.8) {
      g.lineStyle(1.8, 0x6e6a74, 0.85); g.lineBetween(x - 5, y + 1, x + 5, y - 1);
    } else {
      g.fillStyle(0xcfb894, 0.9); g.fillTriangle(x - 3, y + 2, x + 3, y + 2, x, y - 5);
    }
  }
}

/** The strand line: a ragged stripe of dried weed, feathers and rope ends where the last tide stopped. */
export function wrackLine(g: G, pts: Pt[], rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 7) {
      const t = d / len;
      const x = a.x + (b.x - a.x) * t + (rng() - 0.5) * 10;
      const y = a.y + (b.y - a.y) * t + (rng() - 0.5) * 8;
      const c = rng();
      g.fillStyle(c < 0.6 ? WEED_DARK : c < 0.85 ? 0x6b5a3a : DRIFT, 0.75);
      g.fillEllipse(x, y, 6 + rng() * 8, 2 + rng() * 2);
    }
  }
}

/** A creek through the mud: a dark bed, a water ribbon and lit shoals along its edges. */
export function creek(g: G, pts: Pt[], w: number, rng: () => number): void {
  const strokePts = (ww: number, c: number, a: number) => {
    g.lineStyle(ww, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    g.fillStyle(c, a);
    for (const p of pts) g.fillCircle(p.x, p.y, ww / 2);
  };
  strokePts(w + 18, WETSAND_DARK, 1);
  strokePts(w + 6, MUD_DARK, 1);
  strokePts(w, SEA_DEEP, 1);
  strokePts(w * 0.6, SEA, 1);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
    for (let d = 0; d < len; d += 18) {
      const t = d / len;
      const side = rng() < 0.5 ? -1 : 1;
      const x = a.x + (b.x - a.x) * t + nx * side * (w / 2 + 4);
      const y = a.y + (b.y - a.y) * t + ny * side * (w / 2 + 4);
      g.fillStyle(WETSAND_LIT, 0.35); g.fillEllipse(x, y, 10 + rng() * 8, 3);
    }
  }
}

/** A raised boardwalk run across the flats: planks on stubby piles, a rope rail each side. */
export function boardwalk(g: G, from: Pt, to: Pt, w: number, rng: () => number): void {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / len, uy = (to.y - from.y) / len;
  const nx = -uy, ny = ux;
  const hw = w / 2;
  // Shadow on the sand under the walk.
  g.fillStyle(0x000000, 0.18);
  g.fillPoints([
    P(from.x + nx * (hw + 4) + 3, from.y + ny * (hw + 4) + 8), P(to.x + nx * (hw + 4) + 3, to.y + ny * (hw + 4) + 8),
    P(to.x - nx * (hw + 4) + 3, to.y - ny * (hw + 4) + 8), P(from.x - nx * (hw + 4) + 3, from.y - ny * (hw + 4) + 8),
  ], true);
  // Bearers.
  g.fillStyle(PILE, 1);
  g.fillPoints([
    P(from.x + nx * hw, from.y + ny * hw), P(to.x + nx * hw, to.y + ny * hw),
    P(to.x - nx * hw, to.y - ny * hw), P(from.x - nx * hw, from.y - ny * hw),
  ], true);
  // Planks laid across the run.
  for (let d = 0; d < len; d += 11) {
    const cx = from.x + ux * d, cy = from.y + uy * d;
    const c = rng();
    g.fillStyle(c < 0.4 ? DRIFT : c < 0.75 ? DRIFT_LIT : dim(DRIFT, 0.12), 1);
    const a = P(cx + nx * (hw - 1), cy + ny * (hw - 1));
    const b = P(cx - nx * (hw - 1), cy - ny * (hw - 1));
    g.fillPoints([a, b, P(b.x + ux * 9, b.y + uy * 9), P(a.x + ux * 9, a.y + uy * 9)], true);
    if (rng() < 0.18) { g.fillStyle(PILE_WET, 0.8); g.fillCircle(cx + nx * (hw - 5), cy + ny * (hw - 5) + 4, 1.2); }
  }
  // Rope rails on short posts.
  for (const s of [-1, 1]) {
    const ox = nx * s * (hw + 1), oy = ny * s * (hw + 1);
    g.lineStyle(1.6, ROPE_DARK, 0.9);
    g.lineBetween(from.x + ox, from.y + oy - 9, to.x + ox, to.y + oy - 9);
    for (let d = 0; d <= len; d += 64) {
      const x = from.x + ux * d + ox, y = from.y + uy * d + oy;
      g.fillStyle(PILE, 1); g.fillRect(x - 2, y - 12, 4, 13);
      g.fillStyle(DRIFT_LIT, 1); g.fillRect(x - 2, y - 12, 4, 2);
    }
  }
}

/** A plank deck over a rect (the Gauge plaza, porches). */
export function deck(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x000000, 0.2); g.fillRect(r.x + 4, r.y + 8, r.w, r.h);
  g.fillStyle(PILE, 1); g.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
  for (let y = r.y; y < r.y + r.h; y += 12) {
    let x = r.x;
    while (x < r.x + r.w) {
      const len = 50 + rng() * 90;
      const c = rng();
      g.fillStyle(c < 0.4 ? DRIFT : c < 0.75 ? lit(DRIFT, 0.08) : dim(DRIFT, 0.1), 1);
      g.fillRect(x, y + 1, Math.min(len, r.x + r.w - x) - 1, 10);
      g.fillStyle(PILE_WET, 0.7);
      g.fillCircle(x + 4, y + 6, 0.9); g.fillCircle(x + Math.min(len, r.x + r.w - x) - 5, y + 6, 0.9);
      x += len;
    }
  }
  g.lineStyle(2, DRIFT_LIT, 0.5); g.strokeRect(r.x, r.y, r.w, r.h);
}

// ── Buildings ────────────────────────────────────────────────────────

export interface StiltOpts {
  paint: number;
  /** Stilt height. */
  legs?: number;
  /** Lit window (somebody can afford lamp oil). */
  lamp?: boolean;
  nets?: boolean;
  /** Boarded up, padlocked: the Dry Tithe went unpaid. */
  tithed?: boolean;
}

/**
 * A stilt house on the flats: tarred piles with the high water mark on them, a platform with
 * a ladder down, a clapboard box with a steep shingle roof. `x,y` is the middle of the piles'
 * feet. Returns the foot of the ladder.
 */
export function stiltHouse(g: G, x: number, y: number, w: number, h: number, o: StiltOpts, rng: () => number): Pt {
  const legs = o.legs ?? 46;
  const floor = y - legs;
  shadow(g, x, y + 4, w * 1.25, 20, 0.28);
  // Piles, cross-braced.
  const n = Math.max(3, Math.round(w / 34));
  const px: number[] = [];
  for (let i = 0; i < n; i++) px.push(x - w / 2 + 6 + ((w - 12) * i) / (n - 1));
  g.lineStyle(2.5, PILE_WET, 0.9);
  for (let i = 0; i < n - 1; i++) {
    g.lineBetween(px[i], y - 4, px[i + 1], floor + 6);
    g.lineBetween(px[i + 1], y - 4, px[i], floor + 6);
  }
  const mark = y - legs * 0.55;
  for (const sx of px) {
    g.fillStyle(PILE, 1); g.fillRect(sx - 4, floor, 8, legs + 2);
    // Below the mark: black, weeded, barnacled.
    g.fillStyle(PILE_WET, 1); g.fillRect(sx - 4, mark, 8, y - mark + 2);
    g.fillStyle(WEED, 0.9); g.fillRect(sx - 4, mark - 2, 8, 4);
    for (let k = 0; k < 4; k++) { g.fillStyle(BARNACLE, 0.8); g.fillCircle(sx - 3 + rng() * 6, mark + 6 + rng() * (y - mark - 8), 1.3); }
  }
  // Platform.
  g.fillStyle(DRIFT_DARK, 1); g.fillRect(x - w / 2 - 10, floor - 6, w + 20, 9);
  g.fillStyle(DRIFT_LIT, 1); g.fillRect(x - w / 2 - 10, floor - 6, w + 20, 2);
  // Ladder down the front-right pile.
  const lx = x + w * 0.3;
  g.lineStyle(2, DRIFT_DARK, 1);
  g.lineBetween(lx - 6, floor, lx - 6, y); g.lineBetween(lx + 6, floor, lx + 6, y);
  for (let ry = floor + 7; ry < y; ry += 8) g.lineBetween(lx - 6, ry, lx + 6, ry);
  // Walls: clapboard.
  const top = floor - 6 - h;
  g.fillStyle(dim(o.paint, 0.45), 1); g.fillRect(x - w / 2 - 2, top - 2, w + 4, h + 4);
  g.fillStyle(o.paint, 1); g.fillRect(x - w / 2, top, w, h);
  for (let cy = top + 6; cy < floor - 6; cy += 7) {
    g.fillStyle(dim(o.paint, 0.16), 0.8); g.fillRect(x - w / 2, cy, w, 1.4);
  }
  // Salt bloom and flaking paint.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(lit(o.paint, 0.25), 0.4);
    g.fillEllipse(x - w / 2 + rng() * w, top + rng() * h, 8 + rng() * 10, 3 + rng() * 3);
  }
  // Roof: steep shingles, a weathervane fish on the ridge.
  const rh = h * 0.7;
  g.fillStyle(SHINGLE_DARK, 1);
  g.fillTriangle(x - w / 2 - 12, top + 2, x + w / 2 + 12, top + 2, x, top - rh - 4);
  g.fillStyle(SHINGLE, 1);
  g.fillTriangle(x - w / 2 - 8, top, x + w / 2 + 8, top, x, top - rh);
  g.lineStyle(1.2, lit(SHINGLE, 0.18), 0.8);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const yy = top - rh * t;
    const hw = (w / 2 + 8) * (1 - t);
    g.lineBetween(x - hw, yy, x + hw, yy);
    for (let sx = x - hw + 6; sx < x + hw; sx += 9) g.lineBetween(sx, yy, sx - 2, yy + rh / 6);
  }
  g.lineStyle(1.5, PILE, 1); g.lineBetween(x, top - rh, x, top - rh - 12);
  g.fillStyle(PILE, 1); g.fillTriangle(x - 7, top - rh - 12, x + 5, top - rh - 15, x + 5, top - rh - 9);
  g.fillTriangle(x + 5, top - rh - 12, x + 10, top - rh - 16, x + 10, top - rh - 8);
  // Door and window.
  const dx = x - w * 0.18;
  if (o.tithed) {
    g.fillStyle(DRIFT_DARK, 1); g.fillRect(dx - 10, floor - 34, 20, 28);
    g.lineStyle(3, DRIFT, 1);
    g.lineBetween(dx - 12, floor - 30, dx + 12, floor - 16); g.lineBetween(dx - 12, floor - 14, dx + 12, floor - 28);
    g.fillStyle(BUOY, 1); g.fillRect(dx - 7, floor - 26, 14, 9);
    g.fillStyle(PAINT_CREAM, 1); g.fillRect(dx - 5, floor - 24, 10, 1.5); g.fillRect(dx - 5, floor - 21, 7, 1.5);
  } else {
    g.fillStyle(dim(o.paint, 0.55), 1); g.fillRect(dx - 9, floor - 32, 18, 26);
    g.fillStyle(BRASS, 1); g.fillCircle(dx + 5, floor - 18, 1.5);
  }
  const wx = x + w * 0.2, wy = top + h * 0.42;
  g.fillStyle(dim(o.paint, 0.5), 1); g.fillRect(wx - 9, wy - 9, 18, 18);
  if (o.lamp && !o.tithed) {
    g.fillStyle(LAMP, 0.12); g.fillCircle(wx, wy, 20);
    g.fillStyle(LAMP, 0.85); g.fillRect(wx - 7, wy - 7, 14, 14);
  } else {
    g.fillStyle(0x2a2f33, 1); g.fillRect(wx - 7, wy - 7, 14, 14);
  }
  g.fillStyle(dim(o.paint, 0.5), 1); g.fillRect(wx - 1, wy - 7, 2, 14); g.fillRect(wx - 7, wy - 1, 14, 2);
  // Porch rail.
  g.lineStyle(1.5, DRIFT_DARK, 1);
  g.lineBetween(x - w / 2 - 10, floor - 16, x - w / 2 - 10, floor - 6);
  g.lineBetween(x + w / 2 + 10, floor - 16, x + w / 2 + 10, floor - 6);
  g.lineBetween(x - w / 2 - 10, floor - 16, x - w / 2 + 4, floor - 16);
  // Nets hung off the eaves to dry.
  if (o.nets) {
    const nx0 = x - w / 2 - 4, nx1 = x - w / 2 + w * 0.36;
    g.lineStyle(1, ROPE, 0.75);
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const sx = nx0 + (nx1 - nx0) * t;
      g.lineBetween(sx, top + 4, sx + 3, top + 34 + Math.sin(t * Math.PI) * 8);
    }
    for (let k = 0; k < 4; k++) {
      const yy = top + 10 + k * 7;
      g.lineBetween(nx0, yy, nx1, yy + Math.sin(k) * 2 + 3);
    }
    g.fillStyle(0xe0b25a, 1); g.fillCircle(nx0 + 6, top + 40, 3); g.fillCircle(nx1 - 2, top + 42, 3);
  }
  return { x: lx, y: y + 10 };
}

/**
 * A house *left under*: the Dry Tithe went unpaid, so the Queen's tide was not given back.
 * Sunk to its sills in a standing pool, its windows black, the Crown's red notice nailed over
 * the door. `x,y` is the waterline at the front.
 */
export function drownedHouse(g: G, x: number, y: number, w: number, h: number, paint: number, rng: () => number): void {
  // Pool round it.
  g.fillStyle(SEA_DEEP, 0.85); g.fillEllipse(x, y + 2, w * 1.5, 34);
  g.fillStyle(SEA, 0.7); g.fillEllipse(x, y, w * 1.35, 26);
  // Walls above the water, a list to one side.
  const lean = (rng() - 0.5) * 10;
  const top = y - h;
  g.fillStyle(dim(paint, 0.6), 1);
  g.fillPoints([P(x - w / 2, y), P(x + w / 2, y), P(x + w / 2 + lean, top), P(x - w / 2 + lean, top)], true);
  g.fillStyle(dim(paint, 0.25), 1);
  g.fillPoints([P(x - w / 2 + 2, y), P(x + w / 2 - 2, y), P(x + w / 2 - 2 + lean, top + 2), P(x - w / 2 + 2 + lean, top + 2)], true);
  // Weed and the band where the water has stood for months.
  g.fillStyle(WEED_DARK, 0.9); g.fillRect(x - w / 2, y - 14, w, 14);
  g.fillStyle(WEED, 0.7); g.fillRect(x - w / 2, y - 16, w, 3);
  for (let i = 0; i < 8; i++) { g.fillStyle(BARNACLE, 0.75); g.fillCircle(x - w / 2 + rng() * w, y - 4 - rng() * 12, 1.4); }
  // Roof, sagging.
  const rh = h * 0.6;
  g.fillStyle(SHINGLE_DARK, 1);
  g.fillTriangle(x - w / 2 - 10 + lean, top + 2, x + w / 2 + 10 + lean, top + 2, x + lean * 1.4, top - rh);
  g.fillStyle(dim(SHINGLE, 0.12), 1);
  g.fillTriangle(x - w / 2 - 6 + lean, top, x + w / 2 + 6 + lean, top, x + lean * 1.4, top - rh + 4);
  g.fillStyle(SEA_DEEP, 1); g.fillTriangle(x + lean - 6, top - rh * 0.4, x + lean + 10, top - rh * 0.25, x + lean + 2, top - rh * 0.12);
  // Black windows, the door under water but for its lintel.
  for (const s of [-1, 1]) {
    const wx = x + s * w * 0.25 + lean * 0.6, wy = top + h * 0.35;
    g.fillStyle(0x161a1d, 1); g.fillRect(wx - 8, wy - 8, 16, 16);
    g.lineStyle(1.5, dim(paint, 0.5), 1); g.lineBetween(wx - 8, wy, wx + 8, wy);
  }
  g.fillStyle(dim(paint, 0.65), 1); g.fillRect(x - 11 + lean * 0.2, y - 22, 22, 4);
  // The Crown's notice, nailed on.
  g.fillStyle(BUOY, 1); g.fillRect(x - 9 + lean * 0.3, y - h * 0.62, 18, 12);
  g.fillStyle(PAINT_CREAM, 0.9);
  g.fillRect(x - 6 + lean * 0.3, y - h * 0.62 + 3, 12, 1.4); g.fillRect(x - 6 + lean * 0.3, y - h * 0.62 + 6, 8, 1.4);
  // Ripples lapping the front.
  g.lineStyle(1.2, SEA_LIT, 0.5);
  g.strokeEllipse(x, y + 2, w * 1.1, 10);
  g.strokeEllipse(x, y + 4, w * 1.3, 16);
}

/** The Dry Tithe booth: a buoy-red toll hut on a post, with a coin chute and a bell to summon the clerk. */
export function titheBooth(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 90, 18);
  g.fillStyle(PILE, 1); g.fillRect(x - 32, y - 14, 6, 14); g.fillRect(x + 26, y - 14, 6, 14);
  g.fillStyle(BUOY_DARK, 1); g.fillRect(x - 36, y - 78, 72, 66);
  g.fillStyle(BUOY, 1); g.fillRect(x - 34, y - 76, 68, 62);
  for (let k = 0; k < 8; k++) { g.fillStyle(BUOY_DARK, 0.4); g.fillRect(x - 34, y - 70 + k * 8, 68, 1.4); }
  // Counter window.
  g.fillStyle(0x2b2622, 1); g.fillRect(x - 24, y - 62, 48, 24);
  g.fillStyle(LAMP, 0.25); g.fillRect(x - 22, y - 60, 44, 20);
  g.fillStyle(DRIFT_LIT, 1); g.fillRect(x - 28, y - 38, 56, 5);
  // Ledger on the counter, coin chute, bell.
  g.fillStyle(PAINT_CREAM, 1); g.fillRect(x - 18, y - 42, 16, 4);
  g.fillStyle(BRASS, 1); g.fillRect(x + 8, y - 46, 10, 8);
  g.fillStyle(0x1b1714, 1); g.fillRect(x + 11, y - 46, 4, 2);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 26, y - 44, 3);
  // Flat roof with a crown-red pennant and the "DRY TITHE" board.
  g.fillStyle(SHINGLE_DARK, 1); g.fillRect(x - 42, y - 86, 84, 9);
  g.fillStyle(PAINT_CREAM, 1); g.fillRect(x - 30, y - 100, 60, 12);
  g.fillStyle(BUOY_DARK, 1);
  for (let i = 0; i < 9; i++) g.fillRect(x - 26 + i * 6, y - 97, 4, 6);
  g.fillStyle(PILE, 1); g.fillRect(x + 36, y - 124, 2, 40);
  g.fillStyle(BUOY, 1); g.fillTriangle(x + 38, y - 124, x + 58, y - 118, x + 38, y - 112);
}

/** Wicker crab pots stacked by a post, a coil of line and a float on top. */
export function crabPots(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14);
  const pot = (px: number, py: number, s: number) => {
    g.fillStyle(ROPE_DARK, 1); g.fillEllipse(px, py - s * 0.5, s * 2.1, s * 1.15);
    g.fillStyle(ROPE, 1); g.fillEllipse(px, py - s * 0.55, s * 1.9, s * 1.0);
    g.lineStyle(1, ROPE_DARK, 0.8);
    for (let k = -2; k <= 2; k++) g.lineBetween(px + k * s * 0.32, py - s * 1.02, px + k * s * 0.4, py - s * 0.08);
    g.lineBetween(px - s * 0.9, py - s * 0.55, px + s * 0.9, py - s * 0.55);
    g.fillStyle(0x2a241c, 1); g.fillEllipse(px, py - s * 1.0, s * 0.6, s * 0.22);
  };
  pot(x - 16, y, 14);
  pot(x + 14, y + 2, 13);
  pot(x - 2, y - 14, 13);
  g.fillStyle(BUOY, 1); g.fillCircle(x + 2, y - 33, 5);
  g.fillStyle(PAINT_CREAM, 1); g.fillRect(x - 3, y - 34, 10, 2);
  g.lineStyle(2, ROPE_DARK, 1); g.strokeEllipse(x + 30, y - 2, 18, 7);
  g.strokeEllipse(x + 30, y - 4, 13, 5);
  if (rng() < 0.6) { g.fillStyle(0xb5462e, 1); g.fillEllipse(x - 30, y - 2, 8, 5); }
}

/** A fish-drying rack: two trestles, a pole, a row of split fish hung by the tail. */
export function dryingRack(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w + 20, 12);
  g.lineStyle(3, DRIFT_DARK, 1);
  for (const s of [-1, 1]) {
    const tx = x + s * w / 2;
    g.lineBetween(tx - 9, y, tx, y - 46); g.lineBetween(tx + 9, y, tx, y - 46);
  }
  g.lineStyle(3, DRIFT, 1); g.lineBetween(x - w / 2, y - 44, x + w / 2, y - 44);
  for (let fx = x - w / 2 + 10; fx < x + w / 2 - 6; fx += 13) {
    const len = 14 + rng() * 8;
    g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(fx, y - 44, fx, y - 40);
    g.fillStyle(0xc9b090, 1); g.fillEllipse(fx, y - 40 + len / 2, 7, len);
    g.fillStyle(0x9e7f5c, 1); g.fillEllipse(fx, y - 40 + len / 2, 3, len - 4);
    g.fillStyle(0x7d6a52, 1); g.fillTriangle(fx - 4, y - 40, fx + 4, y - 40, fx, y - 36);
  }
}

/** A dinghy stranded on its side by the ebb, oars across the thwart, a puddle in the bilge. */
export function strandedBoat(g: G, x: number, y: number, len: number, paint: number, rng: () => number): void {
  shadow(g, x, y + 4, len * 1.2, 18);
  const h = len * 0.32;
  g.fillStyle(dim(paint, 0.45), 1);
  g.fillPoints([P(x - len / 2, y - h * 0.4), P(x - len * 0.36, y), P(x + len * 0.36, y), P(x + len / 2, y - h * 0.55), P(x + len * 0.42, y - h), P(x - len * 0.42, y - h * 0.9)], true);
  g.fillStyle(paint, 1);
  g.fillPoints([P(x - len / 2 + 3, y - h * 0.42), P(x - len * 0.35, y - 3), P(x + len * 0.35, y - 3), P(x + len / 2 - 3, y - h * 0.55)], true);
  g.fillStyle(DRIFT_DARK, 1);
  g.fillPoints([P(x - len * 0.42, y - h * 0.9), P(x + len * 0.42, y - h), P(x + len * 0.36, y - h * 0.55), P(x - len * 0.36, y - h * 0.5)], true);
  g.fillStyle(SEA, 0.8); g.fillEllipse(x, y - h * 0.62, len * 0.4, h * 0.2);
  g.fillStyle(DRIFT, 1); g.fillRect(x - 3, y - h * 0.96, 6, h * 0.5);
  g.lineStyle(3, DRIFT_LIT, 1); g.lineBetween(x - len * 0.4, y - h * 1.1, x + len * 0.2, y - h * 0.62);
  g.fillStyle(WEED, 0.8);
  for (let i = 0; i < 5; i++) g.fillEllipse(x - len * 0.3 + rng() * len * 0.6, y - 4, 8, 3);
  g.lineStyle(1.5, ROPE, 1); g.lineBetween(x - len / 2, y - h * 0.4, x - len / 2 - 26, y + 6);
  g.fillStyle(PILE, 1); g.fillRect(x - len / 2 - 29, y - 14, 6, 20);
}

/** A mooring post with a rope bitted round it. */
export function mooringPost(g: G, x: number, y: number, h = 34): void {
  shadow(g, x, y + 2, 18, 6);
  g.fillStyle(PILE_WET, 1); g.fillRect(x - 5, y - h, 10, h);
  g.fillStyle(PILE, 1); g.fillRect(x - 5, y - h, 10, h * 0.45);
  g.fillStyle(WEED, 0.9); g.fillRect(x - 5, y - h * 0.55, 10, 3);
  g.fillStyle(DRIFT_LIT, 1); g.fillEllipse(x, y - h, 10, 4);
  g.lineStyle(2, ROPE, 1); g.strokeEllipse(x, y - h * 0.72, 14, 5);
}

/** A tide-staff — a graduated post the flats read the water off. Red and white bands, numbers in fathoms. */
export function tideStaff(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 16, 5);
  g.fillStyle(PILE, 1); g.fillRect(x - 4, y - h, 8, h);
  for (let k = 0; k < h / 12; k++) {
    g.fillStyle(k % 2 ? PAINT_CREAM : BUOY, 1);
    g.fillRect(x - 3, y - h + k * 12, 6, 12);
    g.fillStyle(PILE, 1); g.fillRect(x + 3, y - h + k * 12, 4, 1.5);
  }
  g.fillStyle(WEED_DARK, 0.8); g.fillRect(x - 4, y - h * 0.3, 8, h * 0.3);
}

/** Marram grass tufts on the dunes. */
export function marram(g: G, x: number, y: number, s: number, rng: () => number): void {
  const n = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 1.3;
    const l = s * (0.7 + rng() * 0.6);
    g.lineStyle(1.4, rng() < 0.5 ? 0x9a9a5e : 0x7f8450, 1);
    g.lineBetween(x + (rng() - 0.5) * 6, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
}

/** A sand-fence: a line of leaning slats the dunes pile up against. */
export function sandFence(g: G, a: Pt, b: Pt): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.floor(len / 9);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    g.fillStyle(i % 2 ? DRIFT : DRIFT_DARK, 1);
    g.fillPoints([P(x - 2, y), P(x + 2, y), P(x + 4, y - 22), P(x, y - 22)], true);
  }
  g.lineStyle(1, ROPE_DARK, 1);
  g.lineBetween(a.x, a.y - 7, b.x, b.y - 7); g.lineBetween(a.x + 2, a.y - 16, b.x + 2, b.y - 16);
}

// ── The court's landmarks ─────────────────────────────────────────────

/**
 * The Tide Gauge: the Queen's clocktower. A barnacled stone base, a timber shaft, and a great
 * brass dial that shows not the hour but the *sea* — a single hand swinging between LOW and
 * HIGH. A tide-staff runs down one corner; a bell hangs in the cupola to call the flood.
 * The hand itself is drawn per-frame (see `gaugeHand`).
 */
export function tideGauge(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 170, 30);
  // Stone foot, barnacled to the mark.
  g.fillStyle(0x4c4a46, 1); g.fillRect(x - 62, y - 54, 124, 54);
  for (let i = 0; i < 16; i++) {
    g.fillStyle(rng() < 0.5 ? 0x5d5a55 : 0x403e3a, 1);
    g.fillRect(x - 60 + (i % 6) * 20 + (Math.floor(i / 6) % 2) * 10, y - 52 + Math.floor(i / 6) * 17, 18, 15);
  }
  g.fillStyle(WEED, 0.85); g.fillRect(x - 62, y - 30, 124, 4);
  for (let i = 0; i < 24; i++) { g.fillStyle(BARNACLE, 0.85); g.fillCircle(x - 60 + rng() * 120, y - 26 + rng() * 24, 1.5); }
  // Arched door with brass studs.
  g.fillStyle(0x201c18, 1); g.fillRoundedRect(x - 16, y - 44, 32, 44, { tl: 15, tr: 15, bl: 0, br: 0 });
  g.fillStyle(0x4a3a2a, 1); g.fillRoundedRect(x - 13, y - 41, 26, 41, { tl: 13, tr: 13, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1);
  for (const by of [-34, -22, -10]) { g.fillCircle(x - 8, y + by, 1.5); g.fillCircle(x + 8, y + by, 1.5); }
  // Timber shaft.
  const sTop = y - 230;
  g.fillStyle(DRIFT_DARK, 1); g.fillRect(x - 46, sTop, 92, 178);
  g.fillStyle(PAINT_CREAM, 1); g.fillRect(x - 43, sTop + 2, 86, 174);
  for (let cy = sTop + 8; cy < y - 54; cy += 8) { g.fillStyle(dim(PAINT_CREAM, 0.12), 1); g.fillRect(x - 43, cy, 86, 1.3); }
  // Tide-staff down the corner.
  for (let k = 0; k < 14; k++) {
    g.fillStyle(k % 2 ? PAINT_CREAM : BUOY, 1); g.fillRect(x + 36, sTop + 10 + k * 12, 7, 12);
  }
  // The dial: brass ring, pale face, a scale from LOW to HIGH and the Queen's wave at the top.
  const dy = sTop + 70;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, dy, 44);
  g.fillStyle(BRASS, 1); g.fillCircle(x, dy, 41);
  g.fillStyle(0xeee6d2, 1); g.fillCircle(x, dy, 35);
  g.lineStyle(2, BRASS_DARK, 1);
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (0.8 + (1.4 * k) / 10);
    const r0 = k % 5 === 0 ? 24 : 29;
    g.lineBetween(x + Math.cos(a) * r0, dy + Math.sin(a) * r0, x + Math.cos(a) * 34, dy + Math.sin(a) * 34);
  }
  // A blue wedge at HIGH — the flood.
  g.fillStyle(SEA, 0.55);
  g.beginPath(); g.moveTo(x, dy); g.arc(x, dy, 33, Math.PI * 1.85, Math.PI * 2.2, false); g.closePath(); g.fillPath();
  g.fillStyle(SAND_DARK, 0.5);
  g.beginPath(); g.moveTo(x, dy); g.arc(x, dy, 33, Math.PI * 0.8, Math.PI * 1.15, false); g.closePath(); g.fillPath();
  // Cupola, bell and the wave weathervane.
  g.fillStyle(SHINGLE_DARK, 1); g.fillRect(x - 54, sTop - 8, 108, 10);
  g.fillStyle(DRIFT_DARK, 1);
  g.fillRect(x - 40, sTop - 56, 6, 48); g.fillRect(x + 34, sTop - 56, 6, 48);
  g.fillStyle(BRASS, 1);
  g.fillPoints([P(x - 14, sTop - 16), P(x + 14, sTop - 16), P(x + 10, sTop - 40), P(x - 10, sTop - 40)], true);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 10, sTop - 40, 4, 22);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, sTop - 14, 3);
  g.fillStyle(SHINGLE, 1); g.fillTriangle(x - 52, sTop - 54, x + 52, sTop - 54, x, sTop - 100);
  g.fillStyle(SHINGLE_DARK, 1); g.fillTriangle(x + 4, sTop - 54, x + 52, sTop - 54, x, sTop - 100);
  g.lineStyle(2, PILE, 1); g.lineBetween(x, sTop - 100, x, sTop - 122);
  g.fillStyle(PILE, 1);
  g.fillPoints([P(x - 14, sTop - 118), P(x - 6, sTop - 126), P(x + 2, sTop - 118), P(x + 10, sTop - 126), P(x + 16, sTop - 116), P(x - 14, sTop - 114)], true);
}

/** The Tide Gauge's hand: 0 = LOW (left), 1 = HIGH (right). Drawn per frame over the baked tower. */
export function gaugeHand(g: G, x: number, y: number, level: number): void {
  const dy = y - 230 + 70;
  const a = Math.PI * (0.8 + 1.4 * level);
  g.lineStyle(3, PILE, 1);
  g.lineBetween(x - Math.cos(a) * 6, dy - Math.sin(a) * 6, x + Math.cos(a) * 30, dy + Math.sin(a) * 30);
  g.fillStyle(BUOY, 1);
  g.fillTriangle(
    x + Math.cos(a) * 32, dy + Math.sin(a) * 32,
    x + Math.cos(a + 0.2) * 22, dy + Math.sin(a + 0.2) * 22,
    x + Math.cos(a - 0.2) * 22, dy + Math.sin(a - 0.2) * 22,
  );
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, dy, 4);
}

/**
 * Prince Ebb's lighthouse-manor on the headland: a red-and-white tower standing out of a
 * grey stone house, the lamp-room glazed at the top. The beam is drawn per frame.
 * `x,y` is the foot of the manor's front steps.
 */
export function lighthouseManor(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 8, 420, 44);
  // The rocks it stands on.
  for (let i = 0; i < 10; i++) {
    const rx = x - 210 + i * 46 + rng() * 10;
    g.fillStyle(0x45484a, 1); g.fillEllipse(rx, y + 2, 60 + rng() * 30, 26);
    g.fillStyle(0x5a5e60, 1); g.fillEllipse(rx - 4, y - 4, 44 + rng() * 20, 14);
  }
  // The manor house: two low wings of grey stone, slate roofs.
  const wallTop = y - 120;
  g.fillStyle(0x2f3336, 1); g.fillRect(x - 190, wallTop - 2, 380, 124);
  g.fillStyle(0x6b7174, 1); g.fillRect(x - 188, wallTop, 376, 120);
  for (let row = 0; row < 7; row++) {
    const ry = wallTop + 4 + row * 17;
    for (let bx = x - 188 + (row % 2) * 16; bx < x + 188; bx += 32) {
      g.fillStyle(rng() < 0.5 ? 0x60666a : 0x787e81, 1);
      g.fillRect(bx + 1, ry, Math.min(30, x + 188 - bx - 1), 15);
    }
  }
  // Tide-black lower courses — even the Prince's house wears the mark.
  g.fillStyle(PILE_WET, 0.55); g.fillRect(x - 188, y - 30, 376, 30);
  g.fillStyle(WEED, 0.8); g.fillRect(x - 188, y - 32, 376, 3);
  for (const s of [-1, 1]) {
    const wx = x + s * 120;
    g.fillStyle(SHINGLE_DARK, 1); g.fillTriangle(wx - 84, wallTop + 2, wx + 84, wallTop + 2, wx, wallTop - 58);
    g.fillStyle(SHINGLE, 1); g.fillTriangle(wx - 78, wallTop, wx + 78, wallTop, wx, wallTop - 52);
    // Tall windows, lamp-lit.
    for (let i = -1; i <= 1; i++) {
      const wxx = wx + i * 40, wy = wallTop + 34;
      g.fillStyle(0x2a2e31, 1); g.fillRect(wxx - 10, wy - 2, 20, 38);
      g.fillStyle(LAMP, 0.12); g.fillCircle(wxx, wy + 16, 22);
      g.fillStyle(LAMP, 0.85); g.fillRect(wxx - 8, wy, 16, 34);
      g.fillStyle(0x2a2e31, 1); g.fillRect(wxx - 1, wy, 2, 34); g.fillRect(wxx - 8, wy + 16, 16, 2);
    }
  }
  // The tower: tapering, banded red and white, a gallery and the glazed lamp-room.
  const tTop = y - 400;
  const bw = 62, tw = 42;
  const bands = 6;
  for (let k = 0; k < bands; k++) {
    const t0 = k / bands, t1 = (k + 1) / bands;
    const y0 = y - 60 - (y - 60 - tTop) * t0, y1 = y - 60 - (y - 60 - tTop) * t1;
    const w0 = bw + (tw - bw) * t0, w1 = bw + (tw - bw) * t1;
    g.fillStyle(k % 2 ? 0xe8e2d4 : BUOY, 1);
    g.fillPoints([P(x - w0, y0), P(x + w0, y0), P(x + w1, y1), P(x - w1, y1)], true);
    g.fillStyle(0x000000, 0.12);
    g.fillPoints([P(x + w0 * 0.4, y0), P(x + w0, y0), P(x + w1, y1), P(x + w1 * 0.4, y1)], true);
  }
  // Door at the tower foot, between the wings.
  g.fillStyle(0x1f2224, 1); g.fillRoundedRect(x - 26, y - 70, 52, 70, { tl: 24, tr: 24, bl: 0, br: 0 });
  g.fillStyle(0x2f5a62, 1); g.fillRoundedRect(x - 22, y - 66, 44, 66, { tl: 21, tr: 21, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillRect(x - 1, y - 66, 2, 66);
  // A brass wave over the door — the Queen's crest.
  g.lineStyle(3, BRASS, 1);
  g.beginPath(); g.arc(x - 8, y - 78, 8, Math.PI, Math.PI * 2, false); g.strokePath();
  g.beginPath(); g.arc(x + 8, y - 78, 8, Math.PI, Math.PI * 1.85, false); g.strokePath();
  // Gallery.
  g.fillStyle(0x2a2e31, 1); g.fillRect(x - tw - 14, tTop - 4, (tw + 14) * 2, 8);
  g.lineStyle(1.5, 0x2a2e31, 1);
  for (let k = -5; k <= 5; k++) g.lineBetween(x + k * 10, tTop - 4, x + k * 10, tTop - 16);
  g.lineBetween(x - tw - 14, tTop - 16, x + tw + 14, tTop - 16);
  // Lamp-room.
  g.fillStyle(0x2a2e31, 1); g.fillRect(x - 30, tTop - 58, 60, 44);
  g.fillStyle(LAMP, 0.9); g.fillRect(x - 26, tTop - 54, 52, 38);
  g.lineStyle(2, 0x2a2e31, 1);
  for (const k of [-13, 0, 13]) g.lineBetween(x + k, tTop - 54, x + k, tTop - 16);
  g.fillStyle(BUOY_DARK, 1); g.fillTriangle(x - 36, tTop - 58, x + 36, tTop - 58, x, tTop - 92);
  g.fillStyle(BRASS, 1); g.fillCircle(x, tTop - 94, 4);
  // Steps down to the court.
  g.fillStyle(0x5a5e60, 1); g.fillRect(x - 46, y - 4, 92, 6);
  g.fillStyle(0x4c5052, 1); g.fillRect(x - 56, y + 2, 112, 6);
}

/** The lighthouse beam: a slow pale wedge sweeping out over the flats. */
export function lighthouseBeam(g: G, x: number, y: number, t: number): void {
  const a = t * 0.55;
  const len = 760;
  const half = 0.075;
  for (let k = 0; k < 3; k++) {
    const h = half * (1 + k * 0.55);
    g.fillStyle(LAMP, 0.05);
    g.fillTriangle(x, y, x + Math.cos(a - h) * len, y + Math.sin(a - h) * len * 0.55, x + Math.cos(a + h) * len, y + Math.sin(a + h) * len * 0.55);
  }
  glow(g, x, y, 34, LAMP, 0.08, 3);
}

/**
 * The court's waystone: a standing stone dragged up off the seabed, crusted to its shoulders,
 * a brass tide-ring bolted round its waist that glows when you touch it.
 */
export function tideWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 50, 14);
  g.fillStyle(0x3e4446, 1);
  g.fillPoints([P(x - 18, y), P(x + 18, y), P(x + 14, y - 52), P(x + 4, y - 66), P(x - 12, y - 58)], true);
  g.fillStyle(0x56605f, 1);
  g.fillPoints([P(x - 14, y - 2), P(x + 12, y - 2), P(x + 10, y - 50), P(x + 2, y - 62), P(x - 10, y - 54)], true);
  g.fillStyle(WEED, 0.8); g.fillRect(x - 16, y - 18, 32, 4);
  g.fillStyle(BARNACLE, 0.85);
  for (let i = 0; i < 10; i++) g.fillCircle(x - 12 + ((i * 7) % 24), y - 4 - ((i * 11) % 14), 1.4);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 17, y - 38, 33, 7);
  g.fillStyle(BRASS, 1); g.fillRect(x - 16, y - 37, 31, 4);
  g.fillStyle(SEA_LIT, 1); g.fillCircle(x, y - 35, 3);
}

/** A rock shelf round a tide pool: dark wet rock, weed, starfish and anemones on the lip. */
export function poolRocks(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const rx = cx + Math.cos(a) * (r.w / 2 + 16 + rng() * 14);
    const ry = cy + Math.sin(a) * (r.h / 2 + 12 + rng() * 10);
    g.fillStyle(0x3a3f40, 1); g.fillEllipse(rx, ry, 38 + rng() * 26, 22 + rng() * 12);
    g.fillStyle(0x4d5455, 1); g.fillEllipse(rx - 3, ry - 3, 26 + rng() * 14, 12 + rng() * 6);
    if (rng() < 0.4) { g.fillStyle(WEED, 0.85); g.fillEllipse(rx + 6, ry + 4, 14, 5); }
  }
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const sx = cx + Math.cos(a) * (r.w / 2 + 6), sy = cy + Math.sin(a) * (r.h / 2 + 4);
    starfish(g, sx, sy, 5 + rng() * 3, rng() < 0.5 ? 0xd9733e : 0xb0466a, rng() * 6);
  }
}

export function starfish(g: G, x: number, y: number, r: number, color: number, rot: number): void {
  g.fillStyle(color, 1);
  for (let k = 0; k < 5; k++) {
    const a = rot + (k / 5) * Math.PI * 2;
    g.fillTriangle(
      x + Math.cos(a) * r, y + Math.sin(a) * r,
      x + Math.cos(a + 0.6) * r * 0.32, y + Math.sin(a + 0.6) * r * 0.32,
      x + Math.cos(a - 0.6) * r * 0.32, y + Math.sin(a - 0.6) * r * 0.32,
    );
  }
  g.fillCircle(x, y, r * 0.34);
}

/** An anemone: a squat stalk and a crown of waving tentacles. `t` in seconds (0 for a still one). */
export function anemone(g: G, x: number, y: number, r: number, color: number, t: number, seed: number): void {
  g.fillStyle(dim(color, 0.4), 1); g.fillEllipse(x, y, r * 1.4, r * 0.7);
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI + (k / 8) * Math.PI;
    const sway = Math.sin(t * 2.2 + k + seed) * 0.25;
    const ex = x + Math.cos(a + sway) * r * 1.3, ey = y - r * 0.2 + Math.sin(a + sway) * r * 1.1;
    g.lineStyle(2.2, color, 1); g.lineBetween(x + Math.cos(a) * r * 0.4, y - r * 0.15, ex, ey);
    g.fillStyle(lit(color, 0.35), 1); g.fillCircle(ex, ey, 1.6);
  }
}

/** A bell buoy: a red cage on a float, the bell swinging inside it. `swing` is the bell's angle. */
export function bellBuoyBody(g: G, x: number, y: number, s: number, swing: number, tilt = 0): void {
  // Float.
  g.fillStyle(BUOY_DARK, 1); g.fillEllipse(x, y, 46 * s, 18 * s);
  g.fillStyle(BUOY, 1); g.fillEllipse(x, y - 2 * s, 42 * s, 14 * s);
  g.fillStyle(PAINT_CREAM, 0.9); g.fillEllipse(x, y - 1 * s, 42 * s, 4 * s);
  // Cage: four legs up to a crown, leaning with the swell.
  const top = { x: x + Math.sin(tilt) * 46 * s, y: y - 50 * s };
  g.lineStyle(3 * s, BUOY_DARK, 1);
  for (const k of [-1, -0.35, 0.35, 1]) g.lineBetween(x + k * 18 * s, y - 4 * s, top.x + k * 7 * s, top.y);
  g.lineStyle(2 * s, BUOY, 1);
  g.lineBetween(x - 14 * s + Math.sin(tilt) * 20 * s, y - 24 * s, x + 14 * s + Math.sin(tilt) * 20 * s, y - 24 * s);
  g.fillStyle(BUOY, 1); g.fillCircle(top.x, top.y, 4 * s);
  g.fillStyle(LAMP, 0.9); g.fillCircle(top.x, top.y - 5 * s, 2.5 * s);
  // The bell, hung from the crown, swinging.
  const bx = top.x + Math.sin(swing + tilt) * 10 * s, by = top.y + 18 * s;
  g.lineStyle(1.5 * s, PILE, 1); g.lineBetween(top.x, top.y, bx, by - 10 * s);
  g.fillStyle(BRASS_DARK, 1);
  g.fillPoints([P(bx - 6 * s, by - 10 * s), P(bx + 6 * s, by - 10 * s), P(bx + 10 * s, by + 4 * s), P(bx - 10 * s, by + 4 * s)], true);
  g.fillStyle(BRASS, 1);
  g.fillPoints([P(bx - 5 * s, by - 9 * s), P(bx + 3 * s, by - 9 * s), P(bx + 6 * s, by + 3 * s), P(bx - 8 * s, by + 3 * s)], true);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(bx - 3 * s, by - 4 * s, 1.5 * s);
}

/** Gulls: a loose wheeling flock, wings flapping. Drawn over actors. */
export function gulls(g: G, cx: number, cy: number, t: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const a = t * (0.25 + (i % 3) * 0.05) + i * 2.1 + seed;
    const r = 60 + ((i * 37 + seed * 11) % 80);
    const x = cx + Math.cos(a) * r * 1.6;
    const y = cy + Math.sin(a) * r * 0.5;
    const flap = Math.sin(t * 7 + i * 1.7) * 4;
    g.lineStyle(2, 0xf4f4f0, 0.95);
    g.beginPath(); g.moveTo(x - 8, y - flap); g.lineTo(x, y); g.lineTo(x + 8, y - flap); g.strokePath();
    g.lineStyle(1, 0x6a6e70, 0.9);
    g.lineBetween(x - 8, y - flap, x - 10, y - flap + 1); g.lineBetween(x + 8, y - flap, x + 10, y - flap + 1);
  }
}

/** A glass float in a net bag, hung from a post — the town's lamp-less street marker. */
export function glassFloatPost(g: G, x: number, y: number, color: number): void {
  shadow(g, x, y + 2, 16, 5);
  g.fillStyle(PILE, 1); g.fillRect(x - 2, y - 52, 4, 52);
  g.fillStyle(DRIFT_DARK, 1); g.fillRect(x - 2, y - 52, 14, 3);
  g.lineStyle(1, ROPE_DARK, 1); g.lineBetween(x + 10, y - 49, x + 10, y - 42);
  g.fillStyle(color, 0.55); g.fillCircle(x + 10, y - 34, 9);
  g.fillStyle(lit(color, 0.5), 0.8); g.fillCircle(x + 7, y - 37, 3);
  g.lineStyle(1, ROPE, 0.9);
  g.strokeCircle(x + 10, y - 34, 9);
  g.lineBetween(x + 1, y - 34, x + 19, y - 34); g.lineBetween(x + 10, y - 43, x + 10, y - 25);
}

/** Wave lip helper: a foam edge along a horizontal-ish line, scalloped. Used by floors and gimmicks. */
export function foamEdge(g: G, x0: number, x1: number, y: (x: number) => number, w: number, alpha: number): void {
  g.lineStyle(w, FOAM, alpha);
  g.beginPath();
  g.moveTo(x0, y(x0));
  for (let x = x0 + 8; x <= x1; x += 8) g.lineTo(x, y(x));
  g.strokePath();
  g.fillStyle(FOAM, alpha * 0.8);
  for (let x = x0; x <= x1; x += 22) g.fillCircle(x, y(x) - w * 0.3, w * 0.9);
}

/** Water colours re-exported for files that only paint sea. */
export const WATER_TONES = { SEA, SEA_DEEP, SEA_SHALLOW, SEA_LIT, FOAM };
