import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { cinderGround, ingotStack, rivets, scrapPile, strata } from './art';
import { BRICK, BRICK_DARK, HEAT_ORANGE, HEAT_RED, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, OCHRE_DARK, SLAG, STONE_DARK } from './palette';

/**
 * The fight floor for every Forge encounter: a foundry yard of trodden cinder. Along the top, half
 * under the HUD, the banded ironstone face with three furnace hearths glowing at its foot; down
 * the sides, stacked Tithe ingots and scrap; along the bottom, a slag gutter. Iron plates are let
 * into the cinder where the heavy work is done. The middle is left open — the carts, crucible,
 * ingots, magnet and bellows bring their own.
 */
export const FORGE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  cinderGround(g, { x: 0, y: 0, w: W, h: H }, rng);
  // Iron plates let into the cinder, worn bright at the edges.
  for (let i = 0; i < 9; i++) {
    const x = 90 + rng() * (W - 220), y = 150 + rng() * (H - 260);
    const w = 70 + rng() * 60, h = 50 + rng() * 40;
    g.fillStyle(dim(IRON, 0.3), 0.9); g.fillRect(x, y, w, h);
    g.fillStyle(IRON, 0.7); g.fillRect(x + 2, y + 2, w - 4, h - 4);
    g.lineStyle(1, IRON_LIT, 0.3); g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    rivets(g, x + 5, y + 5, x + w - 5, y + 5, 3, 1.1);
    rivets(g, x + 5, y + h - 5, x + w - 5, y + h - 5, 3, 1.1);
  }
  // Scale and spark-burns.
  for (let i = 0; i < 120; i++) {
    g.fillStyle(rng() < 0.7 ? 0x000000 : HEAT_RED, rng() < 0.7 ? 0.18 : 0.25);
    g.fillCircle(40 + rng() * (W - 80), 120 + rng() * (H - 160), 1 + rng() * 2.5);
  }
  // The ironstone face along the top, and the furnace hearths at its foot.
  strata(g, 0, 0, W, 108, rng);
  g.fillStyle(0x000000, 0.3); g.fillRect(0, 104, W, 8);
  for (const hx of [W * 0.18, W * 0.5, W * 0.82]) {
    g.fillStyle(BRICK_DARK, 1); g.fillRect(hx - 54, 50, 108, 58);
    for (let y = 52; y < 106; y += 8) for (let x = hx - 52 + (((y / 8) | 0) % 2) * 6; x < hx + 50; x += 12) { g.fillStyle(rng() < 0.25 ? dim(BRICK, 0.2) : BRICK, 1); g.fillRect(x, y, 10, 6); }
    g.fillStyle(0x140806, 1); g.fillRoundedRect(hx - 22, 70, 44, 38, 12);
    g.fillStyle(HEAT_ORANGE, 0.9); g.fillRoundedRect(hx - 16, 78, 32, 30, 10);
    g.fillStyle(HEAT_YELLOW, 0.8); g.fillEllipse(hx, 100, 20, 10);
    glow(g, hx, 112, 60, HEAT_ORANGE, 0.035, 3);
    g.fillStyle(STONE_DARK, 1); g.fillRect(hx - 58, 104, 116, 8);
  }
  // Down the sides: ingot stacks and scrap.
  for (let y = 190; y < H - 80; y += 150) {
    ingotStack(g, 30, y, 0.9, 3 + Math.floor(rng() * 3), rng);
    scrapPile(g, W - 34, y + 70, 0.7, rng);
  }
  // The slag gutter along the bottom.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(0, H - 24, W, 24);
  for (let x = 0; x < W; x += 14) { g.fillStyle(((x / 14) | 0) % 2 ? BRICK : dim(BRICK, 0.15), 1); g.fillRect(x, H - 24, 12, 5); }
  g.fillStyle(HEAT_RED, 0.7); g.fillRect(0, H - 17, W, 10);
  for (let x = 0; x < W; x += 24) { g.fillStyle(SLAG, 0.9); g.fillEllipse(x + rng() * 12, H - 12, 13, 5); }
  // Ochre moulding sand spilled at the corners.
  for (const [x, y] of [[90, H - 60], [W - 120, 150]] as [number, number][]) {
    for (let i = 0; i < 30; i++) { g.fillStyle(OCHRE_DARK, 0.5); g.fillCircle(x + (rng() - 0.5) * 80, y + (rng() - 0.5) * 30, 2 + rng() * 3); }
  }
  g.fillStyle(IRON_DARK, 0.4); g.fillRect(0, 112, W, 3);
};
