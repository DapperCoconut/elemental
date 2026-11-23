import type { ArenaFloor } from '../../../../IslesTypes';
import { dim } from '../../../../art/IsleArt';
import { OBS, crackPath, glassFloor, seam, shard } from '../../../../art/PinnacleArt';
import { BONE, OCHRE, SANDSTONE, STRATA, crownMark, strataH, strataV, titheStack } from './art';

/**
 * The fighting floor of the Stone Bench: the weighing-floor at the foot of the Great Scale. Black
 * glass tiles, a quarry face of strata across the top (half under the HUD), the layers end-on down
 * both sides, stacks of tithe-stone in the corners, and the weighing rings of the Scale inlaid in
 * ochre round the middle — faint, so the six decrees can draw their own rooms over it.
 */
export const EARTH_BENCH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 64, rng);
  // The quarry face across the top.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 0, W, 112);
  strataH(g, 0, 14, W, 92, rng, 0.42, 9);
  for (const fx of [210, 690]) {
    g.lineStyle(3, OBS.glass, 1); g.lineBetween(fx, 14, fx + 18, 106);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(fx + 2, 14, fx + 20, 106);
  }
  g.fillStyle(OBS.sheen, 1); g.fillRect(0, 106, W, 6);
  g.lineStyle(1.2, OBS.edge, 0.7); g.lineBetween(0, 112, W, 112);
  // Side walls: the layers end-on.
  strataV(g, 0, 112, 30, H - 112, rng, 0.6);
  strataV(g, W - 30, 112, 30, H - 112, rng, 0.6);
  g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(30, 112, 30, H); g.lineBetween(W - 30, 112, W - 30, H);
  // An inlaid strata ribbon along the bottom.
  strataH(g, 30, H - 34, W - 60, 26, rng, 0.6);
  // The weighing rings, centred on the fighting floor.
  const cx = W / 2, cy = (112 + H) / 2 + 10;
  for (const [r, a] of [[250, 0.16], [200, 0.2], [120, 0.14]] as [number, number][]) {
    g.lineStyle(2, OCHRE, a); g.strokeEllipse(cx, cy, r * 2, r * 1.1);
  }
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.lineStyle(1, OBS.edge, 0.22);
    g.lineBetween(cx + Math.cos(a) * 200, cy + Math.sin(a) * 110, cx + Math.cos(a) * (i % 5 ? 212 : 226), cy + Math.sin(a) * (i % 5 ? 117 : 124));
  }
  crownMark(g, cx, cy, 16, OCHRE, 0.18);
  // Cracks with the King's violet in them.
  for (let i = 0; i < 6; i++) {
    const a = { x: 40 + rng() * (W - 80), y: 130 + rng() * (H - 200) };
    const b = { x: a.x + (rng() - 0.5) * 260, y: a.y + (rng() - 0.5) * 160 };
    seam(g, crackPath(a, b, rng, 9, 7), 1.1, 0.5, 0);
  }
  // Dust and chips of stone.
  for (let i = 0; i < 260; i++) {
    g.fillStyle(rng() < 0.5 ? SANDSTONE : BONE, 0.06 + rng() * 0.07);
    g.fillCircle(30 + rng() * (W - 60), 112 + rng() * (H - 150), 0.6 + rng() * 1.1);
  }
  for (let i = 0; i < 30; i++) {
    const col = STRATA[i % 7];
    const x = 40 + rng() * (W - 80), y = 120 + rng() * (H - 170);
    g.fillStyle(dim(col, 0.4), 0.9); g.fillRect(x, y, 4 + rng() * 3, 3);
    g.fillStyle(col, 0.9); g.fillRect(x, y, 4, 1.2);
  }
  // Tithe-stone stacks in the lower corners, glass shards in the upper ones.
  titheStack(g, 64, H - 44, 6, 18, rng);
  titheStack(g, 98, H - 40, 3, 14, rng);
  titheStack(g, W - 68, H - 42, 8, 19, rng);
  titheStack(g, W - 104, H - 38, 4, 14, rng);
  shard(g, 48, 150, 40, 90, 10, 0.2);
  shard(g, 72, 156, 26, 56, 6, 0.35);
  shard(g, W - 48, 152, 40, 96, -10, 0.2);
  shard(g, W - 74, 158, 26, 60, -6, 0.35);
};
