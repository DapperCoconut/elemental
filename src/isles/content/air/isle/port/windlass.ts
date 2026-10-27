import type { AreaDef, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, blob, dim, flagstones, glow, groundFill, lit, mixC, road, rock, shadow } from '../../../../art/IsleArt';
import { carve, inView } from '../../../water/isle/port/art';
import {
  AERION, AERION_DARK, BRASS, BRASS_DARK, BREATH, CANVAS, CLOUD, CLOUD_SHADE, FOAM, GRANITE, GRANITE_DARK, GRANITE_LIT,
  GUANO, IRON, KITE_COLS, LAMP, LICHEN, OVEN, QUAY, QUAY_DARK, ROPE, SEA, SEA_DEEP, SEA_SHALLOW, SETT, SETT_ALT,
  SETT_DARK, STRATA_A, STRATA_B, TIMBER, TIMBER_DARK, aerionSeal, bollard, bottleCrate, breathBottle, cliffHouse, gull,
  gullSitting, hawser, kite, kiteStall, lampLight, lobsterPot, meterDial, poly, seaStair, windLamp,
} from './art';
import { WINDLASS_CROWD, WINDLASS_NPCS } from './people';

/**
 * Windlass — the cliff harbour at the foot of Highspire, and where every crossing to the Air Isle
 * makes landfall.
 *
 * The spire comes straight up out of the sea here as one wall of banded granite, and the cloud
 * hangs across its face a long stone's throw up: the cloud line. Below it the air is free; above
 * it every breath is the King's. Windlass is the strip of shelf between the cliff's foot and the
 * water — the only town on Highspire that lives entirely below the line.
 *
 * The north of the map is the cliff itself. Houses are quarried into its foot — doors and windows
 * cut in the rock, washing strung across the faces. Two ways go up: the Hundred Turns, a switchback
 * stair hewn up a cleft in the middle (the road to the Galeward Court), and the Lift: a cage that
 * runs on iron rails up the face to a headframe poking out of the cloud, hauled by the great
 * windlass on its ledge and the treadwheel of twenty men beside it. Below the landing is the Lift
 * Yard, and on its east side the Meter House, where everybody going up is fitted.
 *
 * West of the Turns is the kite market, the stalls roped to stone weights against the wind and
 * their stock flying overhead on long lines; past it the Gull Post. The roads run out west to the
 * Fable Court and east to the Orbit Court. South is the waterfront — big dressed blocks, bollards,
 * sea stairs — the South Quay running out to the moorings, and the Gull Mole east where the herring
 * are. You land at the end of the South Quay, and the first thing you see is the cliff, going up
 * into the cloud, and a cage climbing it.
 */

const W = 2600;
const H = 1500;
/** The foot of the cliff — everything north of this is rock. */
const CLIFF_Y = 400;
/** The cleft the Hundred Turns climbs. */
const STAIR_X0 = 1220;
const STAIR_X1 = 1380;
/** Where the shelf ends and the dressed quay begins, and where the sea begins. */
const QUAY_Y = 1060;
const SEA_Y = 1262;

/** Walkable stone over the sea — shared by the painter and the solids. */
const SOUTH_QUAY: Rect = { x: 1160, y: 1250, w: 120, h: 250 };
const GULL_MOLE: Rect = { x: 2020, y: 1250, w: 84, h: 200 };

/** The lift: rails, the landing at the foot, the headframe in the cloud, the windlass on its ledge. */
const LIFT_X = 1850;
const LIFT_TOP = 70;
const LIFT_FOOT = 392;
const DRUM = { x: 1560, y: 292 };
const WHEEL = { x: 1700, y: 282, r: 62 };
const SHEAVE = { x: LIFT_X, y: 26 };

/** The Meter House on the east of the Lift Yard: base line and its great dial. */
const METER = { x: 2230, y: 650 };
const METER_DIAL = { x: 2230, y: 500, r: 34 };

/** Kite stalls: [x, base y, width, stripe a, stripe b]. Each flies a kite on a long line. */
const STALLS: [number, number, number, number, number][] = [
  [330, 620, 130, 0xe85a4a, 0xf4f0e0], [540, 620, 140, 0x4ab0d8, 0xf4f0e0], [770, 620, 170, 0xf0c040, 0xe85a4a],
  [990, 620, 150, 0x7ac85a, 0xf4f0e0], [420, 880, 140, 0xc85ab0, 0xf4f0e0], [640, 880, 130, 0x5a6ad8, 0xf0c040],
];

/** Rock-cut houses in the cliff foot: [x, width, height, door, trim, washing, balcony, chime]. */
const CLIFF_HOUSES: [number, number, number, number, number, boolean, boolean, boolean][] = [
  [160, 150, 110, 0x3a6a8a, 0xe85a4a, true, false, true],
  [470, 170, 130, 0x6a4a3a, 0x4ab0d8, false, true, false],
  [760, 150, 104, 0x4a7a5a, 0xf0c040, true, false, false],
  [1060, 160, 120, 0x8a3a3a, 0xf4f0e0, false, true, true],
  [2050, 150, 108, 0x3a4a8a, 0xf08a3a, true, false, false],
  [2300, 170, 126, 0x5a6a3a, 0xc85ab0, false, true, true],
  [2520, 140, 100, 0x7a5a3a, 0x4ab0d8, true, false, false],
];

// ── Ground ───────────────────────────────────────────────────────────

/** A deterministic shade for a stratum, so bands stay one colour along their length. */
const stratum = (i: number): number => [STRATA_A, STRATA_B, GRANITE, STRATA_B, mixC(STRATA_A, 0x8a7a68, 0.25)][((i % 5) + 5) % 5];

