import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Wood — a test element, reachable only from a cheat-mode save for now. The id is still
 * `gluttony` (it has been the chef and then Harvest's scarecrow before this), so saves, unlocks
 * and campaign data keep it.
 *
 * A birch ent: pale bark, black marks, and the eye scars birches are known for. The arena is
 * ringed with the same watching birches (Haunting Hollows). Its resource is **Sap HP** — health
 * that sits on top of its own, can climb 100 past its maximum, slowly grows back, and gums up
 * whoever cuts into it. Everything in the kit makes sap, spends it, or reads it: the brew turns
 * health into it, stepping out of a tree grants it, digesting a beating turns the beating into
 * it, and the great scythe kills outright when the ent has enough more health than its victim.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in GluttonyKit.
 */

const carverang: Ability = {
  id: 'wood-carverang',
  name: 'Carverang',
  description: 'Throw a big wooden boomerang that flies a full loop out to the cursor and back to your hand. 12 damage to everything it passes through — it pierces. Right-click swaps which way the loop curls. Throw again just as one is coming home and the returning boomerang swings round and flies back out to the cursor.',
  displayKey: 'Click',
  cooldown: 650,
  cast(ctx: CastContext) { ctx.woodCarverang(ctx.targetX, ctx.targetY); },
};

const oakbrew: Ability = {
  id: 'wood-oakbrew',
  name: 'Oakbrew',
  description: 'Drink a teacup of oakbrew: take 15% less damage for 8 seconds, and 25 of your health turns into Sap HP.',
  displayKey: 'E',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.woodOakbrew(); },
};

const commensalism: Ability = {
  id: 'wood-commensalism',
  name: 'Commensalism',
  description: 'Sink into the ground and step out of the tree at the edge of the arena nearest your cursor, taking its place — the tree is gone until it grows back. Gain 50 Sap HP.',
  displayKey: 'R',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.woodCommensalism(ctx.targetX, ctx.targetY); },
};

const digest: Ability = {
  id: 'wood-digest',
  name: 'Digest',
  description: 'Digest the damage you just took. A healing aura opens around you: 15% of everything you took in the last 5 seconds comes back at once as Sap HP, and another 25% as health over the next 5 seconds. Teammates in the aura are healed too.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.woodDigest(); },
};

const finalHarvest: Ability = {
  id: 'wood-final-harvest',
  name: 'Final Harvest',
  description: 'Take the giant scythe off your back and swing it in a wide arc for 35. If you then have at least 60% more health than an enemy it cut (Sap HP counts), that enemy dies on the spot. Anyone it does not kill is Tainted for the rest of the match: every 25 damage you deal them gives you 5 Sap HP.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 35000,
  cast(ctx: CastContext) { ctx.woodFinalHarvest(ctx.targetX, ctx.targetY); },
};

export const gluttonyElement: Element = {
  id: 'gluttony',
  name: 'Wood',
  color: 0xd9d3c3,
  emoji: '🌳',
  abilities: [carverang, oakbrew, commensalism, digest, finalHarvest],
};
