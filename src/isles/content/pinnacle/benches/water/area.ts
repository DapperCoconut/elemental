import type { AreaDef, NpcDef, Poi, Solid } from '../../../../IslesTypes';
import { type G, glow, mulberry } from '../../../../art/IsleArt';
import { OBS, councilMask, crackPath, glassFloor, seam, shard, slab } from '../../../../art/PinnacleArt';
import { BENCHES, above, below, benchIntroId, relicId, seatId } from '../../spec';
import {
  glassSteps, seaPane, seatChair, serpent, sleeper, splashRing, stillPool, tideClockBody, tideClockDial, tideClockWorks,
  tideCurve, tideInlay, titheCoin, whale,
} from './art';
import { SEAT_AT } from './councilors';
import { BRASS, BRASS_DARK, BRASS_LIT, FOAM, SEA_HIGH, STILL, TIDE, TIDE_DEEP, TIDE_LIT, TIDE_PALE, VERDIGRIS } from './palette';

/**
 * THE TIDE BENCH — the second bench of the Obsidian Pinnacle, where the Undertow was written.
 *
 * A drowned chamber, climbed south to north. Both long walls are windows onto the open sea at
 * depth: kelp, far reefs, shafts of light from a surface a long way up, and huge things going by —
 * a whale up the west glass, a serpent down the east, and now and then an eye at the north window.
 * Glass stairs go down into two basins of still black water. In the middle stands the set piece:
 * THE TIDE-CLOCK, a brass-and-glass orrery of moons full of sea turning round a sea-globe, which
 * set the hours of every high water the Queen ever loosed. Six seats climb the room along the
 * windows; a clerk still winds the clock; a woman waits at the counting-window to pay a tithe that
 * no longer exists. The stair north is veiled in violet glass until all six seats are empty.
 */

const B = BENCHES.find((b) => b.isle === 'water')!;
const W = 1600;
const H = 2000;
const L = 200;
const R = 1400;
const MID = 800;

const CLOCK = { x: MID, y: 1070 };
const WEST_BASIN = { x: 250, y: 1190, w: 350, h: 210 };
const EAST_BASIN = { x: 1030, y: 450, w: 340, h: 190 };
const DESK = { x: 960, y: 1120 };
const COUNTER = { x: 560, y: 1730 };
const GAUGES = [{ x: 640, y: 640 }, { x: 1000, y: 1520 }, { x: 960, y: 330 }, { x: 600, y: 1520 }];
const CAGES = [{ x: 640, y: 1180 }, { x: 1000, y: 690 }];
const POSTS = [{ x: 330, y: 1300 }, { x: 520, y: 1360 }, { x: 1180, y: 560 }];

