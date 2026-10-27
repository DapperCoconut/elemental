import type Phaser from 'phaser';
import type { AreaDef, AreaPainter, Pt, Rect, Solid } from '../../../../IslesTypes';
import { blob, dim, flagstones, lit, pool, road } from '../../../../art/IsleArt';
import {
  barometerTower, bottleCrates, chandlery, fieldRod, gateHouse, iceHouse, lightningJarInn, meterOffice,
  rainBarrel, stormBench, stormHouse, stormLamp, thunderStage, wallCistern, wallSegment, weatherPost, windsockMast,
} from './art';
import { STORMEYE_CROWD, STORMEYE_NPCS } from './npcs';
import { S, drawBolt, drawCloud, drawHailstone, drawRod, drawWeathercock, jit } from './util';

/**
 * THE STORMEYE COURT — a walled town in the calm eye of a storm that never ends.
 *
 * Layout (2400×1600): the storm wall is a great oval centred on the Calm, the paved compass-rose
 * plaza in the middle of town, and outside it the gale goes round and round for ever, purple and
 * roaring, its lightning walking the cloud-floor. The Galeward road comes in through the West Gate
 * and runs east along the main street — Brassey's chandlery on the left, houses either side — to
 * the Calm. North of the Calm stands the Barometer Tower, Prince Squall's keep; north-east, the Rod
 * Field, a grove of lightning rods that takes the strikes meant for the town, and the Charging Pen
 * behind its lightning gate. East: the Great Cistern (fishing) and Mull's wall cisterns on the east
 * wall. North-west: Clapper Boom's Thunder Stage. South-west: Hailwarden Grue's ice-house yard.
 * South of the Calm, the Meter Office with its racks of bottled breath, and the road out through the
 * South Gate to the Orbit Court. South-east: the Lightning Jar inn and, behind it, the Torn Row —
 * the street whose stretch of wall the Prince had knocked down for arrears, so that the gale pours
 * over it every night.
 */

type G = Phaser.GameObjects.Graphics;

const W = 2400;
const H = 1600;

/** The storm wall's oval. */
const CX = 1200, CY = 800, RX = 1040, RY = 660;
const wallPt = (a: number, d = 0): Pt => ({ x: CX + (RX + d) * Math.cos(a), y: CY + (RY + d * 0.75) * Math.sin(a) });
/** Gate gaps in the wall, by angle: the West Gate (π) and the South Gate (π/2). */
const GATES: { a: number; half: number }[] = [{ a: Math.PI, half: 0.17 }, { a: Math.PI / 2, half: 0.106 }];
/** The stretch of wall knocked down behind the Torn Row. */
const BREACH = { a0: 0.72, a1: 1.04 };
const inGate = (a: number): boolean => GATES.some((gt) => {
  let d = a - gt.a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) < gt.half;
});
const inBreach = (a: number): boolean => a > BREACH.a0 && a < BREACH.a1;
const insideOval = (x: number, y: number, shrink = 0): boolean =>
  ((x - CX) / (RX - shrink)) ** 2 + ((y - CY) / (RY - shrink)) ** 2 < 1;

const TOWER = { x: 1200, y: 470 };
const CALM = { x: 1200, y: 860, r: 190 };
const SHOP = { x: 520, y: 760 };
const OFFICE = { x: 900, y: 1180 };
const INN = { x: 1560, y: 1180 };
const ICEHOUSE = { x: 560, y: 1200 };
const STAGE = { x: 640, y: 560 };
const CISTERN: Rect = { x: 1620, y: 860, w: 260, h: 140 };
const WALL_CISTERNS: Pt[] = [{ x: 2080, y: 700 }, { x: 2100, y: 920 }];
const RODS: Pt[] = [{ x: 1560, y: 420 }, { x: 1640, y: 380 }, { x: 1720, y: 430 }, { x: 1600, y: 520 }, { x: 1720, y: 540 }, { x: 1800, y: 490 }];
const PEN = { x: 1800, y: 360, w: 120, h: 90 };
const POSTS: Pt[] = [{ x: 840, y: 420 }, { x: 1520, y: 1300 }, { x: 1960, y: 640 }];
const HOUSES: { x: number; y: number; w: number; h: number; wall: number; glow?: boolean; shut?: boolean; torn?: boolean; oilskin?: boolean }[] = [
  { x: 350, y: 700, w: 110, h: 88, wall: 0x5a6472, glow: true, oilskin: true },
  { x: 790, y: 710, w: 110, h: 92, wall: 0x646a78 },
  { x: 920, y: 700, w: 100, h: 84, wall: 0x5c6270, glow: true },
  { x: 380, y: 1010, w: 110, h: 88, wall: 0x606876, shut: true },
  { x: 1520, y: 700, w: 100, h: 86, wall: 0x5a6070, glow: true, oilskin: true },
  { x: 420, y: 470, w: 100, h: 84, wall: 0x626a7a, shut: true },
  { x: 960, y: 1400, w: 100, h: 84, wall: 0x5e6674, glow: true },
  { x: 1440, y: 1400, w: 100, h: 84, wall: 0x646c7a, shut: true, oilskin: true },
  // The Torn Row.
  { x: 1760, y: 1280, w: 100, h: 84, wall: 0x545a66, torn: true },
  { x: 1880, y: 1200, w: 100, h: 84, wall: 0x5a5e6a, torn: true },
];
const LAMPS: Pt[] = [
  { x: 260, y: 850 }, { x: 640, y: 850 }, { x: 980, y: 760 }, { x: 1010, y: 980 }, { x: 1390, y: 760 }, { x: 1390, y: 980 },
  { x: 1260, y: 620 }, { x: 1140, y: 1120 }, { x: 1260, y: 1320 }, { x: 1560, y: 790 }, { x: 1880, y: 760 }, { x: 720, y: 1010 },
];
const BENCHES: Pt[] = [{ x: 1060, y: 740 }, { x: 1340, y: 1000 }, { x: 1060, y: 1000 }];
const BARRELS: Pt[] = [{ x: 680, y: 760 }, { x: 1110, y: 640 }, { x: 1640, y: 1040 }, { x: 1300, y: 1150 }, { x: 470, y: 1060 }];
const PUDDLES: { x: number; y: number; rx: number; ry: number }[] = [
  { x: 480, y: 820, rx: 30, ry: 10 }, { x: 860, y: 830, rx: 40, ry: 12 }, { x: 1200, y: 1150, rx: 34, ry: 11 },
  { x: 1480, y: 850, rx: 28, ry: 9 }, { x: 1700, y: 1220, rx: 46, ry: 14 }, { x: 1820, y: 1320, rx: 38, ry: 12 },
  { x: 1200, y: 650, rx: 26, ry: 9 }, { x: 700, y: 950, rx: 30, ry: 10 }, { x: 1420, y: 560, rx: 30, ry: 9 },
  { x: 1960, y: 820, rx: 36, ry: 11 }, { x: 300, y: 930, rx: 28, ry: 9 },
];

