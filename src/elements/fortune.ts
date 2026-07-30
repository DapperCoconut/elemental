import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Fortune — a test element, reachable only from a cheat-mode save for now.
 *
 * A shopkeeper who has set his stall up in the middle of a fight and has no intention of
 * moving it. Everything he owns is an economy: blood coins bleed out of every wound anybody
 * takes, the stall in the centre of the arena sells to *both* sides, and the two investment
 * abilities are the only things in the game that make a resource go up on its own.
 *
 * The trick of the element is that his opponent is also his customer. They earn coins the
 * same way he does, they can walk up to the same counter and buy the same bandages — and half
 * of what they hand over comes straight back to him. The illegal page behind the second tab is
 * the only part of the shop they never see, and it is where all of his damage lives.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in FortuneKit.
 */

const fire: Ability = {
  id: 'fortune-fire',
  name: 'Open Fire',
  description: 'Fire whatever you are holding. You start with the pistol; everything better is behind the illegal tab of your own shop. Passive — Shopkeeper: a stall stands in the middle of the arena. Every 10 damage anybody deals earns that side 1 blood coin, and both sides can spend them at the counter — stand next to it and press 1–8, or T to change tab. Anything your enemy buys hands you back half of what they paid.',
  displayKey: 'Click',
  cooldown: 140,
  cast(ctx: CastContext) { ctx.fortuneFire(ctx.targetX, ctx.targetY); },
};

const safeInvestment: Ability = {
  id: 'fortune-safe',
  name: 'Safe Investment',
  description: 'Put 5 blood coins in the bank. Every 10 seconds the balance pays out 10% of itself as capital gains, never less than 1 coin. Hold the key instead of tapping it to pull the whole balance back out.',
  displayKey: 'E',
  cooldown: 1000,
  cast(ctx: CastContext) { ctx.fortuneSafeInvest(); },
};

const riskyInvestment: Ability = {
  id: 'fortune-risky',
  name: 'Risky Investment',
  description: 'Put 5 blood coins into the market. Every 10 seconds it settles: deal over 50 damage in the window and it grows 20%, take over 100 damage and it shrinks 20% — do both and you scrape a 10% gain. Hold the key to cash out.',
  displayKey: 'R',
  cooldown: 1000,
  cast(ctx: CastContext) { ctx.fortuneRiskyInvest(); },
};

const paywall: Ability = {
  id: 'fortune-paywall',
  name: 'Paywall',
  description: 'Drop a row of turnstiles from the top of the arena to the bottom, at your cursor, for 5 seconds. Every enemy shot that passes through costs them 1 blood coin, and every time an enemy walks through it costs them 3 — all of it paid straight to you.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.fortunePaywall(ctx.targetX, ctx.targetY); },
};

const payToWin: Ability = {
  id: 'fortune-p2w',
  name: 'Pay-to-Win',
  description: 'Open a golden beam out in front of you that burns everything it touches for enormous constant damage. It turns very slowly, so it has to be walked onto a target — and it eats 6 blood coins a second, so it stops the moment you cannot afford it.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 22000,
  cast(ctx: CastContext) { ctx.fortunePayToWin(ctx.targetX, ctx.targetY); },
};

export const fortuneElement: Element = {
  id: 'fortune',
  name: 'Fortune',
  color: 0xd8a531,
  emoji: '🪙',
  abilities: [fire, safeInvestment, riskyInvestment, paywall, payToWin],
};