// ── Solids ───────────────────────────────────────────────────────────

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: 700 - L, h: 130 },
  { kind: 'rect', x: 900, y: 0, w: R - 900, h: 130 },
  { kind: 'rect', x: L, y: 1950, w: 700 - L, h: 50 },
  { kind: 'rect', x: 900, y: 1950, w: R - 900, h: 50 },
  { kind: 'rect', ...WEST_BASIN },
  { kind: 'rect', ...EAST_BASIN },
  { kind: 'circle', x: CLOCK.x, y: CLOCK.y - 50, r: 100 },
  { kind: 'rect', x: DESK.x - 55, y: DESK.y - 26, w: 110, h: 24 },
  { kind: 'rect', x: COUNTER.x - 80, y: COUNTER.y - 30, w: 160, h: 28 },
];
for (const el of B.elements) { const a = SEAT_AT[el]; solids.push({ kind: 'rect', x: a.x - 60, y: a.y - 64, w: 120, h: 40 }); }
for (const p of GAUGES) solids.push({ kind: 'circle', x: p.x, y: p.y - 4, r: 10 });
for (const p of CAGES) solids.push({ kind: 'circle', x: p.x, y: p.y - 8, r: 20 });

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  glassFloor(g, L, 120, R - L, H - 120, 80, rng);
  // The aisle: a runner of brighter glass from the south stair to the north, past the clock.
  g.fillStyle(OBS.facet, 0.35); g.fillRect(MID - 70, 130, 140, H - 180);
  g.lineStyle(1.2, OBS.edge, 0.3); g.lineBetween(MID - 70, 130, MID - 70, H - 50); g.lineBetween(MID + 70, 130, MID + 70, H - 50);
  // Caustics: the sea's light lying on the floor along both windows.
  for (let i = 0; i < 60; i++) {
    const west = i % 2 === 0, x = west ? L + 10 + rng() * 220 : R - 10 - rng() * 220, y = 140 + rng() * (H - 200);
    g.fillStyle(TIDE, 0.03 + rng() * 0.03); g.fillEllipse(x, y, 60 + rng() * 120, 14 + rng() * 16);
  }
  // Tide-lines inlaid: long braids running up the room, gathering into the clock's dial.
  for (let i = 0; i < 6; i++) {
    const sx = L + 60 + i * ((R - L - 120) / 5);
    tideInlay(g, tideCurve({ x: sx, y: H - 60 }, { x: CLOCK.x + (i - 2.5) * 30, y: CLOCK.y + 30 }, 26, 20, i), 0.35);
    tideInlay(g, tideCurve({ x: CLOCK.x + (i - 2.5) * 30, y: CLOCK.y - 120 }, { x: sx, y: 160 }, 22, 20, i + 2), 0.3);
  }
  // Violet cracks where the sea leans on the floor.
  for (let i = 0; i < 22; i++) {
    const a = { x: L + 30 + rng() * (R - L - 60), y: 160 + rng() * (H - 240) };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 180, y: a.y + (rng() - 0.5) * 120 }, rng, 8, 5), 0.9, 0.45);
  }
  // Puddles of sea on the glass.
  for (let i = 0; i < 30; i++) {
    const px = L + 30 + rng() * (R - L - 60), py = 160 + rng() * (H - 240), rw = 24 + rng() * 50;
    g.fillStyle(STILL, 0.55); g.fillEllipse(px, py, rw, rw * 0.35);
    g.fillStyle(TIDE_LIT, 0.18); g.fillRect(px - rw * 0.2, py - 1.5, rw * 0.35, 1.5);
  }
  // The window-walls: panes of open sea, deeper toward the north.
  for (let y = 10; y < H - 20; y += 250) {
    const depth = 1 - y / H;
    seaPane(g, 16, y, L - 32, 230, rng, 0.25 + depth * 0.55);
    seaPane(g, R + 16, y, W - R - 32, 230, rng, 0.25 + depth * 0.55);
  }
  for (const [x0, x1] of [[L, 700], [900, R]]) for (let x = x0 + 10; x < x1 - 10; x += 170) seaPane(g, x, 8, Math.min(150, x1 - 10 - x), 104, rng, 0.85);
  // The sills: a lip of black glass where floor meets window, a tide-seam along it.
  g.fillStyle(OBS.glass, 1); g.fillRect(L - 12, 0, 12, H); g.fillRect(R, 0, 12, H); g.fillRect(L, 112, R - L, 18);
  g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(L, 0, L, H); g.lineBetween(R, 0, R, H); g.lineBetween(L, 130, R, 130);
  seam(g, [{ x: L + 4, y: 130 }, { x: L + 4, y: H - 50 }], 1, 0.35, 0, TIDE);
  seam(g, [{ x: R - 4, y: 130 }, { x: R - 4, y: H - 50 }], 1, 0.35, 0, TIDE);
  // The two basins: glass stairs going down into still black water.
  stillPool(g, WEST_BASIN.x, WEST_BASIN.y, WEST_BASIN.w, WEST_BASIN.h, rng);
  glassSteps(g, WEST_BASIN.x, WEST_BASIN.y - 40, WEST_BASIN.w, 10, 6, 's');
  glassSteps(g, WEST_BASIN.x + WEST_BASIN.w + 40, WEST_BASIN.y, WEST_BASIN.h, 10, 6, 'w');
  stillPool(g, EAST_BASIN.x, EAST_BASIN.y, EAST_BASIN.w, EAST_BASIN.h, rng);
  glassSteps(g, EAST_BASIN.x, EAST_BASIN.y + EAST_BASIN.h + 40, EAST_BASIN.w, 10, 6, 'n');
  glassSteps(g, EAST_BASIN.x - 40, EAST_BASIN.y, EAST_BASIN.h, 10, 6, 'e');
  // Drowned things down in the basins: a sunk railing, a chain, and coins — so many coins.
  for (const b of [WEST_BASIN, EAST_BASIN]) {
    for (let i = 0; i < 18; i++) titheCoin(g, b.x + 20 + rng() * (b.w - 40), b.y + 30 + rng() * (b.h - 50), 3 + rng() * 2, 0.25);
    g.lineStyle(2, TIDE_DEEP, 0.6);
    for (let i = 0; i < 8; i++) g.strokeEllipse(b.x + 40 + i * 12, b.y + b.h * 0.6 + Math.sin(i) * 6, 8, 5);
  }
  // The Tide-Clock's dial, inlaid round its foot.
  tideClockDial(g, CLOCK.x, CLOCK.y, 1, rng);
  // Under each seat a slick of sea-light.
  for (const el of B.elements) { const a = SEAT_AT[el]; glow(g, a.x, a.y - 30, 90, TIDE, 0.04, 3); }
  // The north stair: black glass steps climbing toward the light, a seam up each rail.
  for (let i = 0; i < 9; i++) {
    const y = 130 - i * 14;
    g.fillStyle(i % 2 ? OBS.facet : OBS.sheen, 1); g.fillRect(708 + i * 2, y - 14, 184 - i * 4, 14);
    g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(708 + i * 2, y - 14, 892 - i * 2, y - 14);
  }
  // The south stair going down to the bench below, into the dark.
  for (let i = 0; i < 4; i++) {
    const y = 1950 + i * 12;
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1); g.fillRect(700 + i * 4, y, 200 - i * 8, 12);
    g.lineStyle(1, OBS.edge, 0.5 - i * 0.1); g.lineBetween(700 + i * 4, y, 900 - i * 4, y);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

