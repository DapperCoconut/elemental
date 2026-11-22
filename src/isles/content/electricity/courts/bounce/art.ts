import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  ARC, ARC_BLUE, BARK, BARK_DARK, BARK_LIT, BRASS, BRASS_DARK, BRASS_LIT, BRICK, BRICK_DARK, BRICK_LIT, CANVAS,
  CANVAS_DARK, CANVAS_LIT, COPPER, COPPER_DARK, COPPER_LIT, CREPE, CREPE_DARK, EARTH, EARTH_LIT, HOT, HOT_LIT,
  INSULATOR, IRON, IRON_LIT, LATEX, LATEX_DARK, LATEX_LIT, LEAF, LEAF_DARK, LEAF_LIT, POOL, POOL_DEEP, POOL_LIT,
  ROCK, RUBBER, RUBBER_SHEEN, SPROCKET, SPROCKET_DARK, SULPHUR, SULPHUR_DARK, TILE, TILE_DARK, TILE_LIT, TILE_RED,
  TILE_RED_LIT, TIN, TOY_BLUE, TOY_COLORS, TOY_GREEN, TOY_RED, TOY_YELLOW, VERDIGRIS, WINDOW, WINDOW_OFF,
} from './palette';

/**
 * Bounce set pieces. Everything in a rubber town is *rounded*: roofs are domes of black rubber
 * that bulge like a held breath, posts are coiled springs, corners are bumpers, the streets are
 * laid in rubber tile. Over the soft shapes runs the only hard line in the picture — copper
 * cable, pylon to pylon, and the brass meter on every door that counts what the house owes.
 */

// ── Ground ───────────────────────────────────────────────────────────

/**
 * A bouncing street: black rubber tiles laid in a running bond, crowned grey where the feet go,
 * with a painted toy-yellow kerb line each side and the occasional patched (newer, blacker) tile.
 */
export function rubberStreet(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    // Bed and kerbs.
    g.lineStyle(w + 10, TILE_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, TILE, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.fillStyle(TILE_DARK, 1); g.fillCircle(a.x, a.y, (w + 10) / 2); g.fillCircle(b.x, b.y, (w + 10) / 2);
    g.fillStyle(TILE, 1); g.fillCircle(a.x, a.y, w / 2); g.fillCircle(b.x, b.y, w / 2);
    // Tiles in a running bond.
    const T = 22;
    const rows = Math.floor(w / T);
    for (let r = 0; r < rows; r++) {
      const off = (r - rows / 2 + 0.5) * T;
      for (let d = (r % 2) * T * 0.5; d < len; d += T) {
        const cx = a.x + ux * d + nx * off, cy = a.y + uy * d + ny * off;
        const k = rng();
        const c = k < 0.06 ? RUBBER : k < 0.5 ? TILE : mixC(TILE, TILE_LIT, 0.35);
        g.fillStyle(c, 1);
        g.fillCircle(cx, cy, T * 0.44);
        // The crown of each tile, worn shiny.
        g.fillStyle(TILE_LIT, 0.35 + Math.abs(off) / w * -0.3 + 0.15); g.fillCircle(cx - 2, cy - 3, T * 0.18);
      }
    }
    // The kerb line in toy yellow, chipped.
    for (const k of [-1, 1]) {
      for (let d = 0; d < len; d += 14) {
        if (rng() < 0.12) continue;
        const x = a.x + ux * d + nx * k * (w / 2 + 1), y = a.y + uy * d + ny * k * (w / 2 + 1);
        g.fillStyle(TOY_YELLOW, 0.55); g.fillRect(x - 4, y - 1.5, 8, 3);
      }
    }
  }
}

/** The plantation earth: dark loam, leaf litter and the white freckles of dropped latex. */
export function plantationEarth(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(EARTH, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 900; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.5) { g.fillStyle(EARTH_LIT, 0.5); g.fillEllipse(x, y, 6 + rng() * 10, 3 + rng() * 3); }
    else if (k < 0.85) { g.fillStyle(rng() < 0.5 ? LEAF_DARK : 0x4a3a22, 0.7); g.fillEllipse(x, y, 7, 3); }
    else { g.fillStyle(LATEX, 0.5); g.fillCircle(x, y, 1.4); }
  }
}

/** The red-and-black chequer of the trampoline square, laid in a squashed disc. */
export function chequerSquare(g: G, cx: number, cy: number, rx: number, ry: number): void {
  g.fillStyle(TILE_DARK, 1); g.fillEllipse(cx, cy, rx * 2 + 24, ry * 2 + 24);
  g.fillStyle(TOY_YELLOW, 0.8); g.fillEllipse(cx, cy, rx * 2 + 10, ry * 2 + 10);
  g.fillStyle(RUBBER, 1); g.fillEllipse(cx, cy, rx * 2, ry * 2);
  const S = 28;
  for (let y = cy - ry; y < cy + ry; y += S * 0.72) {
    for (let x = cx - rx; x < cx + rx; x += S) {
      const ex = (x + S / 2 - cx) / rx, ey = (y + S * 0.36 - cy) / ry;
      if (ex * ex + ey * ey > 0.92) continue;
      const k = (Math.round((x - cx) / S) + Math.round((y - cy) / (S * 0.72))) & 1;
      g.fillStyle(k ? TILE_RED : TILE, 1); g.fillRect(x + 1, y + 1, S - 2, S * 0.72 - 2);
      g.fillStyle(k ? TILE_RED_LIT : TILE_LIT, 0.35); g.fillRect(x + 2, y + 2, S - 6, 3);
    }
  }
  // A compass of painted arrows out to the four streets.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * rx * 0.86, y1 = cy + Math.sin(a) * ry * 0.86;
    g.fillStyle(TOY_YELLOW, 0.5);
    g.fillTriangle(x1 + Math.cos(a) * 14, y1 + Math.sin(a) * 10, x1 + Math.cos(a + 1.6) * 9, y1 + Math.sin(a + 1.6) * 7, x1 + Math.cos(a - 1.6) * 9, y1 + Math.sin(a - 1.6) * 7);
  }
}

/** A sunk trampoline seen from above: steel rim, the ring of springs, the blue canvas. `sag` 0..1. */
export function trampoline(g: G, x: number, y: number, r: number, sag = 0, ry = 0.62): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, r * 2 + 18, (r * 2 + 18) * ry);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y, r * 2 + 14, (r * 2 + 14) * ry);
  g.fillStyle(IRON_LIT, 1); g.fillEllipse(x, y - 1.5, r * 2 + 10, (r * 2 + 10) * ry);
  g.fillStyle(TOY_RED, 1); g.fillEllipse(x, y - 1, r * 2 + 6, (r * 2 + 6) * ry);
  // Springs: little coils round the rim.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const ox = x + Math.cos(a) * (r + 1), oy = y + Math.sin(a) * (r + 1) * ry;
    const ix = x + Math.cos(a) * (r - 8), iy = y + Math.sin(a) * (r - 8) * ry + sag * 3;
    g.lineStyle(2, 0xc8ccd4, 1); g.lineBetween(ox, oy, ix, iy);
    g.lineStyle(1, 0x7a7e86, 1);
    for (let k = 1; k < 4; k++) {
      const px = ox + (ix - ox) * (k / 4), py = oy + (iy - oy) * (k / 4);
      g.strokeCircle(px, py, 1.6);
    }
  }
  // The canvas, dipping as someone lands.
  const cr = r - 8;
  g.fillStyle(CANVAS_DARK, 1); g.fillEllipse(x, y + sag * 4, cr * 2, cr * 2 * ry);
  g.fillStyle(CANVAS, 1); g.fillEllipse(x, y + sag * 5 - 1, cr * 2 - 4, (cr * 2 - 4) * ry);
  g.fillStyle(CANVAS_LIT, 0.4 * (1 - sag)); g.fillEllipse(x - cr * 0.25, y - cr * 0.25 * ry, cr * 0.9, cr * 0.4 * ry);
  // Stitched target rings and a star.
  g.lineStyle(1.2, 0xffffff, 0.45);
  g.strokeEllipse(x, y + sag * 5, cr * 1.2, cr * 1.2 * ry);
  g.strokeEllipse(x, y + sag * 5, cr * 0.5, cr * 0.5 * ry);
  g.fillStyle(TOY_YELLOW, 0.8);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    g.fillTriangle(x, y + sag * 5, x + Math.cos(a - 0.3) * 4, y + sag * 5 + Math.sin(a - 0.3) * 3, x + Math.cos(a) * 9, y + sag * 5 + Math.sin(a) * 6);
  }
}

