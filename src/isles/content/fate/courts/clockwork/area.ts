import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../art/IsleArt';
import {
  astroHands, astroTower, baizeLawn, bench, checkerRoad, clockWaystone, cuckooBird, cuckooHouse, cuckooHouseDoor,
  cutting, cuttingWheels, dial, footbridge, gantryBob, gear, gearTower, gearTowerSpin, greenLamp, hourCart,
  hourglassWell, hourOffice, hourOfficeClock, hoursBoard, hourSquare, oilSheen, oilSump, paidMural, partsCrates,
  pendulumGantry, pipeRun, pumpBeam, pumpHouse, queueRail, regulator, regulatorPendulum, watchShop, wellSand,
} from './art';
import {
  BAIZE_DARK, BRASS, BRASS_DARK, CLOCKWORK_COLOR, CUCKOO_RED, GILT, IRON, IRON_DARK, IRON_LIT, LAMP_GLOW, SAND,
  SAND_LIT, STONE_DARK,
} from './palette';
import { CLOCKWORK_CROWD, CLOCKWORK_NPCS } from './npcs';

/**
 * The Clockwork Court — the clockmakers' town on Lotterhaven's oldest hill, where the drawn pay
 * the Draw in hours.
 *
 * Read it from the Card Court road (east) in:
 * • **the east road**: black-and-red setts under green lamps, past the waystone; on its north
 *   side the **Hour Office** with its numbered windows and the queue roped up in front of it, a
 *   cart of grey hour-vials, the board of who owes what;
 * • **the Hour Square** where the roads meet: rings of setts with bronze hour-studs, and on its
 *   east side the great **astronomical clock**, whose gilt wheel spins like the House's;
 * • **the Regulator** (north): Prince Tock's walnut-and-glass hall, a longcase clock the size of a
 *   church in the middle of it, its pendulum swinging in the window;
 * • **the Works** (north-west): iron yards and gear-towers, cut off from the town by the
 *   **Escapement Cut** — a slot down to the great wheels — which you cross by two footbridges
 *   under swinging pendulum gantries;
 * • **the hourglass wells** (south-west), giant glasses sunk in stone where paid hours pour away,
 *   and below them the black **oil sump** and its nodding pump-house;
 * • **Cuckoo Row** (south-east), the chalets whose gable clocks the families must keep to time,
 *   and the south road down to the Treasury Court.
 */

export const CLOCKWORK_W = 2400;
export const CLOCKWORK_H = 1600;

/** The Hour Square. */
export const SQUARE: Pt = { x: 1200, y: 760 };
const SQ_R = 230;
/** The astronomical clock: the middle of its base. */
export const ASTRO: Pt = { x: 1470, y: 700 };
/** Prince Tock's Regulator: the middle of its front step. */
export const REGULATOR: Pt = { x: 1200, y: 340 };
const REG_W = 560;
/** The Hour Office, its queue rail and the cart of paid hours. */
export const HOUR_OFFICE: Pt = { x: 1950, y: 520 };
const OFFICE_W = 420, OFFICE_H = 170;
export const HOUR_CART: Pt = { x: 2240, y: 620 };
/** The Escapement Cut and its two footbridges. */
export const CUT: Rect = { x: 40, y: 560, w: 920, h: 80 };
export const BRIDGES = [300, 720];
const BRIDGE_W = 70;
/** The hourglass wells. */
export const WELLS: Pt[] = [{ x: 360, y: 990 }, { x: 680, y: 990 }, { x: 520, y: 1100 }];
/** The oil sump — the court's fishing water. */
export const SUMP: Rect = { x: 140, y: 1290, w: 420, h: 190 };
export const PUMP: Pt = { x: 790, y: 1350 };
/** Cuckoo Row: the house fronts and the lane before them. */
export const COTTAGES = [1380, 1580, 1780, 1980, 2180];
const ROW_Y = 1350;
const COTTAGE_W = 150, COTTAGE_H = 120;
/** Mendel Plumb's watch shop. */
export const SHOP: Pt = { x: 1700, y: 980 };
/** The gear-towers of the Works. */
const TOWERS: [number, number, number][] = [[170, 400, 300], [400, 330, 250], [830, 380, 280]];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

