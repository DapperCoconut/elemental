import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { dim, glow, groundFill, mixC, mulberry, road, shadow, type G } from '../../../../art/IsleArt';
import {
  ANTLER, ANTLER_DARK, BARK, BARK_DARK, BLOOD, ENDGRAIN, FOAM, FUR, GILT, GRASS, GRASS_LIT, GRAVEL,
  HUNT_GREEN, HUNT_RED, HUNT_RED_LIT, LEAF_GOLD, LEAF_GREEN, LOAM, LOAM_LIT, MOSS, MOSS_DARK, MOSS_LIT, RIVER,
  RIVER_DEEP, RIVER_LIT, SHINGLE, SUN, TIMBER, TIMBER_DARK, TIMBER_LIT, VERDIGRIS, antler, antlerPair, bigTree, dist,
  falcon, fernClump, gardenersMark, hound, huntingHorn, inView, leafLitter, logEnd, logWall, noise, segDist,
  shingleRoof, stag,
} from './util';

/**
 * The Wildhunt Court, painted. A lodge town in the deep forest of Thornwild's south-east, where
 * Prince Fang keeps the Empress's chase — and where the families who come up short at the Bloom
 * Tithe are penned, capped with antlers, and loosed into the deer park as quarry.
 *
 * Reading order: the antler gate on the west road from Mossgate; the Antler & Awl and the hunters'
 * cottages; the Long Hall with its trophy gable and its plaza of log-ends; the north road climbing
 * past Halloo's horn tower to the Ossuary; the Game Larder where the tithe in meat is weighed; the
 * kennels and their run; the Quarry Pens; the paled deer park with its high seat; the river running
 * north to south down the east third, crossed only at the Ford, with the salmon pool below it and
 * the reedbed below that; and, over the water, Fangholt — the Prince's lodge — the mews, and the
 * Empress's own gilded hunting stand.
 *
 * Every layout constant is also read by `area.ts` for solids, so a wall drawn is a wall you walk into.
 */

// ── Layout (world px) ───────────────────────────────────────────────

export const AREA_W = 2400;
export const AREA_H = 1600;

/** The river's centreline, north to south. */
const RIVER_PTS: Pt[] = [
  { x: 1720, y: -20 }, { x: 1690, y: 240 }, { x: 1745, y: 500 }, { x: 1705, y: 740 }, { x: 1720, y: 900 },
  { x: 1790, y: 1140 }, { x: 1835, y: 1380 }, { x: 1865, y: 1620 },
];
/** The Ford: the shallows between these y's are walkable. */
export const FORD_Y0 = 765;
export const FORD_Y1 = 895;
export const POOL_Y = 1215;

export function riverX(y: number): number {
  for (let i = 0; i < RIVER_PTS.length - 1; i++) {
    const a = RIVER_PTS[i], b = RIVER_PTS[i + 1];
    if (y >= a.y && y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
  }
  return RIVER_PTS[RIVER_PTS.length - 1].x;
}
/** Half-width of the water: wider through the ford's shallows and the salmon pool. */
export function riverHW(y: number): number {
  const pool = Math.max(0, 1 - Math.abs(y - POOL_Y) / 110);
  const ford = Math.max(0, 1 - Math.abs(y - (FORD_Y0 + FORD_Y1) / 2) / 110);
  return 56 + pool * 40 + ford * 30;
}
export const FISH_WATER: Rect = { x: riverX(POOL_Y) - 72, y: POOL_Y - 85, w: 144, h: 170 };

export const ROADS: Pt[][] = [
  // West road from Mossgate, across the Ford, up to Fangholt.
  [{ x: -20, y: 800 }, { x: 260, y: 805 }, { x: 520, y: 792 }, { x: 820, y: 790 }, { x: 1100, y: 796 }, { x: 1380, y: 815 }, { x: 1600, y: 830 }, { x: 1720, y: 830 }, { x: 1860, y: 820 }, { x: 2000, y: 760 }, { x: 2110, y: 660 }],
  // North road to the Ossuary.
  [{ x: 1200, y: -20 }, { x: 1205, y: 250 }, { x: 1180, y: 520 }, { x: 1150, y: 700 }, { x: 1120, y: 796 }],
  // Down to the deer-park gate.
  [{ x: 1100, y: 800 }, { x: 1080, y: 960 }, { x: 1060, y: 1130 }],
  // Cottage lane.
  [{ x: 520, y: 795 }, { x: 480, y: 960 }, { x: 430, y: 1130 }, { x: 420, y: 1300 }],
  // East bank: to the mews and the Empress's stand.
  [{ x: 1860, y: 820 }, { x: 1980, y: 960 }, { x: 2080, y: 1070 }, { x: 2190, y: 1210 }, { x: 2230, y: 1360 }],
  // The reed path down the west bank.
  [{ x: 1380, y: 815 }, { x: 1490, y: 1040 }, { x: 1590, y: 1300 }, { x: 1640, y: 1430 }],
];
const ROAD_W = 66;

export const LONG_HALL: Pt = { x: 860, y: 600 };
export const LONG_HALL_W = 440;
export const SHOP: Pt = { x: 400, y: 700 };
export const LARDER: Pt = { x: 1390, y: 720 };
export const HORN_TOWER: Pt = { x: 1400, y: 330 };
export const COTTAGES: Pt[] = [{ x: 240, y: 1050 }, { x: 230, y: 1340 }, { x: 640, y: 1250 }];
export const KENNELS: Pt = { x: 700, y: 1000 };
/** The kennel run in front of the kennels — fenced, hounds inside. */
export const KENNEL_RUN: Rect = { x: 590, y: 1004, w: 220, h: 72 };
export const PENS: Rect = { x: 1250, y: 960, w: 200, h: 100 };
export const PARK = { x: 1060, y: 1345, rx: 330, ry: 190 };
/** Angle of the park gate in the paling (straight up). */
const PARK_GATE_A = -Math.PI / 2;
const PARK_GATE_HALF = 0.2;
export const HIGH_SEAT: Pt = { x: 1260, y: 1400 };
export const LODGE: Pt = { x: 2110, y: 600 };
export const LODGE_W = 440;
export const MEWS: Pt = { x: 2240, y: 960 };
export const ROYAL_STAND: Pt = { x: 2270, y: 1330 };
export const GRIMBLE_HUT: Pt = { x: 430, y: 410 };
export const REEDBED: Rect = { x: 1560, y: 1330, w: 190, h: 240 };
/** West gate posts (antler arch over the Mossgate road). */
export const WEST_GATE: Pt[] = [{ x: 150, y: 728 }, { x: 150, y: 874 }];
/** North gate posts (bone-and-antler markers on the Ossuary road). */
export const NORTH_GATE: Pt[] = [{ x: 1120, y: 150 }, { x: 1290, y: 150 }];

/** Paling posts round the deer park, with the gate left open. */
export const PALING: Pt[] = (() => {
  const out: Pt[] = [];
  const n = 72;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let da = a - PARK_GATE_A;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) < PARK_GATE_HALF) continue;
    out.push({ x: PARK.x + Math.cos(a) * PARK.rx, y: PARK.y + Math.sin(a) * PARK.ry });
  }
  return out;
})();

/** Places trees must keep clear of: NPCs, champions, POIs. Filled by area.ts's points. */
const KEEP_CLEAR: Pt[] = [
  { x: 420, y: 735 }, { x: 1200, y: 1095 }, { x: 700, y: 1110 }, { x: 470, y: 450 }, { x: 1650, y: 1060 },
  { x: 1310, y: 770 }, { x: 1000, y: 1115 }, { x: 860, y: 650 }, { x: 1560, y: 905 }, { x: 1640, y: 1400 },
  { x: 1290, y: 380 }, { x: 2040, y: 1085 }, { x: 210, y: 900 }, { x: 2110, y: 660 }, { x: 2200, y: 1400 },
  { x: 1240, y: 1100 }, { x: 2330, y: 1180 }, { x: 70, y: 1500 }, { x: 260, y: 735 }, { x: 1580, y: 760 },
  { x: 1260, y: 205 }, { x: 1210, y: 1100 }, { x: 2050, y: 1230 },
  // Quest spots: comfrey, duel foes.
  { x: 150, y: 1190 }, { x: 380, y: 1430 }, { x: 640, y: 1420 }, { x: 1600, y: 960 }, { x: 560, y: 1140 }, { x: 1390, y: 1130 },
];

/** Keep-out rects (buildings and their forecourts). */
const BUILT: Rect[] = [
  { x: LONG_HALL.x - 290, y: LONG_HALL.y - 260, w: 580, h: 380 },
  { x: SHOP.x - 150, y: SHOP.y - 200, w: 300, h: 260 },
  { x: LARDER.x - 130, y: LARDER.y - 180, w: 260, h: 220 },
  { x: HORN_TOWER.x - 80, y: HORN_TOWER.y - 280, w: 160, h: 320 },
  { x: KENNELS.x - 170, y: KENNELS.y - 160, w: 340, h: 290 },
  { x: PENS.x - 60, y: PENS.y - 120, w: PENS.w + 120, h: PENS.h + 190 },
  { x: LODGE.x - 290, y: LODGE.y - 340, w: 580, h: 420 },
  { x: MEWS.x - 150, y: MEWS.y - 190, w: 300, h: 260 },
  { x: ROYAL_STAND.x - 110, y: ROYAL_STAND.y - 260, w: 220, h: 330 },
  { x: GRIMBLE_HUT.x - 110, y: GRIMBLE_HUT.y - 130, w: 220, h: 200 },
  { x: REEDBED.x - 30, y: REEDBED.y - 30, w: REEDBED.w + 60, h: REEDBED.h + 60 },
  ...COTTAGES.map((c) => ({ x: c.x - 130, y: c.y - 170, w: 260, h: 240 })),
];

