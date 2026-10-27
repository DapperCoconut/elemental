import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BLOOM_GOLD, BLOOM_PINK, BLOOM_RED, BLOOM_VIOLET, BLOOM_WHITE, BOX, BOX_DARK, BOX_LIT, BRASS, BRASS_DARK, BRASS_LIT,
  GLASS, GLASS_EDGE, GLASS_LIT, GRAVEL, GRAVEL_DARK, GRAVEL_LIT, IRON_SHADE, IRON_WHITE, LAWN, LAWN_DARK, LAWN_LIT,
  LEAF, LILYPAD, LILYPAD_DARK, ORANGE, PETALIS, PETALIS_DARK, PETALIS_LIT, POND, POND_DEEP, POND_LIT, SOIL, SOIL_DARK,
  SOIL_LIT, STAMEN, STEM, STONE, STONE_DARK, STONE_LIT, TERRA, TERRA_DARK, TERRA_LIT, THORN, THORN_DARK, TIMBER,
  TIMBER_DARK, TIMBER_LIT, VERDIGRIS, VERDIGRIS_DARK, VERDIGRIS_LIT, WILT, YEW, YEW_LIT,
} from './palette';

/**
 * Bloom set pieces — the shapes only an over-kept garden has. Everything is drawn *clipped*:
 * hedges with flat tops and sharp corners, beds with ruler-straight stripes, gravel raked in
 * lines, and glass over anything anyone loves. Where something has been let go (a wilted
 * stripe, a pruned household's empty stake) it is the only ragged thing in the picture, and the
 * eye goes straight to it — which is what the Weigh-Warden wants.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── Ground ───────────────────────────────────────────────────────────

/** A mown lawn: alternating light and dark bands, the way the mower leaves them. */
export function mowStripes(g: G, r: Rect, rng: () => number, band = 64, vertical = false): void {
  g.fillStyle(LAWN, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const span = vertical ? r.w : r.h;
  for (let i = 0; i * band < span; i++) {
    if (i % 2) continue;
    g.fillStyle(LAWN_LIT, 0.55);
    if (vertical) g.fillRect(r.x + i * band, r.y, Math.min(band, r.w - i * band), r.h);
    else g.fillRect(r.x, r.y + i * band, r.w, Math.min(band, r.h - i * band));
  }
  // Clover and daisies the mower missed, and the odd worn patch.
  for (let i = 0; i < (r.w * r.h) / 2600; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.12) { g.fillStyle(BLOOM_WHITE, 0.8); g.fillCircle(x, y, 1.4); g.fillStyle(BLOOM_GOLD, 0.9); g.fillCircle(x, y, 0.6); }
    else if (k < 0.5) { g.fillStyle(LAWN_DARK, 0.35); g.fillRect(x, y, 2, 1.2); }
    else { g.fillStyle(LAWN_LIT, 0.3); g.fillRect(x, y, 1.5, 2); }
  }
}

/**
 * A gravel walk with clipped box edging both sides: the edging is drawn as a low hedge seen
 * from above, one lit top and a dark front lip, so every walk in the court has a kerb of green.
 */
export function gravelWalk(g: G, pts: Pt[], w: number, rng: () => number, edged = true): void {
  const strokeLine = (width: number, color: number, alpha = 1) => {
    g.lineStyle(width, color, alpha);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    g.fillStyle(color, alpha);
    for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
  };
  if (edged) {
    strokeLine(w + 26, BOX_DARK);
    strokeLine(w + 20, BOX);
    strokeLine(w + 12, BOX_LIT, 0.5);
  }
  strokeLine(w + 4, GRAVEL_DARK);
  strokeLine(w, GRAVEL);
  // Raked lines along the walk, and loose stones.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    for (let k = -2; k <= 2; k++) {
      const off = (k / 2.6) * (w / 2);
      g.lineStyle(1, GRAVEL_DARK, 0.35);
      g.lineBetween(a.x - uy * off, a.y + ux * off, b.x - uy * off, b.y + ux * off);
    }
    for (let d = 0; d < len; d += 6) {
      const off = (rng() - 0.5) * w * 0.9;
      g.fillStyle(rng() < 0.5 ? GRAVEL_LIT : GRAVEL_DARK, 0.5);
      g.fillRect(a.x + ux * d - uy * off, a.y + uy * d + ux * off, 1.6, 1.4);
    }
  }
}

/** One small flower head. `kind` is the bed's habit — a flat daisy, a cupped tulip, a rose, a closed bud. */
export function flower(g: G, x: number, y: number, r: number, color: number, kind: 'daisy' | 'tulip' | 'rose' | 'bud' = 'daisy', open = 1): void {
  if (kind === 'bud' || open < 0.25) {
    g.fillStyle(STEM, 1); g.fillEllipse(x, y + r * 0.2, r * 0.9, r * 1.2);
    g.fillStyle(color, 0.9); g.fillEllipse(x, y - r * 0.15, r * 0.55, r * 0.8);
    return;
  }
  const rr = r * (0.5 + open * 0.5);
  if (kind === 'tulip') {
    g.fillStyle(dim(color, 0.3), 1); g.fillEllipse(x, y, rr * 1.5, rr * 1.7);
    g.fillStyle(color, 1); g.fillEllipse(x - rr * 0.25, y - rr * 0.1, rr * 0.8, rr * 1.4); g.fillEllipse(x + rr * 0.25, y - rr * 0.1, rr * 0.8, rr * 1.4);
    g.fillStyle(lit(color, 0.3), 0.8); g.fillEllipse(x - rr * 0.3, y - rr * 0.4, rr * 0.3, rr * 0.6);
    return;
  }
  if (kind === 'rose') {
    g.fillStyle(dim(color, 0.35), 1); g.fillCircle(x, y, rr);
    g.fillStyle(color, 1); g.fillCircle(x, y - 0.5, rr * 0.82);
    g.lineStyle(Math.max(0.8, rr * 0.16), dim(color, 0.3), 0.9);
    g.beginPath(); g.arc(x, y, rr * 0.5, 0, Math.PI * 1.5, false); g.strokePath();
    g.beginPath(); g.arc(x + rr * 0.08, y - rr * 0.05, rr * 0.22, Math.PI, Math.PI * 2.6, false); g.strokePath();
    return;
  }
  // Daisy: a ring of petals round a gold eye.
  const n = 7;
  g.fillStyle(color, 1);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.fillEllipse(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.6, rr * 0.8, rr * 0.8);
  }
  g.fillStyle(color === BLOOM_GOLD ? 0x7a4a14 : STAMEN, 1); g.fillCircle(x, y, rr * 0.36);
}

/**
 * A household's tithe stake: a verdigris-painted peg at the end of a stripe with a numbered
 * tag. A `thin` stripe's stake has the Weigh-Warden's red ribbon tied round it.
 */
export function titheStake(g: G, x: number, y: number, n: number, thin = false): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 1, 10, 3);
  g.fillStyle(VERDIGRIS_DARK, 1); g.fillRect(x - 2, y - 22, 4, 22);
  g.fillStyle(VERDIGRIS, 1); g.fillRect(x - 1.5, y - 22, 2.4, 21);
  g.fillStyle(IRON_WHITE, 1); g.fillRect(x - 7, y - 30, 14, 9);
  g.lineStyle(1, VERDIGRIS_DARK, 1); g.strokeRect(x - 7, y - 30, 14, 9);
  // The number as tally strokes (no fonts in a painter).
  g.lineStyle(1, 0x2a2a2a, 1);
  for (let k = 0; k < Math.min(5, n); k++) g.lineBetween(x - 5 + k * 2.4, y - 28, x - 5 + k * 2.4, y - 23);
  if (n >= 5) g.lineBetween(x - 6, y - 24, x + 6, y - 28);
  if (thin) {
    g.fillStyle(0xc0242e, 1); g.fillRect(x - 3, y - 18, 6, 3);
    g.fillTriangle(x + 2, y - 17, x + 8, y - 10, x + 4, y - 9);
    g.fillTriangle(x - 2, y - 17, x - 7, y - 9, x - 3, y - 8);
  }
}

/**
 * A flowerbed planted in stripes, one household to a stripe. `thin` lists stripe indices whose
 * planting has failed (bare soil, a few brown stems) — the Weigh-Warden marks those first.
 */
