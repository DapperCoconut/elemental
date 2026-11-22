import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CANVAS, CANVAS_DARK, CHITIN, CLIFF_DARK, COBALT, COBALT_DARK, DATES, FLOW, FLOW_DARK,
  FLOW_LIT, GLASS, GLASS_DARK, GLASS_LIT, PALM, PALM_DARK, PALM_LIT, SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE,
  SAND_SHADOW, SIROCCO, SIROCCO_DARK, SIROCCO_JEWEL, STONE, STONE_DARK, STONE_DEEP, STONE_LIT, STRATA, STRIPE_INDIGO,
  STRIPE_RED, STRIPE_SAFFRON, TILE, TILE_DARK, TILE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, TRUNK, TRUNK_DARK, VENOM,
  WATER, WATER_DEEP, WATER_LIT,
} from './palette';

/**
 * Dunesea set pieces — the shapes only a buried place has. The rule for everything here: it is
 * *half under*. Every dome, tower, column, hull and tent has sand drifted up one side of it (the
 * west, where the wind comes over the mesa), a slip of grains running off its ledges, and its
 * lower part simply not drawn because the dune has it. What stands clear of the sand — the
 * caravanserai, the palace, the palms — has been dug out and is kept dug out, every morning, by
 * somebody with a shovel and a reason.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** Fill a closed polygon of points. */
function poly(g: G, pts: Pt[], color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillPoints(pts.map((p) => P(p.x, p.y)), true);
}

/** A drift of sand banked against something, rising to the west (left) side. */
export function drift(g: G, x: number, y: number, w: number, h: number, rng: () => number, leftHigh = true): void {
  const pts: Pt[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const rise = leftHigh ? 1 - k * 0.8 : 0.2 + k * 0.8;
    pts.push({ x: x - w / 2 + k * w, y: y - h * rise * Math.sin(Math.min(1, k * 1.2 + 0.1) * Math.PI * 0.5 + (leftHigh ? 0.4 : 0)) - (rng() - 0.5) * 3 });
  }
  pts.push({ x: x + w / 2, y: y + 4 }, { x: x - w / 2, y: y + 4 });
  poly(g, pts, SAND_DARK);
  poly(g, pts.map((p) => ({ x: p.x, y: p.y + (p.y < y ? 3 : 0) })), SAND);
  // The lit crest of the drift and a few grains sliding off it.
  g.lineStyle(1.5, SAND_LIT, 0.8);
  for (let i = 0; i < n; i++) g.lineBetween(pts[i].x, pts[i].y + 1, pts[i + 1].x, pts[i + 1].y + 1);
  for (let i = 0; i < w / 12; i++) {
    const k = rng();
    const p = pts[Math.floor(k * n)];
    g.fillStyle(SAND_PALE, 0.5); g.fillRect(p.x + rng() * 8, p.y + 4 + rng() * 8, 1.5, 1.5);
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * Wind ripples: rows of small sinuous ridges, each a lit edge over a shadow line, running across
 * the wind. The whole court is combed with them; they make flat sand read as sand.
 */
export function ripples(g: G, r: Rect, rng: () => number, density = 1, tilt = 0.18): void {
  const rows = Math.floor((r.h / 15) * density);
  for (let i = 0; i < rows; i++) {
    const y0 = r.y + rng() * r.h;
    const x0 = r.x + rng() * r.w;
    const len = 60 + rng() * 140;
    const amp = 2 + rng() * 2.5;
    const ph = rng() * 6;
    let px = x0, py = y0;
    for (let s = 1; s <= 10; s++) {
      const x = x0 + (len * s) / 10;
      const y = y0 + Math.sin(ph + s * 0.9) * amp + (x - x0) * tilt;
      if (x > r.x + r.w) break;
      g.lineStyle(1.6, SAND_DARK, 0.35); g.lineBetween(px, py + 1.6, x, y + 1.6);
      g.lineStyle(1.1, SAND_LIT, 0.45); g.lineBetween(px, py, x, y);
      px = x; py = y;
    }
  }
}

/**
 * A dune ridge seen from above-and-south: a long lit windward back, a knife crest, and a dark
 * slip face falling away to the lee. `pts` runs along the crest, west to east.
 */
export function duneRidge(g: G, pts: Pt[], depth: number, rng: () => number): void {
  // Slip face (lee, below the crest — the south-east side in this court).
  const lee: Pt[] = [...pts, ...pts.slice().reverse().map((p, i) => ({ x: p.x + 14, y: p.y + depth * (0.7 + 0.3 * Math.sin(i)) }))];
  poly(g, lee, SAND_DEEP, 0.55);
  poly(g, lee.map((p, i) => (i < pts.length ? p : { x: p.x - 4, y: p.y - depth * 0.35 })), SAND_DARK, 0.5);
  // Windward back (above the crest).
  const back: Pt[] = [...pts, ...pts.slice().reverse().map((p) => ({ x: p.x - 10, y: p.y - depth * 1.3 }))];
  poly(g, back, SAND_LIT, 0.35);
  // The knife crest and grains avalanching down the slip.
  g.lineStyle(2.4, SAND_PALE, 0.9);
  for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < 3; k++) {
      const t = rng();
      const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t, y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      g.lineStyle(1, SAND_SHADOW, 0.35); g.lineBetween(x, y + 2, x + 3, y + 6 + rng() * depth * 0.6);
    }
  }
}

/**
 * The caravan road: sand packed hard by a thousand years of feet, its edges kerbed with stones
 * the old city lost, and the double prints of camels down the middle.
 */
export function caravanRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    g.lineStyle(w + 10, SAND_DARK, 0.5); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, mixC(SAND, STONE, 0.4), 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.fillStyle(SAND_DARK, 0.5); g.fillCircle(a.x, a.y, (w + 10) / 2);
    g.fillStyle(mixC(SAND, STONE, 0.4), 1); g.fillCircle(a.x, a.y, w / 2);
  }
  const last = pts[pts.length - 1];
  g.fillStyle(mixC(SAND, STONE, 0.4), 1); g.fillCircle(last.x, last.y, w / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    // Kerb stones along both edges, some half drifted over.
    for (let d = 10; d < len; d += 34 + rng() * 20) {
      for (const side of [-1, 1]) {
        const x = a.x + ux * d - uy * side * (w / 2 + 2), y = a.y + uy * d + ux * side * (w / 2 + 2);
        const s = 5 + rng() * 4;
        g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(x - s, y - s * 0.6 + 1, s * 2, s * 1.2, 2);
        g.fillStyle(STONE, 1); g.fillRoundedRect(x - s, y - s * 0.6, s * 2, s * 1.0, 2);
        if (rng() < 0.4) { g.fillStyle(SAND, 1); g.fillEllipse(x - s * 0.5, y, s * 1.4, s * 0.8); }
      }
    }
    // Camel prints: paired ovals, in a loose double line.
    for (let d = 8; d < len; d += 18) {
      const off = ((d / 18) | 0) % 2 ? 7 : -7;
      const x = a.x + ux * d - uy * off, y = a.y + uy * d + ux * off;
      g.fillStyle(SAND_DARK, 0.4); g.fillEllipse(x, y, 7, 5);
      g.fillStyle(SAND_DEEP, 0.25); g.fillEllipse(x + ux * 2, y + uy * 2, 3, 2);
    }
  }
}

/**
 * A patch of the buried city's mosaic floor, swept clear by a digger or a gust: turquoise and
 * cobalt tiles in an eight-point star pattern, cracked, with sand already creeping back over it.
 */
export function mosaicPatch(g: G, cx: number, cy: number, rx: number, ry: number, rng: () => number): void {
  g.fillStyle(STONE_DARK, 0.9); g.fillEllipse(cx, cy, rx * 2 + 8, ry * 2 + 6);
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(cx, cy, rx * 2, ry * 2);
  const T = 14;
  for (let y = cy - ry; y < cy + ry; y += T * 0.6) {
    for (let x = cx - rx; x < cx + rx; x += T) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      if (nx * nx + ny * ny > 0.82) continue;
      const k = (Math.round((x - cx) / T) + Math.round((y - cy) / (T * 0.6))) % 3;
      const c = k === 0 ? TILE : k === 1 ? COBALT : STONE_LIT;
      g.fillStyle(dim(c, 0.2), 1); g.fillRect(x, y, T - 2, T * 0.6 - 2);
      g.fillStyle(c, 1); g.fillRect(x, y, T - 3, T * 0.6 - 3);
      if (rng() < 0.12) { g.fillStyle(SAND_DARK, 1); g.fillRect(x, y, T - 2, T * 0.6 - 2); }
    }
  }
  // A star at the heart.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.fillStyle(i % 2 ? TILE_LIT : BRASS, 0.9);
    g.fillTriangle(cx, cy, cx + Math.cos(a - 0.2) * rx * 0.25, cy + Math.sin(a - 0.2) * ry * 0.25, cx + Math.cos(a) * rx * 0.45, cy + Math.sin(a) * ry * 0.45);
  }
  // Cracks, and the sand coming back.
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2;
    g.lineStyle(1, STONE_DEEP, 0.7);
    g.lineBetween(cx + Math.cos(a) * rx * 0.2, cy + Math.sin(a) * ry * 0.2, cx + Math.cos(a + 0.3) * rx * 0.8, cy + Math.sin(a + 0.3) * ry * 0.8);
  }
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.7 + rng() * Math.PI * 0.8;
    g.fillStyle(SAND, 0.9); g.fillEllipse(cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.85, rx * 0.6, ry * 0.45);
  }
}

/**
 * A dig-pit: a square shaft into the buried city, its walls showing the strata of sand over rubble
 * over dressed stone, cut blocks stacked at the bottom waiting for the shaduf, a rope ladder down
 * one side. Painted into the ground (the pit is a solid); the shaduf is a piece.
 */
