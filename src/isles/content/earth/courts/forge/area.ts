import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { barrel, crate, dim, flagstones, glow, lamp, lit, road, shadow, type G } from '../../../../art/IsleArt';
import {
  anvil, anvilHall, bellDerrick, bellPitGround, blastFurnace, bridgeChain, bridgeTower, cinderGround, forgeWaystone,
  ingotStack, magnetDisc, mineAdit, oreCart, pigBed, poly, quenchKerb, railTrack, regentSeal, rivets, runnelBed,
  scrapPile, slagHeap, smithy, strata, titheHook, tripHammerFrame, tripHammerHead,
} from './art';
import {
  CINDER, CINDER_DARK, FORGE_COLOR, HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT,
  IRONSTONE, IRONSTONE_DARK, OCHRE, OCHRE_DARK, QUENCH_LIT, RUST, SLAG, STEAM, STONE, STONE_DARK, TIMBER,
  TIMBER_DARK, TIMBER_LIT,
} from './palette';
import { FORGE_CROWD, FORGE_NPCS } from './npcs';
import { heatColor } from './util';

/**
 * The Forge Court — a foundry town in the iron hills on the Hold's east shoulder.
 *
 * Read it from the Stonehold road in:
 * • **Hammer Row** runs east from the west gate past the waystone — smithies both sides, every
 *   door a hearth, and two of them bricked up under the Regent's seal; Mags Clinker's ironmongery
 *   is on the north side;
 * • **the casting floor** (north-west): three blast furnaces stand against the banded ironstone
 *   face with their pig beds cut in the sand before them, where Brannoc pours and Wim taps;
 * • **Hook Square**, where the Ore Road crosses Hammer Row: the great steelyard of the Tithe Hook
 *   straddles the road, and every household's iron is weighed there; the Great Trip-Hammer that
 *   beats time for every smith in town thumps on the square's east side;
 * • **the quench pond and the bell pit** (south-west): Hild's steaming pond, and the pit where
 *   Osric Toll casts the Regent's bells with the names of the interred round their lips;
 * • **the rail yard** along the south: ore carts come out of the adit in the east hill and run
 *   the whole width of the town to the tipple by the pond;
 * • **the Runnel**: a brick channel of molten slag running south from under Prince Anvil's hall,
 *   crossed by two chain bridges; beyond it Rusk's scrapyard and the slag heaps, Linka's chain
 *   works, the journeymen's long forge, and the **Anvil Hall** itself, its roof cast as an anvil.
 */

export const FORGE_W = 2400;
export const FORGE_H = 1600;

/** Hammer Row's line, and the Ore Road's. */
export const ROW_Y = 800;
export const ORE_X = 1200;

