import type { AreaDef, NpcDef, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, glow, lit, motes, shadow } from '../../../../art/IsleArt';
import { test as saveTest } from '../../../../IslesSave';
import {
  AMBER, ARC, ARC_CORE, BRASS, BRASS_DARK, COPPER, COPPER_DARK, COPPER_LIT, GLASS, IRON, IRON_DARK, IRON_LIT,
  PATINA, PATINA_DARK, PORCELAIN, STORM, VIOLET, WARN_RED, bolt, busbar, coilTurn, crackle, earthedFigure, faradayCage,
  insulator, leydenJar, meterDial, ohmSigil, treadwheel,
} from './art';

/**
 * The Crown Coil — Empress Ohmrine's tower of copper rings on the summit of Voltreach, climbed
 * UPWARD. Every turn of the great coil is a floor; the walls are the windings themselves, a
 * hand's breadth of copper wire as thick as a man, and the storm looks in through the gaps.
 *
 *   Earthing Floor — (y 2290–2564) the foot of the Coil, where the earthed are brought in at the
 *                    door from the Superposition Court. A waystone, the Meter Wall.
 *   Hall I         — The Treadmill Galleries (y 1730–2250): two treadmill belts run *down* the
 *                    hall, carrying everyone back toward the cranks, and between them rows of
 *                    treadwheels with the earthed walking inside. The overseers' sparks run the
 *                    belts on the beat: the first belt sparks in a chequer (left half, right half
 *                    of every pair, in turn), the second in thirds. Cross on the off-beat.
 *                    Warden: Overseer Brannock Crankshaw.
 *   Hall II        — The Capacitor Banks (y 1050–1690): Leyden jars as tall as houses in three
 *                    rows, arcs leaping jar to jar as each pair discharges. The hall's top is a
 *                    live copper busbar across the whole floor; it is safe only once both banks
 *                    are earthed — a switch at the far west end, one at the far east.
 *                    Warden: Capacitrix Leyda Mirrow.
 *   Hall III       — The Faraday Cages (y 370–1010): the floor is ruled into cells and a cage
 *                    hangs over every one. They drop in a chequer on the beat; a dropped cage's
 *                    bars are live, but *inside* one the current goes round you. Hop from cell
 *                    to cell between drops. Warden: Turnkey Osric Mesh.
 *   The Terminal   — (y 40–330) the Coil's top ring, open to the storm. The Empress's seat.
 *
 * There is no health out here: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 240;
const R = 1560;
const MID = 900;
const DOOR_L = 820;
const DOOR_R = 980;

const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;
const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
const safeFlag = (c: Parameters<typeof saveTest>[0]): boolean => {
  try { return saveTest(c); } catch { return false; /* no save loaded (validator) */ }
};

// ── Hall I: the Treadmill Galleries ──────────────────────────────────

const BELT_V = 120;
const BELT_1: Rect = { x: L, y: 2120, w: R - L, h: 90 };
const BELT_2: Rect = { x: L, y: 1882, w: R - L, h: 90 };
/** Row 1 of treadwheels (one aisle in the middle) and row 2 (an aisle near each wall). */
const ROW_1: Rect[] = [{ x: L, y: 2006, w: DOOR_L - 20 - L, h: 80 }, { x: DOOR_R + 20, y: 2006, w: R - DOOR_R - 20, h: 80 }];
const ROW_2: Rect[] = [{ x: L, y: 1788, w: 60, h: 60 }, { x: 460, y: 1788, w: 880, h: 60 }, { x: 1500, y: 1788, w: R - 1500, h: 60 }];

/** Belt 1 sparks in a chequer of six: odd and even segments on alternating beats. */
const CHEQ_N = 6;
const CHEQ_W = (R - L) / CHEQ_N;
const CHEQ_PERIOD = 1800;
const CHEQ_ON = 500;
const cheqOff = (i: number): number => (i % 2 === 0 ? 0 : -900);
/** Belt 2 sparks in thirds, west to east and round again. */
const THIRDS: [number, number][] = [[L, 680], [680, 1120], [1120, R]];
const THIRD_PERIOD = 1800;
const THIRD_ON = 600;
const thirdOff = (i: number): number => -i * 600;

// ── Hall II: the Capacitor Banks ─────────────────────────────────────

const JAR_ROWS = [1580, 1460, 1340];
const JAR_COLS = [340, 564, 788, 1012, 1236, 1460];
const JAR_R = 34;
const ARC_PERIOD = 3000;
const ARC_ON = 700;
const ARC_H = 28;
/** The arc spans of each row: wall→jar, jar→jar…, jar→wall. */
const arcSpans = (): { rect: Rect; row: number; i: number; off: number; a: Pt; b: Pt }[] => {
  const out: { rect: Rect; row: number; i: number; off: number; a: Pt; b: Pt }[] = [];
  JAR_ROWS.forEach((y, row) => {
    const xs = [L, ...JAR_COLS, R];
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = i === 0 ? L : xs[i] + JAR_R;
      const x1 = i === xs.length - 2 ? R : xs[i + 1] - JAR_R;
      // Each row discharges in a run from one end to the other, and the rows run opposite ways.
      const order = row % 2 === 0 ? i : xs.length - 2 - i;
      const off = -((order * 380 + row * 1100) % ARC_PERIOD);
      out.push({ rect: { x: x0, y: y - ARC_H / 2, w: x1 - x0, h: ARC_H }, row, i, off, a: { x: i === 0 ? L : xs[i], y: y - 107 }, b: { x: i === xs.length - 2 ? R : xs[i + 1], y: y - 107 } });
    }
  });
  return out;
};
const ARCS = arcSpans();
const EARTH_W = 'crowncoil-earth-west';
const EARTH_E = 'crowncoil-earth-east';
const EARTHED = { all: [{ flag: EARTH_W }, { flag: EARTH_E }] };
const BUSBAR: Rect = { x: L, y: 1222, w: R - L, h: 48 };
const LEVER_W: Pt = { x: 290, y: 1400 };
const LEVER_E: Pt = { x: 1510, y: 1400 };

// ── Hall III: the Faraday Cages ──────────────────────────────────────