export function digPit(g: G, r: Rect, rng: () => number): void {
  // Spoil heaps round the lip.
  for (let i = 0; i < 6; i++) {
    const side = i % 4;
    const x = side === 0 ? r.x - 16 : side === 1 ? r.x + r.w + 16 : r.x + rng() * r.w;
    const y = side === 2 ? r.y - 14 : side === 3 ? r.y + r.h + 14 : r.y + rng() * r.h;
    g.fillStyle(SAND_DARK, 0.7); g.fillEllipse(x, y + 3, 50, 20);
    g.fillStyle(SAND_LIT, 0.8); g.fillEllipse(x - 3, y, 42, 14);
  }
  // Timber shoring round the lip.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
  g.fillStyle(TIMBER, 1); g.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  for (let x = r.x; x < r.x + r.w; x += 18) { g.lineStyle(1, TIMBER_DARK, 0.8); g.lineBetween(x, r.y - 4, x, r.y + 2); }
  // The walls, in strata — darkest at the bottom.
  const bands = [SAND, SAND_DARK, 0x8a6a4a, STONE_DARK, STONE_DEEP, 0x3a2614];
  for (let i = 0; i < bands.length; i++) {
    const k = i / bands.length;
    const inset = k * Math.min(r.w, r.h) * 0.32;
    g.fillStyle(bands[i], 1);
    g.fillRect(r.x + inset, r.y + inset * 0.7, r.w - inset * 2, r.h - inset * 1.1);
  }
  // A course of dressed blocks exposed in the back wall.
  const by = r.y + r.h * 0.3;
  for (let x = r.x + r.w * 0.18; x < r.x + r.w * 0.8; x += 16) {
    g.fillStyle(STONE, 1); g.fillRect(x, by, 14, 8);
    g.fillStyle(STONE_LIT, 0.7); g.fillRect(x, by, 14, 2);
  }
  // Cut blocks on the floor, roped for lifting.
  const fx = r.x + r.w * 0.5, fy = r.y + r.h * 0.62;
  for (let i = 0; i < 3; i++) {
    const x = fx - 18 + i * 13, y = fy - (i === 1 ? 5 : 0);
    g.fillStyle(STONE_DARK, 1); g.fillRect(x, y, 12, 9);
    g.fillStyle(STONE_LIT, 1); g.fillRect(x, y, 12, 3);
  }
  g.lineStyle(1, CANVAS_DARK, 0.9); g.lineBetween(fx - 12, fy - 4, fx, fy - 26); g.lineBetween(fx + 14, fy - 4, fx, fy - 26);
  // Rope ladder down the east wall.
  const lx = r.x + r.w - 10;
  g.lineStyle(1.4, TIMBER_LIT, 1); g.lineBetween(lx, r.y - 2, lx - 4, r.y + r.h * 0.75); g.lineBetween(lx + 6, r.y - 2, lx + 2, r.y + r.h * 0.75);
  for (let y = r.y + 4; y < r.y + r.h * 0.75; y += 7) g.lineBetween(lx - (y - r.y) * 0.04, y, lx + 6 - (y - r.y) * 0.04, y);
}

/** The north cliff: the mesa's face in banded strata, notched where the sandfalls come down. */
export function cliffFace(g: G, x0: number, x1: number, yBase: number, h: number, rng: () => number): void {
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 24) top.push({ x, y: yBase - h + (rng() - 0.5) * 18 - Math.sin(x / 140) * 10 });
  // The bands, each following the jagged top a little less.
  const n = STRATA.length;
  for (let i = 0; i < n; i++) {
    const k0 = i / n, k1 = (i + 1) / n;
    const pts: Pt[] = [];
    top.forEach((p) => pts.push({ x: p.x, y: p.y + (yBase - p.y) * k0 + Math.sin(p.x / 60 + i) * 2 }));
    top.slice().reverse().forEach((p) => pts.push({ x: p.x, y: p.y + (yBase - p.y) * k1 + Math.sin(p.x / 60 + i + 1) * 2 }));
    poly(g, pts, STRATA[i]);
  }
  // Rim light along the top, runnels and cracks down the face.
  g.lineStyle(3, lit(STRATA[0], 0.4), 0.7);
  for (let i = 0; i < top.length - 1; i++) g.lineBetween(top[i].x, top[i].y + 1, top[i + 1].x, top[i + 1].y + 1);
  for (let x = x0 + 30; x < x1; x += 50 + rng() * 60) {
    const ty = yBase - h + 6;
    g.lineStyle(2, CLIFF_DARK, 0.45);
    g.beginPath(); g.moveTo(x, ty);
    let cx = x;
    for (let y = ty; y < yBase - 4; y += 12) { cx += (rng() - 0.5) * 8; g.lineTo(cx, y); }
    g.strokePath();
  }
  // Ledges of harder rock throwing a line of shadow.
  for (let i = 0; i < 3; i++) {
    const y = yBase - h * (0.25 + i * 0.22);
    g.lineStyle(2, CLIFF_DARK, 0.35); g.lineBetween(x0, y + 3, x1, y + 3 + Math.sin(i) * 4);
  }
  // A skirt of scree and sand at the foot.
  for (let x = x0; x < x1; x += 14) {
    g.fillStyle(SAND_DARK, 0.85); g.fillEllipse(x, yBase + 4, 40 + rng() * 20, 16);
    if (rng() < 0.25) { g.fillStyle(STRATA[1], 1); g.fillCircle(x + rng() * 10, yBase + rng() * 6, 2 + rng() * 3); }
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

/** A sand pile at a sandfall's foot: a steep cone streaked by the fall, a crater at the top. */
export function sandPile(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x + 6, y, 90 * s, 22 * s, 0.25);
  poly(g, [{ x: x - 46 * s, y }, { x: x - 8 * s, y: y - 40 * s }, { x: x + 8 * s, y: y - 40 * s }, { x: x + 46 * s, y }], SAND_DARK);
  poly(g, [{ x: x - 44 * s, y: y - 2 }, { x: x - 8 * s, y: y - 40 * s }, { x: x + 2 * s, y: y - 40 * s }, { x: x + 10 * s, y: y - 2 }], SAND_LIT);
  g.fillStyle(SAND_DEEP, 0.6); g.fillEllipse(x, y - 40 * s, 18 * s, 5 * s);
  for (let i = 0; i < 9; i++) {
    const k = rng();
    g.lineStyle(1, i % 2 ? SAND_PALE : SAND_DEEP, 0.5);
    g.lineBetween(x - 6 * s + k * 12 * s, y - 38 * s, x - 40 * s + k * 80 * s, y - 3);
  }
}

/** The animated part of a sandfall: streams of sand off the cliff lip, a plume where it lands. */
export function sandfall(g: G, x: number, y0: number, y1: number, w: number, t: number): void {
  for (let i = 0; i < 7; i++) {
    const sx = x - w / 2 + (i / 6) * w + Math.sin(t * 1.3 + i) * 2;
    const ph = (t * 1.6 + i * 0.37) % 1;
    g.lineStyle(2 + (i % 3), i % 2 ? SAND_LIT : SAND, 0.55);
    g.lineBetween(sx, y0, sx + Math.sin(t + i) * 3, y1);
    // A clot of grains riding the stream.
    const cy = y0 + (y1 - y0) * ph;
    g.fillStyle(SAND_PALE, 0.7 * (1 - ph * 0.5)); g.fillRect(sx - 1.5, cy, 3, 6);
  }
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.8 + i / 5) % 1;
    g.fillStyle(SAND_LIT, 0.22 * (1 - ph)); g.fillCircle(x + Math.cos(i * 1.7) * ph * w, y1 - ph * 22, 6 + ph * 14);
  }
}

/**
 * A dome of the buried city, sunk to the springing of its windows: a tiled drum with arched
 * window-heads just clearing the sand, a ribbed dome in faded turquoise with whole bands of tiles
 * scoured away to the brick, a brass sunburst on its finial, and the dune banked up its west side.
 */
export function buriedDome(g: G, x: number, y: number, r: number, rng: () => number, scour = 0.3): void {
  shadow(g, x + r * 0.3, y + 2, r * 2.6, r * 0.5, 0.25);
  // The drum: just its top course above the sand.
  const dh = r * 0.42;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - r, y - dh, r * 2, dh);
  g.fillStyle(STONE, 1); g.fillRect(x - r + 2, y - dh, r * 2 - 4, dh - 2);
  // Window heads — pointed arches whose lower halves are under the dune, dark inside.
  const nw = Math.max(3, Math.round(r / 18));
  for (let i = 0; i < nw; i++) {
    const wx = x - r + ((i + 0.5) / nw) * r * 2;
    const ww = (r * 2) / nw * 0.5;
    g.fillStyle(STONE_DEEP, 1);
    g.fillTriangle(wx - ww / 2, y - dh * 0.25, wx + ww / 2, y - dh * 0.25, wx, y - dh * 0.92);
    g.fillRect(wx - ww / 2, y - dh * 0.25, ww, dh * 0.25);
    g.lineStyle(1.5, TILE, 0.9); g.lineBetween(wx - ww / 2 - 2, y - dh * 0.2, wx, y - dh * 0.98); g.lineBetween(wx, y - dh * 0.98, wx + ww / 2 + 2, y - dh * 0.2);
  }
  // Tile band at the cornice.
  for (let k = -r; k < r; k += 8) { g.fillStyle(((k / 8) | 0) % 2 ? TILE : COBALT, 1); g.fillRect(x + k, y - dh - 5, 8, 5); }
  // The dome.
  const top = y - dh - 5;
  g.fillStyle(TILE_DARK, 1); g.fillEllipse(x, top, r * 2.04, r * 1.9);
  g.fillStyle(TILE, 1);
  g.beginPath(); g.arc(x, top, r, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(TILE_LIT, 0.35);
  g.beginPath(); g.arc(x - r * 0.2, top, r * 0.75, Math.PI * 1.05, Math.PI * 1.55, false); g.lineTo(x - r * 0.2, top); g.closePath(); g.fillPath();
  // Ribs.
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    g.lineStyle(1.5, TILE_DARK, 0.8);
    g.beginPath(); g.moveTo(x + Math.cos(a) * r, top);
    for (let s = 1; s <= 6; s++) { const k = s / 6; g.lineTo(x + Math.cos(a) * r * (1 - k * k), top - Math.sin(Math.PI * 0.5 * k) * r); }
    g.strokePath();
  }
  // Scoured patches where the tiles are gone and the brick shows.
  for (let i = 0; i < 6 * scour + 1; i++) {
    const a = Math.PI * 1.1 + rng() * Math.PI * 0.8, d = r * (0.3 + rng() * 0.55);
    const px = x + Math.cos(a) * d, py = top + Math.sin(a) * d * 0.95;
    g.fillStyle(0xa8643a, 1); g.fillEllipse(px, py, 14 + rng() * 12, 8 + rng() * 6);
    g.lineStyle(1, 0x6a3a1e, 0.6); g.lineBetween(px - 6, py, px + 6, py); g.lineBetween(px - 4, py + 3, px + 5, py + 3);
  }
  // Finial: a shaft and a brass sunburst.
  const fy = top - r;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 1.5, fy - 18, 3, 18);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineStyle(1.5, BRASS, 1); g.lineBetween(x, fy - 22, x + Math.cos(a) * (i % 2 ? 6 : 9), fy - 22 + Math.sin(a) * (i % 2 ? 6 : 9));
  }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, fy - 22, 3.5);
  // Sand on the cornice ledge and the dune banked up the west.
  g.fillStyle(SAND_LIT, 1); g.fillEllipse(x + r * 0.5, y - dh - 3, r * 0.6, 5);
  drift(g, x - r * 0.55, y + 2, r * 1.3, dh + r * 0.35, rng, true);
  drift(g, x + r * 0.7, y + 2, r * 0.9, dh * 0.5, rng, false);
}

