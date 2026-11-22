import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Rect } from '../../../../IslesTypes';
import {
  BARK, BARK_DARK, BARK_LIT, BLACKFLAME, BLACKFLAME_EDGE, BLACKFLAME_LIT, CANDLE, CANDLE_LIT, CLOTH, CLOTH_SHEEN,
  CRESCENT, DUSK, DUSK_DARK, DUSK_LIT, FOXFIRE, FUNGUS, FUNGUS_DARK, GREY, HEART, HEART_DARK, HEART_LIT, IRON,
  IRON_LIT, LEAF, LEAF_LIT, MERE, MERE_LIT, MERE_SHEEN, MOON, MOON_DIM, MOSS, MOSS_LIT, MOULD, MOULD_DARK, MOULD_LIT,
  STONE, STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, VENOM, VENOM_DARK,
} from './palette';

/**
 * Umbral set pieces — the shapes of a town that has never seen the sun. Nothing here is built;
 * everything is *grown into*: houses are hollowed out of living trunks, the roads run between
 * stilt-roots, the Prince's hall is the biggest tree of all. Every light source is drawn as its
 * opposite — the black lamps throw a pool of deeper dark — and the eye goes to the two things that
 * do not belong: the pale fungus that glows on its own, and the odd honey-yellow slit of a real
 * candle behind a shutter.
 */

// ── Small helpers ────────────────────────────────────────────────────

/** A bracket of shelf fungus on bark: three stacked half-discs, gills underneath. */
export function fungusShelf(g: G, x: number, y: number, s: number, flip = false): void {
  const d = flip ? -1 : 1;
  for (let i = 0; i < 3; i++) {
    const w = (14 - i * 3.5) * s, yy = y - i * 4.5 * s, xx = x + d * i * 1.5 * s;
    g.fillStyle(FUNGUS_DARK, 1); g.fillEllipse(xx + d * 2 * s, yy + 1.2 * s, w, 4.5 * s);
    g.fillStyle(FUNGUS, 1); g.fillEllipse(xx + d * 2 * s, yy, w, 3.6 * s);
    g.lineStyle(0.8, FUNGUS_DARK, 0.7);
    for (let k = -2; k <= 2; k++) g.lineBetween(xx + d * 2 * s + k * w * 0.16, yy + 0.6 * s, xx + d * 2 * s + k * w * 0.2, yy + 2 * s);
  }
  glow(g, x + d * 4 * s, y - 4 * s, 10 * s, FOXFIRE, 0.03, 2);
}

/** A shutter with a spy-hole: two leaves of dark plank, the hole a pale dot (or a candle slit). */
export function shutter(g: G, x: number, y: number, w: number, h: number, candle = false): void {
  g.fillStyle(HEART_DARK, 1); g.fillRect(x - w / 2 - 2, y - 2, w + 4, h + 4);
  if (candle) {
    // A sliver of forbidden light where the leaves don't meet.
    glow(g, x, y + h / 2, w * 0.9, CANDLE, 0.05, 3);
    g.fillStyle(CANDLE, 0.9); g.fillRect(x - 1, y + 2, 2, h - 4);
    g.fillStyle(CANDLE_LIT, 0.7); g.fillRect(x - 0.5, y + h * 0.3, 1, h * 0.3);
  }
  for (const k of [-1, 1]) {
    const lx = x + (k < 0 ? -w / 2 : 1), lw = w / 2 - 1;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(lx, y, lw, h);
    g.lineStyle(1, dim(TIMBER, 0.2), 1);
    for (let yy = y + 4; yy < y + h; yy += 5) g.lineBetween(lx + 1, yy, lx + lw - 1, yy);
  }
  // The informer's eye-hole.
  g.fillStyle(0x000000, 1); g.fillCircle(x + w * 0.22, y + h * 0.35, 1.6);
}

/** Mangrove stilt-roots arching out of the ground round a trunk's foot. */
export function stiltRoots(g: G, x: number, y: number, r: number, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const reach = r * (1.1 + rng() * 0.7) * side;
    const top = y - r * (0.9 + rng() * 0.8);
    const bx = x + side * r * 0.3 * (0.5 + rng());
    const fx = x + reach * (0.6 + i / n * 0.6);
    const fy = y + 4 + rng() * 6;
    // An arched root: up out of the trunk, over, and down into the mud.
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const px = bx + (fx - bx) * u;
      const py = top + (fy - top) * u - Math.sin(u * Math.PI) * r * 0.35;
      pts.push([px, py]);
    }
    g.lineStyle(7 - (i % 3), BARK_DARK, 1);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1] + 2); for (const p of pts) g.lineTo(p[0], p[1] + 2); g.strokePath();
    g.lineStyle(5 - (i % 3), BARK, 1);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.strokePath();
    g.lineStyle(1.2, BARK_LIT, 0.6);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1] - 1.5); for (const p of pts.slice(0, 5)) g.lineTo(p[0], p[1] - 1.5); g.strokePath();
    // Where it goes into the mire: a ring of wet.
    g.fillStyle(MOULD_DARK, 0.7); g.fillEllipse(fx, fy + 1, 12, 4);
  }
}

/** A drip of lampblack hanging from something: a bead on a thread. */
function drip(g: G, x: number, y: number, len: number): void {
  g.lineStyle(1, BLACKFLAME, 0.9); g.lineBetween(x, y, x, y + len);
  g.fillStyle(BLACKFLAME, 1); g.fillCircle(x, y + len + 1.5, 1.8);
}

// ── Lamps ────────────────────────────────────────────────────────────

/**
 * A black flame: a teardrop of lampblack with a bruise-violet rim, ringed by a halo that is
 * *darker* than the night round it. `t` animates the lick (seconds, or 0 for a still flame).
 */
export function blackFlame(g: G, x: number, y: number, s: number, t: number): void {
  // The anti-glow: concentric shadow, darkest near the flame.
  for (let k = 4; k >= 1; k--) { g.fillStyle(0x05020a, 0.07); g.fillCircle(x, y - 4 * s, (8 + k * 9) * s); }
  const sway = Math.sin(t * 6.3) * 1.6 * s, lick = 1 + Math.sin(t * 9.1) * 0.12;
  g.fillStyle(BLACKFLAME_EDGE, 0.55);
  g.fillTriangle(x - 5.5 * s, y, x + 5.5 * s, y, x + sway * 1.4, y - 17 * s * lick);
  g.fillCircle(x, y - 1 * s, 5.6 * s);
  g.fillStyle(BLACKFLAME, 1);
  g.fillTriangle(x - 4 * s, y, x + 4 * s, y, x + sway, y - 14 * s * lick);
  g.fillCircle(x, y - 1 * s, 4.2 * s);
  // A violet lick at the tip, and the wick.
  g.fillStyle(BLACKFLAME_LIT, 0.65); g.fillCircle(x + sway, y - 13 * s * lick, 1.4 * s);
  g.lineStyle(1, BLACKFLAME_LIT, 0.4); g.lineBetween(x - 3 * s, y - 2 * s, x + sway * 0.8, y - 11 * s * lick);
  g.fillStyle(0x000000, 1); g.fillRect(x - 0.6 * s, y - 1 * s, 1.2 * s, 3 * s);
}

