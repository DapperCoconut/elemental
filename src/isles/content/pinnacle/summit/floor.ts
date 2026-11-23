import type { ArenaFloor } from '../../../IslesTypes';
import { OBS, crackPath, glassFloor, seam } from '../../../art/PinnacleArt';
import { BENCHES } from '../spec';
import { niche } from './art';

/**
 * The King's floor: the head of the Crownless Hall as a fighting floor — polished black glass, the
 * runner down the middle, the seam that carries the heartbeat, a row of empty niches along the
 * back wall and the side walls dark. Deliberately plain: each of the King's three acts paints its
 * own world over it, and this is what shows before they do.
 */
export const SUMMIT_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(OBS.sky, 1); g.fillRect(0, 0, W, H);
  glassFloor(g, 0, top, W, H - top, 64, rng);
  // The runner, edged in pale lines, and its long reflection.
  const cx = W / 2;
  g.fillStyle(0x050309, 0.7); g.fillRect(cx - 90, top, 180, H - top);
  g.lineStyle(1.5, OBS.edge, 0.4); g.lineBetween(cx - 90, top, cx - 90, H); g.lineBetween(cx + 90, top, cx + 90, H);
  g.fillStyle(OBS.sheen, 0.1);
  g.fillTriangle(cx - 70, top, cx - 40, top, cx + 30, H);
  // The seam down the middle.
  const spine = [];
  for (let y = top + 40; y <= H; y += 50) spine.push({ x: cx + Math.sin(y * 0.03) * 5, y });
  seam(g, spine, 1.4, 0.6);
  // The back wall: a band of glass with niches standing against it, ten benches' colours at their feet.
  g.fillStyle(OBS.glass, 1); g.fillRect(0, top, W, 60);
  g.lineStyle(2, OBS.edge, 0.5); g.lineBetween(0, top + 60, W, top + 60);
  for (let i = 0; i < 12; i++) {
    const x = 40 + i * ((W - 80) / 11);
    if (Math.abs(x - cx) < 110) continue;
    niche(g, x, top + 84, 84, BENCHES[i % BENCHES.length].color, rng);
  }
  // The side walls, and cracks through them — gold toward the top, where the star is nearest.
  for (const x0 of [0, W - 34]) {
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, top, 34, H - top);
    g.lineStyle(2, OBS.edge, 0.4); g.lineBetween(x0 === 0 ? 34 : x0, top, x0 === 0 ? 34 : x0, H);
  }
  for (let i = 0; i < 8; i++) {
    const x = 60 + rng() * (W - 120), y = top + 90 + rng() * (H - top - 140);
    seam(g, crackPath({ x, y }, { x: x + (rng() - 0.5) * 220, y: y + (rng() - 0.5) * 140 }, rng, 10, 6), 1.2, 0.6, 0, y < H * 0.45 ? OBS.star : OBS.seam);
  }
  // Rings let into the floor round the place the throne would stand.
  for (let i = 1; i <= 3; i++) { g.lineStyle(1, OBS.seam, 0.08 + i * 0.03); g.strokeEllipse(cx, top + 120, 140 + i * 90, 50 + i * 30); }
};
