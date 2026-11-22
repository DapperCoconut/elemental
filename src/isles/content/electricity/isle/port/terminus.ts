import type { AreaDef, Cond, PainterWorld, Poi, Pt, Rect, Solid } from '../../../../IslesTypes';
import { type G, blob, dim, flagstones, glow, groundFill, lit, mixC, rock, shadow } from '../../../../art/IsleArt';
import { carve, inView, poly } from '../../../water/isle/port/art';
import {
  ARC, ARC_CORE, BASALT, BASALT_ALT, BASALT_LIT, BRASS, BRASS_DARK, BRICK, BRICK_DARK, BULB, CHALK, COBBLE, COBBLE_DARK,
  COBBLE_WET, COPPER, COPPER_DARK, COPPER_LIT, FLAME, FOAM, GRID, GRID_DARK, IRON, IRON_DARK, IRON_LIT, NIGHT, PORCELAIN,
  RUBBER, SEA, SEA_DEEP, SEA_LIT, SLATE, SLATE_LIT, TAG, VERDI, WOOD, WOOD_DARK, bigCable, bolt, brownoutBell, cableDrum,
  crankHouse, type CrankOpts, flameGlow, gridSeal, hullOnStocks, lampFlame, meterDial, offTag, puddle, pylon, pylonTips,
  sagPt, stormFlash, streetLamp, trestle, wire,
} from './art';
import { AT, CABLE_RUN, CABLEWAY, H, JETTY, LAMPS, PIER, PYLONS, QUAY_Y, ROW, SEA_Y, TRESTLES, W, WIRES } from './layout';
import { TERMINUS_CROWD, TERMINUS_NPCS } from './people';

/**
 * Terminus — Voltreach's harbour, where the great undersea cable comes ashore, and where every
 * crossing of the Outer Sea makes landfall.
 *
 * The cable climbs out of the black water at the west end of the quay, rides two iron trestles up
 * over the cobbles and goes into the Cable House through a round iron port, and out of the Cable
 * House roof the Grid begins: pylon to pylon, wire to wire, north up the Cableway to the Dynamo Court
 * and east and west along Brownout Row to the courts beyond. Every roof in town has its copper drop
 * off those wires and every door its brass meter. Rows of narrow crank-houses stand along the Row,
 * each with the flywheel or treadle it cranks its Draw on, their windows the cold white of metered
 * bulbs — or dark, with red tags nailed by the door.
 *
 * At the crossroads stands the Meter House, its whole front a chalkboard of every household's quota,
 * and beside it on an iron gantry the Brownout Bell, which rings each night when the Grid draws
 * the town off. The lamplighters' hall in the north-west is boarded up; its lamps still stand on every
 * corner, cold. On the basalt point beyond the cable the lighthouse wears a lightning rod twice its
 * own height, and the storm hits it every few seconds. Its lamp runs on a quarter-ration.
 */

// ── Ground ──────────────────────────────────────────────────────────

/** Cobbled setts: rows of rounded stones, each with a wet top edge holding the storm-light. */
function cobbles(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(COBBLE_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += 9) {
    let x = r.x - rng() * 10;
    while (x < r.x + r.w) {
      const w = 10 + rng() * 7;
      const col = mixC(COBBLE, rng() < 0.5 ? BASALT_LIT : COBBLE_DARK, rng() * 0.4);
      g.fillStyle(col, 1); g.fillRoundedRect(x + 1, y + 1, w - 2, 7, 3);
      g.fillStyle(COBBLE_WET, 0.18 + rng() * 0.16); g.fillRect(x + 3, y + 1.5, w - 6, 1.5);
      x += w;
    }
  }
}

/** An iron inspection cover in the road, the Grid's mark cast in. */
function manhole(g: G, x: number, y: number): void {
  g.fillStyle(0x0a0a0e, 1); g.fillEllipse(x, y + 1, 34, 18);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y, 32, 16);
  g.lineStyle(1, IRON_DARK, 1);
  for (let k = -3; k <= 3; k++) g.lineBetween(x + k * 4, y - 6.5 + Math.abs(k) * 0.4, x + k * 4, y + 6.5 - Math.abs(k) * 0.4);
  g.lineStyle(1, IRON_LIT, 0.6); g.strokeEllipse(x, y, 32, 16);
  gridSeal(g, x, y + 3, 5, GRID_DARK, 0.9);
}

/** The puddles that the rain-rings ripple (shared with the animation). */
const PUDDLES: [number, number, number][] = [
  [1300, 420, 26], [1290, 960, 30], [620, 760, 22], [1880, 744, 28], [2300, 760, 18], [1100, 1210, 34], [1700, 1220, 30],
  [2240, 1230, 24], [400, 1180, 20], [1320, 180, 18], [880, 744, 16], [2000, 1210, 18],
];

function paintGround(g: G, rng: () => number): void {
  // Black basalt cinder everywhere the town has not cobbled.
  groundFill(g, { x: 0, y: 0, w: W, h: SEA_Y }, BASALT, BASALT_ALT, BASALT_LIT, rng, 1.3);
  // Clinker paths and soot in the yards behind the rows.
  for (let i = 0; i < 70; i++) blob(g, rng() * W, rng() * (QUAY_Y - 40), 30 + rng() * 60, 10 + rng() * 20, 0x101118, 0.35, rng, 7);

  // The streets: the Cableway north, Brownout Row across, and the forecourt at their crossing.
  cobbles(g, { x: CABLEWAY.x0, y: 0, w: CABLEWAY.x1 - CABLEWAY.x0, h: QUAY_Y }, rng);
  cobbles(g, { x: 0, y: ROW.y0, w: W, h: ROW.y1 - ROW.y0 }, rng);
  cobbles(g, { x: 780, y: 560, w: 460, h: 140 }, rng);
  // Side lanes to the doors.
  cobbles(g, { x: 120, y: 400, w: 600, h: 40 }, rng);
  cobbles(g, { x: 1590, y: 320, w: 900, h: 40 }, rng);
  cobbles(g, { x: 1580, y: 560, w: 640, h: 60 }, rng);
  cobbles(g, { x: 90, y: 960, w: 560, h: 60 }, rng);
  cobbles(g, { x: 1580, y: 990, w: 660, h: 60 }, rng);
  // Kerbs: a dark edge with a copper earth-tape let into it along both sides of the Row.
  for (const ky of [ROW.y0, ROW.y1]) {
    g.fillStyle(0x0a0a0e, 1); g.fillRect(0, ky - 2, W, 4);
    g.fillStyle(COPPER_DARK, 0.8); g.fillRect(0, ky - 0.5, W, 1);
  }
  for (const kx of [CABLEWAY.x0, CABLEWAY.x1]) {
    g.fillStyle(0x0a0a0e, 1); g.fillRect(kx - 2, 0, 4, QUAY_Y);
    g.fillStyle(COPPER_DARK, 0.8); g.fillRect(kx - 0.5, 0, 1, QUAY_Y);
  }

  // The Meter House forecourt: a great brass meter inlaid in the setts, needle stuck in the red.
  g.fillStyle(0x0a0a0e, 0.8); g.fillCircle(1000, 640, 52);
  meterDial(g, 1000, 640, 44, 0.08);
  g.lineStyle(2, BRASS, 0.5); g.strokeCircle(1000, 640, 58);
  // Chalk on the forecourt: a children's hopscotch numbered by quota, the last square marked OFF.
  for (let k = 0; k < 6; k++) {
    const hx = 860 + k * 26, hy = 676;
    g.lineStyle(1, CHALK, 0.55); g.strokeRect(hx, hy, 24, 18);
    for (let s = 0; s <= k; s++) g.lineBetween(hx + 4 + s * 3, hy + 4, hx + 4 + s * 3, hy + 13);
  }
  g.lineStyle(1.5, TAG, 0.6); g.lineBetween(1018, 678, 1040, 692); g.lineBetween(1040, 678, 1018, 692);

  // The quay: big granite setts from the town edge to the sea wall.
  flagstones(g, { x: 0, y: QUAY_Y, w: W, h: SEA_Y - QUAY_Y }, 30, 0x34363e, 0x16171c, rng);
  for (let i = 0; i < 260; i++) { g.fillStyle(COBBLE_WET, 0.06 + rng() * 0.08); g.fillRect(rng() * W, QUAY_Y + rng() * (SEA_Y - QUAY_Y), 8 + rng() * 22, 2); }
  g.fillStyle(0x0a0a0e, 1); g.fillRect(0, QUAY_Y - 3, W, 5);
  // Rails sunk in the quay for the cable carts.
  for (const ry of [1196, 1210]) {
    g.fillStyle(0x0a0a0e, 1); g.fillRect(640, ry - 1, 1820, 4);
    g.fillStyle(IRON_LIT, 0.7); g.fillRect(640, ry - 1, 1820, 1.5);
  }

  // The sea: black water, deeper toward the bottom, with a sheen where the storm catches it.
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 70, W, H - SEA_Y - 70);
  g.fillStyle(SEA_DEEP, 0.6); g.fillRect(0, SEA_Y + 40, W, 30);
  for (let i = 0; i < 160; i++) {
    const x = rng() * W, y = SEA_Y + 14 + rng() * (H - SEA_Y - 14);
    g.fillStyle(SEA_LIT, 0.18 + rng() * 0.2); g.fillEllipse(x, y, 20 + rng() * 40, 2.5);
  }
  // The sea wall: dressed coping, iron rings, weed and a ladder or two down to the water.
  g.fillStyle(0x0e0f14, 1); g.fillRect(0, SEA_Y - 12, W, 16);
  for (let x = 0; x < W; x += 38) {
    g.fillStyle(0x4a4c56, 1); g.fillRect(x + 1, SEA_Y - 14, 36, 9);
    g.fillStyle(0x6a6e7a, 1); g.fillRect(x + 1, SEA_Y - 14, 36, 2);
  }
  for (let x = 30; x < W; x += 34) { g.fillStyle(0x1e3a2a, 0.8); g.fillEllipse(x + rng() * 20, SEA_Y + 4, 16 + rng() * 10, 4); }
  for (const lx of [700, 1500, 2080, 2440]) {
    g.lineStyle(2, IRON, 1); g.lineBetween(lx, SEA_Y - 10, lx, SEA_Y + 30); g.lineBetween(lx + 14, SEA_Y - 10, lx + 14, SEA_Y + 30);
    for (let k = 0; k < 5; k++) g.lineBetween(lx, SEA_Y - 6 + k * 8, lx + 14, SEA_Y - 6 + k * 8);
  }
  // Bollards along the quay edge.
  for (let x = 120; x < W; x += 210) {
    if (Math.abs(x - 1300) < 70 || Math.abs(x - 615) < 60) continue;
    g.fillStyle(0x000000, 0.4); g.fillEllipse(x, SEA_Y - 18, 22, 8);
    g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 8, SEA_Y - 34, 16, 18, 4);
    g.fillStyle(IRON, 1); g.fillEllipse(x, SEA_Y - 34, 20, 8);
    g.fillStyle(IRON_LIT, 0.6); g.fillEllipse(x - 3, SEA_Y - 35, 6, 2);
  }

  // The landing pier and the fishers' jetty: tarred planks on iron piles.
  for (const r of [PIER, JETTY]) {
    g.fillStyle(0x000000, 0.4); g.fillRect(r.x + 6, r.y + 6, r.w, r.h);
    g.fillStyle(WOOD_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
    for (let py = r.y; py < r.y + r.h; py += 10) {
      g.fillStyle(mixC(WOOD, 0x22201e, rng() * 0.5), 1); g.fillRect(r.x + 2, py + 1, r.w - 4, 8);
      g.fillStyle(COBBLE_WET, 0.12); g.fillRect(r.x + 2, py + 1, r.w - 4, 1.5);
    }
    for (const px of [r.x - 3, r.x + r.w - 5]) {
      for (let py = r.y + 20; py < r.y + r.h; py += 46) {
        g.fillStyle(IRON_DARK, 1); g.fillRect(px, py, 8, 14);
        g.fillStyle(IRON_LIT, 0.5); g.fillRect(px, py, 8, 2);
      }
    }
  }

  // The basalt point under the lighthouse, black columns with tide pools between.
  blob(g, 200, 1250, 160, 90, 0x0e0f14, 1, rng, 12);
  blob(g, 200, 1240, 150, 80, BASALT, 1, rng, 12);
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, d = rng() * 110;
    const cx = 200 + Math.cos(a) * d, cy = 1240 + Math.sin(a) * d * 0.55;
    poly(g, [[cx - 8, cy], [cx - 4, cy - 7], [cx + 4, cy - 7], [cx + 8, cy], [cx + 4, cy + 7], [cx - 4, cy + 7]], mixC(BASALT_LIT, BASALT, rng()));
    g.lineStyle(1, 0x0a0a0e, 0.8); g.strokeCircle(cx, cy, 8);
  }
  for (const [px, py] of [[110, 1300], [300, 1316], [180, 1330]] as [number, number][]) {
    g.fillStyle(SEA, 1); g.fillEllipse(px, py, 34, 12);
    g.fillStyle(SEA_LIT, 0.5); g.fillEllipse(px - 6, py - 2, 12, 3);
  }

  // Inspection covers, puddles and soot.
  for (const [mx, my] of [[1300, 260], [1300, 620], [1300, 1060], [480, 750], [2140, 750], [1760, 750]] as [number, number][]) manhole(g, mx, my);
  for (const [px, py, r] of PUDDLES) puddle(g, px, py, r, r * 0.4);
  // Where the great cable comes out of the sea: a scour of pale shingle and torn weed.
  blob(g, 500, 1330, 40, 14, 0x3a3c44, 0.8, rng, 8);
}

