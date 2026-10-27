import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Memory — a test element, reachable only from a cheat-mode save for now.
 *
 * A dark figure in a top hat, leaning on a long cane, whose face is nothing but static. Its
 * passive is Guilt: every time an enemy takes damage, they take 1% more for the rest of the
 * match, without limit. Its shards latch on and fill the victim's screen with static; its beam
 * snatches back the time their ready abilities have been sitting idle; its Practice beam hits
 * harder every time it is used; its Repression replays what they did against them;
 * and its Trauma makes them relive a wound every second for the rest of the match.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in MemoryKit.
 */

const forget: Ability = {
  id: 'memory-forget',
  name: 'Forget',
  description: 'Launch an obsidian shard. On a hit it does 6 damage, grows legs and latches on for 5s (up to 3; a fourth replaces the oldest). 1 shard: you and your health bar are lost in static on their screen (bots miss more). 2: their own health bar is static. 3: their cooldown bars are static (bots lose track of what is ready).',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.memoryForget(ctx.targetX, ctx.targetY); },
};

const snatch: Ability = {
  id: 'memory-snatch',
  name: 'Memory Snatch',
  description: 'Spin your cane for 2s (slowed), then release a static beam to your cursor that splits and slices outward into a cone. The beam does 20 damage and puts every ready ability they have back on cooldown — and takes the time each sat ready off all of yours. The slices do 9 damage, lock their ready abilities for 2s and take 2s off yours. Each enemy is hit by one or the other.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.memorySnatch(ctx.targetX, ctx.targetY); },
};

const rebirth: Ability = {
  id: 'memory-rebirth',
  name: 'Practice',
  description: 'A white line runs wall to wall through your cursor and sweeps round the arena. Click to strike a thick white beam where it is: 24 damage. Every strike adds 4 damage to every strike after it, for the rest of the match. Fires on its own after 3s.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.memoryRebirth(ctx.targetX, ctx.targetY); },
};

const repression: Ability = {
  id: 'memory-repression',
  name: 'Repression',
  description: 'A grey aura records your opponent for 6s. Then a static copy of them appears and walks every step they took, casting their own click again each time they clicked — the real attack, aimed at your cursor.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.memoryRepression(ctx.targetX, ctx.targetY); },
};

const trauma: Ability = {
  id: 'memory-trauma',
  name: 'Trauma',
  description: 'Pulse with a red aura for 3s. Afterwards, every enemy takes 5% of the damage they took in those 3s, every second, for the rest of the match. Casting it again replaces the old wound with the new one.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.memoryTrauma(); },
};

export const memoryElement: Element = {
  id: 'memory',
  name: 'Memory',
  color: 0x4a4458,
  emoji: '🎩',
  abilities: [forget, snatch, rebirth, repression, trauma],
};
