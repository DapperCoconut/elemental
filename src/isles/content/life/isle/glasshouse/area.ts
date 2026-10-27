import type { AreaDef, NpcDef, Poi, Pt, Rect, Solid, WorldGate, WorldHazard } from '../../../../IslesTypes';
import { type G, dim, flagstones, glow, lit, motes, shadow } from '../../../../art/IsleArt';
import { test as saveTest } from '../../../../IslesSave';
import {
  BRASS, GLASS, IRON, LEAF, ROSE, ROSE_DEEP, ROSE_PALE, SAP, SOIL, TERRACOTTA, VERDIGRIS, VERDIGRIS_DEEP, YEW, YEW_LIT,
  bramble, glassPane, graftedSubject, growLamp, hedge, ironRib, rose, seedlingPot, shears, verdigraSigil,
} from './art';

/**
 * The Glasshouse — Empress Verdigra's palace of iron and glass in the crown of the Heartwood.
 *
 * You come in at the potting hall at the south end and walk north, under glass the whole way,
 * through the three wings of her garden — each a different way she keeps it tidy, each closed by
 * a warden. Her pruned subjects are everywhere: families who came up short at the Bloom Tithe,
 * grafted alive into her hedges and clipped into shape. A few have begun to come loose.
 *
 *   Potting Hall  — (y 2280–2564) arrival, a waystone, the door back down to the Heartwood.
 *   Hall I        — The Pruning Gallery (y 1720–2240): three rows of giant topiary shears. Each row
 *                   clips like a hedge-trimmer running along a hedge — one pair after the next,
 *                   west-to-east then east-to-west — so the safe gap travels. Chase it.
 *                   Warden: Head Pruner Ottilie Snedd.
 *   Hall II       — The Topiary Maze (y 1040–1680): hedges of grafted subjects. Ring a bell and the
 *                   hedges shift — the pruned step aside where they are told to, and close the way
 *                   behind. Two bells, rung in order. Warden: Bellwarden Hesper Lisle.
 *   Hall III      — The Nursery (y 330–1000): three seed-beds where the growing lamps grow vines
 *                   across the path. Shut a lamp off at its brass valve and its bed is safe to
 *                   cross; or time the sprinkler gap each bed leaves. A rotary sprinkler sweeps the
 *                   middle bench. Warden: Nursemaid Primula Dewe.
 *   Throne        — (y 40–290): her trellis throne under the great dome.
 *
 * There is no health out here: a hazard throws you back to the last checkpoint.
 */

const W = 1800;
const H = 2600;
const L = 260;
const R = 1540;
const DOOR_L = 820;
const DOOR_R = 980;
const MID = 900;

// ── Hazards ──────────────────────────────────────────────────────────

const hazards: WorldHazard[] = [];

/** Hall I: three shear rows. Each row is four bites; they snap one after another along the row. */
const SHEAR_ROWS = [2140, 2004, 1868];
const SHEAR_H = 56;
const BITE_W = (R - L) / 4;
const SHEAR_PERIOD = 3000;
const SHEAR_ON = 520;
const SHEAR_STEP = 450;
/** Row 0 runs west→east, row 1 east→west, row 2 west→east. */
const rowDir = (row: number): 1 | -1 => (row % 2 === 0 ? 1 : -1);
const biteOffset = (row: number, i: number): number => {
  const order = rowDir(row) > 0 ? i : 3 - i;
  // Jet phase is (now + offset) % period < on; a bite that should fire `order` steps late gets
  // a negative offset. The rows are staggered so they do not all run at once.
  return -(order * SHEAR_STEP + row * 700);
};
SHEAR_ROWS.forEach((y, row) => {
  for (let i = 0; i < 4; i++) {
    hazards.push({ kind: 'jet', rect: { x: L + i * BITE_W, y, w: BITE_W, h: SHEAR_H }, periodMs: SHEAR_PERIOD, onMs: SHEAR_ON, offsetMs: biteOffset(row, i), color: 0xd8e4e8 });
  }
});

/** Hall III: three seed-beds, each with a sprinkler gap. A bed is safe once its lamp is off. */
interface Bed { y: number; h: number; gap: [number, number]; flag: string; lever: Pt; sprinkleOff: number }
const BEDS: Bed[] = [
  { y: 820, h: 70, gap: [1300, 1420], flag: 'glasshouse-lamp-1', lever: { x: 340, y: 945 }, sprinkleOff: 0 },
  { y: 650, h: 70, gap: [380, 500], flag: 'glasshouse-lamp-2', lever: { x: 1460, y: 770 }, sprinkleOff: 700 },
  { y: 480, h: 70, gap: [840, 960], flag: 'glasshouse-lamp-3', lever: { x: 340, y: 600 }, sprinkleOff: 1300 },
];
const SPRINKLE_PERIOD = 2200;
const SPRINKLE_ON = 1000;
for (const b of BEDS) {
  hazards.push(
    { kind: 'floor', rect: { x: L, y: b.y, w: b.gap[0] - L, h: b.h }, safeWhen: { flag: b.flag }, color: 0x3a8a2a },
    { kind: 'floor', rect: { x: b.gap[1], y: b.y, w: R - b.gap[1], h: b.h }, safeWhen: { flag: b.flag }, color: 0x3a8a2a },
    { kind: 'jet', rect: { x: b.gap[0], y: b.y, w: b.gap[1] - b.gap[0], h: b.h }, periodMs: SPRINKLE_PERIOD, onMs: SPRINKLE_ON, offsetMs: b.sprinkleOff, color: 0x9ad8ff },
  );
}
/** The rotary sprinkler on the middle bench, between the second and third beds. */
const ROTARY = { x: MID, y: 610, length: 140, rad: 1.15, phase: 0.6 };
hazards.push({ kind: 'sweeper', x: ROTARY.x, y: ROTARY.y, length: ROTARY.length, radPerSec: ROTARY.rad, phase: ROTARY.phase, color: 0x7ac8f0 });

// ── Gates ────────────────────────────────────────────────────────────

const BELL_1 = 'glasshouse-bell-1';
const BELL_2 = 'glasshouse-bell-2';

/** The maze's hedge lines (static), and the gaps in them the bells open and close. */
const H1_Y = 1460;
const H2_Y = 1260;
const HEDGE_T = 40;
const V1_X = 680;
const V2_X = 1160;
const MAZE_GATES: { rect: Rect; open: WorldGate['open']; label: string }[] = [
  // South hedge: the west gap closes at the first bell, the centre gap opens.
  { rect: { x: 300, y: H1_Y, w: 120, h: HEDGE_T }, open: { not: { flag: BELL_1 } }, label: 'The hedge has closed (the first bell)' },
  { rect: { x: 840, y: H1_Y, w: 120, h: HEDGE_T }, open: { flag: BELL_1 }, label: 'Ring the first bell' },
  // The west pocket opens to the centre at the second bell.
  { rect: { x: V1_X, y: 1320, w: HEDGE_T, h: 120 }, open: { flag: BELL_2 }, label: 'Ring the second bell' },
  // The east pocket closes behind you at the second bell...
  { rect: { x: V2_X, y: 1320, w: HEDGE_T, h: 120 }, open: { not: { flag: BELL_2 } }, label: 'The hedge has closed (the second bell)' },
  // ...and the north hedge opens, both in the centre and above the east pocket.
  { rect: { x: 840, y: H2_Y, w: 120, h: HEDGE_T }, open: { flag: BELL_2 }, label: 'Ring the second bell' },
  { rect: { x: 1300, y: H2_Y, w: 120, h: HEDGE_T }, open: { flag: BELL_2 }, label: 'Ring the second bell' },
];

