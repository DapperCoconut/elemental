import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const darkDrain: Ability = {
  id: 'dark-drain',
  name: 'Dark Drain',
  description: 'Tap: dark bomb (10 dmg + leaves cloud). Hold: spawn clouds that heal you & damage enemy.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) {
    ctx.launchDarkBomb(ctx.targetX, ctx.targetY);
  },
};

const tentacle: Ability = {
  id: 'tentacle',
  name: 'Tentacle',
  description: 'Extend a dark tentacle toward cursor for 3s — enemy touching it is snared for 2s.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) {
    ctx.activateTentacle(ctx.targetX, ctx.targetY);
  },
};

const snapTrap: Ability = {
  id: 'snap-trap',
  name: 'Snap Trap',
  description: 'Place a trap at your feet (12s lifetime). Enemy trigger: 20 dmg + 1s stun.',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx: CastContext) {
    ctx.placeSnapTrap();
  },
};

const shadowDance: Ability = {
  id: 'shadow-dance',
  name: 'Shadow Dance',
  description: 'Charges from dark cloud healing (35 needed). When full: press F to instantly heal 25 HP.',
  displayKey: 'F',
  cooldown: 500,
  cast(ctx: CastContext) {
    ctx.activateShadowDance();
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
  abilities: [darkDrain, tentacle, snapTrap, shadowDance, blackHole],
};
