import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import { lampPost, letter, letterLitter, nail } from './art';
import {
  CLOAKS, COBBLE_DARK, FLAG, FLAG_DARK, FLAG_LIT, IRON, LAMP, MIRE, MIRE_LIT, MOSS, PLASTER, ROOF, SHUTTER,
  TIMBER, TIMBER_DARK, WAX,
} from './palette';

/**
 * The fight floor for every Cloak encounter: a little square off Hush Street at lamp-lighting.
 * The top is a terrace of shuttered fronts (half under the HUD) with eye-holes and a denunciation
 * nailed to every door; down both sides run iron gutters with lamp posts; the slate flags are
 * wet, laid in a herringbone, puddled, and littered with torn letters. Washing lines throw the
 * long shadows of hanging cloaks across the middle. The bottom kerb drops into black water.
 */
export const CLOAK_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Herringbone slate flags.
  g.fillStyle(COBBLE_DARK, 1); g.fillRect(0, 0, W, H);
  const S = 26;
  for (let y = 96; y < H; y += S / 2) {
    for (let x = ((y / (S / 2)) % 2) * S - S; x < W + S; x += S * 1.5) {
      const c = rng() < 0.5 ? FLAG : rng() < 0.5 ? FLAG_DARK : dim(FLAG, 0.12);
      g.fillStyle(dim(c, 0.12), 1); g.fillRect(x, y, S - 2, S / 2 - 2);
      g.fillStyle(c, 1); g.fillRect(x + 1, y + 1, S - 4, S / 2 - 4);
      if (rng() < 0.18) { g.fillStyle(FLAG_LIT, 0.35); g.fillRect(x + 2, y + 2, S * 0.4, 2); }
    }
  }
  // Puddles with a cold sheen, and lamplight in two of them.
  for (let i = 0; i < 14; i++) {
    const x = 60 + rng() * (W - 120), y = 150 + rng() * (H - 210), w = 30 + rng() * 60;
    g.fillStyle(MIRE, 0.65); g.fillEllipse(x, y, w, w * 0.32);
    g.fillStyle(MIRE_LIT, 0.6); g.fillEllipse(x - w * 0.15, y - 1, w * 0.45, w * 0.08);
    if (i < 2) { g.fillStyle(LAMP, 0.25); g.fillEllipse(x + w * 0.1, y, w * 0.25, w * 0.07); }
  }
  // The long shadows of cloaks on a washing line, laid across the middle.
  for (let k = 0; k < 7; k++) {
    const x = 120 + k * 120 + rng() * 30, y = 300 + Math.sin(k) * 20;
    g.fillStyle(0x000000, 0.12);
    g.fillTriangle(x - 12, y, x + 12, y, x + 40, y + 110);
    g.fillTriangle(x - 12, y, x + 18, y + 110, x + 40, y + 110);
  }
  g.lineStyle(1, 0x000000, 0.12); g.lineBetween(60, 290, W - 60, 320);

  // The terrace along the top: shuttered fronts, eye-holes, a letter nailed to every door.
  g.fillStyle(dim(PLASTER, 0.2), 1); g.fillRect(0, 0, W, 112);
  for (let i = 0; i < 8; i++) {
    const x0 = i * (W / 8);
    const wall = i % 2 ? PLASTER : dim(PLASTER, 0.12);
    g.fillStyle(wall, 1); g.fillRect(x0 + 2, 10, W / 8 - 4, 100);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, 0, 5, 112); g.fillRect(x0, 54, W / 8, 5);
    // A shuttered window up, eye-holes in it, maybe a glint.
    const wx = x0 + W / 16;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 16, 16, 32, 30);
    g.fillStyle(SHUTTER, 1); g.fillRect(wx - 14, 18, 13, 26); g.fillRect(wx + 1, 18, 13, 26);
    g.fillStyle(0x060508, 1); g.fillCircle(wx - 4, 26, 1.8); g.fillCircle(wx + 4, 26, 1.8);
    if (rng() < 0.4) { g.fillStyle(0xfff0c0, 0.9); g.fillCircle(wx - 4, 26, 0.8); g.fillCircle(wx + 4, 26, 0.8); }
    // The door, and the letter nailed on it.
    const dx = x0 + (i % 2 ? W / 16 - 22 : W / 16 + 22);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 14, 62, 28, 50);
    g.fillStyle(TIMBER, 1); g.fillRect(dx - 12, 64, 24, 48);
    letter(g, dx, 82, 1, (rng() - 0.5) * 0.4);
    nail(g, dx, 76, 1);
  }
  g.fillStyle(ROOF, 1); g.fillRect(0, 0, W, 8);
  g.fillStyle(FLAG_DARK, 1); g.fillRect(0, 110, W, 8);
  g.fillStyle(FLAG_LIT, 0.6); g.fillRect(0, 110, W, 2);

  // Gutters down both sides, lamp posts along them.
  for (const x0 of [0, W - 30]) {
    g.fillStyle(FLAG_DARK, 1); g.fillRect(x0, 118, 30, H - 118);
    g.fillStyle(MIRE, 0.9); g.fillRect(x0 + 10, 118, 10, H - 118);
    g.fillStyle(MIRE_LIT, 0.5); g.fillRect(x0 + 12, 118, 3, H - 118);
    for (let y = 170; y < H; y += 120) { g.fillStyle(IRON, 1); g.fillRect(x0 + 8, y, 14, 12); g.lineStyle(1, 0x5a5a66, 1); for (let k = 2; k < 12; k += 3) g.lineBetween(x0 + 8, y + k, x0 + 22, y + k); }
  }
  for (const [x, y] of [[34, 260], [W - 50, 420], [34, 560]] as [number, number][]) {
    lampPost(g, x, y, 0.85);
    glow(g, x + 14, y - 48, 50, LAMP, 0.03, 4);
    g.fillStyle(LAMP, 0.05); g.fillEllipse(x + 14, y + 6, 110, 34);
  }

  // Torn letters in the gutters and blown across the flags.
  letterLitter(g, 120, 140, 6, rng);
  letterLitter(g, W - 160, 150, 5, rng);
  for (let i = 0; i < 12; i++) letter(g, 80 + rng() * (W - 160), 160 + rng() * (H - 240), 0.8, rng() * 6, rng() < 0.3, 0.4);
  // A dropped cloak and a fallen mask.
  g.fillStyle(CLOAKS[2], 0.8); g.fillEllipse(W - 140, H - 90, 46, 16);
  g.fillStyle(dim(CLOAKS[2], 0.3), 0.8); g.fillEllipse(W - 132, H - 86, 22, 6);
  // Moss in the joints and a smear of red wax by a door step.
  for (let i = 0; i < 40; i++) { g.fillStyle(MOSS, 0.4); g.fillCircle(rng() * W, 120 + rng() * (H - 140), 1.2 + rng() * 1.6); }
  g.fillStyle(WAX, 0.6); g.fillCircle(W / 2 + 40, 124, 3); g.fillCircle(W / 2 + 46, 128, 1.6);

  // The bottom kerb: the square ends at black water, duckboard steps down.
  g.fillStyle(FLAG_DARK, 1); g.fillRect(0, H - 30, W, 6);
  g.fillStyle(FLAG_LIT, 0.6); g.fillRect(0, H - 30, W, 2);
  g.fillStyle(MIRE, 1); g.fillRect(0, H - 24, W, 24);
  for (let i = 0; i < 12; i++) { g.fillStyle(MIRE_LIT, 0.6); g.fillEllipse(rng() * W, H - 12, 40 + rng() * 40, 3); }
  for (const x of [W * 0.3, W * 0.7]) {
    for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? TIMBER : lit(TIMBER, 0.1), 1); g.fillRect(x - 24, H - 26 + k * 8, 48, 6); }
  }
};
