import { Element } from './Element';
import { Ability } from './Ability';

const bash: Ability = {
  id: 'bash',
  name: 'Bash',
  description: 'Hold to charge, release to dash: shield hit = 30-60 dmg (stab 15-30 if shieldless), rock launch if aimed at a rock. Full charge stuns on hit',
  displayKey: 'Click',
  cooldown: 1400,
  cast(ctx) { void ctx; }, // Handled in EarthKit
};

const repair: Ability = {
  id: 'repair',
  name: 'Repair',
  description: 'Slow 20% for 3s, then: respawn/heal/enhance shield, or heal Golem 50 HP',
  displayKey: 'E',
  cooldown: 20000,
  cast(ctx) { void ctx; }, // Handled in EarthKit
};

const rockDance: Ability = {
  id: 'rock-dance',
  name: 'Rock Dance',
  description: '4 orbiting rocks (8 dmg each, 0.5s cd). Bash a rock to launch it (40 dmg + 3s stun)',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx) { void ctx; }, // Handled in EarthKit
};

const quake: Ability = {
  id: 'quake',
  name: 'Quake',
  description: 'Fractured zone 5s: occasionally trips enemies (5 dmg + 0.5s stun)',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) { void ctx; }, // Handled in EarthKit
};

/**
 * The old Q. Not in the loadout any more — Biome Builder took the key — but kept whole, with
 * its kit code behind `LEGACY_GOLEM_Q` in EarthKit, for the ability that will reuse it.
 */
export const golemRitualAbility: Ability = {
  id: 'golem-ritual',
  name: 'Golem Ritual',
  description: 'Sacrifice shield to summon a Golem (150 HP, 15s). 50% of your damage redirected to it',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 45000,
  cast(ctx) { void ctx; }, // Handled in EarthKit
};

const biomeBuilder: Ability = {
  id: 'biome-builder',
  name: 'Biome Builder',
  description: 'Stand untouchable at the arena\'s heart and raise up to 4 biomes, one per quarter, for 20s',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx) { void ctx; }, // Handled in EarthKit
};

export const earthElement: Element = {
  id: 'earth',
  name: 'Earth',
  color: 0x887755,
  emoji: '🪨',
  abilities: [bash, repair, rockDance, quake, biomeBuilder],
};
