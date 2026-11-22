import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../art/IsleArt';
import {
  cable, capPulse, chainFence, coolingPond, coolingTower, core, decayClock, decayHand, domeFlicker, engineHouse,
  glowcaps, glowWard, halflifeWaystone, hazardStripe, headframe, leadCask, leadHouse, oreTub, openPit, pitchGround,
  pitGlints, plumbery, pondSurface, pylon, pylonLugs, railTrack, reactorDome, rodStore, scramBell, sheaves, spoilRoad,
  stormFlash, tallyHouse, towerSteam, trefoil,
} from './art';
import {
  AMBER, CAP, CAP_DIM, CHEREN, COPPER, GLOW, GLOW_DEEP, HALFLIFE_COLOR, IRON_DARK,
  LEAD, LEAD_DARK, LEAD_LIT, NIGHT, PITCH, PITCH_DARK, PITCH_LIT, SPOIL_DARK, TIMBER, TIMBER_DARK,
} from './palette';
import { HALFLIFE_CROWD, HALFLIFE_NPCS } from './npcs';

/**
 * The Halflife Court — the glowing mining town east of Terminus, south of the Lodestar crag.
 *
 * Read it from the Terminus road in (west):
 * • **the Terminus road** comes in past the waystone and the hazard fence, between spoil heaps;
 * • **the pits** (north-west): the great open pitch-blende pit stepping down to its glowing seam,
 *   the headframe over the main shaft and its engine house, ore tubs on rails;
 * • **the Decay Square** (centre) round the Scram Bell, where the roads meet: the Tally House
 *   (every household's hod weighed against its Draw), Becquerel's stall, decay clocks on every
 *   corner — and the Ore Road running north out of it to the Lodestar;
 * • **the reactor** (north-east): Prince Isotope's Reactor Dome on its plinth, two cooling
 *   towers steaming, the Rod Store where the fresh rods are racked;
 * • **the cooling pond** (east) and the lane past the cask yard where Fissioner Uran works;
 * • **Leadrow** (south-west): two rows of miners' cottages under the Prince's lead — some of them
 *   stripped — with the Plumbery at the end, where lead is rolled and aprons cast;
 * • **the Glow Ward** and **the Glowcap Gardens** (south): the infirmary, and the fungus beds the
 *   town eats from.
 *
 * Night is permanent: the storm overhead never clears, so the only light is what the town makes.
 */

export const HALFLIFE_W = 2400;
export const HALFLIFE_H = 1600;

const WEST_Y = 800;
const NORTH_X = 1200;

/** The Decay Square, round the Scram Bell. */
export const SQUARE: Pt = { x: 1150, y: 820 };
const SQUARE_R = 170;
/** The open pit (an ellipse). */
export const PIT = { x: 500, y: 400, rx: 300, ry: 190 };
/** The headframe over the main shaft. */
export const HEADFRAME: Pt = { x: 860, y: 300 };
/** Prince Isotope's Reactor Dome — the middle of its front step. */
export const DOME: Pt = { x: 1850, y: 420 };
const DOME_W = 300;
/** The cooling pond — the court's fishing water. */
export const POND: Rect = { x: 1640, y: 1060, w: 460, h: 220 };
/** The Rod Store. */
export const ROD_STORE: Pt = { x: 1500, y: 620 };
/** The Tally House (front wall base). */
export const TALLY: Pt = { x: 880, y: 660 };
/** The Glow Ward (front wall base). */
export const WARD: Pt = { x: 1350, y: 1120 };
/** The Plumbery. */
export const PLUMBERY: Pt = { x: 1000, y: 1100 };
/** Widow Pewter's stripped house in Leadrow. */
export const PEWTER_HOUSE: Pt = { x: 380, y: 1060 };
/** The decay clocks on the corners: where they stand, and whose households they count. */
export const CLOCKS: (Pt & { no: number })[] = [
  { x: 1000, y: 965, no: 3 }, { x: 1310, y: 965, no: 7 }, { x: 1320, y: 690, no: 11 }, { x: 330, y: 745, no: 2 },
  { x: 470, y: 1215, no: 14 }, { x: 790, y: 1215, no: 19 }, { x: 1610, y: 760, no: 23 }, { x: 640, y: 1520, no: 27 },
];

