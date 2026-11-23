import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { barrel, crate, glow, lit, motes, type G } from '../../../../art/IsleArt';
import {
  barracks, bellTent, chequerRoad, cookfire, crater, draftDrum, draftStage, duckboardBridge, fieldGun, grandstand,
  horse, houseGate, houseWheel, lantern, mapTable, mudGround, numbersBoard, palisade, paradeGround, pavilion,
  quartermaster, quintain, sandbags, stable, summitWall, tiltRail, trebuchet, trenchRun, warBanner, warWaystone,
  type Suit,
} from './art';
import {
  BAIZE, BAIZE_DARK, BAIZE_LIT, BANNERET, BOG_LIT, GILT, INK, LAMP, MUD_DARK, MUD_LIT, RED, SAND_DARK, STONE,
  STONE_DARK, TIMBER, TIMBER_DARK, WAR_COLOR,
} from './palette';
import { WAR_CROWD, WAR_NPCS } from './npcs';

/**
 * The War Court — the war-lottery town on the summit slope, under the House's wall.
 *
 * Read it from the Card Court road up:
 * • **the Muster Gate** (south): the road comes in through a stake palisade past the waystone (a
 *   cannon set in the ground with a die for a breech) and Quartermaster Brass's stall;
 * • **the Drafting Square** (middle): where the Muster Road crosses the Cross Road, the Drafting
 *   Wheel turns on its chequered stage every Sunday, and the Draw board stands opposite with this
 *   week's numbers struck through in red;
 * • **the parade ground and the lines** (west): raked sand ruled for ranks, the bell tents of the
 *   colour party, and three long barracks with a numbered door for every drafted son;
 * • **the tilt yard and the siege park** (east): the striped rail under the grandstand, the stable
 *   at its end, and below them the Engineer's trebuchets and field guns among practice craters;
 * • **the trench line**: dug clean across the slope with three duckboard crossings — and one sap
 *   flooded, where the sappers fish;
 * • **the summit** (north): Prince Banneret's striped command pavilion, the scouts' map tent, and the
 *   House's white marble wall with its black door, the Wheel turning in the arch above it.
 */

export const WAR_W = 2400;
export const WAR_H = 1800;

const ROAD_X = 1200;
const CROSS_Y = 1150;
const NORTH_Y = 420;

