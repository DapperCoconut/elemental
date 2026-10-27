import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, glow, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, DREAM, FEATHER, LAMP_DIM, LINEN, MOON_GOLD, QUILTS, STITCH, TURF_DARK, WALNUT, WALNUT_LIT, breathMeter, dreamSheep,
  feather, moon, star, stitchLine,
} from './art';

/**
 * The Slumber Court's fighting floor — the Coverlet, the great quilt the whole court sewed for the
 * Prince's investiture and then laid out on the Hushing Yard to settle quarrels on, because nobody
 * can stamp on a quilt loud enough to wake anyone. It is a log-cabin quilt: every block a little
 * square of moon-gold in the middle, with strips of five colours built round it like the logs of
 * a cabin, light on two sides and dark on the other two. A scalloped linen border runs round the
 * edge; four walnut bedposts stand at the corners with their lamps turned down; a moon and a
 * leaping sheep are appliquéd in the middle; and down feathers lie everywhere.
 */
export const slumberFloor: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(TURF_DARK, 1); g.fillRect(0, 0, W, H);

  // Log-cabin blocks, 80px square.
  const bs = 80;
  for (let y = top - 16, r = 0; y < H; y += bs, r++) {
    for (let x = -8, c = 0; x < W; x += bs, c++) {
      const flip = (r + c) % 2;
      const light = mixC(QUILTS[(r * 3 + c) % QUILTS.length], 0xffffff, 0.25);
      const dark = dim(QUILTS[(r + c * 2 + 2) % QUILTS.length], 0.2);
      g.fillStyle(dim(dark, 0.4), 1); g.fillRect(x + 1, y + 2, bs - 2, bs - 2);
      // Rings of strips round the centre, alternating light and dark halves.
      for (let ring = 3; ring >= 0; ring--) {
        const inset = (3 - ring) * 9 + 3;
        const s = bs - inset * 2;
        const col = ring % 2 ? light : dark;
        g.fillStyle(flip ? col : lit(col, 0.06), 1);
        // Light half: top + left triangle; dark half: bottom + right.
        g.fillRect(x + inset, y + inset, s, s);
        g.fillStyle(dim(col, 0.18), 1);
        g.fillTriangle(x + inset + s, y + inset, x + inset + s, y + inset + s, x + inset, y + inset + s);
        stitchLine(g, x + inset + 1, y + inset + 1, x + inset + s - 1, y + inset + 1, STITCH, 0.35, 4, 3);
      }
      // The moon-gold heart of every block.
      g.fillStyle(MOON_GOLD, 1); g.fillRect(x + bs / 2 - 7, y + bs / 2 - 7, 14, 14);
      g.fillStyle(lit(MOON_GOLD, 0.4), 1); g.fillRect(x + bs / 2 - 7, y + bs / 2 - 7, 14, 3);
      g.lineStyle(1, dim(STITCH, 0.2), 0.6); g.strokeRect(x + 1, y + 1, bs - 2, bs - 2);
    }
  }

  // The appliqué in the middle: a crescent moon, a ring of stars, and a dream-sheep mid-leap.
  const cx = W / 2, cy = (H + top) / 2 + 6;
  g.fillStyle(0x2a2a52, 0.85); g.fillEllipse(cx, cy, 300, 200);
  g.lineStyle(3, LINEN, 0.9); g.strokeEllipse(cx, cy, 300, 200);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    stitchLine(g, cx + Math.cos(a) * 142, cy + Math.sin(a) * 94, cx + Math.cos(a + 0.12) * 142, cy + Math.sin(a + 0.12) * 94, LINEN, 0.7, 4, 2);
  }
  moon(g, cx - 64, cy - 20, 38, 0.95, 0.85);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 0.8;
    star(g, cx + 20 + Math.cos(a) * 110, cy + 40 + Math.sin(a) * 90, 6 + (i % 3) * 2, MOON_GOLD, 0.9, i);
  }
  dreamSheep(g, cx + 50, cy + 40, 26, 1, 0, 0.5, 0.95);

  // A scalloped linen border round the whole quilt.
  for (let x = 0; x < W; x += 18) {
    g.fillStyle(dim(LINEN, 0.25), 1); g.fillCircle(x + 9, top - 2, 10); g.fillCircle(x + 9, H - 4, 10);
    g.fillStyle(LINEN, 1); g.fillCircle(x + 9, top - 4, 9); g.fillCircle(x + 9, H - 6, 9);
  }
  for (let y = top; y < H; y += 18) {
    g.fillStyle(dim(LINEN, 0.25), 1); g.fillCircle(2, y + 9, 10); g.fillCircle(W - 2, y + 9, 10);
    g.fillStyle(LINEN, 1); g.fillCircle(4, y + 9, 9); g.fillCircle(W - 4, y + 9, 9);
  }

  // Bedposts at the four corners, each with a hooded lamp turned down and a breath-meter on a nail.
  for (const [px, py] of [[26, top + 26], [W - 26, top + 26], [26, H - 26], [W - 26, H - 26]] as [number, number][]) {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(px + 4, py + 6, 40, 16);
    g.fillStyle(WALNUT, 1); g.fillCircle(px, py, 16);
    g.fillStyle(WALNUT_LIT, 1); g.fillCircle(px - 4, py - 4, 8);
    g.fillStyle(WALNUT, 1); g.fillCircle(px, py, 6);
    glow(g, px, py, 30, LAMP_DIM, 0.04, 3);
    breathMeter(g, px + (px < W / 2 ? 22 : -22), py, 6, 0.15);
  }

  // Down feathers lying where they settled, and a few loose stars of brass thread.
  for (let i = 0; i < 46; i++) feather(g, 40 + rng() * (W - 80), top + 20 + rng() * (H - top - 40), 3 + rng() * 3, rng() * Math.PI, 0.8, FEATHER);
  for (let i = 0; i < 10; i++) star(g, 40 + rng() * (W - 80), top + 30 + rng() * (H - top - 60), 3, BRASS, 0.6, rng() * 3);
  for (let i = 0; i < 160; i++) { g.fillStyle(DREAM, 0.18); g.fillCircle(rng() * W, top + rng() * (H - top), 1); }
};
