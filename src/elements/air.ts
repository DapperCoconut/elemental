import { Element } from './Element';
import { Ability, CastContext } from './Ability';
import { AIR, AirFx } from './kits/AirVisuals';

/** Effects painter bound to whoever is casting (so a future colour cosmetic recolours their air). */
function fx(ctx: CastContext): AirFx {
  return new AirFx(ctx.scene, ctx.airColor);
}

/**
 * Live position of whoever is casting, for channels that have to track a caster who can still
 * move (Swift Aim and Lingering Beam both unroot their channel). Null once they are gone.
 */
function casterTracker(ctx: CastContext): () => { x: number; y: number } | null {
  const scene = ctx.scene as SceneWithFighters;
  return () => {
    const c = ctx.isPlayerCaster ? scene.player : scene.npc;
    return c ? { x: c.x, y: c.y } : { x: ctx.casterX, y: ctx.casterY };
  };
}

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
  enemies?: Array<{ active: boolean; hp: number; x: number; y: number; takeDamage?: (n: number) => void }>;
};

/** Returns the position of every target the beam ran through, so callers can score multi-hits. */
export function fireHitscan(
  ctx: CastContext,
  damage: number,
  lineColor: number,
  reportResult: boolean,
): Array<{ x: number; y: number }> {
  const dx = ctx.targetX - ctx.casterX;
  const dy = ctx.targetY - ctx.casterY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const maxRange = 900;
  const endX = ctx.casterX + (dx / len) * maxRange;
  const endY = ctx.casterY + (dy / len) * maxRange;
  // A heavier shot displaces more air: the lance widens and throws more shear off its flanks.
  const heavy = damage > 50;
  const f = fx(ctx);
  f.crackShot(ctx.casterX, ctx.casterY, endX, endY, {
    color: lineColor,
    width: heavy ? 9 : 5.5,
    duration: heavy ? 400 : 280,
  });
  f.muzzleGust(ctx.casterX, ctx.casterY, Math.atan2(dy, dx), heavy ? 1.5 : 1);

  const scene = ctx.scene as SceneWithFighters;
  const hitTargets: Array<{ x: number; y: number }> = [];
  if (ctx.isPlayerCaster && scene.enemies && scene.enemies.length > 0) {
    for (const t of scene.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (pointToSegmentDist(t.x, t.y, ctx.casterX, ctx.casterY, endX, endY) <= 30) {
        // Capture the position before takeDamage — a lethal hit can move or deactivate the target.
        hitTargets.push({ x: t.x, y: t.y });
        t.takeDamage?.(damage);
      }
    }
  } else {
    const opp = ctx.isPlayerCaster ? scene.npc : scene.player;
    if (opp && pointToSegmentDist(opp.x, opp.y, ctx.casterX, ctx.casterY, endX, endY) <= 30) {
      hitTargets.push({ x: opp.x, y: opp.y });
      opp.takeDamage?.(damage);
    }
  }
  // Every body the lance punched through gets its own pocket of displaced air.
  for (const h of hitTargets) {
    f.gustBurst(h.x, h.y, heavy ? 76 : 46, { duration: heavy ? 400 : 300, dust: false });
  }
  if (reportResult) ctx.reportAirSnipeResult(hitTargets.length > 0, hitTargets);
  return hitTargets;
}

