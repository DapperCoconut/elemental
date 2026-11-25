import type { G } from '../../../../../art/IsleArt';
import { INK, INK_SOFT, PAPER, PAPER_DARK, PAPER_LIT, RED } from '../palette';

/**
 * Small shared parts for the Libretto Court's Fallen Five: the ember-gold eye every Fallen wears,
 * and the HUD's "proof slip" — a strip of galley proof pinned under the HUD line with the Censor's
 * red tick in its corner — that each of the five draws its meter on, so the five read as slips
 * from the same wrong proof of the Score.
 */

/** Every Fallen's ember-gold eye. */
export const EYE = 0xffa040;

/** The court's own champions pay 115; a Fallen pays about double. */
export const FALLEN_COINS = 230;

/**
 * A galley-proof slip centred on `x`, top at `y`: cream stock with a deckled lower edge, a ruled
 * margin and a red proof-reader's tick in the top-left corner.
 */
export function proofSlip(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = x - w / 2;
  g.fillStyle(0x000000, 0.35); g.fillRect(x0 + 3, y + 3, w, h);
  g.fillStyle(PAPER_DARK, 0.96); g.fillRect(x0, y, w, h);
  g.fillStyle(PAPER, 0.96); g.fillRect(x0 + 2, y + 2, w - 4, h - 6);
  g.fillStyle(PAPER_LIT, 0.5); g.fillRect(x0 + 2, y + 2, w - 4, 2);
  // The deckle: little bites out of the lower edge.
  g.fillStyle(PAPER_DARK, 0.96);
  for (let k = 0; k < w - 6; k += 6) g.fillTriangle(x0 + k, y + h, x0 + k + 3, y + h + 3, x0 + k + 6, y + h);
  // The ruled margin and the Censor's tick.
  g.lineStyle(1, RED, 0.45); g.lineBetween(x0 + 14, y + 2, x0 + 14, y + h - 3);
  g.lineStyle(1.6, RED, 0.85); g.lineBetween(x0 + 4, y + 7, x0 + 7, y + 10); g.lineBetween(x0 + 7, y + 10, x0 + 12, y + 4);
  g.lineStyle(1, INK, 0.75); g.strokeRect(x0, y, w, h);
}

/** A row of `n` pips, `lit` of them filled, centred on `x` — counters on a proof slip. */
export function pips(g: G, x: number, y: number, n: number, lit: number, on: number, off = INK_SOFT): void {
  const gap = 11;
  for (let i = 0; i < n; i++) {
    const px = x - ((n - 1) * gap) / 2 + i * gap;
    g.fillStyle(i < lit ? on : off, i < lit ? 1 : 0.25); g.fillCircle(px, y, 3.6);
    g.lineStyle(1, INK, 0.7); g.strokeCircle(px, y, 3.6);
  }
}

/** A thin progress bar on a slip (0..1), ink-ruled. */
export function slipBar(g: G, x: number, y: number, w: number, k: number, color: number): void {
  g.fillStyle(INK, 0.16); g.fillRect(x, y, w, 6);
  g.fillStyle(color, 0.9); g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), 6);
  g.lineStyle(1, INK, 0.7); g.strokeRect(x, y, w, 6);
}
