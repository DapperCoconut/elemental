import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, glow, mixC } from '../../../../art/IsleArt';
import { ABY, drawCoral, drawFish, drawRib } from './palette';

/**
 * The Abyssal Court's fighting floor: a square of the city's silt floor where the bubble's
 * skin comes down close. Across the top wall the membrane bows in, the black deep pressing on
 * it from outside with a passing shoal; a stretch of salvaged planking runs under the middle;
 * a whale rib arches in from the left edge, coral glows in two corners, and two anglerfish
 * street-lamps stand at the bottom. The five gimmicks paint their own rules over this, so the
 * middle stays readable — dark blue, never black.
 */
export const abyssalFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(ABY.silt, 1); g.fillRect(0, 0, W, H);
  // Silt drifts and paler washes.
  for (let i = 0; i < 26; i++) {
    blob(g, rng() * W, top + rng() * (H - top), 60 + rng() * 130, 24 + rng() * 50, rng() < 0.5 ? ABY.siltMid : mixC(ABY.silt, 0x000000, 0.3), 0.5, rng);
  }
  // Ripples.
  for (let i = 0; i < 40; i++) {
    const x = rng() * W, y = top + 40 + rng() * (H - top - 40);
    const r = 18 + rng() * 30;
    g.lineStyle(1.2, ABY.siltLit, 0.18 + rng() * 0.12);
    g.beginPath(); g.arc(x, y + r, r, Math.PI * 1.28, Math.PI * 1.72, false); g.strokePath();
  }
  // A broad apron of ship planks under the middle of the fight.
  const px0 = 150, px1 = W - 150, py0 = top + 110, py1 = H - 90;
  g.fillStyle(ABY.tar, 0.9); g.fillRect(px0 - 6, py0 - 6, px1 - px0 + 12, py1 - py0 + 12);
  for (let y = py0; y < py1; y += 22) {
    let x = px0 + (rng() * 60);
    while (x < px1) {
      const len = Math.min(px1 - x, 80 + rng() * 120);
      if (rng() > 0.05) {
        g.fillStyle(mixC(ABY.hull, ABY.hullMid, rng() * 0.8), 1);
        g.fillRect(x, y + 1, len - 2, 20);
        g.fillStyle(ABY.hullLit, 0.25); g.fillRect(x, y + 1, len - 2, 2);
        g.fillStyle(ABY.rust, 0.7); g.fillCircle(x + 4, y + 11, 1.3); g.fillCircle(x + len - 6, y + 11, 1.3);
      }
      x += len;
    }
  }
  // Barnacles and silt creeping over the planking's edges.
  for (let i = 0; i < 80; i++) {
    const edge = rng() < 0.5;
    const x = edge ? (rng() < 0.5 ? px0 : px1) + (rng() - 0.5) * 30 : px0 + rng() * (px1 - px0);
    const y = edge ? py0 + rng() * (py1 - py0) : (rng() < 0.5 ? py0 : py1) + (rng() - 0.5) * 24;
    g.fillStyle(rng() < 0.6 ? ABY.siltMid : ABY.boneMid, 0.7); g.fillCircle(x, y, 2 + rng() * 4);
  }
  // Shell flecks and grit.
  for (let i = 0; i < 700; i++) {
    g.fillStyle(rng() < 0.8 ? ABY.siltPale : ABY.boneMid, 0.08 + rng() * 0.2);
    g.fillRect(rng() * W, top + rng() * (H - top), 1 + rng() * 2, 1);
  }
  // The membrane across the top wall, the deep outside it, a shoal of lanternfish going by.
  g.fillStyle(ABY.abyss, 1); g.fillRect(0, top, W, 44);
  g.fillStyle(ABY.abyss, 1);
  g.fillEllipse(W / 2, top + 40, W * 1.3, 50);
  for (let i = 0; i < 26; i++) {
    const x = 40 + i * 34 + (rng() - 0.5) * 12, y = top + 14 + rng() * 18;
    drawFish(g, x, y, Math.PI + (rng() - 0.5) * 0.2, 4 + rng() * 2, 0x0f1824, ABY.photo, 0.8);
  }
  g.lineStyle(10, ABY.membraneDim, 0.25);
  g.beginPath(); g.moveTo(0, top + 44);
  for (let x = 0; x <= W; x += 30) g.lineTo(x, top + 44 + Math.sin((x / W) * Math.PI) * 22);
  g.strokePath();
  g.lineStyle(2, ABY.membrane, 0.6);
  g.beginPath(); g.moveTo(0, top + 44);
  for (let x = 0; x <= W; x += 30) g.lineTo(x, top + 44 + Math.sin((x / W) * Math.PI) * 22);
  g.strokePath();
  // A whale rib arching in from the left edge, another from the right.
  drawRib(g, 30, H - 40, 260, 70, 0.3, 0.3);
  drawRib(g, W - 30, top + 230, 150, -50, -0.2, 0.5);
  // Coral in two corners.
  drawCoral(g, W - 70, H - 30, 1.4, ABY.coralRose, rng);
  drawCoral(g, W - 120, H - 20, 1.0, ABY.coralCyan, rng);
  drawCoral(g, 90, top + 90, 1.2, ABY.coralViolet, rng);
  glow(g, W - 80, H - 60, 90, ABY.coralRose, 0.03, 3);
  glow(g, 90, top + 60, 80, ABY.coralViolet, 0.03, 3);
  // Two anglerfish lamps at the foot of the arena.
  for (const [lx, flip] of [[260, 1], [W - 260, -1]] as const) {
    const ly = H - 12;
    g.fillStyle(0x000000, 0.35); g.fillEllipse(lx, ly, 26, 8);
    g.lineStyle(5, ABY.boneMid, 1); g.lineBetween(lx, ly, lx, ly - 62);
    g.lineStyle(4, ABY.boneMid, 1); g.lineBetween(lx, ly - 62, lx + flip * 20, ly - 70);
    g.fillStyle(0x0d2028, 0.95); g.fillCircle(lx + flip * 22, ly - 50, 11);
    g.lineStyle(1.5, ABY.brassDark, 1); g.strokeCircle(lx + flip * 22, ly - 50, 11);
    glow(g, lx + flip * 18, ly - 52, 60, ABY.lure, 0.04, 4);
    g.fillStyle(ABY.lure, 0.95); g.fillCircle(lx + flip * 16, ly - 53, 2.6);
  }
  // A vertebra lying by the right wall, worn smooth where people sit on it.
  const vx = W - 60, vy = top + 340;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(vx, vy + 2, 56, 14);
  g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(vx, vy - 8, 48, 28);
  g.fillStyle(ABY.boneMid, 1); g.fillEllipse(vx, vy - 10, 44, 24);
  g.fillStyle(ABY.bone, 1); g.fillEllipse(vx - 4, vy - 14, 22, 10);
};