export interface TreeSpot { x: number; y: number; s: number; kind: 'oak' | 'pine' }

/** The forest: a deterministic scatter, thick at the edges, thinned away from every road and roof. */
export const TREES: TreeSpot[] = (() => {
  const rng = mulberry(9182);
  const out: TreeSpot[] = [];
  const ok = (x: number, y: number, r: number): boolean => {
    if (x < 30 || x > AREA_W - 30 || y < 40 || y > AREA_H - 10) return false;
    // Exit strips.
    if (x < 260 && Math.abs(y - 800) < 150) return false;
    if (y < 260 && Math.abs(x - 1205) < 150) return false;
    for (const rd of ROADS) for (let i = 0; i < rd.length - 1; i++) if (segDist(x, y, rd[i].x, rd[i].y, rd[i + 1].x, rd[i + 1].y) < ROAD_W / 2 + r + 26) return false;
    if (Math.abs(x - riverX(y)) < riverHW(y) + r + 34) return false;
    const ex = (x - PARK.x) / (PARK.rx + r + 50), ey = (y - PARK.y) / (PARK.ry + r + 50);
    if (ex * ex + ey * ey < 1) return false;
    for (const b of BUILT) if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return false;
    for (const k of KEEP_CLEAR) if (dist(x, y, k.x, k.y) < 110 + r) return false;
    for (const t of out) if (dist(x, y, t.x, t.y) < (t.s + r) * 0.75 + 30) return false;
    return true;
  };
  for (let i = 0; i < 1400 && out.length < 120; i++) {
    // Edge-weighted: most tries fall near the border.
    const edge = rng() < 0.6;
    let x = rng() * AREA_W, y = rng() * AREA_H;
    if (edge) {
      const side = Math.floor(rng() * 4);
      if (side === 0) y = 40 + rng() * 150; else if (side === 1) y = AREA_H - 20 - rng() * 120;
      else if (side === 2) x = 40 + rng() * 140; else x = AREA_W - 40 - rng() * 140;
    }
    const s = 34 + rng() * 26;
    if (ok(x, y, s * 0.3)) out.push({ x, y, s, kind: rng() < 0.55 ? 'oak' : 'pine' });
  }
  return out;
})();

// ── Ground ──────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: AREA_W, h: AREA_H }, LOAM, MOSS_DARK, LOAM_LIT, rng, 1.2);
  for (let i = 0; i < 160; i++) {
    g.fillStyle(rng() < 0.5 ? MOSS : MOSS_DARK, 0.35 + rng() * 0.3);
    g.fillEllipse(rng() * AREA_W, rng() * AREA_H, 40 + rng() * 140, 16 + rng() * 50);
  }
  leafLitter(g, { x: 0, y: 0, w: AREA_W, h: AREA_H }, rng, 2600, 0.6);

  // The deer park: cropped meadow inside the paling.
  g.fillStyle(GRASS, 1); g.fillEllipse(PARK.x, PARK.y, PARK.rx * 2, PARK.ry * 2);
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng());
    g.fillStyle(rng() < 0.5 ? GRASS_LIT : dim(GRASS, 0.2), 0.3);
    g.fillEllipse(PARK.x + Math.cos(a) * r * PARK.rx * 0.9, PARK.y + Math.sin(a) * r * PARK.ry * 0.9, 30 + rng() * 70, 10 + rng() * 20);
  }
  for (let i = 0; i < 900; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.96;
    const x = PARK.x + Math.cos(a) * r * PARK.rx, y = PARK.y + Math.sin(a) * r * PARK.ry;
    g.lineStyle(1, rng() < 0.5 ? GRASS_LIT : 0x3a5a22, 0.5); g.lineBetween(x, y, x + (rng() - 0.5) * 3, y - 4);
  }
  // A trodden "quarry run" track looping round inside the paling — the way they are driven.
  g.lineStyle(14, LOAM, 0.45); g.strokeEllipse(PARK.x, PARK.y, PARK.rx * 1.6, PARK.ry * 1.55);

  // Roads: packed loam, cart ruts and hoofprints.
  for (const rd of ROADS) road(g, rd, ROAD_W, 0x4a3a26, 0x2a1e12, 0x6a5638, rng);
  for (const rd of ROADS) {
    for (let i = 0; i < rd.length - 1; i++) {
      const a = rd[i], b = rd[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      g.lineStyle(2, 0x2a1e12, 0.4);
      g.lineBetween(a.x - uy * 14, a.y + ux * 14, b.x - uy * 14, b.y + ux * 14);
      g.lineBetween(a.x + uy * 14, a.y - ux * 14, b.x + uy * 14, b.y - ux * 14);
      for (let d = 0; d < len; d += 38) {
        const off = (rng() - 0.5) * 30;
        g.fillStyle(0x1a140c, 0.4);
        const x = a.x + ux * d - uy * off, y = a.y + uy * d + ux * off;
        const an = Math.atan2(uy, ux);
        g.fillEllipse(x, y, 5, 3); g.fillEllipse(x + Math.cos(an + 0.4) * 4, y + Math.sin(an + 0.4) * 4, 5, 3);
      }
    }
  }

  // The Long Hall's plaza: a pavement of log-ends set in the earth.
  for (let y = LONG_HALL.y + 8; y < LONG_HALL.y + 120; y += 17) {
    for (let x = LONG_HALL.x - 200 + ((y / 17) % 2) * 8; x < LONG_HALL.x + 200; x += 17) {
      if (Math.hypot((x - LONG_HALL.x) / 220, (y - LONG_HALL.y - 40) / 90) > 1) continue;
      logEnd(g, x + (rng() - 0.5) * 2, y, 7 + rng() * 1.5, 0.95);
    }
  }
  // Fangholt's forecourt: the same, but each log-end branded with the Gardener's mark at the centre.
  for (let y = LODGE.y + 8; y < LODGE.y + 110; y += 17) {
    for (let x = LODGE.x - 180 + ((y / 17) % 2) * 8; x < LODGE.x + 180; x += 17) {
      if (Math.hypot((x - LODGE.x) / 200, (y - LODGE.y - 40) / 80) > 1) continue;
      logEnd(g, x, y, 7.5, 0.95);
    }
  }
  gardenersMark(g, LODGE.x, LODGE.y + 50, 22, BLOOD, 0.55);

  // Gravel banks and the river.
  for (let y = -10; y < AREA_H + 10; y += 6) {
    const cx = riverX(y), hw = riverHW(y);
    g.fillStyle(GRAVEL, 1); g.fillRect(cx - hw - 18, y, (hw + 18) * 2, 7);
  }
  for (let y = -10; y < AREA_H + 10; y += 5) {
    const cx = riverX(y), hw = riverHW(y);
    const shallow = y > FORD_Y0 && y < FORD_Y1;
    g.fillStyle(shallow ? mixC(RIVER, GRAVEL, 0.35) : RIVER, 1); g.fillRect(cx - hw, y, hw * 2, 6);
    if (!shallow) { g.fillStyle(RIVER_DEEP, 0.7); g.fillRect(cx - hw * 0.5, y, hw, 6); }
  }
  // Pebbles on the bars and through the ford.
  for (let i = 0; i < 700; i++) {
    const y = rng() * AREA_H, cx = riverX(y), hw = riverHW(y);
    const shallow = y > FORD_Y0 && y < FORD_Y1;
    const x = shallow ? cx + (rng() - 0.5) * hw * 2 : cx + (rng() < 0.5 ? -1 : 1) * (hw + 4 + rng() * 12);
    g.fillStyle(rng() < 0.5 ? 0xa89a82 : 0x6a5e4c, 0.8); g.fillEllipse(x, y, 4 + rng() * 5, 3 + rng() * 3);
  }
  // Stepping stones across the Ford.
  for (let k = 0; k < 6; k++) {
    const y = 812 + (k % 2) * 34;
    const x = riverX(y) - riverHW(y) + 24 + k * ((riverHW(y) * 2 - 48) / 5);
    shadow(g, x + 2, y + 5, 34, 12, 0.3);
    g.fillStyle(0x7a7468, 1); g.fillEllipse(x, y, 30, 18);
    g.fillStyle(0xa8a296, 1); g.fillEllipse(x - 3, y - 4, 16, 6);
    g.fillStyle(MOSS, 0.7); g.fillEllipse(x + 6, y + 3, 10, 4);
  }

  // The reedbed below the pool: mud and reed stools.
  g.fillStyle(0x3a3420, 0.9); g.fillEllipse(REEDBED.x + REEDBED.w / 2, REEDBED.y + REEDBED.h / 2, REEDBED.w * 1.1, REEDBED.h);
  for (let i = 0; i < 140; i++) {
    const x = REEDBED.x + rng() * REEDBED.w, y = REEDBED.y + rng() * REEDBED.h;
    if (Math.hypot((x - REEDBED.x - REEDBED.w / 2) / (REEDBED.w * 0.55), (y - REEDBED.y - REEDBED.h / 2) / (REEDBED.h * 0.5)) > 1) continue;
    g.lineStyle(2, rng() < 0.5 ? 0xb8a860 : 0x8a7e3e, 0.9); g.lineBetween(x, y, x + (rng() - 0.5) * 6, y - 16 - rng() * 10);
  }

  // The kennel run: trampled earth, a water trough, scattered bones.
  const kr = KENNEL_RUN;
  g.fillStyle(0x3a2c1a, 1); g.fillRect(kr.x, kr.y, kr.w, kr.h);
  for (let i = 0; i < 30; i++) { g.fillStyle(0x1a140c, 0.4); g.fillEllipse(kr.x + rng() * kr.w, kr.y + rng() * kr.h, 5, 3); }
  for (let i = 0; i < 5; i++) { const x = kr.x + 20 + rng() * (kr.w - 40), y = kr.y + 14 + rng() * (kr.h - 28); g.lineStyle(3, ANTLER, 0.8); g.lineBetween(x - 5, y, x + 5, y - 2); }

  // Pens: churned mud, and the bare earth where people sit.
  g.fillStyle(0x2e2416, 1); g.fillRect(PENS.x, PENS.y, PENS.w, PENS.h);

  // Undergrowth.
  for (let i = 0; i < 260; i++) {
    const x = rng() * AREA_W, y = rng() * AREA_H;
    if (Math.abs(x - riverX(y)) < riverHW(y) + 30) continue;
    let onRoad = false;
    for (const rd of ROADS) for (let k = 0; k < rd.length - 1; k++) if (segDist(x, y, rd[k].x, rd[k].y, rd[k + 1].x, rd[k + 1].y) < ROAD_W / 2 + 10) onRoad = true;
    if (onRoad) continue;
    const ex = (x - PARK.x) / PARK.rx, ey = (y - PARK.y) / PARK.ry;
    if (ex * ex + ey * ey < 1) continue;
    fernClump(g, x, y, 12 + rng() * 10, rng);
  }
  // Roots of every tree spread on the ground.
  for (const t of TREES) {
    g.fillStyle(MOSS, 0.5); g.fillEllipse(t.x, t.y + 4, t.s * 2, t.s * 0.6);
  }
}

