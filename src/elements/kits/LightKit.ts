import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  ArmGesture, LIGHT, LightAura, LightAvatar, LightColorFn, LightFx, mixColor,
} from './LightVisuals';

// ── LightArenaApi ─────────────────────────────────────────────────────────

export interface LightArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly npcCastId: string | null;
  readonly width: number;
  readonly height: number;
  readonly hpBarY: number;
  readonly hpBarW: number;
  readonly hpBarH: number;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  lightColor(owner: 'player' | 'npc', base: number): number;
  /** True only when the player is light AND Light Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is light AND has Light Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  broadcastMasteryCast(enhId: string): void;
}

// ── Tuning ──────────────────────────────────────────────────────────────

const CAR_MAX_SPEED = 620;
const CAR_MIN_COAST = 160;
const CAR_ACCEL_RATE = 175; // px/s^2 gained while roughly aimed straight (quartered from the original 700)
const CAR_TURN_BRAKE_RATE = 3600; // px/s^2 lost while cutting a hard turn (quadrupled from the original 900)
const CAR_BASE_TURN_RATE = Math.PI * 2.6; // rad/s turn cap while slow
const CAR_FAST_TURN_RATE = Math.PI * 1.1; // rad/s turn cap at max speed (drift, but still responsive)
const STRAIGHT_THRESHOLD = 0.4; // rad (~23°) — below this counts as a straightaway

const BLINK_MAX_CHARGES = 2;
const BLINK_RECHARGE_MS = 5000;

// Flicker perk: one more charge, a faster refill, and a burning afterimage left behind.
const FLICKER_MAX_CHARGES = 3;
const FLICKER_RECHARGE_MS = 3000;
const FLICKER_FLARE_DELAY_MS = 400;
const FLICKER_FLARE_RADIUS = 62;
const FLICKER_FLARE_DAMAGE = 12;
const BLINK_BOOST_MS = 600;

const MAX_RAMPS = 5;
const RAMP_TRIGGER_RADIUS = 34;
const RAMP_OFFSET = 56;
const RAMP_BOOST_MS = 1500;
const RAMP_LANCE_SPEED = 520;
const RAMP_LANCE_SPREAD_DEG = 22;

const TRICK_RADIUS = 50;
const TRICK_DAMAGE = 5;
const TRICK_BOOST_MS = 1200;

const STREAK_DAMAGE = 15;
const STREAK_HIT_RADIUS = 40;
const STREAK_THICKNESS = 18;
const STREAK_LIFETIME_MS = 900;
const SPEED_O_LIGHT_BOUNCES = 125;
const SPEED_O_LIGHT_BOUNCE_MS = 60;

const BOOST_TARGET_SPEED = CAR_MAX_SPEED / 3; // Prism Ramp / Light Trick boosts now only push you to 1/3 top speed

const LANCE_COLOR_SLOW = LIGHT.pale;
const LANCE_COLOR_FAST = LIGHT.red;

const LANCE_HIT_RADIUS = 30;
const LANCE_BASE_DAMAGE = 6;
const LANCE_MAX_BONUS_DAMAGE = 100; // scales with accel ratio^2, so a max-speed lance hits for 106 vs. ~6 at a crawl
const LANCE_HIT_COOLDOWN_MS = 250;

// ── Click+ Redline ──────────────────────────────────────────────────────
const CLICK_PLUS_MAX_SPEED_MULT = 2;
const CLICK_PLUS_DANGER_RATIO = 0.75;
const CLICK_PLUS_WALL_DAMAGE = 50;

// ── E+ Steam Charge ─────────────────────────────────────────────────────
const E_PLUS_MAX_HOLD_MS = 2000;
const E_PLUS_BOOST_MIN_MS = 400;
const E_PLUS_BOOST_MAX_MS = 1600;
const E_PLUS_STEAM_INTERVAL_MS = 130;

// ── R+ Prism Drill ──────────────────────────────────────────────────────
const DRILL_SPEED = 900;
const DRILL_SLOW_MULT = 0.1;
const DRILL_HIT_RADIUS = 26;
const DRILL_STUN_MS = 500;
const DRILL_STUN_TICK_MS = 500;
const DRILL_MIN_DAMAGE = 2;
const DRILL_MAX_DAMAGE = 5;
const DRILL_LIFETIME_MS = 4000;

// ── F+ Javelin Burst ────────────────────────────────────────────────────
const F_PLUS_JAVELIN_COUNT = 12;
const F_PLUS_JAVELIN_SPEED = 480;

// ── Q+ Flare-Stream ─────────────────────────────────────────────────────
const FLARE_TELEPORT_INTERVAL = 10;
const FLARE_BEAM_LIFETIME_MS = 35000;
const FLARE_ACCEL_MULT = 3;

// ── Aurora (divine perk) ────────────────────────────────────────────────
/** Speed handed over for being hit at all, before the size of the hit is counted. */
const AURORA_BASE_ACCEL = 70;
/** Extra speed per point of damage taken — a big hit is worth far more than a chip. */
const AURORA_ACCEL_PER_DAMAGE = 4;

// ── Mastery: Unstoppable + Killer Kebab ─────────────────────────────────
/** Unstoppable: hard turns bleed off only a fraction of the usual acceleration. */
const UNSTOPPABLE_BRAKE_MULT = 0.35;
const KEBAB_COOLDOWN_MS = 20000;
const KEBAB_WINDOW_MS = 5000;   // how long the lance stays enhanced and can skewer
const KEBAB_CARRY_MS = 12000;   // a rider slides free on its own after this long
const KEBAB_MAX_RIDERS = 3;
const KEBAB_RIDER_SPACING = 30; // gap between riders along the shaft
const KEBAB_FIRST_OFFSET = 46;  // distance from the caster to the first rider
const KEBAB_BASE_DAMAGE = 25;
const KEBAB_MAX_BONUS_DAMAGE = 130; // added at full acceleration (scales with ratio^2)
const KEBAB_COLOR = LIGHT.amber;

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  blink: 'dash',
  'prism-ramp': 'slam',
  'light-trick': 'clap',
  'speed-o-light': 'raise',
};

// Every world object below is plain data painted into the kit's own Graphics layers — nothing
// here owns a sprite, so a ramp can refract and a drill can spin instead of sitting there.

interface KebabRider {
  fighter: Fighter;
  until: number;
}

interface LightRamp {
  x: number;
  y: number;
  angle: number;
  owner: 'player' | 'npc';
  overlapping: Set<Fighter>;
}

interface LightStreak {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  owner: 'player' | 'npc';
  until: number;
  hitSet: Set<Fighter>;
}

interface LightDrill {
  x: number;
  y: number;
  angle: number;
  speed: number;
  dmg: number;
  hitTarget: Fighter | null;
  nextStunAt: number;
  until: number;
}

interface LightFlareBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  until: number;
}

/** What the lance looks like this frame, or null when it isn't out. */
interface LanceView {
  x: number;
  y: number;
  angle: number;
  ratio: number;
  enhanced: boolean;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
}

// ── LightKit ──────────────────────────────────────────────────────────────