type Piece = NonNullable<AreaPainter['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The reactor: dome, towers, rod store.
addPiece(DOME.x, DOME.y, 420, 420, (g, rng) => reactorDome(g, DOME.x, DOME.y, DOME_W, rng),
  { kind: 'rect', x: DOME.x - 175, y: DOME.y - 46, w: 350, h: 40 });
const TOWERS: [number, number, number][] = [[1530, 330, 0.8], [2220, 420, 1]];
for (const [x, y, s] of TOWERS) addPiece(x, y, 180 * s, 220 * s, (g) => coolingTower(g, x, y, s), { kind: 'circle', x, y: y - 10, r: 60 * s });
addPiece(ROD_STORE.x, ROD_STORE.y, 320, 110, (g) => rodStore(g, ROD_STORE.x, ROD_STORE.y),
  { kind: 'rect', x: ROD_STORE.x - 104, y: ROD_STORE.y - 26, w: 270, h: 28 });

// The cask yard on the east lane, where Uran stacks the spent fuel.
for (const [x, y, s, on] of [[2250, 720, 1, true], [2280, 760, 0.9, false], [2230, 800, 1.1, false], [2300, 830, 0.8, true], [2010, 840, 1, false]] as [number, number, number, boolean][]) {
  addPiece(x, y, 40, 50, (g) => leadCask(g, x, y, s, on), { kind: 'circle', x, y: y - 6, r: 13 });
}

// The pits: headframe, engine house, ore tubs, the props round the rim.
addPiece(HEADFRAME.x, HEADFRAME.y, 300, 260, (g) => headframe(g, HEADFRAME.x, HEADFRAME.y, 1),
  { kind: 'rect', x: HEADFRAME.x - 66, y: HEADFRAME.y - 22, w: 132, h: 22 });
addPiece(1040, 300, 160, 190, (g, rng) => engineHouse(g, 1040, 300, rng), { kind: 'rect', x: 978, y: 270, w: 124, h: 30 });
for (const [x, y, full] of [[720, 590, true], [770, 612, true], [850, 640, false]] as [number, number, boolean][]) {
  addPiece(x, y, 50, 50, (g) => oreTub(g, x, y, 1, full), { kind: 'circle', x, y: y - 8, r: 16 });
}
// Pit props: timber trestles round the rim.
for (let i = 0; i < 9; i++) {
  const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.9;
  const x = PIT.x + Math.cos(a) * (PIT.rx + 6), y = PIT.y + Math.sin(a) * (PIT.ry + 4);
  addPiece(x, y, 30, 50, (g) => {
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 8, y, x - 3, y - 30); g.lineBetween(x + 8, y, x + 3, y - 30);
    g.lineStyle(3, TIMBER, 1); g.lineBetween(x - 9, y - 28, x + 9, y - 28);
    if (i % 3 === 0) { g.fillStyle(GLOW, 0.9); g.fillCircle(x, y - 33, 2.5); glow(g, x, y - 33, 14, GLOW, 0.06, 2); }
  });
}
// The pit itself is solid (the benches are a long way down), as is the spoil round it.
solids.push({ kind: 'rect', x: PIT.x - PIT.rx + 30, y: PIT.y - PIT.ry + 20, w: PIT.rx * 2 - 60, h: PIT.ry * 2 - 40 });
solids.push({ kind: 'circle', x: PIT.x - PIT.rx + 40, y: PIT.y, r: 60 }, { kind: 'circle', x: PIT.x + PIT.rx - 40, y: PIT.y, r: 60 });
// Spoil heaps along the Terminus road.
const HEAPS: [number, number, number][] = [[300, 640, 60], [150, 1000, 70], [560, 940, 50]];
for (const [x, y, r] of HEAPS) {
  addPiece(x, y, r * 2.4, r * 1.4, (g, rng) => {
    g.fillStyle(SPOIL_DARK, 1); g.fillEllipse(x, y - r * 0.3, r * 2.4, r * 1.1);
    g.fillStyle(PITCH_LIT, 1); g.fillEllipse(x - r * 0.15, y - r * 0.5, r * 1.8, r * 0.8);
    g.fillStyle(PITCH, 1); g.fillEllipse(x - r * 0.3, y - r * 0.7, r, r * 0.4);
    for (let i = 0; i < 10; i++) { g.fillStyle(GLOW, 0.4 + rng() * 0.4); g.fillCircle(x + (rng() - 0.5) * r * 1.8, y - r * 0.3 - rng() * r * 0.5, 1.2 + rng()); }
  }, { kind: 'circle', x, y: y - r * 0.35, r: r * 0.9 });
}

