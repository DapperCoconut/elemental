import { Element } from './Element';
import { Ability } from './Ability';

const magmaMace: Ability = {
  id: 'magma-mace',
  name: 'Magma Mace',
  description: 'Always-active lava flail. Click to empower (20% more damage) for 5s, then explodes: 8 lava projectiles + lava pool at ball. 3s 20% shrink after.',
  displayKey: 'Click',
  cooldown: 10000,
  cast(ctx) { ctx.magmaMaceEmpower(); },
};

const magmaBoulder: Ability = {
  id: 'magma-boulder',
  name: 'Magma Boulder',
  description: 'Spawn a 50HP boulder at cursor. Lasts 8s. On break: 12 molten projectiles. Click your own boulder to break it manually.',
  displayKey: 'E',
  cooldown: 12000,
  cast(ctx) { ctx.magmaBoulder(ctx.targetX, ctx.targetY); },
};

const volcano: Ability = {
  id: 'magma-volcano',
  name: 'Volcano',
  description: 'Spawn a volcano at center. Fill lava bar with damage or sacrifice HP (click while near). 1/3: spews lava balls. 2/3: more balls + puddle. Full: massive eruption AoE.',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx) { ctx.magmaVolcano(); },
};

const magmaSplit: Ability = {
  id: 'magma-split',
  name: 'Magma Split',
  description: 'Split into 4 smaller variants (35HP each, own flails). Space spreads them. Die only if all 4 die; recombine deals 20dmg per dead variant. Auto-recombines after 8s.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx) { ctx.magmaSplit(); },
};

const lavaLord: Ability = {
  id: 'magma-lava-lord',
  name: 'Lava Lord',
  description: 'Snake form for 12s. WASD to steer. Leaves lava trail. Contact deals 15 dmg. Collect glowing cores to grow longer and faster.',
  displayKey: 'Q',
  cooldown: 40000,
  cast(ctx) { ctx.magmaLavaLord(); },
};

export const magmaElement: Element = {
  id: 'magma',
  name: 'Magma',
  color: 0xff4500,
  emoji: '🌋',
  abilities: [magmaMace, magmaBoulder, volcano, magmaSplit, lavaLord],
};
