import type Phaser from 'phaser';
import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, groundFill, lit, pool, road, shadow, stroke } from '../../../../art/IsleArt';
import {
  barracks, bombproofKeep, casemate, cooperBench, gatePier, kegRack, powderCart, quartermastery,
  rampartGun, rangeTower, revetment, sandbagLine, signalMast, strawTarget, titheBrazier,
} from './art';
import { POWDER_CROWD, POWDER_NPCS } from './npcs';
import { P, drawPuff, drawSpark } from './util';

/**
 * THE POWDER COURT — a star fort that grew a town inside it.
 *
 * Layout (2400×1600): the north rampart runs the whole top edge with its guns, broken by the North
 * Gate (to the Boilerworks). The east rampart carries the East Gate (to Emberport) and the road in
 * to the drill square in the middle. North-west, behind a moat and a drawbridge, is Fuse's
 * magazine-keep inside its own bastioned compound. North-east are the casemate homes and the
 * barracks; south-west, the powder racks of Keg Alley; south-middle, the fenced minefield drill
 * ground; south-east, the firing range with its straw butts.
 */

type G = Phaser.GameObjects.Graphics;

const W = 2400;
const H = 1600;

/** Drill square. */
const YARD: Rect = { x: 950, y: 650, w: 560, h: 340 };
/** The moat in front of the keep (fishing water). */
const MOAT: Rect = { x: 300, y: 640, w: 560, h: 96 };
const BRIDGE = { x0: 525, x1: 595 };
const MINEFIELD: Rect = { x: 980, y: 1100, w: 480, h: 400 };
const RANGE: Rect = { x: 1580, y: 1100, w: 720, h: 420 };
const ALLEY: Rect = { x: 250, y: 1200, w: 680, h: 200 };
const KEEP = { x: 560, y: 470 };

const RAMPART_GUNS = [160, 380, 600, 820, 1000, 1420, 1640, 1860, 2080];
const KEG_RACKS_X = [330, 480, 630, 780];
const TARGETS_Y = [1170, 1250, 1330, 1410];
const BRAZIERS: Pt[] = [{ x: 1405, y: 300 }, { x: 1555, y: 300 }, { x: 1810, y: 548 }, { x: 640, y: 500 }];
const MAST = { x: 1480, y: 636 };

const inView = (v: Rect, x: number, y: number, pad = 120): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Ground ───────────────────────────────────────────────────────────

/** The bastioned outline round the keep compound — four arrowhead bastions and a ravelin. */
const GLACIS: Pt[] = [
  { x: 120, y: 118 }, { x: 300, y: 176 }, { x: 560, y: 196 }, { x: 820, y: 176 }, { x: 1000, y: 118 },
  { x: 912, y: 330 }, { x: 960, y: 480 }, { x: 912, y: 630 }, { x: 1010, y: 850 }, { x: 820, y: 800 },
  { x: 560, y: 826 }, { x: 300, y: 800 }, { x: 110, y: 850 }, { x: 208, y: 630 }, { x: 160, y: 480 },
  { x: 208, y: 330 },
];