/** Q upgrade: hitscan that bounces off walls up to `maxBounces` times. */
export function fireBounceHitscan(
  ctx: CastContext,
  damage: number,
  maxBounces: number,
  W: number,
  H: number,
): void {
  let sx = ctx.casterX, sy = ctx.casterY;
  let dx = ctx.targetX - ctx.casterX;
  let dy = ctx.targetY - ctx.casterY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= len; dy /= len;

  const f = fx(ctx);
  f.muzzleGust(ctx.casterX, ctx.casterY, Math.atan2(dy, dx), 1.5);

  const scene = ctx.scene as SceneWithFighters;
  let remaining = 900;
  // Each leg fires slightly after the one before it, so the lance visibly ricochets down the
  // arena instead of every segment popping into existence on the same frame.
  let legDelay = 0;

  for (let bounce = 0; bounce <= maxBounces && remaining > 0; bounce++) {
    let tMin = remaining;
    let hitWall: 'h' | 'v' | null = null;

    if (dx < -0.0001) { const t = (0 - sx)   / dx; if (t > 0.1 && t < tMin) { tMin = t; hitWall = 'v'; } }
    if (dx >  0.0001) { const t = (W - sx)   / dx; if (t > 0.1 && t < tMin) { tMin = t; hitWall = 'v'; } }
    if (dy < -0.0001) { const t = (0 - sy)   / dy; if (t > 0.1 && t < tMin) { tMin = t; hitWall = 'h'; } }
    if (dy >  0.0001) { const t = (H - sy)   / dy; if (t > 0.1 && t < tMin) { tMin = t; hitWall = 'h'; } }

    const ex = sx + dx * tMin;
    const ey = sy + dy * tMin;

    const legX = sx, legY = sy, legEx = ex, legEy = ey;
    const wall = hitWall;
    ctx.scene.time.delayedCall(legDelay, () => {
      f.crackShot(legX, legY, legEx, legEy, { color: AIR.blue, width: 8, duration: 380 });
      // Wall strike: the lance folds against the boundary and sprays back off it.
      if (wall) {
        f.ring(legEx, legEy, 8, 70, AIR.mist, 320, 4, 7);
        f.motes(legEx, legEy, 8, {
          angle: Math.atan2(legEy - legY, legEx - legX) + Math.PI,
          spread: 1.1, speed: 220, size: 3, life: 420, swirl: 1.6, depth: 7,
        });
      }
    });
    legDelay += 70;

    if (ctx.isPlayerCaster && scene.enemies && scene.enemies.length > 0) {
      for (const t of scene.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (pointToSegmentDist(t.x, t.y, sx, sy, ex, ey) <= 30) {
          const hx = t.x, hy = t.y;
          ctx.scene.time.delayedCall(legDelay - 70, () => f.gustBurst(hx, hy, 76, { duration: 400, dust: false }));
          t.takeDamage?.(damage);
        }
      }
    } else {
      const opp = ctx.isPlayerCaster ? scene.npc : scene.player;
      if (opp && pointToSegmentDist(opp.x, opp.y, sx, sy, ex, ey) <= 30) {
        const hx = opp.x, hy = opp.y;
        ctx.scene.time.delayedCall(legDelay - 70, () => f.gustBurst(hx, hy, 76, { duration: 400, dust: false }));
        opp.takeDamage?.(damage);
      }
    }

    remaining -= tMin;
    if (!hitWall || bounce === maxBounces) break;
    if (hitWall === 'v') dx = -dx;
    else                  dy = -dy;
    sx = ex + dx * 0.5;
    sy = ey + dy * 0.5;
  }
}

const airSnipe: Ability = {
  id: 'air-snipe',
  name: 'Air Snipe',
  description: 'Charge 0.5s, fire piercing hitscan (30 dmg)',
  displayKey: 'Click',
  cooldown: 2000,
  cast(ctx) {
    if (ctx.quickShotActive) {
      fireHitscan(ctx, 30, AIR.frost, true);
    } else {
      ctx.lockCaster(500);
      // Half a second of drawing the air back into the hands before it is let go. Pinned to
      // the cast origin rather than the caster: the shot leaves from here even with Swift Aim
      // unrooting the charge, so a following gather would promise a muzzle that never fires.
      fx(ctx).channelCharge(ctx.casterX, ctx.casterY, 68, 500);
      ctx.scene.time.delayedCall(500, () => fireHitscan(ctx, 30, AIR.frost, true));
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
    // A snap of air pulled in tight around the caster: the next shot is already loaded.
    const f = fx(ctx);
    f.bloom(ctx.casterX, ctx.casterY, 54, 9, 5);
    f.ring(ctx.casterX, ctx.casterY, 46, 16, AIR.frost, 320, 4, 6);
    f.motes(ctx.casterX, ctx.casterY, 8, { speed: 90, size: 2.6, life: 380, swirl: 2.2, depth: 6 });
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
  description: 'Hook to cursor. On landing, fully dodge the next hit',
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
  isUltimate: true,
  cooldown: 5000,
  cast(ctx) {
    ctx.lockCaster(1500);
    const f = fx(ctx);
    // A second and a half of the arena's air being wound onto the caster before it lets go.
    f.channelCharge(ctx.casterX, ctx.casterY, 150, 1500, casterTracker(ctx));
    ctx.scene.time.delayedCall(1500, () => {
      f.updraft(ctx.casterX, ctx.casterY, 34, 96);
      ctx.reportAirBeamHits(fireHitscan(ctx, 100, AIR.blue, false).length);
      ctx.scene.cameras.main.shake(180, 0.005);
    });
  },
};

export const airElement: Element = {
  id: 'air',
  name: 'Air',
  color: 0xaaddff,
  emoji: '💨',
  abilities: [airSnipe, quickShot, windTrap, grapple, chargedBeam],
};
