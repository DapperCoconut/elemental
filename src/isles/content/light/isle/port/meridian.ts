import type { AreaDef, Cond, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, flagstones, glow, groundFill, mixC, road } from '../../../../art/IsleArt';
import { carve } from '../../../water/isle/port/art';
import {
  BRASS, GLARE, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_LIT, LIME, LIME_ALT,
  LIME_DARK, MARBLE, MARBLE_DARK, MARBLE_SHADE, MOTH, SEA, SEA_DEEP, SEA_SHALLOW, SOOT, aurielStatue, bareAwning,
  boatSlip, clearFigure, customsHouse, duskHouse, fishMarket, glassCounter, goldenCrust, heatShimmer, inView,
  inspectionTable, lighthouse, marbleHouse, mirrorBuoy, noonShadow, poly, queueRail, sundial, sunburst, tackleKiosk,
  ticketBooth,
} from './art';
import { MERIDIAN_CROWD, MERIDIAN_NPCS } from './people';

/**
 * Meridian Quay — Solmara's harbour, and where every Outer Sea crossing to the Light Isle lands.
 *
 * The town climbs the white limestone above the harbour in three terraces, each held up by a marble
 * retaining wall with a balustrade along its lip and stairs let through it. The top terrace is houses
 * with gilt domes and nailed-open shutters, the Noon Steps climbing out of its middle toward the Noon
 * Court between two statues of the Despot. The middle terrace is the town: the High Street running
 * east–west to the Painters' Road and the Sigil Road, the plaza with its sunburst-headed statue and a
 * sundial whose shadow has been a dot for twenty-two years, the Golden Crust, the Glass Counter — and
 * at the east end the Dusk-house, the only dark building on the quay, with its booth, its clerk's
 * stopwatch and its queue. The bottom terrace is the quay itself: the glass-roofed fish market, the
 * boatwright's slip, the Customs of Clarity with every landed bag emptied out on its sunlit table,
 * Halloran's tackle kiosk, and the old lighthouse on its rock at the east end, unlit since the noon began.
 *
 * Three walkways run out into the white water: the west mole, the Meridian Stair (the central jetty,
 * where crossings moor), and the east mole under the lighthouse. Mirror-buoys flash off all three.
 */

const W = 2600;
const H = 1500;
/** Where the sea begins along the south shore. */
const SEA_Y = 1270;
/** The two retaining walls: the lip of the top terrace, and the lip of the town above the quay. */
const WALL_TOP = 428;
const WALL_LOW = 896;
/** Each wall's face, solid with its balustrade. */
const WALL_FACE = 24;
/** Stairs let through the walls: [x0, x1]. */
const GAPS_TOP: [number, number][] = [[440, 540], [1220, 1380], [2060, 2160]];
const GAPS_LOW: [number, number][] = [[620, 720], [1220, 1380], [1840, 1940]];
/** The High Street's line. */
const STREET_Y = 750;

/** Walkways out over the sea. */
const WEST_MOLE: Rect = { x: 300, y: 1262, w: 70, h: 218 };
const JETTY: Rect = { x: 1250, y: 1262, w: 100, h: 228 };
const EAST_MOLE: Rect = { x: 2160, y: 1262, w: 70, h: 208 };

/** Mirror-buoys bobbing off the moles and the jetty, and two out in the roads. */
const BUOYS: [number, number][] = [[288, 1478], [384, 1482], [1232, 1476], [1368, 1480], [2146, 1474], [2246, 1478], [760, 1404], [1780, 1420]];
/** The cold street lamps — unlit for twenty-two years, still black with the soot of the last night. */
export const LAMPS: [number, number][] = [[640, 790], [1010, 520], [1460, 830], [2280, 530]];

const DESPOT: Cond = { monarch: 'auriel' };
const LAMP_LIT: Cond = { flag: 'sable-dusk-4' };
const BUOYS_DOWN: Cond = { questDone: 'meridian-face-down' };

// ── Ground ──────────────────────────────────────────────────────────

/** Steps across a stair gap: alternating lit tread and shaded riser, a thin dark line under each nose. */
function stairs(g: G, x0: number, x1: number, y0: number, y1: number): void {
  for (let y = y0, k = 0; y < y1; y += 6, k++) {
    g.fillStyle(k % 2 ? MARBLE_SHADE : MARBLE, 1); g.fillRect(x0, y, x1 - x0, 6);
    g.lineStyle(1, MARBLE_DARK, 0.5); g.lineBetween(x0, y + 5.5, x1, y + 5.5);
  }
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 6, y0, 6, y1 - y0); g.fillRect(x1, y0, 6, y1 - y0);
}

