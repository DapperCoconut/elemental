import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import {
  banner, barrel, blob, brandSigil, crate, dim, glow, groundFill, house, lamp, pool, road, rock,
  shadow, type G,
} from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, CINDER, COPPER, COPPER_DARK, COPPER_LIT, HAZARD_YELLOW, HOT, HOT_LIT, IRON, IRON_DARK,
  IRON_LIT, REDLINE, RIVET, SOOT, VERDIGRIS, copperPipe, dial, hazardStripes, inView, noise, pipeElbow,
  plate, rivets, steamPuff, valveWheel,
} from './util';

/**
 * The Boilerworks yard, painted. Everything here is placed from the layout constants below, which
 * `area.ts` also reads for solids, so a pipe drawn is a pipe you bump into.
 *
 * Reading order of the yard: the factory wall and its chimneys along the north edge; Gauge's
 * control tower and the Great Boiler at north-centre; copper mains snaking out of the boiler
 * across the cinder ground; two overhead gantry mains you walk *under*; the coal conveyor and
 * hopper to the west; the cooling pond and scalding-house south-west; the drop-hammer shed
 * south-centre; bunkhouses and the Company Store south-east; Pinter's valve manifold and
 * Kessel's boiler-heart on the east side by the gate.
 */

// ── Layout (world px) ───────────────────────────────────────────────

export const AREA_W = 2400;
export const AREA_H = 1600;

/** Ground-level copper mains: each run is a straight segment of radius `r`. */
export const GROUND_PIPES: { a: Pt; b: Pt; r: number }[] = [
  { a: { x: 420, y: 380 }, b: { x: 950, y: 380 }, r: 16 },
  { a: { x: 420, y: 380 }, b: { x: 420, y: 600 }, r: 16 },
  { a: { x: 1450, y: 360 }, b: { x: 2150, y: 360 }, r: 16 },
  { a: { x: 2150, y: 360 }, b: { x: 2150, y: 580 }, r: 16 },
  { a: { x: 660, y: 1440 }, b: { x: 1060, y: 1440 }, r: 14 },
  { a: { x: 1060, y: 1345 }, b: { x: 1060, y: 1440 }, r: 14 },
];
export const PIPE_ELBOWS: Pt[] = [{ x: 420, y: 380 }, { x: 2150, y: 360 }, { x: 1060, y: 1440 }];

/** Overhead gantry mains, drawn above actors at `LIFT` px up; only their legs are solid. */
export const GANTRIES: { a: Pt; b: Pt; legs: Pt[] }[] = [
  { a: { x: 1760, y: 150 }, b: { x: 1760, y: 1500 }, legs: [{ x: 1760, y: 300 }, { x: 1760, y: 620 }, { x: 1760, y: 1060 }, { x: 1760, y: 1400 }] },
  { a: { x: 160, y: 1000 }, b: { x: 1120, y: 1000 }, legs: [{ x: 300, y: 1000 }, { x: 640, y: 1000 }, { x: 1000, y: 1000 }] },
];
export const LIFT = 118;

export const POND: Rect = { x: 200, y: 1100, w: 460, h: 280 };
export const BELT: Rect = { x: 260, y: 640, w: 500, h: 56 };
export const HOPPER: Pt = { x: 215, y: 700 };

export const TOWER: Pt = { x: 1200, y: 400 };
/** Top of the control tower's body (the glass band sits here), and its big dial. */
const TOWER_TOP = TOWER.y - 300;
const TOWER_DIAL: Pt = { x: TOWER.x, y: TOWER_TOP + 95 };
export const BELL_TOWER: Pt = { x: 1560, y: 560 };
export const KESSEL_BOILER: Pt = { x: 1950, y: 470 };
export const MANIFOLD: Pt = { x: 2140, y: 650 };
export const STORE: Pt = { x: 2050, y: 990 };
export const BATHHOUSE: Pt = { x: 880, y: 1230 };
export const BUNKS: Pt[] = [{ x: 1600, y: 1180 }, { x: 1880, y: 1180 }, { x: 2100, y: 1180 }];
export const HAMMERS: Pt[] = [{ x: 1380, y: 990 }, { x: 1520, y: 990 }];
export const GAUGE_POSTS: Pt[] = [{ x: 1000, y: 560 }, { x: 1420, y: 580 }, { x: 1960, y: 700 }, { x: 520, y: 560 }, { x: 1100, y: 1120 }];
export const VENTS: Pt[] = [
  { x: 1100, y: 880 }, { x: 1330, y: 860 }, { x: 900, y: 800 }, { x: 1450, y: 660 }, { x: 640, y: 880 },
  { x: 1850, y: 1080 }, { x: 1320, y: 1460 }, { x: 560, y: 520 }, { x: 2000, y: 580 }, { x: 1600, y: 900 },
];
export const LAMPS: Pt[] = [
  { x: 2150, y: 745 }, { x: 1850, y: 735 }, { x: 1480, y: 690 }, { x: 1290, y: 640 }, { x: 1265, y: 960 },
  { x: 1140, y: 1260 }, { x: 900, y: 690 }, { x: 610, y: 755 }, { x: 1700, y: 1300 },
];
export const CHIMNEYS: number[] = [180, 560, 1500, 1980, 2280];
export const BANNERS: Pt[] = [{ x: 955, y: 470 }, { x: 1445, y: 470 }, { x: 2230, y: 740 }];
export const CRATES: Pt[] = [{ x: 1940, y: 1020 }, { x: 2175, y: 1010 }, { x: 160, y: 760 }, { x: 760, y: 1250 }, { x: 1290, y: 1080 }];
export const BARRELS: Pt[] = [{ x: 1965, y: 1030 }, { x: 2200, y: 1020 }, { x: 990, y: 1365 }, { x: 1700, y: 1220 }, { x: 330, y: 760 }];
export const ROCKS: Pt[] = [{ x: 90, y: 1300 }, { x: 2320, y: 1480 }, { x: 2330, y: 300 }, { x: 70, y: 420 }];

