import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, crackPath, glassFloor, seam, shard } from '../../../../art/PinnacleArt';
import { glassSteps, seaPane, stillPool, tideCurve, tideInlay, whale } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, STILL, TIDE, TIDE_LIT } from './palette';

/**
 * The fighting floor of the Tide Bench: the drowned chamber itself. Black glass tiled under foot,
 * tide-lines run into it in sea-blue, the Tide-Clock's dial inlaid faint in the middle. Along the
 * top (half under the HUD) the window-wall with the open sea and a whale going by; down the sides
 * obsidian pilasters with slots of sea between; along the bottom the glass stair going down into
 * still black water. The middle is left open — the decrees bring their own.
 */
export const WATER_BENCH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 64, rng);
  // Caustic light from the windows lying on the glass in soft bands.
  for (let i = 0; i < 14; i++) {
    g.fillStyle(TIDE, 0.035);
    g.fillEllipse(rng() * W, 130 + rng() * (H - 200), 160 + rng() * 160, 18 + rng() * 20);
  }
  // Tide-lines inlaid across the floor.
  for (let i = 0; i < 4; i++) {
    const y = 160 + i * 120 + rng() * 30;
    tideInlay(g, tideCurve({ x: -20, y }, { x: W + 20, y: y + (rng() - 0.5) * 60 }, 14 + rng() * 10, 18, rng() * 6), 0.32);
  }
  // The dial of the Tide-Clock, inlaid faint at the centre: the hours the Undertow kept.
  const cx = W / 2, cy = (110 + H) / 2;
  g.lineStyle(4, BRASS_DARK, 0.5); g.strokeEllipse(cx, cy, 420, 260);
  g.lineStyle(1.6, BRASS, 0.45); g.strokeEllipse(cx, cy - 1, 420, 260);
  g.lineStyle(1, BRASS, 0.3); g.strokeEllipse(cx, cy, 340, 210);
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    g.lineStyle(h % 3 === 0 ? 3 : 1.4, BRASS_LIT, 0.4);
    g.lineBetween(cx + Math.cos(a) * 170, cy + Math.sin(a) * 105, cx + Math.cos(a) * 210, cy + Math.sin(a) * 130);
  }
  g.fillStyle(BRASS, 0.25); g.fillCircle(cx, cy, 8);
  // Cracks where the sea leans on the floor too.
  for (let i = 0; i < 5; i++) {
    const a = { x: rng() * W, y: 140 + rng() * (H - 220) };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 220, y: a.y + (rng() - 0.5) * 120 }, rng, 9, 6), 1, 0.55);
  }
  // Puddles of still sea on the glass, each holding the window light.
  for (let i = 0; i < 6; i++) {
    const px = 60 + rng() * (W - 120), py = 160 + rng() * (H - 260), rw = 30 + rng() * 40;
    g.fillStyle(STILL, 0.6); g.fillEllipse(px, py, rw, rw * 0.36);
    g.fillStyle(TIDE_LIT, 0.25); g.fillRect(px - rw * 0.25, py - 2, rw * 0.4, 1.5);
  }
  // The window-wall along the top: panes of open sea between obsidian mullions.
  const paneW = W / 5;
  for (let i = 0; i < 5; i++) seaPane(g, i * paneW + 8, 0, paneW - 16, 104, rng, 0.35 + (i % 2) * 0.15);
  whale(g, W * 0.62, 52, 0.5, -1, 0, 0.5);
  for (let i = 0; i <= 5; i++) shard(g, i * paneW, 118, 26, 120, (i - 2.5) * 2, 0.25);
  g.fillStyle(OBS.glass, 1); g.fillRect(0, 104, W, 12);
  g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(0, 104, W, 104);
  seam(g, [{ x: 0, y: 116 }, { x: W, y: 116 }], 1, 0.35, 0, TIDE);
  // The sides: obsidian pilasters with narrow slots of sea between.
  for (const x0 of [0, W - 26]) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, 116, 26, H - 116);
    for (let y = 150; y < H - 40; y += 110) {
      seaPane(g, x0 + 6, y, 14, 64, rng, 0.6);
      g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x0 + (x0 ? 0 : 26), y - 20, x0 + (x0 ? 0 : 26), y + 84);
    }
  }
  // The glass stair going down into still black water along the foot.
  stillPool(g, 0, H - 26, W, 26, rng);
  glassSteps(g, 26, H - 44, W - 52, 6, 3, 's');
};
