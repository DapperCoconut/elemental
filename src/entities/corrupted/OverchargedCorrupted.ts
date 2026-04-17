import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Projectile } from '../../combat/Projectile';
import { CorruptedBase, CorruptedType } from './CorruptedBase';

export class OverchargedCorrupted extends CorruptedBase {
  private meleeCooldownUntil = 0;
  private readonly meleeCooldownMs = 900;
  private readonly meleeRange = 60;
  private readonly meleeDamage = 8;
  private exploded = false;

  // Callbacks supplied by InvasionScene for death effects
  public onDeathExplosion?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 60, speed = 100) {
    super(scene, x, y, 'corrupted-overcharged', CorruptedType.Overcharged, maxHp, speed);

    this.on('defeated', () => {
      if (this.exploded) return;
      this.exploded = true;
      this.onDeathExplosion?.(this.x, this.y);
    });
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

    if (dist <= this.meleeRange && time >= this.meleeCooldownUntil) {
      this.meleeCooldownUntil = time + this.meleeCooldownMs;
      target.takeDamage(this.meleeDamage);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (dist > this.meleeRange * 0.8) {
      body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
    } else {
      body.setVelocity(0, 0);
    }
  }
}

void (Projectile as unknown);