/**
 * The top of a buried bell-tower, leaning where the city settled: a gallery on corbels, lattice
 * windows, a ribbed cap and a bronze bell still hung in the open belfry — no rope reaches it now.
 */
export function buriedTower(g: G, x: number, y: number, h: number, rng: () => number): void {
  const lean = 0.08;
  const X = (k: number) => x + k * h * lean;
  shadow(g, x + 20, y + 2, 80, 18, 0.25);
  const w = 34;
  // Shaft.
  poly(g, [{ x: X(0) - w / 2, y }, { x: X(1) - w / 2, y: y - h }, { x: X(1) + w / 2, y: y - h }, { x: X(0) + w / 2, y }], STONE_DARK);
  poly(g, [{ x: X(0) - w / 2 + 3, y }, { x: X(1) - w / 2 + 3, y: y - h }, { x: X(1) + w / 2 - 8, y: y - h }, { x: X(0) + w / 2 - 8, y }], STONE);
  for (let k = 0.1; k < 0.95; k += 0.12) { g.lineStyle(1, STONE_DARK, 0.6); g.lineBetween(X(k) - w / 2, y - h * k, X(k) + w / 2, y - h * k); }
  // Lattice window.
  const wy = y - h * 0.45;
  g.fillStyle(STONE_DEEP, 1); g.fillRect(X(0.45) - 7, wy - 16, 14, 20);
  g.lineStyle(1, STONE_LIT, 0.8);
  for (let i = 0; i < 4; i++) { g.lineBetween(X(0.45) - 7 + i * 4.5, wy - 16, X(0.45) - 7 + i * 4.5 + 4, wy + 4); g.lineBetween(X(0.45) + 7 - i * 4.5, wy - 16, X(0.45) + 7 - i * 4.5 - 4, wy + 4); }
  // Gallery on corbels.
  const gy = y - h;
  for (let i = 0; i < 6; i++) { g.fillStyle(STONE_DARK, 1); g.fillTriangle(X(1) - w / 2 - 8 + i * 9, gy, X(1) - w / 2 - 2 + i * 9, gy, X(1) - w / 2 - 4 + i * 9, gy + 8); }
  g.fillStyle(STONE_DARK, 1); g.fillRect(X(1) - w / 2 - 10, gy - 6, w + 20, 7);
  g.fillStyle(STONE_LIT, 1); g.fillRect(X(1) - w / 2 - 10, gy - 7, w + 20, 3);
  for (let i = 0; i < 7; i++) { g.fillStyle(STONE, 1); g.fillRect(X(1) - w / 2 - 8 + i * 7.5, gy - 16, 3, 10); }
  // Belfry with the bell.
  const by = gy - 16;
  g.fillStyle(STONE, 1); g.fillRect(X(1) - w / 2 + 2, by - 30, w - 4, 30);
  g.fillStyle(STONE_DEEP, 1);
  g.beginPath(); g.arc(X(1), by - 18, 9, Math.PI, 0, false); g.lineTo(X(1) + 9, by); g.lineTo(X(1) - 9, by); g.closePath(); g.fillPath();
  g.fillStyle(0x8a6a2a, 1); g.fillTriangle(X(1) - 7, by - 4, X(1) + 7, by - 4, X(1), by - 20);
  g.fillStyle(BRASS, 1); g.fillEllipse(X(1), by - 5, 15, 5);
  g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(X(1) - 2, by - 12, 1.6);
  // Ribbed cap.
  const cy = by - 30;
  g.fillStyle(TILE_DARK, 1); g.fillTriangle(X(1) - w / 2 - 2, cy, X(1) + w / 2 + 2, cy, X(1) + 2, cy - 36);
  g.fillStyle(TILE, 1); g.fillTriangle(X(1) - w / 2 + 1, cy, X(1) + 2, cy, X(1) + 2, cy - 34);
  for (let i = 1; i < 4; i++) { g.lineStyle(1, TILE_DARK, 0.8); g.lineBetween(X(1) - w / 2 + i * (w / 4), cy, X(1) + 2, cy - 34); }
  g.fillStyle(BRASS, 1); g.fillCircle(X(1) + 2, cy - 38, 3);
  // Sand on the gallery and banked round the foot.
  g.fillStyle(SAND_LIT, 1); g.fillEllipse(X(1) - 10, gy - 9, 18, 4);
  drift(g, x - 10, y + 2, 110, 30, rng, true);
}

/** The tops of a buried arcade: pointed arches just clearing the dune, sand filling every bay. */
export function arcadeTops(g: G, x: number, y: number, n: number, span: number, rng: () => number): void {
  const x0 = x - (n * span) / 2;
  shadow(g, x + 10, y + 2, n * span + 30, 16, 0.2);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 4, y - span * 0.85, n * span + 8, 9);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 4, y - span * 0.85 - 2, n * span + 8, 4);
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * span;
    // The arch ring in voussoirs, alternating stone and tile.
    for (let k = 0; k < 9; k++) {
      const a0 = Math.PI + (k / 9) * Math.PI, a1 = Math.PI + ((k + 1) / 9) * Math.PI;
      const ro = span * 0.5, ri = span * 0.36;
      poly(g, [
        { x: cx + Math.cos(a0) * ro, y: y + Math.sin(a0) * ro * 1.3 }, { x: cx + Math.cos(a1) * ro, y: y + Math.sin(a1) * ro * 1.3 },
        { x: cx + Math.cos(a1) * ri, y: y + Math.sin(a1) * ri * 1.3 }, { x: cx + Math.cos(a0) * ri, y: y + Math.sin(a0) * ri * 1.3 },
      ], k % 2 ? STONE : TILE);
    }
    // Sand filling the bay to a dune curve.
    g.fillStyle(SAND, 1);
    g.beginPath(); g.arc(cx, y, span * 0.36, Math.PI, 0, false); g.closePath(); g.fillPath();
    g.fillStyle(STONE_DEEP, 0.85); g.fillEllipse(cx + 2, y - span * 0.32, span * 0.3, span * 0.12);
    g.fillStyle(SAND_LIT, 0.8); g.fillEllipse(cx - 4, y - 2, span * 0.6, 7);
  }
  drift(g, x0 + 10, y + 3, span * 1.2, span * 0.5, rng, true);
}

/** A broken column: a fluted drum stump, its fallen capital lying beside it, half in the sand. */
export function brokenColumn(g: G, x: number, y: number, h: number, rng: () => number): void {
  shadow(g, x + 8, y + 1, 56, 14, 0.25);
  const w = 20;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x - w / 2 + 2, y - h, w - 7, h);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, STONE_DARK, 0.7); g.lineBetween(x - w / 2 + 4 + i * 4, y - h + 2, x - w / 2 + 4 + i * 4, y); }
  // The snapped top.
  poly(g, [{ x: x - w / 2, y: y - h }, { x: x - 3, y: y - h - 7 }, { x: x + 2, y: y - h - 2 }, { x: x + w / 2, y: y - h - 9 }, { x: x + w / 2, y: y - h }], STONE_LIT);
  // The capital in the sand.
  const cx = x + 26, cy = y - 2;
  g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 12, cy - 9, 24, 9);
  g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 12, cy - 11, 24, 4);
  g.fillStyle(STONE, 1); g.fillCircle(cx - 12, cy - 6, 4); g.fillCircle(cx + 12, cy - 6, 4);
  g.fillStyle(SAND, 1); g.fillEllipse(cx + 4, cy, 30, 7);
  g.fillStyle(SAND, 1); g.fillEllipse(x - 4, y, 34, 9);
  if (rng() < 0.5) { g.fillStyle(SAND_LIT, 1); g.fillEllipse(x + 2, y - h - 4, 10, 3); }
}

/**
 * A shaduf: two posts and a crossbar, a long sweep-pole with a lump of rock lashed to the short end
 * and a rope basket of cut stone hanging from the long end over the pit.
 */