/**
 * A black lamp on a crook-post: a forged iron shepherd's crook, a hanging cage, a lampblack
 * reservoir that weeps down its chains. The flame itself is animated separately (`blackFlame`
 * at the returned point), so the piece can be baked.
 */
export function blackLampPost(g: G, x: number, y: number, s = 1, flip = false): { x: number; y: number } {
  const d = flip ? -1 : 1;
  shadow(g, x, y, 26 * s, 8 * s, 0.4);
  // Footing: a collar of roots strapped with iron.
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(x, y - 2 * s, 16 * s, 7 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 6 * s, y - 8 * s, 12 * s, 6 * s);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 6 * s, y - 8 * s, 12 * s, 1.5 * s);
  // The post, twisted.
  const top = y - 78 * s;
  g.fillStyle(IRON, 1); g.fillRect(x - 2.2 * s, top, 4.4 * s, y - 8 * s - top);
  g.lineStyle(1, IRON_LIT, 0.6);
  for (let yy = top + 4 * s; yy < y - 10 * s; yy += 6 * s) g.lineBetween(x - 2 * s, yy, x + 2 * s, yy + 3 * s);
  // The crook.
  g.lineStyle(3.5 * s, IRON, 1);
  g.beginPath(); g.arc(x + d * 9 * s, top, 9 * s, flip ? 0 : Math.PI, flip ? -Math.PI : 0, flip); g.strokePath();
  g.lineStyle(1, IRON_LIT, 0.5);
  g.beginPath(); g.arc(x + d * 9 * s, top - 1, 9 * s, flip ? -0.2 : Math.PI + 0.2, flip ? -Math.PI * 0.6 : -0.6, flip); g.strokePath();
  // The hanging cage.
  const cx = x + d * 18 * s, cy = top + 14 * s;
  g.lineStyle(1, IRON, 1); g.lineBetween(cx, top + 1, cx, cy - 8 * s);
  g.fillStyle(IRON, 1); g.fillTriangle(cx - 6 * s, cy - 6 * s, cx + 6 * s, cy - 6 * s, cx, cy - 11 * s);
  g.lineStyle(1.2 * s, IRON, 1);
  for (const k of [-1, -0.35, 0.35, 1]) g.lineBetween(cx + k * 6 * s, cy - 6 * s, cx + k * 5 * s, cy + 8 * s);
  g.fillStyle(IRON, 1); g.fillRect(cx - 6 * s, cy + 7 * s, 12 * s, 3 * s);
  // Lampblack weeping off the cage floor.
  drip(g, cx - 3 * s, cy + 10 * s, 5 * s);
  drip(g, cx + 4 * s, cy + 10 * s, 8 * s);
  return { x: cx, y: cy + 6 * s };
}

// ── Trees and houses ─────────────────────────────────────────────────

/**
 * A canopy trunk: a column of near-black bark climbing out of sight, ridged, bracketed with
 * fungus, its foot a spider of stilt-roots. `h` is how much of it shows before the leaves.
 */
export function canopyTrunk(g: G, x: number, y: number, r: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, r * 3.4, r * 0.9, 0.45);
  stiltRoots(g, x, y, r, 6, rng);
  const top = y - h;
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - r - 2, top, r * 2 + 4, h - r * 0.4);
  g.fillStyle(BARK, 1); g.fillRect(x - r, top, r * 2, h - r * 0.4);
  // Flare at the foot.
  g.fillStyle(BARK, 1); g.fillTriangle(x - r * 1.5, y - r * 0.2, x - r, y - r * 1.6, x - r, y - r * 0.2);
  g.fillTriangle(x + r * 1.5, y - r * 0.2, x + r, y - r * 1.6, x + r, y - r * 0.2);
  g.fillEllipse(x, y - r * 0.4, r * 3, r * 0.8);
  // Bark ridges.
  for (let i = 0; i < 6; i++) {
    const rx = x - r + 4 + (i / 5) * (r * 2 - 8);
    g.lineStyle(1.5, i % 2 ? BARK_DARK : BARK_LIT, i % 2 ? 0.8 : 0.35);
    g.beginPath(); g.moveTo(rx, top);
    for (let yy = top; yy < y - r * 0.6; yy += 14) g.lineTo(rx + Math.sin(yy * 0.05 + i) * 2.5, yy);
    g.strokePath();
  }
  // Moss on the north side, fungus up the trunk.
  g.fillStyle(MOSS, 0.6); g.fillRect(x - r, top, r * 0.5, h - r * 0.6);
  for (let i = 0; i < 3; i++) fungusShelf(g, x + (i % 2 ? r * 0.85 : -r * 0.85), y - h * (0.25 + i * 0.22), 0.8 + rng() * 0.4, i % 2 === 0);
  // Where it goes up into the dark: the leaf ceiling's underside.
  g.fillStyle(LEAF, 1); g.fillEllipse(x, top, r * 4.2, r * 1.2);
  g.fillStyle(LEAF_LIT, 0.4); g.fillEllipse(x - r * 0.6, top - 2, r * 2, r * 0.5);
  for (let i = 0; i < 5; i++) { g.lineStyle(1, LEAF_LIT, 0.5); g.lineBetween(x - r * 1.6 + i * r * 0.8, top + r * 0.3, x - r * 1.6 + i * r * 0.8 + 2, top + r * 0.3 + 14 + i * 3); }
}

export interface HollowOpts {
  /** A candle lit behind one shutter — the forbidden warm light. */
  candle?: boolean;
  /** Draw a rope ladder to a second door up the trunk. */
  ladder?: boolean;
  /** A grey cloth tied on the door: a passed-over household. */
  grey?: boolean;
  /** A sign hung over the door (drawn by the caller after). */
  wide?: boolean;
}

/**
 * A house grown inside a hollow tree: a fat, buttressed trunk with the heartwood cut back into
 * a round-topped doorway, two shuttered windows bored into the bark, a stovepipe poking out
 * through a knot, shelf fungus, and the trunk running on up into the leaves. Returns the door.
 */
