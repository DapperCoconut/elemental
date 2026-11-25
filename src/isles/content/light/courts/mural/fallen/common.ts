import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { CANVAS, CANVAS_DARK, GOLD, GOLD_DARK, GOLD_LIT, TIMBER_DARK } from '../palette';

/**
 * Small shared parts for the Mural Court's Fallen Five: the ember-gold eye every Fallen wears, a
 * live-fighter and a half-health test, and the HUD plate — a little gilt picture frame with a
 * primed canvas inside — that each of the five pins its counter to, so the five read as five
 * canvases hung in the same wrong gallery.
 */

/** Every Fallen's ember-gold eye. */
export const EYE = 0xffa040;

/** On the field and not yet down. */
export const alive = (f: Fighter): boolean => f.active && f.hp > 0;

/** True once the foe is at or below half health — the moment each of the five rules turns. */
export const halfDown = (f: Fighter): boolean => f.maxHp > 0 && f.hp / f.maxHp <= 0.5;

/**
 * A gilt frame hung just under the HUD line, centred on `x`: a dark drop shadow, a moulded gold
 * border with corner rosettes and a canvas inside. The five gimmicks draw their meters on it.
 */
export function framePlate(g: G, x: number, y: number, w: number, h: number): void {
  const l = x - w / 2;
  g.fillStyle(0x000000, 0.32); g.fillRect(l + 3, y + 3, w, h);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(l, y, w, h);
  g.fillStyle(GOLD, 1); g.fillRect(l + 2, y + 2, w - 4, h - 4);
  g.fillStyle(GOLD_LIT, 0.8); g.fillRect(l + 2, y + 2, w - 4, 2); g.fillRect(l + 2, y + 2, 2, h - 4);
  g.fillStyle(dim(GOLD, 0.25), 1); g.fillRect(l + 2, y + h - 4, w - 4, 2); g.fillRect(l + w - 4, y + 2, 2, h - 4);
  g.fillStyle(CANVAS_DARK, 1); g.fillRect(l + 5, y + 5, w - 10, h - 10);
  g.fillStyle(CANVAS, 1); g.fillRect(l + 6, y + 6, w - 12, h - 12);
  // Canvas weave, faint.
  g.lineStyle(1, CANVAS_DARK, 0.35);
  for (let k = l + 9; k < l + w - 6; k += 6) g.lineBetween(k, y + 6, k, y + h - 6);
  for (const [cx, cy] of [[l + 3, y + 3], [l + w - 3, y + 3], [l + 3, y + h - 3], [l + w - 3, y + h - 3]]) {
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(cx, cy, 3);
    g.fillStyle(GOLD_DARK, 1); g.fillCircle(cx, cy, 1.2);
  }
}

/** A round counter pip, lit in `col` or left as an empty socket. */
export function pip(g: G, x: number, y: number, r: number, on: boolean, col: number): void {
  g.fillStyle(TIMBER_DARK, 0.55); g.fillCircle(x, y + 1, r + 1);
  g.fillStyle(on ? col : dim(CANVAS_DARK, 0.1), 1); g.fillCircle(x, y, r);
  if (on) { g.fillStyle(lit(col, 0.6), 0.9); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.35); }
}

/** A horizontal meter bar on the plate: `k` (0..1) filled in `col`. */
export function bar(g: G, x: number, y: number, w: number, h: number, k: number, col: number): void {
  g.fillStyle(TIMBER_DARK, 0.6); g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(dim(CANVAS_DARK, 0.12), 1); g.fillRect(x, y, w, h);
  g.fillStyle(col, 1); g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
  g.fillStyle(lit(col, 0.5), 0.6); g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), Math.max(1, h * 0.35));
}
