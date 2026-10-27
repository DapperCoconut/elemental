import type { AreaDef, Poi, Rect, Solid } from '../../../../IslesTypes';
import { type G, barrel, blob, crate, dim, flagstones, glow, groundFill, house, lit, mixC, rock, road, shadow } from '../../../../art/IsleArt';
import {
  BRASS, FOAM, LAMP, MUD, MUD_WET, PLANK, PLANK_DARK, QUEEN, QUEEN_DARK, ROCK, ROCK_ALT, ROPE, SALT, SEA, SEA_DEEP,
  SEA_SHALLOW, SHINGLE, SHINGLE_ALT, STONE, STONE_DARK, SUNK, SUNK_DEEP, TIDE, carve, crabPot, crest, inView, kelpRack,
  oilLamp, planks, poly, post, ropeBridgeDeck, ropeLine, stiltHouse, tideMarks, upturnedSkiff,
} from './art';
import { BRINEHOLLOW_CROWD, BRINEHOLLOW_NPCS } from './people';

/**
 * Brinehollow — the half-sunk harbour of the Drowned Reach, and where every voyage from Brandmark
 * makes landfall.
 *
 * The town is built in three steps down to the sea. Up top, on the salt-crusted rock, the plaza and
 * the Queen's tithe-house with its great tide clock; every wall up here still wears a ring of green
 * slime from the year of the Crowning flood. Below Tithe Row the stilt quarter stands over the mud
 * flats on barnacled legs, and the harbour front runs along its feet. In the south-west, the low
 * quarter — Gannet Street — is simply gone under: roofs and a chapel belfry stand out of still green
 * water, and a rope bridge and a boardwalk are all that cross it. Off the south-east headland the
 * lighthouse the Queen broke lies in two pieces on the rocks.
 *
 * You land at the end of the main pier, walk up it past the dockmistress, and the first thing you
 * see at the top of Ladder Street is the tide clock telling the whole town what it owes.
 */

const W = 2600;
const H = 1500;
/** Where the open sea begins along the south shore. */
const SEA_Y = 1250;
/** Where the upper town's rock gives way to tidal mud. */
const ROCK_Y = 812;

/** Walkable timber and rope over water or mud — shared by the painter and the solids. */
const MAIN_PIER: Rect = { x: 1250, y: 1170, w: 100, h: 300 };
const FISH_PIER: Rect = { x: 1720, y: 1170, w: 60, h: 230 };
const HARBOUR_FRONT: Rect = { x: 960, y: 1118, w: 1262, h: 40 };
const LADDER_ST: Rect = { x: 1272, y: 800, w: 56, h: 320 };
/** The drowned low quarter (Gannet Street) and the two ways across it. */
const BASIN: Rect = { x: 100, y: 860, w: 840, h: 350 };
const BRIDGE: Rect = { x: 100, y: 1010, w: 840, h: 36 };
const BOARDWALK: Rect = { x: 500, y: 860, w: 40, h: 350 };
const HUB: Rect = { x: 466, y: 988, w: 108, h: 80 };
/** The lighthouse headland running out past the shoreline in the south-east. */
const HEADLAND: Rect = { x: 2170, y: 1250, w: 430, h: 140 };
/** Salt pans on the east flats. */
const PANS: Rect = { x: 2240, y: 836, w: 330, h: 216 };

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  // Upper town: grey-green rock with a white bloom of salt in the hollows.
  groundFill(g, { x: 0, y: 0, w: W, h: ROCK_Y }, ROCK, ROCK_ALT, 0xc8ccc0, rng);
  for (let i = 0; i < 40; i++) blob(g, rng() * W, 120 + rng() * (ROCK_Y - 160), 30 + rng() * 70, 10 + rng() * 22, SALT, 0.07, rng);

  // The ring of the Crowning flood — a faint green tide line painted right across the high town.
  g.lineStyle(5, TIDE, 0.28);
  g.beginPath();
  for (let x = 0; x <= W; x += 20) {
    const y = 210 + Math.sin(x / 140) * 18 + Math.sin(x / 47) * 5;
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();

  // The north seawall, broken where the Tidewater road climbs through, tide-banded on its face.
  for (let x = 0; x < W; x += 40) {
    if (x > 1200 && x < 1380) continue;
    const h = 64 + rng() * 14;
    g.fillStyle(STONE_DARK, 1); g.fillRect(x, 0, 42, h + 6);
    g.fillStyle(STONE, 1); g.fillRect(x + 2, 0, 38, h);
    g.fillStyle(lit(STONE, 0.1), 1); g.fillRect(x + 2, h - 18, 38, 3);
    g.lineStyle(1, STONE_DARK, 0.6); g.lineBetween(x + 2, h - 34, x + 40, h - 34);
  }
  tideMarks(g, 0, 1200, 74, [14, 30], rng);
  tideMarks(g, 1380, W, 74, [14, 30], rng);

  // Tidal mud under the stilt quarter, worm-cast and puddled.
  groundFill(g, { x: 940, y: ROCK_Y, w: W - 940, h: 1160 - ROCK_Y }, MUD, MUD_WET, 0x8a8470, rng, 1.4);
  for (let x = 940; x < W; x += 36) blob(g, x + 18, ROCK_Y, 36, 14 + rng() * 10, MUD, 1, rng);
  for (let i = 0; i < 60; i++) {
    const px = 960 + rng() * (W - 980), py = ROCK_Y + 30 + rng() * 300;
    if (px > PANS.x - 20 && py > PANS.y - 20 && py < PANS.y + PANS.h + 20) continue;
    blob(g, px, py, 18 + rng() * 40, 6 + rng() * 12, SEA_SHALLOW, 0.4, rng);
    g.fillStyle(0xc8e0dc, 0.18); g.fillEllipse(px - 4, py - 2, 10, 2);
  }
  for (let i = 0; i < 400; i++) {
    g.fillStyle(0x2a281e, 0.5);
    const cx = 960 + rng() * (W - 980), cy = ROCK_Y + 20 + rng() * 320;
    g.fillCircle(cx, cy, 1.4);
    if (rng() < 0.3) { g.lineStyle(1, 0x5a5440, 0.5); g.strokeCircle(cx, cy, 3); }
  }
  // Tide contours left in the mud.
  for (let k = 0; k < 4; k++) {
    g.lineStyle(2, MUD_WET, 0.7);
    g.beginPath();
    for (let x = 940; x <= W; x += 20) {
      const y = 1100 - k * 70 + Math.sin(x / 110 + k * 1.7) * 10;
      if (x === 940) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // The low quarter's surviving cobbles round the drowned basin — slick, green-edged.
  groundFill(g, { x: 0, y: ROCK_Y, w: 960, h: 1160 - ROCK_Y }, 0x3e4642, 0x343c38, 0x7a847a, rng);
  for (let i = 0; i < 700; i++) {
    g.fillStyle(rng() < 0.5 ? 0x4e5852 : 0x2e3632, 0.6);
    g.fillRoundedRect(rng() * 960, ROCK_Y + rng() * 350, 8 + rng() * 4, 5 + rng() * 2, 2);
  }

  // Shingle beach along the whole south shore, with a wrack line of kelp.
  g.fillStyle(SHINGLE, 1); g.fillRect(0, 1158, W, SEA_Y - 1158);
  for (let x = 0; x < W; x += 40) blob(g, x + 20, 1160, 40, 12 + rng() * 10, SHINGLE, 1, rng);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle(rng() < 0.4 ? SHINGLE_ALT : rng() < 0.5 ? 0x4a4a46 : 0x8a8a80, 0.7);
    g.fillEllipse(rng() * W, 1164 + rng() * (SEA_Y - 1168), 3 + rng() * 4, 2 + rng() * 2);
  }
  g.lineStyle(3, 0x3e3a1e, 0.75);
  g.beginPath();
  for (let x = 0; x <= W; x += 14) {
    const y = SEA_Y - 26 + Math.sin(x / 60) * 4 + (rng() - 0.5) * 3;
    if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  for (let i = 0; i < 90; i++) {
    const x = rng() * W;
    g.fillStyle(rng() < 0.5 ? 0x4a3e1a : 0x2e3a1a, 0.8);
    g.fillEllipse(x, SEA_Y - 26 + (rng() - 0.5) * 8, 8 + rng() * 14, 3);
  }

  // The sea: shallow shelf, the swell, then deep water.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 46, W, H - SEA_Y - 46);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 150, W, H - SEA_Y - 150);
  for (let i = 0; i < 180; i++) {
    g.fillStyle(lit(SEA, 0.12), 0.22);
    g.fillEllipse(rng() * W, SEA_Y + 24 + rng() * (H - SEA_Y - 24), 30 + rng() * 90, 3 + rng() * 3);
  }

  // The headland: black rock with tide pools, running out under the broken lighthouse.
  blob(g, 2400, 1312, 250, 96, 0x22282a, 1, rng, 14);
  blob(g, 2400, 1306, 232, 82, 0x323a3a, 1, rng, 14);
  g.fillStyle(0x323a3a, 1); g.fillRect(HEADLAND.x, SEA_Y - 10, HEADLAND.w, 40);
  for (let i = 0; i < 22; i++) blob(g, 2200 + rng() * 380, 1270 + rng() * 100, 10 + rng() * 22, 6 + rng() * 8, 0x46504e, 0.9, rng);
  for (let i = 0; i < 6; i++) {
    const px = 2220 + rng() * 340, py = 1290 + rng() * 70;
    blob(g, px, py, 14 + rng() * 10, 7 + rng() * 4, SEA_SHALLOW, 0.95, rng);
    g.fillStyle(0xd8604a, 0.8); g.fillCircle(px + 4, py, 1.6);
  }

  // The drowned basin: green water with the old street visible under it.
  g.fillStyle(0x26302c, 1); g.fillRoundedRect(BASIN.x - 10, BASIN.y - 10, BASIN.w + 20, BASIN.h + 20, 34);
  g.fillStyle(SUNK, 1); g.fillRoundedRect(BASIN.x, BASIN.y, BASIN.w, BASIN.h, 28);
  g.fillStyle(SUNK_DEEP, 1); g.fillRoundedRect(BASIN.x + 40, BASIN.y + 60, BASIN.w - 80, BASIN.h - 90, 22);
  // Gannet Street under the water: ghost cobbles and the doorsteps of the eleven houses.
  for (let i = 0; i < 260; i++) {
    g.fillStyle(0x2a4a44, 0.35);
    g.fillRoundedRect(BASIN.x + 30 + rng() * (BASIN.w - 60), 1080 + rng() * 60, 9, 5, 2);
  }
  for (let i = 0; i < 11; i++) {
    const dx = BASIN.x + 50 + i * 72, dy = i % 2 ? 940 : 1176;
    g.fillStyle(0x0e2422, 0.55); g.fillRect(dx, dy - 20, 22, 20);
    g.fillStyle(0x2a4a44, 0.4); g.fillRect(dx - 4, dy, 30, 4);
  }
  for (let i = 0; i < 50; i++) {
    g.fillStyle(lit(SUNK, 0.15), 0.2);
    g.fillEllipse(BASIN.x + 20 + rng() * (BASIN.w - 40), BASIN.y + 20 + rng() * (BASIN.h - 40), 20 + rng() * 50, 2 + rng() * 3);
  }
  // Slime ring at the basin's lip, where the water stands most of the day.
  g.lineStyle(6, TIDE, 0.7); g.strokeRoundedRect(BASIN.x - 6, BASIN.y - 6, BASIN.w + 12, BASIN.h + 12, 32);

  // Roads: the Tidewater road down to the plaza, and Tithe Row across the whole town.
  road(g, [{ x: 1300, y: 0 }, { x: 1300, y: 360 }, { x: 1300, y: 620 }], 92, 0x5a6460, 0x2a3230, 0x7a8480, rng);
  road(g, [{ x: 0, y: 760 }, { x: 900, y: 756 }, { x: 1700, y: 762 }, { x: W, y: 758 }], 80, 0x56605c, 0x2a3230, 0x76807a, rng);
  // Lanes to the doors up the hill.
  road(g, [{ x: 280, y: 350 }, { x: 250, y: 540 }, { x: 250, y: 730 }], 32, 0x505a56, 0x2a3230, 0x6a746e, rng);
  road(g, [{ x: 1020, y: 440 }, { x: 1010, y: 580 }, { x: 1010, y: 730 }], 32, 0x505a56, 0x2a3230, 0x6a746e, rng);
  road(g, [{ x: 1940, y: 320 }, { x: 1920, y: 520 }, { x: 1920, y: 730 }], 32, 0x505a56, 0x2a3230, 0x6a746e, rng);
  road(g, [{ x: 2360, y: 360 }, { x: 2324, y: 560 }, { x: 2324, y: 730 }], 32, 0x505a56, 0x2a3230, 0x6a746e, rng);
  road(g, [{ x: 1580, y: 350 }, { x: 1440, y: 520 }, { x: 1380, y: 620 }], 30, 0x505a56, 0x2a3230, 0x6a746e, rng);

  // The plaza: wet flagstones ringed with old tide circles, the crest inlaid at the gauge's foot.
  g.fillStyle(0x24302c, 1); g.fillRoundedRect(1112, 602, 376, 216, 36);
  flagstones(g, { x: 1120, y: 610, w: 360, h: 200 }, 28, 0x6a7672, 0x2e3634, rng);
  for (let k = 0; k < 3; k++) {
    g.lineStyle(2, TIDE, 0.35 - k * 0.08); g.strokeEllipse(1300, 712, 200 + k * 90, 90 + k * 40);
  }
  crest(g, 1300, 760, 26, 0x1e2a28, 0.6);
  crest(g, 1300, 760, 24, QUEEN_DARK, 0.5);
  g.fillStyle(0x24302c, 1);
  for (const [cx, cy] of [[1120, 610], [1480, 610], [1120, 810], [1480, 810]]) g.fillCircle(cx, cy, 22);

  // Tide-house steps and the queue's worn path.
  g.fillStyle(0x4a5654, 0.6); g.fillEllipse(1560, 690, 180, 40);

  // Salt pans: shallow rectangles of brine, each crusting white at its own pace.
  g.fillStyle(0x2a2e26, 1); g.fillRect(PANS.x - 6, PANS.y - 6, PANS.w + 12, PANS.h + 12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const px = PANS.x + c * 82 + 4, py = PANS.y + r * 72 + 4;
      const crust = ((r * 4 + c) * 37) % 100 / 100;
      g.fillStyle(0x4a4e44, 1); g.fillRect(px - 2, py - 2, 78, 68);
      g.fillStyle(mixC(0x5a8a8a, SALT, crust), 1); g.fillRect(px, py, 74, 64);
      for (let i = 0; i < 20 * crust; i++) {
        g.fillStyle(0xffffff, 0.35); g.fillRect(px + rng() * 70, py + rng() * 60, 3 + rng() * 6, 1.5);
      }
    }
  }

  // Timber: Ladder Street, the harbour front, the piers, the low quarter's crossings.
  planks(g, LADDER_ST, 'v', rng);
  for (let y = LADDER_ST.y + 30; y < LADDER_ST.y + LADDER_ST.h; y += 60) {
    g.fillStyle(PLANK_DARK, 1); g.fillRect(LADDER_ST.x - 6, y, 6, 12); g.fillRect(LADDER_ST.x + LADDER_ST.w, y, 6, 12);
  }
  planks(g, HARBOUR_FRONT, 'h', rng);
  for (const p of [MAIN_PIER, FISH_PIER]) {
    g.fillStyle(0x0a1a22, 0.45); g.fillRect(p.x + 8, p.y + 14, p.w, p.h);
    for (let y = p.y + 40; y < p.y + p.h; y += 44) {
      g.fillStyle(0x1a1610, 1); g.fillRect(p.x - 6, y, 8, 16); g.fillRect(p.x + p.w - 2, y, 8, 16);
    }
    planks(g, p, 'v', rng);
  }
  for (const x of [1262, 1338]) {
    g.fillStyle(0x1a140e, 1); g.fillCircle(x, 1456, 7);
    g.lineStyle(2, BRASS, 1); g.strokeCircle(x, 1456, 5);
  }
  ropeBridgeDeck(g, BRIDGE, 'h', rng);
  planks(g, BOARDWALK, 'v', rng);
  planks(g, HUB, 'h', rng, lit(PLANK, 0.04));
  // The hub's sea-book lectern stain and chalked names round its edge.
  g.lineStyle(1, SALT, 0.35);
  for (let k = 0; k < 9; k++) g.lineBetween(HUB.x + 8 + k * 11, HUB.y + 70, HUB.x + 14 + k * 11, HUB.y + 70);
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

/** A building: piece + base footprint solid. */
function building(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void, depth = 44): void {
  pieces.push({ x, y, w: w + 80, h: h * 2 + 60, draw });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - depth, w, h: depth });
}

