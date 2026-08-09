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
  description: 'PASSIVE — Metronome: every ability you use starts a 2 second meter above the ability bar. Play your next ability inside the gold window at the far end of it and that cast comes out harmonized, which is what every line below means by the word.\n\nStrike the instrument and throw a sound shockwave forward for 10 damage — 15 harmonized. Coda scales every number this element hits with.',
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

const boombox: Ability = {
  id: 'boombox',
  name: 'Boombox',
  description: 'Launch a boombox to your cursor, where it stands for 8 seconds throwing a pink field around itself. Standing in the field banks you +1% attack speed every second — no cap, no decay, and it stays with you when you walk out — and gives +20% move speed for as long as you are inside it. Every 3 seconds the box lets go: enemies caught in the field are bounced out of it, and so are their projectiles. Harmonized: a bigger box with twice the speakers, and every buff you pick up inside it is worth 1.5×.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

const bugle: Ability = {
  id: 'bugle',
  name: 'Bugle',
  description: 'Swap the instrument for a brass bugle and take the stage. A rhythm bar runs beneath you and every note you strike is worth +1% move AND attack speed — banked permanently, with no cap and no decay. Drop a single note and the call is over and the cooldown starts. Press F again to bow out and keep what you played for. Harmonized: you are allowed one mistake, but spending it winds the bar up to 1.2× speed for the rest of the run.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

const coda: Ability = {
  id: 'coda',
  name: 'Coda!',
  description: 'Burn every stat boost you are carrying for hype — a point per percent, and tempo counts twice because it buffs two stats. Every 200 hype is a level.\n\nLEVEL 2: heal 150 HP, trade the violin for a guitar that hits harder, all your stat boosts become 1.25× as strong, and your dash goes twice as far, trails notes and leaves you 20% faster for 3 seconds.\n\nLEVEL 3 (max): heal 200 HP, trade up to an electric guitar that hits harder still, stat boosts go to 1.5×, and Q becomes Solo — a rhythm bar where every note you land throws a wall of music across the whole screen. Climbing the ladder costs a second apiece; Solo is a true ultimate and costs 25.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 1000,
  cast(ctx) { void ctx; }, // Resolved in SoundKit
};

export const soundElement: Element = {
  id: 'sound',
  name: 'Sound',
  color: 0xff66cc,
  emoji: '🔊',
  abilities: [staccato, discDice, boombox, bugle, coda],
};