/** The walkway network — also where the crowd walks. */
export const ROADS: Pt[][] = [
  [{ x: 2400, y: 800 }, { x: 1900, y: 800 }, { x: 1500, y: 760 }, { x: 1200, y: 700 }],
  [{ x: 1200, y: 700 }, { x: 1200, y: 470 }],
  [{ x: 1200, y: 700 }, { x: 1200, y: 1000 }, { x: 1220, y: 1300 }, { x: 1200, y: 1600 }],
  [{ x: 1200, y: 700 }, { x: 800, y: 720 }, { x: 520, y: 820 }, { x: 440, y: 1000 }, { x: 680, y: 1080 }],
  [{ x: 1500, y: 760 }, { x: 1650, y: 560 }, { x: 1880, y: 540 }],
  [{ x: 1220, y: 1150 }, { x: 1600, y: 1250 }, { x: 2200, y: 1250 }],
  [{ x: 2050, y: 800 }, { x: 2050, y: 1010 }],
  [{ x: 1220, y: 1300 }, { x: 880, y: 1300 }],
];

// ── Ground ──────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  groundFill(g, { x: 0, y: 0, w: AREA_W, h: AREA_H }, CINDER, 0x3a342e, 0x6e655a, rng, 1.1);
  // Coal dust drifts and soot blooms.
  for (let i = 0; i < 70; i++) blob(g, rng() * AREA_W, 120 + rng() * (AREA_H - 120), 30 + rng() * 90, 14 + rng() * 40, SOOT, 0.25 + rng() * 0.25, rng);
  // Rust weeping out of the ground near old pipe beds.
  for (let i = 0; i < 26; i++) blob(g, rng() * AREA_W, 140 + rng() * (AREA_H - 140), 20 + rng() * 50, 8 + rng() * 18, 0x5a2a14, 0.18, rng);

  // Iron deck yards: the central yard and the tower apron.
  for (const r of [{ x: 1000, y: 580, w: 420, h: 260 }, { x: 930, y: 400, w: 540, h: 120 }, { x: 1830, y: 470, w: 380, h: 140 }]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    for (let y = r.y; y < r.y + r.h; y += 60) for (let x = r.x; x < r.x + r.w; x += 70) {
      plate(g, x, y, Math.min(70, r.x + r.w - x), Math.min(60, r.y + r.h - y), rng() < 0.5 ? IRON : dim(IRON, 0.12), rng);
    }
  }
  // Walkways: dark cinder-brick with iron kerbs.
  for (const pts of ROADS) road(g, pts, 82, 0x48423b, 0x1a1816, 0x5c554c, rng);
  // Painted hazard kerbs where the walkways meet the yard.
  hazardStripes(g, { x: 1000, y: 572, w: 420, h: 8 }, 0.7, 14);
  hazardStripes(g, { x: 1000, y: 840, w: 420, h: 8 }, 0.7, 14);

  // Narrow-gauge coal rail along the south.
  for (let x = 380; x < 1140; x += 22) { g.fillStyle(0x3a2a1e, 1); g.fillRect(x, 1528, 10, 28); }
  g.fillStyle(IRON_LIT, 1); g.fillRect(380, 1532, 760, 3); g.fillRect(380, 1550, 760, 3);

  // The cooling pond: green-grey water steaming in a riveted iron basin.
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(POND.x - 22, POND.y - 22, POND.w + 44, POND.h + 44, 30);
  pool(g, POND, 0x2f5c62, 0x4f8a88, IRON, rng);
  rivets(g, { x: POND.x - 10, y: POND.y - 14 }, { x: POND.x + POND.w + 10, y: POND.y - 14 }, 22, 2);
  rivets(g, { x: POND.x - 10, y: POND.y + POND.h + 14 }, { x: POND.x + POND.w + 10, y: POND.y + POND.h + 14 }, 22, 2);
  // Outflow spout feeding the pond.
  pipeElbow(g, POND.x + POND.w, 1440, 14);
  for (let i = 0; i < 8; i++) { g.fillStyle(VERDIGRIS, 0.3); g.fillEllipse(POND.x + 30 + rng() * (POND.w - 60), POND.y + 16, 30, 6); }

  // The coal conveyor's frame (slats are animated).
  g.fillStyle(0x000000, 0.35); g.fillRect(BELT.x, BELT.y + BELT.h, BELT.w, 10);
  g.fillStyle(IRON_DARK, 1); g.fillRect(BELT.x - 6, BELT.y - 8, BELT.w + 12, BELT.h + 16);
  g.fillStyle(0x161414, 1); g.fillRect(BELT.x, BELT.y, BELT.w, BELT.h);
  g.fillStyle(IRON, 1); g.fillRect(BELT.x - 6, BELT.y - 8, BELT.w + 12, 6); g.fillRect(BELT.x - 6, BELT.y + BELT.h + 2, BELT.w + 12, 6);
  rivets(g, { x: BELT.x, y: BELT.y - 5 }, { x: BELT.x + BELT.w, y: BELT.y - 5 }, 24, 1.5);
  rivets(g, { x: BELT.x, y: BELT.y + BELT.h + 5 }, { x: BELT.x + BELT.w, y: BELT.y + BELT.h + 5 }, 24, 1.5);

  // Ground-level mains.
  for (const p of GROUND_PIPES) copperPipe(g, p.a, p.b, p.r, rng, 110);
  for (const e of PIPE_ELBOWS) pipeElbow(g, e.x, e.y, 16);

  // Steam vents: grates sunk in the cinder, glowing faintly.
  for (const v of VENTS) {
    g.fillStyle(HOT, 0.07); g.fillCircle(v.x, v.y, 34);
    g.fillStyle(0x0c0806, 1); g.fillRoundedRect(v.x - 22, v.y - 12, 44, 24, 4);
    g.fillStyle(0xff7a30, 0.22); g.fillRoundedRect(v.x - 18, v.y - 8, 36, 16, 3);
    g.lineStyle(2.5, IRON, 1);
    for (let k = -15; k <= 15; k += 6) g.lineBetween(v.x + k, v.y - 10, v.x + k, v.y + 10);
    g.lineStyle(1.5, IRON_LIT, 0.8); g.strokeRoundedRect(v.x - 22, v.y - 12, 44, 24, 4);
  }

  // Coal heaps in the west yard and spilled coal along the belt.
  for (const c of [{ x: 150, y: 820 }, { x: 330, y: 1500 }, { x: 520, y: 1520 }, { x: 130, y: 560 }]) {
    blob(g, c.x, c.y, 70, 34, 0x111010, 0.95, rng, 11);
    for (let i = 0; i < 40; i++) { g.fillStyle(rng() < 0.3 ? 0x3a3632 : 0x1c1a18, 1); g.fillCircle(c.x + (rng() - 0.5) * 120, c.y + (rng() - 0.5) * 50, 2 + rng() * 4); }
  }
  for (let i = 0; i < 60; i++) { g.fillStyle(0x121110, 0.9); g.fillCircle(BELT.x + rng() * BELT.w, BELT.y + BELT.h + 12 + rng() * 26, 1.5 + rng() * 3); }

  // Brand stencils on the yard deck, and a big one before the tower.
  brandSigil(g, 1210, 710, 60, 0x7a2a12, 0.25);
  brandSigil(g, 1200, 455, 26, 0xff7a2f, 0.35);
  // Shift lines painted on the deck in front of the tower: where the workers queue.
  for (let i = 0; i < 6; i++) { g.fillStyle(HAZARD_YELLOW, 0.5); g.fillRect(1030 + i * 64, 600, 34, 6); }

  // Gantry shadows (the pipes overhead cast a soft line on the ground).
  for (const gt of GANTRIES) {
    g.fillStyle(0x000000, 0.18);
    if (gt.a.x === gt.b.x) g.fillRect(gt.a.x - 14 + 20, gt.a.y, 28, gt.b.y - gt.a.y);
    else g.fillRect(gt.a.x, gt.a.y - 10 + 14, gt.b.x - gt.a.x, 22);
  }

  // Factory wall footing along the north edge.
  g.fillStyle(0x161312, 1); g.fillRect(0, 0, AREA_W, 126);
}