/** A retaining wall's face below its balustrade line: coursed marble blocks with the stairs left open. */
function wallFace(g: G, y: number, gaps: [number, number][]): void {
  let x = 0;
  const spans: [number, number][] = [];
  for (const [a, b] of gaps) { spans.push([x, a]); x = b; }
  spans.push([x, W]);
  for (const [a, b] of spans) {
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(a, y, b - a, WALL_FACE);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(a, y, b - a, WALL_FACE - 4);
    for (let ry = y + 6; ry < y + WALL_FACE - 2; ry += 7) {
      g.lineStyle(1, MARBLE_DARK, 0.45); g.lineBetween(a, ry, b, ry);
      for (let rx = a + ((ry - y) % 14 ? 0 : 9); rx < b; rx += 18) g.lineBetween(rx, ry - 7, rx, ry);
    }
    g.fillStyle(0xffffff, 0.35); g.fillRect(a, y, b - a, 2);
  }
  for (const [a, b] of gaps) stairs(g, a, b, y - 4, y + WALL_FACE + 6);
}

function paintGround(g: G, rng: () => number): void {
  // Limestone under everything, bleached to the colour of bone.
  groundFill(g, { x: 0, y: 0, w: W, h: SEA_Y }, LIME, LIME_ALT, LIME_DARK, rng, 0.8);

  // Terrace paving: small flags up top, the town's long slabs, and the big quay stones.
  flagstones(g, { x: 0, y: 40, w: W, h: WALL_TOP - 40 }, 30, mixC(MARBLE, LIME, 0.5), LIME_DARK, rng);
  flagstones(g, { x: 0, y: WALL_TOP + WALL_FACE, w: W, h: WALL_LOW - WALL_TOP - WALL_FACE }, 38, mixC(MARBLE, LIME, 0.35), mixC(LIME_DARK, LIME, 0.3), rng);
  flagstones(g, { x: 0, y: WALL_LOW + WALL_FACE, w: W, h: SEA_Y - WALL_LOW - WALL_FACE }, 52, LIME, LIME_DARK, rng);
  // Sun-crazed cracks through the quay stones.
  for (let i = 0; i < 70; i++) {
    let cx = rng() * W, cy = WALL_LOW + 30 + rng() * (SEA_Y - WALL_LOW - 50);
    g.lineStyle(1, LIME_DARK, 0.6);
    for (let k = 0; k < 4; k++) { const nx = cx + (rng() - 0.5) * 22, ny = cy + (rng() - 0.5) * 14; g.lineBetween(cx, cy, nx, ny); cx = nx; cy = ny; }
  }

  // The Noon Steps climbing north out of the top terrace to the Noon Court.
  for (let y = 0, k = 0; y < WALL_TOP; y += 7, k++) {
    g.fillStyle(k % 2 ? MARBLE_SHADE : MARBLE, 1); g.fillRect(1220, y, 160, 7);
    g.lineStyle(1, MARBLE_DARK, 0.4); g.lineBetween(1220, y + 6.5, 1380, y + 6.5);
  }
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(1212, 0, 8, WALL_TOP); g.fillRect(1380, 0, 8, WALL_TOP);
  // A gilt runner of sunbursts inlaid up the middle of the steps.
  for (let y = 30; y < WALL_TOP - 10; y += 60) sunburst(g, 1300, y, 6, GOLD, 0.85);

  // The High Street, east–west across the town terrace, and the Quay Promenade.
  road(g, [{ x: 0, y: STREET_Y }, { x: 700, y: STREET_Y + 4 }, { x: 1300, y: STREET_Y + 10 }, { x: 1900, y: STREET_Y }, { x: W, y: STREET_Y }], 70, mixC(MARBLE, LIME, 0.2), LIME_DARK, MARBLE_SHADE, rng);
  road(g, [{ x: 0, y: 1190 }, { x: 900, y: 1200 }, { x: 1600, y: 1196 }, { x: W, y: 1200 }], 60, mixC(MARBLE, LIME, 0.3), LIME_DARK, MARBLE_SHADE, rng);
  road(g, [{ x: 1300, y: WALL_TOP + 20 }, { x: 1300, y: WALL_LOW }], 110, mixC(MARBLE, LIME, 0.2), LIME_DARK, MARBLE_SHADE, rng);
  road(g, [{ x: 1300, y: WALL_LOW + 20 }, { x: 1300, y: SEA_Y }], 110, mixC(MARBLE, LIME, 0.25), LIME_DARK, MARBLE_SHADE, rng);

  // The plaza round the statue: rings of paving with a great sunburst set in gold and white.
  for (let r = 150; r > 0; r -= 22) {
    g.fillStyle((r / 22) % 2 < 1 ? mixC(MARBLE, LIME, 0.15) : MARBLE, 1); g.fillCircle(1300, 640, r);
  }
  g.lineStyle(2, GOLD_DARK, 0.5); g.strokeCircle(1300, 640, 150);
  sunburst(g, 1300, 640, 46, GOLD, 0.5);
  // The Dusk-house forecourt: the paving is worn into a groove by the queue.
  g.fillStyle(LIME_DARK, 0.35); g.fillRoundedRect(1882, 670, 56, 220, 20);

  // The retaining walls, with their stairs.
  wallFace(g, WALL_TOP, GAPS_TOP);
  wallFace(g, WALL_LOW, GAPS_LOW);

  // ── The sea: bright shallows over white sand, then the glittering roads.
  for (let y = SEA_Y; y < H; y += 6) {
    const t = (y - SEA_Y) / (H - SEA_Y);
    g.fillStyle(mixC(SEA_SHALLOW, mixC(SEA, SEA_DEEP, Math.max(0, t - 0.5) * 2), Math.min(1, t * 1.8)), 1); g.fillRect(0, y, W, 6);
  }
  // White sand ripples under the shallows; the sun goes clean through to the bottom.
  for (let i = 0; i < 160; i++) {
    const sx = rng() * W, sy = SEA_Y + 6 + rng() * 80;
    g.lineStyle(1, 0xffffff, 0.18); g.beginPath(); g.arc(sx, sy, 14 + rng() * 10, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
  }
  // Glare streaks lying flat on the water.
  for (let i = 0; i < 90; i++) {
    g.fillStyle(GLARE, 0.25 + rng() * 0.35); g.fillEllipse(rng() * W, SEA_Y + 30 + rng() * (H - SEA_Y - 30), 20 + rng() * 60, 2 + rng() * 2);
  }
  // The quay lip: a course of big dressed blocks, iron bollards and rings.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(0, SEA_Y - 12, W, 14);
  g.fillStyle(MARBLE, 1); g.fillRect(0, SEA_Y - 14, W, 5);
  for (let x = 0; x < W; x += 46) { g.lineStyle(1, MARBLE_DARK, 0.6); g.lineBetween(x, SEA_Y - 12, x, SEA_Y + 2); }
  for (let x = 90; x < W; x += 180) {
    if (x > 1230 && x < 1370) continue;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, SEA_Y - 10, 14, 3);
    g.fillStyle(IRON, 1); g.fillRect(x - 5, SEA_Y - 24, 10, 12); g.fillEllipse(x, SEA_Y - 24, 12, 5);
    g.fillStyle(IRON_LIT, 1); g.fillRect(x - 4, SEA_Y - 23, 2, 9);
  }

  // The walkways: white blocks on piers, and the Meridian Stair's gilt mooring rings.
  for (const r of [WEST_MOLE, JETTY, EAST_MOLE]) {
    g.fillStyle(SEA_DEEP, 0.4); g.fillRect(r.x - 4, r.y + 8, r.w + 8, r.h);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(r.x - 2, r.y, r.w + 4, r.h);
    flagstones(g, { x: r.x, y: r.y, w: r.w, h: r.h - 8 }, 24, MARBLE, MARBLE_SHADE, rng);
    g.fillStyle(0xffffff, 0.3); g.fillRect(r.x, r.y, 3, r.h - 8);
    for (let y = r.y + 30; y < r.y + r.h - 10; y += 50) {
      g.lineStyle(1.5, GOLD, 1); g.strokeCircle(r.x - 3, y, 4); g.strokeCircle(r.x + r.w + 3, y, 4);
    }
    // Foam where the swell slaps the blocks.
    for (let y = r.y + 10; y < r.y + r.h; y += 12) {
      g.fillStyle(0xffffff, 0.45); g.fillEllipse(r.x - 6, y, 5, 3); g.fillEllipse(r.x + r.w + 6, y + 6, 5, 3);
    }
  }
  // The Meridian Stair's head: a sunburst where crossings step ashore.
  sunburst(g, 1300, 1440, 14, GOLD, 0.8);
}

