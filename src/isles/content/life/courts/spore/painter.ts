import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { G, blob, dim, groundFill, lit, motes, mulberry, shadow, stroke } from '../../../../art/IsleArt';
import {
  BOG, BOG_DEEP, BOG_SHEEN, CAP_RED, CAP_RED_LIT, CAP_TAN, CAP_TAN_LIT, CAP_VIOLET, CAP_VIOLET_LIT, GILL, GLOW,
  GLOW_DEEP, GLOW_WASH, MOSS, MOSS_DARK, MOSS_LIT, PEAT, PEAT_DARK, PEAT_LIT, PLANK, PLANK_DARK, PLANK_LIT, ROT,
  ROT_LIT, SEDGE, SPORE, SPOT, STEM, STEM_SHADE, WISP,
} from './palette';
import {
  AREA_H, AREA_W, FEN, GREEN, HOUSES, JETTY, LAMPS, LEA, LODE, LODE_BRIDGES, MANOR, MERE, MushHouse, PITS, ROADS,
  SCALES, SHOP, SNAGS, WALL_N, WALL_SEGMENTS, YARD,
} from './layout';
import { along, fairyRing, glowcaps, hyphaPoints, inView, polyline, puffball, toadstool } from './sporeArt';

/**
 * The Spore Court — a fungal bog town at the bottom of the night.
 *
 * Nothing here is drawn like anywhere else on the isles:
 * • The ground is black peat and cushion-moss, and the town walks on rotten boardwalks on posts
 *   rather than streets — planks laid crosswise, some missing.
 * • Water is dead black bog with an oily green skin and marsh gas belching up through it; the
 *   Black Lode cuts the town in two and the Black Mere lies under the mushroom wood.
 * • Every house is a giant mushroom: the stem is the house (door, round windows, a stovepipe),
 *   the cap its roof. Caps are fly-agaric red, bruise-violet or penny-bun tan.
 * • The only bright colour is glowcap teal: lamps of caged glowcaps, and the Prince's threads,
 *   which run out from the Mycelarium under every single house in town and pulse with what they
 *   carry home. The Tithe Green before his door is one great fairy ring.
 */

const CAPS: [number, number][] = [[CAP_RED, CAP_RED_LIT], [CAP_VIOLET, CAP_VIOLET_LIT], [CAP_TAN, CAP_TAN_LIT]];

/** The threads from the Mycelarium's foot to every house in town (and the Yard). */
const THREADS: Pt[][] = (() => {
  const from = { x: MANOR.x, y: MANOR.y + 10 };
  const out = HOUSES.map((h, i) => hyphaPoints(from, { x: h.x, y: h.y + 6 }, i * 7 + 1, 16));
  out.push(hyphaPoints(from, { x: YARD.x, y: YARD.y }, 91, 12));
  out.push(hyphaPoints(from, { x: SHOP.x, y: SHOP.y + 6 }, 93, 14));
  out.push(hyphaPoints(from, { x: SCALES.x, y: SCALES.y + 6 }, 97, 8));
  return out;
})();

/** Lode stretches between bridges, for ripples. */
const LODE_RECTS: Rect[] = (() => {
  const out: Rect[] = [];
  let x = 0;
  for (const b of LODE_BRIDGES) { out.push({ x, y: LODE.y, w: b.x0 - x, h: LODE.h }); x = b.x1; }
  out.push({ x, y: LODE.y, w: AREA_W - x, h: LODE.h });
  return out;
})();

// ── Ground ──────────────────────────────────────────────────────────────

/** Black water with a lumpy moss rim, an oily sheen and floating weed. */
function bogWater(g: G, r: Rect, rng: () => number, round: number): void {
  g.fillStyle(MOSS_DARK, 1); g.fillRoundedRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20, round + 8);
  for (let x = r.x; x < r.x + r.w; x += 28) {
    blob(g, x + rng() * 20, r.y - 4, 18, 8, MOSS, 0.9, rng, 7);
    blob(g, x + rng() * 20, r.y + r.h + 4, 18, 8, MOSS, 0.9, rng, 7);
  }
  g.fillStyle(BOG_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, round);
  g.fillStyle(BOG, 1); g.fillRoundedRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, Math.max(4, round - 6));
  for (let i = 0; i < (r.w * r.h) / 2600; i++) {
    g.fillStyle(BOG_SHEEN, 0.3 + rng() * 0.25);
    g.fillEllipse(r.x + 16 + rng() * (r.w - 32), r.y + 12 + rng() * (r.h - 24), 20 + rng() * 50, 3 + rng() * 4);
  }
  // Duckweed rafts and a few lily-like bog-bean leaves.
  for (let i = 0; i < (r.w * r.h) / 9000; i++) {
    const x = r.x + 20 + rng() * (r.w - 40), y = r.y + 14 + rng() * (r.h - 28);
    g.fillStyle(MOSS_LIT, 0.55);
    for (let k = 0; k < 5; k++) g.fillCircle(x + (rng() - 0.5) * 16, y + (rng() - 0.5) * 6, 1.6 + rng() * 1.5);
  }
  // Sedge along the banks.
  for (let x = r.x; x < r.x + r.w; x += 16 + rng() * 22) {
    for (const y of [r.y - 6, r.y + r.h + 8]) {
      g.lineStyle(2, SEDGE, 0.85);
      for (let k = 0; k < 3; k++) g.lineBetween(x + k * 3, y, x + k * 3 + (rng() - 0.5) * 8, y - 12 - rng() * 12);
    }
  }
}