export class LightKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: LightColorFn;
  private readonly ncol: LightColorFn;
  private readonly pfx: LightFx;
  private readonly nfx: LightFx;
  /** The racer rig (lamp hands, eyes, prism crest) for each light fighter. */
  private playerAvatar: LightAvatar | null = null;
  private npcAvatar: LightAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private boostAura: LightAura | null = null;
  private redlineAura: LightAura | null = null;
  private chargeAura: LightAura | null = null;
  private kebabAura: LightAura | null = null;
  private npcKebabAura: LightAura | null = null;
  /**
   * Two layers, because these objects are not all in the same place. Ramps, streaks and flare
   * beams lie on the floor and must pass *under* the fighters; lances, drills and the kebab
   * shaft are held out in front of them and must pass over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` faces the heading instead. */
  private lastAimX = 0;
  private lastAimY = 0;
  /** This frame's lance pose per side, filled in by update() and painted at the end of it. */
  private lanceView: LanceView | null = null;
  private npcLanceView: LanceView | null = null;

  // ── Player car state ───────────────────────────────────────────────────
  private lanceHeld = false;
  private carAngle = 0;
  private carSpeed = 0;
  private carBoostUntil = 0;

  private blinkCharges = BLINK_MAX_CHARGES;
  private blinkRechargeQueue: number[] = [];
  /** Flicker perk: afterimages waiting to flare where a blink left from. */
  private flickerGhosts: Array<{ x: number; y: number; angle: number; owner: 'player' | 'npc'; bornAt: number; flareAt: number }> = [];

  private ramps: LightRamp[] = [];
  private streaks: LightStreak[] = [];
  private lanceHitCooldowns: Map<Fighter, number> = new Map();

  private speedOLightActive = false;
  private speedOLightBouncesLeft = 0;
  private speedOLightNextBounceAt = 0;

  private accelBarBg: Phaser.GameObjects.Rectangle | null = null;
  private accelBarFill: Phaser.GameObjects.Rectangle | null = null;

  // ── Click+ Redline ───────────────────────────────────────────────────────
  private dangerVignette: Phaser.GameObjects.Rectangle[] | null = null;

  // ── E+ Steam Charge ──────────────────────────────────────────────────────
  private ePlusHolding = false;
  private ePlusHoldStart = 0;
  private nextSteamAt = 0;

  // ── R+ Prism Drill ───────────────────────────────────────────────────────
  private drills: LightDrill[] = [];
  private playerStunUntil = 0;
  private npcStunUntil = 0;

  // ── Q+ Flare-Stream ──────────────────────────────────────────────────────
  private playerTeleportCount = 0;
  private flareBeams: LightFlareBeam[] = [];

  // ── Aurora (perk) ────────────────────────────────────────────────────────
  /** Last seen player HP, so a drop can be read as "you were hit" without a damage hook. */
  private auroraLastHp = -1;
  /** 0–1 flare on the curtain, spiked by a hit and bled off over the following second. */
  private auroraSurge = 0;

  // ── Mastery: Killer Kebab ────────────────────────────────────────────────
  private kebabLastCastAt = -KEBAB_COOLDOWN_MS;
  private kebabWindowUntil = 0;
  private kebabRiders: KebabRider[] = [];
  private npcKebabWindowUntil = 0;
  private npcKebabRiders: KebabRider[] = [];

  // ── NPC mirror state ────────────────────────────────────────────────────
  private npcCarAngle = 0;
  private npcCarSpeed = 0;
  private npcCarBoostUntil = 0;
  private npcRamps: LightRamp[] = [];
  private npcLanceHitCooldowns: Map<Fighter, number> = new Map();

  private npcSpeedOLightActive = false;
  private npcSpeedOLightBouncesLeft = 0;
  private npcSpeedOLightNextBounceAt = 0;

  constructor(private arena: LightArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.lightColor('player', base);
    this.ncol = (base) => arena.lightColor('npc', base);
    this.pfx = new LightFx(arena.scene, this.pcol);
    this.nfx = new LightFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): LightFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): LightColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Light. */
  private avatar(owner: 'player' | 'npc'): LightAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(4);
    }
    return this.groundGfx;
  }

  /** The held-out-in-front layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(10);
    }
    return this.airGfx;
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of [this.boostAura, this.redlineAura, this.chargeAura, this.kebabAura, this.npcKebabAura]) a?.destroy();
    this.boostAura = null;
    this.redlineAura = null;
    this.chargeAura = null;
    this.kebabAura = null;
    this.npcKebabAura = null;
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;
    this.lanceView = null;
    this.npcLanceView = null;

    this.lanceHeld = false;
    this.carAngle = 0;
    this.carSpeed = 0;
    this.carBoostUntil = 0;

    this.blinkCharges = this.blinkMaxCharges();
    this.blinkRechargeQueue = [];
    this.flickerGhosts = [];

    this.ramps = [];
    this.streaks = [];
    this.lanceHitCooldowns.clear();

    this.speedOLightActive = false;
    this.speedOLightBouncesLeft = 0;
    this.speedOLightNextBounceAt = 0;

    this.destroyAccelBar();

    this.dangerVignette?.forEach((r) => r.destroy());
    this.dangerVignette = null;

    this.ePlusHolding = false;
    this.ePlusHoldStart = 0;
    this.nextSteamAt = 0;

    this.drills = [];
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;

    this.playerTeleportCount = 0;
    this.flareBeams = [];

    this.auroraLastHp = -1;
    this.auroraSurge = 0;

    this.npcCarAngle = 0;
    this.npcCarSpeed = 0;
    this.npcCarBoostUntil = 0;
    this.npcRamps = [];
    this.npcLanceHitCooldowns.clear();

    this.npcSpeedOLightActive = false;
    this.npcSpeedOLightBouncesLeft = 0;
    this.npcSpeedOLightNextBounceAt = 0;

    // Mastery — Unstoppable + Killer Kebab
    this.arena.player.unstoppable = false;
    this.arena.npc.unstoppable = false;
    this.kebabLastCastAt = -KEBAB_COOLDOWN_MS;
    this.kebabWindowUntil = 0;
    this.npcKebabWindowUntil = 0;
    this.clearKebab('player');
    this.clearKebab('npc');
  }

  /** Drop every rider off the lance without dealing release damage. */
  private clearKebab(owner: 'player' | 'npc'): void {
    const riders = owner === 'player' ? this.kebabRiders : this.npcKebabRiders;
    for (const r of riders) r.fighter.skeweredUntil = 0;
    if (owner === 'player') this.kebabRiders = [];
    else this.npcKebabRiders = [];
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerLight: boolean, isNpcLight: boolean): void {
    const { player, npc, scene } = this.arena;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const npcBody = npc.body as Phaser.Physics.Arcade.Body;
    this.vizT += delta / 1000;
    // Refilled below by whichever sides are actually holding a lance this frame.
    this.lanceView = null;
    this.npcLanceView = null;

    // Mastery — Unstoppable. The flag lives on Fighter so ArenaScene's speed/stun
    // chokepoint (and any kit holding its own stun timer) can honour it generically.
    player.unstoppable = isPlayerLight && this.arena.masteryActive;
    npc.unstoppable = isNpcLight && this.arena.npcMasteryActive;

    if (isPlayerLight) {
      this.updateAurora(delta);

      while (this.blinkRechargeQueue.length > 0 && time >= this.blinkRechargeQueue[0]) {
        this.blinkRechargeQueue.shift();
        this.blinkCharges = Math.min(this.blinkMaxCharges(), this.blinkCharges + 1);
      }

      if (this.speedOLightActive) {
        this.stepSpeedOLight('player', time);
        playerBody.setVelocity(0, 0);
        this.destroyDangerVignette();
      } else if (this.ePlusHolding) {
        // E+ Steam Charge: rooted in place, aiming at the cursor, acceleration frozen (not lost)
        playerBody.setVelocity(0, 0);
        const ptr = scene.input.activePointer;
        this.carAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        this.lanceView = this.buildLanceView(player, this.carAngle, this.carSpeed / CAR_MAX_SPEED, time < this.kebabWindowUntil);
        if (time >= this.nextSteamAt) {
          this.nextSteamAt = time + E_PLUS_STEAM_INTERVAL_MS;
          const heat = Phaser.Math.Clamp((time - this.ePlusHoldStart) / E_PLUS_MAX_HOLD_MS, 0, 1);
          this.pfx.steam(player.x + Phaser.Math.Between(-6, 6), player.y - 16, heat);
        }
        this.destroyDangerVignette();
      } else if (this.lanceHeld) {
        const ptr = scene.input.activePointer;
        const desired = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        const ratio = this.stepCar(playerBody, time, delta, desired, true);
        this.lanceView = this.buildLanceView(player, this.carAngle, ratio, time < this.kebabWindowUntil);
        this.checkLanceContact(time, this.lanceView.x, this.lanceView.y, ratio, this.arena.enemies, this.lanceHitCooldowns, 'player');
        this.updateAccelBar(ratio);

        // Click+ Redline: doubled meter (already folded into `ratio` by stepCar), danger zone above 3/4.
        // Killer Kebab riders take the impact for you — no wall damage while anything is on the lance.
        if (this.arena.hasUpgrade('click') && this.kebabRiders.length === 0) {
          const dangerAlpha = ratio > CLICK_PLUS_DANGER_RATIO
            ? Phaser.Math.Clamp((ratio - CLICK_PLUS_DANGER_RATIO) / (1 - CLICK_PLUS_DANGER_RATIO), 0, 1) * 0.4
            : 0;
          this.updateDangerVignette(dangerAlpha);
          if (dangerAlpha > 0 && (playerBody.blocked.up || playerBody.blocked.down || playerBody.blocked.left || playerBody.blocked.right)) {
            player.takeDamage(CLICK_PLUS_WALL_DAMAGE);
            // Redlining into a wall: the lance shatters against it.
            this.pfx.boom(player.x, player.y, 78, { color: LIGHT.red, shards: 12 });
            scene.cameras.main.shake(200, 0.007);
            this.arena.showFloatingText(player.x, player.y - 34, `💥 WALL CRASH -${CLICK_PLUS_WALL_DAMAGE}`, '#ff3333');
            this.carSpeed = 0;
            this.updateDangerVignette(0);
          }
        } else {
          this.destroyDangerVignette();
        }
      } else {
        this.destroyAccelBar();
        this.destroyDangerVignette();
      }
    }

    if (isNpcLight) {
      if (this.npcSpeedOLightActive) {
        this.stepSpeedOLight('npc', time);
        npcBody.setVelocity(0, 0);
      } else {
        const desired = Math.atan2(player.y - npc.y, player.x - npc.x);
        const ratio = this.stepCar(npcBody, time, delta, desired, false);
        this.npcLanceView = this.buildLanceView(npc, this.npcCarAngle, ratio, time < this.npcKebabWindowUntil);
        this.checkLanceContact(time, this.npcLanceView.x, this.npcLanceView.y, ratio, [player], this.npcLanceHitCooldowns, 'npc');
      }

      const npcCastId = this.arena.npcCastId;
      // Mirror the player's gestures on the NPC rig, so a light opponent visibly casts.
      const gesture = npcCastId ? CAST_GESTURES[npcCastId] : undefined;
      if (gesture) this.npcAvatar?.play(gesture, this.npcCarAngle);
      if (npcCastId === 'blink') {
        this.leaveFlickerGhost('npc', npc.x, npc.y, this.npcCarAngle, time);
        this.npcCarAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
        this.npcCarBoostUntil = time + BLINK_BOOST_MS;
        this.blinkFlash('npc', npc.x, npc.y, this.npcCarAngle);
        this.arena.showFloatingText(npc.x, npc.y - 30, '⚡ BLINK', '#88ddff');
      }
      if (npcCastId === 'prism-ramp') {
        this.placeRamp('npc', npc.x, npc.y, this.npcCarAngle);
        this.arena.showFloatingText(npc.x, npc.y - 30, '🔺 PRISM RAMP', '#88ddff');
      }
      if (npcCastId === 'light-trick') {
        this.triggerLightTrick('npc', time, npc, [player]);
      }
      if (npcCastId === 'speed-o-light' && !this.npcSpeedOLightActive) {
        this.startSpeedOLight('npc', time);
      }
    }

    // Ramp overlap checks run unconditionally — each array is naturally empty
    // on whichever side isn't playing Light this match.
    this.updateRampArray(time, this.ramps, player, this.arena.enemies);
    this.updateRampArray(time, this.npcRamps, npc, [player]);

    this.updateStreaks(time);
    this.updateDrills(time, delta);
    this.updateFlareBeams(time);

    // Mastery — Killer Kebab. Runs after the car step so riders land on this frame's lance.
    this.updateKebab(time, 'player');
    this.updateKebab(time, 'npc');

    // R+ Prism Drill stun — same "zero velocity while stunned" approach used elsewhere in this codebase
    if (time < this.playerStunUntil && !player.unstoppable) playerBody.setVelocity(0, 0);
    if (time < this.npcStunUntil && !npc.unstoppable) npcBody.setVelocity(0, 0);

    this.updateFlickerGhosts(time);
    this.paintWorld(time);
    this.updateAvatars(time, delta, isPlayerLight, isNpcLight);
  }

  /** Where the lance sits and how hot it is running this frame. */
  private buildLanceView(caster: Fighter, angle: number, ratio: number, enhanced: boolean): LanceView {
    const dist = enhanced ? 44 : 34;
    return {
      x: caster.x + Math.cos(angle) * dist,
      y: caster.y + Math.sin(angle) * dist,
      angle, ratio, enhanced,
    };
  }

  /**
   * Every per-frame painter in one pass. The two layers are cleared and redrawn from live state,
   * so a ramp refracts, a streak pulses and a drill spins rather than sitting there as a sprite.
   */
  // ── Flicker (perk) ───────────────────────────────────────────────────────

  private blinkMaxCharges(): number {
    return this.arena.hasPerk('player', 'flicker') ? FLICKER_MAX_CHARGES : BLINK_MAX_CHARGES;
  }

  private blinkRechargeMs(): number {
    return this.arena.hasPerk('player', 'flicker') ? FLICKER_RECHARGE_MS : BLINK_RECHARGE_MS;
  }

  /** The light you left behind — it hangs for a beat, then goes off where you were. */
  private leaveFlickerGhost(owner: 'player' | 'npc', x: number, y: number, angle: number, time: number): void {
    if (!this.arena.hasPerk(owner, 'flicker')) return;
    this.flickerGhosts.push({ x, y, angle, owner, bornAt: time, flareAt: time + FLICKER_FLARE_DELAY_MS });
  }

  private updateFlickerGhosts(time: number): void {
    for (let i = this.flickerGhosts.length - 1; i >= 0; i--) {
      const gh = this.flickerGhosts[i];
      if (time < gh.flareAt) continue;
      this.flickerGhosts.splice(i, 1);

      const fx = gh.owner === 'player' ? this.pfx : this.nfx;
      fx.flash(gh.x, gh.y, FLICKER_FLARE_RADIUS * 0.5, 9, LIGHT.pale);
      fx.ring(gh.x, gh.y, 8, FLICKER_FLARE_RADIUS, LIGHT.glow, 300, 4, 8);
      fx.sparkle(gh.x, gh.y, 6, FLICKER_FLARE_RADIUS * 0.8, 11, LIGHT.glow);

      const targets = gh.owner === 'player'
        ? (this.arena.enemies.length > 0 ? this.arena.enemies : [this.arena.npc])
        : [this.arena.player];
      for (const t of targets) {
        if (!t || !t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(gh.x, gh.y, t.x, t.y) > FLICKER_FLARE_RADIUS) continue;
        const hx = t.x, hy = t.y;
        t.takeDamage(FLICKER_FLARE_DAMAGE);
        fx.shards(hx, hy, 4, { speed: 190, size: 10, color: LIGHT.glow, depth: 10 });
      }
    }
  }

  /**
   * The afterimage itself: a hollow outline of the car you were, drawn thinner and
   * brighter as it winds up, so the flare never lands without warning.
   */
  private paintFlickerGhosts(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const gh of this.flickerGhosts) {
      const k = Phaser.Math.Clamp((time - gh.bornAt) / FLICKER_FLARE_DELAY_MS, 0, 1);
      const col = gh.owner === 'player' ? this.pcol : this.ncol;
      const cos = Math.cos(gh.angle), sin = Math.sin(gh.angle);
      // A wedge pointing the way you were travelling, shrinking as it tightens up.
      const len = 18 * (1 - k * 0.35), wid = 10 * (1 - k * 0.35);
      const nose = { x: gh.x + cos * len, y: gh.y + sin * len };
      const tailL = { x: gh.x - cos * len * 0.7 - sin * wid, y: gh.y - sin * len * 0.7 + cos * wid };
      const tailR = { x: gh.x - cos * len * 0.7 + sin * wid, y: gh.y - sin * len * 0.7 - cos * wid };
      g.lineStyle(1.5 + k * 2, col(LIGHT.pale), 0.35 + 0.5 * k);
      g.beginPath();
      g.moveTo(nose.x, nose.y);
      g.lineTo(tailL.x, tailL.y);
      g.lineTo(tailR.x, tailR.y);
      g.closePath();
      g.strokePath();
      // The charge gathering in the middle of it before it lets go.
      g.fillStyle(col(LIGHT.glow), 0.15 + 0.45 * k * k);
      g.fillCircle(gh.x, gh.y, 3 + 7 * k * k);
      // A tightening ring reading the fuse.
      g.lineStyle(1, col(LIGHT.glow), 0.5 * (1 - k));
      g.strokeCircle(gh.x, gh.y, FLICKER_FLARE_RADIUS * (1 - k * 0.75));
    }
  }

  private paintWorld(time: number): void {
    const { player, npc } = this.arena;

    const auroraUp = this.arena.hasPerk('player', 'aurora') && player.active && player.hp > 0;
    const hasGround = this.ramps.length > 0 || this.npcRamps.length > 0
      || this.streaks.length > 0 || this.flareBeams.length > 0 || this.flickerGhosts.length > 0
      || auroraUp;
    if (hasGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      // The curtain is worn, so it goes down first and everything else lies over it.
      if (auroraUp) LightFx.drawAurora(g, this.pcol, player.x, player.y, this.vizT, this.auroraSurge);
      // Flare beams are permanent furniture, so they sit under the transient streaks.
      for (const b of this.flareBeams) {
        const life = Phaser.Math.Clamp((b.until - time) / FLARE_BEAM_LIFETIME_MS, 0, 1);
        LightFx.drawStreak(g, this.pcol, b.x1, b.y1, b.x2, b.y2, STREAK_THICKNESS * 0.8,
          LIGHT.ember, 0.25 + life * 0.55, this.vizT);
      }
      for (const s of this.streaks) {
        const life = Phaser.Math.Clamp((s.until - time) / STREAK_LIFETIME_MS, 0, 1);
        LightFx.drawStreak(g, this.col(s.owner), s.x1, s.y1, s.x2, s.y2, STREAK_THICKNESS,
          s.owner === 'player' ? LIGHT.pale : LIGHT.cyan, 0.9 * life, this.vizT);
      }
      for (const r of this.ramps) LightFx.drawRamp(g, this.pcol, r.x, r.y, r.angle, this.vizT);
      for (const r of this.npcRamps) LightFx.drawRamp(g, this.ncol, r.x, r.y, r.angle, this.vizT);
      this.paintFlickerGhosts(g, time);
    }

    const hasAir = this.lanceView !== null || this.npcLanceView !== null
      || this.drills.length > 0 || this.kebabRiders.length > 0 || this.npcKebabRiders.length > 0;
    if (hasAir || this.airGfx) {
      const g = this.air();
      g.clear();
      for (const d of this.drills) {
        LightFx.drawDrill(g, this.pcol, d.x, d.y, d.angle, this.vizT, d.hitTarget !== null);
      }
      if (this.lanceView) {
        const v = this.lanceView;
        LightFx.drawLance(g, this.pcol, player.x, player.y, v.angle, v.ratio, this.vizT, v.enhanced);
      }
      if (this.npcLanceView) {
        const v = this.npcLanceView;
        LightFx.drawLance(g, this.ncol, npc.x, npc.y, v.angle, v.ratio, this.vizT, v.enhanced);
      }
      // The spit runs from the caster out past the last rider, with a spike through each one.
      for (const owner of ['player', 'npc'] as const) {
        const riders = owner === 'player' ? this.kebabRiders : this.npcKebabRiders;
        if (riders.length === 0) continue;
        const caster = owner === 'player' ? player : npc;
        const angle = owner === 'player' ? this.carAngle : this.npcCarAngle;
        const ratio = (owner === 'player' ? this.carSpeed : this.npcCarSpeed) / CAR_MAX_SPEED;
        const len = KEBAB_FIRST_OFFSET + (riders.length - 1) * KEBAB_RIDER_SPACING + 26;
        LightFx.drawKebabShaft(g, this.col(owner), caster.x, caster.y, angle, len, ratio, this.vizT);
        for (const r of riders) {
          LightFx.drawSpike(g, this.col(owner), r.fighter.x, r.fighter.y, angle, this.vizT);
        }
      }
    }
  }

  /**
   * The character rigs and every stance aura, for whichever sides are playing Light. Built
   * lazily so a scene restart (which destroys them all) simply rebuilds on the next frame, and
   * torn down the moment a side stops being Light.
   */
  private updateAvatars(time: number, delta: number, isPlayerLight: boolean, isNpcLight: boolean): void {
    const { scene, player, npc } = this.arena;

    if (isPlayerLight && player.active) {
      if (!this.playerAvatar) this.playerAvatar = new LightAvatar(scene, this.pcol, 'player');
      const ratio = Phaser.Math.Clamp(this.carSpeed / CAR_MAX_SPEED, 0, 1);
      const driving = this.lanceHeld && !this.speedOLightActive;
      const aim = driving || this.ePlusHolding
        ? this.carAngle
        : Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x);
      this.playerAvatar.setFacing(aim);
      this.playerAvatar.setSpeed(driving ? ratio : 0);
      this.playerAvatar.setIntensity(this.speedOLightActive ? 1.5 : time < this.carBoostUntil ? 1.2 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Single owner of setHold: driving pins both hands to the wheel, a steam charge hauls
      // them back into the chest, and otherwise the idle sway runs.
      this.playerAvatar.setHold(this.ePlusHolding ? 'charge' : driving ? 'ride' : null, aim);
      // The car itself shrinks to half size while driving, so the rig follows it down.
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      this.syncAura('boost', driving && time < this.carBoostUntil, player, delta, ratio, aim);
      this.syncAura('redline', driving && this.arena.hasUpgrade('click') && ratio > CLICK_PLUS_DANGER_RATIO,
        player, delta, (ratio - CLICK_PLUS_DANGER_RATIO) / (1 - CLICK_PLUS_DANGER_RATIO), aim);
      this.syncAura('charge', this.ePlusHolding, player, delta,
        (time - this.ePlusHoldStart) / E_PLUS_MAX_HOLD_MS, aim);
      this.syncAura('kebab', time < this.kebabWindowUntil, player, delta, 1, aim);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      for (const a of [this.boostAura, this.redlineAura, this.chargeAura, this.kebabAura]) a?.destroy();
      this.boostAura = null;
      this.redlineAura = null;
      this.chargeAura = null;
      this.kebabAura = null;
    }

    if (isNpcLight && npc.active) {
      if (!this.npcAvatar) this.npcAvatar = new LightAvatar(scene, this.ncol, 'npc');
      this.npcAvatar.setFacing(this.npcCarAngle);
      this.npcAvatar.setSpeed(Phaser.Math.Clamp(this.npcCarSpeed / CAR_MAX_SPEED, 0, 1));
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.setHold(this.npcSpeedOLightActive ? null : 'ride', this.npcCarAngle);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);

      if (time < this.npcKebabWindowUntil) {
        if (!this.npcKebabAura) this.npcKebabAura = new LightAura(scene, this.ncol, 'kebab', 28, 4);
        this.npcKebabAura.setAngle(this.npcCarAngle);
        this.npcKebabAura.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
      } else if (this.npcKebabAura) {
        this.npcKebabAura.destroy();
        this.npcKebabAura = null;
      }
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
      this.npcKebabAura?.destroy();
      this.npcKebabAura = null;
    }
  }

  /** Build/tear down one of the player's stance auras from a single "is it up?" flag. */
  private syncAura(
    style: 'boost' | 'redline' | 'charge' | 'kebab',
    on: boolean, f: Fighter, delta: number, intensity: number, angle: number,
  ): void {
    const get = (): LightAura | null =>
      style === 'boost' ? this.boostAura : style === 'redline' ? this.redlineAura
        : style === 'charge' ? this.chargeAura : this.kebabAura;
    const set = (a: LightAura | null): void => {
      if (style === 'boost') this.boostAura = a;
      else if (style === 'redline') this.redlineAura = a;
      else if (style === 'charge') this.chargeAura = a;
      else this.kebabAura = a;
    };
    let aura = get();
    if (!on) {
      if (aura) { aura.destroy(); set(null); }
      return;
    }
    if (!aura) {
      aura = new LightAura(this.arena.scene, this.pcol, style, style === 'kebab' ? 28 : 24, style === 'boost' ? 3 : 4);
      set(aura);
    }
    aura.setIntensity(intensity);
    aura.setAngle(angle);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  private stepCar(body: Phaser.Physics.Arcade.Body, time: number, delta: number, desiredAngle: number, isPlayer: boolean): number {
    const dtS = delta / 1000;
    let angle = isPlayer ? this.carAngle : this.npcCarAngle;
    let speed = isPlayer ? this.carSpeed : this.npcCarSpeed;
    const boostUntil = isPlayer ? this.carBoostUntil : this.npcCarBoostUntil;

    // Click+ Redline: doubles the top end of the meter (and the risk that comes with it)
    const maxSpeed = isPlayer && this.arena.hasUpgrade('click') ? CAR_MAX_SPEED * CLICK_PLUS_MAX_SPEED_MULT : CAR_MAX_SPEED;

    const diff = Phaser.Math.Angle.Wrap(desiredAngle - angle);
    const absDiff = Math.abs(diff);
    const speedRatio = speed / maxSpeed;
    const turnRate = CAR_BASE_TURN_RATE - (CAR_BASE_TURN_RATE - CAR_FAST_TURN_RATE) * speedRatio;
    const maxTurnStep = turnRate * dtS;
    angle += Phaser.Math.Clamp(diff, -maxTurnStep, maxTurnStep);

    // Q+ Flare-Stream: standing on your own flare beam triples the accel rate
    let accelRate = CAR_ACCEL_RATE;
    if (isPlayer && this.flareBeams.length > 0 && this.arena.hasUpgrade('q') && this.isOnFlareBeam(body.center.x, body.center.y)) {
      accelRate *= FLARE_ACCEL_MULT;
    }

    // Mastery — Unstoppable: the lance bites into the corner, so a hard turn costs far less speed.
    const unstoppable = isPlayer ? this.arena.masteryActive : this.arena.npcMasteryActive;
    const brakeRate = unstoppable ? CAR_TURN_BRAKE_RATE * UNSTOPPABLE_BRAKE_MULT : CAR_TURN_BRAKE_RATE;

    if (absDiff < STRAIGHT_THRESHOLD) {
      speed = Math.min(maxSpeed, speed + accelRate * dtS);
    } else {
      speed = Math.max(CAR_MIN_COAST, speed - brakeRate * dtS * (absDiff / Math.PI));
    }

    if (time < boostUntil) speed = Math.max(speed, BOOST_TARGET_SPEED);
    speed = Phaser.Math.Clamp(speed, 0, maxSpeed);

    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (isPlayer) { this.carAngle = angle; this.carSpeed = speed; } else { this.npcCarAngle = angle; this.npcCarSpeed = speed; }
    return speed / maxSpeed;
  }

  // ── Aurora (perk) ────────────────────────────────────────────────────────

  /**
   * Aurora: the curtain feeds on damage. HP is sampled rather than hooked, because every
   * route into the player's health — projectiles, AOE, DOT ticks, a wall crash — has to
   * count, and there is no single place all of those pass through.
   *
   * The shove is added straight onto the car's speed; `stepCar` clamps it to whatever this
   * build's ceiling is, so a Redline racer can bank more of it than a stock one.
   */
  private updateAurora(delta: number): void {
    const { player } = this.arena;
    if (!this.arena.hasPerk('player', 'aurora')) {
      this.auroraLastHp = -1;
      this.auroraSurge = 0;
      return;
    }

    // The curtain settles back down over about a second.
    this.auroraSurge = Math.max(0, this.auroraSurge - delta / 900);

    const hp = player.hp;
    if (this.auroraLastHp >= 0 && hp < this.auroraLastHp) {
      const taken = this.auroraLastHp - hp;
      const gain = AURORA_BASE_ACCEL + taken * AURORA_ACCEL_PER_DAMAGE;
      this.carSpeed += gain;
      this.auroraSurge = Math.min(1, this.auroraSurge + 0.4 + taken / 80);

      // The hit throws the curtain up: a wash off the ground and sparks riding it.
      this.pfx.ring(player.x, player.y, 16, 74, LIGHT.auroraGreen, 420, 4, 4);
      this.pfx.sparkle(player.x, player.y - 10, 6, 40, 11, LIGHT.auroraViolet);
      this.arena.showFloatingText(player.x, player.y - 46, `🌌 +${Math.round(gain)} ACCEL`, '#66ffcc');
    }
    this.auroraLastHp = hp;
  }

  /** The snap of light thrown off a heading change — Blink, and the E+ steam release. */
  private blinkFlash(owner: 'player' | 'npc', x: number, y: number, angle: number, scale = 1): void {
    const fx = this.fx(owner);
    fx.flare(x, y, 0.8 * scale, 11, LIGHT.sky, angle);
    fx.speedLines(x, y, angle, scale, 8, LIGHT.sky);
    fx.shards(x, y, 5, { speed: 260 * scale, angle: angle + Math.PI, spread: 0.7, size: 13, color: LIGHT.sky, depth: 9 });
    this.avatar(owner)?.play('dash', angle);
  }

  /** Contact damage for the held/driven lance tip — scales with the current acceleration ratio. */
  private checkLanceContact(time: number, lanceX: number, lanceY: number, ratio: number, targets: Fighter[], hitCooldowns: Map<Fighter, number>, owner: 'player' | 'npc'): void {
    const kebabOpen = time < (owner === 'player' ? this.kebabWindowUntil : this.npcKebabWindowUntil);
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      // A rider sits on the lance tip — it must not re-hit them every contact tick.
      if (this.isSkewered(t)) continue;
      if (time < (hitCooldowns.get(t) ?? 0)) continue;
      if (Phaser.Math.Distance.Between(lanceX, lanceY, t.x, t.y) <= LANCE_HIT_RADIUS) {
        // Mastery — Killer Kebab: while the lance is enhanced a stab impales instead of damaging.
        if (kebabOpen && this.trySkewer(time, owner, t)) {
          hitCooldowns.set(t, time + LANCE_HIT_COOLDOWN_MS);
          continue;
        }
        const dmg = LANCE_BASE_DAMAGE + Math.round(LANCE_MAX_BONUS_DAMAGE * ratio * ratio);
        const hx = t.x, hy = t.y;
        t.takeDamage(dmg);
        // A lance run through at speed spits far more of itself out the other side.
        const fx = this.fx(owner);
        fx.flare(hx, hy, 0.5 + ratio * 0.9, 11, mixColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, ratio));
        fx.shards(hx, hy, 3 + Math.round(ratio * 7), {
          speed: 140 + ratio * 300, angle: Math.atan2(hy - lanceY, hx - lanceX), spread: 1.1,
          size: 10 + ratio * 12, color: mixColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, ratio), depth: 10,
        });
        hitCooldowns.set(t, time + LANCE_HIT_COOLDOWN_MS);
      }
    }
  }

  private ensureAccelBar(): void {
    if (this.accelBarBg) return;
    const { scene, width: W, hpBarY, hpBarH } = this.arena;
    const barW = 220;
    const barH = 8;
    const barY = hpBarY + hpBarH / 2 + 3 + barH / 2;
    this.accelBarBg = scene.add.rectangle(W / 2, barY, barW + 4, barH + 4, LIGHT.shade, 0.9)
      .setStrokeStyle(2, LIGHT.steel).setDepth(20);
    this.accelBarFill = scene.add.rectangle(W / 2 - barW / 2, barY, 0, barH, LANCE_COLOR_SLOW, 1)
      .setOrigin(0, 0.5).setDepth(21);
  }

  private updateAccelBar(ratio: number): void {
    this.ensureAccelBar();
    const barW = 220;
    if (this.accelBarFill) {
      this.accelBarFill.setSize(barW * Phaser.Math.Clamp(ratio, 0, 1), 8);
      this.accelBarFill.setFillStyle(mixColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, ratio), 1);
    }
  }

  private destroyAccelBar(): void {
    if (this.accelBarBg) { this.accelBarBg.destroy(); this.accelBarBg = null; }
    if (this.accelBarFill) { this.accelBarFill.destroy(); this.accelBarFill = null; }
  }

  // ── Click+ Redline danger vignette ─────────────────────────────────────────

  private ensureDangerVignette(): void {
    if (this.dangerVignette) return;
    const { scene, width: W, height: H } = this.arena;
    const t = 36;
    const mk = (x: number, y: number, w: number, h: number) =>
      scene.add.rectangle(x, y, w, h, LIGHT.red, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(999);
    this.dangerVignette = [mk(0, 0, W, t), mk(0, H - t, W, t), mk(0, 0, t, H), mk(W - t, 0, t, H)];
  }

  private updateDangerVignette(alpha: number): void {
    if (alpha <= 0) { this.destroyDangerVignette(); return; }
    this.ensureDangerVignette();
    this.dangerVignette?.forEach((r) => r.setFillStyle(LIGHT.red, alpha));
  }

  private destroyDangerVignette(): void {
    if (!this.dangerVignette) return;
    this.dangerVignette.forEach((r) => r.destroy());
    this.dangerVignette = null;
  }

  // ── Prism Ramp ───────────────────────────────────────────────────────────

  private placeRamp(owner: 'player' | 'npc', originX: number, originY: number, angle: number): void {
    const arr = owner === 'player' ? this.ramps : this.npcRamps;
    // Oldest ramp falls away when the fifth is planted — it is pure data, so dropping it is all
    // the teardown there is.
    if (arr.length >= MAX_RAMPS) arr.shift();
    const x = originX + Math.cos(angle) * RAMP_OFFSET;
    const y = originY + Math.sin(angle) * RAMP_OFFSET;
    // Set down, not thrown: a short flare and a spectrum spray as the glass lands.
    const fx = this.fx(owner);
    fx.flare(x, y, 0.7, 11, LIGHT.cyan, angle);
    fx.sparkle(x, y, 6, 26, 11, LIGHT.cyan);
    this.avatar(owner)?.play('slam', angle);
    arr.push({ x, y, angle, owner, overlapping: new Set() });
  }

  private updateRampArray(time: number, arr: LightRamp[], ownerFighter: Fighter, otherFighters: Fighter[]): void {
    if (arr.length === 0) return;
    const candidates = [ownerFighter, ...otherFighters];
    const shattered: LightRamp[] = [];
    for (const ramp of arr) {
      for (const f of candidates) {
        if (!f.active || f.hp <= 0) continue;
        const within = Phaser.Math.Distance.Between(ramp.x, ramp.y, f.x, f.y) <= RAMP_TRIGGER_RADIUS;
        const was = ramp.overlapping.has(f);
        if (within && !was) {
          ramp.overlapping.add(f);
          // R+ Prism Drill: driving your held lance onto your own ramp while holding R fires the drill instead
          const drillReady = f === ownerFighter && f === this.arena.player && this.lanceHeld &&
            this.arena.hasUpgrade('r') && this.arena.rKey.isDown;
          if (drillReady) {
            this.launchPrismDrill(ramp, time);
            shattered.push(ramp);
          } else {
            this.launchRampLances(ramp);
            // Hitting the ramp: the light breaks apart into its spectrum along the heading.
            this.fx(ramp.owner).boom(ramp.x, ramp.y, 54, { color: LIGHT.cyan, shards: 8, mark: false });
            if (f === ownerFighter) {
              if (ramp.owner === 'player') {
                this.carBoostUntil = time + RAMP_BOOST_MS;
                this.arena.recordMasteryStat('rampRides', 1);
              } else this.npcCarBoostUntil = time + RAMP_BOOST_MS;
              this.arena.showFloatingText(f.x, f.y - 30, '⚡ RAMP BOOST', '#66ddff');
            }
          }
        } else if (!within && was) {
          ramp.overlapping.delete(f);
        }
      }
    }
    for (const r of shattered) {
      const idx = arr.indexOf(r);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  private launchPrismDrill(ramp: LightRamp, time: number): void {
    const { scene, player } = this.arena;
    const ratio = this.carSpeed / CAR_MAX_SPEED;
    this.carSpeed = 0;
    this.lanceHeld = false;
    player.setScale(1);
    this.lanceView = null;
    this.destroyAccelBar();
    this.updateDangerVignette(0);

    const dmg = DRILL_MIN_DAMAGE + Math.round((DRILL_MAX_DAMAGE - DRILL_MIN_DAMAGE) * ratio);
    // The lance being fed into the ramp and coming out the far side as a drill.
    this.pfx.flash(ramp.x, ramp.y, 26, 11, LIGHT.red);
    this.pfx.beam(player.x, player.y, ramp.x, ramp.y, LIGHT.red, 9, 220);
    this.pfx.shards(ramp.x, ramp.y, 8, { speed: 300, angle: ramp.angle, spread: 0.8, color: LIGHT.ember, depth: 10 });
    scene.cameras.main.shake(140, 0.004);
    this.drills.push({
      x: ramp.x, y: ramp.y, angle: ramp.angle, speed: DRILL_SPEED, dmg,
      hitTarget: null, nextStunAt: 0, until: time + DRILL_LIFETIME_MS,
    });
    this.arena.showFloatingText(player.x, player.y - 30, '🔻 PRISM DRILL', '#ff4422');
  }

  private updateDrills(time: number, delta: number): void {
    if (this.drills.length === 0) return;
    const dtS = delta / 1000;
    const { width: W, height: H } = this.arena;
    for (let i = this.drills.length - 1; i >= 0; i--) {
      const d = this.drills[i];
      if (time >= d.until) { this.drills.splice(i, 1); continue; }

      d.x += Math.cos(d.angle) * d.speed * dtS;
      d.y += Math.sin(d.angle) * d.speed * dtS;

      if (d.x < -20 || d.x > W + 20 || d.y < -20 || d.y > H + 20) {
        this.drills.splice(i, 1);
        continue;
      }

      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > DRILL_HIT_RADIUS) continue;
        if (d.hitTarget !== t) {
          d.hitTarget = t;
          d.speed *= DRILL_SLOW_MULT;
          const hx = t.x, hy = t.y;
          t.takeDamage(d.dmg);
          // Biting in: the drill throws its spectrum back out of the wound.
          this.pfx.boom(hx, hy, 46, { color: LIGHT.red, shards: 7, mark: false, duration: 300 });
          this.arena.recordMasteryStat('drillHits', 1);
          d.nextStunAt = time;
        }
        if (time >= d.nextStunAt) {
          d.nextStunAt = time + DRILL_STUN_TICK_MS;
          if (t === this.arena.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + DRILL_STUN_MS);
          else this.npcStunUntil = Math.max(this.npcStunUntil, time + DRILL_STUN_MS);
        }
        break;
      }
    }
  }

  private launchRampLances(ramp: LightRamp): void {
    const { scene, projectiles } = this.arena;
    const colors = [LIGHT.prismR, LIGHT.prismG, LIGHT.prismB];
    const isPlayerOwned = ramp.owner === 'player';
    const ratio = (ramp.owner === 'player' ? this.carSpeed : this.npcCarSpeed) / CAR_MAX_SPEED;
    const dmg = LANCE_BASE_DAMAGE + Math.round(LANCE_MAX_BONUS_DAMAGE * ratio * ratio);
    for (let i = -1; i <= 1; i++) {
      const a = ramp.angle + i * Phaser.Math.DegToRad(RAMP_LANCE_SPREAD_DEG);
      const proj = new Projectile(scene, ramp.x, ramp.y, 'proj-light-triangle', dmg, isPlayerOwned);
      proj.setTint(colors[i + 1]);
      projectiles.add(proj);
      proj.launch(Math.cos(a) * RAMP_LANCE_SPEED, Math.sin(a) * RAMP_LANCE_SPEED);
    }
    // The prism doing its one job: white in, three colours out.
    this.fx(ramp.owner).flare(ramp.x, ramp.y, 0.8, 11, LIGHT.white, ramp.angle);
  }

  // ── Light Trick ──────────────────────────────────────────────────────────

  private triggerLightTrick(owner: 'player' | 'npc', time: number, caster: Fighter, targets: Fighter[]): void {
    const fx = this.fx(owner);
    // A flick of the wrist that pops the light around you.
    this.avatar(owner)?.play('clap');
    fx.flash(caster.x, caster.y, TRICK_RADIUS * 0.5, 9, LIGHT.pale);
    fx.ring(caster.x, caster.y, 10, TRICK_RADIUS, LIGHT.pale, 320, 4, 8);
    fx.sparkle(caster.x, caster.y, 7, TRICK_RADIUS * 0.8, 11, LIGHT.glow);

    let hit = false;
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y) <= TRICK_RADIUS) {
        const hx = t.x, hy = t.y;
        t.takeDamage(TRICK_DAMAGE);
        fx.shards(hx, hy, 4, { speed: 190, size: 11, color: LIGHT.pale, depth: 10 });
        if (owner === 'player') this.arena.recordMasteryStat('trickHits', 1);
        hit = true;
      }
    }

    // F+ Javelin Burst: if the trick's AOE also catches a prism ramp, that ramp fires 12 javelins
    // and grants both the trick boost and the ramp boost at once.
    let rampHit: LightRamp | null = null;
    if (owner === 'player' && this.arena.hasUpgrade('f')) {
      const allRamps: LightRamp[] = [...this.ramps, ...this.npcRamps];
      rampHit = allRamps.find((r) => Phaser.Math.Distance.Between(caster.x, caster.y, r.x, r.y) <= TRICK_RADIUS) ?? null;
    }

    if (rampHit) {
      this.launchJavelinBurst(rampHit);
      fx.boom(rampHit.x, rampHit.y, 70, { color: LIGHT.cyan, shards: 12, mark: false });
      const boostUntil = time + Math.max(TRICK_BOOST_MS, RAMP_BOOST_MS);
      if (owner === 'player') this.carBoostUntil = boostUntil; else this.npcCarBoostUntil = boostUntil;
      this.arena.showFloatingText(caster.x, caster.y - 30, '🌟 JAVELIN BURST', '#66ddff');
    } else if (hit) {
      if (owner === 'player') this.carBoostUntil = time + TRICK_BOOST_MS;
      else this.npcCarBoostUntil = time + TRICK_BOOST_MS;
      this.arena.showFloatingText(caster.x, caster.y - 30, '✨ LIGHT TRICK', '#fff4a8');
    }
  }

  private launchJavelinBurst(ramp: LightRamp): void {
    const { scene, projectiles } = this.arena;
    const isPlayerOwned = ramp.owner === 'player';
    for (let i = 0; i < F_PLUS_JAVELIN_COUNT; i++) {
      const a = (i / F_PLUS_JAVELIN_COUNT) * Math.PI * 2;
      const proj = new Projectile(scene, ramp.x, ramp.y, 'proj-light-triangle', TRICK_DAMAGE, isPlayerOwned);
      proj.setTint(LIGHT.cyan);
      projectiles.add(proj);
      proj.launch(Math.cos(a) * F_PLUS_JAVELIN_SPEED, Math.sin(a) * F_PLUS_JAVELIN_SPEED);
    }
  }

  // ── Speed 'O' Light ──────────────────────────────────────────────────────

  /** Public: also triggered by Subterfuge's Dark Treachery (light-Q copy). */
  startSpeedOLight(owner: 'player' | 'npc', time: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    caster.dodgeChance += 1.0;
    // Going to light speed: the body blows out into a flare and a spectrum shell.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('raise', -Math.PI / 2, 900);
    fx.flare(caster.x, caster.y, 1.6, 12, LIGHT.white);
    fx.boom(caster.x, caster.y, 110, { color: LIGHT.pale, shards: 14, mark: false });
    this.arena.scene.cameras.main.shake(300, 0.006);
    if (owner === 'player') {
      this.speedOLightActive = true;
      this.speedOLightBouncesLeft = SPEED_O_LIGHT_BOUNCES;
      this.speedOLightNextBounceAt = time;
    } else {
      this.npcSpeedOLightActive = true;
      this.npcSpeedOLightBouncesLeft = SPEED_O_LIGHT_BOUNCES;
      this.npcSpeedOLightNextBounceAt = time;
    }
    this.arena.showFloatingText(caster.x, caster.y - 30, "💫 SPEED 'O' LIGHT", '#fff4a8');
  }

  /**
   * Ruin Mastery — Second Skin. Speed 'O' Light is the form here: the fighter stops being a
   * body at all — teleporting wall to wall, dodging everything — until the bounces run out.
   * Ended the same way `stepSpeedOLight` ends it, so the borrowed dodge goes back.
   *
   * Car-mode is deliberately *not* reverted. It is held on the mouse button rather than cast,
   * so breaking it would last exactly one frame and then fold the player straight back down.
   */
  revertForms(f: Fighter): string[] {
    const owner: 'player' | 'npc' | null = f === this.arena.player ? 'player'
      : f === this.arena.npc ? 'npc' : null;
    if (!owner) return [];
    const active = owner === 'player' ? this.speedOLightActive : this.npcSpeedOLightActive;
    if (!active) return [];
    f.dodgeChance = Math.max(0, f.dodgeChance - 1.0);
    if (owner === 'player') {
      this.speedOLightActive = false;
      this.speedOLightBouncesLeft = 0;
    } else {
      this.npcSpeedOLightActive = false;
      this.npcSpeedOLightBouncesLeft = 0;
    }
    return ["Speed 'O' Light"];
  }

  private stepSpeedOLight(owner: 'player' | 'npc', time: number): void {
    const isPlayer = owner === 'player';
    const nextAt = isPlayer ? this.speedOLightNextBounceAt : this.npcSpeedOLightNextBounceAt;
    if (time < nextAt) return;

    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const body = caster.body as Phaser.Physics.Arcade.Body;
    const { width: W, height: H } = this.arena;
    const margin = 24;
    const wall = Math.floor(Math.random() * 4);
    let nx = caster.x;
    let ny = caster.y;
    if (wall === 0) { nx = margin + Math.random() * (W - margin * 2); ny = margin; }
    else if (wall === 1) { nx = margin + Math.random() * (W - margin * 2); ny = H - margin; }
    else if (wall === 2) { nx = margin; ny = margin + Math.random() * (H - margin * 2); }
    else { nx = W - margin; ny = margin + Math.random() * (H - margin * 2); }

    const midX = (caster.x + nx) / 2;
    const midY = (caster.y + ny) / 2;
    const length = Math.max(4, Phaser.Math.Distance.Between(caster.x, caster.y, nx, ny));
    const angle = Math.atan2(ny - caster.y, nx - caster.x);
    this.streaks.push({ x1: caster.x, y1: caster.y, x2: nx, y2: ny, owner, until: time + STREAK_LIFETIME_MS, hitSet: new Set() });
    // Each bounce leaves a flare at the wall it came off.
    this.fx(owner).flare(nx, ny, 0.55, 12, LIGHT.white, angle);

    // Q+ Flare-Stream: every 10th teleport leaves a lasting orange beam
    if (owner === 'player' && this.arena.hasUpgrade('q')) {
      this.playerTeleportCount++;
      if (this.playerTeleportCount % FLARE_TELEPORT_INTERVAL === 0) {
        this.flareBeams.push({ x1: caster.x, y1: caster.y, x2: nx, y2: ny, until: time + FLARE_BEAM_LIFETIME_MS });
        this.pfx.sparkle(midX, midY, 8, length * 0.3, 11, LIGHT.ember);
      }
    }

    caster.setPosition(nx, ny);
    body.reset(nx, ny);

    const bouncesLeft = (isPlayer ? this.speedOLightBouncesLeft : this.npcSpeedOLightBouncesLeft) - 1;
    if (isPlayer) {
      this.speedOLightBouncesLeft = bouncesLeft;
      this.speedOLightNextBounceAt = time + SPEED_O_LIGHT_BOUNCE_MS;
    } else {
      this.npcSpeedOLightBouncesLeft = bouncesLeft;
      this.npcSpeedOLightNextBounceAt = time + SPEED_O_LIGHT_BOUNCE_MS;
    }

    if (bouncesLeft <= 0) {
      caster.dodgeChance = Math.max(0, caster.dodgeChance - 1.0);
      if (isPlayer) this.speedOLightActive = false; else this.npcSpeedOLightActive = false;
    }
  }

  private updateStreaks(time: number): void {
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      if (time >= s.until) { this.streaks.splice(i, 1); continue; }
      const targets = s.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0 || s.hitSet.has(t)) continue;
        if (distToSegment(t.x, t.y, s.x1, s.y1, s.x2, s.y2) <= STREAK_HIT_RADIUS) {
          s.hitSet.add(t);
          const hx = t.x, hy = t.y;
          t.takeDamage(STREAK_DAMAGE);
          this.fx(s.owner).flare(hx, hy, 0.7, 11, LIGHT.pale, Math.atan2(s.y2 - s.y1, s.x2 - s.x1));
          if (s.owner === 'player' && t.hp <= 0) this.arena.recordMasteryStat('speedOLightKills', 1);
        }
      }
    }
  }

  private updateFlareBeams(time: number): void {
    for (let i = this.flareBeams.length - 1; i >= 0; i--) {
      const b = this.flareBeams[i];
      if (time >= b.until) { this.flareBeams.splice(i, 1); continue; }
    }
  }

  private isOnFlareBeam(x: number, y: number): boolean {
    for (const b of this.flareBeams) {
      if (distToSegment(x, y, b.x1, b.y1, b.x2, b.y2) <= STREAK_HIT_RADIUS) return true;
    }
    return false;
  }

  // ── Mastery — Killer Kebab ───────────────────────────────────────────────

  private kebabSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'killer-kebab') return s;
    }
    return null;
  }

  /** Ability-bar fill: full while the lance is still enhanced, otherwise the recharge. */
  getKebabCooldownRatio(time: number): number {
    if (time < this.kebabWindowUntil) return 1;
    return Math.min(1, (time - this.kebabLastCastAt) / KEBAB_COOLDOWN_MS);
  }

  private tryCastKebab(time: number): void {
    if (time - this.kebabLastCastAt < KEBAB_COOLDOWN_MS) return;
    this.kebabLastCastAt = time;
    this.kebabWindowUntil = time + KEBAB_WINDOW_MS;
    this.arena.broadcastMasteryCast('killer-kebab');
    this.flashKebabEnhance('player');
  }

  /** Online replay: the remote light player enhanced their lance. */
  doNpcKillerKebab(): void {
    this.npcKebabWindowUntil = this.arena.scene.time.now + KEBAB_WINDOW_MS;
    this.flashKebabEnhance('npc');
  }

  /** Gold flare + orbiting sparks announcing the enhanced lance. */
  private flashKebabEnhance(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = owner === 'player' ? this.carAngle : this.npcCarAngle;
    const fx = this.fx(owner);
    this.avatar(owner)?.play('flex');
    fx.flare(caster.x, caster.y, 1.1, 12, KEBAB_COLOR, angle);
    fx.ring(caster.x, caster.y, 14, 62, KEBAB_COLOR, 420, 5, 9);
    fx.shards(caster.x, caster.y, 8, { speed: 220, size: 15, color: KEBAB_COLOR, depth: 11 });
    this.arena.showFloatingText(caster.x, caster.y - 40, '🍢 KILLER KEBAB', '#ffaa22');
  }

  private isSkewered(f: Fighter): boolean {
    return this.kebabRiders.some((r) => r.fighter === f) || this.npcKebabRiders.some((r) => r.fighter === f);
  }

  /** Impale `target` on `owner`'s lance. Returns false when the lance is already full. */
  private trySkewer(time: number, owner: 'player' | 'npc', target: Fighter): boolean {
    const riders = owner === 'player' ? this.kebabRiders : this.npcKebabRiders;
    if (riders.length >= KEBAB_MAX_RIDERS) return false;
    if (this.isSkewered(target)) return false;

    riders.push({ fighter: target, until: time + KEBAB_CARRY_MS });
    target.skeweredUntil = time + KEBAB_CARRY_MS;
    // Re-applied in short bursts every frame by updateKebab, so releasing early frees them
    // without having to clear a disarm that might not be ours.
    target.applyDisarm(250);

    // Going on the spit: a gold flare at the point of entry and shards off the far side.
    const fxo = this.fx(owner);
    fxo.flare(target.x, target.y, 0.9, 12, KEBAB_COLOR);
    fxo.shards(target.x, target.y, 6, {
      speed: 200, angle: owner === 'player' ? this.carAngle : this.npcCarAngle, spread: 1.2,
      size: 13, color: KEBAB_COLOR, depth: 11,
    });
    this.arena.showFloatingText(target.x, target.y - 30, '🍢 SKEWERED', '#ffaa22');
    return true;
  }

  private updateKebab(time: number, owner: 'player' | 'npc'): void {
    const isPlayer = owner === 'player';
    const riders = isPlayer ? this.kebabRiders : this.npcKebabRiders;
    if (riders.length === 0) return;

    const caster = isPlayer ? this.arena.player : this.arena.npc;
    if (!caster.active || caster.hp <= 0) { this.clearKebab(owner); return; }

    const angle = isPlayer ? this.carAngle : this.npcCarAngle;
    const ratio = Phaser.Math.Clamp((isPlayer ? this.carSpeed : this.npcCarSpeed) / CAR_MAX_SPEED, 0, 1);
    const body = caster.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.up || body.blocked.down || body.blocked.left || body.blocked.right) {
      this.slamKebab(owner, ratio);
      return;
    }

    // Riders hang off the shaft in the order they were speared, nose to tail.
    for (let i = riders.length - 1; i >= 0; i--) {
      const r = riders[i];
      if (!r.fighter.active || r.fighter.hp <= 0) { this.dropRider(owner, i, false); continue; }
      if (time >= r.until) { this.dropRider(owner, i, true); continue; }

      const dist = KEBAB_FIRST_OFFSET + i * KEBAB_RIDER_SPACING;
      const rx = caster.x + Math.cos(angle) * dist;
      const ry = caster.y + Math.sin(angle) * dist;
      const rb = r.fighter.body as Phaser.Physics.Arcade.Body;
      r.fighter.setPosition(rx, ry);
      rb.reset(rx, ry);
      r.fighter.skeweredUntil = r.until;
      r.fighter.applyDisarm(250);
    }
    // The spit and every spike on it are painted in paintWorld from exactly this state.
    void ratio;
  }

  /** Remove one rider without a wall slam. `timedOut` distinguishes the 12s slide-off. */
  private dropRider(owner: 'player' | 'npc', index: number, timedOut: boolean): void {
    const riders = owner === 'player' ? this.kebabRiders : this.npcKebabRiders;
    const r = riders[index];
    if (!r) return;
    riders.splice(index, 1);
    r.fighter.skeweredUntil = 0;
    if (timedOut && r.fighter.active && r.fighter.hp > 0) {
      this.fx(owner).shards(r.fighter.x, r.fighter.y, 4, { speed: 130, size: 11, color: KEBAB_COLOR, depth: 11 });
      this.arena.showFloatingText(r.fighter.x, r.fighter.y - 30, '🍢 SLID FREE', '#ccbb88');
    }
  }

  /** Ram a wall: every rider is torn off the lance, harder the more speed was banked. */
  private slamKebab(owner: 'player' | 'npc', ratio: number): void {
    const { scene } = this.arena;
    const riders = owner === 'player' ? this.kebabRiders : this.npcKebabRiders;
    if (riders.length === 0) return;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dmg = KEBAB_BASE_DAMAGE + Math.round(KEBAB_MAX_BONUS_DAMAGE * ratio * ratio);

    const fx = this.fx(owner);
    for (const r of riders) {
      const f = r.fighter;
      f.skeweredUntil = 0;
      if (!f.active || f.hp <= 0) continue;
      const hx = f.x, hy = f.y;
      f.takeDamage(dmg);
      // Torn off the spit against a wall — the whole rider comes apart into light.
      fx.boom(hx, hy, 60 + ratio * 40, {
        color: mixColor(KEBAB_COLOR, LANCE_COLOR_FAST, ratio), shards: 8 + Math.round(ratio * 8), mark: false,
      });
      const fb = f.body as Phaser.Physics.Arcade.Body | null;
      if (fb && !f.knockbackImmune) {
        const away = Math.atan2(f.y - caster.y, f.x - caster.x);
        fb.setVelocity(Math.cos(away) * 180, Math.sin(away) * 180);
      }
    }
    if (owner === 'player') this.kebabRiders = []; else this.npcKebabRiders = [];

    fx.flare(caster.x, caster.y, 1.3, 12, LANCE_COLOR_FAST, owner === 'player' ? this.carAngle : this.npcCarAngle);
    fx.ring(caster.x, caster.y, 16, 90, LANCE_COLOR_FAST, 400, 5, 9);
    scene.cameras.main.shake(220, 0.006 + ratio * 0.004);
    this.arena.showFloatingText(caster.x, caster.y - 44, `💥 KEBAB SLAM ${dmg}`, '#ff6622');
    // The impact eats all your speed, riders or not.
    if (owner === 'player') this.carSpeed = 0; else this.npcCarSpeed = 0;
  }

  // ── Input ────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, scene, eKey, rKey, fKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    // Click (hold): Light Lance / car-mode
    const down = pointer.leftButtonDown();
    if (down && !this.lanceHeld) {
      this.lanceHeld = true;
      player.setScale(0.5);
      if (this.carSpeed < 40) {
        this.carAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
      }
      // Folding down into car-mode: the lance comes out and the body compresses behind it.
      this.pfx.flare(player.x, player.y, 0.8, 11, LIGHT.pale, this.carAngle);
      this.pfx.speedLines(player.x, player.y, this.carAngle, 0.9);
      this.playerAvatar?.play('punch', this.carAngle);
    } else if (!down && this.lanceHeld) {
      this.lanceHeld = false;
      player.setScale(1);
      this.lanceView = null;
      // Standing back up: the stored light escapes as a puff of shards.
      this.pfx.shards(player.x, player.y, 5, {
        speed: 120, size: 10, color: LIGHT.pale, depth: 9,
      });
    }

    // Mastery — Killer Kebab takes over whichever slot it is bound to.
    const kebabSlot = this.arena.masteryActive ? this.kebabSlot() : null;
    if (kebabSlot) {
      const kk = kebabSlot === 'e' ? eKey : kebabSlot === 'r' ? rKey : kebabSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(kk)) this.tryCastKebab(time);
    }

    // E: Blink — instantly snap heading to cursor, preserving speed
    // E+ Steam Charge: hold instead of tap — root in place aiming at the cursor, then release for a
    // stronger boost the longer you held.
    if (kebabSlot === 'e') {
      // slot taken over by the mastery ability
    } else if (this.arena.hasUpgrade('e')) {
      if (Phaser.Input.Keyboard.JustDown(eKey)) {
        if (!this.ePlusHolding && this.blinkCharges > 0 && !this.speedOLightActive) {
          this.ePlusHolding = true;
          this.ePlusHoldStart = time;
          this.pfx.ring(player.x, player.y, 50, 12, LIGHT.glass, 340, 3, 8);
          this.blinkCharges--;
          this.blinkRechargeQueue.push(time + this.blinkRechargeMs());
          this.leaveFlickerGhost('player', player.x, player.y, this.carAngle, time);
          this.arena.showFloatingText(player.x, player.y - 30, '👁️ FOCUSING', '#88ddff');
        }
      }
      if (Phaser.Input.Keyboard.JustUp(eKey) && this.ePlusHolding) {
        const heldMs = Phaser.Math.Clamp(time - this.ePlusHoldStart, 0, E_PLUS_MAX_HOLD_MS);
        const holdRatio = heldMs / E_PLUS_MAX_HOLD_MS;
        this.ePlusHolding = false;
        this.carAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        this.carBoostUntil = time + Phaser.Math.Linear(E_PLUS_BOOST_MIN_MS, E_PLUS_BOOST_MAX_MS, holdRatio);
        // Everything wound in comes out at once, scaled by how long it was held.
        this.blinkFlash('player', player.x, player.y, this.carAngle, 0.8 + holdRatio);
        this.pfx.boom(player.x, player.y, 40 + holdRatio * 70, {
          color: mixColor(LIGHT.ember, LIGHT.red, holdRatio),
          shards: 5 + Math.round(holdRatio * 10), mark: false,
        });
        scene.cameras.main.shake(120 + holdRatio * 160, 0.003 + holdRatio * 0.004);
        this.arena.showFloatingText(player.x, player.y - 30, '🔥 STEAM RELEASE', '#ff6622');
      }
    } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.blinkCharges > 0 && !this.speedOLightActive) {
        this.blinkCharges--;
        this.blinkRechargeQueue.push(time + this.blinkRechargeMs());
        // Flicker: the shape you were still standing there when you left.
        this.leaveFlickerGhost('player', player.x, player.y, this.carAngle, time);
        this.carAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        this.carBoostUntil = time + BLINK_BOOST_MS;
        this.blinkFlash('player', player.x, player.y, this.carAngle);
        this.arena.showFloatingText(player.x, player.y - 30, '⚡ BLINK', '#88ddff');
      }
    }

    // R: Prism Ramp
    if (kebabSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      if (player.castAbility('prism-ramp', playerCtx)) {
        const angle = this.lanceHeld ? this.carAngle : Math.atan2(mouseY - player.y, mouseX - player.x);
        this.placeRamp('player', player.x, player.y, angle);
        this.arena.showFloatingText(player.x, player.y - 30, '🔺 PRISM RAMP', '#88ddff');
      }
    }

    // F: Light Trick
    if (kebabSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('light-trick', playerCtx)) {
        this.triggerLightTrick('player', time, player, this.arena.enemies);
      }
    }

    // Q: Speed 'O' Light
    if (kebabSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (!this.speedOLightActive && player.castAbility('speed-o-light', playerCtx)) {
        this.startSpeedOLight('player', time);
      }
    }
  }
}
