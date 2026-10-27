import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, groundFill } from '../../../../art/IsleArt';
import { P } from './util';

/**
 * The Powder Court's fighting floor: the drill square inside the star fort. Packed, rammed earth
 * scored by boots and gun-wheels, a chalked parade rectangle, old shell scars, spent paper
 * cartridges, and a sandbag breastwork round the edge with the rampart's earth slope behind it.
 */
export const POWDER_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  groundFill(g, { x: 0, y: 0, w: W, h: H }, 0x6e5a3e, 0x7d6748, 0x3d3020, rng, 1.6);
  // Rammed-earth banding: the roller's passes, left to right.
  for (let y = top; y < H; y += 44) {
    g.fillStyle(rng() < 0.5 ? 0x75603f : 0x665236, 0.35); g.fillRect(0, y, W, 22);
  }
  // Gun-wheel ruts in long curves.
  for (let i = 0; i < 4; i++) {
    const y0 = top + 60 + rng() * (H - top - 120);
    const bend = (rng() - 0.5) * 120;
    for (const off of [0, 18]) {
      g.lineStyle(3, 0x4a3a26, 0.45);
      g.beginPath();
      g.moveTo(0, y0 + off);
      for (let x = 0; x <= W; x += 40) g.lineTo(x, y0 + off + Math.sin((x / W) * Math.PI) * bend);
      g.strokePath();
    }
  }
  // Chalked parade rectangle and the drill-sergeant's cross in the middle.
  g.lineStyle(3, P.saltpetre, 0.22);
  g.strokeRect(70, top + 40, W - 140, H - top - 80);
  g.lineBetween(W / 2 - 18, (H + top) / 2, W / 2 + 18, (H + top) / 2);
  g.lineBetween(W / 2, (H + top) / 2 - 18, W / 2, (H + top) / 2 + 18);
  // Old shell scars — dark bowls with thrown lips.
  for (let i = 0; i < 6; i++) {
    const x = 90 + rng() * (W - 180), y = top + 50 + rng() * (H - top - 100);
    const r = 16 + rng() * 22;
    g.fillStyle(lit(0x6e5a3e, 0.12), 0.5); g.fillCircle(x, y, r * 1.35);
    g.fillStyle(0x2a1f14, 0.6); g.fillCircle(x, y, r);
    g.fillStyle(0x140e09, 0.5); g.fillCircle(x + 2, y + 2, r * 0.55);
  }
  // Spent paper cartridges, bitten open, all over the yard.
  for (let i = 0; i < 70; i++) {
    const x = rng() * W, y = top + rng() * (H - top);
    g.fillStyle(P.saltpetre, 0.5); g.fillRect(x, y, 5, 2);
    g.fillStyle(P.powder, 0.5); g.fillRect(x + 4, y, 1.5, 2);
  }
  // Sandbag breastwork round the whole square, with the turf rampart rising behind it.
  g.fillStyle(dim(P.turf, 0.2), 1); g.fillRect(0, top - 8, W, 18);
  for (let x = 6; x < W; x += 30) {
    g.fillStyle(dim(P.sandbag, 0.45), 1); g.fillEllipse(x, top + 6, 30, 14);
    g.fillStyle(P.sandbag, 1); g.fillEllipse(x, top + 4, 27, 11);
    g.fillStyle(dim(P.sandbag, 0.45), 1); g.fillEllipse(x + 12, H - 6, 30, 14);
    g.fillStyle(P.sandbag, 1); g.fillEllipse(x + 12, H - 8, 27, 11);
  }
  for (let y = top + 22; y < H; y += 26) {
    for (const x of [6, W - 6]) {
      g.fillStyle(dim(P.sandbag, 0.45), 1); g.fillEllipse(x, y + 2, 15, 26);
      g.fillStyle(P.sandbag, 1); g.fillEllipse(x, y, 13, 23);
    }
  }
  // Two stacks of round shot in pyramids in the far corners — they are part of the furniture.
  for (const [cx, cy] of [[34, top + 30], [W - 34, top + 30]]) {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3 - row; i++) {
        const x = cx - (2 - row) * 5 + i * 10, y = cy - row * 8;
        g.fillStyle(P.powder, 1); g.fillCircle(x, y, 5);
        g.fillStyle(P.ironLit, 0.6); g.fillCircle(x - 1.5, y - 1.5, 1.5);
      }
    }
  }
};
