import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Ruin — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element builds something: a stance, a board, a pet, a stack of buffs. Ruin only
 * takes things away. Its click deletes shots out of the air, its E deletes the ability they
 * just used, its F deletes everything they built and turns whatever buff they were wearing
 * against them, and its Q is a rot on the whole arena that never comes off. The one thing it
 * *gives* is grey weak HP, which is a gift the way a rusted skewer through the ribs is a gift.
 *
 * The character is falling apart on purpose. He is covered in spikes, one eye is an empty
 * socket, and his red frame is cracked from crown to feet — nothing here is built to last,
 * including him.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in RuinKit.
 */

const shredSlice: Ability = {
  id: 'ruin-shred',
  name: 'Shred Slice',
  description: 'Hurl a thick shredding wedge for 15. It carries straight through everything it hits — bodies and enemy shots alike — tearing the shots apart as it goes.',
  displayKey: 'Click',
  cooldown: 750,
  cast(ctx: CastContext) { ctx.ruinShred(ctx.targetX, ctx.targetY); },
};

const lockdown: Ability = {
  id: 'ruin-lockdown',
  name: 'Lockdown',
  description: 'Snap a rusted padlock onto the nearest enemy. Whatever ability they used last is dead for 20 seconds, however ready its cooldown says it is.',
  displayKey: 'E',
  cooldown: 25000,
  cast(ctx: CastContext) { ctx.ruinLockdown(ctx.targetX, ctx.targetY); },
};

const rustySkewer: Ability = {
  id: 'ruin-skewer',
  name: 'Rusty Skewer',
  description: 'Throw a huge barbed spike. Anyone it catches is threaded onto it for 10 damage, rides it until it hits a wall, and has 10% of their health rusted into weak HP that bleeds away on its own.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.ruinSkewer(ctx.targetX, ctx.targetY); },
};

const spikesOfRuin: Ability = {
  id: 'ruin-spikes',
  name: 'Spikes of Ruin',
  description: 'A red ring follows you for 2s, then erupts. Enemies inside take 15 and have every buff they are wearing turned inside out — a 20% speed boost comes back as a 20% slow. Any structure, building or summon caught in it simply dies.',
  displayKey: 'F',
  cooldown: 18000,
  cast(ctx: CastContext) { ctx.ruinSpikes(); },
};

const unstoppableDecay: Ability = {
  id: 'ruin-decay',
  name: 'Unstoppable Decay',
  description: 'Rot every enemy for the rest of the match: 10% slower, 10% more damage taken, 10% less damage dealt. It never wears off, and it stacks up to ten times.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.ruinDecay(); },
};

export const ruinElement: Element = {
  id: 'ruin',
  name: 'Ruin',
  color: 0xc4392c,
  emoji: '🚧',
  abilities: [shredSlice, lockdown, rustySkewer, spikesOfRuin, unstoppableDecay],
};