// ── Set pieces ──────────────────────────────────────────────────────

function longHall(g: G, rng: () => number): void {
  const { x, y } = LONG_HALL;
  const w = LONG_HALL_W, h = 130;
  shadow(g, x, y + 6, w * 1.15, 40, 0.42);
  // Stone footing.
  g.fillStyle(0x4a4a44, 1); g.fillRect(x - w / 2 - 8, y - 16, w + 16, 18);
  for (let k = 0; k < 18; k++) { g.fillStyle(rng() < 0.5 ? 0x5a5a52 : 0x6a6a60, 1); g.fillRoundedRect(x - w / 2 - 6 + k * ((w + 12) / 18), y - 14, (w + 12) / 18 - 3, 13, 3); }
  logWall(g, { x: x - w / 2, y: y - 16 - h, w, h }, rng, 15);
  shingleRoof(g, x, y - 16 - h, w, 150, rng, 26);
  // The gable ends: carved bargeboards crossing into antlers at the peak.
  const py = y - 16 - h - 150;
  antlerPair(g, x, py + 6, 60, ANTLER, 1);
  // A row of trophy antlers along the wall under the eaves.
  for (let k = 0; k < 7; k++) {
    const ax = x - w / 2 + 34 + k * ((w - 68) / 6);
    if (Math.abs(ax - x) < 50) continue;
    g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(ax - 9, y - h - 4, 18, 14, 4);
    antlerPair(g, ax, y - h - 4, 20, k % 2 ? ANTLER : ANTLER_DARK, 1, true);
  }
  // Great doors: two leaves of oak under a carved lintel, iron straps, door-posts carved with hounds.
  const dw = 70, dh = 86;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - dw / 2 - 12, y - 16 - dh - 14, dw + 24, dh + 14);
  g.fillStyle(0x2a1a0e, 1); g.fillRect(x - dw / 2, y - 16 - dh, dw, dh);
  g.fillStyle(0x5a3a22, 1); g.fillRect(x - dw / 2 + 3, y - 16 - dh + 3, dw / 2 - 5, dh - 3); g.fillRect(x + 2, y - 16 - dh + 3, dw / 2 - 5, dh - 3);
  g.fillStyle(0x2a2a2a, 1);
  for (const yy of [0.25, 0.7]) { g.fillRect(x - dw / 2 + 3, y - 16 - dh + dh * yy, dw - 6, 4); }
  g.fillStyle(GILT, 1); g.fillCircle(x - 6, y - 60, 3); g.fillCircle(x + 6, y - 60, 3);
  for (const side of [-1, 1]) {
    const px = x + side * (dw / 2 + 6);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(px - 6, y - 16 - dh - 10, 12, dh + 10);
    for (let k = 0; k < 4; k++) { g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(px, y - 16 - dh + 8 + k * 20, 8, 5); }
  }
  // Windows: shuttered, glowing.
  for (const wx of [x - 150, x - 90, x + 90, x + 150]) {
    g.fillStyle(0xffb860, 0.12); g.fillCircle(wx, y - 90, 22);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 13, y - 104, 26, 26);
    g.fillStyle(0xffc070, 0.9); g.fillRect(wx - 10, y - 101, 20, 20);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 1, y - 101, 2, 20);
    g.fillStyle(HUNT_RED, 1); g.fillRect(wx - 20, y - 104, 7, 26); g.fillRect(wx + 13, y - 104, 7, 26);
  }
  // Oxblood banners from the eaves, the Prince's wolf-head on each.
  for (const bx of [x - 205, x + 205]) {
    g.fillStyle(dim(HUNT_RED, 0.3), 1); g.fillRect(bx - 14, y - h - 6, 28, 76);
    g.fillStyle(HUNT_RED, 1); g.fillRect(bx - 12, y - h - 6, 24, 72);
    g.fillTriangle(bx - 12, y - h + 66, bx + 12, y - h + 66, bx, y - h + 80);
    wolfHead(g, bx, y - h + 30, 9, ANTLER);
  }
  // Braziers either side of the doors (flames in animateOver).
  for (const side of [-1, 1]) {
    const bx = x + side * 70, by = y + 30;
    shadow(g, bx, by, 26, 8);
    g.lineStyle(3, 0x2a2a2a, 1); g.lineBetween(bx - 9, by, bx, by - 22); g.lineBetween(bx + 9, by, bx, by - 22);
    g.fillStyle(0x3a3a38, 1); g.fillEllipse(bx, by - 24, 26, 10);
    g.fillStyle(0xff8a3a, 0.9); g.fillEllipse(bx, by - 26, 18, 5);
  }
}

/** The Prince's sigil, on banners and gateposts: a wolf's head, ears up, fangs bared. */
export function wolfHead(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillTriangle(x - r * 0.9, y - r * 0.2, x - r * 0.5, y - r * 1.2, x - r * 0.1, y - r * 0.5);
  g.fillTriangle(x + r * 0.9, y - r * 0.2, x + r * 0.5, y - r * 1.2, x + r * 0.1, y - r * 0.5);
  g.fillEllipse(x, y, r * 1.8, r * 1.4);
  g.fillTriangle(x - r * 0.5, y + r * 0.2, x + r * 0.5, y + r * 0.2, x, y + r * 1.2);
  g.fillStyle(dim(color, 0.7), a);
  g.fillCircle(x - r * 0.35, y - r * 0.1, r * 0.14); g.fillCircle(x + r * 0.35, y - r * 0.1, r * 0.14);
  g.fillTriangle(x - r * 0.25, y + r * 0.55, x - r * 0.1, y + r * 0.55, x - r * 0.18, y + r * 0.85);
  g.fillTriangle(x + r * 0.25, y + r * 0.55, x + r * 0.1, y + r * 0.55, x + r * 0.18, y + r * 0.85);
}

