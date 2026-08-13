import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { Element } from '../elements/Element';
import { HuskVariantDef, BASIC_HUSK, huskTextureKey } from './HuskVariants';
import { BossBrain } from './InvasionBosses';
import type { HuskStatus } from './InvasionKit';

// Minimal element — husks have no abilities, they just shamble and bite.
const HUSK_ELEMENT: Element = {
  id: 'husk',
  name: 'Husk',
  color: 0x4e7a2e,
  emoji: '🧟',
  abilities: [],
};

/**
 * World hooks a husk needs to act on the arena. Supplied by InvasionKit on the
 * simulating side only — co-op guests leave this null, since their husks are
 * position-synced replicas that never run AI.
 */
/** A telegraphed blast: a warning on the floor, then damage to whatever is still in it. */
export interface BossAoeOpts {
  x: number;
  y: number;
  radius: number;
  damage: number;
  color: number;
  /** How long the warning sits there before it goes off. */
  warnMs: number;
  /** Slow whatever the blast catches (the Dreamer's lullaby). */
  slowMult?: number;
  slowMs?: number;
  /** Warn with a sweeping ring rather than a filled disc — for the big room-wide ones. */
  ring?: boolean;
}

/** A boss projectile. Bosses do not share the plain spitter shot. */
export interface BossShotOpts {
  speed: number;
  damage: number;
  color: number;
  radius: number;
  /** Turns to follow whatever it can see (the Dreamer's orbs). */
  homing?: boolean;
  lifetimeMs?: number;
}

export interface HuskWorld {
  /** Launch a husk projectile from `from` toward a point. */
  fireShot(from: Husk, tx: number, ty: number, damage: number): void;
  /** Titan add-summon: drop `count` basic husks around (x, y). */
  summon(count: number, x: number, y: number): void;
  /** Medic pulse: heal every *other* husk within `radius` by `frac` of its max HP. */
  healNearbyHusks(source: Husk, radius: number, frac: number): void;
  /** Draw a one-shot telegraph line (rusher charge lane). */
  telegraph(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void;
  /** Pick a husk the Paradox can superimpose itself onto, or null if none is available. */
  findPossessTarget(rider: Husk): Husk | null;
  /** Apply possession buffs and bind rider ⇄ host. */
  possess(rider: Husk, victim: Husk): void;

  // ── The boss half ────────────────────────────────────────────────
  // Only InvasionKit raises bosses, so every one of these is optional and the
  // other six HuskWorld implementers can ignore them entirely.

  /** Telegraphed ground blast. */
  bossAoe?(from: Husk, o: BossAoeOpts): void;
  /** A shaped projectile fired along `angle`. */
  bossShot?(from: Husk, angle: number, o: BossShotOpts): void;
  /** Lingering hazard on the floor. */
  bossZone?(
    from: Husk, x: number, y: number, radius: number, color: number,
    ms: number, tickDamage: number, slowMult?: number,
  ): void;
  /** Call `count` of a support variant (bailiffs, wisps, echoes) in around the boss. */
  bossSpawn?(from: Husk, variantId: string, count: number): void;
  /** Move the boss instantly, with a flourish at both ends. */
  bossBlink?(from: Husk, x: number, y: number, color: number): void;
  /** Direct damage on a fighter the boss has hold of. */
  bossHit?(from: Husk, target: Fighter, amount: number, color: number): void;
  /** Slow the local player (chains, drowsiness). */
  bossSlow?(mult: number, ms: number): void;
  /** Shout a move name over the boss. */
  bossSay?(from: Husk, text: string, colorHex: string): void;
  /** Play a one-shot sound, but only if the listener is in the boss's room. */
  bossSfx?(from: Husk, name: string): void;
  /** A point inside the boss's room it could stand on. */
  bossWanderPoint?(from: Husk): { x: number; y: number };
}

const BITE_RANGE = 50;
const SPITTER_SHOT_MS = 2100;
const MEDIC_PULSE_MS = 2000;
const MEDIC_PULSE_RADIUS = 165;
const MEDIC_PULSE_FRAC = 0.08;
const TITAN_SUMMON_MS = 3000;
const TITAN_SUMMON_COUNT = 5;
const RUSHER_TRIGGER_RANGE = 430;
const RUSHER_TELEGRAPH_MS = 850;
const RUSHER_CHARGE_MS = 750;
const RUSHER_RECOVER_MS = 900;
const RUSHER_CHARGE_SPEED_MULT = 4.5;

type ChargeState = 'idle' | 'telegraph' | 'charging' | 'recover';

/**
 * A zombie. Basic husks walk straight at the nearest target and bite; variants
 * layer on ranged attacks, kiting, charges, healing and summons — all
 * dispatched from `update()` by `variant.behavior`. The three tenth-wave bosses
 * take the `'boss'` branch and hand the frame to their own `BossBrain`, which
 * steers them with the same helpers everything else here uses.
 *
 * Respects the common Fighter status fields (frozen, frost stacks, stun, bind)
 * and ticks its own burn/toxic DOTs since no NPC pipeline manages it.
 */
export class Husk extends Fighter {
  public biteDamage: number;
  private biteCooldownMs: number;
  private nextBiteAt = 0;
  /** Invoked when the husk lands a bite, with whichever target it hit. */
  public onBite: ((damage: number, target: Fighter) => void) | null = null;
  /** Invasion co-op: identifies this husk across the network (assigned by the host). */
  public netId = 0;
  /**
   * Co-op guest only: invoked when a local hit inflicts a status on this
   * replica. Replicas never tick their own DOTs, so the status has to be
   * reported to the host — the status-effect twin of `onGhostDamage`.
   */
  public onGhostStatus: ((status: HuskStatus) => void) | null = null;