/** A boardwalk along a road: posts, then planks laid crosswise, some rotted out. */
function boardwalk(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 8, PEAT_DARK, 0.7);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1) continue;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    // The two runners underneath.
    for (const side of [-0.38, 0.38]) {
      g.lineStyle(4, PLANK_DARK, 1);
      g.lineBetween(a.x + nx * w * side, a.y + ny * w * side, b.x + nx * w * side, b.y + ny * w * side);
    }
    for (let d = 0; d < len; d += 11) {
      if (rng() < 0.05) continue;
      const cx = a.x + ux * d, cy = a.y + uy * d;
      const half = w / 2 - rng() * 3;
      const c = rng() < 0.12 ? PLANK_DARK : rng() < 0.5 ? PLANK : dim(PLANK, 0.1);
      g.lineStyle(9, c, 1);
      g.lineBetween(cx - nx * half, cy - ny * half, cx + nx * half, cy + ny * half);
      g.lineStyle(1, PLANK_LIT, 0.35);
      g.lineBetween(cx - nx * half - ux * 3, cy - ny * half - uy * 3, cx + nx * half - ux * 3, cy + ny * half - uy * 3);
      if (rng() < 0.06) { g.fillStyle(MOSS, 0.7); g.fillCircle(cx + nx * (rng() - 0.5) * w, cy + ny * (rng() - 0.5) * w, 3); }
    }
    for (let d = 0; d < len; d += 80) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      for (const side of [-1, 1]) { g.fillStyle(PLANK_DARK, 1); g.fillCircle(cx + nx * (w / 2 + 3) * side, cy + ny * (w / 2 + 3) * side, 3.5); }
    }
  }
}

function lodeBridge(g: G, x0: number, x1: number): void {
  const y0 = LODE.y - 16, y1 = LODE.y + LODE.h + 16;
  g.fillStyle(0x000000, 0.4); g.fillRect(x0 + 4, y0 + 6, x1 - x0, y1 - y0);
  for (let y = y0; y < y1; y += 11) {
    g.fillStyle((y / 11) % 5 === 0 ? PLANK_DARK : PLANK, 1); g.fillRect(x0, y, x1 - x0, 9);
    g.fillStyle(PLANK_LIT, 0.3); g.fillRect(x0, y, x1 - x0, 2);
  }
  // Rope rails on posts.
  for (const x of [x0 + 3, x1 - 3]) {
    for (let y = y0; y <= y1; y += 34) { g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 3, y - 4, 6, 10); }
    g.lineStyle(2, SEDGE, 0.8); g.lineBetween(x, y0, x, y1);
  }
}

function theGreen(g: G, rng: () => number): void {
  blob(g, GREEN.x, GREEN.y, GREEN.r + 50, GREEN.r * 0.72 + 36, MOSS_DARK, 1, rng, 14);
  blob(g, GREEN.x, GREEN.y, GREEN.r + 34, GREEN.r * 0.72 + 24, MOSS, 1, rng, 14);
  for (let i = 0; i < 160; i++) { g.fillStyle(MOSS_LIT, 0.35); g.fillCircle(GREEN.x + (rng() - 0.5) * GREEN.r * 2.2, GREEN.y + (rng() - 0.5) * GREEN.r * 1.4, 1 + rng() * 2); }
  // The burnt ring in the moss, and the great fairy ring standing on it.
  g.lineStyle(14, dim(MOSS, 0.45), 0.8); g.strokeEllipse(GREEN.x, GREEN.y, GREEN.r * 2, GREEN.r * 1.44);
  fairyRing(g, GREEN.x, GREEN.y, GREEN.r, 1, CAP_RED, 30, 0.2, 1.1);
}

function lea(g: G, rng: () => number): void {
  blob(g, LEA.x, LEA.y, LEA.rx, LEA.ry, MOSS, 0.9, rng, 12);
  blob(g, LEA.x - 10, LEA.y - 6, LEA.rx * 0.8, LEA.ry * 0.7, MOSS_LIT, 0.35, rng, 10);
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2, d = rng();
    puffball(g, LEA.x + Math.cos(a) * LEA.rx * 0.9 * d, LEA.y + Math.sin(a) * LEA.ry * 0.8 * d, 5 + rng() * 6, rng() * 0.8, i);
  }
}

function threadYard(g: G, rng: () => number): void {
  blob(g, YARD.x, YARD.y, YARD.rx, YARD.ry, PEAT_DARK, 1, rng, 12);
  for (let i = 0; i < 40; i++) {
    const a = { x: YARD.x + (rng() - 0.5) * YARD.rx * 1.8, y: YARD.y + (rng() - 0.5) * YARD.ry * 1.6 };
    const b = { x: a.x + (rng() - 0.5) * 140, y: a.y + (rng() - 0.5) * 80 };
    g.lineStyle(1.2, GLOW_DEEP, 0.6); polyline(g, hyphaPoints(a, b, i, 6));
  }
  for (let i = 0; i < 8; i++) glowcaps(g, YARD.x + (rng() - 0.5) * YARD.rx * 1.6, YARD.y + (rng() - 0.5) * YARD.ry * 1.4, 4 + rng() * 3, 0.8, i);
}