function shop(g: G, rng: () => number): void {
  const { x, y } = SHOP;
  const w = 200, h = 90;
  shadow(g, x, y + 4, w * 1.2, 26);
  logWall(g, { x: x - w / 2, y: y - h, w, h }, rng, 13);
  shingleRoof(g, x, y - h, w, 88, rng, 16);
  // Door and a counter-shutter propped open, pelts hanging inside.
  g.fillStyle(0x2a1a0e, 1); g.fillRect(x + 30, y - 58, 34, 58);
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x + 33, y - 55, 28, 55);
  g.fillStyle(0x1a120a, 1); g.fillRect(x - 76, y - 70, 78, 40);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? FUR : 0xb08a62, 1); g.fillEllipse(x - 64 + k * 18, y - 52, 14, 30); }
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 80, y - 32, 86, 6);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 80, y - 70, x - 92, y - 96); g.lineBetween(x + 6, y - 70, x + 18, y - 96);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 92, y - 100, 112, 8);
  // Hanging sign: an antler crossed with an awl.
  g.lineStyle(2, 0x2a2a2a, 1); g.lineBetween(x - w / 2 + 6, y - h + 10, x - w / 2 - 30, y - h + 10);
  g.lineBetween(x - w / 2 - 20, y - h + 10, x - w / 2 - 20, y - h + 20); g.lineBetween(x - w / 2 - 44, y - h + 10, x - w / 2 - 44, y - h + 20);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - w / 2 - 54, y - h + 20, 46, 32, 4);
  g.fillStyle(0xb08a5a, 1); g.fillRoundedRect(x - w / 2 - 52, y - h + 22, 42, 28, 3);
  antlerPair(g, x - w / 2 - 31, y - h + 44, 11, ANTLER_DARK, 1, false);
  g.lineStyle(2, 0x5a5a58, 1); g.lineBetween(x - w / 2 - 44, y - h + 46, x - w / 2 - 18, y - h + 26);
  // A deer hide stretched on a willow hoop by the door.
  const hx = x + 120, hy = y - 4;
  shadow(g, hx, hy, 50, 10);
  g.lineStyle(3, 0x8a7a4a, 1); g.strokeCircle(hx, hy - 46, 30);
  g.lineStyle(2, 0x6a5a3a, 1); g.lineBetween(hx - 18, hy, hx - 10, hy - 20); g.lineBetween(hx + 18, hy, hx + 10, hy - 20);
  g.fillStyle(0xb08a5a, 1); g.fillEllipse(hx, hy - 46, 40, 46);
  g.fillStyle(0x8a6a44, 1); g.fillEllipse(hx, hy - 46, 18, 34);
  g.lineStyle(1, 0x6a5a3a, 1);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.lineBetween(hx + Math.cos(a) * 19, hy - 46 + Math.sin(a) * 22, hx + Math.cos(a) * 30, hy - 46 + Math.sin(a) * 30); }
}

function larder(g: G): void {
  const { x, y } = LARDER;
  shadow(g, x, y + 4, 230, 26);
  // A gallows-frame of two great posts and a beam, with game hung on hooks.
  for (const px of [x - 96, x + 96]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 9, y - 150, 18, 150);
    g.fillStyle(TIMBER, 1); g.fillRect(px - 7, y - 150, 14, 150);
    g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(px - 5, y - 150, 3, 150);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 116, y - 162, 232, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 114, y - 160, 228, 13);
  logEnd(g, x - 116, y - 153, 8); logEnd(g, x + 116, y - 153, 8);
  // Hung game — a brace of hares, pheasants, a haunch; the static half, they sway in `animate`.
  // The steelyard: a beam scale with the Gardener's mark on its weight.
  g.lineStyle(3, 0x3a3a3a, 1); g.lineBetween(x, y - 147, x, y - 120);
  g.lineStyle(4, 0x5a5a5a, 1); g.lineBetween(x - 50, y - 116, x + 40, y - 124);
  g.lineStyle(1.5, 0x3a3a3a, 1); g.lineBetween(x - 50, y - 116, x - 58, y - 84); g.lineBetween(x - 50, y - 116, x - 42, y - 84);
  g.fillStyle(0x6a6a68, 1); g.fillEllipse(x - 50, y - 84, 30, 8);
  g.fillStyle(0x4a4a48, 1); g.fillCircle(x + 32, y - 110, 9);
  gardenersMark(g, x + 32, y - 110, 6, GILT, 1);
  // The tally board leaning on a post: households, and the marks against them.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 60, y + 2, 60, 10);
  g.fillStyle(0x8a6a42, 1); g.fillRect(x + 36, y - 66, 50, 66);
  g.fillStyle(0xb8966a, 1); g.fillRect(x + 39, y - 63, 44, 60);
  for (let k = 0; k < 8; k++) {
    g.fillStyle(0x3a2a1a, 0.8); g.fillRect(x + 43, y - 58 + k * 7, 18, 2);
    const marks = (k * 7) % 5;
    for (let m = 0; m < marks; m++) { g.fillStyle(m === 4 ? BLOOD : 0x3a2a1a, 1); g.fillRect(x + 64 + m * 4, y - 60 + k * 7, 1.5, 5); }
  }
  // A chopping block and cleaver.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x - 60, y + 2, 40, 10);
  g.fillStyle(BARK, 1); g.fillRect(x - 76, y - 24, 32, 24);
  logEnd(g, x - 60, y - 24, 16);
  g.fillStyle(BLOOD, 0.5); g.fillEllipse(x - 56, y - 24, 12, 5);
  g.fillStyle(0x8a8e90, 1); g.fillRect(x - 66, y - 40, 14, 10);
  g.lineStyle(3, 0x5a3a22, 1); g.lineBetween(x - 52, y - 35, x - 40, y - 46);
}

function hornTower(g: G, rng: () => number): void {
  const { x, y } = HORN_TOWER;
  shadow(g, x, y + 4, 110, 22);
  const legs = [-36, -14, 14, 36];
  for (const l of legs) {
    g.lineStyle(9, TIMBER_DARK, 1); g.lineBetween(x + l, y, x + l * 0.6, y - 190);
    g.lineStyle(6, TIMBER, 1); g.lineBetween(x + l, y, x + l * 0.6, y - 190);
  }
  // Cross braces.
  g.lineStyle(4, TIMBER_DARK, 1);
  for (const k of [0, 1, 2]) { const y0 = y - 20 - k * 58, y1 = y0 - 54; g.lineBetween(x - 34 + k * 3, y0, x + 30 - k * 3, y1); g.lineBetween(x + 34 - k * 3, y0, x - 30 + k * 3, y1); }
  // Ladder.
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x - 6, y, x - 4, y - 190); g.lineBetween(x + 6, y, x + 4, y - 190);
  for (let k = 0; k < 14; k++) g.lineBetween(x - 6, y - 8 - k * 13, x + 6, y - 8 - k * 13);
  // Platform, rail, roof.
  logWall(g, { x: x - 40, y: y - 222, w: 80, h: 30 }, rng, 10);
  g.lineStyle(3, TIMBER_DARK, 1); for (const px of [-36, 36]) g.lineBetween(x + px, y - 222, x + px, y - 262);
  shingleRoof(g, x, y - 262, 80, 50, rng, 12);
  // The great horn, mouth to the forest.
  huntingHorn(g, x + 30, y - 236, 26, 1);
  // A red pennant on a pole off the roof.
  g.lineStyle(2, 0x2a2a2a, 1); g.lineBetween(x, y - 312, x, y - 344);
  g.fillStyle(HUNT_RED, 1); g.fillTriangle(x, y - 344, x + 26, y - 338, x, y - 330);
}

function cottage(g: G, c: Pt, i: number, rng: () => number): void {
  const w = 150, h = 74;
  shadow(g, c.x, c.y + 4, w * 1.2, 24);
  logWall(g, { x: c.x - w / 2, y: c.y - h, w, h }, rng, 12);
  // Turf roof, grass growing on it.
  g.fillStyle(dim(MOSS, 0.4), 1); g.fillTriangle(c.x - w / 2 - 18, c.y - h + 4, c.x + w / 2 + 18, c.y - h + 4, c.x, c.y - h - 64);
  g.fillStyle(MOSS, 1); g.fillTriangle(c.x - w / 2 - 14, c.y - h, c.x + w / 2 + 14, c.y - h, c.x, c.y - h - 60);
  for (let k = 0; k < 20; k++) {
    const t = rng(), side = rng() < 0.5 ? -1 : 1;
    const half = (w / 2 + 14) * (1 - t);
    const gx = c.x + side * rng() * half, gy = c.y - h - 60 * t;
    g.lineStyle(1.5, MOSS_LIT, 0.9); g.lineBetween(gx, gy, gx + (rng() - 0.5) * 3, gy - 5);
  }
  if (i === 1) for (let k = 0; k < 4; k++) { g.fillStyle([0xe8c040, 0xd8d8f0, 0xc84a6a][k % 3], 1); g.fillCircle(c.x - 30 + k * 18, c.y - h - 18, 2.5); }
  // Door with an antler (or a bare peg where one was taken down) over it.
  g.fillStyle(0x2a1a0e, 1); g.fillRoundedRect(c.x - 14, c.y - 46, 28, 46, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(0x5a3a22, 1); g.fillRoundedRect(c.x - 12, c.y - 44, 24, 44, { tl: 7, tr: 7, bl: 0, br: 0 });
  if (i !== 2) antlerPair(g, c.x, c.y - 52, 12, ANTLER_DARK, 1, true);
  else { g.fillStyle(TIMBER_DARK, 1); g.fillCircle(c.x, c.y - 54, 3); }
  // One small window, and the tithe-tally chalked beside the door.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(c.x + 30, c.y - 56, 22, 20);
  g.fillStyle(i === 2 ? 0x1a140c : 0xffc070, 0.9); g.fillRect(c.x + 33, c.y - 53, 16, 14);
  for (let m = 0; m < 3 + i; m++) { g.fillStyle(0xe8e0d0, 0.8); g.fillRect(c.x - 40 + m * 4, c.y - 40, 1.5, 10); }
  // A woodpile against the side.
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) logEnd(g, c.x - w / 2 - 22 + k * 11 + r * 5.5, c.y - 6 - r * 10, 5);
}