// ── Buildings ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

/** A terrace of crank-houses along one lane: one piece per house, one solid for the row. */
function terrace(x0: number, y: number, n: number, step: number, w: number, h: number, opts: CrankOpts[]): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step, o = opts[i % opts.length];
    pieces.push({ x, y, w: w + 30, h: h * 1.5 + 30, draw: (g, rng) => { crankHouse(g, x, y, w, h, o, rng); } });
  }
  solids.push({ kind: 'rect', x: x0 - w / 2 - 4, y: y - 28, w: (n - 1) * step + w + 8, h: 28 });
}

// Crank Row West (north lane): the lamplighters' old street.
terrace(180, 400, 5, 120, 112, 112, [
  { lit: true, crank: 'wheel', tally: 9 }, { lit: false, tags: 1, crank: 'treadle', tally: 4, candle: true },
  { lit: true, crank: 'belt', tally: 11 }, { lit: true, crank: 'wheel', tally: 8, roof: 0x30283a }, { lit: false, tags: 2, crank: 'wheel', tally: 3 },
]);
// Crank Row West (on the Row).
terrace(180, 650, 5, 120, 112, 116, [
  { lit: true, crank: 'treadle', tally: 10, wall: 0x46302a }, { lit: true, crank: 'wheel', tally: 12 },
  { lit: false, tags: 1, crank: 'belt', tally: 5 }, { lit: true, crank: 'wheel', tally: 9, wall: 0x3e2c2c }, { lit: true, crank: 'treadle', tally: 10 },
]);
// Crank South: the Pennicks' house is the second, with two tags by the door already.
terrace(150, 960, 2, 112, 106, 110, [
  { lit: true, crank: 'wheel', tally: 10 }, { lit: false, tags: 2, crank: 'wheel', tally: 6, candle: true, wall: 0x3e2a24 },
]);
// Crank Row East.
terrace(1650, 320, 8, 112, 106, 108, [
  { lit: true, crank: 'belt', tally: 10 }, { lit: true, crank: 'wheel', tally: 9 }, { lit: false, tags: 3, crank: 'treadle', tally: 2 },
  { lit: true, crank: 'wheel', tally: 12, wall: 0x46302a }, { lit: false, tags: 1, crank: 'wheel', tally: 6, candle: true },
  { lit: true, crank: 'treadle', tally: 9 }, { lit: true, crank: 'belt', tally: 10, roof: 0x30283a }, { lit: false, tags: 2, crank: 'wheel', tally: 4 },
]);
// Two by the Grid Stores, south of the Row.
terrace(2060, 1000, 2, 112, 106, 104, [{ lit: true, crank: 'wheel', tally: 11 }, { lit: false, tags: 1, crank: 'belt', tally: 7 }]);

/**
 * The Meter House: the civic heart of Terminus, x,y = front base centre. Soot-brick and pale stone,
 * its pediment carrying the Great Meter (a dial the size of a cartwheel), its whole ground floor
 * front a slate chalkboard of every household's name and quota — strokes for cranked, a red OFF for
 * switched off, and a little copper bolt nailed through a name that was earthed. A rank of meters
 * along the plinth; thick insulated bundles going in at the roof.
 */
function meterHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.1, 26, 0.45);
  // Plinth and steps.
  g.fillStyle(0x34343a, 1); g.fillRect(x0 - 10, y - 16, w + 20, 16);
  g.fillStyle(0x54545c, 1); g.fillRect(x0 - 10, y - 18, w + 20, 3);
  // Walls.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, top, w, h - 16);
  g.fillStyle(BRICK, 1); g.fillRect(x0 + 2, top, w - 4, h - 18);
  for (let ry = top + 6; ry < y - 18; ry += 7) { g.lineStyle(1, BRICK_DARK, 0.6); g.lineBetween(x0 + 2, ry, x0 + w - 2, ry); }
  // Pilasters of pale stone.
  for (let k = 0; k <= 4; k++) {
    const px = x0 + 6 + k * ((w - 24) / 4);
    g.fillStyle(0x6a6a72, 1); g.fillRect(px, top, 12, h - 18);
    g.fillStyle(0x8a8a94, 1); g.fillRect(px, top, 3, h - 18);
    g.fillStyle(0x8a8a94, 1); g.fillRect(px - 3, top - 2, 18, 5);
  }
  // The great chalkboard across the ground floor, both sides of the door.
  for (const [bx, bw] of [[x0 + 20, w / 2 - 54], [x + 34, w / 2 - 54]] as [number, number][]) {
    const by = top + h * 0.34, bh = h * 0.42;
    g.fillStyle(0x4a3a26, 1); g.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    g.fillStyle(0x1e2420, 1); g.fillRect(bx, by, bw, bh);
    for (let row = 0; row < 9; row++) {
      const ry = by + 5 + row * (bh - 8) / 9;
      g.fillStyle(CHALK, 0.55); g.fillRect(bx + 4, ry, 14 + rng() * 14, 1.5);
      const strokes = Math.floor(rng() * 12);
      for (let s = 0; s < strokes; s++) {
        g.lineStyle(1, CHALK, 0.7);
        const sx = bx + 34 + s * 3 + Math.floor(s / 5) * 3;
        if (sx > bx + bw - 22) break;
        g.lineBetween(sx, ry - 2, sx, ry + 3);
      }
      if (strokes < 4) { g.fillStyle(TAG, 0.85); g.fillRect(bx + bw - 18, ry - 2, 13, 5); }
      if (strokes === 0) { g.fillStyle(COPPER_LIT, 1); g.fillCircle(bx + 10, ry, 1.6); g.lineStyle(1, COPPER, 1); g.lineBetween(bx + 6, ry - 2, bx + 22, ry + 2); }
    }
    g.lineStyle(1, CHALK, 0.25); g.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
  }
  // The doors: iron-bound, a brass grille, the Grid's mark over the lintel.
  g.fillStyle(0x6a6a72, 1); g.fillRect(x - 30, y - 18 - h * 0.5, 60, h * 0.5);
  g.fillStyle(0x14161e, 1); g.fillRect(x - 25, y - 18 - h * 0.46, 50, h * 0.46);
  g.lineStyle(1, BRASS_DARK, 1);
  for (let k = 0; k < 6; k++) g.lineBetween(x - 25 + k * 10, y - 18 - h * 0.46, x - 25 + k * 10, y - 18);
  g.lineBetween(x, y - 18 - h * 0.46, x, y - 18);
  gridSeal(g, x, y - 22 - h * 0.5, 12, BRASS, 1);
  // Cornice, pediment, the Great Meter.
  g.fillStyle(0x6a6a72, 1); g.fillRect(x0 - 8, top - 8, w + 16, 10);
  g.fillStyle(0x8a8a94, 1); g.fillRect(x0 - 8, top - 8, w + 16, 2);
  poly(g, [[x0 + 30, top - 8], [x0 + w - 30, top - 8], [x, top - 74]], 0x54545c);
  poly(g, [[x0 + 40, top - 12], [x0 + w - 40, top - 12], [x, top - 68]], BRICK_DARK);
  meterDial(g, x, top - 34, 24, 0.86);
  g.lineStyle(2, COPPER, 1); g.strokeCircle(x, top - 34, 28);
  // The insulated bundles going in under the eaves, porcelain bushings in a row.
  for (let k = 0; k < 5; k++) {
    const bx = x0 + 40 + k * ((w - 80) / 4);
    g.fillStyle(PORCELAIN, 1); g.fillRect(bx - 3, top - 22, 6, 14);
    for (let d = 0; d < 3; d++) { g.fillStyle(lit(PORCELAIN, 0.2), 1); g.fillEllipse(bx, top - 20 + d * 4, 10, 3); }
  }
  // The rank of household meters along the plinth.
  for (let k = 0; k < 12; k++) {
    const mx = x0 + 18 + k * ((w - 36) / 11);
    if (Math.abs(mx - x) < 40) continue;
    meterDial(g, mx, y - 26, 5, rng());
  }
}
pieces.push({ x: 960, y: 560, w: 440, h: 260, draw: (g, rng) => meterHouse(g, 960, 560, 400, 172, rng) });
solids.push({ kind: 'rect', x: 750, y: 518, w: 420, h: 42 });

