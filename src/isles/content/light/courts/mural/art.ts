import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  CADMIUM, CANVAS, CANVAS_DARK, GLASS, GLASS_EDGE, GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, LAMPBLACK,
  LIME_DRY, LIME_SHADE, LIME_WET, MADDER, OCHRE, PAVE, PAVE_DARK, PAVE_LIT, PIGMENTS, ROPE, SKY, SKY_LIT, STONE,
  STONE_DARK, STONE_DEEP, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, ULTRAMARINE, ULTRA_DARK, UMBER, VERMILION,
  VERMILION_DARK, VIOLET, VIRIDIAN,
} from './palette';

/**
 * Mural set pieces — the shapes only a painters' town under the Endless Noon has. Everything is
 * white stone with something painted on it, and everything painted is the Despot: arms wide,
 * a sunburst for a head, standing in light that throws no shadow. Shadows in this court are
 * drawn as the sun really makes them — tiny, hard and straight underneath — and the one thing
 * nobody may paint. Where a painter slipped one in, a censor's square of wet lime covers it.
 */

const P = (x: number, y: number): Pt => ({ x, y });

/** The hard noon shadow: a small dark lozenge straight under a thing. */
export function noonShadow(g: G, x: number, y: number, w: number, a = 0.28): void {
  g.fillStyle(0x3a3020, a); g.fillEllipse(x, y + 1, w, Math.max(3, w * 0.18));
}

// ── Ground ───────────────────────────────────────────────────────────

/** Limestone flags laid in courses, honey-worn down the middle of a street. */
export function paving(g: G, r: Rect, rng: () => number, course = 34): void {
  g.fillStyle(PAVE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y, row = 0; y < r.y + r.h; y += course, row++) {
    let x = r.x - (row % 2 ? course * 0.6 : 0);
    while (x < r.x + r.w) {
      const w = course * (1 + rng() * 1.1);
      const c = rng() < 0.18 ? PAVE_LIT : rng() < 0.12 ? PAVE_DARK : PAVE;
      const x0 = Math.max(r.x, x), x1 = Math.min(r.x + r.w, x + w - 2);
      if (x1 > x0) {
        g.fillStyle(c, 1); g.fillRect(x0, y, x1 - x0, Math.min(course - 2, r.y + r.h - y));
        if (rng() < 0.3) { g.fillStyle(PAVE_LIT, 0.6); g.fillRect(x0 + 2, y + 2, (x1 - x0) * 0.5, 2); }
      }
      x += w;
    }
  }
  g.lineStyle(1, PAVE_DARK, 0.35);
  for (let y = r.y; y < r.y + r.h; y += course) g.lineBetween(r.x, y, r.x + r.w, y);
}

/** A wide street of bigger flags, its middle worn bright. */
export function street(g: G, r: Rect, rng: () => number, vertical: boolean): void {
  paving(g, r, rng, 40);
  g.fillStyle(PAVE_LIT, 0.35);
  if (vertical) g.fillRect(r.x + r.w * 0.3, r.y, r.w * 0.4, r.h);
  else g.fillRect(r.x, r.y + r.h * 0.3, r.w, r.h * 0.4);
  // Kerbs of the white stone.
  g.fillStyle(STONE_DARK, 1);
  if (vertical) { g.fillRect(r.x - 4, r.y, 4, r.h); g.fillRect(r.x + r.w, r.y, 4, r.h); }
  else { g.fillRect(r.x, r.y - 4, r.w, 4); g.fillRect(r.x, r.y + r.h, r.w, 4); }
}

/** A splash of dropped paint on the flags: a blot with a crown of droplets. */
export function splat(g: G, x: number, y: number, r: number, c: number, rng: () => number, a = 0.85): void {
  g.fillStyle(dim(c, 0.2), a); g.fillEllipse(x + 1, y + 1, r * 2.1, r * 1.4);
  g.fillStyle(c, a); g.fillEllipse(x, y, r * 2, r * 1.3);
  for (let i = 0; i < 7; i++) {
    const ang = rng() * Math.PI * 2, d = r * (1.1 + rng() * 0.9);
    g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.65, 1 + rng() * r * 0.22);
  }
  g.fillStyle(lit(c, 0.45), a * 0.7); g.fillEllipse(x - r * 0.3, y - r * 0.25, r * 0.6, r * 0.3);
}

/** The sun mosaic in Palette Square: gold and white tesserae in rings, rays of vermilion. */
export function mosaicSun(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y, r * 2 + 16, (r * 2 + 16) * 0.62);
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(x, y, r * 2, r * 1.24);
  for (let ring = 0; ring < 8; ring++) {
    const rr = r * (1 - ring / 9);
    const n = Math.max(8, Math.round(rr / 5));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2;
      const ray = Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 8)) % 2 === 0;
      const c = ring < 2 ? (ray ? VERMILION : GOLD_LIT) : ring < 6 ? (ray ? GOLD : STONE_LIT) : GOLD;
      g.fillStyle(mixC(c, rng() < 0.5 ? 0xffffff : 0x000000, rng() * 0.12), 1);
      g.fillRect(x + Math.cos(a) * rr - 2, y + Math.sin(a) * rr * 0.62 - 1.5, 4, 3);
    }
  }
  g.fillStyle(GOLD, 1); g.fillEllipse(x, y, r * 0.32, r * 0.2);
  g.fillStyle(GOLD_LIT, 1); g.fillEllipse(x - 3, y - 2, r * 0.18, r * 0.1);
  g.lineStyle(2, GOLD_DARK, 0.7); g.strokeEllipse(x, y, r * 2, r * 1.24);
}

/**
 * The pigment river: banks of white stone and a channel that runs in lengthwise stripes, one
 * colour from each dye-works sluice, never quite mixing. Vertical, from y0 down to y1.
 */
export function pigmentRiver(g: G, x: number, w: number, y0: number, y1: number, rng: () => number): void {
  const bands = [VERMILION, CADMIUM, VIRIDIAN, ULTRAMARINE, MADDER, OCHRE];
  // Banks.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 14, y0, w + 28, y1 - y0);
  g.fillStyle(STONE, 1); g.fillRect(x - 12, y0, 8, y1 - y0); g.fillRect(x + w + 4, y0, 8, y1 - y0);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 12, y0, 3, y1 - y0); g.fillRect(x + w + 4, y0, 3, y1 - y0);
  // The stripes, wavering as they go.
  const bw = w / bands.length;
  for (let y = y0; y < y1; y += 6) {
    const wob = Math.sin(y / 70) * 4 + Math.sin(y / 23) * 1.5;
    for (let i = 0; i < bands.length; i++) {
      const bx = x + i * bw + wob * (i % 2 ? 1 : -0.6);
      g.fillStyle(mixC(bands[i], 0x203040, 0.25), 1);
      g.fillRect(Math.max(x, bx), y, Math.min(bw + 2, x + w - Math.max(x, bx)), 6);
    }
  }
  // Where two colours touch, a thin marbled seam of the mix.
  for (let i = 1; i < bands.length; i++) {
    const seam = mixC(bands[i - 1], bands[i], 0.5);
    for (let y = y0; y < y1; y += 14) {
      const sx = x + i * bw + Math.sin(y / 70) * 3 + (rng() - 0.5) * 3;
      g.fillStyle(seam, 0.7); g.fillEllipse(sx, y, 4, 10);
    }
  }
  g.fillStyle(0xffffff, 0.08); g.fillRect(x, y0, w, y1 - y0);
}

/** A white-painted footbridge over the river, its rail touched with gold. */
export function footbridge(g: G, x0: number, x1: number, y: number, w: number): void {
  shadow(g, (x0 + x1) / 2, y + w / 2 + 6, x1 - x0, 10, 0.2);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - w / 2 + 4, x1 - x0, w);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0, y - w / 2, x1 - x0, w);
  for (let x = x0 + 6; x < x1; x += 12) { g.lineStyle(1, TIMBER_DARK, 0.6); g.lineBetween(x, y - w / 2, x, y + w / 2); }
  for (const ry of [y - w / 2, y + w / 2]) {
    g.fillStyle(STONE_LIT, 1); g.fillRect(x0, ry - 3, x1 - x0, 4);
    for (let x = x0; x <= x1; x += 22) { g.fillStyle(STONE, 1); g.fillRect(x - 2, ry - 10, 4, 10); g.fillStyle(GOLD, 1); g.fillCircle(x, ry - 11, 2.4); }
  }
}

