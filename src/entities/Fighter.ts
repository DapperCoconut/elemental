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
  /** Quantum element blue-form damage reduction (0.85 in blue form, 1 otherwise). Multiplied in takeDamage. */
  public quantumIncomingMult = 1;
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
  /** 0–1+ probability that an incoming hit is dodged (can exceed 1.0, stacks). Each dodge subtracts 0.2. */
  public dodgeChance = 0;
  /** Timestamp after which the fighter can cast abilities again (Disarm effect). */
  public disarmedUntil = 0;
  /**
   * Online play: when true this fighter is a remote-player replica whose HP is
   * network-authoritative. Local damage/heals only play hit feedback and never
   * change vitals — the real numbers arrive via netSyncVitals().
   */
  public netGhost = false;
  /** Invoked with the final computed damage when a netGhost fighter is hit — used to report damage to the authoritative peer (invasion co-op husk replicas). */
  public onGhostDamage: ((amount: number) => void) | null = null;
  /** Invasion co-op: true while this fighter is downed and awaiting revive. Enemies should ignore downed targets. */
  public downed = false;
  /** Online play: invoked whenever a cast is stamped (castAbility success, triggerCooldown, startCooldown). */
  public onCastStamp: ((abilityId: string) => void) | null = null;
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

  // ── Per-fighter status effects (set by ArenaScene when hit) ─────
  public burningUntil = 0;
  public burnTickAccum = 0;
  public burnAura: Phaser.GameObjects.Arc | null = null;
  /** Fire Mastery — Cremation stoke bonus: added to burn tick damage; persists through re-ignition, cleared only when burningUntil expires. */
  public fireStokeBonus = 0;

  /** Fire Mastery — Heatwave: while exposed, the next damage taken is amplified 1.5x. */
  public exposedUntil = 0;
  public exposedIcon: Phaser.GameObjects.Text | null = null;
  /** Timestamp exposed was consumed by a hit — short grace window so an ignition from that same hit upgrades to molten fire. */
  public exposedConsumedAt = 0;
  /** Fire Mastery — molten fire: replaces normal burn when an exposed target is ignited. */
  public moltenUntil = 0;
  public moltenTickAccum = 0;
  public moltenAura: Phaser.GameObjects.Arc | null = null;

  public frostStacks = 0;
  /** Expiry timestamps (Date.now()-based) for each individual frost stack — oldest first. */
  public frostStackTimers: number[] = [];
  public frostVisual: Phaser.GameObjects.Text | null = null;
  public frozenUntil = 0;
  public frozenSolidAmpReady = false;

  public voidFrostStacks = 0;
  /** Expiry timestamps (Date.now()-based) for each individual void frost stack — oldest first. */
  public voidFrostStackTimers: number[] = [];
  public voidFrostVisual: Phaser.GameObjects.Text | null = null;
  public voidFrostTickAccum = 0;

  public permafrostStacks = 0;
  public permafrostVisual: Phaser.GameObjects.Text | null = null;
  public permavoidStacks = 0;
  public permavoidVisual: Phaser.GameObjects.Text | null = null;
  public frostImmuneUntil = 0;
  public voidImmuneUntil = 0;

  public toxicUntil = 0;
  public toxicDps = 0;
  public toxicTickAccum = 0;
  public toxicAura: Phaser.GameObjects.Arc | null = null;

  public bleeding = false;
  public bleedingUntil = 0;
  public bleedVisual: Phaser.GameObjects.Arc | null = null;

  public magicChainBound = false;
  public magicChainBoundEnd = 0;

  public silencePossessedUntil = 0;

  public slimeConfusedUntil = 0;
  public slimeConfuseVx = 0;
  public slimeConfuseVy = 0;
  public slimeConfuseDirUntil = 0;

  /** Acid Purge (Slime F): timestamp until which positive stat boosts (speed) are suppressed. */
  public purgedUntil = 0;
  /** Acid Purge: multiplier applied on top of a fighter's own speed calc — used to cancel a baked-in variant speed bonus (invasion husks). Default 1. */
  public purgeSpeedMult = 1;

  public earthStunnedUntil = 0;
  /** Earth Mastery — Dust Screen: while active, Husk AI wanders/misfires instead of pathfinding normally. */
  public confusedWanderUntil = 0;

  // Silence upgrade status effects
  public statueUntil = 0;
  public healStopUntil = 0;
  public forceRetreatUntil = 0;

  // Dark magic status effects (Magic element upgrades)
  public darkVulnStacks = 0;         // +25% incoming dmg per stack (acid cloud)
  public darkLinkedUntil = 0;        // Torture Trap link expiry (Date.now() based)
  public darkLinkSource: Fighter | null = null; // healed when this fighter takes damage

  // Oil E+ Oily status
  public oilyUntil = 0;
  public oilyBurnUntil = 0;
  public oilyBurnAccum = 0;

  public lavaRockBurnUntil = 0;
  public lavaRockBurnAccum = 0;

  // Alcohol perk intoxication
  public intoxicatedUntil = 0;
  public intoxicationSlowUntil = 0;
  public intoxicationPendingSlowExtra = 0;

  /** Multiplier applied to all outgoing damage this fighter deals. Default 1 (Lust payload). */
  public outgoingDamageMult = 1;
  /** Additional aim inaccuracy in degrees (added on top of difficulty preset). Default 0 (Anger payload). */
  public aimOffsetBonusDeg = 0;
  /** Timestamp until which aimOffsetBonusDeg is active. */
  public aimOffsetBonusUntil = 0;

  /** Oil Mastery — Drone Array: 0.9^drones incoming damage while drones orbit. Default 1. */
  public droneArmorMult = 1;

  /** Electricity Mastery — Kinetic Shield: incoming damage resistance scaling with kinetic power. Default 1. */
  public kineticShieldMult = 1;

  /** Earth Mastery — Unbreakable: forced-velocity effects from other abilities skip this fighter. Default false. */
  public knockbackImmune = false;
  /** Earth Mastery — Unbreakable: caps any single hit's damage to this value. 0 = no cap. */
  public hardDamageCap = 0;

  // ── Gauntlet card stat fields ────────────────────────────────────────
  /** Card: reduces all incoming damage. Default 1 (Protected card). */
  public cardDamageTakenMult = 1;
  /** Card: multiplies all outgoing damage from this fighter. Default 1 (Deadly card on player). */
  public cardOutgoingDamageMult = 1;
  /** Card: HP regeneration per second (Regenerative card). Processed by ArenaScene update. */
  public regenPerSecond = 0;
  /** Accumulator (ms) for regen ticks. Managed by ArenaScene. */
  public regenAccumMs = 0;
  /** Card: multiplies duration of status effects applied TO this fighter by the player (Painful card, set on NPC). */
  public statusDurMult = 1;
  /** Card: multiplies damage of status effects applied TO this fighter by the player (Painful card, set on NPC). */
  public statusDmgMult = 1;
  /** Card: reduces Q-ability cooldowns. Default 1 (Finality card on player). */
  public ultimateCooldownMult = 1;
  /** Card: fraction of incoming damage reflected back to the attacker (Thorns card). */
  public reflectFraction = 0;
  /** Card: burn damage multiplier for DOT ticks applied to this fighter (Painful card, set on NPC). */
  public burnDpsMult = 1;

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

  reduceMaxHp(amount: number): void {
    this.maxHp = Math.max(1, this.maxHp - amount);
    this.hp = Math.min(this.hp, this.maxHp);
    this.healthBar.setMaxHp(this.maxHp);
  }

  increaseMaxHp(amount: number): void {
    this.maxHp += amount;
    this.healthBar.setMaxHp(this.maxHp);
  }

  takeDamage(amount: number, opts?: { pierce?: boolean; fireDot?: boolean }): void {
    if (!opts?.pierce && this.isInvincible) return;
    if (this.statueUntil > 0) this.statueUntil = 0;

    // Crit roll: use any incoming crit context set by the attacker
    const critCtx = this.incomingCritCtx;
    this.incomingCritCtx = null;
    const effectiveCritChance = critCtx ? Math.min(1, critCtx.chance + this.incomingCritBonus) : 0;
    const isCrit = effectiveCritChance > 0 && Math.random() < effectiveCritChance;
    if (isCrit) {
      amount = Math.round(amount * (critCtx?.mult ?? 2));
    }

    amount = Math.round(amount * this.incomingDamageMultiplier * this.gauntletDamageTakenMult * this.quantumIncomingMult * this.cardDamageTakenMult * this.droneArmorMult * this.kineticShieldMult);
    if (this.darkVulnStacks > 0) amount = Math.round(amount * (1 + 0.25 * this.darkVulnStacks));
    // Fire Mastery — Heatwave: exposed amplifies the next hit, then is consumed.
    // Fire damage-over-time is exempt on both counts: burn/molten ticks are neither
    // amplified nor allowed to eat the buff, so a tick can't rob the next real hit.
    if (!opts?.fireDot && this.exposedUntil > this.scene.time.now) {
      amount = Math.round(amount * 1.5);
      this.exposedUntil = 0;
      this.exposedConsumedAt = this.scene.time.now;
    }
    // Earth Mastery — Unbreakable: applied last so nothing upstream can push a hit back above the cap.
    if (this.hardDamageCap > 0) amount = Math.min(amount, this.hardDamageCap);
    this.lastIncomingDamage = amount;
    if (isCrit) this.emit('damaged-crit', amount);

    if (this.netGhost) {
      // Hit feedback only — vitals come from the network. Report the computed
      // amount so the local owner can forward it to the authoritative peer.
      this.onGhostDamage?.(amount);
      if (!this.forceInvisible) {
        this.setAlpha(0.5);
        this.scene.time.delayedCall(120, () => {
          if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
        });
      }
      return;
    }

    if (!opts?.pierce && this.damageAbsorber && this.damageAbsorber(amount)) return;

    if (!opts?.pierce && this.shieldCharges > 0) {
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

    if (!opts?.pierce && this.shieldHp > 0) {
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
    if (amount > 0 && this.onDamaged) this.onDamaged(amount);

    // Torture Trap lifesteal: heal the link source for actual damage taken
    if (amount > 0 && this.darkLinkSource && this.darkLinkSource.active && Date.now() < this.darkLinkedUntil) {
      this.darkLinkSource.heal(amount);
    }

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

  /** Optional callback invoked with the actual HP gained (> 0) whenever healing occurs. */
  public onHeal?: (actualAmount: number) => void;

  /** Optional callback invoked with the final post-mitigation damage (> 0) whenever a real hit lands. */
  public onDamaged?: (amount: number) => void;

  heal(amount: number): void {
    if (this.netGhost) return;
    if (this.healStopUntil > 0 && Date.now() < this.healStopUntil) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const actual = this.hp - before;
    if (actual > 0 && this.onHeal) this.onHeal(actual);
  }

  /** Online play: apply network-authoritative vitals to a replica fighter. */
  netSyncVitals(hp: number, maxHp: number, shieldHp: number, shieldCharges: number): void {
    if (maxHp !== this.maxHp) {
      this.maxHp = maxHp;
      this.healthBar.setMaxHp(maxHp);
    }
    this.hp = hp;
    this.shieldHp = shieldHp;
    this.shieldCharges = shieldCharges;
  }

  setMaxHp(newMax: number): void {
    this.maxHp = newMax;
    this.hp = newMax;
    this.healthBar.setMaxHp(newMax);
  }

  setHealthBarVisible(visible: boolean): void {
    if (visible) {
      this.healthBar.visible = true;
    } else {
      this.healthBar.hide();
    }
  }

  hideHealthBar(): void {
    this.healthBar.hide();
  }

  /** Like takeDamage but bypasses isInvincible — used for self-inflicted effects. */
  applySelfDamage(amount: number): void {
    if (this.netGhost) return;
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

  /** Roll a dodge. Returns true if the hit is dodged; subtracts 0.2 from dodgeChance on success. */
  rollDodge(): boolean {
    if (this.dodgeChance <= 0) return false;
    if (Math.random() < Math.min(1, this.dodgeChance)) {
      this.dodgeChance = Math.max(0, this.dodgeChance - 0.2);
      return true;
    }
    return false;
  }

  /** Apply a Disarm effect lasting `ms` milliseconds (prevents ability casts). */
  applyDisarm(ms: number): void {
    this.disarmedUntil = Math.max(this.disarmedUntil, Date.now() + ms);
  }

  castAbility(abilityId: string, ctx: CastContext): boolean {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return false;

    const now = Date.now();
    if (now < this.disarmedUntil) return false;
    const ultimateExtra = (ability as { isUltimate?: boolean }).isUltimate ? this.ultimateCooldownMult : 1;
    if (now - (this.cooldowns.get(abilityId) ?? 0) < ability.cooldown * this.cooldownMult * ultimateExtra) return false;

    this.cooldowns.set(abilityId, now);
    this.onCastStamp?.(abilityId);
    ability.cast(ctx);
    return true;
  }

  /** Starts the cooldown for an ability without calling cast() — for charge-and-release abilities. */
  triggerCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
    this.onCastStamp?.(abilityId);
  }

  /** Shift all stored cooldown timestamps forward by deltaMs (used to compensate for real-time elapsed during a game pause). */
  shiftCooldowns(deltaMs: number): void {
    for (const [k, v] of this.cooldowns) this.cooldowns.set(k, v + deltaMs);
  }

  /** Force an ability's cooldown to start right now (used by kits that manage their own CD timing). */
  startCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
    this.onCastStamp?.(abilityId);
  }

  /** Reduce remaining cooldown of an ability by byMs milliseconds (cannot make it readier than fully ready). */
  reduceCooldown(abilityId: string, byMs: number): void {
    const stored = this.cooldowns.get(abilityId) ?? 0;
    this.cooldowns.set(abilityId, stored - byMs);
  }

  /** Make an ability immediately ready (clears its cooldown). */
  resetCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, 0);
  }

  /** Returns 0 = on cooldown, 1 = ready */
  getCooldownRatio(abilityId: string): number {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return 1;
    const elapsed = Date.now() - (this.cooldowns.get(abilityId) ?? 0);
    const ultimateCdExtra = (ability as { isUltimate?: boolean }).isUltimate ? this.ultimateCooldownMult : 1;
    const effectiveCd = ability.cooldown * (this.cooldownMult || 1) * ultimateCdExtra;
    return Math.min(1, elapsed / effectiveCd);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.healthBar.update(this.x, this.y, this.hp, this.shieldHp, this.chargeRatio);
  }

  destroy(fromScene?: boolean): void {
    this.healthBar.destroy();
    if (this.burnAura) { this.burnAura.destroy(); this.burnAura = null; }
    if (this.frostVisual) { this.frostVisual.destroy(); this.frostVisual = null; }
    if (this.voidFrostVisual) { this.voidFrostVisual.destroy(); this.voidFrostVisual = null; }
    if (this.toxicAura) { this.toxicAura.destroy(); this.toxicAura = null; }
    if (this.bleedVisual) { this.bleedVisual.destroy(); this.bleedVisual = null; }
    if (this.permafrostVisual) { this.permafrostVisual.destroy(); this.permafrostVisual = null; }
    if (this.permavoidVisual) { this.permavoidVisual.destroy(); this.permavoidVisual = null; }
    super.destroy(fromScene);
  }
}