function paintGround(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, 0x7d6a4a, 0x6e7444, 0x2e2418, rng, 1.2);
  for (let i = 0; i < 26; i++) blob(g, rng() * W, rng() * H, 60 + rng() * 140, 30 + rng() * 60, P.turf, 0.35, rng);

  // The star fort's glacis: turfed slope, darker at the foot, lighter where it crests.
  g.fillStyle(dim(P.turf, 0.35), 1); g.fillPoints(GLACIS, true, true);
  const cx = 560, cy = 470;
  g.fillStyle(P.turf, 1);
  g.fillPoints(GLACIS.map((p) => ({ x: cx + (p.x - cx) * 0.9, y: cy + (p.y - cy) * 0.9 })), true, true);
  g.fillStyle(lit(P.turf, 0.12), 1);
  g.fillPoints(GLACIS.map((p) => ({ x: cx + (p.x - cx) * 0.8, y: cy + (p.y - cy) * 0.8 })), true, true);
  // Compound floor: packed gravel inside the walls.
  groundFill(g, { x: 292, y: 260, w: 536, h: 380 }, 0x8f8068, 0x9a8a70, 0x4a4030, rng, 1.4);
  for (let i = 0; i < 6; i++) {
    // Mown stripes on the glacis.
    g.lineStyle(10, lit(P.turf, 0.06), 0.4);
    g.lineBetween(160 + i * 140, 140, 120 + i * 140, 820);
  }

  // Moat, with reeds, a slick of powder-scum and the drawbridge.
  pool(g, MOAT, 0x22383a, 0x3a5a52, 0x5e4c34, rng);
  for (let i = 0; i < 40; i++) {
    const x = MOAT.x + rng() * MOAT.w;
    const y = rng() < 0.5 ? MOAT.y - 4 : MOAT.y + MOAT.h + 2;
    g.lineStyle(2, 0x4a6a34, 1); g.lineBetween(x, y, x + (rng() - 0.5) * 6, y - 10 - rng() * 10);
  }
  for (let i = 0; i < 8; i++) {
    g.fillStyle(0x1a1614, 0.25); g.fillEllipse(MOAT.x + 30 + rng() * (MOAT.w - 60), MOAT.y + 20 + rng() * (MOAT.h - 40), 30 + rng() * 40, 6);
  }
  // Drawbridge: tarred planks, iron straps, chains running up to the compound gate.
  g.fillStyle(0x2a1d14, 1); g.fillRect(BRIDGE.x0 - 4, MOAT.y - 14, BRIDGE.x1 - BRIDGE.x0 + 8, MOAT.h + 28);
  for (let y = MOAT.y - 12; y < MOAT.y + MOAT.h + 12; y += 10) {
    g.fillStyle(rng() < 0.5 ? 0x5a3e28 : 0x664830, 1); g.fillRect(BRIDGE.x0, y, BRIDGE.x1 - BRIDGE.x0, 8);
  }
  g.fillStyle(P.iron, 1);
  g.fillRect(BRIDGE.x0 + 6, MOAT.y - 12, 5, MOAT.h + 24); g.fillRect(BRIDGE.x1 - 11, MOAT.y - 12, 5, MOAT.h + 24);

  // Roads: rammed earth with cobbles.
  const R = (pts: Pt[], w = 64) => road(g, pts, w, 0x9a8462, 0x5e4c34, 0xb0a080, rng);
  R([{ x: 1200, y: -20 }, { x: 1200, y: 660 }]);
  R([{ x: W + 20, y: 800 }, { x: 1900, y: 806 }, { x: 1500, y: 810 }]);
  R([{ x: 960, y: 810 }, { x: 720, y: 812 }, { x: 560, y: 770 }]);
  R([{ x: 560, y: 630 }, { x: 560, y: 520 }], 54);
  R([{ x: 1200, y: 980 }, { x: 1200, y: 1100 }], 54);
  R([{ x: 1000, y: 980 }, { x: 900, y: 1110 }, { x: 900, y: 1200 }], 50);
  R([{ x: 1480, y: 980 }, { x: 1600, y: 1080 }, { x: 1720, y: 1180 }], 50);

  // The drill square: rammed earth inside a timber kerb, with chalked drill squares.
  g.fillStyle(0x4a3824, 1); g.fillRect(YARD.x - 8, YARD.y - 8, YARD.w + 16, YARD.h + 16);
  groundFill(g, YARD, 0xa08a64, 0xaa9470, 0x5a4a34, rng, 2);
  for (let x = YARD.x + 40; x < YARD.x + YARD.w - 20; x += 80) {
    for (let y = YARD.y + 40; y < YARD.y + YARD.h - 20; y += 70) {
      g.lineStyle(1.5, P.saltpetre, 0.28); g.strokeRect(x, y, 50, 40);
    }
  }
  g.lineStyle(3, P.saltpetre, 0.35); g.strokeRect(YARD.x + 16, YARD.y + 16, YARD.w - 32, YARD.h - 32);
  // Boot-scuffed paths across it, and the duelling line chalked between two brass caps.
  for (let i = 0; i < 160; i++) {
    g.fillStyle(0x5a4a34, 0.25); g.fillEllipse(YARD.x + rng() * YARD.w, YARD.y + rng() * YARD.h, 6, 3);
  }
  g.lineStyle(2, P.saltpetre, 0.5); g.lineBetween(1180, 760, 1420, 760);
  for (const x of [1180, 1420]) { g.fillStyle(P.brass, 1); g.fillCircle(x, 760, 6); }

  // The north rampart: turfed parapet, earth slope, and a palisaded revetment face.
  const rampart = (x0: number, x1: number) => {
    g.fillStyle(dim(P.turf, 0.2), 1); g.fillRect(x0, 0, x1 - x0, 70);
    g.fillStyle(P.earth, 1); g.fillRect(x0, 70, x1 - x0, 44);
    g.fillStyle(lit(P.earth, 0.12), 1); g.fillRect(x0, 70, x1 - x0, 6);
    g.fillStyle(P.oakDark, 1); g.fillRect(x0, 112, x1 - x0, 40);
    for (let x = x0; x < x1; x += 12) {
      g.fillStyle(rng() < 0.5 ? P.oak : dim(P.oak, 0.12), 1); g.fillRect(x + 1, 114, 10, 36);
      g.fillStyle(lit(P.oak, 0.2), 1); g.fillRect(x + 1, 114, 10, 2);
    }
    g.fillStyle(0x000000, 0.25); g.fillRect(x0, 150, x1 - x0, 10);
  };
  rampart(0, 1120);
  rampart(1280, W);
  // Embrasures cut into the parapet at every gun.
  for (const x of RAMPART_GUNS) {
    g.fillStyle(dim(P.earth, 0.4), 1); g.fillTriangle(x - 26, 70, x + 26, 70, x, 30);
  }
  // East rampart.
  g.fillStyle(dim(P.turf, 0.2), 1); g.fillRect(2360, 150, 40, H - 150);
  g.fillStyle(P.earth, 1); g.fillRect(2330, 150, 30, H - 150);
  g.fillStyle(P.oakDark, 1); g.fillRect(2318, 150, 14, H - 150);
  for (let y = 150; y < H; y += 12) { g.fillStyle(P.oak, 1); g.fillRect(2319, y + 1, 12, 10); }
  // Cut the East Gate through it.
  g.fillStyle(0x9a8462, 1); g.fillRect(2310, 728, 90, 144);
  // West and south: a ditch and a hedge bank.
  g.fillStyle(dim(P.turf, 0.3), 1); g.fillRect(0, 150, 50, H - 150); g.fillRect(0, 1550, W, 50);
  for (let y = 160; y < H; y += 22) blob(g, 30, y, 22, 14, dim(P.turf, 0.1), 1, rng, 7);
  for (let x = 0; x < W; x += 24) blob(g, x, 1565, 18, 14, dim(P.turf, 0.1), 1, rng, 7);

  // Keg Alley: worn setts between the racks, gutters running with wet powder-scum.
  g.fillStyle(0x5a5048, 1); g.fillRect(ALLEY.x, ALLEY.y, ALLEY.w, ALLEY.h);
  for (let y = ALLEY.y + 4; y < ALLEY.y + ALLEY.h; y += 12) {
    for (let x = ALLEY.x + ((y / 12) % 2) * 8; x < ALLEY.x + ALLEY.w; x += 16) {
      g.fillStyle(rng() < 0.5 ? 0x6a6058 : 0x625850, 1); g.fillRoundedRect(x + 1, y + 1, 14, 10, 3);
    }
  }
  for (const gy of [ALLEY.y + 22, ALLEY.y + ALLEY.h - 22]) {
    g.fillStyle(0x2a3434, 1); g.fillRect(ALLEY.x, gy - 4, ALLEY.w, 8);
    g.fillStyle(0x3a4a4a, 0.8); g.fillRect(ALLEY.x, gy - 2, ALLEY.w, 3);
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle(P.powder, 0.35 + rng() * 0.3);
    g.fillEllipse(ALLEY.x + rng() * ALLEY.w, ALLEY.y + 30 + rng() * (ALLEY.h - 60), 10 + rng() * 30, 4 + rng() * 8);
  }
  // A powder trail runs from the alley's end up to the keep — Fuse's private joke, never lit.
  const trail: Pt[] = [{ x: 260, y: 1300 }, { x: 200, y: 1150 }, { x: 230, y: 980 }, { x: 180, y: 860 }, { x: 250, y: 760 }];
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i], b = trail[i + 1];
    const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 6);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      g.fillStyle(P.powder, 0.7); g.fillCircle(a.x + (b.x - a.x) * t + (rng() - 0.5) * 2, a.y + (b.y - a.y) * t + (rng() - 0.5) * 2, 1.6);
    }
  }

  // The minefield drill ground: churned earth, craters, a rope fence with a gap at the north.
  g.fillStyle(0x6a5638, 1); g.fillRect(MINEFIELD.x, MINEFIELD.y, MINEFIELD.w, MINEFIELD.h);
  for (let i = 0; i < 90; i++) {
    g.fillStyle(rng() < 0.5 ? 0x5a4830 : 0x7a6644, 0.6);
    g.fillEllipse(MINEFIELD.x + rng() * MINEFIELD.w, MINEFIELD.y + rng() * MINEFIELD.h, 14 + rng() * 26, 6 + rng() * 10);
  }
  for (let i = 0; i < 9; i++) crater(g, MINEFIELD.x + 30 + rng() * (MINEFIELD.w - 60), MINEFIELD.y + 30 + rng() * (MINEFIELD.h - 60), 14 + rng() * 14, rng);
  ropeFence(g, MINEFIELD, { from: 1170, to: 1230 });
  // Pegged survey grid.
  for (let x = MINEFIELD.x + 40; x < MINEFIELD.x + MINEFIELD.w; x += 80) {
    for (let y = MINEFIELD.y + 40; y < MINEFIELD.y + MINEFIELD.h; y += 80) {
      g.fillStyle(P.saltpetre, 0.5); g.fillRect(x - 1, y - 5, 2, 8);
    }
  }

  // The firing range: mown lanes, rope dividers, a chalk firing line and an earth butt at the end.
  g.fillStyle(0x6a7a40, 1); g.fillRect(RANGE.x, RANGE.y, RANGE.w, RANGE.h);
  for (let y = RANGE.y; y < RANGE.y + RANGE.h; y += 40) {
    g.fillStyle(y % 80 === 0 ? 0x748446 : 0x66763c, 1); g.fillRect(RANGE.x, y, RANGE.w, 40);
  }
  for (const y of [1210, 1290, 1370]) {
    g.lineStyle(1.5, P.saltpetre, 0.45); g.lineBetween(1700, y, 2260, y);
    for (let x = 1700; x <= 2260; x += 70) { g.fillStyle(P.oakDark, 1); g.fillRect(x - 2, y - 6, 4, 8); }
  }
  g.lineStyle(4, P.saltpetre, 0.6); g.lineBetween(1700, 1130, 1700, 1460);
  g.fillStyle(P.earthDark, 1); g.fillRect(2260, 1110, 50, 400);
  g.fillStyle(P.earth, 1); g.fillRect(2262, 1112, 30, 396);
  for (let i = 0; i < 40; i++) { g.fillStyle(0x1a120c, 0.8); g.fillCircle(2266 + rng() * 26, 1120 + rng() * 380, 1.6); }
  // Scorches from test shots, all over the south.
  for (let i = 0; i < 14; i++) {
    const x = 1500 + rng() * 820, y = 1080 + rng() * 460;
    crater(g, x, y, 10 + rng() * 22, rng);
  }
  crater(g, 2240, 1500, 34, rng);
  for (let i = 0; i < 6; i++) crater(g, 1300 + rng() * 900, 900 + rng() * 160, 8 + rng() * 10, rng);

  // Sockets for the tithe braziers: a scorched flagstone each.
  for (const b of BRAZIERS) { g.fillStyle(0x2a1d14, 0.6); g.fillEllipse(b.x, b.y, 34, 14); }
}