// ── Layout ───────────────────────────────────────────────────────────

// The Regulator, north, on the end of the north road.
addPiece(REGULATOR.x, REGULATOR.y, REG_W + 60, 520, (g, rng) => regulator(g, REGULATOR.x, REGULATOR.y, REG_W, rng),
  { kind: 'rect', x: REGULATOR.x - REG_W / 2, y: REGULATOR.y - 40, w: REG_W, h: 40 });

// The astronomical clock over the square.
addPiece(ASTRO.x, ASTRO.y, 220, 520, (g, rng) => astroTower(g, ASTRO.x, ASTRO.y, rng),
  { kind: 'rect', x: ASTRO.x - 84, y: ASTRO.y - 30, w: 168, h: 30 });

// The Hour Office, its rail, board, mural and cart.
addPiece(HOUR_OFFICE.x, HOUR_OFFICE.y, OFFICE_W + 40, 360, (g, rng) => hourOffice(g, HOUR_OFFICE.x, HOUR_OFFICE.y, OFFICE_W, OFFICE_H, rng),
  { kind: 'rect', x: HOUR_OFFICE.x - OFFICE_W / 2, y: HOUR_OFFICE.y - 40, w: OFFICE_W, h: 40 });
addPiece(1950, 612, 360, 50, (g) => queueRail(g, 1780, 2120, 612), { kind: 'rect', x: 1780, y: 606, w: 340, h: 8 });
addPiece(1690, 640, 110, 120, (g, rng) => hoursBoard(g, 1690, 640, rng), { kind: 'rect', x: 1646, y: 628, w: 92, h: 12 });
addPiece(2230, 450, 150, 80, (g) => paidMural(g, 2230, 450, 120));
addPiece(HOUR_CART.x, HOUR_CART.y, 140, 70, (g) => hourCart(g, HOUR_CART.x, HOUR_CART.y), { kind: 'rect', x: HOUR_CART.x - 44, y: HOUR_CART.y - 22, w: 88, h: 22 });

// Green lamps down the east road and round the square.
for (const [x, y] of [[1640, 742], [1900, 742], [2160, 742], [1640, 862], [2020, 862], [1000, 610], [1400, 920], [1000, 920]] as [number, number][]) {
  addPiece(x, y, 40, 90, (g) => greenLamp(g, x, y), { kind: 'circle', x, y: y - 3, r: 6 });
}

// The watch shop.
addPiece(SHOP.x, SHOP.y, 280, 220, (g, rng) => watchShop(g, SHOP.x, SHOP.y, 200, 120, rng), { kind: 'rect', x: SHOP.x - 100, y: SHOP.y - 30, w: 200, h: 30 });
addPiece(1560, 1000, 80, 70, (g, rng) => partsCrates(g, 1560, 1000, rng), { kind: 'rect', x: 1532, y: 984, w: 56, h: 16 });

// The waystone by the Card Court road.
addPiece(2250, 890, 50, 90, (g) => clockWaystone(g, 2250, 890), { kind: 'circle', x: 2250, y: 884, r: 15 });

// The Works: gear-towers, crates, a bench.
for (const [x, y, h] of TOWERS) addPiece(x, y, 140, h + 90, (g, rng) => gearTower(g, x, y, h, rng), { kind: 'rect', x: x - 46, y: y - 14, w: 92, h: 14 });
addPiece(650, 280, 80, 70, (g, rng) => partsCrates(g, 650, 280, rng), { kind: 'rect', x: 622, y: 264, w: 56, h: 16 });
addPiece(260, 510, 80, 70, (g, rng) => partsCrates(g, 260, 510, rng), { kind: 'rect', x: 232, y: 494, w: 56, h: 16 });