function paintCliff(g: G, rng: () => number): void {
  // The banded face: strata running across, folding gently, darker toward the foot.
  for (let x = 0; x < W; x += 40) {
    if (x + 40 > STAIR_X0 && x < STAIR_X1) continue;
    for (let y = 0; y < CLIFF_Y; y += 4) {
      const fold = Math.sin(x / 310) * 18 + Math.sin(x / 97) * 6;
      const band = Math.floor((y + fold) / 24);
      g.fillStyle(mixC(stratum(band), 0x30343a, Math.max(0, (y - 260) / 380)), 1);
      g.fillRect(x, y, 40, 4);
    }
  }
  // Faults and joints: jagged vertical cracks, and the pale quartz veins that cross them.
  for (let i = 0; i < 70; i++) {
    let x = rng() * W;
    if (x > STAIR_X0 - 20 && x < STAIR_X1 + 20) continue;
    let y = 40 + rng() * 120;
    g.lineStyle(1.5 + rng() * 1.5, GRANITE_DARK, 0.7);
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += (rng() - 0.5) * 16; y += 20 + rng() * 34; if (y > CLIFF_Y) break; g.lineTo(x, y); }
    g.strokePath();
  }
  for (let i = 0; i < 18; i++) {
    const x = rng() * W, y = 80 + rng() * 260;
    if (x > STAIR_X0 - 30 && x < STAIR_X1 + 30) continue;
    g.lineStyle(2, 0xe4e4dc, 0.35); g.lineBetween(x, y, x + 60 + rng() * 80, y + (rng() - 0.5) * 30);
  }
  // Ledges: three long shelves of harder rock, gull-white along every lip.
  for (const [ly, x0, x1] of [[118, 0, W], [196, 0, W], [338, 0, 1460]] as [number, number, number][]) {
    for (let x = x0; x < x1; x += 6) {
      if (x > STAIR_X0 - 4 && x < STAIR_X1 + 4) continue;
      const yy = ly + Math.sin(x / 140) * 6;
      g.fillStyle(GRANITE_LIT, 0.9); g.fillRect(x, yy, 6, 3);
      g.fillStyle(GRANITE_DARK, 0.5); g.fillRect(x, yy + 3, 6, 4);
      if (rng() < 0.45) { g.fillStyle(GUANO, 0.75); g.fillRect(x + rng() * 4, yy + 3, 1.5 + rng(), 4 + rng() * 16); }
    }
  }
  // Lichen in yolk-yellow rosettes and grey crusts.
  for (let i = 0; i < 160; i++) {
    const x = rng() * W, y = 70 + rng() * (CLIFF_Y - 90);
    if (x > STAIR_X0 - 10 && x < STAIR_X1 + 10) continue;
    g.fillStyle(rng() < 0.6 ? LICHEN : 0xb8bcae, 0.35 + rng() * 0.3);
    g.fillEllipse(x, y, 6 + rng() * 16, 4 + rng() * 6);
  }
  // Nests on the ledges, and the gulls that own them.
  for (const [nx, ny, f] of [[260, 118, 1], [640, 196, -1], [900, 118, 1], [1120, 196, 1], [2040, 196, -1], [2200, 118, 1], [2420, 196, -1], [2560, 118, -1], [380, 338, 1], [980, 338, -1]] as [number, number, number][]) {
    const yy = ny + Math.sin(nx / 140) * 6;
    g.fillStyle(0x8a7a5a, 1); g.fillEllipse(nx, yy + 1, 18, 5);
    gullSitting(g, nx + 2, yy, 10, f);
  }
  // The cloud line: the top of the face lost in a bank of cloud (it also drifts, animated, over this).
  for (let x = -40; x < W + 40; x += 26) {
    const h = 40 + Math.sin(x / 120) * 14 + rng() * 10;
    g.fillStyle(CLOUD_SHADE, 0.85); g.fillEllipse(x, h, 70 + rng() * 40, 34 + rng() * 14);
    g.fillStyle(CLOUD, 0.95); g.fillEllipse(x - 4, h - 8, 62 + rng() * 30, 28 + rng() * 10);
  }
  g.fillStyle(CLOUD, 1); g.fillRect(0, 0, W, 24);

  // ── The Hundred Turns: a cleft cut back into the face, the stair zig-zagging up it.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(STAIR_X0, 0, STAIR_X1 - STAIR_X0, CLIFF_Y);
  g.fillStyle(dim(GRANITE, 0.3), 1); g.fillRect(STAIR_X0 + 14, 0, STAIR_X1 - STAIR_X0 - 28, CLIFF_Y);
  // The cleft's walls catching the light on the west side only.
  g.fillStyle(lit(GRANITE, 0.1), 1); g.fillRect(STAIR_X0 + 14, 0, 6, CLIFF_Y);
  // Flights: steps across the whole cut, each flight's landing at alternate ends.
  const FLIGHT = 50;
  for (let f = 0; f * FLIGHT < CLIFF_Y; f++) {
    const y0 = CLIFF_Y - (f + 1) * FLIGHT;
    for (let s = 0; s < FLIGHT; s += 6) {
      const y = y0 + s;
      if (y < 0) continue;
      g.fillStyle(mixC(GRANITE, 0x000000, 0.12 + (s / FLIGHT) * 0.2), 1); g.fillRect(STAIR_X0 + 20, y, STAIR_X1 - STAIR_X0 - 40, 5);
      g.fillStyle(lit(GRANITE, 0.2), 0.7); g.fillRect(STAIR_X0 + 20, y, STAIR_X1 - STAIR_X0 - 40, 1);
    }
    // The landing at this flight's turn: a worn flat slab.
    const lx = f % 2 ? STAIR_X0 + 22 : STAIR_X1 - 62;
    g.fillStyle(lit(GRANITE, 0.12), 1); g.fillRect(lx, y0 + 2, 40, 12);
  }
  // The rope handrail zig-zagging from landing to landing on iron posts.
  g.lineStyle(2, ROPE, 0.9);
  g.beginPath();
  for (let f = 0; f * FLIGHT <= CLIFF_Y; f++) {
    const y = CLIFF_Y - f * FLIGHT;
    const x = f % 2 ? STAIR_X0 + 30 : STAIR_X1 - 30;
    if (f === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  for (let f = 0; f * FLIGHT <= CLIFF_Y; f++) {
    const y = CLIFF_Y - f * FLIGHT, x = f % 2 ? STAIR_X0 + 30 : STAIR_X1 - 30;
    g.fillStyle(IRON, 1); g.fillRect(x - 1.5, y - 10, 3, 10);
  }
  // A cut mile-mark at the stair foot: "C" for the cloud, and a count of the turns.
  g.fillStyle(GRANITE_LIT, 1); g.fillRect(STAIR_X1 - 8, CLIFF_Y - 70, 4, 60);
  for (let k = 0; k < 10; k++) { g.fillStyle(GRANITE_DARK, 1); g.fillRect(STAIR_X1 - 10, CLIFF_Y - 66 + k * 6, 8, 1.5); }

  // ── The Lift Ledge: cut back into the face, the windlass and its treadwheel standing on it.
  g.fillStyle(dim(GRANITE, 0.45), 1); g.fillRect(1470, 210, 330, 110);
  g.fillStyle(dim(GRANITE, 0.3), 1); g.fillRect(1470, 300, 330, 22);
  g.fillStyle(lit(GRANITE, 0.15), 1); g.fillRect(1470, 300, 330, 3);
  // Chisel marks on the back wall of the ledge.
  for (let i = 0; i < 40; i++) { g.lineStyle(1, GRANITE_DARK, 0.5); const cx = 1476 + rng() * 318, cy = 214 + rng() * 80; g.lineBetween(cx, cy, cx + 6, cy + 3); }
  // The drum: a great wooden barrel turned on its side between two granite cheeks, rope wound on it.
  for (const cx of [DRUM.x - 62, DRUM.x + 62]) {
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(cx - 12, DRUM.y - 54, 24, 64);
    g.fillStyle(GRANITE, 1); g.fillRect(cx - 10, DRUM.y - 52, 20, 60);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(DRUM.x - 52, DRUM.y - 44, 104, 46, 10);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(DRUM.x - 50, DRUM.y - 42, 100, 42, 9);
  for (let k = 0; k < 16; k++) { g.lineStyle(2.5, k % 2 ? ROPE : dim(ROPE, 0.2), 1); g.lineBetween(DRUM.x - 46 + k * 6, DRUM.y - 40, DRUM.x - 44 + k * 6, DRUM.y - 2); }
  g.fillStyle(IRON, 1); g.fillRect(DRUM.x - 52, DRUM.y - 44, 4, 46); g.fillRect(DRUM.x + 48, DRUM.y - 44, 4, 46);
  // The treadwheel's axle-frame (the wheel itself turns, animated over the top).
  g.fillStyle(TIMBER_DARK, 1);
  g.fillRect(WHEEL.x - WHEEL.r - 8, WHEEL.y + WHEEL.r - 6, WHEEL.r * 2 + 16, 10);
  for (const s of [-1, 1]) { g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(WHEEL.x + s * (WHEEL.r - 10), WHEEL.y + WHEEL.r, WHEEL.x, WHEEL.y); }
  // A timber rail along the ledge's lip.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(1470, 318, 330, 4);
  for (let x = 1474; x < 1800; x += 24) g.fillRect(x, 304, 3, 16);
  g.fillRect(1470, 302, 330, 3);

  // ── The lift rails, down the face from the cloud to the landing.
  for (const rx of [LIFT_X - 22, LIFT_X + 22]) {
    g.fillStyle(IRON, 1); g.fillRect(rx - 3, LIFT_TOP - 30, 6, LIFT_FOOT - LIFT_TOP + 40);
    g.fillStyle(lit(IRON, 0.35), 1); g.fillRect(rx - 3, LIFT_TOP - 30, 1.5, LIFT_FOOT - LIFT_TOP + 40);
    for (let y = LIFT_TOP - 20; y < LIFT_FOOT; y += 26) { g.fillStyle(dim(IRON, 0.3), 1); g.fillRect(rx - 6, y, 12, 4); g.fillStyle(0x8a5a3a, 0.5); g.fillRect(rx - 6, y + 4, 12, 3); }
  }
  // Rust weeping down the rock under every rail-bracket.
  for (let y = LIFT_TOP; y < LIFT_FOOT; y += 26) for (const rx of [LIFT_X - 22, LIFT_X + 22]) { g.fillStyle(0x8a5a3a, 0.25); g.fillRect(rx - 2, y + 6, 4, 14); }

  // ── Houses cut into the cliff foot.
  for (const [x, w, h, door, trim, washing, balcony, chime] of CLIFF_HOUSES) {
    cliffHouse(g, x, CLIFF_Y, w, h, { door, trim, washing, balcony, chime }, rng);
  }
  // The contact shadow along the foot, then scree spilling out onto the shelf.
  g.fillStyle(0x000000, 0.22); g.fillRect(0, CLIFF_Y - 6, W, 8);
  for (let i = 0; i < 140; i++) {
    const x = rng() * W;
    if (x > STAIR_X0 && x < STAIR_X1) continue;
    g.fillStyle(rng() < 0.5 ? GRANITE : STRATA_A, 0.85);
    g.fillEllipse(x, CLIFF_Y + 4 + rng() * 22, 4 + rng() * 9, 3 + rng() * 4);
  }
}

function paintGround(g: G, rng: () => number): void {
  // The shelf: thin sea-turf over granite, grey-green, cushions of thrift in it.
  groundFill(g, { x: 0, y: 0, w: W, h: SEA_Y }, 0x6a7864, 0x5e6c5a, 0xa8b098, rng, 1.1);
  for (let i = 0; i < 70; i++) blob(g, rng() * W, CLIFF_Y + 40 + rng() * (QUAY_Y - CLIFF_Y - 60), 30 + rng() * 60, 14 + rng() * 24, 0x7a7e78, 0.4, rng);
  // Bare granite showing through the turf in whale-backed slabs.
  for (let i = 0; i < 26; i++) {
    const x = rng() * W, y = CLIFF_Y + 60 + rng() * (QUAY_Y - CLIFF_Y - 100);
    blob(g, x, y, 34 + rng() * 50, 14 + rng() * 18, GRANITE, 0.75, rng);
    g.fillStyle(GRANITE_LIT, 0.35); g.fillEllipse(x - 8, y - 5, 30, 6);
  }
  // Thrift — sea-pinks — in little cushions everywhere the wind lets them.
  for (let i = 0; i < 260; i++) {
    const x = rng() * W, y = CLIFF_Y + 30 + rng() * (QUAY_Y - CLIFF_Y - 40);
    g.fillStyle(0x4e6a44, 0.85); g.fillEllipse(x, y, 9, 5);
    for (let k = 0; k < 3; k++) { g.fillStyle(rng() < 0.7 ? 0xe8a0c0 : 0xf4d0e0, 1); g.fillCircle(x - 3 + k * 3, y - 3 - (k % 2) * 1.5, 1.6); }
  }

  paintCliff(g, rng);

  // ── Streets: granite setts, kerbed, worn lighter down the middle.
  const street = (pts: { x: number; y: number }[], w: number): void => {
    road(g, pts, w, SETT, SETT_DARK, SETT_ALT, rng);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      g.lineStyle(w * 0.35, lit(SETT, 0.12), 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
    }
  };
  street([{ x: 0, y: 750 }, { x: 300, y: 752 }, { x: 700, y: 756 }, { x: 1100, y: 750 }, { x: 1300, y: 712 }], 70);
  street([{ x: W, y: 750 }, { x: 2300, y: 756 }, { x: 1960, y: 742 }, { x: 1700, y: 712 }], 70);
  street([{ x: 1300, y: CLIFF_Y }, { x: 1300, y: 712 }, { x: 1262, y: 900 }, { x: 1230, y: QUAY_Y + 10 }], 62);
  street([{ x: 60, y: 452 }, { x: 600, y: 456 }, { x: STAIR_X0 + 20, y: 450 }], 40);
  street([{ x: STAIR_X1 - 20, y: 450 }, { x: 2100, y: 456 }, { x: W - 60, y: 452 }], 40);
  street([{ x: 540, y: 760 }, { x: 530, y: 960 }, { x: 320, y: QUAY_Y + 10 }], 34);
  street([{ x: 2350, y: 760 }, { x: 2380, y: 900 }, { x: 2400, y: QUAY_Y + 10 }], 34);
  street([{ x: 1700, y: 712 }, { x: 1760, y: 900 }, { x: 1800, y: QUAY_Y + 10 }], 34);

  // ── The Lift Yard: big flags in front of the landing and the Meter House, the King's seal laid in.
  flagstones(g, { x: 1390, y: 430, w: 690, h: 290 }, 44, mixC(GRANITE, 0x8a8478, 0.3), SETT_DARK, rng);
  g.lineStyle(4, GRANITE_DARK, 1); g.strokeRect(1390, 430, 690, 290);
  // The queue-line, painted white on the flags from the landing to the Meter House door, worn half away.
  for (let k = 0; k < 18; k++) {
    const t = k / 18;
    const x = 1860 + (2230 - 1860) * t, y = 460 + (690 - 460) * t;
    g.fillStyle(0xf0ece0, 0.35 + rng() * 0.2); g.fillRect(x - 6, y - 2, 12, 4);
  }
  aerionSeal(g, 1640, 600, 34, 0x3a4048, 0.35);
  aerionSeal(g, 1640, 600, 30, AERION_DARK, 0.3);
  g.lineStyle(2, BRASS, 0.3); g.strokeCircle(1640, 600, 50);
  // The cargo-trolley tracks from the landing down to the quay.
  for (const off of [-12, 12]) {
    g.lineStyle(3, IRON, 0.9);
    g.beginPath(); g.moveTo(LIFT_X + off, LIFT_FOOT + 30); g.lineTo(LIFT_X + off - 20, 720); g.lineTo(1800 + off, QUAY_Y); g.strokePath();
  }

  // ── The waterfront: dressed blocks, salt-bleached, iron rings let into the coping.
  flagstones(g, { x: 0, y: QUAY_Y, w: W, h: SEA_Y - QUAY_Y }, 48, QUAY, QUAY_DARK, rng);
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, QUAY_Y - 6, W, 8);
  g.fillStyle(lit(GRANITE, 0.15), 1); g.fillRect(0, QUAY_Y - 6, W, 2);
  // Salt crusting in the joints and rope-scars across the blocks.
  for (let i = 0; i < 300; i++) { g.fillStyle(0xf4f2ea, 0.25); g.fillRect(rng() * W, QUAY_Y + rng() * (SEA_Y - QUAY_Y), 2 + rng() * 6, 1.5); }

  // ── The sea: shallow over the drowned ledges, then the cold deep.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 60, W, H - SEA_Y - 60);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 160, W, H - SEA_Y - 160);
  // The drowned ledges: the cliff going on down under the water, dark shelves with kelp over them.
  for (let k = 0; k < 8; k++) {
    const x0 = 60 + k * 330 + rng() * 80;
    g.fillStyle(0x16384a, 0.5);
    poly(g, [[x0, SEA_Y + 30], [x0 + 180 + rng() * 60, SEA_Y + 34], [x0 + 150, SEA_Y + 90 + rng() * 30], [x0 + 20, SEA_Y + 80]], 0x16384a, 0.5);
    for (let s = 0; s < 6; s++) { g.lineStyle(2, 0x2a5a3a, 0.5); const kx = x0 + 20 + s * 26; g.lineBetween(kx, SEA_Y + 40, kx + Math.sin(s) * 8, SEA_Y + 70); }
  }
  for (let i = 0; i < 180; i++) {
    g.fillStyle(lit(SEA, 0.14), 0.18);
    g.fillEllipse(rng() * W, SEA_Y + 24 + rng() * (H - SEA_Y - 24), 30 + rng() * 90, 3 + rng() * 3);
  }

  // ── The quay edge: coping, rings, and sea stairs down to the water.
  for (let x = 0; x < W; x += 60) {
    g.fillStyle(QUAY_DARK, 1); g.fillRect(x, SEA_Y - 10, 58, 16);
    g.fillStyle(lit(QUAY, 0.06), 1); g.fillRect(x + 1, SEA_Y - 10, 56, 10);
    g.fillStyle(lit(QUAY, 0.2), 1); g.fillRect(x + 1, SEA_Y - 10, 56, 2);
  }
  for (let x = 40; x < W; x += 160) { g.lineStyle(2, IRON, 1); g.strokeCircle(x, SEA_Y + 6, 5); }
  for (const sx of [600, 1640, 2420]) seaStair(g, sx, SEA_Y - 2, 46, 6);
  // Weed and barnacle line along the quay foot.
  g.fillStyle(0x2a4a3a, 0.7); g.fillRect(0, SEA_Y + 6, W, 5);

  // ── The South Quay and the Gull Mole: block-built, running out into the sea.
  for (const r of [SOUTH_QUAY, GULL_MOLE]) {
    g.fillStyle(0x0a1a24, 0.4); g.fillRect(r.x + 10, r.y + 14, r.w, r.h);
    g.fillStyle(QUAY_DARK, 1); g.fillRect(r.x - 4, r.y, r.w + 8, r.h + 4);
    flagstones(g, { x: r.x, y: r.y, w: r.w, h: r.h - 6 }, 40, QUAY, QUAY_DARK, rng);
    g.fillStyle(lit(QUAY, 0.2), 1); g.fillRect(r.x - 4, r.y, 4, r.h); g.fillRect(r.x + r.w, r.y, 4, r.h);
    for (let y = r.y + 30; y < r.y + r.h - 10; y += 70) { g.lineStyle(2, IRON, 1); g.strokeCircle(r.x - 6, y, 4); g.strokeCircle(r.x + r.w + 6, y + 30, 4); }
    g.fillStyle(0x2a4a3a, 0.6); g.fillRect(r.x - 4, r.y + 20, 3, r.h - 20); g.fillRect(r.x + r.w + 1, r.y + 20, 3, r.h - 20);
  }
  // The mooring berth at the end of the South Quay: a painted ring and a worn step.
  g.lineStyle(2, AERION, 0.35); g.strokeCircle(SOUTH_QUAY.x + SOUTH_QUAY.w / 2, H - 40, 26);
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

// The kite market's stalls.
for (const [x, y, w, a, b] of STALLS) {
  pieces.push({ x, y, w: w + 70, h: 130, draw: (g, rng) => kiteStall(g, x, y, w, a, b, rng) });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 30, w, h: 30 });
}
// Wren's stall gets a frame-bench beside it: half-built kites, spars and a pot of glue.
pieces.push({
  x: 890, y: 640, w: 60, h: 60, draw: (g) => {
    shadow(g, 890, 642, 50, 10);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(868, 614, 44, 6); g.fillRect(870, 620, 4, 20); g.fillRect(906, 620, 4, 20);
    g.lineStyle(2, 0xd8c8a0, 1); g.lineBetween(872, 612, 904, 590); g.lineBetween(880, 596, 900, 612);
    g.fillStyle(0x6a5a3a, 1); g.fillRect(900, 604, 8, 10);
    g.fillStyle(0xe8e0c8, 1); g.fillEllipse(904, 604, 8, 3);
  },
});
solids.push({ kind: 'rect', x: 866, y: 618, w: 48, h: 22 });

