import { Element } from './Element';
import { Ability, CastContext } from './Ability';

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
 * equipped skin and the ability tray all follow the active half. That is why the five
 * abilities below are normally unreachable: whichever half is live supplies the tray, and
 * `ArenaScene.playerElement` points at that half, not at this object.
 *
 * ── Third State ──
 * The one upgrade Quantum sells (`Upgrades.ts`, slot `click`) puts a third stop on the
 * cycle: the bond becomes first → second → *Quantum*, and the abilities below are what
 * that third stop is. They are the only abilities in the game that belong to no element's
 * subject matter — every one of them splits something: the caster's own body into a ring
 * of blades, an ability's cooldown, the arena, the effects riding on you, and finally a
 * parasite that answers being cut in half by becoming two parasites. Without the upgrade
 * `QuantumKit` never offers this stop at all and the tray below is never built.
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

const atomSplicers: Ability = {
  id: 'quantum-splicers',
  name: 'Atom Splicers',
  description: 'Five blades hold station around you and never leave. Each one cuts for 8 as it sweeps through somebody. Hold to drive the ring out wide and spin it fast — it covers far more ground, but a faster blade is not a heavier one.',
  displayKey: 'Click',
  cooldown: 900,
  cast(ctx: CastContext) { ctx.quantumSplicers(); },
};

const abilitySplit: Ability = {
  id: 'quantum-ability-split',
  name: 'Ability Split',
  description: 'Halve the cooldown of the next ability you use. The charge sits on your body, not on this kit, so it survives a collapse — arm it here, spend it on the other half of your bond.',
  displayKey: 'E',
  cooldown: 11000,
  cast(ctx: CastContext) { ctx.quantumAbilitySplit(); },
};

const arenaSplit: Ability = {
  id: 'quantum-arena-split',
  name: 'Arena Split',
  description: 'Cut the room down the middle for 15 seconds. The enemy cannot cross the seam and neither can anything either of you shoots. You can walk straight through it — your shots still cannot.',
  displayKey: 'R',
  cooldown: 24000,
  cast(ctx: CastContext) { ctx.quantumArenaSplit(); },
};

const effectSplit: Ability = {
  id: 'quantum-effect-split',
  name: 'Effect Split',
  description: 'Split every effect currently riding on you along its own length: half the strength, two and a half times the duration. Buffs and debuffs alike, and it reaches whatever the other half of your bond left on you.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.quantumEffectSplit(); },
};

const quantumParasite: Ability = {
  id: 'quantum-parasite',
  name: 'Quantum Parasite',
  description: 'A ten-segment parasite tears out of the floor and bounces around the room, biting for 35. Its eight middle segments have 35 HP each and anyone — including you — can cut them. Every cut leaves two parasites where there was one; the mouth and the tail can never be killed.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 26000,
  cast(ctx: CastContext) { ctx.quantumParasite(ctx.targetX, ctx.targetY); },
};

export const quantumElement: Element = {
  id: 'quantum',
  name: 'Quantum',
  color: 0x7df9ff,
  emoji: '⚛️',
  abilities: [atomSplicers, abilitySplit, arenaSplit, effectSplit, quantumParasite],
};
