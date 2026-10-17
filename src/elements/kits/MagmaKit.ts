import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import type { Projectile } from '../../combat/Projectile';
import {
  MAG, MagmaAvatar, MagmaColorFn, MagmaFx, breathCone, cannonball, lavaRock, magmaSaw,
  moltenPool, mortarShell, obsidianCoat, pirateShip, pirateSpirit, pressureGauge, volcanoCone,
} from './MagmaVisuals';
import { meterGain } from '../../combat/Meters';
import { FONT_DISPLAY, FONT_UI } from '../../ui/Theme';

type Owner = 'player' | 'npc';

/**
 * Magma — a melting pirate whose volcanoes are charged by his own attacks.
 *
 * The thing that makes the element what it is: a volcano you never hit is a slow trickle of
 * lava, and a volcano you stand next to and beat on erupts in six seconds and takes the arena
 * with it. So every damage source below routes through one chokepoint — `feed` — and the
 * question "does this hurt them or does it charge me" is answered per-object, not per-ability.
 *
 * The other two buttons are the pirate's. Blunder-Boil (F) is a blunderbuss of lava with a
 * recoil that throws *you*, so aiming and retreating are one press. Molten Mutiny (Q) is a
 * cursed pendant that skims a fifth of everything you deal — damage and pressure alike — and
 * when it has taken fifty it wakes the ship: three hundred points of burning hull you steer
 * with the cursor, six cannons on the click, and a deck you can jump off and back onto.
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

// ── Blunder-Boil (F) ─────────────────────────────────────────────────────────
/**
 * A blunderbuss of lava. The cone goes at the cursor and the recoil throws the pirate the other
 * way, hard — so aiming at somebody and getting away from them are the same press, and the
 * ability is as much a disengage as an attack. Two charges, each three seconds to come back.
 */
const BLUNDER_CHARGES = 2;
const BLUNDER_RECHARGE_MS = 3000;
const BLUNDER_RANGE = 160;
const BLUNDER_HALF = 0.5;
const BLUNDER_DMG = 15;
const BLUNDER_FEED = 15;
/** How far the recoil carries the pirate, and over how long. */
const BLUNDER_LAUNCH = 240;
const BLUNDER_LAUNCH_MS = 380;
const BLUNDER_ENEMY_SHOVE = 60;
/** The real refusal lives on the charge count; this only stops a double-press firing twice. */
const BLUNDER_TAP_MS = 300;

// ── Pressure Gauge (F+) ──────────────────────────────────────────────────────
/**
 * A third charge, and a gauge that only runs while all three are banked: the longer you sit on
 * a full gun the harder it kicks, until it has been full so long it goes off in your hands.
 */
const GAUGE_CHARGES = 3;
/** Time at three charges for the gauge to read full. */
const GAUGE_FULL_MS = 9000;
/** Time *at* full before the gun is overpressured and the next press detonates. */
const GAUGE_OVER_MS = 6000;
const GAUGE_DMG_BONUS = 20;
const GAUGE_LAUNCH_BONUS = 200;
/** Pressure from which the pirate himself is a projectile while the recoil carries him. */
const GAUGE_CONTACT_AT = 0.6;
const GAUGE_CONTACT_DMG = 18;
const GAUGE_CONTACT_R = 34;
const GAUGE_BLAST_DMG = 35;
const GAUGE_BLAST_R = 120;

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

// ── Molten Mutiny (Q) ────────────────────────────────────────────────────────
/** The pendant's cut of everything you deal — damage to a body and pressure into a vessel alike. */
const PENDANT_TAX = 0.2;
/** How much it has to have taken before the ship wakes. */
const PENDANT_AWAKEN = 50;
const SHIP_HP = 300;
const SHIP_DECAY_PER_S = 15;
const SHIP_SPEED = 115;
/** The hull as a hit shape — a circle, because the real shape is a long boat nobody can see the edge of. */
const SHIP_HULL_R = 36;
/** How close the pirate has to be to jump back aboard. */
const SHIP_MOUNT_R = 84;
const SHIP_RAM_DMG = 8;
const SHIP_RAM_SHOVE = 110;
const SHIP_RAM_GAP_MS = 700;
/** The ship has to be actually under way to ram — parked against somebody it does nothing. */
const SHIP_RAM_MIN_SPEED = 40;
const CANNONS = 6;
const CANNON_SPEED = 430;
const CANNON_DMG = 26;
const CANNON_HIT_R = 20;
const CANNON_SHOVE = 170;
const CANNON_LIFE_MS = 1500;
const CANNON_SPREAD = 0.12;
const MAX_CANNONBALLS = 40;

// ── Pirate King (Q+) ─────────────────────────────────────────────────────────
const SPIRIT_EVERY_MIN_MS = 4000;
const SPIRIT_EVERY_MAX_MS = 5000;
const SPIRIT_HP = 50;
const SPIRIT_DECAY_PER_S = 8;
const SPIRIT_MAX = 3;
const SPIRIT_DASH_MIN_MS = 2000;
const SPIRIT_DASH_MAX_MS = 3000;
const SPIRIT_DASH_MS = 320;
const SPIRIT_DASH_DIST = 240;
/** How far away a spirit will still bother lunging. */
const SPIRIT_DASH_RANGE = 360;
const SPIRIT_DMG = 20;
const SPIRIT_HIT_R = 22;
/** The fire a lunge leaves behind it: small pools, close together, short-lived. */
const TRAIL_R = 15;
const TRAIL_LIFE_MS = 1400;
const TRAIL_GAP_PX = 18;

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
const SAW_MIN_MS = 1250;
/** Too hot to hold. A saw that reaches this detonates, and a full rev runs exactly to it. */
const SAW_OVERHEAT_MS = 4000;
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
const NPC_SAW_COMMIT_MS = 3600;

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
  /** Radius and lifetime — Plume's 27px/6s, or a spirit's trail at 15px/1.4s. */
  r: number;
  life: number;
  /**
   * Mag-Mortar (Click+): damage this glob does *on landing*, before it settles into an
   * ordinary pool. 0 for a plain plume glob, which is the base ability.
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

/** A pressure vessel — the volcano. Fed by its owner's attacks, and it pays out at 100. */
interface Vessel {
  owner: Owner;
  kind: 'volcano';
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
  /** When the collapse lands. 0 until it tops out. */
  blowAt: number;
  /** Brief white-out after being fed, so a hit on your own summon reads as a hit. */
  flashUntil: number;
  /**
   * Supercritical (E+): pressure forced in *after* the cap, while the cone is already
   * screaming. Paid back on the collapse and nowhere else.
   */
  over: number;
}

/** Molten Mutiny's ship. One per side, and the side's captain is either aboard it or not. */
interface Ship {
  owner: Owner;
  x: number;
  y: number;
  heading: number;
  hp: number;
  seed: number;
  mounted: boolean;
  /** How fast the hull is moving this frame, for the ram and the wake. */
  speed: number;
  /** Per-victim ram clock, so a hull parked against somebody is one hit and not sixty a second. */
  ramAt: Map<Fighter, number>;
  /** Pirate King (Q+): when the next spirit climbs out of the hull. */
  nextSpiritAt: number;
  /** Brief white-out when the hull takes a hit. */
  flashUntil: number;
}

/** One round of a broadside. Kills on a body, or on the first volcano of its owner's it crosses. */
interface Cannonball {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  seed: number;
}

/** Pirate King (Q+): a crewman of flame hanging over the deck, who lunges at people. */
interface Spirit {
  owner: Owner;
  x: number;
  y: number;
  hp: number;
  seed: number;
  /** Where he hangs around the ship. */
  orbit: number;
  facing: number;
  nextDashAt: number;
  /** 0 while hovering; the end of the lunge while lunging. */
  dashUntil: number;
  dashFrom: number;
  dashVx: number;
  dashVy: number;
  /** Already cut somebody on this lunge. */
  dashHit: boolean;
  /** Distance travelled since the last trail pool was dropped. */
  trailAcc: number;
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

  // Blunder-Boil
  blunderCharges: number;
  /** When the next charge comes back. Only one is ever in flight. */
  blunderRechargeAt: number;
  /** Pressure Gauge (F+): when the gun last filled to three charges, or 0 while it is not full. */
  gaugeFullAt: number;
  /** The recoil, played out as position. 0 while the pirate is on his feet. */
  flyUntil: number;
  flyFrom: number;
  flyX0: number;
  flyY0: number;
  flyAng: number;
  flyDist: number;
  /** Pressure Gauge (F+): the gauge reading when he was launched — decides whether he is a projectile. */
  flyHot: number;
  flyHit: Set<Fighter>;

  // Molten Mutiny
  pendantOn: boolean;
  /** What the pendant has taken so far, out of PENDANT_AWAKEN. */
  pendantPower: number;
  /** Fractional damage the tax has skimmed but not yet been able to take off a whole hit. */
  taxCarry: number;
  ship: Ship | null;
  shipSavedAbsorber: ((amount: number) => boolean) | null;
  shipAbsorberInstalled: boolean;

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
    blunderCharges: BLUNDER_CHARGES,
    blunderRechargeAt: 0,
    gaugeFullAt: 0,
    flyUntil: 0,
    flyFrom: 0,
    flyX0: 0,
    flyY0: 0,
    flyAng: 0,
    flyDist: 0,
    flyHot: 0,
    flyHit: new Set(),
    pendantOn: false,
    pendantPower: 0,
    taxCarry: 0,
    ship: null,
    shipSavedAbsorber: null,
    shipAbsorberInstalled: false,
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
  /** Everything in the air. The ship's hull and the spirits stop enemy shots with their bodies. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** Space: off the ship and back onto it. Only read while `suppressesDodge()` says so. */
  get spaceKey(): Phaser.Input.Keyboard.Key;
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
  /** The ship's hull and deck: over the lava, under the fighters, because the captain stands on it. */
  private hullGfx: Phaser.GameObjects.Graphics | null = null;
  /** Things standing on the floor: vessels, flying rock, cannonballs, the ship's rigging. Over the fighters. */
  private objGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pressure gauges, which must clear the vessels they belong to. */
  private gaugeGfx: Phaser.GameObjects.Graphics | null = null;
  /** The blunderbuss cone, the saw, the spirits — the only things allowed over everything. */
  private fistGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private hudHint: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private pools: Pool[] = [];
  private rocks: Rock[] = [];
  private vessels: Vessel[] = [];
  private cannonballs: Cannonball[] = [];
  private spirits: Spirit[] = [];
  private shoves: Shove[] = [];
  /** Fractional pool damage carried between frames, per victim. */
  private burnAccum = new Map<Fighter, number>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  /** Every absorber this kit has installed, so `reset` can tell its own from a stranger's. */
  private ourAbsorbers = new WeakSet<(amount: number) => boolean>();

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

