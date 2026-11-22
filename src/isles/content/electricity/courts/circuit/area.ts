import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, rock, type G } from '../../../../art/IsleArt';
import {
  bolt, busStreet, cableDrum, capacitorTower, coreStore, crankHouse, diePalace, diodeLamp, drawBoard, droppedCard, etchery,
  gateLodge, oscillatorStone, pad, pulseBead, punchMill, pylon, pylonTops, resistorHouse, segText, silkArrow, silkMark,
  sump, tabulator, traceStreet, via, windery,
} from './art';
import {
  BAND_COLORS, BOLT, CIRCUIT_COLOR, COPPER, COPPER_DARK, DIODE, FAULT, FILAMENT, GOLD, GOLD_DARK, GOLD_LIT,
  MASK, MASK_DARK, MASK_DEEP, MASK_LIT, NIXIE, OIL_SHEEN, PULSE, SOLDER, SOLDER_DARK, SOLDER_LIT,
} from './palette';
import { CIRCUIT_CROWD, CIRCUIT_NPCS } from './npcs';

/**
 * The Circuit Court — a town laid out like a circuit board, west of the Dynamo.
 *
 * Read it from the Dynamo road in:
 * • **the bus** (east): the high street is a data bus, six copper traces side by side, coming in
 *   off the Dynamo road past the waystone (a crystal oscillator on a plinth), Etcher Solde's acid
 *   trays to the south and Pennywhistle's components shop and Gearlock's windery to the north;
 * • **the Junction** (centre): a great tinned pad where the streets meet, with the Draw board and
 *   its Brownout Bell, and Gatekeeper Nand's lodge built in the shape of an AND gate;
 * • **the Tabulator** (north): the valve computer the size of a chapel that reckons every Draw, up
 *   a short trace from the Junction;
 * • **the Die** (north-west): Prince Byte's palace, a black chip on a socket of gold pins;
 * • **the west street**: out past the valve-mender's to the Core Store, Archivist Rom's house of
 *   ferrite memory at the board's west end;
 * • **the mills** (south-west): two punch-card mills on the mill street, crank-houses below them;
 * • **the Rail** (south): the trace down to the board's edge connector and the road to Bounce;
 * • **the sump** (south-east): the black Coolant Sump where the Tabulator's oil drains.
 *
 * Pylons carry the Grid overhead from end to end, and the storm never stops.
 */

export const CIRCUIT_W = 2400;
export const CIRCUIT_H = 1600;

const JUNCTION: Pt = { x: 1200, y: 800 };
const JUNCTION_R = 150;
const BUS_Y = 800;
/** Base lines of the great buildings. */
export const TABULATOR: Pt = { x: 1200, y: 480 };
export const DIE: Pt = { x: 520, y: 470 };
const DIE_W = 380;
const DIE_H = 280;
/** The Coolant Sump — the court's fishing water. */
export const SUMP: Rect = { x: 1640, y: 1150, w: 400, h: 170 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid | Solid[]): void {
  pieces.push({ x, y, w, h, draw });
  if (Array.isArray(solid)) solids.push(...solid);
  else if (solid) solids.push(solid);
}

// ── Streets (polylines used by the ground painter and the running pulses) ─