/** The upper-town house: wet stone, slate, and the Crowning flood's ring round its middle. */
function hillHouse(x: number, y: number, w: number, h: number, wall: number, roof: number, marks: number[] = [26, 44]): void {
  building(x, y, w, h, (g, rng) => {
    house(g, x, y, w, h, { wall, roof, roofStyle: 'gable', chimney: true, glow: LAMP, door: QUEEN_DARK }, rng);
    tideMarks(g, x - w / 2, x + w / 2, y, marks, rng);
    // A bailing bucket by the door; every house has one.
    g.fillStyle(0x4a4a44, 1); g.fillRect(x + w / 2 - 22, y - 12, 12, 12);
    g.fillStyle(0x2a2a26, 1); g.fillEllipse(x + w / 2 - 16, y - 12, 12, 4);
    g.lineStyle(1, 0x6a6a60, 1); g.beginPath(); g.arc(x + w / 2 - 16, y - 12, 6, Math.PI, 0, false); g.strokePath();
  });
}

hillHouse(280, 330, 150, 100, 0x5e6a64, 0x2a3438);
hillHouse(600, 290, 140, 96, 0x6a6a5e, 0x34383a);
hillHouse(1020, 420, 150, 100, 0x5a6660, 0x2e363a);
hillHouse(1580, 330, 150, 100, 0x646e66, 0x2a3236);
hillHouse(1940, 300, 160, 104, 0x5e665e, 0x343a3e);
hillHouse(2360, 340, 170, 110, 0x606a62, 0x2a3034);
hillHouse(2420, 640, 150, 100, 0x5a645e, 0x30383a, [20, 38, 52]);

