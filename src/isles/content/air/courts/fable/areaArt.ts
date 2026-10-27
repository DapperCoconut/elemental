import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { dim, lit, mulberry, type G } from '../../../../art/IsleArt';
import {
  APPLE, BEAN, BEAN_DARK, BRICK, CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM, CLOTH_RED, CLOUD_DEEP, CLOUD_SHADE,
  COBBLE, COBBLE_DARK, EMBER, FLAME, GILT, GILT_DARK, GILT_LIT, INK, INK_SOFT, IRON, IRON_LIT, MEADOW,
  MEADOW_DARK, MEADOW_LIT, MYTH, MYTH_LIT, PAGE, PARCH, PARCH_DARK, PLASTER, SEAL, SKY, SMOKE, STAR, THATCH,
  TIMBER, TIMBER_DARK, beanstalk, bookmark, breathMeter, censorSeal, closedBook, cloudPuff, curledDragon, dist,
  giantBoot, goose, inRect, inView, inkCircle, inkEllipse, inkRect, inked, magicMirror, noise, openBook,
  picketFence, pigHouse, popupHouse, quill, scribble, segDist, storyLamp, storyTree, tornEdge,
} from './util';

/**
 * The Fable Court, painted. A storybook town on Highspire's south-western shoulder, where the
 * land runs out in a torn paper edge over the cloud sea. Prince Legend licenses every tale told
 * here — a story spoken aloud is a long exhale, and exhales are metered — and the town is cast
 * to play his licensed ones over and over.
 *
 * Reading order: the book-arch gate on the Windlass road in the east; Once Street, lined with
 * pop-up houses standing out of open books (the becalmed households' books are shut and clasped
 * with a breath-meter); Pagehall Square with the censors' bonfire of banned stories in its middle;
 * the Office of Licensed Tales and The Last Page bookbindery on its north side; the north road
 * to Slumber with the Banned Shelf behind its book-gate; the mirror garden; the beanstalk climbing
 * off the top of the world and the giant's boot that came down it; the three little houses in the
 * south-east; the gingerbread tollhouse in the Deep Dark Wood; the goose green; the Prince's
 * Playhouse; the chained dragon's tower on the western edge; and Castle Evermore in its moat.
 *
 * Every layout constant is also read by `area.ts` for solids, so a wall drawn is a wall you walk into.
 */

// ── Layout (world px) ───────────────────────────────────────────────

export const AREA_W = 2400;
export const AREA_H = 1600;

/** Where the land ends: x of the west edge at a given y, and y of the south edge at a given x. */
export const westEdge = (y: number): number => 104 + Math.sin(y * 0.011) * 10 + Math.sin(y * 0.037 + 1) * 5;
export const southEdge = (x: number): number => 1474 + Math.sin(x * 0.009) * 10 + Math.sin(x * 0.031 + 2) * 5;

export const MOAT: Rect = { x: 250, y: 160, w: 540, h: 460 };
export const ISLAND: Rect = { x: 300, y: 210, w: 440, h: 360 };
export const BRIDGE: Rect = { x: 490, y: 570, w: 60, h: 50 };
/** The fishing reach of the moat: its south-eastern arm. */
export const FISH_WATER: Rect = { x: 590, y: 572, w: 196, h: 46 };
export const CASTLE: Pt = { x: 520, y: 572 };

export const SQUARE: Pt = { x: 1150, y: 860 };
export const SQUARE_R = 190;
export const BONFIRE: Pt = { x: 1150, y: 864 };
export const OFFICE: Pt = { x: 1000, y: 540 };
export const OFFICE_W = 280;
export const SHOP: Pt = { x: 980, y: 730 };
export const SHOP_W = 200;
export const THEATRE: Pt = { x: 600, y: 930 };
export const THEATRE_W = 250;
export const TOLLHOUSE: Pt = { x: 1180, y: 1350 };
export const COOP: Pt = { x: 690, y: 1250 };
export const GREEN = { x: 840, y: 1250, rx: 150, ry: 80 };
export const PIG_HOUSES: { kind: 'straw' | 'sticks' | 'brick'; x: number; y: number }[] = [
  { kind: 'straw', x: 1540, y: 1250 }, { kind: 'sticks', x: 1730, y: 1285 }, { kind: 'brick', x: 1920, y: 1250 },
];
export const PIG_S = 1.4;
export const TOWER: Pt = { x: 300, y: 1185 };
export const TOWER_R = 62;
export const BEANSTALK: Pt = { x: 1780, y: 370 };
export const BOOT: Pt = { x: 2100, y: 470 };
export const MIRROR: Pt = { x: 1400, y: 540 };
/** The Banned Shelf: a hedged yard of seized books behind a book-gate on the north road. */
export const YARD: Rect = { x: 1350, y: 190, w: 250, h: 190 };
export const YARD_GATE: Rect = { x: 1338, y: 240, w: 24, h: 100 };
export const EAST_GATE: Pt[] = [{ x: 2330, y: 700 }, { x: 2330, y: 902 }];
export const NORTH_GATE: Pt[] = [{ x: 1110, y: 142 }, { x: 1290, y: 142 }];

/** Pop-up houses along Once Street: north side faces down, south side faces up the street. */
export const POPUPS: { x: number; y: number; cover: number; wall: number; roof: number; shut: boolean }[] = [
  { x: 1580, y: 722, cover: CLOTH_BLUE, wall: PLASTER, roof: CLOTH_RED, shut: false },
  { x: 2080, y: 722, cover: CLOTH_GREEN, wall: 0xf4dcc8, roof: 0x5a6aa8, shut: true },
  { x: 1860, y: 1010, cover: CLOTH_PLUM, wall: 0xf0e8c8, roof: 0x4e8a5e, shut: false },
  { x: 2160, y: 1010, cover: CLOTH_RED, wall: PLASTER, roof: 0x8a5a3a, shut: true },
];
export const POPUP_S = 1;
export const LAMPS: Pt[] = [
  { x: 1440, y: 770 }, { x: 1760, y: 770 }, { x: 2000, y: 860 }, { x: 1300, y: 990 }, { x: 990, y: 990 },
  { x: 830, y: 790 }, { x: 1290, y: 700 },
];

export const ROADS: Pt[][] = [
  // Once Street: the Windlass road in from the east to Pagehall Square.
  [{ x: 2420, y: 800 }, { x: 2160, y: 800 }, { x: 1900, y: 806 }, { x: 1620, y: 808 }, { x: 1360, y: 828 }, { x: 1150, y: 860 }],
  // North road to Slumber.
  [{ x: 1150, y: 860 }, { x: 1195, y: 720 }, { x: 1250, y: 560 }, { x: 1260, y: 400 }, { x: 1232, y: 220 }, { x: 1200, y: -20 }],
  // Castle road: west out of the square to the drawbridge.
  [{ x: 1150, y: 860 }, { x: 980, y: 822 }, { x: 790, y: 765 }, { x: 610, y: 712 }, { x: 520, y: 660 }],
  // The dragon road: south-west to the tower.
  [{ x: 1150, y: 860 }, { x: 1000, y: 940 }, { x: 830, y: 1080 }, { x: 620, y: 1170 }, { x: 400, y: 1240 }],
  // Down through the Deep Dark Wood to the tollhouse.
  [{ x: 1150, y: 860 }, { x: 1140, y: 1060 }, { x: 1165, y: 1250 }, { x: 1180, y: 1400 }],
  // Down to the three little houses.
  [{ x: 1640, y: 808 }, { x: 1640, y: 1080 }, { x: 1645, y: 1340 }, { x: 1740, y: 1400 }],
  // Up to the beanstalk and the giant's boot.
  [{ x: 1810, y: 806 }, { x: 1800, y: 620 }, { x: 1780, y: 470 }],
  [{ x: 1800, y: 620 }, { x: 2050, y: 540 }],
  // Theatre front.
  [{ x: 760, y: 1110 }, { x: 640, y: 1010 }],
  // Spur to the mirror garden and the Banned Shelf.
  [{ x: 1250, y: 560 }, { x: 1390, y: 610 }],
  [{ x: 1262, y: 290 }, { x: 1340, y: 290 }],
];
export const ROAD_W = 64;

/** Places trees must keep clear of: NPCs, champions, POIs, quest spots. */
const KEEP_CLEAR: Pt[] = [
  { x: 980, y: 770 }, { x: 1290, y: 940 }, { x: 1030, y: 1240 }, { x: 760, y: 1000 }, { x: 470, y: 1000 },
  { x: 640, y: 740 }, { x: 740, y: 660 }, { x: 1500, y: 880 }, { x: 2060, y: 530 }, { x: 430, y: 1330 },
  { x: 1700, y: 560 }, { x: 900, y: 1150 }, { x: 1730, y: 1390 }, { x: 1390, y: 640 }, { x: 560, y: 1260 },
  { x: 1150, y: 980 }, { x: 1190, y: 1420 }, { x: 600, y: 1010 }, { x: 380, y: 700 }, { x: 520, y: 690 },
  { x: 2220, y: 880 }, { x: 2300, y: 1400 }, { x: 1480, y: 290 }, { x: 720, y: 880 },
  // Collect spots.
  { x: 1150, y: 1080 }, { x: 1110, y: 1180 }, { x: 1250, y: 1225 }, { x: 1030, y: 1305 }, { x: 1320, y: 1300 },
];

