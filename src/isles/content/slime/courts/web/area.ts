import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, lit, type G } from '../../../../art/IsleArt';
import {
  canopyBank, cocoonCluster, deck, dryingRack, giantSpider, greatLoom, lampPost, lantern, loft, mill, millWheel,
  noticeBoard, orbWeb, plankWalk, podHouse, puppetBooth, puppetsDance, rackSheets, sheet, silkPool, spiderPen, strand,
  tear, titheReel, trunk, webMap, webMapPulse, webWaystone,
} from './art';
import {
  BRUISE, DEW, DROP, DROP_GLINT, GAS, LAMP, LEAF_DARK, PLANK, PLANK_DARK, SILK_DARK, SILK_LIT, SILK_SHADE, WEB_COLOR,
} from './palette';
import { WEB_CROWD, WEB_NPCS } from './npcs';

/**
 * The Web Court — the silk town in the canopy, west of the Fang Court.
 *
 * There is no ground. Read it from the Fang bridge in:
 * • **the Long Strand** (east): the plank bridge in from the Fang Court, the waystone bound in silk,
 *   lamp-posts all the way, Twill & Daughters' pod-house over the bridge and Snare's wires underfoot;
 * • **the plaza** (centre): a great round deck round nothing, the Tithe Reel where every household's
 *   twelve skeins are weighed, the Draught notice — and the **Spymaster's Web**, the map of the isle in
 *   thread, one strand for every informer;
 * • **the Loft** (north): Prince Weft's funnel-web hall in the crown of the greatest trunk;
 * • **the pens** (north-east): the farmed spiders in their lashed-pole pens, Lisle's old Maud at the end;
 * • **the mills** (north-west): treadwheels and spinning frames under silk roofs;
 * • **the racks and the loom** (south-west): sheets drying in rows, the great loom, the cut-off west pod;
 * • **the south bridge** (south): Gepp's puppet theatre, the silk pool, and the ladder down to the
 *   Shackle Court.
 * Underfoot, everywhere, is the Sheet — woven silk over the drop — torn through in places.
 */

export const WEB_W = 2400;
export const WEB_H = 1600;

const STRAND_Y = 800;
const SOUTH_X = 1200;

/** The plaza deck. */
export const PLAZA: Pt = { x: 1200, y: 820 };
const PLAZA_RX = 175, PLAZA_RY = 120;
/** Prince Weft's Loft — base of the funnel. */
export const LOFT: Pt = { x: 1200, y: 300 };
/** The Spymaster's Web (base centre of its frame). */
export const WEB_MAP: Pt = { x: 925, y: 700 };
const MAP_W = 230, MAP_H = 190;
/** The Tithe Reel. */
export const REEL: Pt = { x: 1450, y: 700 };
/** The spinning mill. */
export const MILL: Pt = { x: 440, y: 470 };
const MILL_W = 440;
/** Spider pens, base centres (Maud is in the last). */
export const PENS: Pt[] = [{ x: 1760, y: 470 }, { x: 1990, y: 460 }, { x: 2220, y: 470 }];
const PEN_W = 190;
/** The silk pool — the court's fishing water. */
export const SILK_POOL: Rect = { x: 1580, y: 1130, w: 380, h: 170 };
/** Gepp's puppet theatre. */
export const BOOTH: Pt = { x: 1420, y: 1250 };
/** The great loom by the racks. */
export const LOOM: Pt = { x: 760, y: 1330 };
/** Widow Teasel's pod on the west edge. */
export const TEASEL_POD: Pt = { x: 200, y: 1400 };

