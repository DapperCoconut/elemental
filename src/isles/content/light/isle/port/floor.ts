import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, mixC } from '../../../../art/IsleArt';
import {
  GLARE, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_LIT, LIME, LIME_ALT, LIME_DARK, MARBLE, MARBLE_DARK, MARBLE_SHADE, SEA,
  SEA_DEEP, SEA_SHALLOW, inspectionTable, mirrorBuoy, noonShadow, poly, sunburst,
} from './art';

/**
 * The fight floor for every Meridian Quay quest duel: the inspection yard in front of the Customs of
 * Clarity. Along the top (half under the HUD) the colonnade stands with no front wall, the gilt frieze
 * SEEN IS SAFE over it and a sunburst in the pediment, the long inspection tables either side of the
 * steps with somebody's life spread out on them. The floor is the quay's great limestone slabs, crazed
 * by twenty-two years of sun, with the painted feet where arrivals stand to be looked at and Auriel's
 * sunburst inlaid in gilt off to one side. Every shadow is a sliver. Along the bottom is the quay lip,
 * its bollards, and the white water with the mirror-buoys bobbing in it. The middle is clear.
 */
export const MERIDIAN_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 124;
  const BOT = H - 70;

  // ── The slabs: big dressed blocks, each a slightly different white.
  g.fillStyle(LIME_DARK, 1); g.fillRect(0, 0, W, H);
  const SLAB = 84;
  for (let y = TOP, row = 0; y < BOT; y += SLAB * 0.62, row++) {
    const sh = SLAB * 0.62;
    for (let x = -(row % 2) * SLAB * 0.5; x < W; x += SLAB) {
      const col = mixC(LIME, rng() < 0.5 ? MARBLE : LIME_ALT, rng() * 0.6);
      g.fillStyle(col, 1); g.fillRect(x + 2, y + 2, SLAB - 4, Math.min(sh - 4, BOT - y - 2));
      g.fillStyle(0xffffff, 0.18); g.fillRect(x + 2, y + 2, SLAB - 4, 3);
    }
  }
  // Sun-crazing: hairline cracks wandering across the stones.
  for (let i = 0; i < 46; i++) {
    let cx = rng() * W, cy = TOP + 10 + rng() * (BOT - TOP - 20);
    g.lineStyle(1, LIME_DARK, 0.55);
    for (let k = 0; k < 5; k++) { const nx = cx + (rng() - 0.5) * 26, ny = cy + (rng() - 0.5) * 16; g.lineBetween(cx, cy, nx, ny); cx = nx; cy = ny; }
  }
  // Glare pooled on the stones — the floor is too bright in patches to look at.
  for (let i = 0; i < 14; i++) {
    g.fillStyle(GLARE, 0.08 + rng() * 0.08);
    g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 90 + rng() * 160, 20 + rng() * 30);
  }

  // The painted feet: where every arrival stands to be looked at, worn by twenty-two years of standing.
  for (let k = 0; k < 6; k++) {
    const fx = 150 + k * 22, fy = TOP + 70;
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(fx - 4, fy, 6, 12); g.fillEllipse(fx + 4, fy + 2, 6, 12);
  }
  g.lineStyle(2, 0xffffff, 0.6); g.strokeRect(134, TOP + 52, 140, 36);

  // Auriel's sunburst inlaid in gilt, off centre, scuffed by luggage.
  sunburst(g, W * 0.68, H * 0.6, 40, GOLD_DARK, 0.45);
  sunburst(g, W * 0.68, H * 0.6, 36, GOLD, 0.4);
  g.lineStyle(2, GOLD_DARK, 0.3); g.strokeCircle(W * 0.68, H * 0.6, 80);
  for (let i = 0; i < 26; i++) { g.fillStyle(LIME, 0.5); g.fillEllipse(W * 0.68 - 60 + rng() * 120, H * 0.6 - 50 + rng() * 100, 6 + rng() * 14, 3); }

  // ── The Customs colonnade along the top: back wall, the confiscated on its racks, columns, frieze.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(0, 0, W, TOP);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(0, TOP - 30, W, 30);
  // Racks of confiscated shade through the colonnade: umbrellas, curtains, hats, a blanket.
  for (let k = 0; k < 16; k++) {
    const ix = 30 + k * 58;
    const kind = k % 4;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(ix - 14, TOP - 34, 28, 3);
    if (kind === 0) { g.fillStyle(0x24242c, 1); g.fillTriangle(ix - 12, TOP - 38, ix + 12, TOP - 38, ix, TOP - 54); g.lineStyle(1, IRON, 1); g.lineBetween(ix, TOP - 38, ix, TOP - 34); }
    if (kind === 1) { g.fillStyle(0x6a3a4a, 1); g.fillRect(ix - 10, TOP - 60, 20, 26); g.lineStyle(1, dim(0x6a3a4a, 0.35), 1); for (let f = 0; f < 5; f++) g.lineBetween(ix - 8 + f * 4, TOP - 60, ix - 8 + f * 4, TOP - 34); }
    if (kind === 2) { g.fillStyle(0x3a3030, 1); g.fillEllipse(ix, TOP - 40, 22, 7); g.fillEllipse(ix, TOP - 45, 12, 10); }
    if (kind === 3) { g.fillStyle(0x4a5a6a, 1); g.fillRect(ix - 12, TOP - 50, 24, 16); g.lineStyle(1, 0x2a3a4a, 1); g.lineBetween(ix - 12, TOP - 42, ix + 12, TOP - 42); }
    g.fillStyle(0xf4ecd0, 1); g.fillRect(ix - 5, TOP - 32, 10, 5);
  }
  // Fluted columns.
  for (let k = 0; k < 9; k++) {
    const cx = 20 + k * 115;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 14, TOP - 12, 28, 10);
    g.fillStyle(MARBLE, 1); g.fillRect(cx - 11, 20, 22, TOP - 32);
    g.lineStyle(1, MARBLE_SHADE, 1); for (let f = -7; f <= 7; f += 3.5) g.lineBetween(cx + f, 22, cx + f, TOP - 12);
    g.fillStyle(0xffffff, 0.6); g.fillRect(cx - 10, 22, 3, TOP - 36);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(cx - 15, 14, 30, 8);
    noonShadow(g, cx, TOP - 2, 30);
  }
  // Entablature with the gilt frieze.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(0, 0, W, 16);
  g.fillStyle(MARBLE, 1); g.fillRect(0, 0, W, 12);
  for (let k = 0; k < 11; k++) { if (k === 4 || k === 7) continue; g.fillStyle(GOLD_DARK, 1); g.fillRect(W / 2 - 66 + k * 12, 3, 8, 6); }
  sunburst(g, W / 2, 52, 14, GOLD, 1);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(W / 2 - 4, 48, 3);

  // The inspection tables either side of the steps, someone's life spread out on each.
  inspectionTable(g, 170, TOP + 40, 230, rng);
  inspectionTable(g, W - 170, TOP + 40, 230, rng);
  // The steps up into the hall, between the tables.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? MARBLE_SHADE : MARBLE, 1); g.fillRect(W / 2 - 110 + k * 12, TOP - k * 7, 220 - k * 24, 7);
    g.fillStyle(MARBLE_DARK, 0.5); g.fillRect(W / 2 - 110 + k * 12, TOP + 6 - k * 7, 220 - k * 24, 1);
  }

  // ── The quay lip and the white water along the bottom.
  for (let y = BOT; y < H; y += 4) {
    const t = (y - BOT) / (H - BOT);
    g.fillStyle(mixC(SEA_SHALLOW, mixC(SEA, SEA_DEEP, t), t), 1); g.fillRect(0, y, W, 4);
  }
  for (let i = 0; i < 40; i++) { g.fillStyle(GLARE, 0.4 + rng() * 0.4); g.fillEllipse(rng() * W, BOT + 20 + rng() * (H - BOT - 20), 16 + rng() * 40, 2); }
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(0, BOT - 10, W, 14);
  g.fillStyle(MARBLE, 1); g.fillRect(0, BOT - 12, W, 5);
  for (let x = 0; x < W; x += 52) { g.lineStyle(1, MARBLE_DARK, 0.6); g.lineBetween(x, BOT - 10, x, BOT + 4); }
  for (const bx of [80, 300, 660, 880]) {
    noonShadow(g, bx, BOT - 8, 14);
    g.fillStyle(IRON, 1); g.fillRect(bx - 6, BOT - 24, 12, 14); g.fillEllipse(bx, BOT - 24, 14, 6);
    g.fillStyle(IRON_LIT, 1); g.fillRect(bx - 5, BOT - 23, 2, 10);
  }
  // Mirror-buoys bobbing off the lip, caught mid-flash.
  mirrorBuoy(g, 200, H - 12, 0.68, 0);
  mirrorBuoy(g, 760, H - 10, 2.1, 4);

  // ── Corners, out of the middle.
  // Two emptied trunks gaping, bottom left.
  for (const [tx, ty] of [[60, BOT - 36], [104, BOT - 30]] as [number, number][]) {
    noonShadow(g, tx, ty, 34);
    g.fillStyle(0x5a3a24, 1); g.fillRect(tx - 16, ty - 16, 32, 16);
    g.fillStyle(0x2a1a10, 1); g.fillRect(tx - 14, ty - 15, 28, 5);
    poly(g, [[tx - 16, ty - 16], [tx + 16, ty - 16], [tx + 13, ty - 34], [tx - 13, ty - 34]], 0x6a4a2e);
    g.fillStyle(0xd8c8a8, 1); g.fillRect(tx - 10, ty - 22, 8, 4); g.fillRect(tx + 2, ty - 20, 6, 3);
  }
  // A heap of seized black umbrellas tagged for the Burning Glass, bottom right.
  for (let k = 0; k < 5; k++) {
    const ux = W - 110 + k * 14, uy = BOT - 24 - (k % 2) * 6;
    g.lineStyle(2, IRON, 1); g.lineBetween(ux, uy, ux + 22, uy - 18);
    g.fillStyle(0x1e1e26, 1); poly(g, [[ux + 8, uy - 6], [ux + 30, uy - 26], [ux + 18, uy - 2]], 0x1e1e26);
    g.fillStyle(0xf4ecd0, 1); g.fillRect(ux + 2, uy - 4, 6, 4);
  }
  noonShadow(g, W - 80, BOT - 20, 80);
};