/** Keep-out rects (buildings and their forecourts). */
const BUILT: Rect[] = [
  { x: MOAT.x - 30, y: MOAT.y - 40, w: MOAT.w + 60, h: MOAT.h + 110 },
  { x: OFFICE.x - 190, y: OFFICE.y - 250, w: 380, h: 300 },
  { x: SHOP.x - 140, y: SHOP.y - 200, w: 280, h: 240 },
  { x: THEATRE.x - 170, y: THEATRE.y - 230, w: 340, h: 320 },
  { x: TOLLHOUSE.x - 130, y: TOLLHOUSE.y - 190, w: 260, h: 250 },
  { x: GREEN.x - GREEN.rx - 160, y: GREEN.y - GREEN.ry - 40, w: GREEN.rx * 2 + 200, h: GREEN.ry * 2 + 60 },
  { x: 1440, y: 1100, w: 580, h: 260 },
  { x: TOWER.x - 140, y: TOWER.y - 300, w: 280, h: 360 },
  { x: BEANSTALK.x - 120, y: 0, w: 240, h: BEANSTALK.y + 60 },
  { x: BOOT.x - 170, y: BOOT.y - 260, w: 340, h: 320 },
  { x: MIRROR.x - 90, y: MIRROR.y - 190, w: 180, h: 240 },
  { x: YARD.x - 30, y: YARD.y - 30, w: YARD.w + 60, h: YARD.h + 60 },
  { x: SQUARE.x - SQUARE_R - 20, y: SQUARE.y - SQUARE_R - 20, w: SQUARE_R * 2 + 40, h: SQUARE_R * 2 + 40 },
  ...POPUPS.map((h) => ({ x: h.x - 130, y: h.y - 220, w: 260, h: 260 })),
];

export interface TreeSpot { x: number; y: number; s: number; kind: 'round' | 'poplar'; tint: number }

/** Storybook trees: thick along the north rim and through the Deep Dark Wood, thin elsewhere. */
export const TREES: TreeSpot[] = (() => {
  const rng = mulberry(4417);
  const out: TreeSpot[] = [];
  const ok = (x: number, y: number, r: number): boolean => {
    if (x < westEdge(y) + 40 || x > AREA_W - 40 || y < 60 || y > southEdge(x) - 30) return false;
    if (x > AREA_W - 200 && Math.abs(y - 800) < 170) return false;
    if (y < 260 && Math.abs(x - 1200) < 150) return false;
    for (const rd of ROADS) for (let i = 0; i < rd.length - 1; i++) if (segDist(x, y, rd[i].x, rd[i].y, rd[i + 1].x, rd[i + 1].y) < ROAD_W / 2 + r + 24) return false;
    for (const b of BUILT) if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return false;
    for (const k of KEEP_CLEAR) if (dist(x, y, k.x, k.y) < 100 + r) return false;
    for (const t of out) if (dist(x, y, t.x, t.y) < (t.s + r) * 0.7 + 34) return false;
    return true;
  };
  for (let i = 0; i < 1600 && out.length < 92; i++) {
    const zone = rng();
    let x: number, y: number;
    if (zone < 0.35) { x = 140 + rng() * (AREA_W - 180); y = 60 + rng() * 110; }
    else if (zone < 0.6) { x = 880 + rng() * 560; y = 1080 + rng() * 360; }
    else { x = rng() * AREA_W; y = rng() * AREA_H; }
    const s = 30 + rng() * 22;
    const wood = x > 880 && x < 1440 && y > 1080;
    if (ok(x, y, s * 0.28)) out.push({ x, y, s, kind: rng() < (wood ? 0.3 : 0.6) ? 'round' : 'poplar', tint: wood ? 0x2a4a3a : rng() < 0.2 ? 0xc8a040 : 0 });
  }
  return out;
})();

// ── Ground ──────────────────────────────────────────────────────────

function landPoly(): Pt[] {
  const pts: Pt[] = [{ x: westEdge(-10), y: -10 }, { x: AREA_W + 10, y: -10 }, { x: AREA_W + 10, y: southEdge(AREA_W) }];
  for (let x = AREA_W; x >= westEdge(1500); x -= 30) pts.push({ x, y: southEdge(x) });
  for (let y = southEdge(westEdge(1480)); y >= -10; y -= 30) pts.push({ x: westEdge(y), y });
  return pts;
}

/** A lane: an ink-edged band of pale storybook cobbles laid in neat rows like lines of type. */
function lane(g: G, pts: Pt[], w: number, rng: () => number): void {
  const strokePts = (ww: number, c: number, a: number): void => {
    g.lineStyle(ww, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.fillStyle(c, a); for (const p of pts) g.fillCircle(p.x, p.y, ww / 2);
  };
  strokePts(w + 6, INK, 0.55);
  strokePts(w, COBBLE, 1);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1), nx = -uy, ny = ux;
    for (let d = 0; d < len; d += 11) {
      for (let r = -2; r <= 2; r++) {
        const off = r * (w / 5.4) + ((Math.floor(d / 11) % 2) ? 3 : -3);
        const x = a.x + ux * d + nx * off, y = a.y + uy * d + ny * off;
        g.fillStyle(rng() < 0.5 ? lit(COBBLE, 0.12) : dim(COBBLE, 0.06), 0.9);
        g.fillRoundedRect(x - 4.5, y - 3, 9, 6, 2.4);
        g.lineStyle(0.8, COBBLE_DARK, 0.5); g.strokeRoundedRect(x - 4.5, y - 3, 9, 6, 2.4);
      }
    }
  }
}

