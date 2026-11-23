import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, mulberry } from '../../../../art/IsleArt';
import { caveFloor, cressPatch, hymnSheet, stalagmite, wormThread } from './art';
import {
  BRONZE, BRONZE_DARK, FLOW, FLOW_DARK, FLOW_LIT, GLOW, GLOW_SOFT, LAMP, ROCK, ROCK_DARK, ROCK_DEEP, ROCK_LIT, ROPE,
  ROPE_DARK, WET,
} from './palette';

/**
 * The fight floor for every Cavern encounter: a grotto off Echo Street. The roof comes down to
 * the HUD in a rock lip hung with glowworm threads; the sides are flowstone banks with
 * stalagmites standing in them and a rope rail strung along the left; the bottom edge is a
 * rimstone step into a shallow, glow-lit runnel. The floor is slate with poured cream flowstone,
 * puddles holding the blue light, a few hymn sheets dropped and trodden, cress in the wet.
 * The middle is left open — the plates, chimes, horns and bats bring their own.
 */
export const CAVERN_FLOOR: ArenaFloor = (g, W, H, rng) => {
  caveFloor(g, { x: 0, y: 0, w: W, h: H }, rng);
  // A paler worn ring where fights are always had, in the middle.
  g.fillStyle(FLOW, 0.06); g.fillEllipse(W / 2, (H + 100) / 2, W * 0.7, (H - 100) * 0.7);
  for (let i = 0; i < 6; i++) hymnSheet(g, 120 + rng() * (W - 240), 160 + rng() * (H - 260), rng() * 6);
  for (let i = 0; i < 5; i++) cressPatch(g, 60 + rng() * (W - 120), 140 + rng() * (H - 200), rng);

  // The roof lip, down to the HUD.
  g.fillStyle(ROCK_DEEP, 1); g.fillRect(0, 0, W, 104);
  for (let x = -20; x < W + 20; x += 34) {
    const s = 26 + rng() * 18;
    g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x, 94 - rng() * 8, s * 2, s);
    g.fillStyle(ROCK, 1); g.fillEllipse(x - 4, 88 - rng() * 8, s * 1.5, s * 0.6);
    g.fillStyle(ROCK_LIT, 0.35); g.fillEllipse(x - 10, 82, s * 0.7, 5);
  }
  for (let x = 12; x < W; x += 22 + rng() * 16) {
    const len = 8 + rng() * 22;
    g.fillStyle(FLOW_DARK, 1); g.fillTriangle(x - 4, 100, x + 4, 100, x, 100 + len);
    g.fillStyle(FLOW_LIT, 0.8); g.fillTriangle(x - 2, 100, x + 1, 100, x - 0.5, 98 + len);
  }
  for (let i = 0; i < 24; i++) wormThread(g, 20 + i * 40 + rng() * 10, 96, 10 + rng() * 24, rng() * 6, i);

  // Flowstone banks down both sides, stalagmites standing in them.
  for (const left of [true, false]) {
    const x0 = left ? 0 : W - 40;
    g.fillStyle(FLOW_DARK, 1); g.fillRect(x0, 104, 40, H - 104);
    for (let y = 110; y < H; y += 14) { g.fillStyle(rng() < 0.5 ? FLOW : FLOW_LIT, 0.4); g.fillRect(x0 + 4, y, 32, 6); }
    g.fillStyle(dim(FLOW_DARK, 0.3), 1); g.fillRect(left ? 38 : W - 42, 104, 4, H - 104);
    for (let y = 170; y < H - 40; y += 130 + rng() * 40) stalagmite(g, left ? 20 : W - 20, y, 0.7 + rng() * 0.3, mulberry(Math.floor(rng() * 1e6)));
  }
  // A rope rail on posts along the left bank, a lamp hung from it.
  for (let y = 150; y < H - 40; y += 110) {
    g.fillStyle(ROPE_DARK, 1); g.fillRect(46, y - 18, 4, 20);
    if (y + 110 < H - 40) { g.lineStyle(2, ROPE, 1); g.lineBetween(48, y - 14, 48, y + 96); }
  }
  g.fillStyle(LAMP, 0.9); g.fillRoundedRect(52, 300, 7, 10, 2);
  g.fillStyle(LAMP, 0.06); g.fillCircle(56, 305, 40);
  // A bronze listening horn hammered into the right bank.
  g.fillStyle(BRONZE_DARK, 1); g.fillTriangle(W - 40, 420, W - 40, 432, W - 62, 410);
  g.fillStyle(BRONZE, 1); g.fillEllipse(W - 64, 408, 10, 18);
  g.fillStyle(ROCK_DEEP, 1); g.fillEllipse(W - 65, 408, 5, 12);

  // The rimstone step along the bottom and the glow-lit runnel beyond it.
  g.fillStyle(WET, 1); g.fillRect(0, H - 22, W, 22);
  g.fillStyle(GLOW_SOFT, 0.2); g.fillRect(0, H - 14, W, 4);
  for (let x = 0; x < W; x += 30) {
    g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x + 15, H - 24, 34, 10);
    g.fillStyle(FLOW_LIT, 0.9); g.fillEllipse(x + 14, H - 26, 28, 5);
  }
  for (let i = 0; i < 30; i++) { g.fillStyle(GLOW, 0.5); g.fillCircle(rng() * W, H - 8 - rng() * 10, 1); }
};
