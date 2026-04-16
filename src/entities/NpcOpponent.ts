import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { Projectile } from '../combat/Projectile';
import { slimeElement } from '../elements/slime';

type AiState = 'chase' | 'attack' | 'retreat';

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
  { level: 1, label: 'Easy',      hp:  80, speed: 100, aimOffsetDeg: 50, dodgeRange:   0, castSkipChance: 0.70 },
  { level: 2, label: 'Normal',    hp: 140, speed: 130, aimOffsetDeg: 30, dodgeRange:   0, castSkipChance: 0.45 },
  { level: 3, label: 'Hard',      hp: 200, speed: 148, aimOffsetDeg: 14, dodgeRange:   0, castSkipChance: 0.20 },
  { level: 4, label: 'Expert',    hp: 280, speed: 162, aimOffsetDeg:  5, dodgeRange: 100, castSkipChance: 0.05 },
  { level: 5, label: 'Nightmare', hp: 360, speed: 175, aimOffsetDeg:  1, dodgeRange: 160, castSkipChance: 0    },
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
  npcGrowthBloatActive?: boolean;
  crystalNodeCount?: number;
  npcSoulGhosts?: number;
  npcHuntBeastForm?: boolean;
  npcHuntTrailActive?: boolean;
  playerBleeding?: boolean;
  huntBloodMoonActive?: boolean;
  npcTimeRemainActive?: boolean;
  npcTimeHaltActive?: boolean;
  npcTimeTimelessReady?: boolean;
  // Fate (alt-life)
  fateSlotMachineCount?: number;
  fateLuckyQueued?: boolean;
  fateUnluckyQueued?: boolean;
  fateKarmaActive?: boolean;
  nearOwnSlotMachine?: boolean;
  // Metal
  npcMetalArsenal?: string[];
  // Death
  npcDeathExecuteBlackAuraActive?: boolean;
  deathWispCd?: number;
  // Adrenaline
  adrenalineStyledChain?: number;
  adrenalineHyperchargeReady?: boolean;
  adrenalineInjectPhase?: 0|1|2|3;
  // Magic
  magicAnchorPlaced?: boolean;
  magicMeditating?: boolean;
  // Technology
  technologyAbuse?: number;
  technologyOpSelfUsed?: boolean;
  technologyProtestorsSpawned?: boolean;
  // Silence
  npcSilenceSlasherActive?: boolean;
  npcSilenceSlasherHp?: number;
  npcSilenceHookConnected?: boolean;
}

export class NpcOpponent extends Fighter {
  private aiState: AiState = 'chase';
  private readonly attackRange = 280;
  private readonly retreatHpRatio = 0.28;
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
    if (aiState.isLocked || this.npcHuntRoarLocked) return null;

    // Dummy element: stand completely still, do nothing
    if (this.element.id === 'dummy') {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return null;
    }

    // Initialise charge cooldown on the very first tick so mastered NPCs don't
    // immediately charge before moving.
    if (this.lastChargeDecision < 0) this.lastChargeDecision = time;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const hpRatio = this.hp / this.maxHp;