// ── Set pieces ──────────────────────────────────────────────────────

function factoryWall(g: G, rng: () => number): void {
  // Soot-black brick wall with arched, glowing windows and chimney stacks.
  g.fillStyle(0x0e0c0b, 1); g.fillRect(0, 0, AREA_W, 124);
  for (let y = 4; y < 118; y += 10) {
    for (let x = ((y / 10) % 2) * 14; x < AREA_W; x += 28) {
      g.fillStyle(rng() < 0.5 ? 0x3a2420 : 0x2e1e1a, 1); g.fillRect(x + 1, y + 1, 26, 8);
    }
  }
  for (let x = 90; x < AREA_W; x += 180) {
    if (Math.abs(x - 1200) < 300) continue;
    g.fillStyle(0x0c0806, 1); g.fillRoundedRect(x - 22, 30, 44, 60, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.fillStyle(0xff8a3a, 0.55); g.fillRoundedRect(x - 18, 34, 36, 54, { tl: 18, tr: 18, bl: 0, br: 0 });
    g.lineStyle(2, 0x0c0806, 1); g.lineBetween(x, 34, x, 88); g.lineBetween(x - 18, 60, x + 18, 60);
  }
  for (const cx of CHIMNEYS) {
    g.fillStyle(0x2a1a16, 1); g.fillRect(cx - 18, -60, 36, 160);
    g.fillStyle(0x3a2420, 1); g.fillRect(cx - 14, -60, 28, 160);
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 22, -64, 44, 10);
    for (let y = -40; y < 100; y += 26) { g.fillStyle(IRON, 1); g.fillRect(cx - 20, y, 40, 4); }
  }
  g.fillStyle(IRON, 1); g.fillRect(0, 116, AREA_W, 8);
  rivets(g, { x: 0, y: 120 }, { x: AREA_W, y: 120 }, 26, 1.6);
}