// The Escapement Cut: solid but for its two footbridges, a pendulum gantry over each.
{
  let x0 = CUT.x;
  for (const bx of BRIDGES) {
    solids.push({ kind: 'rect', x: x0, y: CUT.y - 12, w: bx - BRIDGE_W / 2 - x0, h: CUT.h + 22 });
    x0 = bx + BRIDGE_W / 2;
  }
  solids.push({ kind: 'rect', x: x0, y: CUT.y - 12, w: CUT.x + CUT.w - x0, h: CUT.h + 22 });
}
for (const bx of BRIDGES) {
  addPiece(bx, CUT.y + CUT.h + 12, 220, 260, (g) => pendulumGantry(g, bx, CUT.y + CUT.h + 12, 150));
  solids.push({ kind: 'circle', x: bx - 75, y: CUT.y + CUT.h + 8, r: 12 }, { kind: 'circle', x: bx + 75, y: CUT.y + CUT.h + 8, r: 12 });
}
addPiece(840, 852, 70, 40, (g) => bench(g, 840, 852));

// The hourglass wells.
for (const w of WELLS) addPiece(w.x, w.y, 150, 220, (g) => hourglassWell(g, w.x, w.y, 1), { kind: 'circle', x: w.x, y: w.y - 10, r: 52 });

// The sump, its pump-house and the pipe in between.
solids.push({ kind: 'rect', x: SUMP.x - 16, y: SUMP.y - 16, w: SUMP.w + 32, h: SUMP.h + 32 });
addPiece(PUMP.x, PUMP.y, 160, 160, (g) => pumpHouse(g, PUMP.x, PUMP.y), { kind: 'rect', x: PUMP.x - 60, y: PUMP.y - 40, w: 120, h: 40 });

// Cuckoo Row.
const PAINTS = [0x4a8a86, 0xc8a04a, 0xc87a7a, 0x7a9a5a, 0xe0d0a8];
COTTAGES.forEach((x, i) => {
  addPiece(x, ROW_Y, COTTAGE_W + 60, COTTAGE_H * 1.8 + 60, (g, rng) => cuckooHouse(g, x, ROW_Y, COTTAGE_W, COTTAGE_H, PAINTS[i], rng),
    { kind: 'rect', x: x - COTTAGE_W / 2 - 4, y: ROW_Y - 30, w: COTTAGE_W + 8, h: 30 });
});
for (const x of [1480, 1880, 2280]) addPiece(x, 1520, 70, 40, (g) => bench(g, x, 1520));
for (const x of [1680, 2080]) addPiece(x, 1500, 40, 90, (g) => greenLamp(g, x, 1500), { kind: 'circle', x, y: 1497, r: 6 });

// ── The railing round the court (open at the two roads) ──────────────

const E_GAP: [number, number] = [680, 920];
const S_GAP: [number, number] = [1080, 1320];
solids.push({ kind: 'rect', x: 0, y: 0, w: CLOCKWORK_W, h: 40 });
solids.push({ kind: 'rect', x: 0, y: 0, w: 30, h: CLOCKWORK_H });
solids.push({ kind: 'rect', x: CLOCKWORK_W - 30, y: 0, w: 30, h: E_GAP[0] });
solids.push({ kind: 'rect', x: CLOCKWORK_W - 30, y: E_GAP[1], w: 30, h: CLOCKWORK_H - E_GAP[1] });
solids.push({ kind: 'rect', x: 0, y: CLOCKWORK_H - 30, w: S_GAP[0], h: 30 });
solids.push({ kind: 'rect', x: S_GAP[1], y: CLOCKWORK_H - 30, w: CLOCKWORK_W - S_GAP[1], h: 30 });
// The south railing draws over anyone walking along it.
for (const [x0, x1] of [[0, S_GAP[0]], [S_GAP[1], CLOCKWORK_W]] as [number, number][]) {
  addPiece((x0 + x1) / 2, CLOCKWORK_H, x1 - x0, 50, (g) => railing(g, x0, x1, CLOCKWORK_H - 6));
}

/** An iron railing with gilt finials and a little clock-wheel every so often. */
function railing(g: G, x0: number, x1: number, y: number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - 4, x1 - x0, 10);
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x0, y - 30, x1, y - 30); g.lineBetween(x0, y - 10, x1, y - 10);
  for (let x = x0 + 6; x < x1; x += 12) {
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 4, x, y - 36);
    g.fillStyle(GILT, 1); g.fillTriangle(x - 2.5, y - 36, x + 2.5, y - 36, x, y - 42);
  }
  for (let x = x0 + 60; x < x1 - 30; x += 240) gear(g, x, y - 20, 9, 8, x * 0.01, BRASS, 1, 3);
}

