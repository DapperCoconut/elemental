import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { CustomStatus } from './StatusHudKit';
import {
  ArmGesture, RUBBER, RubberAura, RubberAuraStyle, RubberAvatar, RubberColorFn, RubberFx,
} from './RubberVisuals';
import { meterGain } from '../../combat/Meters';

// ── Constants ─────────────────────────────────────────────────────────────────

const PUNCH_MAX_HOLD_MS = 1500;
const PUNCH_MAX_PULL = 72;
const PUNCH_MIN_DMG = 8;
const PUNCH_MAX_DMG = 35;
const PUNCH_REACH = 130;       // max melee reach in pixels
const PUNCH_STRETCH_MS = 130;  // time to fully extend
const PUNCH_HOLD_ANIM_MS = 60; // hold at full extension
const PUNCH_SNAP_MS = 100;     // retract time
const PUNCH_FIST_RADIUS = 40;  // hit detection radius from fist tip

const SLING_MAX_PULL = 130;
const SLING_MIN_PULL_TO_FIRE = 20; // below this, releasing just lets the band go slack instead of launching
const SLING_MIN_SPEED = 400;
const SLING_MAX_SPEED = 860;
const SLING_CONTACT_DMG = 28;
const SLING_FLY_MS = 650; // NPC's simplified dash-attack contact window — unrelated to the player's wall launch below
const SLING_LAUNCH_MAX_MS = 3000; // Player launch: hard cap; flight normally ends earlier once the player physically stops at the wall
const SLING_ARM_ANGLE = Math.PI / 4; // 45° each side of cursor

const BOUNCE_FORM_MS = 3000;
const BOUNCE_REFLECT_RADIUS = 50;
const BOUNCE_REFLECT_SPEED = 1.6;

const FIREBALL_DOT_BASE_MS = 2000;
const FIREBALL_DOT_BONUS_MS = 1500;

// ── Rubber Mastery: Vulcanization ───────────────────────────────────────────
/**
 * Damage that must be soaked to cure one percent. A full 100% cure therefore costs 500
 * damage — about 1.25 of the player's 400 HP bar, so it takes a long, punishing fight (or
 * a lot of healing) to get there, and the 75% fire tier lands at roughly one bar soaked.
 */
const VULC_DMG_PER_PCT = 5;
/**
 * Vulcanization is deliberately back-loaded: every bonus below is scaled by
 * `vulc ^ VULC_CURVE_EXP`, which pays out roughly 10% / 28% / 49% / 73% / 100%
 * of its maximum at 20 / 40 / 60 / 80 / 100% cured. That keeps the early bar
 * near-invisible and makes the last quarter genuinely frightening.
 */
const VULC_CURVE_EXP = 1.4;
/** Fraction knocked off the click's wind-up at full cure. */
const VULC_CHARGE_CUT = 0.5;
/** Extra sling launch speed at full cure. */
const VULC_SLING_SPEED = 0.6;
/** Extra wall bounces the sling launch gets at full cure. */
const VULC_SLING_BOUNCES = 4;
/** Extra Bounce Form duration at full cure. */
const VULC_BOUNCE_FORM = 1.0;
/** Extra anchor reel speed (and therefore anchor impact damage) at full cure. */
const VULC_ANCHOR = 0.8;
/** Extra Rubberage ball acceleration at full cure. */
const VULC_RUBBERAGE_ACCEL = 1.5;
/** Fraction knocked off every cooldown at full cure. */
const VULC_COOLDOWN_CUT = 0.4;
/** At or above this cure the rubber runs hot and everything it touches catches fire. */
const VULC_FIRE_THRESHOLD = 0.75;
const VULC_FIRE_DOT_MS = 3000;
const VULC_FIRE_SLING_MULT = 1.5;
const VULC_FIRE_REFLECT_MULT = 1.5;
const VULC_FIRE_BALL_BONUS_DMG = 2;
const VULC_FIRE_ANCHOR_PERIOD_MS = 3000;
const VULC_FIRE_ANCHOR_DMG = 15;
const VULC_FIRE_ANCHOR_RADIUS = 78;

// ── Rubber Mastery: Atom-Nhilego ────────────────────────────────────────────
const NHILEGO_COOLDOWN_MS = 20000;
const NHILEGO_FUSE_MS = 3000;
const NHILEGO_START_RADIUS = 70;
const NHILEGO_GROWTH = 1.1;
const NHILEGO_DMG = 25;
const NHILEGO_HEAL_PER_HIT = 10;

// ── F+ Bouncy Anchor ────────────────────────────────────────────────────────
/** Knockback the anchor picks up per point of damage that struck it. */
const BOUNCY_ANCHOR_KNOCK_PER_DMG = 22;
const BOUNCY_ANCHOR_KNOCK_BASE = 160;
const BOUNCY_ANCHOR_KNOCK_MAX = 1300;
/** Per-second velocity decay while the knocked anchor is rolling. */
const BOUNCY_ANCHOR_FRICTION = 1.6;

// Rubber Banding (F)
const BAND_LIFETIME_MS = 12000;
const BAND_LIFETIME_PLUS_MS = 18000; // F+
const BAND_COMFORT_RADIUS = 170;
const BAND_MAX_STRETCH = 420;
const BAND_MIN_SPEED_MULT = 0.3;
const BAND_HOLD_THRESHOLD_MS = 180;
const BAND_RECALL_DURATION_MS = 220;
const BAND_RECALL_CONTACT_DMG = 15; // F+
const BAND_RECALL_HIT_RADIUS = 34;
const BAND_ANCHOR_MIN_SPEED = 500;
const BAND_ANCHOR_MAX_SPEED = 1500;
const BAND_ANCHOR_MAX_OVERSHOOT = 260;
const BAND_ANCHOR_RADIUS = 14;
const BAND_ANCHOR_MIN_FLY_DMG = 5;
const BAND_ANCHOR_MAX_FLY_DMG = 30; // at max tension
const BAND_ANCHOR_HIT_RADIUS = BAND_ANCHOR_RADIUS + 22;
const BAND_SMASH_RADIUS = BAND_ANCHOR_RADIUS + PUNCH_FIST_RADIUS;
const NPC_BAND_AUTO_RECALL_CHECK_MS = 900;

// Rubberage (Q)
const RUBBERAGE_COUNT = 15;
const RUBBERAGE_COUNT_PLUS = 25; // Q+
const RUBBERAGE_DURATION_MS = 10000;
const RUBBERAGE_DURATION_PLUS_MS = 14000; // Q+
const RUBBERAGE_DMG = 5;
const RUBBERAGE_DMG_PLUS = 8; // Q+
const RUBBERAGE_RADIUS = 7;
const RUBBERAGE_FIGHTER_RADIUS = 20;
const RUBBERAGE_BASE_SPEED = 240;
const RUBBERAGE_MAX_SPEED = 820;
const RUBBERAGE_SPEED_GROWTH_PER_MS = 0.00045;

// ── Uber-Gear (penta perk) — rubber that gets rubberier the more it is used ──
/** Elasticity gained per landed rubber hit. */
const UBER_GAIN_PER_HIT = 0.04;
const UBER_MAX = 0.60;
/** Grace period after your last hit before the wind starts unwinding. */
const UBER_IDLE_MS = 5000;
/** Once idle, this much elasticity bleeds off per second. */
const UBER_DECAY_PER_SEC = 0.08;
/** Rubberage runs this much longer while Uber-Gear is on. */
const UBER_RUBBERAGE_DURATION_MULT = 1.5;
const RUBBERAGE_HIT_COOLDOWN_MS = 350;
const RUBBERAGE_KNOCKBACK = 620;

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface RubberArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly width: number;
  readonly height: number;
  readonly pointerWasDown: boolean;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** True when the local player's element is Rubber (upgrade flags are only meaningful then). */
  readonly isPlayerRubber: boolean;
  /** True when the opponent is Rubber — drives their rig, auras and world art. */
  readonly isNpcRubber: boolean;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  rubberColor(owner: 'player' | 'npc', base: number): number;
  /** True while the player is mid-dodge/dash (Space dodge, sling launch, or band recall). */
  readonly isDodging: boolean;
  setIsDodging(v: boolean): void;
  applyPlayerSpeedMult(f: number): void;
  applyNpcSpeedMult(f: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** Show/clear an element-specific effect in the top-right status tray (player-side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** True when Rubber Mastery is unlocked, enabled, and Rubber is the local element. */
  readonly masteryActive: boolean;
  /** The mastery enhancement bound over the given ability slot this match, or null. */
  masteryBindFor(slot: string): string | null;
  /** Bank progress toward a Rubber Mastery requirement. */
  recordMasteryStat(key: string, amount: number): void;
  /** Online: tell the peer's sim we just cast a bindable mastery ability. */
  broadcastMasteryCast(enhId: string): void;
}

/** Mastery — Atom-Nhilego: one collapse zone in an ongoing chain. */
interface NhilegoShadow {
  x: number;
  y: number;
  radius: number;
  bornAt: number;
  fireAt: number;
}

interface RubberageBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastHitAt: number;
}

/** Click+ Rubber Bazooka: an over-stretched punch fired as a projectile that bounces off up to 3 walls. */
interface BazookaPunch {
  x: number; y: number;
  vx: number; vy: number;
  dmg: number;
  bouncesLeft: number;
  /** Per-target last-hit timestamp — the projectile can re-hit a target after a 0.5s cooldown. */
  hitAt: Map<Fighter, number>;
  /** Every position the fist has visited — the rubber arm is drawn along this whole trail. */
  path: { x: number; y: number }[];
  /** Once it has spent its bounces, the fist snaps back along `path` to the user, then despawns. */
  returning: boolean;
}

/** F+ Bounce Combo: an anchor bounced off the player, flying free off the arena with a motion-blur trail. */
interface FreeAnchor {
  x: number; y: number;
  vx: number; vy: number;
  dmg: number;
  hitSet: Set<Fighter>;
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'rubber-punch': 'punch',
  'rubber-sling': 'dash',
  'rubber-bounce-form': 'clap',
  'rubber-band': 'slam',
  'rubberage': 'raise',
};

// Click+ Rubber Bazooka
const BAZOOKA_SPEED = 780;
const BAZOOKA_RADIUS = 14;
const BAZOOKA_SNAP_SPEED = 2600; // how fast the fist retraces its path back to the user
// Q+ purple player-ball
const PLAYER_BALL_SIZE_MULT = 0.42;

// ── RubberKit ─────────────────────────────────────────────────────────────────

export class RubberKit {
  private readonly arena: RubberArenaApi;

  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: RubberColorFn;
  private readonly ncol: RubberColorFn;
  private readonly pfx: RubberFx;
  private readonly nfx: RubberFx;
  /** The gum-creature rig (glossy fists, eyes, crown coil) for each rubber fighter. */
  private playerAvatar: RubberAvatar | null = null;
  private npcAvatar: RubberAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private auras: Partial<Record<`${'player' | 'npc'}:${RubberAuraStyle}`, RubberAura>> = {};
  /**
   * Two layers, because these objects are not all in the same place. Wall padding, scuffs and
   * collapse zones lie on the floor and pass *under* the fighters; arms, bands, anchors, paddles
   * and the whole Rubberage swarm are thrown out in front of them and pass over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;

  // Punch (charge)
  private punchHolding = false;
  private punchHoldStart = 0;
  private punchMouseX = 0;
  private punchMouseY = 0;
  /** Live position of the wound-back fist while the click is held, painted with the air layer. */
  private punchFistX = 0;
  private punchFistY = 0;
  private punchOverRatio = 0;

  // Punch (stretch animation — player)
  private punchStretching = false;
  private punchStretchStart = 0;
  private punchStretchDirX = 0;
  private punchStretchDirY = 0;
  private punchStretchDamage = 0;
  private punchStretchMaxReach = PUNCH_REACH;
  private punchStretchHit = false;
  /** Live fist position while the arm is out, so paintWorld can draw it. */
  private punchArmFistX = 0;
  private punchArmFistY = 0;
  private punchArmReach = 0;

  // Punch (stretch animation — NPC)
  private npcPunchStretching = false;
  private npcPunchStretchStart = 0;
  private npcPunchStretchDirX = 0;
  private npcPunchStretchDirY = 0;
  private npcPunchStretchDamage = 0;
  private npcPunchStretchMaxReach = PUNCH_REACH;
  private npcPunchStretchHit = false;
  private npcPunchArmFistX = 0;
  private npcPunchArmFistY = 0;
  private npcPunchArmReach = 0;

  // Slingshot (player)
  private slingState: 'idle' | 'pulling' | 'flying' = 'idle';
  private slingAnchorLX = 0; private slingAnchorLY = 0;
  private slingAnchorRX = 0; private slingAnchorRY = 0;
  /** Rest position (where E was pressed) — the reference point the player is pulled away from and launches back through. */
  private slingRestX = 0; private slingRestY = 0;
  private slingFlyEnd = 0;
  private slingHitThisFlight: Set<Fighter> = new Set();

  // Slingshot (NPC — simplified: just a contact-damage dash)
  private npcSlingFlyEnd = 0;
  private npcSlingHit: Set<Fighter> = new Set();

  // Bounce Form (player)
  private bounceFormActive = false;
  private bounceFormEnd = 0;

  // Bounce Form (NPC)
  private npcBounceFormActive = false;
  private npcBounceFormEnd = 0;

  // ── Mastery: Vulcanization (passive) ─────────────────────────────────────
  /** Cure level, 0..1. Rises as the player soaks damage; never falls during a match. */
  private vulc = 0;
  private vulcCdMultBase = 1;
  private vulcCdMultCaptured = false;
  /** Fire-mode anchor pulse timer (75%+ cure). */
  private vulcAnchorPulseAt = 0;

  // ── Mastery: Atom-Nhilego (bindable) ─────────────────────────────────────
  private nhilegoLastCastAt = -NHILEGO_COOLDOWN_MS;
  private playerNhilegoShadow: NhilegoShadow | null = null;
  private playerNhilegoRadius = NHILEGO_START_RADIUS;
  private playerNhilegoHits = 0;
  private npcNhilegoShadow: NhilegoShadow | null = null;
  private npcNhilegoRadius = NHILEGO_START_RADIUS;
  private npcNhilegoHits = 0;

  // Fireball Sling (E+)
  private fireballFlight = false;
  private fireballSize = 1;
  private fireballTrailAccum = 0;

