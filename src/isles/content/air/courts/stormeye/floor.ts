import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { S, drawCloud, drawRod } from './util';

/**
 * The Stormeye Court's fighting floor: a walled yard inside the storm wall. Wet blue-grey setts
 * laid in fans, crowned toward a round iron drain in the middle, with gutters along both sides
 * running to it. Puddles everywhere, each holding a scrap of sky. Along the top, the wall itself:
 * granite courses, a crenellated walk with rods on the merlons, and over it the gale — a band of
 * purple cloud wound sideways, streaked, with a lightning scar caught in it. Down the sides, iron
 * storm shutters on the yard's houses and copper downpipes spilling into the gutters.
 */
export const STORMEYE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(S.slate, 1); g.fillRect(0, 0, W, H);
  // Setts in fans: arcs of small stones, each fan a half-ring.
  for (let fy = top; fy < H + 60; fy += 56) {
    for (let fx = ((fy - top) / 56) % 2 ? -56 : 0; fx < W + 60; fx += 112) {
      for (let r = 10; r <= 56; r += 11) {
        const n = Math.floor(r / 4);
        for (let i = 0; i <= n; i++) {
          const a = Math.PI + (i / n) * Math.PI;
          const x = fx + Math.cos(a) * r, y = fy + 56 + Math.sin(a) * r;
          if (y < top) continue;
          g.fillStyle(rng() < 0.5 ? S.cobble : S.slateLit, 1); g.fillRoundedRect(x - 4, y - 3, 8, 6, 2);
          g.fillStyle(S.slateDark, 0.6); g.fillRect(x - 4, y + 2, 8, 1);
        }
      }
    }
  }
  // Wet sheen: darker patches where the water stands, lighter where it runs off the crown.
  for (let i = 0; i < 14; i++) {
    g.fillStyle(rng() < 0.6 ? S.wet : S.slateLit, 0.25 + rng() * 0.2);
    g.fillEllipse(rng() * W, top + rng() * (H - top), 90 + rng() * 180, 30 + rng() * 60);
  }
  const cx = W / 2, cy = top + (H - top) / 2;
  // Gutters along both sides, running to the drain.
  for (const gx of [70, W - 70]) {
    g.fillStyle(S.slateDark, 1); g.fillRect(gx - 9, top, 18, H - top);
    g.fillStyle(S.wet, 1); g.fillRect(gx - 6, top, 12, H - top);
    for (let y = top + 10; y < H; y += 26) { g.lineStyle(1, S.puddleLit, 0.4); g.lineBetween(gx - 3, y, gx + 2, y + 8); }
  }
  g.lineStyle(10, S.slateDark, 1); g.lineBetween(70, cy, cx - 34, cy); g.lineBetween(W - 70, cy, cx + 34, cy);
  g.lineStyle(6, S.wet, 1); g.lineBetween(70, cy, cx - 34, cy); g.lineBetween(W - 70, cy, cx + 34, cy);
  // The drain: an iron grate in a granite collar.
  g.fillStyle(S.granite, 1); g.fillCircle(cx, cy, 38);
  g.fillStyle(S.graniteLit, 0.6); g.fillCircle(cx - 6, cy - 6, 20);
  g.fillStyle(0x10141a, 1); g.fillCircle(cx, cy, 28);
  g.lineStyle(3, 0x2c323a, 1);
  for (let i = -3; i <= 3; i++) g.lineBetween(cx + i * 7, cy - Math.sqrt(Math.max(0, 28 * 28 - (i * 7) ** 2)), cx + i * 7, cy + Math.sqrt(Math.max(0, 28 * 28 - (i * 7) ** 2)));
  g.lineStyle(2, S.copperDark, 1); g.strokeCircle(cx, cy, 28);
  // Puddles holding the sky.
  for (let i = 0; i < 12; i++) {
    const x = 120 + rng() * (W - 240), y = top + 60 + rng() * (H - top - 100);
    if (Math.abs(x - cx) < 60 && Math.abs(y - cy) < 50) continue;
    const rx = 18 + rng() * 26, ry = 6 + rng() * 6;
    g.fillStyle(S.wet, 1); g.fillEllipse(x, y, rx * 2 + 6, ry * 2 + 4);
    g.fillStyle(S.puddle, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
    g.fillStyle(S.galeLit, 0.35); g.fillEllipse(x - rx * 0.2, y - ry * 0.1, rx * 1.1, ry * 0.6);
    g.fillStyle(S.eyeLit, 0.3); g.fillEllipse(x - rx * 0.4, y - ry * 0.3, rx * 0.5, ry * 0.25);
  }

  // The side houses: storm-shuttered granite fronts with downpipes spilling into the gutters.
  for (const side of [0, W - 46]) {
    g.fillStyle(S.graniteDark, 1); g.fillRect(side, top, 46, H - top);
    for (let y = top + 8; y < H; y += 12) { g.lineStyle(1, dim(S.graniteDark, 0.25), 1); g.lineBetween(side, y, side + 46, y); }
    for (let y = top + 60; y < H - 30; y += 120) {
      g.fillStyle(0x3a4048, 1); g.fillRect(side + 10, y, 26, 30);
      g.fillStyle(S.copperDark, 1); g.fillRect(side + 8, y + 13, 30, 3);
      g.fillStyle(S.lamp, 0.5); g.fillRect(side + 12, y + 2, 22, 1.5);
    }
    const px = side === 0 ? 40 : W - 40;
    for (let y = top + 120; y < H; y += 240) {
      g.fillStyle(S.copperDark, 1); g.fillRect(px - 3, top, 6, y - top);
      g.fillStyle(S.verdigris, 1); g.fillRect(px - 3, y - 4, 6, 4);
      g.fillStyle(S.puddleLit, 0.5); g.fillEllipse(side === 0 ? 62 : W - 62, y + 4, 22, 8);
    }
  }

  // The storm wall along the top, and the gale over it.
  g.fillStyle(S.galeDark, 1); g.fillRect(0, 0, W, top - 26);
  for (let i = 0; i < 70; i++) {
    const y = 4 + rng() * (top - 34), x = rng() * W, L = 40 + rng() * 140;
    g.lineStyle(1 + rng() * 3, rng() < 0.5 ? S.galeLit : S.cloud, 0.2 + rng() * 0.3);
    g.lineBetween(x, y, x + L, y + (rng() - 0.5) * 6);
  }
  for (let i = 0; i < 9; i++) drawCloud(g, rng() * W, 18 + rng() * 34, 30 + rng() * 26, 0.55, rng() < 0.5 ? S.cloud : S.cloudDark, i);
  // A lightning scar frozen in the gale.
  {
    const bx = 160 + rng() * (W - 320);
    let x = bx, y = 0;
    g.lineStyle(5, S.boltGlow, 0.25);
    const pts: { x: number; y: number }[] = [{ x, y }];
    while (y < top - 30) { x += (rng() - 0.5) * 30; y += 8 + rng() * 10; pts.push({ x, y: Math.min(y, top - 30) }); }
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(1.5, S.bolt, 0.85);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  }
  // The wall: granite courses, merlons, and a rod on every third merlon.
  g.fillStyle(S.graniteDark, 1); g.fillRect(0, top - 30, W, 34);
  g.fillStyle(S.granite, 1); g.fillRect(0, top - 26, W, 26);
  for (let x = 0; x < W; x += 30) {
    g.lineStyle(1, S.graniteDark, 0.8); g.lineBetween(x, top - 26, x, top);
    g.lineBetween(x + 15, top - 13, x + 15, top);
  }
  g.lineStyle(1, S.graniteDark, 0.8); g.lineBetween(0, top - 13, W, top - 13);
  for (let x = 0, i = 0; x < W; x += 40, i++) {
    g.fillStyle(S.graniteLit, 1); g.fillRect(x + 4, top - 40, 22, 12);
    g.fillStyle(lit(S.graniteLit, 0.2), 1); g.fillRect(x + 4, top - 40, 22, 2);
    if (i % 3 === 1) drawRod(g, x + 15, top - 40, 34);
  }
  // Spray thrown over the merlons.
  for (let i = 0; i < 30; i++) { g.fillStyle(S.cloudLit, 0.2 + rng() * 0.2); g.fillCircle(rng() * W, top - 36 + rng() * 14, 3 + rng() * 6); }
  // Runoff from the wall-foot, dark along its base.
  g.fillStyle(S.wet, 0.8); g.fillRect(0, top + 4, W, 8);
};
