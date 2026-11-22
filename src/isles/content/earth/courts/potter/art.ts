import { dim, glow, lit, mixC, shadow, stroke, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BISQUE, BISQUE_DARK, BISQUE_LIT, BRICK, BRICK_DARK, BRICK_LIT, CELADON, CELADON_DARK, CELADON_LIT, COBALT, FIRE,
  FIRE_DEEP, FIRE_LIT, GLAZE, GLAZE_DARK, GLAZE_LIT, GOLD, GOLD_DARK, GOLD_LIT, GREENWARE, GREENWARE_LIT, IRON, IRON_LIT,
  MARL, MARL_DARK, MARL_DEEP, MARL_LIT, OXBLOOD, PLASTER, PLASTER_DARK, SAGGAR, SAGGAR_DARK, SLIP, SLIP_DARK, SLIP_DEEP,
  SLIP_LIT, SOOT, SOOT_LIT, STRATA, STRATA_DARK, TERRA, TERRA_DARK, TERRA_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
  TITHE_BLUE,
} from './palette';

/**
 * Potter's Court set pieces. Everything in this town is *thrown* — round, turned on a wheel —
 * so nearly every shape here is drawn on the lathe: a profile swept into slices, lit down its
 * left flank and shaded down its right, the way a pot catches the light from the kiln door. The
 * bottle kilns, the jars on the racks, the saggars in the walls, the Prince's crown — all lathe.
 * The only things that are not round are the things that have broken: the shard heaps, the
 * cracked soldiers, the strata of the cliffs the clay is dug from.
 */

// ── The lathe ────────────────────────────────────────────────────────

export interface LatheOpts {
  /** Lit flank colour (default: body lightened). */
  lit?: number;
  /** Shaded flank colour (default: body darkened). */
  dark?: number;
  alpha?: number;
  /** Slice height in px (default 2). */
  step?: number;
  /** Draw the open mouth at the top (default true). */
  mouth?: boolean;
  /** Colour inside the mouth (default very dark body). */
  inside?: number;
}

/**
 * Sweep a profile round an axis: `half(v)` is the half-width at height fraction v (0 = foot,
 * 1 = lip). Each slice is filled, shaded on the right and lit on the left, so the shape reads as
 * round. `x, y` = the foot centre; draws upward `h` px.
 */
export function lathe(g: G, x: number, y: number, h: number, half: (v: number) => number, body: number, o: LatheOpts = {}): void {
  const a = o.alpha ?? 1;
  const step = o.step ?? 2;
  const lc = o.lit ?? lit(body, 0.22);
  const dc = o.dark ?? dim(body, 0.3);
  for (let yy = 0; yy < h; yy += step) {
    const v = yy / h;
    const w = half(v);
    if (w <= 0.2) continue;
    const sy = y - yy - step;
    g.fillStyle(body, a); g.fillRect(x - w, sy, w * 2, step + 0.6);
    g.fillStyle(dc, a * 0.85); g.fillRect(x + w * 0.38, sy, w * 0.62, step + 0.6);
    g.fillStyle(dim(dc, 0.25), a * 0.6); g.fillRect(x + w * 0.8, sy, w * 0.2, step + 0.6);
    g.fillStyle(lc, a * 0.75); g.fillRect(x - w * 0.72, sy, w * 0.26, step + 0.6);
  }
  if (o.mouth !== false) {
    const w = half(1);
    g.fillStyle(dim(body, 0.15), a); g.fillEllipse(x, y - h, w * 2, Math.max(2, w * 0.42));
    g.fillStyle(o.inside ?? dim(body, 0.7), a); g.fillEllipse(x, y - h + 0.5, w * 1.6, Math.max(1.4, w * 0.3));
  }
}

/** Shapes of thrown ware, as lathe profiles. */
export type PotShape = 'jar' | 'bowl' | 'vase' | 'jug' | 'urn' | 'bottle' | 'cup';

const PROFILES: Record<PotShape, { h: number; half: (v: number) => number }> = {
  jar: { h: 1.0, half: (v) => 0.42 + Math.sin(v * Math.PI) * 0.3 - (v > 0.85 ? (v - 0.85) * 1.2 : 0) },
  bowl: { h: 0.45, half: (v) => 0.3 + Math.sin(v * Math.PI * 0.5) * 0.62 },
  vase: { h: 1.35, half: (v) => (v < 0.45 ? 0.3 + Math.sin((v / 0.45) * Math.PI * 0.75) * 0.32 : v < 0.82 ? 0.2 + (0.82 - v) * 0.5 : 0.2 + (v - 0.82) * 1.2) },
  jug: { h: 1.05, half: (v) => 0.36 + Math.sin(v * Math.PI * 0.9) * 0.28 - (v > 0.7 ? (v - 0.7) * 0.6 : 0) },
  urn: { h: 1.2, half: (v) => (v < 0.12 ? 0.3 : v < 0.2 ? 0.14 : 0.16 + Math.sin(((v - 0.2) / 0.8) * Math.PI) * 0.5 + (v > 0.9 ? 0.08 : 0)) },
  bottle: { h: 1.4, half: (v) => (v < 0.55 ? 0.34 + Math.sin((v / 0.55) * Math.PI * 0.6) * 0.12 : v < 0.75 ? 0.46 - ((v - 0.55) / 0.2) * 0.34 : 0.12) },
  cup: { h: 0.6, half: (v) => 0.32 + v * 0.12 },
};

/**
 * A pot. `s` = height of a jar in px; `body` is the clay (greenware, bisque, terracotta) and
 * `glaze`, if given, coats the upper two-thirds with a drip line, the way a dipped pot comes out.
 */
