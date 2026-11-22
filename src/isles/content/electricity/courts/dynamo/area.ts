import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, flagstones, glow, groundFill, mulberry, road, type G } from '../../../../art/IsleArt';
import {
  basaltRock, bellTower, bolt, cable, cableDrum, cablePoints, crankHouse, earthingCage, fuseHouse, gridLamp, ladderSpark,
  leydenBank, lightningRod, meterBoard, ovenlight, pylon, pylonArms, raceBed, raceFlow, sparks, spoolShop, stormWaystone,
  switchCabinet, treadwheelFrame, treadwheelSpin, turbineHall, waterwheelSpin, wheelhouse,
} from './art';
import {
  ARC, ARC_VIOLET, BASALT, BASALT_DARK, BASALT_LIT, BRICK, BRICK_DARK, BRICK_LIT, COIL_HOT, COPPER_DARK,
  COPPER_LIT, DYNAMO_COLOR, FILAMENT, IRON, IRON_DARK, IRON_LIT, RIVET, SETT, SETT_DARK, SETT_LIT, SHEEN, SPARK,
  TIMBER, TIMBER_DARK, TIMBER_LIT,
} from './palette';
import { DYNAMO_CROWD, DYNAMO_NPCS } from './npcs';

/**
 * The Dynamo Court — the power-station town where the storm river comes off the black rock.
 *
 * Read it from the Terminus road up:
 * • **the gate** (south): the road comes in past the waystone, the Meter Board where every
 *   household's Draw is chalked and the short are tagged in red, and the Brownout Bell's tower;
 * • **Crank Row** (south-west): two terraces of soot-brick crank-houses, a crank wheel through
 *   every front wall, with Spool & Sons the cablewright's in the middle of the north terrace;
 * • **Ovenlight Lane** (south-east): more crank-houses and the Ovenlight bakery, whose round
 *   coil-lit window is the only warm one left on the street after the Bell;
 * • **the Race** across the whole court: the storm river's white cut channel, three wheelhouses
 *   on its north bank with their waterwheels in the race (the court's charged fishing), crossed
 *   by the main bridge and two footbridges;
 * • **the Treadwheel Yard** (west) on the Cross Road: two great treadwheels walked day and night
 *   by the households behind on the Draw, and the Fuse House by the race;
 * • **the Switchyard** (east of the main road): rows of switch cabinets and Grid lamps — the
 *   circuits that switch a house off live here;
 * • **the Rod Forest** (north-west): a hillside of lightning rods, scorched and glassy;
 * • **the Generator Hall** (north-east): Prince Volt's hall over the great dynamo, with the
 *   Leyden banks beside it; and up the north road the earthing cage on its rails, which carries
 *   the earthed toward the Superposition Court and the Crown Coil.
 */

export const DYNAMO_W = 2400;
export const DYNAMO_H = 1700;

const MAIN_X = 1200;
const CROSS_Y = 850;

