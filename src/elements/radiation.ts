import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Radiation — a test element, reachable only from a cheat-mode save for now.
 *
 * A sniper in lead. Everything he owns is a procedure: tag the target three times, confirm, fire
 * — and the one thing he never does is improvise. The armour is dark purple lead plate with the
 * seams glowing green where the load inside it is getting out, which is also the honest summary
 * of the element: he is carrying something that is killing him, and he is spending it on you.
 *
 * The clock is the whole design. **Critical Mission** hands him half again his speed and a
 * quarter more damage at the bell, and then halves both every twelve seconds, forever. He is
 * never as strong as he was a moment ago, so every ability in the kit is about closing the job
 * before the numbers run out — and every one of them is a chain that a single miss breaks.
 *
 * The status the element sells is **irradiated**: for ten seconds, every point of healing aimed
 * at the victim lands as a hit instead. It costs nothing to hold and it does nothing on its own,
 * which is exactly why it is worth stacking on everything before the payload arrives.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in RadiationKit.
 */

const railgun: Ability = {
  id: 'radiation-railgun',
  name: 'Radiation Railgun',
  description: 'Fire a Geiger Tracer — a little triangle that deals no damage and straps onto whatever it hits. The third tracer on one body confirms the shot and the railgun fires itself: 50 damage, hitscan, and 10 seconds irradiated, so every heal they take from any source lands as a hit instead. Miss with a tracer and every tracer on the field falls off.',
  displayKey: 'Click',
  cooldown: 620,
  cast(ctx: CastContext) { ctx.radiationRailgun(ctx.targetX, ctx.targetY); },
};

const baton: Ability = {
  id: 'radiation-baton',
  name: 'Rod Baton',
  description: 'Dash forward and whip a spent fuel rod through everything in front of you for 15 damage. A clean target is irradiated for 10 seconds; one that already is gets stunned for 1.5 seconds instead — so the baton is either the opener or the finisher, never both.',
  displayKey: 'E',
  cooldown: 3000,
  cast(ctx: CastContext) { ctx.radiationBaton(ctx.targetX, ctx.targetY); },
};

const xray: Ability = {
  id: 'radiation-xray',
  name: 'X-Ray Vision',
  description: 'Eight seconds of seeing through the arena. The screen goes green, everything on it is drawn as its own skeleton — invisible or not — and every enemy hitbox swells 25%. The bones are for you; the hitboxes are for them.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.radiationXray(); },
};

const waste: Ability = {
  id: 'radiation-waste',
  name: 'Waste Disposal',
  description: 'Roll a drum of nuclear waste out in front of you and shoot it. The burst deals 30 damage, irradiates, throws you backwards — untouchable the whole way — and sprays live puddles across the floor. The moment you land you snipe every puddle in turn: 15 damage each, and anything standing in one, or caught by one going off, is irradiated.',
  displayKey: 'F',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.radiationWaste(ctx.targetX, ctx.targetY); },
};

const extermination: Ability = {
  id: 'radiation-extermination',
  name: 'Extermination',
  description: 'Draw a green flare gun with five rounds in it. The flares are tiny, fast and deal nothing at all — but put all five into one enemy and the airdrop is called. Everything on the screen takes 200 damage, and that includes you.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.radiationExtermination(); },
};

export const radiationElement: Element = {
  id: 'radiation',
  name: 'Radiation',
  color: 0x7cff3d,
  emoji: '☢️',
  abilities: [railgun, baton, xray, waste, extermination],
};
