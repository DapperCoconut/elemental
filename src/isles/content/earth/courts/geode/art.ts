import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  AGATE_A, AGATE_B, AGATE_C, AGATE_D, AMETHYST, AMETHYST_DARK, AMETHYST_DEEP, AMETHYST_LIT, BRASS, BRASS_DARK,
  BRASS_LIT, CHALCEDONY, CHALCEDONY_DARK, CITRINE, CITRINE_DARK, DUST, FACET, FACET_DARK, FACET_LIT, FLAG, FLAG_DARK,
  GRIT, GRIT_DARK, GRIT_LIT, IRON, POOL, POOL_DEEP, POOL_LIT, QUARTZ, QUARTZ_DARK, QUARTZ_LIT, QUARTZ_SHADE, RIND,
  RIND_DARK, RIND_LIT, ROSE, SLATE, SMOKY, SPECTRUM, SUNSHAFT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from './palette';

/**
 * Geode set pieces — the shapes only the inside of a stone has. Nothing here is built square:
 * everything is *grown* (six-sided points, clusters leaning out of their matrix, bands laid down
 * ring inside ring) or *cut* (the lapidaries' facets, tables and girdles). Grown things are drawn
 * with a lit face, a shaded face and a ridge; cut things with a table, star facets and a sparkle.
 * Dust from the grinding wheels lies in the corners of everything, pale as flour.
 */

/** Fill a polygon of points. */
export function poly(g: G, pts: Pt[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts, true);
}

/** Stroke a closed polygon of points. */
function outline(g: G, pts: Pt[], w: number, color: number, alpha = 1): void {
  g.lineStyle(w, color, alpha);
  g.strokePoints(pts, true);
}

// ── Crystals ─────────────────────────────────────────────────────────

/**
 * One six-sided crystal point growing out of the ground at (x, y), `len` long, `w` wide, leaning
 * by `lean` radians from upright. Drawn as a prism body (lit face, ridge, shaded face) capped by
 * its pyramid tip, with a phantom line inside and a spark on the tip.
 */
export function crystalPoint(g: G, x: number, y: number, w: number, len: number, lean: number, color: number, alpha = 1): void {
  const ux = Math.sin(lean), uy = -Math.cos(lean);  // along the crystal
  const px = -uy, py = ux;                           // across it
  const hw = w / 2;
  const body = len * 0.74;
  const bl = { x: x - px * hw, y: y - py * hw }, br = { x: x + px * hw, y: y + py * hw };
  const tl = { x: bl.x + ux * body, y: bl.y + uy * body }, tr = { x: br.x + ux * body, y: br.y + uy * body };
  const ridgeB = { x: x + px * hw * 0.15, y: y + py * hw * 0.15 };
  const ridgeT = { x: ridgeB.x + ux * body, y: ridgeB.y + uy * body };
  const tip = { x: x + ux * len, y: y + uy * len };
  // Shaded face (right of the ridge) and lit face (left).
  poly(g, [ridgeB, br, tr, ridgeT], dim(color, 0.32), alpha);
  poly(g, [bl, ridgeB, ridgeT, tl], color, alpha);
  // The tip: three faces meeting.
  poly(g, [tl, ridgeT, tip], lit(color, 0.22), alpha);
  poly(g, [ridgeT, tr, tip], dim(color, 0.14), alpha);
  // Edge light down the lit face, and a phantom (an old growth line) inside.
  g.lineStyle(1.2, lit(color, 0.5), 0.8 * alpha); g.lineBetween(bl.x + ux * 2, bl.y + uy * 2, tl.x, tl.y);
  const ph = 0.42;
  g.lineStyle(1, lit(color, 0.35), 0.45 * alpha);
  g.lineBetween(bl.x + ux * body * ph + px * 1, bl.y + uy * body * ph + py * 1, ridgeB.x + ux * (body * ph + hw * 0.5), ridgeB.y + uy * (body * ph + hw * 0.5));
  g.lineStyle(1, dim(color, 0.5), 0.6 * alpha); outline(g, [bl, tl, tip, tr, br], 1, dim(color, 0.55), 0.5 * alpha);
  g.fillStyle(0xffffff, 0.75 * alpha); g.fillCircle(tip.x - ux * 3 - px * 1, tip.y - uy * 3 - py * 1, Math.max(1, w * 0.07));
}

/**
 * A cluster of points growing out of a lump of grey matrix rock — the court's commonest sight.
 * `s` scales it; `hue` is the main crystal colour (amethyst by default).
 */
export function crystalCluster(g: G, x: number, y: number, s: number, rng: () => number, hue = AMETHYST): void {
  shadow(g, x, y + 2, 70 * s, 18 * s);
  // Matrix: a knobbly lump the crystals break out of.
  g.fillStyle(RIND_DARK, 1); g.fillEllipse(x, y - 3 * s, 64 * s, 20 * s);
  g.fillStyle(RIND, 1); g.fillEllipse(x - 2 * s, y - 5 * s, 58 * s, 16 * s);
  for (let i = 0; i < 5; i++) { g.fillStyle(RIND_LIT, 0.6); g.fillCircle(x - 22 * s + i * 11 * s, y - 8 * s + (i % 2) * 2, 3 * s); }
  // Crystals back to front: the tallest at the back, small ones spilling forward.
  const n = 7;
  const order: { dx: number; len: number; lean: number; w: number; c: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    order.push({
      dx: t * 46 * s + (rng() - 0.5) * 6 * s,
      len: (52 - Math.abs(t) * 50 + rng() * 18) * s,
      lean: t * 0.9 + (rng() - 0.5) * 0.25,
      w: (11 + rng() * 6) * s,
      c: mixC(hue, rng() < 0.3 ? QUARTZ : hue, 0.25 + rng() * 0.2),
    });
  }
  order.sort((a, b) => b.len - a.len);
  for (const o of order) crystalPoint(g, x + o.dx, y - 6 * s, o.w, o.len, o.lean, o.c);
  // Little ones at the foot.
  for (let i = 0; i < 4; i++) crystalPoint(g, x - 18 * s + i * 12 * s, y - 1 * s, 5 * s, (10 + rng() * 6) * s, (i - 1.5) * 0.5, lit(hue, 0.1));
  // Dust in the crooks.
  g.fillStyle(DUST, 0.35); g.fillEllipse(x + 4 * s, y - 2 * s, 30 * s, 5 * s);
}

/**
 * A tall clear quartz spire, alone or with a sister at its foot: the east of the court is a
 * forest of them. Banded with phantoms, a citrine stain at the root, a slight twist.
 */
