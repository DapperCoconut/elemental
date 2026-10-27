import type { AreaDef, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, flagstones, glow, groundFill, lit, mixC, pool, road, stroke, brandSigil, type G } from '../../../../art/IsleArt';
import {
  FLAME_MID, HONEY, HONEY_DARK, SEAL_RED, WAX, WAX_SHADE,
  bee, candleHouse, flame, hexPath,
} from './art';
import {
  candleTower, chandlery, citizenEffigy, gateCandle, hiveTower, honeyedWick, jetty, lanternPost,
  royalApiary, sag, skepStand, taperCathedral, titheTaper, workshop,
} from './buildings';
import { CANDLEWICK_NPCS, CROWD_BARKS, CROWD_LOOKS } from './npcs';
import { ENC_BOTH_ENDS, ENC_DRIP, ENC_EFFIGIES, ENC_HIVE, ENC_VIGIL } from './encounters';
import { BEESWAX } from './items';
import { PIP_HOUSE } from './quests';

/**
 * The Candlewick Court — a city of candles.
 *
 * Every house is a giant half-melted candle with a wick that must be kept lit for the King; the
 * streets are pale poured wax with drip-runnels down their middles; the Taper Cathedral raises
 * five tapers for spires; the beehive towers in the north-east make the wax; the chandlers dip
 * on their lane in the south; the wax pond in the south-west keeps everything the court throws
 * away; and in the east stands Prince Tallow's palace, a single colossal candle.
 *
 * Layout (2400×1600): Wick Street runs in from the west gate to Drip Square in the middle;
 * Taper Row runs up from the square to the north gate; the cathedral sits off Taper Row's west
 * side; the apiary lane climbs north-east; the Gilt Road runs east to the palace; Chandlers'
 * Lane runs south and bends east to the effigy yard.
 */

const W = 2400;
const H = 1600;

// ── Streets ──────────────────────────────────────────────────────────

const WICK_STREET: Pt[] = [{ x: -20, y: 800 }, { x: 420, y: 806 }, { x: 820, y: 826 }, { x: 1200, y: 830 }];
const TAPER_ROW: Pt[] = [{ x: 1200, y: -20 }, { x: 1200, y: 830 }];
const NAVE_WALK: Pt[] = [{ x: 1200, y: 560 }, { x: 760, y: 580 }];
const GILT_ROAD: Pt[] = [{ x: 1300, y: 840 }, { x: 1720, y: 900 }, { x: 1880, y: 1080 }, { x: 2080, y: 1110 }];
const APIARY_LANE: Pt[] = [{ x: 1340, y: 790 }, { x: 1640, y: 610 }, { x: 1900, y: 540 }, { x: 2100, y: 600 }];
const CHANDLERS_LANE: Pt[] = [{ x: 1200, y: 830 }, { x: 1200, y: 1300 }, { x: 1700, y: 1300 }];
const POND_PATH: Pt[] = [{ x: 600, y: 826 }, { x: 600, y: 1086 }];
const DROSS_ALLEY: Pt[] = [{ x: 420, y: 806 }, { x: 432, y: 1050 }];

const PLAZA: Rect = { x: 1010, y: 690, w: 380, h: 280 };
const POND: Rect = { x: 330, y: 1130, w: 470, h: 250 };
const NAVE_YARD: Rect = { x: 550, y: 470, w: 420, h: 150 };
const PALACE_YARD: Rect = { x: 1890, y: 1000, w: 340, h: 150 };
const MEADOW: Rect = { x: 1640, y: 160, w: 740, h: 520 };

// ── Houses ───────────────────────────────────────────────────────────

interface HouseSpec { x: number; y: number; w: number; h: number; wax: number; melt: number; lean: number; stub?: boolean; tip?: Pt }