// The waystone at the Terminus road.
addPiece(230, 852, 60, 100, (g) => halflifeWaystone(g, 230, 852), { kind: 'circle', x: 230, y: 846, r: 16 });

// The Decay Square: the Scram Bell, the Tally House, Becquerel's stall, the clocks.
addPiece(SQUARE.x, SQUARE.y, 90, 120, (g) => scramBell(g, SQUARE.x, SQUARE.y), { kind: 'circle', x: SQUARE.x, y: SQUARE.y - 4, r: 30 });
addPiece(TALLY.x, TALLY.y, 300, 160, (g, rng) => tallyHouse(g, TALLY.x, TALLY.y, rng), { kind: 'rect', x: TALLY.x - 132, y: TALLY.y - 30, w: 264, h: 30 });
/** Becquerel's stall: a lead-roofed barrow of charms and lead luck-pieces under a green lamp. */
const STALL: Pt = { x: 980, y: 950 };
addPiece(STALL.x, STALL.y, 160, 130, (g, rng) => {
  const { x, y } = STALL;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 4, 150, 26);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 60, y - 34, 120, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 58, y - 34, 116, 6);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 56 - 3, y - 96, 6, 92); }
  g.fillStyle(LEAD, 1); g.fillTriangle(x - 74, y - 90, x + 74, y - 90, x, y - 116);
  g.fillStyle(LEAD_LIT, 0.6); g.fillTriangle(x - 70, y - 91, x - 10, y - 91, x - 2, y - 112);
  hazardStripe(g, x - 74, y - 92, 148, 5);
  // Wares: lead charms on hooks, dosimeter badges, jars of glowcap.
  for (let i = 0; i < 7; i++) {
    const hx = x - 48 + i * 16;
    g.lineStyle(1, LEAD_LIT, 1); g.lineBetween(hx, y - 86, hx, y - 70);
    g.fillStyle(i % 2 ? AMBER : LEAD_LIT, 1); g.fillCircle(hx, y - 66, 4);
  }
  for (let i = 0; i < 4; i++) {
    const jx = x - 40 + i * 26;
    g.fillStyle(0xcfe8d8, 0.5); g.fillRoundedRect(jx - 7, y - 50, 14, 16, 3);
    g.fillStyle(CAP, 0.8); g.fillCircle(jx, y - 42, 3 + rng() * 2);
  }
  g.fillStyle(GLOW, 1); g.fillCircle(x + 50, y - 84, 4);
  glow(g, x + 50, y - 84, 30, GLOW, 0.06, 3);
}, { kind: 'rect', x: STALL.x - 62, y: STALL.y - 30, w: 124, h: 28 });
for (const c of CLOCKS) addPiece(c.x, c.y, 50, 120, (g) => decayClock(g, c.x, c.y, c.no), { kind: 'circle', x: c.x, y: c.y - 4, r: 9 });

