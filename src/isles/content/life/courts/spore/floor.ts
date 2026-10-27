import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, dim } from '../../../../art/IsleArt';
import {
  BOG, BOG_SHEEN, CAP_RED, CAP_TAN, CAP_VIOLET, GLOW, GLOW_DEEP, MOSS, MOSS_DARK, MOSS_LIT, PEAT, PEAT_DARK,
  PEAT_LIT, PLANK, PLANK_DARK, PLANK_LIT, SEDGE, SPORE,
} from './palette';
import { glowcaps, hypha, toadstool } from './sporeArt';

/**
 * The Spore Court's fighting floor — a peat clearing in the mushroom wood, under the boardwalk.
 *
 * Black peat, soft and wet, mottled with cushions of moss; a rotten boardwalk runs along the top
 * edge where the onlookers stand; black bog-water pools in two corners with an oily sheen; ranks
 * of toadstools and glowcap clusters crowd the margins; and under it all, faint as breath, the
 * Prince's threads run across the ground from edge to edge — he is listening to this fight too.
 * The middle is kept dark and quiet so the five rules draw their rings, clouds and threads over it.
 */
export const SPORE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(PEAT, 1); g.fillRect(0, 0, W, H);
  // Peat mottling and moss cushions.
  for (let i = 0; i < 40; i++) blob(g, rng() * W, top + rng() * (H - top), 40 + rng() * 120, 20 + rng() * 50, rng() < 0.5 ? PEAT_LIT : PEAT_DARK, 0.45, rng);
  for (let i = 0; i < 26; i++) {
    const x = rng() * W, y = top + rng() * (H - top);
    const r = 18 + rng() * 46;
    blob(g, x, y, r, r * 0.55, MOSS_DARK, 0.75, rng);
    blob(g, x - 3, y - 3, r * 0.8, r * 0.42, MOSS, 0.7, rng);
    for (let k = 0; k < 8; k++) { g.fillStyle(MOSS_LIT, 0.5); g.fillCircle(x + (rng() - 0.5) * r * 1.3, y + (rng() - 0.5) * r * 0.6, 1.5 + rng() * 2); }
  }
  // Leaf litter and spore dust.
  for (let i = 0; i < 900; i++) {
    g.fillStyle(rng() < 0.7 ? PEAT_LIT : SPORE, 0.15 + rng() * 0.25);
    g.fillRect(rng() * W, top + rng() * (H - top), 1 + rng() * 3, 1 + rng() * 1.5);
  }
  // The Prince's threads, faint, edge to edge.
  for (let i = 0; i < 9; i++) {
    const a = { x: rng() < 0.5 ? 0 : W, y: top + rng() * (H - top) };
    const b = { x: W * (0.2 + rng() * 0.6), y: top + rng() * (H - top) };
    hypha(g, a, b, 1.2, GLOW_DEEP, 0.35, i * 7 + 3, 0.12);
  }
  // Bog pools in the bottom-left and top-right corners.
  for (const [cx, cy, rx, ry] of [[40, H - 30, 150, 80], [W - 30, top + 40, 130, 70]] as const) {
    blob(g, cx, cy, rx + 12, ry + 10, MOSS_DARK, 1, rng);
    blob(g, cx, cy, rx, ry, BOG, 1, rng);
    g.fillStyle(BOG_SHEEN, 0.4); g.fillEllipse(cx - rx * 0.2, cy - ry * 0.2, rx * 0.9, ry * 0.25);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      g.lineStyle(2, SEDGE, 0.8);
      const sx = cx + Math.cos(a) * rx * 0.95, sy = cy + Math.sin(a) * ry * 0.95;
      g.lineBetween(sx, sy, sx + (rng() - 0.5) * 6, sy - 14 - rng() * 10);
    }
  }
  // The boardwalk along the top edge, planks crosswise, posts sunk in the peat.
  g.fillStyle(PLANK_DARK, 1); g.fillRect(0, top - 4, W, 26);
  for (let x = 0; x < W; x += 15) {
    g.fillStyle(rng() < 0.15 ? PLANK_DARK : PLANK, 1); g.fillRect(x + 1, top - 2, 13, 21);
    g.fillStyle(PLANK_LIT, 0.4); g.fillRect(x + 1, top - 2, 13, 3);
  }
  for (let x = 30; x < W; x += 120) { g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 4, top + 18, 8, 12); }
  // Toadstools and glowcaps crowding the side and bottom margins.
  const caps = [CAP_RED, CAP_VIOLET, CAP_TAN];
  for (let i = 0; i < 26; i++) {
    const side = i % 3;
    const x = side === 0 ? 8 + rng() * 34 : side === 1 ? W - 8 - rng() * 34 : 60 + rng() * (W - 120);
    const y = side === 2 ? H - 6 - rng() * 18 : top + 50 + rng() * (H - top - 80);
    if (rng() < 0.4) glowcaps(g, x, y, 5 + rng() * 4, 0.8, i);
    else toadstool(g, x, y, 6 + rng() * 9, caps[i % 3], i % 3 === 0, 1, i);
  }
  // A grey-green ring burnt in the moss where a fairy ring stood last year.
  g.lineStyle(10, dim(MOSS, 0.4), 0.35); g.strokeEllipse(W * 0.5, (top + H) / 2 + 10, W * 0.62, (H - top) * 0.66);
  g.lineStyle(2, GLOW, 0.06); g.strokeEllipse(W * 0.5, (top + H) / 2 + 10, W * 0.62 + 14, (H - top) * 0.66 + 10);
};
