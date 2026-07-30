import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Glass — a test element, reachable only from a cheat-mode save for now.
 *
 * A mosaic of a person: six coloured shards orbiting a body that is itself leaded panes, and
 * the whole thing is one hit away from coming apart. Every element in the game is either
 * durable or evasive; Glass is neither. It takes a quarter more damage from everything, on
 * purpose, and pays for it by answering every hit with fifteen shards in every direction —
 * the only kit whose defence is *being* hit.
 *
 * The four buttons are the same object seen four ways: the shards orbit you, or they leave
 * you, or they spin with you, or they are you. Temper is the one that changes the arithmetic
 * rather than the shards, and it is the only time Glass is tougher than anyone else.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in GlassKit.
 */

const shardOrbit: Ability = {
  id: 'glass-orbit',
  name: 'Shard Orbit',
  description: 'Six shards circle you at all times, cutting for 4 (each shard can hit the same target twice a second). Hold the button to push them out wider and spin them faster — at full stretch they hit for 8. Passive: you take 25% more damage from everything, and every hit you take fires 15 shards for 5 each in all directions.',
  displayKey: 'Click',
  // The ring is always up, so this cast does no work — it only gives the press a gesture, a
  // chime and (for the npc, which has no button to hold) a push. A short cooldown rather than
  // none, so a machine-gunned mouse doesn't machine-gun the sound with it.
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.glassOrbit(); },
};

const shardSplinter: Ability = {
  id: 'glass-splinter',
  name: 'Shard Splinter',
  description: 'Fire every orbiting shard straight ahead for 8 damage each, then bring them home. While none are orbiting you take a further 25% damage — 50% more in total.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.glassSplinter(ctx.targetX, ctx.targetY); },
};

const mosaicTwirl: Ability = {
  id: 'glass-twirl',
  name: 'Mosaic Twirl',
  description: 'Spin across the arena to where the cursor was, shards whirling at triple speed and striking three times as often the whole way.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.glassTwirl(ctx.targetX, ctx.targetY); },
};

const temper: Ability = {
  id: 'glass-temper',
  name: 'Temper',
  description: 'Go dark and dense for 5 seconds. Every shard hits for 2 more, and every vulnerability you are carrying becomes an equal resistance instead — the 25% extra you take turns into 25% less, and 50% turns into 50% less.',
  displayKey: 'F',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.glassTemper(); },
};

const glassBlow: Ability = {
  id: 'glass-blow',
  name: 'Glass Blow',
  description: 'Two seconds of total invincibility, then you burst: 15 shards for 10 each in every direction. Six panes then peel off the arena walls one by one and fly to your cursor, cutting anything on the way — when the last one arrives you re-form there.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.glassBlow(); },
};

export const glassElement: Element = {
  id: 'glass',
  name: 'Glass',
  color: 0x9fe8ff,
  emoji: '🪟',
  abilities: [shardOrbit, shardSplinter, mosaicTwirl, temper, glassBlow],
};