// Leadrow: two rows of cottages. Some are switched off — their lead taken back.
const WALLS = [0x3a3430, 0x443a34, 0x332e2c, 0x4a4038];
const ROW1 = 1060, ROW2 = 1400;
const HOUSES: { x: number; y: number; off: boolean }[] = [
  { x: 220, y: ROW1, off: false }, { x: PEWTER_HOUSE.x, y: ROW1, off: true }, { x: 540, y: ROW1, off: false }, { x: 700, y: ROW1, off: false },
  { x: 220, y: ROW2, off: false }, { x: 380, y: ROW2, off: false }, { x: 540, y: ROW2, off: true }, { x: 700, y: ROW2, off: false }, { x: 860, y: ROW2, off: true },
];
HOUSES.forEach((h, i) => {
  addPiece(h.x, h.y, 150, 140, (g, rng) => { leadHouse(g, h.x, h.y, 112, 64, { wall: WALLS[i % WALLS.length], off: h.off, crank: i % 3 !== 1 }, rng); },
    { kind: 'rect', x: h.x - 58, y: h.y - 30, w: 116, h: 30 });
});
addPiece(PLUMBERY.x, PLUMBERY.y, 300, 170, (g, rng) => plumbery(g, PLUMBERY.x, PLUMBERY.y, rng),
  { kind: 'rect', x: PLUMBERY.x - 112, y: PLUMBERY.y - 30, w: 224, h: 30 });

// The cooling pond keeps you to its kerb.
solids.push({ kind: 'rect', x: POND.x - 16, y: POND.y - 16, w: POND.w + 32, h: POND.h + 32 });

// The Glow Ward and the Glowcap Gardens.
addPiece(WARD.x, WARD.y, 240, 150, (g, rng) => glowWard(g, WARD.x, WARD.y, rng), { kind: 'rect', x: WARD.x - 102, y: WARD.y - 30, w: 204, h: 30 });
/** The fungus beds: raised lead troughs of glowcap compost. */
export const BEDS: Rect[] = [
  { x: 960, y: 1300, w: 150, h: 46 }, { x: 1250, y: 1300, w: 150, h: 46 },
  { x: 960, y: 1430, w: 150, h: 46 }, { x: 1250, y: 1430, w: 150, h: 46 },
];
const CAP_SPOTS: Pt[] = [];
for (const b of BEDS) {
  addPiece(b.x + b.w / 2, b.y + b.h, b.w + 20, 60, (g, rng) => {
    g.fillStyle(LEAD_DARK, 1); g.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    g.fillStyle(LEAD, 1); g.fillRect(b.x - 4, b.y - 4, b.w + 8, 3);
    g.fillStyle(PITCH_DARK, 1); g.fillRect(b.x, b.y, b.w, b.h);
    for (let k = 0; k < 4; k++) glowcaps(g, b.x + 20 + k * ((b.w - 40) / 3), b.y + b.h - 8, 5, rng, 0.9);
  }, { kind: 'rect', x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 });
  CAP_SPOTS.push({ x: b.x + b.w / 2, y: b.y + b.h - 6 });
}
// Wild glowcaps in the gutters all over town.
const WILD_CAPS: Pt[] = [
  { x: 120, y: 700 }, { x: 640, y: 760 }, { x: 1080, y: 1060 }, { x: 1450, y: 980 }, { x: 2280, y: 1120 }, { x: 2300, y: 1450 },
  { x: 1560, y: 1480 }, { x: 860, y: 1520 }, { x: 120, y: 1290 }, { x: 1640, y: 560 }, { x: 2330, y: 560 },
];
for (const c of WILD_CAPS) {
  addPiece(c.x, c.y, 40, 30, (g, rng) => glowcaps(g, c.x, c.y, 4, rng, 0.8));
  CAP_SPOTS.push(c);
}

// The pylons carrying the Grid over the town, and the cables strung between them.
const PYLON_H = 150;
const PYLONS: Pt[] = [
  { x: 60, y: 1080 }, { x: 640, y: 720 }, { x: 1300, y: 560 }, { x: 1640, y: 900 }, { x: 2220, y: 1080 },
  { x: 2280, y: 1340 }, { x: 1560, y: 1380 }, { x: 860, y: 1300 }, { x: 140, y: 1200 },
];
for (const p of PYLONS) addPiece(p.x, p.y, 90, PYLON_H + 20, (g) => pylon(g, p.x, p.y, PYLON_H), { kind: 'circle', x: p.x, y: p.y - 6, r: 18 });
const CABLES: { a: Pt; b: Pt; sag: number; seed: number }[] = [];
for (let i = 1; i < PYLONS.length; i++) {
  const A = pylonLugs(PYLONS[i - 1].x, PYLONS[i - 1].y, PYLON_H), B = pylonLugs(PYLONS[i].x, PYLONS[i].y, PYLON_H);
  for (let k = 0; k < 4; k++) CABLES.push({ a: A[k], b: B[k], sag: 30 + k * 4, seed: i * 0.7 + k * 0.4 });
}
// The dome's feeders: fat cables off the crown to the nearest pylons.
const CROWN: Pt = { x: DOME.x, y: DOME.y - 27 - DOME_W * 0.34 - (DOME_W / 2 + 6) * 0.625 - 20 };
for (const p of [PYLONS[2], PYLONS[3]]) for (const l of pylonLugs(p.x, p.y, PYLON_H).slice(0, 2)) CABLES.push({ a: CROWN, b: l, sag: 50, seed: l.x * 0.01 });

