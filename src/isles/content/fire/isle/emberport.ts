import Phaser from 'phaser';
import type { AreaDef, Poi, Rect, Solid } from '../../../IslesTypes';
import {
  type G, barrel, blob, brandSigil, crate, dim, flagstones, glow, groundFill, house, lamp, lit,
  mixC, rock, road, shadow, tree,
} from '../../../art/IsleArt';
import { EMBERPORT_CROWD, EMBERPORT_NPCS } from './emberportPeople';

/**
 * Emberport — the harbour every voyage to Brandmark starts and ends at.
 *
 * Black volcanic sand, a grey sea along the whole south edge, three piers, a lighthouse on its
 * rock and a town of tarred timber climbing up toward the basalt ridge. The Tithe Fire burns in
 * the plaza where the north road (the Hearth Court) crosses Cinder Row (Powder west, Candlewick
 * east). Nothing here is grand — it is the one place on the isle that smells of salt, not smoke.
 */

const W = 2600;
const H = 1500;
/** Where the sea begins. Everything south of it is water except the three piers. */
const SEA_Y = 1262;

// Palette — salt-bleached timber, tar, black sand and a cold grey sea.
const SOIL = 0x2a2422;
const SOIL_ALT = 0x3a302a;
const SAND = 0x1a181c;
const SAND_ALT = 0x26222a;
const SEA_SHALLOW = 0x2c5a64;
const SEA = 0x1d4452;
const SEA_DEEP = 0x122e3a;
const FOAM = 0xd6e6e2;
const PLANK = 0x6e5038;
const PLANK_DARK = 0x3a281c;
const TIMBER = 0x5a4434;
const EMBER = 0xff7a2f;
const WINDOW = 0xffb25a;

/** The three piers, as walkable decks over the sea. */
const PIERS: Rect[] = [
  { x: 690, y: 1190, w: 60, h: 230 },   // the fishing pier
  { x: 1255, y: 1180, w: 90, h: 280 },  // the main pier — mooring at its end
  { x: 1900, y: 1196, w: 60, h: 184 },  // the boatwright's slip
];

// ── Ground ───────────────────────────────────────────────────────────