const inView = (v: Rect, x: number, y: number, pad = 140): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

// ── Ground ───────────────────────────────────────────────────────────

/**
 * The gale beyond the wall, baked: a bruise-purple floor of cloud with long pale streaks wound
 * round the oval, darker the further out. The live streaks, clouds and lightning ride over it.
 */
function paintGale(g: G, rng: () => number): void {
  g.fillStyle(S.galeDark, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) blob(g, rng() * W, rng() * H, 80 + rng() * 200, 30 + rng() * 70, S.gale, 0.45, rng);
  for (let i = 0; i < 260; i++) {
    const a = rng() * Math.PI * 2, d = 40 + rng() * 420, span = 0.05 + rng() * 0.18;
    g.lineStyle(1 + rng() * 3, rng() < 0.5 ? S.galeLit : S.cloud, 0.12 + rng() * 0.2);
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const p = wallPt(a + (k / 6) * span, d); if (k === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
    g.strokePath();
  }
  // The churn hard against the wall: spray thrown back off the stone.
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const p = wallPt(a, 30 + rng() * 30);
    g.fillStyle(S.cloudLit, 0.15 + rng() * 0.15); g.fillEllipse(p.x, p.y, 40 + rng() * 40, 14 + rng() * 10);
  }
}

/** A puddle that holds the sky: dark water with a pale rim and a streak of reflected light. */
function puddle(g: G, x: number, y: number, rx: number, ry: number): void {
  g.fillStyle(S.wet, 1); g.fillEllipse(x, y, rx * 2 + 6, ry * 2 + 4);
  g.fillStyle(S.puddle, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
  g.fillStyle(S.puddleLit, 0.35); g.fillEllipse(x - rx * 0.3, y - ry * 0.2, rx * 0.9, ry * 0.4);
}

function paintGround(g: G, rng: () => number): void {
  paintGale(g, rng);

  // ── The town floor inside the wall: wet slate-grey setts, darker where the water stands ──
  g.fillStyle(S.wet, 1); g.fillEllipse(CX, CY, RX * 2 + 40, RY * 2 + 30);
  g.fillStyle(S.slate, 1); g.fillEllipse(CX, CY, RX * 2, RY * 2);
  for (let i = 0; i < 140; i++) {
    const x = CX + (rng() - 0.5) * RX * 2, y = CY + (rng() - 0.5) * RY * 2;
    if (!insideOval(x, y, 60)) continue;
    g.fillStyle(rng() < 0.5 ? S.slateLit : S.wet, 0.25 + rng() * 0.25);
    g.fillEllipse(x, y, 70 + rng() * 180, 30 + rng() * 70);
  }
  for (let i = 0; i < 4200; i++) {
    const x = CX + (rng() - 0.5) * RX * 2, y = CY + (rng() - 0.5) * RY * 2;
    if (!insideOval(x, y, 30)) continue;
    g.fillStyle(rng() < 0.5 ? S.cobbleLit : S.slateDark, 0.18 + rng() * 0.2);
    g.fillRoundedRect(x, y, 5 + rng() * 4, 3 + rng() * 3, 1.5);
  }
  // Moss in the lee of the wall, where nothing dries.
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2;
    const p = wallPt(a, -40 - rng() * 40);
    g.fillStyle(S.moss, 0.25 + rng() * 0.2); g.fillEllipse(p.x, p.y, 40 + rng() * 60, 12 + rng() * 14);
  }

  // ── Streets: cobbled, crowned, with a gutter down each side ──
  const street = (pts: Pt[], w: number) => {
    road(g, pts, w, S.cobble, S.slateDark, S.cobbleLit, rng);
    // A gutter along the line, dark and running.
    g.lineStyle(2, S.wet, 0.8);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y + w * 0.42);
    for (const p of pts) g.lineTo(p.x, p.y + w * 0.42);
    g.strokePath();
  };
  street([{ x: -20, y: 800 }, { x: 360, y: 800 }, { x: 1030, y: 830 }], 84);
  street([{ x: 1370, y: 840 }, { x: 1600, y: 830 }, { x: 1960, y: 800 }], 70);
  street([{ x: 1200, y: 690 }, { x: 1200, y: 480 }], 78);
  street([{ x: 1200, y: 1040 }, { x: 1200, y: H + 20 }], 80);
  street([{ x: 700, y: 810 }, { x: 650, y: 640 }], 46);
  street([{ x: 720, y: 820 }, { x: 700, y: 1000 }, { x: 690, y: 1130 }], 48);
  street([{ x: 1060, y: 940 }, { x: 960, y: 1060 }, { x: 930, y: 1210 }], 50);
  street([{ x: 1330, y: 960 }, { x: 1480, y: 1100 }, { x: 1560, y: 1210 }], 50);
  street([{ x: 1290, y: 720 }, { x: 1500, y: 580 }, { x: 1660, y: 480 }], 50);
  street([{ x: 1650, y: 1220 }, { x: 1760, y: 1300 }, { x: 1860, y: 1240 }], 44);
  street([{ x: 1600, y: 830 }, { x: 1600, y: 1030 }], 40);

  // ── The Calm: a round plaza with a compass rose of slate and brass set in it ──
  g.fillStyle(S.slateDark, 1); g.fillCircle(CALM.x, CALM.y, CALM.r + 10);
  g.fillStyle(S.granite, 1); g.fillCircle(CALM.x, CALM.y, CALM.r);
  for (let ring = 0; ring < 5; ring++) {
    const r0 = 40 + ring * 30;
    const n = 10 + ring * 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2;
      const x = CALM.x + Math.cos(a) * (r0 + 14), y = CALM.y + Math.sin(a) * (r0 + 14);
      g.fillStyle(rng() < 0.5 ? S.graniteLit : S.granite, 1); g.fillCircle(x, y, 11);
      g.lineStyle(1, S.graniteDark, 0.7); g.strokeCircle(x, y, 11);
    }
  }
  // The rose: sixteen points, the cardinals long and brass, the rest slate.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const L = i % 4 === 0 ? CALM.r - 14 : i % 2 === 0 ? CALM.r * 0.6 : CALM.r * 0.42;
    const wA = i % 4 === 0 ? 0.13 : 0.1;
    const tip = { x: CALM.x + Math.cos(a) * L, y: CALM.y + Math.sin(a) * L };
    const l = { x: CALM.x + Math.cos(a - wA * 2) * 26, y: CALM.y + Math.sin(a - wA * 2) * 26 };
    const r = { x: CALM.x + Math.cos(a + wA * 2) * 26, y: CALM.y + Math.sin(a + wA * 2) * 26 };
    const c = i % 4 === 0 ? S.brass : i % 2 === 0 ? S.slateDark : S.slateLit;
    g.fillStyle(c, 1); g.fillTriangle(l.x, l.y, r.x, r.y, tip.x, tip.y);
    g.fillStyle(lit(c, 0.25), 0.6); g.fillTriangle(CALM.x, CALM.y, l.x, l.y, tip.x, tip.y);
  }
  g.fillStyle(S.brassDark, 1); g.fillCircle(CALM.x, CALM.y, 22);
  g.fillStyle(S.eye, 1); g.fillCircle(CALM.x, CALM.y, 16);
  g.fillStyle(S.eyeLit, 1); g.fillCircle(CALM.x - 4, CALM.y - 4, 6);
  // The cardinal letters as brass studs: one stud for N, two for E… four for W.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    for (let k = 0; k <= i; k++) {
      const off = (k - i / 2) * 9;
      g.fillStyle(S.brassLit, 1); g.fillCircle(CALM.x + Math.cos(a) * (CALM.r - 4) - Math.sin(a) * off, CALM.y + Math.sin(a) * (CALM.r - 4) + Math.cos(a) * off, 3);
    }
  }

  // ── The tower forecourt: wet flags in a fan before the steps ──
  flagstones(g, { x: TOWER.x - 150, y: TOWER.y + 4, w: 300, h: 60 }, 30, S.granite, S.slateDark, rng);
  for (let i = 0; i < 6; i++) puddle(g, TOWER.x - 120 + rng() * 240, TOWER.y + 20 + rng() * 40, 10 + rng() * 10, 4 + rng() * 3);

  // ── The Rod Field: blackened, star-burned ground, fused glass where bolts went in ──
  blob(g, 1680, 470, 220, 130, S.slateDark, 0.6, rng, 12);
  for (const r of RODS) {
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rng() * 0.3, L = 26 + rng() * 34;
      g.lineStyle(2, 0x14161c, 0.7); g.lineBetween(r.x, r.y, r.x + Math.cos(a) * L, r.y + Math.sin(a) * L * 0.55);
    }
    g.fillStyle(0x14161c, 0.8); g.fillEllipse(r.x, r.y, 34, 14);
  }
  for (let i = 0; i < 16; i++) {
    const x = 1520 + rng() * 320, y = 380 + rng() * 200;
    g.lineStyle(1.5, S.glass, 0.35); g.lineBetween(x, y, x + (rng() - 0.5) * 30, y + (rng() - 0.5) * 12);
  }

  // ── The Great Cistern: a sunk reservoir with granite steps on the south side ──
  pool(g, CISTERN, S.waterDeep, S.water, S.granite, rng);
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? S.graniteLit : S.granite, 1); g.fillRect(CISTERN.x + 90 - i * 8, CISTERN.y + CISTERN.h + 8 + i * 6, 80 + i * 16, 6); }
  for (let i = 0; i < 10; i++) { g.fillStyle(S.graniteDark, 1); g.fillRect(CISTERN.x - 8 + i * 30, CISTERN.y - 12, 3, 6); }
  // Downpipe channels running to it across the street.
  for (const sx of [1560, 1700, 1840]) { g.lineStyle(3, S.wet, 0.9); g.lineBetween(sx, 770, sx + 10, CISTERN.y - 8); }

  // ── Grue's yard: hail ground into the setts, frost round the ice-house ──
  blob(g, ICEHOUSE.x + 40, ICEHOUSE.y - 30, 200, 120, S.hailShade, 0.25, rng, 12);
  for (let i = 0; i < 260; i++) {
    const x = ICEHOUSE.x - 150 + rng() * 320, y = ICEHOUSE.y - 140 + rng() * 210;
    if (!insideOval(x, y, 40)) continue;
    g.fillStyle(rng() < 0.5 ? S.hail : S.hailShade, 0.5 + rng() * 0.4); g.fillCircle(x, y, 1 + rng() * 2);
  }

  // ── The Thunder Stage: a boarded platform ──
  g.fillStyle(S.timber, 1); g.fillRect(STAGE.x - 150, STAGE.y - 20, 300, 60);
  for (let i = 0; i < 15; i++) { g.lineStyle(1, dim(S.timber, 0.4), 1); g.lineBetween(STAGE.x - 150 + i * 20, STAGE.y - 20, STAGE.x - 150 + i * 20, STAGE.y + 40); }
  g.fillStyle(S.timberLit, 1); g.fillRect(STAGE.x - 150, STAGE.y - 20, 300, 3);

  // ── The Meter Office yard: cart ruts and spilled straw ──
  for (const dx of [-14, 14]) { g.lineStyle(3, S.wet, 0.8); g.lineBetween(OFFICE.x + 220 + dx, OFFICE.y + 20, OFFICE.x + 300 + dx, OFFICE.y + 120); }
  for (let i = 0; i < 60; i++) { g.lineStyle(1, 0xc8b060, 0.5); const x = OFFICE.x + 160 + rng() * 140, y = OFFICE.y + 30 + rng() * 60; g.lineBetween(x, y, x + 5, y + 2); }

  // ── The Torn Row: slates and laths blown everywhere, standing water, a scoured stripe ──
  blob(g, 1800, 1260, 200, 90, S.wet, 0.6, rng, 12);
  for (let i = 0; i < 70; i++) {
    const x = 1640 + rng() * 300, y = 1160 + rng() * 170;
    if (!insideOval(x, y, 40)) continue;
    if (rng() < 0.6) { g.fillStyle(S.slateDark, 0.9); g.fillRect(x, y, 7, 4); }
    else { g.lineStyle(2, S.timber, 0.9); g.lineBetween(x, y, x + 10 + rng() * 10, y + (rng() - 0.5) * 6); }
  }
  // The scour where the gale comes over: streaks fanning in from the breach.
  for (let i = 0; i < 26; i++) {
    const a = BREACH.a0 + rng() * (BREACH.a1 - BREACH.a0);
    const p = wallPt(a, -20), q = wallPt(a - 0.15, -150 - rng() * 120);
    g.lineStyle(2 + rng() * 2, S.slateLit, 0.15); g.lineBetween(p.x, p.y, q.x, q.y);
  }

  for (const p of PUDDLES) puddle(g, p.x, p.y, p.rx, p.ry);
}