  // NPC fire DOT (Fireball Sling + Powerful Parry)
  private npcFireDotUntil = 0;
  private npcFireDotTickAccum = 0;

  // ── Rubber Banding (player) ──────────────────────────────────────────────
  private bandActive = false;
  private bandAnchorX = 0; private bandAnchorY = 0;
  private bandCreatedAt = 0;
  private bandLifetimeMs = BAND_LIFETIME_MS;
  private bandReinforced = false;
  private bandFKeyWasDown = false;
  private bandFHoldStart = 0;
  private bandPullTriggeredThisPress = false;
  private bandAnchorFlying = false;
  private bandAnchorFlyDirX = 0; private bandAnchorFlyDirY = 0;
  private bandAnchorFlySpeed = 0;
  private bandAnchorFlyEnd = 0;
  private bandAnchorFlyTension = 0;
  private bandAnchorFlyHitSet: Set<Fighter> = new Set();
  private bandRecalling = false;
  private bandRecallFromX = 0; private bandRecallFromY = 0;
  private bandRecallToX = 0; private bandRecallToY = 0;
  private bandRecallStart = 0;
  /** F+ Bouncy Anchor: rolling velocity picked up from attacks that struck the anchor. */
  private bandAnchorKnockVx = 0;
  private bandAnchorKnockVy = 0;
  /** Debounce so a lingering fist or projectile can't re-launch the ball every frame. */
  private bandAnchorLastKnockAt = 0;

  // Rubber Banding (NPC — simplified: auto snap-back when overstretched)
  private npcBandActive = false;
  private npcBandAnchorX = 0; private npcBandAnchorY = 0;
  private npcBandCreatedAt = 0;
  private npcBandLifetimeMs = BAND_LIFETIME_MS;
  private npcBandNextAutoCheck = 0;
  private npcBandRecalling = false;
  private npcBandRecallFromX = 0; private npcBandRecallFromY = 0;
  private npcBandRecallToX = 0; private npcBandRecallToY = 0;
  private npcBandRecallStart = 0;

  // ── Rubberage (player / NPC) ─────────────────────────────────────────────
  private rubberageBalls: RubberageBall[] = [];
  private rubberageEnd = 0;
  private rubberageDmg = RUBBERAGE_DMG;
  /** Uber-Gear: wound-up elasticity per side, and when each last landed a hit. */
  private uber: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  private uberLastHitAt: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  private uberIndicatorShown = false;

  private npcRubberageBalls: RubberageBall[] = [];
  private npcRubberageEnd = 0;
  private npcRubberageDmg = RUBBERAGE_DMG;

  // ── New upgrade state ────────────────────────────────────────────────────
  // Click+ Rubber Bazooka
  private bazookas: BazookaPunch[] = [];
  // E+ Bouncy House — the coating is painted straight into the ground layer each frame.
  private slingBouncesLeft = 0;
  // Previous-frame player velocity, used to reflect a dash off the coated walls.
  private dashPrevVx = 0;
  private dashPrevVy = 0;
  // Launch speed of the current sling flight — reused on each wall bounce so it never slows.
  private slingSpeed = 0;
  // F+ Bounce Combo
  private freeAnchor: FreeAnchor | null = null;
  // Q+ purple player-ball
  private playerBallActive = false;
  private playerBallVx = 0;
  private playerBallVy = 0;
  private playerBallLastHitAt = 0;

