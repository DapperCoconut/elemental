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
  /** Multiply all ability cooldowns by this factor (< 1 = faster, e.g. Reborn post-revival). */
  public cooldownMult = 1;
  /** If set, called with the damage amount before shields; return true to absorb the hit entirely. */
  public damageAbsorber: ((amount: number) => boolean) | null = null;
  /** Used by Hunt element roar lock. Default false for non-NPC fighters. */
  public npcHuntRoarLocked = false;
  /** Gauntlet boost: multiplies all incoming damage (stacks with incomingDamageMultiplier). Default 1. */
  public gauntletDamageTakenMult = 1;
  /** When true, skip alpha flash in takeDamage/applySelfDamage and keep alpha at 0 (Stealthy mutation). */
  public forceInvisible = false;
  /** 0–1 probability that outgoing attacks deal a critical hit (2× damage). */
  public critChance = 0;
  /** Damage multiplier applied on a critical hit. Default 2. */
  public critMult = 2;
  /** Additive bonus added to an attacker's critChance when this fighter is the target. */
  public incomingCritBonus = 0;
  /** Visual/physics size multiplier applied by Fate Slots. Default 1. */
  public sizeMult = 1;
  /** Walk speed multiplier applied by Fate Slots. Default 1. */
  public walkSpeedMult = 1;

  private incomingCritCtx: { chance: number; mult: number } | null = null;
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

  /** Called by the attacker (or damage source) just before takeDamage to supply crit context for this hit. */
  setIncomingCritContext(chance: number, mult: number): void {
    this.incomingCritCtx = { chance, mult };
  }

  /** Update visual scale and physics body to match sizeMult. Call after changing sizeMult. */
  applySizeMult(): void {
    this.setScale(this.sizeMult);
    const baseRadius = 22;
    const radius = Math.round(baseRadius * this.sizeMult);
    const offset = (48 - radius * 2) / 2;
    (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, offset, offset);
  }

  takeDamage(amount: number): void {
    if (this.isInvincible) return;

    // Crit roll: use any incoming crit context set by the attacker
    const critCtx = this.incomingCritCtx;
    this.incomingCritCtx = null;
    const effectiveCritChance = critCtx ? Math.min(1, critCtx.chance + this.incomingCritBonus) : 0;
    const isCrit = effectiveCritChance > 0 && Math.random() < effectiveCritChance;
    if (isCrit) {
      amount = Math.round(amount * (critCtx?.mult ?? 2));
    }

    amount = Math.round(amount * this.incomingDamageMultiplier * this.gauntletDamageTakenMult);
    this.lastIncomingDamage = amount;
    if (isCrit) this.emit('damaged-crit', amount);

    if (this.damageAbsorber && this.damageAbsorber(amount)) return;

    if (this.shieldCharges > 0) {
      this.shieldCharges--;
      if (!this.forceInvisible) {
        this.setAlpha(0.7);
        this.scene.time.delayedCall(200, () => {
          if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
        });
      }
      this.emit('damaged', 0); // 0 = shield blocked
      return;
    }

    if (this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, amount);
      this.shieldHp -= absorbed;
      amount -= absorbed;
      if (amount === 0) {
        this.emit('damaged', 0);
        if (!this.forceInvisible) {
          this.setAlpha(0.7);
          this.scene.time.delayedCall(200, () => { if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1); });
        }
        return;
      }
    }

    this.hp = Math.max(0, this.hp - amount);
    this.emit('damaged', amount);

    if (!this.forceInvisible) {
      this.setAlpha(0.3);
      this.scene.time.delayedCall(150, () => {
        if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
      });
    }

    if (this.hp <= 0) {
      this.emit('defeated');
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  setMaxHp(newMax: number): void {
    this.maxHp = newMax;
    this.hp = newMax;
    this.healthBar.setMaxHp(newMax);
  }

  setHealthBarVisible(visible: boolean): void {
    this.healthBar.visible = visible;
  }

  /** Like takeDamage but bypasses isInvincible — used for self-inflicted effects. */
  applySelfDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.emit('damaged', amount);

    if (!this.forceInvisible) {
      this.setAlpha(0.3);
      this.scene.time.delayedCall(150, () => {
        if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
      });
    }

    if (this.hp <= 0) {
      this.emit('defeated');
    }
  }

  castAbility(abilityId: string, ctx: CastContext): boolean {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return false;

    const now = Date.now();
    if (now - (this.cooldowns.get(abilityId) ?? 0) < ability.cooldown * this.cooldownMult) return false;

    this.cooldowns.set(abilityId, now);
    ability.cast(ctx);
    return true;
  }

  /** Starts the cooldown for an ability without calling cast() — for charge-and-release abilities. */
  triggerCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
  }

  /** Reduce remaining cooldown of an ability by byMs milliseconds (cannot make it readier than fully ready). */
  reduceCooldown(abilityId: string, byMs: number): void {
    const stored = this.cooldowns.get(abilityId) ?? 0;
    this.cooldowns.set(abilityId, stored - byMs);
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
