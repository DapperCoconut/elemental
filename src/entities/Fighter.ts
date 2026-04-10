import Phaser from 'phaser';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { HealthBar } from '../combat/HealthBar';

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public speed: number;
  public element: Element;
  public isInvincible = false;
  public shieldCharges = 0;
  public shieldHp = 0;
  public incomingDamageMultiplier = 1;
  public chargeRatio = 0;   // 0–1, drives the yellow charge bar in HealthBar
  public lastIncomingDamage = 0; // set in takeDamage() before shield check — used by reflect upgrades

  private cooldowns: Map<string, number> = new Map();
  private healthBar: HealthBar;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    element: Element,
    maxHp = 100,
    speed = 200,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;
    this.element = element;

    // Circular physics body matching the drawn circle (radius 22 inside 48x48 texture)
    const radius = 22;
    const offset = (48 - radius * 2) / 2;
    (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, offset, offset);
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    this.healthBar = new HealthBar(scene, maxHp);
    this.setDepth(5);
  }

  takeDamage(amount: number): void {
    if (this.isInvincible) return;
    amount = Math.round(amount * this.incomingDamageMultiplier);
    this.lastIncomingDamage = amount;

    if (this.shieldCharges > 0) {
      this.shieldCharges--;
      this.setAlpha(0.7);
      this.scene.time.delayedCall(200, () => {
        if (this.active) this.setAlpha(1);
      });
      this.emit('damaged', 0); // 0 = shield blocked
      return;
    }

    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, amount);
      this.shieldHp -= absorbed;
      amount -= absorbed;
      if (amount === 0) {
        this.emit('damaged', 0);
        this.setAlpha(0.7);
        this.scene.time.delayedCall(200, () => { if (this.active) this.setAlpha(1); });
        return;
      }
    }

    this.hp = Math.max(0, this.hp - amount);
    this.emit('damaged', amount);

    this.setAlpha(0.3);
    this.scene.time.delayedCall(150, () => {
      if (this.active) this.setAlpha(1);
    });

    if (this.hp <= 0) {
      this.emit('defeated');
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Like takeDamage but bypasses isInvincible — used for self-inflicted effects. */
  applySelfDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.emit('damaged', amount);

    this.setAlpha(0.3);
    this.scene.time.delayedCall(150, () => {
      if (this.active) this.setAlpha(1);
    });

    if (this.hp <= 0) {
      this.emit('defeated');
    }
  }

  castAbility(abilityId: string, ctx: CastContext): boolean {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return false;

    const now = Date.now();
    if (now - (this.cooldowns.get(abilityId) ?? 0) < ability.cooldown) return false;

    this.cooldowns.set(abilityId, now);
    ability.cast(ctx);
    return true;
  }

  /** Starts the cooldown for an ability without calling cast() — for charge-and-release abilities. */
  triggerCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
  }

  /** Returns 0 = on cooldown, 1 = ready */
  getCooldownRatio(abilityId: string): number {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return 1;
    const elapsed = Date.now() - (this.cooldowns.get(abilityId) ?? 0);
    return Math.min(1, elapsed / ability.cooldown);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.healthBar.update(this.x, this.y, this.hp, this.shieldHp, this.chargeRatio);
  }

  destroy(fromScene?: boolean): void {
    this.healthBar.destroy();
    super.destroy(fromScene);
  }
}
