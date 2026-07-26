import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { Projectile } from '../combat/Projectile';
import { slimeElement } from '../elements/slime';
import { HP_SCALE } from '../data/Balance';

type AiState = 'chase' | 'attack';

export interface DifficultyConfig {
  level: number;
  label: string;
  hp: number;
  speed: number;
  aimOffsetDeg: number; // max random angular offset on aimed shots (degrees)
  dodgeRange: number;   // 0 = no dodge; else detection radius in px
  castSkipChance: number; // 0–1: chance to skip special abilities each decision
}

export const DIFFICULTY_PRESETS: DifficultyConfig[] = [
  { level: 1, label: 'Easy',      hp:  80 * HP_SCALE, speed: 100, aimOffsetDeg: 50, dodgeRange:   0, castSkipChance: 0.70 },
  { level: 2, label: 'Normal',    hp: 140 * HP_SCALE, speed: 130, aimOffsetDeg: 30, dodgeRange:   0, castSkipChance: 0.45 },
  { level: 3, label: 'Hard',      hp: 200 * HP_SCALE, speed: 148, aimOffsetDeg: 14, dodgeRange:   0, castSkipChance: 0.20 },
  { level: 4, label: 'Expert',    hp: 280 * HP_SCALE, speed: 162, aimOffsetDeg:  5, dodgeRange: 100, castSkipChance: 0.05 },
  { level: 5, label: 'Nightmare', hp: 360 * HP_SCALE, speed: 175, aimOffsetDeg:  1, dodgeRange: 160, castSkipChance: 0    },
];

export interface NpcAiState {
  isLocked: boolean;
  hasActiveGeyser: boolean;
  flameBodyActive: boolean;
  projectiles: Phaser.Physics.Arcade.Group;
  plantCount: number;
  thornDragActive: boolean;
  enemyNearPlant: boolean;
  windTrapActive: boolean;
  chargedBeamReady: boolean;
  earthShieldHp: number;
  npcEarthRocksActive?: boolean;
  oilDroneCount?: number;
  shadowPlayerSnared?: boolean;
  playerFrostStacks?: number;
  iceBlockActive?: boolean;
  npcGrowthDna?: number;
  npcGrowthHasNestOrClone?: boolean;
  crystalNodeCount?: number;
  npcSoulCorpseCount?: number;
  npcSoulAmalgamCount?: number;
  npcSoulGraveCount?: number;
  npcHuntBeastForm?: boolean;
  npcHuntTrailActive?: boolean;
  /** Blast is charge-gated inside HuntKit; its ability cooldown says nothing about that. */
  npcHuntBlastCharges?: number;
  playerBleeding?: boolean;
  npcTimeRemainActive?: boolean;
  npcTimeHaltActive?: boolean;
  npcTimeBountyAuraActive?: boolean;
  npcTimeBounty?: number;
  npcTimeTimelessReady?: boolean;
  // Fate (alt-life)
  fateNpcHandTypes?: string[];
  // Metal
  npcMetalHasFlail?: boolean;
  npcMetalFlailSwinging?: boolean;
  npcMetalBlood?: number;
  // Gunpowder
  npcGunpowderArsenalSize?: number;
  // Rubber
  npcRubberBounceFormActive?: boolean;
  npcRubberageActive?: boolean;
  npcRubberBandActive?: boolean;
  // Magic
  magicAnchorPlaced?: boolean;
  magicMeditating?: boolean;
  // Silence (remaster)
  /** The NPC's target (usually the player) is invisible — wander, don't fight. */
  targetInvisible?: boolean;
  /** Invisible silence player has stalkers out — fire blindly to hunt them. */
  silenceStalkersPresent?: boolean;
  npcSilenceStealth?: number;
  npcSilenceStalkers?: number;
  npcSilenceMatureStalker?: { x: number; y: number } | null;
  npcSilenceInvisible?: boolean;
  // Echo — no persistent ai state needed
  echoAttachActive?: boolean;
  // Quantum
  subMoney?: number;
  subBullets?: number;
  subLackeys?: number;
}

export class NpcOpponent extends Fighter {
  private aiState: AiState = 'chase';
  private readonly attackRange = 280;
  private strafeDir = 1;
  private nextStrafeDirChange = 0;
  private lastFlameBodyToggle = -10000;
  private readonly difficulty: DifficultyConfig;
  /** When true, the NPC stays put (Boss mutation): casts abilities but never moves. */
  public stationary = false;

  // ── Charge state ──────────────────────────────────────────────────
  private chargeUntil = 0;
  private chargingAbility = '';
  private lastChargeDecision = -1; // -1 = uninitialised; set to `time` on first AI tick

  // ── Blind wander (target invisible via Silence stealth) ───────────
  private blindWanderVx = 0;
  private blindWanderVy = 0;
  private blindNextWanderAt = 0;
  private blindNextShotAt = 0;

  /** Silence hallucinations: 20% of shots wildly miss while afflicted. */
  private hallucinationMissDeg(): number {
    return Date.now() < this.hallucinatingUntil && Math.random() < 0.2 ? 50 : 0;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    element: Element,
    textureKey = 'elem-water',
    difficulty: DifficultyConfig = DIFFICULTY_PRESETS[2], // default: Hard
  ) {
    super(scene, x, y, textureKey, element, difficulty.hp, difficulty.speed);
    this.difficulty = difficulty;
  }