function paintGround(g: G, rng: () => number): void {
  // Sky and the cloud sea below the torn edge (everything outside the land).
  g.fillStyle(SKY, 1); g.fillRect(-200, -200, AREA_W + 400, AREA_H + 400);
  for (let i = 0; i < 140; i++) {
    const side = rng() < 0.55;
    const x = side ? rng() * 140 - 40 : rng() * AREA_W;
    const y = side ? rng() * AREA_H : 1450 + rng() * 200;
    cloudPuff(g, x, y, 30 + rng() * 50, 0.9, rng() < 0.5 ? CLOUD_SHADE : CLOUD_DEEP);
  }
  // The land: parchment under a watercolour meadow wash.
  const land = landPoly();
  inked(g, land, PARCH, 1, 2);
  for (let i = 0; i < 260; i++) {
    const x = rng() * AREA_W, y = rng() * AREA_H;
    if (x < westEdge(y) + 30 || y > southEdge(x) - 20) continue;
    g.fillStyle(rng() < 0.6 ? MEADOW : rng() < 0.5 ? MEADOW_LIT : MEADOW_DARK, 0.35 + rng() * 0.3);
    g.fillEllipse(x, y, 90 + rng() * 220, 40 + rng() * 90);
  }
  // Watercolour blooms: pale rings where the wash dried.
  for (let i = 0; i < 90; i++) {
    const x = rng() * AREA_W, y = rng() * AREA_H;
    if (x < westEdge(y) + 30 || y > southEdge(x) - 20) continue;
    g.lineStyle(2, dim(MEADOW, 0.2), 0.25); g.strokeEllipse(x, y, 60 + rng() * 120, 26 + rng() * 50);
  }
  // Grass strokes: little ink ticks, like a pen hatching a meadow.
  for (let i = 0; i < 2600; i++) {
    const x = rng() * AREA_W, y = rng() * AREA_H;
    if (x < westEdge(y) + 20 || y > southEdge(x) - 14) continue;
    g.lineStyle(1, rng() < 0.7 ? MEADOW_DARK : INK_SOFT, 0.35);
    g.lineBetween(x, y, x - 1 + rng() * 2, y - 4 - rng() * 3);
  }
  // Wildflowers: dots of red, gold and blue.
  for (let i = 0; i < 420; i++) {
    const x = rng() * AREA_W, y = rng() * AREA_H;
    if (x < westEdge(y) + 30 || y > southEdge(x) - 20) continue;
    g.fillStyle([CLOTH_RED, GILT_LIT, 0x7aa0e8, PAGE][Math.floor(rng() * 4)], 0.8); g.fillCircle(x, y, 1.8 + rng() * 1.4);
  }
  // The torn edge, west and south.
  const west: Pt[] = []; for (let y = -10; y <= southEdge(westEdge(1480)); y += 24) west.push({ x: westEdge(y), y });
  const south: Pt[] = []; for (let x = westEdge(1480); x <= AREA_W + 10; x += 24) south.push({ x, y: southEdge(x) });
  tornEdge(g, west, -1, 0, rng);
  tornEdge(g, south, 0, 1, rng);

  // The Deep Dark Wood's floor: a darker wash, fallen leaves.
  for (let i = 0; i < 40; i++) {
    g.fillStyle(rng() < 0.5 ? 0x3a5a3e : 0x2e4a36, 0.3);
    g.fillEllipse(880 + rng() * 560, 1100 + rng() * 340, 80 + rng() * 120, 40 + rng() * 60);
  }
  // The goose green: a cropped oval with a dew-pond.
  g.fillStyle(MEADOW_LIT, 0.8); g.fillEllipse(GREEN.x, GREEN.y, GREEN.rx * 2, GREEN.ry * 2);
  g.lineStyle(2, INK, 0.35); g.strokeEllipse(GREEN.x, GREEN.y, GREEN.rx * 2, GREEN.ry * 2);
  inkEllipse(g, GREEN.x + 60, GREEN.y + 20, 70, 30, 0x8ac8e8, 1, 1.6);
  g.fillStyle(0xffffff, 0.5); g.fillEllipse(GREEN.x + 50, GREEN.y + 14, 30, 6);
  for (let i = 0; i < 30; i++) { g.fillStyle(PAGE, 0.8); g.fillEllipse(GREEN.x + (rng() - 0.5) * GREEN.rx * 1.6, GREEN.y + (rng() - 0.5) * GREEN.ry * 1.4, 4, 2); }

  // Roads.
  for (const rd of ROADS) lane(g, rd, ROAD_W, rng);

  // Pagehall Square: a rosette of cobbles in rings, like the ornament at a chapter's end.
  inkCircle(g, SQUARE.x, SQUARE.y, SQUARE_R, COBBLE, 1, 3);
  for (let r = 24; r < SQUARE_R - 6; r += 13) {
    const n = Math.floor((Math.PI * 2 * r) / 12);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r * 0.1;
      const x = SQUARE.x + Math.cos(a) * r, y = SQUARE.y + Math.sin(a) * r;
      g.fillStyle((Math.floor(r / 13) % 3 === 0) ? PARCH_DARK : rng() < 0.5 ? lit(COBBLE, 0.12) : COBBLE, 1);
      g.fillCircle(x, y, 4.6);
      g.lineStyle(0.7, COBBLE_DARK, 0.5); g.strokeCircle(x, y, 4.6);
    }
  }
  g.lineStyle(2, INK, 0.5); g.strokeCircle(SQUARE.x, SQUARE.y, SQUARE_R - 18);
  // Fleurons at the four quarters.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const x = SQUARE.x + Math.cos(a) * (SQUARE_R - 9), y = SQUARE.y + Math.sin(a) * (SQUARE_R - 9);
    g.fillStyle(INK, 0.6); g.fillCircle(x, y, 5);
    g.fillTriangle(x - 4, y, x + 4, y, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
  }
  // Scorch round the bonfire, ash and half-burnt pages blown out across the stones.
  g.fillStyle(0x2a2228, 0.55); g.fillCircle(BONFIRE.x, BONFIRE.y, 74);
  g.fillStyle(0x3a3036, 0.4); g.fillCircle(BONFIRE.x, BONFIRE.y, 96);
  for (let i = 0; i < 40; i++) {
    const a = rng() * Math.PI * 2, r = 50 + rng() * 120;
    const x = BONFIRE.x + Math.cos(a) * r, y = BONFIRE.y + Math.sin(a) * r * 0.8;
    const rot = rng() * Math.PI;
    const c = Math.cos(rot), s = Math.sin(rot);
    g.fillStyle(PAGE, 0.85);
    g.fillTriangle(x - c * 6 + s * 4, y - s * 6 - c * 4, x + c * 6 + s * 4, y + s * 6 - c * 4, x + c * 6 - s * 4, y + s * 6 + c * 4);
    g.fillTriangle(x - c * 6 + s * 4, y - s * 6 - c * 4, x + c * 6 - s * 4, y + s * 6 + c * 4, x - c * 6 - s * 4, y - s * 6 + c * 4);
    g.fillStyle(0x2a2228, 0.7); g.fillCircle(x + c * 4, y + s * 4, 3);
  }

  // The moat: water all round the island, a stone kerb, the drawbridge.
  inkRect(g, MOAT.x - 8, MOAT.y - 8, MOAT.w + 16, MOAT.h + 16, 0xb8ac94, 1, 2);
  for (let x = MOAT.x - 6; x < MOAT.x + MOAT.w + 6; x += 18) { g.lineStyle(1, 0x8a7e66, 0.8); g.lineBetween(x, MOAT.y - 8, x, MOAT.y - 2); g.lineBetween(x, MOAT.y + MOAT.h + 2, x, MOAT.y + MOAT.h + 8); }
  g.fillStyle(0x4a8ab0, 1); g.fillRect(MOAT.x, MOAT.y, MOAT.w, MOAT.h);
  g.fillStyle(0x3a7098, 1); g.fillRect(MOAT.x + 10, MOAT.y + 10, MOAT.w - 20, MOAT.h - 20);
  for (let i = 0; i < 60; i++) {
    const x = MOAT.x + rng() * MOAT.w, y = MOAT.y + rng() * MOAT.h;
    if (inRect(x, y, ISLAND)) continue;
    g.lineStyle(1.4, 0x9ad0f0, 0.5); g.lineBetween(x, y, x + 10 + rng() * 14, y);
  }
  // Lily pads on the moat.
  for (let i = 0; i < 18; i++) {
    const side = Math.floor(rng() * 4);
    const x = side < 2 ? MOAT.x + 25 + rng() * (MOAT.w - 50) : side === 2 ? MOAT.x + 22 : MOAT.x + MOAT.w - 22;
    const y = side >= 2 ? MOAT.y + 25 + rng() * (MOAT.h - 50) : side === 0 ? MOAT.y + 22 : MOAT.y + MOAT.h - 22;
    g.fillStyle(MEADOW_DARK, 1); g.fillCircle(x, y, 7 + rng() * 4);
    g.fillStyle(0x3a7098, 1); g.fillTriangle(x, y, x + 9, y - 3, x + 9, y + 3);
    if (rng() < 0.3) { g.fillStyle(0xf4c8d8, 1); g.fillCircle(x - 2, y - 2, 3); }
  }
  // The island: a castle lawn with a ring of gravel.
  inkRect(g, ISLAND.x, ISLAND.y, ISLAND.w, ISLAND.h, MEADOW, 1, 2);
  g.fillStyle(PARCH_DARK, 0.7); g.fillRect(ISLAND.x + 10, ISLAND.y + ISLAND.h - 40, ISLAND.w - 20, 30);
  // Drawbridge: planks over the water, chains up to the gate.
  inkRect(g, BRIDGE.x, BRIDGE.y - 4, BRIDGE.w, BRIDGE.h + 8, TIMBER, 1, 2);
  for (let y = BRIDGE.y; y < BRIDGE.y + BRIDGE.h + 4; y += 8) { g.lineStyle(1.2, TIMBER_DARK, 0.9); g.lineBetween(BRIDGE.x, y, BRIDGE.x + BRIDGE.w, y); }
  for (let k = 0; k < 4; k++) { g.fillStyle(IRON, 1); g.fillCircle(BRIDGE.x + 6 + k * 16, BRIDGE.y + BRIDGE.h, 2); }

  // The Banned Shelf's yard floor: flagstones scattered with dropped pages.
  inkRect(g, YARD.x, YARD.y, YARD.w, YARD.h, 0xc8b898, 1, 2);
  for (let y = YARD.y + 4; y < YARD.y + YARD.h - 4; y += 22) for (let x = YARD.x + 4 + ((y / 22) % 2) * 11; x < YARD.x + YARD.w - 20; x += 22) {
    g.fillStyle(rng() < 0.5 ? 0xd8c8a8 : 0xb8a888, 1); g.fillRect(x, y, 19, 19);
  }
  for (let i = 0; i < 14; i++) { g.fillStyle(PAGE, 0.9); g.fillRect(YARD.x + 20 + rng() * (YARD.w - 40), YARD.y + 20 + rng() * (YARD.h - 40), 10, 7); }

  // The giant's footprint pressed into the meadow by the boot — a sole-shaped hollow, hobnail dents.
  const fx = 1960, fy = 640;
  g.fillStyle(MEADOW_DARK, 0.6); g.fillEllipse(fx, fy, 200, 70); g.fillEllipse(fx - 120, fy + 6, 80, 54);
  g.lineStyle(2, INK, 0.4); g.strokeEllipse(fx, fy, 200, 70); g.strokeEllipse(fx - 120, fy + 6, 80, 54);
  for (let k = 0; k < 10; k++) { g.fillStyle(INK, 0.3); g.fillCircle(fx - 140 + k * 26, fy + Math.sin(k) * 14, 3); }
  // A puddle in the toe.
  g.fillStyle(0x8ac8e8, 0.7); g.fillEllipse(fx + 50, fy + 6, 60, 22);

  // The theatre's front: a half-moon of trodden earth for the audience.
  g.fillStyle(PARCH_DARK, 0.6); g.fillEllipse(THEATRE.x, THEATRE.y + 60, 300, 110);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) {
    const x = THEATRE.x - 105 + k * 35, y = THEATRE.y + 64 + r * 22;
    inkRect(g, x - 12, y - 4, 24, 8, TIMBER, 1, 1.2);
  }
  // The dragon tower's ground: scorched stones and a scatter of coins nobody dares to pick up.
  g.fillStyle(0x6a5e56, 0.5); g.fillCircle(TOWER.x, TOWER.y, TOWER_R + 70);
  for (let i = 0; i < 30; i++) { const a = rng() * Math.PI * 2, r = TOWER_R + 10 + rng() * 60; g.fillStyle(GILT, 0.9); g.fillEllipse(TOWER.x + Math.cos(a) * r, TOWER.y + Math.sin(a) * r * 0.7, 6, 3.5); }
  // Under the beanstalk: torn-up turf and huge roots.
  g.fillStyle(0x6a5232, 0.6); g.fillEllipse(BEANSTALK.x, BEANSTALK.y + 6, 220, 70);
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.02 + k * 0.16);
    g.lineStyle(10, BEAN_DARK, 1); g.lineBetween(BEANSTALK.x, BEANSTALK.y, BEANSTALK.x + Math.cos(a) * 110, BEANSTALK.y + Math.sin(a) * 30 + 8);
    g.lineStyle(6, BEAN, 1); g.lineBetween(BEANSTALK.x, BEANSTALK.y - 1, BEANSTALK.x + Math.cos(a) * 106, BEANSTALK.y + Math.sin(a) * 30 + 6);
  }
}

