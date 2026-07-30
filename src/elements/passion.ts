import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Passion — a test element, reachable only from a cheat-mode save for now.
 *
 * Every other element in the game wins by taking an enemy's health away. Passion barely touches
 * it. What it fills instead is a second bar over their head, the same size as the health they
 * started the match with, and the instant that bar is full they are charmed and gone — no
 * matter how much they healed, shielded or clotted on the way. Nothing lowers it. There is no
 * cleanse, no decay and no way to trade damage back into it.
 *
 * The consequence is an element that cannot be raced. A Passion user losing the health fight is
 * still winning the only fight that ends the match, and the counterplay is not to out-heal it —
 * it is to kill them before the meter tops out, or to stop looking at them while they pose.
 *
 * Every `cast` here is a one-line delegate; the whole simulation lives in PassionKit.
 */

const loveshot: Ability = {
  id: 'passion-loveshot',
  name: 'Loveshot',
  description: 'Fire a heart from your pistol for 12 damage and 15 love. It hits harder the more '
    + 'love is already in them — +2 damage for every 80 on the bar.',
  displayKey: 'Click',
  cooldown: 550,
  cast(ctx: CastContext) { ctx.passionLoveshot(ctx.targetX, ctx.targetY); },
};

const flirt: Ability = {
  id: 'passion-flirt',
  name: 'Flirt',
  description: 'A wide cone in front of you. Anyone caught in it gains 30 love — 35 past a '
    + 'quarter, 40 past half, 45 past three quarters. No damage at all.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.passionFlirt(ctx.targetX, ctx.targetY); },
};

const smooch: Ability = {
  id: 'passion-smooch',
  name: 'Smooch',
  description: 'Dash forward and kiss whoever you run into. Only lands on someone already at 50% '
    + 'love or more; when it does, they gain 30 love plus another 15% of the bar they were on.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.passionSmooch(ctx.targetX, ctx.targetY); },
};

const manipulate: Ability = {
  id: 'passion-manipulate',
  name: 'Manipulate',
  description: 'Take a rose in your teeth for 15s. Every hit landed on you while you hold it '
    + 'costs the attacker 5% of their damage for 5s, stacking without limit. Recast to throw the '
    + 'rose: 20 love on a hit, up to 60 the closer you are to death.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.passionManipulate(ctx.targetX, ctx.targetY); },
};

const exhibition: Ability = {
  id: 'passion-exhibition',
  name: 'Exhibition',
  description: 'Pose for the cameras for 5s. Anyone facing you gains 15 love a second — look '
    + 'away and it stops.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx: CastContext) { ctx.passionExhibition(); },
};

export const passionElement: Element = {
  id: 'passion',
  name: 'Passion',
  color: 0xff5fa2,
  emoji: '💘',
  abilities: [loveshot, flirt, smooch, manipulate, exhibition],
};
