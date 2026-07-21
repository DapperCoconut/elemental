import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const growthClick: Ability = {
  id: 'growth-click',
  name: 'Leech Brood',
  description: 'Launch a leech that sticks to an enemy, dealing 3 dmg every 0.5s for 3s. Max 5 leeches per enemy.',
  displayKey: 'Click',
  cooldown: 750,
  cast(ctx: CastContext) {
    ctx.fireGrowthClick(ctx.targetX, ctx.targetY);
  },
};

const growthEvolve: Ability = {
  id: 'growth-evolve',
  name: 'Evolve',
  description: 'Open the DNA upgrade tree: 3 paths of 4 upgrades, each purchasable up to 3 times with DNA earned in combat. Opening it also turns you gray and invincible for up to 5s, on a 20s cooldown.',
  displayKey: 'E',
  cooldown: 200,
  cast(ctx: CastContext) {
    ctx.growthToggleEvolve();
  },
};

const sporeSpread: Ability = {
  id: 'spore-spread',
  name: 'Spore Spread',
  description: 'Launch 3 spores near the cursor. They grow over 5s, then each bursts into 3 secondary spores. Touching a spore deals damage scaled to its size.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) {
    ctx.growthSporeSpread(ctx.targetX, ctx.targetY);
  },
};

const cancer: Ability = {
  id: 'growth-cancer',
  name: 'Cancer',
  description: 'Summon 3 growths that orbit you, each blocking one enemy projectile so you take no damage. Lasts 8s.',
  displayKey: 'F',
  cooldown: 20000,
  cast(ctx: CastContext) {
    ctx.growthCancer();
  },
};

const auxiliaryGrowth: Ability = {
  id: 'auxiliary-growth',
  name: 'Auxiliary Growth',
  description: 'Costs 8 DNA. Plant a nest that heals to full HP, then hatches into a 200 HP clone that fights alongside you, casting Cancer, Spore Spread, and Leech Brood on its own. Die with a clone alive and you inhabit it instead.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 1000,
  cast(ctx: CastContext) {
    ctx.growthAuxiliaryGrowth();
  },
};

export const growthElement: Element = {
  id: 'growth',
  name: 'Growth',
  color: 0x88bb22,
  emoji: '🦠',
  abilities: [growthClick, growthEvolve, sporeSpread, cancer, auxiliaryGrowth],
};