function crater(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(lit(P.earth, 0.08), 0.6); g.fillCircle(x, y, r * 1.45);
  g.fillStyle(0x2a1f14, 0.75); g.fillCircle(x, y, r);
  g.fillStyle(0x120c08, 0.6); g.fillCircle(x + r * 0.15, y + r * 0.15, r * 0.55);
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    g.lineStyle(2, 0x1a120c, 0.5); g.lineBetween(x, y, x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.5);
  }
}

function ropeFence(g: G, r: Rect, gap: { from: number; to: number }): void {
  const post = (x: number, y: number) => {
    g.fillStyle(P.oakDark, 1); g.fillRect(x - 2, y - 16, 4, 16);
    g.fillStyle(P.redcoat, 1); g.fillRect(x - 3, y - 18, 6, 4);
  };
  const side = (x0: number, y0: number, x1: number, y1: number) => {
    g.lineStyle(1.5, P.sandbag, 0.9); g.lineBetween(x0, y0 - 10, x1, y1 - 10);
    const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 40));
    for (let i = 0; i <= n; i++) post(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
    // Red and white warning rags on the rope.
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      g.fillStyle(i % 2 ? P.redcoat : P.saltpetre, 1);
      g.fillTriangle(x0 + (x1 - x0) * t - 3, y0 + (y1 - y0) * t - 10, x0 + (x1 - x0) * t + 3, y0 + (y1 - y0) * t - 10, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 3);
    }
  };
  side(r.x, r.y, gap.from, r.y);
  side(gap.to, r.y, r.x + r.w, r.y);
  side(r.x + r.w, r.y, r.x + r.w, r.y + r.h);
  side(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
  side(r.x, r.y, r.x, r.y + r.h);
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaPainter['pieces']>[number];

function pieces(): Piece[] {
  const out: Piece[] = [];
  out.push({ x: KEEP.x, y: KEEP.y, w: 380, h: 240, draw: (g, rng) => bombproofKeep(g, KEEP.x, KEEP.y, rng) });
  // Compound walls.
  out.push({ x: 560, y: 260, w: 600, h: 60, draw: (g) => revetment(g, 268, 260, 852, 260) });
  out.push({ x: 280, y: 736, w: 40, h: 520, draw: (g) => revetment(g, 280, 260, 280, 736) });
  out.push({ x: 840, y: 640, w: 40, h: 420, draw: (g) => revetment(g, 840, 260, 840, 640) });
  // Gate piers either side of the drawbridge.
  out.push({ x: 515, y: 640, w: 30, h: 70, draw: (g) => bridgePost(g, 515, 640) });
  out.push({ x: 605, y: 640, w: 30, h: 70, draw: (g) => bridgePost(g, 605, 640) });
  // Rampart guns.
  RAMPART_GUNS.forEach((x, i) => out.push({ x, y: 128, w: 80, h: 80, draw: (g) => rampartGun(g, x, 128, i % 2 ? 1 : -1) }));
  // Gatehouses.
  for (const x of [1105, 1295]) out.push({ x, y: 160, w: 60, h: 150, draw: (g) => gatePier(g, x, 160) });
  for (const y of [712, 888]) out.push({ x: 2330, y, w: 60, h: 150, draw: (g) => gatePier(g, 2330, y) });
  // The town.
  out.push({ x: 1020, y: 610, w: 240, h: 130, draw: (g, rng) => quartermastery(g, 1020, 610, rng) });
  out.push({ x: MAST.x, y: MAST.y, w: 140, h: 240, draw: (g) => signalMast(g, MAST.x, MAST.y) });
  out.push({ x: 1360, y: 280, w: 190, h: 120, draw: (g, rng) => casemate(g, 1360, 280, rng) });
  out.push({ x: 1510, y: 280, w: 190, h: 120, draw: (g, rng) => casemate(g, 1510, 280, rng) });
  out.push({ x: 1880, y: 520, w: 420, h: 160, draw: (g, rng) => barracks(g, 1880, 520, 380, rng) });
  out.push({ x: 2160, y: 400, w: 220, h: 160, draw: (g, rng) => barracks(g, 2160, 400, 180, rng) });
  for (const b of BRAZIERS) out.push({ x: b.x, y: b.y, w: 30, h: 30, draw: (g) => titheBrazier(g, b.x, b.y) });
  // Keg Alley.
  for (const x of KEG_RACKS_X) {
    out.push({ x, y: 1190, w: 140, h: 100, draw: (g, rng) => kegRack(g, x, 1190, rng) });
    out.push({ x, y: 1440, w: 140, h: 100, draw: (g, rng) => kegRack(g, x, 1440, rng) });
  }
  out.push({ x: 930, y: 1270, w: 110, h: 50, draw: (g) => cooperBench(g, 930, 1270) });
  // Range.
  out.push({ x: 1640, y: 1122, w: 90, h: 180, draw: (g) => rangeTower(g, 1640, 1122) });
  TARGETS_Y.forEach((y) => out.push({ x: 2220, y, w: 60, h: 80, draw: (g, rng) => strawTarget(g, 2220, y, rng) }));
  out.push({ x: 1790, y: 1112, w: 220, h: 50, draw: (g) => sandbagLine(g, 1700, 1112, 1880) });
  // Sandbag lines and a limber.
  out.push({ x: 1640, y: 1000, w: 180, h: 50, draw: (g) => sandbagLine(g, 1560, 1000, 1720) });
  out.push({ x: 935, y: 1042, w: 170, h: 50, draw: (g) => sandbagLine(g, 860, 1042, 1010) });
  out.push({ x: 2050, y: 722, w: 160, h: 50, draw: (g) => sandbagLine(g, 1980, 722, 2120) });
  out.push({ x: 2050, y: 902, w: 160, h: 50, draw: (g) => sandbagLine(g, 1980, 902, 2120) });
  out.push({ x: 1470, y: 862, w: 130, h: 100, draw: (g) => powderCart(g, 1470, 862) });
  return out;
}

function bridgePost(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 26, 8);
  g.fillStyle(P.oakDark, 1); g.fillRect(x - 7, y - 60, 14, 60);
  g.fillStyle(P.oak, 1); g.fillRect(x - 5, y - 58, 10, 56);
  g.fillStyle(P.iron, 1); g.fillCircle(x, y - 54, 5);
  // Chain down to the bridge deck.
  g.lineStyle(2, P.ironLit, 0.9); g.lineBetween(x, y - 54, x + (x < 560 ? 18 : -18), y + 4);
}