/** The Race: the cut channel across the whole court. */
export const RACE_Y = 1160;
export const RACE_H = 100;
/** The bit of race by the wheelhouses where people fish. */
export const RACE_FISHING: Rect = { x: 1290, y: RACE_Y, w: 640, h: RACE_H };
/** Bridges over the race (x ranges). */
const BRIDGES: [number, number][] = [[1140, 1260], [470, 530], [2140, 2200]];
/** The Generator Hall — the middle of its front step. */
export const HALL: Pt = { x: 1720, y: 420 };
const HALL_W = 600, HALL_H = 240;
/** The earthing cage on the north road. */
export const CAGE: Pt = { x: 1040, y: 262 };
/** The Brownout Bell's tower. */
export const BELL: Pt = { x: 1400, y: 1600 };
/** The Meter Board at the gate. */
export const BOARD: Pt = { x: 980, y: 1590 };
/** The Ovenlight's front wall base. */
export const OVENLIGHT: Pt = { x: 1720, y: 1415 };
/** The two treadwheels (base of their frames). */
export const WHEELS: Pt[] = [{ x: 330, y: 690 }, { x: 690, y: 690 }];
const WHEEL_R = 90;
/** Wheelhouses on the race's north bank. */
export const WHEELHOUSES = [1420, 1640, 1860];
/** The switchyard: the breaker for circuit seven (Ada's quest). */
export const CIRCUIT_SEVEN: Pt = { x: 1834, y: 1090 };
/** Crank Row's north terrace (household number → house centre x), all fronts at y = ROW_N. */
export const ROW_N = 1415;
export const ROW_S = 1650;
export const ROW_HOUSES: { x: number; num: number; off: number; wall: number }[] = [
  { x: 180, num: 14, off: 0, wall: BRICK },
  { x: 290, num: 13, off: 2, wall: BRICK_DARK },
  { x: 400, num: 12, off: 1, wall: 0x5a3a30 },
  { x: 880, num: 9, off: 0, wall: BRICK_LIT },
  { x: 990, num: 8, off: 0, wall: BRICK },
];
const ROW_S_HOUSES: { x: number; num: number; off: number; wall: number }[] = [
  { x: 200, num: 21, off: 0, wall: BRICK_LIT },
  { x: 330, num: 22, off: 3, wall: BRICK_DARK },
  { x: 460, num: 23, off: 0, wall: BRICK },
  { x: 590, num: 24, off: 1, wall: 0x5a3a30 },
  { x: 720, num: 25, off: 0, wall: BRICK },
];
const LANE_HOUSES: { x: number; num: number; off: number; wall: number; y: number }[] = [
  { x: 1400, num: 31, off: 0, wall: BRICK, y: ROW_N },
  { x: 1510, num: 32, off: 1, wall: BRICK_LIT, y: ROW_N },
  { x: 1950, num: 34, off: 0, wall: BRICK_DARK, y: ROW_N },
  { x: 2060, num: 35, off: 2, wall: BRICK, y: ROW_N },
  { x: 2170, num: 36, off: 0, wall: 0x5a3a30, y: ROW_N },
  { x: 1560, num: 41, off: 0, wall: BRICK, y: ROW_S },
  { x: 1900, num: 43, off: 1, wall: BRICK_LIT, y: ROW_S },
  { x: 2030, num: 44, off: 0, wall: BRICK_DARK, y: ROW_S },
];
const HOUSE_W = 90, HOUSE_H = 80;
const SHOP: Pt = { x: 680, y: ROW_N };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Lightning rods (tip points), struck in turn by `animateOver`. */
const rodTips: Pt[] = [];
/** Grid lamps (bulb points), flickering in `animateOver`. */
const lamps: { x: number; y: number; on: boolean; s: number }[] = [];
/** Overhead cable spans, drawn in `animateOver`. */
const spans: { a: Pt; b: Pt; sag: number; live: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

const inView = (x: number, y: number, v: Rect, pad = 160): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** Where a crank-house's Grid wire meets its gable insulator. */
const roofPoint = (x: number, base: number, w = HOUSE_W, h = HOUSE_H): Pt => ({ x: x + w * 0.12, y: base - h - h * 0.55 + 6 });

// ── Layout ───────────────────────────────────────────────────────────

// The Generator Hall and its Leyden banks.
addPiece(HALL.x, HALL.y, HALL_W + 80, HALL_H + 220, (g, rng) => turbineHall(g, HALL.x, HALL.y, HALL_W, HALL_H, rng),
  { kind: 'rect', x: HALL.x - HALL_W / 2 - 10, y: HALL.y - 44, w: HALL_W + 20, h: 44 });
addPiece(1950, 640, 240, 100, (g) => leydenBank(g, 1950, 640, 6, 0.6), { kind: 'rect', x: 1846, y: 608, w: 208, h: 34 });
addPiece(2210, 640, 200, 100, (g) => leydenBank(g, 2210, 640, 5, 0.4), { kind: 'rect', x: 2121, y: 608, w: 178, h: 34 });

// The earthing cage on the north road.
addPiece(CAGE.x, CAGE.y, 150, 270, (g) => earthingCage(g, CAGE.x, CAGE.y), { kind: 'rect', x: CAGE.x - 62, y: CAGE.y - 24, w: 124, h: 26 });

// The Rod Forest: rods on a seeded scatter, kept off the paths and the duel ground.
{
  const rng = mulberry(0xd1a40d);
  const keepOff: { p: Pt; r: number }[] = [
    { p: { x: 560, y: 400 }, r: 90 }, { p: { x: 200, y: 520 }, r: 50 }, { p: { x: 640, y: 560 }, r: 70 },
  ];
  const placed: Pt[] = [];
  for (let tries = 0; tries < 400 && placed.length < 20; tries++) {
    const x = 90 + rng() * 860, y = 130 + rng() * 290;
    if (Math.abs(y - 330) < 34 && x > 120) continue; // the forest path
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 86)) continue;
    if (keepOff.some((k) => Math.hypot(k.p.x - x, k.p.y - y) < k.r)) continue;
    placed.push({ x, y });
  }
  for (const p of placed) {
    const h = 70 + ((p.x * 7 + p.y * 3) % 50);
    addPiece(p.x, p.y, 50, h + 40, (g) => { lightningRod(g, p.x, p.y, h); }, { kind: 'circle', x: p.x, y: p.y - 6, r: 12 });
    rodTips.push({ x: p.x, y: p.y - 16 - h - 14 });
  }
}

