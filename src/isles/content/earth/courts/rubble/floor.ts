import type { ArenaFloor } from '../../../../IslesTypes';
import { lit } from '../../../../art/IsleArt';
import { ashlar, brokenColumn, buriedRoof, crack, mosaic, spoil, strataFace, weed } from './art';
import { DUST, DUST_DARK, DUST_LIT, LIME, LIME_DARK, LIME_DEEP, SCREE, SCREE_DARK, TESS_BONE } from './palette';

/**
 * The fight floor for every Rubble encounter: a square of the buried capital dug half out. Across
 * the top (half under the HUD) the mountain's strata and a buried roofline; down both sides,
 * spoil banks with broken columns standing in them; underfoot, the old square's mosaic showing
 * through drifted dust in patches, cracked and swept, cut stones lying where they fell. The middle
 * is left open — the pillars, holes, water, dead and colossus bring their own.
 */
export const RUBBLE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Packed dust.
  g.fillStyle(DUST, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    const x = rng() * W, y = 100 + rng() * (H - 100);
    g.fillStyle(rng() < 0.5 ? DUST_DARK : DUST_LIT, 0.35); g.fillRect(x, y, 2 + rng() * 3, 1.5);
  }
  // The old square's paving, in big worn flags, mostly under dust.
  for (let y = 120; y < H; y += 64) {
    for (let x = (y / 64) % 2 ? -32 : 0; x < W; x += 64) {
      if (rng() < 0.45) continue;
      g.fillStyle(LIME_DEEP, 0.35); g.fillRect(x + 1, y + 1, 62, 62);
      g.fillStyle(lit(LIME, 0.05), 0.4); g.fillRect(x + 2, y + 2, 59, 59);
    }
  }
  // Mosaic patches dug out by the pickers.
  mosaic(g, { x: 150, y: 380, w: 170, h: 120 }, rng);
  mosaic(g, { x: W - 330, y: 200, w: 150, h: 110 }, rng);
  mosaic(g, { x: W / 2 - 90, y: H - 150, w: 180, h: 100 }, rng);
  for (let i = 0; i < 6; i++) { g.fillStyle(DUST, 0.7); g.fillEllipse(rng() * W, 140 + rng() * (H - 180), 120 + rng() * 120, 40 + rng() * 30); }
  // The top: strata and a buried roofline.
  strataFace(g, { x: 0, y: 0, w: W, h: 70 }, rng);
  for (let x = 90; x < W; x += 230) buriedRoof(g, x + rng() * 40, 112, 150, rng() < 0.4, rng);
  // Spoil banks down both sides with broken columns standing in them.
  for (const x0 of [0, W - 46]) {
    g.fillStyle(SCREE_DARK, 1); g.fillRect(x0, 100, 46, H - 100);
    g.fillStyle(SCREE, 1); g.fillRect(x0 + (x0 ? 6 : 0), 100, 40, H - 100);
    for (let y = 130; y < H; y += 40) spoil(g, x0 + 23, y, 60, 26, rng);
  }
  for (const [x, y, h] of [[34, 260, 60], [W - 34, 330, 80], [34, 520, 40], [W - 34, 560, 50]] as [number, number, number][]) brokenColumn(g, x, y, h, 11, rng);
  // Cut stones lying where they fell, cracks everywhere, weeds in the cracks.
  for (let i = 0; i < 20; i++) ashlar(g, 70 + rng() * (W - 140), 150 + rng() * (H - 190), 12 + rng() * 14, 7 + rng() * 6, rng() < 0.6 ? LIME : LIME_DARK);
  for (let i = 0; i < 30; i++) crack(g, 60 + rng() * (W - 120), 130 + rng() * (H - 160), 20 + rng() * 50, rng() * Math.PI * 2, LIME_DEEP, 0.45);
  for (let i = 0; i < 24; i++) weed(g, 60 + rng() * (W - 120), 130 + rng() * (H - 160), 0.8 + rng() * 0.5);
  // Along the bottom: a kerb of the old square, broken.
  for (let x = 0; x < W; x += 30) {
    if (rng() < 0.2) continue;
    g.fillStyle(LIME_DARK, 1); g.fillRect(x, H - 22, 28, 12);
    g.fillStyle(TESS_BONE, 0.3); g.fillRect(x, H - 22, 28, 2);
  }
};
