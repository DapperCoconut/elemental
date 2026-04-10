import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/** Point-to-segment distance helper for hitscan */
function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

type SceneWithFighters = Phaser.Scene & {
  npc?: { x: number; y: number; takeDamage?: (n: number) => void };
  player?: { x: number; y: number; takeDamage?: (n: number) => void };
};

function fireHitscan(ctx: CastContext, damage: number, lineColor: number, reportResult: boolean): void {
  const dx = ctx.targetX - ctx.casterX;
  const dy = ctx.targetY - ctx.casterY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const maxRange = 900;
  const endX = ctx.casterX + (dx / len) * maxRange;
  const endY = ctx.casterY + (dy / len) * maxRange;
  const lineWidth = damage > 50 ? 6 : 3;

  const gfx = ctx.scene.add.graphics().setDepth(8);
  gfx.lineStyle(lineWidth, lineColor, 1);
  gfx.beginPath();
  gfx.moveTo(ctx.casterX, ctx.casterY);
  gfx.lineTo(endX, endY);
  gfx.strokePath();
  const core = ctx.scene.add.graphics().setDepth(9);
  core.lineStyle(lineWidth > 3 ? 2 : 1, 0xffffff, 1);
  core.beginPath();
  core.moveTo(ctx.casterX, ctx.casterY);
  core.lineTo(endX, endY);
  core.strokePath();
  ctx.scene.tweens.add({ targets: [gfx, core], alpha: 0, duration: 200, onComplete: () => { gfx.destroy(); core.destroy(); } });

  const scene = ctx.scene as SceneWithFighters;
  const opp = ctx.isPlayerCaster ? scene.npc : scene.player;
  const hit = !!opp && pointToSegmentDist(opp.x, opp.y, ctx.casterX, ctx.casterY, endX, endY) <= 30;
  if (hit) opp!.takeDamage?.(damage);
  if (reportResult) ctx.reportAirSnipeResult(hit);
}

const airSnipe: Ability = {
  id: 'air-snipe',
  name: 'Air Snipe',
  description: 'Charge 0.5s, fire piercing hitscan (30 dmg)',
  displayKey: 'Click',
  cooldown: 2000,
  cast(ctx) {
    if (ctx.quickShotActive) {
      fireHitscan(ctx, 30, 0xccddff, true);
    } else {
      ctx.lockCaster(500);
      const charge = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 8, 0xaaddff, 0.7).setDepth(8);
      ctx.scene.tweens.add({ targets: charge, scaleX: 2.5, scaleY: 2.5, alpha: 0.3, duration: 500, onComplete: () => charge.destroy() });
      ctx.scene.time.delayedCall(500, () => fireHitscan(ctx, 30, 0xccddff, true));
    }
  },
};

const quickShot: Ability = {
  id: 'quick-shot',
  name: 'Quick Shot',
  description: 'Next snipe fires instantly',
  displayKey: 'E',
  cooldown: 12000,
  cast(ctx) {
    ctx.activateQuickShot();
    // Visual: brief pulse on caster
    const pulse = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 14, 0xaaddff, 0.6).setDepth(8);
    ctx.scene.tweens.add({ targets: pulse, scaleX: 2, scaleY: 2, alpha: 0, duration: 300, onComplete: () => pulse.destroy() });
  },
};

const windTrap: Ability = {
  id: 'wind-trap',
  name: 'Wind Trap',
  description: 'Trap foe in wind circle 5s',
  displayKey: 'R',
  cooldown: 20000,
  cast(ctx) {
    ctx.placeWindTrap(ctx.targetX, ctx.targetY);
  },
};

const grapple: Ability = {
  id: 'grapple',
  name: 'Grapple',
  description: 'Hook to cursor. Next hit: 20% dodge',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx) {
    ctx.grappleTo(ctx.targetX, ctx.targetY);
  },
};

const chargedBeam: Ability = {
  id: 'charged-beam',
  name: 'Charged Beam',
  description: '3 hit combo → 1.5s, 100 dmg laser',
  displayKey: 'Q',
  cooldown: 5000,
  cast(ctx) {
    ctx.lockCaster(1500);
    const charge = ctx.scene.add.circle(ctx.casterX, ctx.casterY, 14, 0x88ccff, 0.8).setDepth(8);
    ctx.scene.tweens.add({ targets: charge, scaleX: 5, scaleY: 5, alpha: 0.1, duration: 1500, onComplete: () => charge.destroy() });
    ctx.scene.time.delayedCall(1500, () => fireHitscan(ctx, 100, 0x88ccff, false));
  },
};

export const airElement: Element = {
  id: 'air',
  name: 'Air',
  color: 0xaaddff,
  emoji: '💨',
  abilities: [airSnipe, quickShot, windTrap, grapple, chargedBeam],
};