// The treadwheels and the Treadwheel Yard.
for (const w of WHEELS) {
  addPiece(w.x, w.y, WHEEL_R * 2.6, WHEEL_R * 2 + 60, (g) => treadwheelFrame(g, w.x, w.y, WHEEL_R),
    { kind: 'rect', x: w.x - 72, y: w.y - 20, w: 144, h: 22 });
  solids.push({ kind: 'circle', x: w.x + WHEEL_R * 0.95, y: w.y - 10, r: 20 });
}
addPiece(820, 1040, 190, 140, (g, rng) => fuseHouse(g, 820, 1040, 150, 80, rng), { kind: 'rect', x: 740, y: 1012, w: 160, h: 30 });

// The Switchyard: two rows of cabinets and lamps between them.
for (const row of [960, 1060]) {
  for (let i = 0; i < 6; i++) {
    const x = 1480 + i * 92;
    if (row === 1060 && i === 4) continue; // circuit seven stands apart (below)
    addPiece(x, row, 40, 50, (g) => switchCabinet(g, x, row, 1, (i + row) % 3 !== 0), { kind: 'rect', x: x - 15, y: row - 10, w: 30, h: 10 });
  }
}
addPiece(CIRCUIT_SEVEN.x, CIRCUIT_SEVEN.y - 30, 40, 50, (g) => switchCabinet(g, CIRCUIT_SEVEN.x, CIRCUIT_SEVEN.y - 30, 1.15, true),
  { kind: 'rect', x: CIRCUIT_SEVEN.x - 17, y: CIRCUIT_SEVEN.y - 42, w: 34, h: 12 });

// The wheelhouses on the race bank.
for (const x of WHEELHOUSES) {
  addPiece(x, RACE_Y - 10, 120, 170, (g, rng) => wheelhouse(g, x, RACE_Y - 10, rng), { kind: 'rect', x: x - 48, y: RACE_Y - 40, w: 96, h: 30 });
}

// Crank Row, Spool & Sons, Ovenlight Lane.
for (const h of ROW_HOUSES) {
  addPiece(h.x, ROW_N, HOUSE_W + 20, HOUSE_H + 80, (g, rng) => crankHouse(g, h.x, ROW_N, HOUSE_W, HOUSE_H, { wall: h.wall, num: h.num, off: h.off, chimney: h.num % 2 === 0 }, rng),
    { kind: 'rect', x: h.x - HOUSE_W / 2, y: ROW_N - 28, w: HOUSE_W, h: 28 });
}
for (const h of ROW_S_HOUSES) {
  addPiece(h.x, ROW_S, HOUSE_W + 20, HOUSE_H + 80, (g, rng) => crankHouse(g, h.x, ROW_S, HOUSE_W, HOUSE_H, { wall: h.wall, num: h.num, off: h.off, chimney: h.num % 2 === 1 }, rng),
    { kind: 'rect', x: h.x - HOUSE_W / 2, y: ROW_S - 28, w: HOUSE_W, h: 28 });
}
for (const h of LANE_HOUSES) {
  addPiece(h.x, h.y, HOUSE_W + 20, HOUSE_H + 80, (g, rng) => crankHouse(g, h.x, h.y, HOUSE_W, HOUSE_H, { wall: h.wall, num: h.num, off: h.off, chimney: h.num % 3 === 0 }, rng),
    { kind: 'rect', x: h.x - HOUSE_W / 2, y: h.y - 28, w: HOUSE_W, h: 28 });
}
addPiece(SHOP.x, SHOP.y, 230, 200, (g, rng) => spoolShop(g, SHOP.x, SHOP.y, 190, 90, rng), { kind: 'rect', x: SHOP.x - 95, y: SHOP.y - 30, w: 190, h: 30 });
addPiece(OVENLIGHT.x, OVENLIGHT.y, 250, 210, (g, rng) => { ovenlight(g, OVENLIGHT.x, OVENLIGHT.y, 210, 110, rng); },
  { kind: 'rect', x: OVENLIGHT.x - 108, y: OVENLIGHT.y - 32, w: 216, h: 32 });

