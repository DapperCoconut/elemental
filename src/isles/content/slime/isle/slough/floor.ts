import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import { BONE, BRUISE, SKIN, SKIN_DARK, SKIN_DEEP, SKIN_LIT, VENOM, VENOM_DEEP, VENOM_LIT, cornerWeb, fangRock, markSigil, scaleField } from './art';

/**
 * The warden arena: a stretch of the Slough's own belly. The floor is the inside of the cast skin —
 * broad belly-scutes laid across the room like floorboards, papery and pale, with the mire's green
 * light coming up through the thin ones. A venom runnel crosses it where the skin has split and the
 * mire seeps in; the hide walls fold up on either side, scale-rowed and ridged, with mangrove shadows
 * pressed against them from outside. The Mark is scratched into the belly at the centre, deep, the
 * way the milkers scratch it on every bucket, and the corners are thick with web.
 */
export const SLOUGH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(SKIN_DEEP, 1); g.fillRect(0, 0, W, H);
  // Belly-scutes: wide plates running across the room, each overlapping the next.
  const P = 44;
  for (let y = top; y < H + P; y += P) {
    const c = rng() < 0.5 ? SKIN : dim(SKIN, 0.08);
    g.fillStyle(dim(c, 0.35), 1); g.fillRect(0, y - 4, W, P + 4);
    g.fillStyle(c, 1); g.fillRect(0, y, W, P - 6);
    g.fillStyle(lit(c, 0.2), 0.6); g.fillRect(0, y, W, 3);
    // The scute's free edge: a shallow scalloped lip.
    for (let x = 0; x < W; x += 30) {
      g.fillStyle(dim(c, 0.18), 1); g.fillEllipse(x + 15, y + P - 6, 30, 8);
    }
    // Wear and thin places.
    for (let i = 0; i < 6; i++) {
      g.fillStyle(rng() < 0.6 ? SKIN_LIT : SKIN_DARK, 0.18);
      g.fillEllipse(rng() * W, y + 6 + rng() * (P - 16), 20 + rng() * 60, 4 + rng() * 6);
    }
    if (rng() < 0.5) { g.fillStyle(VENOM_LIT, 0.08); g.fillEllipse(rng() * W, y + P / 2, 80 + rng() * 120, 18); }
  }
  // The split, and the mire seeping up through it as a venom runnel.
  g.lineStyle(26, 0x0a0e06, 0.85);
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * W, y = H - 120 + Math.sin(i * 0.7) * 28 - i * 4;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  g.lineStyle(14, VENOM_DEEP, 1);
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * W, y = H - 120 + Math.sin(i * 0.7) * 28 - i * 4;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  g.lineStyle(5, VENOM, 0.6);
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * W, y = H - 122 + Math.sin(i * 0.7) * 28 - i * 4;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  for (let i = 0; i < 18; i++) {
    const f = rng();
    g.fillStyle(VENOM_LIT, 0.5); g.fillCircle(f * W, H - 122 + Math.sin(f * 24 * 0.7) * 28 - f * 96 + (rng() - 0.5) * 6, 1.5 + rng() * 2);
  }
  // The hide walls: the back fold, scale-rowed, and the two side folds.
  scaleField(g, 0, top, W, 54, SKIN_DARK, rng, 24);
  g.fillStyle(0x0a0e06, 0.35); g.fillRect(0, top + 46, W, 10);
  for (let x = 40; x < W; x += 140 + rng() * 80) {
    g.lineStyle(4, 0x0a0e06, 0.25);
    g.lineBetween(x, top, x - 18, top + 50); g.lineBetween(x + 12, top, x + 20, top + 50);
  }
  for (const x0 of [0, W - 44]) {
    scaleField(g, x0, top + 54, 44, H - top - 54, dim(SKIN_DARK, 0.1), rng, 20);
    g.fillStyle(SKIN, 0.7); g.fillRect(x0 === 0 ? 40 : x0, top + 54, 4, H - top - 54);
  }
  // White fangs standing out of the floor near the walls — the skin was cast over them.
  fangRock(g, 82, top + 150, 46, 0.25); fangRock(g, 70, H - 60, 38, 0.15);
  fangRock(g, W - 84, top + 170, 52, -0.25); fangRock(g, W - 72, H - 70, 34, -0.1);
  // The Mark, scratched deep into the belly at the centre.
  const cx = W / 2, cy = (top + H) / 2 + 8;
  g.fillStyle(0x0a0e06, 0.35); g.fillCircle(cx, cy, 104);
  g.lineStyle(3, BONE, 0.25); g.strokeCircle(cx, cy, 100);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    g.lineStyle(2, BONE, 0.2); g.lineBetween(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92, cx + Math.cos(a) * 100, cy + Math.sin(a) * 100);
  }
  markSigil(g, cx, cy, 70, dim(BRUISE, 0.2), 0.75);
  markSigil(g, cx, cy, 66, VENOM, 0.22);
  // Web in every corner, and dropped scale-flakes.
  cornerWeb(g, 44, top + 54, 90, 0, 0.3);
  cornerWeb(g, W - 44, top + 54, 90, Math.PI / 2, 0.3);
  cornerWeb(g, 44, H, 70, -Math.PI / 2, 0.22);
  cornerWeb(g, W - 44, H, 70, Math.PI, 0.22);
  for (let i = 0; i < 50; i++) {
    g.fillStyle(rng() < 0.5 ? SKIN_LIT : SKIN_DARK, 0.5);
    g.fillEllipse(60 + rng() * (W - 120), top + 70 + rng() * (H - top - 90), 5 + rng() * 5, 3 + rng() * 2);
  }
};
