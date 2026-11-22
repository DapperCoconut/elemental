import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { cocoonCluster, lantern, orbWeb, sheet, strand, tear } from './art';
import {
  BARK, BARK_DARK, BARK_LIT, DROP, LEAF, LEAF_DARK, MOSS, PLANK, PLANK_DARK, PLANK_LIT, ROPE, ROPE_DARK, SILK_LIT,
} from './palette';

/**
 * The fight floor for every Web Court encounter: a work-deck slung in the canopy. Planks laid
 * across the middle of the Sheet, the woven silk showing round them, two mangrove trunks for walls,
 * the canopy overhead with cocooned tithe-silk and lanterns hanging from it, and at the bottom edge
 * the Sheet torn open on the drop. The middle is kept clear — the wires, sacs, warp and strings bring
 * their own.
 */
export const WEB_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // The Sheet under everything.
  g.fillStyle(DROP, 1); g.fillRect(0, 0, W, H);
  sheet(g, { x: 0, y: 90, w: W, h: H - 90 }, rng);
  // The deck: long planks running across, lashed at the ends, worn pale down the middle.
  const dx0 = 70, dx1 = W - 70, dy0 = 150, dy1 = H - 70;
  g.fillStyle(PLANK_DARK, 1); g.fillRect(dx0 - 4, dy0 - 4, dx1 - dx0 + 8, dy1 - dy0 + 8);
  for (let y = dy0; y < dy1; y += 16) {
    let x = dx0;
    while (x < dx1) {
      const len = Math.min(dx1 - x, 120 + rng() * 160);
      const c = rng() < 0.2 ? PLANK_DARK : rng() < 0.55 ? PLANK : PLANK_LIT;
      g.fillStyle(c, 1); g.fillRect(x, y, len - 2, 14);
      g.fillStyle(lit(c, 0.12), 0.5); g.fillRect(x, y, len - 2, 2);
      if (rng() < 0.5) { g.fillStyle(PLANK_DARK, 0.8); g.fillCircle(x + 5, y + 7, 1.3); g.fillCircle(x + len - 8, y + 7, 1.3); }
      x += len;
    }
  }
  // Wear down the middle of the deck.
  g.fillStyle(0xffffff, 0.05); g.fillEllipse(W / 2, (dy0 + dy1) / 2, W * 0.6, (dy1 - dy0) * 0.6);
  // Lashings at the deck's corners, and a rope rail round three sides.
  g.lineStyle(2.5, ROPE_DARK, 1); g.strokeRect(dx0 - 4, dy0 - 4, dx1 - dx0 + 8, dy1 - dy0 + 8);
  g.lineStyle(1.5, ROPE, 1); g.strokeRect(dx0 - 5, dy0 - 5, dx1 - dx0 + 8, dy1 - dy0 + 8);
  for (let x = dx0; x <= dx1; x += 110) { g.fillStyle(PLANK_DARK, 1); g.fillCircle(x, dy0 - 4, 3.5); g.fillCircle(x, dy1 + 4, 3.5); }
  // Old webs lying across the deck, half swept.
  for (let i = 0; i < 4; i++) orbWeb(g, 140 + rng() * (W - 280), dy0 + 40 + rng() * (dy1 - dy0 - 80), 30 + rng() * 26, SILK_LIT, 0.16, 10, 0.6, 0.4, rng() * 3);
  // The bottom edge: the Sheet torn on the drop, two tears, a bridge of planks out to the right.
  tear(g, 150, H - 22, 34, rng);
  tear(g, W - 240, H - 18, 28, rng);
  // The trunks either side.
  for (const x0 of [0, W - 34]) {
    g.fillStyle(BARK_DARK, 1); g.fillRect(x0, 90, 34, H - 90);
    g.fillStyle(BARK, 1); g.fillRect(x0 + 3, 90, 28, H - 90);
    for (let i = 0; i < 16; i++) {
      const bx = x0 + 5 + rng() * 24, by = 90 + rng() * (H - 140);
      g.lineStyle(1.5, rng() < 0.5 ? BARK_DARK : BARK_LIT, 0.8); g.lineBetween(bx, by, bx + (rng() - 0.5) * 4, by + 30 + rng() * 60);
    }
    for (let i = 0; i < 10; i++) { g.fillStyle(MOSS, 0.8); g.fillEllipse(x0 + 4 + rng() * 26, 100 + rng() * (H - 140), 6, 3); }
    // Stilt-roots splaying onto the deck.
    const inward = x0 === 0 ? 1 : -1;
    for (let k = 0; k < 3; k++) {
      const ry = 220 + k * 150 + rng() * 40;
      g.lineStyle(6, BARK_DARK, 1); g.lineBetween(x0 + (inward > 0 ? 30 : 4), ry, x0 + 17 + inward * 60, ry + 40);
      g.lineStyle(4, BARK, 1); g.lineBetween(x0 + (inward > 0 ? 30 : 4), ry - 1, x0 + 17 + inward * 60, ry + 39);
    }
  }
  // The canopy over the top, under the HUD: leaves, a beam, cocoons and lanterns hanging off it.
  g.fillStyle(LEAF_DARK, 1); g.fillRect(0, 0, W, 100);
  for (let x = 0; x < W; x += 26) { g.fillStyle(rng() < 0.5 ? LEAF : dim(LEAF, 0.2), 1); g.fillCircle(x + rng() * 10, 74 + rng() * 18, 18 + rng() * 14); }
  g.fillStyle(BARK_DARK, 1); g.fillRect(0, 96, W, 10);
  g.fillStyle(BARK, 1); g.fillRect(0, 94, W, 5);
  for (let x = 90; x < W; x += 180) cocoonCluster(g, x, 104, 2 + Math.floor(rng() * 3), rng);
  for (let x = 180; x < W; x += 180) lantern(g, x, 134, 0.9, true, 22);
  // Guy-lines from the trunks to the beam, sagging.
  strand(g, { x: 34, y: 140 }, { x: 260, y: 104 }, 14, SILK_LIT, 0.5, 1.5, 3);
  strand(g, { x: W - 34, y: 140 }, { x: W - 260, y: 104 }, 14, SILK_LIT, 0.5, 1.5, 3);
};
