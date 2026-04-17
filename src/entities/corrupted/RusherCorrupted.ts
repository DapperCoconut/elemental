import Phaser from 'phaser';
import { Fighter } from '../Fighter';
import { Projectile } from '../../combat/Projectile';
import { CorruptedBase, CorruptedType } from './CorruptedBase';

type RushState = 'waiting' | 'telegraphing' | 'rushing' | 'cooldown';

export class RusherCorrupted extends CorruptedBase {
  private rushState: RushState = 'waiting';
  private stateUntil = 0;
  private rushVx = 0;
  private rushVy = 0;
  private telegraphGraphic: Phaser.GameObjects.Graphics | null = null;
  private readonly rushContactDamage = 30;
  private readonly rushSpeed = 400;
  private readonly telegraphMs = 500;
  private readonly cooldownMs = 1200;
  private readonly rushDurationMs = 800;
  private contactDealt = false;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHp = 30, speed = 80) {
    super(scene, x, y, 'corrupted-rusher', CorruptedType.Rusher, maxHp, speed);
    // Begin in a short waiting period before first rush
    this.stateUntil = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time.now + 600;
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

    switch (this.rushState) {
      case 'waiting': {
        body.setVelocity(0, 0);
        if (time >= this.stateUntil) {
          // Begin telegraph: show line toward current target position
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          this.rushVx = (dx / len) * this.rushSpeed;
          this.rushVy = (dy / len) * this.rushSpeed;

          if (!this.telegraphGraphic) {
            this.telegraphGraphic = (this.scene as Phaser.Scene).add.graphics().setDepth(4);
          }
          this.telegraphGraphic.clear();
          this.telegraphGraphic.lineStyle(3, 0xff2222, 0.85);
          const endX = this.x + (dx / len) * 320;
          const endY = this.y + (dy / len) * 320;
          this.telegraphGraphic.lineBetween(this.x, this.y, endX, endY);

          this.rushState = 'telegraphing';
          this.stateUntil = time + this.telegraphMs;
          this.contactDealt = false;
        }
        break;
      }
      case 'telegraphing': {
        body.setVelocity(0, 0);
        // Keep telegraph visual updated
        if (this.telegraphGraphic) {
          const tx = this.x + (this.rushVx / this.rushSpeed) * 320;
          const ty = this.y + (this.rushVy / this.rushSpeed) * 320;
          this.telegraphGraphic.clear();
          this.telegraphGraphic.lineStyle(3, 0xff2222, 0.85);
          this.telegraphGraphic.lineBetween(this.x, this.y, tx, ty);
        }
        if (time >= this.stateUntil) {
          if (this.telegraphGraphic) {
            this.telegraphGraphic.clear();
          }
          this.rushState = 'rushing';
          this.stateUntil = time + this.rushDurationMs;
        }
        break;
      }
      case 'rushing': {
        body.setVelocity(this.rushVx, this.rushVy);
        // Check contact with player
        if (!this.contactDealt) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
          if (dist <= 48) {
            this.contactDealt = true;
            target.takeDamage(this.rushContactDamage);
          }
        }
        if (time >= this.stateUntil) {
          body.setVelocity(0, 0);
          this.rushState = 'cooldown';
          this.stateUntil = time + this.cooldownMs;
        }
        break;
      }
      case 'cooldown': {
        body.setVelocity(0, 0);
        if (time >= this.stateUntil) {
          this.rushState = 'waiting';
          this.stateUntil = time + 300;
        }
        break;
      }
    }
  }

  destroy(fromScene?: boolean): void {
    this.telegraphGraphic?.destroy();
    this.telegraphGraphic = null;
    super.destroy(fromScene);
  }
}

void (Projectile as unknown);
