import { Element } from './Element';
import { Ability, CastContext } from './Ability';

const stab: Ability = {
  id: 'stab',
  name: 'Stab',
  description: 'Close-range stab (120px), 15 dmg',
  displayKey: 'Click',
  cooldown: 1000,
  cast(ctx: CastContext) {
    ctx.dealMeleeDamage(120, 15, 0);

    // Visual: short brown slash toward target
    const dx = ctx.targetX - ctx.casterX;
    const dy = ctx.targetY - ctx.casterY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const slashX = ctx.casterX + (dx / len) * 55;
    const slashY = ctx.casterY + (dy / len) * 55;
    const slash = ctx.scene.add.circle(slashX, slashY, 18, 0xaa8844, 0.85).setDepth(8);
    ctx.scene.tweens.add({
      targets: slash, scaleX: 3.5, scaleY: 1.2, alpha: 0, duration: 180,
      onComplete: () => slash.destroy(),
    });
  },
};

const shieldUp: Ability = {
  id: 'shield-up',
  name: 'Shield Up',
  description: 'Hold E: charge shield at 5/s (max 100)',
  displayKey: 'E',
  cooldown: 0,
  cast(ctx: CastContext) {
    // NPC use: instant +10 shield
    ctx.setShieldHp(Math.min(100, ctx.getShieldHp() + 10));

    // Visual: brown ring pulse
    const ring = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 18, 0x997744, 0.7).setDepth(4);
    ctx.scene.tweens.add({
      targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 380,
      onComplete: () => ring.destroy(),
    });
  },
};

const shieldSlam: Ability = {
  id: 'shield-slam',
  name: 'Shield Slam',
  description: 'Dash: hit = ½ shield dmg; wall = 3s bounce',
  displayKey: 'R',
  cooldown: 5000,
  cast(ctx: CastContext) {
    ctx.slamCaster();

    // Visual: trail burst
    const burst = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 14, 0xbb9955, 0.7).setDepth(4);
    ctx.scene.tweens.add({
      targets: burst, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 250,
      onComplete: () => burst.destroy(),
    });
  },
};

const shieldBreak: Ability = {
  id: 'shield-break',
  name: 'Shield Break',
  description: 'AOE = ½ shield dmg, removes all shield',
  displayKey: 'F',
  cooldown: 5000,
  cast(ctx: CastContext) {
    const shield = ctx.getShieldHp();
    const damage = Math.floor(shield / 2);
    if (damage > 0) {
      ctx.dealAoeDamage(ctx.casterX, ctx.casterY, 140, damage);
    }
    ctx.setShieldHp(0);

    // Visual: large brown/gold explosion ring
    const ring = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 14, 0xcc9944, 0.9).setDepth(4);
    ctx.scene.tweens.add({
      targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 480,
      onComplete: () => ring.destroy(),
    });
    const core = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 8, 0xffdd88, 1).setDepth(5);
    ctx.scene.tweens.add({
      targets: core, scaleX: 5, scaleY: 5, alpha: 0, duration: 220,
      onComplete: () => core.destroy(),
    });
  },
};

const bullRush: Ability = {
  id: 'bull-rush',
  name: 'Bull Rush',
  description: 'Rage 6s toward cursor — heavy knockback, 20% DR',
  displayKey: 'Q',
  cooldown: 40000,
  cast(ctx: CastContext) {
    ctx.startBullRush();
  },
};

export const earthElement: Element = {
  id: 'earth',
  name: 'Earth',
  color: 0x887755,
  emoji: '🪨',
  abilities: [stab, shieldUp, shieldSlam, shieldBreak, bullRush],
};
