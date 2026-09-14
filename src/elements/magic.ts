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
  description: 'Hold to open a 5-spell wheel. ← / → to select, release to cast. (1: Flare — a slow orb that follows your cursor until it laps it once, then flies loose; 15 dmg + burn. 2: Splash — a huge, long-lived slowing pool. 3: Spur — 15 barbs scattered at your feet that slow and sting whoever steps on them. 4: Gust — dash to your cursor, drag whoever you pass back to the cast point, and burst for 15 with big knockback on landing. 5: Ward — a circle granting +3 shield HP/s and 25% damage resistance while you stand in it; the shield leaves with you.)',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx) { ctx.magicOpenGrimoire(); },
};

const magicAnchor: Ability = {
  id: 'magic-anchor',
  name: 'Magic Missiles',
  description: 'Paint a crosshair on the nearest enemy for 3s. While it holds, every click on them conjures a homing magic missile worth 2 damage — the spell is exactly as strong as your clicking finger is fast.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx) { ctx.magicAnchorToggle(ctx.targetX, ctx.targetY); },
};

const meditate: Ability = {
  id: 'magic-meditate',
  name: 'Duplication',
  description: 'Record a square of the arena at your cursor into a scroll — it flashes purple, and everything of yours inside (Flares, pools, barbs, trails, Wards, elementals) is written down. The scroll drops where the square was: drag it with the mouse and let go to conjure the whole recording again at the drop point. Free.',
  displayKey: 'F',
  cooldown: 6000,
  cast(ctx) { ctx.magicMeditateBegin(); },
};

const necronomicon: Ability = {
  id: 'magic-necronomicon',
  name: 'Summon',
  description: 'Hold to open a 5-summon wheel. ← / → to select, release to call. The elemental paces the top of the arena for 8s, assisting in its own way, and can be shot down. (1: Fire — bullet cones and fire pillars; 2: Water — waves that slam enemies into the wall, plus slowing pools; 3: Life — slowing vine darts and healing orbs that fly home to you; 4: Wind — raging mini tornadoes and lightning strokes; 5: Earth — walls that block only the enemy, and shield stone for you)',
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