// Hazard fence along the pit side of the Terminus road.
addPiece(450, 660, 500, 40, (g) => chainFence(g, { x: 200, y: 660 }, { x: 700, y: 660 }));

// ── The edges: black crag north, east and south; open at the two roads ─

const GAP = 90;
solids.push({ kind: 'rect', x: 0, y: 0, w: NORTH_X - GAP, h: 60 });
solids.push({ kind: 'rect', x: NORTH_X + GAP, y: 0, w: HALFLIFE_W - NORTH_X - GAP, h: 60 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 34, h: WEST_Y - GAP });
solids.push({ kind: 'rect', x: 0, y: WEST_Y + GAP, w: 34, h: HALFLIFE_H - WEST_Y - GAP });
solids.push({ kind: 'rect', x: HALFLIFE_W - 34, y: 0, w: 34, h: HALFLIFE_H });
solids.push({ kind: 'rect', x: 0, y: HALFLIFE_H - 40, w: HALFLIFE_W, h: 40 });
// The crag along the north and south, as pieces so it stands over walkers along it.
for (const [x0, x1] of [[0, NORTH_X - GAP], [NORTH_X + GAP, HALFLIFE_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, 60, x1 - x0, 90, (g, rng) => crag(g, x0, x1, 60, 70, rng));
}
addPiece(HALFLIFE_W / 2, HALFLIFE_H, HALFLIFE_W, 60, (g, rng) => crag(g, 0, HALFLIFE_W, HALFLIFE_H, 46, rng));

/** A wall of black crag with lightning rods on its high points. */
function crag(g: G, x0: number, x1: number, base: number, h: number, rng: () => number): void {
  g.fillStyle(PITCH_DARK, 1); g.fillRect(x0, base - h * 0.5, x1 - x0, h * 0.5);
  for (let x = x0; x < x1; x += 34 + rng() * 30) {
    const ph = h * (0.6 + rng() * 0.5), pw = 40 + rng() * 40;
    g.fillStyle(PITCH_DARK, 1); g.fillTriangle(x - pw / 2, base, x + pw / 2, base, x + (rng() - 0.5) * 10, base - ph);
    g.fillStyle(PITCH_LIT, 0.7); g.fillTriangle(x - pw / 2, base, x - pw * 0.1, base, x + (rng() - 0.5) * 6, base - ph * 0.96);
    if (rng() < 0.18) {
      g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, base - ph, x, base - ph - 26);
      g.fillStyle(COPPER, 1); g.fillCircle(x, base - ph - 26, 2);
    }
    if (rng() < 0.3) { g.fillStyle(GLOW, 0.5); g.fillCircle(x + (rng() - 0.5) * pw * 0.5, base - ph * 0.4, 1.4); }
  }
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = HALFLIFE_W, H = HALFLIFE_H;
    pitchGround(g, { x: 0, y: 0, w: W, h: H }, rng);
    // A wash of green where the ore lies near the surface.
    for (const [x, y, r] of [[500, 420, 420], [1850, 600, 300], [600, 1250, 360], [1200, 1380, 260]] as [number, number, number][]) {
      for (let k = 0; k < 4; k++) { g.fillStyle(GLOW_DEEP, 0.12); g.fillEllipse(x, y, r * (2 - k * 0.4), r * (1.2 - k * 0.25)); }
    }

    // Roads.
    spoilRoad(g, [{ x: 0, y: WEST_Y }, { x: 520, y: 790 }, { x: SQUARE.x - SQUARE_R + 20, y: 810 }], 86, rng);
    spoilRoad(g, [{ x: NORTH_X, y: SQUARE.y - SQUARE_R + 20 }, { x: NORTH_X, y: 380 }, { x: NORTH_X, y: 0 }], 84, rng);
    spoilRoad(g, [{ x: SQUARE.x + SQUARE_R - 30, y: 760 }, { x: 1560, y: 700 }, { x: 1720, y: 520 }, { x: DOME.x, y: DOME.y + 50 }], 72, rng);
    spoilRoad(g, [{ x: SQUARE.x, y: SQUARE.y + SQUARE_R - 20 }, { x: SQUARE.x, y: 1230 }, { x: 1180, y: 1540 }], 72, rng);
    spoilRoad(g, [{ x: 120, y: 1230 }, { x: 600, y: 1230 }, { x: SQUARE.x, y: 1230 }, { x: 1500, y: 1230 }, { x: 1580, y: 1170 }], 64, rng);
    spoilRoad(g, [{ x: 120, y: 1560 }, { x: 860, y: 1560 }], 48, rng);
    spoilRoad(g, [{ x: 300, y: 790 }, { x: 300, y: 1230 }], 50, rng);
    spoilRoad(g, [{ x: 860, y: 1230 }, { x: 860, y: 1560 }], 46, rng);
    spoilRoad(g, [{ x: DOME.x + 60, y: DOME.y + 60 }, { x: 2130, y: 640 }, { x: 2130, y: 1000 }, { x: 2160, y: 1360 }], 60, rng);
    spoilRoad(g, [{ x: 1300, y: 900 }, { x: 1640, y: 980 }, { x: 2130, y: 990 }], 56, rng);
    spoilRoad(g, [{ x: 700, y: 640 }, { x: 980, y: 700 }], 50, rng);
    spoilRoad(g, [{ x: HEADFRAME.x, y: HEADFRAME.y + 20 }, { x: 980, y: 420 }, { x: NORTH_X - 30, y: 440 }], 50, rng);
    // Rails: from the pit ramp past the Tally House to the dome's ore hoist.
    railTrack(g, [{ x: 690, y: 580 }, { x: 780, y: 640 }, { x: 880, y: 690 }, { x: 1080, y: 720 }, { x: 1440, y: 690 }, { x: 1680, y: 560 }, { x: 1700, y: 470 }]);
    railTrack(g, [{ x: HEADFRAME.x, y: HEADFRAME.y + 6 }, { x: 800, y: 470 }, { x: 760, y: 580 }]);

    // The Decay Square: cast slabs round the bell, a ring of hazard paint, the trefoil inlaid.
    g.fillStyle(SPOIL_DARK, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2 + 20, SQUARE_R * 1.5 + 20);
    g.fillStyle(0x6e6a60, 1); g.fillEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 2, SQUARE_R * 1.5);
    for (let r = 50; r < SQUARE_R; r += 40) { g.lineStyle(1, 0x4e4a42, 0.7); g.strokeEllipse(SQUARE.x, SQUARE.y, r * 2, r * 1.5); }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.lineStyle(1, 0x4e4a42, 0.7); g.lineBetween(SQUARE.x + Math.cos(a) * 50, SQUARE.y + Math.sin(a) * 37, SQUARE.x + Math.cos(a) * SQUARE_R, SQUARE.y + Math.sin(a) * SQUARE_R * 0.75);
    }
    g.lineStyle(6, AMBER, 0.5); g.strokeEllipse(SQUARE.x, SQUARE.y, SQUARE_R * 1.7, SQUARE_R * 1.27);
    trefoil(g, SQUARE.x, SQUARE.y + 60, 30, dim(AMBER, 0.2), undefined, 0.35);

    // The pit, its rim, a spill of ore down to the rails.
    openPit(g, PIT.x, PIT.y, PIT.rx, PIT.ry, rng);
    // Reactor forecourt: lead-tiled, hazard-ringed.
    for (let y = DOME.y - 10; y < DOME.y + 90; y += 20) {
      for (let x = DOME.x - 200; x < DOME.x + 200; x += 20) {
        g.fillStyle(((x + y) / 20) % 2 ? LEAD_DARK : LEAD, 0.9); g.fillRect(x, y, 20, 20);
      }
    }
    hazardStripe(g, DOME.x - 200, DOME.y + 88, 400, 8, 0.8);
    // The cooling pond and the outfall culvert from the dome.
    coolingPond(g, POND, rng);
    g.lineStyle(26, LEAD_DARK, 1); g.lineBetween(2060, 640, 2060, POND.y - 16);
    g.lineStyle(18, LEAD, 1); g.lineBetween(2060, 640, 2060, POND.y - 16);
    for (let y = 660; y < POND.y - 20; y += 40) { g.fillStyle(LEAD_LIT, 1); g.fillRect(2048, y, 24, 3); }
    // Leadrow's back yards: slag paths, washing lines of lead aprons are in the pieces.
    for (const h of HOUSES) { g.fillStyle(PITCH_LIT, 0.5); g.fillRect(h.x - 62, h.y - 4, 124, 18); }
    // The Glowcap Gardens: compost spill, glowing.
    g.fillStyle(GLOW_DEEP, 0.4); g.fillEllipse(1180, 1390, 560, 260);
    for (let i = 0; i < 160; i++) { g.fillStyle(rng() < 0.6 ? CAP_DIM : CAP, 0.25 + rng() * 0.3); g.fillCircle(920 + rng() * 520, 1280 + rng() * 220, 1 + rng() * 1.5); }
    // The Plumbery's yard: lead drips and swarf.
    for (let i = 0; i < 60; i++) { g.fillStyle(LEAD_LIT, 0.3 + rng() * 0.3); g.fillEllipse(900 + rng() * 220, 1110 + rng() * 60, 3 + rng() * 6, 2); }
    // The Rod Store's apron: hazard hatching.
    hazardStripe(g, ROD_STORE.x - 110, ROD_STORE.y + 6, 220, 8, 0.7);
    // The waystone's slab.
    g.fillStyle(0x6e6a60, 1); g.fillEllipse(230, 885, 90, 36);
    g.lineStyle(2, AMBER, 0.6); g.strokeEllipse(230, 885, 90, 36);
  },

  pieces,

  animate(g, t, view) {
    if (inView(DOME.x, DOME.y - 120, view, 360)) domeFlicker(g, DOME.x, DOME.y, DOME_W, t);
    if (inView(PIT.x, PIT.y, view, 340)) pitGlints(g, PIT.x, PIT.y, PIT.rx * 0.3, PIT.ry * 0.3, t);
    if (inView(POND.x + POND.w / 2, POND.y + POND.h / 2, view, 300)) {
      pondSurface(g, POND, t);
      // A glow gar, a slow green streak under the surface.
      const gx = POND.x + POND.w / 2 + Math.cos(t * 0.5) * 170, gy = POND.y + POND.h / 2 + Math.sin(t * 0.5) * 60;
      const a = t * 0.5 + Math.PI / 2;
      g.fillStyle(GLOW, 0.4); g.fillEllipse(gx, gy, 26, 6);
      g.lineStyle(1.5, GLOW, 0.3); g.lineBetween(gx, gy, gx - Math.cos(a) * 20, gy - Math.sin(a) * 6);
    }
    for (const c of CLOCKS) if (inView(c.x, c.y, view)) decayHand(g, c.x, c.y, t, c.no * 0.13);
    for (let i = 0; i < CAP_SPOTS.length; i++) { const c = CAP_SPOTS[i]; if (inView(c.x, c.y, view)) capPulse(g, c.x, c.y, t, i * 0.9); }
    // The Rod Store hums: a slow pulse along the racked rods.
    if (inView(ROD_STORE.x, ROD_STORE.y, view, 200)) {
      const k = (t * 0.8) % 1;
      g.fillStyle(GLOW, 0.12 * Math.sin(k * Math.PI)); g.fillRect(ROD_STORE.x - 70 + k * 130, ROD_STORE.y - 62, 16, 48);
    }
    // Ore tubs breathing green.
    if (inView(760, 600, view, 160)) core(g, 745, 572, 2, GLOW, 0.4 + Math.sin(t * 2) * 0.2);
    // The Scram Bell's striker, sparking.
    if (inView(SQUARE.x, SQUARE.y, view)) {
      const k = Math.max(0, Math.sin(t * 5)) ** 8;
      if (k > 0.1) { g.fillStyle(CHEREN, 0.6 * k); g.fillCircle(SQUARE.x + 22, SQUARE.y - 68, 6); }
    }
  },

  animateOver(g, t, view) {
    for (const c of CABLES) if (inView((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2, view, 500)) cable(g, c.a, c.b, c.sag, t, c.seed);
    for (const [x, y, s] of TOWERS) if (inView(x, y - 200 * s, view, 300)) towerSteam(g, x, y - 200 * s, t, s);
    if (inView(HEADFRAME.x, HEADFRAME.y - 230, view, 200)) sheaves(g, HEADFRAME.x, HEADFRAME.y, t, 1);
    // Spores lifting off the gardens.
    if (inView(1180, 1380, view, 300)) {
      for (let i = 0; i < 18; i++) {
        const ph = (t * 0.1 + i / 18) % 1;
        g.fillStyle(lit(CAP, 0.3), 0.5 * Math.sin(ph * Math.PI));
        g.fillCircle(960 + ((i * 131) % 440) + Math.sin(t + i) * 10, 1460 - ph * 160, 1.3);
      }
    }
    // Lamp-glow over the Tally hatch, green on the square.
    if (inView(TALLY.x, TALLY.y, view)) glow(g, TALLY.x + 64, TALLY.y - 46, 40, GLOW, 0.025, 2);
    stormFlash(g, view, t);
  },
};