// ── Set pieces ──────────────────────────────────────────────────────

/** Castle Evermore: a pale fairy-tale keep with blue cone roofs, a gate over the drawbridge. */
function castle(g: G, rng: () => number): void {
  const { x, y } = CASTLE;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 2, 460, 40);
  const stone = 0xe8e0d0, stoneDark = 0xb8ac98, roof = 0x3e5c9a;
  const tower = (tx: number, ty: number, w: number, h: number, coneH: number): void => {
    inkRect(g, tx - w / 2, ty - h, w, h, stone, 1, 2);
    for (let k = 0; k < h / 16; k++) { g.lineStyle(1, stoneDark, 0.6); g.lineBetween(tx - w / 2, ty - k * 16, tx + w / 2, ty - k * 16); }
    g.fillStyle(lit(stone, 0.3), 0.6); g.fillRect(tx - w / 2 + 3, ty - h, w * 0.18, h);
    inked(g, [{ x: tx - w / 2 - 8, y: ty - h }, { x: tx + w / 2 + 8, y: ty - h }, { x: tx, y: ty - h - coneH }], roof, 1, 2);
    g.fillStyle(lit(roof, 0.25), 1); g.fillTriangle(tx - w / 2 - 4, ty - h, tx - w * 0.15, ty - h, tx, ty - h - coneH + 6);
    // Pennant on top.
    g.lineStyle(1.6, INK, 1); g.lineBetween(tx, ty - h - coneH, tx, ty - h - coneH - 22);
    g.fillStyle(GILT, 1); g.fillTriangle(tx, ty - h - coneH - 22, tx + 18, ty - h - coneH - 17, tx, ty - h - coneH - 12);
    // Arrow-slit windows.
    for (let k = 0; k < 2; k++) { g.fillStyle(INK, 1); g.fillRoundedRect(tx - 3, ty - h * (0.35 + k * 0.3), 6, 14, 3); }
  };
  // Back towers, curtain wall, front towers.
  tower(x - 150, y - 90, 54, 220, 90);
  tower(x + 150, y - 90, 54, 220, 90);
  tower(x, y - 120, 90, 270, 130);
  inkRect(g, x - 210, y - 140, 420, 140, stone, 1, 2.4);
  for (let k = 0; k < 9; k++) { g.lineStyle(1, stoneDark, 0.6); g.lineBetween(x - 210, y - k * 16, x + 210, y - k * 16); }
  for (let k = 0; k < 14; k++) inkRect(g, x - 208 + k * 30, y - 156, 18, 16, stone, 1, 1.4);
  tower(x - 200, y, 64, 190, 100);
  tower(x + 200, y, 64, 190, 100);
  // The gatehouse: a big round arch, portcullis teeth, a storybook-gilt title over it.
  inkRect(g, x - 52, y - 120, 104, 120, stoneDark, 1, 2);
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 32, y - 82, 64, 82, { tl: 32, tr: 32, bl: 0, br: 0 });
  g.lineStyle(2.4, IRON_LIT, 1);
  for (let k = 0; k < 6; k++) g.lineBetween(x - 26 + k * 10.4, y - 74 + (k === 0 || k === 5 ? 12 : 0), x - 26 + k * 10.4, y - 34);
  g.lineBetween(x - 30, y - 60, x + 30, y - 60); g.lineBetween(x - 30, y - 44, x + 30, y - 44);
  for (let k = 0; k < 6; k++) g.fillTriangle(x - 29 + k * 10.4, y - 34, x - 23 + k * 10.4, y - 34, x - 26 + k * 10.4, y - 26);
  // The title plate: an open book carved over the gate.
  openBook(g, x, y - 92, 64, 22, GILT, 1, true, 9);
  // Banners: the Prince's starry-dark with a gold book on each.
  for (const bx of [x - 120, x + 120]) {
    inked(g, [{ x: bx - 16, y: y - 136 }, { x: bx + 16, y: y - 136 }, { x: bx + 16, y: y - 50 }, { x: bx, y: y - 62 }, { x: bx - 16, y: y - 50 }], 0x1a1438, 1, 1.6);
    for (let k = 0; k < 5; k++) { g.fillStyle(0xfff4c8, 0.9); g.fillCircle(bx - 10 + rng() * 20, y - 128 + rng() * 60, 1.2); }
    closedBook(g, bx, y - 88, 18, 14, GILT, 1, MYTH_LIT);
  }
}

/** The Office of Licensed Tales: a squat stamp-office, its frontage papered with licences. */
function office(g: G, rng: () => number): void {
  const { x, y } = OFFICE;
  const w = OFFICE_W, h = 150;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 4, w * 1.15, 30);
  inkRect(g, x - w / 2, y - h, w, h, 0xd8c8b0, 1, 2.4);
  for (let k = 0; k < 9; k++) { g.lineStyle(1, 0xa89a80, 0.6); g.lineBetween(x - w / 2, y - k * 17, x + w / 2, y - k * 17); }
  // Mansard roof in seal-red slate, with dormers.
  inked(g, [{ x: x - w / 2 - 14, y: y - h }, { x: x + w / 2 + 14, y: y - h }, { x: x + w / 2 - 20, y: y - h - 70 }, { x: x - w / 2 + 20, y: y - h - 70 }], 0x7a2a30, 1, 2.4);
  for (let r = 1; r < 5; r++) { g.lineStyle(1, 0x5a1a20, 0.8); g.lineBetween(x - w / 2 - 14 + r * 8, y - h - r * 14, x + w / 2 + 14 - r * 8, y - h - r * 14); }
  for (const dx of [-80, 0, 80]) {
    inkRect(g, x + dx - 14, y - h - 52, 28, 28, 0xd8c8b0, 1, 1.6);
    g.fillStyle(0xffe6a0, 1); g.fillRect(x + dx - 8, y - h - 46, 16, 18);
  }
  // The great rubber stamp on the roof-ridge: the censors' sign.
  inkRect(g, x - 16, y - h - 104, 32, 34, TIMBER, 1, 2);
  inkEllipse(g, x, y - h - 106, 30, 14, TIMBER_DARK, 1, 1.6);
  inkRect(g, x - 26, y - h - 72, 52, 8, SEAL, 1, 1.6);
  // Licences pasted on the frontage, each with a red seal.
  for (let k = 0; k < 9; k++) {
    const lx = x - w / 2 + 18 + (k % 5) * 24 + (k >= 5 ? 150 : 0), ly = y - h + 22 + Math.floor(k / 5) * 0 + (k % 2) * 16;
    if (Math.abs(lx - x) < 40) continue;
    inkRect(g, lx - 9, ly, 18, 24, PAGE, 1, 1);
    scribble(g, lx - 6, ly + 5, 12, 3, 4, INK_SOFT, 0.5, k * 3, 0.8);
    g.fillStyle(SEAL, 1); g.fillCircle(lx + 4, ly + 20, 3);
  }
  // Door with a speaking-grille, and a huge breath-meter clock over it.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22, y - 62, 44, 62);
  g.lineStyle(2, INK, 1); g.strokeRect(x - 22, y - 62, 44, 62);
  g.fillStyle(IRON, 1); g.fillRect(x - 10, y - 46, 20, 10);
  g.lineStyle(1, IRON_LIT, 1); for (let k = 0; k < 4; k++) g.lineBetween(x - 8 + k * 5, y - 46, x - 8 + k * 5, y - 36);
  breathMeter(g, x, y - 96, 22, 0.32);
  // A sandwich board: the day's licensed tales.
  inked(g, [{ x: x + 70, y }, { x: x + 100, y }, { x: x + 92, y: y - 46 }, { x: x + 78, y: y - 46 }], PAGE, 1, 1.4);
  scribble(g, x + 80, y - 38, 14, 4, 7, INK, 0.7, 77, 1);
  censorSeal(g, x + 85, y - 8, 4);
  void rng;
}

