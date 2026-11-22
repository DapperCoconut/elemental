import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import { pot, saggarStack, sherd, type PotShape } from './art';
import {
  BISQUE, BRICK, BRICK_DARK, BRICK_LIT, CELADON, COBALT, GREENWARE, GREENWARE_LIT, MARL, MARL_DARK, MARL_DEEP, MARL_LIT,
  OXBLOOD, SLIP, SLIP_DARK, SLIP_LIT, SOOT, TERRA, TIMBER, TIMBER_DARK,
} from './palette';

/**
 * The fight floor for every Potter's Court encounter: a throwing yard behind the kilns. Packed red
 * marl trodden smooth, puddled with old slip and spattered where the wheels have thrown; along the
 * top a kiln-brick wall (half under the HUD) with ware boards of greenware drying on its ledge; down
 * the sides saggar stacks and a few finished pots; along the bottom a strip of sherd paving. The
 * middle is left bare — the wheel, the kilns, the ranks, the moulds and the glaze bring their own.
 */
export const POTTER_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Packed marl, trodden in arcs where barrows turn.
  g.fillStyle(MARL, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    g.fillStyle(rng() < 0.5 ? MARL_LIT : MARL_DARK, 0.18 + rng() * 0.15);
    g.fillEllipse(rng() * W, 100 + rng() * (H - 100), 80 + rng() * 200, 30 + rng() * 80);
  }
  for (let i = 0; i < 14; i++) {
    const cx = rng() * W, cy = 120 + rng() * (H - 160), r = 60 + rng() * 120;
    g.lineStyle(6, MARL_DARK, 0.18); g.beginPath(); g.arc(cx, cy, r, rng() * 6, rng() * 6 + 1.6, false); g.strokePath();
  }
  for (let i = 0; i < 700; i++) {
    g.fillStyle(rng() < 0.5 ? MARL_DEEP : MARL_LIT, 0.2 + rng() * 0.2);
    g.fillRect(rng() * W, 100 + rng() * (H - 100), 1 + rng() * 2, 1 + rng());
  }
  // Old slip: dried puddles cracked into plates, and fresh spatter in fans.
  for (let i = 0; i < 9; i++) {
    const x = 60 + rng() * (W - 120), y = 130 + rng() * (H - 200), r = 18 + rng() * 26;
    g.fillStyle(SLIP_DARK, 0.5); g.fillEllipse(x, y, r * 2.4, r * 1.2);
    g.fillStyle(mixC(SLIP, MARL_LIT, 0.4), 0.7); g.fillEllipse(x - 2, y - 2, r * 2.1, r);
    for (let k = 0; k < 5; k++) {
      g.lineStyle(1, SLIP_DARK, 0.6);
      g.lineBetween(x - r + rng() * r * 2, y - r * 0.4 + rng() * r * 0.8, x - r + rng() * r * 2, y - r * 0.4 + rng() * r * 0.8);
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = rng() * W, y = 140 + rng() * (H - 200), a = rng() * Math.PI * 2;
    for (let k = 0; k < 12; k++) {
      const d = 10 + rng() * 50, b = a + (rng() - 0.5) * 0.9;
      g.fillStyle(SLIP, 0.6); g.fillCircle(x + Math.cos(b) * d, y + Math.sin(b) * d, 1.5 + rng() * 2.5);
    }
  }
  // Top: a kiln-brick wall with a ledge of ware boards, the greenware drying in a row.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(0, 0, W, 112);
  for (let y = 0; y < 106; y += 9) {
    g.fillStyle(BRICK, 1);
    for (let x = ((y / 9) % 2) * 14 - 14; x < W; x += 28) g.fillRect(x + 1, y + 1, 26, 7);
  }
  g.fillStyle(SOOT, 0.35); g.fillRect(0, 0, W, 40);
  g.fillStyle(BRICK_LIT, 0.5); g.fillRect(0, 104, W, 2);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 106, W, 8);
  g.fillStyle(TIMBER, 1); g.fillRect(0, 105, W, 5);
  const shapes: PotShape[] = ['jar', 'cup', 'bowl', 'jug', 'vase', 'bottle'];
  for (let x = 18; x < W - 10; x += 16 + rng() * 8) {
    pot(g, x, 106, 10 + rng() * 8, shapes[Math.floor(rng() * shapes.length)], mixC(GREENWARE, GREENWARE_LIT, rng()));
  }
  // Sides: saggar stacks, and a finished glazed pot here and there.
  for (let y = 190; y < H - 60; y += 120) {
    saggarStack(g, 22, y, 3 + Math.floor(rng() * 3), 11);
    saggarStack(g, W - 22, y + 60, 3 + Math.floor(rng() * 3), 11);
  }
  const glazes = [CELADON, COBALT, OXBLOOD];
  for (let i = 0; i < 4; i++) {
    pot(g, 52, 250 + i * 110, 22, i % 2 ? 'urn' : 'jar', BISQUE, glazes[i % 3]);
    pot(g, W - 52, 200 + i * 110, 20, i % 2 ? 'vase' : 'jug', BISQUE, glazes[(i + 1) % 3]);
  }
  // Bottom: sherd paving with a kerb of upturned saggar rims.
  g.fillStyle(MARL_DEEP, 1); g.fillRect(0, H - 30, W, 30);
  for (let x = 4; x < W; x += 5) sherd(g, x + rng() * 3, H - 16 + (rng() - 0.5) * 18, 3 + rng() * 3, rng() < 0.7 ? TERRA : rng() < 0.6 ? BISQUE : CELADON, rng);
  g.fillStyle(dim(SLIP_LIT, 0.2), 1); g.fillRect(0, H - 32, W, 3);
  for (let x = 0; x < W; x += 20) { g.fillStyle(lit(SLIP_LIT, 0.1), 0.5); g.fillEllipse(x + 10, H - 31, 18, 5); }
};
