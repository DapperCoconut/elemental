import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { feltHouse, footprints, handShape, HAND_COLORS, HAND_SHAPES, snowbank, wardenLantern } from './art';
import { FELT, FELT_BLUE, FELT_MOSS, FELT_OAT, FELT_PLUM, SLATE, SLUSH, SNOW, SNOW_LIT, SNOW_SHADE, TRODDEN } from './palette';

/**
 * The fight floor for every Hush encounter: a snowed-over square in the wardens' town at dusk.
 * Along the top (half under the HUD) a row of felt-roofed houses with their shutters drawn and
 * their lamps lit; down both sides shovelled snowbanks under hooded lanterns; a felt runner laid
 * in a square round the middle for the Hours; the four hand-shapes stencilled at its corners;
 * and the trodden snow in between carries everyone's identical felt-soled footprints. The middle
 * is left open — the lanterns, baffles, bell, boards and tiles bring their own.
 */
export const HUSH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Trodden snow over old cobbles.
  g.fillStyle(TRODDEN, 1); g.fillRect(0, 0, W, H);
  for (let y = 100; y < H; y += 22) {
    for (let x = ((y / 22) % 2) * 14; x < W; x += 28) {
      if (rng() < 0.55) continue;
      g.fillStyle(dim(SLATE, 0.05), 0.18); g.fillRoundedRect(x, y, 24, 18, 6);
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = rng() * W, y = 110 + rng() * (H - 110), w = 60 + rng() * 140;
    g.fillStyle(SNOW, 0.55); g.fillEllipse(x, y, w, w * 0.24);
    g.fillStyle(SNOW_LIT, 0.4); g.fillEllipse(x - w * 0.1, y - 2, w * 0.5, w * 0.08);
  }
  for (let i = 0; i < 260; i++) { g.fillStyle(SNOW_LIT, 0.8); g.fillRect(rng() * W, 100 + rng() * (H - 100), 1.3, 1.3); }
  // Slush puddles where the felt has worn through.
  for (let i = 0; i < 12; i++) {
    const x = 60 + rng() * (W - 120), y = 140 + rng() * (H - 200);
    g.fillStyle(SLUSH, 0.6); g.fillEllipse(x, y, 30 + rng() * 30, 10 + rng() * 8);
    g.fillStyle(lit(SLUSH, 0.35), 0.4); g.fillEllipse(x - 4, y - 2, 12, 3);
  }
  // The felt runner laid round the square for the Hours, stitched at its edges.
  const m = 70, top = 140;
  g.lineStyle(26, dim(FELT, 0.2), 1); g.strokeRect(m, top, W - m * 2, H - top - 50);
  g.lineStyle(22, FELT, 1); g.strokeRect(m, top, W - m * 2, H - top - 50);
  g.lineStyle(1, FELT_OAT, 0.6); g.strokeRect(m - 9, top - 9, W - m * 2 + 18, H - top - 32); g.strokeRect(m + 9, top + 9, W - m * 2 - 18, H - top - 68);
  for (let x = m; x < W - m; x += 90) { g.lineStyle(2, dim(FELT, 0.35), 0.8); g.lineBetween(x, top - 11, x, top + 11); g.lineBetween(x, H - 50 - 11, x, H - 50 + 11); }
  // The four permitted shapes stencilled at the runner's corners.
  const corners: [number, number][] = [[m, top], [W - m, top], [m, H - 50], [W - m, H - 50]];
  corners.forEach(([x, y], i) => {
    g.fillStyle(SNOW_LIT, 0.85); g.fillCircle(x, y, 24);
    handShape(g, x, y - 2, 0.9, HAND_SHAPES[i], HAND_COLORS[HAND_SHAPES[i]], 0.8);
  });
  // Felt-soled footprints crossing the square, all identical, none with a tread.
  for (let i = 0; i < 9; i++) {
    const a = { x: rng() * W, y: 130 + rng() * (H - 180) }, b = { x: rng() * W, y: 130 + rng() * (H - 180) };
    footprints(g, a, b, rng, SNOW_SHADE);
  }
  // The house row along the top, under the HUD.
  const felts = [FELT_PLUM, FELT, FELT_OAT, FELT_BLUE, FELT_MOSS, FELT_PLUM, FELT];
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 140;
    feltHouse(g, x, 112, 120, 70, { felt: felts[i], fined: i % 3 === 1, ribbon: i % 3 === 2, chimney: i % 2 === 0 }, rng);
  }
  g.fillStyle(SNOW_SHADE, 1); g.fillRect(0, 110, W, 8);
  g.fillStyle(SNOW_LIT, 1); g.fillRect(0, 108, W, 3);
  // Snowbanks and lanterns down both sides.
  for (const x0 of [0, W - 26]) {
    g.fillStyle(SNOW_SHADE, 1); g.fillRect(x0, 118, 26, H - 118);
    g.fillStyle(SNOW, 1); g.fillRect(x0 + 4, 118, 18, H - 118);
  }
  for (let y = 220; y < H - 40; y += 160) { wardenLantern(g, 30, y); wardenLantern(g, W - 48, y + 80); }
  // A low bank along the bottom.
  snowbank(g, 0, H + 6, W, 30, rng);
};
