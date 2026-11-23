import type { ArenaFloor } from '../../../../IslesTypes';
import { OBS, crackPath, glassFloor, seam, shard, slab } from '../../../../art/PinnacleArt';
import { chipStack, fusedDie, glyphs, pip } from './art';
import { FELT, FELT_DEEP, FELT_GLOW, FELT_LIT, IVORY, IVORY_DIM, ROUGE, ROUGE_DEEP } from './palette';

/**
 * The fight floor of the Lot Bench: a gaming table cut in black glass. Glass tiles over felt, a
 * rouge-and-black arc of the Wheel of Sixty's rim sweeping across the head of the floor (half
 * under the HUD), two fused dice at the corners, a betting layout inlaid down the left and right
 * edges, spilled chips. The middle is left open — every decree brings its own furniture.
 */
export const FATE_BENCH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  glassFloor(g, 0, 0, W, H, 48, rng);
  // Felt under the glass, showing through in a broad diamond lattice.
  for (let i = -H; i < W + H; i += 96) {
    g.lineStyle(10, FELT_DEEP, 0.35); g.lineBetween(i, 96, i + (H - 96), H);
    g.lineStyle(10, FELT_DEEP, 0.35); g.lineBetween(i, H, i + (H - 96), 96);
  }
  // The arc of the Wheel's rim across the head of the floor: pockets, frets, the ball track.
  const cx = W / 2, cy = -560, R0 = 660, R1 = 700, R2 = 724;
  for (let i = 0; i < 60; i++) {
    const a0 = Math.PI * 0.28 + (i / 60) * Math.PI * 0.44, a1 = a0 + (Math.PI * 0.44) / 60;
    const P = (a: number, r: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    const p = [P(a0, R0), P(a1, R0), P(a1, R1), P(a0, R1)];
    g.fillStyle(i % 2 ? ROUGE_DEEP : OBS.glass, 1);
    g.fillTriangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
    g.fillTriangle(p[0].x, p[0].y, p[2].x, p[2].y, p[3].x, p[3].y);
    if (i % 2) { g.fillStyle(ROUGE, 0.35); g.fillCircle((p[0].x + p[2].x) / 2, (p[0].y + p[2].y) / 2, 3); }
    g.lineStyle(i % 6 === 0 ? 2.4 : 1, i % 6 === 0 ? FELT_LIT : OBS.edge, i % 6 === 0 ? 0.9 : 0.35);
    g.lineBetween(p[0].x, p[0].y, P(a0, R2).x, P(a0, R2).y);
  }
  g.lineStyle(2, OBS.edge, 0.55);
  g.beginPath(); g.arc(cx, cy, R1, Math.PI * 0.28, Math.PI * 0.72, false); g.strokePath();
  g.lineStyle(8, 0x05040a, 1);
  g.beginPath(); g.arc(cx, cy, (R1 + R2) / 2 + 4, Math.PI * 0.28, Math.PI * 0.72, false); g.strokePath();
  g.lineStyle(1.5, OBS.edge, 0.6);
  g.beginPath(); g.arc(cx, cy, R2 + 6, Math.PI * 0.28, Math.PI * 0.72, false); g.strokePath();
  // Betting layouts inlaid down both sides: red and black squares, numbered, under glass.
  for (const x0 of [8, W - 64]) {
    g.fillStyle(FELT, 0.9); g.fillRect(x0, 150, 56, H - 190);
    g.lineStyle(1.4, FELT_LIT, 0.7); g.strokeRect(x0, 150, 56, H - 190);
    let n = x0 < W / 2 ? 1 : 19;
    for (let y = 160; y < H - 60; y += 38) {
      const red = n % 2 === 1;
      g.fillStyle(red ? ROUGE : OBS.glass, 0.9); g.fillRect(x0 + 6, y, 44, 30);
      g.lineStyle(1, OBS.edge, 0.35); g.strokeRect(x0 + 6, y, 44, 30);
      glyphs(g, String(n), x0 + 28, y + 15, 11, IVORY, 0.65, 1.4);
      n++;
    }
  }
  // Two dice fused into the bottom corners, and shards growing round them.
  fusedDie(g, 120, H - 8, 70, [5, 3, 2], 1, rng, 0.8);
  fusedDie(g, W - 120, H - 8, 70, [6, 1, 4], -1, rng, 0.8);
  for (const x of [190, W - 190]) for (let i = 0; i < 3; i++) shard(g, x + (rng() - 0.5) * 40, H, 16 + rng() * 10, 30 + rng() * 26, (rng() - 0.5) * 12, 0.15);
  slab(g, W / 2, H, 260, 12);
  // Spilled chips and a few loose pips of felt light trapped in the floor.
  for (let i = 0; i < 14; i++) chipStack(g, 90 + rng() * (W - 180), 170 + rng() * (H - 230), 1 + Math.floor(rng() * 2), rng() < 0.5 ? ROUGE : OBS.facet, 6);
  for (let i = 0; i < 20; i++) pip(g, 80 + rng() * (W - 160), 140 + rng() * (H - 180), 1.6, FELT_GLOW, 0.5);
  // Violet cracks, the King's colour, through all of it.
  for (let i = 0; i < 6; i++) {
    const a = { x: rng() * W, y: 120 + rng() * (H - 160) };
    seam(g, crackPath(a, { x: a.x + (rng() - 0.5) * 300, y: a.y + (rng() - 0.5) * 200 }, rng, 14, 7), 1.2, 0.6);
  }
  g.fillStyle(IVORY_DIM, 0.05); g.fillRect(0, 96, W, 6);
};