/** The trench: a band dug across the slope, three crossings. */
export const TRENCH_Y = 670;
const TRENCH_H = 60;
const CROSSINGS: [number, number][] = [[520, 80], [ROAD_X, 112], [1880, 80]];
/** The flooded sap — the court's fishing water. */
export const SAP: Rect = { x: 1330, y: TRENCH_Y - TRENCH_H / 2, w: 430, h: TRENCH_H };
/** The Drafting stage (base centre), the square it faces, and the Draw board. */
export const STAGE: Pt = { x: 1450, y: 1062 };
export const SQUARE: Pt = { x: 1200, y: 1150 };
export const BOARD: Pt = { x: 960, y: 1060 };
/** Prince Banneret's pavilion (front-step centre) and the scouts' map tent. */
export const PAVILION: Pt = { x: 620, y: 400 };
export const MAP_TENT: Pt = { x: 1830, y: 400 };
/** The House's door in the summit wall. */
export const HOUSE_DOOR: Pt = { x: 1200, y: 150 };
const WALL_BASE = 196;
/** The parade ground, the barracks, the tilt yard and the stable. */
export const PARADE: Rect = { x: 260, y: 810, w: 640, h: 250 };
const BARRACKS_Y = [1320, 1480, 1640];
const RAIL_Y = 990;
const RAIL_X0 = 1640, RAIL_X1 = 2240;
export const STABLE: Pt = { x: 2250, y: 1250 };
/** The Engineer's two trebuchets. */
const ENGINES: Pt[] = [{ x: 1810, y: 1450 }, { x: 2160, y: 1480 }];
/** The mess fire by the lines. */
const MESS: Pt = { x: 880, y: 1560 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The summit: the House's wall and its door.
addPiece(ROAD_X - 690, WALL_BASE, 1000, 220, (g) => summitWall(g, 0, ROAD_X - 180, WALL_BASE, 150));
addPiece(ROAD_X + 690, WALL_BASE, 1000, 220, (g) => summitWall(g, ROAD_X + 180, WAR_W, WALL_BASE, 150));
addPiece(ROAD_X, WALL_BASE + 4, 420, 280, (g, rng) => houseGate(g, ROAD_X, WALL_BASE + 4, rng));
solids.push({ kind: 'rect', x: 0, y: 0, w: WAR_W, h: WALL_BASE - 14 });

// Prince Banneret's pavilion, two colour-party tents and the drum line before it.
addPiece(PAVILION.x, PAVILION.y, 340, 260, (g) => pavilion(g, PAVILION.x, PAVILION.y, 300, 92),
  { kind: 'rect', x: PAVILION.x - 156, y: PAVILION.y - 34, w: 312, h: 34 });
for (const [x, y, k] of [[300, 330, 'heart'], [930, 330, 'spade'], [380, 560, 'club'], [880, 560, 'diamond']] as [number, number, Suit][]) {
  addPiece(x, y, 120, 90, (g, rng) => bellTent(g, x, y, 1.1, k, rng), { kind: 'circle', x, y: y - 10, r: 30 });
}

// The scouts' map tent and their lantern posts.
addPiece(MAP_TENT.x, MAP_TENT.y, 200, 150, (g) => mapTable(g, MAP_TENT.x, MAP_TENT.y), { kind: 'rect', x: MAP_TENT.x - 74, y: MAP_TENT.y - 32, w: 148, h: 30 });
const LANTERN_POSTS: Pt[] = [{ x: 1560, y: 330 }, { x: 2080, y: 330 }, { x: 1600, y: 560 }, { x: 2060, y: 560 }];
for (const p of LANTERN_POSTS) {
  addPiece(p.x, p.y, 30, 70, (g) => { g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 2, p.y - 44, 4, 44); lantern(g, p.x, p.y - 44, 0.8); }, { kind: 'circle', x: p.x, y: p.y - 3, r: 6 });
}

// The trench line's parapet: sandbag walls either side of each crossing.
for (const [cx, cw] of CROSSINGS) {
  for (const k of [-1, 1]) {
    const x = cx + k * (cw / 2 + 40);
    addPiece(x, TRENCH_Y - TRENCH_H / 2 - 8, 90, 40, (g) => sandbags(g, x, TRENCH_Y - TRENCH_H / 2 - 8, 70, 3));
  }
}

// The Drafting Square: the stage and its Wheel, the Draw board, banners round the square.
addPiece(STAGE.x, STAGE.y, 300, 220, (g) => draftStage(g, STAGE.x, STAGE.y), { kind: 'rect', x: STAGE.x - 132, y: STAGE.y - 48, w: 264, h: 48 });
addPiece(BOARD.x, BOARD.y, 160, 200, (g) => numbersBoard(g, BOARD.x, BOARD.y, 0x4471), { kind: 'rect', x: BOARD.x - 64, y: BOARD.y - 12, w: 128, h: 12 });
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  const x = SQUARE.x + Math.cos(a) * 250, y = SQUARE.y + Math.sin(a) * 180;
  if (Math.abs(x - STAGE.x) < 170 && y < STAGE.y + 20) continue;
  if (Math.abs(x - BOARD.x) < 100 && y < BOARD.y + 20) continue;
  addPiece(x, y, 60, 140, (g) => warBanner(g, x, y, 110, i % 2 ? INK : RED, (['heart', 'spade', 'diamond', 'club'] as Suit[])[i % 4], i * 0.8), { kind: 'circle', x, y: y - 3, r: 6 });
}