// ── Painter ──────────────────────────────────────────────────────────

const inView = (x: number, y: number, v: Rect, m = 200): boolean =>
  x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

const painter: AreaPainter = {
  ground(g, rng) {
    const W = CLOCKWORK_W, H = CLOCKWORK_H;
    // Baize everywhere, felt nap and table lines, in big cloths.
    g.fillStyle(BAIZE_DARK, 1); g.fillRect(0, 0, W, H);
    for (const r of [
      { x: 30, y: 40, w: 1000, h: 520 }, { x: 1300, y: 420, w: 1070, h: 60 }, { x: 1260, y: 880, w: 1110, h: 300 },
      { x: 30, y: 820, w: 1120, h: 750 }, { x: 1250, y: 1450, w: 1120, h: 120 }, { x: 1500, y: 40, w: 870, h: 380 },
      { x: 30, y: 650, w: 940, h: 60 },
    ]) baizeLawn(g, r, rng);

    // The Works yard: riveted iron plates, oil-stained.
    g.fillStyle(IRON_DARK, 1); g.fillRect(60, 120, 900, 420);
    for (let y = 120; y < 540; y += 60) {
      for (let x = 60; x < 960; x += 90) {
        g.fillStyle((x / 90 + y / 60) % 2 ? IRON : dim(IRON, 0.12), 1); g.fillRect(x + 1, y + 1, 88, 58);
        g.fillStyle(IRON_LIT, 0.8);
        for (const [cx, cy] of [[4, 4], [84, 4], [4, 54], [84, 54]]) g.fillCircle(x + cx + 1, y + cy + 1, 1.4);
      }
    }
    for (let i = 0; i < 14; i++) { g.fillStyle(0x0c0a08, 0.3); g.fillEllipse(100 + rng() * 820, 150 + rng() * 360, 30 + rng() * 50, 10 + rng() * 14); }
    // Tracks for the parts trolleys across the yard.
    for (const ty of [210, 440]) { g.lineStyle(3, IRON_LIT, 0.6); g.lineBetween(60, ty, 960, ty); g.lineBetween(60, ty + 14, 960, ty + 14); }

    // The roads, black and red.
    checkerRoad(g, { x: 1400, y: 752, w: 1000, h: 96 });
    checkerRoad(g, { x: 1152, y: 360, w: 96, h: 260 });
    checkerRoad(g, { x: 1152, y: 940, w: 96, h: 660 });
    checkerRoad(g, { x: 260, y: 712, w: 720, h: 96 });
    checkerRoad(g, { x: 480, y: 808, w: 80, h: 470 });
    checkerRoad(g, { x: 560, y: 1170, w: 592, h: 64 });
    checkerRoad(g, { x: 1248, y: 1360, w: 1080, h: 80 });
    checkerRoad(g, { x: 1740, y: 520, w: 420, h: 84 });
    checkerRoad(g, { x: 2130, y: 604, w: 56, h: 148 });
    checkerRoad(g, { x: 1640, y: 848, w: 64, h: 110 });
    // Bridge approaches up through the Works.
    for (const bx of BRIDGES) checkerRoad(g, { x: bx - 32, y: 440, w: 64, h: 120 });
    checkerRoad(g, { x: 260, y: 440, w: 520, h: 50 });
    // The Regulator's forecourt.
    checkerRoad(g, { x: 900, y: 340, w: 600, h: 40 });
    // The square.
    hourSquare(g, SQUARE.x, SQUARE.y, SQ_R);

    // The Escapement Cut, and its footbridges over the dark.
    cutting(g, CUT, rng);
    for (const bx of BRIDGES) footbridge(g, bx, CUT.y - 14, CUT.y + CUT.h + 12, BRIDGE_W - 10);

    // Round the hourglass wells: a plaza of pale setts spilled with sand.
    g.fillStyle(STONE_DARK, 1); g.fillEllipse(520, 1040, 560, 260);
    g.fillStyle(0xd8ccb0, 1); g.fillEllipse(520, 1036, 540, 244);
    for (let i = 0; i < 400; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
      g.fillStyle(rng() < 0.6 ? SAND : SAND_LIT, 0.5); g.fillCircle(520 + Math.cos(a) * d * 260, 1036 + Math.sin(a) * d * 115, 1.2);
    }
    // The sump and the pipe from the pump-house.
    oilSump(g, SUMP, rng);
    pipeRun(g, [{ x: PUMP.x - 60, y: PUMP.y - 14 }, { x: SUMP.x + SUMP.w + 40, y: PUMP.y - 14 }, { x: SUMP.x + SUMP.w + 40, y: SUMP.y + 40 }, { x: SUMP.x + SUMP.w + 10, y: SUMP.y + 40 }]);
    pipeRun(g, [{ x: SUMP.x + 60, y: SUMP.y - 30 }, { x: SUMP.x + 60, y: 1240 }, { x: 480, y: 1240 }], 8);

    // A worn track in the setts in front of the Hour Office, where the queue stands every day.
    g.fillStyle(0x000000, 0.12); g.fillRect(1780, 560, 340, 36);
  },

  pieces,

  animate(g, t, view) {
    if (inView(CUT.x + CUT.w / 2, CUT.y, view, 600)) {
      cuttingWheels(g, CUT, t * 0.4);
      // Bridges redrawn over the wheels.
      for (const bx of BRIDGES) footbridge(g, bx, CUT.y - 14, CUT.y + CUT.h + 12, BRIDGE_W - 10);
    }
    if (inView(SUMP.x + SUMP.w / 2, SUMP.y + SUMP.h / 2, view, 300)) oilSheen(g, SUMP, t);
    // The square's meridian catching the hour: a bright bead running down it once a minute.
    if (inView(SQUARE.x, SQUARE.y, view, 300)) {
      const ph = (t / 60) % 1;
      const y = SQUARE.y - SQ_R * 0.8 + ph * SQ_R * 1.6;
      glow(g, SQUARE.x, y, 14, GILT, 0.06, 3);
    }
  },

  animateOver(g, t, view) {
    if (inView(REGULATOR.x, REGULATOR.y - 200, view, 300)) {
      regulatorPendulum(g, REGULATOR.x, REGULATOR.y, t);
      // The Prince's dial: the only clock in the court that is always right.
      dial(g, REGULATOR.x, REGULATOR.y - 380 + 66, 48, (t / 43200) * Math.PI * 2 + 2.1, (t / 3600) * Math.PI * 2 + 0.6);
    }
    if (inView(ASTRO.x, ASTRO.y - 250, view, 300)) astroHands(g, ASTRO.x, ASTRO.y, t);
    if (inView(HOUR_OFFICE.x, HOUR_OFFICE.y - 200, view, 300)) {
      // The Hour Office clock runs fast — a minute a second.
      const c = hourOfficeClock(HOUR_OFFICE.x, HOUR_OFFICE.y, OFFICE_H);
      dial(g, c.x, c.y, 18, t * 0.08, t);
    }
    for (const [x, y, h] of TOWERS) if (inView(x, y - h / 2, view, 300)) gearTowerSpin(g, x, y, h, t, x * 0.01);
    BRIDGES.forEach((bx, i) => { if (inView(bx, CUT.y, view, 300)) gantryBob(g, bx, CUT.y + CUT.h + 12, t, i ? 3.1 : 2.6, i * 1.3); });
    for (const w of WELLS) if (inView(w.x, w.y, view)) wellSand(g, w.x, w.y, 1, t + w.x);
    if (inView(PUMP.x, PUMP.y, view)) pumpBeam(g, PUMP.x, PUMP.y, t);
    // Cuckoo Row: each house's bird comes out on its own hour (staggered every few seconds).
    COTTAGES.forEach((x, i) => {
      if (!inView(x, ROW_Y - 200, view)) return;
      const d = cuckooHouseDoor(x, ROW_Y, COTTAGE_W, COTTAGE_H);
      const cyc = (t + i * 3.7) % 14;
      const k = cyc < 2.2 ? Math.sin((cyc / 2.2) * Math.PI) : 0;
      if (k > 0) {
        g.fillStyle(0x140c08, 1); g.fillRect(d.x - 7 * d.s, d.y - 7 * d.s, 14 * d.s, 14 * d.s);
        cuckooBird(g, d.x, d.y + 2 - k * 4, d.s * 0.9, Math.PI / 2, t * 20, 1);
        for (const sx of [-1, 1]) { g.fillStyle(CUCKOO_RED, 1); g.fillRect(d.x + sx * 7 * d.s + (sx < 0 ? -6 * d.s : 0), d.y - 7 * d.s, 6 * d.s * (0.3 + 0.7 * (1 - k)), 14 * d.s); }
      }
      // A pendulum under each gable, ticking.
      const pa = Math.sin(t * 3 + i) * 0.3;
      g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(d.x, d.y + 46 * d.s, d.x + Math.sin(pa) * 22 * d.s, d.y + 46 * d.s + Math.cos(pa) * 22 * d.s);
      g.fillStyle(BRASS, 1); g.fillCircle(d.x + Math.sin(pa) * 22 * d.s, d.y + 46 * d.s + Math.cos(pa) * 22 * d.s, 3 * d.s);
    });
    // Sand blowing off the wells in the light.
    if (inView(520, 1000, view, 300)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.15 + i / 10) % 1;
        g.fillStyle(lit(SAND, 0.4), 0.5 * Math.sin(ph * Math.PI)); g.fillCircle(320 + ((i * 97) % 420) + ph * 40, 880 - ph * 50 + ((i * 31) % 60), 1.3);
      }
    }
    // The green lamps' pools of light at dusk.
    if (inView(1900, 760, view, 600)) for (const x of [1654, 1914, 2174]) glow(g, x, 690, 20, LAMP_GLOW, 0.025 + Math.sin(t * 1.3 + x) * 0.008, 2);
  },
};

