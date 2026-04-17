import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';

export class FesteringGrowth {
  public readonly scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Arc;
  public x: number;
  public y: number;
  public hp: number;
  public readonly maxHp = 30;
  public active = true;
  private shootCooldownUntil = 0;
  private readonly shootCooldownMs = 2000;
  /** Owner architect reference ID (used for counting growths per architect) */
  public readonly architectId: number;

  /** Callback: spawn a noxious projectile toward the player from this growth */
  public onShoot?: (fromX: number, fromY: number, toX: number, toY: number) => void;
  /** Callback: apply poison to player */
  public onPoison?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, architectId: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.architectId = architectId;
    this.sprite = scene.add
      .circle(x, y, 14, 0x002200, 0.95)
      .setStrokeStyle(2, 0x44cc44, 0.8)
      .setDepth(3);

    // Spawn animation
    const pop = scene.add.circle(x, y, 8, 0x44ff44, 0.5).setDepth(4);
    scene.tweens.add({
      targets: pop, scaleX: 3, scaleY: 3, alpha: 0, duration: 400,
      onComplete: () => pop.destroy(),
    });
  }

  /** Called each frame by InvasionScene. Returns damage number if it shoots. */
  tick(target: Fighter, time: number): number {
    if (!this.active) return 0;

    // Pulsing visual
    this.sprite.setRadius(13 + Math.sin(time * 0.004) * 2);

    // Shoot at player
    if (time >= this.shootCooldownUntil) {
      this.shootCooldownUntil = time + this.shootCooldownMs;
      this.onShoot?.(this.x, this.y, target.x, target.y);
    }
    return 0;
  }

  takeDamage(amount: number): void {
    if (!this.active) return;
    this.hp -= amount;
    // Flash
    const flash = this.scene.add.circle(this.x, this.y, 18, 0xffffff, 0.4).setDepth(5);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
    if (this.hp <= 0) this.destroy();
  }

  destroy(): void {
    if (!this.active) return;
    this.active = false;
    const boom = this.scene.add.circle(this.x, this.y, 10, 0x44ff44, 0.7).setDepth(5);
    this.scene.tweens.add({ targets: boom, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
    this.sprite.destroy();
  }
}
