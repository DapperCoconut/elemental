import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Projectile } from '../../combat/Projectile';
import { CorruptedBase, CorruptedType } from './CorruptedBase';

export class ProtectedCorrupted extends CorruptedBase {
  /** Forcefield HP — absorbs projectile damage for self + nearby allies */
  public forcefieldHp = 150;
  public readonly forcefieldRadius = 120;
  private readonly maxForcefieldHp = 150;
  private healTickAccum = 0;
  private readonly healPerMs = 3 / 1000; // 3 HP/s
  private readonly healAuraRadius = 140;
  private auraSprite: Phaser.GameObjects.Arc | null = null;
  private moveCooldownUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 80, speed = 80) {
    super(scene, x, y, 'corrupted-protected', CorruptedType.Protected, maxHp, speed);
    // Visual forcefield aura
    this.auraSprite = (scene as Phaser.Scene).add
      .circle(x, y, this.forcefieldRadius, 0x0044aa, 0.15)
      .setStrokeStyle(2, 0x44aaff, 0.7)
      .setDepth(3);
  }

  aiTick(
    _target: Fighter,
    _projectiles: Phaser.Physics.Arcade.Group,
    allCorrupted: CorruptedBase[],
    _time: number,
    delta: number,
  ): void {
    if (!this.active || this.hp <= 0) {
      this.auraSprite?.setVisible(false);
      return;
    }

    // Update aura position
    if (this.auraSprite) {
      this.auraSprite.setPosition(this.x, this.y);
      // Alpha reflects remaining forcefield
      const ratio = Math.max(0, this.forcefieldHp / this.maxForcefieldHp);
      this.auraSprite.setAlpha(ratio > 0 ? 0.1 + ratio * 0.3 : 0);
    }

    // Heal nearby corrupted
    this.healTickAccum += delta;
    const healPerTick = this.healPerMs * this.healTickAccum;
    if (healPerTick >= 1) {
      this.healTickAccum = 0;
      for (const c of allCorrupted) {
        if (!c.active || c === this || c.hp <= 0) continue;
        const d = Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y);
        if (d <= this.healAuraRadius) {
          c.heal(Math.floor(healPerTick));
        }
      }
    }

    // Slow movement — stay near other corrupted
    const body = this.body as Phaser.Physics.Arcade.Body;
    let nearestAlly: CorruptedBase | null = null;
    let nearestDist = Infinity;
    for (const c of allCorrupted) {
      if (!c.active || c === this || c.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y);
      if (d < nearestDist) { nearestDist = d; nearestAlly = c; }
    }

    if (nearestAlly && nearestDist > 150) {
      const dx = nearestAlly.x - this.x;
      const dy = nearestAlly.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      body.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);
    } else {
      body.setVelocity(0, 0);
    }
  }

  destroy(fromScene?: boolean): void {
    this.auraSprite?.destroy();
    this.auraSprite = null;
    super.destroy(fromScene);
  }
}

void (Projectile as unknown);
