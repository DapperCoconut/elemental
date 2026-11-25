import type { G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, PAPER, PAPER_SHADE } from '../palette';

/**
 * Small shared parts for the Lantern Court's Fallen Five: the ember-gold eye every Fallen wears and
 * the HUD plate their counters hang on — a brass wire-plate like the numbered ones at the foot of
 * every span in the gorge, so the five meters read as labels off the same wires.
 */

/** Every Fallen's ember-gold eye. */
export const EYE = 0xffa040;

/** The player's side in every rule's own drawing: the court's warm gold. */
export const YOU = 0xffd27a;
/** The Fallen's side: ember, the star's colour, not the court's violet. */
export const THEM = 0xff8a3a;

/**
 * A brass wire-plate hung under the HUD line on two little chains, centred on `x`: riveted brass
 * round a paper label. The gimmicks draw their pips and dials on the label.
 */
export function wirePlate(g: G, x: number, y: number, w: number, h: number): void {
  // The chains up to the HUD's edge.
  g.lineStyle(1.2, IRON, 0.8);
  for (const sx of [x - w / 2 + 10, x + w / 2 - 10]) {
    for (let k = 0; k < 3; k++) g.strokeEllipse(sx, y - 9 + k * 3.4, 3, 4.6);
  }
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - w / 2 + 3, y + 3, w, h, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - w / 2, y, w, h, 4);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - w / 2 + 1.5, y + 1.5, w - 3, h - 3, 3);
  g.fillStyle(BRASS_LIT, 0.7); g.fillRect(x - w / 2 + 4, y + 2.5, w - 8, 1.4);
  g.fillStyle(PAPER_SHADE, 1); g.fillRect(x - w / 2 + 6, y + 5, w - 12, h - 10);
  g.fillStyle(PAPER, 1); g.fillRect(x - w / 2 + 7, y + 6, w - 14, h - 12);
  // Rivets.
  g.fillStyle(BRASS_DARK, 1);
  for (const [rx, ry] of [[x - w / 2 + 3.5, y + 3.5], [x + w / 2 - 3.5, y + 3.5], [x - w / 2 + 3.5, y + h - 3.5], [x + w / 2 - 3.5, y + h - 3.5]]) {
    g.fillCircle(rx, ry, 1.6);
  }
}