export function hollowHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, o: HollowOpts = {}): { x: number; y: number } {
  const r = w / 2;
  shadow(g, x, y + 4, w * 1.5, w * 0.35, 0.45);
  stiltRoots(g, x, y, r * 0.55, 5, rng);
  // The trunk: a bulging barrel narrowing upward.
  const top = y - h;
  g.fillStyle(BARK_DARK, 1);
  g.fillEllipse(x, y - h * 0.35, w + 8, h * 0.95);
  g.fillRect(x - r * 0.72 - 3, top - 30, r * 1.44 + 6, h * 0.5);
  g.fillStyle(BARK, 1);
  g.fillEllipse(x, y - h * 0.35, w, h * 0.9);
  g.fillRect(x - r * 0.72, top - 30, r * 1.44, h * 0.5);
  // Ridges.
  for (let i = 0; i < 7; i++) {
    const rx = x - r * 0.85 + (i / 6) * r * 1.7;
    g.lineStyle(1.4, i % 2 ? BARK_DARK : BARK_LIT, i % 2 ? 0.7 : 0.3);
    g.beginPath(); g.moveTo(rx, y - 6);
    for (let yy = y - 6; yy > top - 30; yy -= 12) g.lineTo(rx + Math.sin(yy * 0.07 + i * 2) * 2 - (rx - x) * (1 - (yy - top) / h) * 0.25, yy);
    g.strokePath();
  }
  // The doorway: cut into the heartwood.
  const dw = Math.min(30, w * 0.34), dh = Math.min(46, h * 0.42);
  g.fillStyle(HEART_DARK, 1); g.fillEllipse(x, y - dh + 6, dw + 10, dw + 6); g.fillRect(x - dw / 2 - 5, y - dh + 6, dw + 10, dh - 6);
  g.fillStyle(HEART, 1); g.fillEllipse(x, y - dh + 6, dw + 6, dw + 2); g.fillRect(x - dw / 2 - 3, y - dh + 6, dw + 6, dh - 6);
  g.lineStyle(1, HEART_LIT, 0.5);
  for (let k = 0; k < 3; k++) g.strokeEllipse(x, y - dh + 6, dw + 6 - k * 3, dw + 2 - k * 3);
  // The door: planks and a black-iron ring.
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - dh + 7, dw, dw - 4); g.fillRect(x - dw / 2, y - dh + 7, dw, dh - 7);
  g.lineStyle(1, dim(TIMBER, 0.1), 1);
  for (let k = 1; k < 4; k++) g.lineBetween(x - dw / 2 + (k * dw) / 4, y - dh + 2, x - dw / 2 + (k * dw) / 4, y);
  g.lineStyle(1.5, IRON_LIT, 0.9); g.strokeCircle(x + dw * 0.25, y - dh * 0.45, 2.6);
  if (o.grey) {
    // A grey rag tied on the ring: the house was passed over.
    g.fillStyle(GREY, 0.95); g.fillTriangle(x + dw * 0.25, y - dh * 0.45, x + dw * 0.25 + 4, y - dh * 0.1, x + dw * 0.25 - 4, y - dh * 0.15);
  }
  // Doorstep: a slab of root.
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(x, y - 1, dw + 20, 7);
  g.fillStyle(BARK_LIT, 0.5); g.fillEllipse(x, y - 2, dw + 14, 3);
  // Two bored windows, shuttered; one may hide a candle.
  const wy = y - h * 0.62;
  shutter(g, x - r * 0.48, wy, 13, 16, !!o.candle);
  shutter(g, x + r * 0.48, wy - 8, 12, 15);
  // Stovepipe through a knot.
  const px = x + r * 0.62, py = y - h * 0.86;
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(px, py, 14, 10);
  g.fillStyle(IRON, 1); g.fillRect(px - 3, py - 22, 6, 22);
  g.fillStyle(IRON_LIT, 1); g.fillRect(px - 4, py - 24, 8, 3);
  // Fungus up the bark.
  fungusShelf(g, x - r * 0.8, y - h * 0.32, 0.9, true);
  fungusShelf(g, x + r * 0.84, y - h * 0.45, 0.7);
  if (rng() < 0.6) fungusShelf(g, x - r * 0.55, y - h * 0.92, 0.7, true);
  // A rope ladder to a loft door up the trunk.
  if (o.ladder) {
    const lx = x - r * 0.25, ly0 = top + 4, ly1 = y - dh - 4;
    g.fillStyle(HEART_DARK, 1); g.fillEllipse(lx, ly0 - 4, 14, 16);
    g.lineStyle(1.2, TIMBER_LIT, 1); g.lineBetween(lx - 5, ly0, lx - 6, ly1); g.lineBetween(lx + 5, ly0, lx + 6, ly1);
    for (let yy = ly0 + 6; yy < ly1; yy += 7) g.lineBetween(lx - 5.5, yy, lx + 5.5, yy);
  }
  // The trunk on up into the leaves.
  g.fillStyle(LEAF, 1); g.fillEllipse(x, top - 30, w * 1.5, 30);
  g.fillStyle(LEAF_LIT, 0.35); g.fillEllipse(x - w * 0.2, top - 34, w * 0.8, 12);
  return { x, y: y + 14 };
}

// ── The Night-Dial ───────────────────────────────────────────────────

/**
 * The great night-dial on the square: a disc of night-stone laid in the ground, its hour-ring
 * marked not with numbers but with the moon's faces, new to full and back. The Prince's
 * astronomers say it tells true time. It has never shown anything but night.
 */
export function nightDialFace(g: G, cx: number, cy: number, R: number, squash: number): void {
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(cx, cy + 6, R * 2 + 26, (R * 2 + 26) * squash);
  g.fillStyle(STONE, 1); g.fillEllipse(cx, cy, R * 2 + 18, (R * 2 + 18) * squash);
  g.fillStyle(DUSK_DARK, 1); g.fillEllipse(cx, cy, R * 2, R * 2 * squash);
  // A star chart inlaid in silver.
  for (let i = 0; i < 70; i++) {
    const a = i * 2.399, d = Math.sqrt((i * 37) % 100 / 100) * R * 0.86;
    g.fillStyle(MOON, 0.25 + ((i * 13) % 10) / 20); g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * squash, i % 9 === 0 ? 1.6 : 0.9);
  }
  g.lineStyle(0.8, MOON_DIM, 0.4);
  for (const [a, b] of [[3, 17], [17, 29], [29, 41], [8, 22], [22, 51], [12, 33]]) {
    const pa = { x: cx + Math.cos(a * 2.399) * Math.sqrt((a * 37) % 100 / 100) * R * 0.86, y: cy + Math.sin(a * 2.399) * Math.sqrt((a * 37) % 100 / 100) * R * 0.86 * squash };
    const pb = { x: cx + Math.cos(b * 2.399) * Math.sqrt((b * 37) % 100 / 100) * R * 0.86, y: cy + Math.sin(b * 2.399) * Math.sqrt((b * 37) % 100 / 100) * R * 0.86 * squash };
    g.lineBetween(pa.x, pa.y, pb.x, pb.y);
  }
  // The hour-ring: twelve moon faces.
  g.lineStyle(2, STONE_LIT, 0.6); g.strokeEllipse(cx, cy, R * 1.72, R * 1.72 * squash);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const mx = cx + Math.cos(a) * R * 0.93, my = cy + Math.sin(a) * R * 0.93 * squash;
    const ph = i / 12;
    g.fillStyle(MOON, 0.9); g.fillEllipse(mx, my, 11, 11 * squash + 2);
    // The dark bite of the phase.
    const off = Math.cos(ph * Math.PI * 2) * 10;
    g.fillStyle(DUSK_DARK, 1); g.fillEllipse(mx + off, my, 11, 11 * squash + 2);
    g.lineStyle(1, STONE_LIT, 0.8); g.lineBetween(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78 * squash, cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84 * squash);
  }
  // Rays from the centre, faint.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.lineStyle(0.6, MOON_DIM, 0.18);
    g.lineBetween(cx, cy, cx + Math.cos(a) * R * 0.76, cy + Math.sin(a) * R * 0.76 * squash);
  }
}