/** The Tithe Hook straddling the Ore Road on Hook Square. */
export const HOOK: Pt = { x: 1200, y: 740 };
/** The Great Trip-Hammer: its stithy (anvil block) foot. */
export const TRIP: Pt = { x: 1460, y: 700 };
/** The three blast furnaces (hearth fronts). */
export const FURNACES: Pt[] = [{ x: 360, y: 420 }, { x: 620, y: 420 }, { x: 880, y: 420 }];
/** The quench pond — the court's fishing water. */
export const QUENCH_POND: Rect = { x: 170, y: 1040, w: 380, h: 180 };
/** The bell pit. */
export const BELL_PIT: Pt = { x: 820, y: 1200 };
const PIT_R = 110;
/** Prince Anvil's hall: the middle of its front step. */
export const HALL: Pt = { x: 1960, y: 440 };
/** The Runnel's channel, and its two chain bridges (deck spans). */
export const RUNNEL: Rect = { x: 1590, y: 450, w: 60, h: 930 };
export const BRIDGES: [number, number][] = [[750, 850], [1080, 1160]];
/** The rail line along the south of town. */
export const RAIL_Y = 1470;
/** The slag heaps and the scrapyard. */
export const SLAG_HEAPS: [number, number, number][] = [[2180, 1190, 0.9], [2050, 1350, 0.7]];
export const SCRAP_PILES: Pt[] = [{ x: 1780, y: 1120 }, { x: 1990, y: 1070 }, { x: 1760, y: 1300 }];
/** The Hall's forecourt (iron plate). */
export const FORECOURT: Rect = { x: 1690, y: 440, w: 540, h: 180 };

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Chimneys that throw a spark now and then in `animateOver`. */
const chimneys: { x: number; y: number; s: number }[] = [];
/** Forge doors that flicker in `animate`. */
const hearths: { x: number; y: number; s: number }[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

type SignKind = 'horseshoe' | 'anvil' | 'chain' | 'bell' | 'nail' | 'kettle';

/** A smithy on one of the rows, with its footprint solid and its hearth and chimney noted for animation. */
function addSmithy(x: number, y: number, w: number, h: number, sign: SignKind, interred = false, roof?: number): void {
  addPiece(x, y, w + 40, h + 100, (g, rng) => smithy(g, x, y, w, h, { sign, interred, roof }, rng), { kind: 'rect', x: x - w / 2, y: y - 26, w, h: 26 });
  if (!interred) {
    chimneys.push({ x: x - w / 2 + w * 0.76, y: y - h - 88, s: (x * 0.013) % 1 });
    hearths.push({ x: x - w / 2 + w * 0.36, y: y - Math.min(56, h * 0.62) * 0.3, s: (x * 0.007) % 1 });
  }
}

// ── Layout ───────────────────────────────────────────────────────────

// The ironstone face along the north (flat in the ground; solid).
solids.push({ kind: 'rect', x: 0, y: 0, w: FORGE_W, h: 150 });
// The east hill.
solids.push({ kind: 'rect', x: 2360, y: 150, w: 40, h: FORGE_H - 150 });

// The blast furnaces on the casting floor.
for (const f of FURNACES) {
  addPiece(f.x, f.y, 260, 300, (g, rng) => blastFurnace(g, f.x, f.y, 0.9, rng), { kind: 'rect', x: f.x - 64, y: f.y - 34, w: 152, h: 34 });
  hearths.push({ x: f.x, y: f.y - 14, s: f.x * 0.001 });
}
// Pig iron cooling in stacks by the casting floor, and a barrow.
addPiece(170, 560, 70, 50, (g, rng) => ingotStack(g, 170, 560, 1.1, 5, rng), { kind: 'circle', x: 170, y: 552, r: 22 });
addPiece(1060, 470, 70, 50, (g, rng) => ingotStack(g, 1060, 470, 1, 4, rng), { kind: 'circle', x: 1060, y: 462, r: 20 });

// Hammer Row, north side (bases at y 720) and south side (bases at y 960).
addSmithy(220, 720, 150, 104, 'horseshoe');
addSmithy(420, 720, 130, 96, 'nail', true);
addSmithy(700, 720, 170, 112, 'kettle', false, 0x4a4036);
addSmithy(930, 720, 150, 100, 'chain');
addSmithy(240, 960, 150, 100, 'anvil');
addSmithy(440, 960, 140, 96, 'horseshoe', true);
addSmithy(1000, 960, 150, 108, 'bell', false, 0x5a4a30);
addSmithy(1400, 960, 150, 102, 'anvil');
// East of the Runnel: Linka's chain works and the journeymen's long forge.
addSmithy(1790, 960, 160, 104, 'chain');
addSmithy(2150, 960, 200, 112, 'anvil', false, 0x3a3e44);

// Street lamps and odds and ends along the row.
for (const x of [120, 560, 1060, 1340, 1760, 2280]) addPiece(x, 742, 30, 70, (g) => lamp(g, x, 742, HEAT_YELLOW, IRON_DARK));
for (const x of [340, 820, 1500, 2000]) addPiece(x, 870, 30, 70, (g) => lamp(g, x, 870, HEAT_YELLOW, IRON_DARK));
addPiece(820, 724, 30, 40, (g) => barrel(g, 820, 724, 16, TIMBER, IRON_DARK), { kind: 'circle', x: 820, y: 718, r: 12 });
addPiece(330, 964, 30, 40, (g) => crate(g, 330, 964, 22, TIMBER), { kind: 'circle', x: 330, y: 956, r: 13 });
addPiece(1530, 964, 30, 40, (g) => barrel(g, 1530, 964, 16, TIMBER, IRON_DARK), { kind: 'circle', x: 1530, y: 958, r: 12 });

// The Tithe Hook straddling the Ore Road, ingots waiting to be weighed.
addPiece(HOOK.x, HOOK.y, 260, 280, (g) => titheHook(g, HOOK.x, HOOK.y, 0.08));
solids.push({ kind: 'rect', x: HOOK.x - 100, y: HOOK.y - 10, w: 28, h: 12 }, { kind: 'rect', x: HOOK.x + 72, y: HOOK.y - 10, w: 28, h: 12 });
addPiece(1090, 900, 70, 50, (g, rng) => ingotStack(g, 1090, 900, 1, 3, rng), { kind: 'circle', x: 1090, y: 892, r: 20 });
addPiece(1310, 905, 70, 50, (g, rng) => ingotStack(g, 1310, 905, 1, 4, rng), { kind: 'circle', x: 1310, y: 897, r: 20 });

// The Great Trip-Hammer (its helve and head move in `animate`).
addPiece(TRIP.x, TRIP.y, 260, 200, (g) => tripHammerFrame(g, TRIP.x, TRIP.y, 1), { kind: 'rect', x: TRIP.x - 132, y: TRIP.y - 18, w: 204, h: 20 });

// The bell derrick over the pit (the pit itself is in the ground; its rim is solid).
addPiece(BELL_PIT.x, BELL_PIT.y + 10, 300, 280, (g) => bellDerrick(g, BELL_PIT.x, BELL_PIT.y, PIT_R), { kind: 'circle', x: BELL_PIT.x, y: BELL_PIT.y + 5, r: 100 });

// The quench pond keeps you to its kerb.
solids.push({ kind: 'rect', x: QUENCH_POND.x - 10, y: QUENCH_POND.y - 10, w: QUENCH_POND.w + 20, h: QUENCH_POND.h + 20 });

// The Runnel: solid between and beyond its two bridges, the sump at its foot.
{
  let y0 = RUNNEL.y;
  for (const [a, b] of BRIDGES) { solids.push({ kind: 'rect', x: RUNNEL.x, y: y0, w: RUNNEL.w, h: a - y0 }); y0 = b; }
  solids.push({ kind: 'rect', x: RUNNEL.x, y: y0, w: RUNNEL.w, h: RUNNEL.y + RUNNEL.h - y0 });
  solids.push({ kind: 'circle', x: RUNNEL.x + RUNNEL.w / 2, y: RUNNEL.y + RUNNEL.h + 20, r: 40 });
}
// The chain bridges: a tower at each corner, a chain along each edge.
for (const [a, b] of BRIDGES) {
  const xw = RUNNEL.x - 12, xe = RUNNEL.x + RUNNEL.w + 12;
  addPiece((xw + xe) / 2, a + 2, 120, 110, (g) => { bridgeChain(g, { x: xw, y: a + 2 }, { x: xe, y: a + 2 }, 12); bridgeTower(g, xw, a + 2); bridgeTower(g, xe, a + 2); });
  addPiece((xw + xe) / 2, b - 2, 120, 110, (g) => { bridgeChain(g, { x: xw, y: b - 2 }, { x: xe, y: b - 2 }, 12); bridgeTower(g, xw, b - 2); bridgeTower(g, xe, b - 2); });
}

// Prince Anvil's hall, its forecourt anvils, and a rack of hammers.
addPiece(HALL.x, HALL.y, 760, 420, (g, rng) => anvilHall(g, HALL.x, HALL.y, 500, 150, rng), { kind: 'rect', x: HALL.x - 266, y: HALL.y - 34, w: 532, h: 34 });
for (const x of [1780, 2140]) addPiece(x, 560, 60, 50, (g) => anvil(g, x, 560, 1.1, 0), { kind: 'circle', x, y: 550, r: 14 });

// The scrapyard: scrap piles, the slag heaps, the magnet crane.
for (const p of SCRAP_PILES) addPiece(p.x, p.y, 100, 60, (g, rng) => scrapPile(g, p.x, p.y, 1, rng), { kind: 'circle', x: p.x, y: p.y - 6, r: 26 });
for (const [x, y, s] of SLAG_HEAPS) addPiece(x, y, 200 * s, 110 * s, (g, rng) => slagHeap(g, x, y, s, rng), { kind: 'circle', x, y: y - 6, r: 62 * s });
addPiece(2290, 1100, 300, 260, (g) => magnetCrane(g, 2290, 1100), { kind: 'rect', x: 2272, y: 1086, w: 36, h: 16 });

// The rail yard: the tipple by the pond, parked carts, the adit in the east hill.
addPiece(470, RAIL_Y + 6, 120, 120, (g) => tipple(g, 470, RAIL_Y + 6), { kind: 'rect', x: 425, y: RAIL_Y - 18, w: 90, h: 26 });
for (const x of [760, 1540]) addPiece(x, RAIL_Y + 8, 60, 50, (g) => oreCart(g, x, RAIL_Y, 1, 0, x < 1000 ? 'empty' : 'ore'), { kind: 'circle', x, y: RAIL_Y, r: 18 });
addPiece(2350, RAIL_Y + 4, 120, 120, (g) => mineAdit(g, 2350, RAIL_Y + 4));

// The waystone by the west gate.
addPiece(140, 884, 50, 100, (g) => forgeWaystone(g, 140, 884), { kind: 'circle', x: 140, y: 878, r: 14 });

/** The rail tipple: a timber trestle over an iron ore bin, a tipped cart's ramp. */
function tipple(g: G, x: number, y: number): void {
  shadow(g, x, y, 130, 30, 0.35);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 46, y - 40, 92, 38);
  g.fillStyle(IRON, 1); g.fillRect(x - 44, y - 40, 88, 6);
  rivets(g, x - 40, y - 30, x + 40, y - 30, 8, 1.2);
  for (let i = 0; i < 10; i++) { g.fillStyle(i % 2 ? IRONSTONE : OCHRE_DARK, 1); g.fillEllipse(x - 36 + i * 8, y - 42, 10, 6); }
  for (const k of [-1, 1]) {
    g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(x + k * 42, y - 2, x + k * 34, y - 96);
    g.lineStyle(2, TIMBER_LIT, 0.5); g.lineBetween(x + k * 42 - 2, y - 2, x + k * 34 - 2, y - 96);
  }
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x - 46, y - 96, x + 60, y - 96);
  g.lineStyle(3, TIMBER, 1); g.lineBetween(x - 40, y - 60, x + 40, y - 78);
  // A cart tipped on its cradle, ore spilling.
  oreCart(g, x + 18, y - 98, 0.8, -0.6, 'ore');
  for (let i = 0; i < 5; i++) { g.fillStyle(IRONSTONE, 1); g.fillCircle(x - 4 - i * 3, y - 86 + i * 8, 3); }
}

