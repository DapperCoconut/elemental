import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const growthClick: Ability = {
  id: 'growth-click',
  name: 'Spore Spray',
  description: 'Fire spores in a cone. Morph (Q) can change this to Claws or Virus.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) {
    ctx.fireGrowthClick(ctx.targetX, ctx.targetY);
  },
};

const mutate: Ability = {
  id: 'mutate',
  name: 'Mutate',
  description: 'Choose 1 of 3 random permanent mutations.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) {
    ctx.openMutateMenu();
  },
};

const infect: Ability = {
  id: 'infect',
  name: 'Infect',
  description: 'Launch a dagger that inflicts toxic: 2 dmg/s for 5s.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) {
    ctx.fireInfect(ctx.targetX, ctx.targetY);
  },
};

const bloat: Ability = {
  id: 'bloat',
  name: 'Bloat',
  description: 'Yellow aura 5s. First hit while bloated: release 20 dmg AOE.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) {
    ctx.activateBloat();
  },
};

const mutantMorph: Ability = {
  id: 'mutant-morph',
  name: 'Mutant Morph',
  description: 'Randomly change Click to Spores, Claws, or Virus.',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx: CastContext) {
    ctx.triggerMutantMorph();
  },
};

export const growthElement: Element = {
  id: 'growth',
  name: 'Growth',
  color: 0x88bb22,
  emoji: '🦠',
  abilities: [growthClick, mutate, infect, bloat, mutantMorph],
};