// ── Pieces & solids ─────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

/** A Solmaran house: piece + base footprint solid. */
function home(x: number, y: number, w: number, h: number, o: Parameters<typeof marbleHouse>[5]): void {
  pieces.push({ x, y, w: w + 40, h: h + 90, draw: (g, rng) => marbleHouse(g, x, y, w, h, o, rng) });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 30, w, h: 30 });
}

// The top terrace: the better houses, gilt domes catching the sun.
home(200, 300, 180, 120, { dome: true, shutter: 0x9ab8c8, burst: true });
home(470, 260, 160, 100, { shutter: 0xc8a8b8 });
home(760, 320, 200, 130, { dome: true, tall: true, shutter: 0xa8c8a8, burst: true });
home(1050, 280, 160, 110, { shutter: 0xb8b0d0 });
home(1560, 280, 170, 110, { shutter: 0xd0b890, burst: true });
home(1840, 320, 210, 140, { dome: true, tall: true, shutter: 0x9ab8c8 });
home(2140, 280, 170, 110, { shutter: 0xc8a8b8 });
home(2420, 310, 180, 120, { dome: true, shutter: 0xa8c8a8, burst: true });
// The town terrace's south side.
home(480, 860, 170, 100, { shutter: 0xb8c8d8 });
home(1060, 870, 150, 92, { shutter: 0xd8c0a0 });
home(1580, 870, 160, 96, { shutter: 0xa8b8c8, burst: true });
home(2300, 860, 180, 110, { shutter: 0xc8b8a8 });