const CAGE_COLS = 8;
const CAGE_ROWS = 3;
const CELL_W = (R - L) / CAGE_COLS;
const CELL_H = 155;
const CAGE_TOP = 470;
const BAR = 16;
const CAGE_PERIOD = 2800;
const CAGE_ON = 900;
const cageOff = (c: number, r: number): number => ((c + r) % 2 === 0 ? 0 : -1400);
interface Cell { c: number; r: number; x0: number; y0: number; cx: number; cy: number; off: number }
const CELLS: Cell[] = [];
for (let r = 0; r < CAGE_ROWS; r++) {
  for (let c = 0; c < CAGE_COLS; c++) {
    const x0 = L + c * CELL_W, y0 = CAGE_TOP + r * CELL_H;
    CELLS.push({ c, r, x0, y0, cx: x0 + CELL_W / 2, cy: y0 + CELL_H / 2, off: cageOff(c, r) });
  }
}

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [
  { kind: 'conveyor', rect: BELT_1, vx: 0, vy: BELT_V, look: 'belt' },
  { kind: 'conveyor', rect: BELT_2, vx: 0, vy: BELT_V, look: 'belt' },
];
for (let i = 0; i < CHEQ_N; i++) {
  hazards.push({ kind: 'jet', rect: { x: L + i * CHEQ_W, y: BELT_1.y, w: CHEQ_W, h: BELT_1.h }, periodMs: CHEQ_PERIOD, onMs: CHEQ_ON, offsetMs: cheqOff(i), color: ARC });
}
THIRDS.forEach(([a, b], i) => {
  hazards.push({ kind: 'jet', rect: { x: a, y: BELT_2.y, w: b - a, h: BELT_2.h }, periodMs: THIRD_PERIOD, onMs: THIRD_ON, offsetMs: thirdOff(i), color: AMBER });
});
for (const s of ARCS) hazards.push({ kind: 'jet', rect: s.rect, periodMs: ARC_PERIOD, onMs: ARC_ON, offsetMs: s.off, color: ARC });
hazards.push({ kind: 'floor', rect: BUSBAR, safeWhen: EARTHED, color: COPPER });
for (const cl of CELLS) {
  const x1 = cl.x0 + CELL_W, y1 = cl.y0 + CELL_H;
  const bars: Rect[] = [
    { x: cl.x0, y: cl.y0 - BAR / 2, w: CELL_W, h: BAR },
    { x: cl.x0, y: y1 - BAR / 2, w: CELL_W, h: BAR },
    { x: cl.x0 - BAR / 2, y: cl.y0, w: BAR, h: CELL_H },
    { x: x1 - BAR / 2, y: cl.y0, w: BAR, h: CELL_H },
  ];
  for (const rect of bars) hazards.push({ kind: 'jet', rect, periodMs: CAGE_PERIOD, onMs: CAGE_ON, offsetMs: cl.off, color: VIOLET });
}

// ── Walls and gates ──────────────────────────────────────────────────

const CROSS_WALLS = [2250, 1690, 1010, 330];
const WALL_T = 40;

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const y of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y, w: DOOR_L - L, h: WALL_T }, { kind: 'rect', x: DOOR_R, y, w: R - DOOR_R, h: WALL_T });
}
for (const r of [...ROW_1, ...ROW_2]) solids.push({ kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h });
for (const y of JAR_ROWS) for (const x of JAR_COLS) solids.push({ kind: 'circle', x, y, r: JAR_R });
// The Meter Wall and the earthing bank on the Earthing Floor, against the bulkhead.
const METER_WALL: Rect = { x: 1180, y: 2290, w: 330, h: 44 };
const EARTH_BANK: Rect = { x: 270, y: 2290, w: 220, h: 40 };
solids.push({ kind: 'rect', ...METER_WALL }, { kind: 'rect', ...EARTH_BANK });
// The Terminal narrows between two Tesla columns.
const TESLA_W: Rect = { x: L, y: 40, w: 200, h: 290 };
const TESLA_E: Rect = { x: R - 200, y: 40, w: 200, h: 290 };
solids.push({ kind: 'rect', ...TESLA_W }, { kind: 'rect', ...TESLA_E });

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1690, w: DOOR_R - DOOR_L, h: WALL_T }, open: { encounter: 'crowncoil-warden-1' }, look: 'cable', label: 'Defeat the Overseer' },
  { rect: { x: DOOR_L, y: 1010, w: DOOR_R - DOOR_L, h: WALL_T }, open: { encounter: 'crowncoil-warden-2' }, look: 'lightning', label: 'Defeat the Capacitrix' },
  { rect: { x: DOOR_L, y: 330, w: DOOR_R - DOOR_L, h: WALL_T }, open: { encounter: 'crowncoil-warden-3' }, look: 'cable', label: 'Defeat the Turnkey' },
];

// ── Ground ───────────────────────────────────────────────────────────

/** Riveted iron deck plates, oil-dark, with copper strip seams. */
function deck(g: G, r: Rect, rng: () => number, base = IRON): void {
  const S = 60;
  g.fillStyle(IRON_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const c = rng() < 0.5 ? base : dim(base, 0.12);
      const w = Math.min(S - 3, r.x + r.w - x - 1.5), h = Math.min(S - 3, r.y + r.h - y - 1.5);
      if (w <= 0 || h <= 0) continue;
      g.fillStyle(c, 1); g.fillRect(x + 1.5, y + 1.5, w, h);
      g.fillStyle(lit(c, 0.08), 0.6); g.fillRect(x + 1.5, y + 1.5, w, 2);
      for (const [rx, ry] of [[5, 5], [S - 8, 5], [5, S - 8], [S - 8, S - 8]]) {
        if (rx > w || ry > h) continue;
        g.fillStyle(IRON_LIT, 0.9); g.fillCircle(x + rx, y + ry, 1.6);
      }
      if (rng() < 0.18) { g.fillStyle(0x000000, 0.25); g.fillEllipse(x + rng() * S, y + rng() * S, 18 + rng() * 22, 6 + rng() * 8); }
    }
  }
  g.lineStyle(1.5, COPPER_DARK, 0.6);
  for (let x = r.x; x < r.x + r.w; x += S * 3) g.lineBetween(x, r.y, x, r.y + r.h);
}

