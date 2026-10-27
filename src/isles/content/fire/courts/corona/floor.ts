import Phaser from 'phaser';
import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GLASS_CRACK, GLASS_DEEP, GLASS_GLINT, GLASS_SAND, GLASS_SAND_DARK, GLASS_SHEEN,
  PLASMA, PLASMA_DEEP, PLASMA_LIT, SUN, SUN_CORE,
} from './palette';

/**
 * The Corona Court's fighting floor — a test-pad on the plateau, under the captive sun.
 *
 * Fused glass in big plates (each with its own sheen and a specular slash), crack networks, a
 * brass survey rail round the edge with degree ticks, two plasma conduits running in glass-lidded
 * grooves down the flanks, the sun's reflection pooled at the top of the pad (it hangs just
 * beyond the HUD), and a low, faint orrery inlay in the middle that the gimmicks paint over.
 */
export const CORONA_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  // Base: amber sand gone to glaze, darker toward the sun.
  g.fillStyle(GLASS_SAND, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) {
    g.fillStyle(mixC(GLASS_DEEP, GLASS_SAND, i / 12), 0.12);
    g.fillEllipse(W / 2, top - 20, W * (1.6 - i * 0.1), H * (1.3 - i * 0.08));
  }
  // Plates of glass.
  for (let i = 0; i < 110; i++) {
    const x = rng() * W, y = top + rng() * (H - top);
    const s = 26 + rng() * 44;
    const n = 5 + Math.floor(rng() * 3);
    const rot = rng() * Math.PI;
    const pts: Phaser.Geom.Point[] = [];
    for (let k = 0; k < n; k++) {
      const a = rot + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const r = s * (0.7 + rng() * 0.4);
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62));
    }
    g.fillStyle(mixC(GLASS_SHEEN, GLASS_SAND, rng() * 0.6), 0.2 + rng() * 0.2); g.fillPoints(pts, true, true);
    g.lineStyle(1, GLASS_CRACK, 0.45); g.strokePoints(pts, true, true);
    g.lineStyle(1.5, GLASS_GLINT, 0.12 + rng() * 0.18);
    g.lineBetween(x - s * 0.25, y - s * 0.1, x + s * 0.15, y - s * 0.3);
  }
  // Cracks.
  for (let i = 0; i < 26; i++) {
    let x = rng() * W, y = top + rng() * (H - top), a = rng() * Math.PI * 2;
    for (let s = 0; s < 6; s++) {
      const l = 14 + rng() * 22;
      const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l * 0.7;
      g.lineStyle(1.4, GLASS_CRACK, 0.6); g.lineBetween(x, y, nx, ny);
      g.lineStyle(1, GLASS_GLINT, 0.14); g.lineBetween(x, y - 1.5, nx, ny - 1.5);
      x = nx; y = ny; a += (rng() - 0.5) * 1;
    }
  }
  // The sun's reflection, pooled at the top of the pad.
  for (let k = 6; k >= 1; k--) { g.fillStyle(SUN, 0.04); g.fillEllipse(W / 2, top + 8, 160 + k * 70, 30 + k * 14); }
  g.fillStyle(SUN_CORE, 0.22); g.fillEllipse(W / 2, top + 8, 130, 18);
  // Faint orrery inlay in the middle — low contrast, the gimmicks draw over it.
  const cx = W / 2, cy = (top + H) / 2 + 10;
  for (let k = 1; k <= 3; k++) {
    const r = 70 + k * 58;
    g.lineStyle(3, BRASS_DARK, 0.35); g.strokeEllipse(cx, cy + 1, r * 2, r * 1.25);
    g.lineStyle(1, BRASS_LIT, 0.3); g.strokeEllipse(cx, cy, r * 2, r * 1.25);
    const a = rng() * Math.PI * 2;
    g.fillStyle(BRASS, 0.45); g.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.625, 4);
  }
  g.fillStyle(dim(SUN, 0.3), 0.4); g.fillCircle(cx, cy, 10);
  // Conduits down both flanks, in glass-lidded grooves.
  for (const x of [44, W - 44]) {
    g.fillStyle(GLASS_CRACK, 0.8); g.fillRect(x - 10, top, 20, H - top);
    g.fillStyle(dim(PLASMA_DEEP, 0.4), 1); g.fillRect(x - 7, top, 14, H - top);
    g.fillStyle(PLASMA_DEEP, 1); g.fillRect(x - 3.5, top, 7, H - top);
    g.fillStyle(PLASMA, 0.8); g.fillRect(x - 1.2, top, 2.4, H - top);
    for (let y = top + 20; y < H; y += 60) {
      g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 13, y, 26, 5);
      g.fillStyle(BRASS_LIT, 0.8); g.fillRect(x - 12, y, 24, 1.5);
      g.fillStyle(PLASMA_LIT, 0.5); g.fillCircle(x, y + 30, 2);
    }
  }
  // Brass survey rail round the pad with degree ticks.
  g.lineStyle(6, BRASS_DARK, 1); g.strokeRect(14, top + 4, W - 28, H - top - 18);
  g.lineStyle(2, BRASS, 1); g.strokeRect(14, top + 3, W - 28, H - top - 18);
  g.lineStyle(1, BRASS_LIT, 0.7); g.strokeRect(17, top + 6, W - 34, H - top - 24);
  for (let x = 30; x < W - 20; x += 24) {
    const big = Math.round(x / 24) % 5 === 0;
    g.lineStyle(big ? 2 : 1, BRASS_LIT, 0.7);
    g.lineBetween(x, H - 15, x, H - 15 - (big ? 9 : 5));
    g.lineBetween(x, top + 4, x, top + 4 + (big ? 9 : 5));
  }
  // Sand drifted against the rail, unfused.
  for (let i = 0; i < 40; i++) {
    const side = rng();
    const x = side < 0.5 ? 20 + rng() * (W - 40) : (rng() < 0.5 ? 20 : W - 20);
    const y = side < 0.5 ? H - 18 - rng() * 8 : top + rng() * (H - top);
    g.fillStyle(lit(GLASS_SAND, 0.15), 0.5); g.fillEllipse(x, y, 30 + rng() * 40, 7 + rng() * 6);
  }
  g.fillStyle(GLASS_SAND_DARK, 0.6); g.fillRect(0, H - 8, W, 8);
};
