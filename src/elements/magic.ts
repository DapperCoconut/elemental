import { Element } from './Element';
import { Ability } from './Ability';

const sparkleShot: Ability = {
  id: 'magic-sparkle-shot',
  name: 'Sparkle Shot',
  description: 'Launch a star-shaped projectile toward your cursor that stops after ~180px. After 1s stationary it bursts in a small AoE (14 dmg). Direct hit deals 6 dmg.',
  displayKey: 'Click',
  cooldown: 3000,
  cast(ctx) { ctx.magicSparkleShot(ctx.targetX, ctx.targetY); },
};

const grimoire: Ability = {
  id: 'magic-grimoire',
  name: 'Grimoire',
  description: 'Hold to open a 5-ability wheel. ← / → to select, release to cast. (1: Flame Burst, 2: Storm Cloud, 3: Virulent Thorns, 4: Compression Blast, 5: Gaia\'s Guidance)',
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
  description: 'Hold to open a powerful 5-ability wheel. ← / → to select, release to cast. (1: Flame Barrage, 2: Final Drench, 3: Thorn Prison, 4: Tornado Blast, 5: Gaia\'s Rage)',
  displayKey: 'Q',
  cooldown: 30000,
  cast(ctx) { ctx.magicOpenNecronomicon(); },
};

export const magicElement: Element = {
  id: 'magic',
  name: 'Magic',
  color: 0x9944ff,
  emoji: '📖',
  abilities: [sparkleShot, grimoire, magicAnchor, meditate, necronomicon],
};