function paintGround(g: G, rng: () => number): void {
  // Town soil: ash-grey dirt packed hard by carts.
  groundFill(g, { x: 0, y: 0, w: W, h: SEA_Y }, SOIL, SOIL_ALT, 0x6a5a50, rng);

  // The basalt ridge along the north edge, broken where the Hearth road climbs through.
  for (let x = 0; x < W; x += 34) {
    if (x > 1200 && x < 1400) continue;
    const h = 60 + rng() * 40;
    g.fillStyle(0x141012, 1); g.fillRect(x, 0, 36, h);
    g.fillStyle(0x221c1e, 1); g.fillRect(x + 3, 0, 28, h - 8);
    g.fillStyle(0x3a3236, 1); g.fillRect(x + 6, h - 14, 20, 4);
  }
  // Ash drifts at the foot of the ridge.
  for (let i = 0; i < 26; i++) blob(g, rng() * W, 90 + rng() * 40, 60 + rng() * 60, 14, 0x4a423e, 0.35, rng);

  // The black-sand beach, with a ragged join to the town.
  g.fillStyle(SAND, 1); g.fillRect(0, 1110, W, SEA_Y - 1110);
  for (let x = 0; x < W; x += 40) blob(g, x + 20, 1110, 40, 18 + rng() * 16, SAND, 1, rng);
  for (let i = 0; i < 120; i++) blob(g, rng() * W, 1120 + rng() * 130, 30 + rng() * 60, 8 + rng() * 10, SAND_ALT, 0.5, rng);
  // Glints of obsidian grit.
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.3 ? 0x9a9aac : 0x4a4652, 0.3 + rng() * 0.4);
    g.fillRect(rng() * W, 1110 + rng() * (SEA_Y - 1110), 1.5, 1.5);
  }
  // Wave-lines left in the sand by the last tide.
  for (let k = 0; k < 3; k++) {
    g.lineStyle(2, 0x3a3640, 0.6);
    g.beginPath();
    for (let x = 0; x <= W; x += 20) {
      const y = SEA_Y - 18 - k * 22 + Math.sin(x / 90 + k * 2) * 5;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }

  // The sea: shallow shelf, then deep water.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, SEA_Y, W, H - SEA_Y);
  g.fillStyle(SEA, 1); g.fillRect(0, SEA_Y + 50, W, H - SEA_Y - 50);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, SEA_Y + 140, W, H - SEA_Y - 140);
  for (let i = 0; i < 160; i++) {
    g.fillStyle(lit(SEA, 0.1), 0.25);
    g.fillEllipse(rng() * W, SEA_Y + 30 + rng() * (H - SEA_Y - 30), 30 + rng() * 80, 3 + rng() * 4);
  }

  // The lighthouse rock: a basalt tongue running out into the water.
  blob(g, 250, 1200, 170, 90, 0x1a1618, 1, rng, 12);
  blob(g, 250, 1196, 150, 74, 0x2a2428, 1, rng, 12);
  for (let i = 0; i < 18; i++) blob(g, 140 + rng() * 220, 1150 + rng() * 100, 14 + rng() * 18, 8 + rng() * 6, 0x3a3236, 0.9, rng);

  // Roads: the north road up the middle, Cinder Row across.
  road(g, [{ x: 1300, y: 0 }, { x: 1300, y: 600 }, { x: 1300, y: 1120 }], 90, 0x4a403a, 0x1e1816, 0x5e534a, rng);
  road(g, [{ x: 0, y: 750 }, { x: 1120, y: 752 }, { x: 1480, y: 752 }, { x: W, y: 750 }], 80, 0x463c36, 0x1e1816, 0x5a4f46, rng);
  // Side lanes to the doors.
  road(g, [{ x: 560, y: 470 }, { x: 560, y: 750 }], 36, 0x3e3632, 0x1e1816, 0x524840, rng);
  road(g, [{ x: 2100, y: 530 }, { x: 2100, y: 750 }], 36, 0x3e3632, 0x1e1816, 0x524840, rng);
  road(g, [{ x: 760, y: 750 }, { x: 760, y: 1040 }], 36, 0x3e3632, 0x1e1816, 0x524840, rng);
  road(g, [{ x: 2160, y: 750 }, { x: 2160, y: 1040 }], 36, 0x3e3632, 0x1e1816, 0x524840, rng);

  // The plaza: worn flagstones with the King's sigil cut into them in front of the Tithe Fire.
  g.fillStyle(0x1a1412, 1); g.fillRoundedRect(1112, 602, 376, 306, 40);
  flagstones(g, { x: 1120, y: 610, w: 360, h: 290 }, 30, 0x5a5048, 0x2a2420, rng);
  g.fillStyle(SOIL, 1);
  for (const [cx, cy] of [[1120, 610], [1480, 610], [1120, 900], [1480, 900]]) g.fillCircle(cx, cy, 26);
  brandSigil(g, 1300, 836, 34, 0x1a0e08, 0.55);
  brandSigil(g, 1300, 836, 30, 0x7a2a12, 0.35);

  // The harbour boardwalk: tarred planks along the front.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(420, 1058, 1900, 56);
  for (let x = 424; x < 2316; x += 13) {
    g.fillStyle(mixC(PLANK, 0x000000, rng() * 0.25), 1);
    g.fillRect(x, 1061, 11, 50);
    if (rng() < 0.15) { g.fillStyle(0x1a1410, 0.8); g.fillCircle(x + 5, 1064 + rng() * 44, 1.2); }
  }

  // Piers: shadows on the water, posts, planks.
  for (const p of PIERS) {
    g.fillStyle(0x0a1a22, 0.45); g.fillRect(p.x + 8, p.y + 12, p.w, p.h);
    for (let y = p.y + 30; y < p.y + p.h; y += 46) {
      g.fillStyle(0x1a120c, 1);
      g.fillRect(p.x - 6, y, 8, 16); g.fillRect(p.x + p.w - 2, y, 8, 16);
    }
    g.fillStyle(PLANK_DARK, 1); g.fillRect(p.x - 2, p.y, p.w + 4, p.h);
    for (let y = p.y + 2; y < p.y + p.h - 2; y += 11) {
      g.fillStyle(mixC(PLANK, 0x000000, rng() * 0.28), 1);
      g.fillRect(p.x, y, p.w, 9);
    }
    g.fillStyle(lit(PLANK, 0.18), 0.6); g.fillRect(p.x, p.y, 3, p.h);
  }
  // Mooring rings at the end of the main pier.
  for (const x of [1262, 1338]) {
    g.fillStyle(0x1a120c, 1); g.fillCircle(x, 1446, 7);
    g.lineStyle(2, 0x8a7a5a, 1); g.strokeCircle(x, 1446, 5);
  }
}

// ── Set pieces ───────────────────────────────────────────────────────

type Piece = NonNullable<AreaDef['painter']['pieces']>[number];
const pieces: Piece[] = [];
const solids: Solid[] = [];

/** A building: piece + base footprint solid. */
function building(x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void): void {
  pieces.push({ x, y, w: w + 60, h: h * 2 + 40, draw });
  solids.push({ kind: 'rect', x: x - w / 2, y: y - 44, w, h: 44 });
}

/** Tarred-timber town house with a branded door; the port's whole vernacular. */
function townHouse(x: number, y: number, w: number, h: number, wall: number, roof: number, warm = true): void {
  building(x, y, w, h, (g, rng) => {
    house(g, x, y, w, h, { wall, roof, roofStyle: 'gable', chimney: true, glow: warm ? WINDOW : 0, brand: true }, rng);
    // Salt crust along the eaves, rope coils by the door.
    g.fillStyle(0xd8d2c8, 0.18); g.fillRect(x - w / 2, y - h, w, 3);
    g.lineStyle(2, 0x8a7a5a, 0.9); g.strokeCircle(x + w / 2 - 14, y - 8, 6); g.strokeCircle(x + w / 2 - 14, y - 8, 3);
  });
}

// Houses up the slope and along Cinder Row.
townHouse(300, 300, 150, 100, 0x4a3a30, 0x2a2026);
townHouse(820, 330, 150, 104, 0x54443a, 0x3a2420);
townHouse(1080, 470, 140, 96, 0x4c3c34, 0x2e2a2c);
townHouse(1540, 420, 160, 108, 0x5a4a3c, 0x3a2a22);
townHouse(1830, 330, 170, 110, 0x4a3c34, 0x2a2228);
townHouse(2100, 520, 170, 108, 0x52423a, 0x3a2820);
townHouse(2360, 360, 170, 116, 0x4e3e34, 0x2c2226);
townHouse(2390, 640, 150, 100, 0x56463a, 0x302428);
townHouse(330, 640, 170, 108, 0x4e4036, 0x2a2224);
townHouse(560, 900, 150, 100, 0x4a3a30, 0x3a2622);
townHouse(1100, 880, 140, 94, 0x564438, 0x2e2428);
townHouse(1840, 930, 150, 100, 0x4a3c32, 0x302226);
townHouse(2420, 950, 140, 100, 0x52423a, 0x2a2026);

