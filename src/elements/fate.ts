import { Element } from './Element';
import { Ability } from './Ability';

const cardThrow: Ability = {
  id: 'fate-card-throw',
  name: 'Card Throw',
  description: 'Throw your highlighted card. You hold up to 3 cards, drawn randomly — click one (or press 1-3) to highlight it. Each card survives 3 throws, tearing a little more each time, before it is shredded.',
  displayKey: 'Click',
  cooldown: 350,
  cast(ctx) { ctx.fateThrowCard(ctx.targetX, ctx.targetY); },
};

const sideShuffle: Ability = {
  id: 'fate-side-shuffle',
  name: 'Side Shuffle',
  description: 'Dash to the right of where you are aiming, dealing a trail of face-down cards behind you. Any enemy shot that hits one of them was a dodge — and instantly draws you a card.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { ctx.fateSideShuffle(); },
};

const diceOfDoom: Ability = {
  id: 'fate-dice-of-doom',
  name: 'Dice of Doom',
  description: 'Roll a die above your head. Click it for a boost, drag it to throw it as a damaging projectile, or keep it held for a passive bonus — all three depend on the face rolled.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.fateDiceOfDoom(); },
};

const cursedTalisman: Ability = {
  id: 'fate-cursed-talisman',
  name: 'Cursed Talisman',
  description: 'Launch a cursed talisman. It sticks to the enemy it hits and orbits them: they take a 15% chance of 2x crits, and your bullets passing close to it are dragged in and flung at them. It has 33 HP — they can shoot it off.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) { ctx.fateCursedTalisman(); },
};

const allIn: Ability = {
  id: 'fate-all-in',
  name: 'All In!',
  description: 'Press Q, click the cards you want to wager, then press Q again: a slow orbiting strike follows your cursor. Land it for each card\'s worth in damage. Miss, and those cards were sacrificed for nothing.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 25000,
  cast(ctx) { ctx.fateAllIn(); },
};

export const fateElement: Element = {
  id: 'fate',
  name: 'Fate',
  color: 0x88eecc,
  emoji: '🃏',
  abilities: [cardThrow, sideShuffle, diceOfDoom, cursedTalisman, allIn],
};
