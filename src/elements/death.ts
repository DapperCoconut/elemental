import { Element } from './Element';
import { Ability } from './Ability';

const death1000BladesAbility: Ability = {
  id: 'death-1000-blades',
  name: '1000 Blades',
  description: 'Click an enemy or wisp within 50px to slash it for 1 + (kills÷5) damage. No cooldown.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx) { ctx.death1000Blades(ctx.targetX, ctx.targetY); },
};

const deathSummonWispsAbility: Ability = {
  id: 'death-summon-wisps',
  name: 'Summon Wisps',
  description: 'Tap: spawn 3 Wisps from the River Styx. Hold: spawn +1/sec. Wisps chase their summoner for 15 dmg/s. Every 5 wisp kills: +1 click damage.',
  displayKey: 'E',
  cooldown: 0,
  cast(ctx) { ctx.deathSummonWisps(3); },
};

const deathLoomingDreadAbility: Ability = {
  id: 'death-looming-dread',
  name: 'Looming Dread',
  description: 'Orbit a scythe around the enemy for 5s — damages nearby wisps. Clicking enemy reduces timer by 0.2s. On expiry: deals 35 damage.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx) { ctx.deathLoomingDread(); },
};

const deathWispDaemonAbility: Ability = {
  id: 'death-wisp-daemon',
  name: 'Wisp Daemon',
  description: 'Spawn one oversized Daemon Wisp (80HP). Melees summoner for 25dmg/s; fires 3-bolt barrage every 4s. Killing it unlocks Trail Dash for 30s.',
  displayKey: 'F',
  cooldown: 30000,
  cast(ctx) { ctx.deathWispDaemon(); },
};

const deathJudgementAbility: Ability = {
  id: 'death-judgement',
  name: 'Judgement Day',
  description: 'Summon a hole. Arms after 15s (click to speed up). When armed, sucks enemy in for 3s. Effect depends on wisp kill count (9 tiers).',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx) { ctx.deathJudgement(); },
};

// 6th ability (hidden from HUD — used when Trail Dash mode is active)
const deathTrailDashAbility: Ability = {
  id: 'death-trail-dash',
  name: 'Trail Dash',
  description: 'Dash forward leaving slash trails. Enemies in trail take tick damage equal to click damage.',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx) { ctx.deathTrailDash(ctx.targetX, ctx.targetY); },
};

export const deathElement: Element = {
  id: 'death',
  name: 'Death',
  color: 0x440066,
  emoji: '💀',
  abilities: [
    death1000BladesAbility,
    deathSummonWispsAbility,
    deathLoomingDreadAbility,
    deathWispDaemonAbility,
    deathJudgementAbility,
    deathTrailDashAbility, // hidden from HUD (sliced to 5 in ArenaScene)
  ],
};