// The Dunnage house — the lowest on the hill, the tide's second mark right across its windows.
building(380, 640, 160, 100, (g, rng) => {
  house(g, 380, 640, 160, 100, { wall: 0x5a5e56, roof: 0x2a2e30, roofStyle: 'slant', glow: 0xffc87a, door: 0x3a4a3a }, rng);
  tideMarks(g, 300, 460, 640, [18, 40, 62], rng);
  // A puddle that never dries at the step, and a string of tiny washing.
  g.fillStyle(SEA_SHALLOW, 0.5); g.fillEllipse(380, 650, 60, 10);
  g.lineStyle(1, ROPE, 0.9); g.lineBetween(300, 560, 360, 566);
  for (let k = 0; k < 5; k++) {
    g.fillStyle([0xe8e0d0, 0xc8a0a0, 0xa0c0d0][k % 3], 1);
    g.fillRect(306 + k * 11, 562 + k * 0.6, 7, k === 2 ? 6 : 9);
  }
  // Four buckets lined up. Five, now; the fifth is small.
  for (let k = 0; k < 5; k++) {
    const s = k === 4 ? 6 : 10;
    g.fillStyle(0x4a4a44, 1); g.fillRect(440 - k * 15, 640 - s, s, s);
    g.fillStyle(0x2a2a26, 1); g.fillEllipse(440 - k * 15 + s / 2, 640 - s, s, 3);
  }
});

// Barnacle & Daughters — a narrow tall shop, bay window of charms, a barnacled anchor for a sign.
building(860, 640, 220, 130, (g, rng) => {
  house(g, 860, 640, 220, 130, { wall: 0x6e6a5a, roof: 0x3a2e3a, roofStyle: 'gable', glow: 0xffe0a0, trim: 0x2a2420, door: 0x5a3a5a }, rng);
  tideMarks(g, 750, 970, 640, [22], rng);
  // Bay window with the stock in it.
  g.fillStyle(0x2a2420, 1); g.fillRect(760, 572, 72, 48);
  g.fillStyle(0xffe0a0, 0.85); g.fillRect(764, 576, 64, 40);
  g.fillStyle(0xf0f0e8, 1); g.fillRect(770, 600, 3, 12); g.fillRect(776, 598, 3, 14); // chalk sticks
  g.fillStyle(0x8a8a7a, 1); g.fillCircle(792, 604, 6);
  for (let k = 0; k < 5; k++) { g.fillStyle(0xe8e4d8, 1); g.fillCircle(788 + (k % 3) * 4, 600 + Math.floor(k / 3) * 5, 1.6); }
  g.fillStyle(0xf8f4f0, 1); g.fillCircle(808, 606, 3.4); g.fillStyle(0xffffff, 0.8); g.fillCircle(807, 605, 1.2); // pearl
  g.lineStyle(1.5, BRASS, 1); g.strokeCircle(820, 594, 6); g.lineBetween(820, 594, 824, 590); // compass
  // Hanging sign: an anchor crusted in barnacles.
  g.fillStyle(0x2a2420, 1); g.fillRect(912, 548, 48, 3); g.fillRect(958, 548, 2, 10);
  g.fillStyle(0x4a5a5a, 1); g.fillRoundedRect(928, 556, 52, 34, 4);
  g.lineStyle(3, 0x1e2a2a, 1);
  g.lineBetween(954, 562, 954, 584);
  g.beginPath(); g.arc(954, 576, 10, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.lineBetween(948, 566, 960, 566);
  for (let k = 0; k < 7; k++) { g.fillStyle(0xe8e4d8, 1); g.fillCircle(946 + rng() * 16, 570 + rng() * 16, 1.3); }
});

// The tithe-house — the Queen's counting-house, raised on a plinth above the highest flood.
building(1660, 640, 320, 170, (g, rng) => {
  shadow(g, 1660, 650, 380, 34, 0.4);
  // Plinth and steps.
  g.fillStyle(STONE_DARK, 1); g.fillRect(1494, 596, 332, 46);
  g.fillStyle(STONE, 1); g.fillRect(1498, 598, 324, 40);
  for (let k = 0; k < 8; k++) { g.lineStyle(1, STONE_DARK, 0.7); g.lineBetween(1498 + k * 41, 598, 1498 + k * 41, 638); }
  tideMarks(g, 1498, 1822, 640, [10, 22, 34], rng);
  for (let s = 0; s < 3; s++) {
    g.fillStyle(s % 2 ? STONE : lit(STONE, 0.08), 1);
    g.fillRect(1610 - s * 8, 640 + s * 6, 100 + s * 16, 7);
  }
  // Ashlar body.
  g.fillStyle(dim(STONE, 0.4), 1); g.fillRect(1506, 452, 308, 148);
  g.fillStyle(0x7a8680, 1); g.fillRect(1510, 456, 300, 142);
  for (let row = 0; row < 7; row++) {
    for (let c = 0; c < 8; c++) {
      g.fillStyle(rng() < 0.5 ? 0x74807a : 0x808c86, 1);
      g.fillRect(1512 + c * 37.5 + (row % 2) * 18, 458 + row * 20, 35, 18);
    }
  }
  // Pilasters.
  for (const px of [1520, 1600, 1720, 1800]) {
    g.fillStyle(0x8a9690, 1); g.fillRect(px - 9, 456, 18, 142);
    g.fillStyle(lit(0x8a9690, 0.2), 1); g.fillRect(px - 9, 456, 4, 142);
    g.fillStyle(0x6a7670, 1); g.fillRect(px - 12, 450, 24, 8); g.fillRect(px - 12, 590, 24, 8);
  }
  // Barred ledger windows.
  for (const wx of [1560, 1760]) {
    g.fillStyle(0x1a2422, 1); g.fillRect(wx - 16, 490, 32, 50);
    g.fillStyle(LAMP, 0.55); g.fillRect(wx - 13, 493, 26, 44);
    g.lineStyle(2, 0x2a2e2e, 1); for (let k = 0; k < 4; k++) g.lineBetween(wx - 12 + k * 8, 493, wx - 12 + k * 8, 537);
  }
  // The coin-chute: a brass funnel into the wall, ONE A HEAD.
  g.fillStyle(0x6a5a2a, 1); g.fillTriangle(1626, 500, 1646, 500, 1636, 520);
  g.fillStyle(BRASS, 1); g.fillTriangle(1628, 502, 1644, 502, 1636, 516);
  g.fillStyle(0x2a2420, 1); g.fillRect(1622, 524, 28, 8);
  g.fillStyle(BRASS, 0.8); g.fillRect(1624, 526, 24, 4);
  // Great doors, teal, the crest across both leaves.
  g.fillStyle(0x1a2422, 1); g.fillRoundedRect(1660 - 30, 530, 60, 70, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.fillStyle(QUEEN_DARK, 1); g.fillRoundedRect(1660 - 26, 534, 52, 66, { tl: 23, tr: 23, bl: 0, br: 0 });
  g.lineStyle(1.5, 0x0e3a40, 1); g.lineBetween(1660, 536, 1660, 600);
  crest(g, 1660, 566, 13, QUEEN, 0.95);
  // Pediment with the tide clock.
  g.fillStyle(dim(STONE, 0.4), 1); g.fillTriangle(1490, 454, 1830, 454, 1660, 352);
  g.fillStyle(0x84908a, 1); g.fillTriangle(1500, 450, 1820, 450, 1660, 360);
  g.fillStyle(0x2a3236, 1); g.fillRect(1494, 448, 332, 8);
  g.fillStyle(0x2a2420, 1); g.fillCircle(1660, 414, 30);
  g.fillStyle(0xe8e2cc, 1); g.fillCircle(1660, 414, 26);
  g.lineStyle(1.5, 0x2a2420, 1);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.lineBetween(1660 + Math.cos(a) * 21, 414 + Math.sin(a) * 21, 1660 + Math.cos(a) * 25, 414 + Math.sin(a) * 25);
  }
  // The two flood arcs painted on the dial — noon and midnight.
  g.lineStyle(4, QUEEN, 0.75);
  g.beginPath(); g.arc(1660, 414, 17, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5, false); g.strokePath();
  g.beginPath(); g.arc(1660, 414, 17, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, false); g.strokePath();
  crest(g, 1660, 416, 7, 0x2a2420, 0.9);
  // Roof ridge with a weathervane fish.
  g.fillStyle(0x2a3236, 1); g.fillRect(1656, 330, 8, 30);
  g.fillStyle(BRASS, 1); g.fillEllipse(1660, 326, 26, 8); g.fillTriangle(1646, 326, 1638, 320, 1638, 332);
}, 46);

// The Brine Oven — a stilted bakery and the riveted tithe-cutter boiler that sank onto its roof.
building(2080, 640, 230, 130, (g, rng) => {
  house(g, 2080, 640, 230, 130, { wall: 0x7a6a56, roof: 0x4a3a2a, roofStyle: 'gable', glow: 0xffc070, door: 0x4a3020 }, rng);
  tideMarks(g, 1965, 2195, 640, [18], rng);
  // Sign: a loaf with a fish tail, salt crystals on the crust.
  g.fillStyle(0x2a2420, 1); g.fillRect(1980, 528, 3, 40);
  g.fillStyle(0x4a5a5a, 1); g.fillRoundedRect(1958, 548, 60, 30, 5);
  g.fillStyle(0x8a5a2a, 1); g.fillEllipse(1984, 563, 38, 16);
  g.fillStyle(0xc88a4a, 1); g.fillEllipse(1984, 561, 32, 10);
  g.fillStyle(0x8a5a2a, 1); g.fillTriangle(2002, 563, 2012, 555, 2012, 571);
  for (let k = 0; k < 6; k++) { g.fillStyle(0xffffff, 0.95); g.fillRect(1972 + k * 4, 557 + (k % 2) * 3, 2, 2); }
  // Loaves on the sill, salt-crusted.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(0x8a5a2a, 1); g.fillEllipse(2120 + i * 16, 596, 14, 7);
    g.fillStyle(0xd8a060, 1); g.fillEllipse(2120 + i * 16, 594, 10, 4);
    g.fillStyle(0xffffff, 0.8); g.fillRect(2118 + i * 16, 592, 2, 1.5);
  }
});
pieces.push({
  x: 2256, y: 646, w: 140, h: 260, draw: (g, rng) => {
    shadow(g, 2256, 648, 130, 22, 0.4);
    // The boiler on its side: a riveted cylinder, rust-streaked, with a glowing fire-door.
    g.fillStyle(0x2a2a26, 1); g.fillRoundedRect(2200, 584, 112, 62, 26);
    g.fillStyle(0x5a4a3a, 1); g.fillRoundedRect(2204, 588, 104, 54, 24);
    g.fillStyle(lit(0x5a4a3a, 0.15), 1); g.fillRect(2214, 592, 84, 6);
    for (let k = 0; k < 5; k++) {
      g.lineStyle(2, 0x2a221a, 1); g.lineBetween(2218 + k * 20, 588, 2218 + k * 20, 642);
      for (let r = 0; r < 4; r++) { g.fillStyle(0x8a7a5a, 1); g.fillCircle(2218 + k * 20, 594 + r * 13, 1.4); }
    }
    for (let i = 0; i < 5; i++) { g.fillStyle(0x8a3a1a, 0.4); g.fillRect(2214 + rng() * 80, 600 + rng() * 30, 2, 8 + rng() * 8); }
    g.fillStyle(0x1a0e08, 1); g.fillRoundedRect(2236, 604, 36, 30, 6);
    g.fillStyle(0xff8a3a, 0.9); g.fillRoundedRect(2240, 608, 28, 22, 5);
    g.fillStyle(0xffd88a, 0.9); g.fillRect(2246, 620, 16, 8);
    // The funnel: a steamer's stack, banded in the cutter's old tithe colours, the crest scraped off.
    g.fillStyle(0x1a1a18, 1); g.fillRect(2276, 450, 26, 140);
    g.fillStyle(0x2a2a28, 1); g.fillRect(2279, 450, 20, 140);
    g.fillStyle(QUEEN_DARK, 1); g.fillRect(2279, 470, 20, 16);
    g.fillStyle(0x8a2a1a, 1); g.fillRect(2279, 490, 20, 6);
    g.lineStyle(1.5, 0x6a6a60, 0.7); g.lineBetween(2282, 474, 2296, 484); g.lineBetween(2284, 484, 2294, 474);
    g.fillStyle(0x1a1a18, 1); g.fillRect(2272, 444, 34, 8);
  },
});
solids.push({ kind: 'circle', x: 2256, y: 628, r: 44 });

