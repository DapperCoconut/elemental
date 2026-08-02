import { Element } from './Element';
import { Ability } from './Ability';

/**
 * Air — the wind dancer. Every ability is a fan opening, sweeping or leaving her hands, and
 * every one of them either banks **wind dodge** (a dodge pool that only ever spends itself on
 * hits it actually saved) or buys back the tempo to keep dancing.
 *
 * All of the mechanics live in `kits/AirKit.ts`; these entries exist to own the ids, the
 * cooldowns, the cards and the sounds.
 */

const windSplice: Ability = {
  id: 'wind-splice',
  name: 'Wind Splice',
  description: 'Fan cut (20 dmg, close) + a shear of wind that keeps going (12 dmg)',
  displayKey: 'Click',
  cooldown: 700,
  cast(ctx) {
    ctx.airSplice(ctx.targetX, ctx.targetY);
  },
};

const spinDance: Ability = {
  id: 'spin-dance',
  name: 'Spin Dance',
  description: 'Spin 360°, 20 dmg. On contact, every other ability comes back 2s sooner',
  displayKey: 'E',
  cooldown: 6000,
  cast(ctx) {
    ctx.airSpinDance(ctx.targetX, ctx.targetY);
  },
};

const galeGlaive: Ability = {
  id: 'gale-glaive',
  name: 'Gale Glaive',
  description: 'Throw both fans as one glaive (15 dmg). Parks on the cursor 2s, then returns for 20 and +15% wind dodge',
  displayKey: 'R',
  cooldown: 10000,
  cast(ctx) {
    ctx.airGaleGlaive(ctx.targetX, ctx.targetY);
  },
};

const skyGrapple: Ability = {
  id: 'sky-grapple',
  name: 'Sky Grapple',
  description: 'Hook to the cursor — untouchable in flight, +25% wind dodge on landing',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) {
    ctx.airSkyGrapple(ctx.targetX, ctx.targetY);
  },
};

const windBreaker: Ability = {
  id: 'wind-breaker',
  name: 'Wind Breaker',
  description: 'Become a tornado for 5s: enemies circle you taking damage, then are thrown at the cursor. You cannot attack',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 24000,
  cast(ctx) {
    ctx.airWindBreaker(ctx.targetX, ctx.targetY);
  },
};

export const airElement: Element = {
  id: 'air',
  name: 'Air',
  color: 0xaaddff,
  emoji: '💨',
  abilities: [windSplice, spinDance, galeGlaive, skyGrapple, windBreaker],
};