function wispFen(g: G, rng: () => number): void {
  blob(g, FEN.x, FEN.y, FEN.rx, FEN.ry, PEAT_DARK, 1, rng, 14);
  for (let i = 0; i < 9; i++) {
    const x = FEN.x + (rng() - 0.5) * FEN.rx * 1.7, y = FEN.y + (rng() - 0.5) * FEN.ry * 1.4;
    blob(g, x, y, 22 + rng() * 26, 8 + rng() * 8, BOG, 0.95, rng, 8);
    g.fillStyle(BOG_SHEEN, 0.4); g.fillEllipse(x - 4, y - 2, 18, 3);
  }
  for (let i = 0; i < 26; i++) {
    const x = FEN.x + (rng() - 0.5) * FEN.rx * 1.9, y = FEN.y + (rng() - 0.5) * FEN.ry * 1.6;
    g.fillStyle(MOSS, 0.9); g.fillEllipse(x, y, 16, 7);
    g.lineStyle(1.5, SEDGE, 0.9);
    for (let k = 0; k < 5; k++) g.lineBetween(x - 6 + k * 3, y, x - 8 + k * 4 + (rng() - 0.5) * 6, y - 14 - rng() * 10);
  }
}

function rotPits(g: G, rng: () => number): void {
  for (const p of PITS) {
    blob(g, p.x, p.y, p.r + 16, (p.r + 16) * 0.7, ROT, 0.6, rng, 10);
    g.fillStyle(PEAT_DARK, 1); g.fillEllipse(p.x, p.y, p.r * 2, p.r * 1.35);
    g.fillStyle(ROT, 0.9); g.fillEllipse(p.x, p.y + 4, p.r * 1.6, p.r * 0.95);
    // Heaped windfall: logs, leaves — and things it is better not to look at.
    for (let i = 0; i < 9; i++) {
      g.fillStyle(rng() < 0.4 ? ROT_LIT : rng() < 0.5 ? CAP_TAN : PEAT_LIT, 0.8);
      g.fillEllipse(p.x + (rng() - 0.5) * p.r * 1.3, p.y + (rng() - 0.5) * p.r * 0.7, 8 + rng() * 14, 4 + rng() * 6);
    }
    g.lineStyle(1, STEM, 0.4);
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2;
      g.lineBetween(p.x + Math.cos(a) * p.r * 0.6, p.y + Math.sin(a) * p.r * 0.4, p.x + Math.cos(a) * p.r * 1.2, p.y + Math.sin(a) * p.r * 0.8);
    }
    toadstool(g, p.x + p.r * 0.7, p.y - p.r * 0.2, 7, ROT_LIT, false, 1, 3);
  }
}

// ── Set pieces ──────────────────────────────────────────────────────────

/** The upper half of an ellipse filled — a cap's dome. */
function dome(g: G, cx: number, cy: number, rx: number, ry: number): void {
  g.beginPath();
  g.moveTo(cx - rx, cy);
  for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI; g.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
  g.closePath(); g.fillPath();
}

function capWithSpots(g: G, cx: number, cy: number, rx: number, ry: number, kind: 0 | 1 | 2, rng: () => number): void {
  const [c, cl] = CAPS[kind];
  g.fillStyle(GILL, 1); g.fillEllipse(cx, cy + 2, rx * 2, ry * 0.36);
  g.fillStyle(dim(GILL, 0.3), 1);
  for (let i = 0; i < 18; i++) { const x = cx - rx * 0.9 + (i / 17) * rx * 1.8; g.fillRect(x, cy - 1, 1, ry * 0.12); }
  g.fillStyle(dim(c, 0.4), 1); dome(g, cx, cy, rx, ry);
  g.fillStyle(c, 1); dome(g, cx - rx * 0.04, cy - 2, rx * 0.93, ry * 0.92);
  g.fillStyle(cl, 0.55); g.fillEllipse(cx - rx * 0.35, cy - ry * 0.62, rx * 0.6, ry * 0.25);
  if (kind === 0) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + 0.3 + rng() * (Math.PI - 0.6), d = 0.3 + rng() * 0.55;
      g.fillStyle(SPOT, 0.92); g.fillEllipse(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rx * 0.14, ry * 0.1);
    }
  } else if (kind === 1) {
    // Violet caps are scaly: little darker chevrons.
    g.lineStyle(1.5, dim(c, 0.3), 0.8);
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + 0.35 + rng() * (Math.PI - 0.7), d = 0.25 + rng() * 0.6;
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      g.lineBetween(x - 4, y + 2, x, y - 1); g.lineBetween(x, y - 1, x + 4, y + 2);
    }
  } else {
    // Tan caps crack in the dry.
    g.lineStyle(1, dim(c, 0.35), 0.7);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + 0.4 + rng() * (Math.PI - 0.8);
      g.lineBetween(cx + Math.cos(a) * rx * 0.4, cy + Math.sin(a) * ry * 0.4, cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.85);
    }
  }
}

