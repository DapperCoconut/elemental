import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { CORAL, GOLD, KELP, STONE, STONE_LIT, coralBranch, maresaSigil, sleeperInBubble } from './art';

/**
 * The warden arena: a drowned antechamber of the Undertow. Sea-worn flagstones under an inch of
 * standing water, the Queen's sigil inlaid in shell at the centre, a row of wall niches along
 * the back where the drowned sleep in their bubbles, coral at the pillar feet and kelp
 * standing up out of the floor cracks toward a light that never quite reaches.
 */
export const UNDERTOW_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(0x061018, 1); g.fillRect(0, 0, W, H);
  // Flagstones, each a slightly different drowned grey-green.
  const S = 64;
  for (let y = top; y < H; y += S) {
    const shift = (Math.floor((y - top) / S) % 2) * (S / 2);
    for (let x = -shift; x < W; x += S) {
      const c = rng() < 0.5 ? 0x1e3034 : 0x22363a;
      g.fillStyle(0x0a1418, 1); g.fillRect(x, y, S, S);
      g.fillStyle(c, 1); g.fillRect(x + 2, y + 2, S - 4, S - 4);
      g.fillStyle(lit(c, 0.08), 1); g.fillRect(x + 2, y + 2, S - 4, 2);
      if (rng() < 0.3) { g.fillStyle(0x2a5a46, 0.35); g.fillEllipse(x + rng() * S, y + rng() * S, 26 + rng() * 20, 8 + rng() * 6); }
      if (rng() < 0.15) { g.lineStyle(1, 0x0a1418, 0.8); g.lineBetween(x + rng() * S, y + 4, x + rng() * S, y + S - 4); }
    }
  }
  // Standing water: a translucent sheet with drowned light pooled in it.
  g.fillStyle(0x2a6a8a, 0.12); g.fillRect(0, top, W, H - top);
  for (let i = 0; i < 26; i++) {
    g.fillStyle(0xbff8ff, 0.03 + rng() * 0.03);
    g.fillEllipse(rng() * W, top + rng() * (H - top), 60 + rng() * 120, 18 + rng() * 30);
  }
  // The back wall with its niches and sleepers.
  g.fillStyle(STONE, 1); g.fillRect(0, top, W, 44);
  for (let x = 0; x < W; x += 26) { g.fillStyle(rng() < 0.5 ? STONE : STONE_LIT, 1); g.fillRect(x + 1, top + 2, 24, 18); g.fillRect(x + 13 - 13, top + 22, 24, 18); }
  g.fillStyle(lit(STONE_LIT, 0.2), 1); g.fillRect(0, top + 42, W, 2);
  for (let i = 0; i < 6; i++) {
    const nx = 80 + i * 160;
    g.fillStyle(0x020608, 1); g.fillRoundedRect(nx - 26, top + 2, 52, 42, { tl: 24, tr: 24, bl: 0, br: 0 });
    sleeperInBubble(g, nx, top + 42, 16, i * 1.3, [0xc8b098, 0xa88a70, 0xd8c0a8][i % 3], [0x5a4a6a, 0x3a5a5a, 0x6a3a3a][i % 3], 0);
  }
  // Side pillars with coral climbing them.
  for (const x of [26, W - 26]) {
    for (let y = top + 110; y < H; y += 170) {
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 22, 50, 14);
      g.fillStyle(dim(STONE_LIT, 0.3), 1); g.fillRect(x - 18, y - 46, 36, 70);
      g.fillStyle(STONE_LIT, 1); g.fillRect(x - 15, y - 46, 30, 70);
      coralBranch(g, x + (x < W / 2 ? 14 : -14), y + 20, 14 + rng() * 8, rng() < 0.5 ? CORAL : 0xd8608a, rng);
    }
  }
  // Kelp standing out of the cracks.
  for (let i = 0; i < 9; i++) {
    const x = 70 + rng() * (W - 140), y = top + 80 + rng() * (H - top - 120);
    if (Math.abs(x - W / 2) < 150 && Math.abs(y - (top + H) / 2) < 120) continue;
    for (let k = 0; k < 3; k++) {
      const kx = x + (k - 1) * 6;
      g.lineStyle(3 - k * 0.6, KELP, 0.8);
      g.lineBetween(kx, y, kx + Math.sin(i + k) * 8, y - 26 - k * 8);
    }
  }
  // The sigil inlaid in shell at the centre, a ring of pearl studs round it.
  const cx = W / 2, cy = (top + H) / 2 + 16;
  g.fillStyle(0x0a1418, 0.7); g.fillCircle(cx, cy, 96);
  g.lineStyle(4, 0x6a7a72, 0.9); g.strokeCircle(cx, cy, 90);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    g.fillStyle(0xeee4d4, 0.8); g.fillCircle(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90, 3);
  }
  maresaSigil(g, cx, cy, 64, 0x8a7a5a, 0.8);
  maresaSigil(g, cx, cy, 60, GOLD, 0.22);
  // Drain grates in the corners, where the standing water goes.
  for (const [x, y] of [[120, H - 60], [W - 120, H - 60]]) {
    g.fillStyle(0x020608, 1); g.fillEllipse(x, y, 70, 30);
    g.lineStyle(2, 0x4a5a5a, 1);
    for (let k = -3; k <= 3; k++) g.lineBetween(x + k * 9, y - 12, x + k * 9, y + 12);
    g.strokeEllipse(x, y, 70, 30);
  }
};
