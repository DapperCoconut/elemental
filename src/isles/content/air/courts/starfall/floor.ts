import type { ArenaFloor } from '../../../../IslesTypes';
import { glow, mixC } from '../../../../art/IsleArt';
import { SF, armillary, inlayStar, star, telescope } from './palette';

/**
 * The Starfall Court's fighting floor: an observatory roof-terrace on the summit, at night.
 * Pale moonstone flags under your feet, a brass meridian line running straight across them; a
 * band of lapis mosaic with gold-leaf stars along the top wall, telescopes on their tripods at
 * the corners, an armillary on its plinth; along the bottom a balustrade, and past it the cloud
 * sea lying silver a long way down. The sky above the top wall is thick with stars. The five
 * gimmicks paint their rules over the middle, so the middle is kept pale and quiet.
 */
export const starfallFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  // The sky behind the top wall.
  g.fillStyle(SF.nightDeep, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    const x = rng() * W, y = rng() * top;
    g.fillStyle(SF.star, 0.3 + rng() * 0.6); g.fillRect(x, y, 1 + rng() * 1.5, 1 + rng() * 1.5);
  }
  for (let i = 0; i < 6; i++) star(g, rng() * W, 10 + rng() * (top - 24), 3 + rng() * 4, SF.star, 0.9);
  // The flags.
  const floorTop = top, floorBot = H - 60;
  g.fillStyle(SF.stoneDark, 1); g.fillRect(0, floorTop, W, floorBot - floorTop);
  const S = 64;
  for (let y = floorTop; y < floorBot; y += S) {
    const shift = (Math.floor((y - floorTop) / S) % 2) * S * 0.5;
    for (let x = -shift; x < W; x += S) {
      const c = mixC(SF.stone, rng() < 0.5 ? SF.stoneLit : SF.stoneMid, rng() * 0.45);
      g.fillStyle(c, 1); g.fillRect(x + 2, y + 2, S - 4, Math.min(S - 4, floorBot - y - 2));
      if (rng() < 0.15) { g.fillStyle(0xc8d8ff, 0.1); g.fillRect(x + 6, y + 6 + rng() * 30, S - 12, 4); }
    }
  }
  for (let i = 0; i < 900; i++) {
    const x = rng() * W, y = floorTop + rng() * (floorBot - floorTop);
    g.fillStyle(rng() < 0.8 ? SF.stoneDark : SF.star, 0.2 + rng() * 0.3); g.fillRect(x, y, 1 + rng() * 1.5, 1);
  }
  // The meridian: a brass line inlaid straight down the middle, ticked in degrees.
  g.fillStyle(SF.brassDark, 0.9); g.fillRect(W / 2 - 3, floorTop, 6, floorBot - floorTop);
  g.fillStyle(SF.brassLit, 0.7); g.fillRect(W / 2 - 1, floorTop, 2, floorBot - floorTop);
  for (let y = floorTop + 16; y < floorBot; y += 22) { g.fillStyle(SF.brass, 0.8); g.fillRect(W / 2 - (y % 110 < 22 ? 12 : 7), y, (y % 110 < 22 ? 24 : 14), 2); }
  // The mosaic band under the top wall.
  g.fillStyle(SF.brassDark, 1); g.fillRect(0, floorTop, W, 30);
  g.fillStyle(SF.lapisDeep, 1); g.fillRect(0, floorTop + 2, W, 24);
  for (let x = 0; x < W; x += 6) { g.fillStyle(rng() < 0.5 ? SF.lapis : SF.lapisLit, 0.7); g.fillRect(x, floorTop + 4 + rng() * 16, 5, 5); }
  for (let x = 20; x < W; x += 48) inlayStar(g, x + rng() * 10, floorTop + 14, 4 + rng() * 2, SF.leaf, 1, rng());
  // Telescopes at the top corners, an armillary on its plinth at the top middle.
  telescope(g, 70, floorTop + 110, 70, -Math.PI / 2 - 0.5);
  telescope(g, W - 70, floorTop + 110, 70, -Math.PI / 2 + 0.6);
  armillary(g, W / 2 + 120, floorTop + 92, 34, 0.6);
  glow(g, W / 2 + 120, floorTop + 52, 30, SF.starGold, 0.03, 3);
  // A few chalked star-sightings on the flags, scuffed by feet.
  for (let i = 0; i < 4; i++) {
    const cx = 120 + rng() * (W - 240), cy = floorTop + 140 + rng() * (floorBot - floorTop - 240);
    g.lineStyle(1, 0xf0f0ff, 0.18); g.strokeCircle(cx, cy, 26 + rng() * 14);
    for (let k = 0; k < 5; k++) { g.fillStyle(0xf0f0ff, 0.22); g.fillCircle(cx + (rng() - 0.5) * 50, cy + (rng() - 0.5) * 50, 1.4); }
  }
  // The balustrade along the bottom, and past it the cloud sea far below.
  g.fillStyle(SF.cloudDeep, 1); g.fillRect(0, floorBot, W, H - floorBot);
  for (let i = 0; i < 30; i++) {
    const x = rng() * W, y = floorBot + 20 + rng() * 40;
    g.fillStyle(SF.cloud, 0.9); g.fillEllipse(x, y, 80 + rng() * 80, 20 + rng() * 12);
    g.fillStyle(SF.cloudLit, 0.45); g.fillEllipse(x - 10, y - 5, 50 + rng() * 40, 7);
  }
  g.fillStyle(SF.stoneDark, 1); g.fillRect(0, floorBot - 6, W, 14);
  g.fillStyle(SF.stoneLit, 1); g.fillRect(0, floorBot - 8, W, 4);
  for (let x = 14; x < W; x += 28) {
    g.fillStyle(SF.stoneMid, 1); g.fillRoundedRect(x - 6, floorBot + 6, 12, 26, 5);
    g.fillStyle(SF.stoneLit, 1); g.fillRect(x - 4, floorBot + 8, 4, 22);
  }
  g.fillStyle(SF.stoneLit, 1); g.fillRect(0, floorBot + 30, W, 6);
};
