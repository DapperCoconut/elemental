import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BASALT, BASALT_DARK, BASALT_LIT, BASALT_TOP, BRASS, BRASS_DARK, BRASS_LIT, CHALK, COAL, DUST, DUST_LIT, EARTH,
  EARTH_DARK, EARTH_LIT, EMBER, FLATBREAD, GRANITE, GRANITE_DARK, GRANITE_DEEP, GRANITE_LIT, IRON, IRON_LIT, LEY,
  LICHEN, LICHEN_LIT, MAGMA, MOSS, PLASTER, POOL, POOL_DEEP, POOL_LIT, REGENT, REGENT_DARK, REGENT_LIT, SANDSTONE,
  SANDSTONE_DARK, SANDSTONE_LIT, STRATA, TIMBER, TIMBER_DARK, TIMBER_LIT, TURF, TURF_DARK, TURF_LIT,
} from './palette';

/**
 * Stonehold set pieces — the shapes only a town built *out of* the rock has. Everything is drawn
 * heavy: big masses first, then the mesa's strata running through them in bands, then cracks,
 * lichen and the dust lying in every ledge. Nothing stands clear of the ground — every stone is
 * sunk in its own skirt of earth, every wall has rubble at its foot, every cut block a chalk mark
 * on its face. The Regent's slate-violet is the only colour that was painted on rather than dug up.
 */

// ── Ground ───────────────────────────────────────────────────────────

/** Packed earth under a skin of ochre dust: drifts, pebbles, hairline cracks, boot-worn patches. */
export function dustGround(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(EARTH, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = (r.w * r.h) / 1800;
  for (let i = 0; i < n * 0.12; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(rng() < 0.5 ? EARTH_LIT : EARTH_DARK, 0.18);
    g.fillEllipse(x, y, 60 + rng() * 140, 18 + rng() * 40);
  }
  // Dust drifts: pale tongues lying downwind.
  for (let i = 0; i < n * 0.05; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.fillStyle(DUST, 0.22); g.fillEllipse(x, y, 90 + rng() * 120, 10 + rng() * 14);
    g.fillStyle(DUST_LIT, 0.14); g.fillEllipse(x - 10, y - 3, 50 + rng() * 60, 5);
  }
  // Pebbles and grit.
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.18) {
      const s = 1.5 + rng() * 2.5;
      g.fillStyle(GRANITE_DARK, 0.6); g.fillEllipse(x, y + 1, s * 2.2, s * 1.4);
      g.fillStyle(rng() < 0.5 ? GRANITE : SANDSTONE, 0.9); g.fillEllipse(x, y, s * 2, s * 1.3);
      g.fillStyle(GRANITE_LIT, 0.5); g.fillCircle(x - s * 0.4, y - s * 0.3, s * 0.4);
    } else if (k < 0.6) { g.fillStyle(EARTH_DARK, 0.35); g.fillRect(x, y, 2, 1.4); }
    else { g.fillStyle(DUST, 0.3); g.fillRect(x, y, 1.6, 1.6); }
  }
  // Hairline cracks: dry ground, short forked lines.
  for (let i = 0; i < n * 0.04; i++) {
    let x = r.x + rng() * r.w, y = r.y + rng() * r.h, a = rng() * Math.PI * 2;
    g.lineStyle(1, EARTH_DARK, 0.45);
    for (let s = 0; s < 4; s++) {
      const nx = x + Math.cos(a) * (8 + rng() * 12), ny = y + Math.sin(a) * (5 + rng() * 8);
      g.lineBetween(x, y, nx, ny);
      if (rng() < 0.4) g.lineBetween(nx, ny, nx + Math.cos(a + 1.2) * 7, ny + Math.sin(a + 1.2) * 5);
      x = nx; y = ny; a += (rng() - 0.5) * 1.4;
    }
  }
}

/** Thin turf, worn through to earth in patches, with tussocks and a few thrift flowers. */
export function turfPatch(g: G, x: number, y: number, rx: number, ry: number, rng: () => number): void {
  g.fillStyle(TURF_DARK, 0.6); g.fillEllipse(x, y + 3, rx * 2.05, ry * 2.05);
  g.fillStyle(TURF, 0.85); g.fillEllipse(x, y, rx * 2, ry * 2);
  for (let i = 0; i < (rx * ry) / 140; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
    const px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d;
    const k = rng();
    if (k < 0.2) { g.fillStyle(EARTH, 0.7); g.fillEllipse(px, py, 10 + rng() * 14, 4 + rng() * 5); }
    else if (k < 0.7) { g.lineStyle(1, rng() < 0.5 ? TURF_LIT : TURF_DARK, 0.8); g.lineBetween(px, py, px + (rng() - 0.5) * 4, py - 4); }
    else if (k < 0.76) { g.fillStyle(0xe8a0b8, 0.9); g.fillCircle(px, py - 2, 1.4); }
  }
}

/**
 * The mesa face: a cliff of banded strata, each band its own colour with ragged edges, bedding
 * cracks and the odd fossil shell, dust heaped along every ledge. `h` is the visible face height.
 */
export function strataFace(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const bands = 6 + Math.floor(rng() * 3);
  let yy = y;
  for (let i = 0; i < bands && yy < y + h; i++) {
    const bh = (h / bands) * (0.7 + rng() * 0.6);
    const c = STRATA[(i + Math.floor(rng() * 2)) % STRATA.length];
    g.fillStyle(c, 1); g.fillRect(x, yy, w, bh + 1);
    // A ragged lower edge: the softer band weathered back under the harder one.
    g.fillStyle(dim(c, 0.3), 0.7);
    for (let px = x; px < x + w; px += 14) g.fillTriangle(px, yy + bh, px + 14, yy + bh, px + 7, yy + bh - 3 - rng() * 5);
    // Bedding cracks and the ledge's dust.
    g.lineStyle(1, dim(c, 0.4), 0.5);
    for (let k = 0; k < w / 40; k++) { const px = x + rng() * w; g.lineBetween(px, yy + bh * 0.3, px + 10 + rng() * 30, yy + bh * 0.35); }
    g.fillStyle(DUST_LIT, 0.35); g.fillRect(x, yy, w, 2);
    if (rng() < 0.4) {
      const fx = x + rng() * w, fy = yy + bh * 0.5;
      g.lineStyle(1, lit(c, 0.3), 0.7);
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(fx, fy, 2 + k * 1.6, Math.PI, Math.PI * 1.9, false); g.strokePath(); }
    }
    yy += bh;
  }
  g.fillStyle(0x000000, 0.18); g.fillRect(x, y + h - 10, w, 10);
}

/** A field of loose scree: sharp grey shards, bigger at the bottom of the run, in their own dust. */
export function screeField(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(GRANITE_DARK, 0.25); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 120; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = (y - r.y) / r.h;
    const s = 2 + rng() * (3 + k * 5);
    const a = rng() * Math.PI;
    const c = rng() < 0.7 ? GRANITE : SANDSTONE;
    g.fillStyle(dim(c, 0.4), 1);
    g.fillTriangle(x + Math.cos(a) * s, y + Math.sin(a) * s * 0.6 + 1, x + Math.cos(a + 2.2) * s, y + Math.sin(a + 2.2) * s * 0.6 + 1, x + Math.cos(a + 4.1) * s, y + Math.sin(a + 4.1) * s * 0.6 + 1);
    g.fillStyle(c, 1);
    g.fillTriangle(x + Math.cos(a) * s, y + Math.sin(a) * s * 0.6, x + Math.cos(a + 2.2) * s, y + Math.sin(a + 2.2) * s * 0.6, x + Math.cos(a + 4.1) * s, y + Math.sin(a + 4.1) * s * 0.6);
    g.fillStyle(GRANITE_LIT, 0.5); g.fillCircle(x + Math.cos(a) * s * 0.4, y - 0.5, s * 0.25);
  }
}

/**
 * The rolling-stone road's runnel: a groove cut deep into the road and lined with dressed kerbs,
 * polished by forty years of tithe boulders, with chock-stones at the turns.
 */