/** Gauge's control tower standing on the Great Boiler. */
function towerAndBoiler(g: G): void {
  const { x, y } = TOWER;
  shadow(g, x, y + 4, 560, 40, 0.45);
  // The Great Boiler: a fat horizontal riveted drum on cradles.
  const bw = 500, bh = 150;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - bw / 2 + 30, y - 30, 40, 30); g.fillRect(x + bw / 2 - 70, y - 30, 40, 30);
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - bw / 2, y - 30 - bh, bw, bh, 70);
  g.fillStyle(COPPER, 1); g.fillRoundedRect(x - bw / 2 + 4, y - 30 - bh + 4, bw - 8, bh - 10, 66);
  g.fillStyle(COPPER_LIT, 0.55); g.fillRoundedRect(x - bw / 2 + 40, y - 30 - bh + 16, bw - 80, 14, 7);
  for (let bx = x - bw / 2 + 60; bx < x + bw / 2 - 40; bx += 70) {
    g.fillStyle(COPPER_DARK, 1); g.fillRect(bx - 4, y - 30 - bh + 4, 8, bh - 10);
    rivets(g, { x: bx, y: y - 30 - bh + 10 }, { x: bx, y: y - 40 }, 10, 1.6, BRASS);
  }
  // Firebox mouths along the boiler's foot.
  for (const fx of [x - 150, x + 150]) {
    g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(fx - 34, y - 86, 68, 50, 8);
    g.fillStyle(0xff6a20, 0.9); g.fillRoundedRect(fx - 28, y - 80, 56, 38, 6);
    g.fillStyle(HOT_LIT, 0.8); g.fillRoundedRect(fx - 20, y - 70, 40, 20, 4);
    g.lineStyle(4, IRON_DARK, 1);
    for (let k = -21; k <= 21; k += 10) g.lineBetween(fx + k, y - 80, fx + k, y - 42);
  }
  // The control tower rises from the boiler's middle.
  const tw = 150, th = 150, ty = TOWER_TOP + th;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - tw / 2 - 3, ty - th - 3, tw + 6, th + 6);
  g.fillStyle(IRON, 1); g.fillRect(x - tw / 2, ty - th, tw, th);
  for (let yy = ty - th + 20; yy < ty; yy += 40) rivets(g, { x: x - tw / 2 + 6, y: yy }, { x: x + tw / 2 - 6, y: yy }, 14, 1.5);
  // Control room glass band with a silhouette at the levers.
  g.fillStyle(0x1a1410, 1); g.fillRect(x - tw / 2 - 12, ty - th - 10, tw + 24, 60);
  g.fillStyle(0xffb860, 0.85); g.fillRect(x - tw / 2 - 6, ty - th - 4, tw + 12, 46);
  g.lineStyle(3, 0x1a1410, 1);
  for (let k = -tw / 2; k <= tw / 2; k += 30) g.lineBetween(x + k, ty - th - 4, x + k, ty - th + 42);
  g.fillStyle(0x1a1410, 0.9); g.fillCircle(x + 10, ty - th + 14, 9); g.fillRect(x + 1, ty - th + 22, 18, 20);
  // Roof and a crown of steam whistles.
  g.fillStyle(COPPER_DARK, 1); g.fillTriangle(x - tw / 2 - 20, ty - th - 10, x + tw / 2 + 20, ty - th - 10, x, ty - th - 60);
  g.fillStyle(COPPER, 1); g.fillTriangle(x - tw / 2 - 14, ty - th - 12, x + tw / 2 + 14, ty - th - 12, x, ty - th - 54);
  for (const k of [-40, 0, 40]) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x + k - 6, ty - th - 90 + Math.abs(k) * 0.4, 12, 40);
    g.fillStyle(BRASS, 1); g.fillRect(x + k - 4, ty - th - 90 + Math.abs(k) * 0.4, 8, 40);
    g.fillStyle(BRASS, 1); g.fillEllipse(x + k, ty - th - 92 + Math.abs(k) * 0.4, 18, 8);
  }
  // The giant gauge on the tower face.
  dial(g, TOWER_DIAL.x, TOWER_DIAL.y, 30, 0.9);
  // Door at the boiler foot.
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 26, y - 64, 52, 64, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(0x2a1a14, 1); g.fillRoundedRect(x - 22, y - 60, 44, 60, { tl: 8, tr: 8, bl: 0, br: 0 });
  brandSigil(g, x, y - 36, 9, 0xff7a2f, 0.9);
}

function bellTower(g: G): void {
  const { x, y } = BELL_TOWER;
  shadow(g, x, y + 2, 110, 20);
  // Lattice legs.
  g.lineStyle(6, IRON_DARK, 1);
  g.lineBetween(x - 34, y, x - 18, y - 230); g.lineBetween(x + 34, y, x + 18, y - 230);
  g.lineStyle(3, IRON, 1);
  for (let k = 0; k < 6; k++) {
    const y0 = y - k * 38, y1 = y - (k + 1) * 38;
    const w0 = 34 - k * 2.7, w1 = 34 - (k + 1) * 2.7;
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
  }
  // Belfry.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 30, y - 290, 60, 64);
  g.fillStyle(0x1a1614, 1); g.fillRect(x - 24, y - 284, 48, 52);
  g.fillStyle(COPPER_DARK, 1); g.fillTriangle(x - 40, y - 290, x + 40, y - 290, x, y - 330);
  g.fillStyle(COPPER, 1); g.fillTriangle(x - 34, y - 292, x + 34, y - 292, x, y - 324);
  // Bell rope down the leg.
  g.lineStyle(2, 0x8a6a44, 1); g.lineBetween(x + 6, y - 236, x + 26, y - 20);
  // Shift board at the foot.
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 30, y - 60, 60, 36);
  g.fillStyle(0xd8d0bc, 1); g.fillRect(x - 26, y - 56, 52, 28);
  g.lineStyle(1.5, 0x2a2420, 1);
  for (let k = 0; k < 4; k++) g.lineBetween(x - 22, y - 50 + k * 6, x + 22 - (k % 2) * 10, y - 50 + k * 6);
}

function kesselBoiler(g: G): void {
  const { x, y } = KESSEL_BOILER;
  shadow(g, x, y + 2, 170, 30, 0.4);
  // An upright boiler with a heart-shaped firebox window that beats (animated glow lives in animateOver).
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - 62, y - 190, 124, 190, 50);
  g.fillStyle(COPPER, 1); g.fillRoundedRect(x - 56, y - 186, 112, 182, 46);
  g.fillStyle(COPPER_LIT, 0.5); g.fillRect(x - 40, y - 170, 10, 150);
  for (let yy = y - 160; yy < y - 10; yy += 38) {
    g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 56, yy, 112, 6);
    rivets(g, { x: x - 50, y: yy + 3 }, { x: x + 50, y: yy + 3 }, 10, 1.4, BRASS);
  }
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x - 14, y - 78, 20); g.fillCircle(x + 14, y - 78, 20);
  g.fillTriangle(x - 33, y - 72, x + 33, y - 72, x, y - 34);
  g.fillStyle(0xff5a20, 0.85); g.fillCircle(x - 12, y - 78, 14); g.fillCircle(x + 12, y - 78, 14);
  g.fillTriangle(x - 25, y - 72, x + 25, y - 72, x, y - 42);
  // Stack and safety valve on top.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 10, y - 240, 20, 56);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 34, y - 190, 8);
  dial(g, x - 34, y - 150, 14, 0.95);
}