/** Copper earthing plates gone green at the edges — the Coil's foot, where the earthed come in. */
function earthPlates(g: G, r: Rect, rng: () => number): void {
  const S = 74;
  g.fillStyle(PATINA_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const w = Math.min(S - 6, r.x + r.w - x - 3), h = Math.min(S - 6, r.y + r.h - y - 3);
      if (w <= 0 || h <= 0) continue;
      g.fillStyle(rng() < 0.5 ? COPPER_DARK : dim(COPPER, 0.4), 1); g.fillRect(x + 3, y + 3, w, h);
      g.fillStyle(PATINA, 0.35); g.fillRect(x + 3, y + 3, w, 4); g.fillRect(x + 3, y + 3, 4, h);
      for (let k = 0; k < 4; k++) { g.fillStyle(PATINA, 0.25 + rng() * 0.3); g.fillCircle(x + 3 + rng() * w, y + 3 + rng() * h, 2 + rng() * 5); }
      g.fillStyle(COPPER_LIT, 0.2); g.fillRect(x + 8, y + 8, w * 0.5, 2);
    }
  }
  // Boot-scuffs worn into a path from the door to the stair.
  for (let i = 0; i < 70; i++) {
    g.fillStyle(COPPER_LIT, 0.08); g.fillEllipse(MID - 70 + rng() * 140, r.y + rng() * r.h, 10, 16);
  }
}

/** Glass tiles over copper bus-strips, for the Capacitor Banks — the strips glow faintly beneath. */
function glassTiles(g: G, r: Rect, rng: () => number): void {
  const S = 48;
  g.fillStyle(0x0c1822, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let x = r.x + 24; x < r.x + r.w; x += S * 2) { g.fillStyle(COPPER, 0.22); g.fillRect(x - 3, r.y, 6, r.h); }
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      g.fillStyle(rng() < 0.5 ? 0x16303e : 0x12283a, 0.85); g.fillRect(x + 1, y + 1, S - 2, Math.min(S - 2, r.y + r.h - y - 1));
      g.fillStyle(GLASS, 0.06); g.fillRect(x + 3, y + 3, S - 6, 3);
      if (rng() < 0.06) { g.lineStyle(1, GLASS, 0.3); g.lineBetween(x + rng() * S, y + rng() * S, x + rng() * S, y + rng() * S); }
    }
  }
}

/** Steel grating with the cage cells ruled in copper rails, for the Faraday Cages. */
function grating(g: G, r: Rect): void {
  g.fillStyle(0x0e1014, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(2, 0x2e3440, 1);
  for (let x = r.x; x < r.x + r.w; x += 12) g.lineBetween(x, r.y, x, r.y + r.h);
  g.lineStyle(1, 0x222730, 1);
  for (let y = r.y; y < r.y + r.h; y += 40) g.lineBetween(r.x, y, r.x + r.w, y);
}

/** The Coil's windings — the tower's walls — painted down both sides of the area. */
function windings(g: G, x0: number, x1: number, rng: () => number): void {
  g.fillStyle(0x0a0806, 1); g.fillRect(x0, 0, x1 - x0, H);
  const T = 30;
  for (let y = 0; y < H; y += T) {
    const c = rng() < 0.15 ? dim(COPPER, 0.45) : dim(COPPER, 0.15 + rng() * 0.1);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(x0, y, x1 - x0, T - 2);
    g.fillStyle(c, 1); g.fillRect(x0, y + 3, x1 - x0, T - 10);
    g.fillStyle(COPPER_LIT, 0.45); g.fillRect(x0, y + 5, x1 - x0, 3);
    if (rng() < 0.35) { g.fillStyle(PATINA, 0.5); g.fillEllipse(x0 + rng() * (x1 - x0), y + T - 6, 20 + rng() * 40, 5); }
  }
  // Porcelain spacers lashed between the turns at intervals.
  for (let y = 80; y < H; y += 210) {
    const xx = (x0 + x1) / 2 + (rng() - 0.5) * 60;
    g.fillStyle(PORCELAIN, 0.9); g.fillRoundedRect(xx - 10, y - 30, 20, 60, 6);
    g.fillStyle(0x8a8676, 1); for (let k = 0; k < 4; k++) g.fillRect(xx - 10, y - 22 + k * 14, 20, 2);
  }
  // The gaps in the windings where the storm looks in.
  for (const y of STORM_SLITS) {
    g.fillStyle(STORM, 1); g.fillRect(x0 + 20, y - 10, x1 - x0 - 40, 20);
    g.fillStyle(0x1a2440, 1); g.fillRect(x0 + 20, y - 4, x1 - x0 - 40, 3);
  }
}
const STORM_SLITS = [2420, 2000, 1500, 1150, 700, 200];

/** An iron bulkhead between halls: riveted plates, a copper cable along the top. */
function bulkhead(g: G, y: number): void {
  for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x0, y, x1 - x0, WALL_T);
    g.fillStyle(IRON, 1); g.fillRect(x0, y + 4, x1 - x0, WALL_T - 10);
    g.fillStyle(IRON_LIT, 1); g.fillRect(x0, y + 4, x1 - x0, 3);
    for (let x = x0 + 12; x < x1; x += 26) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x, y + 12, 2); g.fillCircle(x, y + WALL_T - 10, 2); }
    g.lineStyle(5, COPPER_DARK, 1); g.lineBetween(x0, y + WALL_T - 2, x1, y + WALL_T - 2);
    g.lineStyle(2, COPPER, 1); g.lineBetween(x0, y + WALL_T - 3, x1, y + WALL_T - 3);
  }
  // Door jambs with warning stripes.
  for (const x of [DOOR_L - 14, DOOR_R]) {
    g.fillStyle(0x1a1a1a, 1); g.fillRect(x, y - 6, 14, WALL_T + 12);
    for (let k = 0; k < 6; k++) { g.fillStyle(AMBER, 0.85); g.fillTriangle(x, y - 6 + k * 9, x + 14, y - 6 + k * 9 - 6, x + 14, y - 6 + k * 9); }
  }
}

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(STORM, 1); g.fillRect(0, 0, W, H);
  windings(g, 0, L, rng);
  windings(g, R, W, rng);
  // Earthing Floor.
  earthPlates(g, { x: L, y: 2290, w: R - L, h: H - 36 - 2290 }, rng);
  // Hall I: iron decking; the belts and wheel rows are drawn over it.
  deck(g, { x: L, y: 1730, w: R - L, h: 2250 - 1730 }, rng);
  // Walkways either side of each belt, painted yellow at their edges.
  for (const b of [BELT_1, BELT_2]) {
    g.fillStyle(AMBER, 0.55); g.fillRect(L, b.y - 6, R - L, 3); g.fillRect(L, b.y + b.h + 3, R - L, 3);
    // Rollers at each end of the belt.
    for (const yy of [b.y + 4, b.y + b.h - 4]) { g.fillStyle(IRON_LIT, 1); g.fillRect(L, yy - 3, R - L, 6); }
    // Arrows stencilled on the walkway: the way the belt runs.
    for (let x = L + 70; x < R; x += 160) {
      g.fillStyle(AMBER, 0.35);
      g.fillTriangle(x - 10, b.y - 26, x + 10, b.y - 26, x, b.y - 14);
    }
  }
  // Hall II.
  glassTiles(g, { x: L, y: 1050, w: R - L, h: 1690 - 1050 }, rng);
  // Copper earthing traces from each jar's foot, west half to the west switch, east half to the east.
  for (const y of JAR_ROWS) {
    for (const x of JAR_COLS) {
      const tx = x < MID ? LEVER_W.x : LEVER_E.x;
      g.lineStyle(4, COPPER_DARK, 0.6); g.lineBetween(x, y + JAR_R, x, LEVER_W.y + 20); g.lineBetween(x, LEVER_W.y + 20, tx, LEVER_W.y + 20);
      g.lineStyle(1.5, COPPER, 0.5); g.lineBetween(x, y + JAR_R, x, LEVER_W.y + 20); g.lineBetween(x, LEVER_W.y + 20, tx, LEVER_W.y + 20);
    }
  }
  busbar(g, BUSBAR.x, BUSBAR.y + BUSBAR.h / 2, BUSBAR.x + BUSBAR.w, 30);
  ohmSigil(g, MID, 1135, 60, BRASS_DARK, 0.6);
  // Hall III.
  grating(g, { x: L, y: 370, w: R - L, h: 1010 - 370 });
  for (const cl of CELLS) {
    g.lineStyle(4, COPPER_DARK, 0.9); g.strokeRect(cl.x0, cl.y0, CELL_W, CELL_H);
    g.lineStyle(1.5, COPPER, 0.8); g.strokeRect(cl.x0 + 2, cl.y0 + 2, CELL_W - 4, CELL_H - 4);
    // A worn patch in the middle of each cell where people have waited it out.
    g.fillStyle(0x3a4250, 0.35); g.fillEllipse(cl.cx, cl.cy, 60, 40);
    g.fillStyle(((cl.c + cl.r) % 2 === 0 ? VIOLET : ARC), 0.1); g.fillRect(cl.x0 + 8, cl.y0 + 8, 14, 14);
  }
  // The Terminal: a ring dais of copper round the Empress's seat, open to the sky.
  g.fillStyle(0x10141e, 1); g.fillRect(L, 40, R - L, 290);
  for (let i = 0; i < 6; i++) {
    g.lineStyle(14 - i * 1.6, i % 2 ? COPPER_DARK : COPPER, 0.9); g.strokeEllipse(MID, 200, 620 - i * 90, 220 - i * 30);
  }
  g.fillStyle(0x06080e, 1); g.fillEllipse(MID, 200, 120, 42);
  ohmSigil(g, MID, 200, 36, COPPER_LIT, 0.8);
  // Bulkheads last, so they sit over every floor.
  for (const y of CROSS_WALLS) bulkhead(g, y);
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