/** Drying racks: base centre and width. */
const RACKS: [number, number, number][] = [[340, 1060, 150], [560, 1060, 150], [340, 1240, 150], [560, 1240, 150]];
/** Tears in the Sheet: x, y, r. */
const TEARS: [number, number, number][] = [
  [720, 650, 54], [1000, 1060, 58], [2150, 1200, 66], [300, 700, 42], [1900, 680, 46], [880, 1500, 56], [1720, 1460, 50],
];
/** Giant trunks: x, base y, r. */
const TRUNKS: [number, number, number][] = [
  [130, 330, 40], [800, 300, 44], [1580, 300, 46], [2320, 1010, 40], [120, 980, 38], [1460, 1490, 42], [2300, 300, 36],
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

const tears = TEARS;

// ── Layout ───────────────────────────────────────────────────────────

// The Loft.
addPiece(LOFT.x, LOFT.y, 620, 460, (g, rng) => loft(g, LOFT.x, LOFT.y, 500, 190, rng),
  { kind: 'rect', x: LOFT.x - 240, y: LOFT.y - 46, w: 480, h: 40 });

// The great trunks.
for (const [x, y, r] of TRUNKS) {
  addPiece(x, y, r * 5, 420, (g, rng) => trunk(g, x, y, r, 360, rng, r > 38), { kind: 'circle', x, y: y - r * 0.3, r: r + 4 });
}

// The mill and its wheel.
addPiece(MILL.x, MILL.y, MILL_W + 60, 220, (g, rng) => mill(g, MILL.x, MILL.y, MILL_W, rng),
  { kind: 'rect', x: MILL.x - MILL_W / 2, y: MILL.y - 30, w: MILL_W, h: 30 });

// The Spymaster's Web on the plaza's north-west rim.
addPiece(WEB_MAP.x, WEB_MAP.y, MAP_W + 60, MAP_H + 40, (g, rng) => webMap(g, WEB_MAP.x, WEB_MAP.y, MAP_W, MAP_H, rng),
  { kind: 'rect', x: WEB_MAP.x - MAP_W / 2 - 20, y: WEB_MAP.y - 22, w: MAP_W + 40, h: 22 });

// The Tithe Reel and the Draught notice.
addPiece(REEL.x, REEL.y, 220, 140, (g) => titheReel(g, REEL.x, REEL.y), { kind: 'rect', x: REEL.x - 52, y: REEL.y - 14, w: 160, h: 14 });
addPiece(1420, 960, 90, 120, (g) => noticeBoard(g, 1420, 960), { kind: 'rect', x: 1388, y: 954, w: 64, h: 8 });

// Spider pens along the north-east walk.
PENS.forEach((p) => {
  addPiece(p.x, p.y, PEN_W + 30, 180, (g, rng) => spiderPen(g, p.x, p.y, PEN_W, rng), { kind: 'rect', x: p.x - PEN_W / 2, y: p.y - 40, w: PEN_W, h: 40 });
});

// Twill & Daughters, over the Long Strand, and other pods.
const PODS: [number, number, number, number, number, number, boolean][] = [
  // x, y, w, h, wall, glow, cut
  [1700, 760, 120, 96, 0x8a7656, LAMP, false],
  [1960, 1000, 104, 84, 0x7a6a50, LAMP, false],
  [2200, 1430, 96, 80, 0x8a7656, LAMP, false],
  [620, 900, 96, 80, 0x7e6c52, LAMP, false],
  [1000, 1300, 100, 86, 0x8a7656, LAMP, false],
  [TEASEL_POD.x, TEASEL_POD.y, 104, 84, 0x6e6a5a, 0, true],
];
PODS.forEach(([x, y, w, h, wall, gl, cut], i) => {
  addPiece(x, y, w * 2, h + 120, (g, rng) => podHouse(g, x, y, w, h, { wall, glow: gl, cut, roof: i === 0 ? BRUISE : undefined }, rng),
    { kind: 'rect', x: x - w * 0.55, y: y - 26, w: w * 1.1, h: 26 });
});

// Drying racks (solid only at their poles).
for (const [x, y, w] of RACKS) {
  addPiece(x, y, w + 30, 130, (g) => dryingRack(g, x, y, w));
  solids.push({ kind: 'circle', x: x - w / 2, y: y - 2, r: 7 }, { kind: 'circle', x: x + w / 2, y: y - 2, r: 7 });
}

// The great loom.
addPiece(LOOM.x, LOOM.y, 300, 150, (g) => greatLoom(g, LOOM.x, LOOM.y, 240), { kind: 'rect', x: LOOM.x - 128, y: LOOM.y - 20, w: 256, h: 20 });

// Gepp's theatre.
addPiece(BOOTH.x, BOOTH.y, 170, 200, (g) => puppetBooth(g, BOOTH.x, BOOTH.y), { kind: 'rect', x: BOOTH.x - 64, y: BOOTH.y - 20, w: 128, h: 20 });

// The waystone at the Fang bridge.
addPiece(2210, 880, 60, 90, (g) => webWaystone(g, 2210, 880), { kind: 'circle', x: 2210, y: 874, r: 15 });

// Lamp-posts down the bridges.
const LAMPS: Pt[] = [
  { x: 2100, y: 760 }, { x: 1880, y: 850 }, { x: 1540, y: 760 }, { x: 1290, y: 530 }, { x: 1150, y: 420 },
  { x: 800, y: 860 }, { x: 560, y: 760 }, { x: 1150, y: 1150 }, { x: 1250, y: 1420 }, { x: 1520, y: 1080 },
];
for (const l of LAMPS) addPiece(l.x, l.y, 50, 90, (g) => lampPost(g, l.x, l.y), { kind: 'circle', x: l.x, y: l.y - 2, r: 5 });

// Cocooned tithe-silk hanging off the canopy over the plaza (no footprint: it hangs).
for (const [x, y, n] of [[1060, 640, 4], [1340, 640, 3], [1780, 640, 3], [560, 650, 4]] as [number, number, number][]) {
  addPiece(x, y, 80, 80, (g, rng) => cocoonCluster(g, x, y - 70, n, rng));
}

// The canopy bank along the top: drawn as pieces so it stands behind everything.
addPiece(WEB_W / 2, 70, WEB_W, 100, (g, rng) => canopyBank(g, 0, WEB_W, 70, 70, rng), { kind: 'rect', x: 0, y: 0, w: WEB_W, h: 60 });

// ── Edges ───────────────────────────────────────────────────────────
const GAP = 110;
// West: the Sheet frays into the drop.
solids.push({ kind: 'rect', x: 0, y: 0, w: 30, h: WEB_H });
// East: open at the Fang bridge.
solids.push({ kind: 'rect', x: WEB_W - 30, y: 0, w: 30, h: STRAND_Y - GAP });
solids.push({ kind: 'rect', x: WEB_W - 30, y: STRAND_Y + GAP, w: 30, h: WEB_H - STRAND_Y - GAP });
// South: open at the ladder down to the Shackle Court.
solids.push({ kind: 'rect', x: 0, y: WEB_H - 30, w: SOUTH_X - GAP, h: 30 });
solids.push({ kind: 'rect', x: SOUTH_X + GAP, y: WEB_H - 30, w: WEB_W - SOUTH_X - GAP, h: 30 });

// Tears and the pool keep you to their rims.
for (const [x, y, r] of tears) solids.push({ kind: 'circle', x, y, r: r * 0.9 });
solids.push({ kind: 'rect', x: SILK_POOL.x - 6, y: SILK_POOL.y - 6, w: SILK_POOL.w + 12, h: SILK_POOL.h + 12 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Spiders abseiling up and down out of the canopy on their draglines. */
const ABSEIL: Pt[] = [{ x: 680, y: 760 }, { x: 1560, y: 980 }, { x: 2060, y: 1300 }, { x: 380, y: 1380 }, { x: 1880, y: 330 }];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = WEB_W, H = WEB_H;
    // The drop, everywhere, under it all.
    g.fillStyle(DROP, 1); g.fillRect(0, 0, W, H);
    // The Sheet.
    sheet(g, { x: 18, y: 0, w: W - 18, h: H - 26 }, rng);
    // The frayed west and south edges, the drop showing past them.
    for (let y = 0; y < H; y += 12) {
      const k = rng();
      g.fillStyle(DROP, 1); g.fillRect(0, y, 14 + k * 14, 12);
      g.lineStyle(1, SILK_LIT, 0.5); g.lineBetween(14 + k * 14, y + 6, 4, y + 6 + rng() * 10);
    }
    for (let x = 0; x < W; x += 12) {
      if (Math.abs(x - SOUTH_X) < 80) continue;
      const k = rng();
      g.fillStyle(DROP, 1); g.fillRect(x, H - 14 - k * 16, 12, 30);
      g.lineStyle(1, SILK_LIT, 0.5); g.lineBetween(x + 6, H - 14 - k * 16, x + 4 + rng() * 6, H);
    }
    // Great anchor-cords: the Sheet's main strands, running from trunk to trunk under the town.
    for (let i = 0; i < TRUNKS.length; i++) {
      const [ax, ay] = TRUNKS[i], [bx, by] = TRUNKS[(i + 3) % TRUNKS.length];
      g.lineStyle(5, SILK_DARK, 0.18); g.lineBetween(ax, ay, bx, by);
      g.lineStyle(2, SILK_LIT, 0.35); g.lineBetween(ax, ay - 1, bx, by - 1);
    }
    // Radial strands out of the plaza, like a hub.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.lineStyle(2, SILK_LIT, 0.22); g.lineBetween(PLAZA.x, PLAZA.y, PLAZA.x + Math.cos(a) * 900, PLAZA.y + Math.sin(a) * 600);
    }
    // The tears.
    for (const [x, y, r] of tears) tear(g, x, y, r, rng);
    // The silk pool.
    silkPool(g, SILK_POOL, rng);

    // The bridges.
    plankWalk(g, [{ x: W, y: STRAND_Y }, { x: 1700, y: STRAND_Y }, { x: PLAZA.x + PLAZA_RX - 20, y: PLAZA.y - 6 }], 62, rng);
    plankWalk(g, [{ x: PLAZA.x - PLAZA_RX + 20, y: PLAZA.y }, { x: 560, y: 820 }, { x: 240, y: 820 }], 52, rng);
    plankWalk(g, [{ x: 560, y: 820 }, { x: 560, y: 560 }, { x: 240, y: 560 }], 44, rng);
    plankWalk(g, [{ x: 560, y: 560 }, { x: 680, y: 540 }], 44, rng);
    plankWalk(g, [{ x: 560, y: 820 }, { x: 560, y: 1140 }, { x: 260, y: 1140 }], 44, rng);
    plankWalk(g, [{ x: 560, y: 1140 }, { x: 760, y: 1400 }, { x: 340, y: 1460 }], 40, rng);
    plankWalk(g, [{ x: SOUTH_X, y: PLAZA.y + PLAZA_RY - 14 }, { x: SOUTH_X, y: H }], 56, rng);
    plankWalk(g, [{ x: SOUTH_X, y: 1080 }, { x: 1540, y: 1080 }, { x: 1720, y: 1090 }], 44, rng);
    plankWalk(g, [{ x: SOUTH_X, y: 1300 }, { x: 900, y: 1300 }, { x: 760, y: 1400 }], 40, rng);
    plankWalk(g, [{ x: SOUTH_X, y: PLAZA.y - PLAZA_RY + 14 }, { x: SOUTH_X, y: LOFT.y + 20 }], 60, rng);
    plankWalk(g, [{ x: SOUTH_X, y: 570 }, { x: 2260, y: 570 }], 46, rng);
    plankWalk(g, [{ x: 1980, y: STRAND_Y }, { x: 1960, y: 1010 }], 36, rng);
    plankWalk(g, [{ x: 1720, y: 1090 }, { x: 2060, y: 1340 }, { x: 2200, y: 1440 }], 36, rng);

    // Decks round the trunks, and the plaza deck.
    for (const [x, y, r] of TRUNKS) deck(g, x, y + 6, r * 2.2, rng);
    deck(g, PLAZA.x, PLAZA.y, PLAZA_RX, rng);
    // The plaza's inlay: a woven hub in purple and gold.
    orbWeb(g, PLAZA.x, PLAZA.y, PLAZA_RX * 0.62, SILK_LIT, 0.35, 16, 0.66, 0, 0.1);
    g.lineStyle(3, BRUISE, 0.5); g.strokeEllipse(PLAZA.x, PLAZA.y, PLAZA_RX * 1.4, PLAZA_RY * 1.4);
    // The loft's forecourt deck.
    g.fillStyle(PLANK_DARK, 1); g.fillRect(LOFT.x - 260, LOFT.y - 8, 520, 110);
    for (let x = LOFT.x - 258; x < LOFT.x + 258; x += 12) { g.fillStyle(rng() < 0.3 ? lit(PLANK, 0.15) : PLANK, 1); g.fillRect(x, LOFT.y - 6, 11, 106); }
    g.lineStyle(2, BRUISE, 0.8); g.strokeRect(LOFT.x - 260, LOFT.y - 8, 520, 110);
    // The mill floor apron and the pens' walk.
    g.fillStyle(PLANK_DARK, 0.5); g.fillRect(MILL.x - MILL_W / 2 - 10, MILL.y, MILL_W + 20, 40);
    // Webs lying on the Sheet: old orb webs, felled from the canopy.
    for (let i = 0; i < 14; i++) {
      const x = 80 + rng() * (W - 160), y = 160 + rng() * (H - 260);
      orbWeb(g, x, y, 24 + rng() * 30, SILK_LIT, 0.2, 10, 0.6, 0.3, rng() * 3);
    }
    // The ladder head at the south edge: a frame and the lift-rope going down into the drop.
    g.fillStyle(DROP, 1); g.fillRect(SOUTH_X - 70, H - 26, 140, 26);
    g.lineStyle(3, PLANK_DARK, 1); g.lineBetween(SOUTH_X - 30, H - 26, SOUTH_X - 30, H); g.lineBetween(SOUTH_X + 30, H - 26, SOUTH_X + 30, H);
    for (let y = H - 22; y < H; y += 7) { g.lineStyle(3, PLANK, 1); g.lineBetween(SOUTH_X - 30, y, SOUTH_X + 30, y); }
    // The Fang bridge in from the east: rope rails splay to the edge.
    g.lineStyle(2, SILK_SHADE, 0.6); g.lineBetween(W - 120, STRAND_Y - 40, W, STRAND_Y - 70); g.lineBetween(W - 120, STRAND_Y + 40, W, STRAND_Y + 70);
  },

  pieces,

  animate(g, t, view) {
    // Marsh gas rising out of the tears.
    for (const [x, y, r] of tears) {
      if (!inView(x, y, view)) continue;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.25 + i / 3 + x * 0.001) % 1;
        g.fillStyle(GAS, 0.1 * Math.sin(ph * Math.PI)); g.fillCircle(x + Math.sin(t + i * 2) * r * 0.3, y - ph * r * 0.9, r * (0.25 + ph * 0.4));
      }
      g.fillStyle(DROP_GLINT, 0.25 + Math.sin(t * 2 + x) * 0.15); g.fillEllipse(x + r * 0.3, y + r * 0.1, r * 0.22, r * 0.05);
    }
    // The Spymaster's Web: dew running along the strands.
    if (inView(WEB_MAP.x, WEB_MAP.y - MAP_H / 2, view, 260)) webMapPulse(g, WEB_MAP.x, WEB_MAP.y, MAP_W, MAP_H, t);
    // The mill's treadwheel.
    if (inView(MILL.x, MILL.y, view, 300)) millWheel(g, MILL.x - MILL_W / 2 + 70, MILL.y - 78, t);
    // Sheets swaying on the racks.
    RACKS.forEach(([x, y, w], i) => { if (inView(x, y, view)) rackSheets(g, x, y, w, t, i * 1.7); });
    // The pens' spiders, shifting in their webs; Maud is the big old one, grey about the legs.
    PENS.forEach((p, i) => {
      if (!inView(p.x, p.y, view, 200)) return;
      const shift = Math.sin(t * 0.3 + i * 2) * 12;
      giantSpider(g, p.x + shift, p.y - 92 + Math.cos(t * 0.4 + i) * 4, i === 2 ? 0.62 : 0.5, t * (i === 2 ? 0.6 : 1.4) * (Math.sin(t * 0.3 + i * 2) > 0.9 ? 3 : 0.2), Math.PI / 2 + Math.sin(t * 0.2 + i) * 0.3, false);
    });
    // The silk pool: rings, and the web-skin quivering.
    if (inView(SILK_POOL.x + SILK_POOL.w / 2, SILK_POOL.y + SILK_POOL.h / 2, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        const cx = SILK_POOL.x + 50 + ((i * 113) % (SILK_POOL.w - 100)), cy = SILK_POOL.y + 40 + ((i * 47) % (SILK_POOL.h - 80));
        g.lineStyle(1.2, 0x7a7a52, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 44, 3 + ph * 16);
      }
      const sx = SILK_POOL.x + SILK_POOL.w * 0.7 + Math.sin(t * 0.8) * 20, sy = SILK_POOL.y + SILK_POOL.h * 0.4;
      g.fillStyle(SILK_LIT, 0.6); g.fillEllipse(sx, sy, 6, 2);
    }
    // Puppets on Gepp's stage.
    if (inView(BOOTH.x, BOOTH.y, view, 200)) puppetsDance(g, BOOTH.x, BOOTH.y, t);
    // Spiders abseiling out of the canopy and back.
    ABSEIL.forEach((a, i) => {
      if (!inView(a.x, a.y, view, 300)) return;
      const ph = (Math.sin(t * 0.35 + i * 1.9) + 1) / 2;
      const y = a.y - 260 + ph * 220;
      g.lineStyle(1, SILK_LIT, 0.55); g.lineBetween(a.x, a.y - 420, a.x, y - 10);
      giantSpider(g, a.x, y, 0.3, t * 3, Math.PI / 2, false);
      g.fillStyle(0x000000, 0.12 * ph); g.fillEllipse(a.x, a.y + 8, 40 * ph + 10, 10 * ph + 3);
    });
  },

  animateOver(g, t, view) {
    // Lamplight swelling on the bridges.
    for (const l of LAMPS) {
      if (!inView(l.x, l.y, view)) continue;
      glow(g, l.x + 17, l.y - 54, 26 + Math.sin(t * 3 + l.x) * 3, LAMP, 0.03, 3);
    }
    // Strands hanging down from the canopy along the top, dew sliding on them.
    for (let x = 60; x < WEB_W; x += 170) {
      if (!inView(x, 120, view, 100)) continue;
      const len = 60 + ((x * 37) % 80);
      const sway = Math.sin(t * 0.8 + x) * 4;
      g.lineStyle(1, SILK_LIT, 0.45); g.lineBetween(x, 60, x + sway, 60 + len);
      const ph = (t * 0.4 + x * 0.01) % 1;
      g.fillStyle(DEW, 0.8 * Math.sin(ph * Math.PI)); g.fillCircle(x + sway * ph, 60 + len * ph, 1.6);
    }
    // Guy-lines over the plaza from the trunks, catching the light.
    if (inView(PLAZA.x, PLAZA.y, view, 400)) {
      strand(g, { x: 800, y: 40 }, { x: PLAZA.x, y: PLAZA.y - 260 }, 30, SILK_LIT, 0.22 + Math.sin(t) * 0.05, 1);
      strand(g, { x: 1580, y: 40 }, { x: PLAZA.x, y: PLAZA.y - 260 }, 30, SILK_LIT, 0.22 + Math.sin(t + 1) * 0.05, 1);
      lantern(g, PLAZA.x, PLAZA.y - 250 + Math.sin(t * 0.6) * 3, 1.3, true, 0);
    }
    // The canopy's gloom pooled at the top edge.
    if (view.y < 200) { g.fillStyle(LEAF_DARK, 0.25); g.fillRect(view.x, 0, view.w, 40); }
  },
};