export function stripeBed(
  g: G, r: Rect, colors: number[], rng: () => number,
  opts: { vertical?: boolean; kinds?: ('daisy' | 'tulip' | 'rose')[]; thin?: number[]; stakes?: boolean; edge?: boolean } = {},
): void {
  if (opts.edge !== false) {
    g.fillStyle(BOX_DARK, 1); g.fillRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18);
    g.fillStyle(BOX, 1); g.fillRect(r.x - 8, r.y - 10, r.w + 16, r.h + 16);
    g.fillStyle(BOX_LIT, 0.6); g.fillRect(r.x - 8, r.y - 10, r.w + 16, 3);
  }
  g.fillStyle(SOIL, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 120; i++) {
    g.fillStyle(rng() < 0.5 ? SOIL_DARK : SOIL_LIT, 0.5); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 2, 1.5);
  }
  const n = colors.length;
  const span = opts.vertical ? r.w : r.h;
  const sw = span / n;
  for (let i = 0; i < n; i++) {
    const c = colors[i];
    const kind = opts.kinds?.[i % (opts.kinds?.length ?? 1)] ?? 'daisy';
    const thin = opts.thin?.includes(i) ?? false;
    const s0 = i * sw;
    // Plants in a staggered grid down the stripe.
    const step = 11;
    for (let a = 6; a < (opts.vertical ? r.h : r.w) - 4; a += step) {
      for (let b = 5; b < sw - 3; b += step * 0.9) {
        const jit = (rng() - 0.5) * 3;
        const x = opts.vertical ? r.x + s0 + b + jit : r.x + a + ((b / step) % 2 ? step / 2 : 0) + jit;
        const y = opts.vertical ? r.y + a + ((b / step) % 2 ? step / 2 : 0) + jit : r.y + s0 + b + jit;
        if (x > r.x + r.w - 3 || y > r.y + r.h - 3) continue;
        if (thin) {
          if (rng() < 0.3) { g.lineStyle(1, WILT, 0.9); g.lineBetween(x, y + 3, x + (rng() - 0.5) * 4, y - 3); }
          continue;
        }
        g.fillStyle(LEAF, 0.85); g.fillEllipse(x, y + 2, 7, 4);
        flower(g, x, y - 1, 3.4 + rng() * 0.8, mixC(c, rng() < 0.5 ? 0xffffff : 0x000000, rng() * 0.12), kind, 0.8 + rng() * 0.2);
      }
    }
    if (opts.stakes !== false) {
      const sx = opts.vertical ? r.x + s0 + sw / 2 : r.x - 2;
      const sy = opts.vertical ? r.y + r.h + 4 : r.y + s0 + sw / 2 + 10;
      titheStake(g, sx, sy, (i % 6) + 1, thin);
    }
  }
}

/** A knot garden: clipped box drawn in interlocking loops round a centre, herbs in the pockets. */
export function knotGarden(g: G, cx: number, cy: number, r: number, rng: () => number): void {
  g.fillStyle(GRAVEL_DARK, 1); g.fillRect(cx - r - 14, cy - r * 0.7 - 14, r * 2 + 28, r * 1.4 + 28);
  g.fillStyle(GRAVEL, 1); g.fillRect(cx - r - 10, cy - r * 0.7 - 10, r * 2 + 20, r * 1.4 + 20);
  // Herbs in the pockets first, then the box over them.
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, d = rng() * r;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
    const k = rng();
    g.fillStyle(k < 0.33 ? 0x8aa86a : k < 0.66 ? 0x9a86c0 : 0x6f8f4a, 0.9); g.fillCircle(x, y, 2.5 + rng() * 2);
  }
  const loop = (ox: number, oy: number, rr: number) => {
    g.lineStyle(9, BOX_DARK, 1); g.strokeEllipse(ox, oy + 1, rr * 2, rr * 1.4);
    g.lineStyle(7, BOX, 1); g.strokeEllipse(ox, oy, rr * 2, rr * 1.4);
    g.lineStyle(2, BOX_LIT, 0.7); g.strokeEllipse(ox, oy - 1.5, rr * 2 - 3, rr * 1.4 - 3);
  };
  loop(cx, cy, r * 0.62);
  for (const [dx, dy] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]] as [number, number][]) loop(cx + dx * r, cy + dy * r, r * 0.42);
  g.lineStyle(7, BOX, 1); g.strokeRect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
  g.lineStyle(2, BOX_LIT, 0.6); g.strokeRect(cx - r + 2, cy - r * 0.7 - 2, r * 2 - 4, r * 1.4);
}

/** A lily pond with a dressed-stone kerb, pads and a few cups open on the water. */
export function lilyPond(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x000000, 0.2); g.fillRoundedRect(r.x - 14, r.y - 8, r.w + 28, r.h + 26, 40);
  g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(r.x - 14, r.y - 14, r.w + 28, r.h + 28, 40);
  g.fillStyle(STONE, 1); g.fillRoundedRect(r.x - 12, r.y - 14, r.w + 24, r.h + 24, 38);
  // The kerb's dressed blocks.
  g.lineStyle(1, STONE_DARK, 0.6);
  for (let x = r.x; x < r.x + r.w; x += 34) { g.lineBetween(x, r.y - 14, x, r.y - 2); g.lineBetween(x + 17, r.y + r.h, x + 17, r.y + r.h + 10); }
  g.fillStyle(POND_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 30);
  g.fillStyle(POND, 1); g.fillRoundedRect(r.x + 10, r.y + 8, r.w - 20, r.h - 18, 26);
  for (let i = 0; i < 6; i++) { g.fillStyle(POND_LIT, 0.2); g.fillEllipse(r.x + 40 + rng() * (r.w - 80), r.y + 20 + rng() * (r.h - 40), 40 + rng() * 40, 4); }
  for (let i = 0; i < 18; i++) {
    const x = r.x + 26 + rng() * (r.w - 52), y = r.y + 22 + rng() * (r.h - 44);
    lilyPad(g, x, y, 8 + rng() * 9, rng() * Math.PI * 2);
    if (rng() < 0.35) waterLily(g, x + 2, y - 2, 4 + rng() * 2, rng() < 0.5 ? BLOOM_PINK : BLOOM_WHITE);
  }
}

export function lilyPad(g: G, x: number, y: number, r: number, notch: number): void {
  g.fillStyle(LILYPAD_DARK, 1); g.fillEllipse(x, y + 1, r * 2, r * 1.3);
  g.fillStyle(LILYPAD, 1);
  g.slice(x, y, r, notch + 0.35, notch - 0.35 + Math.PI * 2, false); g.fillPath();
  g.lineStyle(0.8, LILYPAD_DARK, 0.7);
  for (let k = 0; k < 5; k++) { const a = notch + 0.6 + k * 1.1; g.lineBetween(x, y, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.55); }
}

export function waterLily(g: G, x: number, y: number, r: number, color: number): void {
  g.fillStyle(dim(color, 0.2), 1);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillEllipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.35, r * 0.9, r * 0.5); }
  g.fillStyle(color, 1);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; g.fillEllipse(x + Math.cos(a) * r * 0.35, y - r * 0.2 + Math.sin(a) * r * 0.2, r * 0.6, r * 0.8); }
  g.fillStyle(STAMEN, 1); g.fillCircle(x, y - r * 0.3, r * 0.25);
}

/**
 * The sundial lawn's dial: a ring of dressed hour-stones round a lawn disc, the hours cut as
 * Roman strokes. The gnomon and its moving shadow are drawn separately.
 */
export function dialFace(g: G, cx: number, cy: number, R: number, squash = 0.62): void {
  g.fillStyle(0x000000, 0.12); g.fillEllipse(cx, cy + 6, R * 2 + 30, (R * 2 + 30) * squash);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(cx, cy, R * 2 + 24, (R * 2 + 24) * squash);
  g.fillStyle(STONE, 1); g.fillEllipse(cx, cy - 2, R * 2 + 18, (R * 2 + 18) * squash);
  g.fillStyle(LAWN_LIT, 1); g.fillEllipse(cx, cy, R * 2 - 10, (R * 2 - 10) * squash);
  g.fillStyle(LAWN, 0.6); g.fillEllipse(cx, cy, R * 1.4, R * 1.4 * squash);
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * squash;
    g.fillStyle(STONE_DARK, 1); g.fillRect(x - 9, y - 6, 18, 11);
    g.fillStyle(STONE_LIT, 1); g.fillRect(x - 8, y - 7, 16, 9);
    // Roman strokes: a stroke per hour up to four, then a V.
    const n = h === 0 ? 12 : h;
    g.lineStyle(1.2, 0x5a5448, 1);
    const marks = Math.min(4, n % 5 === 0 ? 0 : n % 5);
    for (let k = 0; k < marks; k++) g.lineBetween(x - 4 + k * 2.6, y - 6, x - 4 + k * 2.6, y - 1);
    if (n >= 5) { g.lineBetween(x + 3, y - 6, x + 5, y - 1); g.lineBetween(x + 5, y - 1, x + 7, y - 6); }
    if (h % 3 === 0) { g.lineStyle(2, BRASS, 0.8); g.lineBetween(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78 * squash, cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9 * squash); }
  }
  g.lineStyle(1.5, BRASS_DARK, 0.5); g.strokeEllipse(cx, cy, R * 1.6, R * 1.6 * squash);
}