export function shaduf(g: G, x: number, y: number, dir: 1 | -1, rng: () => number): void {
  shadow(g, x, y + 2, 40, 10, 0.25);
  for (const k of [-8, 8]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k - 2, y - 62, 5, 62); g.fillStyle(TIMBER_LIT, 0.5); g.fillRect(x + k - 2, y - 62, 1.5, 62); }
  g.fillStyle(TIMBER, 1); g.fillRect(x - 12, y - 64, 24, 5);
  // Sweep pole, pivoting on the bar: up at the weight end, down over the pit.
  const px = x, py = y - 62;
  const ax = px - dir * 40, ay = py + 18, bx = px + dir * 78, by = py - 26;
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(1.5, TIMBER_LIT, 0.7); g.lineBetween(ax, ay - 1.5, bx, by - 1.5);
  // Counterweight rock.
  g.fillStyle(STONE_DEEP, 1); g.fillCircle(ax, ay + 4, 9);
  g.fillStyle(STONE_DARK, 1); g.fillCircle(ax - 2, ay + 2, 7);
  g.lineStyle(1, CANVAS_DARK, 1); g.lineBetween(ax - 8, ay + 2, ax + 8, ay + 6);
  // The rope and the basket of stone.
  g.lineStyle(1, CANVAS_DARK, 1); g.lineBetween(bx, by, bx, by + 44);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(bx, by + 50, 18, 12);
  g.fillStyle(TIMBER, 1); g.fillEllipse(bx, by + 48, 16, 8);
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? STONE_LIT : STONE, 1); g.fillRect(bx - 7 + i * 5, by + 41 - (i % 2) * 2, 5, 5); }
  if (rng() < 0.5) { g.fillStyle(SAND_PALE, 0.6); g.fillRect(bx + 2, by + 56, 1.5, 6); }
}

/** Options for a sand-ship. */
export interface ShipOpts {
  /** Main sail colour and its stripe. */
  sail?: number; stripe?: number;
  /** Sail furled on the yard (moored). */
  furled?: boolean;
  /** Gun ports along the side, lit when firing (0–1). */
  guns?: number;
  /** A broken, half-buried wreck. */
  wreck?: boolean;
}

/**
 * A sand-ship in side view: a planked hull on two long runners that curl up at the bow like sledge
 * skis, struts between, a raked mast with a lateen yard and a great striped triangle of sail, a
 * pennant at the masthead. `dir` is the way the bow points; `x,y` is the runners' contact line.
 */
export function sandShip(g: G, x: number, y: number, s: number, dir: 1 | -1, o: ShipOpts = {}): void {
  const X = (dx: number) => x + dx * s * dir;
  const Y = (dy: number) => y + dy * s;
  if (!o.wreck) shadow(g, x, y + 3, 170 * s, 16 * s, 0.3);
  // Runners.
  for (const k of [0, 1]) {
    const off = k ? 2 : 0;
    g.lineStyle(3 * s, k ? TIMBER_DARK : dim(TIMBER_DARK, 0.3), 1);
    g.beginPath(); g.moveTo(X(-78), Y(-1 - off));
    g.lineTo(X(70), Y(-1 - off));
    g.lineTo(X(84), Y(-8 - off)); g.lineTo(X(88), Y(-16 - off));
    g.strokePath();
  }
  // Struts.
  for (const k of [-56, -20, 20, 54]) { g.lineStyle(2 * s, TIMBER_DARK, 1); g.lineBetween(X(k), Y(-2), X(k + 6), Y(-16)); }
  // Hull: a long shallow boat.
  const hull: Pt[] = [
    { x: X(-74), y: Y(-34) }, { x: X(70), y: Y(-34) }, { x: X(92), y: Y(-42) },
    { x: X(70), y: Y(-16) }, { x: X(-60), y: Y(-14) }, { x: X(-76), y: Y(-22) },
  ];
  poly(g, hull, o.wreck ? dim(TIMBER, 0.25) : TIMBER_DARK);
  poly(g, hull.map((p) => ({ x: p.x, y: p.y + (p.y < Y(-30) ? 2 * s : -2 * s) })), o.wreck ? dim(TIMBER, 0.1) : TIMBER);
  for (let k = 0; k < 3; k++) { g.lineStyle(1, TIMBER_DARK, 0.7); g.lineBetween(X(-70), Y(-30 + k * 5), X(76 - k * 4), Y(-30 + k * 5)); }
  // A painted strake, the old city's turquoise.
  g.lineStyle(2.5 * s, TILE, o.wreck ? 0.4 : 0.9); g.lineBetween(X(-72), Y(-32), X(78), Y(-33));
  // Gun ports.
  for (let i = 0; i < 4; i++) {
    const gx = X(-44 + i * 28), gy = Y(-25);
    g.fillStyle(0x2a1a10, 1); g.fillRect(gx - 4 * s, gy - 3 * s, 8 * s, 6 * s);
    if ((o.guns ?? 0) > 0) { g.fillStyle(0xffd070, o.guns ?? 0); g.fillCircle(gx, gy, 3.5 * s); }
  }
  // Rail.
  g.lineStyle(1.5 * s, TIMBER_LIT, 1); g.lineBetween(X(-74), Y(-40), X(70), Y(-40));
  for (let k = -70; k <= 70; k += 14) g.lineBetween(X(k), Y(-40), X(k), Y(-34));
  if (o.wreck) {
    // Ribs showing through stove-in planks; the mast snapped.
    for (let k = -30; k <= 30; k += 12) { g.lineStyle(2, dim(TIMBER, 0.4), 1); g.lineBetween(X(k), Y(-40), X(k + 4), Y(-58)); }
    g.lineStyle(4 * s, TIMBER_DARK, 1); g.lineBetween(X(4), Y(-40), X(-6), Y(-84));
    return;
  }
  // Mast (raked aft) and lateen yard.
  const mx = X(6), my = Y(-40);
  const tx = X(-2), ty = Y(-150);
  g.lineStyle(4 * s, TIMBER_DARK, 1); g.lineBetween(mx, my, tx, ty);
  g.lineStyle(1.5 * s, TIMBER_LIT, 0.7); g.lineBetween(mx - 1, my, tx - 1, ty);
  const yA = { x: X(80), y: Y(-50) }, yB = { x: X(-50), y: Y(-160) };
  const sailC = o.sail ?? CANVAS, stripeC = o.stripe ?? STRIPE_RED;
  if (o.furled) {
    g.lineStyle(7 * s, CANVAS_DARK, 1); g.lineBetween(yA.x, yA.y, yB.x, yB.y);
    g.lineStyle(4 * s, sailC, 1); g.lineBetween(yA.x, yA.y - 1, yB.x, yB.y - 1);
    for (let k = 0.15; k < 1; k += 0.18) { g.lineStyle(1.5, stripeC, 1); const px = yA.x + (yB.x - yA.x) * k, py = yA.y + (yB.y - yA.y) * k; g.lineBetween(px - 3, py - 3, px + 3, py + 3); }
  } else {
    // The sail: a lateen triangle from the yard down to the tack at the bow, bellied by the wind.
    const tack = { x: X(64), y: Y(-44) };
    const clew = { x: X(-56), y: Y(-50) };
    poly(g, [yA, yB, { x: clew.x - dir * 6 * s, y: clew.y - 40 * s }, clew, tack], dim(sailC, 0.15));
    poly(g, [{ x: yA.x - dir * 4, y: yA.y + 2 }, yB, { x: clew.x - dir * 2 * s, y: clew.y - 42 * s }, { x: clew.x + dir * 4 * s, y: clew.y - 4 }, { x: tack.x - dir * 6, y: tack.y - 2 }], sailC);
    // Stripes across the sail.
    for (let k = 1; k <= 3; k++) {
      const f = k / 4.2;
      const a = { x: yA.x + (yB.x - yA.x) * f, y: yA.y + (yB.y - yA.y) * f };
      const b = { x: tack.x + (clew.x - tack.x) * f, y: tack.y + (clew.y - tack.y) * f - 14 * s * Math.sin(f * Math.PI) };
      g.lineStyle(5 * s, stripeC, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Belly shading and a patched corner.
    g.fillStyle(0x000000, 0.08); g.fillTriangle(yB.x, yB.y, clew.x, clew.y - 40 * s, X(-10), Y(-80));
    g.fillStyle(STRIPE_SAFFRON, 0.9); g.fillRect(X(30) - 5 * s, Y(-66), 10 * s, 8 * s);
    g.lineStyle(1, CANVAS_DARK, 0.8); g.strokeRect(X(30) - 5 * s, Y(-66), 10 * s, 8 * s);
  }
  // Yard spar and rigging.
  g.lineStyle(3 * s, TIMBER_DARK, 1); g.lineBetween(yA.x, yA.y, yB.x, yB.y);
  g.lineStyle(1, CANVAS_DARK, 0.8); g.lineBetween(tx, ty, X(-74), Y(-40)); g.lineBetween(tx, ty, X(86), Y(-42));
  // Pennant streaming downwind.
  g.fillStyle(STRIPE_INDIGO, 1); g.fillTriangle(tx, ty - 2, tx, ty + 6 * s, tx - dir * 26 * s, ty + 1);
  g.fillStyle(STRIPE_SAFFRON, 1); g.fillTriangle(tx, ty + 1, tx, ty + 4 * s, tx - dir * 14 * s, ty + 2);
}

/**
 * The caravanserai: a fortress inn of sandstone round a courtyard. Two round corner towers with
 * tiled domes, a crenellated curtain wall striped with tile bands, and the great gate — a deep
 * pointed iwan with honeycomb vaulting, its cedar doors thrown open on the courtyard well. Striped
 * awnings shade the stalls along the wall; sacks, jars and a couched camel crowd the gate.
 */
export function caravanserai(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x + 30, y + 6, w * 1.12, 34, 0.3);
  // The courtyard roofline seen over the wall: arcades on the far side.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + 40, y - h - 30, w - 80, 34);
  for (let i = 0; i < 12; i++) {
    const ax = x0 + 52 + i * ((w - 104) / 11);
    g.fillStyle(STONE_DEEP, 1);
    g.beginPath(); g.arc(ax, y - h - 8, 8, Math.PI, 0, false); g.lineTo(ax + 8, y - h + 4); g.lineTo(ax - 8, y - h + 4); g.closePath(); g.fillPath();
  }
  // Curtain wall.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 2, y - h, w - 4, h - 4);
  for (let row = y - h + 14; row < y - 6; row += 14) {
    g.lineStyle(1, STONE_DARK, 0.4); g.lineBetween(x0 + 2, row, x0 + w - 2, row);
    for (let bx = x0 + ((row / 14) % 2 ? 0 : 14); bx < x0 + w; bx += 28) g.lineBetween(bx, row - 14, bx, row);
  }
  // Tile bands.
  for (const by of [y - h + 10, y - h * 0.45]) {
    for (let k = x0 + 4; k < x0 + w - 4; k += 10) { g.fillStyle(((k / 10) | 0) % 2 ? TILE : COBALT, 1); g.fillRect(k, by, 10, 6); }
    g.fillStyle(BRASS, 0.8); g.fillRect(x0 + 4, by + 6, w - 8, 1.5);
  }
  // Crenellations, each with a stepped merlon.
  for (let k = x0; k < x0 + w; k += 18) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(k + 2, y - h - 12, 12, 12);
    g.fillStyle(STONE_LIT, 1); g.fillRect(k + 2, y - h - 12, 12, 3); g.fillRect(k + 5, y - h - 17, 6, 5);
  }
  // Corner towers.
  for (const tx of [x0 + 10, x0 + w - 10]) {
    const tr = 34;
    g.fillStyle(STONE_DARK, 1); g.fillRect(tx - tr, y - h - 50, tr * 2, h + 50);
    g.fillStyle(STONE, 1); g.fillRect(tx - tr + 3, y - h - 50, tr * 2 - 12, h + 46);
    g.fillStyle(STONE_LIT, 0.5); g.fillRect(tx - tr + 3, y - h - 50, 5, h + 46);
    for (let k = 0; k < 3; k++) { g.fillStyle(STONE_DEEP, 1); g.fillRect(tx - 3, y - h - 34 + k * 40, 6, 16); }
    for (let k = tx - tr; k < tx + tr; k += 8) { g.fillStyle(((k / 8) | 0) % 2 ? TILE : COBALT, 1); g.fillRect(k, y - h - 54, 8, 5); }
    g.fillStyle(TILE_DARK, 1); g.fillEllipse(tx, y - h - 56, tr * 2, tr * 1.2);
    g.fillStyle(TILE, 1); g.beginPath(); g.arc(tx, y - h - 56, tr - 2, Math.PI, 0, false); g.closePath(); g.fillPath();
    g.fillStyle(TILE_LIT, 0.4); g.fillEllipse(tx - 10, y - h - 70, 14, 10);
    g.fillStyle(BRASS, 1); g.fillRect(tx - 1, y - h - 56 - tr - 10, 2, 12); g.fillCircle(tx, y - h - 56 - tr - 12, 3);
  }
  // The iwan gate: a tall frame, a deep pointed arch with honeycomb vault, cedar doors open.
  const gw = 110, gh = h + 34;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - gw / 2 - 14, y - gh - 14, gw + 28, gh + 14);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - gw / 2 - 10, y - gh - 10, gw + 20, gh + 10);
  for (let k = x - gw / 2 - 10; k < x + gw / 2 + 10; k += 10) { g.fillStyle(((k / 10) | 0) % 2 ? TILE : COBALT, 1); g.fillRect(k, y - gh - 10, 10, 8); }
  const ay = y - gh + 10;
  g.fillStyle(STONE_DEEP, 1);
  g.fillTriangle(x - gw / 2, ay + 40, x + gw / 2, ay + 40, x, ay - 8);
  g.fillRect(x - gw / 2, ay + 40, gw, y - ay - 40);
  // Honeycomb (muqarnas) cells in the vault.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i <= row + 2; i++) {
      const cx = x - (row + 2) * 9 + i * 18, cy = ay + 4 + row * 12;
      g.fillStyle(row % 2 ? STONE : STONE_DARK, 1);
      g.beginPath(); g.arc(cx, cy + 6, 8, Math.PI, 0, false); g.closePath(); g.fillPath();
      g.lineStyle(1, BRASS_DARK, 0.6); g.beginPath(); g.arc(cx, cy + 6, 8, Math.PI, 0, false); g.strokePath();
    }
  }
  // Through the gate: the courtyard, its well, a palm.
  g.fillStyle(SAND_LIT, 1); g.fillRect(x - gw / 2 + 14, y - 46, gw - 28, 46);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y - 18, 34, 12);
  g.fillStyle(WATER_DEEP, 1); g.fillEllipse(x, y - 20, 24, 7);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 14, y - 20, x - 14, y - 42); g.lineBetween(x + 14, y - 20, x + 14, y - 42); g.lineBetween(x - 16, y - 42, x + 16, y - 42);
  g.lineStyle(1, CANVAS_DARK, 1); g.lineBetween(x, y - 42, x, y - 26);
  // Doors swung back against the reveals, studded.
  for (const k of [-1, 1]) {
    const dx = x + k * (gw / 2 - 6);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 6, ay + 40, 12, y - ay - 40);
    g.fillStyle(TIMBER, 1); g.fillRect(dx - 5, ay + 42, 9, y - ay - 44);
    for (let sy = ay + 50; sy < y - 4; sy += 12) { g.fillStyle(BRASS, 1); g.fillCircle(dx, sy, 1.6); }
  }
  // Awnings along the wall: striped cloth on poles, a stall beneath each.
  const awn = [x0 + 70, x0 + 160, x + 110, x + 200];
  awn.forEach((ax, i) => {
    if (ax > x0 + w - 60) return;
    const c = [STRIPE_RED, STRIPE_INDIGO, STRIPE_SAFFRON, STRIPE_RED][i];
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(ax - 34, y + 10, ax - 34, y - 34); g.lineBetween(ax + 34, y + 10, ax + 34, y - 34);
    poly(g, [{ x: ax - 40, y: y - 34 }, { x: ax + 40, y: y - 34 }, { x: ax + 36, y: y - 60 }, { x: ax - 36, y: y - 60 }], CANVAS);
    for (let k = 0; k < 4; k++) poly(g, [{ x: ax - 40 + k * 20, y: y - 34 }, { x: ax - 30 + k * 20, y: y - 34 }, { x: ax - 27 + k * 18, y: y - 60 }, { x: ax - 36 + k * 18, y: y - 60 }], c);
    for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? c : CANVAS, 1); g.fillTriangle(ax - 40 + k * 10, y - 34, ax - 30 + k * 10, y - 34, ax - 35 + k * 10, y - 28); }
    // The stall: sacks of spice and a row of jars.
    g.fillStyle(TIMBER, 1); g.fillRect(ax - 28, y - 14, 56, 10);
    for (let k = 0; k < 4; k++) {
      const sc = [0xc8402a, 0xe8b030, 0x6a8a3a, 0x8a4a2a][k];
      g.fillStyle(CANVAS_DARK, 1); g.fillEllipse(ax - 21 + k * 14, y - 18, 12, 10);
      g.fillStyle(sc, 1); g.fillEllipse(ax - 21 + k * 14, y - 22, 10, 5);
    }
  });
  // Jars and sacks heaped by the gate; a couched camel.
  for (let i = 0; i < 4; i++) jar(g, x - gw / 2 - 26 - i * 12, y + 2 - (i % 2) * 4, 0.8 + rng() * 0.3, i % 2 ? TILE : 0xb8643a);
  camel(g, x + gw / 2 + 44, y + 8, 0.9, -1);
  // Sand drifted against the west tower.
  drift(g, x0 - 10, y + 4, 120, 46, rng, true);
}