  public readonly variant: HuskVariantDef;
  /** Null on co-op guests — replicas never run AI. */
  public world: HuskWorld | null = null;

  /** The Paradox: the husk it is currently superimposed on (invulnerable while non-null). */
  public possessing: Husk | null = null;
  /** Set on a husk while a boss rides it, so the kit can free the rider on death. */
  public possessedBy: Husk | null = null;

  /** Set on the nine boss variants — owns their moves and their pacing. */
  public readonly boss: BossBrain | null = null;
  /** Apocalypse: this one came up out of a corrupted room. Bosses read it for their extra move. */
  public infected = false;

  private nextAttackAt = 0;
  private chargeState: ChargeState = 'idle';
  private chargePhaseEnd = 0;
  private chargeVx = 0;
  private chargeVy = 0;

  /** Earth Mastery — Dust Screen: random-wander state for melee/charger/titan/demon husks. */
  private nextWanderChangeAt = 0;
  private wanderVx = 0;
  private wanderVy = 0;

  /** Silence: set each frame by InvasionKit while an invisible player has stalkers out. */
  public huntInvisibleTargets = false;

  /** Mansion invasion: which room this husk haunts (0 = grand hall). */
  public roomIndex = 0;
  /** Killing this pays no shards (decoys, echo splits, soul re-rises). */
  public noRewardKill = false;
  /** Elemental effect buffs (Time haste, Passion thrall, Subterfuge reveal…). */
  public effectSpeedMult = 1;
  public effectHasteUntil = 0;
  public effectDamageMult = 1;
  public effectRageUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    maxHp: number,
    speed: number,
    biteDamage: number,
    biteCooldownMs = 950,
    variant: HuskVariantDef = BASIC_HUSK,
  ) {
    super(scene, x, y, huskTextureKey(variant), HUSK_ELEMENT, maxHp, speed);
    this.biteDamage = biteDamage;
    this.biteCooldownMs = biteCooldownMs;
    this.variant = variant;
    if (variant.bossKind) {
      this.boss = new BossBrain(this, variant.bossKind, variant.tier ?? 1);
    }
    if (variant.sizeMult !== 1) {
      this.sizeMult = variant.sizeMult;
      this.applySizeMult();
    }
  }

  update(targets: Fighter[], time: number, delta: number): void {
    this.updateAi(targets, time, delta);
    if (this.active && this.hp > 0 && !this.possessing) this.keepOnScreen();
  }

