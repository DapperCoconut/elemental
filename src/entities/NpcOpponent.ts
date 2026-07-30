import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { Projectile } from '../combat/Projectile';
import { slimeElement } from '../elements/slime';
import { HP_SCALE } from '../data/Balance';

type AiState = 'chase' | 'attack';

/**
 * Psychic: the smallest stress pool an npc will spend its ultimate on. 60 points is three
 * seconds of coma at the ability's 20-per-second rate, which is roughly the point at which the
 * follow-up (half of every hit banked straight back as fresh stress) pays the cooldown back.
 */
const COMA_WORTH_IT = 60;

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
  // Justice
  npcJusticeWill?: number;
  npcJusticeFlying?: boolean;
  npcJusticeSheer?: boolean;
  /** A Bind chain is sunk into a wall and waiting on the recast that rips it out. */
  npcJusticeAnchored?: boolean;
  /**
   * X of the nearest hostile Pillar of Flame, and how wide a berth to give it. Read by
   * the movement pass so the AI walks around a wall of fire instead of standing in it.
   */
  justicePillarX?: number;
  justicePillarHalfWidth?: number;
  // Dream
  /** The pendulum is already hanging — it is a toggle, and re-casting would put it away. */
  npcDreamTrance?: boolean;
  /** 0–100 sleepiness on whatever the AI is fighting. Decides when to cash in. */
  npcDreamTargetDrowsy?: number;
  npcDreamTargetAsleep?: boolean;
  npcDreamCatchers?: number;
  /** True once the pacing gate will let another dreamcatcher be dropped. */
  npcDreamMayCatch?: boolean;
  // Chalk
  /** A drawing window is already open — starting a second one would throw the first away. */
  npcChalkDrawing?: boolean;
  npcChalkShieldHp?: number;
  npcChalkMasterpiece?: boolean;
  /** No blue line on the floor, so Perma-Chalk is worth spending. */
  npcChalkMayPerma?: boolean;
  // Magma
  /** Hatched. Everything is aimed at the target rather than at its own summons. */
  npcMagmaDragon?: boolean;
  npcMagmaFist?: boolean;
  npcMagmaBloat?: boolean;
  npcMagmaVolcanoes?: number;
  npcMagmaHasEgg?: boolean;
  // Illusion
  /** The dance is running: it is untouchable and hopping, so it should just be shooting. */
  npcIllusionDancing?: boolean;
  /** A pane is already hanging — a second would only bend its own bullets twice. */
  npcIllusionHasVeil?: boolean;
  /** The target is already folded, so the Tesseract has nothing left to spend itself on. */
  npcIllusionTargetFolded?: boolean;
  /**
   * The vessel the AI should be charging, or undefined when it has nothing left to fill.
   * Magma's summons are fed by its own attacks, so this is what it aims *at* — the one
   * element in the game whose AI sometimes deliberately shoots away from you.
   */
  npcMagmaChargeTarget?: { x: number; y: number };
  // Depths
  /**
   * Somewhere the AI has to physically be, overriding chase/strafe entirely: the air pocket
   * it is drowning without, a healing algae orb it can still use, or the anglerfish lure —
   * which it has no way of telling apart from the orb, and that is the whole passive.
   */
  depthsSeekPoint?: { x: number; y: number };
  /** The line is out. Standing still is the ability, so nothing may interrupt it. */
  npcDepthsFishing?: boolean;
  /** A fish is in its mouth; the kit throws it, so the AI must not re-cast F. */
  npcDepthsHasFish?: boolean;
  npcDepthsSharkOut?: boolean;
  /** Piranhas already on the target — five is the cap, and a sixth click is wasted. */
  npcDepthsTargetLatches?: number;
  /** The AI is the one drowning: everything except running for air can wait. */
  npcDepthsDrowning?: boolean;

  // Ruin
  /** A spike ring is already counting down; a second F would only replace it with itself. */
  npcRuinRingUp?: boolean;
  /** One skewer per side is in the air — the kit refuses a second, so the cast would be eaten. */
  npcRuinSkewerOut?: boolean;
  /** Stacks of rot already down. At the cap, Q says so instead of spending itself. */
  npcRuinDecayStacks?: number;
  /** The target has actually used something that isn't already locked. */
  npcRuinCanLock?: boolean;

  // Glass
  /** Mid-Glass Blow: there is no body, so nothing at all can be cast until it re-forms. */
  npcGlassBodyGone?: boolean;
  /** Shards are in the ring rather than out in the world — E has something to throw. */
  npcGlassHasShards?: boolean;
  /** Temper is already up; re-casting would only reset a buff that is already doing its job. */
  npcGlassTempered?: boolean;
  /** Already twirling. The kit owns the body for the duration, so a second R is thrown away. */
  npcGlassTwirling?: boolean;

  // Death
  /** Mid-handshake: the kit owns the body and refuses every key until it lets go. */
  npcDeathBusy?: boolean;
  /** The katana is already held out — a second Riposte would only restart a live guard. */
  npcDeathGuarding?: boolean;
  /** A deal is running. The kit refuses a second one, so the cast would be eaten. */
  npcDeathDealing?: boolean;
  /** A noose is already up; re-hanging it buys nothing but a 25 second cooldown. */
  npcDeathHospiceOut?: boolean;
  /** Styx stacks already on the target. Three is the cap and a fourth shot is wasted. */
  npcDeathTargetStyx?: number;
  /** Seconds left before midnight — the bot plays for time once it is close. */
  npcDeathClock?: number;

  // Fortune
  /** Coins in the purse. Everything the element does costs some of these. */
  npcFortuneCoins?: number;
  /** Coins already tied up, so the bot doesn't bank its way out of being able to shoot. */
  npcFortuneInvested?: number;
  /** Rounds left in the magazine. Zero means a reload is running and the trigger does nothing. */
  npcFortuneAmmo?: number;
  /** The golden beam is open: the kit is steering it, so no other key is worth pressing. */
  npcFortuneBeaming?: boolean;
  /** Turnstiles already up — a second wall would only restart a live one. */
  npcFortuneWall?: boolean;

  // Amber
  /** The sling is wound up and how far, 0–1. The bot releases when it is worth releasing. */
  npcAmberSwinging?: boolean;
  npcAmberCharge?: number;
  /** Its tyrannosaur is out. Nothing else it owns will spawn while that is true. */
  npcAmberRex?: boolean;
  /** Mosquitoes still alive — a second cast on top of a full swarm is wasted. */
  npcAmberSwarm?: number;
  /** In something's jaws: the kit owns the body and every cast is refused. */
  npcAmberHeld?: boolean;

  // Psychic
  /** Abilities currently sitting in the target's delayed-cast queue — the E/R decision. */
  npcPsychicQueue?: number;
  /** One of them is an ultimate, which is the only thing worth spending Mind Control on. */
  npcPsychicBigCast?: boolean;
  /** Stress on the target. The Q is a payout, so the bot waits for the pool to be worth it. */
  npcPsychicStress?: number;

  // Radiation
  /** Tracers already stuck on the target. Three confirms the shot; a miss scrubs all of them. */
  npcRadiationTracers?: number;
  /** The flare gun is out — every click has to go into the same body or the ultimate is wasted. */
  npcRadiationFlares?: boolean;
  /** Mid-drum or mid-fall: the kit owns the body, so nothing else is worth pressing. */
  npcRadiationBusy?: boolean;
  /** The target already has a dose, which is what turns the baton from an opener into a stun. */
  npcRadiationTargetDosed?: boolean;

  // Bind
  /** 0–100 of the patron's patience. Above 70 the bot stops spending anything at all. */
  npcBindAnger?: number;
  /** The god has turned: every ability is refused for five seconds, so it just moves. */
  npcBindForsaken?: boolean;
  /** 0–1 beam heat. The bot lets go before it tops out rather than eating 20 anger. */
  npcBindHeat?: number;
  npcBindOverheated?: boolean;
  /** Faith left in its idol, or -1 with none standing — the difference between a turret and a bill. */
  npcBindIdolFaith?: number;
  npcBindWard?: number;

  // Slime (id: gum)
  /** Solidify threw its hand away — nothing it presses will answer until it grows back. */
  npcGumHandless?: boolean;
  /** Slimeballs lying on the floor. The click turns into a throw while it has any. */
  npcGumBalls?: number;
  /** Already swollen and open, or still digesting. A second Oozorbtion would be thrown away. */
  npcGumAbsorbArmed?: boolean;
  /** The target is already sealed in gum, so a second barrage buys nothing. */
  npcGumTargetEncased?: boolean;

  // Paper
  /** Which storybook is open: 0 Knight, 1 Alien, 2 Fantasy. Decides what Click and Q even are. */
  npcPaperBook?: number;
  /** The Alien book is mid-burst or mid-reload — the kit refuses the click, so don't spend it. */
  npcPaperLaserBusy?: boolean;
  /** Already gliding. The kit owns the body for the duration, so a second E is thrown away. */
  npcPaperRiding?: boolean;
  /** Monsters still lying on the floor. F is wasted while a decent field is already down. */
  npcPaperMaches?: number;

  // Passion
  /** A rose is already in its teeth; the kit throws that one, so F must not be re-cast. */
  npcPassionHasRose?: boolean;
  /** Mid-pose. Everything else can wait out the five seconds. */
  npcPassionPosing?: boolean;
  /** 0–1 of the target's love bar. The whole element is this number, so every branch reads it. */
  npcPassionTargetLove?: number;

  /**
   * Conquest: the square the bot is walking to in order to place its next building. Every
   * placement is "stand here, then cast", so the destination has to come before the decision.
   */
  conquestSeekPoint?: { x: number; y: number };
  /** Set once it is standing on that square and can afford what it went there for. */
  npcConquestReady?: 'barracks' | 'turret' | 'barricade' | 'expansion';
  npcConquestAuthority?: number;
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

  /**
   * Psychic (Opened Eyes): the locomotion rule this bot is following right now, so a kit can
   * replay it forward and draw where it is about to walk. Exposed as one object rather than
   * three getters because the projection is only correct if all of it comes from the same tick.
   */
  public get movementPlan(): { closing: boolean; range: number; strafe: number; speed: number; frozen: boolean } {
    return {
      closing: this.aiState !== 'attack',
      range: this.attackRange,
      strafe: this.strafeDir,
      speed: this.speed,
      frozen: this.stationary || this.chargeUntil > 0,
    };
  }

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

    // ── Pillar of Flame: walk around it, not through it ──────────
    // Applied after movement so it overrides whatever chase/strafe just decided. The push
    // is sideways only, so the NPC still closes distance while it clears the band.
    if (aiState.justicePillarX !== undefined) {
      const halfW = aiState.justicePillarHalfWidth ?? 60;
      const off = this.x - aiState.justicePillarX;
      if (Math.abs(off) < halfW) {
        // Leave along whichever edge is nearer, unless the target is on the far side —
        // then commit to crossing rather than dithering on the line.
        const targetSide = Math.sign(target.x - aiState.justicePillarX) || 1;
        const out = Math.abs(off) < halfW * 0.35 ? targetSide : Math.sign(off) || targetSide;
        body.setVelocityX(out * this.speed);
      }
    }

    // ── Depths: air, algae and the lure ──────────────────────────
    // Applied after movement, like the pillar, because it is a destination rather than a
    // nudge: a bot that is drowning has nothing to gain from strafing.
    if (aiState.depthsSeekPoint) {
      const seek = aiState.depthsSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Conquest: walking to a build site ────────────────────────
    // Same shape as the Depths seek above, and for the same reason: a bot that has decided
    // where its next barracks goes has nothing to gain from strafing on the way there.
    if (aiState.conquestSeekPoint) {
      const seek = aiState.conquestSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
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
    if (this.element.id === 'justice') {
      return this.doJusticeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'dream') {
      return this.doDreamAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'chalk') {
      return this.doChalkAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'magma') {
      return this.doMagmaAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'illusion') {
      return this.doIllusionAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'depths') {
      return this.doDepthsAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'conquest') {
      return this.doConquestAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'passion') {
      return this.doPassionAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'ruin') {
      return this.doRuinAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'glass') {
      return this.doGlassAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'paper') {
      return this.doPaperAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'death') {
      return this.doDeathAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'fortune') {
      return this.doFortuneAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'amber') {
      return this.doAmberAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'psychic') {
      return this.doPsychicAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'radiation') {
      return this.doRadiationAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'bind') {
      return this.doBindAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'gum') {
      return this.doGumAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    return null;
  }

  /**
   * Slime. The bot cannot use the passive — it has no cursor to drag itself along the floor with,
   * so GumKit lurches its walk instead — but every ability is genuinely available to it, and the
   * ordering below is really "keep ammunition on the floor and something sticky on the target".
   *
   * Gumball comes before everything except the ultimate because encasing the target is what makes
   * the rest of the kit work, and re-casting it on an already-gummed body buys nothing. Slime
   * Surge is kept topped up at range, since the bot's click *is* the ball throw whenever it is too
   * far away to punch — running dry turns its whole mid-range game off. Oozorbtion is held for the
   * moment it is actually being shot at rather than opened on cooldown, and Solidify is refused
   * outright at close quarters: three seconds of total paralysis next to somebody is a death
   * sentence, however many shards it throws on the way in.
   */
  private doGumAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // No hand: the kit refuses every cast, so there is nothing to press.
    if (aiState.npcGumHandless) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // The ultimate is a three-second paralysis, so it is only ever thrown from a safe distance —
    // and it is worth far more with slimeballs and a gummed body already on the field to harden.
    if (!skipSpecials && dist > 300 && ((aiState.npcGumBalls ?? 0) > 0 || aiState.npcGumTargetEncased)) {
      if (this.castAbility('gum-solidify', buildContext(aimX, aimY))) return 'gum-solidify';
    }

    // Gum first: everything else in the kit is worth more against an encased target.
    if (!skipSpecials && dist < 400 && !aiState.npcGumTargetEncased) {
      if (this.castAbility('gum-gumball', buildContext(aimX, aimY))) return 'gum-gumball';
    }

    // Open up while there is still range to be shot across — swallowing a shot is worth more
    // than swallowing a punch, and the swelling makes it an easier target either way.
    if (!skipSpecials && dist > 220 && !aiState.npcGumAbsorbArmed && hpRatio < 0.8) {
      if (this.castAbility('gum-oozorbtion', buildContext(aimX, aimY))) return 'gum-oozorbtion';
    }

    // Ammunition. Out of punching range the click is the throw, so an empty floor is a mute bot.
    if ((aiState.npcGumBalls ?? 0) < 2) {
      if (this.castAbility('gum-surge', buildContext(aimX, aimY))) return 'gum-surge';
    }

    // The click: a punch up close, a hurled slimeball otherwise. GumKit decides which.
    if (dist < 520) {
      if (this.castAbility('gum-grab', buildContext(aimX, aimY))) return 'gum-grab';
    }
    return null;
  }

  /**
   * Radiation. The bot is running the same two procedures the player is, and the ordering below
   * is really "do not break the chain" rather than a rotation.
   *
   * Three rules keep it honest. While the flare gun is out it does nothing but shoot flares, and
   * only at close range — five rounds into one body is the entire ultimate, and a flare thrown at
   * a target it might lose is the ultimate thrown away. It refuses to fire tracers past the range
   * where a miss is likely, because a miss scrubs every tracer it has already planted and the
   * click is otherwise free. And it saves the baton for a target that is *already* dosed, where
   * the ability is a 1.5-second stun rather than 15 damage.
   */
  private doRadiationAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    // Mid-drum or mid-fall the kit owns the body; anything pressed now is thrown away.
    if (aiState.npcRadiationBusy) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // The flare gun overrides everything. Nothing else is worth a button while it is out.
    if (aiState.npcRadiationFlares) {
      if (dist < 460 && this.castAbility('radiation-railgun', buildContext(aimX, aimY))) {
        return 'radiation-railgun';
      }
      return null;
    }

    // The ultimate is only worth drawing where five rounds can actually be placed.
    if (!skipSpecials && dist < 380) {
      if (this.castAbility('radiation-extermination', buildContext(aimX, aimY))) {
        return 'radiation-extermination';
      }
    }

    // Sight before the shot: eight seconds of fatter hitboxes is eight seconds of not missing,
    // and a miss is the only thing that can undo the tracers it is about to plant.
    if (!skipSpecials && dist < 520) {
      if (this.castAbility('radiation-xray', buildContext(aimX, aimY))) return 'radiation-xray';
    }

    // The drum wants a target close enough for the blast and the puddles to both matter.
    if (!skipSpecials && dist < 300) {
      if (this.castAbility('radiation-waste', buildContext(aimX, aimY))) return 'radiation-waste';
    }

    // The baton is the finisher, not the opener — held until a dose is already on them.
    if (dist < 150 && aiState.npcRadiationTargetDosed) {
      if (this.castAbility('radiation-baton', buildContext(aimX, aimY))) return 'radiation-baton';
    }

    // The engine. Held inside the range where the tracer will actually arrive, because the whole
    // chain this bot is building dies on one stray click.
    const safeRange = (aiState.npcRadiationTracers ?? 0) > 0 ? 420 : 620;
    if (dist < safeRange) {
      if (this.castAbility('radiation-railgun', buildContext(aimX, aimY))) return 'radiation-railgun';
    }
    return null;
  }

  /**
   * Bind. The bot is managing somebody else's temper, so every branch here is really a question
   * about the anger bar rather than about the fight.
   *
   * Once the patron has turned there is nothing to press at all — the kit refuses every cast for
   * those five seconds — so the bot spends them moving. Below that, it treats 70 anger as a hard
   * ceiling: no barrage, no idol and no beam past two-thirds heat, because every one of those is
   * a bill and the punishment costs far more than any of them buys. The beam is released at 0.72
   * heat rather than run to the top, which is exactly the decision a good player makes with it.
   */
  private doBindAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Forsaken: the god is busy with its own summoner and answers nothing.
    if (aiState.npcBindForsaken) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const anger = aiState.npcBindAnger ?? 0;
    const heat = aiState.npcBindHeat ?? 0;
    const calm = anger < 70;

    // The ultimate is free of anger entirely — it is paid for in abilities — so it goes first.
    if (!skipSpecials && dist < 620) {
      if (this.castAbility('bind-treachery', buildContext(aimX, aimY))) return 'bind-treachery';
    }

    // The ward is worth its anger only when there is something left to protect.
    if (!skipSpecials && hpRatio < 0.55 && (aiState.npcBindWard ?? 0) === 0 && anger < 85) {
      if (this.castAbility('bind-protection', buildContext(aimX, aimY))) return 'bind-protection';
    }

    // An idol is a turret while it is standing on top of you and a bill the moment it is not,
    // so the bot only ever plants one at its own feet — and only while it can afford to be wrong.
    if (!skipSpecials && calm && (aiState.npcBindIdolFaith ?? -1) < 0 && dist < 420) {
      if (this.castAbility('bind-idol', buildContext(this.x, this.y))) return 'bind-idol';
    }

    if (!skipSpecials && calm && dist < 560) {
      if (this.castAbility('bind-shards', buildContext(aimX, aimY))) return 'bind-shards';
    }

    // The beam, released well before the top of the bar. Overheating costs 20 anger, and 20
    // anger is a quarter of the way to being attacked by its own god.
    if (!aiState.npcBindOverheated && heat < 0.72 && (calm || heat < 0.4)) {
      if (this.castAbility('bind-summon', buildContext(aimX, aimY))) return 'bind-summon';
    }
    return null;
  }

  /**
   * Psychic. The bot is playing the same information game the player is: it can see the queue
   * over the target's head, so the ordering below is really "is something coming, and is it
   * worth answering" rather than a rotation.
   *
   * Two rules keep it honest. It only reaches for Mind Control when the thing at the front of
   * the queue is an ultimate — everything smaller is worth eating, and a seized click is five
   * seconds spent on twelve damage. And it only cashes the Q in once the pool is worth at least
   * three seconds of coma, because the ability is a payout rather than an opener: the coma is
   * where the next pool comes from, and a two-point detonation buys none of it.
   *
   * The whip is the fallback and the engine. Everything else in the element exists to make room
   * for more of it.
   */
  private doPsychicAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const queued = aiState.npcPsychicQueue ?? 0;
    const stress = aiState.npcPsychicStress ?? 0;

    // The payout. Three seconds under is the floor worth 30 seconds of cooldown.
    if (stress >= COMA_WORTH_IT) {
      if (this.castAbility('psychic-coma', buildContext(aimX, aimY))) return 'psychic-coma';
    }

    // Something big is two seconds out. Steal it rather than trying to walk out from under it.
    if (!skipSpecials && queued > 0 && aiState.npcPsychicBigCast) {
      if (this.castAbility('psychic-mind-control', buildContext(aimX, aimY))) return 'psychic-mind-control';
    }

    // Anything else in the queue is answered by simply not being there when it lands. Held back
    // while healthy, because 1.25 seconds spent invincible at full HP is 1.25 seconds not whipping.
    if (queued > 0 && hpRatio < 0.8) {
      if (this.castAbility('psychic-dodge-destiny', buildContext(aimX, aimY))) return 'psychic-dodge-destiny';
    }

    // Free stress and a defensive in one. Only worth it in range, where their misses matter.
    if (!skipSpecials && dist < 480) {
      if (this.castAbility('psychic-migraine', buildContext(aimX, aimY))) return 'psychic-migraine';
    }

    // The engine. Aimed slightly long so the tip does the work whenever the range allows it.
    if (dist < 210) {
      const reach = Math.max(dist, 170);
      const ang = Math.atan2(aimY - this.y, aimX - this.x);
      const tx = this.x + Math.cos(ang) * reach;
      const ty = this.y + Math.sin(ang) * reach;
      if (this.castAbility('psychic-headache', buildContext(tx, ty))) return 'psychic-headache';
    }
    return null;
  }

  /**
   * Fortune. The bot is playing an economy, so the ordering below is a spending policy rather
   * than a rotation: the beam is by far the best thing it can buy with coins, the two
   * investments are how it turns a lull into more coins, and the trigger is the only thing that
   * mints any in the first place.
   *
   * The one rule that matters is that it never invests itself broke. Coins are ammunition for Q
   * and price the golden pistol, so anything it locks away is damage it cannot deal — it only
   * banks a surplus, and only while it is not already sitting on a beam it could open.
   *
   * The kit does its own shopping on a timer (`botStock`), so nothing here has to reason about
   * a catalogue the AI cannot see.
   */
  private doFortuneAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    // The kit is steering the beam and refuses every other key while it is open.
    if (aiState.npcFortuneBeaming) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const coins = aiState.npcFortuneCoins ?? 0;

    // The single biggest thing the purse can buy. Opened at a range the slow turn can actually
    // walk onto a body — point blank it would sweep past them, and across the arena it would
    // spend its whole budget on empty floor.
    if (coins >= 14 && dist < 420 && dist > 70) {
      if (this.castAbility('fortune-p2w', buildContext(aimX, aimY))) return 'fortune-p2w';
    }

    // Turnstiles across their approach. Worth it whenever they have coins to lose, and worth it
    // anyway as a wall of noise between the two of you.
    if (!skipSpecials && !aiState.npcFortuneWall && dist > 140) {
      // Dropped between the two of you rather than on top of them, which is what makes it a toll
      // booth instead of a decoration.
      const wx = (this.x + aimX) / 2;
      if (this.castAbility('fortune-paywall', buildContext(wx, aimY))) return 'fortune-paywall';
    }

    // Surplus only. Ten coins is a beam and a bit, so anything past that can go to work.
    if (!skipSpecials && coins > 12) {
      if (Math.random() < 0.5) {
        if (this.castAbility('fortune-safe', buildContext(aimX, aimY))) return 'fortune-safe';
      } else if (this.castAbility('fortune-risky', buildContext(aimX, aimY))) return 'fortune-risky';
    }

    // The trigger. Refused outright while the magazine is empty, because a refused cast still
    // stamps (and voices) its cooldown.
    if ((aiState.npcFortuneAmmo ?? 0) > 0 && dist < 720) {
      if (this.castAbility('fortune-fire', buildContext(aimX, aimY))) return 'fortune-fire';
    }
    return null;
  }

  /**
   * Amber. Four of the five are animals, and the tyrannosaur locks the other three out entirely
   * — so the branch order is really "is the big one out, and if not, is this the moment to spend
   * it". Everything else is a range question: the stampede is a lane the bot has to be standing
   * in, the meat wants to land where the target already is, and the swarm is the only thing that
   * is never a bad idea.
   *
   * The sling is not cast here. It is a hold-and-swing, so the AI opens the swing through the
   * kit (`npcBeginSwing`) and this method only decides when to let go — a full wind-up is worth
   * nearly three pebbles, so it waits unless the target is about to leave.
   */
  private doAmberAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    // In something's jaws. Nothing it presses will resolve.
    if (aiState.npcAmberHeld) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const rexOut = !!aiState.npcAmberRex;

    // ── The sling ──
    // Released at full charge, or early if the target has already walked out of throwing range.
    if (aiState.npcAmberSwinging) {
      const charge = aiState.npcAmberCharge ?? 0;
      if (charge >= 0.98 || dist > 520) {
        if (this.castAbility('amber-sling', buildContext(aimX, aimY))) return 'amber-sling';
      }
      return null;
    }

    if (!rexOut && dist < 340) {
      if (this.castAbility('amber-trex', buildContext(aimX, aimY))) return 'amber-trex';
    }

    // The lane is locked in where the bot is standing, so it is only worth casting when the
    // target is already sharing that band — otherwise it charges through empty floor.
    if (!skipSpecials && !rexOut && Math.abs(aimY - this.y) < 70) {
      if (this.castAbility('amber-stampede', buildContext(aimX, aimY))) return 'amber-stampede';
    }

    // Meat, thrown where they are. A standing target gets it stuck to them, which is the whole
    // upside — so the bot prefers to throw it at somebody who has stopped.
    if (!skipSpecials && !rexOut && dist < 480) {
      if (this.castAbility('amber-hunt', buildContext(aimX, aimY))) return 'amber-hunt';
    }

    if ((aiState.npcAmberSwarm ?? 0) < 2) {
      if (this.castAbility('amber-mosquitoes', buildContext(aimX, aimY))) return 'amber-mosquitoes';
    }
    return null;
  }

  /**
   * Death. Three of its five deal no damage at all, so there is no "burst window" to build
   * toward — the bot is not trying to kill anybody, it is trying to still be standing when the
   * clock runs out. Every branch below is therefore a delaying tactic, ordered by how much time
   * it buys: the Deal is worth ten seconds off the minute outright, Hospice doubles everything
   * that follows it, Disarm buys three seconds of the target doing nothing, and the brand is
   * the thing that makes all of that survivable.
   *
   * Riposte is the only one gated on range going the *other* way — it is worth nothing in
   * somebody's face and everything at the range they are shooting from.
   */
  private doDeathAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    // Shaking hands. The kit refuses every key until it lets go, and a refused cast still
    // stamps its cooldown — see `castAbility`.
    if (aiState.npcDeathBusy) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // The only cast in the kit that moves the clock, and the ten seconds it asks for are ten
    // seconds of being 33% faster and dodging a third of everything — so it is never a bad time.
    if (!aiState.npcDeathDealing) {
      if (this.castAbility('death-deal', buildContext(aimX, aimY))) return 'death-deal';
    }

    // Doubling everything that lands for the next fifteen seconds is worth more than any one
    // thing landing, so it goes up before the brand rather than after it.
    if (!skipSpecials && !aiState.npcDeathHospiceOut && dist < 620) {
      if (this.castAbility('death-hospice', buildContext(aimX, aimY))) return 'death-hospice';
    }

    // A cleave, not a poke: it only exists inside its own arc.
    if (!skipSpecials && dist < 120) {
      if (this.castAbility('death-disarm', buildContext(aimX, aimY))) return 'death-disarm';
    }

    // Holding a blade out at somebody standing next to you cuts nothing — the ability is for
    // the range they are shooting from.
    if (!skipSpecials && !aiState.npcDeathGuarding && dist > 210) {
      if (this.castAbility('death-riposte', buildContext(aimX, aimY))) return 'death-riposte';
    }

    if ((aiState.npcDeathTargetStyx ?? 0) < 3 && dist < 660) {
      if (this.castAbility('death-styx', buildContext(aimX, aimY))) return 'death-styx';
    }
    return null;
  }

  /**
   * Paper. The unusual thing here is that two of its five keys are three different abilities
   * wearing one id, so the click and the Q both have to branch on whichever book the kit says is
   * open before they can decide whether casting is even a good idea.
   *
   * The bot does not cycle books tactically — PaperKit turns the page for it on a timer, which
   * keeps the fight varied without the AI having to reason about a resource it cannot see. What
   * it does reason about is range, and it does it per book: Excalibur wants to be thrown at a
   * body it can bend toward, the laser wants a clear line and hates being interrupted mid-burst,
   * and the spike wants to connect at all because two thirds of its damage is the follow-ups.
   */
  private doPaperAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Mid-glide the kit is flying the body; casting off it would fight the kit for control.
    if (aiState.npcPaperRiding) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const book = aiState.npcPaperBook ?? 0;

    // The Climax, spent on whichever book's terms make sense. The charge wants the target out in
    // the open, the bombardment wants them anywhere at all, and the spirit is worth casting early
    // because its eight seconds are the ability rather than its damage.
    if (!skipSpecials) {
      const climaxNow = book === 0 ? dist > 120
        : book === 1 ? true
          : hpRatio < 0.85;
      if (climaxNow && this.castAbility('paper-climax', buildContext(aimX, aimY))) return 'paper-climax';
    }

    // Monsters, but only when there is a field worth having. Cast low as a panic zoning tool too:
    // six mines between you and a pursuer is the cheapest disengage in the kit.
    if (!skipSpecials && (aiState.npcPaperMaches ?? 0) < 2 && (dist < 260 || hpRatio < 0.5)) {
      if (this.castAbility('paper-mache', buildContext(aimX, aimY))) return 'paper-mache';
    }

    // The shuriken is a straight line, so it wants a gap to cross — and the bleed is worth most
    // against a target that still has health left for 2% of it to mean something.
    if (!skipSpecials && dist > 150 && dist < 620) {
      if (this.castAbility('paper-shuriken', buildContext(aimX, aimY))) return 'paper-shuriken';
    }

    // E is thrown at mid range for the 10 and ridden at long range to close — the kit reads which
    // one was meant off the distance, so there is nothing more to decide here.
    if (!skipSpecials && dist > 200) {
      if (this.castAbility('paper-plane', buildContext(aimX, aimY))) return 'paper-plane';
    }

    // The click, per book. The Alien branch is the only one that has to check anything: its two
    // clocks are invisible from out here, and clicking into them is a wasted cooldown.
    const clickNow = book === 0 ? dist < 520
      : book === 1 ? !aiState.npcPaperLaserBusy && dist < 700
        : dist < 460;
    if (clickNow && this.castAbility('paper-storybook', buildContext(aimX, aimY))) return 'paper-storybook';
    return null;
  }

  /**
   * Glass. The orbit does the damage, so every branch below is really asking the same question:
   * how do I get the ring onto them and keep it there. Twirl is the approach, the held click is
   * the reach, and E is the only thing here that gives the ring *up* — which is why it is gated
   * on the target being far enough away that the shards have somewhere useful to go.
   *
   * Temper is checked before anything else that isn't the ultimate: the passive is a permanent
   * 25% vulnerability, so five seconds of it running backwards is worth more to a Glass bot
   * than any single cast it could spend the time on instead.
   */
  private doGlassAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // In pieces: there is no body to cast from, and the kit is flying it home on its own.
    if (aiState.npcGlassBodyGone) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // The escape *and* the biggest burst in the kit. Spent low, or spent point-blank where the
    // fifteen shards can't miss — both are the same cast, which is what makes it good.
    if (hpRatio < 0.4 || dist < 130) {
      if (this.castAbility('glass-blow', buildContext(aimX, aimY))) return 'glass-blow';
    }

    if (!skipSpecials && !aiState.npcGlassTempered && dist < 340) {
      if (this.castAbility('glass-temper', buildContext(aimX, aimY))) return 'glass-temper';
    }

    // Twirl closes the gap *and* triples the ring's rate on the way in, so it is worth casting
    // at any range where there is actually ground to cover.
    if (!skipSpecials && !aiState.npcGlassTwirling && dist > 150) {
      if (this.castAbility('glass-twirl', buildContext(aimX, aimY))) return 'glass-twirl';
    }

    // Throwing the ring away doubles the vulnerability, so it only pays at a range where the
    // orbit was doing nothing anyway.
    if (!skipSpecials && aiState.npcGlassHasShards && dist > 200 && dist < 560) {
      if (this.castAbility('glass-splinter', buildContext(aimX, aimY))) return 'glass-splinter';
    }

    // Close in, push the ring out — that is the whole click, and the kit reads the intent for
    // nearly two seconds off one cast.
    if (dist < 190) {
      if (this.castAbility('glass-orbit', buildContext(aimX, aimY))) return 'glass-orbit';
    }
    return null;
  }

  /**
   * Ruin. Four of its five are refused outright by the kit under conditions the AI can't see
   * from here — a ring already down, a skewer already in the air, a target that has never cast
   * anything, the rot at its cap — so every branch below is gated on the matching `aiState`
   * flag rather than on a range check alone. A refused cast is not free: `castAbility` has
   * already stamped the cooldown by the time the kit gets to say no.
   *
   * The ordering is the element's own priority. The rot is permanent and therefore always
   * worth its fifteen seconds; the ring only pays inside its own radius, since it follows the
   * caster and takes two seconds to go off; the lock is worth more the longer the fight has
   * run, because there is more worth locking.
   */
  private doRuinAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Permanent, stacking and never wasted — the first thing off cooldown every time.
    if ((aiState.npcRuinDecayStacks ?? 0) < 10) {
      if (this.castAbility('ruin-decay', buildContext(aimX, aimY))) return 'ruin-decay';
    }

    // The ring is worn rather than thrown, so it only ever pays when the target is already
    // close enough that walking out of 122px in two seconds is a real decision.
    if (!skipSpecials && !aiState.npcRuinRingUp && dist < 170) {
      if (this.castAbility('ruin-spikes', buildContext(aimX, aimY))) return 'ruin-spikes';
    }

    // The skewer needs room to reach a wall with somebody on it — point blank it beaches
    // itself immediately and the ride is over before it starts.
    if (!skipSpecials && !aiState.npcRuinSkewerOut && dist > 90 && dist < 520) {
      if (this.castAbility('ruin-skewer', buildContext(aimX, aimY))) return 'ruin-skewer';
    }

    if (!skipSpecials && aiState.npcRuinCanLock && dist < 440) {
      if (this.castAbility('ruin-lockdown', buildContext(aimX, aimY))) return 'ruin-lockdown';
    }

    if (this.castAbility('ruin-shred', buildContext(aimX, aimY))) return 'ruin-shred';
    return null;
  }

  /**
   * Passion. Only one of its five abilities deals damage, so the usual "am I winning the trade"
   * questions don't apply — every branch below is asking the same thing instead, which is
   * whether the target's love bar is far enough along for the next tool to be worth its
   * cooldown. Smooch in particular is refused outright below half a bar, because the kiss
   * simply doesn't land there and casting it would throw eight seconds away.
   */
  private doPassionAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    // The pose is a five-second commitment and the kit is already collecting on it.
    if (aiState.npcPassionPosing) return null;
    const love = aiState.npcPassionTargetLove ?? 0;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Exhibition wants them close enough that walking out of the cone isn't free, and is worth
    // most while there is still bar left to fill.
    if (!skipSpecials && dist < 460 && love < 0.9) {
      if (this.castAbility('passion-exhibition', buildContext(aimX, aimY))) return 'passion-exhibition';
    }

    // The kiss is the biggest single jump in the kit, but only past the halfway gate.
    if (!skipSpecials && love >= 0.5 && dist < 300) {
      if (this.castAbility('passion-smooch', buildContext(aimX, aimY))) return 'passion-smooch';
    }

    // Flirt is pure meter and pays more the further along they already are — spend it on cooldown
    // whenever they are actually inside the cone's reach.
    if (!skipSpecials && dist < 190) {
      if (this.castAbility('passion-flirt', buildContext(aimX, aimY))) return 'passion-flirt';
    }

    // The rose is armour first and a projectile second, so it goes out early and the kit
    // decides when to throw it.
    if (!skipSpecials && !aiState.npcPassionHasRose) {
      if (this.castAbility('passion-manipulate', buildContext(aimX, aimY))) return 'passion-manipulate';
    }

    if (this.castAbility('passion-loveshot', buildContext(aimX, aimY))) return 'passion-loveshot';
    return null;
  }

  /**
   * Conquest. Almost none of the element's decision-making is here — ConquestKit runs the whole
   * economy, chooses what to build and where, buys its own upgrade paths and marches its own
   * soldiers, because all of that is board state the AI routine has no view of.
   *
   * What is left is the two things only `castAbility` can do: convert an arrived-at build site
   * into an actual placement, and throw the pike the rest of the time. `npcConquestReady` is
   * already the kit's answer to "is this legal right now", so nothing here re-checks cost or
   * ownership — a refusal at this point would burn the cooldown for nothing.
   */
  private doConquestAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;

    // The build it walked across the board for outranks everything: the square is only free
    // for as long as nobody else stands on it.
    const ready = aiState.npcConquestReady;
    if (ready) {
      const id = ready === 'expansion' ? 'conquest-expansion' : `conquest-${ready}`;
      if (this.castAbility(id, buildContext(aimX, aimY))) return id;
    }

    // The pike is the only thing left, and it is a poke — there is no reason to hold it, but
    // also no reason to swing it at nothing.
    if (dist < 300) {
      if (this.castAbility('conquest-banner', buildContext(aimX, aimY))) return 'conquest-banner';
    }
    return null;
  }

  /**
   * Depths. Two of its five abilities want the AI to *stop*, which no other element asks for:
   * Angler only progresses while the body is still, and the passive only pays out once the
   * fade has finished. Both are handled inside DepthsKit — this routine's job is to not throw
   * them away, which is why every branch below bails while the line is out.
   *
   * The rest is ordinary: the shark opens, the strike starts the drowning clock, the bloom is
   * spent when it is actually worth HP, and the piranha is the filler until the target already
   * has its five.
   */
  private doDepthsAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Fishing is a three-second commitment; casting anything else would be spending the
    // stillness it is paying for on nothing.
    if (aiState.npcDepthsFishing) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Drowning outranks everything — the movement pass is already sprinting for the puddle,
    // and the only thing worth doing on the way is chewing.
    if (aiState.npcDepthsDrowning) {
      if ((aiState.npcDepthsTargetLatches ?? 0) < 5
        && this.castAbility('depths-piranha', buildContext(aimX, aimY))) return 'depths-piranha';
      return null;
    }

    // The shark is an opener when the target is out in the open, and an answer when it isn't.
    if (!aiState.npcDepthsSharkOut && !skipSpecials && dist < 560 && (hpRatio < 0.7 || dist > 200)) {
      if (this.castAbility('depths-megalodon', buildContext(aimX, aimY))) return 'depths-megalodon';
    }

    // The whole ability now rides on the slash connecting, so this has to be inside the
    // blade's actual reach (96px of dash plus the dash's own travel) rather than "nearby" —
    // a whiff costs sixteen seconds and starts nothing.
    if (!skipSpecials && dist < 120) {
      if (this.castAbility('depths-lungfish', buildContext(aimX, aimY))) return 'depths-lungfish';
    }

    // The bloom heals both sides, so it is only ever worth casting from behind.
    if (!skipSpecials && hpRatio < 0.65) {
      if (this.castAbility('depths-eutrophication', buildContext(aimX, aimY))) return 'depths-eutrophication';
    }

    // Fishing is only affordable out of reach — three seconds standing still inside 250px is
    // a gift. The kit freezes the body and throws the catch on its own.
    if (!aiState.npcDepthsHasFish && !skipSpecials && dist > 280 && hpRatio > 0.4) {
      if (this.castAbility('depths-angler', buildContext(aimX, aimY))) return 'depths-angler';
    }

    if ((aiState.npcDepthsTargetLatches ?? 0) < 5) {
      if (this.castAbility('depths-piranha', buildContext(aimX, aimY))) return 'depths-piranha';
    }
    return null;
  }

  /**
   * Illusion. The element has almost no sustained damage, so the AI's job is to keep the two
   * things that *do* pay — the bullet and the crack it leaves — landing while it is somewhere
   * the player isn't. Relocate is therefore spent as an escape rather than an opener, and the
   * Tesseract is held for a target that isn't already folded, since a second fold buys nothing
   * but the twenty damage.
   */
  private doIllusionAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Twenty seconds of bullets passing through is the answer to being caught, so it is
    // spent on being caught — and while it runs, everything else is just the click.
    if (!aiState.npcIllusionDancing && !skipSpecials && (hpRatio < 0.45 || dist < 140)) {
      if (this.castAbility('illusion-dance', buildContext(aimX, aimY))) return 'illusion-dance';
    }

    // Relocate is an escape hatch. Mid-dance it is redundant — the dance hops on its own.
    if (!aiState.npcIllusionDancing && !skipSpecials && dist < 170 && hpRatio < 0.8) {
      if (this.castAbility('illusion-relocate', buildContext(aimX, aimY))) return 'illusion-relocate';
    }

    // The pane goes up between us, and it is worth most when there is a gap for a shot to
    // cross before it arrives.
    if (!skipSpecials && !aiState.npcIllusionHasVeil && dist > 170) {
      if (this.castAbility('illusion-veil', buildContext(aimX, aimY))) return 'illusion-veil';
    }

    // The cube is slow, so it wants a target that is neither too far to reach nor already
    // wearing the shape it would apply.
    if (!skipSpecials && !aiState.npcIllusionTargetFolded && dist < 430) {
      if (this.castAbility('illusion-tesseract', buildContext(aimX, aimY))) return 'illusion-tesseract';
    }

    // The bullet is the filler — and at range a miss still cracks off the wall for half.
    if (this.castAbility('illusion-crack-shot', buildContext(aimX, aimY))) return 'illusion-crack-shot';
    return null;
  }

  /**
   * Magma. The element's whole economy is that its own summons are charged by its own attacks,
   * so this AI has a second aim point: `npcMagmaChargeTarget`. Whenever there is a vessel with
   * room left in it, the cheap abilities fire at *that* instead of at the player, which is how
   * a volcano ever reaches 100 or an egg ever hatches. Everything expensive still goes at the
   * player, and once the egg pays out the whole thing flips to pure offence for twenty seconds.
   */
  private doMagmaAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const charge = aiState.npcMagmaChargeTarget;
    const dragon = !!aiState.npcMagmaDragon;

    // Hatched: no more investing, just breathing on people.
    if (dragon) {
      if (dist < 240 && this.castAbility('magma-plume', buildContext(aimX, aimY))) return 'magma-plume';
      return null;
    }

    // The egg is the long game and only worth starting when there is time to pay for it.
    if (!skipSpecials && !aiState.npcMagmaHasEgg && hpRatio > 0.5) {
      if (this.castAbility('magma-dragon-kin', buildContext(this.x, this.y))) return 'magma-dragon-kin';
    }

    // A free block is worth having up before it is needed, not after.
    if (!skipSpecials && !aiState.npcMagmaBloat && (dist < 300 || hpRatio < 0.7)) {
      if (this.castAbility('magma-bloat', buildContext(aimX, aimY))) return 'magma-bloat';
    }

    // Volcanoes go between us: close enough to the player that the lava is in the way, close
    // enough to the AI that its own plumes and its own fist can still reach up and charge it.
    if (!skipSpecials && (aiState.npcMagmaVolcanoes ?? 0) < 2) {
      const toX = aimX - this.x;
      const toY = aimY - this.y;
      const len = Math.hypot(toX, toY) || 1;
      const reach = Math.min(110, len * 0.5);
      const vx = this.x + (toX / len) * reach + (Math.random() - 0.5) * 50;
      const vy = this.y + (toY / len) * reach + (Math.random() - 0.5) * 50;
      if (this.castAbility('magma-volcano', buildContext(vx, vy))) return 'magma-volcano';
    }

    // The fist is the fastest way to fill a vessel, and a decent melee tool when there is
    // nothing to fill. Either way it wants to be out.
    if (!skipSpecials && !aiState.npcMagmaFist && (charge || dist < 300)) {
      if (this.castAbility('magma-fist', buildContext(aimX, aimY))) return 'magma-fist';
    }

    // Plume: at the vessel if there is one with room in it, otherwise at the player.
    const px = charge ? charge.x : aimX;
    const py = charge ? charge.y : aimY;
    if (charge || dist < 380) {
      if (this.castAbility('magma-plume', buildContext(px, py))) return 'magma-plume';
    }
    return null;
  }

  /**
   * Chalk. Only one drawing window can be open at a time and opening a second throws away
   * whatever the first had drawn, so every decision here is gated on `npcChalkDrawing` —
   * the AI commits to a stroke and lets it finish. Beyond that the order is simply cost:
   * the ward is free and constant, the fuse is worth laying at range, the blue line goes
   * down once and stays, and the shield and the Masterpiece are held for trouble.
   */
  private doChalkAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Mid-stroke: hands are busy. The kit is already driving the phantom cursor.
    if (aiState.npcChalkDrawing || aiState.npcChalkMasterpiece) return null;

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Eight seconds of untouchable is the answer to losing, so it is spent on losing.
    if (!skipSpecials && hpRatio < 0.4) {
      if (this.castAbility('chalk-masterpiece', buildContext(aimX, aimY))) return 'chalk-masterpiece';
    }

    // The shield is worth having up whenever something is close enough to be stopped by it.
    if (!skipSpecials && (aiState.npcChalkShieldHp ?? 0) <= 0 && (dist < 260 || hpRatio < 0.65)) {
      if (this.castAbility('chalk-shield', buildContext(aimX, aimY))) return 'chalk-shield';
    }

    // The blue line is drawn between us, so closing the gap means walking over it.
    if (!skipSpecials && aiState.npcChalkMayPerma) {
      if (this.castAbility('chalk-perma', buildContext(aimX, aimY))) return 'chalk-perma';
    }

    // The fuse needs the three seconds it takes to draw and burn, so it wants distance.
    if (!skipSpecials && dist > 150) {
      if (this.castAbility('chalk-explosive', buildContext(aimX, aimY))) return 'chalk-explosive';
    }

    // The ward is the filler: short, cheap, and scribbled straight onto their feet.
    if (dist < 420) {
      if (this.castAbility('chalk-ward', buildContext(aimX, aimY))) return 'chalk-ward';
    }
    return null;
  }

  /**
   * Dream. Everything the element does is worth more against a sleepy target, so the whole
   * decision is "how far along is the meter": keep the pendulum up at all times, seed a
   * nightmare early, put catchers down once sleep is actually on the table, and save the
   * pillow for the moment it is worth seventy rather than ten.
   */
  private doDreamAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const drowsy = aiState.npcDreamTargetDrowsy ?? 0;
    const asleep = !!aiState.npcDreamTargetAsleep;

    // The pendulum is the element. It goes up once and stays up.
    if (!aiState.npcDreamTrance) {
      if (this.castAbility('dream-trance', buildContext(aimX, aimY))) return 'dream-trance';
    }

    // Break off and heal once the fight has gone badly — the doorway opens behind us, so
    // this is also the only disengage the element has.
    if (!skipSpecials && hpRatio < 0.35) {
      if (this.castAbility('dream-oasis', buildContext(aimX, aimY))) return 'dream-oasis';
    }

    // A nightmare on a sleeper is free damage that will not wake them, so it goes on early.
    if (!skipSpecials && (asleep || drowsy > 30) && dist < 420) {
      if (this.castAbility('dream-nightmare', buildContext(aimX, aimY))) return 'dream-nightmare';
    }

    // Catchers only pay once something is actually going to sleep near them.
    if (!skipSpecials && (asleep || drowsy > 55) && aiState.npcDreamMayCatch) {
      if (this.castAbility('dream-dreamcatcher', buildContext(aimX, aimY))) return 'dream-dreamcatcher';
    }

    // The pillow wakes whatever it hits, so it is held back until it is worth the wake-up.
    const worthIt = asleep || drowsy > 45;
    if (dist < 95 && (worthIt || drowsy < 5)) {
      if (this.castAbility('dream-pillow-fight', buildContext(aimX, aimY))) return 'dream-pillow-fight';
    }
    return null;
  }

  /**
   * Justice. Two stances, so the first decision every tick is which one to be in: the
   * ground set is the bread and butter, and flight is taken when there is Willpower to
   * spare and something worth doing from the air.
   */
  private doJusticeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const will = aiState.npcJusticeWill ?? 100;
    const flying = !!aiState.npcJusticeFlying;

    // ── Stance ──
    if (!skipSpecials && time > this.justiceNextStanceAt) {
      // Up when there is fuel and range to use it; down when the tank is low or the
      // fight has closed to spear distance.
      const wantFlight = will > 55 && dist > 220;
      if (wantFlight && !flying && this.castAbility('justice-flight', buildContext(aimX, aimY))) {
        this.justiceNextStanceAt = time + 4000;
        return 'justice-flight';
      }
      if (!wantFlight && flying && (will < 25 || dist < 160)) {
        if (this.castAbility('justice-descend', buildContext(aimX, aimY))) {
          this.justiceNextStanceAt = time + 4000;
          return 'justice-descend';
        }
      }
    }

    if (flying) {
      // A chain already hooked in wants pulling — the wall is the whole payoff.
      if (aiState.npcJusticeAnchored) {
        if (this.castAbility('justice-bind', buildContext(aimX, aimY))) return 'justice-bind';
      }
      if (!skipSpecials && this.castAbility('justice-seraphim', buildContext(aimX, aimY))) {
        return 'justice-seraphim';
      }
      // Drop the pillar between us and them, so they have to walk through it.
      if (!skipSpecials && dist > 200 && this.castAbility('justice-pillar', buildContext((this.x + aimX) / 2, aimY))) {
        return 'justice-pillar';
      }
      if (!skipSpecials && this.castAbility('justice-bind', buildContext(aimX, aimY))) return 'justice-bind';
      if (this.castAbility('justice-spear-throw', buildContext(aimX, aimY))) return 'justice-spear-throw';
      return null;
    }

    // ── Ground ──
    // Judgement Day is the closer: it only bites once they have actually hurt you.
    if (!skipSpecials && this.rawDamageTaken >= 100 && dist < 380) {
      if (this.castAbility('justice-judgement-day', buildContext(aimX, aimY))) return 'justice-judgement-day';
    }
    // Sheer Will while there is Willpower and the fight has actually started going badly.
    if (!skipSpecials && !aiState.npcJusticeSheer && will > 45 && (hpRatio < 0.8 || dist < 260)) {
      if (this.castAbility('justice-sheer-will', buildContext(aimX, aimY))) return 'justice-sheer-will';
    }
    // Coliseum: only worth raising when they are inside it with you.
    if (!skipSpecials && dist < 130) {
      if (this.castAbility('justice-coliseum', buildContext(aimX, aimY))) return 'justice-coliseum';
    }
    if (dist < 200 && this.castAbility('justice-stab', buildContext(aimX, aimY))) return 'justice-stab';
    return null;
  }

  /** Justice: the AI is not allowed to flicker between stances. */
  private justiceNextStanceAt = 0;

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