const gates: WorldGate[] = [
  { rect: { x: DOOR_L, y: 1680, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'glasshouse-warden-1' }, look: 'thorn', label: 'Defeat the Head Pruner' },
  ...MAZE_GATES.map((m) => ({ rect: m.rect, open: m.open, look: 'thorn' as const, label: m.label })),
  { rect: { x: DOOR_L, y: 1000, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'glasshouse-warden-2' }, look: 'roots', label: 'Defeat the Bellwarden' },
  { rect: { x: DOOR_L, y: 290, w: DOOR_R - DOOR_L, h: 40 }, open: { encounter: 'glasshouse-warden-3' }, look: 'thorn', label: 'Defeat the Nursemaid' },
];

/** Iron-and-glass partitions between the halls, a door in the middle of each. */
const CROSS_WALLS: { y: number; h: number }[] = [{ y: 2240, h: 40 }, { y: 1680, h: 40 }, { y: 1000, h: 40 }, { y: 290, h: 40 }];

const solids: Solid[] = [
  { kind: 'rect', x: 0, y: 0, w: L, h: H },
  { kind: 'rect', x: R, y: 0, w: W - R, h: H },
  { kind: 'rect', x: L, y: 0, w: R - L, h: 40 },
  { kind: 'rect', x: L, y: H - 36, w: R - L, h: 36 },
];
for (const c of CROSS_WALLS) {
  solids.push({ kind: 'rect', x: L, y: c.y, w: DOOR_L - L, h: c.h }, { kind: 'rect', x: DOOR_R, y: c.y, w: R - DOOR_R, h: c.h });
}

/** The static hedge runs of the maze: every hedge line minus its gaps. */
const HEDGES: Rect[] = [];
const hedgeLine = (y: number, gaps: [number, number][]): void => {
  let x = L;
  for (const [a, b] of gaps) { if (a > x) HEDGES.push({ x, y, w: a - x, h: HEDGE_T }); x = b; }
  if (x < R) HEDGES.push({ x, y, w: R - x, h: HEDGE_T });
};
hedgeLine(H1_Y, [[300, 420], [840, 960]]);
hedgeLine(H2_Y, [[840, 960], [1300, 1420]]);
HEDGES.push(
  { x: V1_X, y: H2_Y + HEDGE_T, w: HEDGE_T, h: 1320 - (H2_Y + HEDGE_T) },
  { x: V1_X, y: 1440, w: HEDGE_T, h: H1_Y - 1440 },
  { x: V2_X, y: H2_Y + HEDGE_T, w: HEDGE_T, h: 1320 - (H2_Y + HEDGE_T) },
  { x: V2_X, y: 1440, w: HEDGE_T, h: H1_Y - 1440 },
);
for (const h of HEDGES) solids.push({ kind: 'rect', x: h.x, y: h.y, w: h.w, h: h.h });

// The throne room narrows between glass buttresses.
solids.push({ kind: 'rect', x: L, y: 40, w: 180, h: 250 }, { kind: 'rect', x: R - 180, y: 40, w: 180, h: 250 });

// ── Ground ───────────────────────────────────────────────────────────

/** Terracotta tiles — the potting hall floor, scuffed with soil and spilled compost. */
function terracotta(g: G, r: Rect, rng: () => number): void {
  const S = 36;
  g.fillStyle(0x3a1e12, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += S) {
    for (let x = r.x; x < r.x + r.w; x += S) {
      const c = rng() < 0.5 ? TERRACOTTA : dim(TERRACOTTA, 0.18);
      g.fillStyle(c, 1); g.fillRect(x + 1.5, y + 1.5, S - 3, Math.min(S - 3, r.y + r.h - y - 1.5));
      if (rng() < 0.2) { g.fillStyle(SOIL, 0.4); g.fillEllipse(x + rng() * S, y + rng() * S, 14 + rng() * 18, 6 + rng() * 6); }
    }
  }
}

/** A mown lawn in stripes, the way she likes it — the gallery's floor. */
function stripedLawn(g: G, r: Rect, rng: () => number): void {
  const S = 48;
  for (let x = r.x; x < r.x + r.w; x += S) {
    const k = Math.floor((x - r.x) / S) % 2;
    g.fillStyle(k ? 0x3a7a32 : 0x346e2c, 1); g.fillRect(x, r.y, Math.min(S, r.x + r.w - x), r.h);
  }
  for (let i = 0; i < (r.w * r.h) / 500; i++) {
    g.fillStyle(rng() < 0.5 ? 0x4a8a3a : 0x2a5a24, 0.5);
    g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 1, 3 + rng() * 3);
  }
}

/** Raked gravel, the maze's path. */
function gravel(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(0x8a8270, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 70; i++) {
    g.fillStyle(rng() < 0.5 ? 0xa8a090 : 0x6a6458, 0.7);
    g.fillCircle(r.x + rng() * r.w, r.y + rng() * r.h, 0.8 + rng() * 1.4);
  }
  g.lineStyle(1, 0x6a6458, 0.35);
  for (let y = r.y + 8; y < r.y + r.h; y += 10) g.lineBetween(r.x, y, r.x + r.w, y + Math.sin(y) * 2);
}

/** A shear row: a mown strip with the clippings lying in it, brass marks at each bite's end. */
function shearStrip(g: G, y: number, row: number, rng: () => number): void {
  g.fillStyle(0x1a2a16, 1); g.fillRect(L, y - 4, R - L, SHEAR_H + 8);
  g.fillStyle(0x24401e, 1); g.fillRect(L, y, R - L, SHEAR_H);
  for (let i = 0; i < 80; i++) {
    g.fillStyle(rng() < 0.5 ? YEW_LIT : LEAF, 0.6);
    g.fillEllipse(L + rng() * (R - L), y + 4 + rng() * (SHEAR_H - 8), 4 + rng() * 4, 2);
  }
  // The order the shears run in, as chevrons along the strip.
  const d = rowDir(row);
  for (let x = L + 60; x < R; x += 120) {
    g.lineStyle(2, BRASS, 0.35);
    g.lineBetween(x - d * 8, y + SHEAR_H / 2 - 8, x + d * 4, y + SHEAR_H / 2);
    g.lineBetween(x + d * 4, y + SHEAR_H / 2, x - d * 8, y + SHEAR_H / 2 + 8);
  }
  for (let i = 0; i <= 4; i++) {
    g.fillStyle(BRASS, 0.7); g.fillRect(L + i * BITE_W - 2, y - 4, 4, SHEAR_H + 8);
  }
}

