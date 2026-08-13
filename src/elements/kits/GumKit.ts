import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  GUM, GumAvatar, GumColorFn, GumFx, bloatShell, drips, gripSplat, gumBubble, gumShell, gummyArm,
  oobleckSlab, oozeBlob, slimeBeacon, slimeling, slimePuddle, slimeShard, zipLine,
} from './GumVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

// ── The hand (passive) ───────────────────────────────────────────────────────
/** How far the arm reaches. Everything else in the element is measured against this. */
const HAND_MAX = 250;
const HAND_MIN = 20;
/** Reaching this close to an arena edge counts as gripping the wall rather than the floor. */
const WALL_BAND = 54;
/** Pixels of body movement per pixel of mouse movement while a grip is taking weight. */
const DRAG_GAIN = 1;
/** A wall gives the arm something to pull against; the floor only gives it something to slide on. */
const WALL_DRAG_GAIN = 1.35;
const DRAG_MAX_SPEED = 560;
/** Wind the cursor this far past the anchor and the grip tears loose. */
const SLIP_DIST = HAND_MAX * 1.75;

const PUNCH_DAMAGE = 20;
const PUNCH_R = 36;
const SMACK_DAMAGE = 15;
const SMACK_R = 32;
/** Hand speed, px/s, at which a passing hand counts as a smack rather than a wave. */
const SMACK_SPEED = 620;
const SMACK_GATE_MS = 520;
const GRAB_R = 34;

// ── Slime Surge (E) ──────────────────────────────────────────────────────────
const SURGE_COUNT = 3;
const BALL_R = 13;
const BALL_DAMAGE = 30;
const BALL_HARD_DAMAGE = 45;
const BALL_SLOW_MULT = 0.5;
const BALL_SLOW_MS = 3000;
/** Balls persist, so without a ceiling a patient player carpets the arena in ammunition. */
const BALL_MAX = 6;
const BALL_FLIGHT_MS = 1500;
const THROW_GAIN = 1.15;
const THROW_MIN_SPEED = 340;
const THROW_MAX_SPEED = 940;

// ── Gumball (R) ──────────────────────────────────────────────────────────────
const BUBBLE_COUNT = 9;
const BUBBLE_DAMAGE = 5;
const BUBBLE_SPEED = 540;
const BUBBLE_SPREAD = 0.46;
const BUBBLE_R = 15;
const BUBBLE_LIFE_MS = 900;
const ENCASE_MS = 5000;
const ENCASE_SLOW_MULT = 0.45;
const WALL_SLAM_DAMAGE = 30;
const WALL_STUCK_MS = 5000;
/** How long a thrown body stays "in flight" and able to earn the wall slam. */
const FLUNG_MS = 1400;

// ── Oozorbtion (F) ───────────────────────────────────────────────────────────
const ABSORB_ARM_MS = 8000;
const ABSORB_R = 42;
const DIGEST_MS = 3000;
const OOZE_SWELL = 1.2;

// ── Solidify (Q) ─────────────────────────────────────────────────────────────
const SOLIDIFY_SHARDS = 16;
const SHARD_DAMAGE = 8;
const SHARD_SPEED = 420;
const SHARD_LIFE_MS = 900;
const HAND_REGROW_MS = 3000;
const HARD_ENCASE_BONUS_MS = 5000;
const WALL_SHATTER_SHARDS = 8;

// ── Zip-Line (Click upgrade) ─────────────────────────────────────────────────
/** Three strands slung wall to wall, splitting the arena into bands. */
const ZIP_COUNT = 3;
/** How close to a line the hand has to land to catch it. Kept tight so the floor stays grabbable. */
const ZIP_BAND = 22;
const ZIP_SPEED = 640;
/** The shard hand grinding along the line. */
const ZIP_SPARK_MS = 110;
const ZIP_SPARK_COUNT = 7;
const ZIP_SPARK_DAMAGE = 4;
const ZIP_SPARK_SPEED = 300;
const ZIP_SPARK_LIFE_MS = 260;

// ── Slime Splash (E upgrade) ─────────────────────────────────────────────────
const BOMB_AOE_R = 78;
const PUDDLE_MS = 12000;
const PUDDLE_R = 46;
/** The slowest a fully-soaked body gets. The ramp is the point — one step in is nearly free. */
const PUDDLE_SLOW_FLOOR = 0.4;
const SOAK_RAMP_MS = 2500;
const SOAK_FADE_MS = 1500;
/** A rethrown puddle is a repositioning tool, not a projectile: it barely leaves your hand. */
const PUDDLE_THROW_MAX = 340;
const PUDDLE_FLIGHT_MS = 420;
const PUDDLE_MAX = 8;
const PUDDLE_GRAB_R = 40;

// ── Bubble Bloat (R upgrade) ─────────────────────────────────────────────────
/** One bubble is a gumball. Two or more and the shell starts inflating. */
const BLOAT_MIN_LAYERS = 2;
const BLOAT_DAMAGE = 12;
const BLOAT_HARD_DAMAGE = 18;
const BLOAT_BASE_R = 30;
const BLOAT_R_PER_LAYER = 7;
const BLOAT_MAX_R = 96;

// ── Emesis (F upgrade) ───────────────────────────────────────────────────────
const EMESIS_COUNT = 3;
const HEAL_RAMP_MS = 3000;
const HEAL_MIN_RATE = 3;
const HEAL_MAX_RATE = 12;

// ── Shard Hand (Q upgrade) ───────────────────────────────────────────────────
const SHARD_HAND_MS = 8000;
const SHARD_PUNCH_BONUS = 12;
const SHARD_SMACK_BONUS = 9;
/** Reach of the "everything it touches solidifies" pass. */
const SHARD_TOUCH_R = 32;

// ── Beacons (what a solidified puddle becomes) ───────────────────────────────
const BEACON_MS = 30000;
const BEACON_R = 15;
const BEACON_AURA_R = 122;
/** Hand speed that counts as shaking rather than carrying. */
const BEACON_SHAKE_SPEED = 430;
const BEACON_MIN_SHAKE_MS = 250;
const BEACON_MAX_ACTIVE_MS = 6000;
const BEACON_HEAL_RATE = 8;
const BEACON_SLOW_MULT = 0.5;

// ── Slime Split (mastery passive) ────────────────────────────────────────────
const SPLIT_COUNT = 3;
const SPLIT_HP = 50;
/** The whole pool a split body fights on. Splitting is a second life, not a heal. */
const SPLIT_POOL = SPLIT_COUNT * SPLIT_HP;
/** Hitbox and sprite while split. The cluster is genuinely a smaller target. */
const SPLIT_SIZE = 0.56;
/** The rig the lead slimeling is drawn at. */
const SPLIT_RIG = 0.62;
const LING_R = 12;
/** How far the two satellites orbit the body the physics is attached to. */
const LING_ORBIT = 42;
const LING_SPRING = 7.5;
const LING_ABSORB_R = 30;

// ── Oobleck (mastery bindable) ───────────────────────────────────────────────
const OOBLECK_COOLDOWN_MS = 16000;
/** How long a slab that has been set down lasts. A carried one never ages. */
const OOBLECK_MS = 22000;
/** The long side — the one that faces you while it is held. */
const SLAB_LEN = 132;
const SLAB_THICK = 26;
/** Shots it can hold at once. The sixth is the one that breaks it. */
const SLAB_CATCH = 5;
const SLAB_DISSOLVE_MS = 5000;
/** Bodies are stopped by a hardened slab at this much clearance. */
const SLAB_BODY_R = 18;
const OOBLECK_EFFECT_MS = 12000;
/** Speed at the very end of the effect. The ramp is the whole ability. */
const OOBLECK_SLOW_FLOOR = 0.3;
/** The slow the moment it lands, as a fraction of the ramp — a small bite, then a debt. */
const OOBLECK_SLOW_BITE = 0.15;
const NPC_OOBLECK_CHECK_MS = 400;

// ── World objects ────────────────────────────────────────────────────────────

/**
 * A slimeball, or a shot that has been caught and is waiting to be thrown back. The two share a
 * struct because from the hand's point of view they are the same object: something lying around
 * that can be picked up, aimed and released.
 */
interface Ball {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** False while it sits on the floor waiting to be picked up. */
  flying: boolean;
  hard: boolean;
  /** Caught enemy fire. Deals its own damage, applies no slow, and never comes to rest. */
  stolen: boolean;
  /** Slime Splash: this one goes off in a radius and leaves a puddle where it landed. */
  bomb: boolean;
  damage: number;
  seed: number;
  /** Game-clock time a throw gives up and the ball drops where it is. */
  landsAt: number;
  hit: Set<Fighter>;
}

interface Bubble {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  seed: number;
  hard: boolean;
}

/** One splinter of a shattered hand or a shattered ball — or a spark off a ridden zip-line. */
interface Shard {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  seed: number;
  damage: number;
  /** Struck off stone rather than broken off slime. Grey, short, and much weaker. */
  spark: boolean;
  hit: Set<Fighter>;
}

interface Encased {
  owner: Owner;
  until: number;
  hard: boolean;
}

/**
 * A slime puddle — and, once solidified, a slime beacon. The two are one struct for the same
 * reason a slimeball and a caught shot are: from the hand's point of view they are the same
 * object lying on the floor, and solidifying one is a state change rather than a replacement.
 */
interface Puddle {
  owner: Owner;
  /** Green puddles slow whoever stands in them; pink ones (Emesis) feed the slime that made them. */
  kind: 'slow' | 'heal';
  x: number;
  y: number;
  r: number;
  until: number;
  seed: number;
  /** Solidified. Still pickable, no longer throwable, and shaking it wakes it up. */
  beacon: boolean;
  /** Beacon only: ms of shaking banked while it was being carried. */
  shake: number;
  /** Beacon only: game-clock time its aura closes. 0 while it is asleep. */
  activeUntil: number;
  /** Puddles only: mid-throw. */
  flying: boolean;
  vx: number;
  vy: number;
  landsAt: number;
}

/** One horizontal strand of slime slung across the arena. */
interface Zip {
  y: number;
  seed: number;
}

/** The extra shell Bubble Bloat grows around somebody hit by more than one gumball. */
interface Bloat {
  owner: Owner;
  layers: number;
}

/** Something swallowed by Oozorbtion, sitting in the body until it breaks down. */
interface Lodged {
  damage: number;
  digestAt: number;
  seed: number;
}

/** A shot buried in an Oobleck slab, in slab-local coordinates so it rides the pane. */
interface Stuck {
  along: number;
  across: number;
  seed: number;
  /** Game-clock time it has finished dissolving and its slot comes free. */
  until: number;
}

/**
 * The Oobleck slab.
 *
 * Soft it is a filter: bodies pass through it and pick up the ramp, shots do not. Hard — once
 * Solidify has set it — it is a wall, and the same object stops both. One struct for both states
 * for the same reason a puddle and a beacon are one: hardening it is a state change, not a
 * replacement, and everything that finds it has to keep finding it.
 */
interface Slab {
  owner: Owner;
  x: number;
  y: number;
  /** Direction of the *long* axis. Held, this is perpendicular to the arm. */
  ang: number;
  until: number;
  hard: boolean;
  seed: number;
  stuck: Stuck[];
  /** Who was standing in it last frame, so a walk-through is a crossing and not a tick. */
  inside: Set<Fighter>;
}

/** One of the three bodies a mastered slime comes apart into. */
interface Ling {
  /** 0 is the lead — the one the physics body is actually attached to. */
  index: number;
  x: number;
  y: number;
  seed: number;
  /** Its place in the orbit, so the three never sit on top of each other. */
  phase: number;
  /** Its own swallowed shot. Each slimeling gets one. */
  lodged: Lodged | null;
  /** Its burst has been played. A heal can put it back, and then it can pop again. */
  popped: boolean;
}

interface Held {
  kind: 'ball' | 'body' | 'puddle' | 'oobleck';
  ball: Ball | null;
  victim: Fighter | null;
  puddle: Puddle | null;
  slab: Slab | null;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Where the hand actually is. Read back off the avatar, so the hitbox is what is drawn. */
  handX: number;
  handY: number;
  handVx: number;
  handVy: number;
  handSeeded: boolean;

  anchored: boolean;
  anchorX: number;
  anchorY: number;
  anchorWall: boolean;

  held: Held | null;
  /** Game-clock time the hand finishes growing back after Solidify. */
  handBackAt: number;
  /** Q+: game-clock time the hand of stone softens back into slime. */
  shardUntil: number;

  /** Click+: riding a zip-line. The ride owns the body until it lets go or hits a wall. */
  riding: { y: number; dir: number } | null;
  nextSparkAt: number;

  absorbUntil: number;
  swollen: boolean;
  lodged: Lodged | null;
  /** Whatever absorber the fighter was wearing before Oozorbtion took the slot. */
  prevAbsorber: ((amount: number) => boolean) | null;
  absorberInstalled: boolean;

  prevMouseX: number;
  prevMouseY: number;
  haveMouse: boolean;
  smackGate: Map<Fighter, number>;

  /** The bot's stand-in for dragging: a haul cycle that makes it lurch rather than walk. */
  haul: number;
  /** Rate-limits the bot's "reach out, then pull" ball throws. */
  nextBotThrowAt: number;

  // ── Mastery ──
  /** Oobleck: the one slab this side has out, held or standing. */
  slab: Slab | null;
  /**
   * Game-clock time of the last Oobleck. Seeded a full cooldown in the past so the first match a
   * kit ever plays does not open with the card locked — the constructor runs, `reset` does not.
   */
  oobleckCastAt: number;
  nextOobleckCheckAt: number;
  /** Slime Split: the three bodies, once it has happened. Empty before and after. */
  lings: Ling[];
  /** The split is once per match, whether or not anything is left of it. */
  splitSpent: boolean;
  /** Max HP before the split took it down to the pool, so a reused Fighter can be handed it back. */
  preSplitMaxHp: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0,
    handX: 0, handY: 0, handVx: 0, handVy: 0, handSeeded: false,
    anchored: false, anchorX: 0, anchorY: 0, anchorWall: false,
    held: null, handBackAt: 0, shardUntil: 0,
    riding: null, nextSparkAt: 0,
    absorbUntil: 0, swollen: false, lodged: null, prevAbsorber: null, absorberInstalled: false,
    prevMouseX: 0, prevMouseY: 0, haveMouse: false, smackGate: new Map(),
    haul: 0, nextBotThrowAt: 0,
    slab: null, oobleckCastAt: -OOBLECK_COOLDOWN_MS, nextOobleckCheckAt: 0,
    lings: [], splitSpent: false, preSplitMaxHp: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface GumArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. Oozorbtion and the hand both fish shots out of it. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local projectiles that never enter the shared group. Half the roster fires only here. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  /** Space dodge in progress. The dash owns the body for its duration, arm or no arm. */
  get isDodging(): boolean;
  get width(): number;
  get height(): number;
  /** Skins: maps a Slime visual colour through that side's equipped skin. */
  gumColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an E/R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded tricks reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── GumKit ───────────────────────────────────────────────────────────────────

/**
 * Slime.
 *
 * There is one object in this element and it is **the hand**. It is the character's only limb, and
 * it is simultaneously the legs (grip the floor, drag the mouse, and the body is hauled the other
 * way), the weapon (a punch, or just a fast pass over somebody), and the inventory (slimeballs and
 * gummed people are picked up and thrown with it). Because all three uses share one object, the
 * element never needs a resource bar: the cost of holding a slimeball is that you cannot walk while
 * you hold it, and the cost of the ultimate is that for three seconds you have no hand at all and
 * therefore cannot move an inch. Every trade in the kit is paid in the same currency.
 *
 * The locomotion is deliberately inverted, and it is the thing to get right. The anchor is a fixed
 * point in the world; while it holds, mouse movement moves the *body*, in the opposite direction.
 * Drag the mouse down and the arm hauls you up toward whatever you grabbed. That is why the whole
 * arena is a set of handholds rather than a floor — and why gripping a wall pulls harder than
 * gripping the ground, since a wall is something to pull against rather than slide on.
 *
 * The one thing the body does without the hand is `Oozorbtion`, which swells it and lets it eat an
 * incoming attack whole. It is caught two ways on purpose — shots are plucked out of the air before
 * they land, and anything else is taken by a damage absorber — because an ability that only answers
 * projectiles would be a dead button against half the roster.
 */
export class GumKit {
  private api: GumArenaApi;