function drawHouse(g: G, h: MushHouse, rng: () => number): void {
  const sw = h.cap * 0.62;
  shadow(g, h.x, h.y, h.cap * 1.6, 18, 0.4);
  // The stem: a cream tower, wider at the foot, the shaded side right.
  g.fillStyle(STEM_SHADE, 1);
  g.fillTriangle(h.x - sw / 2 - 8, h.y, h.x + sw / 2 + 8, h.y, h.x, h.y - 30);
  g.fillRoundedRect(h.x - sw / 2, h.y - h.h, sw, h.h, 10);
  g.fillStyle(STEM, 1); g.fillRoundedRect(h.x - sw / 2, h.y - h.h, sw * 0.7, h.h, 10);
  // Striations up the stem.
  g.lineStyle(1, STEM_SHADE, 0.6);
  for (let i = 1; i < 5; i++) g.lineBetween(h.x - sw / 2 + (i / 5) * sw, h.y - 6, h.x - sw / 2 + (i / 5) * sw + 2, h.y - h.h + 10);
  // The skirt (annulus) under the cap, hanging.
  g.fillStyle(STEM_SHADE, 1); g.fillEllipse(h.x, h.y - h.h + 14, sw * 1.35, 14);
  g.fillStyle(STEM, 1); g.fillEllipse(h.x - 2, h.y - h.h + 12, sw * 1.2, 9);
  // Round plank door, a step, round windows lit from inside.
  g.fillStyle(PLANK_DARK, 1); g.fillEllipse(h.x - 2, h.y - 2, 32, 8);
  g.fillStyle(PLANK_DARK, 1); g.fillRoundedRect(h.x - 12, h.y - 38, 22, 36, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.fillStyle(PLANK, 1); g.fillRoundedRect(h.x - 10, h.y - 36, 18, 34, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.lineStyle(1, PLANK_DARK, 1); g.lineBetween(h.x - 1, h.y - 36, h.x - 1, h.y - 2);
  g.fillStyle(SPORE, 1); g.fillCircle(h.x + 4, h.y - 18, 1.6);
  const wins = h.h > 100 ? 2 : 1;
  for (let i = 0; i < wins; i++) {
    const wy = h.y - 58 - i * 34, wx = h.x + (i % 2 ? 8 : -6);
    g.fillStyle(PLANK_DARK, 1); g.fillCircle(wx, wy, 8);
    g.fillStyle(rng() < 0.3 ? GLOW : 0xffc870, 0.9); g.fillCircle(wx, wy, 6);
    g.lineStyle(1, PLANK_DARK, 1); g.lineBetween(wx - 6, wy, wx + 6, wy); g.lineBetween(wx, wy - 6, wx, wy + 6);
  }
  // A ladder up one side, and the stovepipe poking out under the cap.
  if (h.x % 3 === 0) {
    g.lineStyle(2, PLANK, 1);
    g.lineBetween(h.x + sw / 2 + 4, h.y, h.x + sw / 2 - 2, h.y - h.h * 0.7);
    g.lineBetween(h.x + sw / 2 + 12, h.y, h.x + sw / 2 + 6, h.y - h.h * 0.7);
    for (let k = 1; k < 6; k++) { const yy = h.y - (k / 6) * h.h * 0.7; g.lineBetween(h.x + sw / 2 + 4 - k, yy, h.x + sw / 2 + 12 - k, yy); }
  }
  g.fillStyle(0x3a3530, 1); g.fillRect(h.x + sw * 0.3, h.y - h.h - 6, 7, 26);
  // The cap.
  capWithSpots(g, h.x, h.y - h.h, h.cap, h.cap * 0.62, h.kind, rng);
  // A tithe tally nailed beside the door: notches for each basket weighed.
  g.fillStyle(PLANK_LIT, 1); g.fillRect(h.x - sw / 2 + 4, h.y - 34, 7, 16);
  g.lineStyle(1, PLANK_DARK, 1);
  for (let k = 0; k < 4; k++) g.lineBetween(h.x - sw / 2 + 5, h.y - 31 + k * 4, h.x - sw / 2 + 10, h.y - 31 + k * 4);
}

function drawManor(g: G, rng: () => number): void {
  const x = MANOR.x, y = MANOR.y, w = MANOR.w;
  shadow(g, x, y, w * 1.3, 44, 0.5);
  // Bracket fungi shelving up the sides, under the dome.
  for (let i = 0; i < 5; i++) {
    for (const side of [-1, 1]) {
      const bx = x + side * (w / 2 - 6), by = y - 30 - i * 44;
      g.fillStyle(dim(CAP_TAN, 0.2), 1); g.fillEllipse(bx + side * 18, by, 64, 18);
      g.fillStyle(CAP_TAN_LIT, 0.6); g.fillEllipse(bx + side * 14, by - 3, 44, 7);
    }
  }
  // The puffball dome: a great cream globe, pebbled.
  const dy = y - 120;
  g.fillStyle(STEM_SHADE, 1); g.fillEllipse(x, dy, w, 250);
  g.fillStyle(STEM, 1); g.fillEllipse(x - 12, dy - 10, w * 0.92, 228);
  g.fillStyle(0xfffaee, 0.5); g.fillEllipse(x - 70, dy - 70, 140, 50);
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
    g.fillStyle(STEM_SHADE, 0.6); g.fillCircle(x + Math.cos(a) * w * 0.44 * d, dy + Math.sin(a) * 115 * d, 1.5 + rng() * 2);
  }
  // A tall stem out of the crown to a parasol cap — the Prince's roof.
  g.fillStyle(STEM_SHADE, 1); g.fillRect(x - 24, y - 400, 48, 170);
  g.fillStyle(STEM, 1); g.fillRect(x - 24, y - 400, 32, 170);
  g.fillStyle(STEM_SHADE, 1); g.fillEllipse(x, y - 360, 90, 20);
  capWithSpots(g, x, y - 400, 160, 70, 1, rng);
  g.fillStyle(GLOW, 0.4); g.fillEllipse(x, y - 396, 300, 10);
  // Round windows glowing teal, ringed round the dome.
  for (const [wx, wy] of [[x - 120, dy - 20], [x - 60, dy - 70], [x + 60, dy - 70], [x + 120, dy - 20], [x, dy - 90]] as const) {
    g.fillStyle(PLANK_DARK, 1); g.fillCircle(wx, wy, 15);
    g.fillStyle(GLOW, 0.9); g.fillCircle(wx, wy, 12);
    g.fillStyle(GLOW_WASH, 0.6); g.fillCircle(wx - 3, wy - 3, 4);
  }
  // The door: an arch hung with a curtain of gill, glowing between the folds.
  g.fillStyle(PEAT_DARK, 1); g.fillRoundedRect(x - 46, y - 110, 92, 110, { tl: 46, tr: 46, bl: 0, br: 0 });
  for (let i = 0; i < 12; i++) {
    const gx = x - 40 + i * 7.3;
    g.fillStyle(i % 2 ? GILL : dim(GILL, 0.3), 1); g.fillRect(gx, y - 100 + Math.abs(i - 5.5) * 3, 6, 100 - Math.abs(i - 5.5) * 3);
    g.fillStyle(GLOW, 0.4); g.fillRect(gx + 5, y - 90 + Math.abs(i - 5.5) * 3, 1.5, 88 - Math.abs(i - 5.5) * 3);
  }
  // Steps of shelf-fungus up to the door.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? CAP_TAN : dim(CAP_TAN, 0.2), 1); g.fillEllipse(x, y + 4 - k * 6, 130 - k * 22, 14); }
}

function drawShop(g: G, rng: () => number): void {
  const x = SHOP.x, y = SHOP.y;
  shadow(g, x, y, 260, 24, 0.4);
  // Three mushrooms grown into one: a tall violet one in the middle, two tans either side.
  const parts: { dx: number; sw: number; h: number; cap: number; kind: 0 | 1 | 2 }[] = [
    { dx: -70, sw: 40, h: 80, cap: 52, kind: 2 }, { dx: 70, sw: 40, h: 72, cap: 48, kind: 0 }, { dx: 0, sw: 56, h: 128, cap: 78, kind: 1 },
  ];
  for (const p of parts) {
    g.fillStyle(STEM_SHADE, 1); g.fillRoundedRect(x + p.dx - p.sw / 2, y - p.h, p.sw, p.h, 8);
    g.fillStyle(STEM, 1); g.fillRoundedRect(x + p.dx - p.sw / 2, y - p.h, p.sw * 0.7, p.h, 8);
    capWithSpots(g, x + p.dx, y - p.h, p.cap, p.cap * 0.6, p.kind, rng);
  }
  // The counter: a plank on two stumps, jars on it.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 96, y - 30, 192, 8);
  g.fillStyle(PLANK, 1); g.fillRect(x - 96, y - 32, 192, 5);
  for (const sx of [x - 80, x + 80]) { g.fillStyle(PLANK_DARK, 1); g.fillRect(sx - 6, y - 24, 12, 24); }
  const jar = [GLOW, SPORE, ROT_LIT, WISP, CAP_RED_LIT, GLOW];
  for (let i = 0; i < 6; i++) {
    const jx = x - 78 + i * 31;
    g.fillStyle(0x24302c, 0.9); g.fillRoundedRect(jx - 7, y - 50, 14, 18, 3);
    g.fillStyle(jar[i], 0.8); g.fillRoundedRect(jx - 5, y - 44, 10, 11, 2);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(jx - 6, y - 53, 12, 4);
  }
  // A hanging sign with a painted cap on it.
  g.lineStyle(1.5, SEDGE, 1); g.lineBetween(x - 20, y - 108, x - 20, y - 90); g.lineBetween(x + 20, y - 108, x + 20, y - 90);
  g.fillStyle(PLANK, 1); g.fillRoundedRect(x - 30, y - 92, 60, 26, 4);
  g.lineStyle(1.5, PLANK_DARK, 1); g.strokeRoundedRect(x - 30, y - 92, 60, 26, 4);
  toadstool(g, x, y - 70, 9, CAP_VIOLET, true, 1, 5);
}

function drawScales(g: G): void {
  const x = SCALES.x, y = SCALES.y;
  shadow(g, x, y, 90, 16, 0.4);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 5, y - 92, 10, 92);
  g.fillStyle(PLANK, 1); g.fillRect(x - 3, y - 92, 5, 92);
  // The beam, tipped toward the Empress's pan.
  g.lineStyle(5, PLANK_DARK, 1); g.lineBetween(x - 58, y - 82, x + 58, y - 96);
  g.fillStyle(SPORE, 1); g.fillCircle(x, y - 89, 5);
  for (const [px, py, heavy] of [[x - 58, y - 82, false], [x + 58, y - 96, true]] as const) {
    g.lineStyle(1, SEDGE, 1);
    g.lineBetween(px, py, px - 16, py + 34); g.lineBetween(px, py, px + 16, py + 34);
    g.fillStyle(0x6d5a3a, 1); g.fillEllipse(px, py + 36, 40, 10);
    if (heavy) {
      // The Empress's pan: a lead weight with a rose stamped on it.
      g.fillStyle(0x4a4a50, 1); g.fillRect(px - 8, py + 22, 16, 13);
      g.fillStyle(CAP_RED, 1); g.fillCircle(px, py + 28, 3);
    } else {
      for (let k = 0; k < 4; k++) toadstool(g, px - 12 + k * 8, py + 36, 5, CAPS[k % 3][0], k % 3 === 0, 1, k);
    }
  }
  // Baskets waiting their turn.
  for (const bx of [x - 40, x + 34]) {
    g.fillStyle(0x7a5a34, 1); g.fillRoundedRect(bx - 12, y - 14, 24, 14, 4);
    g.lineStyle(1, PLANK_DARK, 1); g.lineBetween(bx - 12, y - 7, bx + 12, y - 7);
    toadstool(g, bx - 3, y - 12, 5, CAP_TAN, false, 1, 2); toadstool(g, bx + 5, y - 12, 4, CAP_RED, true, 1, 3);
  }
}

