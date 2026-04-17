import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Projectile } from '../../combat/Projectile';
import { CorruptedBase, CorruptedType } from './CorruptedBase';

export class BasicCorrupted extends CorruptedBase {
  private meleeCooldownUntil = 0;
  private readonly meleeCooldownMs = 800;
  private readonly meleeRange = 60;
  private readonly meleeDamage = 8;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 40, speed = 120) {
    super(scene, x, y, 'corrupted-basic', CorruptedType.Basic, maxHp, speed);
  }

  aiTick(
    target: Fighter,
    _projectiles: Phaser.Physics.Arcade.Group,
    _allCorrupted: CorruptedBase[],
    time: number,
    _delta: number,
  ): void {
    if (!this.active || this.hp <= 0) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Melee attack when in range
    if (dist <= this.meleeRange && time >= this.meleeCooldownUntil) {
      this.meleeCooldownUntil = time + this.meleeCooldownMs;
      target.takeDamage(this.meleeDamage);
    }

    // Chase player
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (dist > this.meleeRange * 0.8) {
      body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    } else {
      body.setVelocity(0, 0);
    }
  }
}

// Satisfy import — Projectile is used by subclasses
void (Projectile as unknown);