// The Rising Loaf: a round stone bakehouse, a beehive oven bulging out of its side, a tall chimney.
pieces.push({
  x: 1000, y: 960, w: 280, h: 260, draw: (g, rng) => {
    shadow(g, 1000, 964, 260, 30, 0.38);
    // The oven: a dome of brick on the east side, fire-mouth glowing.
    g.fillStyle(0x6a3a2a, 1); g.fillEllipse(1094, 940, 92, 70);
    g.fillStyle(0x9a5a3a, 1); g.fillEllipse(1094, 936, 84, 62);
    for (let k = 0; k < 4; k++) { g.lineStyle(1, 0x6a3a2a, 0.7); g.beginPath(); g.arc(1094, 960, 22 + k * 10, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath(); }
    g.fillStyle(0x1a0e08, 1); g.fillEllipse(1100, 950, 34, 22);
    g.fillStyle(OVEN, 0.9); g.fillEllipse(1100, 952, 26, 15);
    g.fillStyle(0xffe0a0, 0.9); g.fillEllipse(1100, 956, 14, 6);
    // The house: a squat round tower of granite, conical slate roof.
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(912, 822, 156, 140);
    g.fillStyle(lit(GRANITE, 0.05), 1); g.fillRect(916, 824, 148, 138);
    for (let row = 0; row < 9; row++) {
      for (let k = 0; k < 7; k++) {
        const bx = 918 + k * 21 + (row % 2) * 10, by = 828 + row * 15;
        if (bx > 1058) continue;
        g.fillStyle(mixC(GRANITE, rng() < 0.5 ? 0xffffff : 0x000000, rng() * 0.12), 1); g.fillRoundedRect(bx, by, 19, 13, 3);
      }
    }
    g.fillStyle(0x3a4048, 1); g.fillTriangle(900, 826, 1080, 826, 990, 728);
    g.fillStyle(0x4a5058, 1); g.fillTriangle(908, 822, 1072, 822, 990, 736);
    for (let k = 1; k < 6; k++) { g.lineStyle(1.5, 0x5a6068, 1); const t = k / 6; g.lineBetween(990 - 82 * (1 - t), 822 - 86 * t, 990 + 82 * (1 - t), 822 - 86 * t); }
    // Storm-ropes over the roof, pinned with stone weights — even the bakery is tied down.
    for (const s of [-1, 1]) { g.lineStyle(2, ROPE, 1); g.lineBetween(990, 740, 990 + s * 92, 900); g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(990 + s * 92 - 7, 896, 14, 12, 3); }
    // The chimney: tall, so the smoke clears the cliff's downdraught.
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(1030, 690, 26, 120);
    g.fillStyle(GRANITE, 1); g.fillRect(1032, 690, 20, 120);
    g.fillStyle(0x2a2e34, 1); g.fillRect(1026, 684, 34, 10);
    // Door and a bow window full of loaves rising in their tins.
    g.fillStyle(0x3a2a1a, 1); g.fillRoundedRect(978, 916, 30, 46, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(0xc87a4a, 1); g.fillRoundedRect(981, 919, 24, 43, { tl: 11, tr: 11, bl: 0, br: 0 });
    g.fillStyle(LAMP, 0.15); g.fillCircle(944, 890, 30);
    g.fillStyle(0x2a2420, 1); g.fillRoundedRect(918, 868, 52, 42, 6);
    g.fillStyle(LAMP, 0.9); g.fillRoundedRect(921, 871, 46, 36, 5);
    for (let k = 0; k < 3; k++) {
      const lx = 930 + k * 14;
      g.fillStyle(0x5a5a5a, 1); g.fillRect(lx - 5, 896, 10, 8);
      g.fillStyle(0xd89a5a, 1); g.fillEllipse(lx, 893 - k * 2, 12, 12 + k * 3);
      g.fillStyle(0xf0c890, 1); g.fillEllipse(lx - 1, 890 - k * 3, 7, 5);
    }
    // The sign: a loaf with a pair of gull's wings.
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(890, 960, 890, 852); g.lineBetween(890, 856, 922, 856);
    g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(892, 860, 58, 32, 6);
    g.fillStyle(0xd89a5a, 1); g.fillEllipse(921, 878, 26, 14);
    g.fillStyle(0xf0c890, 1); g.fillEllipse(920, 875, 16, 6);
    g.fillStyle(0xf4f4f0, 1); g.fillTriangle(908, 876, 896, 866, 904, 880); g.fillTriangle(934, 876, 946, 866, 938, 880);
  },
});
solids.push({ kind: 'rect', x: 905, y: 930, w: 170, h: 32 }, { kind: 'circle', x: 1100, y: 945, r: 30 });

// The Lee Side: a long low store built into the lee of the Great Boulder, its door that will not shut.
pieces.push({
  x: 2150, y: 960, w: 340, h: 200, draw: (g, rng) => {
    shadow(g, 2160, 964, 330, 30, 0.38);
    // The Great Boulder, east, that the whole shop sheltered behind.
    rock(g, 2300, 966, 70, 0x7a8088, rng);
    g.fillStyle(LICHEN, 0.5); g.fillEllipse(2290, 920, 40, 12); g.fillEllipse(2320, 940, 20, 8);
    for (let k = 0; k < 8; k++) { g.fillStyle(GUANO, 0.6); g.fillRect(2270 + k * 9, 908 + (k % 3) * 3, 2, 10 + (k % 4) * 3); }
    // The store: stone walls, a turf roof held on with nets and stones.
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(2030, 872, 236, 92);
    g.fillStyle(0x8a8478, 1); g.fillRect(2034, 874, 228, 88);
    for (let i = 0; i < 46; i++) { g.fillStyle(rng() < 0.5 ? 0x7a7468 : 0x9a948a, 0.8); g.fillRoundedRect(2036 + rng() * 210, 878 + rng() * 76, 12 + rng() * 10, 7, 2); }
    g.fillStyle(0x4e6a44, 1); g.fillRoundedRect(2022, 846, 252, 34, 14);
    g.fillStyle(0x6a8a5a, 1); g.fillRoundedRect(2026, 842, 244, 26, 12);
    for (let k = 0; k < 10; k++) { g.fillStyle(0xe8a0c0, 0.9); g.fillCircle(2040 + k * 24 + rng() * 8, 846 + rng() * 6, 2); }
    g.lineStyle(1, ROPE, 0.8); for (let k = 0; k < 7; k++) g.lineBetween(2030 + k * 38, 842, 2040 + k * 38, 880);
    for (const sx of [2034, 2112, 2190, 2262]) { g.fillStyle(GRANITE, 1); g.fillRoundedRect(sx - 7, 876, 14, 12, 3); }
    // The door, swung half open on its strap — it never shuts — light spilling out.
    g.fillStyle(0x2a2016, 1); g.fillRect(2134, 918, 32, 44);
    g.fillStyle(LAMP, 0.8); g.fillRect(2136, 920, 28, 42);
    poly(g, [[2134, 918], [2118, 924], [2118, 962], [2134, 962]], 0x6a4a8a);
    g.lineStyle(1, 0x3a2a4a, 1); g.lineBetween(2118, 940, 2134, 940);
    // Windows with wares: a weathercock, a kite, a bottle.
    for (const [wx, i] of [[2070, 0], [2210, 1]] as [number, number][]) {
      g.fillStyle(0x2a2420, 1); g.fillRect(wx - 22, 896, 44, 30);
      g.fillStyle(LAMP, 0.85); g.fillRect(wx - 20, 898, 40, 26);
      if (i === 0) { kite(g, wx - 8, 910, 6, 0.2, 0xe85a4a, 0xf4f0e0); breathBottle(g, wx + 10, 920, 4); }
      else { g.lineStyle(1, IRON, 1); g.lineBetween(wx, 920, wx, 904); g.fillStyle(0xc8c0a8, 1); g.fillTriangle(wx - 10, 904, wx + 10, 902, wx - 10, 900); g.fillStyle(BRASS, 1); g.fillCircle(wx - 2, 899, 3); }
    }
    // Sign: a limp windsock on a pole — the joke being that it never fills here.
    g.fillStyle(IRON, 1); g.fillRect(2028, 810, 3, 66);
    poly(g, [[2031, 812], [2052, 816], [2050, 840], [2034, 832]], 0xf08a3a);
    g.fillStyle(0xf4f0e0, 1); poly(g, [[2036, 813], [2042, 814], [2041, 836], [2036, 834]], 0xf4f0e0);
  },
});
solids.push({ kind: 'rect', x: 2030, y: 930, w: 236, h: 34 }, { kind: 'circle', x: 2300, y: 950, r: 52 });

// The Meter House: granite below, a brass-plated front above, the great dial over the door,
// and the bellows on the roof that test every meter by blowing through it.
pieces.push({
  x: METER.x, y: METER.y, w: 320, h: 300, draw: (g, rng) => {
    const x = METER.x, y = METER.y;
    shadow(g, x, y + 4, 300, 30, 0.4);
    // Granite plinth storey.
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - 134, y - 90, 268, 92);
    g.fillStyle(GRANITE, 1); g.fillRect(x - 130, y - 88, 260, 88);
    for (let row = 0; row < 5; row++) for (let k = 0; k < 9; k++) {
      g.fillStyle(mixC(GRANITE, rng() < 0.5 ? 0xffffff : 0x000000, rng() * 0.1), 1);
      g.fillRect(x - 128 + k * 29 + (row % 2) * 14, y - 86 + row * 17, 27, 15);
    }
    // The brass storey: riveted plates, gone green at the seams.
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 124, y - 210, 248, 124);
    g.fillStyle(BRASS, 1); g.fillRect(x - 120, y - 208, 240, 120);
    for (let k = 0; k < 6; k++) {
      g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(x - 120 + k * 48, y - 208, x - 120 + k * 48, y - 88);
      for (let r = 0; r < 7; r++) { g.fillStyle(lit(BRASS, 0.3), 1); g.fillCircle(x - 116 + k * 48, y - 200 + r * 17, 1.4); }
      g.fillStyle(0x5a9a7a, 0.4); g.fillRect(x - 121 + k * 48, y - 160, 3, 50);
    }
    g.fillStyle(lit(BRASS, 0.3), 0.8); g.fillRect(x - 120, y - 208, 240, 4);
    // The roof: a flat leaded top, and the testing-bellows on it (they breathe, animated).
    g.fillStyle(0x3a4048, 1); g.fillRect(x - 132, y - 222, 264, 14);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 60, y - 250, 60, 28);
    // The great dial's housing (the face and needle are animated).
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(METER_DIAL.x, METER_DIAL.y, METER_DIAL.r + 10);
    aerionSeal(g, x, y - 106, 10, AERION_DARK, 1);
    // Narrow windows in the brass, lit, each with a meter on a bench inside.
    for (const s of [-1, 1]) {
      const wx = x + s * 82, wy = y - 150;
      g.fillStyle(0x2a2016, 1); g.fillRect(wx - 14, wy - 24, 28, 48);
      g.fillStyle(LAMP, 0.85); g.fillRect(wx - 12, wy - 22, 24, 44);
      meterDial(g, wx, wy + 6, 6, -0.6 + s * 0.5);
      g.fillStyle(BRASS_DARK, 1); g.fillRect(wx - 1, wy - 22, 2, 44);
    }
    // The door, double, studded; a brass plate beside it.
    g.fillStyle(0x1a1612, 1); g.fillRoundedRect(x - 26, y - 70, 52, 70, { tl: 24, tr: 24, bl: 0, br: 0 });
    g.fillStyle(AERION_DARK, 1); g.fillRoundedRect(x - 22, y - 66, 44, 66, { tl: 20, tr: 20, bl: 0, br: 0 });
    g.lineStyle(1.5, 0x1a3a4a, 1); g.lineBetween(x, y - 66, x, y);
    for (let r = 0; r < 4; r++) for (const s of [-1, 1]) { g.fillStyle(BRASS, 1); g.fillCircle(x + s * 11, y - 50 + r * 13, 1.8); }
    g.fillStyle(BRASS, 1); g.fillRect(x + 34, y - 54, 22, 14);
    g.fillStyle(BRASS_DARK, 1); for (let k = 0; k < 3; k++) g.fillRect(x + 37, y - 51 + k * 4, 16, 1.5);
    // Pipes from the bellows down the wall into the house — every meter is blown through.
    g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(x + 110, y - 236, x + 126, y - 236); g.lineBetween(x + 126, y - 236, x + 126, y - 96);
    g.lineStyle(3, BRASS, 1); g.lineBetween(x + 126, y - 236, x + 126, y - 96);
    // A bench outside, and crates of new meters waiting in straw.
    g.fillStyle(TIMBER, 1); g.fillRect(x - 128, y - 22, 60, 6);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 124, y - 16, 4, 16); g.fillRect(x - 76, y - 16, 4, 16);
    for (let k = 0; k < 3; k++) meterDial(g, x - 116 + k * 20, y - 28, 6, -1 + k * 0.7);
  },
});
solids.push({ kind: 'rect', x: METER.x - 134, y: METER.y - 36, w: 268, h: 36 });