/** The dial's gnomon: a bronze blade on a stone drum, set for the Empress's latitude. */
export function gnomon(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, s * 2.4, s * 0.8);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - s * 0.9, y - s * 0.9, s * 1.8, s * 0.9);
  g.fillStyle(STONE, 1); g.fillRect(x - s * 0.85, y - s * 0.95, s * 1.7, s * 0.8);
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(x, y - s * 0.95, s * 1.7, s * 0.5);
  g.fillStyle(VERDIGRIS_DARK, 1); g.fillTriangle(x - s * 0.7, y - s * 1.0, x + s * 0.5, y - s * 1.0, x + s * 0.5, y - s * 2.6);
  g.fillStyle(VERDIGRIS, 1); g.fillTriangle(x - s * 0.55, y - s * 1.05, x + s * 0.42, y - s * 1.05, x + s * 0.42, y - s * 2.4);
  g.lineStyle(1.5, VERDIGRIS_LIT, 0.8); g.lineBetween(x - s * 0.55, y - s * 1.05, x + s * 0.42, y - s * 2.4);
}

/** The gnomon's shadow on the dial: a long wedge, darker at the root. `a` is its compass angle. */
export function dialShadow(g: G, cx: number, cy: number, R: number, a: number, squash = 0.62, alpha = 0.32): void {
  const tipX = cx + Math.cos(a) * R * 0.95, tipY = cy + Math.sin(a) * R * 0.95 * squash;
  const side = a + Math.PI / 2;
  g.fillStyle(0x1a2a14, alpha);
  g.fillTriangle(cx + Math.cos(side) * 7, cy + Math.sin(side) * 7 * squash, cx - Math.cos(side) * 7, cy - Math.sin(side) * 7 * squash, tipX, tipY);
  g.fillStyle(0x1a2a14, alpha * 0.7); g.fillEllipse(cx, cy, 22, 22 * squash);
}

// ── Set pieces (drawn at the piece's own y) ──────────────────────────

/**
 * A topiary animal on its plinth — yew clipped into a shape. `clips` (0–2) shows how much of
 * it has been hacked back: one clip loses the head, two is a stump.
 */
export type TopiaryKind = 'peacock' | 'bear' | 'hare' | 'swan' | 'spiral' | 'stag';

export function topiary(g: G, x: number, y: number, kind: TopiaryKind, s = 1, clips = 0, plinth = true): void {
  shadow(g, x, y + 2, 46 * s, 14 * s);
  if (plinth) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(x - 18 * s, y - 8 * s, 36 * s, 9 * s);
    g.fillStyle(STONE, 1); g.fillRect(x - 17 * s, y - 9 * s, 34 * s, 6 * s);
  }
  const by = y - (plinth ? 8 : 0) * s;
  const ball = (bx: number, byy: number, r: number, c = YEW) => {
    g.fillStyle(dim(c, 0.35), 1); g.fillCircle(bx, byy + 1.5, r);
    g.fillStyle(c, 1); g.fillCircle(bx, byy, r);
    g.fillStyle(YEW_LIT, 0.7); g.fillCircle(bx - r * 0.3, byy - r * 0.35, r * 0.45);
    // Leaf texture: little dark nicks.
    for (let i = 0; i < r / 2; i++) {
      const a = i * 2.4, d = r * 0.65;
      g.fillStyle(dim(c, 0.25), 0.7); g.fillRect(bx + Math.cos(a) * d * ((i % 3) / 3 + 0.3), byy + Math.sin(a) * d * ((i % 3) / 3 + 0.3), 2, 1.5);
    }
  };
  if (clips >= 2) {
    // A stump: hacked flat, pale cut wood showing.
    g.fillStyle(dim(YEW, 0.3), 1); g.fillRect(x - 12 * s, by - 14 * s, 24 * s, 14 * s);
    g.fillStyle(YEW, 1); g.fillRect(x - 11 * s, by - 13 * s, 22 * s, 12 * s);
    g.fillStyle(0xd8c49a, 1); g.fillEllipse(x, by - 14 * s, 22 * s, 7 * s);
    g.lineStyle(1, 0xa08a5a, 1); g.strokeEllipse(x, by - 14 * s, 12 * s, 4 * s);
    for (let i = 0; i < 4; i++) { g.lineStyle(1.5, THORN, 1); g.lineBetween(x - 9 * s + i * 6 * s, by - 14 * s, x - 10 * s + i * 6 * s, by - 20 * s); }
    return;
  }
  const head = clips === 0;
  switch (kind) {
    case 'peacock': {
      // A fanned tail of yew behind a round body and a little crested head.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        ball(x + Math.cos(a) * 20 * s, by - 30 * s + Math.sin(a) * 18 * s, 9 * s);
      }
      ball(x, by - 18 * s, 13 * s);
      if (head) { ball(x + 8 * s, by - 36 * s, 6 * s); g.fillStyle(YEW_LIT, 1); g.fillCircle(x + 10 * s, by - 44 * s, 2 * s); }
      break;
    }
    case 'bear': {
      ball(x, by - 16 * s, 16 * s);
      ball(x, by - 38 * s, 11 * s);
      if (head) { ball(x, by - 54 * s, 9 * s); ball(x - 7 * s, by - 62 * s, 3.5 * s); ball(x + 7 * s, by - 62 * s, 3.5 * s); }
      ball(x - 15 * s, by - 34 * s, 5 * s); ball(x + 15 * s, by - 34 * s, 5 * s);
      break;
    }
    case 'hare': {
      ball(x, by - 14 * s, 14 * s);
      ball(x + 12 * s, by - 8 * s, 6 * s);
      if (head) {
        ball(x - 6 * s, by - 32 * s, 8 * s);
        g.fillStyle(YEW, 1); g.fillEllipse(x - 10 * s, by - 48 * s, 6 * s, 18 * s); g.fillEllipse(x - 3 * s, by - 50 * s, 6 * s, 18 * s);
        g.fillStyle(YEW_LIT, 0.7); g.fillEllipse(x - 11 * s, by - 50 * s, 2 * s, 10 * s);
      }
      break;
    }
    case 'swan': {
      ball(x, by - 14 * s, 15 * s);
      ball(x - 12 * s, by - 18 * s, 8 * s);
      if (head) {
        g.lineStyle(7 * s, dim(YEW, 0.3), 1);
        g.beginPath(); g.arc(x + 12 * s, by - 30 * s, 12 * s, Math.PI * 0.9, Math.PI * 1.9, false); g.strokePath();
        g.lineStyle(6 * s, YEW, 1);
        g.beginPath(); g.arc(x + 12 * s, by - 31 * s, 12 * s, Math.PI * 0.9, Math.PI * 1.9, false); g.strokePath();
        ball(x + 22 * s, by - 36 * s, 4.5 * s);
      }
      break;
    }
    case 'stag': {
      ball(x, by - 18 * s, 14 * s); ball(x - 12 * s, by - 16 * s, 9 * s);
      if (head) {
        ball(x + 12 * s, by - 36 * s, 7 * s);
        g.lineStyle(2.5 * s, YEW, 1);
        g.lineBetween(x + 10 * s, by - 42 * s, x + 4 * s, by - 58 * s); g.lineBetween(x + 14 * s, by - 42 * s, x + 22 * s, by - 58 * s);
        g.lineBetween(x + 6 * s, by - 52 * s, x, by - 54 * s); g.lineBetween(x + 19 * s, by - 52 * s, x + 26 * s, by - 52 * s);
      }
      break;
    }
    case 'spiral': {
      for (let i = 0; i < 6; i++) ball(x + Math.sin(i * 1.3) * 5 * s, by - 10 * s - i * 11 * s, (14 - i * 1.8) * s);
      if (head) ball(x, by - 78 * s, 4 * s);
      break;
    }
  }
}

/**
 * A bell cloche: a glass bell with a knob on top, bright rims and a soft reflection. Draw what
 * is under it first; the glass goes over.
 */