export function pot(g: G, x: number, y: number, s: number, shape: PotShape, body: number, glaze?: number, a = 1): void {
  const p = PROFILES[shape];
  const h = s * p.h;
  shadow(g, x + 2, y, s * 0.9, s * 0.26, 0.25 * a);
  lathe(g, x, y, h, (v) => p.half(v) * s, body, { alpha: a });
  if (glaze !== undefined) {
    // Dipped: glaze from the lip down to an uneven line, with a run or two.
    const top = h;
    const line = h * 0.34;
    lathe(g, x, y - line, top - line, (v) => p.half((line + v * (top - line)) / h) * s + 0.3, glaze, { alpha: a * 0.92, mouth: false, lit: lit(glaze, 0.4) });
    for (let k = -1; k <= 1; k += 2) {
      const dx = k * p.half(0.36) * s * 0.4;
      g.fillStyle(glaze, a * 0.9); g.fillRoundedRect(x + dx - 1.5, y - line - 2, 3, 5 + Math.abs(k * 3), 1.5);
    }
    // A gloss highlight.
    g.fillStyle(0xffffff, a * 0.35); g.fillEllipse(x - p.half(0.6) * s * 0.45, y - h * 0.62, Math.max(1.5, s * 0.06), s * 0.18);
    const w = p.half(1) * s;
    g.fillStyle(dim(glaze, 0.2), a); g.fillEllipse(x, y - h, w * 2, Math.max(2, w * 0.42));
    g.fillStyle(dim(glaze, 0.65), a); g.fillEllipse(x, y - h + 0.5, w * 1.6, Math.max(1.4, w * 0.3));
  }
  if (shape === 'jug') {
    // A pulled handle and a pinched spout.
    const hx = x + p.half(0.6) * s;
    g.lineStyle(Math.max(1.5, s * 0.08), dim(glaze ?? body, 0.15), a);
    g.beginPath(); g.arc(hx, y - h * 0.62, s * 0.18, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
    g.fillStyle(glaze ?? body, a); g.fillTriangle(x - p.half(1) * s, y - h - 1, x - p.half(1) * s - s * 0.12, y - h - 3, x - p.half(1) * s, y - h + 3);
  }
  if (shape === 'urn') {
    for (const k of [-1, 1]) {
      g.lineStyle(Math.max(1.5, s * 0.07), dim(glaze ?? body, 0.2), a);
      g.beginPath(); g.arc(x + k * p.half(0.8) * s, y - h * 0.8, s * 0.12, k > 0 ? -Math.PI / 2 : Math.PI / 2, k > 0 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
    }
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * A sherd-paved road: Potter's Court has paved its streets with its own breakages for four
 * hundred years, so every road is a mosaic of broken pots — terracotta, bisque, and here and
 * there a glazed piece that still shines.
 */
export function sherdRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 14, MARL_DEEP, 0.8);
  stroke(g, pts, w + 6, MARL_DARK);
  stroke(g, pts, w, mixC(MARL, BISQUE_DARK, 0.4));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let d = 0; d < len; d += 5) {
      const off = (rng() - 0.5) * w * 0.9;
      const x = a.x + ux * d - uy * off, y = a.y + uy * d + ux * off;
      const k = rng();
      const c = k < 0.45 ? TERRA : k < 0.75 ? BISQUE : k < 0.86 ? TERRA_DARK : k < 0.93 ? CELADON : k < 0.97 ? COBALT : OXBLOOD;
      sherd(g, x, y, 3 + rng() * 4, c, rng);
    }
  }
}

/** One flat sherd set in the ground: an angular chip with a lit edge. */
export function sherd(g: G, x: number, y: number, r: number, c: number, rng: () => number, a = 1): void {
  const n = 4 + Math.floor(rng() * 2);
  const pts: Pt[] = [];
  const rot = rng() * Math.PI;
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * Math.PI * 2;
    const k = 0.6 + rng() * 0.5;
    pts.push({ x: x + Math.cos(t) * r * k, y: y + Math.sin(t) * r * k * 0.7 });
  }
  g.fillStyle(dim(c, 0.35), a); g.fillPoints(pts.map((p) => ({ x: p.x + 0.8, y: p.y + 0.8 })), true, true);
  g.fillStyle(c, a); g.fillPoints(pts, true, true);
  g.lineStyle(0.8, lit(c, 0.35), a * 0.7); g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
}

/**
 * The great banded cliff of the mesa, seen from the court below: strata in level courses
 * (sandstone, marl, ironstone, clay), each weathered back a little more than the one above, with
 * dark seams between, fallen scree at its foot and potters' adits dug into the clay bands.
 */
export function strataCliff(g: G, r: Rect, rng: () => number, adits: number[] = []): void {
  const bands = 9;
  const bh = r.h / bands;
  for (let i = 0; i < bands; i++) {
    const y0 = r.y + i * bh;
    const c = STRATA[i % STRATA.length];
    g.fillStyle(c, 1); g.fillRect(r.x, y0, r.w, bh + 1);
    // The ledge: a lit lip along the top of each band, a dark undercut along the bottom.
    g.fillStyle(lit(c, 0.18), 1); g.fillRect(r.x, y0, r.w, 3);
    g.fillStyle(STRATA_DARK, 0.45); g.fillRect(r.x, y0 + bh - 3, r.w, 3);
    // Vertical joints and erosion runnels.
    for (let x = r.x + rng() * 40; x < r.x + r.w; x += 30 + rng() * 70) {
      g.lineStyle(1.2, dim(c, 0.35), 0.6); g.lineBetween(x, y0 + 3, x + (rng() - 0.5) * 6, y0 + bh - 2);
    }
    // Pebbles and nodules weathering out.
    for (let k = 0; k < r.w / 40; k++) {
      g.fillStyle(rng() < 0.5 ? dim(c, 0.25) : lit(c, 0.25), 0.6);
      g.fillEllipse(r.x + rng() * r.w, y0 + 4 + rng() * (bh - 8), 3 + rng() * 5, 2 + rng() * 2);
    }
  }
  // Adits: square tunnel mouths with timber frames, where the best clay is dug.
  for (const ax of adits) {
    const ay = r.y + r.h - bh * 2.4;
    g.fillStyle(SOOT, 1); g.fillRect(ax - 16, ay, 32, bh * 1.8);
    g.fillStyle(0x140e0c, 1); g.fillRect(ax - 12, ay + 4, 24, bh * 1.8 - 4);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(ax - 18, ay - 3, 36, 5); g.fillRect(ax - 18, ay, 5, bh * 1.8); g.fillRect(ax + 13, ay, 5, bh * 1.8);
    g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(ax - 18, ay - 3, 36, 1.5);
  }
  // Scree fan at the foot.
  for (let k = 0; k < r.w / 8; k++) {
    const x = r.x + rng() * r.w, y = r.y + r.h - rng() * 10 + rng() * 14;
    g.fillStyle(STRATA[Math.floor(rng() * STRATA.length)], 0.9); g.fillEllipse(x, y, 4 + rng() * 6, 2 + rng() * 3);
  }
  g.fillStyle(0x000000, 0.16); g.fillRect(r.x, r.y + r.h, r.w, 10);
}

/**
 * A clay pit seen from above: stepped benches cut down through the strata, each bench face
 * showing its band of clay, a puddle of slip in the bottom, spade-cut blocks waiting on the
 * benches and the plank ramps the barrows go up.
 */
