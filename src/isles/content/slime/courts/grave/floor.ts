import type { ArenaFloor } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';
import { graveLamp, headstone, mangrove, peatGround, railing, sedgeTuft, slabWalk, type StoneKind } from './art';
import { BRUISE, BRUISE_DARK, LAMP, MIRE, MIRE_DEEP, MIRE_SHEEN, MOSS, MOSS_DARK, PEAT_DARK, SLAB_DARK, WISP } from './palette';

/**
 * The fight floor for every Grave Court encounter: a plot of churchyard on the edge of the mire.
 * Along the top (half under the HUD) a black iron railing in front of a row of old stones going
 * under at a slant, a mangrove leaning over them; down each side a ditch of black water where the
 * rows have already sunk; along the bottom a strip of the Slab Walk with a lamp at each end. The
 * middle is open peat — the graves, bells, coffins and stones bring their own.
 */
export const GRAVE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // The bruise-violet dusk behind the top railing.
  g.fillStyle(BRUISE_DARK, 1); g.fillRect(0, 0, W, 110);
  g.fillStyle(BRUISE, 0.4); g.fillRect(0, 50, W, 40);
  peatGround(g, { x: 0, y: 96, w: W, h: H - 96 }, rng);
  // Darker toward the edges, as if the light gave up.
  for (let i = 0; i < 5; i++) { g.lineStyle(36, PEAT_DARK, 0.06); g.strokeRect(i * 16, 96 + i * 16, W - i * 32, H - 96 - i * 32); }
  // The top: old stones going under, a railing in front of them, a mangrove over the corner.
  mangrove(g, 70, 112, 0.9, rng);
  mangrove(g, W - 60, 108, 0.8, rng);
  const kinds: StoneKind[] = ['round', 'cross', 'angel', 'slab', 'coiled', 'obelisk', 'round', 'cross', 'slab', 'round', 'angel', 'cross'];
  for (let i = 0; i < 12; i++) {
    const x = 120 + i * 66 + (rng() - 0.5) * 12;
    headstone(g, x, 112, kinds[i], 0.85, (rng() - 0.5) * 0.4, 0.15 + rng() * 0.35, rng);
  }
  railing(g, { x: 0, y: 128 }, { x: W, y: 128 });
  // Ditches of black water down both sides, a drowned headstone shoulder in each.
  for (const x0 of [0, W - 38]) {
    g.fillStyle(PEAT_DARK, 1); g.fillRect(x0 - (x0 ? 6 : 0), 128, 44, H - 128);
    g.fillStyle(MIRE, 1); g.fillRect(x0 + 4, 132, 30, H - 136);
    g.fillStyle(MIRE_DEEP, 1); g.fillRect(x0 + 10, 140, 18, H - 150);
    g.lineStyle(1, MIRE_SHEEN, 0.6); g.lineBetween(x0 + 5, 132, x0 + 5, H - 4); g.lineBetween(x0 + 33, 132, x0 + 33, H - 4);
    for (let y = 170; y < H - 40; y += 120) {
      g.fillStyle(SLAB_DARK, 1); g.fillEllipse(x0 + 19, y + (x0 ? 60 : 0), 16, 9);
      g.fillStyle(MIRE_SHEEN, 0.6); g.fillEllipse(x0 + 19, y + 5 + (x0 ? 60 : 0), 24, 4);
    }
    for (let y = 140; y < H; y += 26) sedgeTuft(g, x0 + (x0 ? -2 : 40), y + rng() * 10, 0.8, rng);
    for (let i = 0; i < 12; i++) { g.fillStyle(rng() < 0.5 ? MOSS : MOSS_DARK, 0.6); g.fillCircle(x0 + 6 + rng() * 26, 140 + rng() * (H - 150), 1.6); }
  }
  // The bottom: a strip of the Slab Walk, a lamp at each end.
  slabWalk(g, [{ x: 40, y: H - 22 }, { x: W - 40, y: H - 22 }], 44, rng);
  graveLamp(g, 70, H - 40);
  graveLamp(g, W - 92, H - 40);
  for (const x of [80, W - 82]) { g.fillStyle(LAMP, 0.05); g.fillEllipse(x, H - 30, 110, 40); }
  // A few marsh-lights caught in the paint, low over the peat, and old bones in the turf.
  for (let i = 0; i < 6; i++) {
    const x = 120 + rng() * (W - 240), y = 180 + rng() * (H - 280);
    g.fillStyle(WISP, 0.05); g.fillCircle(x, y, 18); g.fillStyle(WISP, 0.2); g.fillCircle(x, y, 3);
  }
  for (let i = 0; i < 10; i++) {
    const x = 80 + rng() * (W - 160), y = 160 + rng() * (H - 230);
    g.fillStyle(mixC(0xe6dfc8, PEAT_DARK, 0.35), 0.8); g.fillRect(x - 4, y - 1, 8, 2); g.fillCircle(x - 4, y, 1.4); g.fillCircle(x + 4, y, 1.4);
  }
};