/** The Meter Wall: a brass board of every household's meter, a chalk tally under each. */
pieces.push({
  x: METER_WALL.x + METER_WALL.w / 2, y: METER_WALL.y + METER_WALL.h, w: METER_WALL.w + 20, h: 220,
  draw: (g, rng) => {
    const x0 = METER_WALL.x, y0 = METER_WALL.y + METER_WALL.h;
    shadow(g, x0 + METER_WALL.w / 2, y0, METER_WALL.w, 18, 0.4);
    g.fillStyle(0x2a1a10, 1); g.fillRect(x0, y0 - 200, METER_WALL.w, 200);
    g.fillStyle(0x4a2e1a, 1); g.fillRect(x0 + 6, y0 - 194, METER_WALL.w - 12, 188);
    g.lineStyle(3, BRASS, 1); g.strokeRect(x0 + 4, y0 - 196, METER_WALL.w - 8, 192);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        const mx = x0 + 26 + c * 46, my = y0 - 170 + r * 44;
        meterDial(g, mx, my, 13, rng());
        // Chalk tally marks under the meter: switched off once, twice, three times.
        const n = Math.floor(rng() * 4);
        g.lineStyle(1.2, 0xe8e4d8, 0.8);
        for (let k = 0; k < n; k++) g.lineBetween(mx - 8 + k * 5, my + 16, mx - 8 + k * 5, my + 22);
        if (n === 3) { g.lineBetween(mx - 10, my + 21, mx + 6, my + 17); g.fillStyle(WARN_RED, 0.8); g.fillCircle(mx + 11, my - 10, 2.5); }
      }
    }
    g.fillStyle(BRASS, 1); g.fillRect(x0 + METER_WALL.w / 2 - 70, y0 - 214, 140, 18);
    g.fillStyle(0x2a1a10, 1);
    for (let i = 0; i < 12; i++) g.fillRect(x0 + METER_WALL.w / 2 - 62 + i * 11, y0 - 210, 7, 10);
  },
});