const STREETS: { pts: Pt[]; w: number }[] = [
  // The west street, Junction to the Core Store.
  { pts: [{ x: JUNCTION.x - JUNCTION_R + 10, y: BUS_Y }, { x: 140, y: BUS_Y }], w: 64 },
  // North trace to the Tabulator steps.
  { pts: [{ x: 1200, y: JUNCTION.y - JUNCTION_R + 10 }, { x: 1200, y: 500 }], w: 70 },
  // The Rail south to the board edge.
  { pts: [{ x: 1200, y: JUNCTION.y + JUNCTION_R - 10 }, { x: 1200, y: CIRCUIT_H }], w: 76 },
  // Up to the Die, off the west street.
  { pts: [{ x: 520, y: BUS_Y }, { x: 520, y: 490 }], w: 56 },
  // The mill street, chamfered off the Rail.
  { pts: [{ x: 1200, y: 1250 }, { x: 1150, y: 1300 }, { x: 140, y: 1300 }], w: 56 },
  // The sump street.
  { pts: [{ x: 1200, y: 1010 }, { x: 1250, y: 1060 }, { x: 2260, y: 1060 }], w: 50 },
  // The windery spur, off the bus.
  { pts: [{ x: 1960, y: 760 }, { x: 1960, y: 612 }], w: 40 },
  // The crank-row lane under the mills.
  { pts: [{ x: 1150, y: 1300 }, { x: 1100, y: 1350 }, { x: 1100, y: 1560 }, { x: 600, y: 1560 }], w: 34 },
  // The sump's south lane to the east crank-houses.
  { pts: [{ x: 1238, y: 1520 }, { x: 2260, y: 1520 }], w: 34 },
];
/** Pulses also run down the bus lanes. */
const BUS_LANES = [0, 1, 2, 3, 4, 5].map((i) => BUS_Y - 54 + 9 + i * 18);

// ── Layout ───────────────────────────────────────────────────────────

// The Tabulator and its steps.
addPiece(TABULATOR.x, TABULATOR.y, 560, 480, (g, rng) => tabulator(g, TABULATOR.x, TABULATOR.y, rng),
  { kind: 'rect', x: TABULATOR.x - 250, y: TABULATOR.y - 40, w: 500, h: 40 });

// The Die.
addPiece(DIE.x, DIE.y, DIE_W + 120, DIE_H + 80, (g, rng) => diePalace(g, DIE.x, DIE.y, DIE_W, DIE_H, rng),
  { kind: 'rect', x: DIE.x - DIE_W / 2 - 40, y: DIE.y - 45, w: DIE_W + 80, h: 45 });

// Gearlock's windery and Unit Seven's stand in front of it.
addPiece(1960, 600, 300, 180, (g, rng) => windery(g, 1960, 600, 260, 120, rng), { kind: 'rect', x: 1826, y: 572, w: 268, h: 28 });

// Rom's Core Store at the west end.
addPiece(300, 720, 300, 240, (g, rng) => coreStore(g, 300, 720, 260, 180, rng), { kind: 'rect', x: 160, y: 682, w: 280, h: 38 });

// Nand's lodge on the Junction.
addPiece(980, 660, 220, 110, (g) => gateLodge(g, 980, 660, 1), { kind: 'rect', x: 900, y: 634, w: 140, h: 26 });

// The Draw board and the Brownout Bell.
addPiece(1340, 680, 180, 160, (g, rng) => drawBoard(g, 1340, 680, rng),
  [{ kind: 'rect', x: 1264, y: 668, w: 12, h: 12 }, { kind: 'rect', x: 1404, y: 668, w: 12, h: 12 }]);

// Solde's etchery on the bus.
addPiece(1760, 990, 320, 80, (g, rng) => etchery(g, 1760, 990, rng), { kind: 'rect', x: 1614, y: 962, w: 300, h: 28 });

// The punch-card mills.
addPiece(420, 1220, 460, 180, (g, rng) => punchMill(g, 420, 1220, 300, 110, rng),
  [{ kind: 'rect', x: 230, y: 1196, w: 346, h: 24 }, { kind: 'rect', x: 570, y: 1188, w: 100, h: 32 }]);
addPiece(360, 1460, 460, 180, (g, rng) => punchMill(g, 360, 1460, 300, 110, rng),
  [{ kind: 'rect', x: 170, y: 1436, w: 346, h: 24 }, { kind: 'rect', x: 510, y: 1428, w: 100, h: 32 }]);