export function quartzSpire(g: G, x: number, y: number, h: number, rng: () => number, sister = true): void {
  shadow(g, x + h * 0.15, y + 3, h * 0.55, h * 0.13, 0.28);
  glow(g, x, y - h * 0.5, h * 0.35, QUARTZ_LIT, 0.03, 3);
  if (sister) crystalPoint(g, x + h * 0.16, y, h * 0.12, h * 0.42, 0.42, mixC(QUARTZ, AMETHYST, 0.25));
  crystalPoint(g, x, y, h * 0.2, h, (rng() - 0.5) * 0.12, QUARTZ);
  // Phantom bands (ghosts of earlier tips) climbing the spire.
  for (let k = 1; k <= 3; k++) {
    const yy = y - h * 0.18 * k;
    g.lineStyle(1.2, QUARTZ_SHADE, 0.35);
    g.lineBetween(x - h * 0.09, yy + 3, x, yy - h * 0.05);
    g.lineBetween(x, yy - h * 0.05, x + h * 0.09, yy + 3);
  }
  // Citrine stain at the root, and a rubble skirt.
  g.fillStyle(CITRINE, 0.35); g.fillEllipse(x, y - 6, h * 0.2, 10);
  for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? RIND : RIND_DARK, 1); g.fillCircle(x - h * 0.13 + i * h * 0.05, y + 1, 2.5 + rng() * 2); }
  if (!sister) crystalPoint(g, x - h * 0.13, y + 2, h * 0.07, h * 0.2, -0.6, QUARTZ_DARK);
}

/** A brilliant-cut gem, face-up: table, star facets, girdle and a sparkle. */
export function cutGem(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  const pts8: Pt[] = [];
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2 + Math.PI / 8; pts8.push({ x: x + Math.cos(t) * r, y: y + Math.sin(t) * r }); }
  poly(g, pts8, dim(color, 0.3), a);
  const table: Pt[] = pts8.map((p) => ({ x: x + (p.x - x) * 0.5, y: y + (p.y - y) * 0.5 }));
  // Star and kite facets: alternating light and dark wedges between table and girdle.
  for (let i = 0; i < 8; i++) {
    const p0 = pts8[i], p1 = pts8[(i + 1) % 8], t0 = table[i], t1 = table[(i + 1) % 8];
    poly(g, [p0, p1, t1, t0], i % 2 ? color : lit(color, 0.18), a);
  }
  poly(g, table, lit(color, 0.3), a);
  g.lineStyle(1, lit(color, 0.6), 0.6 * a); g.strokePoints(table, true);
  g.lineStyle(1, dim(color, 0.5), 0.5 * a); g.strokePoints(pts8, true);
  g.fillStyle(0xffffff, 0.85 * a); g.fillCircle(x - r * 0.25, y - r * 0.25, Math.max(1, r * 0.14));
}

/** A gem seen from the side: crown, girdle, pavilion — for stalls and the Cutting-House crown. */
export function gemSide(g: G, x: number, y: number, w: number, color: number, a = 1): void {
  const h = w * 0.95;
  const crown = h * 0.32;
  const gl = { x: x - w / 2, y: y - h + crown }, gr = { x: x + w / 2, y: y - h + crown };
  const tl = { x: x - w * 0.28, y: y - h }, tr = { x: x + w * 0.28, y: y - h };
  const cul = { x, y };
  poly(g, [gl, tl, tr, gr], lit(color, 0.2), a);
  poly(g, [gl, gr, cul], color, a);
  poly(g, [{ x, y: gl.y }, gr, cul], dim(color, 0.25), a);
  g.lineStyle(1, lit(color, 0.5), 0.7 * a);
  g.lineBetween(tl.x, tl.y, x - w * 0.12, gl.y); g.lineBetween(tr.x, tr.y, x + w * 0.12, gl.y);
  g.lineBetween(x - w * 0.12, gl.y, cul.x, cul.y); g.lineBetween(x + w * 0.12, gl.y, cul.x, cul.y);
  g.lineStyle(1.5, lit(color, 0.6), 0.9 * a); g.lineBetween(gl.x, gl.y, gr.x, gr.y);
  g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(tl.x + w * 0.1, tl.y + crown * 0.4, Math.max(1, w * 0.06));
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * The geode's wall seen from inside, baked into the ground along one edge strip: rind rock,
 * agate bands laid ring on ring, a chalcedony skin, then the amethyst bed the points stand in.
 * `inward` is the direction (unit) from the wall toward the floor.
 */
export function geodeBands(g: G, r: Rect, inward: 'n' | 's' | 'e' | 'w', rng: () => number): void {
  const bands = [RIND_DARK, RIND, AGATE_A, AGATE_B, AGATE_C, AGATE_D, CHALCEDONY, AMETHYST_DEEP, AMETHYST_DARK];
  const horiz = inward === 'n' || inward === 's';
  const depth = horiz ? r.h : r.w;
  const n = bands.length;
  for (let i = 0; i < n; i++) {
    const d0 = (i / n) * depth;
    const d1 = ((i + 1) / n) * depth;
    // Each band wavers like a tree ring.
    const pts: Pt[] = [];
    const len = horiz ? r.w : r.h;
    const wav = (k: number, off: number) => Math.sin(k / 70 + i * 1.3) * 6 + Math.sin(k / 23 + i) * 2.5 + off;
    for (let k = 0; k <= len; k += 20) {
      const o = wav(k, d0);
      pts.push(horiz ? { x: r.x + k, y: inward === 's' ? r.y + o : r.y + r.h - o } : { x: inward === 'e' ? r.x + o : r.x + r.w - o, y: r.y + k });
    }
    for (let k = len; k >= 0; k -= 20) {
      const o = wav(k, d1 + 4);
      pts.push(horiz ? { x: r.x + k, y: inward === 's' ? r.y + o : r.y + r.h - o } : { x: inward === 'e' ? r.x + o : r.x + r.w - o, y: r.y + k });
    }
    poly(g, pts, bands[i], 1);
  }
  // Fine banding lines, and pits in the rind.
  const len = horiz ? r.w : r.h;
  for (let i = 0; i < len / 6; i++) {
    const k = rng() * len, d = rng() * depth * 0.6;
    const x = horiz ? r.x + k : inward === 'e' ? r.x + d : r.x + r.w - d;
    const y = horiz ? (inward === 's' ? r.y + d : r.y + r.h - d) : r.y + k;
    g.fillStyle(rng() < 0.5 ? RIND_DARK : AGATE_D, 0.35); g.fillCircle(x, y, 1 + rng() * 2);
  }
}

/** Quartz grit floor, with a scatter of chips that catch the light. */
export function gritFloor(g: G, r: Rect, rng: () => number, density = 1): void {
  g.fillStyle(GRIT, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = Math.round((r.w * r.h) / 900 * density);
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.5) { g.fillStyle(GRIT_DARK, 0.35); g.fillRect(x, y, 2, 1.5); }
    else if (k < 0.85) { g.fillStyle(GRIT_LIT, 0.5); g.fillRect(x, y, 1.5, 1.5); }
    else if (k < 0.95) { g.fillStyle(AMETHYST_LIT, 0.45); g.fillTriangle(x, y - 2, x + 1.6, y + 1, x - 1.6, y + 1); }
    else { g.fillStyle(0xffffff, 0.7); g.fillCircle(x, y, 0.9); }
  }
}

