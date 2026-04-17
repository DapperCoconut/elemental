import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const gearGive: Ability = {
  id: 'tech-gear-give',
  name: 'Gear.Give',
  description: 'Spawn a cycling item box (cycles every 0.5s). Click again to grab the weapon shown. Active weapon replaces Click for 20s. Weapons: Sword Whip, Disc Dancer, Helix Shot, Code Cruncher.',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx) { ctx.techGearGiveActivate(); },
};

const devConsole: Ability = {
  id: 'tech-devconsole',
  name: 'Dev.Console',
  description: '3s typing window. 1-9 keys: self-virus (tick dmg 5s). 10-20: Malware shot (20 dmg). 21-40: Ransomware (lock non-click 5s). 41-60: Trojan drop (trap).',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) { ctx.techDevConsoleOpen(); },
};

const randomizeExe: Ability = {
  id: 'tech-random-r',
  name: 'Randomize.Exe',
  description: 'Random power: Invincibility (3s), Invisibility+25% speed (5s), or Jail enemy (5s). +30 Abuse.',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx) { ctx.techRandomEffect(); },
};

const playerGift: Ability = {
  id: 'tech-gift',
  name: 'Player.Gift',
  description: 'Give enemy a random buff (+5% speed, +5% damage, or +5 max HP). -20 Abuse. No cooldown.',
  displayKey: 'F',
  cooldown: 0,
  cast(ctx) { ctx.techPlayerGift(); },
};

const domainExpansion: Ability = {
  id: 'tech-domain',
  name: 'Domain.Expansion',
  description: 'Trap both fighters in a dark domain. 3 sliders control chaos — abuse ends it. 15s.',
  displayKey: 'Q',
  cooldown: 60000,
  cast(ctx: CastContext) { ctx.techStartDomain(); },
};

export const technologyElement: Element = {
  id: 'technology',
  name: 'Technology',
  color: 0x44ccaa,
  emoji: '💻',
  abilities: [gearGive, devConsole, randomizeExe, playerGift, domainExpansion],
};