// ── Animation ────────────────────────────────────────────────────────

const painter: AreaPainter = {
  ground: paintGround,
  pieces: pieces(),

  animate(g: G, t: number, view: Rect) {
    // Moat: slow glints and the odd rise of a pike.
    if (inView(view, MOAT.x + MOAT.w / 2, MOAT.y + MOAT.h / 2, 400)) {
      for (let i = 0; i < 10; i++) {
        const x = MOAT.x + 30 + ((i * 97 + t * 14) % (MOAT.w - 60));
        const y = MOAT.y + 22 + ((i * 37) % (MOAT.h - 44));
        g.lineStyle(1.5, 0x8ab0a0, 0.25 + Math.sin(t * 2 + i) * 0.15);
        g.lineBetween(x, y, x + 14, y);
      }
      const rise = (t * 0.4) % 3;
      if (rise < 0.6) {
        g.lineStyle(1.5, 0xa0c0b0, 0.6 * (1 - rise / 0.6));
        g.strokeCircle(MOAT.x + 140 + (Math.floor(t / 3) * 113) % 300, MOAT.y + 50, 6 + rise * 30);
      }
    }
    // Tithe braziers: kept hot, as the Prince insists.
    for (const b of BRAZIERS) {
      if (!inView(view, b.x, b.y)) continue;
      const f = 0.85 + Math.sin(t * 9 + b.x) * 0.15;
      g.fillStyle(P.flame, 0.12); g.fillCircle(b.x, b.y - 26, 26 * f);
      g.fillStyle(P.flame, 0.9); g.fillTriangle(b.x - 8, b.y - 22, b.x + 8, b.y - 22, b.x + Math.sin(t * 7 + b.y) * 3, b.y - 22 - 18 * f);
      g.fillStyle(P.spark, 1); g.fillTriangle(b.x - 4, b.y - 22, b.x + 4, b.y - 22, b.x, b.y - 30 - 6 * f);
    }
    // Range practice: a musket puff on the firing line, and a hit kicking straw off a butt.
    if (inView(view, 1950, 1300, 500)) {
      const cyc = t % 2.6;
      const lane = Math.floor(t / 2.6) % TARGETS_Y.length;
      const y = TARGETS_Y[lane] - 30;
      if (cyc < 1.2) drawPuff(g, 1712 + cyc * 18, y, 8 + cyc * 14, P.smoke, 0.5 * (1 - cyc / 1.2), lane);
      if (cyc > 0.25 && cyc < 0.7) {
        const k = (cyc - 0.25) / 0.45;
        for (let i = 0; i < 5; i++) {
          g.fillStyle(0xd8bb6a, 1 - k);
          g.fillRect(2220 + Math.cos(i * 1.3) * k * 26, y - 16 + Math.sin(i * 1.3) * k * 18 + k * k * 20, 3, 1.5);
        }
      }
    }
    // Minefield: a sapper's flag flapping by the gate.
    if (inView(view, 1240, 1100)) {
      const flap = Math.sin(t * 6) * 4;
      g.lineStyle(1.5, P.iron, 1); g.lineBetween(1240, 1098, 1240, 1060);
      g.fillStyle(P.redcoat, 1); g.fillTriangle(1240, 1060, 1240, 1074, 1262, 1067 + flap);
    }
  },

  animateOver(g: G, t: number, view: Rect) {
    // Signal flags on the mast's halyard: blue over red, flapping.
    if (inView(view, MAST.x, MAST.y - 200, 200)) {
      const cols = [P.flagBlue, P.redcoat, P.saltpetre, P.flagBlue];
      for (let i = 0; i < 4; i++) {
        const y = MAST.y - 194 + i * 16;
        const fx = MAST.x + 60;
        const flap = Math.sin(t * 5 + i * 0.8) * 4;
        g.fillStyle(cols[i], 1);
        g.fillPoints([{ x: fx, y }, { x: fx + 22, y: y + 2 + flap }, { x: fx + 22, y: y + 12 + flap }, { x: fx, y: y + 12 }], true);
      }
      g.lineStyle(1, 0x2a2420, 1); g.lineBetween(MAST.x + 60, MAST.y - 196, MAST.x + 60, MAST.y - 128);
      // A pennant streaming off the masthead.
      const s = Math.sin(t * 4) * 5;
      g.fillStyle(P.spark, 1); g.fillTriangle(MAST.x, MAST.y - 232, MAST.x, MAST.y - 222, MAST.x + 46, MAST.y - 228 + s);
    }
    // The noon gun: one rampart gun fires a salute every so often.
    const cyc = t % 14;
    const gi = Math.floor(t / 14) % RAMPART_GUNS.length;
    const gx = RAMPART_GUNS[gi] + (gi % 2 ? 8 : -8);
    if (cyc < 2.4 && inView(view, gx, 70, 300)) {
      if (cyc < 0.12) { g.fillStyle(P.sparkHot, 0.9); g.fillCircle(gx, 66, 18); }
      drawPuff(g, gx + cyc * 10, 60 - cyc * 18, 14 + cyc * 18, P.smoke, 0.55 * (1 - cyc / 2.4), gi);
    }
    // Smoke off the cookhouse chimney and the keep's vents.
    for (const [x, y, k] of [[2205, 278, 1], [470, 294, 0.6], [650, 294, 0.6]] as [number, number, number][]) {
      if (!inView(view, x, y, 200)) continue;
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.35 + i * 0.25) % 1);
        drawPuff(g, x + ph * 30 + Math.sin(t + i) * 4, y - ph * 90, 6 + ph * 16, P.smoke, 0.3 * (1 - ph) * k, i);
      }
    }
    // The spark eating along the fuse cord on the keep's sigil — it never quite arrives.
    if (inView(view, KEEP.x, KEEP.y - 70)) {
      const ph = (t * 0.25) % 1;
      const sx = KEEP.x + 22 + ph * 70, sy = KEEP.y - 74 + 10 - Math.sin(ph * Math.PI * 2) * 12 + ph * 20;
      drawSpark(g, sx, sy, t * 1000, 0.7);
    }
  },
};