/** A tall jar (amphora-shaped), glazed or plain. */
export function jar(g: G, x: number, y: number, s: number, color: number): void {
  shadow(g, x, y + 1, 18 * s, 5 * s, 0.25);
  g.fillStyle(dim(color, 0.3), 1); g.fillEllipse(x, y - 10 * s, 16 * s, 20 * s);
  g.fillStyle(color, 1); g.fillEllipse(x - 1, y - 11 * s, 13 * s, 18 * s);
  g.fillStyle(dim(color, 0.3), 1); g.fillRect(x - 3 * s, y - 24 * s, 6 * s, 5 * s);
  g.fillStyle(lit(color, 0.3), 1); g.fillRect(x - 4 * s, y - 25 * s, 8 * s, 2 * s);
  g.fillStyle(lit(color, 0.5), 0.6); g.fillEllipse(x - 3 * s, y - 14 * s, 3 * s, 7 * s);
}

/** A couched camel: legs folded under, hump, a long neck curving up to a disdainful head. */
export function camel(g: G, x: number, y: number, s: number, dir: 1 | -1): void {
  const X = (dx: number) => x + dx * s * dir;
  const Y = (dy: number) => y + dy * s;
  shadow(g, x, y + 1, 70 * s, 12 * s, 0.3);
  const hide = 0xc89a5e, hideDark = 0x8a6438;
  // Folded legs.
  g.fillStyle(hideDark, 1); g.fillEllipse(X(-14), Y(-3), 20 * s, 7 * s); g.fillEllipse(X(14), Y(-3), 18 * s, 7 * s);
  // Body and hump.
  g.fillStyle(hideDark, 1); g.fillEllipse(X(0), Y(-14), 50 * s, 22 * s);
  g.fillStyle(hide, 1); g.fillEllipse(X(-1), Y(-15), 46 * s, 19 * s);
  g.fillStyle(hide, 1); g.fillEllipse(X(-2), Y(-26), 24 * s, 18 * s);
  g.fillStyle(lit(hide, 0.2), 0.7); g.fillEllipse(X(-5), Y(-30), 10 * s, 6 * s);
  // Saddle blanket, striped.
  g.fillStyle(STRIPE_RED, 1); g.fillRect(X(-12) - (dir < 0 ? 22 * s : 0), Y(-22), 22 * s, 12 * s);
  g.fillStyle(STRIPE_SAFFRON, 1); g.fillRect(X(-12) - (dir < 0 ? 22 * s : 0), Y(-17), 22 * s, 2.5 * s);
  // Neck and head.
  g.lineStyle(8 * s, hideDark, 1); g.lineBetween(X(20), Y(-16), X(30), Y(-38));
  g.lineStyle(6 * s, hide, 1); g.lineBetween(X(20), Y(-16), X(30), Y(-38));
  g.fillStyle(hide, 1); g.fillEllipse(X(35), Y(-40), 16 * s, 8 * s);
  g.fillStyle(hideDark, 1); g.fillCircle(X(40), Y(-40), 1.4 * s); g.fillCircle(X(31), Y(-43), 1.6 * s);
  g.fillStyle(hideDark, 1); g.fillTriangle(X(28), Y(-44), X(26), Y(-48), X(30), Y(-45));
  // Bridle tassel.
  g.fillStyle(STRIPE_INDIGO, 1); g.fillCircle(X(33), Y(-35), 2 * s);
}