export function runnel(g: G, pts: Pt[], rng: () => number): void {
  const lineAll = (w: number, c: number, a = 1) => {
    g.lineStyle(w, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    for (const p of pts) { g.fillStyle(c, a); g.fillCircle(p.x, p.y, w / 2); }
  };
  lineAll(56, GRANITE_DARK);
  lineAll(48, GRANITE);
  lineAll(36, GRANITE_DEEP);
  lineAll(28, dim(GRANITE, 0.45));
  lineAll(8, GRANITE_LIT, 0.25);
  // Kerb joints and the scrape marks of boulders.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    for (let d = 0; d < len; d += 26) {
      const px = a.x + ((b.x - a.x) * d) / len, py = a.y + ((b.y - a.y) * d) / len;
      for (const s of [-1, 1]) {
        g.lineStyle(1.5, GRANITE_DEEP, 0.8);
        g.lineBetween(px + nx * s * 20, py + ny * s * 20, px + nx * s * 27, py + ny * s * 27);
      }
      if (rng() < 0.5) { g.lineStyle(1, GRANITE_LIT, 0.25); g.lineBetween(px - nx * 6, py - ny * 6, px + (b.x - a.x) / len * 14, py + (b.y - a.y) / len * 14); }
    }
  }
}

/** One hexagon (pointy-top) as six points. */
export function hexPts(cx: number, cy: number, r: number, squash = 1): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i / 6) * Math.PI * 2; out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * squash }); }
  return out;
}

function fillPoly(g: G, pts: Pt[]): void {
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath(); g.fillPath();
}

function strokePoly(g: G, pts: Pt[]): void {
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath(); g.strokePath();
}

/**
 * A basalt column of the giant's causeway seen from above-and-south: a hex top, its two front
 * faces dropping `h` px (darker on the right), columnar joints in the faces, the top worn smooth
 * and dusted, sometimes a crack of glow where magma is near (`hot` 0–1).
 */
export function basaltColumn(g: G, cx: number, cy: number, r: number, h: number, hot = 0, squash = 0.62): void {
  const top = hexPts(cx, cy - h, r, squash);
  if (h > 0.5) {
    // Front faces: the three lower edges of the hex extruded down.
    const faces: [number, number, number][] = [[0, 1, 0.55], [1, 2, 0.4], [5, 0, 0.7]];
    for (const [i, j, k] of faces) {
      const a = top[i], b = top[j];
      g.fillStyle(mixC(BASALT_DARK, BASALT, k), 1);
      fillPoly(g, [a, b, { x: b.x, y: b.y + h }, { x: a.x, y: a.y + h }]);
      // Cross-joints, the columnar "biscuits".
      g.lineStyle(1, BASALT_DARK, 0.8);
      for (let y = 10; y < h; y += 14) g.lineBetween(a.x, a.y + y, b.x, b.y + y);
    }
    g.lineStyle(1, BASALT_LIT, 0.4); g.lineBetween(top[1].x, top[1].y, top[1].x, top[1].y + h);
  }
  g.fillStyle(BASALT, 1); fillPoly(g, top);
  g.fillStyle(BASALT_TOP, 0.55); fillPoly(g, hexPts(cx - r * 0.06, cy - h - r * 0.06, r * 0.72, squash));
  g.fillStyle(DUST, 0.18); g.fillEllipse(cx + r * 0.2, cy - h + r * 0.15, r * 0.8, r * 0.25);
  g.lineStyle(1.2, BASALT_DARK, 1); strokePoly(g, top);
  if (hot > 0) {
    g.lineStyle(2, MAGMA, 0.35 + hot * 0.6);
    g.lineBetween(cx - r * 0.5, cy - h, cx + r * 0.1, cy - h + r * 0.2 * squash);
    g.lineBetween(cx + r * 0.1, cy - h + r * 0.2 * squash, cx + r * 0.45, cy - h - r * 0.2 * squash);
    glow(g, cx, cy - h, r * 0.9, MAGMA, 0.04 + hot * 0.06, 2);
  }
}

// ── Stones ───────────────────────────────────────────────────────────

/**
 * A boulder: a lumpy round mass, lit from the upper left, a band of strata if it is sandstone,
 * cracks, a cap of lichen and moss on the north side, sunk in a skirt of earth.
 */
export function boulder(g: G, x: number, y: number, r: number, rng: () => number, o: { sand?: boolean; moss?: boolean } = {}): void {
  shadow(g, x + r * 0.15, y, r * 2.4, r * 0.7, 0.38);
  const base = o.sand ? SANDSTONE : GRANITE;
  const cy = y - r * 0.8;
  const lump = (dx: number, dy: number, rr: number, c: number) => { g.fillStyle(c, 1); g.fillEllipse(x + dx, cy + dy, rr * 2, rr * 1.8); };
  lump(0, 2, r, dim(base, 0.35));
  lump(-r * 0.05, 0, r * 0.98, base);
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2;
    lump(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4, r * (0.35 + rng() * 0.2), mixC(base, i % 2 ? GRANITE_LIT : GRANITE_DARK, 0.18));
  }
  if (o.sand) {
    for (let k = 0; k < 3; k++) {
      g.fillStyle(STRATA[(k * 2) % STRATA.length], 0.55);
      g.fillEllipse(x, cy - r * 0.3 + k * r * 0.35, r * 1.9 - k * 8, r * 0.18);
    }
  }
  g.fillStyle(GRANITE_LIT, 0.55); g.fillEllipse(x - r * 0.35, cy - r * 0.4, r * 0.8, r * 0.5);
  g.fillStyle(0xffffff, 0.15); g.fillEllipse(x - r * 0.45, cy - r * 0.5, r * 0.3, r * 0.16);
  // Cracks.
  g.lineStyle(1.2, GRANITE_DEEP, 0.7);
  let px = x + r * (rng() - 0.5), py = cy - r * 0.7;
  for (let k = 0; k < 4; k++) { const nx = px + (rng() - 0.5) * r * 0.5, ny = py + r * 0.35; g.lineBetween(px, py, nx, ny); px = nx; py = ny; }
  if (o.moss !== false) {
    g.fillStyle(MOSS, 0.85); g.fillEllipse(x + r * 0.1, cy - r * 0.75, r * 1.1, r * 0.35);
    for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? LICHEN : LICHEN_LIT, 0.8); g.fillCircle(x + (rng() - 0.5) * r * 1.4, cy + (rng() - 0.6) * r * 1.2, 1.5 + rng() * 3); }
  }
  // The earth skirt it sits in.
  g.fillStyle(EARTH_DARK, 0.9); g.fillEllipse(x, y - 2, r * 1.9, r * 0.3);
  g.fillStyle(DUST, 0.5); g.fillEllipse(x - r * 0.4, y - 3, r * 0.8, r * 0.14);
}

/**
 * A menhir: a tall standing stone, slightly tapered and leaning, banded with strata, pitted, with
 * lichen rosettes, a tidemark of dust at its foot and — if `marks` — the chalked tally of whose
 * tithe was weighed against it.
 */
export function menhir(g: G, x: number, y: number, w: number, h: number, rng: () => number, lean = 0, marks = false): void {
  shadow(g, x + 10, y, w * 2.2, w * 0.55, 0.36);
  const tl = { x: x - w * 0.42 + lean, y: y - h }, tr = { x: x + w * 0.3 + lean * 1.1, y: y - h * 0.97 };
  const body = [
    { x: x - w / 2, y }, { x: x - w * 0.55, y: y - h * 0.45 }, tl, { x: x - w * 0.05 + lean, y: y - h * 1.04 }, tr,
    { x: x + w * 0.55, y: y - h * 0.5 }, { x: x + w / 2, y },
  ];
  g.fillStyle(GRANITE_DARK, 1); fillPoly(g, body.map((p) => ({ x: p.x + 3, y: p.y + 2 })));
  g.fillStyle(GRANITE, 1); fillPoly(g, body);
  // The lit west face.
  g.fillStyle(GRANITE_LIT, 0.45);
  fillPoly(g, [{ x: x - w / 2, y }, { x: x - w * 0.55, y: y - h * 0.45 }, tl, { x: x - w * 0.15 + lean, y: y - h * 0.95 }, { x: x - w * 0.1, y }]);
  // Strata running through it, tipped as the stone was tipped when it was raised.
  for (let k = 0; k < 4; k++) {
    const by = y - h * (0.2 + k * 0.2);
    g.lineStyle(3 + rng() * 3, STRATA[(k + 1) % STRATA.length], 0.28);
    g.lineBetween(x - w * 0.5 + lean * (1 - (y - by) / h), by + 4, x + w * 0.5 + lean * (1 - (y - by) / h), by - 4);
  }
  // Pits and lichen rosettes.
  for (let i = 0; i < h / 10; i++) {
    const py = y - rng() * h * 0.95, px = x + (rng() - 0.5) * w * 0.8 + lean * (1 - (y - py) / h) * 0;
    g.fillStyle(GRANITE_DEEP, 0.5); g.fillCircle(px, py, 0.8 + rng() * 1.2);
  }
  for (let i = 0; i < 4; i++) {
    const py = y - h * (0.3 + rng() * 0.6), px = x + (rng() - 0.3) * w * 0.6 + lean * ((y - py) / h);
    g.fillStyle(LICHEN, 0.75); g.fillCircle(px, py, 2.5 + rng() * 3);
    g.fillStyle(LICHEN_LIT, 0.7); g.fillCircle(px - 1, py - 1, 1.3);
  }
  g.lineStyle(1.2, GRANITE_DEEP, 0.6); g.lineBetween(x + w * 0.1, y - h * 0.7, x + w * 0.2, y - h * 0.45);
  if (marks) {
    g.lineStyle(1.5, CHALK, 0.8);
    for (let k = 0; k < 5; k++) g.lineBetween(x - w * 0.25 + k * 4, y - h * 0.35, x - w * 0.25 + k * 4, y - h * 0.25);
    g.lineBetween(x - w * 0.3, y - h * 0.27, x - w * 0.25 + 18, y - h * 0.33);
  }
  // The foot: sunk in earth with dust banked against it.
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y - 1, w * 1.25, w * 0.28);
  g.fillStyle(DUST, 0.6); g.fillEllipse(x - w * 0.25, y - 2, w * 0.6, w * 0.12);
}