// Rosamund Vell's house: a seamstress's — bolts of white linen in the window, the only colour allowed.
pieces.push({
  x: 360, y: 620, w: 230, h: 210, draw: (g, rng) => {
    marbleHouse(g, 360, 620, 190, 120, { tall: true, shutter: 0xd8a8b0 }, rng);
    // A dressmaker's form in the left window and bolts of linen stacked in the right.
    g.fillStyle(0xe8e0d0, 1); g.fillEllipse(318, 548, 10, 12); g.fillRect(317, 554, 2, 8);
    for (let k = 0; k < 3; k++) { g.fillStyle([0xf4f0e8, 0xe8e4d8, 0xfaf8f0][k], 1); g.fillRect(392, 552 - k * 4, 16, 4); }
    // A sewing-sign: gilt scissors.
    g.lineStyle(2, GOLD_DARK, 1); g.lineBetween(254, 560, 246, 576); g.lineBetween(246, 560, 254, 576);
    g.lineStyle(1.5, GOLD, 1); g.strokeCircle(244, 580, 3); g.strokeCircle(256, 580, 3);
  },
});
solids.push({ kind: 'rect', x: 265, y: 590, w: 190, h: 30 });
// After the Despot: curtains. Rosamund hangs a pair in every window she can reach.
pieces.push({
  x: 360, y: 621, w: 230, h: 210, when: DESPOT, draw: (g) => {
    for (const [wx, wy] of [[315, 512], [395, 512], [315, 557], [395, 557]] as [number, number][]) {
      g.fillStyle(0x8a2a4a, 1); g.fillRect(wx - 7, wy - 1, 6, 20); g.fillRect(wx + 8, wy - 1, 6, 20);
      g.fillStyle(0xb84a6a, 1); g.fillRect(wx - 6, wy - 1, 2, 20); g.fillRect(wx + 9, wy - 1, 2, 20);
      g.fillStyle(GOLD, 1); g.fillRect(wx - 8, wy - 3, 23, 2);
    }
  },
});

// The Golden Crust.
pieces.push({ x: 820, y: 640, w: 280, h: 230, draw: (g, rng) => { goldenCrust(g, 820, 640, rng); bareAwning(g, 880, 640, 60, 60, 90); } });
solids.push({ kind: 'rect', x: 720, y: 610, w: 200, h: 30 });

// The Glass Counter.
pieces.push({ x: 1600, y: 620, w: 260, h: 150, draw: (g, rng) => { glassCounter(g, 1600, 620, 220, 100, rng); bareAwning(g, 1600, 620, 230, 70, 100); } });
solids.push({ kind: 'rect', x: 1490, y: 590, w: 220, h: 30 });

// The plaza: the Despot with his sunburst head, and the sundial with its dot of a shadow.
pieces.push({ x: 1300, y: 612, w: 80, h: 170, draw: (g) => aurielStatue(g, 1300, 612, 1.2) });
solids.push({ kind: 'circle', x: 1300, y: 600, r: 26 });
pieces.push({ x: 1180, y: 700, w: 50, h: 60, draw: (g) => sundial(g, 1180, 700) });
solids.push({ kind: 'circle', x: 1180, y: 690, r: 14 });
// Two more at the top of the Noon Steps, arms up, flanking the way to the Noon Court.
for (const sx of [1176, 1424]) {
  pieces.push({ x: sx, y: 400, w: 70, h: 150, draw: (g) => aurielStatue(g, sx, 400, 0.9) });
  solids.push({ kind: 'circle', x: sx, y: 392, r: 22 });
}

