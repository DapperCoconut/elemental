import type { AreaDef, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, flagstones, glow, groundFill, lit, mixC, road, rock, stroke, type G } from '../../../../art/IsleArt';
import {
  CANVAS, CANVAS_OLD, CANVAS_SHADE, CLIFF, CLIFF_SHADE, FOAM, HEMP, HEM_GOLD, HEM_VELVET,
  OAK_DARK, QUEEN, RED_THREAD, SEA, SEA_DEEP, TAN_SAIL, TAR, TURF, TURF_DRY,
  capstan, chalkLine, cleat, clothBolts, gull, polyline, rope, ropeCoil, sag, stitches, tideMark, windStreaks,
} from './art';
import {
  bollard, cliffStair, cottage, dryingLine, haberdashery, hullOnStocks, jackWheel, jetty, laundryBasket,
  loomHouse, patternHouse, queenForm, quiltFrame, riggingMast, sailBench, sailLoft, spinningJack, stakeHead,
  testRig, traveller, walkHouse, yardstick, type LineSheet,
} from './buildings';
import { ENC_DRYING_LINES, ENC_FULL_SAIL, ENC_LOOM, ENC_PATCHWORK, ENC_ROPE_WALK } from './encounters';
import { FISHERY } from './items';
import { CROWD_BARKS, CROWD_LOOKS, SAILMAKER_NPCS } from './npcs';
import { WARP_COTTAGE } from './quests';

/**
 * The Sailmaker's Court — sail lofts on a cliff-top over the sea.
 *
 * A windswept chalk headland of salt-bleached turf, every inch of it given over to making the
 * Queen's sails. Tarred timber lofts stand along Loft Row with canvas spilling out of their top
 * doors; the long rope walk runs under its lean-to across the north; whole sails hang drying on
 * lines across the green; the brick Loom House clatters in the north-east; the half-built tithe
 * fleet sits on its slipways along the southern cliff edge with its sails half-sewn; riggers
 * train on the masts of the rigging yard; and on Wind Bluff the great test rig fills off the sea.
 * Below the western cliffs, down a timber stair, is Lowstitch Cove — a shingle beach and a
 * jetty, and out in the water the roofs of the forty houses that were left under for the Dry
 * Tithe. In the west, at the end of Loft Row, Prince Hem's Pattern House wears a velvet canopy
 * for a roof.
 *
 * Layout (2400×1600): the Brine Road runs in from the east gate to Yardstick Square in the
 * middle; the Quill Stair runs north from the square to the Inkwell road; the rope walk spurs
 * west off the Quill Stair; Loft Row runs west from the square to the Pattern House; the cove
 * path drops off Loft Row to the cliff stair; the fleet road runs south-east past the quilting
 * yard to the slipways and Wind Bluff; the loom lane climbs north-east to the Loom House.
 */

const W = 2400;
const H = 1600;

// ── Roads ────────────────────────────────────────────────────────────

const BRINE_ROAD: Pt[] = [{ x: 2420, y: 800 }, { x: 2000, y: 790 }, { x: 1700, y: 800 }, { x: 1460, y: 802 }];
const QUILL_STAIR: Pt[] = [{ x: 1200, y: -20 }, { x: 1200, y: 460 }, { x: 1250, y: 700 }];
const ROPE_SPUR: Pt[] = [{ x: 1200, y: 466 }, { x: 1110, y: 466 }];
const LOFT_ROW: Pt[] = [{ x: 1140, y: 818 }, { x: 900, y: 860 }, { x: 640, y: 900 }];
const COVE_PATH: Pt[] = [{ x: 820, y: 872 }, { x: 760, y: 1010 }, { x: 684, y: 1150 }];
const GREEN_WALK: Pt[] = [{ x: 1290, y: 906 }, { x: 1170, y: 980 }, { x: 1000, y: 996 }];
const LOOM_LANE: Pt[] = [{ x: 1420, y: 724 }, { x: 1600, y: 640 }, { x: 1780, y: 590 }];
const FLEET_ROAD: Pt[] = [{ x: 1450, y: 900 }, { x: 1560, y: 1010 }, { x: 1620, y: 1180 }, { x: 1900, y: 1230 }, { x: 2200, y: 1170 }];
const RIG_PATH: Pt[] = [{ x: 2000, y: 790 }, { x: 2090, y: 600 }, { x: 2160, y: 450 }];

const PLAZA: Rect = { x: 1130, y: 690, w: 340, h: 220 };
const FORECOURT: Rect = { x: 228, y: 830, w: 376, h: 150 };
const GREEN: Rect = { x: 820, y: 1010, w: 540, h: 320 };
const QUILT_YARD: Rect = { x: 1600, y: 900, w: 280, h: 150 };
const RIG_YARD: Rect = { x: 1990, y: 260, w: 330, h: 190 };
const WALK: Rect = { x: 180, y: 430, w: 950, h: 70 };
const BEACH: Rect = { x: 64, y: 1246, w: 656, h: 94 };
const COVE: Rect = { x: 20, y: 1345, w: 740, h: 240 };
const BLUFF: Pt = { x: 2270, y: 1080 };

/** The roofs of drowned Lowstitch, poking out of the cove. */
const DROWNED: { x: number; y: number; w: number; chimney: boolean }[] = [
  { x: 110, y: 1470, w: 70, chimney: true }, { x: 250, y: 1540, w: 84, chimney: false },
  { x: 560, y: 1470, w: 76, chimney: true }, { x: 680, y: 1550, w: 64, chimney: false },
  { x: 380, y: 1580, w: 60, chimney: true },
];