/** A seed-bed: black loam in drills, vine runners crawling over it toward the path. */
function seedBed(g: G, b: Bed, rng: () => number): void {
  g.fillStyle(0x140c08, 1); g.fillRect(L, b.y - 4, R - L, b.h + 8);
  g.fillStyle(SOIL, 1); g.fillRect(L, b.y, R - L, b.h);
  for (let y = b.y + 10; y < b.y + b.h; y += 14) {
    g.lineStyle(3, 0x1a100a, 0.8); g.lineBetween(L, y, R, y);
  }
  for (let i = 0; i < 26; i++) {
    const x = L + rng() * (R - L);
    if (x > b.gap[0] - 10 && x < b.gap[1] + 10) continue;
    bramble(g, x, b.y + rng() * b.h, x + (rng() - 0.5) * 80, b.y + rng() * b.h, rng() * 6, 0x2e5a22, 0.8);
  }
  // The sprinkler gap: a brick crossing with a rose-head sprinkler set in it.
  const gx = b.gap[0], gw = b.gap[1] - b.gap[0];
  g.fillStyle(0x6a3020, 1); g.fillRect(gx, b.y - 4, gw, b.h + 8);
  for (let y = b.y - 4; y < b.y + b.h + 4; y += 10) {
    for (let x = gx + ((y / 10) % 2) * 10; x < gx + gw; x += 20) {
      g.fillStyle(rng() < 0.5 ? 0x9a4a30 : 0x8a4028, 1); g.fillRect(x + 1, y + 1, 18, 8);
    }
  }
  g.fillStyle(0x3a3a32, 1); g.fillCircle(gx + gw / 2, b.y + b.h / 2, 10);
  g.fillStyle(BRASS, 1); g.fillCircle(gx + gw / 2, b.y + b.h / 2, 7);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.fillStyle(0x3a2a12, 1); g.fillCircle(gx + gw / 2 + Math.cos(a) * 4, b.y + b.h / 2 + Math.sin(a) * 4, 1); }
}

/**
 * The glass roof's shadow: the iron ribs, far overhead, lay a lattice of soft dark lines across
 * every floor in the palace.
 */
function roofShadow(g: G, y0: number, y1: number): void {
  g.lineStyle(6, 0x000000, 0.08);
  for (let x = L - 400; x < R + 400; x += 120) g.lineBetween(x, y0, x + (y1 - y0) * 0.25, y1);
  for (let y = y0; y < y1; y += 140) g.lineBetween(L, y, R, y + 20);
}

function paintGround(g: G, rng: () => number): void {
  // Outside the glass: the Heartwood's crown — dark bark and the undersides of leaves.
  g.fillStyle(0x0c140c, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 360; i++) {
    g.fillStyle(rng() < 0.5 ? 0x14220f : 0x1a2a14, 1);
    g.fillEllipse(rng() * W, rng() * H, 40 + rng() * 120, 18 + rng() * 50);
  }

  // Potting Hall.
  terracotta(g, { x: L, y: 2280, w: R - L, h: H - 36 - 2280 }, rng);
  g.fillStyle(0x1a0e08, 0.6); g.fillCircle(MID, 2410, 74);
  g.lineStyle(4, BRASS, 0.5); g.strokeCircle(MID, 2410, 70);
  verdigraSigil(g, MID, 2410, 50, VERDIGRIS_DEEP, 0.9);
  verdigraSigil(g, MID, 2410, 46, VERDIGRIS, 0.35);
  // The tithe-scales' worn footprint: a brass plate where the season's bloom is weighed.
  g.fillStyle(0x5a4a22, 1); g.fillRect(1180, 2440, 120, 60);
  g.lineStyle(2, BRASS, 0.8); g.strokeRect(1180, 2440, 120, 60);

  // Hall I — the Pruning Gallery.
  stripedLawn(g, { x: L, y: 1720, w: R - L, h: 520 }, rng);
  SHEAR_ROWS.forEach((y, row) => shearStrip(g, y, row, rng));
  // Warden I's dais: a round of clipped box with a cutting-board of slate at its heart.
  g.fillStyle(dim(YEW, 0.3), 1); g.fillCircle(MID, 1790, 74);
  g.fillStyle(YEW, 1); g.fillCircle(MID, 1790, 66);
  g.fillStyle(0x2a3034, 1); g.fillCircle(MID, 1790, 44);
  g.lineStyle(2, 0x4a5458, 1);
  for (let k = 0; k < 7; k++) g.lineBetween(MID - 40 + k * 13, 1770, MID - 36 + k * 13, 1810);
  verdigraSigil(g, MID, 1790, 18, BRASS, 0.6);

  // Hall II — the Topiary Maze.
  gravel(g, { x: L, y: 1040, w: R - L, h: 640 }, rng);
  // Hedge beds where the shifting gaps are — dark soil, so you can see a hedge could grow there.
  for (const m of MAZE_GATES) {
    g.fillStyle(SOIL, 1); g.fillRect(m.rect.x, m.rect.y, m.rect.w, m.rect.h);
    g.lineStyle(2, dim(YEW, 0.2), 0.8); g.strokeRect(m.rect.x + 2, m.rect.y + 2, m.rect.w - 4, m.rect.h - 4);
    for (let i = 0; i < 6; i++) { g.fillStyle(YEW_LIT, 0.5); g.fillEllipse(m.rect.x + rng() * m.rect.w, m.rect.y + rng() * m.rect.h, 6, 3); }
  }
  // Warden II's dais: a bell-pit, a round of brass in the gravel.
  g.fillStyle(0x3a2e12, 1); g.fillCircle(MID, 1130, 62);
  g.lineStyle(6, BRASS, 0.8); g.strokeCircle(MID, 1130, 56);
  g.lineStyle(2, BRASS, 0.4); g.strokeCircle(MID, 1130, 40);

  // Hall III — the Nursery.
  flagstones(g, { x: L, y: 330, w: R - L, h: 670 }, 40, 0x6a3a28, 0x2a140c, rng);
  for (const b of BEDS) seedBed(g, b, rng);
  // The rotary sprinkler's wet circle on the bench.
  g.fillStyle(0x1a3a4a, 0.4); g.fillCircle(ROTARY.x, ROTARY.y, ROTARY.length + 10);
  g.lineStyle(1.5, 0x7ac8f0, 0.3); g.strokeCircle(ROTARY.x, ROTARY.y, ROTARY.length);
  // Warden III's dais: a ring of seed trays.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = MID + Math.cos(a) * 64, y = 405 + Math.sin(a) * 34;
    g.fillStyle(0x2a1a10, 1); g.fillRect(x - 14, y - 8, 28, 16);
    for (let s = 0; s < 4; s++) { g.fillStyle(LEAF, 1); g.fillCircle(x - 9 + s * 6, y - 1, 2); }
  }

  // The throne under the dome: green glass mosaic, a rose-red runner.
  g.fillStyle(0x0e1e1a, 1); g.fillRect(L + 180, 40, R - L - 360, 250);
  for (let y = 40; y < 290; y += 22) {
    for (let x = L + 180 + ((y / 22) % 2) * 11; x < R - 180; x += 22) {
      const c = rng() < 0.15 ? 0x6ad8b8 : rng() < 0.5 ? 0x1e5a4a : 0x2a6a58;
      g.fillStyle(c, 0.9); g.fillRect(x + 1, y + 1, 20, 20);
    }
  }
  g.fillStyle(ROSE_DEEP, 1); g.fillRect(MID - 44, 120, 88, 170);
  g.fillStyle(0x9a2a3a, 1); g.fillRect(MID - 38, 120, 76, 170);
  for (let y = 140; y < 290; y += 30) rose(g, MID, y, 6, ROSE_PALE, 0.6);

  for (const y0 of [2280, 1720, 1040, 330]) roofShadow(g, y0, y0 + (y0 === 330 ? 670 : y0 === 1040 ? 640 : 520));

  // The palace walls: iron-framed glass, the Heartwood's leaves pressed dark against it.
  for (const [x0, x1] of [[L - 40, L], [R, R + 40]] as [number, number][]) {
    for (let y = 0; y < H; y += 60) glassPane(g, x0, y, x1 - x0, 60, 1, rng() < 0.08);
    for (let y = 0; y < H; y += 60) ironRib(g, x0, y, x1, y, 4);
    g.fillStyle(VERDIGRIS, 0.12); g.fillRect(x0 === L - 40 ? L - 3 : R, 0, 3, H);
  }
  for (const c of CROSS_WALLS) {
    for (const [x0, x1] of [[L, DOOR_L], [DOOR_R, R]] as [number, number][]) {
      g.fillStyle(0x060a08, 1); g.fillRect(x0, c.y - 4, x1 - x0, c.h + 8);
      for (let x = x0; x < x1; x += 40) glassPane(g, x, c.y, Math.min(40, x1 - x), c.h, 1, rng() < 0.1);
      ironRib(g, x0, c.y, x1, c.y, 5);
      ironRib(g, x0, c.y + c.h, x1, c.y + c.h, 5);
      for (let i = 0; i < 5; i++) rose(g, x0 + 20 + rng() * (x1 - x0 - 40), c.y + c.h + 2, 5, rng() < 0.5 ? ROSE : ROSE_PALE, 0.8);
    }
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];