export function clayPit(g: G, r: Rect, rng: () => number): void {
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const inset = i * 22;
    const rx = r.x + inset, ry = r.y + inset * 0.8, rw = r.w - inset * 2, rh = r.h - inset * 1.6;
    if (rw < 20 || rh < 20) break;
    const c = [MARL_LIT, MARL, 0x8a6e5a, 0x6e4a52][i];
    g.fillStyle(dim(c, 0.3), 1); g.fillRoundedRect(rx, ry, rw, rh, 18);
    g.fillStyle(c, 1); g.fillRoundedRect(rx, ry + 8, rw, rh - 8, 16);
    // The bench face: the band of strata exposed on the north side.
    g.fillStyle(STRATA[(i + 1) % STRATA.length], 0.7); g.fillRect(rx + 14, ry, rw - 28, 7);
    g.lineStyle(1, STRATA_DARK, 0.4); g.lineBetween(rx + 14, ry + 7, rx + rw - 14, ry + 7);
    // Spade marks.
    for (let k = 0; k < rw / 16; k++) {
      const sx = rx + 12 + rng() * (rw - 24), sy = ry + 12 + rng() * Math.min(18, rh - 20);
      g.lineStyle(1.2, dim(c, 0.3), 0.5); g.lineBetween(sx, sy, sx + 5, sy + 2);
    }
  }
  // The sump: standing slip at the bottom.
  const cx = r.x + r.w / 2, cy = r.y + r.h * 0.62;
  g.fillStyle(SLIP_DEEP, 1); g.fillEllipse(cx, cy, r.w * 0.36, r.h * 0.2);
  g.fillStyle(SLIP_DARK, 1); g.fillEllipse(cx - 4, cy - 2, r.w * 0.3, r.h * 0.15);
  g.fillStyle(SLIP_LIT, 0.35); g.fillEllipse(cx - r.w * 0.06, cy - r.h * 0.04, r.w * 0.1, r.h * 0.03);
  // Cut blocks on the benches.
  for (let k = 0; k < 7; k++) {
    const bx = r.x + 30 + rng() * (r.w - 60), by = r.y + 20 + rng() * (r.h - 40);
    if (Math.abs(bx - cx) < r.w * 0.2 && Math.abs(by - cy) < r.h * 0.14) continue;
    g.fillStyle(MARL_DEEP, 0.8); g.fillRect(bx + 1, by + 1, 10, 7);
    g.fillStyle(rng() < 0.5 ? 0x8a6e5a : MARL_LIT, 1); g.fillRect(bx, by, 10, 7);
    g.fillStyle(0xffffff, 0.15); g.fillRect(bx, by, 10, 1.5);
  }
  // A plank ramp down from the rim.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(r.x + r.w - 70, r.y + 6, 16, r.h * 0.5);
  g.fillStyle(TIMBER, 1); g.fillRect(r.x + r.w - 69, r.y + 6, 14, r.h * 0.5);
  for (let y = r.y + 12; y < r.y + r.h * 0.5; y += 9) { g.lineStyle(1, TIMBER_DARK, 0.8); g.lineBetween(r.x + r.w - 69, y, r.x + r.w - 55, y); }
}

/** A slip channel: liquid clay running in a cut, slick sheen lines along its flow. Walkable — it is ankle deep. */
export function slipChannel(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 10, MARL_DEEP, 0.7);
  stroke(g, pts, w + 4, SLIP_DARK);
  stroke(g, pts, w, SLIP);
  stroke(g, pts, w * 0.45, mixC(SLIP, SLIP_LIT, 0.35), 0.6);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let d = 0; d < len; d += 18) {
      const off = (rng() - 0.5) * w * 0.6;
      const x = a.x + ux * d - uy * off, y = a.y + uy * d + ux * off;
      g.lineStyle(1, SLIP_LIT, 0.5); g.lineBetween(x, y, x + ux * 8, y + uy * 8);
    }
  }
}

/** The slip pond: thick, still and the colour of milky tea, with a trodden rim and a ware-board jetty. */
export function slipPond(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MARL_DEEP, 1); g.fillRoundedRect(r.x - 14, r.y - 12, r.w + 28, r.h + 26, 46);
  g.fillStyle(MARL_DARK, 1); g.fillRoundedRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 40);
  g.fillStyle(SLIP_DARK, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 36);
  g.fillStyle(SLIP, 1); g.fillRoundedRect(r.x + 14, r.y + 10, r.w - 28, r.h - 24, 30);
  g.fillStyle(SLIP_DEEP, 0.55); g.fillRoundedRect(r.x + 60, r.y + 40, r.w - 120, r.h - 80, 24);
  // Skin on the surface: pale wrinkles where it is setting at the edges.
  for (let i = 0; i < r.w / 9; i++) {
    const x = r.x + 20 + rng() * (r.w - 40), y = r.y + 14 + rng() * (r.h - 30);
    g.lineStyle(1, SLIP_LIT, 0.25); g.beginPath(); g.arc(x, y, 4 + rng() * 9, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  }
  // Footprints in the rim.
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const x = r.x + r.w / 2 + Math.cos(a) * (r.w / 2 + 2), y = r.y + r.h / 2 + Math.sin(a) * (r.h / 2 + 2);
    g.fillStyle(MARL_DEEP, 0.7); g.fillEllipse(x, y, 4, 6);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

/**
 * A bottle kiln — the shape of the court. A brick *hovel* swelling from the ground and drawing
 * in to a tall neck, girdled with iron *bonts*, the brick blacker the higher it goes, a lip of
 * cuff at the top. Round its foot: the firemouths, glowing if `fire` > 0, and the bricked-up
 * wicket door the placers go in by. `r` is the half-width at the foot.
 */
export function bottleKiln(g: G, x: number, y: number, r: number, rng: () => number, fire = 1): void {
  const h = r * 2.9;
  shadow(g, x + r * 0.3, y + 2, r * 2.6, r * 0.6, 0.38);
  const half = (v: number): number => {
    if (v < 0.22) return r * (1 + Math.sin((v / 0.22) * Math.PI * 0.5) * 0.06);
    if (v < 0.8) { const k = (v - 0.22) / 0.58; return r * (1.06 - (1 - Math.cos(k * Math.PI * 0.5)) * 0.74); }
    if (v < 0.9) return r * 0.32;
    return r * 0.38;
  };
  lathe(g, x, y, h, half, BRICK, { lit: BRICK_LIT, dark: BRICK_DARK, step: 2, inside: 0x140c0a });
  // Soot climbing the neck.
  for (let yy = h * 0.42; yy < h; yy += 2) {
    const v = yy / h;
    const w = half(v);
    g.fillStyle(SOOT, Math.min(0.85, (v - 0.42) * 1.6)); g.fillRect(x - w, y - yy - 2, w * 2, 2.6);
  }
  // Brick courses, curving round the belly.
  for (let yy = 6; yy < h * 0.9; yy += 6) {
    const v = yy / h;
    const w = half(v);
    g.lineStyle(0.8, dim(BRICK_DARK, 0.3), 0.5);
    g.beginPath(); g.arc(x, y - yy - w * 0.12, w, Math.PI * 0.12, Math.PI * 0.88, false); g.strokePath();
    for (let k = 0; k < w / 6; k++) {
      const bx = x - w + ((k * 13 + yy * 7) % (w * 2));
      g.lineStyle(0.6, dim(BRICK_DARK, 0.3), 0.35); g.lineBetween(bx, y - yy, bx, y - yy + 5);
    }
  }
  // The iron bonts.
  for (const v of [0.16, 0.34, 0.52, 0.68]) {
    const w = half(v) + 1;
    const by = y - v * h;
    g.lineStyle(3, IRON, 1); g.beginPath(); g.arc(x, by - w * 0.12, w, Math.PI * 0.08, Math.PI * 0.92, false); g.strokePath();
    g.lineStyle(1, IRON_LIT, 0.6); g.beginPath(); g.arc(x, by - w * 0.12 - 1.5, w, Math.PI * 0.55, Math.PI * 0.9, false); g.strokePath();
    for (let k = -2; k <= 2; k++) { g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x + k * w * 0.36, by + Math.abs(k) * 1.2 - 2, 1.2); }
  }
  // The cuff at the top.
  const cw = half(0.95);
  g.fillStyle(SOOT_LIT, 1); g.fillRect(x - cw - 3, y - h + 2, cw * 2 + 6, 6);
  g.fillStyle(SOOT, 1); g.fillRect(x - cw - 3, y - h + 6, cw * 2 + 6, 2);
  // Firemouths round the foot, and the wicket door.
  for (const k of [-0.72, -0.24, 0.24, 0.72]) {
    const fx = x + k * r, fy = y - 4;
    g.fillStyle(BRICK_DARK, 1); g.fillRect(fx - 9, fy - 14, 18, 14);
    g.fillStyle(BRICK_LIT, 1); g.beginPath(); g.arc(fx, fy - 14, 9, Math.PI, 0, false); g.fillPath();
    g.fillStyle(fire > 0 ? mixC(FIRE_DEEP, FIRE, fire) : SOOT, 1); g.fillRect(fx - 6, fy - 11, 12, 11);
    if (fire > 0) { g.fillStyle(FIRE_LIT, 0.8 * fire); g.fillRect(fx - 4, fy - 6, 8, 6); }
    g.fillStyle(IRON, 1); g.fillRect(fx - 8, fy - 1, 16, 2);
  }
  // The clammins: the wicket bricked up for the firing, a fresh patch of pale brick and daub.
  g.fillStyle(BISQUE_DARK, 1); g.fillRect(x - 13, y - r * 1.25, 26, r * 0.9);
  for (let yy = 0; yy < r * 0.9; yy += 5) {
    g.lineStyle(0.8, SAGGAR_DARK, 0.7); g.lineBetween(x - 13, y - r * 1.25 + yy, x + 13, y - r * 1.25 + yy);
  }
  g.fillStyle(BRICK_LIT, 1); g.beginPath(); g.arc(x, y - r * 1.25, 13, Math.PI, 0, false); g.fillPath();
  // A spyhole bung, glowing.
  if (fire > 0) { g.fillStyle(FIRE_LIT, 0.9); g.fillCircle(x + 6, y - r * 0.85, 2); }
  // Some brick-to-brick variation.
  for (let i = 0; i < r; i++) {
    const v = rng() * 0.5;
    const w = half(v);
    g.fillStyle(rng() < 0.5 ? BRICK_LIT : BRICK_DARK, 0.5); g.fillRect(x - w + rng() * w * 2, y - v * h, 4, 2);
  }
}