/** The moon-hand of the night-dial: a pale wedge of moonshadow that turns (animated). */
export function nightDialHand(g: G, cx: number, cy: number, R: number, a: number, squash: number): void {
  const len = R * 0.86;
  g.fillStyle(MOON, 0.12);
  g.fillTriangle(cx + Math.cos(a - Math.PI / 2) * 9, cy + Math.sin(a - Math.PI / 2) * 9 * squash, cx + Math.cos(a + Math.PI / 2) * 9, cy + Math.sin(a + Math.PI / 2) * 9 * squash, cx + Math.cos(a) * len, cy + Math.sin(a) * len * squash);
  g.lineStyle(1.5, MOON, 0.35); g.lineBetween(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len * squash);
}

/** The gnomon: a tall blade of black iron with a crescent at its tip, set in a plinth. */
export function dialGnomon(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y, 50 * s, 14 * s, 0.4);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 16 * s, y - 12 * s, 32 * s, 12 * s);
  g.fillStyle(STONE, 1); g.fillRect(x - 15 * s, y - 13 * s, 30 * s, 8 * s);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 15 * s, y - 13 * s, 30 * s, 2 * s);
  // The blade: a tall right-angled triangle.
  g.fillStyle(IRON, 1); g.fillTriangle(x - 4 * s, y - 13 * s, x + 4 * s, y - 13 * s, x - 3 * s, y - 92 * s);
  g.fillStyle(IRON_LIT, 1); g.fillTriangle(x - 4 * s, y - 13 * s, x - 2 * s, y - 13 * s, x - 3 * s, y - 92 * s);
  // The crescent finial.
  g.fillStyle(CRESCENT, 1); g.fillCircle(x - 3 * s, y - 100 * s, 8 * s);
  g.fillStyle(IRON, 1); g.fillCircle(x + 0 * s, y - 102 * s, 7 * s);
  glow(g, x - 6 * s, y - 100 * s, 16 * s, MOON, 0.04, 3);
}

// ── The looms ────────────────────────────────────────────────────────

/**
 * A shadow-weavers' loom: a great timber frame, warp threads strung tight, and a length of
 * shadow-cloth coming off it — black, with a violet sheen that slides when you move. Under the
 * loom the weavers' own shadows are drawn up out of the floor in threads.
 */
export function shadowLoom(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = w * 0.8;
  shadow(g, x, y + 2, w * 1.2, 20, 0.4);
  const x0 = x - w / 2, top = y - h;
  // Shadows drawn up from the floor into the warp.
  for (let i = 0; i < 9; i++) {
    const fx = x0 + 14 + (i / 8) * (w - 28);
    g.lineStyle(1.4, CLOTH, 0.7);
    g.beginPath(); g.moveTo(fx + Math.sin(i) * 10, y + 12);
    g.lineTo(fx + Math.sin(i * 2) * 6, y - 8); g.lineTo(fx, y - 20); g.strokePath();
  }
  g.fillStyle(CLOTH, 0.5); g.fillEllipse(x, y + 10, w * 0.8, 12);
  // The frame: two uprights, the breast beam, the castle on top.
  for (const k of [0, 1]) {
    const ux = k ? x0 + w - 10 : x0;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(ux, top, 10, h);
    g.fillStyle(TIMBER, 1); g.fillRect(ux + 1, top, 7, h);
    g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(ux + 1, top, 2, h);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 6, top - 10, w + 12, 12);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 - 6, top - 10, w + 12, 8);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 + 6, y - h * 0.32, w - 12, 8);
  // Warp threads, top to the breast beam.
  g.lineStyle(0.8, CLOTH_SHEEN, 0.8);
  for (let k = 0; k < 22; k++) { const tx = x0 + 14 + (k / 21) * (w - 28); g.lineBetween(tx, top + 2, tx, y - h * 0.32); }
  // The cloth: woven upward from the breast beam, the newest rows at its top edge.
  const cy0 = y - h * 0.32, cy1 = top + h * 0.35;
  g.fillStyle(CLOTH, 1); g.fillRect(x0 + 12, cy1, w - 24, cy0 - cy1);
  for (let yy = cy1 + 3; yy < cy0; yy += 4) { g.lineStyle(1, mixC(CLOTH, CLOTH_SHEEN, 0.3 + rng() * 0.3), 0.6); g.lineBetween(x0 + 12, yy, x0 + w - 12, yy); }
  // The sheen: a diagonal sweep of violet.
  g.fillStyle(CLOTH_SHEEN, 0.28); g.fillTriangle(x0 + 12, cy0, x0 + w * 0.4, cy1, x0 + w * 0.55, cy1);
  g.fillStyle(CLOTH_SHEEN, 0.18); g.fillTriangle(x0 + 12, cy0, x0 + w * 0.55, cy1, x0 + w * 0.3, cy0);
  // The shuttle resting on the newest row, trailing black thread.
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x0 + w * 0.68, cy1 - 2, 22, 6);
  g.fillStyle(CLOTH, 1); g.fillCircle(x0 + w * 0.68, cy1 - 2, 2);
  // The heddles: a row of hanging cords with weights.
  for (let k = 0; k < 6; k++) {
    const hx = x0 + 20 + k * (w - 40) / 5;
    g.lineStyle(1, TIMBER_LIT, 0.7); g.lineBetween(hx, top + 2, hx, top + 18);
    g.fillStyle(IRON, 1); g.fillCircle(hx, top + 20, 2.4);
  }
  // The cloth beam rolling it up under the loom.
  g.fillStyle(CLOTH, 1); g.fillEllipse(x, y - 8, w - 20, 14);
  g.fillStyle(CLOTH_SHEEN, 0.4); g.fillEllipse(x, y - 11, w - 30, 4);
  // A weaver's bench.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w * 0.3, y + 6, w * 0.6, 5);
  g.fillRect(x - w * 0.27, y + 6, 3, 10); g.fillRect(x + w * 0.27 - 3, y + 6, 3, 10);
}

