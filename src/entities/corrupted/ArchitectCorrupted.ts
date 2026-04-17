import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Projectile } from '../../combat/Projectile';
import { CorruptedBase, CorruptedType } from './CorruptedBase';

export class ArchitectCorrupted extends CorruptedBase {
  private spawnCooldownUntil = 0;
  private readonly spawnCooldownMs = 4000;
  private readonly preferredRange = 240;
  private readonly maxGrowths = 3;

  /** Callback provided by InvasionScene to spawn a FesteringGrowth */
  public onSpawnGrowth?: (x: number, y: number) => void;
  /** Callback to count living growths owned by this architect */
  public countMyGrowths?: () => number;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 70, speed = 60) {
    super(scene, x, y, 'corrupted-architect', CorruptedType.Architect, maxHp, speed);
  }

  aiTick(
    target: Fighter,
    _projectiles: Phaser.Physics.Arcade.Group,
    _allCorrupted: CorruptedBase[],
    time: number,
    _delta: number,
  ): void {
    if (!this.active || this.hp <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Retreat if player is too close
    if (dist < this.preferredRange - 40) {
      body.setVelocity((-dx / dist) * this.speed, (-dy / dist) * this.speed);
    } else if (dist > this.preferredRange + 60) {
      // Approach to preferred range
      body.setVelocity((dx / dist) * this.speed * 0.5, (dy / dist) * this.speed * 0.5);
    } else {
      body.setVelocity(0, 0);
    }

    // Spawn festering growths
    if (time >= this.spawnCooldownUntil) {
      const living = this.countMyGrowths ? this.countMyGrowths() : 0;
      if (living < this.maxGrowths && this.onSpawnGrowth) {
        const angle = Math.random() * Math.PI * 2;
        const range = 80 + Math.random() * 120;
        const gx = Phaser.Math.Clamp(this.x + Math.cos(angle) * range, 60, 2340);
        const gy = Phaser.Math.Clamp(this.y + Math.sin(angle) * range, 60, 1540);
        this.onSpawnGrowth(gx, gy);
        this.spawnCooldownUntil = time + this.spawnCooldownMs;
      }
    }
  }
}

void (Projectile as unknown);
