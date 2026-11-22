import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import type { CustomStatus } from './StatusHudKit';
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
  /** The opponent's equipped upgrade slots — an online player's loadout or a Hard+ bot's. */
  hasNpcUpgrade(slot: string): boolean;
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
  /** Online PvP: the npc is a replica, so its beam's length and aim arrive over the wire. */
  readonly isOnline: boolean;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
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

// ── Q Supernova ─────────────────────────────────────────────────────────
/** Beam time bought by speed: a car at the stock top speed stops dead into six seconds of it. */
const NOVA_MS_AT_TOP_SPEED = 6000;
/** Redline banks past the stock top end; this is the longest a beam will ever run. */
const NOVA_MAX_MS = 9000;
/** Below this there is nothing to convert, and the press is refused rather than wasted. */
const NOVA_MIN_SPEED = 40;
/** Subterfuge's Dark Treachery puts the beam on a body that was never driving. */
const NOVA_FOREIGN_MS = 3000;
/** Palms sit this far out along the aim, so the beam leaves the hands rather than the chest. */
const NOVA_PALM_OFFSET = 22;
const NOVA_HALF_WIDTH = 18;
const NOVA_HIT_PAD = 16;
/** Fire's Supernova turning radius: radians per second the beam may swing toward the aim. */
const NOVA_TURN_RATE = 0.85;
const NOVA_TICK_MS = 200;
const NOVA_TICK_DAMAGE = 9;           // 45 a second
/** Online: how often the owner re-sends where the beam is being pulled. */
const NOVA_NET_AIM_MS = 150;
/** A bot only stops into a beam once it has this much of its top speed banked. */
const NOVA_BOT_MIN_RATIO = 0.6;

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
/** Crawl speed while the drill is inside somebody — back to full speed once it is out the far side. */
const DRILL_GRIND_SPEED = 25;
const DRILL_HIT_RADIUS = 26;
const DRILL_STUN_MS = 500;
const DRILL_STUN_TICK_MS = 500;
/** Damage is ground in on this tick for as long as the drill is inside a body. */
const DRILL_DAMAGE_TICK_MS = 100;
const DRILL_MIN_DAMAGE = 2;
const DRILL_MAX_DAMAGE = 6;
const DRILL_LIFETIME_MS = 6000;
/** R must be let go within this long of reaching the ramp (either side of it) to fire the drill. */
const DRILL_RELEASE_WINDOW_MS = 180;

// ── F+ Javelin Burst ────────────────────────────────────────────────────
const F_PLUS_JAVELIN_COUNT = 12;
const F_PLUS_JAVELIN_SPEED = 480;

// ── Q+ Solar Dynamo ─────────────────────────────────────────────────────
/** A live beam burns its current line into the floor on this beat. */
const SCORCH_EVERY_MS = 500;
const SCORCH_LIFE_MS = 14000;
/** Per side; the oldest strip cools first. */
const SCORCH_MAX = 14;
const SCORCH_HALF_WIDTH = 26;
/** Speed gained per second on your own scorch — on top of the car's own, turning or not. */
const SCORCH_ACCEL = 240;

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

/** A live Supernova beam. Owner-agnostic: the NPC's (bot or online replica) runs here too. */
interface LightNova {
  owner: 'player' | 'npc';
  angle: number;
  startedAt: number;
  /** The banked speed, spent: the beam goes out at this timestamp whatever happens. */
  endsAt: number;
  /** Where the beam is being pulled toward — the cursor, the bot's target, or a relayed aim. */
  pullX: number;
  pullY: number;
  tickAccum: number;
  netAccum: number;
  scorchAccum: number;
}

interface LightDrill {
  x: number;
  y: number;
  angle: number;
  speed: number;
  dmg: number;
  hitTarget: Fighter | null;
  nextStunAt: number;
  nextTickAt: number;
  until: number;
}

/** Solar Dynamo: one line a Supernova burned into the floor. */
interface LightScorch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  owner: 'player' | 'npc';
  until: number;
  seed: number;
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