/** The earthing bank: copper rods driven through the floor, a bundle of cables plunged in. */
pieces.push({
  x: EARTH_BANK.x + EARTH_BANK.w / 2, y: EARTH_BANK.y + EARTH_BANK.h, w: EARTH_BANK.w + 30, h: 170,
  draw: (g) => {
    const x0 = EARTH_BANK.x, y0 = EARTH_BANK.y + EARTH_BANK.h;
    shadow(g, x0 + EARTH_BANK.w / 2, y0, EARTH_BANK.w, 16, 0.4);
    g.fillStyle(PATINA_DARK, 1); g.fillRect(x0, y0 - 18, EARTH_BANK.w, 18);
    g.fillStyle(PATINA, 1); g.fillRect(x0, y0 - 20, EARTH_BANK.w, 4);
    for (let i = 0; i < 9; i++) {
      const x = x0 + 14 + i * 24;
      const h = 110 + (i % 3) * 22;
      g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 4, y0 - 18 - h, 8, h);
      g.fillStyle(COPPER, 1); g.fillRect(x - 3, y0 - 18 - h, 4, h);
      g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, y0 - 18 - h, 5);
      // Cables looping from rod to rod.
      if (i > 0) {
        g.lineStyle(3, 0x1a1a1a, 1);
        g.beginPath(); g.moveTo(x - 24, y0 - 70); g.lineTo(x - 12, y0 - 50); g.lineTo(x, y0 - 70); g.strokePath();
      }
    }
    insulator(g, x0 + EARTH_BANK.w + 10, y0, 1.1);
  },
});

/** Treadwheel housings: iron decks with a copper rail, the wheels themselves turn in animateOver. */
interface Wheel { x: number; y: number; r: number; skin: number; speed: number }
const WHEELS: Wheel[] = [];
const SKINS = [0xd8b898, 0xb08a68, 0xc8a080, 0x8a6448, 0xe0c0a0, 0x9a7458];
for (const row of [ROW_1, ROW_2]) {
  for (const h of row) {
    const r = h.h > 70 ? 40 : 30;
    pieces.push({
      x: h.x + h.w / 2, y: h.y + h.h, w: h.w + 10, h: h.h + 20,
      draw: (g) => {
        g.fillStyle(IRON_DARK, 1); g.fillRect(h.x, h.y, h.w, h.h);
        g.fillStyle(IRON, 1); g.fillRect(h.x + 3, h.y + 3, h.w - 6, h.h - 10);
        g.fillStyle(0x000000, 0.35); g.fillRect(h.x, h.y + h.h - 8, h.w, 8);
        g.lineStyle(3, COPPER, 1); g.lineBetween(h.x, h.y + 6, h.x + h.w, h.y + 6);
        for (let x = h.x + 10; x < h.x + h.w; x += 24) { g.fillStyle(IRON_LIT, 1); g.fillRect(x, h.y + 10, 3, h.h - 20); }
      },
    });
    if (h.w < 120) continue;
    for (let x = h.x + 64; x < h.x + h.w - 40; x += 118) {
      WHEELS.push({ x, y: h.y + h.h - 6, r, skin: SKINS[(WHEELS.length * 7) % SKINS.length], speed: 1.4 + ((WHEELS.length * 13) % 7) * 0.12 });
    }
  }
}

/** The Leyden jars, each on its earthing plinth. Their charge is drawn live in animateOver. */
for (const y of JAR_ROWS) {
  for (const x of JAR_COLS) {
    pieces.push({ x, y: y + 30, w: 90, h: 200, draw: (g) => leydenJar(g, x, y + 30, 0.78, 0, 0) });
  }
}

/** The earthing switches' slate boards on the walls behind each lever. */
for (const [lv, flip] of [[LEVER_W, 1], [LEVER_E, -1]] as [Pt, number][]) {
  const bx = lv.x - flip * 28;
  pieces.push({
    x: bx, y: lv.y - 10, w: 60, h: 110,
    draw: (g) => {
      g.fillStyle(0x1a1c20, 1); g.fillRect(bx - 22, lv.y - 100, 44, 80);
      g.lineStyle(2, BRASS, 1); g.strokeRect(bx - 22, lv.y - 100, 44, 80);
      g.fillStyle(PORCELAIN, 1); g.fillRect(bx - 14, lv.y - 88, 28, 10); g.fillRect(bx - 14, lv.y - 46, 28, 10);
      g.fillStyle(COPPER, 1); g.fillRect(bx - 3, lv.y - 82, 6, 34);
      g.fillStyle(0x1a1a1a, 1); g.fillRect(bx - 8, lv.y - 98, 16, 8);
      // "EARTH" in raised letters: three bars and a ground symbol.
      g.lineStyle(2, AMBER, 1);
      g.lineBetween(bx - 12, lv.y - 30, bx + 12, lv.y - 30); g.lineBetween(bx - 8, lv.y - 26, bx + 8, lv.y - 26); g.lineBetween(bx - 4, lv.y - 22, bx + 4, lv.y - 22);
      g.lineBetween(bx, lv.y - 38, bx, lv.y - 30);
    },
  });
}

/** The Terminal's two Tesla columns: coil towers with a toroid crown each. */
for (const r of [TESLA_W, TESLA_E]) {
  const cx = r.x + r.w / 2, base = r.y + r.h;
  pieces.push({
    x: cx, y: base, w: r.w + 40, h: 330,
    draw: (g) => {
      shadow(g, cx, base, r.w, 26, 0.45);
      g.fillStyle(IRON_DARK, 1); g.fillRect(r.x + 10, base - 40, r.w - 20, 40);
      g.fillStyle(IRON, 1); g.fillRect(r.x + 14, base - 38, r.w - 28, 30);
      // The secondary winding: a tall cylinder of fine copper turns.
      const cw = 70, top = base - 250;
      g.fillStyle(0x2a1a0e, 1); g.fillRect(cx - cw / 2, top, cw, 210);
      for (let y = top; y < base - 40; y += 4) { g.fillStyle(y % 8 === 0 ? COPPER : dim(COPPER, 0.25), 1); g.fillRect(cx - cw / 2, y, cw, 2.5); }
      g.fillStyle(COPPER_LIT, 0.35); g.fillRect(cx - cw / 2 + 8, top, 6, 210);
      // Primary: three fat turns round the base.
      for (let k = 0; k < 3; k++) coilTurn(g, cx, base - 60 - k * 12, 62, 14, 6, true);
      // The toroid.
      g.fillStyle(0x6a6e78, 1); g.fillEllipse(cx, top - 14, 150, 42);
      g.fillStyle(0xa8acb8, 1); g.fillEllipse(cx, top - 18, 146, 34);
      g.fillStyle(0xe0e4ec, 0.6); g.fillEllipse(cx - 30, top - 26, 50, 8);
      g.fillStyle(0x3a3e48, 1); g.fillEllipse(cx, top - 18, 60, 12);
    },
  });
}