/** A drying frame hung with bolts of shadow-cloth, fringes stirring (`t` seconds, 0 = still). */
export function clothRack(g: G, x: number, y: number, w: number, t: number): void {
  const h = 62;
  const x0 = x - w / 2;
  if (t === 0) {
    shadow(g, x, y + 2, w * 1.1, 12, 0.35);
    for (const ux of [x0, x0 + w]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(ux - 2.5, y - h, 5, h); }
    g.fillStyle(TIMBER, 1); g.fillRect(x0 - 6, y - h - 4, w + 12, 5);
  }
  // The cloths: hung over the pole, the ends stirring in a wind that is not there.
  const n = Math.max(2, Math.round(w / 34));
  for (let i = 0; i < n; i++) {
    const cx = x0 + 8 + (i + 0.5) * ((w - 16) / n), cw = (w - 16) / n - 6;
    const sway = t ? Math.sin(t * 1.3 + i * 1.7) * 3 : 0;
    const len = 38 + ((i * 13) % 12);
    if (t !== 0) {
      // Only the moving hem is animated.
      for (let k = 0; k < 5; k++) { g.lineStyle(1, CLOTH, 0.8); g.lineBetween(cx - cw / 2 + (k + 0.5) * cw / 5 + sway, y - h + len, cx - cw / 2 + (k + 0.5) * cw / 5 + sway * 1.6, y - h + len + 6); }
      continue;
    }
    g.fillStyle(CLOTH, 1); g.fillRect(cx - cw / 2, y - h - 2, cw, len);
    g.fillStyle(CLOTH_SHEEN, 0.35); g.fillRect(cx - cw / 2 + 2, y - h, 3, len - 4);
    g.lineStyle(1, CLOTH_SHEEN, 0.25); g.lineBetween(cx - cw / 2, y - h + len * 0.5, cx + cw / 2, y - h + len * 0.55);
  }
}

// ── The Umbral Bole: Prince Dusk's hall ───────────────────────────────

/**
 * The Umbral Bole — the biggest tree on Fangmire, hollow from root to crown, the Prince's hall.
 * Buttresses like walls, a great pointed door under a crescent pediment, a gallery of violet
 * windows, two black lamps at the door, bracket fungus the size of tables, and the trunk going up
 * past the top of the world.
 */
export function umbralBole(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const r = w / 2;
  shadow(g, x, y + 10, w * 1.5, 60, 0.55);
  stiltRoots(g, x, y, r * 0.6, 9, rng);
  // Buttress roots like walls, fanning out.
  for (const k of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const bx = x + k * (r * 0.55 + i * 34), by = y - 2;
      const tx = x + k * r * 0.42, ty = y - h * (0.42 - i * 0.1);
      const fx = x + k * (r * 0.95 + i * 46);
      g.fillStyle(BARK_DARK, 1); g.fillTriangle(tx, ty, bx, by + 4, fx, by + 4);
      g.fillStyle(BARK, 1); g.fillTriangle(tx, ty + 2, bx + k * 4, by, fx - k * 8, by);
      g.lineStyle(1.2, BARK_LIT, 0.4); g.lineBetween(tx, ty + 4, fx - k * 10, by - 1);
    }
  }
  // The trunk.
  const top = y - h;
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - r * 0.62 - 4, top, r * 1.24 + 8, h);
  g.fillStyle(BARK, 1); g.fillRect(x - r * 0.62, top, r * 1.24, h);
  g.fillEllipse(x, y - 30, r * 1.6, 90);
  for (let i = 0; i < 12; i++) {
    const rx = x - r * 0.58 + (i / 11) * r * 1.16;
    g.lineStyle(2, i % 2 ? BARK_DARK : BARK_LIT, i % 2 ? 0.8 : 0.3);
    g.beginPath(); g.moveTo(rx, top);
    for (let yy = top; yy < y - 40; yy += 16) g.lineTo(rx + Math.sin(yy * 0.03 + i * 1.3) * 4, yy);
    g.strokePath();
  }
  // The gallery: a row of tall violet-lit windows high up, with a balcony.
  const gy = top + h * 0.28;
  for (let i = 0; i < 5; i++) {
    const wx = x - r * 0.44 + (i / 4) * r * 0.88;
    g.fillStyle(DUSK_DARK, 1); g.fillEllipse(wx, gy - 14, 16, 18); g.fillRect(wx - 8, gy - 14, 16, 30);
    g.fillStyle(DUSK, 0.7); g.fillEllipse(wx, gy - 12, 11, 13); g.fillRect(wx - 5.5, gy - 12, 11, 26);
    glow(g, wx, gy, 20, DUSK_LIT, 0.03, 2);
    g.lineStyle(1, IRON, 1); g.lineBetween(wx, gy - 18, wx, gy + 14); g.lineBetween(wx - 5.5, gy, wx + 5.5, gy);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - r * 0.56, gy + 18, r * 1.12, 6);
  for (let bx = x - r * 0.54; bx < x + r * 0.54; bx += 9) { g.fillStyle(IRON, 1); g.fillRect(bx, gy + 8, 2, 10); }
  g.fillStyle(IRON, 1); g.fillRect(x - r * 0.56, gy + 6, r * 1.12, 2.5);
  // Shadow-cloth banners hanging off the balcony.
  for (const k of [-1, 1]) {
    const bx = x + k * r * 0.36;
    g.fillStyle(CLOTH, 1); g.fillRect(bx - 12, gy + 24, 24, 78);
    g.fillTriangle(bx - 12, gy + 102, bx + 12, gy + 102, bx, gy + 114);
    g.fillStyle(CLOTH_SHEEN, 0.3); g.fillRect(bx - 10, gy + 26, 3, 72);
    // The Prince's sigil: a crescent over a closed eye.
    g.fillStyle(CRESCENT, 0.85); g.fillCircle(bx, gy + 52, 7);
    g.fillStyle(CLOTH, 1); g.fillCircle(bx + 3, gy + 50, 6);
    g.lineStyle(1.2, CRESCENT, 0.8); g.beginPath(); g.arc(bx, gy + 70, 6, 0.2, Math.PI - 0.2, false); g.strokePath();
  }
  // The door: a tall pointed arch cut into the heartwood.
  const dw = 70, dh = 120;
  g.fillStyle(HEART_DARK, 1);
  g.fillRect(x - dw / 2 - 10, y - dh + 30, dw + 20, dh - 30);
  g.fillTriangle(x - dw / 2 - 10, y - dh + 31, x + dw / 2 + 10, y - dh + 31, x, y - dh - 30);
  g.fillStyle(HEART, 1);
  g.fillRect(x - dw / 2 - 5, y - dh + 30, dw + 10, dh - 30);
  g.fillTriangle(x - dw / 2 - 5, y - dh + 31, x + dw / 2 + 5, y - dh + 31, x, y - dh - 22);
  g.fillStyle(0x07040c, 1);
  g.fillRect(x - dw / 2, y - dh + 30, dw, dh - 30);
  g.fillTriangle(x - dw / 2, y - dh + 31, x + dw / 2, y - dh + 31, x, y - dh - 14);
  // Iron studs on the arch, a crescent pediment over it.
  for (let i = 0; i < 9; i++) { g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x - dw / 2 - 5 + (i / 8) * (dw + 10), y - dh + 34, 1.6); }
  g.fillStyle(CRESCENT, 0.9); g.fillCircle(x, y - dh - 44, 14);
  g.fillStyle(BARK, 1); g.fillCircle(x + 6, y - dh - 47, 12);
  glow(g, x - 6, y - dh - 44, 30, MOON, 0.035, 3);
  // Steps of root.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? BARK : BARK_LIT, 1); g.fillRect(x - dw / 2 - 12 - k * 8, y - 8 + k * 4, dw + 24 + k * 16, 5); }
  // Bracket fungus as big as tables.
  fungusShelf(g, x - r * 0.62, y - h * 0.55, 2.2, true);
  fungusShelf(g, x + r * 0.62, y - h * 0.68, 1.9);
  fungusShelf(g, x + r * 0.55, y - h * 0.18, 1.5);
  // Up into the leaves.
  g.fillStyle(LEAF, 1); g.fillEllipse(x, top, w * 1.6, 70);
  g.fillStyle(LEAF_LIT, 0.35); g.fillEllipse(x - r * 0.3, top - 8, w * 0.7, 24);
  for (let i = 0; i < 9; i++) { g.lineStyle(1.2, LEAF_LIT, 0.5); g.lineBetween(x - r + i * r * 0.25, top + 24, x - r + i * r * 0.25 + 3, top + 40 + (i % 3) * 10); }
}

