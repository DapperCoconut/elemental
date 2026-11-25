import { Element } from './Element';
import { Ability } from './Ability';

/**
 * Air — the hooded assassin. Clouds crawl across the arena; standing in them banks **stealth**,
 * which is a dodge chance while it is held, the reach and weight of the stab when it is spent,
 * and the length of the Tornado Blade.
 *
 * All of the mechanics live in `kits/AirKit.ts`; these entries exist to own the ids, the
 * cooldowns, the cards and the sounds.
 */

const pierceTheSkies: Ability = {
  id: 'pierce-the-skies',
  name: 'Pierce the Skies',
  description: 'Stab with a knife of air. Lunges further and hits harder with stealth, and spends all of it. Double from behind. Hold for a barrage',
  displayKey: 'Click',
  cooldown: 650,
  cast(ctx) {
    ctx.airPierce(ctx.targetX, ctx.targetY);
  },
};

const knock: Ability = {
  id: 'air-knock',
  name: 'Knock',
  description: 'A short blast of wind (10 dmg). Winded for 6s: they turn slowly, and walking drains their stamina',
  displayKey: 'E',
  cooldown: 9000,
  cast(ctx) {
    ctx.airKnock(ctx.targetX, ctx.targetY);
  },
};

const cloudCover: Ability = {
  id: 'cloud-cover',
  name: 'Cloud Cover',
  description: 'A cloak of rain: invisible, double stealth in clouds, and the cloak (25 HP) takes hits for you. It loses 5 HP every 3s',
  displayKey: 'R',
  cooldown: 22000,
  cast(ctx) {
    ctx.airCloudCover();
  },
};

const combo: Ability = {
  id: 'air-combo',
  name: 'Combo',
  description: 'Throw 6 air knives. Press again as the white ring closes to flip into the air for 3s; again on the next ring to rain knives on the cursor',
  displayKey: 'F',
  cooldown: 14000,
  cast(ctx) {
    ctx.airCombo(ctx.targetX, ctx.targetY);
  },
};

const tornadoBlade: Ability = {
  id: 'tornado-blade',
  name: 'Tornado Blade',
  description: 'Become a spinning top of wind that chases the cursor. Grinds into enemies, then bounces off. Lasts longer with stealth',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 24000,
  cast(ctx) {
    ctx.airTornadoBlade();
  },
};

export const airElement: Element = {
  id: 'air',
  name: 'Air',
  color: 0xaaddff,
  emoji: '💨',
  abilities: [pierceTheSkies, knock, cloudCover, combo, tornadoBlade],
};