/** Her throne: a seat inside the Coil's last ring, a meter in its back as tall as a door. */
pieces.push({
  x: MID, y: 150, w: 260, h: 120,
  draw: (g) => {
    shadow(g, MID, 150, 200, 22, 0.5);
    g.fillStyle(IRON_DARK, 1); g.fillRect(MID - 90, 128, 180, 22);
    g.fillStyle(COPPER_DARK, 1); g.fillRect(MID - 60, 70, 120, 64);
    g.fillStyle(COPPER, 1); g.fillRect(MID - 56, 74, 112, 56);
    meterDial(g, MID, 92, 28, 0.95);
    for (const sx of [-1, 1]) { insulator(g, MID + sx * 80, 128, 1); }
  },
});

// ── Animation ────────────────────────────────────────────────────────

function animateUnder(g: G, t: number, view: Rect): void {
  // The earthed walking the down-belts, treading in place as the belt carries the floor away.
  for (const b of [BELT_1, BELT_2]) {
    if (!near(view, MID, b.y, 700)) continue;
    for (let i = 0; i < 6; i++) {
      const x = L + 110 + i * 230 + (b === BELT_2 ? 100 : 0);
      if (x > R - 40) continue;
      earthedFigure(g, x, b.y + b.h - 26, 0.9, SKINS[i % SKINS.length], t, false);
    }
    // Belt slats sliding south.
    g.lineStyle(1, 0x5a5a64, 0.25);
    for (let k = 0; k < 4; k++) {
      const y = b.y + ((t * BELT_V + k * 22) % b.h);
      g.lineBetween(L, y, R, y);
    }
  }
  // The busbar crackles until both banks are earthed.
  if (near(view, MID, BUSBAR.y, 800) && !safeFlag(EARTHED)) {
    for (let i = 0; i < 7; i++) {
      const x = L + ((t * 220 + i * 197) % (R - L));
      crackle(g, x, BUSBAR.y + BUSBAR.h / 2, 18, Math.floor(t * 16) + i, ARC, 0.8);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Hall I: the treadwheels turning, their walkers cranking.
  for (const w of WHEELS) {
    if (!near(view, w.x, w.y, 120)) continue;
    treadwheel(g, w.x, w.y, w.r, t * w.speed, w.skin, t);
  }
  // Belt-sparks: the overseers' prods crackling as their beat comes round.
  if (near(view, MID, BELT_1.y, 700)) {
    for (let i = 0; i < CHEQ_N; i++) {
      const ph = jetPhase(t, CHEQ_PERIOD, cheqOff(i));
      if (ph >= CHEQ_ON) continue;
      const x0 = L + i * CHEQ_W;
      for (let k = 0; k < 3; k++) bolt(g, x0 + 10, BELT_1.y + 20 + k * 25, x0 + CHEQ_W - 10, BELT_1.y + 20 + k * 25, Math.floor(t * 20) + i * 5 + k, ARC, 2, 0.9, 0.2, 1);
    }
    THIRDS.forEach(([a, b], i) => {
      const ph = jetPhase(t, THIRD_PERIOD, thirdOff(i));
      if (ph >= THIRD_ON) return;
      for (let k = 0; k < 4; k++) {
        const x = a + ((k + 0.5) / 4) * (b - a);
        bolt(g, x, BELT_2.y - 8, x + (k % 2 ? 30 : -30), BELT_2.y + BELT_2.h, Math.floor(t * 18) + k + i * 9, AMBER, 2.2, 0.9, 0.22, 1);
      }
    });
  }
  // Hall II: each jar's charge climbing toward its discharge; the arc itself when it goes.
  if (near(view, MID, 1460, 700)) {
    for (const s of ARCS) {
      const ph = jetPhase(t, ARC_PERIOD, s.off);
      if (ph < ARC_ON) {
        const y = s.rect.y + ARC_H / 2;
        bolt(g, s.rect.x, y, s.rect.x + s.rect.w, y, Math.floor(t * 22) + s.i * 3 + s.row * 11, ARC, 3, 1, 0.22, 2);
        bolt(g, s.a.x, s.a.y, s.b.x, s.b.y, Math.floor(t * 22) + s.i + s.row * 7 + 50, ARC, 2, 0.6, 0.25, 1);
      } else {
        // The pair's charge glows up in the last beat before it fires.
        const k = Math.max(0, (ph - (ARC_PERIOD - 900)) / 900);
        if (k > 0) {
          for (const p of [s.a, s.b]) {
            if (p.x <= L || p.x >= R) continue;
            glow(g, p.x, p.y + 10, 18 + k * 30, ARC, 0.05 + k * 0.08, 3);
            if (k > 0.6) crackle(g, p.x, p.y - 4, 10 + k * 10, Math.floor(t * 20) + p.x, ARC, k);
          }
        }
      }
    }
  }
  // Hall III: the cages, hauled up and dropping on their chains.
  if (near(view, MID, 700, 700)) {
    for (const cl of CELLS) {
      if (!near(view, cl.cx, cl.cy, 200)) continue;
      const ph = jetPhase(t, CAGE_PERIOD, cl.off);
      let lift: number;
      if (ph < CAGE_ON) lift = 0;
      else if (ph < CAGE_ON + 400) lift = (ph - CAGE_ON) / 400;
      else if (ph > CAGE_PERIOD - 600) lift = (CAGE_PERIOD - ph) / 600;
      else lift = 1;
      const live = ph < CAGE_ON ? 1 : 0;
      faradayCage(g, cl.cx, cl.cy + CELL_H / 2 - 6, CELL_W - 10, CELL_H - 14, lift, live, t, cl.c * 3 + cl.r);
    }
  }
  // The Terminal: the storm overhead, striking down into the Tesla columns and the crown.
  if (near(view, MID, 160, 600)) {
    for (let i = 0; i < 3; i++) {
      const x = L + 200 + i * 350 + Math.sin(t * 0.3 + i) * 40;
      g.fillStyle(0x1a2238, 0.18); g.fillEllipse(x, 50, 380, 60);
    }
    const beat = Math.floor(t * 0.8);
    const ph = t * 0.8 - beat;
    if (ph < 0.12) {
      const targets = [{ x: TESLA_W.x + TESLA_W.w / 2, y: 70 }, { x: TESLA_E.x + TESLA_E.w / 2, y: 70 }, { x: MID, y: 60 }];
      const tg = targets[beat % 3];
      bolt(g, tg.x + Math.sin(beat) * 120, 0, tg.x, tg.y, beat, ARC, 4, 1 - ph / 0.12, 0.25, 3);
      glow(g, tg.x, tg.y, 90, ARC, 0.05, 3);
    }
    for (const r of [TESLA_W, TESLA_E]) {
      const cx = r.x + r.w / 2;
      for (let k = 0; k < 2; k++) {
        const a = t * 2 + k * 3 + r.x;
        bolt(g, cx + Math.cos(a) * 60, 78 + Math.sin(a) * 10, cx + Math.cos(a) * 110, 40 + Math.sin(a * 1.3) * 40, Math.floor(t * 15) + k + r.x, VIOLET, 1.6, 0.7, 0.3, 0);
      }
    }
  }
  // Storm-light through the slits in the windings: the whole wall lights up on a strike.
  for (const y of STORM_SLITS) {
    if (!near(view, MID, y, 500)) continue;
    const f = (t * 0.37 + y * 0.0013) % 1;
    if (f < 0.04) {
      const a = 1 - f / 0.04;
      for (const x of [L / 2, R + (W - R) / 2]) { g.fillStyle(ARC_CORE, 0.5 * a); g.fillRect(x - 100, y - 10, 200, 20); glow(g, x, y, 160, ARC, 0.04 * a, 3); }
    }
  }
  // Static motes drifting up the tower like sparks off a brush.
  motes(g, view, t, 16, ARC, -18, 20, 1.2, 41);
  motes(g, view, t * 0.7, 6, AMBER, -10, 30, 1.6, 9);
}

// ── People: the earthed ──────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'crowncoil-brankwell', name: 'Hester Brankwell', title: 'Earthed this week',
    look: { body: 0x6a6a74, accent: 0x3a3a44, hat: 'none', traits: ['apron'], size: 0.95, eye: 0xc8d8f0 },
    at: { x: 560, y: 2420 },
    talks: [
      {
        when: { monarch: 'ohmrine' },
        lines: [
          'The lights went out. All of them. The whole tower, at once, and nobody switched off — everybody.',
          'And then somebody laughed in the dark, and then everybody laughed. Have you ever heard a tower laugh?',
          'I am going home. I am going to sit in my own kitchen with the door unlocked and not crank anything.',
          'I might light a candle. Just to see what it is like to steal from nobody.',
        ],
      },
      {
        when: { encounter: 'crowncoil-warden-1' },
        lines: [
          'The belts stopped! For a whole minute the belts stopped, and nobody knew what to do with their feet.',
          'Above the galleries are the Banks. My cousin polishes the jars. If you see a man with a rag, that is Corwin.',
        ],
      },
      {
        lines: [
          'Third time switched off, so here I am. Earthed. They put the collar on at the door. It hums.',
          'Two short, then a short-and-a-half, then the baby was ill and I could not crank for holding her.',
          'You are not wearing a collar. Did you come up the Coil on purpose? Nobody comes up on purpose.',
          'The Galleries are first. The belts run backwards, down toward the wheels. You walk up a floor that runs away.',
          'The overseers spark the belts on the beat. Halves, then thirds. Cross when the sparks have just gone.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'ohmrine' }, lines: ['A candle. Just one.', 'My door. My lock. My key.'] },
      { lines: ['...it hums...', '...two short, then a half...', '...is that the Bell?'] },
    ],
  },
  {
    id: 'crowncoil-ladd', name: 'Old Tamsin Ladd', title: 'Cranker of the third wheel, forty years',
    look: { body: 0x5a5a66, accent: 0x2a2a34, hat: 'cap', traits: ['beard', 'cane'], size: 0.9, eye: 0xd8e0f0 },
    at: { x: 330, y: 2228 },
    talks: [
      {
        when: { monarch: 'ohmrine' },
        lines: [
          'Forty years on the wheel. My legs do not know how to stand still. Look at them. Still going.',
          'They tell me the Grid is cut. I keep listening for the Bell. It does not come. It will not come.',
          'I think I shall walk somewhere. Somewhere flat. Somewhere that stays where you put your foot.',
        ],
      },
      {
        when: { encounter: 'crowncoil-warden-1' },
        lines: [
          'Crankshaw down! Crankshaw, who counted every turn of every wheel, and docked us the half-turns.',
          'Hah. I counted the half-turns too. Forty years of them. She owes me a year of half-turns.',
        ],
      },
      {
        lines: [
          'Mind the belt, young one. It does not care where you are going. It only goes down.',
          'The first belt sparks in halves — this half, that half, this half. Go up the half that just went.',
          'The second goes in thirds, west to east and round. The middle way up is through the wheels.',
          'Then along the walkway to a side aisle. Run it, if your legs are better than mine. Everyone\'s are.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'ohmrine' }, lines: ['Still going. Look at them go.', 'Flat ground. That is all I want.'] },
      { lines: ['...four thousand and one...', '...half a turn short...', '...mind the belt...'] },
    ],
  },
  {
    id: 'crowncoil-pell', name: 'Corwin Pell', title: 'Jar-polisher of the Capacitor Banks',
    look: { body: 0x7a7a84, accent: 0x4a4a54, hat: 'hazmat', traits: ['glasses', 'tool'], size: 1.05, eye: 0xa8e0ff },
    at: { x: 1490, y: 1655 },
    talks: [
      {
        when: { monarch: 'ohmrine' },
        lines: [
          'The jars are empty. Every one. I polished them anyway this morning. Habit. They looked very fine.',
          'Somebody wants to make them a greenhouse. Leyden-jar tomatoes. I think that is the best idea I ever heard.',
        ],
      },
      {
        when: { encounter: 'crowncoil-warden-2' },
        lines: [
          'You put the Capacitrix down. She never let a jar discharge into anyone she liked. She did not like anyone.',
          'The Cages are next. Do not run between them — get in one. In a cage the lightning goes round you.',
        ],
      },
      {
        when: { all: [{ flag: EARTH_W }, { flag: EARTH_E }] },
        lines: [
          'Both banks earthed! The busbar has gone dead as a doornail. Go on, it will not bite now.',
          'I will say I did it. They will believe me. I always look guilty.',
        ],
      },
      {
        lines: [
          'Careful with the jars. They charge up in pairs and the arc jumps between them. You will see them glow first.',
          'The busbar at the top of the hall is live. Nobody crosses it — not until both banks are earthed.',
          'There is a switch at the far west end, between the rows, and one at the far east. Throw both.',
          'I would do it myself, but the collar would tell her. It tells her everything. It hums when I think.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'ohmrine' }, lines: ['Tomatoes. In the jars.', 'Shine, shine, for nobody.'] },
      { lines: ['...pairs, always pairs...', '...mind the glow...', '...polish, polish...'] },
    ],
  },
  {
    id: 'crowncoil-wick', name: 'Ivo Wick', title: 'Lamplighter, earthed first',
    look: { body: 0x4a4038, accent: 0x2a221c, hat: 'tophat', traits: ['scarf', 'lantern'], size: 1.0, eye: 0xffd28a },
    at: { x: 330, y: 975 },
    talks: [
      {
        when: { monarch: 'ohmrine' },
        lines: [
          'Is it true? Wren is lighting the lamps? By hand? Every street on the isle?',
          'She never could keep a pole straight. Tell her old Ivo says hold it straighter. Tell her... well done.',
          'Twelve years in a cage and I can still smell lamp oil. I think that is what kept me sane.',
        ],
      },
      {
        when: { encounter: 'crowncoil-warden-3' },
        lines: [
          'Mesh is down? Then the cages will stay up. Twelve years, and they will stay up.',
          'She is at the top. She sits in the last ring with the storm on her lap. Do not let it go dark on you.',
          'When the lights go out she is only her own crackle. So are you. Watch for the crackle.',
        ],
      },
      {
        lines: [
          'We were the first ones earthed, the lamplighters. Every one of us but Wren. Wren ran faster than the wire.',
          'Twelve years they have kept me in a cage. Do you know the joke? A cage is the safest place in the tower.',
          'The cages drop in a chequer, on the beat. When one is down its bars bite — but inside, you are untouchable.',
          'Hop cell to cell. Wait inside. Cross the bars only when both cages either side are hauled up.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'ohmrine' }, lines: ['Hold it straighter, Wren.', 'Lamp oil. I can smell it.'] },
      { lines: ['...safest place in the tower...', '...Wren ran faster...', '...on the beat, on the beat...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2530 }, to: 'superposition', arrive: { x: 1200, y: 260 },
    label: 'The Coil Door — down to the Superposition Court',
  },
  { kind: 'waystone', at: { x: 720, y: 2450 } },
  { kind: 'lever', at: LEVER_W, flag: EARTH_W, label: 'Earthing Switch — West Bank' },
  { kind: 'lever', at: LEVER_E, flag: EARTH_E, label: 'Earthing Switch — East Bank' },
  { kind: 'encounter', id: 'crowncoil-warden-1' },
  { kind: 'encounter', id: 'crowncoil-warden-2' },
  { kind: 'encounter', id: 'crowncoil-warden-3' },
  { kind: 'monarch', id: 'ohmrine', at: { x: MID, y: 215 } },
  { kind: 'sign', at: { x: 1100, y: 2460 }, text: 'THE CROWN COIL. Earthed households report to the Galleries. The Grid will say when the debt is paid.' },
  { kind: 'sign', at: { x: 1080, y: 2228 }, text: 'TREADMILL GALLERIES. Belts run DOWN. Overseers spark the belts on the beat. Keep walking.' },
  { kind: 'sign', at: { x: 1080, y: 1655 }, text: 'CAPACITOR BANKS. Jars discharge in pairs. The busbar is live until both banks are earthed.' },
  { kind: 'sign', at: { x: 1080, y: 975 }, text: 'FARADAY CAGES. Bars live when lowered. The current goes round, not through. Wait inside.' },
  { kind: 'chest', id: 'crowncoil-chest-gallery', at: { x: 1500, y: 1760 }, item: 'charm-crowncoil-crank', coins: 160 },
  { kind: 'chest', id: 'crowncoil-chest-banks', at: { x: 1470, y: 1110 }, item: 'charm-crowncoil-leyden', orbs: 3 },
  { kind: 'chest', id: 'crowncoil-chest-cages', at: { x: 330, y: 415 }, coins: 320, orbs: 4 },
  { kind: 'chest', id: 'crowncoil-chest-terminal', at: { x: 640, y: 270 }, coins: 560, orbs: 8, open: { monarch: 'ohmrine' } },
];

const CHECKPOINTS: Pt[] = [
  { x: MID, y: 2440 },          // the Earthing Floor
  { x: MID, y: 2228 },          // the gallery door
  { x: MID, y: 2046 },          // the central aisle through the first wheels
  { x: 380, y: 1989 },          // the walkway, west
  { x: 1420, y: 1989 },         // the walkway, east
  { x: 380, y: 1818 },          // the west aisle through the second wheels
  { x: 1420, y: 1818 },         // the east aisle
  { x: MID, y: 1760 },          // Crankshaw's landing
  { x: MID, y: 1655 },          // the banks' landing
  { x: 676, y: 1400 },          // between the jar rows, west of centre
  { x: 1124, y: 1400 },         // between the jar rows, east of centre
  LEVER_W, LEVER_E,
  { x: MID, y: 1292 },          // under the busbar
  { x: MID, y: 1150 },          // Mirrow's floor
  { x: MID, y: 975 },           // the cages' landing
  ...CELLS.map((c) => ({ x: c.cx, y: c.cy })),   // every cell is a refuge
  { x: MID, y: 415 },           // Mesh's landing
  { x: MID, y: 300 },           // the Terminal
];

export const CROWNCOIL_AREA: AreaDef = {
  id: 'crowncoil',
  isle: 'electricity',
  name: 'The Crown Coil',
  subtitle: 'Empress Ohmrine\'s tower of copper rings, which drinks the storm and the isle with it',
  w: W,
  h: H,
  bg: STORM,
  accent: COPPER,
  weather: 'static',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.3,
  hazards,
  gates,
  checkpoints: CHECKPOINTS,
};
