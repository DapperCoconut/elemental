import { Element } from './Element';
import { Ability } from './Ability';
import { supernova } from './fire';
import { ALT_ULT_SLOT } from '../data/AltUlts';

/** Element id → its alternate ultimate. Catalogue text for menus lives in data/AltUlts.ts. */
const ALT_ULT_ABILITIES: Record<string, Ability> = {
  fire: supernova,
};

/**
 * The element a fighter should actually carry: the shared element itself, or — when its
 * upgrade list holds ALT_ULT_SLOT and the element has an alternate — a copy with the Q
 * swapped out. A copy, never a mutation: ELEMENT_MAP's objects are shared by every scene.
 */
export function withAltUlt(el: Element, upgrades: readonly string[]): Element {
  const alt = ALT_ULT_ABILITIES[el.id];
  if (!alt || !upgrades.includes(ALT_ULT_SLOT)) return el;
  return { ...el, abilities: el.abilities.map((a) => (a.isUltimate ? alt : a)) };
}