/**
 * A house hollowed out of a standing stone. A great rounded menhir, banded and lichened, with a
 * door hewn into its foot (a timber frame wedged in), deep-cut windows with shutters, a smoke
 * hole near the top, a carved lintel stone over the door bearing the house's old street name —
 * or a smear of fresh plaster where the Regent's men buried it. `interred` walls the door up in
 * new grey blocks with the Burier's Seal daubed across.
 */
export interface StoneHouseOpts { glow?: number; plastered?: boolean; interred?: boolean; sand?: boolean; windows?: number; lean?: number }

export function stoneHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, o: StoneHouseOpts = {}): Pt {
  shadow(g, x + 14, y + 2, w * 1.5, w * 0.36, 0.38);
  const lean = o.lean ?? 0;
  const base = o.sand ? SANDSTONE : GRANITE;
  const body: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const k = i / 16;
    const a = Math.PI + k * Math.PI;
    const rr = 1 + Math.sin(k * 9.1) * 0.03;
    body.push({ x: x + Math.cos(a) * w * 0.5 * rr + lean * (1 + Math.sin(a)), y: y - h * 0.62 + Math.sin(a) * h * 0.4 * rr });
  }
  const full = [{ x: x - w * 0.52, y }, ...body, { x: x + w * 0.52, y }];
  g.fillStyle(dim(base, 0.35), 1); fillPoly(g, full.map((p) => ({ x: p.x + 4, y: p.y + 3 })));
  g.fillStyle(base, 1); fillPoly(g, full);
  // Strata bands curving with the stone.
  for (let k = 0; k < 5; k++) {
    const by = y - h * (0.12 + k * 0.17);
    const half = w * 0.5 * Math.min(1, Math.sqrt(Math.max(0.05, 1 - Math.pow((y - h * 0.62 - by) / (h * 0.42), 2))) + (by > y - h * 0.62 ? 1 : 0));
    g.fillStyle(STRATA[(k + (o.sand ? 0 : 2)) % STRATA.length], o.sand ? 0.5 : 0.22);
    g.fillRect(x - Math.min(half, w * 0.5), by, Math.min(half, w * 0.5) * 2, 5 + rng() * 6);
  }
  // Lit west flank and a dark east.
  g.fillStyle(GRANITE_LIT, 0.3); g.fillEllipse(x - w * 0.28, y - h * 0.55, w * 0.32, h * 0.8);
  g.fillStyle(0x000000, 0.12); g.fillEllipse(x + w * 0.34, y - h * 0.45, w * 0.26, h * 0.8);
  // Lichen and a moss cap.
  g.fillStyle(MOSS, 0.7); g.fillEllipse(x - w * 0.05 + lean, y - h * 0.98, w * 0.6, h * 0.08);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 3 ? LICHEN : LICHEN_LIT, 0.7);
    g.fillCircle(x + (rng() - 0.5) * w * 0.8, y - h * (0.2 + rng() * 0.7), 1.5 + rng() * 3.5);
  }
  // Windows: deep-cut, timber-shuttered.
  const nw = o.windows ?? 2;
  for (let i = 0; i < nw; i++) {
    const wx = x + (nw === 1 ? 0 : (i / (nw - 1) - 0.5) * w * 0.5), wy = y - h * (0.52 + (i % 2) * 0.12);
    g.fillStyle(GRANITE_DEEP, 1); g.fillRoundedRect(wx - 8, wy - 11, 16, 20, 6);
    g.fillStyle(o.glow ? mixC(0x3a2a1a, 0xffc070, o.glow) : 0x221a14, 1); g.fillRoundedRect(wx - 6, wy - 9, 12, 16, 5);
    if (o.glow) glow(g, wx, wy, 14, 0xffc070, 0.04 * o.glow, 2);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 13, wy - 10, 5, 18); g.fillRect(wx + 8, wy - 10, 5, 18);
    g.fillStyle(TIMBER, 1); g.fillRect(wx - 12, wy - 9, 3, 16); g.fillRect(wx + 9, wy - 9, 3, 16);
    g.fillStyle(DUST, 0.6); g.fillRect(wx - 9, wy + 9, 18, 2);
  }
  // Smoke hole.
  g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(x + w * 0.18 + lean, y - h * 0.88, 4);
  g.fillStyle(0x000000, 0.4); g.fillCircle(x + w * 0.18 + lean, y - h * 0.88, 2.5);
  // The door: a hewn arch with a timber frame, and the lintel stone above it.
  const dw = Math.min(30, w * 0.28), dh = Math.min(48, h * 0.36);
  g.fillStyle(GRANITE_DEEP, 1); g.fillRoundedRect(x - dw / 2 - 4, y - dh - 4, dw + 8, dh + 4, { tl: 10, tr: 10, bl: 0, br: 0 });
  if (o.interred) {
    // Walled up: new grey blocks, crisp against the old stone, the Seal daubed across them.
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const bx = x - dw / 2 + c * (dw / 2) + (r % 2 ? dw / 4 : 0) - (r % 2 && c === 1 ? dw / 2 : 0);
        g.fillStyle(r % 2 ? 0xa8a8a4 : 0xb8b8b2, 1); g.fillRect(bx, y - dh + r * (dh / 4), dw / 2 - 1, dh / 4 - 1);
      }
    }
    g.fillStyle(0xb8b8b2, 1); g.fillRect(x - dw / 2, y - dh, dw, 4);
    burierSeal(g, x, y - dh / 2, dw * 0.36, REGENT, 0.9);
  } else {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
    g.fillStyle(TIMBER, 1);
    for (let k = 0; k < 3; k++) g.fillRect(x - dw / 2 + 2 + k * (dw / 3), y - dh + 3, dw / 3 - 3, dh - 3);
    g.fillStyle(IRON, 1); g.fillRect(x - dw / 2, y - dh * 0.7, dw, 2); g.fillRect(x - dw / 2, y - dh * 0.3, dw, 2);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(x + dw * 0.3, y - dh * 0.5, 1.6);
    if (o.glow) { g.fillStyle(0xffc070, 0.25 * o.glow); g.fillRect(x - 1, y - dh + 2, 2, dh - 2); }
  }
  // Lintel: a slab laid over the door, carved — or plastered over.
  const lw = dw + 24;
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - lw / 2, y - dh - 15, lw, 12);
  g.fillStyle(lit(base, 0.12), 1); g.fillRect(x - lw / 2, y - dh - 16, lw, 10);
  if (o.plastered) {
    g.fillStyle(PLASTER, 0.95); g.fillRoundedRect(x - lw / 2 + 2, y - dh - 15, lw - 4, 8, 3);
    g.fillStyle(0xffffff, 0.4); g.fillRect(x - lw / 2 + 5, y - dh - 14, lw * 0.4, 2);
    g.lineStyle(1, 0xc8c2b4, 1); g.lineBetween(x - lw / 2 + 4, y - dh - 9, x + lw / 2 - 6, y - dh - 10);
  } else {
    // Carved letters: little cut strokes.
    g.lineStyle(1.2, GRANITE_DEEP, 0.9);
    for (let k = 0; k < 6; k++) {
      const lx = x - lw / 2 + 6 + k * ((lw - 12) / 6);
      g.lineBetween(lx, y - dh - 14, lx, y - dh - 9);
      if (k % 2) g.lineBetween(lx, y - dh - 14, lx + 3, y - dh - 12);
    }
  }
  // Step, scraper, and a doorstep pot of thrift.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - dw / 2 - 6, y - 3, dw + 12, 5);
  g.fillStyle(GRANITE_LIT, 1); g.fillRect(x - dw / 2 - 6, y - 4, dw + 12, 2);
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y + 1, w * 1.1, 8);
  return { x, y: y + 16 };
}