/** A brass tide-gauge: a tall staff marked in tide-hours, high-water lines in blue, a float on it. */
function gauge(g: G, x: number, y: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 2, 34, 10);
  slab(g, x, y, 28, 12);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 5, y - 150, 10, 140);
  g.fillStyle(BRASS, 1); g.fillRect(x - 4, y - 150, 5, 140);
  for (let i = 0; i < 14; i++) { g.lineStyle(1, BRASS_LIT, 0.9); g.lineBetween(x - 5, y - 20 - i * 9, x + (i % 2 ? 2 : 6), y - 20 - i * 9); }
  // The marks of the worst high waters, scratched in blue.
  for (let i = 0; i < 3; i++) { const my = y - 60 - rng() * 80; seam(g, [{ x: x - 9, y: my }, { x: x + 9, y: my }], 0.8, 0.8, 0, TIDE); }
  g.fillStyle(VERDIGRIS, 0.5); g.fillRect(x - 5, y - 40, 10, 8);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 154, 5);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y - 92, 18, 10);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeEllipse(x, y - 92, 18, 10);
}

/** A burst bubble-cage: the brass hoops a sleeper was kept in, sprung open and empty now. */
function cage(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y, 60, 16);
  slab(g, x, y, 54, 10);
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.5;
    g.lineStyle(3, BRASS_DARK, 1);
    g.beginPath(); g.arc(x + (i - 1.5) * 8, y - 40, 34, a - 1.1, a + 0.4 + (i % 2) * 0.5, false); g.strokePath();
    g.lineStyle(1.2, BRASS_LIT, 0.8);
    g.beginPath(); g.arc(x + (i - 1.5) * 8, y - 41, 34, a - 1.1, a + 0.4 + (i % 2) * 0.5, false); g.strokePath();
  }
  // Shards of the bubble's glass round the foot.
  for (let i = 0; i < 6; i++) { g.fillStyle(TIDE_PALE, 0.35); g.fillTriangle(x - 30 + i * 12, y + 2, x - 24 + i * 12, y - 6, x - 20 + i * 12, y + 3); }
  g.lineStyle(1.5, TIDE_LIT, 0.4); g.strokeCircle(x, y - 40, 22);
}