// Banners down the Muster Road.
for (let y = 300; y < 1700; y += 260) {
  if (Math.abs(y - CROSS_Y) < 160 || Math.abs(y - TRENCH_Y) < 90) continue;
  for (const k of [-1, 1]) {
    const x = ROAD_X + k * 80;
    addPiece(x, y, 60, 140, (g) => warBanner(g, x, y, 100, k < 0 ? RED : INK, 'lot', y * 0.01), { kind: 'circle', x, y: y - 3, r: 6 });
  }
}

// The parade ground's edge: a pair of saluting drums and a row of pikes in a rack.
for (const x of [PARADE.x + 40, PARADE.x + PARADE.w - 40]) {
  addPiece(x, PARADE.y - 14, 40, 120, (g) => {
    for (let i = 0; i < 5; i++) {
      g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - 16 + i * 8, PARADE.y - 14, x - 15 + i * 8, PARADE.y - 110);
      g.fillStyle(0x80848e, 1); g.fillTriangle(x - 18 + i * 8, PARADE.y - 110, x - 12 + i * 8, PARADE.y - 110, x - 15 + i * 8, PARADE.y - 122);
    }
    g.fillStyle(TIMBER, 1); g.fillRect(x - 22, PARADE.y - 60, 44, 5);
  }, { kind: 'rect', x: x - 22, y: PARADE.y - 22, w: 44, h: 10 });
}

// The barracks lines.
BARRACKS_Y.forEach((y, i) => {
  addPiece(500, y, 420, 140, (g, rng) => barracks(g, 500, y, 360, 54, 117 + i * 300, rng), { kind: 'rect', x: 316, y: y - 34, w: 372, h: 34 });
});
addPiece(MESS.x, MESS.y, 70, 70, (g, rng) => cookfire(g, MESS.x, MESS.y, rng), { kind: 'circle', x: MESS.x, y: MESS.y - 2, r: 24 });
for (const [x, y] of [[810, 1610], [950, 1520]] as [number, number][]) addPiece(x, y, 40, 50, (g) => barrel(g, x, y, 1, TIMBER), { kind: 'circle', x, y: y - 4, r: 12 });
addPiece(960, 1610, 40, 40, (g) => crate(g, 960, 1610, 1, TIMBER), { kind: 'circle', x: 960, y: 1604, r: 13 });

// The tilt yard: grandstand, rail, the stable at the end, a quintain to practise on.
addPiece(1940, 880, 460, 160, (g, rng) => grandstand(g, 1940, 880, 420, rng), { kind: 'rect', x: 1728, y: 846, w: 424, h: 34 });
addPiece((RAIL_X0 + RAIL_X1) / 2, RAIL_Y, RAIL_X1 - RAIL_X0 + 20, 40, (g) => tiltRail(g, RAIL_X0, RAIL_X1, RAIL_Y), { kind: 'rect', x: RAIL_X0, y: RAIL_Y - 8, w: RAIL_X1 - RAIL_X0, h: 10 });
addPiece(STABLE.x, STABLE.y, 230, 120, (g) => stable(g, STABLE.x, STABLE.y, 200), { kind: 'rect', x: STABLE.x - 104, y: STABLE.y - 30, w: 208, h: 30 });
addPiece(1600, 1080, 70, 80, (g) => quintain(g, 1600, 1080, 0.5), { kind: 'circle', x: 1600, y: 1077, r: 6 });

// The siege park: the two trebuchets, field guns, powder.
for (const [i, e] of ENGINES.entries()) {
  addPiece(e.x, e.y, 200, 200, (g) => trebuchet(g, e.x, e.y, 1.1, -0.9 + i * 0.4, i ? 5 : 3, -1, i === 0), { kind: 'rect', x: e.x - 60, y: e.y - 14, w: 120, h: 14 });
}
for (const [x, y, f] of [[1700, 1660, 1], [2100, 1680, -1], [2300, 1560, -1]] as [number, number, number][]) {
  addPiece(x, y, 120, 50, (g) => fieldGun(g, x, y, 1, f), { kind: 'circle', x, y: y - 8, r: 18 });
}
for (const [x, y] of [[2020, 1350], [2050, 1366], [1660, 1360]] as [number, number][]) addPiece(x, y, 40, 50, (g) => barrel(g, x, y, 1, 0x5a3a24, 0x2a2420), { kind: 'circle', x, y: y - 4, r: 12 });