  // ── Visuals ──
  private readonly pcol: GumColorFn;
  private readonly ncol: GumColorFn;
  private readonly pfx: GumFx;
  private readonly nfx: GumFx;
  private playerAvatar: GumAvatar | null = null;
  private npcAvatar: GumAvatar | null = null;
  /** Resting slimeballs, grip splats and the puddles under everything — beneath the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bubbles, shards, thrown balls and gum shells — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private balls: Ball[] = [];
  private bubbles: Bubble[] = [];
  private shards: Shard[] = [];
  private puddles: Puddle[] = [];
  /** Built once a side owns the Click upgrade; they are part of the arena, not of a cast. */
  private zips: Zip[] = [];
  private encased = new Map<Fighter, Encased>();
  private bloat = new Map<Fighter, Bloat>();
  /**
   * How deep somebody has sunk into a slime puddle, 0–1. Rises while they stand in one and falls
   * when they step out — the ramp *is* the ability, so this is the one number that matters.
   */
  private slowSoak = new Map<Fighter, number>();
  private healSoak = new Map<Fighter, number>();
  /** Fractional healing carried between frames, so a 3 HP/s trickle is not rounded away to nothing. */
  private healAcc = new Map<Fighter, number>();
  /**
   * Bodies mid-throw, watching for a wall. The velocity is kept here and re-applied every frame
   * because the AI writes its own the moment `doAI` runs, which is *before* this kit updates —
   * a throw set once at the mouse-up would be erased on the very next tick.
   */
  private flung = new Map<Fighter, { owner: Owner; hard: boolean; until: number; vx: number; vy: number }>();
  private slowUntil = new Map<Fighter, number>();
  private stuckUntil = new Map<Fighter, { owner: Owner; until: number }>();
  /** Everything this kit has written `walkSpeedMult` onto, so `reset` can hand it all back. */
  private touchedWalk = new Set<Fighter>();
  private pointerDown = false;
  /** This frame's mouse travel, consumed by the drag and cleared straight after. */
  private mouseDX = 0;
  private mouseDY = 0;
  /**
   * Oobleck's ramp, per body: the slow gets worse the closer it is to expiring, so what matters
   * is when it started as much as when it ends.
   */
  private oobleck = new Map<Fighter, { owner: Owner; from: number; until: number }>();
  /** Everything Slime Split has put a death floor on, so `reset` can hand every one of them back. */
  private floored = new Set<Fighter>();

  constructor(api: GumArenaApi) {
    this.api = api;
    this.pcol = (base) => api.gumColor('player', base);
    this.ncol = (base) => api.gumColor('npc', base);
    this.pfx = new GumFx(api.scene, this.pcol);
    this.nfx = new GumFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): GumFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): GumColorFn { return owner === 'player' ? this.pcol : this.ncol; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isGum(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'gum' : this.api.npcElementId === 'gum';
  }

  /** Does this side own the shop upgrade in that slot? */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** True while this side is holding the hand of stone Q+ leaves behind. */
  private hasShardHand(owner: Owner): boolean {
    return this.now < this.side(owner).shardUntil;
  }

  private avatar(owner: Owner): GumAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Where the hand is. Normally this is read straight back off the avatar by `updateHand`, so
   * the hitbox is exactly what is drawn — but a cast can land on the very first frame of a match,
   * before the avatar has ever been ticked, and a hand at the origin would anchor the player into
   * the top-left corner. On that one frame the target position stands in for it.
   */
  private handPoint(owner: Owner): { x: number; y: number } {
    const s = this.side(owner);
    if (s.handSeeded) return { x: s.handX, y: s.handY };
    const f = this.fighter(owner);
    if (!f) return { x: s.aimX, y: s.aimY };
    const dx = s.aimX - f.x;
    const dy = s.aimY - f.y;
    const d = Phaser.Math.Clamp(Math.hypot(dx, dy) || 1, HAND_MIN, HAND_MAX);
    const a = Math.atan2(dy, dx);
    return { x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d };
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** Is this point close enough to an arena edge to count as a wall? */
  private isWall(x: number, y: number): boolean {
    return x - this.left < WALL_BAND || this.right - x < WALL_BAND
      || y - this.top < WALL_BAND || this.bottom - y < WALL_BAND;
  }

  private refund(f: Fighter, abilityId: string): void {
    f.resetCooldown(abilityId);
  }

  /** One hit from this element. Never self-inflicted, so shields and wards may answer it. */
  private hurt(owner: Owner, victim: Fighter, amount: number, flash: number): void {
    if (!this.alive(victim)) return;
    Fighter.asNonAllyDamage(() => victim.takeDamage(amount));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(flash));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      this.dropAbsorber(owner);
      this.unswell(owner);
      // A split body borrowed its own max HP down to the pool. If the same Fighter is still
      // standing here next match it has to be given back, or the swarm's 150 becomes permanent.
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.preSplitMaxHp > 0 && f && f.maxHp < s.preSplitMaxHp) {
        f.increaseMaxHp(s.preSplitMaxHp - f.maxHp);
      }
    }
    for (const f of this.floored) {
      if (f && f.active) f.minHpFloor = 0;
    }
    this.floored.clear();
    for (const f of this.touchedWalk) {
      if (f && f.active) f.walkSpeedMult = 1;
    }
    this.touchedWalk.clear();
    for (const f of this.allFighters()) {
      if (f) f.oozeSizeMult = 1;
    }
    this.playerAvatar?.setRigScale(1);
    this.npcAvatar?.setRigScale(1);
    this.oobleck.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.balls = [];
    this.bubbles = [];
    this.shards = [];
    this.puddles = [];
    this.zips = [];
    this.encased.clear();
    this.bloat.clear();
    this.slowSoak.clear();
    this.healSoak.clear();
    this.healAcc.clear();
    this.flung.clear();
    this.slowUntil.clear();
    this.stuckUntil.clear();
    this.pointerDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;