// The stilt quarter: houses on legs over the mud, tide-banded, ladders down.
function stilted(x: number, y: number, w: number, h: number, lift: number, wall: number, roof: number, marks: number[]): void {
  pieces.push({ x, y, w: w + 60, h: h * 2 + lift + 70, draw: (g, rng) => { stiltHouse(g, x, y, w, h, lift, { wall, roof, roofStyle: 'gable', glow: LAMP, door: QUEEN_DARK }, rng, marks); } });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 26, w, h: 26 });
}
stilted(1060, 960, 150, 90, 34, 0x6a6458, 0x34302e, [8, 20]);
stilted(1480, 930, 140, 88, 30, 0x5e6a62, 0x2e363a, [10]);
stilted(1640, 1086, 140, 84, 28, 0x706a5a, 0x3a3230, [6, 18]);
stilted(1990, 940, 150, 90, 34, 0x646a60, 0x30383a, [12, 24]);
stilted(2150, 1080, 110, 76, 26, 0x6a645a, 0x3a3434, [8]);

// The Gaff & Gullet — the tackle shack, under a whale's jawbone arch.
pieces.push({
  x: 1900, y: 1100, w: 260, h: 300, draw: (g, rng) => {
    stiltHouse(g, 1900, 1100, 170, 96, 26, { wall: 0x5a5a4a, roof: 0x2a3a2e, roofStyle: 'slant', glow: LAMP, door: 0x2a3a30 }, rng, [8]);
    // The jawbone arch over the deck: two great curved bones meeting at the top.
    for (const s of [-1, 1]) {
      g.lineStyle(9, 0xbab2a0, 1);
      g.beginPath(); g.arc(1900 + s * 6, 1040, 58, s < 0 ? Math.PI * 1.02 : -Math.PI * 0.5, s < 0 ? Math.PI * 1.5 : -Math.PI * 0.02, false); g.strokePath();
      g.lineStyle(3, 0xe8e2d0, 1);
      g.beginPath(); g.arc(1900 + s * 6, 1040, 60, s < 0 ? Math.PI * 1.05 : -Math.PI * 0.48, s < 0 ? Math.PI * 1.48 : -Math.PI * 0.05, false); g.strokePath();
    }
    // Rods leaning on the wall.
    for (let i = 0; i < 4; i++) {
      g.lineStyle(2, i % 2 ? 0xd8d0b8 : 0x6a5a3a, 1);
      g.lineBetween(1830 + i * 6, 1072, 1824 + i * 8, 964 - i * 6);
    }
    // A cod sign with a hook through its lip.
    g.fillStyle(0x6a7a6a, 1); g.fillEllipse(1960, 950, 56, 18); g.fillTriangle(1934, 950, 1922, 940, 1922, 960);
    g.fillStyle(0x1a1410, 1); g.fillCircle(1980, 947, 2);
    g.lineStyle(2, 0xa8a8a0, 1); g.beginPath(); g.arc(1990, 958, 5, 0, Math.PI, false); g.strokePath();
    // A gaff hanging by the door.
    g.lineStyle(2, 0x4a3a2a, 1); g.lineBetween(1868, 1000, 1868, 1056);
    g.lineStyle(2, 0xa8a8a0, 1); g.beginPath(); g.arc(1874, 1060, 6, Math.PI * 0.2, Math.PI * 1.1, false); g.strokePath();
  },
});
solids.push({ kind: 'rect', x: 1815, y: 1074, w: 170, h: 26 });

// The boatwright's slip — a cutter on its cradle under a striped sailcloth awning, a steam-box.
building(1580, 1236, 180, 100, (g, rng) => {
  shadow(g, 1580, 1240, 220, 22, 0.35);
  // Cradle and hull.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(1508, 1214, 8, 22); g.fillRect(1644, 1214, 8, 22);
  g.fillStyle(0x3a5a6a, 1); g.fillEllipse(1580, 1206, 150, 34);
  g.fillStyle(0x4a6a7a, 1); g.fillEllipse(1580, 1200, 140, 22);
  g.fillStyle(lit(0x4a6a7a, 0.2), 1); g.fillEllipse(1570, 1194, 100, 6);
  g.lineStyle(2, PLANK_DARK, 1);
  for (let k = 0; k < 5; k++) g.lineBetween(1620 + k * 8, 1194, 1618 + k * 8, 1172);
  for (let k = 0; k < 8; k++) { g.fillStyle(mixC(PLANK, 0x3a5a6a, rng()), 1); g.fillRect(1520 + k * 12, 1198, 10, 4); }
  // Awning on four poles.
  for (const px of [1496, 1664]) { g.fillStyle(PLANK_DARK, 1); g.fillRect(px - 2, 1132, 4, 104); }
  for (let k = 0; k < 9; k++) {
    g.fillStyle(k % 2 ? 0xd8d0c0 : 0x2a6a7a, 1);
    g.fillRect(1490 + k * 20, 1124, 20, 14);
    g.fillTriangle(1490 + k * 20, 1138, 1510 + k * 20, 1138, 1500 + k * 20, 1148);
  }
  // Steam-box for bending planks.
  g.fillStyle(0x4a3e30, 1); g.fillRect(1668, 1200, 44, 22);
  g.fillStyle(0x2a2218, 1); g.fillRect(1672, 1204, 36, 4);
  for (let k = 0; k < 4; k++) { g.fillStyle(mixC(PLANK, 0x000000, 0.2), 1); g.fillRect(1714, 1218 - k * 5, 36, 4); }
}, 40);

