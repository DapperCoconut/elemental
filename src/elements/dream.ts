import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Dream — the element earned by sparing the Devourer of Kings.
 *
 * The passive is a number on the enemy's head: **drowsiness**, 0–100. At 100 they fall asleep,
 * and a sleeper burns 5 drowsiness a second until it is gone and they wake. Any damage in the
 * waking world wakes them on the spot — so the real-world kit is half gunfight, half bedtime:
 * the Sandmen shoot, the pillow and the dagger put people under without hurting them.
 *
 * Then **Delve** steps into the sleeper's dream. In there they are awake and fighting back, but
 * nothing you do wakes the body they left, you are faster and quicker to recover, and every key
 * but E turns into something worse. The dream lasts as long as their drowsiness does — so the
 * rhythm is: dream, surface, top them back up, dream again.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in DreamKit, which also
 * decides which of each ability's two versions a cast is (waking or dreaming).
 */

const sandmen: Ability = {
  id: 'dream-sandmen',
  name: 'Sandmen',
  description: 'Hold to fire two little guns at the cursor, turn about — hitscan, 4 a round, 30 rounds then a 5s reload. They kick hard: the crosshair bucks with every shot, so drag it back on target. In a dream: two pistols, 30 explosive damage a shot with perfect accuracy, 2 rounds a reload, and the kick is worse.',
  displayKey: 'Click',
  cooldown: 125,
  cast(ctx: CastContext) { ctx.dreamSandmen(ctx.targetX, ctx.targetY); },
};

const delve: Ability = {
  id: 'dream-delve',
  name: 'Delve',
  description: 'Next to a sleeping enemy: step into their dream. In there they are awake and fighting, nothing you do wakes their body, and you move faster with shorter cooldowns. Press again to come back out — the dream also ends when their drowsiness runs dry.',
  displayKey: 'E',
  cooldown: 1200,
  cast(ctx: CastContext) { ctx.dreamDelve(); },
};

const pillowFight: Ability = {
  id: 'dream-pillow-fight',
  name: 'Pillow Fight',
  description: 'Swing a pillow: 6 damage and +20 drowsiness, or +34 against somebody at 10 or less. A sleeper takes no damage and still gets the drowsiness. In a dream: a claw swipe for 30 that slows them for 2.5s.',
  displayKey: 'R',
  cooldown: 2600,
  cast(ctx: CastContext) { ctx.dreamPillowFight(ctx.targetX, ctx.targetY); },
};

const sleepTight: Ability = {
  id: 'dream-sleep-tight',
  name: 'Sleep Tight',
  description: 'Throw a tiny, very fast dagger: 8 damage and +16 drowsiness, up to +30 against somebody already sleepy. A hit halves the cooldown; a sleeper takes no damage. In a dream: a living leech that bites for 22, keeps feeding, and heals you for all of it when you pull it back out.',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx: CastContext) { ctx.dreamSleepTight(ctx.targetX, ctx.targetY); },
};

const nightmare: Ability = {
  id: 'dream-nightmare',
  name: 'Nightmare',
  description: 'Needs an enemy at 50+ drowsiness. For 3s they are blind past arm\'s reach and panicking, take 60 damage, and take 25% more from everything else — but it costs them 15 drowsiness. It will not wake a sleeper. In a dream it also lets a nightmare loose that stalks them and does it all again if it catches them.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.dreamNightmare(ctx.targetX, ctx.targetY); },
};

export const dreamElement: Element = {
  id: 'dream',
  name: 'Dream',
  color: 0x9fb8ff,
  emoji: '🌙',
  abilities: [sandmen, delve, pillowFight, sleepTight, nightmare],
};
