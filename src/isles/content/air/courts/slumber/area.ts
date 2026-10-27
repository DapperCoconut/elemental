import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, flagstones, glow, groundFill, lit, mixC, road, rock, type G } from '../../../../art/IsleArt';
import {
  BRASS, CLOUD, CLOUD_DEEP, CLOUD_SHADE, DREAM, DREAM_LIT, FEATHER, LAMP_DIM, LAMP_FULL, MAUVE, MOON, NOD, NOD_DEEP,
  NOD_LIT, PLUM, QUILT_CREAM, QUILT_LAV, QUILT_ROSE, QUILT_SAGE, QUILT_SKY, QUILTS, RUSH, SKY_DEEP, SLATE, TURF,
  TURF_DARK, TURF_LIT, breathMeter, cloudPuff, dreamSheep, feather, hoodedLamp, moon, quiltRoad, star, streetBed, zzz,
} from './art';
import {
  bedsideTable, bell, belfry, collectorCart, countingStile, downMill, dreamBooth, drumSlats, featherShop, feltPump,
  fourPoster, hurdle, nightcapCottage, pastureCloud,
} from './buildings';
import { ENC_BAD_DREAM, ENC_LULLABY, ENC_PILLOW, ENC_SHEEP, ENC_SLEEPWALK } from './encounters';
import { FISHERY } from './items';
import { CROWD_BARKS, CROWD_LOOKS, SLUMBER_NPCS } from './npcs';
import { LAMPLESS_LAMPS } from './quests';

/**
 * The Slumber Court — the town where Highspire's becalmed are laid down to sleep.
 *
 * It sits on the spire's lee shoulder, the quiet side, where the wind drops and the clouds pile up
 * like bedding against the cliff. Its streets are quilted: patchwork feather-bed laid over the
 * cobbles so no footstep wakes anyone, and down the middle of the widest of them — the Long Ward —
 * stand the beds. Hundreds of them, in two rows in the open air, each with a debtor asleep under a
 * quilt and a brass breath-meter ticking on the counterpane, while the King's Night-Collector
 * corks a bottle off each one after the evening bell. The lamps are hooded down to a hair by the
 * Dimming Order. The Lullaby Belfry, north, hums the town to sleep through a felt jacket. West,
 * past the sheepfold where Shepherd Wooly counts dream-sheep over a stile, the cliff drops into a
 * sea of cloud with more sheep grazing on its tops. South-west lies the Lake of Nod, where the
 * dreams roll down to and the carp grow fat on them; south, Pillowmaker Down's feather mill;
 * south-east, Lampless Row, darker than the rest; and north-east the Prince's Four-Poster, a manor
 * built like a bed for a giant.
 *
 * Layout (2400×1600): east gate at the right middle (Hushing Way, to Galeward); south gate at the
 * bottom middle (Nod Lane, to Fable). The cloud sea fills x 0–300 (solid); the Lake of Nod is
 * x 380–940, y 1060–1430 (solid).
 */

const W = 2400;
const H = 1600;

// ── Roads and places ─────────────────────────────────────────────────

const HUSHING_WAY: Pt[] = [{ x: 2420, y: 800 }, { x: 2100, y: 806 }, { x: 1880, y: 814 }, { x: 1700, y: 820 }];
const LONG_WARD: Pt[] = [{ x: 640, y: 820 }, { x: 1720, y: 820 }];
const NOD_LANE: Pt[] = [{ x: 1200, y: 930 }, { x: 1200, y: 1620 }];
const BELL_ROAD: Pt[] = [{ x: 1200, y: 720 }, { x: 1200, y: 560 }];
const FOLD_PATH: Pt[] = [{ x: 660, y: 800 }, { x: 625, y: 720 }, { x: 610, y: 620 }];
const MANOR_DRIVE: Pt[] = [{ x: 1760, y: 816 }, { x: 1820, y: 700 }, { x: 1880, y: 560 }];
const LAMPLESS_ROW: Pt[] = [{ x: 1720, y: 880 }, { x: 1880, y: 1060 }, { x: 2100, y: 1260 }, { x: 2300, y: 1440 }, { x: 2360, y: 1600 }];
const MILL_PATH: Pt[] = [{ x: 1200, y: 1300 }, { x: 1360, y: 1330 }, { x: 1480, y: 1336 }];
const LAKE_PATH: Pt[] = [{ x: 1200, y: 1180 }, { x: 1080, y: 1210 }, { x: 990, y: 1250 }, { x: 960, y: 1460 }, { x: 700, y: 1510 }];
const BOOTH_PATH: Pt[] = [{ x: 900, y: 930 }, { x: 870, y: 1000 }];