// The Muster Gate: the palisade along the foot of the slope, the waystone, Brass's stall.
for (const [x0, x1] of [[0, ROAD_X - 74], [ROAD_X + 74, WAR_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, WAR_H, x1 - x0, 80, (g, rng) => palisade(g, x0, x1, WAR_H, 52, rng), { kind: 'rect', x: x0, y: WAR_H - 26, w: x1 - x0, h: 26 });
}
for (const k of [-1, 1]) {
  const x = ROAD_X + k * 92;
  addPiece(x, WAR_H - 30, 40, 140, (g) => warBanner(g, x, WAR_H - 30, 120, k < 0 ? RED : INK, k < 0 ? 'heart' : 'spade', k), { kind: 'circle', x, y: WAR_H - 33, r: 7 });
}
addPiece(1060, 1640, 60, 90, (g) => warWaystone(g, 1060, 1640), { kind: 'circle', x: 1060, y: 1634, r: 17 });
addPiece(1420, 1600, 220, 160, (g, rng) => quartermaster(g, 1420, 1600, rng), { kind: 'rect', x: 1336, y: 1566, w: 168, h: 34 });

// The trench itself is solid but for its crossings (the flooded sap included).
{
  let x = 40;
  for (const [cx, cw] of CROSSINGS) {
    solids.push({ kind: 'rect', x, y: TRENCH_Y - TRENCH_H / 2, w: cx - cw / 2 - x, h: TRENCH_H });
    x = cx + cw / 2;
  }
  solids.push({ kind: 'rect', x, y: TRENCH_Y - TRENCH_H / 2, w: WAR_W - 40 - x, h: TRENCH_H });
}
// Side walls of the slope: earth banks.
solids.push({ kind: 'rect', x: 0, y: 0, w: 30, h: WAR_H }, { kind: 'rect', x: WAR_W - 30, y: 0, w: 30, h: WAR_H });

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 200): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = WAR_W, H = WAR_H;
    mudGround(g, 0, 0, W, H, rng);
    // What is left of the baize terraces: card-table green along the edges, trampled ragged.
    for (const x0 of [0, W - 150]) {
      g.fillStyle(BAIZE_DARK, 1); g.fillRect(x0, WALL_BASE, 150, H - WALL_BASE);
      g.fillStyle(BAIZE, 1); g.fillRect(x0 + 6, WALL_BASE, 138, H - WALL_BASE);
      for (let y = WALL_BASE; y < H; y += 60) { g.fillStyle(BAIZE_LIT, 0.35); g.fillRect(x0 + 6, y, 138, 30); }
      for (let i = 0; i < 60; i++) {
        const y = WALL_BASE + rng() * (H - WALL_BASE);
        g.fillStyle(MUD_DARK, 0.8); g.fillEllipse(x0 === 0 ? 150 + rng() * 6 : W - 150 - rng() * 6, y, 22 + rng() * 30, 12);
        g.fillStyle(MUD_LIT, 0.4); g.fillEllipse(x0 + 20 + rng() * 110, y, 8, 3);
      }
      // A gilt border line down the terrace, like the edge of a gaming table.
      g.lineStyle(3, GILT, 0.4); g.lineBetween(x0 === 0 ? 140 : W - 140, WALL_BASE, x0 === 0 ? 140 : W - 140, H);
    }
    // The summit forecourt under the House's wall: marble flags.
    for (let y = WALL_BASE; y < WALL_BASE + 120; y += 30) for (let x = ROAD_X - 330; x < ROAD_X + 330; x += 30) {
      const k = ((x - ROAD_X) / 30 + (y - WALL_BASE) / 30) % 2 === 0;
      g.fillStyle(k ? 0xe8e2d6 : 0xb4ac9c, 0.9); g.fillRect(x, y, 30, 30);
    }

    // The roads, paved in red and black.
    chequerRoad(g, ROAD_X, H, ROAD_X, WALL_BASE + 110, 96);
    chequerRoad(g, 150, CROSS_Y, W - 150, CROSS_Y, 78);
    chequerRoad(g, 300, NORTH_Y + 50, 2150, NORTH_Y + 50, 66);
    chequerRoad(g, MAP_TENT.x, NORTH_Y + 50, 1880, TRENCH_Y - 40, 56);
    chequerRoad(g, 520, NORTH_Y + 50, 520, TRENCH_Y - 40, 56);
    chequerRoad(g, 520, TRENCH_Y + 40, 520, CROSS_Y, 56);
    chequerRoad(g, 1880, TRENCH_Y + 40, 1880, 860, 56);

    // The Drafting Square: a disc of flagstones round the crossing, a ring of brass studs.
    g.fillStyle(STONE_DARK, 1); g.fillEllipse(SQUARE.x, SQUARE.y, 470, 340);
    g.fillStyle(STONE, 1); g.fillEllipse(SQUARE.x, SQUARE.y, 456, 328);
    for (let r = 1; r < 6; r++) { g.lineStyle(1, STONE_DARK, 0.6); g.strokeEllipse(SQUARE.x, SQUARE.y, r * 80, r * 58); }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.lineStyle(1, STONE_DARK, 0.6); g.lineBetween(SQUARE.x + Math.cos(a) * 40, SQUARE.y + Math.sin(a) * 29, SQUARE.x + Math.cos(a) * 228, SQUARE.y + Math.sin(a) * 164);
      g.fillStyle(0xc3923e, 1); g.fillCircle(SQUARE.x + Math.cos(a) * 214, SQUARE.y + Math.sin(a) * 154, 3);
    }
    // The calling circle in the middle: where the drawn stand to hear their number.
    g.fillStyle(RED, 0.5); g.fillEllipse(SQUARE.x, SQUARE.y, 120, 86);
    g.fillStyle(INK, 0.6); g.fillEllipse(SQUARE.x, SQUARE.y, 90, 64);
    g.lineStyle(2, GILT, 0.8); g.strokeEllipse(SQUARE.x, SQUARE.y, 120, 86);

    // The parade ground.
    paradeGround(g, PARADE.x, PARADE.y, PARADE.w, PARADE.h, rng);

    // The tilt yard: raked tan sand, the lanes churned either side of the rail.
    g.fillStyle(SAND_DARK, 1); g.fillRect(1590, 896, 720, 210);
    g.fillStyle(0xc8af80, 1); g.fillRect(1596, 902, 708, 198);
    for (const ly of [RAIL_Y - 52, RAIL_Y + 52]) {
      g.fillStyle(MUD_LIT, 0.55); g.fillRect(1600, ly - 26, 700, 52);
      for (let i = 0; i < 80; i++) { g.fillStyle(MUD_DARK, 0.4); g.fillEllipse(1600 + rng() * 700, ly - 20 + rng() * 40, 6, 4); }
    }

    // The siege park: shell-practice craters among the engines.
    for (const [x, y, r] of [[1700, 1520, 26], [1990, 1590, 34], [2240, 1380, 22], [1880, 1330, 18], [2290, 1690, 28]] as [number, number, number][]) crater(g, x, y, r, 0.3);
    // Duckboards laid over the worst of the mud between the lines.
    for (let y = 1240; y < 1720; y += 12) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(760, y, 34, 10); g.fillStyle(TIMBER, 1); g.fillRect(761, y, 32, 8); }

    // The trench line.
    let x = 40;
    for (const [cx, cw] of CROSSINGS) {
      if (cx - cw / 2 > SAP.x && x < SAP.x + SAP.w) {
        trenchRun(g, x, SAP.x, TRENCH_Y, TRENCH_H, rng);
        trenchRun(g, SAP.x, SAP.x + SAP.w, TRENCH_Y, TRENCH_H, rng, true);
        trenchRun(g, SAP.x + SAP.w, cx - cw / 2, TRENCH_Y, TRENCH_H, rng);
      } else trenchRun(g, x, cx - cw / 2, TRENCH_Y, TRENCH_H, rng);
      x = cx + cw / 2;
    }
    trenchRun(g, x, WAR_W - 40, TRENCH_Y, TRENCH_H, rng);
    for (const [cx, cw] of CROSSINGS) duckboardBridge(g, cx, TRENCH_Y - TRENCH_H / 2, TRENCH_Y + TRENCH_H / 2, cw);

    // The pavilion's carpet walk and the drum line's marks.
    g.fillStyle(0x761420, 0.9); g.fillRect(PAVILION.x - 26, PAVILION.y + 18, 52, NORTH_Y + 20 - PAVILION.y);
    g.fillStyle(GILT, 0.8); g.fillRect(PAVILION.x - 26, PAVILION.y + 18, 2, NORTH_Y + 20 - PAVILION.y); g.fillRect(PAVILION.x + 24, PAVILION.y + 18, 2, NORTH_Y + 20 - PAVILION.y);
  },

  pieces,

  animate(g, t, view) {
    // The flooded sap: rings, a drifting ration tin, a fish rising.
    if (inView(SAP.x + SAP.w / 2, SAP.y, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.4 + i / 4) % 1;
        const cx = SAP.x + 50 + ((i * 113) % (SAP.w - 100)), cy = SAP.y + SAP.h / 2;
        g.lineStyle(1.2, BOG_LIT, 0.5 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 40, 3 + ph * 10);
      }
      const tx = SAP.x + 40 + ((t * 8) % (SAP.w - 80));
      g.fillStyle(0x80848e, 0.9); g.fillRect(tx, SAP.y + SAP.h / 2 - 3, 9, 6);
      g.fillStyle(RED, 0.9); g.fillRect(tx, SAP.y + SAP.h / 2 - 1, 9, 2);
    }
    // The mess fire.
    if (inView(MESS.x, MESS.y, view)) {
      for (let i = 0; i < 5; i++) {
        const fl = Math.sin(t * 9 + i * 1.7) * 3;
        g.fillStyle(i % 2 ? 0xffb040 : 0xff7020, 0.8); g.fillTriangle(MESS.x - 10 + i * 5, MESS.y + 2, MESS.x - 6 + i * 5, MESS.y + 2, MESS.x - 8 + i * 5 + fl * 0.3, MESS.y - 10 - Math.abs(fl));
      }
      glow(g, MESS.x, MESS.y, 40, 0xffa040, 0.05, 3);
    }
    // A horse at exercise along the far lane of the tilt yard.
    if (inView(1940, RAIL_Y, view, 400)) {
      const ph = (t / 9) % 1;
      if (ph < 0.45) {
        const k = ph / 0.45;
        horse(g, RAIL_X0 - 40 + (RAIL_X1 - RAIL_X0 + 80) * k, RAIL_Y - 30, 0.8, 1, t * 14, RED);
      }
    }
  },

  animateOver(g, t, view) {
    // The Wheel in the House's arch, turning for ever.
    if (inView(ROAD_X, WALL_BASE - 150, view, 300)) houseWheel(g, ROAD_X, WALL_BASE - 150, 54, t * 0.35);
    // The Drafting Wheel's drum, turning slowly between Sundays.
    if (inView(STAGE.x, STAGE.y, view, 300)) draftDrum(g, STAGE.x, STAGE.y - 112, 34, t * 0.8, 120);
    // The pavilion's standard, flying.
    if (inView(PAVILION.x, PAVILION.y - 200, view, 300)) {
      warBanner(g, PAVILION.x, PAVILION.y - 92 - 82, 70, BANNERET, 'lot', t * 3);
    }
    // Lamplight on the scouts' posts and the House door.
    for (const p of LANTERN_POSTS) if (inView(p.x, p.y, view)) glow(g, p.x, p.y - 52, 26, LAMP, 0.05 + Math.sin(t * 3 + p.x) * 0.01, 3);
    // Smoke off the mess fire and the barracks pipes.
    for (const [sx, sy, n] of [[MESS.x, MESS.y - 40, 6], [500 + 0.28 * 360 + 3, BARRACKS_Y[0] - 105, 4], [500 + 0.28 * 360 + 3, BARRACKS_Y[1] - 105, 4], [500 + 0.28 * 360 + 3, BARRACKS_Y[2] - 105, 4]] as [number, number, number][]) {
      if (!inView(sx, sy, view)) continue;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.25 + i / n) % 1;
        g.fillStyle(0x9a948a, 0.3 * (1 - ph)); g.fillCircle(sx + Math.sin(t + i) * 6 + ph * 20, sy - ph * 70, 5 + ph * 10);
      }
    }
    // Torn lottery tickets blowing about the Drafting Square after the Draw.
    if (inView(SQUARE.x, SQUARE.y, view, 300)) motes(g, { x: SQUARE.x - 260, y: SQUARE.y - 200, w: 520, h: 380 }, t, 12, lit(0xf0e6cc, 0.2), 6, 14, 2.4, 7);
  },
};

