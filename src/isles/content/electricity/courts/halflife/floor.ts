import type { ArenaFloor } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { glowcaps, hazardStripe, leadCask, oreTub, pitchGround, railTrack, trefoil } from './art';
import {
  AMBER, CAP, GLOW, GLOW_DEEP, GLOW_DIM, HAZARD_BLACK, IRON_DARK, LEAD, LEAD_DARK, LEAD_LIT, NIGHT, PITCH_DARK,
  SPOIL, SPOIL_DARK, SPOIL_LIT,
} from './palette';

/**
 * The fight floor for every Halflife encounter: the pit-head yard behind Leadrow. Tamped slag
 * and pitch-blende underfoot with a seam glowing through the cracks; a narrow-gauge line crossing
 * the yard on the diagonal; along the top (half under the HUD) the backs of Leadrow's houses
 * under their lead roofs with the headframe against the storm; down the sides lead casks and
 * glowcaps in the gutters; and a hazard fence along the bottom. The middle is left open — the
 * rods, spots, pellets, vent and spores bring their own.
 */
export const HALFLIFE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  pitchGround(g, { x: 0, y: 0, w: W, h: H }, rng, 1.4);
  // Tamped slag patches.
  for (let i = 0; i < 14; i++) {
    const x = rng() * W, y = 120 + rng() * (H - 160);
    g.fillStyle(SPOIL_DARK, 0.6); g.fillEllipse(x, y, 90 + rng() * 120, 40 + rng() * 50);
    g.fillStyle(SPOIL, 0.25); g.fillEllipse(x - 10, y - 6, 60 + rng() * 60, 20 + rng() * 20);
  }
  // A seam glowing up through cracks, corner to corner.
  let sx = 0, sy = 140 + rng() * 80;
  for (let k = 0; k < 18; k++) {
    const nx = sx + W / 16 + (rng() - 0.5) * 30, ny = sy + (H - 260) / 18 + (rng() - 0.5) * 50;
    g.lineStyle(6, GLOW_DEEP, 0.8); g.lineBetween(sx, sy, nx, ny);
    g.lineStyle(2, GLOW_DIM, 0.8); g.lineBetween(sx, sy, nx, ny);
    if (k % 3 === 0) glow(g, nx, ny, 26, GLOW, 0.03, 2);
    sx = nx; sy = ny;
  }
  // The narrow-gauge line on the diagonal.
  railTrack(g, [{ x: -20, y: H - 60 }, { x: W * 0.45, y: H * 0.55 }, { x: W + 20, y: 150 }]);

  // The top: the storm sky, the headframe, Leadrow's backs under their lead.
  g.fillStyle(NIGHT, 1); g.fillRect(0, 0, W, 112);
  for (let i = 0; i < 4; i++) { g.lineStyle(1.5, 0xc8d8ff, 0.12 + rng() * 0.1); const lx = rng() * W; g.lineBetween(lx, 0, lx + (rng() - 0.5) * 40, 30 + rng() * 30); }
  const hx = W * 0.72;
  for (const k of [-1, 1]) { g.lineStyle(5, IRON_DARK, 1); g.lineBetween(hx + k * 40, 112, hx + k * 12, 12); }
  for (let i = 0; i < 6; i++) { const y = 112 - i * 16; g.lineStyle(2, IRON_DARK, 1); g.lineBetween(hx - 40 + i * 5, y, hx + 40 - i * 5, y - 16); g.lineBetween(hx + 40 - i * 5, y, hx - 40 + i * 5, y - 16); }
  for (const k of [-1, 1]) { g.lineStyle(3, IRON_DARK, 1); g.strokeCircle(hx + k * 10, 10, 10); }
  for (let x = 0; x < W; x += 120) {
    if (Math.abs(x + 60 - hx) < 60) continue;
    const w = 108, top = 58 + (x % 240 ? 6 : 0);
    g.fillStyle(0x2c2622, 1); g.fillRect(x + 6, top, w, 112 - top);
    g.fillStyle(LEAD_DARK, 1); g.fillTriangle(x, top + 2, x + w + 12, top + 2, x + 6 + w / 2, top - 30);
    g.fillStyle(LEAD, 1); g.fillTriangle(x + 4, top, x + w + 8, top, x + 6 + w / 2, top - 27);
    for (let s = 1; s < 6; s++) { g.lineStyle(1, LEAD_LIT, 0.5); g.lineBetween(x + 6 + w / 2, top - 25, x + 4 + (w + 4) * (s / 6), top); }
    for (const wx of [x + 34, x + 86]) { g.fillStyle(GLOW_DIM, 1); g.fillRect(wx - 7, top + 14, 14, 12); g.fillStyle(GLOW, 0.5); g.fillRect(wx - 6, top + 15, 6, 5); }
  }
  g.fillStyle(LEAD_DARK, 1); g.fillRect(0, 108, W, 6);
  g.fillStyle(LEAD_LIT, 0.6); g.fillRect(0, 108, W, 1.5);

  // Down the sides: lead casks and glowcaps in the gutters.
  for (let y = 190; y < H - 70; y += 150) {
    leadCask(g, 24, y, 0.8, (y / 150) % 2 < 1);
    glowcaps(g, 26, y + 60, 4, rng, 0.7);
    leadCask(g, W - 24, y + 70, 0.8, (y / 150) % 2 >= 1);
    glowcaps(g, W - 28, y + 2, 4, rng, 0.7);
  }
  oreTub(g, 90, H - 70, 1, true);
  oreTub(g, W - 120, 200, 1, false);
  for (let i = 0; i < 30; i++) { g.fillStyle(CAP, 0.3 + rng() * 0.4); g.fillCircle(rng() * W, 130 + rng() * (H - 170), 1.2); }
  // A trefoil painted on the slag at the heart of the yard, nearly worn off.
  trefoil(g, W / 2, (H + 112) / 2, 60, AMBER, undefined, 0.08);

  // The bottom: a hazard kerb and a chain fence.
  hazardStripe(g, 0, H - 26, W, 8, 0.85);
  g.fillStyle(SPOIL_LIT, 0.4); g.fillRect(0, H - 18, W, 18);
  for (let x = 20; x < W; x += 64) {
    g.fillStyle(HAZARD_BLACK, 1); g.fillRect(x - 2, H - 40, 4, 22);
    g.fillStyle(AMBER, 1); g.fillRect(x - 2, H - 40, 4, 5);
    g.lineStyle(1.2, LEAD_LIT, 0.8); g.lineBetween(x, H - 34, x + 64, H - 34);
  }
  g.fillStyle(PITCH_DARK, 0.4); g.fillRect(0, H - 6, W, 6);
};
