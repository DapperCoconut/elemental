import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { blob, dim, glow, groundFill, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  CRUDE, CRUDE_AMBER, CRUDE_LIT, FLAME, FLAME_LIT, GILT, GILT_DARK, LAMP_GOLD, LAMP_LIT, RUST, RUST_LIT,
  SAFETY_RED, SAFETY_WHITE, SEA, SEA_LIT, STEEL, STEEL_DARK, STEEL_LIT, TAR, TAR_LIT, TIMBER, TIMBER_DARK,
  TIMBER_LIT, blobPts, bollard, boardwalk, crudePuddle, drumEnd, flameTongue, hawserCoil, inView, noise,
  oilDrum, planks, pumpBeam, pumpFrame, queensLamp, queensMark, safetyStripes, sheenAt, slick, sootPuff,
  tidemarks, tithCrate,
} from './util';

/**
 * Slickharbor, painted. An oil-refinery port at the Reach's south-east corner, where Prince
 * Crude pumps crude out of the seabed to keep the Queen's lamps burning — and takes the Dry
 * Tithe in barrels from anyone who cannot pay it in coin.
 *
 * Reading order: the refinery fence along the north edge with the frosted Rimefast gate; the
 * Nodding Field of pump-jacks north-west; Prince Crude's Lamphouse Hall north-east — a gilded
 * storage tank turned palace, lamp-cupola on top — between the cracking tower and the flare
 * stack, with the tank farm behind; the Barrel Tithe weighhouse on the main road; the Black
 * Row's stilt shanties and the houses left under in the south-west; the tarred quay along the
 * whole south shore with its three jetties, the moored tanker, the gantry crane and the welding
 * berth; and the Slick itself — the harbour water, black and rainbow-skinned.
 *
 * Every layout constant below is also read by `area.ts` for solids, so a tank drawn is a tank
 * you walk into.
 */

// ── Layout (world px) ───────────────────────────────────────────────

export const AREA_W = 2400;
export const AREA_H = 1600;

/** The shoreline: the harbour water is everything south of this. */
export const SEA_Y = 1330;
/** The tarred quay deck along the shore. */
export const QUAY: Rect = { x: 0, y: 1212, w: AREA_W, h: SEA_Y - 1212 + 6 };
/** Jetties running out into the Slick. */
export const PIERS: Rect[] = [
  { x: 430, y: SEA_Y - 8, w: 96, h: 254 },
  { x: 1185, y: SEA_Y - 8, w: 130, h: 262 },
  { x: 1940, y: SEA_Y - 8, w: 96, h: 254 },
];
/** Where you can fish: the black water between the west jetty and the oil jetty. */
export const FISH_WATER: Rect = { x: 560, y: 1372, w: 560, h: 196 };
/** The tanker moored along the oil jetty's east side. */
export const TANKER: Rect = { x: 1340, y: 1392, w: 520, h: 156 };
/** Houses the Queen left under — roofs poking out of the harbour. */
export const SUNK: { x: number; y: number; w: number }[] = [
  { x: 140, y: 1430, w: 120 }, { x: 310, y: 1500, w: 100 }, { x: 70, y: 1560, w: 90 },
];

export const KEEP: Pt = { x: 1750, y: 520 };
export const KEEP_W = 400;
export const CRACKER: Pt = { x: 1495, y: 505 };
export const FLARE: Pt = { x: 2015, y: 470 };
export const TANKS: { x: number; y: number; r: number; n: number }[] = [
  { x: 2215, y: 390, r: 118, n: 1 },
  { x: 2275, y: 655, r: 78, n: 2 },
];
export const WELD_TANK: { x: number; y: number; r: number } = { x: 2215, y: 1040, r: 84 };
export const WEIGHHOUSE: Pt = { x: 880, y: 740 };
export const SHOP: Pt = { x: 330, y: 720 };
export const GALLEY: Pt = { x: 790, y: 1085 };
export const WICKHOUSE: Pt = { x: 400, y: 1010 };
export const SHANTIES: Pt[] = [{ x: 170, y: 1040 }, { x: 215, y: 1182 }];
export const TAR_SHED: Pt = { x: 1010, y: 1000 };
export const KETTLES: Pt[] = [{ x: 955, y: 1062 }, { x: 1065, y: 1062 }];
export const ASSAY: Pt = { x: 1340, y: 430 };
export const CRANE_X = 1650;
/** Crane legs stand on the quay rails; the road runs between them. */
export const CRANE_LEGS: Pt[] = [
  { x: CRANE_X - 70, y: 1222 }, { x: CRANE_X + 70, y: 1222 }, { x: CRANE_X - 70, y: SEA_Y - 6 }, { x: CRANE_X + 70, y: SEA_Y - 6 },
];
/** Tip of the crane's jib (over the tanker) and the hook's rest point beneath it. */
const JIB_TIP: Pt = { x: CRANE_X + 30, y: 1170 };
const JIB_LIFT = 300;

export const NODDERS: { x: number; y: number; s: number; ph: number }[] = [
  { x: 520, y: 365, s: 1, ph: 0 },
  { x: 785, y: 300, s: 1.12, ph: 1.7 },
  { x: 1005, y: 392, s: 0.95, ph: 3.1 },
  { x: 1455, y: 1000, s: 1, ph: 4.4 },
  { x: 478, y: 1552, s: 0.82, ph: 2.2 },
  { x: 1988, y: 1552, s: 0.82, ph: 5.5 },
];
export const STACKS: Pt[] = [{ x: 1440, y: 1175 }, { x: 640, y: 662 }, { x: 2120, y: 1200 }, { x: 1090, y: 290 }];
export const LAMPS: Pt[] = [
  { x: 205, y: 752 }, { x: 620, y: 768 }, { x: 1110, y: 752 }, { x: 1300, y: 852 }, { x: 1700, y: 742 },
  { x: 2150, y: 752 }, { x: 1262, y: 558 }, { x: 1610, y: 652 }, { x: 1880, y: 650 }, { x: 1150, y: 1185 },
  { x: 1350, y: 1185 },
];
export const BOLLARDS: number[] = [60, 220, 380, 610, 820, 1020, 1400, 1540, 1780, 1900, 2120, 2290];
export const CRATES: Pt[] = [{ x: 1810, y: 1200 }, { x: 1850, y: 1180 }, { x: 600, y: 1205 }, { x: 2310, y: 900 }, { x: 1530, y: 870 }];
export const DRUMS: Pt[] = [
  { x: 1120, y: 1160 }, { x: 1890, y: 1205 }, { x: 180, y: 700 }, { x: 1580, y: 1140 }, { x: 1060, y: 700 },
  { x: 2340, y: 1030 }, { x: 730, y: 1170 },
];
/** Ground-level crude mains on sleepers, from the tank farm to the oil jetty and the weighhouse. */
export const PIPES: { a: Pt; b: Pt }[] = [
  { a: { x: 1300, y: 880 }, b: { x: 1300, y: 1160 } },
  { a: { x: 1450, y: 682 }, b: { x: 1960, y: 682 } },
];
export const PIPE_R = 9;

/** The walkway network — also where the crowd walks. */
export const ROADS: Pt[][] = [
  [{ x: 0, y: 800 }, { x: 260, y: 800 }, { x: 560, y: 822 }, { x: 900, y: 822 }, { x: 1200, y: 800 }],
  [{ x: 1200, y: 800 }, { x: 1600, y: 792 }, { x: 2050, y: 800 }, { x: 2330, y: 806 }],
  [{ x: 1200, y: 0 }, { x: 1200, y: 330 }, { x: 1200, y: 800 }],
  [{ x: 560, y: 822 }, { x: 560, y: 1000 }, { x: 520, y: 1214 }],
  [{ x: 1200, y: 800 }, { x: 1230, y: 1000 }, { x: 1250, y: 1214 }],
  [{ x: 2050, y: 800 }, { x: 2020, y: 1000 }, { x: 1990, y: 1214 }],
  [{ x: 1200, y: 604 }, { x: 1500, y: 612 }, { x: 1750, y: 598 }],
  [{ x: 1200, y: 462 }, { x: 950, y: 472 }, { x: 700, y: 486 }, { x: 470, y: 452 }],
];
const ROAD_W = 74;

/** Old, oily puddles baked into the ground; `animate` crawls their sheen. */
const PUDDLES: { x: number; y: number; rx: number; ry: number; seed: number }[] = [];
{
  const r = (n: number) => noise(n * 1.913 + 0.37);
  for (let i = 0; i < 46; i++) {
    const x = 60 + r(i) * (AREA_W - 120);
    const y = 150 + r(i + 100) * (1180 - 150);
    PUDDLES.push({ x, y, rx: 26 + r(i + 200) * 46, ry: 12 + r(i + 300) * 18, seed: i * 3.7 });
  }
  // Under every pump-jack's wellhead, and along the crude mains.
  for (const n of NODDERS) PUDDLES.push({ x: n.x - 70 * n.s, y: n.y + 10, rx: 34 * n.s, ry: 13 * n.s, seed: n.x * 0.01 });
  PUDDLES.push({ x: 1300, y: 1020, rx: 30, ry: 70, seed: 9.1 }, { x: 1700, y: 700, rx: 60, ry: 16, seed: 4.4 });
}

