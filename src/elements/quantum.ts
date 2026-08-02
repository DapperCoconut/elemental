import { Element } from './Element';

/**
 * Quantum — the element that is two other elements.
 *
 * Quantum has no abilities of its own. Before a fight the player bonds two elements
 * together; in the fight, the dodge key collapses the bond onto whichever half is not
 * currently active. Both halves share one body: the same HP, the same status effects,
 * the same shields, the same everything. Only the kit on top of it changes.
 *
 * Because a bond is genuinely *being* the other element rather than borrowing from it,
 * the swap re-keys the whole player side of the arena — upgrades, mastery binds, the
 * equipped skin and the ability tray all follow the active half. That is why this
 * `abilities` array is empty: whichever half is live supplies the five slots, and
 * `ArenaScene.playerElement` points at that half, not at this object.
 *
 * The cost of carrying two kits is Quantum Instability — see `QuantumKit`. Every hit
 * taken adds 1% incoming-damage vulnerability (capped at 50%, decaying 1 per 2s), and
 * swapping while unstable tears at the body that is doing the swapping.
 *
 * Obtained by finishing the campaign: it is the sealed 43rd element behind the Amalgam,
 * granted on the profile when that challenge is cleared (see `GameOverScene`). Bonds are
 * then researched one at a time in the Entanglement Lab — see `QuantumBonds.ts`.
 *
 * Note the id: Subterfuge held `quantum` until this element arrived and took the name
 * back. Saves written before that are migrated in `PlayerData`/`CampaignProgress`.
 */
export const quantumElement: Element = {
  id: 'quantum',
  name: 'Quantum',
  color: 0x7df9ff,
  emoji: '⚛️',
  abilities: [],
};