/**
 * The Burier's Seal: a sealed tomb door — a slab inside a ring with a bar across it and three
 * nail-heads. It is daubed on everything Gravane owns and everyone he has interred.
 */
export function burierSeal(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.2, r * 0.16), color, a); g.strokeCircle(x, y, r);
  g.fillStyle(color, a * 0.85); g.fillRoundedRect(x - r * 0.45, y - r * 0.62, r * 0.9, r * 1.24, { tl: r * 0.4, tr: r * 0.4, bl: 0, br: 0 });
  g.fillStyle(lit(color, 0.35), a); g.fillRect(x - r * 0.75, y - r * 0.08, r * 1.5, r * 0.18);
  g.fillStyle(lit(color, 0.6), a);
  for (const k of [-0.25, 0, 0.25]) g.fillCircle(x + k * r * 1.2, y + r * 0.32, Math.max(0.8, r * 0.07));
}

/**
 * A dolmen: two great uprights and a capstone laid across them, the way the old people built
 * tombs. Dunstan Quoit keeps his stall under one — shelves of keepsakes between the uprights.
 */
export function dolmen(g: G, x: number, y: number, w: number, h: number, rng: () => number, stall = false): void {
  shadow(g, x + 8, y + 2, w * 1.3, 22, 0.36);
  if (stall) {
    // The back of the stall: a hide hung between the uprights, shelves, the keepsakes.
    g.fillStyle(0x6a4a30, 1); g.fillRect(x - w * 0.34, y - h + 10, w * 0.68, h - 12);
    g.fillStyle(0x7e5a3a, 1); for (let k = 0; k < 5; k++) g.fillRect(x - w * 0.34 + k * (w * 0.68 / 5), y - h + 10, 2, h - 12);
    for (let s = 0; s < 3; s++) {
      const sy = y - h * (0.28 + s * 0.24);
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w * 0.33, sy, w * 0.66, 4);
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w * 0.33, sy, w * 0.66, 1.5);
      for (let k = 0; k < 6; k++) {
        const ix = x - w * 0.28 + k * (w * 0.56 / 5), c = [BRASS, LEY, REGENT_LIT, LICHEN, SANDSTONE_LIT, MAGMA][(k + s) % 6];
        if ((k + s) % 3 === 0) { g.fillStyle(dim(c, 0.3), 1); g.fillCircle(ix, sy - 5, 5); g.fillStyle(c, 1); g.fillCircle(ix - 1, sy - 6, 4); }
        else if ((k + s) % 3 === 1) { g.fillStyle(GRANITE_DARK, 1); g.fillTriangle(ix - 5, sy, ix + 5, sy, ix, sy - 12); g.fillStyle(c, 0.8); g.fillCircle(ix, sy - 5, 1.6); }
        else { g.fillStyle(c, 1); g.fillRect(ix - 3, sy - 9, 6, 9); g.fillStyle(lit(c, 0.4), 1); g.fillRect(ix - 3, sy - 9, 2, 9); }
      }
    }
  }
  for (const s of [-1, 1]) {
    const ux = x + s * w * 0.38;
    g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(ux - 15 + 3, y - h + 2, 30, h, 8);
    g.fillStyle(GRANITE, 1); g.fillRoundedRect(ux - 15, y - h, 30, h, 8);
    g.fillStyle(GRANITE_LIT, 0.4); g.fillRect(ux - 13, y - h + 6, 7, h - 12);
    g.fillStyle(LICHEN, 0.7); g.fillCircle(ux + 4, y - h * 0.6, 3); g.fillCircle(ux - 3, y - h * 0.3, 2);
    g.lineStyle(1, GRANITE_DEEP, 0.6); g.lineBetween(ux + 6, y - h * 0.8, ux + 2, y - h * 0.5);
  }
  // The capstone: a huge slab overhanging both sides, its underside dark.
  const cw = w * 1.08, ch = 30;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y - h + 4, cw * 0.9, 12);
  g.fillStyle(GRANITE_DARK, 1);
  fillPoly(g, [{ x: x - cw / 2, y: y - h + 4 }, { x: x - cw / 2 + 10, y: y - h - ch }, { x: x + cw / 2 - 4, y: y - h - ch + 6 }, { x: x + cw / 2, y: y - h + 6 }]);
  g.fillStyle(GRANITE, 1);
  fillPoly(g, [{ x: x - cw / 2 + 4, y: y - h - 2 }, { x: x - cw / 2 + 12, y: y - h - ch }, { x: x + cw / 2 - 6, y: y - h - ch + 6 }, { x: x + cw / 2 - 2, y: y - h }]);
  g.fillStyle(GRANITE_LIT, 0.5); g.fillRect(x - cw / 2 + 12, y - h - ch, cw - 20, 5);
  g.fillStyle(MOSS, 0.8); g.fillEllipse(x - cw * 0.15, y - h - ch + 2, cw * 0.4, 6);
  for (let i = 0; i < 5; i++) { g.fillStyle(LICHEN, 0.7); g.fillCircle(x - cw * 0.4 + rng() * cw * 0.8, y - h - ch * 0.5, 2 + rng() * 2); }
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y, w * 1.1, 10);
}

/** A cairn: stones piled smallest on top, each its own shade, dust in the joints. */
export function cairn(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x + 4, y, 34 * s, 10 * s);
  let yy = y, rr = 14 * s;
  for (let i = 0; i < 5; i++) {
    const c = [GRANITE, SANDSTONE, GRANITE_LIT, SANDSTONE_DARK, GRANITE][i];
    const dx = (rng() - 0.5) * 3 * s;
    g.fillStyle(dim(c, 0.35), 1); g.fillEllipse(x + dx + 1, yy - rr * 0.45 + 1, rr * 2, rr * 1.0);
    g.fillStyle(c, 1); g.fillEllipse(x + dx, yy - rr * 0.5, rr * 2, rr * 0.95);
    g.fillStyle(0xffffff, 0.18); g.fillEllipse(x + dx - rr * 0.4, yy - rr * 0.75, rr * 0.7, rr * 0.25);
    yy -= rr * 0.85; rr *= 0.78;
  }
}

/**
 * A holed stone — a mên-an-tol ring as tall as a man, the hole worn smooth by every hand that has
 * reached through it for luck. Stonehold's waystone is one; the hole glows ley-green when attuned.
 */
export function holedStone(g: G, x: number, y: number, r: number, rng: () => number, glowA = 0): void {
  shadow(g, x + 6, y, r * 2.4, r * 0.5);
  const cy = y - r * 1.05;
  g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(x + 3, cy + 2, r * 2.1, r * 2.2);
  g.fillStyle(GRANITE, 1); g.fillEllipse(x, cy, r * 2.1, r * 2.2);
  g.fillStyle(GRANITE_LIT, 0.4); g.fillEllipse(x - r * 0.4, cy - r * 0.3, r * 0.9, r * 1.4);
  for (let k = 0; k < 3; k++) { g.lineStyle(3, STRATA[k * 2], 0.25); g.lineBetween(x - r, cy - r * 0.5 + k * r * 0.5, x + r, cy - r * 0.6 + k * r * 0.5); }
  // The hole.
  g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(x, cy, r * 0.42);
  g.fillStyle(glowA > 0 ? mixC(0x1a2a24, LEY, glowA * 0.6) : 0x2a2622, 1); g.fillCircle(x + 1, cy + 1, r * 0.34);
  g.lineStyle(2, GRANITE_LIT, 0.6); g.beginPath(); g.arc(x, cy, r * 0.42, Math.PI * 0.8, Math.PI * 1.7, false); g.strokePath();
  if (glowA > 0) glow(g, x, cy, r * 0.8, LEY, 0.05 * glowA, 3);
  for (let i = 0; i < 6; i++) { g.fillStyle(LICHEN, 0.7); g.fillCircle(x + (rng() - 0.5) * r * 1.6, cy + (rng() - 0.2) * r, 1.5 + rng() * 2.5); }
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y - 1, r * 1.8, r * 0.3);
}