/** Polished quartz flags, cut hexagonal, the way a lapidary would pave. */
export function hexFlags(g: G, r: Rect, size: number, rng: () => number): void {
  const hw = size * 0.866;
  for (let row = 0; row * size * 1.5 < r.h + size; row++) {
    for (let col = 0; col * hw * 2 < r.w + hw * 2; col++) {
      const cx = r.x + col * hw * 2 + (row % 2) * hw, cy = r.y + row * size * 1.5;
      if (cx < r.x - hw || cx > r.x + r.w + hw || cy > r.y + r.h + size) continue;
      const pts: Pt[] = [];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; pts.push({ x: cx + Math.cos(a) * (size - 1.5), y: cy + Math.sin(a) * (size - 1.5) * 0.92 }); }
      const tone = rng();
      poly(g, pts, tone < 0.1 ? mixC(FLAG, AMETHYST_LIT, 0.25) : tone < 0.2 ? FLAG_DARK : FLAG, 1);
      g.lineStyle(1, lit(FLAG, 0.5), 0.5); g.lineBetween(pts[3].x, pts[3].y, pts[4].x, pts[4].y);
      if (tone > 0.94) { g.fillStyle(0xffffff, 0.5); g.fillCircle(cx - size * 0.3, cy - size * 0.2, 1.5); }
    }
  }
  g.lineStyle(2, FLAG_DARK, 0.4); g.strokeRect(r.x, r.y, r.w, r.h);
}

/** A path of crushed crystal: violet-flecked, edged in grit. */
export function crystalPath(g: G, pts: Pt[], w: number, rng: () => number): void {
  g.lineStyle(w + 8, GRIT_DARK, 0.6); g.strokePoints(pts, false);
  g.lineStyle(w, mixC(GRIT_LIT, AMETHYST_LIT, 0.12), 1); g.strokePoints(pts, false);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 9) {
      const t = d / len;
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const o = (rng() - 0.5) * w * 0.9;
      const x = a.x + (b.x - a.x) * t + nx * o, y = a.y + (b.y - a.y) * t + ny * o;
      g.fillStyle(rng() < 0.3 ? AMETHYST : rng() < 0.5 ? QUARTZ_LIT : GRIT_DARK, 0.5); g.fillRect(x, y, 2, 2);
    }
  }
}

/**
 * The crystal pool: still water so clear you see the amethyst bed beneath, points pushing up
 * through it, a lip of white chalcedony. Static; `poolShimmer` animates the surface.
 */
export function crystalPool(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // Chalcedony lip (several rings, like the walls in miniature).
  for (let i = 0; i < 4; i++) {
    g.fillStyle([AGATE_B, CHALCEDONY_DARK, CHALCEDONY, AGATE_D][i], 1);
    g.fillEllipse(cx, cy, r.w + 40 - i * 10, r.h + 34 - i * 8);
  }
  g.fillStyle(POOL_DEEP, 1); g.fillEllipse(cx, cy, r.w, r.h);
  // The amethyst bed under the water.
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 0.85;
    const x = cx + Math.cos(a) * d * r.w * 0.5, y = cy + Math.sin(a) * d * r.h * 0.5;
    crystalPoint(g, x, y + 6, 6 + rng() * 6, 10 + rng() * 14, (rng() - 0.5) * 1.2, mixC(AMETHYST, POOL_DEEP, 0.45), 0.8);
  }
  g.fillStyle(POOL, 0.45); g.fillEllipse(cx, cy, r.w * 0.96, r.h * 0.92);
  g.fillStyle(POOL_LIT, 0.18); g.fillEllipse(cx - r.w * 0.12, cy - r.h * 0.15, r.w * 0.55, r.h * 0.35);
  // Points that break the surface round the edge.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.3;
    const x = cx + Math.cos(a) * r.w * 0.47, y = cy + Math.sin(a) * r.h * 0.46;
    crystalPoint(g, x, y, 7 + rng() * 4, 14 + rng() * 10, Math.cos(a) * 0.5, AMETHYST_LIT);
  }
}

/** The pool surface: slow rings and a violet glimmer off the bed. `t` in seconds. */
export function poolShimmer(g: G, r: Rect, t: number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (let i = 0; i < 3; i++) {
    const ph = (t / 4 + i / 3) % 1;
    const x = cx + Math.cos(i * 2.1) * r.w * 0.22, y = cy + Math.sin(i * 1.7) * r.h * 0.2;
    g.lineStyle(1.2, POOL_LIT, 0.35 * (1 - ph)); g.strokeEllipse(x, y, 10 + ph * 70, 4 + ph * 26);
  }
  for (let i = 0; i < 7; i++) {
    const tw = Math.sin(t * 2 + i * 1.9);
    if (tw < 0.6) continue;
    g.fillStyle(AMETHYST_LIT, (tw - 0.6) * 1.6);
    g.fillCircle(cx + Math.cos(i * 2.4) * r.w * 0.35, cy + Math.sin(i * 3.1) * r.h * 0.3, 2);
  }
}

/**
 * A rainbow band the prisms throw on the floor: six soft stripes fanning from (x, y) along
 * angle `a`. Used in `animate` (they drift as the sun moves) and in the fight floor.
 */
export function spectrumBand(g: G, x: number, y: number, a: number, len: number, spread: number, alpha: number): void {
  for (let i = 0; i < SPECTRUM.length; i++) {
    const a0 = a - spread / 2 + (spread * i) / SPECTRUM.length, a1 = a0 + spread / SPECTRUM.length;
    g.fillStyle(SPECTRUM[i], alpha);
    g.fillTriangle(x, y, x + Math.cos(a0) * len, y + Math.sin(a0) * len * 0.6, x + Math.cos(a1) * len, y + Math.sin(a1) * len * 0.6);
  }
}

// ── Buildings ────────────────────────────────────────────────────────

/**
 * A geode house: walls of cut rind-stone in courses, a roof of overlapping amethyst slates (the
 * offcuts no grader would take), a crystal-pane window, a dust-grey door. Returns the door point.
 */