// ── Ground ──────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  // Tar flats: packed black cinder soaked with a century of spills.
  groundFill(g, { x: 0, y: 0, w: AREA_W, h: SEA_Y }, 0x1f1b17, 0x2a241e, 0x5a5048, rng, 1.2);
  for (let i = 0; i < 90; i++) blob(g, rng() * AREA_W, 130 + rng() * (SEA_Y - 200), 40 + rng() * 120, 18 + rng() * 50, CRUDE, 0.22 + rng() * 0.25, rng);
  // Rust-orange seep where the ground has drunk from leaking tanks.
  for (let i = 0; i < 24; i++) blob(g, 1950 + rng() * 450, 220 + rng() * 520, 20 + rng() * 60, 8 + rng() * 20, 0x4a2410, 0.22, rng);
  // Grey gravel apron round the refinery.
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.5 ? 0x4a4642 : 0x34302c, 0.6);
    g.fillCircle(1380 + rng() * 1020, 140 + rng() * 620, 1 + rng() * 1.8);
  }

  // Tank bund: a low concrete wall round the tank farm.
  g.lineStyle(10, 0x2e2c2a, 1); g.strokeRect(2080, 230, 330, 520);
  g.lineStyle(4, 0x5a5650, 1); g.strokeRect(2080, 230, 330, 520);
  safetyStripes(g, { x: 2076, y: 740, w: 60, h: 10 }, 0.7, 14);

  // Old capped wells: bolted iron discs in the ground, each with its own little spill.
  for (const c of [{ x: 640, y: 220 }, { x: 300, y: 300 }, { x: 900, y: 560 }, { x: 1580, y: 960 }, { x: 160, y: 470 }, { x: 1100, y: 560 }]) {
    crudePuddle(g, c.x + 8, c.y + 6, 26, c.x * 0.1);
    g.fillStyle(STEEL_DARK, 1); g.fillCircle(c.x, c.y, 15);
    g.fillStyle(STEEL, 1); g.fillCircle(c.x, c.y, 12);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.fillStyle(STEEL_LIT, 1); g.fillCircle(c.x + Math.cos(a) * 9, c.y + Math.sin(a) * 9, 1.6); }
    g.fillStyle(SAFETY_RED, 0.8); g.fillCircle(c.x, c.y, 4);
  }

  // Boardwalks.
  for (const pts of ROADS) boardwalk(g, pts, ROAD_W, rng);

  // The Barrel Tithe's apron: a stencilled Queen's mark households queue across, and queue rails.
  queensMark(g, WEIGHHOUSE.x, WEIGHHOUSE.y + 52, 34, 0xd8c070, 0.22);
  for (let i = 0; i < 5; i++) { g.fillStyle(SAFETY_WHITE, 0.4); g.fillRect(WEIGHHOUSE.x - 120 + i * 56, WEIGHHOUSE.y + 18, 30, 5); }

  // Puddles (static half — sheen crawls in animate).
  for (const p of PUDDLES) slick(g, p.x, p.y, p.rx, p.ry, p.seed, p.seed, 0.9);

  // Crude mains on sleepers.
  for (const p of PIPES) paintPipe(g, p.a, p.b);

  // ── The shore ──
  // The harbour: deep slate water under a skin of crude.
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y, AREA_W, AREA_H - SEA_Y);
  for (let i = 0; i < 70; i++) {
    g.fillStyle(rng() < 0.6 ? CRUDE : SEA_LIT, 0.35 + rng() * 0.3);
    g.fillPoints(blobPts(rng() * AREA_W, SEA_Y + 20 + rng() * (AREA_H - SEA_Y - 20), 50 + rng() * 140, 10 + rng() * 26, i * 1.3, 9, 0.4), true, true);
  }
  // Fixed slick bands on the water (moving ones are in animate).
  for (let i = 0; i < 26; i++) {
    const x = rng() * AREA_W, y = SEA_Y + 30 + rng() * (AREA_H - SEA_Y - 40);
    g.lineStyle(2, sheenAt(rng() * 6), 0.22);
    g.strokeEllipse(x, y, 60 + rng() * 120, 8 + rng() * 14);
  }
  // Sunk houses' walls under the surface, dim shapes below the roofs.
  for (const s of SUNK) {
    g.fillStyle(0x0a1418, 0.8); g.fillRect(s.x - s.w / 2, s.y - 12, s.w, 40);
    g.fillStyle(0x223238, 0.5);
    for (let k = 0; k < 3; k++) g.fillRect(s.x - s.w / 2 + 12 + k * (s.w / 3), s.y + 2, 14, 12);
  }
  // Pilings under the quay edge.
  for (let x = 10; x < AREA_W; x += 46) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, SEA_Y - 4, 12, 26);
    g.fillStyle(0x0a0d10, 0.7); g.fillEllipse(x + 6, SEA_Y + 22, 18, 6);
  }
  // The quay deck.
  planks(g, QUAY, true, rng);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, QUAY.y - 6, AREA_W, 8);
  g.fillStyle(TAR_LIT, 0.6); g.fillRect(0, QUAY.y - 6, AREA_W, 2);
  // Quay-edge cap timber, red-and-white at the jetty heads.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, SEA_Y - 8, AREA_W, 10);
  for (const p of PIERS) safetyStripes(g, { x: p.x - 16, y: SEA_Y - 10, w: p.w + 32, h: 10 }, 0.8, 16);
  // Crane rails running the length of the eastern quay.
  for (const ry of [1226, SEA_Y - 12]) {
    for (let x = 1380; x < 2320; x += 20) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, ry - 5, 8, 12); }
    g.fillStyle(STEEL_LIT, 1); g.fillRect(1380, ry - 1, 940, 3);
  }
  // Jetties.
  for (const p of PIERS) {
    g.fillStyle(0x000000, 0.4); g.fillRect(p.x + 6, p.y + 10, p.w, p.h);
    planks(g, p, false, rng);
    for (let y = p.y + 30; y < p.y + p.h; y += 60) {
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 6, y, 8, 14); g.fillRect(p.x + p.w - 2, y, 8, 14);
    }
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 4, p.y + p.h - 6, p.w + 8, 8);
  }
  // Loading hoses snaking down the oil jetty to the tanker.
  for (const k of [0, 1]) {
    const x0 = PIERS[1].x + 40 + k * 40;
    g.lineStyle(8, 0x0e0e10, 1);
    g.beginPath(); g.moveTo(x0, SEA_Y + 10);
    for (let y = SEA_Y + 10; y <= TANKER.y + 40; y += 10) g.lineTo(x0 + Math.sin(y * 0.05 + k) * 12 + (y - SEA_Y) * 0.6, y);
    g.strokePath();
  }
  // Spilt crude pooled across the quay boards, and oily footprints.
  for (let i = 0; i < 18; i++) crudePuddle(g, rng() * AREA_W, QUAY.y + 20 + rng() * 90, 10 + rng() * 22, i + 0.5, 0.8);
  for (let i = 0; i < 40; i++) {
    const x = rng() * AREA_W, y = QUAY.y + 10 + rng() * 100;
    g.fillStyle(CRUDE, 0.45); g.fillEllipse(x, y, 7, 4); g.fillEllipse(x + 10, y + 5, 7, 4);
  }
  // Coiled hawsers by the bollards.
  for (const bx of BOLLARDS) if (rng() < 0.6) hawserCoil(g, bx + 26, SEA_Y - 40, 12);

  // The north rim: refinery fence footing, and frost creeping in at the Rimefast gate.
  g.fillStyle(0x161412, 1); g.fillRect(0, 0, AREA_W, 116);
  for (let i = 0; i < 60; i++) {
    g.fillStyle(0xdfeaf0, 0.08 + rng() * 0.16);
    g.fillEllipse(1200 + (rng() - 0.5) * 300, 60 + rng() * 140, 10 + rng() * 40, 4 + rng() * 10);
  }
}

function paintPipe(g: G, a: Pt, b: Pt): void {
  const horiz = Math.abs(b.y - a.y) < Math.abs(b.x - a.x);
  const r = PIPE_R;
  const len = horiz ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  // Sleepers.
  for (let d = 10; d < len; d += 70) {
    g.fillStyle(TIMBER_DARK, 1);
    if (horiz) g.fillRect(x0 + d, a.y - r - 6, 12, r * 2 + 12); else g.fillRect(a.x - r - 6, y0 + d, r * 2 + 12, 12);
  }
  // The main: black-painted steel, crude weeping at the joints.
  g.fillStyle(0x000000, 0.35);
  if (horiz) g.fillRect(x0, a.y + r - 2, len, 6); else g.fillRect(a.x + r - 2, y0, 6, len);
  g.fillStyle(STEEL_DARK, 1);
  if (horiz) g.fillRect(x0, a.y - r, len, r * 2); else g.fillRect(a.x - r, y0, r * 2, len);
  g.fillStyle(0x2c3036, 1);
  if (horiz) g.fillRect(x0, a.y - r + 2, len, r * 2 - 5); else g.fillRect(a.x - r + 2, y0, r * 2 - 5, len);
  g.fillStyle(STEEL_LIT, 0.55);
  if (horiz) g.fillRect(x0, a.y - r * 0.5, len, 2); else g.fillRect(a.x - r * 0.5, y0, 2, len);
  for (let d = 60; d < len; d += 140) {
    const fx = horiz ? x0 + d : a.x, fy = horiz ? a.y : y0 + d;
    g.fillStyle(SAFETY_RED, 1);
    if (horiz) g.fillRect(fx - 4, fy - r - 2, 8, r * 2 + 4); else g.fillRect(fx - r - 2, fy - 4, r * 2 + 4, 8);
    g.fillStyle(CRUDE, 0.85); g.fillEllipse(fx + 3, fy + r + 4, 14, 5);
  }
}

// ── Set pieces ──────────────────────────────────────────────────────

function northFence(g: G): void {
  // Chain-link on iron posts, with a gap at the Rimefast road. Rime on the wire near the gate.
  for (const [x0, x1] of [[0, 1122], [1278, AREA_W]] as const) {
    g.fillStyle(0x000000, 0.3); g.fillRect(x0, 108, x1 - x0, 8);
    g.lineStyle(1, 0x6a7078, 0.55);
    for (let x = x0; x < x1; x += 10) { g.lineBetween(x, 40, x + 10, 108); g.lineBetween(x + 10, 40, x, 108); }
    for (let x = x0 + 4; x < x1; x += 90) {
      g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 3, 30, 6, 82);
      g.fillStyle(STEEL_LIT, 0.6); g.fillRect(x - 3, 30, 2, 82);
    }
    g.lineStyle(3, STEEL_DARK, 1); g.lineBetween(x0, 40, x1, 40); g.lineBetween(x0, 108, x1, 108);
    // Barbed coil along the top.
    g.lineStyle(1.2, 0x8a8a8a, 0.8);
    for (let x = x0; x < x1; x += 16) g.strokeCircle(x + 8, 32, 7);
  }
  // Frost on the wire either side of the gate.
  for (let i = 0; i < 40; i++) {
    const side = i % 2 ? -1 : 1;
    const x = 1200 + side * (82 + (i * 37) % 240);
    g.fillStyle(0xe8f4fa, 0.5 - ((i * 37) % 240) / 600); g.fillCircle(x, 40 + (i * 13) % 68, 1.5 + (i % 3));
  }
  // Gate posts: one painted with the Queen's mark, the other with a frost-white Rimefast arrow.
  for (const gx of [1110, 1290]) {
    g.fillStyle(STEEL_DARK, 1); g.fillRect(gx - 8, 0, 16, 116);
    safetyStripes(g, { x: gx - 6, y: 20, w: 12, h: 80 }, 0.85, 10);
  }
  g.fillStyle(0x1a1410, 1); g.fillRect(1040, 54, 54, 34);
  queensMark(g, 1067, 70, 12, LAMP_GOLD, 0.9);
  g.fillStyle(0x1a2a34, 1); g.fillRect(1306, 54, 64, 34);
  g.fillStyle(0xdff2ff, 1); g.fillTriangle(1320, 76, 1338, 60, 1356, 76); g.fillRect(1334, 74, 8, 10);
}