function valveManifold(g: G): void {
  const { x, y } = MANIFOLD;
  shadow(g, x, y + 2, 170, 22);
  copperPipe(g, { x: 2150, y: 580 }, { x: 2150, y: 600 }, 16, () => 0.5, 1000);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 76, y - 100, 152, 100);
  g.fillStyle(IRON, 1); g.fillRect(x - 72, y - 96, 144, 92);
  rivets(g, { x: x - 66, y: y - 90 }, { x: x + 66, y: y - 90 }, 16, 1.5);
  rivets(g, { x: x - 66, y: y - 10 }, { x: x + 66, y: y - 10 }, 16, 1.5);
  // Four red handwheels, each painted with a number.
  for (let i = 0; i < 4; i++) {
    const vx = x - 54 + i * 36;
    g.fillStyle(COPPER_DARK, 1); g.fillRect(vx - 5, y - 80, 10, 50);
    valveWheel(g, vx, y - 52, 13, i * 0.4, 0xa83a2a);
    g.fillStyle(0xf1e6c8, 1); g.fillRect(vx - 5, y - 26, 10, 10);
    g.fillStyle(0x1a1a1a, 1);
    for (let k = 0; k <= i; k++) g.fillRect(vx - 4 + k * 2.4, y - 24, 1.4, 6);
  }
}

function bunkhouse(g: G, p: Pt, rng: () => number): void {
  house(g, p.x, p.y, 150, 110, { wall: 0x4a3a34, roof: 0x2a2624, trim: 0x1c1614, glow: 0xffb060, roofStyle: 'slant', chimney: true, brand: true }, rng);
  // Corrugated-iron patching and a shift number stencilled on the wall.
  g.fillStyle(IRON, 0.85); g.fillRect(p.x + 40, p.y - 90, 28, 40);
  g.lineStyle(1, IRON_LIT, 0.8);
  for (let k = 0; k < 6; k++) g.lineBetween(p.x + 42 + k * 4.5, p.y - 90, p.x + 42 + k * 4.5, p.y - 50);
  g.fillStyle(HAZARD_YELLOW, 0.7); g.fillRect(p.x - 66, p.y - 100, 22, 22);
  g.fillStyle(0x161616, 1); g.fillRect(p.x - 59, p.y - 96, 8, 14);
}

function companyStore(g: G, rng: () => number): void {
  const { x, y } = STORE;
  house(g, x, y, 200, 130, { wall: 0x5a4636, roof: COPPER_DARK, trim: 0x2a1c14, glow: 0xffd080, roofStyle: 'gable', door: 0x3a2014 }, rng);
  // The company's sign: a brass plate with a cog.
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 70, y - 150, 140, 24);
  g.fillStyle(BRASS, 1); g.fillRect(x - 66, y - 147, 132, 18);
  g.fillStyle(BRASS_DARK, 1);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillCircle(x + Math.cos(a) * 7, y - 138 + Math.sin(a) * 7, 2.2); }
  g.fillCircle(x, y - 138, 4.5);
  // Awning.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? 0x8a2a1e : 0xd8c8a0, 1);
    g.fillTriangle(x - 90 + i * 22.5, y - 72, x - 90 + (i + 1) * 22.5, y - 72, x - 90 + (i + 0.5) * 22.5, y - 60);
    g.fillRect(x - 90 + i * 22.5, y - 84, 22.5, 12);
  }
}

function bathhouse(g: G, rng: () => number): void {
  const { x, y } = BATHHOUSE;
  house(g, x, y, 170, 100, { wall: 0x6a7a78, roof: 0x3a4a4c, trim: 0x2a3434, glow: 0xd8f0ff, roofStyle: 'dome' }, rng);
  // White tiles and a steam pipe out of the roof.
  for (let i = 0; i < 18; i++) { g.fillStyle(0xdfe8e6, 0.45); g.fillRect(x - 80 + (i % 9) * 18, y - 30 - Math.floor(i / 9) * 14, 16, 12); }
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x + 50, y - 170, 14, 70);
  g.fillStyle(COPPER, 1); g.fillRect(x + 52, y - 170, 10, 70);
}

function dropHammer(g: G, p: Pt): void {
  const { x, y } = p;
  shadow(g, x, y + 2, 120, 24);
  // Anvil bed.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 40, y - 30, 80, 30);
  g.fillStyle(IRON, 1); g.fillRect(x - 36, y - 28, 72, 22);
  g.fillStyle(0xff7a30, 0.4); g.fillRect(x - 20, y - 30, 40, 4);
  // Frame uprights and cross-head.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 50, y - 210, 12, 182); g.fillRect(x + 38, y - 210, 12, 182);
  g.fillStyle(IRON, 1); g.fillRect(x - 48, y - 210, 8, 182); g.fillRect(x + 40, y - 210, 8, 182);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 58, y - 222, 116, 18);
  rivets(g, { x: x - 54, y: y - 213 }, { x: x + 54, y: y - 213 }, 12, 1.5);
  // Cylinder on top.
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - 22, y - 270, 44, 52, 8);
  g.fillStyle(COPPER, 1); g.fillRoundedRect(x - 18, y - 266, 36, 44, 6);
}

function gaugePost(g: G, p: Pt): void {
  shadow(g, p.x, p.y, 26, 8);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(p.x - 4, p.y - 64, 8, 64);
  g.fillStyle(COPPER, 1); g.fillRect(p.x - 2.5, p.y - 64, 5, 64);
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x - 10, p.y - 4, 20, 4);
  // Face drawn here; the needle is animated.
  dial(g, p.x, p.y - 72, 13, 0);
  g.fillStyle(0xf1e6c8, 1); g.fillCircle(p.x, p.y - 72, 9);
}