// The Brownout Bell, beside the Cableway.
pieces.push({ x: 1180, y: 640, w: 110, h: 160, draw: (g) => brownoutBell(g, 1180, 640) });
solids.push({ kind: 'circle', x: 1146, y: 638, r: 9 }, { kind: 'circle', x: 1214, y: 638, r: 9 });

/**
 * The Lamplighters' Hall, boarded up: a narrow guildhall with a carved stone lantern over the door,
 * its windows planked, its doors chained, ladders padlocked to the wall in a row, and the Grid's
 * notice of seizure nailed across everything.
 */
function lamplightersHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.08, 22, 0.42);
  g.fillStyle(0x2e2a2a, 1); g.fillRect(x0, top, w, h);
  for (let ry = top + 8; ry < y; ry += 10) {
    g.lineStyle(1, 0x1a1818, 0.8); g.lineBetween(x0, ry, x0 + w, ry);
    for (let rx = x0 + (((ry - top) / 10) % 2 ? 0 : 12); rx < x0 + w; rx += 24) g.lineBetween(rx, ry - 10, rx, ry);
  }
  // Gable with a stone lantern carved in it.
  poly(g, [[x0 - 6, top + 2], [x0 + w + 6, top + 2], [x, top - 60]], 0x1e1c22);
  poly(g, [[x0, top], [x0 + w, top], [x, top - 54]], SLATE);
  g.fillStyle(0x6a6a70, 1); g.fillRect(x - 8, top - 30, 16, 20);
  poly(g, [[x - 10, top - 30], [x + 10, top - 30], [x, top - 40]], 0x6a6a70);
  g.fillStyle(0x3a3020, 1); g.fillRect(x - 5, top - 26, 10, 12);
  // Planked windows.
  for (const wx of [x0 + 34, x0 + w - 34]) {
    g.fillStyle(0x0c0c10, 1); g.fillRect(wx - 16, top + 22, 32, 40);
    for (let k = 0; k < 4; k++) { g.fillStyle(mixC(WOOD, 0x2a2420, rng() * 0.5), 1); g.fillRect(wx - 19, top + 26 + k * 10, 38, 7); }
    g.fillStyle(IRON_LIT, 0.8); g.fillCircle(wx - 14, top + 30, 1); g.fillCircle(wx + 14, top + 50, 1);
  }
  // Doors, chained and sealed.
  g.fillStyle(0x6a6a70, 1); g.fillRect(x - 26, y - 56, 52, 56);
  g.fillStyle(0x2a1e16, 1); g.fillRect(x - 22, y - 52, 44, 52);
  g.lineStyle(1, 0x140e0a, 1); g.lineBetween(x, y - 52, x, y);
  g.lineStyle(2.5, IRON_LIT, 1); g.lineBetween(x - 22, y - 34, x + 22, y - 22); g.lineBetween(x - 22, y - 22, x + 22, y - 34);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 5, y - 32, 10, 9);
  g.fillStyle(0xe0d8c0, 1); g.fillRect(x - 15, y - 48, 30, 12);
  gridSeal(g, x, y - 39, 5, TAG, 1);
  // Ladders chained to the wall in a row — five, one for each lamplighter. One chain hangs empty.
  for (let k = 0; k < 5; k++) {
    const lx = x0 + 64 + k * 20;
    if (Math.abs(lx - x) < 30) continue;
    if (k === 4) { g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(lx, y - 70, lx + 2, y - 50); continue; }
    g.lineStyle(2, WOOD, 1); g.lineBetween(lx - 4, y - 2, lx - 2, y - 92); g.lineBetween(lx + 4, y - 2, lx + 6, y - 92);
    for (let r = 0; r < 8; r++) g.lineBetween(lx - 4 + r * 0.2, y - 10 - r * 11, lx + 4 + r * 0.2, y - 10 - r * 11);
    g.lineStyle(1.5, IRON_LIT, 0.9); g.lineBetween(lx - 6, y - 60, lx + 8, y - 58);
  }
}
pieces.push({ x: 300, y: 230, w: 260, h: 200, draw: (g, rng) => lamplightersHall(g, 300, 230, 220, 120, rng) });
solids.push({ kind: 'rect', x: 188, y: 196, w: 224, h: 34 });

/**
 * The Cable House, where the undersea cable ends: a squat bunker of tarred stone with a round iron
 * port in its front wall that the cable goes into, a glimpse of the switchboard through the door, and
 * on its roof a row of porcelain bushings tall as men, from which the first wires of the Grid rise.
 */
function cableHouse(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.1, 22, 0.45);
  g.fillStyle(0x24262c, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(0x30323a, 1); g.fillRect(x0 + 4, top + 4, w - 8, h - 8);
  for (let ry = top + 14; ry < y; ry += 16) { g.lineStyle(1, 0x16171c, 1); g.lineBetween(x0 + 4, ry, x0 + w - 4, ry); }
  // Battered base.
  poly(g, [[x0 - 10, y], [x0 + w + 10, y], [x0 + w, y - 18], [x0, y - 18]], 0x1a1b20);
  // Flat roof with a parapet, the bushings on top.
  g.fillStyle(0x14151a, 1); g.fillRect(x0 - 4, top - 8, w + 8, 10);
  for (let k = 0; k < 4; k++) {
    const bx = x0 + 34 + k * ((w - 68) / 3);
    g.fillStyle(IRON_DARK, 1); g.fillRect(bx - 7, top - 14, 14, 8);
    for (let d = 0; d < 7; d++) {
      g.fillStyle(dim(PORCELAIN, 0.3), 1); g.fillEllipse(bx, top - 18 - d * 7, 16, 6);
      g.fillStyle(PORCELAIN, 1); g.fillEllipse(bx, top - 19 - d * 7, 14, 4.5);
    }
    g.fillStyle(COPPER, 1); g.fillCircle(bx, top - 68, 3);
  }
  // The iron port the great cable enters by: a riveted collar, the cable stuffed in with tarred packing.
  const px = x, py = top + h * 0.42;
  g.fillStyle(IRON_DARK, 1); g.fillCircle(px, py, 26);
  g.fillStyle(IRON, 1); g.fillCircle(px, py, 23);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle(IRON_LIT, 1); g.fillCircle(px + Math.cos(a) * 19, py + Math.sin(a) * 19, 1.4); }
  g.fillStyle(0x0a0a0c, 1); g.fillCircle(px, py, 15);
  g.fillStyle(0x2a2016, 1); g.fillCircle(px, py, 12);
  // The door, ajar: the switchboard's knife-switches and a glowing valve inside.
  const dx = x0 + w - 44;
  g.fillStyle(0x0a0a0e, 1); g.fillRect(dx - 16, y - 54, 32, 54);
  g.fillStyle(0x1a2030, 1); g.fillRect(dx - 13, y - 50, 26, 30);
  for (let k = 0; k < 4; k++) { g.lineStyle(1.5, COPPER_LIT, 0.9); g.lineBetween(dx - 9 + k * 6, y - 44, dx - 7 + k * 6, y - 34); }
  g.fillStyle(0xff9a4a, 0.9); g.fillCircle(dx + 6, y - 26, 2);
  g.fillStyle(0x3a3c44, 1); poly(g, [[dx + 16, y - 54], [dx + 26, y - 50], [dx + 26, y - 2], [dx + 16, y]], 0x3a3c44);
  // Stencil: the Grid's mark, big, in white.
  gridSeal(g, x0 + 40, top + h * 0.7, 16, 0xd8d8d8, 0.7);
}
pieces.push({ x: 520, y: 1080, w: 260, h: 190, draw: (g) => cableHouse(g, 520, 1080, 220, 100) });
solids.push({ kind: 'rect', x: 400, y: 1046, w: 240, h: 34 });

// The great cable: out of the sea, up the trestles, into the Cable House. Drawn as one piece at the
// sea wall's depth (it is up on trestles, so you walk under it), with each trestle its own piece.
for (const [tx, ty, th] of TRESTLES) {
  pieces.push({ x: tx, y: ty, w: 70, h: th + 20, draw: (g) => trestle(g, tx, ty, th) });
  solids.push({ kind: 'circle', x: tx - 24, y: ty, r: 6 }, { kind: 'circle', x: tx + 24, y: ty, r: 6 });
}
pieces.push({
  x: 500, y: 1302, w: 120, h: 320, draw: (g) => {
    const pts: Pt[] = [CABLE_RUN[0], CABLE_RUN[1], CABLE_RUN[2], { x: 520, y: TRESTLES[0][1] - TRESTLES[0][2] - 2 },
      { x: 520, y: TRESTLES[1][1] - TRESTLES[1][2] - 2 }, { x: 520, y: 1022 }];
    bigCable(g, pts, 10);
    // Iron clamps on the saddles and a brass gland where it goes in.
    for (const [, ty, th] of TRESTLES) { g.fillStyle(IRON_LIT, 1); g.fillRect(506, ty - th - 6, 28, 4); }
    g.fillStyle(BRASS, 1); g.fillRect(506, 1018, 28, 8);
  },
});

// Pylons.
for (const [, [px, py, ph]] of Object.entries(PYLONS)) {
  pieces.push({ x: px, y: py, w: 110, h: ph + 20, draw: (g) => pylon(g, px, py, ph) });
  solids.push({ kind: 'circle', x: px - 24, y: py - 2, r: 7 }, { kind: 'circle', x: px + 24, y: py - 2, r: 7 });
}

