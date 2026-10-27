import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  CANVAS, CANVAS_SHADE, CHALK, HEMP, OAK_DARK, PINE, QUEEN, RED_THREAD,
  chalkLine, clothBolts, grommet, needle, pin, rope, spool, stitches, tideMark,
} from './art';

/**
 * The Sailmaker's fighting floor — the top storey of the Great Loft, where whole sails are laid
 * out flat to be cut and sewn and where the court settles its quarrels. Long scrubbed pine
 * boards run the length of the room; across half of them lies a sail in the making, cloths
 * seamed side by side with a bolt-rope along its edge and grommets punched every hand-span;
 * chalked pattern lines and a great chalk-and-string compass arc mark where it will be cut.
 * Skylights throw pale squares of sea-light across the boards, and along the walls stand the
 * sailmakers' benches with their spools, palms and pins.
 */
export const sailmakerFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  // Boards, running east–west.
  g.fillStyle(dim(PINE, 0.35), 1); g.fillRect(0, 0, W, H);
  const bh = 22;
  for (let y = top - bh, row = 0; y < H; y += bh, row++) {
    let x = -((row * 137) % 260);
    while (x < W) {
      const len = 180 + rng() * 220;
      const c = mixC(PINE, rng() < 0.5 ? 0xffffff : 0x6a4a2a, rng() * 0.16);
      g.fillStyle(c, 1); g.fillRect(x + 1, y + 1, len - 2, bh - 2);
      g.fillStyle(lit(c, 0.12), 0.7); g.fillRect(x + 1, y + 1, len - 2, 2);
      // Grain and the odd knot.
      g.lineStyle(1, dim(c, 0.16), 0.5);
      for (let k = 0; k < 2; k++) { const gy = y + 6 + k * 7 + rng() * 3; g.lineBetween(x + 6, gy, x + len - 8, gy + (rng() - 0.5) * 3); }
      if (rng() < 0.18) { g.fillStyle(dim(c, 0.35), 0.8); g.fillEllipse(x + 20 + rng() * (len - 40), y + bh / 2, 10, 6); }
      // Nail heads at board ends.
      g.fillStyle(0x3a3a3a, 0.8); g.fillCircle(x + 5, y + 6, 1.4); g.fillCircle(x + 5, y + bh - 6, 1.4);
      x += len;
    }
  }

  // Skylight squares — pale sea-light falling across the boards.
  for (const sx of [W * 0.2, W * 0.5, W * 0.8]) {
    g.fillStyle(0xdff2f4, 0.08); g.fillRect(sx - 90, top + 30, 180, 140);
    g.fillStyle(0xdff2f4, 0.06); g.fillRect(sx - 70, top + 40, 140, 120);
    g.lineStyle(3, 0x000000, 0.05); g.lineBetween(sx, top + 30, sx, top + 170); g.lineBetween(sx - 90, top + 100, sx + 90, top + 100);
  }

  // The sail laid out across the southern half: cloths side by side, seamed in red twine.
  const sx0 = 70, sx1 = W - 70, sy0 = (H + top) / 2 - 10, sy1 = H - 46;
  g.fillStyle(0x000000, 0.16); g.fillRect(sx0 + 6, sy0 + 6, sx1 - sx0, sy1 - sy0);
  const cloths = 11;
  const clw = (sx1 - sx0) / cloths;
  for (let i = 0; i < cloths; i++) {
    const cx = sx0 + i * clw;
    g.fillStyle(i % 2 ? CANVAS : mixC(CANVAS, CANVAS_SHADE, 0.35), 0.92);
    g.fillRect(cx, sy0, clw, sy1 - sy0);
    if (i > 0) {
      stitches(g, cx - 3, sy0 + 4, cx - 3, sy1 - 4, RED_THREAD, 1.4, 5, 4, 0.85);
      stitches(g, cx + 3, sy0 + 4, cx + 3, sy1 - 4, RED_THREAD, 1.4, 5, 4, 0.85);
    }
  }
  // A tabling (doubled hem) and the bolt-rope round it.
  g.lineStyle(10, mixC(CANVAS, CANVAS_SHADE, 0.6), 0.9); g.strokeRect(sx0 + 5, sy0 + 5, sx1 - sx0 - 10, sy1 - sy0 - 10);
  rope(g, [{ x: sx0, y: sy0 }, { x: sx1, y: sy0 }, { x: sx1, y: sy1 }, { x: sx0, y: sy1 }, { x: sx0, y: sy0 }], 4, HEMP, 0.95);
  for (let x = sx0 + 24; x < sx1 - 10; x += 46) { grommet(g, x, sy0 + 12, 3.2); grommet(g, x, sy1 - 12, 3.2); }
  // A reef band with its points.
  const ry = sy0 + (sy1 - sy0) * 0.3;
  g.lineStyle(6, CANVAS_SHADE, 0.7); g.lineBetween(sx0 + 10, ry, sx1 - 10, ry);
  for (let x = sx0 + 30; x < sx1 - 20; x += 38) { g.lineStyle(1.4, CHALK, 0.9); g.lineBetween(x, ry - 6, x - 3, ry + 10); }

  // Chalk: a cutting line diagonal across the cloth, and a compass arc struck from a pin.
  chalkLine(g, sx0 + 30, sy1 - 20, sx1 - 120, sy0 + 20, 0.75);
  const ax = sx1 - 60, ay = sy1 - 30;
  g.lineStyle(1, HEMP, 0.6); g.lineBetween(ax, ay, ax - 260, ay - 150);
  for (let a = Math.PI * 1.05; a < Math.PI * 1.45; a += 0.045) {
    const r = 300;
    chalkLine(g, ax + Math.cos(a) * r, ay + Math.sin(a) * r, ax + Math.cos(a + 0.03) * r, ay + Math.sin(a + 0.03) * r, 0.7);
  }
  pin(g, ax, ay, RED_THREAD, 1.3);

  // The Queen's mark, chalked on the sail where the tithe-clerk will stamp it.
  tideMark(g, W / 2, sy0 + (sy1 - sy0) * 0.62, 28, dim(QUEEN, 0.1), 0.45);

  // Benches along the north wall: spools, bolts, a palm, needles.
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, top - 4, W, 18);
  g.fillStyle(dim(PINE, 0.2), 1); g.fillRect(0, top - 2, W, 6);
  const threads = [RED_THREAD, 0xe2b64a, QUEEN, CANVAS_SHADE, 0x3a4a7a, HEMP];
  for (let x = 40; x < W - 30; x += 70) {
    spool(g, x + (rng() - 0.5) * 10, top + 12, 5, threads[Math.floor(rng() * threads.length)]);
    if (rng() < 0.6) needle(g, x + 28, top + 8, 0.15 + rng() * 0.3, 20, 0.95);
  }
  clothBolts(g, 70, top + 70, [CANVAS, CANVAS_SHADE, 0xa8583a, CANVAS, QUEEN, CANVAS_SHADE]);
  clothBolts(g, W - 70, top + 70, [CANVAS_SHADE, CANVAS, CANVAS, 0x3a4a7a, CANVAS_SHADE, 0xa8583a]);

  // Scattered pins and snipped threads on the open boards.
  for (let i = 0; i < 26; i++) {
    const x = 40 + rng() * (W - 80), y = top + 30 + rng() * (H - top - 60);
    if (rng() < 0.4) pin(g, x, y, [RED_THREAD, 0xe2b64a, QUEEN][i % 3], 0.8, 0.9);
    else { g.lineStyle(1, [RED_THREAD, CHALK, HEMP][i % 3], 0.7); g.lineBetween(x, y, x + (rng() - 0.5) * 22, y + (rng() - 0.5) * 12); }
  }
};