/** How far a ray from (x, y) at `angle` travels before it leaves the w × h arena. */
function rayToWall(x: number, y: number, angle: number, w: number, h: number): number {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let t = Infinity;
  if (cos > 1e-6) t = Math.min(t, (w - x) / cos);
  else if (cos < -1e-6) t = Math.min(t, -x / cos);
  if (sin > 1e-6) t = Math.min(t, (h - y) / sin);
  else if (sin < -1e-6) t = Math.min(t, -y / sin);
  return t === Infinity ? 0 : Math.max(0, t);
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
   * Two layers, because these objects are not all in the same place. Ramps and Solar Dynamo
   * scorch lie on the floor and must pass *under* the fighters; lances, drills and the kebab
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
  private lanceHitCooldowns: Map<Fighter, number> = new Map();

  /** Q — Supernova, per side. Null when no beam is open. */
  private playerNova: LightNova | null = null;
  private npcNova: LightNova | null = null;
  /** The beam layer: over the floor, under the fighters' held-out layer. */
  private novaGfx: Phaser.GameObjects.Graphics | null = null;

  /** The lance tachometer under the HP bar — one Graphics repainted every frame it is shown. */
  private accelGfx: Phaser.GameObjects.Graphics | null = null;

  // ── Click+ Redline ───────────────────────────────────────────────────────
  private dangerVignette: Phaser.GameObjects.Graphics | null = null;

  // ── E+ Steam Charge ──────────────────────────────────────────────────────
  private ePlusHolding = false;
  private ePlusHoldStart = 0;
  private nextSteamAt = 0;

  // ── R+ Prism Drill ───────────────────────────────────────────────────────
  private drills: LightDrill[] = [];
  private playerStunUntil = 0;
  private npcStunUntil = 0;
  /** R's state last frame, so the moment it is let go can be timed against a ramp contact. */
  private rWasDown = false;
  private rReleasedAt = -Infinity;
  /** A ramp reached with R still held: rides normally unless R is let go inside the window. */
  private pendingDrill: { ramp: LightRamp; until: number } | null = null;

  // ── Q+ Solar Dynamo ──────────────────────────────────────────────────────
  private scorches: LightScorch[] = [];

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

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: 'player' | 'npc'): string | null {
    const speed = owner === 'player' ? this.carSpeed : this.npcCarSpeed;
    if (speed <= 1) return null;
    if (owner === 'player') this.carSpeed *= 0.5; else this.npcCarSpeed *= 0.5;
    return '−50% SPEED';
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
    this.lanceHitCooldowns.clear();

    this.playerNova = null;
    this.npcNova = null;
    if (this.novaGfx) { this.novaGfx.destroy(); this.novaGfx = null; }

    this.destroyAccelBar();

    this.destroyDangerVignette();

    this.ePlusHolding = false;
    this.ePlusHoldStart = 0;
    this.nextSteamAt = 0;

    this.drills = [];
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;
    this.rWasDown = false;
    this.rReleasedAt = -Infinity;
    this.pendingDrill = null;

    this.scorches = [];

    this.auroraLastHp = -1;
    this.auroraSurge = 0;

    this.npcCarAngle = 0;
    this.npcCarSpeed = 0;
    this.npcCarBoostUntil = 0;
    this.npcRamps = [];
    this.npcLanceHitCooldowns.clear();

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

      if (this.playerNova) {
        // Supernova: stopped dead and rooted. The beam itself is run below, for either side.
        playerBody.setVelocity(0, 0);
        this.destroyAccelBar();
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
      if (this.npcNova) {
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
      if (npcCastId === 'light-supernova' && !this.npcNova) {
        // A replica's banked speed lives on the other machine: run it long and let the
        // owner's relayed stop end it.
        this.startNova('npc', time, this.arena.isOnline ? NOVA_MAX_MS : this.novaMsFor(this.npcCarSpeed));
      }
    }

    // Supernova runs for either side whether or not Light is the element — Subterfuge's Dark
    // Treachery can hand the beam to anyone.
    this.updateNova(this.playerNova, time, delta);
    this.updateNova(this.npcNova, time, delta);
    this.paintNovas(time);

    // R+ Prism Drill is timed off the moment R comes up, so track that edge every frame.
    const rDown = this.arena.rKey.isDown;
    if (this.rWasDown && !rDown) this.rReleasedAt = time;
    this.rWasDown = rDown;

    // Ramp overlap checks run unconditionally — each array is naturally empty
    // on whichever side isn't playing Light this match.
    this.updateRampArray(time, this.ramps, player, this.arena.enemies);
    this.updateRampArray(time, this.npcRamps, npc, [player]);
    this.resolvePendingDrill(time);

    this.updateScorches(time);
    this.updateDrills(time, delta);

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
      || this.scorches.length > 0 || this.flickerGhosts.length > 0
      || auroraUp;
    if (hasGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      // The curtain is worn, so it goes down first and everything else lies over it.
      if (auroraUp) LightFx.drawAurora(g, this.pcol, player.x, player.y, this.vizT, this.auroraSurge);
      // Scorch is burned into the floor itself, so it sits under the ramps.
      for (const s of this.scorches) {
        const life = Phaser.Math.Clamp((s.until - time) / SCORCH_LIFE_MS, 0, 1);
        LightFx.drawScorch(g, this.col(s.owner), s.x1, s.y1, s.x2, s.y2, SCORCH_HALF_WIDTH, life, this.vizT, s.seed);
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
      const nova = this.playerNova;
      const driving = this.lanceHeld && !nova;
      const aim = nova ? nova.angle : driving || this.ePlusHolding
        ? this.carAngle
        : Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x);
      this.playerAvatar.setFacing(aim);
      this.playerAvatar.setSpeed(driving ? ratio : 0);
      this.playerAvatar.setIntensity(nova ? 1.5 : time < this.carBoostUntil ? 1.2 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Single owner of setHold: a Supernova throws both palms out down the beam, driving pins
      // them to the wheel, a steam charge hauls them back into the chest, and otherwise the
      // idle sway runs.
      this.playerAvatar.setHold(nova ? 'spray' : this.ePlusHolding ? 'charge' : driving ? 'ride' : null, aim);
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
      const npcAim = this.npcNova ? this.npcNova.angle : this.npcCarAngle;
      this.npcAvatar.setFacing(npcAim);
      this.npcAvatar.setSpeed(this.npcNova ? 0 : Phaser.Math.Clamp(this.npcCarSpeed / CAR_MAX_SPEED, 0, 1));
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.setHold(this.npcNova ? 'spray' : 'ride', npcAim);
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

    const owner = isPlayer ? 'player' : 'npc';
    const accelRate = CAR_ACCEL_RATE;

    // Mastery — Unstoppable: the lance bites into the corner, so a hard turn costs far less speed.
    const unstoppable = isPlayer ? this.arena.masteryActive : this.arena.npcMasteryActive;
    const brakeRate = unstoppable ? CAR_TURN_BRAKE_RATE * UNSTOPPABLE_BRAKE_MULT : CAR_TURN_BRAKE_RATE;

    if (absDiff < STRAIGHT_THRESHOLD) {
      speed = Math.min(maxSpeed, speed + accelRate * dtS);
    } else {
      speed = Math.max(CAR_MIN_COAST, speed - brakeRate * dtS * (absDiff / Math.PI));
    }

    // Q+ Solar Dynamo: your own scorch keeps feeding you speed — on a straightaway or mid-drift.
    if (this.scorches.length > 0 && this.isOnScorch(owner, body.center.x, body.center.y)) {
      speed += SCORCH_ACCEL * dtS;
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

  private ensureAccelBar(): Phaser.GameObjects.Graphics {
    if (!this.accelGfx || !this.accelGfx.active) this.accelGfx = this.arena.scene.add.graphics().setDepth(20);
    return this.accelGfx;
  }

  /**
   * The lance tachometer: a chrome-bezelled dash strip of LED cells that warm from pale gold to
   * red as the car accelerates, with a redline band (Click+), tick marks, a glowing needle at
   * the fill edge and speed chevrons that strobe near the top end.
   */
  private updateAccelBar(ratio: number): void {
    const g = this.ensureAccelBar();
    g.clear();
    const { width: W, hpBarY, hpBarH } = this.arena;
    const col = this.pcol;
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    const barW = 220, barH = 8;
    const cy = hpBarY + hpBarH / 2 + 3 + barH / 2;
    const L = W / 2 - barW / 2, T = cy - barH / 2;
    const t = this.arena.scene.time.now / 1000;
    const redline = this.arena.hasUpgrade('click') ? CLICK_PLUS_DANGER_RATIO : 1;

    // Bezel: dark well inside a chrome rim with a lit top edge, slanted ends like a dash gauge.
    const bez = (dx: number, dy: number) => [
      new Phaser.Geom.Point(L - 6 - dx, T - 3 - dy), new Phaser.Geom.Point(L + barW + 10 + dx, T - 3 - dy),
      new Phaser.Geom.Point(L + barW + 4 + dx, T + barH + 3 + dy), new Phaser.Geom.Point(L - 12 - dx, T + barH + 3 + dy),
    ];
    g.fillStyle(0x000000, 0.35); g.fillPoints(bez(1, 1).map((p) => new Phaser.Geom.Point(p.x + 1, p.y + 2)), true);
    g.fillStyle(col(LIGHT.steel), 1); g.fillPoints(bez(1.5, 1.5), true);
    g.fillStyle(col(LIGHT.shade), 0.96); g.fillPoints(bez(0, 0), true);
    g.lineStyle(1, col(LIGHT.glass), 0.55);
    g.lineBetween(L - 7, T - 4.5, L + barW + 11, T - 4.5);

    // LED cells.
    const cells = 22, gap = 1.6, cw = (barW - gap * (cells - 1)) / cells;
    const lit = r * cells;
    for (let i = 0; i < cells; i++) {
      const u = (i + 0.5) / cells;
      const cx0 = L + i * (cw + gap);
      const c = u >= redline ? LIGHT.red : mixColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, u);
      const on = Phaser.Math.Clamp(lit - i, 0, 1);
      g.fillStyle(col(u >= redline ? 0x3a0800 : 0x1c1a10), 1);
      g.fillRect(cx0, T, cw, barH);
      if (on > 0) {
        g.fillStyle(col(c), 0.45 + on * 0.55);
        g.fillRect(cx0, T, cw, barH);
        g.fillStyle(col(LIGHT.white), 0.35 * on);
        g.fillRect(cx0, T, cw, 2);
      }
    }
    // Redline band marker and ticks under the strip.
    if (redline < 1) {
      const rx = L + barW * redline;
      g.lineStyle(1.5, col(LIGHT.red), 0.6 + 0.4 * Math.sin(t * 8) * (r > redline ? 1 : 0));
      g.lineBetween(rx, T - 3, rx, T + barH + 3);
    }
    g.lineStyle(1, col(LIGHT.glass), 0.35);
    for (let k = 0; k <= 10; k++) {
      const tx = L + (barW * k) / 10;
      g.lineBetween(tx, T + barH + 1, tx, T + barH + (k % 5 === 0 ? 4 : 2.5));
    }
    // The needle: a hot bead riding the fill edge.
    if (r > 0.01) {
      const nx = L + barW * r;
      const nc = mixColor(LANCE_COLOR_SLOW, LANCE_COLOR_FAST, r);
      g.fillStyle(col(nc), 0.3 + 0.15 * Math.sin(t * 12));
      g.fillCircle(nx, cy, 7);
      g.fillStyle(col(LIGHT.white), 0.95);
      g.fillRect(nx - 1, T - 2, 2, barH + 4);
    }
    // Speed chevrons at the right end strobe as the lance nears the top.
    if (r > 0.6) {
      const k = (r - 0.6) / 0.4;
      for (let i = 0; i < 3; i++) {
        const blink = (Math.floor(t * 10) + i) % 3 === 0 ? 1 : 0.4;
        const hx = L + barW + 16 + i * 6;
        g.lineStyle(2, col(r > redline ? LIGHT.red : LIGHT.gold), k * blink);
        g.lineBetween(hx, T - 1, hx + 4, cy);
        g.lineBetween(hx + 4, cy, hx, T + barH + 1);
      }
    }
  }

  private destroyAccelBar(): void {
    this.accelGfx?.destroy();
    this.accelGfx = null;
  }

  // ── Click+ Redline danger vignette ─────────────────────────────────────────

  /**
   * Redline warning: a red vignette that feathers in from every screen edge in layered bands,
   * pulsing like a warning light, with hazard corner brackets.
   */
  private updateDangerVignette(alpha: number): void {
    if (alpha <= 0) { this.destroyDangerVignette(); return; }
    if (!this.dangerVignette || !this.dangerVignette.active) {
      this.dangerVignette = this.arena.scene.add.graphics().setScrollFactor(0).setDepth(999);
    }
    const g = this.dangerVignette;
    g.clear();
    const { width: W, height: H } = this.arena;
    const pulse = 0.8 + 0.2 * Math.sin(this.arena.scene.time.now / 90);
    const bands = 6, depth = 48;
    for (let i = 0; i < bands; i++) {
      const d = (depth / bands) * (i + 1);
      const a = alpha * pulse * 1.1 * (1 - i / bands);
      g.fillStyle(this.pcol(LIGHT.red), a);
      const inset = (depth / bands) * i;
      g.fillRect(inset, inset, W - inset * 2, d - inset);
      g.fillRect(inset, H - d, W - inset * 2, d - inset);
      g.fillRect(inset, d, d - inset, H - d * 2);
      g.fillRect(W - d, d, d - inset, H - d * 2);
    }
    g.lineStyle(3, this.pcol(LIGHT.amber), alpha * 1.6 * pulse);
    for (const [x, y, sx, sy] of [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]]) {
      g.lineBetween(x, y, x + sx * 34, y);
      g.lineBetween(x, y, x, y + sy * 34);
    }
  }

  private destroyDangerVignette(): void {
    this.dangerVignette?.destroy();
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
          // R+ Prism Drill: letting go of R right as your held lance reaches your own ramp fires the
          // drill instead. Just let go → fire now; still held → wait out the window for the release.
          const drillable = f === ownerFighter && f === this.arena.player && this.lanceHeld &&
            this.arena.hasUpgrade('r');
          if (drillable && time - this.rReleasedAt <= DRILL_RELEASE_WINDOW_MS) {
            this.launchPrismDrill(ramp, time);
            shattered.push(ramp);
          } else if (drillable && this.arena.rKey.isDown && !this.pendingDrill) {
            this.pendingDrill = { ramp, until: time + DRILL_RELEASE_WINDOW_MS };
          } else {
            this.rideRamp(ramp, f, f === ownerFighter, time);
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

  /** Driving over a ramp: three lances out of the prism, and a boost if it was your own. */
  private rideRamp(ramp: LightRamp, f: Fighter, isOwner: boolean, time: number): void {
    this.launchRampLances(ramp);
    // Hitting the ramp: the light breaks apart into its spectrum along the heading.
    this.fx(ramp.owner).boom(ramp.x, ramp.y, 54, { color: LIGHT.cyan, shards: 8, mark: false });
    if (!isOwner) return;
    if (ramp.owner === 'player') {
      this.carBoostUntil = time + RAMP_BOOST_MS;
      this.arena.recordMasteryStat('rampRides', 1);
    } else this.npcCarBoostUntil = time + RAMP_BOOST_MS;
    this.arena.showFloatingText(f.x, f.y - 30, '⚡ RAMP BOOST', '#66ddff');
  }

  /** A ramp reached with R held: R let go in time fires the drill, otherwise it is ridden as normal. */
  private resolvePendingDrill(time: number): void {
    const pending = this.pendingDrill;
    if (!pending) return;
    const { ramp } = pending;
    if (!this.ramps.includes(ramp)) { this.pendingDrill = null; return; }
    if (this.lanceHeld && !this.arena.rKey.isDown && time <= pending.until) {
      this.pendingDrill = null;
      this.launchPrismDrill(ramp, time);
      this.ramps.splice(this.ramps.indexOf(ramp), 1);
    } else if (time > pending.until || !this.lanceHeld) {
      this.pendingDrill = null;
      this.rideRamp(ramp, this.arena.player, true, time);
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
      hitTarget: null, nextStunAt: 0, nextTickAt: 0, until: time + DRILL_LIFETIME_MS,
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

      // Inside somebody the drill crawls and grinds damage in on a fast tick; once it is out the far
      // side it picks its full speed back up.
      let inside: Fighter | null = null;
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) <= DRILL_HIT_RADIUS) { inside = t; break; }
      }
      if (!inside) {
        d.hitTarget = null;
        d.speed = DRILL_SPEED;
        continue;
      }
      const t = inside;
      if (d.hitTarget !== t) {
        d.hitTarget = t;
        d.nextTickAt = time;
        d.nextStunAt = time;
        // Biting in: the drill throws its spectrum back out of the wound.
        this.pfx.boom(t.x, t.y, 46, { color: LIGHT.red, shards: 7, mark: false, duration: 300 });
        this.arena.recordMasteryStat('drillHits', 1);
      }
      d.speed = DRILL_GRIND_SPEED;
      if (time >= d.nextTickAt) {
        d.nextTickAt = time + DRILL_DAMAGE_TICK_MS;
        t.takeDamage(d.dmg);
        this.pfx.shards(t.x, t.y, 2, { speed: 220, angle: d.angle + Math.PI, spread: 1.2, color: LIGHT.ember, depth: 10 });
      }
      if (time >= d.nextStunAt) {
        d.nextStunAt = time + DRILL_STUN_TICK_MS;
        if (t === this.arena.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + DRILL_STUN_MS);
        else this.npcStunUntil = Math.max(this.npcStunUntil, time + DRILL_STUN_MS);
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

    // F+ Javelin Burst: if the trick also catches a prism ramp — either fighter's — that ramp
    // fires 12 javelins (owned by the ramp's owner) and both boosts are granted at once.
    const rampHit = this.upgraded(owner, 'f') ? this.trickRampNear(caster.x, caster.y) : null;

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

  private trickRampNear(x: number, y: number): LightRamp | null {
    for (const r of this.ramps) if (Phaser.Math.Distance.Between(x, y, r.x, r.y) <= TRICK_RADIUS) return r;
    for (const r of this.npcRamps) if (Phaser.Math.Distance.Between(x, y, r.x, r.y) <= TRICK_RADIUS) return r;
    return null;
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

  /**
   * Bot synergy (F+ Javelin Burst): the bot is standing on a ramp close enough for Light Trick
   * to pop it. Side-effect-free; the kit owns the radius and the upgrade check.
   */
  npcTrickRampReady(): boolean {
    const npc = this.arena.npc;
    return this.upgraded('npc', 'f') && this.trickRampNear(npc.x, npc.y) !== null;
  }

  // ── Q — Supernova ────────────────────────────────────────────────────────

  private novaOf(owner: 'player' | 'npc'): LightNova | null {
    return owner === 'player' ? this.playerNova : this.npcNova;
  }

  /** How long a beam this much speed buys. Redline's doubled top end is capped at NOVA_MAX_MS. */
  private novaMsFor(speed: number): number {
    return Math.min(NOVA_MAX_MS, (speed / CAR_MAX_SPEED) * NOVA_MS_AT_TOP_SPEED);
  }

  /**
   * The speed the player has to convert right now: the car's, while driving, and otherwise
   * whatever the body is actually moving at on foot.
   */
  private playerSpeedNow(): number {
    const body = this.arena.player.body as Phaser.Physics.Arcade.Body;
    const onFoot = body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    return Math.max(this.lanceHeld ? this.carSpeed : 0, onFoot);
  }

  /** True while either side has a beam open — keeps the kit ticking for a borrowed one. */
  hasActiveNova(): boolean {
    return this.playerNova !== null || this.npcNova !== null;
  }

  /**
   * Bot synergy, owner-side: the bot's car has banked enough speed that stopping dead buys a
   * beam worth the charge. Ramps, tricks, blinks and its own scorch all feed this. Side-effect-free.
   */
  npcNovaReady(): boolean {
    return !this.npcNova && this.npcCarSpeed / CAR_MAX_SPEED >= NOVA_BOT_MIN_RATIO;
  }

  /**
   * Open a Supernova: stop on a dime and let the speed out as light. `durationMs` is the speed
   * already converted; the default is Subterfuge's Dark Treachery, which borrows the beam onto a
   * body that was never driving. Public for that reason.
   */
  startNova(owner: 'player' | 'npc', time: number, durationMs = NOVA_FOREIGN_MS): void {
    if (this.novaOf(owner)) return;
    const { player, npc, scene } = this.arena;
    const f = owner === 'player' ? player : npc;
    if (!f?.active || f.hp <= 0) return;
    const ptr = scene.input.activePointer;
    const aimX = owner === 'player' ? ptr.worldX : player.x;
    const aimY = owner === 'player' ? ptr.worldY : player.y;
    const nova: LightNova = {
      owner,
      angle: Math.atan2(aimY - f.y, aimX - f.x),
      startedAt: time,
      endsAt: time + Math.max(250, durationMs),
      pullX: aimX, pullY: aimY,
      tickAccum: 0, netAccum: 0, scorchAccum: 0,
    };
    if (owner === 'player') this.playerNova = nova; else this.npcNova = nova;

    // Stopped on a dime: every bit of the speed is in the beam now, none of it in the car.
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    if (owner === 'player') this.carSpeed = 0; else this.npcCarSpeed = 0;

    const fx = this.fx(owner);
    fx.flare(f.x, f.y, 1.5, 12, LIGHT.white, nova.angle);
    fx.ring(f.x, f.y, 10, 96, LIGHT.gold, 360, 5, 9);
    fx.speedLines(f.x, f.y, nova.angle + Math.PI, 1.2, 10, LIGHT.pale);
    scene.cameras.main.shake(220, 0.006);
    this.arena.showFloatingText(f.x, f.y - 46, `🌟 SUPERNOVA ${(durationMs / 1000).toFixed(1)}s`, '#fff4a8');
  }

  /** End a beam: Q again, the banked speed running out, its caster going down, or a relayed stop. */
  stopNova(owner: 'player' | 'npc'): void {
    const nova = this.novaOf(owner);
    if (!nova) return;
    if (owner === 'player') {
      this.playerNova = null;
      this.arena.setStatusIndicator('light-supernova', null);
      // The replica on the other machine never knew how long this one was going to run.
      this.arena.broadcastMasteryCast('light-nova-stop');
    } else {
      this.npcNova = null;
    }
    const f = owner === 'player' ? this.arena.player : this.arena.npc;
    if (f?.active) {
      // The star goes out: a last flash at the palms and the light scattering off them.
      const fx = this.fx(owner);
      fx.flare(f.x, f.y, 0.9, 11, LIGHT.pale, nova.angle);
      fx.shards(f.x, f.y, 6, { speed: 160, angle: nova.angle, spread: 1.4, size: 11, color: LIGHT.gold, depth: 9 });
    }
  }

  /** Beam endpoints for this frame: palms → the wall, however far that is. */
  private novaSegment(nova: LightNova, f: Fighter): { x0: number; y0: number; x1: number; y1: number } {
    const cos = Math.cos(nova.angle), sin = Math.sin(nova.angle);
    const x0 = f.x + cos * NOVA_PALM_OFFSET, y0 = f.y + sin * NOVA_PALM_OFFSET;
    const len = rayToWall(x0, y0, nova.angle, this.arena.width, this.arena.height);
    return { x0, y0, x1: x0 + cos * len, y1: y0 + sin * len };
  }

  private updateNova(nova: LightNova | null, time: number, delta: number): void {
    if (!nova) return;
    const owner = nova.owner;
    const { player, npc, scene } = this.arena;
    const f = owner === 'player' ? player : npc;
    const isReplica = owner === 'npc' && this.arena.isOnline;
    if (!f?.active || f.hp <= 0 || time >= nova.endsAt) { this.stopNova(owner); return; }
    // A stunned or frozen caster lets go — unless Unstoppable says nothing sticks. A replica
    // waits for the owner's own stop instead, since the hold lands on the owner's sim.
    const held = !f.unstoppable
      && (f.stunnedUntil > Date.now() || f.earthStunnedUntil > time || f.frozenUntil > time);
    if (held && !isReplica) { this.stopNova(owner); return; }

    // Where the beam is being pulled: the cursor, or the bot's quarry. A replica's pull point
    // arrives over the wire (light-nova-aim).
    if (owner === 'player') {
      const ptr = scene.input.activePointer;
      nova.pullX = ptr.worldX; nova.pullY = ptr.worldY;
    } else if (!isReplica) {
      nova.pullX = player.x; nova.pullY = player.y;
    }
    const want = Math.atan2(nova.pullY - f.y, nova.pullX - f.x);
    const diff = Phaser.Math.Angle.Wrap(want - nova.angle);
    const maxTurn = NOVA_TURN_RATE * (delta / 1000);
    nova.angle += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);

    // Online: keep the peer's replica of the beam pointing where ours points.
    if (owner === 'player' && this.arena.isOnline) {
      nova.netAccum += delta;
      if (nova.netAccum >= NOVA_NET_AIM_MS) { nova.netAccum = 0; this.arena.broadcastMasteryCast('light-nova-aim'); }
    }

    const seg = this.novaSegment(nova, f);
    const cos = Math.cos(nova.angle), sin = Math.sin(nova.angle);

    // Damage ticks, the full length of the beam.
    nova.tickAccum += delta;
    while (nova.tickAccum >= NOVA_TICK_MS) {
      nova.tickAccum -= NOVA_TICK_MS;
      const targets = owner === 'player' ? this.arena.enemies : [player];
      for (const t of targets) {
        if (!t?.active || t.hp <= 0) continue;
        const dx = t.x - seg.x0, dy = t.y - seg.y0;
        const along = dx * cos + dy * sin;
        const perp = Math.abs(-dx * sin + dy * cos);
        if (along < -NOVA_HIT_PAD || perp > NOVA_HALF_WIDTH + NOVA_HIT_PAD) continue;
        const hx = t.x, hy = t.y;
        t.takeDamage(NOVA_TICK_DAMAGE);
        this.fx(owner).flare(hx, hy, 0.55, 11, LIGHT.pale, nova.angle);
        if (owner === 'player' && t.hp <= 0) this.arena.recordMasteryStat('speedOLightKills', 1);
      }
    }

    // Q+ Solar Dynamo: the beam burns its line into the floor on a beat.
    if (this.upgraded(owner, 'q')) {
      nova.scorchAccum += delta;
      if (nova.scorchAccum >= SCORCH_EVERY_MS) {
        nova.scorchAccum -= SCORCH_EVERY_MS;
        this.layScorch(owner, f.x, f.y, seg.x1, seg.y1, time);
      }
    }

    if (owner === 'player') {
      this.arena.setStatusIndicator('light-supernova', {
        name: 'Supernova', emoji: '🌟', color: LIGHT.gold, priority: 119, until: nova.endsAt,
        description: 'Stopped dead, pouring your banked speed out as a beam that reaches the wall. It turns slowly after your cursor. Press Q to let go early.',
      });
    }
  }

  /** The beam layer and the fuel gauge over each caster. */
  private paintNovas(time: number): void {
    if (!this.playerNova && !this.npcNova) {
      if (this.novaGfx) this.novaGfx.clear();
      return;
    }
    if (!this.novaGfx || !this.novaGfx.active) this.novaGfx = this.arena.scene.add.graphics().setDepth(6);
    const g = this.novaGfx;
    g.clear();
    for (const nova of [this.playerNova, this.npcNova]) {
      if (!nova) continue;
      const f = nova.owner === 'player' ? this.arena.player : this.arena.npc;
      if (!f?.active) continue;
      const tint = this.col(nova.owner);
      const seg = this.novaSegment(nova, f);
      const span = Math.max(1, nova.endsAt - nova.startedAt);
      const fuel = Phaser.Math.Clamp((nova.endsAt - time) / span, 0, 1);
      LightFx.drawNova(g, tint, seg.x0, seg.y0, seg.x1, seg.y1, fuel, this.vizT);
      // The fuel gauge: the speed that is left, burning down from gold to ember.
      if (nova.owner === 'npc' && this.arena.isOnline) continue;
      const bw = 52, bh = 6, bx = f.x - bw / 2, by = f.y - 56;
      g.fillStyle(0x000000, 0.55);
      g.fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 3);
      g.fillStyle(tint(mixColor(LIGHT.ember, LIGHT.gold, fuel)), 1);
      g.fillRoundedRect(bx, by, Math.max(2, bw * fuel), bh, 2);
      g.fillStyle(tint(LIGHT.white), 0.9);
      g.fillCircle(bx + bw * fuel, by + bh / 2, 3 + Math.sin(this.vizT * 20));
    }
  }

  // ── Q+ Solar Dynamo ──────────────────────────────────────────────────────

  private layScorch(owner: 'player' | 'npc', x0: number, y0: number, x1: number, y1: number, time: number): void {
    this.scorches.push({ x1: x0, y1: y0, x2: x1, y2: y1, owner, until: time + SCORCH_LIFE_MS, seed: Math.random() * 99 });
    const mine = this.scorches.filter((s) => s.owner === owner);
    if (mine.length > SCORCH_MAX) this.scorches.splice(this.scorches.indexOf(mine[0]), 1);
    // A puff of embers off the fresh line.
    const k = 0.3 + Math.random() * 0.5;
    this.fx(owner).sparkle(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 4, 30, 5, LIGHT.ember);
  }

  private updateScorches(time: number): void {
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      if (time >= this.scorches[i].until) this.scorches.splice(i, 1);
    }
  }

  private isOnScorch(owner: 'player' | 'npc', x: number, y: number): boolean {
    for (const s of this.scorches) {
      if (s.owner === owner && distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= SCORCH_HALF_WIDTH) return true;
    }
    return false;
  }

  /** Online replay of the peer's beam: where it is being pulled, and the moment it goes out. */
  replayNet(id: string, tx: number, ty: number): void {
    if (id === 'light-nova-aim' && this.npcNova) { this.npcNova.pullX = tx; this.npcNova.pullY = ty; }
    else if (id === 'light-nova-stop') this.stopNova('npc');
  }

  /**
   * Ruin's FormRevert contract. A Supernova is a stance, not a body — nothing here is a form,
   * and car-mode is held on the mouse rather than cast, so breaking it would last one frame.
   */
  revertForms(f: Fighter): string[] {
    void f;
    return [];
  }

  /** An upgrade read for either side: the player's own loadout, or the opponent's. */
  private upgraded(owner: 'player' | 'npc', slot: string): boolean {
    return owner === 'player' ? this.arena.hasUpgrade(slot) : this.arena.hasNpcUpgrade(slot);
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
        if (!this.ePlusHolding && this.blinkCharges > 0 && !this.playerNova) {
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
      if (this.blinkCharges > 0 && !this.playerNova) {
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

    // Q: Supernova — stop on a dime and spend the speed as a beam. Q again lets go early.
    if (kebabSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.playerNova) {
        this.stopNova('player');
      } else {
        const speed = this.playerSpeedNow();
        if (speed < NOVA_MIN_SPEED) {
          // Nothing to convert: refused here, so the charge isn't spent on a quarter-second flash.
          this.arena.showFloatingText(player.x, player.y - 34, '🌟 NO SPEED TO BURN', '#bbaa77');
        } else if (player.castAbility('light-supernova', playerCtx)) {
          this.startNova('player', time, this.novaMsFor(speed));
        }
      }
    }
  }
}
