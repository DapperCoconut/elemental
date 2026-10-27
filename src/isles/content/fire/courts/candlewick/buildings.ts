import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { brandSigil, dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BRASS, HONEY, HONEY_DARK, SEAL_RED, STRAW, WAX, WAX_OLD, WAX_SHADE, WICK, WOOD,
  candle, candleHouse, hexPath, skep,
} from './art';

/**
 * The Candlewick Court's set pieces. Each drawer paints one building at its base point and
 * returns where its flames go, so the area's `animate` can light them every frame without the
 * baked art having to know about time.
 */

/** A taper-spired cathedral: a wax nave, a honeycomb rose window, five tapers for spires. */
export function taperCathedral(g: G, x: number, y: number, rng: () => number): Pt[] {
  const w = 400, h = 150;
  shadow(g, x, y + 6, w * 1.1, 40, 0.3);
  // Steps.
  for (let i = 0; i < 3; i++) {
    g.fillStyle(mixC(WAX, WAX_SHADE, 0.3 + i * 0.15), 1);
    g.fillRect(x - 110 + i * 10, y - 6 + i * -6, 220 - i * 20, 8);
  }
  // Nave wall.
  g.fillStyle(dim(WAX, 0.4), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(mixC(WAX, WAX_SHADE, 0.3), 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(lit(WAX, 0.1), 1); g.fillRect(x - w / 2, y - h, w, 6);
  // Buttresses that are really fat candles fused into the wall.
  const tips: Pt[] = [];
  for (const bx of [x - w / 2 + 18, x - 110, x + 110, x + w / 2 - 18]) {
    tips.push(candle(g, bx, y, 30, h + 26, WAX, rng, 0.5));
  }
  // Tall arched windows, honey-lit.
  for (const wx of [x - 160, x - 60, x + 60, x + 160]) {
    if (Math.abs(wx - x) < 20) continue;
    g.fillStyle(dim(WAX, 0.5), 1); g.fillRoundedRect(wx - 13, y - h + 26, 26, 78, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(HONEY, 0.9); g.fillRoundedRect(wx - 10, y - h + 29, 20, 72, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.lineStyle(1.5, HONEY_DARK, 0.8);
    g.lineBetween(wx, y - h + 29, wx, y - h + 101);
    g.lineBetween(wx - 10, y - h + 62, wx + 10, y - h + 62);
  }
  // Spires: five tapers rising off the roof, the middle one tallest.
  const spires: [number, number, number][] = [[-150, 120, 26], [-72, 190, 30], [0, 270, 38], [72, 200, 30], [150, 130, 26]];
  for (const [dx, sh, sw] of spires) {
    tips.push(candle(g, x + dx, y - h + 4, sw, sh, lit(WAX, 0.04), rng, 0.15));
  }
  // Rose window: a honeycomb in a brass ring, over the portal.
  const rx = x, ry = y - h + 40;
  g.fillStyle(dim(WAX, 0.45), 1); g.fillCircle(rx, ry, 30);
  g.fillStyle(BRASS, 1); g.fillCircle(rx, ry, 27);
  hexPath(g, rx, ry, 8, HONEY, 1, HONEY_DARK);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hexPath(g, rx + Math.cos(a) * 14, ry + Math.sin(a) * 14, 7.5, i % 2 ? HONEY : lit(HONEY, 0.25), 1, HONEY_DARK);
  }
  // Portal.
  g.fillStyle(dim(WAX, 0.5), 1); g.fillRoundedRect(x - 30, y - 82, 60, 82, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(0x3a2414, 1); g.fillRoundedRect(x - 25, y - 77, 50, 77, { tl: 25, tr: 25, bl: 0, br: 0 });
  g.fillStyle(HONEY, 0.25); g.fillRoundedRect(x - 19, y - 70, 38, 70, { tl: 19, tr: 19, bl: 0, br: 0 });
  g.lineStyle(2, BRASS, 0.8); g.lineBetween(x, y - 77, x, y);
  return tips;
}

/**
 * The palace — a colossal candle-tower, Tallow's own height made into a building. A spiral of
 * windows climbs it, a balcony rings it where the Inchwardens stand, his measuring ticks are
 * cut into its side, and its wick carries the biggest flame in the court.
 */
export function candleTower(g: G, x: number, y: number, rng: () => number): Pt[] {
  const w = 230, h = 590;
  shadow(g, x + 10, y + 8, w * 1.8, 60, 0.32);
  // Base pool — a hundred years of drip.
  g.fillStyle(dim(WAX, 0.22), 1); g.fillEllipse(x + 6, y + 4, w * 1.9, 70);
  g.fillStyle(lit(WAX, 0.05), 1); g.fillEllipse(x, y, w * 1.7, 56);
  const tip = candle(g, x, y, w, h, WAX, rng, 0.12, -6);
  // Measuring ticks up the left edge — his own inches.
  for (let i = 0; i < 40; i++) {
    const ty = y - 20 - i * 14;
    const len = i % 4 === 0 ? 22 : 10;
    g.lineStyle(i % 4 === 0 ? 2.5 : 1.4, WAX_OLD, 0.9);
    g.lineBetween(x - w / 2 + 6, ty, x - w / 2 + 6 + len, ty);
  }
  // Spiral of lit windows.
  for (let i = 0; i < 9; i++) {
    const wy = y - 120 - i * 50;
    const wx = x + Math.sin(i * 1.2) * w * 0.3;
    g.fillStyle(dim(WAX, 0.45), 1); g.fillRoundedRect(wx - 11, wy - 16, 22, 26, { tl: 11, tr: 11, bl: 2, br: 2 });
    g.fillStyle(HONEY, 0.95); g.fillRoundedRect(wx - 8, wy - 13, 16, 21, { tl: 8, tr: 8, bl: 1, br: 1 });
  }
  // Balcony ring at the waist, red-railed.
  const by = y - 300;
  g.fillStyle(dim(WAX, 0.35), 1); g.fillEllipse(x - 3, by + 6, w + 60, 40);
  g.fillStyle(lit(WAX, 0.1), 1); g.fillEllipse(x - 3, by, w + 56, 34);
  g.lineStyle(2.5, SEAL_RED, 0.9);
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (i / 12);
    const px = x - 3 + Math.cos(a) * (w + 50) / 2;
    const py = by + Math.sin(a) * 15;
    g.lineBetween(px, py, px, py - 14);
  }
  g.beginPath(); g.arc(x - 3, by - 14, (w + 50) / 2, 0, Math.PI, false); g.strokePath();
  // Banners of the court: a candle on red, hung off the balcony.
  for (const bx of [x - 70, x + 64]) {
    g.fillStyle(dim(SEAL_RED, 0.3), 1); g.fillRect(bx - 15, by + 12, 30, 70);
    g.fillStyle(SEAL_RED, 1); g.fillRect(bx - 13, by + 12, 26, 66);
    g.fillTriangle(bx - 13, by + 78, bx + 13, by + 78, bx, by + 92);
    g.fillStyle(WAX, 1); g.fillRect(bx - 4, by + 36, 8, 26);
    g.fillStyle(HONEY, 1); g.fillTriangle(bx - 4, by + 36, bx + 4, by + 36, bx, by + 26);
  }
  // Grand door with the King's sigil.
  g.fillStyle(dim(WAX, 0.5), 1); g.fillRoundedRect(x - 36, y - 100, 72, 100, { tl: 36, tr: 36, bl: 0, br: 0 });
  g.fillStyle(SEAL_RED, 1); g.fillRoundedRect(x - 30, y - 94, 60, 94, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.lineStyle(2, dim(SEAL_RED, 0.4), 1); g.lineBetween(x, y - 94, x, y);
  brandSigil(g, x, y - 58, 13, BRASS, 1);
  return [tip];
}

/** Cerelle's Chandlery: a squat candle-shop hung with bundles of tapers. */
export function chandlery(g: G, x: number, y: number, rng: () => number): Pt[] {
  const tip = candleHouse(g, x, y, 150, 150, { wax: lit(WAX, 0.04), melt: 0.4, lean: 4, rows: 1 }, rng);
  // Awning.
  g.fillStyle(dim(0x6a2a3a, 0.3), 1); g.fillRect(x - 82, y - 66, 164, 14);
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? 0x6a2a3a : 0xf3e3bf, 1);
    g.fillTriangle(x - 80 + i * 20, y - 54, x - 60 + i * 20, y - 54, x - 70 + i * 20, y - 44);
    g.fillRect(x - 80 + i * 20, y - 66, 20, 12);
  }
  // Hanging bundles of tapers.
  for (const bx of [x - 58, x + 58]) {
    g.lineStyle(1, WICK, 1); g.lineBetween(bx, y - 54, bx, y - 46);
    for (let k = -2; k <= 2; k++) {
      g.fillStyle(k % 2 ? WAX : lit(WAX, 0.15), 1);
      g.fillRoundedRect(bx + k * 4 - 1.5, y - 46, 3, 22 + Math.abs(k) * -2, 1.5);
    }
  }
  // Hanging sign: a candle in a ring.
  g.lineStyle(2, WOOD, 1); g.lineBetween(x + 74, y - 120, x + 100, y - 120);
  g.fillStyle(WOOD, 1); g.fillRoundedRect(x + 84, y - 116, 30, 26, 4);
  g.fillStyle(WAX, 1); g.fillRect(x + 96, y - 110, 6, 15);
  g.fillStyle(HONEY, 1); g.fillTriangle(x + 96, y - 110, x + 102, y - 110, x + 99, y - 117);
  return [tip];
}

/** The Honeyed Wick: a bakery built into a candle, with an oven hump and a honey-drip sign. */
export function honeyedWick(g: G, x: number, y: number, rng: () => number): Pt[] {
  // The oven: a domed brick hump on the left with a chimney.
  shadow(g, x - 80, y + 4, 90, 22, 0.25);
  g.fillStyle(dim(0xb06a3a, 0.4), 1); g.fillEllipse(x - 80, y - 20, 82, 64);
  g.fillStyle(0xb06a3a, 1); g.fillEllipse(x - 80, y - 22, 76, 58);
  for (let i = 0; i < 10; i++) {
    g.fillStyle(dim(0xb06a3a, 0.15), 0.8);
    g.fillRect(x - 108 + (i % 5) * 12, y - 40 + Math.floor(i / 5) * 12, 10, 4);
  }
  g.fillStyle(0x2a1208, 1); g.fillEllipse(x - 80, y - 10, 30, 22);
  g.fillStyle(0xff8a2a, 0.75); g.fillEllipse(x - 80, y - 7, 22, 12);
  g.fillStyle(dim(0xb06a3a, 0.35), 1); g.fillRect(x - 94, y - 78, 14, 34);
  const tip = candleHouse(g, x + 10, y, 140, 150, { wax: mixC(WAX, HONEY, 0.18), melt: 0.2, lean: -3, rows: 1, door: 0x8a5a2a }, rng);
  // Honey running off the sign.
  g.fillStyle(HONEY, 1); g.fillRoundedRect(x - 30, y - 128, 80, 24, 8);
  g.fillStyle(lit(HONEY, 0.3), 1); g.fillRoundedRect(x - 26, y - 125, 72, 6, 3);
  for (const dx of [-18, 0, 22, 38]) {
    const len = 8 + ((dx + 40) % 13);
    g.fillStyle(HONEY, 1); g.fillRoundedRect(x + dx - 2, y - 106, 4, len, 2); g.fillCircle(x + dx, y - 106 + len, 3);
  }
  // A loaf painted on it.
  g.fillStyle(0xd08a3a, 1); g.fillEllipse(x + 10, y - 116, 30, 14);
  g.lineStyle(1.5, dim(0xd08a3a, 0.35), 1); g.lineBetween(x + 2, y - 118, x + 8, y - 112); g.lineBetween(x + 12, y - 118, x + 18, y - 112);
  return [tip, { x: x - 87, y: y - 80 }];
}

/** A chandler's workshop: an open shed, a vat of molten wax and a dipping rack of tapers. */
export function workshop(g: G, x: number, y: number, rng: () => number): Pt {
  const w = 160, h = 92;
  shadow(g, x, y + 4, w * 1.2, 26, 0.28);
  // Floor of the shed.
  g.fillStyle(dim(WAX, 0.2), 1); g.fillRect(x - w / 2, y - 26, w, 26);
  // Posts.
  g.fillStyle(WOOD, 1);
  g.fillRect(x - w / 2, y - h, 8, h); g.fillRect(x + w / 2 - 8, y - h, 8, h);
  // Slant roof.
  g.fillStyle(dim(WOOD, 0.35), 1); g.fillTriangle(x - w / 2 - 12, y - h + 4, x + w / 2 + 12, y - h + 4, x + w / 2 + 12, y - h - 40);
  g.fillStyle(0x8a6a44, 1); g.fillTriangle(x - w / 2 - 8, y - h, x + w / 2 + 8, y - h, x + w / 2 + 8, y - h - 36);
  // Wax caked on the roof edge.
  for (let i = 0; i < 9; i++) {
    const rx = x - w / 2 + i * 19 + rng() * 6;
    const len = 5 + rng() * 12;
    g.fillStyle(WAX, 1); g.fillRoundedRect(rx - 2, y - h - 1, 4, len, 2); g.fillCircle(rx, y - h - 1 + len, 2.4);
  }
  // Dipping rack: a beam with pairs of tapers hanging off it.
  g.fillStyle(dim(WOOD, 0.2), 1); g.fillRect(x - w / 2 + 8, y - h + 14, w - 16, 5);
  for (let i = 0; i < 7; i++) {
    const tx = x - w / 2 + 22 + i * 19;
    g.lineStyle(1, WICK, 1); g.lineBetween(tx, y - h + 19, tx, y - h + 24);
    const len = 18 + (i % 3) * 6;
    for (const s of [-3, 3]) {
      g.fillStyle(i % 2 ? WAX : lit(WAX, 0.12), 1);
      g.fillRoundedRect(tx + s - 2, y - h + 24, 4, len, 2);
    }
  }
  // The vat.
  const vx = x + 30, vy = y - 6;
  g.fillStyle(0x2a2420, 1); g.fillEllipse(vx, vy, 64, 22);
  g.fillStyle(0x4a4038, 1); g.fillRect(vx - 30, vy - 30, 60, 30);
  g.fillStyle(0x2a2420, 1); g.fillEllipse(vx, vy - 30, 62, 18);
  g.fillStyle(0xf6d48c, 1); g.fillEllipse(vx, vy - 30, 52, 13);
  // Wax ladled over the lip.
  g.fillStyle(WAX, 1); g.fillRoundedRect(vx - 24, vy - 30, 5, 18, 2); g.fillRoundedRect(vx + 14, vy - 30, 5, 12, 2);
  // Stack of finished candles.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? WAX : lit(WAX, 0.15), 1);
    g.fillRect(x - 54 + i * 7, y - 22, 6, 18);
  }
  return { x: vx, y: vy - 32 };
}

/** A beehive tower: skeps stacked on a timber frame, ladders, a weathervane bee. */
export function hiveTower(g: G, x: number, y: number, levels: number): Pt {
  shadow(g, x, y + 4, 110, 26, 0.3);
  const frameH = levels * 54 + 10;
  g.fillStyle(WOOD, 1);
  g.fillRect(x - 42, y - frameH, 6, frameH); g.fillRect(x + 36, y - frameH, 6, frameH);
  // Ladder.
  g.fillStyle(dim(WOOD, 0.2), 1); g.fillRect(x + 46, y - frameH + 20, 3, frameH - 20); g.fillRect(x + 58, y - frameH + 20, 3, frameH - 20);
  for (let k = 0; k < frameH / 14; k++) g.fillRect(x + 46, y - 10 - k * 14, 15, 2);
  for (let i = 0; i < levels; i++) {
    const ly = y - 6 - i * 54;
    g.fillStyle(dim(WOOD, 0.1), 1); g.fillRect(x - 46, ly - 4, 92, 6);
    skep(g, x, ly - 4, 22 - i * 2, i === 0 ? 0.6 : 0.3);
  }
  // Weathervane: a brass bee.
  const top = y - frameH - 8;
  g.lineStyle(2, BRASS, 1); g.lineBetween(x, y - frameH, x, top - 8);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, top - 10, 14, 8);
  g.fillStyle(lit(BRASS, 0.5), 0.8); g.fillEllipse(x - 3, top - 15, 7, 5); g.fillEllipse(x + 3, top - 15, 7, 5);
  return { x, y: y - 30 };
}