/**
 * A date palm: a ringed, gently curving trunk, a crown of long arching fronds with leaflets
 * picked out along each rib, hanging clusters of dates, and a dead frond skirt under the crown.
 */
export function palm(g: G, x: number, y: number, s: number, lean: number, rng: () => number): void {
  const h = 110 * s;
  const tx = x + lean * h * 0.35, ty = y - h;
  shadow(g, x + 30 * s, y + 2, 110 * s, 26 * s, 0.22);
  // Trunk, ring by ring.
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const k0 = i / steps, k1 = (i + 1) / steps;
    const x0 = x + lean * h * 0.35 * k0 * k0, y0 = y - h * k0;
    const x1 = x + lean * h * 0.35 * k1 * k1, y1 = y - h * k1;
    const w = (9 - k0 * 3) * s;
    g.lineStyle(w * 2, TRUNK_DARK, 1); g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(w * 1.4, TRUNK, 1); g.lineBetween(x0 - 1, y0, x1 - 1, y1);
    g.lineStyle(1.2, TRUNK_DARK, 0.8); g.lineBetween(x0 - w, y0, x0 + w, y0 - 2 * s);
  }
  // Dead frond skirt.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.35 + (i / 5) * Math.PI * 0.3;
    g.lineStyle(2 * s, 0x8a6a3a, 0.9); g.lineBetween(tx, ty + 6 * s, tx + Math.cos(a) * 26 * s * (i % 2 ? 1 : -1), ty + Math.sin(a) * 30 * s);
  }
  // Dates.
  for (const k of [-1, 1]) {
    for (let i = 0; i < 7; i++) { g.fillStyle(i % 2 ? DATES : dim(DATES, 0.25), 1); g.fillCircle(tx + k * (6 + (i % 3) * 3) * s, ty + (6 + i * 2) * s, 2.4 * s); }
  }
  // Fronds.
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + (i / (n - 1)) * Math.PI + (rng() - 0.5) * 0.2;
    const len = (46 + rng() * 14) * s;
    const droop = (i === 0 || i === n - 1 ? 30 : Math.abs(Math.cos(a)) * 34) * s;
    const pts: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      pts.push({ x: tx + Math.cos(a) * len * f, y: ty + Math.sin(a) * len * f * 0.6 + droop * f * f });
    }
    for (let k = 1; k < pts.length; k++) {
      const p = pts[k], q = pts[k - 1];
      const nx = -(p.y - q.y), ny = p.x - q.x;
      const nl = Math.hypot(nx, ny) || 1;
      const ll = (11 - k) * s;
      g.lineStyle(1.6 * s, i % 2 ? PALM : PALM_DARK, 1);
      g.lineBetween(p.x, p.y, p.x + (nx / nl) * ll + (p.x - q.x) * 0.3, p.y + (ny / nl) * ll + 5 * s);
      g.lineBetween(p.x, p.y, p.x - (nx / nl) * ll + (p.x - q.x) * 0.3, p.y - (ny / nl) * ll + 5 * s);
    }
    g.lineStyle(2 * s, PALM_DARK, 1);
    for (let k = 0; k < pts.length - 1; k++) g.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    g.lineStyle(1 * s, PALM_LIT, 0.7);
    for (let k = 0; k < 3; k++) g.lineBetween(pts[k].x, pts[k].y - 1, pts[k + 1].x, pts[k + 1].y - 1);
  }
  g.fillStyle(PALM_DARK, 1); g.fillCircle(tx, ty, 5 * s);
}

/**
 * The oasis pool: a ring of damp, darkened sand, reeds and rushes in clumps, the water deep in the
 * middle with the sky laid on it. Static — the shimmer and rings are in `animate`.
 */
export function oasisPool(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle(SAND_DEEP, 0.5); g.fillEllipse(cx, cy + 4, r.w + 70, r.h + 50);
  g.fillStyle(0x7a6a3a, 0.6); g.fillEllipse(cx, cy + 2, r.w + 30, r.h + 24);
  g.fillStyle(WATER_DEEP, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(WATER, 1); g.fillEllipse(cx - 6, cy - 4, r.w * 0.9, r.h * 0.84);
  g.fillStyle(WATER_DEEP, 0.5); g.fillEllipse(cx + 10, cy + 6, r.w * 0.5, r.h * 0.4);
  g.fillStyle(WATER_LIT, 0.35); g.fillEllipse(cx - r.w * 0.2, cy - r.h * 0.2, r.w * 0.3, r.h * 0.12);
  // Reeds in clumps round the margin.
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2;
    const rx = cx + Math.cos(a) * r.w * 0.5, ry = cy + Math.sin(a) * r.h * 0.5;
    for (let k = 0; k < 6; k++) {
      const bx = rx + (rng() - 0.5) * 14;
      g.lineStyle(1.5, k % 2 ? PALM : PALM_LIT, 1); g.lineBetween(bx, ry, bx + (rng() - 0.5) * 8, ry - 10 - rng() * 14);
    }
    if (rng() < 0.4) { g.fillStyle(0x6a4a2a, 1); g.fillEllipse(rx + 3, ry - 16, 3, 8); }
  }
}

/**
 * A desert tent: a long low ridge of goat-hair cloth, black-brown with a woven band of colour,
 * pegged out on guy ropes, the front panel lifted on poles over a rug and a coffee pot.
 */
export function tent(g: G, x: number, y: number, w: number, band: number, rng: () => number, sanded = 0): void {
  shadow(g, x + 10, y + 3, w * 1.2, 22, 0.3);
  const h = w * 0.36;
  const cloth = 0x3a2a22, clothLit = 0x5a4434;
  // Back slope and ridge.
  poly(g, [{ x: x - w / 2, y }, { x: x - w * 0.38, y: y - h }, { x: x + w * 0.38, y: y - h }, { x: x + w / 2, y }], cloth);
  poly(g, [{ x: x - w / 2 + 3, y: y - 2 }, { x: x - w * 0.38, y: y - h + 3 }, { x: x - w * 0.1, y: y - h + 3 }, { x: x - w * 0.18, y: y - 2 }], clothLit);
  // The woven band.
  g.fillStyle(band, 1); g.fillRect(x - w * 0.44, y - h * 0.55, w * 0.88, 6);
  for (let k = x - w * 0.44; k < x + w * 0.44; k += 8) { g.fillStyle(CANVAS, 1); g.fillTriangle(k, y - h * 0.55 + 6, k + 4, y - h * 0.55, k + 8, y - h * 0.55 + 6); }
  // Front panel lifted on two poles: a dark mouth with a rug.
  const mx = x + w * 0.05;
  g.fillStyle(0x1a120e, 1); g.fillRect(mx - w * 0.18, y - h * 0.62, w * 0.36, h * 0.62);
  poly(g, [{ x: mx - w * 0.24, y: y - h * 0.65 }, { x: mx + w * 0.24, y: y - h * 0.65 }, { x: mx + w * 0.3, y: y - h * 0.95 }, { x: mx - w * 0.3, y: y - h * 0.95 }], cloth);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(mx - w * 0.24, y + 2, mx - w * 0.24, y - h * 0.66); g.lineBetween(mx + w * 0.24, y + 2, mx + w * 0.24, y - h * 0.66);
  g.fillStyle(STRIPE_RED, 1); g.fillRect(mx - w * 0.15, y - 4, w * 0.3, 8);
  g.fillStyle(STRIPE_SAFFRON, 1); g.fillRect(mx - w * 0.15, y - 1, w * 0.3, 2);
  g.fillStyle(BRASS, 1); g.fillEllipse(mx + w * 0.2, y - 6, 7, 9); g.fillStyle(BRASS_LIT, 1); g.fillTriangle(mx + w * 0.2 + 3, y - 10, mx + w * 0.2 + 8, y - 12, mx + w * 0.2 + 3, y - 8);
  // Guy ropes.
  g.lineStyle(1, CANVAS_DARK, 0.8);
  for (const k of [-0.38, -0.12, 0.12, 0.38]) { g.lineBetween(x + w * k, y - h, x + w * k * 1.5, y + 10); g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + w * k * 1.5 - 1, y + 8, 2, 4); }
  if (sanded > 0) drift(g, x - w * 0.2, y + 3, w * 0.8, h * sanded, rng, true);
}

/**
 * A windcatcher tower: a tall square stack with slatted vents near the top on every face to take
 * the wind down into the rooms below, a band of tile, and a little crenellated crown.
 */
export function windTower(g: G, x: number, y: number, h: number, w: number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x - w / 2 + 2, y - h, w - 8, h);
  g.fillStyle(STONE_LIT, 0.5); g.fillRect(x - w / 2 + 2, y - h, 3, h);
  // Vents: tall dark slots with lit fins.
  const vy = y - h + 14;
  for (let i = 0; i < 3; i++) {
    const vx = x - w / 2 + 6 + i * ((w - 12) / 3);
    g.fillStyle(STONE_DEEP, 1); g.fillRect(vx, vy, (w - 12) / 3 - 3, 32);
    for (let k = 0; k < 5; k++) { g.lineStyle(1, STONE_LIT, 0.7); g.lineBetween(vx, vy + 4 + k * 6, vx + (w - 12) / 3 - 3, vy + 2 + k * 6); }
  }
  for (let k = x - w / 2; k < x + w / 2; k += 6) { g.fillStyle(((k / 6) | 0) % 2 ? TILE : COBALT, 1); g.fillRect(k, vy + 36, 6, 4); }
  for (let k = x - w / 2; k < x + w / 2 - 2; k += 8) { g.fillStyle(STONE_LIT, 1); g.fillRect(k, y - h - 6, 5, 6); }
}

