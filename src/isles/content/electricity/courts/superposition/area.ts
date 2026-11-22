import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, groundFill, lit, mixC, road, shadow, stroke, type G } from '../../../../art/IsleArt';
import {
  arcLamp, arcLampGlobe, bellPost, bothHouse, boxStack, cable, cableAt, coilDoor, coilTerminals, coinFountain, crackle,
  crankDynamo, cragRun, eigenKiosk, fencePosts, fenceSheet, fringes, gridCoil, houseGhost, observatory, observatoryEye,
  puddle, pylon, pylonTips, readingBoard, slitPier, slitWall, spinningCoin, stencilEye, twinSquare, twoStateHouse,
  waystoneStone, wellRim, wellSurface, type HouseState,
} from './art';
import {
  ARC, BASALT, BASALT_DARK, BASALT_LIT, BOLT, BOTH, BOTH_LIT, BRICK, COPPER, COPPER_DARK, DEAL_DARK, GROUT, IRON,
  IRON_LIT, LIMEWASH, ROOF, SLATE, SLATE_DARK, SLATE_LIT, STATE_A, STATE_A_DARK, STATE_A_LIT, STATE_B, STATE_B_DARK,
  STATE_B_LIT, SUPERPOSITION_COLOR, TARPAPER,
} from './palette';
import { SUPERPOSITION_CROWD, SUPERPOSITION_NPCS } from './npcs';
import { inView } from './util';

/**
 * The Superposition Court — the town that is two towns at once, highest on Voltreach, at the foot
 * of the Crown Coil.
 *
 * Read it from the Dynamo road up:
 * • **Lower Either Row** (south): the road comes in past the waystone and Meterman Probst's
 *   reading board, between two rows of crank-houses whose meters read two numbers each;
 * • **the Double-Slit Gate**: a basalt wall right across the town with two slits and the Source on
 *   the pier between them — you pass by either slit, and the fringes it throws stripe the yard
 *   beyond (Experimenter Young keeps it);
 * • **Either Square** at the heart, round the fountain whose spout is a coin forever spinning, with
 *   Ottilie Eigen's kiosk on its east side;
 * • **the Box Yard** (west): stacks of sealed boxes, DO NOT OBSERVE, where Keeper Felis holds
 *   whatever has not decided yet — and, south of it, the Quantum Well;
 * • **the Watched Street** (north-west): a row of houses kept in one state by the Observatory's eye,
 *   and a lane off it that is only there while you look at it;
 * • **the Twin Squares** (east): two squares laid stone for stone the same, the Bells between them;
 * • **Wick's yard** of flicker-fences (north-east) under **the House of Both**, the Prince's hall;
 * • **the Crown Coil** (north): the road climbs to the copper door in the crag where the Empress's
 *   tower comes down to the town. Every cable in the court runs to it.
 */

export const SUP_W = 2400;
export const SUP_H = 1800;