/** A single skep on a three-legged stool. */
export function skepStand(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 44, 12, 0.28);
  g.lineStyle(3, WOOD, 1);
  g.lineBetween(x - 12, y, x - 8, y - 16); g.lineBetween(x + 12, y, x + 8, y - 16); g.lineBetween(x, y + 2, x, y - 16);
  g.fillStyle(dim(WOOD, 0.1), 1); g.fillEllipse(x, y - 17, 40, 9);
  skep(g, x, y - 18, 17, 0.4);
}

/** The Tithe Taper: Drip Square's communal candle, brass-banded, stamped with the King's ring. */
export function titheTaper(g: G, x: number, y: number, rng: () => number): Pt {
  // Plinth.
  shadow(g, x, y + 6, 130, 36, 0.3);
  g.fillStyle(dim(BRASS, 0.4), 1); g.fillEllipse(x, y + 2, 112, 34);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 2, 104, 28);
  g.fillStyle(dim(WAX, 0.15), 1); g.fillEllipse(x, y - 6, 88, 22);
  const tip = candle(g, x, y - 8, 64, 210, WAX, rng, 0.2);
  for (const by of [y - 50, y - 130]) {
    g.fillStyle(dim(BRASS, 0.3), 1); g.fillRect(x - 33, by - 1, 66, 9);
    g.fillStyle(BRASS, 1); g.fillRect(x - 32, by, 64, 6);
  }
  brandSigil(g, x, y - 92, 12, SEAL_RED, 0.95);
  return tip;
}

