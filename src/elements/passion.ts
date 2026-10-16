import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Devotion — a holy priest. (The element id is still `passion`, the charmer it replaced, so every
 * save, unlock and skin keeps working.)
 *
 * Devotion never deals damage. Everything it does instead fills a second bar over the enemy's
 * head — **faith** — and the instant that bar reaches 200 they are converted and gone, however
 * much health, shield or armour they had left. Nothing lowers faith. The bar also works against
 * its owner on the way up: at a quarter it starts filling on its own, at half the believer's
 * blows soften against the priest, and at three quarters they are drawn toward the holy water
 * and every sermon lands harder.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in PassionKit.
 */

const sermon: Ability = {
  id: 'passion-sermon',
  name: 'Sermon',
  description: 'Launch a barrage of 4 Greek letters, each worth 3 faith. Hold to preach longer: a '
    + 'full 1.4s sermon looses 12 letters worth 6 faith each.',
  displayKey: 'Click',
  cooldown: 480,
  cast(ctx: CastContext) { ctx.passionSermon(ctx.targetX, ctx.targetY); },
};

const holyWater: Ability = {
  id: 'passion-holy-water',
  name: 'Holy Water',
  description: 'Stores 2 bottles (one refills every 7s). Lob one at the cursor: it shatters into a '
    + 'boiling puddle for 8s, worth 9 faith a second to anyone standing in it.',
  displayKey: 'E',
  cooldown: 350,
  cast(ctx: CastContext) { ctx.passionHolyWater(ctx.targetX, ctx.targetY); },
};

const grenade: Ability = {
  id: 'passion-grenade',
  name: 'Holy Hand Grenade',
  description: 'Throw a holy hand grenade at the cursor. It bounces around for 3 seconds, then '
    + 'bursts for 45 faith on everything within 130px.',
  displayKey: 'R',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.passionGrenade(ctx.targetX, ctx.targetY); },
};

const crucifix: Ability = {
  id: 'passion-crucifix',
  name: 'Mount Crucifix',
  description: 'Plant a crucifix at the cursor. Enemies cannot set foot inside its 90px holy aura, '
    + 'and every projectile they fire into it gives them 1 faith. It stands until you plant another.',
  displayKey: 'F',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.passionCrucifix(ctx.targetX, ctx.targetY); },
};

const ascendance: Ability = {
  id: 'passion-ascendance',
  name: 'Ascendance',
  description: 'Mark a line across the arena where you stand. After 3s a flaming chariot thunders '
    + 'along it for 60 faith to everyone it hits. Caught in it yourself? It carries you off, and '
    + '2s later you crash down at the cursor for 80 faith in a 120px blast.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.passionAscendance(ctx.targetX, ctx.targetY); },
};

export const passionElement: Element = {
  id: 'passion',
  name: 'Devotion',
  color: 0xf5e08a,
  emoji: '🙏',
  abilities: [sermon, holyWater, grenade, crucifix, ascendance],
};