// The wires: every span of the Grid in one piece drawn over everything below it on the map.
const tipsOf = (end: string | Pt): Pt[] => {
  if (typeof end !== 'string') return [{ x: end.x - 40, y: end.y }, end, { x: end.x + 40, y: end.y }];
  const [x, y, h] = PYLONS[end];
  return pylonTips(x, y, h);
};
/** Every span's three wires as [a, b, sag] — shared with the spark animation. */
const SPANS: [Pt, Pt, number][] = [];
for (const [a, b, sag] of WIRES) {
  const ta = tipsOf(a), tb = tipsOf(b);
  for (let k = 0; k < 3; k++) SPANS.push([ta[k], tb[k], sag + k * 3]);
}
// The Cable House's bushings feed the first pylon.
for (let k = 0; k < 3; k++) {
  const [x, y, h] = PYLONS.cable;
  SPANS.push([{ x: 410 + 34 + k * ((220 - 68) / 3), y: 1080 - 100 - 68 }, pylonTips(x, y, h)[k], 18]);
}
/** Service drops: thin copper wires from the nearest span down to roofs. */
const DROPS: [Pt, Pt][] = [];
const westSpan = SPANS[WIRES.findIndex(([a, b]) => a === 'cable' && b === 'west1') * 3];
for (let i = 0; i < 5; i++) {
  const hx = 180 + i * 120;
  const f = (westSpan[0].x - (hx + 50)) / (westSpan[0].x - westSpan[1].x);
  DROPS.push([sagPt(westSpan[0], westSpan[1], westSpan[2], Math.min(0.95, Math.max(0.05, f))), { x: hx + 50, y: 650 - 116 }]);
}
pieces.push({
  x: W / 2, y: H + 10, w: W + 200, h: H + 200, draw: (g) => {
    for (const [a, b, sag] of SPANS) wire(g, a, b, sag, 2.2);
    for (const [a, b] of DROPS) wire(g, a, b, 8, 1, COPPER_DARK, COPPER, 0.8);
  },
});

/**
 * The story the town shows. The Empress falling cuts the Grid: the lighthouse's metered bulb goes
 * dark with it. The night of the lamps (Wren's arc, step 4) lights every street lamp and puts the
 * lighthouse on full oil, full lens.
 */
const GRID_CUT: Cond = { monarch: 'ohmrine' };
const LAMPS_LIT: Cond = { flag: 'wren-lamp-4' };

// The old lamps: cold and sooted under the Grid, trimmed and lit after Wren's round.
for (const p of LAMPS) {
  pieces.push({ x: p.x, y: p.y, w: 40, h: 110, when: { not: LAMPS_LIT }, draw: (g, rng) => streetLamp(g, p.x, p.y, rng) });
  pieces.push({ x: p.x, y: p.y, w: 40, h: 110, when: LAMPS_LIT, draw: (g, rng) => streetLamp(g, p.x, p.y, rng, true) });
  solids.push({ kind: 'circle', x: p.x, y: p.y - 2, r: 5 });
}

/**
 * The lightning-rod lighthouse on the basalt point: a tapering tower of black stone banded with
 * copper, a gallery and a glazed lantern room whose great lens holds a single metered bulb, and on
 * the cap a copper rod twice the tower's height with a ball at the top and a down-strap riveted the
 * whole way to the rock. The storm hits it every few seconds; the tower is scorched in a stripe.
 */
const LH = { x: 210, y: 1240, h: 250, rod: 170 };
function lighthouse(g: G, rng: () => number): void {
  const { x, y, h, rod } = LH;
  shadow(g, x, y + 6, 120, 30, 0.5);
  // Plinth of dressed basalt.
  g.fillStyle(0x14151a, 1); g.fillEllipse(x, y, 96, 30);
  g.fillStyle(0x26272e, 1); g.fillRect(x - 46, y - 24, 92, 24);
  g.fillStyle(0x3a3c46, 1); g.fillRect(x - 46, y - 26, 92, 4);
  // Tapering tower in bands: black stone, copper hoops.
  const top = y - h;
  for (let k = 0; k < 10; k++) {
    const y0 = y - 24 - k * ((h - 50) / 10), y1 = y0 - (h - 50) / 10;
    const w0 = 38 - k * 1.6, w1 = 38 - (k + 1) * 1.6;
    poly(g, [[x - w0, y0], [x + w0, y0], [x + w1, y1], [x - w1, y1]], k % 2 ? 0x1a1b22 : 0x22232a);
    g.fillStyle(0x000000, 0.25); poly(g, [[x + w0 * 0.3, y0], [x + w0, y0], [x + w1, y1], [x + w1 * 0.3, y1]], 0x000000, 0.25);
    if (k % 3 === 2) { g.fillStyle(COPPER_DARK, 1); g.fillRect(x - w1 - 1, y1 - 2, w1 * 2 + 2, 4); g.fillStyle(VERDI, 0.7); g.fillRect(x - w1 - 1, y1 - 2, w1 * 2 + 2, 1.5); }
  }
  // Scorch where the bolts run down.
  g.fillStyle(0x000000, 0.35); g.fillRect(x - 10, top + 30, 9, h - 60);
  // A door and slit windows with a cold glow.
  g.fillStyle(0x0a0a0e, 1); g.fillRect(x - 10, y - 56, 20, 32);
  g.fillStyle(0x2a3040, 1); g.fillRect(x - 8, y - 54, 16, 30);
  for (let k = 0; k < 3; k++) { g.fillStyle(0x0a0a0e, 1); g.fillRect(x + 4, y - 110 - k * 56, 5, 14); g.fillStyle(BULB, 0.25); g.fillRect(x + 5, y - 108 - k * 56, 3, 10); }
  // Gallery and lantern room.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 34, top + 22, 68, 8);
  for (let k = 0; k < 9; k++) { g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(x - 32 + k * 8, top + 22, x - 32 + k * 8, top + 10); }
  g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(x - 34, top + 10, x + 34, top + 10);
  g.fillStyle(0x0e1420, 1); g.fillRect(x - 22, top - 22, 44, 44);
  g.fillStyle(0x3a5a7a, 0.4); g.fillRect(x - 22, top - 22, 44, 44);
  for (let k = 0; k < 4; k++) { g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(x - 22 + k * 14.6, top - 22, x - 22 + k * 14.6, top + 22); }
  // The lens: rings of prism glass round one dim metered bulb.
  for (let k = 0; k < 4; k++) { g.lineStyle(1, 0x9ad8ff, 0.3 - k * 0.05); g.strokeEllipse(x, top, 30 - k * 6, 34 - k * 7); }
  g.fillStyle(BULB, 0.5); g.fillCircle(x, top, 3);
  // Cap, and the rod: a copper mast twice the tower, a ball, guy wires to the gallery.
  poly(g, [[x - 26, top - 22], [x + 26, top - 22], [x, top - 46]], 0x1a1b22);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 3, top - 46 - rod, 6, rod);
  g.fillStyle(COPPER, 1); g.fillRect(x - 2, top - 46 - rod, 2, rod);
  g.fillStyle(VERDI, 0.6); for (let k = 0; k < 6; k++) g.fillRect(x - 3, top - 60 - k * 26, 6, 3);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, top - 46 - rod, 6);
  g.fillStyle(0xffffff, 0.6); g.fillCircle(x - 2, top - 48 - rod, 2);
  g.lineStyle(1, IRON_LIT, 0.5);
  g.lineBetween(x, top - 46 - rod * 0.6, x - 34, top + 14); g.lineBetween(x, top - 46 - rod * 0.6, x + 34, top + 14);
  // The down-strap: a copper band riveted all the way to an earth plate in the rock.
  g.lineStyle(3, COPPER_DARK, 1); g.lineBetween(x - 6, top - 22, x - 6 - 0, y - 26);
  for (let ry = top; ry < y - 30; ry += 14) { g.fillStyle(COPPER_LIT, 0.8); g.fillCircle(x - 6, ry, 1.2); }
  g.fillStyle(COPPER, 1); g.fillRect(x - 16, y - 6, 20, 6);
  for (let i = 0; i < 6; i++) rock(g, x - 50 + rng() * 100, y + 4 + rng() * 14, 6 + rng() * 6, 0x1a1b22, rng);
}
pieces.push({ x: LH.x, y: LH.y, w: 140, h: LH.h + LH.rod + 60, draw: (g, rng) => lighthouse(g, rng) });
solids.push({ kind: 'circle', x: LH.x, y: LH.y - 20, r: 60 });
/** The rod's tip — where the storm strikes. */
const ROD_TIP: Pt = { x: LH.x, y: LH.y - LH.h - 46 - LH.rod };

/**
 * Sockets & Sundries, the general store: a deep shopfront of green-painted iron, its window stacked
 * with jars of fuses, coils of wire, bulbs graded by brightness and a pyramid of crank-handles, a
 * great bulb-shaped sign over the door that lights up when the shop has paid its Draw (it has).
 */
function socketsShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.08, 22, 0.42);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, top - 50, w, h + 50);
  g.fillStyle(0x3e2a26, 1); g.fillRect(x0 + 3, top - 48, w - 6, h + 46);
  poly(g, [[x0 - 8, top - 48], [x0 + w + 8, top - 48], [x0 + w - 20, top - 96], [x0 + 20, top - 96]], SLATE);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, dim(SLATE, 0.4), 1); g.lineBetween(x0 + 10 + k * 4, top - 56 - k * 7, x0 + w - 10 - k * 4, top - 56 - k * 7); }
  // Upstairs windows, lit.
  for (const wx of [x0 + 50, x0 + w - 50]) { g.fillStyle(0x6a6a72, 1); g.fillRect(wx - 12, top - 40, 24, 28); g.fillStyle(BULB, 0.95); g.fillRect(wx - 10, top - 38, 20, 24); }
  // The green iron shopfront.
  g.fillStyle(0x1e3a2e, 1); g.fillRect(x0 + 6, top, w - 12, h);
  g.fillStyle(0x2e5a46, 1); g.fillRect(x0 + 6, top, w - 12, 14);
  g.fillStyle(BRASS, 0.85); g.fillRect(x0 + 20, top + 4, w - 40, 5);
  // Window: shelves of fuse jars, coils, bulbs, crank-handles.
  const wx0 = x0 + 16, ww = w - 96, wy0 = top + 22, wh = h - 34;
  g.fillStyle(0x0e1418, 1); g.fillRect(wx0, wy0, ww, wh);
  g.fillStyle(BULB, 0.14); g.fillRect(wx0, wy0, ww, wh);
  for (let s = 0; s < 3; s++) {
    const sy = wy0 + 18 + s * (wh / 3);
    g.fillStyle(WOOD, 1); g.fillRect(wx0 + 2, sy, ww - 4, 3);
    for (let i = 0; i < ww / 12 - 1; i++) {
      const ix = wx0 + 8 + i * 12;
      if (s === 0) { g.fillStyle(0x9ad8c8, 0.6); g.fillRect(ix - 4, sy - 12, 8, 12); g.fillStyle(rng() < 0.5 ? COPPER : BRASS, 1); for (let f = 0; f < 3; f++) g.fillRect(ix - 2, sy - 10 + f * 3, 4, 1.5); }
      else if (s === 1) { g.fillStyle(COPPER, 1); g.fillCircle(ix, sy - 6, 5); g.fillStyle(COPPER_DARK, 1); g.fillCircle(ix, sy - 6, 2.5); }
      else { const b = i / (ww / 12); g.fillStyle(mixC(0x3a3a40, BULB, b), 1); g.fillCircle(ix, sy - 8, 4.5); g.fillStyle(BRASS_DARK, 1); g.fillRect(ix - 2, sy - 4, 4, 4); }
    }
  }
  g.lineStyle(2, 0x2e5a46, 1); g.strokeRect(wx0, wy0, ww, wh);
  g.fillStyle(0xffffff, 0.08); poly(g, [[wx0 + 10, wy0], [wx0 + 34, wy0], [wx0 + 4, wy0 + wh], [wx0, wy0 + wh]], 0xffffff, 0.08);
  // The door, with a bell on a spring.
  const dx = x0 + w - 44;
  g.fillStyle(0x10201a, 1); g.fillRect(dx - 16, top + 20, 32, h - 20);
  g.fillStyle(BULB, 0.3); g.fillRect(dx - 12, top + 26, 24, 30);
  g.fillStyle(BRASS, 1); g.fillCircle(dx + 10, y - 30, 2);
  // The bulb sign over the shop: a great glass bulb on a bracket, filament zig-zagged inside.
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x, top - 48, x, top - 66);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 7, top - 50, 14, 10);
  g.fillStyle(BULB, 0.3); g.fillCircle(x, top - 30, 16);
  g.lineStyle(1.5, 0xfff0c8, 1);
  g.beginPath(); g.moveTo(x - 6, top - 38); for (let k = 0; k <= 6; k++) g.lineTo(x - 6 + k * 2, top - 30 + (k % 2 ? -5 : 5)); g.strokePath();
  g.lineStyle(1.5, 0xe8f0ff, 0.8); g.strokeCircle(x, top - 30, 16);
  // Crank-handles in a crate by the step.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x0 + 10, y - 18, 30, 18);
  for (let k = 0; k < 5; k++) { g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x0 + 14 + k * 5, y - 18, x0 + 18 + k * 5, y - 32); g.fillStyle(WOOD, 1); g.fillRect(x0 + 16 + k * 5, y - 36, 4, 5); }
}
pieces.push({ x: 1700, y: 560, w: 270, h: 260, draw: (g, rng) => socketsShop(g, 1700, 560, 240, 120, rng) });
solids.push({ kind: 'rect', x: 1578, y: 526, w: 244, h: 34 });

/**
 * The Element — Terminus's bakery, named for the thing in its oven: an electric bread-oven the size
 * of a wardrobe whose heating element, a fat spiral of nichrome, glows red through a round window in
 * the shopfront. The baker pays the dearest Draw in town to keep it hot; the sign is a loaf with a
 * coil through it. Bread is racked on the sill. There is no chimney: there is no fire.
 */
function elementBakery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.08, 22, 0.42);
  g.fillStyle(0x3a2c26, 1); g.fillRect(x0, top - 30, w, h + 30);
  g.fillStyle(0x5a4234, 1); g.fillRect(x0 + 3, top - 28, w - 6, h + 26);
  for (let ry = top - 20; ry < y; ry += 8) { g.lineStyle(1, 0x3a2c26, 0.6); g.lineBetween(x0 + 3, ry, x0 + w - 3, ry); }
  // Mansard roof in copper gone green.
  poly(g, [[x0 - 8, top - 28], [x0 + w + 8, top - 28], [x0 + w - 10, top - 84], [x0 + 10, top - 84]], COPPER_DARK);
  for (let k = 0; k < 9; k++) { g.lineStyle(2, VERDI, 0.7); g.lineBetween(x0 + k * (w / 8), top - 28, x0 + 10 + k * ((w - 20) / 8), top - 84); }
  g.fillStyle(VERDI, 0.4); g.fillRect(x0 + 10, top - 86, w - 20, 4);
  // A dormer, lit.
  g.fillStyle(0x5a4234, 1); g.fillRect(x - 18, top - 78, 36, 32);
  poly(g, [[x - 22, top - 78], [x + 22, top - 78], [x, top - 96]], COPPER_DARK);
  g.fillStyle(BULB, 0.9); g.fillRect(x - 12, top - 72, 24, 22);
  // The round oven window, the element behind it (lit by the animation; baked here dark-red).
  const ox = x0 + 70, oy = top + h * 0.45;
  g.fillStyle(0x1a1410, 1); g.fillCircle(ox, oy, 38);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(ox, oy, 35);
  g.fillStyle(0x2a0e08, 1); g.fillCircle(ox, oy, 30);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.fillStyle(BRASS, 1); g.fillCircle(ox + Math.cos(a) * 33, oy + Math.sin(a) * 33, 1.6); }
  // Loaves on the oven's racks, silhouetted.
  for (let k = 0; k < 3; k++) { g.fillStyle(0x140806, 1); g.fillEllipse(ox - 14 + k * 14, oy + 16, 12, 6); }
  // The shop window: racks of bread, a tray of fish pasties.
  const sx0 = x + 0, sw = w / 2 - 20;
  g.fillStyle(0x16100c, 1); g.fillRect(sx0, top + 20, sw, h * 0.5);
  g.fillStyle(BULB, 0.12); g.fillRect(sx0, top + 20, sw, h * 0.5);
  for (let s = 0; s < 2; s++) {
    const ry = top + 40 + s * 24;
    g.fillStyle(WOOD, 1); g.fillRect(sx0 + 4, ry, sw - 8, 3);
    for (let i = 0; i < sw / 18 - 1; i++) {
      g.fillStyle(0x8a5a2a, 1); g.fillEllipse(sx0 + 14 + i * 18, ry - 5, 15, 9);
      g.fillStyle(0xd8a060, 1); g.fillEllipse(sx0 + 14 + i * 18, ry - 7, 11, 4);
      if (s === 1) { g.lineStyle(1, 0x5a3a1a, 1); g.lineBetween(sx0 + 10 + i * 18, ry - 7, sx0 + 18 + i * 18, ry - 7); }
    }
  }
  g.lineStyle(2, 0x2a1e16, 1); g.strokeRect(sx0, top + 20, sw, h * 0.5);
  // Door between.
  const dx = x - 26;
  g.fillStyle(0x24160e, 1); g.fillRect(dx - 14, y - 64, 28, 64);
  g.fillStyle(BULB, 0.25); g.fillRect(dx - 10, y - 58, 20, 22);
  // The sign: a loaf with a coil through it, on a bracket.
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x0 + w - 10, top + 6, x0 + w + 30, top + 6);
  g.fillStyle(0x24160e, 1); g.fillRoundedRect(x0 + w + 4, top + 10, 46, 30, 5);
  g.fillStyle(0x8a5a2a, 1); g.fillEllipse(x0 + w + 27, top + 26, 32, 14);
  g.fillStyle(0xd8a060, 1); g.fillEllipse(x0 + w + 27, top + 24, 26, 8);
  g.lineStyle(1.5, 0xff6a3a, 1);
  g.beginPath(); g.moveTo(x0 + w + 10, top + 26); for (let k = 0; k <= 8; k++) g.lineTo(x0 + w + 12 + k * 4, top + 26 + (k % 2 ? -5 : 5)); g.strokePath();
  // The heavy supply: a fat cable from the roof down into a fuse-box by the door.
  g.lineStyle(4, RUBBER, 1); g.lineBetween(x0 + w - 16, top - 28, x0 + w - 16, y - 50);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + w - 28, y - 56, 24, 22);
  meterDial(g, x0 + w - 16, y - 45, 7, 0.92);
  // Flour sacks on the step.
  for (let k = 0; k < 2; k++) { g.fillStyle(0xd8d0c0, 1); g.fillRoundedRect(x0 + 120 + k * 22 - 10, y - 22, 20, 22, 5); g.fillStyle(0xa8a090, 1); g.fillRect(x0 + 120 + k * 22 - 6, y - 24, 12, 4); }
  gridSeal(g, x0 + 130, y - 10, 4, GRID_DARK, 0.6);
}
pieces.push({ x: 2080, y: 560, w: 330, h: 260, draw: (g, rng) => elementBakery(g, 2080, 560, 260, 130, rng) });
solids.push({ kind: 'rect', x: 1948, y: 526, w: 264, h: 34 });
/** Where the oven's element glows (for the animation). */
const OVEN: Pt = { x: 2080 - 130 + 70, y: 560 - 130 + 130 * 0.45 };

/**
 * Varnish & Line, the tackle shop, by the east quay: a tarred-plank shed with rods racked outside
 * under the eaves — each dipped black in rubber at the butt, for the charged waters — a vat of
 * gutta-percha steaming on the step, and in the window a glass tank where a cable eel glows.
 */
function varnishShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.08, 20, 0.42);
  g.fillStyle(0x16120e, 1); g.fillRect(x0, top, w, h);
  for (let k = 0; k < w / 12; k++) { g.fillStyle(mixC(0x2a2018, 0x1a140e, rng()), 1); g.fillRect(x0 + k * 12 + 1, top + 2, 10, h - 2); }
  poly(g, [[x0 - 14, top + 4], [x0 + w + 14, top + 4], [x0 + w + 4, top - 36], [x0 - 4, top - 36]], 0x2a2420);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, 0x14100c, 1); g.lineBetween(x0 - 12 + k * 2, top - k * 8, x0 + w + 12 - k * 2, top - k * 8); }
  // Rods racked under the eaves, butts dipped black.
  for (let k = 0; k < 9; k++) {
    const rx = x0 + 10 + k * 9;
    g.lineStyle(1.5, k % 3 === 0 ? COPPER : 0x8a7a5a, 1); g.lineBetween(rx, y - 6, rx + 6, top - 20);
    g.lineStyle(3, RUBBER, 1); g.lineBetween(rx, y - 6, rx + 1.4, y - 30);
  }
  // The eel tank in the window.
  const tx = x + 30, ty = top + 30;
  g.fillStyle(0x0a1418, 1); g.fillRect(tx - 34, ty, 68, 40);
  g.fillStyle(0x1a4a5a, 0.5); g.fillRect(tx - 32, ty + 6, 64, 32);
  g.lineStyle(2, IRON_LIT, 0.8); g.strokeRect(tx - 34, ty, 68, 40);
  // The door.
  g.fillStyle(0x0a0806, 1); g.fillRect(x0 + w - 40, y - 56, 28, 56);
  g.fillStyle(BULB, 0.2); g.fillRect(x0 + w - 36, y - 50, 20, 18);
  // The gutta-percha vat and its stirring paddle.
  const vx = x0 + w - 70;
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(vx, y - 6, 34, 12); g.fillRect(vx - 17, y - 26, 34, 20);
  g.fillStyle(0x1a0e08, 1); g.fillEllipse(vx, y - 26, 30, 9);
  g.fillStyle(0x3a2010, 0.8); g.fillEllipse(vx - 3, y - 27, 14, 4);
  g.lineStyle(2, WOOD, 1); g.lineBetween(vx + 4, y - 26, vx + 18, y - 52);
  // A hand-painted sign: a hook with a lightning bolt for its shank.
  g.fillStyle(0x2a2420, 1); g.fillRect(x0 + 20, top - 30, 54, 22);
  g.lineStyle(2, COPPER_LIT, 1);
  g.lineBetween(x0 + 46, top - 28, x0 + 42, top - 20); g.lineBetween(x0 + 42, top - 20, x0 + 48, top - 20); g.lineBetween(x0 + 48, top - 20, x0 + 44, top - 13);
  g.beginPath(); g.arc(x0 + 40, top - 13, 4, 0, Math.PI, false); g.strokePath();
  // Nets drying on the side wall.
  for (let k = 0; k < 6; k++) { g.lineStyle(1, 0x5a5a4a, 0.7); g.lineBetween(x0 - 2, top + 8 + k * 6, x0 + 30, top + 14 + k * 6); g.lineBetween(x0 + k * 6, top + 8, x0 + 6 + k * 5, y - 10); }
}
pieces.push({ x: 2380, y: 1110, w: 260, h: 190, draw: (g, rng) => varnishShop(g, 2380, 1110, 220, 110, rng) });
solids.push({ kind: 'rect', x: 2266, y: 1078, w: 228, h: 32 });
/** The eel tank (animated glow). */
const EEL_TANK: Pt = { x: 2410, y: 1022 };

/**
 * The Harbour Bank: a battery of Leyden jars as tall as children in an iron rack under a lean-to,
 * where the harbour's share of the Draw is stored before the Bell. Foil skins, brass knobs, a
 * discharge fork chained to the post.
 */
const JARS: Pt[] = [];
for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) JARS.push({ x: 2345 + k * 28 + r * 12, y: 612 - r * 26 });
function harbourBank(g: G): void {
  shadow(g, 2420, 616, 210, 24, 0.42);
  g.fillStyle(IRON_DARK, 1); g.fillRect(2322, 520, 6, 96); g.fillRect(2512, 520, 6, 96);
  poly(g, [[2310, 524], [2530, 524], [2520, 500], [2320, 500]], 0x22242c);
  g.lineStyle(1, IRON_LIT, 0.5); g.lineBetween(2310, 524, 2530, 524);
  for (const j of [...JARS].sort((a, b) => a.y - b.y)) {
    g.fillStyle(0x000000, 0.4); g.fillEllipse(j.x, j.y, 26, 8);
    g.fillStyle(0x2a3a4a, 0.7); g.fillRoundedRect(j.x - 11, j.y - 40, 22, 40, 6);
    g.fillStyle(0xb8c0c8, 1); g.fillRoundedRect(j.x - 11, j.y - 22, 22, 22, { tl: 0, tr: 0, bl: 6, br: 6 });
    g.fillStyle(0xe8eef4, 0.6); g.fillRect(j.x - 8, j.y - 20, 3, 18);
    g.fillStyle(0x3a2a1a, 1); g.fillRect(j.x - 8, j.y - 44, 16, 5);
    g.lineStyle(1.5, BRASS, 1); g.lineBetween(j.x, j.y - 44, j.x, j.y - 54);
    g.fillStyle(BRASS, 1); g.fillCircle(j.x, j.y - 56, 3.5);
  }
  // Bus-bar along the knobs.
  g.lineStyle(2, COPPER, 1); g.lineBetween(2345, 556, 2499, 556); g.lineBetween(2357, 530, 2511, 530);
  // The discharge fork, chained.
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(2515, 600, 2540, 560); g.lineBetween(2540, 560, 2546, 550); g.lineBetween(2540, 560, 2534, 550);
  g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(2518, 590, 2526, 600);
}
pieces.push({ x: 2420, y: 616, w: 240, h: 140, draw: (g) => harbourBank(g) });
solids.push({ kind: 'rect', x: 2318, y: 580, w: 204, h: 36 });

/**
 * The Grid Stores: a long corrugated-iron shed where the cable crews keep their drums, splicing
 * benches and spare insulators, with a hand-crane on a gantry over its open bay.
 */
function gridStores(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.06, 20, 0.42);
  g.fillStyle(0x2a2e36, 1); g.fillRect(x0, top, w, h);
  for (let k = 0; k < w / 6; k++) { g.fillStyle(k % 2 ? 0x343a44 : 0x262a32, 1); g.fillRect(x0 + k * 6, top, 6, h); }
  for (let k = 0; k < 6; k++) { g.fillStyle(0x6a3a1e, 0.25 + rng() * 0.3); g.fillRect(x0 + rng() * w, top + rng() * h * 0.5, 4 + rng() * 10, 10 + rng() * 30); }
  poly(g, [[x0 - 6, top + 2], [x0 + w + 6, top + 2], [x0 + w - 6, top - 22], [x0 + 6, top - 22]], 0x3a404a);
  // Open bay: crates of insulators, a splicing bench with a vice.
  const bx = x0 + 40, bw = w * 0.45;
  g.fillStyle(0x0c0d12, 1); g.fillRect(bx, top + 18, bw, h - 18);
  for (let k = 0; k < 4; k++) {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(bx + 8 + k * 26, y - 22, 22, 22);
    for (let d = 0; d < 3; d++) { g.fillStyle(0x5a9a8a, 0.9); g.fillEllipse(bx + 19 + k * 26, y - 26 - d * 3, 12, 3.5); }
  }
  g.fillStyle(WOOD, 1); g.fillRect(bx + bw - 50, y - 40, 44, 6);
  g.fillStyle(IRON, 1); g.fillRect(bx + bw - 22, y - 50, 10, 10);
  // The hand-crane gantry over the bay.
  g.fillStyle(IRON_DARK, 1); g.fillRect(bx - 6, top - 40, 6, h + 40); g.fillRect(bx + bw, top - 40, 6, h + 40);
  g.fillRect(bx - 10, top - 44, bw + 20, 6);
  g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(bx + bw * 0.6, top - 38, bx + bw * 0.6, top + 30);
  g.fillStyle(IRON, 1); g.fillRect(bx + bw * 0.6 - 4, top + 30, 8, 6);
  // A stencilled number and the Grid's mark on the side.
  gridSeal(g, x0 + w - 60, top + h * 0.6, 18, 0xd8d8d8, 0.55);
}
pieces.push({ x: 1720, y: 990, w: 310, h: 190, draw: (g, rng) => gridStores(g, 1720, 990, 280, 110, rng) });
solids.push({ kind: 'rect', x: 1578, y: 958, w: 284, h: 32 });
for (const [dx, dy, s] of [[1620, 1074, 1], [1708, 1092, 1.1], [1800, 1070, 0.9]] as [number, number, number][]) {
  pieces.push({ x: dx, y: dy, w: 80 * s, h: 60 * s, draw: (g) => cableDrum(g, dx, dy, s) });
  solids.push({ kind: 'circle', x: dx, y: dy - 8, r: 22 * s });
}

// The boatwright's slip: a hull on the stocks, the slipway running down into the sea beside it.
pieces.push({
  x: 1000, y: 1222, w: 240, h: 120, draw: (g, rng) => {
    g.fillStyle(0x1a1610, 1); poly(g, [[920, 1250], [1080, 1250], [1100, 1300], [900, 1300]], 0x1a1610);
    for (let k = 0; k < 6; k++) { g.lineStyle(2, WOOD, 0.8); g.lineBetween(905 + k * 3, 1256 + k * 8, 1095 - k * 3, 1256 + k * 8); }
    hullOnStocks(g, 1000, 1222, 190, rng);
    // Tools on a trestle: an adze, a caulking mallet, a pot of hot pitch (an electric pot — flame is contraband).
    g.fillStyle(WOOD_DARK, 1); g.fillRect(1086, 1210, 40, 4);
    g.fillStyle(IRON, 1); g.fillRect(1092, 1200, 10, 10);
    g.fillStyle(0x0a0806, 1); g.fillCircle(1097, 1200, 4);
    g.lineStyle(1.5, COPPER, 1); g.lineBetween(1102, 1206, 1130, 1240);
  },
});
solids.push({ kind: 'rect', x: 905, y: 1196, w: 190, h: 28 });

/**
 * The cable-ship *Long Patience*, moored alongside the east quay: a high black iron hull with a
 * red waterline, a great sheave-wheel over her bow for paying out cable, a round cable tank amidships
 * with the black coil showing, a tall funnel, two masts with derricks, and a wheelhouse with a bulb.
 */