    this.api.setStatusIndicator('gum-hand', null);
    this.api.setStatusIndicator('gum-balls', null);
    this.api.setStatusIndicator('gum-ooze', null);
    this.api.setStatusIndicator('gum-encased', null);
    this.api.setStatusIndicator('gum-stuck', null);
    this.api.setStatusIndicator('gum-shard', null);
    this.api.setStatusIndicator('gum-puddles', null);
    this.api.setStatusIndicator('gum-mire', null);
    this.api.setStatusIndicator('gum-bloat', null);
    this.api.setStatusIndicator('gum-split', null);
    this.api.setStatusIndicator('gum-slab', null);
    this.api.setStatusIndicator('gum-oobleck', null);
  }

  /**
   * The zip-lines, hung once. They belong to the arena rather than to a cast, so they are built
   * the first frame somebody who owns the upgrade is in play and never rebuilt after that.
   */
  private ensureZips(): void {
    if (this.zips.length) return;
    const owns = (this.isGum('player') && this.up('player', 'click'))
      || (this.isGum('npc') && this.up('npc', 'click'));
    if (!owns) return;
    const h = this.bottom - this.top;
    for (let i = 0; i < ZIP_COUNT; i++) {
      this.zips.push({ y: this.top + (h * (i + 1)) / (ZIP_COUNT + 1), seed: 4 + i * 3 });
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5. Everything lying on the floor goes under them; everything in the
    // air goes over, so a thrown ball is never hidden behind the person it is aimed at.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isGum('player') && !this.playerAvatar) this.playerAvatar = new GumAvatar(scene, this.pcol);
    if (this.isGum('npc') && !this.npcAvatar) this.npcAvatar = new GumAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'gum') return;
    this.ensureLayers();
    this.ensureAvatars();

    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    // The drag reads mouse *travel*, not mouse position — the anchor is a world point and the
    // cursor is a handle being hauled on, so only how far it moved this frame matters.
    if (s.haveMouse) {
      this.mouseDX = mouseX - s.prevMouseX;
      this.mouseDY = mouseY - s.prevMouseY;
    }
    s.prevMouseX = mouseX;
    s.prevMouseY = mouseY;
    s.haveMouse = true;

    const p = this.api.player;
    const justDown = pointer.isDown && !this.pointerDown;
    const justUp = !pointer.isDown && this.pointerDown;
    this.pointerDown = pointer.isDown;

    if (!this.alive(p)) return;

    // No hand: nothing to grip with, nothing to grab with, nowhere to go.
    if (this.now < s.handBackAt) {
      this.letGo('player', false);
    } else {
      if (justDown) this.pressHand('player');
      if (justUp) this.letGo('player', true);
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Mastery: whichever of E/R/F the slab was dropped on stops being its own ability, so that
    // key is checked first and the base cast underneath it is skipped entirely.
    const bound = this.oobleckSlot('player');
    if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) {
      this.tryOobleck('player', mouseX, mouseY);
    }
    if (bound !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('gum-surge', ctx);
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('gum-gumball', ctx);
    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('gum-oozorbtion', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('gum-solidify', ctx);
  }

  /**
   * The click, resolved against whatever the hand happens to be over. The order matters: things
   * that can be *carried* outrank things that can be *hit*, because a player reaching for a
   * slimeball at the enemy's feet meant the slimeball.
   */
  private pressHand(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.held || s.anchored || s.riding) return;
    const { x: hx, y: hy } = this.handPoint(owner);

    // 1 — a body we have gummed.
    for (const [victim, enc] of this.encased) {
      if (enc.owner !== owner || !this.alive(victim)) continue;
      if (Phaser.Math.Distance.Between(hx, hy, victim.x, victim.y) > GRAB_R + 14) continue;
      s.held = { kind: 'body', ball: null, victim, puddle: null, slab: null };
      this.flung.delete(victim);
      this.avatar(owner)?.setCarry(true);
      this.api.showFloatingText(victim.x, victim.y - 40, '🫳 GRABBED', this.hex(GUM.gumLit));
      Sfx.playAt('stretch', victim.x, { rate: 0.75, volume: 0.9 });
      return;
    }

    // 2 — one of our own slimeballs lying on the floor.
    let best: Ball | null = null;
    let bestD = GRAB_R + BALL_R;
    for (const b of this.balls) {
      if (b.owner !== owner || b.flying) continue;
      const d = Phaser.Math.Distance.Between(hx, hy, b.x, b.y);
      if (d <= bestD) { best = b; bestD = d; }
    }
    if (best) {
      s.held = { kind: 'ball', ball: best, victim: null, puddle: null, slab: null };
      this.avatar(owner)?.setCarry(true);
      Sfx.playAt('slime-splat', best.x, { rate: 1.3, volume: 0.5 });
      return;
    }

    // 2½ — the Oobleck slab we set down earlier. It is a shield: picking it back up to carry it
    // somewhere better is the whole reason it is dropped rather than thrown.
    if (s.slab && !s.slab.hard && this.inSlab(s.slab, hx, hy, 16)) {
      s.held = { kind: 'oobleck', ball: null, victim: null, puddle: null, slab: s.slab };
      this.avatar(owner)?.setCarry(true);
      this.api.showFloatingText(s.slab.x, s.slab.y - 30, '🛡 OOBLECK', this.hex(GUM.oozeLit));
      Sfx.playAt('stretch', s.slab.x, { rate: 0.85, volume: 0.7 });
      return;
    }

    // 3 — one of our own puddles, or the beacon it hardened into. Both come up off the floor.
    let bestPud: Puddle | null = null;
    let bestPudD = PUDDLE_GRAB_R;
    for (const pd of this.puddles) {
      if (pd.owner !== owner || pd.flying) continue;
      const d = Phaser.Math.Distance.Between(hx, hy, pd.x, pd.y);
      if (d <= bestPudD) { bestPud = pd; bestPudD = d; }
    }
    if (bestPud) {
      s.held = { kind: 'puddle', ball: null, victim: null, puddle: bestPud, slab: null };
      // Picking a lit beacon back up puts it out. Winding it again is the price of moving it.
      bestPud.activeUntil = 0;
      bestPud.shake = 0;
      this.avatar(owner)?.setCarry(true);
      this.api.showFloatingText(bestPud.x, bestPud.y - 26,
        bestPud.beacon ? '🫳 BEACON' : '🫳 SCOOPED', this.hex(bestPud.kind === 'heal' ? GUM.gumLit : GUM.oozeLit));
      Sfx.playAt('slime-splat', bestPud.x, { rate: 0.7, volume: 0.6 });
      return;
    }

    // 4 — an enemy shot passing through the hand. Caught, and now ours to throw.
    const caught = this.catchShot(owner, hx, hy, GRAB_R);
    if (caught !== null) {
      const ball: Ball = {
        owner, x: hx, y: hy, vx: 0, vy: 0, flying: false, hard: false, stolen: true, bomb: false,
        damage: caught, seed: Math.random() * 999, landsAt: 0, hit: new Set(),
      };
      this.balls.push(ball);
      s.held = { kind: 'ball', ball, victim: null, puddle: null, slab: null };
      this.avatar(owner)?.setCarry(true);
      this.fx(owner).pop(hx, hy, 16);
      this.api.showFloatingText(hx, hy - 26, `🫳 CAUGHT ${caught}`, this.hex(GUM.oozeLit));
      Sfx.playAt('boing', hx, { rate: 1.2, volume: 0.8 });
      return;
    }

    // 5 — somebody standing in the hand. This is the only part of the click that costs anything.
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(hx, hy, t.x, t.y) > PUNCH_R) continue;
      if (owner === 'player') {
        this.api.player.castAbility('gum-grab', this.api.buildPlayerContext(t.x, t.y));
      } else {
        this.doGrab('npc', t.x, t.y);
      }
      return;
    }

    // 6 — a zip-line. The one thing in the arena that moves you without a drag: catch it and it
    // hauls you flat across the room on its own until a wall stops you.
    if (this.up(owner, 'click') && owner === 'player') {
      let line: Zip | null = null;
      let lineD = ZIP_BAND;
      for (const z of this.zips) {
        const d = Math.abs(hy - z.y);
        if (d <= lineD) { line = z; lineD = d; }
      }
      if (line) {
        const dir = Math.sign(hx - f.x) || Math.sign(s.aimX - f.x) || 1;
        s.riding = { y: line.y, dir };
        s.nextSparkAt = 0;
        this.avatar(owner)?.setGrip(true);
        this.fx(owner).splat(hx, line.y, 14, 8);
        this.api.showFloatingText(f.x, f.y - 50, '🪢 ZIP-LINE', this.hex(GUM.oozeLit));
        Sfx.playAt('whoosh', f.x, { rate: 1.4, volume: 0.8 });
        return;
      }
    }

    // 7 — the floor, or a wall. This is how the element walks.
    s.anchored = true;
    s.anchorX = Phaser.Math.Clamp(hx, this.left, this.right);
    s.anchorY = Phaser.Math.Clamp(hy, this.top, this.bottom);
    s.anchorWall = this.isWall(s.anchorX, s.anchorY);
    this.avatar(owner)?.setGrip(true);
    this.fx(owner).splat(s.anchorX, s.anchorY, 16, 4, s.anchorWall);
    Sfx.playAt(s.anchorWall ? 'stretch' : 'slime-splat', s.anchorX, { rate: 1.1, volume: 0.45 });
  }

  /** Let go of whatever the hand has. `throwIt` is false when the hand was taken from us. */
  /**
   * Ruin Mastery — Second Skin. A grip on a zip-line is a third locomotion mode: the ride owns
   * the body outright and the mouse is not read at all while it holds, which is what makes it a
   * form rather than a dash. Ended the way the kit ends it, so the velocity is zeroed and the
   * rig lets go of the line.
   *
   * Only the ride: anything the hand is *carrying* is not a body the fighter is in.
   */
  revertForms(f: Fighter): string[] {
    const owner: Owner | null = f === this.api.player ? 'player'
      : f === this.api.npc ? 'npc' : null;
    if (!owner) return [];
    const s = this.side(owner);
    if (!s.riding) return [];
    s.riding = null;
    this.avatar(owner)?.setGrip(false);
    if (this.alive(f)) (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    return ['Zip-Line'];
  }

  private letGo(owner: Owner, throwIt: boolean): void {
    const s = this.side(owner);
    const av = this.avatar(owner);
    if (s.anchored) {
      s.anchored = false;
      av?.setGrip(false);
    }
    if (s.riding) {
      s.riding = null;
      av?.setGrip(false);
      const f = this.fighter(owner);
      if (this.alive(f)) (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    if (!s.held) { av?.setCarry(false); return; }
    const held = s.held;
    s.held = null;
    av?.setCarry(false);
    // A beacon is never thrown, however it came out of the hand — it is set down, and whatever
    // shaking it collected on the way is what it runs on.
    if (held.kind === 'puddle' && held.puddle?.beacon) { this.setDownBeacon(owner, held.puddle); return; }
    // Nor is a slab. It is cover, and cover is put down where you were standing — so a drop and
    // a throw both route here, above the `throwIt` branch, exactly as a beacon does.
    if (held.kind === 'oobleck' && held.slab) { this.setDownSlab(owner, held.slab); return; }
    if (!throwIt) {
      // Dropped rather than thrown — a ball falls where it is, a body simply stops being carried.
      if (held.kind === 'ball' && held.ball) { held.ball.flying = false; held.ball.vx = 0; held.ball.vy = 0; }
      if (held.kind === 'puddle' && held.puddle) { held.puddle.flying = false; held.puddle.vx = 0; held.puddle.vy = 0; }
      return;
    }
    this.throwHeld(owner, held);
  }

  /** A beacon leaves the hand where it is, and wakes up for as long as it was shaken. */
  private setDownBeacon(owner: Owner, pd: Puddle): void {
    const s = this.side(owner);
    pd.x = Phaser.Math.Clamp(s.handX, this.left, this.right);
    pd.y = Phaser.Math.Clamp(s.handY, this.top, this.bottom);
    pd.flying = false;
    pd.vx = 0;
    pd.vy = 0;
    if (pd.shake < BEACON_MIN_SHAKE_MS) {
      pd.shake = 0;
      this.api.showFloatingText(pd.x, pd.y - 26, '💤 UNSHAKEN', this.hex(GUM.stoneLit));
      return;
    }
    const ms = Math.min(BEACON_MAX_ACTIVE_MS, pd.shake);
    pd.activeUntil = this.now + ms;
    pd.until = Math.max(pd.until, pd.activeUntil + 1000);
    pd.shake = 0;
    const heal = pd.kind === 'heal';
    this.fx(owner).harden(pd.x, pd.y, 26);
    this.api.showFloatingText(pd.x, pd.y - 30,
      `${heal ? '💗' : '🐌'} BEACON · ${(ms / 1000).toFixed(1)}s`,
      this.hex(heal ? GUM.gumLit : GUM.oozeLit));
    Sfx.playAt('boing', pd.x, { rate: heal ? 1.3 : 0.7, volume: 0.85 });
  }

  /** Release. The hand's own velocity is the throw, which is why a flick beats a nudge. */
  private throwHeld(owner: Owner, held: Held): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    let vx = s.handVx * THROW_GAIN;
    let vy = s.handVy * THROW_GAIN;
    let sp = Math.hypot(vx, vy);
    if (sp < THROW_MIN_SPEED) {
      // A hand that was barely moving still has to throw *somewhere*: down the aim.
      const a = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      vx = Math.cos(a) * THROW_MIN_SPEED;
      vy = Math.sin(a) * THROW_MIN_SPEED;
      sp = THROW_MIN_SPEED;
    }
    if (sp > THROW_MAX_SPEED) {
      vx = (vx / sp) * THROW_MAX_SPEED;
      vy = (vy / sp) * THROW_MAX_SPEED;
    }

    if (held.kind === 'puddle' && held.puddle) {
      // A puddle is a heavy sack of slime. It is clamped far below a slimeball's throw, which is
      // what keeps Slime Splash a way of moving your own ground rather than a second projectile.
      const pd = held.puddle;
      const psp = Math.hypot(vx, vy);
      const k = Math.min(1, PUDDLE_THROW_MAX / Math.max(1, psp));
      pd.x = s.handX;
      pd.y = s.handY;
      pd.vx = vx * k;
      pd.vy = vy * k;
      pd.flying = true;
      pd.landsAt = this.now + PUDDLE_FLIGHT_MS;
      this.fx(owner).splat(pd.x, pd.y, 16, 4, pd.kind === 'heal');
      Sfx.playAt('slime-splat', pd.x, { rate: 0.7, volume: 0.7 });
      return;
    }

    if (held.kind === 'ball' && held.ball) {
      const b = held.ball;
      b.x = s.handX;
      b.y = s.handY;
      b.vx = vx;
      b.vy = vy;
      b.flying = true;
      b.hit.clear();
      b.landsAt = this.now + BALL_FLIGHT_MS;
      this.fx(owner).splat(b.x, b.y, 12, 6);
      Sfx.playAt('slime-splat', b.x, { rate: 0.95, volume: 0.7 });
      return;
    }

    const victim = held.victim;
    if (!victim || !this.alive(victim)) return;
    const enc = this.encased.get(victim);
    (victim.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
    this.flung.set(victim, { owner, hard: enc?.hard ?? false, until: this.now + FLUNG_MS, vx, vy });
    this.record(owner, 'bodyThrows');
    this.api.showFloatingText(victim.x, victim.y - 44, '🤾 THROWN', this.hex(GUM.gumLit));
    Sfx.playAt('whoosh', victim.x, { rate: 0.7, volume: 1 });
  }

  /**
   * Pull one enemy shot out of the air, from either of the two places the game keeps them.
   * Returns the damage it would have done, or null if there was nothing there.
   */
  private catchShot(owner: Owner, x: number, y: number, radius: number): number | null {
    const fromPlayer = owner === 'npc';
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer !== fromPlayer || p.isHeal) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, x, y) > radius) continue;
      const dmg = Math.max(1, Math.round(p.damage));
      p.destroy();
      return dmg;
    }
    const theirs: Owner = owner === 'player' ? 'npc' : 'player';
    const reg = this.api.projectileRegistry.nearest(theirs, x, y, radius);
    if (!reg) return null;
    const dmg = Math.max(1, Math.round(reg.damage));
    this.api.projectileRegistry.steal(reg);
    return dmg;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — the punch.
   *
   * Grabbing, gripping and smacking are all free: they are the passive using the same hand, and
   * charging a cooldown for walking would be absurd. This is the one branch of the click that
   * costs anything, so it is the only one routed through the ability.
   */
  doGrab(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'gum-grab'); return; }
    const s = this.side(owner);
    if (this.now < s.handBackAt) {
      this.refund(f, 'gum-grab');
      this.api.showFloatingText(f.x, f.y - 48, '🫠 NO HAND', this.hex(GUM.solidLit));
      return;
    }
    this.ensureLayers();
    this.ensureAvatars();

    const a = Math.atan2(ty - f.y, tx - f.x);
    const { x: hx, y: hy } = this.handPoint(owner);
    const stone = this.hasShardHand(owner);
    let landed = false;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(hx, hy, t.x, t.y) > PUNCH_R
        && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > PUNCH_R + HAND_MIN) continue;
      this.hurt(owner, t, PUNCH_DAMAGE + (stone ? SHARD_PUNCH_BONUS : 0),
        stone ? GUM.stoneLit : GUM.oozeLit);
      if (stone) {
        if (t.hp <= 0) this.record(owner, 'clawKills');
        this.solidifyTouch(owner, t);
        this.fx(owner).shardBurst(t.x, t.y, 5);
      } else {
        this.fx(owner).splat(t.x, t.y, 22);
      }
      landed = true;
    }

    // The bot has no cursor, so it can never pick a ball up and flick it. Out of punching range
    // its click becomes the throw instead — the same decision, made for it.
    if (!landed && owner === 'npc') {
      const ball = this.botReachBall('npc');
      if (ball) {
        ball.x = f.x + Math.cos(a) * 26;
        ball.y = f.y + Math.sin(a) * 26;
        ball.vx = Math.cos(a) * 620;
        ball.vy = Math.sin(a) * 620;
        ball.flying = true;
        ball.hit.clear();
        ball.landsAt = this.now + BALL_FLIGHT_MS;
        this.avatar('npc')?.play('punch', a);
        this.fx('npc').splat(ball.x, ball.y, 12, 6);
        Sfx.playAt('slime-splat', ball.x, { rate: 0.95, volume: 0.6 });
        return;
      }
    }

    this.avatar(owner)?.play('punch', a);
    if (landed) {
      Sfx.playAt('hit-medium', f.x, { rate: 0.85, volume: 0.9 });
    } else {
      // A miss still costs the cooldown; the hand went somewhere.
      Sfx.playAt('whoosh', f.x, { rate: 1.25, volume: 0.45 });
    }
  }

  /** E — three slimeballs on the floor. Ammunition, not an attack. */
  doSurge(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'gum-surge'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    // Never evict the one currently in the hand — deleting it from the list would leave the hand
    // holding an object nothing simulates any more.
    const held = this.side(owner).held?.ball ?? null;
    const mine = this.balls.filter((b) => b.owner === owner && b !== held);
    if (this.balls.filter((b) => b.owner === owner).length >= BALL_MAX) {
      // Oldest first, so a spammer refreshes their pile rather than being refused outright.
      for (let i = 0; i < Math.min(SURGE_COUNT, mine.length); i++) {
        const idx = this.balls.indexOf(mine[i]);
        if (idx >= 0) this.balls.splice(idx, 1);
      }
    }

    const bomb = this.up(owner, 'e');
    const base = Math.atan2(ty - f.y, tx - f.x);
    for (let i = 0; i < SURGE_COUNT; i++) {
      const a = base + (i - 1) * 0.42;
      const d = 58 + Math.random() * 42;
      const x = Phaser.Math.Clamp(f.x + Math.cos(a) * d, this.left, this.right);
      const y = Phaser.Math.Clamp(f.y + Math.sin(a) * d, this.top, this.bottom);
      this.balls.push({
        owner, x, y, vx: 0, vy: 0, flying: false, hard: false, stolen: false, bomb,
        damage: BALL_DAMAGE, seed: Math.random() * 999, landsAt: 0, hit: new Set(),
      });
      this.fx(owner).splat(x, y, 18, 4);
    }
    this.avatar(owner)?.play('sweep', base);
    this.api.showFloatingText(f.x, f.y - 48, bomb ? '💣 SLIME SPLASH' : '🟢 SLIME SURGE',
      this.hex(GUM.oozeLit));
    Sfx.playAt('slime-splat', f.x, { rate: 0.8, volume: 0.95 });
  }

  /** R — the gum barrage. Turns a person into something the hand can pick up. */
  doGumball(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'gum-gumball'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    const base = Math.atan2(ty - f.y, tx - f.x);
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const a = base + (i / (BUBBLE_COUNT - 1) - 0.5) * BUBBLE_SPREAD * 2
        + (Math.random() - 0.5) * 0.08;
      const sp = BUBBLE_SPEED * (0.85 + Math.random() * 0.3);
      this.bubbles.push({
        owner,
        x: f.x + Math.cos(a) * 22,
        y: f.y + Math.sin(a) * 22,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        diesAt: this.now + BUBBLE_LIFE_MS,
        seed: Math.random() * 999,
        hard: false,
      });
    }
    this.avatar(owner)?.play('sweep', base);
    this.api.showFloatingText(f.x, f.y - 48, '🩷 GUMBALL', this.hex(GUM.gum));
    Sfx.playAt('bubble', f.x, { rate: 0.9, volume: 1 });
  }

  /** F — swell up and open. The body's one trick without the hand. */
  doOozorbtion(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'gum-oozorbtion'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.absorbUntil = this.now + ABSORB_ARM_MS;
    this.swell(owner);
    this.installAbsorber(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).swallow(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 52, '🫧 OOZORBTION', this.hex(GUM.oozeLit));
    Sfx.playAt('stretch', f.x, { rate: 0.7, volume: 0.95 });
  }

  /** Q — throw the hand away, and set everything sticky on the field. */
  doSolidify(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'gum-solidify'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);

    const hx = s.handSeeded ? s.handX : f.x;
    const hy = s.handSeeded ? s.handY : f.y;
    const stone = this.up(owner, 'q');

    // Whatever the hand was doing stops either way. Dropped, not thrown — with the upgrade the
    // hand is setting rock hard, and without it there is about to be no hand at all.
    this.letGo(owner, false);
    if (stone) {
      // Q+: the hand does not shatter, so there is no three seconds of standing still. It sets
      // into a claw of stone instead, and everything it brushes past goes glassy with it.
      s.shardUntil = this.now + SHARD_HAND_MS;
      this.avatar(owner)?.setShardHand(true);
      this.fx(owner).harden(hx, hy, 30);
      this.fx(owner).sparks(hx, hy, 34);
    } else {
      s.handBackAt = this.now + HAND_REGROW_MS;
      this.avatar(owner)?.setHandless(true);
      for (let i = 0; i < SOLIDIFY_SHARDS; i++) {
        const a = (i / SOLIDIFY_SHARDS) * TAU + Math.random() * 0.2;
        const sp = SHARD_SPEED * (0.8 + Math.random() * 0.45);
        this.shards.push({
          owner, x: hx, y: hy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          diesAt: this.now + SHARD_LIFE_MS, seed: Math.random() * 999,
          damage: SHARD_DAMAGE, spark: false, hit: new Set(),
        });
      }
      this.fx(owner).harden(hx, hy, 36);
    }

    let hardened = 0;
    for (const b of this.balls) {
      if (b.owner !== owner || b.hard || b.stolen) continue;
      b.hard = true;
      b.damage = BALL_HARD_DAMAGE;
      hardened++;
      this.fx(owner).harden(b.x, b.y, 20);
    }
    for (const [victim, enc] of this.encased) {
      if (enc.owner !== owner || enc.hard) continue;
      enc.hard = true;
      enc.until += HARD_ENCASE_BONUS_MS;
      this.fx(owner).harden(victim.x, victim.y, 34);
    }
    // Puddles do not simply harden — they set into beacons, which is a different object with a
    // different job. This happens with or without the upgrade; it is what Solidify does to slime
    // that is lying on the ground.
    let beacons = 0;
    for (const pd of this.puddles) {
      if (pd.owner !== owner || pd.beacon) continue;
      this.makeBeacon(owner, pd);
      beacons++;
    }
    // Mastery: the slab sets too, and a set slab is a different object — it stops being cover
    // that shots stick in and becomes a wall neither of you can walk through or shoot past.
    let walled = false;
    if (s.slab && !s.slab.hard) {
      this.hardenSlab(owner, s.slab);
      walled = true;
    }

    this.avatar(owner)?.play('raise');
    this.api.scene.cameras.main.shake(320, 0.008);
    const tally = [
      hardened > 0 ? `${hardened} HARDENED` : '',
      beacons > 0 ? `${beacons} BEACONS` : '',
      walled ? 'WALL' : '',
    ].filter(Boolean).join(' · ');
    this.api.showFloatingText(f.x, f.y - 58,
      tally ? `🧊 SOLIDIFY · ${tally}` : '🧊 SOLIDIFY', this.hex(GUM.solidLit));
    Sfx.playAt('ice-shatter', f.x, { rate: 1.1, volume: 1 });
    Sfx.playAt('crystal-shatter', f.x, { rate: 0.85, volume: 0.8 });
  }

  // ── Mastery: shared ────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are the Slime. */
  private masteryOn(owner: Owner): boolean {
    return this.isGum(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /**
   * Which slot Oobleck was dropped on, or null. Q is not scanned — `excludeSlots` refuses it,
   * because Solidify is what turns the slab into a wall and binding over it would delete the
   * upgrade path written into the ability's own description.
   */
  private oobleckSlot(owner: Owner): 'e' | 'r' | 'f' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['e', 'r', 'f'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'oobleck') return s;
    }
    return null;
  }

  /** The player's key for a bound slot. */
  private keyFor(slot: 'e' | 'r' | 'f'): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.api.eKey : slot === 'r' ? this.api.rKey : this.api.fKey;
  }

  /**
   * Mastery progress. Only ever recorded for the player — the grind is the human's, not the
   * bot's — and deliberately not gated on the mastery being *on*, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player') this.api.recordMasteryStat(key, amount);
  }

  // ── Oobleck ────────────────────────────────────────────────────────────────

  /** Slab-local coordinates: distance along the long axis, and across the short one. */
  private slabLocal(sl: Slab, x: number, y: number): { along: number; across: number } {
    const dx = x - sl.x;
    const dy = y - sl.y;
    const c = Math.cos(sl.ang);
    const s = Math.sin(sl.ang);
    return { along: dx * c + dy * s, across: -dx * s + dy * c };
  }

  private inSlab(sl: Slab, x: number, y: number, pad = 0): boolean {
    const { along, across } = this.slabLocal(sl, x, y);
    return Math.abs(along) <= SLAB_LEN / 2 + pad && Math.abs(across) <= SLAB_THICK / 2 + pad;
  }

  /**
   * Oobleck, from the bound key or from the bot's own decision.
   *
   * Nothing here goes through `castAbility` — the enhancement is not in the element's ability
   * list — so the refusals that gate every other key in the game have to be repeated by hand, or
   * a disarm would stop mattering the moment the mastery was bound. The hand refusals are this
   * element's own on top of that: a slab is summoned *into* the hand, so a hand that is full,
   * gone, or holding a zip-line has nowhere to put it.
   */
  private tryOobleck(owner: Owner, tx: number, ty: number): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    const s = this.side(owner);
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil) return false;

    if (this.now < s.handBackAt) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 48, '🫠 NO HAND', this.hex(GUM.solidLit));
      }
      return false;
    }
    if (s.slab) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 50, '🛡 ONE SLAB AT A TIME', this.hex(GUM.oozeDeep));
      }
      return false;
    }
    if (s.held || s.riding) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 50, '✊ HAND FULL', this.hex(GUM.oozeDeep));
      }
      return false;
    }
    if (this.now - s.oobleckCastAt < OOBLECK_COOLDOWN_MS) return false;

    s.oobleckCastAt = this.now;
    // The player's slab is summoned into the hand — it is a shield first and a wall second, so it
    // starts where a shield starts. A bot has no cursor to carry one with, so its slab is planted.
    this.spawnSlab(owner, tx, ty, owner === 'player');
    return true;
  }

  /**
   * The slab coming into being. Separate from the refusals above so the bot, and anything else
   * that plants one without pressing a key, lands the same object.
   */
  private spawnSlab(owner: Owner, tx: number, ty: number, held: boolean): void {
    const f = this.fighter(owner);
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    const hand = this.handPoint(owner);
    const x = held ? hand.x : Phaser.Math.Clamp(tx, this.left, this.right);
    const y = held ? hand.y : Phaser.Math.Clamp(ty, this.top, this.bottom);
    // The long side faces the summoner: the pane is turned across the line from the body to it,
    // which is what makes it read as a shield being held rather than a plank lying about.
    const ang = Math.atan2(y - f.y, x - f.x) + Math.PI / 2;

    const slab: Slab = {
      owner, x, y, ang,
      until: this.now + OOBLECK_MS,
      hard: false, seed: Math.random() * 999,
      stuck: [], inside: new Set(),
    };
    s.slab = slab;
    if (held) {
      s.held = { kind: 'oobleck', ball: null, victim: null, puddle: null, slab };
      this.avatar(owner)?.setCarry(true);
    }
    this.avatar(owner)?.play('raise', ang - Math.PI / 2);
    this.fx(owner).slabSet(x, y, ang, SLAB_LEN);
    this.api.showFloatingText(f.x, f.y - 56, '🛡 OOBLECK', this.hex(GUM.oozeLit));
    Sfx.playAt('slime-splat', x, { rate: 0.55, volume: 1 });
    Sfx.playAt('stretch', x, { rate: 0.8, volume: 0.7 });
  }

  /**
   * The slab setting. A hard slab is put down first if it was being carried — a wall you are
   * holding out at arm's length would follow you around the room, which is not a wall.
   */
  private hardenSlab(owner: Owner, sl: Slab): void {
    const s = this.side(owner);
    if (s.held?.kind === 'oobleck' && s.held.slab === sl) {
      s.held = null;
      this.avatar(owner)?.setCarry(false);
      sl.x = Phaser.Math.Clamp(s.handX, this.left, this.right);
      sl.y = Phaser.Math.Clamp(s.handY, this.top, this.bottom);
    }
    sl.hard = true;
    sl.inside.clear();
    sl.until = this.now + OOBLECK_MS;
    this.fx(owner).harden(sl.x, sl.y, 40);
    this.fx(owner).slabSet(sl.x, sl.y, sl.ang, SLAB_LEN, true);
    this.api.showFloatingText(sl.x, sl.y - 34, '🧱 WALL', this.hex(GUM.solidLit));
    Sfx.playAt('crystal-shatter', sl.x, { rate: 0.7, volume: 0.9 });
  }

  /** Letting go of a slab. It is set down where the hand was, never thrown. */
  private setDownSlab(owner: Owner, sl: Slab): void {
    const s = this.side(owner);
    sl.x = Phaser.Math.Clamp(s.handX, this.left, this.right);
    sl.y = Phaser.Math.Clamp(s.handY, this.top, this.bottom);
    sl.until = this.now + OOBLECK_MS;
    this.fx(owner).slabSet(sl.x, sl.y, sl.ang, SLAB_LEN, sl.hard);
    this.api.showFloatingText(sl.x, sl.y - 30, '🧱 SET DOWN', this.hex(GUM.oozeDeep));
    Sfx.playAt('slime-splat', sl.x, { rate: 0.6, volume: 0.8 });
  }

  /** The sixth shot. Five is what it holds, and the one after that is what breaks it. */
  private burstSlab(owner: Owner, sl: Slab): void {
    const c = Math.cos(sl.ang);
    const s = Math.sin(sl.ang);
    for (const k of [-1, 1]) {
      this.spawnPuddle(owner, 'slow', sl.x + c * SLAB_LEN * 0.3 * k, sl.y + s * SLAB_LEN * 0.3 * k);
    }
    this.dropSlab(owner);
    this.fx(owner).splat(sl.x, sl.y, 44, 6);
    this.api.scene.cameras.main.shake(180, 0.005);
    this.api.showFloatingText(sl.x, sl.y - 34, '💥 OVERFULL', this.hex(GUM.oozeLit));
    Sfx.playAt('explosion-medium', sl.x, { rate: 1.35, volume: 0.75 });
  }

  private dropSlab(owner: Owner): void {
    const s = this.side(owner);
    const sl = s.slab;
    if (!sl) return;
    s.slab = null;
    if (s.held?.kind === 'oobleck' && s.held.slab === sl) {
      s.held = null;
      this.avatar(owner)?.setCarry(false);
    }
    sl.inside.clear();
  }

  /**
   * Everything the slab does, every frame: ride the hand, catch what is fired at it, dissolve
   * what it caught, mire whoever walks through it, and — once it is hard — refuse to let anybody
   * past at all.
   */
  private updateSlabs(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const sl = s.slab;
      if (!sl) continue;
      const carried = s.held?.kind === 'oobleck' && s.held.slab === sl;
      const f = this.fighter(owner);

      if (carried) {
        // Held: the pane hangs off the hand, broadside-on to the body behind it. A carried slab
        // does not age — the clock is on cover you have left somewhere, not cover you are using.
        sl.x = s.handX;
        sl.y = s.handY;
        if (this.alive(f)) sl.ang = Math.atan2(sl.y - f.y, sl.x - f.x) + Math.PI / 2;
        sl.until = this.now + OOBLECK_MS;
      } else if (this.now >= sl.until) {
        this.fx(owner).pop(sl.x, sl.y, 30);
        this.api.showFloatingText(sl.x, sl.y - 28, '🫠 DISSOLVED', this.hex(GUM.oozeDeep));
        this.dropSlab(owner);
        continue;
      }

      // What it caught, breaking down. Each slot comes free on its own five seconds.
      for (let i = sl.stuck.length - 1; i >= 0; i--) {
        if (this.now >= sl.stuck[i].until) sl.stuck.splice(i, 1);
      }

      this.catchIntoSlab(owner, sl);
      if (!s.slab) continue;
      this.sweepSlab(owner, sl);
    }
  }

  /**
   * The catch. A soft slab takes enemy fire only — it is your shield. A hard one is a wall, so it
   * eats everything that reaches it, including your own, which is the price of setting it.
   */
  private catchIntoSlab(owner: Owner, sl: Slab): void {
    const reach = SLAB_LEN / 2 + 12;
    const sides: Owner[] = sl.hard ? BOTH : [owner === 'player' ? 'npc' : 'player'];
    for (const from of sides) {
      const fromPlayer = from === 'player';
      // Snapshot: `destroy` splices the group's own array, and skipping every other shot in a
      // pane whose whole job is to catch them would be a hard bug to see.
      for (const obj of [...this.api.projectiles.getChildren()]) {
        const p = obj as Projectile;
        if (!p.active || p.isFromPlayer !== fromPlayer || p.isHeal) continue;
        if (!this.inSlab(sl, p.x, p.y, 12)) continue;
        const local = this.slabLocal(sl, p.x, p.y);
        p.destroy();
        if (!this.stickShot(owner, sl, local.along, local.across)) return;
      }
      const reg = this.api.projectileRegistry.within(from, sl.x, sl.y, reach);
      for (const r of reg) {
        const rx = r.getX();
        const ry = r.getY();
        if (!this.inSlab(sl, rx, ry, 12)) continue;
        const local = this.slabLocal(sl, rx, ry);
        this.api.projectileRegistry.steal(r);
        if (!this.stickShot(owner, sl, local.along, local.across)) return;
      }
    }
  }

  /** Bury one shot in the pane. Returns false if that was the one that broke it. */
  private stickShot(owner: Owner, sl: Slab, along: number, across: number): boolean {
    const c = Math.cos(sl.ang);
    const s = Math.sin(sl.ang);
    this.fx(owner).stick(sl.x + c * along - s * across, sl.y + s * along + c * across);
    Sfx.playAt('slime-splat', sl.x, { rate: 1.5, volume: 0.4 });
    // A hard slab has no limit at all: it is not holding them, it is stopping them.
    if (!sl.hard && sl.stuck.length >= SLAB_CATCH) {
      this.burstSlab(owner, sl);
      return false;
    }
    sl.stuck.push({
      along: Phaser.Math.Clamp(along, -SLAB_LEN / 2 + 8, SLAB_LEN / 2 - 8),
      across: Phaser.Math.Clamp(across, -SLAB_THICK / 2 + 4, SLAB_THICK / 2 - 4),
      seed: Math.random() * 999,
      until: this.now + SLAB_DISSOLVE_MS,
    });
    return true;
  }

  /**
   * Bodies against the pane. Soft, it is a doorway that costs something to walk through; hard, it
   * is a wall, and a wall stops the slime that made it as surely as anybody else — pushed out by
   * writing the position directly, because this runs after both movement paths have had their say.
   */
  private sweepSlab(owner: Owner, sl: Slab): void {
    const foes = this.targetsOf(owner);
    const seen = new Set<Fighter>();
    for (const f of this.allFighters()) {
      if (!this.alive(f)) continue;

      if (sl.hard) {
        const { along, across } = this.slabLocal(sl, f.x, f.y);
        const limit = SLAB_THICK / 2 + SLAB_BODY_R;
        if (Math.abs(along) <= SLAB_LEN / 2 + SLAB_BODY_R * 0.5 && Math.abs(across) < limit) {
          const dir = across >= 0 ? 1 : -1;
          const push = limit * dir - across;
          f.x += -Math.sin(sl.ang) * push;
          f.y += Math.cos(sl.ang) * push;
          const body = f.body as Phaser.Physics.Arcade.Body | null;
          if (body) {
            // Kill only the component going *into* the wall, so sliding along it still works.
            const nx = -Math.sin(sl.ang) * dir;
            const ny = Math.cos(sl.ang) * dir;
            const into = body.velocity.x * -nx + body.velocity.y * -ny;
            if (into > 0) body.setVelocity(body.velocity.x + nx * into, body.velocity.y + ny * into);
          }
        }
        continue;
      }

      if (!foes.includes(f)) continue;
      if (!this.inSlab(sl, f.x, f.y, SLAB_BODY_R * 0.5)) continue;
      seen.add(f);
      if (sl.inside.has(f)) continue;
      this.applyOobleck(owner, f);
    }
    if (!sl.hard) sl.inside = seen;
  }

  /** The debt: twelve seconds that get worse the whole way down. */
  private applyOobleck(owner: Owner, victim: Fighter): void {
    this.oobleck.set(victim, { owner, from: this.now, until: this.now + OOBLECK_EFFECT_MS });
    this.fx(owner).splat(victim.x, victim.y, 22, 5);
    this.api.showFloatingText(victim.x, victim.y - 42, '🫧 OOBLECK', this.hex(GUM.oozeLit));
    Sfx.playAt('slime-splat', victim.x, { rate: 0.65, volume: 0.8 });
  }

  /** 0–1 of Oobleck's ramp on this body: how much of the slow has arrived. */
  private oobleckRamp(f: Fighter): number {
    const o = this.oobleck.get(f);
    if (!o || this.now >= o.until) return 0;
    const run = Phaser.Math.Clamp((this.now - o.from) / OOBLECK_EFFECT_MS, 0, 1);
    return OOBLECK_SLOW_BITE + (1 - OOBLECK_SLOW_BITE) * run;
  }

  // ── Slime Split ────────────────────────────────────────────────────────────

  /**
   * The pool a split body is fighting on, and what each slimeling is worth out of it.
   *
   * Derived rather than tracked: `ling(i)` holds whatever is left of the pool above `i × 50`, so
   * the hindmost is always the one being peeled and the lead is always the last to go. Nothing
   * has to be reconciled against `Fighter.hp`, which means a heal, a Justice floor or anything
   * else that writes health from outside is picked up for free on the next frame.
   */
  private lingHp(owner: Owner, index: number): number {
    const f = this.fighter(owner);
    if (!f) return 0;
    return Phaser.Math.Clamp(f.hp - index * SPLIT_HP, 0, SPLIT_HP);
  }

  private lingsAlive(owner: Owner): Ling[] {
    return this.side(owner).lings.filter((l) => this.lingHp(owner, l.index) > 0);
  }

  /**
   * The passive itself.
   *
   * The death floor is written from scratch every frame while the split is still owed, so a
   * mastery switched off between matches — or a Slime that is not this element any more — can
   * never leave somebody standing at 1 HP forever. Once it is spent the floor comes straight off
   * again: the whole point of the three bodies is that the last of them really can die.
   */
  private updateSplit(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;
      const owed = this.masteryOn(owner) && !s.splitSpent;

      if (owed && this.alive(f)) {
        f.minHpFloor = Math.max(f.minHpFloor, 1);
        this.floored.add(f);
      } else if (this.floored.has(f)) {
        f.minHpFloor = 0;
        this.floored.delete(f);
      }

      // The hit that would have finished it. The floor caught the body at 1; this is what it
      // does with the moment it bought.
      if (owed && f.hp > 0 && f.hp <= 1) { this.beginSplit(owner); continue; }
      if (!s.lings.length) continue;

      // Somebody coming off, or coming back — the pool is the only authority on which, so both
      // are read off it rather than tracked. `popped` is what keeps a burst from replaying.
      const alive = this.lingsAlive(owner);
      let lost = false;
      for (const l of s.lings) {
        const up = this.lingHp(owner, l.index) > 0;
        if (up) { l.popped = false; continue; }
        if (l.popped) continue;
        l.popped = true;
        lost = true;
        this.fx(owner).lingPop(l.x, l.y);
        Sfx.playAt('bubble', l.x, { rate: 1.5, volume: 0.7 });
      }
      if (lost && alive.length > 0 && owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 54, `🟢 ${alive.length} LEFT`, this.hex(GUM.oozeLit));
      }
      if (!this.alive(f)) { s.lings = []; continue; }

      // The satellites, hauled along after the body the physics is attached to. They lag on
      // purpose: three points moving in lockstep read as one sprite with decorations.
      const dt = Math.min(0.05, delta / 1000);
      for (const l of s.lings) {
        if (l.index === 0) { l.x = f.x; l.y = f.y; continue; }
        const a = l.phase + this.vizT * 0.7;
        const tx = f.x + Math.cos(a) * LING_ORBIT;
        const ty = f.y + Math.sin(a) * LING_ORBIT * 0.72;
        const k = Math.min(1, LING_SPRING * dt);
        l.x += (tx - l.x) * k;
        l.y += (ty - l.y) * k;
      }
    }
  }

  /** Coming apart. */
  private beginSplit(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    this.ensureLayers();
    this.ensureAvatars();
    s.splitSpent = true;
    // The floor has done its job; from here the last slimeling dying is a real death.
    f.minHpFloor = 0;
    this.floored.delete(f);
    // Whatever the hand had goes on the floor. The body it belonged to no longer exists.
    this.letGo(owner, false);

    s.preSplitMaxHp = f.maxHp;
    if (f.maxHp > SPLIT_POOL) f.reduceMaxHp(f.maxHp - SPLIT_POOL);
    else if (f.maxHp < SPLIT_POOL) f.increaseMaxHp(SPLIT_POOL - f.maxHp);
    f.hp = SPLIT_POOL;

    s.lings = Array.from({ length: SPLIT_COUNT }, (_, i) => ({
      index: i,
      x: f.x + Math.cos((i / SPLIT_COUNT) * TAU) * LING_ORBIT,
      y: f.y + Math.sin((i / SPLIT_COUNT) * TAU) * LING_ORBIT * 0.72,
      seed: Math.random() * 999,
      phase: (i / SPLIT_COUNT) * TAU,
      lodged: null,
      popped: false,
    }));

    f.oozeSizeMult = SPLIT_SIZE;
    f.applySizeMult();
    this.avatar(owner)?.setRigScale(SPLIT_RIG);

    this.fx(owner).split(f.x, f.y);
    this.api.scene.cameras.main.shake(420, 0.011);
    this.api.showFloatingText(f.x, f.y - 60, '🟢 SLIME SPLIT', this.hex(GUM.solidLit));
    Sfx.playAt('slime-splat', f.x, { rate: 0.45, volume: 1 });
    Sfx.playAt('boing', f.x, { rate: 0.6, volume: 1 });
  }

  // ── Mastery: the bot ───────────────────────────────────────────────────────

  /**
   * The bot's half of Oobleck.
   *
   * It cannot carry a shield — it has no cursor to hold one out with, and a held slab would pin
   * a player's body where the AI expects to walk — so it plants one instead, broadside-on across
   * the line to whatever it is fighting. That is the placement a player would carry it to anyway,
   * and it leaves the slab standing where `npcGumSlabSoft` can tell the rotation to set it.
   */
  private updateNpcMastery(): void {
    if (!this.oobleckSlot('npc')) return;
    const s = this.sides.npc;
    if (this.now < s.nextOobleckCheckAt) return;
    s.nextOobleckCheckAt = this.now + NPC_OOBLECK_CHECK_MS;
    if (s.slab) return;
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!this.alive(f) || !t) return;
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d < 90) return;
    // Far enough out to be cover rather than a doorway it is standing in.
    const a = Math.atan2(t.y - f.y, t.x - f.x);
    this.tryOobleck('npc', f.x + Math.cos(a) * 76, f.y + Math.sin(a) * 76);
  }

  // ── Puddles and beacons ────────────────────────────────────────────────────

  /**
   * Lay a puddle. Green ones come out from under a Slime Bomb and slow whoever wades into them;
   * pink ones come up out of the slime itself after Oozorbtion and feed it.
   */
  private spawnPuddle(owner: Owner, kind: 'slow' | 'heal', x: number, y: number): void {
    // Oldest first, so a player who keeps casting refreshes their ground rather than being refused.
    const mine = this.puddles.filter((p) => p.owner === owner);
    while (mine.length >= PUDDLE_MAX) {
      const oldest = mine.shift();
      if (!oldest) break;
      const idx = this.puddles.indexOf(oldest);
      if (idx >= 0) this.puddles.splice(idx, 1);
    }
    this.puddles.push({
      owner, kind,
      x: Phaser.Math.Clamp(x, this.left, this.right),
      y: Phaser.Math.Clamp(y, this.top, this.bottom),
      r: PUDDLE_R,
      until: this.now + PUDDLE_MS,
      seed: Math.random() * 999,
      beacon: false, shake: 0, activeUntil: 0,
      flying: false, vx: 0, vy: 0, landsAt: 0,
    });
  }

  /** A puddle sets. It stops being ground and becomes an object with a switch on it. */
  private makeBeacon(owner: Owner, pd: Puddle): void {
    pd.beacon = true;
    pd.until = this.now + BEACON_MS;
    pd.shake = 0;
    pd.activeUntil = 0;
    this.fx(owner).harden(pd.x, pd.y, 24);
  }

  /**
   * Q+: anything the hand of stone brushes past goes glassy. One pass, one radius, every kind of
   * slime on the field — which is the point of the upgrade, since the ultimate itself is now a
   * weapon rather than a field effect.
   */
  private solidifyTouch(owner: Owner, victim?: Fighter): void {
    const s = this.side(owner);
    const hx = s.handX;
    const hy = s.handY;

    if (victim) {
      const enc = this.encased.get(victim);
      if (enc && enc.owner === owner && !enc.hard) {
        enc.hard = true;
        enc.until += HARD_ENCASE_BONUS_MS;
        this.fx(owner).harden(victim.x, victim.y, 34);
      }
      return;
    }

    for (const b of this.balls) {
      if (b.owner !== owner || b.hard || b.stolen) continue;
      if (Phaser.Math.Distance.Between(hx, hy, b.x, b.y) > SHARD_TOUCH_R + BALL_R) continue;
      b.hard = true;
      b.damage = BALL_HARD_DAMAGE;
      this.fx(owner).harden(b.x, b.y, 20);
    }
    for (const pd of this.puddles) {
      if (pd.owner !== owner || pd.beacon || pd.flying) continue;
      if (Phaser.Math.Distance.Between(hx, hy, pd.x, pd.y) > SHARD_TOUCH_R + pd.r * 0.6) continue;
      this.makeBeacon(owner, pd);
      this.api.showFloatingText(pd.x, pd.y - 28, '🪨 BEACON', this.hex(GUM.stoneLit));
    }
    for (const b of this.bubbles) {
      if (b.owner !== owner || b.hard) continue;
      if (Phaser.Math.Distance.Between(hx, hy, b.x, b.y) > SHARD_TOUCH_R + BUBBLE_R) continue;
      b.hard = true;
    }
    for (const [v, enc] of this.encased) {
      if (enc.owner !== owner || enc.hard || !this.alive(v)) continue;
      if (Phaser.Math.Distance.Between(hx, hy, v.x, v.y) > SHARD_TOUCH_R + 24) continue;
      enc.hard = true;
      enc.until += HARD_ENCASE_BONUS_MS;
      this.fx(owner).harden(v.x, v.y, 34);
    }
    // A slab the claw drags across sets like everything else does — the same wall Q makes, made
    // by walking a stone hand along it instead.
    if (s.slab && !s.slab.hard && this.inSlab(s.slab, hx, hy, SHARD_TOUCH_R)) {
      this.hardenSlab(owner, s.slab);
    }
  }

  /** A Slime Bomb going off: one radius, everybody in it, and fresh ground where it landed. */
  private bombBurst(owner: Owner, b: Ball): void {
    for (const t of this.targetsOf(owner)) {
      if (b.hit.has(t)) continue;
      if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BOMB_AOE_R) continue;
      b.hit.add(t);
      this.hurt(owner, t, b.damage, b.hard ? GUM.solidLit : GUM.oozeLit);
      this.applySlow(t, BALL_SLOW_MS);
      this.record(owner, 'bombHits');
    }
    this.spawnPuddle(owner, 'slow', b.x, b.y);
    this.fx(owner).splat(b.x, b.y, 42, 6);
    this.api.scene.cameras.main.shake(140, 0.004);
    this.api.showFloatingText(b.x, b.y - 34, '💥 SPLASH', this.hex(GUM.oozeLit));
    Sfx.playAt('explosion-medium', b.x, { rate: 1.25, volume: 0.8 });
  }

  /**
   * Everything on the ground, every frame: flight, expiry, the soak ramps that are the whole
   * point of a puddle, and the auras beacons run once they have been shaken awake.
   */
  private updatePuddles(delta: number): void {
    const dt = delta / 1000;

    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      const s = this.side(pd.owner);

      // Carried: it rides the hand, and a beacon banks the shaking it gets on the way.
      if (s.held?.kind === 'puddle' && s.held.puddle === pd) {
        pd.x = s.handX;
        pd.y = s.handY;
        if (pd.beacon && Math.hypot(s.handVx, s.handVy) >= BEACON_SHAKE_SPEED) {
          pd.shake = Math.min(BEACON_MAX_ACTIVE_MS, pd.shake + delta);
        }
        continue;
      }

      if (pd.flying) {
        pd.x = Phaser.Math.Clamp(pd.x + pd.vx * dt, this.left, this.right);
        pd.y = Phaser.Math.Clamp(pd.y + pd.vy * dt, this.top, this.bottom);
        if (this.now >= pd.landsAt) {
          pd.flying = false;
          pd.vx = 0;
          pd.vy = 0;
          this.fx(pd.owner).splat(pd.x, pd.y, 22, 4, pd.kind === 'heal');
        }
        continue;
      }

      // A lit beacon does not age out from under its own aura.
      if (this.now >= pd.until && this.now >= pd.activeUntil) {
        this.fx(pd.owner).pop(pd.x, pd.y, pd.beacon ? 18 : 26);
        this.puddles.splice(i, 1);
      }
    }

    // ── The ramps ──
    // Slow: rises while a body is standing in enemy slime, falls once it steps out. Rebuilt from
    // scratch each frame from "is this fighter in one right now", so nothing has to be handed back.
    // Hoisted: `targetsOf` builds a fresh array, and this is a fighters × puddles loop.
    const foes: Record<Owner, Fighter[]> = { player: this.targetsOf('player'), npc: this.targetsOf('npc') };
    for (const f of this.allFighters()) {
      if (!this.alive(f)) { this.slowSoak.delete(f); this.healSoak.delete(f); continue; }

      let inSlow = false;
      let inHeal = false;
      for (const pd of this.puddles) {
        if (pd.flying || pd.beacon) continue;
        if (Phaser.Math.Distance.Between(pd.x, pd.y, f.x, f.y) > pd.r) continue;
        if (pd.kind === 'slow') {
          // Your own slime never slows you; that would make Slime Splash unusable up close.
          if (!foes[pd.owner].includes(f)) continue;
          inSlow = true;
        } else if (this.fighter(pd.owner) === f) {
          inHeal = true;
        }
      }

      const slow = Phaser.Math.Clamp(
        (this.slowSoak.get(f) ?? 0) + (inSlow ? delta / SOAK_RAMP_MS : -delta / SOAK_FADE_MS), 0, 1);
      if (slow > 0) this.slowSoak.set(f, slow); else this.slowSoak.delete(f);

      const heal = Phaser.Math.Clamp(
        (this.healSoak.get(f) ?? 0) + (inHeal ? delta / HEAL_RAMP_MS : -delta / SOAK_FADE_MS), 0, 1);
      if (heal > 0) this.healSoak.set(f, heal); else this.healSoak.delete(f);

      // Healing is paid out in whole points, with the remainder carried, so the slowest trickle
      // still lands rather than being rounded to zero every frame.
      if (inHeal) {
        const rate = HEAL_MIN_RATE + (HEAL_MAX_RATE - HEAL_MIN_RATE) * heal;
        const acc = (this.healAcc.get(f) ?? 0) + rate * dt;
        const whole = Math.floor(acc);
        this.healAcc.set(f, acc - whole);
        if (whole > 0 && f.hp < f.maxHp) {
          f.heal(whole);
          if (Math.random() < 0.25) this.fx(this.ownerOf(f) ?? 'player').digest(f.x, f.y);
        }
      } else {
        this.healAcc.delete(f);
      }
    }

    // ── Beacon auras ──
    for (const pd of this.puddles) {
      if (!pd.beacon || this.now >= pd.activeUntil) continue;
      if (pd.kind === 'heal') {
        const f = this.fighter(pd.owner);
        if (!this.alive(f)) continue;
        if (Phaser.Math.Distance.Between(pd.x, pd.y, f.x, f.y) > BEACON_AURA_R) continue;
        const acc = (this.healAcc.get(f) ?? 0) + BEACON_HEAL_RATE * dt;
        const whole = Math.floor(acc);
        this.healAcc.set(f, acc - whole);
        if (whole > 0 && f.hp < f.maxHp) f.heal(whole);
      }
      // The slowing half is read straight out of `speedMultFor`, which is where every other slow
      // in this element already lives.
    }
  }

  /** Which side owns this fighter, if either. Only used to pick which palette an effect wears. */
  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  // ── Bubble Bloat ───────────────────────────────────────────────────────────

  /**
   * The extra shell. It grows a layer per bubble past the first and comes off against a wall —
   * any wall, whether the victim walked into it or was thrown at it by the slime that gummed them.
   */
  private updateBloat(): void {
    for (const [victim, bl] of [...this.bloat]) {
      if (!this.alive(victim) || !this.encased.has(victim)) { this.bloat.delete(victim); continue; }
      if (bl.layers < BLOAT_MIN_LAYERS) continue;
      const onWall = victim.x <= this.left + 8 || victim.x >= this.right - 8
        || victim.y <= this.top + 8 || victim.y >= this.bottom - 8;
      if (!onWall) continue;

      const hard = this.encased.get(victim)?.hard ?? false;
      const dmg = (hard ? BLOAT_HARD_DAMAGE : BLOAT_DAMAGE) * bl.layers;
      this.bloat.delete(victim);
      this.hurt(bl.owner, victim, dmg, hard ? GUM.solidLit : GUM.gumLit);
      this.fx(bl.owner).bloatBurst(victim.x, victim.y, this.bloatRadius(bl.layers), hard);
      this.api.showFloatingText(victim.x, victim.y - 52,
        `🎈 BLOAT ×${bl.layers}`, this.hex(hard ? GUM.solidLit : GUM.gumLit));
      this.api.scene.cameras.main.shake(240, 0.007);
      Sfx.playAt('bubble', victim.x, { rate: 0.55, volume: 1 });
      Sfx.playAt(hard ? 'crystal-shatter' : 'hit-heavy', victim.x, { rate: 0.9, volume: 0.9 });
    }
  }

  private bloatRadius(layers: number): number {
    return Math.min(BLOAT_MAX_R, BLOAT_BASE_R + layers * BLOAT_R_PER_LAYER);
  }

  // ── Zip-lines ──────────────────────────────────────────────────────────────

  /**
   * The ride. A grip on a zip-line does not read the mouse at all — it simply hauls the body flat
   * across the arena until a wall stops it, which makes it the one movement in the element that
   * costs no cursor work. The price is that you are committed: you go the way you set off.
   */
  private updateRide(): void {
    const s = this.sides.player;
    const p = this.api.player;
    if (!s.riding) return;
    if (!this.alive(p) || this.api.isDodging) { this.letGo('player', false); return; }

    const body = p.body as Phaser.Physics.Arcade.Body;
    // Settle onto the line rather than snapping to it, so catching one from below reads as a haul.
    const vy = (s.riding.y - p.y) * 6;
    body.setVelocity(ZIP_SPEED * s.riding.dir * this.speedMultFor(p),
      Phaser.Math.Clamp(vy, -ZIP_SPEED, ZIP_SPEED));

    // Q+: stone on slime. The line throws sparks the whole way across.
    if (this.hasShardHand('player') && this.now >= s.nextSparkAt) {
      s.nextSparkAt = this.now + ZIP_SPARK_MS;
      const sx = s.handX;
      const sy = s.handY;
      for (let i = 0; i < ZIP_SPARK_COUNT; i++) {
        const a = (i / ZIP_SPARK_COUNT) * TAU + Math.random() * 0.4;
        const sp = ZIP_SPARK_SPEED * (0.6 + Math.random() * 0.8);
        this.shards.push({
          owner: 'player', x: sx, y: sy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          diesAt: this.now + ZIP_SPARK_LIFE_MS, seed: Math.random() * 999,
          damage: ZIP_SPARK_DAMAGE, spark: true, hit: new Set(),
        });
      }
      this.pfx.sparks(sx, sy, 22);
      Sfx.playAt('clang', sx, { rate: 1.7, volume: 0.3 });
    }

    if ((s.riding.dir < 0 && p.x <= this.left + 6) || (s.riding.dir > 0 && p.x >= this.right - 6)) {
      this.pfx.splat(p.x, p.y, 26, 8);
      this.api.showFloatingText(p.x, p.y - 46, '🧱 END OF THE LINE', this.hex(GUM.oozeLit));
      Sfx.playAt('hit-light', p.x, { rate: 0.8, volume: 0.6 });
      this.letGo('player', false);
      body.setVelocity(0, 0);
    }
  }

  // ── Oozorbtion plumbing ────────────────────────────────────────────────────

  private swell(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.swollen || !f) return;
    s.swollen = true;
    f.oozeSizeMult = OOZE_SWELL;
    f.applySizeMult();
  }

  private unswell(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.swollen) return;
    s.swollen = false;
    if (!f) return;
    f.oozeSizeMult = 1;
    f.applySizeMult();
  }

  /**
   * The catch-all half of Oozorbtion. Shots are plucked out of the air by `updateAbsorb`, which
   * is the version the player actually sees; this covers everything that never becomes a
   * projectile — a melee swing, a beam tick, a puddle — so the ability is never a dead button.
   */
  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.absorberInstalled || !f) return;
    s.prevAbsorber = f.damageAbsorber;
    s.absorberInstalled = true;
    f.damageAbsorber = (amount: number) => {
      if (this.now >= s.absorbUntil || s.lodged) {
        return s.prevAbsorber ? s.prevAbsorber(amount) : false;
      }
      this.lodge(owner, Math.max(1, Math.round(amount)));
      return true;
    };
  }

  private dropAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.absorberInstalled) return;
    s.absorberInstalled = false;
    if (f) f.damageAbsorber = s.prevAbsorber;
    s.prevAbsorber = null;
  }

  /** Something has been swallowed. It sits in the body until it breaks down into health. */
  private lodge(owner: Owner, damage: number, ling?: Ling): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    this.record(owner, 'absorbs');
    // Slime Split: each slimeling gets its own. The window only closes once they all have one,
    // which is what makes a single Oozorbtion worth three shots to a body that has come apart.
    const hungry = ling ?? this.lingsAlive(owner).find((l) => !l.lodged);
    if (hungry) {
      hungry.lodged = { damage, digestAt: this.now + DIGEST_MS, seed: Math.random() * 999 };
      this.fx(owner).swallow(hungry.x, hungry.y);
      this.api.showFloatingText(hungry.x, hungry.y - 30, `🫗 ${damage}`, this.hex(GUM.oozeLit));
      Sfx.playAt('boing', hungry.x, { rate: 1.1, volume: 0.75 });
      if (!this.lingsAlive(owner).some((l) => !l.lodged)) {
        s.absorbUntil = 0;
        this.unswell(owner);
        this.dropAbsorber(owner);
      }
      this.emesis(owner);
      return;
    }
    s.lodged = { damage, digestAt: this.now + DIGEST_MS, seed: Math.random() * 999 };
    s.absorbUntil = 0;
    this.unswell(owner);
    this.dropAbsorber(owner);
    if (!this.alive(f)) return;
    this.fx(owner).swallow(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 46, `🫗 ABSORBED ${damage}`, this.hex(GUM.oozeLit));
    Sfx.playAt('boing', f.x, { rate: 0.8, volume: 0.9 });

    this.emesis(owner);
  }

  /**
   * F+ — Emesis. Swallowing something brings some of you back up with it: three pink puddles
   * around your feet that feed you instead of slowing anybody. Its own method because a split
   * body reaches the swallow down a different path and still owns the upgrade.
   */
  private emesis(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.up(owner, 'f') || !this.alive(f)) return;
    for (let i = 0; i < EMESIS_COUNT; i++) {
      const a = (i / EMESIS_COUNT) * TAU + Math.random() * 0.5;
      const d = 46 + Math.random() * 26;
      this.spawnPuddle(owner, 'heal', f.x + Math.cos(a) * d, f.y + Math.sin(a) * d);
    }
    this.fx(owner).splat(f.x, f.y, 30, 4, true);
    this.api.showFloatingText(f.x, f.y - 66, '🤮 EMESIS', this.hex(GUM.gumLit));
    Sfx.playAt('slime-splat', f.x, { rate: 0.6, volume: 0.9 });
  }

  private updateAbsorb(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;

      // Armed: pull the first enemy shot that reaches the body out of the air before it lands.
      if (this.now < s.absorbUntil && !s.lodged && this.alive(f)) {
        const caught = this.catchShot(owner, f.x, f.y, ABSORB_R);
        if (caught !== null) this.lodge(owner, caught);
        // Split: the satellites open too, and each of them catches its own. This is the one
        // place the passive adds a hitbox rather than just a second life.
        for (const l of this.lingsAlive(owner)) {
          if (l.index === 0 || l.lodged) continue;
          const got = this.catchShot(owner, l.x, l.y, LING_ABSORB_R);
          if (got !== null) this.lodge(owner, got, l);
        }
      } else if (this.now >= s.absorbUntil && s.swollen && !s.lodged) {
        // The window closed with nothing caught. The swelling was the whole cost.
        this.unswell(owner);
        this.dropAbsorber(owner);
        if (this.alive(f)) {
          this.api.showFloatingText(f.x, f.y - 44, '🫠 NOTHING CAME', this.hex(GUM.oozeDeep));
        }
      }

      if (s.lodged && this.now >= s.lodged.digestAt) {
        const amount = s.lodged.damage;
        s.lodged = null;
        if (!this.alive(f)) continue;
        f.heal(amount);
        this.fx(owner).digest(f.x, f.y);
        this.api.showFloatingText(f.x, f.y - 52, `🍽 DIGESTED +${amount}`, this.hex(GUM.shine));
        Sfx.playAt('heal', f.x, { rate: 0.9, volume: 0.85 });
      }

      // Each slimeling breaks down its own. The health goes into the shared pool, because the
      // pool *is* the three of them — a slimeling with nothing left in it is simply gone.
      for (const l of s.lings) {
        if (!l.lodged || this.now < l.lodged.digestAt) continue;
        const amount = l.lodged.damage;
        l.lodged = null;
        if (!this.alive(f)) continue;
        f.heal(amount);
        this.fx(owner).digest(l.x, l.y);
        this.api.showFloatingText(l.x, l.y - 26, `🍽 +${amount}`, this.hex(GUM.shine));
        Sfx.playAt('heal', l.x, { rate: 1.15, volume: 0.7 });
      }
    }
  }

  // ── The hand ───────────────────────────────────────────────────────────────

  /**
   * Where the hand wants to be this frame. Free it tracks the cursor (clamped to arm length);
   * anchored it stays on the world point it grabbed, which is what makes the drag work at all.
   */
  private updateHand(delta: number): void {
    for (const owner of BOTH) {
      if (!this.isGum(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const av = this.avatar(owner);
      if (!f || !av) continue;

      // The bot has no mouse: its hand reaches toward whatever it is aiming at.
      if (owner === 'npc') {
        const t = this.targetsOf('npc')[0];
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }

      const handless = this.now < s.handBackAt;
      av.setHandless(handless);
      if (handless) {
        av.setReach(HAND_MIN, Math.atan2(s.aimY - f.y, s.aimX - f.x), 0);
        av.update(delta, f.x, f.y, f.alpha);
        s.handVx = 0;
        s.handVy = 0;
        continue;
      }

      av.setShardHand(this.hasShardHand(owner));

      let tx: number;
      let ty: number;
      if (s.riding) {
        // Riding: the hand belongs to the line, out ahead of the body in the direction of travel.
        tx = f.x + s.riding.dir * 46;
        ty = s.riding.y;
      } else if (s.anchored) {
        tx = s.anchorX;
        ty = s.anchorY;
      } else {
        tx = s.aimX;
        ty = s.aimY;
      }
      const dx = tx - f.x;
      const dy = ty - f.y;
      const raw = Math.hypot(dx, dy) || 1;
      const dist = Phaser.Math.Clamp(raw, HAND_MIN, HAND_MAX);
      const ang = Math.atan2(dy, dx);
      av.setReach(dist, ang, dist / HAND_MAX);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);

      // The rendered hand is the authoritative one — what you see is exactly what you hit.
      const pos = av.handPos();
      const dt = Math.max(0.001, delta / 1000);
      if (s.handSeeded) {
        s.handVx = (pos.x - s.handX) / dt;
        s.handVy = (pos.y - s.handY) / dt;
      }
      s.handX = pos.x;
      s.handY = pos.y;
      s.handSeeded = true;
    }
  }

  /** Whipping the hand over somebody. Free, weak, and the reason movement is never wasted. */
  private updateSmack(): void {
    for (const owner of BOTH) {
      if (!this.isGum(owner)) continue;
      const s = this.side(owner);
      if (s.held || s.anchored || this.now < s.handBackAt) continue;
      if (Math.hypot(s.handVx, s.handVy) < SMACK_SPEED) continue;
      const stone = this.hasShardHand(owner);
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(s.handX, s.handY, t.x, t.y) > SMACK_R) continue;
        const gate = s.smackGate.get(t) ?? 0;
        if (this.now < gate) continue;
        s.smackGate.set(t, this.now + SMACK_GATE_MS);
        this.hurt(owner, t, SMACK_DAMAGE + (stone ? SHARD_SMACK_BONUS : 0),
          stone ? GUM.stoneLit : GUM.oozeLit);
        if (stone) {
          if (t.hp <= 0) this.record(owner, 'clawKills');
          this.solidifyTouch(owner, t);
          this.fx(owner).sparks(t.x, t.y, 20);
        } else {
          this.fx(owner).splat(t.x, t.y, 18);
        }
        Sfx.playAt('hit-light', t.x, { rate: stone ? 0.85 : 1.15, volume: 0.7 });
      }
    }
  }

  /**
   * The drag.
   *
   * The anchor is fixed in the world and the mouse is a handle: every pixel the cursor travels
   * moves the body the same distance the other way, so pulling the mouse *back* hauls you
   * *forward* toward whatever you grabbed. The rope constraint at the end is what stops the body
   * sliding past the end of its own arm.
   */
  private updateDrag(delta: number): void {
    if (this.api.elementId !== 'gum') return;
    const s = this.sides.player;
    const p = this.api.player;
    if (!this.alive(p)) return;
    // A Space dodge owns the body for its duration. It is the one movement in the game a slime
    // makes without its arm, and letting the drag fight it would eat the dash entirely.
    if (this.api.isDodging) { this.mouseDX = 0; this.mouseDY = 0; return; }
    const body = p.body as Phaser.Physics.Arcade.Body;

    // A zip-line ride writes the velocity itself, and reading the mouse on top of it would fight
    // the only movement in this element the cursor is not responsible for.
    if (s.riding) { this.mouseDX = 0; this.mouseDY = 0; return; }

    if (!s.anchored || s.held || this.now < s.handBackAt) {
      body.setVelocity(0, 0);
      this.mouseDX = 0;
      this.mouseDY = 0;
      return;
    }

    // Wound too far past the anchor: the grip tears rather than stretching forever.
    if (Phaser.Math.Distance.Between(s.aimX, s.aimY, s.anchorX, s.anchorY) > SLIP_DIST) {
      this.letGo('player', false);
      this.pfx.pop(s.anchorX, s.anchorY, 18);
      this.api.showFloatingText(s.anchorX, s.anchorY - 24, '💢 SLIPPED', this.hex(GUM.oozeDeep));
      Sfx.playAt('snap-back', s.anchorX, { rate: 1.1, volume: 0.7 });
      body.setVelocity(0, 0);
      this.mouseDX = 0;
      this.mouseDY = 0;
      return;
    }

    const dt = Math.max(0.001, delta / 1000);
    const gain = (s.anchorWall ? WALL_DRAG_GAIN : DRAG_GAIN) * this.speedMultFor(p);
    let vx = (-this.mouseDX * gain) / dt;
    let vy = (-this.mouseDY * gain) / dt;
    const sp = Math.hypot(vx, vy);
    if (sp > DRAG_MAX_SPEED) {
      vx = (vx / sp) * DRAG_MAX_SPEED;
      vy = (vy / sp) * DRAG_MAX_SPEED;
    }

    // Rope: at full extension the body may swing around the anchor but not away from it.
    const ax = p.x - s.anchorX;
    const ay = p.y - s.anchorY;
    const d = Math.hypot(ax, ay);
    if (d > HAND_MAX && d > 0.001) {
      const nx = ax / d;
      const ny = ay / d;
      const out = vx * nx + vy * ny;
      if (out > 0) { vx -= nx * out; vy -= ny * out; }
    }

    body.setVelocity(vx, vy);
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  // ── Slimeballs ─────────────────────────────────────────────────────────────

  private updateBalls(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      const s = this.side(b.owner);
      // Carried: the ball rides the hand.
      if (s.held?.kind === 'ball' && s.held.ball === b) {
        b.x = s.handX;
        b.y = s.handY;
        continue;
      }
      if (!b.flying) continue;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let done = false;
      for (const t of this.targetsOf(b.owner)) {
        if (b.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BALL_R + 16) continue;
        // A Slime Bomb never lands a single hit — it goes off, and the body it touched is simply
        // the closest thing to the blast.
        if (b.bomb) { this.bombBurst(b.owner, b); done = true; break; }
        b.hit.add(t);
        this.hurt(b.owner, t, b.damage, b.hard ? GUM.solidLit : GUM.oozeLit);
        this.fx(b.owner).splat(t.x, t.y, b.hard ? 26 : 30);
        if (!b.stolen) {
          this.applySlow(t, BALL_SLOW_MS);
          this.api.showFloatingText(t.x, t.y - 34, '🐌 SLIMED', this.hex(GUM.oozeLit));
        }
        Sfx.playAt(b.hard ? 'crystal-shatter' : 'slime-splat', t.x, { rate: 0.9, volume: 0.95 });
        done = true;
        break;
      }
      if (done) {
        if (b.hard) this.burstShards(b.owner, b.x, b.y, WALL_SHATTER_SHARDS);
        this.balls.splice(i, 1);
        continue;
      }

      const hitWall = b.x <= this.left || b.x >= this.right || b.y <= this.top || b.y >= this.bottom;
      if (hitWall) {
        b.x = Phaser.Math.Clamp(b.x, this.left, this.right);
        b.y = Phaser.Math.Clamp(b.y, this.top, this.bottom);
        if (b.bomb) {
          this.bombBurst(b.owner, b);
          if (b.hard) this.burstShards(b.owner, b.x, b.y, WALL_SHATTER_SHARDS);
          this.balls.splice(i, 1);
          continue;
        }
        if (b.hard) {
          // Hardened slime does not stick — it breaks, and the wall is what breaks it.
          this.fx(b.owner).harden(b.x, b.y, 22);
          this.burstShards(b.owner, b.x, b.y, WALL_SHATTER_SHARDS);
          Sfx.playAt('crystal-shatter', b.x, { rate: 1.05, volume: 0.9 });
          this.balls.splice(i, 1);
          continue;
        }
        b.flying = false;
        b.vx = 0;
        b.vy = 0;
        this.fx(b.owner).splat(b.x, b.y, 18, 4);
        continue;
      }

      if (this.now >= b.landsAt) {
        if (b.stolen) {
          // Caught fire is spent once it has been thrown; it does not become a slimeball.
          this.fx(b.owner).pop(b.x, b.y, 14);
          this.balls.splice(i, 1);
          continue;
        }
        b.flying = false;
        b.vx = 0;
        b.vy = 0;
        this.fx(b.owner).splat(b.x, b.y, 16, 4);
      }
    }
  }

  private burstShards(owner: Owner, x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + Math.random() * 0.3;
      const sp = SHARD_SPEED * (0.7 + Math.random() * 0.5);
      this.shards.push({
        owner, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        diesAt: this.now + SHARD_LIFE_MS, seed: Math.random() * 999,
        damage: SHARD_DAMAGE, spark: false, hit: new Set(),
      });
    }
    this.fx(owner).shardBurst(x, y, Math.min(10, count));
  }

  // ── Gum ────────────────────────────────────────────────────────────────────

  private updateBubbles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let popped = false;
      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BUBBLE_R + 16) continue;
        this.hurt(b.owner, t, BUBBLE_DAMAGE, GUM.gum);
        this.encase(b.owner, t);
        popped = true;
        break;
      }
      const out = b.x <= this.left || b.x >= this.right || b.y <= this.top || b.y >= this.bottom;
      if (popped || out || this.now >= b.diesAt) {
        this.fx(b.owner).pop(b.x, b.y, popped ? 20 : 12);
        this.bubbles.splice(i, 1);
      }
    }
  }

  private encase(owner: Owner, victim: Fighter): void {
    // R+ — Bubble Bloat. Every bubble past the first inflates the shell one more layer, and each
    // layer is both a bigger balloon and more damage waiting for the next wall.
    if (this.up(owner, 'r')) {
      const bl = this.bloat.get(victim);
      if (bl && bl.owner === owner) {
        bl.layers++;
        if (bl.layers === BLOAT_MIN_LAYERS) {
          this.api.showFloatingText(victim.x, victim.y - 58, '🎈 BLOATED', this.hex(GUM.gumLit));
          Sfx.playAt('stretch', victim.x, { rate: 0.6, volume: 0.9 });
        }
      } else {
        this.bloat.set(victim, { owner, layers: 1 });
      }
    }

    const existing = this.encased.get(victim);
    const until = this.now + ENCASE_MS;
    if (existing) {
      existing.owner = owner;
      existing.until = Math.max(existing.until, until);
      return;
    }
    this.encased.set(victim, { owner, until, hard: false });
    this.api.showFloatingText(victim.x, victim.y - 40, '🩷 ENCASED', this.hex(GUM.gumLit));
    Sfx.playAt('bubble', victim.x, { rate: 0.7, volume: 0.9 });
  }

  private updateEncased(): void {
    for (const [victim, enc] of [...this.encased]) {
      const carried = this.side(enc.owner).held?.victim === victim;
      if (!this.alive(victim)) { this.encased.delete(victim); this.bloat.delete(victim); continue; }
      if (this.now < enc.until || carried) continue;
      this.encased.delete(victim);
      // The bloat is grown on top of the gum, so it goes when the gum does.
      this.bloat.delete(victim);
      this.fx(enc.owner).pop(victim.x, victim.y, 26);
      Sfx.playAt('bubble', victim.x, { rate: 1.4, volume: 0.6 });
    }
  }

  /** A carried body rides the hand; a thrown one is watching for a wall. */
  private updateCarriedAndFlung(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const victim = s.held?.victim;
      if (s.held?.kind !== 'body' || !victim) continue;
      if (!this.alive(victim)) { this.letGo(owner, false); continue; }
      // `reset` rather than `setPosition`: it moves the physics body itself, which is the only
      // way a carried fighter stops being dragged back by whatever set its velocity this frame.
      (victim.body as Phaser.Physics.Arcade.Body).reset(s.handX, s.handY);
    }

    for (const [victim, fl] of [...this.flung]) {
      if (!this.alive(victim)) { this.flung.delete(victim); continue; }
      const onWall = victim.x <= this.left + 6 || victim.x >= this.right - 6
        || victim.y <= this.top + 6 || victim.y >= this.bottom - 6;
      if (onWall) {
        this.flung.delete(victim);
        this.hurt(fl.owner, victim, WALL_SLAM_DAMAGE, GUM.gumLit);
        this.stuckUntil.set(victim, { owner: fl.owner, until: this.now + WALL_STUCK_MS });
        (victim.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.fx(fl.owner).splat(victim.x, victim.y, 30, 6, true);
        this.api.showFloatingText(victim.x, victim.y - 46, '🧱 STUCK', this.hex(GUM.gumLit));
        this.api.scene.cameras.main.shake(200, 0.006);
        Sfx.playAt('hit-heavy', victim.x, { rate: 0.8, volume: 1 });
        if (fl.hard) {
          this.burstShards(fl.owner, victim.x, victim.y, WALL_SHATTER_SHARDS);
          Sfx.playAt('crystal-shatter', victim.x, { rate: 0.9, volume: 0.95 });
        }
        continue;
      }
      if (this.now >= fl.until) { this.flung.delete(victim); continue; }
      (victim.body as Phaser.Physics.Arcade.Body).setVelocity(fl.vx, fl.vy);
    }

    for (const [victim, st] of [...this.stuckUntil]) {
      if (!this.alive(victim) || this.now >= st.until) { this.stuckUntil.delete(victim); continue; }
      (victim.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  // ── Shards ─────────────────────────────────────────────────────────────────

  private updateShards(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      let spent = false;
      for (const t of this.targetsOf(sh.owner)) {
        if (sh.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > 20) continue;
        sh.hit.add(t);
        this.hurt(sh.owner, t, sh.damage, sh.spark ? GUM.stoneLit : GUM.solidLit);
        spent = true;
        break;
      }
      const out = sh.x < this.left - 20 || sh.x > this.right + 20
        || sh.y < this.top - 20 || sh.y > this.bottom + 20;
      if (spent || out || this.now >= sh.diesAt) this.shards.splice(i, 1);
    }
  }

  // ── Slows ──────────────────────────────────────────────────────────────────

  private applySlow(victim: Fighter, ms: number): void {
    this.slowUntil.set(victim, Math.max(this.slowUntil.get(victim) ?? 0, this.now + ms));
  }

  /** Everything this element does to one body's movement, folded into a single factor. */
  private speedMultFor(f: Fighter | null | undefined): number {
    if (!f) return 1;
    const stuck = this.stuckUntil.get(f);
    if (stuck && this.now < stuck.until) return 0;
    let m = 1;
    if (this.now < (this.slowUntil.get(f) ?? 0)) m *= BALL_SLOW_MULT;
    if (this.encased.has(f)) m *= ENCASE_SLOW_MULT;
    // The puddle ramp: shallow the moment you step in, crippling if you stand there.
    const soak = this.slowSoak.get(f) ?? 0;
    if (soak > 0) m *= 1 - (1 - PUDDLE_SLOW_FLOOR) * soak;
    // Oobleck: the ramp runs the other way round to a puddle's — it is worst at the end, and
    // stepping out of the slab does not stop it. There is nothing to do but wait it out.
    const ramp = this.oobleckRamp(f);
    if (ramp > 0) m *= 1 - (1 - OOBLECK_SLOW_FLOOR) * ramp;
    // A lit green beacon slows flat, wherever inside its aura you are.
    for (const pd of this.puddles) {
      if (!pd.beacon || pd.kind !== 'slow' || this.now >= pd.activeUntil) continue;
      if (!this.targetsOf(pd.owner).includes(f)) continue;
      if (Phaser.Math.Distance.Between(pd.x, pd.y, f.x, f.y) > BEACON_AURA_R) continue;
      m *= BEACON_SLOW_MULT;
      break;
    }
    return m;
  }

  /**
   * Husks and co-op allies never pass through ArenaScene's duel speed aggregate, so they are
   * slowed the only way that reaches them: by writing the generic field every frame and handing
   * it back the moment the effect ends.
   */
  private pushWalkSpeeds(): void {
    const duelists = [this.api.player, this.api.npc];
    for (const f of this.allFighters()) {
      if (!f || duelists.includes(f)) continue;
      const m = this.speedMultFor(f);
      if (m < 0.999) {
        f.walkSpeedMult = Math.min(f.walkSpeedMult, m);
        this.touchedWalk.add(f);
      } else if (this.touchedWalk.has(f)) {
        f.walkSpeedMult = 1;
        this.touchedWalk.delete(f);
      }
    }
    for (const [f, until] of [...this.slowUntil]) {
      if (!f.active || this.now >= until) this.slowUntil.delete(f);
    }
    for (const [f, o] of [...this.oobleck]) {
      if (!f.active || this.now >= o.until) this.oobleck.delete(f);
    }
  }

  // ── The bot ────────────────────────────────────────────────────────────────

  /** The nearest of the bot's own resting slimeballs it could plausibly have picked up. */
  private botReachBall(owner: Owner): Ball | null {
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    let best: Ball | null = null;
    let bestD = HAND_MAX;
    for (const b of this.balls) {
      if (b.owner !== owner || b.flying) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y);
      if (d <= bestD) { best = b; bestD = d; }
    }
    return best;
  }

  /**
   * The bot cannot use a mouse, so it cannot drag itself along the floor — but it must not simply
   * get the passive's drawbacks waived either. Instead its movement is pulsed: a hard haul, then a
   * pause while an imaginary arm is thrown out again. Same average speed a dragging player manages,
   * same lurching read on screen, and no body override to fight the AI for.
   */
  private haulMult(): number {
    const phase = (this.sides.npc.haul % 0.95) / 0.95;
    return phase < 0.55 ? 1.45 : 0.2;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isGum('player');
    const npcIs = this.isGum('npc');
    const anyState = this.balls.length || this.bubbles.length || this.shards.length
      || this.puddles.length || this.encased.size || this.flung.size || this.stuckUntil.size
      || this.slowUntil.size || this.sides.player.lodged || this.sides.npc.lodged
      || this.oobleck.size || this.sides.player.slab || this.sides.npc.slab;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.ensureZips();
    this.vizT += delta / 1000;
    this.sides.npc.haul += delta / 1000;

    this.updateHand(delta);
    this.updateDrag(delta);
    this.updateRide();
    this.updateSmack();
    this.updateBalls(delta);
    this.updateBubbles(delta);
    this.updateEncased();
    this.updateBloat();
    this.updateCarriedAndFlung();
    this.updateShards(delta);
    this.updatePuddles(delta);
    // The split first: everything after it reads slimeling positions, and the hard slab's
    // push-out has to be the last word on where a body actually ended up this frame.
    this.updateSplit(delta);
    this.updateSlabs();
    this.updateNpcMastery();
    this.updateAbsorb();
    this.pushWalkSpeeds();

    // The hand grows back.
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.handBackAt && this.now >= s.handBackAt) {
        s.handBackAt = 0;
        this.avatar(owner)?.setHandless(false);
        const f = this.fighter(owner);
        if (this.alive(f)) {
          this.fx(owner).splat(f.x, f.y, 22);
          this.api.showFloatingText(f.x, f.y - 48, '🖐 HAND REGROWN', this.hex(GUM.oozeLit));
          Sfx.playAt('boing', f.x, { rate: 0.9, volume: 0.8 });
        }
      }
      // …and the hand of stone softens back into slime.
      if (s.shardUntil && this.now >= s.shardUntil) {
        s.shardUntil = 0;
        this.avatar(owner)?.setShardHand(false);
        const f = this.fighter(owner);
        if (this.alive(f)) {
          this.fx(owner).splat(f.x, f.y, 20);
          this.api.showFloatingText(f.x, f.y - 48, '🫠 HAND SOFTENED', this.hex(GUM.oozeLit));
          Sfx.playAt('slime-splat', f.x, { rate: 0.7, volume: 0.7 });
        }
      }
      // Q+: everything the claw drags through goes glassy on its own, no cast required.
      if (this.hasShardHand(owner)) this.solidifyTouch(owner);
    }

    this.paintGround();
    this.paintAir();
    this.pushStatuses(playerIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // Puddles first — they are the floor everything else is lying on.
    for (const pd of this.puddles) {
      const s = this.side(pd.owner);
      const carried = s.held?.kind === 'puddle' && s.held.puddle === pd;
      if (pd.beacon || carried) continue;
      const life = Phaser.Math.Clamp((pd.until - this.now) / 1200, 0, 1);
      // The ring shows the deepest anybody standing in this one has sunk.
      let soak = 0;
      for (const f of this.allFighters()) {
        if (!this.alive(f)) continue;
        if (Phaser.Math.Distance.Between(pd.x, pd.y, f.x, f.y) > pd.r) continue;
        const v = pd.kind === 'heal' ? (this.healSoak.get(f) ?? 0) : (this.slowSoak.get(f) ?? 0);
        soak = Math.max(soak, v);
      }
      slimePuddle(g, this.col(pd.owner), pd.x, pd.y, pd.r, 1, this.vizT,
        { seed: pd.seed, heal: pd.kind === 'heal', soak, life });
    }

    // A soft slab lying on the floor is something you walk *through*, so it is painted under the
    // people walking through it. A held one, and a hard one, go on the air layer instead.
    for (const owner of BOTH) {
      const sl = this.side(owner).slab;
      if (!sl || sl.hard) continue;
      if (this.side(owner).held?.slab === sl) continue;
      this.paintSlab(g, sl);
    }

    // The slimelings, under the arm that is made out of all three of them.
    for (const owner of BOTH) {
      for (const l of this.side(owner).lings) {
        const hp = this.lingHp(owner, l.index) / SPLIT_HP;
        if (hp <= 0) continue;
        // The lead is drawn by its own rig, so only the satellites are painted here.
        if (l.index === 0) continue;
        const s = this.side(owner);
        slimeling(g, this.col(owner), l.x, l.y, LING_R, 0.95, this.vizT,
          { seed: l.seed, hp, aim: Math.atan2(s.handY - l.y, s.handX - l.x) });
        // Its share of the one hand: a thin arm running from it to wherever the hand is.
        gummyArm(g, this.col(owner), l.x, l.y - 2, s.handX, s.handY, 4.6, 3.2, 0.8, this.vizT,
          { stretch: 0.5, seed: l.seed });
        if (l.lodged) {
          const left = Phaser.Math.Clamp((l.lodged.digestAt - this.now) / DIGEST_MS, 0, 1);
          g.fillStyle(this.col(owner)(GUM.murk), 0.8 * left);
          g.fillCircle(l.x, l.y + 1, 4 * left + 1.5);
        }
      }
    }

    // Grips.
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.anchored) continue;
      const f = this.fighter(owner);
      const toward = f ? Math.atan2(f.y - s.anchorY, f.x - s.anchorX) : 0;
      gripSplat(g, this.col(owner), s.anchorX, s.anchorY, 11, 0.95, this.vizT,
        { pull: 1, toward, wall: s.anchorWall });
    }

    // Resting slimeballs, sitting in their own little puddles.
    for (const b of this.balls) {
      if (b.flying) continue;
      const s = this.side(b.owner);
      if (s.held?.ball === b) continue;
      const tint = this.col(b.owner);
      g.fillStyle(tint(GUM.murk), 0.35);
      g.fillEllipse(b.x, b.y + BALL_R * 0.7, BALL_R * 2.2, BALL_R * 0.9);
      oozeBlob(g, tint, b.x, b.y, BALL_R, 0.95, this.vizT, {
        seed: b.seed, squat: 0.5, wobble: 0.14,
        deep: b.hard ? GUM.solidDeep : GUM.oozeDeep,
        fill: b.hard ? GUM.solid : GUM.ooze,
        lit: b.hard ? GUM.solidLit : GUM.oozeLit,
      });
      if (b.hard) {
        for (let i = 0; i < 3; i++) {
          slimeShard(g, tint, b.x, b.y, (i / 3) * TAU + this.vizT * 0.4, BALL_R * 1.1, 0.85, { seed: i });
        }
      }
      if (b.stolen) {
        // Caught fire reads differently on the floor: a shot suspended in a bead of slime.
        g.lineStyle(1.6, tint(GUM.shine), 0.8);
        g.strokeCircle(b.x, b.y, BALL_R * 0.55);
      }
      if (b.bomb) this.paintFuse(g, tint, b.x, b.y);
      drips(g, this.col(b.owner), b.x, b.y + BALL_R * 0.6, BALL_R, 2, 0.55, this.vizT, { seed: b.seed });
    }
  }

  /** One slab, wherever it is and whatever state it is in. */
  private paintSlab(g: Phaser.GameObjects.Graphics, sl: Slab): void {
    const held = this.side(sl.owner).held?.slab === sl;
    const life = held || sl.hard
      ? 1 : Phaser.Math.Clamp((sl.until - this.now) / 1600, 0.25, 1);
    oobleckSlab(g, this.col(sl.owner), sl.x, sl.y, sl.ang, SLAB_LEN, SLAB_THICK, 1, this.vizT, {
      seed: sl.seed, hard: sl.hard, life, held,
      stuck: sl.stuck.map((q) => ({
        along: q.along, across: q.across, seed: q.seed,
        life: Phaser.Math.Clamp((q.until - this.now) / SLAB_DISSOLVE_MS, 0, 1),
      })),
    });
    // The count, as pips along the top edge — five slots, and the sixth is what breaks it.
    if (sl.hard) return;
    const c = Math.cos(sl.ang);
    const s = Math.sin(sl.ang);
    for (let i = 0; i < SLAB_CATCH; i++) {
      const a = -SLAB_LEN / 2 + (SLAB_LEN * (i + 0.5)) / SLAB_CATCH;
      const px = sl.x + c * a + s * (SLAB_THICK / 2 + 6);
      const py = sl.y + s * a - c * (SLAB_THICK / 2 + 6);
      const on = i < sl.stuck.length;
      g.fillStyle(this.col(sl.owner)(on ? GUM.oozeLit : GUM.murk), on ? 0.95 : 0.5);
      g.fillCircle(px, py, on ? 2.8 : 1.8);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // Slabs that are being carried, and every hardened one — a wall has to occlude.
    for (const owner of BOTH) {
      const sl = this.side(owner).slab;
      if (!sl) continue;
      if (sl.hard || this.side(owner).held?.slab === sl) this.paintSlab(g, sl);
    }

    // Zip-lines, hung across the room. On the air layer because they are overhead — the player
    // has to read them as something to reach up and catch rather than a stripe on the floor.
    for (const z of this.zips) {
      const lit = !!this.sides.player.riding && Math.abs(this.sides.player.riding.y - z.y) < 2;
      zipLine(g, this.pcol, this.left, this.right, z.y, lit ? 1 : 0.72, this.vizT,
        { seed: z.seed, lit });
    }

    // Beacons, and anything currently in flight or in a hand.
    for (const pd of this.puddles) {
      const s = this.side(pd.owner);
      const carried = s.held?.kind === 'puddle' && s.held.puddle === pd;
      if (pd.beacon) {
        const active = this.now < pd.activeUntil
          ? Phaser.Math.Clamp((pd.activeUntil - this.now) / 800, 0, 1) : 0;
        slimeBeacon(g, this.col(pd.owner), pd.x, pd.y, BEACON_R, 1, this.vizT, {
          seed: pd.seed, heal: pd.kind === 'heal',
          charge: pd.shake / BEACON_MAX_ACTIVE_MS,
          active, auraR: BEACON_AURA_R,
        });
      } else if (carried || pd.flying) {
        // A puddle off the ground is a sagging sack of slime, not a disc.
        oozeBlob(g, this.col(pd.owner), pd.x, pd.y, pd.r * 0.44, 0.95, this.vizT, {
          seed: pd.seed, squat: 0.6, wobble: 0.22,
          deep: pd.kind === 'heal' ? GUM.gumDeep : GUM.oozeDeep,
          fill: pd.kind === 'heal' ? GUM.gum : GUM.ooze,
          lit: pd.kind === 'heal' ? GUM.gumLit : GUM.oozeLit,
        });
        drips(g, this.col(pd.owner), pd.x, pd.y + pd.r * 0.3, pd.r * 0.7, 3, 0.7, this.vizT,
          { seed: pd.seed, color: pd.kind === 'heal' ? GUM.gum : GUM.ooze });
      }
    }

    // The extra shell Bubble Bloat grew, drawn under the gum shell it is wrapped around.
    for (const [victim, bl] of this.bloat) {
      if (!this.alive(victim) || bl.layers < BLOAT_MIN_LAYERS) continue;
      bloatShell(g, this.col(bl.owner), victim.x, victim.y, this.bloatRadius(bl.layers),
        bl.layers, 0.95, this.vizT, { hard: this.encased.get(victim)?.hard ?? false });
    }

    // Thrown balls, stretched along their own flight.
    for (const b of this.balls) {
      if (!b.flying) continue;
      const tint = this.col(b.owner);
      const ang = Math.atan2(b.vy, b.vx);
      const stretch = Math.min(1.7, 1 + Math.hypot(b.vx, b.vy) / 1400);
      // A tail of ooze, so a fast ball reads as thrown rather than floating.
      for (let i = 1; i <= 4; i++) {
        const d = i * 9 * stretch;
        g.fillStyle(tint(b.hard ? GUM.solid : GUM.ooze), 0.4 - i * 0.07);
        g.fillCircle(b.x - Math.cos(ang) * d, b.y - Math.sin(ang) * d, BALL_R * (1 - i * 0.16));
      }
      oozeBlob(g, tint, b.x, b.y, BALL_R, 1, this.vizT * 3, {
        seed: b.seed, squat: 0, wobble: 0.2,
        deep: b.hard ? GUM.solidDeep : GUM.oozeDeep,
        fill: b.hard ? GUM.solid : GUM.ooze,
        lit: b.hard ? GUM.solidLit : GUM.oozeLit,
      });
      if (b.hard) {
        for (let i = 0; i < 4; i++) {
          slimeShard(g, tint, b.x, b.y, ang + (i / 4) * TAU, BALL_R * 1.2, 0.9, { seed: i + b.seed });
        }
      }
      if (b.bomb) this.paintFuse(g, tint, b.x, b.y);
    }

    // Gum bubbles.
    for (const b of this.bubbles) {
      gumBubble(g, this.col(b.owner), b.x, b.y, BUBBLE_R, 1, this.vizT, { seed: b.seed });
    }

    // Shells around anyone encased.
    for (const [victim, enc] of this.encased) {
      if (!this.alive(victim)) continue;
      gumShell(g, this.col(enc.owner), victim.x, victim.y, 27, 0.9, this.vizT,
        { hard: enc.hard, seed: 6 });
      // A countdown ring, so "when does this end" is a shape rather than a guess.
      const left = Phaser.Math.Clamp((enc.until - this.now) / ENCASE_MS, 0, 1);
      g.lineStyle(2.4, this.col(enc.owner)(enc.hard ? GUM.solidLit : GUM.gumLit), 0.9);
      g.beginPath();
      g.arc(victim.x, victim.y, 31, -Math.PI / 2, -Math.PI / 2 + TAU * left, false);
      g.strokePath();
    }

    // Bodies glued to a wall.
    for (const [victim, st] of this.stuckUntil) {
      if (!this.alive(victim)) continue;
      const tint = this.col(st.owner);
      const left = Phaser.Math.Clamp((st.until - this.now) / WALL_STUCK_MS, 0, 1);
      g.fillStyle(tint(GUM.gumDeep), 0.5 * left);
      g.fillEllipse(victim.x, victim.y, 62, 62);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.lineStyle(2.6, tint(GUM.gum), 0.8 * left);
        g.lineBetween(victim.x, victim.y,
          victim.x + Math.cos(a) * 30, victim.y + Math.sin(a) * 30);
      }
    }

    // Shards in the air. Sparks are the same shape struck off stone: shorter, greyer, weaker.
    for (const sh of this.shards) {
      slimeShard(g, this.col(sh.owner), sh.x, sh.y, Math.atan2(sh.vy, sh.vx),
        sh.spark ? 9 : 15, 0.95,
        sh.spark
          ? { seed: sh.seed, deep: GUM.stoneDeep, fill: GUM.stone, lit: GUM.stoneLit }
          : { seed: sh.seed });
    }

    // Whatever is sitting in a body being digested.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!s.lodged || !this.alive(f)) continue;
      const left = Phaser.Math.Clamp((s.lodged.digestAt - this.now) / DIGEST_MS, 0, 1);
      const wobble = Math.sin(this.vizT * 9) * 2;
      g.fillStyle(this.col(owner)(GUM.murk), 0.75 * left);
      g.fillCircle(f.x + wobble, f.y + 2, 7 * left + 2);
      g.lineStyle(2, this.col(owner)(GUM.shine), 0.85);
      g.beginPath();
      g.arc(f.x, f.y, 22, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - left), false);
      g.strokePath();
    }

    // The armed swell: a rim around a body that has opened up.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!s.swollen || !this.alive(f)) continue;
      g.lineStyle(2.6, this.col(owner)(GUM.oozeLit), 0.5 + 0.3 * Math.sin(this.vizT * 5));
      g.strokeCircle(f.x, f.y, 32 + Math.sin(this.vizT * 5) * 2);
    }
  }

  /**
   * The tell that a slimeball is a Slime Bomb: a dark core with a ring pulsing out of it. Drawn
   * on both the resting and the flying ball, because the whole risk of the upgrade is that you
   * are picking up something that goes off.
   */
  private paintFuse(g: Phaser.GameObjects.Graphics, tint: GumColorFn, x: number, y: number): void {
    const pulse = (this.vizT * 1.6) % 1;
    g.fillStyle(tint(GUM.murk), 0.85);
    g.fillCircle(x, y, BALL_R * 0.38);
    g.fillStyle(tint(GUM.oozeLit), 0.9);
    g.fillCircle(x, y, BALL_R * 0.18);
    g.lineStyle(1.6, tint(GUM.shine), 0.8 * (1 - pulse));
    g.strokeCircle(x, y, BALL_R * (0.4 + pulse * 0.8));
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const p = this.api.player;

    const handless = this.now < s.handBackAt;
    const holding = s.held?.kind === 'body' ? 'a body'
      : s.held?.kind === 'puddle' ? (s.held.puddle?.beacon ? 'a beacon' : 'a puddle')
        : s.held?.kind === 'ball' ? (s.held.ball?.stolen ? 'a caught shot' : 'a slimeball')
          : null;
    this.api.setStatusIndicator('gum-hand', playerIs ? {
      name: handless ? 'No Hand' : s.riding ? 'Zipping' : holding ? 'Carrying'
        : s.anchored ? 'Gripping' : 'Stretchy Hand',
      emoji: handless ? '🫠' : s.riding ? '🪢' : holding ? '🫳' : s.anchored ? '✊' : '🖐',
      color: handless ? GUM.solidLit : s.anchored || s.riding ? GUM.shine : GUM.oozeLit,
      priority: handless ? 2 : 140,
      description: handless
        ? 'Solidify threw your hand away. Until it grows back you cannot grip, grab, punch or move a single pixel.'
        : s.riding
          ? 'Hanging off a zip-line. It hauls you flat across the room the way you set off and does not stop until you hit a wall or let go — the one time this element moves without you dragging it.'
          : holding
            ? `The hand is full — it is carrying ${holding}, so it cannot take your weight. Let go to ${s.held?.puddle?.beacon ? 'set it down' : 'throw'}.`
            : s.anchored
              ? `Gripping ${s.anchorWall ? 'a wall' : 'the floor'}. Move the mouse and the arm hauls your body the other way; a wall pulls harder than the ground. Wind too far past the grip and it tears loose.`
              : 'You have no legs. Hold Click on the floor or a wall to grip it, then drag the mouse to haul yourself along — everything else the hand does costs you the ability to move while you do it.',
      until: handless ? s.handBackAt : undefined,
    } : null);

    this.api.setStatusIndicator('gum-shard', playerIs && this.hasShardHand('player') ? {
      name: 'Hand of Stone', emoji: '🪨', color: GUM.stoneLit, priority: 134,
      description: `Solidify set your hand instead of shattering it. Punches hit for ${PUNCH_DAMAGE + SHARD_PUNCH_BONUS} and passing smacks for ${SMACK_DAMAGE + SHARD_SMACK_BONUS}, everything it brushes past turns glassy on contact, and riding a zip-line with it throws sparks in every direction.`,
      until: s.shardUntil,
    } : null);

    const beaconHeld = s.held?.kind === 'puddle' && s.held.puddle?.beacon ? s.held.puddle : null;
    const mud = this.puddles.filter((pd) => pd.owner === 'player');
    const lit = mud.filter((pd) => pd.beacon && this.now < pd.activeUntil).length;
    this.api.setStatusIndicator('gum-puddles', playerIs && mud.length > 0 ? (beaconHeld ? {
      name: 'Shaking a Beacon', emoji: '🫨', color: beaconHeld.kind === 'heal' ? GUM.gumLit : GUM.oozeLit,
      priority: 135,
      description: `Whip the hand back and forth to wind it up, then let go to set it down — it runs its aura for exactly as long as you shook it, up to ${BEACON_MAX_ACTIVE_MS / 1000} seconds. ${beaconHeld.kind === 'heal' ? 'Pink: it heals you while you stand in it.' : 'Green: it slows anyone inside it.'}`,
      count: Math.round(beaconHeld.shake / 100) / 10, suffix: 's',
    } : {
      name: lit > 0 ? 'Beacons Lit' : 'Slime on the Floor', emoji: lit > 0 ? '📡' : '🟩',
      color: lit > 0 ? GUM.stoneLit : GUM.ooze, priority: 136,
      description: `Your puddles. Green ones slow anyone standing in them, and the longer they stay the worse it gets; pink ones feed you the same way. The hand can pick any of them up and lob them somewhere better, and Solidify sets them into beacons that emit an aura once you have shaken them awake.`,
      count: mud.length, suffix: `/${PUDDLE_MAX}`,
    }) : null);

    const mine = this.balls.filter((b) => b.owner === 'player' && !b.flying).length;
    this.api.setStatusIndicator('gum-balls', playerIs && mine > 0 ? {
      name: 'Slimeballs', emoji: '🟢', color: GUM.ooze, priority: 141,
      description: `Lying on the floor waiting to be picked up. A thrown one is ${BALL_DAMAGE} damage and a ${Math.round((1 - BALL_SLOW_MULT) * 100)}% slow for 3 seconds; one that misses lands and can be thrown again. Solidify hardens them to ${BALL_HARD_DAMAGE} and makes them shatter on walls.`,
      count: mine, suffix: `/${BALL_MAX}`,
    } : null);

    this.api.setStatusIndicator('gum-ooze', playerIs && (s.swollen || s.lodged) ? (s.lodged ? {
      name: 'Digesting', emoji: '🍽', color: GUM.shine, priority: 132,
      description: 'Something is breaking down inside you. When it finishes you are healed for exactly the damage it never got to do.',
      count: s.lodged.damage, until: s.lodged.digestAt,
    } : {
      name: 'Oozorbtion', emoji: '🫧', color: GUM.oozeLit, priority: 133,
      description: `Swollen by ${Math.round((OOZE_SWELL - 1) * 100)}% and open. The next attack that reaches you is swallowed instead of landing — bigger body, bigger target, until something is caught.`,
      until: s.absorbUntil,
    }) : null);

    // Victim side: what the opposing slime has done to us.
    const encased = p ? this.encased.get(p) : undefined;
    this.api.setStatusIndicator('gum-encased', encased && encased.owner === 'npc' ? {
      name: 'Encased', emoji: '🩷', color: encased.hard ? GUM.solidLit : GUM.gum, priority: 3,
      description: `Sealed in gum: badly slowed, and light enough for a slime's hand to pick you up and throw you at a wall.${encased.hard ? ' Hardened — it lasts longer and bursts into shards when you land.' : ''}`,
      until: encased.until,
    } : null);

    const stuck = p ? this.stuckUntil.get(p) : undefined;
    this.api.setStatusIndicator('gum-stuck', stuck && this.now < stuck.until ? {
      name: 'Stuck to the Wall', emoji: '🧱', color: GUM.gumLit, priority: 1,
      description: 'Thrown into a wall and glued there by the gum around you. You cannot move until it gives.',
      until: stuck.until,
    } : null);

    const bl = p ? this.bloat.get(p) : undefined;
    this.api.setStatusIndicator('gum-bloat', bl && bl.owner === 'npc' && bl.layers >= BLOAT_MIN_LAYERS ? {
      name: 'Bloated', emoji: '🎈', color: GUM.gum, priority: 2,
      description: `A second, much larger bubble has grown around the gum — one layer per gumball that caught you. Touch any wall and it bursts for ${(this.encased.get(p)?.hard ? BLOAT_HARD_DAMAGE : BLOAT_DAMAGE) * bl.layers} damage. Stay off the walls.`,
      count: bl.layers,
    } : null);

    // ── Mastery ──
    const lings = this.lingsAlive('player');
    this.api.setStatusIndicator('gum-split', playerIs && lings.length > 0 ? {
      name: 'Split', emoji: '🟢', color: GUM.solidLit, priority: 131,
      description: `You were killed and came apart instead. ${SPLIT_COUNT} slimelings of ${SPLIT_HP} HP each, one shared hand, and the hindmost one takes every hit — you are only really dead when the last of them is gone. Each of them can swallow its own projectile.`,
      count: lings.length, suffix: `/${SPLIT_COUNT}`,
    } : null);

    const slab = s.slab;
    this.api.setStatusIndicator('gum-slab', playerIs && slab ? (slab.hard ? {
      name: 'Oobleck Wall', emoji: '🧱', color: GUM.solidLit, priority: 137,
      description: 'Solidify set the slab. It now blocks every projectile with no limit at all — yours included — and neither of you can walk through it. It is no longer cover; it is a wall across the room.',
      until: slab.until,
    } : {
      name: 'Oobleck', emoji: '🛡', color: GUM.oozeLit, priority: 138,
      description: `A slab of half-set slime. Shots stick in it and dissolve out over ${SLAB_DISSOLVE_MS / 1000}s; a sixth while all ${SLAB_CATCH} are full bursts it into two puddles. Anyone who walks through it is Oobleck-slowed for ${OOBLECK_EFFECT_MS / 1000}s. Hold Click on it to carry it, let go to set it down — and Solidify turns it into a wall.`,
      count: slab.stuck.length, suffix: `/${SLAB_CATCH}`,
    }) : null);

    const ooze = p ? this.oobleckRamp(p) : 0;
    const oozeEntry = p ? this.oobleck.get(p) : undefined;
    this.api.setStatusIndicator('gum-oobleck', ooze > 0 && oozeEntry?.owner === 'npc' ? {
      name: 'Oobleck', emoji: '🫧', color: GUM.ooze, priority: 5,
      description: `You walked through a slime slab and it is still on you. The slow gets worse the whole time it runs — down to ${Math.round(OOBLECK_SLOW_FLOOR * 100)}% speed in the last moment before it lets go. Getting out of the slab did nothing; there is only waiting.`,
      count: Math.round((1 - (1 - OOBLECK_SLOW_FLOOR) * ooze) * 100), suffix: '% spd',
      until: oozeEntry.until,
    } : null);

    // Your own slime never mires you, so this only ever fires for the other side's puddles.
    const soak = p ? (this.slowSoak.get(p) ?? 0) : 0;
    this.api.setStatusIndicator('gum-mire', soak > 0.02 ? {
      name: 'Miring', emoji: '🥾', color: GUM.oozeDeep, priority: 4,
      description: `You are sinking into slime. The longer you stand in it the slower you get — down to ${Math.round(PUDDLE_SLOW_FLOOR * 100)}% speed — and it only drains back off once you are out of the puddle.`,
      count: Math.round(soak * 100), suffix: '%',
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /**
   * Slime never uses the walk speed for its own movement — the drag applies this itself — but a
   * slime that has been slimed, gummed or stuck still has to feel it, and so does anyone the
   * opposing slime has caught.
   */
  getPlayerSpeedMult(): number {
    return this.speedMultFor(this.api.player);
  }

  getNpcSpeedMult(): number {
    let m = this.speedMultFor(this.api.npc);
    if (this.isGum('npc')) m *= this.haulMult();
    return m;
  }

  /** True while the bot has no hand — every button it presses would be refused. */
  isHandless(owner: Owner): boolean {
    return this.now < this.side(owner).handBackAt;
  }

  /** Resting slimeballs the bot could pick up and throw. Its whole reason to press Click. */
  ballsReady(owner: Owner): number {
    return this.balls.filter((b) => b.owner === owner && !b.flying).length;
  }

  /** True while the bot has already opened up and is waiting for something to swallow. */
  isAbsorbArmed(owner: Owner): boolean {
    const s = this.side(owner);
    return this.now < s.absorbUntil || !!s.lodged;
  }

  /** True while the bot's target is already gummed — a second barrage would be wasted. */
  isTargetEncased(owner: Owner): boolean {
    for (const t of this.targetsOf(owner)) {
      if (this.encased.has(t)) return true;
    }
    return false;
  }

  // ── Mastery (read by ArenaScene / the AI) ──────────────────────────────────

  /**
   * The opportunity the mastery creates, published for `doGumAbilities`: the bot has a soft slab
   * standing on the field, and Solidify turns it into a wall. The geometry and the upgrade checks
   * stay here; the rotation only has to know the combo is live.
   */
  npcSlabSoft(): boolean {
    const sl = this.sides.npc.slab;
    return !!sl && !sl.hard;
  }

  /** Which slot the bot gave up for Oobleck, so its base rotation can skip that key. */
  npcOobleckSlot(): 'e' | 'r' | 'f' | undefined {
    return this.oobleckSlot('npc') ?? undefined;
  }

  /**
   * The mastery card. A slab that is out counts its own life down — the cooldown is not what the
   * player is waiting on while one is standing — and the cooldown afterwards.
   */
  getOobleckCooldownRatio(time: number): number {
    const s = this.sides.player;
    if (s.slab) {
      const held = s.held?.slab === s.slab;
      return held ? 1 : Phaser.Math.Clamp((s.slab.until - time) / OOBLECK_MS, 0, 1);
    }
    return Phaser.Math.Clamp((time - s.oobleckCastAt) / OOBLECK_COOLDOWN_MS, 0, 1);
  }
}