// Agna's cottage on Cinder Row — the one hearth with no smoke over it.
building(560, 420, 160, 100, (g, rng) => {
  house(g, 560, 420, 160, 100, { wall: 0x4a4040, roof: 0x262226, roofStyle: 'gable', chimney: true, glow: 0, brand: true }, rng);
  // A child's chalk drawing of a boat by the door.
  g.lineStyle(1.5, 0xd8d0c0, 0.7);
  g.lineBetween(520, 400, 540, 400); g.lineBetween(520, 400, 524, 406); g.lineBetween(540, 400, 536, 406);
  g.lineBetween(524, 406, 536, 406); g.lineBetween(530, 400, 530, 388); g.lineBetween(530, 388, 538, 398);
});

// Fenwick's Sundries — bay window full of bells, lanterns and lenses.
building(900, 640, 220, 130, (g, rng) => {
  house(g, 900, 640, 220, 130, { wall: 0x5a4636, roof: 0x24384a, roofStyle: 'gable', glow: 0xffd28a, trim: 0x2a1e18, door: 0x3a4a5a }, rng);
  // Bay window with the charms on display.
  g.fillStyle(0x2a1e18, 1); g.fillRect(800, 572, 70, 46);
  g.fillStyle(0xffd28a, 0.85); g.fillRect(804, 576, 62, 38);
  g.fillStyle(0xc9952f, 1); g.fillTriangle(812, 600, 822, 600, 817, 588); g.fillCircle(817, 592, 3.4);
  g.fillStyle(0x8a6a3a, 1); g.fillRect(830, 590, 8, 12);
  g.fillStyle(0xbfe6ff, 1); g.fillCircle(852, 596, 5);
  g.lineStyle(2, 0xa88a5a, 1); g.strokeCircle(840, 582, 4);
  // Hanging sign: a bell.
  g.fillStyle(0x2a1e18, 1); g.fillRect(950, 548, 46, 3); g.fillRect(994, 548, 2, 10);
  g.fillStyle(0x6a5038, 1); g.fillRoundedRect(966, 556, 52, 30, 4);
  g.fillStyle(0xc9952f, 1); g.fillTriangle(984, 580, 1000, 580, 992, 564); g.fillCircle(992, 570, 5);
});

// The Scorched Loaf — a bakery with a great domed brick oven built onto its side.
building(1700, 640, 230, 135, (g, rng) => {
  // The oven dome, glowing at the mouth.
  shadow(g, 1852, 646, 120, 24);
  g.fillStyle(0x3a1e14, 1); g.fillEllipse(1852, 612, 116, 96);
  g.fillStyle(0x7a3a24, 1); g.fillEllipse(1852, 608, 106, 86);
  for (let i = 0; i < 26; i++) {
    g.fillStyle(rng() < 0.5 ? 0x8a4a2e : 0x6a2e1c, 1);
    g.fillRect(1806 + rng() * 86, 572 + rng() * 60, 10, 5);
  }
  g.fillStyle(0x1a0a06, 1); g.fillRoundedRect(1832, 612, 40, 30, { tl: 16, tr: 16, bl: 0, br: 0 });
  g.fillStyle(0xff8a2a, 0.9); g.fillRoundedRect(1836, 618, 32, 24, { tl: 13, tr: 13, bl: 0, br: 0 });
  g.fillStyle(0xffd27a, 0.9); g.fillRect(1842, 632, 20, 10);
  g.fillStyle(0x2a1a14, 1); g.fillRect(1868, 520, 18, 60);
  house(g, 1700, 640, 230, 135, { wall: 0x6a4a34, roof: 0x5a2a1a, roofStyle: 'gable', glow: 0xffc070, chimney: true, door: 0x4a2a1a }, rng);
  // The scorched loaf on the sign — dark crust, cracked top.
  g.fillStyle(0x2a1e18, 1); g.fillRect(1600, 530, 3, 40);
  g.fillStyle(0x5a3a28, 1); g.fillRoundedRect(1580, 548, 56, 30, 5);
  g.fillStyle(0x3a1a0a, 1); g.fillEllipse(1608, 563, 40, 18);
  g.fillStyle(0x8a4a1a, 1); g.fillEllipse(1608, 561, 34, 12);
  g.lineStyle(1.5, 0x2a0a00, 1); g.lineBetween(1598, 558, 1602, 564); g.lineBetween(1608, 556, 1612, 564); g.lineBetween(1618, 558, 1620, 564);
  // Loaves cooling on the sill.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(0x8a4a1a, 1); g.fillEllipse(1740 + i * 16, 596, 14, 7);
    g.fillStyle(0xc87a3a, 1); g.fillEllipse(1740 + i * 16, 594, 10, 4);
  }
});
solids.push({ kind: 'circle', x: 1852, y: 622, r: 44 });