const CLOUD_SEA: Rect = { x: 0, y: 0, w: 300, h: H };
const FOLD: Rect = { x: 330, y: 290, w: 440, h: 350 };
const BELFRY_SQ: Rect = { x: 960, y: 380, w: 460, h: 210 };
const FORECOURT: Rect = { x: 1700, y: 476, w: 360, h: 110 };
const LAKE: Rect = { x: 380, y: 1060, w: 560, h: 370 };
const MILL_YARD: Rect = { x: 1390, y: 1240, w: 340, h: 190 };

// ── Set pieces ───────────────────────────────────────────────────────

interface HouseSpec { x: number; y: number; w: number; h: number; roof: number }
const HOUSES: HouseSpec[] = [
  { x: 860, y: 690, w: 130, h: 92, roof: PLUM },
  { x: 1660, y: 690, w: 120, h: 86, roof: SLATE },
  { x: 1000, y: 1050, w: 120, h: 84, roof: MAUVE },
  { x: 1380, y: 1050, w: 130, h: 90, roof: SLATE },
  { x: 1770, y: 1180, w: 100, h: 78, roof: PLUM },
  { x: 2180, y: 660, w: 130, h: 90, roof: MAUVE },
  { x: 2330, y: 650, w: 110, h: 84, roof: PLUM },
  { x: 2320, y: 1000, w: 120, h: 86, roof: SLATE },
  { x: 2070, y: 1060, w: 120, h: 84, roof: PLUM },
  { x: 2290, y: 1240, w: 110, h: 80, roof: MAUVE },
  { x: 1870, y: 1240, w: 120, h: 84, roof: SLATE },
  { x: 2050, y: 1440, w: 120, h: 86, roof: MAUVE },
];
const SHOP: Pt = { x: 1480, y: 690 };
const BELFRY: Pt = { x: 1180, y: 430 };
const MANOR: Pt = { x: 1880, y: 470 };
const MILL: Pt = { x: 1560, y: 1230 };
const BOOTH: Pt = { x: 790, y: 1010 };
const CART: Pt = { x: 2000, y: 744 };
const STILE: Pt = { x: 480, y: 450 };
const PUMP: Pt = { x: 1330, y: 800 };

/** The beds of the Long Ward: two rows, heads up the screen, gaps at the crossings and the shop door. */
interface BedSpec { x: number; y: number; quilt: number; skin: number; cap: number }
const SKINS = [0xf0d8c0, 0xd8b898, 0xe8c8b0, 0xc8a080, 0xf4e0d0, 0xb88a68];
const CAPS = [QUILT_LAV, QUILT_ROSE, QUILT_SKY, QUILT_SAGE, QUILT_CREAM, MAUVE];
const BEDS: BedSpec[] = [];
{
  let i = 0;
  for (let x = 740; x <= 1660; x += 90) {
    if (x > 1130 && x < 1270) continue;
    if (x > 1420 && x < 1540) continue;
    BEDS.push({ x, y: 762, quilt: x === 1010 ? QUILT_ROSE : QUILTS[i % QUILTS.length], skin: SKINS[i % SKINS.length], cap: CAPS[(i * 3) % CAPS.length] });
    i++;
  }
  for (let x = 740; x <= 1620; x += 90) {
    if (x > 830 && x < 940) continue;
    if (x > 1130 && x < 1270) continue;
    BEDS.push({ x, y: 937, quilt: QUILTS[(i + 2) % QUILTS.length], skin: SKINS[(i + 3) % SKINS.length], cap: CAPS[(i * 5) % CAPS.length] });
    i++;
  }
}
const BED_W = 64;
const BED_D = 40;

const LAMPS: Pt[] = [
  { x: 1120, y: 690 }, { x: 1262, y: 690 }, { x: 1130, y: 980 }, { x: 1262, y: 980 },
  { x: 1740, y: 640 }, { x: 1964, y: 640 }, { x: 1090, y: 1320 }, { x: 640, y: 964 }, { x: 2200, y: 870 },
];
const HURDLES: [Pt, Pt][] = [
  [{ x: 340, y: 292 }, { x: 770, y: 292 }],
  [{ x: 770, y: 292 }, { x: 770, y: 640 }],
  [{ x: 340, y: 640 }, { x: 560, y: 640 }],
  [{ x: 660, y: 640 }, { x: 770, y: 640 }],
];
const CLOUD_ISLES: { x: number; y: number; r: number }[] = [
  { x: 140, y: 250, r: 62 }, { x: 196, y: 620, r: 50 }, { x: 120, y: 960, r: 72 }, { x: 190, y: 1330, r: 56 },
];
/** Sheep grazing in the fold (they bob and crop), as fixed spots. */
const FOLD_SHEEP: { x: number; y: number; dir: 1 | -1 }[] = [
  { x: 400, y: 360, dir: 1 }, { x: 690, y: 380, dir: -1 }, { x: 640, y: 470, dir: -1 }, { x: 390, y: 590, dir: 1 }, { x: 710, y: 600, dir: -1 },
];

