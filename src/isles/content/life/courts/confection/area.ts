import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, flagstones, glow, groundFill, lit, mixC, road, stroke, type G } from '../../../../art/IsleArt';
import {
  CANE, CANE_DARK, CARAMEL, CHERRY, CRUMB, CRUMB_DARK, FLOSS, GRAPE, ICING, LEMON, LICORICE, MINT,
  PINK, PINK_PALE, SALT, SALT_DARK, SALT_LIT, SUGAR, SWEETS, SYRUP, SYRUP_DEEP, SYRUP_LIT, VERDIGRA,
  caneFence, floss, polyline, sugarCube, taffy, twist, wrappedSweet,
} from './art';
import {
  bonbonniere, caneMill, caneStand, cubeStore, fairStall, gingerHouse, glassFigure, glassFountain, gumdropBush,
  kettleRack, loafMonument, lollipopTree, ovenHouse, pinataGallows, pinwheel, pullingHook, saltHovel, sweetTaxHouse,
  taffyWorks, taxScales, waterWheel, windmill,
} from './buildings';
import { ENC_CARAMEL, ENC_GINGERBREAD, ENC_PINATA, ENC_SUGAR_RUSH, ENC_TAFFY_PULL } from './encounters';
import { FISHERY } from './items';
import { CONFECTION_NPCS, CROWD_BARKS, CROWD_LOOKS } from './npcs';

/**
 * The Confection Court — a sugar town, sweet on top and salt underneath.
 *
 * Gingerbread houses with iced eaves and gumdrop ridges line Peppermint Way down from the Spore
 * road; candy-cane fences pen the gardens; a river of syrup runs down the west side from the
 * cane mill's race into the Treacle Pool, where Licorice Jack hauls up caramel eels. In the
 * middle, Sugarloaf Square holds the Sweet-Tax House and its scales — a loaf a head a season, and
 * the scales always tip toward the loaf. North-east, Prince Saccharo's Bonbonnière stands like a
 * wedding cake in a garden of lollipop trees, with the Glass Walk of children behind it. East,
 * Treacle Road runs out to Mossgate past the Taffy Works; south-east is the Fête Ground and its
 * piñata gallows; south are the ovens; and down the Salt Steps in the south-west is the
 * Saltcellar, the grey salt-block quarter of the people who dig what holds the sugar up.
 *
 * Layout (2400×1600): north gate at the top middle (Peppermint Way), east gate at the right
 * middle (Treacle Road). The syrup river runs x 360–460 from the top to the Treacle Pool
 * (x 40–600, y 1000–1390); Licorice Bridge crosses it at y 230–300 to the cane field.
 */

const W = 2400;
const H = 1600;

// ── Roads ────────────────────────────────────────────────────────────

const PEPPERMINT_WAY: Pt[] = [{ x: 1200, y: -20 }, { x: 1200, y: 300 }, { x: 1290, y: 500 }, { x: 1290, y: 660 }];
const TREACLE_ROAD: Pt[] = [{ x: 2420, y: 800 }, { x: 2000, y: 806 }, { x: 1700, y: 794 }, { x: 1390, y: 776 }];
const MILL_LANE: Pt[] = [{ x: 1010, y: 760 }, { x: 820, y: 690 }, { x: 680, y: 560 }, { x: 740, y: 440 }, { x: 720, y: 330 }, { x: 560, y: 280 }, { x: 470, y: 266 }, { x: 260, y: 266 }];
const PALACE_DRIVE: Pt[] = [{ x: 1240, y: 400 }, { x: 1500, y: 432 }, { x: 1700, y: 500 }, { x: 1900, y: 560 }];
const GLASS_PATH: Pt[] = [{ x: 2060, y: 560 }, { x: 2200, y: 520 }, { x: 2260, y: 430 }];
const OVEN_ROW: Pt[] = [{ x: 1200, y: 890 }, { x: 1190, y: 1100 }, { x: 1190, y: 1290 }];
const KETTLE_PATH: Pt[] = [{ x: 1030, y: 880 }, { x: 880, y: 990 }, { x: 800, y: 1150 }, { x: 680, y: 1290 }];
const SALT_STEPS: Pt[] = [{ x: 880, y: 990 }, { x: 870, y: 1250 }, { x: 900, y: 1460 }];
const FETE_ROAD: Pt[] = [{ x: 1950, y: 806 }, { x: 2020, y: 950 }, { x: 2080, y: 1120 }, { x: 2060, y: 1300 }];

const PLAZA: Rect = { x: 1010, y: 640, w: 400, h: 260 };
const FORECOURT: Rect = { x: 1720, y: 480, w: 360, h: 120 };
const FETE: Rect = { x: 1900, y: 1070, w: 450, h: 400 };
const SALTCELLAR: Rect = { x: 620, y: 1330, w: 560, h: 260 };
const MILL_YARD: Rect = { x: 520, y: 460, w: 460, h: 200 };
const OVEN_YARD: Rect = { x: 1100, y: 1210, w: 300, h: 150 };
const CANE_FIELD: Rect = { x: 30, y: 20, w: 320, h: 960 };
const GLASS_GARDEN: Rect = { x: 2140, y: 290, w: 230, h: 230 };
const POOL: Rect = { x: 40, y: 1000, w: 560, h: 390 };

// ── Set pieces ───────────────────────────────────────────────────────