  /** Shop upgrades, for whichever side is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  private vesselsOf(owner: Owner): Vessel[] {
    return this.vessels.filter((v) => v.owner === owner);
  }

  private shipOf(owner: Owner): Ship | null { return this.side(owner).ship; }

  private mounted(owner: Owner): boolean { return !!this.side(owner).ship?.mounted; }

  /**
   * The one way the kit ever hurts a body. Molten Mutiny's pendant takes its fifth here — of
   * everything, the saw's single points included — and banks it, so "20% of the damage you
   * would have dealt" is one rule rather than a tax written into eleven places. The skim is
   * carried fractionally so a stream of 1-point burn ticks still pays exactly a fifth.
   */
  private strike(owner: Owner, t: Fighter, amount: number, opts?: Parameters<Fighter['takeDamage']>[1]): void {
    const s = this.side(owner);
    let dealt = amount;
    if (s.pendantOn && amount > 0) {
      const tax = amount * PENDANT_TAX + s.taxCarry;
      const whole = Math.floor(tax);
      s.taxCarry = tax - whole;
      dealt = amount - whole;
      this.addPendant(owner, amount * PENDANT_TAX);
    }
    if (dealt > 0) t.takeDamage(dealt, opts);
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
        // Two absorbers may be stacked (ship under bloat, or bloat under ship). Whichever went
        // on second saved the first one's closure; the first saved the fighter's original. So
        // the original is whichever saved value is *not* one of ours.
        if (s.absorberInstalled && s.shipAbsorberInstalled) {
          const shipWasSecond = !!s.shipSavedAbsorber && this.ourAbsorbers.has(s.shipSavedAbsorber);
          f.damageAbsorber = shipWasSecond ? s.savedAbsorber : s.shipSavedAbsorber;
        } else if (s.absorberInstalled) {
          f.damageAbsorber = s.savedAbsorber;
        } else if (s.shipAbsorberInstalled) {
          f.damageAbsorber = s.shipSavedAbsorber;
        }
        f.magmaIncomingMult = 1;
        // Obsidian Coat rides on the *shared* outgoing multiplier, so it has to divide its own
        // contribution back out rather than resetting the field somebody else may also own.
        if (s.coatOutApplied !== 1) f.outgoingDamageMult /= s.coatOutApplied;
      }
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.pools = [];
    this.rocks = [];
    this.vessels = [];
    this.cannonballs = [];
    this.spirits = [];
    this.shoves = [];
    this.ourAbsorbers = new WeakSet();
    this.burnAccum.clear();
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.hullGfx?.destroy(); this.hullGfx = null;
    this.objGfx?.destroy(); this.objGfx = null;
    this.gaugeGfx?.destroy(); this.gaugeGfx = null;
    this.fistGfx?.destroy(); this.fistGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.hudHint?.destroy(); this.hudHint = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'magma') return;
    // Latched before anything else: the cursor is where the ship is going, and a frame that
    // early-outs on an ability still has to steer.
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

    // Space: off the deck, or back onto it. Only consumed while the dodge is suppressed for
    // exactly this reason — otherwise this `JustDown` would eat ArenaScene's roll.
    if (this.suppressesDodge() && Phaser.Input.Keyboard.JustDown(this.api.spaceKey)) {
      if (this.mounted('player')) this.dismount('player', 'jump');
      else this.mount('player');
    }

    if (clicked) p.castAbility('magma-plume', ctx);
    if (saw !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('magma-volcano', ctx);
    if (saw !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('magma-bloat', ctx);
    if (saw !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('magma-blunder', ctx);
    if (saw !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('magma-mutiny', ctx);

    // Bloat Bomb (R+): holding R is the whole upgrade, so the key state is read every frame
    // rather than only on the press that cast it.
    s.bombHeld = this.up('player', 'r') && this.api.rKey.isDown && s.bloatUntil > this.now;
  }

  /**
   * Space belongs to the ship while the player is aboard it or standing close enough to board.
   * Read by ArenaScene's dodge block, so one press is never both a jump and a roll.
   */
  suppressesDodge(): boolean {
    if (this.api.elementId !== 'magma') return false;
    const s = this.sides.player;
    if (!s.ship) return false;
    if (s.ship.mounted) return true;
    const f = this.api.player;
    return !!f && Phaser.Math.Distance.Between(f.x, f.y, s.ship.x, s.ship.y) <= SHIP_MOUNT_R;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Plume, or the broadside while at the helm. One ability id covers both because the
   * two are never available at the same time, and the ship owning your click is the point.
   */
  doPlume(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;

    if (this.mounted(owner)) { this.fireCannons(owner, tx, ty); return; }

    // Obsidian Coat (mastery) widens the fan rather than making each glob hotter — the pools
    // never stack, so the only thing extra shots can buy is more ground, which is the point.
    s.plumeTotal = PLUME_COUNT + this.coatShots(owner);
    s.plumeLeft = s.plumeTotal;
    s.plumeNextAt = this.now;
    s.plumeAng = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('sweep', s.plumeAng);
  }

  /** E — Volcano. */
  doVolcano(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f) return;
    const mine = this.vesselsOf(owner);
    // Oldest goes if the pair is already out, so the ability never becomes uncastable.
    if (mine.length >= MAX_VOLCANOES) this.removeVessel(mine[0]);

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

  /** R — Magma Bloat. */
  doBloat(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    s.bloatUntil = this.now + BLOAT_MS;
    this.installAbsorber(owner);
    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.setVenting(true);
    const fx = this.fx(owner);
    fx.shock(f.x, f.y, 10, 44, MAG.gold, 420);
    fx.ember(f.x, f.y - 6, 10, 30, 600);
    this.api.showFloatingText(f.x, f.y - 48, '🫧 BLOATED', this.hex(MAG.gold));
  }

  // ── Blunder-Boil ───────────────────────────────────────────────────────────

  private blunderMax(owner: Owner): number {
    return this.up(owner, 'f') ? GAUGE_CHARGES : BLUNDER_CHARGES;
  }

  /** Pressure Gauge (F+): 0–1, how long the gun has sat full. 0 without the upgrade. */
  private gaugePressure(owner: Owner): number {
    const s = this.side(owner);
    if (!this.up(owner, 'f') || s.gaugeFullAt <= 0) return 0;
    return Phaser.Math.Clamp((this.now - s.gaugeFullAt) / GAUGE_FULL_MS, 0, 1);
  }

  /** Pressure Gauge (F+): the gun has been full too long and the next press is a detonation. */
  private gaugeOver(owner: Owner): boolean {
    const s = this.side(owner);
    if (!this.up(owner, 'f') || s.gaugeFullAt <= 0) return false;
    return this.now - s.gaugeFullAt >= GAUGE_FULL_MS + GAUGE_OVER_MS;
  }

  /**
   * F — Blunder-Boil.
   *
   * The cone goes at the cursor and the pirate goes the other way. With Pressure Gauge (F+)
   * the gauge reading at the moment of the press is folded into both halves — more damage in
   * the cone, more distance on the recoil, and past 60% the pirate is a cannonball himself for
   * the length of the flight. A gun left full too long does not fire at all: it bursts.
   */
  doBlunder(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    if (s.blunderCharges <= 0) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 52,
          `🔫 RELOADING ${Math.max(0, (s.blunderRechargeAt - this.now) / 1000).toFixed(1)}s`, '#8a8a8a');
      }
      return;
    }
    const pressure = this.gaugePressure(owner);
    const over = this.gaugeOver(owner);
    const max = this.blunderMax(owner);
    // Only one charge is ever reloading; the clock starts on the shot that broke the stack.
    if (s.blunderCharges >= max) s.blunderRechargeAt = this.now + BLUNDER_RECHARGE_MS;
    s.blunderCharges--;
    s.gaugeFullAt = 0;

    // Fired from the deck, the recoil takes you off it — the ship stays where it is.
    if (this.mounted(owner)) this.dismount(owner, 'recoil');

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);
    this.avatar(owner)?.play('punch', ang);
    this.avatar(owner)?.setVenting(true);

    if (over) {
      this.gaugeBlast(owner, f);
    } else {
      const dmg = Math.round(BLUNDER_DMG + GAUGE_DMG_BONUS * pressure);
      let caught = 0;
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d > BLUNDER_RANGE) continue;
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
        // Widens with distance the way a real cone does, rather than being a fixed wedge.
        if (off > BLUNDER_HALF + 14 / Math.max(24, d)) continue;
        this.strike(owner, t, dmg);
        caught++;
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
        this.shove(t, ang, BLUNDER_ENEMY_SHOVE + pressure * 60);
        this.api.showFloatingText(t.x, t.y - 44, `🔫 ${dmg}`, this.hex(MAG.lava));
      }
      this.record(owner, 'blunderHits', caught);
      // Same geometry as the damage, so a cone across your own volcano charges it.
      const midX = f.x + Math.cos(ang) * BLUNDER_RANGE * 0.55;
      const midY = f.y + Math.sin(ang) * BLUNDER_RANGE * 0.55;
      this.feed(owner, midX, midY, BLUNDER_RANGE * 0.5, BLUNDER_FEED + GAUGE_DMG_BONUS * pressure);
      fx.erupt(f.x + Math.cos(ang) * 16, f.y + Math.sin(ang) * 16, 36 + pressure * 20, pressure > 0.6 ? MAG.white : MAG.lava);
      fx.shock(f.x, f.y, 10, 54, MAG.gold, 380);
      this.api.showFloatingText(f.x, f.y - 52,
        pressure > 0.02 ? `💥 BLUNDER-BOIL ${Math.round(pressure * 100)}%` : '💥 BLUNDER-BOIL', this.hex(MAG.lava));
    }

    // ── The recoil ──
    s.flyFrom = this.now;
    s.flyUntil = this.now + BLUNDER_LAUNCH_MS;
    s.flyX0 = f.x;
    s.flyY0 = f.y;
    s.flyAng = ang + Math.PI;
    s.flyDist = BLUNDER_LAUNCH + GAUGE_LAUNCH_BONUS * pressure;
    s.flyHot = pressure;
    s.flyHit.clear();
    fx.smoke(f.x, f.y, 5, 700);
    Sfx.playAt('explosion-small', f.x, { volume: 0.7, rate: 0.9 + pressure * 0.3 });
    this.api.scene.cameras.main.shake(140 + pressure * 120, 0.004 + pressure * 0.004);
  }

  /** Pressure Gauge (F+): the gun bursts. Everybody inside 120px pays, the pirate first. */
  private gaugeBlast(owner: Owner, f: Fighter): void {
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, GAUGE_BLAST_R * 0.7, MAG.magma);
    fx.shock(f.x, f.y, 20, GAUGE_BLAST_R, MAG.white, 640);
    fx.smoke(f.x, f.y, 14, 1300);
    Sfx.playAt('explosion-large', f.x, { volume: 0.85, rate: 0.9 });
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > GAUGE_BLAST_R) continue;
      this.strike(owner, t, GAUGE_BLAST_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.magma));
      this.shove(t, Math.atan2(t.y - f.y, t.x - f.x), 160);
      this.api.showFloatingText(t.x, t.y - 44, `💥 ${GAUGE_BLAST_DMG}`, this.hex(MAG.magma));
    }
    // Online, the pirate may be a replica — their own sim has already charged them, and
    // `takeDamage` on a netGhost relays the number straight back as a second helping.
    if (!f.netGhost) f.takeDamage(GAUGE_BLAST_DMG, { selfInflicted: true });
    this.feed(owner, f.x, f.y, GAUGE_BLAST_R, 40);
    this.api.showFloatingText(f.x, f.y - 56, `💀 OVERPRESSURE −${GAUGE_BLAST_DMG}`, this.hex(MAG.white));
    this.api.scene.cameras.main.shake(380, 0.011);
  }

  /**
   * The recoil, played out as position so neither movement system can erase it. Eases out over
   * its 380ms, so the pirate is thrown and then skids rather than stopping dead. While hot (F+)
   * he is a 34px projectile and anyone he passes through is hit once.
   */
  private updateFly(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.flyUntil <= time) {
      if (s.flyUntil > 0) {
        s.flyUntil = 0;
        s.flyHot = 0;
      }
      return;
    }
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.flyUntil = 0; return; }
    const u = Phaser.Math.Clamp((time - s.flyFrom) / BLUNDER_LAUNCH_MS, 0, 1);
    const ease = 1 - (1 - u) * (1 - u);
    const nx = this.clampX(s.flyX0 + Math.cos(s.flyAng) * s.flyDist * ease);
    const ny = this.clampY(s.flyY0 + Math.sin(s.flyAng) * s.flyDist * ease);
    f.setPosition(nx, ny);
    (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.fx(owner).ember(f.x - Math.cos(s.flyAng) * 10, f.y - Math.sin(s.flyAng) * 10, 2, 14,
      300, s.flyHot >= GAUGE_CONTACT_AT ? MAG.white : MAG.ember);

    // Pressure Gauge (F+): hot enough, and the pirate is the shot.
    if (s.flyHot < GAUGE_CONTACT_AT) return;
    for (const t of this.targetsOf(owner)) {
      if (s.flyHit.has(t)) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > GAUGE_CONTACT_R) continue;
      s.flyHit.add(t);
      this.strike(owner, t, GAUGE_CONTACT_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.white));
      this.fx(owner).erupt(t.x, t.y, 30, MAG.gold);
      this.shove(t, s.flyAng, 90);
      this.api.showFloatingText(t.x, t.y - 44, `🏴‍☠️ ${GAUGE_CONTACT_DMG} — RAMMED`, this.hex(MAG.gold));
    }
  }

  /** Charges come back one at a time; the gauge (F+) starts the moment the gun is full. */
  private updateBlunder(owner: Owner, time: number): void {
    const s = this.side(owner);
    const max = this.blunderMax(owner);
    if (s.blunderCharges < max && time >= s.blunderRechargeAt) {
      s.blunderCharges++;
      if (s.blunderCharges < max) s.blunderRechargeAt = time + BLUNDER_RECHARGE_MS;
    }
    if (this.up(owner, 'f')) {
      if (s.blunderCharges >= max) {
        if (s.gaugeFullAt <= 0) s.gaugeFullAt = time;
      } else {
        s.gaugeFullAt = 0;
      }
    } else {
      s.gaugeFullAt = 0;
    }
    // The overpressure moment, said once — six seconds of sitting on a full gun is long enough
    // to have forgotten it was loaded.
    const f = this.fighter(owner);
    if (f && owner === 'player' && s.gaugeFullAt > 0
      && time - s.gaugeFullAt >= GAUGE_FULL_MS + GAUGE_OVER_MS
      && time - s.gaugeFullAt < GAUGE_FULL_MS + GAUGE_OVER_MS + 40) {
      this.api.showFloatingText(f.x, f.y - 56, '💀 OVERPRESSURED', this.hex(MAG.white));
      this.fx(owner).smoke(f.x, f.y - 10, 6, 900);
    }
  }

  // ── Molten Mutiny ──────────────────────────────────────────────────────────

  /** Q — don the pendant, or take it off again. Unavailable while the ship is out. */
  doMutiny(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    if (s.ship) {
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 52, "🏴‍☠️ SHIP'S OUT", '#8a8a8a');
      return;
    }
    const fx = this.fx(owner);
    if (s.pendantOn) {
      // Taking it off discards what it took — the curse keeps its cut.
      s.pendantOn = false;
      s.pendantPower = 0;
      s.taxCarry = 0;
      fx.smoke(f.x, f.y, 5, 700);
      this.api.showFloatingText(f.x, f.y - 52, '📿 PENDANT OFF', '#8a8a8a');
      return;
    }
    s.pendantOn = true;
    s.pendantPower = 0;
    s.taxCarry = 0;
    this.avatar(owner)?.play('raise');
    fx.shock(f.x, f.y, 8, 50, MAG.pendant, 520);
    fx.ember(f.x, f.y - 4, 8, 24, 640, MAG.pendantLit);
    this.api.showFloatingText(f.x, f.y - 52, '📿 MOLTEN MUTINY', this.hex(MAG.pendantLit));
  }

  /** The pendant takes its cut. At fifty, the ship. */
  private addPendant(owner: Owner, amount: number): void {
    const s = this.side(owner);
    if (!s.pendantOn || amount <= 0) return;
    const before = s.pendantPower;
    s.pendantPower = Math.min(PENDANT_AWAKEN, s.pendantPower + amount);
    const f = this.fighter(owner);
    if (f && Math.floor(s.pendantPower / 10) > Math.floor(before / 10)) {
      this.fx(owner).ember(f.x, f.y + 6, 3, 10, 420, MAG.pendantLit);
    }
    if (s.pendantPower >= PENDANT_AWAKEN) this.awaken(owner);
  }

  /** Fifty taken. The pendant is spent and the ship comes up under the pirate's feet. */
  private awaken(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.pendantOn = false;
    s.pendantPower = 0;
    s.taxCarry = 0;
    if (!f || !f.active || f.hp <= 0) return;
    s.ship = {
      owner, x: f.x, y: f.y,
      heading: Math.atan2(s.curY - f.y, s.curX - f.x),
      hp: SHIP_HP, seed: Math.random() * 999, mounted: false, speed: 0,
      ramAt: new Map(),
      nextSpiritAt: this.now + SPIRIT_EVERY_MIN_MS,
      flashUntil: 0,
    };
    this.mount(owner);
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, 90, MAG.magma);
    fx.shock(f.x, f.y, 20, 150, MAG.gold, 700);
    fx.shock(f.x, f.y, 14, 110, MAG.pendantLit, 620);
    fx.smoke(f.x, f.y - 20, 12, 1400);
    fx.ember(f.x, f.y, 20, 70, 1000, MAG.gold);
    Sfx.playAt('roar', f.x, { volume: 0.8, rate: 0.75 });
    this.api.showFloatingText(f.x, f.y - 64, '🏴‍☠️ THE SHIP RISES', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(380, 0.009);
    this.record(owner, 'mutinies', 1);
  }

  /** Aboard. The hull takes every hit meant for the captain from here on. */
  private mount(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.ship || s.ship.mounted || !f) return;
    s.ship.mounted = true;
    this.installShipAbsorber(owner);
    this.avatar(owner)?.setHelm(true);
    this.avatar(owner)?.play('raise');
    this.fx(owner).ember(f.x, f.y + 8, 6, 20, 480, MAG.gold);
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 52, '⚓ ABOARD', this.hex(MAG.gold));
  }

  /**
   * Off the deck. `jump` is the player choosing to; `recoil` is the blunderbuss throwing them;
   * `sunk` is the deck going out from under them. The ship stays exactly where it is.
   */
  private dismount(owner: Owner, why: 'jump' | 'recoil' | 'sunk'): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.ship?.mounted) return;
    s.ship.mounted = false;
    this.uninstallShipAbsorber(owner);
    this.avatar(owner)?.setHelm(false);
    if (!f) return;
    if (why === 'jump') {
      // Over the side, toward the cursor, far enough to be clear of the hull.
      const a = Math.atan2(s.curY - f.y, s.curX - f.x);
      f.setPosition(this.clampX(s.ship.x + Math.cos(a) * (SHIP_HULL_R + 14)),
        this.clampY(s.ship.y + Math.sin(a) * (SHIP_HULL_R + 14)));
      this.fx(owner).ember(f.x, f.y + 8, 5, 18, 420);
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 52, '🪂 OVER THE SIDE', '#8a8a8a');
    }
  }

  private installShipAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.shipAbsorberInstalled) return;
    s.shipSavedAbsorber = f.damageAbsorber;
    s.shipAbsorberInstalled = true;
    const absorber = (amount: number): boolean => {
      const st = this.side(owner);
      if (!st.ship?.mounted) return false;
      this.hurtShip(st.ship, amount);
      return true;
    };
    this.ourAbsorbers.add(absorber);
    f.damageAbsorber = absorber;
  }

  private uninstallShipAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.shipAbsorberInstalled) return;
    if (f) f.damageAbsorber = s.shipSavedAbsorber;
    s.shipAbsorberInstalled = false;
    s.shipSavedAbsorber = null;
  }

  private hurtShip(ship: Ship, amount: number): void {
    if (amount <= 0) return;
    ship.hp -= amount;
    ship.flashUntil = this.now + 110;
    this.fx(ship.owner).ember(ship.x + (Math.random() - 0.5) * 40, ship.y + (Math.random() - 0.5) * 16, 3, 14, 420);
    if (ship.owner === 'player' || amount >= 8) {
      this.api.showFloatingText(ship.x + (Math.random() - 0.5) * 30, ship.y - 46, `⚓ −${Math.round(amount)}`, this.hex(MAG.ash));
    }
  }

  /**
   * The ship, every frame: the hull burning down at fifteen a second, steering for the cursor
   * while the captain is aboard, carrying him, ramming what it runs into, stopping enemy shots
   * with its hull, and — with Pirate King — putting crew over the side.
   */
  private updateShip(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    const ship = s.ship;
    if (!ship) return;
    const f = this.fighter(owner);

    ship.hp -= SHIP_DECAY_PER_S * dt;
    if (ship.hp <= 0) { this.sink(owner); return; }

    // ── Steering ──
    ship.speed = 0;
    if (ship.mounted && f && f.active && f.hp > 0) {
      const dx = s.curX - ship.x;
      const dy = s.curY - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const step = Math.min(dist, SHIP_SPEED * dt);
        ship.x = this.clampX(ship.x + (dx / dist) * step);
        ship.y = this.clampY(ship.y + (dy / dist) * step);
        ship.speed = step / Math.max(dt, 0.0001);
        const want = Math.atan2(dy, dx);
        ship.heading += Phaser.Math.Angle.Wrap(want - ship.heading) * Math.min(1, dt * 4);
      }
      // The captain is where the deck is. Written after movement has resolved, so WASD does
      // nothing while aboard — the cursor is the helm.
      f.setPosition(ship.x, ship.y - 4);
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else if (ship.mounted) {
      this.dismount(owner, 'sunk');
    }

    // ── Ram ──
    if (ship.speed >= SHIP_RAM_MIN_SPEED) {
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(ship.x, ship.y, t.x, t.y) > SHIP_HULL_R + 10) continue;
        if (time < (ship.ramAt.get(t) ?? 0)) continue;
        ship.ramAt.set(t, time + SHIP_RAM_GAP_MS);
        this.strike(owner, t, SHIP_RAM_DMG);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.gold));
        this.shove(t, Math.atan2(t.y - ship.y, t.x - ship.x), SHIP_RAM_SHOVE);
        this.fx(owner).ember(t.x, t.y, 5, 18, 420, MAG.gold);
        this.api.showFloatingText(t.x, t.y - 44, `⚓ ${SHIP_RAM_DMG} — RAMMED`, this.hex(MAG.gold));
      }
    }

    // ── The hull stops shots ──
    // Theirs only; yours sail through. Snapshotted, because destroying a child while iterating
    // the live group array skips every other shot.
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active || !proj.body) continue;
      if (proj.isFromPlayer === (owner === 'player')) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, ship.x, ship.y) > SHIP_HULL_R) continue;
      this.hurtShip(ship, Math.max(1, proj.damage));
      proj.destroy();
    }

    // ── Pirate King (Q+): the crew ──
    if (this.up(owner, 'q') && time >= ship.nextSpiritAt) {
      ship.nextSpiritAt = time + SPIRIT_EVERY_MIN_MS + Math.random() * (SPIRIT_EVERY_MAX_MS - SPIRIT_EVERY_MIN_MS);
      if (this.spirits.filter((sp) => sp.owner === owner).length < SPIRIT_MAX) this.spawnSpirit(owner, ship, time);
    }
  }

  private sink(owner: Owner): void {
    const s = this.side(owner);
    const ship = s.ship;
    if (!ship) return;
    this.dismount(owner, 'sunk');
    s.ship = null;
    const fx = this.fx(owner);
    fx.erupt(ship.x, ship.y, 80, MAG.magma);
    fx.shock(ship.x, ship.y, 20, 130, MAG.gold, 700);
    fx.smoke(ship.x, ship.y - 10, 16, 1600);
    fx.ember(ship.x, ship.y, 18, 60, 900);
    Sfx.playAt('explosion-large', ship.x, { volume: 0.7, rate: 0.8 });
    // What was left of the hull goes back to being what it was made of.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      this.addPool(owner, this.clampX(ship.x + Math.cos(a) * 34), this.clampY(ship.y + Math.sin(a) * 22),
        ship.x, ship.y - 10);
    }
    this.api.showFloatingText(ship.x, ship.y - 60, '⚓ SHIP SUNK', this.hex(MAG.ash));
    this.api.scene.cameras.main.shake(260, 0.007);
  }

  /** The broadside. Six rounds from six ports, all aimed at the cursor with a little scatter. */
  private fireCannons(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const ship = s.ship;
    if (!ship) return;
    const c = Math.cos(ship.heading), sn = Math.sin(ship.heading);
    for (let i = 0; i < CANNONS; i++) {
      // Three a side, along the hull.
      const u = -22 + (i % 3) * 18;
      const v = (i < 3 ? -1 : 1) * 14;
      const px = ship.x + c * u - sn * v;
      const py = ship.y + sn * u + c * v;
      const ang = Math.atan2(ty - py, tx - px) + (Math.random() - 0.5) * CANNON_SPREAD * 2;
      this.cannonballs.push({
        owner, x: px, y: py,
        vx: Math.cos(ang) * CANNON_SPEED, vy: Math.sin(ang) * CANNON_SPEED,
        until: this.now + CANNON_LIFE_MS, seed: Math.random() * 999,
      });
      this.fx(owner).ember(px, py, 4, 12, 360, MAG.gold);
      this.fx(owner).smoke(px, py, 2, 600);
    }
    while (this.cannonballs.length > MAX_CANNONBALLS) this.cannonballs.shift();
    this.avatar(owner)?.play('punch', Math.atan2(ty - ship.y, tx - ship.x));
    this.avatar(owner)?.setVenting(true);
    Sfx.playAt('explosion-small', ship.x, { volume: 0.8, rate: 0.75 });
    this.api.showFloatingText(ship.x, ship.y - 56, '💣 BROADSIDE', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(180, 0.006);
  }

  private updateCannonballs(time: number, dt: number): void {
    const gone: Cannonball[] = [];
    for (const b of this.cannonballs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (time >= b.until || b.x < this.left - 20 || b.x > this.right + 20
        || b.y < this.top - 20 || b.y > this.bottom + 20) {
        gone.push(b);
        continue;
      }
      const ang = Math.atan2(b.vy, b.vx);
      // Enemies first — a round that could do both should hurt somebody.
      const victim = this.targetsOf(b.owner)
        .find((t) => Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) <= CANNON_HIT_R);
      if (victim) {
        this.strike(b.owner, victim, CANNON_DMG);
        this.api.spawnHitFlash(victim.x, victim.y, this.col(b.owner)(MAG.gold));
        this.fx(b.owner).erupt(b.x, b.y, 26, MAG.gold);
        this.shove(victim, ang, CANNON_SHOVE);
        this.api.showFloatingText(victim.x, victim.y - 44, `💣 ${CANNON_DMG}`, this.hex(MAG.gold));
        gone.push(b);
        continue;
      }
      // A volcano of its owner's in the way is lit on the spot: whatever pressure it had, it
      // goes critical now. The round is spent doing it.
      const v = this.vesselsOf(b.owner)
        .find((o) => o.blowAt <= 0 && Phaser.Math.Distance.Between(b.x, b.y, o.x, o.y) <= o.r + 8);
      if (v) {
        this.feed(b.owner, v.x, v.y, 1, Math.max(0, v.max - v.pressure) + 1);
        this.fx(b.owner).erupt(v.x, v.y - v.r, 40, MAG.gold);
        this.api.showFloatingText(v.x, v.y - 90, '💣 LIT', this.hex(MAG.gold));
        gone.push(b);
      }
    }
    if (gone.length) this.cannonballs = this.cannonballs.filter((b) => !gone.includes(b));
  }

  // ── Pirate King ────────────────────────────────────────────────────────────

  private spawnSpirit(owner: Owner, ship: Ship, time: number): void {
    const orbit = Math.random() * Math.PI * 2;
    this.spirits.push({
      owner, x: ship.x + Math.cos(orbit) * 50, y: ship.y + Math.sin(orbit) * 30,
      hp: SPIRIT_HP, seed: Math.random() * 999, orbit, facing: ship.heading,
      nextDashAt: time + SPIRIT_DASH_MIN_MS * 0.5 + Math.random() * SPIRIT_DASH_MIN_MS,
      dashUntil: 0, dashFrom: 0, dashVx: 0, dashVy: 0, dashHit: false, trailAcc: 0,
    });
    const fx = this.fx(owner);
    fx.ember(ship.x, ship.y - 20, 10, 30, 700, MAG.gold);
    fx.smoke(ship.x, ship.y - 20, 4, 800);
    this.api.showFloatingText(ship.x, ship.y - 70, '👻 ALL HANDS', this.hex(MAG.gold));
  }

  /**
   * The crew: hanging over the deck, burning down at eight a second, and every two or three
   * seconds one of them lunges through whoever is closest, cutting for twenty and leaving the
   * line he flew along on fire.
   */
  private updateSpirits(time: number, dt: number): void {
    const gone: Spirit[] = [];
    for (const sp of this.spirits) {
      sp.hp -= SPIRIT_DECAY_PER_S * dt;
      if (sp.hp <= 0) { gone.push(sp); continue; }

      // Enemy shots burn him down faster.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active || !proj.body) continue;
        if (proj.isFromPlayer === (sp.owner === 'player')) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, sp.x, sp.y) > 18) continue;
        sp.hp -= Math.max(1, proj.damage);
        this.fx(sp.owner).ember(sp.x, sp.y, 4, 14, 400);
        proj.destroy();
      }
      if (sp.hp <= 0) { gone.push(sp); continue; }

      const target = this.enemyOf(sp.owner);

      if (sp.dashUntil > time) {
        // Lunging. Straight line, fire behind, one cut.
        const px = sp.x, py = sp.y;
        sp.x = this.clampX(sp.x + sp.dashVx * dt);
        sp.y = this.clampY(sp.y + sp.dashVy * dt);
        sp.trailAcc += Phaser.Math.Distance.Between(px, py, sp.x, sp.y);
        while (sp.trailAcc >= TRAIL_GAP_PX) {
          sp.trailAcc -= TRAIL_GAP_PX;
          this.addPool(sp.owner, sp.x, sp.y + 14, sp.x, sp.y, { r: TRAIL_R, life: TRAIL_LIFE_MS, flight: 0 });
        }
        if (!sp.dashHit) {
          for (const t of this.targetsOf(sp.owner)) {
            if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > SPIRIT_HIT_R) continue;
            sp.dashHit = true;
            this.strike(sp.owner, t, SPIRIT_DMG);
            this.api.spawnHitFlash(t.x, t.y, this.col(sp.owner)(MAG.gold));
            this.fx(sp.owner).erupt(t.x, t.y, 24, MAG.lava);
            this.shove(t, sp.facing, 50);
            this.api.showFloatingText(t.x, t.y - 44, `👻 ${SPIRIT_DMG}`, this.hex(MAG.gold));
            break;
          }
        }
        continue;
      }

      // Hovering: drift around the ship, or around where it went down.
      const ship = this.shipOf(sp.owner);
      const hx = ship ? ship.x : sp.x, hy = ship ? ship.y : sp.y;
      sp.orbit += dt * 0.9;
      const wantX = hx + Math.cos(sp.orbit) * 54;
      const wantY = hy + Math.sin(sp.orbit) * 30 - 10;
      sp.x += (wantX - sp.x) * Math.min(1, dt * 3);
      sp.y += (wantY - sp.y) * Math.min(1, dt * 3);
      if (target) sp.facing = Math.atan2(target.y - sp.y, target.x - sp.x);

      if (target && time >= sp.nextDashAt
        && Phaser.Math.Distance.Between(sp.x, sp.y, target.x, target.y) <= SPIRIT_DASH_RANGE) {
        sp.nextDashAt = time + SPIRIT_DASH_MIN_MS + Math.random() * (SPIRIT_DASH_MAX_MS - SPIRIT_DASH_MIN_MS);
        // Through the target, not to it: the lunge carries past where they are standing.
        const d = Math.max(1, Phaser.Math.Distance.Between(sp.x, sp.y, target.x, target.y));
        const travel = Math.min(SPIRIT_DASH_DIST, d + 60);
        const speed = travel / (SPIRIT_DASH_MS / 1000);
        sp.facing = Math.atan2(target.y - sp.y, target.x - sp.x);
        sp.dashVx = Math.cos(sp.facing) * speed;
        sp.dashVy = Math.sin(sp.facing) * speed;
        sp.dashFrom = time;
        sp.dashUntil = time + SPIRIT_DASH_MS;
        sp.dashHit = false;
        sp.trailAcc = 0;
        this.fx(sp.owner).ember(sp.x, sp.y, 5, 16, 400, MAG.gold);
        Sfx.playAt('whoosh', sp.x, { volume: 0.5, rate: 1.3 });
      }
    }
    for (const sp of gone) {
      this.fx(sp.owner).smoke(sp.x, sp.y, 4, 700);
      this.fx(sp.owner).ember(sp.x, sp.y, 6, 20, 500);
    }
    if (gone.length) this.spirits = this.spirits.filter((sp) => !gone.includes(sp));
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
      this.updateBlunder(owner, time);
      this.updateFly(owner, time);
      this.updateShip(owner, time, dt);
      this.updateSaw(owner, time, dt);
      // Owns `magmaIncomingMult`; the coat's armour is folded in there.
      this.updateCoat(owner, time);
    }
    this.updateNpcSaw(time);

    this.updatePools(time, dt);
    this.updateVessels(time, dt);
    this.updateRocks(time, dt);
    this.updateCannonballs(time, dt);
    this.updateSpirits(time, dt);
    this.updateShoves(dt);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintHull(time);
    this.paintObjects(time);
    this.paintGauges();
    this.paintTools(time);
    this.paintHud(playerIs, time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.hullGfx) this.hullGfx = scene.add.graphics().setDepth(4);
    if (!this.objGfx) this.objGfx = scene.add.graphics().setDepth(6);
    if (!this.gaugeGfx) this.gaugeGfx = scene.add.graphics().setDepth(8);
    if (!this.fistGfx) this.fistGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /**
   * The npc has no mouse, so it gets a phantom one. The saw points dead at what it is cutting,
   * the ship is steered to cannon range of the target, and otherwise the cursor loiters around
   * whoever it is aiming at.
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
      const cone = this.vesselsOf(owner)
        .find((v) => v.blowAt > 0 && v.over < OVERFILL_MAX
          && Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y) < SAW_HOLD_DIST + SAW_R);
      const at = cone ?? target;
      if (at) {
        s.curX = this.clampX(at.x);
        s.curY = this.clampY(at.y);
        return;
      }
    }

    // At the helm the cursor is the wheel: steer to a point short of the target, so the ship
    // closes to a range the broadside is good at and then holds there, bow on.
    if (s.ship?.mounted && target) {
      const d = Math.max(1, Phaser.Math.Distance.Between(s.ship.x, s.ship.y, target.x, target.y));
      const hold = 190;
      const k = Math.max(0, d - hold) / d;
      s.curX = this.clampX(s.ship.x + (target.x - s.ship.x) * k);
      s.curY = this.clampY(s.ship.y + (target.y - s.ship.y) * k);
      return;
    }

    const tx = target ? target.x : f.x;
    const ty = target ? target.y : f.y;
    s.curAng += dt * 2.2;
    s.curX = this.clampX(tx + Math.cos(s.curAng) * 46);
    s.curY = this.clampY(ty + Math.sin(s.curAng) * 46 * 0.8);
  }

  // ── Pressure ───────────────────────────────────────────────────────────────

  /**
   * The one place pressure is ever added. Everything Magma does that hurts anybody passes
   * through here first with the same geometry it used for damage, which is what makes "all of
   * magma's attacks charge it" true rather than a list of special cases. Molten Mutiny's
   * pendant takes its fifth of this too — it is damage the volcano would have had.
   *
   * Returns the vessels that were actually fed, so a rock can die on the thing it charged.
   */
  private feed(owner: Owner, x: number, y: number, radius: number, amount: number, except?: Vessel | null): Vessel[] {
    const hit: Vessel[] = [];
    const s = this.side(owner);
    if (s.pendantOn && amount > 0) {
      const tax = amount * PENDANT_TAX;
      amount -= tax;
      // Only skimmed if there was a vessel to feed — a cone fired at nobody's volcano is not
      // damage anybody would have taken.
      if (this.vessels.some((v) => v.owner === owner && v !== except
        && Phaser.Math.Distance.Between(x, y, v.x, v.y) <= radius + v.r)) {
        this.addPendant(owner, tax);
      }
    }
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
        if ((!this.up(owner, 'e') && !this.masteryOn(owner)) || v.blowAt <= 0) continue;
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
        this.fx(owner).ember(v.x + (Math.random() - 0.5) * v.r, v.y - v.r * 0.5, 1, 8, 420, MAG.ember);
      }
      if (v.pressure >= v.max && before < v.max) this.onVesselFull(v);
    }
    return hit;
  }

  /** A volcano has topped out. The countdown starts. */
  private onVesselFull(v: Vessel): void {
    const fx = this.fx(v.owner);
    v.blowAt = this.now + VOLC_BLOW_MS;
    v.until = v.blowAt + 1;
    v.nextRockAt = this.now;
    fx.erupt(v.x, v.y - v.r, 60, MAG.gold);
    this.api.showFloatingText(v.x, v.y - 78, '🌋 CRITICAL', this.hex(MAG.white));
    this.api.scene.cameras.main.shake(240, 0.006);
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
    const landing = this.pools.filter((p) => p.flightMs > 0 && p.landAt <= time && p.landAt > time - 40);
    for (const p of landing) {
      const fx = this.fx(p.owner);
      fx.splat(p.x, p.y, p.r * 0.9);
      fx.ember(p.x, p.y, 4, p.r * 0.7, 520);
      // Mag-Mortar: the round goes off where it lands. The pool it leaves behind is unchanged,
      // so the upgrade adds an opener rather than replacing the floor.
      if (p.impact <= 0) continue;
      fx.erupt(p.x, p.y, p.impactR * 0.8, MAG.gold);
      fx.shock(p.x, p.y, 12, p.impactR, MAG.ember, 480);
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > p.impactR) continue;
        this.strike(p.owner, t, p.impact);
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
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > p.r) continue;
        burn.set(t, p.owner);
      }
      // …and the same pool charges anything of its owner's that it is sitting on.
      this.feed(p.owner, p.x, p.y, p.r, POOL_FEED_PER_S * dt);
    }

    for (const [t, owner] of burn) {
      const acc = (this.burnAccum.get(t) ?? 0) + POOL_DPS * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole > 0) {
        this.strike(owner, t, whole);
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

      // Lava. The fuller it is, the faster it comes.
      if (time >= v.nextPoolAt) {
        const gap = Phaser.Math.Linear(VOLC_PUDDLE_SLOW_MS, VOLC_PUDDLE_FAST_MS, ratio);
        v.nextPoolAt = time + gap;
        this.ventPool(v);
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

      if (time >= v.until) this.removeVessel(v);
    }
  }

  /** A volcano coughing up a pool of lava somewhere near its own base. */
  private ventPool(v: Vessel): void {
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
      this.strike(v.owner, t, dmg);
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
    {
      impact = 0, impactR = MORTAR_IMPACT_R, shell = false, flight = PLUME_FLIGHT_MS,
      r = POOL_R, life = POOL_LIFE_MS,
    } = {},
  ): void {
    this.pools.push({
      owner, x, y, fromX, fromY,
      landAt: this.now + flight,
      until: this.now + flight + life,
      seed: Math.random() * 999,
      r, life,
      impact, impactR, shell, flightMs: flight,
    });
    while (this.pools.length > MAX_POOLS) this.pools.shift();
  }

  /** A volcano going away without paying out — timed out, or replaced by a fresh cast. */
  private removeVessel(v: Vessel): void {
    this.vessels = this.vessels.filter((o) => o !== v);
    const fx = this.fx(v.owner);
    fx.smoke(v.x, v.y - 10, 7, 1000);
    fx.ember(v.x, v.y, 5, v.r, 620, MAG.ember);
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
        this.strike(r.owner, victim, ROCK_DMG);
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
    const absorber = (amount: number): boolean => {
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
    this.ourAbsorbers.add(absorber);
    f.damageAbsorber = absorber;
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
      this.strike(owner, t, dmg);
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
   * The coat's three halves, resolved once a frame. This is the one place `magmaIncomingMult`
   * is ever written. The outgoing field is shared, so it is applied by dividing the old
   * contribution out and multiplying the new one in.
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

    const coat = this.coatPower(owner);
    f.magmaIncomingMult = s.coatUntil > time
      ? 1 - (COAT_ARMOR_MIN + (COAT_ARMOR_MAX - COAT_ARMOR_MIN) * coat) : 1;

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
      this.strike(owner, t, bite);
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
      this.strike(owner, t, SAW_BLAST_DMG);
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

    // Not from the deck: the saw is a melee tool and the ship holds its range.
    if (this.mounted('npc')) return;
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

    for (const owner of ['player', 'npc'] as Owner[]) {
      const is = owner === 'player' ? playerIs : npcIs;
      let av = this.avatar(owner);
      if (!is) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      const f = this.fighter(owner);
      if (!av) {
        av = new MagmaAvatar(scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.side(owner);
      av.setFacing(Math.atan2(s.curY - f.y, s.curX - f.x));
      av.setVenting(s.plumeLeft > 0 || s.flyUntil > this.now);
      av.setHelm(this.mounted(owner));
      av.setPendant(s.pendantOn ? s.pendantPower / PENDANT_AWAKEN : -1);
      av.setIntensity(this.mounted(owner) ? 1.25 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    for (const p of this.pools) {
      if (time < p.landAt) continue;
      const age = (time - p.landAt) / p.life;
      // Skins over as it dies, which is also the warning that it is about to stop hurting.
      const heat = Phaser.Math.Clamp(1 - age * 1.15, 0.05, 1);
      const fade = Phaser.Math.Clamp((p.until - time) / Math.min(900, p.life * 0.5), 0, 1);
      moltenPool(g, this.col(p.owner), p.x, p.y, p.r, heat, this.vizT, p.seed, fade);
    }
  }

  /** The hull and deck, under the fighters: the captain stands on it. */
  private paintHull(time: number): void {
    const g = this.hullGfx;
    if (!g) return;
    g.clear();
    for (const owner of ['player', 'npc'] as Owner[]) {
      const ship = this.side(owner).ship;
      if (!ship) continue;
      pirateShip(g, this.col(owner), ship.x, ship.y, ship.heading, this.vizT, ship.hp / SHIP_HP, ship.seed, 'hull');
      if (ship.flashUntil > time) {
        g.fillStyle(this.col(owner)(MAG.white), ((ship.flashUntil - time) / 110) * 0.35);
        g.fillEllipse(ship.x, ship.y, 100, 44);
      }
      // The boarding ring, while the captain is off the deck and close enough to come back.
      if (!ship.mounted && owner === 'player') {
        const f = this.api.player;
        if (f && Phaser.Math.Distance.Between(f.x, f.y, ship.x, ship.y) <= SHIP_MOUNT_R) {
          g.lineStyle(1.6, this.col(owner)(MAG.gold), 0.4 + 0.25 * Math.sin(this.vizT * 6));
          g.strokeEllipse(ship.x, ship.y, SHIP_MOUNT_R * 2, SHIP_MOUNT_R * 1.3);
        }
      }
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
        // Mag-Mortar: a finned round, nose-down along its own flight path.
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
      const ringR = p.impact > 0 ? p.impactR : p.r;
      g.lineStyle(p.impact > 0 ? 2.2 : 1.6, tint(p.impact > 0 ? MAG.gold : MAG.ember),
        0.35 + f * 0.35);
      g.strokeEllipse(p.x, p.y, ringR * 1.7 * (0.5 + f * 0.5), ringR * 1.15 * (0.5 + f * 0.5));
    }

    for (const v of this.vessels) {
      const tint = this.col(v.owner);
      volcanoCone(g, tint, v.x, v.y + v.r * 0.5, v.r, v.pressure / v.max, this.vizT, v.seed);
      if (v.flashUntil > time) {
        g.fillStyle(tint(MAG.white), ((v.flashUntil - time) / 110) * 0.45);
        g.fillCircle(v.x, v.y, v.r * 1.5);
      }
    }

    for (const r of this.rocks) {
      lavaRock(g, this.col(r.owner), r.x, r.y, 6, r.spin, r.seed);
    }
    for (const b of this.cannonballs) {
      cannonball(g, this.col(b.owner), b.x, b.y, Math.atan2(b.vy, b.vx), this.vizT * 9 + b.seed, b.seed);
    }

    // The rigging, over the fighters: masts fore and aft of where the captain stands.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const ship = this.side(owner).ship;
      if (!ship) continue;
      pirateShip(g, this.col(owner), ship.x, ship.y, ship.heading, this.vizT, ship.hp / SHIP_HP, ship.seed, 'rig');
      // The hull's own gauge, aft of the stern lantern.
      pressureGauge(g, this.col(owner), ship.x, ship.y - 58, 70, ship.hp / SHIP_HP, MAG.gold);
    }
  }

  private paintGauges(): void {
    const g = this.gaugeGfx;
    if (!g) return;
    g.clear();
    for (const v of this.vessels) {
      pressureGauge(g, this.col(v.owner), v.x, v.y - v.r * 2.1, 48, v.pressure / v.max, MAG.magma);
    }
  }

  /** What is in hand: the blunderbuss going off, the saw, the coat, and the crew in the air. */
  private paintTools(time: number): void {
    const g = this.fistGfx;
    if (!g) return;
    g.clear();

    for (const sp of this.spirits) {
      const dash = sp.dashUntil > time ? Phaser.Math.Clamp((time - sp.dashFrom) / SPIRIT_DASH_MS, 0, 1) : 0;
      pirateSpirit(g, this.col(sp.owner), sp.x, sp.y - 16, sp.facing, this.vizT + sp.seed, sp.seed,
        Phaser.Math.Clamp(sp.hp / SPIRIT_HP, 0, 1), dash);
    }

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const tint = this.col(owner);

      // Obsidian Coat, under everything else the caster is holding — it is worn, not wielded.
      if (s.coatUntil > time) {
        obsidianCoat(g, tint, f.x, f.y, s.coatPower, this.vizT,
          Phaser.Math.Clamp((s.coatUntil - time) / 600, 0, 1));
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

      // Blunder-Boil: the cone hangs in the air for the first part of the recoil, pointed back
      // at where the pirate was standing when he fired — a muzzle flash the length of the shot.
      if (s.flyUntil > time) {
        const u = Phaser.Math.Clamp((time - s.flyFrom) / BLUNDER_LAUNCH_MS, 0, 1);
        const fade = Phaser.Math.Clamp(1 - u * 1.6, 0, 1);
        if (fade > 0) {
          const ang = s.flyAng + Math.PI;
          breathCone(g, tint,
            s.flyX0 + Math.cos(ang) * 12, s.flyY0 + Math.sin(ang) * 12, ang,
            BLUNDER_RANGE * (0.7 + u * 0.3), BLUNDER_HALF * (0.8 + u * 0.3),
            this.vizT, 3, s.flyHot > 0.6 ? MAG.white : MAG.lava, MAG.magma, fade);
        }
        // The exhaust out of the barrel's back, which is the visual reason he is airborne.
        for (let i = 0; i < 3; i++) {
          const a = s.flyAng + Math.PI + (i - 1) * 0.3;
          const len = 16 + Math.sin(this.vizT * 22 + i * 2) * 6;
          g.fillStyle(tint(i === 1 ? MAG.white : MAG.gold), 0.5 * (1 - u));
          g.fillPoints([
            new Phaser.Geom.Point(f.x + Math.cos(a - 0.2) * 8, f.y + Math.sin(a - 0.2) * 8),
            new Phaser.Geom.Point(f.x + Math.cos(a) * len, f.y + Math.sin(a) * len),
            new Phaser.Geom.Point(f.x + Math.cos(a + 0.2) * 8, f.y + Math.sin(a + 0.2) * 8),
          ], true);
        }
        // Hot enough to be the shot: a corona round the pirate for the flight.
        if (s.flyHot >= GAUGE_CONTACT_AT) {
          g.lineStyle(2.2, tint(MAG.white), 0.5 + 0.3 * Math.sin(this.vizT * 30));
          g.strokeCircle(f.x, f.y, GAUGE_CONTACT_R);
          g.fillStyle(tint(MAG.gold), 0.18);
          g.fillCircle(f.x, f.y, GAUGE_CONTACT_R);
        }
      }

      // Pressure Gauge (F+): smoke off a gun that has sat full too long.
      if (this.gaugeOver(owner)) {
        for (let i = 0; i < 3; i++) {
          const ph = (this.vizT * 0.8 + i * 0.33) % 1;
          g.fillStyle(tint(MAG.smoke), 0.5 * (1 - ph));
          g.fillCircle(f.x + 14 + Math.sin(ph * 6 + i) * 4, f.y - 8 - ph * 26, 3 + ph * 4);
        }
      }
    }
  }

  /**
   * What is in hand: the saw's clock, the gauge, the ship's hull, or the pendant's take.
   *
   * Drawn as a slab of cooling basalt with a crucible channel cut into it: the meter is a run of
   * lava in that channel, bubbling, white-hot at its leading edge. A medallion on the left says
   * which of the four it is — a spinning saw, a ship's wheel, a pressure dial or the red pendant.
   */
  private paintHud(playerIsMagma: boolean, time: number): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    const s = this.sides.player;
    const showSaw = playerIsMagma && s.sawFrom > 0;
    const showShip = playerIsMagma && !!s.ship;
    const pressure = playerIsMagma ? this.gaugePressure('player') : 0;
    const over = playerIsMagma && this.gaugeOver('player');
    const showGauge = playerIsMagma && (pressure > 0 || over);
    const showPendant = playerIsMagma && s.pendantOn;
    if (!showSaw && !showShip && !showGauge && !showPendant) {
      this.hudLabel?.setVisible(false);
      this.hudHint?.setVisible(false);
      return;
    }

    const heat = this.sawHeat('player', time);
    const hot = showSaw ? (heat > 0.78 ? MAG.magma : heat > 0.45 ? MAG.white : MAG.gold)
      : showShip ? MAG.gold
        : showGauge ? (over ? MAG.ash : pressure > 0.6 ? MAG.white : MAG.magma)
          : MAG.pendantLit;
    // The saw's bar is the heat, not its runtime: it drains to nothing at the exact instant the
    // thing detonates, so an empty bar means "let go now".
    const ratio = showSaw
      ? Phaser.Math.Clamp(1 - heat, 0, 1)
      : showShip
        ? Phaser.Math.Clamp((s.ship?.hp ?? 0) / SHIP_HP, 0, 1)
        : showGauge
          ? (over ? 1 : pressure)
          : Phaser.Math.Clamp(s.pendantPower / PENDANT_AWAKEN, 0, 1);

    const title = showSaw
      ? `MAGMA SAW — ${Math.min(SAW_DMG_MAX, 1 + Math.floor((time - s.sawFrom) / SAW_RAMP_MS)) * 20} A SECOND`
      : showShip
        ? `THE SHIP — ${Math.max(0, Math.round(s.ship?.hp ?? 0))} HULL · −${SHIP_DECAY_PER_S} A SECOND`
        : showGauge
          ? (over ? 'PRESSURE GAUGE — OVERPRESSURED' : `PRESSURE GAUGE — ${Math.round(pressure * 100)}%`)
          : `MOLTEN MUTINY — ${Math.round(s.pendantPower)} / ${PENDANT_AWAKEN}`;
    const hint = showSaw
      ? `${((SAW_OVERHEAT_MS - (time - s.sawFrom)) / 1000).toFixed(1)}s TO DETONATION · PRESS AGAIN TO CUT THE MOTOR`
      : showShip
        ? (s.ship?.mounted ? 'CLICK = BROADSIDE · CURSOR STEERS · SPACE = OVER THE SIDE'
          : 'SPACE NEAR THE HULL TO BOARD · IT HOLDS WHERE IT IS')
        : showGauge
          ? (over
            ? 'F WILL BURST: 35 TO YOU AND EVERYONE WITHIN 120px'
            : `F HITS ${Math.round(BLUNDER_DMG + GAUGE_DMG_BONUS * pressure)} · FLIES ${Math.round(BLUNDER_LAUNCH + GAUGE_LAUNCH_BONUS * pressure)}px${pressure >= GAUGE_CONTACT_AT ? ' · YOU ARE THE SHOT' : ''}`)
          : 'THE PENDANT TAKES A FIFTH OF EVERYTHING YOU DEAL · Q AGAIN TO REMOVE';

    const x = this.left + 4;
    const y = this.top + 4;
    const iconR = 15;
    const tx = x + iconR * 2 + 14;
    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(0, 0, '', {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#ff8b22',
        stroke: '#120a0b', strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    if (!this.hudHint) {
      this.hudHint = this.api.scene.add.text(0, 0, '', {
        fontSize: '9px', fontFamily: FONT_UI, fontStyle: 'bold', color: '#e6dac4',
        stroke: '#120a0b', strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true).setText(title).setColor(this.hex(this.pcol(hot))).setPosition(tx, y + 4);
    this.hudHint.setVisible(true).setText(hint).setPosition(tx, y + 31);
    const w = Math.max(220, tx - x + Math.max(this.hudLabel.width, this.hudHint.width) + 12);
    const h = 46;
    const t = time / 1000;
    const P = this.pcol;

    // ── The slab: jagged basalt with a crust highlight and a lava seam along its foot ──
    const slab: Phaser.Geom.Point[] = [];
    const steps = Math.max(6, Math.round(w / 22));
    for (let i = 0; i <= steps; i++) {
      slab.push(new Phaser.Geom.Point(x + (w * i) / steps, y + (i % 2 ? 1.5 : -1) + Math.sin(i * 2.3) * 1.2));
    }
    slab.push(new Phaser.Geom.Point(x + w + 3, y + h * 0.5));
    for (let i = steps; i >= 0; i--) {
      slab.push(new Phaser.Geom.Point(x + (w * i) / steps, y + h + (i % 2 ? -1 : 1.5) + Math.cos(i * 1.7) * 1.2));
    }
    slab.push(new Phaser.Geom.Point(x - 3, y + h * 0.5));
    g.fillStyle(MAG.scorch, 0.55);
    g.fillPoints(slab.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 3)), true);
    g.fillStyle(P(MAG.basalt), 0.94);
    g.fillPoints(slab, true);
    g.fillStyle(P(MAG.crustDeep), 0.9);
    g.fillRect(x + 2, y + 2, w - 4, 9);
    g.fillStyle(P(MAG.crust), 0.35);
    g.fillRect(x + 2, y + 2, w - 4, 3);
    // Glowing seam along the foot of the slab, breathing with the heat.
    g.lineStyle(1.6, P(hot), 0.45 + 0.2 * Math.sin(t * 3));
    g.strokePoints(slab, true);
    g.lineStyle(1, P(MAG.ash), 0.35);
    g.lineBetween(x + 4, y + 1.5, x + w - 4, y + 1.5);
    // A few hairline cracks in the rock with heat showing through.
    for (let i = 0; i < 3; i++) {
      const cx = x + w * (0.35 + i * 0.22);
      const glow = 0.25 + 0.2 * Math.sin(t * 2 + i * 1.7);
      g.lineStyle(1, P(MAG.magma), glow);
      g.beginPath();
      g.moveTo(cx, y + h);
      g.lineTo(cx + 3, y + h - 4);
      g.lineTo(cx - 1, y + h - 7);
      g.strokePath();
    }

    // ── Medallion ──
    const mx = x + iconR + 6, my = y + h / 2;
    g.fillStyle(P(MAG.scorch), 1);
    g.fillCircle(mx, my, iconR + 2);
    g.fillStyle(P(MAG.crustDeep), 1);
    g.fillCircle(mx, my, iconR);
    g.fillStyle(P(hot), 0.16 + 0.08 * Math.sin(t * 4));
    g.fillCircle(mx, my, iconR - 2);
    g.lineStyle(1.8, P(MAG.gold), 0.85);
    g.strokeCircle(mx, my, iconR + 0.5);
    g.lineStyle(1, P(MAG.white), 0.25);
    g.beginPath(); g.arc(mx, my, iconR - 1.5, Math.PI * 1.1, Math.PI * 1.6); g.strokePath();
    if (showSaw) {
      // A spinning saw blade: toothed disc, faster as it heats.
      const spin = t * (6 + heat * 18);
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 20; i++) {
        const a = spin + (i / 20) * Math.PI * 2;
        const r = i % 2 ? 7 : 10.5;
        pts.push(new Phaser.Geom.Point(mx + Math.cos(a) * r, my + Math.sin(a) * r));
      }
      g.fillStyle(P(hot), 0.95);
      g.fillPoints(pts, true);
      g.fillStyle(P(MAG.basalt), 1);
      g.fillCircle(mx, my, 3.5);
      g.fillStyle(P(MAG.white), 0.8);
      g.fillCircle(mx - 1, my - 1, 1.2);
    } else if (showShip) {
      // A ship's wheel, rocking gently.
      const rock = Math.sin(t * 1.4) * 0.35;
      g.lineStyle(2, P(MAG.gold), 1);
      for (let i = 0; i < 8; i++) {
        const a = rock + (i / 8) * Math.PI * 2;
        g.lineBetween(mx + Math.cos(a) * 2, my + Math.sin(a) * 2, mx + Math.cos(a) * 11, my + Math.sin(a) * 11);
      }
      g.lineStyle(2.4, P(MAG.crust), 1);
      g.strokeCircle(mx, my, 7.5);
      g.lineStyle(1, P(MAG.gold), 0.9);
      g.strokeCircle(mx, my, 7.5);
      g.fillStyle(P(MAG.gold), 1);
      g.fillCircle(mx, my, 2.6);
    } else if (showGauge) {
      // A pressure dial whose needle trembles harder as it climbs.
      g.fillStyle(P(MAG.bone), 0.9);
      g.fillCircle(mx, my, 10);
      g.lineStyle(1, P(MAG.basalt), 0.7);
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI * 0.75 + (i / 6) * Math.PI * 1.5;
        g.lineBetween(mx + Math.cos(a) * 7, my + Math.sin(a) * 7, mx + Math.cos(a) * 9.5, my + Math.sin(a) * 9.5);
      }
      g.lineStyle(2, P(MAG.magma), 0.9);
      g.beginPath(); g.arc(mx, my, 8.2, Math.PI * 1.85, Math.PI * 2.25); g.strokePath();
      const shake = (over ? 0.25 : pressure * 0.08) * Math.sin(t * 40);
      const na = Math.PI * 0.75 + Math.min(1, over ? 1.05 : pressure) * Math.PI * 1.5 + shake;
      g.lineStyle(1.8, P(MAG.pendant), 1);
      g.lineBetween(mx, my, mx + Math.cos(na) * 8.5, my + Math.sin(na) * 8.5);
      g.fillStyle(P(MAG.basalt), 1);
      g.fillCircle(mx, my, 2);
    } else {
      // The cursed pendant, pulsing faster as it fills.
      const pulse = 0.5 + 0.5 * Math.sin(t * (3 + ratio * 9));
      g.fillStyle(P(MAG.pendant), 0.25 + 0.25 * pulse);
      g.fillCircle(mx, my + 1, 9 + ratio * 3);
      const gem = (r: number) => [
        new Phaser.Geom.Point(mx, my - r * 1.15), new Phaser.Geom.Point(mx + r, my - r * 0.3),
        new Phaser.Geom.Point(mx + r * 0.62, my + r), new Phaser.Geom.Point(mx - r * 0.62, my + r),
        new Phaser.Geom.Point(mx - r, my - r * 0.3),
      ];
      g.fillStyle(P(MAG.basalt), 1);
      g.fillPoints(gem(8.5), true);
      g.fillStyle(P(ratio > 0.75 ? MAG.pendantLit : MAG.pendant), 0.8 + 0.2 * pulse);
      g.fillPoints(gem(6.5), true);
      g.fillStyle(P(MAG.white), 0.5 + ratio * 0.4);
      g.fillCircle(mx - 2, my - 2.5, 1.4);
      g.lineStyle(1.2, P(MAG.gold), 0.9);
      g.beginPath(); g.arc(mx, my - 14, 7, Math.PI * 0.2, Math.PI * 0.8); g.strokePath();
    }

    // ── The crucible channel ──
    const bx = tx, by = y + 19, bw = w - (tx - x) - 10, bh = 9;
    g.fillStyle(P(MAG.scorch), 1);
    g.fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, (bh + 4) / 2);
    g.fillStyle(P(MAG.smoke), 1);
    g.fillRoundedRect(bx, by, bw, bh, bh / 2);
    g.lineStyle(1, P(MAG.crust), 0.9);
    g.strokeRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, (bh + 4) / 2);
    const fw = Math.max(bh, bw * ratio);
    if (ratio > 0.005) {
      g.fillStyle(P(MAG.magma), 1);
      g.fillRoundedRect(bx, by, fw, bh, bh / 2);
      g.fillStyle(P(hot === MAG.ash ? MAG.ash : MAG.lava), 0.95);
      g.fillRoundedRect(bx + 1, by + 1, fw - 2, bh * 0.5, bh * 0.25);
      g.fillStyle(P(MAG.white), 0.45);
      g.fillRect(bx + 3, by + 1.5, Math.max(0, fw - 8), 1.2);
      // Bubbles rising and popping in the melt.
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.9 + i * 0.37) % 1;
        const bxp = bx + 4 + ((i * 0.618 + 0.13) % 1) * Math.max(0, fw - 8);
        g.fillStyle(P(MAG.gold), 0.6 * (1 - ph));
        g.fillCircle(bxp, by + bh - 2 - ph * (bh - 3), 0.8 + ph * 1.4);
      }
      // White-hot meniscus at the leading edge.
      g.fillStyle(P(MAG.white), 0.65 + 0.25 * Math.sin(t * 8));
      g.fillCircle(bx + fw - bh / 2, by + bh / 2, bh * 0.38);
      g.fillStyle(P(hot), 0.25);
      g.fillCircle(bx + fw - bh / 2, by + bh / 2, bh * 0.9);
    }
    // Tick notches chiselled into the rim.
    for (let i = 1; i < 4; i++) {
      const nx = bx + (bw * i) / 4;
      g.lineStyle(1, P(MAG.ash), 0.55);
      g.lineBetween(nx, by - 2, nx, by + 1);
      g.lineBetween(nx, by + bh - 1, nx, by + bh + 2);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsMagma: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('magma-pendant', playerIsMagma && s.pendantOn ? {
      name: 'Molten Mutiny', emoji: '📿', color: MAG.pendantLit,
      description: `The cursed pendant is taking ${Math.round(PENDANT_TAX * 100)}% of every point you would deal — to a body or into a volcano — and keeping it. At ${PENDANT_AWAKEN} it wakes the ship. Press Q again to take it off, and lose what it has taken.`,
      count: Math.round(s.pendantPower), suffix: ` / ${PENDANT_AWAKEN}`, priority: 100,
    } : null);

    this.api.setStatusIndicator('magma-ship', playerIsMagma && s.ship ? {
      name: s.ship.mounted ? 'At The Helm' : 'The Ship', emoji: '🏴‍☠️', color: MAG.gold,
      description: s.ship.mounted
        ? `Aboard. The hull takes every hit meant for you and burns down ${SHIP_DECAY_PER_S} a second on its own. The cursor steers it, the click fires all six cannons for ${CANNON_DMG} apiece and lights any volcano of yours a round crosses, running into somebody is ${SHIP_RAM_DMG} and a shove. Space to go over the side.${this.api.hasUpgrade('q') ? ' Pirate King: the crew climbs out every few seconds.' : ''}`
        : `Holding where you left it, still burning down ${SHIP_DECAY_PER_S} a second, still stopping shots with its hull. Stand within ${SHIP_MOUNT_R}px and press Space to board again.`,
      count: Math.max(0, Math.round(s.ship.hp)), suffix: ` / ${SHIP_HP}`, priority: 102,
    } : null);

    const pressure = playerIsMagma ? this.gaugePressure('player') : 0;
    const over = playerIsMagma && this.gaugeOver('player');
    this.api.setStatusIndicator('magma-gauge', playerIsMagma && (pressure > 0 || over) ? {
      name: over ? 'Overpressured' : 'Pressure Gauge', emoji: over ? '💀' : '🌡️', color: over ? MAG.ash : MAG.magma,
      description: over
        ? `The gun has sat full too long. The next F does not fire — it bursts for ${GAUGE_BLAST_DMG} to you and everyone within ${GAUGE_BLAST_R}px.`
        : `All three charges banked and the pressure climbing. F deals ${Math.round(BLUNDER_DMG + GAUGE_DMG_BONUS * pressure)} and throws you ${Math.round(BLUNDER_LAUNCH + GAUGE_LAUNCH_BONUS * pressure)}px${pressure >= GAUGE_CONTACT_AT ? `, and you hit anyone you fly through for ${GAUGE_CONTACT_DMG}` : ''}. Full too long and it bursts.`,
      count: Math.round(pressure * 100), suffix: '%', priority: 110,
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

    const volcanoes = this.vesselsOf('player');
    const hottest = volcanoes.reduce((m, v) => Math.max(m, v.pressure), 0);
    const overfill = volcanoes.reduce((m, v) => Math.max(m, v.over), 0);
    this.api.setStatusIndicator('magma-volcano', playerIsMagma && volcanoes.length ? {
      name: overfill > 0 ? 'Supercritical' : 'Volcano', emoji: '🌋', color: overfill > 0 ? MAG.white : MAG.magma,
      description: overfill > 0
        ? `Past the cap and still taking it. ${Math.round(overfill)} overfill banked — the collapse is up to ${Math.round(VOLC_COLLAPSE_DMG + overfill * OVERFILL_DMG_PER)} in a ${Math.round(VOLC_COLLAPSE_R + overfill * OVERFILL_R_PER)}px blast. Keep hitting it until it goes.`
        : `Attack it to raise its pressure — more pressure means more lava and more rock. At ${VOLCANO_MAX} it goes critical and collapses.`,
      count: overfill > 0 ? Math.round(overfill) : Math.round(hottest),
      suffix: overfill > 0 ? ' over' : ` / ${VOLCANO_MAX}`, priority: 120,
    } : null);

    // The victim side: hostile lava under the local player's feet.
    const standing = this.pools.some((p) => p.owner === 'npc' && time >= p.landAt
      && Phaser.Math.Distance.Between(p.x, p.y, this.api.player.x, this.api.player.y) <= p.r);
    this.api.setStatusIndicator('magma-scalded', standing ? {
      name: 'Standing In Lava', emoji: '🔥', color: MAG.lava,
      description: `You are standing in someone else's magma — ${POOL_DPS} a second for as long as you do. Step out of it.`,
      priority: 15,
    } : null);
  }

  // ── Accessors read by ArenaScene / the npc ─────────────────────────────────

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
    const v = this.vesselsOf('npc')
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
  volcanoCount(owner: Owner): number { return this.vesselsOf(owner).length; }

  /** Blunder-Boil charges in hand. */
  blunderCharges(owner: Owner): number { return this.side(owner).blunderCharges; }

  /** Pressure Gauge (F+): 0–1 on the bot's gun. */
  npcGaugePressure(): number { return this.gaugePressure('npc'); }

  /** Pressure Gauge (F+): the bot's next F is a detonation, not a shot. */
  npcGaugeOver(): boolean { return this.gaugeOver('npc'); }

  isPendantOn(owner: Owner): boolean { return this.side(owner).pendantOn; }

  hasShip(owner: Owner): boolean { return !!this.side(owner).ship; }

  isMounted(owner: Owner): boolean { return this.mounted(owner); }

  /**
   * Synergy: a volcano of the bot's own that a broadside should be aimed at instead of the
   * player — one still climbing, standing close enough to the target that its instant collapse
   * will land on them, and within the cannons' reach of the ship. Side-effect-free.
   */
  npcCannonVolcano(): { x: number; y: number } | null {
    const s = this.sides.npc;
    if (!s.ship?.mounted) return null;
    const target = this.enemyOf('npc');
    if (!target) return null;
    const ship = s.ship;
    const v = this.vesselsOf('npc')
      .filter((o) => o.blowAt <= 0
        && Phaser.Math.Distance.Between(o.x, o.y, target.x, target.y) <= VOLC_COLLAPSE_R * 0.9
        && Phaser.Math.Distance.Between(o.x, o.y, ship.x, ship.y) <= CANNON_SPEED * (CANNON_LIFE_MS / 1000) * 0.8)
      .sort((a, b) => b.pressure - a.pressure)[0];
    return v ? { x: v.x, y: v.y } : null;
  }

  /**
   * Where the AI should aim if it wants to charge something of its own, or null when there is
   * nothing left to fill.
   */
  chargeTarget(owner: Owner): { x: number; y: number } | null {
    const list = this.vesselsOf(owner).filter((v) => v.pressure < v.max);
    return list.length ? { x: list[0].x, y: list[0].y } : null;
  }

  /**
   * Ability tray fill. Three of the five spend most of their life showing something other than
   * a cooldown — F's charges, R's window, and Q's pendant-then-ship arc.
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
    if (abilityId === 'magma-blunder') {
      const max = this.blunderMax('player');
      if (s.blunderCharges >= max) return 1;
      const partial = Phaser.Math.Clamp(1 - (s.blunderRechargeAt - time) / BLUNDER_RECHARGE_MS, 0, 1);
      return Phaser.Math.Clamp((s.blunderCharges + partial) / max, 0, 1);
    }
    if (abilityId === 'magma-bloat' && s.bloatUntil > time) {
      return Phaser.Math.Clamp((s.bloatUntil - time) / BLOAT_MS, 0, 1);
    }
    if (abilityId === 'magma-mutiny') {
      if (s.ship) return Phaser.Math.Clamp(s.ship.hp / SHIP_HP, 0, 1);
      if (s.pendantOn) return Phaser.Math.Clamp(s.pendantPower / PENDANT_AWAKEN, 0, 1);
    }
    if (abilityId === 'magma-volcano') {
      const hottest = this.vesselsOf('player')
        .reduce((m, v) => Math.max(m, (v.pressure + v.over) / v.max), 0);
      if (hottest > 0) return Phaser.Math.Clamp(hottest, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ability tray colour. Pressure Gauge (F+) paints the F card: darker and redder as the gauge
   * climbs, pulsing as it nears full, and smoky black once the gun is overpressured. Null means
   * "the card's own colour".
   */
  getBarStyle(abilityId: string): { color: number; alpha: number } | null {
    if (abilityId !== 'magma-blunder' || this.api.elementId !== 'magma') return null;
    if (this.gaugeOver('player')) return { color: 0x1a1416, alpha: 0.92 };
    const p = this.gaugePressure('player');
    if (p <= 0) return null;
    const base = Phaser.Display.Color.ValueToColor(0xff7733);
    const hot = Phaser.Display.Color.ValueToColor(0xc40c14);
    const mix = Phaser.Display.Color.Interpolate.ColorWithColor(base, hot, 100, Math.round(p * 100));
    const pulse = p > 0.6 ? 0.1 * Math.sin(this.vizT * (6 + p * 10)) : 0;
    return {
      color: Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b),
      alpha: Phaser.Math.Clamp(0.45 + p * 0.45 + pulse, 0.3, 1),
    };
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Volcanoes, the ship and the crew. A vessel razed this way is simply gone: it does not top
   * out, so nothing erupts. A razed ship drops its captain where it was.
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
    for (let i = this.spirits.length - 1; i >= 0; i--) {
      const sp = this.spirits[i];
      if (sp.owner === exceptOwner || !near(sp.x, sp.y)) continue;
      this.spirits.splice(i, 1);
      razed++;
    }
    for (const owner of ['player', 'npc'] as Owner[]) {
      const ship = this.side(owner).ship;
      if (owner === exceptOwner || !ship || !near(ship.x, ship.y)) continue;
      this.dismount(owner, 'sunk');
      this.side(owner).ship = null;
      razed++;
    }
    return razed;
  }
}
