import type { ArenaFloor } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { campo, kerb, lampPost, mask, ogeeWindow, palina } from './art';
import {
  CANAL, CANAL_DEEP, CANAL_LIT, CANDLE, GILT, ISTRIA, ISTRIA_DARK, ISTRIA_LIT, SEQUINS, STUCCO_OCHRE, STUCCO_ROSE,
  STUCCOS, VELVET,
} from './palette';

/**
 * The fight floor for every Masquerade encounter: a lamplit campo between palazzi. The top edge
 * (half under the HUD) is a row of stucco fronts with ogee windows lit for the ball and velvet
 * hung from the balconies; the sides are white Istrian quay-kerbs with lamp-posts; the bottom is a
 * strip of canal with striped mooring poles. Spent confetti and sequins lie everywhere — there is
 * always a ball on, or one just ended. The middle is left open for the fights' own props.
 */
export const MASQUE_FLOOR: ArenaFloor = (g, W, H, rng) => {
  campo(g, { x: 0, y: 0, w: W, h: H }, rng);
  // A darker radial wash: lamplight at the edges, dusk in the middle.
  for (let i = 0; i < 6; i++) { g.lineStyle(60, 0x000000, 0.035); g.strokeRect(i * 30, 100 + i * 20, W - i * 60, H - 100 - i * 40); }
  // The palazzi along the top.
  let x = 0;
  let k = 0;
  while (x < W) {
    const w = 140 + rng() * 60;
    const wall = STUCCOS[k++ % STUCCOS.length];
    g.fillStyle(wall, 1); g.fillRect(x, 0, w, 104);
    g.fillStyle(0x000000, 0.15); g.fillRect(x + w - 4, 0, 4, 104);
    for (let i = 0; i < 3; i++) ogeeWindow(g, x + w * (0.22 + i * 0.28), 82, 14, 52, 0x4a3020, rng() < 0.75 ? 1 : 0);
    g.fillStyle(ISTRIA, 1); g.fillRect(x, 90, w, 6);
    if (k % 2) { g.fillStyle(VELVET, 1); g.fillRect(x + w / 2 - 10, 96, 20, 22); g.fillTriangle(x + w / 2 - 10, 118, x + w / 2 + 10, 118, x + w / 2, 126); g.fillStyle(GILT, 1); g.fillCircle(x + w / 2, 106, 3); }
    x += w;
  }
  g.fillStyle(ISTRIA_DARK, 1); g.fillRect(0, 100, W, 8);
  g.fillStyle(ISTRIA_LIT, 1); g.fillRect(0, 100, W, 3);
  // Kerbs and lamps down both sides.
  kerb(g, 0, 108, 14, H - 160);
  kerb(g, W - 14, 108, 14, H - 160);
  for (let y = 200; y < H - 80; y += 170) {
    lampPost(g, 30, y);
    lampPost(g, W - 30, y + 80);
    glow(g, 30, y - 80, 60, CANDLE, 0.04, 3);
    glow(g, W - 30, y, 60, CANDLE, 0.04, 3);
  }
  // The canal along the bottom.
  g.fillStyle(CANAL_DEEP, 1); g.fillRect(0, H - 50, W, 50);
  g.fillStyle(CANAL, 0.85); g.fillRect(0, H - 42, W, 42);
  for (let i = 0; i < 30; i++) { g.lineStyle(1, CANAL_LIT, 0.35); const cx = rng() * W; g.lineBetween(cx, H - 30 + rng() * 22, cx + 20, H - 30 + rng() * 22); }
  kerb(g, 0, H - 56, W, 8);
  for (let i = 0; i < 5; i++) palina(g, 120 + i * 180, H - 14, [STUCCO_ROSE, VELVET, STUCCO_OCHRE][i % 3], ISTRIA_LIT);
  // Confetti and sequins from the last ball, and one lost mask.
  for (let i = 0; i < 160; i++) {
    const c = SEQUINS[i % SEQUINS.length];
    const cx = 30 + rng() * (W - 60), cy = 120 + rng() * (H - 190);
    g.fillStyle(c, 0.55 + rng() * 0.35);
    if (i % 3) g.fillRect(cx, cy, 3, 2); else g.fillCircle(cx, cy, 1.3);
  }
  mask(g, W * 0.72, H * 0.78, 0.6, 'colombina', SEQUINS[0], GILT);
};
