import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  BannerForm, BannerStats, BarracksStats, BarricadeStats, BuildKind, PathIdx, TurretStats, Tiers,
  BANNER_AURA, BANNER_ORDER, BANNER_STATS, BUILD_COST, EXPANSION_COST, EXPANSION_COST_ENHANCED,
  KIND_LABEL, PATHS, SHOP_SLOT, barracksStats, barricadeStats,
  empireStats, nextUpgrade, pathLocked, townStats, turretStats,
} from './ConquestUpgrades';
import {
  CNQ, ConquestAvatar, ConquestColorFn, ConquestFx, barbarianKing, barracksBody,
  barricadeBody, buildingHpBar, contestTile, fireballOrb, gridCell, hasteRing, linkChain,
  revengeBomb, soldier, territoryTile, townCenterBody, townColor, turretBody, wizardTroop,
} from './ConquestVisuals';

type Owner = 'player' | 'npc';

/** Anything a placed building can be. The town center is a `Town`, not a `Building`. */
type PlaceKind = 'barracks' | 'turret' | 'barricade';

/** Building kinds as integers, for the online snapshot. */
const KIND_CODE: Record<PlaceKind, number> = { barracks: 0, turret: 1, barricade: 2 };
const KIND_OF_CODE: PlaceKind[] = ['barracks', 'turret', 'barricade'];

/**
 * One side's entire empire on the wire. Flat number arrays rather than objects: this goes out
 * four times a second, and the field names would be most of the packet.
 */
export interface NetConquestSnap {
  /** Authority in the bank. */
  a: number;
  /** One character per square: `.` for not-theirs, otherwise the owning town center's digit. */
  c: string;
  /** Town centers, as groups of 5: cell, path-0/1/2 tiers, fireball-ready flag. */
  tw: number[];
  /** Buildings, as groups of 7: cell, kind code, town, hp, path-0/1/2 tiers. */
  b: number[];
  /**
   * Soldiers, as groups of 11: cell, town, hp, base HP, king, damage, attack interval, crowd
   * bonus, wizard, march range, and a flag byte (1 surprise, 2 cloak, 4 guild).
   */
  tr: number[];
  /** Banner Bearer's chosen form, as an index into `BANNER_ORDER`; -1 without the upgrade. */
  bf: number;
  /** The cell of their Personal Wall, or -1. Carried only so the chain can be drawn. */
  lw: number;
}

// ── The board ────────────────────────────────────────────────────────────────

const CELL = 64;
const COLS = 14;
const ROWS = 9;
/** 32px inset on every side of the 960×640 arena — exactly the physics world bounds. */
const ORIGIN_X = 32;
const ORIGIN_Y = 32;
const CELLS = COLS * ROWS;

/** How long the other side's fighter has to stand on a square before it goes neutral. */
const CONTEST_MS = 2000;

// ── Economy ──────────────────────────────────────────────────────────────────

const START_AUTHORITY = 20;
const INSURANCE_PER = 50;
const INSURANCE_PAYS = 2;
const BUILDINGS_PER_TOWN = 9;

// ── Banner Bash ──────────────────────────────────────────────────────────────

const PIKE_REACH = 260;
const PIKE_HALF_WIDTH = 26;
const PIKE_DAMAGE = 20;
/** Standing on your own land, the pike is a quarter of the weapon. */
const PIKE_HOME_MULT = 0.25;

// ── Territory ────────────────────────────────────────────────────────────────

/** Damage taken while standing on any of your own squares. */
const HOME_ARMOUR = 0.5;

// ── Units ────────────────────────────────────────────────────────────────────

const TROOP_RANGE = 90;
const TURRET_RANGE = 220;
const BULLET_LIFE_MS = 1600;
/** Radius a building occupies for projectile and bullet collision. */
const BUILDING_R = 24;
/** The same, for a single soldier — a little wider than the 12 a turret bullet needs, because
 *  arena projectiles are drawn much larger than a tracer. */
const TROOP_HIT_R = 16;
/** How long a building's HP bar stays up after it was last touched. */
const HP_BAR_MS = 4000;

const KING_POTION_HEAL = 50;
const KING_POTION_AT = 0.33;

// ── Shop-gated third paths ───────────────────────────────────────────────────

/** Wizard School: three squares of reach, which is the whole point of a wizard. */
const WIZARD_RANGE = CELL * 3;
/** Academy of Ash: what a wizard leaves behind. */
const ASH_RADIUS = 80;
const ASH_DAMAGE = 25;
/** Wizard Tower / Wizard School clocks. */
const FIREBALL_MS = 10000;
const SCHOOL_MS = 20000;
/** How far above the dome the fireball hovers, and how close a press has to be to grab it. */
const FIREBALL_LIFT = 34;
const FIREBALL_GRAB = 26;
const FIREBALL_DAMAGE = 30;
const FIREBALL_SPEED = 420;
const FIREBALL_RADIUS = 44;
/** Surprise! and Assassin Guild. */
const SURPRISE_BONUS = 10;
const GUILD_TRAMPLE = 12;
/** Speedy Walls. Capped: nine walls of an uncapped 1.15 would be three and a half times speed. */
const HASTE_RANGE = 110;
const HASTE_PER = 1.15;
const HASTE_MAX_STACKS = 4;
/** Force Shield. */
const FORCE_SPEED = 1.25;
const FORCE_DAMAGE = 1.2;
/** Boom Back: bomb flight, and the tower's own patience between retorts. */
const BOMB_SPEED = 300;
const BOMB_RADIUS = 40;
const BOMB_COOLDOWN_MS = 1200;
/** Atomic Annihilation's haul, and how long the victim's legs belong to the turret. */
const BOMB_DRAG_SPEED = 320;
const BOMB_DRAG_MS = 420;

/** Standing positions inside a square, by rank. Five is the largest garrison a barracks reaches. */
const TROOP_FORMATION: [number, number][] = [
  [0, 6], [-17, -4], [17, -4], [-11, 18], [11, 18],
];

/** How often each side ships its whole empire to the peer in an online match. */
const NET_SNAP_MS = 250;

// ── NPC brain ────────────────────────────────────────────────────────────────

const NPC_THINK_MS = 600;
/** A drag every so often, so the NPC's border creeps rather than teleporting outward. */
const NPC_DRAG_MS = 1500;

// ── World objects ────────────────────────────────────────────────────────────

interface Town {
  owner: Owner;
  /** Index into the owner's `towns` array — also its colour slot. */
  index: number;
  cell: number;
  x: number;
  y: number;
  tiers: Tiers;
  /** Milliseconds since the last coin spray. */
  coinAccum: number;
  /** Wizard Tower: time toward the next fireball, and whether one is sitting over the dome. */
  fireAccum: number;
  fireReady: boolean;
  /** Wizard School: time toward the next promotion. */
  schoolAccum: number;
}

interface Building {
  owner: Owner;
  kind: PlaceKind;
  /** Which town center this building counts against, and takes its colour from. */
  town: number;
  cell: number;
  x: number;
  y: number;
  hp: number;
  tiers: Tiers;
  /** Spawn timer (barracks) or reload timer (turret), in ms. */
  accum: number;
  /** Fractional regen carried between frames. */
  regenCarry: number;
  /** Turret: shots left in the current volley, and the gap between them. */
  burstLeft: number;
  burstAccum: number;
  aimAng: number;
  recoil: number;
  /** Damage soaked since the last spike retort — see `damageBuilding`. */
  spikeCarry: number;
  lastHitAt: number;
  /** Boom Back: when this turret last threw one, so a DoT can't turn it into a mortar battery. */
  bombAt: number;
  seed: number;
}

interface Troop {
  owner: Owner;
  town: number;
  cell: number;
  hp: number;
  /**
   * HP before the empire-wide military buff. Kept unmultiplied so the ceiling can be recomputed
   * from scratch every time it is read — storing the multiplied value and rescaling it on each
   * purchase would compound Military Center into Military HQ.
   */
  baseHp: number;
  /** Snapshotted from the barracks that trained it; the empire-wide mult is applied live. */
  damage: number;
  atkMs: number;
  crowdBonus: boolean;
  king: boolean;
  accum: number;
  march: number;
  ang: number;
  /** Barbarian King only. */
  potionUsed: boolean;
  enraged: boolean;
  // ── SHADOW path, snapshotted from the barracks that trained this soldier ──
  /** Speedy: squares it can cross in one drag. */
  marchRange: number;
  /** Surprise!: whether it opens with a bonus swing on new ground. */
  surprise: boolean;
  /** Set the moment it arrives somewhere it has not stood, spent by the next swing. */
  fresh: boolean;
  /** Shadow Cloak: the first hit aimed at it always misses. */
  cloak: boolean;
  cloakUsed: boolean;
  /** Chance every later hit misses too. */
  dodge: number;
  /** Assassin Guild: marching through the enemy cuts them. */
  guild: boolean;
  // ── ARCANE path ──
  /** Wizard School promoted this one: three squares of reach, double HP, half damage. */
  wizard: boolean;
}

/** What a bullet is. Plain shots fly and hit; the other two detonate. */
type BulletKind = 'shot' | 'bomb' | 'fireball';

interface Bullet {
  owner: Owner;
  kind: BulletKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  diesAt: number;
  head: boolean;
  /** Boom Bullets: radius and damage of the burst a landed shot leaves. 0 for no burst. */
  boomR: number;
  boomDamage: number;
  /** Bombs and fireballs: when they go off regardless of having hit anything. */
  explodeAt: number;
  /** Atomic Annihilation: this bomb hauls whoever it catches back toward `homeX/homeY`. */
  drag: boolean;
  homeX: number;
  homeY: number;
  /** Free-running phase for the bomb's fuse and spin. */
  spin: number;
}

/** Atomic Annihilation's haul: a fighter whose legs belong to a turret for a moment. */
interface Pull {
  f: Fighter;
  x: number;
  y: number;
  until: number;
}

/** Anything a turret bullet or a soldier can swing at. */
type Mark =
  | { kind: 'fighter'; f: Fighter; x: number; y: number }
  | { kind: 'troop'; t: Troop; x: number; y: number }
  | { kind: 'building'; b: Building; x: number; y: number };

/** Whoever dealt a hit, for Spiked Walls to answer. */
type Source = { kind: 'fighter'; f: Fighter } | { kind: 'troop'; t: Troop } | null;

interface Side {
  owner: Owner;
  authority: number;
  towns: Town[];
  /** `rawDamageTaken` as of last frame — the poll behind Insurance. */
  lastRaw: number;
  insuranceCarry: number;
  /** NPC brain clocks. */
  thinkAccum: number;
  dragAccum: number;
  /** Where the NPC is walking to place its next building, if anywhere. */
  seek: { x: number; y: number } | null;
  /** What the NPC intends to place when it gets there. */
  seekKind: PlaceKind | 'expansion' | null;
  /** Banner Bearer: which standard this commander is carrying. */
  banner: BannerForm;
  /** Personal Wall: the barricade currently taking this commander's hits. */
  linkedWall: Building | null;
  /**
   * The cell of the *remote* opponent's linked wall. Their absorber runs on their own sim — this
   * is carried purely so the chain is drawn on both screens.
   */
  netLinkCell: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, authority: START_AUTHORITY, towns: [], lastRaw: 0, insuranceCarry: 0,
    thinkAccum: 0, dragAccum: 0, seek: null, seekKind: null,
    banner: 'offense', linkedWall: null, netLinkCell: -1,
  };
}

// ── Menu bridge ──────────────────────────────────────────────────────────────

/**
 * What the upgrade menu scene is allowed to see and do. The scene never touches a `Building`
 * directly — it reads a flat snapshot and spends through `buy`, so the kit stays the only
 * thing that knows what an upgrade actually means.
 */
export interface ConquestMenuModel {
  kind: BuildKind;
  title: string;
  /** Tiers bought on each path. */
  tiers: Tiers;
  hp: number;
  maxHp: number;
  /** Null when the building is indestructible (the town center). */
  destructible: boolean;
  authority: number;
  /**
   * Which columns to draw. Two without the matching shop upgrade, three with it — the third path
   * is not shown greyed out, because a column you cannot ever open in this match is noise.
   */
  paths: PathIdx[];
  /** Per path: the next upgrade's name/desc/cost, or null when there isn't one. */
  next: ({ name: string; desc: string; cost: number } | null)[];
  /** Per path: why the next upgrade can't be bought, or null when it can. */
  blocked: (string | null)[];
  /**
   * Personal Wall. `null` on anything that isn't a linkable barricade; otherwise whether this is
   * the wall you are linked to, another one is, or none is.
   */
  link: 'linked' | 'elsewhere' | 'free' | null;
  color: number;
}

export interface ConquestMenuHost {
  getMenuModel(): ConquestMenuModel | null;
  buyUpgrade(path: PathIdx): boolean;
  /** Personal Wall: link to this barricade, or unlink if it is already the linked one. */
  toggleLink(): boolean;
  closeUpgradeMenu(): void;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface ConquestArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  /** Banner Bearer cycles forms on the right button, so the kit needs its rising edge too. */
  get rightPointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Conquest visual colour through that side's equipped skin. */
  conquestColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Pauses the arena and launches ConquestMenuScene over it. */
  openUpgradeMenu(): void;
  /** Online: the npc slot is a remote human, whose empire is snapshot-driven rather than simulated. */
  get npcIsNetReplica(): boolean;
  /** Invasion co-op: the npc slot is an ally, so its soldiers must not point at the player. */
  get isCoop(): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** True if the local player (Conquest) has the given shop upgrade slot equipped. */
  hasUpgrade(slot: string): boolean;
  /** True if the online opponent (Conquest) has it — their upgraded board replays on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── ConquestKit ──────────────────────────────────────────────────────────────

export class ConquestKit implements ConquestMenuHost {
  private api: ConquestArenaApi;

  // ── Visuals ──
  private readonly pcol: ConquestColorFn;
  private readonly ncol: ConquestColorFn;
  private readonly pfx: ConquestFx;
  private readonly nfx: ConquestFx;
  private playerAvatar: ConquestAvatar | null = null;
  private npcAvatar: ConquestAvatar | null = null;
  /** The board and the territory wash. Repainted only when ownership changes. */
  private gridGfx: Phaser.GameObjects.Graphics | null = null;
  private gridDirty = true;
  /** Contest hatching and the drag preview — per frame, but under everything. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Buildings and soldiers. Under the fighters, so a player is never hidden by their own base. */
  private objGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bullets and HP bars — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudText: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  /** Ownership of every square. `town` is an index into that owner's `towns`. */
  private cellOwner: (Owner | null)[] = new Array(CELLS).fill(null);
  private cellTown: number[] = new Array(CELLS).fill(0);
  private buildings: Building[] = [];
  private troops: Troop[] = [];
  private bullets: Bullet[] = [];
  /** Fighters an Atomic bomb is currently hauling. Applied after ArenaScene resolves movement. */
  private pulls: Pull[] = [];
  /**
   * The `damageAbsorber` closures this kit installed, per side. Kept so the field is only ever
   * cleared when it is still *ours* — every other kit that uses it owns the same one slot.
   */
  private absorbers: Partial<Record<Owner, (amount: number) => boolean>> = {};
  /** Squares being stood on by the other side: cell → { by, ms }. */
  private contest = new Map<number, { by: Owner; ms: number }>();
  /** Fractional seconds carried between frames by the Healing standard, per side. */
  private bannerHealCarry: Record<Owner, number> = { player: 0, npc: 0 };
  /** True once both sides' opening territory has been laid down. */
  private seeded = false;