/** A painter's drop-cloth on the ground, spattered. */
export function dropCloth(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(CANVAS_DARK, 1); g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w, h);
  g.fillStyle(CANVAS, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(1, CANVAS_DARK, 0.7);
  for (let i = 1; i < 4; i++) g.lineBetween(x - w / 2 + (w * i) / 4 + (rng() - 0.5) * 6, y - h / 2, x - w / 2 + (w * i) / 4 + (rng() - 0.5) * 6, y + h / 2);
  for (let i = 0; i < 9; i++) splat(g, x - w / 2 + rng() * w, y - h / 2 + rng() * h, 2 + rng() * 4, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], rng, 0.8);
}

// ── The Despot as the court paints him ───────────────────────────────

/**
 * Auriel in the mural style: a tall robed figure, arms spread in blessing, gold sunburst where
 * the face should be, the robe pleated white and gold. He stands on nothing and throws no
 * shadow — under his feet the painters leave a blank of pure lead white.
 */
export function auriel(g: G, x: number, y: number, s: number, a = 1): void {
  const h = 120 * s;
  // The robe: a long bell of white, gold hem and pleats.
  g.fillStyle(STONE_LIT, a);
  g.fillTriangle(x - 26 * s, y, x + 26 * s, y, x, y - h * 0.72);
  g.fillRect(x - 12 * s, y - h * 0.74, 24 * s, h * 0.3);
  g.lineStyle(1.2 * s, GOLD, a * 0.7);
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * 4 * s, y - h * 0.5, x + k * 9 * s, y - 2);
  g.fillStyle(GOLD, a); g.fillRect(x - 26 * s, y - 5 * s, 52 * s, 5 * s);
  // Arms wide, the sleeves hanging like banners.
  for (const k of [-1, 1]) {
    g.fillStyle(STONE, a);
    g.fillTriangle(x + k * 10 * s, y - h * 0.72, x + k * 52 * s, y - h * 0.86, x + k * 44 * s, y - h * 0.62);
    g.fillStyle(GOLD, a); g.fillCircle(x + k * 54 * s, y - h * 0.87, 4 * s);
    g.lineStyle(1.5 * s, GOLD, a); g.lineBetween(x + k * 44 * s, y - h * 0.62, x + k * 50 * s, y - h * 0.8);
  }
  // The sunburst head: alternating long and short rays round a gold disc.
  const hy = y - h * 0.86;
  glow(g, x, hy, 30 * s, GOLD_LIT, 0.07 * a, 3);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const len = (i % 2 ? 16 : 26) * s;
    g.fillStyle(i % 2 ? GOLD : GOLD_LIT, a);
    g.fillTriangle(x + Math.cos(ang - 0.12) * 9 * s, hy + Math.sin(ang - 0.12) * 9 * s, x + Math.cos(ang + 0.12) * 9 * s, hy + Math.sin(ang + 0.12) * 9 * s, x + Math.cos(ang) * len, hy + Math.sin(ang) * len);
  }
  g.fillStyle(GOLD_DARK, a); g.fillCircle(x, hy, 10 * s);
  g.fillStyle(GOLD, a); g.fillCircle(x, hy, 9 * s);
  g.fillStyle(GOLD_LIT, a); g.fillCircle(x - 3 * s, hy - 3 * s, 3.5 * s);
  // Lead white where his shadow would be.
  g.fillStyle(0xffffff, 0.8 * a); g.fillEllipse(x, y + 2, 60 * s, 8 * s);
}

/** A kneeling figure for the crowds at the mural's foot — painted in flat colour, shadowless. */
function kneeler(g: G, x: number, y: number, s: number, c: number, facing: number): void {
  g.fillStyle(c, 1); g.fillEllipse(x, y - 6 * s, 16 * s, 12 * s);
  g.fillStyle(lit(c, 0.2), 1); g.fillTriangle(x - 6 * s, y - 8 * s, x + 6 * s, y - 8 * s, x + facing * 4 * s, y - 22 * s);
  g.fillStyle(0xf0c8a0, 1); g.fillCircle(x + facing * 5 * s, y - 25 * s, 4.5 * s);
  g.lineStyle(2 * s, c, 1); g.lineBetween(x + facing * 2 * s, y - 18 * s, x + facing * 10 * s, y - 28 * s);
}

/**
 * A mural wall: a long run of limestone with a cornice, the whole face one painting — noon sky,
 * the Despot in the middle, kneeling crowds, a sun-ray fan. `censored` squares of wet lime mark
 * where someone painted a shadow and the censors got to it.
 */
export function muralWall(g: G, x0: number, y: number, w: number, h: number, rng: () => number, censored = 1): void {
  noonShadow(g, x0 + w / 2, y, w + 10, 0.22);
  // Plinth and wall.
  g.fillStyle(STONE_DEEP, 1); g.fillRect(x0 - 4, y - 16, w + 8, 16);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, y - 18, w + 8, 6);
  const top = y - 16 - h;
  g.fillStyle(STONE, 1); g.fillRect(x0, top, w, h);
  // The painting's field: sky fading to glare at the top.
  const fx = x0 + 10, fw = w - 20, fy = top + 14, fh = h - 22;
  g.fillStyle(SKY, 1); g.fillRect(fx, fy, fw, fh);
  for (let i = 0; i < 6; i++) { g.fillStyle(SKY_LIT, 0.25); g.fillRect(fx, fy + (i * fh) / 12, fw, fh / 12); }
  // A fan of painted sun-rays behind the figure.
  const cx = fx + fw / 2, cy = fy + fh * 0.32;
  for (let i = 0; i < 18; i++) {
    const a0 = Math.PI * (i / 18), a1 = Math.PI * ((i + 0.5) / 18);
    g.fillStyle(i % 2 ? GOLD_LIT : 0xffffff, 0.45);
    g.fillTriangle(cx, cy, cx - Math.cos(a0) * fw * 0.7, cy + Math.sin(a0) * fh, cx - Math.cos(a1) * fw * 0.7, cy + Math.sin(a1) * fh);
  }
  // Painted ground: a white terrace and the kneeling town.
  g.fillStyle(STONE_LIT, 1); g.fillRect(fx, fy + fh * 0.82, fw, fh * 0.18);
  g.lineStyle(1, STONE_DARK, 0.5); g.lineBetween(fx, fy + fh * 0.82, fx + fw, fy + fh * 0.82);
  const crowd = Math.floor(fw / 26);
  for (let i = 0; i < crowd; i++) {
    const kx = fx + 14 + i * 26 + (rng() - 0.5) * 6;
    if (Math.abs(kx - cx) < 46) continue;
    kneeler(g, kx, fy + fh - 4, 0.7 + rng() * 0.15, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], kx < cx ? 1 : -1);
  }
  auriel(g, cx, fy + fh - 6, Math.min(1.1, fh / 140));
  // Censor's squares: wet lime over a painted shadow, drips running.
  for (let i = 0; i < censored; i++) {
    const sx = fx + 20 + rng() * (fw - 70), sy = fy + fh * 0.55 + rng() * fh * 0.25;
    const sw = 22 + rng() * 22, sh = 16 + rng() * 14;
    g.fillStyle(LIME_WET, 0.95); g.fillRect(sx, sy, sw, sh);
    for (let d = 0; d < 3; d++) { g.fillStyle(LIME_WET, 0.9); g.fillRect(sx + 4 + d * (sw / 3), sy + sh, 3, 6 + rng() * 10); }
    g.fillStyle(LIME_DRY, 0.7); g.fillRect(sx + 2, sy + 2, sw * 0.6, 3);
  }
  // Frame band and cornice, gilt egg-and-dart.
  g.lineStyle(4, GOLD_DARK, 1); g.strokeRect(fx - 2, fy - 2, fw + 4, fh + 4);
  g.lineStyle(2, GOLD, 1); g.strokeRect(fx - 2, fy - 2, fw + 4, fh + 4);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 8, top - 6, w + 16, 10);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 10, top - 12, w + 20, 7);
  for (let x = x0 - 6; x < x0 + w + 6; x += 12) { g.fillStyle(GOLD, 1); g.fillEllipse(x, top - 2, 5, 6); }
}