/** Lamphouse Hall: a crude storage tank gilded into a palace, the Queen's lamp burning on top. */
function lamphouse(g: G): void {
  const { x, y } = KEEP;
  const w = KEEP_W, h = 200;
  shadow(g, x, y + 6, w * 1.15, 46, 0.45);
  // Steps of black marble down to the apron.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? 0x2a2622 : 0x34302a, 1);
    g.fillRect(x - 70 + k * 8, y - 6 + k * 6 - 12, 140 - k * 16, 8);
  }
  // Tank body: black lacquer cylinder with gold bands.
  g.fillStyle(0x08070a, 1); g.fillRect(x - w / 2 - 3, y - h - 3, w + 6, h);
  g.fillStyle(0x16131a, 1); g.fillRect(x - w / 2, y - h, w, h - 4);
  g.fillStyle(0x0c0a0e, 1); g.fillEllipse(x, y - 4, w, 40);
  g.fillStyle(0x16131a, 1); g.fillEllipse(x, y - 8, w - 4, 34);
  // Curvature shading: dark edges, one lit strip.
  for (let k = 0; k < 6; k++) {
    g.fillStyle(0x000000, 0.08 * (6 - k)); g.fillRect(x - w / 2 + k * 6, y - h, 6, h - 10);
    g.fillStyle(0x000000, 0.08 * (6 - k)); g.fillRect(x + w / 2 - (k + 1) * 6, y - h, 6, h - 10);
  }
  g.fillStyle(0x3a3448, 0.6); g.fillRect(x - w * 0.28, y - h, 16, h - 14);
  // Gold-leaf bands with rivet studs.
  for (const by of [y - h + 18, y - h + 92, y - 36]) {
    g.fillStyle(GILT_DARK, 1); g.fillRect(x - w / 2, by - 6, w, 12);
    g.fillStyle(GILT, 1); g.fillRect(x - w / 2, by - 5, w, 7);
    g.fillStyle(lit(GILT, 0.4), 1); g.fillRect(x - w / 2, by - 5, w, 2);
    for (let sx = x - w / 2 + 10; sx < x + w / 2; sx += 20) { g.fillStyle(GILT_DARK, 1); g.fillCircle(sx, by + 4, 1.6); }
  }
  // A row of round porthole windows, gold-lit — the one building in Slickharbor that has light.
  for (let i = 0; i < 7; i++) {
    const wx = x - w / 2 + 40 + i * ((w - 80) / 6);
    const wy = y - h + 56;
    if (Math.abs(wx - x) < 40) continue;
    g.fillStyle(LAMP_GOLD, 0.12); g.fillCircle(wx, wy, 22);
    g.fillStyle(GILT_DARK, 1); g.fillCircle(wx, wy, 13);
    g.fillStyle(LAMP_GOLD, 0.95); g.fillCircle(wx, wy, 10);
    g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(wx - 10, wy, wx + 10, wy); g.lineBetween(wx, wy - 10, wx, wy + 10);
  }
  // Lower windows: tall and curtained.
  for (const sx of [-140, -90, 90, 140]) {
    g.fillStyle(GILT_DARK, 1); g.fillRoundedRect(x + sx - 13, y - 100, 26, 44, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(0xa83a4a, 1); g.fillRoundedRect(x + sx - 10, y - 97, 20, 40, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(LAMP_GOLD, 0.8); g.fillRect(x + sx - 3, y - 92, 6, 34);
  }
  // Grand door under a gilded arch, the Queen's mark over it.
  g.fillStyle(GILT_DARK, 1); g.fillRoundedRect(x - 36, y - 98, 72, 90, { tl: 36, tr: 36, bl: 0, br: 0 });
  g.fillStyle(GILT, 1); g.fillRoundedRect(x - 32, y - 94, 64, 86, { tl: 32, tr: 32, bl: 0, br: 0 });
  g.fillStyle(0x1a0e12, 1); g.fillRoundedRect(x - 26, y - 88, 52, 80, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.fillStyle(0x2a161c, 1); g.fillRect(x - 1, y - 84, 2, 76);
  g.fillStyle(GILT, 1); g.fillCircle(x - 8, y - 46, 2.4); g.fillCircle(x + 8, y - 46, 2.4);
  queensMark(g, x, y - 108, 14, LAMP_GOLD, 1);
  // Domed roof: the tank's roof, gilded, with a pipe-organ crown of gilt vent pipes.
  g.fillStyle(0x08070a, 1); g.fillEllipse(x, y - h, w + 10, 70);
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y - h - 4, w - 6, 64);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - h - 8, w - 40, 52);
  g.fillStyle(lit(GILT, 0.35), 0.7); g.fillEllipse(x - 70, y - h - 16, 120, 16);
  for (let i = -5; i <= 5; i++) {
    if (Math.abs(i) < 2) continue;
    const px = x + i * 30, ph = 30 + (5 - Math.abs(i)) * 9;
    g.fillStyle(GILT_DARK, 1); g.fillRect(px - 6, y - h - 18 - ph, 12, ph);
    g.fillStyle(GILT, 1); g.fillRect(px - 4, y - h - 18 - ph, 8, ph);
    g.fillStyle(0x16131a, 1); g.fillEllipse(px, y - h - 18 - ph, 12, 5);
  }
  // The lamp-cupola: a glass lantern room on a gilt drum. The flame inside is animated.
  const cy = y - h - 40;
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 40, cy - 16, 80, 22);
  g.fillStyle(GILT, 1); g.fillRect(x - 38, cy - 14, 76, 16);
  g.fillStyle(0x2a2418, 1); g.fillRect(x - 32, cy - 96, 64, 82);
  g.fillStyle(LAMP_GOLD, 0.35); g.fillRect(x - 28, cy - 92, 56, 76);
  g.lineStyle(3, GILT_DARK, 1);
  for (const k of [-28, -9, 10, 28]) g.lineBetween(x + k, cy - 92, x + k, cy - 16);
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 44, cy - 94, x + 44, cy - 94, x, cy - 140);
  g.fillStyle(GILT, 1); g.fillTriangle(x - 38, cy - 96, x + 38, cy - 96, x, cy - 134);
  g.fillStyle(GILT, 1); g.fillCircle(x, cy - 142, 6);
  // Crude-black drip running off the roof into gutters — the palace still leaks.
  for (const dx of [-170, -60, 120, 180]) {
    g.fillStyle(CRUDE, 0.85); g.fillRect(x + dx, y - h + 10, 4, 30 + ((dx * 7) % 23)); g.fillCircle(x + dx + 2, y - h + 42 + ((dx * 7) % 23), 3);
  }
}

function crackingTower(g: G): void {
  const { x, y } = CRACKER;
  shadow(g, x, y + 2, 120, 26);
  const hgt = 330;
  // The column, banded, with platforms and a ladder cage.
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 24, y - hgt, 48, hgt);
  g.fillStyle(STEEL, 1); g.fillRect(x - 20, y - hgt, 40, hgt);
  g.fillStyle(STEEL_LIT, 0.45); g.fillRect(x - 14, y - hgt, 6, hgt);
  for (let yy = y - hgt + 40; yy < y - 10; yy += 70) {
    g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 40, yy, 80, 6);
    g.lineStyle(1.5, STEEL_LIT, 0.8); g.lineBetween(x - 40, yy - 12, x + 40, yy - 12);
    for (let k = -40; k <= 40; k += 20) g.lineBetween(x + k, yy - 12, x + k, yy);
  }
  g.lineStyle(2, STEEL_DARK, 1);
  g.lineBetween(x + 26, y - 10, x + 26, y - hgt + 20); g.lineBetween(x + 36, y - 10, x + 36, y - hgt + 20);
  for (let yy = y - 20; yy > y - hgt + 20; yy -= 12) g.lineBetween(x + 26, yy, x + 36, yy);
  // Red-and-white crown band and a pressure stack.
  safetyStripes(g, { x: x - 20, y: y - hgt + 6, w: 40, h: 22 }, 1, 10);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 5, y - hgt - 30, 10, 32);
  // Base skirt and the transfer line to the Lamphouse.
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 32, y - 30, 64, 30);
  g.fillStyle(0x2c3036, 1); g.fillRect(x + 30, y - 70, 60, 10);
}

function flareStack(g: G): void {
  const { x, y } = FLARE;
  shadow(g, x, y + 2, 50, 14);
  // A thin guyed stack; the flame is in animateOver.
  g.lineStyle(1, 0x6a7078, 0.7);
  g.lineBetween(x, y - 360, x - 50, y); g.lineBetween(x, y - 360, x + 50, y); g.lineBetween(x, y - 240, x + 70, y);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 8, y - 380, 16, 380);
  g.fillStyle(STEEL, 1); g.fillRect(x - 5, y - 380, 10, 380);
  for (let yy = y - 360; yy < y; yy += 60) safetyStripes(g, { x: x - 6, y: yy, w: 12, h: 18 }, 0.9, 8);
  g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 11, y - 388, 22, 10);
  g.fillStyle(0x0a0a0a, 0.9); g.fillRect(x - 9, y - 396, 18, 8);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 16, y - 18, 32, 18);
}

function tank(g: G, t: { x: number; y: number; r: number; n: number }): void {
  const { x, y, r } = t;
  const h = r * 1.15, ry = r * 0.3;
  shadow(g, x, y + 4, r * 2.3, ry * 1.6, 0.4);
  g.fillStyle(0x1a1a1c, 1); g.fillRect(x - r - 2, y - h, r * 2 + 4, h);
  g.fillStyle(0x8a8e8a, 1); g.fillRect(x - r, y - h, r * 2, h);
  for (let k = 0; k < 8; k++) {
    g.fillStyle(0x000000, 0.05 * (8 - k)); g.fillRect(x - r + k * (r / 10), y - h, r / 10, h);
    g.fillStyle(0x000000, 0.05 * (8 - k)); g.fillRect(x + r - (k + 1) * (r / 10), y - h, r / 10, h);
  }
  g.fillStyle(0xd0d4d0, 0.35); g.fillRect(x - r * 0.45, y - h, r * 0.12, h);
  g.fillStyle(0x8a8e8a, 1); g.fillEllipse(x, y, r * 2, ry * 2);
  g.fillStyle(0x6a6e6a, 1); g.fillEllipse(x, y - h, r * 2, ry * 2);
  g.fillStyle(0x9a9e9a, 1); g.fillEllipse(x, y - h - 2, r * 1.9, ry * 1.8);
  // Weld rings and rust tears.
  g.lineStyle(1.5, 0x5a5e5a, 0.8);
  for (let k = 1; k < 4; k++) g.lineBetween(x - r, y - h + (h * k) / 4, x + r, y - h + (h * k) / 4);
  for (let i = 0; i < 9; i++) {
    const rx = x - r + 10 + ((i * 47) % (r * 2 - 20));
    g.fillStyle(RUST, 0.55); g.fillRect(rx, y - h + 6 + (i * 13) % 30, 3, 30 + (i * 17) % 40);
  }
  // Crude stain from an overfill down one side.
  g.fillStyle(CRUDE, 0.85);
  g.fillPoints([
    new Phaser.Geom.Point(x + r * 0.2, y - h), new Phaser.Geom.Point(x + r * 0.42, y - h),
    new Phaser.Geom.Point(x + r * 0.48, y - h * 0.3), new Phaser.Geom.Point(x + r * 0.3, y - h * 0.55), new Phaser.Geom.Point(x + r * 0.16, y - h * 0.2),
  ], true);
  // Spiral stair.
  g.lineStyle(2, 0x2a2a2a, 1);
  g.lineBetween(x - r + 6, y - 4, x - r * 0.2, y - h + 6);
  for (let k = 0; k < 10; k++) {
    const tt = k / 10;
    const sx = x - r + 6 + (r * 0.8 - 6) * tt, sy = y - 4 - (h - 10) * tt;
    g.lineBetween(sx, sy, sx - 7, sy + 3);
  }
  // Stencil.
  g.fillStyle(0x1a1a1a, 0.85); g.fillRect(x - r * 0.55, y - h * 0.62, r * 1.1, 26);
  queensMark(g, x - r * 0.35, y - h * 0.62 + 18, 8, LAMP_GOLD, 0.9);
  g.fillStyle(SAFETY_WHITE, 0.9);
  for (let k = 0; k < 5 + t.n; k++) g.fillRect(x - r * 0.18 + k * 9, y - h * 0.62 + 7, 6, 12);
}

