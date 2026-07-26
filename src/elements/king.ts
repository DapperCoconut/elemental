import { Element } from './Element';

/**
 * The Disgraced King's element — deliberately inert.
 *
 * The boss fight reuses ArenaScene's `npc` slot as its damageable body so every
 * element kit's damage path works against it unchanged. That body still needs
 * an `Element`, and it must be one no kit reacts to: an id nothing checks for,
 * and no abilities, so the NPC AI (already gated off in boss mode) has nothing
 * to cast even if it ran. All of the King's attacks come from DisgracedKingKit.
 */
export const kingElement: Element = {
  id: 'king',
  name: 'Disgraced King',
  color: 0x5a2b8c,
  emoji: '👑',
  abilities: [],
};