// Gudgeon's Tackle — slanted roof, rods leaning on the wall, a wooden pike over the door.
building(760, 1000, 160, 105, (g, rng) => {
  house(g, 760, 1000, 160, 105, { wall: 0x5a4a3a, roof: 0x2a4a3e, roofStyle: 'slant', glow: WINDOW, door: 0x2a3a30 }, rng);
  for (let i = 0; i < 4; i++) {
    g.lineStyle(2, i % 2 ? 0x8a6a44 : 0x2a2420, 1);
    g.lineBetween(700 + i * 7, 1000, 694 + i * 9, 920 - i * 6);
  }
  // Carved pike sign.
  g.fillStyle(0x7a6448, 1); g.fillEllipse(760, 880, 70, 18);
  g.fillTriangle(726, 880, 712, 870, 712, 890);
  g.fillStyle(0x1a1410, 1); g.fillCircle(784, 878, 2);
  g.lineStyle(1, 0x3a2e22, 1); for (let k = 0; k < 5; k++) g.lineBetween(740 + k * 8, 874, 744 + k * 8, 886);
});

// Fish market: two striped stalls heaped with the morning's catch.
function stall(x: number, y: number, stripe: number): void {
  pieces.push({
    x, y, w: 100, h: 100, draw: (g, rng) => {
      shadow(g, x, y + 2, 96, 18);
      g.fillStyle(TIMBER, 1); g.fillRect(x - 42, y - 70, 5, 70); g.fillRect(x + 37, y - 70, 5, 70);
      g.fillStyle(dim(TIMBER, 0.3), 1); g.fillRect(x - 42, y - 26, 84, 26);
      g.fillStyle(0xbcd4d8, 1); g.fillRect(x - 38, y - 30, 76, 6); // the ice
      for (let i = 0; i < 9; i++) {
        const fx = x - 32 + i * 8 + rng() * 3;
        g.fillStyle([0xff9a4a, 0x8a8a92, 0x2a2228, 0xd8a050][i % 4], 1);
        g.fillEllipse(fx, y - 32, 10, 4);
      }
      for (let k = 0; k < 6; k++) {
        g.fillStyle(k % 2 ? stripe : 0xe8e0d0, 1);
        g.fillTriangle(x - 50 + k * 17, y - 70, x - 33 + k * 17, y - 70, x - 41 + k * 17, y - 58);
        g.fillRect(x - 50 + k * 17, y - 84, 17, 14);
      }
      crate(g, x + 50, y + 4, 9, 0x7a5a3a);
    },
  });
  solids.push({ kind: 'rect', x: x - 44, y: y - 20, w: 88, h: 20 });
}
stall(950, 1030, 0x8a2a24);
stall(1080, 1030, 0x2a4a6a);

// Harbourmaster's office — flat roof, tide board and a flag that is not the King's.
building(1540, 1010, 190, 120, (g, rng) => {
  house(g, 1540, 1010, 190, 120, { wall: 0x4e4a46, roof: 0x24384a, roofStyle: 'flat', glow: WINDOW, door: 0x24384a }, rng);
  // Tide board.
  g.fillStyle(0x1a1410, 1); g.fillRect(1456, 920, 50, 64);
  g.fillStyle(0xd8d0c0, 1); g.fillRect(1459, 923, 44, 58);
  g.lineStyle(1, 0x2a2a2a, 1);
  for (let k = 0; k < 6; k++) g.lineBetween(1462, 930 + k * 9, 1500, 930 + k * 9);
  g.fillStyle(0x24384a, 1); g.fillRect(1462, 952, 22, 5);
  // Flagpole.
  g.fillStyle(0x2a2420, 1); g.fillRect(1620, 820, 4, 190);
  g.fillStyle(0x24384a, 1); g.fillRect(1624, 824, 40, 24);
  g.fillStyle(0xe8e0d0, 1); g.fillCircle(1644, 836, 6);
});

// The smokehouse: slatted, tall, fish hung in rows inside.
building(2160, 1000, 170, 120, (g, rng) => {
  house(g, 2160, 1000, 170, 120, { wall: 0x3a2e28, roof: 0x1e1a1a, roofStyle: 'gable', glow: 0, chimney: true, door: 0x2a1a14 }, rng);
  for (let k = 0; k < 8; k++) { g.fillStyle(0x1a1210, 0.8); g.fillRect(2080 + k * 20, 900, 6, 80); }
  for (let k = 0; k < 6; k++) {
    g.fillStyle(0xc8843a, 1); g.fillEllipse(2090 + k * 26, 930, 6, 16);
    g.fillStyle(0x8a5a2a, 1); g.fillEllipse(2090 + k * 26, 934, 4, 8);
  }
  // Racks outside.
  g.fillStyle(TIMBER, 1); g.fillRect(2252, 950, 4, 50); g.fillRect(2296, 950, 4, 50); g.fillRect(2250, 952, 52, 3);
  for (let k = 0; k < 4; k++) { g.fillStyle(0xd09a5a, 1); g.fillEllipse(2262 + k * 11, 966, 5, 14); }
});

// The western warehouse — coal for the Kiln barges, stencilled with the sigil.
building(330, 960, 210, 115, (g, rng) => {
  house(g, 330, 960, 210, 115, { wall: 0x3e3632, roof: 0x221e20, roofStyle: 'slant', glow: 0, door: 0x1a1414 }, rng);
  brandSigil(g, 280, 900, 16, 0x8a2a14, 0.8);
  for (let i = 0; i < 3; i++) { g.fillStyle(0x0e0c0c, 1); g.fillEllipse(410 + i * 14, 958 - i * 4, 26, 14); }
});

