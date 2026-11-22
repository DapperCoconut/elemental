import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit } from '../../../../art/IsleArt';
import {
  AMBER, ARC, BRASS, BRASS_DARK, COPPER, COPPER_DARK, COPPER_LIT, IRON, IRON_DARK, IRON_LIT, PATINA, PORCELAIN, PORCELAIN_DARK,
  STORM, busbar, coilTurn, earthedFigure, insulator, meterDial, ohmSigil,
} from './art';

/**
 * The warden arena: a landing inside the Crown Coil. Iron grating laid over the windings, so the
 * copper turns of the coil glow through the floor beneath your feet; porcelain insulator posts
 * along both sides; the back wall a run of the coil's own windings with a slit open to the storm
 * and a great ammeter set into it, needle in the red. Along the foot of the back wall, behind a
 * rail, a row of the earthed at their cranks — they do not look up. The Empress's ohm is let
 * into the grating at the centre in brass.
 */
export const CROWNCOIL_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(STORM, 1); g.fillRect(0, 0, W, H);
  // The windings under the floor: fat copper turns running across, seen through the grating.
  for (let y = top + 70; y < H + 40; y += 46) {
    g.fillStyle(COPPER_DARK, 1); g.fillRect(0, y, W, 34);
    g.fillStyle(dim(COPPER, 0.25 + rng() * 0.1), 1); g.fillRect(0, y + 3, W, 24);
    g.fillStyle(COPPER_LIT, 0.35); g.fillRect(0, y + 6, W, 3);
    for (let i = 0; i < 6; i++) { g.fillStyle(PATINA, 0.4); g.fillEllipse(rng() * W, y + 24, 30 + rng() * 40, 5); }
  }
  // The grating over it.
  g.lineStyle(3, IRON_DARK, 0.95);
  for (let x = 0; x < W; x += 14) g.lineBetween(x, top + 60, x, H);
  g.lineStyle(2, IRON, 0.9);
  for (let x = 1; x < W; x += 14) g.lineBetween(x, top + 60, x, H);
  g.lineStyle(5, IRON_DARK, 1);
  for (let y = top + 60; y < H; y += 92) g.lineBetween(0, y, W, y);
  g.lineStyle(2, IRON_LIT, 0.6);
  for (let y = top + 59; y < H; y += 92) g.lineBetween(0, y, W, y);
  // The back wall: the coil's windings, a slit to the storm, and the ammeter.
  g.fillStyle(0x0a0806, 1); g.fillRect(0, top, W, 60);
  for (let y = top; y < top + 56; y += 14) {
    g.fillStyle(COPPER_DARK, 1); g.fillRect(0, y, W, 12);
    g.fillStyle(dim(COPPER, 0.2), 1); g.fillRect(0, y + 2, W, 7);
    g.fillStyle(COPPER_LIT, 0.3); g.fillRect(0, y + 3, W, 2);
  }
  g.fillStyle(0x060a14, 1); g.fillRect(60, top + 22, W - 120, 12);
  g.fillStyle(0x1a2440, 1); g.fillRect(60, top + 26, W - 120, 2);
  // Storm-light leaking through the slit.
  for (let i = 0; i < 5; i++) { const x = 120 + rng() * (W - 240); glow(g, x, top + 28, 50, ARC, 0.03, 3); }
  // The ammeter, set into the wall.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(W / 2 - 54, top + 2, 108, 56);
  g.fillStyle(BRASS, 1); g.fillRect(W / 2 - 50, top + 4, 100, 52);
  meterDial(g, W / 2, top + 34, 22, 0.93);
  // A rail along the foot of the wall, and the earthed behind it at their cranks.
  const skins = [0xd8b898, 0xb08a68, 0xc8a080, 0x8a6448, 0xe0c0a0];
  for (let i = 0; i < 11; i++) {
    const x = 50 + i * 86 + rng() * 10;
    if (Math.abs(x - W / 2) < 70) continue;
    earthedFigure(g, x, top + 74, 0.7, skins[i % skins.length], i * 1.3, true);
  }
  busbar(g, 0, top + 80, W, 12);
  // Insulator posts down both sides, a copper rail strung between their heads.
  for (const x of [26, W - 26]) {
    for (let y = top + 130; y < H - 20; y += 110) insulator(g, x, y, 1.15);
    g.lineStyle(2, COPPER, 0.8); g.lineBetween(x, top + 86, x, H - 60);
  }
  // Two coil-turn hoops on the floor either side of centre — the primary winding coming up through.
  for (const x of [W * 0.22, W * 0.78]) {
    coilTurn(g, x, H - 70, 70, 16, 6, false);
    coilTurn(g, x, H - 70, 70, 16, 6, true);
  }
  // The Empress's ohm in brass at the centre, a ring of porcelain studs round it.
  const cx = W / 2, cy = (top + H) / 2 + 30;
  g.fillStyle(0x0a0c12, 0.7); g.fillCircle(cx, cy, 96);
  g.lineStyle(5, BRASS_DARK, 0.9); g.strokeCircle(cx, cy, 90);
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    g.fillStyle(k % 2 ? PORCELAIN : PORCELAIN_DARK, 0.9); g.fillCircle(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90, 4);
  }
  ohmSigil(g, cx, cy, 64, BRASS, 0.75);
  ohmSigil(g, cx, cy, 60, lit(BRASS, 0.3), 0.2);
  // Hazard stripes at the landing's front edge.
  for (let x = 0; x < W; x += 28) { g.fillStyle(AMBER, 0.35); g.fillTriangle(x, H - 8, x + 14, H - 8, x + 7, H - 20); }
};