/** Cut blocks stacked for the Tithe, each with its household's chalk mark and a tally number. */
export function blockStack(g: G, x: number, y: number, cols: number, rows: number, rng: () => number, sealed = false): void {
  const bw = 26, bh = 16;
  shadow(g, x + 6, y + 2, cols * bw * 1.3, 14);
  for (let r = 0; r < rows; r++) {
    const n = cols - (r > 0 && rng() < 0.5 ? 1 : 0);
    for (let c = 0; c < n; c++) {
      const bx = x - (n * bw) / 2 + c * bw + (r % 2) * 6, by = y - (r + 1) * bh;
      const base = rng() < 0.5 ? SANDSTONE : GRANITE;
      g.fillStyle(dim(base, 0.4), 1); g.fillRect(bx, by, bw - 1, bh);
      g.fillStyle(base, 1); g.fillRect(bx, by, bw - 3, bh - 3);
      g.fillStyle(lit(base, 0.25), 1); g.fillRect(bx, by, bw - 3, 2.5);
      g.lineStyle(1, dim(base, 0.25), 0.5); g.lineBetween(bx + 3, by + 6, bx + bw - 7, by + 6);
      // Chalk mark: a household sign.
      g.lineStyle(1.2, CHALK, 0.85);
      const k = Math.floor(rng() * 4), mx = bx + bw / 2 - 1, my = by + bh / 2;
      if (k === 0) g.strokeCircle(mx, my, 3);
      else if (k === 1) { g.lineBetween(mx - 3, my - 3, mx + 3, my + 3); g.lineBetween(mx + 3, my - 3, mx - 3, my + 3); }
      else if (k === 2) { g.lineBetween(mx - 3, my + 3, mx, my - 3); g.lineBetween(mx, my - 3, mx + 3, my + 3); }
      else { g.lineBetween(mx - 4, my, mx + 4, my); g.lineBetween(mx, my - 3, mx, my + 3); }
    }
  }
  if (sealed) burierSeal(g, x, y - rows * bh - 10, 7, REGENT, 0.9);
}

/**
 * A Tithe board: a slate-violet board on two posts, the season's weights chalked in columns
 * against each household's mark, short ones circled, and the Seal at the head.
 */
export function titheBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x + 4, y, 70, 12);
  for (const s of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + s * 26 - 3, y - 62, 6, 62); g.fillStyle(TIMBER, 1); g.fillRect(x + s * 26 - 2, y - 62, 3, 62); }
  g.fillStyle(REGENT_DARK, 1); g.fillRect(x - 34, y - 70, 68, 44);
  g.fillStyle(REGENT, 1); g.fillRect(x - 32, y - 68, 64, 40);
  burierSeal(g, x, y - 60, 5, REGENT_LIT, 1);
  g.lineStyle(1, CHALK, 0.8);
  for (let r = 0; r < 4; r++) {
    const ly = y - 50 + r * 6;
    g.lineBetween(x - 28, ly, x - 22, ly);
    const n = 2 + Math.floor(rng() * 5);
    for (let k = 0; k < n; k++) g.lineBetween(x - 16 + k * 3.5, ly - 2, x - 16 + k * 3.5, ly + 2);
    if (n < 4) { g.strokeCircle(x + 14, ly, 3); }
  }
  g.fillStyle(DUST, 0.4); g.fillRect(x - 32, y - 29, 64, 2);
}

/**
 * A treadwheel crane: a great timber wheel a man walks inside, a jib of lashed beams and an iron
 * chain down to a lifting-dog clamped on a block. This one hauls the Tithe up out of the pit.
 */
export function treadCrane(g: G, x: number, y: number, rng: () => number, reach = 1): void {
  shadow(g, x + 20, y + 2, 140, 22);
  // Footing: two big cut stones.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - 40, y - 14, 80, 14);
  g.fillStyle(GRANITE, 1); g.fillRect(x - 38, y - 16, 76, 12);
  // The wheel.
  const wy = y - 58, wr = 40;
  g.lineStyle(7, TIMBER_DARK, 1); g.strokeCircle(x, wy, wr);
  g.lineStyle(4, TIMBER, 1); g.strokeCircle(x, wy, wr);
  g.lineStyle(3, TIMBER_DARK, 1); g.strokeCircle(x, wy, wr - 10);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineStyle(3, TIMBER, 1); g.lineBetween(x, wy, x + Math.cos(a) * (wr - 2), wy + Math.sin(a) * (wr - 2)); }
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; g.lineStyle(1.5, TIMBER_LIT, 0.8); g.lineBetween(x + Math.cos(a) * (wr - 10), wy + Math.sin(a) * (wr - 10), x + Math.cos(a) * wr, wy + Math.sin(a) * wr); }
  g.fillStyle(IRON, 1); g.fillCircle(x, wy, 6); g.fillStyle(IRON_LIT, 1); g.fillCircle(x - 1, wy - 1, 2.5);
  // A-frame legs.
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x - 34, y - 14, x, wy); g.lineBetween(x + 34, y - 14, x, wy);
  g.lineStyle(3, TIMBER_LIT, 0.8); g.lineBetween(x - 34, y - 14, x, wy); g.lineBetween(x + 34, y - 14, x, wy);
  // The jib out over the pit, with its chain.
  const jx = x + 110 * reach, jy = wy - 50;
  g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(x + 6, wy + 6, jx, jy);
  g.lineStyle(4, TIMBER, 1); g.lineBetween(x + 6, wy + 6, jx, jy);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x, wy - 30, jx, jy);
  g.lineBetween(x, wy, x, wy - 30);
  for (let k = 0; k < 4; k++) { const px = x + 6 + (jx - x - 6) * (0.2 + k * 0.22), py = wy + 6 + (jy - wy - 6) * (0.2 + k * 0.22); g.fillStyle(0x3a2a1a, 1); g.fillRect(px - 3, py - 2, 6, 4); }
  const cl = 60 + rng() * 20;
  for (let d = 0; d < cl; d += 5) { g.lineStyle(2, IRON_LIT, 1); g.strokeEllipse(jx, jy + d, 3, 5); }
  // The lifting-dog with a block in its jaws.
  g.lineStyle(3, IRON, 1); g.lineBetween(jx, jy + cl, jx - 9, jy + cl + 10); g.lineBetween(jx, jy + cl, jx + 9, jy + cl + 10);
  g.fillStyle(SANDSTONE, 1); g.fillRect(jx - 12, jy + cl + 10, 24, 16);
  g.fillStyle(SANDSTONE_LIT, 1); g.fillRect(jx - 12, jy + cl + 10, 24, 3);
  g.lineStyle(1.2, CHALK, 0.8); g.strokeCircle(jx, jy + cl + 19, 3);
}

/**
 * A stone cart: a low sledge-cart on solid stone wheels, its bed loaded with cut blocks, a
 * yoke-pole down in the dust — no animals up here, people pull them.
 */
export function stoneCart(g: G, x: number, y: number, rng: () => number, flip = 1): void {
  shadow(g, x, y + 2, 120, 18);
  g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(x + flip * 40, y - 12, x + flip * 86, y - 2);
  g.lineStyle(2, TIMBER_LIT, 0.8); g.lineBetween(x + flip * 40, y - 13, x + flip * 86, y - 3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 46, y - 26, 92, 14);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 46, y - 28, 92, 10);
  for (let k = 0; k < 6; k++) { g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(x - 44 + k * 15, y - 28, 1.5, 10); }
  blockStack(g, x, y - 26, 3, 2, rng);
  for (const s of [-1, 1]) {
    const wx = x + s * 30;
    g.fillStyle(GRANITE_DARK, 1); g.fillCircle(wx, y - 10, 13);
    g.fillStyle(GRANITE, 1); g.fillCircle(wx - 1, y - 11, 12);
    g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(wx - 1, y - 11, 3.5);
    g.lineStyle(1, GRANITE_LIT, 0.6); g.beginPath(); g.arc(wx - 1, y - 11, 9, Math.PI * 0.9, Math.PI * 1.6, false); g.strokePath();
  }
}

/** A pick and a mattock leant against something, and a basket of spalls. */
export function quarryTools(g: G, x: number, y: number, rng: () => number): void {
  g.lineStyle(3, TIMBER, 1); g.lineBetween(x - 6, y, x + 4, y - 40);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 8, y - 40, x + 18, y - 44, x + 4, y - 36);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 10, y, x + 16, y - 36);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x + 8, y - 40, 16, 6);
  // Basket of spalls.
  g.fillStyle(0x8a6a3a, 1); g.fillEllipse(x + 30, y - 8, 26, 16);
  g.lineStyle(1, 0x5a4220, 1); for (let k = 0; k < 4; k++) g.lineBetween(x + 19 + k * 7, y - 14, x + 19 + k * 7, y - 2);
  for (let i = 0; i < 6; i++) { g.fillStyle(rng() < 0.5 ? GRANITE : SANDSTONE, 1); g.fillCircle(x + 22 + rng() * 16, y - 15 - rng() * 3, 2.5); }
}

