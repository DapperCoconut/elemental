import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import { cattail, hangingSkin, markSigil, mireFlower, sedge, web } from './art';
import {
  ADDER, BRUISE, COBRA, FANG, FANG_DARK, FANG_LIT, FANG_ROOT, FEN, FEN_DEEP, FEN_LIT, MOSS, MOSS_LIT, THATCH, THATCH_DARK,
  TIMBER, TIMBER_DARK, TIMBER_LIT, VENIN_EYE, VENOM, VENOM_DARK, VIPER, WICKER, WICKER_DARK, WICKER_LIT,
} from './palette';

/**
 * The fight floor for every Fang encounter: the milkers' yard, a broad plank deck on piles over
 * the black fen. Across the top (half under the HUD) runs the back of the Milking Shed — a withy
 * wall with serpents yoked along it and the long trough glowing beneath them. Down both sides the
 * deck ends in black water: mangrove roots on the left, a great white fang on the right. Along
 * the bottom the planks give out onto sedge and cattails. The deck itself is stained green where
 * the jars slop, and someone has painted the Mark, faint, in the middle.
 */
export const FANG_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Black water under everything.
  g.fillStyle(FEN, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { g.lineStyle(1.5, FEN_LIT, 0.15); g.strokeEllipse(rng() * W, rng() * H, 40 + rng() * 80, 8 + rng() * 10); }
  // The deck: planks running left–right, between the water margins.
  const L = 58, R = W - 58, T = 104, B = H - 40;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(L - 4, T, R - L + 8, B - T + 6);
  for (let y = T; y < B; y += 16) {
    let x = L;
    while (x < R) {
      const len = 70 + rng() * 120;
      const c = rng() < 0.25 ? TIMBER_LIT : rng() < 0.4 ? dim(TIMBER, 0.12) : TIMBER;
      g.fillStyle(c, 1); g.fillRect(x, y + 1, Math.min(len, R - x) - 2, 14);
      g.fillStyle(lit(c, 0.12), 0.6); g.fillRect(x, y + 1, Math.min(len, R - x) - 2, 2);
      // Grain and two nail heads at each end.
      g.lineStyle(1, dim(c, 0.25), 0.5); g.lineBetween(x + 6, y + 8 + (rng() - 0.5) * 3, x + Math.min(len, R - x) - 10, y + 8 + (rng() - 0.5) * 3);
      g.fillStyle(0x2a2a2a, 0.8); g.fillCircle(x + 4, y + 5, 1); g.fillCircle(x + 4, y + 11, 1);
      x += len;
    }
  }
  // Moss in the joints and green slops where the jars spill.
  for (let i = 0; i < 70; i++) { g.fillStyle(MOSS, 0.35); g.fillRect(L + rng() * (R - L), T + Math.floor(rng() * ((B - T) / 16)) * 16, 4 + rng() * 10, 2); }
  for (let i = 0; i < 18; i++) {
    const x = L + 20 + rng() * (R - L - 40), y = T + 30 + rng() * (B - T - 60);
    g.fillStyle(VENOM_DARK, 0.25); g.fillEllipse(x, y, 26 + rng() * 40, 8 + rng() * 10);
    g.fillStyle(VENOM, 0.12); g.fillEllipse(x - 3, y - 1, 14 + rng() * 20, 4 + rng() * 5);
  }
  // The Mark, painted faint in the middle.
  markSigil(g, W / 2, (T + B) / 2 + 10, 34, BRUISE, 0.22);
  g.lineStyle(3, BRUISE, 0.15); g.strokeEllipse(W / 2, (T + B) / 2 + 10, 300, 170);
  // Water margins down both sides, with posts at the deck's edge.
  for (const [x0, x1] of [[0, L], [R, W]] as [number, number][]) {
    g.fillStyle(FEN_DEEP, 1); g.fillRect(x0, T, x1 - x0, H - T);
    for (let y = T + 20; y < H; y += 60) {
      g.lineStyle(1.2, FEN_LIT, 0.35); g.strokeEllipse((x0 + x1) / 2, y + rng() * 20, 30, 6);
    }
  }
  for (let y = T + 10; y < B; y += 80) {
    for (const x of [L - 2, R + 2]) {
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x, y, 7);
      g.fillStyle(TIMBER_LIT, 1); g.fillCircle(x, y - 1, 5);
      g.fillStyle(MOSS_LIT, 0.6); g.fillCircle(x + 2, y + 2, 2);
    }
  }
  // Mangrove roots arching out of the water on the left.
  for (let i = 0; i < 5; i++) {
    const y = T + 60 + i * 100;
    g.lineStyle(7, 0x2c221a, 1);
    g.beginPath(); g.arc(18, y, 30, Math.PI * 1.1, Math.PI * 1.95, false); g.strokePath();
    g.lineStyle(4, 0x4a3a2c, 1);
    g.beginPath(); g.arc(18, y - 1, 30, Math.PI * 1.1, Math.PI * 1.95, false); g.strokePath();
  }
  // A great white fang standing out of the water on the right.
  {
    const fx = W - 30, fy = H - 120;
    g.fillStyle(FEN, 1); g.fillEllipse(fx, fy + 4, 70, 16);
    g.fillStyle(FANG_DARK, 1); g.fillTriangle(fx - 22, fy, fx + 22, fy, fx - 18, fy - 150);
    g.fillStyle(FANG, 1); g.fillTriangle(fx - 20, fy, fx + 18, fy, fx - 18, fy - 146);
    g.lineStyle(4, FANG_LIT, 0.8); g.lineBetween(fx - 14, fy - 4, fx - 17, fy - 130);
    g.fillStyle(FANG_ROOT, 0.7); g.fillEllipse(fx, fy - 6, 44, 14);
    g.fillStyle(MOSS, 0.8); g.fillCircle(fx - 6, fy - 4, 6); g.fillCircle(fx + 8, fy - 8, 4);
    g.fillStyle(VENOM, 0.9); g.fillCircle(fx - 18, fy - 140, 2);
  }
  // The back of the Milking Shed across the top: withy wall, yoked serpents, the glowing trough.
  g.fillStyle(WICKER_DARK, 1); g.fillRect(0, 0, W, T);
  for (let row = 0; row < T / 6; row++) {
    for (let col = 0; col < W / 10; col++) {
      const over = (row + col) % 2 === 0;
      g.fillStyle(over ? WICKER_LIT : WICKER, over ? 0.85 : 0.7);
      g.fillRect(col * 10 + 1, row * 6 + 1, 9, 4);
    }
  }
  g.fillStyle(THATCH_DARK, 1); g.fillRect(0, 0, W, 18);
  g.fillStyle(THATCH, 1); g.fillRect(0, 0, W, 12);
  for (let i = 0; i < W / 8; i++) { g.lineStyle(1.5, THATCH_DARK, 1); g.lineBetween(i * 8, 12, i * 8 + (rng() - 0.5) * 3, 18 + rng() * 6); }
  const skins = [ADDER, VIPER, COBRA];
  for (let i = 0; i < 12; i++) {
    const x = 50 + i * ((W - 100) / 11);
    const c = skins[i % 3];
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12, 26, 4, 64); g.fillRect(x + 8, 26, 4, 64);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 14, 32, 28, 5);
    g.lineStyle(5, dim(c, 0.3), 1); g.lineBetween(x + 2, 24, x + 4, 30);
    g.fillStyle(c, 1); g.fillEllipse(x, 44, 10, 12);
    g.fillStyle(VENIN_EYE, 1); g.fillCircle(x - 2.5, 42, 1); g.fillCircle(x + 2.5, 42, 1);
    g.fillStyle(FANG_LIT, 1); g.fillTriangle(x - 3, 49, x - 1.5, 49, x - 2.2, 54); g.fillTriangle(x + 1.5, 49, x + 3, 49, x + 2.2, 54);
    g.lineStyle(1.5, VENOM, 0.8); g.lineBetween(x, 56, x, 82);
    if (i % 4 === 1) hangingSkin(g, x + 22, 20, 30, i);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 82, W, 14);
  g.fillStyle(VENOM_DARK, 1); g.fillRect(0, 85, W, 7);
  g.fillStyle(VENOM, 0.75); g.fillRect(0, 85, W, 3);
  glow(g, W / 2, 88, W * 0.4, VENOM, 0.02, 3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 96, W, 8);
  g.fillStyle(TIMBER, 1); g.fillRect(0, 96, W, 4);
  for (let i = 0; i < 4; i++) web(g, 120 + i * 240, 30, 14, 0.35, 6);
  // The deck's far edge at the bottom: planks give out onto sedge, cattails and mire-flowers.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(L - 4, B, R - L + 8, 6);
  g.fillStyle(0x2f3d1c, 1); g.fillRect(0, B + 6, W, H - B - 6);
  for (let i = 0; i < 46; i++) {
    const x = rng() * W, y = B + 14 + rng() * (H - B - 14);
    const r = rng();
    if (r < 0.6) sedge(g, x, y, 0.8, rng);
    else if (r < 0.85) cattail(g, x, y, 18 + rng() * 10, (rng() - 0.5) * 6);
    else mireFlower(g, x, y, 0.9);
  }
};