function kennels(g: G, rng: () => number): void {
  const { x, y } = KENNELS;
  const w = 260, h = 64;
  shadow(g, x, y - 20, w * 1.1, 20);
  logWall(g, { x: x - w / 2, y: y - h - 6, w, h }, rng, 11);
  g.fillStyle(dim(SHINGLE, 0.4), 1); g.fillRect(x - w / 2 - 16, y - h - 30, w + 32, 26);
  g.fillStyle(SHINGLE, 1); g.fillRect(x - w / 2 - 14, y - h - 28, w + 28, 22);
  for (let k = 0; k < 14; k++) { g.lineStyle(1, dim(SHINGLE, 0.5), 1); g.lineBetween(x - w / 2 - 10 + k * 21, y - h - 28, x - w / 2 - 10 + k * 21, y - h - 6); }
  // Arched hound-doors.
  for (let k = 0; k < 5; k++) {
    const dx = x - w / 2 + 30 + k * ((w - 60) / 4);
    g.fillStyle(0x120c08, 1); g.fillRoundedRect(dx - 12, y - 34, 24, 28, { tl: 11, tr: 11, bl: 0, br: 0 });
    g.fillStyle(0xfff0c0, 0.8); g.fillCircle(dx - 4, y - 20, 1.2); g.fillCircle(dx + 4, y - 20, 1.2);
  }
  // Name boards over the doors.
  for (let k = 0; k < 5; k++) { const dx = x - w / 2 + 30 + k * ((w - 60) / 4); g.fillStyle(ENDGRAIN, 1); g.fillRect(dx - 10, y - 42, 20, 5); }
  // Water trough.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 80, y + 40, 50, 14);
  g.fillStyle(RIVER_LIT, 1); g.fillRect(x + 83, y + 42, 44, 6);
}

function kennelFence(g: G): void {
  const r = KENNEL_RUN;
  const y = r.y + r.h;
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(r.x, y - 14, r.x + r.w, y - 14); g.lineBetween(r.x, y - 26, r.x + r.w, y - 26);
  for (let px = r.x; px <= r.x + r.w; px += 22) { g.fillStyle(TIMBER, 1); g.fillRect(px - 2.5, y - 32, 5, 32); }
  for (const sx of [r.x, r.x + r.w]) {
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(sx, y, sx, r.y); g.lineBetween(sx, y - 14, sx, r.y - 4);
  }
}

function pens(g: G, rng: () => number): void {
  const r = PENS;
  // Back and side stakes of the stockade; the front row is its own piece (drawn over the people).
  const stake = (sx: number, sy: number, hgt: number): void => {
    g.fillStyle(BARK_DARK, 1); g.fillRect(sx - 6, sy - hgt, 12, hgt);
    g.fillStyle(BARK, 1); g.fillRect(sx - 5, sy - hgt, 9, hgt);
    g.fillStyle(ENDGRAIN, 1); g.fillTriangle(sx - 6, sy - hgt, sx + 6, sy - hgt, sx, sy - hgt - 12);
  };
  for (let sx = r.x; sx <= r.x + r.w; sx += 12) stake(sx, r.y, 60 + rng() * 8);
  for (let sy = r.y + 12; sy <= r.y + r.h; sy += 12) { stake(r.x, sy, 58); stake(r.x + r.w, sy, 58); }
  // The quarry: families sitting huddled, each in an antler cap. Some heads up, watching.
  for (let k = 0; k < 9; k++) {
    const px = r.x + 26 + (k % 5) * 36 + (k > 4 ? 18 : 0), py = r.y + 40 + (k > 4 ? 34 : 0);
    const small = k % 3 === 2;
    const s = small ? 0.7 : 1;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(px, py + 4, 26 * s, 7 * s);
    g.fillStyle([0x7a6a5a, 0x5a5a6a, 0x8a6a4a][k % 3], 1); g.fillEllipse(px, py - 8 * s, 22 * s, 20 * s);
    g.fillStyle(0xd8b494, 1); g.fillCircle(px, py - 22 * s, 7 * s);
    antlerPair(g, px, py - 27 * s, 9 * s, ANTLER_DARK, 1, false);
  }
}

function pensFront(g: G, rng: () => number): void {
  const r = PENS;
  for (let sx = r.x; sx <= r.x + r.w; sx += 12) {
    if (Math.abs(sx - (r.x + r.w / 2)) < 20) continue;
    const hgt = 62 + rng() * 8;
    g.fillStyle(BARK_DARK, 1); g.fillRect(sx - 6, r.y + r.h - hgt, 12, hgt);
    g.fillStyle(BARK, 1); g.fillRect(sx - 5, r.y + r.h - hgt, 9, hgt);
    g.fillStyle(BARK_DARK, 0.6); g.fillRect(sx + 1, r.y + r.h - hgt, 2, hgt);
    g.fillStyle(ENDGRAIN, 1); g.fillTriangle(sx - 6, r.y + r.h - hgt, sx + 6, r.y + r.h - hgt, sx, r.y + r.h - hgt - 12);
  }
  // Gate of lashed stakes, chained, the Gardener's tally-tag on the chain.
  const gx = r.x + r.w / 2;
  g.fillStyle(0x5a3a22, 1); g.fillRect(gx - 20, r.y + r.h - 56, 40, 56);
  g.lineStyle(2, TIMBER_DARK, 1); for (let k = 0; k < 5; k++) g.lineBetween(gx - 16 + k * 8, r.y + r.h - 56, gx - 16 + k * 8, r.y + r.h);
  g.lineStyle(2.5, 0x5a5a58, 1); g.lineBetween(gx - 24, r.y + r.h - 30, gx + 24, r.y + r.h - 26);
  g.fillStyle(0x4a4a48, 1); g.fillRect(gx - 5, r.y + r.h - 32, 10, 10);
  g.fillStyle(GILT, 1); g.fillCircle(gx + 12, r.y + r.h - 18, 5);
  gardenersMark(g, gx + 12, r.y + r.h - 18, 3.5, 0x3a2a10, 1);
}

function highSeat(g: G, rng: () => number): void {
  const { x, y } = HIGH_SEAT;
  shadow(g, x, y + 2, 80, 16);
  for (const l of [-24, 24]) {
    g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x + l, y, x + l * 0.7, y - 120);
    g.lineStyle(4, BARK, 1); g.lineBetween(x + l, y, x + l * 0.7, y - 120);
  }
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x - 8, y + 8, x - 4, y - 120); g.lineBetween(x + 8, y + 8, x + 4, y - 120);
  for (let k = 0; k < 9; k++) g.lineBetween(x - 8, y - 4 - k * 13, x + 8, y - 4 - k * 13);
  logWall(g, { x: x - 32, y: y - 150, w: 64, h: 30 }, rng, 10);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 30, y - 150, x - 30, y - 180); g.lineBetween(x + 30, y - 150, x + 30, y - 180);
  g.fillStyle(SHINGLE, 1); g.fillTriangle(x - 42, y - 176, x + 42, y - 176, x, y - 206);
  // A crossbow rests on the rail.
  g.lineStyle(2, 0x3a2a1a, 1); g.lineBetween(x - 18, y - 154, x + 18, y - 154);
  g.lineStyle(1.5, 0x8a8e90, 1); g.lineBetween(x - 4, y - 160, x + 4, y - 148);
}

function palingRun(g: G, posts: Pt[]): void {
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 2, p.y + 2, 12, 4);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 3, p.y - 36, 6, 36);
    g.fillStyle(0x8a6a44, 1); g.fillRect(p.x - 2, p.y - 36, 4, 36);
    g.fillStyle(0x8a6a44, 1); g.fillTriangle(p.x - 3, p.y - 36, p.x + 3, p.y - 36, p.x, p.y - 42);
    const q = posts[i + 1];
    if (q && dist(p.x, p.y, q.x, q.y) < 40) {
      g.lineStyle(2.5, TIMBER_DARK, 1); g.lineBetween(p.x, p.y - 26, q.x, q.y - 26); g.lineBetween(p.x, p.y - 12, q.x, q.y - 12);
    }
  }
}