/**
 * Painters' scaffolding: poles lashed with rope, two plank decks, a ladder, paint pots on the
 * boards and a paint-spattered dust-sheet hung over one bay.
 */
export function scaffold(g: G, x0: number, y: number, w: number, h: number, rng: () => number): void {
  const bays = Math.max(2, Math.round(w / 70));
  const bw = w / bays;
  // Poles.
  for (let i = 0; i <= bays; i++) {
    const px = x0 + i * bw;
    noonShadow(g, px, y, 10, 0.3);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 3, y - h, 6, h);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(px - 3, y - h, 2, h);
  }
  // Cross-braces and lashings.
  for (let i = 0; i < bays; i++) {
    const px = x0 + i * bw;
    g.lineStyle(2, TIMBER, 1);
    if (i % 2) g.lineBetween(px, y - 4, px + bw, y - h * 0.5); else g.lineBetween(px, y - h * 0.5, px + bw, y - 4);
  }
  for (const k of [0.5, 0.95]) {
    const dy = y - h * k;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 6, dy, w + 12, 7);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 - 6, dy, w + 12, 3);
    for (let i = 0; i <= bays; i++) { g.lineStyle(2, ROPE, 1); g.strokeCircle(x0 + i * bw, dy + 3, 4); }
    // Pots and brushes on the boards.
    for (let i = 0; i < bays; i++) {
      if (rng() < 0.45) continue;
      const px = x0 + i * bw + 14 + rng() * (bw - 28);
      paintPot(g, px, dy, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], 0.8);
    }
    // Drips off the deck edge.
    for (let i = 0; i < 4; i++) {
      const c = PIGMENTS[Math.floor(rng() * PIGMENTS.length)];
      g.fillStyle(c, 0.8); g.fillRect(x0 + rng() * w, dy + 7, 2, 4 + rng() * 8);
    }
  }
  // A ladder on the first bay.
  const lx = x0 + bw * 0.5;
  g.lineStyle(2.5, TIMBER_LIT, 1); g.lineBetween(lx - 8, y, lx - 6, y - h * 0.95); g.lineBetween(lx + 8, y, lx + 6, y - h * 0.95);
  for (let k = 0.08; k < 0.95; k += 0.09) g.lineBetween(lx - 8, y - h * k, lx + 8, y - h * k);
  // A dust-sheet over the last bay, splotched.
  const sx = x0 + w - bw + 4;
  g.fillStyle(CANVAS_DARK, 1); g.fillRect(sx + 2, y - h * 0.95 + 9, bw - 8, h * 0.5);
  g.fillStyle(CANVAS, 1); g.fillRect(sx, y - h * 0.95 + 7, bw - 8, h * 0.5);
  for (let k = 1; k < 4; k++) { g.lineStyle(1, CANVAS_DARK, 0.8); g.lineBetween(sx + (k * (bw - 8)) / 4, y - h * 0.95 + 8, sx + (k * (bw - 8)) / 4 + 2, y - h * 0.45 + 6); }
  for (let i = 0; i < 6; i++) splat(g, sx + 6 + rng() * (bw - 20), y - h * 0.9 + rng() * h * 0.4, 2 + rng() * 3, PIGMENTS[i % PIGMENTS.length], rng, 0.85);
}

/** A rope cradle hanging on a mural, a painter in it, swinging — animated (`swing` in -1..1). */
export function cradle(g: G, x: number, y: number, ropeTop: number, swing: number, coat: number): void {
  const bx = x + swing * 8;
  g.lineStyle(1.5, ROPE, 1); g.lineBetween(x - 18, ropeTop, bx - 18, y - 6); g.lineBetween(x + 18, ropeTop, bx + 18, y - 6);
  // The painter: legs over the edge, an arm up with a brush.
  g.fillStyle(coat, 1); g.fillEllipse(bx - 2, y - 16, 14, 16);
  g.fillStyle(0xf0c8a0, 1); g.fillCircle(bx - 2, y - 28, 5.5);
  g.fillStyle(MADDER, 1); g.fillEllipse(bx - 2, y - 33, 13, 5);
  const arm = Math.sin(swing * 3) * 6;
  g.lineStyle(3, coat, 1); g.lineBetween(bx + 3, y - 20, bx + 12, y - 34 + arm);
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(bx + 12, y - 34 + arm, bx + 16, y - 44 + arm);
  g.fillStyle(VERMILION, 1); g.fillCircle(bx + 16, y - 45 + arm, 2);
  // The plank seat and its pots.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(bx - 22, y - 8, 44, 6);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(bx - 22, y - 8, 44, 2);
  paintPot(g, bx + 14, y - 8, CADMIUM, 0.6);
  paintPot(g, bx - 15, y - 8, ULTRAMARINE, 0.6);
}

/** A tin paint pot, a lick of colour down its side. */
export function paintPot(g: G, x: number, y: number, c: number, s = 1): void {
  g.fillStyle(0x8a8a90, 1); g.fillRect(x - 6 * s, y - 11 * s, 12 * s, 11 * s);
  g.fillStyle(0xb8b8c0, 1); g.fillRect(x - 6 * s, y - 11 * s, 3 * s, 11 * s);
  g.fillStyle(c, 1); g.fillEllipse(x, y - 11 * s, 12 * s, 4 * s);
  g.fillRect(x + 2 * s, y - 11 * s, 2.5 * s, 6 * s);
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x - 1 * s, y - 11 * s, x - 4 * s, y - 20 * s);
}

/** An artist's palette: a kidney of wood, thumb-hole, a ring of paint blobs. */
export function palette(g: G, x: number, y: number, s: number, rot: number, a = 1): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    const r = (1 + 0.18 * Math.cos(t * 2) - (t > 2.6 && t < 3.6 ? 0.35 : 0)) * 16 * s;
    pts.push(P(x + Math.cos(t + rot) * r * 1.3, y + Math.sin(t + rot) * r));
  }
  g.fillStyle(TIMBER_DARK, a); g.fillPoints(pts.map((p) => P(p.x + 1, p.y + 2)), true);
  g.fillStyle(TIMBER_LIT, a); g.fillPoints(pts, true);
  g.fillStyle(TIMBER_DARK, a); g.fillCircle(x + Math.cos(rot + Math.PI * 0.95) * 8 * s, y + Math.sin(rot + Math.PI * 0.95) * 6 * s, 3 * s);
  const blobs = [VERMILION, CADMIUM, VIRIDIAN, ULTRAMARINE, MADDER, STONE_LIT];
  blobs.forEach((c, i) => {
    const t = rot - 1.2 + i * 0.55;
    const bx = x + Math.cos(t) * 12 * s * 1.3, by = y + Math.sin(t) * 12 * s;
    g.fillStyle(c, a); g.fillCircle(bx, by, 3 * s);
    g.fillStyle(0xffffff, 0.5 * a); g.fillCircle(bx - s, by - s, 1 * s);
  });
}

/** A loaded brush: wooden handle, brass ferrule, a bristle tip wet with `c`. */
export function brush(g: G, x: number, y: number, ang: number, len: number, c: number, w = 3): void {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  g.lineStyle(w, TIMBER_DARK, 1); g.lineBetween(x, y, ex, ey);
  g.lineStyle(w * 0.5, TIMBER_LIT, 1); g.lineBetween(x, y, ex, ey);
  const fx = ex + Math.cos(ang) * len * 0.14, fy = ey + Math.sin(ang) * len * 0.14;
  g.lineStyle(w + 1, GOLD, 1); g.lineBetween(ex, ey, fx, fy);
  g.fillStyle(c, 1);
  g.fillTriangle(fx + Math.cos(ang + 1.57) * (w + 1), fy + Math.sin(ang + 1.57) * (w + 1), fx - Math.cos(ang + 1.57) * (w + 1), fy - Math.sin(ang + 1.57) * (w + 1), fx + Math.cos(ang) * len * 0.3, fy + Math.sin(ang) * len * 0.3);
}

// ── Buildings ────────────────────────────────────────────────────────

export interface MuralHouseOpts {
  /** The colour of the mural panel's main field. */
  field: number;
  /** A censor's lime patch on the gable. */
  limed?: boolean;
  /** A skylight on the flat roof. */
  skylight?: boolean;
  /** A little gilt dome instead of a flat roof. */
  dome?: boolean;
}

