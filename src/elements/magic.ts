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
  description: 'Hold to open a 5-spell wheel. ← / → to select, release to cast. (1: Flare — a slow burning orb; 2: Splash — a slowing pool; 3: Spur — three burs; 4: Gust — dash, and drag whoever it catches back to the cast point; 5: Ward — orbiting stones that eat projectiles)',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { ctx.magicOpenGrimoire(); },
};

const magicAnchor: Ability = {
  id: 'magic-anchor',
  name: 'Crosshair',
  description: 'Paint a crosshair on the nearest enemy for 6s. Every Sparkle Shot that goes off on them adds a tally, up to 5. Right-click to cash it in: 8 damage per tally in a 110px burst. Let it lapse and you get nothing.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.magicAnchorToggle(ctx.targetX, ctx.targetY); },
};

const meditate: Ability = {
  id: 'magic-meditate',
  name: 'Dupe',
  description: 'Open a 140px duplication field at your cursor. Every one of your own conjurations standing inside it — Flares, pools, burs, Gust trails, Ward stones, summons — comes out twice. Free: Darkness is charged by the corrupted spells, not by copying them.',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx) { ctx.magicMeditateBegin(); },
};

const necronomicon: Ability = {
  id: 'magic-necronomicon',
  name: 'Necronomicon',
  description: 'Hold to open a 5-summon wheel. ← / → to select, release to call. The familiar fights on its own for 18s and can be killed. (1: Fire — fire bolts; 2: Water — slowing darts; 3: Life — a thorn warden that closes to melee; 4: Wind — knocks enemies away; 5: Earth — a slow golem that hits hardest)',
  displayKey: 'Q',
  isUltimate: true,
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