/** A half-sunk mooring post in a basin, chain trailing down into the black. */
function post(g: G, x: number, y: number): void {
  g.fillStyle(TIDE_DEEP, 0.4); g.fillEllipse(x, y, 40, 12);
  shard(g, x, y, 22, 64, 4, 0.3);
  g.lineStyle(2, 0x2a2a34, 1);
  for (let i = 0; i < 5; i++) g.strokeEllipse(x + 10 + i * 6, y - 20 + i * 6, 6, 4);
  g.lineStyle(1.5, FOAM, 0.4); g.strokeEllipse(x, y, 30, 8);
}

/** The counting-window where the Dry Tithe was paid: an obsidian counter, a brass grille, a coin-tray. */
function counter(g: G, x: number, y: number, rng: () => number): void {
  slab(g, x, y, 170, 34, rng, 1);
  // The grille rising from the counter's back, a hatch in it.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 76, y - 120, 152, 88);
  g.lineStyle(1.2, OBS.edge, 0.5); g.strokeRect(x - 76, y - 120, 152, 88);
  for (let i = 0; i < 12; i++) { g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x - 70 + i * 12.5, y - 116, x - 70 + i * 12.5, y - 36); g.lineStyle(1, BRASS_LIT, 0.6); g.lineBetween(x - 71 + i * 12.5, y - 116, x - 71 + i * 12.5, y - 36); }
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 22, y - 70, 44, 34);
  g.lineStyle(1.5, BRASS, 1); g.strokeRect(x - 22, y - 70, 44, 34);
  councilMask(g, x, y - 104, 10, { alpha: 0.9 });
  // The coin-tray, and the tithe-ledger chained to the counter.
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 32, 50, 12);
  titheCoin(g, x - 6, y - 34, 4); titheCoin(g, x + 7, y - 33, 4);
  g.fillStyle(0x1a1a24, 1); g.fillRect(x + 40, y - 44, 34, 12);
  g.fillStyle(0xd8dce4, 0.8); g.fillRect(x + 42, y - 42, 30, 8);
  g.lineStyle(1, 0x3a3a48, 1); for (let i = 0; i < 3; i++) g.lineBetween(x + 45, y - 40 + i * 2.5, x + 69, y - 40 + i * 2.5);
}

/** The winder's desk: a slab heaped with tide-tables, an hourglass of sea, a great brass key. */
function desk(g: G, x: number, y: number, rng: () => number): void {
  slab(g, x, y, 116, 30, rng, 1);
  for (let i = 0; i < 5; i++) {
    const sx = x - 44 + i * 14, h = 6 + rng() * 14;
    g.fillStyle(i % 2 ? 0xc8ccd4 : 0xa8aeb8, 1); g.fillRect(sx, y - 30 - h, 26, h);
    g.lineStyle(1, 0x5a6070, 0.6); g.lineBetween(sx + 3, y - 30 - h + 3, sx + 22, y - 30 - h + 3);
  }
  g.fillStyle(BRASS, 1); g.fillRect(x + 26, y - 64, 18, 4); g.fillRect(x + 26, y - 34, 18, 4);
  g.fillStyle(TIDE, 0.7); g.fillTriangle(x + 28, y - 60, x + 42, y - 60, x + 35, y - 48); g.fillTriangle(x + 35, y - 48, x + 28, y - 34, x + 42, y - 34);
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x - 50, y - 34, x - 16, y - 40);
  g.lineStyle(1.4, BRASS_LIT, 1); g.lineBetween(x - 50, y - 35, x - 16, y - 41);
  g.lineStyle(3, BRASS, 1); g.strokeCircle(x - 54, y - 33, 6);
}