/**
 * The Palace of Winds — Prince Sirocco's seat, a sandstone palace the dune is slowly taking: a
 * long arcaded facade, four windcatcher towers drinking the wind, a great ribbed dome striped in
 * saffron and indigo between them, banners of the Prince's spiral streaming east, brass gates over
 * a stair half lost in sand, and the dune banked to the window-heads on the west wing.
 */
export function palace(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x + 40, y + 8, w * 1.15, 40, 0.32);
  // The great dome behind the facade.
  const dr = w * 0.17;
  const dy = y - h - 10;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - dr - 8, dy - 28, dr * 2 + 16, 30);
  for (let i = 0; i < 10; i++) { g.fillStyle(STONE_DEEP, 1); g.fillRect(x - dr + 4 + i * (dr * 2 - 8) / 9 - 3, dy - 22, 6, 14); }
  const dTop = dy - 28;
  g.fillStyle(SIROCCO_DARK, 1); g.fillEllipse(x, dTop, dr * 2 + 6, dr * 2.1);
  g.beginPath(); g.arc(x, dTop, dr, Math.PI, 0, false); g.closePath();
  g.fillStyle(STRIPE_SAFFRON, 1); g.fillPath();
  for (let i = 0; i < 12; i++) {
    if (i % 2) continue;
    const a0 = Math.PI + (i / 12) * Math.PI, a1 = Math.PI + ((i + 1) / 12) * Math.PI;
    // A gore of indigo, swelling from base to crown.
    const gore: Pt[] = [];
    for (let s = 0; s <= 8; s++) { const k = s / 8; const a = a0 + (a1 - a0) * 0.5; const sp = (a1 - a0) * 0.5 * Math.cos(k * Math.PI * 0.5); gore.push({ x: x + Math.cos(a - sp) * dr * Math.cos(k * Math.PI * 0.5), y: dTop - Math.sin(k * Math.PI * 0.5) * dr }); }
    for (let s = 8; s >= 0; s--) { const k = s / 8; const a = a0 + (a1 - a0) * 0.5; const sp = (a1 - a0) * 0.5 * Math.cos(k * Math.PI * 0.5); gore.push({ x: x + Math.cos(a + sp) * dr * Math.cos(k * Math.PI * 0.5), y: dTop - Math.sin(k * Math.PI * 0.5) * dr }); }
    poly(g, gore, STRIPE_INDIGO);
  }
  g.fillStyle(0xffffff, 0.15); g.fillEllipse(x - dr * 0.35, dTop - dr * 0.55, dr * 0.5, dr * 0.35);
  // Spiral finial: the Prince's wind sigil in brass.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2, dTop - dr - 24, 4, 24);
  windSigil(g, x, dTop - dr - 32, 10, BRASS);
  // Windcatcher towers.
  const towers = [x0 + w * 0.08, x0 + w * 0.3, x0 + w * 0.7, x0 + w * 0.92];
  towers.forEach((tx, i) => windTower(g, tx, y - h + 10, 80 + (i % 2 ? 26 : 0), 34));
  // The facade.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 2, y - h, w - 4, h - 4);
  for (let k = x0 + 4; k < x0 + w - 4; k += 10) { g.fillStyle(((k / 10) | 0) % 2 ? STRIPE_SAFFRON : STRIPE_INDIGO, 1); g.fillRect(k, y - h + 4, 10, 5); }
  // Arcade of pointed windows, lattice-screened.
  const n = 9;
  for (let i = 0; i < n; i++) {
    const wx = x0 + ((i + 0.5) / n) * w;
    if (Math.abs(wx - x) < 60) continue;
    const ww = 26, wy = y - h + 22;
    g.fillStyle(STONE_DEEP, 1); g.fillRect(wx - ww / 2, wy + 14, ww, 44); g.fillTriangle(wx - ww / 2, wy + 15, wx + ww / 2, wy + 15, wx, wy - 4);
    g.lineStyle(1, BRASS, 0.6);
    for (let k = 0; k < 5; k++) { g.lineBetween(wx - ww / 2, wy + 16 + k * 9, wx + ww / 2, wy + 24 + k * 9); g.lineBetween(wx + ww / 2, wy + 16 + k * 9, wx - ww / 2, wy + 24 + k * 9); }
    g.lineStyle(2, TILE, 0.9); g.lineBetween(wx - ww / 2 - 3, wy + 16, wx, wy - 7); g.lineBetween(wx, wy - 7, wx + ww / 2 + 3, wy + 16);
  }
  // The gate: a tall frame with the sigil above brass doors.
  const gw = 92;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - gw / 2 - 12, y - h - 24, gw + 24, h + 24);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - gw / 2 - 8, y - h - 20, gw + 16, h + 20);
  windSigil(g, x, y - h - 4, 12, SIROCCO);
  g.fillStyle(STONE_DEEP, 1); g.fillTriangle(x - gw / 2, y - h + 46, x + gw / 2, y - h + 46, x, y - h + 10); g.fillRect(x - gw / 2, y - h + 46, gw, h - 46);
  for (const k of [-1, 1]) {
    const dx = x + k * gw / 4;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(dx - gw / 4 + 2, y - h + 48, gw / 2 - 4, h - 50);
    g.fillStyle(BRASS, 1); g.fillRect(dx - gw / 4 + 4, y - h + 50, gw / 2 - 8, h - 54);
    for (let sy = y - h + 58; sy < y - 6; sy += 12) for (let sx = dx - gw / 4 + 9; sx < dx + gw / 4 - 4; sx += 10) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(sx, sy, 1.4); }
  }
  // Banners off the outer towers, streaming east.
  for (const tx of [towers[0], towers[3]]) {
    const by = y - h - 70;
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(tx, by + 4, tx, by - 30);
    poly(g, [{ x: tx, y: by - 28 }, { x: tx + 50, y: by - 22 + Math.sin(tx) * 3 }, { x: tx + 42, y: by - 12 }, { x: tx + 54, y: by - 4 }, { x: tx, y: by - 8 }], SIROCCO);
    windSigil(g, tx + 18, by - 18, 5, SIROCCO_JEWEL);
  }
  // Stair half drowned in sand, and the dune taking the west wing to the window-heads.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x - 56 - k * 8, y - 6 + k * 4, 112 + k * 16, 5); }
  g.fillStyle(SAND, 1); g.fillEllipse(x + 40, y + 6, 60, 10);
  drift(g, x0 + w * 0.12, y + 4, w * 0.36, h * 0.85, rng, true);
  drift(g, x0 + w - 40, y + 4, 120, 30, rng, false);
}

/** The Prince's sigil: a three-armed wind spiral. */
export function windSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  for (let arm = 0; arm < 3; arm++) {
    g.lineStyle(Math.max(1.5, r * 0.22), color, a);
    g.beginPath();
    for (let s = 0; s <= 10; s++) {
      const k = s / 10;
      const ang = arm * (Math.PI * 2 / 3) + k * 2.6;
      const rr = r * (0.15 + k * 0.85);
      if (s === 0) g.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); else g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    g.strokePath();
  }
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.18);
}

/**
 * A wind-watcher's tower: a slim windcatcher with a wooden gallery, wind-vanes of cloth on a rod,
 * a brass astrolabe hung in the gallery window. Qadira reads the weather here.
 */
export function watchTower(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x + 16, y + 3, 70, 16, 0.3);
  windTower(g, x, y, 150, 40);
  // Gallery.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, y - 112, 60, 6);
  for (let k = -28; k <= 28; k += 7) { g.lineStyle(1.5, TIMBER, 1); g.lineBetween(x + k, y - 112, x + k, y - 124); }
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 30, y - 124, x + 30, y - 124);
  g.fillStyle(BRASS, 1); g.strokeCircle(x + 2, y - 92, 8); g.lineStyle(1.5, BRASS, 1); g.strokeCircle(x + 2, y - 92, 8); g.lineBetween(x - 6, y - 92, x + 10, y - 92);
  // Vane rod with cloth streamers.
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x, y - 156, x, y - 196);
  for (let i = 0; i < 3; i++) {
    const c = [STRIPE_RED, STRIPE_SAFFRON, STRIPE_INDIGO][i];
    poly(g, [{ x, y: y - 192 + i * 10 }, { x: x + 30 + rng() * 6, y: y - 190 + i * 10 }, { x, y: y - 186 + i * 10 }], c);
  }
  drift(g, x - 24, y + 3, 80, 26, rng, true);
}

// ── Fight bits ───────────────────────────────────────────────────────

/** A desert scorpion, top-down: claws forward, segmented tail arched over its back, sting amber. */
export function scorpion(g: G, x: number, y: number, a: number, s: number, t: number): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const L = (fx: number, fy: number) => ({ x: x + ca * fx - sa * fy, y: y + sa * fx + ca * fy });
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 2, y + 3, 20 * s, 10 * s);
  // Legs, scuttling.
  for (let i = 0; i < 4; i++) {
    for (const k of [-1, 1]) {
      const wig = Math.sin(t / 50 + i + k) * 2 * s;
      const b = L(-2 + i * 3 * s, k * 3 * s), e = L(-4 + i * 3 * s + wig, k * 10 * s);
      g.lineStyle(1.3, CHITIN, 1); g.lineBetween(b.x, b.y, e.x, e.y);
    }
  }
  // Body.
  const c = L(0, 0);
  g.fillStyle(CHITIN, 1); g.fillEllipse(c.x, c.y, 13 * s, 13 * s);
  g.fillStyle(lit(CHITIN, 0.2), 1); g.fillCircle(L(2 * s, -1).x, L(2 * s, -1).y, 3 * s);
  // Claws.
  for (const k of [-1, 1]) {
    const arm = L(8 * s, k * 5 * s), claw = L(14 * s, k * 6 * s);
    g.lineStyle(2 * s, CHITIN, 1); g.lineBetween(c.x, c.y, arm.x, arm.y); g.lineBetween(arm.x, arm.y, claw.x, claw.y);
    g.fillStyle(CHITIN, 1); g.fillCircle(claw.x, claw.y, 3 * s);
  }
  // Tail: segments curling back over the body.
  let prev = L(-6 * s, 0);
  for (let i = 1; i <= 5; i++) {
    const f = i / 5;
    const p = L(-6 * s - Math.sin(f * Math.PI * 0.8) * 10 * s, Math.sin(t / 200) * f * 2);
    g.fillStyle(CHITIN, 1); g.fillCircle(p.x, p.y - f * 8 * s, (3.5 - f * 1.2) * s);
    prev = { x: p.x, y: p.y - f * 8 * s };
  }
  g.fillStyle(VENOM, 1); g.fillCircle(prev.x + ca * 3 * s, prev.y + sa * 3 * s, 2 * s);
}

