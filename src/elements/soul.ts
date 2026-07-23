import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const soulLanternLight: Ability = {
  id: 'soul-lantern-light',
  name: 'Lantern Light',
  description: 'Hold Click to trail a spark toward the cursor, dropping tiny purple puddles. Puddles burn enemies (and your own grave zombies) for 5 dmg/s and heal you + your Amalgams for 3 hp/s.',
  displayKey: 'Click',
  cooldown: 150,
  cast(ctx: CastContext) { ctx.soulLanternTick(ctx.targetX, ctx.targetY); },
};

const soulArise: Ability = {
  id: 'soul-arise',
  name: 'Arise!',
  description: 'Pop the newest corpse from your 5-slot queue and raise it as an Amalgam that fights at your side. Does nothing if the queue is empty. 3s CD.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.soulArise(); },
};

const soulGrave: Ability = {
  id: 'soul-grave',
  name: 'Grave',
  description: 'Plant a headstone at the cursor. Every 5s it spits out a weak zombie that hunts YOU — burn your own zombies down with Lantern Light puddles to feed the corpse queue. Graves never expire and are never capped, so don\'t plant too many.',
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
  abilities: [soulLanternLight, soulArise, soulGrave, soulDeathWhistle, soulHellsTorment],
};
