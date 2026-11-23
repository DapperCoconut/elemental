import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow } from '../../../../art/IsleArt';
import { lanternShop, lightPool, soulLantern, waxDrips, wirePost } from './art';
import {
  CLIFF, CLIFF_DEEP, CLIFF_SHADE, CREPE, FLAG, FLAG_GROUT, IRON, LIME, LIME_DARK, LIME_LIT, SOUL, SOUL_LIT,
} from './palette';

/**
 * The fight floor for every Lantern Court encounter: a stretch of the gorge bottom. White flags in
 * the glare, worn into a lane down the middle; the north cliff along the top (half under the HUD)
 * with its carved niches; the backs of lantern shops along both sides; the wire posts on the south
 * lip; and, crossing the whole floor, the pale-blue pools of light thrown down by the lanterns on the
 * wires overhead — each with a hard little coin of shadow at its heart. The middle is left open.
 */
export const LANTERN_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Limestone flags, set in long courses.
  g.fillStyle(LIME, 1); g.fillRect(0, 0, W, H);
  for (let y = 100; y < H; y += 36) {
    const off = ((y / 36) % 2) * 30;
    for (let x = -off; x < W; x += 60 + ((x * 7 + y) % 3) * 10) {
      g.fillStyle(rng() < 0.3 ? LIME_LIT : rng() < 0.5 ? FLAG : LIME, 1); g.fillRect(x + 1, y + 1, 58, 34);
    }
    g.lineStyle(1, FLAG_GROUT, 0.6); g.lineBetween(0, y, W, y);
  }
  // The lane worn down the middle.
  g.fillStyle(LIME_LIT, 0.35); g.fillRect(W * 0.3, 100, W * 0.4, H - 100);
  for (let i = 0; i < 260; i++) { g.fillStyle(rng() < 0.5 ? LIME_DARK : LIME_LIT, 0.45); g.fillRect(rng() * W, 110 + rng() * (H - 110), 1.6, 1.6); }

  // The north cliff, with carved niches and their lights.
  g.fillStyle(CLIFF_DEEP, 1); g.fillRect(0, 0, W, 104);
  g.fillStyle(CLIFF_SHADE, 1); g.fillRect(0, 0, W, 90);
  g.fillStyle(CLIFF, 1); g.fillRect(0, 0, W, 50);
  for (let x = 30; x < W; x += 74) {
    const y = 42 + ((x * 13) % 30);
    g.fillStyle(CLIFF_DEEP, 1); g.fillRoundedRect(x - 7, y, 14, 18, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(SOUL, 0.9); g.fillCircle(x, y + 11, 3);
    g.fillStyle(SOUL_LIT, 0.35); g.fillCircle(x, y + 11, 6);
  }
  for (let i = 0; i < W / 10; i++) { g.fillStyle(rng() < 0.5 ? LIME_DARK : LIME, 1); g.fillCircle(rng() * W, 104 + rng() * 10, 1.5 + rng() * 2); }

  // Shop backs down both sides: gilt domes and drying shades, cropped at the edges.
  lanternShop(g, 30, 250, 110, 120, 0xd8505e, rng);
  lanternShop(g, W - 30, 250, 110, 120, 0x6a9fd8, rng);
  lanternShop(g, 26, 470, 100, 110, 0xe8b048, rng);
  lanternShop(g, W - 26, 470, 100, 110, 0x8a6ac8, rng);

  // The wire posts along the south lip, and the lip itself.
  g.fillStyle(LIME_DARK, 1); g.fillRect(0, H - 22, W, 22);
  g.fillStyle(LIME_LIT, 1); g.fillRect(0, H - 22, W, 4);
  for (let i = 0; i < 6; i++) wirePost(g, 110 + i * 148, H - 18, 3 + i);

  // Light pools from the wires overhead, in six long rows down the floor.
  for (let i = 0; i < 6; i++) {
    const x = 110 + i * 148 + 22;
    for (let y = 150; y < H - 40; y += 92) lightPool(g, x + Math.sin(y * 0.02 + i) * 14, y, 26);
  }
  // Wax drips where the wick-keepers stood.
  for (let i = 0; i < 6; i++) waxDrips(g, 120 + rng() * (W - 240), 160 + rng() * (H - 240), rng, 6);
  // A few dropped white ribbons, and one lantern that fell, its glass starred.
  for (let i = 0; i < 10; i++) { g.fillStyle(CREPE, 0.85); g.fillRect(60 + rng() * (W - 120), 140 + rng() * (H - 200), 7, 2); }
  const fx = W * 0.78, fy = H * 0.72;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(fx, fy + 10, 30, 8);
  soulLantern(g, fx, fy - 18, 0.9, 0, 0);
  g.lineStyle(1, dim(SOUL, 0.3), 0.7);
  for (let i = 0; i < 5; i++) { const a = i * 1.2; g.lineBetween(fx, fy - 2, fx + Math.cos(a) * 8, fy - 2 + Math.sin(a) * 8); }
  // The shadows of the wires themselves: hairlines straight down the floor, hardly there at noon.
  for (let i = 0; i < 6; i++) { g.lineStyle(1, IRON, 0.08); g.lineBetween(110 + i * 148 + 22, 104, 110 + i * 148 + 22, H - 22); }
  glow(g, W / 2, H / 2, 260, SOUL_LIT, 0.012, 3);
};