export function cloche(g: G, x: number, y: number, r: number, fog = 0.18): void {
  const h = r * 1.5;
  g.fillStyle(GLASS, fog);
  g.fillEllipse(x, y - h * 0.62, r * 2, h * 1.25);
  g.fillRect(x - r, y - h * 0.62, r * 2, h * 0.62);
  g.lineStyle(2, GLASS_EDGE, 0.8);
  g.beginPath();
  g.moveTo(x - r, y);
  g.lineTo(x - r, y - h * 0.62);
  g.arc(x, y - h * 0.62, r, Math.PI, 0, false);
  g.lineTo(x + r, y);
  g.strokePath();
  g.lineStyle(2.5, GLASS_EDGE, 0.9); g.strokeEllipse(x, y, r * 2, r * 0.45);
  // Highlights: a long sheen down the left, a fleck on the dome.
  g.lineStyle(3, GLASS_LIT, 0.55); g.lineBetween(x - r * 0.62, y - h * 0.1, x - r * 0.62, y - h * 0.7);
  g.fillStyle(GLASS_LIT, 0.7); g.fillEllipse(x - r * 0.35, y - h * 1.02, r * 0.3, r * 0.14);
  g.fillStyle(GLASS_EDGE, 1); g.fillCircle(x, y - h * 1.24, Math.max(2, r * 0.12));
  g.fillStyle(GLASS_LIT, 0.9); g.fillCircle(x - 0.8, y - h * 1.24 - 0.8, Math.max(1, r * 0.05));
}

/** A rose bush in bloom (the thing usually under the cloche). */
export function roseBush(g: G, x: number, y: number, s: number, color: number, rng: () => number): void {
  g.lineStyle(2 * s, STEM, 1);
  for (let i = 0; i < 4; i++) g.lineBetween(x, y, x + (i - 1.5) * 6 * s, y - 16 * s - rng() * 6 * s);
  for (let i = 0; i < 8; i++) { g.fillStyle(LEAF, 1); g.fillEllipse(x + (rng() - 0.5) * 22 * s, y - 8 * s - rng() * 16 * s, 6 * s, 4 * s); }
  for (let i = 0; i < 5; i++) flower(g, x + (rng() - 0.5) * 20 * s, y - 14 * s - rng() * 12 * s, 4 * s, color, 'rose');
}

/** A clipped orange tree in a white-painted Versailles tub. */
export function orangeTub(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 36 * s, 10 * s);
  g.fillStyle(IRON_SHADE, 1); g.fillRect(x - 13 * s, y - 22 * s, 26 * s, 22 * s);
  g.fillStyle(IRON_WHITE, 1); g.fillRect(x - 12 * s, y - 22 * s, 22 * s, 21 * s);
  g.lineStyle(1.5 * s, VERDIGRIS, 1); g.strokeRect(x - 10 * s, y - 20 * s, 20 * s, 17 * s);
  for (const k of [-1, 1]) { g.fillStyle(VERDIGRIS, 1); g.fillCircle(x + k * 13 * s, y - 23 * s, 2.5 * s); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2 * s, y - 42 * s, 4 * s, 20 * s);
  g.fillStyle(dim(LEAF, 0.35), 1); g.fillCircle(x, y - 52 * s, 16 * s);
  g.fillStyle(dim(LEAF, 0.15), 1); g.fillCircle(x - 1, y - 54 * s, 14.5 * s);
  g.fillStyle(LEAF, 0.8); g.fillCircle(x - 5 * s, y - 58 * s, 7 * s);
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, d = rng() * 11 * s;
    g.fillStyle(ORANGE, 1); g.fillCircle(x + Math.cos(a) * d, y - 52 * s + Math.sin(a) * d, 2.4 * s);
    g.fillStyle(lit(ORANGE, 0.4), 1); g.fillCircle(x + Math.cos(a) * d - 0.7, y - 52 * s + Math.sin(a) * d - 0.7, 0.8 * s);
  }
}

/** A terracotta pot of flowers. */
export function flowerPot(g: G, x: number, y: number, s: number, color: number, rng: () => number): void {
  shadow(g, x, y + 1, 20 * s, 6 * s);
  g.fillStyle(TERRA_DARK, 1); g.fillTriangle(x - 9 * s, y - 16 * s, x + 9 * s, y - 16 * s, x + 6 * s, y);
  g.fillTriangle(x - 9 * s, y - 16 * s, x - 6 * s, y, x + 6 * s, y);
  g.fillStyle(TERRA, 1); g.fillTriangle(x - 8 * s, y - 15 * s, x + 7 * s, y - 15 * s, x + 5 * s, y - 1);
  g.fillTriangle(x - 8 * s, y - 15 * s, x - 5 * s, y - 1, x + 5 * s, y - 1);
  g.fillStyle(TERRA_LIT, 1); g.fillRect(x - 10 * s, y - 19 * s, 20 * s, 4 * s);
  for (let i = 0; i < 5; i++) { g.fillStyle(LEAF, 1); g.fillEllipse(x + (rng() - 0.5) * 16 * s, y - 21 * s - rng() * 5 * s, 6 * s, 4 * s); }
  for (let i = 0; i < 4; i++) flower(g, x + (rng() - 0.5) * 14 * s, y - 24 * s - rng() * 6 * s, 3 * s, color, 'daisy');
}

/** A stone urn on a plinth, trailing ivy and geraniums. */
export function urn(g: G, x: number, y: number, s: number, color: number): void {
  shadow(g, x, y + 2, 34 * s, 9 * s);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 12 * s, y - 26 * s, 24 * s, 26 * s);
  g.fillStyle(STONE, 1); g.fillRect(x - 11 * s, y - 26 * s, 20 * s, 25 * s);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 14 * s, y - 30 * s, 28 * s, 5 * s);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 4 * s, y - 38 * s, 8 * s, 9 * s);
  g.fillStyle(STONE, 1); g.fillEllipse(x, y - 46 * s, 30 * s, 18 * s);
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(x, y - 52 * s, 30 * s, 7 * s);
  for (let i = 0; i < 7; i++) flower(g, x - 12 * s + i * 4 * s, y - 56 * s - (i % 2) * 4 * s, 3.2 * s, color, 'daisy');
  g.lineStyle(1.8 * s, STEM, 1);
  g.beginPath(); g.moveTo(x - 13 * s, y - 50 * s); g.lineTo(x - 17 * s, y - 40 * s); g.lineTo(x - 15 * s, y - 30 * s); g.strokePath();
  for (const yy of [-44, -36]) { g.fillStyle(LEAF, 1); g.fillEllipse(x - 16 * s, y + yy * s, 5 * s, 3.5 * s); }
}

/** A pleached lime: a clipped box of leaves on a bare grey trunk — the walks are lined with them. */
export function pleachedLime(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 30 * s, 9 * s);
  g.fillStyle(0x7a7468, 1); g.fillRect(x - 3 * s, y - 48 * s, 6 * s, 48 * s);
  g.fillStyle(0x9a9284, 1); g.fillRect(x - 3 * s, y - 48 * s, 2 * s, 48 * s);
  g.fillStyle(dim(LEAF, 0.4), 1); g.fillRect(x - 22 * s, y - 86 * s, 44 * s, 40 * s);
  g.fillStyle(dim(LEAF, 0.15), 1); g.fillRect(x - 21 * s, y - 88 * s, 42 * s, 38 * s);
  g.fillStyle(LEAF, 0.7); g.fillRect(x - 21 * s, y - 88 * s, 42 * s, 6 * s);
  for (let i = 0; i < 16; i++) {
    g.fillStyle(i % 2 ? LEAF : dim(LEAF, 0.3), 0.7);
    g.fillEllipse(x - 18 * s + (i % 4) * 12 * s, y - 80 * s + Math.floor(i / 4) * 9 * s, 7 * s, 4 * s);
  }
  // Lime flowers: the pollen the Pollinarium sells.
  for (let i = 0; i < 6; i++) { g.fillStyle(0xe8e09a, 0.9); g.fillCircle(x - 16 * s + i * 6.5 * s, y - 52 * s + (i % 2) * 3 * s, 1.6 * s); }
}

