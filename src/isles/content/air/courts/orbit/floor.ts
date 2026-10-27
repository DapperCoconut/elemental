import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, dim } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CLIFF, CLIFF_DARK, CLOUD, GROUT, IRON, LODE_SHEEN, PAVE, PAVE_LIT, SKY, SKY_DEEP,
  SKY_PALE, STONE, STONE_DARK, STONE_LIT, TURF, TURF_DARK, VERD,
} from './palette';
import { chain, cloudPuff, filings, lodestone } from './orbitArt';

/**
 * The Orbit Court's fighting floor — a round paved dial on the lip of an islet, the kind of
 * yard every islet keeps for setting its clocks by the moon.
 *
 * Grey-violet flagstones laid in rings round a brass centre-boss, brass orbit-lines inlaid
 * between the rings with little planet-studs on them, the twelve hour-marks round the rim. The
 * bottom edge of the islet breaks off into open sky — cliff face, then cloud-sea a mile down —
 * and in the top-right corner the black moon hangs low over the yard on its chains. Every iron
 * filing in the cracks is combed toward it. The middle stays plain so the five rules can draw
 * their orbits, rings and holes over it.
 */
export const ORBIT_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  const cx = W / 2, cy = (top + H) / 2 + 8;
  const moon = { x: W - 60, y: top - 50 };
  // Sky beneath everything (shows past the broken lip).
  g.fillStyle(SKY, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { g.fillStyle(i % 2 ? SKY_PALE : SKY_DEEP, 0.18); g.fillRect(0, H - 60 + i * 10, W, 10); }
  // The islet's paving: stone base, then rings of flags.
  g.fillStyle(STONE_DARK, 1); g.fillRect(0, top - 10, W, H - top - 20);
  g.fillStyle(STONE, 1); g.fillRect(0, top - 10, W, H - top - 36);
  for (let ring = 0; ring < 9; ring++) {
    const r0 = 40 + ring * 58, r1 = r0 + 56;
    const n = 8 + ring * 6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + ring * 0.21, a1 = ((i + 1) / n) * Math.PI * 2 + ring * 0.21 - 0.02;
      const c = rng() < 0.5 ? PAVE : rng() < 0.5 ? PAVE_LIT : dim(PAVE, 0.08);
      g.fillStyle(c, 0.9);
      g.beginPath();
      for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * (k / 4); g.lineTo(cx + Math.cos(a) * (r0 + 2) * 1.35, cy + Math.sin(a) * (r0 + 2) * 0.82); }
      for (let k = 4; k >= 0; k--) { const a = a0 + (a1 - a0) * (k / 4); g.lineTo(cx + Math.cos(a) * (r1 - 2) * 1.35, cy + Math.sin(a) * (r1 - 2) * 0.82); }
      g.closePath(); g.fillPath();
    }
    g.lineStyle(2, GROUT, 0.7); g.strokeEllipse(cx, cy, r1 * 2.7, r1 * 1.64);
  }
  // Brass orbit-lines between alternate rings, with planet-studs riding on them.
  for (let ring = 1; ring < 9; ring += 2) {
    const r = 40 + ring * 58;
    g.lineStyle(3, BRASS_DARK, 0.8); g.strokeEllipse(cx, cy + 1, r * 2.7, r * 1.64);
    g.lineStyle(1.5, BRASS_LIT, 0.55); g.strokeEllipse(cx, cy, r * 2.7, r * 1.64);
    const a = rng() * Math.PI * 2;
    g.fillStyle(BRASS, 1); g.fillCircle(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 0.82, 5);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(cx + Math.cos(a) * r * 1.35 - 1.5, cy + Math.sin(a) * r * 0.82 - 1.5, 2);
  }
  // Hour-marks round the rim.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * 470, y = cy + Math.sin(a) * 262;
    g.fillStyle(BRASS_DARK, 0.9); g.fillRect(x - 6, y - 3, 12, 6);
    g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x - 5, y - 3, 10, 2);
  }
  // The centre-boss: a brass sunburst set in the stone, worn smooth.
  g.fillStyle(BRASS_DARK, 0.9); g.fillCircle(cx, cy, 30);
  g.fillStyle(BRASS, 0.9); g.fillCircle(cx, cy, 26);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineStyle(2, BRASS_LIT, 0.7); g.lineBetween(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24);
  }
  // Turf in the corners and weathering on the flags.
  for (let i = 0; i < 14; i++) {
    const x = rng() < 0.5 ? rng() * 140 : W - rng() * 140;
    const y = top + rng() * (H - top - 80);
    blob(g, x, y, 20 + rng() * 40, 10 + rng() * 18, rng() < 0.5 ? TURF : TURF_DARK, 0.7, rng, 8);
  }
  for (let i = 0; i < 30; i++) blob(g, rng() * W, top + rng() * (H - top - 60), 20 + rng() * 50, 8 + rng() * 20, rng() < 0.6 ? STONE_LIT : VERD, 0.12, rng, 7);
  // Iron filings in every crack, combed toward the moon.
  for (let i = 0; i < 160; i++) {
    const x = rng() * W, y = top + rng() * (H - top - 50);
    filings(g, x, y, Math.atan2(moon.y - y, moon.x - x), 4 + rng() * 5, 0.35 + rng() * 0.3);
  }
  // The broken lip along the bottom: cliff face, then cloud.
  const lipY = H - 46;
  g.fillStyle(CLIFF, 1);
  g.beginPath(); g.moveTo(0, lipY);
  for (let x = 0; x <= W; x += 24) g.lineTo(x, lipY + 8 + rng() * 22);
  g.lineTo(W, lipY + 4); g.closePath(); g.fillPath();
  for (let x = 0; x < W; x += 30) { g.lineStyle(2, CLIFF_DARK, 0.6); g.lineBetween(x + rng() * 10, lipY + 6, x + rng() * 10, lipY + 20 + rng() * 10); }
  for (let i = 0; i < 9; i++) cloudPuff(g, (i + 0.5) * (W / 9) + (rng() - 0.5) * 40, H - 6 + rng() * 6, 22 + rng() * 12, 0.85, i);
  // Tether bollards in the top corners with chains rising out of frame toward the moon.
  for (const bx of [36, W - 160]) {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(bx, top + 30, 34, 10);
    g.fillStyle(IRON, 1); g.fillRoundedRect(bx - 10, top + 2, 20, 28, 5);
    g.fillStyle(BRASS, 1); g.fillRect(bx - 11, top + 6, 22, 4);
    chain(g, { x: bx, y: top + 4 }, { x: moon.x - 30, y: moon.y + 40 }, 18, 0.9, 10);
  }
  // The moon itself, low over the top-right corner — mostly off the top edge.
  lodestone(g, moon.x, moon.y, 92, 0, 1);
  g.fillStyle(LODE_SHEEN, 0.06); g.fillCircle(moon.x, moon.y, 260);
  g.fillStyle(CLOUD, 0.05); g.fillRect(0, top, W, 6);
};