// ── Pieces ───────────────────────────────────────────────────────────

type Piece = NonNullable<AreaPainter['pieces']>[number];

/** The storm wall, cut into short lengths so each sorts at its own base line. */
function wallPieces(): Piece[] {
  const out: Piece[] = [];
  const N = 84;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    if (inGate(am)) continue;
    const p = wallPt(a0), q = wallPt(a1);
    const south = Math.sin(am) > 0.15;
    const h = inBreach(am) ? 12 : south ? 34 : 74;
    out.push({
      x: (p.x + q.x) / 2, y: Math.max(p.y, q.y), w: Math.abs(q.x - p.x) + 40, h: h + 30,
      draw: (g) => {
        wallSegment(g, p.x, p.y, q.x, q.y, h, i * 3.3);
        if (inBreach(am)) {
          // Knocked down to a stump: tumbled blocks on the town side.
          for (let k = 0; k < 4; k++) {
            const u = jit(i, k);
            g.fillStyle(k % 2 ? S.graniteDark : S.granite, 1);
            g.fillRect(p.x + (q.x - p.x) * u - 8 - 10, p.y + (q.y - p.y) * u - 6 - 16 * jit(i, k + 5), 14, 9);
          }
        }
        if (!south && i % 6 === 0) windsockMast(g, (p.x + q.x) / 2, Math.min(p.y, q.y) - h - 8);
      },
    });
  }
  return out;
}