/** A hedge of the maze, with the pruned grafted into it — faces in the yew, breathing. */
for (const h of HEDGES) {
  pieces.push({
    x: h.x + h.w / 2, y: h.y + h.h, w: h.w + 20, h: h.h + 50,
    draw: (g, rng) => {
      hedge(g, h.x, h.y, h.w, h.h, 34, rng);
      // Faces in the hedge every hundred-odd pixels along a long run.
      const along = Math.max(h.w, h.h);
      const n = Math.floor(along / 130);
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        const fx = h.w > h.h ? h.x + h.w * k : h.x + h.w / 2;
        const fy = h.w > h.h ? h.y - 16 : h.y + h.h * k - 16;
        const skin = [0xd8b898, 0xb08a68, 0xc8a080, 0x9a7458][(i + Math.floor(h.x)) % 4];
        g.fillStyle(skin, 1); g.fillEllipse(fx, fy, 12, 14);
        g.fillStyle(YEW_LIT, 0.9);
        for (let a = 0; a < 6; a++) g.fillEllipse(fx + Math.cos(a) * 8, fy + Math.sin(a) * 9, 6, 4);
        g.lineStyle(1, dim(skin, 0.5), 1);
        g.lineBetween(fx - 4, fy, fx - 1, fy); g.lineBetween(fx + 1, fy, fx + 4, fy);
        g.fillStyle(0xe8e0c8, 1); g.fillRect(fx + 3, fy + 10, 7, 4);
      }
    },
  });
}

/**
 * The topiary of the pruned standing in rows along the gallery and the potting hall: whole
 * people, clipped into hedge-shapes. Drawn in `animate` — they breathe.
 */
interface Topiary { x: number; y: number; s: number; skin: number }
const TOPIARY: Topiary[] = [];
const skins = [0xd8b898, 0xb08a68, 0xc8a080, 0x9a7458, 0xe0c0a0, 0xa07a5a];
[2420, 2520, 1790, 1100, 1180, 400].forEach((y, i) => {
  for (const side of [-1, 1] as const) {
    TOPIARY.push({ x: side < 0 ? L + 34 : R - 34, y, s: 0.9 + ((i * 3) % 4) * 0.08, skin: skins[(i * 2 + (side > 0 ? 1 : 0)) % skins.length] });
  }
});
// A family of three clipped into one hedge-shape by the potting-hall door. Nobody tidied them apart.
TOPIARY.push({ x: 560, y: 2340, s: 1.15, skin: 0xc8a080 }, { x: 600, y: 2350, s: 0.8, skin: 0xd8b898 }, { x: 640, y: 2340, s: 1.05, skin: 0xa07a5a });
for (const t of TOPIARY) solids.push({ kind: 'circle', x: t.x, y: t.y - 8, r: 18 * t.s });

/** The giant shears' iron gantries at each end of each row (the blades hang off them). */
SHEAR_ROWS.forEach((y, row) => {
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? L + 4 : R - 4;
    pieces.push({
      x, y: y + SHEAR_H + 8, w: 50, h: 120, draw: (g) => {
        g.fillStyle(IRON, 1); g.fillRect(x - 8, y - 40, 16, SHEAR_H + 48);
        g.fillStyle(VERDIGRIS_DEEP, 0.8); g.fillRect(x - 3, y - 40, 4, SHEAR_H + 48);
        g.fillStyle(BRASS, 1); g.fillCircle(x, y - 40, 7);
        // A gearwheel: what times the run.
        g.lineStyle(3, BRASS, 0.9); g.strokeCircle(x, y + SHEAR_H / 2, 12);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + row;
          g.lineBetween(x + Math.cos(a) * 12, y + SHEAR_H / 2 + Math.sin(a) * 12, x + Math.cos(a) * 16, y + SHEAR_H / 2 + Math.sin(a) * 16);
        }
      },
    });
  }
});

