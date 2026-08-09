import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Psychic — a test element, reachable only from a cheat-mode save for now.
 *
 * A purple monk who spent years staring at a wall until the eye in the middle of his forehead
 * opened. What came back through it was two seconds of the future, and the whole element is
 * built on that one fact: everything the enemy is about to do is already on screen before they
 * do it. Their route is a purple thread on the floor. Their next three key presses are three
 * chips floating over their head, the nearest one on the right.
 *
 * Nothing here is a projectile. The only thing that touches the enemy physically is a whip, and
 * even that is really a delivery system for **stress** — a pool that sits on the victim for ten
 * seconds doing nothing at all, then goes off all at once and ignores every scrap of armour they
 * own. Every second the stress does not release is a second the psychic spends adding to it.
 *
 * The other four abilities are all about the thing he can see and they cannot: one steals the
 * ability off the front of their queue, one makes him untouchable for exactly as long as the
 * telegraph he is reading, one makes their aim useless, and the last one cashes the whole pool
 * in and leaves them face down for a second per twenty points.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in PsychicKit.
 */

const headache: Ability = {
  id: 'psychic-headache',
  name: 'Headache',
  description: 'Crack a psychic whip at your cursor for 12 damage and 5 stress. Land the very tip of the lash and it is 10 stress instead. Stress sits on the enemy for 10 seconds and then goes off all at once, straight through armour — and every new hit puts the fuse back to 10, so it only ever goes off when you let it.',
  displayKey: 'Click',
  cooldown: 700,
  cast(ctx: CastContext) { ctx.psychicHeadache(ctx.targetX, ctx.targetY); },
};

const mindControl: Ability = {
  id: 'psychic-mind-control',
  name: 'Mind Control',
  description: 'Reach into the queue over the enemy\'s head and take the front card off it. The ability never happens, and it goes back on a full cooldown from the moment you stole it. Refused outright while they have nothing queued.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.psychicMindControl(); },
};

const dodgeDestiny: Ability = {
  id: 'psychic-dodge-destiny',
  name: 'Dodge Destiny',
  description: 'Untouchable for 1.25 seconds. You already know what is coming and exactly when — this is the button that makes knowing it worth something.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.psychicDodgeDestiny(); },
};

const migraine: Ability = {
  id: 'psychic-migraine',
  name: 'Migraine',
  description: 'Plant a charge at the cursor — it goes off 2.5s later, and everything caught in it gets three seconds of splitting psychological distress. Two casts in every three go wide by up to 30 degrees, and they gain 10 stress on the blast plus 10 for every second after it.',
  displayKey: 'F',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.psychicMigraine(ctx.targetX, ctx.targetY); },
};

const coma: Ability = {
  id: 'psychic-coma',
  name: 'Coma',
  description: 'Multiply every point of stress on the enemy by 1.5 and set the whole pool off at once. For every 20 points detonated they drop into a coma for 1 second, held still and unable to cast — and while they are under, everything you hit them with does half damage and banks the other half straight back as stress.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx: CastContext) { ctx.psychicComa(); },
};

export const psychicElement: Element = {
  id: 'psychic',
  name: 'Psychic',
  color: 0x9b4dff,
  emoji: '👁️',
  abilities: [headache, mindControl, dodgeDestiny, migraine, coma],
};