// The lighthouse stump on the headland — banded white and sea-green, broken jagged at the top.
pieces.push({
  x: 2470, y: 1340, w: 150, h: 260, draw: (g) => {
    shadow(g, 2470, 1346, 130, 30, 0.45);
    for (let k = 0; k < 4; k++) {
      const y0 = 1340 - k * 40;
      const wb = 50 - k * 3, wt = 50 - (k + 1) * 3;
      poly(g, [[2470 - wb, y0], [2470 + wb, y0], [2470 + wt, y0 - 40], [2470 - wt, y0 - 40]], k % 2 ? 0x2a7a72 : 0xd8d4c4);
      g.fillStyle(0xffffff, 0.08); g.fillRect(2470 - wb + 4, y0 - 40, 8, 40);
    }
    // The break: a jagged top edge, rubble dark inside.
    poly(g, [[2424, 1180], [2434, 1170], [2444, 1182], [2454, 1164], [2466, 1178], [2478, 1158], [2490, 1176], [2502, 1168], [2514, 1180], [2514, 1190], [2424, 1190]], 0x1e2422);
    g.fillStyle(0xd8d4c4, 1);
    for (const [x, y] of [[2434, 1176], [2454, 1170], [2478, 1164], [2502, 1174]] as [number, number][]) g.fillTriangle(x - 6, y + 10, x + 6, y + 10, x, y);
    // Barnacles and weed at the foot.
    g.fillStyle(TIDE, 0.9); g.fillRect(2420, 1310, 100, 30);
    for (let k = 0; k < 18; k++) { g.fillStyle(0xd8d4c4, 0.9); g.fillCircle(2424 + ((k * 37) % 92), 1314 + ((k * 13) % 24), 1.6); }
    // Door, and Ambrose's iron bracket at the top for his lantern.
    g.fillStyle(0x141a18, 1); g.fillRoundedRect(2458, 1300, 24, 40, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.lineStyle(3, 0x1a1a18, 1); g.lineBetween(2510, 1196, 2530, 1196); g.lineBetween(2530, 1196, 2530, 1206);
    g.fillStyle(0x1a1a18, 1); g.fillRoundedRect(2524, 1206, 12, 16, 3);
  },
});
solids.push({ kind: 'circle', x: 2470, y: 1330, r: 50 });

// The lamp room the wave knocked down — on its side on the rocks, gallery rail bent, glass smashed.
pieces.push({
  x: 2300, y: 1384, w: 220, h: 120, draw: (g, rng) => {
    shadow(g, 2300, 1386, 200, 24, 0.4);
    // Gallery ring, crushed into an ellipse.
    g.fillStyle(0x1e2422, 1); g.fillEllipse(2300, 1370, 190, 34);
    g.lineStyle(2, 0x3a4040, 1);
    for (let k = 0; k <= 12; k++) {
      const x = 2210 + k * 15;
      const bend = Math.sin(k * 0.9) * 6;
      g.lineBetween(x, 1360, x + 4 + bend, 1340 + Math.abs(bend));
    }
    g.lineBetween(2210, 1340, 2390, 1346);
    // The lamp room itself, lying long-ways: a drum of frames with broken panes.
    g.fillStyle(0x2a3030, 1); g.fillRoundedRect(2228, 1318, 140, 46, 10);
    for (let k = 0; k < 6; k++) {
      const px = 2234 + k * 22;
      g.fillStyle(0x1a2020, 1); g.fillRect(px, 1322, 18, 38);
      if (k % 2 === 0) {
        g.fillStyle(0xbfe6e6, 0.5);
        poly(g, [[px + 1, 1323], [px + 17, 1323], [px + 12, 1336], [px + 3, 1350]], 0xbfe6e6, 0.45);
      }
    }
    // The cap, rolled off to one side.
    g.fillStyle(0x1a2020, 1); g.fillTriangle(2370, 1330, 2370, 1362, 2400, 1346);
    // Glass shards glittering on the rocks.
    for (let i = 0; i < 26; i++) {
      g.fillStyle(0xd8f4f4, 0.5 + rng() * 0.4);
      g.fillTriangle(2200 + rng() * 220, 1370 + rng() * 14, 2203 + rng() * 220, 1372 + rng() * 14, 2201 + rng() * 220, 1366 + rng() * 14);
    }
  },
});
solids.push({ kind: 'rect', x: 2214, y: 1340, w: 190, h: 40 });

// The drowned low quarter: rooftops and the chapel belfry standing out of the water.
function sunkHouse(x: number, y: number, w: number, roof: number, wall: number, rng0 = 0): void {
  pieces.push({
    x, y, w: w + 30, h: 90, draw: (g, rng) => {
      // The top of the wall above the waterline, then the roof.
      g.fillStyle(dim(wall, 0.3), 1); g.fillRect(x - w / 2, y - 22, w, 22);
      g.fillStyle(wall, 1); g.fillRect(x - w / 2 + 2, y - 20, w - 4, 18);
      tideMarks(g, x - w / 2, x + w / 2, y, [4, 12], rng);
      g.fillStyle(0x0e1e1c, 1); g.fillRect(x - 10, y - 18, 20, 16);
      if (rng0 % 2 === 0) { g.fillStyle(0x8a4a4a, 0.7); g.fillRect(x - 9, y - 17, 7, 14); } // a curtain, still drawn
      g.fillStyle(dim(roof, 0.4), 1); g.fillTriangle(x - w / 2 - 8, y - 20, x + w / 2 + 8, y - 20, x, y - 20 - w * 0.4);
      g.fillStyle(roof, 1); g.fillTriangle(x - w / 2 - 4, y - 22, x + w / 2 + 4, y - 22, x, y - 18 - w * 0.4);
      for (let k = 0; k < 6; k++) { g.fillStyle(0x3a5a3a, 0.7); g.fillCircle(x - w / 3 + rng() * w * 0.66, y - 26 - rng() * 12, 2 + rng() * 2); }
      if (rng0 === 1) { g.fillStyle(0xe8e8e0, 1); g.fillCircle(x + 6, y - 20 - w * 0.4, 3); } // a gull's perch
    },
  });
}
sunkHouse(220, 950, 90, 0x3a3438, 0x5a5e56, 0);
sunkHouse(380, 930, 80, 0x2e3438, 0x606058, 1);
sunkHouse(700, 950, 96, 0x3a3034, 0x5a5850, 2);
sunkHouse(850, 940, 80, 0x34383a, 0x5e5e56, 3);
sunkHouse(220, 1160, 96, 0x30343a, 0x5a5e56, 4);
sunkHouse(380, 1180, 84, 0x3a3438, 0x5c5a52, 5);
sunkHouse(880, 1180, 70, 0x2e3436, 0x5a5850, 7);

// The Drowned Chapel's belfry: square stone, a pointed cap, the bell still hung.
pieces.push({
  x: 720, y: 1170, w: 90, h: 190, draw: (g, rng) => {
    g.fillStyle(dim(STONE, 0.35), 1); g.fillRect(692, 1060, 56, 110);
    g.fillStyle(0x6a7670, 1); g.fillRect(695, 1062, 50, 108);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
      g.fillStyle(rng() < 0.5 ? 0x627068 : 0x72807a, 1); g.fillRect(697 + c * 24 + (r % 2) * 10, 1066 + r * 20, 22, 18);
    }
    tideMarks(g, 692, 748, 1170, [8, 26, 48], rng);
    g.fillStyle(0x0e1a18, 1); g.fillRoundedRect(706, 1076, 28, 34, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(BRASS, 0.85); g.fillTriangle(712, 1104, 728, 1104, 720, 1088); g.fillCircle(720, 1094, 5);
    g.fillStyle(0x2a3236, 1); g.fillTriangle(686, 1062, 754, 1062, 720, 1010);
    g.fillStyle(0x3a4448, 1); g.fillTriangle(692, 1060, 748, 1060, 720, 1016);
    g.lineStyle(2, 0x1a1a18, 1); g.lineBetween(720, 1012, 720, 998); g.lineBetween(714, 1004, 726, 1004);
    for (let k = 0; k < 8; k++) { g.lineStyle(1.5, 0x3a5a3a, 0.8); g.lineBetween(696 + k * 7, 1170, 698 + k * 7, 1150 - rng() * 30); }
  },
});

// Bridge posts across the low quarter, rope-collared.
for (let x = BRIDGE.x + 60; x < BRIDGE.x + BRIDGE.w; x += 120) {
  if (x > HUB.x - 10 && x < HUB.x + HUB.w + 10) continue;
  for (const y of [BRIDGE.y - 2, BRIDGE.y + BRIDGE.h + 6]) pieces.push({ x, y, w: 20, h: 40, draw: (g) => post(g, x, y, 26) });
}
for (const [x, y] of [[HUB.x + 4, HUB.y + 4], [HUB.x + HUB.w - 4, HUB.y + 4], [HUB.x + 4, HUB.y + HUB.h], [HUB.x + HUB.w - 4, HUB.y + HUB.h]] as [number, number][]) {
  pieces.push({ x, y, w: 20, h: 40, draw: (g) => post(g, x, y, 30) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 5 });
}
// Brother Kelp's lectern on the hub, with the sea-book open on it.
pieces.push({
  x: 548, y: 1004, w: 40, h: 60, draw: (g) => {
    shadow(g, 548, 1005, 24, 6);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(545, 976, 6, 28);
    poly(g, [[534, 976], [562, 976], [566, 966], [530, 966]], 0x4a3a2a);
    g.fillStyle(0xe8e2cc, 1); g.fillRect(534, 964, 13, 9); g.fillRect(549, 964, 13, 9);
    g.lineStyle(1, 0x3a3a3a, 0.7); for (let k = 0; k < 3; k++) { g.lineBetween(536, 966 + k * 2.5, 545, 966 + k * 2.5); g.lineBetween(551, 966 + k * 2.5, 560, 966 + k * 2.5); }
  },
});

// The Gannet Street memorial: a slate board on the west landing, chalked with the eleven names.
pieces.push({
  x: 50, y: 900, w: 90, h: 110, draw: (g) => {
    shadow(g, 50, 902, 80, 12);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(18, 840, 6, 62); g.fillRect(76, 840, 6, 62);
    g.fillStyle(0x1a1e20, 1); g.fillRect(12, 828, 76, 52);
    g.fillStyle(0x2a3034, 1); g.fillRect(15, 831, 70, 46);
    g.lineStyle(1, 0xd8d8d0, 0.7);
    for (let k = 0; k < 11; k++) {
      const col = k < 6 ? 0 : 1;
      const row = k % 6;
      const len = 14 + ((k * 7) % 12);
      g.lineBetween(20 + col * 34, 836 + row * 7, 20 + col * 34 + len, 836 + row * 7);
    }
    // Shells left on its ledge.
    for (let k = 0; k < 4; k++) { g.fillStyle([0xe8d8c8, 0xd8a8a0, 0xf0f0e8, 0xc8b8a0][k], 1); g.fillEllipse(24 + k * 16, 880, 7, 4); }
  },
});
solids.push({ kind: 'rect', x: 14, y: 886, w: 72, h: 16 });

// The tide gauge in the plaza — the town's clock and its bill.
pieces.push({
  x: 1300, y: 702, w: 60, h: 210, draw: (g) => {
    shadow(g, 1300, 704, 60, 16, 0.45);
    g.fillStyle(0x1e2626, 1); g.fillRect(1280, 678, 40, 26);
    g.fillStyle(0x3a4444, 1); g.fillRect(1283, 680, 34, 22);
    crest(g, 1300, 692, 7, BRASS, 0.9);
    // The glass tube in its brass frame, graduated.
    g.fillStyle(0x1a2222, 1); g.fillRect(1288, 520, 24, 160);
    g.fillStyle(0x9ad0d4, 0.28); g.fillRect(1291, 523, 18, 154);
    g.fillStyle(BRASS, 1);
    for (const y of [520, 560, 600, 640, 676]) g.fillRect(1286, y, 28, 4);
    g.lineStyle(1, 0xe8e2cc, 0.8);
    for (let k = 0; k < 15; k++) g.lineBetween(1310, 526 + k * 10, 1310 - (k % 5 === 0 ? 8 : 4), 526 + k * 10);
    // PAID and UNPAID bands painted on the frame.
    g.fillStyle(0x3a8a5a, 0.9); g.fillRect(1314, 600, 4, 76);
    g.fillStyle(0x8a3a2a, 0.9); g.fillRect(1314, 524, 4, 76);
    // Finial: the crest in brass.
    g.fillStyle(0x1a2222, 1); g.fillRect(1292, 508, 16, 12);
    crest(g, 1300, 494, 12, BRASS, 1);
  },
});
solids.push({ kind: 'circle', x: 1300, y: 694, r: 22 });

// The tithe queue: posts and a rope from the tithe-house steps out into the plaza.
for (let k = 0; k < 5; k++) {
  const x = 1600 - k * 34, y = 668 + k * 6;
  pieces.push({ x, y, w: 20, h: 40, draw: (g) => post(g, x, y, 24) });
  if (k > 0) {
    const px = 1600 - (k - 1) * 34, py = 668 + (k - 1) * 6;
    pieces.push({ x: (x + px) / 2, y: Math.max(y, py) - 1, w: 40, h: 30, draw: (g) => ropeLine(g, { x: px, y: py - 20 }, { x, y: y - 20 }, 6, 2, ROPE) });
  }
}

// The harbour: crab-pot stacks, upturned skiffs, kelp racks, barrels.
for (const [x, y, s] of [[1000, 1200, 9], [1022, 1206, 8], [1010, 1190, 8], [1190, 1210, 9], [2210, 1196, 9]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 3, draw: (g, rng) => crabPot(g, x, y, s, rng) });
  solids.push({ kind: 'circle', x, y: y - s * 0.6, r: s });
}
for (const [x, y, len, hull] of [[1130, 1226, 70, 0x4a5a5a], [2060, 1232, 80, 0x6a4a3a], [880, 1224, 60, 0x3a4a6a]] as [number, number, number, number][]) {
  pieces.push({ x, y, w: len + 20, h: 40, draw: (g) => upturnedSkiff(g, x, y, len, hull) });
  solids.push({ kind: 'rect', x: x - len / 2, y: y - 18, w: len, h: 18 });
}
for (const [x, y, w] of [[1440, 1150 + 90, 70], [2140, 1236, 80], [780, 1238, 70]] as [number, number, number][]) {
  pieces.push({ x, y, w: w + 20, h: 70, draw: (g, rng) => kelpRack(g, x, y, w, rng) });
  solids.push({ kind: 'circle', x: x - w / 2 + 2, y: y - 2, r: 5 }, { kind: 'circle', x: x + w / 2 - 2, y: y - 2, r: 5 });
}
for (const [x, y, s] of [[1360, 1112, 10], [1378, 1108, 9], [2200, 1112, 10], [960, 1110, 10], [1236, 790, 9]] as [number, number, number][]) {
  pieces.push({ x, y, w: 30, h: 40, draw: (g) => barrel(g, x, y, s, 0x5a5040, 0x2a3a3a) });
  solids.push({ kind: 'circle', x, y: y - 4, r: s });
}
for (const [x, y, s] of [[1240, 1110, 11], [2230, 1100, 10], [1200, 790, 9]] as [number, number, number][]) {
  pieces.push({ x, y, w: 30, h: 30, draw: (g) => crate(g, x, y, s, 0x6a5a44) });
  solids.push({ kind: 'rect', x: x - s, y: y - s, w: s * 2, h: s });
}

