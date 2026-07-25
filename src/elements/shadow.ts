import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const darkDrain: Ability = {
  id: 'dark-drain',
  name: 'Dark Drain',
  description: 'Tap: dark bomb (10 dmg + leaves a shadow pool). Hold: spawn pools that heal you, damage the enemy and build 3% Hopelessness per second on anyone standing in them.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) {
    ctx.launchDarkBomb(ctx.targetX, ctx.targetY);
  },
};

const tentacle: Ability = {
  id: 'tentacle',
  name: 'Tentacle',
  description: 'Extend a dark tentacle toward cursor for 3s — enemies hit take 10 dmg + 10% Hopelessness, and a touched enemy is snared for 2s.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) {
    ctx.activateTentacle(ctx.targetX, ctx.targetY);
  },
};

const snapTrap: Ability = {
  id: 'snap-trap',
  name: 'Snap Trap',
  description: 'Place a trap at your feet (12s lifetime). Enemy trigger: 20 dmg + 20% Hopelessness + 2s stun.',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx: CastContext) {
    ctx.placeSnapTrap();
  },
};

const tentacleWall: Ability = {
  id: 'tentacle-wall',
  name: 'Tentacle Wall',
  description: 'Erupt a wall of 8 spiked tentacles that grows from your feet toward the cursor. Each tentacle hit deals 5 dmg + 10% Hopelessness (1s between hits from the same wall). Lasts 6s.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) {
    ctx.summonTentacleWall(ctx.targetX, ctx.targetY);
  },
};

const blackHole: Ability = {
  id: 'black-hole',
  name: 'Black Hole',
  description: 'Summons a black hole at your cursor, violently dragging your foe into it for 3s while dealing 5 dmg/s.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 35000,
  cast(ctx: CastContext) {
    ctx.startBlackHole(ctx.targetX, ctx.targetY);
  },
};

export const shadowElement: Element = {
  id: 'shadow',
  name: 'Shadow',
  color: 0x330044,
  emoji: '🌑',
  abilities: [darkDrain, tentacle, snapTrap, tentacleWall, blackHole],
};