function drawWallSegment(g: G, i: number, rng: () => number): void {
  const sw = AREA_W / WALL_SEGMENTS;
  const x0 = i * sw;
  g.fillStyle(PEAT_DARK, 1); g.fillRect(x0, 0, sw + 2, WALL_N);
  // Giant stems shoulder to shoulder, caps at every height, the back ones darker.
  for (let k = 0; k < 4; k++) {
    const x = x0 + rng() * sw, h = 120 + rng() * 120, cap = 50 + rng() * 50;
    const back = k < 2;
    const shade = back ? 0.55 : 0.2;
    g.fillStyle(dim(STEM_SHADE, shade), 1); g.fillRect(x - cap * 0.22, WALL_N - h, cap * 0.44, h);
    g.fillStyle(dim(STEM, shade), 1); g.fillRect(x - cap * 0.22, WALL_N - h, cap * 0.3, h);
    const kind = Math.floor(rng() * 3) as 0 | 1 | 2;
    const [c] = CAPS[kind];
    g.fillStyle(dim(c, shade + 0.15), 1); dome(g, x, WALL_N - h, cap, cap * 0.55);
    g.fillStyle(dim(c, shade), 1); dome(g, x - 3, WALL_N - h - 2, cap * 0.92, cap * 0.5);
    if (kind === 0) for (let s = 0; s < 5; s++) { g.fillStyle(dim(SPOT, shade), 1); g.fillEllipse(x + (rng() - 0.5) * cap * 1.2, WALL_N - h - rng() * cap * 0.4, 8, 5); }
  }
  // Glowcaps in the litter at the foot.
  glowcaps(g, x0 + rng() * sw, WALL_N + 4, 5, 0.9, i);
  g.fillStyle(MOSS_DARK, 1); g.fillRect(x0, WALL_N - 8, sw + 2, 12);
}