function pieces(): Piece[] {
  const out: Piece[] = [...wallPieces()];
  out.push({ x: 190, y: 910, w: 120, h: 420, draw: (g) => gateHouse(g, 190, 800, 'h') });
  out.push({ x: 1200, y: 1470, w: 300, h: 200, draw: (g) => gateHouse(g, 1200, 1470, 'v') });
  out.push({ x: TOWER.x, y: TOWER.y, w: 520, h: 470, draw: (g, rng) => { barometerTower(g, TOWER.x, TOWER.y, rng); } });
  for (const h of HOUSES) out.push({ x: h.x, y: h.y, w: h.w + 40, h: h.h + h.w * 0.8 + 40, draw: (g, rng) => stormHouse(g, h.x, h.y, h.w, h.h, h, rng) });
  out.push({ x: SHOP.x, y: SHOP.y, w: 300, h: 260, draw: (g, rng) => chandlery(g, SHOP.x, SHOP.y, rng) });
  out.push({ x: OFFICE.x, y: OFFICE.y, w: 380, h: 160, draw: (g, rng) => { meterOffice(g, OFFICE.x, OFFICE.y, rng); } });
  out.push({ x: INN.x, y: INN.y, w: 300, h: 340, draw: (g, rng) => { lightningJarInn(g, INN.x, INN.y, rng); } });
  out.push({ x: ICEHOUSE.x, y: ICEHOUSE.y, w: 260, h: 110, draw: (g, rng) => iceHouse(g, ICEHOUSE.x, ICEHOUSE.y, rng) });
  out.push({ x: STAGE.x, y: STAGE.y, w: 320, h: 170, draw: (g) => thunderStage(g, STAGE.x, STAGE.y) });
  for (const c of WALL_CISTERNS) out.push({ x: c.x, y: c.y, w: 160, h: 160, draw: (g) => wallCistern(g, c.x, c.y, 0.4 + jit(c.x, 1) * 0.5) });
  for (const r of RODS) out.push({ x: r.x, y: r.y, w: 40, h: 140, draw: (g) => fieldRod(g, r.x, r.y, 120) });
  for (const p of POSTS) out.push({ x: p.x, y: p.y, w: 40, h: 110, draw: (g) => weatherPost(g, p.x, p.y) });
  for (const l of LAMPS) out.push({ x: l.x, y: l.y, w: 30, h: 90, draw: (g) => stormLamp(g, l.x, l.y) });
  for (const b of BENCHES) out.push({ x: b.x, y: b.y, w: 90, h: 70, draw: (g) => stormBench(g, b.x, b.y) });
  for (const b of BARRELS) out.push({ x: b.x, y: b.y, w: 30, h: 30, draw: (g) => rainBarrel(g, b.x, b.y, 11) });
  out.push({ x: OFFICE.x + 230, y: OFFICE.y + 60, w: 100, h: 40, draw: (g) => bottleCrates(g, OFFICE.x + 230, OFFICE.y + 60) });
  // The Charging Pen: a fence of short rods, its gate a lightning gate (drawn by the engine).
  out.push({
    x: PEN.x + PEN.w / 2, y: PEN.y + PEN.h, w: PEN.w + 40, h: PEN.h + 80,
    draw: (g) => {
      for (let x = PEN.x; x <= PEN.x + PEN.w; x += 20) drawRod(g, x, PEN.y + 10, 44);
      for (let y = PEN.y + 30; y <= PEN.y + PEN.h; y += 20) { drawRod(g, PEN.x, y, 40); drawRod(g, PEN.x + PEN.w, y, 40); }
    },
  });
  return out;
}

