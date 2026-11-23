import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, type G } from '../../../../art/IsleArt';
import {
  atelier, automatonArm, automatonStall, caustics, clayFigure, coalHeap, crane, craneLoad, culletBin, draftingTable,
  furnace, furnaceGlow, gear, glint, grindingHall, inView, lensDot, lensStand, mirrorRack, mirrorStatue, patentBoard,
  patentOffice, quenchTank, roofPane, sawtoothShop, settRoad, steamPlumes, wheelSparks, workbench, yardFlags,
  type AutomatonKind,
} from './art';
import {
  BRASS, BRASS_DARK, CLAY, CLAY_DARK, COPPER_DARK, IRON, IRON_DARK, IRON_LIT, LIME, LIME_DARK, LIME_DEEP, LIME_LIT,
  MIRROR, OAK_DARK, SOOT, SUN, WORKSHOP_COLOR,
} from './palette';
import { WORKSHOP_CROWD, WORKSHOP_NPCS } from './npcs';

/**
 * The Workshop Court — the artificers' town on Solmara's eastern terrace, where the Heliostat's
 * mirrors are ground, silvered and hoisted.
 *
 * Read it from the Noon road (west) in:
 * • **the gate** (west): the road from the sun-plaza comes in past the waystone and a brass
 *   Despot with a mirror for a face, aimed down the road "so that nothing is made in the dark";
 * • **Patent Row** (north-west): the Patent Office with its glass doors and the notice boards in
 *   front of it — granted patents sealed in gold, refusals stamped red, seizures pinned on top;
 * • **the drafting terrace** (west-centre): drafting tables set out in rows in the full sun, so the
 *   Office can see every line drawn;
 * • **the grinding hall** (north-centre): a long open shed under a glass roof where the mirror
 *   blanks are ground true on treadle wheels — the panes of noon through the roof land on the floor;
 * • **the glassblowers' yard** (south-west): beehive furnaces, cullet bins, a coal heap, soot;
 * • **the quench tank** (south-centre): a sunk riveted tank of dark water that never stops steaming
 *   — the court's fishing water — beside the road south to the Arcane Court;
 * • **the automata market** (south-east): stalls under glass awnings (cloth makes shade), each with a
 *   clockwork figure ticking on its counter, and the sculptor's yard behind them;
 * • **the crane yard** (east): the gantry crane hoisting a new Heliostat mirror, racks of panes;
 * • **the atelier** (north-east): Prince Artifex's glass workshop, the Magnum Opus standing half
 *   built inside where everyone can see it.
 */

export const WORKSHOP_W = 2400;
export const WORKSHOP_H = 1600;

const ROW_Y = 800;
const SOUTH_X = 1200;