/** The bell gallows of the maze: a bronze bell on an iron frame beside each bell rope. */
const BELLS: { at: Pt; flag: string; n: number }[] = [
  { at: { x: 1470, y: 1590 }, flag: BELL_1, n: 1 },
  { at: { x: 1470, y: 1380 }, flag: BELL_2, n: 2 },
];
for (const b of BELLS) {
  const bx = b.at.x + 36, by = b.at.y - 4;
  pieces.push({
    x: bx, y: by, w: 70, h: 120, draw: (g) => {
      shadow(g, bx, by, 50, 12);
      g.fillStyle(IRON, 1); g.fillRect(bx - 22, by - 92, 5, 92); g.fillRect(bx + 17, by - 92, 5, 92); g.fillRect(bx - 24, by - 96, 48, 6);
      g.fillStyle(0x6a4a1a, 1); g.fillTriangle(bx - 16, by - 46, bx + 16, by - 46, bx, by - 88);
      g.fillStyle(0x8a6a2a, 1); g.fillRoundedRect(bx - 16, by - 76, 32, 32, { tl: 14, tr: 14, bl: 2, br: 2 });
      g.fillStyle(lit(0x8a6a2a, 0.3), 1); g.fillRect(bx - 12, by - 70, 5, 20);
      g.fillStyle(0x3a2a0a, 1); g.fillRect(bx - 18, by - 46, 36, 4);
      verdigraSigil(g, bx, by - 60, 7, VERDIGRIS_DEEP, 0.9);
      // Its number in the side of the frame.
      for (let k = 0; k < b.n; k++) { g.fillStyle(BRASS, 1); g.fillCircle(bx - 19, by - 30 + k * 8, 2.5); }
    },
  });
  solids.push({ kind: 'rect', x: bx - 24, y: by - 10, w: 48, h: 10 });
}

/** Potting benches in the hall: pots, a watering can, a tray of cuttings with name-tags. */
function bench(x: number, y: number): void {
  pieces.push({
    x, y, w: 150, h: 70, draw: (g, rng) => {
      shadow(g, x, y + 2, 150, 16);
      g.fillStyle(0x3a2414, 1); g.fillRect(x - 70, y - 30, 140, 8);
      g.fillStyle(0x5a3a22, 1); g.fillRect(x - 70, y - 34, 140, 6);
      g.fillStyle(0x2a1a0e, 1); g.fillRect(x - 64, y - 24, 6, 24); g.fillRect(x + 58, y - 24, 6, 24);
      for (let i = 0; i < 5; i++) seedlingPot(g, x - 54 + i * 24, y - 34, 0.8 + rng() * 0.2, i % 2 ? LEAF : 0x7ab84a);
      // The watering can.
      g.fillStyle(0x5a7a6a, 1); g.fillRoundedRect(x + 46, y - 50, 18, 16, 3);
      g.lineStyle(2, 0x5a7a6a, 1); g.lineBetween(x + 46, y - 46, x + 32, y - 58);
      g.fillStyle(VERDIGRIS, 1); g.fillCircle(x + 31, y - 59, 3);
    },
  });
  solids.push({ kind: 'rect', x: x - 70, y: y - 20, w: 140, h: 20 });
}
bench(470, 2510);
bench(1330, 2340);

/** The tithe-scales: a great brass balance where the season's bloom is weighed against her weights. */
pieces.push({
  x: 1240, y: 2500, w: 160, h: 170, draw: (g) => {
    shadow(g, 1240, 2500, 120, 20);
    g.fillStyle(0x3a2a0e, 1); g.fillRect(1236, 2380, 8, 120);
    g.fillStyle(BRASS, 1); g.fillRect(1238, 2380, 4, 120);
    g.lineStyle(4, BRASS, 1); g.lineBetween(1180, 2390, 1300, 2376);
    for (const [px, py, heavy] of [[1184, 2390, 1], [1296, 2376, 0]] as [number, number, number][]) {
      g.lineStyle(1, 0x8a7a4a, 1); g.lineBetween(px, py, px - 18, py + 38); g.lineBetween(px, py, px + 18, py + 38);
      g.fillStyle(0x6a5a22, 1); g.fillEllipse(px, py + 40, 44, 10);
      if (heavy) { g.fillStyle(0x3a3a3a, 1); g.fillRect(px - 10, py + 26, 20, 12); verdigraSigil(g, px, py + 32, 4, BRASS, 1); }
      else { rose(g, px - 6, py + 34, 5, ROSE, 0.7); rose(g, px + 6, py + 35, 4, ROSE_PALE, 0.6); }
    }
    g.fillStyle(BRASS, 1); g.fillTriangle(1232, 2384, 1248, 2384, 1240, 2370);
  },
});
solids.push({ kind: 'rect', x: 1200, y: 2486, w: 80, h: 14 });

/** Glass bell-cloches on plinths in the throne room, each over a single perfect rose. */
for (const x of [560, 1240]) {
  pieces.push({
    x, y: 230, w: 70, h: 110, draw: (g) => {
      shadow(g, x, 230, 60, 14);
      g.fillStyle(0x3a4a44, 1); g.fillRect(x - 22, 200, 44, 30);
      g.fillStyle(0x5a6a62, 1); g.fillRect(x - 24, 196, 48, 6);
      rose(g, x, 178, 8, ROSE, 1);
      g.fillStyle(GLASS, 0.15); g.fillEllipse(x, 172, 40, 50);
      g.lineStyle(2, GLASS, 0.5); g.strokeEllipse(x, 172, 40, 50);
      g.fillStyle(0xffffff, 0.5); g.fillEllipse(x - 10, 160, 6, 14);
      g.fillStyle(IRON, 1); g.fillCircle(x, 146, 4);
    },
  });
  solids.push({ kind: 'rect', x: x - 24, y: 210, w: 48, h: 20 });
}

/** The trellis throne: a wrought-iron chair grown over with climbing roses. */
pieces.push({
  x: MID, y: 150, w: 260, h: 150, draw: (g, rng) => {
    shadow(g, MID, 150, 220, 30, 0.45);
    g.fillStyle(IRON, 1); g.fillRect(MID - 70, 110, 140, 14);
    for (const x of [MID - 70, MID + 64]) g.fillRect(x, 60, 6, 90);
    g.lineStyle(4, IRON, 1);
    g.beginPath(); g.arc(MID, 70, 70, Math.PI, 0, false); g.strokePath();
    for (let k = 0; k < 7; k++) {
      const x = MID - 60 + k * 20;
      g.lineBetween(x, 110, x, 70 - Math.sin((k / 6) * Math.PI) * 50);
    }
    g.lineStyle(2, IRON, 1);
    for (let y = 80; y < 110; y += 14) g.lineBetween(MID - 66, y, MID + 66, y);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI + rng() * Math.PI;
      const rr = 40 + rng() * 34;
      rose(g, MID + Math.cos(a) * rr, 76 + Math.sin(a) * rr * 0.9, 4 + rng() * 3, rng() < 0.7 ? ROSE : ROSE_PALE, 0.8);
    }
    verdigraSigil(g, MID, 40, 14, VERDIGRIS, 0.9);
  },
});
solids.push({ kind: 'rect', x: MID - 80, y: 100, w: 160, h: 50 });

// ── Animation ────────────────────────────────────────────────────────

const near = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

const jetPhase = (t: number, period: number, off: number): number => (((t * 1000 + off) % period) + period) % period;

