import type { ArenaFloor } from '../../../../IslesTypes';
import { dim, lit } from '../../../../art/IsleArt';
import {
  CANDLE, GHOST, GILT, GILT_DARK, OAK, OAK_DARK, OAK_LIT, RIBBON, SILVER, SILVER_DEEP,
  cadenzaSigil, candle, casePanel, ghostMouth, organPipe, staveLines,
} from './art';

/**
 * The warden arena: an organ loft inside the instrument. A floor of oak parquet laid herringbone
 * and worn pale down the middle, a stave of five gilt rods inlaid across it with the Maestro's
 * mark in a ring of brass at the centre; the back wall a façade of display pipes, tall in the
 * middle and stepping down, gilt-mouthed, over a run of carved casework; the side walls black oak
 * panelling with candle sconces; and here and there a sealed pipe leaning in the corner with its
 * white ribbon, a ghostly mouth breathing on its tin.
 */
export const ORGAN_FLOOR: ArenaFloor = (g, W, H, rng) => {
  const top = 96;
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, 0, W, H);
  // Herringbone parquet: pairs of blocks at right angles, staggered row on row.
  const B = 28, T = 10;
  for (let y = top - B; y < H + B; y += T * 2) {
    for (let x = -B + ((y / (T * 2)) % 2) * B; x < W + B; x += B * 2) {
      const c1 = rng() < 0.5 ? OAK : dim(OAK, 0.12);
      const c2 = rng() < 0.5 ? OAK_LIT : dim(OAK_LIT, 0.18);
      g.fillStyle(c1, 1); g.fillRect(x, y, B, T - 1);
      g.fillStyle(c2, 1); g.fillRect(x + B, y, T - 1, B);
      g.fillStyle(lit(c1, 0.1), 0.5); g.fillRect(x, y, B, 1.5);
    }
  }
  // The middle walked pale by the wardens.
  g.fillStyle(0xe8c8a0, 0.05); g.fillEllipse(W / 2, (top + H) / 2 + 30, W * 0.7, (H - top) * 0.7);
  // The stave inlaid across the floor.
  staveLines(g, 40, top + 210, W - 80, 26, GILT_DARK, 0.55, 3);
  staveLines(g, 40, top + 210, W - 80, 26, GILT, 0.25, 1);
  // The Maestro's mark at the centre.
  const cx = W / 2, cy = (top + H) / 2 + 30;
  g.fillStyle(OAK_DARK, 0.8); g.fillCircle(cx, cy, 86);
  g.lineStyle(5, GILT_DARK, 0.9); g.strokeCircle(cx, cy, 82);
  g.lineStyle(2, GILT, 0.7); g.strokeCircle(cx, cy, 76);
  cadenzaSigil(g, cx, cy, 58, GILT, 0.75);
  // The back wall: casework, and a façade of display pipes rising over it.
  g.fillStyle(OAK_DARK, 1); g.fillRect(0, top, W, 64);
  for (let x = 0; x < W; x += 80) casePanel(g, x + 2, top + 14, 76, 48);
  g.fillStyle(GILT, 1); g.fillRect(0, top + 62, W, 4);
  for (let i = 0; i < 19; i++) {
    const x = 30 + i * 50;
    const h = 52 - Math.abs(i - 9) * 3.2;
    organPipe(g, x, top + 16, 18, h + 10, { metal: SILVER });
    g.fillStyle(GILT, 0.85); g.fillRect(x - 7, top + 4, 14, 2);
  }
  // Side walls: panelled, with candle sconces.
  for (const x0 of [0, W - 26]) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x0, top + 66, 26, H - top - 66);
    g.fillStyle(OAK, 1); g.fillRect(x0 + 3, top + 66, 20, H - top - 66);
    for (let y = top + 110; y < H - 30; y += 120) {
      g.fillStyle(GILT_DARK, 1); g.fillRect(x0 + 6, y, 14, 4);
      g.fillStyle(CANDLE, 0.06); g.fillCircle(x0 + 13, y - 18, 40);
      candle(g, x0 + 13, y, 0.8, y, true);
    }
  }
  // A sealed pipe leaning in each front corner, its voice breathing on the metal.
  for (const [x, s] of [[70, 1], [W - 70, -1]] as const) {
    organPipe(g, x, H - 14, 26, 120, { metal: SILVER, sealed: true });
    ghostMouth(g, x, H - 40, 0.7, 0.3, 0.6);
    g.fillStyle(SILVER_DEEP, 0.4); g.fillEllipse(x + s * 6, H - 10, 40, 10);
  }
  // Loose ribbons and wax on the floor.
  for (let i = 0; i < 6; i++) {
    const x = 120 + rng() * (W - 240), y = top + 120 + rng() * (H - top - 180);
    g.lineStyle(2, RIBBON, 0.35); g.lineBetween(x, y, x + 18 + rng() * 14, y + (rng() - 0.5) * 10);
    if (rng() < 0.5) { g.fillStyle(0xa82030, 0.6); g.fillCircle(x - 4, y + 3, 2.4); }
  }
  g.fillStyle(GHOST, 0.03); g.fillRect(0, top, W, H - top);
};