/** Animated bits, reported by the pieces as they bake. Keyed so a re-bake never doubles them. */
const POMPOMS: Pt[] = [];
const METERS: Pt[] = [];
let BELL_HUB: Pt | null = null;
let VALANCE: Pt | null = null;
let CHUTE: Pt | null = null;
let DRUM: Pt | null = null;
let BOOTH_LAMP: Pt | null = null;
const FLAMES: { p: Pt; lit: boolean }[] = [];
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
  { kind: 'rect', ...CLOUD_SEA },
  { kind: 'rect', ...LAKE },
  // The sheepfold's hurdles (gate gap at x 560–660 on the south side).
  { kind: 'rect', x: 330, y: 280, w: 450, h: 14 },
  { kind: 'rect', x: 764, y: 280, w: 14, h: 362 },
  { kind: 'rect', x: 330, y: 630, w: 230, h: 14 },
  { kind: 'rect', x: 660, y: 630, w: 118, h: 14 },
  { kind: 'rect', x: STILE.x - 44, y: STILE.y - 10, w: 88, h: 12 },
  ...HOUSES.map((h) => foot(h.x, h.y, h.w)),
  foot(SHOP.x, SHOP.y, 170),
  foot(BELFRY.x, BELFRY.y, 120, 50),
  foot(MANOR.x, MANOR.y, 410, 60),
  foot(MILL.x, MILL.y, 230, 40),
  foot(BOOTH.x, BOOTH.y, 110, 24),
  foot(CART.x, CART.y, 120, 24),
  ...BEDS.map((b) => foot(b.x, b.y, BED_W, 34)),
  { kind: 'circle', x: PUMP.x, y: PUMP.y - 4, r: 10 },
  ...LAMPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 7 })),
  ...LAMPLESS_LAMPS.map((l): Solid => ({ kind: 'circle', x: l.x, y: l.y - 2, r: 7 })),
];

// ── Painter ──────────────────────────────────────────────────────────

