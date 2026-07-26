import Phaser from 'phaser';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { HealthBar } from '../combat/HealthBar';

/**
 * Magic Mastery — Levitate: tracks the last known position of any damage-source object
 * (a puddle, cloud, trap, etc.) so `Fighter.takeDamage` can tell whether it has been sitting
 * in the same spot for at least `thresholdMs`. Keyed by object identity (WeakMap), so callers
 * must pass the same persistent object every tick — a fresh literal each call never "ages".
 */
const stationaryTrackers = new WeakMap<object, { x: number; y: number; lastMovedAt: number }>();

function isStationaryFor(source: object, x: number, y: number, thresholdMs: number): boolean {
  const now = Date.now();
  const rec = stationaryTrackers.get(source);
  if (!rec) {
    stationaryTrackers.set(source, { x, y, lastMovedAt: now });
    return false;
  }
  if (Math.abs(rec.x - x) > 1 || Math.abs(rec.y - y) > 1) {
    rec.x = x; rec.y = y; rec.lastMovedAt = now;
    return false;
  }
  return now - rec.lastMovedAt >= thresholdMs;
}

export interface DamageOpts {
  pierce?: boolean;
  fireDot?: boolean;
  source?: object;
  sourceX?: number;
  sourceY?: number;
  /**
   * Online PvP: this hit was computed on the attacker's machine and relayed. Every
   * multiplier stage (crit, vulnerability, armour, caps) already ran there against a
   * replica carrying the same passives, so only the local absorb layers — invincibility,
   * absorber, shields, clotted/weak HP — are applied again here.
   */
  netApplied?: boolean;
  /**
   * Damage a fighter inflicts on itself through the normal (shielded) pipeline. Exempt
   * from the online damage gate: the opponent's sim has no copy of it to relay, so
   * blocking it would simply delete the ability's cost.
   */
  selfInflicted?: boolean;
}

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public speed: number;
  public element: Element;
  public isInvincible = false;
  public shieldCharges = 0;
  public shieldHp = 0;
  /** Metal R+ (Blood Clottage): dark-red HP layer. Absorbs damage at half rate and is spent before normal HP. */
  public clottedHp = 0;
  /** Quantum blue E: gray "weak HP" layer. Absorbs damage like shield HP (bonus), but decays 3/s. */
  public weakHp = 0;
  public incomingDamageMultiplier = 1;
  /** Subterfuge Bribe: 0.75 while this fighter's attacker is bribed (victim-side stand-in for "deals 25% less"). */
  public bribeIncomingMult = 1;
  /**
   * Subterfuge Mastery — Smoke Break: 0.75 while this fighter has a cigarette lit. Kept out of
   * the `armored` status aggregate on purpose — SubterfugeKit shows its own 🚬 timer box, and
   * the cigarette's shrinking duration is the part worth watching.
   */
  public smokeIncomingMult = 1;
  /** Creation Buff Potion: 1.25 while whoever is damaging this fighter is potion-empowered (victim-side stand-in for "deals 25% more"). */
  public empoweredIncomingMult = 1;
  /** Creation Protection Potion: 0.75 while this fighter is potion-protected. */
  public potionArmorMult = 1;
  /**
   * Shadow Hopelessness: 0–100. Applied by Shadow's pools, traps and tentacles. Every 2%
   * cuts the afflicted fighter's outgoing damage by 1% (capped at 50% at 100%). Held here
   * rather than in ShadowKit so the status tray and any sim can read it.
   */
  public hopelessness = 0;
  /**
   * Victim-side stand-in for "my attacker is hopeless, so they deal less". ShadowKit keeps
   * this in sync with the opposing fighter's `hopelessness` each frame — same pattern as
   * `bribeIncomingMult`, since `takeDamage` has no attacker reference.
   */
  public hopelessIncomingMult = 1;
  /**
   * Running total of damage aimed at this fighter this match, tallied *before* any of the
   * incoming-damage multipliers below are applied — so a mitigation that saves your life
   * (Shadow's Hopelessness above all) doesn't also erase the fact that you were hit that hard.
   * Achievements read this; nothing in combat does.
   */
  public rawDamageTaken = 0;
  public chargeRatio = 0;   // 0–1, drives the yellow charge bar in HealthBar
  public chargeColor = 0xffdd00; // charge-bar fill color (Rubber Bazooka reddens it while overcharging)
  public lastIncomingDamage = 0; // set in takeDamage() before shield check — used by reflect upgrades
  /**
   * True while a `damaged` event is being emitted from applySelfDamage. Listeners that
   * treat "victim took damage" as "the other side dealt damage" must check this first.
   */
  public damageWasSelfInflicted = false;
  /** Multiply all ability cooldowns by this factor (< 1 = faster, e.g. Reborn post-revival). */
  public cooldownMult = 1;
  /** If set, called with the damage amount before shields; return true to absorb the hit entirely. */
  public damageAbsorber: ((amount: number) => boolean) | null = null;
  /** Gauntlet boost: multiplies all incoming damage (stacks with incomingDamageMultiplier). Default 1. */
  public gauntletDamageTakenMult = 1;
  /** When true, skip alpha flash in takeDamage/applySelfDamage and keep alpha at 0 (Stealthy mutation). */
  public forceInvisible = false;
  /** 0–1+ probability that an incoming hit is dodged (can exceed 1.0, stacks). Each dodge subtracts 0.2. */
  public dodgeChance = 0;
  /** Timestamp after which the fighter can cast abilities again (Disarm effect). */
  public disarmedUntil = 0;
  /**
   * Creation R (Wrench in your Plans): a wrench is jammed in this fighter's gear. Every
   * ability it uses costs `castPunishDamage` HP until this `Date.now()` timestamp. Held here
   * rather than in CreationKit because the only honest chokepoint for "an ability was used"
   * is the cast stamp itself.
   */
  public castPunishUntil = 0;
  public castPunishDamage = 0;
  /** Invoked with the HP lost whenever a cast backfires, so the kit that applied it can draw the grind. */
  public onCastPunish: ((amount: number) => void) | null = null;
  /**
   * Online play: when true this fighter is a remote-player replica whose HP is
   * network-authoritative. Local damage/heals only play hit feedback and never
   * change vitals — the real numbers arrive via netSyncVitals().
   */
  public netGhost = false;
  /** Invoked with the final computed damage when a netGhost fighter is hit — used to report damage to the authoritative peer (invasion co-op husk replicas, online PvP opponents). */
  public onGhostDamage: ((amount: number, opts?: DamageOpts) => void) | null = null;
  /**
   * Online PvP: this fighter's health is driven by the network. Every hit on it is
   * computed on the *attacker's* machine (where the attacking element's own sim runs at
   * full fidelity) and relayed as a `dmg` message; the local replay of the opponent's
   * casts is for visuals and status effects only. Local damage is therefore dropped
   * unless it arrives with `netApplied`, so a hit can never be counted twice — and,
   * more importantly, an ability whose npc-side replay is incomplete still lands.
   */
  public netAuthoritativeDamage = false;
  /**
   * Online PvP: aggregate slow the opponent's sim is applying to us (≤ 1), mirrored from
   * their replica's speed multiplier. Folded into the local player's movement so slows
   * land regardless of whether the ability that applied them replays locally.
   */
  public netSpeedMult = 1;
  /** Online PvP: cooldown multiplier the opponent's sim is applying to us (≥ 1). */
  public netCooldownMult = 1;
  /**
   * Online PvP, replica side: the owner's own damage reduction, relayed from the machine
   * that owns this fighter. Their armour buffs and mastery passives live only on their
   * sim, but hits are now resolved on ours — without this, defensive abilities would stop
   * working the moment a match went online. Inert (1 / 0 / 0) for a locally-owned fighter.
   */
  public netDefenseMult = 1;
  public netFlatReduction = 0;
  public netDamageCap = 0;
  /** Online PvP: `scene.time.now` timestamp until which a relayed knockback/pull owns our velocity. */
  public netShoveUntil = 0;
  public netShoveVx = 0;
  public netShoveVy = 0;
  /** Invasion co-op: true while this fighter is downed and awaiting revive. Enemies should ignore downed targets. */
  public downed = false;
  /**
   * Invasion co-op: the ally lives in the `npc` slot, so every npc-owned damage
   * path in the game — replayed ally casts, their projectiles, puddles and auras —
   * points straight at the local player. Set on the local player for the whole
   * co-op run so those hits become no-ops. Damage that is legitimately hostile
   * (husks) or self-inflicted is applied inside `Fighter.asNonAllyDamage()`,
   * which lifts the block for the duration of the call.
   */
  public allyDamageBlocked = false;
  /** Depth counter for `asNonAllyDamage` — nested calls must not clear the bypass early. */
  private static nonAllyDepth = 0;

  /**
   * Run `fn` with the co-op friendly-fire block lifted. Wrap any damage that is
   * known not to originate from an ally (husk attacks, a fighter's own hazards)
   * so it still lands on a player carrying `allyDamageBlocked`.
   */
  static asNonAllyDamage<T>(fn: () => T): T {
    Fighter.nonAllyDepth++;
    try {
      return fn();
    } finally {
      Fighter.nonAllyDepth--;
    }
  }
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

  /** Technology Mastery — Byte-Bomb: laggy connection (rubber-banding, freezes, stalled cooldowns) until this `scene.time.now` timestamp. */
  public laggedUntil = 0;

  /** Fate Mastery — Confusing curse: WASD input is mirrored until this `scene.time.now` timestamp. */
  public invertedControlsUntil = 0;
  /** Fate Mastery — Vulnerable curse: the next hit taken is doubled, then this clears. */
  public vulnerableNextHit = false;

  /** Timestamp until which healing is suppressed (mutations). Date.now() based. */
  public healStopUntil = 0;

  // ── Silence element statuses ─────────────────────────────────────
  /** Silenced: only the click ability can be cast until this Date.now() timestamp. */
  public silencedUntil = 0;
  /** Hallucinating: players get visual horrors (kit-driven); bots/husks miss ~20% of attacks. Date.now() based. */
  public hallucinatingUntil = 0;
  /** Panicked (Silence E+ seeker cone): stabs on this fighter drain only 50 stealth. Date.now() based. */
  public panickedUntil = 0;
  /** Grabber perma-debuff: scales husk bite/attack cadence (>1 = slower). Fighters also get cooldownMult scaled. */
  public attackIntervalMult = 1;
  /** Radians. Players: aim direction; bots/husks: movement direction. Drives backstab checks + facing-eye HUD. */
  public facingAngle = 0;
  /**
   * Silence Mastery — Puppetmaster: someone else is steering this body until this
   * `scene.time.now` timestamp. Its own AI must yield entirely — no movement, no
   * attacks — and leave the velocity to whoever is driving.
   */
  public puppetControlledUntil = 0;

  // Dark magic status effects (Magic element upgrades)
  public darkVulnStacks = 0;         // +25% incoming dmg per stack (acid cloud)
  public darkLinkedUntil = 0;        // Torture Trap link expiry (Date.now() based)
  public darkLinkSource: Fighter | null = null; // healed when this fighter takes damage

  // Magic Mastery — Transmogrify: turned into a chicken, can't cast (Date.now() based)
  public chickenUntil = 0;
  // Magic Mastery — Levitate passive: immune to static ground hazards (puddles, etc.)
  public levitating = false;

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

  /**
   * Light Mastery — Unstoppable: this fighter ignores every stun, root and slow. Checked by
   * ArenaScene's speed/stun chokepoint (which clears the generic control fields each frame)
   * and by kits that hold their own stun timers.
   */
  public unstoppable = false;
  /**
   * Light Mastery — Killer Kebab: `scene.time.now` timestamp until which this fighter is
   * skewered on a light lance — dragged along with it and unable to act.
   */
  public skeweredUntil = 0;

  /**
   * Gravity F+ (Anti-Grav) and Q+ (Crushing Field): pinned under enormous gravity until this
   * `scene.time.now` timestamp. Not a slow — it kills *movement effects*: speed multipliers are
   * clamped back to 1, the Space dodge is refused, and `dashCaster` (the chokepoint every
   * dash-style ability goes through) becomes a no-op. Cleared by Unstoppable like any other
   * control effect.
   */
  public highGravityUntil = 0;

  /**
   * Growth Mastery — Syringe Shot: sick until this `scene.time.now` timestamp. Deliberately a
   * single field: every sickness upgrade (extra ticks, vulnerability, slows, weakening, spread)
   * rides on this one effect rather than adding its own status box.
   */
  public sicknessUntil = 0;
  /** Growth Mastery — Carrier: permanent leftovers of a survived sickness. Never clears. */
  public sicknessCarrier = false;

  /**
   * Sound Mastery — Bugle: rattled by a caravan until this `scene.time.now` timestamp.
   * Every note the bugler lands while this holds shakes a little more damage loose.
   */
  public vibrationUntil = 0;

  /** Metal Mastery — Natural Clot: flat amount subtracted from every incoming hit. Default 0. */
  public flatDamageReduction = 0;
  /** Metal Mastery — Steel Shield: incoming damage multiplier while the shield is up. Default 1. */
  public steelShieldMult = 1;

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

  takeDamage(amount: number, opts?: DamageOpts): void {
    // Invasion co-op: friendly fire from the ally replica never lands. Checked
    // before anything else so a blocked hit can't consume a buff or a shield.
    if (this.allyDamageBlocked && Fighter.nonAllyDepth === 0) return;
    // Online PvP: only relayed hits change our health — see `netAuthoritativeDamage`.
    if (this.netAuthoritativeDamage && !opts?.netApplied && !opts?.selfInflicted) return;
    // Magic Mastery — Levitate: immune to damage from a source that hasn't moved in 3s.
    this.damageWasSelfInflicted = false;
    if (this.levitating && opts?.source && opts.sourceX !== undefined && opts.sourceY !== undefined
        && isStationaryFor(opts.source, opts.sourceX, opts.sourceY, 3000)) return;
    if (!opts?.pierce && this.isInvincible) return;

    let isCrit = false;
    if (opts?.netApplied) {
      // Already multiplied through on the attacker's sim; don't let a stale crit
      // context leak into the next locally-computed hit.
      this.incomingCritCtx = null;
      this.rawDamageTaken += amount;
    } else {
      // Crit roll: use any incoming crit context set by the attacker
      const critCtx = this.incomingCritCtx;
      this.incomingCritCtx = null;
      const effectiveCritChance = critCtx ? Math.min(1, critCtx.chance + this.incomingCritBonus) : 0;
      isCrit = effectiveCritChance > 0 && Math.random() < effectiveCritChance;
      if (isCrit) {
        amount = Math.round(amount * (critCtx?.mult ?? 2));
      }

      // Tallied here: after the crit roll (a crit really is a bigger hit) but before every
      // mitigation multiplier on the line below, which is what "damage aimed at you" means.
      this.rawDamageTaken += amount;
      amount = Math.round(amount * this.incomingDamageMultiplier * this.gauntletDamageTakenMult * this.bribeIncomingMult * this.smokeIncomingMult * this.cardDamageTakenMult * this.droneArmorMult * this.kineticShieldMult * this.steelShieldMult * this.empoweredIncomingMult * this.potionArmorMult * this.hopelessIncomingMult * this.netDefenseMult);
      if (this.darkVulnStacks > 0) amount = Math.round(amount * (1 + 0.25 * this.darkVulnStacks));
      // Fire Mastery — Heatwave: exposed amplifies the next hit, then is consumed.
      // Fire damage-over-time is exempt on both counts: burn/molten ticks are neither
      // amplified nor allowed to eat the buff, so a tick can't rob the next real hit.
      if (!opts?.fireDot && this.exposedUntil > this.scene.time.now) {
        amount = Math.round(amount * 1.5);
        this.exposedUntil = 0;
        this.exposedConsumedAt = this.scene.time.now;
      }
      // Fate Mastery — Vulnerable curse: doubles exactly one incoming hit, then clears.
      if (this.vulnerableNextHit) {
        amount = Math.round(amount * 2);
        this.vulnerableNextHit = false;
      }
      // Metal Mastery — Natural Clot: flat reduction on the final amount. A fully-absorbed
      // hit spends nothing (no shield charge, no clotted HP) — it simply bounces off.
      const flatReduction = Math.max(this.flatDamageReduction, this.netFlatReduction);
      if (flatReduction > 0) {
        amount = Math.max(0, amount - flatReduction);
        if (amount <= 0) { this.lastIncomingDamage = 0; this.emit('damaged', 0); return; }
      }
      // Earth Mastery — Unbreakable: applied last so nothing upstream can push a hit back above the cap.
      const damageCap = this.hardDamageCap > 0 && this.netDamageCap > 0
        ? Math.min(this.hardDamageCap, this.netDamageCap)
        : Math.max(this.hardDamageCap, this.netDamageCap);
      if (damageCap > 0) amount = Math.min(amount, damageCap);
    }
    this.lastIncomingDamage = amount;
    if (isCrit) this.emit('damaged-crit', amount);

    if (this.netGhost) {
      // Hit feedback only — vitals come from the network. Report the computed
      // amount so the local owner can forward it to the authoritative peer.
      this.onGhostDamage?.(amount, opts);
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

    // Quantum weak HP: a gray bonus layer that soaks damage like shield HP.
    if (!opts?.pierce && this.weakHp > 0) {
      const absorbed = Math.min(this.weakHp, amount);
      this.weakHp -= absorbed;
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

    // Metal R+ (Blood Clottage): clotted HP is spent before normal HP and soaks
    // damage at half rate — 50 incoming removes 25 clotted and deals 25 through.
    if (!opts?.pierce && this.clottedHp > 0) {
      const clotAbsorb = Math.min(this.clottedHp, amount / 2);
      this.clottedHp = Math.max(0, this.clottedHp - clotAbsorb);
      amount = Math.max(0, amount - clotAbsorb * 2);
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
    // Clotted HP occupies part of the max-HP pool — normal HP can only refill
    // up to what isn't clotted, so total (hp + clottedHp) never exceeds maxHp.
    this.hp = Math.min(this.maxHp - this.clottedHp, this.hp + amount);
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
    this.damageWasSelfInflicted = true;
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
    if (now < this.disarmedUntil || now < this.chickenUntil) return false;
    if (now < this.silencedUntil && ability.displayKey !== 'Click') return false;
    const ultimateExtra = (ability as { isUltimate?: boolean }).isUltimate ? this.ultimateCooldownMult : 1;
    if (now - (this.cooldowns.get(abilityId) ?? 0) < ability.cooldown * this.cooldownMult * this.netCooldownMult * ultimateExtra) return false;

    this.stampCast(abilityId);
    ability.cast(ctx);
    return true;
  }

  /**
   * Everything that counts as "this fighter used an ability" funnels through here: the
   * cooldown stamp, the online broadcast hook, and the Wrenched backfire. Charge-and-release
   * abilities stamp through `triggerCooldown`/`startCooldown` rather than `castAbility`, so
   * all three routes go via this — otherwise a wrenched fighter could dodge the cost simply
   * by picking the right key.
   */
  private stampCast(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
    this.onCastStamp?.(abilityId);
    if (this.castPunishDamage > 0 && Date.now() < this.castPunishUntil) {
      const cost = this.castPunishDamage;
      // The wrench belongs to whoever threw it, so this is not self-inflicted damage — it
      // still has to land on a co-op player carrying `allyDamageBlocked`.
      Fighter.asNonAllyDamage(() => this.takeDamage(cost));
      this.onCastPunish?.(cost);
    }
  }

  /** Starts the cooldown for an ability without calling cast() — for charge-and-release abilities. */
  triggerCooldown(abilityId: string): void {
    this.stampCast(abilityId);
  }

  /** Shift all stored cooldown timestamps forward by deltaMs (used to compensate for real-time elapsed during a game pause). */
  shiftCooldowns(deltaMs: number): void {
    for (const [k, v] of this.cooldowns) this.cooldowns.set(k, v + deltaMs);
  }

  /** Force an ability's cooldown to start right now (used by kits that manage their own CD timing). */
  startCooldown(abilityId: string): void {
    this.stampCast(abilityId);
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
    const effectiveCd = ability.cooldown * (this.cooldownMult || 1) * this.netCooldownMult * ultimateCdExtra;
    return Math.min(1, elapsed / effectiveCd);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    // Weak HP decays steadily at 3/s.
    if (this.weakHp > 0) this.weakHp = Math.max(0, this.weakHp - 3 * (delta / 1000));
    this.healthBar.update(this.x, this.y, this.hp, this.shieldHp, this.chargeRatio, this.clottedHp, this.weakHp, this.chargeColor);
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