/** The quench tank — the court's fishing water. */
export const QUENCH_TANK: Rect = { x: 820, y: 1120, w: 260, h: 150 };
/** Prince Artifex's atelier — the middle of its front step. */
export const ATELIER: Pt = { x: 1900, y: 420 };
/** The Patent Office — the middle of its steps. */
export const PATENT_OFFICE: Pt = { x: 520, y: 420 };
/** The grinding hall's front line (base) and centre. */
export const HALL: Pt = { x: 1150, y: 640 };
/** The gantry crane's footing. */
export const CRANE: Pt = { x: 2000, y: 1060 };
/** The two glassblowers' furnaces. */
export const FURNACES: { x: number; y: number; s: number }[] = [{ x: 300, y: 1300, s: 1 }, { x: 590, y: 1390, s: 0.9 }];
/** Drafting tables on the terrace. */
export const DRAFTING: Pt[] = [{ x: 420, y: 960 }, { x: 560, y: 940 }, { x: 700, y: 960 }, { x: 840, y: 940 }];
/** The patent notice boards along Patent Row. */
export const BOARDS: Pt[] = [{ x: 410, y: 610 }, { x: 640, y: 610 }, { x: 300, y: 700 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

/** Animated bits, registered as the layout is placed. */
const wheels: Pt[] = [];
const glories: { x: number; y: number; s: number }[] = [];
const lensDots: Pt[] = [];
const stalls: { x: number; y: number; kind: AutomatonKind }[] = [];
/** Spots where a pane or a lens splits the noon into colours. */
const causticSpots: { x: number; y: number; r: number; seed: number }[] = [];

// ── Layout ───────────────────────────────────────────────────────────

// The north edge: workshop fronts with sawtooth glass roofs, either side of the atelier.
const FRONTS: [number, number, 'lens' | 'gear' | 'flask'][] = [
  [130, 180, 'flask'], [860, 200, 'lens'], [1070, 170, 'gear'], [1290, 200, 'lens'], [1470, 160, 'gear'], [2300, 150, 'lens'],
];
for (const [x, w, sign] of FRONTS) {
  addPiece(x, 220, w + 40, 220, (g, rng) => sawtoothShop(g, x, 220, w, 120, sign, rng), { kind: 'rect', x: x - w / 2, y: 186, w, h: 34 });
}

// The Patent Office and its notice boards.
addPiece(PATENT_OFFICE.x, PATENT_OFFICE.y, 360, 300, (g, rng) => patentOffice(g, PATENT_OFFICE.x, PATENT_OFFICE.y, 300, 150, rng),
  { kind: 'rect', x: PATENT_OFFICE.x - 150, y: PATENT_OFFICE.y - 46, w: 300, h: 34 });
for (const b of BOARDS) addPiece(b.x, b.y, 110, 120, (g, rng) => patentBoard(g, b.x, b.y, rng), { kind: 'rect', x: b.x - 42, y: b.y - 10, w: 84, h: 10 });

// The gate: a brass Despot with a mirror face, aimed down the Noon road.
addPiece(330, 940, 80, 150, (g) => mirrorStatue(g, 330, 940), { kind: 'rect', x: 300, y: 904, w: 60, h: 36 });

// The grinding hall.
addPiece(HALL.x, HALL.y, 680, 280, (g, rng) => grindingHall(g, HALL.x, HALL.y, 600, 210, rng),
  { kind: 'rect', x: HALL.x - 305, y: HALL.y - 52, w: 610, h: 52 });
for (let i = 0; i < 5; i++) {
  const wx = HALL.x - 300 + 60 + i * ((600 - 120) / 4);
  wheels.push({ x: wx, y: HALL.y - 14 });
}

// Benches and a lens stand along the front of the hall.
addPiece(760, 720, 110, 90, (g, rng) => workbench(g, 760, 720, rng), { kind: 'rect', x: 712, y: 688, w: 96, h: 32 });
addPiece(1560, 650, 110, 90, (g, rng) => workbench(g, 1560, 650, rng), { kind: 'rect', x: 1512, y: 618, w: 96, h: 32 });
addPiece(1490, 730, 60, 110, (g) => lensStand(g, 1490, 730, 1), { kind: 'circle', x: 1490, y: 726, r: 14 });
lensDots.push({ x: 1450, y: 770 });
addPiece(900, 760, 60, 110, (g) => lensStand(g, 900, 760, 0.8), { kind: 'circle', x: 900, y: 756, r: 12 });
lensDots.push({ x: 940, y: 780 });

// The drafting terrace.
DRAFTING.forEach((d, i) => addPiece(d.x, d.y, 100, 90, (g) => draftingTable(g, d.x, d.y, i), { kind: 'rect', x: d.x - 36, y: d.y - 14, w: 72, h: 14 }));

// The glassblowers' yard.
for (const f of FURNACES) {
  addPiece(f.x, f.y, 220 * f.s, 260 * f.s, (g, rng) => furnace(g, f.x, f.y, f.s, rng),
    { kind: 'rect', x: f.x - 64 * f.s, y: f.y - 30 * f.s, w: 128 * f.s, h: 30 * f.s });
  glories.push(f);
}
addPiece(170, 1450, 80, 60, (g, rng) => coalHeap(g, 170, 1450, rng), { kind: 'circle', x: 170, y: 1440, r: 26 });
for (const [x, y] of [[470, 1250], [760, 1440], [170, 1180]] as [number, number][]) {
  addPiece(x, y, 60, 70, (g, rng) => culletBin(g, x, y, rng), { kind: 'rect', x: x - 22, y: y - 14, w: 44, h: 14 });
}

// The quench tank is sunk in the ground (painted in `ground`); its walls are solid.
solids.push({ kind: 'rect', x: QUENCH_TANK.x - 16, y: QUENCH_TANK.y - 16, w: QUENCH_TANK.w + 32, h: QUENCH_TANK.h + 32 });

// The automata market: two rows of stalls under glass awnings.
const STALLS: [number, number, AutomatonKind][] = [
  [1480, 1010, 'bird'], [1680, 1010, 'scribe'], [1880, 1000, 'drummer'],
  [1480, 1260, 'juggler'], [1680, 1260, 'bird'],
];
for (const [x, y, kind] of STALLS) {
  addPiece(x, y, 130, 130, (g, rng) => automatonStall(g, x, y, kind, rng), { kind: 'rect', x: x - 54, y: y - 40, w: 108, h: 40 });
  stalls.push({ x, y, kind });
}

// The sculptor's yard behind the market.
for (const [x, y, s] of [[1760, 1420, 1], [1940, 1430, 0.85], [2100, 1400, 1.1]] as [number, number, number][]) {
  addPiece(x, y, 70 * s, 110 * s, (g, rng) => clayFigure(g, x, y, s, rng), { kind: 'rect', x: x - 24 * s, y: y - 20 * s, w: 48 * s, h: 20 * s });
}

// The crane yard.
addPiece(CRANE.x, CRANE.y, 560, 420, (g, rng) => crane(g, CRANE.x, CRANE.y, rng), { kind: 'rect', x: CRANE.x - 88, y: CRANE.y - 30, w: 142, h: 30 });
addPiece(2230, 1210, 130, 100, (g, rng) => mirrorRack(g, 2230, 1210, rng), { kind: 'rect', x: 2174, y: 1196, w: 112, h: 14 });
addPiece(2260, 980, 130, 100, (g, rng) => mirrorRack(g, 2260, 980, rng), { kind: 'rect', x: 2204, y: 966, w: 112, h: 14 });

// The atelier.
addPiece(ATELIER.x, ATELIER.y, 560, 500, (g, rng) => atelier(g, ATELIER.x, ATELIER.y, 460, 220, rng),
  { kind: 'rect', x: ATELIER.x - 240, y: ATELIER.y - 40, w: 480, h: 32 });
lensDots.push({ x: ATELIER.x + 10, y: ATELIER.y + 70 });

// Caustics: under the grinding hall's roof, round the lens stands and the atelier's step.
for (let i = 0; i < 6; i++) causticSpots.push({ x: HALL.x - 260 + i * 104, y: HALL.y + 30 + (i % 2) * 16, r: 26, seed: i * 1.7 });
causticSpots.push({ x: 1470, y: 780, r: 30, seed: 4.1 }, { x: 930, y: 800, r: 26, seed: 2.2 }, { x: ATELIER.x - 60, y: ATELIER.y + 60, r: 34, seed: 0.6 });

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    yardFlags(g, { x: 0, y: 0, w: WORKSHOP_W, h: WORKSHOP_H }, rng);
    // The glassblowers' yard: brick paving, soot-stained.
    g.fillStyle(dim(COPPER_DARK, 0.1), 1); g.fillRect(60, 1100, 820, 470);
    for (let y = 1100; y < 1570; y += 12) {
      for (let x = 60 + ((y / 12) % 2) * 12; x < 880; x += 24) {
        g.fillStyle(rng() < 0.3 ? dim(COPPER_DARK, 0.25) : COPPER_DARK, 1); g.fillRect(x + 1, y + 1, 22, 10);
      }
    }
    for (let i = 0; i < 40; i++) { g.fillStyle(SOOT, 0.08 + rng() * 0.08); g.fillEllipse(60 + rng() * 820, 1100 + rng() * 470, 40 + rng() * 60, 14 + rng() * 20); }
    // The sculptor's yard: trodden clay.
    g.fillStyle(CLAY_DARK, 0.35); g.fillRect(1700, 1340, 520, 230);
    for (let i = 0; i < 60; i++) { g.fillStyle(rng() < 0.5 ? CLAY : CLAY_DARK, 0.25); g.fillCircle(1700 + rng() * 520, 1340 + rng() * 230, 3 + rng() * 8); }
    // Crane rails across the crane yard.
    for (const ry of [880, 1110]) {
      g.fillStyle(IRON_DARK, 1); g.fillRect(1820, ry, 560, 6);
      g.fillStyle(IRON_LIT, 1); g.fillRect(1820, ry, 560, 2);
      for (let x = 1826; x < 2380; x += 22) { g.fillStyle(OAK_DARK, 0.8); g.fillRect(x, ry - 4, 8, 14); }
    }
    // Roads: Grinders' Row west–east, the south road to the Arcane Court, lanes to the Office and the atelier.
    settRoad(g, [{ x: 0, y: ROW_Y }, { x: 1200, y: ROW_Y }, { x: 2200, y: ROW_Y }], 92, rng);
    settRoad(g, [{ x: SOUTH_X, y: ROW_Y }, { x: SOUTH_X, y: WORKSHOP_H }], 84, rng);
    settRoad(g, [{ x: 520, y: ROW_Y }, { x: 520, y: 450 }], 62, rng);
    settRoad(g, [{ x: 1600, y: ROW_Y }, { x: 1700, y: 560 }, { x: ATELIER.x, y: ATELIER.y + 40 }], 66, rng);
    settRoad(g, [{ x: 1300, y: 1130 }, { x: 2000, y: 1130 }], 58, rng);
    // The atelier forecourt: a round of white marble with an inlaid brass compass rose.
    g.fillStyle(LIME_DARK, 1); g.fillCircle(ATELIER.x, ATELIER.y + 80, 112);
    g.fillStyle(LIME_LIT, 1); g.fillCircle(ATELIER.x, ATELIER.y + 80, 106);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, r = k % 2 ? 60 : 96;
      g.fillStyle(k % 4 === 0 ? BRASS : BRASS_DARK, 0.75);
      g.fillTriangle(ATELIER.x + Math.cos(a - 0.08) * 16, ATELIER.y + 80 + Math.sin(a - 0.08) * 16 * 0.6,
        ATELIER.x + Math.cos(a + 0.08) * 16, ATELIER.y + 80 + Math.sin(a + 0.08) * 16 * 0.6,
        ATELIER.x + Math.cos(a) * r, ATELIER.y + 80 + Math.sin(a) * r * 0.6);
    }
    g.lineStyle(2, BRASS, 0.7); g.strokeEllipse(ATELIER.x, ATELIER.y + 80, 200, 124);
    gear(g, ATELIER.x, ATELIER.y + 80, 12, 12, BRASS, 1, 0);
    // The drafting terrace: a raised white-marble platform, lines of the Office's chalk grid.
    g.fillStyle(LIME_DARK, 1); g.fillRect(340, 870, 580, 130);
    g.fillStyle(LIME_LIT, 1); g.fillRect(344, 872, 572, 124);
    g.lineStyle(1, 0x8ae6ff, 0.25);
    for (let x = 360; x < 916; x += 28) g.lineBetween(x, 874, x, 994);
    for (let y = 884; y < 996; y += 28) g.lineBetween(346, y, 914, y);
    // The panes of noon falling through the grinding hall's glass roof.
    for (let i = 0; i < 6; i++) roofPane(g, HALL.x - 290 + i * 100, HALL.y + 4, 84, 40, 0.16);
    // The quench tank, sunk in the yard.
    quenchTank(g, QUENCH_TANK, rng);
    // Gutters of grinding slurry down from the hall.
    g.lineStyle(6, LIME_DEEP, 0.5); g.lineBetween(HALL.x - 300, HALL.y + 2, HALL.x + 300, HALL.y + 2);
    g.lineStyle(3, 0x9a958a, 0.6); g.lineBetween(HALL.x - 300, HALL.y + 2, HALL.x + 300, HALL.y + 2);
    // A limestone parapet round the court's south and east edges (the terrace drops to the sea / the slope).
    g.fillStyle(LIME_DEEP, 1); g.fillRect(0, WORKSHOP_H - 18, SOUTH_X - 90, 18); g.fillRect(SOUTH_X + 90, WORKSHOP_H - 18, WORKSHOP_W - SOUTH_X - 90, 18);
    g.fillStyle(LIME, 1); g.fillRect(0, WORKSHOP_H - 22, SOUTH_X - 90, 8); g.fillRect(SOUTH_X + 90, WORKSHOP_H - 22, WORKSHOP_W - SOUTH_X - 90, 8);
    g.fillStyle(LIME_DEEP, 1); g.fillRect(WORKSHOP_W - 18, 0, 18, WORKSHOP_H);
    g.fillStyle(LIME, 1); g.fillRect(WORKSHOP_W - 22, 0, 8, WORKSHOP_H);
    for (let y = 20; y < WORKSHOP_H; y += 60) { g.fillStyle(LIME_LIT, 1); g.fillRect(WORKSHOP_W - 24, y, 12, 10); }
    // Scattered brass filings, dropped gears and a blueprint blown loose.
    for (let i = 0; i < 26; i++) {
      const x = 100 + rng() * 2200, y = 300 + rng() * 1250;
      gear(g, x, y, 2.5 + rng() * 2, 8, rng() < 0.5 ? BRASS : IRON, 0.8, rng() * 3);
    }
    // The north backdrop: the terrace wall above the workshop fronts.
    g.fillStyle(LIME_DEEP, 1); g.fillRect(0, 0, WORKSHOP_W, 70);
    g.fillStyle(LIME_DARK, 1); g.fillRect(0, 60, WORKSHOP_W, 14);
    for (let x = 0; x < WORKSHOP_W; x += 48) { g.fillStyle(LIME, 0.6); g.fillRect(x + 2, 4, 44, 26); g.fillRect(x + 26, 32, 44, 26); }
    g.fillStyle(MIRROR, 0.25); g.fillRect(0, 0, WORKSHOP_W, 6);
  },

  pieces,

  animate(g, t, view) {
    // Rainbow caustics under glass and round the lenses.
    for (const c of causticSpots) if (inView(view, c.x, c.y)) caustics(g, c.x, c.y, c.r, t, c.seed);
    // Burning dots from the lens stands and the atelier's crowning lens.
    for (const d of lensDots) if (inView(view, d.x, d.y)) lensDot(g, d.x, d.y, t);
    // A sweep of reflected light crossing the yard every few seconds — a crane mirror turning.
    const sweep = (t * 0.09) % 1;
    const sx = view.x - 200 + sweep * (view.w + 400);
    g.fillStyle(SUN, 0.05); g.fillRect(sx, view.y, 60, view.h);
    g.fillStyle(SUN, 0.04); g.fillRect(sx + 70, view.y, 18, view.h);
  },

  animateOver(g, t, view) {
    for (const w of wheels) if (inView(view, w.x, w.y)) wheelSparks(g, w.x, w.y, t, w.x * 0.01);
    for (const f of glories) if (inView(view, f.x, f.y, 300)) furnaceGlow(g, f.x, f.y, f.s, t);
    for (const s of stalls) if (inView(view, s.x, s.y)) automatonArm(g, s.x, s.y, s.kind, t);
    steamPlumes(g, QUENCH_TANK, t, view);
    if (inView(view, CRANE.x + 200, CRANE.y - 200, 400)) craneLoad(g, CRANE.x, CRANE.y, t);
    // A glint on the atelier's dome lens and the Patent Office's sunburst, now and then.
    if (inView(view, ATELIER.x, ATELIER.y - 300, 300)) {
      const k = Math.max(0, Math.sin(t * 1.3)) ** 6;
      glint(g, ATELIER.x, ATELIER.y - 28 - 220 - 14 - 104 - 34, k, 18);
      glow(g, ATELIER.x, ATELIER.y - 400, 30, SUN, 0.03 * k, 3);
    }
    if (inView(view, PATENT_OFFICE.x, PATENT_OFFICE.y - 214)) glint(g, PATENT_OFFICE.x, PATENT_OFFICE.y - 214, Math.max(0, Math.sin(t * 0.9 + 1)) ** 8, 12);
    // Iron dust motes catching the noon over the grinding hall.
    if (inView(view, HALL.x, HALL.y - 80, 400)) {
      for (let i = 0; i < 16; i++) {
        const ph = (t * 0.05 + i * 0.0625) % 1;
        const x = HALL.x - 290 + ((i * 137) % 580) + Math.sin(t + i) * 8;
        const y = HALL.y - 20 - ph * 120;
        g.fillStyle(i % 3 ? IRON_LIT : BRASS, 0.5 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 1.2);
      }
    }
  },
};

