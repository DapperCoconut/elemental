import { Element } from './Element';
import { Ability } from './Ability';

const deathSweepAbility: Ability = {
  id: 'death-sweep',
  name: 'Death Sweep',
  description: 'Place an oval telegraph at the cursor. 1.5s later, deals 10 dmg (× kill multiplier) to anything caught in the oval — including your own Wisps.',
  displayKey: 'Click',
  cooldown: 1500,
  cast(ctx) { ctx.deathSweep(ctx.targetX, ctx.targetY); },
};

const deathWispsAbility: Ability = {
  id: 'death-wisps',
  name: 'Summon Wisps',
  description: 'Tap: spawn 3 Wisps. Hold: spawn +1 Wisp/sec. Wisps chase and attack their SUMMONER for 15 dmg every 1s. Each Wisp kill grants +2% damage (capped at 50 kills / +100%).',
  displayKey: 'E',
  cooldown: 0,
  cast(ctx) { ctx.deathSummonWisps(3); },
};

const deathWishAbility: Ability = {
  id: 'death-wish',
  name: 'Death Wish',
  description: 'Cursor-target enemy or own Wisp within 80px. A skull hovers over them for 10s. On expiry: deal 25 + 0.25× damage taken during that window.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx) { ctx.deathWish(ctx.targetX, ctx.targetY); },
};

const wispDaemonAbility: Ability = {
  id: 'wisp-daemon',
  name: 'Wisp Daemon',
  description: 'Spawn one oversized Daemon Wisp (27px, 80HP). Melees summoner for 25dmg/s; fires 3-bolt barrage at summoner every 4s. Killing it: +10 kills + 30s Soul Split (double Wisp kills). One Daemon at a time.',
  displayKey: 'F',
  cooldown: 30000,
  cast(ctx) { ctx.deathWispDaemon(); },
};

const deathExecuteAbility: Ability = {
  id: 'death-execute',
  name: 'Execute',
  description: 'Cursor over own Wisp within 50px. If wisp HP ratio < threshold (starts 50%, +10% per success), teleport + instakill it + refresh Q cooldown. At 100%: 3s Black Aura — Q on enemy deals 50dmg and instakills if enemy HP < 20%. Threshold resets to 50% after enemy-execute.',
  displayKey: 'Q',
  cooldown: 25000,
  cast(ctx) { ctx.deathExecute(ctx.targetX, ctx.targetY); },
};

export const deathElement: Element = {
  id: 'death',
  name: 'Death',
  color: 0x440066,
  emoji: '💀',
  abilities: [deathSweepAbility, deathWispsAbility, deathWishAbility, wispDaemonAbility, deathExecuteAbility],
};
