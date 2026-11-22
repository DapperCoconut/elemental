import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { basaltColumn, boulder, cairn, dustGround, menhir, runnel, strataFace } from './art';
import { CHALK, DUST, DUST_LIT, EARTH_DARK, GRANITE, GRANITE_DARK, GRANITE_LIT, SANDSTONE } from './palette';

/**
 * The fight floor for every Stonehold encounter: the Moot Ring, the old meeting yard at the
 * crossing of the roads. The top is the mesa face in its bands with a row of standing stones in
 * front (half under the HUD); boulders sit along both sides, sunk in their skirts; a corner of the
 * basalt causeway breaks through bottom-left, the runnel cuts across bottom-right, and the middle
 * is beaten earth inside a worn ring of flagstones — where the Tithe used to be argued over, back
 * when it could be argued over.
 */
export const STONEHOLD_FLOOR: ArenaFloor = (g, W, H, rng) => {
  dustGround(g, { x: 0, y: 0, w: W, h: H }, rng);
  // The mesa face along the top.
  strataFace(g, 0, 0, W, 104, rng);
  // The worn flag ring.
  const cx = W / 2, cy = (H + 110) / 2;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const x = cx + Math.cos(a) * 300, y = cy + Math.sin(a) * 190;
    const w = 42 + rng() * 16, h = 20 + rng() * 8;
    g.fillStyle(GRANITE_DARK, 0.9); g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 2, w, h, 5);
    g.fillStyle(rng() < 0.3 ? SANDSTONE : GRANITE, 0.95); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 5);
    g.fillStyle(GRANITE_LIT, 0.3); g.fillRect(x - w / 2 + 4, y - h / 2 + 2, w - 8, 3);
    if (rng() < 0.3) { g.fillStyle(DUST, 0.6); g.fillEllipse(x + 6, y, w * 0.6, h * 0.4); }
  }
  // The speaking-stone at the centre, flat, chalked with the season's quota.
  g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(cx + 2, cy + 3, 120, 46);
  g.fillStyle(GRANITE, 1); g.fillEllipse(cx, cy, 116, 42);
  g.fillStyle(GRANITE_LIT, 0.35); g.fillEllipse(cx - 18, cy - 6, 60, 14);
  g.lineStyle(2, CHALK, 0.7);
  for (let k = 0; k < 7; k++) g.lineBetween(cx - 30 + k * 7, cy - 8, cx - 30 + k * 7, cy + 8);
  g.lineBetween(cx - 34, cy + 6, cx + 16, cy - 6);
  g.strokeCircle(cx + 32, cy, 7);
  // The standing stones along the top, in front of the face.
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * ((W - 120) / 8) + (rng() - 0.5) * 20;
    menhir(g, x, 116 + (i % 2) * 6, 34 + rng() * 10, 70 + rng() * 30, rng, (rng() - 0.5) * 8, i === 4);
  }
  // Boulders along both sides.
  for (let y = 190; y < H - 60; y += 120) {
    boulder(g, 26 + rng() * 10, y + rng() * 30, 26 + rng() * 10, rng, { sand: rng() < 0.3 });
    boulder(g, W - 26 - rng() * 10, y + 60 + rng() * 30, 26 + rng() * 10, rng, { sand: rng() < 0.3 });
  }
  // A corner of the causeway breaking through, bottom-left.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4 - r; c++) {
      const x = 60 + c * 50 + (r % 2) * 25, y = H - 30 - r * 28;
      basaltColumn(g, x, y, 26, 4 + (3 - r) * 4 + ((c * 7) % 5), 0, 0.62);
    }
  }
  // The runnel cutting across bottom-right, with a spent tithe boulder parked in it.
  runnel(g, [{ x: W * 0.55, y: H + 10 }, { x: W * 0.72, y: H - 34 }, { x: W + 20, y: H - 50 }], rng);
  boulder(g, W * 0.82, H - 34, 18, rng, { moss: false });
  cairn(g, W - 70, H - 90, 0.9, rng);
  cairn(g, 230, 150, 0.7, rng);
  // Dust drifting across the yard in long tongues.
  for (let i = 0; i < 14; i++) {
    const x = rng() * W, y = 140 + rng() * (H - 180);
    g.fillStyle(DUST_LIT, 0.12); g.fillEllipse(x, y, 140 + rng() * 120, 10 + rng() * 8);
  }
  g.fillStyle(dim(EARTH_DARK, 0.2), 0.2); g.fillRect(0, H - 8, W, 8);
  g.lineStyle(1, lit(DUST, 0.2), 0.2); g.lineBetween(0, 108, W, 108);
};
