import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, BRONZE, COBBLE, COBBLE_ALT, FOAM, GRANITE, GRANITE_DARK, INK, PAPER, SEA,
  SEA_SHALLOW, SNOW, SNOW_SHADE, TUNER_RED, WOOD, WOOD_DARK, bell, ferryHorn, maestroMark, poly, quaver, snowCap,
} from './art';

/**
 * The fight floor for every Carillon Quay quest duel: the singing-mark at the foot of the carillon
 * tower. Along the top (half under the HUD) the tower's granite plinth runs the width of the
 * arena, its ringing-room door and red-and-white bell-ropes looped on cleats, snow along the sill.
 * The floor is the Quay's granite setts, laid in fans; a great stave of five brass lines is let
 * into them right across the floor, so the whole Quay can see where to stand, with the brass
 * studs of the singing-mark ringed off-centre and the Maestro's mark worn by sixty years of feet.
 * Hymn sheets have blown into the corners. Along the bottom the quay edge drops to the harbour: a
 * jetty head with a ferry-horn, and a bell-buoy riding the swell. The middle is clear.
 */
export const CARILLON_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 118;
  const BOT = H - 70;

  // Grout under everything.
  g.fillStyle(0x4a4640, 1); g.fillRect(0, 0, W, H);

  // ── The setts: fan-laid arcs of small granite blocks (the Quay is paved in scallops).
  const fan = 120;
  for (let row = 0; row * fan * 0.5 < BOT - TOP + fan; row++) {
    const cy = TOP + row * fan * 0.5;
    const off = row % 2 ? fan / 2 : 0;
    for (let cx = -fan + off; cx < W + fan; cx += fan) {
      for (let ring = 5; ring >= 1; ring--) {
        const r = (ring / 5) * fan * 0.62;
        const n = 4 + ring * 3;
        for (let k = 0; k < n; k++) {
          const a = Math.PI + (k + 0.5) * (Math.PI / n);
          const sx = cx + Math.cos(a) * r, sy = cy + fan * 0.5 + Math.sin(a) * r;
          if (sy < TOP - 6 || sy > BOT + 6) continue;
          const c = mixC(COBBLE, rng() < 0.5 ? COBBLE_ALT : 0xb0a898, rng() * 0.45);
          g.fillStyle(c, 1); g.fillRoundedRect(sx - 6, sy - 4.5, 12, 9, 2);
          g.fillStyle(lit(c, 0.15), 0.6); g.fillRect(sx - 5, sy - 4, 10, 1.5);
        }
      }
    }
  }
  // Worn pale paths where the Quay walks, and wet patches by the sea.
  for (let i = 0; i < 16; i++) {
    g.fillStyle(0xe8e0d0, 0.04 + rng() * 0.05);
    g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 60 + rng() * 140, 14 + rng() * 24);
  }
  for (let i = 0; i < 10; i++) {
    g.fillStyle(0x2a3a48, 0.08 + rng() * 0.06); g.fillEllipse(rng() * W, BOT - 20 - rng() * 60, 80 + rng() * 80, 14);
  }

  // ── The great stave: five brass lines right across the floor, a treble of notes cut into it.
  const staveY = H * 0.5;
  for (let l = 0; l < 5; l++) {
    const ly = staveY - 44 + l * 22;
    g.fillStyle(BRASS_DARK, 0.9); g.fillRect(0, ly - 2, W, 5);
    g.fillStyle(BRASS, 0.85); g.fillRect(0, ly - 1.5, W, 3);
    g.fillStyle(BRASS_LIT, 0.5); g.fillRect(0, ly - 1.5, W, 1);
  }
  // Bar-lines and notes worn into the setts between them (kept off the middle).
  for (let bx = 60; bx < W; bx += 210) {
    g.fillStyle(BRASS_DARK, 0.8); g.fillRect(bx, staveY - 46, 4, 92);
  }
  for (let k = 0; k < 14; k++) {
    const nx = 30 + k * 68 + rng() * 20;
    if (Math.abs(nx - W / 2) < 130) continue;
    const ny = staveY - 44 + Math.floor(rng() * 9) * 11;
    quaver(g, nx, ny, 1.7, dim(BRASS, 0.2), 0.75);
  }

  // ── The singing-mark: a ring of brass studs, the Maestro's mark worn in the middle.
  const mx = W * 0.34, my = H * 0.66;
  g.fillStyle(0x000000, 0.15); g.fillEllipse(mx, my + 3, 150, 54);
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    const sx = mx + Math.cos(a) * 66, sy = my + Math.sin(a) * 26;
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(sx, sy + 1, 5);
    g.fillStyle(BRASS, 1); g.fillCircle(sx, sy, 4.5);
    g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(sx - 1.2, sy - 1.2, 1.6);
  }
  maestroMark(g, mx, my, 20, 0.55);
  g.fillStyle(COBBLE, 0.35); for (let i = 0; i < 16; i++) g.fillEllipse(mx - 18 + rng() * 36, my - 14 + rng() * 28, 6 + rng() * 6, 3);

  // ── The tower's plinth along the top: ashlar, the door, bell-ropes on cleats, snow on the sill.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, 0, W, TOP);
  for (let cy = 0; cy < TOP - 14; cy += 18) {
    const offx = ((cy / 18) | 0) % 2 ? 0 : 30;
    for (let cx = -offx; cx < W; cx += 60) {
      g.fillStyle(mixC(GRANITE, rng() < 0.5 ? 0xb4aea0 : GRANITE_DARK, rng() * 0.35), 1);
      g.fillRect(cx + 1, cy + 1, 58, 16);
    }
  }
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, TOP - 14, W, 14);
  g.fillStyle(0xb4aea0, 1); g.fillRect(0, TOP - 16, W, 3);
  snowCap(g, 0, TOP - 18, W, TOP - 18, 6);
  // The ringing-room door, centred, under a pointed arch, studded.
  const dx = W / 2;
  g.fillStyle(0x2a2a2e, 1); g.fillRect(dx - 34, TOP - 92, 68, 78); g.fillTriangle(dx - 34, TOP - 92, dx + 34, TOP - 92, dx, TOP - 120);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(dx - 28, TOP - 88, 56, 74);
  g.fillStyle(WOOD, 1); g.fillRect(dx - 26, TOP - 86, 25, 72); g.fillRect(dx + 1, TOP - 86, 25, 72);
  for (let k = 0; k < 4; k++) { g.fillStyle(0x1a1a1e, 1); g.fillCircle(dx - 14, TOP - 76 + k * 16, 2); g.fillCircle(dx + 14, TOP - 76 + k * 16, 2); }
  bell(g, dx, TOP - 48, 0.3, BRASS, { patina: 0 });
  // Bell-ropes down the wall, red-and-white sallies, coiled at the foot.
  for (const rx of [dx - 120, dx - 80, dx + 80, dx + 120]) {
    g.lineStyle(2.5, 0xd8c8a0, 1); g.lineBetween(rx, 0, rx, TOP - 4);
    g.fillStyle(TUNER_RED, 1); g.fillRoundedRect(rx - 4, TOP - 60, 8, 26, 4);
    g.fillStyle(0xf8f6ff, 1); g.fillRect(rx - 4, TOP - 52, 8, 3); g.fillRect(rx - 4, TOP - 44, 8, 3);
    g.lineStyle(2.5, 0xd8c8a0, 1); g.strokeEllipse(rx, TOP + 4, 22, 8);
  }
  // Notices pinned on the plinth: the Hours, and a fine.
  for (const [nx, red] of [[150, false], [W - 170, true]] as [number, boolean][]) {
    g.fillStyle(PAPER, 1); g.fillRect(nx - 26, TOP - 82, 52, 60);
    g.fillStyle(red ? TUNER_RED : INK, 1); g.fillRect(nx - 20, TOP - 76, 40, 5);
    g.lineStyle(1, INK, 0.6); for (let k = 0; k < 6; k++) g.lineBetween(nx - 20, TOP - 64 + k * 6, nx + 14 - (k % 3) * 6, TOP - 64 + k * 6);
    maestroMark(g, nx + 14, TOP - 32, 5);
  }

  // ── The quay edge and the harbour along the bottom.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, BOT, W, 12);
  g.fillStyle(GRANITE, 1); g.fillRect(0, BOT, W, 7);
  for (let x = 0; x < W; x += 48) { g.fillStyle(0x2a2622, 1); g.fillRect(x, BOT, 1.5, 12); }
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, BOT + 12, W, H - BOT - 12);
  g.fillStyle(SEA, 1); g.fillRect(0, BOT + 34, W, H - BOT - 34);
  for (let x = 0; x < W; x += 26) { g.fillStyle(FOAM, 0.22 + rng() * 0.2); g.fillEllipse(x + 13, BOT + 16, 20, 3); }
  for (let i = 0; i < 26; i++) { g.fillStyle(FOAM, 0.08 + rng() * 0.1); g.fillEllipse(rng() * W, BOT + 30 + rng() * 34, 30 + rng() * 50, 2.5); }
  // A jetty head running out on the right, with its ferry-horn.
  const jx = W - 230;
  g.fillStyle(WOOD_DARK, 1); g.fillRect(jx - 40, BOT, 80, H - BOT);
  for (let py = BOT + 2; py < H; py += 10) { g.fillStyle(mixC(WOOD, 0x8a6a48, rng() * 0.5), 1); g.fillRect(jx - 38, py, 76, 8); }
  for (const px of [jx - 40, jx + 36]) { g.fillStyle(0x2a1e14, 1); g.fillRect(px, BOT + 8, 5, H - BOT); }
  ferryHorn(g, jx + 26, BOT + 24, 1);
  // A bell-buoy riding off the left.
  const bx = 150, by = H - 22;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(bx, by + 7, 40, 8);
  g.fillStyle(0x7a1e1e, 1); g.fillEllipse(bx, by, 30, 13);
  g.fillStyle(0xa82a2a, 1); g.fillEllipse(bx, by - 2, 28, 9);
  g.lineStyle(2.5, 0x5a1414, 1); g.lineBetween(bx - 11, by - 3, bx - 8, by - 34); g.lineBetween(bx + 11, by - 3, bx + 8, by - 34);
  g.lineBetween(bx - 8, by - 34, bx + 8, by - 34);
  bell(g, bx, by - 10, 0.4, BRONZE, { patina: 0.7 });

  // ── Snow drifted into the corners against the plinth; hymn sheets blown in.
  for (const [sx, dir] of [[0, 1], [W, -1]] as [number, number][]) {
    for (let k = 0; k < 6; k++) {
      g.fillStyle(k % 2 ? SNOW_SHADE : SNOW, 1);
      g.fillEllipse(sx + dir * (20 + k * 18), TOP + 6 + k * 4, 70 - k * 8, 18 - k * 2);
    }
  }
  for (let i = 0; i < 9; i++) {
    const cx = rng() < 0.5 ? 40 + rng() * 180 : W - 220 + rng() * 180;
    const cy = rng() < 0.5 ? TOP + 30 + rng() * 80 : BOT - 90 + rng() * 70;
    const a = rng() * Math.PI;
    const ca = Math.cos(a) * 9, sa = Math.sin(a) * 9;
    g.fillStyle(0x000000, 0.12); g.fillEllipse(cx + 2, cy + 3, 20, 8);
    poly(g, [
      [cx - ca - sa * 0.7, cy - sa + ca * 0.7], [cx + ca - sa * 0.7, cy + sa + ca * 0.7],
      [cx + ca + sa * 0.7, cy + sa - ca * 0.7], [cx - ca + sa * 0.7, cy - sa - ca * 0.7],
    ], PAPER, 0.95);
    g.lineStyle(0.6, INK, 0.5); g.lineBetween(cx - ca * 0.7, cy - sa * 0.7, cx + ca * 0.7, cy + sa * 0.7);
  }
};
