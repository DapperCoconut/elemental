import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { Projectile } from '../combat/Projectile';

const PELLET_COUNT = 20;
const CONE_HALF_DEG = 25;
const PELLET_SPEED = 320;
const PELLET_RANGE_PX = 120;

const huntShotgun: Ability = {
  id: 'hunt-shotgun',
  name: 'Shotgun',
  description: '20 pellets in a cone, 1 dmg each.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) {
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const baseAngle = Math.atan2(dy, dx);
    const expireMs = Math.round((PELLET_RANGE_PX / PELLET_SPEED) * 1000);
    for (let i = 0; i < PELLET_COUNT; i++) {
      const frac = i / (PELLET_COUNT - 1);
      const angleDeg = -CONE_HALF_DEG + frac * CONE_HALF_DEG * 2;
      const angle = baseAngle + angleDeg * (Math.PI / 180);
      const proj = new Projectile(
        ctx.scene,
        ctx.casterX + Math.cos(angle) * 22,
        ctx.casterY + Math.sin(angle) * 22,
        'proj-hunt-pellet',
        1,
        ctx.isPlayerCaster,
      );
      ctx.projectiles.add(proj);
      proj.launch(Math.cos(angle) * PELLET_SPEED, Math.sin(angle) * PELLET_SPEED);
      ctx.scene.time.delayedCall(expireMs, () => {
        if (proj.active) {
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        }
      });
    }
  },
};

const huntGrenade: Ability = {
  id: 'hunt-grenade',
  name: 'Grenade',
  description: 'Hold E: fuse ticks. Release to throw ~145px. Explodes 3s after arming. Full hold = self-dmg.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.huntThrowGrenade(ctx.targetX, ctx.targetY, 0); },
};

const huntHuntersTrail: Ability = {
  id: 'hunt-trail',
  name: "Hunter's Trail",
  description: "Enemy leaves trail 3s. Walking on trail: +50% speed (2s circles).",
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.huntHuntersTrail(); },
};

const huntBloodPact: Ability = {
  id: 'hunt-blood-pact',
  name: 'Blood Pact',
  description: '5s: heal 50% of damage dealt.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.huntBloodPact(); },
};

const huntTransform: Ability = {
  id: 'hunt-transform',
  name: 'Transform',
  description: 'Become the beast: +20% size, +50% speed. 25s CD after reverting.',
  displayKey: 'Q',
  cooldown: 25000,
  cast(ctx: CastContext) { ctx.huntTransform(); },
};

// ── Beast form ──────────────────────────────────────────────────

const huntSlash: Ability = {
  id: 'hunt-slash',
  name: 'Slash',
  description: 'Lunge + 20 dmg + knockback. Applies bleeding (8s).',
  displayKey: 'Click',
  cooldown: 800,
  cast(ctx: CastContext) { ctx.huntSlash(ctx.targetX, ctx.targetY); },
};

const huntLeap: Ability = {
  id: 'hunt-leap',
  name: 'Explosive Leap',
  description: 'Invisible+invincible 2s, teleport to cursor with AoE explosion.',
  displayKey: 'E',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.huntLeap(ctx.targetX, ctx.targetY); },
};

const huntBloodHunt: Ability = {
  id: 'hunt-blood-hunt',
  name: 'Blood Hunt',
  description: 'Teleport to bleeding enemy, roar + 50% slow 3s. Requires bleed.',
  displayKey: 'R',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.huntBloodHunt(); },
};

const huntBloodMoon: Ability = {
  id: 'hunt-blood-moon',
  name: 'Blood Moon',
  description: '12s: bleeding enemies take chip dmg + attack 20% less.',
  displayKey: 'F',
  cooldown: 35000,
  cast(ctx: CastContext) { ctx.huntBloodMoon(); },
};

const huntUntransform: Ability = {
  id: 'hunt-untransform',
  name: 'Revert',
  description: 'Return to normal form. Starts 25s transform CD.',
  displayKey: 'Q',
  cooldown: 0,
  cast(ctx: CastContext) { ctx.huntUntransform(); },
};

export const huntElement: Element = {
  id: 'hunt',
  name: 'Hunt',
  color: 0xcc4400,
  emoji: '🐺',
  abilities: [
    huntShotgun, huntGrenade, huntHuntersTrail, huntBloodPact, huntTransform,
    huntSlash, huntLeap, huntBloodHunt, huntBloodMoon, huntUntransform,
  ],
};