/** Rusk's magnet crane: a lattice mast, a jib reaching west, a magnet hanging on its cable over the scrap. */
function magnetCrane(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 16);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 20, y - 12, 40, 14);
  for (const k of [-1, 1]) { g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x + k * 12, y - 10, x + k * 8, y - 230); }
  for (let i = 0; i < 10; i++) {
    const y1 = y - 10 - i * 22, y2 = y1 - 22;
    g.lineStyle(1.5, IRON, 1); g.lineBetween(x - 12, y1, x + 8, y2); g.lineBetween(x + 12, y1, x - 8, y2);
  }
  // The jib.
  const jx = x - 210, jy = y - 214;
  g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x, y - 230, jx, jy); g.lineBetween(x, y - 206, jx, jy);
  for (let i = 1; i < 10; i++) { const k = i / 10; g.lineStyle(1.2, IRON, 1); g.lineBetween(x + (jx - x) * k, y - 230 + (jy - (y - 230)) * k, x + (jx - x) * (k + 0.05), y - 206 + (jy - (y - 206)) * (k + 0.05)); }
  // Counterweight and cab.
  g.fillStyle(STONE, 1); g.fillRect(x + 6, y - 240, 30, 22);
  g.fillStyle(IRON, 1); g.fillRect(x - 16, y - 204, 28, 22);
  g.fillStyle(HEAT_YELLOW, 0.6); g.fillRect(x - 12, y - 200, 10, 8);
  // Cable and magnet.
  const mx = jx + 20, my = y - 60;
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(mx, jy + 4, mx, my - 10);
  magnetDisc(g, mx, my, 26, 0);
  g.fillStyle(IRON_DARK, 1); g.fillRect(mx - 26, my - 4, 52, 10);
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 160): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

