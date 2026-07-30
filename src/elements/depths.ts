import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Depths — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element pushes damage at the enemy. Depths *baits* them. Its passive is a lie
 * told with light — stand still long enough and the water takes you, leaving nothing behind
 * but a healing algae orb that isn't one; anything that comes to eat it walks into the only
 * window this element has for a burst. Everything else in the kit is another kind of bait:
 * an air pocket a drowning enemy has to run to, a bloom of real heals both sides can reach,
 * and a fish on a line that you have to stand still to land.
 *
 * The consequence is an element that spends most of a match not attacking. Its damage comes
 * in when the enemy has been made to be somewhere — chewing on the lure, sprinting for air,
 * or inside the Megalodon.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in DepthsKit.
 */

const piranha: Ability = {
  id: 'depths-piranha',
  name: 'Piranha',
  description: 'Launch a piranha that latches on and chews for 3 dmg/s over 3s. Five can be on one target at once.',
  displayKey: 'Click',
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.depthsPiranha(ctx.targetX, ctx.targetY); },
};

const lungfish: Ability = {
  id: 'depths-lungfish',
  name: 'Lungfish Strike',
  description: 'Dash and slash for 15 — 30 if the lure just paid out. On a hit, a dark puddle opens across the arena and they start drowning: 5s of air, then 12 dmg/s until they reach it. Miss and you get nothing.',
  displayKey: 'E',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.depthsLungfish(ctx.targetX, ctx.targetY); },
};

const eutrophication: Ability = {
  id: 'depths-eutrophication',
  name: 'Eutrophication',
  description: 'Bloom 12 algae orbs across the arena. Each heals 12 to whoever reaches it first — you or them.',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.depthsEutrophication(); },
};

const angler: Ability = {
  id: 'depths-angler',
  name: 'Angler',
  description: 'Stand still for 3s to land a random fish — icefish, barracuda, pufferfish, bomb fish or gulper eel. Recast to throw it. Every hit you take adds a second to the wait.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.depthsAngler(ctx.targetX, ctx.targetY); },
};

const megalodon: Ability = {
  id: 'depths-megalodon',
  name: 'Megalodon',
  description: 'A shark tears across the arena to your cursor, swallowing anything in its path. It holds them against the wall for 8 dmg/s over 8s, then spits them into the middle.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 50000,
  cast(ctx: CastContext) { ctx.depthsMegalodon(ctx.targetX, ctx.targetY); },
};

export const depthsElement: Element = {
  id: 'depths',
  name: 'Depths',
  color: 0x0e8f9c,
  emoji: '🐟',
  abilities: [piranha, lungfish, eutrophication, angler, megalodon],
};
