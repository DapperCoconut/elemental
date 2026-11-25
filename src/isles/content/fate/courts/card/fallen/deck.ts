import type { G } from '../../../../../art/IsleArt';
import { card, pip, suitColor } from '../art';
import { CARD_BLACK, GILT, GILT_DARK, IVORY, IVORY_SHADE } from '../palette';
import type { Suit } from '../util';

/**
 * The full fifty-two for the Fallen's tables. The court's own `card()` draws ace to six and one
 * picture card; the Fallen deal from a real deck, so this adds the seven-to-ten pip layouts and
 * tells the three picture cards apart (a jack's crown has one point lit, a queen's two, a king's
 * three). Ranks are 1 (ace) to 13 (king).
 */

type UV = [number, number];

/** Pip spots for seven to ten, in half-card units (u across, v down). */
const HIGH: Record<number, UV[]> = {
  7: [[-0.42, -0.6], [0.42, -0.6], [0, -0.3], [-0.42, 0], [0.42, 0], [-0.42, 0.6], [0.42, 0.6]],
  8: [[-0.42, -0.6], [0.42, -0.6], [0, -0.3], [-0.42, 0], [0.42, 0], [0, 0.3], [-0.42, 0.6], [0.42, 0.6]],
  9: [[-0.42, -0.62], [0.42, -0.62], [-0.42, -0.21], [0.42, -0.21], [0, 0], [-0.42, 0.21], [0.42, 0.21], [-0.42, 0.62], [0.42, 0.62]],
  10: [[-0.42, -0.62], [0.42, -0.62], [0, -0.42], [-0.42, -0.21], [0.42, -0.21], [-0.42, 0.21], [0.42, 0.21], [0, 0.42], [-0.42, 0.62], [0.42, 0.62]],
};

/** Blackjack / cribbage worth of a rank: picture cards count ten. */
export const cardValue = (rank: number): number => (rank >= 10 ? 10 : rank);

/**
 * A face-up card of any rank centred on (cx, cy), `w`×`h`, turned by `ang`.
 */
export function rankCard(g: G, cx: number, cy: number, w: number, h: number, ang: number, rank: number, suit: Suit, a = 1): void {
  if (rank <= 6) { card(g, cx, cy, w, h, ang, { face: true, suit, rank, alpha: a }); return; }
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u: number, v: number) => ({ x: cx + u * ca - v * sa, y: cy + u * sa + v * ca });
  const hw = w / 2, hh = h / 2;
  if (rank >= 11) {
    card(g, cx, cy, w, h, ang, { face: true, suit, rank: 0, alpha: a });
    // The crown's lit points: one for a jack, two for a queen, three for a king.
    for (let i = 0; i < 3; i++) {
      const p = P((i - 1) * hw * 0.3, -hh * 0.52);
      g.fillStyle(i < rank - 10 ? GILT : GILT_DARK, a); g.fillCircle(p.x, p.y, Math.max(1, w * 0.06));
    }
    return;
  }
  const quad = (k: number) => [P(-hw * k, -hh * k), P(hw * k, -hh * k), P(hw * k, hh * k), P(-hw * k, hh * k)];
  g.fillStyle(CARD_BLACK, 0.55 * a); g.fillPoints([P(-hw - 1, -hh - 1), P(hw + 1, -hh - 1), P(hw + 1, hh + 1), P(-hw - 1, hh + 1)], true);
  g.fillStyle(IVORY, a); g.fillPoints(quad(1), true);
  g.lineStyle(1, IVORY_SHADE, 0.8 * a); g.strokePoints(quad(0.9), true);
  const col = suitColor(suit);
  const ps = Math.min(hw, hh) * 0.2;
  for (const [u, v] of HIGH[rank]) { const p = P(u * hw, v * hh); pip(g, p.x, p.y, ps, suit, col, a); }
  if (w > 16) {
    const tl = P(-hw * 0.78, -hh * 0.8), br = P(hw * 0.78, hh * 0.8);
    pip(g, tl.x, tl.y, Math.max(1.4, w * 0.06), suit, col, a);
    pip(g, br.x, br.y, Math.max(1.4, w * 0.06), suit, col, a);
  }
}