function weldTank(g: G): void {
  const { x, y, r } = WELD_TANK;
  const h = r * 1.1, ry = r * 0.3;
  shadow(g, x, y + 4, r * 2.3, ry * 1.6, 0.4);
  // A tank half-replated: some courses steel, some bare ribs against the black interior.
  g.fillStyle(0x07080a, 1); g.fillRect(x - r, y - h, r * 2, h);
  g.fillStyle(0x07080a, 1); g.fillEllipse(x, y, r * 2, ry * 2);
  for (let c = 0; c < 4; c++) {
    const cy0 = y - h + (h * c) / 4;
    for (let p = 0; p < 6; p++) {
      if ((c * 3 + p * 5) % 7 < 2 && c < 3) continue;
      const px = x - r + (r * 2 * p) / 6;
      g.fillStyle(c === 0 ? 0x7a7e7a : mixC(0x8a8e8a, RUST, 0.2 * ((p + c) % 3)), 1);
      g.fillRect(px + 1, cy0 + 1, (r * 2) / 6 - 2, h / 4 - 2);
    }
  }
  // Ribs.
  g.lineStyle(3, 0x3a3e42, 1);
  for (let p = 0; p <= 6; p++) g.lineBetween(x - r + (r * 2 * p) / 6, y - h, x - r + (r * 2 * p) / 6, y);
  // Scaffold of poles and planks in front.
  g.lineStyle(3, 0x8a6a44, 1);
  for (const sx of [x - r - 14, x - r * 0.2, x + r * 0.6]) g.lineBetween(sx, y + 10, sx, y - h - 20);
  for (const sy of [y - h * 0.3, y - h * 0.68]) {
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - r - 20, sy, r * 1.7, 6);
    g.lineStyle(1.5, 0x6a4a2a, 1); g.lineBetween(x - r - 14, sy + 6, x - r * 0.2, sy - h * 0.32);
  }
  // Gas bottles chained to the scaffold.
  for (const bx of [x - r - 30, x - r - 18]) {
    g.fillStyle(bx < x - r - 20 ? 0x2a5a3a : SAFETY_RED, 1); g.fillRoundedRect(bx - 5, y - 44, 10, 42, 4);
    g.fillStyle(STEEL_LIT, 1); g.fillRect(bx - 2, y - 50, 4, 6);
  }
  safetyStripes(g, { x: x - r, y: y - 8, w: r * 2, h: 8 }, 0.7, 12);
}

function weighhouse(g: G, rng: () => number): void {
  const { x, y } = WEIGHHOUSE;
  const w = 280, h = 120;
  shadow(g, x, y + 4, w * 1.1, 30, 0.4);
  // Open-fronted shed of tarred boards on a timber frame.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 2);
  planks(g, { x: x - w / 2, y: y - h, w, h: 40 }, true, rng, 0x2e2620, 12);
  g.fillStyle(0x0c0a08, 1); g.fillRect(x - w / 2 + 14, y - h + 40, w - 28, h - 40);
  for (const px of [x - w / 2 + 4, x - w / 6, x + w / 6, x + w / 2 - 12]) {
    g.fillStyle(TIMBER, 1); g.fillRect(px, y - h + 36, 10, h - 36);
  }
  // Roof: corrugated iron, rust-streaked.
  g.fillStyle(0x2a2e32, 1); g.fillRect(x - w / 2 - 16, y - h - 22, w + 32, 24);
  g.lineStyle(1, 0x4a5056, 1);
  for (let k = x - w / 2 - 14; k < x + w / 2 + 16; k += 7) g.lineBetween(k, y - h - 22, k, y - h + 1);
  for (let i = 0; i < 8; i++) { g.fillStyle(RUST, 0.5); g.fillRect(x - w / 2 + rng() * w, y - h - 20, 3, 14 + rng() * 10); }
  // The great tithe balance inside: a beam with a drum on one pan and a gilt crown-weight on the other.
  const bx = x, by = y - h + 52;
  g.fillStyle(STEEL_DARK, 1); g.fillRect(bx - 4, by, 8, h - 56);
  g.fillStyle(GILT, 1); g.fillTriangle(bx - 10, by + 6, bx + 10, by + 6, bx, by - 6);
  const tilt = 0.12;
  const lx = bx - Math.cos(tilt) * 90, ly = by + Math.sin(tilt) * 90 - 4;
  const rx = bx + Math.cos(tilt) * 90, ryy = by - Math.sin(tilt) * 90 - 4;
  g.lineStyle(5, GILT_DARK, 1); g.lineBetween(lx, ly, rx, ryy);
  g.lineStyle(1.2, 0x8a8a8a, 1);
  for (const [px, py] of [[lx, ly], [rx, ryy]] as const) { g.lineBetween(px, py, px - 16, py + 26); g.lineBetween(px, py, px + 16, py + 26); }
  g.fillStyle(STEEL_DARK, 1); g.fillRect(lx - 20, ly + 26, 40, 4); g.fillRect(rx - 20, ryy + 26, 40, 4);
  oilDrum(g, lx, ly + 26, 10, 0x3a1e18, true);
  g.fillStyle(GILT, 1); g.fillRect(rx - 10, ryy + 14, 20, 12);
  g.fillTriangle(rx - 10, ryy + 14, rx - 4, ryy + 6, rx + 2, ryy + 14); g.fillTriangle(rx - 2, ryy + 14, rx + 4, ryy + 6, rx + 10, ryy + 14);
  // Sign board.
  g.fillStyle(0x0a0806, 1); g.fillRect(x - 96, y - h - 52, 192, 30);
  g.fillStyle(0x2a2014, 1); g.fillRect(x - 92, y - h - 49, 184, 24);
  queensMark(g, x - 76, y - h - 34, 8, LAMP_GOLD, 1);
  queensMark(g, x + 76, y - h - 34, 8, LAMP_GOLD, 1);
  g.fillStyle(LAMP_GOLD, 0.9);
  for (let k = 0; k < 11; k++) g.fillRect(x - 56 + k * 10.5, y - h - 44, 7, 13);
  // Tally board of household names, most of them struck through.
  g.fillStyle(0xd8d0bc, 1); g.fillRect(x + w / 2 - 70, y - h + 50, 48, 56);
  g.lineStyle(1, 0x2a2420, 1);
  for (let k = 0; k < 9; k++) {
    const ly2 = y - h + 56 + k * 5.6;
    g.lineBetween(x + w / 2 - 66, ly2, x + w / 2 - 30 - (k % 3) * 6, ly2);
  }
  g.lineStyle(1.5, SAFETY_RED, 0.9);
  for (const k of [1, 2, 4, 5, 7, 8]) g.lineBetween(x + w / 2 - 68, y - h + 56 + k * 5.6, x + w / 2 - 26, y - h + 55 + k * 5.6);
  // Tithe drums queued at the front.
  for (let i = 0; i < 4; i++) oilDrum(g, x - 110 + i * 22, y + 2, 9, i % 2 ? 0x3a1e18 : 0x2a2a30, true);
}

function slopChest(g: G, rng: () => number): void {
  const { x, y } = SHOP;
  const w = 180, h = 110;
  shadow(g, x, y + 4, w * 1.1, 26);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 2);
  planks(g, { x: x - w / 2, y: y - h, w, h }, false, rng, 0x36505a, 14);
  // Roof of salvaged sailcloth over a ridge pole, tar-patched.
  g.fillStyle(0x4a3a26, 1); g.fillTriangle(x - w / 2 - 14, y - h + 2, x + w / 2 + 14, y - h + 2, x, y - h - 56);
  g.fillStyle(0x8a7a5a, 1); g.fillTriangle(x - w / 2 - 8, y - h, x + w / 2 + 8, y - h, x, y - h - 50);
  g.fillStyle(TAR, 0.8); g.fillRect(x - 40, y - h - 24, 22, 14); g.fillRect(x + 26, y - h - 12, 18, 10);
  // Big window full of hanging oilskins and a brass compass.
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 76, y - 84, 70, 50);
  g.fillStyle(LAMP_GOLD, 0.35); g.fillRect(x - 72, y - 80, 62, 42);
  for (let k = 0; k < 3; k++) {
    g.fillStyle(0xe8c040, 1); g.fillTriangle(x - 66 + k * 20, y - 78, x - 54 + k * 20, y - 78, x - 60 + k * 20, y - 44);
    g.fillRect(x - 64 + k * 20, y - 78, 8, 26);
  }
  g.fillStyle(GILT, 1); g.fillCircle(x + 48, y - 64, 12);
  g.fillStyle(0xe8e0c8, 1); g.fillCircle(x + 48, y - 64, 9);
  g.lineStyle(1.5, SAFETY_RED, 1); g.lineBetween(x + 48, y - 64, x + 52, y - 71);
  // Door.
  g.fillStyle(0x1a1410, 1); g.fillRect(x + 4, y - 50, 28, 50);
  g.fillStyle(0x5a3a22, 1); g.fillRect(x + 7, y - 47, 22, 47);
  // Sign: a sea-chest on a bracket.
  g.lineStyle(2, STEEL_DARK, 1); g.lineBetween(x + w / 2, y - h + 10, x + w / 2 + 34, y - h + 10);
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x + w / 2 + 12, y - h + 14, 30, 20);
  g.fillStyle(0x8a6a3a, 1); g.fillRect(x + w / 2 + 12, y - h + 14, 30, 6);
  g.fillStyle(GILT, 1); g.fillRect(x + w / 2 + 25, y - h + 19, 4, 6);
  // Oars and a lifebuoy hung on the wall.
  g.lineStyle(4, 0x8a6a44, 1); g.lineBetween(x - w / 2 + 8, y - 6, x - w / 2 + 20, y - h + 6);
  g.lineStyle(6, SAFETY_WHITE, 1); g.strokeCircle(x + 70, y - 30, 12);
  g.lineStyle(6, SAFETY_RED, 1);
  for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + 70, y - 30, 12, k * Math.PI / 2, k * Math.PI / 2 + 0.6, false); g.strokePath(); }
}