/** A lantern post on the street; the lantern itself is lit in `animate`. */
export function lanternPost(g: G, x: number, y: number): Pt {
  shadow(g, x, y, 16, 6);
  g.fillStyle(WOOD, 1); g.fillRect(x - 2.5, y - 78, 5, 78);
  g.fillStyle(dim(WOOD, 0.2), 1); g.fillRect(x - 6, y - 4, 12, 4);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 80, 3.5);
  return { x, y: y - 78 };
}

/** A tall standing candle flanking a gate. */
export function gateCandle(g: G, x: number, y: number, rng: () => number): Pt {
  shadow(g, x, y + 2, 60, 16, 0.3);
  g.fillStyle(dim(BRASS, 0.35), 1); g.fillEllipse(x, y, 46, 16);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 3, 40, 12);
  return candle(g, x, y - 6, 26, 120, lit(WAX, 0.04), rng, 0.3);
}

/** A wax likeness of a citizen who came up short — the Effigist's yard. */
export function citizenEffigy(g: G, x: number, y: number, hat: number, rng: () => number): void {
  shadow(g, x, y + 2, 46, 12, 0.28);
  g.fillStyle(dim(WAX, 0.25), 1); g.fillEllipse(x, y, 42, 14);
  g.fillStyle(WAX_SHADE, 1); g.fillRect(x - 16, y - 10, 32, 10);
  const body = mixC(WAX, 0xe8e0f0, 0.3);
  g.fillStyle(dim(body, 0.3), 1); g.fillCircle(x, y - 30, 19);
  g.fillStyle(body, 1); g.fillCircle(x, y - 31, 17.5);
  g.fillStyle(lit(body, 0.3), 1); g.fillEllipse(x - 6, y - 38, 10, 7);
  g.fillStyle(dim(body, 0.5), 1); g.fillCircle(x - 5, y - 32, 2); g.fillCircle(x + 5, y - 32, 2);
  for (let i = 0; i < 3; i++) {
    const dx = x - 8 + i * 8;
    const len = 6 + rng() * 9;
    g.fillStyle(lit(body, 0.15), 1); g.fillRoundedRect(dx - 2, y - 22, 4, len, 2);
  }
  g.fillStyle(hat, 1); g.fillEllipse(x, y - 47, 28, 7); g.fillRect(x - 8, y - 62, 16, 15);
  // A tax notice sealed to its plinth.
  g.fillStyle(0xf6f0e0, 1); g.fillRect(x + 6, y - 9, 10, 7);
  g.fillStyle(SEAL_RED, 1); g.fillCircle(x + 11, y - 5, 2);
}