const ROAD_X = 1200;
/** The Double-Slit Gate: base line, the two runs of wall, the pier and the slits. */
export const GATE_Y = 1480;
const WALL_L: [number, number] = [520, 1060];
const WALL_R: [number, number] = [1340, 1880];
const PIER_X = 1200;
export const SLITS: number[] = [1105, 1295];
/** Either Square and its coin fountain. */
export const SQUARE: Pt = { x: 1200, y: 980 };
const FOUNTAIN: Pt = { x: 1200, y: 1012 };
/** Eigen's kiosk on the square. */
export const KIOSK: Pt = { x: 1450, y: 1210 };
/** The Quantum Well — the court's fishing water. */
export const WELL_RECT: Rect = { x: 300, y: 1170, w: 380, h: 190 };
/** The Observatory of Looks at the east end of the Watched Street. */
export const OBSERVATORY: Pt = { x: 1060, y: 420 };
/** The census post at the west end of the Watched Street. */
export const CENSUS: Pt = { x: 200, y: 520 };
/** Meterman Probst's reading board on Lower Either Row. */
export const BOARD: Pt = { x: 960, y: 1560 };
/** Hesper Ket's house (door) on Lower Either Row, and her meter. */
export const HESPER_HOUSE: Pt = { x: 620, y: 1640 };
export const HESPER_METER: Pt = { x: 640, y: 1680 };
/** The Twin Squares. */
export const TWINS: Pt[] = [{ x: 1640, y: 1230 }, { x: 2120, y: 1230 }];
const TWIN_R = 110;
/** The House of Both: the middle of its front step. */
export const BOTH_HALL: Pt = { x: 1800, y: 440 };
/** The Crown Coil's door (the dungeon door POI sits on the threshold). */
export const COIL_DOOR: Pt = { x: 1200, y: 150 };
/** Wick's flicker-fences. */
const FENCES: { x: number; y: number; w: number; seed: number }[] = [
  { x: 2030, y: 650, w: 110, seed: 0.1 }, { x: 2230, y: 650, w: 110, seed: 0.45 },
  { x: 2130, y: 830, w: 110, seed: 0.7 }, { x: 2320, y: 830, w: 80, seed: 0.25 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── House states ─────────────────────────────────────────────────────

const A_BRICK_LIT: HouseState = { wall: BRICK, roof: ROOF, style: 'gable', lit: true, floors: 2 };
const A_BRICK_OFF: HouseState = { wall: BRICK, roof: ROOF, style: 'gable', lit: false, floors: 2 };
const A_LIME: HouseState = { wall: LIMEWASH, roof: TARPAPER, style: 'slant', lit: true, floors: 2 };
const A_LIME_OFF: HouseState = { wall: LIMEWASH, roof: TARPAPER, style: 'slant', lit: false, floors: 1 };
const A_TALL: HouseState = { wall: dim(BRICK, 0.1), roof: ROOF, style: 'tower', lit: true, floors: 3 };
const B_FLAT: HouseState = { wall: LIMEWASH, roof: TARPAPER, style: 'flat', lit: false, floors: 1 };
const B_RUIN: HouseState = { wall: dim(BRICK, 0.2), roof: ROOF, style: 'ruin', lit: false, floors: 2 };
const B_TALL: HouseState = { wall: BRICK, roof: ROOF, style: 'tower', lit: true, floors: 3 };
const B_GABLE: HouseState = { wall: LIMEWASH, roof: ROOF, style: 'gable', lit: true, floors: 2 };
const B_SLANT_OFF: HouseState = { wall: BRICK, roof: TARPAPER, style: 'slant', lit: false, floors: 2 };

interface House { x: number; y: number; w: number; a: HouseState; b: HouseState; seed: number }
const HOUSES: House[] = [
  // Lower Either Row, west.
  { x: 260, y: 1640, w: 130, a: A_BRICK_LIT, b: B_RUIN, seed: 1 },
  { x: 440, y: 1640, w: 130, a: A_LIME, b: B_TALL, seed: 2 },
  { x: HESPER_HOUSE.x, y: HESPER_HOUSE.y, w: 130, a: A_BRICK_OFF, b: B_GABLE, seed: 3 },
  { x: 820, y: 1640, w: 120, a: A_LIME_OFF, b: B_SLANT_OFF, seed: 4 },
  // Lower Either Row, east.
  { x: 1580, y: 1640, w: 130, a: A_TALL, b: B_FLAT, seed: 5 },
  { x: 1760, y: 1640, w: 130, a: A_BRICK_LIT, b: B_SLANT_OFF, seed: 6 },
  { x: 1940, y: 1640, w: 130, a: A_LIME_OFF, b: B_GABLE, seed: 7 },
  { x: 2140, y: 1640, w: 140, a: A_BRICK_OFF, b: B_RUIN, seed: 8 },
  // The Watched Street.
  { x: 300, y: 420, w: 140, a: A_BRICK_LIT, b: B_RUIN, seed: 9 },
  { x: 480, y: 420, w: 140, a: A_LIME, b: B_TALL, seed: 10 },
  { x: 660, y: 420, w: 140, a: A_TALL, b: B_FLAT, seed: 11 },
  { x: 860, y: 420, w: 140, a: A_BRICK_LIT, b: B_SLANT_OFF, seed: 12 },
  // Round the square.
  { x: 920, y: 770, w: 120, a: A_LIME_OFF, b: B_TALL, seed: 13 },
  { x: 1560, y: 780, w: 130, a: A_BRICK_LIT, b: B_GABLE, seed: 14 },
  { x: 1740, y: 790, w: 120, a: A_LIME, b: B_RUIN, seed: 15 },
];
for (const h of HOUSES) {
  addPiece(h.x, h.y, h.w + 60, 260, (g) => twoStateHouse(g, h.x, h.y, h.w, h.a, h.b, h.seed),
    { kind: 'rect', x: h.x - h.w / 2 - 2, y: h.y - 34, w: h.w + 4, h: 34 });
}

// ── The Crown Coil door and the northern crag ────────────────────────

addPiece(COIL_DOOR.x, COIL_DOOR.y, 460, 340, (g) => coilDoor(g, COIL_DOOR.x, COIL_DOOR.y));
solids.push(
  { kind: 'rect', x: 990, y: 96, w: 150, h: 54 },
  { kind: 'rect', x: 1260, y: 96, w: 150, h: 54 },
  { kind: 'rect', x: 1140, y: 96, w: 120, h: 34 },
);
for (const [x0, x1, seed] of [[0, 990, 3], [1410, 2400, 9]] as [number, number, number][]) {
  addPiece((x0 + x1) / 2, 112, x1 - x0, 140, (g) => cragRun(g, x0, x1, 112, 96, seed));
  solids.push({ kind: 'rect', x: x0, y: 0, w: x1 - x0, h: 112 });
}

// ── The Double-Slit Gate ─────────────────────────────────────────────

for (const [x0, x1] of [WALL_L, WALL_R]) {
  addPiece((x0 + x1) / 2, GATE_Y, x1 - x0 + 20, 110, (g) => slitWall(g, x0, x1, GATE_Y),
    { kind: 'rect', x: x0, y: GATE_Y - 20, w: x1 - x0, h: 22 });
}
addPiece(PIER_X, GATE_Y, 140, 200, (g) => slitPier(g, PIER_X, GATE_Y, 100), { kind: 'rect', x: PIER_X - 50, y: GATE_Y - 24, w: 100, h: 26 });
// Tower ends of the wall.
for (const x of [WALL_L[0] - 6, WALL_R[1] + 6]) {
  addPiece(x, GATE_Y + 2, 60, 140, (g) => {
    shadow(g, x, GATE_Y + 4, 60, 16);
    g.fillStyle(BASALT_DARK, 1); g.fillRect(x - 22, GATE_Y - 110, 44, 112);
    g.fillStyle(BASALT, 1); g.fillRect(x - 18, GATE_Y - 106, 16, 104);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 25, GATE_Y - 116, 50, 8);
    g.fillStyle(COPPER, 1); g.fillRect(x - 25, GATE_Y - 116, 50, 4);
    g.lineStyle(2, COPPER, 1); g.lineBetween(x, GATE_Y - 116, x, GATE_Y - 146);
    g.fillStyle(lit(COPPER, 0.4), 1); g.fillCircle(x, GATE_Y - 147, 2.5);
    gridCoil(g, x, GATE_Y - 70, 8, COPPER, 0.8);
  }, { kind: 'rect', x: x - 22, y: GATE_Y - 22, w: 44, h: 24 });
}

// ── Either Square ────────────────────────────────────────────────────

addPiece(FOUNTAIN.x, FOUNTAIN.y, 240, 200, (g) => coinFountain(g, FOUNTAIN.x, FOUNTAIN.y), { kind: 'rect', x: FOUNTAIN.x - 106, y: FOUNTAIN.y - 62, w: 212, h: 56 });
addPiece(KIOSK.x, KIOSK.y, 200, 200, (g) => eigenKiosk(g, KIOSK.x, KIOSK.y), { kind: 'rect', x: KIOSK.x - 80, y: KIOSK.y - 30, w: 160, h: 30 });

// ── The Box Yard ─────────────────────────────────────────────────────

const STACKS: { x: number; y: number; rows: number[]; s: number; seed: number }[] = [
  { x: 230, y: 700, rows: [3, 2, 1], s: 34, seed: 3 },
  { x: 420, y: 660, rows: [2, 1], s: 34, seed: 8 },
  { x: 600, y: 690, rows: [1, 1], s: 30, seed: 13 },
  { x: 760, y: 700, rows: [3, 2], s: 34, seed: 21 },
  { x: 220, y: 1050, rows: [2, 2, 1], s: 32, seed: 34 },
  { x: 800, y: 1060, rows: [2, 1], s: 32, seed: 55 },
  // Strays round the town.
  { x: 1470, y: 1600, rows: [2, 1], s: 28, seed: 89 },
  { x: 2300, y: 1500, rows: [3, 2, 1], s: 30, seed: 144 },
  { x: 1000, y: 1200, rows: [2], s: 28, seed: 233 },
  { x: 2290, y: 1060, rows: [2, 1], s: 30, seed: 377 },
  { x: 140, y: 1420, rows: [2, 1], s: 30, seed: 610 },
];
for (const st of STACKS) {
  const w = st.rows[0] * st.s * 1.04;
  addPiece(st.x, st.y, w + 40, st.rows.length * st.s + 60, (g) => boxStack(g, st.x, st.y, st.rows, st.s, st.seed),
    { kind: 'rect', x: st.x - w / 2, y: st.y - 26, w: w + st.s * 0.4, h: 28 });
}
// Tamsin's crate bench.
addPiece(300, 790, 120, 80, (g) => {
  shadow(g, 300, 792, 110, 18);
  g.fillStyle(DEAL_DARK, 1); g.fillRect(250, 760, 100, 8); g.fillRect(254, 768, 6, 22); g.fillRect(340, 768, 6, 22);
  g.fillStyle(0xb89a6a, 1); g.fillRect(250, 756, 100, 6);
  g.fillStyle(IRON, 1); g.fillRect(270, 748, 22, 6); g.lineStyle(2, IRON_LIT, 1); g.lineBetween(300, 754, 316, 742);
  g.fillStyle(0xd8be8c, 1); g.fillRect(320, 746, 26, 8);
  stencilEye(g, 333, 750, 3, 0x1c1a20, 0.8);
}, { kind: 'rect', x: 250, y: 770, w: 100, h: 20 });

// ── The Watched Street ───────────────────────────────────────────────

addPiece(OBSERVATORY.x, OBSERVATORY.y, 120, 320, (g) => observatory(g, OBSERVATORY.x, OBSERVATORY.y), { kind: 'rect', x: OBSERVATORY.x - 34, y: OBSERVATORY.y - 18, w: 68, h: 18 });
addPiece(CENSUS.x, CENSUS.y, 110, 120, (g) => readingBoard(g, CENSUS.x, CENSUS.y), { kind: 'rect', x: CENSUS.x - 44, y: CENSUS.y - 8, w: 88, h: 8 });

// ── Lower Either Row ─────────────────────────────────────────────────

addPiece(BOARD.x, BOARD.y, 110, 120, (g) => readingBoard(g, BOARD.x, BOARD.y), { kind: 'rect', x: BOARD.x - 44, y: BOARD.y - 8, w: 88, h: 8 });
addPiece(1040, 1690, 60, 110, (g) => waystoneStone(g, 1040, 1690), { kind: 'circle', x: 1040, y: 1684, r: 16 });
for (const [x, y] of [[360, 1776], [1860, 1776], [840, 1200]] as [number, number][]) {
  addPiece(x, y, 70, 60, (g) => crankDynamo(g, x, y), { kind: 'rect', x: x - 24, y: y - 12, w: 48, h: 12 });
}

// ── The Twin Squares and Wick's yard ─────────────────────────────────

for (const [i, t] of TWINS.entries()) {
  addPiece(t.x, t.y, 50, 110, (g) => bellPost(g, t.x, t.y, i ? STATE_B : STATE_A), { kind: 'circle', x: t.x, y: t.y - 2, r: 9 });
}
for (const f of FENCES) {
  addPiece(f.x, f.y, f.w + 30, 90, (g) => fencePosts(g, f.x, f.y, f.w));
  solids.push({ kind: 'circle', x: f.x - f.w / 2, y: f.y - 2, r: 7 }, { kind: 'circle', x: f.x + f.w / 2, y: f.y - 2, r: 7 });
}

// ── The House of Both ────────────────────────────────────────────────

addPiece(BOTH_HALL.x, BOTH_HALL.y, 480, 380, (g) => bothHouse(g, BOTH_HALL.x, BOTH_HALL.y), { kind: 'rect', x: BOTH_HALL.x - 224, y: BOTH_HALL.y - 40, w: 448, h: 36 });

// ── Pylons and lamps ─────────────────────────────────────────────────

const PYLONS: Pt[] = [
  { x: 1080, y: 700 }, { x: 1320, y: 700 }, { x: 1080, y: 360 }, { x: 1320, y: 360 },
  { x: 880, y: 1330 }, { x: 1520, y: 1330 }, { x: 150, y: 860 }, { x: 2270, y: 960 },
  { x: 140, y: 1600 }, { x: 2280, y: 1300 }, { x: 1500, y: 560 }, { x: 760, y: 620 },
];
const PYLON_H = 150;
for (const p of PYLONS) addPiece(p.x, p.y, 110, 200, (g) => { pylon(g, p.x, p.y, PYLON_H); }, { kind: 'circle', x: p.x, y: p.y - 4, r: 20 });

/** The cable network: pylon to pylon, and every road pylon on up to the Coil. */
const CABLES: { a: Pt; b: Pt; sag: number; seed: number }[] = [];
{
  const tip = (i: number, k: number) => pylonTips(PYLONS[i].x, PYLONS[i].y, PYLON_H)[k];
  const link = (i: number, j: number, k = 0) => { CABLES.push({ a: tip(i, k), b: tip(j, k + 1 > 3 ? 0 : k + 1), sag: 30, seed: CABLES.length }); CABLES.push({ a: tip(i, 2), b: tip(j, 3), sag: 22, seed: CABLES.length }); };
  link(4, 0); link(5, 1); link(0, 2); link(1, 3); link(6, 11); link(11, 2); link(10, 3); link(7, 10); link(9, 7); link(8, 4); link(9, 5);
  const coil = { x: COIL_DOOR.x, y: COIL_DOOR.y - 200 };
  for (const i of [2, 3]) for (const k of [1, 3]) CABLES.push({ a: tip(i, k), b: coil, sag: 18, seed: CABLES.length });
  // Service drops from the nearest pylon to each house's lightning rod.
  for (const h of HOUSES) {
    let best = 0, bd = Infinity;
    PYLONS.forEach((p, i) => { const d = Math.hypot(p.x - h.x, p.y - h.y); if (d < bd) { bd = d; best = i; } });
    if (bd > 520) continue;
    const top = { x: h.x - h.w / 2 + h.w * 0.72 + 5, y: h.y - (22 + h.a.floors * 44) - h.w * 0.3 - 20 };
    CABLES.push({ a: tip(best, 0), b: top, sag: 24, seed: CABLES.length });
  }
}

const LAMPS: Pt[] = [
  { x: 1120, y: 1620 }, { x: 1290, y: 1620 }, { x: 1060, y: 1400 }, { x: 1350, y: 1400 }, { x: 980, y: 1080 }, { x: 1420, y: 900 },
  { x: 1130, y: 560 }, { x: 1270, y: 560 }, { x: 1130, y: 260 }, { x: 1280, y: 260 }, { x: 400, y: 540 }, { x: 760, y: 1000 },
  { x: 1880, y: 1120 }, { x: 1700, y: 540 }, { x: 1940, y: 540 }, { x: 500, y: 1720 }, { x: 1690, y: 1720 }, { x: 560, y: 1400 },
];
for (const l of LAMPS) addPiece(l.x, l.y, 40, 90, (g) => arcLamp(g, l.x, l.y, 70), { kind: 'circle', x: l.x, y: l.y - 2, r: 6 });

// ── The painter ──────────────────────────────────────────────────────

/** The lane off the Watched Street that is only there while it is watched (drawn in `animate`). */
const LANE: Pt[] = [{ x: 560, y: 520 }, { x: 520, y: 570 }, { x: 470, y: 600 }, { x: 440, y: 640 }];
const PUDDLES: { x: number; y: number; w: number }[] = [
  { x: 1150, y: 1740, w: 70 }, { x: 1250, y: 1300, w: 90 }, { x: 1180, y: 820, w: 60 }, { x: 600, y: 480, w: 80 },
  { x: 900, y: 500, w: 60 }, { x: 1700, y: 1050, w: 70 }, { x: 1900, y: 600, w: 60 }, { x: 420, y: 960, w: 70 },
  { x: 1960, y: 1420, w: 80 }, { x: 760, y: 1560, w: 60 }, { x: 1530, y: 1560, w: 70 }, { x: 2200, y: 1150, w: 60 },
];

/** How far house `h` has swung into its second state at time t (0 = state A). The Observatory pins what it sees. */
function swing(h: House, t: number): number {
  const eye = observatoryEye(OBSERVATORY.x, OBSERVATORY.y);
  const ga = gazeAngle(t);
  const ha = Math.atan2(h.y - 120 - eye.y, h.x - eye.x);
  if (Math.abs(Math.atan2(Math.sin(ha - ga), Math.cos(ha - ga))) < 0.16 && Math.hypot(h.x - eye.x, h.y - eye.y) < 900) return 0;
  const s = Math.sin(t * 0.45 + h.seed * 1.9) * 1.8 - 0.7;
  const glitch = Math.sin(t * 13 + h.seed * 7) > 0.97 ? 0.6 : 0;
  return Math.max(0, Math.min(1, s + glitch));
}

/** The Observatory's look, sweeping slowly back and forth over the Watched Street and the square. */
function gazeAngle(t: number): number {
  return Math.PI * 0.62 + Math.sin(t * 0.25) * 0.75;
}

const painter: AreaPainter = {
  ground(g, rng) {
    // Black basalt under everything, rain-dark, with a sheen.
    groundFill(g, { x: 0, y: 0, w: SUP_W, h: SUP_H }, BASALT, BASALT_LIT, BASALT_DARK, rng, 1.2);
    // Cliff edges west and east: the crag drops away into the storm.
    for (const x0 of [0, SUP_W - 60]) {
      g.fillStyle(BASALT_DARK, 1); g.fillRect(x0, 0, 60, SUP_H);
      for (let y = 0; y < SUP_H; y += 34) {
        const k = rng();
        g.fillStyle(k < 0.5 ? BASALT : BASALT_LIT, 1);
        g.fillTriangle(x0 + (x0 ? 0 : 60), y, x0 + (x0 ? 0 : 60), y + 34, x0 + (x0 ? 20 + k * 30 : 40 - k * 30), y + 17);
      }
    }
    // Slate roads.
    const SL = SLATE, ED = SLATE_DARK, ST = SLATE_LIT;
    road(g, [{ x: ROAD_X, y: SUP_H }, { x: ROAD_X, y: 1580 }, { x: SLITS[0], y: 1520 }, { x: SLITS[0], y: 1440 }, { x: ROAD_X, y: 1360 }], 84, SL, ED, ST, rng);
    road(g, [{ x: ROAD_X, y: 1580 }, { x: SLITS[1], y: 1520 }, { x: SLITS[1], y: 1440 }, { x: ROAD_X, y: 1360 }], 84, SL, ED, ST, rng);
    road(g, [{ x: ROAD_X, y: 1360 }, { x: ROAD_X, y: 1100 }], 96, SL, ED, ST, rng);
    road(g, [{ x: ROAD_X, y: 860 }, { x: ROAD_X, y: 300 }, { x: ROAD_X, y: 160 }], 96, SL, ED, ST, rng);
    road(g, [{ x: 120, y: 1710 }, { x: 2280, y: 1710 }], 70, SL, ED, ST, rng);
    road(g, [{ x: 140, y: 485 }, { x: 1150, y: 485 }], 76, SL, ED, ST, rng);
    road(g, [{ x: 990, y: 980 }, { x: 860, y: 900 }, { x: 520, y: 900 }], 70, SL, ED, ST, rng);
    road(g, [{ x: 1410, y: 1000 }, { x: 1640, y: 1180 }, { x: 2120, y: 1230 }], 70, SL, ED, ST, rng);
    road(g, [{ x: 1330, y: 880 }, { x: 1600, y: 620 }, { x: 1800, y: 500 }, { x: 2120, y: 740 }], 66, SL, ED, ST, rng);
    road(g, [{ x: 620, y: 900 }, { x: 680, y: 1150 }, { x: 760, y: 1290 }, { x: 900, y: 1400 }, { x: 1080, y: 1430 }], 56, SL, ED, ST, rng);
    // A copper cable trench down the middle of the main road, to the Coil.
    stroke(g, [{ x: ROAD_X + 30, y: SUP_H }, { x: ROAD_X + 30, y: 1600 }], 4, COPPER_DARK, 1);
    stroke(g, [{ x: ROAD_X + 30, y: 1360 }, { x: ROAD_X + 30, y: 1100 }], 4, COPPER_DARK, 1);
    stroke(g, [{ x: ROAD_X + 30, y: 860 }, { x: ROAD_X + 30, y: 160 }], 4, COPPER_DARK, 1);
    for (let y = 180; y < SUP_H; y += 60) { if (y > 1100 && y < 1360) continue; if (y > 860 && y < 1100) continue; g.fillStyle(COPPER, 0.6); g.fillRect(ROAD_X + 27, y, 6, 3); }
    // The fringe yard: the Source's bands thrown through the slits, north of the gate.
    fringes(g, PIER_X, GATE_Y - 30, 190, 420, 9);
    // Either Square: a great oval of slates laid in rings, half lit by each state.
    g.fillStyle(GROUT, 1); g.fillEllipse(SQUARE.x, SQUARE.y, 470, 300);
    g.fillStyle(SLATE, 1); g.fillEllipse(SQUARE.x, SQUARE.y, 456, 288);
    for (let r = 1; r < 6; r++) { g.lineStyle(1.5, GROUT, 0.8); g.strokeEllipse(SQUARE.x, SQUARE.y, 456 * r / 6, 288 * r / 6); }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.lineStyle(1.2, GROUT, 0.7); g.lineBetween(SQUARE.x + Math.cos(a) * 60, SQUARE.y + Math.sin(a) * 38, SQUARE.x + Math.cos(a) * 228, SQUARE.y + Math.sin(a) * 144);
    }
    g.fillStyle(STATE_A_DARK, 0.18); g.slice(SQUARE.x, SQUARE.y, 228, Math.PI / 2, Math.PI * 1.5, false); g.fillPath();
    g.fillStyle(STATE_B_DARK, 0.18); g.slice(SQUARE.x, SQUARE.y, 228, -Math.PI / 2, Math.PI / 2, false); g.fillPath();
    g.lineStyle(3, STATE_A, 0.35); g.strokeEllipse(SQUARE.x - 6, SQUARE.y, 420, 262);
    g.lineStyle(3, STATE_B, 0.35); g.strokeEllipse(SQUARE.x + 6, SQUARE.y, 420, 262);
    // The Box Yard: cinders, drag marks, chalked bay numbers.
    groundFill(g, { x: 160, y: 620, w: 700, h: 470 }, 0x24222a, 0x2e2c34, 0x18171c, rng, 1.4);
    for (let i = 0; i < 22; i++) {
      const x = 200 + rng() * 620, y = 660 + rng() * 400;
      g.lineStyle(2, 0x18171c, 0.6); g.lineBetween(x, y, x + 30 + rng() * 40, y + (rng() - 0.5) * 8);
    }
    for (let i = 0; i < 6; i++) { g.lineStyle(1.5, 0xe8e8f0, 0.25); g.strokeRect(180 + i * 110, 1000, 90, 60); }
    // The Quantum Well.
    wellRim(g, WELL_RECT);
    // The Twin Squares, laid the same stone for stone.
    TWINS.forEach((t, i) => twinSquare(g, t.x, t.y, TWIN_R, i ? STATE_B : STATE_A));
    // Wick's yard: riveted iron deck.
    g.fillStyle(0x1e1e26, 1); g.fillRect(1960, 590, 420, 300);
    for (let y = 590; y < 890; y += 50) for (let x = 1960; x < 2380; x += 70) {
      g.fillStyle(((x + y) / 10) % 2 ? IRON : 0x26262e, 1); g.fillRect(x + 2, y + 2, 66, 46);
      g.fillStyle(IRON_LIT, 0.8); for (const [rx, ry] of [[6, 6], [62, 6], [6, 44], [62, 44]]) g.fillCircle(x + rx, y + ry, 1.4);
    }
    // The House of Both's forecourt: split chequer, magenta-and-black left, copper-and-slate right.
    for (let y = 460; y < 580; y += 20) for (let x = 1600; x < 2000; x += 20) {
      const k = ((x - 1600) / 20 + (y - 460) / 20) % 2;
      const left = x < BOTH_HALL.x;
      g.fillStyle(left ? (k ? 0x1a1018 : STATE_A_DARK) : (k ? SLATE_DARK : COPPER_DARK), 0.95); g.fillRect(x, y, 20, 20);
    }
    g.lineStyle(2, BOTH, 0.7); g.lineBetween(BOTH_HALL.x, 460, BOTH_HALL.x, 580);
    // The Coil forecourt: copper plates worn by the earthed going up.
    for (let y = 150; y < 300; y += 26) for (let x = 1100; x < 1300; x += 40) {
      g.fillStyle(((x + y) / 2) % 2 ? COPPER_DARK : dim(COPPER_DARK, 0.3), 0.8); g.fillRect(x + 1, y + 1, 38, 24);
    }
    // Puddles.
    for (const p of PUDDLES) puddle(g, p.x, p.y, p.w, mixC(STATE_A, STATE_B, (p.x / SUP_W)));
    // Scorch stars where the storm has struck the slates.
    for (let i = 0; i < 18; i++) {
      const x = 100 + rng() * (SUP_W - 200), y = 200 + rng() * (SUP_H - 300);
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + rng(); g.lineStyle(1.5, 0x0a0a0e, 0.5); g.lineBetween(x, y, x + Math.cos(a) * (8 + rng() * 10), y + Math.sin(a) * (5 + rng() * 6)); }
    }
  },

  pieces,

  animate(g, t, view) {
    // The fringe yard pulses as the Source breathes.
    if (inView(PIER_X, GATE_Y - 200, view, 400)) {
      const k = 0.5 + 0.5 * Math.sin(t * 1.4);
      for (let i = -4; i <= 4; i += 2) {
        const a = -Math.PI / 2 + i * 0.075;
        const r0 = 60 + ((t * 80 + Math.abs(i) * 30) % 360);
        g.fillStyle(BOTH_LIT, 0.08 * k); g.fillCircle(PIER_X + Math.cos(a) * r0, GATE_Y - 30 + Math.sin(a) * r0, 6);
      }
    }
    // The well.
    if (inView(WELL_RECT.x + WELL_RECT.w / 2, WELL_RECT.y + WELL_RECT.h / 2, view, 300)) wellSurface(g, WELL_RECT, t);
    // The lane that is only there while watched: solid at the middle of your view, gone at its edge.
    {
      const vx = view.x + view.w / 2, vy = view.y + view.h / 2;
      const lx = LANE[1].x, ly = LANE[1].y;
      const d = Math.hypot(vx - lx, vy - ly);
      const a = Math.max(0, 1 - d / 520);
      if (a > 0.02) {
        stroke(g, LANE, 46, SLATE_DARK, 0.9 * a);
        stroke(g, LANE, 38, SLATE, 0.9 * a);
        for (let i = 0; i < LANE.length - 1; i++) {
          const p = LANE[i], q = LANE[i + 1];
          for (let s = 0; s < 4; s++) { const f = s / 4; g.lineStyle(1, GROUT, 0.7 * a); g.lineBetween(p.x + (q.x - p.x) * f - 16, p.y + (q.y - p.y) * f, p.x + (q.x - p.x) * f + 16, p.y + (q.y - p.y) * f); }
        }
        g.lineStyle(1, BOTH_LIT, 0.3 * a + 0.1 * Math.sin(t * 5)); g.strokeCircle(LANE[3].x, LANE[3].y, 22);
      }
    }
    // The Twin Squares' inlays breathe together, exactly in step.
    for (const [i, tw] of TWINS.entries()) {
      if (!inView(tw.x, tw.y, view, 200)) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 2);
      g.lineStyle(2, i ? STATE_B_LIT : STATE_A_LIT, 0.15 + 0.25 * k); g.strokeEllipse(tw.x, tw.y, TWIN_R * 1.6, TWIN_R * 1.04);
    }
    // The Coil forecourt glows when the storm strikes the Coil.
    if (inView(COIL_DOOR.x, COIL_DOOR.y + 60, view, 300)) {
      const strike = Math.sin(t * 0.9) > 0.92;
      if (strike) { g.fillStyle(BOLT, 0.1); g.fillEllipse(COIL_DOOR.x, COIL_DOOR.y + 70, 300, 120); }
    }
    // Lamp pools, flickering.
    for (const [i, l] of LAMPS.entries()) {
      if (!inView(l.x, l.y, view, 120)) continue;
      const f = Math.sin(t * 23 + i * 7) > 0.93 ? 0.3 : 1;
      g.fillStyle(ARC, 0.05 * f); g.fillEllipse(l.x + 12, l.y + 4, 120, 40);
    }
  },

  animateOver(g, t, view) {
    // Houses swinging between their states.
    for (const h of HOUSES) {
      if (!inView(h.x, h.y - 100, view, 200)) continue;
      houseGhost(g, h.x, h.y, h.w, h.a, h.b, swing(h, t), t);
    }
    // The Observatory's eye: a pale beam of looking, sweeping.
    if (inView(OBSERVATORY.x, OBSERVATORY.y, view, 900)) {
      const eye = observatoryEye(OBSERVATORY.x, OBSERVATORY.y);
      const a = gazeAngle(t);
      g.fillStyle(BOTH_LIT, 0.035);
      g.slice(eye.x, eye.y, 900, a - 0.16, a + 0.16, false); g.fillPath();
      g.lineStyle(1, BOTH_LIT, 0.12); g.lineBetween(eye.x, eye.y, eye.x + Math.cos(a) * 900, eye.y + Math.sin(a) * 900);
      g.fillStyle(BOTH, 0.9); g.fillCircle(eye.x + Math.cos(a) * 4, eye.y + Math.sin(a) * 3, 6);
      g.fillStyle(0x050508, 1); g.fillCircle(eye.x + Math.cos(a) * 5, eye.y + Math.sin(a) * 4, 3);
    }
    // The coin on the fountain.
    if (inView(FOUNTAIN.x, FOUNTAIN.y - 100, view, 200)) spinningCoin(g, FOUNTAIN.x, FOUNTAIN.y, t);
    // Wick's fences, thinning and thickening.
    for (const f of FENCES) {
      if (!inView(f.x, f.y, view, 150)) continue;
      const ph = (t * 0.16 + f.seed) % 1;
      const k = ph < 0.55 ? 1 : ph < 0.72 ? (Math.sin(t * 40) > 0 ? 0.8 : 0.2) : ph < 0.95 ? 0.05 : 0.6;
      fenceSheet(g, f.x, f.y, f.w, k, t);
    }
    // The Grid's cables overhead, with current running down them.
    for (const c of CABLES) {
      const mx = (c.a.x + c.b.x) / 2, my = (c.a.y + c.b.y) / 2;
      if (!inView(mx, my, view, Math.abs(c.a.x - c.b.x) / 2 + 200)) continue;
      cable(g, c.a, c.b, c.sag, COPPER_DARK, 1.8);
      const ph = (t * 0.6 + c.seed * 0.37) % 1;
      const p = cableAt(c.a, c.b, c.sag, ph);
      g.fillStyle(ARC, 0.8); g.fillCircle(p.x, p.y, 2);
      g.fillStyle(ARC, 0.2); g.fillCircle(p.x, p.y, 5);
      if (Math.sin(t * 11 + c.seed * 3.7) > 0.985) crackle(g, c.a, c.b, t, c.seed, BOLT, 1.2, 0.7, 9);
    }
    // The Coil door's terminals arcing to each other, and the storm striking the Coil.
    if (inView(COIL_DOOR.x, COIL_DOOR.y - 100, view, 300)) {
      const [l, r] = coilTerminals(COIL_DOOR.x, COIL_DOOR.y);
      if (Math.sin(t * 3.1) > 0.2) crackle(g, l, { x: COIL_DOOR.x, y: COIL_DOOR.y - 200 }, t, 1, BOLT, 1.6, 0.85, 7);
      if (Math.sin(t * 2.7 + 1) > 0.2) crackle(g, r, { x: COIL_DOOR.x, y: COIL_DOOR.y - 200 }, t, 2, BOLT, 1.6, 0.85, 7);
      glow(g, l.x, l.y, 20, BOLT, 0.06, 2); glow(g, r.x, r.y, 20, BOLT, 0.06, 2);
      if (Math.sin(t * 0.9) > 0.92) crackle(g, { x: COIL_DOOR.x + Math.sin(t) * 60, y: view.y - 20 }, { x: COIL_DOOR.x, y: COIL_DOOR.y - 220 }, t, 9, BOLT, 3, 1, 10);
    }
    // Glints in the double-slit Source.
    if (inView(PIER_X, GATE_Y - 140, view, 200)) {
      const k = 0.5 + 0.5 * Math.sin(t * 2.2);
      glow(g, PIER_X, GATE_Y - 142, 30, ARC, 0.04 + 0.04 * k, 3);
      for (const sx of SLITS) { g.fillStyle(BOTH_LIT, 0.05 + 0.05 * k); g.fillRect(sx - 40, GATE_Y - 80, 80, 80); }
    }
    // A lamp globe that cuts out now and then, as the Draw takes the current.
    for (const [i, l] of LAMPS.entries()) {
      if (!inView(l.x, l.y, view, 120)) continue;
      const gl = arcLampGlobe(l.x, l.y, 70);
      if (Math.sin(t * 23 + i * 7) > 0.93) { g.fillStyle(0x05050a, 0.8); g.fillCircle(gl.x, gl.y, 7); }
      else { g.fillStyle(0xffffff, 0.5 + 0.3 * Math.sin(t * 40 + i)); g.fillCircle(gl.x, gl.y, 2); }
    }
  },
};