function drawLamp(g: G, x: number, y: number, i: number): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 2, y - 64, 4, 64);
  g.lineStyle(2, PLANK_DARK, 1); g.lineBetween(x, y - 64, x + 12, y - 66);
  // A wicker cage of glowcaps hung off the arm.
  g.lineStyle(1, SEDGE, 1); g.lineBetween(x + 12, y - 66, x + 12, y - 58);
  glowcaps(g, x + 12, y - 42, 4, 1, i);
  g.lineStyle(1, PLANK, 0.9); g.strokeRoundedRect(x + 4, y - 58, 16, 18, 5);
}

function drawSnag(g: G, p: Pt, rng: () => number): void {
  shadow(g, p.x, p.y, 40, 10);
  g.lineStyle(10, 0x2a2420, 1); g.lineBetween(p.x, p.y, p.x + 4, p.y - 150);
  g.lineStyle(5, 0x2a2420, 1);
  for (let i = 0; i < 4; i++) {
    const hy = p.y - 70 - i * 22, dir = i % 2 ? 1 : -1;
    g.lineBetween(p.x + 2, hy, p.x + dir * (26 + rng() * 22), hy - 18 - rng() * 16);
  }
  for (let i = 0; i < 4; i++) {
    const by = p.y - 30 - i * 26, dir = i % 2 ? 1 : -1;
    g.fillStyle(CAP_TAN, 1); g.fillEllipse(p.x + dir * 10, by, 24, 8);
    g.fillStyle(CAP_TAN_LIT, 0.6); g.fillEllipse(p.x + dir * 9, by - 2, 16, 3);
  }
  // Moss hanging in beards off the branches.
  for (let i = 0; i < 3; i++) { g.lineStyle(2, SEDGE, 0.7); g.lineBetween(p.x - 20 + i * 18, p.y - 100 + i * 8, p.x - 22 + i * 18, p.y - 76 + i * 8); }
}

// ── Painter ─────────────────────────────────────────────────────────────

