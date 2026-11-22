import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { glow, mixC, motes, mulberry, type G } from '../../../../art/IsleArt';
import {
  crystalCluster, crystalLamp, crystalPath, crystalPool, cuttingHouse, druseBed, gemStall, geodeBands, geodeCart,
  geodeHouse, geodeStone, greatPrism, grindingWheel, gritFloor, hexFlags, lapidaryShop, lightShaft,
  loupeTable, piezoPlate, poolShimmer, quartzSpire, spectrumBand, tuningCrystal, wallLift,
} from './art';
import {
  AMETHYST, AMETHYST_DEEP, AMETHYST_LIT, CITRINE, DUST, GEODE_COLOR, GRIT_DARK, QUARTZ, QUARTZ_LIT, RIND_DARK, ROSE,
  SPECTRUM, SUNSHAFT,
} from './palette';
import { GEODE_CROWD, GEODE_NPCS } from './npcs';

/**
 * The Geode Court — a town inside a split geode, east of Quarrymouth and south of the Forge.
 *
 * Read it from the Quarrymouth cleft (west) in:
 * • **the Cleft** (west): the road from the harbour comes in through the crack the quarry opened,
 *   past the waystone and the **Loupe Table**, where every stone of the Tithe is graded;
 * • **the Druse Gardens** (north-west): stone-kerbed beds where amethyst is grown from seed;
 * • **Lapidaries' Row and the breaking-yard** (south-west): workshops with their lap wheels,
 *   Opaline Grist's among them, and the yard where the quarry's geodes are cracked open;
 * • **Prism Square** (the middle): the great prism on its drum, under the light from the crack,
 *   throwing colour across the floor; gem stalls round it; the north road climbs to the crack
 *   itself and on to the Forge;
 * • **the crystal pool** (south): still water clear to the amethyst bed;
 * • **the Chime Garden** (south-east): the tuning rods, where the old chimers hid the songs;
 * • **the spires** (east): a forest of quartz points, the piezo floor among them;
 * • **the Cutting-House** (north-east): Prince Facet's keep, with the Grinding Wheel beside it.
 *
 * The geode's own wall rises on every side: rind, agate bands, then amethyst points leaning in.
 */

export const GEODE_W = 2400;
export const GEODE_H = 1600;

const AVENUE_Y = 800;
const NORTH_X = 1200;

/** The great prism of the square. */
export const PRISM: Pt = { x: 1200, y: 770 };
/** The crystal pool — the court's fishing water. */
export const POOL_RECT: Rect = { x: 1000, y: 1230, w: 420, h: 170 };
/** The Cutting-House: the middle of its front step. */
export const CUTTING_HOUSE: Pt = { x: 1800, y: 470 };
/** The Grinding Wheel beside it (where to stand, in front). */
const WHEEL: Pt = { x: 1420, y: 450 };
export const GRINDING_WHEEL: Pt = { x: WHEEL.x, y: WHEEL.y + 60 };
/** The ledge under the crack in the roof, at the top of the north road. */
export const CRACK_LEDGE: Pt = { x: NORTH_X, y: 210 };
/** Celestine's rod, alone at the far end of the Chime Garden (where to stand, in front). */
const CELESTINE_ROD: Pt = { x: 2190, y: 1340 };
export const OLD_ROD: Pt = { x: CELESTINE_ROD.x, y: CELESTINE_ROD.y + 34 };
/** The Loupe Table at the Cleft. */
const LOUPE: Pt = { x: 420, y: 660 };
/** Lapidaries' Row: workshop front-line centres. */
const SHOPS: [number, number][] = [[330, 220], [590, 220], [850, 220]];
const SHOP_Y = 1170;
/** The bench-glasses, one at each workshop's bench (for A Scratched Loupe). */
export const LAPIDARY_BENCHES: Pt[] = SHOPS.map(([x]) => ({ x: x + 62, y: SHOP_Y + 32 }));
/** The tuning rods of the Chime Garden. */
const RODS: Pt[] = [{ x: 1700, y: 1180 }, { x: 1880, y: 1150 }, { x: 2060, y: 1190 }, { x: 1760, y: 1400 }, { x: 1990, y: 1400 }];
/** Decorative piezo plates on the floor round Tourmaline. */
const PLATES: Pt[] = [{ x: 1960, y: 880 }, { x: 2110, y: 860 }, { x: 2040, y: 960 }];

