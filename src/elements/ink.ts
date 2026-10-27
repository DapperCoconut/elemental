import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Ink — a test element, reachable only from a cheat-mode save for now.
 *
 * A black-and-white rubber-hose cartoon: pie-cut eyes, white gloves, a bowler hat. Everything it
 * does is drawn in ink and paper — finger guns, banana peels, a running start, a six-ton anvil
 * out of hammerspace, and Foux World, where the camera pulls back to show the arena is a set on an
 * animator's desk and the walls are foam.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in InkKit.
 */

const fingerGuns: Ability = {
  id: 'ink-finger-guns',
  name: 'Finger Guns',
  description: 'Point a finger gun and fire a little ink bullet for 3 damage. No cooldown — every click is a shot, so spam it. Holding the button does nothing; you have to click.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx: CastContext) { ctx.inkFingerGun(ctx.targetX, ctx.targetY); },
};

const banana: Ability = {
  id: 'ink-banana',
  name: 'Oooo Banana',
  description: 'Drop a banana peel behind you. It stays until someone steps on it. An enemy who does is flung in a random direction, stunned for 1s, and has slippery controls for 5s.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.inkBanana(ctx.targetX, ctx.targetY); },
};

const skedaddle: Ability = {
  id: 'ink-skedaddle',
  name: 'Skedaddle',
  description: 'Hold R to run on the spot, building up for up to 5s. Let go to shoot off toward the cursor and bounce around the arena off the walls, like a DVD logo, for as long as you charged. Everyone you run into takes 10 damage.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.inkSkedaddle(ctx.targetX, ctx.targetY); },
};

const olSixTon: Ability = {
  id: 'ink-anvil',
  name: "Ol' 6 Ton",
  description: 'Haul a giant anvil out from behind your back — that takes 3s — and hold it over your head for up to 3s. Click to slam it down at the cursor: 30 damage within 60px, and everyone hit is flattened for 4s (half speed, and their ability keys are shuffled). Hold it for the full 3s and it crushes you instead: a quarter of your health, and you are flattened for 2s.',
  displayKey: 'F',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.inkAnvil(ctx.targetX, ctx.targetY); },
};

const fouxWorld: Ability = {
  id: 'ink-foux-world',
  name: 'Foux World',
  description: 'The camera pulls back for 10s: the arena is a set on an animator\'s desk and its walls are foam. Anyone can walk out through them into the studio — but enemies take 8 damage pushing into the foam and 16 a second while inside it. You pass through freely. When it ends, everyone is pulled back inside.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 35000,
  cast(ctx: CastContext) { ctx.inkFouxWorld(); },
};

export const inkElement: Element = {
  id: 'ink',
  name: 'Ink',
  color: 0x1a1a1a,
  emoji: '🖋️',
  abilities: [fingerGuns, banana, skedaddle, olSixTon, fouxWorld],
};