// ── Civic pieces ─────────────────────────────────────────────────────

/**
 * The Umbral Draught House: a squat hall on stilt-roots with a fang-shaped door, the Matriarch's
 * green mark painted over it, a queue rope on posts, and the ration board nailed beside the door.
 */
export function draughtHouse(g: G, x: number, y: number, rng: () => number): void {
  const w = 150, h = 74;
  shadow(g, x, y + 4, w * 1.2, 24, 0.45);
  stiltRoots(g, x - 40, y, 22, 3, rng);
  stiltRoots(g, x + 40, y, 22, 3, rng);
  const x0 = x - w / 2, base = y - 18;
  // Stilts and platform.
  for (const sx of [x0 + 10, x0 + w * 0.5, x0 + w - 10]) { g.fillStyle(BARK_DARK, 1); g.fillRect(sx - 4, base, 8, 18); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 8, base - 6, w + 16, 8);
  // Walls of black plank.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, base - h, w, h - 6);
  g.lineStyle(1, dim(TIMBER, 0.3), 1);
  for (let xx = x0 + 8; xx < x0 + w; xx += 8) g.lineBetween(xx, base - h, xx, base - 6);
  // A low steep roof thatched with dark leaves.
  g.fillStyle(LEAF, 1); g.fillTriangle(x0 - 16, base - h + 4, x0 + w + 16, base - h + 4, x, base - h - 46);
  g.lineStyle(1, LEAF_LIT, 0.5);
  for (let k = 0; k < 10; k++) g.lineBetween(x0 - 10 + k * (w + 20) / 9, base - h + 2, x, base - h - 42);
  // The fang door.
  g.fillStyle(0x07040c, 1); g.fillTriangle(x - 16, base - 6, x + 16, base - 6, x, base - 60);
  g.lineStyle(2, FUNGUS, 0.8); g.lineBetween(x - 16, base - 6, x, base - 60); g.lineBetween(x + 16, base - 6, x, base - 60);
  // The Mark: two green fang-dots over the door.
  g.fillStyle(VENOM, 1); g.fillCircle(x - 6, base - 66, 3.2); g.fillCircle(x + 6, base - 66, 3.2);
  glow(g, x, base - 66, 14, VENOM, 0.05, 2);
  // Shuttered ration hatch.
  shutter(g, x + 46, base - 52, 20, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(x + 32, base - 32, 28, 4);
  // The queue rope on posts, down the steps.
  const posts = [[x - 30, y + 18], [x - 70, y + 22], [x - 110, y + 18], [x - 150, y + 22]];
  for (const [px, py] of posts) { g.fillStyle(IRON, 1); g.fillRect(px - 2, py - 22, 4, 22); g.fillStyle(IRON_LIT, 1); g.fillCircle(px, py - 23, 2.5); }
  g.lineStyle(2, VENOM_DARK, 1);
  for (let i = 0; i < posts.length - 1; i++) {
    const [ax, ay] = posts[i], [bx, by] = posts[i + 1];
    g.beginPath(); g.moveTo(ax, ay - 20);
    for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(ax + (bx - ax) * u, ay - 20 + (by - ay) * u + Math.sin(u * Math.PI) * 7); }
    g.strokePath();
  }
}

/** The ration board: a black slate of names chalked in two columns, half of them struck through. */
export function rationBoard(g: G, x: number, y: number): void {
  shadow(g, x, y, 60, 10, 0.4);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 24 - 2, y - 70, 4, 70); }
  g.fillStyle(TIMBER, 1); g.fillRect(x - 32, y - 76, 64, 50);
  g.fillStyle(0x101014, 1); g.fillRect(x - 29, y - 73, 58, 44);
  for (let r = 0; r < 7; r++) {
    for (const c of [0, 1]) {
      const lx = x - 26 + c * 28, ly = y - 68 + r * 6;
      g.lineStyle(1, FUNGUS, 0.75); g.lineBetween(lx, ly, lx + 10 + ((r * 7 + c * 3) % 12), ly);
      if ((r + c * 2) % 3 === 0) { g.lineStyle(1, GREY, 0.95); g.lineBetween(lx - 1, ly + 1, lx + 22, ly - 1); }
    }
  }
  g.fillStyle(VENOM, 0.9); g.fillCircle(x - 4, y - 79, 2.2); g.fillCircle(x + 4, y - 79, 2.2);
}

/** The court's waystone: a column of night-stone with a crescent cut through it. */
export function umbralWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y, 44, 12, 0.45);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 15, y - 10, 30, 10);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 11, y - 66, 22, 58);
  g.fillStyle(STONE, 1); g.fillRect(x - 10, y - 66, 18, 56);
  g.fillStyle(STONE_LIT, 0.6); g.fillRect(x - 10, y - 66, 3, 56);
  g.fillTriangle(x - 11, y - 66, x + 11, y - 66, x, y - 80);
  g.fillStyle(STONE, 1); g.fillTriangle(x - 10, y - 66, x + 8, y - 66, x - 1, y - 78);
  // The crescent cut clean through: the far side's dark showing.
  g.fillStyle(MOON, 0.9); g.fillCircle(x, y - 46, 7);
  g.fillStyle(STONE, 1); g.fillCircle(x + 3, y - 48, 6);
  glow(g, x, y - 46, 18, MOON, 0.05, 3);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, STONE_DARK, 0.7); g.lineBetween(x - 7, y - 30 + k * 5, x + 5, y - 30 + k * 5); }
}

/**
 * The astronomers' starglass: a long brass telescope on a tripod platform, pointed straight up
 * through the one hole the court has ever cut in its canopy. A shaft of moonlight comes down it.
 */