  private updateAi(targets: Fighter[], time: number, delta: number): void {
    if (!this.active || this.hp <= 0) return;
    this.tickDots(time, delta);
    if (!this.active || this.hp <= 0) return; // a DOT tick may have killed it

    const body = this.body as Phaser.Physics.Arcade.Body;

    // A demon riding a husk has no body of its own to drive — it just tracks
    // its victim and stays untouchable until the victim dies.
    if (this.possessing) {
      if (!this.possessing.active || this.possessing.hp <= 0) {
        this.releasePossession(time);
      } else {
        body.reset(this.possessing.x, this.possessing.y);
        return;
      }
    }

    // Silence Mastery — Puppetmaster: a possessed husk has no will of its own. Yield
    // without touching the velocity; SilenceKit drives the body later in the frame.
    if (this.puppetControlledUntil > time) return;

    if (this.magicChainBound && time >= this.magicChainBoundEnd) this.magicChainBound = false;
    const hardCCed = this.frozenUntil > time
      || this.earthStunnedUntil > time
      || this.skeweredUntil > time
      || this.magicChainBound;
    if (hardCCed) {
      body.setVelocity(0, 0);
      // A CC'd rusher loses its wind-up rather than charging through the stun.
      if (this.chargeState !== 'idle') { this.chargeState = 'idle'; this.chargePhaseEnd = 0; }
      return;
    }

    // Dust Screen: ranged/medic keep kiting and firing (their aim just jitters —
    // see jitteredAim), everyone else wanders aimlessly instead of pathfinding.
    // Bosses are not exempt: blinding one is supposed to be worth doing.
    if (this.confusedWanderUntil > time
      && this.variant.behavior !== 'ranged' && this.variant.behavior !== 'medic') {
      this.updateConfusedWander(time);
      return;
    }

    // Chase whichever viable (alive, not downed) target is nearest.
    const viable = targets.filter((t) => t.active && t.hp > 0 && !t.downed);
    if (viable.length === 0) {
      // Nobody visible (Silence stealth): shamble around aimlessly, and with
      // stalkers on the field fire blind shots hoping to clip one.
      this.updateConfusedWander(time);
      if (this.huntInvisibleTargets && time >= this.nextAttackAt
        && (this.variant.behavior === 'ranged' || this.variant.behavior === 'boss')) {
        this.nextAttackAt = time + SPITTER_SHOT_MS * this.attackIntervalMult;
        const ang = Math.random() * Math.PI * 2;
        this.world?.fireShot(this, this.x + Math.cos(ang) * 350, this.y + Math.sin(ang) * 350, this.biteDamage);
      }
      return;
    }
    let target = viable[0];
    let bestDist = Math.hypot(target.x - this.x, target.y - this.y);
    for (let i = 1; i < viable.length; i++) {
      const d = Math.hypot(viable[i].x - this.x, viable[i].y - this.y);
      if (d < bestDist) { bestDist = d; target = viable[i]; }
    }

    // Silenced (Silence element): variant specials are sealed — only the basic
    // walk-and-bite "click attack" remains.
    if (Date.now() < this.silencedUntil) {
      this.updateMelee(target, bestDist, time);
      return;
    }

    switch (this.variant.behavior) {
      case 'ranged':  this.updateRanged(target, bestDist, time); break;
      case 'medic':   this.updateMedic(target, bestDist, time); break;
      case 'charger': this.updateCharger(target, bestDist, time); break;
      case 'titan':   this.updateTitan(target, bestDist, time); break;
      case 'boss':    this.boss?.update(target, bestDist, time); break;
      default:        this.updateMelee(target, bestDist, time); break;
    }
  }

  // ── Movement helpers ─────────────────────────────────────────────

  /**
   * Kiters backing off (and confused wanderers) must never leave the play
   * area: cancel any outward velocity at the mansion's wall band, and drag a
   * husk that something already shoved out (knockback, charges) back inside.
   */
  private keepOnScreen(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const m = 46; // just inside the mansion wall band
    if ((this.x <= m && body.velocity.x < 0) || (this.x >= W - m && body.velocity.x > 0)) body.velocity.x = 0;
    if ((this.y <= m && body.velocity.y < 0) || (this.y >= H - m && body.velocity.y > 0)) body.velocity.y = 0;
    const cx = Phaser.Math.Clamp(this.x, m, W - m);
    const cy = Phaser.Math.Clamp(this.y, m, H - m);
    if (cx !== this.x || cy !== this.y) body.reset(cx, cy);
  }