function ground(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, TURF, mixC(TURF, TURF_LIT, 0.4), TURF_DARK, rng, 1.0);
  // Dew on the dusk turf, and clover.
  for (let i = 0; i < 1600; i++) { g.fillStyle(rng() < 0.7 ? TURF_LIT : DREAM_LIT, 0.35); g.fillCircle(rng() * W, rng() * H, 0.9); }
  for (let i = 0; i < 260; i++) {
    const x = 320 + rng() * (W - 320), y = rng() * H;
    g.fillStyle(lit(TURF, 0.2), 0.6);
    for (let k = 0; k < 3; k++) g.fillCircle(x + Math.cos(k * 2.1) * 2.4, y + Math.sin(k * 2.1) * 2.4, 2);
  }

  // The cloud sea past the cliff: deep sky at the bottom of the drop, cloud-banks heaped over it.
  g.fillStyle(SKY_DEEP, 1); g.fillRect(CLOUD_SEA.x, CLOUD_SEA.y, CLOUD_SEA.w + 30, CLOUD_SEA.h);
  for (let y = 0; y < H; y += 40) { g.fillStyle(mixC(SKY_DEEP, CLOUD_DEEP, 0.5 + 0.5 * Math.sin(y * 0.01)), 0.5); g.fillRect(0, y, 300, 22); }
  for (let i = 0; i < 70; i++) {
    const x = rng() * 300, y = rng() * H;
    cloudPuff(g, x, y, 24 + rng() * 40, 0.55 + rng() * 0.35, rng() < 0.5 ? CLOUD : mixC(CLOUD, CLOUD_SHADE, 0.5), CLOUD_DEEP, rng() * 10);
  }
  // The cliff lip: a crumbling edge of turf and rock with the drop under it.
  for (let y = -10; y < H + 10; y += 14) {
    const jx = 300 + Math.sin(y * 0.05) * 6 + rng() * 5;
    g.fillStyle(dim(TURF_DARK, 0.4), 1); g.fillRect(jx - 4, y, 12, 16);
    g.fillStyle(0x7a7690, 1); g.fillRect(jx + 4, y, 10, 15);
    g.fillStyle(TURF, 1); g.fillCircle(jx + 18, y + 7, 9);
  }
  for (let y = 40; y < H; y += 110) rock(g, 322 + rng() * 14, y + rng() * 40, 9 + rng() * 6, 0x8a86a2, rng);

  // The sheepfold: a paler meadow, grazed short, with clover and a worn ring round the stile.
  g.fillStyle(mixC(TURF_LIT, 0xa8c0a0, 0.4), 0.7); g.fillRoundedRect(FOLD.x, FOLD.y, FOLD.w, FOLD.h, 20);
  for (let i = 0; i < 700; i++) { g.lineStyle(1, mixC(TURF_LIT, 0xc8e0c0, rng()), 0.7); const x = FOLD.x + rng() * FOLD.w, y = FOLD.y + rng() * FOLD.h; g.lineBetween(x, y, x + (rng() - 0.5) * 2, y - 4); }
  blob(g, STILE.x, STILE.y + 6, 90, 34, mixC(TURF, 0x8a7a68, 0.5), 0.55, rng);
  for (let i = 0; i < 30; i++) { g.fillStyle(FEATHER, 0.6); g.fillCircle(FOLD.x + rng() * FOLD.w, FOLD.y + rng() * FOLD.h, 1.5 + rng() * 1.5); }

  // The Lake of Nod: deep indigo and dead still, a reflected moon in it, rushes round the rim.
  g.fillStyle(0x8a88b0, 1); g.fillRoundedRect(LAKE.x - 10, LAKE.y - 10, LAKE.w + 20, LAKE.h + 20, 40);
  g.fillStyle(NOD, 1); g.fillRoundedRect(LAKE.x, LAKE.y, LAKE.w, LAKE.h, 34);
  g.fillStyle(NOD_DEEP, 1); g.fillRoundedRect(LAKE.x + 22, LAKE.y + 22, LAKE.w - 44, LAKE.h - 44, 28);
  for (let i = 0; i < 26; i++) { g.fillStyle(NOD_LIT, 0.18); g.fillEllipse(LAKE.x + 40 + rng() * (LAKE.w - 80), LAKE.y + 30 + rng() * (LAKE.h - 60), 30 + rng() * 60, 3 + rng() * 4); }
  moon(g, LAKE.x + LAKE.w * 0.62, LAKE.y + LAKE.h * 0.4, 26, 0.55);
  for (let i = 0; i < 40; i++) star(g, LAKE.x + 30 + rng() * (LAKE.w - 60), LAKE.y + 30 + rng() * (LAKE.h - 60), 1.4 + rng() * 1.6, MOON, 0.4 + rng() * 0.3, rng());
  for (let i = 0; i < 140; i++) {
    const a = rng() * Math.PI * 2;
    const x = LAKE.x + LAKE.w / 2 + Math.cos(a) * (LAKE.w / 2 + 4), y = LAKE.y + LAKE.h / 2 + Math.sin(a) * (LAKE.h / 2 + 4);
    g.lineStyle(1.6, RUSH, 0.9); g.lineBetween(x, y, x + (rng() - 0.5) * 6, y - 12 - rng() * 10);
    if (rng() < 0.15) { g.fillStyle(0x5a3a2a, 1); g.fillEllipse(x, y - 20, 3, 8); }
  }
  // Lily pads with closed flowers, asleep like everything else.
  for (let i = 0; i < 12; i++) {
    const x = LAKE.x + 40 + rng() * (LAKE.w - 80), y = LAKE.y + 30 + rng() * (LAKE.h - 60);
    g.fillStyle(0x3e6a5a, 0.9); g.fillEllipse(x, y, 22, 12);
    g.fillStyle(NOD, 1); g.fillTriangle(x, y, x + 11, y - 2, x + 11, y + 3);
    if (rng() < 0.5) { g.fillStyle(0xe8d8f0, 1); g.fillEllipse(x - 2, y - 3, 7, 5); }
  }

  // Roads: the feather-bed streets are quilted; the lesser paths are pale lilac gravel.
  quiltRoad(g, HUSHING_WAY, 110, rng);
  quiltRoad(g, NOD_LANE, 100, rng);
  quiltRoad(g, LONG_WARD, 250, rng);
  const fill = 0xb8b0c8, edge = 0x6a6488, stone = 0xd0c8dc;
  for (const pts of [BELL_ROAD, MANOR_DRIVE, MILL_PATH]) road(g, pts, 86, fill, edge, stone, rng);
  for (const pts of [FOLD_PATH, LAKE_PATH, BOOTH_PATH]) road(g, pts, 62, fill, edge, stone, rng);
  // Lampless Row: the same gravel, but in the dark — soot-grey, and the ground round it shadowed.
  for (let i = 0; i < LAMPLESS_ROW.length; i++) blob(g, LAMPLESS_ROW[i].x, LAMPLESS_ROW[i].y, 200, 140, 0x2a2840, 0.35, rng, 12);
  road(g, LAMPLESS_ROW, 90, 0x5a5670, 0x2e2a40, 0x6a6680, rng);

  // Belfry Square: lilac flags, a compass of brass let into them that points nowhere.
  flagstones(g, BELFRY_SQ, 36, 0xc8c0d8, 0x8a84a2, rng);
  g.lineStyle(3, BRASS, 0.55); g.strokeCircle(BELFRY.x, BELFRY.y + 100, 70);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineStyle(2, BRASS, 0.45); g.lineBetween(BELFRY.x + Math.cos(a) * 20, BELFRY.y + 100 + Math.sin(a) * 14, BELFRY.x + Math.cos(a) * 66, BELFRY.y + 100 + Math.sin(a) * 46); }
  moon(g, BELFRY.x, BELFRY.y + 100, 12, 0.45, 0.7);

  // The Four-Poster's forecourt: quilted rose flags, and a lawn of soft dusk-grass round the manor.
  blob(g, MANOR.x, MANOR.y - 60, 320, 170, lit(TURF, 0.12), 0.6, rng, 14);
  flagstones(g, FORECOURT, 34, 0xe0c8d4, 0x9a7a8a, rng);
  for (let i = 0; i < 6; i++) star(g, FORECOURT.x + 30 + i * 60, FORECOURT.y + FORECOURT.h / 2, 7, BRASS, 0.5, i * 0.4);

  // The Down Mill yard: trodden earth under drifts of down.
  g.fillStyle(0x7a7088, 0.8); g.fillRoundedRect(MILL_YARD.x, MILL_YARD.y, MILL_YARD.w, MILL_YARD.h, 26);
  for (let i = 0; i < 16; i++) blob(g, MILL_YARD.x + 30 + rng() * (MILL_YARD.w - 60), MILL_YARD.y + 20 + rng() * (MILL_YARD.h - 40), 18 + rng() * 22, 7 + rng() * 6, FEATHER, 0.55, rng);
  for (let i = 0; i < 120; i++) feather(g, MILL_YARD.x + rng() * MILL_YARD.w, MILL_YARD.y + rng() * MILL_YARD.h, 2.5 + rng() * 2, rng() * Math.PI, 0.7);

  // Dropped things on the Long Ward: a few spilled feathers, an odd slipper.
  for (let i = 0; i < 40; i++) feather(g, 660 + rng() * 1040, 700 + rng() * 240, 2.5 + rng() * 2, rng() * Math.PI, 0.65);
}

