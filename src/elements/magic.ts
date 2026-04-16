import { Element } from './Element';
import { Ability } from './Ability';

const magicMissiles: Ability = {
  id: 'magic-missiles',
  name: 'Magic Missiles',
  description: 'Launch a barrage of 5 projectiles in a 30° cone. Each missile deals 8 damage.',
  displayKey: 'Click',
  cooldown: 3000,
  cast(ctx) { ctx.magicMissiles(ctx.targetX, ctx.targetY); },
};

const grimoire: Ability = {
  id: 'magic-grimoire',
  name: 'Grimoire',
  description: 'Hold to open a 6-ability wheel. Aim with the mouse, release to cast. Tap to re-cast last selection. (1: Cluster Bomb, 2: Slow Zone, 3: Triple Beam, 4: Bind Chain, 5: Boomerang, 6: Pillars)',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { ctx.magicOpenGrimoire(); },
};

const magicAnchor: Ability = {
  id: 'magic-anchor',
  name: 'Magic Anchor',
  description: 'First cast places a faint anchor marker at your position. Second cast teleports you back to it with an AOE shockwave (20 damage, 120px radius).',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.magicAnchorToggle(ctx.targetX, ctx.targetY); },
};

const meditate: Ability = {
  id: 'magic-meditate',
  name: 'Meditate',
  description: 'Hold to stand still and summon purple orbs from screen edges every 0.5s. Orbs heal you 5 HP and deal 8 damage to enemies they pass through. Taking damage interrupts the channel (costs 20 HP).',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx) { ctx.magicMeditateBegin(); },
};

const necronomicon: Ability = {
  id: 'magic-necronomicon',
  name: 'Necronomicon',
  description: 'Hold to open a powerful 4-ability wheel. Aim with the mouse, release to cast. (1: Pillar Storm, 2: Orbital Bars, 3: Blink x20, 4: Root to Corners)',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx) { ctx.magicOpenNecronomicon(); },
};

export const magicElement: Element = {
  id: 'magic',
  name: 'Magic',
  color: 0x9944ff,
  emoji: '📖',
  abilities: [magicMissiles, grimoire, magicAnchor, meditate, necronomicon],
};