/**
 * A terraced painters' house: white limestone, a flat roof with a parapet, a glass door (by
 * Clarity — no solid doors), shutters nailed open, and the whole upper wall a mural panel of the
 * Despot over a field of colour.
 */
export function muralHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, o: MuralHouseOpts): Pt {
  noonShadow(g, x, y, w * 1.02, 0.25);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 2, top + 4, w + 4, h - 4);
  g.fillStyle(STONE, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0, top, 4, h);
  // Coursing lines in the stone.
  g.lineStyle(1, STONE_DARK, 0.35);
  for (let yy = top + 14; yy < y; yy += 14) g.lineBetween(x0, yy, x0 + w, yy);
  // The mural panel.
  const px = x0 + 8, pw = w - 16, py = top + 10, ph = h * 0.48;
  g.fillStyle(o.field, 1); g.fillRect(px, py, pw, ph);
  g.fillStyle(lit(o.field, 0.35), 0.6); g.fillRect(px, py, pw, ph * 0.3);
  for (let i = 0; i < 10; i++) {
    const a = Math.PI + (i / 9) * Math.PI;
    g.lineStyle(2, GOLD_LIT, 0.5); g.lineBetween(px + pw / 2, py + ph * 0.45, px + pw / 2 + Math.cos(a) * pw * 0.6, py + ph * 0.45 + Math.sin(a) * ph * 0.6);
  }
  auriel(g, px + pw / 2, py + ph - 3, Math.min(0.45, ph / 150));
  if (o.limed) {
    const lx = px + 6 + rng() * (pw - 30), ly = py + ph * 0.5;
    g.fillStyle(LIME_WET, 1); g.fillRect(lx, ly, 18, 14);
    g.fillRect(lx + 3, ly + 14, 2, 8); g.fillRect(lx + 11, ly + 14, 2, 5);
  }
  g.lineStyle(2, GOLD, 1); g.strokeRect(px, py, pw, ph);
  // Windows with shutters nailed open, glass bare.
  const wy = py + ph + 12;
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.28;
    g.fillStyle(GLASS, 1); g.fillRect(wx - 9, wy, 18, 22);
    g.fillStyle(GLASS_LIT, 0.8); g.fillRect(wx - 7, wy + 2, 4, 18);
    g.lineStyle(1.5, STONE_DARK, 1); g.strokeRect(wx - 9, wy, 18, 22); g.lineBetween(wx, wy, wx, wy + 22);
    for (const sdir of [-1, 1]) {
      const sx = wx + sdir * 15;
      g.fillStyle(o.field === VIRIDIAN ? OCHRE : VIRIDIAN, 1); g.fillRect(sx - 5, wy, 10, 22);
      for (let l = 0; l < 5; l++) { g.lineStyle(1, 0x000000, 0.15); g.lineBetween(sx - 5, wy + 3 + l * 4, sx + 5, wy + 3 + l * 4); }
      g.fillStyle(0x606068, 1); g.fillCircle(sx, wy + 4, 1.4); g.fillCircle(sx, wy + 18, 1.4);
    }
  }
  // The Clarity door: all glass, a brass bar.
  const dw = 22, dh = Math.min(38, h * 0.3);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - dw / 2 - 3, y - dh - 3, dw + 6, dh + 3);
  g.fillStyle(GLASS, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  g.fillStyle(GLASS_LIT, 0.7); g.fillRect(x - dw / 2 + 3, y - dh + 2, 4, dh - 4);
  g.lineStyle(2, GOLD, 1); g.lineBetween(x - dw / 2 + 4, y - dh * 0.5, x + dw / 2 - 4, y - dh * 0.5);
  // Roof: parapet, and either a skylight or a little gilt dome.
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 4, top - 8, w + 8, 8);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, top - 1, w + 8, 2);
  if (o.dome) {
    g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, top - 8, w * 0.42, w * 0.32);
    g.fillStyle(GOLD, 1); g.fillEllipse(x, top - 10, w * 0.4, w * 0.3);
    g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(x - w * 0.07, top - 14, w * 0.1, w * 0.08);
    g.fillStyle(GOLD, 1); g.fillRect(x - 1.5, top - 10 - w * 0.2, 3, 8); g.fillCircle(x, top - 12 - w * 0.2, 3);
  } else if (o.skylight) {
    g.fillStyle(GLASS_EDGE, 1); g.fillTriangle(x0 + w * 0.2, top - 8, x0 + w * 0.8, top - 8, x0 + w * 0.5, top - 26);
    g.fillStyle(GLASS, 0.9); g.fillTriangle(x0 + w * 0.22, top - 9, x0 + w * 0.78, top - 9, x0 + w * 0.5, top - 24);
    g.fillStyle(GLASS_LIT, 0.8); g.fillTriangle(x0 + w * 0.3, top - 10, x0 + w * 0.42, top - 10, x0 + w * 0.47, top - 20);
  }
  return P(x, y + 16);
}

/**
 * A colour-mill on the river bank: a squat stone mill with a waterwheel housing toward the
 * river, the wheel itself animated separately (`millWheel`), sacks of raw pigment and a
 * grindstone outside under a glass canopy (no shade allowed, even for millers).
 */
export function colourMill(g: G, x: number, y: number, rng: () => number, flip = false): void {
  const d = flip ? -1 : 1;
  noonShadow(g, x, y, 150, 0.3);
  // The mill house.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 60, y - 112, 120, 112);
  g.fillStyle(STONE, 1); g.fillRect(x - 58, y - 114, 116, 110);
  g.lineStyle(1, STONE_DARK, 0.4);
  for (let yy = y - 100; yy < y; yy += 12) g.lineBetween(x - 58, yy, x + 58, yy);
  // Pigment-stained lower wall: where the sacks rub, every colour.
  for (let i = 0; i < 12; i++) { g.fillStyle(PIGMENTS[i % PIGMENTS.length], 0.35); g.fillEllipse(x - 50 + rng() * 100, y - 8 - rng() * 22, 14, 10); }
  // Roof: steep, slates of glass in a lead grid.
  g.fillStyle(0x7a8088, 1); g.fillTriangle(x - 70, y - 112, x + 70, y - 112, x, y - 176);
  g.fillStyle(GLASS, 0.85); g.fillTriangle(x - 60, y - 114, x + 60, y - 114, x, y - 168);
  g.lineStyle(1, 0x6a7078, 1);
  for (let k = 1; k < 6; k++) g.lineBetween(x - 60 + k * 20, y - 114, x, y - 168);
  for (let k = 1; k < 4; k++) g.lineBetween(x - 60 + k * 13, y - 114 - k * 13.5, x + 60 - k * 13, y - 114 - k * 13.5);
  // The wheel housing toward the river.
  g.fillStyle(STONE_DEEP, 1); g.fillRect(x + d * 54 - (d < 0 ? 22 : 0), y - 70, 22, 70);
  // A door with a pigment-dusted glass pane; a hoist beam and a sack on the rope.
  g.fillStyle(GLASS, 1); g.fillRect(x - 14, y - 40, 28, 40);
  g.lineStyle(2, TIMBER_DARK, 1); g.strokeRect(x - 14, y - 40, 28, 40);
  g.fillStyle(OCHRE, 0.3); g.fillRect(x - 12, y - 14, 24, 12);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 6 - d * 30, y - 104, 40, 6);
  g.lineStyle(1, ROPE, 1); g.lineBetween(x + 12 - d * 30, y - 98, x + 12 - d * 30, y - 72);
  sack(g, x + 12 - d * 30, y - 60, VERMILION);
  // Sacks and a grindstone at the door.
  sack(g, x - d * 44, y, ULTRAMARINE); sack(g, x - d * 30, y + 4, CADMIUM); sack(g, x - d * 52, y + 8, VIRIDIAN);
  const gx = x - d * 70, gy = y + 16;
  g.fillStyle(STONE_DEEP, 1); g.fillEllipse(gx, gy, 40, 14);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(gx, gy - 4, 36, 12);
  g.fillStyle(VERMILION, 1); g.fillEllipse(gx, gy - 5, 22, 6);
  g.fillStyle(STONE, 1); g.fillRect(gx - 4, gy - 22, 8, 18);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(gx - 2, gy - 30, 20, 3);
}

