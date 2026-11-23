import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { blueprintSheet, gear, mirrorPane } from './art';
import {
  BRASS, BRASS_DARK, COPPER, FLAG, FLAG_DARK, GLASS, GLASS_LIT, IRON, IRON_DARK, IRON_LIT, LIME, LIME_DARK, LIME_LIT,
  OAK, OAK_DARK, OAK_LIT, SLURRY, SUN,
} from './palette';

/**
 * The fight floor for every Workshop encounter: the shop floor of the grinding hall, cleared. Worn
 * limestone flags with brass gauge-lines let into them, panes of noon falling through the glass
 * roof in a hard grid, the back wall a rack of finished mirrors under tall windows (half under the
 * HUD), workbenches down both sides and a slurry gutter along the bottom. The middle is left clear —
 * every champion brings their own machine.
 */
export const WORKSHOP_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Flags.
  g.fillStyle(FLAG_DARK, 1); g.fillRect(0, 0, W, H);
  const S = 80;
  for (let y = 96; y < H; y += S) {
    const off = ((y - 96) / S) % 2 ? S / 2 : 0;
    for (let x = -off; x < W; x += S) {
      const t = rng();
      g.fillStyle(t < 0.25 ? dim(FLAG, 0.05) : t > 0.85 ? lit(FLAG, 0.06) : FLAG, 1);
      g.fillRect(x + 1.5, y + 1.5, S - 3, S - 3);
      if (rng() < 0.25) { g.fillStyle(SLURRY, 0.16); g.fillEllipse(x + rng() * S, y + rng() * S, 30 + rng() * 30, 10); }
    }
  }
  // Brass gauge-lines let into the floor: a long rule down the middle and a ruler's ticks along it.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(40, H / 2 + 46, W - 80, 4);
  g.fillStyle(BRASS, 1); g.fillRect(40, H / 2 + 46, W - 80, 2);
  for (let x = 40, i = 0; x <= W - 40; x += 20, i++) {
    g.fillStyle(BRASS, 0.9); g.fillRect(x - 0.75, H / 2 + 40 - (i % 5 === 0 ? 6 : 0), 1.5, i % 5 === 0 ? 12 : 6);
  }
  g.lineStyle(2, BRASS, 0.5); g.strokeCircle(W / 2, H / 2 + 48, 120);
  g.lineStyle(1, BRASS, 0.35); g.strokeCircle(W / 2, H / 2 + 48, 126);
  // Panes of noon from the roof, in a grid, with the iron ribs' hard shadows between.
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      const x = 70 + i * 145, y = 150 + j * 150;
      g.fillStyle(SUN, 0.12); g.fillRect(x, y, 120, 120);
      g.lineStyle(3, IRON_DARK, 0.08); g.lineBetween(x + 60, y, x + 60, y + 120); g.lineBetween(x, y + 60, x + 120, y + 60);
    }
  }
  // The back wall (under the HUD): tall windows and a rack of finished mirrors.
  g.fillStyle(LIME_DARK, 1); g.fillRect(0, 0, W, 110);
  g.fillStyle(LIME, 1); g.fillRect(0, 0, W, 104);
  for (let x = 20; x < W; x += 120) {
    g.fillStyle(0xa8c6c8, 1); g.fillRect(x, 8, 80, 60);
    g.fillStyle(GLASS_LIT, 0.4); g.fillRect(x + 4, 10, 4, 54);
    g.lineStyle(2, IRON, 1); g.strokeRect(x, 8, 80, 60); g.lineBetween(x + 40, 8, x + 40, 68); g.lineBetween(x, 38, x + 80, 38);
  }
  for (let i = 0; i < 14; i++) mirrorPane(g, 40 + i * 66, 106, 30, 34, 0.2 + rng() * 0.6);
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, 104, W, 8);
  g.fillStyle(OAK_LIT, 1); g.fillRect(0, 104, W, 2);
  // Workbenches down both sides.
  for (const side of [0, 1]) {
    const x0 = side ? W - 44 : 0;
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, 112, 44, H - 112);
    g.fillStyle(OAK, 1); g.fillRect(x0 + (side ? 4 : 0), 112, 40, H - 112);
    for (let y = 130; y < H - 30; y += 36) {
      g.lineStyle(1, OAK_DARK, 0.6); g.lineBetween(x0, y, x0 + 44, y);
      const k = rng();
      if (k < 0.35) gear(g, x0 + 22, y + 16, 6 + rng() * 4, 10, rng() < 0.5 ? BRASS : COPPER, 1, rng() * 3);
      else if (k < 0.55) blueprintSheet(g, x0 + 22, y + 16, 32, 22, Math.floor(rng() * 3));
      else if (k < 0.75) { g.fillStyle(GLASS, 0.8); g.fillCircle(x0 + 22, y + 16, 8); g.fillStyle(GLASS_LIT, 0.8); g.fillCircle(x0 + 19, y + 13, 2.5); }
      else { g.lineStyle(2, IRON_LIT, 1); for (let t = 0; t < 4; t++) g.lineBetween(x0 + 10 + t * 7, y + 6, x0 + 12 + t * 7, y + 28); }
    }
  }
  // The slurry gutter along the bottom.
  g.fillStyle(LIME_DARK, 1); g.fillRect(0, H - 22, W, 22);
  g.fillStyle(SLURRY, 1); g.fillRect(0, H - 16, W, 10);
  g.fillStyle(LIME_LIT, 1); g.fillRect(0, H - 22, W, 2);
  for (let x = 30; x < W; x += 90) { g.fillStyle(IRON_DARK, 1); g.fillRect(x, H - 16, 24, 10); for (let k = 0; k < 4; k++) { g.fillStyle(IRON, 1); g.fillRect(x + 2 + k * 6, H - 15, 3, 8); } }
  // Filings and a dropped gear or two.
  for (let i = 0; i < 160; i++) { g.fillStyle(rng() < 0.5 ? BRASS : IRON_LIT, 0.5); g.fillRect(60 + rng() * (W - 120), 120 + rng() * (H - 160), 1.4, 1.4); }
  for (let i = 0; i < 5; i++) gear(g, 80 + rng() * (W - 160), 140 + rng() * (H - 200), 3 + rng() * 2, 8, BRASS, 0.9, rng() * 3);
};