function animateUnder(g: G, t: number, view: Rect): void {
  // The pruned in their topiary.
  for (const s of TOPIARY) {
    if (!near(view, s.x, s.y, 80)) continue;
    graftedSubject(g, s.x, s.y, s.s, t, s.skin, 0);
  }
  // The ones who have begun to come loose: a split hedge-shell behind each, leaves fallen round.
  for (const n of NPCS) {
    if (!near(view, n.at.x, n.at.y, 90)) continue;
    const s = n.look.size ?? 1;
    const x = n.at.x, y = n.at.y;
    g.fillStyle(dim(YEW, 0.35), 1); g.fillRoundedRect(x - 26 * s, y - 70 * s, 14 * s, 64 * s, 6);
    g.fillRoundedRect(x + 12 * s, y - 66 * s, 14 * s, 60 * s, 6);
    g.fillStyle(YEW, 1); g.fillRoundedRect(x - 25 * s, y - 69 * s, 10 * s, 60 * s, 5);
    g.fillRoundedRect(x + 14 * s, y - 65 * s, 10 * s, 56 * s, 5);
    for (let i = 0; i < 9; i++) {
      const lx = x - 30 * s + ((i * 37) % 60) * s, ly = y - 2 + ((i * 13) % 6);
      g.fillStyle(i % 2 ? YEW_LIT : LEAF, 0.8); g.fillEllipse(lx, ly, 6, 3);
    }
    // A leaf or two still dropping off them.
    const ph = (t * 0.35 + x * 0.003) % 1;
    g.fillStyle(YEW_LIT, 1 - ph); g.fillEllipse(x + Math.sin(t * 2 + x) * 12, y - 60 * s + ph * 56 * s, 5, 3);
  }
  // Sprinkler spray over each bed's gap while it runs.
  for (const b of BEDS) {
    const cx = (b.gap[0] + b.gap[1]) / 2, cy = b.y + b.h / 2;
    if (!near(view, cx, cy, 160)) continue;
    const on = jetPhase(t, SPRINKLE_PERIOD, b.sprinkleOff) < SPRINKLE_ON;
    if (!on) continue;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + t * 3;
      const r = 20 + ((t * 120 + i * 13) % 50);
      g.fillStyle(0xc8f0ff, 0.5 * (1 - r / 70)); g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 2);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Hall I: the giant shears over each bite — open, closing in the beat before, snapped shut while on.
  SHEAR_ROWS.forEach((y, row) => {
    if (!near(view, MID, y, 700)) return;
    const d = rowDir(row);
    for (let i = 0; i < 4; i++) {
      const ph = jetPhase(t, SHEAR_PERIOD, biteOffset(row, i));
      const on = ph < SHEAR_ON;
      const warn = !on && ph > SHEAR_PERIOD - 500;
      const open = on ? 0.015 : warn ? 0.2 * ((SHEAR_PERIOD - ph) / 500) : 0.2;
      const x0 = L + i * BITE_W;
      const px = d > 0 ? x0 + 8 : x0 + BITE_W - 8;
      shears(g, px, y + SHEAR_H / 2, d > 0 ? 0 : Math.PI, open, BITE_W - 20, 0.95);
      if (on && ph < 120) {
        // The snap: a white flash and a spray of clippings along the bite.
        g.fillStyle(0xffffff, 0.5 * (1 - ph / 120)); g.fillRect(x0, y + SHEAR_H / 2 - 6, BITE_W, 12);
        for (let k = 0; k < 10; k++) {
          g.fillStyle(k % 2 ? LEAF : YEW_LIT, 0.9);
          g.fillEllipse(x0 + ((k * 37) % BITE_W), y + SHEAR_H / 2 - (ph / 120) * 30 - (k % 3) * 6, 5, 3);
        }
      }
    }
  });
  // Hall III: the growing lamps over the beds, and the vine runners writhing toward the path.
  for (const b of BEDS) {
    if (!near(view, MID, b.y, 700)) continue;
    // A bed whose valve is shut: its lamps dark, its runners lying still.
    let on = true;
    try { on = !saveTest({ flag: b.flag }); } catch { /* no save loaded (validator) */ }
    for (let x = L + 120; x < R - 60; x += 240) {
      if (x > b.gap[0] - 60 && x < b.gap[1] + 60) continue;
      growLamp(g, x, b.y + 4, on, t, 60);
    }
    if (!on) continue;
    for (let i = 0; i < 8; i++) {
      const x = L + 60 + i * ((R - L - 120) / 7);
      if (x > b.gap[0] - 30 && x < b.gap[1] + 30) continue;
      const reach = 10 + Math.sin(t * 1.4 + i * 1.7) * 8;
      bramble(g, x, b.y + b.h / 2, x + Math.sin(t + i) * 14, b.y - reach, t + i, 0x4a8a2a, 0.55);
    }
  }
  // The rotary sprinkler: a brass head on the bench throwing a jet of water round in a circle.
  if (near(view, ROTARY.x, ROTARY.y, ROTARY.length + 60)) {
    const a = ROTARY.phase + t * ROTARY.rad;
    for (let k = 0; k < 14; k++) {
      const f = k / 14;
      const wob = Math.sin(t * 20 + k) * 3;
      g.fillStyle(0xd8f4ff, 0.7 - f * 0.4);
      g.fillCircle(ROTARY.x + Math.cos(a) * ROTARY.length * f - Math.sin(a) * wob, ROTARY.y + Math.sin(a) * ROTARY.length * f + Math.cos(a) * wob, 3 + f * 3);
    }
    g.fillStyle(0x3a2a12, 1); g.fillCircle(ROTARY.x, ROTARY.y, 12);
    g.fillStyle(BRASS, 1); g.fillCircle(ROTARY.x, ROTARY.y, 8);
    g.lineStyle(3, BRASS, 1); g.lineBetween(ROTARY.x, ROTARY.y, ROTARY.x + Math.cos(a) * 16, ROTARY.y + Math.sin(a) * 16);
  }
  // The great dome over the throne: the iron ribs fanning from the oculus, sunlight through the glass.
  if (near(view, MID, 160, 500)) {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.08 + (k / 8) * 0.84);
      ironRib(g, MID, 30, MID - Math.cos(a) * 640, 30 + Math.sin(a) * 300, 3);
    }
    for (let i = 0; i < 4; i++) {
      const x = MID - 200 + i * 130 + Math.sin(t * 0.25 + i) * 14;
      g.fillStyle(0xf8ffd8, 0.035); g.fillTriangle(x - 12, 40, x + 30, 40, x + 70, 290);
    }
    glow(g, MID, 70, 60 + Math.sin(t) * 6, ROSE, 0.025, 3);
  }
  // Pollen hangs in the warm air everywhere; it settles slowly.
  motes(g, view, t, 18, SAP, 10, 24, 1.4, 31);
  motes(g, view, t * 0.6, 8, ROSE_PALE, 18, 40, 2, 7);
  // Condensation on the glass: drips running down the window light by the walls.
  for (let i = 0; i < 6; i++) {
    const x = (i % 2 ? R + 12 : L - 28) + ((i * 7) % 16);
    const y = view.y + ((t * 40 + i * 211) % view.h);
    g.fillStyle(GLASS, 0.35); g.fillEllipse(x, y, 2, 6);
  }
}