/** The trip-hammer's beat: a slow lift on the cam, then the drop. 1.2 s a blow. */
const tripLift = (t: number): number => {
  const ph = (t / 1.2) % 1;
  return ph < 0.8 ? ph / 0.8 : 1 - (ph - 0.8) / 0.2;
};

/** The decorative cart that runs out of the adit every so often: x at time t, or null. */
const runningCartX = (t: number): number | null => {
  const ph = t % 34;
  if (ph > 20) return null;
  return 2340 - (ph / 20) * (2340 - 560);
};

const painter: AreaPainter = {
  ground(g, rng) {
    const W = FORGE_W, H = FORGE_H;
    cinderGround(g, { x: 0, y: 0, w: W, h: H }, rng);

    // The ironstone face along the north, and the east hill.
    strata(g, 0, 0, W, 170, rng);
    g.fillStyle(0x000000, 0.25); g.fillRect(0, 168, W, 14);
    g.fillStyle(IRONSTONE_DARK, 1); g.fillRect(2356, 150, 44, H - 150);
    for (let y = 150; y < H; y += 26) { g.fillStyle(y % 52 ? IRONSTONE : OCHRE_DARK, 1); g.fillEllipse(2362 + rng() * 20, y + rng() * 10, 26, 14); }

    // The casting floor: ochre moulding sand, the pig beds, runners from each tap-hole.
    g.fillStyle(dim(OCHRE, 0.45), 1); g.fillRect(200, 420, 840, 190);
    g.fillStyle(OCHRE_DARK, 1); g.fillRect(206, 426, 828, 178);
    for (let i = 0; i < 300; i++) { g.fillStyle(rng() < 0.5 ? OCHRE : dim(OCHRE_DARK, 0.3), 0.4); g.fillCircle(206 + rng() * 828, 426 + rng() * 178, 1.2); }
    for (const f of FURNACES) {
      g.lineStyle(9, dim(OCHRE_DARK, 0.5), 1); g.lineBetween(f.x, f.y + 4, f.x, f.y + 52);
      g.lineStyle(4, HEAT_RED, 0.6); g.lineBetween(f.x, f.y + 4, f.x, f.y + 52);
      pigBed(g, f.x, f.y + 100, 170, 70, 0);
    }

    // Hammer Row and the Ore Road: black setts worn shiny down the middle.
    road(g, [{ x: 0, y: ROW_Y }, { x: RUNNEL.x - 10, y: ROW_Y }], 110, STONE_DARK, CINDER_DARK, STONE, rng);
    road(g, [{ x: RUNNEL.x + RUNNEL.w + 10, y: ROW_Y }, { x: 2340, y: ROW_Y }], 110, STONE_DARK, CINDER_DARK, STONE, rng);
    road(g, [{ x: ORE_X, y: H }, { x: ORE_X, y: 620 }], 100, STONE_DARK, CINDER_DARK, STONE, rng);
    // Lanes off the row: up to the casting floor, down to the pond and pit, east to the Hall.
    road(g, [{ x: 555, y: ROW_Y }, { x: 555, y: 610 }], 60, dim(STONE_DARK, 0.15), CINDER_DARK, STONE_DARK, rng);
    road(g, [{ x: 1070, y: ROW_Y }, { x: 1070, y: 610 }], 54, dim(STONE_DARK, 0.15), CINDER_DARK, STONE_DARK, rng);
    road(g, [{ x: 640, y: ROW_Y }, { x: 640, y: 1400 }, { x: ORE_X, y: 1400 }], 54, dim(STONE_DARK, 0.15), CINDER_DARK, STONE_DARK, rng);
    road(g, [{ x: 1840, y: ROW_Y }, { x: 1840, y: FORECOURT.y + FORECOURT.h }], 70, dim(STONE_DARK, 0.15), CINDER_DARK, STONE_DARK, rng);
    road(g, [{ x: RUNNEL.x + RUNNEL.w + 10, y: 1120 }, { x: 2000, y: 1120 }], 50, dim(STONE_DARK, 0.15), CINDER_DARK, STONE_DARK, rng);
    road(g, [{ x: 1280, y: 1120 }, { x: RUNNEL.x - 10, y: 1120 }], 50, dim(STONE_DARK, 0.15), CINDER_DARK, STONE_DARK, rng);

    // Hook Square: cast-iron floor plates round the steelyard.
    for (let y = 680; y < 930; y += 40) {
      for (let x = 1060; x < 1340; x += 40) {
        g.fillStyle(((x + y) / 40) % 2 ? IRON : dim(IRON, 0.2), 1); g.fillRect(x + 1, y + 1, 38, 38);
        g.fillStyle(IRON_LIT, 0.18); g.fillRect(x + 1, y + 1, 38, 2);
        for (const [dx, dy] of [[5, 5], [34, 5], [5, 34], [34, 34]]) { g.fillStyle(IRON_LIT, 0.6); g.fillCircle(x + dx, y + dy, 1.4); }
        // Cross-hatch tread.
        g.lineStyle(1, IRON_DARK, 0.45);
        for (let k = 8; k < 36; k += 8) { g.lineBetween(x + k, y + 4, x + k + 4, y + 36); }
      }
    }
    g.lineStyle(3, IRON_DARK, 1); g.strokeRect(1060, 680, 280, 250);
    regentSeal(g, ORE_X, 900, 18, dim(IRON, 0.3));

    // The forecourt of the Anvil Hall: great riveted plates.
    flagstones(g, FORECOURT, 60, IRON, IRON_DARK, rng);
    for (let x = FORECOURT.x; x < FORECOURT.x + FORECOURT.w; x += 60) rivets(g, x + 6, FORECOURT.y + 6, x + 6, FORECOURT.y + FORECOURT.h - 6, 5, 1.2);

    // The quench pond.
    quenchKerb(g, QUENCH_POND);
    // The bell pit.
    bellPitGround(g, BELL_PIT.x, BELL_PIT.y, PIT_R, rng);

    // The Runnel's bed (the molten fill flows in `animate`), the sump, and the bridge decks.
    runnelBed(g, RUNNEL);
    g.fillStyle(dim(SLAG, 0.4), 1); g.fillCircle(RUNNEL.x + RUNNEL.w / 2, RUNNEL.y + RUNNEL.h + 20, 46);
    g.fillStyle(HEAT_RED, 0.55); g.fillCircle(RUNNEL.x + RUNNEL.w / 2, RUNNEL.y + RUNNEL.h + 20, 36);
    for (const [a, b] of BRIDGES) {
      g.fillStyle(0x000000, 0.4); g.fillRect(RUNNEL.x - 14, a + 6, RUNNEL.w + 28, b - a);
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(RUNNEL.x - 14, a, RUNNEL.w + 28, b - a);
      for (let x = RUNNEL.x - 12; x < RUNNEL.x + RUNNEL.w + 12; x += 9) {
        g.fillStyle(rng() < 0.5 ? TIMBER : dim(TIMBER, 0.15), 1); g.fillRect(x, a + 2, 7, b - a - 4);
      }
      g.fillStyle(IRON_DARK, 1); g.fillRect(RUNNEL.x - 14, a, RUNNEL.w + 28, 4); g.fillRect(RUNNEL.x - 14, b - 4, RUNNEL.w + 28, 4);
    }

    // The rail line: from the tipple to the adit.
    railTrack(g, { x: 400, y: RAIL_Y }, { x: 2360, y: RAIL_Y });
    // A siding to the Hook for the Tithe carts.
    railTrack(g, { x: ORE_X + 30, y: RAIL_Y }, { x: ORE_X + 30, y: 960 });

    // The scrapyard: rust-stained ground and dropped iron.
    g.fillStyle(RUST, 0.18); g.fillEllipse(1960, 1220, 520, 320);
    for (let i = 0; i < 70; i++) {
      const x = 1700 + rng() * 620, y = 1040 + rng() * 360;
      g.fillStyle(rng() < 0.5 ? IRON : RUST, 0.6); g.fillRect(x, y, 3 + rng() * 6, 2);
    }
    // Slag dribbles where the barrows go to the heaps.
    for (let i = 0; i < 40; i++) {
      g.fillStyle(SLAG, 0.7); g.fillEllipse(1700 + rng() * 600, 1000 + rng() * 420, 5 + rng() * 6, 3 + rng() * 2);
    }
    // Spilled ore along the rails.
    for (let i = 0; i < 60; i++) { g.fillStyle(rng() < 0.5 ? IRONSTONE : OCHRE, 0.7); g.fillCircle(420 + rng() * 1920, RAIL_Y + (rng() - 0.5) * 50, 1.5 + rng() * 2); }
  },

  pieces,

  animate(g, t, view) {
    // The Runnel: molten slag flowing south, crust plates riding it.
    if (inView(RUNNEL.x, view.y + view.h / 2, view, 300)) {
      const y0 = Math.max(RUNNEL.y, view.y - 40), y1 = Math.min(RUNNEL.y + RUNNEL.h, view.y + view.h + 40);
      if (y1 > y0) {
        g.fillStyle(HEAT_ORANGE, 0.7); g.fillRect(RUNNEL.x + 4, y0, RUNNEL.w - 8, y1 - y0);
        g.fillStyle(HEAT_YELLOW, 0.35 + Math.sin(t * 3) * 0.05); g.fillRect(RUNNEL.x + 18, y0, RUNNEL.w - 36, y1 - y0);
        for (let i = 0; i < 60; i++) {
          const y = RUNNEL.y + ((i * 61 + t * 40) % RUNNEL.h);
          if (y < y0 || y > y1) continue;
          const x = RUNNEL.x + 8 + ((i * 37) % (RUNNEL.w - 24));
          g.fillStyle(SLAG, 0.85); g.fillEllipse(x + 4, y, 10 + (i % 4) * 4, 6 + (i % 3) * 2);
          g.lineStyle(1, HEAT_RED, 0.8); g.strokeEllipse(x + 4, y, 10 + (i % 4) * 4, 6 + (i % 3) * 2);
        }
      }
      const sx = RUNNEL.x + RUNNEL.w / 2, sy = RUNNEL.y + RUNNEL.h + 20;
      if (inView(sx, sy, view)) { g.fillStyle(HEAT_ORANGE, 0.4 + Math.sin(t * 2) * 0.1); g.fillCircle(sx, sy, 28); glow(g, sx, sy, 60, HEAT_ORANGE, 0.03, 3); }
    }
    // Hearths flickering in every forge door and under every furnace.
    for (const h of hearths) {
      if (!inView(h.x, h.y, view)) continue;
      const f = 0.6 + Math.sin(t * 7 + h.s * 20) * 0.2 + Math.sin(t * 13 + h.s * 7) * 0.15;
      glow(g, h.x, h.y, 26, HEAT_ORANGE, 0.03 * f, 3);
    }
    // The trip-hammer: helve and head, with a burst of sparks on each blow.
    if (inView(TRIP.x, TRIP.y, view, 260)) {
      const lift = tripLift(t);
      tripHammerHead(g, TRIP.x, TRIP.y, 1, lift);
      const ph = (t / 1.2) % 1;
      if (ph < 0.08) {
        const k = ph / 0.08;
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i - 4.5) * 0.3;
          g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_WHITE, 1 - k);
          g.fillCircle(TRIP.x + Math.cos(a) * (10 + k * 46), TRIP.y - 54 + Math.sin(a) * (10 + k * 30) + k * k * 20, 1.6);
        }
      }
      // A red-hot billet on the stithy.
      g.fillStyle(heatColor(0.75 + Math.sin(t) * 0.1), 1); g.fillRoundedRect(TRIP.x - 12, TRIP.y - 58, 24, 6, 2);
    }
    // The slag heaps' seams, breathing.
    for (const [x, y, s] of SLAG_HEAPS) {
      if (!inView(x, y, view)) continue;
      const k = 0.5 + Math.sin(t * 0.8 + x) * 0.5;
      glow(g, x, y - 40 * s, 50 * s, HEAT_RED, 0.025 + k * 0.02, 3);
    }
    // A cart rumbling out of the adit to the tipple.
    const cx = runningCartX(t);
    if (cx !== null && inView(cx, RAIL_Y, view)) oreCart(g, cx, RAIL_Y, 1, Math.PI, 'ore');
    // The quench pond's surface: slow rings.
    if (inView(QUENCH_POND.x + QUENCH_POND.w / 2, QUENCH_POND.y, view, 300)) {
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.3 + i / 4) % 1;
        const cxp = QUENCH_POND.x + 60 + ((i * 113) % (QUENCH_POND.w - 120)), cyp = QUENCH_POND.y + 40 + ((i * 59) % (QUENCH_POND.h - 80));
        g.lineStyle(1.2, QUENCH_LIT, 0.4 * (1 - ph)); g.strokeEllipse(cxp, cyp, 8 + ph * 40, 3 + ph * 14);
      }
    }
    // The Hall's door-light.
    if (inView(HALL.x, HALL.y, view, 300)) {
      g.fillStyle(HEAT_ORANGE, 0.25 + Math.sin(t * 2.2) * 0.1); g.fillRect(HALL.x - 53, HALL.y - 33, 106, 3);
      glow(g, HALL.x, HALL.y - 20, 50, HEAT_ORANGE, 0.02, 3);
    }
  },

  animateOver(g, t, view) {
    // Steam off the quench pond.
    if (inView(QUENCH_POND.x + QUENCH_POND.w / 2, QUENCH_POND.y, view, 300)) {
      for (let i = 0; i < 12; i++) {
        const ph = (t * 0.18 + i / 12) % 1;
        const x = QUENCH_POND.x + 30 + ((i * 97) % (QUENCH_POND.w - 60)) + Math.sin(t + i) * 10;
        const y = QUENCH_POND.y + QUENCH_POND.h * 0.6 - ph * 120;
        g.fillStyle(STEAM, 0.16 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 14 + ph * 22);
      }
    }
    // Smoke off the furnace throats and the Hall's chimneys.
    const stacks: Pt[] = [
      ...FURNACES.map((f) => ({ x: f.x, y: f.y - 243 })),
      { x: HALL.x - 125, y: HALL.y - 30 - 150 - 42 - 128 }, { x: HALL.x + 125, y: HALL.y - 30 - 150 - 42 - 128 },
    ];
    for (const s of stacks) {
      if (!inView(s.x, s.y + 100, view, 260)) continue;
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.12 + i / 6 + s.x * 0.001) % 1;
        g.fillStyle(0x2a2624, 0.28 * (1 - ph)); g.fillCircle(s.x + ph * 50 + Math.sin(t + i) * 8, s.y - ph * 160, 16 + ph * 34);
      }
      g.fillStyle(HEAT_ORANGE, 0.12 + Math.sin(t * 4 + s.x) * 0.05); g.fillCircle(s.x, s.y + 2, 16);
    }
    // Sparks off the smithy chimneys, a few at a time.
    for (const c of chimneys) {
      if (!inView(c.x, c.y, view)) continue;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.6 + c.s + i / 3) % 1;
        g.fillStyle(i % 2 ? HEAT_YELLOW : HEAT_ORANGE, 1 - ph);
        g.fillCircle(c.x + Math.sin(ph * 6 + i) * 10, c.y - ph * 60, 1.5);
      }
    }
  },
};

