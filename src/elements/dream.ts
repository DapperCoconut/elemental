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
 * There are two passives, and they pull in opposite directions. The cursor is a real weapon
 * that deals five damage every time it crosses into a body, so flicking on and off a target
 * is a genuine (if frantic) damage rotation with no cooldown at all. Rest pays five health a
 * second for standing perfectly still — which is also the one thing that stops the pendulum
 * swinging, so the element is always asking whether this second is for pressure or repair.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in DreamKit.
 */

const trance: Ability = {
  id: 'dream-trance',
  name: 'Trance',
  description: 'Toggle a pendulum out of your hand. Circle your cursor around yourself to charge it — about 3 seconds of sustained winding to reach a full swing, and it drains back if you get lazy. The drowsy field scales on swing squared, so the top of the bar is worth far more than the middle: 26 sleepiness a second out to 210px at full. 100% = asleep for 8s.',
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
  description: 'Open a doorway behind you that only you can use. Step through to a meadow under a waterfall: 10 HP/s, untouchable and unseen, until you are healed or 15s runs out.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.dreamOasis(); },
};

// ── Dream Duel (Dream Mastery — Dream Duel) ─────────────────────
//
// Indices 5–6 are the spirit's two keys. They are never in the tray at the same time as the
// five above it: the mastery's passive swaps the whole row out, exactly as Justice's stances
// and Hunt's forms do, and `DreamKit.isDuelling()` is what decides which row is showing.
// They live in `abilities` rather than in a private list so `castAbility` can find them, so
// their cooldowns are real, and so the codex counts them.

const duelHaunt: Ability = {
  id: 'dream-haunt',
  name: 'Haunt',
  description: 'Three red bolts forward, half a second apart, 5 damage each. Only your spirit can throw them.',
  displayKey: 'Click',
  cooldown: 1800,
  cast(ctx: CastContext) { ctx.dreamHaunt(ctx.targetX, ctx.targetY); },
};

const duelSpiritTear: Ability = {
  id: 'dream-spirit-tear',
  name: 'Spirit Tear',
  description: 'A huge white tear that drifts forward, piercing everything for 10 — with two smaller ones orbiting it for 5 apiece.',
  displayKey: 'E',
  cooldown: 4000,
  cast(ctx: CastContext) { ctx.dreamSpiritTear(ctx.targetX, ctx.targetY); },
};

export const dreamElement: Element = {
  id: 'dream',
  name: 'Dream',
  color: 0x9fb8ff,
  emoji: '🌙',
  abilities: [
    trance, pillowFight, dreamcatcher, nightmare, oasis,
    duelHaunt, duelSpiritTear,
  ],
};