export function geodeHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, opts: { glow?: number; roof?: number; sign?: boolean } = {}): Pt {
  const roof = opts.roof ?? AMETHYST_DARK;
  shadow(g, x, y + 4, w * 1.15, 22);
  const x0 = x - w / 2, top = y - h;
  // Coursed stone walls.
  g.fillStyle(RIND_DARK, 1); g.fillRect(x0 - 2, top, w + 4, h);
  for (let row = 0; row * 11 < h; row++) {
    const yy = top + row * 11;
    for (let bx = x0 + ((row % 2) * 9) - 9; bx < x0 + w; bx += 18) {
      const sx = Math.max(x0, bx), ex = Math.min(x0 + w, bx + 17);
      if (ex <= sx) continue;
      g.fillStyle(mixC(RIND, RIND_LIT, rng() * 0.6), 1); g.fillRect(sx, yy + 1, ex - sx, 10);
    }
  }
  g.fillStyle(DUST, 0.25); g.fillRect(x0, y - 8, w, 8);
  // Roof of amethyst slates: rows of pointed shards, overlapping downward.
  const roofH = h * 0.62;
  poly(g, [{ x: x0 - 12, y: top + 2 }, { x: x0 + w + 12, y: top + 2 }, { x: x + w * 0.18, y: top - roofH }, { x: x - w * 0.18, y: top - roofH }], dim(roof, 0.35));
  for (let row = 0; row < 4; row++) {
    const ry = top - roofH + (row + 1) * (roofH / 4);
    const half = w * 0.18 + ((w / 2 + 12 - w * 0.18) * (row + 1)) / 4;
    for (let sx = x - half; sx < x + half; sx += 10) {
      const c = mixC(roof, AMETHYST_LIT, rng() * 0.35);
      g.fillStyle(c, 1); g.fillTriangle(sx, ry - roofH / 4 - 2, sx + 10, ry - roofH / 4 - 2, sx + 5, ry + 2);
      g.fillStyle(lit(c, 0.3), 0.6); g.fillTriangle(sx + 1, ry - roofH / 4 - 2, sx + 4, ry - roofH / 4 - 2, sx + 5, ry);
    }
  }
  // Ridge crystal.
  crystalPoint(g, x, top - roofH + 2, 8, 18, 0, AMETHYST_LIT);
  // A window of crystal panes, lit or dark.
  const wy = top + h * 0.28, ww = Math.min(26, w * 0.22);
  const glowC = opts.glow ?? 0;
  for (const wx of [x0 + w * 0.22, x0 + w * 0.78]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - ww / 2 - 2, wy - 2, ww + 4, ww * 0.9 + 4);
    g.fillStyle(glowC ? glowC : 0x2a2436, 1); g.fillRect(wx - ww / 2, wy, ww, ww * 0.9);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(glowC ? lit(glowC, 0.2 + (i % 2) * 0.2) : QUARTZ_SHADE, glowC ? 0.8 : 0.45);
      g.fillTriangle(wx - ww / 2 + (i % 2) * ww / 2, wy + Math.floor(i / 2) * ww * 0.45, wx + (i % 2) * ww / 2, wy + Math.floor(i / 2) * ww * 0.45, wx - ww / 2 + (i % 2) * ww / 2, wy + (Math.floor(i / 2) + 1) * ww * 0.45);
    }
    if (glowC) glow(g, wx, wy + ww * 0.45, ww, glowC, 0.05, 2);
  }
  // Door.
  g.fillStyle(SLATE, 1); g.fillRoundedRect(x - 11, y - 30, 22, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(dim(SLATE, 0.3), 1); g.fillRect(x - 1, y - 28, 2, 28);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 6, y - 14, 1.6);
  // Doorstep.
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x - 16, y - 3, 32, 4);
  if (opts.sign) {
    g.fillStyle(TIMBER, 1); g.fillRect(x + w / 2 - 6, top + 10, 4, 22);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + w / 2 - 2, top + 14, 22, 3);
    cutGem(g, x + w / 2 + 14, top + 26, 7, AMETHYST);
  }
  return { x, y: y + 16 };
}

/**
 * A lapidary's workshop: a deep open front under a slate awning, a lap wheel spinning on its
 * treadle, a bench of half-cut stones, a rack of dop sticks, and the grit trough below.
 */
export function lapidaryShop(g: G, x: number, y: number, w: number, rng: () => number, hue = AMETHYST): void {
  const h = 92;
  shadow(g, x, y + 4, w * 1.1, 22);
  const x0 = x - w / 2, top = y - h;
  // Back wall and side piers.
  g.fillStyle(RIND_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(dim(RIND, 0.1), 1); g.fillRect(x0 + 10, top + 14, w - 20, h - 14);
  for (const px of [x0, x0 + w - 14]) {
    g.fillStyle(RIND, 1); g.fillRect(px, top, 14, h);
    g.fillStyle(RIND_LIT, 0.7); g.fillRect(px + 1, top, 3, h);
    for (let k = 0; k < h; k += 12) { g.fillStyle(RIND_DARK, 0.6); g.fillRect(px, top + k, 14, 1.5); }
  }
  // Shelves of rough stones and finished cuts on the back wall.
  for (let s = 0; s < 2; s++) {
    const sy = top + 30 + s * 24;
    g.fillStyle(TIMBER, 1); g.fillRect(x0 + 18, sy, w - 36, 4);
    for (let i = 0; i < (w - 44) / 13; i++) {
      const gx = x0 + 26 + i * 13;
      if (s === 0) gemSide(g, gx, sy, 8, [hue, CITRINE, QUARTZ, ROSE][i % 4]);
      else { g.fillStyle(SMOKY, 1); g.fillCircle(gx, sy - 4, 4 + rng() * 2); g.fillStyle(lit(hue, 0.2), 0.8); g.fillCircle(gx - 1, sy - 5, 1.6); }
    }
  }
  // Slate awning, scalloped.
  g.fillStyle(SLATE, 1); g.fillRect(x0 - 8, top - 6, w + 16, 12);
  for (let sx = x0 - 8; sx < x0 + w + 8; sx += 14) { g.fillStyle(dim(SLATE, 0.2), 1); g.fillTriangle(sx, top + 6, sx + 14, top + 6, sx + 7, top + 13); }
  g.fillStyle(lit(SLATE, 0.25), 1); g.fillRect(x0 - 8, top - 6, w + 16, 2);
  // The lap wheel: a flat disc on a treadle frame, a stone held to it on a dop stick.
  const lx = x0 + w * 0.3, ly = y - 26;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(lx - 20, ly, 40, 26); g.fillRect(lx - 22, ly + 22, 44, 4);
  g.fillStyle(TIMBER, 1); g.fillRect(lx - 18, ly + 2, 36, 6);
  g.fillStyle(IRON, 1); g.fillEllipse(lx, ly - 2, 46, 13);
  g.fillStyle(QUARTZ_DARK, 1); g.fillEllipse(lx, ly - 4, 42, 11);
  g.lineStyle(1, QUARTZ_LIT, 0.6); g.strokeEllipse(lx, ly - 4, 30, 7); g.strokeEllipse(lx, ly - 4, 16, 4);
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(lx + 26, ly - 26, lx + 6, ly - 6);
  gemSide(g, lx + 6, ly - 4, 7, hue);
  // A treadle and a water drip can.
  g.fillStyle(IRON, 1); g.fillRect(lx - 14, y - 4, 28, 3);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(lx - 30, ly - 22, 9, 10); g.fillStyle(BRASS, 1); g.fillRect(lx - 29, ly - 21, 7, 3);
  // The bench of half-cut stones.
  const bx = x0 + w * 0.7;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(bx - 34, y - 22, 68, 22);
  g.fillStyle(TIMBER, 1); g.fillRect(bx - 36, y - 26, 72, 6);
  g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(bx - 36, y - 26, 72, 1.5);
  for (let i = 0; i < 4; i++) cutGem(g, bx - 24 + i * 16, y - 30, 4.5, [hue, QUARTZ, CITRINE, ROSE][i]);
  // Dop sticks in a pot.
  g.fillStyle(SMOKY, 1); g.fillRect(bx + 26, y - 42, 9, 14);
  for (let i = 0; i < 4; i++) { g.lineStyle(1.5, TIMBER_LIT, 1); g.lineBetween(bx + 28 + i * 2, y - 42, bx + 26 + i * 3, y - 54); g.fillStyle(0x3a2a20, 1); g.fillCircle(bx + 26 + i * 3, y - 54, 1.6); }
  // The grit trough and the dust it leaves.
  g.fillStyle(SLATE, 1); g.fillRect(x0 + 6, y - 6, w - 12, 6);
  g.fillStyle(DUST, 0.5); g.fillEllipse(x, y + 2, w * 0.9, 8);
}

/**
 * The Cutting-House — Prince Facet's keep, where every stone in the court is graded and cut.
 * A stepped hall clad in cut crystal panels, each a different facet so the face throws light
 * like a jewel; a great table-facet window over the door; a tower crowned with a brilliant
 * the size of a cart; the grading steps out front where the Tithe is laid.
 */
export function cuttingHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.1, 40);
  const x0 = x - w / 2;
  // Plinth: three courses of polished stone.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? FLAG : FLAG_DARK, 1); g.fillRect(x0 - 16 + k * 8, y - 12 - k * 10, w + 32 - k * 16, 12);
    g.fillStyle(QUARTZ_LIT, 0.4); g.fillRect(x0 - 16 + k * 8, y - 12 - k * 10, w + 32 - k * 16, 2);
  }
  const base = y - 40;
  // Wings: lower, stepped back, clad in faceted panels.
  const wingH = h * 0.55;
  for (const side of [-1, 1]) {
    const wx0 = side < 0 ? x0 : x + w * 0.22;
    const ww = w * 0.28;
    panelWall(g, wx0, base - wingH, ww, wingH, rng, FACET_DARK);
    // Stepped parapet of crystal points.
    for (let i = 0; i < 5; i++) crystalPoint(g, wx0 + 8 + i * (ww - 16) / 4, base - wingH + 2, 9, 20 + (i % 2) * 10, (i - 2) * 0.12, FACET);
  }
  // The great hall.
  const hx0 = x - w * 0.22, hw = w * 0.44;
  panelWall(g, hx0, base - h, hw, h, rng, FACET);
  // Pediment of cut facets.
  poly(g, [{ x: hx0 - 8, y: base - h }, { x: hx0 + hw + 8, y: base - h }, { x, y: base - h - 50 }], FACET_DARK);
  poly(g, [{ x: hx0 + 6, y: base - h - 4 }, { x, y: base - h - 44 }, { x, y: base - h - 4 }], FACET_LIT, 0.8);
  poly(g, [{ x, y: base - h - 4 }, { x, y: base - h - 44 }, { x: hx0 + hw - 6, y: base - h - 4 }], FACET, 0.9);
  // The tower behind, and its crown: a brilliant the size of a cart, set in brass claws.
  const tw = hw * 0.36;
  const ttop = base - h - 140;
  panelWall(g, x - tw / 2, ttop, tw, 100, rng, FACET_DARK);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - tw / 2 - 6, ttop - 6, tw + 12, 8);
  for (const k of [-1, -0.35, 0.35, 1]) { g.lineStyle(4, BRASS, 1); g.lineBetween(x + k * tw * 0.5, ttop - 4, x + k * tw * 0.42, ttop - 46); }
  glow(g, x, ttop - 40, 60, FACET_LIT, 0.05, 4);
  gemSide(g, x, ttop - 6, tw * 0.95, FACET_LIT);
  // The table-facet window over the door: an octagon of panes.
  const wy = base - h * 0.58;
  glow(g, x, wy, 46, AMETHYST_LIT, 0.05, 3);
  cutGem(g, x, wy, 34, mixC(AMETHYST, FACET_LIT, 0.4));
  g.lineStyle(3, BRASS_DARK, 1);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; g.lineBetween(x, wy, x + Math.cos(a) * 34, wy + Math.sin(a) * 34); }
  // The door: tall, pointed, banded in brass, the Regent's spade-and-scale seal above it.
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 28, base - 74, 56, 74, { tl: 28, tr: 28, bl: 0, br: 0 });
  g.fillStyle(0x2a2238, 1); g.fillRoundedRect(x - 23, base - 69, 46, 69, { tl: 23, tr: 23, bl: 0, br: 0 });
  for (const yy of [base - 50, base - 26]) { g.fillStyle(BRASS, 1); g.fillRect(x - 23, yy, 46, 3); }
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, base - 69, x, base);
  regentSeal(g, x, base - 86, 9);
  // Grading steps out front: two long white steps with the carat marks cut into them.
  for (let k = 0; k < 2; k++) {
    g.fillStyle(k ? FLAG : QUARTZ, 1); g.fillRect(x - 70 - k * 14, y - 8 + k * 6, 140 + k * 28, 6);
    for (let m = 0; m < 8; m++) { g.fillStyle(QUARTZ_SHADE, 0.6); g.fillRect(x - 60 - k * 12 + m * (120 + k * 24) / 7, y - 7 + k * 6, 1.5, 4); }
  }
}

