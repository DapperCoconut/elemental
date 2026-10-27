import Phaser from 'phaser';
import type { ArenaFloor } from '../../../../IslesTypes';
import { lit } from '../../../../art/IsleArt';
import { cliffLip, cloudSea, combedTurf, grainSack, kitePost, millstone, sails, towerMill } from './art';
import {
  CLOUD, CLOUD_SHADE, FLAG, FLAG_DARK, FLAG_LIT, GRAIN, KITE_COLORS, SKY, SKY_DEEP, SKY_LIT, TURF_GOLD,
} from './palette';

/**
 * The fight floor for every Galeward encounter: the threshing floor on the shoulder. Up under
 * the HUD is the sky with the mill row standing on the skyline, sails stopped mid-turn; the yard
 * itself is wind-combed turf round a great ring of threshing flags; along the bottom the turf
 * breaks off into the cloud sea. Grain is blown into drifts against the east side of everything.
 * The middle is left open — the vane, the kites, the sails, the bottles and the vents bring
 * their own.
 */
export const GALEWARD_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // The sky and the mill row on the skyline, mostly under the HUD.
  g.fillStyle(SKY_DEEP, 1); g.fillRect(0, 0, W, 104);
  g.fillStyle(SKY, 1); g.fillRect(0, 30, W, 74);
  g.fillStyle(SKY_LIT, 0.8); g.fillRect(0, 70, W, 34);
  for (let i = 0; i < 10; i++) { g.fillStyle(CLOUD, 0.7); g.fillEllipse(rng() * W, 20 + rng() * 40, 80 + rng() * 120, 16 + rng() * 12); }
  // The yard: turf.
  combedTurf(g, { x: 0, y: 96, w: W, h: H - 96 }, rng);
  // The skyline ridge with small mills on it.
  g.fillStyle(0x6d8659, 1);
  g.fillPoints([[0, 108], [0, 92], [160, 84], [420, 90], [700, 82], [W, 90], [W, 108]].map(([x, y]) => new Phaser.Geom.Point(x, y)), true, true);
  for (let i = 0; i < 6; i++) {
    const x = 80 + i * 165 + rng() * 30;
    const hub = towerMill(g, x, 104, 0.32, rng);
    sails(g, hub, 0.2 + i * 0.5, 0.55);
  }
  // The threshing ring: flags in concentric courses, chaff swept into the joints.
  const cx = W / 2, cy = (H + 100) / 2 + 10;
  g.fillStyle(FLAG_DARK, 1); g.fillEllipse(cx, cy, 640, 400);
  for (let ring = 0; ring < 5; ring++) {
    const r0 = 60 + ring * 52;
    const n = 10 + ring * 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + ring * 0.2, a1 = ((i + 1) / n) * Math.PI * 2 + ring * 0.2 - 0.03;
      const c = lit(FLAG, (rng() - 0.5) * 0.12);
      g.fillStyle(c, 1);
      g.beginPath();
      g.moveTo(cx + Math.cos(a0) * r0 * 1.0, cy + Math.sin(a0) * r0 * 0.62);
      for (const [a, r] of [[a1, r0], [a1, r0 + 48], [a0, r0 + 48]] as [number, number][]) g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.62);
      g.closePath(); g.fillPath();
    }
  }
  g.fillStyle(FLAG_LIT, 1); g.fillEllipse(cx, cy, 120, 74);
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, r = 30 + rng() * 280;
    g.fillStyle(GRAIN, 0.5); g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.62, 2, 1);
  }
  // Chaff drifts against the east side of the ring.
  for (let i = 0; i < 14; i++) { g.fillStyle(TURF_GOLD, 0.35); g.fillEllipse(cx + 300 + rng() * 60, cy - 140 + i * 22, 50, 10); }
  // The cliff and the cloud sea along the bottom.
  const lipY = H - 46;
  const lip = [];
  for (let x = -10; x <= W + 10; x += 60) lip.push({ x, y: lipY + Math.sin(x / 90) * 8 + rng() * 6 });
  cloudSea(g, [...lip, { x: W + 10, y: H + 10 }, { x: -10, y: H + 10 }], rng);
  cliffLip(g, lip, -1, rng);
  for (let i = 0; i < 8; i++) { g.fillStyle(CLOUD_SHADE, 0.5); g.fillEllipse(rng() * W, H - 10, 90, 20); }
  // Kite posts down both sides, ribbons in four colours; sacks and a millstone in the corners.
  for (let y = 190; y < H - 90; y += 150) {
    kitePost(g, 26, y, KITE_COLORS[(y / 150) % 4 | 0]);
    kitePost(g, W - 26, y + 70, KITE_COLORS[((y / 150) + 2) % 4 | 0]);
  }
  grainSack(g, 70, 150, 1.1); grainSack(g, 96, 160, 1.0, true); grainSack(g, 60, 172, 0.9);
  grainSack(g, W - 80, H - 76, 1.1, true); grainSack(g, W - 54, H - 70, 1);
  millstone(g, W - 90, 156, 26, false);
  millstone(g, 110, H - 70, 22, true);
};