// Salt heaps at the corners of the pans, a rake stuck in one.
for (const [x, y] of [[2250, 1074], [2556, 1074]] as [number, number][]) {
  pieces.push({
    x, y, w: 60, h: 50, draw: (g) => {
      shadow(g, x, y, 50, 10);
      poly(g, [[x - 24, y], [x + 24, y], [x + 8, y - 26], [x - 6, y - 28]], 0xc8c4b4);
      poly(g, [[x - 18, y - 2], [x + 18, y - 2], [x + 4, y - 24], [x - 4, y - 25]], SALT);
      g.lineStyle(2, PLANK_DARK, 1); g.lineBetween(x + 6, y - 20, x + 22, y - 56);
      g.lineStyle(3, PLANK_DARK, 1); g.lineBetween(x + 14, y - 58, x + 30, y - 54);
    },
  });
  solids.push({ kind: 'circle', x, y: y - 6, r: 16 });
}

// Lamps along Tithe Row, the plaza and the harbour front.
for (const [x, y] of [[300, 716], [700, 716], [1100, 712], [1500, 712], [1900, 716], [2300, 716], [1260, 820], [1340, 1110], [1600, 1112], [1000, 1112]] as [number, number][]) {
  pieces.push({ x, y, w: 40, h: 70, draw: (g) => oilLamp(g, x, y) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 5 });
}

// Mooring posts along the beach and down the piers — the cormorants' favourite perches.
const CORMORANT_POSTS: [number, number][] = [[1244, 1300], [1356, 1360], [1244, 1420], [1714, 1260], [1786, 1340], [2120, 1248]];
for (const [x, y] of CORMORANT_POSTS) pieces.push({ x, y, w: 20, h: 40, draw: (g) => post(g, x, y, 30) });

// Rocks on the headland and the shingle.
for (const [x, y, s] of [[2200, 1290, 16], [2560, 1290, 20], [2580, 1360, 14], [2000, 1244, 12], [60, 1236, 18], [140, 1244, 12]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2, draw: (g, rng) => rock(g, x, y, s, 0x3a4444, rng) });
  solids.push({ kind: 'circle', x, y: y - s * 0.3, r: s * 0.8 });
}

// ── Water and walls as solids ────────────────────────────────────────

solids.push(
  // The open sea, with the piers and the headland cut out of it.
  ...carve({ x: 0, y: SEA_Y + 6, w: W, h: H - SEA_Y - 6 }, [MAIN_PIER, FISH_PIER, HEADLAND]),
  // Off the ends of the piers and the headland's tip.
  { kind: 'rect', x: HEADLAND.x, y: HEADLAND.y + HEADLAND.h, w: HEADLAND.w, h: H - HEADLAND.y - HEADLAND.h },
  // The drowned basin, with the bridge, the boardwalk and the hub cut out.
  ...carve(BASIN, [BRIDGE, BOARDWALK, HUB]),
  // The seawall either side of the Tidewater road.
  { kind: 'rect', x: 0, y: 0, w: 1220, h: 72 },
  { kind: 'rect', x: 1380, y: 0, w: W - 1380, h: 72 },
);

// ── Animation ────────────────────────────────────────────────────────

/** Moored boats along the piers, bobbing on the swell. */
const MOORED: { x: number; y: number; len: number; hull: number; mast: boolean }[] = [
  { x: 1212, y: 1350, len: 48, hull: 0x2a5a6a, mast: true },
  { x: 1392, y: 1410, len: 58, hull: 0x5a3a2a, mast: true },
  { x: 1680, y: 1320, len: 32, hull: 0x8a7a5a, mast: false },
  { x: 1822, y: 1300, len: 38, hull: 0x3a4a3a, mast: false },
];

/** Flotsam drifting slow loops on the drowned basin — a hat, a bucket, a chair, a basket. */
const FLOTSAM: { cx: number; cy: number; r: number; sp: number; kind: number }[] = [
  { cx: 270, cy: 1110, r: 40, sp: 0.07, kind: 0 },
  { cx: 690, cy: 1110, r: 30, sp: -0.06, kind: 1 },
  { cx: 300, cy: 920, r: 26, sp: 0.05, kind: 2 },
  { cx: 820, cy: 1070, r: 34, sp: 0.08, kind: 3 },
];