// The gate: the Meter Board, the Bell, the waystone.
addPiece(BOARD.x, BOARD.y, 230, 130, (g, rng) => meterBoard(g, BOARD.x, BOARD.y, 160, rng), { kind: 'rect', x: BOARD.x - 82, y: BOARD.y - 14, w: 164, h: 16 });
solids.push({ kind: 'circle', x: BOARD.x + 102, y: BOARD.y - 4, r: 8 });
addPiece(BELL.x, BELL.y, 120, 330, (g) => { bellTower(g, BELL.x, BELL.y, 190); }, { kind: 'rect', x: BELL.x - 46, y: BELL.y - 14, w: 92, h: 16 });
addPiece(1090, 1610, 50, 80, (g) => stormWaystone(g, 1090, 1610), { kind: 'circle', x: 1090, y: 1604, r: 14 });

// Pylons, and the cable spans between them, the hall, the wheelhouses and the roofs.
const PYLONS: { x: number; y: number; h: number }[] = [
  { x: 1000, y: 640, h: 170 }, { x: 1480, y: 700, h: 160 }, { x: 300, y: 1060, h: 170 },
  { x: 2250, y: 1000, h: 170 }, { x: 1080, y: 1320, h: 150 }, { x: 2250, y: 300, h: 150 },
];
for (const p of PYLONS) addPiece(p.x, p.y, p.h * 0.6, p.h + 30, (g) => pylon(g, p.x, p.y, p.h), { kind: 'rect', x: p.x - p.h * 0.16 - 6, y: p.y - 10, w: p.h * 0.32 + 12, h: 12 });
{
  const arm = (i: number, side: 0 | 1) => pylonArms(PYLONS[i].x, PYLONS[i].y, PYLONS[i].h)[side];
  const hallL = { x: HALL.x - HALL_W / 2 + 3, y: HALL.y - HALL_H - 22 };
  const hallR = { x: HALL.x + HALL_W / 2 - 3, y: HALL.y - HALL_H - 22 };
  const span = (a: Pt, b: Pt, sag: number, live = 0) => spans.push({ a, b, sag, live });
  span(hallL, arm(1, 1), 50, 1);
  span(arm(1, 0), arm(0, 1), 44, 1);
  span(arm(0, 0), arm(2, 1), 60, 1);
  span(arm(2, 0), { x: -10, y: 900 }, 40);
  span(arm(0, 1), arm(4, 1), 36, 1);
  span(hallR, arm(5, 0), 34, 1);
  span(arm(5, 1), { x: 2410, y: 360 }, 30);
  span(hallR, arm(3, 0), 70, 1);
  span(arm(3, 1), { x: 2410, y: 820 }, 30);
  // Wheelhouses feed the pylon on the main bridge.
  const wh = WHEELHOUSES.map((x) => ({ x: x - 38, y: RACE_Y - 10 - 116 }));
  span(arm(3, 0), wh[2], 40, 1); span(wh[2], wh[1], 22, 1); span(wh[1], wh[0], 22, 1); span(wh[0], arm(4, 1), 40, 1);
  // Crank Row roofs, west from the bridge pylon.
  const row = [...ROW_HOUSES].sort((a, b) => b.x - a.x).map((h) => roofPoint(h.x, ROW_N));
  let prev = arm(4, 0);
  for (const r of row) { span(prev, r, 18); prev = r; }
  // Ovenlight Lane roofs, east.
  const lane = LANE_HOUSES.filter((h) => h.y === ROW_N).map((h) => roofPoint(h.x, ROW_N));
  prev = arm(4, 1);
  for (const r of lane) { span(prev, r, 20); prev = r; }
}

