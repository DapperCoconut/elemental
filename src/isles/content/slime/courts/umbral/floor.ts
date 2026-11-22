import type { ArenaFloor } from '../../../../IslesTypes';
import { blackFlame, fungusShelf, ghostCaps, mouldGround, stiltRoots } from './art';
import { BARK, BARK_DARK, BARK_LIT, CANDLE, IRON, IRON_LIT, LEAF, LEAF_LIT, MOSS, PATH, PATH_DARK, PATH_LIT } from './palette';

/**
 * The fight floor for every Umbral encounter: a clearing among the great trees. Leaf-mould and
 * black moss underfoot with a trodden ring where the court gathers to watch; the trunks of the
 * canopy along the top (half under the HUD), their stilt-roots reaching into the yard; black lamps
 * on crooks down both sides; ghost-caps glowing in the corners; and, set into one root, a shutter
 * with a candle behind it — somebody is watching the fight by the forbidden light.
 */
export const UMBRAL_FLOOR: ArenaFloor = (g, W, H, rng) => {
  mouldGround(g, { x: 0, y: 0, w: W, h: H }, rng);
  // The trodden ring.
  const cx = W / 2, cy = (H + 100) / 2;
  g.fillStyle(PATH_DARK, 0.7); g.fillEllipse(cx, cy, W * 0.86, (H - 100) * 0.84);
  g.fillStyle(PATH, 0.7); g.fillEllipse(cx, cy, W * 0.82, (H - 100) * 0.78);
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
    g.fillStyle(rng() < 0.5 ? PATH_LIT : PATH_DARK, 0.35); g.fillCircle(cx + Math.cos(a) * d * W * 0.4, cy + Math.sin(a) * d * (H - 100) * 0.38, 1 + rng() * 2);
  }
  // Moss creeping in at the ring's edge.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.fillStyle(MOSS, 0.6); g.fillEllipse(cx + Math.cos(a) * W * 0.41, cy + Math.sin(a) * (H - 100) * 0.39, 40 + rng() * 30, 14 + rng() * 10);
  }
  // The trunks along the top, roots reaching down into the yard.
  g.fillStyle(LEAF, 1); g.fillRect(0, 0, W, 40);
  for (let x = 40; x < W; x += 150 + rng() * 40) {
    const r = 22 + rng() * 12;
    g.fillStyle(BARK_DARK, 1); g.fillRect(x - r - 2, 0, r * 2 + 4, 104);
    g.fillStyle(BARK, 1); g.fillRect(x - r, 0, r * 2, 104);
    g.lineStyle(1.5, BARK_LIT, 0.3); g.lineBetween(x - r * 0.4, 0, x - r * 0.3, 100);
    stiltRoots(g, x, 112, r * 0.8, 4, rng);
    fungusShelf(g, x + r * 0.9, 60 + rng() * 20, 1, false);
  }
  g.fillStyle(LEAF_LIT, 0.25); for (let i = 0; i < 30; i++) g.fillEllipse(rng() * W, rng() * 30, 30, 8);
  // Black lamps on crooks down both sides.
  for (let i = 0; i < 4; i++) {
    for (const [x, d] of [[22, 1], [W - 22, -1]] as [number, number][]) {
      const y = 190 + i * ((H - 250) / 3);
      g.lineStyle(3, IRON, 1); g.lineBetween(x, y + 30, x, y - 22);
      g.lineStyle(1, IRON_LIT, 0.5); g.lineBetween(x - 1, y + 30, x - 1, y - 22);
      g.lineStyle(2.5, IRON, 1); g.beginPath(); g.arc(x + d * 6, y - 22, 6, d > 0 ? Math.PI : 0, d > 0 ? 0 : Math.PI, d < 0); g.strokePath();
      g.lineStyle(1, IRON, 1); g.lineBetween(x + d * 12, y - 22, x + d * 12, y - 14);
      blackFlame(g, x + d * 12, y - 4, 0.75, i * 0.9 + (d > 0 ? 0 : 0.4));
    }
  }
  // Ghost-caps in the corners.
  ghostCaps(g, 90, H - 50, 7, rng);
  ghostCaps(g, W - 110, H - 60, 6, rng);
  ghostCaps(g, W - 160, 150, 5, rng);
  // A shutter in a root at the bottom, a candle behind it: someone is watching.
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(W * 0.3, H - 6, 160, 36);
  g.fillStyle(BARK, 1); g.fillEllipse(W * 0.3, H - 8, 150, 30);
  g.fillStyle(0x0a0608, 1); g.fillRect(W * 0.3 - 10, H - 20, 20, 12);
  g.fillStyle(CANDLE, 0.9); g.fillRect(W * 0.3 - 1, H - 19, 2, 10);
  for (let k = 3; k >= 1; k--) { g.fillStyle(CANDLE, 0.04); g.fillCircle(W * 0.3, H - 14, 8 + k * 8); }
};