/** A pilaster along the window: a leaning shard with a tide-seam up it. */
function pilaster(g: G, x: number, y: number, lean: number): void {
  shard(g, x, y, 48, 210, lean, 0.25);
  seam(g, [{ x: x + 2, y: y - 10 }, { x: x + lean * 0.3 + 4, y: y - 90 }, { x: x + lean * 0.7, y: y - 170 }], 1, 0.5, 0, TIDE);
}

const pieceRng = (seed: number) => mulberry(seed);

const pieces: NonNullable<AreaDef['painter']['pieces']> = [
  ...B.elements.map((el, i) => {
    const a = SEAT_AT[el];
    return { x: a.x, y: a.y - 26, w: 160, h: 260, draw: (g: G) => seatChair(g, a.x, a.y - 26, 1, el, pieceRng(31 + i)) };
  }),
  { x: CLOCK.x, y: CLOCK.y, w: 260, h: 300, draw: (g: G) => tideClockBody(g, CLOCK.x, CLOCK.y, 1, pieceRng(7)) },
  { x: DESK.x, y: DESK.y, w: 140, h: 90, draw: (g: G) => desk(g, DESK.x, DESK.y, pieceRng(11)) },
  { x: COUNTER.x, y: COUNTER.y, w: 180, h: 140, draw: (g: G) => counter(g, COUNTER.x, COUNTER.y, pieceRng(13)) },
  ...GAUGES.map((p, i) => ({ x: p.x, y: p.y, w: 40, h: 170, draw: (g: G) => gauge(g, p.x, p.y, pieceRng(17 + i)) })),
  ...CAGES.map((p) => ({ x: p.x, y: p.y, w: 80, h: 90, draw: (g: G) => cage(g, p.x, p.y) })),
  ...POSTS.map((p) => ({ x: p.x, y: p.y, w: 50, h: 80, draw: (g: G) => post(g, p.x, p.y) })),
  ...Array.from({ length: 8 }, (_, i) => 250 + i * 240).flatMap((y, i) => [
    { x: L + 6, y, w: 60, h: 220, draw: (g: G) => pilaster(g, L + 6, y, -6 + (i % 2) * 4) },
    { x: R - 6, y, w: 60, h: 220, draw: (g: G) => pilaster(g, R - 6, y, 6 - (i % 2) * 4) },
  ]),
  // The banisters of the north stair.
  ...[690, 910].map((x) => ({ x, y: 140, w: 50, h: 160, draw: (g: G) => { shard(g, x, 140, 34, 130, x < MID ? -4 : 4, 0.3); } })),
  // Until the six seats are empty: a veil of violet glass across the stair.
  {
    x: MID, y: 134, w: 240, h: 140, when: { not: { courtReady: B.id } },
    draw: (g: G) => {
      const rng = pieceRng(5);
      g.fillStyle(OBS.seam, 0.18); g.fillRect(700, 20, 200, 114);
      for (let i = 0; i < 5; i++) seam(g, crackPath({ x: 700 + rng() * 200, y: 20 }, { x: 700 + rng() * 200, y: 134 }, rng, 10, 6), 1, 0.7);
      g.lineStyle(2, OBS.seamLit, 0.8); g.strokeRect(700, 20, 200, 114);
      councilMask(g, MID, 74, 22, { glow: 1 });
    },
  },
  // Once they are: the rails lit in sea-blue, the stair open.
  {
    x: MID, y: 134, w: 240, h: 140, when: { courtReady: B.id },
    draw: (g: G) => {
      seam(g, [{ x: 700, y: 134 }, { x: 706, y: 10 }], 1.4, 0.9, 0.6, TIDE);
      seam(g, [{ x: 900, y: 134 }, { x: 894, y: 10 }], 1.4, 0.9, 0.6, TIDE);
      councilMask(g, MID, 60, 14, { crack: 1, alpha: 0.6 });
    },
  },
];

// ── Per-frame ────────────────────────────────────────────────────────