function animateUnder(g: G, t: number, view: Rect): void {
  // ── The open sea: long rolling swells, each with a broken white crest.
  if (view.y + view.h > SEA_Y - 40) {
    for (let row = 0; row < 11; row++) {
      const y = SEA_Y + 20 + row * 22;
      if (y < view.y - 20 || y > view.y + view.h + 20) continue;
      const speed = 10 + row * 2.5;
      for (let x = Math.floor(view.x / 90) * 90 - 90; x < view.x + view.w + 90; x += 90) {
        const ox = x + ((t * speed + row * 41) % 90);
        if (FISH_PIER.x - 10 < ox && ox < FISH_PIER.x + FISH_PIER.w + 10 && y < FISH_PIER.y + FISH_PIER.h) continue;
        const yy = y + Math.sin(t * 0.9 + x * 0.013 + row) * 4;
        g.lineStyle(3, lit(SEA, 0.25), 0.18);
        g.lineBetween(ox, yy, ox + 40, yy - 1);
        if ((row + Math.floor(x / 90)) % 4 === 0) { g.fillStyle(FOAM, 0.3); g.fillEllipse(ox + 30, yy - 1, 10, 2.4); }
      }
    }
    // Surf dragging the shingle: foam that runs up, then sinks back through the stones.
    const run = (Math.sin(t * 0.7) + 1) / 2;
    for (let x = Math.floor(view.x / 26) * 26; x < view.x + view.w + 26; x += 26) {
      if (x > MAIN_PIER.x - 6 && x < MAIN_PIER.x + MAIN_PIER.w + 6) continue;
      if (x > FISH_PIER.x - 6 && x < FISH_PIER.x + FISH_PIER.w + 6) continue;
      if (x > HEADLAND.x) continue;
      const y = SEA_Y + 2 - run * 14 + Math.sin(x * 0.04 + t * 1.3) * 3;
      g.fillStyle(FOAM, 0.35 + run * 0.3); g.fillEllipse(x + 13, y, 28, 4);
      for (let k = 0; k < 2; k++) { g.fillStyle(FOAM, 0.25 * (1 - run)); g.fillCircle(x + 6 + k * 12, y + 5, 1.2); }
    }
    // Foam collars round the pier posts.
    for (const p of [MAIN_PIER, FISH_PIER]) {
      for (let y = Math.max(p.y, SEA_Y) + 40; y < p.y + p.h; y += 44) {
        if (!inView(view, p.x, y, 30)) continue;
        const k = 0.35 + Math.sin(t * 1.8 + y) * 0.2;
        g.fillStyle(FOAM, k); g.fillEllipse(p.x - 2, y + 16, 16, 4); g.fillEllipse(p.x + p.w + 2, y + 16, 16, 4);
      }
    }
    // Moored boats.
    for (const b of MOORED) {
      if (!inView(view, b.x, b.y, 80)) continue;
      const bob = Math.sin(t * 1.2 + b.x) * 3;
      const roll = Math.sin(t * 0.9 + b.y) * 0.06;
      const y = b.y + bob;
      g.fillStyle(0x0a1a22, 0.4); g.fillEllipse(b.x + 4, y + 10, b.len + 10, 12);
      g.fillStyle(dim(b.hull, 0.4), 1); g.fillEllipse(b.x, y + 2, b.len, 16);
      g.fillStyle(b.hull, 1); g.fillEllipse(b.x, y, b.len - 4, 12);
      g.fillStyle(lit(b.hull, 0.25), 1); g.fillEllipse(b.x, y - 2, b.len - 14, 4);
      // A tithe-stamp on the bow — the Queen's crest, small.
      crest(g, b.x + b.len * 0.32, y - 1, 3, QUEEN, 0.7);
      if (b.mast) {
        const mx = b.x + roll * 70;
        g.lineStyle(2, 0x2a2018, 1); g.lineBetween(b.x, y - 2, mx, y - 50);
        g.lineStyle(1, 0x8a7a5a, 0.7); g.lineBetween(mx, y - 50, b.x + b.len / 2, y - 2); g.lineBetween(mx, y - 50, b.x - b.len / 2, y - 2);
        // Sail furled along the boom.
        g.fillStyle(0xc8c0a8, 1); g.fillRoundedRect(b.x - 2, y - 16, b.len * 0.45, 5, 2);
      }
      const pierX = b.x < 1300 ? MAIN_PIER.x : b.x < 1600 ? MAIN_PIER.x + MAIN_PIER.w : b.x < FISH_PIER.x ? FISH_PIER.x : FISH_PIER.x + FISH_PIER.w;
      g.lineStyle(1, ROPE, 0.6); g.lineBetween(b.x + (pierX < b.x ? -b.len / 2 : b.len / 2), y, pierX, y - 12);
    }
    // Spray thrown up where the swell meets the headland rocks.
    for (let i = 0; i < 4; i++) {
      const x = 2210 + i * 100, y = HEADLAND.y + HEADLAND.h - 6;
      if (!inView(view, x, y, 80)) continue;
      const ph = (t * 0.5 + i * 0.27) % 1;
      if (ph > 0.4) continue;
      const k = ph / 0.4;
      for (let s = 0; s < 6; s++) {
        g.fillStyle(FOAM, (1 - k) * 0.6);
        g.fillCircle(x + (s - 2.5) * 8 * k * 2, y - Math.sin(k * Math.PI) * 30 - s * 2, 3 + k * 3);
      }
    }
  }

  // ── The drowned basin: the water breathes in and out with the Queen's clock.
  if (inView(view, BASIN.x + BASIN.w / 2, BASIN.y + BASIN.h / 2, 500)) {
    const tide = (Math.sin(t * 0.25) + 1) / 2;
    g.lineStyle(4 + tide * 8, SUNK, 0.55);
    g.strokeRoundedRect(BASIN.x - 6 - tide * 5, BASIN.y - 6 - tide * 5, BASIN.w + 12 + tide * 10, BASIN.h + 12 + tide * 10, 32);
    g.lineStyle(1.5, FOAM, 0.25 + tide * 0.2);
    g.strokeRoundedRect(BASIN.x - 10 - tide * 6, BASIN.y - 10 - tide * 6, BASIN.w + 20 + tide * 12, BASIN.h + 20 + tide * 12, 34);
    // Slow ripple rings, as if something breathed underneath.
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.18 + i / 6) % 1;
      const cx = BASIN.x + 80 + ((i * 271) % (BASIN.w - 160));
      const cy = BASIN.y + 50 + ((i * 113) % (BASIN.h - 100));
      if (Math.abs(cy - (BRIDGE.y + 18)) < 30 || Math.abs(cx - (BOARDWALK.x + 20)) < 40) continue;
      g.lineStyle(1.5, lit(SUNK, 0.35), (1 - ph) * 0.4);
      g.strokeEllipse(cx, cy, 10 + ph * 60, 4 + ph * 22);
    }
    // Bubbles rising from Gannet Street's doors.
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.6 + i * 0.137) % 1;
      const bx = BASIN.x + 60 + ((i * 157) % (BASIN.w - 120)) + Math.sin(t * 2 + i) * 3;
      const by = BASIN.y + 40 + ((i * 89) % (BASIN.h - 80));
      if (Math.abs(by - (BRIDGE.y + 18)) < 24) continue;
      g.lineStyle(1, 0xc8f0e8, (1 - ph) * 0.5);
      g.strokeCircle(bx, by - ph * 6, 1 + ph * 2.5);
    }
    // Flotsam.
    for (const f of FLOTSAM) {
      const a = t * f.sp * Math.PI * 2;
      const x = f.cx + Math.cos(a) * f.r, y = f.cy + Math.sin(a) * f.r * 0.4 + Math.sin(t * 1.4 + f.cx) * 1.5;
      g.fillStyle(0x0a1614, 0.35); g.fillEllipse(x + 2, y + 4, 20, 6);
      if (f.kind === 0) { g.fillStyle(0x2a2a30, 1); g.fillEllipse(x, y, 18, 6); g.fillRoundedRect(x - 6, y - 8, 12, 8, 3); }
      else if (f.kind === 1) { g.fillStyle(0x5a5a54, 1); g.fillRect(x - 6, y - 6, 12, 8); g.fillStyle(0x2a2a26, 1); g.fillEllipse(x, y - 6, 12, 3); }
      else if (f.kind === 2) {
        g.fillStyle(0x6a5038, 1); g.fillRect(x - 8, y - 3, 16, 4);
        g.fillRect(x - 8, y - 12, 3, 10); g.fillRect(x + 5, y - 1, 3, 6);
      } else { g.fillStyle(0x8a7040, 1); g.fillEllipse(x, y - 2, 20, 9); g.lineStyle(1, 0x5a4420, 1); g.strokeEllipse(x, y - 2, 20, 9); }
    }
    // Lune's punt at its post by the north rim.
    const px = 640, py = 890 + Math.sin(t * 1.1) * 1.5;
    g.fillStyle(0x0a1614, 0.35); g.fillEllipse(px + 3, py + 5, 70, 10);
    g.fillStyle(0x3a2e22, 1); g.fillRoundedRect(px - 34, py - 6, 68, 12, 4);
    g.fillStyle(0x5a4632, 1); g.fillRoundedRect(px - 31, py - 5, 62, 8, 3);
    g.lineStyle(2, 0x6a5a3a, 1); g.lineBetween(px + 20, py - 4, px + 46, py - 46);
    g.lineStyle(1, ROPE, 0.8); g.lineBetween(px - 32, py - 2, 660, 862);
    // Hand-ropes along the bridge and boardwalk, swaying.
    const sway = Math.sin(t * 1.3) * 2;
    for (let x = BRIDGE.x; x < BRIDGE.x + BRIDGE.w; x += 120) {
      const x1 = Math.min(BRIDGE.x + BRIDGE.w, x + 120);
      if (x1 < view.x - 20 || x > view.x + view.w + 20) continue;
      if (x + 60 > HUB.x && x < HUB.x + HUB.w) continue;
      ropeLine(g, { x, y: BRIDGE.y - 18 }, { x: x1, y: BRIDGE.y - 18 }, 6 + sway, 2, ROPE, 0.9);
      ropeLine(g, { x, y: BRIDGE.y + BRIDGE.h - 14 }, { x: x1, y: BRIDGE.y + BRIDGE.h - 14 }, 6 - sway, 2, ROPE, 0.9);
    }
  }

  // ── Salt pans glinting as the crust catches the light.
  if (inView(view, PANS.x + PANS.w / 2, PANS.y + PANS.h / 2, 300)) {
    for (let i = 0; i < 24; i++) {
      const k = Math.max(0, Math.sin(t * 1.5 + i * 2.1));
      g.fillStyle(0xffffff, 0.6 * k * k);
      g.fillCircle(PANS.x + 10 + ((i * 131) % (PANS.w - 20)), PANS.y + 10 + ((i * 59) % (PANS.h - 20)), 1.3);
    }
  }

  // ── Mud puddles shimmering under the stilts.
  for (let i = 0; i < 16; i++) {
    const x = 1000 + ((i * 433) % 1200), y = ROCK_Y + 60 + ((i * 97) % 240);
    if (!inView(view, x, y, 20)) continue;
    const k = Math.max(0, Math.sin(t * 1.1 + i * 1.7));
    g.fillStyle(0xc8e8e4, 0.25 * k); g.fillEllipse(x, y, 12, 2);
  }
}