/** A buried-treasure urn: a round-bellied jar sealed with wax, glazed, maybe gilt. */
export function urn(g: G, x: number, y: number, s: number, glaze: number, gilt: boolean): void {
  g.fillStyle(dim(glaze, 0.35), 1); g.fillCircle(x, y - 9 * s, 10 * s);
  g.fillStyle(glaze, 1); g.fillCircle(x - 1, y - 10 * s, 8.5 * s);
  g.fillStyle(dim(glaze, 0.35), 1); g.fillRect(x - 4 * s, y - 22 * s, 8 * s, 5 * s);
  g.fillStyle(0xb8342a, 1); g.fillEllipse(x, y - 22 * s, 10 * s, 4 * s);
  g.fillStyle(lit(glaze, 0.5), 0.6); g.fillEllipse(x - 4 * s, y - 13 * s, 3 * s, 5 * s);
  if (gilt) { g.lineStyle(1.5 * s, BRASS_LIT, 1); g.lineBetween(x - 9 * s, y - 9 * s, x + 9 * s, y - 9 * s); }
}

/**
 * A sandworm's maw breaking the surface: a ring of sand flung outward, the round mouth lined with
 * rows of inward-pointing teeth, the gullet dark, ridged hide around the lip. `open` 0–1.
 */
export function wormMaw(g: G, x: number, y: number, r: number, open: number, t: number): void {
  const hide = 0x9a6a4a, hideDark = 0x5a3a28;
  // Spray of sand.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + t / 400;
    const d = r * (1.1 + open * 0.6);
    g.fillStyle(i % 2 ? SAND_LIT : SAND, 0.8 * (1 - open * 0.4));
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - open * 18, 4 + (i % 3));
  }
  // The body rising: a thick ridged column.
  const bh = open * r * 1.5;
  g.fillStyle(hideDark, 1); g.fillRect(x - r * 0.85, y - bh, r * 1.7, bh);
  g.fillStyle(hide, 1); g.fillRect(x - r * 0.8, y - bh, r * 1.3, bh);
  for (let k = 8; k < bh; k += 9) { g.lineStyle(1.5, hideDark, 0.8); g.lineBetween(x - r * 0.85, y - k, x + r * 0.85, y - k + 2); }
  // The maw.
  const my = y - bh;
  g.fillStyle(hideDark, 1); g.fillEllipse(x, my, r * 1.9, r * 1.1);
  g.fillStyle(0x2a0e0a, 1); g.fillEllipse(x, my, r * 1.5, r * 0.8);
  g.fillStyle(0x6a1a14, 1); g.fillEllipse(x, my + 2, r * 0.7, r * 0.35);
  for (let ring = 0; ring < 2; ring++) {
    const rr = ring ? 0.48 : 0.72;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + ring * 0.2;
      const ox = x + Math.cos(a) * r * rr, oy = my + Math.sin(a) * r * rr * 0.55;
      const ix = x + Math.cos(a) * r * (rr - 0.18), iy = my + Math.sin(a) * r * (rr - 0.18) * 0.55;
      g.fillStyle(0xf0e6c8, 1);
      g.fillTriangle(ox + Math.sin(a) * 3, oy - Math.cos(a) * 2, ox - Math.sin(a) * 3, oy + Math.cos(a) * 2, ix, iy);
    }
  }
}

/** A shark's fin of sand cutting the dune: a curved blade with a bow wave and a furrow behind. */
export function sandFin(g: G, x: number, y: number, a: number, s: number, t: number): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  // Furrow and bow wave.
  for (let i = 1; i < 6; i++) {
    g.fillStyle(SAND_DARK, 0.3 * (1 - i / 6)); g.fillEllipse(x - ca * i * 12 * s, y - sa * i * 12 * s, 26 * s, 10 * s);
  }
  for (const k of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const ph = (t / 300 + i / 4) % 1;
      g.fillStyle(SAND_LIT, 0.7 * (1 - ph));
      g.fillCircle(x + ca * 10 * s - sa * k * (8 + ph * 16) * s, y + sa * 10 * s + ca * k * (8 + ph * 16) * s, 3 * s);
    }
  }
  // The fin itself (always upright on screen, swept back from the way it goes).
  const back = ca >= 0 ? -1 : 1;
  poly(g, [{ x: x - 12 * s, y: y }, { x: x + 12 * s, y }, { x: x + back * 6 * s, y: y - 34 * s }], SIROCCO_DARK);
  poly(g, [{ x: x - 9 * s, y: y - 1 }, { x: x + 4 * s, y: y - 1 }, { x: x + back * 6 * s, y: y - 32 * s }], SIROCCO);
  g.lineStyle(1.5, SIROCCO_JEWEL, 0.8); g.lineBetween(x - 4 * s, y - 6 * s, x + back * 3 * s, y - 24 * s);
}

/**
 * A fulgurite: the glass a lightning bolt leaves in sand — a branching, knobbly tube of fused
 * glass standing up out of a scorched crater, catching the light. `crack` 0–1 as it gives.
 */
export function fulgurite(g: G, x: number, y: number, s: number, crack: number, seed: number): void {
  g.fillStyle(0x3a2414, 0.5); g.fillEllipse(x, y, 40 * s, 14 * s);
  g.fillStyle(SAND_DEEP, 0.6); g.fillEllipse(x, y, 28 * s, 9 * s);
  const branches = 4;
  for (let b = 0; b < branches; b++) {
    const ang = -Math.PI / 2 + (b - (branches - 1) / 2) * 0.45 + Math.sin(seed + b) * 0.15;
    const len = (24 + ((seed * 7 + b * 13) % 10)) * s;
    let px = x, py = y;
    for (let k = 1; k <= 4; k++) {
      const nx = x + Math.cos(ang) * len * (k / 4) + Math.sin(seed * 3 + k * 2 + b) * 3 * s;
      const ny = y + Math.sin(ang) * len * (k / 4);
      g.lineStyle((5 - k) * s * 1.2, GLASS_DARK, 1); g.lineBetween(px, py, nx, ny);
      g.lineStyle((4 - k) * s, GLASS, 1); g.lineBetween(px - 1, py, nx - 1, ny);
      g.fillStyle(GLASS_LIT, 0.8); g.fillCircle(nx - 1, ny, 1.2 * s);
      px = nx; py = ny;
    }
  }
  if (crack > 0) {
    g.lineStyle(1.2, 0xffffff, 0.4 + crack * 0.6);
    for (let i = 0; i < 5; i++) { const a = seed + i * 1.3; g.lineBetween(x, y - 10 * s, x + Math.cos(a) * 14 * s * crack, y - 10 * s + Math.sin(a) * 12 * s * crack); }
    glow(g, x, y - 12 * s, 18 * s, GLASS_LIT, 0.05 * crack, 3);
  }
}

/** A quicksand pool's swirl: rings of wet sand spiralling inward, bubbles of air breaking. */
export function quicksand(g: G, x: number, y: number, r: number, t: number, seed: number, danger = 0): void {
  g.fillStyle(FLOW_DARK, 0.85); g.fillEllipse(x, y, r * 2, r * 1.5);
  g.fillStyle(FLOW, 0.9); g.fillEllipse(x, y - 2, r * 1.8, r * 1.3);
  for (let k = 0; k < 4; k++) {
    const rr = r * (0.9 - k * 0.2);
    const a0 = t * (0.6 + k * 0.25) + seed + k;
    g.lineStyle(2, k % 2 ? FLOW_LIT : FLOW_DARK, 0.6);
    g.beginPath(); g.arc(x, y, rr, a0, a0 + Math.PI * 1.2, false); g.strokePath();
  }
  g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x, y, r * 0.3, r * 0.22);
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.7 + i / 3 + seed) % 1;
    const a = seed * 5 + i * 2.1;
    g.lineStyle(1.2, FLOW_LIT, 0.7 * (1 - ph));
    g.strokeCircle(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.35, 2 + ph * 5);
  }
  if (danger > 0) { g.lineStyle(2, 0x6a1a14, 0.3 + danger * 0.4); g.strokeEllipse(x, y, r * 2, r * 1.5); }
}

/** A sand collar round a sinking fighter's middle: heaped higher as they go down. */
export function sinkCollar(g: G, x: number, y: number, depth: number): void {
  const h = 4 + depth * 22;
  g.fillStyle(FLOW_DARK, 0.95); g.fillEllipse(x, y + 12, 52, 18);
  g.fillStyle(FLOW, 1); g.fillEllipse(x, y + 12 - h * 0.4, 48, 10 + h * 0.4);
  g.fillStyle(FLOW_LIT, 0.7); g.fillEllipse(x - 6, y + 8 - h * 0.6, 26, 5);
  g.fillStyle(FLOW, 1); g.fillRect(x - 22, y + 12 - h, 44, h);
  g.fillStyle(FLOW_LIT, 0.8); g.fillEllipse(x, y + 12 - h, 44, 8);
}
