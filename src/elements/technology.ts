import { Element } from './Element';
import { Ability } from './Ability';

const flail: Ability = {
  id: 'tech-flail',
  name: 'Flail',
  description: 'Passive pendulum ball follows you and damages enemies on contact (10 dmg). Click to supersize it for 3s (15 dmg, larger).',
  displayKey: 'Click',
  cooldown: 8000,
  cast(ctx) { ctx.techFlailEmpower(); },
};

const devConsole: Ability = {
  id: 'tech-devconsole',
  name: 'Dev.Console',
  description: 'Open a 3s key-spam window. Every printable key pressed adds a charge. On close: 1–9 chars = 1 shot, 10–19 = 2, 20+ = 3 (20 dmg each). Zero chars = 10 dmg screen-wide beam.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) { ctx.techDevConsoleOpen(); },
};

const hackAttribute: Ability = {
  id: 'tech-hack',
  name: 'Hack.Attribute',
  description: '+5% move speed, +5% damage. +10 Abuse. No cooldown — the bill comes due later.',
  displayKey: 'R',
  cooldown: 0,
  cast(ctx) { ctx.techHackAttribute(); },
};

const playerGift: Ability = {
  id: 'tech-gift',
  name: 'Player.Gift',
  description: 'Give enemy a random buff (+5% speed, +5% damage, or +5 max HP). -20 Abuse. No cooldown.',
  displayKey: 'F',
  cooldown: 0,
  cast(ctx) { ctx.techPlayerGift(); },
};

const opSelf: Ability = {
  id: 'tech-opself',
  name: 'OP.Self',
  description: 'Sequentially activate GodMode (5s invulnerable), Invis (5s untargetable), and Jail (5s enemy boxed). Sets Abuse to 100 after.',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx) { ctx.techOpSelfBegin(); },
};

export const technologyElement: Element = {
  id: 'technology',
  name: 'Technology',
  color: 0x44ccaa,
  emoji: '💻',
  abilities: [flail, devConsole, hackAttribute, playerGift, opSelf],
};
