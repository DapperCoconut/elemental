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

const rubberBanding: Ability = {
  id: 'rubber-band',
  name: 'Rubber Banding',
  description: 'Plant an anchor where you stand, tied to you by a rubber band. Straying too far from it slows you down. Recast to snap back to the anchor; hold instead to reel the anchor toward you — enough tension sends it flying past you. Disappears after 12 s, or shatters if you smack it with Click. (25 s cooldown)',
  displayKey: 'F',
  cooldown: 25000,
  cast(ctx) { ctx.rubberBandStart(); },
};

const rubberage: Ability = {
  id: 'rubberage',
  name: 'Rubberage',
  description: 'Unleash 15 small rubber balls that ricochet off the walls and each other like a DVD screensaver gone wrong, speeding up over 10 s. Each deals 5 dmg and heavy knockback on contact.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 56000,
  cast(ctx) { ctx.rubberage(); },
};

export const rubberElement: Element = {
  id: 'rubber',
  name: 'Rubber',
  color: 0xff5577,
  emoji: '🎾',
  abilities: [punch, slingShot, bounceForm, rubberBanding, rubberage],
};
