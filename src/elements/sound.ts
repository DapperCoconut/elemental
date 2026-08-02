import { Element } from './Element';
import { Ability } from './Ability';

/**
 * Sound is a concert soloist. Every ability restarts a two-second metronome; an ability
 * played *on* the next beat comes out harmonized and hits harder. Nothing else about the
 * element is a resource — the only thing being managed is your timing.
 *
 * All five are resolved in SoundKit; the casts here exist so the cooldown, the ability bar
 * and the online relay all run through Fighter.castAbility like every other element.
 */

const staccato: Ability = {
  id: 'staccato',
  name: 'Staccato',
  description: 'PASSIVE — Metronome: every ability you use starts a 2 second meter above the ability bar. Play your next ability inside the gold window at the far end of it and that cast comes out harmonized, which is what every line below means by the word.\n\nStrike the violin with the bow and throw a sound shockwave forward for 10 damage — 15 harmonized. Every phantom violin you have conducted plays a wave of its own on the same stroke.',
  displayKey: 'Click',
  cooldown: 1000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

const discDice: Ability = {
  id: 'disc-dice',
  name: 'Disc Dice',
  description: 'Sling a record out around you, slicing everything within 130px for 15 damage and taking +15% move speed for 3s per fighter cut. Harmonized: change the record on the deck — Accelerando (green) → Bass (red) → Calm (blue).',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

const conduct: Ability = {
  id: 'conduct',
  name: 'Conduct',
  description: 'Hang a phantom violin of music energy at the cursor. It never fades, and it plays a 5 damage mini shockwave every time you Staccato — 10 when that strike is harmonized. Conducted on the beat it comes out golden: 8 damage, 12 harmonized. Three at most; a fourth replaces the oldest.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

const bugle: Ability = {
  id: 'bugle',
  name: 'Bugle',
  description: 'Swap the violin for a brass bugle and sound a note: +2% move and attack speed, stacking, and decaying away on its own. The first blow of the match hands the cooldown straight back, and so does every later blow struck on the beat. A harmonized opening note is worth 5% instead. Phantom violins ride the same buff.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

const soli: Ability = {
  id: 'soli',
  name: 'Soli',
  description: 'Take the stage alone. A randomised rhythm bar runs beneath you and every note you strike throws a wall of music across the whole screen, hitting every enemy at once. Drop a single note and the performance is over. Press Q again to bow out.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

export const soundElement: Element = {
  id: 'sound',
  name: 'Sound',
  color: 0xff66cc,
  emoji: '🔊',
  abilities: [staccato, discDice, conduct, bugle, soli],
};