const PIECES: NonNullable<AreaPainter['pieces']> = [
  ...HOUSES.map((h) => ({
    x: h.x, y: h.y, w: h.w + 60, h: h.h * 2.2 + 40,
    draw: (g: G, rng: () => number) => { const c = nightcapCottage(g, h.x, h.y, h.w, h.h, h.roof, rng); if (once('p', c)) POMPOMS.push(c); },
  })),
  { x: SHOP.x, y: SHOP.y, w: 260, h: 260, draw: (g, rng) => { const c = featherShop(g, SHOP.x, SHOP.y, rng); if (once('p', c)) POMPOMS.push(c); } },
  { x: BELFRY.x, y: BELFRY.y, w: 180, h: 520, draw: (g, rng) => { BELL_HUB = belfry(g, BELFRY.x, BELFRY.y, rng); } },
  { x: MANOR.x, y: MANOR.y, w: 460, h: 380, draw: (g, rng) => { VALANCE = fourPoster(g, MANOR.x, MANOR.y, rng); } },
  { x: MILL.x, y: MILL.y, w: 280, h: 260, draw: (g, rng) => { const m = downMill(g, MILL.x, MILL.y, rng); CHUTE = m.chute; DRUM = m.drum; } },
  { x: BOOTH.x, y: BOOTH.y, w: 160, h: 150, draw: (g) => { BOOTH_LAMP = dreamBooth(g, BOOTH.x, BOOTH.y); } },
  { x: CART.x, y: CART.y, w: 160, h: 90, draw: (g) => collectorCart(g, CART.x, CART.y) },
  { x: STILE.x, y: STILE.y, w: 100, h: 50, draw: (g) => countingStile(g, STILE.x, STILE.y) },
  { x: PUMP.x, y: PUMP.y, w: 50, h: 60, draw: (g) => feltPump(g, PUMP.x, PUMP.y) },
  ...HURDLES.map(([a, b]) => ({
    x: (a.x + b.x) / 2, y: Math.max(a.y, b.y), w: Math.abs(b.x - a.x) + 30, h: Math.abs(b.y - a.y) + 40,
    draw: (g: G) => hurdle(g, a, b),
  })),
  ...BEDS.map((b) => ({
    x: b.x, y: b.y, w: BED_W + 40, h: 90,
    draw: (g: G, rng: () => number) => {
      const m = streetBed(g, b.x, b.y, BED_W, BED_D, b.quilt, b.skin, b.cap, rng);
      if (once('m', m)) METERS.push(m);
      if (b.x % 180 === 20) bedsideTable(g, b.x + BED_W / 2 + 12, b.y - 6);
    },
  })),
  ...LAMPS.map((l) => ({ x: l.x, y: l.y, w: 50, h: 90, draw: (g: G) => { const f = hoodedLamp(g, l.x, l.y); if (once('l', f)) FLAMES.push({ p: f, lit: false }); } })),
  ...LAMPLESS_LAMPS.map((l) => ({ x: l.x, y: l.y, w: 50, h: 90, draw: (g: G) => { const f = hoodedLamp(g, l.x, l.y); if (once('l', f)) FLAMES.push({ p: f, lit: false }); } })),
  ...CLOUD_ISLES.map((c) => ({ x: c.x, y: c.y, w: c.r * 3, h: c.r * 1.6, draw: (g: G) => pastureCloud(g, c.x, c.y, c.r) })),
];

