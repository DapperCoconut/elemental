import { Element } from './Element';
import { Ability } from './Ability';

const punch: Ability = {
  id: 'rubber-punch',
  name: 'Rubber Punch',
  description: 'Hold to wind up an elastic fist behind you; drag the mouse to pull it back. Release to launch it in the opposite direction — farther pull = more damage.',
  displayKey: 'Click',
  cooldown: 350,
  cast(ctx) { ctx.rubberPunch(ctx.targetX, ctx.targetY, 0.5); },
};

const slingShot: Ability = {
  id: 'rubber-sling',
  name: 'Sling Shot',
  description: 'Shoot two arms to opposite walls forming a V-slingshot. Drag back, then release to launch yourself toward the cursor, dealing contact damage.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx) { ctx.rubberSlingShotStart(Math.atan2(ctx.targetY - ctx.casterY, ctx.targetX - ctx.casterX)); },
};

const bounceForm: Ability = {
  id: 'rubber-bounce-form',
  name: 'Bounce Form',
  description: 'Transform into a long thin rectangle for 3 s. All enemy projectiles are reflected back as faster, homing shots. Cannot use other abilities.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.rubberBounceForm(); },
};

const springSlam: Ability = {
  id: 'rubber-spring-slam',
  name: 'Spring Slam',
  description: 'Extend both arms perpendicular to the cursor. After 1 s they sweep forward and clap together — 25 dmg per arm. Hit by both: enemy grows 25% and is stunned for 1 s.',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx) { ctx.rubberSpringSlam(Math.atan2(ctx.targetY - ctx.casterY, ctx.targetX - ctx.casterX)); },
};

const bounceBack: Ability = {
  id: 'rubber-bounce-back',
  name: 'Bounce Back',
  description: 'For 5 s: 80% slower, 20% bigger. All damage you take is nullified and reflected to the enemy. Cannot use other abilities. (30 s cooldown)',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) { ctx.rubberBounceBack(); },
};

export const rubberElement: Element = {
  id: 'rubber',
  name: 'Rubber',
  color: 0xff5577,
  emoji: '🪀',
  abilities: [punch, slingShot, bounceForm, springSlam, bounceBack],
};