/** The Last Page: a narrow, leaning bookbindery, its bay window stacked with spines. */
function shop(g: G, rng: () => number): void {
  const { x, y } = SHOP;
  const w = SHOP_W, h = 120;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 3, w * 1.15, 26);
  inked(g, [{ x: x - w / 2, y }, { x: x + w / 2, y }, { x: x + w / 2 + 6, y: y - h }, { x: x - w / 2 + 4, y: y - h - 4 }], 0x4e6a8a, 1, 2.4);
  // Steep gable, a crooked chimney.
  inked(g, [{ x: x - w / 2 - 10, y: y - h - 2 }, { x: x + w / 2 + 14, y: y - h + 2 }, { x: x + 6, y: y - h - 90 }], 0x6a3a2a, 1, 2.4);
  for (let r = 1; r < 6; r++) { g.lineStyle(1, 0x4a2618, 0.8); g.lineBetween(x - w / 2 - 10 + r * 18, y - h - r * 15, x + w / 2 + 14 - r * 18, y - h - r * 15); }
  inkRect(g, x + 40, y - h - 70, 18, 46, BRICK, 1, 1.6);
  // Bay window full of books.
  inkRect(g, x - 82, y - 92, 100, 66, 0xffe6a0, 1, 2);
  for (let r = 0; r < 3; r++) {
    let bx = x - 78;
    while (bx < x + 12) {
      const bw = 5 + rng() * 6, bh = 14 + rng() * 6;
      g.fillStyle([CLOTH_RED, CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM, GILT_DARK][Math.floor(rng() * 5)], 1);
      g.fillRect(bx, y - 92 + 6 + r * 21 + (20 - bh), bw, bh);
      g.fillStyle(GILT_LIT, 0.8); g.fillRect(bx + 1, y - 92 + 6 + r * 21 + (20 - bh) + 3, bw - 2, 1.4);
      bx += bw + 1;
    }
    g.fillStyle(TIMBER, 1); g.fillRect(x - 80, y - 92 + 26 + r * 21, 96, 2);
  }
  g.lineStyle(2, INK, 1); g.strokeRect(x - 82, y - 92, 100, 66);
  // Door and a hanging sign: an open book with a quill.
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x + 36, y - 60, 34, 60, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.lineStyle(2, INK, 1); g.strokeRoundedRect(x + 36, y - 60, 34, 60, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.lineStyle(2, IRON, 1); g.lineBetween(x + w / 2 + 4, y - 100, x + w / 2 + 40, y - 100);
  g.lineBetween(x + w / 2 + 20, y - 100, x + w / 2 + 20, y - 92); g.lineBetween(x + w / 2 + 36, y - 100, x + w / 2 + 36, y - 92);
  inkRect(g, x + w / 2 + 12, y - 92, 34, 26, PAGE, 1, 1.4);
  openBook(g, x + w / 2 + 29, y - 70, 24, 14, CLOTH_RED, 1, false);
  quill(g, x + w / 2 + 38, y - 76, 2.2, 10);
}

/** The Prince's Playhouse: a striped tent-theatre, curtains drawn back on a painted backdrop. */
function theatre(g: G, rng: () => number): void {
  const { x, y } = THEATRE;
  const w = THEATRE_W, h = 130;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 3, w * 1.2, 30);
  // The stage: a raised platform with footlights.
  inkRect(g, x - w / 2, y - 30, w, 30, TIMBER, 1, 2.4);
  for (let k = 0; k < 9; k++) { g.fillStyle(0xffe6a0, 1); g.fillCircle(x - w / 2 + 16 + k * ((w - 32) / 8), y - 30, 3.4); }
  // Proscenium and the backdrop: a painted castle in clouds.
  inkRect(g, x - w / 2 + 16, y - 30 - h, w - 32, h, SKY, 1, 2);
  cloudPuff(g, x - 50, y - 70, 26, 1); cloudPuff(g, x + 60, y - 110, 20, 1);
  g.fillStyle(PAGE, 1); g.fillRect(x - 14, y - 120, 28, 60); g.fillTriangle(x - 20, y - 120, x + 20, y - 120, x, y - 150);
  // Striped canopy.
  for (let k = 0; k < 10; k++) {
    const sx = x - w / 2 - 10 + k * ((w + 20) / 10);
    g.fillStyle(k % 2 ? CLOTH_RED : PAGE, 1);
    g.fillTriangle(sx, y - 30 - h, sx + (w + 20) / 10, y - 30 - h, x, y - 30 - h - 70);
    g.fillRect(sx, y - 30 - h, (w + 20) / 10, 16);
  }
  g.lineStyle(2, INK, 0.85);
  g.strokeTriangle(x - w / 2 - 10, y - 30 - h, x + w / 2 + 10, y - 30 - h, x, y - 30 - h - 70);
  g.strokeRect(x - w / 2 - 10, y - 30 - h, w + 20, 16);
  // Scalloped valance.
  for (let k = 0; k < 12; k++) { const sx = x - w / 2 - 6 + k * ((w + 12) / 12); g.fillStyle(CLOTH_RED, 1); g.fillCircle(sx + 10, y - 30 - h + 16, 10); }
  // Curtains drawn back, tied with gold rope.
  for (const side of [-1, 1]) {
    const cx = x + side * (w / 2 - 16);
    inked(g, [{ x: cx, y: y - 30 - h + 16 }, { x: cx - side * 40, y: y - 30 - h + 16 }, { x: cx - side * 14, y: y - 70 }, { x: cx - side * 18, y: y - 30 }, { x: cx, y: y - 30 }], 0x8a1a2a, 1, 1.8);
    g.lineStyle(3, GILT, 1); g.lineBetween(cx - side * 12, y - 78, cx - side * 2, y - 72);
  }
  // Puppet bar overhead with strings hanging slack: the cast is resting.
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x - 60, y - 30 - h + 30, x + 60, y - 30 - h + 30);
  g.lineStyle(1, INK_SOFT, 0.7);
  for (let k = 0; k < 7; k++) g.lineBetween(x - 54 + k * 18, y - 30 - h + 30, x - 54 + k * 18 + (rng() - 0.5) * 6, y - 60 - rng() * 20);
  // Playbill on a post.
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + w / 2 + 24, y, x + w / 2 + 24, y - 70);
  inkRect(g, x + w / 2 + 10, y - 78, 28, 36, PAGE, 1, 1.4);
  scribble(g, x + w / 2 + 14, y - 70, 20, 3, 7, INK, 0.7, 51, 1);
  censorSeal(g, x + w / 2 + 30, y - 48, 4);
}

/** The gingerbread tollhouse in the Deep Dark Wood: iced roof, candy posts, a toll-bar of barley sugar. */
function tollhouse(g: G, rng: () => number): void {
  const { x, y } = TOLLHOUSE;
  const w = 170, h = 96;
  const ginger = 0xb87a3e;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 3, w * 1.2, 24);
  inkRect(g, x - w / 2, y - h, w, h, ginger, 1, 2.4);
  for (let i = 0; i < 40; i++) { g.fillStyle(dim(ginger, 0.25), 0.7); g.fillCircle(x - w / 2 + 6 + rng() * (w - 12), y - h + 6 + rng() * (h - 12), 1.2); }
  // Iced roof with drips.
  inked(g, [{ x: x - w / 2 - 14, y: y - h + 4 }, { x: x + w / 2 + 14, y: y - h + 4 }, { x, y: y - h - 76 }], 0x8a4a2a, 1, 2.4);
  g.fillStyle(PAGE, 1);
  for (let k = 0; k < 12; k++) {
    const t = k / 11, ex = x - w / 2 - 14 + t * (w + 28);
    g.fillCircle(ex, y - h + 4, 6); g.fillRect(ex - 2, y - h + 4, 4, 6 + noise(k * 3) * 10);
  }
  g.lineStyle(5, PAGE, 1); g.lineBetween(x - w / 2 - 10, y - h + 1, x, y - h - 72); g.lineBetween(x + w / 2 + 10, y - h + 1, x, y - h - 72);
  // Gumdrops on the roof.
  for (let k = 0; k < 9; k++) { const t = 0.15 + rng() * 0.7, side = rng() < 0.5 ? -1 : 1; g.fillStyle([CLOTH_RED, 0x6ac85a, GILT_LIT, 0xe87ab8][k % 4], 1); g.fillCircle(x + side * (w / 2 + 10) * (1 - t) * rng(), y - h - 72 * t, 5); }
  // Candy-cane posts and a barley-sugar toll-bar across the lane.
  for (const side of [-1, 1]) {
    const px = x + side * (w / 2 + 26);
    g.lineStyle(7, INK, 0.8); g.lineBetween(px, y + 2, px, y - 70);
    g.lineStyle(5, PAGE, 1); g.lineBetween(px, y + 2, px, y - 70);
    for (let k = 0; k < 7; k++) { g.lineStyle(5, CLOTH_RED, 1); g.lineBetween(px - 2.5, y - k * 10, px + 2.5, y - k * 10 - 5); }
    g.lineStyle(5, PAGE, 1); g.beginPath(); g.arc(px - side * 8, y - 70, 8, Math.PI, 0, side > 0); g.strokePath();
  }
  // Windows of spun sugar, a door of chocolate with a peppermint knocker.
  for (const dx of [-50, 50]) {
    g.fillStyle(0xd8f0ff, 0.9); g.fillRect(x + dx - 13, y - 70, 26, 24);
    g.lineStyle(2, INK, 1); g.strokeRect(x + dx - 13, y - 70, 26, 24);
    g.lineStyle(3, PAGE, 1); g.strokeRect(x + dx - 15, y - 72, 30, 28);
  }
  g.fillStyle(0x4a2a18, 1); g.fillRoundedRect(x - 16, y - 54, 32, 54, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.lineStyle(2, INK, 1); g.strokeRoundedRect(x - 16, y - 54, 32, 54, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(PAGE, 1); g.fillCircle(x + 8, y - 28, 4); g.fillStyle(CLOTH_RED, 1); g.fillTriangle(x + 8, y - 28, x + 12, y - 30, x + 10, y - 24);
  // The toll-board: a breath-meter hung on a sugar chain.
  breathMeter(g, x, y - h - 18, 13, 0.82);
}

/** The goose coop and its little picket run. */
function coop(g: G): void {
  const { x, y } = COOP;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 3, 120, 22);
  inkRect(g, x - 44, y - 50, 88, 50, 0xd8c09a, 1, 2);
  inked(g, [{ x: x - 54, y: y - 48 }, { x: x + 54, y: y - 48 }, { x, y: y - 92 }], THATCH, 1, 2);
  g.lineStyle(1, 0xa07e30, 0.8); for (let k = 0; k < 8; k++) g.lineBetween(x - 46 + k * 12, y - 48, x - 4 + k * 1.5, y - 86);
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 12, y - 28, 24, 28, { tl: 12, tr: 12, bl: 0, br: 0 });
  inked(g, [{ x: x - 12, y }, { x: x + 12, y }, { x: x + 20, y: y + 18 }, { x: x - 20, y: y + 18 }], TIMBER, 1, 1.2);
  // A nest box with one plain egg — and one gold one.
  inkEllipse(g, x + 30, y - 12, 24, 10, THATCH, 1, 1.2);
  g.fillStyle(PAGE, 1); g.fillEllipse(x + 26, y - 15, 7, 9); g.fillStyle(GILT, 1); g.fillEllipse(x + 34, y - 15, 7, 9);
  picketFence(g, { x: x - 70, y: y + 30 }, { x: x - 70, y: y - 30 });
}