// Resistor houses — the shop first — each with its rating painted round it.
interface ResHouse { x: number; y: number; w: number; h: number; bands: number[]; dark?: boolean }
const B = BAND_COLORS;
const RES_HOUSES: ResHouse[] = [
  { x: 1560, y: 690, w: 200, h: 70, bands: [B[4], B[7], B[2], GOLD] }, // Pennywhistle's, 4-7-2
  { x: 2230, y: 690, w: 170, h: 64, bands: [B[1], B[0], B[2], GOLD] },
  { x: 1450, y: 980, w: 170, h: 64, bands: [B[2], B[2], B[1], GOLD] },
  { x: 2100, y: 980, w: 170, h: 64, bands: [B[3], B[3], B[2], 0xb8c0c4] },
  { x: 1010, y: 1120, w: 150, h: 60, bands: [B[1], B[5], B[1], GOLD] },
  { x: 1010, y: 1520, w: 150, h: 60, bands: [B[2], B[0], B[1], GOLD], dark: true },
  { x: 1380, y: 1220, w: 150, h: 60, bands: [B[6], B[8], B[1], GOLD] },
  { x: 1380, y: 1460, w: 150, h: 60, bands: [B[1], B[0], B[3], 0xb8c0c4] },
  { x: 330, y: 960, w: 170, h: 64, bands: [B[3], B[1], B[2], GOLD] },
  { x: 650, y: 960, w: 160, h: 60, bands: [B[5], B[6], B[1], GOLD] },
  { x: 720, y: 730, w: 160, h: 60, bands: [B[3], B[9], B[2], GOLD] }, // the valve-mender's
];
for (const hs of RES_HOUSES) {
  const reach = hs.w / 2 + hs.h * 0.62 * 0.35 + 10;
  addPiece(hs.x, hs.y, hs.w + 80, hs.h + 60, (g, rng) => {
    resistorHouse(g, hs.x, hs.y, hs.w, hs.h, hs.bands, rng, !hs.dark);
  }, { kind: 'rect', x: hs.x - reach, y: hs.y - 24, w: reach * 2, h: 24 });
}

// Crank-houses: the poorest roofs, each with its dynamo on the step. Dorrit's is dark.
const CRANK_HOUSES: { x: number; y: number; w: number; dark?: boolean }[] = [
  { x: 720, y: 1470, w: 90, dark: true }, { x: 860, y: 1470, w: 90 }, { x: 1560, y: 1460, w: 90 },
  { x: 1950, y: 1480, w: 100 }, { x: 2150, y: 1480, w: 100, dark: true },
];
for (const c of CRANK_HOUSES) {
  addPiece(c.x, c.y, c.w + 70, 120, (g, rng) => crankHouse(g, c.x, c.y, c.w, 64, rng, c.dark),
    { kind: 'rect', x: c.x - c.w / 2 - 28, y: c.y - 22, w: c.w + 34, h: 22 });
}

// Capacitor towers on the skyline, each with its rod for the storm.
const TOWERS: { x: number; y: number; r: number; h: number }[] = [
  { x: 1700, y: 520, r: 34, h: 150 }, { x: 2250, y: 560, r: 30, h: 170 }, { x: 160, y: 560, r: 30, h: 140 },
  { x: 880, y: 540, r: 26, h: 120 }, { x: 2290, y: 1260, r: 30, h: 140 }, { x: 840, y: 1080, r: 24, h: 110 },
];
for (const t of TOWERS) {
  addPiece(t.x, t.y, t.r * 3, t.h + 100, (g, rng) => capacitorTower(g, t.x, t.y, t.r, t.h, rng), { kind: 'circle', x: t.x, y: t.y - 6, r: t.r + 4 });
}
/** The rod tips, for the lightning. */
const ROD_TIPS: Pt[] = TOWERS.map((t) => ({ x: t.x, y: t.y - 12 - t.h - 56 }));