// ── Landmarks ────────────────────────────────────────────────────────

/**
 * Prince Bould's boulder keep. A fortress built of boulders no one could have moved — piled into
 * round towers either side, a curtain wall of them between, and the gate a single holed stone
 * the size of a house, its eye stopped with a slab bearing the Burier's Seal that grinds aside.
 * The Prince's own boulder sits on the gate like a capstone. Regent's banners on the towers,
 * dust banked at every course, rubble at the foot. `x,y` is the gate's base centre; `w` total width.
 */
export function boulderKeep(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x + 20, y + 6, w * 1.1, 60, 0.4);
  const x0 = x - w / 2;
  // The curtain wall: three courses of boulders, biggest at the bottom.
  for (let course = 0; course < 4; course++) {
    const r = 34 - course * 5;
    const cy = y - 20 - course * (r * 1.45);
    for (let bx = x0 + 80; bx < x0 + w - 80; bx += r * 1.7) {
      if (Math.abs(bx - x) < 120) continue;
      const jx = bx + (rng() - 0.5) * 8;
      g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(jx + 3, cy + 3, r * 2.1, r * 1.7);
      g.fillStyle(mixC(GRANITE, SANDSTONE, rng() * 0.4), 1); g.fillEllipse(jx, cy, r * 2, r * 1.6);
      g.fillStyle(GRANITE_LIT, 0.45); g.fillEllipse(jx - r * 0.35, cy - r * 0.35, r * 0.8, r * 0.5);
      g.fillStyle(DUST, 0.45); g.fillEllipse(jx, cy - r * 0.7, r * 1.1, r * 0.2);
      if (rng() < 0.4) { g.fillStyle(MOSS, 0.7); g.fillEllipse(jx + r * 0.2, cy - r * 0.6, r * 0.7, r * 0.2); }
    }
  }
  // The towers: stacked boulders in a column, a crown of upright slabs on top.
  for (const s of [-1, 1]) {
    const tx = x + s * (w / 2 - 70);
    let ty = y - 10;
    for (let k = 0; k < 6; k++) {
      const r = 58 - k * 5;
      g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(tx + 4, ty - r * 0.6 + 4, r * 2.1, r * 1.3);
      g.fillStyle(k % 2 ? GRANITE : mixC(GRANITE, SANDSTONE, 0.35), 1); g.fillEllipse(tx, ty - r * 0.6, r * 2, r * 1.25);
      g.fillStyle(STRATA[k % STRATA.length], 0.25); g.fillEllipse(tx, ty - r * 0.55, r * 1.9, r * 0.2);
      g.fillStyle(GRANITE_LIT, 0.4); g.fillEllipse(tx - r * 0.4, ty - r * 0.85, r * 0.8, r * 0.35);
      g.fillStyle(DUST, 0.5); g.fillEllipse(tx, ty - r * 1.15, r * 1.2, r * 0.16);
      ty -= r * 1.05;
    }
    for (let k = -2; k <= 2; k++) {
      const sx = tx + k * 14;
      g.fillStyle(GRANITE_DARK, 1); g.fillRect(sx - 5, ty - 30 - Math.abs(k) * -4, 11, 34);
      g.fillStyle(GRANITE, 1); g.fillRect(sx - 6, ty - 32 - Math.abs(k) * -4, 10, 32);
    }
    // Arrow-slit windows glowing.
    for (let k = 0; k < 3; k++) {
      const wy = y - 80 - k * 70;
      g.fillStyle(0x1a1410, 1); g.fillRect(tx - 3, wy - 12, 6, 18);
      g.fillStyle(0xffb050, 0.5); g.fillRect(tx - 1.5, wy - 10, 3, 14);
    }
    // The Regent's banner.
    const by = ty - 30;
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(tx, by, tx, by - 70);
    g.fillStyle(REGENT_DARK, 1); g.fillRect(tx + 1, by - 68, 34, 46);
    g.fillStyle(REGENT, 1); g.fillRect(tx + 1, by - 68, 32, 44);
    g.fillStyle(REGENT, 1); g.fillTriangle(tx + 1, by - 24, tx + 33, by - 24, tx + 17, by - 12);
    burierSeal(g, tx + 17, by - 46, 9, REGENT_LIT, 1);
  }
  // The gate: one giant holed stone.
  const gr = 110, gy = y - gr * 0.95;
  g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(x + 6, gy + 6, gr * 2.2, gr * 2.0);
  g.fillStyle(GRANITE, 1); g.fillEllipse(x, gy, gr * 2.2, gr * 2.0);
  for (let k = 0; k < 6; k++) {
    g.fillStyle(STRATA[k % STRATA.length], 0.28);
    g.fillEllipse(x, gy - gr * 0.75 + k * gr * 0.3, gr * 2.1 * Math.sqrt(1 - Math.pow((k - 2.5) / 3.2, 2)), 10);
  }
  g.fillStyle(GRANITE_LIT, 0.35); g.fillEllipse(x - gr * 0.5, gy - gr * 0.4, gr * 0.9, gr * 1.2);
  // The eye, stopped with the sealed slab.
  g.fillStyle(0x161210, 1); g.fillCircle(x, gy + 20, gr * 0.5);
  g.lineStyle(4, GRANITE_LIT, 0.5); g.beginPath(); g.arc(x, gy + 20, gr * 0.5, Math.PI * 0.8, Math.PI * 1.75, false); g.strokePath();
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x - gr * 0.42, gy + 20 - gr * 0.44, gr * 0.84, gr * 0.88, 10);
  g.fillStyle(0xa8a49c, 1); g.fillRoundedRect(x - gr * 0.4, gy + 20 - gr * 0.42, gr * 0.8, gr * 0.84, 10);
  g.lineStyle(1.5, GRANITE_DARK, 0.6);
  for (let k = 1; k < 4; k++) g.lineBetween(x - gr * 0.4, gy + 20 - gr * 0.42 + k * gr * 0.21, x + gr * 0.4, gy + 20 - gr * 0.42 + k * gr * 0.21);
  burierSeal(g, x, gy + 20, gr * 0.26, REGENT, 1);
  // The grinding-groove the slab rolls along, scored and dusty.
  g.fillStyle(GRANITE_DEEP, 0.8); g.fillRect(x - gr * 0.9, y - 14, gr * 1.8, 8);
  g.fillStyle(DUST, 0.4); g.fillRect(x - gr * 0.9, y - 14, gr * 1.8, 2);
  // The Prince's own boulder perched on the gate like a capstone, moss and all.
  const pby = gy - gr * 0.95;
  g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(x + 4, pby + 4, 46);
  g.fillStyle(0x8d7f6a, 1); g.fillCircle(x, pby, 46);
  g.fillStyle(0xb8a98e, 0.5); g.fillCircle(x - 14, pby - 14, 18);
  g.lineStyle(2, GRANITE_DEEP, 0.7); g.beginPath(); g.arc(x, pby, 34, -0.4, 1.4, false); g.strokePath();
  g.lineBetween(x - 20, pby + 10, x - 6, pby + 30);
  g.fillStyle(MOSS, 0.85); g.fillEllipse(x + 6, pby - 38, 50, 14);
  // Rubble, and steps up to the gate.
  for (let i = 0; i < 26; i++) {
    const rx = x0 + 40 + rng() * (w - 80), ry = y - 4 + rng() * 10;
    const s = 3 + rng() * 6;
    g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(rx + 1, ry + 1, s * 2, s * 1.2);
    g.fillStyle(rng() < 0.5 ? GRANITE : SANDSTONE, 1); g.fillEllipse(rx, ry, s * 2, s * 1.1);
  }
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? GRANITE : GRANITE_LIT, 1); g.fillRect(x - 70 - k * 10, y - 8 + k * 5, 140 + k * 20, 6); }
}

/**
 * The Flatbread Stone: Bryn Hearth's bakery, a house hewn into a boulder that split clean in two
 * in some frost before anyone remembers; the bakery fills the crack. Out front stands the stone
 * itself — a griddle slab on four short legs over a bed of coals — with flatbreads stacked on a
 * board, a peel leant on it and a chalked slate of the day's bakes.
 */
