import Phaser from 'phaser';
import type { Projectile } from './Projectile';
import type { ProjectileRegistry, RegisteredProjectile } from './ProjectileRegistry';

/**
 * Fighters' shots in flight, handed to arena rules (an Isles gimmick's rubber wall, a
 * Sovereign's rebound) as small handles: where the shot is, whose it is, and two verbs —
 * `block` it, or `reflect` it off a surface and turn it on whoever fired it.
 *
 * Covers ArenaScene's shared physics projectiles (bounceable) and the kit-local projectiles
 * that register with the ProjectileRegistry (stealable only). Beams, AoE and instant hits are
 * not shots and never show up here.
 */
export interface ShotHandle {
  readonly x: number;
  readonly y: number;
  /** Who fired it. */
  readonly owner: 'player' | 'npc';
  readonly damage: number;
  /** Destroy it without it hitting anything. */
  block(): void;
  /**
   * Bounce it off a surface with normal (nx, ny) — or straight back without one — and make it
   * the other side's shot (`keepOwner` to only bounce). False when it cannot be bounced (a
   * kit-local projectile): it is blocked instead.
   */
  reflect(nx?: number, ny?: number, keepOwner?: boolean): boolean;
}

export function shotsNear(
  projectiles: Phaser.Physics.Arcade.Group, registry: ProjectileRegistry, x: number, y: number, r: number,
): ShotHandle[] {
  const out: ShotHandle[] = [];
  for (const o of projectiles.getChildren()) {
    const p = o as Projectile;
    if (!p.active || p.isHeal || Math.hypot(p.x - x, p.y - y) > r) continue;
    out.push(bodyShot(p));
  }
  for (const owner of ['player', 'npc'] as const) {
    for (const p of registry.within(owner, x, y, r)) out.push(kitShot(registry, p));
  }
  return out;
}

function bodyShot(p: Projectile): ShotHandle {
  return {
    x: p.x, y: p.y, owner: p.isFromPlayer ? 'player' : 'npc', damage: p.damage,
    block: () => { p.setActive(false).setVisible(false); (p.body as Phaser.Physics.Arcade.Body | null)?.stop(); },
    reflect: (nx?: number, ny?: number, keepOwner?: boolean) => {
      const b = p.body as Phaser.Physics.Arcade.Body | null;
      if (!b || !p.active) return false;
      let vx = b.velocity.x, vy = b.velocity.y;
      const n = nx !== undefined && ny !== undefined ? Math.hypot(nx, ny) : 0;
      if (n > 0) {
        const ux = nx! / n, uy = ny! / n, d = vx * ux + vy * uy;
        // Only bounce a shot heading into the surface — one already leaving it is left alone.
        if (d < 0) { vx -= 2 * d * ux; vy -= 2 * d * uy; }
      } else { vx = -vx; vy = -vy; }
      b.setVelocity(vx, vy);
      p.setRotation(Math.atan2(vy, vx));
      // `isFromPlayer` is readonly to the kits that fire shots; a reflection is the one thing
      // allowed to change whose shot it is.
      if (!keepOwner) (p as unknown as { isFromPlayer: boolean }).isFromPlayer = !p.isFromPlayer;
      return true;
    },
  };
}

function kitShot(reg: ProjectileRegistry, p: RegisteredProjectile): ShotHandle {
  return {
    x: p.getX(), y: p.getY(), owner: p.owner, damage: p.damage,
    block: () => reg.steal(p),
    reflect: () => { reg.steal(p); return false; },
  };
}