export const WORKSHOP_AREA: AreaDef = {
  id: 'workshop',
  isle: 'light',
  court: 'workshop',
  name: 'The Workshop Court',
  subtitle: 'Every mirror on the Heliostat was ground true here',
  w: WORKSHOP_W,
  h: WORKSHOP_H,
  bg: LIME_DEEP,
  accent: WORKSHOP_COLOR,
  weather: 'prisms',
  spawn: { x: 200, y: ROW_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'noon', label: 'West along Grinders\' Row to the Noon Court' },
    { side: 's', to: 'arcane', label: 'Down the quench road to the Arcane Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 220, y: 690 } },
    { kind: 'prince', id: 'artifex', at: { x: ATELIER.x, y: ATELIER.y + 50 } },
    { kind: 'water', id: 'workshop-tank', shape: QUENCH_TANK, fishery: 'workshop-tank' },
    { kind: 'encounter', id: 'workshop-blueprint' },
    { kind: 'encounter', id: 'workshop-prototype' },
    { kind: 'encounter', id: 'workshop-glassblowing' },
    { kind: 'encounter', id: 'workshop-golem' },
    { kind: 'encounter', id: 'workshop-kinetic' },
    {
      kind: 'sign', at: { x: 400, y: 860 },
      text: 'THE WORKSHOP OF THE NOON. Every bench in sight of the sun. A thing made in the dark is not made.',
    },
    {
      kind: 'sign', at: { x: 600, y: 520 },
      text: 'PATENT OFFICE. Inventions that cast shade, store dark, or block the sun are refused, seized and melted.',
    },
    {
      kind: 'sign', at: { x: 1120, y: 1330 },
      text: 'QUENCH TANK. Mind the steam. Fishing tolerated. Anything pulled out belongs to the Workshop.',
    },
    {
      kind: 'sign', at: { x: 1800, y: 860 },
      text: 'CRANE YARD. Mirrors for the Heliostat. Stand clear of the load — it flashes, and it falls.',
    },
    { kind: 'chest', id: 'workshop-chest-cullet', at: { x: 120, y: 1540 }, coins: 140 },
    { kind: 'chest', id: 'workshop-chest-atelier', at: { x: 2220, y: 480 }, orbs: 3, open: { prince: 'artifex' } },
  ],
  npcs: WORKSHOP_NPCS,
  crowd: WORKSHOP_CROWD,
};