/** The latex pool: thick milk under a wrinkled skin, plank-edged, a tapper's ladle at the rim. */
export function latexPool(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // Plank kerb.
  g.fillStyle(BARK_DARK, 1); g.fillRoundedRect(r.x - 14, r.y - 12, r.w + 28, r.h + 26, 30);
  for (let x = r.x - 10; x < r.x + r.w + 10; x += 18) {
    g.fillStyle(rng() < 0.5 ? BARK : BARK_LIT, 1); g.fillRect(x, r.y - 11, 15, 8); g.fillRect(x, r.y + r.h + 4, 15, 8);
  }
  g.fillStyle(POOL_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 26);
  g.fillStyle(POOL, 1); g.fillRoundedRect(r.x + 5, r.y + 4, r.w - 10, r.h - 10, 22);
  // Skin wrinkles: soft arcs of lighter and darker cream.
  for (let i = 0; i < 26; i++) {
    const x = r.x + 30 + rng() * (r.w - 60), y = r.y + 24 + rng() * (r.h - 48);
    const s = 14 + rng() * 26;
    g.lineStyle(1.5, rng() < 0.5 ? POOL_LIT : LATEX_DARK, 0.6);
    g.beginPath(); g.arc(x, y, s, Math.PI * (1.1 + rng() * 0.2), Math.PI * (1.7 + rng() * 0.2), false); g.strokePath();
  }
  // Amber pooling where it has stood longest.
  g.fillStyle(CREPE, 0.25); g.fillEllipse(cx + r.w * 0.22, cy + r.h * 0.18, r.w * 0.36, r.h * 0.3);
  g.fillStyle(POOL_LIT, 0.4); g.fillEllipse(cx - r.w * 0.2, cy - r.h * 0.22, r.w * 0.3, r.h * 0.16);
  // A run-off channel from the trees feeding the pool.
  g.lineStyle(6, BARK_DARK, 1); g.lineBetween(r.x + r.w - 30, r.y - 10, r.x + r.w + 10, r.y - 70);
  g.lineStyle(3, LATEX, 1); g.lineBetween(r.x + r.w - 30, r.y - 10, r.x + r.w + 10, r.y - 70);
}

// ── Trees ────────────────────────────────────────────────────────────

/**
 * A tapped rubber tree: a slim pale trunk scored in a half-spiral down one side, the white latex
 * running in the score to a spout and a tin cup strapped on below; a high crown of glossy
 * three-leaf clusters in dark layers, lit at the tops by the storm.
 */
export function rubberTree(g: G, x: number, y: number, s: number, rng: () => number, cup = true): void {
  shadow(g, x, y + 2, 56 * s, 16 * s);
  const h = 120 * s;
  // Trunk: slightly leaning, pale grey-brown, a darker edge.
  const lean = (rng() - 0.5) * 10 * s;
  g.fillStyle(BARK_DARK, 1);
  g.fillPoints([{ x: x - 8 * s, y }, { x: x + 8 * s, y }, { x: x + 5 * s + lean, y: y - h }, { x: x - 5 * s + lean, y: y - h }], true);
  g.fillStyle(BARK, 1);
  g.fillPoints([{ x: x - 6 * s, y }, { x: x + 4 * s, y }, { x: x + 2 * s + lean, y: y - h }, { x: x - 4 * s + lean, y: y - h }], true);
  g.fillStyle(BARK_LIT, 0.6); g.fillRect(x - 5 * s, y - h * 0.9, 2 * s, h * 0.8);
  // The tapping panel: diagonal scores, each wet with latex.
  for (let k = 0; k < 5; k++) {
    const yy = y - 26 * s - k * 9 * s;
    g.lineStyle(2 * s, BARK_DARK, 1); g.lineBetween(x - 6 * s, yy - 6 * s, x + 6 * s, yy);
    g.lineStyle(1.2 * s, LATEX, 0.95); g.lineBetween(x - 5 * s, yy - 5.4 * s, x + 5 * s, yy + 0.4 * s);
  }
  // The vertical channel and the spout.
  g.lineStyle(1.5 * s, LATEX, 1); g.lineBetween(x + 5 * s, y - 62 * s, x + 5 * s, y - 20 * s);
  g.fillStyle(0xa0a4a8, 1); g.fillRect(x + 3 * s, y - 21 * s, 6 * s, 2 * s);
  if (cup) latexCup(g, x + 8 * s, y - 10 * s, s);
  // The crown.
  const top = y - h;
  const clusters = 9;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < clusters; i++) {
      const a = (i / clusters) * Math.PI * 2 + layer * 0.4;
      const d = (26 - layer * 7) * s;
      const cx = x + lean + Math.cos(a) * d, cy = top - layer * 10 * s + Math.sin(a) * d * 0.5;
      const c = layer === 0 ? LEAF_DARK : layer === 1 ? LEAF : LEAF_LIT;
      leafCluster(g, cx, cy, (9 - layer) * s, a, c);
    }
  }
  // Storm-light on the topmost leaves.
  g.fillStyle(lit(LEAF_LIT, 0.35), 0.5); g.fillEllipse(x + lean - 6 * s, top - 26 * s, 16 * s, 6 * s);
}

/** Three glossy oval leaves fanned from one stalk — the rubber tree's trifoliate leaf. */
function leafCluster(g: G, x: number, y: number, r: number, a: number, c: number): void {
  for (let k = -1; k <= 1; k++) {
    const b = a + k * 0.7;
    const lx = x + Math.cos(b) * r * 0.8, ly = y + Math.sin(b) * r * 0.5;
    g.fillStyle(dim(c, 0.2), 1); g.fillEllipse(lx, ly + 1, r * 1.3, r * 0.7);
    g.fillStyle(c, 1); g.fillEllipse(lx, ly, r * 1.2, r * 0.6);
  }
  g.fillStyle(lit(c, 0.25), 0.5); g.fillEllipse(x - r * 0.2, y - r * 0.2, r * 0.6, r * 0.25);
}

/** A tin tapping cup on its wire, half full of white latex. */
export function latexCup(g: G, x: number, y: number, s = 1): void {
  g.lineStyle(1, 0x8a8e94, 1); g.lineBetween(x - 4 * s, y - 4 * s, x - 7 * s, y - 9 * s);
  g.fillStyle(0x7a7e86, 1); g.fillRect(x - 5 * s, y - 4 * s, 10 * s, 8 * s);
  g.fillStyle(0xb8bcc4, 1); g.fillRect(x - 5 * s, y - 4 * s, 3 * s, 8 * s);
  g.fillStyle(LATEX_LIT, 1); g.fillEllipse(x, y - 4 * s, 10 * s, 3 * s);
}

// ── The Grid ─────────────────────────────────────────────────────────

/**
 * An iron lattice pylon with two crossarms and pale glass insulators. Returns its two cable
 * points (the insulator tips), for the cables strung in `animateOver`.
 */
export function pylon(g: G, x: number, y: number, h: number): Pt[] {
  shadow(g, x, y + 2, 40, 12);
  const top = y - h;
  // Two legs, cross-braced.
  for (const k of [-1, 1]) {
    g.lineStyle(4, IRON, 1); g.lineBetween(x + k * 14, y, x + k * 4, top + 10);
    g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x + k * 13, y, x + k * 3, top + 10);
  }
  for (let i = 0; i < 6; i++) {
    const y0 = y - (i * h) / 6, y1 = y - ((i + 1) * h) / 6 + 10;
    const w0 = 14 - (i / 6) * 10, w1 = 14 - ((i + 1) / 6) * 10;
    g.lineStyle(1.5, IRON_LIT, 0.8);
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
    g.lineBetween(x - w1, y1, x + w1, y1);
  }
  // Crossarms with insulators.
  const pts: Pt[] = [];
  for (const [yy, span] of [[top + 18, 30], [top + 4, 20]] as [number, number][]) {
    g.fillStyle(IRON, 1); g.fillRect(x - span, yy - 2, span * 2, 4);
    g.fillStyle(IRON_LIT, 1); g.fillRect(x - span, yy - 2, span * 2, 1.5);
    for (const k of [-1, 1]) {
      const ix = x + k * (span - 3);
      for (let d = 0; d < 3; d++) {
        g.fillStyle(dim(INSULATOR, 0.3), 1); g.fillEllipse(ix, yy - 4 - d * 4, 9, 4);
        g.fillStyle(INSULATOR, 0.9); g.fillEllipse(ix, yy - 5 - d * 4, 8, 3);
      }
      if (span === 30) pts.push({ x: ix, y: yy - 16 });
    }
  }
  // Lightning finial and a warning plate.
  g.lineStyle(2, COPPER, 1); g.lineBetween(x, top + 4, x, top - 16);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, top - 17, 2.2);
  g.fillStyle(TOY_YELLOW, 1); g.fillTriangle(x - 6, y - 40, x + 6, y - 40, x, y - 51);
  g.fillStyle(RUBBER, 1); g.fillRect(x - 0.8, y - 48, 1.6, 5); g.fillCircle(x, y - 42, 0.9);
  return pts;
}