// ── Set pieces ───────────────────────────────────────────────────────

interface LoftSpec { x: number; y: number; w: number; h: number; wood: number; sail: number; open: boolean }
const LOFTS: LoftSpec[] = [
  { x: 1010, y: 778, w: 160, h: 220, wood: 0x3e3028, sail: CANVAS, open: true },       // the Great Loft (Oakum)
  { x: 790, y: 824, w: 140, h: 196, wood: 0x4a3a2e, sail: TAN_SAIL, open: true },
  { x: 1900, y: 736, w: 160, h: 230, wood: 0x3a2e26, sail: CANVAS_SHADE, open: true },
  { x: 2140, y: 726, w: 150, h: 206, wood: 0x46382c, sail: CANVAS, open: false },
  { x: 2070, y: 980, w: 150, h: 200, wood: 0x3e3028, sail: TAN_SAIL, open: true },
];

interface CottageSpec { x: number; y: number; w: number; h: number; wall: number; roof: number }
const COTTAGES: CottageSpec[] = [
  { x: 300, y: 250, w: 110, h: 76, wall: 0x6a5a4a, roof: 0x5a4a3a },
  { x: 490, y: 226, w: 100, h: 70, wall: 0x7a6a56, roof: 0x4a3e34 },
  { x: 680, y: 254, w: 110, h: 74, wall: 0x5e5044, roof: 0x5a4a3a },
  { x: 870, y: 232, w: 104, h: 72, wall: 0x6e5e4c, roof: 0x4a3e34 },
  { x: 1050, y: 256, w: 100, h: 70, wall: 0x5a4c40, roof: 0x5a4a3a },
  { x: WARP_COTTAGE.x, y: WARP_COTTAGE.y, w: 104, h: 72, wall: 0x6a5a48, roof: 0x4e4238 },
  { x: 1560, y: 236, w: 110, h: 74, wall: 0x5e5044, roof: 0x4a3e34 },
  { x: 1770, y: 206, w: 104, h: 70, wall: 0x6e5e4c, roof: 0x5a4a3a },
  { x: 2320, y: 566, w: 100, h: 70, wall: 0x5a4c40, roof: 0x4e4238 },
  { x: 180, y: 1110, w: 100, h: 68, wall: 0x6a5a4a, roof: 0x4a3e34 },
  { x: 400, y: 1130, w: 104, h: 70, wall: 0x5e5044, roof: 0x5a4a3a },
];

/** Drying lines on the green: props at ax..bx, foot-line y. */
const LINES: { ax: number; bx: number; y: number; sheets: LineSheet[] }[] = [
  { ax: 850, bx: 1330, y: 1090, sheets: [{ at: 0.18, w: 110, drop: 104, color: CANVAS, billow: 0.5 }, { at: 0.48, w: 120, drop: 110, color: TAN_SAIL, billow: 0.6 }, { at: 0.8, w: 100, drop: 96, color: CANVAS_SHADE, billow: 0.4 }] },
  { ax: 850, bx: 1330, y: 1190, sheets: [{ at: 0.28, w: 130, drop: 112, color: CANVAS_SHADE, billow: 0.7 }, { at: 0.66, w: 124, drop: 106, color: CANVAS, billow: 0.55 }] },
  { ax: 850, bx: 1330, y: 1290, sheets: [{ at: 0.16, w: 96, drop: 92, color: TAN_SAIL, billow: 0.4 }, { at: 0.44, w: 120, drop: 108, color: CANVAS, billow: 0.65 }, { at: 0.76, w: 112, drop: 100, color: CANVAS_SHADE, billow: 0.5 }] },
];

const HULLS: { x: number; y: number; len: number; dir: 1 | -1; done: number }[] = [
  { x: 1480, y: 1386, len: 270, dir: 1, done: 0.72 },
  { x: 1770, y: 1390, len: 250, dir: -1, done: 0.46 },
  { x: 2040, y: 1386, len: 220, dir: 1, done: 0.16 },
];

const QUILTS: { x: number; y: number; w: number; d: number }[] = [
  { x: 1660, y: 980, w: 110, d: 46 }, { x: 1810, y: 960, w: 100, d: 44 }, { x: 1720, y: 1044, w: 120, d: 40 },
];

const STAKES: number[] = [330, 450, 570, 690, 810, 930];
const RIG_MASTS: { x: number; y: number; h: number }[] = [{ x: 2080, y: 340, h: 300 }, { x: 2250, y: 390, h: 260 }];
const COILS: Pt[] = [{ x: 1150, y: 520 }, { x: 260, y: 512 }, { x: 1560, y: 1240 }, { x: 2140, y: 300 }, { x: 470, y: 1320 }, { x: 1930, y: 1250 }];
const CAPSTANS: Pt[] = [{ x: 1640, y: 1340 }, { x: 1920, y: 1340 }];
const BOLLARDS: Pt[] = [{ x: 2210, y: 830 }, { x: 2210, y: 770 }, { x: 760, y: 1250 }];
const BOLT_STACKS: Pt[] = [{ x: 1090, y: 776 }, { x: 1980, y: 742 }, { x: 1474, y: 732 }];
const BENCHES: Pt[] = [{ x: 940, y: 790 }, { x: 1820, y: 745 }, { x: 1600, y: 1110 }];
const BASKETS: Pt[] = [{ x: 1340, y: 1010 }, { x: 860, y: 1000 }, { x: 1110, y: 1330 }];
const BLUFF_CLEATS: Pt[] = [{ x: 2330, y: 1200 }, { x: 2140, y: 1240 }];

