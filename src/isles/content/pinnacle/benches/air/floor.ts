import type { ArenaFloor } from '../../../../IslesTypes';
import { crackPath, seam, shard } from '../../../../art/PinnacleArt';
import {
  CLOUD_DEEP, GALE, GALE_LIT, OBS, VOID, bannerCloth, bannerPole, cloudBank, meterSigil, mixC, windRune,
} from './art';

/**
 * The fight floor for all six Gale Bench decrees: a span of black glass slung between two shards
 * on the outside of the spire, open to the cloud sea north and south. The deck runs east–west in
 * long planks; a channel of air-light runs down its middle (the pipe that carried the isle's breath
 * up to the Meter), sealed every so often with the Tax's gauge; breath is trapped as bubbles in the
 * glass. The two anchor-shards stand at the ends with a banner each, and cloud billows past both
 * long edges.
 */
export const GALE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Night, then the cloud sea seen past both edges of the span.
  for (let i = 0; i < 16; i++) { g.fillStyle(mixC(VOID, CLOUD_DEEP, i / 15), 1); g.fillRect(0, (i * H) / 16, W, H / 16 + 1); }
  for (let x = -40; x < W + 80; x += 70 + rng() * 40) cloudBank(g, x, 96 + rng() * 14, 120 + rng() * 80, 60 + rng() * 26, rng, 0.9);
  for (let x = -40; x < W + 80; x += 80 + rng() * 40) cloudBank(g, x, H + 26, 120 + rng() * 80, 56, rng, 0.8);
  // The deck.
  const D0 = 100, D1 = H - 10;
  g.fillStyle(OBS.glass, 1); g.fillRect(0, D0, W, D1 - D0);
  // Long planks, each with its own sheen and a staggered butt-joint.
  const PL = 44;
  for (let y = D0, row = 0; y < D1; y += PL, row++) {
    const h = Math.min(PL, D1 - y);
    const r = rng();
    g.fillStyle(r > 0.5 ? OBS.facet : mixC(OBS.glass, OBS.facet, 0.5), 0.6 + r * 0.3); g.fillRect(0, y + 1, W, h - 2);
    // A long reflected band of starlight across the plank.
    g.fillStyle(OBS.sheen, 0.18 + rng() * 0.12);
    g.fillRect(0, y + 3, W, 3);
    g.lineStyle(1, OBS.edge, 0.22); g.lineBetween(0, y, W, y);
    for (let x = (row % 2) * 120 + 60; x < W; x += 240) { g.lineStyle(1, OBS.seam, 0.22); g.lineBetween(x, y, x, y + h); }
  }
  // The breath-channel down the middle of the span, sealed with the Tax's gauge.
  const cy = (D0 + D1) / 2;
  g.fillStyle(GALE, 0.05); g.fillRect(0, cy - 16, W, 32);
  g.lineStyle(2, GALE, 0.35); g.lineBetween(0, cy - 9, W, cy - 9); g.lineBetween(0, cy + 9, W, cy + 9);
  for (let x = 30; x < W; x += 36) { g.fillStyle(GALE_LIT, 0.18 + rng() * 0.2); g.fillEllipse(x + rng() * 12, cy, 10, 3); }
  for (const x of [W * 0.25, W * 0.5, W * 0.75]) {
    g.fillStyle(OBS.glass, 1); g.fillCircle(x, cy, 22);
    g.lineStyle(1.5, OBS.edge, 0.6); g.strokeCircle(x, cy, 22);
    meterSigil(g, x, cy + 2, 13, GALE, 0.7);
  }
  // Wind-runes inlaid in pairs either side of the channel.
  for (let x = 120; x < W - 80; x += 240) { windRune(g, x, cy - 120, 12, GALE, 0.28); windRune(g, x + 120, cy + 130, 12, GALE, 0.28); }
  // Breath trapped in the glass: small pale bubbles, singly and in strings.
  for (let i = 0; i < 70; i++) {
    const bx = rng() * W, by = D0 + 20 + rng() * (D1 - D0 - 40);
    g.lineStyle(1, GALE, 0.25 + rng() * 0.25); g.strokeCircle(bx, by, 1.5 + rng() * 3);
    if (rng() < 0.25) for (let k = 1; k < 4; k++) g.strokeCircle(bx + k * 5, by - k * 3, 1 + rng() * 1.5);
  }
  // Cracks, a few, violet.
  for (let i = 0; i < 6; i++) {
    const ax = 80 + rng() * (W - 160), ay = D0 + 30 + rng() * (D1 - D0 - 60);
    seam(g, crackPath({ x: ax, y: ay }, { x: ax + (rng() - 0.5) * 220, y: ay + (rng() - 0.5) * 80 }, rng, 8, 6), 1, 0.55);
  }
  // The lips of the deck, north and south: a pale bevel and a dark drop below it.
  g.fillStyle(OBS.sheen, 1); g.fillRect(0, D0 - 4, W, 5);
  g.lineStyle(1.5, OBS.edge, 0.9); g.lineBetween(0, D0 - 4, W, D0 - 4);
  g.fillStyle(0x000000, 0.5); g.fillRect(0, D1, W, H - D1);
  g.lineStyle(1.5, OBS.edge, 0.8); g.lineBetween(0, D1, W, D1);
  // The anchor-shards at either end of the span, and a banner off each.
  for (const side of [-1, 1]) {
    const x = side < 0 ? 0 : W;
    shard(g, x + side * -6, H, 70, H - 40, side * 10, 0.3);
    shard(g, x + side * -22, H, 46, H * 0.62, side * 6, 0.15);
    g.fillStyle(OBS.glass, 0.9); g.fillRect(side < 0 ? 0 : W - 26, D0, 26, D1 - D0);
    g.lineStyle(1.5, OBS.edge, 0.6); g.lineBetween(side < 0 ? 26 : W - 26, D0, side < 0 ? 26 : W - 26, D1);
    seam(g, crackPath({ x: x - side * 14, y: D0 + 40 }, { x: x - side * 10, y: D1 - 40 }, rng, 6, 8), 1.2, 0.7);
  }
  bannerPole(g, 44, 150, 80);
  bannerCloth(g, 44, 72, 70, 26, 1.3, 1, 1);
  bannerPole(g, W - 44, 150, 80);
  bannerCloth(g, W - 44, 72, 70, 26, 2.6, -1, 3);
};
