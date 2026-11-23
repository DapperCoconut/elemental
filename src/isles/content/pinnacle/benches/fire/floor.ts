import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, shard, slab } from '../../../../art/PinnacleArt';
import { EMB, brandFace, brandingIron, cooledFlows, emberSeam } from './art';

/**
 * The fighting floor for the Ember Bench's six councilors: the hall's last pour, cooled flat. A
 * row of frozen lava-falls along the top edge (half under the HUD), a rack of branding irons
 * leaning down each side, the old casting channel crossing the floor diagonally, and — very faint
 * in the middle, so no decree's drawing is mistaken for it — the impression of the First Brand.
 */
export const BENCH_FIRE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  cooledFlows(g, 0, 0, W, H, rng, 1.2);
  // The casting channel, a frozen river from top-left to bottom-right.
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    const x = -40 + f * (W + 80), y = 120 + f * (H - 160) + Math.sin(f * 5) * 30;
    g.fillStyle(OBS.glass, 0.8); g.fillCircle(x, y, 58);
    g.fillStyle(OBS.facet, 0.35); g.fillCircle(x, y, 40);
    g.lineStyle(1.2, OBS.sheen, 0.35); g.beginPath(); g.arc(x - 10, y - 20, 40, Math.PI * 0.1, Math.PI * 0.7, false); g.strokePath();
  }
  // The First Brand's impression, ghost-faint.
  brandFace(g, W / 2, (96 + H) / 2, 120, 0.05, 0.42);
  // Frozen falls along the top: a ledge with tongues hanging off it.
  slab(g, W / 2, 104, W + 20, 30);
  for (let x = 20; x < W; x += 34 + rng() * 18) {
    const len = 14 + rng() * 34, w = 16 + rng() * 14;
    g.fillStyle(OBS.glass, 1); g.fillRect(x - w / 2, 104, w, len); g.fillCircle(x, 104 + len, w / 2);
    g.fillStyle(OBS.facet, 0.9); g.fillRect(x, 104, w / 2 - 1, len);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x + w / 2, 104, x + w / 2, 104 + len);
    emberSeam(g, [{ x, y: 108 }, { x: x + (rng() - 0.5) * 4, y: 100 + len }], 0.8, 0.5);
  }
  // Irons leaning against each side wall, heads down, like quills on a desk's edge.
  for (let y = 170; y < H - 40; y += 56 + rng() * 30) {
    brandingIron(g, 22, y + 30, 70, -Math.PI / 2 + 0.25, 0.1 + rng() * 0.25, 0.8);
    brandingIron(g, W - 22, y + 60, 70, -Math.PI / 2 - 0.25, 0.1 + rng() * 0.25, 0.8);
  }
  // Two shard sentinels in the bottom corners.
  for (const x of [46, W - 46]) { shard(g, x - 10, H - 4, 34, 90, -6, 0.2); shard(g, x + 10, H - 4, 30, 64, 8, 0.1); }
  // Stray embers in the glass.
  for (let i = 0; i < 60; i++) { g.fillStyle(EMB.ember, 0.2 + rng() * 0.4); g.fillCircle(rng() * W, 130 + rng() * (H - 150), 0.8 + rng() * 1.2); }
};