export const WAR_AREA: AreaDef = {
  id: 'war',
  isle: 'fate',
  court: 'war',
  name: 'The War Court',
  subtitle: 'Every Sunday the Wheel turns, and the drawn go to the front',
  w: WAR_W,
  h: WAR_H,
  bg: MUD_DARK,
  accent: WAR_COLOR,
  weather: 'confetti',
  spawn: { x: ROAD_X, y: WAR_H - 90 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'card', label: 'Down the Muster Road to the Card Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1060, y: 1672 } },
    { kind: 'prince', id: 'banneret', at: { x: PAVILION.x, y: PAVILION.y + 46 } },
    { kind: 'water', id: 'war-trench', shape: SAP, fishery: 'war-trench' },
    {
      kind: 'door', at: HOUSE_DOOR, to: 'house', arrive: { x: 900, y: 2440 }, label: 'The House',
      open: { princesOfIsle: 'fate', count: 6 },
      lockedText: 'The black door is barred from within. Six lucky children hold six keys to it. Break all six courts.',
    },
    { kind: 'encounter', id: 'war-conscription' },
    { kind: 'encounter', id: 'war-siege-line' },
    { kind: 'encounter', id: 'war-standard' },
    { kind: 'encounter', id: 'war-tilt-yard' },
    { kind: 'encounter', id: 'war-fog-of-war' },
    {
      kind: 'sign', at: { x: 1290, y: 1680 },
      text: 'THE MUSTER. Every Lot on the isle is drummed each Sunday. The drawn report here by noon. Lateness is desertion.',
    },
    {
      kind: 'sign', at: { x: 860, y: 1110 },
      text: 'THIS WEEK\'S DRAW. Numbers struck in red are called to the colours. A re-draw may be bought at the House.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 740 },
      text: 'THE LINE. Keep your head below the bags. The sap is flooded; the fish in it are the property of no one.',
    },
    {
      kind: 'sign', at: { x: 1060, y: 260 },
      text: 'THE HOUSE. Admission by invitation of His Majesty. The house is only chance in a good suit.',
    },
    { kind: 'chest', id: 'war-chest-sap', at: { x: 2300, y: 610 }, coins: 180 },
    { kind: 'chest', id: 'war-chest-pavilion', at: { x: 420, y: 440 }, orbs: 2, open: { prince: 'banneret' } },
  ],
  npcs: WAR_NPCS,
  crowd: WAR_CROWD,
};
