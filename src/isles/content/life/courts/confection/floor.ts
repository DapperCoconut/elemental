import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, CRUMB, GINGER, GINGER_DARK, ICING, MINT, PINK, PINK_PALE, SALT, SALT_DARK, SUGAR, SWEETS, VERDIGRA,
  gardenerMark, piping, twist, wrappedSweet,
} from './art';

/**
 * The Confection Court's fighting floor — the Weighing Yard behind the Sweet-Tax House, where the
 * court's quarrels are settled on Tithe-Day in front of the scales. It is paved like a tray of
 * biscuits: shortbread squares docked with fork-holes alternating with pink wafer tiles, the
 * grout piped in royal icing. A candy-cane kerb runs round the edge. In the middle, inlaid in
 * brass, is the Sweet-Tax's balance with the Gardener's rose in its pan — and under the biscuit,
 * where the tiles have been knocked loose, the grey rock salt the whole yard is laid on shows
 * through, the way it does everywhere in this town if you scratch it.
 */
export const confectionFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(dim(CRUMB, 0.45), 1); g.fillRect(0, 0, W, H);

  // Biscuit tiles: shortbread and wafer in a chequer, each slightly off-true.
  const ts = 60;
  for (let y = top - 20, r = 0; y < H; y += ts, r++) {
    for (let x = -10, c = 0; x < W; x += ts, c++) {
      const wafer = (r + c) % 2 === 1;
      const jx = (rng() - 0.5) * 3, jy = (rng() - 0.5) * 3;
      const bx = x + 3 + jx, by = y + 3 + jy, bw = ts - 6, bh = ts - 6;
      // A few tiles are knocked loose: rock salt underneath.
      if (rng() < 0.05) {
        g.fillStyle(SALT_DARK, 1); g.fillRect(bx, by, bw, bh);
        for (let i = 0; i < 18; i++) { g.fillStyle(rng() < 0.5 ? SALT : lit(SALT, 0.3), 0.9); g.fillRect(bx + rng() * (bw - 4), by + rng() * (bh - 4), 2 + rng() * 4, 2 + rng() * 3); }
        g.fillStyle(GINGER_DARK, 0.6); g.fillTriangle(bx, by, bx + bw * 0.4, by, bx, by + bh * 0.3);
        continue;
      }
      if (wafer) {
        const wc = mixC(PINK_PALE, PINK, rng() * 0.25);
        g.fillStyle(dim(wc, 0.3), 1); g.fillRect(bx, by + 2, bw, bh);
        g.fillStyle(wc, 1); g.fillRect(bx, by, bw, bh);
        // Wafer grid.
        g.lineStyle(1, dim(wc, 0.18), 0.8);
        for (let k = 8; k < bw; k += 8) { g.lineBetween(bx + k, by + 2, bx + k, by + bh - 2); g.lineBetween(bx + 2, by + k, bx + bw - 2, by + k); }
        g.fillStyle(0xffffff, 0.25); g.fillRect(bx, by, bw, 3);
      } else {
        const sc = mixC(0xf0d098, 0xd8a868, rng() * 0.5);
        g.fillStyle(dim(sc, 0.3), 1); g.fillRect(bx, by + 2, bw, bh);
        g.fillStyle(sc, 1); g.fillRect(bx, by, bw, bh);
        // Fork-docked holes in a neat grid, and a baked edge.
        g.fillStyle(dim(sc, 0.3), 0.8);
        for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) g.fillCircle(bx + (bw / 4) * i, by + (bh / 4) * j, 1.6);
        g.lineStyle(2, dim(sc, 0.2), 0.7); g.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        g.fillStyle(lit(sc, 0.25), 0.6); g.fillRect(bx + 2, by + 2, bw - 4, 2);
        // A dusting of sugar.
        for (let i = 0; i < 4; i++) { g.fillStyle(SUGAR, 0.6); g.fillCircle(bx + rng() * bw, by + rng() * bh, 0.9); }
      }
    }
  }
  // Icing grout lines over the joins.
  for (let x = -10; x < W; x += ts) piping(g, [{ x, y: top - 20 }, { x, y: H }], 2, ICING, 0.55);
  for (let y = top - 20; y < H; y += ts) piping(g, [{ x: 0, y }, { x: W, y }], 2, ICING, 0.55);

  // The candy-cane kerb round the yard.
  twist(g, [{ x: 8, y: top - 2 }, { x: W - 8, y: top - 2 }], 8, ICING, 0xe0283c, 1, 12);
  twist(g, [{ x: 8, y: H - 8 }, { x: W - 8, y: H - 8 }], 8, ICING, 0xe0283c, 1, 12);
  twist(g, [{ x: 8, y: top - 2 }, { x: 8, y: H - 8 }], 8, ICING, MINT, 1, 12);
  twist(g, [{ x: W - 8, y: top - 2 }, { x: W - 8, y: H - 8 }], 8, ICING, MINT, 1, 12);

  // The Sweet-Tax balance inlaid in brass at the centre: beam, two pans, the rose in one.
  const cx = W / 2, cy = (H + top) / 2 + 10;
  g.lineStyle(4, dim(BRASS, 0.35), 0.55); g.lineBetween(cx - 150, cy - 30, cx + 150, cy - 18);
  g.lineStyle(3, BRASS, 0.6); g.lineBetween(cx - 150, cy - 32, cx + 150, cy - 20);
  g.lineStyle(3, BRASS, 0.55); g.lineBetween(cx, cy - 30, cx, cy + 60);
  g.fillStyle(BRASS, 0.55); g.fillTriangle(cx - 30, cy + 70, cx + 30, cy + 70, cx, cy + 46);
  for (const [px, py] of [[cx - 150, cy - 32], [cx + 150, cy - 20]] as [number, number][]) {
    g.lineStyle(1.5, BRASS, 0.5); g.lineBetween(px, py, px - 44, py + 56); g.lineBetween(px, py, px + 44, py + 56);
    g.lineStyle(3, BRASS, 0.55); g.strokeEllipse(px, py + 60, 96, 26);
  }
  gardenerMark(g, cx - 150, cy + 26, 16, VERDIGRA, 0.6);
  // In the other pan, a sugar loaf — the tithe, and it is always weighed light.
  g.fillStyle(SUGAR, 0.5); g.fillTriangle(cx + 136, cy + 44, cx + 164, cy + 44, cx + 150, cy + 6);

  // Things dropped on Tithe-Day: a few wrapped sweets, a scatter of crumb and sugar.
  for (let i = 0; i < 14; i++) {
    const x = 40 + rng() * (W - 80), y = top + 30 + rng() * (H - top - 60);
    if (rng() < 0.55) wrappedSweet(g, x, y, 4 + rng() * 2, SWEETS[i % SWEETS.length], rng() * Math.PI, 0.85);
    else { g.fillStyle(GINGER, 0.8); g.fillCircle(x, y, 2 + rng() * 2); g.fillCircle(x + 4, y + 2, 1.5); }
  }
  for (let i = 0; i < 220; i++) { g.fillStyle(SUGAR, 0.35); g.fillCircle(rng() * W, top + rng() * (H - top), 0.8); }
};