interface HouseSpec { x: number; y: number; w: number; h: number; roof: number; pane: number }
const HOUSES: HouseSpec[] = [
  { x: 1040, y: 220, w: 130, h: 84, roof: PINK, pane: LEMON },
  { x: 1400, y: 200, w: 140, h: 90, roof: MINT, pane: PINK },
  { x: 1040, y: 420, w: 120, h: 80, roof: LEMON, pane: MINT },
  { x: 1420, y: 360, w: 120, h: 80, roof: GRAPE, pane: LEMON },
  { x: 1640, y: 690, w: 120, h: 78, roof: CHERRY, pane: LEMON },
  { x: 2120, y: 730, w: 140, h: 86, roof: PINK, pane: MINT },
  { x: 2250, y: 960, w: 130, h: 82, roof: MINT, pane: PINK },
  { x: 760, y: 800, w: 120, h: 78, roof: GRAPE, pane: LEMON },
  { x: 1560, y: 1000, w: 120, h: 80, roof: LEMON, pane: PINK },
  { x: 1560, y: 1300, w: 130, h: 82, roof: PINK, pane: MINT },
];
const SHOP: HouseSpec = { x: 1480, y: 724, w: 150, h: 96, roof: CHERRY, pane: PINK };
const BAKERY: HouseSpec = { x: 900, y: 880, w: 170, h: 104, roof: CARAMEL, pane: LEMON };

const HOVELS: { x: number; y: number; w: number; h: number }[] = [
  { x: 670, y: 1400, w: 80, h: 56 }, { x: 770, y: 1396, w: 76, h: 52 }, { x: 1060, y: 1400, w: 80, h: 56 }, { x: 1150, y: 1404, w: 60, h: 46 },
  { x: 700, y: 1536, w: 84, h: 56 }, { x: 830, y: 1546, w: 76, h: 50 }, { x: 980, y: 1540, w: 84, h: 56 }, { x: 1110, y: 1536, w: 76, h: 52 },
];
const WINDMILLS: Pt[] = [{ x: 780, y: 300 }, { x: 920, y: 190 }];
const MILL: Pt = { x: 600, y: 420 };
const WHEEL_HUB: Pt = { x: 478, y: 372 };
const CUBE_STORE: Pt = { x: 920, y: 520 };
const TAX_HOUSE: Pt = { x: 1080, y: 632 };
const SCALES: Pt = { x: 1210, y: 770 };
const MONUMENT: Pt = { x: 1360, y: 640 };
const PALACE: Pt = { x: 1900, y: 470 };
const OVENS: Pt = { x: 1370, y: 1200 };
const TAFFY: Pt = { x: 1800, y: 1010 };
const HOOKS: Pt[] = [{ x: 1640, y: 920 }, { x: 1900, y: 916 }];
const KETTLES: Pt = { x: 700, y: 1110 };
const GALLOWS: Pt = { x: 2140, y: 1200 };
const STALLS: { x: number; y: number; c: number }[] = [
  { x: 1970, y: 1140, c: PINK }, { x: 2300, y: 1150, c: MINT }, { x: 2000, y: 1430, c: LEMON }, { x: 2290, y: 1420, c: GRAPE },
];
const FOUNTAIN: Pt = { x: 2250, y: 360 };
const FIGURES: Pt[] = [
  { x: 2170, y: 330 }, { x: 2330, y: 330 }, { x: 2170, y: 400 }, { x: 2330, y: 400 }, { x: 2180, y: 470 }, { x: 2340, y: 470 },
];
const LOLLIPOPS: { x: number; y: number; s: number; c1: number; c2: number }[] = [
  { x: 1640, y: 360, s: 20, c1: PINK, c2: ICING }, { x: 1700, y: 250, s: 24, c1: MINT, c2: ICING }, { x: 2120, y: 250, s: 22, c1: LEMON, c2: CHERRY },
  { x: 1580, y: 560, s: 18, c1: GRAPE, c2: ICING }, { x: 2380, y: 640, s: 18, c1: CHERRY, c2: ICING }, { x: 1440, y: 900, s: 16, c1: PINK, c2: MINT },
  { x: 980, y: 1080, s: 18, c1: LEMON, c2: PINK }, { x: 1900, y: 1520, s: 20, c1: MINT, c2: CHERRY }, { x: 2360, y: 1260, s: 18, c1: PINK, c2: LEMON },
  { x: 1840, y: 160, s: 22, c1: CHERRY, c2: ICING },
];
const BUSHES: Pt[] = [
  { x: 1760, y: 620 }, { x: 2040, y: 620 }, { x: 1560, y: 470 }, { x: 1330, y: 1000 }, { x: 960, y: 760 }, { x: 1700, y: 1180 },
  { x: 2370, y: 900 }, { x: 1100, y: 140 }, { x: 1500, y: 300 },
];
const CANE_STANDS: Pt[] = [];
for (let y = 60; y < 960; y += 70) for (let x = 60; x < 340; x += 64) if (!(y > 200 && y < 330 && x > 150)) CANE_STANDS.push({ x: x + ((y / 70) % 2) * 20, y });