// The Lift Foot: the landing platform where the cage comes down, its gate, and crates waiting.
pieces.push({
  x: LIFT_X, y: LIFT_FOOT + 44, w: 180, h: 120, draw: (g) => {
    const y = LIFT_FOOT + 44;
    shadow(g, LIFT_X, y + 2, 150, 18, 0.35);
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(LIFT_X - 58, y - 46, 116, 48);
    g.fillStyle(GRANITE, 1); g.fillRect(LIFT_X - 56, y - 46, 112, 40);
    g.fillStyle(lit(GRANITE, 0.15), 1); g.fillRect(LIFT_X - 56, y - 46, 112, 3);
    // Buffers of tarred timber where the cage lands.
    for (const s of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(LIFT_X + s * 36 - 6, y - 58, 12, 14); }
    // The gate: iron bars, chained.
    g.lineStyle(2, IRON, 1);
    for (let k = 0; k < 10; k++) g.lineBetween(LIFT_X - 54 + k * 12, y - 6, LIFT_X - 54 + k * 12, y - 34);
    g.lineBetween(LIFT_X - 56, y - 34, LIFT_X + 56, y - 34); g.lineBetween(LIFT_X - 56, y - 20, LIFT_X + 56, y - 20);
    g.lineStyle(1.5, 0xa8a8a8, 1); for (let k = 0; k < 5; k++) g.strokeEllipse(LIFT_X - 6 + k * 5, y - 20, 5, 3);
    // The board: forty breaths a hundredweight.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(LIFT_X - 40, y - 78, 80, 18);
    g.fillStyle(TIMBER, 1); g.fillRect(LIFT_X - 38, y - 76, 76, 14);
    aerionSeal(g, LIFT_X - 28, y - 69, 5, AERION_DARK, 1);
    g.fillStyle(0xe8e0cc, 1); for (let k = 0; k < 6; k++) g.fillRect(LIFT_X - 18 + k * 8, y - 72, 5, 6);
  },
});
solids.push({ kind: 'rect', x: LIFT_X - 60, y: LIFT_FOOT, w: 120, h: 44 });
// Crates of corked breath stacked on the Yard, waiting to go up.
for (const [cx, cy, s] of [[1960, 476, 11], [1990, 480, 11], [1975, 458, 11], [1708, 520, 10]] as [number, number, number][]) {
  pieces.push({ x: cx, y: cy, w: s * 4, h: s * 4, draw: (g) => bottleCrate(g, cx, cy, s) });
}
solids.push({ kind: 'rect', x: 1940, y: 450, w: 70, h: 32 }, { kind: 'rect', x: 1690, y: 504, w: 36, h: 18 });