/** Animated bits, reported by the pieces as they bake. Keyed so a re-bake never doubles them. */
const PENNANTS: { p: Pt; color: number; len: number }[] = [];
const HOISTS: Pt[] = [];
const CHIMNEYS: Pt[] = [];
let JACK_HUB: Pt | null = null;
const seen = new Set<string>();
const once = (tag: string, p: Pt): boolean => {
  const k = `${tag}:${Math.round(p.x)},${Math.round(p.y)}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
};
const addPennant = (p: Pt, color: number, len: number): void => { if (once('p', p)) PENNANTS.push({ p, color, len }); };

// ── Solids ───────────────────────────────────────────────────────────

const foot = (x: number, y: number, w: number, d = 40): Solid => ({ kind: 'rect', x: x - w / 2, y: y - d, w, h: d });

const SOLIDS: Solid[] = [
  // The sea and the cliffs.
  { kind: 'rect', x: 0, y: 0, w: 62, h: 1250 },
  { kind: 'rect', x: 62, y: 1172, w: 576, h: 72 },              // cliff face above the beach
  { kind: 'rect', x: 726, y: 1172, w: 56, h: 270 },             // cove's east cliff
  { kind: 'rect', x: 0, y: 1338, w: 392, h: 262 },              // cove water (west of the jetty)
  { kind: 'rect', x: 458, y: 1338, w: 324, h: 262 },            // cove water (east of the jetty)
  { kind: 'rect', x: 392, y: 1432, w: 66, h: 168 },             // beyond the jetty's end
  { kind: 'rect', x: 782, y: 1420, w: 1618, h: 180 },           // the southern cliff and the sea
  // Buildings at their footings.
  ...LOFTS.map((l) => foot(l.x, l.y, l.w, 44)),
  ...COTTAGES.map((c) => foot(c.x, c.y, c.w, 34)),
  foot(400, 820, 380, 56),                                       // the Pattern House
  { kind: 'circle', x: 580, y: 934, r: 40 },                     // the Queen's form
  foot(1780, 540, 440, 52),                                      // the Loom House
  foot(1560, 742, 170, 40),                                      // Selvedge & Daughters
  { kind: 'circle', x: 1300, y: 776, r: 34 },                    // the Yardstick
  { kind: 'rect', x: 170, y: 330, w: 960, h: 92 },               // the rope-walk house
  { kind: 'circle', x: 214, y: 462, r: 36 },                     // the spinning jack
  ...HULLS.map((h) => foot(h.x, h.y, h.len * 0.9, 44)),
  { kind: 'circle', x: BLUFF.x, y: BLUFF.y - 6, r: 24 },         // test rig
  ...RIG_MASTS.map((m): Solid => ({ kind: 'circle', x: m.x, y: m.y - 4, r: 16 })),
  ...QUILTS.map((q) => foot(q.x, q.y, q.w, 20)),
  ...LINES.flatMap((l): Solid[] => [{ kind: 'circle', x: l.ax, y: l.y, r: 9 }, { kind: 'circle', x: l.bx, y: l.y, r: 9 }]),
  ...CAPSTANS.map((c): Solid => ({ kind: 'circle', x: c.x, y: c.y - 4, r: 18 })),
];

// ── Painter ──────────────────────────────────────────────────────────

/** Cliff face: a band of chalk strata with a turf lip on top and a shadowed foot. */
function cliffBand(g: G, x0: number, x1: number, y0: number, y1: number, rng: () => number): void {
  g.fillStyle(CLIFF_SHADE, 1); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0 + 6; y < y1; y += 9) {
    g.fillStyle(rng() < 0.5 ? CLIFF : mixC(CLIFF, CLIFF_SHADE, 0.4), 0.9);
    g.fillRect(x0, y, x1 - x0, 5);
  }
  for (let x = x0; x < x1; x += 12 + rng() * 16) {
    g.lineStyle(1.5, dim(CLIFF_SHADE, 0.3), 0.6); g.lineBetween(x, y0 + 4, x + (rng() - 0.5) * 8, y1);
  }
  // Turf lip, ragged.
  g.fillStyle(dim(TURF, 0.15), 1); g.fillRect(x0, y0 - 4, x1 - x0, 8);
  for (let x = x0; x < x1; x += 8) { g.fillStyle(TURF, 1); g.fillTriangle(x, y0 + 2, x + 8, y0 + 2, x + 4, y0 + 7 + rng() * 6); }
}

function sea(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(SEA_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 3000; i++) {
    g.fillStyle(rng() < 0.5 ? SEA : lit(SEA_DEEP, 0.08), 0.5);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 40 + rng() * 90, 6 + rng() * 8);
  }
}

function ground(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, TURF, mixC(TURF, TURF_DRY, 0.5), dim(TURF, 0.4), rng, 1.1);

  // Wind-combed grass: little leaning strokes everywhere, all bent the same way off the sea.
  for (let i = 0; i < 2200; i++) {
    const x = rng() * W, y = rng() * H;
    g.lineStyle(1, rng() < 0.5 ? lit(TURF, 0.18) : dim(TURF, 0.2), 0.55);
    g.lineBetween(x, y, x + 5, y - 4);
  }
  // Sea-pinks and gorse in tufts.
  for (let i = 0; i < 160; i++) {
    const x = 80 + rng() * (W - 160), y = 40 + rng() * 1300;
    if (rng() < 0.5) { g.fillStyle(0xe890b0, 0.8); g.fillCircle(x, y, 2 + rng() * 1.5); g.fillCircle(x + 3, y + 1, 1.8); }
    else { blob(g, x, y, 10 + rng() * 8, 6 + rng() * 4, 0x5a6a38, 0.8, rng); g.fillStyle(0xe8c840, 0.9); g.fillCircle(x - 2, y - 2, 1.6); g.fillCircle(x + 3, y, 1.4); }
  }

  // The sea: the west, the southern band, and the cove.
  sea(g, { x: 0, y: 0, w: 46, h: 1260 }, rng);
  sea(g, { x: 0, y: 1330, w: W, h: H - 1330 }, rng);
  cliffBand(g, 40, 64, 0, 1250, rng);
  // The southern cliff (east of the cove): strata dropping to the sea.
  cliffBand(g, 782, W, 1410, 1452, rng);
  // The cove's back wall above the beach, and its east wall.
  cliffBand(g, 62, 652, 1170, 1246, rng);
  cliffBand(g, 714, 782, 1170, 1440, rng);
  // The shingle beach.
  g.fillStyle(0xb8ac94, 1); g.fillRect(BEACH.x, BEACH.y, BEACH.w, BEACH.h);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle(rng() < 0.4 ? 0x9a9080 : rng() < 0.7 ? 0xd0c8b4 : 0x7a7466, 0.9);
    g.fillEllipse(BEACH.x + rng() * BEACH.w, BEACH.y + rng() * BEACH.h, 3 + rng() * 4, 2 + rng() * 3);
  }
  // Wrack line: kelp, rope-ends, a lost peg.
  for (let x = BEACH.x + 10; x < BEACH.x + BEACH.w - 10; x += 14 + rng() * 20) {
    g.lineStyle(2, 0x3a4a2a, 0.8); g.lineBetween(x, BEACH.y + BEACH.h - 8, x + 8 + rng() * 6, BEACH.y + BEACH.h - 6 + rng() * 4);
  }
  g.fillStyle(FOAM, 0.6); g.fillRect(BEACH.x, BEACH.y + BEACH.h - 4, BEACH.w, 6);

  // Drowned Lowstitch: roofs and chimneys out in the cove.
  for (const d of DROWNED) {
    g.fillStyle(dim(SEA_DEEP, 0.3), 0.8); g.fillEllipse(d.x, d.y + 6, d.w * 1.3, 14);
    g.fillStyle(0x3a3a3e, 1); g.fillTriangle(d.x - d.w / 2, d.y, d.x + d.w / 2, d.y, d.x, d.y - d.w * 0.38);
    g.fillStyle(0x52525a, 1); g.fillTriangle(d.x - d.w / 2 + 6, d.y - 2, d.x + d.w / 2 - 6, d.y - 2, d.x, d.y - d.w * 0.34);
    for (let k = 1; k < 4; k++) { g.lineStyle(1, 0x2a2a2e, 0.8); g.lineBetween(d.x - d.w / 2 + k * 6, d.y - k * 4, d.x + d.w / 2 - k * 6, d.y - k * 4); }
    if (d.chimney) { g.fillStyle(0x6a4a3a, 1); g.fillRect(d.x + d.w * 0.18, d.y - d.w * 0.42, 9, 16); }
    // Weed hung on the ridge.
    g.lineStyle(2, 0x3a5a2a, 0.8); g.lineBetween(d.x - 6, d.y - d.w * 0.36, d.x - 9, d.y - d.w * 0.2);
    g.fillStyle(FOAM, 0.5); g.fillRect(d.x - d.w / 2 - 4, d.y - 1, d.w + 8, 2);
  }

  // Roads: chalky, hoof-and-boot-worn tracks, with tar-dark ruts where the sail carts run.
  const fill = 0xd8cfb4, edge = 0x9a9078, stone = 0xc4ba9c;
  road(g, BRINE_ROAD, 104, fill, edge, stone, rng);
  road(g, QUILL_STAIR, 96, fill, edge, stone, rng);
  road(g, LOFT_ROW, 96, fill, edge, stone, rng);
  road(g, ROPE_SPUR, 72, fill, edge, stone, rng);
  road(g, COVE_PATH, 70, fill, edge, stone, rng);
  road(g, GREEN_WALK, 70, fill, edge, stone, rng);
  road(g, LOOM_LANE, 80, fill, edge, stone, rng);
  road(g, FLEET_ROAD, 90, fill, edge, stone, rng);
  road(g, RIG_PATH, 66, fill, edge, stone, rng);
  for (const pts of [BRINE_ROAD, LOFT_ROW, FLEET_ROAD]) {
    for (const off of [-16, 16]) stroke(g, pts.map((p) => ({ x: p.x, y: p.y + off })), 4, dim(fill, 0.3), 0.4);
  }

  // The rope walk: a long packed strip, stained with tar and worn by backward feet.
  g.fillStyle(0xc4b89a, 1); g.fillRect(WALK.x, WALK.y, WALK.w, WALK.h);
  g.fillStyle(0xd8ceb0, 1); g.fillRect(WALK.x, WALK.y + 4, WALK.w, WALK.h - 8);
  for (let x = WALK.x + 10; x < WALK.x + WALK.w - 10; x += 22 + rng() * 10) {
    g.fillStyle(0x8a7e66, 0.5); g.fillEllipse(x, WALK.y + WALK.h / 2 + (rng() - 0.5) * 30, 7, 4);
    if (rng() < 0.2) blob(g, x, WALK.y + WALK.h / 2, 18, 8, TAR, 0.25, rng);
  }
  // Yarn laid along the walk on the ground.
  for (const off of [-12, 0, 12]) rope(g, [{ x: WALK.x + 40, y: WALK.y + WALK.h / 2 + off }, { x: WALK.x + WALK.w - 30, y: WALK.y + WALK.h / 2 + off }], 2, HEMP, 0.85);

  // Yardstick Square.
  flagstones(g, PLAZA, 34, 0xd8d0bc, 0x8a826e, rng);
  g.lineStyle(3, QUEEN, 0.5); g.strokeCircle(1300, 790, 82);
  // A yard and an ell inlaid in brass across the square, side by side, so nobody can say they were not warned.
  g.lineStyle(4, HEM_GOLD, 0.8); g.lineBetween(1150, 892, 1150 + 108, 892);
  g.lineStyle(4, QUEEN, 0.8); g.lineBetween(1150, 902, 1150 + 135, 902);
  tideMark(g, 1300, 790, 46, QUEEN, 0.35);

  // The Pattern House forecourt: pale flags with a chalked pattern piece and a gold tape inlay.
  flagstones(g, FORECOURT, 38, 0xe8e2d2, 0xa49c8a, rng);
  g.lineStyle(3, HEM_GOLD, 0.75); g.strokeRect(FORECOURT.x + 10, FORECOURT.y + 10, FORECOURT.w - 20, FORECOURT.h - 20);
  for (let x = FORECOURT.x + 14; x < FORECOURT.x + FORECOURT.w - 14; x += 9) { g.lineStyle(1, HEM_VELVET, 0.7); g.lineBetween(x, FORECOURT.y + 10, x, FORECOURT.y + 15); }
  const pc: Pt[] = [{ x: 300, y: 900 }, { x: 360, y: 860 }, { x: 440, y: 860 }, { x: 500, y: 900 }, { x: 470, y: 960 }, { x: 330, y: 960 }];
  for (let i = 0; i < pc.length; i++) chalkLine(g, pc[i].x, pc[i].y, pc[(i + 1) % pc.length].x, pc[(i + 1) % pc.length].y, 0.6);

  // The drying green: lusher turf, worn paths under each line, pegs dropped in the grass.
  blob(g, GREEN.x + GREEN.w / 2, GREEN.y + GREEN.h / 2, GREEN.w * 0.56, GREEN.h * 0.6, lit(TURF, 0.1), 0.6, rng, 14);
  for (const l of LINES) {
    g.fillStyle(mixC(TURF, TURF_DRY, 0.7), 0.6); g.fillRect(l.ax, l.y - 10, l.bx - l.ax, 20);
  }
  for (let i = 0; i < 30; i++) {
    const x = GREEN.x + rng() * GREEN.w, y = GREEN.y + rng() * GREEN.h;
    g.fillStyle(0xc8a46e, 0.9); g.fillRect(x, y, 3, 8);
  }

  // The quilting yard: beaten earth strewn with offcuts.
  g.fillStyle(0xb8a884, 0.85); g.fillRoundedRect(QUILT_YARD.x, QUILT_YARD.y, QUILT_YARD.w, QUILT_YARD.h, 20);
  const scrap = [0xd85a7a, 0x5a9ad8, CANVAS, TAN_SAIL, QUEEN, HEM_GOLD];
  for (let i = 0; i < 40; i++) {
    g.fillStyle(scrap[i % scrap.length], 0.8);
    g.fillRect(QUILT_YARD.x + rng() * QUILT_YARD.w, QUILT_YARD.y + rng() * QUILT_YARD.h, 5 + rng() * 6, 3 + rng() * 5);
  }

  // The slipways: tarred launch-ways from each hull down to the cliff edge.
  for (const h of HULLS) {
    g.fillStyle(0x9a8a6a, 0.6); g.fillRect(h.x - h.len * 0.48, h.y - 50, h.len * 0.96, 1420 - (h.y - 50));
    for (const off of [-0.28, 0.28]) {
      g.fillStyle(TAR, 1); g.fillRect(h.x + h.len * off - 7, h.y - 30, 14, 1430 - (h.y - 30));
      g.fillStyle(lit(TAR, 0.2), 1); g.fillRect(h.x + h.len * off - 7, h.y - 30, 14, 2);
      for (let y = h.y - 26; y < 1420; y += 14) { g.fillStyle(OAK_DARK, 1); g.fillRect(h.x + h.len * off - 12, y, 24, 4); }
    }
    // Wood shavings and dropped treenails.
    for (let i = 0; i < 26; i++) {
      g.fillStyle(rng() < 0.5 ? 0xe8c890 : 0xb89060, 0.8);
      g.fillEllipse(h.x + (rng() - 0.5) * h.len * 1.1, h.y - 70 - rng() * 110, 6, 3);
    }
  }

  // The rigging yard: sand, with chalked climbing marks.
  g.fillStyle(0xd0c09a, 0.85); g.fillRoundedRect(RIG_YARD.x, RIG_YARD.y, RIG_YARD.w, RIG_YARD.h, 24);
  for (let i = 0; i < 300; i++) { g.fillStyle(0xa89870, 0.4); g.fillCircle(RIG_YARD.x + rng() * RIG_YARD.w, RIG_YARD.y + rng() * RIG_YARD.h, 1.2); }

  // Wind Bluff: bare rock where the turf has been blown off.
  blob(g, BLUFF.x, BLUFF.y + 60, 180, 110, 0xa8a090, 0.7, rng, 12);
  for (let i = 0; i < 14; i++) rock(g, BLUFF.x - 160 + rng() * 300, BLUFF.y - 10 + rng() * 150, 6 + rng() * 10, 0x8a8478, rng);

  // The cove stair, the jetty and the Lowstitch tide-marks on the cliff — how high the water came.
  cliffStair(g, 682, 1146, 1252);
  jetty(g, 425, 1330, 102, 64);
  for (let k = 0; k < 3; k++) { g.lineStyle(2, dim(CLIFF_SHADE, 0.4), 0.7); g.lineBetween(70, 1190 + k * 16, 640, 1192 + k * 16); }
}

const PIECES: NonNullable<AreaDef['painter']['pieces']> = [
  ...LOFTS.map((l) => ({
    x: l.x, y: l.y, w: l.w + 40, h: l.h + l.w * 0.5 + 50,
    draw: (g: G, rng: () => number) => { const tip = sailLoft(g, l.x, l.y, l.w, l.h, { wood: l.wood, sail: l.sail, open: l.open, glow: 0xffd890 }, rng); if (once('h', tip)) HOISTS.push(tip); },
  })),
  ...COTTAGES.map((c) => ({
    x: c.x, y: c.y, w: c.w + 30, h: c.h * 1.8 + 10,
    draw: (g: G, rng: () => number) => { cottage(g, c.x, c.y, c.w, c.h, c.wall, c.roof, rng); },
  })),
  {
    x: 400, y: 820, w: 470, h: 350,
    draw: (g, rng) => addPennant(patternHouse(g, 400, 820, rng), HEM_GOLD, 46),
  },
  { x: 580, y: 940, w: 100, h: 220, draw: (g) => queenForm(g, 580, 940) },
  {
    x: 1780, y: 540, w: 470, h: 330,
    draw: (g, rng) => { const c = loomHouse(g, 1780, 540, rng); if (once('c', c)) CHIMNEYS.push(c); },
  },
  { x: 1560, y: 742, w: 220, h: 170, draw: (g, rng) => { haberdashery(g, 1560, 742, rng); } },
  { x: 1300, y: 780, w: 110, h: 270, draw: (g) => addPennant(yardstick(g, 1300, 780), QUEEN, 30) },
  { x: (WALK.x + WALK.x + WALK.w) / 2, y: 420, w: WALK.w + 40, h: 140, draw: (g, rng) => walkHouse(g, WALK.x - 10, WALK.x + WALK.w, 420, rng) },
  {
    x: 214, y: 470, w: 120, h: 150,
    draw: (g) => { const hub = spinningJack(g, 214, 470); JACK_HUB = hub; },
  },
  { x: 700, y: 470, w: 90, h: 70, draw: (g) => traveller(g, 700, 470) },
  ...STAKES.map((x) => ({ x, y: 506, w: 40, h: 50, draw: (g: G) => stakeHead(g, x, 506) })),
  ...LINES.map((l) => ({
    x: (l.ax + l.bx) / 2, y: l.y, w: l.bx - l.ax + 100, h: 190,
    draw: (g: G, rng: () => number) => dryingLine(g, l.ax, l.bx, l.y, 150, l.sheets, rng),
  })),
  ...QUILTS.map((q) => ({
    x: q.x, y: q.y, w: q.w + 30, h: q.d + 50,
    draw: (g: G, rng: () => number) => quiltFrame(g, q.x, q.y, q.w, q.d, [0xd85a7a, 0x5a9ad8, CANVAS, HEM_GOLD, QUEEN, 0x8a5a9a], rng),
  })),
  ...HULLS.map((h) => ({
    x: h.x, y: h.y, w: h.len + 180, h: 420,
    draw: (g: G, rng: () => number) => { for (const m of hullOnStocks(g, h.x, h.y, h.len, h.dir, h.done, rng)) addPennant(m, QUEEN, 34); },
  })),
  { x: BLUFF.x, y: BLUFF.y, w: 300, h: 340, draw: (g) => addPennant(testRig(g, BLUFF.x, BLUFF.y), RED_THREAD, 40) },
  ...RIG_MASTS.map((m) => ({ x: m.x, y: m.y, w: 160, h: m.h + 20, draw: (g: G) => addPennant(riggingMast(g, m.x, m.y, m.h), TAN_SAIL, 28) })),
  ...COILS.map((c) => ({ x: c.x, y: c.y, w: 50, h: 30, draw: (g: G) => ropeCoil(g, c.x, c.y, 15) })),
  ...CAPSTANS.map((c) => ({ x: c.x, y: c.y, w: 70, h: 70, draw: (g: G) => capstan(g, c.x, c.y, 16) })),
  ...BOLLARDS.map((b) => ({ x: b.x, y: b.y, w: 30, h: 34, draw: (g: G) => bollard(g, b.x, b.y) })),
  ...BOLT_STACKS.map((b) => ({ x: b.x, y: b.y, w: 80, h: 70, draw: (g: G) => clothBolts(g, b.x, b.y, [CANVAS, CANVAS_SHADE, TAN_SAIL, CANVAS, QUEEN, CANVAS_OLD]) })),
  ...BENCHES.map((b) => ({ x: b.x, y: b.y, w: 100, h: 40, draw: (g: G) => sailBench(g, b.x, b.y) })),
  ...BASKETS.map((b) => ({ x: b.x, y: b.y, w: 50, h: 50, draw: (g: G) => laundryBasket(g, b.x, b.y) })),
  ...BLUFF_CLEATS.map((c) => ({ x: c.x, y: c.y, w: 40, h: 30, draw: (g: G) => cleat(g, c.x, c.y, 10) })),
];

const inView = (v: Rect, x: number, y: number, m: number): boolean => x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

function animate(g: G, t: number, view: Rect): void {
  // The sea: whitecaps marching in, glints, surf on the cliff foot and on the beach.
  if (view.y + view.h > 1320 || view.x < 80) {
    for (let i = 0; i < 70; i++) {
      const x = ((i * 233 + t * 22) % (W + 200)) - 100;
      const y = 1460 + ((i * 97) % 140);
      if (!inView(view, x, y, 40)) continue;
      const ph = (t * 0.5 + i * 0.13) % 1;
      g.fillStyle(FOAM, 0.35 * Math.sin(ph * Math.PI)); g.fillEllipse(x, y, 30 + ph * 26, 3);
    }
    // Surf at the southern cliff foot.
    for (let x = 790; x < W; x += 40) {
      if (!inView(view, x, 1450, 60)) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 1.4 + x * 0.03);
      g.fillStyle(FOAM, 0.25 + 0.35 * k); g.fillEllipse(x + Math.sin(t + x) * 6, 1456 + k * 4, 46, 7 + k * 4);
    }
    // Waves running up the shingle.
    if (inView(view, BEACH.x + BEACH.w / 2, BEACH.y + BEACH.h, BEACH.w)) {
      const reach = Math.sin(t * 0.9) * 0.5 + 0.5;
      g.fillStyle(FOAM, 0.35 + reach * 0.2);
      for (let x = BEACH.x; x < BEACH.x + BEACH.w; x += 30) g.fillEllipse(x + 15, BEACH.y + BEACH.h - 2 - reach * 10 + Math.sin(x * 0.07 + t) * 2, 34, 5);
      // Ripples round the drowned roofs.
      for (const d of DROWNED) {
        if (!inView(view, d.x, d.y, 80)) continue;
        for (let k = 0; k < 2; k++) {
          const ph = (t * 0.4 + k * 0.5 + d.x * 0.01) % 1;
          g.lineStyle(1.5, FOAM, 0.5 * (1 - ph)); g.strokeEllipse(d.x, d.y + 2, d.w * (1 + ph * 0.6), 10 + ph * 8);
        }
      }
    }
    // West-edge surf.
    for (let y = 30; y < 1250; y += 46) {
      if (!inView(view, 30, y, 40)) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 1.2 + y * 0.05);
      g.fillStyle(FOAM, 0.2 + 0.3 * k); g.fillEllipse(40 + k * 4, y, 8, 30);
    }
  } else {
    for (let y = 30; y < 1250; y += 46) {
      if (!inView(view, 30, y, 40)) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 1.2 + y * 0.05);
      g.fillStyle(FOAM, 0.2 + 0.3 * k); g.fillEllipse(40 + k * 4, y, 8, 30);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Pennants on every mast-head, all streaming off the sea.
  for (const p of PENNANTS) {
    if (!inView(view, p.p.x, p.p.y, 80)) continue;
    const pts: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      pts.push({ x: p.p.x + p.len * f, y: p.p.y - 2 + Math.sin(t * 7 - f * 5 + p.p.x) * 4 * f - f * 4 });
    }
    polyline(g, pts, 5, dim(p.color, 0.3), 0.9);
    polyline(g, pts, 3.5, p.color, 1);
  }
  // Hoist blocks swaying under the loft beams.
  for (const h of HOISTS) {
    if (!inView(view, h.x, h.y, 80)) continue;
    const sw = Math.sin(t * 1.3 + h.x) * 5;
    g.lineStyle(1.5, TAR, 0.9); g.lineBetween(h.x, h.y, h.x + sw, h.y + 36);
    g.fillStyle(OAK_DARK, 1); g.fillRoundedRect(h.x + sw - 5, h.y + 36, 10, 14, 3);
    g.lineStyle(1.2, HEMP, 1); g.lineBetween(h.x + sw, h.y + 50, h.x + sw * 1.4, h.y + 64);
  }
  // The spinning jack's wheel turning.
  if (JACK_HUB && inView(view, JACK_HUB.x, JACK_HUB.y, 80)) jackWheel(g, JACK_HUB, t * 1.6);
  // Loom House chimney smoke, blown inland.
  for (const c of CHIMNEYS) {
    if (!inView(view, c.x, c.y, 200)) continue;
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.3 + i / 7) % 1;
      g.fillStyle(0xc8c8c8, 0.32 * (1 - ph));
      g.fillCircle(c.x - ph * 70 + Math.sin(t + i) * 6, c.y - 6 - ph * 70, 7 + ph * 16);
    }
  }
  // The great test sail breathing on Wind Bluff.
  if (inView(view, BLUFF.x, BLUFF.y - 160, 200)) {
    const k = 0.5 + 0.5 * Math.sin(t * 0.8);
    windStreaks(g, BLUFF.x - 200, BLUFF.y - 260, 400, 220, t, -Math.PI * 0.92, 10, 160, 0.25 + 0.2 * k, 7);
  }
  // Gulls over the cove and the cliffs.
  for (let i = 0; i < 7; i++) {
    const cx = i < 4 ? 400 : 1600 + i * 120, cy = i < 4 ? 1380 : 1360;
    const a = t * (0.35 + (i % 3) * 0.1) + i * 1.9;
    const x = cx + Math.cos(a) * (160 + i * 14), y = cy - 120 + Math.sin(a) * 50;
    if (!inView(view, x, y, 30)) continue;
    gull(g, x, y, t, i * 2.3);
  }
  // Shadow of a gull now and then, on the green.
  if (inView(view, GREEN.x + GREEN.w / 2, GREEN.y + GREEN.h / 2, GREEN.w)) {
    const x = GREEN.x + ((t * 60) % (GREEN.w + 200)) - 100, y = GREEN.y + 120 + Math.sin(t * 0.3) * 80;
    g.fillStyle(0x000000, 0.12); g.fillEllipse(x, y, 26, 6);
  }
  // A faint stitched glint along the drying lines: the wind combing the sheets.
  for (const l of LINES) {
    if (!inView(view, (l.ax + l.bx) / 2, l.y - 150, l.bx - l.ax)) continue;
    const pts = sag({ x: l.ax, y: l.y - 150 }, { x: l.bx, y: l.y - 150 }, 26, 12);
    const k = ((t * 0.25 + l.y * 0.001) % 1);
    const i = Math.floor(k * (pts.length - 1));
    g.fillStyle(0xffffff, 0.5); g.fillCircle(pts[i].x, pts[i].y, 2);
  }
  // A lantern glow on the Pattern House portico, steady and expensive.
  if (inView(view, 400, 760, 120)) { glow(g, 354, 740, 26, HEM_GOLD, 0.05, 3); glow(g, 446, 740, 26, HEM_GOLD, 0.05, 3); }
  // Red twine fluttering from the Yardstick's notches.
  if (inView(view, 1300, 650, 120)) {
    for (let i = 0; i < 4; i++) {
      const y = 700 - i * 42;
      stitches(g, 1308, y, 1326 + Math.sin(t * 6 + i) * 4, y + 4, RED_THREAD, 1.5, 4, 2, 0.9);
    }
  }
}

export const SAILMAKER_AREA: AreaDef = {
  id: 'sailmaker',
  isle: 'water',
  court: 'sailmaker',
  name: 'The Sailmaker\'s Court',
  subtitle: 'A yard a head, a head a day',
  w: W,
  h: H,
  bg: SEA_DEEP,
  accent: 0xc8323a,
  weather: 'spray',
  spawn: { x: 2250, y: 800 },
  painter: { ground, pieces: PIECES, animate, animateOver },
  solids: SOLIDS,
  exits: [
    { side: 'n', to: 'inkwell', label: 'The Quill Stair — to the Inkwell Court' },
    { side: 'e', to: 'brinehollow', label: 'The Brine Road — to Brinehollow' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2252, y: 754 } },
    { kind: 'sign', at: { x: 2310, y: 726 }, text: 'THE SAILMAKER\'S COURT. A yard a head, a head a day, at the Yardstick by dusk. — by order of the Measurers' },
    { kind: 'sign', at: { x: 1176, y: 700 }, text: 'Yardstick Square. The Yardage is measured in ells. An ell is 45 inches. Complaints to the Prince.' },
    { kind: 'sign', at: { x: 1150, y: 510 }, text: 'The Rope Walk. Ropes under strain. Do not run through a taut rope. Do not run through Hawser.' },
    { kind: 'sign', at: { x: 730, y: 1120 }, text: 'Lowstitch Stair. Mind the steps. Mind the tide. Mind the roofs — they were houses once.' },
    { kind: 'sign', at: { x: 1520, y: 1150 }, text: 'The Royal Ways. Tithe-ships for Her Majesty\'s fleet. Unlicensed yardage will be cut.' },
    { kind: 'encounter', id: ENC_DRYING_LINES },
    { kind: 'encounter', id: ENC_ROPE_WALK },
    { kind: 'encounter', id: ENC_FULL_SAIL },
    { kind: 'encounter', id: ENC_LOOM },
    { kind: 'encounter', id: ENC_PATCHWORK },
    { kind: 'prince', id: 'hem', at: { x: 400, y: 886 } },
    { kind: 'water', id: 'sailmaker-cove', shape: COVE, fishery: FISHERY },
    { kind: 'chest', id: 'sailmaker-wreck-chest', at: { x: 96, y: 1290 }, coins: 70, orbs: 1 },
    { kind: 'chest', id: 'sailmaker-crowsnest-chest', at: { x: 2300, y: 300 }, coins: 110 },
    { kind: 'chest', id: 'sailmaker-loft-chest', at: { x: 1120, y: 196 }, coins: 50, orbs: 1 },
  ],
  npcs: SAILMAKER_NPCS,
  crowd: {
    count: 11,
    looks: CROWD_LOOKS,
    paths: [
      [{ x: 2300, y: 800 }, { x: 2000, y: 792 }, { x: 1700, y: 802 }, { x: 1480, y: 806 }, { x: 1330, y: 880 }],
      [{ x: 1200, y: 60 }, { x: 1200, y: 440 }, { x: 1240, y: 660 }],
      [{ x: 1120, y: 830 }, { x: 900, y: 866 }, { x: 660, y: 906 }],
      [{ x: 1110, y: 470 }, { x: 600, y: 468 }, { x: 300, y: 470 }],
      [{ x: 1450, y: 906 }, { x: 1560, y: 1012 }, { x: 1620, y: 1180 }, { x: 1900, y: 1232 }],
      [{ x: 1420, y: 726 }, { x: 1600, y: 646 }, { x: 1760, y: 600 }],
      [{ x: 820, y: 880 }, { x: 760, y: 1010 }, { x: 690, y: 1140 }],
      [{ x: 2000, y: 790 }, { x: 2090, y: 600 }, { x: 2150, y: 460 }],
    ],
    barks: CROWD_BARKS,
  },
};