/** Where a pylon's cable points are, without drawing (so `animateOver` can string them). */
export function pylonPoints(x: number, y: number, h: number): Pt[] {
  const yy = y - h + 18 - 16;
  return [{ x: x - 27, y: yy }, { x: x + 27, y: yy }];
}

/**
 * A copper cable sagging between two points, a little thicker where it is newer, with a live
 * spark running along it at `t` (seconds). Drawn over actors.
 */
export function cable(g: G, a: Pt, b: Pt, sag: number, t: number, phase: number, alpha = 1): void {
  const N = 14;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    pts.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag + Math.sin(t * 1.3 + phase) * 1.5 * Math.sin(k * Math.PI) });
  }
  g.lineStyle(3, COPPER_DARK, 0.85 * alpha);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(1.2, COPPER_LIT, 0.7 * alpha);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1); for (const p of pts) g.lineTo(p.x, p.y - 1); g.strokePath();
  // The current running down the wire: a bright bead and a short tail.
  const ph = (t * 0.45 + phase) % 1;
  const idx = ph * N;
  const i0 = Math.floor(idx), f = idx - i0;
  const p0 = pts[i0], p1 = pts[Math.min(N, i0 + 1)];
  const sx = p0.x + (p1.x - p0.x) * f, sy = p0.y + (p1.y - p0.y) * f;
  g.fillStyle(ARC_BLUE, 0.25 * alpha); g.fillCircle(sx, sy, 7);
  g.fillStyle(ARC, 0.95 * alpha); g.fillCircle(sx, sy, 2.2);
}

/** A brass Grid meter: round glass face, red quota sector, a needle reading `level` (0..1). */
export function meter(g: G, x: number, y: number, s: number, level: number, off = false): void {
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - 7 * s, y - 9 * s, 14 * s, 18 * s, 3 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 2 * s, 6 * s);
  g.fillStyle(off ? 0x3a3a40 : 0xf4ecd4, 1); g.fillCircle(x, y - 2 * s, 4.8 * s);
  g.lineStyle(1.6 * s, TOY_RED, off ? 0.4 : 0.9);
  g.beginPath(); g.arc(x, y - 2 * s, 3.6 * s, Math.PI * 1.6, Math.PI * 1.95, false); g.strokePath();
  const a = Math.PI * (0.95 + level * 1.0);
  g.lineStyle(1 * s, RUBBER, 1); g.lineBetween(x, y - 2 * s, x + Math.cos(a) * 4 * s, y - 2 * s + Math.sin(a) * 4 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 2 * s, 0.9 * s);
  // The count-wheels below the face.
  g.fillStyle(RUBBER, 1); g.fillRect(x - 4.5 * s, y + 4 * s, 9 * s, 3 * s);
  for (let i = 0; i < 3; i++) { g.fillStyle(LATEX, 0.8); g.fillRect(x - 3.8 * s + i * 3 * s, y + 4.6 * s, 1.8 * s, 1.8 * s); }
  if (off) { g.fillStyle(TOY_RED, 0.95); g.fillRect(x - 8 * s, y + 9 * s, 16 * s, 5 * s); g.fillStyle(LATEX_LIT, 1); g.fillRect(x - 5 * s, y + 10.5 * s, 10 * s, 1.4 * s); }
}

// ── Houses ───────────────────────────────────────────────────────────

export interface CrankHouseOpts {
  wall: number;
  /** Rubber roof colour (black by default; painted red or blue on the richer streets). */
  roof?: number;
  /** Lit (still on) or switched off. */
  on?: boolean;
  /** Which side wall carries the crank wheel. */
  crank?: -1 | 1;
  /** A red OFF tag on the meter, a second switch-off chalk mark on the door. */
  strikes?: 0 | 1 | 2;
}

/**
 * A crank-house of the rubber town: two brick storeys under a bulging dome of black rubber
 * roofing (it gives in the wind), round porthole windows, a door with its brass Grid meter
 * beside it, a great iron crank wheel on the side wall geared up into the attic — where the
 * household's *skein* hangs, a rope of twisted rubber you can see through the attic window,
 * wound tight or slack. Switched-off houses show dark glass, a red tag and chalk strikes.
 */
export function crankHouse(g: G, x: number, y: number, w: number, h: number, o: CrankHouseOpts, rng: () => number): Pt {
  const on = o.on ?? true;
  const roof = o.roof ?? RUBBER;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.15, 22);
  // Walls, brick coursing.
  g.fillStyle(dim(o.wall, 0.3), 1); g.fillRect(x0 - 2, top, w + 4, h);
  g.fillStyle(o.wall, 1); g.fillRect(x0, top, w, h - 2);
  for (let yy = top + 6; yy < y - 2; yy += 7) {
    g.lineStyle(1, dim(o.wall, 0.25), 0.6); g.lineBetween(x0, yy, x0 + w, yy);
    for (let xx = x0 + ((yy / 7) % 2 ? 0 : 7); xx < x0 + w; xx += 14) g.lineBetween(xx, yy, xx, yy + 7);
  }
  g.fillStyle(lit(o.wall, 0.15), 0.5); g.fillRect(x0, top, w, 3);
  // The rubber dome roof, bulging past the walls.
  const rh = Math.min(48, w * 0.42);
  g.fillStyle(dim(roof, 0.25), 1); g.fillEllipse(x, top + 2, w + 18, rh * 1.9);
  g.fillStyle(o.wall, 1); g.fillRect(x0 - 2, top + 2, w + 4, rh);
  g.fillStyle(roof, 1);
  g.beginPath(); g.arc(x, top + 4, w / 2 + 8, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(lit(roof === RUBBER ? RUBBER_SHEEN : roof, 0.2), 0.45);
  g.fillEllipse(x - w * 0.18, top - rh * 0.35, w * 0.32, rh * 0.28);
  // Ribs where the roof sheets are seamed.
  g.lineStyle(1.2, dim(roof, 0.4), 0.8);
  for (let k = 1; k < 5; k++) {
    const a = Math.PI + (k / 5) * Math.PI;
    g.lineBetween(x + Math.cos(a) * (w / 2 + 8), top + 4 + Math.sin(a) * (w / 2 + 8), x, top + 4 - (w / 2 + 8) * 0.95);
  }
  g.fillStyle(dim(roof, 0.4), 1); g.fillRect(x0 - 10, top + 2, w + 20, 5);
  // The attic window and the skein inside it.
  const ay = top - w * 0.2;
  g.fillStyle(dim(roof, 0.5), 1); g.fillCircle(x, ay, 10);
  g.fillStyle(on ? mixC(WINDOW, CREPE, 0.4) : WINDOW_OFF, 1); g.fillCircle(x, ay, 8);
  for (let i = -6; i <= 6; i += 3) { g.lineStyle(1.6, on ? CREPE_DARK : 0x2a2a30, 1); g.lineBetween(x + i - 2, ay - 7, x + i + 2, ay + 7); }
  g.lineStyle(1.5, BRASS, 1); g.strokeCircle(x, ay, 8.5);
  // Portholes on the upper floor.
  const cols = Math.max(2, Math.round(w / 34));
  for (let i = 0; i < cols; i++) {
    const wx = x0 + (w / cols) * (i + 0.5), wy = top + h * 0.3;
    porthole(g, wx, wy, 7, on && rng() < 0.85);
  }
  // The door, its step, and the meter beside it.
  const doorX = x + (o.crank === 1 ? -w * 0.2 : w * 0.2) * (w > 90 ? 1 : 0);
  g.fillStyle(dim(o.wall, 0.45), 1); g.fillRoundedRect(doorX - 11, y - 34, 22, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(on ? TOY_COLORS[Math.floor(rng() * TOY_COLORS.length)] : 0x2c2c34, 1);
  g.fillRoundedRect(doorX - 9, y - 32, 18, 30, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillCircle(doorX + 5, y - 16, 1.6);
  // The electric lock: a little brass box with a lamp — green when on, dead when off.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(doorX + 2, y - 24, 6, 5);
  g.fillStyle(on ? TOY_GREEN : 0x3a1010, 1); g.fillCircle(doorX + 5, y - 21.5, 1.4);
  g.fillStyle(dim(o.wall, 0.2), 1); g.fillRect(doorX - 14, y - 3, 28, 4);
  meter(g, doorX - 20, y - 22, 1, on ? 0.4 + rng() * 0.5 : 0.05, !on);
  const strikes = o.strikes ?? 0;
  for (let k = 0; k < strikes; k++) { g.lineStyle(2, LATEX_LIT, 0.8); g.lineBetween(doorX - 6 + k * 5, y - 30, doorX - 2 + k * 5, y - 22); }
  // The crank wheel on the side wall, geared to a shaft running up to the attic.
  if (o.crank) {
    const cx = o.crank > 0 ? x0 + w + 2 : x0 - 2, cy = y - h * 0.42;
    g.lineStyle(3, IRON, 1); g.lineBetween(cx, cy, cx, top - 4);
    g.lineStyle(1, IRON_LIT, 1); g.lineBetween(cx + 1, cy, cx + 1, top - 4);
    crankWheel(g, cx, cy, 14, rng() * Math.PI);
  }
  return { x: doorX, y: y + 14 };
}

/** A round brass-rimmed porthole window, lit warm or dark. */
export function porthole(g: G, x: number, y: number, r: number, on: boolean): void {
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r + 2);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 0.5, r + 1);
  g.fillStyle(on ? WINDOW : WINDOW_OFF, 1); g.fillCircle(x, y, r);
  if (on) { g.fillStyle(0xffffff, 0.35); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.35); }
  else { g.lineStyle(1, 0x3a3a48, 1); g.lineBetween(x - r * 0.6, y - r * 0.2, x + r * 0.3, y + r * 0.6); }
  g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x - r, y, x + r, y);
}

