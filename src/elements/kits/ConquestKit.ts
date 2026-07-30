import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  BarracksStats, BarricadeStats, BuildKind, TurretStats, Tiers,
  BUILD_COST, EXPANSION_COST, KIND_LABEL, barracksStats, barricadeStats,
  empireStats, nextUpgrade, turretStats,
} from './ConquestUpgrades';
import {
  CNQ, ConquestAvatar, ConquestColorFn, ConquestFx, barbarianKing, barracksBody,
  barricadeBody, buildingHpBar, contestTile, gridCell, soldier, territoryTile,
  townCenterBody, townColor, turretBody,
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
  /** Town centers, as groups of 3: cell, path-0 tier, path-1 tier. */
  tw: number[];
  /** Buildings, as groups of 6: cell, kind code, town, hp, path-0 tier, path-1 tier. */
  b: number[];
  /** Soldiers, as groups of 8: cell, town, hp, base HP, king, damage, attack interval, crowd bonus. */
  tr: number[];
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
/** How long a building's HP bar stays up after it was last touched. */
const HP_BAR_MS = 4000;

const KING_POTION_HEAL = 50;
const KING_POTION_AT = 0.33;

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
}

interface Bullet {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  diesAt: number;
  head: boolean;
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
}

function makeSide(owner: Owner): Side {
  return {
    owner, authority: START_AUTHORITY, towns: [], lastRaw: 0, insuranceCarry: 0,
    thinkAccum: 0, dragAccum: 0, seek: null, seekKind: null,
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
  /** Per path: the next upgrade's name/desc/cost, or null when there isn't one. */
  next: [{ name: string; desc: string; cost: number } | null, { name: string; desc: string; cost: number } | null];
  /** Per path: why the next upgrade can't be bought, or null when it can. */
  blocked: [string | null, string | null];
  color: number;
}

export interface ConquestMenuHost {
  getMenuModel(): ConquestMenuModel | null;
  buyUpgrade(path: 0 | 1): boolean;
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
  /** Squares being stood on by the other side: cell → { by, ms }. */
  private contest = new Map<number, { by: Owner; ms: number }>();
  /** True once both sides' opening territory has been laid down. */
  private seeded = false;

  // ── Input ──
  private aimX = 0;
  private aimY = 0;
  /** The square a troop drag started from, or -1. */
  private dragFrom = -1;
  private dragging = false;
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

  private adjacent(a: number, b: number): boolean {
    const dc = Math.abs((a % COLS) - (b % COLS));
    const dr = Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS));
    return dc <= 1 && dr <= 1 && (dc + dr) > 0;
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
      if (f) f.conquestIncomingMult = 1;
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.cellOwner = new Array(CELLS).fill(null);
    this.cellTown = new Array(CELLS).fill(0);
    this.buildings = [];
    this.troops = [];
    this.bullets = [];
    this.contest.clear();
    this.seeded = false;
    this.gridDirty = true;
    this.aimX = 0;
    this.aimY = 0;
    this.dragFrom = -1;
    this.dragging = false;
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
      tiers: [0, 0],
      coinAccum: 0,
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
    if (this.side(owner).authority < EXPANSION_COST) return 'NOT ENOUGH AUTHORITY';
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
    const dmg = Math.round(PIKE_DAMAGE * (home ? PIKE_HOME_MULT : 1));
    const color = townColor(owner, Math.max(0, this.standingTown(owner)));

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).thrust(f.x, f.y, ang, PIKE_REACH, color);

    // One target: a poke that swept a 260px line through everything would be the best
    // clear in the game rather than the worst basic attack.
    let victim: Fighter | null = null;
    let victimDist = Infinity;
    for (const t of this.targetsOf(owner)) {
      if (this.distToSegment(f.x, f.y, ex, ey, t.x, t.y) > PIKE_HALF_WIDTH) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < victimDist) { victimDist = d; victim = t; }
    }
    if (victim) {
      victim.takeDamage(dmg);
      this.api.spawnHitFlash(victim.x, victim.y, CNQ.steel);
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
      hp: 0, tiers: [0, 0],
      accum: 0, regenCarry: 0,
      burstLeft: 0, burstAccum: 0,
      aimAng: owner === 'player' ? 0 : Math.PI,
      recoil: 0, spikeCarry: 0, lastHitAt: -HP_BAR_MS,
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
    side.authority -= EXPANSION_COST;
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
    const dealt = Math.max(1, Math.round(amount * this.wardMultFor(b)));
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

    if (b.hp <= 0) this.destroyBuilding(b);
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
    const i = this.troops.indexOf(t);
    if (i >= 0) this.troops.splice(i, 1);
    this.api.spawnHitFlash(this.troopX(t), this.troopY(t), CNQ.blood);
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
    this.fx(b.owner).muzzle(mx, my, ang);

    const head = s.headhunter && Math.random() < 0.1;
    const damage = s.damage * (head ? 2 : 1);

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
      }
      return;
    }

    this.bullets.push({
      owner: b.owner, x: mx, y: my,
      vx: Math.cos(ang) * s.bulletSpeed, vy: Math.sin(ang) * s.bulletSpeed,
      damage, diesAt: this.now + BULLET_LIFE_MS, head,
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
      let bestD = TROOP_RANGE;
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
      const damage = Math.max(1, Math.round((t.damage + crowd) * mult));
      this.hitMark(best, damage, { kind: 'troop', t }, t.owner);
    }
  }

  /** A soldier's real ceiling: its trained HP through whatever military tier is bought now. */
  private troopMaxHp(t: Troop): number {
    return Math.round(t.baseHp * this.empire(t.owner).troopMult);
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

      if (this.now >= p.diesAt
        || p.x < ORIGIN_X - 20 || p.x > ORIGIN_X + COLS * CELL + 20
        || p.y < ORIGIN_Y - 20 || p.y > ORIGIN_Y + ROWS * CELL + 20) {
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

      this.hitMark(hit, p.damage, null, p.owner);
      if (p.head) this.api.showFloatingText(hit.x, hit.y - 24, '🎯 HEADSHOT', this.hex(CNQ.tracer));
      this.bullets.splice(i, 1);
    }
  }

  /**
   * Ordinary projectiles knocking down buildings. Done here rather than through an overlap in
   * ArenaScene because buildings are not physics bodies — and because the town center's
   * "shots fly over it" rule is simply a matter of not being in this list.
   */
  private tickIncomingProjectiles(): void {
    if (!this.buildings.length) return;
    // Snapshotted: `destroy()` splices the group's live array under us.
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      for (const b of this.buildings) {
        const hostile = b.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, proj.x, proj.y) > BUILDING_R) continue;
        this.damageBuilding(b, Math.max(1, Math.round(proj.damage * proj.perkBoost)), null);
        this.api.spawnHitFlash(proj.x, proj.y, CNQ.stone);
        proj.destroy();
        break;
      }
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

    // ── Drop a drag ──
    if (released && this.dragging) {
      this.dragging = false;
      const from = this.dragFrom;
      this.dragFrom = -1;
      if (cell >= 0 && cell !== from && this.adjacent(from, cell)) this.marchTroops('player', from, cell);
      else if (cell >= 0 && cell !== from) {
        this.api.showFloatingText(mouseX, mouseY - 20, 'ONE SQUARE AT A TIME', this.hex(CNQ.stoneDark));
      }
      return;
    }

    if (clicked && cell >= 0) {
      // ── Open an upgrade menu ──
      const town = this.townAt(cell);
      const building = this.buildingAt(cell);
      if (town && town.owner === 'player') { this.openMenu(town); return; }
      if (building && building.owner === 'player') { this.openMenu(building); return; }

      // ── Start a drag ──
      if (this.troops.some((t) => t.owner === 'player' && t.cell === cell)) {
        this.dragging = true;
        this.dragFrom = cell;
        return;
      }
    }

    if (clicked) p.castAbility('conquest-banner', ctx);

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.tryBuild(p, ctx, 'barracks');
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.tryBuild(p, ctx, 'turret');
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.tryBuild(p, ctx, 'barricade');
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      const why = this.expansionRefusal('player');
      if (why) this.api.showFloatingText(p.x, p.y - 46, why, this.hex(CNQ.blood));
      else p.castAbility('conquest-expansion', ctx);
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

    for (const t of moving.slice(0, room)) t.cell = to;

    if (this.cellOwner[to] === null) {
      const town = this.nearestTown(owner, to);
      this.setCell(to, owner, town);
      this.fx(owner).claim(this.cellX(to), this.cellY(to), CELL, townColor(owner, town));
      this.api.showFloatingText(this.centreX(to), this.centreY(to) - 16, 'CLAIMED', this.hex(townColor(owner, town)));
    }
  }

  // ── Upgrade menu ───────────────────────────────────────────────────────────

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

    const next: ConquestMenuModel['next'] = [null, null];
    const blocked: ConquestMenuModel['blocked'] = [null, null];
    for (const path of [0, 1] as const) {
      const up = nextUpgrade(kind, t.tiers, path);
      if (!up) {
        next[path] = null;
        blocked[path] = t.tiers[path] >= 4 ? 'MAXED' : 'LOCKED — the other path is committed';
        continue;
      }
      next[path] = { name: up.name, desc: up.desc, cost: up.cost };
      blocked[path] = side.authority < up.cost ? `NEEDS ${up.cost} AUTHORITY` : null;
    }

    return {
      kind,
      title: KIND_LABEL[kind],
      tiers: [t.tiers[0], t.tiers[1]],
      hp: b ? Math.max(0, Math.round(b.hp)) : 0,
      maxHp: b ? this.maxHpOf(b) : 0,
      destructible: !isTown,
      authority: Math.floor(side.authority),
      next,
      blocked,
      color: townColor(owner, isTown ? (t as Town).index : (t as Building).town),
    };
  }

  buyUpgrade(path: 0 | 1): boolean {
    return this.purchase(this.menuTarget, path);
  }

  /**
   * Spend on one tier. Every HP upgrade in the game — Fortress, Stone Walls, Iron Walls — is a
   * *ceiling* raise, so the building is handed exactly the difference rather than being topped
   * up: buying Iron Walls on a wall that is nearly down should give you 200 more HP, not repair
   * the 250 it had already lost.
   */
  private purchase(t: Building | Town | null, path: 0 | 1): boolean {
    if (!t) return false;
    const kind = this.targetKind(t);
    const side = this.side(t.owner);
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
        ? this.cellOwner[cell] === null && side.authority >= EXPANSION_COST
        : this.cellOwner[cell] === 'npc' && !this.buildingAt(cell) && !this.townAt(cell);
      if (!stillGood) { side.seek = null; side.seekKind = null; }
    }
    if (!side.seek) this.npcPickBuild();
  }

  /** What the NPC wants next, in the order a person would want it. */
  private npcPickBuild(): void {
    const side = this.side('npc');
    const owned = this.buildingCount('npc');
    const cap = this.buildingCap('npc');

    // A second capital, once the first one is genuinely full and paid for.
    if (owned >= cap && side.authority >= EXPANSION_COST && side.towns.length < 3) {
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
    let bestPath: 0 | 1 = 0;
    let bestCost = Infinity;
    for (const t of targets) {
      const kind = this.targetKind(t);
      for (const path of [0, 1] as const) {
        const up = nextUpgrade(kind, t.tiers, path);
        if (!up || up.cost > side.authority) continue;
        // A town center's income compounds, so it is worth overpaying for early; everything
        // else is bought by price alone.
        const weight = kind === 'town' ? 0.6 : 1;
        // Never open a second path on a building that has already committed to one — that is
        // the player's restriction too, and spending into a dead end is how a bot stalls.
        if (t.tiers[path === 0 ? 1 : 0] >= 3 && t.tiers[path] >= 2) continue;
        const score = up.cost * weight;
        if (score < bestCost) { bestCost = score; bestTarget = t; bestPath = path; }
      }
    }
    if (!bestTarget) return;

    // Hold back the down payment on whatever it is currently walking toward, so a stream of
    // cheap upgrades can't starve the build queue forever.
    const reserve = side.seekKind === 'expansion' ? EXPANSION_COST
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
      for (const to of this.around(from)) {
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
    for (const t of side.towns) tw.push(t.cell, t.tiers[0], t.tiers[1]);

    const b: number[] = [];
    for (const bd of this.buildings) {
      if (bd.owner !== 'player') continue;
      b.push(bd.cell, KIND_CODE[bd.kind], bd.town, Math.round(bd.hp), bd.tiers[0], bd.tiers[1]);
    }

    const tr: number[] = [];
    for (const t of this.troops) {
      if (t.owner !== 'player') continue;
      tr.push(t.cell, t.town, Math.round(t.hp), Math.round(t.baseHp), t.king ? 1 : 0,
        Math.round(t.damage), Math.round(t.atkMs), t.crowdBonus ? 1 : 0);
    }

    return { a: Math.round(side.authority), c: cells, tw, b, tr };
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
    side.towns = [];
    for (let i = 0; i + 2 < snap.tw.length; i += 3) {
      const cell = this.mirrorCell(snap.tw[i]);
      side.towns.push({
        owner: 'npc', index: side.towns.length, cell,
        x: this.centreX(cell), y: this.centreY(cell),
        tiers: [snap.tw[i + 1], snap.tw[i + 2]],
        coinAccum: 0,
      });
    }

    // ── Buildings ──
    const keptBuildings: Building[] = [];
    const spare = this.buildings.filter((bd) => bd.owner === 'npc');
    for (let i = 0; i + 5 < snap.b.length; i += 6) {
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
          hp: 0, tiers: [0, 0], accum: 0, regenCarry: 0,
          burstLeft: 0, burstAccum: 0, aimAng: Math.PI, recoil: 0,
          spikeCarry: 0, lastHitAt: -HP_BAR_MS, seed: Math.random() * 999,
        };
        this.fx('npc').raise(bd.x, bd.y, CELL, townColor('npc', snap.b[i + 2]));
      }
      bd.town = snap.b[i + 2];
      // A drop in HP is the only tell that something of theirs is under fire, so it drives the
      // same bar timer a local hit would.
      if (snap.b[i + 3] < bd.hp) bd.lastHitAt = this.now;
      bd.hp = snap.b[i + 3];
      bd.tiers = [snap.b[i + 4], snap.b[i + 5]];
      keptBuildings.push(bd);
    }
    for (const dead of spare) this.fx('npc').rubble(dead.x, dead.y, CELL);
    this.buildings = [...this.buildings.filter((bd) => bd.owner !== 'npc'), ...keptBuildings];

    // ── Soldiers ──
    const keptTroops: Troop[] = [];
    const spareTroops = this.troops.filter((t) => t.owner === 'npc');
    for (let i = 0; i + 7 < snap.tr.length; i += 8) {
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
        };
      }
      t.town = snap.tr[i + 1];
      t.hp = snap.tr[i + 2];
      t.baseHp = snap.tr[i + 3];
      t.damage = snap.tr[i + 5];
      t.atkMs = snap.tr[i + 6];
      t.crowdBonus = snap.tr[i + 7] === 1;
      keptTroops.push(t);
    }
    this.troops = [...this.troops.filter((t) => t.owner !== 'npc'), ...keptTroops];
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

    // Territory armour, pushed onto both fighters every frame — the field is rewritten from
    // scratch here rather than accumulated, so nothing else's armour is stomped.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      f.conquestIncomingMult = this.isConquest(owner) && this.standingTown(owner) >= 0 ? HOME_ARMOUR : 1;
    }

    this.draw(delta);
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

    if (this.dragging && this.dragFrom >= 0) {
      const from = this.dragFrom;
      const col = this.pcol(townColor('player', this.cellTown[from]));
      g.lineStyle(2.5, col, 0.85);
      g.strokeRect(this.cellX(from) + 3, this.cellY(from) + 3, CELL - 6, CELL - 6);
      // Every square the stack can reach, so the one-square rule is visible rather than
      // something you discover by failing at it. Neutral ground is drawn brighter, because a
      // march onto it is a capture and a march anywhere else is only a move.
      for (const n of this.around(from)) {
        const claims = this.cellOwner[n] === null;
        g.lineStyle(claims ? 2 : 1.4, col, claims ? 0.7 : 0.3);
        g.strokeRect(this.cellX(n) + 8, this.cellY(n) + 8, CELL - 16, CELL - 16);
      }
      const to = this.cellAt(this.aimX, this.aimY);
      if (to >= 0 && this.adjacent(from, to)) {
        g.fillStyle(col, 0.2);
        g.fillRect(this.cellX(to), this.cellY(to), CELL, CELL);
        g.lineStyle(3, col, 0.95);
        g.strokeRect(this.cellX(to) + 2, this.cellY(to) + 2, CELL - 4, CELL - 4);
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
      else soldier(g, c, x, y, col, t.ang, t.march, 1, 1);
    }
  }

  private drawAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const p of this.bullets) {
      const c = this.col(p.owner);
      g.fillStyle(c(p.head ? CNQ.blood : CNQ.tracer), 0.9);
      g.fillCircle(p.x, p.y, p.head ? 4 : 3);
      g.fillStyle(c(CNQ.muzzle), 0.7);
      g.fillCircle(p.x - p.vx * 0.006, p.y - p.vy * 0.006, 1.8);
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

    const x = 14;
    const y = 78;
    g.fillStyle(0x0a0a14, 0.78);
    g.fillRect(x - 6, y - 6, 190, 46);
    g.lineStyle(1.5, this.pcol(CNQ.gold), 0.6);
    g.strokeRect(x - 6, y - 6, 190, 46);

    txt.setPosition(x, y);
    txt.setText(
      `👑 ${Math.floor(side.authority)}  (+${emp.income}/s)\n`
      + `🏗️ ${this.buildingCount('player')}/${this.buildingCap('player')}   🗺️ ${owned}`,
    );
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
  purgeSummons(x: number, y: number, radius: number, exceptOwner: 'player' | 'npc'): number {
    const near = (px: number, py: number): boolean => Phaser.Math.Distance.Between(x, y, px, py) <= radius;
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
