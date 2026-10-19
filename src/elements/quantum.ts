import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Quantum — the element built out of other elements' abilities.
 *
 * Quantum has no kit of its own in the ordinary sense. Each of its five keys carries one other
 * element's ability for that same key, chosen on its customization page from whatever the
 * player has entangled in the Entanglement Lab (`QuantumBonds.ts`, `QuantumLoadout.ts`). In
 * the fight, pressing a key re-keys the whole player side onto that key's element before the
 * press reaches it — upgrades, mastery binds, skin — so the ability casts exactly as it would
 * on its own element (`QuantumKit.routeInput`). One body: the same HP, the same status
 * effects, the same shields, the same cooldown timestamps across every element carried.
 *
 * ── Third State ──
 * The one upgrade Quantum sells (`Upgrades.ts`, slot `click`) makes Quantum *itself* one of the
 * elements that can be slotted. The five abilities below are that kit. They are the only
 * abilities in the game that belong to no element's subject matter — every one of them splits
 * something: the caster's own body into a ring of blades, an ability's cooldown, the arena,
 * the effects riding on you, and finally a parasite that answers being cut in half by becoming
 * two parasites. Without the upgrade nothing can put them on a key.
 *
 * The cost of carrying several kits is Quantum Instability — see `QuantumKit`. Every hit
 * taken adds 1% incoming-damage vulnerability (capped at 50%, decaying 1 per 2s).
 *
 * Obtained by finishing the campaign: it is the sealed 43rd element behind the Amalgam,
 * granted on the profile when that challenge is cleared (see `GameOverScene`).
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
  description: 'Halve the cooldown of the next ability you use. The charge sits on your body, not on this kit, so it survives a shift — arm it here, spend it on any other key.',
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
  description: 'Split every effect currently riding on you along its own length: half the strength, two and a half times the duration. Buffs and debuffs alike, and it reaches whatever your other elements left on you.',
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