const inView = (v: Rect, x: number, y: number, m: number): boolean => x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

function animate(g: G, t: number, view: Rect): void {
  // The cloud sea rolls slowly south below the cliff.
  if (view.x < 320) {
    for (let i = 0; i < 9; i++) {
      const y = ((i * 197 + t * 14) % (H + 200)) - 100;
      if (!inView(view, 150, y, 120)) continue;
      cloudPuff(g, 60 + ((i * 83) % 200), y, 30 + (i % 3) * 10, 0.35, CLOUD, CLOUD_SHADE, i);
    }
  }
  // The Lake of Nod: the moon's reflection trembling, stars winking, dreams surfacing in rings.
  if (inView(view, LAKE.x + LAKE.w / 2, LAKE.y + LAKE.h / 2, LAKE.w)) {
    const mx = LAKE.x + LAKE.w * 0.62, my = LAKE.y + LAKE.h * 0.4;
    for (let k = 0; k < 4; k++) {
      g.lineStyle(2, MOON, 0.25 - k * 0.05);
      const w = 40 + k * 16 + Math.sin(t * 1.3 + k) * 4;
      g.lineBetween(mx - w / 2, my + 30 + k * 9, mx + w / 2, my + 30 + k * 9);
    }
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.22 + i * 0.37) % 1;
      const cx = LAKE.x + 60 + ((i * 131) % (LAKE.w - 120)), cy = LAKE.y + 50 + ((i * 89) % (LAKE.h - 100));
      g.lineStyle(1.5, DREAM_LIT, 0.45 * (1 - ph)); g.strokeEllipse(cx, cy, 8 + ph * 50, 4 + ph * 20);
      if (ph < 0.2) { g.fillStyle(DREAM_LIT, 0.6 * (1 - ph / 0.2)); g.fillCircle(cx, cy - ph * 40, 3); }
    }
  }
  // Hooded lamps flickering on a hair of flame.
  for (const f of FLAMES) {
    if (!inView(view, f.p.x, f.p.y, 60)) continue;
    const fl = 0.04 + 0.02 * Math.sin(t * 7 + f.p.x * 0.1) + 0.01 * Math.sin(t * 13 + f.p.y);
    glow(g, f.p.x, f.p.y + 10, 26, LAMP_DIM, fl, 3);
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Dream-sheep grazing on the pasture clouds — bobbing, cropping clover off the tops.
  for (let i = 0; i < CLOUD_ISLES.length; i++) {
    const c = CLOUD_ISLES[i];
    if (!inView(view, c.x, c.y, 120)) continue;
    const bob = Math.sin(t * 0.6 + i) * 3;
    for (let k = 0; k < 2; k++) {
      const sx = c.x - c.r * 0.45 + k * c.r * 0.9;
      dreamSheep(g, sx + Math.sin(t * 0.3 + k + i) * 6, c.y - c.r * 0.28 + bob, 10, k ? -1 : 1, t * 0.2, 0, 1);
    }
  }
  // The fold flock: grazing, and one at a time leaping the counting stile.
  if (inView(view, FOLD.x + FOLD.w / 2, FOLD.y + FOLD.h / 2, FOLD.w)) {
    for (let i = 0; i < FOLD_SHEEP.length; i++) {
      const s = FOLD_SHEEP[i];
      dreamSheep(g, s.x + Math.sin(t * 0.4 + i) * 8, s.y, 11, s.dir, t * 0.25, 0, 1);
    }
    const ph = (t / 2.6) % 1;
    const sx = STILE.x - 70 + ph * 140;
    const hop = Math.min(1, Math.max(0, (ph - 0.35) / 0.3));
    dreamSheep(g, sx, STILE.y + 10, 11, 1, t, hop, Math.min(1, Math.min(ph, 1 - ph) * 6));
  }
  // Sleep-smoke from the pompom chimney-pots: slow lilac curls.
  for (const c of POMPOMS) {
    if (!inView(view, c.x, c.y, 140)) continue;
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.2 + i / 4 + c.x * 0.001) % 1;
      g.fillStyle(mixC(CLOUD_SHADE, DREAM, 0.3), 0.3 * (1 - ph));
      g.fillCircle(c.x + Math.sin(ph * 6 + i) * 8 + ph * 20, c.y - ph * 70, 5 + ph * 10);
    }
  }
  // Zzz off the beds, and the breath-meter needles twitching.
  for (let i = 0; i < METERS.length; i++) {
    const m = METERS[i];
    if (!inView(view, m.x, m.y, 60)) continue;
    breathMeter(g, m.x, m.y, 5, 0.2 + 0.1 * Math.sin(t * (0.8 + (i % 4) * 0.15) + i));
    if (i % 2 === 0) zzz(g, m.x - 20, m.y - 26, 5, t, DREAM_LIT, 0.8, i * 0.13);
  }
  // The muffled bell, humming its lullaby — a long slow swing.
  if (BELL_HUB && inView(view, BELL_HUB.x, BELL_HUB.y, 140)) {
    const sw = Math.sin(t * 0.9) * 0.28;
    bell(g, BELL_HUB, sw, 0.95, true);
    const ph = (t * 0.9 / (Math.PI * 2)) % 1;
    for (let k = 0; k < 2; k++) {
      const p2 = (ph + k * 0.5) % 1;
      g.lineStyle(2, DREAM_LIT, 0.25 * (1 - p2)); g.strokeEllipse(BELL_HUB.x, BELL_HUB.y + 60, 60 + p2 * 220, 20 + p2 * 70);
    }
  }
  // The Four-Poster's valance swaying in the lee wind.
  if (VALANCE && inView(view, VALANCE.x, VALANCE.y, 260)) {
    for (let i = 0; i < 16; i++) {
      const x = VALANCE.x - 200 + i * 26.6;
      const sw = Math.sin(t * 1.2 + i * 0.6) * 2;
      g.fillStyle(dim(QUILT_LAV, 0.25), 1); g.fillEllipse(x + sw, VALANCE.y + 3, 28, 16);
      g.fillStyle(QUILT_LAV, 1); g.fillEllipse(x + sw, VALANCE.y, 26, 14);
      g.fillStyle(BRASS, 1); g.fillCircle(x + sw, VALANCE.y + 8, 2);
    }
  }
  // Down puffing out of the mill chute, tumbling across the town on the breeze; the drum turning.
  if (CHUTE && inView(view, CHUTE.x, CHUTE.y, 400)) {
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.14 + i / 14) % 1;
      const x = CHUTE.x + 24 + ph * 360 + Math.sin(t + i) * 12, y = CHUTE.y + ph * 120 + Math.sin(ph * 9 + i) * 14;
      feather(g, x, y, 3 + (i % 3), t * 2 + i, 0.85 * (1 - ph * 0.6));
    }
  }
  if (DRUM && inView(view, DRUM.x, DRUM.y, 60)) drumSlats(g, DRUM, t * 1.4);
  // Lull's blue lantern, and a little dream rising from his booth.
  if (BOOTH_LAMP && inView(view, BOOTH_LAMP.x, BOOTH_LAMP.y, 80)) {
    glow(g, BOOTH_LAMP.x, BOOTH_LAMP.y, 20, 0x6a8ad8, 0.05 + 0.02 * Math.sin(t * 2), 3);
    const ph = (t * 0.3) % 1;
    g.lineStyle(1.4, DREAM_LIT, 0.6 * (1 - ph)); g.strokeCircle(BOOTH.x, BOOTH.y - 120 - ph * 80, 6 + ph * 4);
  }
  // A pale moon over the Four-Poster's finials, and the odd star coming out over the cliff.
  if (inView(view, MANOR.x + 140, MANOR.y - 340, 200)) moon(g, MANOR.x + 150, MANOR.y - 330, 18, 0.6, 0.3);
  if (view.x < 400) {
    for (let i = 0; i < 6; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
      const sx = 40 + ((i * 53) % 240), sy = view.y + 60 + ((i * 197) % Math.max(1, view.h - 120));
      star(g, sx, sy, 2.5 + tw * 1.5, LAMP_FULL, 0.4 + tw * 0.4, t * 0.2);
    }
  }
  // Mist off the lake.
  if (inView(view, LAKE.x + LAKE.w / 2, LAKE.y + LAKE.h / 2, LAKE.w)) {
    for (let i = 0; i < 6; i++) {
      const x = LAKE.x - 40 + ((t * 10 + i * 130) % (LAKE.w + 80)), y = LAKE.y + 40 + i * 56 + Math.sin(t * 0.3 + i) * 10;
      g.fillStyle(0xe8e4f4, 0.08); g.fillEllipse(x, y, 180, 36);
    }
  }
}