/** An iron crank wheel: rim, six spokes, a handle on a knob. */
export function crankWheel(g: G, x: number, y: number, r: number, a: number): void {
  g.lineStyle(3, IRON, 1); g.strokeCircle(x, y, r);
  g.lineStyle(1, IRON_LIT, 1); g.strokeCircle(x, y, r - 1);
  for (let i = 0; i < 6; i++) {
    const b = a + (i / 6) * Math.PI * 2;
    g.lineStyle(2, IRON, 1); g.lineBetween(x, y, x + Math.cos(b) * r, y + Math.sin(b) * r);
  }
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 3);
  const hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r;
  g.lineStyle(3, BARK_DARK, 1); g.lineBetween(hx, hy, hx + 7, hy);
  g.fillStyle(BARK, 1); g.fillCircle(hx + 7, hy, 2.5);
}

// ── The vulcanizing works ────────────────────────────────────────────

/**
 * The vulcanizing works: a long soot-black brick shed under a sawtooth roof, glazed on the
 * north faces, two tall chimneys banded in iron, a pair of great sliding doors with the orange
 * of the curing ovens showing through the gap, a gantry pipe snaking along the front and the
 * licence plate on the wall — the only licensed fire on the isle, for the Grid's insulation.
 */
export function vulcanWorks(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.08, 30);
  // Chimneys behind the roof.
  for (const [cx, ch] of [[x0 + w * 0.2, h * 1.5], [x0 + w * 0.72, h * 1.75]] as [number, number][]) {
    g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - 15, y - ch, 30, ch - h * 0.5);
    g.fillStyle(BRICK, 1); g.fillRect(cx - 13, y - ch, 22, ch - h * 0.5);
    for (let yy = y - ch + 18; yy < y - h * 0.5; yy += 34) { g.fillStyle(IRON, 1); g.fillRect(cx - 16, yy, 32, 4); }
    g.fillStyle(RUBBER, 1); g.fillRect(cx - 17, y - ch - 6, 34, 8);
    g.fillStyle(HOT, 0.5); g.fillRect(cx - 12, y - ch - 3, 24, 3);
  }
  // Walls.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(BRICK, 1); g.fillRect(x0 + 3, top + 3, w - 6, h - 6);
  for (let yy = top + 8; yy < y; yy += 8) {
    g.lineStyle(1, BRICK_DARK, 0.5); g.lineBetween(x0 + 3, yy, x0 + w - 3, yy);
  }
  // Soot streaks down from the eaves.
  for (let i = 0; i < w / 22; i++) { g.fillStyle(0x000000, 0.18); g.fillRect(x0 + 6 + rng() * (w - 12), top + 4, 3 + rng() * 5, 10 + rng() * h * 0.4); }
  // Sawtooth roof.
  const teeth = Math.round(w / 70);
  const tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    const tx = x0 + i * tw;
    g.fillStyle(RUBBER, 1); g.fillTriangle(tx, top, tx + tw, top, tx + tw, top - 34);
    g.fillStyle(mixC(WINDOW, HOT, 0.4), 0.55); g.fillTriangle(tx + tw * 0.62, top - 2, tx + tw - 2, top - 2, tx + tw - 2, top - 30);
    g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(tx + tw * 0.8, top - 2, tx + tw * 0.8, top - 20);
    g.lineStyle(2, RUBBER_SHEEN, 0.5); g.lineBetween(tx, top, tx + tw, top - 34);
  }
  g.fillStyle(IRON, 1); g.fillRect(x0 - 4, top - 3, w + 8, 5);
  // Arched windows glowing low.
  for (let i = 0; i < Math.round(w / 60); i++) {
    const wx = x0 + 30 + i * 60;
    if (Math.abs(wx - x) < 70) continue;
    g.fillStyle(BRICK_DARK, 1); g.fillRoundedRect(wx - 12, top + 24, 24, 34, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(mixC(HOT, WINDOW, 0.5), 0.85); g.fillRoundedRect(wx - 10, top + 26, 20, 31, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.lineStyle(1, BRICK_DARK, 1); g.lineBetween(wx, top + 26, wx, top + 57); g.lineBetween(wx - 10, top + 42, wx + 10, top + 42);
  }
  // The sliding doors, open a hand's width on the oven glow.
  g.fillStyle(HOT_LIT, 0.9); g.fillRect(x - 10, y - h * 0.72, 20, h * 0.72);
  g.fillStyle(HOT, 0.8); g.fillRect(x - 6, y - h * 0.72, 12, h * 0.72);
  for (const k of [-1, 1]) {
    const dx = x + k * 10;
    g.fillStyle(IRON, 1); g.fillRect(k < 0 ? dx - 60 : dx, y - h * 0.74, 60, h * 0.74);
    g.lineStyle(2, IRON_LIT, 0.8);
    g.lineBetween(k < 0 ? dx - 60 : dx, y - h * 0.74, k < 0 ? dx : dx + 60, y - 2);
    g.lineBetween(k < 0 ? dx : dx + 60, y - h * 0.74, k < 0 ? dx - 60 : dx, y - 2);
    g.strokeRect(k < 0 ? dx - 60 : dx, y - h * 0.74, 60, h * 0.74);
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 76, y - h * 0.78, 152, 5);
  // The gantry pipe along the front, with a pressure wheel.
  g.lineStyle(6, COPPER_DARK, 1); g.lineBetween(x0 + 10, top + 14, x0 + w - 10, top + 14);
  g.lineStyle(2, COPPER_LIT, 0.6); g.lineBetween(x0 + 10, top + 12, x0 + w - 10, top + 12);
  for (let px = x0 + 40; px < x0 + w; px += 90) { g.fillStyle(COPPER_DARK, 1); g.fillRect(px - 4, top + 8, 8, 12); }
  crankWheel(g, x0 + w - 30, top + 30, 9, 0.6);
  // The licence plate, enamel on iron.
  g.fillStyle(LATEX, 1); g.fillRect(x + 90, y - h * 0.6, 60, 22);
  g.fillStyle(TOY_RED, 1); g.fillRect(x + 92, y - h * 0.6 + 2, 56, 4);
  g.fillStyle(RUBBER, 0.8); for (let k = 0; k < 3; k++) g.fillRect(x + 96, y - h * 0.6 + 9 + k * 4, 40 - k * 8, 2);
}

/**
 * The curing vat: an iron cauldron on a brick firebox, hot latex rolling orange in it, sulphur
 * sacks slumped at its foot and a long ladle hooked on the rim. `fill` is how high it stands.
 */
export function sulphurVat(g: G, x: number, y: number, r: number): void {
  shadow(g, x, y + 4, r * 2.6, r * 0.7);
  // Firebox.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - r * 1.05, y - r * 0.9, r * 2.1, r * 0.9);
  g.fillStyle(BRICK, 1); g.fillRect(x - r, y - r * 0.86, r * 2, r * 0.8);
  g.fillStyle(HOT, 1); g.fillRoundedRect(x - r * 0.35, y - r * 0.6, r * 0.7, r * 0.5, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(HOT_LIT, 1); g.fillRoundedRect(x - r * 0.22, y - r * 0.45, r * 0.44, r * 0.35, { tl: 6, tr: 6, bl: 0, br: 0 });
  // Cauldron.
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - r * 1.25, r * 2.3, r * 1.3);
  g.fillStyle(dim(IRON, 0.3), 1); g.fillRect(x - r * 1.15, y - r * 1.75, r * 2.3, r * 0.5);
  g.fillStyle(IRON_LIT, 1); g.fillEllipse(x, y - r * 1.75, r * 2.3, r * 0.6);
  g.fillStyle(HOT, 1); g.fillEllipse(x, y - r * 1.75, r * 2.0, r * 0.46);
  g.fillStyle(HOT_LIT, 0.8); g.fillEllipse(x - r * 0.3, y - r * 1.8, r * 0.8, r * 0.16);
  // Rivets.
  for (let i = 0; i < 9; i++) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x - r + (i / 8) * r * 2, y - r * 1.5, 1.5); }
  // Ladle hooked over the rim.
  g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x + r * 0.7, y - r * 1.8, x + r * 1.5, y - r * 2.7);
  g.fillStyle(IRON, 1); g.fillCircle(x + r * 0.6, y - r * 1.7, 4);
  // Sulphur sacks.
  for (const [sx, sy] of [[x - r * 1.4, y - 2], [x + r * 1.35, y]] as [number, number][]) {
    g.fillStyle(0x8a7a50, 1); g.fillEllipse(sx, sy - 9, 22, 20);
    g.fillStyle(SULPHUR, 1); g.fillEllipse(sx, sy - 18, 14, 6);
    g.fillStyle(SULPHUR_DARK, 1); g.fillCircle(sx + 3, sy - 18, 2);
  }
}

