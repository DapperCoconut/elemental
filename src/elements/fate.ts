import { Element } from './Element';
import { Ability } from './Ability';

const cardThrow: Ability = {
  id: 'fate-card-throw',
  name: 'Card Throw',
  description: 'Throw your highlighted card. You hold up to 6 cards, drawn randomly — click one (or press 1-6) to highlight it. Each card survives 3 throws, tearing a little more each time, before it is shredded.',
  displayKey: 'Click',
  cooldown: 350,
  cast(ctx) { ctx.fateThrowCard(ctx.targetX, ctx.targetY); },
};

const reroll: Ability = {
  id: 'fate-reroll',
  name: 'Reroll',
  description: 'Discard your hand and draw 6 fresh cards.',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx) { ctx.fateReroll(); },
};

const preserve: Ability = {
  id: 'fate-preserve',
  name: 'Preserve',
  description: 'Gild your highlighted card: it gains 3 more uses before it is shredded.',
  displayKey: 'R',
  cooldown: 3000,
  cast(ctx) { ctx.fatePreserve(); },
};

const enchant: Ability = {
  id: 'fate-enchant',
  name: 'Enchant',
  description: 'Your highlighted card turns purple. Its next use deals double effect — combos with Preserve.',
  displayKey: 'F',
  cooldown: 4000,
  cast(ctx) { ctx.fateEnchant(); },
};

const allIn: Ability = {
  id: 'fate-all-in',
  name: 'All In!',
  description: 'Wager 50 HP on a slow orbiting strike. Land it: deal 50 damage. Miss: take 50 damage.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(ctx) { ctx.fateAllIn(); },
};

export const fateElement: Element = {
  id: 'fate',
  name: 'Fate',
  color: 0x88eecc,
  emoji: '🃏',
  abilities: [cardThrow, reroll, preserve, enchant, allIn],
};