const SHIP = { x: 1960, y: 1446, len: 560 };
function cableShip(g: G, rng: () => number): void {
  const { x, y, len } = SHIP;
  const x0 = x - len / 2, x1 = x + len / 2;
  const deck = y - 74;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 8, len * 1.05, 26);
  // Hull.
  poly(g, [[x0 + 20, deck], [x1 - 40, deck], [x1 + 30, deck - 18], [x1 - 10, y], [x0 + 30, y], [x0, deck + 10]], 0x101218);
  poly(g, [[x0 + 30, y - 16], [x1 - 14, y - 16], [x1 - 10, y], [x0 + 30, y]], 0x6a1e16);
  g.lineStyle(1, 0x3a3c48, 0.8);
  for (let k = 0; k < 18; k++) { const px = x0 + 40 + k * ((len - 80) / 17); g.lineBetween(px, deck + 4, px, y - 18); }
  g.lineStyle(2, 0x2a2c36, 1); g.lineBetween(x0 + 20, deck + 2, x1 - 40, deck + 2);
  for (let k = 0; k < 9; k++) { g.fillStyle(0x0a0a0e, 1); g.fillCircle(x0 + 80 + k * 46, deck + 22, 4); g.fillStyle(rng() < 0.5 ? BULB : 0x1a2030, 0.8); g.fillCircle(x0 + 80 + k * 46, deck + 22, 2.6); }
  // The name, chalked white on the bow in a hand that is not a signwriter's.
  g.fillStyle(CHALK, 0.65); for (let k = 0; k < 12; k++) g.fillRect(x1 - 120 + k * 7, deck + 40, 5, 2);
  // Bow sheave: a great grooved wheel on a cantilever, cable over it and down into the water.
  g.fillStyle(IRON_DARK, 1); poly(g, [[x1 - 40, deck], [x1 + 40, deck - 30], [x1 + 44, deck - 22], [x1 - 30, deck + 6]], IRON_DARK);
  g.fillStyle(IRON, 1); g.fillCircle(x1 + 34, deck - 34, 20);
  g.lineStyle(3, IRON_DARK, 1); g.strokeCircle(x1 + 34, deck - 34, 16);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineStyle(2, IRON_LIT, 0.8); g.lineBetween(x1 + 34, deck - 34, x1 + 34 + Math.cos(a) * 14, deck - 34 + Math.sin(a) * 14); }
  g.lineStyle(6, 0x18191e, 1); g.lineBetween(x1 + 52, deck - 40, x1 + 70, y + 20);
  // Cable tank amidships: a drum with the coil inside.
  const tx = x - 60;
  g.fillStyle(0x24262e, 1); g.fillEllipse(tx, deck - 2, 150, 34);
  g.fillStyle(0x0a0a0c, 1); g.fillEllipse(tx, deck - 4, 132, 26);
  for (let k = 0; k < 6; k++) { g.lineStyle(2, 0x2e3038, 1); g.strokeEllipse(tx, deck - 4, 120 - k * 18, 22 - k * 3.4); }
  g.lineStyle(2, IRON_LIT, 0.7); g.strokeEllipse(tx, deck - 2, 150, 34);
  // Wheelhouse, funnel, masts with derricks.
  const wx = x + 150;
  g.fillStyle(0x2a2c34, 1); g.fillRect(wx - 40, deck - 56, 80, 56);
  g.fillStyle(0x3a3e48, 1); g.fillRect(wx - 44, deck - 62, 88, 8);
  for (let k = 0; k < 3; k++) { g.fillStyle(BULB, 0.85); g.fillRect(wx - 32 + k * 24, deck - 46, 16, 14); }
  const fx = x + 60;
  g.fillStyle(0x14151a, 1); g.fillRect(fx - 14, deck - 120, 28, 120);
  g.fillStyle(TAG, 1); g.fillRect(fx - 14, deck - 104, 28, 10);
  gridSeal(g, fx, deck - 70, 9, 0xd8d8d8, 0.7);
  for (const mx of [x0 + 90, x + 240]) {
    g.lineStyle(4, 0x2a2420, 1); g.lineBetween(mx, deck, mx, deck - 200);
    g.lineStyle(2, 0x2a2420, 1); g.lineBetween(mx, deck - 150, mx + 70, deck - 40);
    g.lineStyle(1, 0x5a5a5a, 0.7); g.lineBetween(mx, deck - 196, mx + 70, deck - 40); g.lineBetween(mx, deck - 200, mx - 40, deck);
    g.lineStyle(1.5, COPPER, 1); g.lineBetween(mx, deck - 200, mx, deck - 222);
  }
  // Gangway to the quay.
  g.fillStyle(WOOD, 1); poly(g, [[1938, 1296], [1962, 1296], [1966, deck], [1934, deck]], WOOD);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, WOOD_DARK, 1); g.lineBetween(1936, 1300 + k * 12, 1964, 1300 + k * 12); }
}
pieces.push({ x: SHIP.x, y: SHIP.y, w: SHIP.len + 140, h: 320, draw: (g, rng) => cableShip(g, rng) });

/** Dark windows with a candle in them (contraband) — the animation flickers each. */
const CANDLES: Pt[] = [];
const candleAt = (hx: number, hy: number, w: number, h: number): void => { CANDLES.push({ x: hx - w * 0.22 + 2, y: hy - h + h * 0.18 + 12 }); };
candleAt(300, 400, 112, 112); candleAt(262, 960, 106, 110); candleAt(1650 + 4 * 112, 320, 106, 108);

// ── Animation ───────────────────────────────────────────────────────

