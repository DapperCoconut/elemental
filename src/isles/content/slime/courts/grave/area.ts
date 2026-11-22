import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import {
  bellPost, bier, coffinShop, diggerHut, graveLamp, graveMound, graveWaystone, lampLight, layingOutHouse, lychGate,
  lychHouse, mangrove, marshBubble, mausoleum, mireWater, parlour, peatGround, quietWard, railing, registerLectern,
  sheerlegs, slabWalk, sloughTail, spade, stoneBlock, stoneRow, wisp,
} from './art';
import { GRAVE_CROWD, GRAVE_NPCS } from './npcs';
import { BRUISE_DARK, DIRT, DIRT_DARK, DIRT_LIT, GRAVE_COLOR, LAMP, MARSH_GAS, MIRE_DEEP, SLATE, SLATE_LIT, WISP } from './palette';

/**
 * The Grave Court — the boneyard of the greyed, at the north end of Fangmire's road.
 *
 * Read it from the Fang road up:
 * • **the lych-gate** (south): the Carrying Road comes in under the roofed gate where every coffin
 *   rests on its way; Verger Quillon's Register stands just inside, and Lathe's coffin shop on the
 *   lane west of the road;
 * • **the sinking rows** (south-west) and **Tobit's digger's yard** (west, on the Bier Road): row
 *   after row of stones going under, and the day's graves open in the peat;
 * • **the bell field** (east): every grave with a safety-bell on a post, and beyond it **the Quiet
 *   Ward** on its stilts, where the passed-over lie waiting;
 * • **the Lych Pool** in the middle, black water ringed by the Slab Walk, with a mausoleum stood on
 *   stilts in its own pool either side;
 * • **the Lych Walk** (north): Elegy's stone-yard and Mother Hessel's laying-out house to the west,
 *   Prince Mortis's Lych House and Pale's parlour to the east;
 * • **the Slough** at the very top: the tail of the Matriarch's own cast skin coming up out of the
 *   mire, open like a tunnel mouth — the way to her nest, shut until all six courts kneel.
 *
 * There is no far wall. The mire is the wall, and it is slowly coming in.
 */

export const GRAVE_W = 2400;
export const GRAVE_H = 1800;

const ROAD_X = 1200;
const BIER_Y = 1180;
const LYCH_Y = 640;
const RING_W = 880;
const RING_E = 1520;