function animateAbove(g: G, t: number, view: Rect): void {
  // ── The tide gauge's float: the Queen's level, rising toward UNPAID twice a cycle.
  if (inView(view, 1300, 600, 160)) {
    const lvl = (Math.sin(t * 0.25) + 1) / 2;
    const fy = 670 - lvl * 140;
    g.fillStyle(0x5ab0b8, 0.35); g.fillRect(1291, fy, 18, 677 - fy);
    g.fillStyle(0xe8e2cc, 1); g.fillRect(1290, fy - 3, 20, 6);
    g.fillStyle(lvl > 0.55 ? 0xc84a3a : 0x3a8a5a, 1); g.fillTriangle(1286, fy, 1280, fy - 5, 1280, fy + 5);
  }
  // ── The Brine Oven's funnel: thick, slow, salt-grey smoke and a pulse at the fire-door.
  if (inView(view, 2290, 380, 200)) {
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.2 + i / 7) % 1;
      g.fillStyle(0x9a9a92, (1 - ph) * 0.32);
      g.fillCircle(2290 - ph * 70 + Math.sin(t + i) * 6, 440 - ph * 170, 9 + ph * 24);
    }
    glow(g, 2254, 620, 30 + Math.sin(t * 5) * 3, 0xff8a3a, 0.05, 3);
  }
  // ── Hesper's steam-box breathing.
  if (inView(view, 1690, 1180, 120)) {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.4 + i / 4) % 1;
      g.fillStyle(0xe8ece8, (1 - ph) * 0.3);
      g.fillCircle(1690 + Math.sin(t * 2 + i) * 4, 1196 - ph * 60, 4 + ph * 10);
    }
  }
  // ── Ambrose's lantern on the stump, and the weak beam it throws: it reaches nowhere much.
  const lx = 2530, ly = 1214;
  if (inView(view, lx, ly, 500)) {
    const f = 0.85 + Math.sin(t * 7) * 0.1 + Math.sin(t * 13) * 0.05;
    glow(g, lx, ly, 26 * f, LAMP, 0.07, 3);
    g.fillStyle(LAMP, 0.95); g.fillRect(lx - 4, ly - 6, 8, 12);
    const a = Math.PI * 0.75 + Math.sin(t * 0.4) * 0.6;
    g.fillStyle(LAMP, 0.05);
    g.fillTriangle(lx, ly, lx + Math.cos(a - 0.12) * 300, ly + Math.sin(a - 0.12) * 150, lx + Math.cos(a + 0.12) * 300, ly + Math.sin(a + 0.12) * 150);
  }
  // ── Washing strung between the stilt houses, flapping in the wind off the sea.
  for (const [ax, ay, bx, by] of [[1135, 880, 1410, 858], [1555, 860, 1915, 870], [2065, 870, 2220, 1000]] as [number, number, number, number][]) {
    if (!inView(view, (ax + bx) / 2, (ay + by) / 2, 300)) continue;
    ropeLine(g, { x: ax, y: ay }, { x: bx, y: by }, 14, 1.2, ROPE, 0.9);
    const n = Math.floor(Math.hypot(bx - ax, by - ay) / 34);
    for (let k = 1; k < n; k++) {
      const u = k / n;
      const x = ax + (bx - ax) * u, y = ay + (by - ay) * u + Math.sin(u * Math.PI) * 14;
      const flap = Math.sin(t * 4 + k * 1.3) * 4;
      g.fillStyle([0xe8e0d0, 0x5a7a9a, 0xc8a090, 0xd8d8c8, 0x7a5a5a][k % 5], 0.95);
      poly(g, [[x - 7, y], [x + 7, y], [x + 7 + flap, y + 16], [x - 7 + flap * 0.6, y + 15]], [0xe8e0d0, 0x5a7a9a, 0xc8a090, 0xd8d8c8, 0x7a5a5a][k % 5]);
    }
  }
  // ── Cormorants on the mooring posts, holding their wings out to dry.
  CORMORANT_POSTS.forEach(([x, y0], i) => {
    const y = y0 - 32;
    if (!inView(view, x, y, 40)) return;
    const open = Math.max(0, Math.sin(t * 0.6 + i * 1.9));
    g.fillStyle(0x14181a, 1); g.fillEllipse(x, y - 6, 8, 14);
    g.fillCircle(x + 1, y - 15, 3.4);
    g.fillStyle(0xd8a040, 1); g.fillTriangle(x + 3, y - 15, x + 9, y - 14, x + 3, y - 13);
    if (open > 0.2) {
      g.fillStyle(0x1a1e20, 1);
      poly(g, [[x - 2, y - 10], [x - 2 - 16 * open, y - 14 - 4 * open], [x - 2 - 14 * open, y - 2]], 0x1a1e20);
      poly(g, [[x + 2, y - 10], [x + 2 + 16 * open, y - 14 - 4 * open], [x + 2 + 14 * open, y - 2]], 0x1a1e20);
    }
  });
  // ── Sea-fog curling in low over the beach.
  if (view.y + view.h > 1100) {
    for (let i = 0; i < 7; i++) {
      const x = ((t * 12 + i * 420) % (W + 400)) - 200;
      const y = 1190 + (i % 3) * 30 + Math.sin(t * 0.3 + i) * 10;
      if (!inView(view, x, y, 200)) continue;
      g.fillStyle(0xd8e4e2, 0.05); g.fillEllipse(x, y, 320, 50);
      g.fillStyle(0xd8e4e2, 0.04); g.fillEllipse(x + 60, y - 10, 200, 34);
    }
  }
  // ── The chapel bell, swinging faintly under the belfry as the water moves it.
  if (inView(view, 720, 1094, 60)) {
    const sw = Math.sin(t * 0.8) * 2;
    g.fillStyle(BRASS, 0.25); g.fillCircle(720 + sw, 1094, 7);
  }
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1176, y: 676 } },
  { kind: 'mooring', at: { x: 1300, y: 1452 }, isle: 'water' },
  { kind: 'water', id: 'brinehollow-sea-water', shape: { x: 880, y: 1270, w: 1240, h: 210 }, fishery: 'brinehollow-sea' },
  { kind: 'sign', at: { x: 1400, y: 140 }, text: 'NORTH — The Tidewater Court. Prince Ebb keeps the tide clock. Mind the noon flood.' },
  { kind: 'sign', at: { x: 150, y: 700 }, text: 'WEST — The Sailmaker\'s Court. Prince Hem\'s lofts. Every bolt of canvas is the Queen\'s.' },
  { kind: 'sign', at: { x: 2450, y: 700 }, text: 'EAST — The Slickharbor Court. Prince Crude\'s refinery. No open flame on the quays.' },
  { kind: 'sign', at: { x: 1380, y: 1176 }, text: 'MAIN PIER — Mooring at the end. Hulls: Hesper Gullwing. Tackle: Jory Gullet, fishing pier.' },
  {
    kind: 'sign', at: { x: 1470, y: 650 },
    text: 'THE DRY TITHE. One coin a head, each tide. Paid floors are given back at low water. By order of the Crown.',
  },
  {
    kind: 'sign', at: { x: 80, y: 960 },
    text: 'GANNET STREET. Eleven doors, left under in the year of the rise. They are not dead. They are sleeping.',
  },
  { kind: 'sign', at: { x: 2250, y: 1270 }, text: 'THE BROKEN LIGHT. Keeper: A. Tallis. Lantern kept lit whether or not anybody is looking.' },
  { kind: 'chest', id: 'brinehollow-chest-drowned', at: { x: 52, y: 1050 }, coins: 90, orbs: 1 },
  { kind: 'chest', id: 'brinehollow-chest-lighthouse', at: { x: 2560, y: 1250 }, orbs: 2, coins: 40 },
  { kind: 'chest', id: 'brinehollow-chest-tithe', at: { x: 1780, y: 690 }, coins: 300, open: { monarch: 'maresa' } },
];

export const BRINEHOLLOW_AREA: AreaDef = {
  id: 'brinehollow',
  isle: 'water',
  name: 'Brinehollow',
  subtitle: 'Half-sunk harbour of the Drowned Reach',
  w: W,
  h: H,
  bg: ROCK,
  accent: QUEEN,
  weather: 'spray',
  spawn: { x: 1300, y: 1404 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'tidewater', label: 'The Tidewater Court' },
    { side: 'w', to: 'sailmaker', label: 'The Sailmaker\'s Court' },
    { side: 'e', to: 'slickharbor', label: 'The Slickharbor Court' },
  ],
  pois: POIS,
  npcs: BRINEHOLLOW_NPCS,
  crowd: BRINEHOLLOW_CROWD,
};

