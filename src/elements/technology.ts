import { Element } from './Element';
import { Ability } from './Ability';

const addictingCruncher: Ability = {
  id: 'tech-cruncher',
  name: 'Addicting Cruncher',
  description: 'Launch a green triangle that leaves a binary trail. A hit: +5% smaller cooldown, +5% damage, +5% projectile speed (stacks to +100%). A miss: +10% smaller cooldown but -5% damage, -5% speed (never worse than base).',
  displayKey: 'Click',
  cooldown: 0,
  cast(ctx) { ctx.techCruncherFire(ctx.targetX, ctx.targetY); },
};

const overtAdvertisement: Ability = {
  id: 'tech-ads',
  name: 'Overt Advertisement',
  description: '12 popup ads scatter across the arena — translucent on your screen, solid on the enemy\'s. Standing under your own popup grants 25% damage resistance and invisibility. An enemy who touches one gets 2 virus critters crawling over their screen: after a couple of seconds each one starts draining 2 HP a second, and keeps draining until it is clicked. Popups close after 3s.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) { ctx.techAdsCast(); },
};

const zipBomb: Ability = {
  id: 'tech-zip',
  name: 'Zip Bomb',
  description: 'Launch a very slow file toward your cursor — it rubber-bands back along its path now and then. An enemy it reaches lags for 10s: they snap back to where they were, freeze under a loading circle, and their cooldowns stall. They are also asked to restart their computer: Yes clears the lag but stuns them for 3s, puts every ability on full cooldown and empties their ultimate. Web Drag can pick the file up.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx) { ctx.techZipCast(ctx.targetX, ctx.targetY); },
};

const webDrag: Ability = {
  id: 'tech-webdrag',
  name: 'Web Drag',
  description: 'Turn your cursor into a drag cursor for 6s. Hold click on the enemy, a popup, or your Zip Bomb file to drag it around, then release to drop it.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) { ctx.techWebDragCast(); },
};

const adminConsole: Ability = {
  id: 'tech-admin',
  name: 'Admin Console',
  description: 'Open an admin console: a window of commands and a red abuse bar (max 100). Each command adds abuse, and the console leaves when the bar is spent. Fling 10 · Jail 20 (3s cell) · Fly 20 (5s) · Kill 25 (20 damage) · Invis 25 (5s) · Give 50 (a phaser: faster, stronger red pac-men for 10s) · Speed 50 (+33% attack, move and cooldown speed for 10s) · Invincible 100 (5s) · Ban 100 (instantly kills an enemy below 15% HP).',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 60000,
  cast(ctx) { ctx.techAdminCast(); },
};

export const technologyElement: Element = {
  id: 'technology',
  name: 'Technology',
  color: 0x44ccaa,
  emoji: '💻',
  abilities: [addictingCruncher, overtAdvertisement, zipBomb, webDrag, adminConsole],
};
