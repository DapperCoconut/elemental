import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Bind — something in chains, born under a curse, that makes its living off the dead.
 *
 * Every arena a Bind fights in is full of lost souls: small wisps of long-dead elements wandering
 * where nobody can see them. Blackened Eyes shows them, the chain takes them, Siphon drinks them —
 * and a soul drunk dry comes back as a revenant that wants you dead. The ancient god no longer
 * hangs over the arena all match; it only comes when the Ritual pays it in souls.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in BindKit.
 */

const daggers: Ability = {
  id: 'bind-daggers',
  name: 'Chainbound Daggers',
  description: 'Throw a dagger with a short chain trailing behind it, for 11 damage. Daggers that reach a wall stick there for 5 seconds and spit chain fragments at the enemy. Right click detonates every dagger you have out — flying or stuck — into a shotgun spray of sharp chain fragments.',
  displayKey: 'Click',
  cooldown: 380,
  cast(ctx: CastContext) { ctx.bindDaggers(ctx.targetX, ctx.targetY); },
};

const chain: Ability = {
  id: 'bind-chain',
  name: 'Bind',
  description: 'Throw a chain at whatever is in reach nearest your cursor. An enemy is chained to you for 5 seconds — it cannot get far from you, and its cooldowns are 20% longer; recast to anchor the chain where you stand. A lost soul is bound to you and follows you around, visible to everyone.',
  displayKey: 'E',
  cooldown: 2333,
  cast(ctx: CastContext) { ctx.bindChain(ctx.targetX, ctx.targetY); },
};

const eyes: Ability = {
  id: 'bind-eyes',
  name: 'Blackened Eyes',
  description: 'For 8 seconds the whole screen turns inverted and you can see the lost souls — small wisps of long-dead elements wandering the arena. Your hitbox shrinks to your small inner soul, and you walk straight through anything solid.',
  displayKey: 'R',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.bindEyes(); },
};

const siphon: Ability = {
  id: 'bind-siphon',
  name: 'Siphon',
  description: 'Drain the lost soul nearest your cursor. The longer you drink, the more damage you deal — the buff lingers for 3 seconds after you stop (press F again). Every second also wears your curse down for good. Drain a soul dry and it comes back as a revenant: an angry red soul that keeps its distance, winds up, and dashes at you. Keep walking and it just misses — and anyone it runs through takes far worse. Up to 3 revenants.',
  displayKey: 'F',
  cooldown: 2500,
  cast(ctx: CastContext) { ctx.bindSiphon(ctx.targetX, ctx.targetY); },
};

const ritual: Ability = {
  id: 'bind-ritual',
  name: 'Ritual',
  description: 'Stab a dagger into the floor, wake the old red runes and offer every soul on your chain at once. The ancient god comes, unbound and almighty, and rains judgement on the enemy. 1–2 souls: it stays 5 seconds and takes one of your abilities, permanently. 3–4 souls: 8 seconds, and your curse is lifted while it stays. 5–6 souls: 12 seconds, your curse is lifted for 15, and you are given the old prophet\'s protection. Needs at least one soul.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx: CastContext) { ctx.bindRitual(); },
};

export const bindElement: Element = {
  id: 'bind',
  name: 'Bind',
  color: 0xe0b743,
  emoji: '⛓️',
  abilities: [daggers, chain, eyes, siphon, ritual],
};