/** A drying rack of crepe sheets hung like laundry, amber and cream. */
export function crepeRack(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w, 10);
  for (const k of [-1, 1]) { g.fillStyle(BARK_DARK, 1); g.fillRect(x + k * w / 2 - 2, y - 52, 4, 52); }
  g.fillStyle(BARK, 1); g.fillRect(x - w / 2 - 2, y - 54, w + 4, 4);
  const n = Math.round(w / 18);
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + 4 + i * (w - 8) / n;
    const c = rng() < 0.5 ? CREPE : LATEX;
    g.fillStyle(dim(c, 0.2), 1); g.fillRect(sx, y - 50, (w - 8) / n - 2, 34 + rng() * 6);
    g.fillStyle(c, 1); g.fillRect(sx + 1, y - 50, (w - 8) / n - 4, 32 + rng() * 6);
    g.lineStyle(1, dim(c, 0.3), 0.5); for (let k = 0; k < 3; k++) g.lineBetween(sx + 2, y - 44 + k * 9, sx + (w - 8) / n - 4, y - 44 + k * 9);
    g.fillStyle(IRON_LIT, 1); g.fillRect(sx + 3, y - 52, 3, 4);
  }
}

// ── Balloons ─────────────────────────────────────────────────────────

/** A rubber balloon on its string: glossy, a knot, the highlight, a gentle sway. */
export function balloon(g: G, x: number, y: number, r: number, color: number, string: number, sway = 0): void {
  const bx = x + sway, by = y - string;
  g.lineStyle(1, LATEX_DARK, 0.9);
  g.beginPath(); g.moveTo(x, y);
  for (let k = 1; k <= 6; k++) { const f = k / 6; g.lineTo(x + sway * f + Math.sin(f * 6) * 2, y - string * f); }
  g.strokePath();
  g.fillStyle(dim(color, 0.3), 1); g.fillEllipse(bx, by - r, r * 2, r * 2.3);
  g.fillStyle(color, 1); g.fillEllipse(bx - 0.6, by - r - 0.6, r * 1.9, r * 2.2);
  g.fillStyle(lit(color, 0.5), 0.6); g.fillEllipse(bx - r * 0.38, by - r * 1.45, r * 0.5, r * 0.75);
  g.fillStyle(0xffffff, 0.75); g.fillCircle(bx - r * 0.42, by - r * 1.55, r * 0.14);
  g.fillStyle(dim(color, 0.2), 1); g.fillTriangle(bx - 2.5, by + 2, bx + 2.5, by + 2, bx, by - 1.5);
}

/**
 * The balloon makers' shop: a narrow tall house front with a striped awning, a counter window,
 * a rack of gas bottles chained to the wall, a great wicker basket on the step — and the
 * shop's sign, which is a balloon. Tethered balloons bob on top (drawn in `animate`).
 */
export function balloonShop(g: G, x: number, y: number, w: number, h: number, stripe: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.1, 20);
  g.fillStyle(dim(LATEX_DARK, 0.25), 1); g.fillRect(x0, top, w, h);
  g.fillStyle(LATEX_DARK, 1); g.fillRect(x0 + 3, top + 3, w - 6, h - 3);
  // Timber framing.
  g.lineStyle(4, BARK_DARK, 1);
  g.strokeRect(x0 + 2, top + 2, w - 4, h - 2);
  g.lineBetween(x0 + 2, top + h * 0.45, x0 + w - 2, top + h * 0.45);
  for (let k = 1; k < 3; k++) g.lineBetween(x0 + (w * k) / 3, top + 2, x0 + (w * k) / 3, top + h * 0.45);
  // Gable of rubber shingle.
  g.fillStyle(RUBBER, 1); g.fillTriangle(x0 - 10, top + 4, x0 + w + 10, top + 4, x, top - h * 0.42);
  for (let k = 0; k < 5; k++) {
    const yy = top - k * h * 0.08;
    const half = (w / 2 + 10) * (1 - k / 5.2);
    g.lineStyle(1, RUBBER_SHEEN, 0.5); g.lineBetween(x - half, yy, x + half, yy);
  }
  // Upper windows.
  for (let k = 0; k < 3; k++) porthole(g, x0 + (w * (k + 0.5)) / 3, top + h * 0.22, 7, rng() < 0.8);
  // The awning: scalloped stripes.
  const ay = top + h * 0.5;
  const n = Math.round(w / 16);
  for (let i = 0; i < n; i++) {
    const ax = x0 - 6 + i * ((w + 12) / n);
    g.fillStyle(i % 2 ? stripe : LATEX_LIT, 1); g.fillRect(ax, ay - 12, (w + 12) / n, 18);
    g.fillStyle(i % 2 ? stripe : LATEX_LIT, 1); g.fillCircle(ax + (w + 12) / n / 2, ay + 6, (w + 12) / n / 2);
  }
  g.fillStyle(0x000000, 0.25); g.fillRect(x0 - 6, ay + 8, w + 12, 4);
  // Counter window with balloons stacked flat inside.
  g.fillStyle(WINDOW, 0.9); g.fillRect(x0 + 10, ay + 14, w - 20, h * 0.28);
  for (let i = 0; i < 7; i++) { g.fillStyle(TOY_COLORS[i % TOY_COLORS.length], 0.85); g.fillEllipse(x0 + 18 + rng() * (w - 36), ay + 22 + rng() * (h * 0.2), 10, 7); }
  g.fillStyle(BARK, 1); g.fillRect(x0 + 6, ay + 14 + h * 0.28, w - 12, 6);
  // Gas bottles chained to the wall.
  for (let k = 0; k < 3; k++) {
    const bx = x0 - 8 - k * 9;
    g.fillStyle(k % 2 ? TOY_GREEN : TOY_BLUE, 1); g.fillRoundedRect(bx - 4, y - 34, 8, 32, 4);
    g.fillStyle(BRASS, 1); g.fillRect(bx - 1.5, y - 38, 3, 4);
    g.fillStyle(0xffffff, 0.3); g.fillRect(bx - 3, y - 30, 1.5, 24);
  }
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x0 - 30, y - 20, x0, y - 20);
}

/** A wicker gondola basket with sandbags. */
export function basket(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 34 * s, 10 * s);
  g.fillStyle(CREPE_DARK, 1); g.fillRect(x - 14 * s, y - 22 * s, 28 * s, 22 * s);
  g.lineStyle(1, dim(CREPE_DARK, 0.4), 1);
  for (let k = 0; k < 5; k++) g.lineBetween(x - 14 * s, y - 20 * s + k * 4.5 * s, x + 14 * s, y - 20 * s + k * 4.5 * s);
  for (let k = 0; k < 7; k++) g.lineBetween(x - 14 * s + k * 4.6 * s, y - 22 * s, x - 14 * s + k * 4.6 * s, y);
  g.fillStyle(BARK, 1); g.fillRect(x - 15 * s, y - 24 * s, 30 * s, 3 * s);
  for (const k of [-1, 1]) { g.fillStyle(0x8a7a5a, 1); g.fillEllipse(x + k * 12 * s, y - 14 * s, 7 * s, 9 * s); }
}

// ── The Toy Works (Prince Sprocket's hall) ───────────────────────────

