import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { O, drawBone, drawCandle, drawLily, drawSkull } from './util';

/**
 * The Ossuary Court's fighting floor: a sexton's yard between the chapels. Black garden loam,
 * raked, crossed by two paths of crushed bone that meet at a worn cross of bone-white flags in the
 * middle. Lily beds edged in knuckle-bones fill the corners, a long bed of fresh compost (raked
 * level, a marker stake at its head) runs under the east side, and along the top a bone trellis —
 * femurs lashed into a lattice — carries a white climbing rose and a row of skulls set into its
 * footing, each with a stub of candle in front of it.
 */
export const OSSUARY_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(O.loam, 1); g.fillRect(0, 0, W, H);
  // Rake lines across the loam, and darker damp patches.
  for (let y = top + 6; y < H; y += 9) {
    g.lineStyle(1, rng() < 0.5 ? O.loamDeep : O.loamLit, 0.35);
    g.lineBetween(0, y + Math.sin(y) * 2, W, y + Math.cos(y * 0.7) * 2);
  }
  for (let i = 0; i < 16; i++) {
    g.fillStyle(rng() < 0.6 ? O.loamDeep : O.loamLit, 0.3 + rng() * 0.25);
    g.fillEllipse(rng() * W, top + rng() * (H - top), 90 + rng() * 200, 30 + rng() * 70);
  }
  // Crushed-bone paths: one east–west, one north–south, meeting in the middle.
  const cx = W / 2, cy = top + (H - top) / 2;
  const path = (x: number, y: number, w: number, h: number) => {
    g.fillStyle(O.gravelDark, 1); g.fillRect(x - 4, y - 4, w + 8, h + 8);
    g.fillStyle(O.gravel, 1); g.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 60; i++) {
      g.fillStyle(rng() < 0.5 ? O.boneLit : O.boneShade, 0.5 + rng() * 0.4);
      g.fillRect(x + rng() * w, y + rng() * h, 1 + rng() * 3, 1 + rng() * 2);
    }
  };
  path(0, cy - 34, W, 68);
  path(cx - 34, top, 68, H - top);
  // The flagged cross where they meet: bone-white flags worn hollow in the middle.
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) + Math.abs(j) > 2) continue;
    const fx = cx + i * 46 - 21, fy = cy + j * 46 - 21;
    g.fillStyle(O.boneDark, 1); g.fillRect(fx - 1, fy - 1, 44, 44);
    g.fillStyle(rng() < 0.5 ? O.bone : O.boneShade, 1); g.fillRect(fx, fy, 42, 42);
    g.fillStyle(lit(O.bone, 0.4), 0.5); g.fillRect(fx, fy, 42, 3);
  }
  g.fillStyle(O.boneShade, 0.6); g.fillEllipse(cx, cy, 70, 46);
  // An inscription ring round the cross, the letters worn to dashes.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.fillStyle(O.boneDark, 0.8); g.fillRect(cx + Math.cos(a) * 130 - 2, cy + Math.sin(a) * 100 - 1, 4 + (i % 3), 2);
  }

  // Lily beds in the four corners, edged with knuckle-bones laid end to end.
  const bed = (x: number, y: number, w: number, h: number) => {
    g.fillStyle(O.loamDeep, 1); g.fillRoundedRect(x, y, w, h, 14);
    for (let k = 0; k < (w + h) * 2; k += 11) {
      let bx: number, by: number;
      if (k < w) { bx = x + k; by = y; } else if (k < w + h) { bx = x + w; by = y + (k - w); }
      else if (k < w * 2 + h) { bx = x + w - (k - w - h); by = y + h; } else { bx = x; by = y + h - (k - w * 2 - h); }
      g.fillStyle(O.boneShade, 1); g.fillEllipse(bx, by, 9, 6);
      g.fillStyle(O.bone, 1); g.fillEllipse(bx - 0.5, by - 0.5, 7, 4);
    }
    for (let i = 0; i < (w * h) / 1600; i++) {
      drawLily(g, x + 14 + rng() * (w - 28), y + 30 + rng() * (h - 36), 7 + rng() * 3, 0.6 + rng() * 0.4, (rng() - 0.5) * 0.8, 0.95);
    }
  };
  bed(26, top + 26, 170, 110);
  bed(W - 196, top + 26, 170, 110);
  bed(26, H - 140, 170, 110);
  // East: a long compost bed, freshly raked, a marker stake at its head with a verdigris tithe-tag.
  const bx = W - 200, by = H - 150;
  g.fillStyle(0x3a2a20, 1); g.fillRoundedRect(bx, by, 176, 120, 10);
  for (let i = 0; i < 18; i++) {
    g.lineStyle(2, dim(0x3a2a20, 0.4), 0.6); g.lineBetween(bx + 6, by + 8 + i * 6, bx + 170, by + 8 + i * 6);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle(rng() < 0.5 ? 0x5a4a2a : O.boneShade, 0.6); g.fillCircle(bx + 10 + rng() * 156, by + 10 + rng() * 100, 1.5 + rng() * 2);
  }
  g.fillStyle(O.timber, 1); g.fillRect(bx + 4, by - 26, 5, 30);
  g.fillStyle(O.verdigris, 1); g.fillRect(bx + 9, by - 22, 14, 9);

  // A few loose bones half-raked into the loam.
  for (let i = 0; i < 9; i++) {
    const x = 120 + rng() * (W - 240), y = top + 160 + rng() * (H - top - 260);
    if (Math.abs(x - cx) < 60 || Math.abs(y - cy) < 50) continue;
    const a = rng() * Math.PI;
    drawBone(g, x - Math.cos(a) * 12, y - Math.sin(a) * 5, x + Math.cos(a) * 12, y + Math.sin(a) * 5, 3.2, O.boneShade, 0.75);
  }

  // The trellis along the top: femurs lashed into a diamond lattice, a white rose climbing it.
  g.fillStyle(O.stoneDark, 1); g.fillRect(0, top - 44, W, 44);
  g.fillStyle(O.stone, 1); g.fillRect(0, top - 44, W, 6);
  for (let x = -30; x < W + 30; x += 44) {
    drawBone(g, x, top - 4, x + 44, top - 40, 3.4, O.bone, 1);
    drawBone(g, x + 44, top - 4, x, top - 40, 3.4, O.boneShade, 1);
  }
  for (let x = 10; x < W; x += 18) {
    g.fillStyle(O.stemDark, 1); g.fillCircle(x + rng() * 8, top - 10 - rng() * 30, 4 + rng() * 3);
    if (rng() < 0.45) { g.fillStyle(O.lily, 1); g.fillCircle(x + rng() * 8, top - 12 - rng() * 26, 3 + rng() * 2); }
  }
  // Skulls set into the trellis footing, a candle stub before each.
  for (let x = 70; x < W; x += 140) {
    drawSkull(g, x, top + 4, 9, 1, { tone: O.boneShade });
    drawCandle(g, x + 14, top + 20, 9, 4);
    g.fillStyle(O.candle, 0.6); g.fillEllipse(x + 14, top + 9, 3, 5);
  }
  // Dust of crushed bone along the bottom edge, where the yard is swept to.
  for (let x = 0; x < W; x += 30) { g.fillStyle(O.gravel, 0.35); g.fillEllipse(x + rng() * 20, H - 6, 50, 12); }
};
