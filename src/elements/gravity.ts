import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const spaceSlash: Ability = {
  id: 'space-slash',
  name: 'Space Slash',
  description: 'Drag: purple slash along drag path, deals damage + directional knockback 0.5s later. Tap: drops a meteor shadow at cursor (1.5s delay). 0.5s CD.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) {
    // NPC path: coin-flip between slash (caster→target direction) and single meteor shadow
    if (Math.random() < 0.5) {
      ctx.gravitySlash(ctx.casterX, ctx.casterY, ctx.targetX, ctx.targetY);
    } else {
      ctx.gravityMeteorShadow(ctx.targetX, ctx.targetY);
    }
  },
};

const meteorRain: Ability = {
  id: 'meteor-rain',
  name: 'Meteor Rain',
  description: 'Hold E + click to place up to 5 meteor shadows (released on key-up). Tap E to replay last pattern. 5s CD on replay.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) {
    // NPC path: spawn a cluster of 4 shadows around the target
    ctx.gravityMeteorRainNpcBurst(ctx.targetX, ctx.targetY);
  },
};

const spaceSlam: Ability = {
  id: 'space-slam',
  name: 'Space Slam',
  description: 'Slam the enemy straight into the floor. 5s CD.',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.gravitySpaceSlam(); },
};

const gravBomb: Ability = {
  id: 'grav-bomb',
  name: 'Grav Bomb',
  description: 'Tap/short hold: vortex pulls enemy to cursor if within range. Hold 2s+: charges gravity bomb — release for an explosion. 5s CD.',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.gravityGravBombSnap(ctx.targetX, ctx.targetY); },
};

const lunarLanding: Ability = {
  id: 'lunar-landing',
  name: 'Lunar Landing',
  description: 'Giant shadow covers the stage. After 3s a colossal meteor falls, dealing huge damage and leaving 20 fire puddles. 50s CD.',
  displayKey: 'Q',
  cooldown: 50000,
  cast(ctx: CastContext) { ctx.gravityLunarLanding(); },
};

export const gravityElement: Element = {
  id: 'gravity',
  name: 'Gravity',
  color: 0x8844cc,
  emoji: '🌌',
  abilities: [spaceSlash, meteorRain, spaceSlam, gravBomb, lunarLanding],
};