  private get moveSpeed(): number {
    let spd = this.speed * this.walkSpeedMult * this.purgeSpeedMult * this.effectSpeedMult;
    if (this.frostStacks > 0) spd *= Math.max(0.2, 1 - this.frostStacks * 0.1);
    return spd;
  }

  /** Boss brains drive their own movement — these three are their steering. */
  moveToward(target: Fighter, sign: number, speedScale = 1): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spd = this.moveSpeed * speedScale * sign;
    body.setVelocity((dx / dist) * spd, (dy / dist) * spd);
  }

  /**
   * Hold `range` from the target: back off when too close, close in when too
   * far, and strafe perpendicular in the comfortable band so kiters keep
   * drifting instead of standing still.
   */
  kite(target: Fighter, dist: number, range: number): void {
    if (dist < range * 0.8) {
      this.moveToward(target, -1);
    } else if (dist > range * 1.2) {
      this.moveToward(target, 1);
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      // Perpendicular drift; netId parity decides which way so a pack fans out.
      const sign = this.netId % 2 === 0 ? 1 : -1;
      const spd = this.moveSpeed * 0.55 * sign;
      body.setVelocity((-dy / d) * spd, (dx / d) * spd);
    }
  }

  /** Dust Screen: pick a random heading every ~800ms and walk it, ignoring the target entirely. */
  private updateConfusedWander(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (time >= this.nextWanderChangeAt) {
      this.nextWanderChangeAt = time + 800;
      const ang = Math.random() * Math.PI * 2;
      this.wanderVx = Math.cos(ang) * this.moveSpeed;
      this.wanderVy = Math.sin(ang) * this.moveSpeed;
    }
    body.setVelocity(this.wanderVx, this.wanderVy);
  }

  /**
   * Jitter an aim point: Dust Screen adds aimOffsetBonusDeg while active, and
   * Silence hallucinations make 20% of shots wildly miss.
   */
  private jitteredAim(tx: number, ty: number, time: number): { x: number; y: number } {
    let offsetDeg = time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0;
    if (Date.now() < this.hallucinatingUntil && Math.random() < 0.2) offsetDeg += 50;
    if (offsetDeg <= 0) return { x: tx, y: ty };
    const dist = Math.hypot(tx - this.x, ty - this.y) || 1;
    const baseAngle = Math.atan2(ty - this.y, tx - this.x);
    const offsetRad = (Math.random() * 2 - 1) * offsetDeg * (Math.PI / 180);
    const ang = baseAngle + offsetRad;
    return { x: this.x + Math.cos(ang) * dist, y: this.y + Math.sin(ang) * dist };
  }

  /** Plant the feet — a boss winding a move up does not drift while it telegraphs. */
  holdStill(): void {
    (this.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
  }

  tryBite(target: Fighter, dist: number, time: number, range = BITE_RANGE, damageMult = 1): void {
    if (dist > range || time < this.nextBiteAt) return;
    this.nextBiteAt = time + this.biteCooldownMs * this.attackIntervalMult;
    this.scene.tweens.add({
      targets: this,
      scaleX: this.sizeMult * 1.3,
      scaleY: this.sizeMult * 1.3,
      duration: 90,
      yoyo: true,
    });
    // Hallucinating husks whiff 20% of their bites (the lunge still plays).
    if (Date.now() < this.hallucinatingUntil && Math.random() < 0.2) return;
    this.onBite?.(Math.round(this.biteDamage * damageMult * this.effectDamageMult), target);
  }

  // ── Per-variant behaviour ────────────────────────────────────────

  private updateMelee(target: Fighter, dist: number, time: number): void {
    this.moveToward(target, 1);
    this.tryBite(target, dist, time);
  }

  private updateRanged(target: Fighter, dist: number, time: number): void {
    const range = this.variant.preferredRange ?? 270;
    this.kite(target, dist, range);
    if (time >= this.nextAttackAt) {
      this.nextAttackAt = time + SPITTER_SHOT_MS * this.attackIntervalMult;
      const aim = this.jitteredAim(target.x, target.y, time);
      this.world?.fireShot(this, aim.x, aim.y, this.biteDamage);
    }
    // Still bites if something walks right into it.
    this.tryBite(target, dist, time);
  }

  private updateMedic(target: Fighter, dist: number, time: number): void {
    this.kite(target, dist, this.variant.preferredRange ?? 300);
    if (time >= this.nextAttackAt) {
      this.nextAttackAt = time + MEDIC_PULSE_MS * this.attackIntervalMult;
      this.world?.healNearbyHusks(this, MEDIC_PULSE_RADIUS, MEDIC_PULSE_FRAC);
    }
  }

  private updateCharger(target: Fighter, dist: number, time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    switch (this.chargeState) {
      case 'idle': {
        this.moveToward(target, 1, 0.7);
        if (dist <= RUSHER_TRIGGER_RANGE) {
          this.chargeState = 'telegraph';
          this.chargePhaseEnd = time + RUSHER_TELEGRAPH_MS;
          // Lock the lane now — the charge commits to it even if the target moves.
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const d = Math.hypot(dx, dy) || 1;
          const spd = this.speed * RUSHER_CHARGE_SPEED_MULT;
          this.chargeVx = (dx / d) * spd;
          this.chargeVy = (dy / d) * spd;
          const reach = spd * (RUSHER_CHARGE_MS / 1000);
          this.world?.telegraph(
            this.x, this.y,
            this.x + (dx / d) * reach, this.y + (dy / d) * reach,
            this.variant.color, RUSHER_TELEGRAPH_MS,
          );
        }
        break;
      }
      case 'telegraph': {
        body.setVelocity(0, 0);
        if (time >= this.chargePhaseEnd) {
          this.chargeState = 'charging';
          this.chargePhaseEnd = time + RUSHER_CHARGE_MS;
        }
        break;
      }
      case 'charging': {
        body.setVelocity(this.chargeVx, this.chargeVy);
        // Charge contact hits harder and ignores the normal bite cadence.
        if (dist <= BITE_RANGE + 12) {
          this.nextBiteAt = 0;
          this.tryBite(target, dist, time, BITE_RANGE + 12, 1.75);
          this.chargeState = 'recover';
          this.chargePhaseEnd = time + RUSHER_RECOVER_MS;
        } else if (time >= this.chargePhaseEnd) {
          this.chargeState = 'recover';
          this.chargePhaseEnd = time + RUSHER_RECOVER_MS;
        }
        break;
      }
      case 'recover': {
        body.setVelocity(0, 0);
        if (time >= this.chargePhaseEnd) this.chargeState = 'idle';
        break;
      }
    }
  }

  private updateTitan(target: Fighter, dist: number, time: number): void {
    this.moveToward(target, 1);
    this.tryBite(target, dist, time, BITE_RANGE + 20);
    if (time >= this.nextAttackAt) {
      this.nextAttackAt = time + TITAN_SUMMON_MS * this.attackIntervalMult;
      this.world?.summon(TITAN_SUMMON_COUNT, this.x, this.y);
    }
  }

  /** The host died (or was cleaned up) — the rider is a separate, damageable thing again. */
  releasePossession(time: number): void {
    const victim = this.possessing;
    this.possessing = null;
    if (victim) {
      victim.possessedBy = null;
      // Surface where the host fell so the rider doesn't reappear off-screen.
      const body = this.body as Phaser.Physics.Arcade.Body | null;
      body?.reset(victim.x, victim.y);
    }
    this.isInvincible = false;
    this.setVisible(true);
    this.setHealthBarVisible(true);
    this.boss?.onPossessionEnded(time);
  }

  private tickDots(time: number, delta: number): void {
    if (this.burningUntil > time) {
      this.burnTickAccum += delta;
      while (this.burnTickAccum >= 1000 && this.hp > 0) {
        this.burnTickAccum -= 1000;
        this.takeDamage(Math.round(4 * this.burnDpsMult), { fireDot: true });
      }
    } else {
      this.burnTickAccum = 0;
    }
    if (this.toxicUntil > time && this.toxicDps > 0) {
      this.toxicTickAccum += delta;
      while (this.toxicTickAccum >= 1000 && this.hp > 0) {
        this.toxicTickAccum -= 1000;
        this.takeDamage(this.toxicDps);
      }
    } else {
      this.toxicTickAccum = 0;
    }
  }
}
