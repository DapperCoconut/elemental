import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Dream — the element earned by sparing the Devourer of Kings.
 *
 * Same arrangement as `justice.ts`: the abilities are declared so the element
 * reads as a real thing in the roster and its info panel is worth opening, but
 * every `cast` is inert until the kit is written. `MenuScene` lists Dream with
 * `available:false` in the meantime, so none of them is reachable in a fight.
 */

/** Every Dream ability routes through here until the kit exists. */
function pending(ctx: CastContext, name: string): void {
  void ctx; void name;
}

const lull: Ability = {
  id: 'dream-lull',
  name: 'Lull',
  description: 'A soft pulse of sleep. Stacks drowsiness on whatever it touches; enough drowsiness and they simply stop.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) { pending(ctx, 'Lull'); },
};

const doorway: Ability = {
  id: 'dream-doorway',
  name: 'Doorway',
  description: 'Leave a door standing where you are. Cast again to step back through it — and to send everything that has happened since back through with you.',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx: CastContext) { pending(ctx, 'Doorway'); },
};

const nightmare: Ability = {
  id: 'dream-nightmare',
  name: 'Nightmare',
  description: 'Give the enemy something of their own to fight. It wears their face, uses their last ability, and only they can see it coming.',
  displayKey: 'R',
  cooldown: 14000,
  cast(ctx: CastContext) { pending(ctx, 'Nightmare'); },
};

const driftOff: Ability = {
  id: 'dream-drift-off',
  name: 'Drift Off',
  description: 'Go somewhere else for a moment. Untouchable while you are gone, and you come back exactly as hurt as you left.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { pending(ctx, 'Drift Off'); },
};

const wakingWorld: Ability = {
  id: 'dream-waking-world',
  name: 'The Waking World',
  description: 'Rewrite the arena for ten seconds. Everything sleeping stays sleeping, everything dreaming takes what it dreams, and none of it happened when it ends.',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx: CastContext) { pending(ctx, 'The Waking World'); },
};

export const dreamElement: Element = {
  id: 'dream',
  name: 'Dream',
  color: 0x9fb8ff,
  emoji: '🌙',
  abilities: [lull, doorway, nightmare, driftOff, wakingWorld],
};