/** A wall clad in cut crystal panels, each set at its own angle so each catches light differently. */
function panelWall(g: G, x0: number, y0: number, w: number, h: number, rng: () => number, base: number): void {
  g.fillStyle(dim(base, 0.45), 1); g.fillRect(x0, y0, w, h);
  const cols = Math.max(2, Math.round(w / 34)), rows = Math.max(2, Math.round(h / 30));
  const cw = w / cols, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x0 + c * cw, py = y0 + r * rh;
      const tone = rng();
      const cc = tone < 0.15 ? lit(base, 0.35) : tone < 0.5 ? base : dim(base, 0.18);
      const cxm = px + cw / 2, cym = py + rh / 2;
      // Each panel is four facets round a centre.
      poly(g, [{ x: px + 2, y: py + 2 }, { x: px + cw - 2, y: py + 2 }, { x: cxm, y: cym }], lit(cc, 0.12));
      poly(g, [{ x: px + cw - 2, y: py + 2 }, { x: px + cw - 2, y: py + rh - 2 }, { x: cxm, y: cym }], dim(cc, 0.12));
      poly(g, [{ x: px + cw - 2, y: py + rh - 2 }, { x: px + 2, y: py + rh - 2 }, { x: cxm, y: cym }], dim(cc, 0.25));
      poly(g, [{ x: px + 2, y: py + rh - 2 }, { x: px + 2, y: py + 2 }, { x: cxm, y: cym }], cc);
      if (tone > 0.92) { g.fillStyle(0xffffff, 0.7); g.fillCircle(px + cw * 0.3, py + rh * 0.3, 1.6); }
    }
  }
  g.lineStyle(2, BRASS_DARK, 0.9); g.strokeRect(x0, y0, w, h);
  for (let c = 1; c < cols; c++) { g.lineStyle(1.2, BRASS_DARK, 0.7); g.lineBetween(x0 + c * cw, y0, x0 + c * cw, y0 + h); }
}

/** The Regent's seal: a spade crossed over a balance, in a ring — his mark on all he owns. */
export function regentSeal(g: G, x: number, y: number, r: number, color = BRASS): void {
  g.fillStyle(dim(color, 0.4), 1); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(color, 1); g.fillCircle(x, y, r);
  g.fillStyle(dim(color, 0.55), 1); g.fillCircle(x, y, r * 0.78);
  g.lineStyle(Math.max(1, r * 0.12), lit(color, 0.3), 1);
  g.lineBetween(x - r * 0.55, y - r * 0.3, x + r * 0.55, y - r * 0.3);
  g.lineBetween(x, y - r * 0.55, x, y + r * 0.5);
  g.lineBetween(x - r * 0.55, y - r * 0.3, x - r * 0.65, y + r * 0.05); g.lineBetween(x + r * 0.55, y - r * 0.3, x + r * 0.65, y + r * 0.05);
  g.fillStyle(lit(color, 0.3), 1); g.fillTriangle(x - r * 0.18, y + r * 0.2, x + r * 0.18, y + r * 0.2, x, y + r * 0.6);
}