// Grid lamps along the streets.
for (const [x, y, on] of [
  [1270, 1520, true], [1130, 1360, true], [1270, 1060, true], [1130, 700, false], [1270, 520, true], [1130, 320, true],
  [240, 910, false], [620, 910, true], [880, 790, true], [1560, 910, true], [1880, 790, true], [2120, 910, false],
  [560, 1500, true], [260, 1500, false], [1600, 1500, true], [2100, 1500, true],
  [1430, 560, true], [2010, 560, true],
] as [number, number, boolean][]) {
  addPiece(x, y, 40, 80, (g) => gridLamp(g, x, y, on), { kind: 'circle', x, y: y - 3, r: 7 });
  lamps.push({ x: x + 15, y: y - 58, on, s: (x * 13 + y) % 7 });
}

// Basalt outcrops round the edges, cable drums in the yards.
{
  const rng = mulberry(0x5e1d0c);
  for (const [x, y, s] of [
    [60, 120, 1.1], [2340, 140, 1.2], [2330, 520, 0.9], [60, 640, 0.8], [2340, 1300, 1], [70, 1300, 0.9],
    [1400, 140, 0.8], [2080, 180, 0.9], [960, 1110, 0.7], [1000, 980, 0.6],
  ] as [number, number, number][]) {
    addPiece(x, y, 90 * s, 90 * s, (g) => basaltRock(g, x, y, s, rng), { kind: 'circle', x, y: y - 6, r: 24 * s });
  }
  for (const [x, y, s] of [[1360, 1060, 0.8], [2060, 1000, 0.7], [140, 760, 0.8], [880, 1110, 0.6], [2300, 1520, 0.8]] as [number, number, number][]) {
    addPiece(x, y, 60, 60, (g) => cableDrum(g, x, y, s), { kind: 'circle', x: x - 6, y: y - 8, r: 16 * s });
  }
}

// The race: kerbed channel with three crossings.
{
  let x = 0;
  for (const [a, b] of [...BRIDGES].sort((p, q) => p[0] - q[0])) {
    if (a > x) solids.push({ kind: 'rect', x, y: RACE_Y + 6, w: a - x, h: RACE_H - 12 });
    x = b;
  }
  solids.push({ kind: 'rect', x, y: RACE_Y + 6, w: DYNAMO_W - x, h: RACE_H - 12 });
}

// ── Painter ──────────────────────────────────────────────────────────

