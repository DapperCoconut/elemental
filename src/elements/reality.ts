import { Element } from './Element';

/**
 * Reality's element — inert for the same reason the King's is.
 *
 * The chapel fight parks its body in ArenaScene's `npc` slot so all fifty
 * element kits can wound it unchanged, and that body needs an `Element` no kit
 * reacts to: an id nothing checks, no abilities for the (gated-off) NPC AI to
 * cast. Every attack Reality makes comes from RealityBossKit.
 */
export const realityElement: Element = {
  id: 'reality',
  name: 'Reality',
  color: 0x2b4fd8,
  emoji: '👁️',
  abilities: [],
};
