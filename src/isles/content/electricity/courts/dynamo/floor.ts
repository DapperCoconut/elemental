import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { cableDrum, crankHouse, gridLamp, gridSeal, lightningRod, pylon, pylonArms, cable } from './art';
import {
  ARC, BASALT, BASALT_DARK, BASALT_LIT, BRICK, BRICK_DARK, BRICK_LIT, COPPER_DARK, IRON, IRON_DARK, IRON_LIT, RIVET,
  SETT, SETT_DARK, SETT_LIT, SHEEN,
} from './palette';

/**
 * The fight floor for every Dynamo encounter: the yard behind the Wheelhouses on a wet night.
 * Black setts shining under the arc-light, a riveted cable trench across the floor, a terrace of
 * crank-houses along the top (half under the HUD) with a pylon stringing cable over their roofs,
 * lightning rods on basalt plinths down both sides, and cable drums in the corners. The middle is
 * left open — the wheel, the rods, the circuits, the fuses and the race bring their own.
 */
export const DYNAMO_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Wet setts, laid in fans.
  g.fillStyle(SETT_DARK, 1); g.fillRect(0, 0, W, H);
  for (let y = 100; y < H; y += 14) {
    const row = (y / 14) | 0;
    for (let x = (row % 2) * 9 - 9; x < W; x += 18) {
      const c = rng() < 0.12 ? SETT_LIT : rng() < 0.5 ? SETT : dim(SETT, 0.1);
      g.fillStyle(c, 1); g.fillRoundedRect(x + 1, y + 1, 16, 12, 3);
      if (rng() < 0.08) { g.fillStyle(SHEEN, 0.35); g.fillRect(x + 3, y + 3, 9, 2); }
    }
  }
  // Puddles catching the storm-light.
  for (let i = 0; i < 12; i++) {
    const x = 60 + rng() * (W - 120), y = 140 + rng() * (H - 190);
    g.fillStyle(BASALT_DARK, 0.75); g.fillEllipse(x, y, 50 + rng() * 60, 14 + rng() * 12);
    g.lineStyle(1, ARC, 0.25); g.lineBetween(x - 18, y - 3, x + 14, y - 4);
    g.lineStyle(1, SHEEN, 0.3); g.lineBetween(x - 8, y + 2, x + 20, y + 1);
  }
  // A riveted cable trench across the yard.
  const ty = H - 120;
  for (let x = 0; x < W; x += 34) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x, ty - 7, 33, 14);
    g.fillStyle(IRON, 1); g.fillRect(x + 1, ty - 6, 31, 12);
    g.fillStyle(RIVET, 0.8); g.fillCircle(x + 4, ty - 3, 1.2); g.fillCircle(x + 29, ty + 3, 1.2);
    g.lineStyle(1, IRON_LIT, 0.4); g.lineBetween(x + 6, ty - 1, x + 26, ty - 1);
  }
  // The terrace along the top: four crank-houses, a pylon, cable over the roofs.
  g.fillStyle(BASALT, 1); g.fillRect(0, 0, W, 104);
  const houses = [130, 330, 630, 830];
  houses.forEach((x, i) => crankHouse(g, x, 104, 110, 62, { wall: [BRICK, BRICK_LIT, BRICK_DARK, BRICK][i], num: 40 + i, off: i === 2 ? 2 : 0, chimney: i % 2 === 0 }, rng));
  pylon(g, 480, 112, 104);
  const [la, ra] = pylonArms(480, 112, 104);
  cable(g, la, { x: 130 + 13, y: 104 - 62 - 34 + 6 }, 10, 0x0e0f12, 2);
  cable(g, ra, { x: 830 + 13, y: 104 - 62 - 34 + 6 }, 10, 0x0e0f12, 2);
  cable(g, { x: 0, y: 30 }, la, 14, COPPER_DARK, 1.5);
  cable(g, ra, { x: W, y: 30 }, 14, COPPER_DARK, 1.5);
  g.fillStyle(BASALT_LIT, 1); g.fillRect(0, 102, W, 6); g.fillStyle(lit(BASALT_LIT, 0.15), 1); g.fillRect(0, 102, W, 1.5);
  // Rods down both sides on their plinths, and Grid lamps between.
  for (let y = 210; y < H - 40; y += 160) {
    lightningRod(g, 20, y, 70);
    lightningRod(g, W - 20, y + 80, 70);
  }
  gridLamp(g, 30, H - 30, true);
  gridLamp(g, W - 54, 200, false);
  // Cable drums in the corners.
  cableDrum(g, 70, H - 28, 0.7);
  cableDrum(g, W - 90, H - 24, 0.8);
  // The Empress's seal painted on the setts in the middle, half-worn by boots.
  gridSeal(g, W / 2, (H + 104) / 2 + 10, 46, 0x5a3418, 0.35);
};