/** The chained dragon's tower: a tall round tower of storybook stone, iron chains pegged to the ground. */
function tower(g: G, rng: () => number): void {
  const { x, y } = TOWER;
  const R = TOWER_R, h = 380;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 10, y + 4, R * 2.6, 40);
  const stone = 0xc8bcaa;
  inkRect(g, x - R, y - h, R * 2, h, stone, 1, 2.6);
  for (let r = 0; r < h / 22; r++) {
    const yy = y - r * 22;
    g.lineStyle(1, dim(stone, 0.3), 0.8); g.lineBetween(x - R, yy, x + R, yy);
    for (let xx = x - R + ((r % 2) * 14); xx < x + R; xx += 28) g.lineBetween(xx, yy, xx, yy - 22);
  }
  g.fillStyle(lit(stone, 0.3), 0.5); g.fillRect(x - R + 6, y - h, R * 0.4, h);
  g.fillStyle(0x000000, 0.12); g.fillRect(x + R * 0.4, y - h, R * 0.6, h);
  // Scorch marks up one side, and ivy on the other.
  for (let k = 0; k < 6; k++) { g.fillStyle(0x2a2228, 0.4); g.fillEllipse(x + R * 0.5 + (rng() - 0.5) * 20, y - 120 - k * 40, 30, 50); }
  for (let k = 0; k < 40; k++) { g.fillStyle(rng() < 0.5 ? MEADOW_DARK : MEADOW, 0.9); g.fillCircle(x - R + 8 + rng() * 26, y - 20 - rng() * 200, 4 + rng() * 3); }
  // The crenellated top the dragon lies on.
  for (let k = 0; k < 6; k++) inkRect(g, x - R - 6 + k * ((R * 2 + 12) / 6), y - h - 18, (R * 2 + 12) / 6 - 6, 20, stone, 1, 1.6);
  inkRect(g, x - R - 8, y - h - 2, R * 2 + 16, 12, dim(stone, 0.15), 1, 1.6);
  // Door, barred.
  g.fillStyle(INK, 1); g.fillRoundedRect(x - 18, y - 56, 36, 56, { tl: 18, tr: 18, bl: 0, br: 0 });
  g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x - 18, y - 30, x + 18, y - 30); g.lineBetween(x - 14, y - 44, x + 14, y - 44);
  // Chains from the top down to great iron pegs in the ground.
  for (const [ex, ey] of [[x - 150, y + 30], [x + 160, y + 20], [x + 80, y + 70]] as const) {
    const sx = x + (ex > x ? R : -R) * 0.8, sy = y - h + 10;
    const n = 26;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const cx = sx + (ex - sx) * t, cy = sy + (ey - sy) * t + Math.sin(t * Math.PI) * 40;
      g.lineStyle(2, INK, 0.9); g.strokeEllipse(cx, cy, k % 2 ? 9 : 5, k % 2 ? 5 : 9);
      g.lineStyle(1.2, IRON_LIT, 1); g.strokeEllipse(cx, cy, k % 2 ? 8 : 4, k % 2 ? 4 : 8);
    }
    inkRect(g, ex - 6, ey - 16, 12, 16, IRON, 1, 1.6);
    inkCircle(g, ex, ey - 18, 7, IRON_LIT, 1, 1.4);
  }
}

/** The giant's boot, toe down and settled into the turf, turned into a house: windows in the leather. */
function bootHouse(g: G): void {
  const { x, y } = BOOT;
  g.fillStyle(0x000000, 0.28); g.fillEllipse(x, y + 4, 340, 34);
  giantBoot(g, x, y, 1.45, -1);
  // A door cut in the heel, windows in the shaft, a stovepipe out of the top, washing on a line.
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x + 50, y - 50, 30, 46, { tl: 13, tr: 13, bl: 0, br: 0 });
  g.lineStyle(2, INK, 1); g.strokeRoundedRect(x + 50, y - 50, 30, 46, { tl: 13, tr: 13, bl: 0, br: 0 });
  for (const [wx, wy] of [[x + 30, y - 120], [x + 60, y - 150], [x - 10, y - 90]] as const) {
    inkCircle(g, wx, wy, 11, 0xffe6a0, 1, 2);
    g.lineStyle(1.4, INK, 1); g.lineBetween(wx - 11, wy, wx + 11, wy); g.lineBetween(wx, wy - 11, wx, wy + 11);
  }
  inkRect(g, x + 30, y - 236, 12, 46, IRON, 1, 1.6);
  g.lineStyle(1.2, INK, 0.8); g.lineBetween(x + 80, y - 190, x + 180, y - 60);
  for (let k = 0; k < 6; k++) {
    const t = (k + 0.5) / 6, lx = x + 80 + 100 * t, ly = y - 190 + 130 * t + Math.sin(t * Math.PI) * 14;
    inkRect(g, lx - 6, ly, 12, 14 - (k % 3) * 2, [CLOTH_RED, PAGE, CLOTH_BLUE, GILT_LIT][k % 4], 1, 1);
  }
  // A ladder up the cuff for the children who sleep in the top.
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x + 66, y - 160, x + 66, y - 200); g.lineBetween(x + 76, y - 160, x + 76, y - 200);
  for (let k = 0; k < 4; k++) g.lineBetween(x + 66, y - 165 - k * 10, x + 76, y - 165 - k * 10);
}

/** The mirror garden: a clipped yew arch and the Stepmother's mirror on its stand. */
function mirrorGarden(g: G): void {
  const { x, y } = MIRROR;
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 3, 170, 26);
  // Yew arch behind.
  g.lineStyle(26, INK, 0.8); g.beginPath(); g.arc(x, y - 70, 70, Math.PI, 0, false); g.strokePath();
  g.lineStyle(22, 0x2e5a3a, 1); g.beginPath(); g.arc(x, y - 70, 70, Math.PI, 0, false); g.strokePath();
  for (const side of [-1, 1]) { inkRect(g, x + side * 70 - 11, y - 70, 22, 70, 0x2e5a3a, 1, 2); }
  for (let k = 0; k < 10; k++) { const a = Math.PI + (k / 9) * Math.PI; g.fillStyle(0x4a7a52, 1); g.fillCircle(x + Math.cos(a) * 70, y - 70 + Math.sin(a) * 70, 5); }
  magicMirror(g, x, y, 0.9, 0, 0, 0xc8a4ff);
  // A basket of apples at its foot.
  inkEllipse(g, x + 46, y - 6, 30, 14, THATCH, 1, 1.4);
  for (let k = 0; k < 4; k++) { g.fillStyle(APPLE, 1); g.fillCircle(x + 38 + k * 6, y - 12 - (k % 2) * 3, 4); }
}

/** The bonfire's built pile (flames are animated): a heap of banned books under a censors' gibbet. */
function bonfire(g: G, rng: () => number): void {
  const { x, y } = BONFIRE;
  // A ring of kerb stones.
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; inkEllipse(g, x + Math.cos(a) * 46, y + Math.sin(a) * 26 + 4, 18, 12, 0x8a8078, 1, 1.2); }
  // The heap of books — spines every colour, some open, pages curling.
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 30;
    const bx = x + Math.cos(a) * r, by = y + Math.sin(a) * r * 0.5 - i * 1.4;
    if (rng() < 0.3) openBook(g, bx, by, 26, 12, [CLOTH_RED, CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM][i % 4], 1, false);
    else closedBook(g, bx, by, 22 + rng() * 8, 12, [CLOTH_RED, CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM][i % 4], 1);
  }
  // The censors' post: a pole with a seal-red banner and the bound "BANNED" sheaf on a hook.
  g.lineStyle(5, INK, 0.9); g.lineBetween(x + 54, y + 8, x + 54, y - 120);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 54, y + 8, x + 54, y - 120);
  inked(g, [{ x: x + 56, y: y - 118 }, { x: x + 90, y: y - 118 }, { x: x + 90, y: y - 76 }, { x: x + 73, y: y - 84 }, { x: x + 56, y: y - 76 }], SEAL, 1, 1.6);
  censorSeal(g, x + 73, y - 102, 7);
}

/** One hedge segment of the Banned Shelf's yard. */
function hedge(g: G, r: Rect): void {
  inkRect(g, r.x, r.y - 30, r.w, r.h + 30, 0x2e5a3a, 1, 2);
  for (let k = 0; k < (r.w * (r.h + 30)) / 120; k++) {
    g.fillStyle(noise(k * 1.7 + r.x) < 0.5 ? 0x4a7a52 : 0x24482e, 0.9);
    g.fillCircle(r.x + noise(k * 3.3 + r.y) * r.w, r.y - 30 + noise(k * 5.1) * (r.h + 30), 4);
  }
}