/** A tall yew hedge block, flat-topped, with a front face — the court's walls. */
export function yewWall(g: G, x0: number, y: number, w: number, h: number): void {
  g.fillStyle(0x000000, 0.22); g.fillRect(x0, y, w, 8);
  g.fillStyle(dim(YEW, 0.25), 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(YEW, 1); g.fillRect(x0, y - h - 16, w, 18);
  g.fillStyle(YEW_LIT, 0.8); g.fillRect(x0, y - h - 16, w, 3);
  for (let x = x0 + 6; x < x0 + w; x += 9) {
    g.fillStyle(dim(YEW, 0.45), 0.6); g.fillRect(x, y - h + 4 + ((x * 7) % 13), 2, 2);
    g.fillStyle(YEW_LIT, 0.25); g.fillRect(x + 3, y - h + 12 + ((x * 3) % 17), 2, 1.5);
  }
}

/** A rose arch over a walk: two white iron posts and a hoop smothered in climbing roses. */
export function roseArch(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  for (const k of [-1, 1]) {
    shadow(g, x + k * w / 2, y + 1, 16, 5);
    g.fillStyle(IRON_SHADE, 1); g.fillRect(x + k * w / 2 - 3, y - h, 6, h);
    g.fillStyle(IRON_WHITE, 1); g.fillRect(x + k * w / 2 - 2, y - h, 3, h);
  }
  g.lineStyle(6, IRON_SHADE, 1); g.beginPath(); g.arc(x, y - h, w / 2, Math.PI, 0, false); g.strokePath();
  g.lineStyle(3, IRON_WHITE, 1); g.beginPath(); g.arc(x, y - h, w / 2, Math.PI, 0, false); g.strokePath();
  for (let i = 0; i < 46; i++) {
    const t = rng();
    let px: number, py: number;
    if (t < 0.6) { const a = Math.PI + (t / 0.6) * Math.PI; px = x + Math.cos(a) * w / 2; py = y - h + Math.sin(a) * w / 2; }
    else { const k = rng() < 0.5 ? -1 : 1; px = x + k * w / 2; py = y - h + rng() * h * 0.9; }
    g.fillStyle(rng() < 0.5 ? LEAF : dim(LEAF, 0.3), 1); g.fillEllipse(px + (rng() - 0.5) * 8, py + (rng() - 0.5) * 8, 7, 5);
    if (rng() < 0.45) flower(g, px + (rng() - 0.5) * 6, py + (rng() - 0.5) * 6, 3.4, rng() < 0.6 ? BLOOM_RED : BLOOM_PINK, 'rose');
  }
}

/** The tiered fountain: a low stone basin, a pedestal, a bowl, a stone lily at the top. */
export function fountain(g: G, x: number, y: number, r: number): void {
  shadow(g, x, y + 4, r * 2.3, r * 0.7);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y, r * 2.1, r * 0.95);
  g.fillStyle(STONE, 1); g.fillEllipse(x, y - 4, r * 2.1, r * 0.9);
  g.fillStyle(POND_DEEP, 1); g.fillEllipse(x, y - 4, r * 1.8, r * 0.72);
  g.fillStyle(POND, 1); g.fillEllipse(x, y - 3, r * 1.6, r * 0.6);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 8, y - 46, 16, 42);
  g.fillStyle(STONE, 1); g.fillRect(x - 7, y - 46, 12, 42);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y - 48, r * 1.0, r * 0.32);
  g.fillStyle(STONE, 1); g.fillEllipse(x, y - 51, r * 0.95, r * 0.28);
  g.fillStyle(POND, 1); g.fillEllipse(x, y - 52, r * 0.78, r * 0.18);
  // The stone lily the jet rises from.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillStyle(STONE_LIT, 1); g.fillEllipse(x + Math.cos(a) * 6, y - 62 + Math.sin(a) * 2.5, 7, 9);
  }
  g.fillStyle(VERDIGRIS, 1); g.fillCircle(x, y - 64, 3);
}

/** The fountain's water, animated: a central jet, the bowl's sheet spilling over, rings below. */
export function fountainWater(g: G, x: number, y: number, r: number, t: number): void {
  const jetH = 44 + Math.sin(t * 3.1) * 4;
  g.lineStyle(4, POND_LIT, 0.55); g.lineBetween(x, y - 64, x, y - 64 - jetH);
  g.lineStyle(1.5, 0xffffff, 0.6); g.lineBetween(x - 1, y - 66, x - 1, y - 60 - jetH);
  for (let i = 0; i < 10; i++) {
    const ph = (t * 1.2 + i / 10) % 1;
    const a = (i / 10) * Math.PI * 2;
    const px = x + Math.cos(a) * ph * r * 0.5, py = y - 64 - jetH + ph * ph * (jetH + 12) + Math.sin(a) * ph * 4;
    g.fillStyle(POND_LIT, 0.7 * (1 - ph)); g.fillCircle(px, py, 1.8);
  }
  // Sheet off the bowl's lip.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ph = (t * 1.6 + i * 0.13) % 1;
    const sx = x + Math.cos(a) * r * 0.48, sy = y - 51 + Math.sin(a) * r * 0.14;
    g.fillStyle(POND_LIT, 0.45 * (1 - ph)); g.fillCircle(sx + Math.cos(a) * ph * 4, sy + ph * 40, 1.6);
  }
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.5 + i / 3) % 1;
    g.lineStyle(1.2, POND_LIT, 0.5 * (1 - ph)); g.strokeEllipse(x, y - 3, r * (0.4 + ph * 1.1), r * (0.15 + ph * 0.42));
  }
}

/**
 * A potting shed: weatherboard timber with a lean-to of glass frames on its sunny side, terracotta
 * pots stacked by the door, seed trays on a bench and a grafting knife hung on a nail.
 */
export function pottingShed(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.2, 20);
  const x0 = x - w / 2;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 2, y - h - 2, w * 0.66 + 4, h + 2);
  g.fillStyle(TIMBER, 1); g.fillRect(x0, y - h, w * 0.66, h);
  for (let yy = y - h + 7; yy < y; yy += 8) { g.fillStyle(TIMBER_DARK, 0.5); g.fillRect(x0, yy, w * 0.66, 1.4); g.fillStyle(TIMBER_LIT, 0.3); g.fillRect(x0, yy + 1.4, w * 0.66, 1); }
  // Pitched felt roof.
  g.fillStyle(0x3a3a38, 1); g.fillTriangle(x0 - 10, y - h + 2, x0 + w * 0.66 + 10, y - h + 2, x0 + w * 0.33, y - h - h * 0.5);
  g.fillStyle(0x4c4c48, 1); g.fillTriangle(x0 - 6, y - h, x0 + w * 0.66 + 6, y - h, x0 + w * 0.33, y - h - h * 0.46);
  // Door, ajar, and a window of four panes.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + w * 0.12, y - h * 0.72, w * 0.18, h * 0.72);
  g.fillStyle(0x221a12, 1); g.fillRect(x0 + w * 0.12, y - h * 0.72, w * 0.05, h * 0.72);
  g.fillStyle(GLASS, 0.8); g.fillRect(x0 + w * 0.4, y - h * 0.7, w * 0.18, h * 0.3);
  g.lineStyle(1.5, IRON_WHITE, 1); g.strokeRect(x0 + w * 0.4, y - h * 0.7, w * 0.18, h * 0.3);
  g.lineBetween(x0 + w * 0.49, y - h * 0.7, x0 + w * 0.49, y - h * 0.4); g.lineBetween(x0 + w * 0.4, y - h * 0.55, x0 + w * 0.58, y - h * 0.55);
  // The glass lean-to.
  const lx = x0 + w * 0.66, lw = w * 0.34;
  g.fillStyle(GLASS, 0.35); g.fillRect(lx, y - h * 0.7, lw, h * 0.7);
  g.fillStyle(GLASS, 0.5); g.fillTriangle(lx, y - h * 0.7, lx, y - h * 1.0, lx + lw, y - h * 0.7);
  g.lineStyle(2, IRON_WHITE, 0.95);
  g.strokeRect(lx, y - h * 0.7, lw, h * 0.7);
  g.lineBetween(lx, y - h, lx + lw, y - h * 0.7);
  for (let k = 1; k < 3; k++) g.lineBetween(lx + (lw * k) / 3, y - h * 0.7, lx + (lw * k) / 3, y);
  // Seedlings on staging inside the glass.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(lx + 3, y - h * 0.32, lw - 6, 3);
  for (let i = 0; i < 6; i++) { g.fillStyle(LEAF, 1); g.fillEllipse(lx + 8 + i * (lw - 16) / 5, y - h * 0.36, 5, 4); }
  // Pots stacked by the door.
  for (let i = 0; i < 4; i++) {
    const px = x0 - 14, py = y - i * 7;
    g.fillStyle(TERRA_DARK, 1); g.fillRect(px - 8 + i, py - 7, 16 - i * 2, 7);
    g.fillStyle(TERRA, 1); g.fillRect(px - 7 + i, py - 7, 14 - i * 2, 5);
  }
  // A grafting knife on a nail.
  g.fillStyle(0x2a2a2a, 1); g.fillCircle(x0 + w * 0.36, y - h * 0.82, 1.4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + w * 0.355, y - h * 0.81, 2.5, 8);
  g.fillStyle(0xd8dade, 1); g.fillTriangle(x0 + w * 0.36, y - h * 0.81 + 8, x0 + w * 0.36 + 2.5, y - h * 0.81 + 8, x0 + w * 0.36 + 1.5, y - h * 0.81 + 16);
  // Seed trays on a bench outside.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + w * 0.68, y - 14, lw - 4, 4); g.fillRect(x0 + w * 0.7, y - 10, 3, 10); g.fillRect(x0 + w - 8, y - 10, 3, 10);
  for (let i = 0; i < 3; i++) {
    g.fillStyle(SOIL, 1); g.fillRect(x0 + w * 0.7 + i * (lw / 3.3), y - 20, lw / 3.6, 6);
    for (let k = 0; k < 3; k++) { g.fillStyle(LEAF, 1); g.fillCircle(x0 + w * 0.71 + i * (lw / 3.3) + k * 4 + rng(), y - 21, 1.6); }
  }
}

