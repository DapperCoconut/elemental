import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { Projectile } from '../combat/Projectile';

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
}

export class NpcOpponent extends Fighter {
  private aiState: AiState = 'chase';
  private readonly attackRange = 280;
  private readonly retreatHpRatio = 0.28;
  private strafeDir = 1;
  private nextStrafeDirChange = 0;
  private lastFlameBodyToggle = -10000;
  private readonly difficulty: DifficultyConfig;

  /** Set by ArenaScene when the Mastered mutation is active. */
  public isMastered = false;

  // ── Charge state (all AI can charge; Mastered makes it meaningful) ──
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
    if (aiState.isLocked) return null;

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
    const skipSpecials = !this.isMastered && this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

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

      // 4. Flame Body toggle — Nightmare always; Mastered at any difficulty
      if (this.difficulty.level >= 5 || this.isMastered) {
        const wantsFlameBody = hpRatio > 0.30;
        if (wantsFlameBody !== aiState.flameBodyActive && time - this.lastFlameBodyToggle > 2500) {
          if (this.castAbility('flame-body', buildContext(this.x, this.y))) {
            this.lastFlameBodyToggle = time;
            return 'flame-body';
          }
        }
      }

      // 5. Mastered: schedule charge for a heavy pressure-bomb every ~9s
      if (this.isMastered && !this.chargeUntil && time - this.lastChargeDecision > 9000) {
        this.lastChargeDecision = time;
        this.chargeUntil = time + Phaser.Math.Between(3000, 6000);
        this.chargingAbility = 'pressure-bomb';
        return 'start-charge';
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
    const skipSpecials = !this.isMastered && this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

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

      // 5. Mastered: schedule charge for pain-rain every ~10s
      if (this.isMastered && !this.chargeUntil && time - this.lastChargeDecision > 10000) {
        this.lastChargeDecision = time;
        this.chargeUntil = time + Phaser.Math.Between(2000, 4000);
        this.chargingAbility = 'pain-rain';
        return 'start-charge';
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

    const skipSpecials = !this.isMastered && this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

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

    const skipSpecials = !this.isMastered && this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

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
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = !this.isMastered && this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const shield = aiState.earthShieldHp;

    if (!skipSpecials) {
      // 1. Bull Rush — use when HP is low or at medium range for aggression
      if ((hpRatio < 0.5 || dist < 300) && shield >= 20) {
        if (this.castAbility('bull-rush', buildContext(target.x, target.y))) return 'bull-rush';
      }

      // 2. Shield Up — keep shield topped up
      if (shield < 60) {
        if (this.castAbility('shield-up', buildContext(this.x, this.y))) return 'shield-up';
      }

      // 3. Shield Slam — close range dash with decent shield
      if (dist < 200 && shield >= 30) {
        if (this.castAbility('shield-slam', buildContext(target.x, target.y))) return 'shield-slam';
      }

      // 4. Shield Break — very close range with enough shield to deal damage
      if (dist < 140 && shield >= 40) {
        if (this.castAbility('shield-break', buildContext(this.x, this.y))) return 'shield-break';
      }
    }

    // 5. Stab — fallback melee
    if (dist < 130) {
      if (this.castAbility('stab', buildContext(target.x, target.y))) return 'stab';
    }

    return null;
  }
}
