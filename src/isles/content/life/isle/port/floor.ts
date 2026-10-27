import type { ArenaFloor } from '../../../../IslesTypes';
import { blob, dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BARK, BARK_DARK, BRASS, EMBER, EMPRESS_DARK, FOAM, HEART, HEART_DARK, MOSS, MOSS_DARK, MOSS_LIT, PEAT, ROOT, ROOT_DARK,
  ROOT_LIT, SEA, SEA_SHALLOW, acornWeight, hollowLog, mossDrape, netHeap, poly, rootArch, verdigraSeal,
} from './art';

/**
 * The fight floor for every Mossgate quest duel: the weighing-floor on the quay at the foot of the
 * tithe-scales. Along the top (half under the HUD) the snapped-off butt of the Elder stands up as a
 * wall of bark and splintered heartwood, two hollow-log doors let into its foot. The floor is the
 * town's paving — the flat tops of surface roots, cut level and laid side by side like floorboards
 * that are still growing, moss packed in every seam. The long shadow of the scales' beam falls across
 * it, and the Empress's seal is inlaid off centre, worn by a century of baskets. Along the bottom the
 * Great Root humps up into its arches, the green harbour showing through them. The middle is clear.
 */
export const MOSSGATE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const TOP = 120;
  const BOT = H - 64;

  // Peat under everything — it shows in the seams.
  g.fillStyle(PEAT, 1); g.fillRect(0, 0, W, H);

  // ── The root paving: long flat root-tops running across, each its own width and red-brown.
  let y = TOP;
  while (y < BOT) {
    const rh = 18 + rng() * 14;
    let x = -rng() * 120;
    while (x < W) {
      const len = 160 + rng() * 260;
      const col = mixC(ROOT, rng() < 0.5 ? ROOT_LIT : ROOT_DARK, rng() * 0.35);
      g.fillStyle(ROOT_DARK, 1); g.fillRoundedRect(x, y, len, rh, rh / 2);
      g.fillStyle(col, 1); g.fillRoundedRect(x + 2, y + 1.5, len - 4, rh - 4, (rh - 4) / 2);
      g.fillStyle(lit(col, 0.18), 0.6); g.fillRoundedRect(x + 10, y + 3, len - 20, 3, 1.5);
      // Bark scars and the odd knot along the root.
      for (let k = 0; k < len / 50; k++) {
        const sx = x + 14 + rng() * (len - 28);
        g.lineStyle(1, dim(col, 0.35), 0.6); g.lineBetween(sx, y + 4, sx + 3, y + rh - 5);
      }
      if (rng() < 0.3) { g.fillStyle(dim(col, 0.4), 0.8); g.fillEllipse(x + 30 + rng() * (len - 60), y + rh / 2, 8, rh * 0.4); }
      x += len + 3;
    }
    // Moss packed into the seam under this row.
    for (let mx = 0; mx < W; mx += 9 + rng() * 12) {
      g.fillStyle(rng() < 0.6 ? MOSS : MOSS_DARK, 0.85); g.fillEllipse(mx, y + rh, 8 + rng() * 6, 4);
    }
    y += rh + 1;
  }
  // Worn pale patches where the queue stands every Weighing Day.
  for (let i = 0; i < 18; i++) {
    g.fillStyle(0xe8d0a8, 0.05 + rng() * 0.05);
    g.fillEllipse(rng() * W, TOP + rng() * (BOT - TOP), 50 + rng() * 120, 12 + rng() * 26);
  }
  // Fallen leaves blown in.
  for (let i = 0; i < 70; i++) {
    const lx = rng() * W, ly = TOP + 10 + rng() * (BOT - TOP - 20);
    if (Math.abs(lx - W / 2) < 150 && Math.abs(ly - H * 0.58) < 110) continue;
    const col = [0x8a6a2a, 0xa07a30, 0x7a4a24, 0x5a7a2a][Math.floor(rng() * 4)];
    const a = rng() * Math.PI;
    g.fillStyle(col, 0.85);
    poly(g, [[lx + Math.cos(a) * 6, ly + Math.sin(a) * 3], [lx - Math.sin(a) * 2, ly + Math.cos(a) * 2], [lx - Math.cos(a) * 6, ly - Math.sin(a) * 3], [lx + Math.sin(a) * 2, ly - Math.cos(a) * 2]], col, 0.85);
  }

  // The beam's shadow: a long dark bar lying diagonally across the floor, chains and pans at its ends.
  g.fillStyle(0x000000, 0.13);
  poly(g, [[W * 0.18, H * 0.33], [W * 0.84, H * 0.44], [W * 0.84, H * 0.455], [W * 0.18, H * 0.345]], 0x000000, 0.13);
  for (const [sx, sy] of [[W * 0.18, H * 0.34], [W * 0.84, H * 0.45]] as [number, number][]) {
    g.fillStyle(0x000000, 0.1); g.fillEllipse(sx, sy + 70, 80, 22);
    g.lineStyle(1.5, 0x000000, 0.08); g.lineBetween(sx, sy, sx - 26, sy + 66); g.lineBetween(sx, sy, sx + 26, sy + 66);
  }

  // The Empress's seal, inlaid in brass and green, scuffed by baskets.
  verdigraSeal(g, W / 2 - 90, H * 0.62, 44, 0x1a140c, 0.35);
  verdigraSeal(g, W / 2 - 90, H * 0.62, 40, EMPRESS_DARK, 0.3);
  g.lineStyle(2, BRASS, 0.25); g.strokeCircle(W / 2 - 90, H * 0.62, 56);
  for (let i = 0; i < 30; i++) {
    g.fillStyle(ROOT, 0.5); g.fillEllipse(W / 2 - 150 + rng() * 120, H * 0.62 - 50 + rng() * 100, 6 + rng() * 12, 3);
  }

  // ── The Elder's butt along the top: bark wall, splintered heartwood, two log doors at its foot.
  g.fillStyle(BARK_DARK, 1); g.fillRect(0, 0, W, TOP);
  g.fillStyle(BARK, 1); g.fillRect(0, 0, W, TOP - 6);
  for (let i = 0; i < 90; i++) {
    const fx = rng() * W;
    g.lineStyle(1.5 + rng(), BARK_DARK, 0.7); g.lineBetween(fx, rng() * 30, fx + (rng() - 0.5) * 4, TOP - 10 - rng() * 30);
  }
  // A band of torn heartwood where the trunk snapped, pale and jagged.
  g.fillStyle(HEART, 1); g.fillRect(0, 30, W, 26);
  for (let x = 0; x < W; x += 9) {
    const len = 6 + Math.abs(Math.sin(x * 0.31)) * 16 + rng() * 6;
    g.fillStyle(HEART, 1); g.fillTriangle(x, 55, x + 9, 55, x + 4 + (rng() - 0.5) * 3, 55 + len);
    g.fillStyle(HEART, 1); g.fillTriangle(x, 31, x + 9, 31, x + 4 + (rng() - 0.5) * 3, 31 - len * 0.7);
  }
  for (let k = 0; k < 40; k++) { g.lineStyle(1, HEART_DARK, 0.4); const gx = rng() * W; g.lineBetween(gx, 32, gx + 1, 54); }
  mossDrape(g, 0, W, TOP - 8, rng, 12);
  // Log-house doors let into the foot of the wall, lamp-lit.
  for (const [lx, face] of [[170, 'e'], [W - 190, 'w']] as [number, 'w' | 'e'][]) {
    hollowLog(g, lx, TOP + 6, 170, 26, { bark: 0x5a4434, face, glow: EMBER, flue: false }, rng);
  }

  // ── The Great Root along the bottom: arches over the harbour, green water between their feet.
  g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, BOT, W, H - BOT);
  g.fillStyle(SEA, 1); g.fillRect(0, BOT + 34, W, H - BOT - 34);
  for (let x = 0; x < W; x += 30) { g.fillStyle(FOAM, 0.25 + rng() * 0.2); g.fillEllipse(x + 15, BOT + 6, 22, 3.5); }
  g.fillStyle(PEAT, 1); g.fillRect(0, BOT - 6, W, 8);
  const spans: [number, number, number][] = [[-30, 210, 46], [250, 470, 54], [510, 720, 50], [760, 990, 48]];
  for (const [a, b, h] of spans) rootArch(g, a, b, H - 8, h, 13, rng);

  // ── Quay clutter at the corners, out of the middle.
  // The acorn pyramid, bottom right.
  for (const [ax, ay] of [[W - 120, BOT - 30], [W - 100, BOT - 30], [W - 80, BOT - 30], [W - 110, BOT - 47], [W - 90, BOT - 47], [W - 100, BOT - 64]] as [number, number][]) {
    acornWeight(g, ax, ay, 8);
  }
  // Tithe baskets waiting, bottom left: honey, turnips, bread.
  for (let k = 0; k < 3; k++) {
    const bx = 70 + k * 30, by = BOT - 26;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(bx, by + 3, 28, 8);
    g.fillStyle(0x8a6a3a, 1); g.fillRoundedRect(bx - 12, by - 18, 24, 18, 3);
    g.lineStyle(1, 0x5a4220, 1); for (let r = 0; r < 4; r++) g.lineBetween(bx - 12, by - 15 + r * 4, bx + 12, by - 15 + r * 4);
    const fill = [0xe8a020, 0xe8e0e8, 0xc88a4a][k];
    g.fillStyle(fill, 1); g.fillCircle(bx - 4, by - 20, 5); g.fillCircle(bx + 5, by - 19, 4.5);
    if (k === 1) { g.fillStyle(0x9a4a8a, 1); g.fillCircle(bx - 4, by - 22, 3); }
  }
  // A net heap under the left door and a moss bale under the right.
  netHeap(g, 90, TOP + 60, 16, rng);
  blob(g, W - 80, TOP + 54, 26, 12, MOSS_DARK, 1, rng);
  blob(g, W - 82, TOP + 50, 22, 9, MOSS, 1, rng);
  g.fillStyle(MOSS_LIT, 0.6); g.fillCircle(W - 88, TOP + 46, 3);
};