// The Gull Post: a tall timber dovecote on a granite drum, every pigeon-hole a gull's, letters in a rack.
pieces.push({
  x: 200, y: 1056, w: 140, h: 260, draw: (g, rng) => {
    shadow(g, 200, 1058, 110, 24, 0.38);
    g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(158, 1000, 84, 58, 10);
    g.fillStyle(GRANITE, 1); g.fillRoundedRect(162, 1002, 76, 52, 9);
    g.fillStyle(GUANO, 0.7); for (let k = 0; k < 14; k++) g.fillRect(164 + rng() * 70, 1004 + rng() * 10, 2, 6 + rng() * 14);
    // The tower: three tiers of nest-holes, each tier a little narrower.
    for (let t = 0; t < 3; t++) {
      const tw = 76 - t * 12, ty = 1000 - t * 56;
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(200 - tw / 2 - 2, ty - 56, tw + 4, 56);
      g.fillStyle(0xd8d0c0, 1); g.fillRect(200 - tw / 2, ty - 54, tw, 52);
      for (let r = 0; r < 2; r++) for (let k = 0; k < Math.floor(tw / 16); k++) {
        const hx = 200 - tw / 2 + 8 + k * 16, hy = ty - 44 + r * 24;
        g.fillStyle(0x2a2420, 1); g.fillRoundedRect(hx - 5, hy - 6, 11, 12, { tl: 5, tr: 5, bl: 0, br: 0 });
        g.fillStyle(TIMBER, 1); g.fillRect(hx - 7, hy + 6, 15, 3);
        if (rng() < 0.45) gullSitting(g, hx + 1, hy + 6, 7, rng() < 0.5 ? 1 : -1);
      }
      g.fillStyle(0x4a5058, 1); g.fillRect(200 - tw / 2 - 6, ty - 58, tw + 12, 5);
    }
    // The cap and its weathervane: a tin gull.
    g.fillStyle(0x3a4048, 1); g.fillTriangle(164, 836, 236, 836, 200, 800);
    g.lineStyle(1.5, IRON, 1); g.lineBetween(200, 800, 200, 780);
    g.fillStyle(0xd8d8d0, 1); g.fillTriangle(194, 780, 214, 778, 206, 784); g.fillTriangle(196, 778, 186, 772, 200, 782);
    // A rack of brass letter-tubes, and a bucket of herring postage.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(240, 1010, 30, 4);
    for (let k = 0; k < 4; k++) { g.fillStyle(BRASS, 1); g.fillRoundedRect(242 + k * 7, 994, 4, 16, 2); }
    g.fillStyle(0x5a5a5a, 1); g.fillRect(248, 1040, 18, 16);
    g.fillStyle(0xc8d4dc, 1); for (let k = 0; k < 3; k++) g.fillEllipse(252 + k * 5, 1040, 7, 3);
  },
});
solids.push({ kind: 'circle', x: 200, y: 1040, r: 40 }, { kind: 'rect', x: 238, y: 1038, w: 30, h: 18 });

// Hob's slip on the west quay: a cutter on a cradle, her storm-shutters off, a sail being cut.
pieces.push({
  x: 720, y: 1194, w: 260, h: 150, draw: (g, rng) => {
    shadow(g, 720, 1198, 220, 24, 0.36);
    for (const cx of [660, 780]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(cx - 5, 1166, 10, 30); }
    g.fillStyle(0x24343e, 1); g.fillEllipse(720, 1160, 190, 40);
    g.fillStyle(0x3a5a7a, 1); g.fillEllipse(720, 1154, 180, 28);
    g.fillStyle(lit(0x3a5a7a, 0.2), 1); g.fillEllipse(710, 1148, 120, 6);
    g.fillStyle(0xf4f0e0, 1); g.fillRect(640, 1150, 160, 3);
    // Mast lying along a trestle beside her, and the sail spread on the stones being cut.
    g.lineStyle(4, TIMBER, 1); g.lineBetween(620, 1112, 820, 1104);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(640, 1112, 4, 30); g.fillRect(800, 1106, 4, 34);
    poly(g, [[652, 1180], [740, 1176], [700, 1196]], CANVAS, 0.9);
    g.lineStyle(1, 0x8a7a5a, 0.8); g.lineBetween(660, 1182, 734, 1178);
    // A pot of pitch and a heap of oakum.
    g.fillStyle(0x1a1410, 1); g.fillRect(800, 1182, 14, 12); g.fillStyle(0x0a0806, 1); g.fillEllipse(807, 1182, 14, 4);
    blob(g, 610, 1190, 16, 7, 0xb8a070, 1, rng);
  },
});
solids.push({ kind: 'rect', x: 630, y: 1164, w: 180, h: 32 });