/** The Bilge & Biscuit: a seamen's galley under an upturned boat for a roof. */
function galley(g: G, rng: () => number): void {
  const { x, y } = GALLEY;
  const w = 190, h = 70;
  shadow(g, x, y + 4, w * 1.15, 28);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 6, y - h, w - 12, h);
  planks(g, { x: x - w / 2 + 8, y: y - h, w: w - 16, h }, true, rng, 0x4a3a2e, 12);
  // The hull, keel up.
  g.fillStyle(0x16202a, 1);
  g.fillPoints([
    new Phaser.Geom.Point(x - w / 2 - 22, y - h + 6), new Phaser.Geom.Point(x - w / 2 + 10, y - h - 58),
    new Phaser.Geom.Point(x + w / 2 - 10, y - h - 58), new Phaser.Geom.Point(x + w / 2 + 30, y - h + 6),
  ], true);
  g.fillStyle(0x2a4a5a, 1);
  g.fillPoints([
    new Phaser.Geom.Point(x - w / 2 - 14, y - h + 2), new Phaser.Geom.Point(x - w / 2 + 14, y - h - 52),
    new Phaser.Geom.Point(x + w / 2 - 12, y - h - 52), new Phaser.Geom.Point(x + w / 2 + 22, y - h + 2),
  ], true);
  g.lineStyle(1.5, 0x16202a, 1);
  for (let k = 1; k < 5; k++) g.lineBetween(x - w / 2 - 14 + k * 6, y - h + 2 - k * 10.8, x + w / 2 + 22 - k * 6.8, y - h + 2 - k * 10.8);
  g.fillStyle(SAFETY_RED, 1); g.fillRect(x - w / 2 - 18, y - h, w + 44, 6);
  g.fillStyle(0x0c0e10, 1); g.fillRect(x - w / 2 + 10, y - h - 62, w - 22, 6);
  // Stovepipe out through the hull, and a window glowing dull (they cook on scraps).
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x + 46, y - h - 92, 10, 40);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 64, y - 52, 40, 30);
  g.fillStyle(0xd07a3a, 0.55); g.fillRect(x - 61, y - 49, 34, 24);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 46, y - 49, 2, 24);
  // Door and a chalked menu board.
  g.fillStyle(0x1a1410, 1); g.fillRect(x + 4, y - 48, 26, 48);
  g.fillStyle(0x5a3a22, 1); g.fillRect(x + 7, y - 45, 20, 45);
  g.fillStyle(0x1a1a1a, 1); g.fillRect(x + 44, y - 46, 34, 40);
  g.lineStyle(1, 0xe8e8e8, 0.7);
  for (let k = 0; k < 4; k++) g.lineBetween(x + 48, y - 40 + k * 8, x + 72 - (k % 2) * 8, y - 40 + k * 8);
  // A string of drying catfish under the eave.
  for (let k = 0; k < 5; k++) {
    const fx = x - 80 + k * 14;
    g.lineStyle(1, 0x8a7a5a, 1); g.lineBetween(fx, y - h + 4, fx, y - h + 14);
    g.fillStyle(0x3a3020, 1); g.fillEllipse(fx, y - h + 20, 6, 14);
  }
}

function wickhouse(g: G, rng: () => number): void {
  const { x, y } = WICKHOUSE;
  const w = 140, h = 88;
  shadow(g, x, y + 4, w * 1.1, 24);
  // On short stilts, tar-paper over planks.
  for (const sx of [-60, -20, 20, 60]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + sx - 3, y - 14, 6, 14); }
  g.fillStyle(0x0c0c0e, 1); g.fillRect(x - w / 2 - 2, y - h - 14, w + 4, h + 2);
  g.fillStyle(0x24262a, 1); g.fillRect(x - w / 2, y - h - 12, w, h - 2);
  g.lineStyle(1, 0x3a3c42, 1);
  for (let k = y - h - 4; k < y - 14; k += 14) g.lineBetween(x - w / 2, k, x + w / 2, k);
  for (let i = 0; i < 10; i++) { g.fillStyle(0x34363c, 0.7); g.fillRect(x - w / 2 + rng() * (w - 20), y - h - 8 + rng() * (h - 30), 20, 10); }
  tidemarks(g, x - w / 2, x + w / 2, y - 44, 3);
  // Slant roof.
  g.fillStyle(0x161618, 1); g.fillTriangle(x - w / 2 - 8, y - h - 12, x + w / 2 + 8, y - h - 12, x + w / 2 + 8, y - h - 44);
  // Window with an unlit lamp in it — Ma makes wicks for lamps she can't fill.
  g.fillStyle(0x0a0a0a, 1); g.fillRect(x - 46, y - h + 10, 30, 26);
  g.fillStyle(0x2a3a44, 1); g.fillRect(x - 43, y - h + 13, 24, 20);
  g.fillStyle(0x6a6a6a, 1); g.fillRect(x - 34, y - h + 24, 6, 8); g.fillRect(x - 36, y - h + 30, 10, 3);
  // Door.
  g.fillStyle(0x0a0a0a, 1); g.fillRect(x + 12, y - h + 18, 24, h - 32);
  // Racks of drying wicks out front.
  g.lineStyle(2, 0x8a6a44, 1); g.lineBetween(x - w / 2 - 30, y - 50, x - w / 2 - 30, y); g.lineBetween(x - w / 2 - 6, y - 50, x - w / 2 - 6, y);
  g.lineBetween(x - w / 2 - 32, y - 48, x - w / 2 - 4, y - 48);
  for (let k = 0; k < 6; k++) { g.lineStyle(1.5, 0xe8dcc0, 1); g.lineBetween(x - w / 2 - 28 + k * 4.4, y - 48, x - w / 2 - 28 + k * 4.4, y - 30 + (k % 2) * 4); }
}

function shanty(g: G, p: Pt, rng: () => number, idx: number): void {
  const w = 120, h = 80;
  shadow(g, p.x, p.y + 4, w * 1.1, 22);
  // Tall stilts — the tide comes this high.
  for (const sx of [-50, -16, 16, 50]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x + sx - 3, p.y - 34, 6, 34); }
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(p.x - 50, p.y - 30, p.x + 50, p.y - 6);
  const wy = p.y - 34;
  g.fillStyle(0x0c0c0e, 1); g.fillRect(p.x - w / 2 - 2, wy - h - 2, w + 4, h + 2);
  g.fillStyle(idx % 2 ? 0x3a3028 : 0x2a3034, 1); g.fillRect(p.x - w / 2, wy - h, w, h);
  for (let i = 0; i < 9; i++) { g.fillStyle(rng() < 0.5 ? 0x1a1a1c : 0x4a4038, 0.7); g.fillRect(p.x - w / 2 + rng() * (w - 22), wy - h + 4 + rng() * (h - 16), 22, 12); }
  tidemarks(g, p.x - w / 2, p.x + w / 2, wy - 30, 3);
  g.fillStyle(0x161414, 1); g.fillTriangle(p.x - w / 2 - 8, wy - h, p.x + w / 2 + 8, wy - h, p.x, wy - h - 38);
  g.fillStyle(0x0a0a0a, 1); g.fillRect(p.x - 34, wy - h + 18, 20, 18);
  g.fillStyle(0x0a0a0a, 1); g.fillRect(p.x + 10, wy - 40, 22, 40);
  // Ladder down from the door.
  g.lineStyle(2, 0x6a5038, 1); g.lineBetween(p.x + 14, wy, p.x + 12, p.y); g.lineBetween(p.x + 28, wy, p.x + 30, p.y);
  for (let k = 1; k < 4; k++) g.lineBetween(p.x + 13, wy + k * 8.5, p.x + 29, wy + k * 8.5);
  // Washing on a line: everything grey with oil.
  g.lineStyle(1, 0x8a8a8a, 1); g.lineBetween(p.x - w / 2, wy - h + 6, p.x - w / 2 - 40, wy - h + 26);
  for (let k = 0; k < 3; k++) { g.fillStyle(0x6a6460, 1); g.fillRect(p.x - w / 2 - 10 - k * 12, wy - h + 10 + k * 5, 9, 14); }
}

function sunkHouse(g: G, s: { x: number; y: number; w: number }, i: number): void {
  // Only the roof shows. Water laps the eaves; a chimney and a cormorant drying its wings.
  g.fillStyle(0x0a1014, 1); g.fillTriangle(s.x - s.w / 2 - 6, s.y, s.x + s.w / 2 + 6, s.y, s.x, s.y - s.w * 0.36);
  g.fillStyle(0x24282a, 1); g.fillTriangle(s.x - s.w / 2, s.y - 2, s.x + s.w / 2, s.y - 2, s.x, s.y - s.w * 0.32);
  g.lineStyle(1, 0x3a3e40, 1);
  for (let k = 1; k < 4; k++) g.lineBetween(s.x - (s.w / 2) * (1 - k / 4), s.y - 2 - s.w * 0.32 * (k / 4), s.x + (s.w / 2) * (1 - k / 4), s.y - 2 - s.w * 0.32 * (k / 4));
  g.fillStyle(0x1a1a1a, 1); g.fillRect(s.x + s.w * 0.18, s.y - s.w * 0.36, 10, 20);
  // Tidemark crust on the roof.
  g.lineStyle(2, 0x9ab8c0, 0.4); g.lineBetween(s.x - s.w / 2 + 4, s.y - 6, s.x + s.w / 2 - 4, s.y - 6);
  // Water line.
  g.fillStyle(SEA, 1); g.fillEllipse(s.x, s.y + 2, s.w + 24, 10);
  g.lineStyle(1.5, SEA_LIT, 0.6); g.strokeEllipse(s.x, s.y + 1, s.w + 18, 8);
  if (i !== 1) {
    // Cormorant, black with oil, wings spread to dry.
    const bx = s.x - s.w * 0.05, by = s.y - s.w * 0.33;
    g.fillStyle(0x0a0a0a, 1); g.fillEllipse(bx, by - 6, 8, 14);
    g.fillTriangle(bx - 3, by - 10, bx - 22, by - 18, bx - 14, by - 2);
    g.fillTriangle(bx + 3, by - 10, bx + 22, by - 18, bx + 14, by - 2);
    g.fillCircle(bx, by - 15, 3.4);
    g.fillStyle(0xe8a030, 1); g.fillTriangle(bx + 2, by - 16, bx + 8, by - 15, bx + 2, by - 14);
  }
}

