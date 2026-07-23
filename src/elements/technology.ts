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
  description: '12 popups scatter across the arena — translucent on your screen, solid on the enemy\'s. Standing under your own popup grants 25% damage resistance and invisibility. An enemy who touches a popup catches a virus (3+ dmg/s for 5s, worse the faster they move). Popups vanish after 3s.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx) { ctx.techAdsCast(); },
};

const upload: Ability = {
  id: 'tech-upload',
  name: 'Upload',
  description: 'Fire a cord — always tethered to you — toward your cursor. Only the head has a hitbox. A hit turns the enemy into a box for 6s: grid movement only, no diagonals. If it hits nothing, the head waits at your cursor for 5s.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx) { ctx.techUploadCast(ctx.targetX, ctx.targetY); },
};

const webDrag: Ability = {
  id: 'tech-webdrag',
  name: 'Web Drag',
  description: 'Turn your cursor into a drag cursor for 6s. Hold click on the enemy, a popup, or your Upload cord head to drag it around, then release to drop it.',
  displayKey: 'F',
  cooldown: 10000,
  cast(ctx) { ctx.techWebDragCast(); },
};

const adminConsole: Ability = {
  id: 'tech-admin',
  name: 'Admin Console',
  description: 'Become invincible and unable to attack for 8s while a console challenges you to type a binary string. Correct digits earn Admin Points, wrong ones cost one (starts at 0). Afterward, cash in cumulatively: 5=Invincible(5s), 10=Invisible(8s), 20=35 dmg to the enemy, 35=Jail, 50=Ban (instantly kills an enemy below 15% HP).',
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
  abilities: [addictingCruncher, overtAdvertisement, upload, webDrag, adminConsole],
};