/**
 * Prince Petalis's orangery: a long hall of white iron and glass on a stone plinth, tall arched
 * lights, a glass dome at its centre with a gilt rose on the finial, orange trees seen through
 * every pane, and the Empress's verdigris seal over the door.
 */
export function orangery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.08, 30);
  const x0 = x - w / 2;
  // Plinth.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 8, y - 22, w + 16, 22);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 6, y - 24, w + 12, 18);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 6, y - 24, w + 12, 3);
  // Glazed walls: a back glow of leaves and oranges behind the glass.
  const wallTop = y - 24 - h;
  g.fillStyle(dim(LEAF, 0.45), 1); g.fillRect(x0, wallTop, w, h);
  for (let i = 0; i < w / 18; i++) {
    const tx = x0 + 10 + rng() * (w - 20), ty = wallTop + h * 0.25 + rng() * h * 0.55;
    g.fillStyle(dim(LEAF, 0.2 + rng() * 0.2), 1); g.fillCircle(tx, ty, 12 + rng() * 10);
    if (rng() < 0.7) { g.fillStyle(ORANGE, 0.9); g.fillCircle(tx + (rng() - 0.5) * 12, ty + (rng() - 0.5) * 10, 2.6); }
  }
  g.fillStyle(GLASS, 0.32); g.fillRect(x0, wallTop, w, h);
  // Arched lights in white iron.
  const bays = Math.round(w / 52);
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + i * bw;
    g.lineStyle(4, IRON_SHADE, 1); g.strokeRect(bx, wallTop, bw, h);
    g.lineStyle(2.5, IRON_WHITE, 1); g.strokeRect(bx + 1, wallTop + 1, bw - 2, h - 2);
    g.lineStyle(2, IRON_WHITE, 1);
    g.beginPath(); g.arc(bx + bw / 2, wallTop + h * 0.32, bw / 2 - 5, Math.PI, 0, false); g.strokePath();
    g.lineBetween(bx + bw / 2, wallTop + h * 0.32 - (bw / 2 - 5), bx + bw / 2, wallTop + h);
    g.lineBetween(bx + 5, wallTop + h * 0.62, bx + bw - 5, wallTop + h * 0.62);
    g.fillStyle(GLASS_LIT, 0.35); g.fillRect(bx + 6, wallTop + h * 0.36, 3, h * 0.5);
  }
  // Cornice and a balustrade along the roof.
  g.fillStyle(IRON_SHADE, 1); g.fillRect(x0 - 6, wallTop - 10, w + 12, 10);
  g.fillStyle(IRON_WHITE, 1); g.fillRect(x0 - 6, wallTop - 12, w + 12, 6);
  for (let bx = x0; bx < x0 + w; bx += 14) { g.fillStyle(IRON_WHITE, 1); g.fillRect(bx, wallTop - 24, 3, 12); }
  g.fillStyle(IRON_WHITE, 1); g.fillRect(x0 - 6, wallTop - 26, w + 12, 3);
  // Glass roof ridges behind the balustrade.
  g.fillStyle(GLASS, 0.4); g.fillTriangle(x0 + 10, wallTop - 24, x0 + w - 10, wallTop - 24, x + 0, wallTop - 60);
  g.lineStyle(1.5, IRON_WHITE, 0.8);
  for (let k = 0; k <= 10; k++) g.lineBetween(x0 + 10 + ((w - 20) * k) / 10, wallTop - 24, x, wallTop - 60);
  // The dome.
  const dr = Math.min(110, w * 0.17);
  g.fillStyle(IRON_SHADE, 1); g.fillRect(x - dr - 6, wallTop - 40, dr * 2 + 12, 18);
  g.fillStyle(dim(LEAF, 0.4), 1); g.fillEllipse(x, wallTop - 40, dr * 2, dr * 1.7);
  g.fillStyle(ORANGE, 0.8); for (let i = 0; i < 9; i++) g.fillCircle(x - dr * 0.6 + rng() * dr * 1.2, wallTop - 40 - rng() * dr * 0.6, 3);
  g.fillStyle(GLASS, 0.35); g.fillEllipse(x, wallTop - 40, dr * 2, dr * 1.7);
  g.lineStyle(2.5, IRON_WHITE, 1);
  g.beginPath(); g.arc(x, wallTop - 40, dr, Math.PI, 0, false); g.strokePath();
  for (let k = 1; k < 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    g.lineBetween(x + Math.cos(a) * dr, wallTop - 40 + Math.sin(a) * dr * 0.85, x, wallTop - 40 - dr * 0.85);
  }
  g.lineStyle(1.5, IRON_WHITE, 0.8); g.strokeEllipse(x, wallTop - 40 - dr * 0.4, dr * 1.4, dr * 0.3);
  // The finial: a gilt rose.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2, wallTop - 40 - dr * 0.85 - 18, 4, 18);
  flower(g, x, wallTop - 40 - dr * 0.85 - 22, 8, BRASS, 'rose');
  g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(x - 2, wallTop - 40 - dr * 0.85 - 24, 2);
  // The door: double glazed doors under a pediment carrying the Empress's seal.
  g.fillStyle(IRON_SHADE, 1); g.fillRect(x - 34, y - 24 - h * 0.78, 68, h * 0.78);
  g.fillStyle(0x24361f, 1); g.fillRect(x - 30, y - 24 - h * 0.74, 60, h * 0.74);
  g.fillStyle(GLASS, 0.3); g.fillRect(x - 28, y - 24 - h * 0.72, 26, h * 0.7); g.fillRect(x + 2, y - 24 - h * 0.72, 26, h * 0.7);
  g.lineStyle(2, IRON_WHITE, 1); g.lineBetween(x, y - 24 - h * 0.74, x, y - 24);
  g.fillStyle(IRON_WHITE, 1); g.fillTriangle(x - 42, y - 24 - h * 0.78, x + 42, y - 24 - h * 0.78, x, y - 24 - h * 0.78 - 26);
  empressSeal(g, x, y - 24 - h * 0.78 - 9, 8);
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x - 46 - k * 6, y - 8 + k * 4, 92 + k * 12, 5); }
}

/** The Empress's seal: a verdigris rose inside a ring of thorns. Bloom paints it on everything she owns. */
export function empressSeal(g: G, x: number, y: number, r: number, a = 1): void {
  g.fillStyle(VERDIGRIS_DARK, a); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(VERDIGRIS, a); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.14), VERDIGRIS_LIT, a);
  g.beginPath(); g.arc(x, y, r * 0.5, 0, Math.PI * 1.6, false); g.strokePath();
  g.fillStyle(VERDIGRIS_DARK, a);
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    g.fillTriangle(x + Math.cos(t) * r, y + Math.sin(t) * r, x + Math.cos(t + 0.18) * r * 0.86, y + Math.sin(t + 0.18) * r * 0.86, x + Math.cos(t + 0.09) * (r + r * 0.4), y + Math.sin(t + 0.09) * (r + r * 0.4));
  }
}

/**
 * The tithe balance: a great brass beam-scale on a verdigris plinth. One pan carries a household's
 * basket; the other a stack of the Empress's iron weights. Today's pans are not level.
 */