// ── Animation ────────────────────────────────────────────────────────

const DIAL = { x: TOWER.x, y: TOWER.y - 330 * 0.6, r: 58 };
const JAR = { x: INN.x - 60, y: INN.y - 60 };
const RACKS: Pt[] = [];
for (const rx of [OFFICE.x - 85 - 52, OFFICE.x + 85 + 52]) for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i += 2) RACKS.push({ x: rx - 32 + i * 13, y: OFFICE.y - 6 - r * 24 - 5 });

const painter: AreaPainter = {
  ground: paintGround,
  pieces: pieces(),

  animate(g: G, t: number, view: Rect) {
    // The gale, going round: long streaks wound round the oval, quicker near the wall.
    for (let i = 0; i < 170; i++) {
      const d = 30 + jit(1, i) * 420;
      const w = 0.32 - d * 0.0004 + jit(2, i) * 0.08;
      const a = jit(3, i) * Math.PI * 2 - t * w;
      const p = wallPt(a, d);
      if (!inView(view, p.x, p.y, 60)) continue;
      const q = wallPt(a + 0.03 + jit(4, i) * 0.04, d);
      g.lineStyle(1 + jit(5, i) * 2.5, jit(6, i) < 0.3 ? S.cloudLit : S.galeLit, 0.25 + jit(7, i) * 0.3);
      g.lineBetween(p.x, p.y, q.x, q.y);
    }
    // Tumbling cloud-rags in the gale.
    for (let i = 0; i < 28; i++) {
      const d = 80 + jit(11, i) * 340;
      const a = jit(12, i) * Math.PI * 2 - t * (0.18 + jit(13, i) * 0.06);
      const p = wallPt(a, d);
      if (!inView(view, p.x, p.y, 80)) continue;
      drawCloud(g, p.x, p.y, 26 + jit(14, i) * 26, 0.55, jit(15, i) < 0.5 ? S.cloud : S.cloudDark, i);
    }
    // Rain rings on the Great Cistern.
    if (inView(view, CISTERN.x + CISTERN.w / 2, CISTERN.y + CISTERN.h / 2, 200)) {
      for (let i = 0; i < 14; i++) {
        const ph = (t * 0.9 + jit(21, i)) % 1;
        const x = CISTERN.x + 20 + jit(22, i + Math.floor(t * 0.9 + jit(21, i))) * (CISTERN.w - 40);
        const y = CISTERN.y + 20 + jit(23, i + Math.floor(t * 0.9 + jit(21, i))) * (CISTERN.h - 40);
        g.lineStyle(1, S.waterLit, 0.6 * (1 - ph)); g.strokeEllipse(x, y, 4 + ph * 22, 2 + ph * 8);
      }
    }
    // Rain rings in the puddles.
    for (const p of PUDDLES) {
      if (!inView(view, p.x, p.y, 40)) continue;
      const ph = (t * 1.3 + jit(p.x, 1)) % 1;
      g.lineStyle(1, S.puddleLit, 0.5 * (1 - ph)); g.strokeEllipse(p.x + (jit(p.x, Math.floor(t * 1.3)) - 0.5) * p.rx, p.y, 3 + ph * 14, 1 + ph * 5);
    }
    // Storm lanterns: a flame that leans with the wind, and light on the wet setts.
    for (const l of LAMPS) {
      if (!inView(view, l.x, l.y)) continue;
      g.fillStyle(S.lamp, 0.08 + Math.sin(t * 4 + l.x) * 0.02); g.fillEllipse(l.x, l.y + 4, 80, 26);
      const lean = Math.sin(t * 3 + l.y) * 1.5 + 1;
      g.fillStyle(S.lamp, 0.95); g.fillEllipse(l.x + lean, l.y - 66, 4, 8);
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(l.x + lean * 0.6, l.y - 65, 1.6, 3.6);
    }
    // The Rod Field: now and then a tip crackles and a thread of spark jumps to a neighbour.
    for (let i = 0; i < RODS.length; i++) {
      const r = RODS[i];
      if (!inView(view, r.x, r.y - 120)) continue;
      const ph = (t * 0.7 + jit(31, i)) % 1;
      if (ph < 0.12) {
        const o = RODS[(i + 1) % RODS.length];
        drawBolt(g, r.x, r.y - 132, o.x, o.y - 132, Math.floor(t * 20) + i, 0.7, 1.4, 10);
      }
      g.fillStyle(S.boltGlow, 0.15 + Math.sin(t * 9 + i) * 0.1); g.fillCircle(r.x, r.y - 128, 8);
    }
    // Mist turning in the bottles on the Meter Office racks.
    for (let i = 0; i < RACKS.length; i++) {
      const b = RACKS[i];
      if (!inView(view, b.x, b.y, 40)) continue;
      const a = t * 2 + i;
      g.fillStyle(0xffffff, 0.45); g.fillEllipse(b.x + Math.cos(a) * 1.2, b.y + Math.sin(a) * 0.8, 4, 1.8);
    }
    // The Lightning Jar's captured spark, worrying at the glass.
    if (inView(view, JAR.x, JAR.y)) {
      g.fillStyle(S.boltGlow, 0.25 + Math.sin(t * 13) * 0.1); g.fillCircle(JAR.x, JAR.y, 12);
      const sx = JAR.x + Math.sin(t * 7) * 5, sy = JAR.y + Math.cos(t * 9) * 7;
      drawBolt(g, JAR.x, JAR.y - 8, sx, sy, Math.floor(t * 30), 0.9, 1, 4);
      drawBolt(g, sx, sy, JAR.x + Math.cos(t * 5) * 9, JAR.y + 10, Math.floor(t * 30) + 1, 0.8, 1, 3);
    }
    // Anemometer cups whirling on the weather posts.
    for (const p of POSTS) {
      if (!inView(view, p.x, p.y - 90)) continue;
      for (let k = 0; k < 3; k++) {
        const a = t * 6 + (k / 3) * Math.PI * 2;
        const ex = p.x + Math.cos(a) * 12, ey = p.y - 94 + Math.sin(a) * 4;
        g.lineStyle(1.2, 0x2c323a, 1); g.lineBetween(p.x, p.y - 94, ex, ey);
        g.fillStyle(S.copper, 1); g.fillCircle(ex, ey, 3);
      }
    }
    // The light of the eye: a shaft of clear blue sky falling on the Calm, breathing.
    if (inView(view, CALM.x, CALM.y, 260)) {
      const k = 0.5 + Math.sin(t * 0.6) * 0.5;
      g.fillStyle(S.eyeLit, 0.05 + k * 0.04); g.fillEllipse(CALM.x, CALM.y, CALM.r * 2.2, CALM.r * 1.5);
      g.fillStyle(S.eyeLit, 0.05); g.fillEllipse(CALM.x, CALM.y, CALM.r * 1.2, CALM.r * 0.8);
    }
    // Hail rattling down on Grue's yard (the eye's one hard edge), bouncing where it lands.
    if (inView(view, ICEHOUSE.x, ICEHOUSE.y - 60, 200)) {
      for (let i = 0; i < 12; i++) {
        const ph = (t * 1.4 + jit(41, i)) % 1;
        const x = ICEHOUSE.x - 100 + jit(42, i) * 260, y0 = ICEHOUSE.y - 150 + jit(43, i) * 160;
        const bounce = ph > 0.7 ? Math.sin((ph - 0.7) / 0.3 * Math.PI) * 6 : 0;
        drawHailstone(g, x, ph < 0.7 ? y0 - (0.7 - ph) * 120 : y0 - bounce, 2, ph < 0.95 ? 0.9 : (1 - ph) * 18);
      }
    }
  },

  animateOver(g: G, t: number, view: Rect) {
    // Lightning walking the gale beyond the wall: a bolt every couple of seconds somewhere
    // out there, and a flash over the clouds round it.
    const slot = Math.floor(t / 1.7);
    const since = t - slot * 1.7;
    if (since < 0.22) {
      const a = jit(slot, 1) * Math.PI * 2;
      const top = wallPt(a, 120 + jit(slot, 2) * 260), foot = wallPt(a + 0.02, 40 + jit(slot, 3) * 60);
      if (inView(view, top.x, top.y, 300)) {
        const f = 1 - since / 0.22;
        g.fillStyle(S.boltGlow, 0.18 * f); g.fillCircle(foot.x, foot.y, 160);
        drawBolt(g, top.x, top.y - 200, foot.x, foot.y, slot, f, 3, 30);
      }
    }
    // The gale spilling over the breach behind the Torn Row: streaks pouring in and dying.
    const mid = wallPt((BREACH.a0 + BREACH.a1) / 2);
    if (inView(view, mid.x, mid.y, 360)) {
      for (let i = 0; i < 26; i++) {
        const ph = (t * 0.9 + jit(51, i)) % 1;
        const a = BREACH.a0 + jit(52, i) * (BREACH.a1 - BREACH.a0);
        const p = wallPt(a - ph * 0.22, 40 - ph * 260);
        const q = wallPt(a - ph * 0.22 - 0.03, 40 - ph * 260 - 20);
        g.lineStyle(1.5 + jit(53, i) * 2, S.cloudLit, 0.5 * (1 - ph)); g.lineBetween(p.x, p.y, q.x, q.y);
      }
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.5 + jit(54, i)) % 1;
        const a = BREACH.a0 + jit(55, i) * (BREACH.a1 - BREACH.a0);
        const p = wallPt(a - ph * 0.15, 20 - ph * 180);
        drawCloud(g, p.x, p.y - 20, 20 + ph * 14, 0.4 * (1 - ph), S.cloudLit, i + 3);
      }
    }
    // Windsocks on the wall-walk, streaming round with the gale.
    const N = 84;
    for (let i = 0; i < N; i += 6) {
      const am = ((i + 0.5) / N) * Math.PI * 2;
      if (inGate(am) || Math.sin(am) > 0.15) continue;
      const p = wallPt(i / N * Math.PI * 2), q = wallPt((i + 1) / N * Math.PI * 2);
      const mx = (p.x + q.x) / 2 + 4, my = Math.min(p.y, q.y) - 74 - 8 - 58;
      if (!inView(view, mx, my, 60)) continue;
      // The sock flies along the gale's direction (tangent to the wall, clockwise on screen).
      const ta = am - Math.PI / 2 + Math.sin(t * 3 + i) * 0.2;
      for (let k = 0; k < 4; k++) {
        const u = k / 4;
        const x = mx + Math.cos(ta) * (6 + u * 26), y = my + Math.sin(ta) * (6 + u * 26) * 0.6 + Math.sin(t * 9 + k) * 1.5;
        g.fillStyle(k % 2 ? 0xf0ece4 : S.red, 1); g.fillCircle(x, y, 4 - u * 2);
      }
    }
    // The great barometer needle, shivering at STORMY.
    if (inView(view, DIAL.x, DIAL.y, 200)) {
      const a = Math.PI * 0.86 + Math.sin(t * 1.3) * 0.04 + Math.sin(t * 7.1) * 0.012;
      g.lineStyle(4, 0x1a1410, 1); g.lineBetween(DIAL.x, DIAL.y, DIAL.x + Math.cos(a) * (DIAL.r - 8), DIAL.y + Math.sin(a) * (DIAL.r - 8));
      g.lineStyle(2, S.red, 1); g.lineBetween(DIAL.x, DIAL.y, DIAL.x + Math.cos(a) * (DIAL.r - 10), DIAL.y + Math.sin(a) * (DIAL.r - 10));
      g.lineStyle(2, 0x1a1410, 1); g.lineBetween(DIAL.x, DIAL.y, DIAL.x - Math.cos(a) * 16, DIAL.y - Math.sin(a) * 16);
      g.fillStyle(S.brass, 1); g.fillCircle(DIAL.x, DIAL.y, 6);
    }
    // The weathercock on the cupola, and smaller ones on the gatehouses, swung by the gale.
    const cocks: [number, number, number][] = [[TOWER.x, TOWER.y - 330 - 108, 16], [190, 690 - 184, 8], [190, 910 - 184, 8], [1104, 1470 - 184, 8], [1296, 1470 - 184, 8]];
    for (const [x, y, s] of cocks) {
      if (!inView(view, x, y, 80)) continue;
      drawWeathercock(g, x, y, s, t * 0.9 + Math.sin(t * 2.3 + x) * 0.8);
    }
    // Spray thrown over the north wall's merlons in gusts.
    for (let i = 0; i < 10; i++) {
      const ph = (t * 0.7 + jit(61, i)) % 1;
      const a = Math.PI * (1.15 + jit(62, i) * 0.7);
      const p = wallPt(a);
      if (!inView(view, p.x, p.y - 80, 80)) continue;
      g.fillStyle(S.cloudLit, 0.3 * (1 - ph)); g.fillCircle(p.x - ph * 30, p.y - 84 + ph * 30, 4 + ph * 10);
    }
  },
};