/** Over ground, under actors: the sea, the rain on the puddles, the oven element, the jars, the eel. */
function animateUnder(g: G, t: number, view: Rect): void {
  // Whitecaps running before the storm.
  for (let i = 0; i < 70; i++) {
    const sp = 24 + (i % 4) * 12;
    const x = ((i * 173 + t * sp) % (W + 200)) - 100, y = SEA_Y + 18 + ((i * 41) % (H - SEA_Y - 22));
    if (!inView(view, x, y, 40)) continue;
    const ph = (t * 0.6 + i * 0.29) % 1;
    const a = Math.sin(ph * Math.PI);
    g.fillStyle(FOAM, 0.32 * a); g.fillEllipse(x, y, 30 + (i % 5) * 6, 3);
    g.fillStyle(0xffffff, 0.2 * a); g.fillEllipse(x + 4, y - 1, 12, 1.5);
  }
  // Surf against the sea wall and round the piles.
  if (inView(view, view.x + view.w / 2, SEA_Y, 60)) {
    for (let x = Math.max(0, Math.floor(view.x / 26) * 26); x < Math.min(W, view.x + view.w); x += 26) {
      const s = Math.sin(t * 1.8 + x * 0.04);
      g.fillStyle(FOAM, 0.2 + 0.15 * s); g.fillEllipse(x, SEA_Y + 6 + s * 2, 26, 4 + s);
    }
  }
  // Where the cable dives in: a ring of chop.
  if (inView(view, 486, 1460, 60)) for (let k = 0; k < 3; k++) {
    const ph = (t * 0.5 + k / 3) % 1;
    g.lineStyle(1.5, FOAM, 0.4 * (1 - ph)); g.strokeEllipse(486, 1460, 30 + ph * 50, 8 + ph * 12);
  }
  // Rain rings in the puddles.
  for (const [px, py, r] of PUDDLES) {
    if (!inView(view, px, py, r + 10)) continue;
    for (let k = 0; k < 3; k++) {
      const ph = (t * 1.3 + k * 0.37 + px * 0.01) % 1;
      const ox = Math.sin(px + k * 7) * r * 0.5, oy = Math.cos(py + k * 3) * r * 0.15;
      g.lineStyle(1, 0xb8d0f0, 0.45 * (1 - ph)); g.strokeEllipse(px + ox, py + oy, 4 + ph * r * 0.7, 2 + ph * r * 0.25);
    }
    const f = stormFlash(t);
    if (f > 0) { g.fillStyle(0xeef4ff, 0.35 * f); g.fillEllipse(px, py, r * 1.6, r * 0.6); }
  }
  // The Element's oven: the nichrome spiral glowing and breathing.
  if (inView(view, OVEN.x, OVEN.y, 80)) {
    const heat = 0.8 + Math.sin(t * 1.7) * 0.15 + Math.sin(t * 7.1) * 0.05;
    glow(g, OVEN.x, OVEN.y, 34 * heat, 0xff5a2a, 0.06, 4);
    g.lineStyle(3, mixC(0x8a1a0a, 0xffa04a, heat), 1);
    g.beginPath();
    for (let k = 0; k <= 60; k++) {
      const a = k * 0.42, r = 2 + k * 0.42;
      const px = OVEN.x + Math.cos(a) * r, py = OVEN.y - 4 + Math.sin(a) * r * 0.8;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    g.lineStyle(1, 0xffe0a0, 0.6 * heat);
    g.beginPath(); for (let k = 0; k <= 60; k++) { const a = k * 0.42, r = 2 + k * 0.42; const px = OVEN.x + Math.cos(a) * r, py = OVEN.y - 5 + Math.sin(a) * r * 0.8; if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.strokePath();
    for (let k = 0; k < 3; k++) { g.fillStyle(0x140806, 1); g.fillEllipse(OVEN.x - 14 + k * 14, OVEN.y + 16, 12, 6); }
  }
  // The Harbour Bank: the jars filling as the night goes on, then the bus-bar crackling.
  if (inView(view, 2420, 580, 140)) {
    const fill = (t % 9) / 9;
    for (const j of JARS) {
      g.fillStyle(GRID, 0.08 + fill * 0.22); g.fillRoundedRect(j.x - 10, j.y - 38, 20, 36, 5);
      glow(g, j.x, j.y - 56, 6 + fill * 6, ARC, 0.05, 2);
    }
    if (fill > 0.88) {
      const k = Math.floor(t * 20) % (JARS.length - 1);
      bolt(g, { x: JARS[k].x, y: JARS[k].y - 56 }, { x: JARS[k + 1].x, y: JARS[k + 1].y - 56 }, Math.floor(t * 20), 0.9, 1.5);
    }
  }
  // The cable eel in Gus's tank, its cells blinking down its length.
  if (inView(view, EEL_TANK.x, EEL_TANK.y, 60)) {
    for (let k = 0; k < 8; k++) {
      const ex = EEL_TANK.x - 26 + k * 7, ey = EEL_TANK.y + 4 + Math.sin(t * 2 + k * 0.7) * 5;
      g.fillStyle(0x0e1a20, 1); g.fillCircle(ex, ey, 3.4);
      const on = Math.sin(t * 6 - k * 0.9) > 0.3;
      if (on) { g.fillStyle(ARC, 0.9); g.fillCircle(ex, ey, 1.3); }
    }
    glow(g, EEL_TANK.x, EEL_TANK.y + 4, 22, ARC, 0.03, 3);
  }
}

/** Over actors: sparks crawling the wires, the storm striking the lighthouse, candles, the ship's lamps. */
function animateAbove(g: G, t: number, view: Rect, world: PainterWorld): void {
  const lampsLit = world.test(LAMPS_LIT);
  const gridCut = world.test(GRID_CUT);
  // Beads of current crawling along every span toward the Coil.
  SPANS.forEach(([a, b, sag], i) => {
    if (!inView(view, (a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2 + Math.abs(b.y - a.y) / 2 + 40)) return;
    for (let k = 0; k < 2; k++) {
      const f = (t * 0.32 + i * 0.137 + k * 0.5) % 1;
      const p = sagPt(a, b, sag, f);
      g.fillStyle(ARC, 0.25); g.fillCircle(p.x, p.y, 4.5);
      g.fillStyle(ARC_CORE, 0.95); g.fillCircle(p.x, p.y, 1.5);
    }
  });
  // Corona on the insulators: a faint violet fizz that flickers.
  for (const [, [px, py, ph]] of Object.entries(PYLONS)) {
    if (!inView(view, px, py - ph, 80)) continue;
    for (const tip of pylonTips(px, py, ph)) {
      const on = Math.sin(t * 17 + tip.x * 0.3) > 0.4;
      if (on) glow(g, tip.x, tip.y - 6, 8, 0xb8a8ff, 0.07, 2);
    }
  }
  // The storm: every flash finds the lighthouse rod, and runs down its strap to the rock.
  const f = stormFlash(t);
  if (f > 0 && inView(view, ROD_TIP.x, ROD_TIP.y + 200, 400)) {
    const seed = Math.floor(t / 5.3);
    bolt(g, { x: ROD_TIP.x + Math.sin(seed * 3.7) * 160, y: view.y - 20 }, ROD_TIP, seed, f, 3);
    glow(g, ROD_TIP.x, ROD_TIP.y, 40, ARC, 0.1 * f, 4);
    g.lineStyle(3, ARC_CORE, f); g.lineBetween(LH.x - 6, LH.y - LH.h - 22, LH.x - 6, LH.y - 26);
    glow(g, LH.x - 6, LH.y - 6, 30, ARC, 0.08 * f, 3);
  } else if (inView(view, ROD_TIP.x, ROD_TIP.y, 60)) {
    // Between strikes the ball fizzes: a St Elmo's crown.
    for (let k = 0; k < 5; k++) {
      const a = t * 4 + k * 1.3;
      g.lineStyle(1, 0xb8a8ff, 0.4 + Math.sin(t * 13 + k) * 0.3);
      g.lineBetween(ROD_TIP.x, ROD_TIP.y, ROD_TIP.x + Math.cos(a) * 12, ROD_TIP.y + Math.sin(a) * 9 - 4);
    }
  }
  // The lighthouse lamp. Lit by Wren: full oil, full lens — a broad warm beam, steady. Under the
  // Grid, its quarter-ration: a thin cold beam sweeping out over the sea, guttering. Between the
  // Grid's fall and the night of the lamps it stands dark.
  if (lampsLit && inView(view, LH.x + 300, LH.y - LH.h, 700)) {
    const a = t * 0.55;
    const sweep = Math.cos(a);
    const ly = LH.y - LH.h;
    if (sweep > 0) {
      const len = 900 * sweep;
      g.fillStyle(0xffd890, 0.1);
      g.fillTriangle(LH.x, ly, LH.x + len, ly - 20 + Math.sin(a) * 160, LH.x + len, ly + 150 + Math.sin(a) * 160);
      g.fillStyle(0xfff0c8, 0.08);
      g.fillTriangle(LH.x, ly, LH.x + len, ly + 30 + Math.sin(a) * 160, LH.x + len, ly + 100 + Math.sin(a) * 160);
    }
    flameGlow(g, LH.x, ly, 34, 0.12);
    g.fillStyle(0xfff0c8, 1); g.fillCircle(LH.x, ly, 4.5);
  } else if (!gridCut && inView(view, LH.x + 300, LH.y - LH.h, 500)) {
    const a = t * 0.7;
    const sweep = Math.cos(a);
    const gutter = 0.6 + 0.4 * Math.sin(t * 9.3) * Math.sin(t * 2.1);
    if (sweep > 0) {
      const len = 520 * sweep;
      const ly = LH.y - LH.h;
      g.fillStyle(BULB, 0.06 * gutter);
      g.fillTriangle(LH.x, ly, LH.x + len, ly + 40 + Math.sin(a) * 120, LH.x + len, ly + 90 + Math.sin(a) * 120);
    }
    glow(g, LH.x, LH.y - LH.h, 10 * gutter, BULB, 0.08, 3);
  }
  // Contraband candles in dark windows: a warm flicker nobody admits to.
  for (const c of CANDLES) {
    if (!inView(view, c.x, c.y, 40)) continue;
    const fl = 0.7 + Math.sin(t * 8 + c.x) * 0.2 + Math.sin(t * 21 + c.y) * 0.1;
    flameGlow(g, c.x, c.y, 12 * fl, 0.08);
    g.fillStyle(FLAME, 0.9); g.fillEllipse(c.x, c.y - 1, 2.6 * fl, 4.5 * fl);
  }
  // The ship's mast-head lamps and the riding light, swinging with the swell.
  if (inView(view, SHIP.x, SHIP.y - 200, 400)) {
    for (const mx of [SHIP.x - SHIP.len / 2 + 90, SHIP.x + 240]) {
      const sw = Math.sin(t * 0.9 + mx) * 3;
      glow(g, mx + sw, SHIP.y - 74 - 214, 10, 0xffe8b0, 0.08, 3);
      g.fillStyle(0xfff0d0, 1); g.fillCircle(mx + sw, SHIP.y - 74 - 214, 2.4);
    }
  }
  // Spray off the end of the pier when the swell hits it.
  if (inView(view, 1300, 1490, 80)) {
    const ph = (t * 0.45) % 1;
    if (ph < 0.35) {
      const q = ph / 0.35;
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.22;
        g.fillStyle(FOAM, 0.6 * (1 - q)); g.fillCircle(1300 + Math.cos(a) * q * 60, 1490 + Math.sin(a) * q * 70, 2.5);
      }
    }
  }
  // Wren's lamps: a flame in every head, a warm pool on the cobbles under it.
  if (lampsLit) for (const p of LAMPS) {
    if (!inView(view, p.x, p.y, 120)) continue;
    const fp = lampFlame(p.x, p.y);
    const fl = 0.85 + Math.sin(t * 7 + p.x) * 0.1 + Math.sin(t * 19 + p.y) * 0.05;
    g.fillStyle(0xffc870, 0.06); g.fillEllipse(p.x, p.y + 4, 120 * fl, 40 * fl);
    flameGlow(g, fp.x, fp.y, 22 * fl, 0.1);
    g.fillStyle(FLAME, 0.95); g.fillEllipse(fp.x, fp.y - 1, 3.4 * fl, 6 * fl);
    g.fillStyle(0xfff4d0, 1); g.fillEllipse(fp.x, fp.y, 1.4, 2.6);
  }
  // The lamps' dead wicks, in the flash, just visible.
  else if (f > 0.3) for (const p of LAMPS) {
    if (!inView(view, p.x, p.y, 100)) continue;
    const fp = lampFlame(p.x, p.y);
    g.fillStyle(0xeef4ff, 0.3 * f); g.fillRect(fp.x - 7, fp.y - 6, 14, 14);
  }
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1420, y: 1190 } },
  { kind: 'mooring', at: { x: 1300, y: 1462 }, isle: 'electricity' },
  { kind: 'water', id: 'terminus-sea-water', shape: { x: 0, y: SEA_Y, w: W, h: H - SEA_Y }, fishery: 'terminus-sea' },
  { kind: 'sign', at: { x: 1400, y: 136 }, text: 'NORTH — The Cableway, to the Dynamo Court. Prince Volt\'s generator hall. Do not touch the wires.' },
  { kind: 'sign', at: { x: 120, y: 690 }, text: 'WEST — The Bounce Court. Prince Sprocket\'s toy works. The street will throw you. Let it.' },
  { kind: 'sign', at: { x: 2480, y: 690 }, text: 'EAST — The Halflife Court. Prince Isotope\'s pits. Lead aprons sold at the gate. Buy one.' },
  { kind: 'sign', at: { x: 1390, y: 1280 }, text: 'TERMINUS LANDING. Hulls: M. Ferrule, at the slip. Tackle: Varnish & Line, east quay. Bread: The Element.' },
  { kind: 'sign', at: { x: 1060, y: 696 }, text: 'THE DRAW. Every household its quota, drawn at the Brownout Bell. Short houses shall be switched off.' },
  { kind: 'sign', at: { x: 300, y: 300 }, text: 'SEIZED by order of the Grid. Flame is theft. These ladders are the property of the Empress.' },
  { kind: 'sign', at: { x: 640, y: 1110 }, text: 'THE CABLE HOUSE. Landfall of the Great Cable. Trespassers will be earthed, in either sense.' },
  { kind: 'chest', id: 'terminus-chest-point', at: { x: 110, y: 1282 }, coins: 160, orbs: 1 },
  { kind: 'chest', id: 'terminus-chest-jetty', at: { x: 615, y: 1436 }, orbs: 2, coins: 70 },
  { kind: 'chest', id: 'terminus-chest-meterhouse', at: { x: 1140, y: 596 }, coins: 480, open: { monarch: 'ohmrine' } },
];

export const TERMINUS_AREA: AreaDef = {
  id: 'terminus',
  isle: 'electricity',
  name: 'Terminus',
  subtitle: 'Where the great cable comes ashore',
  w: W,
  h: H,
  bg: NIGHT,
  accent: GRID,
  weather: 'storm',
  spawn: { x: 1300, y: 1404 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids: [...solids, ...carve({ x: 0, y: SEA_Y, w: W, h: H - SEA_Y }, [PIER, JETTY])],
  exits: [
    { side: 'n', to: 'dynamo', label: 'The Cableway — the Dynamo Court' },
    { side: 'w', to: 'bounce', label: 'The Latex Road — the Bounce Court' },
    { side: 'e', to: 'halflife', label: 'The Lead Road — the Halflife Court' },
  ],
  pois: POIS,
  npcs: TERMINUS_NPCS,
  crowd: TERMINUS_CROWD,
};
