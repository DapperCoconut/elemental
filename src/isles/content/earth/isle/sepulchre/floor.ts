import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, DUST, DUST_DEEP, MORTAR, SKINS, SOOT, STONE, STONE_DARK, STONE_LIT, TITHE_RED, ashlar, candle, cellFront,
  dustDrift, gravaneSeal, slabFloor, strataFace,
} from './art';

/**
 * The warden arena: a cut chamber halfway down the hold. The back wall is raw strata where the
 * cutters stopped, with a row of sealed cells let into its foot — faces at the slits — and the
 * side walls are dressed stone with a cell at intervals. The floor is laid with old grave-slabs
 * taken up from the capital, their inscriptions walked half away; tithe-blocks stand stacked
 * in the corners awaiting the lift, dust drifts against every wall, candles burn on the cell
 * sills, and the Regent's seal is cut into the middle of the floor and filled with brass.
 */
export const SEPULCHRE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(SOOT, 1); g.fillRect(0, 0, W, H);
  slabFloor(g, 0, top, W, H - top, 0x6a604e, rng);
  // The back wall: strata, then a run of sealed cells at its foot.
  strataFace(g, 0, top, W, 64, rng, 3);
  g.fillStyle(0x000000, 0.3); g.fillRect(0, top + 60, W, 6);
  for (let x = 70; x < W - 40; x += 110) {
    cellFront(g, x, top + 64, 64, 46, rng, rng() < 0.8 ? Math.floor(rng() * 40) : -1, rng() < 0.3);
  }
  // Side walls of dressed stone, a cell let into each every so often.
  for (const x0 of [0, W - 36]) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top + 66, 36, H - top - 66);
    for (let y = top + 70; y < H; y += 24) {
      g.fillStyle(mixC(STONE, STONE_DARK, rng() * 0.4), 1); g.fillRect(x0 + 3, y, 30, 21);
      g.fillStyle(lit(STONE, 0.1), 0.6); g.fillRect(x0 + 3, y, 30, 2);
    }
    for (let y = top + 200; y < H - 60; y += 190) {
      g.fillStyle(SOOT, 1); g.fillRect(x0 + 8, y, 20, 8);
      g.fillStyle(SKINS[Math.floor(rng() * SKINS.length)], 0.45); g.fillRect(x0 + 10, y + 2, 16, 4);
      g.fillStyle(0xe8e0d0, 0.8); g.fillCircle(x0 + 14, y + 4, 1.3); g.fillCircle(x0 + 22, y + 4, 1.3);
    }
  }
  // Dust drifted against the walls and in the corners.
  dustDrift(g, 36, top + 66, W - 72, 40, rng, 0.8);
  dustDrift(g, 36, top + 66, 50, H - top - 66, rng, 0.6);
  dustDrift(g, W - 86, top + 66, 50, H - top - 66, rng, 0.6);
  dustDrift(g, 36, H - 50, W - 72, 50, rng, 0.6);
  // Tithe-blocks stacked in the corners awaiting the lift, the tally on every one.
  for (const [cx, cy] of [[90, H - 40], [W - 90, H - 40], [96, top + 140], [W - 96, top + 140]] as [number, number][]) {
    for (let k = 0; k < 5; k++) ashlar(g, cx - 22 + (k % 3) * 22 + (k > 2 ? 11 : 0), cy - (k > 2 ? 20 : 0), 0.75, 1 + Math.floor(rng() * 5));
  }
  // Candles on the cell sills.
  for (let x = 70; x < W - 40; x += 220) candle(g, x + 40, top + 66, rng() * 10, 1);
  // The seal at the centre: cut into the floor, filled with brass, a ring of tally-marks round it.
  const cx = W / 2, cy = (top + H) / 2 + 20;
  g.fillStyle(dim(DUST_DEEP, 0.4), 0.7); g.fillCircle(cx, cy, 104);
  g.lineStyle(4, BRASS_DARK, 0.85); g.strokeCircle(cx, cy, 98);
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    g.lineStyle(2, TITHE_RED, 0.55);
    const x = cx + Math.cos(a) * 86, y = cy + Math.sin(a) * 86;
    g.lineBetween(x - Math.sin(a) * 6, y + Math.cos(a) * 6, x + Math.sin(a) * 6, y - Math.cos(a) * 6);
  }
  gravaneSeal(g, cx, cy, 70, BRASS_DARK, 0.9);
  gravaneSeal(g, cx, cy, 66, BRASS, 0.35);
  // Mortar spatters and a scatter of dust over everything.
  for (let i = 0; i < 30; i++) { g.fillStyle(MORTAR, 0.3); g.fillEllipse(rng() * W, top + 80 + rng() * (H - top - 90), 4 + rng() * 8, 2 + rng() * 3); }
  for (let i = 0; i < 60; i++) { g.fillStyle(DUST, 0.2); g.fillEllipse(rng() * W, top + 70 + rng() * (H - top - 70), 10 + rng() * 30, 4 + rng() * 8); }
  // The hold's weight: a dim band of shadow from the ceiling over the top of the floor.
  g.fillStyle(0x000000, 0.18); g.fillRect(0, top + 66, W, 60);
  g.fillStyle(STONE_LIT, 0.04); g.fillRect(0, (top + H) / 2, W, 4);
};