const HOUSES: HouseSpec[] = [
  { x: 300, y: 640, w: 120, h: 190, wax: WAX, melt: 0.35, lean: 5 },
  { x: PIP_HOUSE.x, y: PIP_HOUSE.y, w: 104, h: 160, wax: mixC(WAX, 0xffe0c0, 0.4), melt: 0.6, lean: -12 },
  { x: 180, y: 470, w: 110, h: 200, wax: mixC(WAX, 0xe8f0d8, 0.3), melt: 0.2, lean: 2 },
  { x: 380, y: 420, w: 100, h: 170, wax: mixC(WAX, 0xf0d0d8, 0.3), melt: 0.45, lean: -4 },
  { x: 1030, y: 330, w: 96, h: 170, wax: WAX, melt: 0.3, lean: 6 },
  { x: 1350, y: 380, w: 110, h: 180, wax: mixC(WAX, 0xd8e4f0, 0.35), melt: 0.25, lean: -5 },
  { x: 1560, y: 300, w: 100, h: 160, wax: mixC(WAX, HONEY, 0.15), melt: 0.4, lean: 3 },
  { x: 1380, y: 610, w: 96, h: 140, wax: mixC(WAX, 0xf0d0d8, 0.25), melt: 0.5, lean: 8 },
  { x: 180, y: 1060, w: 110, h: 170, wax: mixC(WAX, 0xe8f0d8, 0.3), melt: 0.3, lean: -6 },
  { x: 200, y: 1520, w: 120, h: 160, wax: WAX, melt: 0.55, lean: 9 },
  { x: 660, y: 1540, w: 100, h: 140, wax: mixC(WAX, 0xd8e4f0, 0.3), melt: 0.2, lean: -3 },
  { x: 930, y: 1480, w: 110, h: 150, wax: mixC(WAX, HONEY, 0.12), melt: 0.35, lean: 4 },
  { x: 1560, y: 1060, w: 100, h: 140, wax: WAX, melt: 0.25, lean: -7 },
  { x: 1460, y: 1550, w: 110, h: 140, wax: mixC(WAX, 0xf0d0d8, 0.3), melt: 0.45, lean: 6 },
  { x: 1900, y: 1430, w: 110, h: 160, wax: mixC(WAX, 0xe8f0d8, 0.25), melt: 0.3, lean: -4 },
  { x: 2200, y: 1470, w: 120, h: 170, wax: WAX, melt: 0.5, lean: 10 },
  { x: 2320, y: 1230, w: 100, h: 150, wax: mixC(WAX, HONEY, 0.15), melt: 0.2, lean: -5 },
  { x: 2300, y: 720, w: 110, h: 170, wax: mixC(WAX, 0xd8e4f0, 0.3), melt: 0.35, lean: 3 },
  // Wickling Dross's alley: a house that has burned almost to its door.
  { x: 330, y: 990, w: 120, h: 72, wax: mixC(WAX, 0x8a7a6a, 0.25), melt: 0.8, lean: 0, stub: true },
];

const WORKSHOPS: Pt[] = [{ x: 1040, y: 1110 }, { x: 1360, y: 1110 }, { x: 1040, y: 1240 }, { x: 1400, y: 1500 }];
const HIVE_TOWERS: [number, number, number][] = [[1840, 380, 3], [2040, 300, 4], [2240, 440, 3]];
const SKEPS: Pt[] = [{ x: 1690, y: 420 }, { x: 1990, y: 460 }, { x: 2130, y: 580 }, { x: 2330, y: 560 }, { x: 1790, y: 250 }];
const EFFIGY_STATUES: [number, number, number][] = [[1570, 1200, 0x3a2a4a], [1770, 1196, 0x7a2a2a], [1790, 1400, 0x2a3a5a], [1560, 1400, 0x4a4a2a]];
const LANTERN_POSTS: Pt[] = [
  { x: 150, y: 742 }, { x: 450, y: 744 }, { x: 760, y: 764 }, { x: 1040, y: 770 },
  { x: 150, y: 868 }, { x: 450, y: 872 }, { x: 760, y: 892 }, { x: 1040, y: 900 },
  { x: 1138, y: 160 }, { x: 1262, y: 160 }, { x: 1138, y: 440 }, { x: 1262, y: 440 },
  { x: 1140, y: 1000 }, { x: 1260, y: 1000 }, { x: 1140, y: 1200 }, { x: 1260, y: 1190 },
];
/** Lantern strings: index pairs into LANTERN_POSTS. */
const STRINGS: [number, number][] = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15]];
const POND_CANDLES: Pt[] = [{ x: 410, y: 1190 }, { x: 520, y: 1260 }, { x: 650, y: 1200 }, { x: 720, y: 1320 }, { x: 460, y: 1340 }, { x: 600, y: 1300 }];