/** A sack of ground pigment, its neck open on a cone of the colour. */
export function sack(g: G, x: number, y: number, c: number): void {
  g.fillStyle(dim(CANVAS_DARK, 0.15), 1); g.fillEllipse(x, y - 9, 22, 22);
  g.fillStyle(CANVAS_DARK, 1); g.fillEllipse(x - 1, y - 10, 20, 20);
  g.fillStyle(CANVAS, 1); g.fillEllipse(x - 4, y - 14, 8, 8);
  g.fillStyle(c, 1); g.fillEllipse(x, y - 20, 14, 6);
  g.fillTriangle(x - 6, y - 20, x + 6, y - 20, x, y - 26);
  g.fillStyle(c, 0.4); g.fillEllipse(x + 2, y + 1, 16, 4);
}

/** A colour-mill's waterwheel, turning in the striped river (animated; `t` seconds). */
export function millWheel(g: G, x: number, y: number, r: number, t: number): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x, y, r);
  g.fillStyle(0x1e2830, 0.4); g.fillCircle(x, y, r - 6);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.9;
    g.lineStyle(3, TIMBER, 1); g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
    // Each paddle drips the colour of the stripe it last dipped in.
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(px - 5, py - 3, 10, 6);
    const c = PIGMENTS[i % PIGMENTS.length];
    if (Math.sin(a) > 0.2) { g.fillStyle(c, 0.8); g.fillCircle(px, py + 6 + ((t * 60 + i * 7) % 10), 1.8); }
    g.fillStyle(c, 0.9); g.fillRect(px - 5, py + 1, 10, 2);
  }
  g.lineStyle(3, TIMBER_LIT, 1); g.strokeCircle(x, y, r);
  g.fillStyle(0x505058, 1); g.fillCircle(x, y, 5);
}

/**
 * The dye works at the river's head: a long shed of glass and iron, a row of round vats each a
 * different colour with a stirring paddle, drying racks of dyed cloth, and the stone sluices
 * that let each colour into the river in its own stripe.
 */
export function dyeWorks(g: G, x: number, y: number, w: number, rng: () => number): void {
  noonShadow(g, x, y, w + 20, 0.22);
  const x0 = x - w / 2;
  // The shed behind.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - 150, w, 90);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 2, y - 152, w - 4, 86);
  for (let bx = x0 + 10; bx < x0 + w - 30; bx += 44) {
    g.fillStyle(GLASS, 1); g.fillRect(bx, y - 140, 34, 54);
    g.lineStyle(1.5, 0x6a7078, 1); g.strokeRect(bx, y - 140, 34, 54); g.lineBetween(bx + 17, y - 140, bx + 17, y - 86); g.lineBetween(bx, y - 113, bx + 34, y - 113);
    g.fillStyle(PIGMENTS[Math.floor(rng() * PIGMENTS.length)], 0.25); g.fillRect(bx + 1, y - 100, 32, 13);
  }
  g.fillStyle(0x7a8088, 1); g.fillRect(x0 - 6, y - 160, w + 12, 10);
  g.fillStyle(GLASS, 0.8); g.fillRect(x0 - 2, y - 172, w + 4, 12);
  g.lineStyle(1, 0x6a7078, 1); for (let bx = x0; bx < x0 + w; bx += 16) g.lineBetween(bx, y - 172, bx + 6, y - 160);
  // Chimney with a plume of coloured steam.
  g.fillStyle(STONE_DEEP, 1); g.fillRect(x0 + w - 36, y - 210, 18, 50);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + w - 39, y - 214, 24, 6);
  // Drying racks of dyed cloth.
  for (let r = 0; r < 2; r++) {
    const ry = y - 62 + r * 4, rx0 = x0 + 12 + r * 30;
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(rx0, ry, rx0 + w * 0.55, ry);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(rx0 - 2, ry, 4, 52); g.fillRect(rx0 + w * 0.55 - 2, ry, 4, 52);
    for (let k = 0; k < 7; k++) {
      const cx = rx0 + 8 + k * (w * 0.55 - 16) / 7;
      const c = PIGMENTS[(k + r * 3) % PIGMENTS.length];
      g.fillStyle(dim(c, 0.15), 1); g.fillRect(cx, ry + 2, 14, 30 + ((k * 7) % 12));
      g.fillStyle(c, 1); g.fillRect(cx, ry + 2, 12, 28 + ((k * 7) % 12));
      g.fillStyle(lit(c, 0.3), 0.6); g.fillRect(cx + 2, ry + 2, 3, 24);
    }
  }
  // The vats.
  const vats = 5;
  for (let i = 0; i < vats; i++) {
    const vx = x0 + w * 0.2 + i * (w * 0.7) / (vats - 1), vy = y - 4;
    const c = [VERMILION, CADMIUM, VIRIDIAN, ULTRAMARINE, MADDER][i];
    g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(vx, vy, 52, 20); g.fillRect(vx - 26, vy - 26, 52, 26);
    g.fillStyle(TIMBER, 1); g.fillRect(vx - 24, vy - 26, 48, 24);
    for (const by of [vy - 22, vy - 8]) { g.fillStyle(0x58585e, 1); g.fillRect(vx - 26, by, 52, 3); }
    g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(vx, vy - 26, 52, 18);
    g.fillStyle(dim(c, 0.15), 1); g.fillEllipse(vx, vy - 26, 46, 14);
    g.fillStyle(c, 1); g.fillEllipse(vx, vy - 27, 40, 11);
    g.fillStyle(lit(c, 0.4), 0.7); g.fillEllipse(vx - 8, vy - 29, 10, 3);
    g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(vx + 6, vy - 28, vx + 18, vy - 62);
    g.fillStyle(c, 0.6); g.fillRect(vx - 22, vy - 24, 3, 8 + ((i * 5) % 9));
  }
}

/**
 * A street easel: an A-frame of timber, a canvas showing the regulation subject (the Despot at
 * noon — what else), a paintbox and a stool. `half` leaves the canvas half-painted.
 */
export function easel(g: G, x: number, y: number, s: number, rng: () => number, half = false): void {
  noonShadow(g, x, y, 34 * s, 0.3);
  g.lineStyle(2.5 * s, TIMBER_DARK, 1);
  g.lineBetween(x - 12 * s, y, x - 4 * s, y - 62 * s); g.lineBetween(x + 12 * s, y, x + 4 * s, y - 62 * s);
  g.lineBetween(x, y - 56 * s, x + 2 * s, y + 4 * s);
  g.lineStyle(3 * s, TIMBER, 1); g.lineBetween(x - 16 * s, y - 22 * s, x + 16 * s, y - 22 * s);
  // The canvas.
  const cx = x - 14 * s, cy = y - 58 * s, cw = 28 * s, ch = 34 * s;
  g.fillStyle(CANVAS_DARK, 1); g.fillRect(cx + 1, cy + 1, cw, ch);
  g.fillStyle(CANVAS, 1); g.fillRect(cx, cy, cw, ch);
  g.fillStyle(SKY, 1); g.fillRect(cx + 2, cy + 2, cw - 4, half ? ch * 0.45 : ch - 4);
  if (!half) {
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx + 2, cy + ch * 0.75, cw - 4, ch * 0.25 - 2);
    auriel(g, x, cy + ch - 4, 0.22 * s);
  } else {
    g.lineStyle(1, 0x8a8478, 0.7); g.strokeCircle(x, cy + ch * 0.4, 5 * s); g.lineBetween(x, cy + ch * 0.5, x, cy + ch - 5);
    g.lineBetween(x - 8 * s, cy + ch * 0.55, x + 8 * s, cy + ch * 0.55);
  }
  g.lineStyle(1.5, TIMBER_DARK, 1); g.strokeRect(cx, cy, cw, ch);
  // A paintbox on the shelf, and a brush resting.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12 * s, y - 25 * s, 24 * s, 4 * s);
  for (let i = 0; i < 4; i++) { g.fillStyle(PIGMENTS[Math.floor(rng() * PIGMENTS.length)], 1); g.fillRect(x - 10 * s + i * 5.5 * s, y - 26 * s, 4 * s, 2 * s); }
  brush(g, x + 4 * s, y - 27 * s, -0.3, 10 * s, VERMILION, 1.5);
  // A three-legged stool.
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x + 22 * s, y + 2, x + 18 * s, y - 14 * s); g.lineBetween(x + 34 * s, y + 2, x + 38 * s, y - 14 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x + 28 * s, y - 15 * s, 22 * s, 6 * s);
}