export function flatbreadBakery(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x + 16, y + 4, 300, 46, 0.38);
  // The two halves of the split boulder.
  for (const s of [-1, 1]) {
    const hx = x + s * 70;
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (s < 0 ? Math.PI * 0.5 : -Math.PI * 0.5) + (i / 12) * Math.PI * s * -1;
      pts.push({ x: hx + Math.cos(a) * 90, y: y - 90 + Math.sin(a) * 92 });
    }
    const half = [{ x: x + s * 8, y }, ...pts.filter((p) => p.y <= y), { x: x + s * 8, y: y - 170 }];
    g.fillStyle(GRANITE_DEEP, 1); fillPoly(g, half.map((p) => ({ x: p.x + 4, y: p.y + 3 })));
    g.fillStyle(mixC(GRANITE, SANDSTONE, 0.3), 1); fillPoly(g, half);
    for (let k = 0; k < 4; k++) { g.fillStyle(STRATA[(k + 2) % STRATA.length], 0.3); g.fillRect(hx - 85, y - 40 - k * 32, 170, 6); }
    g.fillStyle(GRANITE_LIT, 0.3); g.fillEllipse(hx - 30 * s, y - 110, 50, 80);
    g.fillStyle(MOSS, 0.75); g.fillEllipse(hx, y - 176, 80, 14);
    // A round window each side, warm.
    g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(hx + s * 20, y - 100, 13);
    g.fillStyle(0xffb860, 0.85); g.fillCircle(hx + s * 20, y - 100, 10);
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(hx + s * 20 - 10, y - 100, hx + s * 20 + 10, y - 100); g.lineBetween(hx + s * 20, y - 110, hx + s * 20, y - 90);
  }
  // The crack between them: a timber front with the bakery door, smoke curling out of the top.
  g.fillStyle(0x1a120c, 1); g.fillRect(x - 10, y - 172, 20, 172);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22, y - 80, 44, 80);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 19, y - 76, 38, 76);
  g.fillStyle(0xffc070, 0.4); g.fillRect(x - 15, y - 70, 30, 30);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x, y - 70, x, y - 40); g.lineBetween(x - 15, y - 55, x + 15, y - 55);
  // A sign: a flatbread painted on a disc of slate.
  g.fillStyle(GRANITE_DEEP, 1); g.fillCircle(x, y - 100, 16);
  g.fillStyle(FLATBREAD, 1); g.fillEllipse(x, y - 100, 24, 18);
  for (let i = 0; i < 6; i++) { g.fillStyle(0x8a5a2a, 0.8); g.fillCircle(x - 7 + rng() * 14, y - 104 + rng() * 8, 1.4); }
  // The griddle stone out front.
  const sx = x + 150, sy = y + 30;
  g.fillStyle(COAL, 1); g.fillEllipse(sx, sy - 6, 110, 26);
  for (let i = 0; i < 18; i++) { g.fillStyle(i % 3 ? EMBER : 0xffd080, 0.8); g.fillCircle(sx - 44 + rng() * 88, sy - 10 + rng() * 10, 1.5 + rng() * 2); }
  for (const lx of [-40, 40]) for (const ly of [-6, 4]) { g.fillStyle(GRANITE_DARK, 1); g.fillRect(sx + lx - 5, sy - 24 + ly, 10, 20); }
  g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(sx + 2, sy - 26, 124, 34);
  g.fillStyle(0x5a524a, 1); g.fillEllipse(sx, sy - 30, 120, 30);
  g.fillStyle(0x6e655a, 1); g.fillEllipse(sx - 4, sy - 32, 100, 22);
  g.fillStyle(0xffffff, 0.08); g.fillEllipse(sx - 20, sy - 36, 40, 6);
  // Breads cooking on the stone.
  for (let k = 0; k < 3; k++) {
    const bx = sx - 32 + k * 32, by = sy - 32 + (k % 2) * 4;
    g.fillStyle(0xb8864a, 1); g.fillEllipse(bx, by + 1, 28, 12);
    g.fillStyle(FLATBREAD, 1); g.fillEllipse(bx, by, 26, 10);
    for (let i = 0; i < 4; i++) { g.fillStyle(0x7a4a22, 0.7); g.fillCircle(bx - 8 + rng() * 16, by - 2 + rng() * 4, 1.3); }
  }
  // Board of finished breads, a peel, the slate.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 64, y - 6, 54, 8);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? FLATBREAD : 0xd8b07a, 1); g.fillEllipse(x + 91, y - 9 - k * 4, 44, 9); }
  g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(sx + 70, sy, sx + 52, sy - 70);
  g.fillStyle(TIMBER, 1); g.fillEllipse(sx + 50, sy - 78, 18, 24);
  g.fillStyle(GRANITE_DEEP, 1); g.fillRect(x - 130, y - 54, 40, 30);
  g.fillStyle(0x3a3a40, 1); g.fillRect(x - 128, y - 52, 36, 26);
  g.lineStyle(1, CHALK, 0.8); for (let k = 0; k < 4; k++) g.lineBetween(x - 124, y - 46 + k * 5, x - 100 - (k % 2) * 6, y - 46 + k * 5);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 122, y - 24, x - 126, y); g.lineBetween(x - 98, y - 24, x - 94, y);
}

/**
 * The quarry pool's ground: a rectangular pit quarried in steps, three ledges of cut stone down
 * to the water, drill-marks in the faces where blocks were split out, the water dark and deep
 * and green-blue at its rim. `r` is the water's rect.
 */
export function quarryPool(g: G, r: Rect, rng: () => number): void {
  for (let k = 3; k >= 1; k--) {
    const pad = k * 22;
    const c = STRATA[(k * 2) % STRATA.length];
    g.fillStyle(dim(c, 0.2), 1); g.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
    g.fillStyle(c, 1); g.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, 7);
    g.fillStyle(lit(c, 0.2), 1); g.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, 2);
    g.fillStyle(dim(c, 0.4), 1); g.fillRect(r.x - pad, r.y - pad + 7, r.w + pad * 2, 6);
    // Drill-marks: half-round grooves in the risers.
    for (let d = 10; d < r.w + pad * 2; d += 18) { g.fillStyle(dim(c, 0.5), 0.7); g.fillRect(r.x - pad + d, r.y - pad + 8, 3, 5); }
  }
  g.fillStyle(POOL_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(POOL, 1); g.fillRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
  g.fillStyle(POOL_DEEP, 0.7); g.fillRect(r.x + 40, r.y + 34, r.w - 80, r.h - 60);
  g.fillStyle(POOL_LIT, 0.25); g.fillRect(r.x + 8, r.y + 8, r.w - 16, 6);
  // A sunk block or two showing pale under the surface.
  for (let i = 0; i < 4; i++) {
    const bx = r.x + 30 + rng() * (r.w - 90), by = r.y + 30 + rng() * (r.h - 70);
    g.fillStyle(lit(POOL, 0.15), 0.6); g.fillRect(bx, by, 30 + rng() * 20, 16);
  }
}

/**
 * A fallen menhir: a standing stone lying on its side in a trench of turned earth, its old socket
 * an empty pit beside it — the one the Regent had pulled down because it bore the Old King's mark.
 */
export function fallenMenhir(g: G, x: number, y: number, len: number, rng: () => number): void {
  shadow(g, x + 6, y + 4, len * 1.1, 22);
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y + 2, len * 1.05, 26);
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x - len / 2 + 3, y - 22, len, 26, 12);
  g.fillStyle(GRANITE, 1); g.fillRoundedRect(x - len / 2, y - 26, len, 26, 12);
  g.fillStyle(GRANITE_LIT, 0.45); g.fillRect(x - len / 2 + 10, y - 24, len - 20, 6);
  for (let k = 0; k < 4; k++) { g.lineStyle(3, STRATA[k], 0.3); g.lineBetween(x - len / 2 + 30 + k * len * 0.2, y - 25, x - len / 2 + 24 + k * len * 0.2, y - 1); }
  // The Old King's mark, chiselled half-away: a crown over a circle.
  const mx = x + len * 0.2, my = y - 13;
  g.lineStyle(1.5, GRANITE_DEEP, 0.8); g.strokeCircle(mx, my, 6);
  g.lineBetween(mx - 6, my - 9, mx - 3, my - 13); g.lineBetween(mx - 3, my - 13, mx, my - 9); g.lineBetween(mx, my - 9, mx + 3, my - 13); g.lineBetween(mx + 3, my - 13, mx + 6, my - 9);
  for (let i = 0; i < 9; i++) { g.lineStyle(1, GRANITE_LIT, 0.8); const cx = mx - 8 + rng() * 16, cy = my - 10 + rng() * 16; g.lineBetween(cx, cy, cx + 3, cy + 2); }
  for (let i = 0; i < 5; i++) { g.fillStyle(LICHEN, 0.7); g.fillCircle(x - len * 0.4 + rng() * len * 0.5, y - 20 + rng() * 6, 2 + rng() * 2); }
  // The socket it came out of.
  g.fillStyle(0x2a2016, 1); g.fillEllipse(x - len / 2 - 30, y - 4, 40, 18);
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x - len / 2 - 30, y - 7, 40, 8);
}