/** The Lych Pool — the court's fishing water. */
export const LYCH_POOL: Rect = { x: 1010, y: 770, w: 380, h: 190 };
/** Prince Mortis's Lych House — the middle of its front step. */
export const LYCH_HOUSE: Pt = { x: 1760, y: 420 };
/** The Slough's door: the open tail of the Matriarch's cast skin. */
export const SLOUGH_DOOR: Pt = { x: 1200, y: 150 };
/** The grave dug for Corwen Peat, ready, with his name on its cross. */
export const CORWEN_GRAVE: Pt = { x: 640, y: 1355 };
/** The lych-gate on the Carrying Road. */
export const LYCH_GATE: Pt = { x: 1200, y: 1700 };
/** The Burial Register on its lectern, inside the gate. */
export const REGISTER: Pt = { x: 1340, y: 1580 };
/** The bell posts of the Sexton's field. */
export const BELL_POSTS: Pt[] = [];
for (const y of [1330, 1460]) for (const x of [1640, 1760, 1880, 2120, 2240]) BELL_POSTS.push({ x, y });
/** The open graves in Tobit's yard (pits; solid). */
const PITS: Pt[] = [{ x: 450, y: 1300 }, { x: 760, y: 1300 }, { x: 520, y: 1410 }, { x: 760, y: 1420 }];
const PIT_W = 66, PIT_H = 30;
/** Mausoleum pools. */
const MAUS: { x: number; y: number; pool: Rect; w: number }[] = [
  { x: 620, y: 912, pool: { x: 540, y: 868, w: 160, h: 64 }, w: 110 },
  { x: 1780, y: 912, pool: { x: 1700, y: 868, w: 160, h: 64 }, w: 110 },
  { x: 300, y: 842, pool: { x: 236, y: 806, w: 128, h: 54 }, w: 88 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lamps whose light pools are drawn in `animate`. */
const lamps: Pt[] = [];
/** Graves the marsh-lights hang over. */
const wispSpots: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: Piece['draw'], solid?: Solid, when?: Piece['when']): void {
  pieces.push({ x, y, w, h, draw, when });
  if (solid) solids.push(solid);
}

// ── The mire round the court ─────────────────────────────────────────

/** Black water: the north edge, the two flanks, and the south edge either side of the road in. */
const MIRE_BANDS: Rect[] = [
  { x: 0, y: 0, w: 1030, h: 76 }, { x: 1370, y: 0, w: 1030, h: 76 }, { x: 1030, y: 0, w: 340, h: 40 },
  { x: 0, y: 76, w: 52, h: 1724 }, { x: 2348, y: 76, w: 52, h: 1724 },
  { x: 52, y: 1752, w: 1030, h: 48 }, { x: 1318, y: 1752, w: 1030, h: 48 },
];
for (const b of MIRE_BANDS) solids.push({ kind: 'rect', x: b.x, y: b.y, w: b.w, h: b.h });

// ── The north: the Slough ────────────────────────────────────────────

addPiece(SLOUGH_DOOR.x, 124, 520, 260, (g, rng) => sloughTail(g, SLOUGH_DOOR.x, 124, rng),
  { kind: 'rect', x: SLOUGH_DOOR.x - 175, y: 40, w: 350, h: 72 });
solids.push({ kind: 'rect', x: SLOUGH_DOOR.x - 225, y: 70, w: 70, h: 54 }, { kind: 'rect', x: SLOUGH_DOOR.x + 155, y: 70, w: 70, h: 54 });

// ── The Lych Walk: stone-yard, laying-out house, Lych House, parlour ─

addPiece(LYCH_HOUSE.x, LYCH_HOUSE.y, 420, 420, (g, rng) => lychHouse(g, LYCH_HOUSE.x, LYCH_HOUSE.y, 300, 110, rng),
  { kind: 'rect', x: LYCH_HOUSE.x - 160, y: LYCH_HOUSE.y - 44, w: 320, h: 34 });
addPiece(2060, 560, 300, 140, (g, rng) => parlour(g, 2060, 560, rng), { kind: 'rect', x: 1978, y: 524, w: 164, h: 34 });
solids.push({ kind: 'rect', x: 2140, y: 538, w: 96, h: 26 });
addPiece(860, 440, 340, 140, (g, rng) => layingOutHouse(g, 860, 440, rng), { kind: 'rect', x: 772, y: 404, w: 176, h: 34 });
solids.push({ kind: 'rect', x: 948, y: 420, w: 80, h: 22 }, { kind: 'rect', x: 700, y: 430, w: 74, h: 10 });
addPiece(440, 500, 120, 140, (g) => sheerlegs(g, 440, 500), { kind: 'circle', x: 440, y: 494, r: 26 });
for (const [x, y, w, h] of [[560, 530, 46, 30], [620, 500, 36, 40], [340, 540, 40, 26], [300, 480, 30, 34]] as [number, number, number, number][]) {
  addPiece(x, y, w + 20, h + 30, (g, rng) => stoneBlock(g, x, y, w, h, rng), { kind: 'rect', x: x - w / 2, y: y - 14, w, h: 14 });
}
addPiece(2186, 470, 40, 30, (g) => graveLamp(g, 2186, 470), { kind: 'circle', x: 2186, y: 468, r: 6 });

// ── The Lych Pool and the mausoleums ─────────────────────────────────

solids.push({ kind: 'rect', x: LYCH_POOL.x - 10, y: LYCH_POOL.y - 10, w: LYCH_POOL.w + 20, h: LYCH_POOL.h + 20 });
for (const m of MAUS) {
  addPiece(m.x, m.y, m.w + 40, 160, (g, rng) => mausoleum(g, m.x, m.y, m.w, rng));
  solids.push({ kind: 'rect', x: m.pool.x - 6, y: m.pool.y - 6, w: m.pool.w + 12, h: m.pool.h + 12 });
  wispSpots.push({ x: m.x, y: m.y - 20 });
}

// ── The digger's yard (west) and the sinking rows ────────────────────

addPiece(320, 1400, 220, 120, (g, rng) => diggerHut(g, 320, 1400, rng), { kind: 'rect', x: 256, y: 1366, w: 168, h: 34 });
for (const p of PITS) solids.push({ kind: 'rect', x: p.x - PIT_W / 2, y: p.y - PIT_H / 2, w: PIT_W, h: PIT_H });
// Corwen's grave: dug and waiting, his name on its cross.
addPiece(CORWEN_GRAVE.x, CORWEN_GRAVE.y + 12, 60, 70, (g) => {
  g.fillStyle(0x2a2018, 1); g.fillRect(CORWEN_GRAVE.x - 24, CORWEN_GRAVE.y - 14, 4, 26);
  g.fillRect(CORWEN_GRAVE.x - 31, CORWEN_GRAVE.y - 6, 18, 4);
  g.fillStyle(0xe6dfc8, 0.85); g.fillRect(CORWEN_GRAVE.x - 30, CORWEN_GRAVE.y - 5, 16, 2);
  spade(g, CORWEN_GRAVE.x + 26, CORWEN_GRAVE.y + 8, -Math.PI / 2 + 0.25, 40);
});

/** Rows of the sinking dead: [x0, y, count, gap, sinkFrom, sinkTo]. Sink deepens toward the mire. */
const ROWS: [number, number, number, number, number, number][] = [
  // South-west: the oldest rows, going under toward the south mire.
  [130, 1530, 7, 72, 0.15, 0.35], [130, 1620, 7, 72, 0.3, 0.5], [130, 1705, 6, 74, 0.45, 0.7],
  // West, between the Bier Road and the pools.
  [130, 1070, 9, 82, 0.5, 0.05], [420, 760, 5, 76, 0.1, 0.25],
  // East, past the bell field.
  [1640, 1070, 9, 78, 0.05, 0.55], [1940, 790, 5, 80, 0.2, 0.55],
  // North, both sides of the Slough road.
  [120, 300, 6, 82, 0.6, 0.3], [1380, 300, 3, 76, 0.25, 0.45], [2140, 300, 3, 80, 0.4, 0.7],
  // Along the lane by the coffin shop.
  [1440, 1660, 5, 76, 0.1, 0.4],
];
for (const [x0, y, n, gap, s0, s1] of ROWS) {
  addPiece(x0 + ((n - 1) * gap) / 2, y + 20, n * gap + 40, 90, (g, rng) => stoneRow(g, x0, y, n, gap, s0, s1, rng));
  for (let i = 0; i < n; i++) {
    solids.push({ kind: 'circle', x: x0 + i * gap, y: y - 4, r: 10 });
    if (i % 2 === 0) wispSpots.push({ x: x0 + i * gap, y: y - 30 });
  }
}

// Iron railings round two family plots.
addPiece(1660, 1000, 260, 50, (g) => { railing(g, { x: 1560, y: 1010 }, { x: 1760, y: 1010 }); });
addPiece(330, 990, 260, 50, (g) => { railing(g, { x: 220, y: 1000 }, { x: 440, y: 1000 }); });

// ── The bell field and the Quiet Ward (east) ─────────────────────────

for (const p of BELL_POSTS) {
  addPiece(p.x, p.y, 70, 80, (g, rng) => { graveMound(g, p.x + 16, p.y + 16, 40, rng); bellPost(g, p.x, p.y, 0, rng); },
    { kind: 'circle', x: p.x, y: p.y - 2, r: 7 });
}
addPiece(2000, 1600, 360, 140, (g, rng) => quietWard(g, 2000, 1600, 300, rng), { kind: 'rect', x: 1844, y: 1568, w: 312, h: 32 });

// ── The south: lych-gate, Register, coffin shop, waystone ────────────

addPiece(LYCH_GATE.x, LYCH_GATE.y, 260, 150, (g) => lychGate(g, LYCH_GATE.x, LYCH_GATE.y, 170));
solids.push({ kind: 'rect', x: LYCH_GATE.x - 94, y: LYCH_GATE.y - 12, w: 18, h: 14 }, { kind: 'rect', x: LYCH_GATE.x + 76, y: LYCH_GATE.y - 12, w: 18, h: 14 });
addPiece(REGISTER.x, REGISTER.y, 100, 120, (g) => registerLectern(g, REGISTER.x, REGISTER.y), { kind: 'rect', x: REGISTER.x - 40, y: REGISTER.y - 12, w: 80, h: 14 });
addPiece(920, 1600, 280, 170, (g, rng) => coffinShop(g, 920, 1600, rng), { kind: 'rect', x: 820, y: 1566, w: 230, h: 34 });
addPiece(1040, 1690, 50, 70, (g) => graveWaystone(g, 1040, 1690), { kind: 'circle', x: 1040, y: 1684, r: 14 });
addPiece(1330, 1712, 110, 40, (g, rng) => bier(g, 1330, 1712, rng), { kind: 'rect', x: 1284, y: 1702, w: 92, h: 12 });

// ── Mangroves, leaning in from the mire ──────────────────────────────

for (const [x, y, s] of [[110, 200, 1.1], [2290, 200, 1.0], [2290, 900, 0.9], [110, 1260, 0.9], [2280, 1700, 0.85], [700, 1720, 0.8], [1640, 200, 0.8]] as [number, number, number][]) {
  addPiece(x, y, 140 * s, 150 * s, (g, rng) => mangrove(g, x, y, s, rng), { kind: 'circle', x, y: y - 8, r: 16 });
}

// ── Lamps along the walks ────────────────────────────────────────────

for (const [x, y] of [
  [1130, 1500], [1270, 1300], [1130, 1110], [940, 1120], [1450, 1120], [960, 580], [1450, 580], [1270, 400],
  [1130, 230], [700, 580], [1830, 580], [2000, 1120], [420, 1120], [2060, 1500],
] as [number, number][]) {
  addPiece(x, y, 30, 70, (g) => graveLamp(g, x, y), { kind: 'circle', x, y: y - 2, r: 6 });
  lamps.push({ x, y });
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 180): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaPainter = {
  ground(g, rng) {
    peatGround(g, { x: 0, y: 0, w: GRAVE_W, h: GRAVE_H }, rng);
    // The mire round the edge.
    for (const b of MIRE_BANDS) mireWater(g, b, rng, b.w > 300 || b.h > 300 ? 4 : 1);
    // The Slab Walk: the Carrying Road, the Bier Road, the ring round the pool, the Lych Walk, the
    // Slough road, and the short lanes off them.
    slabWalk(g, [{ x: ROAD_X, y: GRAVE_H }, { x: ROAD_X, y: BIER_Y }], 110, rng);
    slabWalk(g, [{ x: 150, y: BIER_Y }, { x: 2250, y: BIER_Y }], 90, rng);
    slabWalk(g, [{ x: RING_W, y: BIER_Y }, { x: RING_W, y: LYCH_Y }], 86, rng);
    slabWalk(g, [{ x: RING_E, y: BIER_Y }, { x: RING_E, y: LYCH_Y }], 86, rng);
    slabWalk(g, [{ x: 300, y: LYCH_Y }, { x: 2150, y: LYCH_Y }], 90, rng);
    slabWalk(g, [{ x: ROAD_X, y: LYCH_Y }, { x: ROAD_X, y: SLOUGH_DOOR.y + 20 }], 100, rng);
    slabWalk(g, [{ x: LYCH_HOUSE.x, y: LYCH_Y }, { x: LYCH_HOUSE.x, y: LYCH_HOUSE.y + 10 }], 80, rng);
    slabWalk(g, [{ x: 880, y: LYCH_Y }, { x: 880, y: 470 }], 60, rng);
    slabWalk(g, [{ x: 2000, y: BIER_Y }, { x: 2000, y: 1640 }], 60, rng);
    slabWalk(g, [{ x: ROAD_X, y: 1640 }, { x: 880, y: 1640 }], 56, rng);
    slabWalk(g, [{ x: 560, y: BIER_Y }, { x: 560, y: 1460 }], 50, rng);
    // The Lych House forecourt: slate flags.
    for (let y = 440; y < 600; y += 20) for (let x = 1600; x < 1920; x += 26) {
      g.fillStyle(((x + y) / 2) % 3 < 1 ? SLATE_LIT : SLATE, 0.9); g.fillRect(x + 1, y + 1, 24, 18);
    }
    // The Lych Pool.
    mireWater(g, LYCH_POOL, rng, 3);
    for (const m of MAUS) mireWater(g, m.pool, rng, 0);
    // The open graves of the digger's yard, spoil heaps beside.
    for (const p of PITS) {
      g.fillStyle(DIRT_DARK, 1); g.fillEllipse(p.x, p.y + PIT_H / 2 + 12, PIT_W + 16, 20);
      g.fillStyle(DIRT, 1); g.fillEllipse(p.x, p.y + PIT_H / 2 + 10, PIT_W + 8, 15);
      g.fillStyle(DIRT_LIT, 1); g.fillEllipse(p.x - 8, p.y + PIT_H / 2 + 7, PIT_W * 0.5, 6);
      g.fillStyle(DIRT, 1); g.fillRect(p.x - PIT_W / 2 - 3, p.y - PIT_H / 2 - 3, PIT_W + 6, PIT_H + 6);
      g.fillStyle(MIRE_DEEP, 1); g.fillRect(p.x - PIT_W / 2, p.y - PIT_H / 2, PIT_W, PIT_H);
      g.fillStyle(DIRT_DARK, 1); g.fillRect(p.x - PIT_W / 2, p.y - PIT_H / 2, PIT_W, 6);
    }
    // Corwen's: a grave cut and open, not yet filled.
    g.fillStyle(DIRT, 1); g.fillRect(CORWEN_GRAVE.x - 22, CORWEN_GRAVE.y - 4, 44, 22);
    g.fillStyle(MIRE_DEEP, 1); g.fillRect(CORWEN_GRAVE.x - 19, CORWEN_GRAVE.y - 1, 38, 16);
    // Fresh mounds about the yard and the field.
    for (let i = 0; i < 26; i++) {
      const x = 180 + rng() * 2040, y = 260 + rng() * 1400;
      if (Math.abs(x - ROAD_X) < 80 || Math.abs(y - BIER_Y) < 70 || Math.abs(y - LYCH_Y) < 70) continue;
      if (x > LYCH_POOL.x - 40 && x < LYCH_POOL.x + LYCH_POOL.w + 40 && y > LYCH_POOL.y - 40 && y < LYCH_POOL.y + LYCH_POOL.h + 40) continue;
      graveMound(g, x, y, 30 + rng() * 14, rng, rng() < 0.3);
    }
    // The Matriarch's ration board by the gate: a black-painted post with notches.
    g.fillStyle(BRUISE_DARK, 0.4); g.fillEllipse(ROAD_X, 1640, 150, 30);
  },

  pieces,

  animate(g, t, view, world) {
    // Lamp pools.
    lamps.forEach((l, i) => { if (inView(l.x, l.y, view)) lampLight(g, l.x, l.y, t, i); });
    // Marsh gas rising out of the black water.
    if (inView(LYCH_POOL.x + LYCH_POOL.w / 2, LYCH_POOL.y + LYCH_POOL.h / 2, view, 300)) {
      for (let i = 0; i < 6; i++) marshBubble(g, LYCH_POOL.x + 40 + ((i * 67) % (LYCH_POOL.w - 80)), LYCH_POOL.y + 30 + ((i * 41) % (LYCH_POOL.h - 60)), t, i * 0.17);
      // Lamplight smeared on the water, and a pale fish turning under it.
      g.fillStyle(LAMP, 0.08); g.fillEllipse(LYCH_POOL.x + 60, LYCH_POOL.y + LYCH_POOL.h - 30, 60, 8);
      const fx = LYCH_POOL.x + LYCH_POOL.w / 2 + Math.cos(t * 0.35) * 140, fy = LYCH_POOL.y + LYCH_POOL.h / 2 + Math.sin(t * 0.35) * 50;
      g.fillStyle(0xc9cfd3, 0.18); g.fillEllipse(fx, fy, 22, 6);
    }
    for (const m of MAUS) if (inView(m.pool.x, m.pool.y, view, 200)) for (let i = 0; i < 2; i++) marshBubble(g, m.pool.x + 30 + i * 80, m.pool.y + 30, t, i * 0.4 + m.x * 0.001);
    // The mire breathing at the edges near the camera.
    for (let i = 0; i < 16; i++) {
      const x = 80 + i * 150, y = i % 2 ? 40 : 1776;
      if (inView(x, y, view)) marshBubble(g, x, y, t, i * 0.13);
    }
    // The Slough's mouth: a faint green breath going in and out.
    if (inView(SLOUGH_DOOR.x, SLOUGH_DOOR.y, view, 300)) {
      const open = world.test({ princesOfIsle: 'slime', count: 6 });
      const pulse = 0.5 + Math.sin(t * 0.8) * 0.5;
      glow(g, SLOUGH_DOOR.x, SLOUGH_DOOR.y - 50, 40 + pulse * 10, open ? 0xffc66a : MARSH_GAS, open ? 0.07 : 0.04, 4);
    }
    // After Mortis: the Lych House door stands open, warm light on the step.
    if (world.test({ prince: 'mortis' }) && inView(LYCH_HOUSE.x, LYCH_HOUSE.y, view, 300)) {
      g.fillStyle(LAMP, 0.1 + Math.sin(t * 2) * 0.02); g.fillEllipse(LYCH_HOUSE.x, LYCH_HOUSE.y + 20, 160, 40);
    }
  },

  animateOver(g, t, view, world) {
    // Marsh-lights over the graves. After the Matriarch falls, fewer — the dead resting at last.
    const calm = world.test({ monarch: 'nyxa' });
    wispSpots.forEach((w, i) => {
      if ((calm && i % 3) || !inView(w.x, w.y, view)) return;
      wisp(g, w.x, w.y, t, i * 1.7, 0.9);
    });
    // One bell in the Sexton's field rings when nobody is near it. Until the Prince falls, it always will.
    if (!world.test({ prince: 'mortis' })) {
      const p = BELL_POSTS[6];
      if (inView(p.x, p.y, view)) {
        const ph = (t / 3) % 1;
        g.lineStyle(1.5, 0xe2b462, 0.5 * (1 - ph)); g.strokeCircle(p.x + 18, p.y - 45, 8 + ph * 40);
      }
    }
    // Low ground-mist drifting across the field.
    for (let i = 0; i < 10; i++) {
      const y = view.y + ((i * 173) % Math.max(1, view.h));
      const x = view.x + (((t * 14 + i * 300) % (view.w + 400)) - 200);
      g.fillStyle(WISP, 0.025); g.fillEllipse(x, y, 260, 26);
    }
  },
};

export const GRAVE_AREA: AreaDef = {
  id: 'grave',
  isle: 'slime',
  court: 'grave',
  name: 'The Grave Court',
  subtitle: 'Every name goes in the Register, and every name goes down',
  w: GRAVE_W,
  h: GRAVE_H,
  bg: MIRE_DEEP,
  accent: GRAVE_COLOR,
  weather: 'wisps',
  gloom: 0.25,
  spawn: { x: ROAD_X, y: 1620 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'fang', label: 'Down the Carrying Road to the Fang Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1070, y: 1712 } },
    { kind: 'prince', id: 'mortis', at: { x: LYCH_HOUSE.x, y: LYCH_HOUSE.y + 46 } },
    {
      kind: 'door', at: SLOUGH_DOOR, to: 'slough', arrive: { x: 900, y: 2440 }, label: 'Into the Slough',
      open: { princesOfIsle: 'slime', count: 6 },
      lockedText: 'A chain of bones and bells across the tail of the Matriarch\'s skin. It opens when all six courts have fallen.',
    },
    { kind: 'water', id: 'grave-pool', shape: LYCH_POOL, fishery: 'grave-pool' },
    { kind: 'encounter', id: 'grave-open-graves' },
    { kind: 'encounter', id: 'grave-safety-bells' },
    { kind: 'encounter', id: 'grave-funeral' },
    { kind: 'encounter', id: 'grave-epitaphs' },
    { kind: 'encounter', id: 'grave-last-breath' },
    {
      kind: 'sign', at: { x: 1290, y: 1640 },
      text: 'THE GRAVE COURT. All who are carried in are entered in the Register. All who are entered are buried.',
    },
    {
      kind: 'sign', at: { x: 2120, y: 1650 },
      text: 'THE QUIET WARD. The passed-over wait here. Visiting is a kindness the Matriarch does not require.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 230 },
      text: 'THE SLOUGH. Her Grace\'s cast skin. Closed by her order until the six courts kneel.',
    },
    {
      kind: 'sign', at: { x: 1580, y: 1250 },
      text: 'SEXTON\'S FIELD. Should a bell ring, inform the Sexton. Do not dig.',
    },
    { kind: 'chest', id: 'grave-chest-rows', at: { x: 110, y: 1180 }, coins: 140 },
    { kind: 'chest', id: 'grave-chest-lych', at: { x: 1960, y: 470 }, orbs: 2, open: { prince: 'mortis' } },
  ],
  npcs: GRAVE_NPCS,
  crowd: GRAVE_CROWD,
};
