import type { ArenaFloor } from '../../../../IslesTypes';
import { bunting, fieldDrum, mudGround, palisade, sandbags, suit, warBanner } from './art';
import { BAG_DARK, INK, IVORY, MUD_DARK, RED, SAND, SAND_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT } from './palette';

/**
 * The fight floor for every War Court encounter: a drill yard cut into the summit slope. The top
 * edge is a stake palisade hung with House banners (half under the HUD), the sides are sandbag
 * breastworks with duckboards along them, and the floor is trampled mud over raked sand, a white
 * drill line painted through the middle and boot prints everywhere. The middle is left open — the
 * drum, the engines, the standard, the rail and the fog bring their own.
 */
export const WAR_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Raked sand, trodden into mud in wide patches.
  g.fillStyle(SAND, 1); g.fillRect(0, 0, W, H);
  for (let k = 100; k < H; k += 6) { g.lineStyle(1, SAND_DARK, 0.22); g.lineBetween(0, k, W, k); }
  mudGround(g, 0, 96, W, H - 96, rng);
  // Let the sand show through the mud in long raked streaks, so it reads as a yard, not a field.
  for (let i = 0; i < 7; i++) {
    const y = 140 + i * 72 + rng() * 20;
    g.fillStyle(SAND, 0.45); g.fillEllipse(W / 2 + (rng() - 0.5) * 300, y, W * (0.5 + rng() * 0.4), 26);
  }
  // The drill line and the station marks.
  g.lineStyle(3, IVORY, 0.4); g.lineBetween(60, (96 + H) / 2 + 10, W - 60, (96 + H) / 2 + 10);
  for (let x = 120; x < W - 80; x += 120) { g.fillStyle(IVORY, 0.35); g.fillRect(x - 5, (96 + H) / 2 + 4, 10, 12); }

  // The palisade along the top, with banners hung from it.
  g.fillStyle(MUD_DARK, 1); g.fillRect(0, 0, W, 100);
  palisade(g, 0, W, 102, 70, rng);
  for (let i = 0; i < 5; i++) {
    const x = 90 + i * 195;
    warBanner(g, x, 100, 92, i % 2 ? INK : RED, (['heart', 'spade', 'diamond', 'club', 'lot'] as const)[i], i * 1.3);
  }
  bunting(g, 20, 40, W - 20, 40, 18);

  // Sandbag breastworks down both sides, duckboards inside them.
  for (const x0 of [0, W - 40]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + (x0 ? -26 : 40), 110, 26, H - 110);
    for (let y = 112; y < H; y += 12) { g.fillStyle(TIMBER, 1); g.fillRect(x0 + (x0 ? -24 : 42), y, 22, 9); g.fillStyle(TIMBER_LIT, 0.5); g.fillRect(x0 + (x0 ? -24 : 42), y, 22, 2); }
    g.fillStyle(BAG_DARK, 1); g.fillRect(x0, 104, 40, H - 104);
    for (let y = 120; y < H; y += 10) sandbags(g, x0 + 20, y, 40, 1);
  }
  // A few drums and a spilt box of Lots, left by the drill.
  fieldDrum(g, 100, H - 40, 1);
  fieldDrum(g, W - 96, 170, 0.9);
  for (let i = 0; i < 18; i++) {
    const x = 60 + rng() * (W - 120), y = 130 + rng() * (H - 180);
    g.fillStyle(0x7a5620, 0.7); g.fillCircle(x, y + 0.6, 3);
    g.fillStyle(0xc3923e, 0.8); g.fillCircle(x, y, 2.6);
  }
  // Painted suits on the sandbags at the corners: the House's mark on its breastworks.
  suit(g, 20, H - 70, 9, 'spade', INK, 0.8);
  suit(g, W - 20, H - 70, 9, 'heart', RED, 0.8);
  // A strip of duckboard along the bottom.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, H - 22, W, 22);
  for (let x = 0; x < W; x += 14) { g.fillStyle(TIMBER, 1); g.fillRect(x + 1, H - 20, 12, 18); }
};