// The boatwright's shed on the east beach, a half-built sloop on its cradle.
building(2120, 1200, 200, 110, (g, rng) => {
  shadow(g, 2120, 1204, 230, 24);
  g.fillStyle(0x2a1e16, 1); g.fillRect(2018, 1086, 204, 114);
  g.fillStyle(0x4a3624, 1); g.fillRect(2022, 1090, 196, 110);
  for (let k = 0; k < 12; k++) { g.fillStyle(rng() < 0.5 ? 0x3e2c1e : 0x56402c, 1); g.fillRect(2022 + k * 16, 1090, 14, 110); }
  g.fillStyle(0x1a120c, 1); g.fillRect(2044, 1120, 152, 80);
  // The hull, ribs showing at the stern.
  g.fillStyle(0x6b3a26, 1);
  g.fillTriangle(2056, 1170, 2190, 1170, 2176, 1196);
  g.fillRect(2056, 1150, 134, 22);
  g.fillStyle(lit(0x6b3a26, 0.2), 1); g.fillRect(2056, 1150, 134, 4);
  g.lineStyle(3, 0x8a6a44, 1);
  for (let k = 0; k < 4; k++) g.lineBetween(2160 + k * 8, 1150, 2156 + k * 8, 1130);
  // Roof.
  g.fillStyle(0x1e1a1a, 1); g.fillTriangle(2008, 1090, 2232, 1090, 2120, 1030);
  g.fillStyle(0x3a2e2a, 1); g.fillTriangle(2016, 1088, 2224, 1088, 2120, 1036);
  // Plank stack.
  for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? 0x8a6a44 : 0x7a5a3a, 1); g.fillRect(2228, 1194 - k * 6, 40, 5); }
});

// The lighthouse on its rock — ash-black and brand-red bands, a gallery and the lamp room.
pieces.push({
  x: 260, y: 1160, w: 140, h: 360, draw: (g) => {
    shadow(g, 260, 1166, 120, 30, 0.4);
    const top = 1160 - 280;
    for (let k = 0; k < 7; k++) {
      const y0 = 1160 - k * 40;
      const wBot = 46 - k * 2.6, wTop = 46 - (k + 1) * 2.6;
      g.fillStyle(k % 2 ? 0x7a1e14 : 0x26201e, 1);
      g.fillPoints([
        new Phaser.Geom.Point(260 - wBot, y0), new Phaser.Geom.Point(260 + wBot, y0),
        new Phaser.Geom.Point(260 + wTop, y0 - 40), new Phaser.Geom.Point(260 - wTop, y0 - 40),
      ], true, true);
      g.fillStyle(0xffffff, 0.06); g.fillRect(260 - wBot + 4, y0 - 40, 8, 40);
    }
    // Gallery and railings.
    g.fillStyle(0x1a1414, 1); g.fillRect(212, top - 6, 96, 10);
    g.lineStyle(2, 0x3a3236, 1);
    for (let k = 0; k <= 8; k++) g.lineBetween(214 + k * 11.5, top - 6, 214 + k * 11.5, top - 22);
    g.lineBetween(212, top - 22, 308, top - 22);
    // Lamp room glass.
    g.fillStyle(0x2a2226, 1); g.fillRect(232, top - 56, 56, 50);
    g.fillStyle(0xff4a2a, 0.75); g.fillRect(236, top - 52, 48, 42);
    g.fillStyle(0x2a2226, 1); g.fillRect(258, top - 52, 4, 42);
    g.fillStyle(0x1a1414, 1); g.fillTriangle(226, top - 56, 294, top - 56, 260, top - 86);
    g.fillStyle(0x3a3236, 1); g.fillCircle(260, top - 88, 4);
    // Door.
    g.fillStyle(0x140e0c, 1); g.fillRoundedRect(248, 1124, 24, 36, { tl: 10, tr: 10, bl: 0, br: 0 });
  },
});
solids.push({ kind: 'circle', x: 260, y: 1150, r: 52 });

// Net-drying racks on the black sand.
function netRack(x: number, y: number): void {
  pieces.push({
    x, y, w: 140, h: 90, draw: (g) => {
      shadow(g, x, y + 2, 140, 14, 0.25);
      g.fillStyle(TIMBER, 1); g.fillRect(x - 60, y - 70, 5, 70); g.fillRect(x + 55, y - 70, 5, 70);
      g.fillRect(x - 62, y - 72, 124, 4);
      // The net hangs in a sag, meshed.
      g.lineStyle(1, 0x9a8a6a, 0.8);
      for (let k = 0; k <= 12; k++) {
        const xx = x - 56 + k * 9.4;
        const sag = Math.sin((k / 12) * Math.PI) * 14;
        g.lineBetween(xx, y - 68, xx + 4, y - 30 + sag);
      }
      for (let r = 0; r < 5; r++) {
        g.beginPath();
        for (let k = 0; k <= 12; k++) {
          const xx = x - 56 + k * 9.4 + r * 0.8;
          const yy = y - 64 + r * 8 + Math.sin((k / 12) * Math.PI) * (r * 3);
          if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
        }
        g.strokePath();
      }
      // Cork floats.
      for (let k = 0; k < 6; k++) { g.fillStyle(0xc89a5a, 1); g.fillCircle(x - 48 + k * 19, y - 66, 3); }
    },
  });
  solids.push({ kind: 'circle', x: x - 58, y: y - 2, r: 7 }, { kind: 'circle', x: x + 58, y: y - 2, r: 7 });
}
netRack(500, 1170);
netRack(890, 1176);
netRack(1640, 1170);