// ── Court furniture ──────────────────────────────────────────────────

/**
 * The great prism of the square: a triangular quartz prism taller than a man, on a carved drum
 * plinth with the six colours inlaid round it. The light from the crack falls on it at noon.
 */
export function greatPrism(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 120, 30);
  // Drum plinth.
  g.fillStyle(FLAG_DARK, 1); g.fillEllipse(x, y - 4, 110, 30);
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x - 55, y - 34, 110, 30);
  g.fillStyle(FLAG, 1); g.fillEllipse(x, y - 34, 110, 30);
  for (let i = 0; i < SPECTRUM.length; i++) {
    g.fillStyle(SPECTRUM[i], 0.85); g.fillRect(x - 51 + i * 17, y - 20, 15, 6);
  }
  g.fillStyle(QUARTZ_LIT, 0.35); g.fillEllipse(x - 14, y - 38, 54, 10);
  // The prism: three long faces, the near two visible, end-triangle on top.
  const pw = 34, ph = 110, top = y - 34 - ph;
  poly(g, [{ x: x - pw, y: y - 34 }, { x, y: y - 28 }, { x, y: top + 6 }, { x: x - pw, y: top }], QUARTZ, 0.9);
  poly(g, [{ x, y: y - 28 }, { x: x + pw, y: y - 34 }, { x: x + pw, y: top }, { x, y: top + 6 }], QUARTZ_DARK, 0.9);
  poly(g, [{ x: x - pw, y: top }, { x, y: top + 6 }, { x: x + pw, y: top }, { x: x + 4, y: top - 12 }], QUARTZ_LIT, 0.95);
  // Rainbow caught inside the glass, and inclusions.
  for (let i = 0; i < SPECTRUM.length; i++) {
    g.lineStyle(3, SPECTRUM[i], 0.35); g.lineBetween(x + 2, top + 30 + i * 4, x + pw - 3, top + 22 + i * 7);
  }
  for (let i = 0; i < 6; i++) { g.fillStyle(0xffffff, 0.35); g.fillCircle(x - pw + 6 + rng() * (pw * 1.8), top + 20 + rng() * (ph - 30), 1.2); }
  g.lineStyle(1.5, QUARTZ_LIT, 0.9); g.lineBetween(x, top + 6, x, y - 28);
  g.lineStyle(1, QUARTZ_SHADE, 0.6); g.strokePoints([{ x: x - pw, y: y - 34 }, { x: x - pw, y: top }, { x: x + 4, y: top - 12 }, { x: x + pw, y: top }, { x: x + pw, y: y - 34 }], false);
  // Brass clamps where it meets the plinth.
  for (const k of [-1, 1]) { g.fillStyle(BRASS, 1); g.fillRect(x + k * pw * 0.6 - 5, y - 42, 10, 10); g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x + k * pw * 0.6 - 5, y - 42, 10, 2); }
}

/**
 * The Loupe Table — where the Tithe is graded. A long stone bench with a brass carat balance at
 * one end, a velvet tray of stones in the middle, and over it all a lens the size of a cartwheel
 * on a jointed brass arm, so the grader can find a flaw from across the room.
 */
export function loupeTable(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 230, 28);
  // The bench.
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x - 100, y - 36, 200, 36);
  g.fillStyle(FLAG, 1); g.fillRect(x - 106, y - 44, 212, 10);
  g.fillStyle(QUARTZ_LIT, 0.5); g.fillRect(x - 106, y - 44, 212, 2);
  for (const k of [-80, -20, 40]) { g.fillStyle(dim(FLAG_DARK, 0.2), 1); g.fillRect(x + k, y - 34, 3, 34); }
  // Velvet tray of tithe stones.
  g.fillStyle(0x3a1a4a, 1); g.fillRect(x - 40, y - 52, 80, 9);
  for (let i = 0; i < 6; i++) cutGem(g, x - 32 + i * 13, y - 48, 4, [AMETHYST, QUARTZ, CITRINE, AMETHYST, ROSE, QUARTZ][i]);
  // A reject pile at the near end: stones with a chalk cross on them.
  for (let i = 0; i < 5; i++) {
    const rx = x - 86 + (i % 3) * 9, ry = y - 48 - Math.floor(i / 3) * 6;
    g.fillStyle(SMOKY, 1); g.fillCircle(rx, ry, 4);
    g.lineStyle(1.2, 0xffffff, 0.8); g.lineBetween(rx - 2, ry - 2, rx + 2, ry + 2); g.lineBetween(rx + 2, ry - 2, rx - 2, ry + 2);
  }
  // The carat balance.
  const bx = x + 78;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - 2, y - 84, 4, 40);
  g.lineStyle(2, BRASS, 1); g.lineBetween(bx - 22, y - 80, bx + 22, y - 84);
  for (const k of [-1, 1]) {
    const px = bx + k * 22, py = y - 82 - k * 2;
    g.lineStyle(1, BRASS_LIT, 1); g.lineBetween(px, py, px - 6, py + 14); g.lineBetween(px, py, px + 6, py + 14);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, py + 15, 16, 4);
  }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(bx, y - 86, 3);
  // The great loupe on its arm.
  const ax = x - 60;
  g.fillStyle(IRON, 1); g.fillRect(ax - 4, y - 120, 8, 76);
  g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(ax, y - 118, ax + 40, y - 150); g.lineBetween(ax + 40, y - 150, ax + 70, y - 120);
  g.lineStyle(3, BRASS, 1); g.lineBetween(ax, y - 118, ax + 40, y - 150); g.lineBetween(ax + 40, y - 150, ax + 70, y - 120);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(ax + 40, y - 150, 4); g.fillCircle(ax, y - 118, 4);
  const lx = ax + 70, ly = y - 100;
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, ly, 52, 40);
  g.fillStyle(POOL_LIT, 0.35); g.fillEllipse(lx, ly, 44, 33);
  // Through the lens, a stone looks enormous — and its flaw shows.
  cutGem(g, lx, ly + 2, 10, AMETHYST, 0.8);
  g.lineStyle(1.2, 0xffffff, 0.9); g.lineBetween(lx - 4, ly - 4, lx + 3, ly + 6);
  g.fillStyle(0xffffff, 0.45); g.fillEllipse(lx - 10, ly - 8, 14, 7);
}

/**
 * The Grinding Wheel — where flawed stones go. A millstone the height of two men turning in a
 * trough, a hopper of rejected stones above, white dust sifting out into a drift below.
 */
