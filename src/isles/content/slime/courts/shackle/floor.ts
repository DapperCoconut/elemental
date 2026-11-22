import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import { chainLinks, chainPost, draughtSeal, sagChain, tallyMarks } from './art';
import {
  IRON, IRON_DARK, IRON_LIT, LAMP, MIRE, MIRE_SCUM, MIRE_SHEEN, MUD_DARK, RUST, SLIME, STONE, STONE_DARK,
  STONE_LIT, TAR, TIMBER, TIMBER_DARK, VENOM,
} from './palette';

/**
 * The fight floor for every Shackle encounter: the exercise yard of the Owing House. Wet grey
 * flags sloping to a central drain, iron rings let into the stone where debtors are chained to
 * take the air, tally marks scratched by the ones who counted their days. Along the top, the gaol
 * wall with its barred slots (half under the HUD); down the sides, chain-posts with their chains
 * slack between them; along the bottom, a mire gutter under duckboards. The middle is left open —
 * the balls, stocks, manacles, planks and the Ledger bring their own.
 */
export const SHACKLE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Flagstones, staggered, every one a slightly different grey-green.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, W, H);
  const S = 56;
  for (let y = 96; y < H; y += S * 0.75) {
    const row = Math.round((y - 96) / (S * 0.75));
    for (let x = -(row % 2) * S * 0.5; x < W; x += S) {
      const c = mixC(STONE, rng() < 0.5 ? STONE_DARK : STONE_LIT, rng() * 0.45);
      g.fillStyle(c, 1); g.fillRect(x + 2, y + 2, S - 4, S * 0.75 - 4);
      g.fillStyle(lit(c, 0.12), 0.5); g.fillRect(x + 2, y + 2, S - 4, 2);
      if (rng() < 0.18) { g.fillStyle(SLIME, 0.25); g.fillEllipse(x + S * rng(), y + S * 0.6, 22, 6); }
      if (rng() < 0.1) { g.lineStyle(1, STONE_DARK, 0.8); g.lineBetween(x + 6, y + 8, x + S * 0.6, y + S * 0.5); }
    }
  }
  // The slope to the central drain: a darker wet sheen spreading from the middle.
  const cx = W / 2, cy = (H + 96) / 2;
  for (let i = 0; i < 6; i++) { g.fillStyle(0x000000, 0.035); g.fillEllipse(cx, cy, 520 - i * 70, 300 - i * 40); }
  g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 26);
  g.fillStyle(MIRE, 1); g.fillCircle(cx, cy, 22);
  g.lineStyle(3, IRON, 1);
  for (let k = -2; k <= 2; k++) g.lineBetween(cx + k * 8, cy - Math.sqrt(484 - (k * 8) ** 2), cx + k * 8, cy + Math.sqrt(484 - (k * 8) ** 2));
  g.lineStyle(2, IRON_LIT, 0.6); g.strokeCircle(cx, cy, 24);
  // Iron rings let into the flags, a short chain on each, and the days scratched beside them.
  const rings: [number, number][] = [[200, 230], [760, 230], [150, 470], [810, 470], [330, 560], [630, 560], [480, 180]];
  for (const [rx, ry] of rings) {
    g.fillStyle(IRON_DARK, 1); g.fillCircle(rx, ry, 5);
    g.lineStyle(3, IRON, 1); g.strokeCircle(rx + 6, ry + 3, 7);
    g.lineStyle(1.2, IRON_LIT, 0.6); g.strokeCircle(rx + 5, ry + 2, 7);
    chainLinks(g, [{ x: rx + 12, y: ry + 6 }, { x: rx + 30 + rng() * 14, y: ry + 12 + rng() * 10 }], 7, IRON, 1.4, 0.9);
    g.fillStyle(RUST, 0.25); g.fillEllipse(rx + 8, ry + 8, 34, 12);
    tallyMarks(g, rx - 34, ry + 16, 6 + Math.floor(rng() * 14), 0xdcd8c8, 0.35, 0.9);
  }
  // The gaol wall along the top: weeping stone with barred slots, a seal over the yard door.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, W, 112);
  for (let yy = 0; yy < 112; yy += 14) {
    const shift = (yy / 14) % 2 ? 18 : 0;
    for (let xx = -shift; xx < W; xx += 36) {
      g.fillStyle(mixC(STONE, 0x000000, 0.1 + rng() * 0.25), 1); g.fillRect(xx + 1, yy + 1, 34, 12);
    }
  }
  for (let x = 60; x < W; x += 120) {
    if (Math.abs(x - cx) < 70) continue;
    g.fillStyle(0x080a08, 1); g.fillRect(x - 12, 40, 24, 34);
    g.fillStyle(LAMP, 0.08); g.fillRect(x - 10, 42, 20, 10);
    g.lineStyle(2.5, IRON, 1); for (let k = 1; k < 4; k++) g.lineBetween(x - 12 + k * 6, 40, x - 12 + k * 6, 74);
    g.fillStyle(SLIME, 0.35); g.fillRect(x - 2, 74, 4, 30);
  }
  g.fillStyle(TAR, 1); g.fillRect(cx - 40, 30, 80, 82);
  g.lineStyle(2, IRON, 1); g.strokeRect(cx - 40, 30, 80, 82); g.lineBetween(cx, 30, cx, 112);
  draughtSeal(g, cx, 18, 10);
  g.fillStyle(STONE_LIT, 1); g.fillRect(0, 108, W, 6);
  g.fillStyle(dim(STONE, 0.4), 1); g.fillRect(0, 114, W, 4);
  // Chain-posts down both sides, chains slack between them.
  for (const x of [26, W - 26]) {
    let prev: [number, number] | null = null;
    for (let y = 180; y < H - 40; y += 110) {
      chainPost(g, x, y, 0.9);
      if (prev) sagChain(g, prev[0] + 6, prev[1] - 24, x + 6, y - 24, 16, 7, IRON_DARK, 1.4);
      prev = [x, y];
    }
  }
  // The mire gutter along the bottom under duckboards, gas creeping up between the boards.
  g.fillStyle(MUD_DARK, 1); g.fillRect(0, H - 34, W, 34);
  g.fillStyle(MIRE, 1); g.fillRect(0, H - 28, W, 28);
  for (let i = 0; i < 30; i++) { g.fillStyle(MIRE_SHEEN, 0.25); g.fillEllipse(rng() * W, H - 14 + (rng() - 0.5) * 18, 30 + rng() * 40, 3); }
  for (let i = 0; i < 14; i++) { g.fillStyle(MIRE_SCUM, 0.3); g.fillEllipse(rng() * W, H - 8, 12 + rng() * 14, 3); }
  for (let x = 20; x < W; x += 84) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x, H - 30, 60, 22);
    for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? TIMBER : lit(TIMBER, 0.08), 1); g.fillRect(x + 1 + k * 12, H - 29, 10, 20); }
    g.fillStyle(SLIME, 0.4); g.fillRect(x, H - 12, 60, 3);
  }
  for (let i = 0; i < 10; i++) { g.fillStyle(VENOM, 0.06); g.fillCircle(rng() * W, H - 40 - rng() * 30, 16 + rng() * 20); }
};