type Piece = NonNullable<AreaPainter['pieces']>[number];

const pieces: Piece[] = [];
const solids: Solid[] = [];
/** Wall clusters whose points catch the light in `animate`. */
const sparkles: Pt[] = [];

function addPiece(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, solid?: Solid): void {
  pieces.push({ x, y, w, h, draw });
  if (solid) solids.push(solid);
}

const inView = (x: number, y: number, v: Rect, pad = 160) => x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── The geode wall ───────────────────────────────────────────────────

solids.push(
  { kind: 'rect', x: 0, y: 0, w: NORTH_X - 100, h: 130 },
  { kind: 'rect', x: NORTH_X + 100, y: 0, w: GEODE_W - NORTH_X - 100, h: 130 },
  { kind: 'rect', x: 0, y: 1500, w: GEODE_W, h: 100 },
  { kind: 'rect', x: 0, y: 0, w: 110, h: AVENUE_Y - 100 },
  { kind: 'rect', x: 0, y: AVENUE_Y + 100, w: 110, h: GEODE_H - AVENUE_Y - 100 },
  { kind: 'rect', x: 2290, y: 0, w: 110, h: GEODE_H },
);
// Amethyst clusters along the foot of the walls — the points that lean in over the town.
{
  const r = mulberry(0x6e0de);
  for (let x = 170; x < GEODE_W - 150; x += 120 + r() * 60) {
    if (Math.abs(x - NORTH_X) < 190) continue;
    const s = 1 + r() * 0.5;
    addPiece(x, 150, 120 * s, 120 * s, (g, rng) => crystalCluster(g, x, 150, s, rng), { kind: 'circle', x, y: 140, r: 24 * s });
    sparkles.push({ x, y: 110 });
  }
  for (let x = 200; x < GEODE_W - 150; x += 150 + r() * 80) {
    const s = 0.9 + r() * 0.5;
    addPiece(x, 1508, 120 * s, 110 * s, (g, rng) => crystalCluster(g, x, 1508, s, rng, r() < 0.3 ? mixC(AMETHYST, QUARTZ, 0.4) : AMETHYST));
    sparkles.push({ x, y: 1470 });
  }
  for (let y = 220; y < GEODE_H - 160; y += 140 + r() * 60) {
    if (Math.abs(y - AVENUE_Y) < 170) continue;
    const s = 0.9 + r() * 0.4;
    addPiece(128, y, 100, 100, (g, rng) => crystalCluster(g, 128, y, s, rng), { kind: 'circle', x: 128, y: y - 6, r: 20 });
    addPiece(2272, y + 40, 100, 100, (g, rng) => crystalCluster(g, 2272, y + 40, s, rng), { kind: 'circle', x: 2272, y: y + 34, r: 20 });
    sparkles.push({ x: 128, y: y - 40 }, { x: 2272, y });
  }
}

// ── The Cleft and the Loupe Table ────────────────────────────────────

addPiece(LOUPE.x, LOUPE.y, 260, 180, (g) => loupeTable(g, LOUPE.x, LOUPE.y), { kind: 'rect', x: LOUPE.x - 106, y: LOUPE.y - 40, w: 212, h: 40 });

// ── Houses ───────────────────────────────────────────────────────────

const HOUSES: [number, number, number, number, number][] = [
  [300, 1000, 120, 70, 0], [520, 1000, 130, 74, CITRINE], [820, 690, 120, 70, 0],
  [1560, 1020, 130, 74, CITRINE], [1760, 1010, 116, 66, 0], [760, 1000, 110, 64, 0],
];
for (const [x, y, w, h, glowC] of HOUSES) {
  addPiece(x, y, w + 40, h * 1.8 + 30, (g, rng) => geodeHouse(g, x, y, w, h, rng, { glow: glowC, sign: x === 1560 }), { kind: 'rect', x: x - w / 2 - 4, y: y - 36, w: w + 8, h: 36 });
}