function tarShed(g: G, rng: () => number): void {
  const { x, y } = TAR_SHED;
  const w = 150, h = 90;
  shadow(g, x, y + 4, w * 1.1, 24);
  // Lean-to of black boards, sides open, everything dripping tar.
  g.fillStyle(0x0a0a0c, 1); g.fillRect(x - w / 2, y - h, w, h);
  planks(g, { x: x - w / 2 + 4, y: y - h + 4, w: w - 8, h: h - 30 }, false, rng, 0x1a1a1e, 12);
  for (const px of [x - w / 2, x + w / 2 - 8]) { g.fillStyle(0x2a2a2e, 1); g.fillRect(px, y - h, 8, h); }
  g.fillStyle(0x121214, 1); g.fillTriangle(x - w / 2 - 14, y - h + 4, x + w / 2 + 14, y - h + 4, x + w / 2 + 14, y - h - 30);
  // Tar icicles along the eave.
  for (let k = 0; k < 14; k++) {
    const dx = x - w / 2 - 8 + k * 12;
    g.fillStyle(TAR, 1); g.fillTriangle(dx - 3, y - h + 4, dx + 3, y - h + 4, dx, y - h + 14 + (k * 7) % 12);
  }
  // Barrels of pitch inside, tools on the wall.
  for (let k = 0; k < 3; k++) oilDrum(g, x - 40 + k * 26, y - 6, 9, 0x141416);
  g.lineStyle(2.5, 0x6a4a2a, 1); g.lineBetween(x + 40, y - 20, x + 52, y - 70);
  g.fillStyle(TAR, 1); g.fillEllipse(x + 53, y - 72, 14, 8);
}

function kettle(g: G, p: Pt): void {
  // A cast-iron cauldron on a brick fire-ring.
  shadow(g, p.x, p.y + 3, 60, 16);
  g.fillStyle(0x3a1e16, 1); g.fillEllipse(p.x, p.y, 54, 18);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI;
    g.fillStyle(k % 2 ? 0x6a3a26 : 0x5a2e1e, 1); g.fillRect(p.x - 26 + k * 6.5, p.y - 8 + Math.sin(a) * 2, 6, 10);
  }
  g.fillStyle(FLAME, 0.6); g.fillEllipse(p.x, p.y - 4, 30, 8);
  g.fillStyle(0x0e0e10, 1); g.fillEllipse(p.x, p.y - 22, 48, 36);
  g.fillStyle(0x1e1e22, 1); g.fillEllipse(p.x - 4, p.y - 26, 36, 24);
  g.fillStyle(0x0e0e10, 1); g.fillEllipse(p.x, p.y - 36, 50, 14);
  g.fillStyle(TAR, 1); g.fillEllipse(p.x, p.y - 37, 42, 10);
  g.lineStyle(2, 0x2a2a2e, 1); g.beginPath(); g.arc(p.x, p.y - 36, 26, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
}

function assayHut(g: G, rng: () => number): void {
  const { x, y } = ASSAY;
  const w = 110, h = 80;
  shadow(g, x, y + 4, w * 1.1, 22);
  g.fillStyle(0x1a1c1e, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 2);
  planks(g, { x: x - w / 2, y: y - h, w, h }, true, rng, 0x5a6a6a, 10);
  g.fillStyle(0x2a3034, 1); g.fillRect(x - w / 2 - 8, y - h - 12, w + 16, 14);
  // Window rack of sample flasks — each a stripe of crude, water and sheen.
  g.fillStyle(0x0a0a0a, 1); g.fillRect(x - 46, y - 64, 56, 34);
  g.fillStyle(0xbfd8e0, 0.4); g.fillRect(x - 43, y - 61, 50, 28);
  for (let k = 0; k < 5; k++) {
    const fx = x - 38 + k * 10;
    g.fillStyle(0xd8e8f0, 0.7); g.fillRect(fx - 3, y - 58, 6, 22);
    g.fillStyle(k % 2 ? CRUDE : 0x4a7a8a, 1); g.fillRect(fx - 3, y - 46, 6, 10);
    g.fillStyle(sheenAt(k * 1.3), 0.9); g.fillRect(fx - 3, y - 47, 6, 2);
  }
  g.fillStyle(0x0a0a0a, 1); g.fillRect(x + 20, y - 50, 22, 50);
  // A brass sounding-weight on a line by the door.
  g.lineStyle(1, 0x8a8a8a, 1); g.lineBetween(x + w / 2 + 6, y - h + 4, x + w / 2 + 6, y - 30);
  g.fillStyle(GILT, 1); g.fillTriangle(x + w / 2 + 1, y - 30, x + w / 2 + 11, y - 30, x + w / 2 + 6, y - 16);
}

function nodderFrame(g: G, n: { x: number; y: number; s: number }): void {
  pumpFrame(g, n.x, n.y, n.s);
}

function barrelStack(g: G, p: Pt): void {
  // A pyramid of drums on their sides: 4, 3, 2.
  shadow(g, p.x, p.y + 2, 130, 22, 0.4);
  const r = 13;
  const colours = [0x3a1e18, 0x2a2a30, 0x1e3a2a, 0x3a1e18, SAFETY_RED];
  let n = 0;
  for (let row = 0; row < 3; row++) {
    const count = 4 - row;
    for (let i = 0; i < count; i++) {
      const bx = p.x - ((count - 1) * r * 2.05) / 2 + i * r * 2.05;
      const by = p.y - r - row * r * 1.8;
      drumEnd(g, bx, by, r, colours[(n++ * 7 + p.x) % colours.length]);
    }
  }
  // A chock of timber either side and crude pooled under the bottom row.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - r * 4.4, p.y - 8, 10, 8); g.fillRect(p.x + r * 4.4 - 10, p.y - 8, 10, 8);
}

/** One crane leg: a red-cored lattice strut from its rail bogie up to the portal beam. */
function craneLeg(g: G, l: Pt, front: boolean): void {
  const x = CRANE_X;
  const top = 1222 - JIB_LIFT;
  g.lineStyle(front ? 12 : 9, STEEL_DARK, 1); g.lineBetween(l.x, l.y, l.x + (l.x < x ? 24 : -24), top + 40);
  g.lineStyle(front ? 6 : 4, SAFETY_RED, 1); g.lineBetween(l.x, l.y, l.x + (l.x < x ? 24 : -24), top + 40);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(l.x - 14, l.y - 10, 28, 12);
  g.fillStyle(0x0a0a0a, 1); g.fillCircle(l.x - 7, l.y, 4); g.fillCircle(l.x + 7, l.y, 4);
}

/**
 * The gantry crane over the quay — the back legs, portal, cab and jib. The front pair of legs is
 * its own piece further south, so anyone walking the quay road passes between the two pairs.
 */
function crane(g: G): void {
  const x = CRANE_X;
  const top = 1222 - JIB_LIFT;
  shadow(g, x, SEA_Y - 2, 200, 30, 0.35);
  craneLeg(g, CRANE_LEGS[0], false);
  craneLeg(g, CRANE_LEGS[1], false);
  // Cross-bracing between the leg pairs, high up.
  g.lineStyle(3, STEEL_DARK, 1);
  g.lineBetween(x - 56, top + 120, x + 56, top + 70); g.lineBetween(x - 56, top + 70, x + 56, top + 120);
  // Portal beam and machinery house.
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 66, top + 30, 132, 18);
  safetyStripes(g, { x: x - 62, y: top + 33, w: 124, h: 12 }, 0.9, 14);
  g.fillStyle(0x1a1c1e, 1); g.fillRect(x - 46, top - 40, 92, 72);
  g.fillStyle(0x3a4044, 1); g.fillRect(x - 42, top - 36, 84, 64);
  g.fillStyle(SAFETY_RED, 1); g.fillRect(x - 42, top - 36, 84, 10);
  // The cab window with Hoyle's lamp in it.
  g.fillStyle(0x0a0a0a, 1); g.fillRect(x - 32, top - 18, 40, 24);
  g.fillStyle(LAMP_GOLD, 0.65); g.fillRect(x - 29, top - 15, 34, 18);
  // A great horseshoe magnet bolted to the cab — Hoyle's own fixture.
  g.lineStyle(7, SAFETY_RED, 1); g.beginPath(); g.arc(x + 26, top - 4, 9, Math.PI, 0, true); g.strokePath();
  g.fillStyle(STEEL_LIT, 1); g.fillRect(x + 13, top - 6, 7, 6); g.fillRect(x + 32, top - 6, 7, 6);
  // Jib: a lattice boom out over the water to the tip.
  const jx = JIB_TIP.x, jy = JIB_TIP.y - JIB_LIFT;
  g.lineStyle(5, STEEL_DARK, 1); g.lineBetween(x, top - 30, jx + 150, jy - 20); g.lineBetween(x, top - 10, jx + 150, jy);
  g.lineStyle(2, SAFETY_RED, 1);
  for (let k = 0; k < 10; k++) {
    const t0 = k / 10, t1 = (k + 1) / 10;
    g.lineBetween(x + (jx + 150 - x) * t0, top - 30 + (jy - 20 - top + 30) * t0, x + (jx + 150 - x) * t1, top - 10 + (jy - top + 10) * t1);
  }
  g.fillStyle(STEEL_DARK, 1); g.fillRect(jx + 140, jy - 26, 20, 30);
  // Counter-jib with concrete counterweight to the north.
  g.lineStyle(5, STEEL_DARK, 1); g.lineBetween(x, top - 20, x - 110, top - 40);
  g.fillStyle(0x6a6a66, 1); g.fillRect(x - 130, top - 52, 40, 30);
  g.lineStyle(1.5, 0x2a2a2a, 1); g.strokeRect(x - 130, top - 52, 40, 30);
}

function craneFront(g: G): void {
  craneLeg(g, CRANE_LEGS[2], true);
  craneLeg(g, CRANE_LEGS[3], true);
}

