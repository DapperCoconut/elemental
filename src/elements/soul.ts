import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const soulLantern: Ability = {
  id: 'soul-lantern',
  name: 'Lantern of the Damned',
  description: 'Click to launch a flaming wisp that chases your cursor until it reaches it — it bends toward a moving cursor but never turns back on itself — then flies straight on. 8 damage. Hold right click to charge a soul beam instead and release to fire it: a piercing line that hits everything along it for 6–22 depending on charge (1.2s to full, 1.5s cooldown). Every zombie the lantern, beam or their effects kill this match adds +5% damage to both, up to ×3.',
  displayKey: 'Click',
  cooldown: 350,
  cast(ctx: CastContext) { ctx.soulLantern(ctx.targetX, ctx.targetY); },
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
  description: 'Plant a headstone at the cursor. Every 5s it spits out a weak, ordinary zombie that hunts YOU — burn your own zombies down with the Lantern to feed the corpse queue. A grave holds its spawn while you already have 3 bodies standing. Graves never expire and are never capped, so don\'t plant too many.',
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

const soulTurn: Ability = {
  id: 'soul-turn',
  name: 'Turn',
  description: 'Every hostile amalgam and zombie within 240px of you instantly turns and fights for you as one of your own Amalgams — the enemy\'s risen, your own grave zombies, even a loose Alpha. A Corpse Prince is too proud to turn. The Amalgam itself cannot be turned: it takes 50% of its current health as damage instead.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.soulTurn(); },
};

export const soulElement: Element = {
  id: 'soul',
  name: 'Soul',
  color: 0xccaaff,
  emoji: '👻',
  abilities: [soulLantern, soulArise, soulGrave, soulDeathWhistle, soulTurn],
};