// The Long Line: a stone net-loft on the east quay, skyline rods taller than the roof racked outside.
pieces.push({
  x: 2380, y: 1160, w: 260, h: 260, draw: (g, rng) => {
    shadow(g, 2380, 1164, 220, 26, 0.38);
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(2290, 1062, 180, 100);
    g.fillStyle(0x8a8478, 1); g.fillRect(2294, 1064, 172, 96);
    for (let i = 0; i < 30; i++) { g.fillStyle(rng() < 0.5 ? 0x7a7468 : 0x9a948a, 0.8); g.fillRoundedRect(2296 + rng() * 160, 1066 + rng() * 84, 12 + rng() * 8, 7, 2); }
    // A loft door up top with a hoist-beam, nets drying out of it.
    g.fillStyle(0x3a4048, 1); g.fillTriangle(2280, 1066, 2480, 1066, 2380, 1010);
    g.fillStyle(0x2a2016, 1); g.fillRect(2366, 1034, 28, 26);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(2374, 1022, 4, 14); g.fillRect(2374, 1022, 34, 4);
    g.lineStyle(1, ROPE, 1); g.lineBetween(2404, 1026, 2404, 1050);
    g.fillStyle(0x5a6a5a, 0.85); poly(g, [[2394, 1050], [2416, 1050], [2420, 1080], [2390, 1080]], 0x5a6a5a, 0.85);
    // Door and a window full of reels.
    g.fillStyle(0x2a2016, 1); g.fillRoundedRect(2364, 1116, 32, 46, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(0x3a5a6a, 1); g.fillRoundedRect(2367, 1119, 26, 43, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(LAMP, 0.85); g.fillRect(2312, 1094, 34, 26);
    for (let k = 0; k < 3; k++) { g.lineStyle(2, TIMBER_DARK, 1); g.strokeCircle(2318 + k * 11, 1108, 4); }
    // The skyline rods: kite-cane, twice the height of the loft, each with its drum reel.
    for (let k = 0; k < 4; k++) {
      const rx = 2430 + k * 10;
      g.lineStyle(2.5, 0xd8c890, 1); g.lineBetween(rx, 1160, rx + 6 + k * 3, 900 - k * 12);
      g.lineStyle(1, 0xa89860, 1); for (let n = 0; n < 6; n++) { const t = n / 6; g.lineBetween(rx + (6 + k * 3) * t - 2, 1160 - (260 + k * 12) * t, rx + (6 + k * 3) * t + 2, 1160 - (260 + k * 12) * t); }
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(rx + 1, 1130, 6);
      g.fillStyle(0xf4f0e0, 1); g.fillCircle(rx + 1, 1130, 3.5);
    }
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(2424, 1150, 48, 6);
    // Sign: a hook on a very long line.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(2296, 1036, 58, 26);
    g.lineStyle(1.5, 0xe8e0cc, 1); g.lineBetween(2302, 1042, 2340, 1042); g.lineBetween(2340, 1042, 2340, 1052);
    g.beginPath(); g.arc(2336, 1052, 4, 0, Math.PI, false); g.strokePath();
  },
});
solids.push({ kind: 'rect', x: 2290, y: 1130, w: 184, h: 32 });

// The Gullstack: a sea-stack off the west quay, white with gulls (decoration in the sea).
pieces.push({
  x: 420, y: 1440, w: 180, h: 240, draw: (g, rng) => {
    g.fillStyle(0x0a1a24, 0.4); g.fillEllipse(430, 1446, 170, 34);
    poly(g, [[350, 1440], [490, 1440], [478, 1340], [462, 1270], [440, 1226], [404, 1230], [384, 1290], [360, 1360]], GRANITE_DARK);
    poly(g, [[360, 1436], [480, 1436], [470, 1346], [454, 1278], [436, 1236], [408, 1240], [390, 1296], [368, 1362]], GRANITE);
    for (let y = 1250; y < 1430; y += 14) { g.fillStyle(rng() < 0.5 ? STRATA_A : STRATA_B, 0.6); g.fillRect(372 + (1440 - y) * 0.05, y, 98 - (1440 - y) * 0.2, 5); }
    for (let k = 0; k < 40; k++) { g.fillStyle(GUANO, 0.8); g.fillRect(380 + rng() * 80, 1236 + rng() * 120, 2, 4 + rng() * 10); }
    for (const [gx, gy] of [[420, 1232], [438, 1240], [402, 1262], [452, 1282], [392, 1310], [470, 1340]] as [number, number][]) gullSitting(g, gx, gy, 9, gx < 425 ? -1 : 1);
    g.fillStyle(FOAM, 0.6); g.fillEllipse(420, 1440, 160, 10);
  },
});

// Bollards, hawsers and pots along the waterfront, kept off the walking lines.
const BOLLARDS: [number, number][] = [[140, 1240], [460, 1244], [880, 1240], [1100, 1244], [1340, 1244], [1560, 1240], [1940, 1244], [2180, 1240], [2540, 1244], [1174, 1470], [1266, 1470], [2032, 1300], [2092, 1300]];
for (const [x, y] of BOLLARDS) { pieces.push({ x, y, w: 24, h: 30, draw: (g) => bollard(g, x, y) }); solids.push({ kind: 'circle', x, y: y - 4, r: 8 }); }
for (const [x, y, s] of [[500, 1110, 16], [1480, 1110, 14], [2560, 1110, 15]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2, draw: (g) => hawser(g, x, y, s) });
  solids.push({ kind: 'circle', x, y: y - s * 0.3, r: s * 0.9 });
}
for (const [x, y, s] of [[1940, 1120, 14], [1964, 1134, 12], [2510, 1210, 13], [860, 1120, 13]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2, draw: (g) => lobsterPot(g, x, y, s) });
  solids.push({ kind: 'circle', x, y: y - s * 0.3, r: s * 0.8 });
}
// A windsock pole at the end of the South Quay (the sock itself fills and empties, animated).
const SOCK = { x: 1270, y: 1300 };
pieces.push({
  x: SOCK.x, y: SOCK.y, w: 20, h: 100, draw: (g) => {
    shadow(g, SOCK.x, SOCK.y, 14, 5);
    g.fillStyle(IRON, 1); g.fillRect(SOCK.x - 2, SOCK.y - 86, 4, 86);
    g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(SOCK.x - 2, SOCK.y - 86, 1, 86);
    g.lineStyle(2, IRON, 1); g.strokeCircle(SOCK.x + 4, SOCK.y - 82, 5);
  },
});
solids.push({ kind: 'circle', x: SOCK.x, y: SOCK.y - 2, r: 4 });
// Boulders out on the shelf, sea-pinks in their lee.
for (const [x, y, s] of [[90, 600, 26], [1180, 600, 22], [1520, 860, 26], [2520, 600, 24], [2040, 820, 18], [200, 880, 20]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2.5, draw: (g, rng) => rock(g, x, y, s, rng() < 0.5 ? GRANITE : 0x80868e, rng) });
  solids.push({ kind: 'circle', x, y: y - s * 0.3, r: s * 0.85 });
}

// Wind-lamps: along the streets, the Yard and the quay.
const LAMPS: [number, number][] = [
  [240, 720], [660, 790], [1120, 720], [1240, 860], [1180, 1040], [1440, 700], [1680, 470], [2070, 600], [2420, 720],
  [2330, 1000], [1600, 1090], [380, 1100], [1000, 1100], [2160, 1110], [1174, 1330], [800, 470], [2200, 470],
];
for (const [x, y] of LAMPS) {
  pieces.push({ x, y, w: 30, h: 90, draw: (g) => windLamp(g, x, y) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 6 });
}

// ── Water and walls as solids ────────────────────────────────────────

solids.push(
  // The open sea, with the South Quay and the Gull Mole cut out of it.
  ...carve({ x: 0, y: SEA_Y + 6, w: W, h: H - SEA_Y - 6 }, [SOUTH_QUAY, GULL_MOLE]),
  // The cliff, either side of the Hundred Turns' cleft.
  { kind: 'rect', x: 0, y: 0, w: STAIR_X0, h: CLIFF_Y },
  { kind: 'rect', x: STAIR_X1, y: 0, w: W - STAIR_X1, h: CLIFF_Y },
);

// ── Animation ────────────────────────────────────────────────────────

/** Boats moored off the waterfront: cutters with storm-shutters, and little skiffs. */
const MOORED: { x: number; y: number; len: number; hull: number; mast: boolean }[] = [
  { x: 1060, y: 1350, len: 64, hull: 0x3a5a7a, mast: true },
  { x: 1420, y: 1356, len: 58, hull: 0x7a3a3a, mast: true },
  { x: 860, y: 1320, len: 28, hull: 0xd8d0c0, mast: false },
  { x: 1840, y: 1330, len: 26, hull: 0x4a7a5a, mast: false },
  { x: 2260, y: 1350, len: 60, hull: 0x5a5a6a, mast: true },
  { x: 2440, y: 1320, len: 26, hull: 0xe8a040, mast: false },
];

/** The lift cage's height on a 26-second round: wait at the foot, climb, wait in the cloud, descend. */
function cageY(t: number): { y: number; moving: number } {
  const T = 26, k = t % T;
  const ease = (q: number): number => q * q * (3 - 2 * q);
  if (k < 6) return { y: LIFT_FOOT - 40, moving: 0 };
  if (k < 13) return { y: LIFT_FOOT - 40 - ease((k - 6) / 7) * (LIFT_FOOT - 40 - LIFT_TOP), moving: 1 };
  if (k < 19) return { y: LIFT_TOP, moving: 0 };
  return { y: LIFT_TOP + ease((k - 19) / 7) * (LIFT_FOOT - 40 - LIFT_TOP), moving: -1 };
}