/**
 * The Glost House — Prince Glaze's seat: the court's great glost kiln (the one that fires glaze),
 * a bottle twice the height of any other, its cuff gilded; flanked by two wings in bisque brick
 * under roofs of half-round celadon tiles; an arcade of round arches; and over the door the
 * Prince's sign, a broken bowl mended in gold. `x, y` = the middle of the front step.
 */
export function glostHouse(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 8, 700, 44, 0.3);
  // The great kiln behind.
  bottleKiln(g, x, y - 70, 120, rng, 1);
  // Gilded cuff and bonts on the great kiln.
  const kh = 120 * 2.9;
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 50, y - 70 - kh + 1, 100, 8);
  g.fillStyle(GOLD, 1); g.fillRect(x - 50, y - 70 - kh, 100, 5);
  g.fillStyle(GOLD_LIT, 0.8); g.fillRect(x - 50, y - 70 - kh, 40, 1.5);
  // The wings.
  for (const k of [-1, 1]) {
    const wx = x + k * 210;
    const ww = 240, wh = 120;
    const x0 = wx - ww / 2;
    // Bisque brick walls.
    g.fillStyle(BISQUE_DARK, 1); g.fillRect(x0, y - 20 - wh, ww, wh);
    g.fillStyle(BISQUE, 1); g.fillRect(x0 + 2, y - 20 - wh, ww - 4, wh - 2);
    for (let yy = 6; yy < wh; yy += 7) {
      g.lineStyle(0.7, BISQUE_DARK, 0.6); g.lineBetween(x0 + 2, y - 20 - wh + yy, x0 + ww - 2, y - 20 - wh + yy);
      for (let xx = ((yy / 7) % 2) * 8; xx < ww; xx += 16) g.lineBetween(x0 + xx, y - 20 - wh + yy, x0 + xx, y - 20 - wh + yy - 7);
    }
    // Arcade: three round arches, dark within, a pot on each sill.
    for (let i = 0; i < 3; i++) {
      const ax = x0 + 40 + i * 80;
      g.fillStyle(0x2a1c18, 1); g.fillRect(ax - 22, y - 20 - 74, 44, 74);
      g.beginPath(); g.arc(ax, y - 20 - 74, 22, Math.PI, 0, false); g.fillPath();
      g.lineStyle(4, CELADON_DARK, 1); g.beginPath(); g.arc(ax, y - 20 - 74, 25, Math.PI, 0, false); g.strokePath();
      g.lineStyle(2, CELADON, 1); g.beginPath(); g.arc(ax, y - 20 - 75, 25, Math.PI, 0, false); g.strokePath();
      g.fillStyle(CELADON_DARK, 1); g.fillRect(ax - 27, y - 20 - 74, 5, 74); g.fillRect(ax + 22, y - 20 - 74, 5, 74);
      // Through the arch: a wheel and a lamp's glow.
      glow(g, ax, y - 50, 18, FIRE, 0.05, 3);
      pot(g, ax, y - 22, 20, (['vase', 'urn', 'jar'] as PotShape[])[(i + (k > 0 ? 1 : 0)) % 3], BISQUE, [CELADON, COBALT, GLAZE][(i + 1) % 3]);
    }
    // Roof of half-round celadon tiles, row on row.
    const ry = y - 20 - wh;
    g.fillStyle(CELADON_DARK, 1); g.fillTriangle(x0 - 14, ry + 4, x0 + ww + 14, ry + 4, wx, ry - 62);
    for (let row = 0; row < 8; row++) {
      const t = row / 8;
      const yy = ry + 2 - t * 60;
      const half = (ww / 2 + 14) * (1 - t);
      for (let xx = -half; xx < half; xx += 9) {
        g.fillStyle(row % 2 ? CELADON : lit(CELADON, 0.1), 1);
        g.beginPath(); g.arc(wx + xx + 4.5, yy, 4.5, Math.PI, 0, false); g.fillPath();
        g.fillStyle(CELADON_LIT, 0.5); g.fillRect(wx + xx + 2, yy - 3.5, 2, 1.5);
      }
    }
    g.fillStyle(GLAZE_DARK, 1); g.fillRect(wx - 3, ry - 66, 6, 10);
    pot(g, wx, ry - 60, 14, 'bottle', BISQUE, GOLD);
  }
  // The centre: a gatehouse in front of the kiln, the door and the mended-bowl sign.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 90, y - 160, 180, 140);
  g.fillStyle(BRICK, 1); g.fillRect(x - 86, y - 160, 172, 138);
  for (let yy = 6; yy < 138; yy += 6) { g.lineStyle(0.7, BRICK_DARK, 0.6); g.lineBetween(x - 86, y - 160 + yy, x + 86, y - 160 + yy); }
  // Celadon-tiled facing round the door.
  g.fillStyle(CELADON_DARK, 1); g.fillRect(x - 54, y - 136, 108, 116);
  for (let yy = 0; yy < 110; yy += 10) for (let xx = 0; xx < 100; xx += 10) {
    g.fillStyle((xx + yy) % 20 ? CELADON : lit(CELADON, 0.12), 1); g.fillRect(x - 50 + xx, y - 132 + yy, 9, 9);
    if (rng() < 0.3) { g.lineStyle(0.6, CELADON_DARK, 0.6); g.lineBetween(x - 50 + xx, y - 132 + yy + rng() * 9, x - 41 + xx, y - 132 + yy + rng() * 9); }
  }
  // The door: double leaves of dark wood studded with gold.
  g.fillStyle(0x24140e, 1); g.fillRect(x - 32, y - 110, 64, 90);
  g.beginPath(); g.arc(x, y - 110, 32, Math.PI, 0, false); g.fillPath();
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 28, y - 106, 27, 86); g.fillRect(x + 1, y - 106, 27, 86);
  for (let yy = 0; yy < 4; yy++) for (const xx of [-20, -8, 8, 20]) { g.fillStyle(GOLD, 1); g.fillCircle(x + xx, y - 96 + yy * 20, 1.8); }
  // The sign: a celadon bowl, cracked in three, every crack run with gold.
  const sx = x, sy = y - 158;
  g.fillStyle(GLAZE_DARK, 1); g.fillCircle(sx, sy, 26);
  g.fillStyle(GLAZE, 1); g.fillEllipse(sx, sy + 4, 40, 22);
  g.fillStyle(GLAZE_LIT, 1); g.fillEllipse(sx, sy - 2, 40, 10);
  g.fillStyle(GLAZE_DARK, 1); g.fillEllipse(sx, sy - 2, 34, 7);
  g.lineStyle(2, GOLD, 1);
  g.lineBetween(sx - 8, sy - 4, sx - 4, sy + 4); g.lineBetween(sx - 4, sy + 4, sx - 10, sy + 12);
  g.lineBetween(sx + 6, sy - 4, sx + 10, sy + 6); g.lineBetween(sx + 10, sy + 6, sx + 4, sy + 14);
  g.lineStyle(1, GOLD_LIT, 1); g.lineBetween(sx - 8, sy - 4, sx - 6, sy);
  // Steps, the bottom one cracked and mended in gold too.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? BISQUE : BISQUE_LIT, 1); g.fillRect(x - 60 - k * 8, y - 20 + k * 7, 120 + k * 16, 7); }
  g.lineStyle(1.5, GOLD, 1); g.lineBetween(x - 30, y + 1, x - 18, y - 4); g.lineBetween(x - 18, y - 4, x - 6, y + 2);
}

