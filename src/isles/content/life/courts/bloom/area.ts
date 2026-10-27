import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../art/IsleArt';
import {
  bees, bench, bloomWaystone, butterflies, cloche, clocheGlint, dialFace, dialShadow, flower, flowerPot, fountain,
  fountainWater, gnomon, gravelWalk, knotGarden, lilyPad, lilyPond, mowStripes, orangeTub, orangery, pleachedLime,
  pottingShed, pruneBoard, pruningCart, roseArch, roseBush, seedStall, skep, stripeBed, titheScales, topiary, urn,
  waterLily, yewWall, type TopiaryKind,
} from './art';
import {
  BED_COLORS, BLOOM_BLUE, BLOOM_COLOR, BLOOM_GOLD, BLOOM_ORANGE, BLOOM_PINK, BLOOM_RED, BLOOM_VIOLET, BLOOM_WHITE,
  BOX, BOX_DARK, GLASS_LIT, GRAVEL, LAWN_DARK, POLLEN, POND_LIT, SUN, YEW, YEW_LIT,
} from './palette';
import { BLOOM_CROWD, BLOOM_NPCS } from './npcs';

/**
 * The Bloom Court — formal gardens under glass, the first court north of Mossgate.
 *
 * Read it from the Mossgate road up:
 * • **the entrance** (south): the Great Walk comes in through the yew wall past the waystone,
 *   the tithe balance and the prune list — every visitor's first sight is the scale;
 * • **the Tithe Beds** (south-west): four box-edged parterres planted in stripes, one stripe to
 *   a household, each with its numbered verdigris stake — and Hesketh Dibble's seed stall at
 *   their corner;
 * • **the Pollinarium and the lily pond** (south-east): pleached limes in rows, bee skeps under
 *   them, and the stone-kerbed pond where the petal koi are counted;
 * • **the fountain plaza** at the crossing of the Great Walk and the Cross Walk (Spore Court west,
 *   the Ossuary east), with the potting sheds along the east Cross Walk;
 * • **under glass** (west): Sister Nettle's knot garden and the forcing lawn, where the giant
 *   cloches stand — over the prize roses, and over anyone who answered back;
 * • **the sundial lawn** (north): the Great Walk rings the Empress's dial on its way to the rose
 *   arch and the Heartwood road, where the pruning cart waits; the Topiary Walk runs west from
 *   the dial, and Prince Petalis's orangery stands to the east behind its rows of cloched seedlings.
 *
 * The whole court is walled in clipped yew. Everything inside is mown, raked or under glass.
 */

export const BLOOM_W = 2400;
export const BLOOM_H = 1700;

const GREAT_X = 1200;
const CROSS_Y = 850;

/** The fountain at the crossing. */
export const FOUNTAIN: Pt = { x: 1200, y: 850 };
const PLAZA_R = 170;
/** The sundial lawn: centre and dial radius (the dial is drawn squashed into the ground). */
export const DIAL: Pt = { x: 1200, y: 430 };
const DIAL_R = 150;
const SQUASH = 0.62;
/** The lily pond — the court's fishing water. */
export const LILY_POND: Rect = { x: 1640, y: 1180, w: 380, h: 180 };
/** Prince Petalis's orangery — the middle of its front step. */
export const ORANGERY: Pt = { x: 1830, y: 330 };
/** The pruning cart by the Heartwood road. */
export const CART: Pt = { x: 1010, y: 220 };
/** The tithe balance at the entrance. */
export const SCALES: Pt = { x: 1400, y: 1520 };
/** The cloche Hob Larkspur is kept under. */
export const HOB_CLOCHE: Pt = { x: 860, y: 712 };