/**
 * The Toy Works: a palace built like a clockwork toy the size of a cathedral. Tin-plate walls
 * in red and cream, every seam riveted; a row of porthole windows; a great clock face whose
 * hands are wind-keys; a jack-in-the-box turret at one corner with the lid ajar and a painted
 * face peering out; a pair of tin soldiers either side of the door; the brass slot for the giant
 * wind-up key on the roof (the key itself turns in `animate`). Bunting from turret to turret.
 */
export function toyWorks(g: G, x: number, y: number, w: number, h: number, rng: () => number): Pt {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 8, w * 1.1, 40);
  // The plinth: a toy's base, with a big painted key-hole.
  g.fillStyle(SPROCKET_DARK, 1); g.fillRect(x0 - 12, y - 30, w + 24, 30);
  g.fillStyle(BRASS, 1); g.fillRect(x0 - 12, y - 32, w + 24, 5);
  for (let px = x0; px < x0 + w; px += 40) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(px + 6, y - 14, 3); }
  // Tin-plate body in panels.
  const panels = Math.round(w / 64);
  const pw = w / panels;
  for (let i = 0; i < panels; i++) {
    const px = x0 + i * pw;
    const c = i % 2 ? TIN : SPROCKET;
    g.fillStyle(dim(c, 0.2), 1); g.fillRect(px, top, pw, h - 30);
    g.fillStyle(c, 1); g.fillRect(px + 2, top + 2, pw - 4, h - 34);
    g.fillStyle(lit(c, 0.25), 0.5); g.fillRect(px + 4, top + 4, 4, h - 40);
    for (let ry = top + 8; ry < y - 34; ry += 16) { g.fillStyle(dim(c, 0.35), 1); g.fillCircle(px + 4, ry, 1.3); g.fillCircle(px + pw - 4, ry, 1.3); }
  }
  // Portholes, two rows.
  for (let i = 0; i < panels; i++) {
    const px = x0 + i * pw + pw / 2;
    if (Math.abs(px - x) < pw * 0.8) continue;
    porthole(g, px, top + h * 0.3, 11, rng() < 0.9);
    porthole(g, px, top + h * 0.62, 9, rng() < 0.7);
  }
  // Roofline: a row of brass gear teeth.
  for (let tx = x0; tx < x0 + w; tx += 18) { g.fillStyle(BRASS_DARK, 1); g.fillRect(tx + 2, top - 10, 12, 12); g.fillStyle(BRASS, 1); g.fillRect(tx + 3, top - 10, 10, 9); }
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x0 - 6, top - 2, w + 12, 6);
  // The clock face over the door, its hands two wind-keys.
  const cy = top + h * 0.26;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, cy, 44);
  g.fillStyle(BRASS, 1); g.fillCircle(x, cy - 1, 41);
  g.fillStyle(TIN, 1); g.fillCircle(x, cy, 35);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillStyle(i % 3 ? RUBBER : SPROCKET, 1); g.fillCircle(x + Math.cos(a) * 29, cy + Math.sin(a) * 29, i % 3 ? 1.6 : 3);
  }
  windKey(g, x, cy, -0.9, 22, BRASS_DARK);
  windKey(g, x, cy, 0.4, 28, RUBBER);
  g.fillStyle(SPROCKET, 1); g.fillCircle(x, cy, 4);
  // The door: a round-topped toy-box lid, painted with a star.
  g.fillStyle(SPROCKET_DARK, 1); g.fillRoundedRect(x - 40, y - 30 - h * 0.42, 80, h * 0.42, { tl: 40, tr: 40, bl: 0, br: 0 });
  g.fillStyle(TOY_BLUE, 1); g.fillRoundedRect(x - 34, y - 30 - h * 0.4 + 2, 68, h * 0.4 - 2, { tl: 34, tr: 34, bl: 0, br: 0 });
  g.lineStyle(2, BRASS, 1); g.lineBetween(x, y - 30 - h * 0.4 + 2, x, y - 30);
  g.fillStyle(TOY_YELLOW, 1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    g.fillTriangle(x, y - 30 - h * 0.2, x + Math.cos(a - 0.35) * 7, y - 30 - h * 0.2 + Math.sin(a - 0.35) * 7, x + Math.cos(a) * 16, y - 30 - h * 0.2 + Math.sin(a) * 16);
  }
  // The jack-in-the-box turret, east corner.
  const jx = x0 + w - 24;
  g.fillStyle(dim(TOY_YELLOW, 0.2), 1); g.fillRect(jx - 36, top - 70, 72, 70);
  g.fillStyle(TOY_YELLOW, 1); g.fillRect(jx - 34, top - 68, 68, 66);
  g.fillStyle(TOY_RED, 1); for (let k = 0; k < 3; k++) g.fillRect(jx - 34, top - 60 + k * 22, 68, 6);
  // Lid ajar and the jack peering out.
  g.fillStyle(TOY_BLUE, 1); g.fillPoints([{ x: jx - 38, y: top - 70 }, { x: jx + 38, y: top - 70 }, { x: jx + 44, y: top - 98 }, { x: jx - 30, y: top - 86 }], true);
  g.fillStyle(LATEX_LIT, 1); g.fillCircle(jx, top - 78, 11);
  g.fillStyle(RUBBER, 1); g.fillCircle(jx - 4, top - 80, 1.8); g.fillCircle(jx + 4, top - 80, 1.8);
  g.lineStyle(1.5, TOY_RED, 1); g.beginPath(); g.arc(jx, top - 77, 5, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.fillStyle(TOY_RED, 1); g.fillCircle(jx, top - 76, 2.4);
  // The west corner: a drum tower, banded.
  const dx = x0 + 26;
  g.fillStyle(dim(TOY_GREEN, 0.25), 1); g.fillRect(dx - 30, top - 50, 60, 50);
  g.fillStyle(TOY_GREEN, 1); g.fillRect(dx - 28, top - 48, 56, 48);
  g.fillStyle(LATEX_LIT, 1); g.fillEllipse(dx, top - 50, 60, 16);
  g.lineStyle(1.5, TOY_RED, 1); for (let k = 0; k < 6; k++) g.lineBetween(dx - 28 + k * 11, top - 46, dx - 22 + k * 11, top - 2);
  g.fillStyle(SPROCKET, 1); g.fillTriangle(dx - 32, top - 52, dx + 32, top - 52, dx, top - 92);
  // The key slot on the roof's crown.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 18, top - 22, 36, 14);
  g.fillStyle(RUBBER, 1); g.fillRect(x - 8, top - 18, 16, 6);
  // Tin soldiers either side of the door.
  for (const k of [-1, 1]) toySoldier(g, x + k * 66, y - 30, 1.2, k < 0 ? TOY_RED : TOY_BLUE);
  // Bunting from turret to turret.
  const bx0 = dx, by0 = top - 50, bx1 = jx, by1 = top - 70;
  for (let i = 0; i <= 18; i++) {
    const k = i / 18;
    const px = bx0 + (bx1 - bx0) * k, py = by0 + (by1 - by0) * k + Math.sin(k * Math.PI) * 40;
    if (i < 18) { g.lineStyle(1, LATEX_DARK, 0.8); const k2 = (i + 1) / 18; g.lineBetween(px, py, bx0 + (bx1 - bx0) * k2, by0 + (by1 - by0) * k2 + Math.sin(k2 * Math.PI) * 40); }
    g.fillStyle(TOY_COLORS[i % TOY_COLORS.length], 1); g.fillTriangle(px - 5, py, px + 5, py, px, py + 10);
  }
  return { x, y: y + 18 };
}

/** A wind-up key: a bow of two lobes on a shaft, drawn from (x,y) out at angle `a`. */
export function windKey(g: G, x: number, y: number, a: number, len: number, c: number): void {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  g.lineStyle(3, c, 1); g.lineBetween(x, y, ex, ey);
  const px = -Math.sin(a), py = Math.cos(a);
  for (const k of [-1, 1]) {
    g.fillStyle(c, 1); g.fillCircle(ex + px * k * len * 0.22, ey + py * k * len * 0.22, len * 0.2);
    g.fillStyle(lit(c, 0.3), 1); g.fillCircle(ex + px * k * len * 0.22, ey + py * k * len * 0.22, len * 0.08);
  }
}