export const SPORE_PAINTER: AreaPainter = {
  ground(g, rng) {
    groundFill(g, { x: 0, y: 0, w: AREA_W, h: AREA_H }, PEAT, PEAT_LIT, SPORE, rng, 1.2);
    for (let i = 0; i < 90; i++) {
      const x = rng() * AREA_W, y = WALL_N + rng() * (AREA_H - WALL_N);
      const r = 20 + rng() * 60;
      blob(g, x, y, r, r * 0.5, MOSS_DARK, 0.7, rng);
      blob(g, x - 3, y - 2, r * 0.75, r * 0.38, MOSS, 0.55, rng);
    }
    // Puddles of black water in the low places.
    for (let i = 0; i < 30; i++) {
      const x = rng() * AREA_W, y = WALL_N + 40 + rng() * (AREA_H - WALL_N - 40);
      blob(g, x, y, 14 + rng() * 26, 6 + rng() * 10, BOG, 0.85, rng, 8);
    }
    // The Prince's threads, under everything: from his foot to every door.
    for (const t of THREADS) { g.lineStyle(7, GLOW_DEEP, 0.08); polyline(g, t); g.lineStyle(1.5, GLOW_DEEP, 0.55); polyline(g, t); }
    // Districts.
    lea(g, rng);
    threadYard(g, rng);
    wispFen(g, rng);
    rotPits(g, rng);
    theGreen(g, rng);
    // Water.
    bogWater(g, { x: 0, y: LODE.y, w: AREA_W, h: LODE.h }, rng, 10);
    bogWater(g, MERE, rng, 60);
    // Boardwalks, bridges and the jetty over everything else.
    for (const r of ROADS) boardwalk(g, r, r === ROADS[8] ? 30 : r === ROADS[9] ? 24 : 40, rng);
    for (const b of LODE_BRIDGES) lodeBridge(g, b.x0, b.x1);
    g.fillStyle(0x000000, 0.4); g.fillRect(JETTY.x - 30, JETTY.y + 4, JETTY.w + 30, JETTY.h);
    for (let x = JETTY.x - 30; x < JETTY.x + JETTY.w; x += 10) { g.fillStyle(PLANK, 1); g.fillRect(x, JETTY.y, 8, JETTY.h); }
    for (const px of [JETTY.x - 26, JETTY.x + 10]) { g.fillStyle(PLANK_DARK, 1); g.fillCircle(px, JETTY.y + JETTY.h + 2, 4); }
    // Glowcap tufts in the moss about the town.
    for (let i = 0; i < 46; i++) {
      const x = 40 + rng() * (AREA_W - 80), y = WALL_N + 30 + rng() * (AREA_H - WALL_N - 60);
      if (y > LODE.y - 20 && y < LODE.y + LODE.h + 20) continue;
      if (rng() < 0.5) glowcaps(g, x, y, 3 + rng() * 3, 0.7, i);
      else toadstool(g, x, y, 4 + rng() * 5, CAPS[i % 3][0], i % 3 === 0, 1, i);
    }
    // Small fairy rings out in the moss — the Green's children.
    for (const [x, y, r] of [[300, 1100, 34], [1600, 1120, 30], [2200, 560, 40], [900, 620, 28]] as const) {
      fairyRing(g, x, y, r, 1, CAP_VIOLET, 10, x, 0.7);
    }
  },

  pieces: [
    { x: MANOR.x, y: MANOR.y, w: MANOR.w + 160, h: MANOR.y - 10, draw: drawManor },
    { x: SHOP.x, y: SHOP.y, w: 300, h: 190, draw: drawShop },
    { x: SCALES.x, y: SCALES.y, w: 140, h: 120, draw: (g: G) => drawScales(g) },
    ...HOUSES.map((h) => ({ x: h.x, y: h.y, w: h.cap * 2 + 30, h: h.h + h.cap * 0.7 + 20, draw: (g: G, rng: () => number) => drawHouse(g, h, rng) })),
    ...Array.from({ length: WALL_SEGMENTS }, (_, i) => ({
      x: (i + 0.5) * (AREA_W / WALL_SEGMENTS), y: WALL_N, w: AREA_W / WALL_SEGMENTS + 110, h: WALL_N + 90,
      draw: (g: G, rng: () => number) => drawWallSegment(g, i, rng),
    })),
    ...LAMPS.map((p, i) => ({ x: p.x, y: p.y, w: 40, h: 80, draw: (g: G) => drawLamp(g, p.x, p.y, i) })),
    ...SNAGS.map((p) => ({ x: p.x, y: p.y, w: 110, h: 170, draw: (g: G, rng: () => number) => drawSnag(g, p, rng) })),
  ],

  animate(g, t, view) {
    // Ripples crawling over the bog water, and marsh gas belching up through it.
    const waters = [...LODE_RECTS, MERE];
    waters.forEach((r, wi) => {
      if (!inView(view, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) / 2 + 40)) return;
      for (let i = 0; i < Math.max(2, Math.floor(r.w / 140)); i++) {
        const x = r.x + 20 + ((i * 137 + wi * 53) % Math.max(1, r.w - 40));
        const y = r.y + 16 + ((i * 71) % Math.max(1, r.h - 32));
        const ph = (t * 0.25 + i * 0.37 + wi * 0.11) % 1;
        g.lineStyle(1, BOG_SHEEN, 0.6 * (1 - ph)); g.strokeEllipse(x, y, 10 + ph * 50, 3 + ph * 8);
        const bp = (t * 0.5 + i * 0.29 + wi * 0.2) % 1;
        if (bp < 0.3) {
          g.fillStyle(BOG_SHEEN, 0.8 * (1 - bp / 0.3)); g.fillCircle(x + 30, y, 2 + bp * 12);
          g.lineStyle(1, SEDGE, 0.5 * (1 - bp / 0.3)); g.strokeCircle(x + 30, y, 2 + bp * 14);
        }
      }
    });
    // Pulses running home along the Prince's threads — what every house said today.
    THREADS.forEach((pts, i) => {
      const ph = (t * 0.18 + i * 0.137) % 1;
      const q = along(pts, 1 - ph);
      if (!inView(view, q.x, q.y, 20)) return;
      g.fillStyle(GLOW, 0.35); g.fillCircle(q.x, q.y, 6);
      g.fillStyle(GLOW_WASH, 0.9); g.fillCircle(q.x, q.y, 2);
    });
    // Lamp glow pooled on the boards.
    LAMPS.forEach((p, i) => {
      if (!inView(view, p.x, p.y, 80)) return;
      const fl = 0.8 + 0.2 * Math.sin(t * 2.3 + i * 1.7);
      g.fillStyle(GLOW, 0.1 * fl); g.fillEllipse(p.x + 12, p.y + 4, 110, 40);
      g.fillStyle(GLOW, 0.08 * fl); g.fillCircle(p.x + 12, p.y - 44, 26);
    });
    // The Green's ring breathes a faint shimmer.
    if (inView(view, GREEN.x, GREEN.y, GREEN.r + 60)) {
      const k = 0.5 + 0.5 * Math.sin(t * 1.1);
      g.lineStyle(3, GLOW_WASH, 0.06 + 0.08 * k); g.strokeEllipse(GREEN.x, GREEN.y - 6, GREEN.r * 2, GREEN.r * 1.44);
    }
    // The manor's door glows between its gill folds.
    if (inView(view, MANOR.x, MANOR.y, 200)) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.9);
      g.fillStyle(GLOW, 0.1 + 0.08 * k); g.fillEllipse(MANOR.x, MANOR.y + 16, 200, 40);
    }
  },

  animateOver(g, t, view) {
    // Spore breathing off the house caps.
    HOUSES.forEach((h, i) => {
      const cy = h.y - h.h - h.cap * 0.4;
      if (!inView(view, h.x, cy, 140)) return;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.12 + k / 3 + i * 0.07) % 1;
        g.fillStyle(SPORE, 0.18 * (1 - ph)); g.fillCircle(h.x - h.cap * 0.5 + k * h.cap * 0.5 + Math.sin(t + k) * 6, cy - ph * 70, 3 + ph * 8);
      }
      // Stovepipe smoke.
      const sx = h.x + h.cap * 0.62 * 0.3 + 3, sy = h.y - h.h - 8;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.3 + k / 3 + i * 0.13) % 1;
        g.fillStyle(0x6d6a64, 0.22 * (1 - ph)); g.fillCircle(sx + ph * 18 + Math.sin(t * 2 + k) * 3, sy - ph * 50, 4 + ph * 8);
      }
    });
    // The Mycelarium's great cap sheds spore in a slow fall.
    if (inView(view, MANOR.x, MANOR.y - 300, 360)) {
      for (let k = 0; k < 10; k++) {
        const ph = (t * 0.08 + k / 10) % 1;
        const x = MANOR.x - 150 + ((k * 61) % 300) + Math.sin(t * 0.7 + k) * 10;
        g.fillStyle(GLOW_WASH, 0.4 * (1 - ph)); g.fillCircle(x, MANOR.y - 396 + ph * 260, 1.8);
      }
    }
    // Wisps hanging over the Fen — cold lights, leaning north.
    if (inView(view, FEN.x, FEN.y, FEN.rx + 60)) {
      for (let i = 0; i < 5; i++) {
        const x = FEN.x - FEN.rx * 0.8 + i * FEN.rx * 0.4 + Math.sin(t * 0.4 + i * 2) * 20;
        const y = FEN.y - 50 + Math.sin(t * 0.9 + i) * 10 - (i % 2) * 20;
        const a = 0.5 + 0.4 * Math.sin(t * 1.7 + i * 1.3);
        g.fillStyle(WISP, 0.12 * a); g.fillCircle(x, y, 22);
        g.fillStyle(WISP, 0.55 * a); g.fillCircle(x, y, 6);
        g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(x, y - 6, 3);
      }
    }
    // Fireflies over the Mere and the Lea.
    for (const [cx, cy, n, seed] of [[MERE.x + MERE.w / 2, MERE.y + MERE.h / 2, 14, 3], [LEA.x, LEA.y, 8, 7]] as const) {
      if (!inView(view, cx, cy, 260)) continue;
      const r = mulberry(seed);
      for (let i = 0; i < n; i++) {
        const bx = cx + (r() - 0.5) * 380, by = cy + (r() - 0.5) * 220;
        const x = bx + Math.sin(t * 0.6 + i) * 30, y = by + Math.cos(t * 0.5 + i * 1.3) * 18;
        const on = (Math.sin(t * 2.4 + i * 2.1) + 1) / 2;
        g.fillStyle(0xe8ff9a, 0.15 * on); g.fillCircle(x, y, 7);
        g.fillStyle(0xf4ffc8, 0.9 * on); g.fillCircle(x, y, 1.6);
      }
    }
    // A thin drift of spore across the whole view.
    motes(g, view, t, 22, lit(SPORE, 0.2), -6, 18, 1.2, 4);
  },
};