// The Dusk-house, its booth, and the queue rails (broken where the High Street crosses).
pieces.push({ x: 2080, y: 640, w: 290, h: 200, draw: (g, rng) => duskHouse(g, 2080, 640, 260, 160, rng) });
solids.push({ kind: 'rect', x: 1950, y: 610, w: 260, h: 30 });
pieces.push({ x: 1910, y: 650, w: 60, h: 90, draw: (g) => ticketBooth(g, 1910, 650, -Math.PI / 2) });
solids.push({ kind: 'rect', x: 1888, y: 630, w: 44, h: 20 });
const RAIL_N: [number, number][][] = [[[1870, 680], [1870, 720]], [[1950, 680], [1950, 720]]];
const RAIL_S: [number, number][][] = [[[1870, 790], [1870, 840], [1870, 886]], [[1950, 790], [1950, 840], [1950, 886]]];
for (const rail of [...RAIL_N, ...RAIL_S]) {
  const base = rail[rail.length - 1][1];
  pieces.push({ x: rail[0][0], y: base, w: 30, h: 220, draw: (g) => queueRail(g, rail) });
  for (const [px, py] of rail) solids.push({ kind: 'circle', x: px, y: py, r: 5 });
}

// The cold street lamps, still black from the last night anyone lit them.
for (const [lx, ly] of LAMPS) {
  pieces.push({
    x: lx, y: ly, w: 40, h: 110, draw: (g) => {
      noonShadow(g, lx, ly, 14);
      g.fillStyle(IRON, 1); g.fillRect(lx - 6, ly - 6, 12, 6); g.fillRect(lx - 2, ly - 86, 4, 82);
      g.fillStyle(IRON_LIT, 1); g.fillRect(lx - 1, ly - 84, 1.5, 76);
      g.fillStyle(IRON, 1); g.fillRect(lx - 10, ly - 90, 20, 4);
      // The lantern: sooted glass, a dead wick, a gilt sun stuck on top by the Despot's men.
      g.fillStyle(SOOT, 1); g.fillRect(lx - 8, ly - 108, 16, 18);
      g.fillStyle(0x3a3640, 1); g.fillRect(lx - 6, ly - 106, 12, 14);
      g.fillStyle(0x5a5660, 0.6); g.fillRect(lx - 5, ly - 105, 3, 8);
      g.fillStyle(IRON, 1); poly(g, [[lx - 10, ly - 108], [lx, ly - 118], [lx + 10, ly - 108]], IRON);
      sunburst(g, lx, ly - 122, 3, GOLD, 1);
    },
  });
  solids.push({ kind: 'circle', x: lx, y: ly - 3, r: 6 });
}

// The balustrades along both walls (pieces at the wall line so you pass behind them going up).
for (const [wallY, gaps] of [[WALL_TOP, GAPS_TOP], [WALL_LOW, GAPS_LOW]] as [number, [number, number][]][]) {
  let x = 0;
  const spans: [number, number][] = [];
  for (const [a, b] of gaps) { spans.push([x, a]); x = b; }
  spans.push([x, W]);
  for (const [a, b] of spans) {
    pieces.push({
      x: (a + b) / 2, y: wallY + 2, w: b - a + 20, h: 40, draw: (g) => {
        g.fillStyle(MARBLE_DARK, 1); g.fillRect(a, wallY - 2, b - a, 5);
        for (let bx = a + 4; bx < b - 4; bx += 10) {
          g.fillStyle(MARBLE_SHADE, 1); g.fillRect(bx, wallY - 18, 5, 16);
          g.fillStyle(MARBLE, 1); g.fillEllipse(bx + 2.5, wallY - 11, 7, 6);
          g.fillStyle(0xffffff, 0.6); g.fillRect(bx, wallY - 17, 1.5, 12);
        }
        g.fillStyle(MARBLE_SHADE, 1); g.fillRect(a, wallY - 22, b - a, 5);
        g.fillStyle(MARBLE, 1); g.fillRect(a, wallY - 23, b - a, 3);
        // Newel posts topped with gilt balls at each end of a run.
        for (const nx of [a + 4, b - 6]) {
          if (nx < 8 || nx > W - 8) continue;
          g.fillStyle(MARBLE_SHADE, 1); g.fillRect(nx - 5, wallY - 30, 12, 30);
          g.fillStyle(GOLD, 1); g.fillCircle(nx + 1, wallY - 34, 5);
          g.fillStyle(GOLD_LIT, 1); g.fillCircle(nx - 1, wallY - 36, 1.6);
        }
      },
    });
    solids.push({ kind: 'rect', x: a, y: wallY - 2, w: b - a, h: WALL_FACE + 2 });
  }
}