    // State transitions
    if (hpRatio < this.retreatHpRatio) {
      this.aiState = 'retreat';
    } else if (dist <= this.attackRange) {
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
        const aimOffsetRad2 = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * (Math.PI / 180);
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
    const aimOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * (Math.PI / 180);
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
        case 'retreat': {
          const awayAngle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
          // Offset by 60° so NPC retreats diagonally instead of straight back into corners
          const strafeAngle = awayAngle + this.strafeDir * (Math.PI / 3);
          body.setVelocity(
            Math.cos(strafeAngle) * this.speed,
            Math.sin(strafeAngle) * this.speed,
          );
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
    if (this.element.id === 'death') {
      return this.doDeathAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'void') {
      return this.doVoidAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'adrenaline') {
      return this.doAdrenalineAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
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
    void skipSpecials;

    // Default: launch a slime projectile toward the player
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('slime-shot', buildContext(aimX, aimY))) {
        const ctx = buildContext(aimX, aimY);
        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 480;
        const proj = new Projectile(ctx.scene, this.x + (dx / len) * 32, this.y + (dy / len) * 32, 'proj-slime', 10, false);
        ctx.projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);
        // Close range: fire a few more slimes spread
        if (dist < 200) {
          for (const offset of [-18, 18]) {
            const ang = Math.atan2(dy, dx) + offset * (Math.PI / 180);
            const sp2 = new Projectile(ctx.scene, this.x + Math.cos(ang) * 32, this.y + Math.sin(ang) * 32, 'proj-slime', 8, false);
            ctx.projectiles.add(sp2);
            sp2.launch(Math.cos(ang) * speed, Math.sin(ang) * speed);
          }
        }
        return 'slime-shot';
      }
    }
    return null;
  }

  private doFateAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time; void target;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const slotCount = aiState.fateSlotMachineCount ?? 0;

    if (!skipSpecials) {
      // 1. Maintain slot machines (place up to 2 near self for passive pressure)
      if (slotCount < 2) {
        const px = this.x + Phaser.Math.Between(-50, 50);
        const py = this.y + Phaser.Math.Between(-50, 50);
        if (this.castAbility('fate-slots', buildContext(px, py))) return 'fate-slots';
      }

      // 2. Reel the slot machine if standing near one (simulated by using chargeUntil)
      if (aiState.nearOwnSlotMachine && slotCount > 0 && this.chargeUntil <= 0) {
        this.chargeUntil = time + 2000;
        this.chargingAbility = 'fate-slots-reel';
        return null;
      }
      if (this.chargingAbility === 'fate-slots-reel' && this.chargeUntil > 0 && time >= this.chargeUntil) {
        // Reel resolved — let ArenaScene handle the spin via aiState flag; clear charge
        this.chargeUntil = 0;
        this.chargingAbility = '';
      }

      // 3. Force lucky if not already lucky and cooldown is ready
      if (!aiState.fateLuckyQueued) {
        if (this.castAbility('fate-force', buildContext(this.x, this.y))) return 'fate-force';
      }

      // 4. Karma when low HP or close range
      if ((hpRatio < 0.60 || dist < 200) && !aiState.fateKarmaActive) {
        if (this.castAbility('fate-karma', buildContext(this.x, this.y))) return 'fate-karma';
      }

      // 5. Roll of Fate when desperate
      if (hpRatio < 0.40) {
        if (this.castAbility('fate-roll', buildContext(aimX, aimY))) return 'fate-roll';
      }
    }

    // 6. Draw (card barrage) as default attack
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('fate-draw', buildContext(aimX, aimY))) return 'fate-draw';
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
      // 1. Water Shield — low HP, no active charge
      if (hpRatio < 0.60 && this.shieldCharges === 0) {
        if (this.castAbility('water-shield', buildContext(this.x, this.y))) return 'water-shield';
      }

      // 2. Pain Rain — medium range, decent HP
      if (dist < 380 && hpRatio > 0.25) {
        if (this.castAbility('pain-rain', buildContext(aimX, aimY))) return 'pain-rain';
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

    // 6. Water Cut default (uses offset aim)
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
    // NPC Light AI delegates heavy logic to ArenaScene (via updateLightKit reacting to npcCastId).
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Prayer — when HP low
      if (hpRatio < 0.6) {
        if (this.castAbility('prayer', buildContext(aimX, aimY))) return 'prayer';
      }
      // 2. Skewer — when close
      if (dist < 200) {
        if (this.castAbility('skewer', buildContext(aimX, aimY))) return 'skewer';
      }
      // 3. Photon Orbs
      if (this.castAbility('photon-orbs', buildContext(aimX, aimY))) return 'photon-orbs';
      // 4. Photosynthespark — when not adjacent (will charge in during accel)
      if (dist > 150) {
        if (this.castAbility('photo-spark', buildContext(aimX, aimY))) return 'photo-spark';
      }
    }

    // 5. Light Stab / spear tap
    if (dist < 160) {
      if (this.castAbility('light-stab', buildContext(aimX, aimY))) return 'light-stab';
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
    const sharpOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * 0.1 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Summon drones (up to 4)
      if (droneCount < 4) {
        if (this.castAbility('drone-summon', buildContext(this.x, this.y))) return 'drone-summon';
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
    const sharpOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * 0.1 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Tentacle — extend toward player when in attack range
      if (dist < 280) {
        if (this.castAbility('tentacle', buildContext(target.x, target.y))) return 'tentacle';
      }

      // 2. Snap Trap — place at own feet occasionally
      if (dist < 200) {
        if (this.castAbility('snap-trap', buildContext(this.x, this.y))) return 'snap-trap';
      }

      // 3. Dark bomb — sharp aim
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
    const sharpOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * 0.15 * (Math.PI / 180);
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
    const sharpOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * 0.15 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Mutate — use whenever off cooldown (always beneficial)
      if (this.castAbility('mutate', buildContext(this.x, this.y))) return 'mutate';

      // 2. Bloat — when low HP
      if (hpRatio < 0.60 && !aiState.npcGrowthBloatActive) {
        if (this.castAbility('bloat', buildContext(this.x, this.y))) return 'bloat';
      }

      // 3. Infect — when in range
      if (dist < 400) {
        if (this.castAbility('infect', buildContext(sharpX, sharpY))) return 'infect';
      }

      // 4. Mutant Morph — every ~30s
      if (this.castAbility('mutant-morph', buildContext(this.x, this.y))) return 'mutant-morph';
    }

    // Default: growth-click
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
    const ghosts = aiState.npcSoulGhosts ?? 0;

    // Sharp aim (10% offset) for orb placement
    const sharpOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * 0.10 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Undead Charge — 5 ghosts ready
      if (ghosts >= 5) {
        if (this.castAbility('undead-charge', buildContext(this.x, this.y))) return 'undead-charge';
      }

      // 2. Sacrifice — when ghost count < 2 and HP is healthy enough
      if (ghosts < 2 && hpRatio > 0.35) {
        if (this.castAbility('soul-sacrifice', buildContext(this.x, this.y))) return 'soul-sacrifice';
      }

      // 3. Summon — when ghosts available (NPC context auto-upgrades to best type)
      if (ghosts >= 1) {
        if (this.castAbility('soul-summon', buildContext(this.x, this.y))) return 'soul-summon';
      }

      // 4. Consume — when HP is low
      if (hpRatio < 0.45) {
        if (this.castAbility('soul-consume', buildContext(this.x, this.y))) return 'soul-consume';
      }
    }

    // Default: Spirit Propel orb toward player
    if (this.castAbility('soul-orb', buildContext(sharpX, sharpY))) return 'soul-orb';

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
    const sharpOffsetRad = (Math.random() * 2 - 1) * this.difficulty.aimOffsetDeg * 0.10 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Trick of the Light — when low HP
      if (hpRatio < 0.55) {
        if (this.castAbility('crystal-trick', buildContext(this.x, this.y))) return 'crystal-trick';
      }

      // 2. Barrage — when in range
      if (dist < 380) {
        if (this.castAbility('crystal-barrage', buildContext(target.x, target.y))) return 'crystal-barrage';
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
      // Timeless — when charged and low-moderate HP
      if (aiState.npcTimeTimelessReady) {
        if (this.castAbility('time-timeless', buildContext(this.x, this.y))) return 'time-timeless';
      }

      // Remain — activate when HP is low (12s CD handled by castAbility)
      if (hpRatio < 0.40) {
        if (this.castAbility('time-remain', buildContext(this.x, this.y))) return 'time-remain';
      }

      // Halt — when player is close or barrage is ramped up
      if (dist < 220 && !aiState.npcTimeHaltActive) {
        if (this.castAbility('time-halt', buildContext(this.x, this.y))) return 'time-halt';
      }

      // Time Warp — shoot orb toward player
      if (dist < 320) {
        if (this.castAbility('time-warp', buildContext(aimX, aimY))) return 'time-warp';
      }
    }

    // Barrage is handled per-frame in ArenaScene; nothing else to cast
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
    const bloodMoonDebuff = aiState.huntBloodMoonActive ?? false;

    // Blood moon 20% attack penalty on bleeding NPC
    if (bloodMoonDebuff && Math.random() < 0.20) return null;

    if (!inBeastForm) {
      if (!skipSpecials) {
        // Transform — transition once enough time has passed (NPC transforms aggressively)
        if (this.castAbility('hunt-transform', buildContext(this.x, this.y))) return 'hunt-transform';

        // Blood pact when low HP
        if (hpRatio < 0.45) {
          if (this.castAbility('hunt-blood-pact', buildContext(this.x, this.y))) return 'hunt-blood-pact';
        }

        // Hunter's trail when not active
        if (!aiState.npcHuntTrailActive) {
          if (this.castAbility('hunt-trail', buildContext(this.x, this.y))) return 'hunt-trail';
        }

        // Grenade at medium range
        if (dist < 380 && dist > 80) {
          if (this.castAbility('hunt-grenade', buildContext(aimX, aimY))) return 'hunt-grenade';
        }
      }

      // Default: shotgun
      if (this.castAbility('hunt-shotgun', buildContext(aimX, aimY))) return 'hunt-shotgun';
    } else {
      if (!skipSpecials) {
        // Blood hunt if player is bleeding and on CD
        if (aiState.playerBleeding) {
          if (this.castAbility('hunt-blood-hunt', buildContext(this.x, this.y))) return 'hunt-blood-hunt';
        }

        // Blood moon
        if (this.castAbility('hunt-blood-moon', buildContext(this.x, this.y))) return 'hunt-blood-moon';

        // Explosive leap when far from target
        if (dist > 180) {
          if (this.castAbility('hunt-leap', buildContext(aimX, aimY))) return 'hunt-leap';
        }

        // Untransform when low HP to regain shotgun flexibility
        if (hpRatio < 0.25) {
          if (this.castAbility('hunt-untransform', buildContext(this.x, this.y))) return 'hunt-untransform';
        }
      }

      // Default: slash when close
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
      // Scythe of doom
      if (this.castAbility('scythe-of-doom', buildContext(aimX, aimY))) return 'scythe-of-doom';
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
      // Q: Chaos Incarnate when low HP or to close gap
      if (hpRatio < 0.35) {
        if (this.castAbility('plasma-chaos-incarnate', buildContext(aimX, aimY))) return 'plasma-chaos-incarnate';
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

  private doDeathAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    void hpRatio;

    // Black aura active — try to execute enemy
    if (aiState.npcDeathExecuteBlackAuraActive) {
      if (this.castAbility('death-execute', buildContext(aimX, aimY))) return 'death-execute';
    }

    if (!skip) {
      // Wisp spam (throttled to 1 cast/sec)
      const now = time;
      if (!aiState.deathWispCd || now >= aiState.deathWispCd) {
        if (this.castAbility('death-wisps', buildContext(aimX, aimY))) {
          aiState.deathWispCd = now + 1000;
          return 'death-wisps';
        }
      }

      // Daemon when at mid-HP
      if (hpRatio > 0.25 && hpRatio < 0.75) {
        if (this.castAbility('wisp-daemon', buildContext(aimX, aimY))) return 'wisp-daemon';
      }

      // Death Wish when close to enemy
      if (dist < 280) {
        if (this.castAbility('death-wish', buildContext(aimX, aimY))) return 'death-wish';
      }

      // Execute on own wisps (ArenaScene handles finding nearby wisp via coords)
      if (this.castAbility('death-execute', buildContext(this.x, this.y))) return 'death-execute';
    }

    // Death Sweep at player
    if (this.castAbility('death-sweep', buildContext(aimX, aimY))) return 'death-sweep';

    return null;
  }

  private doVoidAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void aiState;
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q: Void of Hell when HP dropping
      if (hpRatio < 0.5) {
        if (this.castAbility('void-of-hell', buildContext(aimX, aimY))) return 'void-of-hell';
      }

      // F: Void Ash at player position
      if (this.castAbility('void-ash', buildContext(aimX, aimY))) return 'void-ash';

      // R: Re-Lapse when close enough
      if (dist < 280) {
        if (this.castAbility('void-relapse', buildContext(aimX, aimY))) return 'void-relapse';
      }

      // E: Return to Void when close
      if (dist < 200) {
        if (this.castAbility('void-return', buildContext(aimX, aimY))) return 'void-return';
      }
    }

    // Click: Void Floater spam (follows player automatically)
    if (this.castAbility('void-floater', buildContext(aimX, aimY))) return 'void-floater';

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
    const hasGuns = aiState.npcMetalArsenal && aiState.npcMetalArsenal.length > 0;
    const arsenalFull = aiState.npcMetalArsenal && aiState.npcMetalArsenal.length >= 3;

    if (!skipSpecials) {
      // Blood Clot when low HP
      if (hpRatio < 0.35) {
        if (this.castAbility('metal-blood-clot', buildContext(aimX, aimY))) return 'metal-blood-clot';
      }
      // Chain Tether at medium range
      if (dist < 230) {
        if (this.castAbility('metal-chain-tether', buildContext(aimX, aimY))) return 'metal-chain-tether';
      }
      // Pick up weapon if arsenal not full
      if (!arsenalFull) {
        if (this.castAbility('metal-reinforce', buildContext(aimX, aimY))) return 'metal-reinforce';
      }
      // Fire at will when armed
      if (hasGuns && dist < 280) {
        if (this.castAbility('metal-fire-at-will', buildContext(aimX, aimY))) return 'metal-fire-at-will';
      }
    }

    // Slash is melee primary
    if (dist <= 95) {
      if (this.castAbility('metal-slash', buildContext(aimX, aimY))) return 'metal-slash';
    }

    // Fallback fire at will if armed and approaching
    if (!skipSpecials && hasGuns) {
      if (this.castAbility('metal-fire-at-will', buildContext(aimX, aimY))) return 'metal-fire-at-will';
    }

    return null;
  }

  private doAdrenalineAbilities(
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
      // F: Self Inject when low HP (only if not already injecting)
      if (hpRatio < 0.35 && (aiState.adrenalineInjectPhase ?? 0) === 0) {
        if (this.castAbility('adrenaline-self-inject', buildContext(aimX, aimY))) {
          aiState.adrenalineInjectPhase = 1;
          return 'adrenaline-self-inject';
        }
      }

      // Q: Styled On! — chain if window active
      if ((aiState.adrenalineStyledChain ?? 0) > 0) {
        if (this.castAbility('adrenaline-styled-on', buildContext(aimX, aimY))) {
          aiState.adrenalineStyledChain = (aiState.adrenalineStyledChain ?? 0) + 1;
          if ((aiState.adrenalineStyledChain ?? 0) >= 5) aiState.adrenalineStyledChain = 0;
          return 'adrenaline-styled-on';
        }
      }

      // Q: Styled On! at close range
      if (dist < 130) {
        if (this.castAbility('adrenaline-styled-on', buildContext(aimX, aimY))) {
          aiState.adrenalineStyledChain = 1;
          return 'adrenaline-styled-on';
        }
      }

      // E: Dash toward player (and potentially trigger hypercharge)
      if (dist < 200) {
        if (this.castAbility('adrenaline-dash', buildContext(aimX, aimY))) return 'adrenaline-dash';
      }

      // Click with hypercharge if ready
      if (aiState.adrenalineHyperchargeReady) {
        if (this.castAbility('adrenaline-golden-shot', buildContext(aimX, aimY))) {
          aiState.adrenalineHyperchargeReady = false;
          return 'adrenaline-golden-shot';
        }
      }
    }

    // Default: Golden Shot spam
    if (this.castAbility('adrenaline-golden-shot', buildContext(aimX, aimY))) return 'adrenaline-golden-shot';

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

    // Default: Magic Missiles
    if (this.castAbility('magic-missiles', buildContext(aimX, aimY))) return 'magic-missiles';

    return null;
  }

  private doTechnologyAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    _dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    if (aiState.technologyAbuse === undefined) aiState.technologyAbuse = 0;

    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q: OP.Self when healthy, not yet used this match
      if (hpRatio >= 0.75 && !aiState.technologyOpSelfUsed && Math.random() < 0.15) {
        if (this.castAbility('tech-opself', buildContext(aimX, aimY))) {
          aiState.technologyOpSelfUsed = true;
          aiState.technologyAbuse = Math.min(100, aiState.technologyAbuse + 100);
          return 'tech-opself';
        }
      }

      // E: Dev.Console randomly
      if (Math.random() < 0.20) {
        if (this.castAbility('tech-devconsole', buildContext(aimX, aimY))) return 'tech-devconsole';
      }

      // R: Hack.Attribute when abuse is low (free damage buffs)
      if (aiState.technologyAbuse < 50 && Math.random() < 0.40) {
        if (this.castAbility('tech-hack', buildContext(aimX, aimY))) {
          aiState.technologyAbuse = Math.min(100, aiState.technologyAbuse + 10);
          return 'tech-hack';
        }
      }

      // F: Player.Gift to reduce abuse
      if (aiState.technologyAbuse > 60 && Math.random() < 0.50) {
        if (this.castAbility('tech-gift', buildContext(aimX, aimY))) {
          aiState.technologyAbuse = Math.max(0, aiState.technologyAbuse - 20);
          return 'tech-gift';
        }
      }
    }

    // Click: Flail empower
    if (this.castAbility('tech-flail', buildContext(aimX, aimY))) return 'tech-flail';

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
    const inSlasher = aiState.npcSilenceSlasherActive ?? false;
    const slasherHp = aiState.npcSilenceSlasherHp ?? 10;
    const hookConnected = aiState.npcSilenceHookConnected ?? false;

    if (!inSlasher) {
      // ── Normal horror kit ─────────────────────────────────────
      if (!skipSpecials) {
        // Enter slasher mode when close (opportunistic)
        if (dist < 200 && hpRatio > 0.35) {
          if (this.castAbility('silence-thriller', buildContext(this.x, this.y))) return 'silence-thriller';
        }

        // Possess at long range
        if (dist > 250) {
          if (this.castAbility('silence-possess', buildContext(aimX, aimY))) return 'silence-possess';
        }

        // DON'T LOOK at medium range (angle aimed at player)
        if (dist < 350 && dist > 80) {
          if (this.castAbility('silence-dont-look', buildContext(aimX, aimY))) return 'silence-dont-look';
        }

        // They Watch when low HP (panic button)
        if (hpRatio < 0.35) {
          if (this.castAbility('silence-watch', buildContext(this.x, this.y))) return 'silence-watch';
        }
      }

      // Default: short-range fade burst (treat as poke ability)
      if (dist < 180) {
        if (this.castAbility('silence-fade', buildContext(aimX, aimY))) return 'silence-fade';
      }
    } else {
      // ── Slasher kit ──────────────────────────────────────────
      if (!skipSpecials) {
        // Open with Slash Em Up
        if (this.castAbility('silence-slash-em-up', buildContext(aimX, aimY))) return 'silence-slash-em-up';

        // Enrage when low on pips
        if (slasherHp <= 6) {
          if (this.castAbility('silence-enrage', buildContext(this.x, this.y))) return 'silence-enrage';
        }

        // Hook when mid-range; yank if hook connected
        if (hookConnected) {
          if (this.castAbility('silence-meat-hook', buildContext(aimX, aimY))) return 'silence-meat-hook-yank';
        } else if (dist > 120 && dist < 400) {
          if (this.castAbility('silence-meat-hook', buildContext(aimX, aimY))) return 'silence-meat-hook';
        }

        // Retire when near-death to minimise recoil
        if (slasherHp <= 2) {
          if (this.castAbility('silence-retire', buildContext(this.x, this.y))) return 'silence-retire';
        }
      }

      // Default: machete at close range
      if (dist < 120) {
        if (this.castAbility('silence-machete', buildContext(aimX, aimY))) return 'silence-machete';
      }
    }

    return null;
  }
}