// ── Lapidaries' Row and the breaking-yard ────────────────────────────

SHOPS.forEach(([x, w], i) => {
  addPiece(x, SHOP_Y, w + 20, 140, (g, rng) => lapidaryShop(g, x, SHOP_Y, w, rng, [AMETHYST, CITRINE, ROSE][i]), { kind: 'rect', x: x - w / 2, y: SHOP_Y - 46, w, h: 46 });
});
addPiece(250, 1340, 140, 70, (g, rng) => geodeCart(g, 250, 1340, rng), { kind: 'rect', x: 204, y: 1306, w: 92, h: 34 });
addPiece(660, 1420, 120, 110, (g, rng) => crystalCluster(g, 660, 1420, 0.9, rng, CITRINE), { kind: 'circle', x: 660, y: 1414, r: 22 });

// ── Prism Square ─────────────────────────────────────────────────────

addPiece(PRISM.x, PRISM.y, 140, 190, (g, rng) => greatPrism(g, PRISM.x, PRISM.y, rng), { kind: 'circle', x: PRISM.x, y: PRISM.y - 20, r: 52 });
addPiece(1010, 990, 110, 90, (g, rng) => gemStall(g, 1010, 990, 0x5a2a7a, rng), { kind: 'rect', x: 964, y: 958, w: 92, h: 32 });
addPiece(1420, 1000, 110, 90, (g, rng) => gemStall(g, 1420, 1000, 0x2a4a7a, rng), { kind: 'rect', x: 1374, y: 968, w: 92, h: 32 });
for (const [x, y] of [[700, 760], [1000, 840], [1420, 840], [1700, 760], [2000, 760], [380, 840]] as [number, number][]) {
  addPiece(x, y, 40, 80, (g) => crystalLamp(g, x, y, false), { kind: 'circle', x, y: y - 3, r: 6 });
}

// ── The Druse Gardens are in the ground; a seed cart and a cluster stand at their foot. ──

addPiece(860, 470, 120, 110, (g, rng) => crystalCluster(g, 860, 470, 1.1, rng), { kind: 'circle', x: 860, y: 464, r: 26 });

// ── The Cutting-House and the Grinding Wheel ─────────────────────────

addPiece(CUTTING_HOUSE.x, CUTTING_HOUSE.y, 640, 460, (g, rng) => cuttingHouse(g, CUTTING_HOUSE.x, CUTTING_HOUSE.y, 560, 170, rng),
  { kind: 'rect', x: CUTTING_HOUSE.x - 300, y: CUTTING_HOUSE.y - 50, w: 600, h: 50 });
addPiece(WHEEL.x, WHEEL.y, 170, 170, (g, rng) => grindingWheel(g, WHEEL.x, WHEEL.y, rng), { kind: 'rect', x: WHEEL.x - 70, y: WHEEL.y - 28, w: 140, h: 28 });
addPiece(2245, 400, 60, 320, (g) => wallLift(g, 2245, 400, 300), { kind: 'rect', x: 2222, y: 378, w: 46, h: 22 });

// ── The spires ───────────────────────────────────────────────────────

for (const [x, y, h] of [[1960, 620, 150], [2120, 570, 190], [2200, 690, 130], [2100, 1030, 170], [2220, 980, 140], [1920, 1070, 120], [1860, 640, 100]] as [number, number, number][]) {
  addPiece(x, y, h * 0.6, h + 30, (g, rng) => quartzSpire(g, x, y, h, rng, h > 130), { kind: 'circle', x, y: y - 6, r: h * 0.11 });
  sparkles.push({ x, y: y - h * 0.8 });
}

// ── The Chime Garden ─────────────────────────────────────────────────

for (const r of RODS) addPiece(r.x, r.y, 50, 110, (g) => tuningCrystal(g, r.x, r.y, 1.2, 0), { kind: 'circle', x: r.x, y: r.y - 4, r: 14 });
addPiece(CELESTINE_ROD.x, CELESTINE_ROD.y, 50, 110, (g) => tuningCrystal(g, CELESTINE_ROD.x, CELESTINE_ROD.y, 1.25, 0, 0xc8f0ff),
  { kind: 'circle', x: CELESTINE_ROD.x, y: CELESTINE_ROD.y - 4, r: 14 });

