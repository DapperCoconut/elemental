import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Hunt — a three-form element.
 *
 * Human form is a hunter: crossbow, shotgun, grenades and a scent trail. It has no transform
 * button. The beast comes out on its own every 30 seconds and drags you along for 12, then
 * hands you back. Beast form is teeth and momentum. Hybrid form (the Q+ upgrade) is the man
 * who kept the gun and the claws and pays for it — the beast's spirit seizes the controls
 * every ten seconds.
 *
 * The whole simulation lives in HuntKit; every ability here is a one-line delegate.
 */

// ── Human form ──────────────────────────────────────────────────

const huntCrossbow: Ability = {
  id: 'hunt-crossbow',
  name: 'Crossbow Shot',
  description: '30 dmg bolt. Bolts stay buried in the target (max 3). Any other ability reloads it instantly.',
  displayKey: 'Click',
  cooldown: 1250,
  cast(ctx: CastContext) { ctx.huntCrossbow(ctx.targetX, ctx.targetY); },
};

const huntBlast: Ability = {
  id: 'hunt-blast',
  name: 'Blast',
  description: 'Shotgun cone — 15 dmg and heavy knockback. Holds 2 charges.',
  displayKey: 'E',
  cooldown: 400,
  cast(ctx: CastContext) { ctx.huntBlast(ctx.targetX, ctx.targetY, 0); },
};

const huntGrenade: Ability = {
  id: 'hunt-grenade',
  name: 'Grenade',
  description: 'Lob a frag ~145px. 3s fuse, 35 dmg in a wide blast.',
  displayKey: 'R',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.huntGrenade(ctx.targetX, ctx.targetY); },
};

const huntTrail: Ability = {
  id: 'hunt-trail',
  name: "Hunter's Trail",
  description: 'The quarry bleeds a scent trail for 8s. Marks last 4s; standing on one gives +50% speed.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.huntTrail(); },
};

const huntReleaseBeast: Ability = {
  id: 'hunt-release-beast',
  name: 'Release the Beast!',
  description: 'Not castable. Fires on its own after 30s: 12s as the beast, then 50s before it takes you again.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 0,
  cast(ctx: CastContext) { ctx.huntReleaseBeast(); },
};

// ── Beast form ──────────────────────────────────────────────────

const huntSlash: Ability = {
  id: 'hunt-slash',
  name: 'Slash',
  description: 'Fast claw — 5 dmg, or 15 against a target with a bolt in it (and rips one out).',
  displayKey: 'Click',
  cooldown: 400,
  cast(ctx: CastContext) { ctx.huntSlash(ctx.targetX, ctx.targetY); },
};

const huntPounce: Ability = {
  id: 'hunt-pounce',
  name: 'Pounce',
  description: 'Launch forward and land in a wide slash for 25 dmg.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.huntPounce(ctx.targetX, ctx.targetY); },
};

const huntRoar: Ability = {
  id: 'hunt-roar',
  name: 'Roar',
  description: '30° cone the length of the arena — 25% slow for 5s. Hit anything and take 33% less damage for 5s.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.huntRoar(ctx.targetX, ctx.targetY); },
};

const huntGrapple: Ability = {
  id: 'hunt-grapple',
  name: 'Grapple',
  description: 'Lunge; on contact hold them for 1s, then hurl them at your cursor.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.huntGrapple(ctx.targetX, ctx.targetY); },
};

const huntBloodScent: Ability = {
  id: 'hunt-blood-scent',
  name: 'Blood Scent',
  description: '+25% attack speed and +20% move speed for 8s — only if something on screen is under 30% HP.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.huntBloodScent(); },
};

// ── Hybrid form (Q+ upgrade) ────────────────────────────────────

const huntHybridShotgun: Ability = {
  id: 'hunt-hybrid-shotgun',
  name: 'Shotgun Blast',
  description: 'Fire the shotgun forward — 15 dmg in a cone.',
  displayKey: 'Click',
  cooldown: 700,
  cast(ctx: CastContext) { ctx.huntHybridShotgun(ctx.targetX, ctx.targetY); },
};

const huntRoll: Ability = {
  id: 'hunt-roll',
  name: 'Tactical Roll',
  description: 'Roll toward the cursor.',
  displayKey: 'E',
  cooldown: 4000,
  cast(ctx: CastContext) { ctx.huntRoll(ctx.targetX, ctx.targetY); },
};

const huntHook: Ability = {
  id: 'hunt-hook',
  name: 'Hook',
  description: 'Throw a hook. On a hit, press R again to reel them in.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.huntHook(ctx.targetX, ctx.targetY); },
};

const huntAdrenaline: Ability = {
  id: 'hunt-adrenaline',
  name: 'Adrenaline',
  description: '+33% speed and damage for 8s, then a 5s crash at −25% speed and damage.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.huntAdrenaline(); },
};

const huntGiveIn: Ability = {
  id: 'hunt-give-in',
  name: 'Give In',
  description: 'Stop fighting it. Become the beast — permanently.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 0,
  cast(ctx: CastContext) { ctx.huntGiveIn(); },
};

export const huntElement: Element = {
  id: 'hunt',
  name: 'Hunt',
  color: 0xcc4400,
  emoji: '🐺',
  abilities: [
    huntCrossbow, huntBlast, huntGrenade, huntTrail, huntReleaseBeast,
    huntSlash, huntPounce, huntRoar, huntGrapple, huntBloodScent,
    huntHybridShotgun, huntRoll, huntHook, huntAdrenaline, huntGiveIn,
  ],
};