/**
 * A throwing house: a low workshop of saggar-brick with its whole front open to the street, a
 * kick-wheel in the doorway, ware boards of fresh pots on trestles outside, and a lean-to of
 * pantiles. `x, y` = front-wall base centre.
 */
export function throwingHouse(g: G, x: number, y: number, w: number, rng: () => number, roof = TERRA): void {
  const h = 74;
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.1, 26);
  g.fillStyle(SAGGAR_DARK, 1); g.fillRect(x0, y - h, w, h);
  // Walls of stacked saggars, round ends showing.
  for (let yy = 0; yy < h; yy += 12) {
    for (let xx = ((yy / 12) % 2) * 9; xx < w; xx += 18) {
      g.fillStyle(rng() < 0.15 ? dim(SAGGAR, 0.15) : SAGGAR, 1); g.fillEllipse(x0 + xx + 9, y - yy - 6, 17, 11);
      g.fillStyle(SAGGAR_DARK, 0.6); g.fillEllipse(x0 + xx + 9, y - yy - 4, 13, 5);
    }
  }
  // The open front: dark shop, a wheel, a seated shape of a pot on it.
  const ow = w * 0.56;
  g.fillStyle(0x2a1c16, 1); g.fillRect(x - ow / 2, y - h + 14, ow, h - 14);
  glow(g, x, y - 30, 30, FIRE, 0.04, 3);
  potterWheel(g, x - ow * 0.18, y - 6, 1, 0);
  // Pantile lean-to roof.
  g.fillStyle(dim(roof, 0.35), 1); g.fillRect(x0 - 10, y - h - 6, w + 20, 14);
  for (let xx = x0 - 10; xx < x0 + w + 10; xx += 10) {
    g.fillStyle(roof, 1); g.fillEllipse(xx + 5, y - h - 2, 10, 14);
    g.fillStyle(lit(roof, 0.2), 0.7); g.fillEllipse(xx + 3, y - h - 5, 3, 6);
  }
  // Ware boards on trestles, either side of the front.
  for (const k of [-1, 1]) {
    const bx = x + k * (ow / 2 + (w - ow) / 4);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(bx - 22, y - 22, 3, 22); g.fillRect(bx + 19, y - 22, 3, 22);
    g.fillStyle(TIMBER, 1); g.fillRect(bx - 26, y - 25, 52, 4);
    for (let i = 0; i < 4; i++) pot(g, bx - 18 + i * 12, y - 25, 10 + (i % 2) * 3, (['cup', 'jar', 'bowl', 'jug'] as PotShape[])[i], GREENWARE_LIT);
  }
}

/**
 * A kick-wheel: the heavy flywheel at the foot, the shaft, the wheel-head on top and a pot
 * centred on it. `spin` turns the spokes (t in seconds from `animate`, or 0 baked).
 */
export function potterWheel(g: G, x: number, y: number, s: number, spin: number, potColor = SLIP): void {
  shadow(g, x, y + 1, 34 * s, 10 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - 4 * s, 30 * s, 10 * s);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, y - 6 * s, 30 * s, 10 * s);
  for (let i = 0; i < 4; i++) {
    const a = spin * 4 + (i / 4) * Math.PI;
    g.lineStyle(1.2 * s, TIMBER_DARK, 1); g.lineBetween(x - Math.cos(a) * 14 * s, y - 6 * s - Math.sin(a) * 4 * s, x + Math.cos(a) * 14 * s, y - 6 * s + Math.sin(a) * 4 * s);
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 1.5 * s, y - 24 * s, 3 * s, 18 * s);
  g.fillStyle(IRON_LIT, 1); g.fillEllipse(x, y - 24 * s, 20 * s, 6 * s);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 23 * s, 20 * s, 5 * s);
  lathe(g, x, y - 25 * s, 12 * s, (v) => (4 + Math.sin(v * Math.PI * 0.9) * 2.5 - v * 1.2) * s, potColor, { lit: lit(potColor, 0.35) });
  // Throwing rings on the wet pot.
  for (let k = 0; k < 3; k++) {
    const ry = y - 25 * s - (3 + k * 3) * s;
    g.lineStyle(0.6, dim(potColor, 0.25), 0.8); g.lineBetween(x - 5 * s, ry, x + 5 * s, ry);
  }
}

/**
 * A terracotta soldier, life-size: armoured skirt and lamellar coat in fired clay, the
 * scales of the coat in rows, hands clasped on a spear, hair in a topknot, a face each one
 * different — and a cobalt tithe-mark on the plinth. `cracks` 0–2: hairline, then a broken
 * shoulder. `x, y` = the plinth's base.
 */