// The crystal pool is water: you fish it from the lip, you don't wade it.
solids.push({ kind: 'rect', x: POOL_RECT.x + 14, y: POOL_RECT.y + 12, w: POOL_RECT.w - 28, h: POOL_RECT.h - 24 });

// ── Painter ──────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground(g, rng) {
    gritFloor(g, { x: 0, y: 0, w: GEODE_W, h: GEODE_H }, rng);
    // The geode's own wall, banded, all the way round.
    geodeBands(g, { x: 0, y: 0, w: GEODE_W, h: 170 }, 's', rng);
    geodeBands(g, { x: 0, y: 1440, w: GEODE_W, h: 160 }, 'n', rng);
    geodeBands(g, { x: 0, y: 0, w: 160, h: GEODE_H }, 'e', rng);
    geodeBands(g, { x: 2240, y: 0, w: 160, h: GEODE_H }, 'w', rng);
    // The two clefts the roads come in by: bare rind, dark-edged, grit underfoot.
    for (const r of [{ x: NORTH_X - 100, y: 0, w: 200, h: 175 }, { x: 0, y: AVENUE_Y - 100, w: 165, h: 200 }]) {
      g.fillStyle(RIND_DARK, 1); g.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20);
      gritFloor(g, r, rng, 1.2);
    }
    // Roads of crushed crystal.
    crystalPath(g, [{ x: 0, y: AVENUE_Y }, { x: 420, y: AVENUE_Y }, { x: 1000, y: 790 }], 70, rng);
    crystalPath(g, [{ x: 1400, y: 790 }, { x: 1900, y: AVENUE_Y }, { x: 2280, y: AVENUE_Y }], 70, rng);
    crystalPath(g, [{ x: NORTH_X, y: 0 }, { x: NORTH_X, y: 640 }], 60, rng);
    crystalPath(g, [{ x: NORTH_X, y: 930 }, { x: NORTH_X, y: 1200 }], 56, rng);
    crystalPath(g, [{ x: 200, y: 1250 }, { x: 960, y: 1250 }, { x: 1100, y: 1170 }, { x: NORTH_X, y: 1170 }], 50, rng);
    crystalPath(g, [{ x: 420, y: AVENUE_Y }, { x: 420, y: 1100 }], 44, rng);
    crystalPath(g, [{ x: 560, y: AVENUE_Y }, { x: 560, y: 470 }], 44, rng);
    crystalPath(g, [{ x: 1400, y: 880 }, { x: 1640, y: 1130 }, { x: 1900, y: 1290 }, { x: 2200, y: 1290 }], 46, rng);
    crystalPath(g, [{ x: 1300, y: 560 }, { x: 1500, y: 560 }, { x: 2100, y: 580 }], 50, rng);
    // Prism Square and the Cutting-House forecourt, paved in hexagonal quartz.
    hexFlags(g, { x: 1000, y: 640, w: 400, h: 290 }, 22, rng);
    hexFlags(g, { x: 1500, y: 470, w: 600, h: 120 }, 18, rng);
    // The light that is always lying about: colour baked into the grit near the square.
    spectrumBand(g, PRISM.x, PRISM.y - 60, 0.35, 560, 0.2, 0.05);
    spectrumBand(g, PRISM.x, PRISM.y - 60, Math.PI - 0.3, 520, 0.18, 0.04);
    // The Druse Gardens.
    for (const [x, y] of [[230, 240], [520, 240], [230, 360], [520, 360]] as [number, number][]) druseBed(g, x, y, 250, 92, rng);
    // The breaking-yard: split geodes in the dust, a drift of grit.
    g.fillStyle(DUST, 0.35); g.fillEllipse(430, 1390, 520, 120);
    for (let i = 0; i < 22; i++) {
      const x = 180 + rng() * 560, y = 1320 + rng() * 140;
      if (Math.hypot(x - 420, y - 1390) < 60) continue;
      geodeStone(g, x, y, 6 + rng() * 5, rng() < 0.6 ? 1 : 0, rng() < 0.5 ? AMETHYST : CITRINE);
    }
    // The crystal pool.
    crystalPool(g, POOL_RECT, rng);
    // The piezo floor among the spires.
    for (const p of PLATES) piezoPlate(g, p.x, p.y, 38, 0.15, 0);
    // The Chime Garden's chalk lines between its rods.
    for (let i = 0; i < RODS.length; i++) for (let j = i + 1; j < RODS.length; j++) {
      g.lineStyle(1, QUARTZ_LIT, 0.12); g.lineBetween(RODS[i].x, RODS[i].y, RODS[j].x, RODS[j].y);
    }
    // Dust round the Grinding Wheel, lying white downwind.
    g.fillStyle(DUST, 0.5); g.fillEllipse(WHEEL.x + 60, WHEEL.y + 20, 220, 60);
    g.fillStyle(0xffffff, 0.2); g.fillEllipse(WHEEL.x + 90, WHEEL.y + 30, 120, 30);
    // Grit darkened along the foot of every wall.
    g.fillStyle(GRIT_DARK, 0.2); g.fillRect(160, 170, GEODE_W - 320, 24); g.fillRect(160, 1420, GEODE_W - 320, 20);
  },

  pieces,

  animate(g, t, view) {
    // Rainbow bands off the great prism, drifting as the sun moves over the crack.
    if (inView(PRISM.x, PRISM.y, view, 600)) {
      const sway = Math.sin(t * 0.07) * 0.3;
      spectrumBand(g, PRISM.x + 10, PRISM.y - 70, 0.4 + sway, 480, 0.24, 0.07);
      spectrumBand(g, PRISM.x - 10, PRISM.y - 70, Math.PI - 0.45 + sway, 430, 0.2, 0.06);
      glow(g, PRISM.x, PRISM.y - 80, 70, SUNSHAFT, 0.03 + Math.sin(t * 1.4) * 0.01, 3);
    }
    // The pool surface.
    if (inView(POOL_RECT.x + POOL_RECT.w / 2, POOL_RECT.y + POOL_RECT.h / 2, view, 300)) poolShimmer(g, POOL_RECT, t);
    // The plates crackling under the spires.
    for (let i = 0; i < PLATES.length; i++) {
      const p = PLATES[i];
      if (!inView(p.x, p.y, view)) continue;
      const k = 0.15 + Math.max(0, Math.sin(t * 0.8 + i * 2.1)) * 0.5;
      piezoPlate(g, p.x, p.y, 38, k, t);
    }
    // A rod in the Chime Garden ringing now and then — rings spreading over the ground.
    for (let i = 0; i < RODS.length; i++) {
      const r = RODS[i];
      if (!inView(r.x, r.y, view)) continue;
      const ph = (t * 0.25 + i * 0.37) % 1;
      if (ph > 0.4) continue;
      const k = ph / 0.4;
      g.lineStyle(1.5, QUARTZ_LIT, 0.4 * (1 - k)); g.strokeEllipse(r.x, r.y, 30 + k * 120, 12 + k * 46);
    }
    // The Cutting-House crown stone blinking light across its forecourt.
    if (inView(CUTTING_HOUSE.x, CUTTING_HOUSE.y, view, 400)) {
      const a = t * 0.3;
      for (let i = 0; i < 3; i++) {
        const b = a + i * 2.1;
        const x = CUTTING_HOUSE.x + Math.cos(b) * 260, y = CUTTING_HOUSE.y + 60 + Math.sin(b) * 40;
        g.fillStyle(SPECTRUM[(i * 2) % SPECTRUM.length], 0.12); g.fillEllipse(x, y, 40, 14);
      }
    }
  },

  animateOver(g, t, view) {
    // The shaft of light through the crack, falling on the square.
    if (inView(NORTH_X, 400, view, 500)) {
      lightShaft(g, NORTH_X, 0, 700, 80, Math.PI / 2 + Math.sin(t * 0.07) * 0.08, t, 0.07);
      lightShaft(g, NORTH_X - 50, 0, 420, 30, Math.PI / 2 + 0.25, t * 1.3, 0.04);
    }
    // Glints running over the wall clusters and spires.
    for (let i = 0; i < sparkles.length; i++) {
      const s = sparkles[i];
      if (!inView(s.x, s.y, view, 40)) continue;
      const tw = Math.sin(t * 1.7 + i * 2.3);
      if (tw < 0.85) continue;
      const k = (tw - 0.85) / 0.15;
      g.fillStyle(0xffffff, k); g.fillCircle(s.x, s.y, 2.2);
      g.lineStyle(1, 0xffffff, k * 0.8); g.lineBetween(s.x - 6 * k, s.y, s.x + 6 * k, s.y); g.lineBetween(s.x, s.y - 6 * k, s.x, s.y + 6 * k);
    }
    // Grinding dust drifting off the Wheel and the Row.
    motes(g, { x: WHEEL.x - 100, y: WHEEL.y - 160, w: 360, h: 220 }, t, 16, DUST, 8, 14, 1.6, 3);
    if (inView(590, SHOP_Y, view, 300)) motes(g, { x: 220, y: SHOP_Y - 120, w: 740, h: 160 }, t, 14, DUST, 6, 10, 1.3, 7);
    // Violet light hanging in the air over the Druse Gardens.
    if (inView(520, 330, view, 300)) glow(g, 520, 320, 220, AMETHYST_LIT, 0.012 + Math.sin(t * 0.6) * 0.004, 3);
  },
};