/** A tin soldier: shako, red coat, white cross-belts, a key in his back, painted rosy cheeks. */
export function toySoldier(g: G, x: number, y: number, s: number, coat: number, fallen = false): void {
  if (fallen) {
    g.fillStyle(coat, 1); g.fillRoundedRect(x - 14 * s, y - 8 * s, 22 * s, 9 * s, 3 * s);
    g.fillStyle(RUBBER, 1); g.fillRect(x + 8 * s, y - 8 * s, 8 * s, 8 * s);
    g.fillStyle(0xf0c8a8, 1); g.fillCircle(x - 18 * s, y - 4 * s, 4 * s);
    return;
  }
  shadow(g, x, y + 1, 18 * s, 6 * s);
  g.fillStyle(RUBBER, 1); g.fillRect(x - 5 * s, y - 12 * s, 4 * s, 12 * s); g.fillRect(x + 1 * s, y - 12 * s, 4 * s, 12 * s);
  g.fillStyle(dim(coat, 0.25), 1); g.fillRoundedRect(x - 7 * s, y - 30 * s, 14 * s, 19 * s, 3 * s);
  g.fillStyle(coat, 1); g.fillRoundedRect(x - 6 * s, y - 30 * s, 12 * s, 18 * s, 3 * s);
  g.lineStyle(1.5 * s, LATEX_LIT, 1); g.lineBetween(x - 6 * s, y - 29 * s, x + 6 * s, y - 14 * s); g.lineBetween(x + 6 * s, y - 29 * s, x - 6 * s, y - 14 * s);
  g.fillStyle(0xf0c8a8, 1); g.fillCircle(x, y - 35 * s, 5 * s);
  g.fillStyle(TOY_PINK_CHEEK, 0.8); g.fillCircle(x - 2.5 * s, y - 34 * s, 1.2 * s); g.fillCircle(x + 2.5 * s, y - 34 * s, 1.2 * s);
  g.fillStyle(RUBBER, 1); g.fillRect(x - 4.5 * s, y - 48 * s, 9 * s, 10 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 4.5 * s, y - 40 * s, 9 * s, 1.6 * s); g.fillCircle(x, y - 45 * s, 1.3 * s);
  // The key in his back.
  windKey(g, x + 6 * s, y - 24 * s, 0, 7 * s, BRASS);
  // A musket at shoulder arms.
  g.lineStyle(1.6 * s, BARK_DARK, 1); g.lineBetween(x - 8 * s, y - 14 * s, x - 8 * s, y - 44 * s);
}
const TOY_PINK_CHEEK = 0xf07a8a;

/**
 * The Toy Box: where run-down toys are put away. A great wooden chest painted with letter
 * blocks, the lid propped open a crack on a stick, a padlock on the hasp, and arms, a teddy's
 * ear and a tin soldier's boots sticking out of the gap.
 */
export function toyBox(g: G, x: number, y: number, w: number, h: number): void {
  shadow(g, x, y + 4, w * 1.1, 22);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(BARK_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(BARK, 1); g.fillRect(x0 + 3, top + 3, w - 6, h - 6);
  // Letter blocks painted on the front.
  const L = ['P', 'U', 'T', 'A', 'W', 'A', 'Y'];
  const bw = (w - 20) / L.length;
  L.forEach((_, i) => {
    const c = TOY_COLORS[i % TOY_COLORS.length];
    g.fillStyle(dim(c, 0.2), 1); g.fillRect(x0 + 10 + i * bw, top + h * 0.35, bw - 4, bw - 4);
    g.fillStyle(c, 1); g.fillRect(x0 + 11 + i * bw, top + h * 0.35 + 1, bw - 6, bw - 6);
    g.fillStyle(LATEX_LIT, 0.9); g.fillRect(x0 + 11 + i * bw + (bw - 6) * 0.35, top + h * 0.35 + (bw - 6) * 0.2, (bw - 6) * 0.3, (bw - 6) * 0.6);
  });
  // Iron corner straps.
  for (const k of [0, 1]) { g.fillStyle(IRON, 1); g.fillRect(k ? x0 + w - 12 : x0, top, 12, h); g.fillStyle(IRON_LIT, 1); g.fillCircle(k ? x0 + w - 6 : x0 + 6, top + h * 0.5, 2); }
  // What sticks out of the gap under the lid.
  toySoldier(g, x - w * 0.22, top + 4, 0.8, TOY_RED, true);
  g.fillStyle(CREPE, 1); g.fillCircle(x + w * 0.12, top - 4, 7); g.fillStyle(CREPE_DARK, 1); g.fillCircle(x + w * 0.12, top - 4, 3.5);
  g.lineStyle(3, TIN, 1); g.lineBetween(x + w * 0.3, top - 2, x + w * 0.38, top - 16);
  g.fillStyle(TIN, 1); g.fillCircle(x + w * 0.38, top - 17, 3);
  // The lid, propped on a stick.
  g.fillStyle(SPROCKET_DARK, 1); g.fillPoints([{ x: x0 - 6, y: top + 2 }, { x: x0 + w + 6, y: top + 2 }, { x: x0 + w + 2, y: top - 20 }, { x: x0 - 2, y: top - 14 }], true);
  g.fillStyle(SPROCKET, 1); g.fillPoints([{ x: x0 - 4, y: top - 2 }, { x: x0 + w + 4, y: top - 2 }, { x: x0 + w + 1, y: top - 18 }, { x: x0 - 1, y: top - 13 }], true);
  g.lineStyle(2, BARK_LIT, 1); g.lineBetween(x + w * 0.42, top, x + w * 0.44, top - 16);
  // Padlock.
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, top + 4, 12, 10);
  g.lineStyle(2, BRASS_DARK, 1); g.beginPath(); g.arc(x, top + 4, 4, Math.PI, 0, false); g.strokePath();
  g.fillStyle(RUBBER, 1); g.fillCircle(x, top + 9, 1.5);
}

// ── Street furniture ─────────────────────────────────────────────────

/** A street lamp on a coiled spring post, its electric bulb in a wire cage. `on` dims it. */
export function springLamp(g: G, x: number, y: number, on: number): void {
  shadow(g, x, y + 1, 16, 5);
  g.fillStyle(IRON, 1); g.fillRect(x - 5, y - 6, 10, 6);
  // The spring: a column of coils.
  for (let k = 0; k < 9; k++) {
    const yy = y - 8 - k * 5.2;
    g.lineStyle(2, IRON_LIT, 1); g.strokeEllipse(x, yy, 9, 3.4);
  }
  g.lineStyle(2, IRON, 1); g.lineBetween(x, y - 54, x, y - 62);
  // Cage and bulb.
  if (on > 0) glow(g, x, y - 66, 26, WINDOW, 0.05 * on, 4);
  g.fillStyle(mixC(0x3a3a40, WINDOW, on), 1); g.fillCircle(x, y - 66, 5);
  g.fillStyle(0xffffff, 0.6 * on); g.fillCircle(x - 1.5, y - 67.5, 1.6);
  g.lineStyle(1, IRON_LIT, 1);
  g.strokeCircle(x, y - 66, 6.5);
  g.lineBetween(x - 6.5, y - 66, x + 6.5, y - 66); g.lineBetween(x, y - 72.5, x, y - 59.5);
  g.fillStyle(RUBBER, 1); g.fillRect(x - 4, y - 75, 8, 3);
}

/**
 * The Brownout Bell: a black iron bell in a frame on a squat brick tower, a copper cable
 * running to its striker from the nearest pylon — the Grid rings it itself every night.
 */
export function brownoutBell(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 70, 18);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 28, y - 70, 56, 70);
  g.fillStyle(BRICK, 1); g.fillRect(x - 26, y - 68, 52, 66);
  for (let yy = y - 62; yy < y; yy += 8) { g.lineStyle(1, BRICK_DARK, 0.6); g.lineBetween(x - 26, yy, x + 26, yy); }
  g.fillStyle(BRICK_LIT, 1); g.fillRect(x - 30, y - 74, 60, 6);
  // Frame.
  g.lineStyle(4, IRON, 1); g.lineBetween(x - 22, y - 74, x - 18, y - 136); g.lineBetween(x + 22, y - 74, x + 18, y - 136);
  g.fillStyle(IRON, 1); g.fillRect(x - 24, y - 140, 48, 6);
  // Bell.
  g.fillStyle(RUBBER, 1);
  g.fillPoints([{ x: x - 8, y: y - 132 }, { x: x + 8, y: y - 132 }, { x: x + 12, y: y - 108 }, { x: x + 18, y: y - 98 }, { x: x - 18, y: y - 98 }, { x: x - 12, y: y - 108 }], true);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - 6, y - 128, 3, 26);
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 96, 4);
  // The electric striker and its cable.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x + 18, y - 118, 10, 10);
  g.lineStyle(2, COPPER, 1); g.lineBetween(x + 28, y - 113, x + 40, y - 120);
  // The schedule plate.
  g.fillStyle(LATEX, 1); g.fillRect(x - 18, y - 52, 36, 24);
  g.fillStyle(RUBBER, 0.8); for (let k = 0; k < 4; k++) g.fillRect(x - 14, y - 47 + k * 5, 28 - (k % 2) * 8, 2);
  g.fillStyle(TOY_RED, 1); g.fillRect(x - 18, y - 52, 36, 3);
}