// Pylons carrying the Grid.
const PYLONS: { x: number; y: number; h: number }[] = [
  { x: 180, y: 1010, h: 170 }, { x: 820, y: 900, h: 170 }, { x: 1100, y: 640, h: 190 }, { x: 1480, y: 920, h: 170 },
  { x: 1880, y: 920, h: 170 }, { x: 2300, y: 1010, h: 160 }, { x: 1300, y: 1340, h: 160 },
];
for (const p of PYLONS) addPiece(p.x, p.y, 90, p.h + 30, (g) => pylon(g, p.x, p.y, p.h), { kind: 'circle', x: p.x, y: p.y - 2, r: 16 });
/** Which pylons are strung together. */
const SPANS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6]];

// The burn-out heaps at the pylons' feet (valves the Grid gangs dump) and cable drums.
for (const [x, y] of [[1150, 660], [870, 925], [1530, 945]] as [number, number][]) {
  addPiece(x, y, 60, 40, (g, rng) => {
    for (let i = 0; i < 9; i++) {
      const vx = x - 20 + rng() * 40, vy = y - rng() * 10;
      g.fillStyle(0x6a7a80, 0.6); g.fillEllipse(vx, vy, 6, 12);
      g.fillStyle(0x221a14, 1); g.fillRect(vx - 3, vy + 4, 6, 3);
    }
  });
}
for (const [x, y] of [[2000, 1080], [640, 1100], [1640, 600]] as [number, number][]) {
  addPiece(x, y, 60, 50, (g) => cableDrum(g, x, y, 1), { kind: 'circle', x, y: y - 6, r: 18 });
}

// Diode street-lamps along the streets.
const LAMPS: Pt[] = [
  { x: 1360, y: 735 }, { x: 1760, y: 735 }, { x: 2060, y: 735 }, { x: 1360, y: 868 }, { x: 2000, y: 868 },
  { x: 1050, y: 740 }, { x: 860, y: 765 }, { x: 600, y: 765 }, { x: 420, y: 838 }, { x: 760, y: 838 },
  { x: 1150, y: 600 }, { x: 1250, y: 600 }, { x: 1150, y: 1000 }, { x: 1250, y: 1180 }, { x: 1150, y: 1420 },
  { x: 900, y: 1270 }, { x: 260, y: 1270 }, { x: 1600, y: 1030 }, { x: 2100, y: 1090 }, { x: 560, y: 600 },
];
for (const [i, l] of LAMPS.entries()) addPiece(l.x, l.y, 30, 70, (g) => diodeLamp(g, l.x, l.y, i % 7 === 3 ? FAULT : DIODE, i % 11 === 5 ? 0 : 1));

