import { Element } from './Element';
import { Ability } from './Ability';

/**
 * Sound is a drum major. A metronome runs the whole match; clicking on its notes spins the baton
 * faster, and the baton — always out, always chasing the cursor on a short leash — is the click
 * attack. Everything else is band business: a dance that ends in a wave, a slam that puts the
 * enemy out of tune, three soul songs to march to, and a bugle solo for the ultimate.
 *
 * All five resolve in SoundKit through `ctx.soundCast`, so the cooldown, the ability bar, the bot
 * and the online replay all run through Fighter.castAbility like every other element.
 */

const baton: Ability = {
  id: 'baton',
  name: 'Baton',
  description: 'PASSIVE — Metronome: a beat bar plays above the ability bar for the whole match. Click while its note is inside the gold window to spin your baton faster; miss the note and the spin drops.\n\nYour baton is always out. It chases your cursor, but never further than 170px from you, and it hits anything it touches — 3 damage a hit at a standstill, up to 12 at full spin.',
  displayKey: 'Click',
  cooldown: 120,
  cast(ctx) { ctx.soundCast('baton', ctx.targetX, ctx.targetY); },
};

const crescendo: Ability = {
  id: 'crescendo',
  name: 'Crescendo',
  description: 'Start dancing. For 2 seconds you speed up hard — up to 2.4× move speed — leaving a trail of music behind you. When the 2 seconds are up you let out a wave of music: 30 damage to every enemy within 180px.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) { ctx.soundCast('crescendo', ctx.targetX, ctx.targetY); },
};

const fermata: Ability = {
  id: 'fermata',
  name: 'Fermata',
  description: 'Dash to your baton, grab it and slam it down toward the cursor: 20 damage, and everything hit is Out of Tune for 8 seconds — a quarter of its abilities misfire, cooldown spent and nothing cast. Press R again while anyone is Out of Tune to detonate it: 25 damage and a 0.5 second stun to each of them. The detonation is free.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx) { ctx.soundCast('fermata', ctx.targetX, ctx.targetY); },
};

const hum: Ability = {
  id: 'hum',
  name: 'Hum',
  description: 'Change your Soul Song. The song you are humming follows you in its colour as you walk.\n\nStaccato (red): +20% damage, and your baton travels faster and loses its spin more slowly.\nMelody (blue): +25% move speed and 20% shorter cooldowns.\nSmooth (green): 20% damage resistance and 3 HP a second.',
  displayKey: 'F',
  cooldown: 2500,
  cast(ctx) { ctx.soundCast('hum', ctx.targetX, ctx.targetY); },
};

const callOfTheVoid: Ability = {
  id: 'call-of-the-void',
  name: 'Call of the Void',
  description: 'Take the stage with a bugle for a 15 second solo. You cannot move and you cannot be hurt. A three-line staff scrolls across the screen: move between the lines with W/S or the arrow keys, and click as each note reaches the bar. Every note hit deals 15 damage to the enemy, wherever they are. The solo starts with quarter notes and builds to eighths, runs and slurred notes you have to hold the click through — some slurs change line halfway. Press Q to bow out early. The cooldown starts when the solo ends.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 30000,
  cast(ctx) { ctx.soundCast('call-of-the-void', ctx.targetX, ctx.targetY); },
};

export const soundElement: Element = {
  id: 'sound',
  name: 'Sound',
  color: 0x8a1c33,
  emoji: '🔊',
  abilities: [baton, crescendo, fermata, hum, callOfTheVoid],
};
