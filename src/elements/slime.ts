import { Element } from './Element';
import { Ability } from './Ability';

const poisonWhip: Ability = {
  id: 'poison-whip',
  name: 'Poison Whip',
  description: 'Launch a barrage of 15 acid lashes toward the cursor, 1 dmg each. Standing in acid: 20 lashes.',
  displayKey: 'Click',
  cooldown: 400,
  cast(_ctx) { /* ArenaScene fires the barrage via SlimeKit */ },
};

const vileSpray: Ability = {
  id: 'vile-spray',
  name: 'Vile Spray',
  description: '3 permanent acid pools in front of you. Neon (fresh): 5 dmg on first touch, then cools and ticks 2 dmg/2s forever. Enhances other abilities.',
  displayKey: 'E',
  cooldown: 6000,
  cast(_ctx) { /* ArenaScene spawns the pools via SlimeKit */ },
};

const snakeBurrow: Ability = {
  id: 'snake-burrow',
  name: 'Snake Burrow',
  description: 'Only usable while standing in acid. Burrow underground: invincible, +25% speed. Press again (or leave the acid) to surface.',
  displayKey: 'R',
  cooldown: 2000,
  cast(_ctx) { /* ArenaScene toggles burrow state via SlimeKit */ },
};

const purge: Ability = {
  id: 'purge',
  name: 'Purge',
  description: 'Launch a slow acid ball that strips the target of positive stat boosts. Scales with arena acid coverage: 15/30/45 dmg, 3/8/15s purge, up to 50% bigger and faster.',
  displayKey: 'F',
  cooldown: 6000,
  cast(_ctx) { /* ArenaScene fires the ball via SlimeKit */ },
};

const acidApocalypse: Ability = {
  id: 'acid-apocalypse',
  name: 'Acid Apocalypse',
  description: 'Acid rain pours over every acid pool for 8s, dealing constant damage to enemies standing in one.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(_ctx) { /* ArenaScene runs the rain phase via SlimeKit */ },
};

export const slimeElement: Element = {
  id: 'slime',
  name: 'Acid',
  color: 0x66cc44,
  emoji: '🟢',
  abilities: [poisonWhip, vileSpray, snakeBurrow, purge, acidApocalypse],
};