// ── Solids ───────────────────────────────────────────────────────────

const rect = (x: number, y: number, w: number, h: number): Solid => ({ kind: 'rect', x, y, w, h });
const circ = (x: number, y: number, r: number): Solid => ({ kind: 'circle', x, y, r });

const SOLIDS: Solid[] = [
  // Ramparts and borders (gate gaps left open).
  rect(0, 40, 1120, 110), rect(1280, 40, 1120, 110),
  rect(2320, 150, 80, 570), rect(2320, 880, 80, 720),
  rect(0, 150, 50, 1400), rect(0, 1550, 2320, 50),
  circ(1105, 150, 18), circ(1295, 150, 18), circ(2330, 712, 16), circ(2330, 888, 16),
  // Keep compound: walls, the keep, the moat either side of the drawbridge.
  rect(268, 236, 584, 24), rect(268, 260, 32, 476), rect(828, 260, 24, 380),
  rect(415, 412, 290, 58),
  rect(300, 640, 225, 96), rect(595, 640, 265, 96),
  circ(515, 640, 8), circ(605, 640, 8),
  // Town.
  rect(915, 570, 210, 40),
  circ(MAST.x, MAST.y, 14),
  rect(1300, 244, 120, 36), rect(1450, 244, 120, 36),
  rect(1690, 480, 380, 40), rect(2070, 360, 180, 40),
  ...BRAZIERS.map((b) => circ(b.x, b.y, 9)),
  // Keg racks, cooper's bench.
  ...KEG_RACKS_X.flatMap((x) => [rect(x - 58, 1162, 116, 28), rect(x - 58, 1412, 116, 28)]),
  rect(886, 1254, 60, 18),
  // Range.
  rect(1612, 1106, 56, 16),
  ...TARGETS_Y.map((y) => circ(2220, y - 4, 14)),
  rect(1700, 1094, 180, 20),
  // Sandbag lines and the limber.
  rect(1560, 982, 160, 20), rect(860, 1024, 150, 20), rect(1980, 704, 140, 20), rect(1980, 884, 140, 20),
  rect(1438, 846, 66, 18),
];