// ── Solids ───────────────────────────────────────────────────────────

const rect = (x: number, y: number, w: number, h: number): Solid => ({ kind: 'rect', x, y, w, h });
const circ = (x: number, y: number, r: number): Solid => ({ kind: 'circle', x, y, r });

function wallSolids(): Solid[] {
  const out: Solid[] = [];
  const N = 160;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    if (inGate(a)) continue;
    const p = wallPt(a);
    out.push(circ(p.x, p.y, 28));
  }
  return out;
}

const SOLIDS: Solid[] = [
  // Map borders, with the two road gaps (west at y 800, south at x 1200).
  rect(0, 0, W, 30), rect(0, 0, 24, 700), rect(0, 900, 24, H - 900), rect(W - 24, 0, 24, H),
  rect(0, H - 24, 1080, 24), rect(1320, H - 24, W - 1320, 24),
  // The gale — sealed out by the wall ring — and the two causeways through it.
  ...wallSolids(),
  rect(0, 676, 200, 24), rect(0, 900, 200, 24),
  rect(1068, 1440, 22, H - 1440), rect(1310, 1440, 22, H - 1440),
  // Gatehouse towers.
  circ(190, 690, 38), circ(190, 910, 38), circ(1096, 1462, 34), circ(1304, 1462, 34),
  // The Barometer Tower and its wings.
  rect(TOWER.x - 232, TOWER.y - 60, 464, 50), rect(TOWER.x - 232, TOWER.y - 10, 190, 10), rect(TOWER.x + 42, TOWER.y - 10, 190, 10),
  // Houses, shops, works.
  ...HOUSES.map((h) => rect(h.x - h.w / 2, h.y - 28, h.w + 16, 28)),
  rect(SHOP.x - 100, SHOP.y - 28, 216, 28), rect(SHOP.x + 26, SHOP.y - 22, 64, 20),
  rect(OFFICE.x - 180, OFFICE.y - 30, 360, 30),
  rect(INN.x - 120, INN.y - 30, 256, 30),
  circ(ICEHOUSE.x, ICEHOUSE.y - 24, 60), rect(ICEHOUSE.x - 110, ICEHOUSE.y - 20, 50, 20), circ(ICEHOUSE.x + 75, ICEHOUSE.y - 8, 22),
  rect(STAGE.x - 92, STAGE.y - 22, 110, 22), circ(STAGE.x + 70, STAGE.y - 26, 34), circ(STAGE.x - 128, STAGE.y - 4, 8),
  ...WALL_CISTERNS.flatMap((c) => [circ(c.x - 34, c.y - 6, 14), circ(c.x + 34, c.y - 6, 14), rect(c.x - 48, c.y - 40, 96, 30)]),
  rect(CISTERN.x - 8, CISTERN.y - 8, CISTERN.w + 16, CISTERN.h + 16),
  ...RODS.map((r) => circ(r.x, r.y - 4, 10)),
  ...POSTS.map((p) => circ(p.x, p.y - 2, 6)),
  ...LAMPS.map((l) => circ(l.x, l.y - 2, 6)),
  ...BENCHES.map((b) => rect(b.x - 32, b.y - 14, 64, 14)),
  ...BARRELS.map((b) => circ(b.x, b.y - 6, 11)),
  rect(OFFICE.x + 230 - 40, OFFICE.y + 60 - 22, 80, 22),
  // The Charging Pen's three fenced sides (the fourth is the gate).
  rect(PEN.x - 8, PEN.y - 6, PEN.w + 16, 22), rect(PEN.x - 8, PEN.y, 16, PEN.h + 8), rect(PEN.x + PEN.w - 8, PEN.y, 16, PEN.h + 8),
];

