import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { R, drawDrift, drawIcicle } from './util';

/**
 * The Rimefast Court's fighting floor: a stretch of the frozen harbour itself. Sea-ice the colour
 * of a cold sky, darker where it is clear enough to see the black water under it, with old
 * pressure cracks healed white, bubbles of trapped air, sled ruts, a skinned-over fishing hole
 * and a mooring line frozen into the surface. Along the top runs the iced-in hull of a ship,
 * collar of heaped ice and all; snow is drifted into the other edges.
 */
export const RIMEFAST_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(R.ice, 1); g.fillRect(0, 0, W, H);
  // Broad bands of clearer (darker) and milkier (paler) ice, the way sea-ice sets in sheets.
  for (let i = 0; i < 14; i++) {
    const x = rng() * W, y = top + rng() * (H - top);
    g.fillStyle(rng() < 0.55 ? R.iceDeep : R.iceLit, 0.22 + rng() * 0.2);
    g.fillEllipse(x, y, 160 + rng() * 280, 50 + rng() * 120);
  }
  // Black-ice windows where you can see right down into the water.
  for (let i = 0; i < 5; i++) {
    const x = 120 + rng() * (W - 240), y = top + 80 + rng() * (H - top - 160);
    const rx = 50 + rng() * 70, ry = 24 + rng() * 30;
    g.fillStyle(R.blackIce, 0.55); g.fillEllipse(x, y, rx * 2, ry * 2);
    g.fillStyle(R.water, 0.45); g.fillEllipse(x + 6, y + 3, rx * 1.4, ry * 1.3);
    // A fish shadow, frozen mid-turn, glimpsed through it.
    if (rng() < 0.6) {
      g.fillStyle(0x061420, 0.5); g.fillEllipse(x, y, 30, 9);
      g.fillTriangle(x + 14, y, x + 24, y - 6, x + 24, y + 6);
    }
  }
  // Healed pressure cracks: long white seams with a dark line down the middle.
  for (let i = 0; i < 7; i++) {
    let x = rng() * W, y = top + rng() * (H - top);
    let a = rng() * Math.PI * 2;
    for (let s = 0; s < 9; s++) {
      a += (rng() - 0.5) * 0.8;
      const nx = x + Math.cos(a) * 34, ny = y + Math.sin(a) * 26;
      g.lineStyle(5, R.iceLit, 0.5); g.lineBetween(x, y, nx, ny);
      g.lineStyle(1.2, R.iceDark, 0.55); g.lineBetween(x, y, nx, ny);
      x = nx; y = ny;
    }
  }
  // Trapped air: strings of white bubbles frozen in place.
  for (let i = 0; i < 18; i++) {
    const x = rng() * W, y = top + rng() * (H - top);
    for (let k = 0; k < 4 + rng() * 5; k++) {
      g.fillStyle(0xffffff, 0.45); g.fillCircle(x + k * 5 + rng() * 2, y - k * 3, 1.2 + rng() * 2.2);
    }
  }
  // Sled ruts and boot-scuffs crossing the sheet.
  for (let i = 0; i < 3; i++) {
    const y0 = top + 80 + rng() * (H - top - 160);
    const bend = (rng() - 0.5) * 90;
    for (const off of [0, 14]) {
      g.lineStyle(2, R.snowShade, 0.55);
      g.beginPath();
      g.moveTo(0, y0 + off);
      for (let x = 0; x <= W; x += 40) g.lineTo(x, y0 + off + Math.sin((x / W) * Math.PI) * bend);
      g.strokePath();
    }
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle(0xffffff, 0.2 + rng() * 0.3); g.fillRect(rng() * W, top + rng() * (H - top), 1 + rng() * 3, 1);
  }
  // A fishing hole from last week, skinned over: a pale disc in a ring of old slush.
  const hx = W * 0.78, hy = H - 120;
  g.fillStyle(R.snow, 0.8); g.fillEllipse(hx, hy, 92, 56);
  g.fillStyle(R.slush, 1); g.fillEllipse(hx, hy, 74, 44);
  g.fillStyle(lit(R.iceDeep, 0.3), 1); g.fillEllipse(hx, hy + 2, 60, 34);
  g.lineStyle(1, R.iceLit, 0.7); g.lineBetween(hx - 18, hy - 4, hx + 6, hy + 6); g.lineBetween(hx + 6, hy + 6, hx + 20, hy - 2);
  // A mooring line frozen into the ice, running to a buried ring.
  g.lineStyle(3, dim(R.rope, 0.2), 0.8);
  g.beginPath(); g.moveTo(W * 0.15, top + 60);
  for (let k = 1; k <= 10; k++) g.lineTo(W * 0.15 + k * 26, top + 60 + Math.sin(k * 0.9) * 10 + k * 11);
  g.strokePath();
  g.lineStyle(3, R.iron, 0.9); g.strokeCircle(W * 0.15 + 270, top + 60 + Math.sin(9) * 10 + 110, 7);

  // The iced-in hull along the top: a tarred side in a collar of heaped ice, with gunports.
  g.fillStyle(R.hull, 1); g.fillRect(0, top - 40, W, 34);
  g.fillStyle(R.hullLit, 1); g.fillRect(0, top - 40, W, 4);
  for (let x = 40; x < W; x += 110) {
    g.fillStyle(dim(R.hull, 0.5), 1); g.fillRect(x, top - 30, 22, 14);
    g.fillStyle(R.livery, 1); g.fillRect(x - 2, top - 32, 26, 2);
  }
  for (let x = -10; x < W; x += 26) {
    g.fillStyle(R.iceDeep, 1); g.fillEllipse(x + 13, top - 2, 34, 18);
    g.fillStyle(R.iceLit, 1); g.fillEllipse(x + 11, top - 5, 28, 12);
  }
  for (let x = 20; x < W; x += 36) drawIcicle(g, x + rng() * 10, top - 8, 8 + rng() * 14, 5, 0.9);
  // Snow drifted into the bottom corners and down the sides.
  drawDrift(g, 60, H - 16, 160, 40, 1);
  drawDrift(g, W - 70, H - 18, 180, 44, 2);
  for (let y = top + 40; y < H; y += 70) {
    g.fillStyle(R.snow, 0.7); g.fillEllipse(6, y, 26, 60);
    g.fillStyle(R.snow, 0.7); g.fillEllipse(W - 6, y + 30, 26, 60);
  }
};