function hopper(g: G): void {
  const { x, y } = HOPPER;
  shadow(g, x, y + 2, 120, 26);
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(x - 60, y - 120, x + 60, y - 120, x, y - 30);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 54, y - 116, x + 54, y - 116, x, y - 36);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 64, y - 128, 128, 12);
  g.fillStyle(0x111010, 1); g.fillEllipse(x, y - 124, 112, 12);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 46, y - 40, 10, 40); g.fillRect(x + 36, y - 40, 10, 40);
  g.fillStyle(0x0c0a08, 1); g.fillRect(x - 16, y - 34, 32, 18);
  hazardStripes(g, { x: x - 60, y: y - 108, w: 120, h: 8 }, 0.8, 12);
}

function gantryLeg(g: G, p: Pt, horizontal: boolean): void {
  shadow(g, p.x, p.y, 34, 10);
  const top = p.y - LIFT;
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x - 6, top, 12, LIFT);
  g.fillStyle(IRON, 1); g.fillRect(p.x - 4, top, 6, LIFT);
  g.lineStyle(2, IRON_DARK, 1);
  if (horizontal) { g.lineBetween(p.x - 26, top + 10, p.x, top + 40); g.lineBetween(p.x + 26, top + 10, p.x, top + 40); }
  else { g.lineBetween(p.x, top + 4, p.x - 14, top + 40); g.lineBetween(p.x, top + 4, p.x + 14, top + 40); }
  g.fillStyle(IRON_DARK, 1); g.fillRect(p.x - 10, p.y - 4, 20, 4);
}

function sootBanner(g: G, x: number, y: number): void {
  banner(g, x, y, 0x5a1a10, 0x2a2420, (gg, cx, cy) => brandSigil(gg, cx, cy, 8, 0xff8a3a, 1));
}

export function makePieces(): AreaPainter['pieces'] {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  pieces.push({ x: 1200, y: 124, w: AREA_W, h: 200, draw: (g, rng) => factoryWall(g, rng) });
  pieces.push({ x: TOWER.x, y: TOWER.y, w: 560, h: 520, draw: (g) => towerAndBoiler(g) });
  pieces.push({ x: BELL_TOWER.x, y: BELL_TOWER.y, w: 110, h: 340, draw: (g) => bellTower(g) });
  pieces.push({ x: KESSEL_BOILER.x, y: KESSEL_BOILER.y, w: 180, h: 250, draw: (g) => kesselBoiler(g) });
  pieces.push({ x: MANIFOLD.x, y: MANIFOLD.y, w: 170, h: 110, draw: (g) => valveManifold(g) });
  for (const b of BUNKS) pieces.push({ x: b.x, y: b.y, w: 190, h: 190, draw: (g, rng) => bunkhouse(g, b, rng) });
  pieces.push({ x: STORE.x, y: STORE.y, w: 240, h: 220, draw: (g, rng) => companyStore(g, rng) });
  pieces.push({ x: BATHHOUSE.x, y: BATHHOUSE.y, w: 200, h: 180, draw: (g, rng) => bathhouse(g, rng) });
  for (const h of HAMMERS) pieces.push({ x: h.x, y: h.y, w: 130, h: 280, draw: (g) => dropHammer(g, h) });
  for (const p of GAUGE_POSTS) pieces.push({ x: p.x, y: p.y, w: 34, h: 90, draw: (g) => gaugePost(g, p) });
  pieces.push({ x: HOPPER.x, y: HOPPER.y, w: 140, h: 140, draw: (g) => hopper(g) });
  for (const gt of GANTRIES) {
    const horiz = gt.a.y === gt.b.y;
    for (const l of gt.legs) pieces.push({ x: l.x, y: l.y, w: 60, h: LIFT + 10, draw: (g) => gantryLeg(g, l, horiz) });
  }
  for (const l of LAMPS) pieces.push({ x: l.x, y: l.y, w: 50, h: 70, draw: (g) => lamp(g, l.x, l.y, 0xffb860, 0x24201c) });
  for (const b of BANNERS) {
    pieces.push({ x: b.x, y: b.y, w: 40, h: 90, draw: (g) => sootBanner(g, b.x, b.y) });
  }
  // Stores of the trade: crates, barrels and coal skips about the yard.
  for (const c of CRATES) pieces.push({ x: c.x, y: c.y, w: 40, h: 40, draw: (g) => crate(g, c.x, c.y, 14, 0x5a4030) });
  for (const b of BARRELS) pieces.push({ x: b.x, y: b.y, w: 30, h: 40, draw: (g) => barrel(g, b.x, b.y, 11, 0x4a3426, IRON_DARK) });
  for (const r of ROCKS) pieces.push({ x: r.x, y: r.y, w: 60, h: 40, draw: (g, rng) => rock(g, r.x, r.y, 22, 0x3a3430, rng) });
  return pieces;
}

// ── Animation ───────────────────────────────────────────────────────