// ── The quay.

// The fish market under its glass roof.
pieces.push({ x: 560, y: 1110, w: 480, h: 180, draw: (g, rng) => fishMarket(g, 560, 1110, 440, 110, rng) });
solids.push({ kind: 'rect', x: 340, y: 1080, w: 440, h: 30 });

// The boatwright's slip.
pieces.push({ x: 1030, y: 1250, w: 280, h: 110, draw: (g, rng) => boatSlip(g, 1030, 1250, rng) });
solids.push({ kind: 'rect', x: 934, y: 1226, w: 200, h: 24 });

// The Customs of Clarity and its sunlit inspection table.
pieces.push({ x: 1720, y: 1030, w: 380, h: 210, draw: (g) => customsHouse(g, 1720, 1030, 300, 130) });
solids.push({ kind: 'rect', x: 1570, y: 1000, w: 300, h: 30 }, { kind: 'circle', x: 1548, y: 1026, r: 5 }, { kind: 'circle', x: 1892, y: 1026, r: 5 });
pieces.push({ x: 1720, y: 1140, w: 260, h: 50, draw: (g, rng) => inspectionTable(g, 1720, 1140, 240, rng) });
solids.push({ kind: 'rect', x: 1600, y: 1118, w: 240, h: 22 });
// Two emptied trunks gaping on the stones by the table.
pieces.push({
  x: 1588, y: 1170, w: 60, h: 40, draw: (g) => {
    for (const [tx, ty] of [[1570, 1166], [1610, 1172]] as [number, number][]) {
      noonShadow(g, tx, ty, 30);
      g.fillStyle(0x5a3a24, 1); g.fillRect(tx - 14, ty - 14, 28, 14);
      g.fillStyle(0x2a1a10, 1); g.fillRect(tx - 12, ty - 13, 24, 5);
      g.fillStyle(0x6a4a2e, 1); poly(g, [[tx - 14, ty - 14], [tx + 14, ty - 14], [tx + 12, ty - 30], [tx - 12, ty - 30]], 0x6a4a2e);
      g.fillStyle(BRASS, 1); g.fillRect(tx - 2, ty - 16, 4, 3);
    }
  },
});

// Halloran's tackle kiosk.
pieces.push({ x: 2040, y: 1200, w: 140, h: 140, draw: (g) => tackleKiosk(g, 2040, 1200) });
solids.push({ kind: 'rect', x: 1990, y: 1180, w: 100, h: 20 });

// The lighthouse on its rock — dark, or lit once Sable has lit it again.
pieces.push({ x: 2400, y: 1215, w: 150, h: 420, when: { not: LAMP_LIT }, draw: (g, rng) => lighthouse(g, 2400, 1215, false, rng) });
pieces.push({ x: 2400, y: 1215, w: 150, h: 420, when: LAMP_LIT, draw: (g, rng) => lighthouse(g, 2400, 1215, true, rng) });
solids.push({ kind: 'circle', x: 2400, y: 1200, r: 46 });

// Net-drying poles on the west quay — nets spread flat on the stones (a hung net throws shade).
pieces.push({
  x: 180, y: 1220, w: 200, h: 40, draw: (g, rng) => {
    for (let k = 0; k < 3; k++) {
      const nx = 110 + k * 60;
      g.fillStyle(0x7a8a80, 0.7); g.fillEllipse(nx, 1214, 54, 16);
      g.lineStyle(0.8, 0x4a5a50, 0.8);
      for (let m = -24; m <= 24; m += 6) g.lineBetween(nx + m, 1207, nx + m + (rng() - 0.5) * 3, 1221);
      g.fillStyle(0xe8d8b0, 1); g.fillCircle(nx - 20, 1210, 2); g.fillCircle(nx + 18, 1218, 2);
    }
  },
});

// ── Animation ───────────────────────────────────────────────────────

/** Paths the Clears drift along — the quay, the jetty and the High Street. Never a shadow under them. */
const CLEAR_WALKS: [number, number, number, number, number][] = [
  // x0, y0, x1, y1, seconds for one length
  [200, 1236, 1180, 1236, 34], [1300, 1290, 1300, 1420, 16], [1460, 1236, 2120, 1236, 28], [300, 780, 1100, 780, 30],
];