export const SLUMBER_AREA: AreaDef = {
  id: 'slumber',
  isle: 'air',
  court: 'slumber',
  name: 'The Slumber Court',
  subtitle: 'Breathe low, sleep sound, owe nothing',
  w: W,
  h: H,
  bg: TURF_DARK,
  accent: DREAM,
  weather: 'dreams',
  spawn: { x: 2250, y: 806 },
  painter: { ground, pieces: PIECES, animate, animateOver },
  solids: SOLIDS,
  exits: [
    { side: 'e', to: 'galeward', label: 'Hushing Way — to the Galeward Court' },
    { side: 's', to: 'fable', label: 'Nod Lane — to the Fable Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2200, y: 744 } },
    { kind: 'sign', at: { x: 2300, y: 870 }, text: 'THE SLUMBER COURT. Breathe low. Sleep sound. Owe nothing. — by order of His Drowsiness Prince Reverie' },
    { kind: 'sign', at: { x: 700, y: 960 }, text: 'The Long Ward. Becalmed households, by number. Collection after the evening bell. Do not wake the debtors.' },
    { kind: 'sign', at: { x: 1060, y: 600 }, text: 'The Lullaby Belfry. The bell is rung at dusk by order. Felt to be maintained by the Feltmaker.' },
    { kind: 'sign', at: { x: 1060, y: 1130 }, text: 'The Lake of Nod. Fishing by the drowsy permitted. Do not look the pike in the eye.' },
    { kind: 'sign', at: { x: 1690, y: 1000 }, text: 'Lampless Row. Dimming Order in force. Lamps to be hooded at all hours. By the Prince\'s seal.' },
    { kind: 'sign', at: { x: 700, y: 690 }, text: 'The Fold. Dream-sheep. Counted nightly. Please do not distract the shepherd.' },
    { kind: 'sign', at: { x: 1760, y: 590 }, text: 'The Four-Poster. Residence of His Drowsiness. Callers to whisper.' },
    { kind: 'encounter', id: ENC_SHEEP },
    { kind: 'encounter', id: ENC_SLEEPWALK },
    { kind: 'encounter', id: ENC_BAD_DREAM },
    { kind: 'encounter', id: ENC_PILLOW },
    { kind: 'encounter', id: ENC_LULLABY },
    { kind: 'prince', id: 'reverie', at: { x: 1880, y: 540 } },
    { kind: 'water', id: 'slumber-lake-of-nod', shape: LAKE, fishery: FISHERY },
    { kind: 'chest', id: 'slumber-fold-chest', at: { x: 380, y: 330 }, coins: 90, orbs: 1 },
    { kind: 'chest', id: 'slumber-cliff-chest', at: { x: 360, y: 1540 }, coins: 80 },
    { kind: 'chest', id: 'slumber-four-poster-chest', at: { x: 2130, y: 330 }, coins: 130, orbs: 1, open: { prince: 'reverie' } },
  ],
  npcs: SLUMBER_NPCS,
  crowd: {
    count: 12,
    looks: CROWD_LOOKS,
    paths: [
      [{ x: 700, y: 812 }, { x: 1100, y: 814 }, { x: 1400, y: 816 }, { x: 1700, y: 818 }],
      [{ x: 2300, y: 806 }, { x: 2050, y: 810 }, { x: 1760, y: 820 }],
      [{ x: 1200, y: 960 }, { x: 1200, y: 1260 }, { x: 1200, y: 1560 }],
      [{ x: 1200, y: 790 }, { x: 1200, y: 600 }, { x: 1080, y: 540 }, { x: 1320, y: 540 }],
      [{ x: 1730, y: 890 }, { x: 1880, y: 1060 }, { x: 2100, y: 1260 }, { x: 2290, y: 1430 }],
      [{ x: 1200, y: 1300 }, { x: 1360, y: 1330 }, { x: 1470, y: 1336 }],
      [{ x: 1760, y: 820 }, { x: 1820, y: 700 }, { x: 1880, y: 590 }],
      [{ x: 1200, y: 1180 }, { x: 1080, y: 1210 }, { x: 1000, y: 1260 }],
    ],
    barks: CROWD_BARKS,
  },
};