/** The four Tithe Beds. */
export const TITHE_BEDS: Rect[] = [
  { x: 240, y: 1020, w: 300, h: 210 },
  { x: 630, y: 1020, w: 300, h: 210 },
  { x: 240, y: 1340, w: 300, h: 210 },
  { x: 630, y: 1340, w: 300, h: 210 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Cloches that catch the light in `animate`. */
const glints: { x: number; y: number; r: number; s: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** An ellipse as a closed polyline (the ring walk round the dial). */
function ring(cx: number, cy: number, rx: number, ry: number, n = 36): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
  return pts;
}

// ── Layout ───────────────────────────────────────────────────────────

// The orangery, its tubs, and the rows of cloched seedlings before it.
addPiece(ORANGERY.x, ORANGERY.y, 700, 420, (g, rng) => orangery(g, ORANGERY.x, ORANGERY.y, 620, 150, rng),
  { kind: 'rect', x: ORANGERY.x - 318, y: ORANGERY.y - 40, w: 636, h: 34 });
for (const x of [1560, 1680, 1980, 2100]) {
  addPiece(x, 376, 50, 90, (g, rng) => orangeTub(g, x, 376, 1, rng), { kind: 'circle', x, y: 370, r: 14 });
}
for (let row = 0; row < 3; row++) {
  const y = 560 + row * 62;
  for (let k = 0; k < 9; k++) {
    const x = 1520 + k * 76 + (row % 2) * 30;
    if (x > 2280 || Math.abs(x - 1830) < 44) continue;
    addPiece(x, y, 30, 40, (g, rng) => {
      g.fillStyle(0x4a3426, 1); g.fillEllipse(x, y, 22, 7);
      flower(g, x, y - 7, 3.5, [BLOOM_RED, BLOOM_PINK, BLOOM_WHITE][(k + row) % 3], 'tulip', 0.4 + rng() * 0.3);
      cloche(g, x, y, 11, 0.12);
    });
    if ((k + row) % 3 === 0) glints.push({ x, y, r: 11, s: (k * 0.13 + row * 0.31) % 1 });
  }
}

// The sundial's gnomon.
addPiece(DIAL.x, DIAL.y, 60, 80, (g) => gnomon(g, DIAL.x, DIAL.y, 20), { kind: 'circle', x: DIAL.x, y: DIAL.y - 6, r: 22 });

// The rose arch and the pruning cart on the Heartwood road.
addPiece(GREAT_X, 190, 200, 160, (g, rng) => roseArch(g, GREAT_X, 190, 150, 110, rng));
solids.push({ kind: 'rect', x: GREAT_X - 84, y: 182, w: 14, h: 12 }, { kind: 'rect', x: GREAT_X + 70, y: 182, w: 14, h: 12 });
addPiece(CART.x, CART.y, 220, 120, (g) => pruningCart(g, CART.x, CART.y), { kind: 'rect', x: CART.x - 58, y: CART.y - 30, w: 116, h: 30 });

// The Topiary Walk: animals on plinths both sides of the walk west of the dial.
const TOPIARY_WEST: [number, number, TopiaryKind][] = [
  [200, 360, 'spiral'], [330, 360, 'peacock'], [470, 360, 'bear'], [610, 360, 'swan'], [750, 360, 'stag'], [880, 360, 'hare'],
  [260, 510, 'hare'], [400, 510, 'swan'], [540, 510, 'spiral'], [680, 510, 'peacock'], [820, 510, 'bear'],
];
for (const [x, y, k] of TOPIARY_WEST) addPiece(x, y, 80, 110, (g) => topiary(g, x, y, k, 1), { kind: 'circle', x, y: y - 6, r: 18 });
// The yew rooms behind the walk.
for (const [x0, w] of [[120, 300], [470, 260], [780, 200]] as [number, number][]) {
  addPiece(x0 + w / 2, 290, w, 90, (g) => yewWall(g, x0, 290, w, 56), { kind: 'rect', x: x0, y: 262, w, h: 30 });
}

// Under glass: the forcing lawn's great cloches.
for (const [x, y, c] of [[760, 672, BLOOM_RED], [960, 662, BLOOM_WHITE]] as [number, number, number][]) {
  addPiece(x, y, 90, 110, (g, rng) => { roseBush(g, x, y, 1.3, c, rng); cloche(g, x, y, 36); }, { kind: 'circle', x, y: y - 8, r: 30 });
  glints.push({ x, y, r: 36, s: x * 0.001 });
}
// Hob's cloche is drawn over him: its piece sits a touch south of where he stands.
addPiece(HOB_CLOCHE.x, HOB_CLOCHE.y + 14, 100, 120, (g) => {
  g.fillStyle(0x000000, 0.18); g.fillEllipse(HOB_CLOCHE.x, HOB_CLOCHE.y + 12, 84, 20);
  cloche(g, HOB_CLOCHE.x, HOB_CLOCHE.y + 14, 40, 0.14);
  // A padlock on the hasp at its foot.
  g.fillStyle(0x7c5c22, 1); g.fillRect(HOB_CLOCHE.x + 30, HOB_CLOCHE.y + 2, 8, 7);
  g.lineStyle(1.5, 0x7c5c22, 1); g.strokeCircle(HOB_CLOCHE.x + 34, HOB_CLOCHE.y + 1, 3);
}, { kind: 'circle', x: HOB_CLOCHE.x, y: HOB_CLOCHE.y + 2, r: 34 });
glints.push({ x: HOB_CLOCHE.x, y: HOB_CLOCHE.y + 14, r: 40, s: 0.55 });
addPiece(560, 780, 80, 50, (g) => bench(g, 560, 780));
for (const [x, y, c] of [[340, 600, BLOOM_VIOLET], [580, 600, BLOOM_PINK]] as [number, number, number][]) {
  addPiece(x, y, 40, 70, (g) => urn(g, x, y, 1, c), { kind: 'circle', x, y: y - 6, r: 14 });
}

// The fountain at the crossing, urns round the plaza.
addPiece(FOUNTAIN.x, FOUNTAIN.y + 30, 180, 140, (g) => fountain(g, FOUNTAIN.x, FOUNTAIN.y + 30, 72), { kind: 'circle', x: FOUNTAIN.x, y: FOUNTAIN.y + 22, r: 74 });
for (const a of [0.25, 0.75, 1.25, 1.75]) {
  const x = FOUNTAIN.x + Math.cos(a * Math.PI) * (PLAZA_R - 22), y = FOUNTAIN.y + Math.sin(a * Math.PI) * (PLAZA_R - 22) * 0.8;
  addPiece(x, y, 40, 70, (g) => urn(g, x, y, 0.9, [BLOOM_RED, BLOOM_GOLD, BLOOM_VIOLET, BLOOM_PINK][Math.round(a * 2) % 4]), { kind: 'circle', x, y: y - 6, r: 13 });
}

// The potting sheds along the east Cross Walk.
for (const [x, w, h] of [[1830, 160, 76], [2050, 176, 84], [2270, 150, 74]] as [number, number, number][]) {
  addPiece(x, 1050, w + 60, h * 1.6 + 30, (g, rng) => pottingShed(g, x, 1050, w, h, rng), { kind: 'rect', x: x - w / 2 - 22, y: 1022, w: w + 24, h: 28 });
}

// The Long Border along the north side of the east Cross Walk is in the ground; benches on it.
addPiece(1560, 818, 80, 50, (g) => bench(g, 1560, 818));
addPiece(2060, 818, 80, 50, (g) => bench(g, 2060, 818));

// The Pollinarium: pleached limes in rows, skeps under them.
for (let r = 0; r < 2; r++) {
  for (let k = 0; k < 5; k++) {
    const x = 1720 + k * 120 + r * 60, y = 1450 + r * 120;
    if (x > 2330) continue;
    addPiece(x, y, 60, 100, (g) => pleachedLime(g, x, y, 1), { kind: 'circle', x, y: y - 4, r: 9 });
  }
}
for (const [x, y] of [[1780, 1520], [2140, 1520], [1960, 1640]] as [number, number][]) addPiece(x, y, 40, 60, (g) => skep(g, x, y), { kind: 'circle', x, y: y - 6, r: 13 });

// The entrance: waystone, tithe balance, prune list, pots along the walk.
addPiece(1070, 1590, 60, 80, (g) => bloomWaystone(g, 1070, 1590), { kind: 'circle', x: 1070, y: 1584, r: 17 });
addPiece(SCALES.x, SCALES.y, 220, 240, (g) => titheScales(g, SCALES.x, SCALES.y), { kind: 'rect', x: SCALES.x - 52, y: SCALES.y - 22, w: 104, h: 22 });
addPiece(1530, 1560, 80, 110, (g) => pruneBoard(g, 1530, 1560), { kind: 'rect', x: 1504, y: 1552, w: 52, h: 10 });
for (const y of [1110, 1200, 1500]) {
  for (const k of [-1, 1]) {
    const x = GREAT_X + k * 78;
    addPiece(x, y, 30, 50, (g, rng) => flowerPot(g, x, y, 1.1, k < 0 ? BLOOM_RED : BLOOM_GOLD, rng), { kind: 'circle', x, y: y - 4, r: 10 });
  }
}

// Hesketh Dibble's seed stall at the corner of the Tithe Beds.
addPiece(1000, 1090, 220, 130, (g, rng) => seedStall(g, 1000, 1090, rng), { kind: 'rect', x: 934, y: 1066, w: 132, h: 24 });

// The Tithe Beds themselves are solid (stay on the paths); their planting is in the ground.
for (const b of TITHE_BEDS) solids.push({ kind: 'rect', x: b.x - 8, y: b.y - 8, w: b.w + 16, h: b.h + 16 });
// The knot garden and the lily pond keep you to their rims.
solids.push({ kind: 'rect', x: LILY_POND.x - 10, y: LILY_POND.y - 10, w: LILY_POND.w + 20, h: LILY_POND.h + 20 });

// ── The yew wall round the court (open at the four roads) ────────────

const GAP = 110;
// North: drawn as pieces so it stands behind everything.
for (const [x0, x1] of [[0, GREAT_X - GAP], [GREAT_X + GAP, BLOOM_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 70, x1 - x0, 80, (g) => yewWall(g, x0, 70, x1 - x0, 50), { kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 64 });
}
// South: pieces at the bottom edge, so they draw over anyone walking along them.
for (const [x0, x1] of [[0, GREAT_X - GAP], [GREAT_X + GAP, BLOOM_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, BLOOM_H, x1 - x0, 60, (g) => yewWall(g, x0, BLOOM_H, x1 - x0, 26), { kind: 'rect', x: x0, y: BLOOM_H - 34, w: x1 - x0, h: 34 });
}
// West and east: flat in the ground; solid strips.
solids.push({ kind: 'rect', x: 0, y: 0, w: 34, h: CROSS_Y - GAP });
solids.push({ kind: 'rect', x: 0, y: CROSS_Y + GAP, w: 34, h: BLOOM_H - CROSS_Y - GAP });
solids.push({ kind: 'rect', x: BLOOM_W - 34, y: 0, w: 34, h: CROSS_Y - GAP });
solids.push({ kind: 'rect', x: BLOOM_W - 34, y: CROSS_Y + GAP, w: 34, h: BLOOM_H - CROSS_Y - GAP });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** The dial's shadow: one turn every two minutes, so you can watch it move. */
const dialAngle = (t: number): number => -Math.PI / 2 + (t / 120) * Math.PI * 2;

/** Lily cups drifting on the pond, positions fixed, bobbing in `animate`. */
const DRIFT_LILIES: Pt[] = [
  { x: 1700, y: 1230 }, { x: 1790, y: 1300 }, { x: 1890, y: 1215 }, { x: 1960, y: 1320 }, { x: 1740, y: 1340 },
];

const painter: AreaPainter = {
  ground(g, rng) {
    const W = BLOOM_W, H = BLOOM_H;
    mowStripes(g, { x: 0, y: 0, w: W, h: H }, rng, 64);

    // The yew wall, east and west, seen from above.
    for (const x0 of [0, W - 34]) {
      for (const [y0, y1] of [[0, CROSS_Y - GAP], [CROSS_Y + GAP, H]] as [number, number][]) {
        g.fillStyle(dim(YEW, 0.3), 1); g.fillRect(x0, y0, 34, y1 - y0);
        g.fillStyle(YEW, 1); g.fillRect(x0 + 3, y0, 28, y1 - y0);
        g.fillStyle(YEW_LIT, 0.6); g.fillRect(x0 + (x0 ? 3 : 27), y0, 4, y1 - y0);
      }
    }

    // The walks.
    gravelWalk(g, [{ x: GREAT_X, y: H }, { x: GREAT_X, y: FOUNTAIN.y + PLAZA_R - 10 }], 92, rng);
    gravelWalk(g, [{ x: GREAT_X, y: FOUNTAIN.y - PLAZA_R + 10 }, { x: GREAT_X, y: DIAL.y + DIAL_R * SQUASH + 40 }], 84, rng);
    gravelWalk(g, [{ x: GREAT_X, y: DIAL.y - DIAL_R * SQUASH - 40 }, { x: GREAT_X, y: 0 }], 84, rng);
    gravelWalk(g, [{ x: 0, y: CROSS_Y }, { x: FOUNTAIN.x - PLAZA_R + 10, y: CROSS_Y }], 80, rng);
    gravelWalk(g, [{ x: FOUNTAIN.x + PLAZA_R - 10, y: CROSS_Y }, { x: W, y: CROSS_Y }], 80, rng);
    // The Topiary Walk and the orangery walk, off the dial ring.
    gravelWalk(g, [{ x: DIAL.x - DIAL_R - 44, y: 435 }, { x: 120, y: 435 }], 76, rng);
    gravelWalk(g, [{ x: DIAL.x + DIAL_R + 44, y: 425 }, { x: 2260, y: 425 }], 76, rng);
    // Paths through the Tithe Beds and down to the pond and the Pollinarium.
    gravelWalk(g, [{ x: 200, y: 1285 }, { x: GREAT_X - 50, y: 1285 }], 54, rng);
    gravelWalk(g, [{ x: 585, y: CROSS_Y + 40 }, { x: 585, y: 1610 }], 50, rng);
    gravelWalk(g, [{ x: 200, y: 990 }, { x: 960, y: 990 }], 40, rng);
    gravelWalk(g, [{ x: 200, y: 1600 }, { x: 960, y: 1600 }], 40, rng);
    gravelWalk(g, [{ x: GREAT_X + 50, y: 1420 }, { x: 2300, y: 1420 }], 50, rng);
    gravelWalk(g, [{ x: 1600, y: CROSS_Y + 40 }, { x: 1600, y: 1420 }], 46, rng);
    gravelWalk(g, [{ x: 1830, y: CROSS_Y - 40 }, { x: 1830, y: 470 }], 46, rng);
    // Round the plaza.
    g.fillStyle(BOX_DARK, 1); g.fillEllipse(FOUNTAIN.x, FOUNTAIN.y, PLAZA_R * 2 + 26, PLAZA_R * 1.6 + 26);
    g.fillStyle(BOX, 1); g.fillEllipse(FOUNTAIN.x, FOUNTAIN.y - 2, PLAZA_R * 2 + 18, PLAZA_R * 1.6 + 18);
    g.fillStyle(GRAVEL, 1); g.fillEllipse(FOUNTAIN.x, FOUNTAIN.y, PLAZA_R * 2, PLAZA_R * 1.6);
    g.lineStyle(1, 0xb3a687, 0.35);
    for (let k = 1; k < 7; k++) g.strokeEllipse(FOUNTAIN.x, FOUNTAIN.y + 20, k * 50, k * 38);
    // A star of coloured gravel let into the plaza round the basin.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0xc0673f : 0x43a89a, 0.35);
      g.fillTriangle(FOUNTAIN.x + Math.cos(a - 0.12) * 90, FOUNTAIN.y + 20 + Math.sin(a - 0.12) * 70, FOUNTAIN.x + Math.cos(a + 0.12) * 90, FOUNTAIN.y + 20 + Math.sin(a + 0.12) * 70, FOUNTAIN.x + Math.cos(a) * 150, FOUNTAIN.y + 20 + Math.sin(a) * 120);
    }

    // The sundial lawn: a ring walk round the dial face.
    gravelWalk(g, ring(DIAL.x, DIAL.y, DIAL_R + 44, (DIAL_R + 44) * SQUASH + 8), 46, rng);
    dialFace(g, DIAL.x, DIAL.y, DIAL_R, SQUASH);

    // The Tithe Beds: one stripe to a household. A few stripes are thin this season.
    const kinds: ('daisy' | 'tulip' | 'rose')[][] = [['tulip'], ['daisy'], ['rose', 'daisy'], ['tulip', 'daisy']];
    TITHE_BEDS.forEach((b, i) => {
      const colors = [0, 1, 2, 3, 4, 5].map((k) => BED_COLORS[(k + i * 2) % BED_COLORS.length]);
      stripeBed(g, b, colors, rng, { kinds: kinds[i], thin: i === 3 ? [4] : i === 1 ? [2] : [] });
    });

    // The Long Border along the east Cross Walk: vertical stripes in the Empress's order.
    const border = [BLOOM_BLUE, BLOOM_VIOLET, BLOOM_PINK, BLOOM_WHITE, BLOOM_GOLD, BLOOM_ORANGE, BLOOM_RED];
    stripeBed(g, { x: 1390, y: 742, w: 400, h: 48 }, border.slice(0, 6), rng, { vertical: true, stakes: false });
    stripeBed(g, { x: 1870, y: 742, w: 420, h: 48 }, [...border.slice(1), border[0]], rng, { vertical: true, stakes: false });
    // A bed of white and blush roses along the west Cross Walk.
    const roses = [BLOOM_WHITE, BLOOM_PINK, BLOOM_WHITE, BLOOM_RED, BLOOM_WHITE];
    stripeBed(g, { x: 70, y: 905, w: 470, h: 40 }, roses, rng, { vertical: true, stakes: false, kinds: ['rose'] });
    stripeBed(g, { x: 630, y: 905, w: 300, h: 40 }, roses.slice(0, 3), rng, { vertical: true, stakes: false, kinds: ['rose'] });

    // Sister Nettle's knot garden.
    knotGarden(g, 420, 700, 120, rng);
    // The forcing lawn: a disc of close turf the cloches stand on.
    g.fillStyle(LAWN_DARK, 0.5); g.fillEllipse(860, 690, 330, 120);

    // The lily pond.
    lilyPond(g, LILY_POND, rng);

    // The Pollinarium: lime litter and clover under the rows.
    for (let i = 0; i < 260; i++) {
      const x = 1660 + rng() * 680, y = 1440 + rng() * 210;
      g.fillStyle(rng() < 0.5 ? 0xe8e09a : 0xffffff, 0.5); g.fillCircle(x, y, 1.2);
    }

    // The forecourt before the orangery: chequered terracotta.
    for (let y = 340; y < 470; y += 22) {
      for (let x = 1500; x < 2160; x += 22) {
        const k = ((x - 1500) / 22 + (y - 340) / 22) % 2;
        g.fillStyle(k ? 0xc0673f : 0xe8dcc6, 0.9); g.fillRect(x, y, 22, 22);
      }
    }
    g.lineStyle(2, 0x958c78, 1); g.strokeRect(1500, 340, 660, 130);
  },

  pieces,

  animate(g, t, view) {
    // The dial's shadow, creeping round.
    if (inView(DIAL.x, DIAL.y, view, 220)) {
      dialShadow(g, DIAL.x, DIAL.y, DIAL_R, dialAngle(t), SQUASH);
      // The sun opposite: a patch of warmer light where the shadow is not.
      const sa = dialAngle(t) + Math.PI;
      glow(g, DIAL.x + Math.cos(sa) * DIAL_R * 0.55, DIAL.y + Math.sin(sa) * DIAL_R * 0.55 * SQUASH, 46, SUN, 0.03, 3);
    }
    // The pond: rings, drifting lilies.
    if (inView(LILY_POND.x + LILY_POND.w / 2, LILY_POND.y + LILY_POND.h / 2, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.35 + i / 4) % 1;
        const cx = LILY_POND.x + 60 + ((i * 97) % (LILY_POND.w - 120)), cy = LILY_POND.y + 40 + ((i * 53) % (LILY_POND.h - 80));
        g.lineStyle(1.2, POND_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 40, 3 + ph * 14);
      }
      DRIFT_LILIES.forEach((p, i) => {
        const x = p.x + Math.sin(t * 0.2 + i) * 10, y = p.y + Math.cos(t * 0.25 + i * 2) * 5;
        lilyPad(g, x, y, 10, t * 0.05 + i);
        if (i % 2 === 0) waterLily(g, x + 2, y - 2, 5, i % 4 ? BLOOM_WHITE : BLOOM_PINK);
      });
      // A koi turning under the pads.
      const kx = LILY_POND.x + LILY_POND.w / 2 + Math.cos(t * 0.4) * 130, ky = LILY_POND.y + LILY_POND.h / 2 + Math.sin(t * 0.4) * 50;
      const ka = t * 0.4 + Math.PI / 2;
      g.fillStyle(BLOOM_ORANGE, 0.55); g.fillEllipse(kx, ky, 18, 8);
      g.fillStyle(BLOOM_WHITE, 0.5); g.fillCircle(kx - Math.cos(ka) * 4, ky - Math.sin(ka) * 2, 2.5);
    }
    // The fountain.
    if (inView(FOUNTAIN.x, FOUNTAIN.y, view, 200)) fountainWater(g, FOUNTAIN.x, FOUNTAIN.y + 30, 72, t);
    // Light sliding over the glass.
    for (const c of glints) if (inView(c.x, c.y, view)) clocheGlint(g, c.x, c.y, c.r, t, c.s);
    if (inView(ORANGERY.x, ORANGERY.y - 120, view, 400)) {
      const ph = (t * 0.08) % 1;
      const gx = ORANGERY.x - 300 + ph * 600;
      g.fillStyle(GLASS_LIT, 0.16 * Math.sin(ph * Math.PI)); g.fillRect(gx, ORANGERY.y - 170, 18, 140);
    }
    // Bees at the skeps.
    for (const [x, y] of [[1780, 1520], [2140, 1520], [1960, 1640]] as [number, number][]) if (inView(x, y, view)) bees(g, x, y - 40, t, 6);
  },

  animateOver(g, t, view) {
    // Butterflies over the beds and the border.
    if (inView(580, 1280, view, 400)) butterflies(g, 580, 1200, t, 5, 1);
    if (inView(1800, 740, view, 400)) butterflies(g, 1800, 700, t * 0.9, 4, 4);
    if (inView(420, 700, view, 300)) butterflies(g, 420, 660, t * 1.1, 3, 9);
    // Pollen drifting off the limes.
    if (inView(2000, 1500, view, 400)) {
      for (let i = 0; i < 14; i++) {
        const ph = (t * 0.12 + i / 14) % 1;
        const x = 1700 + ((i * 173) % 640) + Math.sin(t + i) * 12, y = 1380 - ph * 60 + ((i * 41) % 120);
        g.fillStyle(POLLEN, 0.6 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 1.6);
      }
    }
    // Spray off the fountain jet in the light.
    if (inView(FOUNTAIN.x, FOUNTAIN.y, view, 200)) {
      g.fillStyle(lit(POND_LIT, 0.4), 0.15 + Math.sin(t * 2) * 0.05); g.fillCircle(FOUNTAIN.x, FOUNTAIN.y - 60, 18);
    }
  },
};

export const BLOOM_AREA: AreaDef = {
  id: 'bloom',
  isle: 'life',
  court: 'bloom',
  name: 'The Bloom Court',
  subtitle: 'Every stripe weighed at the turning of the season',
  w: BLOOM_W,
  h: BLOOM_H,
  bg: LAWN_DARK,
  accent: BLOOM_COLOR,
  weather: 'petals',
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'mossgate', label: 'Down the Great Walk to Mossgate' },
    { side: 'n', to: 'heartwood', label: 'Under the rose arch to the Heartwood' },
    { side: 'w', to: 'spore', at: CROSS_Y, label: 'The Cross Walk to the Spore Court' },
    { side: 'e', to: 'ossuary', at: CROSS_Y, label: 'The Cross Walk to the Ossuary' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1070, y: 1624 } },
    { kind: 'prince', id: 'petalis', at: { x: ORANGERY.x, y: ORANGERY.y + 46 } },
    { kind: 'water', id: 'bloom-pond', shape: LILY_POND, fishery: 'bloom-pond' },
    { kind: 'encounter', id: 'bloom-deadheading' },
    { kind: 'encounter', id: 'bloom-pollen-count' },
    { kind: 'encounter', id: 'bloom-topiary' },
    { kind: 'encounter', id: 'bloom-sundial' },
    { kind: 'encounter', id: 'bloom-graft' },
    {
      kind: 'sign', at: { x: 1470, y: 1610 },
      text: 'THE BLOOM TITHE. One measure a household, grown by its own hand, weighed at each season\'s turn. Short is pruned.',
    },
    {
      kind: 'sign', at: { x: 585, y: 1640 },
      text: 'THE TITHE BEDS. One stripe to a household, numbered. Weeding another household\'s stripe is a theft of the Tithe.',
    },
    {
      kind: 'sign', at: { x: 760, y: 790 },
      text: 'THE FORCING LAWN. What is put under glass here is brought on by order of Prince Petalis. Do not lift.',
    },
    {
      kind: 'sign', at: { x: 1110, y: 260 },
      text: 'TO THE GLASSHOUSE. The cart leaves at the season\'s turn. The pruned travel free.',
    },
    { kind: 'chest', id: 'bloom-chest-shed', at: { x: 2350, y: 980 }, coins: 80 },
    { kind: 'chest', id: 'bloom-chest-orangery', at: { x: 2200, y: 440 }, orbs: 2, open: { prince: 'petalis' } },
  ],
  npcs: BLOOM_NPCS,
  crowd: BLOOM_CROWD,
};