function animateUnder(g: G, t: number, view: Rect, world: { test(c: Cond): boolean }): void {
  // Glints racing across the white water.
  if (view.y + view.h > SEA_Y) {
    for (let i = 0; i < 60; i++) {
      const sx = (i * 197.3 + t * (14 + (i % 5) * 4)) % W;
      const sy = SEA_Y + 20 + ((i * 71.9) % (H - SEA_Y - 20));
      if (!inView(view, sx, sy, 20)) continue;
      const tw = Math.max(0, Math.sin(t * 3.4 + i * 1.7));
      if (tw < 0.6) continue;
      const a = (tw - 0.6) / 0.4;
      g.fillStyle(0xffffff, 0.85 * a); g.fillRect(sx - 4 * a, sy - 0.5, 8 * a, 1.2); g.fillRect(sx - 0.5, sy - 3 * a, 1.2, 6 * a);
    }
    // The mirror-buoys — face-down and dark once the Signal-Master is beaten.
    const down = world.test(BUOYS_DOWN);
    BUOYS.forEach(([bx, by], i) => {
      if (!inView(view, bx, by, 60)) return;
      if (!down) { mirrorBuoy(g, bx, by, t, i * 1.3); return; }
      const bob = Math.sin(t * 1.6 + i) * 2;
      g.fillStyle(SEA_DEEP, 0.45); g.fillEllipse(bx, by + 4, 26, 7);
      g.fillStyle(GOLD_DARK, 1); g.fillEllipse(bx, by + bob, 18, 10);
      g.fillStyle(GOLD, 1); g.fillEllipse(bx, by - 2 + bob, 16, 7);
      g.fillStyle(IRON, 1); g.fillRect(bx - 1, by - 24 + bob, 2, 22);
      g.fillStyle(0x3a3a44, 1); g.fillEllipse(bx, by - 26 + bob, 12, 4);
    });
  }
  // Clears drifting: translucent, the stones showing through, no shadow at all.
  CLEAR_WALKS.forEach(([x0, y0, x1, y1, dur], i) => {
    const u = ((t + i * 7) / dur) % 2;
    const f = u < 1 ? u : 2 - u;
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
    if (!inView(view, x, y, 40)) return;
    clearFigure(g, x, y, (t * 0.9 + i) % 1, 1);
  });
  // Luna moths at the Dusk-house curtain — the only things on Solmara that go toward the dark.
  if (inView(view, 2080, 610, 120)) {
    for (let k = 0; k < 2; k++) {
      const mx = 2080 + Math.sin(t * 1.3 + k * 2.1) * 22, my = 600 + Math.cos(t * 1.7 + k) * 12 - k * 14;
      const flap = Math.abs(Math.sin(t * 9 + k)) * 5 + 1;
      g.fillStyle(MOTH, 0.9);
      g.fillTriangle(mx, my, mx - flap - 3, my - 5, mx - flap, my + 4);
      g.fillTriangle(mx, my, mx + flap + 3, my - 5, mx + flap, my + 4);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(mx, my, 1.2);
    }
  }
  // Heat shimmer over the quay stones.
  heatShimmer(g, view, t, { x: 0, y: WALL_LOW + 30, w: W, h: SEA_Y - WALL_LOW - 40 });
  // The oven at the Golden Crust breathes.
  if (inView(view, 874, 606, 80)) glow(g, 874, 606, 24 + Math.sin(t * 2) * 3, 0xffa040, 0.05, 3);
}