  // ── Input ──
  private aimX = 0;
  private aimY = 0;
  /** The square a troop drag started from, or -1. */
  private dragFrom = -1;
  private dragging = false;
  /** Moving Walls: the barricade being dragged, or null. */
  private wallDrag: Building | null = null;
  /** Wizard Tower: the town whose fireball is currently in hand, or null. */
  private fireDrag: Town | null = null;
  /** The building or town whose menu is open (or about to be). */
  private menuTarget: Building | Town | null = null;

  constructor(api: ConquestArenaApi) {
    this.api = api;
    this.pcol = (base) => api.conquestColor('player', base);
    this.ncol = (base) => api.conquestColor('npc', base);
    this.pfx = new ConquestFx(api.scene, this.pcol);
    this.nfx = new ConquestFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): ConquestFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): ConquestColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isConquest(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'conquest' : this.api.npcElementId === 'conquest';
  }

  /**
   * Everything this side is allowed to hurt. In Invasion co-op the npc slot holds an *ally*,
   * so its soldiers point at the husks rather than at the person they are playing with.
   */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' || this.api.isCoop ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /**
   * True when the npc slot is a networked human rather than a bot. Their empire arrives as a
   * snapshot, so this sim must not run their economy or their brain — but it still runs their
   * soldiers and turrets, because those are what hurt *our* buildings, and our buildings are
   * ours to be authoritative about.
   */
  private get npcIsRemote(): boolean {
    return this.api.npcIsNetReplica;
  }

  private avatar(owner: Owner): ConquestAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  // ── Shop upgrades ──────────────────────────────────────────────────────────

  /**
   * Whether a side has one of Conquest's five corrupt-shard upgrades. An offline bot never does
   * (`hasNpcUpgrade` is online-only), which is exactly right: the third paths are the player's
   * reward, and a bot that had them for free would be a different fight entirely.
   */
  private owns(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** Whether a tree's shop-gated third column is open to this side at all. */
  private pathUnlocked(owner: Owner, kind: BuildKind): boolean {
    return this.owns(owner, SHOP_SLOT[kind]);
  }

  /** Which columns a side may spend into — three with the shop upgrade, two without. */
  private pathsFor(owner: Owner, kind: BuildKind): PathIdx[] {
    return this.pathUnlocked(owner, kind) ? PATHS : [0, 1];
  }

  /** The standard this commander is carrying, or null before Banner Bearer is bought. */
  private bannerOf(owner: Owner): BannerStats | null {
    return this.owns(owner, 'click') ? BANNER_STATS[this.side(owner).banner] : null;
  }

  /** Q+ — Expansion Enhanced knocks a third off a second capital. */
  private expansionCost(owner: Owner): number {
    return this.owns(owner, 'q') ? EXPANSION_COST_ENHANCED : EXPANSION_COST;
  }

  /** The wall this side is linked to, if it is still standing and still linkable. */
  private linkedWall(owner: Owner): Building | null {
    const w = this.side(owner).linkedWall;
    if (!w || !this.buildings.includes(w)) {
      this.side(owner).linkedWall = null;
      return null;
    }
    return barricadeStats(w.tiers, this.empire(owner).fortressHp).linkable ? w : null;
  }

  /**
   * Force Shield's damage boost, folded into everything Conquest itself deals — the pike, its
   * soldiers, its turrets and its fireballs. Kept inside the kit rather than on a generic Fighter
   * field because every one of those sources is already a kit-internal number.
   */
  private outMult(owner: Owner): number {
    const w = this.linkedWall(owner);
    if (!w) return 1;
    return barricadeStats(w.tiers, this.empire(owner).fortressHp).forceShield ? FORCE_DAMAGE : 1;
  }

  // ── Grid maths ─────────────────────────────────────────────────────────────

  private cellAt(x: number, y: number): number {
    const c = Math.floor((x - ORIGIN_X) / CELL);
    const r = Math.floor((y - ORIGIN_Y) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  private cellX(i: number): number { return ORIGIN_X + (i % COLS) * CELL; }
  private cellY(i: number): number { return ORIGIN_Y + Math.floor(i / COLS) * CELL; }
  private centreX(i: number): number { return this.cellX(i) + CELL / 2; }
  private centreY(i: number): number { return this.cellY(i) + CELL / 2; }

  /** The eight neighbours of a cell, in bounds only. */
  private around(i: number): number[] {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        out.push(nr * COLS + nc);
      }
    }
    return out;
  }

  /** Every cell within `n` squares of `i` — the reach of a march, once Speedy makes that two. */
  private within(i: number, n: number): number[] {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const out: number[] = [];
    for (let dr = -n; dr <= n; dr++) {
      for (let dc = -n; dc <= n; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        out.push(nr * COLS + nc);
      }
    }
    return out;
  }

  private inRange(a: number, b: number, n: number): boolean {
    const dc = Math.abs((a % COLS) - (b % COLS));
    const dr = Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS));
    return dc <= n && dr <= n && (dc + dr) > 0;
  }

  private adjacent(a: number, b: number): boolean {
    return this.inRange(a, b, 1);
  }

  /**
   * The squares a march actually crosses, destination included. Only ever longer than one entry
   * once Speedy is bought — and it exists for exactly one upgrade, the Assassin Guild's habit of
   * cutting whatever it walks past.
   */
  private pathCells(from: number, to: number): number[] {
    const fc = from % COLS;
    const fr = Math.floor(from / COLS);
    const tc = to % COLS;
    const tr = Math.floor(to / COLS);
    const steps = Math.max(Math.abs(tc - fc), Math.abs(tr - fr));
    const out: number[] = [];
    for (let i = 1; i <= steps; i++) {
      const c = fc + Math.round(((tc - fc) * i) / steps);
      const r = fr + Math.round(((tr - fr) * i) / steps);
      out.push(r * COLS + c);
    }
    return out;
  }

  private ownerOf(cell: number): Owner | null {
    return cell < 0 ? null : this.cellOwner[cell];
  }

  private buildingAt(cell: number): Building | null {
    return this.buildings.find((b) => b.cell === cell) ?? null;
  }

  private townAt(cell: number): Town | null {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const t = this.sides[owner].towns.find((tw) => tw.cell === cell);
      if (t) return t;
    }
    return null;
  }

  /** Which of this side's town centers a square should belong to — nearest wins. */
  private nearestTown(owner: Owner, cell: number): number {
    const towns = this.side(owner).towns;
    let best = 0;
    let bestD = Infinity;
    for (const t of towns) {
      const d = Math.hypot(this.centreX(cell) - t.x, this.centreY(cell) - t.y);
      if (d < bestD) { bestD = d; best = t.index; }
    }
    return best;
  }

  private setCell(cell: number, owner: Owner | null, town = 0): void {
    if (this.cellOwner[cell] === owner && this.cellTown[cell] === town) return;
    this.cellOwner[cell] = owner;
    this.cellTown[cell] = town;
    this.gridDirty = true;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // The territory armour is written onto the fighters every frame, so it has to be handed
    // back or the next match starts with somebody permanently armoured.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      f.conquestIncomingMult = 1;
      // Personal Wall's absorber is the one field here another kit also writes, so it is handed
      // back only if it is still the closure we installed.
      if (this.absorbers[owner] && f.damageAbsorber === this.absorbers[owner]) f.damageAbsorber = null;
    }
    this.absorbers = {};

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.cellOwner = new Array(CELLS).fill(null);
    this.cellTown = new Array(CELLS).fill(0);
    this.buildings = [];
    this.troops = [];
    this.bullets = [];
    this.pulls = [];
    this.contest.clear();
    this.bannerHealCarry = { player: 0, npc: 0 };
    this.seeded = false;
    this.gridDirty = true;
    this.aimX = 0;
    this.aimY = 0;
    this.dragFrom = -1;
    this.dragging = false;
    this.wallDrag = null;
    this.fireDrag = null;
    this.menuTarget = null;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.gridGfx?.destroy(); this.gridGfx = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.objGfx?.destroy(); this.objGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudText?.destroy(); this.hudText = null;
  }

  private ensureLayers(): void {
    if (!this.gridGfx) this.gridGfx = this.api.scene.add.graphics().setDepth(1);
    if (!this.groundGfx) this.groundGfx = this.api.scene.add.graphics().setDepth(2);
    if (!this.objGfx) this.objGfx = this.api.scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = this.api.scene.add.graphics().setDepth(7);
    if (!this.hudGfx) this.hudGfx = this.api.scene.add.graphics().setDepth(22);
    if (!this.hudText) {
      this.hudText = this.api.scene.add.text(0, 0, '', {
        fontSize: '15px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#f2e8d0',
      }).setDepth(23);
    }
    if (!this.playerAvatar && this.isConquest('player')) {
      this.playerAvatar = new ConquestAvatar(this.api.scene, this.pcol);
    }
    if (!this.npcAvatar && this.isConquest('npc')) {
      this.npcAvatar = new ConquestAvatar(this.api.scene, this.ncol);
    }
  }

  /**
   * The opening nine squares. Done lazily on the first frame rather than in `reset` because
   * the fighters are not standing anywhere meaningful until the arena has finished placing
   * them, and the spawn territory is defined entirely by where they end up.
   */
  private seed(): void {
    this.seeded = true;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isConquest(owner)) continue;
      const f = this.fighter(owner);
      if (!f) continue;
      // Pulled a square in from the edge so the opening 3×3 is always fully on the board.
      const c = Phaser.Math.Clamp(Math.floor((f.x - ORIGIN_X) / CELL), 1, COLS - 2);
      const r = Phaser.Math.Clamp(Math.floor((f.y - ORIGIN_Y) / CELL), 1, ROWS - 2);
      this.foundTown(owner, r * COLS + c, true);
    }
  }

  /** Plants a town center and claims the 3×3 around it. */
  private foundTown(owner: Owner, cell: number, silent = false): Town {
    const side = this.side(owner);
    const town: Town = {
      owner,
      index: side.towns.length,
      cell,
      x: this.centreX(cell),
      y: this.centreY(cell),
      tiers: [0, 0, 0],
      coinAccum: 0,
      fireAccum: 0,
      fireReady: false,
      schoolAccum: 0,
    };
    side.towns.push(town);
    this.setCell(cell, owner, town.index);
    for (const n of this.around(cell)) {
      // Never steal from the other side's existing land — Expansion already refuses to plant
      // anywhere that would, and the seed can't reach it.
      if (this.cellOwner[n] !== null && this.cellOwner[n] !== owner) continue;
      this.setCell(n, owner, town.index);
    }
    if (!silent) {
      this.fx(owner).claim(this.cellX(cell) - CELL, this.cellY(cell) - CELL, CELL * 3, townColor(owner, town.index));
    }
    return town;
  }

  // ── Economy ────────────────────────────────────────────────────────────────

  private empire(owner: Owner) {
    return empireStats(this.side(owner).towns.map((t) => t.tiers));
  }

  private buildingCount(owner: Owner): number {
    return this.buildings.reduce((n, b) => n + (b.owner === owner ? 1 : 0), 0);
  }

  private buildingCap(owner: Owner): number {
    return this.side(owner).towns.length * BUILDINGS_PER_TOWN;
  }

  private costOf(owner: Owner, kind: PlaceKind): number {
    return Math.max(0, BUILD_COST[kind] - this.empire(owner).discount);
  }

  private maxHpOf(b: Building): number {
    const fort = this.empire(b.owner).fortressHp;
    if (b.kind === 'barracks') return barracksStats(b.tiers, fort).maxHp;
    if (b.kind === 'turret') return turretStats(b.tiers, fort).maxHp;
    return barricadeStats(b.tiers, fort).maxHp;
  }

  private tickEconomy(owner: Owner, dt: number): void {
    const side = this.side(owner);
    if (!side.towns.length) return;
    const emp = this.empire(owner);
    side.authority += emp.income * dt;

    // Coins out of each town center, so income is visible without reading the HUD.
    for (const t of side.towns) {
      t.coinAccum += dt;
      if (t.coinAccum >= 3) {
        t.coinAccum = 0;
        this.fx(owner).coins(t.x, t.y - 18, 3);
      }
      this.tickArcane(t, dt * 1000);
    }

    // Insurance polls raw damage rather than hooking `damaged`, so a hit that a shield ate
    // still counts — the payout is for being shot at, not for losing HP.
    const f = this.fighter(owner);
    if (!f) return;
    const raw = f.rawDamageTaken;
    const gained = Math.max(0, raw - side.lastRaw);
    side.lastRaw = raw;
    if (!emp.insurance || gained <= 0) return;
    side.insuranceCarry += gained;
    while (side.insuranceCarry >= INSURANCE_PER) {
      side.insuranceCarry -= INSURANCE_PER;
      side.authority += INSURANCE_PAYS;
      this.api.showFloatingText(f.x, f.y - 52, `🛡️ +${INSURANCE_PAYS}`, this.hex(CNQ.gold));
    }
  }

  // ── The ARCANE path (Q+) ───────────────────────────────────────────────────

  /**
   * A town center's two clocks: the Wizard Tower growing a fireball, and the Wizard School
   * promoting a soldier. Both are per *town* rather than per empire, so Expansion is what
   * actually scales the arcane path — a second capital is a second fireball every ten seconds.
   */
  private tickArcane(t: Town, dtMs: number): void {
    const s = townStats(t.tiers);

    if (s.fireball) {
      // The clock only runs while the last one is still unspent, so a fireball left sitting over
      // the dome is a fireball you are wasting rather than one that stacks.
      if (!t.fireReady) {
        t.fireAccum += dtMs;
        if (t.fireAccum >= FIREBALL_MS) {
          t.fireAccum = 0;
          t.fireReady = true;
          this.fx(t.owner).fireburst(t.x, t.y - FIREBALL_LIFT, 16);
        }
      }
    } else {
      t.fireReady = false;
      t.fireAccum = 0;
    }

    if (!s.wizardSchool) return;
    t.schoolAccum += dtMs;
    if (t.schoolAccum < SCHOOL_MS) return;
    // Held rather than reset when there is nobody to promote — a school with no students should
    // graduate the next recruit the moment one exists, not restart its twenty seconds.
    const pool = this.troops.filter((tr) => tr.owner === t.owner && !tr.wizard && !tr.king);
    if (!pool.length) { t.schoolAccum = SCHOOL_MS; return; }
    t.schoolAccum = 0;
    this.promote(pool[Math.floor(Math.random() * pool.length)]);
  }

  /**
   * A soldier becoming a wizard. The new stats are taken *from the man*, not from a table: a
   * Berserker-trained veteran promotes into a much better wizard than a raw recruit does, which
   * is what makes the STRENGTH path and the ARCANE path worth owning together.
   */
  private promote(t: Troop): void {
    t.wizard = true;
    t.baseHp *= 2;
    t.hp = this.troopMaxHp(t);
    t.damage = Math.max(1, Math.round(t.damage * 0.5));
    this.fx(t.owner).promote(this.troopX(t), this.troopY(t));
    this.api.showFloatingText(this.troopX(t), this.troopY(t) - 28, '🧙 WIZARD', this.hex(CNQ.arcane));
  }

  /** Wizard Tower: the orb hovers here, and this is what a press has to be near to grab it. */
  private fireballPos(t: Town): { x: number; y: number } {
    return { x: t.x, y: t.y - FIREBALL_LIFT };
  }

  /** Whichever ready fireball a press at (x, y) is reaching for. */
  private fireballAt(owner: Owner, x: number, y: number): Town | null {
    for (const t of this.side(owner).towns) {
      if (!t.fireReady) continue;
      const p = this.fireballPos(t);
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= FIREBALL_GRAB) return t;
    }
    return null;
  }

  /** Hurling one. A slow, fat, obvious projectile that bursts where it lands. */
  private hurlFireball(t: Town, tx: number, ty: number): void {
    t.fireReady = false;
    t.fireAccum = 0;
    const p = this.fireballPos(t);
    const ang = Math.atan2(ty - p.y, tx - p.x);
    const ash = this.empire(t.owner).ash;
    this.bullets.push({
      owner: t.owner, kind: 'fireball',
      x: p.x, y: p.y,
      vx: Math.cos(ang) * FIREBALL_SPEED, vy: Math.sin(ang) * FIREBALL_SPEED,
      damage: Math.max(1, Math.round(FIREBALL_DAMAGE * (ash ? 1.5 : 1) * this.outMult(t.owner))),
      diesAt: this.now + 2600, head: false,
      boomR: 0, boomDamage: 0,
      explodeAt: this.now + 2600,
      drag: false, homeX: p.x, homeY: p.y, spin: 0,
    });
    this.api.showFloatingText(p.x, p.y - 18, '🔥 FIREBALL', this.hex(CNQ.ember));
  }

  // ── Territory ──────────────────────────────────────────────────────────────

  private tickTerritory(dt: number): void {
    const dtMs = dt * 1000;
    const seen = new Set<number>();

    for (const owner of ['player', 'npc'] as Owner[]) {
      const intruder = this.fighter(this.other(owner));
      if (!this.alive(intruder)) continue;
      const cell = this.cellAt(intruder.x, intruder.y);
      if (cell < 0 || this.cellOwner[cell] !== owner) continue;
      // The town center's own square is the anchor of the whole empire and can't be walked off.
      if (this.side(owner).towns.some((t) => t.cell === cell)) continue;

      seen.add(cell);
      const rec = this.contest.get(cell) ?? { by: this.other(owner), ms: 0 };
      rec.by = this.other(owner);
      rec.ms += dtMs;
      this.contest.set(cell, rec);

      if (rec.ms >= CONTEST_MS) {
        this.contest.delete(cell);
        seen.delete(cell);
        const color = townColor(owner, this.cellTown[cell]);
        this.setCell(cell, null);
        this.fx(owner).claim(this.cellX(cell), this.cellY(cell), CELL, color);
        this.api.showFloatingText(this.centreX(cell), this.centreY(cell) - 12, 'LOST', this.hex(CNQ.blood));
      }
    }

    // Anything nobody is standing on cools straight off — a contest is a stand, not a tally.
    for (const key of [...this.contest.keys()]) if (!seen.has(key)) this.contest.delete(key);
  }

  /** The armour and the click penalty both key off "am I on my own land". */
  private standingTown(owner: Owner): number {
    const f = this.fighter(owner);
    if (!this.alive(f)) return -1;
    const cell = this.cellAt(f.x, f.y);
    if (cell < 0 || this.cellOwner[cell] !== owner) return -1;
    return this.cellTown[cell];
  }

  // ── Placement ──────────────────────────────────────────────────────────────

  /**
   * Whether a build is legal *right now*, and why not if it isn't. Called from `handleInput`
   * before `castAbility` rather than from `doBuild`: by the time a cast runs the cooldown has
   * already been stamped, so refusing there would silently eat the ability.
   */
  private buildRefusal(owner: Owner, kind: PlaceKind): string | null {
    const f = this.fighter(owner);
    if (!this.alive(f)) return 'DEAD';
    const cell = this.cellAt(f.x, f.y);
    if (cell < 0 || this.cellOwner[cell] !== owner) return 'NOT YOUR LAND';
    if (this.buildingAt(cell) || this.townAt(cell)) return 'SQUARE TAKEN';
    if (this.buildingCount(owner) >= this.buildingCap(owner)) {
      return `BUILD LIMIT ${this.buildingCap(owner)}`;
    }
    if (this.side(owner).authority < this.costOf(owner, kind)) return 'NOT ENOUGH AUTHORITY';
    return null;
  }

  private expansionRefusal(owner: Owner): string | null {
    const f = this.fighter(owner);
    if (!this.alive(f)) return 'DEAD';
    if (this.side(owner).authority < this.expansionCost(owner)) return 'NOT ENOUGH AUTHORITY';
    const cell = this.cellAt(f.x, f.y);
    if (cell < 0) return 'OFF THE BOARD';
    const c = cell % COLS;
    const r = Math.floor(cell / COLS);
    if (c < 1 || c >= COLS - 1 || r < 1 || r >= ROWS - 1) return 'TOO CLOSE TO THE EDGE';
    // The whole 3×3 has to be free — a new capital that overlaps the old one buys nothing,
    // and one that overlaps theirs would be a claim rather than an expansion.
    if (this.cellOwner[cell] !== null) return 'ALREADY CLAIMED';
    for (const n of this.around(cell)) if (this.cellOwner[n] !== null) return 'ALREADY CLAIMED';
    return null;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Banner Bash. A segment rather than a cone: the pike is the longest reach in the
   * game and a cone that wide would simply be a screen-clear.
   */
  doBanner(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const ex = f.x + Math.cos(ang) * PIKE_REACH;
    const ey = f.y + Math.sin(ang) * PIKE_REACH;
    const home = this.standingTown(owner) >= 0;
    // Banner Bearer replaces the pike's flat 20 with whichever standard is being carried, and
    // Enchantment adds on top of that. The home-ground quarter still applies to all of it —
    // the land is where you are safe, never where you are strong, and no upgrade changes that.
    const banner = this.bannerOf(owner);
    const base = (banner?.damage ?? PIKE_DAMAGE) + this.empire(owner).bannerBonus;
    const dmg = Math.max(1, Math.round(base * (home ? PIKE_HOME_MULT : 1) * this.outMult(owner)));
    const color = banner?.color ?? townColor(owner, Math.max(0, this.standingTown(owner)));

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).thrust(f.x, f.y, ang, PIKE_REACH, color);

    // One target: a poke that swept a 260px line through everything would be the best
    // clear in the game rather than the worst basic attack. Soldiers are in the running for
    // it — a pike that passed straight through a garrison would leave the other side's board
    // untouchable by hand.
    let victim: Mark | null = null;
    let victimDist = Infinity;
    for (const m of this.marksAgainst(owner)) {
      if (m.kind === 'building') continue;
      if (this.distToSegment(f.x, f.y, ex, ey, m.x, m.y) > PIKE_HALF_WIDTH) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y);
      if (d < victimDist) { victimDist = d; victim = m; }
    }
    if (victim?.kind === 'fighter') {
      victim.f.takeDamage(dmg);
      this.api.spawnHitFlash(victim.f.x, victim.f.y, CNQ.steel);
    } else if (victim) {
      this.hitMark(victim, dmg, { kind: 'fighter', f }, owner);
    }

    // The pike also reaches the other side's buildings — a base is not immune to the one
    // weapon the element gives you.
    let hitB: Building | null = null;
    let hitD = Infinity;
    for (const b of this.buildings) {
      if (b.owner === owner) continue;
      if (this.distToSegment(f.x, f.y, ex, ey, b.x, b.y) > PIKE_HALF_WIDTH + 10) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y);
      if (d < hitD) { hitD = d; hitB = b; }
    }
    if (hitB && !victim) this.damageBuilding(hitB, dmg, { kind: 'fighter', f });

    if (home && !victim && !hitB) {
      this.api.showFloatingText(f.x, f.y - 46, 'HOME GROUND', this.hex(CNQ.gold));
    }
  }

  /** E / R / F — the three placements, all one code path. */
  doBuild(owner: Owner, kind: PlaceKind): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.buildRefusal(owner, kind)) return;

    const cell = this.cellAt(f.x, f.y);
    const side = this.side(owner);
    side.authority -= this.costOf(owner, kind);
    const town = this.cellTown[cell];

    const b: Building = {
      owner, kind, town, cell,
      x: this.centreX(cell), y: this.centreY(cell),
      hp: 0, tiers: [0, 0, 0],
      accum: 0, regenCarry: 0,
      burstLeft: 0, burstAccum: 0,
      aimAng: owner === 'player' ? 0 : Math.PI,
      recoil: 0, spikeCarry: 0, lastHitAt: -HP_BAR_MS, bombAt: -BOMB_COOLDOWN_MS,
      seed: Math.random() * 999,
    };
    b.hp = this.maxHpOf(b);
    this.buildings.push(b);

    this.avatar(owner)?.play('slam', Math.PI / 2);
    this.fx(owner).raise(b.x, b.y, CELL, townColor(owner, town));
    this.api.showFloatingText(b.x, b.y - 34, KIND_LABEL[kind], this.hex(townColor(owner, town)));
  }

  /** Q — Expansion. A whole second economy, planted where you stand. */
  doExpansion(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (this.expansionRefusal(owner)) return;

    const cell = this.cellAt(f.x, f.y);
    const side = this.side(owner);
    side.authority -= this.expansionCost(owner);
    const town = this.foundTown(owner, cell);

    this.avatar(owner)?.play('raise');
    this.api.showFloatingText(f.x, f.y - 56, '🏛️ EXPANSION', this.hex(townColor(owner, town.index)));
  }

  // ── Damage ─────────────────────────────────────────────────────────────────

  /** Perpendicular distance from a point to the segment a→b — the pike's hit test. */
  private distToSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Phaser.Math.Distance.Between(ax, ay, px, py);
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(ax + dx * t, ay + dy * t, px, py);
  }

  /** The best (lowest) resistance multiplier any adjacent friendly barricade is granting. */
  private wardMultFor(b: Building): number {
    const fort = this.empire(b.owner).fortressHp;
    let mult = 1;
    for (const w of this.buildings) {
      if (w.kind !== 'barricade' || w.owner !== b.owner) continue;
      if (!this.adjacent(w.cell, b.cell)) continue;
      mult = Math.min(mult, barricadeStats(w.tiers, fort).wardMult);
    }
    return mult;
  }

  /**
   * The single chokepoint for hurting a building. Everything routes through here — the pike,
   * projectiles, bullets, soldiers — because the barricade aura and Spiked Walls both have to
   * see every hit, and a second damage path would silently miss both.
   */
  private damageBuilding(b: Building, amount: number, src: Source): void {
    const dealt = Math.max(1, Math.round(amount * this.wardMultFor(b) * this.bannerWardFor(b)));
    b.hp -= dealt;
    b.lastHitAt = this.now;
    this.api.spawnHitFlash(b.x, b.y, CNQ.stone);

    // Spiked Walls: the wall that was hit, or any wall beside whatever was hit.
    const fort = this.empire(b.owner).fortressHp;
    for (const w of this.buildings) {
      if (w.kind !== 'barricade' || w.owner !== b.owner) continue;
      if (w !== b && !this.adjacent(w.cell, b.cell)) continue;
      if (!barricadeStats(w.tiers, fort).spikes) continue;
      w.spikeCarry += dealt;
      while (w.spikeCarry >= 20) {
        w.spikeCarry -= 20;
        this.retort(w, src);
      }
    }

    // Boom Back. Rate-limited per tower, because otherwise a single burn tick turns a turret
    // into a mortar battery firing forty times a second.
    if (b.kind === 'turret' && src && this.now - b.bombAt >= BOMB_COOLDOWN_MS) {
      const s = turretStats(b.tiers, fort);
      if (s.boomBack) {
        b.bombAt = this.now;
        this.lobBomb(b, s, src);
      }
    }

    if (b.hp <= 0) this.destroyBuilding(b);
  }

  /**
   * The Defensive standard's shelter over nearby buildings. A separate factor from the barricade
   * aura rather than folded into `wardMultFor`, because the two stack deliberately: a wall behind
   * a defensive banner is the toughest thing Conquest can put on the board.
   */
  private bannerWardFor(b: Building): number {
    const banner = this.bannerOf(b.owner);
    if (!banner || banner.buildingMult >= 1) return 1;
    const f = this.fighter(b.owner);
    if (!this.alive(f)) return 1;
    return Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) <= BANNER_AURA ? banner.buildingMult : 1;
  }

  /** Boom Back answering: a slow bomb thrown at whoever just hurt the tower. */
  private lobBomb(b: Building, s: TurretStats, src: Source): void {
    if (!src) return;
    const tx = src.kind === 'fighter' ? src.f.x : this.troopX(src.t);
    const ty = src.kind === 'fighter' ? src.f.y : this.troopY(src.t);
    const d = Phaser.Math.Distance.Between(b.x, b.y, tx, ty);
    if (d < 1) return;
    const ang = Math.atan2(ty - b.y, tx - b.x);
    this.bullets.push({
      owner: b.owner, kind: 'bomb',
      x: b.x, y: b.y,
      vx: Math.cos(ang) * BOMB_SPEED, vy: Math.sin(ang) * BOMB_SPEED,
      damage: Math.max(1, Math.round(s.bombDamage * this.outMult(b.owner))),
      diesAt: this.now + 3000, head: false,
      boomR: 0, boomDamage: 0,
      // Aimed at where they *were*: a bomb you can walk out of is the price of it being a bomb.
      explodeAt: this.now + (d / BOMB_SPEED) * 1000,
      drag: s.bombDrag, homeX: b.x, homeY: b.y, spin: Math.random() * Math.PI * 2,
    });
  }

  /**
   * Area damage from one of Conquest's own detonations — bursts, blasts, bombs, fireballs and a
   * dying wizard all land through here. `except` is the mark the parent hit already billed, so a
   * Boom Bullet cannot charge its victim twice for the same shot.
   */
  private splash(
    x: number, y: number, radius: number, owner: Owner, damage: number, except?: Mark,
  ): void {
    if (damage <= 0) return;
    for (const m of this.marksAgainst(owner)) {
      if (!this.stillThere(m)) continue;
      if (except && this.sameMark(m, except)) continue;
      // Re-read the position: a soldier's slot moves as the ranks in front of it die.
      const mx = m.kind === 'troop' ? this.troopX(m.t) : m.x;
      const my = m.kind === 'troop' ? this.troopY(m.t) : m.y;
      if (Phaser.Math.Distance.Between(x, y, mx, my) > radius) continue;
      this.hitMark(m, damage, null, owner);
    }
  }

  private sameMark(a: Mark, b: Mark): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'fighter' && b.kind === 'fighter') return a.f === b.f;
    if (a.kind === 'troop' && b.kind === 'troop') return a.t === b.t;
    if (a.kind === 'building' && b.kind === 'building') return a.b === b.b;
    return false;
  }

  /** Spiked Walls answering whoever swung. */
  private retort(wall: Building, src: Source): void {
    if (!src) return;
    if (src.kind === 'fighter') {
      if (!this.alive(src.f)) return;
      src.f.takeDamage(5);
      this.fx(wall.owner).spikes(src.f.x, src.f.y);
    } else {
      src.t.hp -= 5;
      this.fx(wall.owner).spikes(this.troopX(src.t), this.troopY(src.t));
    }
  }

  private destroyBuilding(b: Building): void {
    const i = this.buildings.indexOf(b);
    if (i >= 0) this.buildings.splice(i, 1);
    this.fx(b.owner).rubble(b.x, b.y, CELL);
    this.api.showFloatingText(b.x, b.y - 30, `${KIND_LABEL[b.kind]} DOWN`, this.hex(CNQ.blood));
    // Soldiers outlive the barracks that trained them; they simply stop being replaced.
  }

  /**
   * Where a soldier stands inside its square. Derived from its rank in the garrison rather
   * than stored, for two reasons: soldiers re-form when one of them dies, and — because the
   * layout is a pure function of the square — two networked sims draw the same formation
   * without having to send a position per soldier.
   */
  private troopSlot(t: Troop): number {
    let slot = 0;
    for (const o of this.troops) {
      if (o === t) break;
      if (o.owner === t.owner && o.cell === t.cell) slot++;
    }
    return slot;
  }

  private troopX(t: Troop): number {
    return this.centreX(t.cell) + TROOP_FORMATION[this.troopSlot(t) % TROOP_FORMATION.length][0];
  }

  private troopY(t: Troop): number {
    return this.centreY(t.cell) + TROOP_FORMATION[this.troopSlot(t) % TROOP_FORMATION.length][1];
  }

  private killTroop(t: Troop): void {
    // The position has to be read before the splice — `troopSlot` walks the live array, so a
    // dead soldier's coordinates change the instant it leaves it.
    const x = this.troopX(t);
    const y = this.troopY(t);
    const i = this.troops.indexOf(t);
    if (i >= 0) this.troops.splice(i, 1);
    this.api.spawnHitFlash(x, y, CNQ.blood);

    // Academy of Ash. Recursion is bounded — every step of it has already removed a soldier.
    if (t.wizard && this.empire(t.owner).ash) {
      this.fx(t.owner).ashBurst(x, y, ASH_RADIUS);
      this.api.showFloatingText(x, y - 24, '🔥 ASH', this.hex(CNQ.ember));
      this.splash(x, y, ASH_RADIUS, t.owner, Math.round(ASH_DAMAGE * this.outMult(t.owner)));
    }
  }

  /**
   * Shadow Cloak. The first hit ever aimed at one of these soldiers misses outright; everything
   * after it rolls. Placed inside `hitMark` rather than at each call site so that the pike, a
   * turret bullet, an arena projectile and a nuke all have to get past it.
   */
  private troopDodges(t: Troop): boolean {
    if (!t.cloak) return false;
    if (!t.cloakUsed) { t.cloakUsed = true; return true; }
    return Math.random() < t.dodge;
  }

  /** Everything on the far side of `owner`, flattened into one list for range checks. */
  private marksAgainst(owner: Owner): Mark[] {
    const out: Mark[] = [];
    for (const f of this.targetsOf(owner)) out.push({ kind: 'fighter', f, x: f.x, y: f.y });
    for (const t of this.troops) {
      if (t.owner === owner) continue;
      out.push({ kind: 'troop', t, x: this.troopX(t), y: this.troopY(t) });
    }
    for (const b of this.buildings) {
      if (b.owner === owner) continue;
      out.push({ kind: 'building', b, x: b.x, y: b.y });
    }
    return out;
  }

  /** Whether a mark taken from a cached list is still a live thing worth hitting. */
  private stillThere(m: Mark): boolean {
    if (m.kind === 'fighter') return this.alive(m.f);
    if (m.kind === 'troop') return this.troops.includes(m.t);
    return this.buildings.includes(m.b);
  }

  private hitMark(m: Mark, damage: number, src: Source, owner: Owner): void {
    if (m.kind === 'fighter') {
      m.f.takeDamage(damage);
      this.api.spawnHitFlash(m.f.x, m.f.y, CNQ.tracer);
    } else if (m.kind === 'troop') {
      if (this.troopDodges(m.t)) {
        this.fx(m.t.owner).cloakMiss(this.troopX(m.t), this.troopY(m.t));
        return;
      }
      m.t.hp -= damage;
      this.fx(owner).chip(m.x, m.y, CNQ.blood);
      if (m.t.hp <= 0) this.killTroop(m.t);
    } else {
      this.damageBuilding(m.b, damage, src);
    }
  }

  // ── Buildings ──────────────────────────────────────────────────────────────

  private tickBuildings(dt: number): void {
    const dtMs = dt * 1000;
    for (const b of [...this.buildings]) {
      b.recoil = Math.max(0, b.recoil - dt * 6);
      const fort = this.empire(b.owner).fortressHp;
      if (b.kind === 'barracks') this.tickBarracks(b, barracksStats(b.tiers, fort), dtMs);
      else if (b.kind === 'turret') this.tickTurret(b, turretStats(b.tiers, fort), dtMs);
      else this.tickBarricade(b, barricadeStats(b.tiers, fort), dt);
      // Fortress can be bought mid-match, so the ceiling moves; never let hp sit above it.
      b.hp = Math.min(b.hp, this.maxHpOf(b));
    }
  }

  private tickBarracks(b: Building, s: BarracksStats, dtMs: number): void {
    // A remote player's garrison is whatever their snapshot last said it was; training our own
    // copies of their soldiers would just be deleted by the next packet.
    if (b.owner === 'npc' && this.npcIsRemote) return;
    b.accum += dtMs;
    if (b.accum < s.spawnMs) return;
    b.accum = 0;

    const here = this.troops.filter((t) => t.cell === b.cell && t.owner === b.owner);
    // Barbarian King replaces the garrison rather than joining it — the cap is 1, and the
    // ordinary soldiers standing there are dismissed the moment he is trained.
    if (s.king) {
      if (here.some((t) => t.king)) return;
      for (const t of here) this.killTroop(t);
    } else if (here.length >= s.cap) {
      return;
    }

    this.troops.push({
      owner: b.owner, town: b.town, cell: b.cell,
      hp: Math.round(s.troopHp * this.empire(b.owner).troopMult), baseHp: s.troopHp,
      damage: s.troopDamage, atkMs: s.troopAtkMs, crowdBonus: s.crowdBonus, king: s.king,
      accum: 0,
      march: Math.random() * 6, ang: b.owner === 'player' ? 0 : Math.PI,
      potionUsed: false, enraged: false,
      marchRange: s.marchRange, surprise: s.surprise, fresh: false,
      cloak: s.cloak, cloakUsed: false, dodge: s.dodge, guild: s.guild,
      wizard: false,
    });
  }

  private tickTurret(b: Building, s: TurretStats, dtMs: number): void {
    // Mid-volley: keep spitting on the short timer until the burst is spent.
    if (b.burstLeft > 0) {
      b.burstAccum += dtMs;
      if (b.burstAccum >= 90) {
        b.burstAccum = 0;
        b.burstLeft--;
        this.fireTurret(b, s, s.radial ? (b.burstLeft / s.burst) * Math.PI * 2 + b.aimAng : b.aimAng);
      }
      return;
    }

    b.accum += dtMs;
    if (b.accum < s.fireMs) return;

    const marks = this.marksAgainst(b.owner);
    let best: Mark | null = null;
    let bestD = s.range;
    for (const m of marks) {
      const d = Phaser.Math.Distance.Between(b.x, b.y, m.x, m.y);
      if (d < bestD) { bestD = d; best = m; }
    }
    // Burst Mania fires a full circle, so it doesn't need a target in front of it — but it
    // still shouldn't fire at an empty board.
    if (!best) return;

    b.accum = 0;
    b.aimAng = Math.atan2(best.y - b.y, best.x - b.x);
    if (s.burst > 1) {
      b.burstLeft = s.burst - 1;
      b.burstAccum = 0;
    }
    this.fireTurret(b, s, b.aimAng);
  }

  private fireTurret(b: Building, s: TurretStats, ang: number): void {
    b.recoil = 1;
    const mx = b.x + Math.cos(ang) * 20;
    const my = b.y + Math.sin(ang) * 20;
    const out = this.outMult(b.owner);

    // Blast Nucleus replaces the gun outright — no muzzle, no bullet, no line. It goes off on
    // whatever it acquired, which is why the tower had to give up half its range for it.
    if (s.blast) {
      let d = s.range * 0.55;
      let bestD = Infinity;
      for (const m of this.marksAgainst(b.owner)) {
        const md = Phaser.Math.Distance.Between(b.x, b.y, m.x, m.y);
        if (md <= s.range && md < bestD) bestD = md;
      }
      if (bestD < Infinity) d = bestD;
      const bx = b.x + Math.cos(ang) * d;
      const by = b.y + Math.sin(ang) * d;
      this.fx(b.owner).blast(bx, by, s.blastRadius, s.atomic);
      this.splash(bx, by, s.blastRadius, b.owner, Math.max(1, Math.round(s.blastDamage * out)));
      return;
    }

    this.fx(b.owner).muzzle(mx, my, ang);

    const head = s.headhunter && Math.random() < 0.1;
    const damage = Math.max(1, Math.round(s.damage * (head ? 2 : 1) * out));

    if (s.hitscan) {
      // Sniper Nest: resolve immediately along the line, nearest thing wins.
      let best: Mark | null = null;
      let bestD = Infinity;
      for (const m of this.marksAgainst(b.owner)) {
        const d = Phaser.Math.Distance.Between(b.x, b.y, m.x, m.y);
        if (d > s.range) continue;
        if (this.distToSegment(b.x, b.y, b.x + Math.cos(ang) * s.range, b.y + Math.sin(ang) * s.range, m.x, m.y) > 18) continue;
        if (d < bestD) { bestD = d; best = m; }
      }
      const ex = best ? best.x : b.x + Math.cos(ang) * s.range;
      const ey = best ? best.y : b.y + Math.sin(ang) * s.range;
      this.fx(b.owner).tracer(mx, my, ex, ey);
      if (best) {
        this.hitMark(best, damage, null, b.owner);
        if (head) this.api.showFloatingText(best.x, best.y - 24, '🎯 HEADSHOT', this.hex(CNQ.tracer));
        // Boom Bullets works on a hitscan shot too — the burst is what the round does when it
        // arrives, not how long it took to get there.
        if (s.boomBullets) {
          this.fx(b.owner).boom(best.x, best.y, s.boomRadius);
          this.splash(best.x, best.y, s.boomRadius, b.owner, Math.round(s.boomDamage * out), best);
        }
      }
      return;
    }

    this.bullets.push({
      owner: b.owner, kind: 'shot', x: mx, y: my,
      vx: Math.cos(ang) * s.bulletSpeed, vy: Math.sin(ang) * s.bulletSpeed,
      damage, diesAt: this.now + BULLET_LIFE_MS, head,
      boomR: s.boomBullets ? s.boomRadius : 0,
      boomDamage: Math.round(s.boomDamage * out),
      explodeAt: Infinity, drag: false, homeX: b.x, homeY: b.y, spin: 0,
    });
  }

  private tickBarricade(b: Building, s: BarricadeStats, dt: number): void {
    if (s.selfRegen <= 0 && s.neighbourRegen <= 0 && s.troopRegen <= 0) return;
    b.regenCarry += dt;
    if (b.regenCarry < 1) return;
    b.regenCarry -= 1;

    if (s.selfRegen > 0 && b.hp < this.maxHpOf(b)) {
      b.hp = Math.min(this.maxHpOf(b), b.hp + s.selfRegen);
    }
    if (s.neighbourRegen > 0) {
      for (const o of this.buildings) {
        if (o === b || o.owner !== b.owner || !this.adjacent(o.cell, b.cell)) continue;
        const max = this.maxHpOf(o);
        if (o.hp >= max) continue;
        o.hp = Math.min(max, o.hp + s.neighbourRegen);
        this.fx(b.owner).mend(o.x, o.y - 14);
      }
    }
    if (s.troopRegen > 0) {
      for (const t of this.troops) {
        if (t.owner !== b.owner) continue;
        if (t.cell !== b.cell && !this.adjacent(t.cell, b.cell)) continue;
        const tmax = this.troopMaxHp(t);
        if (t.hp >= tmax) continue;
        t.hp = Math.min(tmax, t.hp + s.troopRegen);
      }
    }
  }

  // ── Troops ─────────────────────────────────────────────────────────────────

  private tickTroops(dt: number): void {
    const dtMs = dt * 1000;
    for (const t of [...this.troops]) {
      t.march += dt * (t.king ? 3.2 : 4.4);

      // The Barbarian King's potion — his one piece of behaviour beyond hitting things.
      if (t.king && !t.potionUsed && t.hp <= this.troopMaxHp(t) * KING_POTION_AT) {
        t.potionUsed = true;
        t.enraged = true;
        t.hp = Math.min(this.troopMaxHp(t), t.hp + KING_POTION_HEAL);
        this.api.showFloatingText(this.troopX(t), this.troopY(t) - 26, '🍺 ENRAGED', this.hex(CNQ.blood));
        this.fx(t.owner).chip(this.troopX(t), this.troopY(t), CNQ.blood);
      }

      const mult = this.empire(t.owner).troopMult;
      const interval = t.atkMs / (t.enraged ? 2 : 1);
      t.accum += dtMs;
      if (t.accum < interval) continue;

      const marks = this.marksAgainst(t.owner);
      const tx = this.troopX(t);
      const ty = this.troopY(t);
      let best: Mark | null = null;
      let bestD = this.troopRange(t);
      for (const m of marks) {
        const d = Phaser.Math.Distance.Between(tx, ty, m.x, m.y);
        if (d < bestD) { bestD = d; best = m; }
      }
      if (!best) continue;

      t.accum = 0;
      t.ang = Math.atan2(best.y - ty, best.x - tx);
      // Strength in Numbers counts the square as it stands this instant, so a stack that has
      // just been dragged together is immediately worth more than the sum of its parts.
      const crowd = t.crowdBonus
        ? this.troops.filter((o) => o.owner === t.owner && o.cell === t.cell).length
        : 0;
      // Surprise! is spent by the swing it pays for, not by the arrival — a soldier marched onto
      // empty ground keeps the opener until there is somebody there to use it on.
      let bonus = this.bannerTroopBonus(t);
      if (t.surprise && t.fresh) { bonus += SURPRISE_BONUS; t.fresh = false; }
      const wiz = t.wizard && this.empire(t.owner).ash ? 1.5 : 1;
      const damage = Math.max(1, Math.round((t.damage + crowd + bonus) * mult * wiz * this.outMult(t.owner)));
      this.hitMark(best, damage, { kind: 'troop', t }, t.owner);
    }
  }

  /** A soldier's real ceiling: its trained HP through whatever military tier is bought now. */
  private troopMaxHp(t: Troop): number {
    return Math.round(t.baseHp * this.empire(t.owner).troopMult);
  }

  /** How far it can swing. A wizard reaches three squares; everybody else reaches across one. */
  private troopRange(t: Troop): number {
    return t.wizard ? WIZARD_RANGE : TROOP_RANGE;
  }

  /** The Offensive standard's bonus, for soldiers standing inside the commander's aura. */
  private bannerTroopBonus(t: Troop): number {
    const banner = this.bannerOf(t.owner);
    if (!banner || banner.troopDamage <= 0) return 0;
    const f = this.fighter(t.owner);
    if (!this.alive(f)) return 0;
    const d = Phaser.Math.Distance.Between(f.x, f.y, this.troopX(t), this.troopY(t));
    return d <= BANNER_AURA ? banner.troopDamage : 0;
  }

  /**
   * The Healing standard, pouring into the soldiers around the commander. Its own tick rather
   * than a line in `tickTroops` because it is a heal on a one-second clock, and folding it into
   * the attack loop would tie it to how often a soldier happens to swing.
   */
  private tickBannerHeal(owner: Owner, dt: number): void {
    const banner = this.bannerOf(owner);
    if (!banner || banner.troopHeal <= 0) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.bannerHealCarry[owner] += dt;
    if (this.bannerHealCarry[owner] < 1) return;
    this.bannerHealCarry[owner] -= 1;

    for (const t of this.troops) {
      if (t.owner !== owner) continue;
      const tx = this.troopX(t);
      const ty = this.troopY(t);
      if (Phaser.Math.Distance.Between(f.x, f.y, tx, ty) > BANNER_AURA) continue;
      const max = this.troopMaxHp(t);
      if (t.hp >= max) continue;
      t.hp = Math.min(max, t.hp + banner.troopHeal);
      this.fx(owner).mend(tx, ty - 10);
    }
  }

  // ── Bullets and incoming projectiles ───────────────────────────────────────

  private tickBullets(dt: number): void {
    if (!this.bullets.length) return;
    // Built once for the whole sweep rather than once per bullet: Burst Mania alone puts
    // fifteen in the air per volley, and each one would otherwise re-walk every building,
    // soldier and fighter on the board. Entries are re-checked as they are used, so a target
    // killed by an earlier bullet in the same frame can't be hit again by a later one.
    const marks: Record<Owner, Mark[]> = {
      player: this.marksAgainst('player'),
      npc: this.marksAgainst('npc'),
    };

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const p = this.bullets[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 9;

      const offBoard = p.x < ORIGIN_X - 20 || p.x > ORIGIN_X + COLS * CELL + 20
        || p.y < ORIGIN_Y - 20 || p.y > ORIGIN_Y + ROWS * CELL + 20;
      // A bomb or a fireball that reaches the end of its arc goes off there. A plain shot that
      // runs out simply stops — that difference is the whole reason the kind is carried.
      if (this.now >= p.explodeAt || (offBoard && p.kind !== 'shot')) {
        this.detonate(p);
        this.bullets.splice(i, 1);
        continue;
      }
      if (this.now >= p.diesAt || offBoard) {
        this.bullets.splice(i, 1);
        continue;
      }

      let hit: Mark | null = null;
      for (const m of marks[p.owner]) {
        if (!this.stillThere(m)) continue;
        const r = m.kind === 'building' ? BUILDING_R : m.kind === 'troop' ? 12 : 20;
        if (Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) <= r) { hit = m; break; }
      }
      if (!hit) continue;

      if (p.kind !== 'shot') {
        // Bombs and fireballs never single-target: whatever they touched is inside their own
        // burst anyway, so let the burst be the only thing that bills.
        this.detonate(p);
        this.bullets.splice(i, 1);
        continue;
      }

      this.hitMark(hit, p.damage, null, p.owner);
      if (p.head) this.api.showFloatingText(hit.x, hit.y - 24, '🎯 HEADSHOT', this.hex(CNQ.tracer));
      // Boom Bullets.
      if (p.boomR > 0) {
        this.fx(p.owner).boom(p.x, p.y, p.boomR);
        this.splash(p.x, p.y, p.boomR, p.owner, p.boomDamage, hit);
      }
      this.bullets.splice(i, 1);
    }
  }

  /** A bomb or a fireball arriving. */
  private detonate(p: Bullet): void {
    const r = p.kind === 'fireball' ? FIREBALL_RADIUS : BOMB_RADIUS;
    if (p.kind === 'fireball') this.fx(p.owner).fireburst(p.x, p.y, r);
    else this.fx(p.owner).blast(p.x, p.y, r, p.drag);
    this.splash(p.x, p.y, r, p.owner, p.damage);

    if (!p.drag) return;
    // Atomic Annihilation. Only fighters are hauled — a soldier is defined by the square it
    // stands on, and dragging one off its square would break the formation it is derived from.
    for (const f of this.targetsOf(p.owner)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) > r) continue;
      this.pulls = this.pulls.filter((q) => q.f !== f);
      this.pulls.push({ f, x: p.homeX, y: p.homeY, until: this.now + BOMB_DRAG_MS });
      this.api.showFloatingText(f.x, f.y - 44, '☢️ DRAGGED', this.hex(CNQ.arcane));
    }
  }

  /**
   * The haul itself, applied at the very end of the frame. ArenaScene resolves WASD into a
   * velocity long before the kit updates, so a pull written any earlier would simply be
   * overwritten — the same post-movement override Hunt uses to steal control.
   */
  private tickPulls(): void {
    for (let i = this.pulls.length - 1; i >= 0; i--) {
      const q = this.pulls[i];
      if (this.now >= q.until || !this.alive(q.f)) { this.pulls.splice(i, 1); continue; }
      const d = Phaser.Math.Distance.Between(q.f.x, q.f.y, q.x, q.y);
      if (d < 24) { this.pulls.splice(i, 1); continue; }
      const ang = Math.atan2(q.y - q.f.y, q.x - q.f.x);
      const body = q.f.body as Phaser.Physics.Arcade.Body | null;
      body?.setVelocity(Math.cos(ang) * BOMB_DRAG_SPEED, Math.sin(ang) * BOMB_DRAG_SPEED);
    }
  }

  /**
   * Ordinary projectiles knocking down buildings and soldiers. Done here rather than through an
   * overlap in ArenaScene because neither is a physics body — and because the town center's
   * "shots fly over it" rule is simply a matter of not being in this list.
   *
   * Soldiers are tested first: they stand in front of the building that trained them, so a shot
   * into an occupied square hits the garrison rather than the walls behind it.
   */
  private tickIncomingProjectiles(): void {
    if (!this.buildings.length && !this.troops.length) return;
    // Snapshotted: `destroy()` splices the group's live array under us.
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const dmg = Math.max(1, Math.round(proj.damage * proj.perkBoost));

      let struck = false;
      for (const t of [...this.troops]) {
        const hostile = t.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        const tx = this.troopX(t);
        const ty = this.troopY(t);
        if (Phaser.Math.Distance.Between(tx, ty, proj.x, proj.y) > TROOP_HIT_R) continue;
        this.hitMark({ kind: 'troop', t, x: tx, y: ty }, dmg, null, this.other(t.owner));
        struck = true;
        break;
      }

      if (!struck) {
        for (const b of this.buildings) {
          const hostile = b.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
          if (!hostile) continue;
          if (Phaser.Math.Distance.Between(b.x, b.y, proj.x, proj.y) > BUILDING_R) continue;
          this.damageBuilding(b, dmg, null);
          this.api.spawnHitFlash(proj.x, proj.y, CNQ.stone);
          struck = true;
          break;
        }
      }

      if (struck) proj.destroy();
    }
  }

  /**
   * Area damage from anywhere in the arena, routed in from ArenaScene's AoE chokepoint. Only
   * soldiers answer to it: they are the one thing on the board with no physics body of their
   * own, so without this hook a whole garrison sits inside a nuke and takes nothing.
   */
  notifyAoeDamage(cx: number, cy: number, radius: number, owner: Owner, damage: number): void {
    if (!this.troops.length || damage <= 0) return;
    for (const t of [...this.troops]) {
      if (t.owner === owner) continue;
      const tx = this.troopX(t);
      const ty = this.troopY(t);
      if (Phaser.Math.Distance.Between(cx, cy, tx, ty) > radius) continue;
      this.hitMark({ kind: 'troop', t, x: tx, y: ty }, Math.max(1, Math.round(damage)), null, owner);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Conquest's click does three jobs, and the split is positional: your own buildings open
   * their upgrade menu, a square holding your soldiers starts a drag, and anything else is the
   * pike. Every build key is gated here rather than in the `do*` methods — `castAbility` stamps
   * the cooldown before it calls `cast`, so a refusal further down would eat the ability.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'conquest') return;
    void time;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;
    const released = !pointer.isDown && this.api.pointerWasDown;
    const cell = this.cellAt(mouseX, mouseY);

    // ── Banner Bearer: right-click cycles the standard ──
    if (pointer.rightButtonDown() && !this.api.rightPointerWasDown && this.owns('player', 'click')) {
      this.cycleBanner('player');
    }

    // ── Drop a fireball ──
    if (released && this.fireDrag) {
      const town = this.fireDrag;
      this.fireDrag = null;
      // Released back on the dome: the player changed their mind, so the fireball is kept and
      // the town's own menu opens instead — the same "a press that went nowhere is a click" rule
      // the garrison drag follows.
      if (Phaser.Math.Distance.Between(mouseX, mouseY, town.x, town.y) < CELL * 0.5) {
        this.openMenu(town);
      } else {
        this.hurlFireball(town, mouseX, mouseY);
      }
      return;
    }

    // ── Drop a wall ──
    if (released && this.wallDrag) {
      const wall = this.wallDrag;
      this.wallDrag = null;
      if (cell === wall.cell) { this.openMenu(wall); return; }
      if (cell >= 0) this.marchWall(wall, cell);
      return;
    }

    // ── Drop a drag ──
    if (released && this.dragging) {
      this.dragging = false;
      const from = this.dragFrom;
      this.dragFrom = -1;
      // A press that never left its square was a click, not a march — so it falls through to
      // whatever building the soldiers were standing on.
      if (cell === from) { this.openMenuAt(from); return; }
      const range = this.marchRangeOf('player', from);
      if (cell >= 0 && this.inRange(from, cell, range)) this.marchTroops('player', from, cell);
      else if (cell >= 0) {
        const why = range > 1 ? 'TWO SQUARES AT A TIME' : 'ONE SQUARE AT A TIME';
        this.api.showFloatingText(mouseX, mouseY - 20, why, this.hex(CNQ.stoneDark));
      }
      return;
    }

    if (clicked) {
      // ── Take a fireball off the dome ──
      // Tested before anything cell-based, and against the orb's own position rather than its
      // square: the orb floats above the town center, so grabbing it can never be confused with
      // pressing the building underneath it.
      const town = this.fireballAt('player', mouseX, mouseY);
      if (town) { this.fireDrag = town; return; }
    }

    if (clicked && cell >= 0) {
      // ── Start a drag ──
      // Soldiers outrank the ground they stand on: troops spawn on top of their own barracks,
      // so opening the menu here first would make that stack impossible to move at all.
      if (this.troops.some((t) => t.owner === 'player' && t.cell === cell)) {
        this.dragging = true;
        this.dragFrom = cell;
        return;
      }

      // ── Pick up a Moving Wall ──
      // Same press-and-release split as a garrison: a press that goes nowhere still opens the
      // wall's menu, which is the only way to reach Personal Wall's link button.
      const wall = this.buildingAt(cell);
      if (wall && wall.owner === 'player' && wall.kind === 'barricade'
        && barricadeStats(wall.tiers, this.empire('player').fortressHp).movable) {
        this.wallDrag = wall;
        return;
      }

      // ── Open an upgrade menu ──
      if (this.openMenuAt(cell)) return;
    }

    if (clicked) {
      // Banner Bearer's forms change how fast the pike comes back. Banked on the fighter right
      // before the cast and handed back straight after: `stampCast` consumes it, but a cast that
      // was refused for being on cooldown would otherwise leave the factor armed for the next
      // build key.
      const banner = this.bannerOf('player');
      if (banner) p.nextCastCooldownMult = banner.cooldownMult;
      p.castAbility('conquest-banner', ctx);
      p.nextCastCooldownMult = 1;
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.tryBuild(p, ctx, 'barracks');
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.tryBuild(p, ctx, 'turret');
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.tryBuild(p, ctx, 'barricade');
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      const why = this.expansionRefusal('player');
      if (why) this.api.showFloatingText(p.x, p.y - 46, why, this.hex(CNQ.blood));
      else p.castAbility('conquest-expansion', ctx);
    }
  }

  /** Banner Bearer: offensive → defensive → healing → offensive. */
  private cycleBanner(owner: Owner): void {
    const side = this.side(owner);
    const i = BANNER_ORDER.indexOf(side.banner);
    side.banner = BANNER_ORDER[(i + 1) % BANNER_ORDER.length];
    const s = BANNER_STATS[side.banner];
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.fx(owner).bannerSwap(f.x, f.y - 20, s.color);
      this.api.showFloatingText(f.x, f.y - 58, `🚩 ${s.label}`, this.hex(s.color));
    }
  }

  /** How far a stack on this square can march — the best march range among the soldiers on it. */
  private marchRangeOf(owner: Owner, cell: number): number {
    let range = 1;
    for (const t of this.troops) {
      if (t.owner === owner && t.cell === cell) range = Math.max(range, t.marchRange);
    }
    return range;
  }

  /**
   * Moving Walls. A wall marches by the garrison's rules — one square, onto your own ground or
   * onto nothing, never onto something already standing there.
   */
  private marchWall(wall: Building, to: number): void {
    if (!this.adjacent(wall.cell, to)) {
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'ONE SQUARE AT A TIME', this.hex(CNQ.stoneDark));
      return;
    }
    if (this.buildingAt(to) || this.townAt(to)) {
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'SQUARE TAKEN', this.hex(CNQ.stoneDark));
      return;
    }
    const owner = wall.owner;
    if (this.cellOwner[to] !== null && this.cellOwner[to] !== owner) {
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'NOT YOUR LAND', this.hex(CNQ.blood));
      return;
    }

    wall.cell = to;
    wall.x = this.centreX(to);
    wall.y = this.centreY(to);
    this.fx(owner).raise(wall.x, wall.y, CELL, townColor(owner, wall.town));

    // A wall shoved onto nothing claims it, exactly as a garrison would.
    if (this.cellOwner[to] === null) {
      const town = this.nearestTown(owner, to);
      this.setCell(to, owner, town);
      this.fx(owner).claim(this.cellX(to), this.cellY(to), CELL, townColor(owner, town));
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'CLAIMED', this.hex(townColor(owner, town)));
    }
  }

  private tryBuild(p: Fighter, ctx: CastContext, kind: PlaceKind): void {
    const why = this.buildRefusal('player', kind);
    if (why) { this.api.showFloatingText(p.x, p.y - 46, why, this.hex(CNQ.blood)); return; }
    p.castAbility(`conquest-${kind}`, ctx);
  }

  /**
   * Moving a stack one square. Whatever fits under the destination's cap goes; a neutral
   * destination is claimed by the arriving soldiers, an enemy one is only fought over —
   * you take their land by standing on it yourself, not by marching onto it.
   */
  private marchTroops(owner: Owner, from: number, to: number): void {
    const moving = this.troops.filter((t) => t.owner === owner && t.cell === from);
    if (!moving.length) return;

    // The cap that applies is the destination's own barracks, or the mover's if it has none.
    const destBarracks = this.buildingAt(to);
    const fort = this.empire(owner).fortressHp;
    const capSrc = destBarracks?.kind === 'barracks' ? destBarracks : this.buildingAt(from);
    const cap = capSrc?.kind === 'barracks'
      ? barracksStats(capSrc.tiers, fort).cap
      : Math.max(3, moving.length);
    const already = this.troops.filter((t) => t.owner === owner && t.cell === to).length;
    const room = Math.max(0, cap - already);
    if (room <= 0) {
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'SQUARE FULL', this.hex(CNQ.stoneDark));
      return;
    }

    const went = moving.slice(0, room);
    for (const t of went) {
      t.cell = to;
      // Surprise! arms on arrival somewhere new; the swing that spends it may be seconds away.
      if (t.surprise) t.fresh = true;
    }

    // Assassin Guild: everything the column walked past, destination included.
    if (went.some((t) => t.guild)) this.trample(owner, from, to);

    if (this.cellOwner[to] === null) {
      const town = this.nearestTown(owner, to);
      this.setCell(to, owner, town);
      this.fx(owner).claim(this.cellX(to), this.cellY(to), CELL, townColor(owner, town));
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'CLAIMED', this.hex(townColor(owner, town)));
    }
  }

  /**
   * The Assassin Guild cutting its way through. Every square on the line takes it, including the
   * one they land on — a column that marched *onto* the enemy walked through them to get there.
   */
  private trample(owner: Owner, from: number, to: number): void {
    const damage = Math.max(1, Math.round(GUILD_TRAMPLE * this.outMult(owner)));
    for (const cell of this.pathCells(from, to)) {
      for (const t of [...this.troops]) {
        if (t.owner === owner || t.cell !== cell) continue;
        this.hitMark({ kind: 'troop', t, x: this.troopX(t), y: this.troopY(t) }, damage, null, owner);
      }
      const b = this.buildingAt(cell);
      if (b && b.owner !== owner) this.damageBuilding(b, damage, null);
    }
    this.fx(owner).chip(this.centreX(to), this.centreY(to), CNQ.shroud);
  }

  // ── Upgrade menu ───────────────────────────────────────────────────────────

  /** Opens whatever of yours sits on a square. Returns false when nothing there is yours. */
  private openMenuAt(cell: number): boolean {
    if (cell < 0) return false;
    const town = this.townAt(cell);
    if (town && town.owner === 'player') { this.openMenu(town); return true; }
    const building = this.buildingAt(cell);
    if (building && building.owner === 'player') { this.openMenu(building); return true; }
    return false;
  }

  private openMenu(target: Building | Town): void {
    this.menuTarget = target;
    this.api.openUpgradeMenu();
  }

  private targetKind(t: Building | Town): BuildKind {
    return 'kind' in t ? t.kind : 'town';
  }

  getMenuModel(): ConquestMenuModel | null {
    const t = this.menuTarget;
    if (!t) return null;
    const kind = this.targetKind(t);
    const owner = t.owner;
    const side = this.side(owner);
    const isTown = kind === 'town';
    const b = isTown ? null : (t as Building);

    const paths = this.pathsFor(owner, kind);
    const next: ConquestMenuModel['next'] = [];
    const blocked: ConquestMenuModel['blocked'] = [];
    for (const path of paths) {
      const up = nextUpgrade(kind, t.tiers, path);
      if (!up) {
        next.push(null);
        blocked.push(t.tiers[path] >= 4 ? 'MAXED' : 'LOCKED — another path is committed');
        continue;
      }
      next.push({ name: up.name, desc: up.desc, cost: up.cost });
      blocked.push(side.authority < up.cost ? `NEEDS ${up.cost} AUTHORITY` : null);
    }

    return {
      kind,
      title: KIND_LABEL[kind],
      tiers: [t.tiers[0], t.tiers[1], t.tiers[2]],
      hp: b ? Math.max(0, Math.round(b.hp)) : 0,
      maxHp: b ? this.maxHpOf(b) : 0,
      destructible: !isTown,
      authority: Math.floor(side.authority),
      paths,
      next,
      blocked,
      link: this.linkStateOf(b),
      color: townColor(owner, isTown ? (t as Town).index : (t as Building).town),
    };
  }

  /** Whether the menu should offer Personal Wall's link button, and what it should say. */
  private linkStateOf(b: Building | null): ConquestMenuModel['link'] {
    if (!b || b.kind !== 'barricade') return null;
    if (!barricadeStats(b.tiers, this.empire(b.owner).fortressHp).linkable) return null;
    const linked = this.side(b.owner).linkedWall;
    if (linked === b) return 'linked';
    return linked && this.buildings.includes(linked) ? 'elsewhere' : 'free';
  }

  buyUpgrade(path: PathIdx): boolean {
    return this.purchase(this.menuTarget, path);
  }

  /**
   * Personal Wall. One link at a time — the wall is a place to put your hits, and being able to
   * spread them over a whole row of walls would simply be nine times the health.
   */
  toggleLink(): boolean {
    const t = this.menuTarget;
    if (!t || !('kind' in t) || t.kind !== 'barricade') return false;
    if (this.linkStateOf(t) === null) return false;
    const side = this.side(t.owner);
    side.linkedWall = side.linkedWall === t ? null : t;
    if (side.linkedWall) {
      this.api.showFloatingText(t.x, t.y - 32, '⛓️ LINKED', this.hex(CNQ.iron));
    }
    return true;
  }

  /**
   * Spend on one tier. Every HP upgrade in the game — Fortress, Stone Walls, Iron Walls — is a
   * *ceiling* raise, so the building is handed exactly the difference rather than being topped
   * up: buying Iron Walls on a wall that is nearly down should give you 200 more HP, not repair
   * the 250 it had already lost.
   */
  private purchase(t: Building | Town | null, path: PathIdx): boolean {
    if (!t) return false;
    const kind = this.targetKind(t);
    const side = this.side(t.owner);
    // The shop gate lives here and in `getMenuModel`, never in `nextUpgrade` — see the note on
    // that function for why the rule and the unlock are kept apart.
    if (path === 2 && !this.pathUnlocked(t.owner, kind)) return false;
    const up = nextUpgrade(kind, t.tiers, path);
    if (!up || side.authority < up.cost) return false;

    // Snapshot every ceiling this purchase could move, before it moves.
    const before = new Map<Building, number>();
    for (const b of this.buildings) if (b.owner === t.owner) before.set(b, this.maxHpOf(b));

    side.authority -= up.cost;
    t.tiers[path]++;

    for (const [b, was] of before) {
      const now = this.maxHpOf(b);
      if (now > was) b.hp += now - was;
      b.hp = Math.min(b.hp, now);
    }
    for (const tr of this.troops) if (tr.owner === t.owner) tr.hp = Math.min(tr.hp, this.troopMaxHp(tr));
    return true;
  }

  closeUpgradeMenu(): void {
    this.menuTarget = null;
  }

  // ── NPC brain ──────────────────────────────────────────────────────────────

  /**
   * The mirror. It plays the same game the player does — banks Authority, walks somewhere legal
   * to put a building, buys up one path per building, marches soldiers outward to take ground
   * and eventually splits its empire — and it does all of it through the same functions, so
   * there is no second set of rules to keep in sync.
   *
   * The only thing it does *not* share is the pointer: the two mouse-driven actions (opening a
   * menu, dragging a stack) are called directly here.
   */
  private npcThink(dt: number): void {
    const side = this.side('npc');
    const f = this.api.npc;
    if (!this.alive(f) || !side.towns.length) { side.seek = null; return; }

    side.thinkAccum += dt * 1000;
    side.dragAccum += dt * 1000;

    // ── March, on its own slower clock ──
    if (side.dragAccum >= NPC_DRAG_MS) {
      side.dragAccum = 0;
      this.npcMarch();
    }

    if (side.thinkAccum < NPC_THINK_MS) return;
    side.thinkAccum = 0;

    // ── Spend on upgrades ──
    this.npcUpgrade();

    // ── Decide where to stand ──
    // Reaching a chosen square is what unlocks the build, so the seek point is dropped the
    // instant the build is no longer affordable or the square stops being legal.
    if (side.seek && side.seekKind) {
      const cell = this.cellAt(side.seek.x, side.seek.y);
      const stillGood = side.seekKind === 'expansion'
        ? this.cellOwner[cell] === null && side.authority >= this.expansionCost('npc')
        : this.cellOwner[cell] === 'npc' && !this.buildingAt(cell) && !this.townAt(cell);
      if (!stillGood) { side.seek = null; side.seekKind = null; }
    }
    if (!side.seek) this.npcPickBuild();

    // ── Spend what the shop paths gave it ──
    this.npcLink();
    this.npcFireball();
  }

  /** Personal Wall, on the bot's side: link the first wall that can be linked to and stay linked. */
  private npcLink(): void {
    const side = this.side('npc');
    if (this.linkedWall('npc')) return;
    const fort = this.empire('npc').fortressHp;
    for (const b of this.buildings) {
      if (b.owner !== 'npc' || b.kind !== 'barricade') continue;
      if (!barricadeStats(b.tiers, fort).linkable) continue;
      side.linkedWall = b;
      return;
    }
  }

  /**
   * Wizard Tower, on the bot's side. It has no pointer to drag with, so a ready fireball is
   * simply thrown at whoever is nearest the town that grew it — the same decision a player makes
   * with the mouse, without the mouse.
   */
  private npcFireball(): void {
    for (const t of this.side('npc').towns) {
      if (!t.fireReady) continue;
      const target = this.targetsOf('npc')
        .reduce<Fighter | null>((best, f) => {
          if (!best) return f;
          return Phaser.Math.Distance.Between(t.x, t.y, f.x, f.y)
            < Phaser.Math.Distance.Between(t.x, t.y, best.x, best.y) ? f : best;
        }, null);
      if (!target) continue;
      this.hurlFireball(t, target.x, target.y);
    }
  }

  /** What the NPC wants next, in the order a person would want it. */
  private npcPickBuild(): void {
    const side = this.side('npc');
    const owned = this.buildingCount('npc');
    const cap = this.buildingCap('npc');

    // A second capital, once the first one is genuinely full and paid for.
    if (owned >= cap && side.authority >= this.expansionCost('npc') && side.towns.length < 3) {
      const spot = this.npcExpansionSpot();
      if (spot >= 0) {
        side.seek = { x: this.centreX(spot), y: this.centreY(spot) };
        side.seekKind = 'expansion';
        return;
      }
    }
    if (owned >= cap) return;

    // Barracks first (they are the damage), then turrets, then walls once there is something
    // worth walling. Barricades are cheap enough to be the fallback for spare Authority.
    const barracks = this.buildings.filter((b) => b.owner === 'npc' && b.kind === 'barracks').length;
    const turrets = this.buildings.filter((b) => b.owner === 'npc' && b.kind === 'turret').length;
    let kind: PlaceKind = 'barricade';
    if (barracks < 2 || barracks <= turrets) kind = 'barracks';
    else if (turrets < 3) kind = 'turret';
    if (side.authority < this.costOf('npc', kind)) return;

    const cell = this.npcBuildSpot(kind);
    if (cell < 0) return;
    side.seek = { x: this.centreX(cell), y: this.centreY(cell) };
    side.seekKind = kind;
  }

  /**
   * Where to put it. Barracks and turrets want to be forward — nearest to the enemy, because a
   * turret behind the town center never fires. Barricades want to be *behind*, next to
   * something they can actually protect.
   */
  private npcBuildSpot(kind: PlaceKind): number {
    const enemy = this.api.player;
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < CELLS; i++) {
      if (this.cellOwner[i] !== 'npc') continue;
      if (this.buildingAt(i) || this.townAt(i)) continue;
      const d = this.alive(enemy)
        ? Phaser.Math.Distance.Between(this.centreX(i), this.centreY(i), enemy.x, enemy.y)
        : 0;
      let score = kind === 'barricade' ? d : -d;
      if (kind === 'barricade') {
        const neighbours = this.buildings.filter((b) => b.owner === 'npc' && this.adjacent(b.cell, i)).length;
        score += neighbours * 300;
      }
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  /** A free 3×3 as far from the player as the board allows. */
  private npcExpansionSpot(): number {
    const enemy = this.api.player;
    let best = -1;
    let bestD = -Infinity;
    for (let i = 0; i < CELLS; i++) {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      if (c < 1 || c >= COLS - 1 || r < 1 || r >= ROWS - 1) continue;
      if (this.cellOwner[i] !== null) continue;
      if (this.around(i).some((n) => this.cellOwner[n] !== null)) continue;
      const d = this.alive(enemy)
        ? Phaser.Math.Distance.Between(this.centreX(i), this.centreY(i), enemy.x, enemy.y)
        : 0;
      if (d > bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /** Buy the cheapest thing it can afford, favouring whichever path it already committed to. */
  private npcUpgrade(): void {
    const side = this.side('npc');
    const targets: (Building | Town)[] = [
      ...side.towns,
      ...this.buildings.filter((b) => b.owner === 'npc'),
    ];

    let bestTarget: Building | Town | null = null;
    let bestPath: PathIdx = 0;
    let bestCost = Infinity;
    for (const t of targets) {
      const kind = this.targetKind(t);
      for (const path of this.pathsFor('npc', kind)) {
        const up = nextUpgrade(kind, t.tiers, path);
        if (!up || up.cost > side.authority) continue;
        // A town center's income compounds, so it is worth overpaying for early; everything
        // else is bought by price alone.
        const weight = kind === 'town' ? 0.6 : 1;
        // Never open another path on a building that has already committed to one — that is
        // the player's restriction too, and spending into a dead end is how a bot stalls.
        if (pathLocked(t.tiers, path)) continue;
        const score = up.cost * weight;
        if (score < bestCost) { bestCost = score; bestTarget = t; bestPath = path; }
      }
    }
    if (!bestTarget) return;

    // Hold back the down payment on whatever it is currently walking toward, so a stream of
    // cheap upgrades can't starve the build queue forever.
    const reserve = side.seekKind === 'expansion' ? this.expansionCost('npc')
      : side.seekKind ? this.costOf('npc', side.seekKind) : 0;
    const up = nextUpgrade(this.targetKind(bestTarget), bestTarget.tiers, bestPath);
    if (!up || side.authority - up.cost < reserve) return;

    this.purchase(bestTarget, bestPath);
  }

  /** One stack, one square, outward — toward the nearest neutral ground it can claim. */
  private npcMarch(): void {
    const stacks = new Map<number, number>();
    for (const t of this.troops) {
      if (t.owner !== 'npc') continue;
      stacks.set(t.cell, (stacks.get(t.cell) ?? 0) + 1);
    }
    if (!stacks.size) return;

    let bestFrom = -1;
    let bestTo = -1;
    let bestScore = -Infinity;
    for (const [from, count] of stacks) {
      // Never strip a square bare; a barracks square with one soldier left still holds it.
      if (count < 2 && !this.buildingAt(from)) continue;
      for (const to of this.within(from, this.marchRangeOf('npc', from))) {
        if (this.cellOwner[to] !== null) continue;
        // Claiming toward the enemy is worth more than claiming into the corner.
        const d = this.alive(this.api.player)
          ? Phaser.Math.Distance.Between(this.centreX(to), this.centreY(to), this.api.player.x, this.api.player.y)
          : 0;
        const score = -d + count * 40;
        if (score > bestScore) { bestScore = score; bestFrom = from; bestTo = to; }
      }
    }
    if (bestFrom < 0) return;
    this.marchTroops('npc', bestFrom, bestTo);
  }

  /** Where the NPC wants to physically be — read by `NpcOpponent` as a movement override. */
  npcSeekPoint(): { x: number; y: number } | null {
    const side = this.side('npc');
    if (!side.seek) return null;
    // Arrived: stop overriding movement so the ordinary chase/strafe takes back over while the
    // build itself is cast from `doConquestAbilities`.
    const f = this.api.npc;
    if (this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, side.seek.x, side.seek.y) < 10) return null;
    return side.seek;
  }

  /** True when the NPC is standing where it meant to stand and can afford what it came for. */
  npcReadyToBuild(): PlaceKind | 'expansion' | null {
    const side = this.side('npc');
    if (!side.seek || !side.seekKind) return null;
    const f = this.api.npc;
    if (!this.alive(f)) return null;
    if (Phaser.Math.Distance.Between(f.x, f.y, side.seek.x, side.seek.y) > 16) return null;
    const why = side.seekKind === 'expansion'
      ? this.expansionRefusal('npc')
      : this.buildRefusal('npc', side.seekKind);
    return why ? null : side.seekKind;
  }

  /** Called by ArenaScene once the NPC's cast has actually gone through. */
  npcClearSeek(): void {
    const side = this.side('npc');
    side.seek = null;
    side.seekKind = null;
  }

  npcAuthority(): number { return Math.floor(this.side('npc').authority); }

  // ── Online ─────────────────────────────────────────────────────────────────

  /**
   * The whole local empire, as one packet.
   *
   * A per-event protocol was the obvious first design and the wrong one: every square, tier and
   * soldier is derived from a chain of earlier events, so a single dropped "claimed" or
   * "upgraded" leaves the two boards permanently disagreeing about who owns what — and the
   * board is the entire element. A snapshot is a few hundred bytes four times a second and
   * cannot drift.
   *
   * Ownership rides as one 126-character string, one per square: `.` for anything that isn't
   * ours, otherwise the digit of the town center it belongs to.
   */
  netSnapshot(): NetConquestSnap | null {
    if (!this.isConquest('player')) return null;
    const side = this.side('player');

    let cells = '';
    for (let i = 0; i < CELLS; i++) {
      cells += this.cellOwner[i] === 'player' ? String(this.cellTown[i]) : '.';
    }

    const tw: number[] = [];
    for (const t of side.towns) {
      tw.push(t.cell, t.tiers[0], t.tiers[1], t.tiers[2], t.fireReady ? 1 : 0);
    }

    const b: number[] = [];
    for (const bd of this.buildings) {
      if (bd.owner !== 'player') continue;
      b.push(bd.cell, KIND_CODE[bd.kind], bd.town, Math.round(bd.hp),
        bd.tiers[0], bd.tiers[1], bd.tiers[2]);
    }

    const tr: number[] = [];
    for (const t of this.troops) {
      if (t.owner !== 'player') continue;
      // The SHADOW path's three booleans ride as one byte rather than three slots — this packet
      // already carries eleven numbers per soldier and goes out four times a second.
      const flags = (t.surprise ? 1 : 0) | (t.cloak ? 2 : 0) | (t.guild ? 4 : 0);
      tr.push(t.cell, t.town, Math.round(t.hp), Math.round(t.baseHp), t.king ? 1 : 0,
        Math.round(t.damage), Math.round(t.atkMs), t.crowdBonus ? 1 : 0,
        t.wizard ? 1 : 0, t.marchRange, flags);
    }

    const linked = this.side('player').linkedWall;

    return {
      a: Math.round(side.authority), c: cells, tw, b, tr,
      bf: this.owns('player', 'click') ? BANNER_ORDER.indexOf(side.banner) : -1,
      lw: linked && this.buildings.includes(linked) ? linked.cell : -1,
    };
  }

  /**
   * The peer's empire, applied to the npc side.
   *
   * Reconciled rather than replaced: buildings and soldiers that are still there keep the
   * objects they already had, so a turret's reload clock and a soldier's marching phase survive
   * the packet. Replacing wholesale four times a second would leave every turret permanently
   * one frame from firing and every soldier frozen mid-step.
   *
   * Columns are mirrored on the way in for the same reason the fighters are — the two players
   * each see themselves on the left.
   */
  applyNetSnapshot(snap: NetConquestSnap): void {
    const side = this.side('npc');
    side.authority = snap.a;

    // ── Territory ──
    for (let i = 0; i < CELLS; i++) {
      const ch = snap.c[this.mirrorCell(i)];
      const mine = ch !== undefined && ch !== '.';
      if (mine) this.setCell(i, 'npc', Number(ch));
      else if (this.cellOwner[i] === 'npc') this.setCell(i, null);
    }

    // ── Town centers ──
    // Their fireball as we last saw it, kept across the rebuild: a ready orb that has vanished is
    // the only evidence on this sim that they threw one, and it is what makes their Wizard Tower
    // land on this screen at all. Same approximation as an npc oil turret — we cannot know where
    // they aimed, so it comes at us.
    const wasReady = new Set(side.towns.filter((t) => t.fireReady).map((t) => t.cell));
    side.towns = [];
    for (let i = 0; i + 4 < snap.tw.length; i += 5) {
      const cell = this.mirrorCell(snap.tw[i]);
      side.towns.push({
        owner: 'npc', index: side.towns.length, cell,
        x: this.centreX(cell), y: this.centreY(cell),
        tiers: [snap.tw[i + 1], snap.tw[i + 2], snap.tw[i + 3]],
        coinAccum: 0,
        // Their clocks are theirs; we only ever learn whether the orb is currently sitting there.
        fireAccum: 0, fireReady: snap.tw[i + 4] === 1, schoolAccum: 0,
      });
    }
    for (const t of side.towns) {
      if (t.fireReady || !wasReady.has(t.cell)) continue;
      const target = this.api.player;
      if (this.alive(target)) this.hurlFireball(t, target.x, target.y);
    }

    // ── Buildings ──
    const keptBuildings: Building[] = [];
    const spare = this.buildings.filter((bd) => bd.owner === 'npc');
    for (let i = 0; i + 6 < snap.b.length; i += 7) {
      const cell = this.mirrorCell(snap.b[i]);
      const kind = KIND_OF_CODE[snap.b[i + 1]] ?? 'barricade';
      const idx = spare.findIndex((bd) => bd.cell === cell && bd.kind === kind);
      let bd: Building;
      if (idx >= 0) {
        bd = spare.splice(idx, 1)[0];
      } else {
        bd = {
          owner: 'npc', kind, town: 0, cell,
          x: this.centreX(cell), y: this.centreY(cell),
          hp: 0, tiers: [0, 0, 0], accum: 0, regenCarry: 0,
          burstLeft: 0, burstAccum: 0, aimAng: Math.PI, recoil: 0,
          spikeCarry: 0, lastHitAt: -HP_BAR_MS, bombAt: -BOMB_COOLDOWN_MS,
          seed: Math.random() * 999,
        };
        this.fx('npc').raise(bd.x, bd.y, CELL, townColor('npc', snap.b[i + 2]));
      }
      bd.town = snap.b[i + 2];
      // A drop in HP is the only tell that something of theirs is under fire, so it drives the
      // same bar timer a local hit would.
      if (snap.b[i + 3] < bd.hp) bd.lastHitAt = this.now;
      bd.hp = snap.b[i + 3];
      bd.tiers = [snap.b[i + 4], snap.b[i + 5], snap.b[i + 6]];
      keptBuildings.push(bd);
    }
    for (const dead of spare) this.fx('npc').rubble(dead.x, dead.y, CELL);
    this.buildings = [...this.buildings.filter((bd) => bd.owner !== 'npc'), ...keptBuildings];

    // ── Soldiers ──
    const keptTroops: Troop[] = [];
    const spareTroops = this.troops.filter((t) => t.owner === 'npc');
    for (let i = 0; i + 10 < snap.tr.length; i += 11) {
      const cell = this.mirrorCell(snap.tr[i]);
      const king = snap.tr[i + 4] === 1;
      const idx = spareTroops.findIndex((t) => t.cell === cell && t.king === king);
      let t: Troop;
      if (idx >= 0) {
        t = spareTroops.splice(idx, 1)[0];
      } else {
        t = {
          owner: 'npc', town: 0, cell, hp: 0, baseHp: 1,
          damage: 3, atkMs: 1000, crowdBonus: false, king,
          accum: 0, march: Math.random() * 6, ang: Math.PI,
          potionUsed: false, enraged: false,
          marchRange: 1, surprise: false, fresh: false,
          cloak: false, cloakUsed: false, dodge: 0, guild: false,
          wizard: false,
        };
      }
      t.town = snap.tr[i + 1];
      t.hp = snap.tr[i + 2];
      t.baseHp = snap.tr[i + 3];
      t.damage = snap.tr[i + 5];
      t.atkMs = snap.tr[i + 6];
      t.crowdBonus = snap.tr[i + 7] === 1;
      t.wizard = snap.tr[i + 8] === 1;
      t.marchRange = snap.tr[i + 9];
      const flags = snap.tr[i + 10];
      t.surprise = (flags & 1) !== 0;
      t.cloak = (flags & 2) !== 0;
      t.guild = (flags & 4) !== 0;
      // Their dodge is derived rather than sent: the two tiers that grant it are exactly the two
      // flags already on the wire.
      t.dodge = t.guild ? 0.5 : t.cloak ? 0.25 : 0;
      keptTroops.push(t);
    }
    // A wizard of theirs that is no longer in the packet died on their sim, and Academy of Ash
    // means dying is an attack. Done here rather than in `killTroop` because a networked soldier
    // is never killed locally — it simply stops being sent.
    const ash = this.empire('npc').ash;
    this.troops = [...this.troops.filter((t) => t.owner !== 'npc'), ...keptTroops];
    if (ash) {
      for (const dead of spareTroops) {
        if (!dead.wizard) continue;
        const x = this.centreX(dead.cell);
        const y = this.centreY(dead.cell);
        this.fx('npc').ashBurst(x, y, ASH_RADIUS);
        this.splash(x, y, ASH_RADIUS, 'npc', ASH_DAMAGE);
      }
    }

    // ── Banner Bearer and Personal Wall ──
    if (snap.bf >= 0 && snap.bf < BANNER_ORDER.length) side.banner = BANNER_ORDER[snap.bf];
    side.netLinkCell = snap.lw >= 0 ? this.mirrorCell(snap.lw) : -1;
  }

  /** Reflect a cell across the board's vertical centre line. */
  private mirrorCell(cell: number): number {
    const c = cell % COLS;
    const r = Math.floor(cell / COLS);
    return r * COLS + (COLS - 1 - c);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isConquest('player');
    const npcIs = this.isConquest('npc');
    if (!playerIs && !npcIs) return;

    const dt = Math.min(delta, 100) / 1000;
    this.vizT += dt;
    this.ensureLayers();
    if (!this.seeded) this.seed();

    if (playerIs) this.tickEconomy('player', dt);
    // A remote player banks their own Authority and decides their own builds; we only ever
    // learn the result. A bot does both here.
    if (npcIs && !this.npcIsRemote) { this.tickEconomy('npc', dt); this.npcThink(dt); }

    this.tickTerritory(dt);
    this.tickBuildings(dt);
    this.tickTroops(dt);
    this.tickBullets(dt);
    this.tickIncomingProjectiles();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isConquest(owner)) continue;
      this.tickBannerHeal(owner, dt);
      this.syncAbsorber(owner);
    }

    // Territory armour, pushed onto both fighters every frame — the field is rewritten from
    // scratch here rather than accumulated, so nothing else's armour is stomped.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      f.conquestIncomingMult = this.isConquest(owner) && this.standingTown(owner) >= 0 ? HOME_ARMOUR : 1;
    }

    // Last thing before drawing: ArenaScene has already resolved this frame's movement, so a
    // stolen velocity written here is the one that survives.
    this.tickPulls();

    this.draw(delta);
  }

  /**
   * Personal Wall's redirect, kept in step with the link every frame.
   *
   * `damageAbsorber` is a single slot that several kits write, so this only ever installs into an
   * empty one and only ever clears the closure it put there itself. It is also deliberately never
   * installed on a *remote* opponent: their wall eats their hits on their own sim, and doing it
   * twice would take the wall down twice as fast on one screen as on the other.
   */
  private syncAbsorber(owner: Owner): void {
    const f = this.fighter(owner);
    if (!f) return;
    const mine = this.absorbers[owner];
    const wall = owner === 'npc' && this.npcIsRemote ? null : this.linkedWall(owner);

    if (!wall) {
      if (mine && f.damageAbsorber === mine) f.damageAbsorber = null;
      delete this.absorbers[owner];
      return;
    }
    if (mine && f.damageAbsorber === mine) return;
    if (f.damageAbsorber) return;

    // The closure re-reads the link rather than closing over the wall, so unlinking mid-match —
    // or the wall being knocked down — takes effect without reinstalling anything.
    const fn = (amount: number): boolean => {
      const w = this.linkedWall(owner);
      if (!w) return false;
      this.damageBuilding(w, amount, null);
      this.api.showFloatingText(w.x, w.y - 32, `⛓️ ${Math.round(amount)}`, this.hex(CNQ.iron));
      return true;
    };
    this.absorbers[owner] = fn;
    f.damageAbsorber = fn;
  }

  // ── Speed ──────────────────────────────────────────────────────────────────

  /**
   * Speedy Walls and Force Shield, pulled by ArenaScene rather than pushed onto the fighter —
   * this kit's `update` runs long after the frame's movement has already resolved.
   */
  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  private speedMultFor(owner: Owner): number {
    if (!this.isConquest(owner)) return 1;
    const f = this.fighter(owner);
    if (!this.alive(f)) return 1;
    const fort = this.empire(owner).fortressHp;

    let stacks = 0;
    for (const b of this.buildings) {
      if (b.owner !== owner || b.kind !== 'barricade') continue;
      if (!barricadeStats(b.tiers, fort).speedAura) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) > HASTE_RANGE) continue;
      stacks++;
    }
    let mult = HASTE_PER ** Math.min(stacks, HASTE_MAX_STACKS);

    const wall = this.linkedWall(owner);
    if (wall && barricadeStats(wall.tiers, fort).forceShield) mult *= FORCE_SPEED;
    return mult;
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private draw(delta: number): void {
    this.drawGrid();
    this.drawGround();
    this.drawObjects();
    this.drawAir();
    this.drawHud();
    this.drawAvatars(delta);
  }

  /** The board and the territory wash — repainted only when a square changes hands. */
  private drawGrid(): void {
    const g = this.gridGfx;
    if (!g || !this.gridDirty) return;
    this.gridDirty = false;
    g.clear();

    for (let i = 0; i < CELLS; i++) {
      const x = this.cellX(i);
      const y = this.cellY(i);
      const owner = this.cellOwner[i];
      if (!owner) { gridCell(g, x, y, CELL, 0.1); continue; }

      const town = this.cellTown[i];
      const c = this.col(owner);
      const col = townColor(owner, town);
      const same = (n: number): boolean =>
        n >= 0 && this.cellOwner[n] === owner && this.cellTown[n] === town;
      const cx = i % COLS;
      const ry = Math.floor(i / COLS);
      // Borders only on the outside of a region, so nine owned squares read as one territory.
      territoryTile(g, c, x, y, CELL, col, [
        !same(ry > 0 ? i - COLS : -1),
        !same(cx < COLS - 1 ? i + 1 : -1),
        !same(ry < ROWS - 1 ? i + COLS : -1),
        !same(cx > 0 ? i - 1 : -1),
      ], 1);
    }
  }

  /** Contest hatching and the drag preview. */
  private drawGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const [cell, rec] of this.contest) {
      const owner = this.cellOwner[cell];
      if (!owner) continue;
      const col = this.col(rec.by)(townColor(rec.by, 0));
      contestTile(g, this.cellX(cell), this.cellY(cell), CELL, rec.ms / CONTEST_MS, col, this.vizT);
    }

    // Speedy Walls, drawn on the floor so a wall that is hurrying you along says so before you
    // have to notice you are moving faster.
    if (this.alive(this.api.player) || this.alive(this.api.npc)) {
      for (const owner of ['player', 'npc'] as Owner[]) {
        if (!this.isConquest(owner)) continue;
        const fort = this.empire(owner).fortressHp;
        for (const b of this.buildings) {
          if (b.owner !== owner || b.kind !== 'barricade') continue;
          if (!barricadeStats(b.tiers, fort).speedAura) continue;
          const f = this.fighter(owner);
          const on = this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) <= HASTE_RANGE;
          hasteRing(g, this.col(owner), b.x, b.y, HASTE_RANGE, townColor(owner, b.town), this.vizT, on ? 1 : 0.35);
        }
      }
    }

    if (this.dragging && this.dragFrom >= 0) {
      const from = this.dragFrom;
      const range = this.marchRangeOf('player', from);
      const col = this.pcol(townColor('player', this.cellTown[from]));
      g.lineStyle(2.5, col, 0.85);
      g.strokeRect(this.cellX(from) + 3, this.cellY(from) + 3, CELL - 6, CELL - 6);
      // Every square the stack can reach, so the march rule is visible rather than something you
      // discover by failing at it. Neutral ground is drawn brighter, because a march onto it is
      // a capture and a march anywhere else is only a move.
      for (const n of this.within(from, range)) {
        const claims = this.cellOwner[n] === null;
        g.lineStyle(claims ? 2 : 1.4, col, claims ? 0.7 : 0.3);
        g.strokeRect(this.cellX(n) + 8, this.cellY(n) + 8, CELL - 16, CELL - 16);
      }
      const to = this.cellAt(this.aimX, this.aimY);
      if (to >= 0 && this.inRange(from, to, range)) {
        g.fillStyle(col, 0.2);
        g.fillRect(this.cellX(to), this.cellY(to), CELL, CELL);
        g.lineStyle(3, col, 0.95);
        g.strokeRect(this.cellX(to) + 2, this.cellY(to) + 2, CELL - 4, CELL - 4);
      }
      g.lineStyle(2, col, 0.6);
      g.lineBetween(this.centreX(from), this.centreY(from), this.aimX, this.aimY);
    }

    // A wall being shoved. Same affordance as a garrison drag, one square only.
    if (this.wallDrag) {
      const from = this.wallDrag.cell;
      const col = this.pcol(townColor('player', this.wallDrag.town));
      g.lineStyle(2.5, col, 0.85);
      g.strokeRect(this.cellX(from) + 3, this.cellY(from) + 3, CELL - 6, CELL - 6);
      for (const n of this.around(from)) {
        const free = !this.buildingAt(n) && !this.townAt(n)
          && (this.cellOwner[n] === null || this.cellOwner[n] === 'player');
        if (!free) continue;
        g.lineStyle(2, col, 0.55);
        g.strokeRect(this.cellX(n) + 8, this.cellY(n) + 8, CELL - 16, CELL - 16);
      }
      const to = this.cellAt(this.aimX, this.aimY);
      if (to >= 0 && this.adjacent(from, to)) {
        g.fillStyle(col, 0.2);
        g.fillRect(this.cellX(to), this.cellY(to), CELL, CELL);
      }
      g.lineStyle(2, col, 0.6);
      g.lineBetween(this.centreX(from), this.centreY(from), this.aimX, this.aimY);
    }

    // The square you are standing on, when it can take a building — the placement affordance.
    if (this.isConquest('player') && this.alive(this.api.player)) {
      const cell = this.cellAt(this.api.player.x, this.api.player.y);
      if (cell >= 0 && this.cellOwner[cell] === 'player' && !this.buildingAt(cell) && !this.townAt(cell)) {
        const col = this.pcol(townColor('player', this.cellTown[cell]));
        const pulse = 0.3 + 0.2 * Math.sin(this.vizT * 4);
        g.lineStyle(2, col, pulse);
        g.strokeRect(this.cellX(cell) + 6, this.cellY(cell) + 6, CELL - 12, CELL - 12);
      }
    }
  }

  private drawObjects(): void {
    const g = this.objGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      const c = this.col(owner);
      for (const t of this.side(owner).towns) {
        townCenterBody(g, c, t.x, t.y, CELL, townColor(owner, t.index), this.vizT, 1);
      }
    }

    for (const b of this.buildings) {
      const c = this.col(b.owner);
      const col = townColor(b.owner, b.town);
      if (b.kind === 'barracks') barracksBody(g, c, b.x, b.y, CELL, col, 1);
      else if (b.kind === 'turret') turretBody(g, c, b.x, b.y, CELL, col, b.aimAng, b.recoil, 1);
      else {
        const fort = this.empire(b.owner).fortressHp;
        barricadeBody(g, c, b.x, b.y, CELL, col, barricadeStats(b.tiers, fort).spikes, 1);
      }
    }

    for (const t of this.troops) {
      const c = this.col(t.owner);
      const col = townColor(t.owner, t.town);
      const x = this.troopX(t);
      const y = this.troopY(t);
      if (t.king) barbarianKing(g, c, x, y, col, t.ang, t.march, t.enraged, 1);
      else if (t.wizard) wizardTroop(g, c, x, y, col, t.ang, t.march, this.empire(t.owner).ash, 1);
      else soldier(g, c, x, y, col, t.ang, t.march, 1, 1);
      // Shadow Cloak: a low shroud under a soldier that has not spent its free miss yet, so the
      // one that is still untouchable is the one you can pick out of a stack.
      if (t.cloak && !t.cloakUsed && !t.wizard) {
        g.fillStyle(c(CNQ.shroud), 0.4 + 0.15 * Math.sin(this.vizT * 3 + t.march));
        g.fillEllipse(x, y + 6, 18, 7);
      }
    }

    // Personal Wall's chain, on both sides — a remote opponent's link arrives as a cell.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isConquest(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const fort = this.empire(owner).fortressHp;
      const side = this.side(owner);
      const wall = owner === 'npc' && this.npcIsRemote
        ? (side.netLinkCell >= 0 ? this.buildingAt(side.netLinkCell) : null)
        : this.linkedWall(owner);
      if (!wall || wall.owner !== owner) continue;
      const shielded = barricadeStats(wall.tiers, fort).forceShield;
      linkChain(g, this.col(owner), f.x, f.y, wall.x, wall.y,
        townColor(owner, wall.town), this.vizT, shielded, 1);
    }
  }

  private drawAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const p of this.bullets) {
      const c = this.col(p.owner);
      if (p.kind === 'bomb') { revengeBomb(g, c, p.x, p.y, p.spin, 1); continue; }
      if (p.kind === 'fireball') {
        fireballOrb(g, c, p.x, p.y, this.vizT, 1.15, 1);
        // A tail, so a fireball in flight is unmistakably travelling rather than parked.
        for (let i = 1; i <= 3; i++) {
          g.fillStyle(c(CNQ.ember), 0.35 / i);
          g.fillCircle(p.x - p.vx * 0.011 * i, p.y - p.vy * 0.011 * i, 6 - i);
        }
        continue;
      }
      g.fillStyle(c(p.head ? CNQ.blood : CNQ.tracer), 0.9);
      g.fillCircle(p.x, p.y, p.head ? 4 : 3);
      g.fillStyle(c(CNQ.muzzle), 0.7);
      g.fillCircle(p.x - p.vx * 0.006, p.y - p.vy * 0.006, 1.8);
    }

    // Wizard Tower orbs, waiting over their domes. Drawn over the fighters rather than under
    // them because the whole point is that they are grabbable.
    for (const owner of ['player', 'npc'] as Owner[]) {
      for (const t of this.side(owner).towns) {
        if (!t.fireReady || this.fireDrag === t) continue;
        const p = this.fireballPos(t);
        fireballOrb(g, this.col(owner), p.x, p.y + Math.sin(this.vizT * 2.2) * 3, this.vizT, 1, 1);
      }
    }

    // The one in hand, riding the cursor.
    if (this.fireDrag) {
      const p = this.fireballPos(this.fireDrag);
      g.lineStyle(2, this.pcol(CNQ.ember), 0.5);
      g.lineBetween(p.x, p.y, this.aimX, this.aimY);
      fireballOrb(g, this.pcol, this.aimX, this.aimY, this.vizT, 1.25, 1);
    }

    // Building HP bars, but only for buildings that have actually been hit — twenty full bars
    // is noise, and the ones that matter are the ones under fire.
    for (const b of this.buildings) {
      const max = this.maxHpOf(b);
      if (b.hp >= max && this.now - b.lastHitAt > HP_BAR_MS) continue;
      const ratio = b.hp / max;
      const col = ratio > 0.5 ? 0x5fd45f : ratio > 0.25 ? 0xe8c23a : 0xd83a3a;
      buildingHpBar(g, b.x, b.y + CELL * 0.34, 40, ratio, col, 0.95);
    }

    // Soldier HP, as a pip under each one — a bar per soldier would bury the board.
    for (const t of this.troops) {
      const tmax = this.troopMaxHp(t);
      if (t.hp >= tmax) continue;
      const w = t.king ? 30 : 14;
      buildingHpBar(g, this.troopX(t), this.troopY(t) + (t.king ? 14 : 8), w, t.hp / tmax, 0xd83a3a, 0.85);
    }
  }

  private drawHud(): void {
    const g = this.hudGfx;
    const txt = this.hudText;
    if (!g || !txt) return;
    g.clear();

    if (!this.isConquest('player')) { txt.setText(''); return; }
    const side = this.side('player');
    const emp = this.empire('player');
    const owned = this.cellOwner.reduce((n, o) => n + (o === 'player' ? 1 : 0), 0);

    const banner = this.bannerOf('player');
    const x = 14;
    const y = 78;
    const h = banner ? 64 : 46;
    g.fillStyle(0x0a0a14, 0.78);
    g.fillRect(x - 6, y - 6, 190, h);
    g.lineStyle(1.5, this.pcol(banner ? banner.color : CNQ.gold), 0.6);
    g.strokeRect(x - 6, y - 6, 190, h);

    txt.setPosition(x, y);
    txt.setText(
      `👑 ${Math.floor(side.authority)}  (+${emp.income}/s)\n`
      + `🏗️ ${this.buildingCount('player')}/${this.buildingCap('player')}   🗺️ ${owned}`
      // Which standard is up, and the reminder of how to change it — the right button is the
      // only input in the element that nothing else uses, so it needs saying.
      + (banner ? `\n🚩 ${banner.label}  ·  RMB` : ''),
    );

    if (!banner) return;
    // A little pennant in the corner of the readout, in the form's own colour — parked on the
    // short first row rather than beside the label it would otherwise run into.
    const px = x + 166;
    const py = y - 2;
    g.lineStyle(1.4, this.pcol(CNQ.timberDark), 0.9);
    g.lineBetween(px, py - 4, px, py + 14);
    g.fillStyle(this.pcol(banner.color), 0.95);
    g.fillTriangle(px + 1, py, px + 17, py + 5, px + 1, py + 11);
    g.fillStyle(this.pcol(CNQ.gold), 0.9);
    g.fillCircle(px, py - 5, 2);
  }

  private drawAvatars(delta: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const a = this.avatar(owner);
      const f = this.fighter(owner);
      if (!a) continue;
      if (!this.alive(f)) { a.update(delta, -999, -999, 0); continue; }
      const town = this.standingTown(owner);
      a.setStanding(town >= 0 ? townColor(owner, town) : 0);
      a.setTowns(this.side(owner).towns.length);
      a.setBanner(this.bannerOf(owner)?.color ?? 0);
      a.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      const aim = owner === 'player'
        ? Math.atan2(this.aimY - f.y, this.aimX - f.x)
        : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
      a.setFacing(aim);
      a.update(delta, f.x, f.y, f.alpha);
    }
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Buildings and soldiers both go: a barracks is a building and the men it trained are
   * summons, and neither is a fighter. Town centres are deliberately spared — every building
   * and soldier on the board indexes back into one, and razing a town would leave its empire
   * pointing at nothing.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    // Every caller here short-circuits the owner test first, so a true answer is always a kill —
    // which makes this the one honest place to tell Ruin where the corpse fell.
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      return true;
    };
    let razed = 0;
    for (const b of [...this.buildings]) {
      if (b.owner === exceptOwner || !near(b.x, b.y)) continue;
      this.destroyBuilding(b);
      razed++;
    }
    for (const t of [...this.troops]) {
      if (t.owner === exceptOwner || !near(this.troopX(t), this.troopY(t))) continue;
      this.killTroop(t);
      razed++;
    }
    return razed;
  }
}
