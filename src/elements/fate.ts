import { Element } from './Element';
import { Ability } from './Ability';

const draw: Ability = {
  id: 'fate-draw',
  name: 'Draw',
  description: 'Launch 5 cards at the enemy — damage scales with your poker hand ranking',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx) {
    ctx.fateDrawCards(ctx.targetX, ctx.targetY);
  },
};

const slots: Ability = {
  id: 'fate-slots',
  name: 'Slots',
  description: 'Place a slot machine (2× plant HP). Hold Space near it for 2s to spin for a permanent buff or debuff',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) {
    ctx.fateSpawnSlotMachine(ctx.targetX, ctx.targetY);
  },
};

const force: Ability = {
  id: 'fate-force',
  name: 'Force the Hand',
  description: 'Your next Draw or Slots spin will be lucky — better cards, only good outcomes (🍀)',
  displayKey: 'R',
  cooldown: 25000,
  cast(ctx) {
    ctx.fateForceLucky();
  },
};

const karma: Ability = {
  id: 'fate-karma',
  name: 'Karma',
  description: '6s: 4 orbiting cards deal 8 damage on contact + 25% speed. Afterwards, your next Draw or Slots is unlucky (🔥)',
  displayKey: 'F',
  cooldown: 18000,
  cast(ctx) {
    ctx.fateKarmaBegin();
  },
};

const roll: Ability = {
  id: 'fate-roll',
  name: 'Roll of Fate',
  description: 'Fire a random Ultimate ability from another element',
  displayKey: 'Q',
  cooldown: 45000,
  cast(ctx) {
    ctx.fateRandomUltimate();
  },
};

export const fateElement: Element = {
  id: 'fate',
  name: 'Fate',
  color: 0x88eecc,
  emoji: '🃏',
  abilities: [draw, slots, force, karma, roll],
};