export const FORGE_AREA: AreaDef = {
  id: 'forge',
  isle: 'earth',
  court: 'forge',
  name: 'The Forge Court',
  subtitle: 'Every household\'s iron hung on the Hook',
  w: FORGE_W,
  h: FORGE_H,
  bg: CINDER_DARK,
  accent: FORGE_COLOR,
  weather: 'sparks',
  gloom: 0.12,
  spawn: { x: 90, y: ROW_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'stonehold', label: 'Hammer Row west to the Stonehold Court' },
    { side: 's', to: 'geode', label: 'Down the Ore Road to the Geode Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 160, y: 920 } },
    { kind: 'prince', id: 'anvil', at: { x: HALL.x, y: HALL.y + 54 } },
    { kind: 'water', id: 'forge-quench', shape: QUENCH_POND, fishery: 'forge-quench' },
    { kind: 'encounter', id: 'forge-ore-carts' },
    { kind: 'encounter', id: 'forge-crucible' },
    { kind: 'encounter', id: 'forge-quench-fight' },
    { kind: 'encounter', id: 'forge-scrap-magnet' },
    { kind: 'encounter', id: 'forge-strike-while-hot' },
    {
      kind: 'sign', at: { x: 1380, y: 860 },
      text: 'THE TITHE HOOK. A household\'s Tithe is hung here in iron, by weight. The Hook does not argue. Short is interred.',
    },
    {
      kind: 'sign', at: { x: 300, y: 860 },
      text: 'HAMMER ROW. Strike to the Great Hammer\'s time. Hammer-songs are buried, by order. A smith who sings is short.',
    },
    {
      kind: 'sign', at: { x: 1540, y: 700 },
      text: 'THE RUNNEL. Slag from the Anvil Hall. Do not lean on the chains. The chains do not care either.',
    },
    {
      kind: 'sign', at: { x: 1290, y: 1540 },
      text: 'THE ORE ROAD. South to the Geode Court. Tithe carts have the rail. Everything else has the ditch.',
    },
    {
      kind: 'sign', at: { x: 980, y: 1090 },
      text: 'THE BELL PIT. Bells for the Regent, cast to order. The names on the lip are not to be read aloud.',
    },
    { kind: 'chest', id: 'forge-chest-tipple', at: { x: 600, y: 1530 }, coins: 110 },
    { kind: 'chest', id: 'forge-chest-hall', at: { x: 2260, y: 600 }, orbs: 2, open: { prince: 'anvil' } },
  ],
  npcs: FORGE_NPCS,
  crowd: FORGE_CROWD,
};