// The waystone.
const WAYSTONE: Pt = { x: 2300, y: 900 };
addPiece(WAYSTONE.x, WAYSTONE.y, 60, 90, (g) => oscillatorStone(g, WAYSTONE.x, WAYSTONE.y));

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    const W = CIRCUIT_W, H = CIRCUIT_H;
    // The board: solder mask over fibreglass weave.
    g.fillStyle(MASK, 1); g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 8) { g.fillStyle(MASK_LIT, 0.05); g.fillRect(x, 0, 3, H); }
    for (let y = 0; y < H; y += 8) { g.fillStyle(MASK_DARK, 0.07); g.fillRect(0, y, W, 3); }
    for (let i = 0; i < 1200; i++) { g.fillStyle(rng() < 0.5 ? MASK_LIT : MASK_DARK, 0.25); g.fillRect(rng() * W, rng() * H, 2, 2); }
    // Ground-pour islands, hatched copper under the mask.
    for (let i = 0; i < 18; i++) {
      const x = rng() * W, y = 120 + rng() * (H - 200), w = 160 + rng() * 260, h = 100 + rng() * 160;
      g.fillStyle(COPPER_DARK, 0.1); g.fillRect(x, y, w, h);
      for (let k = 0; k < w + h; k += 14) { g.lineStyle(1, COPPER, 0.06); g.lineBetween(x + Math.max(0, k - h), y + Math.min(h, k), x + Math.min(w, k), y + Math.max(0, k - w)); }
    }
    // The board is screwed down to the black rock of the isle along its north and west edges.
    for (let x = 0; x < W; x += 40) {
      g.fillStyle(0x0c0c10, 1); g.fillRect(x, 0, 40, 46 + Math.sin(x * 0.03) * 10);
    }
    for (let y = 0; y < H; y += 40) { g.fillStyle(0x0c0c10, 1); g.fillRect(0, y, 34 + Math.sin(y * 0.05) * 8, 40); }
    for (let i = 0; i < 26; i++) rock(g, rng() * W, 30 + rng() * 20, 12 + rng() * 14, 0x1e1c24, rng);
    for (const [x, y] of [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]] as [number, number][]) {
      g.fillStyle(SOLDER_DARK, 1); g.fillCircle(x, y, 18); g.fillStyle(SOLDER, 1); g.fillCircle(x, y, 15);
      g.lineStyle(3, SOLDER_DARK, 1); g.lineBetween(x - 9, y - 9, x + 9, y + 9); g.lineBetween(x - 9, y + 9, x + 9, y - 9);
    }
    // The edge connector along the south edge: gold fingers (the Rail runs out through them).
    for (let x = 80; x < W - 60; x += 34) {
      if (Math.abs(x - 1200) < 80) continue;
      g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 12, H - 46, 24, 46);
      g.fillStyle(GOLD, 1); g.fillRect(x - 10, H - 44, 20, 44);
      g.fillStyle(GOLD_LIT, 0.5); g.fillRect(x - 10, H - 44, 4, 44);
    }
    // Streets: traces, then the bus.
    for (const s of STREETS) traceStreet(g, s.pts, s.w, rng);
    busStreet(g, JUNCTION.x + JUNCTION_R - 20, W, BUS_Y, 6, 18, rng);
    // The Junction: a great tinned pad, a via's ring the size of a square.
    g.fillStyle(MASK_DARK, 1); g.fillCircle(JUNCTION.x, JUNCTION.y, JUNCTION_R + 10);
    g.fillStyle(SOLDER_DARK, 1); g.fillCircle(JUNCTION.x, JUNCTION.y, JUNCTION_R);
    g.fillStyle(SOLDER, 1); g.fillCircle(JUNCTION.x, JUNCTION.y, JUNCTION_R - 6);
    g.fillStyle(SOLDER_LIT, 0.35); g.fillCircle(JUNCTION.x - 30, JUNCTION.y - 40, JUNCTION_R * 0.5);
    g.lineStyle(3, SOLDER_DARK, 0.7); g.strokeCircle(JUNCTION.x, JUNCTION.y, JUNCTION_R * 0.62);
    g.fillStyle(MASK_DEEP, 1); g.fillCircle(JUNCTION.x, JUNCTION.y, 30);
    g.lineStyle(4, COPPER, 0.8); g.strokeCircle(JUNCTION.x, JUNCTION.y, 30);
    for (let k = 0; k < 4; k++) silkArrow(g, JUNCTION.x + Math.cos(k * Math.PI / 2) * 95, JUNCTION.y + Math.sin(k * Math.PI / 2) * 95, -Math.PI / 2, 12, 0.35);
    // The Tabulator's forecourt: a tinned pad.
    pad(g, TABULATOR.x, TABULATOR.y + 30, 300, 50);
    // The Die's forecourt: gold fingers fanning out from its socket.
    for (let k = -4; k <= 4; k++) {
      g.lineStyle(10, GOLD_DARK, 1); g.lineBetween(DIE.x + k * 36, DIE.y + 4, DIE.x + k * 48, DIE.y + 70);
      g.lineStyle(6, GOLD, 1); g.lineBetween(DIE.x + k * 36, DIE.y + 4, DIE.x + k * 48, DIE.y + 70);
    }
    // The sump.
    sump(g, SUMP, rng);
    // Silkscreen: a house number beside every door, part numbers, the Draw's arrows.
    for (const hs of RES_HOUSES) silkMark(g, hs.x, hs.y + 12, String(100 + Math.floor(rng() * 900)), 10, 0.5);
    for (const c of CRANK_HOUSES) silkMark(g, c.x + 10, c.y + 12, String(100 + Math.floor(rng() * 900)), 9, 0.5);
    for (let i = 0; i < 40; i++) {
      const x = 80 + rng() * (W - 160), y = 120 + rng() * (H - 200);
      silkMark(g, x, y, ['R', 'C', 'U', 'Q', 'D', 'L'][i % 6] + String(Math.floor(rng() * 99)), 8, 0.2);
    }
    for (let i = 0; i < 30; i++) via(g, 60 + rng() * (W - 120), 100 + rng() * (H - 160), 4 + rng() * 3);
    // Litter of the reckoning: misfed cards and tape blown about the mill street.
    for (let i = 0; i < 26; i++) droppedCard(g, 160 + rng() * 980, 1240 + rng() * 140, rng() * Math.PI, rng);
    for (let i = 0; i < 8; i++) droppedCard(g, 1050 + rng() * 300, 520 + rng() * 60, rng() * Math.PI, rng);
    // The Prince's part number printed in front of the Die, large.
    segText(g, DIE.x - 70, DIE.y + 90, 'U1 BYTE', 18, 0xe8ece0, 0.28);
    segText(g, 1700, 840, 'BUS 0-5', 14, 0xe8ece0, 0.2);
  },

  pieces,

  animate(g, t, view) {
    const inView = (x: number, y: number, m = 60) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
    // Current running along the streets: beads of light, a few per street.
    for (const [si, s] of STREETS.entries()) {
      const segs: { a: Pt; b: Pt; len: number }[] = [];
      let total = 0;
      for (let i = 1; i < s.pts.length; i++) { const len = Math.hypot(s.pts[i].x - s.pts[i - 1].x, s.pts[i].y - s.pts[i - 1].y); segs.push({ a: s.pts[i - 1], b: s.pts[i], len }); total += len; }
      const n = Math.max(1, Math.round(total / 380));
      for (let k = 0; k < n; k++) {
        let d = ((t * 150 + k * (total / n) + si * 97) % total + total) % total;
        // Current flows *up* toward the Crown: toward the start of every street.
        d = total - d;
        for (const sg of segs) {
          if (d > sg.len) { d -= sg.len; continue; }
          const u = d / Math.max(1, sg.len);
          const x = sg.a.x + (sg.b.x - sg.a.x) * u, y = sg.a.y + (sg.b.y - sg.a.y) * u;
          if (inView(x, y)) pulseBead(g, x, y, (sg.b.x - sg.a.x) / sg.len, (sg.b.y - sg.a.y) / sg.len, 4, PULSE, 0.75);
          break;
        }
      }
    }
    // The bus: packets of current east to the Dynamo, lane by lane.
    for (const [i, ly] of BUS_LANES.entries()) {
      for (let k = 0; k < 4; k++) {
        const x = JUNCTION.x + JUNCTION_R + (((t * (180 + i * 14) + k * 300 + i * 70) % 1100) + 1100) % 1100;
        if (x > CIRCUIT_W) continue;
        if (inView(x, ly)) pulseBead(g, x, ly, 1, 0, 3, i % 2 ? PULSE : DIODE, 0.7);
      }
    }
    // The sump: a rainbow sheen sliding on black oil, and slow bubbles.
    if (inView(SUMP.x + SUMP.w / 2, SUMP.y + SUMP.h / 2, 260)) {
      for (let i = 0; i < 5; i++) {
        const x = SUMP.x + 50 + ((t * 14 + i * 90) % (SUMP.w - 100)), y = SUMP.y + 30 + i * 28;
        g.fillStyle([OIL_SHEEN, 0x2a6a7a, 0x7a6a2a][i % 3], 0.14 + Math.sin(t + i) * 0.05);
        g.fillEllipse(x, y, 70, 9);
      }
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.35 + i * 0.27) % 1;
        const x = SUMP.x + 60 + i * 90, y = SUMP.y + SUMP.h - 30 - ph * 20;
        g.lineStyle(1.2, 0x8a7aaa, 0.5 * (1 - ph)); g.strokeCircle(x, y, 3 + ph * 6);
      }
      // A diode dart's glow passing under the surface now and then.
      const dx = SUMP.x + 40 + ((t * 60) % (SUMP.w - 80));
      glow(g, dx, SUMP.y + SUMP.h / 2 + Math.sin(t * 2) * 30, 14, DIODE, 0.05, 3);
    }
    // Valve glow at the Tabulator's door bay, breathing.
    if (inView(TABULATOR.x, TABULATOR.y, 300)) {
      glow(g, TABULATOR.x, TABULATOR.y + 10, 80 + Math.sin(t * 2.2) * 8, FILAMENT, 0.025, 4);
    }
    // The Die's forecourt glow, cathode green.
    if (inView(DIE.x, DIE.y, 300)) glow(g, DIE.x, DIE.y + 40, 90 + Math.sin(t * 1.7) * 10, 0x3ae08a, 0.02, 4);
  },

  animateOver(g, t, view) {
    const inView = (x: number, y: number, m = 200) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
    // The Grid overhead: cables sagging pylon to pylon, a crackle racing along them.
    for (const [a, b] of SPANS) {
      const pa = PYLONS[a], pb = PYLONS[b];
      if (!inView((pa.x + pb.x) / 2, (pa.y - pa.h + pb.y - pb.h) / 2, 600)) continue;
      const ta = pylonTops(pa.x, pa.y, pa.h), tb = pylonTops(pb.x, pb.y, pb.h);
      for (let c = 0; c < 4; c++) {
        // Each arm's insulator strings its own wire to the same arm of the next pylon.
        const A = ta[c], Bp = tb[c];
        const sag = 34 + c * 4;
        g.lineStyle(1.6, 0x0a0a0c, 0.9);
        g.beginPath();
        for (let k = 0; k <= 16; k++) {
          const u = k / 16;
          const x = A.x + (Bp.x - A.x) * u, y = A.y + (Bp.y - A.y) * u + Math.sin(u * Math.PI) * sag;
          if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        // A crackle running along one wire of each span.
        if (c === 1) {
          const u = ((t * 0.6 + a * 0.37) % 1);
          const x = A.x + (Bp.x - A.x) * u, y = A.y + (Bp.y - A.y) * u + Math.sin(u * Math.PI) * sag;
          glow(g, x, y, 10, BOLT, 0.08, 2);
          g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 1.6);
        }
      }
    }
    // The storm: every few seconds lightning comes down on one of the capacitor towers' rods.
    const PERIOD = 3.7;
    const k = Math.floor(t / PERIOD);
    const ph = t - k * PERIOD;
    if (ph < 0.22) {
      const tip = ROD_TIPS[(k * 7 + 3) % ROD_TIPS.length];
      const a = 1 - ph / 0.22;
      if (inView(tip.x, tip.y, 300)) {
        bolt(g, tip.x + ((k * 53) % 120) - 60, view.y - 20, tip.x, tip.y, k * 7919 + 13, a, 2.6);
        glow(g, tip.x, tip.y, 40, BOLT, 0.12 * a, 3);
      }
      g.fillStyle(BOLT, 0.06 * a); g.fillRect(view.x, view.y, view.w, view.h);
    }
    // The Tabulator's rose window: the night's Draw ticking over in nixie numerals.
    const rx = TABULATOR.x, ry = TABULATOR.y - 20 - 200 - 34;
    if (inView(rx, ry, 100)) {
      g.fillStyle(0x0a0a0c, 1); g.fillRoundedRect(rx - 16, ry - 8, 32, 16, 3);
      const n = Math.floor(t * 3) % 100;
      segText(g, rx - 7, ry - 5, String(n).padStart(2, '0'), 10, NIXIE, 1);
      glow(g, rx, ry, 26, NIXIE, 0.03 + Math.sin(t * 9) * 0.01, 2);
    }
    // Lamps flicker on the metered streets — a dimming as the Draw is taken.
    const brown = (Math.sin(t * 0.21) + 1) / 2;
    if (brown > 0.92) {
      g.fillStyle(0x000000, (brown - 0.92) * 2.5); g.fillRect(view.x, view.y, view.w, view.h);
    }
    // A red warning lamp blinking on the Tabulator's steeple and the Die's pin one.
    if (Math.floor(t * 1.5) % 2 === 0) {
      if (inView(TABULATOR.x, TABULATOR.y - 456)) glow(g, TABULATOR.x, TABULATOR.y - 20 - 200 - 86 - 152, 10, FAULT, 0.12, 2);
    }
    const p1x = DIE.x - DIE_W / 2 + 48, p1y = DIE.y - 32 - (DIE_H - DIE_H * 0.55) - DIE_H * 0.55 + 16;
    if (inView(p1x, p1y)) glow(g, p1x, p1y, 12 + Math.sin(t * 3) * 3, GOLD_LIT, 0.06, 2);
  },
};

