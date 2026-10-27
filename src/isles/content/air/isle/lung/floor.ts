import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import {
  BECALMED_SKINS, BRASS, BRASS_DARK, CLOUD, OAK, OAK_DARK, ROYAL, ROYAL_DEEP, SKY, SKY_DEEP,
  aerionSigil, breathBottle, cloudPuff, pipe, sailArm, sleeper,
} from './art';

/**
 * The warden arena: a working floor high in the Lung. Limed-oak boards laid across the room, worn
 * pale down the middle; in the floor two long iron gratings over the drop, the clouds sliding by a
 * mile below them; the back wall one tall window of sky-glass with the palace's sails turning past
 * it and the brass breath-mains running along its foot, a glass tube coming down from every
 * becalmed sleeper laid on the shelf beneath. Bottle racks stand at the side walls, and the
 * King's meter-and-sails sigil is set into the boards in brass at the centre.
 */
export const LUNG_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(0x2a2016, 1); g.fillRect(0, 0, W, H);

  // The boards — long planks running east-west, staggered joints, pegs at each end.
  const S = 28;
  for (let y = top; y < H; y += S) {
    let x = -rng() * 160;
    while (x < W) {
      const len = 120 + rng() * 180;
      const c = rng() < 0.5 ? OAK : dim(OAK, 0.08);
      g.fillStyle(c, 1); g.fillRect(x + 1, y + 1, len - 2, S - 2);
      g.fillStyle(lit(c, 0.1), 0.6); g.fillRect(x + 1, y + 1, len - 2, 2);
      g.fillStyle(OAK_DARK, 0.7); g.fillCircle(x + 6, y + S / 2, 1.5); g.fillCircle(x + len - 6, y + S / 2, 1.5);
      if (rng() < 0.25) { g.lineStyle(1, dim(c, 0.2), 0.6); g.lineBetween(x + 14, y + 9 + rng() * 10, x + len - 14, y + 9 + rng() * 10); }
      x += len;
    }
  }
  // Worn pale down the middle where the collectors walk the bottles through.
  g.fillStyle(0xf0e8d8, 0.12); g.fillRect(W / 2 - 120, top, 240, H - top);

  // Two gratings over the drop: iron bars, and through them the cloud-sea far below.
  for (const gy of [top + 120, H - 150]) {
    const gx = 120, gw = W - 240, gh = 48;
    g.fillStyle(SKY_DEEP, 1); g.fillRect(gx, gy, gw, gh);
    g.fillStyle(SKY, 1); g.fillRect(gx, gy + gh * 0.4, gw, gh * 0.6);
    for (let i = 0; i < 9; i++) cloudPuff(g, gx + 40 + rng() * (gw - 80), gy + 20 + rng() * 20, 0.35 + rng() * 0.2, 0.9, CLOUD);
    g.fillStyle(0x1a1e24, 1);
    for (let x = gx; x <= gx + gw; x += 16) g.fillRect(x - 2, gy, 4, gh);
    g.fillRect(gx, gy - 4, gw, 6); g.fillRect(gx, gy + gh - 2, gw, 6);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(gx - 6, gy - 6, 6, gh + 12); g.fillRect(gx + gw, gy - 6, 6, gh + 12);
  }

  // The back wall: one tall window of sky-glass, sails sweeping past outside.
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, top, W, 58);
  g.fillStyle(SKY, 1); g.fillRect(10, top + 4, W - 20, 44);
  for (let i = 0; i < 7; i++) cloudPuff(g, 40 + rng() * (W - 80), top + 30 + rng() * 10, 0.4 + rng() * 0.3, 0.85);
  sailArm(g, W * 0.3, top - 140, Math.PI * 0.32, 230, 46, 0.55);
  sailArm(g, W * 0.3, top - 140, Math.PI * 0.82, 230, 46, 0.55);
  for (let x = 10; x < W; x += 80) { g.fillStyle(OAK_DARK, 1); g.fillRect(x - 3, top + 4, 6, 44); }
  g.fillStyle(0xffffff, 0.35); for (let x = 30; x < W; x += 160) g.fillRect(x, top + 8, 4, 30);
  // The breath-mains along the foot of the window, a tube down from each sleeper on the shelf.
  pipe(g, 0, top + 64, W, top + 64, 12);
  g.fillStyle(dim(OAK_DARK, 0.2), 1); g.fillRect(0, top + 72, W, 16);
  for (let i = 0; i < 6; i++) {
    const sx = 110 + i * 150;
    sleeper(g, sx, top + 88, 0.6, i * 1.7, BECALMED_SKINS[i % BECALMED_SKINS.length], false);
    g.lineStyle(1.5, 0xc8e8f8, 0.7); g.lineBetween(sx - 14, top + 80, sx - 14, top + 70);
  }

  // Bottle racks at both side walls.
  for (const x0 of [0, W - 38]) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, top + 90, 38, H - top - 90);
    for (let y = top + 140; y < H - 20; y += 54) {
      g.fillStyle(OAK, 1); g.fillRect(x0, y, 38, 4);
      for (let k = 0; k < 2; k++) breathBottle(g, x0 + 10 + k * 18, y, 0.45, y * 0.1 + k, 1);
    }
  }

  // The King's sigil in brass in the boards, a violet ring round it set with little meter-faces.
  const cx = W / 2, cy = (top + H) / 2 + 10;
  g.fillStyle(ROYAL_DEEP, 0.55); g.fillCircle(cx, cy, 96);
  g.lineStyle(4, BRASS, 0.75); g.strokeCircle(cx, cy, 90);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const mx = cx + Math.cos(a) * 90, my = cy + Math.sin(a) * 90;
    g.fillStyle(0xf4ecd8, 0.8); g.fillCircle(mx, my, 5);
    g.lineStyle(1.2, 0x1a1a1a, 0.8); g.lineBetween(mx, my, mx + Math.cos(a * 3) * 4, my + Math.sin(a * 3) * 4);
  }
  aerionSigil(g, cx, cy, 62, BRASS, 0.85);
  aerionSigil(g, cx, cy, 58, ROYAL, 0.3);

  // The sails' shadows lying across everything from the window.
  g.fillStyle(0x000000, 0.06);
  g.fillTriangle(W * 0.3, top, W * 0.3 + 520, H, W * 0.3 + 380, H);
  g.fillTriangle(W * 0.3, top, W * 0.3 - 360, H, W * 0.3 - 240, H);
};