/** Ground-level motion: belt slats, pond surface, vent glow. */
function animate(g: G, t: number, view: Rect): void {
  const ts = t; // the world passes seconds
  // Coal belt slats running west into the hopper.
  if (inView(BELT.x + BELT.w / 2, BELT.y, view, BELT.w)) {
    const off = (ts * 60) % 26;
    for (let x = BELT.x + BELT.w - off; x > BELT.x; x -= 26) {
      g.fillStyle(0x2c2824, 1); g.fillRect(x - 20, BELT.y + 4, 20, BELT.h - 8);
      g.fillStyle(0x3c3630, 1); g.fillRect(x - 20, BELT.y + 4, 3, BELT.h - 8);
    }
    // Lumps of coal riding it.
    for (let i = 0; i < 9; i++) {
      const x = BELT.x + BELT.w - (((ts * 60) + i * 57) % BELT.w);
      g.fillStyle(0x0e0d0c, 1); g.fillCircle(x, BELT.y + 18 + (i % 3) * 10, 5 + (i % 2) * 2);
    }
  }
  // Pond: slow ripples and rising bubbles.
  if (inView(POND.x + POND.w / 2, POND.y + POND.h / 2, view, 300)) {
    for (let i = 0; i < 7; i++) {
      const ph = ((ts * 0.35) + i / 7) % 1;
      const x = POND.x + 50 + noise(i * 3.1) * (POND.w - 100), y = POND.y + 40 + noise(i * 7.7) * (POND.h - 80);
      g.lineStyle(1.5, 0xbfe0dc, 0.4 * (1 - ph)); g.strokeEllipse(x, y, 12 + ph * 50, 5 + ph * 18);
    }
    for (let i = 0; i < 10; i++) {
      const ph = ((ts * 0.8) + i * 0.13) % 1;
      const x = POND.x + 40 + noise(i * 11.3) * (POND.w - 80), y = POND.y + 40 + noise(i * 5.9) * (POND.h - 80);
      g.fillStyle(0xdff4f0, 0.6 * (1 - ph)); g.fillCircle(x, y - ph * 4, 2 + ph * 2);
    }
  }
  // Vent glow breathing.
  for (const v of VENTS) {
    if (!inView(v.x, v.y, view)) continue;
    const k = 0.5 + 0.5 * Math.sin(ts * 2 + v.x * 0.01);
    g.fillStyle(0xff7a30, 0.12 + k * 0.18); g.fillRoundedRect(v.x - 18, v.y - 8, 36, 16, 3);
  }
}

