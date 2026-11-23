import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import { dial, gear, greenLamp, pipeRun } from './art';
import {
  BAIZE, BAIZE_DARK, BRASS, BRASS_DARK, BRASS_LIT, COPPER, IRON, IRON_DARK, IRON_LIT, LAMP_GLOW, OIL, PAVE_BLACK,
  PAVE_RED, STONE, STONE_DARK, STONE_LIT,
} from './palette';

/**
 * The fight floor for every Clockwork encounter: a workshop deck in the Works. The top edge is the
 * back wall of the shop (half under the HUD) — an iron frame of exposed wheels, a row of clocks all
 * showing the same minute, copper pipes and green lamps; the sides are black-and-red setts edged in
 * brass; the deck itself is riveted iron plate with oil stains and a faint brass inlay of minute
 * marks round the room. The middle is kept quiet — the pendulums, gears, glasses and clocks of
 * the fights bring their own.
 */
export const CLOCKWORK_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Riveted deck plates.
  g.fillStyle(IRON_DARK, 1); g.fillRect(0, 0, W, H);
  const PW = 96, PH = 64;
  for (let y = 100; y < H; y += PH) {
    for (let x = 40; x < W - 40; x += PW) {
      const k = ((x - 40) / PW + (y - 100) / PH) % 2;
      g.fillStyle(k ? IRON : dim(IRON, 0.1), 1); g.fillRect(x + 1, y + 1, PW - 2, PH - 2);
      g.fillStyle(lit(IRON, 0.12), 0.5); g.fillRect(x + 1, y + 1, PW - 2, 2);
      g.fillStyle(IRON_LIT, 0.8);
      for (const [cx, cy] of [[5, 5], [PW - 6, 5], [5, PH - 6], [PW - 6, PH - 6]]) g.fillCircle(x + cx, y + cy, 1.5);
    }
  }
  // Oil stains and a few brass filings.
  for (let i = 0; i < 16; i++) { g.fillStyle(OIL, 0.25); g.fillEllipse(80 + rng() * (W - 160), 140 + rng() * (H - 200), 30 + rng() * 60, 10 + rng() * 18); }
  for (let i = 0; i < 90; i++) { g.fillStyle(BRASS_LIT, 0.4); g.fillRect(50 + rng() * (W - 100), 110 + rng() * (H - 150), 2, 1); }
  // A brass minute-track inlaid round the room, faint.
  const cx = W / 2, cy = (H + 100) / 2;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const rx = W * 0.44, ry = (H - 100) * 0.44;
    g.lineStyle(i % 5 ? 1.5 : 3, BRASS, i % 5 ? 0.18 : 0.3);
    g.lineBetween(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cx + Math.cos(a) * (rx - (i % 5 ? 8 : 16)), cy + Math.sin(a) * (ry - (i % 5 ? 6 : 12)));
  }
  // Setts down both sides.
  for (const x0 of [0, W - 40]) {
    for (let y = 100; y < H; y += 20) {
      for (let x = x0; x < x0 + 40; x += 20) {
        g.fillStyle(((x / 20) + (y / 20)) % 2 ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x, y, 20, 20);
      }
    }
    const ex = x0 === 0 ? 38 : W - 42;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(ex, 100, 4, H - 100);
    g.fillStyle(BRASS, 1); g.fillRect(ex, 100, 2, H - 100);
  }
  // The back wall: a stone dado, an iron frame of wheels, a row of matching clocks.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 0, W, 104);
  g.fillStyle(STONE, 1); g.fillRect(0, 0, W, 96);
  for (let y = 12; y < 96; y += 16) { g.lineStyle(1, STONE_DARK, 0.4); g.lineBetween(0, y, W, y); }
  g.fillStyle(dim(IRON, 0.3), 1); g.fillRect(0, 26, W, 54);
  for (let i = 0; i < 14; i++) {
    const x = 30 + i * 70 + (i % 2) * 10, y = 52 + (i % 3) * 6;
    gear(g, x, y, 22 + (i % 3) * 6, 12 + (i % 3) * 2, i * 0.4, i % 2 ? COPPER : BRASS, 1, 4);
  }
  g.fillStyle(STONE_LIT, 1); g.fillRect(0, 88, W, 6);
  for (let i = 0; i < 6; i++) {
    const x = 80 + i * 160;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 18, 4, 36, 30);
    dial(g, x, 18, 12, 2.1, 0.62);
  }
  pipeRun(g, [{ x: 0, y: 98 }, { x: W, y: 98 }], 8);
  // Green lamps on the side setts, pools of light on the plates.
  for (const [x, y] of [[20, 230], [W - 20, 330], [20, 470], [W - 20, 560]] as [number, number][]) {
    glow(g, x + (x < W / 2 ? 30 : -30), y - 30, 60, LAMP_GLOW, 0.03, 3);
    greenLamp(g, x, y);
  }
  // A little baize-covered bench in each bottom corner, tools laid out on it.
  for (const x of [90, W - 90]) {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, H - 30, 110, 18);
    g.fillStyle(BAIZE_DARK, 1); g.fillRect(x - 50, H - 56, 100, 24);
    g.fillStyle(BAIZE, 1); g.fillRect(x - 48, H - 58, 96, 20);
    gear(g, x - 22, H - 48, 8, 9, 0.4, BRASS, 1, 3);
    dial(g, x + 18, H - 48, 7, 1.2, 4.4);
    g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 4, H - 52, x + 4, H - 42);
  }
};
