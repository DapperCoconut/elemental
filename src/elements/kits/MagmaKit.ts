import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  MAG, MagmaAvatar, MagmaColorFn, MagmaFx, breathCone, dragonEgg, lavaRock, magmaSaw, moltenPool,
  mortarShell, obsidianCoat, pressureGauge, scaleArmor, volcanoCone,
} from './MagmaVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';

/**
 * Magma — a test element, reachable only from a cheat-mode save for now.
 *
 * Two of its five abilities put a *pressure vessel* on the floor, and the thing that makes the
 * element what it is is that the vessels are charged by Magma's own attacks. Nothing else in
 * the game asks you to aim at your own summon. A volcano you never hit is a slow trickle of
 * lava; a volcano you stand next to and beat on with the fist erupts in six seconds and takes
 * the arena with it. The dragon egg is the same bargain at ten times the price: 250 pressure,
 * paid for out of your own damage output, for twenty seconds of being something else entirely.
 *
 * So every damage source below routes through one chokepoint — `feed` — and the question
 * "does this hurt them or does it charge me" is answered per-object, not per-ability.
 */

const ARENA_PAD = 32;

// ── Plume (Click) ────────────────────────────────────────────────────────────
const PLUME_COUNT = 5;
/** Gap between one lob and the next. Short enough to read as one burst. */
const PLUME_GAP_MS = 85;
const PLUME_FLIGHT_MS = 260;
const PLUME_MIN_DIST = 38;
const PLUME_MAX_DIST = 118;
/** Half-angle of the fan the five pools are thrown into. */
const PLUME_SPREAD = 0.62;
const POOL_R = 27;
const POOL_LIFE_MS = 6000;
const POOL_DPS = 34;
/** How fast a pool charges a vessel it is sitting on. */
const POOL_FEED_PER_S = 16;
const MAX_POOLS = 44;

/**
 * Overlapping pools are a *wider* trap, not a hotter one: burn is taken as a maximum across
 * every pool touching a body rather than a sum. Five pools stacked on one tile would otherwise
 * delete anyone who walked through them.
 */

// ── Volcano (E) ──────────────────────────────────────────────────────────────
const VOLCANO_MAX = 100;
const VOLCANO_LIFE_MS = 18000;
const VOLCANO_R = 30;
/** Two at once. A third would make the pressure economy trivial. */
const MAX_VOLCANOES = 2;
const VOLC_PUDDLE_SLOW_MS = 2600;
const VOLC_PUDDLE_FAST_MS = 700;
/** Pressure at which a volcano starts throwing rock as well as lava. */
const VOLC_ROCK_AT = 0.35;
const VOLC_ROCK_SLOW_MS = 1500;
const VOLC_ROCK_FAST_MS = 420;
/** The final show: rock in every direction, then the cone comes down. */
const VOLC_BLOW_MS = 5000;
const VOLC_BLOW_ROCK_MS = 130;
const VOLC_COLLAPSE_R = 150;
const VOLC_COLLAPSE_DMG = 60;

const ROCK_SPEED = 215;
const ROCK_DMG = 12;
const ROCK_LIFE_MS = 2600;
const ROCK_HIT_R = 22;
const ROCK_FEED = 10;
const MAX_ROCKS = 70;

// ── Magma Bloat (R) ──────────────────────────────────────────────────────────
const BLOAT_MS = 10000;
const BLOAT_DMG = 30;
const BLOAT_R = 96;
const BLOAT_FEED = 25;

// ── Magma Jet (F) ────────────────────────────────────────────────────────────
/**
 * The jet is the only ability in the kit that moves you, and it moves you *backwards*: the
 * flame goes at the cursor and you go away from it. That makes aiming and retreating the same
 * action, and makes the ability as much a disengage as an attack.
 */
const JET_MAX_MS = 3000;
const JET_PUSH = 330;
const JET_RANGE = 175;
const JET_HALF = 0.42;
const JET_TICK_MS = 150;
const JET_TICK_DMG = 12;
const JET_FEED_PER_S = 26;
/** How long the npc holds the throttle down for in one burst. */
const NPC_JET_MS = 1300;

// ── Jet Slam (F+) ────────────────────────────────────────────────────────────
/** How close to a wall counts as hitting it. A fighter's own body radius, roughly. */
const SLAM_WALL_PAD = 8;
const SLAM_COOLDOWN_MS = 2000;
const SLAM_ROCKS = 12;
const SLAM_ROCK_DMG = 18;
const SLAM_SELF_DMG = 15;
const SLAM_SPREAD = 130;

// ── Mag-Mortar (Click+) ──────────────────────────────────────────────────────
const MORTAR_IMPACT_DMG = 10;
const MORTAR_IMPACT_R = 44;

// ── Supercritical (E+) ───────────────────────────────────────────────────────
/** How much overfill a critical volcano will take before it simply stops accepting more. */
const OVERFILL_MAX = 250;
const OVERFILL_DMG_PER = 0.7;
const OVERFILL_R_PER = 0.9;

// ── Bloat Bomb (R+) ──────────────────────────────────────────────────────────
/** Every point of damage swallowed while R is held is worth this much on the burst. */
const BOMB_PER_POINT = 1.5;

// ── Full Draconic (Q+) ───────────────────────────────────────────────────────
const POUND_DMG = 55;
const POUND_R = 130;
const POUND_STUN_MS = 1800;
const SCALE_MS = 4000;
const SCALE_INCOMING = 0.75;
const DRACO_DASH_DIST = 300;
const DRACO_DASH_MS = 420;
const DRACO_DASH_DMG = 45;
const DRACO_DASH_R = 46;

// ── Dragon Kin (Q) ───────────────────────────────────────────────────────────
const EGG_MAX = 250;
const EGG_LIFE_MS = 40000;
const EGG_R = 26;
const DRAGON_MS = 20000;
const DRAGON_INCOMING = 0.8;
const DRAGON_SPEED = 1.2;
/** Dragon Breath replaces the click outright while hatched. */
const BREATH_MS = 900;
const BREATH_RANGE = 210;
const BREATH_HALF = 0.44;
const BREATH_TICK_MS = 180;
const BREATH_TICK_DMG = 14;
const BREATH_FEED_PER_S = 25;

// ── Mastery: Obsidian Coat (passive) ─────────────────────────────────────────
/**
 * The passive opens the same overfill gate Supercritical (E+) opens — with the mastery on, a
 * critical volcano keeps taking pressure whether the upgrade is owned or not. What the mastery
 * adds on top is that the glass thrown by that collapse *sets on you*, if you were standing in
 * it, and how good the coat is is decided entirely by how much overfill you forced in first.
 */
const COAT_MS = 15000;
/** Overfill at which the coat is as good as it gets. Same ceiling the collapse pays out on. */
const COAT_FULL_OVER = OVERFILL_MAX;
const COAT_DMG_MIN = 0.10;
const COAT_DMG_MAX = 0.45;
const COAT_ARMOR_MIN = 0.08;
const COAT_ARMOR_MAX = 0.30;
/** Extra globs on the click, from one at the thinnest coat to four at the thickest. */
const COAT_SHOTS_MIN = 1;
const COAT_SHOTS_MAX = 4;

// ── Mastery: Magma Saw (bindable) ────────────────────────────────────────────
/** How long the key may be held for. The charge buys nothing but runtime. */
const SAW_HOLD_MAX_MS = 1600;
const SAW_MIN_MS = 2500;
/** Too hot to hold. A saw that reaches this detonates, and a full rev runs exactly to it. */
const SAW_OVERHEAT_MS = 8000;
const SAW_COOLDOWN_MS = 14000;
/** Where the saw floats, out from the caster toward the cursor, and how wide it bites. */
const SAW_HOLD_DIST = 34;
const SAW_R = 30;
/** Fast and tiny: one point per tick, twenty times a second. */
const SAW_TICK_MS = 50;
/** Every this many ms of runtime, the bite goes up by one point per tick. */
const SAW_RAMP_MS = 2000;
const SAW_DMG_MAX = 4;
const SAW_FEED_PER_S = 30;
const SAW_BLAST_DMG = 35;
const SAW_BLAST_R = 150;
const SAW_SELF_SHOVE = 190;
const SAW_ENEMY_SHOVE = 240;
/** Npc: the last moment it will decide whether to ride the saw into the blast or cut the motor. */
const NPC_SAW_COMMIT_MS = 7200;

/** Knockback is played out as a position shove — see `Shove`. */
const SHOVE_MS = 260;

// ── World objects ────────────────────────────────────────────────────────────

/**
 * One pool of lava. Lobbed rather than placed: until `landAt` it is a glob in the air and does
 * nothing, which is what stops Plume from being an instant 5-pool carpet under someone's feet.
 */
interface Pool {
  owner: Owner;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  landAt: number;
  until: number;
  seed: number;
  /**
   * Mag-Mortar (Click+) and Jet Slam (F+): damage this glob does *on landing*, before it
   * settles into an ordinary pool. 0 for a plain plume glob, which is the base ability.
   */
  impact: number;
  /** Blast radius of that impact. */
  impactR: number;
  /** Drawn as a finned shell rather than as a glob of lava. */
  shell: boolean;
  /** How long it spends in the air, so the painter can place it along its own arc. */
  flightMs: number;
}

/** A thrown chunk. `source` is the vessel that spat it, which it may never charge back. */
interface Rock {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  seed: number;
  spin: number;
  source: Vessel | null;
}

/**
 * A pressure vessel. The volcano and the egg are the same object with different numbers on it
 * and different answers to being filled — which is deliberate, because the player has to learn
 * the charging game exactly once.
 */
interface Vessel {
  owner: Owner;
  kind: 'volcano' | 'egg';
  x: number;
  y: number;
  r: number;
  pressure: number;
  max: number;
  until: number;
  seed: number;
  nextPoolAt: number;
  nextRockAt: number;
  rockAng: number;
  /** Volcano only: when the collapse lands. 0 until it tops out. */
  blowAt: number;
  /** Brief white-out after being fed, so a hit on your own summon reads as a hit. */
  flashUntil: number;
  /**
   * Supercritical (E+): pressure forced in *after* the cap, while the cone is already
   * screaming. Paid back on the collapse and nowhere else.
   */
  over: number;
}

/** A knockback in progress. Velocity is stomped every frame by both movement systems, so a
 *  shove has to be played out as position rather than handed to the physics body. */
interface Shove {
  target: Fighter;
  vx: number;
  vy: number;
  until: number;
}

interface Side {
  owner: Owner;

  // Plume
  plumeLeft: number;
  /** How many this cast is throwing in total — Obsidian Coat adds to it, so the fan must know. */
  plumeTotal: number;
  plumeNextAt: number;
  plumeAng: number;

  // Magma Bloat
  bloatUntil: number;
  savedAbsorber: ((amount: number) => boolean) | null;
  absorberInstalled: boolean;
  /** Bloat Bomb (R+): damage swallowed while R was held, waiting to be paid back. */
  bombCharge: number;
  /** Bloat Bomb (R+): whether the trigger is currently held down. */
  bombHeld: boolean;

  // Magma Jet
  /** Latest the jet may still be running. Extended while the button is held. */
  jetUntil: number;
  /** Total throttle already spent this cast, against JET_MAX_MS. */
  jetSpent: number;
  jetTickAt: number;
  /** Latched so the jet can be shut off with a puff on the frame it stops. */
  jetWasOut: boolean;
  /**
   * Mastery requirement: ground actually covered under thrust. Measured as position moved
   * between two jetting frames rather than as `JET_PUSH × dt`, so a burn spent grinding into a
   * wall banks nothing — and flushed in whole hundreds, because the alternative is a
   * localStorage write every frame the jet is open.
   */
  jetDistAcc: number;
  jetPrevX: number;
  jetPrevY: number;
  /** Jet Slam (F+): earliest the next wall impact may summon the sky. */
  slamReadyAt: number;
  /** Npc only: latest it will keep the throttle down for this burst. */
  npcJetUntil: number;

  // Dragon Kin
  dragonUntil: number;
  breathUntil: number;
  breathTickAt: number;
  /** Full Draconic (Q+): dragon scale armour, from the draconic R. */
  scaleUntil: number;
  /** Full Draconic (Q+): the draconic F's charge, played out as position. */
  dashUntil: number;
  dashAng: number;
  dashHit: Set<Fighter>;
  dashDragged: Set<Fighter>;

