import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, glow, groundFill, lit, type G } from '../../../../art/IsleArt';
import {
  basketBakery, boardwalk, cattail, charmerBasket, coiledSnake, fenPool, greatFang, mangrove, milkingHall, milkingShed,
  mireFlower, phialStall, pipersMat, rationBoard, reedLamp, sedge, serpentPost, SKIN_ADDER, SKIN_VIPER, snakePitFloor,
  stiltHut, venomVat, wickerWall, type HutOpts,
} from './art';
import {
  FANG_COLOR, FEN, FEN_LIT, GAS, LAMP, LAMP_HOT, MOSS, MUD, MUD_DARK, MUD_LIT, SEDGE_DARK, TIMBER, TIMBER_DARK,
  VENOM, VENOM_LIT, VIPER,
} from './palette';
import { FANG_CROWD, FANG_NPCS } from './npcs';

/**
 * The Fang Court — the venom-milkers' town on a steaming fen, first court north of Stilthaven.
 *
 * Read it from the Stilthaven causeway up:
 * • **the causeway** (south): the boardwalk comes in over black water past the waystone, two
 *   carved serpent posts and the Draught ration board — the list of who gets a dose this moon;
 * • **the venom fen** (south-west): the court's deep pool, where the adders and the cobra-catfish
 *   are fished with an antivenin rod — Granny Hesp's stilt-hut on its north bank;
 * • **the Charmers' Square** at the crossing of the causeway and the Long Walk (Web Court west,
 *   Cloak Court east): a round plank deck where the charmers play, with *The Charmer's Basket*
 *   bakery on its south-west corner and Scaleby's phial stall to the south-east;
 * • **the pit-yard** (north-west): withy walls round three snake pits, where Pitkeeper Asp breeds
 *   the court's stock;
 * • **the Milking Shed** (south-east): the long shed where the serpents are yoked and milked into
 *   the glowing trough;
 * • **the vats** (north-east): where the milked venom is steeped and sent north to the Matriarch's
 *   still — and where the Dosekeeper keeps her book;
 * • **the Milking Hall** (north, east of the Grave road): Prince Venin's hall on its piles, the roof
 *   swept up into a cobra's hood over the door.
 *
 * Between them, the white fangs of rock stand up out of the fen, and the boardwalks go round them.
 */

export const FANG_W = 2400;
export const FANG_H = 1700;

const ROAD_X = 1200;
const ROAD_Y = 850;