export function grindingWheel(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 150, 30);
  // The dust drift.
  g.fillStyle(DUST, 0.8); g.fillEllipse(x + 40, y - 2, 110, 22);
  g.fillStyle(0xffffff, 0.5); g.fillEllipse(x + 30, y - 6, 60, 10);
  // The trough.
  g.fillStyle(SLATE, 1); g.fillRect(x - 60, y - 22, 120, 22);
  g.fillStyle(lit(SLATE, 0.2), 1); g.fillRect(x - 62, y - 26, 124, 6);
  // The stone, edge-on: a great disc with a square iron eye and a dressing of grooves.
  const r = 52, cy = y - 22 - r + 10;
  g.fillStyle(dim(GRIT_DARK, 0.2), 1); g.fillCircle(x, cy, r + 3);
  g.fillStyle(GRIT_DARK, 1); g.fillCircle(x, cy, r);
  g.fillStyle(GRIT, 1); g.fillCircle(x - 4, cy - 4, r - 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.lineStyle(1.5, GRIT_DARK, 0.6); g.lineBetween(x + Math.cos(a) * 14, cy + Math.sin(a) * 14, x + Math.cos(a + 0.35) * (r - 6), cy + Math.sin(a + 0.35) * (r - 6));
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 9, cy - 9, 18, 18);
  g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(x - 9, cy - 9, 18, 3);
  // Axle and the frame it turns in.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 70, cy - 4, 140, 8);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER, 1); g.fillRect(x + k * 66 - 5, cy - 6, 10, y - cy - 18); }
  // The hopper of rejects above, with the chalk crosses.
  g.fillStyle(TIMBER_DARK, 1); poly(g, [{ x: x - 40, y: cy - r - 30 }, { x: x + 40, y: cy - r - 30 }, { x: x + 14, y: cy - r + 2 }, { x: x - 14, y: cy - r + 2 }], TIMBER_DARK);
  for (let i = 0; i < 9; i++) {
    const sx = x - 30 + i * 7.5, sy = cy - r - 32 - (i % 2) * 4;
    g.fillStyle([AMETHYST, QUARTZ_DARK, CITRINE_DARK, SMOKY][i % 4], 1); g.fillCircle(sx, sy, 4 + rng() * 1.5);
    g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(sx - 2, sy - 2, sx + 2, sy + 2); g.lineBetween(sx + 2, sy - 2, sx - 2, sy + 2);
  }
}

/**
 * A tuning crystal: a long clear rod held upright in a forked brass mount on a stone foot, a
 * striker hung beside it. `hum` (0–1) brightens it and throws rings.
 */
export function tuningCrystal(g: G, x: number, y: number, s: number, hum = 0, hue = QUARTZ): void {
  shadow(g, x, y + 2, 34 * s, 9 * s);
  g.fillStyle(FLAG_DARK, 1); g.fillEllipse(x, y - 2 * s, 30 * s, 10 * s);
  g.fillStyle(FLAG, 1); g.fillEllipse(x, y - 5 * s, 26 * s, 8 * s);
  // The fork.
  g.lineStyle(3 * s, BRASS_DARK, 1); g.lineBetween(x, y - 6 * s, x, y - 18 * s);
  g.lineBetween(x, y - 18 * s, x - 7 * s, y - 28 * s); g.lineBetween(x, y - 18 * s, x + 7 * s, y - 28 * s);
  g.lineStyle(1.5 * s, BRASS_LIT, 1); g.lineBetween(x - 1, y - 6 * s, x - 1, y - 18 * s);
  // The rod.
  if (hum > 0) glow(g, x, y - 50 * s, 26 * s, lit(hue, 0.3), 0.05 + hum * 0.08, 3);
  crystalPoint(g, x, y - 22 * s, 9 * s, 62 * s, 0, hum > 0 ? lit(hue, 0.25 * hum) : hue, 0.95);
  // The striker on its cord.
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x + 7 * s, y - 28 * s, x + 12 * s, y - 14 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillCircle(x + 12 * s, y - 12 * s, 2.5 * s);
}

/**
 * A geode as it comes out of the ground: a knobbly grey ball. Open, it is split in two and the
 * cavity inside glitters with crystal, a gem nestled in the middle.
 */
export function geodeStone(g: G, x: number, y: number, r: number, open: number, inner = AMETHYST, gem?: number): void {
  shadow(g, x, y + 2, r * 2.2, r * 0.6);
  if (open <= 0) {
    g.fillStyle(RIND_DARK, 1); g.fillCircle(x, y - r * 0.8, r);
    g.fillStyle(RIND, 1); g.fillCircle(x - r * 0.08, y - r * 0.88, r * 0.9);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      g.fillStyle(i % 2 ? RIND_LIT : RIND_DARK, 0.7);
      g.fillCircle(x + Math.cos(a) * r * 0.55, y - r * 0.8 + Math.sin(a) * r * 0.55, r * 0.16);
    }
    g.fillStyle(RIND_LIT, 0.6); g.fillEllipse(x - r * 0.35, y - r * 1.25, r * 0.6, r * 0.3);
    return;
  }
  // Two halves falling apart, cavities up.
  const sep = r * 0.35 * open;
  for (const k of [-1, 1]) {
    const hx = x + k * (r * 0.5 + sep);
    g.fillStyle(RIND_DARK, 1); g.fillEllipse(hx, y - r * 0.4, r * 1.1, r * 0.95);
    g.fillStyle(AGATE_D, 1); g.fillEllipse(hx, y - r * 0.5, r * 0.92, r * 0.72);
    g.fillStyle(dim(inner, 0.4), 1); g.fillEllipse(hx, y - r * 0.5, r * 0.72, r * 0.54);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      crystalPoint(g, hx + Math.cos(a) * r * 0.26, y - r * 0.42 + Math.sin(a) * r * 0.18, r * 0.16, r * 0.3, Math.cos(a) * 0.6, inner);
    }
  }
  if (gem !== undefined && open < 1) cutGem(g, x, y - r * (0.9 + open * 0.8), r * 0.38, gem, 1 - open * 0.5);
}

/**
 * A crystal bed in the Druse Gardens: a stone-kerbed tray of nutrient slurry with seed crystals
 * planted in rows at every stage, from a glint to a hand-high point. Grown, not mined.
 */
export function druseBed(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x + w / 2, y + h + 2, w * 1.02, 12, 0.2);
  g.fillStyle(FLAG_DARK, 1); g.fillRect(x - 4, y - 4, w + 8, h + 8);
  g.fillStyle(0x4a4058, 1); g.fillRect(x, y, w, h);
  g.fillStyle(mixC(0x4a4058, AMETHYST, 0.25), 0.6); g.fillRect(x + 2, y + 2, w - 4, h * 0.4);
  const rows = Math.max(2, Math.round(h / 26));
  for (let r = 0; r < rows; r++) {
    const yy = y + (r + 0.8) * (h / rows);
    for (let xx = x + 12; xx < x + w - 8; xx += 18) {
      const stage = ((xx - x) / w + r * 0.2 + rng() * 0.15) % 1;
      if (stage < 0.2) { g.fillStyle(AMETHYST_LIT, 0.8); g.fillCircle(xx, yy - 2, 1.5); continue; }
      crystalPoint(g, xx, yy, 3 + stage * 6, 6 + stage * 18, (rng() - 0.5) * 0.3, mixC(AMETHYST, AMETHYST_LIT, rng() * 0.3));
    }
    // Little marker tags at each row's end.
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x + w - 6, yy - 10, 2, 10); g.fillStyle(AGATE_D, 1); g.fillRect(x + w - 10, yy - 12, 10, 5);
  }
}