function tanker(g: G): void {
  const r = TANKER;
  const cy = r.y + r.h / 2;
  // Hull: long black body, red boot-top at the waterline, rust bleeding from the hawse.
  g.fillStyle(0x000000, 0.45); g.fillEllipse(r.x + r.w / 2 + 8, r.y + r.h - 4, r.w + 30, 30);
  g.fillStyle(0x0a0a0c, 1);
  g.fillPoints([
    new Phaser.Geom.Point(r.x, cy - 46), new Phaser.Geom.Point(r.x + r.w - 70, r.y), new Phaser.Geom.Point(r.x + r.w, cy),
    new Phaser.Geom.Point(r.x + r.w - 70, r.y + r.h), new Phaser.Geom.Point(r.x, cy + 50),
  ], true);
  g.fillStyle(0x1a1c20, 1);
  g.fillPoints([
    new Phaser.Geom.Point(r.x + 8, cy - 40), new Phaser.Geom.Point(r.x + r.w - 76, r.y + 8), new Phaser.Geom.Point(r.x + r.w - 10, cy),
    new Phaser.Geom.Point(r.x + r.w - 76, r.y + r.h - 8), new Phaser.Geom.Point(r.x + 8, cy + 44),
  ], true);
  g.fillStyle(SAFETY_RED, 0.85); g.fillRect(r.x + 10, r.y + r.h - 24, r.w - 100, 6);
  // Deck: tank hatches in a row, pipe run down the centre.
  g.fillStyle(0x2e3236, 1); g.fillRect(r.x + 30, cy - 24, r.w - 140, 48);
  g.lineStyle(4, STEEL_DARK, 1); g.lineBetween(r.x + 30, cy, r.x + r.w - 110, cy);
  for (let k = 0; k < 6; k++) {
    const hx = r.x + 70 + k * 56;
    g.fillStyle(STEEL_DARK, 1); g.fillCircle(hx, cy - 12, 11);
    g.fillStyle(STEEL, 1); g.fillCircle(hx, cy - 12, 8);
    g.fillStyle(CRUDE, 0.8); g.fillEllipse(hx + 6, cy - 2, 10, 4);
  }
  // Stern house with a funnel bearing the Queen's mark.
  g.fillStyle(0xe6e0d4, 1); g.fillRect(r.x + 4, cy - 40, 54, 80);
  g.fillStyle(0x9a948a, 1); g.fillRect(r.x + 4, cy + 20, 54, 20);
  for (let k = 0; k < 3; k++) { g.fillStyle(0x2a3a44, 1); g.fillRect(r.x + 10 + k * 16, cy - 30, 10, 8); }
  g.fillStyle(0x0a0a0a, 1); g.fillRect(r.x + 18, cy - 70, 26, 34);
  g.fillStyle(SAFETY_RED, 1); g.fillRect(r.x + 18, cy - 62, 26, 10);
  queensMark(g, r.x + 31, cy - 46, 7, LAMP_GOLD, 1);
  // Rust weeping from the hawse pipe and anchor chain into the water.
  g.fillStyle(RUST, 0.65); g.fillRect(r.x + r.w - 96, r.y + 16, 6, 40);
  g.lineStyle(3, 0x3a3a3a, 1); g.lineBetween(r.x + r.w - 92, r.y + 20, r.x + r.w - 60, r.y - 10);
  // Name on the bow.
  g.fillStyle(SAFETY_WHITE, 0.85);
  for (let k = 0; k < 9; k++) g.fillRect(r.x + r.w - 210 + k * 9, r.y + r.h - 40, 6, 9);
}

/** The welding berth's scrap pile and torch cart next to the weld tank. */
function torchCart(g: G): void {
  const x = WELD_TANK.x - 150, y = WELD_TANK.y + 26;
  shadow(g, x, y + 2, 60, 14);
  g.fillStyle(STEEL_DARK, 1); g.fillRect(x - 22, y - 30, 44, 26);
  g.fillStyle(0x0a0a0a, 1); g.fillCircle(x - 14, y - 2, 6); g.fillCircle(x + 14, y - 2, 6);
  g.fillStyle(0x2a5a3a, 1); g.fillRoundedRect(x - 18, y - 70, 14, 42, 5);
  g.fillStyle(SAFETY_RED, 1); g.fillRoundedRect(x + 2, y - 66, 14, 38, 5);
  g.lineStyle(2, 0x1a1a1a, 1);
  g.beginPath(); g.moveTo(x - 11, y - 70); g.lineTo(x - 30, y - 80); g.lineTo(x - 50, y - 40); g.lineTo(x - 64, y - 30); g.strokePath();
  // Scrap: cut plate offcuts.
  for (let k = 0; k < 5; k++) {
    g.fillStyle(k % 2 ? 0x6a6e6a : RUST, 1);
    g.fillRect(x + 30 + k * 9, y - 10 - (k % 3) * 6, 18, 8);
  }
}

function makePieces(): NonNullable<AreaPainter['pieces']> {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  pieces.push({ x: 1200, y: 116, w: AREA_W, h: 130, draw: (g) => northFence(g) });
  pieces.push({ x: KEEP.x, y: KEEP.y, w: KEEP_W + 60, h: 420, draw: (g) => lamphouse(g) });
  pieces.push({ x: CRACKER.x, y: CRACKER.y, w: 120, h: 380, draw: (g) => crackingTower(g) });
  pieces.push({ x: FLARE.x, y: FLARE.y, w: 150, h: 420, draw: (g) => flareStack(g) });
  for (const t of TANKS) pieces.push({ x: t.x, y: t.y + t.r * 0.3, w: t.r * 2.4, h: t.r * 1.8, draw: (g) => tank(g, t) });
  pieces.push({ x: WELD_TANK.x, y: WELD_TANK.y + 8, w: WELD_TANK.r * 2.8, h: WELD_TANK.r * 1.6, draw: (g) => weldTank(g) });
  pieces.push({ x: WELD_TANK.x - 150, y: WELD_TANK.y + 28, w: 140, h: 100, draw: (g) => torchCart(g) });
  pieces.push({ x: WEIGHHOUSE.x, y: WEIGHHOUSE.y, w: 330, h: 200, draw: (g, rng) => weighhouse(g, rng) });
  pieces.push({ x: SHOP.x, y: SHOP.y, w: 270, h: 190, draw: (g, rng) => slopChest(g, rng) });
  pieces.push({ x: GALLEY.x, y: GALLEY.y, w: 260, h: 180, draw: (g, rng) => galley(g, rng) });
  pieces.push({ x: WICKHOUSE.x, y: WICKHOUSE.y, w: 230, h: 150, draw: (g, rng) => wickhouse(g, rng) });
  SHANTIES.forEach((s, i) => pieces.push({ x: s.x, y: s.y, w: 220, h: 170, draw: (g, rng) => shanty(g, s, rng, i) }));
  SUNK.forEach((s, i) => pieces.push({ x: s.x, y: s.y + 4, w: s.w + 50, h: 60, draw: (g) => sunkHouse(g, s, i) }));
  pieces.push({ x: TAR_SHED.x, y: TAR_SHED.y, w: 190, h: 140, draw: (g, rng) => tarShed(g, rng) });
  for (const k of KETTLES) pieces.push({ x: k.x, y: k.y, w: 70, h: 60, draw: (g) => kettle(g, k) });
  pieces.push({ x: ASSAY.x, y: ASSAY.y, w: 150, h: 110, draw: (g, rng) => assayHut(g, rng) });
  for (const n of NODDERS) pieces.push({ x: n.x, y: n.y, w: 160 * n.s, h: 150 * n.s, draw: (g) => nodderFrame(g, n) });
  for (const s of STACKS) pieces.push({ x: s.x, y: s.y, w: 130, h: 80, draw: (g) => barrelStack(g, s) });
  pieces.push({ x: CRANE_X + 60, y: 1222, w: 460, h: 400, draw: (g) => crane(g) });
  pieces.push({ x: CRANE_X, y: SEA_Y - 5, w: 220, h: 380, draw: (g) => craneFront(g) });
  pieces.push({ x: TANKER.x + TANKER.w / 2, y: TANKER.y + TANKER.h, w: TANKER.w + 20, h: TANKER.h + 80, draw: (g) => tanker(g) });
  for (const l of LAMPS) pieces.push({ x: l.x, y: l.y, w: 40, h: 100, draw: (g) => queensLamp(g, l.x, l.y) });
  for (const bx of BOLLARDS) pieces.push({ x: bx, y: SEA_Y - 14, w: 30, h: 30, draw: (g) => bollard(g, bx, SEA_Y - 14) });
  for (const c of CRATES) pieces.push({ x: c.x, y: c.y, w: 40, h: 40, draw: (g) => tithCrate(g, c.x, c.y, 15) });
  DRUMS.forEach((d, i) => pieces.push({ x: d.x, y: d.y, w: 30, h: 36, draw: (g) => oilDrum(g, d.x, d.y, 11, i % 3 === 0 ? SAFETY_RED : i % 3 === 1 ? 0x2a2a30 : 0x1e3a2a, i % 2 === 0) }));
  return pieces;
}

// ── Animation (t in seconds) ────────────────────────────────────────

/** Under actors: the Slick's skin crawling, puddle sheen, drips, the fishing water. */
function animate(g: G, t: number, view: Rect): void {
  // The harbour: long swells and drifting rainbow bands.
  if (view.y + view.h > SEA_Y) {
    const x0 = Math.max(0, view.x), x1 = Math.min(AREA_W, view.x + view.w);
    for (let i = 0; i < 16; i++) {
      const y = SEA_Y + 24 + ((i * 53 + t * 6) % (AREA_H - SEA_Y - 20));
      const ph = t * 0.25 + i * 0.7;
      g.lineStyle(1.6, sheenAt(ph), 0.18);
      g.beginPath();
      for (let x = x0; x <= x1; x += 24) {
        const yy = y + Math.sin(x * 0.012 + t * 0.6 + i) * 5;
        if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.strokePath();
    }
    // Slick rafts drifting slowly east and back.
    for (let i = 0; i < 9; i++) {
      const sx = ((noise(i * 3.3) * AREA_W + Math.sin(t * 0.05 + i) * 120) % AREA_W + AREA_W) % AREA_W;
      const sy = SEA_Y + 40 + noise(i * 8.1) * (AREA_H - SEA_Y - 60);
      if (!inView(sx, sy, view)) continue;
      if (sx > TANKER.x - 30 && sx < TANKER.x + TANKER.w + 30 && sy > TANKER.y - 20 && sy < TANKER.y + TANKER.h + 20) continue;
      if (PIERS.some((p) => sx > p.x - 50 && sx < p.x + p.w + 50)) continue;
      slick(g, sx, sy, 50 + noise(i) * 40, 14 + noise(i + 2) * 8, i * 2.1, t * 0.4 + i, 0.6);
    }
    // Lap against the quay edge.
    for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) {
      const k = 0.5 + 0.5 * Math.sin(t * 1.3 + x * 0.05);
      g.fillStyle(SEA_LIT, 0.25 * k); g.fillEllipse(x, SEA_Y + 6, 26, 4 + k * 3);
    }
  }
  // The fishing water: rising bubbles and, now and then, a rainbow shiner flashing under the skin.
  const fw = FISH_WATER;
  if (inView(fw.x + fw.w / 2, fw.y + fw.h / 2, view, 300)) {
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.45 + i / 8) % 1;
      const x = fw.x + 30 + noise(i * 5.7) * (fw.w - 60), y = fw.y + 20 + noise(i * 2.9) * (fw.h - 40);
      g.lineStyle(1.4, sheenAt(t * 0.5 + i), 0.4 * (1 - ph)); g.strokeEllipse(x, y, 10 + ph * 46, 4 + ph * 14);
    }
    const flash = (t * 0.17) % 1;
    if (flash < 0.08) {
      const fx = fw.x + 80 + noise(Math.floor(t * 0.17)) * (fw.w - 160), fy = fw.y + 50 + noise(Math.floor(t * 0.17) + 9) * (fw.h - 100);
      const k = flash / 0.08;
      g.fillStyle(sheenAt(k * 6), 0.7 * (1 - k)); g.fillEllipse(fx + k * 40, fy, 26, 8);
    }
  }
  // Puddle sheen crawling.
  for (const p of PUDDLES) {
    if (!inView(p.x, p.y, view, 80)) continue;
    const ph = t * 0.35 + p.seed;
    g.lineStyle(Math.max(1.5, p.rx * 0.07), sheenAt(ph), 0.22);
    g.strokePoints(blobPts(p.x, p.y, p.rx * 0.8, p.ry * 0.8, p.seed + 0.37), true, true);
    g.lineStyle(1.2, sheenAt(ph + 2), 0.18);
    g.strokePoints(blobPts(p.x + 1.5, p.y - 1, p.rx * 0.55, p.ry * 0.55, p.seed + 0.74), true, true);
  }
  // Crude dripping from the pipe flanges into their puddles.
  for (const p of PIPES) {
    const horiz = Math.abs(p.b.y - p.a.y) < Math.abs(p.b.x - p.a.x);
    const len = horiz ? Math.abs(p.b.x - p.a.x) : Math.abs(p.b.y - p.a.y);
    for (let d = 60; d < len; d += 140) {
      const fx = horiz ? Math.min(p.a.x, p.b.x) + d : p.a.x, fy = horiz ? p.a.y : Math.min(p.a.y, p.b.y) + d;
      if (!inView(fx, fy, view)) continue;
      const ph = (t * 0.8 + d * 0.013) % 1;
      g.fillStyle(CRUDE, 0.9); g.fillCircle(fx + 3, fy + 8 + ph * 8, 1.6 + ph);
    }
  }
}