  constructor(arena: RubberArenaApi) {
    this.arena = arena;
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.rubberColor('player', base);
    this.ncol = (base) => arena.rubberColor('npc', base);
    this.pfx = new RubberFx(arena.scene, this.pcol);
    this.nfx = new RubberFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): RubberFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): RubberColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Rubber. */
  private avatarFor(owner: 'player' | 'npc'): RubberAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private fighter(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(3);
    }
    return this.groundGfx;
  }

  /** The thrown-out-in-front layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(8);
    }
    return this.airGfx;
  }

  /** Build/tear down one stance aura from a single "is it up?" flag. */
  private syncAura(
    owner: 'player' | 'npc', style: RubberAuraStyle, on: boolean,
    delta: number, intensity: number, angle: number, radius = 28,
  ): void {
    const key = `${owner}:${style}` as const;
    let aura = this.auras[key];
    const f = this.fighter(owner);
    if (!on || !f?.active) {
      if (aura) { aura.destroy(); delete this.auras[key]; }
      return;
    }
    if (!aura) {
      aura = new RubberAura(this.arena.scene, this.col(owner), style, radius, style === 'vulc' ? 4 : 5);
      this.auras[key] = aura;
    }
    aura.setIntensity(intensity);
    aura.setAngle(angle);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  private destroyAuras(): void {
    for (const a of Object.values(this.auras)) a?.destroy();
    this.auras = {};
  }

  /** Fire one arm gesture on the rig of whichever side cast. */
  private gesture(owner: 'player' | 'npc', abilityId: string, angle?: number): void {
    const g = CAST_GESTURES[abilityId];
    if (g) this.avatarFor(owner)?.play(g, angle);
  }

  // ── reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    const { player, npc } = this.arena;

    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.destroyAuras();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;

    this.punchHolding = false;
    player.chargeRatio = 0;
    player.chargeColor = RUBBER.charge;

    this.punchStretching = false;
    this.npcPunchStretching = false;

    this.slingState = 'idle';
    this.slingHitThisFlight.clear();
    this.npcSlingFlyEnd = 0;
    this.npcSlingHit.clear();

    if (this.bounceFormActive) { player.setVisible(true); player.incomingDamageMultiplier = 1; }
    this.bounceFormActive = false;

    if (this.npcBounceFormActive) { npc.setVisible(true); npc.incomingDamageMultiplier = 1; }
    this.npcBounceFormActive = false;

    // Mastery — Vulcanization: cures from scratch each match.
    if (this.vulcCdMultCaptured) player.cooldownMult = this.vulcCdMultBase;
    player.clearTint();
    this.vulc = 0;
    this.vulcCdMultCaptured = false;
    this.vulcCdMultBase = 1;
    this.vulcAnchorPulseAt = 0;
    this.arena.setStatusIndicator('vulcanization', null);
    this.uber = { player: 0, npc: 0 };
    this.uberLastHitAt = { player: 0, npc: 0 };
    this.uberIndicatorShown = false;
    this.arena.setStatusIndicator('uber-gear', null);

    // Mastery — Atom-Nhilego
    this.nhilegoLastCastAt = -NHILEGO_COOLDOWN_MS;
    this.playerNhilegoShadow = null;
    this.playerNhilegoRadius = NHILEGO_START_RADIUS;
    this.playerNhilegoHits = 0;
    this.npcNhilegoShadow = null;
    this.npcNhilegoRadius = NHILEGO_START_RADIUS;
    this.npcNhilegoHits = 0;

    // Fireball Sling
    if (this.fireballFlight) { player.sizeMult = 1; player.applySizeMult(); }
    this.fireballFlight = false;
    this.fireballSize = 1;
    this.fireballTrailAccum = 0;

    // NPC fire DOT
    this.npcFireDotUntil = 0;
    this.npcFireDotTickAccum = 0;

    // Rubber Banding
    this.bandActive = false;
    this.bandAnchorFlying = false;
    this.bandAnchorFlyHitSet.clear();
    if (this.bandRecalling) player.isInvincible = false;
    this.bandRecalling = false;
    this.bandFHoldStart = 0;
    this.bandFKeyWasDown = false;
    this.bandPullTriggeredThisPress = false;
    this.bandReinforced = false;
    this.bandLifetimeMs = BAND_LIFETIME_MS;
    this.bandAnchorKnockVx = 0; this.bandAnchorKnockVy = 0;
    this.bandAnchorLastKnockAt = 0;

    this.npcBandActive = false;
    this.npcBandRecalling = false;
    this.npcBandLifetimeMs = BAND_LIFETIME_MS;

    // Rubberage
    this.clearRubberageBalls('player');
    this.clearRubberageBalls('npc');

    // ── Reworked upgrade state ──
    this.bazookas = [];
    this.slingBouncesLeft = 0;
    this.freeAnchor = null;
    if (this.playerBallActive) { player.sizeMult = 1; player.applySizeMult(); player.clearTint(); }
    this.playerBallActive = false;
    this.playerBallVx = 0; this.playerBallVy = 0; this.playerBallLastHitAt = 0;
  }

  /** E+ Bouncy House: reflect a Space-dash off the coated walls, sending the player flying back. */
  private updateDashBounce(): void {
    const { player } = this.arena;
    const body = player.body as Phaser.Physics.Arcade.Body;
    // Only a genuine dash — not a sling launch, band recall, or the Q+ ball.
    const dashing = this.arena.isPlayerRubber && this.arena.hasUpgrade('e')
      && this.arena.isDodging && this.slingState === 'idle'
      && !this.bandRecalling && !this.playerBallActive;

    if (dashing) {
      const b = body.blocked;
      if (b.left || b.right || b.up || b.down) {
        const speed = Math.sqrt(this.dashPrevVx ** 2 + this.dashPrevVy ** 2);
        if (speed > 300) {
          // Reflect last frame's dash velocity off whichever wall we hit, at 2× the speed
          // so the rubber flings the player twice as far back.
          let vx = this.dashPrevVx, vy = this.dashPrevVy;
          if (b.left) vx = Math.abs(vx);
          else if (b.right) vx = -Math.abs(vx);
          if (b.up) vy = Math.abs(vy);
          else if (b.down) vy = -Math.abs(vy);
          vx *= 2; vy *= 2;
          const s = Math.sqrt(vx * vx + vy * vy) || 1;
          player.setPosition(player.x + (vx / s) * 5, player.y + (vy / s) * 5);
          body.setVelocity(vx, vy);
          // The wall pad gives: an elastic ring that overshoots, and a squash where you hit it.
          this.pfx.boing(player.x, player.y, 10, 46, RUBBER.pink, 320, 7, 5);
          this.pfx.motes(player.x, player.y, 8, {
            speed: 180, angle: Math.atan2(vy, vx), spread: 1, size: 2.4, life: 420,
          });
        }
      }
    }

    this.dashPrevVx = body.velocity.x;
    this.dashPrevVy = body.velocity.y;
  }

  private ownsAnyRubberUpgrade(): boolean {
    return ['click', 'e', 'r', 'f', 'q'].some(s => this.arena.hasUpgrade(s));
  }

  // ── handleInput (called every frame for player element) ───────────────────

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { player, scene } = this.arena;
    this.punchMouseX = mouseX;
    this.punchMouseY = mouseY;

    const justPressed = pointer.isDown && !this.arena.pointerWasDown;
    const justReleased = !pointer.isDown && this.arena.pointerWasDown;

    const blocked = this.bounceFormActive;
    // Mastery — whichever of E/R/F/Q Atom-Nhilego is bound over loses its base ability.
    const nhilegoSlot = this.nhilegoSlot();

    // ── Punch: hold click to charge, release to fire ─────────────────────────
    if (this.slingState === 'idle' && !blocked) {
      if (justPressed && time >= player.disarmedUntil) {
        this.punchHolding = true;
        this.punchHoldStart = time;
        this.punchFistX = player.x;
        this.punchFistY = player.y;
        this.punchOverRatio = 0;
        // Tension gathering into the wound-back fist, following the player as they walk.
        this.pfx.windUp(player.x, player.y, 34, this.punchMaxHoldMs(), {
          color: RUBBER.rose, depth: 7, follow: () => ({ x: player.x, y: player.y }),
        });
      }
      if (justReleased && this.punchHolding) {
        this.punchHolding = false;
        if (time >= player.disarmedUntil) {
          const holdMs = time - this.punchHoldStart;
          const maxHold = this.punchMaxHoldMs();
          const pullRatio = Math.min(1, holdMs / maxHold);
          // Click+ Rubber Bazooka: holding past full stretch over-stretches the punch;
          // only a FULLY over-stretched (max charge) release fires the wall-bouncing fist —
          // anything short of that is a normal punch.
          const overRatio = this.arena.hasUpgrade('click')
            ? Math.max(0, Math.min(1, (holdMs - maxHold) / maxHold))
            : 0;
          const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
          player.castAbility('rubber-punch', ctx);
          if (overRatio >= 1) this.fireBazooka(mouseX, mouseY, overRatio);
          else this.startStretchPunch('player', mouseX, mouseY, pullRatio);
        }
        player.chargeRatio = 0;
        player.chargeColor = RUBBER.charge;
      }
    } else if (this.slingState !== 'idle' && justReleased) {
      // Cancel punch state if sling is active
      if (this.punchHolding) {
        this.punchHolding = false;
        player.chargeRatio = 0;
      }
    }
    void scene;

    // ── Sling: detect mouse release during 'pulling' phase ───────────────────
    if (this.slingState === 'pulling' && justReleased) {
      this.releaseSling(mouseX, mouseY, time);
    }

    // ── E / R / F / Q abilities ───────────────────────────────────────────────
    const { eKey, rKey, fKey, qKey } = this.arena;

    if (Phaser.Input.Keyboard.JustDown(eKey) && !blocked && time >= player.disarmedUntil) {
      if (nhilegoSlot === 'e') this.tryCastNhilego(time);
      else player.castAbility('rubber-sling', this.arena.buildPlayerContext(mouseX, mouseY));
    }

    if (Phaser.Input.Keyboard.JustDown(rKey) && !blocked && time >= player.disarmedUntil) {
      // R+ Bounce Combo: tapping R while the reeled-in anchor is flying at you bounces
      // it off toward the cursor. It beats the mastery bind too — the combo window only
      // opens while an anchor is mid-flight, so nothing else is competing for the key.
      if (this.canBounceCombo()) {
        this.startBounceCombo(mouseX, mouseY);
      } else if (nhilegoSlot === 'r') {
        this.tryCastNhilego(time);
      } else {
        player.castAbility('rubber-bounce-form', this.arena.buildPlayerContext(mouseX, mouseY));
      }
    }

    // F: Rubber Banding — tap with no anchor plants one; tap while tethered snaps you
    // back to it; hold while tethered reels the anchor toward you instead.
    if (nhilegoSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(fKey) && !blocked && time >= player.disarmedUntil) {
        this.tryCastNhilego(time);
      }
    } else {
      if (Phaser.Input.Keyboard.JustDown(fKey) && !blocked && time >= player.disarmedUntil) {
        if (!this.bandActive) {
          player.castAbility('rubber-band', this.arena.buildPlayerContext(mouseX, mouseY));
        } else {
          this.bandFHoldStart = time;
          this.bandPullTriggeredThisPress = false;
        }
      }
      if (fKey.isDown && this.bandActive && this.bandFHoldStart > 0 && !this.bandPullTriggeredThisPress) {
        if (time - this.bandFHoldStart >= BAND_HOLD_THRESHOLD_MS) {
          this.startBandPull(time);
          this.bandPullTriggeredThisPress = true;
        }
      }
      if (!fKey.isDown && this.bandFKeyWasDown && this.bandFHoldStart > 0) {
        const heldMs = time - this.bandFHoldStart;
        if (heldMs < BAND_HOLD_THRESHOLD_MS && this.bandActive) {
          this.startBandRecall('player');
        }
        this.bandFHoldStart = 0;
        this.bandPullTriggeredThisPress = false;
      }
      this.bandFKeyWasDown = fKey.isDown;
    }

    // Q: Rubberage
    if (Phaser.Input.Keyboard.JustDown(qKey) && !blocked && time >= player.disarmedUntil) {
      if (nhilegoSlot === 'q') this.tryCastNhilego(time);
      else player.castAbility('rubberage', this.arena.buildPlayerContext(mouseX, mouseY));
    }
  }

  // ── applySlingMovement: called from ArenaScene when sling is pulling ───────

  applySlingMovement(mouseX: number, mouseY: number): void {
    if (this.slingState !== 'pulling') return;
    const { player } = this.arena;

    // Clamped pull target: mouse position, capped at SLING_MAX_PULL from the rest
    // position (where the ability was cast) — a real slingshot pulls back from where
    // you're standing, not toward some far-off point out by the fork's wall anchors.
    const restX = this.slingRestX;
    const restY = this.slingRestY;
    let targetX = mouseX;
    let targetY = mouseY;
    const dx = targetX - restX;
    const dy = targetY - restY;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > SLING_MAX_PULL) {
      targetX = restX + (dx / d) * SLING_MAX_PULL;
      targetY = restY + (dy / d) * SLING_MAX_PULL;
    }

    // Move player toward target at high speed
    const pdx = targetX - player.x;
    const pdy = targetY - player.y;
    const pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
    if (pd > 3) {
      const spd = Math.min(pd * 8, 900);
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(
        (pdx / pd) * spd, (pdy / pd) * spd,
      );
    } else {
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  // ── update (called every frame when rubber is either player or NPC) ────────

  update(time: number, delta: number): void {
    const { player, npc } = this.arena;
    this.vizT += delta / 1000;

    // E+ Bouncy House: a Space-dash into a coated wall bounces the player off it.
    this.updateDashBounce();

    // Punch stretch animations
    this.updateStretchPunch(time, 'player');
    this.updateStretchPunch(time, 'npc');

    // Punch fist visual tracks behind player
    if (this.punchHolding) {
      const holdMs = time - this.punchHoldStart;
      const maxHold = this.punchMaxHoldMs();
      const pullRatio = Math.min(1, holdMs / maxHold);
      const overRatio = this.arena.hasUpgrade('click')
        ? Math.max(0, Math.min(1, (holdMs - maxHold) / maxHold))
        : 0;
      const pullLen = PUNCH_MAX_PULL * (Math.sqrt(pullRatio) + 0.5 * overRatio);
      const dx = this.punchMouseX - player.x;
      const dy = this.punchMouseY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // Fist pulls toward mouse; release fires in the opposite direction
      this.punchFistX = player.x + (dx / dist) * pullLen;
      this.punchFistY = player.y + (dy / dist) * pullLen;
      this.punchOverRatio = overRatio;
      // Over-stretch slowly turns the yellow charge bar orange as it overcharges.
      player.chargeColor = overRatio > 0
        ? Phaser.Display.Color.GetColor(255, Math.round(221 - 85 * overRatio), 0)
        : RUBBER.charge;
      player.chargeRatio = pullRatio;
      // Fully over-stretched: the arm sheds dust and the fist runs hot, so the Bazooka
      // release is telegraphed before it happens.
      if (overRatio >= 1 && Math.random() < 0.25) {
        this.pfx.motes(this.punchFistX, this.punchFistY, 1, {
          speed: 60, size: 2, life: 400, color: RUBBER.gold, drift: -12,
        });
      }
    }

    // Sling flight contact damage
    if (this.slingState === 'flying') {
      const body = player.body as Phaser.Physics.Arcade.Body;
      // The player's body collides with the world bounds, so a launch naturally rides all
      // the way to the wall and stops there — end the flight the moment that happens (rather
      // than waiting out a fixed timer that could cut the trip short mid-arena). Checking
      // `blocked` instead of raw velocity matters for a diagonal launch: only the axis that
      // actually hit a wall zeroes out, so the other axis can retain a small residual velocity
      // forever and never trip a "speed near zero" check.
      const hitWall = body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right;
      if (time > this.slingFlyEnd) {
        this.endSlingFlight();
      } else if (hitWall) {
        // E+ Bouncy House: bounce off the coated wall toward the cursor instead of stopping.
        if (this.slingBouncesLeft > 0) this.bounceSlingOffWall();
        else this.endSlingFlight();
      } else {
        this.checkSlingContact('player', time);
      }
    }
    if (time < this.npcSlingFlyEnd) {
      this.checkSlingContact('npc', time);
    }

    // Bounce Form
    this.updateBounceForm(time, 'player');
    this.updateBounceForm(time, 'npc');
    this.steerHomingProjectiles();

    // Rubber Banding
    this.updateBand(time, delta, 'player');
    this.updateBand(time, delta, 'npc');

    // Rubberage
    this.updateUber(time, delta);
    this.updateRubberageBalls(time, delta, 'player');
    this.updateRubberageBalls(time, delta, 'npc');

    // Reworked upgrades
    this.updateBazookas(time, delta);       // Click+
    this.updateFreeAnchor(time, delta);     // F+
    this.updatePlayerBall(time, delta);     // Q+

    // Mastery — Vulcanization passive + Atom-Nhilego chains
    this.updateVulcanization(time, delta);
    this.tickNhilego(time, 'player');
    this.tickNhilego(time, 'npc');

    // Fireball trail — a wake of burning shreds torn off the launch.
    if (this.fireballFlight && this.slingState === 'flying') {
      this.fireballTrailAccum += delta;
      if (this.fireballTrailAccum >= 40) {
        this.fireballTrailAccum -= 40;
        const body = player.body as Phaser.Physics.Arcade.Body;
        const back = Math.atan2(-body.velocity.y, -body.velocity.x);
        this.pfx.shreds(player.x, player.y, 2, {
          speed: 70, angle: back, spread: 0.5, size: 5 * this.fireballSize, life: 420,
          depth: 5, color: RUBBER.flame,
        });
      }
    }

    // NPC fire DOT (from Fireball Sling + Powerful Parry)
    if (this.npcFireDotUntil > time) {
      this.npcFireDotTickAccum += delta;
      if (this.npcFireDotTickAccum >= 500) {
        this.npcFireDotTickAccum -= 500;
        npc.takeDamage(2);
        this.arena.spawnHitFlash(npc.x, npc.y, RUBBER.ember);
      }
    } else {
      this.npcFireDotTickAccum = 0;
    }

    this.paintWorld(time);
    this.updateAuras(time, delta);
    this.updateAvatars(delta);
  }

  /**
   * Every per-frame painter in one pass. Both layers are cleared and redrawn from live state, so
   * a band visibly thins under tension, a ball squashes as it speeds up and a paddle ripples —
   * none of which a sprite could do.
   */
  private paintWorld(time: number): void {
    const { player, npc, scene } = this.arena;
    const t = this.vizT;
    const bouncy = this.bouncyAnchor();
    const hot = this.vulcFire();

    // ── Floor ──
    const coated = this.arena.isPlayerRubber && this.arena.hasUpgrade('e');
    const zones = [this.playerNhilegoShadow, this.npcNhilegoShadow];
    if (coated || zones.some(Boolean) || this.groundGfx) {
      const g = this.ground();
      g.clear();
      if (coated) {
        const wb = scene.physics.world.bounds;
        RubberFx.drawWallCoating(g, this.pcol, wb.x, wb.y, wb.width, wb.height, hot, t);
      }
      for (const owner of ['player', 'npc'] as const) {
        const z = owner === 'player' ? this.playerNhilegoShadow : this.npcNhilegoShadow;
        if (!z) continue;
        const fuse = Phaser.Math.Clamp((time - z.bornAt) / Math.max(1, z.fireAt - z.bornAt), 0, 1);
        RubberFx.drawNhilegoZone(g, this.col(owner), z.x, z.y, z.radius, fuse, owner === 'player', t);
      }
    }

    // ── Air ──
    const g = this.air();
    g.clear();

    // The wound-back fist, still tethered to the shoulder by the arm it will fire out of.
    if (this.punchHolding) {
      const over = this.punchOverRatio;
      RubberFx.drawPunchArm(g, this.pcol, player.x, player.y, this.punchFistX, this.punchFistY,
        Phaser.Math.Clamp(Phaser.Math.Distance.Between(player.x, player.y, this.punchFistX, this.punchFistY) / PUNCH_MAX_PULL, 0, 1),
        hot || over >= 1, t);
    }
    if (this.punchStretching) {
      RubberFx.drawPunchArm(g, this.pcol, player.x, player.y, this.punchArmFistX, this.punchArmFistY,
        this.punchArmReach / PUNCH_REACH, hot, t);
    }
    if (this.npcPunchStretching) {
      RubberFx.drawPunchArm(g, this.ncol, npc.x, npc.y, this.npcPunchArmFistX, this.npcPunchArmFistY,
        this.npcPunchArmReach / PUNCH_REACH, false, t);
    }

    if (this.slingState === 'pulling') {
      const pull = Phaser.Math.Distance.Between(player.x, player.y, this.slingRestX, this.slingRestY);
      RubberFx.drawSlingV(g, this.pcol, player.x, player.y,
        this.slingAnchorLX, this.slingAnchorLY, this.slingAnchorRX, this.slingAnchorRY,
        Phaser.Math.Clamp(pull / SLING_MAX_PULL, 0, 1), t);
    }

    if (this.bounceFormActive) {
      RubberFx.drawBounceForm(g, this.pcol, player.x, player.y,
        Math.atan2(this.punchMouseY - player.y, this.punchMouseX - player.x), t);
    }
    if (this.npcBounceFormActive) {
      RubberFx.drawBounceForm(g, this.ncol, npc.x, npc.y,
        Math.atan2(player.y - npc.y, player.x - npc.x), t);
    }

    // Bands + anchors.
    for (const owner of ['player', 'npc'] as const) {
      const isP = owner === 'player';
      if (!(isP ? this.bandActive : this.npcBandActive)) continue;
      const caster = isP ? player : npc;
      const ax = isP ? this.bandAnchorX : this.npcBandAnchorX;
      const ay = isP ? this.bandAnchorY : this.npcBandAnchorY;
      const tension = Phaser.Math.Clamp(
        Phaser.Math.Distance.Between(ax, ay, caster.x, caster.y) / BAND_MAX_STRETCH, 0, 1);
      RubberFx.drawBand(g, this.col(owner), ax, ay, caster.x, caster.y, tension, t);
      RubberFx.drawAnchor(g, this.col(owner), ax, ay, BAND_ANCHOR_RADIUS,
        isP && bouncy, isP && hot, t * 3, t);
    }

    for (const b of this.bazookas) {
      RubberFx.drawBazookaArm(g, this.pcol, player.x, player.y, b.path, b.x, b.y, hot, t);
    }
    if (this.freeAnchor) {
      RubberFx.drawFreeAnchor(g, this.pcol, this.freeAnchor.x, this.freeAnchor.y,
        this.freeAnchor.vx, this.freeAnchor.vy, BAND_ANCHOR_RADIUS);
    }

    for (const owner of ['player', 'npc'] as const) {
      const balls = owner === 'player' ? this.rubberageBalls : this.npcRubberageBalls;
      const swarmHot = owner === 'player' && hot;
      for (const b of balls) {
        RubberFx.drawRageBall(g, this.col(owner), b.x, b.y, b.vx, b.vy,
          RUBBERAGE_RADIUS, swarmHot, RUBBERAGE_MAX_SPEED, t);
      }
    }
  }

  /** Stance tells for both sides, rebuilt from the flags that are already the source of truth. */
  private updateAuras(time: number, delta: number): void {
    const { player, npc } = this.arena;
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    const pAim = Math.atan2(this.punchMouseY - player.y, this.punchMouseX - player.x);
    const flightAim = body ? Math.atan2(body.velocity.y, body.velocity.x) : pAim;

    this.syncAura('player', 'vulc', this.arena.masteryActive && this.vulc > 0.02,
      delta, this.vulc, pAim, 28);
    this.syncAura('player', 'fireball', this.fireballFlight && this.slingState === 'flying',
      delta, 1, flightAim, 26);
    this.syncAura('player', 'ball', this.playerBallActive, delta, 1, flightAim, 24);
    this.syncAura('player', 'bounce', this.bounceFormActive, delta, 1, pAim, 50);
    this.syncAura('npc', 'bounce', this.npcBounceFormActive, delta, 1, 0, 50);
    this.syncAura('npc', 'burn', this.npcFireDotUntil > time, delta, 1, 0, 26);
  }

  /** Drive the rig for whichever sides are playing Rubber. Built lazily; torn down when they aren't. */
  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.arena;

    // Bounce Form hides the fighter entirely — the paddle is the character while it is up, so
    // the rig has to go with it rather than floating next to a body that isn't there.
    if (this.arena.isPlayerRubber && player?.active && !this.bounceFormActive) {
      if (!this.playerAvatar) this.playerAvatar = new RubberAvatar(scene, this.pcol, 'player');
      this.playerAvatar.setFacing(Math.atan2(this.punchMouseY - player.y, this.punchMouseX - player.x));
      // The cure visibly inflates the rig, so the passive reads off the character alone.
      this.playerAvatar.setIntensity(1 + 0.4 * this.vulcK() + (this.fireballFlight ? 0.3 : 0));
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Hold priority: a wound-back punch beats a hauled-back slingshot beats nothing.
      this.playerAvatar.setHold(this.punchHolding || this.slingState === 'pulling' ? 'brace' : null);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.arena.isNpcRubber && npc?.active && !this.npcBounceFormActive) {
      if (!this.npcAvatar) this.npcAvatar = new RubberAvatar(scene, this.ncol, 'npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── do* methods called from CastContext ───────────────────────────────────

  doRubberPunch(tx: number, ty: number, pullRatio: number, owner: 'player' | 'npc'): void {
    if (owner === 'npc') {
      this.startStretchPunch('npc', tx, ty, pullRatio);
    }
    // Player punch is fired in handleInput on release; the cast() here just starts cooldown
  }

  doRubberSlingShotStart(cursorAngle: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;

    if (owner === 'npc') {
      // NPC simplification: dash toward player with contact-damage window
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ctx = this.arena.buildNpcContext(player.x, player.y);
      ctx.dashCaster((dx / dist) * SLING_MAX_SPEED * 0.75, (dy / dist) * SLING_MAX_SPEED * 0.75);
      this.npcSlingFlyEnd = time + SLING_FLY_MS;
      this.npcSlingHit.clear();
      this.gesture('npc', 'rubber-sling', Math.atan2(dy, dx));
      this.nfx.smear(npc.x, npc.y, npc.x + (dx / dist) * 90, npc.y + (dy / dist) * 90, { width: 20 });
      this.nfx.boing(npc.x, npc.y, 8, 44, RUBBER.rose, 340, 7, 5);
      return;
    }

    // Player: compute V-anchors and enter pulling state
    const { ax, ay, bx, by } = this.computeSlingAnchors(player.x, player.y, cursorAngle);
    this.slingAnchorLX = ax; this.slingAnchorLY = ay;
    this.slingAnchorRX = bx; this.slingAnchorRY = by;
    this.slingRestX = player.x; this.slingRestY = player.y;
    this.slingState = 'pulling';
    this.slingHitThisFlight.clear();
    // Both arms fire out and bite into the walls.
    for (const [hx, hy] of [[ax, ay], [bx, by]] as const) {
      this.pfx.boing(hx, hy, 4, 26, RUBBER.pink, 300, 8, 4);
      this.pfx.motes(hx, hy, 5, { speed: 90, size: 2, life: 400 });
    }
    this.arena.showFloatingText(player.x, player.y - 40, '🪀 SLING SET', '#ff5577');
  }

  doRubberSlingShotRelease(_vx: number, _vy: number, _owner: 'player' | 'npc'): void {
    // Release is driven by mouse-up detection in handleInput for the player,
    // and by the dash in doRubberSlingShotStart for the NPC — nothing to do here.
  }

  doRubberBounceForm(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;

    caster.setVisible(false);
    caster.incomingDamageMultiplier = 0;

    // Folding into a paddle: the body squashes flat and the membrane snaps taut.
    this.gesture(owner, 'rubber-bounce-form');
    const fx = this.fx(owner);
    fx.boing(caster.x, caster.y, 40, 8, RUBBER.pink, 320, 8, 6);
    fx.flash(caster.x, caster.y, 22, 9, RUBBER.rose);
    fx.motes(caster.x, caster.y, 10, { speed: 130, size: 2.4, life: 500 });

    if (owner === 'player') {
      this.bounceFormActive = true;
      // Vulcanization holds the ball together longer.
      this.bounceFormEnd = time + BOUNCE_FORM_MS * (1 + VULC_BOUNCE_FORM * this.vulcK());
      this.arena.showFloatingText(caster.x, caster.y - 40, '🔲 BOUNCE FORM', '#ff5577');
    } else {
      this.npcBounceFormActive = true;
      this.npcBounceFormEnd = time + BOUNCE_FORM_MS;
    }
    void scene;
  }

  doRubberBandStart(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const caster = owner === 'player' ? player : npc;
    // Driving the anchor in: a hard squash where it lands, dust, and a scuff left behind.
    this.gesture(owner, 'rubber-band');
    const fx = this.fx(owner);
    fx.boing(caster.x, caster.y, 6, 40, RUBBER.blush, 380, 8, 5);
    fx.scuff(caster.x, caster.y, 20, 3);
    fx.motes(caster.x, caster.y, 8, { speed: 110, size: 2.2, life: 480 });

    if (owner === 'player') {
      this.bandActive = true;
      this.bandAnchorX = caster.x; this.bandAnchorY = caster.y;
      this.bandCreatedAt = time;
      this.bandReinforced = this.arena.hasUpgrade('f');
      this.bandLifetimeMs = this.bandReinforced ? BAND_LIFETIME_PLUS_MS : BAND_LIFETIME_MS;
      this.bandFHoldStart = 0;
      this.bandPullTriggeredThisPress = false;
      this.bandAnchorFlying = false;
      this.arena.showFloatingText(caster.x, caster.y - 40, '⚫ ANCHOR SET', '#ff5577');
    } else {
      this.npcBandActive = true;
      this.npcBandAnchorX = caster.x; this.npcBandAnchorY = caster.y;
      this.npcBandCreatedAt = time;
      this.npcBandLifetimeMs = BAND_LIFETIME_MS;
      this.npcBandNextAutoCheck = time + NPC_BAND_AUTO_RECALL_CHECK_MS;
    }
  }

  doRubberage(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const time = scene.time.now;
    const isPlus = owner === 'player' && this.arena.hasUpgrade('q');
    const count = isPlus ? RUBBERAGE_COUNT_PLUS : RUBBERAGE_COUNT;
    // Uber-Gear: heavier balls, and a swarm that stays out half again as long.
    const uberK = this.uberK(owner);
    const dmg = Math.round((isPlus ? RUBBERAGE_DMG_PLUS : RUBBERAGE_DMG) * (1 + uberK));
    const duration = Math.round((isPlus ? RUBBERAGE_DURATION_PLUS_MS : RUBBERAGE_DURATION_MS)
      * (this.arena.hasPerk(owner, 'uber-gear') ? UBER_RUBBERAGE_DURATION_MULT : 1));

    // Vulcanization 75%+: the player's swarm comes out glowing.
    const hot = owner === 'player' && this.vulcFire();
    const balls: RubberageBall[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = RUBBERAGE_BASE_SPEED * (0.8 + Math.random() * 0.4);
      balls.push({
        x: caster.x, y: caster.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        lastHitAt: 0,
      });
    }

    // The swarm bursting out. Q+ and a hot cure both scale the *content* of the burst — more
    // rings, more shreds, longer — not just a bigger circle.
    this.gesture(owner, 'rubberage');
    const fx = this.fx(owner);
    fx.boom(caster.x, caster.y, isPlus ? 120 : 92, {
      color: hot ? RUBBER.flame : RUBBER.rose,
      shreds: count,
      rings: isPlus ? 3 : 2,
      duration: isPlus ? 640 : 480,
    });
    if (hot) fx.heatBurst(caster.x, caster.y, 46);
    scene.cameras.main.shake(isPlus ? 220 : 150, isPlus ? 0.006 : 0.004);

    if (owner === 'player') {
      this.clearRubberageBalls('player');
      this.rubberageBalls = balls;
      this.rubberageEnd = time + duration;
      this.rubberageDmg = dmg;
      this.arena.showFloatingText(caster.x, caster.y - 40, '🔴 RUBBERAGE!', '#ff5577');
      // Q+ : the player joins the swarm as a purple rubber ball.
      if (this.arena.hasUpgrade('q')) this.startPlayerBall();
    } else {
      this.clearRubberageBalls('npc');
      this.npcRubberageBalls = balls;
      this.npcRubberageEnd = time + duration;
      this.npcRubberageDmg = dmg;
    }
  }

  // ── Public accessors for ArenaScene ───────────────────────────────────────

  isSlingActive(): boolean { return this.slingState !== 'idle'; }
  isBounceFormActive(owner: 'player' | 'npc'): boolean {
    return owner === 'player' ? this.bounceFormActive : this.npcBounceFormActive;
  }

  // ── Public: NPC fire DOT extension (called from ArenaScene.applyProjectileToNpc) ──

  applyNpcFireDot(durationMs: number): void {
    this.npcFireDotUntil = Math.max(this.npcFireDotUntil, this.arena.scene.time.now + durationMs);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private startStretchPunch(owner: 'player' | 'npc', targetX: number, targetY: number, pullRatio: number): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    // Uber-Gear: a wound-up fist lands harder than the same pull would otherwise.
    const damage = Math.round((PUNCH_MIN_DMG + (PUNCH_MAX_DMG - PUNCH_MIN_DMG) * pullRatio)
      * (1 + this.uberK(owner)));
    const maxReach = PUNCH_REACH;

    const dx = targetX - caster.x;
    const dy = targetY - caster.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (owner === 'player') {
      this.punchStretching = true;
      this.punchStretchStart = scene.time.now;
      this.punchStretchDirX = -dx / dist; // fire opposite to pull direction
      this.punchStretchDirY = -dy / dist;
      this.punchStretchDamage = damage;
      this.punchStretchMaxReach = maxReach;
      this.punchStretchHit = false;
      this.punchArmFistX = caster.x;
      this.punchArmFistY = caster.y;
      this.punchArmReach = 0;
    } else {
      this.npcPunchStretching = true;
      this.npcPunchStretchStart = scene.time.now;
      this.npcPunchStretchDirX = dx / dist;
      this.npcPunchStretchDirY = dy / dist;
      this.npcPunchStretchDamage = damage;
      this.npcPunchStretchMaxReach = PUNCH_REACH;
      this.npcPunchStretchHit = false;
      this.npcPunchArmFistX = caster.x;
      this.npcPunchArmFistY = caster.y;
      this.npcPunchArmReach = 0;
    }

    // Release: the stored tension lets go all at once.
    const fireAngle = owner === 'player' ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
    this.gesture(owner, 'rubber-punch', fireAngle);
    const fx = this.fx(owner);
    fx.boing(caster.x, caster.y, 6, 30 + 26 * pullRatio, RUBBER.pink, 300, 7, 4);
    fx.motes(caster.x, caster.y, 3 + Math.round(pullRatio * 5), {
      speed: 130, angle: fireAngle, spread: 0.8, size: 2, life: 380,
    });
  }

  private updateStretchPunch(time: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const stretching = isPlayer ? this.punchStretching : this.npcPunchStretching;
    if (!stretching) return;

    const { player, npc } = this.arena;
    const caster = isPlayer ? player : npc;
    const target = isPlayer ? npc : player;

    const stretchStart = isPlayer ? this.punchStretchStart : this.npcPunchStretchStart;
    const dirX = isPlayer ? this.punchStretchDirX : this.npcPunchStretchDirX;
    const dirY = isPlayer ? this.punchStretchDirY : this.npcPunchStretchDirY;
    const damage = isPlayer ? this.punchStretchDamage : this.npcPunchStretchDamage;
    const maxReach = isPlayer ? this.punchStretchMaxReach : this.npcPunchStretchMaxReach;
    const hit = isPlayer ? this.punchStretchHit : this.npcPunchStretchHit;

    const elapsed = time - stretchStart;
    const totalMs = PUNCH_STRETCH_MS + PUNCH_HOLD_ANIM_MS + PUNCH_SNAP_MS;

    // Compute current reach along the punch direction
    let reach: number;
    if (elapsed < PUNCH_STRETCH_MS) {
      reach = maxReach * (elapsed / PUNCH_STRETCH_MS);
    } else if (elapsed < PUNCH_STRETCH_MS + PUNCH_HOLD_ANIM_MS) {
      reach = maxReach;
    } else {
      const snapT = (elapsed - PUNCH_STRETCH_MS - PUNCH_HOLD_ANIM_MS) / PUNCH_SNAP_MS;
      reach = maxReach * (1 - Math.min(1, snapT));
    }

    const fistX = caster.x + dirX * reach;
    const fistY = caster.y + dirY * reach;

    // Hand the live fist to paintWorld, which owns the arm's art.
    if (isPlayer) {
      this.punchArmFistX = fistX; this.punchArmFistY = fistY; this.punchArmReach = reach;
    } else {
      this.npcPunchArmFistX = fistX; this.npcPunchArmFistY = fistY; this.npcPunchArmReach = reach;
    }

    // Rubber Banding: smack your own anchor with a stretched punch to shatter it —
    // unless F+ Bouncy Anchor has made it unbreakable, in which case it just gets launched.
    if (isPlayer && this.bandActive) {
      const bandDist = Phaser.Math.Distance.Between(fistX, fistY, this.bandAnchorX, this.bandAnchorY);
      if (bandDist < BAND_SMASH_RADIUS) {
        if (this.bouncyAnchor()) {
          if (!hit) {
            this.knockAnchor(dirX, dirY, damage);
            if (isPlayer) this.punchStretchHit = true;
          }
        } else {
          this.shatterBand('player');
        }
      }
    }

    // Melee hit check during stretch-out and hold only
    if (!hit && elapsed < PUNCH_STRETCH_MS + PUNCH_HOLD_ANIM_MS) {
      const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [target];
      for (const tgt of targets) {
        if (!tgt.active) continue;
        const d = Phaser.Math.Distance.Between(fistX, fistY, tgt.x, tgt.y);
        if (d < PUNCH_FIST_RADIUS) {
          tgt.takeDamage(damage);
          this.noteUberHit(isPlayer ? 'player' : 'npc');
          // Vulcanization 75%+: a charged fist is hot enough to set them alight.
          const ignites = isPlayer && this.vulcFire();
          if (ignites) this.applyFireDot(tgt);
          this.arena.spawnHitFlash(tgt.x, tgt.y, ignites ? RUBBER.flame : RUBBER.rose);
          // Contact: the fist flattens against them and the shock rolls back down the arm.
          const fx = this.fx(owner);
          fx.boom(fistX, fistY, 34 + damage, {
            color: ignites ? RUBBER.flame : RUBBER.rose,
            shreds: 4 + Math.round(damage / 6),
            rings: ignites ? 3 : 2,
            duration: 340 + damage * 4,
            mark: false,
          });
          if (ignites) fx.heatBurst(tgt.x, tgt.y, 30);
          this.arena.scene.cameras.main.shake(80 + damage * 2, 0.002 + damage * 0.00006);
          if (isPlayer) this.punchStretchHit = true;
          else this.npcPunchStretchHit = true;
          break;
        }
      }
    }

    // Expire
    if (elapsed >= totalMs) {
      if (isPlayer) this.punchStretching = false;
      else this.npcPunchStretching = false;
    }
  }

  private computeSlingAnchors(
    px: number, py: number, cursorAngle: number,
  ): { ax: number; ay: number; bx: number; by: number } {
    const { width, height } = this.arena;
    const wallL = 25; const wallR = width - 25;
    const wallT = 85; const wallB = height - 25;

    const raycast = (fromX: number, fromY: number, angle: number): { x: number; y: number } => {
      const vx = Math.cos(angle); const vy = Math.sin(angle);
      let t = Infinity;
      if (vx > 0 && wallR > fromX) t = Math.min(t, (wallR - fromX) / vx);
      if (vx < 0 && wallL < fromX) t = Math.min(t, (wallL - fromX) / vx);
      if (vy > 0 && wallB > fromY) t = Math.min(t, (wallB - fromY) / vy);
      if (vy < 0 && wallT < fromY) t = Math.min(t, (wallT - fromY) / vy);
      if (!isFinite(t)) t = 400;
      return { x: fromX + vx * t, y: fromY + vy * t };
    };

    const al = raycast(px, py, cursorAngle - SLING_ARM_ANGLE);
    const ar = raycast(px, py, cursorAngle + SLING_ARM_ANGLE);
    return { ax: al.x, ay: al.y, bx: ar.x, by: ar.y };
  }

  private releaseSling(mouseX: number, mouseY: number, time: number): void {
    const { player } = this.arena;
    const pdx = player.x - this.slingRestX;
    const pdy = player.y - this.slingRestY;
    const pullDist = Math.sqrt(pdx * pdx + pdy * pdy);

    if (pullDist < SLING_MIN_PULL_TO_FIRE) {
      // Not pulled back far enough — the band just goes slack instead of launching.
      this.slingState = 'idle';
      this.pfx.snap(this.slingAnchorLX, this.slingAnchorLY, this.slingAnchorRX, this.slingAnchorRY,
        { width: 4, duration: 260 });
      return;
    }

    const pullRatio = Math.min(1, pullDist / SLING_MAX_PULL);
    // Vulcanized rubber snaps back harder, so the whole launch is faster.
    const speed = (SLING_MIN_SPEED + (SLING_MAX_SPEED - SLING_MIN_SPEED) * pullRatio)
      * (1 + VULC_SLING_SPEED * this.vulcK())
      * (1 + this.uberK('player'));
    this.slingSpeed = speed;
    // Real slingshot: launch back through the rest position, opposite the pull direction.
    const vx = -(pdx / pullDist) * speed;
    const vy = -(pdy / pullDist) * speed;

    // Vulcanization 75%+: the launch goes up, riding across the arena as a fireball.
    if (this.vulcFire()) {
      this.fireballFlight = true;
      this.fireballSize = 1.5;
      player.sizeMult = this.fireballSize;
      player.applySizeMult();
    } else {
      this.fireballFlight = false;
    }

    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
    ctx.dashCaster(vx, vy);
    this.arena.setIsDodging(true);

    // Both arms let go at once and whip back to their wall clamps, and the launch smears.
    this.gesture('player', 'rubber-sling', Math.atan2(vy, vx));
    this.pfx.snap(this.slingAnchorLX, this.slingAnchorLY, player.x, player.y, { width: 6 });
    this.pfx.snap(this.slingAnchorRX, this.slingAnchorRY, player.x, player.y, { width: 6 });
    this.pfx.boing(player.x, player.y, 8, 54 + 30 * pullRatio,
      this.fireballFlight ? RUBBER.flame : RUBBER.rose, 400, 7, 6);
    this.pfx.smear(player.x, player.y, player.x + vx * 0.09, player.y + vy * 0.09, {
      color: this.fireballFlight ? RUBBER.flame : RUBBER.rose, width: 20,
    });
    if (this.fireballFlight) this.pfx.heatBurst(player.x, player.y, 40);
    this.arena.scene.cameras.main.shake(120, 0.003 + pullRatio * 0.002);

    this.slingState = 'flying';
    this.slingFlyEnd = time + SLING_LAUNCH_MAX_MS;
    this.slingHitThisFlight.clear();
    // E+ Bouncy House: the launch bounces off the rubber-coated walls up to 3 more times.
    // Vulcanization adds bounces of its own, coating or not.
    this.slingBouncesLeft = (this.arena.hasUpgrade('e') ? 3 : 0)
      + Math.floor(VULC_SLING_BOUNCES * this.vulcK());
  }

  /** E+ Bouncy House: reflect the sling launch off a wall, redirecting toward the cursor. */
  private bounceSlingOffWall(): void {
    const { player, scene } = this.arena;
    const body = player.body as Phaser.Physics.Arcade.Body;
    // Reuse the original launch speed — the wall collision has already zeroed the
    // blocked axis, so reading the current velocity would slow the bounce each time.
    const spd = this.slingSpeed || SLING_MIN_SPEED;
    let dx = this.punchMouseX - player.x;
    let dy = this.punchMouseY - player.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) { dx = -body.velocity.x; dy = -body.velocity.y; d = Math.sqrt(dx * dx + dy * dy) || 1; }
    // Nudge off the wall so `blocked` clears next frame, then relaunch toward the cursor.
    player.setPosition(player.x + (dx / d) * 5, player.y + (dy / d) * 5);
    body.setVelocity((dx / d) * spd, (dy / d) * spd);
    this.slingBouncesLeft--;
    // The pad compresses and throws you back off it.
    this.pfx.boing(player.x, player.y, 8, 44, RUBBER.pink, 300, 7, 5);
    this.pfx.scuff(player.x, player.y, 16, 3);
    this.pfx.motes(player.x, player.y, 6, { speed: 150, angle: Math.atan2(dy, dx), spread: 1, size: 2, life: 380 });
    void scene;
  }

  private endSlingFlight(): void {
    const { player } = this.arena;
    if (this.fireballFlight) {
      this.fireballFlight = false;
      player.sizeMult = 1;
      player.applySizeMult();
      this.pfx.heatBurst(player.x, player.y, 34);
    }
    this.slingState = 'idle';
    this.slingHitThisFlight.clear();
    this.slingBouncesLeft = 0;
  }

  private checkSlingContact(owner: 'player' | 'npc', time: number): void {
    const { player, npc, enemies } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const hitSet = owner === 'player' ? this.slingHitThisFlight : this.npcSlingHit;
    const baseTargets = enemies.length > 0 ? enemies : [owner === 'player' ? npc : player];

    for (const t of baseTargets) {
      if (!t.active || hitSet.has(t)) continue;
      const d = Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y);
      if (d < 52) {
        // A vulcanized fireball launch hits harder and leaves the target burning.
        const fireball = owner === 'player' && this.fireballFlight;
        t.takeDamage(Math.round(SLING_CONTACT_DMG * (fireball ? VULC_FIRE_SLING_MULT : 1)));
        this.noteUberHit(owner);
        if (fireball) this.applyFireDot(t);
        hitSet.add(t);
        this.arena.spawnHitFlash(t.x, t.y, fireball ? RUBBER.flame : RUBBER.rose);
        // A body hitting a body: a hard squash, shreds, and heat if the launch was alight.
        this.fx(owner).boom(t.x, t.y, fireball ? 78 : 56, {
          color: fireball ? RUBBER.flame : RUBBER.rose,
          shreds: fireball ? 12 : 7,
          rings: fireball ? 3 : 2,
          duration: fireball ? 560 : 420,
        });
        if (fireball) this.fx(owner).heatBurst(t.x, t.y, 38);
        this.arena.scene.cameras.main.shake(fireball ? 200 : 140, fireball ? 0.006 : 0.004);
        if (owner === 'player') {
          // E+ Bouncy House: keep flying (and keep dealing contact damage) after a hit;
          // without it, a contact ends the launch as before.
          if (!this.arena.hasUpgrade('e') && this.slingBouncesLeft <= 0) this.endSlingFlight();
        } else {
          this.npcSlingFlyEnd = 0;
        }
        break;
      }
    }
  }

  private updateBounceForm(time: number, owner: 'player' | 'npc'): void {
    const { player, npc, projectiles } = this.arena;
    const isPlayer = owner === 'player';
    const active = isPlayer ? this.bounceFormActive : this.npcBounceFormActive;
    if (!active) return;

    const endTime = isPlayer ? this.bounceFormEnd : this.npcBounceFormEnd;
    const caster = isPlayer ? player : npc;

    if (time > endTime) {
      caster.setVisible(true);
      caster.incomingDamageMultiplier = 1;
      // Unfolding: the paddle springs back into a body.
      this.fx(owner).boing(caster.x, caster.y, 46, 12, RUBBER.pink, 340, 8, 5);
      if (isPlayer) this.bounceFormActive = false;
      else this.npcBounceFormActive = false;
      if (isPlayer) this.arena.setStatusIndicator('bounce-form', null);
      return;
    }

    if (isPlayer) {
      this.arena.setStatusIndicator('bounce-form', {
        name: 'Bounce Form', emoji: '🏓', color: 0xffaacc, priority: 108, until: endTime,
        description: 'Balled up and bouncing — enemy projectiles that come near are reflected back.',
      });
    }

    // The paddle itself is painted in paintWorld; here we only reflect.
    // Reflect nearby enemy projectiles
    const children = projectiles.getChildren();
    for (const go of children) {
      const proj = go as unknown as Projectile;
      if (!proj.active) continue;
      const isEnemyProj = isPlayer ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!isEnemyProj) continue;
      const d = Phaser.Math.Distance.Between(proj.x, proj.y, caster.x, caster.y);
      if (d > BOUNCE_REFLECT_RADIUS) continue;

      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2) || 1;
      const newSpd = spd * BOUNCE_REFLECT_SPEED;
      // Flip direction
      body.setVelocity((-body.velocity.x / spd) * newSpd, (-body.velocity.y / spd) * newSpd);
      (proj as unknown as Record<string, unknown>)['isFromPlayer'] = isPlayer;
      (proj as unknown as Record<string, unknown>)['rubberHomingTarget'] = isPlayer ? npc : player;
      // The membrane slaps it: a squash exactly where it bounced.
      this.fx(owner).boing(proj.x, proj.y, 4, 26, RUBBER.pink, 260, 9, 3);

      if (isPlayer) {
        this.arena.recordMasteryStat('reflects', 1);
        // Vulcanization 75%+: the bullet leaves your skin superheated.
        if (this.vulcFire()) {
          (proj as unknown as Record<string, unknown>)['damage'] = Math.round(proj.damage * VULC_FIRE_REFLECT_MULT);
          // Read back in ArenaScene.applyProjectileToEnemy to light the target up.
          (proj as unknown as Record<string, unknown>)['rubberParryFireDot'] = VULC_FIRE_DOT_MS;
          (proj as unknown as Phaser.GameObjects.Image).setTint?.(RUBBER.flame);
          this.pfx.heatBurst(proj.x, proj.y, 18);
        }
      }
    }
  }

  private steerHomingProjectiles(): void {
    const { projectiles } = this.arena;
    const TURN = 0.08;

    for (const go of projectiles.getChildren()) {
      const proj = go as unknown as Record<string, unknown>;
      if (!(proj as unknown as Phaser.GameObjects.GameObject).active) continue;
      const target = proj['rubberHomingTarget'] as Fighter | undefined;
      if (!target) continue;
      if (!target.active) { proj['rubberHomingTarget'] = undefined; continue; }

      const body = (proj as unknown as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const px = (proj as unknown as Phaser.Physics.Arcade.Sprite).x;
      const py = (proj as unknown as Phaser.Physics.Arcade.Sprite).y;
      const dx = target.x - px;
      const dy = target.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      body.setVelocity(
        body.velocity.x + ((dx / dist) * spd - body.velocity.x) * TURN,
        body.velocity.y + ((dy / dist) * spd - body.velocity.y) * TURN,
      );
    }
  }

  // ── Rubber Banding helpers ─────────────────────────────────────────────────

  private distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax; const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx; const cy = ay + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  private startBandRecall(owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const anchorX = owner === 'player' ? this.bandAnchorX : this.npcBandAnchorX;
    const anchorY = owner === 'player' ? this.bandAnchorY : this.npcBandAnchorY;
    const startX = caster.x; const startY = caster.y;
    const dx = anchorX - startX; const dy = anchorY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) return;

    const time = this.arena.scene.time.now;
    (caster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    if (owner === 'player') {
      this.bandRecalling = true;
      this.bandRecallFromX = startX; this.bandRecallFromY = startY;
      this.bandRecallToX = anchorX; this.bandRecallToY = anchorY;
      this.bandRecallStart = time;
      this.arena.setIsDodging(true);
      player.isInvincible = true;
      // The band takes up all its slack at once and drags you down it.
      this.pfx.smear(startX, startY, anchorX, anchorY, { color: RUBBER.blush, width: 18, duration: 300 });
      this.pfx.boing(startX, startY, 6, 34, RUBBER.blush, 300, 7, 4);
      this.arena.showFloatingText(caster.x, caster.y - 40, '↩ SNAP!', '#ff5577');

      // F+ Reinforced Band: contact damage to anything along the snap path
      if (this.bandReinforced) {
        const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [npc];
        for (const t of targets) {
          if (!t.active) continue;
          if (this.distPointToSegment(t.x, t.y, startX, startY, anchorX, anchorY) < BAND_RECALL_HIT_RADIUS) {
            t.takeDamage(BAND_RECALL_CONTACT_DMG);
            this.arena.spawnHitFlash(t.x, t.y, RUBBER.rose);
            this.pfx.boom(t.x, t.y, 46, { color: RUBBER.blush, shreds: 6, mark: false });
          }
        }
      }
    } else {
      this.nfx.smear(startX, startY, anchorX, anchorY, { color: RUBBER.blush, width: 16, duration: 300 });
      this.npcBandRecalling = true;
      this.npcBandRecallFromX = startX; this.npcBandRecallFromY = startY;
      this.npcBandRecallToX = anchorX; this.npcBandRecallToY = anchorY;
      this.npcBandRecallStart = time;
    }
  }

  private startBandPull(time: number): void {
    const { player } = this.arena;
    const anchorX = this.bandAnchorX; const anchorY = this.bandAnchorY;
    const dx = player.x - anchorX; const dy = player.y - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) return;

    const tension = Math.min(1, dist / BAND_MAX_STRETCH);
    // Vulcanization whips the anchor in faster — and a faster anchor hits harder (see updateBand).
    const speed = (BAND_ANCHOR_MIN_SPEED + (BAND_ANCHOR_MAX_SPEED - BAND_ANCHOR_MIN_SPEED) * tension)
      * (1 + VULC_ANCHOR * this.vulcK());
    const overshoot = BAND_ANCHOR_MAX_OVERSHOOT * tension;
    const totalDist = dist + overshoot;

    this.bandAnchorFlying = true;
    this.bandAnchorFlyDirX = dx / dist; this.bandAnchorFlyDirY = dy / dist;
    this.bandAnchorFlySpeed = speed;
    this.bandAnchorFlyEnd = time + (totalDist / speed) * 1000;
    this.bandAnchorFlyTension = tension;
    this.bandAnchorFlyHitSet.clear();
    // The anchor tears free and comes at you, harder the more tension it was under.
    this.pfx.boing(anchorX, anchorY, 6, 30 + 26 * tension, RUBBER.blush, 340, 8, 4);
    this.pfx.scuff(anchorX, anchorY, 18 + 12 * tension, 3);
    this.arena.showFloatingText(player.x, player.y - 40, '⬅ REEL IN!', '#ff77aa');
  }

  private updateBand(time: number, delta: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const active = isPlayer ? this.bandActive : this.npcBandActive;
    if (!active) return;

    const { player, npc, enemies, width, height } = this.arena;
    const caster = isPlayer ? player : npc;
    const createdAt = isPlayer ? this.bandCreatedAt : this.npcBandCreatedAt;
    const lifetimeMs = isPlayer ? this.bandLifetimeMs : this.npcBandLifetimeMs;

    if (time > createdAt + lifetimeMs) {
      this.expireBand(owner);
      return;
    }

    let anchorX = isPlayer ? this.bandAnchorX : this.npcBandAnchorX;
    let anchorY = isPlayer ? this.bandAnchorY : this.npcBandAnchorY;

    // Anchor-flying (player pulling the anchor toward themselves)
    if (isPlayer && this.bandAnchorFlying) {
      if (time >= this.bandAnchorFlyEnd) {
        this.bandAnchorFlying = false;
        this.bandAnchorFlyHitSet.clear();
      } else {
        const dtS = delta / 1000;
        anchorX += this.bandAnchorFlyDirX * this.bandAnchorFlySpeed * dtS;
        anchorY += this.bandAnchorFlyDirY * this.bandAnchorFlySpeed * dtS;
        const wallL = 25 + BAND_ANCHOR_RADIUS; const wallR = width - 25 - BAND_ANCHOR_RADIUS;
        const wallT = 85 + BAND_ANCHOR_RADIUS; const wallB = height - 25 - BAND_ANCHOR_RADIUS;
        anchorX = Math.max(wallL, Math.min(wallR, anchorX));
        anchorY = Math.max(wallT, Math.min(wallB, anchorY));
        this.bandAnchorX = anchorX; this.bandAnchorY = anchorY;

        // The flying anchor damages anything it passes through, harder the more tension it was reeled in under.
        const flyTargets = enemies.length > 0 ? enemies : [npc];
        const flyDmg = Math.round(
          (BAND_ANCHOR_MIN_FLY_DMG + (BAND_ANCHOR_MAX_FLY_DMG - BAND_ANCHOR_MIN_FLY_DMG) * this.bandAnchorFlyTension)
          * (1 + VULC_ANCHOR * this.vulcK()),
        );
        for (const t of flyTargets) {
          if (!t.active || t.hp <= 0 || this.bandAnchorFlyHitSet.has(t)) continue;
          if (Phaser.Math.Distance.Between(anchorX, anchorY, t.x, t.y) <= BAND_ANCHOR_HIT_RADIUS) {
            this.bandAnchorFlyHitSet.add(t);
            t.takeDamage(flyDmg);
            this.arena.spawnHitFlash(t.x, t.y, RUBBER.rose);
            this.pfx.boom(anchorX, anchorY, 30 + flyDmg, {
              color: RUBBER.blush, shreds: 4 + Math.round(flyDmg / 5), mark: false,
            });
          }
        }
      }
    }

    // F+ Bouncy Anchor: the ball can no longer be broken, so instead it rolls — attacks
    // batter it around the arena and it bounces off the walls until friction stops it.
    if (isPlayer && this.bouncyAnchor()) {
      this.updateBouncyAnchor(time, delta);
      anchorX = this.bandAnchorX; anchorY = this.bandAnchorY;
    }

    // Vulcanization 75%+: the anchor runs hot and pulses fire at whatever is stood near it.
    if (isPlayer && this.vulcFire() && time >= this.vulcAnchorPulseAt) {
      this.vulcAnchorPulseAt = time + VULC_FIRE_ANCHOR_PERIOD_MS;
      this.pulseAnchorFire(anchorX, anchorY);
    }

    // Snap-back recall: lerp position directly rather than relying on physics velocity
    // (the caster's Arcade body damps burst velocity within a couple of frames, which
    // made a dashCaster-based recall undershoot the anchor badly — verified via the
    // /verify browser harness).
    const recalling = isPlayer ? this.bandRecalling : this.npcBandRecalling;
    if (recalling) {
      const recallStart = isPlayer ? this.bandRecallStart : this.npcBandRecallStart;
      const fromX = isPlayer ? this.bandRecallFromX : this.npcBandRecallFromX;
      const fromY = isPlayer ? this.bandRecallFromY : this.npcBandRecallFromY;
      const toX = isPlayer ? this.bandRecallToX : this.npcBandRecallToX;
      const toY = isPlayer ? this.bandRecallToY : this.npcBandRecallToY;
      const t = Math.min(1, (time - recallStart) / BAND_RECALL_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      caster.setPosition(fromX + (toX - fromX) * eased, fromY + (toY - fromY) * eased);
      (caster.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      if (t >= 1) {
        if (isPlayer) {
          this.bandRecalling = false;
          this.arena.setIsDodging(false);
          player.isInvincible = false;
        } else {
          this.npcBandRecalling = false;
        }
      }
    }

    // NPC auto-recall when overstretched (simplified AI usage)
    if (!isPlayer && !this.npcBandRecalling) {
      const ndx = caster.x - anchorX; const ndy = caster.y - anchorY;
      const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
      if (ndist > BAND_COMFORT_RADIUS * 1.3 && time >= this.npcBandNextAutoCheck) {
        this.npcBandNextAutoCheck = time + NPC_BAND_AUTO_RECALL_CHECK_MS;
        this.startBandRecall('npc');
      }
    }

    // Slow when stretched beyond the comfort radius — the penalty is squared so it's
    // barely noticeable near the comfort radius but bites hard as tension nears max stretch.
    const dx = caster.x - anchorX; const dy = caster.y - anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > BAND_COMFORT_RADIUS) {
      const over = Math.min(1, (dist - BAND_COMFORT_RADIUS) / (BAND_MAX_STRETCH - BAND_COMFORT_RADIUS));
      const mult = 1 - (over * over) * (1 - BAND_MIN_SPEED_MULT);
      if (isPlayer) this.arena.applyPlayerSpeedMult(mult);
      else this.arena.applyNpcSpeedMult(mult);
    }
    // The band and its anchor are painted in paintWorld, off this same live state.
    void caster;
  }

  private expireBand(owner: 'player' | 'npc'): void {
    const ax = owner === 'player' ? this.bandAnchorX : this.npcBandAnchorX;
    const ay = owner === 'player' ? this.bandAnchorY : this.npcBandAnchorY;
    const caster = this.fighter(owner);
    // Perishing: the band gives out where it was thinnest, and the anchor drops.
    this.fx(owner).snap(ax, ay, caster.x, caster.y, { color: RUBBER.blush, width: 5 });
    this.fx(owner).scuff(ax, ay, 16, 3);
    if (owner === 'player') {
      this.bandActive = false;
      this.bandAnchorFlying = false;
      this.bandAnchorKnockVx = 0; this.bandAnchorKnockVy = 0;
    } else {
      this.npcBandActive = false;
    }
  }

  private shatterBand(owner: 'player' | 'npc'): void {
    const anchorX = owner === 'player' ? this.bandAnchorX : this.npcBandAnchorX;
    const anchorY = owner === 'player' ? this.bandAnchorY : this.npcBandAnchorY;
    this.expireBand(owner);
    if (owner === 'player') this.arena.showFloatingText(anchorX, anchorY - 20, '💥 SHATTERED', '#ffaacc');
    // A hard anchor doesn't deform, it comes apart — chunks of cured rubber everywhere.
    this.fx(owner).boom(anchorX, anchorY, 52, {
      color: RUBBER.cured, shreds: 10, rings: 2, duration: 460,
    });
  }

  // ── Rubberage helpers ───────────────────────────────────────────────────────

  private clearRubberageBalls(owner: 'player' | 'npc'): void {
    if (owner === 'player') {
      this.rubberageBalls = [];
      this.rubberageEnd = 0;
    } else {
      this.npcRubberageBalls = [];
      this.npcRubberageEnd = 0;
    }
  }

  private updateRubberageBalls(time: number, delta: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const balls = isPlayer ? this.rubberageBalls : this.npcRubberageBalls;
    if (balls.length === 0) return;
    const end = isPlayer ? this.rubberageEnd : this.npcRubberageEnd;
    const dmg = isPlayer ? this.rubberageDmg : this.npcRubberageDmg;

    if (time > end) {
      this.clearRubberageBalls(owner);
      return;
    }

    const { width, height } = this.arena;
    const wallL = 25 + RUBBERAGE_RADIUS; const wallR = width - 25 - RUBBERAGE_RADIUS;
    const wallT = 85 + RUBBERAGE_RADIUS; const wallB = height - 25 - RUBBERAGE_RADIUS;
    const dt = delta / 1000;
    // Vulcanization spins the player's swarm up to full speed much sooner.
    const accel = isPlayer ? 1 + VULC_RUBBERAGE_ACCEL * this.vulcK() : 1;
    const growth = 1 + delta * RUBBERAGE_SPEED_GROWTH_PER_MS * accel;
    // Vulcanization 75%+: burning-hot balls that hit harder and leave fires behind.
    const onFire = isPlayer && this.vulcFire();
    const hitDmg = dmg + (onFire ? VULC_FIRE_BALL_BONUS_DMG : 0);

    for (const ball of balls) {
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
      if (spd < RUBBERAGE_MAX_SPEED) {
        const newSpd = Math.min(RUBBERAGE_MAX_SPEED, spd * growth);
        ball.vx = (ball.vx / spd) * newSpd;
        ball.vy = (ball.vy / spd) * newSpd;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < wallL) { ball.x = wallL; ball.vx = Math.abs(ball.vx); }
      else if (ball.x > wallR) { ball.x = wallR; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < wallT) { ball.y = wallT; ball.vy = Math.abs(ball.vy); }
      else if (ball.y > wallB) { ball.y = wallB; ball.vy = -Math.abs(ball.vy); }
    }

    // Ball-ball collisions (equal-mass elastic reflection along the collision normal)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]; const b = balls[j];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = RUBBERAGE_RADIUS * 2;
        if (d > 0 && d < minD) {
          const nx = dx / d; const ny = dy / d;
          const overlap = (minD - d) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap;
          b.x += nx * overlap; b.y += ny * overlap;
          const avn = a.vx * nx + a.vy * ny;
          const bvn = b.vx * nx + b.vy * ny;
          a.vx += (bvn - avn) * nx; a.vy += (bvn - avn) * ny;
          b.vx += (avn - bvn) * nx; b.vy += (avn - bvn) * ny;
        }
      }
    }

    // Fighter collisions: damage + heavy knockback, ball bounces off the target
    const targets = this.arena.enemies.length > 0 ? this.arena.enemies : [owner === 'player' ? this.arena.npc : this.arena.player];
    for (const ball of balls) {
      for (const tgt of targets) {
        if (!tgt.active) continue;
        const dx = tgt.x - ball.x; const dy = tgt.y - ball.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < RUBBERAGE_RADIUS + RUBBERAGE_FIGHTER_RADIUS && time - ball.lastHitAt > RUBBERAGE_HIT_COOLDOWN_MS) {
          ball.lastHitAt = time;
          const wasAlive = tgt.hp > 0;
          tgt.takeDamage(hitDmg);
          this.noteUberHit(owner);
          if (onFire) this.applyFireDot(tgt);
          if (isPlayer && wasAlive && tgt.hp <= 0) this.arena.recordMasteryStat('rubberageKills', 1);
          this.arena.spawnHitFlash(tgt.x, tgt.y, onFire ? RUBBER.flame : RUBBER.rose);
          // Each ball leaves its own squash where it caught them.
          this.fx(owner).boing(ball.x, ball.y, 4, onFire ? 34 : 26,
            onFire ? RUBBER.gold : RUBBER.pink, 280, 9, 3);
          const body = tgt.body as Phaser.Physics.Arcade.Body | null;
          if (body) body.setVelocity((dx / d) * RUBBERAGE_KNOCKBACK, (dy / d) * RUBBERAGE_KNOCKBACK);
          const ballSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
          ball.vx = -(dx / d) * ballSpd;
          ball.vy = -(dy / d) * ballSpd;
          break;
        }
      }
    }
  }

  // ── Click+ Rubber Bazooka ──────────────────────────────────────────────────

  private fireBazooka(mouseX: number, mouseY: number, overRatio: number): void {
    const { player, scene } = this.arena;
    const dx = mouseX - player.x;
    const dy = mouseY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // Fires opposite the pull, matching the melee punch's slingshot feel.
    const dirX = -dx / dist, dirY = -dy / dist;
    // Fixed 50 damage on a fully over-stretched (max charge) release.
    void overRatio;
    const dmg = 50;
    this.bazookas.push({
      x: player.x, y: player.y,
      vx: dirX * BAZOOKA_SPEED, vy: dirY * BAZOOKA_SPEED,
      dmg, bouncesLeft: 3, hitAt: new Map(),
      path: [{ x: player.x, y: player.y }],
      returning: false,
    });
    // An over-stretched release is a much bigger event than a punch, and looks it.
    this.gesture('player', 'rubber-punch', Math.atan2(dirY, dirX));
    this.pfx.flash(player.x, player.y, 30, 10, RUBBER.charge);
    this.pfx.boing(player.x, player.y, 10, 96, RUBBER.gold, 480, 7, 7);
    this.pfx.motes(player.x, player.y, 14, {
      speed: 260, angle: Math.atan2(dirY, dirX), spread: 1.1, size: 2.6, life: 560, color: RUBBER.gold,
    });
    scene.cameras.main.shake(180, 0.005);
    this.arena.showFloatingText(player.x, player.y - 44, '🥊 BAZOOKA!', '#ff5577');
  }

  private updateBazookas(time: number, delta: number): void {
    if (this.bazookas.length === 0) return;
    const { player, width, height, enemies, npc } = this.arena;
    const wallL = 25 + BAZOOKA_RADIUS, wallR = width - 25 - BAZOOKA_RADIUS;
    const wallT = 85 + BAZOOKA_RADIUS, wallB = height - 25 - BAZOOKA_RADIUS;
    const dt = delta / 1000;
    const targets = enemies.length > 0 ? enemies : [npc];

    for (let i = this.bazookas.length - 1; i >= 0; i--) {
      const b = this.bazookas[i];

      if (!b.returning) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.path.push({ x: b.x, y: b.y });

        let bounced = false;
        if (b.x < wallL) { b.x = wallL; b.vx = Math.abs(b.vx); bounced = true; }
        else if (b.x > wallR) { b.x = wallR; b.vx = -Math.abs(b.vx); bounced = true; }
        if (b.y < wallT) { b.y = wallT; b.vy = Math.abs(b.vy); bounced = true; }
        else if (b.y > wallB) { b.y = wallB; b.vy = -Math.abs(b.vy); bounced = true; }
        if (bounced) {
          b.bouncesLeft--;
          this.pfx.boing(b.x, b.y, 6, 34, RUBBER.pink, 280, 8, 4);
          this.pfx.motes(b.x, b.y, 4, { speed: 120, size: 2, life: 360 });
          // After bouncing off up to 3 walls it snaps back along its path to the user.
          if (b.bouncesLeft < 0) b.returning = true;
        }
      } else {
        // Retrace the recorded path backward at high speed, then despawn at the user.
        let budget = BAZOOKA_SNAP_SPEED * dt;
        let reachedUser = false;
        while (budget > 0) {
          const target = b.path.length > 0 ? b.path[b.path.length - 1] : { x: player.x, y: player.y };
          const dx = target.x - b.x, dy = target.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= budget) {
            b.x = target.x; b.y = target.y; budget -= d;
            if (b.path.length > 0) b.path.pop();
            else { reachedUser = true; break; }
          } else {
            b.x += (dx / d) * budget; b.y += (dy / d) * budget; budget = 0;
          }
        }
        if (reachedUser) {
          this.pfx.boing(player.x, player.y, 26, 6, RUBBER.rose, 260, 8, 4);
          this.bazookas.splice(i, 1);
          continue;
        }
      }

      // Contact damage — can re-hit the same target twice per second.
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (time - (b.hitAt.get(t) ?? -1000) < 500) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= BAZOOKA_RADIUS + 20) {
          b.hitAt.set(t, time);
          t.takeDamage(b.dmg);
          // The bazooka IS the fully charged click, so it ignites at 75%+ cure too.
          const ignites = this.vulcFire();
          if (ignites) this.applyFireDot(t);
          this.arena.recordMasteryStat('bazookaHits', 1);
          this.arena.spawnHitFlash(t.x, t.y, ignites ? RUBBER.flame : RUBBER.rose);
          this.pfx.boom(b.x, b.y, ignites ? 92 : 74, {
            color: ignites ? RUBBER.flame : RUBBER.rose,
            shreds: ignites ? 14 : 10, rings: ignites ? 3 : 2, duration: ignites ? 620 : 480,
          });
          if (ignites) this.pfx.heatBurst(t.x, t.y, 40);
          this.arena.scene.cameras.main.shake(190, 0.006);
        }
      }

      // F+ Bouncy Anchor: your own fist sends the superball flying rather than shattering it.
      if (!b.returning && this.bandActive && this.bouncyAnchor()
          && Phaser.Math.Distance.Between(b.x, b.y, this.bandAnchorX, this.bandAnchorY) <= BAZOOKA_RADIUS + BAND_ANCHOR_RADIUS) {
        const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
        this.knockAnchor(b.vx / s, b.vy / s, b.dmg);
      }
    }
  }

  // ── R+ Bounce Combo ────────────────────────────────────────────────────────

  /** True while the reeled-in anchor is flying toward the player (the R-bounce window). */
  private canBounceCombo(): boolean {
    return this.arena.isPlayerRubber && this.arena.hasUpgrade('r') && this.bandActive && this.bandAnchorFlying;
  }

  /** R+ Bounce Combo: bounce the incoming anchor off the player toward the cursor. */
  private startBounceCombo(mouseX: number, mouseY: number): void {
    const { player, scene } = this.arena;
    const dx = mouseX - player.x, dy = mouseY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 1400;
    // Detach the anchor from the band entirely — it flies off the arena.
    this.bandAnchorFlying = false;
    this.expireBand('player');
    this.freeAnchor = {
      x: player.x, y: player.y,
      vx: (dx / dist) * speed, vy: (dy / dist) * speed,
      dmg: 50, hitSet: new Set(),
    };
    // A clean deflection: you catch it and send it back the other way, hard.
    this.pfx.flash(player.x, player.y, 22, 10, RUBBER.ice);
    this.pfx.boing(player.x, player.y, 8, 66, RUBBER.cobalt, 400, 8, 6);
    this.pfx.smear(player.x, player.y, player.x + (dx / dist) * 80, player.y + (dy / dist) * 80,
      { color: RUBBER.sky, width: 18 });
    scene.cameras.main.shake(150, 0.005);
    this.arena.recordMasteryStat('bounceCombos', 1);
    this.arena.showFloatingText(player.x, player.y - 44, '💠 BOUNCE COMBO!', '#5588ff');
  }

  private updateFreeAnchor(time: number, delta: number): void {
    void time;
    const fa = this.freeAnchor;
    if (!fa) return;
    const { width, height, enemies, npc } = this.arena;
    const dt = delta / 1000;
    fa.x += fa.vx * dt;
    fa.y += fa.vy * dt;

    // Damage anything in its path.
    const targets = enemies.length > 0 ? enemies : [npc];
    for (const t of targets) {
      if (!t.active || t.hp <= 0 || fa.hitSet.has(t)) continue;
      if (Phaser.Math.Distance.Between(fa.x, fa.y, t.x, t.y) <= BAND_ANCHOR_HIT_RADIUS) {
        fa.hitSet.add(t);
        t.takeDamage(fa.dmg);
        this.arena.spawnHitFlash(t.x, t.y, RUBBER.cobalt);
        this.pfx.boom(fa.x, fa.y, 82, { color: RUBBER.cobalt, shreds: 11, rings: 2, duration: 500 });
        this.arena.scene.cameras.main.shake(180, 0.005);
      }
    }

    // Flies clean off the arena, then despawns. (Body + after-images live in paintWorld.)
    if (fa.x < -60 || fa.x > width + 60 || fa.y < -60 || fa.y > height + 60) {
      this.freeAnchor = null;
    }
  }

  // ── Q+ purple player-ball ──────────────────────────────────────────────────

  /** Turns the player into a purple rubber ball for the rubberage duration. */
  private startPlayerBall(): void {
    const { player } = this.arena;
    this.playerBallActive = true;
    this.playerBallLastHitAt = 0;
    // Kick off in a random direction; wall bounces then steer toward the cursor.
    const ang = Math.random() * Math.PI * 2;
    this.playerBallVx = Math.cos(ang) * RUBBERAGE_BASE_SPEED;
    this.playerBallVy = Math.sin(ang) * RUBBERAGE_BASE_SPEED;
    player.sizeMult = PLAYER_BALL_SIZE_MULT;
    player.applySizeMult();
    player.setTint(RUBBER.amethyst);
    // Balling up: you collapse into the swarm you just threw.
    this.pfx.boing(player.x, player.y, 40, 10, RUBBER.orchid, 360, 8, 5);
    this.pfx.motes(player.x, player.y, 10, { speed: 140, size: 2.4, life: 520, color: RUBBER.orchid });
  }

  private endPlayerBall(): void {
    const { player } = this.arena;
    this.playerBallActive = false;
    player.sizeMult = 1;
    player.applySizeMult();
    player.clearTint();
    this.pfx.boing(player.x, player.y, 10, 44, RUBBER.orchid, 340, 8, 5);
  }

  private updatePlayerBall(time: number, delta: number): void {
    if (!this.playerBallActive) return;
    const { player, npc, enemies, width, height } = this.arena;
    // End with the rubberage.
    if (time > this.rubberageEnd || player.hp <= 0) { this.endPlayerBall(); return; }

    const dt = delta / 1000;
    // Speeds up over the ability's life, like the other balls.
    const spd = Math.sqrt(this.playerBallVx ** 2 + this.playerBallVy ** 2) || 1;
    if (spd < RUBBERAGE_MAX_SPEED) {
      const growth = 1 + delta * RUBBERAGE_SPEED_GROWTH_PER_MS;
      const ns = Math.min(RUBBERAGE_MAX_SPEED, spd * growth);
      this.playerBallVx = (this.playerBallVx / spd) * ns;
      this.playerBallVy = (this.playerBallVy / spd) * ns;
    }

    let nx = player.x + this.playerBallVx * dt;
    let ny = player.y + this.playerBallVy * dt;
    const r = RUBBERAGE_FIGHTER_RADIUS * PLAYER_BALL_SIZE_MULT;
    const wallL = 25 + r, wallR = width - 25 - r, wallT = 85 + r, wallB = height - 25 - r;
    let bounced = false;
    if (nx < wallL) { nx = wallL; bounced = true; }
    else if (nx > wallR) { nx = wallR; bounced = true; }
    if (ny < wallT) { ny = wallT; bounced = true; }
    else if (ny > wallB) { ny = wallB; bounced = true; }
    // On a wall bounce, redirect toward the cursor.
    if (bounced) {
      this.pfx.boing(nx, ny, 5, 28, RUBBER.orchid, 260, 7, 3);
      const cx = this.punchMouseX - nx, cy = this.punchMouseY - ny;
      const cd = Math.sqrt(cx * cx + cy * cy) || 1;
      const curSpd = Math.sqrt(this.playerBallVx ** 2 + this.playerBallVy ** 2) || 1;
      this.playerBallVx = (cx / cd) * curSpd;
      this.playerBallVy = (cy / cd) * curSpd;
    }

    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(nx, ny);
    body.setVelocity(this.playerBallVx, this.playerBallVy);

    // Contact: 5 dmg + a bit of knockback.
    const targets = enemies.length > 0 ? enemies : [npc];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const dx = t.x - nx, dy = t.y - ny;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < r + RUBBERAGE_FIGHTER_RADIUS && time - this.playerBallLastHitAt > RUBBERAGE_HIT_COOLDOWN_MS) {
        this.playerBallLastHitAt = time;
        const wasAlive = t.hp > 0;
        t.takeDamage(5 + (this.vulcFire() ? VULC_FIRE_BALL_BONUS_DMG : 0));
        if (this.vulcFire()) this.applyFireDot(t);
        if (wasAlive && t.hp <= 0) this.arena.recordMasteryStat('rubberageKills', 1);
        this.arena.spawnHitFlash(t.x, t.y, RUBBER.amethyst);
        this.pfx.boing(nx, ny, 4, 32, RUBBER.orchid, 280, 9, 3);
        const tb = t.body as Phaser.Physics.Arcade.Body | null;
        if (tb) tb.setVelocity((dx / d) * 320, (dy / d) * 320);
        // Bounce back off the target.
        const s = Math.sqrt(this.playerBallVx ** 2 + this.playerBallVy ** 2) || 1;
        this.playerBallVx = -(dx / d) * s;
        this.playerBallVy = -(dy / d) * s;
      }
    }
  }

  // ── F+ Bouncy Anchor ───────────────────────────────────────────────────────

  /** True when the player's anchor is the unbreakable superball rather than dead weight. */
  private bouncyAnchor(): boolean {
    return this.arena.isPlayerRubber && this.arena.hasUpgrade('f');
  }

  /**
   * Send the superball flying. Direction is the attack's own travel direction; the shove
   * scales with how much damage the attack was carrying, so a bazooka fist punts it across
   * the arena while a stray pellet barely nudges it.
   */
  private knockAnchor(dirX: number, dirY: number, dmg: number): void {
    const time = this.arena.scene.time.now;
    if (time - this.bandAnchorLastKnockAt < 200) return;
    this.bandAnchorLastKnockAt = time;

    const power = Math.min(BOUNCY_ANCHOR_KNOCK_MAX, BOUNCY_ANCHOR_KNOCK_BASE + dmg * BOUNCY_ANCHOR_KNOCK_PER_DMG);
    const d = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    this.bandAnchorKnockVx = (dirX / d) * power;
    this.bandAnchorKnockVy = (dirY / d) * power;
    // A flying reel-in is cancelled — the ball is loose again.
    this.bandAnchorFlying = false;

    // The superball takes the hit and keeps every bit of it — the ring scales with the punt.
    const k = power / BOUNCY_ANCHOR_KNOCK_MAX;
    this.pfx.flash(this.bandAnchorX, this.bandAnchorY, 12 + 12 * k, 10, RUBBER.ice);
    this.pfx.boing(this.bandAnchorX, this.bandAnchorY, 6, 28 + 46 * k, RUBBER.sky, 320, 9, 4);
    this.pfx.motes(this.bandAnchorX, this.bandAnchorY, 4 + Math.round(k * 8), {
      speed: 120 + k * 180, angle: Math.atan2(dirY, dirX), spread: 1, size: 2.2, life: 420, color: RUBBER.ice,
    });
    this.arena.showFloatingText(this.bandAnchorX, this.bandAnchorY - 24, '🔵 BOING!', '#88ccff');
  }

  /**
   * Roll the knocked superball: integrate its velocity, bounce it off the arena walls, bleed
   * it off with friction, and let enemy fire batter it around too.
   */
  private updateBouncyAnchor(time: number, delta: number): void {
    const { width, height, projectiles } = this.arena;
    const dt = delta / 1000;

    // Any live projectile that touches the ball shoves it and is spent doing so.
    for (const go of projectiles.getChildren()) {
      const proj = go as unknown as Projectile;
      if (!proj.active) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, this.bandAnchorX, this.bandAnchorY) > BAND_ANCHOR_RADIUS + 10) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      const vx = body?.velocity.x ?? 0;
      const vy = body?.velocity.y ?? 0;
      this.knockAnchor(vx, vy, proj.damage ?? 0);
      this.arena.spawnHitFlash(proj.x, proj.y, RUBBER.ice);
      proj.destroy();
      break;
    }

    const speed = Math.sqrt(this.bandAnchorKnockVx ** 2 + this.bandAnchorKnockVy ** 2);
    if (speed < 1) { this.bandAnchorKnockVx = 0; this.bandAnchorKnockVy = 0; return; }

    let x = this.bandAnchorX + this.bandAnchorKnockVx * dt;
    let y = this.bandAnchorY + this.bandAnchorKnockVy * dt;
    const wallL = 25 + BAND_ANCHOR_RADIUS; const wallR = width - 25 - BAND_ANCHOR_RADIUS;
    const wallT = 85 + BAND_ANCHOR_RADIUS; const wallB = height - 25 - BAND_ANCHOR_RADIUS;
    let hitWall = false;
    if (x < wallL) { x = wallL; this.bandAnchorKnockVx = Math.abs(this.bandAnchorKnockVx); hitWall = true; }
    else if (x > wallR) { x = wallR; this.bandAnchorKnockVx = -Math.abs(this.bandAnchorKnockVx); hitWall = true; }
    if (y < wallT) { y = wallT; this.bandAnchorKnockVy = Math.abs(this.bandAnchorKnockVy); hitWall = true; }
    else if (y > wallB) { y = wallB; this.bandAnchorKnockVy = -Math.abs(this.bandAnchorKnockVy); hitWall = true; }
    this.bandAnchorX = x; this.bandAnchorY = y;
    // Every wall it caroms off gets its own bounce, scaled by how fast it was still going.
    if (hitWall && speed > 90) {
      this.pfx.boing(x, y, 5, 10 + speed * 0.03, RUBBER.sky, 260, 8, 3);
    }

    const decay = Math.max(0, 1 - BOUNCY_ANCHOR_FRICTION * dt);
    this.bandAnchorKnockVx *= decay;
    this.bandAnchorKnockVy *= decay;
    void time;
  }

  // ── Mastery: Vulcanization ─────────────────────────────────────────────────

  /**
   * The back-loaded response curve every Vulcanization bonus is scaled by. Returns 0 when
   * the mastery isn't active so every call site can multiply through unconditionally.
   */
  private vulcK(): number {
    if (!this.arena.masteryActive) return 0;
    return Math.pow(this.vulc, VULC_CURVE_EXP);
  }

  // ── Uber-Gear (perk) ───────────────────────────────────────────────────────

  /**
   * The elasticity every Uber-Gear bonus is scaled by, 0 when the perk isn't equipped —
   * same shape as vulcK() so call sites can multiply through unconditionally.
   */
  private uberK(owner: 'player' | 'npc'): number {
    return this.arena.hasPerk(owner, 'uber-gear') ? this.uber[owner] : 0;
  }

  /** Any rubber hit winds the gear another notch and resets the unwind clock. */
  private noteUberHit(owner: 'player' | 'npc'): void {
    if (!this.arena.hasPerk(owner, 'uber-gear')) return;
    const time = this.arena.scene.time.now;
    this.uberLastHitAt[owner] = time;
    const before = this.uber[owner];
    this.uber[owner] = Math.min(UBER_MAX,
      before + meterGain(owner === 'player' ? this.arena.player : this.arena.npc, UBER_GAIN_PER_HIT));
    if (before < UBER_MAX && this.uber[owner] >= UBER_MAX) {
      const f = owner === 'player' ? this.arena.player : this.arena.npc;
      this.arena.showFloatingText(f.x, f.y - 52, '🪀 UBER-GEAR MAXED', '#ff88aa');
    }
  }

  private updateUber(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      if (this.uber[owner] <= 0) continue;
      if (!this.arena.hasPerk(owner, 'uber-gear')) { this.uber[owner] = 0; continue; }
      if (time - this.uberLastHitAt[owner] < UBER_IDLE_MS) continue;
      this.uber[owner] = Math.max(0, this.uber[owner] - UBER_DECAY_PER_SEC * (delta / 1000));
    }

    const k = this.uberK('player');
    if (k > 0.001) {
      this.arena.setStatusIndicator('uber-gear', {
        name: 'Uber-Gear', emoji: '🪀', color: 0xff5577,
        description: 'Wound-up elasticity: boosts punch damage, sling launch speed and Rubberage ball damage. Winds up on every rubber hit, unwinds after 5s without one.',
        count: Math.round(k * 100), suffix: '%', priority: 118,
      });
      this.uberIndicatorShown = true;
    } else if (this.uberIndicatorShown) {
      this.arena.setStatusIndicator('uber-gear', null);
      this.uberIndicatorShown = false;
    }
  }

  /** True once the rubber is cured hot enough to set things alight. */
  private vulcFire(): boolean {
    return this.arena.masteryActive && this.vulc >= VULC_FIRE_THRESHOLD;
  }

  /** Click wind-up length — Vulcanization shortens it. */
  private punchMaxHoldMs(): number {
    return PUNCH_MAX_HOLD_MS * (1 - VULC_CHARGE_CUT * this.vulcK());
  }

  /** Set a target alight with the standard generic burn DOT. */
  private applyFireDot(t: Fighter, ms: number = VULC_FIRE_DOT_MS): void {
    t.burningUntil = Math.max(t.burningUntil, this.arena.scene.time.now + Math.round(ms * t.statusDurMult));
  }

  /** Everything the given side is allowed to hurt. */
  private aoeTargets(owner: 'player' | 'npc'): Fighter[] {
    if (owner === 'npc') return [this.arena.player];
    return this.arena.enemies.length > 0 ? this.arena.enemies : [this.arena.npc];
  }

  /** Damage soaked by the player cures more rubber. Wired from ArenaScene's onDamaged hook. */
  onPlayerDamaged(amount: number): void {
    if (!this.arena.masteryActive || this.vulc >= 1 || amount <= 0) return;
    const before = this.vulc;
    this.vulc = Math.min(1, this.vulc + amount / (VULC_DMG_PER_PCT * 100));
    if (before < VULC_FIRE_THRESHOLD && this.vulc >= VULC_FIRE_THRESHOLD) {
      // Crossing into fire is the single most important moment of the passive — it gets an event.
      const { player } = this.arena;
      this.pfx.flash(player.x, player.y, 40, 10, RUBBER.gold);
      this.pfx.boing(player.x, player.y, 12, 130, RUBBER.flame, 620, 7, 8);
      this.pfx.heatBurst(player.x, player.y, 52);
      this.pfx.shreds(player.x, player.y, 12, { speed: 240, size: 8, life: 700, color: RUBBER.cured });
      this.arena.scene.cameras.main.shake(240, 0.006);
      this.arena.showFloatingText(player.x, player.y - 50, '🔥 VULCANIZED!', '#ff7733');
    }
  }

  /** Applies the cure's standing effects: cooldown cut, body tint, heat aura, HUD chip. */
  private updateVulcanization(time: number, delta: number): void {
    const { player } = this.arena;
    if (!this.arena.masteryActive) return;

    // Cooldowns are scaled off whatever the rest of the game set as the baseline.
    if (!this.vulcCdMultCaptured) {
      this.vulcCdMultBase = player.cooldownMult;
      this.vulcCdMultCaptured = true;
    }
    player.cooldownMult = this.vulcCdMultBase * (1 - VULC_COOLDOWN_CUT * this.vulcK());

    // Body darkens toward cured black rubber, then glows once it runs hot.
    // The Q+ purple ball owns the tint while it's up, so leave it alone there.
    if (this.vulc > 0 && !this.playerBallActive) {
      const k = this.vulcK();
      const r = Math.round(255 - 40 * k);
      const g = Math.round(255 - 190 * k);
      const b = Math.round(255 - 190 * k);
      player.setTint(Phaser.Display.Color.GetColor(r, g, b));
    }

    // The standing tell is RubberAura 'vulc', driven from `this.vulc` in updateAuras.
    this.arena.setStatusIndicator('vulcanization', {
      name: 'Vulcanization',
      emoji: this.vulcFire() ? '🔥' : '🛞',
      color: this.vulcFire() ? 0xff7733 : 0x992233,
      count: Math.round(this.vulc * 100),
      suffix: '%',
      priority: 104,
      description: this.vulcFire()
        ? 'Cured and running hot: faster charge, sling, anchor and Rubberage, shorter cooldowns — and everything you hit catches fire.'
        : 'Soaking damage cures your rubber. Faster charge, sling, anchor and Rubberage, plus shorter cooldowns. At 75% you catch fire.',
    });
    void delta;
    void time;
  }

  /** Vulcanization 75%+: the anchor spits a ring of fire at whatever is stood near it. */
  private pulseAnchorFire(x: number, y: number): void {
    this.pfx.heatBurst(x, y, VULC_FIRE_ANCHOR_RADIUS * 0.7);
    this.pfx.boing(x, y, 12, VULC_FIRE_ANCHOR_RADIUS, RUBBER.flame, 420, 6, 6);
    for (const t of this.aoeTargets('player')) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > VULC_FIRE_ANCHOR_RADIUS) continue;
      t.takeDamage(VULC_FIRE_ANCHOR_DMG);
      this.applyFireDot(t);
      this.arena.spawnHitFlash(t.x, t.y, RUBBER.flame);
      this.pfx.shreds(t.x, t.y, 5, { speed: 150, size: 5, life: 480, color: RUBBER.gold });
    }
  }

  // ── Mastery: Atom-Nhilego ──────────────────────────────────────────────────

  /** Which slot Atom-Nhilego is bound over this match, or null when it isn't bound. */
  private nhilegoSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.arena.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'atom-nhilego') return s;
    }
    return null;
  }

  /** HUD ability-bar fill for the bound Atom-Nhilego slot. */
  getAtomNhilegoCooldownRatio(time: number): number {
    return Phaser.Math.Clamp((time - this.nhilegoLastCastAt) / NHILEGO_COOLDOWN_MS, 0, 1);
  }

  private tryCastNhilego(time: number): void {
    if (time < this.nhilegoLastCastAt + NHILEGO_COOLDOWN_MS) return;
    if (this.playerNhilegoShadow) return;
    this.nhilegoLastCastAt = time;
    this.startNhilego('player', time);
    this.arena.broadcastMasteryCast('atom-nhilego');
  }

  /** Online replay: the opposing Rubber player opened a collapse zone on our sim. */
  doNpcAtomNhilego(): void {
    if (this.npcNhilegoShadow) return;
    this.startNhilego('npc', this.arena.scene.time.now);
  }

  private startNhilego(owner: 'player' | 'npc', time: number): void {
    if (owner === 'player') {
      this.playerNhilegoRadius = NHILEGO_START_RADIUS;
      this.playerNhilegoHits = 0;
      const { player } = this.arena;
      this.avatarFor('player')?.play('flex');
      this.pfx.boing(player.x, player.y, 10, 70, RUBBER.orchid, 460, 7, 5);
      this.arena.showFloatingText(player.x, player.y - 40, '⚛ ATOM-NHILEGO!', '#cc88ff');
    } else {
      this.npcNhilegoRadius = NHILEGO_START_RADIUS;
      this.npcNhilegoHits = 0;
    }
    this.spawnNhilegoShadow(owner, time);
  }

  /** Open the next collapse zone somewhere in the arena, fused for 3 seconds. */
  private spawnNhilegoShadow(owner: 'player' | 'npc', time: number): void {
    const { width, height } = this.arena;
    const radius = owner === 'player' ? this.playerNhilegoRadius : this.npcNhilegoRadius;
    const pad = 100;
    const x = pad + Math.random() * Math.max(1, width - pad * 2);
    const y = pad + Math.random() * Math.max(1, height - pad * 2);

    // The zone snaps open, so a new link in the chain is impossible to miss.
    this.fx(owner).boing(x, y, radius * 1.3, radius, RUBBER.orchid, 400, 5, 4);
    const shadow: NhilegoShadow = { x, y, radius, bornAt: time, fireAt: time + NHILEGO_FUSE_MS };
    if (owner === 'player') this.playerNhilegoShadow = shadow;
    else this.npcNhilegoShadow = shadow;
  }

  private tickNhilego(time: number, owner: 'player' | 'npc'): void {
    const shadow = owner === 'player' ? this.playerNhilegoShadow : this.npcNhilegoShadow;
    if (!shadow) return;
    if (time < shadow.fireAt) return;
    this.nhilegoImpact(owner, shadow, time);
  }

  /**
   * Detonate a zone. Standing inside it as the caster keeps the chain alive (and grows the
   * next zone); missing it ends the run and pays out the accumulated heal.
   */
  private nhilegoImpact(owner: 'player' | 'npc', shadow: NhilegoShadow, time: number): void {
    const { x, y, radius } = shadow;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const fx = this.fx(owner);
    const hits = owner === 'player' ? this.playerNhilegoHits : this.npcNhilegoHits;

    // Each link in the chain collapses harder than the last — the content scales, not just the
    // radius, so a five-deep chain is visibly a different event from a first cast.
    fx.boom(x, y, radius, {
      color: RUBBER.amethyst,
      shreds: 8 + hits * 3,
      rings: Math.min(4, 2 + Math.floor(hits / 2)),
      duration: 460 + hits * 80,
    });
    this.arena.scene.cameras.main.shake(160 + hits * 30, 0.004 + hits * 0.001);
    for (const t of this.aoeTargets(owner)) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > radius) continue;
      t.takeDamage(NHILEGO_DMG);
      this.arena.spawnHitFlash(t.x, t.y, RUBBER.orchid);
    }

    const inside = Phaser.Math.Distance.Between(caster.x, caster.y, x, y) <= radius;
    if (inside) {
      if (owner === 'player') {
        this.playerNhilegoRadius *= NHILEGO_GROWTH;
        this.playerNhilegoHits++;
        this.arena.showFloatingText(x, y - 30, `⚛ CHAIN ${this.playerNhilegoHits}`, '#cc88ff');
      } else {
        this.npcNhilegoRadius *= NHILEGO_GROWTH;
        this.npcNhilegoHits++;
      }
      this.spawnNhilegoShadow(owner, time);
      return;
    }

    if (owner === 'player') this.playerNhilegoShadow = null;
    else this.npcNhilegoShadow = null;

    const heal = hits * NHILEGO_HEAL_PER_HIT;
    if (heal > 0) {
      caster.heal(heal);
      if (owner === 'player') this.arena.showFloatingText(caster.x, caster.y - 35, `+${heal}`, '#aaffaa');
    }
  }
}