function animateUnder(g: G, t: number, view: Rect): void {
  // ── The sea: short cold chop, foam blown off the crests seaward.
  if (view.y + view.h > SEA_Y - 40) {
    for (let row = 0; row < 10; row++) {
      const y = SEA_Y + 20 + row * 22;
      if (y < view.y - 20 || y > view.y + view.h + 20) continue;
      const speed = 14 + row * 3;
      for (let x = Math.floor(view.x / 84) * 84 - 84; x < view.x + view.w + 84; x += 84) {
        const ox = x + ((t * speed + row * 41) % 84);
        if (ox > SOUTH_QUAY.x - 8 && ox < SOUTH_QUAY.x + SOUTH_QUAY.w + 8) continue;
        if (ox > GULL_MOLE.x - 8 && ox < GULL_MOLE.x + GULL_MOLE.w + 8 && y < GULL_MOLE.y + GULL_MOLE.h + 10) continue;
        const yy = y + Math.sin(t * 1.3 + x * 0.02 + row) * 3;
        g.lineStyle(2.5, lit(SEA, 0.26), 0.2); g.lineBetween(ox, yy, ox + 30, yy + 2);
        if ((row + Math.floor(x / 84)) % 4 === 0) { g.fillStyle(FOAM, 0.32); g.fillEllipse(ox + 34, yy + 3, 9, 2.2); }
      }
    }
    // Slop against the quay foot and round the two moles.
    for (let x = Math.floor(view.x / 70) * 70; x < view.x + view.w + 70; x += 70) {
      if (!inView(view, x, SEA_Y, 40)) continue;
      const k = 0.26 + Math.sin(t * 1.8 + x * 0.05) * 0.16;
      g.fillStyle(FOAM, k); g.fillEllipse(x + 35, SEA_Y + 12, 50, 5);
    }
    for (const r of [SOUTH_QUAY, GULL_MOLE]) {
      for (let y = r.y + 20; y < r.y + r.h; y += 34) {
        if (!inView(view, r.x, y, 40)) continue;
        const k = 0.3 + Math.sin(t * 2 + y) * 0.18;
        g.fillStyle(FOAM, k); g.fillEllipse(r.x - 8, y, 12, 4); g.fillEllipse(r.x + r.w + 8, y + 12, 12, 4);
      }
    }
    // Herring boiling at the surface off the Gull Mole, now and then.
    if (inView(view, 2200, 1360, 200)) {
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.9 + i * 0.37) % 2;
        if (ph > 1) continue;
        const x = 2160 + (i * 37) % 120, y = 1340 + (i * 23) % 60;
        g.fillStyle(0xd8e4ec, (1 - ph) * 0.8); g.fillEllipse(x, y - Math.sin(ph * Math.PI) * 5, 5, 2);
      }
    }
    // Moored boats bobbing.
    for (const b of MOORED) {
      if (!inView(view, b.x, b.y, 80)) continue;
      const bob = Math.sin(t * 1.4 + b.x) * 3;
      const roll = Math.sin(t * 1.0 + b.y) * 0.08;
      const y = b.y + bob;
      g.fillStyle(0x0a1a24, 0.4); g.fillEllipse(b.x + 4, y + 10, b.len + 10, 12);
      g.fillStyle(dim(b.hull, 0.4), 1); g.fillEllipse(b.x, y + 2, b.len, b.mast ? 16 : 12);
      g.fillStyle(b.hull, 1); g.fillEllipse(b.x, y, b.len - 4, b.mast ? 12 : 9);
      if (!b.mast) { g.fillStyle(dim(b.hull, 0.5), 1); g.fillEllipse(b.x, y - 1, b.len - 10, 5); continue; }
      g.fillStyle(0xf4f0e0, 1); g.fillRect(b.x - b.len * 0.4, y - 3, b.len * 0.8, 2);
      const mx = b.x + roll * 80;
      g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(b.x, y - 2, mx, y - 56);
      g.lineStyle(1, 0x8a8a7a, 0.7); g.lineBetween(mx, y - 56, b.x + b.len / 2, y - 2); g.lineBetween(mx, y - 56, b.x - b.len / 2, y - 2);
      // Sails furled tight against the cliff wind, a pennant streaming east.
      g.fillStyle(CANVAS, 1); g.fillRect(mx - 2, y - 48, 4, 32);
      const pw = Math.sin(t * 6 + b.x) * 2;
      poly(g, [[mx, y - 56], [mx + 16, y - 54 + pw], [mx, y - 51]], 0xe85a4a, 1);
    }
  }
  // ── Lamp light pooling under each wind-lamp, leaning with the flame.
  for (const [x, y] of LAMPS) {
    if (!inView(view, x, y, 80)) continue;
    const f = 0.8 + Math.sin(t * 3.1 + x) * 0.2;
    g.fillStyle(LAMP, 0.05 * f); g.fillEllipse(x + 6, y + 4, 70, 22);
  }
  // ── Grit eddies whirling across the Lift Yard where the downdraught hits it.
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.12 + i / 3) % 1;
    const ex = 1420 + ph * 640, ey = 470 + i * 80 + Math.sin(t * 0.7 + i) * 30;
    if (!inView(view, ex, ey, 40)) continue;
    const a = Math.sin(ph * Math.PI);
    for (let k = 0; k < 7; k++) {
      const ang = t * 6 + k * 0.9;
      const r = 4 + k * 2.2;
      g.fillStyle(0xc8c4b8, 0.4 * a); g.fillCircle(ex + Math.cos(ang) * r, ey + Math.sin(ang) * r * 0.4, 1.2);
    }
  }
}