// The Tithe Fire — an iron brazier on a plinth, the port's mandatory devotion.
pieces.push({
  x: 1300, y: 772, w: 120, h: 140, draw: (g) => {
    shadow(g, 1300, 776, 110, 26, 0.45);
    g.fillStyle(0x1e1816, 1); g.fillRect(1262, 742, 76, 32);
    g.fillStyle(0x3a322e, 1); g.fillRect(1266, 744, 68, 26);
    brandSigil(g, 1300, 757, 9, 0xb84a1e, 0.9);
    // Iron bowl on three legs.
    g.lineStyle(5, 0x1a1414, 1);
    g.lineBetween(1280, 742, 1272, 716); g.lineBetween(1320, 742, 1328, 716); g.lineBetween(1300, 742, 1300, 718);
    g.fillStyle(0x1a1414, 1); g.fillEllipse(1300, 712, 84, 30);
    g.fillStyle(0x2e2624, 1); g.fillEllipse(1300, 708, 78, 22);
    g.fillStyle(0x7a2a12, 1); g.fillEllipse(1300, 704, 66, 14);
    g.fillStyle(0xff7a2f, 0.8); g.fillEllipse(1300, 703, 52, 9);
  },
});
solids.push({ kind: 'circle', x: 1300, y: 750, r: 36 });

// The old wreck on the east beach — ribs of a tithe barge the sea took back.
pieces.push({
  x: 2360, y: 1222, w: 160, h: 90, draw: (g) => {
    shadow(g, 2360, 1226, 150, 22, 0.3);
    g.fillStyle(0x2a1e16, 1); g.fillEllipse(2360, 1214, 140, 28);
    g.lineStyle(6, 0x4a3426, 1);
    for (let k = 0; k < 7; k++) {
      const x = 2304 + k * 19;
      g.beginPath(); g.arc(x, 1214, 26 - Math.abs(k - 3) * 3, Math.PI * 1.05, Math.PI * 1.6, false); g.strokePath();
    }
    g.lineStyle(4, 0x5a4030, 1); g.lineBetween(2296, 1206, 2424, 1200);
    brandSigil(g, 2402, 1208, 7, 0x5a1a0a, 0.7);
  },
});
solids.push({ kind: 'circle', x: 2360, y: 1214, r: 44 });

// Bollards on the quay, lamps up the avenue, barrels and crates, burnt snags.
for (const x of [520, 980, 1200, 1400, 1760, 2240]) {
  pieces.push({
    x, y: 1252, w: 20, h: 24, draw: (g) => {
      shadow(g, x, 1254, 16, 5);
      g.fillStyle(0x1a1414, 1); g.fillRoundedRect(x - 6, 1238, 12, 16, 4);
      g.fillStyle(0x3a3236, 1); g.fillEllipse(x, 1238, 14, 6);
    },
  });
}
for (const [x, y] of [[1236, 300], [1364, 300], [1236, 540], [1364, 540], [1236, 980], [1364, 980], [700, 712], [1900, 712]] as [number, number][]) {
  pieces.push({ x, y, w: 30, h: 70, draw: (g) => lamp(g, x, y, 0xff9a4a) });
}
for (const [x, y, s] of [[640, 1070, 10], [660, 1080, 9], [1430, 1078, 10], [2300, 1074, 11], [1180, 1078, 9]] as [number, number, number][]) {
  pieces.push({ x, y, w: 30, h: 40, draw: (g) => barrel(g, x, y, s, 0x6a4a30) });
  solids.push({ kind: 'circle', x, y: y - 4, r: s });
}
for (const [x, y, s] of [[1460, 1084, 11], [1478, 1098, 9], [2040, 1094, 12], [430, 1080, 12]] as [number, number, number][]) {
  pieces.push({ x, y, w: 30, h: 30, draw: (g) => crate(g, x, y, s, 0x7a5a3a) });
  solids.push({ kind: 'rect', x: x - s, y: y - s, w: s * 2, h: s });
}
for (const [x, y] of [[180, 470], [700, 220], [1660, 230], [2240, 200], [2520, 460], [80, 980], [1960, 640]] as [number, number][]) {
  pieces.push({ x, y, w: 60, h: 80, draw: (g, rng) => tree(g, x, y, 24, 'snag', 0x2a2a2a, 0x1e1614, rng) });
  solids.push({ kind: 'circle', x, y: y - 2, r: 8 });
}
for (const [x, y, s] of [[150, 1240, 20], [370, 1250, 16], [2560, 1230, 22], [2520, 1150, 14]] as [number, number, number][]) {
  pieces.push({ x, y, w: s * 3, h: s * 2, draw: (g, rng) => rock(g, x, y, s, 0x2e282c, rng) });
  solids.push({ kind: 'circle', x, y: y - s * 0.3, r: s * 0.8 });
}

// ── The sea's edge as solids ─────────────────────────────────────────

const seaTop = SEA_Y + 6;
solids.push(
  { kind: 'rect', x: 0, y: seaTop, w: 690, h: H - seaTop },
  { kind: 'rect', x: 750, y: seaTop, w: 505, h: H - seaTop },
  { kind: 'rect', x: 1345, y: seaTop, w: 555, h: H - seaTop },
  { kind: 'rect', x: 1960, y: seaTop, w: W - 1960, h: H - seaTop },
  // Off the ends of the piers.
  { kind: 'rect', x: 690, y: 1420, w: 60, h: H - 1420 },
  { kind: 'rect', x: 1255, y: 1460, w: 90, h: H - 1460 },
  { kind: 'rect', x: 1900, y: 1380, w: 60, h: H - 1380 },
  // The basalt ridge, either side of the Hearth road.
  { kind: 'rect', x: 0, y: 0, w: 1220, h: 74 },
  { kind: 'rect', x: 1380, y: 0, w: W - 1380, h: 74 },
);