/** Stacks of seized books inside the Banned Shelf, roped and sealed. */
function seizedStacks(g: G, rng: () => number): void {
  for (const [sx, sy] of [[1400, 250], [1560, 260], [1420, 360], [1560, 360]] as const) {
    for (let k = 0; k < 6; k++) closedBook(g, sx + (rng() - 0.5) * 6, sy - k * 9, 34 + rng() * 6, 10, [CLOTH_RED, CLOTH_BLUE, CLOTH_GREEN, CLOTH_PLUM][(k + sx) % 4], 1);
    g.lineStyle(2, 0xb89a6a, 1); g.lineBetween(sx, sy - 60, sx, sy);
    censorSeal(g, sx, sy - 30, 6);
  }
}

/** The book-arch gate posts on the Windlass road: two giant books standing on end. */
function bookPost(g: G, p: Pt, side: number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 3, 70, 16);
  const cover = side < 0 ? CLOTH_RED : CLOTH_BLUE;
  inkRect(g, p.x - 26, p.y - 150, 52, 150, cover, 1, 2.4);
  inkRect(g, p.x - 26, p.y - 150, 12, 150, dim(cover, 0.3), 1, 1.6);
  for (let k = 0; k < 4; k++) { g.fillStyle(GILT, 1); g.fillRect(p.x - 25, p.y - 140 + k * 36, 10, 3); }
  g.lineStyle(1.6, GILT, 1); g.strokeRect(p.x - 8, p.y - 136, 28, 120);
  // Pages showing at the fore-edge.
  g.fillStyle(PAGE, 1); g.fillRect(p.x + 20, p.y - 146, 5, 142);
  g.lineStyle(0.8, PARCH_DARK, 1); for (let k = 0; k < 20; k++) g.lineBetween(p.x + 20, p.y - 144 + k * 7, p.x + 25, p.y - 144 + k * 7);
}

/** The arch between the book-posts: a ribbon banner strung across, a bookmark hanging from it. */
function bookArch(g: G): void {
  const [a, b] = EAST_GATE;
  g.lineStyle(4, INK, 0.85); g.lineBetween(a.x, a.y - 150, b.x, b.y - 150);
  g.lineStyle(10, GILT, 1); g.lineBetween(a.x, a.y - 140, b.x, b.y - 140);
  g.lineStyle(2, INK, 0.85); g.lineBetween(a.x - 6, a.y - 146, b.x - 6, b.y - 146); g.lineBetween(a.x + 6, a.y - 134, b.x + 6, b.y - 134);
  bookmark(g, a.x, (a.y + b.y) / 2 - 140, 60, 16, SEAL);
}

/** North gate posts: tall stacked books with a crescent moon finial — the road up to Slumber. */
function northPost(g: G, p: Pt): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 3, 50, 12);
  for (let k = 0; k < 5; k++) closedBook(g, p.x + (k % 2) * 4 - 2, p.y - k * 16, 48 - k * 3, 14, [CLOTH_BLUE, CLOTH_PLUM, CLOTH_GREEN, CLOTH_RED, CLOTH_BLUE][k], 1);
  g.fillStyle(0xfff4c8, 1); g.fillCircle(p.x, p.y - 104, 10);
  g.fillStyle(SKY, 1); g.fillCircle(p.x + 5, p.y - 107, 9);
}

function makePieces(): NonNullable<AreaPainter['pieces']> {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  pieces.push({ x: CASTLE.x, y: CASTLE.y, w: 520, h: 520, draw: (g, rng) => castle(g, rng) });
  pieces.push({ x: OFFICE.x, y: OFFICE.y, w: OFFICE_W + 60, h: 290, draw: (g, rng) => office(g, rng) });
  pieces.push({ x: SHOP.x, y: SHOP.y, w: SHOP_W + 120, h: 230, draw: (g, rng) => shop(g, rng) });
  pieces.push({ x: THEATRE.x, y: THEATRE.y, w: THEATRE_W + 80, h: 260, draw: (g, rng) => theatre(g, rng) });
  pieces.push({ x: TOLLHOUSE.x, y: TOLLHOUSE.y, w: 260, h: 200, draw: (g, rng) => tollhouse(g, rng) });
  pieces.push({ x: COOP.x, y: COOP.y, w: 180, h: 140, draw: (g) => coop(g) });
  pieces.push({ x: TOWER.x, y: TOWER.y, w: 360, h: 440, draw: (g, rng) => tower(g, rng) });
  pieces.push({ x: BOOT.x, y: BOOT.y, w: 360, h: 260, draw: (g) => bootHouse(g) });
  pieces.push({ x: MIRROR.x, y: MIRROR.y, w: 200, h: 180, draw: (g) => mirrorGarden(g) });
  pieces.push({ x: BONFIRE.x, y: BONFIRE.y + 30, w: 200, h: 170, draw: (g, rng) => bonfire(g, rng) });
  pieces.push({ x: BEANSTALK.x, y: BEANSTALK.y, w: 160, h: BEANSTALK.y + 40, draw: (g) => beanstalk(g, BEANSTALK.x, BEANSTALK.y, -40, 0, 1, 1, 2.4) });
  for (const h of POPUPS) pieces.push({ x: h.x, y: h.y, w: 230, h: 220, draw: (g, rng) => popupHouse(g, h.x, h.y, POPUP_S, h.cover, h.wall, h.roof, h.shut, rng, h.x) });
  for (const p of PIG_HOUSES) pieces.push({ x: p.x, y: p.y, w: 120, h: 130, draw: (g, rng) => pigHouse(g, p.kind, p.x, p.y, PIG_S, 0, rng) });
  for (const l of LAMPS) pieces.push({ x: l.x, y: l.y, w: 40, h: 80, draw: (g) => storyLamp(g, l.x, l.y) });
  for (const t of TREES) pieces.push({ x: t.x, y: t.y, w: t.s * 2, h: t.s * 3, draw: (g, rng) => storyTree(g, t.x, t.y, t.s, t.kind, rng, t.tint) });
  // The Banned Shelf: hedges, the seized stacks.
  pieces.push({ x: YARD.x + YARD.w / 2, y: YARD.y, w: YARD.w + 40, h: 60, draw: (g) => hedge(g, { x: YARD.x - 10, y: YARD.y - 10, w: YARD.w + 20, h: 20 }) });
  pieces.push({ x: YARD.x + YARD.w / 2, y: YARD.y + YARD.h + 10, w: YARD.w + 40, h: 60, draw: (g) => hedge(g, { x: YARD.x - 10, y: YARD.y + YARD.h - 10, w: YARD.w + 20, h: 20 }) });
  pieces.push({ x: YARD.x + YARD.w, y: YARD.y + YARD.h, w: 40, h: YARD.h + 40, draw: (g) => hedge(g, { x: YARD.x + YARD.w - 10, y: YARD.y, w: 20, h: YARD.h }) });
  pieces.push({ x: YARD.x, y: YARD_GATE.y, w: 40, h: 90, draw: (g) => hedge(g, { x: YARD.x - 10, y: YARD.y, w: 20, h: YARD_GATE.y - YARD.y }) });
  pieces.push({ x: YARD.x, y: YARD.y + YARD.h, w: 40, h: 90, draw: (g) => hedge(g, { x: YARD.x - 10, y: YARD_GATE.y + YARD_GATE.h, w: 20, h: YARD.y + YARD.h - YARD_GATE.y - YARD_GATE.h }) });
  pieces.push({ x: YARD.x + YARD.w / 2, y: YARD.y + 175, w: YARD.w, h: 120, draw: (g, rng) => seizedStacks(g, rng) });
  EAST_GATE.forEach((p, i) => pieces.push({ x: p.x, y: p.y, w: 60, h: 170, draw: (g) => bookPost(g, p, i ? 1 : -1) }));
  pieces.push({ x: EAST_GATE[1].x, y: EAST_GATE[1].y + 1, w: 60, h: 360, draw: (g) => bookArch(g) });
  NORTH_GATE.forEach((p) => pieces.push({ x: p.x, y: p.y, w: 60, h: 130, draw: (g) => northPost(g, p) }));
  // Picket fence round the goose green's back.
  pieces.push({ x: GREEN.x, y: GREEN.y - GREEN.ry - 4, w: 300, h: 60, draw: (g) => picketFence(g, { x: GREEN.x - 120, y: GREEN.y - GREEN.ry - 4 }, { x: GREEN.x + 140, y: GREEN.y - GREEN.ry - 4 }) });
  return pieces;
}

// ── Animation ───────────────────────────────────────────────────────

const LOOSE_PAGES = Array.from({ length: 9 }, (_, i) => ({ ph: noise(i * 3.1), r: 70 + noise(i * 1.3) * 110, sp: 0.2 + noise(i * 7.7) * 0.25 }));
const FLOCK = Array.from({ length: 4 }, (_, i) => ({ ph: i * 1.7, r: 40 + i * 18 }));

