import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { brassLamp, bunting, lyre, note, snowTerraces } from './art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CREAM, GRAVEL, GRAVEL_DARK, LAWN, LAWN_DARK, LAWN_LIT, NAVY, SCARLET, SCARLET_LIT,
  STONE, STONE_DARK, STONE_LIT,
} from './palette';

/**
 * The fight floor for every Brass encounter: a parade lawn on the terrace, mown in the big
 * chequer the drill-masters like (so a column keeps its dress by the squares). Along the top,
 * under the HUD, the terrace wall with its brass rail and bunting and the snowy terraces above
 * it; down the sides gravel walks with bell-shaded lamps; along the bottom a bed of scarlet
 * geraniums in a brass kerb. The middle is left open — horns, heralds, forks and bandstands
 * bring their own.
 */
export const BRASS_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // The chequered parade lawn.
  const T = 80;
  for (let y = 0; y < H; y += T) {
    for (let x = 0; x < W; x += T) {
      const k = ((x / T) + (y / T)) % 2;
      g.fillStyle(k ? LAWN : lit(LAWN, 0.06), 1); g.fillRect(x, y, T, T);
    }
  }
  for (let i = 0; i < 260; i++) {
    const x = rng() * W, y = 110 + rng() * (H - 110);
    g.fillStyle(rng() < 0.5 ? LAWN_LIT : LAWN_DARK, 0.35); g.fillRect(x, y, 1.5, 2.5);
  }
  // Faint chalk drill marks: a centre circle, the dressing lines and numbered markers.
  g.lineStyle(2, CREAM, 0.16);
  g.strokeCircle(W / 2, (H + 110) / 2, 150);
  g.lineBetween(W / 2, 120, W / 2, H - 40);
  g.lineBetween(60, (H + 110) / 2, W - 60, (H + 110) / 2);
  for (let k = 0; k < 8; k++) { g.fillStyle(CREAM, 0.22); g.fillCircle(120 + k * ((W - 240) / 7), H - 70, 4); g.fillCircle(120 + k * ((W - 240) / 7), 150, 4); }
  // Footprints of a band that drilled here this morning.
  for (let i = 0; i < 40; i++) {
    const x = 140 + (i % 20) * 34, y = 200 + Math.floor(i / 20) * 260 + (i % 2) * 8;
    g.fillStyle(dim(LAWN, 0.3), 0.25); g.fillEllipse(x, y, 7, 4);
  }
  // The top: snowy terraces above the wall, then the wall and its brass rail.
  snowTerraces(g, 0, W, 80, rng);
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, 86, W, 18);
  g.fillStyle(STONE, 1); g.fillRect(0, 84, W, 14);
  g.fillStyle(STONE_LIT, 1); g.fillRect(0, 84, W, 3);
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(0, 78, W, 78);
  g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(0, 77, W, 77);
  for (let x = 20; x < W; x += 60) { g.fillStyle(BRASS, 1); g.fillRect(x - 2, 77, 4, 8); }
  bunting(g, { x: 0, y: 80 }, { x: W / 2, y: 80 }, [SCARLET, CREAM, NAVY, BRASS], 22);
  bunting(g, { x: W / 2, y: 80 }, { x: W, y: 80 }, [SCARLET, CREAM, NAVY, BRASS], 22);
  // Gravel walks down both sides, with lamps.
  for (const x0 of [0, W - 36]) {
    g.fillStyle(GRAVEL_DARK, 1); g.fillRect(x0, 104, 36, H - 104);
    g.fillStyle(GRAVEL, 1); g.fillRect(x0 + 2, 104, 32, H - 104);
    for (let i = 0; i < 40; i++) { g.fillStyle(GRAVEL_DARK, 0.5); g.fillCircle(x0 + 4 + rng() * 28, 110 + rng() * (H - 120), 1); }
    const ex = x0 === 0 ? 36 : W - 40;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(ex, 104, 4, H - 104);
    g.fillStyle(BRASS, 1); g.fillRect(ex, 104, 3, H - 104);
  }
  for (let y = 210; y < H - 60; y += 170) { brassLamp(g, 18, y); brassLamp(g, W - 18, y + 80); }
  // Along the bottom: a bed of geraniums in a brass kerb, and a painted lyre at the middle.
  g.fillStyle(0x4a3426, 1); g.fillRect(0, H - 28, W, 28);
  for (let x = 6; x < W; x += 9) {
    g.fillStyle(LAWN_DARK, 1); g.fillCircle(x, H - 14 + (x % 3), 4);
    g.fillStyle((x / 9) % 3 < 1 ? SCARLET_LIT : SCARLET, 1); g.fillCircle(x + 1, H - 18 + (x % 4), 2.4);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillRect(0, H - 31, W, 4);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(0, H - 31, W, 1.5);
  g.fillStyle(CREAM, 0.12); g.fillCircle(W / 2, (H + 110) / 2, 46);
  lyre(g, W / 2, (H + 110) / 2 + 6, 24, BRASS, 0.3);
  // A few dropped notes of sheet music blown onto the lawn.
  for (let i = 0; i < 6; i++) {
    const x = 90 + rng() * (W - 180), y = 160 + rng() * (H - 240);
    g.fillStyle(CREAM, 0.7); g.fillRect(x - 9, y - 6, 18, 12);
    g.lineStyle(0.6, 0x2a1e14, 0.5); for (let k = 0; k < 3; k++) g.lineBetween(x - 8, y - 4 + k * 3, x + 8, y - 4 + k * 3);
    note(g, x - 2, y + 2, 1.6, 0x2a1e14, 'crotchet', 0.7);
  }
};