function lodge(g: G, rng: () => number): void {
  const { x, y } = LODGE;
  const w = LODGE_W, h = 190;
  shadow(g, x, y + 8, w * 1.2, 48, 0.45);
  // Stone undercroft.
  g.fillStyle(0x3a3a36, 1); g.fillRect(x - w / 2 - 10, y - 36, w + 20, 38);
  for (let r = 0; r < 2; r++) for (let k = 0; k < 16; k++) {
    g.fillStyle(rng() < 0.5 ? 0x4a4a44 : 0x56564e, 1);
    g.fillRoundedRect(x - w / 2 - 8 + k * ((w + 16) / 16) + (r ? 12 : 0), y - 34 + r * 17, (w + 16) / 16 - 3, 15, 3);
  }
  logWall(g, { x: x - w / 2, y: y - 36 - h, w, h }, rng, 16);
  // A storey band in oxblood.
  g.fillStyle(HUNT_RED, 1); g.fillRect(x - w / 2 - 6, y - 36 - h * 0.52, w + 12, 10);
  g.fillStyle(HUNT_RED_LIT, 0.6); g.fillRect(x - w / 2 - 6, y - 36 - h * 0.52, w + 12, 2);
  shingleRoof(g, x, y - 36 - h, w, 190, rng, 30);
  // Two wings' smaller gables.
  for (const side of [-1, 1]) {
    const gx = x + side * (w / 2 - 60);
    g.fillStyle(SHINGLE, 1); g.fillTriangle(gx - 50, y - 36 - h + 4, gx + 50, y - 36 - h + 4, gx, y - 36 - h - 60);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(gx - 12, y - 36 - h - 26, 24, 24);
    g.fillStyle(0xff9a4a, 0.85); g.fillRect(gx - 9, y - 36 - h - 23, 18, 18);
  }
  // The great rack over the gable: an elk's antlers wider than the door.
  antlerPair(g, x, y - 36 - h - 160, 110, ANTLER, 1);
  // Gate: a deep doorway under a wolf-head keystone, iron-studded doors.
  const dw = 92, dh = 120;
  g.fillStyle(0x3a3a36, 1); g.fillRoundedRect(x - dw / 2 - 14, y - dh - 16, dw + 28, dh + 16, { tl: 40, tr: 40, bl: 0, br: 0 });
  g.fillStyle(0x1a100a, 1); g.fillRoundedRect(x - dw / 2, y - dh, dw, dh, { tl: 34, tr: 34, bl: 0, br: 0 });
  g.fillStyle(0x4a2a18, 1); g.fillRoundedRect(x - dw / 2 + 4, y - dh + 4, dw / 2 - 6, dh - 4, { tl: 30, tr: 0, bl: 0, br: 0 });
  g.fillRoundedRect(x + 2, y - dh + 4, dw / 2 - 6, dh - 4, { tl: 0, tr: 30, bl: 0, br: 0 });
  for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { g.fillStyle(0x6a6a68, 1); g.fillCircle(x - dw / 2 + 12 + k * 22 + (k > 1 ? 4 : 0), y - dh + 26 + r * 20, 2); }
  wolfHead(g, x, y - dh - 22, 14, ANTLER);
  // Windows along the hall, lit red-gold.
  for (const wx of [x - 160, x - 100, x + 100, x + 160]) {
    for (const wy of [y - 36 - h * 0.28, y - 36 - h * 0.78]) {
      g.fillStyle(0xff8a4a, 0.12); g.fillCircle(wx, wy, 22);
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 12, wy - 14, 24, 28);
      g.fillStyle(0xff9a5a, 0.9); g.fillRect(wx - 9, wy - 11, 18, 22);
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 1, wy - 11, 2, 22);
    }
  }
  // Long banners in livery down the front: wolf-head on oxblood, the Empress's verdigris on the tails.
  for (const bx of [x - 70, x + 70]) {
    g.fillStyle(dim(HUNT_RED, 0.3), 1); g.fillRect(bx - 16, y - 36 - h + 4, 32, 150);
    g.fillStyle(HUNT_RED, 1); g.fillRect(bx - 14, y - 36 - h + 4, 28, 146);
    g.fillStyle(VERDIGRIS, 1); g.fillTriangle(bx - 14, y - 36 - h + 150, bx + 14, y - 36 - h + 150, bx, y - 36 - h + 168);
    wolfHead(g, bx, y - 36 - h + 50, 11, ANTLER);
    gardenersMark(g, bx, y - 36 - h + 108, 9, GILT, 1);
  }
  // Torch brackets either side of the gate (flames in animateOver).
  for (const side of [-1, 1]) {
    const tx = x + side * (dw / 2 + 30);
    g.fillStyle(0x2a2a2a, 1); g.fillRect(tx - 3, y - 96, 6, 26);
    g.fillStyle(0x3a2a1a, 1); g.fillRect(tx - 5, y - 104, 10, 10);
  }
  // Hound statues on plinths flanking the steps.
  for (const side of [-1, 1]) {
    const sx = x + side * 150, sy = y + 40;
    shadow(g, sx, sy + 2, 60, 12);
    g.fillStyle(0x4a4a44, 1); g.fillRect(sx - 26, sy - 24, 52, 24);
    g.fillStyle(0x5a5a52, 1); g.fillRect(sx - 24, sy - 22, 48, 4);
    hound(g, sx, sy - 40, -side, 1.2, 0.6, 0x6a6a64, 1, 0x4a4a44);
  }
}

function mews(g: G, rng: () => number): void {
  const { x, y } = MEWS;
  const w = 180, h = 96;
  shadow(g, x, y + 4, w * 1.2, 24);
  logWall(g, { x: x - w / 2, y: y - h, w, h }, rng, 12);
  shingleRoof(g, x, y - h, w, 80, rng, 14);
  // Slatted windows — air for the birds — and a hooded falcon on each sill.
  for (const wx of [x - 50, x + 50]) {
    g.fillStyle(0x120c08, 1); g.fillRect(wx - 18, y - 74, 36, 30);
    g.lineStyle(2, TIMBER_LIT, 1); for (let k = 0; k < 5; k++) g.lineBetween(wx - 18 + k * 9, y - 74, wx - 18 + k * 9, y - 44);
  }
  g.fillStyle(0x2a1a0e, 1); g.fillRect(x - 15, y - 54, 30, 54);
  // A perching block outside, a jessed falcon hooded on it.
  const px = x - 120, py = y + 10;
  shadow(g, px, py, 30, 8);
  g.fillStyle(BARK, 1); g.fillRect(px - 6, py - 36, 12, 36);
  logEnd(g, px, py - 36, 8);
  g.fillStyle(0x4a3e30, 1); g.fillEllipse(px, py - 50, 14, 22);
  g.fillStyle(0xd8c8a8, 1); g.fillEllipse(px, py - 46, 8, 12);
  g.fillStyle(HUNT_RED, 1); g.fillCircle(px, py - 62, 5.5);
  g.fillStyle(GILT, 1); g.fillCircle(px, py - 67, 1.8);
  g.lineStyle(1, 0xc8a46e, 1); g.lineBetween(px, py - 40, px + 8, py - 30);
  // A hanging lure on a cord.
  g.lineStyle(1, 0x8a7a4a, 1); g.lineBetween(x + w / 2 + 8, y - h, x + w / 2 + 8, y - h + 40);
  g.fillStyle(0x8a6a44, 1); g.fillEllipse(x + w / 2 + 8, y - h + 46, 12, 8);
}

function royalStand(g: G, rng: () => number): void {
  const { x, y } = ROYAL_STAND;
  shadow(g, x, y + 4, 140, 24);
  // Four carved legs, gilt-banded, rising to a box with a canopy.
  for (const l of [-46, -18, 18, 46]) {
    g.lineStyle(8, TIMBER_DARK, 1); g.lineBetween(x + l, y, x + l * 0.75, y - 150);
    g.lineStyle(5, TIMBER, 1); g.lineBetween(x + l, y, x + l * 0.75, y - 150);
    g.fillStyle(GILT, 1); g.fillRect(x + l * 0.9 - 4, y - 60, 8, 4);
  }
  g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(x - 10, y + 6, x - 6, y - 150); g.lineBetween(x + 10, y + 6, x + 6, y - 150);
  for (let k = 0; k < 11; k++) g.lineBetween(x - 10, y - 4 - k * 13, x + 10, y - 4 - k * 13);
  logWall(g, { x: x - 52, y: y - 186, w: 104, h: 36 }, rng, 12);
  g.fillStyle(GILT, 1); g.fillRect(x - 58, y - 188, 116, 5);
  gardenersMark(g, x, y - 168, 12, GILT, 1);
  // Throne back and a green-and-gold canopy with scalloped valance.
  g.fillStyle(VERDIGRIS, 1); g.fillRoundedRect(x - 14, y - 222, 28, 36, 6);
  for (const px of [-48, 48]) { g.lineStyle(3, GILT, 1); g.lineBetween(x + px, y - 188, x + px, y - 240); }
  g.fillStyle(dim(HUNT_GREEN, 0.3), 1); g.fillTriangle(x - 66, y - 236, x + 66, y - 236, x, y - 280);
  g.fillStyle(HUNT_GREEN, 1); g.fillTriangle(x - 62, y - 238, x + 62, y - 238, x, y - 276);
  for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? GILT : VERDIGRIS, 1); g.fillCircle(x - 56 + k * 16, y - 236, 7); }
  // A rose growing up one leg — the Empress's.
  for (let k = 0; k < 6; k++) { g.fillStyle(LEAF_GREEN, 1); g.fillEllipse(x + 40 - k * 2, y - 20 - k * 20, 8, 5); }
  g.fillStyle(0xc8304a, 1); g.fillCircle(x + 30, y - 128, 5); g.fillCircle(x + 38, y - 90, 4);
}

function grimbleHut(g: G): void {
  const { x, y } = GRIMBLE_HUT;
  shadow(g, x, y + 4, 150, 22);
  // A bark lean-to against a fallen trunk, with a charcoal clamp smoking beside it.
  g.fillStyle(BARK_DARK, 1); g.fillRoundedRect(x - 90, y - 26, 180, 26, 12);
  g.fillStyle(BARK, 1); g.fillRoundedRect(x - 88, y - 24, 176, 20, 10);
  logEnd(g, x + 90, y - 13, 12);
  for (let k = 0; k < 12; k++) {
    g.lineStyle(5, k % 2 ? BARK : 0x5a4232, 1); g.lineBetween(x - 70 + k * 10, y - 22, x - 50 + k * 6, y - 90);
  }
  g.fillStyle(0x120c08, 1); g.fillTriangle(x - 30, y - 22, x + 10, y - 22, x - 14, y - 66);
  // Snares and a brace of rabbits on pegs.
  g.lineStyle(1.5, 0xb8a87a, 1); for (let k = 0; k < 3; k++) g.strokeCircle(x + 40 + k * 14, y - 50, 5);
  g.fillStyle(0x8a7a64, 1); g.fillEllipse(x - 64, y - 44, 8, 16); g.fillEllipse(x - 54, y - 42, 8, 16);
  // Charcoal clamp: a turf-covered mound.
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 120, y + 4, 70, 14);
  g.fillStyle(0x2a2418, 1); g.fillEllipse(x + 120, y - 10, 64, 30);
  g.fillStyle(MOSS, 0.8); g.fillEllipse(x + 116, y - 18, 40, 12);
}