/** Under actors: the moat, the cloud sea's drift, the bonfire's glow, skittering pages, geese on the green. */
function animate(g: G, t: number, view: Rect): void {
  // Moat ripples and a carp's back breaking the surface now and then.
  if (inView(MOAT.x + MOAT.w / 2, MOAT.y + MOAT.h / 2, view, 400)) {
    for (let i = 0; i < 12; i++) {
      const ph = (t * 0.35 + i / 12) % 1;
      const side = i % 4;
      const u = noise(i * 2.7);
      const x = side < 2 ? MOAT.x + 20 + u * (MOAT.w - 40) : side === 2 ? MOAT.x + 24 : MOAT.x + MOAT.w - 24;
      const y = side >= 2 ? MOAT.y + 20 + u * (MOAT.h - 40) : side === 0 ? MOAT.y + 24 : MOAT.y + MOAT.h - 24;
      g.lineStyle(1.2, 0xc8e8ff, 0.5 * (1 - ph)); g.strokeEllipse(x, y, 6 + ph * 30, 3 + ph * 10);
    }
    const jump = (t * 0.11) % 1;
    if (jump < 0.08) {
      const k = jump / 0.08, jx = FISH_WATER.x + 40 + k * 90, jy = FISH_WATER.y + 24 - Math.sin(k * Math.PI) * 20;
      g.fillStyle(GILT, 1); g.fillEllipse(jx, jy, 20, 8);
      g.fillStyle(EMBER, 1); g.fillTriangle(jx - 10, jy, jx - 16, jy - 5, jx - 16, jy + 5);
      g.lineStyle(1.4, 0xffffff, 0.7 * (1 - k)); g.strokeEllipse(FISH_WATER.x + 40, FISH_WATER.y + 26, 16 + k * 24, 5 + k * 6);
    }
  }
  // The cloud sea below the edge: slow puffs drifting south-west to north-east.
  for (let i = 0; i < 16; i++) {
    const u = ((t * 0.012 + i / 16) % 1);
    const along = i % 2 === 0;
    const x = along ? -60 + u * (AREA_W + 120) : 30 + Math.sin(t * 0.1 + i) * 24;
    const y = along ? 1540 + Math.sin(i * 2.1) * 30 : AREA_H + 60 - u * (AREA_H + 120);
    if (!inView(x, y, view, 120)) continue;
    cloudPuff(g, x, y, 34 + noise(i) * 30, 0.75);
  }
  // Cloud shadows sliding over the land.
  for (let i = 0; i < 5; i++) {
    const x = ((t * 14 + i * 520) % (AREA_W + 600)) - 300, y = 200 + i * 290;
    if (!inView(x, y, view, 300)) continue;
    g.fillStyle(0x2a3a5a, 0.06); g.fillEllipse(x, y, 380, 150);
  }
  // Bonfire glow on the stones, pulsing.
  if (inView(BONFIRE.x, BONFIRE.y, view, 260)) {
    const p = 0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3.1);
    g.fillStyle(EMBER, 0.06 * p); g.fillCircle(BONFIRE.x, BONFIRE.y, 170);
    g.fillStyle(EMBER, 0.08 * p); g.fillCircle(BONFIRE.x, BONFIRE.y, 110);
    // Loose pages skittering round the square on the wind.
    for (const pg of LOOSE_PAGES) {
      const a = t * pg.sp + pg.ph * Math.PI * 2;
      const x = SQUARE.x + Math.cos(a) * pg.r, y = SQUARE.y + Math.sin(a) * pg.r * 0.7;
      const flip = Math.sin(t * 6 + pg.ph * 10);
      g.fillStyle(PAGE, 0.95); g.fillRect(x - 6, y - 4 * Math.abs(flip) - 1, 12, 8 * Math.abs(flip) + 2);
      g.lineStyle(0.8, INK_SOFT, 0.6); g.lineBetween(x - 4, y, x + 4, y);
    }
  }
  // Geese grazing on the green (plain white — the golden one is only out for the fight).
  if (inView(GREEN.x, GREEN.y, view, 260)) {
    for (const f of FLOCK) {
      const a = t * 0.15 + f.ph;
      const x = GREEN.x - 30 + Math.cos(a) * f.r * 1.4, y = GREEN.y + Math.sin(a * 1.3) * f.r * 0.5;
      goose(g, x, y, -Math.sin(a) >= 0 ? 1 : -1, 0.9, t * 6 + f.ph, false, Math.sin(t * 0.7 + f.ph) > 0.92 ? 1 : 0);
    }
  }
}

/** Over actors: bonfire flames and smoke, paper birds fleeing it, the dragon on its tower, beanstalk cloud. */
function animateOver(g: G, t: number, view: Rect): void {
  if (inView(BONFIRE.x, BONFIRE.y - 80, view, 260)) {
    const bx = BONFIRE.x, by = BONFIRE.y - 6;
    for (let i = 0; i < 7; i++) {
      const f = 0.7 + 0.3 * Math.sin(t * 11 + i * 1.9);
      const sx = bx + (i - 3) * 9;
      const h = (34 + (3 - Math.abs(i - 3)) * 12) * f;
      g.fillStyle(EMBER, 0.85); g.fillTriangle(sx - 9, by, sx + 9, by, sx + Math.sin(t * 5 + i) * 5, by - h);
      g.fillStyle(FLAME, 0.9); g.fillTriangle(sx - 4, by, sx + 4, by, sx + Math.sin(t * 5 + i) * 3, by - h * 0.55);
    }
    // Smoke: black, with the curls of burning words in it.
    for (let i = 0; i < 9; i++) {
      const ph = (t * 0.16 + i / 9) % 1;
      const x = bx + Math.sin(ph * 5 + i) * 14 + ph * 70, y = by - 50 - ph * 260;
      g.fillStyle(SMOKE, 0.45 * (1 - ph)); g.fillCircle(x, y, 10 + ph * 26);
    }
    // Pages rising on the heat and burning away.
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.3 + i / 5) % 1;
      const x = bx + Math.sin(t * 2 + i * 2) * 30 + ph * 30, y = by - 30 - ph * 160;
      g.fillStyle(PAGE, 0.9 * (1 - ph)); g.fillRect(x - 5, y - 4, 10 * (1 - ph * 0.6), 8);
      g.fillStyle(EMBER, 0.9 * (1 - ph)); g.fillRect(x - 5, y + 2, 10 * (1 - ph * 0.6), 2);
    }
  }
  // Paper birds: banned stories folded and let go, flying off over the edge to the west.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.045 + i / 4) % 1;
    const x = BONFIRE.x - ph * 1300, y = BONFIRE.y - 120 - ph * 320 + Math.sin(t * 1.5 + i * 2) * 26 + i * 40;
    if (!inView(x, y, view)) continue;
    const flap = Math.sin(t * 8 + i);
    g.fillStyle(PAGE, 1);
    g.fillTriangle(x, y, x + 16, y + 3, x + 4, y - 10 * flap);
    g.fillTriangle(x, y, x + 16, y + 3, x + 6, y + 8 + 4 * flap);
    g.lineStyle(1, INK, 0.7); g.lineBetween(x, y, x + 16, y + 3);
  }
  // The dragon atop her tower: curled, breathing, an eye opening when you come close.
  if (inView(TOWER.x, TOWER.y - 400, view, 260)) {
    curledDragon(g, TOWER.x + 4, TOWER.y - 392, 62, t, Math.max(0, Math.sin(t * 0.21) - 0.75) * 4, -0.3);
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.25 + i / 4) % 1;
      g.fillStyle(0x9a9aa8, 0.45 * (1 - ph)); g.fillCircle(TOWER.x + 70 + ph * 40, TOWER.y - 420 - ph * 70, 5 + ph * 12);
    }
  }
  // The beanstalk's top, lost in a cloud that drifts round it, leaves twitching.
  if (inView(BEANSTALK.x, 60, view, 260)) {
    for (let i = 0; i < 3; i++) cloudPuff(g, BEANSTALK.x - 70 + i * 70 + Math.sin(t * 0.3 + i) * 18, 30 + i * 12, 42, 0.92);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.12 + i / 3) % 1;
      const x = BEANSTALK.x + Math.sin(t + i * 2) * 50, y = 60 + ph * (BEANSTALK.y - 60);
      g.fillStyle(BEAN, 0.9 * (1 - ph * 0.5)); g.fillEllipse(x, y, 9, 5);
    }
  }
  // Smoke from the boot's stovepipe.
  if (inView(BOOT.x + 36, BOOT.y - 240, view, 200)) {
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.2 + i / 5) % 1;
      g.fillStyle(0xd8d4e0, 0.5 * (1 - ph)); g.fillCircle(BOOT.x + 36 + ph * 50 + Math.sin(ph * 6) * 6, BOOT.y - 240 - ph * 110, 6 + ph * 12);
    }
  }
  // The castle's pennants: a star or two pricked into the dusk over the Prince's keep.
  if (inView(CASTLE.x, CASTLE.y - 450, view, 260)) {
    for (let i = 0; i < 5; i++) {
      const tw = (Math.sin(t * 2 + i * 1.7) + 1) / 2;
      g.fillStyle(STAR, 0.4 + tw * 0.5); g.fillCircle(CASTLE.x - 180 + i * 90, CASTLE.y - 470 - (i % 2) * 30, 1.4 + tw * 1.2);
    }
    g.fillStyle(MYTH, 0.05); g.fillCircle(CASTLE.x, CASTLE.y - 420, 90);
  }
  // A torn page caught on the lamp by the shop, flapping.
  const lp = LAMPS[5];
  if (inView(lp.x, lp.y, view)) {
    const f = Math.sin(t * 9) * 4;
    g.fillStyle(PAGE, 1); g.fillTriangle(lp.x + 6, lp.y - 40, lp.x + 22, lp.y - 36 + f, lp.x + 8, lp.y - 28);
  }
}

export const FABLE_PAINTER: AreaPainter = {
  ground: paintGround,
  pieces: makePieces(),
  animate,
  animateOver,
};