/** Animated bits, reported by the pieces as they bake. Keyed so a re-bake never doubles them. */
const SMOKE: Pt[] = [];
const HUBS: Pt[] = [];
const FLAGS: { p: Pt; color: number }[] = [];
let GALLOWS_TOP: Pt | null = null;
let FOUNTAIN_TOP: Pt | null = null;
const HOOK_TIPS: Pt[] = [];
const seen = new Set<string>();
const once = (tag: string, p: Pt): boolean => {
  const k = `${tag}:${Math.round(p.x)},${Math.round(p.y)}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
};

// ── Solids ───────────────────────────────────────────────────────────

const foot = (x: number, y: number, w: number, d = 36): Solid => ({ kind: 'rect', x: x - w / 2, y: y - d, w, h: d });

const SOLIDS: Solid[] = [
  // The syrup river, the Treacle Pool and its outflow.
  { kind: 'rect', x: 360, y: 0, w: 100, h: 230 },
  { kind: 'rect', x: 360, y: 300, w: 100, h: 700 },
  { kind: 'rect', x: 40, y: 1000, w: 560, h: 390 },
  { kind: 'rect', x: 250, y: 1390, w: 90, h: 210 },
  { kind: 'rect', x: 0, y: 980, w: 40, h: 620 },
  // Buildings at their footings.
  ...HOUSES.map((h) => foot(h.x, h.y, h.w)),
  foot(SHOP.x, SHOP.y, SHOP.w),
  foot(BAKERY.x, BAKERY.y, BAKERY.w),
  ...HOVELS.map((h) => foot(h.x, h.y, h.w, 28)),
  foot(TAX_HOUSE.x, TAX_HOUSE.y, 240, 40),
  { kind: 'circle', x: SCALES.x, y: SCALES.y - 4, r: 26 },
  { kind: 'circle', x: MONUMENT.x, y: MONUMENT.y - 8, r: 24 },
  foot(PALACE.x, PALACE.y, 400, 50),
  foot(MILL.x, MILL.y, 200, 40),
  foot(CUBE_STORE.x, CUBE_STORE.y, 140, 30),
  ...WINDMILLS.map((m): Solid => ({ kind: 'circle', x: m.x, y: m.y - 8, r: 26 })),
  foot(OVENS.x, OVENS.y, 240, 40),
  foot(TAFFY.x, TAFFY.y, 240, 36),
  ...HOOKS.map((h): Solid => ({ kind: 'circle', x: h.x, y: h.y - 4, r: 10 })),
  { kind: 'rect', x: KETTLES.x - 92, y: KETTLES.y - 14, w: 14, h: 14 },
  { kind: 'rect', x: KETTLES.x + 78, y: KETTLES.y - 14, w: 14, h: 14 },
  { kind: 'circle', x: GALLOWS.x - 60, y: GALLOWS.y - 2, r: 10 },
  { kind: 'circle', x: GALLOWS.x + 60, y: GALLOWS.y - 2, r: 10 },
  ...STALLS.map((s) => foot(s.x, s.y, 90, 28)),
  { kind: 'circle', x: FOUNTAIN.x, y: FOUNTAIN.y - 8, r: 48 },
  ...FIGURES.map((f): Solid => ({ kind: 'circle', x: f.x, y: f.y - 6, r: 14 })),
  ...LOLLIPOPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 8 })),
];

// ── Painter ──────────────────────────────────────────────────────────

function syrup(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(SYRUP_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < (r.w * r.h) / 2400; i++) {
    g.fillStyle(rng() < 0.5 ? SYRUP : lit(SYRUP_DEEP, 0.1), 0.6);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 30 + rng() * 60, 6 + rng() * 10);
  }
}

/** A sticky bank: a crust of crystallised sugar where the syrup meets the crumb. */
function bank(g: G, x0: number, y0: number, x1: number, y1: number, rng: () => number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let d = 0; d < len; d += 6) {
    const k = d / len;
    g.fillStyle(rng() < 0.5 ? SUGAR : lit(CARAMEL, 0.5), 0.9);
    g.fillCircle(x0 + (x1 - x0) * k + (rng() - 0.5) * 6, y0 + (y1 - y0) * k + (rng() - 0.5) * 6, 2 + rng() * 2.5);
  }
}

function ground(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, CRUMB, mixC(CRUMB, PINK_PALE, 0.25), CRUMB_DARK, rng, 1.0);
  // Sprinkles everywhere: the town is iced even in the dirt.
  for (let i = 0; i < 2600; i++) {
    const x = rng() * W, y = rng() * H;
    g.fillStyle(SWEETS[i % SWEETS.length], 0.45);
    const a = rng() * Math.PI;
    g.fillRect(x, y, 3 + Math.cos(a) * 2, 1.4);
  }
  for (let i = 0; i < 1200; i++) { g.fillStyle(SUGAR, 0.5); g.fillCircle(rng() * W, rng() * H, 0.9); }

  // The cane field west of the river.
  g.fillStyle(mixC(CANE_DARK, CRUMB, 0.5), 1); g.fillRect(CANE_FIELD.x - 30, CANE_FIELD.y - 20, CANE_FIELD.w + 30, CANE_FIELD.h + 20);
  for (let i = 0; i < 900; i++) {
    const x = CANE_FIELD.x + rng() * CANE_FIELD.w, y = CANE_FIELD.y + rng() * CANE_FIELD.h;
    g.lineStyle(1.4, rng() < 0.5 ? CANE : CANE_DARK, 0.7); g.lineBetween(x, y, x + (rng() - 0.5) * 4, y - 8);
  }

  // The Saltcellar quarter: grey salt-crust underfoot, brine puddles.
  g.fillStyle(SALT_DARK, 1); g.fillRoundedRect(SALTCELLAR.x, SALTCELLAR.y, SALTCELLAR.w, SALTCELLAR.h, 30);
  g.fillStyle(SALT, 1); g.fillRoundedRect(SALTCELLAR.x + 6, SALTCELLAR.y + 6, SALTCELLAR.w - 12, SALTCELLAR.h - 12, 26);
  for (let i = 0; i < 600; i++) {
    g.fillStyle(rng() < 0.5 ? SALT_LIT : SALT_DARK, 0.7);
    g.fillRect(SALTCELLAR.x + 10 + rng() * (SALTCELLAR.w - 20), SALTCELLAR.y + 10 + rng() * (SALTCELLAR.h - 20), 1 + rng() * 3, 1 + rng() * 2);
  }
  for (let i = 0; i < 8; i++) blob(g, SALTCELLAR.x + 40 + rng() * (SALTCELLAR.w - 80), SALTCELLAR.y + 40 + rng() * (SALTCELLAR.h - 80), 26, 10, 0x8a8a7a, 0.5, rng);

  // The river, the pool and the outflow — syrup, with a crust of sugar at the banks.
  syrup(g, { x: 360, y: 0, w: 100, h: 1010 }, rng);
  syrup(g, POOL, rng);
  syrup(g, { x: 250, y: 1385, w: 90, h: 215 }, rng);
  bank(g, 360, 0, 360, 1000, rng); bank(g, 460, 0, 460, 1000, rng);
  bank(g, 40, 1000, 360, 1000, rng); bank(g, 460, 1000, 600, 1000, rng); bank(g, 600, 1000, 600, 1390, rng);
  bank(g, 40, 1390, 250, 1390, rng); bank(g, 340, 1390, 600, 1390, rng);
  bank(g, 250, 1390, 250, 1600, rng); bank(g, 340, 1390, 340, 1600, rng);
  // Pool rafts of caramel skin.
  for (let i = 0; i < 9; i++) blob(g, POOL.x + 40 + rng() * (POOL.w - 80), POOL.y + 30 + rng() * (POOL.h - 60), 30 + rng() * 30, 10 + rng() * 8, lit(SYRUP, 0.15), 0.5, rng);

  // Licorice Bridge: black licorice planks across the river.
  g.fillStyle(0x000000, 0.25); g.fillRect(352, 236, 116, 66);
  for (let x = 354; x < 466; x += 12) {
    g.fillStyle(LICORICE, 1); g.fillRect(x, 230, 10, 70);
    g.fillStyle(lit(LICORICE, 0.15), 1); g.fillRect(x + 1, 230, 2, 70);
  }
  twist(g, [{ x: 350, y: 228 }, { x: 470, y: 228 }], 5, LICORICE, 0xd84a8a, 1, 6);
  twist(g, [{ x: 350, y: 302 }, { x: 470, y: 302 }], 5, LICORICE, 0xd84a8a, 1, 6);

  // Roads: pale nonpareil cobbles, with a stripe of pink sprinkles down the crown.
  const fill = 0xf2e2d0, edge = 0xc8a888, stone = 0xe8d0c0;
  for (const pts of [PEPPERMINT_WAY, TREACLE_ROAD]) road(g, pts, 104, fill, edge, stone, rng);
  for (const pts of [MILL_LANE, PALACE_DRIVE, OVEN_ROW, FETE_ROAD]) road(g, pts, 84, fill, edge, stone, rng);
  for (const pts of [KETTLE_PATH, GLASS_PATH]) road(g, pts, 66, fill, edge, stone, rng);
  // The Salt Steps: grey, worn into treads.
  road(g, SALT_STEPS, 70, SALT, SALT_DARK, SALT_LIT, rng);
  for (let i = 0; i < SALT_STEPS.length - 1; i++) {
    const a = SALT_STEPS[i], b = SALT_STEPS[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 22) { const k = d / len; g.lineStyle(2, SALT_DARK, 0.7); g.lineBetween(a.x + (b.x - a.x) * k - 30, a.y + (b.y - a.y) * k, a.x + (b.x - a.x) * k + 30, a.y + (b.y - a.y) * k); }
  }
  // Peppermint Way's crown: a red-and-white stripe painted down the middle.
  for (let i = 0; i < PEPPERMINT_WAY.length - 1; i++) {
    const a = PEPPERMINT_WAY[i], b = PEPPERMINT_WAY[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 30) {
      const k0 = d / len, k1 = Math.min(1, (d + 15) / len);
      g.lineStyle(8, CHERRY, 0.5); g.lineBetween(a.x + (b.x - a.x) * k0, a.y + (b.y - a.y) * k0, a.x + (b.x - a.x) * k1, a.y + (b.y - a.y) * k1);
    }
  }
  stroke(g, TREACLE_ROAD.map((p) => ({ x: p.x, y: p.y + 18 })), 6, CARAMEL, 0.35);
  stroke(g, TREACLE_ROAD.map((p) => ({ x: p.x, y: p.y - 18 })), 6, CARAMEL, 0.35);

  // Sugarloaf Square: pastel flags, with the scales' brass ring.
  flagstones(g, PLAZA, 36, 0xf8e4ec, 0xc8a8b8, rng);
  g.lineStyle(4, VERDIGRA, 0.6); g.strokeCircle(SCALES.x, SCALES.y, 84);
  g.lineStyle(2, ICING, 0.7); g.strokeCircle(SCALES.x, SCALES.y, 92);
  // Spilled sugar under the scales — the shortfall, swept up by nobody.
  for (let i = 0; i < 60; i++) { g.fillStyle(SUGAR, 0.8); g.fillCircle(SCALES.x - 80 + rng() * 60, SCALES.y + 10 + rng() * 30, 1.5); }

  // The palace forecourt: pink marble-icing flags; the Glass Garden's pale lawn.
  flagstones(g, FORECOURT, 40, 0xfbe0ec, 0xd8a8c0, rng);
  g.fillStyle(lit(MINT, 0.4), 0.9); g.fillRoundedRect(GLASS_GARDEN.x, GLASS_GARDEN.y, GLASS_GARDEN.w, GLASS_GARDEN.h, 30);
  for (let i = 0; i < 300; i++) { g.lineStyle(1, MINT, 0.7); const x = GLASS_GARDEN.x + rng() * GLASS_GARDEN.w, y = GLASS_GARDEN.y + rng() * GLASS_GARDEN.h; g.lineBetween(x, y, x + 1, y - 5); }
  // A sugar-grass lawn round the palace.
  blob(g, PALACE.x, PALACE.y - 120, 360, 200, lit(MINT, 0.35), 0.5, rng, 14);

  // The mill yard: trodden sugar and dropped cubes.
  g.fillStyle(0xf0e4d4, 0.85); g.fillRoundedRect(MILL_YARD.x, MILL_YARD.y, MILL_YARD.w, MILL_YARD.h, 26);
  for (let i = 0; i < 400; i++) { g.fillStyle(SUGAR, 0.9); g.fillCircle(MILL_YARD.x + rng() * MILL_YARD.w, MILL_YARD.y + rng() * MILL_YARD.h, 1.2); }
  for (let i = 0; i < 12; i++) sugarCube(g, MILL_YARD.x + 30 + rng() * (MILL_YARD.w - 60), MILL_YARD.y + 30 + rng() * (MILL_YARD.h - 60), 3.5, 0.9);

  // The oven yard: flour and ash.
  g.fillStyle(0xe8dcc8, 0.8); g.fillRoundedRect(OVEN_YARD.x, OVEN_YARD.y, OVEN_YARD.w, OVEN_YARD.h, 20);
  for (let i = 0; i < 10; i++) blob(g, OVEN_YARD.x + rng() * OVEN_YARD.w, OVEN_YARD.y + rng() * OVEN_YARD.h, 16, 7, 0x8a7a6a, 0.3, rng);

  // The kettle bank: burnt caramel splashes.
  for (let i = 0; i < 14; i++) blob(g, KETTLES.x - 100 + rng() * 220, KETTLES.y - 30 + rng() * 120, 10 + rng() * 10, 5 + rng() * 4, i % 2 ? CARAMEL : dim(CARAMEL, 0.4), 0.7, rng);

  // The Fête Ground: mint sugar-grass, trampled round the gallows, with dropped sweets.
  g.fillStyle(lit(MINT, 0.25), 0.8); g.fillRoundedRect(FETE.x, FETE.y, FETE.w, FETE.h, 40);
  for (let i = 0; i < 500; i++) { g.lineStyle(1, MINT, 0.7); const x = FETE.x + rng() * FETE.w, y = FETE.y + rng() * FETE.h; g.lineBetween(x, y, x + 1, y - 5); }
  blob(g, GALLOWS.x, GALLOWS.y + 40, 120, 60, CRUMB, 0.8, rng);
  for (let i = 0; i < 26; i++) wrappedSweet(g, FETE.x + 20 + rng() * (FETE.w - 40), FETE.y + 20 + rng() * (FETE.h - 40), 3.4, SWEETS[i % SWEETS.length], rng() * 3, 0.9);
}

const PIECES: NonNullable<AreaPainter['pieces']> = [
  ...HOUSES.map((h) => ({
    x: h.x, y: h.y, w: h.w + 40, h: h.h * 1.9 + 30,
    draw: (g: G, rng: () => number) => { const c = gingerHouse(g, h.x, h.y, h.w, h.h, h.roof, rng, h.pane); if (once('s', c)) SMOKE.push(c); },
  })),
  {
    x: SHOP.x, y: SHOP.y, w: SHOP.w + 40, h: SHOP.h * 1.9 + 30,
    draw: (g, rng) => {
      gingerHouse(g, SHOP.x, SHOP.y, SHOP.w, SHOP.h, SHOP.roof, rng, SHOP.pane);
      // A striped awning and a sign: a wrapped sweet on a bracket.
      for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? PINK : ICING, 1); g.fillRect(SHOP.x - 70 + i * 17.5, SHOP.y - 58, 17.5, 14); }
      g.lineStyle(3, LICORICE, 1); g.lineBetween(SHOP.x + SHOP.w / 2, SHOP.y - 80, SHOP.x + SHOP.w / 2 + 26, SHOP.y - 80);
      wrappedSweet(g, SHOP.x + SHOP.w / 2 + 22, SHOP.y - 68, 8, PINK, 0);
    },
  },
  {
    x: BAKERY.x, y: BAKERY.y, w: BAKERY.w + 40, h: BAKERY.h * 1.9 + 60,
    draw: (g, rng) => {
      const c = gingerHouse(g, BAKERY.x, BAKERY.y, BAKERY.w, BAKERY.h, BAKERY.roof, rng, BAKERY.pane);
      if (once('s', c)) SMOKE.push(c);
      // The Sugar Loaf's sign: a great loaf over the door.
      g.fillStyle(0x3a5ab0, 1); g.fillTriangle(BAKERY.x - 16, BAKERY.y - 40, BAKERY.x + 16, BAKERY.y - 40, BAKERY.x, BAKERY.y - 90);
      g.fillStyle(SUGAR, 1); g.fillTriangle(BAKERY.x - 9, BAKERY.y - 66, BAKERY.x + 9, BAKERY.y - 66, BAKERY.x, BAKERY.y - 90);
    },
  },
  ...HOVELS.map((h) => ({
    x: h.x, y: h.y, w: h.w + 30, h: h.h + 40,
    draw: (g: G, rng: () => number) => { const c = saltHovel(g, h.x, h.y, h.w, h.h, rng); if (once('s', c)) SMOKE.push(c); },
  })),
  { x: TAX_HOUSE.x, y: TAX_HOUSE.y, w: 300, h: 270, draw: (g, rng) => { const f = sweetTaxHouse(g, TAX_HOUSE.x, TAX_HOUSE.y, rng); if (once('f', f)) FLAGS.push({ p: f, color: VERDIGRA }); } },
  { x: SCALES.x, y: SCALES.y, w: 180, h: 200, draw: (g) => { taxScales(g, SCALES.x, SCALES.y); } },
  { x: MONUMENT.x, y: MONUMENT.y, w: 80, h: 130, draw: (g) => { loafMonument(g, MONUMENT.x, MONUMENT.y); } },
  { x: PALACE.x, y: PALACE.y, w: 480, h: 480, draw: (g, rng) => { const f = bonbonniere(g, PALACE.x, PALACE.y, rng); if (once('f', f)) FLAGS.push({ p: f, color: VERDIGRA }); } },
  { x: MILL.x, y: MILL.y, w: 280, h: 230, draw: (g, rng) => caneMill(g, MILL.x, MILL.y, rng) },
  ...WINDMILLS.map((m) => ({ x: m.x, y: m.y, w: 150, h: 220, draw: (g: G, rng: () => number) => { const h = windmill(g, m.x, m.y, rng); if (once('h', h)) HUBS.push(h); } })),
  { x: CUBE_STORE.x, y: CUBE_STORE.y, w: 180, h: 130, draw: (g, rng) => cubeStore(g, CUBE_STORE.x, CUBE_STORE.y, rng) },
  { x: OVENS.x, y: OVENS.y, w: 280, h: 230, draw: (g, rng) => { const c = ovenHouse(g, OVENS.x, OVENS.y, rng); if (once('o', c)) { SMOKE.push(c); SMOKE.push({ x: c.x + 6, y: c.y - 4 }); } } },
  { x: TAFFY.x, y: TAFFY.y, w: 280, h: 190, draw: (g, rng) => { taffyWorks(g, TAFFY.x, TAFFY.y, rng); } },
  ...HOOKS.map((h) => ({ x: h.x, y: h.y, w: 50, h: 100, draw: (g: G) => { const t = pullingHook(g, h.x, h.y); if (once('k', t)) HOOK_TIPS.push(t); } })),
  { x: KETTLES.x, y: KETTLES.y, w: 220, h: 120, draw: (g) => { for (const k of kettleRack(g, KETTLES.x, KETTLES.y)) if (once('s', k)) SMOKE.push({ x: k.x, y: k.y - 40 }); } },
  { x: GALLOWS.x, y: GALLOWS.y, w: 160, h: 180, draw: (g) => { GALLOWS_TOP = pinataGallows(g, GALLOWS.x, GALLOWS.y); } },
  ...STALLS.map((s) => ({ x: s.x, y: s.y, w: 110, h: 100, draw: (g: G, rng: () => number) => fairStall(g, s.x, s.y, s.c, rng) })),
  { x: FOUNTAIN.x, y: FOUNTAIN.y, w: 130, h: 90, draw: (g) => { FOUNTAIN_TOP = glassFountain(g, FOUNTAIN.x, FOUNTAIN.y); } },
  ...FIGURES.map((f, i) => ({ x: f.x, y: f.y, w: 40, h: 70, draw: (g: G) => glassFigure(g, f.x, f.y, 12 + (i % 3) * 2, i) })),
  ...LOLLIPOPS.map((l, i) => ({ x: l.x, y: l.y, w: l.s * 2 + 20, h: l.s * 5, draw: (g: G) => lollipopTree(g, l.x, l.y, l.s, l.c1, l.c2, i * 1.3) })),
  ...BUSHES.map((b) => ({ x: b.x, y: b.y, w: 60, h: 40, draw: (g: G, rng: () => number) => gumdropBush(g, b.x, b.y, 12, rng) })),
  ...CANE_STANDS.map((c) => ({ x: c.x, y: c.y, w: 40, h: 70, draw: (g: G, rng: () => number) => caneStand(g, c.x, c.y, 54, rng) })),
  // Candy-cane fences: the palace garden front (gap for the drive), the square's south edge.
  { x: 1770, y: 612, w: 150, h: 50, draw: (g) => caneFence(g, { x: 1700, y: 612 }, { x: 1840, y: 612 }) },
  { x: 2030, y: 612, w: 150, h: 50, draw: (g) => caneFence(g, { x: 1960, y: 612 }, { x: 2100, y: 612 }) },
  { x: 2150, y: 286, w: 240, h: 50, draw: (g) => caneFence(g, { x: 2140, y: 286 }, { x: 2370, y: 286 }, 34, 30, VERDIGRA) },
  { x: 1450, y: 1100, w: 180, h: 50, draw: (g) => caneFence(g, { x: 1380, y: 1100 }, { x: 1520, y: 1100 }) },
  { x: 2000, y: 1060, w: 150, h: 50, draw: (g) => caneFence(g, { x: 1920, y: 1060 }, { x: 2010, y: 1060 }, 34, 30, MINT) },
];

const inView = (v: Rect, x: number, y: number, m: number): boolean => x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

function animate(g: G, t: number, view: Rect): void {
  // The river runs: glints and slow folds sliding down toward the pool.
  if (view.x < 620) {
    for (let i = 0; i < 26; i++) {
      const y = ((i * 61 + t * 38) % 1020) - 10;
      if (!inView(view, 410, y, 40)) continue;
      const x = 372 + ((i * 37) % 76);
      g.fillStyle(SYRUP_LIT, 0.35); g.fillEllipse(x, y, 10, 22);
      g.fillStyle(0xffffff, 0.2); g.fillEllipse(x - 2, y - 4, 3, 8);
    }
    // Slow swirls on the pool, and the occasional bubble.
    for (let i = 0; i < 10; i++) {
      const cx = POOL.x + 50 + ((i * 97) % (POOL.w - 100)), cy = POOL.y + 40 + ((i * 71) % (POOL.h - 80));
      if (!inView(view, cx, cy, 60)) continue;
      const a = t * 0.3 + i;
      g.lineStyle(2, SYRUP_LIT, 0.25);
      g.beginPath(); g.arc(cx, cy, 16 + (i % 3) * 6, a, a + 2.2, false); g.strokePath();
      const ph = (t * 0.5 + i * 0.31) % 1;
      if (ph < 0.3) { g.lineStyle(1.5, SYRUP_LIT, 0.6 * (1 - ph / 0.3)); g.strokeCircle(cx + 20, cy + 8, 2 + ph * 20); }
    }
  }
  // The mill wheel, turned by syrup.
  if (inView(view, WHEEL_HUB.x, WHEEL_HUB.y, 90)) waterWheel(g, WHEEL_HUB, t * 0.6);
  // The glass fountain running pink.
  if (FOUNTAIN_TOP && inView(view, FOUNTAIN_TOP.x, FOUNTAIN_TOP.y, 80)) {
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.8 + i / 8) % 1;
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(FLOSS, 0.8 * (1 - ph));
      g.fillCircle(FOUNTAIN_TOP.x + Math.cos(a) * ph * 40, FOUNTAIN_TOP.y + ph * ph * 50 - Math.sin(ph * Math.PI) * 14, 2.5);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Pinwheel sails on the mills.
  for (const h of HUBS) if (inView(view, h.x, h.y, 90)) pinwheel(g, h, t * 1.1 + h.x * 0.01);
  // Chimney smoke, faintly pink with sugar.
  for (const c of SMOKE) {
    if (!inView(view, c.x, c.y, 160)) continue;
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.28 + i / 5 + c.x * 0.001) % 1;
      g.fillStyle(mixC(0xe8e0e4, PINK_PALE, 0.4), 0.3 * (1 - ph));
      g.fillCircle(c.x + ph * 40 + Math.sin(t + i) * 5, c.y - ph * 60, 5 + ph * 12);
    }
  }
  // Pennants in the Empress's green.
  for (const f of FLAGS) {
    if (!inView(view, f.p.x, f.p.y, 80)) continue;
    const pts: Pt[] = [];
    for (let k = 0; k <= 6; k++) { const s = k / 6; pts.push({ x: f.p.x + 40 * s, y: f.p.y + 4 + Math.sin(t * 5 - s * 4 + f.p.x) * 4 * s }); }
    polyline(g, pts, 6, dim(f.color, 0.3), 0.9);
    polyline(g, pts, 4, f.color, 1);
  }
  // The piñata swinging on its gallows, and bunting off the beam.
  if (GALLOWS_TOP && inView(view, GALLOWS_TOP.x, GALLOWS_TOP.y + 60, 160)) {
    const a = Math.sin(t * 1.6) * 0.35;
    const px = GALLOWS_TOP.x + Math.sin(a) * 70, py = GALLOWS_TOP.y + Math.cos(a) * 70;
    g.lineStyle(2, 0x8a6a3a, 1); g.lineBetween(GALLOWS_TOP.x, GALLOWS_TOP.y - 4, px, py - 14);
    const rows = [PINK, LEMON, MINT, GRAPE];
    rows.forEach((c, r) => { g.fillStyle(c, 1); g.fillRect(px - 18 + Math.abs(r - 1.5) * 3, py - 14 + r * 6, 36 - Math.abs(r - 1.5) * 6, 6); });
    g.fillStyle(PINK, 1); g.fillEllipse(px + 20, py - 18, 16, 10);
    g.fillStyle(GRAPE, 1); g.fillTriangle(px + 16, py - 22, px + 20, py - 22, px + 18, py - 34);
    for (const s of [-1, 1]) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push({ x: GALLOWS_TOP.x + s * f * 160, y: GALLOWS_TOP.y - 4 + Math.sin(f * Math.PI) * 30 + f * 40 }); }
      polyline(g, pts, 1.2, ICING, 0.9);
      for (let k = 1; k < 8; k++) {
        const p = pts[k]; const fl = Math.sin(t * 4 + k) * 2;
        g.fillStyle(SWEETS[k % SWEETS.length], 1); g.fillTriangle(p.x - 5, p.y, p.x + 5, p.y, p.x + fl, p.y + 11);
      }
    }
  }
  // Taffy looped over the pulling hooks, slowly drooping and being heaved back up.
  for (const h of HOOK_TIPS) {
    if (!inView(view, h.x, h.y, 80)) continue;
    const k = 0.5 + 0.5 * Math.sin(t * 0.9 + h.x);
    taffy(g, { x: h.x - 4, y: h.y }, { x: h.x + 4, y: h.y }, { x: h.x, y: h.y + 30 + k * 26 }, 6, PINK_PALE, ICING, 1, t * 8);
  }
  // Glints on the glass children.
  for (let i = 0; i < FIGURES.length; i++) {
    const f = FIGURES[i];
    if (!inView(view, f.x, f.y, 60)) continue;
    const ph = (t * 0.25 + i * 0.19) % 1;
    if (ph < 0.12) { g.fillStyle(0xffffff, 0.9 * (1 - ph / 0.12)); g.fillCircle(f.x - 4, f.y - 40, 2.4); g.lineStyle(1, 0xffffff, 0.6 * (1 - ph / 0.12)); g.lineBetween(f.x - 10, f.y - 40, f.x + 2, f.y - 40); g.lineBetween(f.x - 4, f.y - 46, f.x - 4, f.y - 34); }
  }
  // Candy-floss clouds drifting off the palace dome.
  if (inView(view, PALACE.x, PALACE.y - 300, 400)) {
    for (let i = 0; i < 4; i++) {
      const x = PALACE.x - 200 + ((t * 14 + i * 140) % 520), y = PALACE.y - 330 - i * 26 + Math.sin(t * 0.4 + i) * 8;
      floss(g, x, y, 22 - i * 3, 0.45, FLOSS, t);
    }
  }
  // The Sweet-Tax House lamp, and the warm glow of the Sugar Loaf's ovens.
  if (inView(view, BAKERY.x, BAKERY.y - 40, 160)) glow(g, BAKERY.x, BAKERY.y - 60, 40, 0xffb060, 0.04, 3);
  if (inView(view, OVENS.x, OVENS.y - 40, 200)) { glow(g, OVENS.x - 40, OVENS.y - 30, 30, 0xff9a40, 0.05, 3); glow(g, OVENS.x + 40, OVENS.y - 30, 30, 0xff9a40, 0.05, 3); }
  // Saltcellar candles.
  for (const h of HOVELS) if (inView(view, h.x, h.y, 60)) glow(g, h.x + h.w * 0.22, h.y - h.h * 0.6, 12, 0xffd890, 0.05 + 0.02 * Math.sin(t * 3 + h.x), 2);
}

export const CONFECTION_AREA: AreaDef = {
  id: 'confection',
  isle: 'life',
  court: 'confection',
  name: 'The Confection Court',
  subtitle: 'A loaf a head, a head a season',
  w: W,
  h: H,
  bg: CRUMB_DARK,
  accent: PINK,
  weather: 'sugar',
  spawn: { x: 2250, y: 812 },
  painter: { ground, pieces: PIECES, animate, animateOver },
  solids: SOLIDS,
  exits: [
    { side: 'n', to: 'spore', label: 'Peppermint Way — to the Spore Court' },
    { side: 'e', to: 'mossgate', label: 'Treacle Road — to Mossgate' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2250, y: 756 } },
    { kind: 'sign', at: { x: 2300, y: 862 }, text: 'THE CONFECTION COURT. A loaf a head, a head a season, weighed true at the Sweet-Tax scales. — by order of His Sweetness' },
    { kind: 'sign', at: { x: 1046, y: 920 }, text: 'Sugarloaf Square. Tithe-Day at the turn of the season. Short households report to the Weighmaster. Smile.' },
    { kind: 'sign', at: { x: 920, y: 1260 }, text: 'The Salt Steps. To the Saltcellar. Mind the weep-stones. No sweets below this point.' },
    { kind: 'sign', at: { x: 680, y: 1000 }, text: 'The Treacle Pool. Syrup fishing by licence. Briarwood rods only — anything less, the syrup keeps.' },
    { kind: 'sign', at: { x: 1830, y: 630 }, text: 'The Bonbonnière. Residence of His Sweetness Prince Saccharo. Mill hands to use the back gate.' },
    { kind: 'sign', at: { x: 2130, y: 1080 }, text: 'The Fête Ground. Piñata at noon every Tithe-Day. All sweets the property of the Crown until broken.' },
    { kind: 'encounter', id: ENC_SUGAR_RUSH },
    { kind: 'encounter', id: ENC_TAFFY_PULL },
    { kind: 'encounter', id: ENC_GINGERBREAD },
    { kind: 'encounter', id: ENC_CARAMEL },
    { kind: 'encounter', id: ENC_PINATA },
    { kind: 'prince', id: 'saccharo', at: { x: 1900, y: 540 } },
    { kind: 'water', id: 'confection-treacle-pool', shape: POOL, fishery: FISHERY },
    { kind: 'chest', id: 'confection-canefield-chest', at: { x: 190, y: 270 }, coins: 90, orbs: 1 },
    { kind: 'chest', id: 'confection-saltcellar-chest', at: { x: 620, y: 1560 }, coins: 70 },
    { kind: 'chest', id: 'confection-glasswalk-chest', at: { x: 2340, y: 520 }, coins: 120, orbs: 1, open: { prince: 'saccharo' } },
  ],
  npcs: CONFECTION_NPCS,
  crowd: {
    count: 12,
    looks: CROWD_LOOKS,
    paths: [
      [{ x: 2300, y: 806 }, { x: 2000, y: 808 }, { x: 1700, y: 796 }, { x: 1420, y: 780 }],
      [{ x: 1200, y: 60 }, { x: 1200, y: 300 }, { x: 1286, y: 500 }, { x: 1286, y: 640 }],
      [{ x: 1010, y: 764 }, { x: 820, y: 694 }, { x: 690, y: 570 }],
      [{ x: 1240, y: 404 }, { x: 1500, y: 434 }, { x: 1700, y: 504 }],
      [{ x: 1200, y: 900 }, { x: 1190, y: 1100 }, { x: 1190, y: 1270 }],
      [{ x: 880, y: 1000 }, { x: 870, y: 1250 }, { x: 900, y: 1450 }, { x: 1000, y: 1470 }],
      [{ x: 1950, y: 808 }, { x: 2020, y: 950 }, { x: 2080, y: 1120 }, { x: 2140, y: 1320 }],
      [{ x: 1060, y: 700 }, { x: 1360, y: 720 }, { x: 1340, y: 870 }, { x: 1060, y: 860 }],
    ],
    barks: CROWD_BARKS,
  },
};