/** The angle of the wheels, read off one clock so they keep step with each other. */
const wheelAngle = (t: number, k: number) => t * 0.55 * k;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = DYNAMO_W, H = DYNAMO_H;
    groundFill(g, { x: 0, y: 0, w: W, h: H }, BASALT, BASALT_LIT, SHEEN, rng, 1.2);
    // Rain lying in every hollow, the arc-light sliding over it.
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = rng() * H;
      blob(g, x, y, 20 + rng() * 40, 7 + rng() * 12, BASALT_DARK, 0.6, rng);
      g.lineStyle(1, SHEEN, 0.35); g.lineBetween(x - 12, y - 2, x + 10, y - 3);
    }
    // The Treadwheel Yard: trodden cinder and plank walks.
    g.fillStyle(0x24221f, 1); g.fillRoundedRect(150, 560, 740, 210, 40);
    for (let i = 0; i < 400; i++) { g.fillStyle(rng() < 0.5 ? 0x3a352e : 0x14120f, 0.6); g.fillRect(150 + rng() * 740, 560 + rng() * 210, 2, 1.5); }
    for (const w of WHEELS) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(w.x - 90, w.y - 2, 180, 26);
      for (let k = 0; k < 18; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 0.9); g.fillRect(w.x - 89 + k * 10, w.y, 9, 22); }
    }
    // The Rod Forest: scorch stars and fused glass in the rock.
    for (let i = 0; i < 26; i++) {
      const x = 90 + rng() * 860, y = 130 + rng() * 440;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + rng();
        g.lineStyle(2, 0x07080a, 0.5); g.lineBetween(x, y, x + Math.cos(a) * (10 + rng() * 18), y + Math.sin(a) * (5 + rng() * 9));
      }
      g.fillStyle(0x6cc6a6, 0.25); g.fillCircle(x + 3, y, 2);
    }
    // Roads: wet setts, with a riveted cable trench along one side of each.
    const trench = (pts: Pt[], off: number) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
        for (let d = 0; d < len; d += 34) {
          const x = a.x + ux * d - uy * off, y = a.y + uy * d + ux * off;
          g.fillStyle(IRON_DARK, 1); g.fillRect(x - 15, y - 6, 30, 12);
          g.fillStyle(IRON, 1); g.fillRect(x - 14, y - 5, 28, 10);
          g.fillStyle(RIVET, 0.8); g.fillCircle(x - 11, y - 2, 1); g.fillCircle(x + 11, y + 2, 1);
          g.lineStyle(1, IRON_LIT, 0.4); g.lineBetween(x - 10, y - 1, x + 10, y - 1);
        }
      }
    };
    const main = [{ x: MAIN_X, y: H + 20 }, { x: MAIN_X, y: -20 }];
    const cross = [{ x: -20, y: CROSS_Y }, { x: W + 20, y: CROSS_Y }];
    road(g, main, 110, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, cross, 100, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 110, y: 1460 }, { x: MAIN_X, y: 1460 }], 70, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: MAIN_X, y: 1460 }, { x: 2290, y: 1460 }], 70, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 500, y: 1460 }, { x: 500, y: 1270 }], 44, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 500, y: 1150 }, { x: 500, y: CROSS_Y }], 44, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 2170, y: 1460 }, { x: 2170, y: 1270 }], 44, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 2170, y: 1150 }, { x: 2170, y: CROSS_Y }], 44, SETT, SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: MAIN_X, y: 330 }, { x: 120, y: 330 }], 50, dim(SETT, 0.1), SETT_DARK, SETT_LIT, rng);
    road(g, [{ x: 500, y: CROSS_Y }, { x: 500, y: 760 }], 50, SETT, SETT_DARK, SETT_LIT, rng);
    trench(main, 70);
    trench(cross, -62);
    // The Generator Hall forecourt: big basalt flags with a copper inlay ring.
    flagstones(g, { x: HALL.x - HALL_W / 2 - 30, y: HALL.y - 20, w: HALL_W + 60, h: 170 }, 42, BASALT_LIT, BASALT_DARK, rng);
    road(g, [{ x: MAIN_X, y: 520 }, { x: HALL.x - HALL_W / 2 - 30, y: 520 }], 60, SETT, SETT_DARK, SETT_LIT, rng);
    g.lineStyle(4, COPPER_DARK, 0.9); g.strokeEllipse(HALL.x, HALL.y + 80, 260, 90);
    g.lineStyle(1.5, COPPER_LIT, 0.5); g.strokeEllipse(HALL.x, HALL.y + 80, 248, 84);
    // The Switchyard: crushed slag, kerbed in iron.
    g.fillStyle(0x2a2826, 1); g.fillRect(1430, 910, 560, 200);
    for (let i = 0; i < 700; i++) { g.fillStyle(rng() < 0.5 ? 0x45403a : 0x1a1816, 0.7); g.fillRect(1430 + rng() * 560, 910 + rng() * 200, 2, 2); }
    g.lineStyle(3, IRON, 1); g.strokeRect(1430, 910, 560, 200);
    // Buried cables between the cabinets.
    for (let i = 0; i < 6; i++) { g.lineStyle(2, COPPER_DARK, 0.5); g.lineBetween(1480 + i * 92, 960, 1480 + i * 92, 1060); }
    // The gate: flags before the board and the bell.
    flagstones(g, { x: 890, y: 1540, w: 600, h: 160 }, 36, SETT_LIT, SETT_DARK, rng);
    // The Ovenlight's warm doorstep — the setts are dry in front of it.
    g.fillStyle(0x5a4636, 0.5); g.fillEllipse(OVENLIGHT.x, OVENLIGHT.y + 30, 260, 50);
    // The race and its crossings.
    raceBed(g, 0, RACE_Y, W, RACE_H, rng);
    for (const [a, b] of BRIDGES) {
      g.fillStyle(IRON_DARK, 1); g.fillRect(a - 6, RACE_Y - 12, b - a + 12, RACE_H + 24);
      for (let y = RACE_Y - 10; y < RACE_Y + RACE_H + 10; y += 9) {
        g.fillStyle(IRON, 1); g.fillRect(a - 4, y, b - a + 8, 7);
        g.fillStyle(RIVET, 0.7); g.fillCircle(a, y + 3.5, 1); g.fillCircle(b, y + 3.5, 1);
      }
      g.fillStyle(IRON_LIT, 1); g.fillRect(a - 8, RACE_Y - 12, 4, RACE_H + 24); g.fillRect(b + 4, RACE_Y - 12, 4, RACE_H + 24);
    }
    // Weir steps across the race, white where it falls.
    for (const x of [260, 820, 1990]) {
      g.fillStyle(0x3a3e46, 1); g.fillRect(x, RACE_Y, 10, RACE_H);
      g.fillStyle(0xd6f0f6, 0.5); g.fillRect(x + 10, RACE_Y, 8, RACE_H);
    }
  },

  pieces,

  animate(g, t, view) {
    // The race running.
    if (view.y + view.h > RACE_Y - 80 && view.y < RACE_Y + RACE_H + 80) raceFlow(g, 0, RACE_Y, DYNAMO_W, RACE_H, t, view);
    // Waterwheels in the race.
    for (const x of WHEELHOUSES) if (inView(x, RACE_Y + 45, view)) waterwheelSpin(g, x, RACE_Y + 45, 36, wheelAngle(t, 2.4), t);
    // The treadwheels, walked day and night.
    WHEELS.forEach((w, i) => { if (inView(w.x, w.y - WHEEL_R, view, 200)) treadwheelSpin(g, w.x, w.y, WHEEL_R, wheelAngle(t, i ? 0.9 : 1), t + i, 2); });
    // The Ovenlight's warmth spilling on the street.
    if (inView(OVENLIGHT.x, OVENLIGHT.y, view)) glow(g, OVENLIGHT.x, OVENLIGHT.y + 40, 110 + Math.sin(t * 2) * 6, COIL_HOT, 0.025, 4);
    // The hall's windows throwing the dynamo's light on the forecourt, pulsing with its turn.
    if (inView(HALL.x, HALL.y, view, 400)) {
      const k = 0.5 + Math.sin(t * 6) * 0.25 + Math.sin(t * 17) * 0.1;
      for (let i = 0; i < 6; i++) { g.fillStyle(ARC, 0.035 * k); g.fillEllipse(HALL.x - 250 + i * 100, HALL.y + 40, 70, 40); }
    }
  },

  animateOver(g, t, view) {
    // Overhead cable, sparks running along the live spans.
    for (const s of spans) {
      const minX = Math.min(s.a.x, s.b.x), maxX = Math.max(s.a.x, s.b.x);
      const minY = Math.min(s.a.y, s.b.y), maxY = Math.max(s.a.y, s.b.y) + s.sag;
      if (maxX < view.x - 40 || minX > view.x + view.w + 40 || maxY < view.y - 40 || minY > view.y + view.h + 40) continue;
      cable(g, s.a, s.b, s.sag, 0x0e0f12, 3, 0.9);
      cable(g, s.a, s.b, s.sag, COPPER_DARK, 1.4, 0.9);
      if (s.live) {
        const pts = cablePoints(s.a, s.b, s.sag, 24);
        const ph = (t * 0.6 + (s.a.x + s.b.y) * 0.001) % 1;
        const p = pts[Math.floor(ph * (pts.length - 1))];
        glow(g, p.x, p.y, 10, ARC, 0.12, 2);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(p.x, p.y, 1.6);
      }
    }
    // Lamps flicker — the Grid is always drawing a little more than it has.
    for (const l of lamps) {
      if (!l.on || !inView(l.x, l.y, view)) continue;
      const f = Math.sin(t * 9 + l.s) * Math.sin(t * 23 + l.s * 2);
      if (f > 0.85) continue;
      glow(g, l.x, l.y + 6, 34, FILAMENT, 0.03, 3);
    }
    // The storm takes a rod in the forest every few seconds.
    const n = rodTips.length;
    if (n) {
      const beat = 2.7;
      const k = Math.floor(t / beat);
      const ph = (t % beat) / beat;
      const tip = rodTips[(k * 7) % n];
      if (ph < 0.09 && inView(tip.x, tip.y, view, 400)) {
        bolt(g, tip.x + ((k * 37) % 80) - 40, view.y - 30, tip.x, tip.y, Math.floor(t * 30), 3, ARC, 1 - ph * 8, 26);
        glow(g, tip.x, tip.y, 60, ARC, 0.08, 3);
        sparks(g, tip.x, tip.y, 16, t * 1000, 8);
      }
    }
    // Leyden banks spitting between their knobs.
    for (const [bx, n2] of [[1950, 6], [2210, 5]] as [number, number][]) {
      if (!inView(bx, 560, view)) continue;
      const k = Math.floor(t * 3 + bx);
      if (k % 4) continue;
      const i = k % (n2 - 1);
      const x0 = bx - (n2 * 30) / 2 + 15;
      bolt(g, x0 + i * 30, 640 - 84, x0 + (i + 1) * 30, 640 - 84, Math.floor(t * 40), 1.5, ARC_VIOLET, 0.9, 6, false);
    }
    // Jacob's ladders either side of the hall door.
    if (inView(HALL.x, HALL.y - 60, view)) { ladderSpark(g, HALL.x - 70, HALL.y - 24, 70, t); ladderSpark(g, HALL.x + 70, HALL.y - 24, 70, t + 0.5); }
    // The earthing cage's padlock, live.
    if (inView(CAGE.x, CAGE.y, view)) sparks(g, CAGE.x + 57, CAGE.y - 58, 8, t * 1000, 3, SPARK);
    // Leftover sparks off the switchyard's live cabinets.
    if (inView(CIRCUIT_SEVEN.x, CIRCUIT_SEVEN.y, view)) sparks(g, CIRCUIT_SEVEN.x, CIRCUIT_SEVEN.y - 70, 10, t * 1000, 4, COPPER_LIT);
  },
};

