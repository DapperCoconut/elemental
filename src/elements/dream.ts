import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Dream — the element earned by sparing the Devourer of Kings.
 *
 * A setup element built around one number: how sleepy the enemy is. The pendulum stacks it,
 * the pillow cashes it in, the dreamcatcher farms it, and the nightmare punishes whoever
 * wakes up wrong. Nothing Dream does is fast on its own — but a sleeping enemy is a sleeping
 * enemy, and a pillow to a sleeping head hurts.
 *
 * The passive lives entirely in the cursor: it is a real weapon that deals five damage every
 * time it crosses into a body, so flicking on and off a target is a genuine (if frantic)
 * damage rotation with no cooldown at all.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in DreamKit.
 */

const trance: Ability = {
  id: 'dream-trance',
  name: 'Trance',
  description: 'Hang a pendulum from your hand. Moving swings it, and the harder it swings the faster everything near you gets sleepy. 100% = asleep for 8s.',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) { ctx.dreamTrance(); },
};

const pillowFight: Ability = {
  id: 'dream-pillow-fight',
  name: 'Pillow Fight',
  description: 'Swing a pillow. 10 dmg, up to 70 against something fast asleep, and it multiplies whatever sleepiness they already had by 1.25.',
  displayKey: 'E',
  cooldown: 1500,
  cast(ctx: CastContext) { ctx.dreamPillowFight(ctx.targetX, ctx.targetY); },
};

const dreamcatcher: Ability = {
  id: 'dream-dreamcatcher',
  name: 'Dreamcatcher',
  description: 'Drop a catcher for 12s (max 3). It pulls one dream every 2s out of anything sleeping, holds 5, and each dream heals you 10 HP when you walk over it — and costs them 2s on every cooldown.',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.dreamDreamcatcher(); },
};

const nightmare: Ability = {
  id: 'dream-nightmare',
  name: 'Nightmare',
  description: '5 dmg/s for 10s that will never wake a sleeper — but whatever does wake them lands twice. Waking up ends the nightmare.',
  displayKey: 'F',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.dreamNightmare(); },
};

const oasis: Ability = {
  id: 'dream-oasis',
  name: 'Oasis',
  description: 'Open a doorway behind you that only you can use. Step through for 10 HP/s, untouchable and unseen, until you are healed or 15s runs out.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.dreamOasis(); },
};

export const dreamElement: Element = {
  id: 'dream',
  name: 'Dream',
  color: 0x9fb8ff,
  emoji: '🌙',
  abilities: [trance, pillowFight, dreamcatcher, nightmare, oasis],
};
