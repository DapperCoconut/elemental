/**
 * Shared registry of kit-local travelling projectiles so cross-cutting effects
 * (e.g. Technology's Annoying Goose stealing bullets) can find and remove them
 * without knowing about each kit's private arrays. Kits register a projectile
 * when they spawn it and remove it when it despawns; `steal()` must remove the
 * projectile from the owning kit silently — no hit or miss side effects.
 *
 * Projectiles in ArenaScene's shared Phaser physics group are NOT registered
 * here; consumers scan that group separately via the `Projectile` class.
 */

export interface RegisteredProjectile {
  owner: 'player' | 'npc';
  getX(): number;
  getY(): number;
  damage: number;
  /** Remove from the owning kit: destroy sprite + splice its array, no hit/miss effects. */
  steal(): void;
}

export class ProjectileRegistry {
  private entries = new Set<RegisteredProjectile>();

  add(p: RegisteredProjectile): void {
    this.entries.add(p);
  }

  remove(p: RegisteredProjectile): void {
    this.entries.delete(p);
  }

  /** Nearest registered projectile belonging to `owner` within `radius` of (x, y). */
  nearest(owner: 'player' | 'npc', x: number, y: number, radius: number): RegisteredProjectile | null {
    let best: RegisteredProjectile | null = null;
    let bestDist = radius;
    for (const p of this.entries) {
      if (p.owner !== owner) continue;
      const d = Math.hypot(p.getX() - x, p.getY() - y);
      if (d <= bestDist) { best = p; bestDist = d; }
    }
    return best;
  }

  /** Every registered projectile belonging to `owner` within `radius` of (x, y). */
  within(owner: 'player' | 'npc', x: number, y: number, radius: number): RegisteredProjectile[] {
    const out: RegisteredProjectile[] = [];
    for (const p of this.entries) {
      if (p.owner !== owner) continue;
      if (Math.hypot(p.getX() - x, p.getY() - y) <= radius) out.push(p);
    }
    return out;
  }

  /** Remove `p` from the registry and the owning kit. */
  steal(p: RegisteredProjectile): void {
    this.entries.delete(p);
    p.steal();
  }

  clear(): void {
    this.entries.clear();
  }
}
