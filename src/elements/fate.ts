import { Element } from './Element';
import { Ability } from './Ability';

const coinToss: Ability = {
  id: 'fate-coin-toss',
  name: 'Coin Toss',
  description: 'Costs 2 coins. Launch 3 coins toward your cursor with 0.3s delay each. Every coin that hits an enemy gives 1 coin back.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx) { ctx.fateCoinToss(ctx.targetX, ctx.targetY); },
};

const slots: Ability = {
  id: 'fate-slots',
  name: 'Slots',
  description: 'Place a slot machine. Press Space near it (costs 1 coin) to spin for 3s — grants a permanent buff or debuff.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) { ctx.fateSpawnSlotMachine(ctx.targetX, ctx.targetY); },
};

const luck: Ability = {
  id: 'fate-luck',
  name: 'Lady Luck',
  description: 'Choose one ability to be Lucky: Click = coins auto-aim, E = +3× positive slots, F = always rolls 6, Q = always 150% return.',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx) { ctx.fateLuck(); },
};

const diceOfDoom: Ability = {
  id: 'fate-dice',
  name: 'Dice of Doom',
  description: 'Costs 3 coins. Launch a large dice projectile — hitting an enemy gives 1–6 coins. Rolling 6 deals double damage and explodes.',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx) { ctx.fateDice(ctx.targetX, ctx.targetY); },
};

const allIn: Ability = {
  id: 'fate-all-in',
  name: 'All In!',
  description: 'Spend ALL coins. After 3s, deal damage equal to 5× your coins. 50% chance: 50% returned. 50% chance: 150% returned.',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx) { ctx.fateAllIn(); },
};

export const fateElement: Element = {
  id: 'fate',
  name: 'Fate',
  color: 0x88eecc,
  emoji: '🃏',
  abilities: [coinToss, slots, luck, diceOfDoom, allIn],
};