export const POWDER_AREA: AreaDef = {
  id: 'powder',
  isle: 'fire',
  court: 'powder',
  name: 'The Powder Court',
  subtitle: 'Magazine of Brandmark — held by Prince Fuse',
  w: W,
  h: H,
  bg: 0x5e4c34,
  accent: 0xffb02e,
  weather: 'smoke',
  spawn: { x: 2180, y: 800 },
  painter,
  solids: SOLIDS,
  exits: [
    { side: 'n', to: 'boilerworks', at: 1200, label: 'North Gate — to the Boilerworks' },
    { side: 'e', to: 'emberport', at: 800, label: 'East Gate — to Emberport' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 2200, y: 870 } },
    { kind: 'prince', id: 'fuse', at: { x: 560, y: 560 } },
    { kind: 'water', id: 'powder-moat-water', shape: MOAT, fishery: 'powder-moat' },
    { kind: 'encounter', id: 'powder-keg-alley' },
    { kind: 'encounter', id: 'powder-cannon-ridge' },
    { kind: 'encounter', id: 'powder-twenty-paces' },
    { kind: 'encounter', id: 'powder-smoke-screen' },
    { kind: 'encounter', id: 'powder-minefield' },
    { kind: 'sign', at: { x: 1268, y: 214 }, text: 'By order of Prince Fuse: no naked flame within the walls, save the Tithe Fire. Which shall be KEPT HOT.' },
    { kind: 'sign', at: { x: 1150, y: 1080 }, text: 'DRILL FIELD. LIVE MINES. Keep to the flags. — Sapper Ironsides' },
    { kind: 'sign', at: { x: 640, y: 830 }, text: 'THE MAGAZINE. Bombproof. Fireproof. Visitor-proof. — F.' },
    { kind: 'chest', id: 'powder-chest-range', at: { x: 2280, y: 1180 }, coins: 60 },
    { kind: 'chest', id: 'powder-chest-keep', at: { x: 760, y: 340 }, orbs: 1, open: { prince: 'fuse' } },
  ],
  npcs: POWDER_NPCS,
  crowd: POWDER_CROWD,
};
