import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Radiation — a test element, reachable only from a cheat-mode save for now.
 *
 * A sniper in lead. The click is a procedure — tag the target three times and the railgun fires
 * itself — and the Q is the same procedure with the stakes moved. In between, three tools for the
 * range a sniper does not want to be at: a sighting cone that has to be held on a body while it
 * closes, a lead bunker to hide in, and a uranium rod for the enemy who got close anyway.
 *
 * The status the element sells is **irradiated**: every point of healing aimed at the victim
 * lands as a hit instead. Barrage hits harder on it and the Rod Baton turns it into a stun.
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

const barrage: Ability = {
  id: 'radiation-barrage',
  name: 'Barrage',
  description: 'Open a 45° sighting cone in front of you. Hold it over an enemy and it closes to 5° over 3 seconds — let them out of it and the ability is cancelled. Once it closes, an instant aimed burst of 5 hitscan rounds fires at them: 5 damage each, or 8 if they are irradiated.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx: CastContext) { ctx.radiationBarrage(ctx.targetX, ctx.targetY); },
};

const bunker: Ability = {
  id: 'radiation-bunker',
  name: 'Fallout Bunker',
  description: 'Build a round lead bunker where you are standing. It has 75 HP and lasts 10 seconds. It stops enemy projectiles and enemies cannot walk into it. While you are inside, nothing can hurt you — every hit lands on the bunker instead.',
  displayKey: 'R',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.radiationBunker(); },
};

const baton: Ability = {
  id: 'radiation-baton',
  name: 'Rod Baton',
  description: 'Pull out a uranium rod and strike forward at close range. Enemies hit take 8 damage and are irradiated for 4 seconds. Enemies who are already irradiated take 16 damage and are stunned for 2 seconds instead.',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.radiationBaton(ctx.targetX, ctx.targetY); },
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
  abilities: [railgun, barrage, bunker, baton, extermination],
};
