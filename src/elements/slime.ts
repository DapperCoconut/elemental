import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Venom (element id `slime` — it was Acid, and Slime before that; the id never moved).
 *
 * A plague doctor with a syringe gun. Its toxin does no harm of its own: every stack makes each
 * new negative effect on the victim last 2% longer, up to three times as long at 100. The harm is
 * in the four poisons it loads into the gun, and in the acid it trickles, bombs and rains across
 * the floor.
 *
 * Every `cast` is a one-line delegate; the whole simulation lives in SlimeKit.
 */

const inject: Ability = {
  id: 'venom-inject',
  name: 'Inject',
  description: 'Fire a blob of venom from the syringe gun: 12 damage and 2 toxin. It trickles acid as it flies and leaves a puddle under whoever it hits. Every third shot empties the barrel — you stab yourself to draw it full again. Hold to keep firing.',
  displayKey: 'Click',
  cooldown: 420,
  cast(ctx: CastContext) { ctx.acidInject(ctx.targetX, ctx.targetY); },
};

const pickYourPoison: Ability = {
  id: 'pick-your-poison',
  name: 'Pick Your Poison',
  description: 'Hold for four vials around you and release toward one to load your next Inject. Up — Disintegrating: 5 damage a second for 5s, each tick +3% damage taken (max 15%) for 8s. Right — Paralyzing: 8s of no dashes or dodges, slow and slipping on acid. Down — Purging: 8s with every positive effect stripped. Left — Melting: 8s of double damage on acid, dripping puddles.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.acidPoison(ctx.targetX, ctx.targetY); },
};

const acidReflux: Ability = {
  id: 'acid-reflux',
  name: 'Acid Reflux',
  description: 'Pull out an acid bomb; press again to throw it. It bursts on a wall or an enemy into a wide pool of acid — 25 damage, plus toxin that grows with how much of the arena is acid. Shoot it in the air with Inject and it sheds five cluster bombs. At 15% and 35% acid the bomb grows: 38 then 52 damage, and a bigger blast.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.acidBomb(ctx.targetX, ctx.targetY); },
};

const burrow: Ability = {
  id: 'venom-burrow',
  name: 'Burrow',
  description: 'Only on your acid. Dive under it: invincible, +35% speed, no attacking. Press again — or run out of acid — to come up biting: 30 damage, every negative effect on them back to its full length, and their toxin up by 25%.',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.acidBurrow(); },
};

const acidApocalypse: Ability = {
  id: 'acid-apocalypse',
  name: 'Acid Apocalypse',
  description: 'Acid rain pours over all of your acid for 8s: 6 damage every half-second to every enemy standing in it.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(ctx: CastContext) { ctx.acidApocalypse(); },
};

export const slimeElement: Element = {
  id: 'slime',
  name: 'Venom',
  color: 0x66cc44,
  emoji: '🐍',
  abilities: [inject, pickYourPoison, acidReflux, burrow, acidApocalypse],
};