export function starglass(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 120, 24, 0.4);
  // A round platform of root-planks.
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - 4, 130, 40);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, y - 8, 124, 36);
  g.lineStyle(1, TIMBER_DARK, 0.7);
  for (let k = -5; k <= 5; k++) g.lineBetween(x + k * 11, y - 24, x + k * 11, y + 8);
  g.lineStyle(1.5, STONE_LIT, 0.4); g.strokeEllipse(x, y - 8, 104, 28);
  // The tripod.
  for (const [dx, dy] of [[-30, 2], [28, 4], [0, -16]]) { g.lineStyle(3, IRON, 1); g.lineBetween(x + dx, y - 8 + dy, x - 2, y - 56); }
  // The tube: long, tilted near-vertical, banded.
  g.lineStyle(10, 0x7a5a22, 1); g.lineBetween(x - 2, y - 56, x + 18, y - 156);
  g.lineStyle(6, 0xc8a050, 1); g.lineBetween(x - 2, y - 56, x + 18, y - 156);
  g.lineStyle(2, 0xf0d48a, 0.8); g.lineBetween(x - 4, y - 60, x + 15, y - 152);
  for (let k = 0; k < 4; k++) { const u = 0.2 + k * 0.22; g.fillStyle(0x5a3a12, 1); g.fillCircle(x - 2 + 20 * u, y - 56 - 100 * u, 5.5); }
  g.fillStyle(0x3a2a10, 1); g.fillCircle(x + 18, y - 158, 6.5);
  g.fillStyle(MOON, 0.8); g.fillCircle(x + 18, y - 158, 3.5);
  // Eyepiece and a little stool.
  g.fillStyle(0x7a5a22, 1); g.fillRect(x - 10, y - 54, 8, 5);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 32, y - 30, 16, 4); g.fillRect(x - 30, y - 26, 2, 10); g.fillRect(x - 20, y - 26, 2, 10);
  // Star charts pinned to a board, rolled scrolls.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 36, y - 52, 30, 36);
  g.fillStyle(DUSK_DARK, 1); g.fillRect(x + 38, y - 50, 26, 30);
  for (let i = 0; i < 10; i++) { g.fillStyle(MOON, 0.7); g.fillCircle(x + 40 + ((i * 7) % 22), y - 48 + ((i * 11) % 26), 0.9); }
  g.lineStyle(0.7, MOON_DIM, 0.6); g.strokeCircle(x + 51, y - 35, 9);
  for (let k = 0; k < 3; k++) { g.fillStyle(FUNGUS, 1); g.fillRect(x - 54 + k * 7, y - 16, 5, 14); g.fillStyle(FUNGUS_DARK, 1); g.fillCircle(x - 51.5 + k * 7, y - 16, 2.5); }
}

/** A tall standing mirror whose glass is black: the Mirrorwright's stock, propped in a row. */
export function blackMirror(g: G, x: number, y: number, s: number, tilt: number): void {
  shadow(g, x, y, 30 * s, 8 * s, 0.35);
  const h = 64 * s, w = 26 * s;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2 * s + tilt, y - 10 * s, 4 * s, 10 * s);
  g.fillRect(x - 12 * s, y - 3 * s, 24 * s, 3 * s);
  // Frame: an oval with a little crown of carved leaves.
  g.fillStyle(TIMBER, 1); g.fillEllipse(x + tilt, y - 10 * s - h / 2, w + 6 * s, h + 6 * s);
  g.fillStyle(TIMBER_LIT, 0.6); g.fillEllipse(x + tilt - 2 * s, y - 12 * s - h / 2, w + 2 * s, h + 2 * s);
  g.fillStyle(0x06040a, 1); g.fillEllipse(x + tilt, y - 10 * s - h / 2, w, h);
  // In the glass: not a reflection, a dim second figure standing a step behind.
  g.fillStyle(DUSK_DARK, 0.9); g.fillEllipse(x + tilt + 3 * s, y - 10 * s - h * 0.42, 9 * s, 22 * s);
  g.fillCircle(x + tilt + 3 * s, y - 10 * s - h * 0.74, 5 * s);
  g.fillStyle(DUSK_LIT, 0.8); g.fillCircle(x + tilt + 1.5 * s, y - 10 * s - h * 0.75, 0.9 * s); g.fillCircle(x + tilt + 4.5 * s, y - 10 * s - h * 0.75, 0.9 * s);
  g.lineStyle(1.5 * s, MOON, 0.25); g.lineBetween(x + tilt - w * 0.3, y - 10 * s - h * 0.8, x + tilt - w * 0.1, y - 10 * s - h * 0.25);
  for (let i = 0; i < 5; i++) { g.fillStyle(LEAF_LIT, 1); g.fillEllipse(x + tilt + (i - 2) * 5 * s, y - 10 * s - h - 2 * s - Math.abs(i - 2) * -1.5 * s, 5 * s, 3 * s); }
}

/** A shadow-mere: water like ink, a skin of violet sheen, roots dipping in at the rim. */
export function shadowMere(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle(MOULD_DARK, 1); g.fillEllipse(cx, cy + 6, r.w + 40, r.h + 34);
  g.fillStyle(MOSS, 1); g.fillEllipse(cx, cy, r.w + 30, r.h + 26);
  g.fillStyle(MOSS_LIT, 0.4); g.fillEllipse(cx - 10, cy - 8, r.w + 20, r.h + 10);
  g.fillStyle(MERE, 1); g.fillEllipse(cx, cy, r.w, r.h);
  // The sheen: long violet streaks that never move, and a few reflected black-flames.
  for (let i = 0; i < 9; i++) {
    const y = r.y + 30 + (i / 8) * (r.h - 60), w = r.w * (0.25 + rng() * 0.35);
    g.fillStyle(MERE_SHEEN, 0.3); g.fillEllipse(cx + (rng() - 0.5) * r.w * 0.4, y, w, 3);
  }
  // Roots dipping in at the rim.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng() * 0.2;
    const ex = cx + Math.cos(a) * r.w * 0.52, ey = cy + Math.sin(a) * r.h * 0.52;
    const ix = cx + Math.cos(a) * r.w * 0.42, iy = cy + Math.sin(a) * r.h * 0.42;
    g.lineStyle(4, BARK, 1); g.lineBetween(ex, ey, ix, iy);
    g.lineStyle(1.2, BARK_LIT, 0.4); g.lineBetween(ex, ey - 1, ix, iy - 1);
    g.fillStyle(MERE_LIT, 0.25); g.fillEllipse(ix, iy, 10, 3);
  }
}

/** A cluster of pale ghost-caps on the mould, faintly glowing (baked). */
export function ghostCaps(g: G, x: number, y: number, n: number, rng: () => number): void {
  glow(g, x, y - 4, 22, FOXFIRE, 0.025, 3);
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * 30, py = y + (rng() - 0.5) * 12, s = 0.6 + rng() * 0.7;
    g.fillStyle(FUNGUS_DARK, 1); g.fillRect(px - 0.8 * s, py - 7 * s, 1.6 * s, 7 * s);
    g.fillStyle(FUNGUS, 1); g.fillEllipse(px, py - 7 * s, 7 * s, 3.6 * s);
    g.fillStyle(lit(FOXFIRE, 0.3), 0.6); g.fillEllipse(px - 1 * s, py - 7.6 * s, 3 * s, 1.2 * s);
  }
}