export const STORMEYE_AREA: AreaDef = {
  id: 'stormeye',
  isle: 'air',
  court: 'stormeye',
  name: 'The Stormeye Court',
  subtitle: 'The town in the eye — forecast by Prince Squall',
  w: W,
  h: H,
  bg: S.galeDark,
  accent: 0x9ab0e8,
  weather: 'storm',
  spawn: { x: 280, y: 800 },
  painter,
  solids: SOLIDS,
  exits: [
    { side: 'w', to: 'galeward', at: 800, label: 'The Windward Causeway — to the Galeward Court' },
    { side: 's', to: 'orbit', at: 1200, label: 'The Tether Stair — down to the Orbit Court' },
  ],
  pois: [
    { kind: 'waystone', at: { x: 300, y: 880 } },
    { kind: 'prince', id: 'squall', at: { x: TOWER.x, y: TOWER.y + 75 } },
    { kind: 'water', id: 'stormeye-cistern-water', shape: CISTERN, fishery: 'stormeye-cistern' },
    { kind: 'encounter', id: 'stormeye-lightning-rod' },
    { kind: 'encounter', id: 'stormeye-hailstorm' },
    { kind: 'encounter', id: 'stormeye-eye' },
    { kind: 'encounter', id: 'stormeye-raincatcher' },
    { kind: 'encounter', id: 'stormeye-thunderclap' },
    { kind: 'sign', at: { x: 330, y: 740 }, text: 'STORMEYE. The calm is the Prince\'s gift and is metered accordingly. Breathe within your means.' },
    { kind: 'sign', at: { x: 1060, y: 640 }, text: 'THE BAROMETER TOWER. Today\'s forecast is posted at dawn. The forecast is not an opinion.' },
    { kind: 'sign', at: { x: 1500, y: 440 }, text: 'THE ROD FIELD. Stand among the rods, not between them. The lightning keeps its own count.' },
    { kind: 'sign', at: { x: 1580, y: 1000 }, text: 'THE GREAT CISTERN. Rainwater is the property of the court. Fishing by permit. Permits by tax.' },
    { kind: 'sign', at: { x: 1640, y: 1310 }, text: 'THE TORN ROW. Arrears of this street are being collected by the weather. — S.' },
    { kind: 'chest', id: 'stormeye-chest-pen', at: { x: PEN.x + PEN.w / 2, y: PEN.y + 46 }, coins: 140, orbs: 1 },
    { kind: 'chest', id: 'stormeye-chest-row', at: { x: 1700, y: 1328 }, coins: 120 },
  ],
  gates: [
    { rect: { x: PEN.x + 8, y: PEN.y + PEN.h - 4, w: PEN.w - 16, h: 14 }, open: { prince: 'squall' }, look: 'lightning', label: 'The Charging Pen — live until the Prince falls' },
  ],
  npcs: STORMEYE_NPCS,
  crowd: STORMEYE_CROWD,
};