export function terracottaSoldier(g: G, x: number, y: number, s: number, variant: number, cracks = 0, a = 1): void {
  shadow(g, x + 2, y + 1, 30 * s, 9 * s, 0.32 * a);
  const body = mixC(TERRA, BISQUE_DARK, (variant % 3) * 0.12);
  const bd = dim(body, 0.28), bl = lit(body, 0.18);
  // Plinth.
  g.fillStyle(dim(body, 0.4), a); g.fillRect(x - 11 * s, y - 4 * s, 22 * s, 4 * s);
  g.fillStyle(bd, a); g.fillRect(x - 11 * s, y - 5 * s, 22 * s, 2 * s);
  g.fillStyle(TITHE_BLUE, a * 0.9); g.fillRect(x - 3 * s, y - 3.6 * s, 6 * s, 2.4 * s);
  // Legs and boots.
  for (const k of [-1, 1]) {
    g.fillStyle(bd, a); g.fillRect(x + k * 4 * s - 2.5 * s, y - 16 * s, 5 * s, 11 * s);
    g.fillStyle(body, a); g.fillRect(x + k * 4 * s - 2.5 * s, y - 16 * s, 3 * s, 11 * s);
    g.fillStyle(dim(body, 0.35), a); g.fillEllipse(x + k * 4 * s + k, y - 5.5 * s, 7 * s, 3 * s);
  }
  // Skirt.
  g.fillStyle(bd, a); g.fillTriangle(x - 10 * s, y - 15 * s, x + 10 * s, y - 15 * s, x, y - 28 * s);
  g.fillStyle(body, a); g.fillRect(x - 9 * s, y - 22 * s, 18 * s, 7 * s);
  // Torso with the lamellar coat.
  g.fillStyle(bd, a); g.fillRoundedRect(x - 9 * s, y - 38 * s, 18 * s, 18 * s, 3 * s);
  g.fillStyle(body, a); g.fillRoundedRect(x - 9 * s, y - 38 * s, 13 * s, 18 * s, 3 * s);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      g.fillStyle(r % 2 ? bl : bd, a * 0.8);
      g.fillRect(x - 8 * s + c * 4 * s + (r % 2) * 2 * s, y - 36 * s + r * 4 * s, 3 * s, 3 * s);
    }
  }
  g.fillStyle(dim(body, 0.4), a); g.fillRect(x - 9 * s, y - 22 * s, 18 * s, 1.6 * s);
  // Arms clasped in front, the spear held upright.
  g.fillStyle(body, a); g.fillEllipse(x - 10 * s, y - 33 * s, 6 * s, 12 * s); g.fillEllipse(x + 10 * s, y - 33 * s, 6 * s, 12 * s);
  g.fillStyle(bd, a); g.fillEllipse(x + 1 * s, y - 27 * s, 9 * s, 5 * s);
  g.fillStyle(TIMBER_DARK, a); g.fillRect(x + 4 * s, y - 56 * s, 1.8 * s, 50 * s);
  g.fillStyle(IRON_LIT, a); g.fillTriangle(x + 3 * s, y - 56 * s, x + 6.8 * s, y - 56 * s, x + 4.9 * s, y - 63 * s);
  // Head: neck, a face, topknot.
  g.fillStyle(bd, a); g.fillRect(x - 2.5 * s, y - 42 * s, 5 * s, 4 * s);
  g.fillStyle(body, a); g.fillEllipse(x, y - 46 * s, 10 * s, 11 * s);
  g.fillStyle(bl, a * 0.8); g.fillEllipse(x - 2 * s, y - 47.5 * s, 4 * s, 5 * s);
  g.fillStyle(dim(body, 0.5), a); g.fillRect(x - 3 * s, y - 47 * s, 2 * s, 1 * s); g.fillRect(x + 1 * s, y - 47 * s, 2 * s, 1 * s);
  // A moustache, a beard or neither — every face is someone's.
  if (variant % 4 === 1) { g.fillStyle(dim(body, 0.45), a); g.fillRect(x - 2.5 * s, y - 44 * s, 5 * s, 1 * s); }
  if (variant % 4 === 2) { g.fillStyle(dim(body, 0.45), a); g.fillTriangle(x - 2 * s, y - 42.5 * s, x + 2 * s, y - 42.5 * s, x, y - 40 * s); }
  g.fillStyle(bd, a); g.fillEllipse(x + (variant % 2 ? 2 : -2) * s, y - 52.5 * s, 5 * s, 4 * s);
  g.fillStyle(dim(body, 0.3), a); g.fillEllipse(x, y - 50.5 * s, 10 * s, 3 * s);
  // Cracks.
  if (cracks >= 1) {
    g.lineStyle(1.1 * s, 0x2a140c, a);
    g.lineBetween(x - 4 * s, y - 37 * s, x - 1 * s, y - 31 * s); g.lineBetween(x - 1 * s, y - 31 * s, x - 5 * s, y - 25 * s);
    g.lineBetween(x - 1 * s, y - 31 * s, x + 3 * s, y - 29 * s);
  }
  if (cracks >= 2) {
    g.fillStyle(0x2a140c, a); g.fillTriangle(x + 5 * s, y - 38 * s, x + 11 * s, y - 38 * s, x + 9 * s, y - 30 * s);
    g.lineBetween(x + 2 * s, y - 49 * s, x - 1 * s, y - 43 * s);
  }
}

/** A drying rack: a timber frame of three ware boards, each loaded with pale greenware drying in the air. */
export function dryingRack(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w * 1.05, 14, 0.25);
  const x0 = x - w / 2;
  for (const px of [x0, x0 + w - 4]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(px, y - 70, 4, 70); g.fillStyle(TIMBER_LIT, 0.5); g.fillRect(px, y - 70, 1.5, 70); }
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = y - 6 - shelf * 24;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 3, sy, w + 6, 4);
    g.fillStyle(TIMBER, 1); g.fillRect(x0 - 3, sy - 1, w + 6, 3);
    for (let px = x0 + 8; px < x0 + w - 6; px += 11 + rng() * 4) {
      const shapes: PotShape[] = ['jar', 'cup', 'bowl', 'jug', 'vase'];
      const sh = shapes[Math.floor(rng() * shapes.length)];
      const dryness = rng();
      pot(g, px, sy - 1, 8 + rng() * 6, sh, mixC(GREENWARE, GREENWARE_LIT, dryness));
    }
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 4, y - 74, w + 8, 4);
}

/** One saggar: a round fireclay box, seen from the side, its rim showing. */
export function saggar(g: G, x: number, y: number, r: number, c = SAGGAR): void {
  g.fillStyle(dim(c, 0.3), 1); g.fillRect(x - r, y - r * 0.9, r * 2, r * 0.9);
  g.fillStyle(c, 1); g.fillRect(x - r, y - r * 0.9, r * 1.3, r * 0.9);
  g.fillStyle(lit(c, 0.2), 0.7); g.fillRect(x - r * 0.8, y - r * 0.9, r * 0.25, r * 0.9);
  g.fillStyle(dim(c, 0.2), 1); g.fillEllipse(x, y - r * 0.9, r * 2, r * 0.5);
  g.fillStyle(dim(c, 0.5), 1); g.fillEllipse(x, y - r * 0.88, r * 1.6, r * 0.32);
  g.fillStyle(dim(c, 0.25), 1); g.fillEllipse(x, y, r * 2, r * 0.45);
}