// ── Animation ────────────────────────────────────────────────────────

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** Moored boats bobbing beside the piers. */
const MOORED: { x: number; y: number; len: number; hull: number; sail: boolean }[] = [
  { x: 1218, y: 1340, len: 44, hull: 0x6b3a26, sail: true },
  { x: 1382, y: 1400, len: 52, hull: 0x3a2a2a, sail: true },
  { x: 650, y: 1330, len: 30, hull: 0x8a6a44, sail: false },
  { x: 1996, y: 1320, len: 40, hull: 0x5a3a2a, sail: false },
];

function animateUnder(g: G, t: number, view: Rect): void {
  if (view.y + view.h < SEA_Y - 40) return;
  // Swell: rows of moving light dashes.
  for (let row = 0; row < 12; row++) {
    const y = SEA_Y + 18 + row * 20;
    if (y < view.y - 20 || y > view.y + view.h + 20) continue;
    const speed = 14 + row * 3;
    const a = 0.12 + (row % 3) * 0.05;
    for (let x = Math.floor(view.x / 70) * 70 - 70; x < view.x + view.w + 70; x += 70) {
      const ox = x + ((t * speed + row * 37) % 70);
      const yy = y + Math.sin(t * 1.3 + x * 0.02 + row) * 3;
      g.lineStyle(2, lit(SEA, 0.35), a);
      g.lineBetween(ox, yy, ox + 22, yy);
    }
  }
  // Surf along the beach: a foam line that breathes up and down the sand.
  const reach = Math.sin(t * 0.8) * 10;
  for (let x = Math.floor(view.x / 24) * 24; x < view.x + view.w + 24; x += 24) {
    if (PIERS.some((p) => x > p.x - 6 && x < p.x + p.w + 6)) continue;
    const y = SEA_Y - 2 + reach + Math.sin(x * 0.05 + t * 1.6) * 4;
    g.fillStyle(FOAM, 0.5 + Math.sin(x * 0.11 + t * 2) * 0.2);
    g.fillEllipse(x + 12, y, 26, 5);
    g.fillStyle(SEA_SHALLOW, 0.5); g.fillEllipse(x + 12, y + 7, 26, 6);
  }
  // Foam round the pier posts.
  for (const p of PIERS) {
    for (let y = Math.max(p.y, SEA_Y) + 30; y < p.y + p.h; y += 46) {
      if (!inView(view, p.x, y, 30)) continue;
      const k = 0.4 + Math.sin(t * 2 + y) * 0.2;
      g.fillStyle(FOAM, k); g.fillEllipse(p.x - 2, y + 16, 14, 4); g.fillEllipse(p.x + p.w + 2, y + 16, 14, 4);
    }
  }
  // Moored boats.
  for (const b of MOORED) {
    if (!inView(view, b.x, b.y, 80)) continue;
    const bob = Math.sin(t * 1.4 + b.x) * 2.5;
    const roll = Math.sin(t * 1.1 + b.y) * 0.05;
    const y = b.y + bob;
    g.fillStyle(0x0a1a22, 0.4); g.fillEllipse(b.x + 4, y + 10, b.len + 10, 12);
    g.fillStyle(dim(b.hull, 0.4), 1); g.fillEllipse(b.x, y + 2, b.len, 16);
    g.fillStyle(b.hull, 1); g.fillEllipse(b.x, y, b.len - 4, 12);
    g.fillStyle(lit(b.hull, 0.25), 1); g.fillEllipse(b.x, y - 2, b.len - 12, 5);
    if (b.sail) {
      const mx = b.x + roll * 60;
      g.lineStyle(2, 0x2a2018, 1); g.lineBetween(b.x, y - 2, mx, y - 46);
      g.fillStyle(0x8a8478, 1); g.fillTriangle(mx + 1, y - 44, mx + 1, y - 10, mx + b.len * 0.42, y - 12);
    }
    g.lineStyle(1, 0x8a7a5a, 0.6); g.lineBetween(b.x + (b.x < 1300 ? b.len / 2 : -b.len / 2), y, b.x < 1300 ? 1255 : 1345, y - 14);
  }
  // Wet glints in the sand near the waterline.
  for (let i = 0; i < 18; i++) {
    const x = ((i * 977) % W);
    if (!inView(view, x, SEA_Y - 30, 20)) continue;
    const k = Math.max(0, Math.sin(t * 1.7 + i * 2.3));
    g.fillStyle(0xc8d8e0, 0.4 * k); g.fillCircle(x, SEA_Y - 28 + (i % 5) * 4, 1.4);
  }
}