function gatePost(g: G, p: Pt, side: number, bone: boolean): void {
  shadow(g, p.x, p.y + 2, 30, 8);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 9, p.y - 110, 18, 110);
  g.fillStyle(TIMBER, 1); g.fillRect(p.x - 7, p.y - 110, 14, 110);
  for (let k = 0; k < 5; k++) { g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(p.x, p.y - 20 - k * 18, 10, 5); }
  if (bone) {
    // Bleached skull and long bones lashed on: the road north goes to the Ossuary.
    g.fillStyle(0xe8e0cc, 1); g.fillCircle(p.x, p.y - 118, 10); g.fillRect(p.x - 6, p.y - 112, 12, 8);
    g.fillStyle(0x2a2420, 1); g.fillCircle(p.x - 4, p.y - 119, 2.5); g.fillCircle(p.x + 4, p.y - 119, 2.5);
    g.lineStyle(4, 0xe8e0cc, 1); g.lineBetween(p.x - 14, p.y - 70, p.x + 14, p.y - 96); g.lineBetween(p.x + 14, p.y - 70, p.x - 14, p.y - 96);
  } else {
    antler(g, p.x, p.y - 108, 40, side);
  }
}

function westArch(g: G): void {
  const [a, b] = WEST_GATE;
  // A lintel of lashed antlers over the road between the posts.
  g.lineStyle(10, TIMBER_DARK, 1); g.lineBetween(a.x, a.y - 104, b.x, b.y - 104 - 4);
  g.lineStyle(7, TIMBER, 1); g.lineBetween(a.x, a.y - 104, b.x, b.y - 104 - 4);
  for (let k = 0; k < 5; k++) {
    const t = (k + 0.5) / 5;
    antlerPair(g, a.x + (b.x - a.x) * t, a.y - 112 + (b.y - a.y) * t, 18, k % 2 ? ANTLER : ANTLER_DARK, 1, k === 2);
  }
  g.fillStyle(HUNT_RED, 1); g.fillTriangle(a.x - 4, a.y - 96, a.x + 18, a.y - 92, a.x - 4, a.y - 84);
}

function makePieces(): NonNullable<AreaPainter['pieces']> {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  pieces.push({ x: LONG_HALL.x, y: LONG_HALL.y + 32, w: LONG_HALL_W + 120, h: 420, draw: (g, rng) => longHall(g, rng) });
  pieces.push({ x: SHOP.x, y: SHOP.y, w: 320, h: 230, draw: (g, rng) => shop(g, rng) });
  pieces.push({ x: LARDER.x, y: LARDER.y, w: 260, h: 190, draw: (g) => larder(g) });
  pieces.push({ x: HORN_TOWER.x, y: HORN_TOWER.y, w: 140, h: 360, draw: (g, rng) => hornTower(g, rng) });
  COTTAGES.forEach((c, i) => pieces.push({ x: c.x, y: c.y, w: 220, h: 170, draw: (g, rng) => cottage(g, c, i, rng) }));
  pieces.push({ x: KENNELS.x, y: KENNELS.y - 6, w: 300, h: 110, draw: (g, rng) => kennels(g, rng) });
  pieces.push({ x: KENNEL_RUN.x + KENNEL_RUN.w / 2, y: KENNEL_RUN.y + KENNEL_RUN.h, w: KENNEL_RUN.w + 10, h: 110, draw: (g) => kennelFence(g) });
  pieces.push({ x: PENS.x + PENS.w / 2, y: PENS.y, w: PENS.w + 20, h: 90, draw: (g, rng) => pens(g, rng) });
  pieces.push({ x: PENS.x + PENS.w / 2, y: PENS.y + PENS.h, w: PENS.w + 20, h: 90, draw: (g, rng) => pensFront(g, rng) });
  pieces.push({ x: HIGH_SEAT.x, y: HIGH_SEAT.y, w: 100, h: 220, draw: (g, rng) => highSeat(g, rng) });
  pieces.push({ x: LODGE.x, y: LODGE.y + 40, w: LODGE_W + 140, h: 560, draw: (g, rng) => lodge(g, rng) });
  pieces.push({ x: MEWS.x, y: MEWS.y + 10, w: 300, h: 200, draw: (g, rng) => mews(g, rng) });
  pieces.push({ x: ROYAL_STAND.x, y: ROYAL_STAND.y, w: 160, h: 300, draw: (g, rng) => royalStand(g, rng) });
  pieces.push({ x: GRIMBLE_HUT.x, y: GRIMBLE_HUT.y, w: 300, h: 110, draw: (g) => grimbleHut(g) });
  WEST_GATE.forEach((p, i) => pieces.push({ x: p.x, y: p.y, w: 40, h: 160, draw: (g) => gatePost(g, p, i ? 1 : -1, false) }));
  pieces.push({ x: WEST_GATE[1].x, y: WEST_GATE[1].y + 1, w: 80, h: 300, draw: (g) => westArch(g) });
  NORTH_GATE.forEach((p, i) => pieces.push({ x: p.x, y: p.y, w: 40, h: 140, draw: (g) => gatePost(g, p, i ? 1 : -1, true) }));
  // The paling in runs of posts, each run sorted by its lowest post.
  const sorted = [...PALING];
  for (let i = 0; i < sorted.length; i += 4) {
    const run = sorted.slice(i, i + 5);
    const by = Math.max(...run.map((p) => p.y));
    const cx = run.reduce((s, p) => s + p.x, 0) / run.length;
    pieces.push({ x: cx, y: by, w: 160, h: 80, draw: (g) => palingRun(g, run) });
  }
  for (const t of TREES) pieces.push({ x: t.x, y: t.y, w: t.s * 3, h: t.s * 4.6, draw: (g, rng) => bigTree(g, t.x, t.y, t.s, t.kind, rng) });
  return pieces;
}

// ── Animation (t in seconds) ────────────────────────────────────────

const DEER = [
  { x: 960, y: 1300, r: 90, ph: 0, s: 0.75 }, { x: 1140, y: 1260, r: 70, ph: 2, s: 0.65 },
  { x: 1000, y: 1420, r: 110, ph: 4, s: 0.7 }, { x: 1200, y: 1340, r: 60, ph: 1, s: 0.6 },
];
const KENNEL_HOUNDS = [0, 1, 2];
const HANG: { dx: number; kind: 'hare' | 'bird' | 'haunch' }[] = [
  { dx: -70, kind: 'hare' }, { dx: -40, kind: 'bird' }, { dx: 50, kind: 'haunch' }, { dx: 76, kind: 'bird' },
];