export const GEODE_AREA: AreaDef = {
  id: 'geode',
  isle: 'earth',
  court: 'geode',
  name: 'The Geode Court',
  subtitle: 'Every stone graded; the flawed go to the Wheel',
  w: GEODE_W,
  h: GEODE_H,
  bg: AMETHYST_DEEP,
  accent: GEODE_COLOR,
  weather: 'glints',
  gloom: 0.12,
  spawn: { x: 230, y: AVENUE_Y },
  painter,
  solids,
  exits: [
    { side: 'w', to: 'quarrymouth', at: AVENUE_Y, label: 'Out through the Cleft to Quarrymouth' },
    { side: 'n', to: 'forge', at: NORTH_X, label: 'Up through the crack to the Forge Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 240, y: 700 } },
    { kind: 'prince', id: 'facet', at: { x: CUTTING_HOUSE.x, y: CUTTING_HOUSE.y + 50 } },
    { kind: 'water', id: 'geode-pool', shape: POOL_RECT, fishery: 'geode-pool' },
    { kind: 'encounter', id: 'geode-refraction' },
    { kind: 'encounter', id: 'geode-druse' },
    { kind: 'encounter', id: 'geode-resonance' },
    { kind: 'encounter', id: 'geode-cracked-geodes' },
    { kind: 'encounter', id: 'geode-piezo' },
    {
      kind: 'sign', at: { x: 270, y: 900 },
      text: 'THE GEODE TITHE. A weight of cut stone a household, graded flawless at the Loupe Table. Flawed counts for nothing.',
    },
    {
      kind: 'sign', at: { x: 1330, y: 520 },
      text: 'THE GRINDING WHEEL. Flawed stones are ground to dust here by order of Prince Facet. Do not reach in.',
    },
    {
      kind: 'sign', at: { x: 1550, y: 1100 },
      text: 'THE LAMP-HOUSE. All lamp oil is owed to the Cutting-House at the fourth bell. Light after dark is tithe theft.',
    },
    {
      kind: 'sign', at: { x: 1300, y: 200 },
      text: 'TO THE FORGE COURT. No letters, no messages, no flashing of the Prince\'s light from the ledge.',
    },
    { kind: 'chest', id: 'geode-chest-yard', at: { x: 180, y: 1440 }, coins: 110 },
    { kind: 'chest', id: 'geode-chest-house', at: { x: 2170, y: 480 }, orbs: 2, open: { prince: 'facet' } },
  ],
  npcs: GEODE_NPCS,
  crowd: GEODE_CROWD,
};