export const DYNAMO_AREA: AreaDef = {
  id: 'dynamo',
  isle: 'electricity',
  court: 'dynamo',
  name: 'The Dynamo Court',
  subtitle: 'Every wheel turns for the Grid',
  w: DYNAMO_W,
  h: DYNAMO_H,
  bg: BASALT_DARK,
  accent: DYNAMO_COLOR,
  weather: 'storm',
  gloom: 0.3,
  spawn: { x: 1200, y: 1620 },
  painter,
  solids,
  exits: [
    { side: 's', to: 'terminus', label: 'Down the cable road to Terminus' },
    { side: 'n', to: 'superposition', label: 'Up the earthing rails to the Superposition Court' },
    { side: 'w', to: 'circuit', at: CROSS_Y, label: 'The Cross Road west to the Circuit Court' },
    { side: 'e', to: 'lodestar', at: CROSS_Y, label: 'The Cross Road east to the Lodestar Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 1090, y: 1644 } },
    { kind: 'prince', id: 'volt', at: { x: HALL.x, y: HALL.y + 46 } },
    { kind: 'water', id: 'dynamo-race', shape: RACE_FISHING, fishery: 'dynamo-race' },
    { kind: 'encounter', id: 'dynamo-treadwheel' },
    { kind: 'encounter', id: 'dynamo-lightning-rods' },
    { kind: 'encounter', id: 'dynamo-brownout' },
    { kind: 'encounter', id: 'dynamo-overload' },
    { kind: 'encounter', id: 'dynamo-mill-race' },
    {
      kind: 'sign', at: { x: 1290, y: 1640 },
      text: 'THE DRAW. Every household cranks its quota. Drawn off at the Brownout Bell. Short is switched off.',
    },
    {
      kind: 'sign', at: { x: 870, y: 1620 },
      text: 'SWITCHED OFF THREE TIMES IS EARTHED. The earthed crank in the Treadmill Galleries until the Grid is satisfied.',
    },
    {
      kind: 'sign', at: { x: 510, y: 790 },
      text: 'THE TREADWHEEL YARD. Households behind on the Draw may walk it off here. Walking is not resting.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 300 },
      text: 'TO THE CROWN COIL. Earthing cage leaves at the Bell. Flame, candle and match are theft from the Grid.',
    },
    {
      kind: 'sign', at: { x: 1360, y: 470 },
      text: 'THE GENERATOR HALL. Seat of His Highness Prince Volt. Do not touch anything. Everything is live.',
    },
    { kind: 'chest', id: 'dynamo-chest-rods', at: { x: 200, y: 520 }, coins: 110 },
    { kind: 'chest', id: 'dynamo-chest-hall', at: { x: 2120, y: 480 }, orbs: 2, open: { prince: 'volt' } },
  ],
  npcs: DYNAMO_NPCS,
  crowd: DYNAMO_CROWD,
};