/**
 * A colourman's stall: a bench of bowls each heaped in a cone of powder, a set of brass scales,
 * jars of oil; overhead a canopy of *glass* — a cloth one would be unlicensed shade.
 */
export function pigmentStall(g: G, x: number, y: number, rng: () => number): void {
  noonShadow(g, x, y, 110, 0.3);
  // Bench.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 52, y - 34, 104, 34);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 54, y - 38, 108, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 54, y - 38, 108, 2);
  for (let i = 0; i < 3; i++) { g.fillStyle(dim(TIMBER, 0.2), 1); g.fillRect(x - 46 + i * 34, y - 28, 24, 22); }
  // Bowls of pigment.
  const cols = [VERMILION, CADMIUM, ULTRAMARINE, VIRIDIAN, MADDER, OCHRE, VIOLET];
  for (let i = 0; i < 7; i++) {
    const bx = x - 45 + i * 15, by = y - 38;
    g.fillStyle(STONE_DARK, 1); g.fillEllipse(bx, by, 14, 6);
    g.fillStyle(cols[i], 1); g.fillTriangle(bx - 6, by - 1, bx + 6, by - 1, bx, by - 9 - rng() * 3);
    g.fillStyle(lit(cols[i], 0.35), 0.8); g.fillTriangle(bx - 2, by - 2, bx, by - 2, bx - 1, by - 8);
  }
  // Scales.
  g.lineStyle(1.5, GOLD_DARK, 1); g.lineBetween(x + 40, y - 38, x + 40, y - 62); g.lineBetween(x + 28, y - 60, x + 52, y - 60);
  g.lineStyle(1, GOLD_DARK, 1); g.lineBetween(x + 28, y - 60, x + 26, y - 50); g.lineBetween(x + 52, y - 60, x + 54, y - 52);
  g.fillStyle(GOLD, 1); g.fillEllipse(x + 26, y - 50, 10, 3); g.fillEllipse(x + 54, y - 52, 10, 3);
  // The glass canopy on iron posts.
  for (const k of [-1, 1]) { g.fillStyle(0x58585e, 1); g.fillRect(x + k * 56 - 2, y - 92, 4, 92); }
  g.fillStyle(GLASS, 0.55); g.fillRect(x - 62, y - 100, 124, 10);
  g.lineStyle(1.5, 0x6a7078, 1); g.strokeRect(x - 62, y - 100, 124, 10);
  for (let k = 1; k < 6; k++) g.lineBetween(x - 62 + k * 20.6, y - 100, x - 62 + k * 20.6, y - 90);
  g.fillStyle(GLASS_LIT, 0.8); g.fillRect(x - 58, y - 99, 30, 2);
}

/** A censor's lime tub: a pail of wet whitewash, a long-handled roller, a stencil of the seal. */
export function limeTub(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 40, 0.3);
  g.fillStyle(0x7a7a80, 1); g.fillRect(x - 14, y - 22, 28, 22);
  g.fillStyle(0x9a9aa0, 1); g.fillRect(x - 14, y - 22, 6, 22);
  g.fillStyle(LIME_WET, 1); g.fillEllipse(x, y - 22, 28, 9);
  g.fillStyle(LIME_DRY, 1); g.fillEllipse(x - 4, y - 23, 12, 3);
  g.fillStyle(LIME_WET, 0.9); g.fillRect(x + 8, y - 22, 4, 12); g.fillRect(x - 10, y - 22, 3, 8);
  roller(g, x + 20, y - 4, 22, -1.2, true);
}

/**
 * A whitewash roller: a long pole and a fat sleeved drum, wet lime glistening on it. Shared by
 * the world and the Whitewash fight. `ang` is the pole's direction from the drum.
 */
export function roller(g: G, x: number, y: number, len: number, ang: number, wet: boolean, poleLen = 40): void {
  const ax = Math.cos(ang + Math.PI / 2), ay = Math.sin(ang + Math.PI / 2);
  // Pole.
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x, y, x + Math.cos(ang) * poleLen, y + Math.sin(ang) * poleLen);
  g.lineStyle(1.2, TIMBER_LIT, 1); g.lineBetween(x, y, x + Math.cos(ang) * poleLen, y + Math.sin(ang) * poleLen);
  // Yoke.
  g.lineStyle(2, 0x58585e, 1); g.lineBetween(x - ax * len * 0.5, y - ay * len * 0.5, x + ax * len * 0.5, y + ay * len * 0.5);
  // Drum: a thick lime-white bar with a highlight.
  g.lineStyle(10, wet ? LIME_SHADE : STONE_DARK, 1);
  g.lineBetween(x - ax * len * 0.46, y - ay * len * 0.46 + 2, x + ax * len * 0.46, y + ay * len * 0.46 + 2);
  g.lineStyle(9, wet ? LIME_WET : LIME_DRY, 1);
  g.lineBetween(x - ax * len * 0.46, y - ay * len * 0.46, x + ax * len * 0.46, y + ay * len * 0.46);
  g.lineStyle(2, 0xffffff, 0.8);
  g.lineBetween(x - ax * len * 0.42, y - ay * len * 0.42 - 2, x + ax * len * 0.42, y + ay * len * 0.42 - 2);
}

/**
 * The Shadowless Gallery — Prince Hue's hall. A long temple of white marble, a portico of
 * fluted columns, and a roof that is all glass so that no picture inside ever has a shadow
 * across it; gilt frames glint through the glass doors; a gold sunburst in the pediment.
 */
export function gallery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  noonShadow(g, x, y + 6, w * 1.05, 0.22);
  const x0 = x - w / 2;
  // Stylobate: three white steps.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x0 - 24 + k * 8, y - 8 - k * 8, w + 48 - k * 16, 8);
    g.fillStyle(STONE_DARK, 0.6); g.fillRect(x0 - 24 + k * 8, y - 1 - k * 8, w + 48 - k * 16, 1);
  }
  const base = y - 24, top = base - h;
  // The cella wall behind the columns, with glass doors and the frames inside.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + 10, top + 20, w - 20, h - 20);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 12, top + 22, w - 24, h - 22);
  const doors = 3;
  for (let i = 0; i < doors; i++) {
    const dx = x - (doors - 1) * 60 + i * 120, dw = 44, dh = h * 0.62;
    g.fillStyle(0xfaf6ea, 1); g.fillRect(dx - dw / 2, base - dh, dw, dh);
    // Frames glimpsed inside: gold rectangles with colour in them.
    for (let f = 0; f < 2; f++) {
      const fy = base - dh + 10 + f * dh * 0.42;
      g.fillStyle(GOLD, 1); g.fillRect(dx - 15, fy, 30, dh * 0.32);
      g.fillStyle(PIGMENTS[(i * 2 + f) % PIGMENTS.length], 1); g.fillRect(dx - 12, fy + 3, 24, dh * 0.32 - 6);
      g.fillStyle(GOLD_LIT, 1); g.fillCircle(dx, fy + dh * 0.12, 2.5);
    }
    g.fillStyle(GLASS, 0.5); g.fillRect(dx - dw / 2, base - dh, dw, dh);
    g.fillStyle(GLASS_LIT, 0.5); g.fillRect(dx - dw / 2 + 4, base - dh + 4, 4, dh - 8);
    g.lineStyle(2, GOLD, 1); g.strokeRect(dx - dw / 2, base - dh, dw, dh); g.lineBetween(dx, base - dh, dx, base);
  }
  // Columns: fluted, gold capitals.
  const cols = Math.round(w / 56) + 1;
  for (let i = 0; i < cols; i++) {
    const cx = x0 + (i * w) / (cols - 1);
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 11, top + 14, 22, h - 14);
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 10, top + 14, 18, h - 14);
    for (let f = -6; f <= 6; f += 4) { g.lineStyle(1, STONE_DARK, 0.5); g.lineBetween(cx + f, top + 18, cx + f, base - 4); }
    g.fillStyle(STONE, 1); g.fillRect(cx - 14, base - 6, 28, 6);
    g.fillStyle(GOLD_DARK, 1); g.fillRect(cx - 15, top + 8, 30, 8);
    g.fillStyle(GOLD, 1); g.fillRect(cx - 14, top + 7, 28, 5);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx - 10, top + 11, 2.2); g.fillCircle(cx + 10, top + 11, 2.2);
  }
  // Entablature and the pediment with the sunburst.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 16, top - 14, w + 32, 22);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 16, top - 16, w + 32, 14);
  for (let fx = x0 - 10; fx < x0 + w + 10; fx += 18) { g.fillStyle(GOLD, 1); g.fillRect(fx, top - 12, 8, 6); }
  const ph = 70;
  g.fillStyle(STONE_DARK, 1); g.fillTriangle(x0 - 22, top - 14, x0 + w + 22, top - 14, x, top - 14 - ph);
  g.fillStyle(STONE, 1); g.fillTriangle(x0 - 8, top - 18, x0 + w + 8, top - 18, x, top - 10 - ph);
  const sy = top - 40;
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + (i / 17) * Math.PI;
    g.fillStyle(i % 2 ? GOLD : GOLD_LIT, 1);
    g.fillTriangle(x + Math.cos(a - 0.08) * 10, sy + Math.sin(a - 0.08) * 10, x + Math.cos(a + 0.08) * 10, sy + Math.sin(a + 0.08) * 10, x + Math.cos(a) * (i % 2 ? 26 : 36), sy + Math.sin(a) * (i % 2 ? 22 : 30));
  }
  g.fillStyle(GOLD, 1); g.fillCircle(x, sy, 10);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 3, sy - 3, 4);
  // The glass roof beyond the pediment, ridged in lead and blazing.
  g.fillStyle(GLASS, 0.9); g.fillRect(x0 + 30, top - 14 - ph - 10, w - 60, 18);
  g.lineStyle(1, GLASS_EDGE, 1); for (let rx = x0 + 30; rx < x0 + w - 30; rx += 14) g.lineBetween(rx, top - 14 - ph - 10, rx + 4, top - 14 - ph + 8);
  g.fillStyle(GLASS_LIT, 0.9); g.fillRect(x0 + 40, top - 14 - ph - 8, w * 0.3, 3);
  // Banners of the court hung between the end columns.
  for (const k of [-1, 1]) {
    const bx = x + k * (w / 2 - 10), by = top + 24;
    g.fillStyle(PIGMENTS[k < 0 ? 0 : 3], 1); g.fillRect(bx - 9, by, 18, 64);
    g.fillTriangle(bx - 9, by + 64, bx + 9, by + 64, bx, by + 74);
    g.fillStyle(GOLD, 1); g.fillCircle(bx, by + 22, 6);
    g.fillStyle(0xffffff, 0.4); g.fillRect(bx - 7, by, 3, 60);
  }
  for (let i = 0; i < 6; i++) splat(g, x0 + rng() * w, y - 2 - rng() * 14, 2 + rng() * 2, PIGMENTS[i], rng, 0.7);
}

