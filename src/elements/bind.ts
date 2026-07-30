import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Bind — a test element, reachable only from a cheat-mode save for now.
 *
 * Something wrapped in chains and padlocks that wants one thing and has no way to get it. So it
 * asked. The thing that answered is a very old eye that hangs over the top of the arena in a hole
 * in the sky, and it is happy to help — it will burn, shatter and swipe on your behalf all day —
 * on the condition that you never once waste its time.
 *
 * The patron has an **anger** bar and it is the whole element. Overheat its beam and it takes
 * twenty. Leave the idol you summoned without faith and it takes five a second. Hide behind its
 * protection and half of everything it eats for you goes straight in. Anger falls at two a second
 * and nothing else lowers it, so the bar is a running account of how much of the god's patience
 * you have spent. Fill it and the god turns around: every attack in this kit keeps firing for five
 * seconds, at you.
 *
 * Nothing here is free and nothing here is symmetrical. The barrage costs a permanent debuff every
 * time it is thrown. The idol pays out beautifully and then starts billing. And the ultimate opens
 * the sky for fifteen seconds in exchange for one of your other four abilities, for the rest of the
 * match — the god will grant freedom, but it always takes a limb for it.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in BindKit.
 */

const summon: Ability = {
  id: 'bind-summon',
  name: 'Summon',
  description: 'Hold to have the eye burn a beam down onto your cursor. The heat bar over your head climbs while it fires and the beam ticks faster the higher it gets — but let it top out and the patron takes 20 anger, and you get nothing back until every scrap of heat has bled off.',
  displayKey: 'Click',
  cooldown: 260,
  cast(ctx: CastContext) { ctx.bindSummon(ctx.targetX, ctx.targetY); },
};

const shards: Ability = {
  id: 'bind-shards',
  name: 'Shards of Oblivion',
  description: 'Twenty-five golden shards, each with a purple eye set in it, thrown down at your cursor to burst for 10 damage apiece. The god charges for the favour: every cast permanently costs you 10% speed, 10% more damage taken, or 10% of the damage you deal — and it picks, not you.',
  displayKey: 'E',
  cooldown: 6500,
  cast(ctx: CastContext) { ctx.bindShards(ctx.targetX, ctx.targetY); },
};

const idol: Ability = {
  id: 'bind-idol',
  name: 'Summon Idol',
  description: 'Plant an idol with a ring of ground around it. It runs on faith: standing in the ring feeds it one a second, it burns one a second on its own, it holds ten, and every second it has any it throws a volley of oblivion shards. Starve it and it stops asking politely — an empty idol feeds the patron 5 anger a second until you come back or it crumbles.',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx: CastContext) { ctx.bindIdol(ctx.targetX, ctx.targetY); },
};

const protection: Ability = {
  id: 'bind-protection',
  name: "Prophet's Protection",
  description: 'Ancient hexes close around you and eat the next 3 instances of damage whole, however large. Nothing is destroyed, only moved: half of everything they swallow is handed to the patron as anger.',
  displayKey: 'F',
  cooldown: 16000,
  cast(ctx: CastContext) { ctx.bindProtection(); },
};

const treachery: Ability = {
  id: 'bind-treachery',
  name: 'God of Treachery',
  description: 'The eye opens all the way for 15 seconds — shard volleys, claw swipes, lasers out of every eye it has and slow beams of dark light dropped across whole stretches of the arena. The price is paid on the press: choose one of your other four abilities and it is dead for the rest of the match.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx: CastContext) { ctx.bindTreachery(); },
};

export const bindElement: Element = {
  id: 'bind',
  name: 'Bind',
  color: 0xe0b743,
  emoji: '⛓️',
  abilities: [summon, shards, idol, protection, treachery],
};