export const CIRCUIT_AREA: AreaDef = {
  id: 'circuit',
  isle: 'electricity',
  court: 'circuit',
  name: 'The Circuit Court',
  subtitle: 'Every household reckoned to the last ohm',
  w: CIRCUIT_W,
  h: CIRCUIT_H,
  bg: MASK_DEEP,
  accent: CIRCUIT_COLOR,
  weather: 'static',
  spawn: { x: 2200, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'dynamo', label: 'Along the bus to the Dynamo Court' },
    { side: 's', to: 'bounce', label: 'Down the Rail to the Bounce Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: WAYSTONE.x, y: WAYSTONE.y + 30 } },
    { kind: 'prince', id: 'byte', at: { x: DIE.x, y: DIE.y + 40 } },
    { kind: 'water', id: 'circuit-sump', shape: SUMP, fishery: 'circuit-sump' },
    { kind: 'encounter', id: 'circuit-traces' },
    { kind: 'encounter', id: 'circuit-logic-gates' },
    { kind: 'encounter', id: 'circuit-punch-cards' },
    { kind: 'encounter', id: 'circuit-automaton' },
    { kind: 'encounter', id: 'circuit-memory-leak' },
    {
      kind: 'sign', at: { x: 2220, y: 880 },
      text: 'THE CIRCUIT COURT. Every household is reckoned by the Tabulator. Every household is a number. Know yours.',
    },
    {
      kind: 'sign', at: { x: 1420, y: 760 },
      text: 'THE DRAW BOARD. A ring is a short. Short at the Bell is switched off. Three rings and the house is earthed.',
    },
    {
      kind: 'sign', at: { x: 640, y: 520 },
      text: 'THE DIE. Seat of His Highness Prince Byte, Reckoner of the Circuit. Errors are corrected, not heard.',
    },
    {
      kind: 'sign', at: { x: 1600, y: 1110 },
      text: 'COOLANT SUMP. Fish taken from the sump are unmetered current. Eating them is a theft from the Grid.',
    },
    {
      kind: 'sign', at: { x: 760, y: 1340 },
      text: 'MILLS ONE & TWO. One card per household per night. A misfeed is the household\'s fault.',
    },
    { kind: 'chest', id: 'circuit-chest-sump', at: { x: 2200, y: 1390 }, coins: 110 },
    { kind: 'chest', id: 'circuit-chest-die', at: { x: 800, y: 500 }, orbs: 2, open: { prince: 'byte' } },
  ],
  npcs: CIRCUIT_NPCS,
  crowd: CIRCUIT_CROWD,
};