/** A wall of stacked saggars — how the court walls its yards: the boxes too cracked to fire in. */
export function saggarWall(g: G, x0: number, y: number, w: number, rows: number, rng: () => number): void {
  shadow(g, x0 + w / 2, y + 2, w, 14, 0.3);
  const r = 11;
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * r;
    for (let x = x0 + r + off; x < x0 + w - r + 1; x += r * 2) {
      const c = rng() < 0.2 ? mixC(SAGGAR, SOOT, 0.3) : rng() < 0.3 ? lit(SAGGAR, 0.08) : SAGGAR;
      saggar(g, x, y - row * r * 0.9, r, c);
    }
  }
  // Moss of glaze-runs and ash on the top course.
  for (let x = x0; x < x0 + w; x += 7) { g.fillStyle(rng() < 0.1 ? CELADON : SOOT_LIT, 0.3); g.fillRect(x, y - rows * r * 0.9 - 2, 4, 2); }
}

/** A tall saggar stack (as stood ready by a kiln door). */
export function saggarStack(g: G, x: number, y: number, n: number, r = 10): void {
  shadow(g, x, y + 1, r * 2.6, r * 0.7, 0.3);
  for (let i = 0; i < n; i++) saggar(g, x + ((i * 7) % 3) - 1, y - i * r * 0.9, r);
}

/**
 * A pug mill: the iron-banded tub the clay is churned in, its sweep-beam out to one side and
 * a circle trodden round it by the donkey that turns it — no donkey: an empty halter hangs from
 * the beam. `x, y` = the tub's foot.
 */
export function pugMill(g: G, x: number, y: number, donkey = false): void {
  g.lineStyle(14, MARL_DARK, 0.4); g.strokeEllipse(x, y, 150, 56);
  shadow(g, x, y + 1, 44, 14);
  lathe(g, x, y, 42, () => 17, TIMBER, { lit: TIMBER_LIT, dark: TIMBER_DARK, inside: SLIP_DARK });
  for (const v of [8, 22, 36]) { g.fillStyle(IRON, 1); g.fillRect(x - 18, y - v, 36, 3); }
  // Clay oozing from the spout at the foot.
  g.fillStyle(SLIP_DARK, 1); g.fillRect(x - 24, y - 12, 8, 7);
  g.fillStyle(MARL, 1); g.fillRoundedRect(x - 40, y - 10, 18, 7, 3);
  // The spindle and the sweep-beam.
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 58, 4, 18);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, y - 58, 74, 5);
  g.fillStyle(TIMBER, 1); g.fillRect(x, y - 59, 74, 3);
  if (donkey) {
    const dx = x + 72, dy = y + 8;
    shadow(g, dx, dy + 1, 40, 10);
    g.fillStyle(0x7a6a5e, 1); g.fillEllipse(dx, dy - 16, 34, 16);
    g.fillRect(dx - 13, dy - 12, 3, 12); g.fillRect(dx + 10, dy - 12, 3, 12);
    g.fillEllipse(dx + 18, dy - 22, 12, 9);
    g.fillStyle(0x5a4a40, 1); g.fillTriangle(dx + 15, dy - 26, dx + 18, dy - 36, dx + 20, dy - 26);
    g.fillStyle(0xe8e0d6, 1); g.fillEllipse(dx + 23, dy - 20, 5, 4);
  } else {
    // An empty halter, hanging.
    g.lineStyle(1.5, 0x5a3a24, 1); g.lineBetween(x + 70, y - 56, x + 70, y - 36);
    g.strokeEllipse(x + 70, y - 30, 10, 12);
  }
}

/**
 * The Shard Ruck: the heap of rejects — soldiers that rang false at the tap, broken where they
 * stood and thrown on the pile. Shards, an arm with a spear, a head looking up out of it.
 */
export function shardRuck(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 170 * s, 36 * s, 0.35);
  for (let layer = 0; layer < 5; layer++) {
    const ry = 30 * s * (1 - layer / 5);
    const rx = 80 * s * (1 - layer / 6);
    for (let i = 0; i < 26 - layer * 3; i++) {
      const a = rng() * Math.PI;
      const sx = x + Math.cos(a) * rx * (0.3 + rng() * 0.7) * (rng() < 0.5 ? -1 : 1);
      const sy = y - layer * 10 * s - Math.sin(a) * ry * 0.5 * rng();
      const k = rng();
      sherd(g, sx, sy, (5 + rng() * 6) * s, k < 0.75 ? mixC(TERRA, TERRA_DARK, rng() * 0.6) : k < 0.9 ? BISQUE_DARK : TERRA_LIT, rng);
    }
  }
  // An arm still clasping a spear, a head, a boot.
  g.fillStyle(TERRA_DARK, 1); g.fillEllipse(x + 24 * s, y - 30 * s, 8 * s, 18 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 22 * s, y - 72 * s, 2 * s, 46 * s);
  g.fillStyle(IRON_LIT, 1); g.fillTriangle(x + 21 * s, y - 72 * s, x + 25 * s, y - 72 * s, x + 23 * s, y - 80 * s);
  g.fillStyle(TERRA, 1); g.fillEllipse(x - 28 * s, y - 34 * s, 14 * s, 15 * s);
  g.fillStyle(dim(TERRA, 0.5), 1); g.fillRect(x - 32 * s, y - 36 * s, 3 * s, 1.5 * s); g.fillRect(x - 26 * s, y - 36 * s, 3 * s, 1.5 * s);
  g.fillStyle(TERRA_DARK, 1); g.fillEllipse(x - 28 * s, y - 42 * s, 8 * s, 5 * s);
  g.lineStyle(1.2, 0x2a140c, 1); g.lineBetween(x - 30 * s, y - 40 * s, x - 24 * s, y - 30 * s);
  g.fillStyle(dim(TERRA, 0.3), 1); g.fillEllipse(x + 50 * s, y - 8 * s, 14 * s, 7 * s);
}

/** A glaze vat: a half-barrel of glaze, a dipping ladle hooked on the rim, runs down the staves. */
export function glazeVat(g: G, x: number, y: number, c: number): void {
  shadow(g, x, y + 1, 46, 13);
  lathe(g, x, y, 26, (v) => 19 - v * 2 + Math.sin(v * Math.PI) * 2, TIMBER, { lit: TIMBER_LIT, dark: TIMBER_DARK, mouth: false });
  for (const v of [5, 18]) { g.fillStyle(IRON, 1); g.fillRect(x - 20, y - v, 40, 2.5); }
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - 26, 36, 11);
  g.fillStyle(c, 1); g.fillEllipse(x, y - 25.5, 31, 8.5);
  g.fillStyle(lit(c, 0.4), 0.6); g.fillEllipse(x - 6, y - 27, 10, 2.5);
  for (const dx of [-12, -3, 9]) { g.fillStyle(c, 0.9); g.fillRoundedRect(x + dx, y - 24, 3, 6 + ((dx + 20) % 7), 1.5); }
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + 10, y - 27, x + 22, y - 44);
  g.fillStyle(IRON, 1); g.fillEllipse(x + 8, y - 25, 9, 5);
}