/**
 * A north-light atelier: a tall narrow studio whose whole roof slope is one great window, a
 * canvas visible through it the size of a wall, a hoist for lifting frames to the upper door.
 */
export function atelier(g: G, x: number, y: number, w: number, h: number, rng: () => number, field: number): void {
  noonShadow(g, x, y, w * 1.05, 0.25);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 2, top, w - 4, h - 2);
  // The great slanted studio window.
  g.fillStyle(0x7a8088, 1); g.fillTriangle(x0 - 6, top + 2, x0 + w + 6, top + 2, x0 + w + 6, top - h * 0.55);
  g.fillStyle(GLASS, 0.92); g.fillTriangle(x0, top - 2, x0 + w, top - 2, x0 + w, top - h * 0.5);
  // Through the glass: the top of an enormous canvas, half-painted.
  g.fillStyle(field, 0.55); g.fillTriangle(x0 + w * 0.3, top - 4, x0 + w * 0.9, top - 4, x0 + w * 0.9, top - h * 0.32);
  g.lineStyle(1, 0x6a7078, 1);
  for (let k = 1; k < 6; k++) { const xx = x0 + (w * k) / 6; g.lineBetween(xx, top - 2, xx, top - 2 - (h * 0.5 * k) / 6); }
  for (let k = 1; k < 3; k++) g.lineBetween(x0 + (w * k) / 3, top - 2 - (h * 0.5 * k) / 3, x0 + w, top - 2 - (h * 0.5 * k) / 3);
  g.fillStyle(GLASS_LIT, 0.8); g.fillTriangle(x0 + w * 0.55, top - 4, x0 + w * 0.63, top - 4, x0 + w * 0.63, top - h * 0.2);
  // Upper loading door and hoist, with a frame going up on the rope.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 16, top + 12, 32, 36);
  g.fillStyle(GLASS, 1); g.fillRect(x - 13, top + 15, 26, 30);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, top - 4, 34, 5);
  g.lineStyle(1, ROPE, 1); g.lineBetween(x + 28, top + 1, x + 28, top + 60);
  g.fillStyle(GOLD, 1); g.fillRect(x + 18, top + 60, 22, 28);
  g.fillStyle(PIGMENTS[Math.floor(rng() * PIGMENTS.length)], 1); g.fillRect(x + 21, top + 63, 16, 22);
  // Ground floor: glass door, a slate with the sitter's hours chalked.
  g.fillStyle(GLASS, 1); g.fillRect(x - 12, y - 40, 24, 40);
  g.lineStyle(2, GOLD, 1); g.strokeRect(x - 12, y - 40, 24, 40);
  g.fillStyle(0x3a3e44, 1); g.fillRect(x0 + 8, y - 44, 22, 28);
  g.lineStyle(1, 0xf0f0f0, 0.8); for (let k = 0; k < 4; k++) g.lineBetween(x0 + 11, y - 39 + k * 6, x0 + 24 - (k % 2) * 5, y - 39 + k * 6);
  // A paint-flecked doorstep.
  for (let i = 0; i < 4; i++) splat(g, x - 20 + rng() * 40, y + 4, 2, PIGMENTS[Math.floor(rng() * PIGMENTS.length)], rng, 0.8);
}

/**
 * Madder's colour shop: a narrow stone front whose window is shelves of glass jars, each a
 * colour — the brightest window in the court, which is saying something — and a hanging sign
 * shaped like a palette.
 */
export function colourShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  noonShadow(g, x, y, w * 1.05, 0.25);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 2, top, w - 4, h - 2);
  // The jar window.
  const wx = x0 + 10, wy = top + 26, ww = w - 20, wh = h * 0.52;
  g.fillStyle(0xfaf6ea, 1); g.fillRect(wx, wy, ww, wh);
  for (let row = 0; row < 3; row++) {
    const sy = wy + 8 + row * (wh / 3);
    g.fillStyle(TIMBER, 1); g.fillRect(wx + 2, sy + wh / 3 - 10, ww - 4, 3);
    for (let jx = wx + 6; jx < wx + ww - 8; jx += 11) {
      const c = PIGMENTS[Math.floor(rng() * PIGMENTS.length)];
      g.fillStyle(GLASS_EDGE, 1); g.fillRect(jx, sy + 4, 8, wh / 3 - 14);
      g.fillStyle(c, 1); g.fillRect(jx + 1, sy + 8, 6, wh / 3 - 18);
      g.fillStyle(CANVAS_DARK, 1); g.fillRect(jx, sy + 2, 8, 3);
      g.fillStyle(0xffffff, 0.5); g.fillRect(jx + 1, sy + 6, 1.5, wh / 3 - 18);
    }
  }
  g.fillStyle(GLASS, 0.3); g.fillRect(wx, wy, ww, wh);
  g.lineStyle(3, GOLD_DARK, 1); g.strokeRect(wx, wy, ww, wh);
  // Fascia with the name in gold.
  g.fillStyle(ULTRA_DARK, 1); g.fillRect(x0 + 4, top + 6, w - 8, 16);
  g.lineStyle(1, GOLD, 1); for (let k = 0; k < 9; k++) g.lineBetween(x0 + 14 + k * ((w - 28) / 9), top + 10, x0 + 18 + k * ((w - 28) / 9), top + 18);
  // The glass door.
  g.fillStyle(GLASS, 1); g.fillRect(x - 11, y - 34, 22, 34);
  g.lineStyle(2, GOLD, 1); g.strokeRect(x - 11, y - 34, 22, 34);
  // The palette sign on a gilt bracket.
  g.lineStyle(2, GOLD_DARK, 1); g.lineBetween(x0 + w, top + 30, x0 + w + 26, top + 30);
  g.lineStyle(1, GOLD_DARK, 1); g.lineBetween(x0 + w + 22, top + 30, x0 + w + 22, top + 38);
  palette(g, x0 + w + 22, top + 50, 0.8, 0.3);
  // Parapet.
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 4, top - 8, w + 8, 8);
}