/** A shadow loose on the ground, owned by nobody — the court's walking shadows (animated). */
export function looseShadow(g: G, x: number, y: number, t: number, seed: number): void {
  const walk = Math.sin(t * 3 + seed) * 3;
  g.fillStyle(0x05030a, 0.42);
  // Laid flat on the ground, stretched: a body, a head, and two legs scissoring.
  g.fillEllipse(x, y, 16, 44);
  g.fillCircle(x, y - 28, 7);
  g.fillEllipse(x - 4 + walk, y + 26, 5, 18);
  g.fillEllipse(x + 4 - walk, y + 26, 5, 18);
  g.fillEllipse(x - 9, y - 4 - walk, 4, 16); g.fillEllipse(x + 9, y - 4 + walk, 4, 16);
}

/** A moth: two dusty wings flapping round a dark body (animated). */
export function moth(g: G, x: number, y: number, s: number, t: number, color = 0x8a7aa0): void {
  const f = Math.abs(Math.sin(t * 22)) * 0.8 + 0.2;
  g.fillStyle(dim(color, 0.2), 0.9);
  g.fillEllipse(x - 4 * s * f, y, 7 * s * f, 6 * s);
  g.fillEllipse(x + 4 * s * f, y, 7 * s * f, 6 * s);
  g.fillStyle(lit(color, 0.2), 0.7); g.fillCircle(x - 4 * s * f, y - 1 * s, 1.2 * s); g.fillCircle(x + 4 * s * f, y - 1 * s, 1.2 * s);
  g.fillStyle(0x1a1420, 1); g.fillEllipse(x, y, 2 * s, 6 * s);
}

/** A cart of black lamp-oil casks: the lampwardens' round. */
export function oilCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 110, 18, 0.4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 46, y - 30, 92, 8);
  for (const wx of [x - 30, x + 30]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillCircle(wx, y - 12, 13);
    g.fillStyle(TIMBER, 1); g.fillCircle(wx, y - 12, 10);
    g.lineStyle(1.2, TIMBER_DARK, 1); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; g.lineBetween(wx - Math.cos(a) * 9, y - 12 - Math.sin(a) * 9, wx + Math.cos(a) * 9, y - 12 + Math.sin(a) * 9); }
    g.fillStyle(IRON, 1); g.fillCircle(wx, y - 12, 2.5);
  }
  for (let i = 0; i < 3; i++) {
    const cx = x - 26 + i * 26;
    g.fillStyle(0x1a1418, 1); g.fillEllipse(cx, y - 44, 22, 28);
    g.fillStyle(IRON, 1); g.fillRect(cx - 11, y - 50, 22, 2); g.fillRect(cx - 11, y - 38, 22, 2);
    g.fillStyle(BLACKFLAME_EDGE, 0.35); g.fillEllipse(cx - 4, y - 46, 4, 14);
  }
  // A drip running down the side.
  drip(g, x + 14, y - 30, 7);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 46, y - 26, x + 74, y - 20);
}

/** A grave-cart under a grey sheet, waiting by the north road for the passed-over. */
export function greyCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 100, 16, 0.4);
  for (const wx of [x - 28, x + 28]) { g.fillStyle(TIMBER_DARK, 1); g.fillCircle(wx, y - 11, 11); g.fillStyle(IRON, 1); g.fillCircle(wx, y - 11, 2.2); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 44, y - 30, 88, 10);
  g.fillStyle(GREY, 1); g.fillEllipse(x, y - 36, 84, 20);
  g.fillStyle(lit(GREY, 0.2), 0.6); g.fillEllipse(x - 8, y - 40, 50, 8);
  g.lineStyle(1, dim(GREY, 0.3), 0.8); for (let k = -3; k <= 3; k++) g.lineBetween(x + k * 10, y - 44, x + k * 12, y - 28);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 44, y - 24, x - 74, y - 16);
}

/** A night-blooming flower bed (moonflowers), pale trumpets open to no light at all. */
export function moonflowers(g: G, x: number, y: number, w: number, rng: () => number): void {
  g.fillStyle(MOULD_LIT, 1); g.fillEllipse(x, y, w, w * 0.32);
  for (let i = 0; i < w / 6; i++) {
    const px = x + (rng() - 0.5) * w * 0.9, py = y + (rng() - 0.5) * w * 0.25;
    g.lineStyle(1, MOSS_LIT, 1); g.lineBetween(px, py, px + (rng() - 0.5) * 4, py - 7);
    if (rng() < 0.5) { g.fillStyle(MOON, 0.85); g.fillCircle(px, py - 8, 2.2); g.fillStyle(0xffffff, 0.6); g.fillCircle(px, py - 8, 0.9); }
  }
}

/** The dusk-violet flourish shared by the Prince's things: a crescent with a closed eye under it. */
export function duskSigil(g: G, x: number, y: number, r: number, a = 1): void {
  g.fillStyle(CRESCENT, a); g.fillCircle(x, y - r * 0.3, r);
  g.fillStyle(DUSK_DARK, a); g.fillCircle(x + r * 0.4, y - r * 0.5, r * 0.85);
  g.lineStyle(Math.max(1, r * 0.18), CRESCENT, a); g.beginPath(); g.arc(x, y + r * 0.6, r * 0.7, 0.25, Math.PI - 0.25, false); g.strokePath();
  for (let k = -1; k <= 1; k++) g.lineBetween(x + k * r * 0.4, y + r * 1.2, x + k * r * 0.5, y + r * 1.5);
}

/** A ground of leaf-mould under the canopy: black-violet earth, moss blots, fallen leaves. */
export function mouldGround(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MOULD, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = (r.w * r.h) / 2600;
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, k = rng();
    if (k < 0.35) { g.fillStyle(MOULD_LIT, 0.5); g.fillEllipse(x, y, 14 + rng() * 30, 6 + rng() * 10); }
    else if (k < 0.55) { g.fillStyle(MOSS, 0.55); g.fillEllipse(x, y, 20 + rng() * 40, 8 + rng() * 14); }
    else if (k < 0.8) { g.fillStyle(LEAF, 0.7); g.fillEllipse(x, y, 5, 2.5); }
    else { g.fillStyle(MOULD_DARK, 0.6); g.fillCircle(x, y, 1.5 + rng() * 2); }
  }
}

/** A dark violet halo for the Prince's colours, drawn under the black lamps on his hall. */
export function duskHalo(g: G, x: number, y: number, r: number): void {
  glow(g, x, y, r, DUSK_LIT, 0.025, 4);
  g.lineStyle(1, DUSK, 0.25); g.strokeCircle(x, y, r * 0.8);
}