/** Over actors: nodding pump-jacks, the flare, the lamp-cupola, the crane hook, welding sparks, tar smoke. */
function animateOver(g: G, t: number, view: Rect): void {
  // Pump-jacks: each beam rocks on its own stroke, the crank turning beneath.
  for (const n of NODDERS) {
    if (!inView(n.x, n.y - 80, view, 200)) continue;
    const a = t * 1.6 + n.ph;
    const rock = Math.sin(a) * 0.3;
    const pivot = { x: n.x - 4 * n.s, y: n.y - 88 * n.s };
    const fx = pivot.x - Math.cos(rock) * 62 * n.s;
    pumpBeam(g, pivot, n.s, rock, a + Math.PI / 2, n.x - 58 * n.s, n.y - 20 * n.s);
    // On the down-stroke the wellhead gulps — a burp of crude.
    if (Math.sin(a) > 0.92) { g.fillStyle(CRUDE, 0.8); g.fillCircle(fx - 6 * n.s, n.y - 22 * n.s, 3 * n.s); }
  }
  // The flare: a roaring orange flame and a black ribbon of smoke rolling east.
  if (inView(FLARE.x, FLARE.y - 400, view, 360)) {
    const fx = FLARE.x, fy = FLARE.y - 396;
    glow(g, fx, fy - 20, 90, FLAME, 0.035, 4);
    for (let i = 0; i < 6; i++) flameTongue(g, fx + (i - 2.5) * 5, fy, 34 + (i % 3) * 12, t, i * 1.7);
    for (let i = 0; i < 9; i++) {
      const ph = (t * 0.12 + i / 9) % 1;
      sootPuff(g, fx + ph * 260 + Math.sin(ph * 5 + i) * 12, fy - 40 - ph * 40, ph, 16 + ph * 10, 0.55);
    }
  }
  // Lamphouse cupola: the Queen's flame, clean gold, steady as a coin.
  if (inView(KEEP.x, KEEP.y - 300, view, 300)) {
    const cx = KEEP.x, cy = KEEP.y - 200 - 40 - 40;
    glow(g, cx, cy, 120, LAMP_GOLD, 0.03, 4);
    for (let i = 0; i < 3; i++) flameTongue(g, cx + (i - 1) * 7, cy + 18, 26 + (i === 1 ? 14 : 0), t * 0.6, i + 3, 0.95);
    g.fillStyle(LAMP_LIT, 0.7); g.fillCircle(cx, cy + 10, 6);
  }
  // Cracking tower's pilot: a small blue gas flame flickering at the crown.
  if (inView(CRACKER.x, CRACKER.y - 360, view, 200)) {
    const f = 0.6 + 0.4 * noise(Math.floor(t * 18));
    g.fillStyle(0x6ab8ff, 0.7 * f); g.fillTriangle(CRACKER.x - 5, CRACKER.y - 360, CRACKER.x + 5, CRACKER.y - 360, CRACKER.x, CRACKER.y - 376 - f * 8);
    g.fillStyle(0xd8f0ff, 0.8 * f); g.fillCircle(CRACKER.x, CRACKER.y - 362, 2.5);
  }
  // The crane hook: a net of drums swinging slow on its rope under the jib tip.
  const jx = JIB_TIP.x + 150, jy = JIB_TIP.y - JIB_LIFT + 4;
  if (inView(jx, JIB_TIP.y, view, 360)) {
    const sw = Math.sin(t * 0.7) * 0.22;
    const L = 240;
    const hx = jx + Math.sin(sw) * L, hy = jy + Math.cos(sw) * L;
    g.lineStyle(2, 0x1a1a1a, 1); g.lineBetween(jx - 3, jy, hx - 3, hy); g.lineBetween(jx + 3, jy, hx + 3, hy);
    g.fillStyle(SAFETY_RED, 1); g.fillRect(hx - 8, hy - 4, 16, 10);
    g.lineStyle(3, STEEL_DARK, 1); g.beginPath(); g.arc(hx, hy + 14, 7, -Math.PI * 0.1, Math.PI * 1.1, false); g.strokePath();
    for (let k = 0; k < 3; k++) drumEnd(g, hx - 14 + k * 14, hy + 36 + (k % 2) * 4, 8, k % 2 ? 0x2a2a30 : 0x3a1e18);
    g.lineStyle(1, 0x8a7450, 0.9);
    for (let k = -2; k <= 2; k++) g.lineBetween(hx, hy + 18, hx + k * 11, hy + 48);
    // Its shadow far below on the tanker deck.
    g.fillStyle(0x000000, 0.25); g.fillEllipse(hx + 40, TANKER.y + 60, 50, 14);
  }
  // Welding at the patched tank: an arc's blue-white glare and a fountain of orange sparks.
  if (inView(WELD_TANK.x, WELD_TANK.y - 60, view, 200)) {
    const on = noise(Math.floor(t * 2.2)) > 0.3;
    const wx = WELD_TANK.x - WELD_TANK.r * 0.55, wy = WELD_TANK.y - WELD_TANK.r * 0.68;
    if (on) {
      const f = 0.6 + 0.4 * noise(Math.floor(t * 30));
      glow(g, wx, wy, 40 * f, 0xbfe8ff, 0.08, 3);
      g.fillStyle(0xffffff, 0.9 * f); g.fillCircle(wx, wy, 3.5);
      for (let i = 0; i < 12; i++) {
        const ph = (t * 1.6 + i / 12) % 1;
        const a = -Math.PI / 2 + (noise(i * 4.1) - 0.5) * 2.4;
        const sp = 50 + noise(i * 1.7) * 60;
        const sx = wx + Math.cos(a) * sp * ph, sy = wy + Math.sin(a) * sp * ph + 140 * ph * ph;
        g.fillStyle(i % 3 ? FLAME_LIT : 0xffffff, 1 - ph); g.fillCircle(sx, sy, 1.6);
      }
    }
  }
  // Tar kettles: thick black smoke and the odd bubble bursting.
  for (const k of KETTLES) {
    if (!inView(k.x, k.y - 40, view)) continue;
    for (let i = 0; i < 4; i++) sootPuff(g, k.x + (i - 1.5) * 6, k.y - 42, (t * 0.4 + i / 4 + k.x * 0.001) % 1, 12, 0.6);
    const b = (t * 1.1 + k.x * 0.01) % 1;
    if (b < 0.25) { g.lineStyle(1.5, TAR_LIT, 1 - b * 4); g.strokeCircle(k.x - 6 + k.x % 9, k.y - 37, 2 + b * 14); }
  }
  // The tanker's funnel breathing a thin grey line.
  const tf = { x: TANKER.x + 31, y: TANKER.y + TANKER.h / 2 - 70 };
  if (inView(tf.x, tf.y, view)) for (let i = 0; i < 4; i++) sootPuff(g, tf.x, tf.y, (t * 0.2 + i / 4) % 1, 9, 0.35);
  // The Queen's lamps: a warm breath of light round every post.
  for (const l of LAMPS) {
    if (!inView(l.x, l.y, view)) continue;
    const f = 0.85 + 0.15 * Math.sin(t * 3 + l.x);
    g.fillStyle(LAMP_GOLD, 0.06 * f); g.fillCircle(l.x, l.y - 76, 34);
    g.fillStyle(LAMP_LIT, 0.5 * f); g.fillTriangle(l.x - 2, l.y - 72, l.x + 2, l.y - 72, l.x, l.y - 80);
  }
  // Gulls wheeling over the Slick.
  if (view.y + view.h > SEA_Y - 200) {
    for (let i = 0; i < 4; i++) {
      const a = t * 0.3 + i * 1.6;
      const gx = 400 + i * 520 + Math.cos(a) * 140, gy = SEA_Y + 60 + Math.sin(a) * 40 - i * 10;
      if (!inView(gx, gy, view)) continue;
      const flap = Math.sin(t * 7 + i) * 5;
      g.lineStyle(2, 0xd8d8d0, 0.9);
      g.lineBetween(gx - 10, gy - flap, gx, gy); g.lineBetween(gx, gy, gx + 10, gy - flap);
    }
  }
  // Oily rain-sheen haze hanging over the refinery — a slow brown smog band.
  if (view.y < 700) {
    for (let i = 0; i < 6; i++) {
      const x = ((i * 430 + t * 9) % (AREA_W + 400)) - 200;
      if (!inView(x, 260, view, 400)) continue;
      g.fillStyle(0x3a2a1a, 0.08); g.fillEllipse(x, 220 + (i % 3) * 120, 420, 60);
    }
  }
  // A lit fleck of the cupola's gold reflected on the wet ground before the hall.
  if (inView(KEEP.x, KEEP.y + 40, view)) {
    g.fillStyle(LAMP_GOLD, 0.06 + 0.02 * Math.sin(t * 2)); g.fillEllipse(KEEP.x, KEEP.y + 40, 160, 26);
  }
}

export const SLICKHARBOR_PAINTER: AreaPainter = {
  ground: paintGround,
  pieces: makePieces(),
  animate,
  animateOver,
};
