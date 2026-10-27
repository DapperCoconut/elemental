import type { ArenaFloor } from '../../../../IslesTypes';
import { brandSigil, dim, lit } from '../../../../art/IsleArt';
import { ASH, ASH_LIT, BRAND, BRICK, BRICK_DARK, EMBER, EMBER_DARK, GLOW, IRON, SLATE, SOOT } from './palette';

/**
 * The fight floor for every Hearth Court encounter: a cobbled close between chimney houses.
 * A row of house-fronts glows along the top (half under the HUD), the side kerbs run with soot
 * gutters, the cobbles are ash-grey and stained, and the King's brand is set into the middle of
 * the close in old iron, worn almost flush. The centre is kept quiet — every gimmick paints its
 * own furniture on top of this.
 */
export const HEARTH_FLOOR: ArenaFloor = (g, W, H, rng) => {
  // Cobbles: rows of rounded setts with soot in the joints.
  g.fillStyle(SOOT, 1); g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 18) {
    const off = (Math.floor(y / 18) % 2) * 13;
    for (let x = -off; x < W; x += 26) {
      const v = rng();
      g.fillStyle(v < 0.33 ? ASH : v < 0.66 ? dim(ASH, 0.12) : lit(ASH, 0.05), 1);
      g.fillRoundedRect(x + 1.5, y + 1.5, 23, 15, 5);
    }
  }
  // Soot and ash drifts.
  for (let i = 0; i < 26; i++) {
    g.fillStyle(SOOT, 0.12 + rng() * 0.16);
    g.fillEllipse(rng() * W, 110 + rng() * (H - 110), 60 + rng() * 140, 18 + rng() * 40);
  }
  for (let i = 0; i < 18; i++) {
    g.fillStyle(ASH_LIT, 0.08 + rng() * 0.08);
    g.fillEllipse(rng() * W, 110 + rng() * (H - 110), 40 + rng() * 90, 12 + rng() * 24);
  }

  // The brand in the middle of the close, worn nearly flush.
  brandSigil(g, W / 2, H * 0.58, 92, 0x2a2624, 0.9);
  brandSigil(g, W / 2, H * 0.58, 90, dim(BRAND, 0.6), 0.16);

  // House fronts along the top: brick, glowing windows, branded doors.
  const n = 7;
  for (let i = 0; i < n; i++) {
    const w = W / n;
    const x0 = i * w;
    const base = 104;
    const wall = i % 2 ? BRICK : 0x6f675e;
    g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x0, 0, w, base + 2);
    g.fillStyle(wall, 1); g.fillRect(x0 + 2, 0, w - 4, base);
    for (let k = 0; k < 10; k++) {
      g.fillStyle(dim(wall, 0.15), 0.5);
      g.fillRect(x0 + 4 + rng() * (w - 20), 6 + rng() * (base - 14), 12, 4);
    }
    g.fillStyle(SOOT, 0.3); g.fillRect(x0 + rng() * w * 0.8, 0, 5, base * 0.7);
    for (const s of [-1, 1]) {
      const wx = x0 + w / 2 + s * w * 0.28;
      g.fillStyle(IRON, 1); g.fillRect(wx - 9, 42, 18, 24);
      g.fillStyle(GLOW, 0.14); g.fillCircle(wx, 54, 20);
      g.fillStyle(GLOW, 0.9); g.fillRect(wx - 7, 44, 14, 20);
      g.fillStyle(EMBER, 0.55); g.fillRect(wx - 7, 56, 14, 8);
      g.fillStyle(IRON, 1); g.fillRect(wx - 1, 44, 2, 20);
    }
    g.fillStyle(IRON, 1); g.fillRoundedRect(x0 + w / 2 - 12, base - 34, 24, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(0x3b2a20, 1); g.fillRoundedRect(x0 + w / 2 - 10, base - 32, 20, 32, { tl: 9, tr: 9, bl: 0, br: 0 });
    brandSigil(g, x0 + w / 2, base - 18, 5.5, BRAND, 0.95);
  }
  // The doorsteps' kerb and its gutter.
  g.fillStyle(dim(ASH, 0.3), 1); g.fillRect(0, 104, W, 10);
  g.fillStyle(lit(ASH, 0.1), 1); g.fillRect(0, 104, W, 2);
  g.fillStyle(SOOT, 0.8); g.fillRect(0, 114, W, 5);

  // Side kerbs: low walls with slate coping, a gutter inside each.
  for (const x of [0, W - 16]) {
    g.fillStyle(dim(ASH, 0.35), 1); g.fillRect(x, 114, 16, H - 114);
    g.fillStyle(SLATE, 1); g.fillRect(x, 114, 16, 4);
    g.fillStyle(SOOT, 0.7); g.fillRect(x === 0 ? 16 : W - 21, 118, 5, H - 118);
  }
  // Bottom edge: the close opens onto the street, a drain grate in the middle.
  g.fillStyle(dim(ASH, 0.25), 1); g.fillRect(0, H - 12, W, 12);
  g.fillStyle(IRON, 1); g.fillRect(W / 2 - 30, H - 22, 60, 12);
  g.lineStyle(2, SOOT, 1);
  for (let k = 0; k < 6; k++) g.lineBetween(W / 2 - 25 + k * 10, H - 20, W / 2 - 25 + k * 10, H - 12);

  // Spilled coal, a few still smouldering.
  for (let i = 0; i < 70; i++) {
    const hot = rng() < 0.12;
    g.fillStyle(hot ? EMBER_DARK : SOOT, hot ? 0.9 : 0.75);
    g.fillCircle(rng() * W, 120 + rng() * (H - 130), 1.2 + rng() * 2.4);
  }
  // Coal sacks and a bucket along the kerbs.
  for (const [x, y] of [[40, H - 60], [W - 44, 170], [W - 50, H - 90]] as [number, number][]) {
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 4, 34, 10);
    g.fillStyle(0x4a3c2e, 1); g.fillRoundedRect(x - 14, y - 26, 28, 28, 8);
    g.fillStyle(SOOT, 1); g.fillEllipse(x, y - 26, 22, 8);
    brandSigil(g, x, y - 12, 5, dim(BRAND, 0.2), 0.8);
  }
  g.fillStyle(BRICK_DARK, 0.6); g.fillRect(36, 170, 20, 4);
};