/** The royal apiary: queens kept in glass boxes on a wax-sealed rack behind the palace. */
export function royalApiary(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 120, 22, 0.28);
  g.fillStyle(SEAL_RED, 1); g.fillRect(x - 54, y - 50, 6, 50); g.fillRect(x + 48, y - 50, 6, 50);
  for (const ry of [y - 8, y - 46]) {
    g.fillStyle(dim(WOOD, 0.1), 1); g.fillRect(x - 56, ry, 112, 5);
    for (let i = 0; i < 4; i++) {
      const bx = x - 42 + i * 28;
      g.fillStyle(0xcfe6ee, 0.45); g.fillRect(bx - 10, ry - 22, 20, 22);
      g.lineStyle(1.2, 0xffffff, 0.7); g.strokeRect(bx - 10, ry - 22, 20, 22);
      g.fillStyle(STRAW, 0.9); g.fillEllipse(bx, ry - 6, 14, 10);
      g.fillStyle(HONEY, 1); g.fillEllipse(bx, ry - 14, 5, 3);
    }
  }
}

/** A low wooden jetty reaching into the wax pond. */
export function jetty(g: G, x: number, y: number, len: number): void {
  g.fillStyle(dim(WOOD, 0.35), 1); g.fillRect(x - 24, y, 48, len + 4);
  for (let i = 0; i < len; i += 12) {
    g.fillStyle(i % 24 ? WOOD : lit(WOOD, 0.08), 1); g.fillRect(x - 22, y + i, 44, 10);
  }
  g.fillStyle(dim(WOOD, 0.4), 1);
  for (const px of [x - 24, x + 20]) g.fillRect(px, y + len - 6, 5, 14);
}

/** Helper for crowd/lantern code: a sagging wire between two points, sampled. */
export function sag(a: Pt, b: Pt, depth: number, n: number): Phaser.Math.Vector2[] {
  const out: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(new Phaser.Math.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * depth));
  }
  return out;
}