function animateAbove(g: G, t: number, view: Rect): void {
  // ── The lift: the treadwheel turning, the drum, the cable, the cage on the rails, the headframe.
  if (inView(view, 1700, 200, 400)) {
    const cage = cageY(t);
    // The wheel turns exactly as far as the cage has climbed, so it reverses as the cage comes down.
    const spin = (LIFT_FOOT - 40 - cage.y) * 0.05;
    // Treadwheel: rim, spokes, and the wheel lads walking inside it.
    g.lineStyle(8, TIMBER_DARK, 1); g.strokeCircle(WHEEL.x, WHEEL.y, WHEEL.r);
    g.lineStyle(5, TIMBER, 1); g.strokeCircle(WHEEL.x, WHEEL.y, WHEEL.r - 1);
    for (let k = 0; k < 10; k++) {
      const a = spin + (k / 10) * Math.PI * 2;
      g.lineStyle(3, TIMBER_DARK, 0.9); g.lineBetween(WHEEL.x, WHEEL.y, WHEEL.x + Math.cos(a) * (WHEEL.r - 4), WHEEL.y + Math.sin(a) * (WHEEL.r - 4));
      g.fillStyle(TIMBER, 1); g.fillRect(WHEEL.x + Math.cos(a) * (WHEEL.r - 4) - 3, WHEEL.y + Math.sin(a) * (WHEEL.r - 4) - 2, 6, 4);
    }
    g.fillStyle(IRON, 1); g.fillCircle(WHEEL.x, WHEEL.y, 7);
    for (let m = 0; m < 3; m++) {
      const mx = WHEEL.x - 20 + m * 18, step = cage.moving ? Math.sin(t * 8 + m * 2) * 2 : 0;
      const my = WHEEL.y + WHEEL.r - 14;
      g.fillStyle(0x6a5040, 1); g.fillCircle(mx, my - 14 + Math.abs(step), 5);
      g.fillStyle(0x5a3a2a, 1); g.fillRect(mx - 4, my - 10 + Math.abs(step), 8, 10);
      g.fillStyle(BRASS, 1); g.fillCircle(mx, my - 6 + Math.abs(step), 1.6);
      // Their breath, counted: little puffs while they walk, and the dial flicking.
      if (cage.moving) {
        const ph = (t * 1.6 + m * 0.33) % 1;
        g.fillStyle(BREATH, (1 - ph) * 0.6); g.fillCircle(mx + 4 + ph * 8, my - 18 - ph * 10, 2 + ph * 3);
      }
    }
    // The drum turning: rope bands sliding across it.
    for (let k = 0; k < 4; k++) {
      const off = ((spin * 12 + k * 26) % 104 + 104) % 104;
      g.lineStyle(2, lit(ROPE, 0.2), 0.8); g.lineBetween(DRUM.x - 50 + off, DRUM.y - 40, DRUM.x - 50 + off, DRUM.y - 4);
    }
    // The cable: drum → up over the headframe sheave → down to the cage.
    g.lineStyle(2, 0x2a2420, 1);
    g.lineBetween(DRUM.x + 20, DRUM.y - 42, SHEAVE.x - 12, SHEAVE.y);
    g.lineBetween(SHEAVE.x + 12, SHEAVE.y, SHEAVE.x + 12, cage.y - 34);
    g.lineStyle(1, 0x2a2420, 0.6); g.lineBetween(SHEAVE.x + 12, cage.y - 34, LIFT_X, cage.y - 30);
    // The cage: iron bars, a roof, and what is in it — crates going up full, coming down empty.
    const cx = LIFT_X, cy = cage.y;
    g.fillStyle(0x000000, 0.2); g.fillRect(cx - 24, cy - 26, 52, 56);
    g.fillStyle(IRON, 1); g.fillRect(cx - 28, cy - 30, 56, 6); g.fillRect(cx - 28, cy + 22, 56, 6);
    const goingUp = cage.moving >= 0 && ((t % 26) < 19);
    if (goingUp) { bottleCrate(g, cx - 10, cy + 22, 6); bottleCrate(g, cx + 12, cy + 22, 6); }
    g.lineStyle(2, IRON, 1);
    for (let k = 0; k <= 6; k++) g.lineBetween(cx - 26 + k * 8.6, cy - 24, cx - 26 + k * 8.6, cy + 22);
    g.fillStyle(0x4a5058, 1); g.fillTriangle(cx - 30, cy - 30, cx + 30, cy - 30, cx, cy - 40);
    // The headframe, sticking up out of the cloud: an A of timber and the sheave wheel spinning.
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(LIFT_X - 40, 70, SHEAVE.x, SHEAVE.y - 10); g.lineBetween(LIFT_X + 40, 70, SHEAVE.x, SHEAVE.y - 10);
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(LIFT_X - 28, 46, LIFT_X + 28, 46);
    g.lineStyle(3, IRON, 1); g.strokeCircle(SHEAVE.x, SHEAVE.y, 13);
    for (let k = 0; k < 4; k++) { const a = spin * 3 + (k / 4) * Math.PI * 2; g.lineStyle(1.5, IRON, 1); g.lineBetween(SHEAVE.x, SHEAVE.y, SHEAVE.x + Math.cos(a) * 12, SHEAVE.y + Math.sin(a) * 12); }
    aerionSeal(g, SHEAVE.x, SHEAVE.y - 26, 8, AERION, 0.9);
  }

  // ── The cloud line: puffs drifting east along the clifftop, swallowing the headframe's feet.
  if (view.y < 160) {
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137 + t * (10 + (i % 3) * 4)) % (W + 300)) - 150;
      if (x < view.x - 120 || x > view.x + view.w + 120) continue;
      const y = 50 + ((i * 53) % 50) + Math.sin(t * 0.4 + i) * 6;
      const s = 50 + (i * 31) % 50;
      g.fillStyle(CLOUD_SHADE, 0.5); g.fillEllipse(x, y + 8, s * 1.8, s * 0.55);
      g.fillStyle(CLOUD, 0.75); g.fillEllipse(x - 6, y, s * 1.6, s * 0.5);
      g.fillStyle(0xffffff, 0.5); g.fillEllipse(x - 16, y - 6, s * 0.8, s * 0.24);
    }
  }

  // ── Kites over the market, every one on a long line to its stall, swinging in the wind.
  STALLS.forEach(([x, y, w, a, b], i) => {
    const sway = Math.sin(t * 0.7 + i * 1.3) * 26 + Math.sin(t * 1.9 + i) * 6;
    const kx = x + 50 + sway, ky = y - 250 - (i % 3) * 30 + Math.sin(t * 1.1 + i * 2) * 10;
    if (!inView(view, kx, (ky + y) / 2, 260)) return;
    const ax = x + w / 2 - 6, ay = y - 108;
    g.lineStyle(1, 0xf4f0e0, 0.65);
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const q = k / 10;
      const lx = ax + (kx - ax) * q, ly = ay + (ky - ay) * q + Math.sin(q * Math.PI) * 18;
      if (k === 0) g.moveTo(lx, ly); else g.lineTo(lx, ly);
    }
    g.strokePath();
    kite(g, kx, ky, 14 + (i % 2) * 3, Math.sin(t * 1.3 + i) * 0.35 + 0.2, a, b === 0xf4f0e0 ? KITE_COLS[(i * 3 + 1) % KITE_COLS.length] : b, t * 4 + i);
  });

  // ── Gulls wheeling: a ring over the Gull Post, a ring over the Gull Mole, strays along the cliff.
  const flock = (cx: number, cy: number, n: number, r: number, seed: number): void => {
    if (!inView(view, cx, cy, r + 60)) return;
    for (let i = 0; i < n; i++) {
      const a = t * (0.35 + (i % 3) * 0.08) * (i % 2 ? 1 : -1) + i * 2.1 + seed;
      const x = cx + Math.cos(a) * r * (0.6 + ((i * 37) % 10) / 25), y = cy + Math.sin(a) * r * 0.45 + Math.sin(t + i) * 8;
      gull(g, x, y, 9 + (i % 3), Math.sin(t * 5 + i * 1.7), Math.cos(a) * (i % 2 ? 1 : -1) < 0 ? -1 : 1, 0.95);
    }
  };
  flock(200, 760, 6, 120, 0);
  flock(2140, 1240, 7, 140, 3);
  flock(420, 1140, 4, 90, 7);
  flock(700, 240, 3, 200, 11);
  flock(2300, 260, 3, 180, 13);

  // ── The Meter House: the great dial twitching up into the red, the testing-bellows breathing.
  if (inView(view, METER.x, METER.y - 200, 220)) {
    const ang = -Math.PI * 1.25 + (0.78 + Math.sin(t * 0.6) * 0.08 + Math.sin(t * 7) * 0.012) * Math.PI * 1.5;
    meterDial(g, METER_DIAL.x, METER_DIAL.y, METER_DIAL.r, ang);
    aerionSeal(g, METER_DIAL.x, METER_DIAL.y + 14, 6, AERION_DARK, 0.6);
    const breathe = (Math.sin(t * 1.6) + 1) / 2;
    const bx = METER.x + 90, by = METER.y - 238;
    g.fillStyle(TIMBER, 1);
    poly(g, [[bx - 26, by + 10], [bx + 20, by + 2 - breathe * 10], [bx + 26, by + 10], [bx - 22, by + 18]], TIMBER, 1);
    g.fillStyle(0x6a4a3a, 1);
    for (let k = 0; k < 4; k++) g.fillRect(bx - 20 + k * 11, by + 4 - breathe * (k * 2.5), 3, 8 + breathe * k * 2.5);
    // Every exhale puffs a little cloud of tested breath out of the pipe.
    const ph = (t * 1.6 / (Math.PI * 2) + 0.25) % 1;
    g.fillStyle(BREATH, (1 - ph) * 0.6); g.fillCircle(bx + 30 + ph * 40, by - 2 - ph * 24, 4 + ph * 10);
  }

  // ── The Rising Loaf's chimney: smoke streaming east on the wind, flat and fast.
  if (inView(view, 1044, 600, 260)) {
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.4 + i / 8) % 1;
      g.fillStyle(0xd8d4cc, (1 - ph) * 0.34);
      g.fillCircle(1044 + ph * 200, 684 - ph * 50 + Math.sin(t * 2 + i) * 4, 6 + ph * 18);
    }
    glow(g, 1100, 950, 26 + Math.sin(t * 5) * 3, OVEN, 0.05, 3);
  }

  // ── Wind-lamp flames, leaning east, with their glow.
  for (const [x, y] of LAMPS) {
    if (!inView(view, x, y, 60)) continue;
    const p = lampLight(x, y);
    const f = 0.75 + Math.sin(t * 3.1 + x) * 0.25;
    glow(g, p.x, p.y, 14 * f, LAMP, 0.06, 3);
    g.fillStyle(0xffe8b0, 0.9); g.fillTriangle(p.x - 2, p.y + 3, p.x + 2, p.y + 3, p.x + 2 + Math.sin(t * 9 + x) * 1.5, p.y - 4);
  }

  // ── The windsock on the South Quay: filling and slackening with the gusts.
  if (inView(view, SOCK.x, SOCK.y - 80, 80)) {
    const fill = 0.6 + Math.sin(t * 0.9) * 0.3 + Math.sin(t * 3.3) * 0.08;
    const sx = SOCK.x + 6, sy = SOCK.y - 82;
    const len = 18 + fill * 22, droop = (1 - fill) * 18;
    for (let k = 0; k < 4; k++) {
      const q0 = k / 4, q1 = (k + 1) / 4;
      const r0 = 6 - q0 * 3, r1 = 6 - q1 * 3;
      const x0 = sx + len * q0, x1 = sx + len * q1;
      const y0 = sy + droop * q0 * q0 + Math.sin(t * 8 + k) * fill, y1 = sy + droop * q1 * q1 + Math.sin(t * 8 + k + 1) * fill;
      poly(g, [[x0, y0 - r0], [x1, y1 - r1], [x1, y1 + r1], [x0, y0 + r0]], k % 2 ? 0xf4f0e0 : 0xf08a3a, 1);
    }
  }

  // ── A crate of corked breath on the Yard, the bottles in it faintly breathing.
  if (inView(view, 1975, 450, 80)) {
    const a = 0.12 + Math.sin(t * 1.2) * 0.06;
    g.fillStyle(BREATH, a); g.fillEllipse(1975, 436, 70, 20);
  }
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1080, y: 1200 } },
  { kind: 'mooring', at: { x: 1220, y: 1462 }, isle: 'air' },
  { kind: 'water', id: 'windlass-sea-water', shape: { x: 280, y: 1275, w: 2300, h: 215 }, fishery: 'windlass-sea' },
  { kind: 'sign', at: { x: 1410, y: 440 }, text: 'NORTH — the Hundred Turns, up to the Galeward Court and the cloud line. Meters will be worn.' },
  { kind: 'sign', at: { x: 110, y: 690 }, text: 'WEST — The Fable Court. Prince Legend\'s storybook town. Banned stories will be burned. So will readers.' },
  { kind: 'sign', at: { x: 2490, y: 690 }, text: 'EAST — The Orbit Court. Prince Perigee\'s orrery. Hold on to something. Down is not always down.' },
  { kind: 'sign', at: { x: 1300, y: 1236 }, text: 'THE SOUTH QUAY — Moorings at the end. Hulls: H. Cleat. Tackle: F. Halyard, the Long Line, east quay.' },
  {
    kind: 'sign', at: { x: 2060, y: 700 },
    text: 'THE METER HOUSE. All persons going above the cloud line shall be fitted. Breathe small. — By the King\'s order.',
  },
  { kind: 'sign', at: { x: 1950, y: 520 }, text: 'THE LIFT. Cargo only. Fare: forty breaths the hundredweight, payable by the wheel.' },
  { kind: 'sign', at: { x: 470, y: 760 }, text: 'THE KITE MARKET. AIR LICENCES checked at all hours. Unlicensed lines will be cut. — Kite Warden' },
  { kind: 'sign', at: { x: 300, y: 1000 }, text: 'THE GULL POST. A letter up the spire: one herring. A letter down: one herring. Gulls do not haggle.' },
  { kind: 'chest', id: 'windlass-chest-ledge', at: { x: 60, y: 470 }, coins: 120, orbs: 1 },
  { kind: 'chest', id: 'windlass-chest-mole', at: { x: 2062, y: 1436 }, orbs: 2, coins: 60 },
  { kind: 'chest', id: 'windlass-chest-meters', at: { x: 2380, y: 690 }, coins: 380, open: { monarch: 'aerion' } },
];

export const WINDLASS_AREA: AreaDef = {
  id: 'windlass',
  isle: 'air',
  name: 'Windlass',
  subtitle: 'Cliff harbour at the foot of the spire',
  w: W,
  h: H,
  bg: 0x5a6068,
  accent: AERION,
  weather: 'wind',
  spawn: { x: 1220, y: 1410 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'galeward', label: 'The Hundred Turns — the Galeward Court' },
    { side: 'w', to: 'fable', label: 'The Story Road — the Fable Court' },
    { side: 'e', to: 'orbit', label: 'The Tether Road — the Orbit Court' },
  ],
  pois: POIS,
  npcs: WINDLASS_NPCS,
  crowd: WINDLASS_CROWD,
};