export const CLOCKWORK_AREA: AreaDef = {
  id: 'clockwork',
  isle: 'fate',
  court: 'clockwork',
  name: 'The Clockwork Court',
  subtitle: 'Where the drawn pay their hours',
  w: CLOCKWORK_W,
  h: CLOCKWORK_H,
  bg: 0x141a14,
  accent: CLOCKWORK_COLOR,
  weather: 'sandfall',
  spawn: { x: 2300, y: 800 },
  painter,
  solids,
  exits: [
    { side: 'e', to: 'card', label: 'The lamp road east to the Card Court' },
    { side: 's', to: 'treasury', label: 'Down the south road to the Treasury Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2250, y: 920 } },
    { kind: 'prince', id: 'tock', at: { x: REGULATOR.x, y: REGULATOR.y + 46 } },
    { kind: 'water', id: 'clockwork-sump', shape: SUMP, fishery: 'clockwork-sump' },
    { kind: 'encounter', id: 'clockwork-pendulum' },
    { kind: 'encounter', id: 'clockwork-cogwork' },
    { kind: 'encounter', id: 'clockwork-cuckoo' },
    { kind: 'encounter', id: 'clockwork-hourglass' },
    { kind: 'encounter', id: 'clockwork-rewind' },
    {
      kind: 'sign', at: { x: 2120, y: 700 },
      text: 'THE HOUR OFFICE. Drawn Lots attend with their hours due. An hour not paid by the bell is doubled.',
    },
    {
      kind: 'sign', at: { x: 1060, y: 980 },
      text: 'THE HOUR SQUARE. Set your watch by the great clock. A watch that disagrees with it is wrong.',
    },
    {
      kind: 'sign', at: { x: 400, y: 700 },
      text: 'THE ESCAPEMENT CUT. Cross by the bridges only. Mind the pendulums: they keep the hill\'s time.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 1460 },
      text: 'CUCKOO ROW. Every gable clock to keep the Regulator\'s time. A slow house is fined an hour a minute.',
    },
    { kind: 'chest', id: 'clockwork-chest-works', at: { x: 110, y: 170 }, coins: 150 },
    { kind: 'chest', id: 'clockwork-chest-regulator', at: { x: 1560, y: 380 }, orbs: 2, open: { prince: 'tock' } },
  ],
  npcs: CLOCKWORK_NPCS,
  crowd: CLOCKWORK_CROWD,
};