  // ── Mastery: Obsidian Coat ──
  coatUntil: number;
  /** 0–1, from the overfill that bought it. Decides all three halves of the buff. */
  coatPower: number;
  /**
   * The outgoing multiplier this coat has already pushed onto the Fighter. `outgoingDamageMult`
   * is shared with half the game, so the coat divides its own contribution back out rather
   * than assuming it owns the field.
   */
  coatOutApplied: number;

  // ── Mastery: Magma Saw ──
  /** When the key went down, or 0 while it is not being wound up. */
  sawHoldFrom: number;
  /** When the saw started cutting, or 0 when there is no saw out. */
  sawFrom: number;
  /** How long this saw was going to run for. `Infinity` on a replica, which is told when to stop. */
  sawPlanMs: number;
  sawTickAt: number;
  /** Cooldown clock, stamped when the motor starts. */
  sawCastAt: number;
  /** Npc only: whether this saw is meant to be ridden all the way into the blast. */
  npcSawRide: boolean;
  /** Npc only: earliest the bot may start winding another one up. */
  npcSawNextAt: number;

  /** Cursor this side is driving — the real one for the player, a phantom for the npc. */
  curX: number;
  curY: number;
  curAng: number;

}

function makeSide(owner: Owner): Side {
  return {
    owner,
    plumeLeft: 0,
    plumeTotal: PLUME_COUNT,
    plumeNextAt: 0,
    plumeAng: 0,
    bloatUntil: 0,
    savedAbsorber: null,
    absorberInstalled: false,
    bombCharge: 0,
    bombHeld: false,
    jetUntil: 0,
    jetSpent: 0,
    jetTickAt: 0,
    jetWasOut: false,
    jetDistAcc: 0,
    jetPrevX: 0,
    jetPrevY: 0,
    slamReadyAt: 0,
    npcJetUntil: 0,
    dragonUntil: 0,
    breathUntil: 0,
    breathTickAt: 0,
    scaleUntil: 0,
    dashUntil: 0,
    dashAng: 0,
    dashHit: new Set(),
    dashDragged: new Set(),
    coatUntil: 0,
    coatPower: 0,
    coatOutApplied: 1,
    sawHoldFrom: 0,
    sawFrom: 0,
    sawPlanMs: 0,
    sawTickAt: 0,
    // Absolute-clock readiness: a zero here would lock the saw for the first 14 seconds of the
    // kit's very first match, which runs the constructor rather than `reset`.
    sawCastAt: -SAW_COOLDOWN_MS,
    npcSawRide: false,
    npcSawNextAt: 0,
    curX: 0,
    curY: 0,
    curAng: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface MagmaArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Magma visual colour through that side's equipped skin. */
  magmaColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Shop upgrades on the local player. */
  hasUpgrade(slot: string): boolean;
  /** Shop upgrades on the online opponent, replayed on this victim-side sim. */
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Mastery: the enhancement bound over each of the player's slots this match. */
  masteryBindFor(slot: string): string | null;
  /** …and the opponent's, so a Nightmare bot or a remote player revs its own saw. */
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** The saw runs off a private timer, so its cast has to be broadcast by hand. */
  broadcastMasteryCast(enhId: string): void;
  get isOnline(): boolean;
}

// ── MagmaKit ─────────────────────────────────────────────────────────────────

export class MagmaKit {
  private api: MagmaArenaApi;

  // ── Visuals ──
  private readonly pcol: MagmaColorFn;
  private readonly ncol: MagmaColorFn;
  private readonly pfx: MagmaFx;
  private readonly nfx: MagmaFx;
  private playerAvatar: MagmaAvatar | null = null;
  private npcAvatar: MagmaAvatar | null = null;
  /** Lava on the floor. Under the fighters — you stand *in* it. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Things standing on the floor: vessels and flying rock. Over the fighters. */
  private objGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pressure gauges, which must clear the vessels they belong to. */
  private gaugeGfx: Phaser.GameObjects.Graphics | null = null;
  /** The fist, its arm, and the breath cone — the only things allowed over everything. */
  private fistGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private pools: Pool[] = [];
  private rocks: Rock[] = [];
  private vessels: Vessel[] = [];
  private shoves: Shove[] = [];
  /** Fractional pool damage carried between frames, per victim. */
  private burnAccum = new Map<Fighter, number>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;

  constructor(api: MagmaArenaApi) {
    this.api = api;
    this.pcol = (base) => api.magmaColor('player', base);
    this.ncol = (base) => api.magmaColor('npc', base);
    this.pfx = new MagmaFx(api.scene, this.pcol);
    this.nfx = new MagmaFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MagmaFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MagmaColorFn { return owner === 'player' ? this.pcol : this.ncol; }

  private isMagma(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'magma' : this.api.npcElementId === 'magma';
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  /** Whoever this side is aiming at. Drives the npc's phantom cursor. */
  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') {
      const p = this.api.player;
      return p && p.active && p.hp > 0 ? p : null;
    }
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return t && t.active && t.hp > 0 ? t : null;
  }

  private avatar(owner: Owner): MagmaAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private isDragon(owner: Owner): boolean {
    return this.side(owner).dragonUntil > this.now;
  }

  /** Shop upgrades, for whichever side is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** Full Draconic (Q+) is only ever in play while the dragon is out. */
  private draconic(owner: Owner): boolean {
    return this.isDragon(owner) && this.up(owner, 'q');
  }

  private vesselsOf(owner: Owner, kind?: 'volcano' | 'egg'): Vessel[] {
    return this.vessels.filter((v) => v.owner === owner && (!kind || v.kind === kind));
  }

  // ── Mastery helpers ────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking. */
  private masteryOn(owner: Owner): boolean {
    return owner === 'player' ? this.api.masteryActive
      : this.api.npcMasteryActive && this.isMagma('npc');
  }

  /** The slot Magma Saw is bound over for this side, or null when it isn't bound. */
  private sawSlot(owner: Owner): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'magma-saw') return s;
    }
    return null;
  }

  /** 0–1 while an Obsidian Coat is on this side, 0 otherwise. */
  private coatPower(owner: Owner): number {
    const s = this.side(owner);
    return s.coatUntil > this.now ? s.coatPower : 0;
  }

  /** Extra globs Obsidian Coat is adding to the click right now. */
  private coatShots(owner: Owner): number {
    const p = this.coatPower(owner);
    return p > 0 ? Math.round(COAT_SHOTS_MIN + (COAT_SHOTS_MAX - COAT_SHOTS_MIN) * p) : 0;
  }

  /** Stats are recorded unconditionally — that is how the unlock is earned in the first place. */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner !== 'player' || amount <= 0) return;
    this.api.recordMasteryStat(key, amount);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything parked on a Fighter has to be handed back, or the next match starts with a
    // permanently armoured player and an absorber pointing at a shield that no longer exists.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (f) {
        if (s.absorberInstalled) f.damageAbsorber = s.savedAbsorber;
        f.magmaIncomingMult = 1;
        // Obsidian Coat rides on the *shared* outgoing multiplier, so it has to divide its own
        // contribution back out rather than resetting the field somebody else may also own.
        if (s.coatOutApplied !== 1) f.outgoingDamageMult /= s.coatOutApplied;
        // Dragon scale clears control effects and sets Unstoppable while it runs; hand that
        // back or the next match starts with somebody who cannot be stunned.
        if (s.scaleUntil > 0) f.unstoppable = false;
      }
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.pools = [];
    this.rocks = [];
    this.vessels = [];
    this.shoves = [];
    this.burnAccum.clear();
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.objGfx?.destroy(); this.objGfx = null;
    this.gaugeGfx?.destroy(); this.gaugeGfx = null;
    this.fistGfx?.destroy(); this.fistGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'magma') return;
    // Latched before anything else: the cursor is where the fist is, and a frame that early-
    // outs on an ability still has to move the fist.
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    const s = this.sides.player;

    // Mastery: Magma Saw takes whichever slot it was bound to outright. Handled before the base
    // keys because `JustDown` consumes the flag — testing the bind afterwards eats the press.
    const saw = this.sawSlot('player');
    if (saw) {
      const key = saw === 'e' ? this.api.eKey : saw === 'r' ? this.api.rKey
        : saw === 'f' ? this.api.fKey : this.api.qKey;
      this.handleSawKey('player', key, time);
    }

    if (clicked) p.castAbility('magma-plume', ctx);
    if (saw !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('magma-volcano', ctx);
    if (saw !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('magma-bloat', ctx);
    if (saw !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('magma-jet', ctx);
    if (saw !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('magma-dragon-kin', ctx);

    // ── Held buttons ──
    // The jet burns for as long as F is down and no longer; letting go ends the burst even
    // with throttle left, which is what makes short taps a real option.
    if (s.jetUntil > this.now && !this.api.fKey.isDown) s.jetUntil = 0;
    // Bloat Bomb (R+): holding R is the whole upgrade, so the key state is read every frame
    // rather than only on the press that cast it.
    s.bombHeld = this.up('player', 'r') && this.api.rKey.isDown && s.bloatUntil > this.now;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Plume, or Dragon Breath while hatched. One ability id covers both because the two
   * are never available at the same time, and sharing the slot is the point of Dragon Kin.
   */
  doPlume(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;

    if (this.isDragon(owner)) {
      s.breathUntil = this.now + BREATH_MS;
      s.breathTickAt = 0;
      this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
      this.api.showFloatingText(f.x, f.y - 50, '🐉 BREATHE', this.hex(MAG.breath));
      return;
    }

    // Obsidian Coat (mastery) widens the fan rather than making each glob hotter — the pools
    // never stack, so the only thing extra shots can buy is more ground, which is the point.
    s.plumeTotal = PLUME_COUNT + this.coatShots(owner);
    s.plumeLeft = s.plumeTotal;
    s.plumeNextAt = this.now;
    s.plumeAng = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('sweep', s.plumeAng);
  }

  /** E — Volcano, or the draconic ground pound while Full Draconic is up. */
  doVolcano(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f) return;
    if (this.draconic(owner)) { this.doGroundPound(owner); return; }
    const mine = this.vesselsOf(owner, 'volcano');
    // Oldest goes if the pair is already out, so the ability never becomes uncastable.
    if (mine.length >= MAX_VOLCANOES) this.removeVessel(mine[0], 'crumble');

    const x = this.clampX(tx);
    const y = this.clampY(ty);
    const v: Vessel = {
      owner, kind: 'volcano', x, y, r: VOLCANO_R,
      pressure: 0, max: VOLCANO_MAX,
      until: this.now + VOLCANO_LIFE_MS,
      seed: Math.random() * 999,
      nextPoolAt: this.now + VOLC_PUDDLE_SLOW_MS,
      nextRockAt: this.now + VOLC_ROCK_SLOW_MS,
      rockAng: Math.random() * Math.PI * 2,
      blowAt: 0,
      flashUntil: 0,
      over: 0,
    };
    this.vessels.push(v);

    const fx = this.fx(owner);
    fx.shock(x, y, 8, 70, MAG.magma, 520);
    fx.smoke(x, y - 26, 6, 900);
    fx.ember(x, y - 20, 10, 26, 700);
    this.avatar(owner)?.play('slam', Math.atan2(y - f.y, x - f.x));
    this.api.showFloatingText(x, y - 74, '🌋 VOLCANO', this.hex(MAG.lava));
    this.api.scene.cameras.main.shake(160, 0.004);
  }

  /** R — Magma Bloat, or the draconic scale armour while Full Draconic is up. */
  doBloat(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    if (this.draconic(owner)) { this.doScaleArmor(owner); return; }
    s.bloatUntil = this.now + BLOAT_MS;
    this.installAbsorber(owner);
    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.setVenting(true);
    const fx = this.fx(owner);
    fx.shock(f.x, f.y, 10, 44, MAG.gold, 420);
    fx.ember(f.x, f.y - 6, 10, 30, 600);
    this.api.showFloatingText(f.x, f.y - 48, '🫧 BLOATED', this.hex(MAG.gold));
  }

  /**
   * F — Magma Jet, or the draconic charge while Full Draconic is up.
   *
   * The jet is a *held* ability: the cast opens the throttle and `handleInput` closes it the
   * moment the key comes up. Everything it does — the cone, the thrust, the charging — happens
   * in `updateJet`, so a burst can be any length between one frame and three seconds.
   */
  doJet(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    if (this.draconic(owner)) { this.doDraconicDash(owner, tx, ty); return; }
    s.jetUntil = this.now + JET_MAX_MS;
    s.jetSpent = 0;
    s.jetTickAt = 0;
    s.npcJetUntil = this.now + NPC_JET_MS;
    this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, 40, MAG.lava);
    this.api.showFloatingText(f.x, f.y - 52, '🚀 MAGMA JET', this.hex(MAG.lava));
    this.api.scene.cameras.main.shake(140, 0.004);
  }

  // ── Full Draconic (Q+) ─────────────────────────────────────────────────────

  /** The draconic E: everything under you, flattened. */
  private doGroundPound(owner: Owner): void {
    const f = this.fighter(owner);
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, POUND_R * 0.8, MAG.scaleLit);
    fx.shock(f.x, f.y, 24, POUND_R, MAG.scale, 640);
    fx.smoke(f.x, f.y, 8, 900);
    this.avatar(owner)?.play('slam');
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > POUND_R) continue;
      t.takeDamage(POUND_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.scaleLit));
      if (!t.unstoppable) {
        t.earthStunnedUntil = Math.max(t.earthStunnedUntil, this.now + POUND_STUN_MS);
        t.applyDisarm(POUND_STUN_MS);
      }
      this.shove(t, Math.atan2(t.y - f.y, t.x - f.x), 70);
      this.api.showFloatingText(t.x, t.y - 44, `🐲 ${POUND_DMG} — STUNNED`, this.hex(MAG.scaleLit));
    }
    // It is an attack like every other, so it charges whatever is standing in the crater.
    this.feed(owner, f.x, f.y, POUND_R, 40);
    this.api.scene.cameras.main.shake(320, 0.009);
  }

  /** The draconic R: four seconds of nothing being allowed to stick to you. */
  private doScaleArmor(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.scaleUntil = this.now + SCALE_MS;
    this.avatar(owner)?.play('flex');
    const fx = this.fx(owner);
    fx.shock(f.x, f.y, 16, 70, MAG.scaleLit, 560);
    fx.ember(f.x, f.y - 6, 12, 34, 700, MAG.scaleLit);
    this.api.showFloatingText(f.x, f.y - 52, '🐲 DRAGON SCALE', this.hex(MAG.scaleLit));
  }

  /** The draconic F: a charge that takes everyone it passes with it. */
  private doDraconicDash(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.dashAng = Math.atan2(ty - f.y, tx - f.x);
    s.dashUntil = this.now + DRACO_DASH_MS;
    s.dashHit.clear();
    s.dashDragged.clear();
    this.avatar(owner)?.play('punch', s.dashAng);
    this.fx(owner).erupt(f.x, f.y, 50, MAG.scale);
    this.api.showFloatingText(f.x, f.y - 52, '🐲 CHARGE', this.hex(MAG.scaleLit));
    this.api.scene.cameras.main.shake(220, 0.006);
  }

  /**
   * The charge, played out as position. Anyone it catches is pinned to the dragon's flank and
   * carried for the rest of it, which is the point — it is a relocation as much as a hit.
   */
  private updateDraconicDash(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    if (s.dashUntil <= time) return;
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.dashUntil = 0; return; }

    const step = (DRACO_DASH_DIST / (DRACO_DASH_MS / 1000)) * dt;
    const nx = this.clampX(f.x + Math.cos(s.dashAng) * step);
    const ny = this.clampY(f.y + Math.sin(s.dashAng) * step);
    const dx = nx - f.x;
    const dy = ny - f.y;
    f.setPosition(nx, ny);
    this.fx(owner).ember(f.x, f.y, 3, 18, 360, MAG.scaleLit);

    for (const t of this.targetsOf(owner)) {
      if (s.dashDragged.has(t)) {
        // Already hooked: they come along, wherever the dragon goes.
        t.setPosition(this.clampX(t.x + dx), this.clampY(t.y + dy));
        continue;
      }
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > DRACO_DASH_R) continue;
      s.dashDragged.add(t);
      if (s.dashHit.has(t)) continue;
      s.dashHit.add(t);
      t.takeDamage(DRACO_DASH_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.scale));
      this.fx(owner).erupt(t.x, t.y, 40, MAG.scaleLit);
      this.api.showFloatingText(t.x, t.y - 44, `🐲 ${DRACO_DASH_DMG}`, this.hex(MAG.scaleLit));
    }
  }

  /** Q — Dragon Kin. */
  doDragonKin(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f) return;
    // Full Draconic: the ultimate is simply unavailable for its own twenty seconds.
    if (this.draconic(owner)) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 52, '🐲 ALREADY THE DRAGON', '#8a8a8a');
      }
      return;
    }
    for (const old of this.vesselsOf(owner, 'egg')) this.removeVessel(old, 'crumble');

    const x = this.clampX(tx);
    const y = this.clampY(ty);
    this.vessels.push({
      owner, kind: 'egg', x, y, r: EGG_R,
      pressure: 0, max: EGG_MAX,
      until: this.now + EGG_LIFE_MS,
      seed: Math.random() * 999,
      nextPoolAt: Infinity,
      nextRockAt: Infinity,
      rockAng: 0,
      blowAt: 0,
      flashUntil: 0,
      over: 0,
    });

    const fx = this.fx(owner);
    fx.shock(x, y, 8, 90, MAG.scale, 620);
    fx.ember(x, y - 16, 14, 34, 900, MAG.scaleLit);
    this.avatar(owner)?.play('raise');
    this.api.showFloatingText(x, y - 60, '🥚 DRAGON KIN', this.hex(MAG.scaleLit));
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'magma';
    const npcIs = this.api.npcElementId === 'magma';
    if (!playerIs && !npcIs) return;

    const dt = delta / 1000;
    this.vizT += dt;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      this.advanceCursor(owner, dt);
      this.firePlume(owner, time);
      this.updateBloat(owner, time);
      this.updateJet(owner, time, dt, delta);
      this.updateDraconicDash(owner, time, dt);
      this.updateBreath(owner, time, dt);
      this.updateSaw(owner, time, dt);
      this.updateDragon(owner, time);
      this.updateScale(owner, time);
      // After `updateDragon`, which owns `magmaIncomingMult` and folds the coat's armour into it.
      this.updateCoat(owner, time);
    }
    this.updateNpcSaw(time);

    this.updatePools(time, dt);
    this.updateVessels(time, dt);
    this.updateRocks(time, dt);
    this.updateShoves(dt);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintObjects(time);
    this.paintGauges();
    this.paintJets(time);
    this.paintHud(playerIs, time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.objGfx) this.objGfx = scene.add.graphics().setDepth(6);
    if (!this.gaugeGfx) this.gaugeGfx = scene.add.graphics().setDepth(8);
    if (!this.fistGfx) this.fistGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /**
   * The npc has no mouse, so it gets a phantom one. Everything the element does is aimed with
   * that cursor, so this is the whole of the AI's aim: pools and summons go near the target,
   * and a running jet is pointed dead at whatever it wants to burn — which, because the jet
   * shoves you the other way, is also how the AI kites.
   */
  private advanceCursor(owner: Owner, dt: number): void {
    const s = this.side(owner);
    if (owner === 'player') {
      s.curX = this.aimX;
      s.curY = this.aimY;
      return;
    }

    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const target = this.enemyOf(owner);

    // A running saw points dead at whatever it is cutting, with no loiter on it — a melee tool
    // orbiting its own target would simply miss. A critical cone of its own within reach wins:
    // sawing that is how the bot ever earns an Obsidian Coat.
    if (s.sawFrom > 0) {
      const cone = this.vesselsOf(owner, 'volcano')
        .find((v) => v.blowAt > 0 && v.over < OVERFILL_MAX
          && Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y) < SAW_HOLD_DIST + SAW_R);
      const at = cone ?? target;
      if (at) {
        s.curX = this.clampX(at.x);
        s.curY = this.clampY(at.y);
        return;
      }
    }
    // What the flame is being pointed at. A vessel of its own that still has room in it and is
    // in range outranks the player — burning your own summon is the element, and an AI that
    // never did it would never reach a collapse or a hatch.
    const vessel = this.vesselsOf(owner)
      .filter((v) => v.pressure < v.max
        && Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y) < JET_RANGE)
      .sort((a, b) => (b.kind === 'egg' ? 1 : 0) - (a.kind === 'egg' ? 1 : 0))[0];
    const jetting = s.jetUntil > this.now;
    const focus = jetting && vessel ? vessel : target;
    const tx = focus ? focus.x : f.x;
    const ty = focus ? focus.y : f.y;

    if (jetting && focus) {
      // Straight at it. No orbit — the jet is a held beam, and wobbling it just wastes fuel.
      s.curX = this.clampX(tx);
      s.curY = this.clampY(ty);
      return;
    }

    // No jet out: loiter around whatever it is aiming at.
    s.curAng += dt * 2.2;
    s.curX = this.clampX(tx + Math.cos(s.curAng) * 46);
    s.curY = this.clampY(ty + Math.sin(s.curAng) * 46 * 0.8);
  }

  // ── Pressure ───────────────────────────────────────────────────────────────

  /**
   * The one place pressure is ever added. Everything Magma does that hurts anybody passes
   * through here first with the same geometry it used for damage, which is what makes "all of
   * magma's attacks charge it" true rather than a list of special cases.
   *
   * Returns the vessels that were actually fed, so a rock can die on the thing it charged.
   */
  private feed(owner: Owner, x: number, y: number, radius: number, amount: number, except?: Vessel | null): Vessel[] {
    const hit: Vessel[] = [];
    // Ruin's Combo Breaker halves every meter in the game, and every pressure bar on the board
    // is fed through here — one wrap covers the lot.
    amount = meterGain(this.fighter(owner), amount);
    for (const v of this.vessels) {
      if (v.owner !== owner || v === except) continue;
      if (Phaser.Math.Distance.Between(x, y, v.x, v.y) > radius + v.r) continue;

      // Supercritical (E+): a critical volcano keeps taking pressure, and everything past the
      // cap is banked as overfill instead — the one place in the kit where a full vessel is
      // still worth hitting. Obsidian Coat (mastery) opens exactly the same gate, because the
      // coat is *paid for* in overfill and a passive nobody can use without owning a shop
      // upgrade first would not be a passive at all.
      if (v.pressure >= v.max) {
        if ((!this.up(owner, 'e') && !this.masteryOn(owner))
          || v.kind !== 'volcano' || v.blowAt <= 0) continue;
        if (v.over >= OVERFILL_MAX) continue;
        const gained = Math.min(amount, OVERFILL_MAX - v.over);
        if (gained <= 0) continue;
        const wasWhole = Math.floor(v.over);
        v.over += gained;
        hit.push(v);
        v.flashUntil = this.now + 110;
        if (Math.floor(v.over) > wasWhole) {
          this.fx(owner).ember(v.x + (Math.random() - 0.5) * v.r, v.y - v.r * 0.5, 1, 10, 420,
            MAG.white);
        }
        continue;
      }
      const before = v.pressure;
      v.pressure = Math.min(v.max, v.pressure + amount);
      if (v.pressure === before) continue;
      hit.push(v);
      v.flashUntil = this.now + 110;
      // A whole point of pressure is worth a spark; a fractional tick is not.
      if (Math.floor(v.pressure) > Math.floor(before)) {
        this.fx(owner).ember(v.x + (Math.random() - 0.5) * v.r, v.y - v.r * 0.5, 1, 8, 420,
          v.kind === 'egg' ? MAG.scaleLit : MAG.ember);
      }
      if (v.pressure >= v.max && before < v.max) this.onVesselFull(v);
    }
    return hit;
  }

  /** A vessel has topped out. The volcano starts its countdown; the egg hatches on the spot. */
  private onVesselFull(v: Vessel): void {
    const fx = this.fx(v.owner);
    if (v.kind === 'volcano') {
      v.blowAt = this.now + VOLC_BLOW_MS;
      v.until = v.blowAt + 1;
      v.nextRockAt = this.now;
      fx.erupt(v.x, v.y - v.r, 60, MAG.gold);
      this.api.showFloatingText(v.x, v.y - 78, '🌋 CRITICAL', this.hex(MAG.white));
      this.api.scene.cameras.main.shake(240, 0.006);
    } else {
      this.hatch(v);
    }
  }

  private hatch(v: Vessel): void {
    const s = this.side(v.owner);
    const f = this.fighter(v.owner);
    s.dragonUntil = this.now + DRAGON_MS;
    this.vessels = this.vessels.filter((o) => o !== v);

    const fx = this.fx(v.owner);
    fx.erupt(v.x, v.y, 110, MAG.scale);
    fx.ember(v.x, v.y, 24, 90, 1100, MAG.scaleLit);
    fx.shock(v.x, v.y, 20, 170, MAG.scaleLit, 700);
    if (f) {
      fx.shock(f.x, f.y, 12, 96, MAG.scale, 620);
      this.api.showFloatingText(f.x, f.y - 56, '🐉 DRAGON KIN', this.hex(MAG.scaleLit));
    }
    this.api.scene.cameras.main.shake(360, 0.009);
    this.record(v.owner, 'hatches', 1);
  }

  // ── Plume ──────────────────────────────────────────────────────────────────

  /** Lob the queued pools out one at a time. Cast fires five of these over ~0.4s. */
  private firePlume(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.plumeLeft <= 0 || time < s.plumeNextAt) return;
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.plumeLeft = 0; return; }

    const total = Math.max(2, s.plumeTotal);
    const i = total - s.plumeLeft;
    // Fanned and staggered in distance, so the pools cover an area rather than a line.
    const spread = ((i / (total - 1)) - 0.5) * 2 * PLUME_SPREAD;
    const ang = s.plumeAng + spread;
    const dist = PLUME_MIN_DIST + (PLUME_MAX_DIST - PLUME_MIN_DIST) * (0.35 + Math.random() * 0.65);
    const x = this.clampX(f.x + Math.cos(ang) * dist);
    const y = this.clampY(f.y + Math.sin(ang) * dist);

    // Mag-Mortar (Click+): the same five throws, but each glob is a shell that goes off where
    // it lands before settling into the pool it was always going to leave.
    const mortar = this.up(owner, 'click');
    this.addPool(owner, x, y, f.x, f.y, mortar
      ? { impact: MORTAR_IMPACT_DMG, impactR: MORTAR_IMPACT_R, shell: true }
      : {});

    this.fx(owner).ember(f.x, f.y, 3, 14, 380);
    s.plumeLeft--;
    s.plumeNextAt = time + PLUME_GAP_MS;
    this.avatar(owner)?.setVenting(true);
  }

  private updatePools(time: number, dt: number): void {
    const landing = this.pools.filter((p) => p.landAt <= time && p.landAt > time - 40);
    for (const p of landing) {
      const fx = this.fx(p.owner);
      fx.splat(p.x, p.y, POOL_R * 0.9);
      fx.ember(p.x, p.y, 4, POOL_R * 0.7, 520);
      // Mag-Mortar and Jet Slam: the round goes off where it lands. The pool it leaves behind
      // is unchanged, so the upgrade adds an opener rather than replacing the floor.
      if (p.impact <= 0) continue;
      fx.erupt(p.x, p.y, p.impactR * 0.8, MAG.gold);
      fx.shock(p.x, p.y, 12, p.impactR, MAG.ember, 480);
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > p.impactR) continue;
        t.takeDamage(p.impact);
        this.api.spawnHitFlash(t.x, t.y, this.col(p.owner)(MAG.gold));
      }
      // Same geometry as the damage, so an impact charges like everything else does.
      this.feed(p.owner, p.x, p.y, p.impactR, p.impact);
    }
    this.pools = this.pools.filter((p) => time < p.until);

    // Burn: taken as a maximum across every pool touching a body, never a sum.
    const burn = new Map<Fighter, Owner>();
    for (const p of this.pools) {
      if (time < p.landAt) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > POOL_R) continue;
        burn.set(t, p.owner);
      }
      // …and the same pool charges anything of its owner's that it is sitting on.
      this.feed(p.owner, p.x, p.y, POOL_R, POOL_FEED_PER_S * dt);
    }

    for (const [t, owner] of burn) {
      const acc = (this.burnAccum.get(t) ?? 0) + POOL_DPS * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole > 0) {
        t.takeDamage(whole);
        if (Math.random() < 0.3) this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
      }
    }
    // Anything that stepped off loses its part-tick rather than banking it.
    for (const t of [...this.burnAccum.keys()]) if (!burn.has(t)) this.burnAccum.delete(t);
  }

  // ── Vessels ────────────────────────────────────────────────────────────────

  private updateVessels(time: number, dt: number): void {
    void dt;
    for (const v of [...this.vessels]) {
      const ratio = v.pressure / v.max;

      if (v.kind === 'volcano') {
        // Lava. The fuller it is, the faster it comes.
        if (time >= v.nextPoolAt) {
          const gap = Phaser.Math.Linear(VOLC_PUDDLE_SLOW_MS, VOLC_PUDDLE_FAST_MS, ratio);
          v.nextPoolAt = time + gap;
          this.ventPool(v, time);
        }
        // Rock, once there is enough pressure behind it to throw any.
        if (ratio >= VOLC_ROCK_AT || v.blowAt > 0) {
          if (time >= v.nextRockAt) {
            if (v.blowAt > 0) {
              v.nextRockAt = time + VOLC_BLOW_ROCK_MS;
              this.spitRock(v, v.rockAng);
              v.rockAng += 2.4;
            } else {
              const f = Phaser.Math.Clamp((ratio - VOLC_ROCK_AT) / (1 - VOLC_ROCK_AT), 0, 1);
              v.nextRockAt = time + Phaser.Math.Linear(VOLC_ROCK_SLOW_MS, VOLC_ROCK_FAST_MS, f);
              // A three-spoke burst, turning a little each time, so cover builds up all round.
              for (let i = 0; i < 3; i++) this.spitRock(v, v.rockAng + (i / 3) * Math.PI * 2);
              v.rockAng += 0.9;
            }
          }
        }
        if (v.blowAt > 0 && time >= v.blowAt) { this.collapse(v); continue; }
      }

      if (time >= v.until) {
        this.removeVessel(v, v.kind === 'egg' ? 'spoil' : 'crumble');
      }
    }
  }

  /** A volcano coughing up a pool of lava somewhere near its own base. */
  private ventPool(v: Vessel, time: number): void {
    void time;
    const ang = Math.random() * Math.PI * 2;
    const d = v.r + 14 + Math.random() * 58;
    const x = this.clampX(v.x + Math.cos(ang) * d);
    const y = this.clampY(v.y + Math.sin(ang) * d * 0.8);
    this.addPool(v.owner, x, y, v.x, v.y - v.r * 1.4);
    this.fx(v.owner).ember(v.x, v.y - v.r * 1.5, 3, 14, 480);
  }

  private spitRock(v: Vessel, ang: number): void {
    const jitter = ang + (Math.random() - 0.5) * 0.5;
    // Offset clear of the mouth: a rock born inside its own volcano would collide on frame one.
    const ox = v.x + Math.cos(jitter) * (v.r * 0.7);
    const oy = v.y - v.r * 1.2 + Math.sin(jitter) * (v.r * 0.4);
    this.rocks.push({
      owner: v.owner, x: ox, y: oy,
      vx: Math.cos(jitter) * ROCK_SPEED,
      vy: Math.sin(jitter) * ROCK_SPEED * 0.85,
      until: this.now + ROCK_LIFE_MS,
      seed: Math.random() * 999,
      spin: Math.random() * Math.PI * 2,
      source: v,
    });
    while (this.rocks.length > MAX_ROCKS) this.rocks.shift();
  }

  /** The end of a volcano that made it to 100: everything at once, then nothing. */
  private collapse(v: Vessel): void {
    this.vessels = this.vessels.filter((o) => o !== v);
    // Supercritical (E+): everything forced in past the cap is paid back here and nowhere else.
    const dmg = Math.round(VOLC_COLLAPSE_DMG + v.over * OVERFILL_DMG_PER);
    const radius = VOLC_COLLAPSE_R + v.over * OVERFILL_R_PER;
    const fx = this.fx(v.owner);
    fx.erupt(v.x, v.y, radius * 0.7, MAG.magma);
    fx.shock(v.x, v.y, 30, radius, MAG.gold, 720);
    if (v.over > 0) fx.shock(v.x, v.y, 22, radius * 1.15, MAG.white, 820);
    fx.smoke(v.x, v.y - 20, 12, 1400);

    for (const t of this.targetsOf(v.owner)) {
      if (Phaser.Math.Distance.Between(v.x, v.y, t.x, t.y) > radius) continue;
      t.takeDamage(dmg);
      this.api.spawnHitFlash(t.x, t.y, this.col(v.owner)(MAG.magma));
      const a = Math.atan2(t.y - v.y, t.x - v.x);
      this.shove(t, a, 120 + v.over * 0.4);
    }
    // The blast is an attack like any other, so it charges whatever else is standing nearby.
    this.feed(v.owner, v.x, v.y, radius, 40, v);

    // It leaves the field it was standing in behind it — a wider one for a wider blast.
    const puddles = 4 + Math.floor(v.over / 60);
    for (let i = 0; i < puddles; i++) {
      const a = (i / puddles) * Math.PI * 2 + Math.random();
      const d = 30 + Math.random() * (radius * 0.55);
      this.addPool(v.owner, this.clampX(v.x + Math.cos(a) * d),
        this.clampY(v.y + Math.sin(a) * d * 0.8), v.x, v.y);
    }
    this.api.showFloatingText(v.x, v.y - 60,
      v.over > 0 ? `💥 SUPERCRITICAL ${dmg}` : '💥 COLLAPSE', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(420, 0.012);
    this.record(v.owner, 'eruptions', 1);

    // Obsidian Coat (mastery): the glass an over-erupting cone throws only sets on somebody who
    // was standing close enough to be caught by it. Same radius the blast used — a collapse you
    // were not inside is a collapse you were not part of.
    const f = this.fighter(v.owner);
    if (this.masteryOn(v.owner) && v.over > 0 && f && f.active && f.hp > 0
      && Phaser.Math.Distance.Between(v.x, v.y, f.x, f.y) <= radius) {
      this.grantCoat(v.owner, v.over);
    }
  }

  /**
   * One pool of lava on its way to the floor. Every source of one goes through here so the
   * cap, the flight time and the optional landing blast are stated once.
   */
  private addPool(
    owner: Owner, x: number, y: number, fromX: number, fromY: number,
    { impact = 0, impactR = MORTAR_IMPACT_R, shell = false, flight = PLUME_FLIGHT_MS } = {},
  ): void {
    this.pools.push({
      owner, x, y, fromX, fromY,
      landAt: this.now + flight,
      until: this.now + flight + POOL_LIFE_MS,
      seed: Math.random() * 999,
      impact, impactR, shell, flightMs: flight,
    });
    while (this.pools.length > MAX_POOLS) this.pools.shift();
  }

  /** A vessel going away without paying out — timed out, or replaced by a fresh cast. */
  private removeVessel(v: Vessel, why: 'crumble' | 'spoil'): void {
    this.vessels = this.vessels.filter((o) => o !== v);
    const fx = this.fx(v.owner);
    fx.smoke(v.x, v.y - 10, 7, 1000);
    fx.ember(v.x, v.y, 5, v.r, 620, v.kind === 'egg' ? MAG.scaleLit : MAG.ember);
    if (why === 'spoil') {
      this.api.showFloatingText(v.x, v.y - 44, '🥚 WENT COLD', '#8a8a8a');
    }
  }

  // ── Rocks ──────────────────────────────────────────────────────────────────

  private updateRocks(time: number, dt: number): void {
    const gone: Rock[] = [];
    for (const r of this.rocks) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.spin += dt * 6;
      if (time >= r.until || r.x < this.left - 20 || r.x > this.right + 20
        || r.y < this.top - 20 || r.y > this.bottom + 20) {
        gone.push(r);
        continue;
      }

      // Enemies first — a rock that could do both should hurt somebody.
      const victim = this.targetsOf(r.owner)
        .find((t) => Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) <= ROCK_HIT_R);
      if (victim) {
        victim.takeDamage(ROCK_DMG);
        this.api.spawnHitFlash(victim.x, victim.y, this.col(r.owner)(MAG.magma));
        this.fx(r.owner).ember(r.x, r.y, 5, 18, 480);
        gone.push(r);
        continue;
      }

      if (this.feed(r.owner, r.x, r.y, 8, ROCK_FEED, r.source).length) {
        this.fx(r.owner).ember(r.x, r.y, 5, 16, 460);
        gone.push(r);
      }
    }
    if (gone.length) this.rocks = this.rocks.filter((r) => !gone.includes(r));
  }

  // ── Magma Bloat ────────────────────────────────────────────────────────────

  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.absorberInstalled) return;
    s.savedAbsorber = f.damageAbsorber;
    s.absorberInstalled = true;
    // Looked up through `this.side` rather than captured, so a match restart that rebuilds the
    // side objects can never leave a live closure pointing at a dead shield.
    f.damageAbsorber = (amount: number) => {
      const st = this.side(owner);
      if (st.bloatUntil <= this.now) return false;
      // Bloat Bomb (R+): while the trigger is held the hit is still refused outright, but it
      // is folded into the charge instead of setting it off. Letting go does not detonate —
      // it just re-arms, so the bomb goes off on whatever touches you next.
      if (st.bombHeld) {
        st.bombCharge += amount * BOMB_PER_POINT;
        this.fx(owner).ember(this.fighter(owner).x, this.fighter(owner).y, 6, 26, 480, MAG.gold);
        this.api.showFloatingText(this.fighter(owner).x, this.fighter(owner).y - 46,
          `🫧 +${Math.round(amount * BOMB_PER_POINT)}`, this.hex(MAG.gold));
        return true;
      }
      st.bloatUntil = 0;
      this.popBloat(owner);
      return true;
    };
  }

  /**
   * A bloat that ran its window out without ever being hit. The absorber has to come back off
   * rather than sitting there returning false — leaving it installed would shadow whatever
   * absorber the fighter picks up next.
   */
  private updateBloat(owner: Owner, time: number): void {
    const s = this.side(owner);
    // Bloat Bomb (R+): the window does not run down while the trigger is held. Holding is the
    // cost — you are standing there taking hits on purpose — so it must not also be a timer.
    // The window is refreshed outright rather than merely paused, so letting go leaves a bomb
    // that is still fully armed — the release is a decision, not a countdown.
    if (s.bombHeld && s.bloatUntil > time) {
      s.bloatUntil = time + BLOAT_MS;
      return;
    }
    if (!s.absorberInstalled || s.bloatUntil > time) return;
    const f = this.fighter(owner);
    this.uninstallAbsorber(owner);
    if (s.bloatUntil > 0) {
      s.bloatUntil = 0;
      s.bombCharge = 0;
      if (f) this.fx(owner).smoke(f.x, f.y, 5, 700);
    }
  }

  private uninstallAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.absorberInstalled) return;
    if (f) f.damageAbsorber = s.savedAbsorber;
    s.absorberInstalled = false;
    s.savedAbsorber = null;
  }

  /** The hit that popped it is already gone; this is what the player gets in exchange. */
  private popBloat(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    this.uninstallAbsorber(owner);
    // Bloat Bomb (R+): everything swallowed while the trigger was held comes out here.
    const bonus = Math.round(s.bombCharge);
    const dmg = BLOAT_DMG + bonus;
    const radius = BLOAT_R + Math.min(90, bonus * 0.5);
    s.bombCharge = 0;
    if (!f) return;
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, radius * 0.8, MAG.lava);
    fx.shock(f.x, f.y, 16, radius, MAG.gold, 520);
    if (bonus > 0) fx.shock(f.x, f.y, 20, radius * 1.2, MAG.white, 640);

    let caught = 0;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > radius) continue;
      t.takeDamage(dmg);
      caught++;
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
      this.shove(t, Math.atan2(t.y - f.y, t.x - f.x), 90 + bonus * 0.4);
    }
    this.record(owner, 'bloatHits', caught);
    this.feed(owner, f.x, f.y, radius, BLOAT_FEED + bonus * 0.3);
    this.api.showFloatingText(f.x, f.y - 50,
      bonus > 0 ? `💣 BLOAT BOMB ${dmg}` : '💥 BLOCKED', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(bonus > 0 ? 340 : 200, bonus > 0 ? 0.01 : 0.006);
  }

  // ── Magma Jet ──────────────────────────────────────────────────────────────

  /**
   * The jet, while the button is down.
   *
   * Three things happen at once and they are deliberately the same action: a cone of flame
   * goes out at the cursor, the caster is thrown the *other* way, and everything of theirs
   * standing in the fire is charged. That makes the aim decision and the escape decision one
   * decision, which is the whole ability — you cannot burn somebody without backing away from
   * them, and you cannot back away without pointing the fire at wherever you left.
   */
  private updateJet(owner: Owner, time: number, dt: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);

    // The npc has no key to hold, so its burst is a timer.
    if (owner === 'npc' && s.jetUntil > time && time >= s.npcJetUntil) s.jetUntil = 0;

    if (s.jetUntil <= time || s.jetSpent >= JET_MAX_MS) {
      if (s.jetWasOut) {
        s.jetWasOut = false;
        s.jetUntil = 0;
        if (f) this.fx(owner).smoke(f.x, f.y, 6, 700);
      }
      return;
    }
    if (!f || !f.active || f.hp <= 0) { s.jetUntil = 0; return; }
    // Ground covered under thrust, banked in whole hundreds (see `jetDistAcc`).
    if (s.jetWasOut) {
      s.jetDistAcc += Phaser.Math.Distance.Between(s.jetPrevX, s.jetPrevY, f.x, f.y);
      const whole = Math.floor(s.jetDistAcc / 100) * 100;
      if (whole > 0) {
        s.jetDistAcc -= whole;
        this.record(owner, 'jetDistance', whole);
      }
    }
    s.jetPrevX = f.x;
    s.jetPrevY = f.y;
    s.jetWasOut = true;
    s.jetSpent += delta;

    const ang = Math.atan2(s.curY - f.y, s.curX - f.x);

    // ── The thrust ──
    // Written straight onto the body, after ArenaScene's movement pass has already resolved
    // the frame — the jet is not a contribution to your walking, it *is* your movement.
    const body = f.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-Math.cos(ang) * JET_PUSH, -Math.sin(ang) * JET_PUSH);
    this.fx(owner).ember(f.x + Math.cos(ang) * 10, f.y + Math.sin(ang) * 10, 2, 16, 300);

    // ── Jet Slam (F+) ──
    // A wall at your back while the throttle is open brings the ceiling down with you.
    if (this.up(owner, 'f') && time >= s.slamReadyAt && this.againstWall(f)) {
      s.slamReadyAt = time + SLAM_COOLDOWN_MS;
      this.jetSlam(owner, f);
    }

    // ── Charging ──
    // Same geometry the damage uses, so the jet feeds a volcano exactly as hard as it burns.
    const midX = f.x + Math.cos(ang) * JET_RANGE * 0.55;
    const midY = f.y + Math.sin(ang) * JET_RANGE * 0.55;
    this.feed(owner, midX, midY, JET_RANGE * 0.5, JET_FEED_PER_S * dt);

    // ── The burn ──
    if (time < s.jetTickAt) return;
    s.jetTickAt = time + JET_TICK_MS;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > JET_RANGE) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      // Widens with distance the way a real cone does, rather than being a fixed wedge.
      if (off > JET_HALF + 14 / Math.max(24, d)) continue;
      t.takeDamage(JET_TICK_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
    }
  }

  /** Whether the fighter is jammed up against the edge of the arena. */
  private againstWall(f: Fighter): boolean {
    return f.x <= this.left + SLAM_WALL_PAD || f.x >= this.right - SLAM_WALL_PAD
      || f.y <= this.top + SLAM_WALL_PAD || f.y >= this.bottom - SLAM_WALL_PAD;
  }

  /**
   * Jet Slam (F+). Riding your own exhaust into a wall shakes a dozen rocks out of the sky.
   * They come down as lava that detonates where it lands and then stays hot, and the impact
   * costs the pilot fifteen — this is a collision, and collisions are not free.
   */
  private jetSlam(owner: Owner, f: Fighter): void {
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, 60, MAG.gold);
    fx.shock(f.x, f.y, 18, 90, MAG.white, 520);
    fx.smoke(f.x, f.y, 8, 900);
    for (let i = 0; i < SLAM_ROCKS; i++) {
      const a = (i / SLAM_ROCKS) * Math.PI * 2 + Math.random();
      const d = 18 + Math.random() * SLAM_SPREAD;
      const x = this.clampX(f.x + Math.cos(a) * d);
      const y = this.clampY(f.y + Math.sin(a) * d * 0.85);
      // Dropped from well above the arena, so they read as falling rather than as thrown.
      this.addPool(owner, x, y, x + (Math.random() - 0.5) * 30, y - 260, {
        impact: SLAM_ROCK_DMG, impactR: 34, shell: true,
        flight: 340 + Math.random() * 420,
      });
    }
    // Online, the pilot may be a replica — their own sim has already charged them the fifteen,
    // and `takeDamage` on a netGhost relays the number straight back to them as a second helping.
    // The collision belongs to the sim that owns the body it happened to.
    if (!f.netGhost) f.takeDamage(SLAM_SELF_DMG, { selfInflicted: true });
    this.api.showFloatingText(f.x, f.y - 54, '🪨 JET SLAM', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(300, 0.009);
  }

  // ── Dragon ─────────────────────────────────────────────────────────────────

  private updateBreath(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    if (s.breathUntil <= time) return;
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.breathUntil = 0; return; }

    const ang = Math.atan2(s.curY - f.y, s.curX - f.x);

    // Charges anything of yours standing in the fire, same as everything else does.
    const midX = f.x + Math.cos(ang) * BREATH_RANGE * 0.55;
    const midY = f.y + Math.sin(ang) * BREATH_RANGE * 0.55;
    this.feed(owner, midX, midY, BREATH_RANGE * 0.5, BREATH_FEED_PER_S * dt);

    if (time < s.breathTickAt) return;
    s.breathTickAt = time + BREATH_TICK_MS;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > BREATH_RANGE) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      // Widens with distance the way a real cone does, rather than being a fixed wedge.
      if (off > BREATH_HALF + 14 / Math.max(24, d)) continue;
      t.takeDamage(BREATH_TICK_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.breath));
    }
  }

  /**
   * Full Draconic's scale armour (Q+): four seconds during which nothing sticks. The control
   * fields are cleared every frame rather than once on cast, because anything can write a new
   * stun a frame later and "immune to every negative status" has to mean it.
   */
  private updateScale(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    if (s.scaleUntil > time) {
      f.unstoppable = true;
      f.earthStunnedUntil = 0;
      f.frozenUntil = 0;
      f.highGravityUntil = 0;
      f.skeweredUntil = 0;
      return;
    }
    if (s.scaleUntil > 0) {
      s.scaleUntil = 0;
      f.unstoppable = false;
      this.fx(owner).smoke(f.x, f.y, 6, 700);
      this.api.showFloatingText(f.x, f.y - 50, '🐲 SCALES DOWN', '#8a8a8a');
    }
  }

  /** Keeps the hatched buffs on the Fighter and takes them off again when the clock runs out. */
  private updateDragon(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    const on = s.dragonUntil > time;
    // The one place `magmaIncomingMult` is ever written. All three stack: being a dragon is 20%
    // off, clamping the plates over it is another 25%, and a coat of obsidian is up to 30% more.
    const coat = this.coatPower(owner);
    f.magmaIncomingMult = (on ? DRAGON_INCOMING : 1)
      * (s.scaleUntil > time ? SCALE_INCOMING : 1)
      * (s.coatUntil > time ? 1 - (COAT_ARMOR_MIN + (COAT_ARMOR_MAX - COAT_ARMOR_MIN) * coat) : 1);
    if (!on && s.breathUntil > time) s.breathUntil = 0;
    // The moment it lapses, say so — twenty seconds is long enough to have forgotten.
    if (!on && s.dragonUntil > 0) {
      s.dragonUntil = 0;
      this.fx(owner).smoke(f.x, f.y, 8, 900);
      this.api.showFloatingText(f.x, f.y - 50, '🐉 SPENT', '#8a8a8a');
    }
  }

  // ── Mastery: Obsidian Coat ─────────────────────────────────────────────────

  /**
   * A supercritical cone has come down with its owner standing in it. The glass sets.
   *
   * `over` is the whole argument: a volcano that barely crossed the cap leaves a film, and one
   * that was beaten to 250 past it leaves armour. A second collapse refreshes the fifteen
   * seconds and keeps whichever coat was better, so chaining two thin ones is not a route to a
   * thick one — the only way to a good coat is to have earned a good one.
   */
  private grantCoat(owner: Owner, over: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;
    const power = Phaser.Math.Clamp(over / COAT_FULL_OVER, 0, 1);
    const better = s.coatUntil > this.now ? Math.max(s.coatPower, power) : power;
    s.coatPower = better;
    s.coatUntil = this.now + COAT_MS;

    const fx = this.fx(owner);
    fx.glass(f.x, f.y, 26, 12 + Math.round(better * 8));
    fx.ember(f.x, f.y - 6, 8, 30, 640, MAG.gold);
    Sfx.playAt('crystal-shatter', f.x, { volume: 0.6, rate: 0.7 });
    this.api.showFloatingText(f.x, f.y - 52,
      `🪨 OBSIDIAN ${Math.round(10 + better * 90)}%`, this.hex(MAG.gold));
  }

  /**
   * The coat's three halves, resolved once a frame.
   *
   * The armour goes through `magmaIncomingMult`, which `updateDragon` already owns — so it is
   * folded in there rather than written here, and this method only owns the *outgoing* side and
   * the expiry. The outgoing field is shared, so it is applied by dividing the old contribution
   * out and multiplying the new one in.
   */
  private updateCoat(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;

    if (s.coatUntil > 0 && s.coatUntil <= time) {
      s.coatUntil = 0;
      s.coatPower = 0;
      this.fx(owner).smoke(f.x, f.y, 6, 800);
      this.api.showFloatingText(f.x, f.y - 50, '🪨 GLASS SHED', '#8a8a8a');
    }

    const want = s.coatUntil > time
      ? 1 + COAT_DMG_MIN + (COAT_DMG_MAX - COAT_DMG_MIN) * s.coatPower
      : 1;
    if (want === s.coatOutApplied) return;
    f.outgoingDamageMult = (f.outgoingDamageMult / s.coatOutApplied) * want;
    s.coatOutApplied = want;
  }

  // ── Mastery: Magma Saw ─────────────────────────────────────────────────────

  /**
   * The bound key, all three things it does.
   *
   * A saw already out cuts its own motor — that is the whole decision the ability asks, and it
   * has to be the *first* thing the key means or there would be no way to escape the blast.
   * Otherwise the key winds a saw up while it is held and starts it on release.
   */
  private handleSawKey(owner: Owner, key: Phaser.Input.Keyboard.Key, time: number): void {
    const s = this.side(owner);
    const down = Phaser.Input.Keyboard.JustDown(key);

    if (s.sawFrom > 0) {
      if (down) this.stopSaw(owner, 'cancel');
      return;
    }
    if (down) {
      const f = this.fighter(owner);
      if (time - s.sawCastAt < SAW_COOLDOWN_MS) {
        // Say so. A held ability that simply does nothing on the press reads as a dropped input.
        if (owner === 'player' && f) {
          this.api.showFloatingText(f.x, f.y - 52,
            `🪚 ${((SAW_COOLDOWN_MS - (time - s.sawCastAt)) / 1000).toFixed(1)}s`, '#8a8a8a');
        }
        return;
      }
      s.sawHoldFrom = time;
      this.avatar(owner)?.play('flex');
      if (f) Sfx.playAt('engine', f.x, { volume: 0.35, rate: 0.7 });
      return;
    }
    // Released, or held past the window: start cutting with whatever was wound in.
    if (s.sawHoldFrom <= 0) return;
    if (!key.isDown || time - s.sawHoldFrom >= SAW_HOLD_MAX_MS) this.startSaw(owner, time);
  }

  /** Rev over, motor on. The charge is spent entirely on how long the saw will live. */
  private startSaw(owner: Owner, time: number, planMs?: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.sawHoldFrom = 0; return; }
    const held = Phaser.Math.Clamp((time - s.sawHoldFrom) / SAW_HOLD_MAX_MS, 0, 1);
    s.sawPlanMs = planMs ?? (SAW_MIN_MS + held * (SAW_OVERHEAT_MS - SAW_MIN_MS));
    s.sawHoldFrom = 0;
    s.sawFrom = time;
    s.sawTickAt = 0;
    s.sawCastAt = time;

    const fx = this.fx(owner);
    fx.ember(f.x, f.y, 8, 26, 460, MAG.gold);
    this.avatar(owner)?.setVenting(true);
    Sfx.playAt('engine', f.x, { volume: 0.7, rate: 1.15 });
    this.api.showFloatingText(f.x, f.y - 52, '🪚 MAGMA SAW', this.hex(MAG.gold));
    if (owner === 'player' && this.api.isOnline) this.api.broadcastMasteryCast('magma-saw');
  }

  /**
   * Motor off. `cancel` is the player choosing to live; `spent` is the planned runtime simply
   * ending; `blast` is the saw taking the choice away from them.
   */
  private stopSaw(owner: Owner, why: 'cancel' | 'spent' | 'blast'): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.sawFrom = 0;
    s.sawPlanMs = 0;
    s.sawHoldFrom = 0;
    if (f) {
      this.fx(owner).smoke(f.x, f.y, 5, 640);
      if (why !== 'blast' && owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 48,
          why === 'cancel' ? '🪚 MOTOR CUT' : '🪚 SPENT', '#8a8a8a');
      }
    }
    // The blast broadcasts itself — a replica told to stop *before* it detonates would never
    // show the explosion the caster just took.
    if (why !== 'blast' && owner === 'player' && this.api.isOnline) {
      this.api.broadcastMasteryCast('magma-saw-off');
    }
  }

  /** Where the blade is: out at arm's length toward whatever this side is aiming at. */
  private sawHead(owner: Owner): { x: number; y: number; ang: number } | null {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return null;
    const ang = Math.atan2(s.curY - f.y, s.curX - f.x);
    return { x: f.x + Math.cos(ang) * SAW_HOLD_DIST, y: f.y + Math.sin(ang) * SAW_HOLD_DIST, ang };
  }

  /** 0–1 — how close this side's saw is to detonating. Drives the colour and the shake. */
  private sawHeat(owner: Owner, time: number): number {
    const s = this.side(owner);
    if (s.sawFrom <= 0) return 0;
    return Phaser.Math.Clamp((time - s.sawFrom) / SAW_OVERHEAT_MS, 0, 1);
  }

  /**
   * The saw, while it is out.
   *
   * Two clocks run at once and they are the whole ability: the saw's own planned runtime, which
   * the charge bought, and the eight seconds of heat, which nothing buys back. A short saw ends
   * on the first clock and is simply a good melee tool. A fully-charged one runs out of both at
   * the same instant, which is the trade the charge is actually making.
   */
  private updateSaw(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    if (s.sawFrom <= 0) return;
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { this.stopSaw(owner, 'spent'); return; }

    const elapsed = time - s.sawFrom;
    if (elapsed >= SAW_OVERHEAT_MS) { this.sawBlast(owner); return; }
    if (elapsed >= s.sawPlanMs) { this.stopSaw(owner, 'spent'); return; }

    const head = this.sawHead(owner);
    if (!head) return;
    this.avatar(owner)?.setFacing(head.ang);

    // A running saw is an attack like every other, so it charges whatever it is held against —
    // and it is the only thing in the kit that can push a critical cone past its own cap.
    this.feed(owner, head.x, head.y, SAW_R, SAW_FEED_PER_S * dt);

    if (time < s.sawTickAt) return;
    s.sawTickAt = time + SAW_TICK_MS;
    const bite = Math.min(SAW_DMG_MAX, 1 + Math.floor(elapsed / SAW_RAMP_MS));
    const heat = elapsed / SAW_OVERHEAT_MS;
    let cut = false;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(head.x, head.y, t.x, t.y) > SAW_R + 12) continue;
      t.takeDamage(bite);
      cut = true;
      // One spark in three: twenty hits a second would otherwise be a wall of flashes.
      if (Math.random() < 0.34) {
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(heat > 0.78 ? MAG.magma : MAG.gold));
      }
    }
    if (cut) this.fx(owner).ember(head.x, head.y, 2, 14, 300, heat > 0.78 ? MAG.magma : MAG.gold);
  }

  /** Too hot to hold. Everybody inside 150px pays for it, the pilot included. */
  private sawBlast(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    this.stopSaw(owner, 'blast');
    if (!f) return;
    const head = this.sawHead(owner);
    const ang = head ? head.ang : s.curAng;

    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, SAW_BLAST_R * 0.75, MAG.magma);
    fx.shock(f.x, f.y, 24, SAW_BLAST_R, MAG.white, 720);
    fx.smoke(f.x, f.y, 10, 1200);
    Sfx.playAt('explosion-large', f.x, { volume: 0.85, rate: 0.85 });

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > SAW_BLAST_R) continue;
      t.takeDamage(SAW_BLAST_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.magma));
      this.shove(t, Math.atan2(t.y - f.y, t.x - f.x), SAW_ENEMY_SHOVE);
      this.api.showFloatingText(t.x, t.y - 44, `🪚 ${SAW_BLAST_DMG}`, this.hex(MAG.magma));
    }
    // It goes off in the caster's hands, so the caster is in the blast — and is thrown off the
    // end of the bar, back down the line they were cutting along.
    //
    // Online, the opponent is a replica: their own sim has already charged them for this, and a
    // second helping here would be relayed straight back to them as a real 35. The caster's
    // half of the blast belongs to the caster's sim and nowhere else.
    if (!f.netGhost) {
      f.takeDamage(SAW_BLAST_DMG, { selfInflicted: true });
      this.shove(f, ang + Math.PI, SAW_SELF_SHOVE);
    }
    this.feed(owner, f.x, f.y, SAW_BLAST_R, 40);
    this.api.showFloatingText(f.x, f.y - 56, '💥 TOO HOT', this.hex(MAG.white));
    this.api.scene.cameras.main.shake(380, 0.011);
  }

  /**
   * The bot's half of the saw.
   *
   * Kept here rather than in `NpcOpponent` for the same reason every mastery is: enhancement
   * ids are not in `element.abilities`, so there is nothing for `castAbility` to find. The one
   * real decision is at the end — a bot holding a saw about to go off checks whether the player
   * is standing close enough to be worth eating 35 for, and cuts the motor if they are not.
   */
  private updateNpcSaw(time: number): void {
    if (this.api.isOnline) return;
    if (!this.sawSlot('npc')) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!f || !f.active || f.hp <= 0) return;
    const target = this.enemyOf('npc');

    if (s.sawFrom > 0) {
      if (s.npcSawRide || time - s.sawFrom < NPC_SAW_COMMIT_MS) return;
      // Commit point: ride it into the blast only if that blast is going to land on somebody.
      const near = target
        && Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y) < SAW_BLAST_R * 0.8;
      if (near) s.npcSawRide = true;
      else this.stopSaw('npc', 'cancel');
      return;
    }

    if (time < s.npcSawNextAt || time - s.sawCastAt < SAW_COOLDOWN_MS) return;
    if (!target || Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y) > 190) return;
    s.npcSawRide = false;
    s.npcSawNextAt = time + 2000;
    // Winds up somewhere between a stab and the full eight seconds, so it is not one animation.
    s.sawHoldFrom = time - SAW_HOLD_MAX_MS * (0.35 + Math.random() * 0.65);
    this.startSaw('npc', time);
  }

  // ── Knockback ──────────────────────────────────────────────────────────────

  /**
   * Both movement systems rewrite a fighter's velocity every frame, so a knockback handed to
   * the physics body is gone before it renders. Played out as position instead.
   */
  private shove(target: Fighter, ang: number, distance: number): void {
    const speed = distance / (SHOVE_MS / 1000);
    this.shoves = this.shoves.filter((s) => s.target !== target);
    this.shoves.push({
      target,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      until: this.now + SHOVE_MS,
    });
  }

  private updateShoves(dt: number): void {
    if (!this.shoves.length) return;
    const now = this.now;
    for (const s of this.shoves) {
      const t = s.target;
      if (!t || !t.active) continue;
      // Eases out over its life, so a shove decelerates instead of stopping dead.
      const left = Phaser.Math.Clamp((s.until - now) / SHOVE_MS, 0, 1);
      t.setPosition(
        this.clampX(t.x + s.vx * dt * left * 2),
        this.clampY(t.y + s.vy * dt * left * 2),
      );
    }
    this.shoves = this.shoves.filter((s) => s.until > now && s.target?.active);
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      if (!this.playerAvatar) this.playerAvatar = new MagmaAvatar(scene, this.pcol);
      const s = this.sides.player;
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setDragon(this.isDragon('player'));
      this.playerAvatar.setVenting(s.plumeLeft > 0 || s.breathUntil > this.now || s.jetUntil > this.now);
      this.playerAvatar.setIntensity(this.isDragon('player') ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      if (!this.npcAvatar) this.npcAvatar = new MagmaAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(s.curY - f.y, s.curX - f.x));
      this.npcAvatar.setDragon(this.isDragon('npc'));
      this.npcAvatar.setVenting(s.plumeLeft > 0 || s.breathUntil > this.now || s.jetUntil > this.now);
      this.npcAvatar.setIntensity(this.isDragon('npc') ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    for (const p of this.pools) {
      if (time < p.landAt) continue;
      const age = (time - p.landAt) / POOL_LIFE_MS;
      // Skins over as it dies, which is also the warning that it is about to stop hurting.
      const heat = Phaser.Math.Clamp(1 - age * 1.15, 0.05, 1);
      const fade = Phaser.Math.Clamp((p.until - time) / 900, 0, 1);
      moltenPool(g, this.col(p.owner), p.x, p.y, POOL_R, heat, this.vizT, p.seed, fade);
    }
  }

  private paintObjects(time: number): void {
    const g = this.objGfx;
    if (!g) return;
    g.clear();

    // Pools still in the air, thrown on an arc from wherever they came from.
    for (const p of this.pools) {
      if (time >= p.landAt) continue;
      const f = Phaser.Math.Clamp(1 - (p.landAt - time) / Math.max(1, p.flightMs), 0, 1);
      const x = Phaser.Math.Linear(p.fromX, p.x, f);
      const y = Phaser.Math.Linear(p.fromY, p.y, f) - Math.sin(f * Math.PI) * 44;
      const tint = this.col(p.owner);
      if (p.shell) {
        // Mag-Mortar / Jet Slam: a finned round, nose-down along its own flight path.
        const ang = Math.atan2(p.y - p.fromY, p.x - p.fromX) + Math.PI * 0.12;
        mortarShell(g, tint, x, y, ang, 1);
      } else {
        g.fillStyle(tint(MAG.magma), 0.3);
        g.fillCircle(x, y, 13);
        g.fillStyle(tint(MAG.lava), 1);
        g.fillCircle(x, y, 8);
        g.fillStyle(tint(MAG.white), 0.8);
        g.fillCircle(x - 2, y - 2, 3.2);
      }
      // Where it is going to land, so it can be stepped out of.
      const ringR = p.impact > 0 ? p.impactR : POOL_R;
      g.lineStyle(p.impact > 0 ? 2.2 : 1.6, tint(p.impact > 0 ? MAG.gold : MAG.ember),
        0.35 + f * 0.35);
      g.strokeEllipse(p.x, p.y, ringR * 1.7 * (0.5 + f * 0.5), ringR * 1.15 * (0.5 + f * 0.5));
    }

    for (const v of this.vessels) {
      const tint = this.col(v.owner);
      const ratio = v.pressure / v.max;
      if (v.kind === 'volcano') {
        volcanoCone(g, tint, v.x, v.y + v.r * 0.5, v.r, ratio, this.vizT, v.seed);
      } else {
        dragonEgg(g, tint, v.x, v.y, v.r, ratio, this.vizT, v.seed);
      }
      if (v.flashUntil > time) {
        g.fillStyle(tint(MAG.white), ((v.flashUntil - time) / 110) * 0.45);
        g.fillCircle(v.x, v.y, v.r * 1.5);
      }
    }

    for (const r of this.rocks) {
      lavaRock(g, this.col(r.owner), r.x, r.y, 6, r.spin, r.seed);
    }
  }

  private paintGauges(): void {
    const g = this.gaugeGfx;
    if (!g) return;
    g.clear();
    for (const v of this.vessels) {
      const tint = this.col(v.owner);
      const isEgg = v.kind === 'egg';
      const y = v.y - (isEgg ? v.r * 1.5 : v.r * 2.1);
      pressureGauge(g, tint, v.x, y, isEgg ? 62 : 48, v.pressure / v.max,
        isEgg ? MAG.scaleLit : MAG.magma);
    }
  }

  private paintJets(time: number): void {
    const g = this.fistGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const tint = this.col(owner);
      const dragon = this.isDragon(owner);

      // Dragon Breath.
      if (s.breathUntil > time) {
        const ang = Math.atan2(s.curY - f.y, s.curX - f.x);
        const left = (s.breathUntil - time) / BREATH_MS;
        // Flares open, then chokes off — a cone at constant width reads as a texture.
        const grow = Phaser.Math.Clamp((1 - left) * 4, 0, 1) * Phaser.Math.Clamp(left * 3, 0, 1);
        breathCone(g, tint,
          f.x + Math.cos(ang) * 14, f.y + Math.sin(ang) * 14, ang,
          BREATH_RANGE * (0.5 + grow * 0.5), BREATH_HALF * (0.4 + grow * 0.6),
          this.vizT, 7, MAG.scaleLit, MAG.membrane, 0.55 + grow * 0.45);
      }

      // Obsidian Coat, under everything else the caster is holding — it is worn, not wielded.
      if (s.coatUntil > time) {
        obsidianCoat(g, tint, f.x, f.y, s.coatPower, this.vizT,
          Phaser.Math.Clamp((s.coatUntil - time) / 600, 0, 1));
      }

      // Full Draconic's scale armour, over the body and under the flame.
      if (s.scaleUntil > time) {
        scaleArmor(g, tint, f.x, f.y, this.vizT,
          Phaser.Math.Clamp((s.scaleUntil - time) / 400, 0, 1));
      }

      // The saw: revving in the hand while the key is held, then out at arm's length cutting.
      if (s.sawHoldFrom > 0 || s.sawFrom > 0) {
        const head = this.sawHead(owner);
        if (head) {
          const revving = s.sawFrom <= 0;
          const rev = revving
            ? Phaser.Math.Clamp((time - s.sawHoldFrom) / SAW_HOLD_MAX_MS, 0, 1)
            : Phaser.Math.Clamp((s.sawPlanMs - SAW_MIN_MS) / (SAW_OVERHEAT_MS - SAW_MIN_MS), 0, 1);
          // Held tight to the body while winding up, thrown out to full reach once it is cutting.
          const reach = revving ? 0.5 : 1;
          magmaSaw(g, tint,
            f.x + Math.cos(head.ang) * SAW_HOLD_DIST * reach,
            f.y + Math.sin(head.ang) * SAW_HOLD_DIST * reach,
            head.ang,
            // The chain runs faster the hotter it is; a revving saw already spins.
            this.vizT * (revving ? 1.4 + rev * 1.6 : 2.6 + this.sawHeat(owner, time) * 3.4),
            revving ? 0 : this.sawHeat(owner, time), rev,
            this.vizT, owner === 'player' ? 11 : 71,
            revving ? 0.55 + rev * 0.45 : 1);
        }
      }

      // The jet: a cone at the cursor and a plume of thrust out of the caster's back.
      if (s.jetUntil <= time) continue;
      const ang = Math.atan2(s.curY - f.y, s.curX - f.x);
      const left = Phaser.Math.Clamp(1 - s.jetSpent / JET_MAX_MS, 0, 1);
      // Flares open over the first tenth of a second and chokes off as the fuel runs out.
      const grow = Phaser.Math.Clamp((JET_MAX_MS - s.jetSpent) / 260, 0, 1)
        * Phaser.Math.Clamp(s.jetSpent / 120, 0.35, 1);
      breathCone(g, tint,
        f.x + Math.cos(ang) * 12, f.y + Math.sin(ang) * 12, ang,
        JET_RANGE * (0.6 + grow * 0.4), JET_HALF * (0.6 + grow * 0.4),
        this.vizT, 3,
        dragon ? MAG.scaleLit : MAG.lava, dragon ? MAG.membrane : MAG.magma,
        0.6 + left * 0.4);

      // The exhaust: three short tongues out of the caster's back, which is the visual
      // explanation for why they are travelling in the wrong direction.
      for (let i = 0; i < 3; i++) {
        const a = ang + Math.PI + (i - 1) * 0.28;
        const len = 20 + Math.sin(this.vizT * 22 + i * 2) * 7;
        g.fillStyle(tint(i === 1 ? MAG.white : MAG.gold), 0.55 * left);
        g.fillPoints([
          new Phaser.Geom.Point(f.x + Math.cos(a - 0.18) * 8, f.y + Math.sin(a - 0.18) * 8),
          new Phaser.Geom.Point(f.x + Math.cos(a) * len, f.y + Math.sin(a) * len),
          new Phaser.Geom.Point(f.x + Math.cos(a + 0.18) * 8, f.y + Math.sin(a + 0.18) * 8),
        ], true);
      }
    }
  }

  /** What is in hand: the fist's clock and how to use it, or the dragon's. */
  private paintHud(playerIsMagma: boolean, time: number): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    const s = this.sides.player;
    const showSaw = playerIsMagma && s.sawFrom > 0;
    const showJet = playerIsMagma && s.jetUntil > time;
    const showDragon = playerIsMagma && this.isDragon('player');
    if (!showSaw && !showJet && !showDragon) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const x = this.left + 8;
    const y = this.top + 8;
    const w = 186;
    const heat = this.sawHeat('player', time);
    const hot = showSaw ? (heat > 0.78 ? MAG.magma : heat > 0.45 ? MAG.white : MAG.gold)
      : showDragon ? MAG.scaleLit : MAG.magma;

    g.fillStyle(0x05070a, 0.85);
    g.fillRoundedRect(x - 4, y - 4, w, 34, 4);
    g.lineStyle(1.5, this.pcol(hot), 0.7);
    g.strokeRoundedRect(x - 4, y - 4, w, 34, 4);

    // The saw's bar is the heat, not its runtime: it drains to nothing at the exact instant the
    // thing detonates, so an empty bar means "let go now".
    const ratio = showSaw
      ? Phaser.Math.Clamp(1 - heat, 0, 1)
      : showJet
        ? Phaser.Math.Clamp(1 - s.jetSpent / JET_MAX_MS, 0, 1)
        : Phaser.Math.Clamp((s.dragonUntil - time) / DRAGON_MS, 0, 1);
    g.fillStyle(this.pcol(MAG.smoke), 1);
    g.fillRect(x, y + 20, w - 8, 6);
    g.fillStyle(this.pcol(hot), 1);
    g.fillRect(x, y + 20, (w - 8) * ratio, 6);

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, y, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ff8b22',
        stroke: '#05070a',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(showSaw
      ? `MAGMA SAW — ${Math.min(SAW_DMG_MAX, 1 + Math.floor((time - s.sawFrom) / SAW_RAMP_MS)) * 20} A SECOND\n`
        + `${((SAW_OVERHEAT_MS - (time - s.sawFrom)) / 1000).toFixed(1)}s TO DETONATION · PRESS AGAIN TO CUT THE MOTOR`
      : showJet
        ? 'MAGMA JET — HOLD F\nFLAME AT THE CURSOR · YOU GO THE OTHER WAY'
        : (this.draconic('player')
          ? 'FULL DRACONIC\nE POUND · R SCALES · F CHARGE'
          : 'DRAGON KIN\nCLICK = BREATH · −20% TAKEN · +20% SPEED'));
    this.hudLabel.setColor(this.hex(hot));
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsMagma: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('magma-dragon', playerIsMagma && this.isDragon('player') ? {
      name: 'Dragon Kin', emoji: '🐉', color: MAG.scaleLit,
      description: this.draconic('player')
        ? `Hatched, with the full moveset. ${Math.round((1 - DRAGON_INCOMING) * 100)}% less damage taken, ${Math.round((DRAGON_SPEED - 1) * 100)}% more speed, click breathes fire — and E is a ${POUND_DMG} ground pound with a ${POUND_STUN_MS / 1000}s stun, R is 4 seconds of scale armour, F is a charge that drags everyone it passes. Q is unavailable until this runs out.`
        : `Hatched. You take ${Math.round((1 - DRAGON_INCOMING) * 100)}% less damage, move ${Math.round((DRAGON_SPEED - 1) * 100)}% faster, and your click is dragon breath.`,
      until: s.dragonUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('magma-scale', playerIsMagma && s.scaleUntil > time ? {
      name: 'Dragon Scale', emoji: '🐲', color: MAG.scale,
      description: `Plates clamped over you. Immune to every stun, root and slow in the game, and ${Math.round((1 - SCALE_INCOMING) * 100)}% less damage on top of what being a dragon already gives you.`,
      until: s.scaleUntil, priority: 104,
    } : null);

    this.api.setStatusIndicator('magma-jet', playerIsMagma && s.jetUntil > time ? {
      name: 'Magma Jet', emoji: '🚀', color: MAG.lava,
      description: `Molten flame at the cursor for ${JET_TICK_DMG} every ${JET_TICK_MS / 1000}s, and the thrust throwing you the other way. Let go of F to shut it off; there is ${((JET_MAX_MS - s.jetSpent) / 1000).toFixed(1)}s of burn left.${this.api.hasUpgrade('f') ? ' Ride it into a wall and the sky comes down.' : ''}`,
      count: Math.round(Math.max(0, JET_MAX_MS - s.jetSpent) / 100) / 10, suffix: 's',
      priority: 112,
    } : null);

    this.api.setStatusIndicator('magma-bloat', playerIsMagma && s.bloatUntil > time ? {
      name: s.bombCharge > 0 ? 'Bloat Bomb' : 'Magma Bloat', emoji: '🫧', color: MAG.gold,
      description: s.bombHeld
        ? `Holding. Every hit is still refused outright and every point of it is going into the charge — ${Math.round(s.bombCharge)} banked so far. Let go and it stays armed for the next thing that touches you.`
        : `Swollen with magma. The next hit that lands is blocked outright and bursts for ${BLOAT_DMG + Math.round(s.bombCharge)} around you.`,
      until: s.bloatUntil,
      count: s.bombCharge > 0 ? Math.round(s.bombCharge) : undefined,
      priority: 106,
    } : null);

    // ── Mastery ──
    const coat = s.coatPower;
    const bite = Math.min(SAW_DMG_MAX, 1 + Math.floor((time - s.sawFrom) / SAW_RAMP_MS));
    this.api.setStatusIndicator('magma-obsidian', playerIsMagma && s.coatUntil > time ? {
      name: 'Obsidian Coat', emoji: '🪨', color: MAG.gold,
      description: `Volcanic glass locked over you, as thick as the overfill that bought it. ${Math.round((COAT_DMG_MIN + (COAT_DMG_MAX - COAT_DMG_MIN) * coat) * 100)}% more damage dealt, ${Math.round((COAT_ARMOR_MIN + (COAT_ARMOR_MAX - COAT_ARMOR_MIN) * coat) * 100)}% less taken, and ${this.coatShots('player')} extra glob${this.coatShots('player') === 1 ? '' : 's'} on every Plume.`,
      until: s.coatUntil, priority: 108,
    } : null);

    this.api.setStatusIndicator('magma-saw', playerIsMagma && s.sawFrom > 0 ? {
      name: 'Magma Saw', emoji: '🪚',
      color: this.sawHeat('player', time) > 0.78 ? MAG.magma : MAG.gold,
      description: `Cutting for ${bite} every ${SAW_TICK_MS / 1000}s — ${bite * 20} a second, and climbing. At ${SAW_OVERHEAT_MS / 1000}s it is too hot to hold and detonates for ${SAW_BLAST_DMG} inside ${SAW_BLAST_R}px, you included. Press the key again to cut the motor.`,
      count: Math.round(Math.max(0, SAW_OVERHEAT_MS - (time - s.sawFrom)) / 100) / 10, suffix: 's',
      priority: 114,
    } : null);

    const egg = this.vesselsOf('player', 'egg')[0];
    this.api.setStatusIndicator('magma-egg', playerIsMagma && egg ? {
      name: 'Dragon Egg', emoji: '🥚', color: MAG.scaleLit,
      description: `Attack your own egg to pressurise it. At ${EGG_MAX} it hatches.`,
      count: Math.floor(egg?.pressure ?? 0), suffix: ` / ${EGG_MAX}`, priority: 118,
    } : null);

    const volcanoes = this.vesselsOf('player', 'volcano');
    const hottest = volcanoes.reduce((m, v) => Math.max(m, v.pressure), 0);
    const over = volcanoes.reduce((m, v) => Math.max(m, v.over), 0);
    this.api.setStatusIndicator('magma-volcano', playerIsMagma && volcanoes.length ? {
      name: over > 0 ? 'Supercritical' : 'Volcano', emoji: '🌋', color: over > 0 ? MAG.white : MAG.magma,
      description: over > 0
        ? `Past the cap and still taking it. ${Math.round(over)} overfill banked — the collapse is up to ${Math.round(VOLC_COLLAPSE_DMG + over * OVERFILL_DMG_PER)} in a ${Math.round(VOLC_COLLAPSE_R + over * OVERFILL_R_PER)}px blast. Keep hitting it until it goes.`
        : `Attack it to raise its pressure — more pressure means more lava and more rock. At ${VOLCANO_MAX} it goes critical and collapses.`,
      count: over > 0 ? Math.round(over) : Math.round(hottest),
      suffix: over > 0 ? ' over' : ` / ${VOLCANO_MAX}`, priority: 120,
    } : null);

    // The victim side: hostile lava under the local player's feet.
    const standing = this.pools.some((p) => p.owner === 'npc' && time >= p.landAt
      && Phaser.Math.Distance.Between(p.x, p.y, this.api.player.x, this.api.player.y) <= POOL_R);
    this.api.setStatusIndicator('magma-scalded', standing ? {
      name: 'Standing In Lava', emoji: '🔥', color: MAG.lava,
      description: `You are standing in someone else's magma — ${POOL_DPS} a second for as long as you do. Step out of it.`,
      priority: 15,
    } : null);
  }

  // ── Accessors read by ArenaScene / the npc ─────────────────────────────────

  /** Dragon Kin's haste. Pulled by ArenaScene, not pushed — its update runs after movement. */
  private speedMultFor(owner: Owner): number {
    return this.isMagma(owner) && this.isDragon(owner) ? DRAGON_SPEED : 1;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** True while the hatched window is running — the AI plays very differently inside it. */
  isDragonActive(owner: Owner): boolean { return this.isDragon(owner); }

  isJetActive(owner: Owner): boolean { return this.side(owner).jetUntil > this.now; }

  /** True while a saw is out — the bot stops asking for other abilities while one is running. */
  isSawActive(owner: Owner): boolean { return this.side(owner).sawFrom > 0; }

  /** The slot Magma Saw took, so the bot's routine stops asking for the ability underneath it. */
  npcSawSlot(): 'e' | 'r' | 'f' | 'q' | null { return this.sawSlot('npc'); }

  /**
   * Obsidian Coat (mastery): where the bot needs to be standing when its own critical cone
   * finally comes down, or null when there is nothing to catch. Side-effect-free — `NpcAiState`
   * is rebuilt every frame.
   */
  npcObsidianPoint(): { x: number; y: number } | null {
    if (!this.masteryOn('npc')) return null;
    const f = this.api.npc;
    if (!f || !f.active || f.hp <= 0) return null;
    // Only worth walking to a cone that has actually banked overfill — an ordinary collapse
    // leaves nothing to wear.
    const v = this.vesselsOf('npc', 'volcano')
      .filter((o) => o.blowAt > 0 && o.over > 0)
      .sort((a, b) => a.blowAt - b.blowAt)[0];
    return v ? { x: v.x, y: v.y } : null;
  }

  /** Online: the opponent's saw, replayed on this (victim) sim. */
  doNpcSaw(): void {
    const s = this.sides.npc;
    if (s.sawFrom > 0) return;
    s.sawHoldFrom = this.now;
    // The replica is not told how long the saw was charged for — it simply runs until the
    // caster says stop, or until its own eight seconds run out, which is the same clock.
    this.startSaw('npc', this.now, Infinity);
  }

  /** Online: the opponent cut their motor, or their saw simply ran out. */
  doNpcSawOff(): void {
    if (this.sides.npc.sawFrom > 0) this.stopSaw('npc', 'spent');
  }

  isBloatActive(owner: Owner): boolean { return this.side(owner).bloatUntil > this.now; }

  /** How many volcanoes this side has standing — the AI stops at the cap. */
  volcanoCount(owner: Owner): number { return this.vesselsOf(owner, 'volcano').length; }

  hasEgg(owner: Owner): boolean { return this.vesselsOf(owner, 'egg').length > 0; }

  /**
   * Where the AI should aim if it wants to charge something of its own, or null when there is
   * nothing left to fill. The egg comes first: it is the expensive one, and the only one that
   * expires having paid out nothing at all.
   */
  chargeTarget(owner: Owner): { x: number; y: number } | null {
    const list = [...this.vesselsOf(owner, 'egg'), ...this.vesselsOf(owner, 'volcano')]
      .filter((v) => v.pressure < v.max);
    return list.length ? { x: list[0].x, y: list[0].y } : null;
  }

  /**
   * Ability tray fill. Three of the five spend most of their life showing something other than
   * a cooldown — a live fist's clock, a bloat's window, and Q's whole pressure-then-dragon arc.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;

    // Mastery: while it is winding up the card fills with the rev; while it is cutting it
    // drains with the heat, hitting empty exactly when the saw goes off.
    if (abilityId === 'magma-saw') {
      if (s.sawFrom > 0) return Phaser.Math.Clamp(1 - this.sawHeat('player', time), 0, 1);
      if (s.sawHoldFrom > 0) {
        return Phaser.Math.Clamp((time - s.sawHoldFrom) / SAW_HOLD_MAX_MS, 0, 1);
      }
      return Phaser.Math.Clamp((time - s.sawCastAt) / SAW_COOLDOWN_MS, 0, 1);
    }
    if (abilityId === 'magma-jet' && s.jetUntil > time) {
      return Phaser.Math.Clamp(1 - s.jetSpent / JET_MAX_MS, 0, 1);
    }
    if (abilityId === 'magma-bloat' && s.bloatUntil > time) {
      return Phaser.Math.Clamp((s.bloatUntil - time) / BLOAT_MS, 0, 1);
    }
    if (abilityId === 'magma-dragon-kin') {
      if (this.isDragon('player')) return Phaser.Math.Clamp((s.dragonUntil - time) / DRAGON_MS, 0, 1);
      const egg = this.vesselsOf('player', 'egg')[0];
      if (egg) return Phaser.Math.Clamp(egg.pressure / egg.max, 0, 1);
    }
    if (abilityId === 'magma-volcano') {
      const hottest = this.vesselsOf('player', 'volcano')
        .reduce((m, v) => Math.max(m, (v.pressure + v.over) / v.max), 0);
      if (hottest > 0) return Phaser.Math.Clamp(hottest, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Pressure vessels — volcanoes and dragon eggs alike. A vessel razed this way is simply
   * gone: it does not top out, so nothing erupts and nothing hatches.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      return true;
    };
    let razed = 0;
    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const v = this.vessels[i];
      if (v.owner === exceptOwner || !near(v.x, v.y)) continue;
      this.vessels.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
