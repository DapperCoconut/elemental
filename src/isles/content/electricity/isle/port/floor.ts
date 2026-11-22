import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, mixC } from '../../../../art/IsleArt';
import { poly } from '../../../water/isle/port/art';
import {
  BASALT_LIT, BRICK, BRICK_DARK, BULB, CHALK, COBBLE_WET, COPPER, FOAM, GRID_DARK, IRON, IRON_DARK, IRON_LIT, PORCELAIN,
  SEA, SEA_DEEP, SEA_LIT, TAG, bigCable, cableDrum, crankHouse, gridSeal, meterDial, puddle, trestle, wire,
} from './art';

/**
 * The fight floor for every Terminus quest duel: the quay at the cable's landfall, at night, in
 * the rain. Along the top (half under the HUD) stands a terrace of crank-houses, two lit and one
 * switched off with its red tags, wires sagging from their eaves. The floor is the quay's granite
 * setts, wet and holding the blue of the storm, with the cable carts' two iron rails running across
 * it and the day's tallies chalked by the crews. Down the left side the great cable comes up out of
 * the sea on its trestles; along the bottom the sea wall, bollards, and the black Outer Sea. The
 * Grid's brass meter is let into the setts off centre, needle stuck in the red. The middle is clear.
 */
export const TERMINUS_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 118;
  const BOT = H - 62;

  // Grout under everything.
  g.fillStyle(0x101116, 1); g.fillRect(0, 0, W, H);

  // ── The setts: big granite blocks, staggered, each a slightly different grey, wet on top.
  for (let y = TOP; y < BOT; y += 26) {
    let x = -((y / 26) % 2) * 22 - rng() * 10;
    while (x < W) {
      const w = 38 + rng() * 18;
      const col = mixC(0x34363e, rng() < 0.5 ? BASALT_LIT : 0x22232a, rng() * 0.45);
      g.fillStyle(col, 1); g.fillRoundedRect(x + 1.5, y + 1.5, w - 3, 23, 3);
      g.fillStyle(COBBLE_WET, 0.1 + rng() * 0.12); g.fillRect(x + 4, y + 3, w - 8, 2);
      if (rng() < 0.12) { g.lineStyle(1, 0x101116, 0.8); g.lineBetween(x + 6 + rng() * (w - 12), y + 3, x + 4 + rng() * (w - 8), y + 22); }
      x += w;
    }
  }
  // Storm-light lying in long streaks across the wet stone.
  for (let i = 0; i < 22; i++) {
    g.fillStyle(0x9ab8e0, 0.03 + rng() * 0.04);
    g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 120 + rng() * 200, 6 + rng() * 8);
  }

  // The cart rails, across the whole quay.
  for (const ry of [H * 0.4, H * 0.4 + 16]) {
    g.fillStyle(0x08080a, 1); g.fillRect(0, ry - 1, W, 5);
    g.fillStyle(IRON_LIT, 0.75); g.fillRect(0, ry - 1, W, 1.5);
  }
  for (let x = 20; x < W; x += 46) { g.fillStyle(0x1a1410, 0.6); g.fillRect(x, H * 0.4 - 3, 6, 24); }

  // The Grid's meter let into the setts, off centre, needle in the red.
  g.fillStyle(0x08080a, 0.8); g.fillCircle(W * 0.68, H * 0.66, 50);
  meterDial(g, W * 0.68, H * 0.66, 42, 0.06);
  g.lineStyle(2, COPPER, 0.4); g.strokeCircle(W * 0.68, H * 0.66, 56);

  // Chalk: the cable crews' tallies of fathoms laid, and a Linesman's red cross over one.
  for (let row = 0; row < 3; row++) {
    const cx = 120 + row * 6, cy = H * 0.56 + row * 20;
    for (let s = 0; s < 12 - row * 3; s++) {
      g.lineStyle(1.5, CHALK, 0.5);
      const sx = cx + s * 6 + Math.floor(s / 5) * 6;
      if (s % 5 === 4) g.lineBetween(sx - 26, cy + 1, sx, cy - 11); else g.lineBetween(sx, cy, sx, cy - 12);
    }
  }
  g.lineStyle(2, TAG, 0.55); g.lineBetween(W - 260, H * 0.52, W - 230, H * 0.56); g.lineBetween(W - 230, H * 0.52, W - 260, H * 0.56);

  // Puddles, away from the middle.
  for (const [px, py, r] of [[200, H * 0.33, 34], [W - 150, H * 0.78, 40], [W * 0.38, H * 0.82, 26], [W - 110, H * 0.3, 22]] as [number, number, number][]) {
    puddle(g, px, py, r, r * 0.4);
  }

  // ── Along the top: a terrace of crank-houses, wires from their eaves.
  g.fillStyle(0x0b0d15, 1); g.fillRect(0, 0, W, TOP);
  const houses: [number, boolean, number][] = [[90, true, 0], [210, false, 2], [330, true, 0], [W - 330, true, 0], [W - 210, true, 0], [W - 90, false, 1]];
  for (const [hx, litHouse, tags] of houses) {
    crankHouse(g, hx, TOP + 4, 112, 92, { lit: litHouse, tags, crank: litHouse ? 'wheel' : 'treadle', tally: litHouse ? 10 : 3, candle: !litHouse }, rng);
  }
  // Between them, the cable crews' hut: a bench, a lamp-bulb on a flex, and a drum.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(W / 2 - 140, 30, 280, TOP - 24);
  g.fillStyle(BRICK, 1); g.fillRect(W / 2 - 136, 34, 272, TOP - 30);
  g.fillStyle(0x0c0e14, 1); g.fillRect(W / 2 - 60, 54, 120, TOP - 50);
  g.lineStyle(1, 0x1a1a1e, 1); g.lineBetween(W / 2 - 36, 30, W / 2 - 36, 66);
  g.fillStyle(BULB, 0.9); g.fillCircle(W / 2 - 36, 70, 4);
  g.fillStyle(BULB, 0.08); g.fillCircle(W / 2 - 36, 74, 40);
  gridSeal(g, W / 2 + 90, 70, 14, 0xd8d8d8, 0.55);
  cableDrum(g, W / 2 + 30, TOP + 4, 0.8);
  // The wires overhead: each house's drop, and the street line sagging across.
  wire(g, { x: -20, y: 14 }, { x: W + 20, y: 20 }, 22, 2.4);
  wire(g, { x: -20, y: 26 }, { x: W + 20, y: 30 }, 26, 2);
  for (const [hx] of houses) wire(g, { x: hx + 44, y: TOP - 88 }, { x: hx + 30, y: 34 }, 6, 1, 0x3a1e0e, COPPER, 0.9);
  for (let k = 0; k < 6; k++) {
    const ix = 60 + k * ((W - 120) / 5);
    g.fillStyle(PORCELAIN, 1); g.fillEllipse(ix, 24 + Math.sin((ix / W) * Math.PI) * 22, 6, 4);
  }

  // ── Down the left: the great cable up out of the sea on its trestles, toward the Cable House.
  trestle(g, 52, H * 0.42, 52);
  trestle(g, 52, H * 0.72, 40);
  bigCable(g, [{ x: 38, y: H + 10 }, { x: 46, y: BOT - 6 }, { x: 52, y: H * 0.72 - 42 }, { x: 52, y: H * 0.42 - 54 }, { x: 52, y: TOP - 20 }], 9);
  for (const yy of [H * 0.72 - 44, H * 0.42 - 56]) { g.fillStyle(IRON_LIT, 1); g.fillRect(38, yy - 3, 28, 4); }

  // ── Along the bottom: the sea wall, bollards, the black water.
  g.fillStyle(SEA, 1); g.fillRect(0, BOT, W, H - BOT);
  g.fillStyle(SEA_DEEP, 1); g.fillRect(0, BOT + 30, W, H - BOT - 30);
  for (let i = 0; i < 40; i++) { g.fillStyle(SEA_LIT, 0.2 + rng() * 0.2); g.fillEllipse(rng() * W, BOT + 10 + rng() * (H - BOT - 10), 24 + rng() * 40, 2.5); }
  for (let x = 0; x < W; x += 30) { g.fillStyle(FOAM, 0.2 + rng() * 0.2); g.fillEllipse(x + 15, BOT + 8, 22, 3); }
  g.fillStyle(0x0e0f14, 1); g.fillRect(0, BOT - 12, W, 14);
  for (let x = 0; x < W; x += 38) { g.fillStyle(0x4a4c56, 1); g.fillRect(x + 1, BOT - 14, 36, 9); g.fillStyle(0x6a6e7a, 1); g.fillRect(x + 1, BOT - 14, 36, 2); }
  for (const bx of [180, 420, W - 420, W - 180]) {
    g.fillStyle(0x000000, 0.4); g.fillEllipse(bx, BOT - 16, 22, 8);
    g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(bx - 8, BOT - 32, 16, 18, 4);
    g.fillStyle(IRON, 1); g.fillEllipse(bx, BOT - 32, 20, 8);
    g.fillStyle(IRON_LIT, 0.6); g.fillEllipse(bx - 3, BOT - 33, 6, 2);
  }
  // A mooring rope from one bollard trailing off the wall into the water.
  g.lineStyle(3, 0x8a7a5a, 0.9); g.lineBetween(W - 180, BOT - 30, W - 120, BOT + 10); g.lineBetween(W - 120, BOT + 10, W - 60, H + 4);

  // Kelp and a broken insulator washed up against the wall, bottom left.
  blob(g, 260, BOT - 18, 20, 6, 0x1e3a2a, 0.9, rng);
  poly(g, [[300, BOT - 22], [314, BOT - 26], [318, BOT - 18], [304, BOT - 16]], 0x5a9a8a);
  gridSeal(g, W * 0.68, H * 0.66 + 70, 6, GRID_DARK, 0.4);
};
