import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, groundFill } from '../../../../art/IsleArt';
import { arcadeTops, brokenColumn, buriedDome, cliffFace, drift, duneRidge, jar, mosaicPatch, ripples, sandShip } from './art';
import { CANVAS, SAND, SAND_DEEP, SAND_LIT, STRIPE_INDIGO, STRIPE_RED, STRIPE_SAFFRON, TIMBER, TIMBER_DARK } from './palette';

/**
 * The fight floor for every Dunesea encounter: a stretch of open dune at the edge of Old Hamra.
 * The top edge (half under the HUD) is the mesa's banded cliff over the buried city's skyline — a
 * dome and an arcade just clearing the sand; down the left runs a palm-frond windbreak, down the
 * right a striped awning over a caravan's jars; along the bottom lies the stove-in hull of a
 * sand-ship the dune is eating. The middle is rippled sand left open — the ships, the worm, the
 * oases, the pools and the mounds bring their own.
 */
export const DUNESEA_FLOOR: ArenaFloor = (g, W, H, rng) => {
  groundFill(g, { x: 0, y: 0, w: W, h: H }, SAND, SAND_LIT, SAND_DEEP, rng, 1.4);
  // Two long low ridges for depth, then the ripples combed over everything.
  duneRidge(g, [{ x: 160, y: 300 }, { x: 320, y: 270 }, { x: 460, y: 286 }], 26, rng);
  duneRidge(g, [{ x: 560, y: 520 }, { x: 720, y: 494 }, { x: 860, y: 512 }], 26, rng);
  ripples(g, { x: 0, y: 100, w: W, h: H - 100 }, rng, 1.5, 0.12);
  // A patch of the old city's mosaic swept bare near one corner.
  mosaicPatch(g, W - 190, H - 150, 64, 26, rng);

  // The top: cliff strata, the buried skyline in front of it.
  cliffFace(g, 0, W, 64, 64, rng);
  g.fillStyle(SAND, 1); g.fillRect(0, 64, W, 46);
  buriedDome(g, 150, 104, 46, rng, 0.6);
  arcadeTops(g, 470, 104, 5, 40, rng);
  buriedDome(g, 790, 104, 34, rng, 0.9);
  drift(g, 320, 110, 160, 24, rng, true);
  drift(g, 650, 110, 140, 20, rng, false);

  // The left: a windbreak of palm fronds lashed to stakes.
  for (let y = 130; y < H - 60; y += 12) {
    const x = 18 + Math.sin(y / 30) * 2;
    g.lineStyle(3, dim(0x8a6a3a, 0.2), 1); g.lineBetween(x - 10, y, x + 12, y - 16);
    g.lineStyle(2, 0xa88a4a, 1); g.lineBetween(x - 8, y - 1, x + 12, y - 15);
  }
  for (let y = 140; y < H - 60; y += 90) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(14, y - 30, 5, 36); }
  drift(g, 40, H - 40, 120, 30, rng, true);

  // The right: a striped awning on poles over a caravan's jars.
  const ax = W - 34;
  for (let y = 170; y < H - 120; y += 140) {
    g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(ax - 26, y + 50, ax - 26, y - 6);
    for (let k = 0; k < 5; k++) {
      g.fillStyle(k % 2 ? CANVAS : [STRIPE_RED, STRIPE_INDIGO, STRIPE_SAFFRON][(y / 140) % 3 | 0], 1);
      g.fillRect(ax - 30 + k * 10, y - 12, 10, 16);
    }
    for (let k = 0; k < 3; k++) jar(g, ax - 10 + k * 12 - 10, y + 46 - (k % 2) * 4, 0.8, k === 1 ? 0x3ab0a8 : 0xb8643a);
  }

  // The bottom: the wreck of a sand-ship half under the dune.
  sandShip(g, W * 0.42, H + 26, 1.1, -1, { wreck: true });
  drift(g, W * 0.3, H + 2, 280, 30, rng, true);
  drift(g, W * 0.6, H + 2, 200, 22, rng, false);
  // A column stump and a few potsherds.
  brokenColumn(g, 120, H - 70, 34, rng);
  for (let i = 0; i < 18; i++) {
    const x = 80 + rng() * (W - 160), y = 150 + rng() * (H - 230);
    g.fillStyle(i % 3 ? 0xb8643a : 0x3ab0a8, 0.8); g.fillTriangle(x, y, x + 5 + rng() * 4, y + 1, x + 2, y + 4);
  }
  // A lost sandal, a camel's track crossing the middle, as if the fight cut across a caravan route.
  for (let x = 40; x < W - 40; x += 22) {
    const y = H * 0.62 + Math.sin(x / 160) * 30 + (((x / 22) | 0) % 2 ? 6 : -6);
    g.fillStyle(SAND_DEEP, 0.28); g.fillEllipse(x, y, 7, 5);
  }
  g.fillStyle(TIMBER, 1); g.fillEllipse(W * 0.7, H * 0.36, 16, 7); g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(W * 0.7 - 4, H * 0.36 - 2, W * 0.7 + 4, H * 0.36 + 1);
};