export function titheScales(g: G, x: number, y: number, tilt = 0.12): void {
  shadow(g, x, y + 4, 150, 30);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 50, y - 18, 100, 18);
  g.fillStyle(STONE, 1); g.fillRect(x - 48, y - 20, 96, 14);
  g.fillStyle(VERDIGRIS_DARK, 1); g.fillRect(x - 8, y - 140, 16, 122);
  g.fillStyle(VERDIGRIS, 1); g.fillRect(x - 6, y - 140, 10, 122);
  empressSeal(g, x, y - 62, 9);
  // The beam.
  const bx = Math.cos(tilt) * 84, byy = Math.sin(tilt) * 84;
  const py = y - 146;
  g.lineStyle(7, BRASS_DARK, 1); g.lineBetween(x - bx, py - byy, x + bx, py + byy);
  g.lineStyle(4, BRASS, 1); g.lineBetween(x - bx, py - byy - 1, x + bx, py + byy - 1);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, py, 6);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 4, py - 4, x + 4, py - 4, x, py - 22);
  // Pans on chains.
  for (const k of [-1, 1]) {
    const hx = x + k * bx, hy = py + k * byy;
    const panY = hy + 58;
    g.lineStyle(1.2, BRASS_DARK, 1);
    g.lineBetween(hx, hy, hx - 22, panY); g.lineBetween(hx, hy, hx + 22, panY); g.lineBetween(hx, hy, hx, panY);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(hx, panY + 2, 54, 14);
    g.fillStyle(BRASS, 1); g.fillEllipse(hx, panY, 52, 11);
    if (k < 0) {
      // The basket: a household's measure of flowers, a little short.
      g.fillStyle(TIMBER, 1); g.fillRect(hx - 18, panY - 16, 36, 14);
      g.lineStyle(1, TIMBER_DARK, 1); for (let i = 0; i < 6; i++) g.lineBetween(hx - 18 + i * 7, panY - 16, hx - 18 + i * 7, panY - 2);
      for (let i = 0; i < 5; i++) flower(g, hx - 14 + i * 7, panY - 18 - (i % 2) * 3, 3.5, [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_PINK, BLOOM_WHITE][i], 'daisy');
    } else {
      for (let i = 0; i < 3; i++) {
        g.fillStyle(0x3a3a3c, 1); g.fillRect(hx - 14 + i * 2, panY - 10 - i * 9, 28 - i * 4, 9);
        g.fillStyle(0x56565a, 1); g.fillRect(hx - 13 + i * 2, panY - 10 - i * 9, 26 - i * 4, 2);
      }
      g.fillStyle(0x3a3a3c, 1); g.fillRect(hx - 2, panY - 40, 4, 4);
    }
  }
}

/** The prune list: a verdigris-framed board of names under glass, some struck through in red. */
export function pruneBoard(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 12);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 24 - 2, y - 64, 4, 64); }
  g.fillStyle(VERDIGRIS_DARK, 1); g.fillRect(x - 30, y - 92, 60, 44);
  g.fillStyle(BLOOM_WHITE, 1); g.fillRect(x - 26, y - 88, 52, 36);
  for (let i = 0; i < 7; i++) {
    const yy = y - 84 + i * 4.8;
    g.lineStyle(1, 0x3a3a3a, 0.8); g.lineBetween(x - 22, yy, x - 22 + 18 + ((i * 13) % 20), yy);
    if (i % 3 === 1) { g.lineStyle(1.4, 0xc0242e, 1); g.lineBetween(x - 24, yy, x + 18, yy); }
  }
  g.fillStyle(GLASS, 0.25); g.fillRect(x - 26, y - 88, 52, 36);
  g.lineStyle(2, GLASS_LIT, 0.4); g.lineBetween(x - 20, y - 86, x - 10, y - 56);
  g.fillStyle(VERDIGRIS, 1); g.fillTriangle(x - 34, y - 92, x + 34, y - 92, x, y - 104);
  empressSeal(g, x, y - 96, 4);
}

/**
 * The pruning cart: a high-wheeled garden cart with a cage of woven willow on its bed, a pair of
 * long-handled shears strapped to the side and a verdigris tag on the door. It takes the short
 * north to the Glasshouse.
 */
export function pruningCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 140, 22);
  // Bed and shafts.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 56, y - 34, 112, 12);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 54, y - 36, 108, 9);
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x + 54, y - 28, x + 96, y - 10); g.lineBetween(x + 54, y - 22, x + 96, y - 4);
  // The willow cage.
  g.fillStyle(0x6a5838, 0.25); g.fillRect(x - 50, y - 90, 100, 54);
  g.lineStyle(2.5, 0x9a8456, 1);
  for (let i = 0; i <= 10; i++) g.lineBetween(x - 50 + i * 10, y - 36, x - 50 + i * 10, y - 88);
  g.lineStyle(2, 0x7a6640, 1);
  for (let k = 0; k < 4; k++) {
    g.beginPath(); g.moveTo(x - 50, y - 44 - k * 13);
    for (let i = 0; i <= 10; i++) g.lineTo(x - 50 + i * 10, y - 44 - k * 13 + (i % 2 ? 3 : -3));
    g.strokePath();
  }
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 54, y - 90, x + 54, y - 90);
  // Shears strapped along the side.
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 46, y - 26, x + 10, y - 20); g.lineBetween(x - 46, y - 20, x + 10, y - 26);
  g.fillStyle(0xc8ccd2, 1); g.fillTriangle(x + 10, y - 26, x + 10, y - 18, x + 40, y - 24); g.fillTriangle(x + 10, y - 24, x + 10, y - 20, x + 38, y - 17);
  // The tag.
  g.fillStyle(VERDIGRIS, 1); g.fillRect(x - 8, y - 70, 16, 11);
  empressSeal(g, x, y - 64, 3);
  // Wheels.
  for (const wx of [x - 34, x + 34]) {
    g.lineStyle(5, TIMBER_DARK, 1); g.strokeCircle(wx, y - 12, 14);
    g.lineStyle(2, TIMBER, 1); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineBetween(wx, y - 12, wx + Math.cos(a) * 13, y - 12 + Math.sin(a) * 13); }
    g.fillStyle(0x3a3a3a, 1); g.fillCircle(wx, y - 12, 3);
  }
}

/** The Bloom waystone: a squat standing stone wreathed in ivy, a carved flower glowing on its face. */
export function bloomWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 14);
  g.fillStyle(STONE_DARK, 1);
  g.fillPoints([P(x - 17, y), P(x - 20, y - 40), P(x - 10, y - 60), P(x + 9, y - 62), P(x + 19, y - 42), P(x + 16, y)], true);
  g.fillStyle(STONE, 1);
  g.fillPoints([P(x - 14, y - 2), P(x - 17, y - 40), P(x - 8, y - 57), P(x + 7, y - 59), P(x + 15, y - 41), P(x + 13, y - 2)], true);
  glow(g, x, y - 34, 16, VERDIGRIS_LIT, 0.06, 3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillStyle(VERDIGRIS_LIT, 0.9); g.fillEllipse(x + Math.cos(a) * 5, y - 34 + Math.sin(a) * 5, 5, 5);
  }
  g.fillStyle(STAMEN, 1); g.fillCircle(x, y - 34, 2.5);
  // Ivy climbing it.
  g.lineStyle(1.5, STEM, 1);
  g.beginPath(); g.moveTo(x - 15, y); g.lineTo(x - 12, y - 14); g.lineTo(x - 16, y - 28); g.lineTo(x - 9, y - 46); g.lineTo(x - 2, y - 56); g.strokePath();
  for (const [ix, iy] of [[-13, -8], [-14, -22], [-12, -36], [-6, -50], [-15, -30]] as [number, number][]) {
    g.fillStyle(BOX_LIT, 1); g.fillTriangle(x + ix - 3, y + iy, x + ix + 3, y + iy, x + ix, y + iy - 5);
  }
}