export const SUPERPOSITION_AREA: AreaDef = {
  id: 'superposition',
  isle: 'electricity',
  court: 'superposition',
  name: 'The Superposition Court',
  subtitle: 'Two towns at once, and the Draw metered on both',
  w: SUP_W,
  h: SUP_H,
  bg: BASALT_DARK,
  accent: SUPERPOSITION_COLOR,
  weather: 'flicker',
  gloom: 0.3,
  spawn: { x: 1200, y: 1690 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'dynamo', label: 'Down the hill road to the Dynamo Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1040, y: 1730 } },
    { kind: 'prince', id: 'both', at: { x: BOTH_HALL.x, y: BOTH_HALL.y + 50 } },
    {
      kind: 'door', at: { x: COIL_DOOR.x, y: COIL_DOOR.y }, to: 'crowncoil', arrive: { x: 900, y: 2440 }, label: 'The Crown Coil',
      open: { princesOfIsle: 'electricity', count: 6 },
      lockedText: 'Six sockets over the door, one for each prince\'s key. The Coil hums. It will not open for fewer.',
    },
    { kind: 'water', id: 'superposition-well', shape: WELL_RECT, fishery: 'superposition-well' },
    { kind: 'encounter', id: 'superposition-box' },
    { kind: 'encounter', id: 'superposition-slit' },
    { kind: 'encounter', id: 'superposition-observer' },
    { kind: 'encounter', id: 'superposition-entangle' },
    { kind: 'encounter', id: 'superposition-tunnel' },
    {
      kind: 'sign', at: { x: 1300, y: 1650 },
      text: 'THE DRAW, METERED TWICE. Each house owes on both its states. A meter not yet read is read as short.',
    },
    {
      kind: 'sign', at: { x: 980, y: 1440 },
      text: 'THE DOUBLE-SLIT GATE. Pass by either slit. The Grid will note which, and charge for the other.',
    },
    {
      kind: 'sign', at: { x: 560, y: 1000 },
      text: 'DO NOT OBSERVE. Sealed by order of the Grid. An opened box is a decided box, and is billed accordingly.',
    },
    {
      kind: 'sign', at: { x: 920, y: 560 },
      text: 'THE WATCHED STREET. Kept in one state by the Observatory of Looks. Residents are asked not to blink.',
    },
    {
      kind: 'sign', at: { x: 1320, y: 240 },
      text: 'THE CROWN COIL. Opened by Her Radiance to none but the six keys. The earthed go up by the Galleries.',
    },
    { kind: 'chest', id: 'superposition-chest-fences', at: { x: 2330, y: 740 }, coins: 120 },
    { kind: 'chest', id: 'superposition-chest-well', at: { x: 180, y: 1270 }, coins: 90 },
    { kind: 'chest', id: 'superposition-chest-both', at: { x: 2080, y: 500 }, orbs: 2, open: { prince: 'both' } },
  ],
  npcs: SUPERPOSITION_NPCS,
  crowd: SUPERPOSITION_CROWD,
};

