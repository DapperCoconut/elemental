import type { Fighter } from '../../../../../../entities/Fighter';
import type { G } from '../../../../../art/IsleArt';
import { INK, PAGE, PARCH, PARCH_DARK } from '../util';

/**
 * Small shared parts for the Fable Court's Fallen Five: the ember-gold eye every Fallen wears, a
 * live-fighter test, and the HUD's "torn page" plate every one of the five pins its counter to —
 * so the five read as pages of the same wrong edition of the story.
 */

/** Every Fallen's ember-gold eye. */
export const EYE = 0xffa040;

/** On the field and not yet down. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/**
 * A scrap of parchment pinned under the HUD line: a page with a deckled lower edge and an ink
 * border, centred on `x`. The five gimmicks draw their meters on top of it.
 */
export function pagePlate(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x000000, 0.35); g.fillRect(x - w / 2 + 3, y + 3, w, h);
  g.fillStyle(PARCH, 0.95); g.fillRect(x - w / 2, y, w, h);
  g.fillStyle(PAGE, 0.95); g.fillRect(x - w / 2 + 3, y + 3, w - 6, h - 8);
  // The deckle: little bites out of the bottom edge.
  g.fillStyle(PARCH_DARK, 0.9);
  for (let k = 0; k < w; k += 7) g.fillTriangle(x - w / 2 + k, y + h, x - w / 2 + k + 3.5, y + h + 3, x - w / 2 + k + 7, y + h);
  g.lineStyle(1.4, INK, 0.8); g.strokeRect(x - w / 2, y, w, h);
}