function animateAbove(g: G, t: number, view: Rect): void {
  // Tithe Fire flame — big, dutiful, a little sullen.
  if (inView(view, 1300, 690, 120)) {
    glow(g, 1300, 690, 70, EMBER, 0.05, 4);
    for (let i = 0; i < 7; i++) {
      const ph = (t * 1.6 + i * 0.37) % 1;
      const x = 1300 + Math.sin(t * 3 + i * 1.7) * (16 - ph * 10) + (i - 3) * 5;
      const y = 700 - ph * 56;
      g.fillStyle(i % 2 ? 0xffb347 : EMBER, (1 - ph) * 0.85);
      g.fillCircle(x, y, (1 - ph) * 11 + 2);
    }
    g.fillStyle(0xfff0c0, 0.7); g.fillEllipse(1300, 696, 22, 10);
  }
  // Chimney smoke off the bakery and the smokehouse.
  for (const [sx, sy, col] of [[1877, 520, 0x8a7a70], [2203, 880, 0x5a5250], [1758, 470, 0x7a7068]] as [number, number, number][]) {
    if (!inView(view, sx, sy - 80, 140)) continue;
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.22 + i / 6) % 1;
      g.fillStyle(col, (1 - ph) * 0.3);
      g.fillCircle(sx + ph * 50 + Math.sin(t + i) * 6, sy - ph * 150, 8 + ph * 22);
    }
  }
  // Oven mouth glow.
  if (inView(view, 1852, 630, 60)) glow(g, 1852, 632, 36 + Math.sin(t * 6) * 3, 0xff8a2a, 0.06, 3);
  // The lighthouse lamp, and its red beam sweeping the bay.
  const lx = 260, ly = 1160 - 280 - 30;
  if (inView(view, lx, ly, 900)) {
    const a = t * 0.6;
    const len = 760;
    const spread = 0.13;
    g.fillStyle(0xff4a2a, 0.07);
    g.fillTriangle(lx, ly, lx + Math.cos(a - spread) * len, ly + Math.sin(a - spread) * len * 0.5,
      lx + Math.cos(a + spread) * len, ly + Math.sin(a + spread) * len * 0.5);
    g.fillStyle(0xff4a2a, 0.06);
    g.fillTriangle(lx, ly, lx + Math.cos(a - spread * 0.5) * len * 0.8, ly + Math.sin(a - spread * 0.5) * len * 0.4,
      lx + Math.cos(a + spread * 0.5) * len * 0.8, ly + Math.sin(a + spread * 0.5) * len * 0.4);
    glow(g, lx, ly, 34 + Math.sin(t * 4) * 3, 0xff6a3a, 0.08, 3);
  }
  // Gulls wheeling over the piers.
  for (let i = 0; i < 6; i++) {
    const cx = 700 + i * 300, cy = 1180 + (i % 2) * 90;
    const a = t * (0.5 + i * 0.07) + i;
    const x = cx + Math.cos(a) * (90 + i * 10), y = cy + Math.sin(a) * 34 - 60;
    if (!inView(view, x, y, 30)) continue;
    const flap = Math.sin(t * 9 + i) * 4;
    g.lineStyle(2, 0xf0f0e8, 0.9);
    g.lineBetween(x - 8, y - flap, x, y); g.lineBetween(x, y, x + 8, y - flap);
  }
}

// ── POIs ─────────────────────────────────────────────────────────────

const POIS: Poi[] = [
  { kind: 'waystone', at: { x: 1176, y: 676 } },
  { kind: 'mooring', at: { x: 1300, y: 1432 }, isle: 'fire' },
  { kind: 'water', id: 'emberport-pier-water', shape: { x: 560, y: 1290, w: 1300, h: 190 }, fishery: 'emberport-sea' },
  { kind: 'sign', at: { x: 1400, y: 150 }, text: 'NORTH — The Hearth Court. Prince Kindle\'s terraces. Every chimney counted.' },
  { kind: 'sign', at: { x: 150, y: 690 }, text: 'WEST — The Powder Court. Prince Fuse\'s magazine town. No naked flames past the ramparts.' },
  { kind: 'sign', at: { x: 2450, y: 690 }, text: 'EAST — The Candlewick Court. Prince Tallow\'s wax city. Boots recommended.' },
  { kind: 'sign', at: { x: 1380, y: 1184 }, text: 'MAIN PIER — Mooring at the end. Boats: Hobb Tarrow, east beach. Fishing: Sal Gudgeon, west.' },
  { kind: 'sign', at: { x: 1196, y: 862 }, text: 'THE TITHE FIRE OF EMBERPORT. Feed it in the King\'s name. A cold hearth is a cold heart.' },
  { kind: 'chest', id: 'emberport-chest-lighthouse', at: { x: 160, y: 1104 }, coins: 70 },
  { kind: 'chest', id: 'emberport-chest-wreck', at: { x: 2462, y: 1206 }, orbs: 2, item: 'mat-sailcloth' },
  { kind: 'chest', id: 'emberport-chest-strongbox', at: { x: 1640, y: 1050 }, coins: 250, open: { monarch: 'ashgrave' } },
];

export const EMBERPORT_AREA: AreaDef = {
  id: 'emberport',
  isle: 'fire',
  name: 'Emberport',
  subtitle: 'Black-sand harbour of Brandmark',
  w: W,
  h: H,
  bg: SOIL,
  accent: 0x6a9aa8,
  weather: 'ash',
  spawn: { x: 1300, y: 1250 },
  painter: { ground: paintGround, pieces, animate: animateUnder, animateOver: animateAbove },
  solids,
  exits: [
    { side: 'n', to: 'hearth', label: 'The Hearth Court' },
    { side: 'w', to: 'powder', label: 'The Powder Court' },
    { side: 'e', to: 'candlewick', label: 'The Candlewick Court' },
  ],
  pois: POIS,
  npcs: EMBERPORT_NPCS,
  crowd: EMBERPORT_CROWD,
};