export const WEB_AREA: AreaDef = {
  id: 'web',
  isle: 'slime',
  court: 'web',
  name: 'The Web Court',
  subtitle: 'Every strand is counted, every step is felt',
  w: WEB_W,
  h: WEB_H,
  bg: DROP,
  accent: WEB_COLOR,
  weather: 'gossamer',
  spawn: { x: 2200, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'fang', label: 'Over the Long Strand to the Fang Court' },
    { side: 's', to: 'shackle', label: 'Down the ladder to the Shackle Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2210, y: 905 } },
    { kind: 'prince', id: 'weft', at: { x: LOFT.x, y: LOFT.y + 50 } },
    { kind: 'water', id: 'web-pool', shape: SILK_POOL, fishery: 'web-pool' },
    { kind: 'encounter', id: 'web-silk-lines' },
    { kind: 'encounter', id: 'web-tripwire' },
    { kind: 'encounter', id: 'web-brood' },
    { kind: 'encounter', id: 'web-loom' },
    { kind: 'encounter', id: 'web-marionette' },
    {
      kind: 'sign', at: { x: 2140, y: 860 },
      text: 'THE WEB COURT. Every strand is counted and every step is felt. By order of Prince Weft, Spymaster.',
    },
    {
      kind: 'sign', at: { x: 1060, y: 730 },
      text: 'THE SPYMASTER\'S WEB. One strand for every listener. Do not touch the threads. He will know.',
    },
    {
      kind: 'sign', at: { x: 1530, y: 735 },
      text: 'THE MOULT-TITHE IN SILK. Twelve skeins a household each new moon, on the Reel. Short skeins, short doses.',
    },
    {
      kind: 'sign', at: { x: 1270, y: 1520 },
      text: 'DOWN TO THE SHACKLE COURT. Mind the ladder. Debtors go down. Debtors do not come up.',
    },
    { kind: 'chest', id: 'web-chest-teasel', at: { x: 150, y: 1500 }, coins: 110 },
    { kind: 'chest', id: 'web-chest-loft', at: { x: 1500, y: 400 }, orbs: 2, open: { prince: 'weft' } },
  ],
  npcs: WEB_NPCS,
  crowd: WEB_CROWD,
};
