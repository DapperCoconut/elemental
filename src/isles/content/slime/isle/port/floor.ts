import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, dim, glow, lit, mixC } from '../../../../art/IsleArt';
import {
  BARK, BARK_DARK, BONE, BONE_SHADE, BRASS, BRUISE, BRUISE_LIT, IRON, LAMP, LAMP_HOT, MIRE, MIRE_DEEP, MIRE_SHEEN, PLANK,
  PLANK_ALT, PLANK_DARK, PLANK_LIT, ROPE, SCUM, SCUM_LIT, VENOM, VENOM_DARK, coilSeal, poly, sag,
} from './art';

/**
 * The fight floor for every Stilthaven quest duel: the Draught deck on a new-moon night. The boards
 * run across the floor in long tarred planks with black water showing through the gaps, the
 * Matriarch's coil-seal is painted big in the middle and scuffed pale by a thousand queues. Along the
 * top (half under the HUD) is the Draught House's stone footing and its barred dosing windows,
 * lamplit, a tin cup on each sill, and the purple queue rope sagging between brass posts. Down the
 * left side the deck ends in a broken edge over the mire, the stilt-heads showing. Along the bottom
 * the deck stops at the black water, mangrove roots arching out of it and a punt at its rope.
 */
export const STILTHAVEN_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 118;
  const BOT = H - 70;

  // Black water under everything — it shows in every gap.
  g.fillStyle(MIRE_DEEP, 1); g.fillRect(0, 0, W, H);

  // ── The planks: long boards running left–right, each its own brown, gaps between.
  let y = TOP;
  while (y < BOT) {
    const ph = 16 + rng() * 6;
    let x = -rng() * 140;
    while (x < W) {
      const len = 180 + rng() * 260;
      const col = mixC(PLANK, rng() < 0.5 ? PLANK_ALT : PLANK_LIT, rng() * 0.4);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(x, y, len, ph - 1);
      g.fillStyle(col, 1); g.fillRect(x + 1, y + 1, len - 3, ph - 3.5);
      g.fillStyle(lit(col, 0.15), 0.5); g.fillRect(x + 6, y + 2, len - 12, 2);
      // Grain, knots and the nail-pairs at each joist.
      for (let k = 0; k < len / 40; k++) { const gx = x + 8 + rng() * (len - 16); g.lineStyle(1, dim(col, 0.3), 0.5); g.lineBetween(gx, y + 4, gx + 14, y + 5); }
      if (rng() < 0.35) { g.fillStyle(dim(col, 0.45), 0.9); g.fillEllipse(x + 20 + rng() * (len - 40), y + ph / 2, 8, 4); }
      for (let n = x + 30; n < x + len - 10; n += 120) { g.fillStyle(IRON, 0.9); g.fillCircle(n, y + 4, 1.1); g.fillCircle(n, y + ph - 5, 1.1); }
      x += len + 2;
    }
    y += ph;
  }
  // Wet: dark patches where the mire slops up through the gaps, and scum in the seams.
  for (let i = 0; i < 26; i++) { g.fillStyle(0x1a1a12, 0.18 + rng() * 0.15); g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 40 + rng() * 120, 8 + rng() * 18); }
  for (let i = 0; i < 90; i++) { g.fillStyle(rng() < 0.5 ? SCUM : SCUM_LIT, 0.5); g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 4 + rng() * 6, 1.6); }
  // A missing plank or two: black water showing, a bubble in it.
  for (const [mx, my, ml] of [[130, H * 0.42, 120], [W - 210, H * 0.72, 90]] as [number, number, number][]) {
    g.fillStyle(MIRE, 1); g.fillRect(mx, my, ml, 14);
    g.fillStyle(MIRE_SHEEN, 0.6); g.fillEllipse(mx + ml * 0.4, my + 7, ml * 0.5, 4);
    g.fillStyle(VENOM_DARK, 0.7); g.fillCircle(mx + ml * 0.7, my + 7, 2.5);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(mx - 2, my - 1, 4, 16); g.fillRect(mx + ml - 2, my - 1, 4, 16);
  }

  // The coil-seal, painted big and scuffed pale down the middle where the queue shuffles.
  coilSeal(g, W / 2 + 40, H * 0.6, 78, 0x0a0a06, 0.3);
  coilSeal(g, W / 2 + 40, H * 0.6, 74, VENOM_DARK, 0.35);
  for (let i = 0; i < 60; i++) { g.fillStyle(PLANK, 0.55); g.fillEllipse(W / 2 - 40 + rng() * 160, H * 0.6 - 70 + rng() * 140, 8 + rng() * 14, 3); }
  // Footprints in the damp, in a shuffling line toward the windows.
  for (let k = 0; k < 22; k++) {
    const fx = 120 + k * 34 + (rng() - 0.5) * 6, fy = TOP + 50 + Math.sin(k * 0.6) * 10 + (k % 2) * 8;
    g.fillStyle(0x1a160e, 0.25); g.fillEllipse(fx, fy, 7, 4);
  }

  // ── Along the top: the Draught House footing, two barred windows lit, the rope in front.
  g.fillStyle(0x3a3832, 1); g.fillRect(0, 0, W, TOP - 8);
  for (let sx = 0; sx < W; sx += 24) {
    for (const [ry, off] of [[4, 0], [28, 12], [52, 0], [76, 12]] as [number, number][]) {
      g.fillStyle(mixC(0x5a564e, 0x34322c, rng()), 1); g.fillRect(sx + off + 1, ry, 22, 22);
    }
  }
  g.fillStyle(SCUM, 0.6); g.fillRect(0, TOP - 26, W, 10);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(0, TOP - 10, W, 10);
  for (const wx of [W * 0.28, W * 0.72]) {
    g.fillStyle(0x0a0a08, 1); g.fillRect(wx - 46, 14, 92, 70);
    g.fillStyle(LAMP, 0.9); g.fillRect(wx - 42, 18, 84, 62);
    g.fillStyle(LAMP_HOT, 0.6); g.fillRect(wx - 20, 24, 36, 20);
    glow(g, wx, 60, 80, LAMP, 0.05, 4);
    for (let k = 0; k < 9; k++) { g.fillStyle(IRON, 1); g.fillRect(wx - 42 + k * 10.5, 14, 3, 70); }
    g.fillStyle(PLANK, 1); g.fillRect(wx - 52, 84, 104, 8);
    for (let c = 0; c < 3; c++) {
      g.fillStyle(0xa8a8a0, 1); g.fillRect(wx - 24 + c * 20, 74, 10, 10);
      g.fillStyle(VENOM, 0.6); g.fillRect(wx - 23 + c * 20, 76, 8, 3);
    }
    // Lamp-light spilling out across the boards below each window.
    g.fillStyle(LAMP, 0.06); poly(g, [[wx - 42, TOP], [wx + 42, TOP], [wx + 110, TOP + 160], [wx - 110, TOP + 160]], LAMP, 0.05);
  }
  coilSeal(g, W / 2, 48, 22, BRASS, 0.9);
  // Purple hangings either side of the seal.
  for (const hx of [W / 2 - 70, W / 2 + 70]) {
    poly(g, [[hx - 16, 6], [hx + 16, 6], [hx + 16, 90], [hx, 80], [hx - 16, 90]], BRUISE, 1);
    coilSeal(g, hx, 40, 7, BRUISE_LIT, 0.9);
  }
  // The queue rope on brass posts, sagging, just under the windows.
  const posts = [60, 230, 400, 560, 730, 900];
  for (let i = 0; i < posts.length - 1; i++) sag(g, { x: posts[i], y: TOP + 4 }, { x: posts[i + 1], y: TOP + 4 }, 9, 3, BRUISE, 1);
  for (const px of posts) {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(px, TOP + 28, 14, 5);
    g.fillStyle(dim(BRASS, 0.3), 1); g.fillEllipse(px, TOP + 26, 12, 5);
    g.fillStyle(BRASS, 1); g.fillRect(px - 2, TOP, 4, 26);
    g.fillStyle(lit(BRASS, 0.4), 1); g.fillCircle(px, TOP - 1, 3.4);
  }

  // ── Along the bottom: the deck's end, black water, arching mangrove roots, a punt.
  g.fillStyle(MIRE, 1); g.fillRect(0, BOT, W, H - BOT);
  g.fillStyle(PLANK_DARK, 1); g.fillRect(0, BOT - 4, W, 6);
  for (let sx = 14; sx < W; sx += 52) {
    g.fillStyle(BARK_DARK, 1); g.fillRect(sx - 4, BOT, 8, 26);
    g.fillStyle(SCUM, 0.9); g.fillRect(sx - 4.5, BOT + 20, 9, 4);
    g.fillStyle(BARK, 1); g.fillCircle(sx, BOT - 2, 4);
  }
  for (let i = 0; i < 14; i++) {
    g.fillStyle(MIRE_SHEEN, 0.35); g.fillEllipse(rng() * W, BOT + 30 + rng() * 34, 40 + rng() * 60, 3);
  }
  // Mangrove prop-roots arching up out of the water at the corners.
  for (const [rx, dir] of [[40, 1], [W - 40, -1]] as [number, number][]) {
    for (let k = 0; k < 5; k++) {
      const fx = rx + dir * (10 + k * 22), fy = H - 6;
      const sx = rx - dir * 10, sy = BOT + 2;
      g.lineStyle(5, BARK_DARK, 1);
      g.beginPath(); g.moveTo(sx, sy);
      for (let t = 1; t <= 8; t++) { const q = t / 8; g.lineTo(sx + (fx - sx) * q, sy + (fy - sy) * q - Math.sin(q * Math.PI) * (26 + k * 6)); }
      g.strokePath();
      g.lineStyle(3, BARK, 1);
      g.beginPath(); g.moveTo(sx, sy);
      for (let t = 1; t <= 8; t++) { const q = t / 8; g.lineTo(sx + (fx - sx) * q, sy + (fy - sy) * q - Math.sin(q * Math.PI) * (26 + k * 6) - 1); }
      g.strokePath();
      g.fillStyle(SCUM, 0.9); g.fillEllipse(fx, fy, 9, 3);
    }
  }
  // A punt at its rope, bottom middle-left, a pole laid along it.
  const bx = W * 0.36, by = H - 30;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(bx, by + 4, 130, 16);
  g.fillStyle(dim(PLANK, 0.4), 1); g.fillRoundedRect(bx - 60, by - 8, 120, 16, 6);
  g.fillStyle(PLANK, 1); g.fillRoundedRect(bx - 58, by - 7, 116, 10, 5);
  g.lineStyle(2, 0x8a7a50, 1); g.lineBetween(bx - 70, by - 10, bx + 66, by - 2);
  sag(g, { x: bx - 56, y: by - 4 }, { x: bx - 90, y: BOT }, 8, 1.2, ROPE, 1);

  // A fang-chip set in the deck's broken corner, bottom right, the Mark scratched on it.
  const fx0 = W - 110, fy0 = BOT - 14;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(fx0, fy0 + 2, 50, 12);
  poly(g, [[fx0 - 18, fy0], [fx0 + 18, fy0], [fx0 + 6, fy0 - 70], [fx0 - 2, fy0 - 74]], BONE_SHADE, 1);
  poly(g, [[fx0 - 16, fy0], [fx0 + 6, fy0], [fx0 - 1, fy0 - 72]], BONE, 1);
  g.fillStyle(0x3a2a1a, 0.8); g.fillCircle(fx0 - 4, fy0 - 30, 2); g.fillCircle(fx0 + 4, fy0 - 30, 2);
  blob(g, fx0, fy0 - 2, 22, 5, SCUM, 0.8, rng, 6);
};
