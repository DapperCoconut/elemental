import type { ArenaFloor } from '../../../../IslesTypes';
import { glow, lit, mixC } from '../../../../art/IsleArt';
import { arcLamp, cable, gridCoil, puddle, sealedBox, stencilEye } from './art';
import {
  BASALT, BASALT_DARK, BOTH, BOTH_LIT, COPPER_DARK, GROUT, IRON, IRON_LIT, SLATE, SLATE_DARK, SLATE_LIT, STATE_A,
  STATE_A_DARK, STATE_B, STATE_B_DARK,
} from './palette';

/**
 * The fight floor for every Superposition encounter: the Undecided Yard behind Either Square, at
 * night under the storm. Wet slates laid in courses, the left half of the yard lit by the hot state
 * and the right by the cold, the line between them a faint violet seam. Along the top, under the
 * HUD, a row of house fronts each half one house and half another; down the sides, sealed boxes
 * stacked against the walls; arc lamps in the corners; the Grid's cables crossing overhead. The
 * middle is left open — the boxes, slits, maybes, tiles and walls bring their own.
 */
export const SUPERPOSITION_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // The slates, coursed, each a little different, rain-dark.
  g.fillStyle(GROUT, 1); g.fillRect(0, 0, W, H);
  const SH = 30;
  for (let r = 0; r * SH < H; r++) {
    const off = r % 2 ? 26 : 0;
    for (let x = -off; x < W; x += 52) {
      const v = rng();
      g.fillStyle(v < 0.3 ? SLATE_DARK : v < 0.85 ? SLATE : SLATE_LIT, 1);
      g.fillRect(x + 2, r * SH + 2, 48, SH - 3);
      if (rng() < 0.25) { g.fillStyle(0xffffff, 0.04); g.fillRect(x + 4, r * SH + 3, 20 + rng() * 20, 2); }
    }
  }
  // The two states' light on the two halves.
  g.fillStyle(STATE_A_DARK, 0.18); g.fillRect(0, 0, W / 2, H);
  g.fillStyle(STATE_B_DARK, 0.18); g.fillRect(W / 2, 0, W / 2, H);
  for (let i = 0; i < 4; i++) { g.lineStyle(14 - i * 3, BOTH, 0.03 + i * 0.02); g.lineBetween(W / 2, 100, W / 2, H); }
  // Puddles catching both lights.
  for (let i = 0; i < 9; i++) {
    const x = 80 + rng() * (W - 160), y = 150 + rng() * (H - 200);
    puddle(g, x, y, 40 + rng() * 50, x < W / 2 ? STATE_A : STATE_B);
  }
  // House fronts under the HUD: each half one house, half another.
  g.fillStyle(BASALT_DARK, 1); g.fillRect(0, 0, W, 108);
  for (let i = 0; i < 8; i++) {
    const x0 = i * 120, cx = x0 + 60;
    const leftState = i % 2 === 0;
    g.fillStyle(leftState ? 0x3e2834 : 0x2a3440, 1); g.fillRect(x0 + 4, 14, 56, 92);
    g.fillStyle(leftState ? 0x2a3440 : 0x3e2834, 1); g.fillRect(cx, 22, 56, 84);
    for (const [wx, wc] of [[x0 + 18, leftState ? STATE_A : STATE_B], [cx + 18, leftState ? STATE_B : STATE_A]] as [number, number][]) {
      const on = rng() < 0.6;
      g.fillStyle(IRON, 1); g.fillRect(wx - 2, 38, 24, 26);
      g.fillStyle(on ? mixC(wc, 0xffffff, 0.3) : 0x08080e, on ? 0.85 : 1); g.fillRect(wx, 40, 20, 22);
      if (on) glow(g, wx + 10, 51, 18, wc, 0.04, 2);
    }
    g.lineStyle(1.5, BOTH_LIT, 0.35); g.lineBetween(cx, 14, cx, 106);
    g.fillStyle(0x0c0a10, 1); g.fillRect(cx - 9, 76, 18, 30);
  }
  g.fillStyle(BASALT, 1); g.fillRect(0, 104, W, 6);
  // Cables overhead, sagging across the yard to the corner posts.
  cable(g, { x: 0, y: 116 }, { x: W, y: 130 }, 36, COPPER_DARK, 2);
  cable(g, { x: 0, y: 140 }, { x: W * 0.6, y: 104 }, 28, COPPER_DARK, 1.5);
  // Sealed boxes stacked down the sides.
  for (let y = 200; y < H - 30; y += 92) {
    sealedBox(g, 24, y, 30, y * 3);
    if ((y / 92) % 2 < 1) sealedBox(g, 26, y - 32, 26, y * 5);
    sealedBox(g, W - 46, y + 40, 30, y * 7);
  }
  // Arc lamps in the bottom corners and by the house fronts.
  arcLamp(g, 70, H - 14, 76);
  arcLamp(g, W - 90, H - 14, 76);
  // A painted ring in the middle where the yard's two lights cross, and the Grid's mark.
  const cx = W / 2, cy = (H + 110) / 2;
  g.lineStyle(3, STATE_A, 0.18); g.strokeCircle(cx - 10, cy, 150);
  g.lineStyle(3, STATE_B, 0.18); g.strokeCircle(cx + 10, cy, 150);
  gridCoil(g, cx, cy, 16, lit(COPPER_DARK, 0.2), 0.35);
  stencilEye(g, cx, cy + 190, 10, 0x0a0a10, 0.45);
  // Iron drain grates along the bottom.
  for (let x = 140; x < W - 100; x += 220) {
    g.fillStyle(IRON, 1); g.fillRect(x, H - 26, 50, 14);
    for (let k = 0; k < 6; k++) { g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(x + 4 + k * 8, H - 24, x + 4 + k * 8, H - 14); }
  }
};