  doAI(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    aiState: NpcAiState,
  ): string | null {
    if (aiState.isLocked) return null;

    // Dummy element: stand completely still, do nothing
    if (this.element.id === 'dummy') {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return null;
    }

    // Initialise charge cooldown on the very first tick so mastered NPCs don't
    // immediately charge before moving.
    if (this.lastChargeDecision < 0) this.lastChargeDecision = time;

    // ── Invisible target (Silence): wander naturally instead of fighting ──
    if (aiState.targetInvisible) {
      return this.doBlindBehavior(buildContext, time, aiState.silenceStalkersPresent ?? false);
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const hpRatio = this.hp / this.maxHp;

    // State transitions
    if (dist <= this.attackRange) {
      this.aiState = 'attack';
    } else {
      this.aiState = 'chase';
    }

    // Periodically flip strafe direction
    if (time > this.nextStrafeDirChange) {
      this.strafeDir *= -1;
      this.nextStrafeDirChange = time + Phaser.Math.Between(1200, 2800);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    // ── Active charge: hold position and fire when ready ─────────
    if (this.chargeUntil > 0) {
      body.setVelocity(0, 0);
      if (time >= this.chargeUntil) {
        const abilityId = this.chargingAbility;
        this.chargeUntil = 0;
        this.chargingAbility = '';
        const aimOffsetRad2 = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0) + this.hallucinationMissDeg()) * (Math.PI / 180);
        const aimAngle2 = angleToTarget + aimOffsetRad2;
        const aimX2 = this.x + Math.cos(aimAngle2) * dist;
        const aimY2 = this.y + Math.sin(aimAngle2) * dist;
        if (this.castAbility(abilityId, buildContext(aimX2, aimY2))) {
          return abilityId + '-charged';
        }
      }
      return null;
    }

    // ── Compute aimed target position (with difficulty offset) ────
    const aimOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0) + this.hallucinationMissDeg()) * (Math.PI / 180);
    const aimAngle = angleToTarget + aimOffsetRad;
    const aimX = this.x + Math.cos(aimAngle) * dist;
    const aimY = this.y + Math.sin(aimAngle) * dist;

    // ── Dodge incoming projectiles ────────────────────────────────
    let dodging = false;
    if (this.difficulty.dodgeRange > 0) {
      const projs = aiState.projectiles.getChildren();
      for (const go of projs) {
        if (!(go instanceof Projectile)) continue;
        const p = go as Projectile;
        if (!p.active || !p.isFromPlayer) continue;

        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dToBullet = Math.sqrt(dx * dx + dy * dy);
        if (dToBullet > this.difficulty.dodgeRange) continue;

        // Check if projectile is heading toward NPC
        const pb = p.body as Phaser.Physics.Arcade.Body;
        const vx = pb.velocity.x;
        const vy = pb.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < 1) continue;

        const toNpcX = this.x - p.x;
        const toNpcY = this.y - p.y;
        const toNpcLen = Math.sqrt(toNpcX * toNpcX + toNpcY * toNpcY) || 1;
        const approachDot = (vx / speed) * (toNpcX / toNpcLen) + (vy / speed) * (toNpcY / toNpcLen);
        if (approachDot < 0.4) continue; // not heading toward NPC

        // Dodge perpendicular to bullet velocity
        const dodgeSpeed = this.speed * (this.difficulty.level >= 5 ? 1.3 : 1.05);
        body.setVelocity(-vy / speed * dodgeSpeed, vx / speed * dodgeSpeed);
        dodging = true;
        break;
      }
    }

    // ── Movement (skipped if dodge triggered) ────────────────────
    if (!dodging) {
      switch (this.aiState) {
        case 'chase': {
          body.setVelocity(
            Math.cos(angleToTarget) * this.speed,
            Math.sin(angleToTarget) * this.speed,
          );
          break;
        }
        case 'attack': {
          // Earth rushes into melee; others strafe
          if (this.element.id === 'earth') {
            body.setVelocity(
              Math.cos(angleToTarget) * this.speed,
              Math.sin(angleToTarget) * this.speed,
            );
          } else {
            const strafeAngle = angleToTarget + this.strafeDir * (Math.PI / 2);
            body.setVelocity(
              Math.cos(strafeAngle) * this.speed * 0.6,
              Math.sin(strafeAngle) * this.speed * 0.6,
            );
          }
          break;
        }
      }
    }

    // ── Stationary override (Boss mutation) ──────────────────────
    if (this.stationary) body.setVelocity(0, 0);

    // ── Ability decisions ─────────────────────────────────────────
    if (this.element.id === 'fire') {
      return this.doFireAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'water') {
      return this.doWaterAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'life') {
      return this.doLifeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'air') {
      return this.doAirAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'earth') {
      return this.doEarthAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'oil') {
      return this.doOilAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'shadow') {
      return this.doShadowAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'ice') {
      return this.doIceAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'growth') {
      return this.doGrowthAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'crystal') {
      return this.doCrystalAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'soul') {
      return this.doSoulAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'hunt') {
      return this.doHuntAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'sand') {
      return this.doTimeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'gravity') {
      return this.doGravityAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'creation') {
      return this.doCreationAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'electricity') {
      return this.doElectricityAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'slime') {
      return this.doSlimeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'fate') {
      return this.doFateAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'sound') {
      return this.doSoundAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'light') {
      return this.doLightAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'magnet') {
      return this.doMagnetAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'metal') {
      return this.doMetalAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'plasma') {
      return this.doPlasmaAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'gunpowder') {
      return this.doGunpowderAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'rubber') {
      return this.doRubberAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'magic') {
      return this.doMagicAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'technology') {
      return this.doTechnologyAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'silence') {
      return this.doSilenceAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'echo') {
      return this.doEchoAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'quantum') {
      return this.doSubterfugeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    return null;
  }

  private doSlimeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Purge: a slow debuff ball, thrown occasionally at mid-range
    if (!skipSpecials && dist < 420 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('purge', buildContext(aimX, aimY))) {
        const ctx = buildContext(aimX, aimY);
        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 220;
        const proj = new Projectile(ctx.scene, this.x + (dx / len) * 32, this.y + (dy / len) * 32, 'proj-purge', 15, false);
        (proj as unknown as { purgeDurationMs: number }).purgeDurationMs = 3000;
        ctx.projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);
        return 'purge';
      }
    }

    // Default: a short barrage of acid whip lashes toward the player
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('poison-whip', buildContext(aimX, aimY))) {
        const ctx = buildContext(aimX, aimY);
        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const baseAngle = Math.atan2(dy, dx);
        const speed = 550;
        const count = dist < 200 ? 8 : 5;
        for (let i = 0; i < count; i++) {
          ctx.scene.time.delayedCall(i * 25, () => {
            if (!this.active || this.hp <= 0) return;
            const jitter = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-6, 6));
            const ang = baseAngle + jitter;
            const proj = new Projectile(ctx.scene, this.x + Math.cos(ang) * 32, this.y + Math.sin(ang) * 32, 'proj-acid-whip', 1, false);
            ctx.projectiles.add(proj);
            proj.launch(Math.cos(ang) * speed, Math.sin(ang) * speed);
            proj.setRotation(ang);
          });
        }
        return 'poison-whip';
      }
    }
    return null;
  }

  private doFateAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const hand = aiState.fateNpcHandTypes ?? [];
    const attackTypes = ['laser', 'burst', 'barrier', 'explosion', 'infect', 'lightning'];

    if (!skip) {
      // 1. Enchant a strong attack card occasionally
      if (hand.some((t) => ['explosion', 'lightning', 'barrier'].includes(t)) && Math.random() < 0.15) {
        if (this.castAbility('fate-enchant', buildContext(this.x, this.y))) return 'fate-enchant';
      }

      // 2. All In when desperate or opportunistic and in range
      if ((hpRatio < 0.30 || Math.random() < 0.08) && dist < 300) {
        if (this.castAbility('fate-all-in', buildContext(aimX, aimY))) return 'fate-all-in';
      }

      // 3. Reroll a hand with no attack cards
      if (hand.length > 0 && !hand.some((t) => attackTypes.includes(t))) {
        if (this.castAbility('fate-reroll', buildContext(this.x, this.y))) return 'fate-reroll';
      }
    }

    // 4. Throw a card as the primary attack
    if (hand.length > 0 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('fate-card-throw', buildContext(aimX, aimY))) return 'fate-card-throw';
    }

    return null;
  }

  // suppress unused import warning — slimeElement is referenced via side-effect import for tree-shaking protection
  private _slimeRef = slimeElement.id;

  private doElectricityAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Electro Dash — gap close when far (no-op cast, just for cooldown pacing)
      if (dist > 220) {
        if (this.castAbility('electro-dash', buildContext(aimX, aimY))) return 'electro-dash';
      }
    }

    // Default: Electro Ball
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('electro-ball', buildContext(aimX, aimY))) return 'electro-ball';
    }
    return null;
  }

  private doSoundAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void aiState;
    const AIR_HIT_CHANCES = [0.20, 0.35, 0.50, 0.65, 0.80];
    const hitChance = AIR_HIT_CHANCES[this.difficulty.level - 1];
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const soundAimCtx = (chance: number) => {
      if (Math.random() < chance) return buildContext(target.x, target.y);
      const side = Math.random() < 0.5 ? 1 : -1;
      const missAng = angleToTarget + side * (Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3);
      return buildContext(this.x + Math.cos(missAng) * 600, this.y + Math.sin(missAng) * 600);
    };

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Screech Barrier — place on player when close
      if (dist < 260) {
        if (this.castAbility('screech-barrier', buildContext(target.x, target.y))) return 'screech-barrier';
      }
      // Sound Grapple — gap close when far
      if (dist > 380) {
        if (this.castAbility('sound-grapple', buildContext(target.x, target.y))) return 'sound-grapple';
      }
    }

    // Default: rhythm shot hitscan
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('rhythm-shot', soundAimCtx(hitChance))) return 'rhythm-shot';
    }
    return null;
  }

  private doFireAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Flame Nuke — close range, decent HP
      if (hpRatio > 0.50 && dist < 260) {
        if (this.castAbility('flame-nuke', buildContext(this.x, this.y))) return 'flame-nuke';
      }

      // 2. Pressure Bomb — mid range
      if (dist >= 140 && dist <= 360) {
        if (this.castAbility('pressure-bomb', buildContext(aimX, aimY))) return 'pressure-bomb';
      }

      // 3. Flame Dash — gap-close when far
      if (dist > 220) {
        if (this.castAbility('flame-dash', buildContext(aimX, aimY))) return 'flame-dash';
      }

      // 4. Flame Body toggle — Nightmare only
      if (this.difficulty.level >= 5) {
        const wantsFlameBody = hpRatio > 0.30;
        if (wantsFlameBody !== aiState.flameBodyActive && time - this.lastFlameBodyToggle > 2500) {
          if (this.castAbility('flame-body', buildContext(this.x, this.y))) {
            this.lastFlameBodyToggle = time;
            return 'flame-body';
          }
        }
      }
    }

    // Default: Fireball
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('fireball', buildContext(aimX, aimY))) return 'fireball';
    }

    return null;
  }

  private doWaterAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Pain Rain — medium range, decent HP
      if (dist < 380 && hpRatio > 0.25) {
        if (this.castAbility('pain-rain', buildContext(aimX, aimY))) return 'pain-rain';
      }

      // 2. Pressure Dagger — medium range (fires uncharged, level 0)
      if (dist < 320) {
        if (this.castAbility('pressure-dagger', buildContext(aimX, aimY))) return 'pressure-dagger';
      }

      // 3. Splash — close range
      if (dist < 280) {
        if (this.castAbility('splash', buildContext(aimX, aimY))) return 'splash';
      }

      // 4. Geyser — self buff when none active
      if (!aiState.hasActiveGeyser) {
        if (this.castAbility('geyser', buildContext(this.x, this.y))) return 'geyser';
      }
    }

    // Default: Water Cut
    if (this.castAbility('water-cut', buildContext(aimX, aimY))) return 'water-cut';

    return null;
  }

  private doLifeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // Don't use abilities while dragging — focus on the drag
    if (aiState.thornDragActive) return null;

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Plant — maintain 2 defensive plants near self, 1 offensive near enemy
      if (aiState.plantCount < 2) {
        const px = this.x + Phaser.Math.Between(-60, 60);
        const py = this.y + Phaser.Math.Between(-60, 60);
        if (this.castAbility('plant', buildContext(px, py))) return 'plant';
      } else if (aiState.plantCount < 3 && dist < 300) {
        const px = target.x + Phaser.Math.Between(-40, 40);
        const py = target.y + Phaser.Math.Between(-40, 40);
        if (this.castAbility('plant', buildContext(px, py))) return 'plant';
      }

      // 2. Thorns — enemy is near a plant
      if (aiState.enemyNearPlant && aiState.plantCount > 0) {
        if (this.castAbility('thorns', buildContext(this.x, this.y))) return 'thorns';
      }

      // 3. Grow — heal when low HP and has plants
      if (hpRatio < 0.65 && aiState.plantCount > 0) {
        if (this.castAbility('grow', buildContext(this.x, this.y))) return 'grow';
      }

      // 4. Thorn Drag — close range engagement
      if (dist < 300 && hpRatio > 0.30) {
        if (this.castAbility('thorn-drag', buildContext(target.x, target.y))) return 'thorn-drag';
      }
    }

    // 5. Petal Shotgun default (uses offset aim)
    if (this.castAbility('petal-shotgun', buildContext(aimX, aimY))) return 'petal-shotgun';

    return null;
  }

  private doAirAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // Per-difficulty hit probability for hitscan abilities (ignores aimOffsetDeg)
    const AIR_HIT_CHANCES = [0.20, 0.35, 0.50, 0.65, 0.80];
    const airHitChance = AIR_HIT_CHANCES[this.difficulty.level - 1];
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    const airAimCtx = (hitChance: number) => {
      if (Math.random() < hitChance) return buildContext(target.x, target.y);
      // Guaranteed miss: aim 60–120° perpendicular to the real angle
      const side = Math.random() < 0.5 ? 1 : -1;
      const missAng = angleToTarget + side * (Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3);
      return buildContext(this.x + Math.cos(missAng) * 600, this.y + Math.sin(missAng) * 600);
    };

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Charged Beam — 50% hit chance regardless of difficulty
      if (aiState.chargedBeamReady) {
        if (this.castAbility('charged-beam', airAimCtx(0.50))) return 'charged-beam';
      }

      // 2. Wind Trap — place on enemy when not active and in mid range
      if (!aiState.windTrapActive && dist < 400) {
        if (this.castAbility('wind-trap', buildContext(target.x, target.y))) return 'wind-trap';
      }

      // 3. Quick Shot — charge up before snipe when in attack range
      if (dist < 350) {
        if (this.castAbility('quick-shot', buildContext(this.x, this.y))) return 'quick-shot';
      }

      // 4. Grapple — gap close when far
      if (dist > 300) {
        if (this.castAbility('grapple', buildContext(target.x, target.y))) return 'grapple';
      }
    }

    // 5. Air Snipe — difficulty-scaled hit probability
    if (this.castAbility('air-snipe', airAimCtx(airHitChance))) return 'air-snipe';

    return null;
  }

  private doEarthAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    _aimX: number,
    _aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // NPC Earth AI delegates heavy logic to ArenaScene; just signal which ability to use.
    // ArenaScene reads the returned id and executes the actual effect in updateEarthKit().
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const hasShield = aiState.earthShieldHp > 0;

    if (!skipSpecials) {
      // 1. Golem Ritual — when shield is up and HP is low
      if (hasShield && hpRatio < 0.6) {
        if (this.castAbility('golem-ritual', buildContext(target.x, target.y))) return 'golem-ritual';
      }
      // 2. Quake — medium range
      if (dist < 250) {
        if (this.castAbility('quake', buildContext(target.x, target.y))) return 'quake';
      }
      // 3. Rock Dance — if no rocks active
      if (!aiState.npcEarthRocksActive) {
        if (this.castAbility('rock-dance', buildContext(target.x, target.y))) return 'rock-dance';
      }
      // 4. Repair — when shield broken or low
      if (!hasShield || aiState.earthShieldHp < 25) {
        if (this.castAbility('repair', buildContext(target.x, target.y))) return 'repair';
      }
    }

    // 5. Bash — close melee
    if (dist < 160) {
      if (this.castAbility('bash', buildContext(target.x, target.y))) return 'bash';
    }

    return null;
  }

  private doLightAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // Light Lance (car-mode) is always active for an NPC playing Light — see LightKit.update().
    // NPC Light AI just decides when to cast the other 4 abilities; LightKit reacts to npcCastId.
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Speed 'O' Light — ultimate escape/burst when hurt
      if (hpRatio < 0.5) {
        if (this.castAbility('speed-o-light', buildContext(aimX, aimY))) return 'speed-o-light';
      }
      // 2. Light Trick — close-range burst
      if (dist < 90) {
        if (this.castAbility('light-trick', buildContext(aimX, aimY))) return 'light-trick';
      }
      // 3. Prism Ramp — lay down hazards opportunistically
      if (this.castAbility('prism-ramp', buildContext(aimX, aimY))) return 'prism-ramp';
      // 4. Blink — reposition toward the target when not already close
      if (dist > 150) {
        if (this.castAbility('blink', buildContext(aimX, aimY))) return 'blink';
      }
    }

    return null;
  }

  private doOilAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const droneCount = aiState.oilDroneCount ?? 0;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Tight aim for drone-command (10% of normal offset)
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.1 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Summon drones (up to 4)
      if (droneCount < 4) {
        if (this.castAbility('barrel-roll', buildContext(this.x, this.y))) return 'barrel-roll';
      }

      // 2. Command drones at player — sharp aim
      if (droneCount > 0 && dist < 400) {
        if (this.castAbility('drone-command', buildContext(sharpX, sharpY))) return 'drone-command';
      }

      // 3. Launch drone bomb when close
      if (droneCount > 0 && dist < 250) {
        if (this.castAbility('drone-destroy', buildContext(target.x, target.y))) return 'drone-destroy';
      }
    }

    // Default: command drones — sharp aim
    if (droneCount > 0 && dist < 400) {
      if (this.castAbility('drone-command', buildContext(sharpX, sharpY))) return 'drone-command';
    }

    return null;
  }

  private doShadowAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Tight aim for dark-drain (10% of normal offset)
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.1 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Tentacle Wall — grow a spiked wall toward the player from mid range
      if (dist > 90 && dist < 340) {
        if (this.castAbility('tentacle-wall', buildContext(target.x, target.y))) return 'tentacle-wall';
      }

      // 2. Tentacle — extend toward player when in attack range
      if (dist < 280) {
        if (this.castAbility('tentacle', buildContext(target.x, target.y))) return 'tentacle';
      }

      // 3. Snap Trap — place at own feet occasionally
      if (dist < 200) {
        if (this.castAbility('snap-trap', buildContext(this.x, this.y))) return 'snap-trap';
      }

      // 4. Dark bomb — sharp aim
      if (dist < 400) {
        if (this.castAbility('dark-drain', buildContext(sharpX, sharpY))) return 'dark-drain';
      }
    }

    // Default: dark bomb — sharp aim
    if (dist < 500) {
      if (this.castAbility('dark-drain', buildContext(sharpX, sharpY))) return 'dark-drain';
    }

    return null;
  }

  private doIceAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Sharp aim for ice spike (15% of normal offset)
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.15 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    const playerFrostStacks = aiState.playerFrostStacks ?? 0;

    if (!skipSpecials) {
      // 1. Frozen Solid — highest priority, aim at player
      if (dist < 500) {
        if (this.castAbility('frozen-solid', buildContext(target.x, target.y))) return 'frozen-solid';
      }

      // 2. Frost Blast — if player has >= 2 frost stacks
      if (playerFrostStacks >= 2) {
        if (this.castAbility('frost-blast', buildContext(target.x, target.y))) return 'frost-blast';
      }

      // 3. Block Up — toggle on when low HP
      if (hpRatio < 0.55 && !aiState.iceBlockActive) {
        if (this.castAbility('block-up', buildContext(this.x, this.y))) return 'block-up';
      } else if (hpRatio >= 0.70 && aiState.iceBlockActive) {
        if (this.castAbility('block-up', buildContext(this.x, this.y))) return 'block-up';
      }

      // 4. Skate — escape when player is close
      if (dist < 200) {
        if (this.castAbility('skate', buildContext(this.x, this.y))) return 'skate';
      }
    }

    // Default: Ice Spike — sharp aim
    if (this.castAbility('ice-spike', buildContext(sharpX, sharpY))) return 'ice-spike';

    return null;
  }

  private doGrowthAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Sharp aim (15% offset) for click attacks
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.15 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Auxiliary Growth — once enough DNA is banked and no clone/nest yet.
      //    Plant the nest a short way off to the side, like a cursor drop.
      if ((aiState.npcGrowthDna ?? 0) >= 8 && !aiState.npcGrowthHasNestOrClone) {
        const nx = this.x + (Math.random() - 0.5) * 140;
        const ny = this.y + (Math.random() - 0.5) * 140;
        if (this.castAbility('auxiliary-growth', buildContext(nx, ny))) return 'auxiliary-growth';
      }

      // 2. Spore Spray — defensive wall between us and the target when hurt
      if (hpRatio < 0.6 && dist < 400) {
        if (this.castAbility('spore-spray', buildContext(sharpX, sharpY))) return 'spore-spray';
      }

      // 3. Virus — keep the infection ticking whenever the target is reachable
      if (dist < 520) {
        if (this.castAbility('growth-virus', buildContext(sharpX, sharpY))) return 'growth-virus';
      }
    }

    // Default: Bacterium
    if (this.castAbility('growth-click', buildContext(sharpX, sharpY))) return 'growth-click';

    return null;
  }

  private doSoulAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const corpses = aiState.npcSoulCorpseCount ?? 0;
    const amalgams = aiState.npcSoulAmalgamCount ?? 0;
    const graves = aiState.npcSoulGraveCount ?? 0;

    // Sharp aim (10% offset) for lantern placement
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.10 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Place a grave early if none are out yet.
      if (graves === 0) {
        const gx = this.x + (Math.random() - 0.5) * 140;
        const gy = this.y + (Math.random() - 0.5) * 140;
        if (this.castAbility('soul-grave', buildContext(gx, gy))) return 'soul-grave';
      }

      // 2. Arise whenever a corpse is queued and the cooldown is up.
      if (corpses > 0) {
        if (this.castAbility('soul-arise', buildContext(this.x, this.y))) return 'soul-arise';
      }

      // 3. Torment as a burst option when amalgams exist and the fight is going poorly.
      if (amalgams > 0 && hpRatio < 0.5) {
        if (this.castAbility('soul-hells-torment', buildContext(this.x, this.y))) return 'soul-hells-torment';
      }

      // 4. Whistle amalgams back to heal them up when they're not already tormented.
      if (amalgams > 0 && hpRatio < 0.7 && Math.random() < 0.3) {
        if (this.castAbility('soul-death-whistle', buildContext(this.x, this.y))) return 'soul-death-whistle';
      }
    }

    // Default: Lantern Light toward the target when close enough to matter.
    if (dist < 260 && this.castAbility('soul-lantern-light', buildContext(sharpX, sharpY))) return 'soul-lantern-light';

    return null;
  }

  private doCrystalAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Sharp aim (10% offset) for laser
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.10 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Trick of the Light — when low HP
      if (hpRatio < 0.55) {
        if (this.castAbility('crystal-trick', buildContext(this.x, this.y))) return 'crystal-trick';
      }

      // 2. Atune — when in range, stop/redirect shards in flight
      if (dist < 380) {
        if (this.castAbility('crystal-atune', buildContext(target.x, target.y))) return 'crystal-atune';
      }

      // 3. Place Crystal — build up to 3 nodes around NPC position
      if ((aiState.crystalNodeCount ?? 0) < 3) {
        const ox = (Math.random() - 0.5) * 130;
        const oy = (Math.random() - 0.5) * 130;
        if (this.castAbility('crystal-place', buildContext(this.x + ox, this.y + oy))) return 'crystal-place';
      }

      // 4. Portal — place occasionally
      if (this.castAbility('crystal-portal', buildContext(
        this.x + (Math.random() - 0.5) * 200,
        this.y + (Math.random() - 0.5) * 200,
      ))) return 'crystal-portal';
    }

    // Default: Laser Beam — sharp aim
    if (this.castAbility('crystal-laser', buildContext(sharpX, sharpY))) return 'crystal-laser';

    return null;
  }

  private doTimeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Remain active: skip abilities (absorbing damage phase)
    if (aiState.npcTimeRemainActive) return null;

    if (!skipSpecials) {
      // Always Noon — when charged
      if (aiState.npcTimeTimelessReady) {
        if (this.castAbility('time-timeless', buildContext(this.x, this.y))) return 'time-timeless';
      }

      // Remain — activate when HP is low
      if (hpRatio < 0.40) {
        if (this.castAbility('time-remain', buildContext(this.x, this.y))) return 'time-remain';
      }

      // Bounty — when bounty >= 2 and no aura active
      const npcBounty = aiState.npcTimeBounty ?? 0;
      if (npcBounty >= 2 && !aiState.npcTimeBountyAuraActive) {
        if (this.castAbility('time-halt', buildContext(this.x, this.y))) return 'time-halt';
      }

      // Lasso — when at medium range
      if (dist > 80 && dist < 400) {
        if (this.castAbility('time-warp', buildContext(aimX, aimY))) return 'time-warp';
      }
    }

    // Revolver auto-fire handled in TimeKit.update
    return null;
  }

  private doHuntAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    _angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const inBeastForm = aiState.npcHuntBeastForm ?? false;
    void hpRatio;

    // The npc never presses Q: the beast comes out on HuntKit's own clock, and hybrid form
    // needs an upgrade the npc does not have.
    if (!inBeastForm) {
      if (!skipSpecials) {
        // Lay the scent early — everything else in human form is better while it is down.
        if (!aiState.npcHuntTrailActive) {
          if (this.castAbility('hunt-trail', buildContext(this.x, this.y))) return 'hunt-trail';
        }
        // Grenades are lobbed at mid range, where the fuse has time to matter.
        if (dist < 340 && dist > 90) {
          if (this.castAbility('hunt-grenade', buildContext(aimX, aimY))) return 'hunt-grenade';
        }
        // Blast is a shove: only worth spending a charge on inside its own cone range.
        if (dist < 150 && (aiState.npcHuntBlastCharges ?? 0) > 0) {
          if (this.castAbility('hunt-blast', buildContext(aimX, aimY))) return 'hunt-blast';
        }
      }
      // Default: put a bolt in them.
      if (this.castAbility('hunt-crossbow', buildContext(aimX, aimY))) return 'hunt-crossbow';
    } else {
      if (!skipSpecials) {
        // Roar into the cone whenever the quarry is roughly in front — it is the only
        // defensive tool the beast has.
        if (dist < 500) {
          if (this.castAbility('hunt-roar', buildContext(aimX, aimY))) return 'hunt-roar';
        }
        // Blood Scent when the quarry is nearly done.
        if (this.castAbility('hunt-blood-scent', buildContext(this.x, this.y))) return 'hunt-blood-scent';
        // Close the gap with a pounce, or pick them up and throw them at point blank.
        if (dist > 140 && dist < 320) {
          if (this.castAbility('hunt-pounce', buildContext(aimX, aimY))) return 'hunt-pounce';
        }
        if (dist < 120) {
          if (this.castAbility('hunt-grapple', buildContext(aimX, aimY))) return 'hunt-grapple';
        }
      }
      if (dist < 110) {
        if (this.castAbility('hunt-slash', buildContext(aimX, aimY))) return 'hunt-slash';
      }
    }

    return null;
  }

  private doGravityAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
    _angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Lunar landing when low HP
      if (hpRatio < 0.35) {
        if (this.castAbility('lunar-landing', buildContext(this.x, this.y))) return 'lunar-landing';
      }
      // Space Slam when close
      if (dist < 180) {
        if (this.castAbility('space-slam', buildContext(aimX, aimY))) return 'space-slam';
      }
      // Grav Bomb snap
      if (this.castAbility('grav-bomb', buildContext(aimX, aimY))) return 'grav-bomb';
      // Meteor Rain (NPC burst version)
      if (this.castAbility('meteor-rain', buildContext(aimX, aimY))) return 'meteor-rain';
    }

    // Click: coin-flip between slash and single meteor shadow via space-slash cast()
    if (this.castAbility('space-slash', buildContext(aimX, aimY))) return 'space-slash';

    return null;
  }

  private doCreationAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
    _angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Use maze when low HP
      if (hpRatio < 0.35) {
        if (this.castAbility('maze-of-doom', buildContext(this.x, this.y))) return 'maze-of-doom';
      }
      // Place block when enemy is close
      if (dist < 140) {
        if (this.castAbility('creation-block', buildContext(aimX, aimY))) return 'creation-block';
      }
      // Wrench in your Plans — 20 dmg plus a 5s tax on everything they cast
      if (this.castAbility('wrench-plans', buildContext(aimX, aimY))) return 'wrench-plans';
      // Charged bolt (weighted random tier)
      if (this.castAbility('charged-bolt', buildContext(aimX, aimY))) return 'charged-bolt';
    }

    // Dagger spray fallback
    if (this.castAbility('dagger-spray', buildContext(aimX, aimY))) return 'dagger-spray';

    return null;
  }

  private doMagnetAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Protect when low on HP
      if (hpRatio < 0.4) {
        if (this.castAbility('protect', buildContext(aimX, aimY))) return 'protect';
      }
      // Magnetize enemy if close
      if (dist < 180) {
        if (this.castAbility('magnetize', buildContext(aimX, aimY))) return 'magnetize';
      }
      // Nail implant at medium range
      if (dist < 250) {
        if (this.castAbility('nail-implant', buildContext(aimX, aimY))) return 'nail-implant';
      }
      // Atom smasher when in attack range
      if (dist < 220) {
        if (this.castAbility('atom-smasher', buildContext(aimX, aimY))) return 'atom-smasher';
      }
    }

    // Default: mag pulse as primary attack
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('mag-pulse', buildContext(aimX, aimY))) return 'mag-pulse';
    }
    return null;
  }

  private doPlasmaAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Q: Pure CHAOS! — only worth it with the enemy in volley range, or as a low-HP swing
      if (dist < 280 || hpRatio < 0.35) {
        if (this.castAbility('plasma-pure-chaos', buildContext(aimX, aimY))) return 'plasma-pure-chaos';
      }
      // F: Chaos Blades at medium range
      if (dist < 250) {
        if (this.castAbility('plasma-chaos-blades', buildContext(aimX, aimY))) return 'plasma-chaos-blades';
      }
      // R: Plasma Current — fire toward player
      if (dist < 320 && (this.aiState === 'attack' || this.aiState === 'chase')) {
        if (this.castAbility('plasma-current', buildContext(aimX, aimY))) return 'plasma-current';
      }
      // E: Unstable Arena near player
      if (dist < 220) {
        if (this.castAbility('plasma-arena', buildContext(aimX, aimY))) return 'plasma-arena';
      }
    }

    // Click: Plasma Burst when close
    if (dist <= 130) {
      if (this.castAbility('plasma-burst', buildContext(aimX, aimY))) return 'plasma-burst';
    }

    return null;
  }

  private doGunpowderAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time;
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Keep building out the arsenal until full
      if ((aiState.npcGunpowderArsenalSize ?? 0) < 3) {
        if (this.castAbility('gunpowder-arsenal-expansion', buildContext(aimX, aimY))) return 'gunpowder-arsenal-expansion';
      }

      // BlunderBlast — open the vacuum cone toward the enemy when in range
      if (dist < 500) {
        if (this.castAbility('gunpowder-blunderblast', buildContext(aimX, aimY))) return 'gunpowder-blunderblast';
      }

      // Fire at Will as the main damage dump once weapons are equipped
      if ((aiState.npcGunpowderArsenalSize ?? 0) > 0 && dist < 450) {
        if (this.castAbility('gunpowder-fire-at-will', buildContext(aimX, aimY))) return 'gunpowder-fire-at-will';
      }

      // Explosive Retreat to bail out when low HP and the enemy is close
      if (hpRatio < 0.35 && dist < 150) {
        if (this.castAbility('gunpowder-explosive-retreat', buildContext(aimX, aimY))) return 'gunpowder-explosive-retreat';
      }
    }

    // Musket Shot — steady filler damage
    if (this.castAbility('gunpowder-musket-shot', buildContext(aimX, aimY))) return 'gunpowder-musket-shot';

    return null;
  }

  private doMetalAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const hasFlail = aiState.npcMetalHasFlail === true;
    const flailSwinging = aiState.npcMetalFlailSwinging === true;
    const blood = aiState.npcMetalBlood ?? 0;

    if (!skipSpecials) {
      // Clot Armor when low HP and blood is worth converting
      if (hpRatio < 0.35 && blood >= 20) {
        if (this.castAbility('metal-clot-armor', buildContext(aimX, aimY))) return 'metal-clot-armor';
      }
      // Blood Transfusion when hurt, safe distance, and blood available
      if (hpRatio < 0.6 && dist > 150 && blood > 0) {
        if (this.castAbility('metal-blood-transfusion', buildContext(aimX, aimY))) return 'metal-blood-transfusion';
      }
      // Trigger an idle flail into a swing once the enemy is in range
      if (hasFlail && !flailSwinging && dist < 200) {
        buildContext(aimX, aimY).metalTriggerFlailSwing();
        return 'metal-flail-craft';
      }
      // Craft a flail as the main reach/damage option
      if (!hasFlail && dist < 320) {
        if (this.castAbility('metal-flail-craft', buildContext(aimX, aimY))) return 'metal-flail-craft';
      }
      // Chain Tether at medium range
      if (dist < 230) {
        if (this.castAbility('metal-chain-tether', buildContext(aimX, aimY))) return 'metal-chain-tether';
      }
    }

    // Slash is melee filler
    if (dist <= 95) {
      if (this.castAbility('metal-slash', buildContext(aimX, aimY))) return 'metal-slash';
    }

    return null;
  }

  private doRubberAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q: Rubberage when the player is close enough to be caught by the ball swarm
      if (dist < 320 && !aiState.npcRubberageActive) {
        if (this.castAbility('rubberage', buildContext(aimX, aimY))) {
          aiState.npcRubberageActive = true;
          return 'rubberage';
        }
      }

      // R: Bounce Form when at medium range (reflect projectiles)
      if (dist > 150 && dist < 350 && !aiState.npcRubberBounceFormActive) {
        if (this.castAbility('rubber-bounce-form', buildContext(aimX, aimY))) {
          aiState.npcRubberBounceFormActive = true;
          return 'rubber-bounce-form';
        }
      }

      // F: Rubber Banding — plant an anchor for extra mobility / to snap back into range
      if (dist > 220 && !aiState.npcRubberBandActive) {
        if (this.castAbility('rubber-band', buildContext(aimX, aimY))) {
          aiState.npcRubberBandActive = true;
          return 'rubber-band';
        }
      }

      // E: Sling Shot at long range
      if (dist > 300) {
        if (this.castAbility('rubber-sling', buildContext(aimX, aimY))) return 'rubber-sling';
      }
    }

    // Default: Rubber Punch (NPC uses a moderate pull ratio)
    if (this.castAbility('rubber-punch', buildContext(aimX, aimY))) return 'rubber-punch';

    return null;
  }

  private doMagicAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // F: Meditate when low HP and safe distance
      if (hpRatio < 0.30 && !aiState.magicMeditating && dist > 200) {
        if (this.castAbility('magic-meditate', buildContext(aimX, aimY))) {
          aiState.magicMeditating = true;
          return 'magic-meditate';
        }
      }

      // R: Place anchor when player closes in; recall if already placed
      if (dist < 150) {
        if (aiState.magicAnchorPlaced) {
          if (this.castAbility('magic-anchor', buildContext(aimX, aimY))) {
            aiState.magicAnchorPlaced = false;
            return 'magic-anchor';
          }
        } else {
          if (this.castAbility('magic-anchor', buildContext(aimX, aimY))) {
            aiState.magicAnchorPlaced = true;
            return 'magic-anchor';
          }
        }
      }

      // Q: Necronomicon at long range (NPC context picks a random sub-ability)
      if (dist >= 300 && Math.random() < 0.30) {
        if (this.castAbility('magic-necronomicon', buildContext(aimX, aimY))) return 'magic-necronomicon';
      }

      // E: Grimoire at mid range (NPC context picks a random sub-ability)
      if (dist >= 150 && dist < 400 && Math.random() < 0.40) {
        if (this.castAbility('magic-grimoire', buildContext(aimX, aimY))) return 'magic-grimoire';
      }
    }

    // Default: Sparkle Shot
    if (this.castAbility('magic-sparkle-shot', buildContext(aimX, aimY))) return 'magic-sparkle-shot';

    return null;
  }

  private doTechnologyAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q: Admin Console when hurt
      if (hpRatio < 0.6 && Math.random() < 0.4) {
        if (this.castAbility('tech-admin', buildContext(aimX, aimY))) return 'tech-admin';
      }
      // R: Upload toward the enemy
      if (Math.random() < 0.35) {
        if (this.castAbility('tech-upload', buildContext(aimX, aimY))) return 'tech-upload';
      }
      // E: Overt Advertisement
      if (Math.random() < 0.25) {
        if (this.castAbility('tech-ads', buildContext(aimX, aimY))) return 'tech-ads';
      }
      // F: Web Drag (rarely — a bot gets little value from the manual grab)
      if (Math.random() < 0.05) {
        if (this.castAbility('tech-webdrag', buildContext(aimX, aimY))) return 'tech-webdrag';
      }
    }

    // Click: Addicting Cruncher
    if (dist < 500) {
      if (this.castAbility('tech-cruncher', buildContext(aimX, aimY))) return 'tech-cruncher';
    }

    return null;
  }

  private doSilenceAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const stalkers = aiState.npcSilenceStalkers ?? 0;
    const invisible = aiState.npcSilenceInvisible ?? false;

    if (!skipSpecials) {
      // Convert a matured stalker into a grabber the moment Ritual comes up.
      const mature = aiState.npcSilenceMatureStalker;
      if (mature) {
        if (this.castAbility('silence-ritual', buildContext(mature.x, mature.y))) return 'silence-ritual';
      }

      // Keep the stalker network up — drop them along the fog border.
      if (stalkers < 3 && Math.random() < 0.5) {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const edge = Phaser.Math.Between(0, 3);
        const sx = edge === 2 ? 55 : edge === 3 ? W - 55 : Phaser.Math.Between(40, W - 40);
        const sy = edge === 0 ? 55 : edge === 1 ? H - 55 : Phaser.Math.Between(40, H - 40);
        if (this.castAbility('silence-watch', buildContext(sx, sy))) return 'silence-watch';
      }

      // While invisible, hold the loud specials — the kit steers us into a backstab.
      if (!invisible) {
        if (dist < 260) {
          if (this.castAbility('silence-ritual', buildContext(aimX, aimY))) return 'silence-ritual';
        }
        if (dist < 240) {
          if (this.castAbility('silence-feast', buildContext(aimX, aimY))) return 'silence-feast';
        }
        if (dist < 420 && (hpRatio < 0.6 || _target.hp / _target.maxHp < 0.6)) {
          if (this.castAbility('silence-run', buildContext(_target.x, _target.y))) return 'silence-run';
        }
      }
    }

    // Click: stab when close (the cast itself dashes at the target).
    if (!invisible && dist < 190) {
      if (this.castAbility('silence-stab', buildContext(aimX, aimY))) return 'silence-stab';
    }

    return null;
  }

  /**
   * The target is invisible (Silence stealth): amble around like nothing is
   * there. With stalkers on the field, fire the click attack in random
   * directions hoping to clip one.
   */
  private doBlindBehavior(
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    huntStalkers: boolean,
  ): string | null {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (time >= this.blindNextWanderAt) {
      this.blindNextWanderAt = time + Phaser.Math.Between(600, 1200);
      if (Math.random() < 0.25) {
        this.blindWanderVx = 0;
        this.blindWanderVy = 0;
      } else {
        const ang = Math.random() * Math.PI * 2;
        this.blindWanderVx = Math.cos(ang) * this.speed * 0.8;
        this.blindWanderVy = Math.sin(ang) * this.speed * 0.8;
      }
    }
    body.setVelocity(this.blindWanderVx, this.blindWanderVy);
    if (this.stationary) body.setVelocity(0, 0);

    if (huntStalkers && time >= this.blindNextShotAt) {
      this.blindNextShotAt = time + Phaser.Math.Between(900, 1600);
      const ang = Math.random() * Math.PI * 2;
      const clickId = this.element.abilities[0]?.id;
      if (clickId && this.castAbility(clickId, buildContext(this.x + Math.cos(ang) * 320, this.y + Math.sin(ang) * 320))) {
        return clickId;
      }
    }
    return null;
  }

  private doEchoAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // F: Bat attach when very close
      if (dist < 100) {
        if (this.castAbility('echo-bat', buildContext(aimX, aimY))) return 'echo-bat';
      }
      // E: Guess when in range
      if (dist < 250 && Math.random() < 0.7) {
        if (this.castAbility('echo-guess', buildContext(aimX, aimY))) return 'echo-guess';
      }
      // R: Lantern occasionally
      if (Math.random() < 0.15) {
        if (this.castAbility('echo-lantern', buildContext(aimX, aimY))) return 'echo-lantern';
      }
      // Q: Eclipse occasionally
      if (Math.random() < 0.05) {
        if (this.castAbility('echo-eclipse', buildContext(aimX, aimY))) return 'echo-eclipse';
      }
    }

    // Click: Echolocation as primary attack
    if (dist < 500 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('echo-shot', buildContext(aimX, aimY))) return 'echo-shot';
    }

    return null;
  }

  private doSubterfugeAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const money = aiState.subMoney ?? 0;
    const bullets = aiState.subBullets ?? 0;
    const lackeys = aiState.subLackeys ?? 0;

    if (!skip) {
      // Q: Dark Treachery — steal the player's ultimate once things get serious
      if (hpRatio < 0.85 && Math.random() < 0.04) {
        if (this.castAbility('sub-treachery', buildContext(aimX, aimY))) return 'sub-treachery';
      }
      // R: Recruit — keep a couple of lackeys on the payroll
      if (money >= 1 && lackeys < 2 && Math.random() < 0.05) {
        if (this.castAbility('sub-recruit', buildContext(aimX, aimY))) return 'sub-recruit';
      }
      // F: Bribe — occasionally, and only with money to spare
      if (money >= 2 && Math.random() < 0.02) {
        if (this.castAbility('sub-bribe', buildContext(aimX, aimY))) return 'sub-bribe';
      }
      // E: Spray — burst fire at mid range; also buys a reload when dry
      if (dist < 420 && (bullets > 0 || money >= 1)) {
        if (this.castAbility('sub-spray', buildContext(aimX, aimY))) return 'sub-spray';
      }
    }

    // Click: Molecular Cutter dagger cadence at range
    if (dist < 500 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('sub-cutter', buildContext(aimX, aimY))) return 'sub-cutter';
    }

    return null;
  }
}