/** Hesketh Dibble's seed stall: a striped awning, drawers of seed packets, sacks of bulbs. */
export function seedStall(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 150, 20);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 64, y - 46, 128, 46);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 62, y - 46, 124, 42);
  // Drawers of seed, each with a little painted flower on the front.
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 6; c++) {
      const dx = x - 58 + c * 20, dy = y - 42 + r * 18;
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(dx, dy, 17, 15);
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(dx + 8.5, dy + 11, 1.2);
      flower(g, dx + 8.5, dy + 6, 3, [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_PINK, BLOOM_WHITE, 0x5a86d8][(c + r) % 6], 'daisy');
    }
  }
  // Posts and a striped awning.
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 64 - 2, y - 100, 4, 56); }
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? BLOOM_WHITE : VERDIGRIS, 1);
    g.fillRect(x - 72 + i * 18, y - 112, 18, 16);
    g.fillTriangle(x - 72 + i * 18, y - 96, x - 54 + i * 18, y - 96, x - 63 + i * 18, y - 88);
  }
  g.fillStyle(VERDIGRIS_DARK, 1); g.fillRect(x - 74, y - 114, 148, 3);
  // Seed packets pegged along a string under the awning.
  g.lineStyle(1, 0x5a4a3a, 1); g.lineBetween(x - 60, y - 84, x + 60, y - 84);
  for (let i = 0; i < 8; i++) {
    const px = x - 54 + i * 15;
    g.fillStyle(BLOOM_WHITE, 1); g.fillRect(px - 5, y - 83, 10, 13);
    flower(g, px, y - 77, 2.6, [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_PINK][i % 4], i % 2 ? 'tulip' : 'daisy');
  }
  // Sacks of bulbs on the ground.
  for (const [sx, c] of [[x - 82, 0xb89a6a], [x + 82, 0xa88a5a]] as [number, number][]) {
    g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(sx, y - 12, 30, 26);
    g.fillStyle(c, 1); g.fillEllipse(sx, y - 14, 26, 24);
    for (let i = 0; i < 5; i++) { g.fillStyle(0xd8c49a, 1); g.fillCircle(sx - 8 + rng() * 16, y - 24 - rng() * 4, 3); }
  }
}

/** A white garden bench. */
export function bench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 10);
  g.fillStyle(IRON_SHADE, 1); g.fillRect(x - 32, y - 16, 64, 4); g.fillRect(x - 30, y - 12, 3, 12); g.fillRect(x + 27, y - 12, 3, 12);
  g.fillStyle(IRON_WHITE, 1); g.fillRect(x - 32, y - 18, 64, 3);
  for (let i = 0; i < 9; i++) g.fillRect(x - 30 + i * 7.5, y - 34, 2, 16);
  g.fillRect(x - 32, y - 36, 64, 3);
}

/** A beehive skep on a stand — the Pollinarium keeps a few. */
export function skep(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 34, 9);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 16, y - 14, 32, 4); g.fillRect(x - 13, y - 10, 3, 10); g.fillRect(x + 10, y - 10, 3, 10);
  for (let k = 0; k < 5; k++) {
    const w = 26 - k * 4.5;
    g.fillStyle(k % 2 ? 0xc9a456 : 0xb08a3e, 1); g.fillEllipse(x, y - 18 - k * 6, w, 9);
  }
  g.fillStyle(0x2a1e10, 1); g.fillEllipse(x, y - 17, 7, 4);
}

// ── Animated life ───────────────────────────────────────────────────

/** Cabbage-whites and red admirals working the beds. */
export function butterflies(g: G, cx: number, cy: number, t: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const s = seed + i * 2.7;
    const x = cx + Math.sin(t * 0.5 + s) * 90 + Math.sin(t * 1.3 + s * 2) * 30;
    const y = cy + Math.cos(t * 0.4 + s) * 50 + Math.sin(t * 1.7 + s) * 14;
    const flap = Math.abs(Math.sin(t * 14 + s));
    const c = i % 3 === 0 ? 0xc0422e : i % 3 === 1 ? BLOOM_WHITE : BLOOM_GOLD;
    g.fillStyle(c, 0.95);
    g.fillEllipse(x - 3 * flap, y, 5 * flap + 1, 6);
    g.fillEllipse(x + 3 * flap, y, 5 * flap + 1, 6);
    g.fillStyle(0x222222, 1); g.fillRect(x - 0.5, y - 3, 1, 6);
  }
}

/** Bees in a loose cloud round a point. */
export function bees(g: G, cx: number, cy: number, t: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = t * (1.8 + (i % 3) * 0.4) + i * 2.1;
    const x = cx + Math.cos(a) * (14 + (i % 4) * 6), y = cy + Math.sin(a * 1.3) * (9 + (i % 3) * 4);
    g.fillStyle(0xf2c232, 1); g.fillEllipse(x, y, 4, 3);
    g.fillStyle(0x2a1e10, 1); g.fillRect(x - 0.5, y - 1.5, 1, 3);
    g.fillStyle(0xffffff, 0.6); g.fillEllipse(x, y - 2, 3, 2);
  }
}

/** A fallen petal drifting (prince arena + weather accents). */
export function petal(g: G, x: number, y: number, s: number, a: number, color = PETALIS, alpha = 1): void {
  const c = Math.cos(a), si = Math.sin(a);
  g.fillStyle(dim(color, 0.2), alpha);
  g.fillPoints([P(x - c * 4 * s, y - si * 4 * s), P(x - si * 2.6 * s, y + c * 2.6 * s), P(x + c * 4 * s, y + si * 4 * s), P(x + si * 2.6 * s, y - c * 2.6 * s)], true);
  g.fillStyle(lit(color, 0.2), alpha * 0.8); g.fillCircle(x - c * 1.5 * s, y - si * 1.5 * s, 1.2 * s);
}

/** A bare thorn stem: a curving brown cane studded with hooked thorns. */
export function thornStem(g: G, pts: Pt[], w: number, alpha = 1): void {
  g.lineStyle(w + 2, THORN_DARK, alpha);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.strokePath();
  g.lineStyle(w, THORN, alpha);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.strokePath();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const side = i % 2 ? 1 : -1;
    const nx = Math.cos(ang + side * Math.PI / 2), ny = Math.sin(ang + side * Math.PI / 2);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    g.fillStyle(THORN_DARK, alpha);
    g.fillTriangle(mx - Math.cos(ang) * w * 0.6, my - Math.sin(ang) * w * 0.6, mx + Math.cos(ang) * w * 0.6, my + Math.sin(ang) * w * 0.6, mx + nx * w * 1.8 - Math.cos(ang) * w, my + ny * w * 1.8 - Math.sin(ang) * w);
  }
}

/** A rose of Petalis's own colour — the big one, with layered petals, for his decor and arena. */
export function bigRose(g: G, x: number, y: number, r: number, color = PETALIS, open = 1): void {
  const rings = 3;
  for (let k = 0; k < rings; k++) {
    const rr = r * (1 - k * 0.28) * (0.6 + open * 0.4);
    const n = 6 - k;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.5;
      g.fillStyle(k === 0 ? dim(color, 0.2) : k === 1 ? color : lit(color, 0.2), 1);
      g.fillEllipse(x + Math.cos(a) * rr * 0.5, y + Math.sin(a) * rr * 0.45, rr * 0.95, rr * 0.8);
    }
  }
  g.fillStyle(PETALIS_DARK, 1); g.fillCircle(x, y, r * 0.18);
  g.lineStyle(Math.max(1, r * 0.06), PETALIS_LIT, 0.6);
  g.beginPath(); g.arc(x, y, r * 0.26, 0, Math.PI * 1.4, false); g.strokePath();
}

/** Glass-cloche glints for `animate`: a sliding sparkle across the dome. */
export function clocheGlint(g: G, x: number, y: number, r: number, t: number, seed: number): void {
  const ph = ((t * 0.22 + seed) % 1);
  if (ph > 0.25) return;
  const k = ph / 0.25;
  const h = r * 1.5;
  const gx = x - r * 0.7 + k * r * 1.4;
  g.fillStyle(GLASS_LIT, 0.6 * Math.sin(k * Math.PI));
  g.fillEllipse(gx, y - h * 0.85 - Math.sin(k * Math.PI) * r * 0.2, 4, 10);
}

/** A wilted, dead-headed spray (the thin stripes, the Wilt phase). */
export function deadSpray(g: G, x: number, y: number, s: number): void {
  g.lineStyle(1.5 * s, WILT, 1);
  g.lineBetween(x, y, x - 3 * s, y - 10 * s); g.lineBetween(x, y, x + 4 * s, y - 9 * s); g.lineBetween(x, y, x, y - 13 * s);
  g.fillStyle(dim(WILT, 0.3), 1); g.fillCircle(x - 3 * s, y - 11 * s, 1.6 * s); g.fillCircle(x + 4 * s, y - 10 * s, 1.4 * s);
  g.fillStyle(PETALIS_DARK, 0.6); g.fillEllipse(x + 1, y - 14 * s, 3 * s, 2 * s);
}