/** The Charmers' Square, at the crossing. */
export const SQUARE: Pt = { x: ROAD_X, y: ROAD_Y };
const SQUARE_R = 150;
/** The venom fen — the court's fishing water. */
export const FEN_POOL: Rect = { x: 220, y: 1170, w: 560, h: 280 };
/** Prince Venin's Milking Hall: the middle of its front step. */
export const HALL: Pt = { x: 1640, y: 420 };
const HALL_W = 520;
/** The Milking Shed's base line (centre). */
export const SHED: Pt = { x: 1820, y: 1250 };
const SHED_W = 520;
/** The pit-yard's withy walls. */
export const PIT_YARD: Rect = { x: 300, y: 300, w: 560, h: 400 };
const PIT_GATE = { x0: 540, x1: 620 };
/** The three snake pits in the yard. */
export const PITS: Pt[] = [{ x: 430, y: 430 }, { x: 730, y: 430 }, { x: 420, y: 610 }];
/** The Charmer's Basket — the bakery's front. */
export const BAKERY: Pt = { x: 920, y: 1010 };
/** Scaleby's stall. */
export const STALL: Pt = { x: 1500, y: 1020 };
/** The Weeping Fang, the tallest of the court's teeth, north of the square. */
export const WEEPING_FANG: Pt = { x: 960, y: 280 };
/** The venom vats. */
export const VATS: { x: number; y: number; s: number }[] = [{ x: 2030, y: 610, s: 1 }, { x: 2200, y: 700, s: 0.85 }, { x: 2180, y: 520, s: 0.7 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lamps whose flames flicker in `animate`. */
const lamps: Pt[] = [];
/** Lit hut windows that breathe in `animate`. */
const windows: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The Milking Hall.
addPiece(HALL.x, HALL.y, HALL_W + 120, 360, (g, rng) => milkingHall(g, HALL.x, HALL.y, HALL_W, 110, rng),
  { kind: 'rect', x: HALL.x - HALL_W / 2 - 20, y: HALL.y - 44, w: HALL_W + 40, h: 40 });

// The Milking Shed.
addPiece(SHED.x, SHED.y, SHED_W + 80, 220, (g, rng) => milkingShed(g, SHED.x, SHED.y, SHED_W, 96, rng),
  { kind: 'rect', x: SHED.x - SHED_W / 2 - 12, y: SHED.y - 36, w: SHED_W + 24, h: 36 });

// The vats.
for (const v of VATS) {
  addPiece(v.x, v.y, 120 * v.s, 170 * v.s, (g) => venomVat(g, v.x, v.y, v.s), { kind: 'circle', x: v.x, y: v.y - 10, r: 40 * v.s });
}

// The pit-yard: withy walls in short runs (each its own piece so the walk-behind sorts right).
const yardWalls: [Pt, Pt][] = [
  [{ x: PIT_YARD.x, y: PIT_YARD.y }, { x: PIT_YARD.x + PIT_YARD.w, y: PIT_YARD.y }],
  [{ x: PIT_YARD.x, y: PIT_YARD.y + PIT_YARD.h }, { x: PIT_GATE.x0, y: PIT_YARD.y + PIT_YARD.h }],
  [{ x: PIT_GATE.x1, y: PIT_YARD.y + PIT_YARD.h }, { x: PIT_YARD.x + PIT_YARD.w, y: PIT_YARD.y + PIT_YARD.h }],
];
for (const [a, b] of yardWalls) {
  // Long runs are split so each section sorts against actors on its own.
  const n = Math.ceil(Math.abs(b.x - a.x) / 140);
  for (let i = 0; i < n; i++) {
    const p = { x: a.x + ((b.x - a.x) * i) / n, y: a.y }, q = { x: a.x + ((b.x - a.x) * (i + 1)) / n, y: a.y };
    addPiece((p.x + q.x) / 2, p.y, Math.abs(q.x - p.x) + 20, 70, (g) => wickerWall(g, p, q, 40));
  }
  solids.push({ kind: 'rect', x: Math.min(a.x, b.x), y: a.y - 12, w: Math.abs(b.x - a.x), h: 14 });
}
for (const x of [PIT_YARD.x, PIT_YARD.x + PIT_YARD.w]) {
  for (let y = PIT_YARD.y + 50; y <= PIT_YARD.y + PIT_YARD.h; y += 50) {
    const p = { x, y: y - 50 }, q = { x, y };
    addPiece(x, y, 30, 100, (g) => wickerWall(g, p, q, 40));
  }
  solids.push({ kind: 'rect', x: x - 7, y: PIT_YARD.y - 12, w: 14, h: PIT_YARD.h + 14 });
}
for (const p of PITS) solids.push({ kind: 'circle', x: p.x, y: p.y, r: 46 });
// The gate posts, each with a skull-less serpent post.
for (const x of [PIT_GATE.x0 - 6, PIT_GATE.x1 + 6]) addPiece(x, PIT_YARD.y + PIT_YARD.h + 2, 30, 90, (g) => serpentPost(g, x, PIT_YARD.y + PIT_YARD.h + 2, 70));

// The great fangs.
const FANGS: [number, number, number, number][] = [
  [WEEPING_FANG.x, WEEPING_FANG.y, 1.15, 0.3], [130, 1080, 0.8, -0.3], [1050, 1300, 0.85, 0.4], [2300, 400, 1.0, -0.45],
  [1590, 1640, 0.7, 0.25], [700, 160, 0.75, -0.2], [2290, 1320, 0.8, -0.3],
];
for (const [x, y, s, lean] of FANGS) {
  addPiece(x + lean * 30 * s, y, 140 * s, 200 * s, (g, rng) => greatFang(g, x, y, s, lean, rng), { kind: 'circle', x, y: y - 8, r: 24 * s });
}

// Mangroves.
const MANGROVES: [number, number, number][] = [[140, 540, 1], [2300, 1110, 0.9], [100, 1600, 0.85], [1900, 1640, 0.8], [180, 180, 0.9], [2120, 160, 0.75]];
for (const [x, y, s] of MANGROVES) {
  addPiece(x, y, 180 * s, 230 * s, (g, rng) => mangrove(g, x, y, s, rng), { kind: 'circle', x, y: y - 12, r: 38 * s });
}

// Stilt-huts: Granny Hesp's on the fen's bank, Corwen's on the east walk, Nell's by the causeway, and others.
const HUTS: [number, number, number, number, HutOpts][] = [
  [300, 980, 92, 56, { glow: LAMP, skins: 3, door: 'right' }],
  [2160, 1010, 100, 58, { glow: LAMP, skins: 2, door: 'left', mask: true }],
  [1500, 1500, 90, 54, { glow: 0, skins: 1, door: 'centre' }],
  [2050, 1500, 96, 56, { glow: LAMP, skins: 2, door: 'right', mask: true }],
  [760, 1620, 84, 50, { glow: LAMP, skins: 2, door: 'left' }],
  [2220, 1580, 80, 50, { glow: 0, skins: 3, door: 'centre' }],
  [430, 150, 90, 52, { glow: LAMP, skins: 2, door: 'centre', mask: true }],
  [1980, 220, 84, 50, { glow: LAMP, skins: 1, door: 'left' }],
];
for (const [x, y, w, h, o] of HUTS) {
  addPiece(x, y, w + 60, h * 2 + 80, (g, rng) => stiltHut(g, x, y, w, h, rng, o), { kind: 'rect', x: x - w / 2 - 8, y: y - 26, w: w + 16, h: 28 });
  if (o.glow) windows.push({ x: o.door === 'left' ? x + w * 0.24 : x - w * 0.24, y: y - 34 - 6 - h + h * 0.25 + 6 });
}

// The Charmer's Basket and Scaleby's stall.
addPiece(BAKERY.x, BAKERY.y, 220, 230, (g, rng) => basketBakery(g, BAKERY.x, BAKERY.y, 140, 90, rng),
  { kind: 'rect', x: BAKERY.x - 84, y: BAKERY.y - 30, w: 168, h: 30 });
addPiece(STALL.x, STALL.y, 180, 120, (g, rng) => phialStall(g, STALL.x, STALL.y, 130, rng),
  { kind: 'rect', x: STALL.x - 68, y: STALL.y - 30, w: 136, h: 30 });

// The charmers' baskets round the square.
for (const [x, y, s] of [[1390, 925, 1], [1010, 760, 0.8], [1400, 770, 0.7]] as [number, number, number][]) {
  addPiece(x, y, 60 * s, 50 * s, (g) => charmerBasket(g, x, y, s), { kind: 'circle', x, y: y - 6, r: 18 * s });
}

// The ration board at the causeway, and the serpent posts at the gates in and out.
addPiece(1340, 1560, 80, 80, (g, rng) => rationBoard(g, 1340, 1560, rng), { kind: 'rect', x: 1304, y: 1550, w: 72, h: 10 });
for (const [x, y] of [[1110, 1540], [1290, 1540], [1110, 170], [1290, 170], [130, 790], [130, 910], [2270, 790], [2270, 910]] as [number, number][]) {
  addPiece(x, y, 30, 90, (g) => serpentPost(g, x, y, 64), { kind: 'circle', x, y: y - 3, r: 6 });
}

// Reed lamps along the walks.
for (const [x, y] of [[1150, 1380], [1260, 1120], [1150, 620], [1260, 330], [420, 900], [820, 800], [1660, 900], [2080, 800], [900, 1260], [1700, 1360]] as [number, number][]) {
  addPiece(x, y, 40, 90, (g) => reedLamp(g, x, y), { kind: 'circle', x, y: y - 2, r: 6 });
  lamps.push({ x: x + 16, y: y - 57 });
}

// Solids: the fen pool.
solids.push({ kind: 'rect', x: FEN_POOL.x - 10, y: FEN_POOL.y - 10, w: FEN_POOL.w + 20, h: FEN_POOL.h + 20 });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** Small black pools scattered across the mud (ground only — ankle-deep, walkable). */
const PUDDLES: [number, number, number, number][] = [
  [700, 1080, 90, 40], [1500, 1220, 70, 28], [1800, 1440, 110, 36], [2150, 1260, 80, 30], [1400, 640, 90, 34],
  [860, 560, 60, 24], [1700, 760, 80, 26], [300, 1380 + 120, 60, 22], [2000, 380, 70, 26], [1020, 1560, 70, 24],
];
/** Where the slow fen bubbles rise and pop in the big pool. */
const BUBBLE_SPOTS: Pt[] = Array.from({ length: 7 }, (_, i) => ({
  x: FEN_POOL.x + 70 + ((i * 131) % (FEN_POOL.w - 140)), y: FEN_POOL.y + 50 + ((i * 71) % (FEN_POOL.h - 100)),
}));

const painter: AreaPainter = {
  ground(g, rng) {
    // Peat and mud, darker towards the edges where the fen takes over.
    groundFill(g, { x: 0, y: 0, w: FANG_W, h: FANG_H }, MUD, MUD_DARK, MUD_LIT, rng, 1.2);
    for (let i = 0; i < 70; i++) blob(g, rng() * FANG_W, rng() * FANG_H, 60 + rng() * 120, 30 + rng() * 60, rng() < 0.5 ? SEDGE_DARK : MUD_DARK, 0.35, rng);
    // Black water lapping in at the edges.
    for (let i = 0; i < 40; i++) {
      const side = i % 4;
      const x = side === 0 ? rng() * 90 : side === 1 ? FANG_W - rng() * 90 : rng() * FANG_W;
      const y = side === 2 ? rng() * 60 : side === 3 ? FANG_H - rng() * 50 : rng() * FANG_H;
      if (Math.abs(x - ROAD_X) < 160 || Math.abs(y - ROAD_Y) < 120) continue;
      blob(g, x, y, 80 + rng() * 60, 40 + rng() * 30, FEN, 0.8, rng);
    }
    for (const [x, y, w, h] of PUDDLES) {
      g.fillStyle(MUD_DARK, 1); g.fillEllipse(x, y, w + 14, h + 8);
      g.fillStyle(FEN, 1); g.fillEllipse(x, y, w, h);
      g.lineStyle(1.2, FEN_LIT, 0.4); g.strokeEllipse(x - 4, y - 2, w * 0.6, h * 0.4);
    }
    // Sedge, cattails and mire-flowers everywhere the walks are not.
    for (let i = 0; i < 520; i++) {
      const x = rng() * FANG_W, y = rng() * FANG_H;
      if (Math.abs(x - ROAD_X) < 60 || Math.abs(y - ROAD_Y) < 50) continue;
      const r = rng();
      if (r < 0.62) sedge(g, x, y, 0.7 + rng() * 0.5, rng);
      else if (r < 0.8) cattail(g, x, y, 16 + rng() * 14, (rng() - 0.5) * 8);
      else mireFlower(g, x, y, 0.8 + rng() * 0.5);
    }
    // The pit-yard: trampled mud, scuffed in rings, scattered with old skins.
    g.fillStyle(MUD_DARK, 0.7); g.fillRect(PIT_YARD.x, PIT_YARD.y, PIT_YARD.w, PIT_YARD.h);
    for (let i = 0; i < 90; i++) { g.fillStyle(MUD_LIT, 0.25); g.fillEllipse(PIT_YARD.x + rng() * PIT_YARD.w, PIT_YARD.y + rng() * PIT_YARD.h, 16, 5); }
    for (const p of PITS) snakePitFloor(g, p.x, p.y, 46, rng);
    // A trampled path from the yard gate down to the Long Walk.
    boardwalk(g, [{ x: (PIT_GATE.x0 + PIT_GATE.x1) / 2, y: PIT_YARD.y + PIT_YARD.h - 4 }, { x: (PIT_GATE.x0 + PIT_GATE.x1) / 2, y: ROAD_Y }], 46, rng);
    // The venom fen.
    fenPool(g, FEN_POOL, rng);
    // The walks: the causeway north–south and the Long Walk east–west, and spurs to the places.
    boardwalk(g, [{ x: ROAD_X, y: FANG_H + 10 }, { x: ROAD_X, y: ROAD_Y }, { x: ROAD_X, y: -10 }], 74, rng);
    boardwalk(g, [{ x: -10, y: ROAD_Y }, { x: ROAD_X, y: ROAD_Y }, { x: FANG_W + 10, y: ROAD_Y }], 70, rng);
    boardwalk(g, [{ x: ROAD_X, y: 560 }, { x: 1440, y: 560 }, { x: HALL.x, y: HALL.y + 50 }], 54, rng);
    boardwalk(g, [{ x: ROAD_X, y: 1180 }, { x: 1560, y: 1300 }, { x: 2080, y: 1300 }], 54, rng);
    boardwalk(g, [{ x: 1700, y: ROAD_Y }, { x: 1900, y: 720 }, { x: 2120, y: 760 }], 48, rng);
    boardwalk(g, [{ x: ROAD_X, y: 1420 }, { x: 880, y: 1420 }, { x: 880, y: 1500 }, { x: 520, y: 1500 }], 48, rng);
    boardwalk(g, [{ x: 760, y: ROAD_Y }, { x: 520, y: 980 }, { x: 300, y: 1030 }], 46, rng);
    boardwalk(g, [{ x: 1800, y: ROAD_Y }, { x: 2140, y: 1060 }], 44, rng);
    // The Charmers' Square: a round plank deck at the crossing, a painted ring, the old piper's mat.
    g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(SQUARE.x, SQUARE.y + 4, SQUARE_R * 2 + 10, SQUARE_R * 1.5 + 10);
    g.fillStyle(TIMBER, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2, SQUARE_R * 1.5);
    for (let i = -SQUARE_R; i < SQUARE_R; i += 14) {
      const hw = Math.sqrt(Math.max(0, SQUARE_R * SQUARE_R - i * i));
      g.lineStyle(1, TIMBER_DARK, 0.7); g.lineBetween(SQUARE.x + i, SQUARE.y - hw * 0.75, SQUARE.x + i, SQUARE.y + hw * 0.75);
    }
    g.lineStyle(4, VENOM, 0.35); g.strokeEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 1.6, SQUARE_R * 1.2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(VENOM, 0.35); g.fillCircle(SQUARE.x + Math.cos(a) * SQUARE_R * 0.8, SQUARE.y + Math.sin(a) * SQUARE_R * 0.6, 4);
    }
    pipersMat(g, SQUARE.x + 70, SQUARE.y + 40, 70, 40, 0.9);
    // The vat yard: stained planks and a spilt-venom crust.
    g.fillStyle(TIMBER_DARK, 0.6); g.fillRect(1900, 480, 400, 300);
    for (let i = 0; i < 26; i++) { g.fillStyle(VENOM, 0.08 + rng() * 0.08); g.fillEllipse(1920 + rng() * 360, 500 + rng() * 260, 20 + rng() * 30, 8 + rng() * 10); }
    // Before the Milking Hall: the tithe deck where milkers queue with their jars.
    g.fillStyle(TIMBER, 0.85); g.fillRect(HALL.x - 220, HALL.y, 440, 90);
    for (let x = HALL.x - 220; x < HALL.x + 220; x += 12) { g.lineStyle(1, TIMBER_DARK, 0.7); g.lineBetween(x, HALL.y, x, HALL.y + 90); }
    g.lineStyle(2, TIMBER_DARK, 1); g.strokeRect(HALL.x - 220, HALL.y, 440, 90);
    // In front of the Shed: spilt venom along the trough line.
    for (let i = 0; i < 20; i++) { g.fillStyle(VENOM, 0.1); g.fillEllipse(SHED.x - 240 + rng() * 480, SHED.y + 14 + rng() * 20, 14 + rng() * 20, 4 + rng() * 5); }
    // Moss on the roots of everything.
    for (let i = 0; i < 120; i++) { g.fillStyle(MOSS, 0.3); g.fillCircle(rng() * FANG_W, rng() * FANG_H, 3 + rng() * 6); }
  },

  pieces,

  animate(g, t, view) {
    // The fen breathing: bubbles rise and pop, rings spread, the sheen slides.
    const fcx = FEN_POOL.x + FEN_POOL.w / 2, fcy = FEN_POOL.y + FEN_POOL.h / 2;
    if (inView(fcx, fcy, view, 360)) {
      BUBBLE_SPOTS.forEach((p, i) => {
        const ph = (t * 0.28 + i * 0.37) % 1;
        if (ph < 0.7) {
          const r = 2 + ph * 7;
          g.fillStyle(GAS, 0.35); g.fillCircle(p.x, p.y - r * 0.3, r);
          g.fillStyle(0xffffff, 0.4); g.fillCircle(p.x - r * 0.3, p.y - r * 0.7, r * 0.25);
        } else {
          const k = (ph - 0.7) / 0.3;
          g.lineStyle(1.2, FEN_LIT, 0.6 * (1 - k)); g.strokeEllipse(p.x, p.y, 10 + k * 40, 4 + k * 14);
          g.fillStyle(GAS, 0.2 * (1 - k)); g.fillCircle(p.x, p.y - 6 - k * 14, 6 + k * 12);
        }
      });
      const sx = FEN_POOL.x + 40 + ((t * 18) % (FEN_POOL.w - 80));
      g.lineStyle(2, 0x5a3a6a, 0.18); g.strokeEllipse(sx, fcy + Math.sin(t * 0.5) * 30, 90, 16);
      // A cobra-catfish's back breaking the surface now and then.
      const ph = (t * 0.1) % 1;
      if (ph < 0.12) {
        const k = ph / 0.12;
        const cx = fcx - 120 + Math.sin(t * 0.07) * 160, cy = fcy + 20;
        g.fillStyle(0x2a2418, 0.8 * Math.sin(k * Math.PI)); g.fillEllipse(cx + k * 30, cy, 30, 8);
        g.fillStyle(0x6a5a30, 0.6 * Math.sin(k * Math.PI)); g.fillTriangle(cx + k * 30 - 4, cy - 2, cx + k * 30 + 6, cy - 2, cx + k * 30, cy - 10);
      }
    }
    // Small puddles: a slow ring each.
    for (const [x, y, w, h] of PUDDLES) {
      if (!inView(x, y, view)) continue;
      const ph = (t * 0.25 + x * 0.001) % 1;
      g.lineStyle(1, FEN_LIT, 0.4 * (1 - ph)); g.strokeEllipse(x + w * 0.1, y, w * 0.2 + ph * w * 0.5, h * 0.2 + ph * h * 0.5);
    }
    // Snakes in the pits: heads rising and sinking, eyes catching the light.
    for (let i = 0; i < PITS.length; i++) {
      const p = PITS[i];
      if (!inView(p.x, p.y, view)) continue;
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.2 + i * 0.3 + k * 0.5) % 1;
        const rise = Math.sin(ph * Math.PI);
        const a = t * 0.6 + k * 2 + i;
        const hx = p.x + Math.cos(a) * 18, hy = p.y + 6 + Math.sin(a) * 6;
        g.lineStyle(4, k ? VIPER : 0x6e6a3a, 1); g.lineBetween(hx, hy + 4, hx + Math.cos(a) * 3, hy - rise * 16);
        g.fillStyle(k ? VIPER : 0x6e6a3a, 1); g.fillEllipse(hx + Math.cos(a) * 3, hy - rise * 16 - 2, 8, 6);
        g.fillStyle(0xf2d232, 1); g.fillCircle(hx + Math.cos(a) * 3 - 1.5, hy - rise * 16 - 3, 1); g.fillCircle(hx + Math.cos(a) * 3 + 1.5, hy - rise * 16 - 3, 1);
      }
    }
    // One adder basking on the Long Walk west of the square, and a viper on the fen bank.
    if (inView(780, 870, view)) coiledSnake(g, 780, 872, 0.8, SKIN_ADDER, 0, 0, t * 1000);
    if (inView(860, 1180, view)) coiledSnake(g, 860, 1180, 0.7, SKIN_VIPER, Math.PI, 0, t * 1000 + 300);
    // A grass snake slithering across the sedge south of the shed, on a loop.
    {
      const ph = (t * 0.05) % 1;
      const sx = 1560 + ph * 640, sy = 1400 + Math.sin(ph * 9) * 20;
      if (inView(sx, sy, view)) {
        for (let i = 0; i < 9; i++) {
          const k = i / 9;
          g.fillStyle(i === 0 ? VIPER : dim(VIPER, k * 0.3), 1);
          g.fillCircle(sx - i * 6, sy + Math.sin(t * 6 - i * 0.8) * 4, 3.4 - k * 1.6);
        }
      }
    }
    // The vats: slow bubbles on the venom.
    for (const v of VATS) {
      if (!inView(v.x, v.y - 80, view)) continue;
      const topY = v.y - 18 * v.s - 64 * v.s;
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.5 + k * 0.5 + v.x * 0.01) % 1;
        g.fillStyle(VENOM_LIT, 0.7 * (1 - ph)); g.fillCircle(v.x - 12 * v.s + k * 20 * v.s, topY - ph * 4, 1.5 + ph * 3);
      }
      glow(g, v.x, topY - 10, 30 * v.s, VENOM, 0.02 + Math.sin(t * 2 + v.x) * 0.01, 2);
    }
    // The shed trough's pulse, and the drips falling into it.
    if (inView(SHED.x, SHED.y - 60, view, 340)) {
      const ty = SHED.y - 40;
      g.fillStyle(VENOM_LIT, 0.15 + Math.sin(t * 1.4) * 0.08); g.fillRect(SHED.x - SHED_W / 2 + 12, ty - 2, SHED_W - 24, 2);
      const n = Math.floor((SHED_W - 40) / 46);
      for (let i = 0; i < n; i++) {
        const sx = SHED.x - SHED_W / 2 + 34 + i * ((SHED_W - 68) / (n - 1));
        const ph = (t * 0.9 + i * 0.29) % 1;
        const top = SHED.y - 22 - 96 + 96 * 0.22 + 34;
        g.fillStyle(VENOM, 0.9); g.fillCircle(sx, top + ph * (ty - top), 1.6);
      }
    }
    // Drips off the Weeping Fang's tip into the mud.
    if (inView(WEEPING_FANG.x, WEEPING_FANG.y - 100, view, 200)) {
      const tipX = WEEPING_FANG.x + 0.3 * 60 * 1.15, tipY = WEEPING_FANG.y - 170 * 1.15;
      const ph = (t * 0.4) % 1;
      g.fillStyle(VENOM, 0.9); g.fillCircle(tipX, tipY + 8 + ph * ph * 160, 2);
      if (ph > 0.9) { g.lineStyle(1, VENOM_LIT, (1 - ph) * 8); g.strokeEllipse(tipX, tipY + 170, 10 + (ph - 0.9) * 200, 4); }
    }
    // Lamps and windows: warm light in the murk.
    for (const l of lamps) {
      if (!inView(l.x, l.y, view)) continue;
      const fl = 0.75 + Math.sin(t * 9 + l.x) * 0.12 + Math.sin(t * 23 + l.y) * 0.08;
      glow(g, l.x, l.y, 26 * fl, LAMP, 0.05, 3);
      g.fillStyle(LAMP_HOT, 0.6 * fl); g.fillCircle(l.x, l.y, 2.5);
    }
    for (const w of windows) {
      if (!inView(w.x, w.y, view)) continue;
      glow(g, w.x, w.y, 16, LAMP, 0.03 + Math.sin(t * 1.3 + w.x) * 0.012, 2);
    }
    // The Milking Hall's braziers.
    if (inView(HALL.x, HALL.y - 80, view, 300)) {
      for (const k of [-1, 1]) {
        const bx = HALL.x + k * 120, by = HALL.y - 44 - 40;
        const fl = Math.sin(t * 11 + k) * 3;
        g.fillStyle(VENOM, 0.55); g.fillTriangle(bx - 7, by + 8, bx + 7, by + 8, bx + fl, by - 20);
        g.fillStyle(VENOM_LIT, 0.6); g.fillTriangle(bx - 3, by + 8, bx + 3, by + 8, bx + fl * 0.5, by - 6);
        glow(g, bx, by - 4, 34, VENOM, 0.04, 3);
      }
    }
  },

  animateOver(g, t, view) {
    // Low steam crawling off the fen and the puddles.
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 397) % FANG_W) + Math.sin(t * 0.07 + i) * 120;
      const by = ((i * 233) % FANG_H) + Math.cos(t * 0.05 + i * 2) * 40;
      if (!inView(bx, by, view, 200)) continue;
      const a = 0.05 + Math.sin(t * 0.3 + i) * 0.02;
      g.fillStyle(0xd8e8d0, a); g.fillEllipse(bx, by, 220, 46);
      g.fillStyle(0xd8e8d0, a * 0.7); g.fillEllipse(bx + 60, by - 12, 140, 30);
    }
    // Steam off the fen pool itself.
    const fcx = FEN_POOL.x + FEN_POOL.w / 2, fcy = FEN_POOL.y + FEN_POOL.h / 2;
    if (inView(fcx, fcy, view, 360)) {
      for (let i = 0; i < 8; i++) {
        const ph = (t * 0.08 + i / 8) % 1;
        const x = FEN_POOL.x + 40 + ((i * 89) % (FEN_POOL.w - 80)) + Math.sin(t * 0.4 + i) * 16;
        const y = fcy + 40 - ph * 120;
        g.fillStyle(0xe0f0d8, 0.1 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 18 + ph * 22);
      }
    }
    // Fen-lights: little green will-o'-the-wisps over the water at the edges.
    for (let i = 0; i < 10; i++) {
      const x = ((i * 523) % FANG_W) + Math.sin(t * 0.5 + i * 3) * 40;
      const y = ((i * 317 + 200) % FANG_H) + Math.cos(t * 0.7 + i) * 20;
      if (!inView(x, y, view)) continue;
      const a = 0.4 + Math.sin(t * 3 + i * 1.7) * 0.3;
      g.fillStyle(lit(GAS, 0.3), a); g.fillCircle(x, y, 2);
      glow(g, x, y, 10, GAS, 0.04 * a, 2);
    }
    // Webs in the light: a glint sliding along a strand under the Hall's eaves.
    if (inView(HALL.x, HALL.y - 160, view, 300)) {
      const ph = (t * 0.15) % 1;
      g.fillStyle(0xffffff, 0.35 * Math.sin(ph * Math.PI)); g.fillCircle(HALL.x - HALL_W / 2 + 20 + ph * HALL_W, HALL.y - 150, 2);
    }
    // Midges over the square at dusk.
    if (inView(SQUARE.x, SQUARE.y, view, 200)) {
      for (let i = 0; i < 14; i++) {
        const x = SQUARE.x - 60 + Math.sin(t * 2.3 + i * 1.3) * 50 + i * 8, y = SQUARE.y - 70 + Math.cos(t * 3.1 + i) * 16;
        g.fillStyle(0x1a1a14, 0.5); g.fillCircle(x, y, 1);
      }
    }
  },
};