export const HALFLIFE_AREA: AreaDef = {
  id: 'halflife',
  isle: 'electricity',
  court: 'halflife',
  name: 'The Halflife Court',
  subtitle: 'Everything halves. Your Draw does not.',
  w: HALFLIFE_W,
  h: HALFLIFE_H,
  bg: NIGHT,
  accent: HALFLIFE_COLOR,
  weather: 'glow',
  gloom: 0.35,
  spawn: { x: 160, y: 780 },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'terminus', label: 'The Terminus road, down to the harbour' },
    { side: 'n', to: 'lodestar', label: 'The Ore Road north to the Lodestar' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 230, y: 885 } },
    { kind: 'prince', id: 'isotope', at: { x: DOME.x, y: DOME.y + 50 } },
    { kind: 'water', id: 'halflife-pond', shape: POND, fishery: 'halflife-pond' },
    { kind: 'encounter', id: 'halflife-half-life' },
    { kind: 'encounter', id: 'halflife-geiger' },
    { kind: 'encounter', id: 'halflife-chain-reaction' },
    { kind: 'encounter', id: 'halflife-lead-shield' },
    { kind: 'encounter', id: 'halflife-mutation' },
    {
      kind: 'sign', at: { x: 330, y: 840 },
      text: 'HALFLIFE. The Draw is paid in ore: one hod a household, weighed at the Tally House before the Bell.',
    },
    {
      kind: 'sign', at: { x: 760, y: 700 },
      text: 'THE PITS. Badges to be worn and read. A hot badge is a hot miner. Hot miners do not go home.',
    },
    {
      kind: 'sign', at: { x: 1700, y: 540 },
      text: 'THE REACTOR DOME. By order of Prince Isotope: no flame, no noise, no touching. He will know.',
    },
    {
      kind: 'sign', at: { x: 160, y: 1230 },
      text: 'LEADROW. Roof lead is lent by His Highness to households in good standing. Lead is recalled when Draw is short.',
    },
    { kind: 'chest', id: 'halflife-chest-pit', at: { x: 120, y: 470 }, coins: 110 },
    { kind: 'chest', id: 'halflife-chest-dome', at: { x: 2320, y: 620 }, orbs: 3, open: { prince: 'isotope' } },
  ],
  npcs: HALFLIFE_NPCS,
  crowd: HALFLIFE_CROWD,
};