/** The basins breathing, drips landing, the tide-lines running north up the aisle. */
function animateUnder(g: G, t: number, view: { x: number; y: number; w: number; h: number }): void {
  const inView = (x: number, y: number, m = 200) => x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
  for (const [i, b] of [WEST_BASIN, EAST_BASIN].entries()) {
    if (!inView(b.x + b.w / 2, b.y + b.h / 2, 300)) continue;
    for (let k = 0; k < 4; k++) {
      const ph = ((t * 0.35) + k / 4 + i * 0.13) % 1;
      const rx = b.x + 40 + ((k * 97 + i * 53) % (b.w - 80)), ry = b.y + 40 + ((k * 61 + i * 29) % (b.h - 70));
      g.lineStyle(1.4, TIDE_LIT, 0.5 * (1 - ph)); g.strokeEllipse(rx, ry, 10 + ph * 70, 4 + ph * 24);
    }
    g.fillStyle(TIDE_LIT, 0.1 + 0.05 * Math.sin(t * 0.8 + i)); g.fillRect(b.x + 30, b.y + b.h * 0.3 + Math.sin(t * 0.6) * 4, b.w * 0.5, 2);
  }
  // Drips falling from the dark overhead onto the glass.
  for (let k = 0; k < 14; k++) {
    const dx = L + 60 + ((k * 211) % (R - L - 120)), dy = 200 + ((k * 337) % (H - 300));
    if (!inView(dx, dy, 60)) continue;
    const ph = (t * 0.6 + k * 0.173) % 1;
    if (ph < 0.75) { g.fillStyle(TIDE_LIT, 0.7); g.fillRect(dx, dy - 90 + ph * 120, 1.5, 6); }
    else splashRing(g, dx, dy, (ph - 0.75) / 0.25, 16);
  }
  // A pulse of sea-light running up the aisle to the clock, and on to the stair.
  for (let k = 0; k < 3; k++) {
    const ph = ((t * 0.12) + k / 3) % 1;
    const y = H - 60 - ph * (H - 200);
    if (!inView(MID, y, 80)) continue;
    g.fillStyle(TIDE, 0.12 * Math.sin(ph * Math.PI)); g.fillEllipse(MID, y, 140, 34);
  }
  // Caustic shimmer along the windows.
  for (let k = 0; k < 10; k++) {
    const west = k % 2 === 0, y = 150 + ((k * 197) % (H - 300)) + Math.sin(t * 0.5 + k) * 30;
    const x = west ? L + 60 + Math.sin(t * 0.7 + k) * 30 : R - 60 + Math.sin(t * 0.7 + k) * 30;
    if (!inView(x, y)) continue;
    g.fillStyle(TIDE_PALE, 0.04 + 0.03 * Math.sin(t * 1.3 + k)); g.fillEllipse(x, y, 140, 20);
  }
}

/** The clock's turning works, and what passes outside the glass. */
function animateOver(g: G, t: number, view: { x: number; y: number; w: number; h: number }): void {
  if (view.y < CLOCK.y + 60 && view.y + view.h > CLOCK.y - 520) tideClockWorks(g, CLOCK.x, CLOCK.y, 1, t);
  // A whale climbing the west glass, slowly, the length of the room.
  const wy = H + 200 - ((t * 26) % (H + 600));
  if (wy > view.y - 300 && wy < view.y + view.h + 300) {
    whale(g, L / 2, wy, 0.62, 1, t, 0.5);
  }
  // A serpent threading down the east glass.
  const sy = ((t * 34) % (H + 700)) - 400;
  if (sy > view.y - 400 && sy < view.y + view.h + 100) serpent(g, R + (W - R) / 2, sy, 0.9, t, 0.45, 20);
  // Sleepers going home past the glass, now the Undertow is open — drifting up toward the light.
  for (let i = 0; i < 3; i++) {
    const y = H - ((t * 18 + i * 700) % (H + 200));
    const x = i % 2 ? L / 2 + Math.sin(t * 0.4 + i) * 30 : R + (W - R) / 2 + Math.sin(t * 0.4 + i) * 30;
    if (y > view.y - 60 && y < view.y + view.h + 60) sleeper(g, x, y, 14, t + i, { alpha: 0.35 });
  }
  // Now and then an eye the size of a door at the north window, looking in.
  const cyc = t % 50;
  if (cyc > 40 && view.y < 200) {
    const k = Math.sin(((cyc - 40) / 10) * Math.PI);
    const ex = 420 + (cyc - 40) * 6, ey = 62;
    g.fillStyle(0x020408, 0.8 * k); g.fillEllipse(ex, ey, 220, 90);
    g.fillStyle(SEA_HIGH, 0.6 * k); g.fillEllipse(ex, ey, 150, 70 * k);
    g.fillStyle(TIDE_LIT, 0.8 * k); g.fillEllipse(ex + 10, ey, 50, 60 * k);
    g.fillStyle(0x000000, k); g.fillEllipse(ex + 12, ey, 10, 52 * k);
    g.fillStyle(0xffffff, 0.6 * k); g.fillCircle(ex - 10, ey - 14 * k, 6);
  }
}