export const FANG_AREA: AreaDef = {
  id: 'fang',
  isle: 'slime',
  court: 'fang',
  name: 'The Fang Court',
  subtitle: 'Where the Matriarch\'s venom is milked, and her Draught is owed',
  w: FANG_W,
  h: FANG_H,
  bg: FEN,
  accent: FANG_COLOR,
  weather: 'miasma',
  gloom: 0.12,
  spawn: { x: 1200, y: 1600 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'stilthaven', label: 'Down the causeway to Stilthaven' },
    { side: 'n', to: 'grave', label: 'North past the fangs to the Grave Court' },
    { side: 'w', to: 'web', at: ROAD_Y, label: 'The Long Walk west to the Web Court' },
    { side: 'e', to: 'cloak', at: ROAD_Y, label: 'The Long Walk east to the Cloak Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1600 } },
    { kind: 'prince', id: 'venin', at: { x: HALL.x, y: HALL.y + 50 } },
    { kind: 'water', id: 'fang-fen', shape: FEN_POOL, fishery: 'fang-fen' },
    { kind: 'encounter', id: 'fang-snake-pit' },
    { kind: 'encounter', id: 'fang-the-mark' },
    { kind: 'encounter', id: 'fang-fen-gas' },
    { kind: 'encounter', id: 'fang-shed-skin' },
    { kind: 'encounter', id: 'fang-charmers-pipe' },
    {
      kind: 'sign', at: { x: 1400, y: 1600 },
      text: 'THE DRAUGHT, THIS MOON. Households in good standing, one dose a Mark. The passed-over are listed below. No appeal.',
    },
    {
      kind: 'sign', at: { x: 680, y: 760 },
      text: 'THE PIT-YARD. Stock of His Highness. A hand put in a pit is a hand put in a pit. The Pitkeeper does not fish them out.',
    },
    {
      kind: 'sign', at: { x: 1560, y: 1340 },
      text: 'THE MILKING SHED. Thirty jars a hand a moon. Short is tithed from the household\'s Draught.',
    },
    {
      kind: 'sign', at: { x: 640, y: 1500 },
      text: 'THE VENOM FEN. Fish only with an antivenin rod. A bitten line is your own business.',
    },
    { kind: 'chest', id: 'fang-chest-fen', at: { x: 2330, y: 1640 }, coins: 110 },
    { kind: 'chest', id: 'fang-chest-hall', at: { x: 2240, y: 330 }, orbs: 2, open: { prince: 'venin' } },
  ],
  npcs: FANG_NPCS,
  crowd: FANG_CROWD,
};