/** A small ley stone: a knee-high marker stone with a spiral cut in it. */
export function spiralStone(g: G, x: number, y: number, s: number, glowA = 0): void {
  shadow(g, x + 3, y, 30 * s, 9 * s);
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x - 11 * s + 2, y - 34 * s + 2, 22 * s, 34 * s, 9 * s);
  g.fillStyle(GRANITE, 1); g.fillRoundedRect(x - 11 * s, y - 34 * s, 22 * s, 34 * s, 9 * s);
  g.fillStyle(GRANITE_LIT, 0.4); g.fillRect(x - 9 * s, y - 30 * s, 5 * s, 26 * s);
  g.lineStyle(1.5 * s, glowA > 0 ? mixC(GRANITE_DEEP, LEY, glowA) : GRANITE_DEEP, 1);
  g.beginPath();
  for (let i = 0; i <= 30; i++) {
    const a = i * 0.42, rr = i * 0.26 * s;
    const px = x + Math.cos(a) * rr, py = y - 18 * s + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  if (glowA > 0) glow(g, x, y - 18 * s, 16 * s, LEY, 0.05 * glowA, 2);
}

// ── Animation helpers ────────────────────────────────────────────────

/** A plume of smoke from a smoke hole: soft puffs rising, swelling and thinning in the wind. */
export function smoke(g: G, x: number, y: number, t: number, seed: number, color = 0xb8b0a4): void {
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.22 + i / 6 + seed) % 1;
    const px = x + ph * 26 + Math.sin(t * 0.8 + i + seed * 7) * 5, py = y - ph * 70;
    g.fillStyle(color, 0.3 * (1 - ph)); g.fillCircle(px, py, 4 + ph * 12);
  }
}

/** Heat over the griddle stone: wavering lines and the breads' steam. */
export function hearthHeat(g: G, x: number, y: number, t: number): void {
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.5 + i / 5) % 1;
    const px = x - 40 + i * 20 + Math.sin(t * 3 + i) * 4;
    g.lineStyle(1.5, 0xffffff, 0.18 * (1 - ph));
    g.lineBetween(px, y - ph * 50, px + Math.sin(t * 4 + i) * 4, y - ph * 50 - 10);
  }
  glow(g, x, y + 20, 50, EMBER, 0.03 + Math.sin(t * 5) * 0.01, 3);
}

/** A tithe boulder rolling down the runnel, `k` 0–1 along `pts`. */
export function runnelBoulder(g: G, pts: Pt[], k: number, r: number): void {
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); lens.push(l); total += l; }
  let d = k * total, i = 0;
  while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
  const a = pts[i], b = pts[i + 1] ?? pts[i];
  const f = lens[i] ? d / lens[i] : 0;
  const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
  rollingBoulder(g, x, y, r, k * total / r);
}

/**
 * A round boulder in motion: shadow, body, a band and a crack that rotate with `spin` so it
 * visibly rolls, dust kicked up behind.
 */
export function rollingBoulder(g: G, x: number, y: number, r: number, spin: number, tint = 0): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 4, y + r * 0.8, r * 2.1, r * 0.6);
  const c = tint ? mixC(GRANITE, tint, 0.35) : GRANITE;
  g.fillStyle(dim(c, 0.35), 1); g.fillCircle(x + 1, y + 1, r);
  g.fillStyle(c, 1); g.fillCircle(x, y, r * 0.96);
  // A strata band across the ball, wrapping as it spins.
  const off = Math.sin(spin) * r * 0.6;
  g.fillStyle(SANDSTONE, 0.5); g.fillEllipse(x, y + off, r * 1.8 * Math.sqrt(Math.max(0.05, 1 - (off * off) / (r * r))), r * 0.28);
  // Two cracks riding round.
  for (const k of [0, 2.4]) {
    const a = spin + k;
    if (Math.cos(a) < -0.1) continue;
    g.lineStyle(1.8, GRANITE_DEEP, 0.8);
    const cx = x + Math.sin(a) * r * 0.6, cy = y - r * 0.2;
    g.lineBetween(cx, cy - r * 0.5, cx + r * 0.12, cy); g.lineBetween(cx + r * 0.12, cy, cx - r * 0.05, cy + r * 0.45);
  }
  g.fillStyle(GRANITE_LIT, 0.5); g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.8, r * 0.5);
  g.fillStyle(0xffffff, 0.16); g.fillEllipse(x - r * 0.45, y - r * 0.55, r * 0.3, r * 0.15);
}

/** Dust kicked up: a ring of puffs at x,y, `k` 0–1 through its life. */
export function dustPuff(g: G, x: number, y: number, k: number, r: number, color = DUST): void {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + i * 0.3;
    g.fillStyle(color, 0.45 * (1 - k)); g.fillCircle(x + Math.cos(a) * r * (0.4 + k), y + Math.sin(a) * r * 0.5 * (0.4 + k) - k * 8, r * (0.25 + k * 0.3));
  }
}

/** A chunk of rock flying (scree, spalls): a tumbling triangle. */
export function shard(g: G, x: number, y: number, s: number, spin: number, color = GRANITE): void {
  g.fillStyle(dim(color, 0.35), 1);
  g.fillTriangle(x + Math.cos(spin) * s + 1, y + Math.sin(spin) * s + 1, x + Math.cos(spin + 2.3) * s + 1, y + Math.sin(spin + 2.3) * s + 1, x + Math.cos(spin + 4.2) * s + 1, y + Math.sin(spin + 4.2) * s + 1);
  g.fillStyle(color, 1);
  g.fillTriangle(x + Math.cos(spin) * s, y + Math.sin(spin) * s, x + Math.cos(spin + 2.3) * s, y + Math.sin(spin + 2.3) * s, x + Math.cos(spin + 4.2) * s, y + Math.sin(spin + 4.2) * s);
  g.fillStyle(GRANITE_LIT, 0.6); g.fillCircle(x + Math.cos(spin) * s * 0.4, y + Math.sin(spin) * s * 0.4, s * 0.25);
}

/** A brass tithe weight: a squat bell shape with a ring on top and a stamped number. */
export function titheWeight(g: G, x: number, y: number, s: number): void {
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 8 * s, y - 12 * s, 16 * s, 12 * s, 3 * s);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 7 * s, y - 13 * s, 14 * s, 11 * s, 3 * s);
  g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x - 6 * s, y - 12 * s, 3 * s, 9 * s);
  g.lineStyle(1.5 * s, BRASS_DARK, 1); g.strokeCircle(x, y - 15 * s, 3 * s);
}

/** The ley glow running along a line: a soft band with bright motes travelling along it. */
export function leyLine(g: G, ax: number, ay: number, bx: number, by: number, t: number, a = 1): void {
  g.lineStyle(14, LEY, 0.06 * a); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(6, LEY, 0.16 * a); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(2, lit(LEY, 0.4), 0.55 * a); g.lineBetween(ax, ay, bx, by);
  const len = Math.hypot(bx - ax, by - ay);
  const n = Math.max(2, Math.floor(len / 60));
  for (let i = 0; i < n; i++) {
    const k = ((t / 1600) + i / n) % 1;
    g.fillStyle(0xffffff, 0.7 * a * Math.sin(k * Math.PI)); g.fillCircle(ax + (bx - ax) * k, ay + (by - ay) * k, 2.2);
  }
}

/** The scree's surface sliding: short streaks travelling downhill in a rect. */
export function screeFlow(g: G, r: Rect, t: number, speed: number, n: number, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const x = r.x + ((i * 137 + seed * 31) % 1000) / 1000 * r.w;
    const ph = ((t * speed) / r.h + ((i * 71) % 100) / 100) % 1;
    const y = r.y + ph * r.h;
    g.fillStyle(i % 3 ? GRANITE : SANDSTONE, 0.75); g.fillEllipse(x, y, 4, 3);
    g.lineStyle(1, DUST_LIT, 0.3); g.lineBetween(x, y - 2, x, y - 10);
  }
}