/** Above actors: overhead gantry mains, steam, chimney smoke, needles, hammers, furnace light. */
function animateOver(g: G, t: number, view: Rect): void {
  const ts = t; // the world passes seconds
  // Overhead gantries — you walk under these.
  for (const gt of GANTRIES) {
    const horiz = gt.a.y === gt.b.y;
    if (horiz) {
      if (!(gt.a.y - LIFT > view.y - 60 && gt.a.y - LIFT < view.y + view.h + 60)) continue;
      const x0 = Math.max(gt.a.x, view.x - 40), x1 = Math.min(gt.b.x, view.x + view.w + 40);
      if (x1 <= x0) continue;
      const y = gt.a.y - LIFT;
      g.fillStyle(COPPER_DARK, 1); g.fillRect(x0, y - 13, x1 - x0, 26);
      g.fillStyle(COPPER, 1); g.fillRect(x0, y - 11, x1 - x0, 20);
      g.fillStyle(COPPER_LIT, 0.8); g.fillRect(x0, y - 7, x1 - x0, 4);
      for (let x = gt.a.x + 60; x < gt.b.x; x += 120) {
        if (x < x0 - 10 || x > x1 + 10) continue;
        g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 5, y - 16, 10, 32);
        g.fillStyle(BRASS, 1); g.fillCircle(x, y - 10, 1.6); g.fillCircle(x, y + 10, 1.6);
      }
      for (const l of gt.legs) { if (l.x > x0 - 20 && l.x < x1 + 20) { g.fillStyle(IRON_DARK, 1); g.fillRect(l.x - 22, y + 8, 44, 8); } }
    } else {
      if (!(gt.a.x > view.x - 60 && gt.a.x < view.x + view.w + 60)) continue;
      const y0 = Math.max(gt.a.y - LIFT, view.y - 40), y1 = Math.min(gt.b.y - LIFT, view.y + view.h + 40);
      if (y1 <= y0) continue;
      const x = gt.a.x;
      g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 13, y0, 26, y1 - y0);
      g.fillStyle(COPPER, 1); g.fillRect(x - 11, y0, 20, y1 - y0);
      g.fillStyle(COPPER_LIT, 0.8); g.fillRect(x - 7, y0, 4, y1 - y0);
      for (let y = gt.a.y - LIFT + 60; y < gt.b.y - LIFT; y += 120) {
        if (y < y0 - 10 || y > y1 + 10) continue;
        g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 16, y - 5, 32, 10);
        g.fillStyle(BRASS, 1); g.fillCircle(x - 10, y, 1.6); g.fillCircle(x + 10, y, 1.6);
      }
      for (const l of gt.legs) {
        const ly = l.y - LIFT;
        if (ly > y0 - 20 && ly < y1 + 20) { g.fillStyle(IRON_DARK, 1); g.fillRect(x - 18, ly - 4, 36, 8); }
      }
      // A leaky joint on the vertical main drips steam.
      const leakY = 900 - LIFT;
      if (leakY > y0 && leakY < y1) for (let i = 0; i < 3; i++) steamPuff(g, x + 12, leakY, ((ts * 0.9) + i / 3) % 1, 9, 0.5);
    }
  }

  // Steam from the yard vents.
  for (let vi = 0; vi < VENTS.length; vi++) {
    const v = VENTS[vi];
    if (!inView(v.x, v.y, view)) continue;
    // Each vent breathes in bursts on its own clock.
    const burst = Math.sin(ts * 0.9 + vi * 1.7) > 0.2 ? 1 : 0.35;
    for (let i = 0; i < 4; i++) steamPuff(g, v.x + (i - 1.5) * 6, v.y - 4, ((ts * 0.55) + i / 4 + vi * 0.21) % 1, 14 + burst * 8, 0.45 * burst);
  }
  // Pond steam.
  if (inView(POND.x + POND.w / 2, POND.y + POND.h / 2, view, 320)) {
    for (let i = 0; i < 9; i++) {
      const x = POND.x + 40 + noise(i * 2.3) * (POND.w - 80), y = POND.y + 50 + noise(i * 4.1) * (POND.h - 100);
      steamPuff(g, x, y, ((ts * 0.3) + i / 9) % 1, 22, 0.32);
    }
  }
  // Chimney smoke rolling east.
  for (const cx of CHIMNEYS) {
    if (!(cx > view.x - 300 && cx < view.x + view.w + 300 && view.y < 300)) continue;
    for (let i = 0; i < 6; i++) {
      const ph = ((ts * 0.18) + i / 6 + cx * 0.001) % 1;
      g.fillStyle(0x2a2624, 0.45 * (1 - ph));
      g.fillCircle(cx + ph * 160 + Math.sin(ph * 6 + i) * 10, -64 - ph * 70 + 40, 14 + ph * 36);
    }
  }
  // Tower whistles letting off on the shift change (every 20s).
  if (inView(TOWER.x, TOWER_TOP, view, 300)) {
    const cyc = (ts % 20) / 20;
    if (cyc < 0.12) {
      const k = cyc / 0.12;
      for (const kx of [-40, 0, 40]) steamPuff(g, TOWER.x + kx, TOWER_TOP - 96 + Math.abs(kx) * 0.4, k, 22, 0.8);
    }
    // Firebox flicker on the Great Boiler.
    for (const fx of [TOWER.x - 150, TOWER.x + 150]) {
      const f = 0.5 + 0.5 * noise(Math.floor(ts * 12) + fx);
      glow(g, fx, TOWER.y - 60, 60 + f * 14, 0xff7a30, 0.03, 3);
    }
  }
  // Kessel's heart-window beating.
  if (inView(KESSEL_BOILER.x, KESSEL_BOILER.y - 80, view)) {
    const beat = Math.max(0, Math.sin(ts * 5)) ** 6;
    glow(g, KESSEL_BOILER.x, KESSEL_BOILER.y - 72, 40 + beat * 20, REDLINE, 0.05 + beat * 0.04, 3);
    for (let i = 0; i < 3; i++) steamPuff(g, KESSEL_BOILER.x, KESSEL_BOILER.y - 242, ((ts * 0.6) + i / 3) % 1, 14, 0.5);
  }
  // Gauge needles twitching on their posts, and the tower's big dial.
  for (let i = 0; i < GAUGE_POSTS.length; i++) {
    const p = GAUGE_POSTS[i];
    if (!inView(p.x, p.y - 72, view)) continue;
    const frac = 0.55 + 0.25 * Math.sin(ts * 0.7 + i) + 0.04 * Math.sin(ts * 23 + i * 3);
    needle(g, p.x, p.y - 72, 10, frac);
  }
  if (inView(TOWER_DIAL.x, TOWER_DIAL.y, view, 200)) needle(g, TOWER_DIAL.x, TOWER_DIAL.y, 25, 0.9 + 0.06 * Math.sin(ts * 9));
  // Drop hammers: lift slowly, fall hard, puff on impact.
  for (let i = 0; i < HAMMERS.length; i++) {
    const h = HAMMERS[i];
    if (!inView(h.x, h.y - 120, view, 200)) continue;
    const cyc = ((ts / 2.4) + i * 0.5) % 1;
    const lift = cyc < 0.8 ? cyc / 0.8 : 1 - ((cyc - 0.8) / 0.2) ** 2;
    const hy = h.y - 38 - lift * 140;
    g.fillStyle(0xc8d0d8, 1); g.fillRect(h.x - 4, h.y - 220, 8, hy - (h.y - 220) - 20);
    g.fillStyle(IRON_DARK, 1); g.fillRect(h.x - 32, hy - 26, 64, 34);
    g.fillStyle(IRON, 1); g.fillRect(h.x - 29, hy - 23, 58, 26);
    g.fillStyle(IRON_LIT, 1); g.fillRect(h.x - 29, hy - 23, 58, 3);
    rivets(g, { x: h.x - 22, y: hy - 15 }, { x: h.x + 22, y: hy - 15 }, 11, 1.3, RIVET);
    if (cyc > 0.98 || cyc < 0.08) {
      const k = cyc > 0.98 ? 0 : cyc / 0.08;
      g.fillStyle(0xd8d0bc, 0.5 * (1 - k)); g.fillEllipse(h.x - 40 - k * 20, h.y - 6, 30, 12); g.fillEllipse(h.x + 40 + k * 20, h.y - 6, 30, 12);
      g.fillStyle(HOT_LIT, 0.9 * (1 - k));
      for (let s = 0; s < 5; s++) g.fillCircle(h.x + (s - 2) * 10 + k * (s - 2) * 14, h.y - 32 - k * 20 * (1 + (s % 2)), 1.8);
    }
  }
  // Belt-end hopper shaking coal dust.
  if (inView(HOPPER.x, HOPPER.y, view)) {
    for (let i = 0; i < 3; i++) {
      const ph = ((ts * 0.7) + i / 3) % 1;
      g.fillStyle(0x1a1816, 0.4 * (1 - ph)); g.fillCircle(HOPPER.x + (i - 1) * 16, HOPPER.y - 126 - ph * 30, 6 + ph * 10);
    }
  }
  // Lamp flicker.
  for (const l of LAMPS) {
    if (!inView(l.x, l.y, view)) continue;
    const f = noise(Math.floor(ts * 10) + l.x);
    if (f > 0.85) { g.fillStyle(0x000000, 0.35); g.fillRect(l.x - 5, l.y - 56, 10, 9); }
    else { g.fillStyle(0xffb860, 0.05 + f * 0.04); g.fillCircle(l.x, l.y - 52, 30); }
  }
}

function needle(g: G, x: number, y: number, r: number, frac: number): void {
  const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  const a = a0 + span * Math.max(0, Math.min(1.04, frac));
  g.lineStyle(Math.max(1.4, r * 0.12), 0x1a1a1a, 1);
  g.lineBetween(x, y, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
  g.fillStyle(REDLINE, 1); g.fillCircle(x, y, Math.max(1.6, r * 0.14));
}

export const BOILERWORKS_PAINTER: AreaPainter = {
  ground: paintGround,
  pieces: makePieces(),
  animate,
  animateOver,
};

