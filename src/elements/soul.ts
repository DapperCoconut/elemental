import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const soulSiphon: Ability = {
  id: 'soul-siphon',
  name: 'Siphon',
  description: 'Click on something to open a purple cord between it and you. A cord on an enemy (or one of your own grave zombies) drains 4 dmg/s out of it; a cord on one of your Amalgams feeds it 8 hp/s instead, and healing above its maximum becomes shield HP. Three cords at once, on three targets or all on one. They snap past 330px.',
  displayKey: 'Click',
  cooldown: 400,
  cast(ctx: CastContext) { ctx.soulSiphon(ctx.targetX, ctx.targetY); },
};

const soulArise: Ability = {
  id: 'soul-arise',
  name: 'Arise!',
  description: 'Pop the newest corpse from your 5-slot queue and raise it as an Amalgam that fights at your side. Does nothing if the queue is empty, and refuses without spending the corpse while you already have 3 bodies standing — grave zombies and Amalgams share that cap. 3s CD.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.soulArise(); },
};

const soulGrave: Ability = {
  id: 'soul-grave',
  name: 'Grave',
  description: 'Plant a headstone at the cursor. Every 5s it spits out a weak, ordinary zombie that hunts YOU — drain your own zombies down with Siphon to feed the corpse queue. A grave holds its spawn while you already have 3 bodies standing. Graves never expire and are never capped, so don\'t plant too many.',
  displayKey: 'R',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.soulGrave(ctx.targetX, ctx.targetY); },
};

const soulDeathWhistle: Ability = {
  id: 'soul-death-whistle',
  name: 'Death Whistle',
  description: 'Shriek at the cursor — every living Amalgam you control rushes to that point and heals for 75% of its max HP on arrival, then resumes the fight.',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.soulDeathWhistle(ctx.targetX, ctx.targetY); },
};

const soulHellsTorment: Ability = {
  id: 'soul-hells-torment',
  name: "Hell's Torment",
  description: 'Ignite every Amalgam you control: they burn for 5 dmg/s, spraying embers and a fiery AOE around themselves each second, and detonate in a huge blast of embers when the flames finally consume them.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.soulHellsTorment(); },
};

export const soulElement: Element = {
  id: 'soul',
  name: 'Soul',
  color: 0xccaaff,
  emoji: '👻',
  abilities: [soulSiphon, soulArise, soulGrave, soulDeathWhistle, soulHellsTorment],
};
