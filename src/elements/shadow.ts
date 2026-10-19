import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const caltrop: Ability = {
  id: 'shadow-caltrop',
  name: 'Shadow Caltrops',
  description: 'Throw an obsidian caltrop to the cursor. It lies on the ground for up to 8s; the enemy who steps on it takes 5 dmg + 10% Hopelessness. Hold Click to keep throwing.',
  displayKey: 'Click',
  cooldown: 650,
  cast(ctx: CastContext) {
    ctx.throwCaltrop(ctx.targetX, ctx.targetY);
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

/**
 * Grim Gloom — shadow's alternate ultimate (swapped in for Black Hole through ALT_ULT_SLOT).
 * The cast only lays the fog; ShadowKit runs it from there: the passive Hopelessness, the
 * per-foe "standing still" watch and the tentacles that erupt under anyone who lingers.
 */
export const grimGloom: Ability = {
  id: 'grim-gloom',
  name: 'Grim Gloom',
  description: 'Purple fog covers the arena for 8s — foes gain Hopelessness all the while, and anyone who lingers in one spot is struck by tentacles from the floor',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 32000,
  cast(ctx: CastContext) {
    ctx.shadowGrimGloom?.();
  },
};

export const shadowElement: Element = {
  id: 'shadow',
  name: 'Shadow',
  color: 0x330044,
  emoji: '🌑',
  abilities: [caltrop, tentacle, snapTrap, tentacleWall, blackHole],
};
