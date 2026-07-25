import { Element } from './Element';
import { Ability } from './Ability';

const rhythmShot: Ability = {
  id: 'rhythm-shot',
  name: 'Rhythm Range',
  description: 'Time clicks with the rhythm track to fire 25 dmg sound blasts. Missing costs 10 HP. Rare red circles deal 35 dmg.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx) { void ctx; }, // Rhythm mechanic handled in ArenaScene
};

const flowMode: Ability = {
  id: 'flow-mode',
  name: 'Flow Mode',
  description: 'Toggle: 2× rhythm speed. Circles reaching the left edge deal 5 dmg to you.',
  displayKey: 'E',
  cooldown: 0,
  cast(ctx) { void ctx; }, // Toggle handled in ArenaScene
};

const screechBarrier: Ability = {
  id: 'screech-barrier',
  name: 'Screech Barrier',
  description: 'Place a sonic barrier at cursor (5s). Only its wall bites — 15 dmg while an enemy stands in the ring, nothing in the quiet middle. In Flow Mode: red, 25 dmg.',
  displayKey: 'R',
  cooldown: 16000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const soundGrapple: Ability = {
  id: 'sound-grapple',
  name: 'Sonic Grapple',
  description: 'Grapple to cursor, leaving 5 music note pickups. Collecting notes grants 5% dodge for 5s (up to 25%). Time with a rhythm circle for an AoE explosion at destination.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

const solo: Ability = {
  id: 'solo',
  name: 'Solo',
  description: 'Summon a disco ball and shred a guitar solo on stage. The rhythm track runs 4× faster and your hits auto-aim the enemy. One missed note ends the solo (accidentals save you). Cancels Flow Mode.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(ctx) { void ctx; }, // Handled in ArenaScene
};

export const soundElement: Element = {
  id: 'sound',
  name: 'Sound',
  color: 0xff66cc,
  emoji: '🔊',
  abilities: [rhythmShot, flowMode, screechBarrier, soundGrapple, solo],
};