// ── People ───────────────────────────────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'pin-water-winder', name: 'Amory Slack', title: 'Winder of the Tide-Clock', at: { x: DESK.x, y: DESK.y + 44 },
    look: { body: 0x2a3a5a, accent: 0x8c8458, hat: 'coif', traits: ['glasses', 'tool'], size: 0.9, eye: 0x9ad8ff },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: ['I have let it run down. All the way down. It turns out the sea comes in on its own.', 'Nobody ever told me that. I suppose nobody needed to.'] },
      { when: { courtReady: B.id }, lines: ['All six seats empty. Then I need not wind it tomorrow. Or... at all.', 'I have wound this clock every morning for longer than I can count. My hands do not know what else to do.'] },
      { lines: ['Seven turns at slack water, three at the flood. Do not jog my elbow.', 'The Queen has fallen, they say. The clock has not been told. I wind it anyway. It is in the schedule.'] },
    ],
  },
  {
    id: 'pin-water-petitioner', name: 'Hessa Callow', title: 'Come to pay the tithe', at: { x: COUNTER.x, y: COUNTER.y + 46 },
    look: { body: 0x6a7a8a, accent: 0x3a5a7a, hat: 'headwrap', traits: ['satchel'], size: 0.95, eye: 0xd4f0ff },
    talks: [
      { when: { monarch: 'obsidian-king' }, lines: ['I am going to spend it. The coin. On something silly. A ribbon. A bun.', 'Do you know, I have never once bought anything I did not need? Today I shall.'] },
      { when: { courtReady: B.id }, lines: ['They have all gone quiet up there. Nobody is coming to the window, are they.', 'I came all this way to pay for my floor. ...I think perhaps it was always mine.'] },
      { lines: ['One coin a head, counted at high water. I have mine. I walked up the stair to pay it in person.', 'The window has been shut for days. I will wait. Waiting is the one thing the Reach taught us properly.'] },
    ],
  },
];

// ── The area ─────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 620, y: 1880 } },
  ...B.elements.map((el): Poi => ({ kind: 'encounter', id: seatId(el) })),
  { kind: 'chest', id: relicId(B.id), at: { x: 1060, y: 240 }, item: relicId(B.id), orbs: 8, open: { courtReady: B.id } },
];

export const WATER_BENCH_AREA: AreaDef = {
  id: B.id,
  isle: 'pinnacle',
  name: B.name,
  subtitle: B.subtitle,
  w: W,
  h: H,
  bg: OBS.sky,
  accent: B.color,
  weather: 'drip',
  spawn: { x: MID, y: 1890 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [
    { side: 's', to: below(B), label: 'Down to the Ember Bench' },
    { side: 'n', to: above(B), label: 'Up to the Thorn Bench', open: { courtReady: B.id }, lockedText: 'A veil of violet glass hangs across the stair. Six seats are still sitting.' },
  ],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.25,
  intro: benchIntroId(B.id),
};

