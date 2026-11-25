import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Fear. The element id is still `silence` — saves, recipes, courts and campaign tables all know it
 * by that name — but the kit is `FearKit`, and nothing of the old Silence is left in it.
 *
 * Ten abilities: the gentleman's five, then the slasher's five (the Myth pattern — the tray shows
 * five cards and the kit relabels them while Manifest is up).
 */

const phobia: Ability = {
  id: 'fear-phobia',
  name: 'Phobia',
  description: 'Summon a phobia at your cursor (max 4). It drains frightened enemies nearby; enemy shots that pass through one go grey, hit softer and hurt the shooter.',
  displayKey: 'Click',
  cooldown: 1500,
  cast(ctx: CastContext) { ctx.fearPhobia(ctx.targetX, ctx.targetY); },
};

const grasp: Ability = {
  id: 'fear-grasp',
  name: "Fear's Grasp",
  description: 'Every phobia slashes a giant black claw in a cone toward your cursor: 12 dmg and 10 fear each.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.fearGrasp(ctx.targetX, ctx.targetY); },
};

const gaze: Ability = {
  id: 'fear-gaze',
  name: 'Gaze',
  description: 'For 3s every phobia opens its mask and shines its eye at you. Enemies in a cone burn for 10 a second, gain fear fast and widen it; 2.5s inside is a jumpscare: frozen 3s, +30 fear.',
  displayKey: 'R',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.fearGaze(); },
};

const manifest: Ability = {
  id: 'fear-manifest',
  name: 'Manifest',
  description: 'Needs 50 fear on the field. Become the slasher: invincible, 67% slower, the enemy sees by flashlight. A 25hp rune on the arena edge ends it.',
  displayKey: 'F',
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.fearManifest(); },
};

const claustrophobia: Ability = {
  id: 'fear-claustrophobia',
  name: 'Claustrophobia',
  description: 'The walls close in and your phobias turn to marble (100hp). Fear rises; crushed enemies die. Breaking any statue ends it — half are trapped: jumpscare and 40 dmg.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx: CastContext) { ctx.fearClaustrophobia(); },
};

const massacre: Ability = {
  id: 'fear-massacre',
  name: 'Massacre',
  description: 'Stab the machete at your cursor: 28 dmg (up to 58 with fear) and it wounds the part it lands on — arms, legs, head, heart. Running through your own phobia is +30% speed.',
  displayKey: 'Click',
  cooldown: 1100,
  cast(ctx: CastContext) { ctx.fearMassacre(ctx.targetX, ctx.targetY); },
};

const haunt: Ability = {
  id: 'fear-haunt',
  name: 'Haunt',
  description: 'Go grey and stalk (15% slower); charges faster the closer you are. Recast — or get caught in a flashlight — to spin a hook. Whoever it catches is dragged 5s, helpless: recast to slam them down, or haul them onto a butcher\'s hook (3s, triple bleeding).',
  displayKey: 'E',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.fearHaunt(); },
};

const signature: Ability = {
  id: 'fear-signature',
  name: 'Signature Move',
  description: 'Vanish to the arena edge. Three times: aim a hidden red line from where you stand, across the whole arena, and click (or wait 2s); 1.5s later it is live for 1s. You slash through every enemy on it for 26, through whichever part touched it.',
  displayKey: 'R',
  cooldown: 18000,
  cast(ctx: CastContext) { ctx.fearSignature(); },
};

const descent: Ability = {
  id: 'fear-descent',
  name: 'Shadowy Descent',
  description: 'Sink through the floor and end the slasher. You come back as yourself somewhere on the arena edge.',
  displayKey: 'F',
  cooldown: 1000,
  cast(ctx: CastContext) { ctx.fearDescent(); },
};

const fall: Ability = {
  id: 'fear-fall',
  name: 'They Will Fall',
  description: 'A hole opens in the middle of the arena and keeps growing. Whoever falls in is hunted through a maze in first person for 45s. Caught: 75 dmg and every part severely wounded.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.fearFall(); },
};

export const silenceElement: Element = {
  id: 'silence',
  name: 'Fear',
  color: 0x9a94a6,
  emoji: '🎭',
  abilities: [
    phobia, grasp, gaze, manifest, claustrophobia,
    massacre, haunt, signature, descent, fall,
  ],
};