/** A gem-seller's stall: trestle, velvet, a fan of stones under a crystal-pane canopy. */
export function gemStall(g: G, x: number, y: number, cloth: number, rng: () => number): void {
  shadow(g, x, y + 3, 100, 18);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 40 - 2, y - 66, 4, 66); }
  // Canopy of crystal panes in a timber frame.
  poly(g, [{ x: x - 50, y: y - 60 }, { x: x + 50, y: y - 60 }, { x: x + 40, y: y - 76 }, { x: x - 40, y: y - 76 }], TIMBER);
  for (let i = 0; i < 5; i++) {
    poly(g, [{ x: x - 46 + i * 19, y: y - 61 }, { x: x - 30 + i * 19, y: y - 61 }, { x: x - 32 + i * 16, y: y - 74 }, { x: x - 40 + i * 16, y: y - 74 }], i % 2 ? QUARTZ : mixC(QUARTZ, cloth, 0.3), 0.75);
  }
  // Trestle and velvet.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 44, y - 30, 88, 30);
  g.fillStyle(cloth, 1); g.fillRect(x - 46, y - 34, 92, 14);
  for (let k = 0; k < 6; k++) { g.fillStyle(dim(cloth, 0.3), 1); g.fillTriangle(x - 46 + k * 15.3, y - 20, x - 46 + (k + 1) * 15.3, y - 20, x - 46 + (k + 0.5) * 15.3, y - 14); }
  for (let i = 0; i < 6; i++) cutGem(g, x - 36 + i * 14.5, y - 30 + (i % 2) * 3, 4.5, [AMETHYST, CITRINE, QUARTZ, ROSE, AMETHYST_LIT, QUARTZ_DARK][(i + Math.floor(rng() * 3)) % 6]);
}

/**
 * A piezo crystal plate set into the floor: a flat tourmaline slab, banded pink to green, in a
 * copper frame. `charge` (0–1) lights its bands and makes it crackle.
 */
export function piezoPlate(g: G, x: number, y: number, r: number, charge: number, t: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.62 }); }
  poly(g, pts.map((p) => ({ x: x + (p.x - x) * 1.12, y: y + (p.y - y) * 1.12 })), 0xa0603a);
  poly(g, pts, 0x2e3a3a);
  // Tourmaline banding: watermelon, pink core in a green skin.
  for (let k = 0; k < 3; k++) {
    const s = 0.85 - k * 0.25;
    poly(g, pts.map((p) => ({ x: x + (p.x - x) * s, y: y + (p.y - y) * s })), [0x3a8a5a, 0xe8e0d0, 0xe0508a][k], 0.55 + charge * 0.4);
  }
  if (charge > 0.05) {
    glow(g, x, y, r * 1.2, 0xbff4ff, 0.03 + charge * 0.07, 3);
    const n = Math.floor(2 + charge * 5);
    for (let i = 0; i < n; i++) {
      const a = t * 9 + i * 2.3;
      const x1 = x + Math.cos(a) * r * 0.25, y1 = y + Math.sin(a) * r * 0.16;
      const x2 = x + Math.cos(a + 0.7) * r * 0.85, y2 = y + Math.sin(a + 0.7) * r * 0.52;
      g.lineStyle(1.5, 0xe8fcff, 0.4 + charge * 0.6);
      g.lineBetween(x1, y1, (x1 + x2) / 2 + Math.sin(t * 40 + i) * 4, (y1 + y2) / 2); g.lineBetween((x1 + x2) / 2 + Math.sin(t * 40 + i) * 4, (y1 + y2) / 2, x2, y2);
    }
  }
  g.lineStyle(1.5, lit(0xa0603a, 0.3), 0.8); g.strokePoints(pts, true);
}

/** A light shaft falling from the crack in the roof: a long pale wedge with dust turning in it. */
export function lightShaft(g: G, x: number, y: number, len: number, w: number, a: number, t: number, alpha = 0.08): void {
  const dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx;
  for (let k = 0; k < 3; k++) {
    const ww = w * (1 - k * 0.28);
    g.fillStyle(SUNSHAFT, alpha * (0.6 + k * 0.3));
    g.fillPoints([
      { x: x + px * ww * 0.3, y: y + py * ww * 0.3 }, { x: x - px * ww * 0.3, y: y - py * ww * 0.3 },
      { x: x + dx * len - px * ww, y: y + dy * len - py * ww }, { x: x + dx * len + px * ww, y: y + dy * len + py * ww },
    ], true);
  }
  for (let i = 0; i < 14; i++) {
    const ph = (t * 0.05 + i * 0.137) % 1;
    const off = Math.sin(i * 7.1 + t * 0.6) * 0.8;
    g.fillStyle(0xffffff, 0.5 * Math.sin(ph * Math.PI));
    g.fillCircle(x + dx * len * ph + px * w * off * ph, y + dy * len * ph + py * w * off * ph, 1.2);
  }
}

/** A brass lamp-post with a crystal lantern — the court's street light, oil tithed or not. */
export function crystalLamp(g: G, x: number, y: number, lit_: boolean): void {
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 58, 4, 58);
  g.fillStyle(FLAG_DARK, 1); g.fillEllipse(x, y, 16, 6);
  g.lineStyle(2, IRON, 1); g.lineBetween(x, y - 56, x + 10, y - 62);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x + 5, y - 64, 10, 3);
  crystalPoint(g, x + 10, y - 44, 7, 18, Math.PI, lit_ ? CITRINE : QUARTZ_DARK, 0.9);
  if (lit_) glow(g, x + 10, y - 52, 26, CITRINE, 0.06, 3);
}

/** A rope-and-rail lift cage up the wall of the geode — the miners' way up to the crack ledges. */
export function wallLift(g: G, x: number, y: number, h: number): void {
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 22 - 3, y - h, 6, h); }
  for (let yy = y - h + 10; yy < y; yy += 26) { g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 22, yy, x + 22, yy + 12); }
  g.lineStyle(1.5, 0xc8b490, 1); g.lineBetween(x - 8, y - h, x - 8, y - 70); g.lineBetween(x + 8, y - h, x + 8, y - 70);
  g.fillStyle(IRON, 1); g.fillRect(x - 18, y - 70, 36, 44);
  g.fillStyle(0x2a2436, 1); g.fillRect(x - 15, y - 67, 30, 38);
  for (let k = 0; k < 4; k++) { g.lineStyle(1.5, IRON, 1); g.lineBetween(x - 15 + k * 10, y - 67, x - 15 + k * 10, y - 29); }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - h + 4, 6); g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - h + 4, 2);
}

/** A cart of rough geodes from the quarry, waiting to be cracked. */
export function geodeCart(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 110, 20);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 46, y - 38, 92, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 44, y - 36, 88, 4); g.fillRect(x - 44, y - 24, 88, 3);
  for (let i = 0; i < 7; i++) geodeStone(g, x - 36 + i * 12, y - 34 - (i % 2) * 5, 7 + rng() * 2, 0);
  for (const k of [-1, 1]) {
    g.fillStyle(IRON, 1); g.fillCircle(x + k * 30, y - 10, 11);
    g.fillStyle(TIMBER_LIT, 1); g.fillCircle(x + k * 30, y - 10, 8);
    g.fillStyle(IRON, 1); g.fillCircle(x + k * 30, y - 10, 2.5);
    for (let s = 0; s < 6; s++) { const a = s * Math.PI / 3; g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(x + k * 30, y - 10, x + k * 30 + Math.cos(a) * 8, y - 10 + Math.sin(a) * 8); }
  }
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 46, y - 24, x + 72, y - 14);
}