// ── People: the pruned, coming loose ─────────────────────────────────

const NPCS: NpcDef[] = [
  {
    id: 'glasshouse-thatch', name: 'Goodwife Marjoram Thatch', title: 'Beekeeper of the Bloom Court, pruned',
    look: { body: 0xd8b898, accent: 0x6a5a2a, hat: 'straw', traits: ['apron'], size: 0.95, eye: 0xc8e8a8 },
    at: { x: 380, y: 2420 },
    talks: [
      {
        when: { monarch: 'verdigra' },
        lines: [
          'My arms. Look — my own arms, and not a leaf on them. I have been a hedge for four summers, dear.',
          'We were three jars of honey short. Three jars. She had the bees as well. Said they were "hers by right of flower".',
          'The others are coming out of the yew all through the house now, slow as sap. Some of them have forgotten how to talk.',
          'Go and look at the throne, would you, and tell me she is not on it. I want to hear someone say it.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-3' },
        lines: [
          '...the Nursemaid is down? Then there is nobody left between you and her but the glass.',
          'She will cut. She always cuts first. And then she grafts what is left onto something she likes better.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-1' },
        lines: [
          '...you stopped the shears. I heard them stop. Four summers they have clipped and clipped and I...',
          'Mind the maze. The hedges in there are people too, and they move when the bell says.',
        ],
      },
      {
        lines: [
          '...is it weighing day? I have the honey. I have it somewhere. Three jars short... only three...',
          '...you are not clipped. Why are you not clipped? Everyone in the garden is clipped.',
          'She tends us, you see. "Until you learn to flower." I have tried. I have tried so hard to flower.',
          'Through the gallery, if you are going. The shears run along the rows like a trimmer on a hedge. Chase the gap.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'verdigra' }, lines: ['Hands. Ten fingers. I counted twice.', 'Where are my bees? Someone find my bees.'] },
      { lines: ['...three jars... only three...', '...learn to flower...', '...is that the scales...'] },
    ],
  },
  {
    id: 'glasshouse-fennick', name: 'Tobiah Fennick', title: 'Shepherd\'s boy, pruned',
    look: { body: 0xe0c0a0, accent: 0x4a6a3a, hat: 'cap', traits: ['scarf'], size: 0.74, eye: 0xc8e8a8 },
    at: { x: 1480, y: 2100 },
    talks: [
      {
        when: { monarch: 'verdigra' },
        lines: [
          'She\'s gone? Properly gone? Then I can have my LEGS back. They\'re still mostly bush. I\'m working on it.',
          'We were a lamb short at the Tithe. ONE lamb. It was a really small lamb. It was barely a lamb.',
          'When I get home I\'m going to cut every hedge in the Wildhunt. Badly. On purpose.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-1' },
        lines: [
          'You beat Snedd! She clipped my ears into little rabbit ears. For a JOKE. Look at them. Don\'t look at them.',
          'The maze has bells. Ring the first one before the second one. The second one shuts the way you came.',
        ],
      },
      {
        lines: [
          '...psst. Don\'t run straight up. The shears go clip-clip-clip-clip along the row, one after another.',
          'Wait till the clip has gone past where you are, then go behind it. Behind it. Not in front.',
          'The rows don\'t all go the same way. The middle one goes backwards. Somebody thought that was clever.',
          '...I\'m not crying, it\'s sap. Hedges leak.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'verdigra' }, lines: ['Legs! Nearly legs!', 'I\'m going to eat SO much toffee.'] },
      { lines: ['...clip clip clip...', '...behind it, not in front...', '...it was a really small lamb...'] },
    ],
  },
  {
    id: 'glasshouse-pennywort', name: 'Old Hob Pennywort', title: 'Cider-presser of Mossgate, pruned',
    look: { body: 0x9a7458, accent: 0x5a3a22, hat: 'beanie', traits: ['beard', 'pipe'], size: 1.15, eye: 0xc8e8a8 },
    at: { x: 560, y: 1590 },
    talks: [
      {
        when: { monarch: 'verdigra' },
        lines: [
          'Eighty-one, I am. Eighty-one and grafted onto a box hedge like a rose onto a briar. At my age.',
          'She did it because my apples came in sour. Sour! It was a wet summer! You cannot tithe the weather!',
          'Help me get my boots on. They have roots in them. I am not wearing boots with roots in.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-2' },
        lines: [
          'The bell woman is beaten? Then the hedges can stand where they like for once. Ha. Look at them.',
          'The nursery\'s past her. Brass valves on the walls turn the lamps off. Turn every one. Don\'t be brave about it.',
        ],
      },
      {
        when: { flag: 'glasshouse-bell-1' },
        lines: [
          'Hear that? The hedge stood across the west and the middle opened. That\'s the first bell for you.',
          'The second bell\'s in the east bit. It shuts the east behind you, mind — but it opens the north. Go on.',
        ],
      },
      {
        lines: [
          '...hrm? Another one. Mind the gravel, they rake it every morning, they\'ll know you were here.',
          'The hedges move when the bell rings. We move. They tell us where to stand and the roots go there.',
          'Bell\'s in the far east corner, past me. If you want anything out of the little west garden, go before you ring it.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'verdigra' }, lines: ['Roots in my boots. ROOTS.', 'Sour apples. Pah.'] },
      { lines: ['...stand where the bell says...', '...they rake it every morning...', '...it was a wet summer...'] },
    ],
  },
  {
    id: 'glasshouse-burnet', name: 'Sister Clary Burnet', title: 'Herbalist of the Spore Court, pruned',
    look: { body: 0xc8a080, accent: 0x3a4a5a, hat: 'hood', traits: ['satchel', 'glasses'], size: 1.0, eye: 0xc8e8a8 },
    at: { x: 1460, y: 1150 },
    talks: [
      {
        when: { monarch: 'verdigra' },
        lines: [
          'I have checked my own pulse eleven times since she fell. It is mine. It does not beat in time with the hedge any more.',
          'She grafted my whole order. The Sisters of the Damp. We were short a bushel of truffles. Truffles!',
          'There is a scar where the union was. I shall keep it. I want to remember exactly how she does it.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-2' },
        lines: [
          'Hesper Lisle down... good. She rang the bell for every one of us. She did not even look up.',
          'Past the roots is the Nursery. She grows the new graft-stock there — the rootstock she puts people on.',
          'If the lamps are lit, the vines are growing. If the vines are growing, do not stand on them. Simple.',
        ],
      },
      {
        lines: [
          '...listen. Do you hear it? Breathing. The whole maze breathes together. In. Out. On her clock.',
          'The Bellwarden keeps the north lawn. She will put the hedges round you in the fight as well. Watch the bell.',
          '...I am quite well. A little woody about the elbows. It is nothing.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'verdigra' }, lines: ['My pulse. Mine.', 'I shall write a paper. A very angry paper.'] },
      { lines: ['...in... out...', '...on her clock...', '...a little woody about the elbows...'] },
    ],
  },
  {
    id: 'glasshouse-oake', name: 'Bramwell Oake', title: 'Under-Gardener, pruned',
    look: { body: 0xb08a68, accent: 0x2a4a2a, hat: 'straw', traits: ['apron', 'tool'], size: 1.2, eye: 0xc8e8a8 },
    at: { x: 1460, y: 945 },
    talks: [
      {
        when: { monarch: 'verdigra' },
        lines: [
          'I grafted people. I want you to know that before you are kind to me. I did the cuts. I bound the unions.',
          'Then I missed a weed in her rose-bed, and she bound mine. That is how it goes, in her garden.',
          'I am going to spend the rest of my life unpicking it. Every hedge in this house. One knot at a time.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-3' },
        lines: [
          'Primula is beaten. She raised half the rootstock in this house from seed. She sang to it.',
          'The Empress is under the dome. She will cut you, and graft you, and then she will let the jungle in.',
          'And when it is all gone to rot, she blooms again out of the rot. Do not stop when she falls. Keep going.',
        ],
      },
      {
        lines: [
          '...the lamps. The lamps grow the vines across the beds. Brass valve at the side of each bed — shut it off.',
          'Or run the sprinkler gap, if you are in a hurry. The sprinkler runs; when it stops, go. Do not get caught wet.',
          'And mind the rotary on the middle bench. I set it going myself. I am sorry.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'verdigra' }, lines: ['One knot at a time.', 'I did the cuts. I can undo them.'] },
      { lines: ['...shut the valves...', '...when it stops, go...', '...I set it going myself...'] },
    ],
  },
  {
    id: 'glasshouse-coldframe', name: 'Lady Ivy Coldframe', title: 'Lady of the Bedchamber, pruned',
    look: { body: 0xe0c0a0, accent: 0x6a2a3a, hat: 'wreath', traits: ['scarf'], size: 0.95, eye: 0xc8e8a8 },
    at: { x: 1440, y: 400 },
    talks: [
      {
        when: { monarch: 'verdigra' },
        lines: [
          'I dressed her every morning for nine years. Green silk, the shears at her belt, a fresh rose at the throat.',
          'One morning the rose had a bruise on it. One petal. She looked at me the way she looks at a weed.',
          'I am free, and I do not know what to wear. Isn\'t that ridiculous? Help me find something that isn\'t green.',
        ],
      },
      {
        when: { encounter: 'glasshouse-warden-3' },
        lines: [
          '...she knows you are coming. She has been deadheading the throne roses all morning. Snip. Snip. Snip.',
          'At the last she goes evergreen — if you are the sort to push her that far. Winter does not touch her then.',
        ],
      },
      {
        lines: [
          '...sh. The Empress is resting. The Empress is always resting just beyond that door. Nobody goes through it.',
          'You will want the beds cleared before you face Primula. She waters her nursery with whatever is to hand.',
          '...a bruise. One petal. I keep thinking about it.',
        ],
      },
    ],
    barks: [
      { when: { monarch: 'verdigra' }, lines: ['Not green. Anything but green.', 'Nine years of roses.'] },
      { lines: ['...snip... snip...', '...one petal...', '...she is resting...'] },
    ],
  },
];

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  {
    kind: 'door', at: { x: MID, y: 2530 }, to: 'heartwood', arrive: { x: 1200, y: 285 },
    label: 'The Crown Stair — back down into the Heartwood',
  },
  { kind: 'waystone', at: { x: 700, y: 2450 } },
  { kind: 'lever', at: BELLS[0].at, flag: BELL_1, label: 'The First Bell' },
  { kind: 'lever', at: BELLS[1].at, flag: BELL_2, label: 'The Second Bell' },
  ...BEDS.map((b, i): Poi => ({ kind: 'lever', at: b.lever, flag: b.flag, label: `Growing-Lamp Valve ${['I', 'II', 'III'][i]}` })),
  { kind: 'encounter', id: 'glasshouse-warden-1' },
  { kind: 'encounter', id: 'glasshouse-warden-2' },
  { kind: 'encounter', id: 'glasshouse-warden-3' },
  { kind: 'monarch', id: 'verdigra', at: { x: MID, y: 200 } },
  { kind: 'sign', at: { x: 1100, y: 2460 }, text: 'THE GLASSHOUSE. The Bloom Tithe is weighed here. What does not flower is pruned. What is pruned is kept.' },
  { kind: 'sign', at: { x: 1060, y: 2222 }, text: 'PRUNING GALLERY. The shears run the rows in turn. Visitors keep to the lawn between.' },
  { kind: 'sign', at: { x: 1060, y: 1650 }, text: 'TOPIARY WALK. Subjects stand where the bell tells them. First bell east. Second bell further east.' },
  { kind: 'sign', at: { x: 700, y: 965 }, text: 'NURSERY. The lamps are not to be shut off. Valves for the Nursemaid\'s use only.' },
  { kind: 'chest', id: 'glasshouse-chest-gallery', at: { x: 330, y: 1964 }, coins: 280, orbs: 3 },
  { kind: 'chest', id: 'glasshouse-chest-maze', at: { x: 330, y: 1380 }, item: 'charm-graft-twine', coins: 140 },
  { kind: 'chest', id: 'glasshouse-chest-nursery', at: { x: 1460, y: 600 }, item: 'charm-cloche', orbs: 4 },
  { kind: 'chest', id: 'glasshouse-chest-throne', at: { x: 640, y: 262 }, coins: 480, orbs: 7, open: { monarch: 'verdigra' } },
];

export const GLASSHOUSE_AREA: AreaDef = {
  id: 'glasshouse',
  isle: 'life',
  name: 'The Glasshouse',
  subtitle: 'Empress Verdigra\'s palace of iron and glass, in the crown of the Heartwood',
  w: W,
  h: H,
  bg: 0x0c140c,
  accent: VERDIGRIS,
  weather: 'pollen',
  spawn: { x: MID, y: 2440 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver },
  solids,
  exits: [],
  pois: POIS,
  npcs: NPCS,
  gloom: 0.22,
  hazards,
  gates,
  checkpoints: [
    { x: MID, y: 2440 },   // the potting hall
    { x: MID, y: 2222 },   // the gallery door
    { x: MID, y: 2100 },   // between rows one and two
    { x: MID, y: 1964 },   // between rows two and three
    { x: MID, y: 1790 },   // Snedd's dais
    { x: MID, y: 1600 },   // the maze's south walk
    { x: 520, y: 1380 },   // the west garden
    { x: 940, y: 1380 },   // the maze's middle walk
    { x: 1340, y: 1380 },  // the east pocket
    { x: MID, y: 1150 },   // Lisle's lawn
    { x: MID, y: 950 },    // the nursery landing
    { x: 1100, y: 770 },   // the first bench
    { x: 600, y: 600 },    // the middle bench (clear of the rotary)
    { x: MID, y: 410 },    // Dewe's dais
    { x: MID, y: 265 },    // under the dome
  ],
};