function animateAbove(g: G, t: number, view: Rect, world: { test(c: Cond): boolean }): void {
  // The clerk's stopwatch: the hand goes round once a minute, and he watches it.
  if (inView(view, 1918, 606, 40)) {
    const a = -Math.PI / 2 + ((t % 60) / 60) * Math.PI * 2;
    g.fillStyle(0xfaf6ea, 1); g.fillCircle(1918, 606, 6);
    g.lineStyle(1.3, SOOT, 1); g.lineBetween(1918, 606, 1918 + Math.cos(a) * 5.5, 606 + Math.sin(a) * 5.5);
    g.fillStyle(0xc83a2a, 1); g.fillCircle(1918, 606, 1.2);
  }
  // A heat bloom over the glass roof of the fish market.
  if (inView(view, 560, 990, 260)) {
    const p = 0.5 + 0.5 * Math.sin(t * 1.4);
    g.fillStyle(GLARE, 0.06 + 0.05 * p); g.fillEllipse(520 + Math.sin(t * 0.7) * 60, 1000, 160, 26);
    g.fillStyle(0xffffff, 0.4 * p); g.fillCircle(470 + Math.sin(t * 0.7) * 60, 996, 3);
  }
  // Once the lamp is lit: the beam turns slowly out over the harbour, as it did before the noon.
  if (world.test(LAMP_LIT) && inView(view, 2400, 860, 900)) {
    const a = t * 0.45;
    const lx = 2400, ly = 852;
    for (const off of [0, Math.PI]) {
      const an = a + off, len = 760;
      const ex = lx + Math.cos(an) * len, ey = ly + Math.sin(an) * len * 0.45;
      const px = -Math.sin(an) * 70, py = Math.cos(an) * 70 * 0.45;
      poly(g, [[lx, ly], [ex + px, ey + py], [ex - px, ey - py]], 0xffe0a0, 0.08);
      poly(g, [[lx, ly], [ex + px * 0.4, ey + py * 0.4], [ex - px * 0.4, ey - py * 0.4]], 0xfff0c8, 0.08);
    }
    glow(g, lx, ly, 30, 0xffd070, 0.12, 4);
  }
  // After the first evening the harbour keeps a little of the colour: a warm wash at the low edge of the view.
  if (world.test({ flag: 'sable-dusk-2' })) {
    g.fillStyle(0xffb070, 0.05); g.fillRect(view.x, view.y + view.h * 0.6, view.w, view.h * 0.4);
  }
}

// ── POIs and the area ───────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1440, y: 1190 } },
  { kind: 'mooring', at: { x: 1300, y: 1450 }, isle: 'light' },
  { kind: 'water', id: 'meridian-sea-water', shape: { x: 0, y: SEA_Y, w: W, h: H - SEA_Y }, fishery: 'meridian-sea' },
  { kind: 'sign', at: { x: 1400, y: 120 }, text: 'THE NOON STEPS — up to the Noon Court and the Burning Glass. Prince Lumen\'s Solarium. Eyes down.' },
  { kind: 'sign', at: { x: 120, y: 690 }, text: 'WEST — The Painters\' Road to the Mural Court. Prince Hue\'s Shadowless Gallery. Paint no shade.' },
  { kind: 'sign', at: { x: 2480, y: 690 }, text: 'EAST — The Sigil Road to the Arcane Court. Prince Sigil\'s academy. Step round the circles.' },
  { kind: 'sign', at: { x: 1400, y: 1300 }, text: 'THE MERIDIAN STAIR — Moorings. All arrivals to the Customs of Clarity. SEEN IS SAFE.' },
  { kind: 'sign', at: { x: 1990, y: 900 }, text: 'DUSK-HOUSE. One hour of licensed shade per ticket per household per day. Clerk\'s watch is final.' },
  { kind: 'sign', at: { x: 2330, y: 1130 }, text: 'MERIDIAN LIGHT. Decommissioned by Clarity. A lamp implies a night. There is no night.' },
  { kind: 'sign', at: { x: 1620, y: 1210 }, text: 'CUSTOMS OF CLARITY. Every bag opened, every lid lifted, every letter read. Thank you for being seen.' },
  { kind: 'chest', id: 'meridian-chest-mole', at: { x: 335, y: 1452 }, coins: 140, orbs: 1 },
  { kind: 'chest', id: 'meridian-chest-terrace', at: { x: 2560, y: 380 }, orbs: 2, coins: 60 },
  { kind: 'chest', id: 'meridian-chest-dusk', at: { x: 2250, y: 690 }, coins: 420, open: DESPOT },
];

export const MERIDIAN_AREA: AreaDef = {
  id: 'meridian',
  isle: 'light',
  name: 'Meridian Quay',
  subtitle: 'Harbour of the Endless Noon',
  w: W,
  h: H,
  bg: 0xd8f0f4,
  accent: GOLD,
  weather: 'glare',
  spawn: { x: 1300, y: 1410 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids: [
    ...solids,
    ...carve({ x: 0, y: SEA_Y, w: W, h: H - SEA_Y }, [WEST_MOLE, JETTY, EAST_MOLE]),
  ],
  exits: [
    { side: 'n', to: 'noon', label: 'The Noon Steps — the Noon Court' },
    { side: 'w', to: 'mural', label: 'The Painters\' Road — the Mural Court' },
    { side: 'e', to: 'arcane', label: 'The Sigil Road — the Arcane Court' },
  ],
  pois: POIS,
  npcs: MERIDIAN_NPCS,
  crowd: MERIDIAN_CROWD,
};