/**
 * The Bounce waystone: a rounded black stone (polished like a ball) on a spring plinth, wrapped
 * three times in copper coil, a spark sitting on its crown.
 */
export function bounceWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 44, 12);
  g.fillStyle(IRON, 1); g.fillRect(x - 16, y - 8, 32, 8);
  for (let k = 0; k < 3; k++) { g.lineStyle(2, IRON_LIT, 1); g.strokeEllipse(x, y - 10 - k * 4, 26, 5); }
  g.fillStyle(dim(ROCK, 0.2), 1); g.fillEllipse(x, y - 40, 34, 44);
  g.fillStyle(ROCK, 1); g.fillEllipse(x - 1, y - 41, 31, 42);
  g.fillStyle(RUBBER_SHEEN, 0.45); g.fillEllipse(x - 7, y - 52, 9, 13);
  for (let k = 0; k < 3; k++) {
    g.lineStyle(2.4, COPPER_DARK, 1); g.strokeEllipse(x, y - 30 - k * 9, 32 - k * 3, 7);
    g.lineStyle(1, COPPER_LIT, 0.7); g.strokeEllipse(x, y - 31 - k * 9, 30 - k * 3, 6);
  }
}

/** The Ball Court's padded wall: a long low rubber bumper on brick, painted with court lines. */
export function bumperWall(g: G, x0: number, y: number, w: number, h: number, vertical: boolean): void {
  if (vertical) {
    g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, y - h, 22, h + 8);
    g.fillStyle(RUBBER, 1); g.fillRoundedRect(x0 + 3, y - h - 10, 16, h + 10, 8);
    g.fillStyle(RUBBER_SHEEN, 0.4); g.fillRect(x0 + 6, y - h - 6, 3, h);
    for (let yy = y - h; yy < y; yy += 40) { g.fillStyle(TOY_YELLOW, 0.8); g.fillRect(x0 + 4, yy, 14, 4); }
    return;
  }
  g.fillStyle(0x000000, 0.25); g.fillRect(x0, y, w, 8);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(BRICK, 1); g.fillRect(x0 + 2, y - h + 2, w - 4, h - 12);
  g.fillStyle(RUBBER, 1); g.fillRoundedRect(x0 - 2, y - 14, w + 4, 16, 8);
  g.fillStyle(RUBBER_SHEEN, 0.4); g.fillRect(x0 + 4, y - 11, w - 8, 3);
  for (let xx = x0 + 20; xx < x0 + w; xx += 60) { g.fillStyle(TOY_YELLOW, 0.8); g.fillRect(xx, y - h + 6, 4, h - 22); }
  // Scuffs where the ball has hit, a lot.
  for (let xx = x0 + 30; xx < x0 + w - 20; xx += 47) { g.fillStyle(0x000000, 0.25); g.fillCircle(xx, y - h * 0.55, 5); }
}

/**
 * A ropewalk post: an iron post with a hook and a hand-winch, and a rubber band stretched to
 * the next one. `to` is the far post.
 */
export function stretchPost(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 22, 7);
  g.fillStyle(IRON, 1); g.fillRect(x - 4, y - 46, 8, 46);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 3, y - 46, 2, 46);
  g.fillStyle(TOY_RED, 1); g.fillRoundedRect(x - 7, y - 52, 14, 8, 3);
  crankWheel(g, x, y - 24, 7, 0.4);
  g.lineStyle(2.5, IRON_LIT, 1); g.beginPath(); g.arc(x + 6, y - 40, 4, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
}

/** A stretched rubber band, thinner and paler the further it is pulled. */
export function band(g: G, a: Pt, b: Pt, tension: number, c = CREPE): void {
  const w = Math.max(2, 7 - tension * 4);
  g.lineStyle(w + 2, dim(c, 0.4), 1); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(w, mixC(c, LATEX_LIT, tension * 0.5), 1); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(1, LATEX_LIT, 0.5); g.lineBetween(a.x, a.y - w * 0.3, b.x, b.y - w * 0.3);
}

/** A superball: a little striped rubber sphere, glossy. */
export function superball(g: G, x: number, y: number, r: number, c: number, spin = 0): void {
  g.fillStyle(dim(c, 0.35), 1); g.fillCircle(x, y, r);
  g.fillStyle(c, 1); g.fillCircle(x - r * 0.08, y - r * 0.08, r * 0.92);
  g.lineStyle(Math.max(1.5, r * 0.22), lit(c, 0.4), 0.8);
  g.beginPath(); g.arc(x, y, r * 0.62, spin, spin + Math.PI * 0.9, false); g.strokePath();
  g.lineStyle(Math.max(1, r * 0.16), dim(c, 0.5), 0.8);
  g.beginPath(); g.arc(x, y, r * 0.62, spin + Math.PI, spin + Math.PI * 1.9, false); g.strokePath();
  g.fillStyle(0xffffff, 0.8); g.fillCircle(x - r * 0.4, y - r * 0.42, r * 0.2);
}

/** A sack of rubber balls for the Ball Court's kit-hut. */
export function ballSack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 30, 8);
  g.fillStyle(0x6a5a3a, 1); g.fillEllipse(x, y - 12, 30, 26);
  g.fillStyle(0x8a7a5a, 1); g.fillEllipse(x - 2, y - 14, 24, 20);
  g.lineStyle(2, BARK_DARK, 1); g.lineBetween(x - 6, y - 25, x + 6, y - 25);
  for (let i = 0; i < 4; i++) superball(g, x - 8 + i * 5, y - 27 - (i % 2) * 3, 4, [TOY_RED, TOY_BLUE, TOY_YELLOW, TOY_GREEN][i]);
}

/** Lightning: a forked bolt from (x, top) to (x2, y). Drawn in `animateOver` for a flash. */
export function bolt(g: G, x: number, top: number, x2: number, y: number, seed: number, a: number): void {
  let px = x, py = top;
  const steps = 9;
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const nx = x + (x2 - x) * k + (rnd() - 0.5) * 40 * (1 - k * 0.5), ny = top + (y - top) * k;
    g.lineStyle(6, ARC_BLUE, 0.25 * a); g.lineBetween(px, py, nx, ny);
    g.lineStyle(2, ARC, a); g.lineBetween(px, py, nx, ny);
    if (i === 4) {
      const fx = nx + (rnd() - 0.5) * 120, fy = ny + 70;
      g.lineStyle(1.2, ARC, a * 0.8); g.lineBetween(nx, ny, fx, fy);
    }
    px = nx; py = ny;
  }
}

/** A sulphur heap: a yellow cone with a crust, a shovel stuck in it. */
export function sulphurHeap(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 50 * s, 12 * s);
  g.fillStyle(SULPHUR_DARK, 1); g.fillTriangle(x - 26 * s, y, x + 26 * s, y, x + 2 * s, y - 28 * s);
  g.fillStyle(SULPHUR, 1); g.fillTriangle(x - 22 * s, y - 2 * s, x + 20 * s, y - 2 * s, x, y - 26 * s);
  g.fillStyle(lit(SULPHUR, 0.4), 0.6); g.fillTriangle(x - 10 * s, y - 10 * s, x, y - 24 * s, x - 2 * s, y - 8 * s);
  g.lineStyle(2 * s, BARK_DARK, 1); g.lineBetween(x + 8 * s, y - 18 * s, x + 20 * s, y - 40 * s);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x + 4 * s, y - 18 * s, 8 * s, 6 * s);
}

/** Toy-coloured hopscotch on the rubber, chalked by children of switched-off houses. */
export function hopscotch(g: G, x: number, y: number): void {
  const cells: [number, number][] = [[0, 0], [0, -1], [-0.5, -2], [0.5, -2], [0, -3], [-0.5, -4], [0.5, -4], [0, -5]];
  cells.forEach(([cx, cy], i) => {
    g.lineStyle(1.5, LATEX_LIT, 0.55); g.strokeRect(x + cx * 26 - 13, y + cy * 22 - 11, 26, 22);
    g.fillStyle(TOY_COLORS[i % TOY_COLORS.length], 0.15); g.fillRect(x + cx * 26 - 12, y + cy * 22 - 10, 24, 20);
  });
}

/** A copper junction box on a post, with a hazard stripe. */
export function junctionBox(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 20, 6);
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 30, 4, 30);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 10, y - 46, 20, 20);
  g.fillStyle(COPPER, 1); g.fillRect(x - 9, y - 45, 18, 18);
  g.fillStyle(VERDIGRIS, 0.6); g.fillRect(x - 9, y - 30, 18, 3);
  g.fillStyle(TOY_YELLOW, 1); g.fillTriangle(x - 5, y - 32, x + 5, y - 32, x, y - 41);
  g.fillStyle(RUBBER, 1); g.fillRect(x - 0.6, y - 39, 1.2, 4);
}