/**
 * The Despot's statue in Palette Square, mid re-gilding: a white marble Auriel on a drum plinth,
 * half his robe already in fresh leaf, a gilder's ladder against him and a book of leaf on the
 * top rung.
 */
export function gildedStatue(g: G, x: number, y: number, s: number): void {
  noonShadow(g, x, y, 80 * s, 0.25);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y - 2, 74 * s, 22 * s);
  g.fillRect(x - 37 * s, y - 40 * s, 74 * s, 38 * s);
  g.fillStyle(STONE, 1); g.fillRect(x - 35 * s, y - 42 * s, 70 * s, 36 * s);
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(x, y - 42 * s, 74 * s, 20 * s);
  g.lineStyle(2, GOLD, 1); g.strokeRect(x - 30 * s, y - 34 * s, 60 * s, 20 * s);
  auriel(g, x, y - 46 * s, 0.9 * s);
  // The fresh leaf: gold over the left half of the robe, flakes peeling.
  g.fillStyle(GOLD, 0.85); g.fillTriangle(x - 23 * s, y - 46 * s, x, y - 46 * s, x, y - 120 * s);
  g.fillStyle(GOLD_LIT, 0.8); for (let i = 0; i < 6; i++) g.fillRect(x - 18 * s + i * 3 * s, y - 60 * s - i * 8 * s, 3 * s, 2 * s);
  // The ladder.
  g.lineStyle(2.5, TIMBER, 1); g.lineBetween(x + 30 * s, y, x + 10 * s, y - 120 * s); g.lineBetween(x + 44 * s, y, x + 24 * s, y - 120 * s);
  for (let k = 1; k < 10; k++) { const t = k / 10; g.lineBetween(x + 30 * s - 20 * s * t, y - 120 * s * t, x + 44 * s - 20 * s * t, y - 120 * s * t); }
  g.fillStyle(GOLD_LIT, 1); g.fillRect(x + 12 * s, y - 112 * s, 10 * s, 7 * s);
  g.lineStyle(1, GOLD_DARK, 1); g.strokeRect(x + 12 * s, y - 112 * s, 10 * s, 7 * s);
}

/** The court's waystone: a white obelisk banded with every allowed colour, a gilt sun at the tip. */
export function muralWaystone(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 34, 0.35);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 18, y - 10, 36, 10);
  g.fillStyle(STONE_DARK, 1); g.fillTriangle(x - 12, y - 10, x + 12, y - 10, x + 8, y - 70);
  g.fillTriangle(x - 12, y - 10, x - 8, y - 70, x + 8, y - 70);
  g.fillStyle(STONE_LIT, 1); g.fillTriangle(x - 10, y - 10, x - 7, y - 70, x + 1, y - 70);
  const bands = [VERMILION, CADMIUM, VIRIDIAN, ULTRAMARINE, MADDER];
  bands.forEach((c, i) => { const by = y - 18 - i * 10; g.fillStyle(c, 0.9); g.fillRect(x - 11 + i * 0.6, by, 22 - i * 1.2, 4); });
  g.fillStyle(GOLD, 1); g.fillTriangle(x - 8, y - 70, x + 8, y - 70, x, y - 84);
  glow(g, x, y - 76, 14, GOLD_LIT, 0.08, 3);
}

/**
 * A trompe-l'œil doorway: a door that isn't there — an arched opening painted on a flat wall,
 * a glimpse of a sunlit courtyard beyond, the painted frame casting a painted shadow (the one
 * kind the censors permit: it's only a lie). `frame` is the colour of its moulding.
 */
export function trompeDoor(g: G, x: number, y: number, w: number, h: number, frame: number, a = 1): void {
  // Painted depth: the reveal on one side, the courtyard beyond.
  g.fillStyle(STONE_DEEP, a); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(SKY, a); g.fillRect(x - w / 2 + 6, y - h + 8, w - 14, h * 0.45);
  g.fillStyle(PAVE_LIT, a); g.fillRect(x - w / 2 + 6, y - h * 0.47, w - 14, h * 0.47);
  // A painted far arch and a tiny painted fountain beyond.
  g.lineStyle(2, STONE_DARK, a); g.strokeRect(x - w * 0.2, y - h * 0.62, w * 0.34, h * 0.4);
  g.fillStyle(ULTRAMARINE, 0.7 * a); g.fillEllipse(x - w * 0.03, y - h * 0.18, w * 0.22, h * 0.05);
  // Perspective lines of the painted floor.
  g.lineStyle(1, PAVE_DARK, 0.7 * a);
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * w * 0.12, y - h * 0.47, x + k * w * 0.3, y - 2);
  // The painted reveal (shadow side) — the court's one permitted shadow.
  g.fillStyle(0x6a6458, 0.6 * a); g.fillTriangle(x + w / 2 - 8, y - h + 8, x + w / 2 - 8, y, x + w / 2 - 18, y - 8);
  // The moulding and a keystone.
  g.lineStyle(5, dim(frame, 0.3), a); g.strokeRect(x - w / 2, y - h, w, h);
  g.lineStyle(3, frame, a); g.strokeRect(x - w / 2, y - h, w, h);
  g.fillStyle(frame, a); g.fillTriangle(x - 7, y - h - 2, x + 7, y - h - 2, x, y - h + 10);
  g.fillStyle(lit(frame, 0.4), a); g.fillRect(x - w / 2 + 1, y - h + 1, 2, h - 2);
}

/** A lamp-black smudge — a contraband shadow chalked under something, waiting for the censors. */
export function contrabandShadow(g: G, x: number, y: number, w: number, rng: () => number): void {
  for (let i = 0; i < 9; i++) {
    g.fillStyle(LAMPBLACK, 0.12 + rng() * 0.1);
    g.fillEllipse(x + (rng() - 0.5) * w * 0.3, y + (rng() - 0.5) * 4, w * (0.6 + rng() * 0.4), 7 + rng() * 4);
  }
  g.lineStyle(1, UMBER, 0.6);
  for (let i = 0; i < 6; i++) { const sx = x - w / 2 + rng() * w; g.lineBetween(sx, y - 3, sx + 6, y + 3); }
}

/** A bench of white stone, a rag left on it in some forbidden umber. */
export function stoneBench(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 60, 0.3);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 24, y - 12, 8, 12); g.fillRect(x + 16, y - 12, 8, 12);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 30, y - 18, 60, 7);
  g.fillStyle(STONE_DARK, 0.6); g.fillRect(x - 30, y - 12, 60, 1);
  g.fillStyle(VERMILION_DARK, 1); g.fillRect(x + 6, y - 20, 12, 3);
}

/** A tall gilt picture frame, empty, propped on the street to be carried in. */
export function emptyFrame(g: G, x: number, y: number, w: number, h: number): void {
  noonShadow(g, x, y, w, 0.25);
  g.lineStyle(7, GOLD_DARK, 1); g.strokeRect(x - w / 2, y - h, w, h);
  g.lineStyle(5, GOLD, 1); g.strokeRect(x - w / 2, y - h, w, h);
  g.lineStyle(1.5, GOLD_LIT, 1); g.strokeRect(x - w / 2 + 3, y - h + 3, w - 6, h - 6);
  for (const [cx, cy] of [[x - w / 2, y - h], [x + w / 2, y - h], [x - w / 2, y], [x + w / 2, y]]) { g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx, cy, 4); }
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x + w * 0.2, y - h * 0.5, x + w * 0.45, y + 2);
}

/** The cyan-blue glint a wet surface throws under the noon sun (animated by the caller). */
export function wetGlint(g: G, x: number, y: number, k: number): void {
  if (k <= 0) return;
  g.lineStyle(1.5, 0xffffff, k); g.lineBetween(x - 6 * k, y, x + 6 * k, y); g.lineBetween(x, y - 6 * k, x, y + 6 * k);
  g.fillStyle(0xffffff, k); g.fillCircle(x, y, 1.6);
}