/**
 * Flames lit every frame. Filled in as the pieces bake (each drawer reports its wicks); keyed by
 * position so a re-bake on a later visit relights the same wicks rather than doubling them.
 */
const FLAMES: { p: Pt; s: number; seed: number }[] = [];
const VATS: Pt[] = [];
const OVEN_SMOKE: Pt[] = [];
const seen = new Set<string>();
const once = (tag: string, p: Pt): boolean => {
  const k = `${tag}:${Math.round(p.x)},${Math.round(p.y)}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
};

const addFlame = (p: Pt, s: number): void => { if (once('f', p)) FLAMES.push({ p, s, seed: FLAMES.length * 1.37 }); };

// ── Solids ───────────────────────────────────────────────────────────

const houseSolid = (h: HouseSpec): Solid => ({ kind: 'rect', x: h.x - h.w / 2, y: h.y - Math.min(56, h.w * 0.45), w: h.w, h: Math.min(56, h.w * 0.45) });

const SOLIDS: Solid[] = [
  ...HOUSES.map(houseSolid),
  { kind: 'rect', x: 560, y: 380, w: 400, h: 90 },             // Taper Cathedral
  { kind: 'rect', x: 1945, y: 905, w: 230, h: 95 },            // the candle-tower palace
  { kind: 'rect', x: 825, y: 640, w: 150, h: 50 },             // Cerelle's Chandlery
  { kind: 'rect', x: 1470, y: 740, w: 170, h: 60 },            // The Honeyed Wick (+ oven)
  { kind: 'circle', x: 1200, y: 826, r: 42 },                  // the Tithe Taper
  { kind: 'rect', x: POND.x + 8, y: POND.y + 8, w: POND.w - 16, h: POND.h - 16 },
  ...WORKSHOPS.map((p): Solid => ({ kind: 'rect', x: p.x - 80, y: p.y - 40, w: 160, h: 40 })),
  ...HIVE_TOWERS.map(([x, y]): Solid => ({ kind: 'circle', x, y: y - 8, r: 40 })),
  ...SKEPS.map((p): Solid => ({ kind: 'circle', x: p.x, y: p.y - 4, r: 16 })),
  ...EFFIGY_STATUES.map(([x, y]): Solid => ({ kind: 'circle', x, y: y - 6, r: 18 })),
  { kind: 'circle', x: 1960, y: 1022, r: 18 },                 // gate candles
  { kind: 'circle', x: 2160, y: 1022, r: 18 },
  { kind: 'rect', x: 2246, y: 960, w: 112, h: 40 },            // royal apiary rack
];

// ── Painter ──────────────────────────────────────────────────────────

function runnel(g: G, pts: Pt[]): void {
  stroke(g, pts, 9, 0xb8925a, 0.55);
  stroke(g, pts, 5, mixC(HONEY, WAX, 0.35), 0.85);
  g.lineStyle(1.5, 0xffffff, 0.4);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 1.5);
  for (const p of pts) g.lineTo(p.x, p.y - 1.5);
  g.strokePath();
}

function ground(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, 0xeadbb6, 0xf4e8ca, 0xb89a62, rng, 1.2);

  // The apiary meadow: clover and lavender for the bees.
  for (let i = 0; i < 70; i++) {
    const x = MEADOW.x + rng() * MEADOW.w, y = MEADOW.y + rng() * MEADOW.h;
    blob(g, x, y, 40 + rng() * 60, 22 + rng() * 30, mixC(0x9ab868, 0xc8c890, rng() * 0.5), 0.55, rng);
  }
  for (let i = 0; i < 900; i++) {
    const x = MEADOW.x + rng() * MEADOW.w, y = MEADOW.y + rng() * MEADOW.h;
    g.fillStyle(rng() < 0.5 ? 0xa88ad8 : rng() < 0.5 ? 0xf6f0f0 : 0xf2d24a, 0.85);
    g.fillCircle(x, y, 1.6 + rng() * 1.4);
  }

  // Old spills set into the ground everywhere.
  for (let i = 0; i < 70; i++) {
    const x = rng() * W, y = rng() * H;
    blob(g, x, y, 14 + rng() * 40, 8 + rng() * 20, lit(WAX, 0.15), 0.6, rng);
  }

  // Streets: poured wax, cobbled with set drops, a runnel down every middle.
  const fill = 0xf4ead0, edge = 0xc8ac78, stone = 0xe6d4a8;
  road(g, WICK_STREET, 110, fill, edge, stone, rng);
  road(g, TAPER_ROW, 110, fill, edge, stone, rng);
  road(g, GILT_ROAD, 100, fill, edge, stone, rng);
  road(g, CHANDLERS_LANE, 96, fill, edge, stone, rng);
  road(g, APIARY_LANE, 80, mixC(fill, 0xc8c890, 0.2), edge, stone, rng);
  road(g, NAVE_WALK, 90, fill, edge, stone, rng);
  road(g, POND_PATH, 70, fill, edge, stone, rng);
  road(g, DROSS_ALLEY, 66, mixC(fill, 0x8a7a6a, 0.25), dim(edge, 0.2), stone, rng);

  // Drip Square: a honeycomb pour.
  g.fillStyle(dim(WAX_SHADE, 0.15), 1); g.fillRoundedRect(PLAZA.x - 8, PLAZA.y - 8, PLAZA.w + 16, PLAZA.h + 16, 30);
  const r = 20, dx = r * Math.sqrt(3), dy = r * 1.5;
  for (let row = 0, y = PLAZA.y + r; y < PLAZA.y + PLAZA.h - r * 0.4; row++, y += dy) {
    for (let x = PLAZA.x + r + (row % 2) * (dx / 2); x < PLAZA.x + PLAZA.w - r * 0.5; x += dx) {
      const gold = rng() < 0.12;
      hexPath(g, x, y, r - 1.5, gold ? mixC(HONEY, WAX, 0.4) : mixC(WAX, 0xffffff, rng() * 0.2), 1, dim(WAX_SHADE, 0.2));
    }
  }

  for (const pts of [WICK_STREET, TAPER_ROW, GILT_ROAD, CHANDLERS_LANE, APIARY_LANE]) runnel(g, pts);

  // Runnels from the houses' foot-pools into the street gutters.
  for (const h of HOUSES) {
    const targetY = h.y < 800 ? h.y + 60 : h.y + 40;
    runnel(g, [{ x: h.x + h.w * 0.3, y: h.y + 6 }, { x: h.x + h.w * 0.32 + (rng() - 0.5) * 20, y: targetY }]);
  }

  // Cathedral forecourt and palace yard.
  flagstones(g, NAVE_YARD, 34, 0xf2e6cc, 0xc8b08a, rng);
  flagstones(g, PALACE_YARD, 38, 0xf0dcc0, 0x9a6a4a, rng);
  brandSigil(g, PALACE_YARD.x + PALACE_YARD.w / 2, PALACE_YARD.y + 92, 26, SEAL_RED, 0.55);

  // The wax pond.
  pool(g, POND, 0xd88a26, 0xf2c46a, 0xfbefd0, rng);
  jetty(g, 640, POND.y - 6, 70);

  // Effigy yard: a ring of plinth stones.
  g.lineStyle(5, WAX_SHADE, 0.7); g.strokeEllipse(1670, 1300, 300, 220);

  // Royal apiary ground — a red-sealed square behind the palace.
  g.fillStyle(dim(SEAL_RED, 0.2), 0.25); g.fillRect(2220, 940, 160, 150);
  g.lineStyle(2, SEAL_RED, 0.5); g.strokeRect(2220, 940, 160, 150);
}

const PIECES: NonNullable<AreaDef['painter']['pieces']> = [
  ...HOUSES.map((h) => ({
    x: h.x, y: h.y, w: h.w * 1.6, h: h.h + 60,
    draw: (g: G, rng: () => number) => {
      const tip = candleHouse(g, h.x, h.y, h.w, h.h, { wax: h.wax, melt: h.melt, lean: h.lean, stub: h.stub }, rng);
      // A stub house's flame has gone out — Dross's alley is the one place in the court that's dark.
      if (!h.stub) addFlame(tip, 7 + h.w * 0.03);
    },
  })),
  {
    x: 760, y: 470, w: 460, h: 440,
    draw: (g, rng) => { for (const t of taperCathedral(g, 760, 470, rng)) addFlame(t, 6.5); },
  },
  {
    x: 2060, y: 1000, w: 420, h: 660,
    draw: (g, rng) => { for (const t of candleTower(g, 2060, 1000, rng)) addFlame(t, 26); },
  },
  { x: 900, y: 690, w: 220, h: 200, draw: (g, rng) => { for (const t of chandlery(g, 900, 690, rng)) addFlame(t, 9); } },
  {
    x: 1560, y: 800, w: 260, h: 200,
    draw: (g, rng) => {
      const [tip, chimney] = honeyedWick(g, 1560, 800, rng);
      addFlame(tip, 9);
      if (once('s', chimney)) OVEN_SMOKE.push(chimney);
    },
  },
  ...WORKSHOPS.map((p) => ({ x: p.x, y: p.y, w: 200, h: 150, draw: (g: G, rng: () => number) => { const v = workshop(g, p.x, p.y, rng); if (once('v', v)) VATS.push(v); } })),
  ...HIVE_TOWERS.map(([x, y, n]) => ({ x, y, w: 140, h: n * 54 + 60, draw: (g: G) => { hiveTower(g, x, y, n); } })),
  ...SKEPS.map((p) => ({ x: p.x, y: p.y, w: 50, h: 60, draw: (g: G) => skepStand(g, p.x, p.y) })),
  { x: 1200, y: 834, w: 140, h: 280, draw: (g, rng) => addFlame(titheTaper(g, 1200, 834, rng), 14) },
  ...EFFIGY_STATUES.map(([x, y, hat]) => ({ x, y, w: 50, h: 80, draw: (g: G, rng: () => number) => citizenEffigy(g, x, y, hat, rng) })),
  { x: 1960, y: 1026, w: 60, h: 150, draw: (g, rng) => addFlame(gateCandle(g, 1960, 1026, rng), 8) },
  { x: 2160, y: 1026, w: 60, h: 150, draw: (g, rng) => addFlame(gateCandle(g, 2160, 1026, rng), 8) },
  { x: 2302, y: 1000, w: 130, h: 90, draw: (g) => royalApiary(g, 2302, 1000) },
  ...LANTERN_POSTS.map((p) => ({ x: p.x, y: p.y, w: 20, h: 90, draw: (g: G) => { lanternPost(g, p.x, p.y); } })),
];

const inView = (v: Rect, x: number, y: number, m: number): boolean => x > v.x - m && x < v.x + v.w + m && y > v.y - m && y < v.y + v.h + m;

function animate(g: G, t: number, view: Rect): void {
  // Wax pond: slow glints and a few drowned candles still burning as they bob.
  if (inView(view, POND.x + POND.w / 2, POND.y + POND.h / 2, POND.w)) {
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.15 + i * 0.1) % 1;
      const x = POND.x + 30 + ((i * 97) % (POND.w - 60));
      const y = POND.y + 30 + ((i * 53) % (POND.h - 60));
      g.fillStyle(0xfff0c8, 0.35 * Math.sin(ph * Math.PI));
      g.fillEllipse(x, y, 30 + ph * 20, 4);
    }
    POND_CANDLES.forEach((c, i) => {
      const bob = Math.sin(t * 1.3 + i) * 2;
      g.fillStyle(0xffffff, 0.2); g.fillEllipse(c.x, c.y + 4, 22, 6);
      g.fillStyle(dim(WAX, 0.2), 1); g.fillRect(c.x - 4, c.y - 10 + bob, 8, 12);
      g.fillStyle(WAX, 1); g.fillRect(c.x - 3, c.y - 10 + bob, 5, 12);
      flame(g, c.x, c.y - 12 + bob, 3.5, t, i * 3, 0.05);
    });
  }
  // Vats steaming and glowing in the workshops.
  for (const v of VATS) {
    if (!inView(view, v.x, v.y, 80)) continue;
    glow(g, v.x, v.y, 26, 0xffc24a, 0.05, 3);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.8 + i / 3) % 1;
      g.fillStyle(0xf6d48c, 0.9 * (1 - ph)); g.fillCircle(v.x - 12 + i * 12, v.y + 2 - ph * 3, 2 + ph * 2);
      g.fillStyle(0xe8e0d0, 0.25 * (1 - ph)); g.fillCircle(v.x - 10 + i * 10 + Math.sin(t + i) * 4, v.y - 10 - ph * 40, 5 + ph * 8);
    }
  }
}

function animateOver(g: G, t: number, view: Rect): void {
  // Every wick in the court, alight.
  for (const f of FLAMES) {
    if (!inView(view, f.p.x, f.p.y, 80)) continue;
    flame(g, f.p.x, f.p.y, f.s, t, f.seed, f.s > 20 ? 0.05 : 0.07);
  }
  // The palace flame throws embers.
  const top = FLAMES.find((f) => f.s > 20);
  if (top && inView(view, top.p.x, top.p.y, 200)) {
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.5 + i / 8) % 1;
      g.fillStyle(FLAME_MID, 0.8 * (1 - ph));
      g.fillCircle(top.p.x + Math.sin(t * 2 + i * 1.7) * 26 * ph, top.p.y - 40 - ph * 120, 2.2);
    }
  }
  // Oven smoke from the Honeyed Wick.
  for (const c of OVEN_SMOKE) {
    if (!inView(view, c.x, c.y, 120)) continue;
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.35 + i / 6) % 1;
      g.fillStyle(0xd8d0c8, 0.3 * (1 - ph));
      g.fillCircle(c.x + Math.sin(t + i) * 8 + ph * 26, c.y - ph * 90, 6 + ph * 14);
    }
  }
  // Lantern strings over the streets.
  for (const [ai, bi] of STRINGS) {
    const a = LANTERN_POSTS[ai], b = LANTERN_POSTS[bi];
    if (!inView(view, (a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(a.x - b.x) / 2 + Math.abs(a.y - b.y) / 2 + 100)) continue;
    const A = { x: a.x, y: a.y - 78 }, B = { x: b.x, y: b.y - 78 };
    const pts = sag(A, B, 22, 12);
    g.lineStyle(1.2, 0x3a2a1a, 0.8);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.strokePath();
    for (let k = 2; k < pts.length - 1; k += 3) {
      const sway = Math.sin(t * 1.6 + k + ai) * 2.5;
      const lx = pts[k].x + sway, ly = pts[k].y + 12;
      g.lineStyle(1, 0x3a2a1a, 0.8); g.lineBetween(pts[k].x, pts[k].y, lx, ly - 6);
      const fl = 0.85 + Math.sin(t * 7 + k * 3 + ai) * 0.15;
      g.fillStyle(HONEY, 0.1 * fl); g.fillCircle(lx, ly, 18);
      g.fillStyle(HONEY_DARK, 1); g.fillRect(lx - 4, ly - 8, 8, 2);
      g.fillStyle(mixC(HONEY, 0xffffff, 0.3 * fl), 0.95); g.fillRoundedRect(lx - 5, ly - 6, 10, 13, 4);
      g.fillStyle(HONEY_DARK, 0.6); g.fillRect(lx - 5, ly - 1, 10, 1);
    }
  }
  // Bees about the towers, the skeps and the meadow.
  if (inView(view, MEADOW.x + MEADOW.w / 2, MEADOW.y + MEADOW.h / 2, MEADOW.w)) {
    for (const [x, y, n] of HIVE_TOWERS) {
      for (let i = 0; i < 9; i++) {
        const a = t * (1.2 + (i % 3) * 0.4) + i * 2.3;
        bee(g, x + Math.cos(a) * (40 + (i * 7) % 30), y - n * 30 + Math.sin(a * 1.4) * 40, t, i + x);
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = MEADOW.x + ((i * 173 + t * 30 * ((i % 2) * 2 - 1)) % MEADOW.w + MEADOW.w) % MEADOW.w;
      const y = MEADOW.y + 200 + Math.sin(t * 0.9 + i) * 120 + (i * 37) % 200;
      bee(g, x, y, t, i);
    }
  }
}

export const CANDLEWICK_AREA: AreaDef = {
  id: 'candlewick',
  isle: 'fire',
  court: 'candlewick',
  name: 'The Candlewick Court',
  subtitle: 'Every house burns for the King',
  w: W,
  h: H,
  bg: 0xeadbb6,
  accent: 0xffb347,
  weather: 'wax',
  spawn: { x: 170, y: 800 },
  painter: { ground, pieces: PIECES, animate, animateOver },
  solids: SOLIDS,
  exits: [
    { side: 'n', to: 'corona', label: 'Taper Row — to the Corona Court' },
    { side: 'w', to: 'emberport', label: 'Wick Street — to Emberport' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 232, y: 700 } },
    { kind: 'sign', at: { x: 120, y: 700 }, text: 'CANDLEWICK. Keep it burning. Not too fast, not too slow. — by order of the Inchwardens' },
    { kind: 'sign', at: { x: 1300, y: 990 }, text: 'Chandlers\' Lane. Mind the racks. Mind the vats. Mind the Chandler.' },
    { kind: 'sign', at: { x: 1300, y: 690 }, text: 'Drip Square. The Tithe Taper burns for His Majesty. Do not touch. Do not breathe on.' },
    { kind: 'encounter', id: ENC_DRIP },
    { kind: 'encounter', id: ENC_VIGIL },
    { kind: 'encounter', id: ENC_HIVE },
    { kind: 'encounter', id: ENC_BOTH_ENDS },
    { kind: 'encounter', id: ENC_EFFIGIES },
    { kind: 'prince', id: 'tallow', at: { x: 2060, y: 1090 } },
    { kind: 'water', id: 'candlewick-waxpond', shape: POND, fishery: 'candlewick-waxpond' },
    { kind: 'chest', id: 'candlewick-belfry-chest', at: { x: 2330, y: 200 }, coins: 90, orbs: 1 },
    { kind: 'chest', id: 'candlewick-pondside-chest', at: { x: 250, y: 1420 }, coins: 40, item: BEESWAX },
  ],
  npcs: CANDLEWICK_NPCS,
  crowd: {
    count: 10,
    looks: CROWD_LOOKS,
    paths: [
      [{ x: 160, y: 800 }, { x: 600, y: 818 }, { x: 1050, y: 832 }, { x: 1130, y: 760 }, { x: 1180, y: 600 }, { x: 1180, y: 150 }],
      [{ x: 1250, y: 900 }, { x: 1222, y: 1000 }, { x: 1222, y: 1290 }, { x: 1620, y: 1300 }],
      [{ x: 1300, y: 872 }, { x: 1720, y: 900 }, { x: 1880, y: 1080 }, { x: 2100, y: 1124 }],
      [{ x: 560, y: 840 }, { x: 600, y: 1060 }],
      [{ x: 1380, y: 770 }, { x: 1640, y: 612 }, { x: 1900, y: 540 }, { x: 2090, y: 640 }],
      [{ x: 1180, y: 560 }, { x: 800, y: 590 }],
    ],
    barks: CROWD_BARKS,
  },
};