/** Under actors: the river running, the pool, deer in the park, the hounds in their run, hung game. */
function animate(g: G, t: number, view: Rect): void {
  // River flow: pale lines running downstream, faster through the ford.
  const y0 = Math.max(-10, view.y - 40), y1 = Math.min(AREA_H, view.y + view.h + 40);
  const rx = riverX((y0 + y1) / 2);
  if (rx > view.x - 200 && rx < view.x + view.w + 200) {
    for (let i = 0; i < 40; i++) {
      const sp = 60;
      const y = ((noise(i * 3.1) * AREA_H + t * sp) % AREA_H);
      if (y < y0 || y > y1) continue;
      const cx = riverX(y), hw = riverHW(y);
      const x = cx + (noise(i * 7.7) - 0.5) * hw * 1.6;
      const fast = y > FORD_Y0 && y < FORD_Y1;
      g.lineStyle(1.5, fast ? FOAM : RIVER_LIT, fast ? 0.5 : 0.35);
      g.lineBetween(x, y, x + (riverX(y + 14) - cx), y + (fast ? 18 : 12));
    }
    // Foam round the stepping stones.
    if (inView(riverX(830), 830, view, 200)) {
      for (let k = 0; k < 6; k++) {
        const y = 812 + (k % 2) * 34;
        const x = riverX(y) - riverHW(y) + 24 + k * ((riverHW(y) * 2 - 48) / 5);
        const w = 0.5 + 0.5 * Math.sin(t * 4 + k);
        g.lineStyle(1.5, FOAM, 0.35 + w * 0.3); g.strokeEllipse(x, y + 7, 34 + w * 6, 10);
      }
    }
  }
  // The salmon pool: rings, and now and then a salmon leaping.
  const px = riverX(POOL_Y);
  if (inView(px, POOL_Y, view, 200)) {
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.4 + i / 6) % 1;
      const x = px + (noise(i * 4.3) - 0.5) * 110, y = POOL_Y + (noise(i * 1.9) - 0.5) * 130;
      g.lineStyle(1.3, RIVER_LIT, 0.5 * (1 - ph)); g.strokeEllipse(x, y, 8 + ph * 40, 3 + ph * 14);
    }
    const jump = (t * 0.13) % 1;
    if (jump < 0.07) {
      const k = jump / 0.07;
      const jx = px - 30 + k * 50, jy = POOL_Y - 10 - Math.sin(k * Math.PI) * 38;
      g.fillStyle(0xc87a5a, 1); g.fillEllipse(jx, jy, 22, 8);
      g.fillStyle(0xd8d0c8, 1); g.fillEllipse(jx + 2, jy + 2, 16, 3);
      g.fillStyle(0x8a4a3a, 1); g.fillTriangle(jx - 11, jy, jx - 18, jy - 5, jx - 18, jy + 5);
      g.lineStyle(1.5, FOAM, 0.7 * (1 - k)); g.strokeEllipse(px - 30, POOL_Y - 4, 20 + k * 30, 6 + k * 8);
    }
  }
  // Deer grazing in the park, wandering slow loops.
  if (inView(PARK.x, PARK.y, view, PARK.rx + 80)) {
    for (const d of DEER) {
      const a = t * 0.06 + d.ph;
      const x = d.x + Math.cos(a) * d.r, y = d.y + Math.sin(a * 1.3) * d.r * 0.4;
      const dir = -Math.sin(a) >= 0 ? 1 : -1;
      const graze = Math.sin(t * 0.5 + d.ph) > 0.2 ? 1 : 0;
      stagDoe(g, x, y, dir, d.s, t * 2 + d.ph, graze, d === DEER[0]);
    }
  }
  // Hounds pacing in the kennel run.
  const kr = KENNEL_RUN;
  if (inView(kr.x + kr.w / 2, kr.y, view, 200)) {
    for (const i of KENNEL_HOUNDS) {
      const u = (Math.sin(t * (0.5 + i * 0.13) + i * 2) + 1) / 2;
      const x = kr.x + 24 + u * (kr.w - 48);
      const dir = Math.cos(t * (0.5 + i * 0.13) + i * 2) >= 0 ? 1 : -1;
      hound(g, x, kr.y + 22 + i * 16, dir, 0.75, t * 8 + i, [0x8a6a4a, 0xc8b49a, 0x5a4434][i]);
    }
  }
  // Hung game swaying on the larder beam.
  if (inView(LARDER.x, LARDER.y - 120, view, 200)) {
    for (let k = 0; k < HANG.length; k++) {
      const h = HANG[k];
      const sw = Math.sin(t * 0.9 + k) * 0.06;
      const hx = LARDER.x + h.dx, hy = LARDER.y - 146;
      const ex = hx + Math.sin(sw) * 40, ey = hy + Math.cos(sw) * 40;
      g.lineStyle(1.5, 0x3a3a3a, 1); g.lineBetween(hx, hy, ex, ey - 14);
      if (h.kind === 'hare') { g.fillStyle(0x8a7a64, 1); g.fillEllipse(ex, ey + 6, 12, 34); g.fillStyle(0x6a5a48, 1); g.fillEllipse(ex - 3, ey - 14, 4, 12); g.fillEllipse(ex + 3, ey - 14, 4, 12); }
      else if (h.kind === 'bird') { g.fillStyle(0x8a4a2a, 1); g.fillEllipse(ex, ey + 4, 14, 26); g.fillStyle(0x2a5a4a, 1); g.fillCircle(ex, ey + 18, 4); g.lineStyle(2, 0xa87a4a, 1); g.lineBetween(ex, ey - 8, ex + 2, ey - 26); }
      else { g.fillStyle(0x8a3a2a, 1); g.fillEllipse(ex, ey + 10, 22, 40); g.fillStyle(0xe8d8c8, 1); g.fillRect(ex - 3, ey - 14, 6, 10); }
    }
  }
}

/** A deer of the park (hind, or the park's stag for the first one) — wraps the stag rig. */
function stagDoe(g: G, x: number, y: number, dir: number, s: number, ph: number, graze: number, isStag: boolean): void {
  if (isStag) { stag(g, x, y, dir, s, graze ? 0 : ph, graze * 0.6); return; }
  // A hind: no antlers, lighter, ears up.
  const c = 0x9a6a44;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 24 * s, 48 * s, 9 * s);
  for (const hx of [14, 10, -12, -16]) { g.lineStyle(3 * s, dim(c, 0.4), 1); g.lineBetween(x + dir * hx * s, y + 4 * s, x + dir * hx * s + (graze ? 0 : Math.sin(ph + hx) * 4 * s), y + 24 * s); }
  g.fillStyle(c, 1); g.fillEllipse(x, y - 2 * s, 42 * s, 17 * s);
  g.fillStyle(0xe8dcc0, 1); g.fillEllipse(x - dir * 18 * s, y - 2 * s, 7 * s, 9 * s);
  const hx = x + dir * (24 + graze * 4) * s, hy = y - (16 - graze * 22) * s;
  g.lineStyle(6 * s, c, 1); g.lineBetween(x + dir * 16 * s, y - 6 * s, hx, hy);
  g.fillStyle(c, 1); g.fillEllipse(hx, hy, 11 * s, 8 * s);
  g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(hx - dir * 2 * s, hy - 6 * s, 3 * s, 7 * s);
  g.fillStyle(0x161210, 1); g.fillCircle(hx + dir * 5 * s, hy, 1.3 * s);
}

/** Over actors: chimney and clamp smoke, braziers and torches, sun-shafts, a falcon over the mews. */
function animateOver(g: G, t: number, view: Rect): void {
  const smoke = (x: number, y: number, n: number, size: number, a: number): void => {
    if (!inView(x, y, view, 260)) return;
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.18 + i / n) % 1;
      const al = a * (ph < 0.1 ? ph / 0.1 : 1 - (ph - 0.1) / 0.9);
      g.fillStyle(0xb8b0a0, al * 0.4); g.fillCircle(x + Math.sin(ph * 4 + i) * 10 + ph * 60, y - ph * 140, size * (0.5 + ph));
    }
  };
  smoke(LONG_HALL.x + 40, LONG_HALL.y - 300, 6, 16, 0.6);
  smoke(LODGE.x - 120, LODGE.y - 300, 6, 16, 0.6);
  for (const c of COTTAGES) smoke(c.x + 20, c.y - 140, 4, 10, 0.5);
  smoke(GRIMBLE_HUT.x + 120, GRIMBLE_HUT.y - 24, 6, 12, 0.7);

  const flame = (x: number, y: number, h: number, seed: number): void => {
    if (!inView(x, y, view)) return;
    glow(g, x, y - h * 0.4, h * 1.6, 0xff8a3a, 0.04, 3);
    for (let i = 0; i < 3; i++) {
      const f = 0.75 + 0.25 * Math.sin(t * 12 + seed + i * 2);
      const sx = x + (i - 1) * h * 0.18;
      g.fillStyle(0xff7a2a, 0.85); g.fillTriangle(sx - h * 0.18, y, sx + h * 0.18, y, sx + Math.sin(t * 6 + i) * 2, y - h * f);
      g.fillStyle(0xffd060, 0.9); g.fillTriangle(sx - h * 0.08, y, sx + h * 0.08, y, sx, y - h * f * 0.55);
    }
  };
  flame(LONG_HALL.x - 70, LONG_HALL.y + 4, 16, 1); flame(LONG_HALL.x + 70, LONG_HALL.y + 4, 16, 2);
  flame(LODGE.x - 76, LODGE.y - 106, 14, 3); flame(LODGE.x + 76, LODGE.y - 106, 14, 4);

  // Sun-shafts slanting through the canopy, drifting slowly.
  for (let i = 0; i < 7; i++) {
    const x = (i * 377 + Math.sin(t * 0.05 + i) * 40) % AREA_W;
    const y = 200 + (i * 211) % 1200;
    if (!inView(x, y, view, 300)) continue;
    g.fillStyle(SUN, 0.035 + 0.015 * Math.sin(t * 0.4 + i));
    g.fillTriangle(x - 30, y - 260, x + 30, y - 260, x + 110, y + 60);
    g.fillTriangle(x - 30, y - 260, x + 70, y + 60, x + 110, y + 60);
  }
  // Sloe, circling over the mews.
  const fx = MEWS.x - 60 + Math.cos(t * 0.5) * 160, fy = MEWS.y - 260 + Math.sin(t * 0.5) * 70;
  if (inView(fx, fy, view, 100)) falcon(g, fx, fy, t * 0.5 + Math.PI / 2, Math.sin(t * 5), 0.9);
  // The horn-tower pennant flicks.
  const hx = HORN_TOWER.x, hy = HORN_TOWER.y - 344;
  if (inView(hx, hy, view)) {
    const w = Math.sin(t * 3) * 4;
    g.fillStyle(HUNT_RED, 1); g.fillTriangle(hx, hy, hx + 26, hy + 6 + w, hx, hy + 14);
  }
  // Leaves drifting over the canopy line are the weather's; a few gold ones tumble near the hall.
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.08 + i / 6) % 1;
    const x = LONG_HALL.x - 240 + i * 90 + Math.sin(t + i) * 20, y = LONG_HALL.y - 300 + ph * 380;
    if (!inView(x, y, view)) continue;
    g.fillStyle(i % 2 ? LEAF_GOLD : 0xa4522a, 0.85); g.fillEllipse(x, y, 5, 3);
  }
}

export const WILDHUNT_PAINTER: AreaPainter = {
  ground: paintGround,
  pieces: makePieces(),
  animate,
  animateOver,
};
