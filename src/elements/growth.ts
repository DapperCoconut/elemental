import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const growthClick: Ability = {
  id: 'growth-click',
  name: 'Bacterium',
  description: 'Launch a flagellated bacterium that flies straight ahead and deals 12 damage on impact.',
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

const growthVirus: Ability = {
  id: 'growth-virus',
  name: 'Virus',
  description: 'Launch a virus triangle that deals 10 damage and infects for 8s. Infected enemies expel 3 viruses every 2s, which lie on the floor and deal 6 damage to enemies that touch them.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) {
    ctx.growthVirus(ctx.targetX, ctx.targetY);
  },
};

const sporeSpray: Ability = {
  id: 'spore-spray',
  name: 'Spore Spray',
  description: 'Spray 5 green spores in front of you, one after another. Each has 50 HP, blocks projectiles and enemies, and slowly grows (+10 max HP/s, mature after 5s). Spores fade after 10s.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) {
    ctx.growthSporeSpray(ctx.targetX, ctx.targetY);
  },
};

const auxiliaryGrowth: Ability = {
  id: 'auxiliary-growth',
  name: 'Auxiliary Growth',
  description: 'Costs 8 DNA. Plant a nest at your cursor that heals to full, then hatches a 200 HP clone with its own upgrade tree. Press SPACE to switch bodies with it. A dying clone melts into primordial soup — nest on it to inherit its upgrades.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 1000,
  cast(ctx: CastContext) {
    ctx.growthAuxiliaryGrowth(ctx.targetX, ctx.targetY);
  },
};

export const growthElement: Element = {
  id: 'growth',
  name: 'Growth',
  color: 0x88bb22,
  emoji: '🦠',
  abilities: [growthClick, growthEvolve, growthVirus, sporeSpray, auxiliaryGrowth],
};