/**
 * The plaster moulds of the casting floor, seen from above on a bench: white blocks strapped
 * together, each with a dark pouring hole, slip dribbled down their sides.
 */
export function mouldBench(g: G, x: number, y: number, n: number, rng: () => number): void {
  const w = n * 30 + 14;
  shadow(g, x, y + 2, w * 1.05, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 4, y - 18, 4, 18); g.fillRect(x + w / 2 - 8, y - 18, 4, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2, y - 22, w, 5);
  for (let i = 0; i < n; i++) {
    const mx = x - w / 2 + 10 + i * 30, my = y - 22;
    const mh = 20 + rng() * 10;
    g.fillStyle(PLASTER_DARK, 1); g.fillRect(mx, my - mh, 24, mh);
    g.fillStyle(PLASTER, 1); g.fillRect(mx, my - mh, 17, mh);
    g.fillStyle(0xffffff, 0.4); g.fillRect(mx + 2, my - mh, 3, mh);
    g.lineStyle(1, PLASTER_DARK, 1); g.lineBetween(mx + 12, my - mh, mx + 12, my);
    g.fillStyle(0x6a4a3a, 1); g.fillRect(mx - 1, my - mh * 0.55, 26, 2.5);
    g.fillStyle(PLASTER_DARK, 1); g.fillEllipse(mx + 12, my - mh, 18, 6);
    g.fillStyle(SLIP_DEEP, 1); g.fillEllipse(mx + 12, my - mh, 8, 3);
    g.fillStyle(SLIP, 0.9); g.fillRoundedRect(mx + 8, my - mh, 3, 8 + rng() * 6, 1.5);
  }
}

/**
 * The casting floor drawn into the ground: a skim of dried slip over flags, with the outlines of
 * moulds set into it (a jug, a figure, a vase), white-rimmed and cocoa-dark inside.
 */
export function castingFloor(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(PLASTER_DARK, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 10);
  g.fillStyle(mixC(PLASTER, SLIP_LIT, 0.35), 1); g.fillRoundedRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8, 8);
  for (let i = 0; i < (r.w * r.h) / 500; i++) {
    g.fillStyle(rng() < 0.5 ? SLIP : PLASTER, 0.3); g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 6 + rng() * 16, 3 + rng() * 6);
  }
  for (let i = 0; i < 4; i++) {
    const mx = r.x + 40 + i * ((r.w - 80) / 3), my = r.y + r.h / 2 + (i % 2 ? -12 : 12);
    g.fillStyle(PLASTER, 1); g.fillRoundedRect(mx - 18, my - 26, 36, 52, 8);
    g.fillStyle(SLIP_DARK, 1);
    if (i % 2) { g.fillEllipse(mx, my + 6, 20, 26); g.fillRect(mx - 4, my - 18, 8, 12); }
    else { g.fillCircle(mx, my - 12, 6); g.fillEllipse(mx, my + 6, 16, 26); }
  }
}

/**
 * A greenware bench, where Granny Sgraffito scratches through the slip. A low table, a leather-
 * hard jar mid-carving with lines scratched round it, a pot of tools.
 */
export function sgraffitoBench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, y - 16, 4, 16); g.fillRect(x + 26, y - 16, 4, 16);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 34, y - 20, 68, 5);
  pot(g, x - 6, y - 20, 22, 'jar', mixC(SLIP_DARK, MARL, 0.4));
  // Scratched lines through the dark slip to the pale body beneath: a verse going round.
  for (let k = 0; k < 4; k++) {
    const ly = y - 26 - k * 4;
    for (let i = 0; i < 5; i++) { g.lineStyle(0.8, BISQUE_LIT, 0.9); g.lineBetween(x - 13 + i * 3.6, ly, x - 11.5 + i * 3.6, ly - 1.5); }
  }
  g.fillStyle(TERRA_DARK, 1); g.fillRect(x + 14, y - 30, 10, 10);
  for (let i = 0; i < 3; i++) { g.lineStyle(1.2, IRON_LIT, 1); g.lineBetween(x + 16 + i * 3, y - 30, x + 15 + i * 4, y - 40); }
}

/** A heap of raw clay blocks wrapped in wet sacking, ready for the wheels. */
export function clayStack(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 1, 50, 12);
  for (let i = 0; i < 6; i++) {
    const bx = x - 18 + (i % 3) * 13 + (i > 2 ? 6 : 0), by = y - (i > 2 ? 13 : 2);
    g.fillStyle(MARL_DARK, 1); g.fillRoundedRect(bx - 6, by - 11, 13, 12, 3);
    g.fillStyle(rng() < 0.5 ? MARL : MARL_LIT, 1); g.fillRoundedRect(bx - 6, by - 12, 11, 10, 3);
  }
  g.fillStyle(0x8a7a5a, 0.85); g.fillRoundedRect(x - 26, y - 30, 30, 10, 4);
  g.lineStyle(0.8, 0x5a4a34, 0.8); for (let i = 0; i < 5; i++) g.lineBetween(x - 24 + i * 6, y - 30, x - 22 + i * 6, y - 20);
}

/** A kiln front for the arena (the gimmick's kilns): a brick arch and an iron door; `heat` 0..1 glows it. */
export function kilnFront(g: G, x: number, y: number, w: number, down: boolean, heat: number): void {
  const h = 44;
  const y0 = down ? y : y - h;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - w / 2 - 8, y0, w + 16, h);
  g.fillStyle(BRICK, 1); g.fillRect(x - w / 2 - 6, y0 + 2, w + 12, h - 4);
  for (let yy = 4; yy < h - 2; yy += 6) { g.lineStyle(0.7, BRICK_DARK, 0.7); g.lineBetween(x - w / 2 - 6, y0 + yy, x + w / 2 + 6, y0 + yy); }
  const mouthY = down ? y0 + h - 6 : y0 + 6;
  g.fillStyle(SOOT, 1); g.fillRect(x - w / 2, down ? y0 + 10 : y0 + 6, w, h - 16);
  const c = mixC(0x3a1a10, FIRE, heat);
  g.fillStyle(c, 1); g.fillRect(x - w / 2 + 4, down ? y0 + 14 : y0 + 10, w - 8, h - 24);
  if (heat > 0.4) { g.fillStyle(FIRE_LIT, (heat - 0.4) * 1.5); g.fillRect(x - w / 2 + 10, down ? y0 + 18 : y0 + 14, w - 20, h - 32); }
  g.fillStyle(IRON, 1); g.fillRect(x - w / 2 - 2, mouthY - 2, w + 4, 4);
  g.fillStyle(IRON_LIT, 0.8); g.fillRect(x - w / 2 - 2, mouthY - 2, w + 4, 1.2);
}
