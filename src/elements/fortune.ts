import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Gold — a test element, reachable only from a cheat-mode save for now. The id is still
 * `fortune` (it replaced the old shopkeeper of that name), so saves and campaign data keep it.
 *
 * An alchemist who has stopped pretending the work is about anything but gold. One hand throws
 * whatever is nearest; the other turns it to gold on the way. His purse is the element's one
 * resource, and every ability is either a way to fill it or the one way to spend it — Advance,
 * three stat cards over his head, ten gold a pick, kept for the match.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in FortuneKit.
 */

const fray: Ability = {
  id: 'fortune-fray',
  name: 'Fray',
  description: 'Throw a clump of 7 grass blades forward; your other hand turns them to gold in the air. Then they fall toward the bottom of the screen as if the arena had gravity. 3 damage a blade — small alone, a lot when the whole clump lands. Hold to keep throwing.',
  displayKey: 'Click',
  cooldown: 520,
  cast(ctx: CastContext) { ctx.fortuneFray(ctx.targetX, ctx.targetY); },
};

const advance: Ability = {
  id: 'fortune-advance',
  name: 'Advance',
  description: 'Spend 10 gold: three upgrade cards appear over your head. Click one to keep it for the rest of the match — more damage, less damage taken, speed, shorter cooldowns, max HP, more gold, more blades or regeneration. Picks stack.',
  displayKey: 'E',
  cooldown: 1500,
  cast(ctx: CastContext) { ctx.fortuneAdvance(); },
};

const plume: Ability = {
  id: 'fortune-plume',
  name: 'Gold Plume',
  description: 'Throw a bag of powder that bursts into a cloud of fine golden dust for 6 seconds. Enemies inside take 9 damage a second. Standing inside it yourself earns 2 gold a second.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.fortunePlume(ctx.targetX, ctx.targetY); },
};

const heart: Ability = {
  id: 'fortune-heart',
  name: 'Heart of Gold',
  description: 'Lunge forward and stab with your golden cane for 16. Anyone hit gets a golden heart for 6 seconds: every step they take stresses it, and if they move too much they have a heart attack — 28 damage and a 1.4 second stun. Every 20 damage a gold-hearted enemy takes gives you 1 gold.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.fortuneHeart(ctx.targetX, ctx.targetY); },
};

const midas: Ability = {
  id: 'fortune-midas',
  name: 'Midas Curse',
  description: 'For 10 seconds the enemy nearest your cursor slowly turns to gold, and so does the floor they walk on — permanently. On gold floor you are 50% faster and earn 1 gold every 3 seconds. Their shots turn into gold coins that drop to the ground (+1 gold each when you pick them up), and anything they summon or build turns into a golden statue on the spot (+2 gold).',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.fortuneMidas(ctx.targetX, ctx.targetY); },
};

export const fortuneElement: Element = {
  id: 'fortune',
  name: 'Gold',
  color: 0xd8a531,
  emoji: '🪙',
  abilities: [fray, advance, plume, heart, midas],
};
