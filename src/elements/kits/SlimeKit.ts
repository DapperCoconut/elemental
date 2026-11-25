import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { STATUS_DESCRIPTORS, StatusDescriptor, isDebuff, remainingMs, stripBuffs } from '../../combat/StatusEffects';
import { AcidGrid, CellState } from './AcidGrid';
import {
  ACID, AcidAura, AcidAvatar, AcidColorFn, AcidFx, AcidTones, NPC_TONES, POISONS, PoisonKind, STING_TONES, VILE_TONES,
  drawAcidBar, drawAcidBomb, drawAcidBubbles, drawAcidFloor, drawAfflictions, drawPoisonWheel, drawToxinMark, drawVenomBlob,
} from './AcidVisuals';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

/** Distance from a point to a line segment — the electrolysis lane is a capsule. */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return Phaser.Math.Distance.Between(px, py, x1, y1);
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Phaser.Math.Distance.Between(px, py, x1 + dx * t, y1 + dy * t);
}

// ── Interfaces ────────────────────────────────────────────────────────────

/**
 * One remembered pool (an Inject puddle, a bomb crater, a cluster splash). The acid itself lives
 * in the grid; a splat is only kept so Electrolysis has terminals to arc between and Seeping
 * Reflux (R+) has something to bud from — `bud` marks the ones a bomb laid.
 */
interface Splat {
  x: number;
  y: number;
  radius: number;
  nextSpreadAt: number;
  bud: boolean;
}

/** A live Inject shot. The Projectile does the hitting; this is what lets it trickle and be read by a bomb. */
interface Blob {
  owner: Owner;
  proj: Projectile;
  poison: PoisonKind | null;
  lastX: number;
  lastY: number;
  seed: number;
}

/** Acid Reflux's bomb in flight. */
interface Bomb {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  /** 1–3, from coverage when it was thrown. */
  tier: number;
  coverage: number;
  bornAt: number;
  clustered: boolean;
  spin: number;
}

/** One cluster bomblet lobbed out of a shot bomb. */
interface Bomblet {
  owner: Owner;
  x0: number; y0: number;
  x1: number; y1: number;
  bornAt: number;
  /** The poison the Inject shot that burst the bomb was carrying, if any. */
  poison: PoisonKind | null;
  seed: number;
}

/** Murk (divine perk): the acid toad that squats on the surface while its summoner is under it. */
interface MurkToad {
  x: number; y: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  hopStart: number;
  hopEnd: number;
  restUntil: number;
  facing: number;
}

/** Electrolysis (perk): one discharge between two splats, repainted from the clock. */
interface ElectroArc {
  x1: number; y1: number;
  x2: number; y2: number;
  bornAt: number;
  surge: boolean;
  seed: number;
}

interface HuskLikeVariant {
  hpMult?: number;
  speedMult?: number;
}

/** Rattling Strike (F+): a target dripping acid for a few seconds after a surfacing blast. */
interface DrippingStatus {
  owner: Owner;
  until: number;
  nextDripAt: number;
}

/** Venom Mastery — Acid Walker: a short-lived acid print left in the walker's tracks. */
interface AcidFootprint {
  owner: Owner;
  x: number;
  y: number;
  radius: number;
  damage: number;
  expiresAt: number;
  nextTickAt: number;
  boosted: boolean;
  seed: number;
}

interface Bubble { x: number; y: number; born: number; hot: boolean }

/** What the kit last saw of one debuff timer on one body — toxin stretches a jump, the bite restores `fullMs`. */
interface DebuffSeen {
  until: number;
  fullMs: number;
  guardUntil: number;
}

interface Side {
  grid: AcidGrid | null;
  /** The grid version the floor Graphics last painted, so it only repaints on a change. */
  paintedVersion: number;
  splats: Splat[];
  burrowed: boolean;
  burrowedAt: number;
  /** A short lock after surfacing, so the bite cannot be chained off one patch of acid. */
  burrowLockUntil: number;
  rainUntil: number;
  rainTickAt: number;
  rainDropAccum: number;
  aimX: number;
  aimY: number;
  /** The syringe gun: shots left, and the self-stab that refills it. */
  ammo: number;
  reloadStart: number;
  reloadUntil: number;
  /** A fresh press started this burst — a click that began in a menu never fires. */
  triggerHeld: boolean;
  /** Pick Your Poison: what is loaded, and for how many shots (two with E+). */
  loaded: PoisonKind | null;
  loadedShots: number;
  wheelOpen: boolean;
  wheelAt: number;
  /** Online replica: when the owner's own pick last arrived, so the replayed cast does not re-guess it. */
  pickRelayAt: number;
  /** Acid Reflux: the bomb is out and in hand, waiting for the throw. */
  bombHeld: boolean;
  bombHeldAt: number;
  /** Shed Skin: the speed bonus banked this match. */
  shedSpeed: number;
  /** How many of the four coverage milestones this side has reached, and how many it has spent. */
  shedReached: number;
  shedUsed: number;
  /** When each body standing on this side's acid next takes its burn and toxin. */
  standAt: Map<Fighter, number>;
  /** Fractional damage owed for fresh cells walked over, per body. */
  hotOwed: Map<Fighter, number>;
  bubbles: Bubble[];
  bubbleAccum: number;
  // Acid Walker
  wasInAcid: boolean;
  footprintTrailUntil: number;
  lastPrintX: number;
  lastPrintY: number;
  lastUnburrowAt: number;
}

function makeSide(): Side {
  return {
    grid: null, paintedVersion: -1, splats: [], burrowed: false, burrowedAt: 0, burrowLockUntil: 0,
    rainUntil: 0, rainTickAt: 0, rainDropAccum: 0, aimX: 0, aimY: 0,
    ammo: MAG_SIZE, reloadStart: 0, reloadUntil: 0, triggerHeld: false,
    loaded: null, loadedShots: 0, wheelOpen: false, wheelAt: 0, pickRelayAt: -9999, bombHeld: false, bombHeldAt: 0,
    shedSpeed: 0, shedReached: 0, shedUsed: 0,
    standAt: new Map(), hotOwed: new Map(), bubbles: [], bubbleAccum: 0,
    wasInAcid: false, footprintTrailUntil: 0, lastPrintX: 0, lastPrintY: 0, lastUnburrowAt: -FOOTPRINT_BOOST_MS,
  };
}

// ── SlimeArenaApi ─────────────────────────────────────────────────────────

export interface SlimeArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  readonly enemies: readonly Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly projectileRegistry: ProjectileRegistry;
  readonly elementId: string;
  readonly npcElementId: string;
  /** The arena's walls — the acid grid covers exactly this, and a thrown bomb bursts on them. */
  readonly bounds: Phaser.Geom.Rectangle;
  readonly isOnline: boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  readonly isInvasion: boolean;
  readonly playerDodging: boolean;
  isTargetable(f: Fighter): boolean;
  /** Skins: maps an acid visual colour through the owner's skin. */
  acidColor(owner: Owner, base: number): number;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  /** The player's shop upgrade, or the opponent's (online handshake / Hard+ bot loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** True only when the player is Venom AND Venom Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the opponent is Venom AND has Venom Mastery on (online, or a Nightmare bot). */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBest(key: string, value: number): void;
}

// ── Tunables ──────────────────────────────────────────────────────────────

// Toxin: every stack stretches each new negative effect by this much, up to the cap.
export const TOXIN_MAX = 100;
const TOXIN_STRETCH_PER_STACK = 0.02;
/** After stretching a timer, ignore further jumps on it this long — two stretchers must not ping-pong. */
const STRETCH_GUARD_MS = 250;

// Click — Inject
const INJECT_DAMAGE = 12;
const INJECT_SPEED = 720;
const INJECT_TOXIN = 2;
const MAG_SIZE = 3;
const RELOAD_MS = 1000;
const INJECT_MUZZLE = 46;
/** The trickle a flying shot leaves: one small dab every so many pixels — close enough that no cell on the path is skipped. */
const TRICKLE_SPACING = 8;
const TRICKLE_RADIUS = 7;
/** The puddle left under whoever a shot hits. */
const HIT_PUDDLE_RADIUS = 34;

// E — Pick Your Poison
const WHEEL_RADIUS = 64;
const ROT_MS = 5000;
const ROT_TICK_MS = 1000;
const ROT_DAMAGE = 5;
const VULN_MS = 8000;
const VULN_MAX_STACKS = 5;
const PARA_MS = 8000;
const PARA_SLOW_MULT = 0.6;
const PURGE_MS = 8000;
/** While Purged, buffs are stripped again this often — nothing positive sticks. */
const PURGE_STRIP_MS = 300;
const MELT_MS = 8000;
const MELT_DRIP_MS = 450;
const MELT_DRIP_RADIUS = 13;

// R — Acid Reflux
/** A lob, not a shot: slow enough that an Inject fired after the throw catches it in the air. */
const BOMB_SPEED = 300;
const BOMB_HIT_R = 14;
const BOMB_MAX_MS = 4000;
/** The bomb's three sizes, by how much of the arena is acid when it is thrown. */
export const BOMB_TIERS = [
  { minCoverage: 0, damage: 25, radius: 80, size: 12 },
  { minCoverage: 0.15, damage: 38, radius: 105, size: 15 },
  { minCoverage: 0.35, damage: 52, radius: 130, size: 18 },
];
const BOMB_MARKS = [BOMB_TIERS[1].minCoverage, BOMB_TIERS[2].minCoverage];
const BOMB_TOXIN_BASE = 5;
const BOMB_TOXIN_PER_COVERAGE = 40;
const BOMB_TOXIN_MAX = 25;
/** How close an Inject shot has to pass to burst a flying bomb into clusters. */
const CLUSTER_TRIGGER_R = 24;
const CLUSTER_COUNT = 5;
const CLUSTER_FLIGHT_MS = 520;
const CLUSTER_RADIUS = 44;
const CLUSTER_DAMAGE = 8;
const CLUSTER_TOXIN = 2;

// The floor
/** Fresh acid: damage per hot cell a body walks over. */
const HOT_DAMAGE_PER_CELL = 0.3;
/** Standing on acid: this much damage and toxin, once a second. */
const STAND_TICK_MS = 1000;
const STAND_DAMAGE = 1;
const STAND_TOXIN = 1;
const MAX_SPLATS = 60;

/** Gap between droplet puffs shed out of the back of a live Shed Skin dart. */
const TRAIL_INTERVAL_MS = 45;

// F — Burrow, and the bite it ends in
const BURROW_SPEED_MULT = 1.35;
const BURROW_LOCK_MS = 1500;
const BITE_REACH = 95;
const BITE_DAMAGE = 30;
const BITE_TOXIN_MULT = 1.25;
/** Bot: longest it stays under before coming up anyway. */
const NPC_BURROW_MAX_MS = 3500;

// Q — Acid Apocalypse
const RAIN_DURATION_MS = 8000;
const RAIN_TICK_MS = 500;
const RAIN_TICK_DAMAGE = 6;
const RAIN_DROP_INTERVAL_MS = 150;

// Seeping Reflux (R+): bomb pools bud.
const SPREAD_CHECK_MS = 2000;
const SPREAD_CHANCE = 0.2;
const SPREAD_RADIUS_MULT = 0.55;
const SPREAD_MIN_RADIUS = 18;
const SPREAD_OFFSET_MIN = 20;
const SPREAD_OFFSET_MAX = 50;

// Rattling Strike (F+)
const RATTLING_RADIUS = 90;
const RATTLING_DAMAGE = 20;
const RATTLING_DRIP_MS = 5000;
const RATTLING_DRIP_INTERVAL_MS = 1000;
const RATTLING_DRIP_RADIUS = 22;
/** F+: the bite multiplies toxin by this instead of 1.25. */
const RATTLING_TOXIN_MULT = 1.5;

// Acid Flood (Q+): each rain beat, every clean cell touching acid has this chance to fill.
const FLOOD_CREEP_CHANCE = 0.15;

// Electrolysis (perk)
const ELECTRO_INTERVAL_MS = 1400;
const ELECTRO_MAX_SPAN = 220;
const ELECTRO_LANE_HALF_W = 20;
const ELECTRO_DAMAGE = 12;
const ELECTRO_SURGE_CHANCE = 0.2;
const ELECTRO_SURGE_MULT = 3;
const ELECTRO_ARC_MS = 260;
const ELECTRO_JOLT_MS = 450;
const ELECTRO_JOLT_SPEED_MULT = 0.45;

// Murk (divine perk)
const TOAD_HOP_MS = 480;
const TOAD_REST_MS = 340;
const TOAD_HOP_DIST = 130;
const TOAD_PUDDLE_RADIUS = 26;
const TOAD_HOP_HEIGHT = 34;

// Mastery — Acid Walker
const FOOTPRINT_TRAIL_MS = 5000;
const FOOTPRINT_LIFETIME_MS = 3000;
const FOOTPRINT_TICK_MS = 500;
const FOOTPRINT_SPACING = 34;
const FOOTPRINT_RADIUS = 15;
const FOOTPRINT_DAMAGE = 2;
const FOOTPRINT_BOOST_MS = 3000;
const FOOTPRINT_BOOST_RADIUS = 26;
const FOOTPRINT_BOOST_DAMAGE = 4;

// Mastery — Shed Skin
/** The acidification milestones that each hand over one shed. */
export const SHED_MILESTONES = [0.2, 0.4, 0.6, 0.8];
const SHED_SPEED_BONUS = 0.15;
const SHED_DART_COUNT = 48;
const SHED_DART_DAMAGE = 1;
const SHED_DART_SPEED = 650;
const SHED_BARRAGE_MS = 600;
const SHED_POOL_RADIUS = 48;
const SHED_SPLATS = 6;
/** Bot: shed when the target is this close, so the barrage actually lands. */
const NPC_SHED_RANGE = 220;

/** Every timed debuff the tray knows — what toxin stretches and the bite restores. */
const DEBUFF_TIMERS: StatusDescriptor[] = STATUS_DESCRIPTORS
  .filter((d) => isDebuff(d) && d.kind === 'timer' && !!d.write);

// ── SlimeKit ──────────────────────────────────────────────────────────────

/**
 * Venom (element id `slime`) — the plague doctor.
 *
 * - **Toxin**: stacks on the victim (`Fighter.toxinStacks`, 0–100, never fading). Each makes every
 *   new negative effect on that body last 2% longer; the kit watches the debuff timers and
 *   stretches each one as it lands.
 * - **The floor** is a grid of acid cells per owner (`AcidGrid`). Inject shots trickle it, bombs
 *   flood it, melting bodies drip it. Coverage sizes the bomb and feeds the mastery.
 * - **Inject** (click) fires blobs from a three-shot syringe gun that is refilled by a self-stab.
 *   **Pick Your Poison** (E) loads the next shot with one of four poisons. **Acid Reflux** (R) is a
 *   held bomb thrown on recast, burst into clusters by shooting it. **Burrow** (F) dives under the
 *   acid and comes up biting. **Acid Apocalypse** (Q) rains on all of it.
 *
 * Every ability is owner-aware: the player, a bot and an online opponent all run the same code.
 * Online, the owner's sim decides; toxin and the poisons reach the victim through the status mirror.
 */
export class SlimeKit {
  private readonly pcol: AcidColorFn;
  private readonly ncol: AcidColorFn;
  private readonly pfx: AcidFx;
  private readonly nfx: AcidFx;
  private playerAvatar: AcidAvatar | null = null;
  private npcAvatar: AcidAvatar | null = null;
  private burrowAuras: Record<Owner, AcidAura | null> = { player: null, npc: null };
  private purgeAuras = new Map<Fighter, AcidAura>();
  /** The floors, one per owner, repainted only when their grid changes. */
  private floorGfx: Record<Owner, Phaser.GameObjects.Graphics | null> = { player: null, npc: null };
  /** Bubbles, footprints, arcs, the toad and the marks on poisoned bodies — every frame. */
  private overlayGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shots, bombs, bomblets, the held bomb and the poison wheel: over the fighters. */
  private shotGfx: Phaser.GameObjects.Graphics | null = null;
  private wheelText: Phaser.GameObjects.Text | null = null;
  /** The acidification gauge across the top of the screen. */
  private barGfx: Phaser.GameObjects.Graphics | null = null;
  private barText: Record<Owner, Phaser.GameObjects.Text | null> = { player: null, npc: null };
  private trailAccum = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private blobs: Blob[] = [];
  private bombs: Bomb[] = [];
  private bomblets: Bomblet[] = [];
  /** Toxin's bookkeeping: the last state of every debuff timer on every body. */
  private debuffSeen = new Map<Fighter, Map<string, DebuffSeen>>();
  /** Disintegrating: when each rotting body takes its next tick. */
  private rotNext = new Map<Fighter, number>();
  /** Melting: where each melting body last dripped. */
  private meltDrip = new Map<Fighter, { at: number; x: number; y: number }>();
  /** Paralyzing: bodies this kit is currently holding slow on acid. */
  private paraSlowed = new Set<Fighter>();
  private purgeStripAt = 0;
  /** The last `purgedUntil` each body was stripped for — a fresh Purge (local or mirrored) strips at once. */
  private purgeSeen = new WeakMap<Fighter, number>();
  private purgeHpStripped: WeakSet<Fighter> = new WeakSet();
  private murkToad: MurkToad | null = null;
  private electroArcs: ElectroArc[] = [];
  private electroNextAt = 0;
  private electroJolted = new Map<Fighter, number>();
  private drippingEnemies = new Map<Fighter, DrippingStatus>();
  private footprints: AcidFootprint[] = [];
  private coverageAccum = 0;
  private sessionBestCoverage = 0;
  private meltKillCounted: WeakSet<Fighter> = new WeakSet();

  constructor(private arena: SlimeArenaApi) {
    this.pcol = (base) => arena.acidColor('player', base);
    this.ncol = (base) => arena.acidColor('npc', base);
    this.pfx = new AcidFx(arena.scene, this.pcol);
    this.nfx = new AcidFx(arena.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────

  private get now(): number { return this.arena.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }
  private fx(owner: Owner): AcidFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): AcidColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private tones(owner: Owner): AcidTones { return owner === 'player' ? VILE_TONES : NPC_TONES; }
  private avatar(owner: Owner): AcidAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 18; }

  private isAcid(owner: Owner): boolean {
    return owner === 'player' ? this.arena.elementId === 'slime' : this.arena.npcElementId === 'slime';
  }

  /** An online opponent's body: drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean { return owner === 'npc' && this.arena.isOnline; }

  /** A bot opponent: this sim drives the decisions the player's keys would have made. */
  private isBot(owner: Owner): boolean { return owner === 'npc' && !this.arena.isOnline && !this.arena.isInvasion; }

  private up(owner: Owner, slot: string): boolean { return this.isAcid(owner) && this.arena.hasUpgrade(owner, slot); }

  private masteryOn(owner: Owner): boolean {
    return owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive;
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.arena.isInvasion) return [];
    const list = owner === 'player' ? this.arena.enemies : [this.arena.player];
    return list.filter((f) => this.alive(f) && this.arena.isTargetable(f));
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** Who poisoned this body — the side opposite it. Husks are always the player's victims. */
  private poisonerOf(f: Fighter): Owner { return f === this.arena.player ? 'npc' : 'player'; }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.arena.isOnline) this.arena.broadcast(id);
  }

  private grid(owner: Owner): AcidGrid {
    const s = this.side(owner);
    if (!s.grid) {
      const b = this.arena.bounds;
      s.grid = new AcidGrid(b.x, b.y, b.width, b.height);
    }
    return s.grid;
  }

  coverage(owner: Owner): number { return this.side(owner).grid?.coverage ?? 0; }

  private onAcid(owner: Owner, x: number, y: number): boolean {
    return this.side(owner).grid?.isAcid(x, y) ?? false;
  }

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  /** Lay acid. The single entry point, so coverage stats and the floor repaint see every cell. */
  private paint(owner: Owner, x: number, y: number, radius: number, state: CellState = CellState.Hot): void {
    const g = this.grid(owner);
    const added = g.paintCircle(x, y, radius, state);
    if (owner === 'player' && added > 0) {
      this.coverageAccum += added / g.total;
      if (this.coverageAccum >= 0.25) {
        this.arena.recordMasteryStat('acidCoverageTotal', this.coverageAccum);
        this.coverageAccum = 0;
      }
    }
  }

  private addSplat(owner: Owner, x: number, y: number, radius: number, ring = true, bud = false): void {
    this.paint(owner, x, y, radius);
    const s = this.side(owner);
    if (s.splats.length < MAX_SPLATS) s.splats.push({ x, y, radius, nextSpreadAt: this.now + SPREAD_CHECK_MS, bud });
    if (ring) {
      const fx = this.fx(owner);
      fx.ring(x, y, radius * 0.3, radius, ACID.hotRim, 340, 3, 4);
      fx.fizz(x, y, Math.max(2, Math.round(radius / 12)), radius * 0.7, 4, this.tones(owner));
    }
  }

  private noteAcidHit(owner: Owner, t: Fighter): void {
    if (owner !== 'player') return;
    if (t.hp <= 0 && !this.meltKillCounted.has(t)) {
      this.meltKillCounted.add(t);
      this.arena.recordMasteryStat('melts', 1);
    }
  }

  // ── Public accessors ────────────────────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.isAcid('npc') ? this.speedMult('npc') : 1; }

  private speedMult(owner: Owner): number {
    const s = this.side(owner);
    return (s.burrowed ? BURROW_SPEED_MULT : 1) * (1 + s.shedSpeed);
  }

  isBurrowed(owner: Owner = 'player'): boolean { return this.side(owner).burrowed; }

  // ── reset ────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.burrowed) {
        const f = this.fighter(owner);
        if (f?.active) { f.isInvincible = false; f.setAlpha(1); }
      }
      this.burrowAuras[owner]?.destroy();
      this.burrowAuras[owner] = null;
      this.floorGfx[owner]?.destroy();
      this.floorGfx[owner] = null;
      this.barText[owner]?.destroy();
      this.barText[owner] = null;
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const a of this.purgeAuras.values()) a.destroy();
    this.purgeAuras.clear();
    for (const g of [this.overlayGfx, this.shotGfx, this.barGfx]) g?.destroy();
    this.overlayGfx = this.shotGfx = this.barGfx = null;
    this.wheelText?.destroy();
    this.wheelText = null;
    this.trailAccum = 0;

    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const f of this.allFighters()) {
      f.toxinStacks = 0;
      f.venomRotUntil = 0;
      f.venomVulnStacks = 0;
      f.venomVulnUntil = 0;
      f.venomParalyzedUntil = 0;
      f.venomMeltingUntil = 0;
      f.venomMeltIncomingMult = 1;
    }
    for (const f of this.paraSlowed) if (f.active) f.walkSpeedMult = 1;
    this.paraSlowed.clear();
    this.blobs = [];
    this.bombs = [];
    this.bomblets = [];
    this.debuffSeen.clear();
    this.rotNext.clear();
    this.meltDrip.clear();
    this.purgeStripAt = 0;
    this.purgeSeen = new WeakMap();
    this.purgeHpStripped = new WeakSet();
    this.murkToad = null;
    for (const f of this.electroJolted.keys()) if (f.active) f.walkSpeedMult = 1;
    this.electroArcs = [];
    this.electroNextAt = 0;
    this.electroJolted = new Map();
    this.drippingEnemies = new Map();
    this.footprints = [];
    this.coverageAccum = 0;
    this.sessionBestCoverage = 0;
    this.meltKillCounted = new WeakSet();
  }

  // ── Ruin Mastery — Second Skin ──────────────────────────────────────

  /** Being under the acid is a form, not a buff — surfacing is the kit's own, safe undo. */
  revertForms(f: Fighter): string[] {
    const owner: Owner | null = f === this.arena.player ? 'player' : f === this.arena.npc ? 'npc' : null;
    if (!owner || !this.side(owner).burrowed) return [];
    this.surface(owner, false);
    return ['Burrow'];
  }

  // ── Projectile hooks (ArenaScene's hit pipeline) ──────────────────────

  /** A Shed Skin dart landed on `target`: one toxin. */
  onWhipHit(target: Fighter, _proj: Projectile): void {
    this.addToxin(target, 1);
  }

  /**
   * An Inject shot landed on `target` (the generic pipeline already dealt its damage): two toxin,
   * whatever poison it was carrying, and a puddle under them.
   */
  onInjectHit(target: Fighter, proj: Projectile): void {
    const owner: Owner = proj.isFromPlayer ? 'player' : 'npc';
    const poison = (proj as unknown as { venomPoison?: PoisonKind | null }).venomPoison ?? null;
    this.addToxin(target, INJECT_TOXIN);
    if (poison !== null) this.applyPoison(owner, target, poison);
    // The trickle runs all the way into the puddle, not just to where the shot last dripped.
    const blob = this.blobs.find((b) => b.proj === proj);
    if (blob) this.trickleTo(blob, target.x, target.y);
    this.addSplat(owner, target.x, target.y, HIT_PUDDLE_RADIUS);
    this.noteAcidHit(owner, target);
  }

  // ── Toxin and the poisons ─────────────────────────────────────────────

  /**
   * The one place toxin is laid. The local player in an online match is skipped: the attacker's
   * sim owns that count and it arrives through the `tox` mirror, so adding here would double it.
   */
  addToxin(f: Fighter, n: number): void {
    // Invincible frames (a burrow, a dodge) refuse toxin the same way they refuse the hit.
    if (n <= 0 || !this.alive(f) || f.netAuthoritativeDamage || f.isInvincible) return;
    // Memory's Rebirth: a sealed venom lays no toxin.
    if ((f === this.arena.player ? this.arena.npc : this.arena.player).passivesSealed()) return;
    f.toxinStacks = Math.min(TOXIN_MAX, f.toxinStacks + n);
  }

  /** Lay one of the four poisons on a body. Same ownership rule as toxin: the attacker's sim decides. */
  private applyPoison(owner: Owner, t: Fighter, kind: PoisonKind): void {
    if (!this.alive(t) || t.netAuthoritativeDamage || t.isInvincible) return;
    const now = this.now;
    if (kind === 0) {
      t.venomRotUntil = Math.max(t.venomRotUntil, now + ROT_MS + 80);
      if (!this.rotNext.has(t)) this.rotNext.set(t, now + ROT_TICK_MS);
    } else if (kind === 1) {
      t.venomParalyzedUntil = Math.max(t.venomParalyzedUntil, now + PARA_MS);
    } else if (kind === 2) {
      this.purge(owner, t, PURGE_MS);
    } else {
      t.venomMeltingUntil = Math.max(t.venomMeltingUntil, now + MELT_MS);
    }
    const p = POISONS[kind];
    this.fx(owner).ring(t.x, t.y, 8, 46, p.color, 380, 3.5, 8);
    this.fx(owner).ring(t.x, t.y, 4, 28, p.dark, 300, 5, 8);
  }

  /** Purged: every buff stripped now and kept off for `ms`, speed boosts held down, a husk's baked bonuses gone. */
  private purge(owner: Owner, target: Fighter, ms: number): void {
    target.purgedUntil = Math.max(target.purgedUntil, this.now + ms);
    this.purgeSeen.set(target, target.purgedUntil);
    stripBuffs(target);
    if (!this.purgeAuras.has(target)) {
      this.purgeAuras.set(target, new AcidAura(this.arena.scene, this.col(owner), 'purge', this.tones(owner), 28, 4));
    }
    const variant = (target as unknown as { variant?: HuskLikeVariant }).variant;
    if (!variant) return;
    if (variant.speedMult && variant.speedMult > 1) {
      target.purgeSpeedMult = Math.min(target.purgeSpeedMult, 1 / variant.speedMult);
    }
    if (variant.hpMult && variant.hpMult > 1 && !this.purgeHpStripped.has(target)) {
      this.purgeHpStripped.add(target);
      const baseMax = Math.max(1, Math.round(target.maxHp / variant.hpMult));
      target.reduceMaxHp(target.maxHp - baseMax);
    }
  }

  /**
   * Toxin at work. Statuses are written all over the codebase as bare expiry timestamps, so there
   * is no "debuff applied" hook: this diffs every debuff timer on every body against what it last
   * saw. A timer that jumped forward is a fresh application — its remaining time is stretched by
   * 2% per toxin stack on that body — and the length it was applied at is remembered, which is
   * what the Burrow bite restores. Only the sim that owns the body's state writes; the stretch
   * reaches an online victim through the timer mirror.
   */
  private trackDebuffs(time: number): void {
    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!f.active) { this.debuffSeen.delete(f); continue; }
      let seen = this.debuffSeen.get(f);
      if (!seen) { seen = new Map(); this.debuffSeen.set(f, seen); }
      const mult = f.netAuthoritativeDamage || f.hp <= 0
        ? 1 : 1 + Math.min(TOXIN_MAX, f.toxinStacks) * TOXIN_STRETCH_PER_STACK;
      for (const desc of DEBUFF_TIMERS) {
        let until = desc.read(f);
        const rec = seen.get(desc.id);
        if (rec && until <= rec.until) { rec.until = until; continue; }
        let left = remainingMs(until, wall, time);
        if (left <= 0) continue;
        const guarded = !!rec && time < rec.guardUntil;
        if (mult > 1 && !guarded) {
          until += left * (mult - 1);
          left *= mult;
          desc.write!(f, until);
        }
        seen.set(desc.id, {
          until,
          fullMs: guarded && rec ? Math.max(rec.fullMs, left) : left,
          guardUntil: guarded && rec ? rec.guardUntil : time + STRETCH_GUARD_MS,
        });
      }
    }
  }

  /** The bite: every negative effect still running on `t` goes back to the full length it was applied at. */
  private refreshDebuffs(t: Fighter): number {
    if (t.netAuthoritativeDamage) return 0;
    const time = this.now;
    const wall = Date.now();
    const seen = this.debuffSeen.get(t);
    let n = 0;
    for (const desc of DEBUFF_TIMERS) {
      const until = desc.read(t);
      const left = remainingMs(until, wall, time);
      const rec = seen?.get(desc.id);
      if (left <= 0 || !rec || rec.fullMs <= left) continue;
      const restored = until + (rec.fullMs - left);
      desc.write!(t, restored);
      rec.until = restored;
      n++;
    }
    return n;
  }

  /** The four poisons, ticking on whoever carries them. */
  private updateAfflictions(time: number): void {
    const wall = Date.now();
    const strip = time >= this.purgeStripAt;
    if (strip) this.purgeStripAt = time + PURGE_STRIP_MS;
    for (const f of this.allFighters()) {
      if (!f.active) continue;
      if (f.hp <= 0) { f.venomMeltIncomingMult = 1; continue; }
      const poisoner = this.poisonerOf(f);
      const onAcid = this.onAcid(poisoner, f.x, f.y);
      // Whether this sim owns what happens to this body (an online victim's is the attacker's).
      const mine = !f.netAuthoritativeDamage;

      // Disintegrating: 5 a second, and each tick is 3% more damage taken for 8s (max 15%).
      if (time < f.venomRotUntil) {
        let next = this.rotNext.get(f);
        if (next === undefined) { next = time + ROT_TICK_MS; this.rotNext.set(f, next); }
        if (time >= next) {
          this.rotNext.set(f, next + ROT_TICK_MS);
          if (mine) {
            f.takeDamage(ROT_DAMAGE, { source: this.rotNext });
            f.venomVulnStacks = Math.min(VULN_MAX_STACKS, f.venomVulnStacks + 1);
            f.venomVulnUntil = Math.max(f.venomVulnUntil, time + VULN_MS);
            this.noteAcidHit(poisoner, f);
          }
          this.fx(poisoner).droplets(f.x, f.y - 4, 5, {
            speed: 70, angle: Math.PI / 2, spread: 1.6, size: 2.6, life: 420, fall: 30, depth: 8, tones: STING_TONES,
          });
        }
      } else {
        this.rotNext.delete(f);
      }
      if (mine && f.venomVulnStacks > 0 && time >= f.venomVulnUntil) f.venomVulnStacks = 0;

      // Paralyzing: no dashes or dodges anywhere; slow and slippery on the acid.
      const paralyzed = time < f.venomParalyzedUntil;
      if (paralyzed) f.mobilityBlockedUntil = Math.max(f.mobilityBlockedUntil, time + 120);
      if (paralyzed && onAcid) {
        f.walkSpeedMult = Math.min(f.walkSpeedMult, PARA_SLOW_MULT);
        f.inkSlipUntil = Math.max(f.inkSlipUntil, wall + 220);
        this.paraSlowed.add(f);
      } else if (this.paraSlowed.delete(f)) {
        f.walkSpeedMult = 1;
      }

      // Purged: a fresh one — ours, or the opponent's arriving through the mirror — strips at
      // once, and nothing positive sticks for as long as it runs.
      const seenPurge = this.purgeSeen.get(f) ?? 0;
      if (f.purgedUntil > seenPurge) {
        this.purgeSeen.set(f, f.purgedUntil);
        if (f.purgedUntil > time) stripBuffs(f);
      } else if (strip && time < f.purgedUntil) {
        stripBuffs(f);
      }

      // Melting: double damage on the acid, and the body drips more of it wherever it goes.
      const melting = time < f.venomMeltingUntil;
      f.venomMeltIncomingMult = melting && onAcid ? 2 : 1;
      if (melting && this.isAcid(poisoner)) {
        let st = this.meltDrip.get(f);
        if (!st) { st = { at: time + MELT_DRIP_MS, x: f.x, y: f.y }; this.meltDrip.set(f, st); }
        if (time >= st.at) {
          st.at = time + MELT_DRIP_MS;
          this.paint(poisoner, st.x, st.y, MELT_DRIP_RADIUS);
          st.x = f.x;
          st.y = f.y;
        }
      } else {
        this.meltDrip.delete(f);
      }
    }
  }

  // ── Abilities (every one reachable from the player, a bot and an online replay) ──

  private reloading(owner: Owner): boolean { return this.now < this.side(owner).reloadUntil; }

  /** Click — Inject: one blob out of the syringe gun. The third empties it and starts the refill. */
  doInject(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.burrowed) return;
    // A replica already fired on its own machine; only a local trigger can be refused.
    if (!this.isReplica(owner) && this.reloading(owner)) return;
    if (s.ammo <= 0) s.ammo = MAG_SIZE;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.aimX = tx;
    s.aimY = ty;
    const mx = f.x + Math.cos(ang) * INJECT_MUZZLE, my = f.y + Math.sin(ang) * INJECT_MUZZLE;
    const poison = s.loadedShots > 0 ? s.loaded : null;
    if (s.loadedShots > 0 && --s.loadedShots === 0) s.loaded = null;

    const proj = new Projectile(this.arena.scene, mx, my, 'proj-venom-blob', INJECT_DAMAGE, owner === 'player');
    (proj as unknown as { venomPoison: PoisonKind | null }).venomPoison = poison;
    this.arena.projectiles.add(proj);
    proj.launch(Math.cos(ang) * INJECT_SPEED, Math.sin(ang) * INJECT_SPEED);
    proj.setRotation(ang);
    // The kit draws the blob itself, in the load's colour; the sprite is only the hitbox.
    proj.setAlpha(0.02);
    this.blobs.push({ owner, proj, poison, lastX: mx, lastY: my, seed: Math.random() * 6 });
    this.fx(owner).muzzleSpray(mx, my, ang, 1.15, 7, this.tones(owner));
    if (poison !== null) this.fx(owner).ring(mx, my, 3, 20, POISONS[poison].color, 220, 3, 8);

    s.ammo--;
    if (s.ammo <= 0) {
      s.reloadStart = this.now;
      s.reloadUntil = this.now + RELOAD_MS;
    }
  }

  /** Which vial the aim is leaning toward: up, right, down, left. */
  private wheelPick(f: Fighter, tx: number, ty: number): PoisonKind {
    const a = Math.atan2(ty - f.y, tx - f.x);
    return (((Math.round(a / (Math.PI / 2)) + 1) % 4) + 4) % 4 as PoisonKind;
  }

  /** E — Pick Your Poison: load the next Inject shot (two with E+) with the vial the aim points at. */
  doPoison(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    // A replica's pick is the owner's: it arrives as its own message, because the two sims never
    // agree exactly on where the caster stood when the aim was read.
    const relayed = this.isReplica(owner) && this.now - s.pickRelayAt < 1500 && s.loaded !== null;
    const kind = relayed ? s.loaded! : this.isBot(owner) ? this.botPoisonPick() : this.wheelPick(f, tx, ty);
    this.relay(owner, `acid-pick-${kind}`);
    s.wheelOpen = false;
    s.loaded = kind;
    s.loadedShots = this.up(owner, 'e') ? 2 : 1;
    const p = POISONS[kind];
    const vx = f.x + Math.cos(p.angle) * WHEEL_RADIUS, vy = f.y + Math.sin(p.angle) * WHEEL_RADIUS;
    const fx = this.fx(owner);
    // The vial is drawn off and run down into the gun.
    fx.ring(vx, vy, 20, 4, p.color, 260, 3, 9);
    fx.ring(f.x, f.y, 34, 10, p.color, 340, 4, 8);
    fx.fizz(vx, vy, 5, 14, 9, this.tones(owner));
    this.avatar(owner)?.play('clap');
  }

  /** The bot's pick: strip a shield if there is one, otherwise whichever poison is not already running. */
  private botPoisonPick(): PoisonKind {
    const t = this.arena.player;
    const time = this.now;
    if ((t.shieldHp > 0 || t.shieldCharges > 0) && time >= t.purgedUntil) return 2;
    const opts: PoisonKind[] = [];
    if (time >= t.venomRotUntil) opts.push(0);
    if (this.onAcid('npc', t.x, t.y) || this.coverage('npc') >= 0.1) {
      if (time >= t.venomMeltingUntil) opts.push(3);
      if (time >= t.venomParalyzedUntil) opts.push(1);
    }
    return opts.length === 0 ? 0 : opts[Math.floor(Math.random() * opts.length)];
  }

  private bombTier(coverage: number): number {
    let tier = 1;
    BOMB_TIERS.forEach((def, i) => { if (coverage >= def.minCoverage) tier = i + 1; });
    return tier;
  }

  private bombToxin(coverage: number): number {
    return Math.min(BOMB_TOXIN_MAX, BOMB_TOXIN_BASE + Math.round(coverage * BOMB_TOXIN_PER_COVERAGE));
  }

  /** R, first press — pull the bomb out. Nothing is spent until it is thrown. */
  private holdBomb(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.bombHeld || !this.alive(f)) return;
    s.bombHeld = true;
    s.bombHeldAt = this.now;
    this.relay(owner, 'acid-bomb-hold');
    this.avatar(owner)?.play('flex');
    this.fx(owner).gather(f.x, f.y, 40, 300, () => (f.active ? { x: f.x, y: f.y } : null), 5, this.tones(owner));
  }

  /** R, recast — Acid Reflux: throw the bomb. A bot (and a replica that never showed the pull) throws straight away. */
  doBomb(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    s.bombHeld = false;
    const coverage = this.coverage(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.bombs.push({
      owner, x: f.x + Math.cos(ang) * 28, y: f.y + Math.sin(ang) * 28,
      vx: Math.cos(ang) * BOMB_SPEED, vy: Math.sin(ang) * BOMB_SPEED,
      tier: this.bombTier(coverage), coverage, bornAt: this.now, clustered: false, spin: Math.random() * 6,
    });
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).muzzleSpray(f.x, f.y, ang, 1.4, 7, this.tones(owner));
  }

  private updateBombs(time: number, delta: number): void {
    const b = this.arena.bounds;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.x += bomb.vx * delta / 1000;
      bomb.y += bomb.vy * delta / 1000;
      bomb.spin += delta * 0.007;
      const r = BOMB_TIERS[bomb.tier - 1].size;

      // Shot out of the air by its owner's own Inject: it bursts into clusters and flies on.
      if (!bomb.clustered && !this.isReplica(bomb.owner)) {
        for (const blob of this.blobs) {
          if (blob.owner !== bomb.owner || !blob.proj.active) continue;
          if (Phaser.Math.Distance.Between(blob.proj.x, blob.proj.y, bomb.x, bomb.y) > CLUSTER_TRIGGER_R + r) continue;
          this.cluster(bomb, blob.poison);
          this.relay(bomb.owner, `acid-cluster-${blob.poison ?? 'n'}`);
          blob.proj.destroy();
          break;
        }
      }

      let burst = time - bomb.bornAt >= BOMB_MAX_MS
        || bomb.x < b.x + r || bomb.x > b.right - r || bomb.y < b.y + r || bomb.y > b.bottom - r;
      if (!burst) {
        for (const t of this.targetsOf(bomb.owner)) {
          if (Phaser.Math.Distance.Between(t.x, t.y, bomb.x, bomb.y) <= this.bodyR(t) + BOMB_HIT_R) { burst = true; break; }
        }
      }
      if (!burst) continue;
      this.bombs.splice(i, 1);
      this.explodeBomb(bomb, Phaser.Math.Clamp(bomb.x, b.x + r, b.right - r), Phaser.Math.Clamp(bomb.y, b.y + r, b.bottom - r));
    }
  }

  private explodeBomb(bomb: Bomb, x: number, y: number): void {
    const { owner, tier } = bomb;
    const def = BOMB_TIERS[tier - 1];
    const f = this.fighter(owner);
    const fx = this.fx(owner);
    const tones = tier >= 3 ? STING_TONES : this.tones(owner);
    this.addSplat(owner, x, y, def.radius, true, true);
    // Gouts thrown past the rim, so the crater has a ragged edge instead of a compass circle.
    const gouts = 4 + tier * 2;
    for (let i = 0; i < gouts; i++) {
      const a = (i / gouts) * Math.PI * 2 + Math.random() * 0.6;
      const d = def.radius * (0.85 + Math.random() * 0.3);
      this.paint(owner, x + Math.cos(a) * d, y + Math.sin(a) * d, 16 + tier * 3);
    }
    fx.splash(x, y, def.radius, { droplets: 14 + tier * 6, fizz: 6, duration: 520, depth: 6, tones });
    fx.ring(x, y, def.radius * 0.2, def.radius * 1.1, tier >= 3 ? ACID.sting : ACID.neon, 420, 5 + tier, 7);
    fx.flash(x, y, def.radius * 0.7, 7, tones);
    this.arena.scene.cameras.main.shake(160 + tier * 60, 0.003 + tier * 0.002);
    const toxin = this.bombToxin(bomb.coverage);
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > def.radius + this.bodyR(t)) continue;
      t.takeDamage(def.damage, { source: f, sourceX: x, sourceY: y });
      this.addToxin(t, toxin);
      this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(tier >= 3 ? ACID.sting : ACID.neon));
      this.noteAcidHit(owner, t);
    }
  }

  /** The bomb sheds five bomblets ahead of itself, each carrying the shot's poison if it had one. */
  private cluster(bomb: Bomb, poison: PoisonKind | null): void {
    bomb.clustered = true;
    const b = this.arena.bounds;
    const heading = Math.atan2(bomb.vy, bomb.vx);
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const a = heading + ((i / (CLUSTER_COUNT - 1)) - 0.5) * 2.6 + (Math.random() - 0.5) * 0.3;
      const d = 80 + Math.random() * 80;
      this.bomblets.push({
        owner: bomb.owner, x0: bomb.x, y0: bomb.y,
        x1: Phaser.Math.Clamp(bomb.x + Math.cos(a) * d, b.x + 20, b.right - 20),
        y1: Phaser.Math.Clamp(bomb.y + Math.sin(a) * d, b.y + 20, b.bottom - 20),
        bornAt: this.now + i * 30, poison, seed: Math.random() * 6,
      });
    }
    const fx = this.fx(bomb.owner);
    fx.splash(bomb.x, bomb.y, 46, { droplets: 14, fizz: 4, etch: false, depth: 9, tones: this.tones(bomb.owner) });
    fx.ring(bomb.x, bomb.y, 8, 54, poison !== null ? POISONS[poison].color : ACID.glow, 300, 4, 9);
    this.arena.scene.cameras.main.shake(120, 0.004);
  }

  private updateBomblets(time: number): void {
    for (let i = this.bomblets.length - 1; i >= 0; i--) {
      const c = this.bomblets[i];
      if (time - c.bornAt < CLUSTER_FLIGHT_MS) continue;
      this.bomblets.splice(i, 1);
      this.addSplat(c.owner, c.x1, c.y1, CLUSTER_RADIUS, true, true);
      this.fx(c.owner).splash(c.x1, c.y1, CLUSTER_RADIUS, { droplets: 8, fizz: 3, depth: 6, tones: this.tones(c.owner) });
      for (const t of this.targetsOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x1, c.y1, t.x, t.y) > CLUSTER_RADIUS + this.bodyR(t)) continue;
        t.takeDamage(CLUSTER_DAMAGE, { source: c, sourceX: c.x1, sourceY: c.y1 });
        this.addToxin(t, CLUSTER_TOXIN);
        if (c.poison !== null) this.applyPoison(c.owner, t, c.poison);
        this.arena.spawnHitFlash(t.x, t.y, this.col(c.owner)(ACID.neon));
        this.noteAcidHit(c.owner, t);
      }
    }
  }

  /** Live Inject shots dribble a line of acid behind them, laid a step back so it never leads the shot. */
  private updateBlobs(): void {
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const blob = this.blobs[i];
      const p = blob.proj;
      if (!p.active) { this.blobs.splice(i, 1); continue; }
      this.trickleTo(blob, p.x, p.y);
    }
  }

  /** Dab the shot's trickle from where it last dripped up to (x, y), one cell at a time. */
  private trickleTo(blob: Blob, x: number, y: number): void {
    const d = Phaser.Math.Distance.Between(x, y, blob.lastX, blob.lastY);
    if (d < TRICKLE_SPACING) return;
    const dabs = Math.floor(d / TRICKLE_SPACING);
    const ux = (x - blob.lastX) / d, uy = (y - blob.lastY) / d;
    for (let k = 0; k < dabs; k++) {
      this.paint(blob.owner, blob.lastX + ux * k * TRICKLE_SPACING, blob.lastY + uy * k * TRICKLE_SPACING, TRICKLE_RADIUS);
    }
    blob.lastX += ux * dabs * TRICKLE_SPACING;
    blob.lastY += uy * dabs * TRICKLE_SPACING;
  }

  /** F — Burrow: under the acid. Invincible and faster, and no attacking until it comes back up. */
  doBurrow(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.burrowed || !this.alive(f)) return;
    // The player is checked before the cooldown is spent; a replica was in acid on its own sim.
    if (owner === 'npc' && !this.isReplica('npc') && !this.onAcid('npc', f.x, f.y)) return;
    s.burrowed = true;
    s.burrowedAt = this.now;
    s.wheelOpen = false;
    f.isInvincible = true;
    f.setAlpha(0.4);
    if (owner === 'player' && this.arena.hasPerk('player', 'murk')) this.spawnMurkToad();
    this.avatar(owner)?.play('flex');
    this.fx(owner).gather(f.x, f.y, 46, 400, () => (f.active ? { x: f.x, y: f.y } : null), 5, this.tones(owner));
    this.fx(owner).ring(f.x, f.y, 46, 12, ACID.hotRim, 380, 3.5, 4);
  }

  /** How far the emerging bite reaches from this body's centre — the bot surfaces inside it. */
  biteReach(owner: Owner): number { return BITE_REACH + this.bodyR(this.fighter(owner)); }

  /**
   * Come up — by recast, or because the acid ran out. `bite` is false only when something else
   * dragged the venom out (Ruin's Second Skin): then it surfaces with its mouth shut.
   */
  private surface(owner: Owner, bite = true): void {
    const s = this.side(owner);
    if (!s.burrowed) return;
    s.burrowed = false;
    s.lastUnburrowAt = this.now;
    s.burrowLockUntil = this.now + BURROW_LOCK_MS;
    if (owner === 'player') this.despawnMurkToad();
    const f = this.fighter(owner);
    f.isInvincible = false;
    f.setAlpha(1);
    this.relay(owner, 'acid-surface');
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    fx.splash(f.x, f.y, 56, { droplets: 12, fizz: 4, etch: false, depth: 6, tones });
    if (!bite) return;

    // The bite: damage, every negative effect back to full length, toxin up by a quarter.
    const rattling = this.up(owner, 'f');
    const reach = this.biteReach(owner);
    let bitten = 0;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > reach + this.bodyR(t)) continue;
      const ang = Math.atan2(t.y - f.y, t.x - f.x);
      if (bitten === 0) {
        this.avatar(owner)?.play('slam', ang);
        fx.bite(f.x, f.y, ang, reach, rattling ? 3 : 2, 8, tones);
      }
      t.takeDamage(BITE_DAMAGE, { source: f, sourceX: f.x, sourceY: f.y });
      this.refreshDebuffs(t);
      this.addToxin(t, t.toxinStacks * ((rattling ? RATTLING_TOXIN_MULT : BITE_TOXIN_MULT) - 1));
      fx.punctures(t.x, t.y, ang, 9, tones);
      this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(ACID.neon));
      if (owner === 'player') this.arena.recordMasteryStat('burrowAttacks', 1);
      this.noteAcidHit(owner, t);
      bitten++;
    }
    if (bitten === 0) this.avatar(owner)?.play('flex');

    // Rattling Strike (F+): a red blast at the hole, and the caught drip acid for five seconds.
    if (!rattling) return;
    const x = f.x, y = f.y;
    fx.splash(x, y, RATTLING_RADIUS, { droplets: 18, fizz: 4, depth: 6, duration: 480, tones: STING_TONES });
    this.arena.scene.cameras.main.shake(180, 0.005);
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > RATTLING_RADIUS + this.bodyR(t)) continue;
      t.takeDamage(RATTLING_DAMAGE, { source: f, sourceX: x, sourceY: y });
      this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(ACID.sting));
      fx.splash(t.x, t.y, 34, { droplets: 6, fizz: 0, etch: false, depth: 8, tones: STING_TONES });
      this.drippingEnemies.set(t, { owner, until: this.now + RATTLING_DRIP_MS, nextDripAt: this.now });
      this.noteAcidHit(owner, t);
    }
  }

  doApocalypse(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.rainUntil = this.now + RAIN_DURATION_MS;
    s.rainTickAt = this.now + RAIN_TICK_MS;
    s.rainDropAccum = 0;
    const fx = this.fx(owner);
    this.avatar(owner)?.play('raise', -Math.PI / 2, 900);
    if (f?.active) fx.ring(f.x, f.y, 12, 160, ACID.neon, 620, 6, 5);
    for (const sp of s.splats) fx.ring(sp.x, sp.y, sp.radius * 0.4, sp.radius * 1.3, ACID.hotRim, 460, 3, 4);
    this.arena.scene.cameras.main.shake(320, 0.005);
  }

  // ── Mastery — Shed Skin ──────────────────────────────────────────────

  private shedSlot(owner: Owner): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.arena.masteryBindFor(s) : this.arena.npcMasteryBindFor(s);
      if (bind === 'shed-skin') return s;
    }
    return null;
  }

  private shedCharges(owner: Owner): number {
    const s = this.side(owner);
    return s.shedReached - s.shedUsed;
  }

  /** The bound slot's HUD bar: full while a shed is banked, otherwise progress to the next milestone. */
  getShedRatio(): number {
    if (this.shedCharges('player') > 0) return 1;
    const s = this.side('player');
    if (s.shedReached >= SHED_MILESTONES.length) return 0;
    const prev = s.shedReached === 0 ? 0 : SHED_MILESTONES[s.shedReached - 1];
    const next = SHED_MILESTONES[s.shedReached];
    return Phaser.Math.Clamp((this.coverage('player') - prev) / (next - prev), 0, 1);
  }

  private tryShed(owner: Owner): void {
    const f = this.fighter(owner);
    if (this.shedCharges(owner) <= 0) return;
    this.side(owner).shedUsed++;
    // triggerCooldown broadcasts the cast online; the peer replays through `doNpcShed`.
    if (owner === 'player') f.triggerCooldown('shed-skin');
    this.shed(owner);
  }

  /** Online replay: the remote venom shed. Their sim already checked the charge. */
  doNpcShed(): void { this.shed('npc'); }

  private shed(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    const { scene } = this.arena;
    s.shedSpeed += SHED_SPEED_BONUS;
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    this.avatar(owner)?.play('flex');
    fx.splash(f.x, f.y, 90, { droplets: 20, fizz: 6, duration: 560, depth: 6, tones });
    fx.ring(f.x, f.y, 20, 110, ACID.glow, 520, 5, 6);
    scene.cameras.main.shake(220, 0.005);

    for (let i = 0; i < SHED_DART_COUNT; i++) {
      scene.time.delayedCall(Math.floor((i * SHED_BARRAGE_MS) / SHED_DART_COUNT), () => {
        if (!this.alive(f)) return;
        // Spiralling out, so the barrage sweeps the whole ring instead of clumping.
        const ang = (i / SHED_DART_COUNT) * Math.PI * 6 + Math.random() * 0.2;
        const proj = new Projectile(scene, f.x + Math.cos(ang) * 24, f.y + Math.sin(ang) * 24, 'proj-acid-whip', SHED_DART_DAMAGE, owner === 'player');
        this.arena.projectiles.add(proj);
        proj.launch(Math.cos(ang) * SHED_DART_SPEED, Math.sin(ang) * SHED_DART_SPEED);
        proj.setRotation(ang);
      });
    }
    // The acid it came out of.
    this.paint(owner, f.x, f.y, SHED_POOL_RADIUS);
    for (let i = 0; i < SHED_SPLATS; i++) {
      const a = (i / SHED_SPLATS) * Math.PI * 2 + Math.random() * 0.5;
      const d = 40 + Math.random() * 40;
      this.addSplat(owner, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 22, false);
    }
  }

  // ── update ────────────────────────────────────────────────────────────

  /** Runs every frame, whichever side (if either) is Venom: both kits share the floor and the toxin. */
  update(time: number, delta: number): void {
    for (const owner of BOTH) {
      if (this.isAcid(owner) || this.side(owner).grid) this.updateSide(owner, time, delta);
    }
    this.updateBlobs();
    if (this.bombs.length > 0) this.updateBombs(time, delta);
    if (this.bomblets.length > 0) this.updateBomblets(time);
    this.updateAfflictions(time);
    this.trackDebuffs(time);
    this.updateElectrolysis(time);
    this.updateMurkToad(time);
    if (this.drippingEnemies.size > 0) this.updateDripping(time);
    if (this.footprints.length > 0) this.updateFootprints(time);

    const cov = this.coverage('player') * 100;
    if (this.isAcid('player') && cov > this.sessionBestCoverage) {
      this.sessionBestCoverage = cov;
      this.arena.recordMasteryBest('acidCoverageBestPct', cov);
    }
    this.updateVisuals(time, delta);
  }

  private updateSide(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const grid = this.grid(owner);

    // The syringe: the self-stab finishes and the barrel is full again.
    if (s.ammo <= 0 && time >= s.reloadUntil) {
      s.ammo = MAG_SIZE;
      if (this.alive(f)) this.fx(owner).ring(f.x, f.y, 26, 8, ACID.glow, 220, 3, 7);
    }
    if (!this.alive(f)) { s.bombHeld = false; s.wheelOpen = false; }

    // The floor: fresh cells nip and cool, standing burns and poisons.
    for (const t of this.targetsOf(owner)) {
      const cooled = grid.coolUnder(t.x, t.y, this.bodyR(t) * 0.8);
      if (cooled > 0) {
        const owed = (s.hotOwed.get(t) ?? 0) + cooled * HOT_DAMAGE_PER_CELL;
        const dmg = Math.floor(owed);
        s.hotOwed.set(t, owed - dmg);
        if (dmg > 0) {
          t.takeDamage(dmg, { source: grid, sourceX: t.x, sourceY: t.y });
          this.fx(owner).splash(t.x, t.y + 6, 26, { droplets: 4, fizz: 2, etch: false, depth: 8, tones: this.tones(owner) });
          this.noteAcidHit(owner, t);
        }
      }
      if (grid.isAcid(t.x, t.y)) {
        const at = s.standAt.get(t) ?? 0;
        if (time >= at) {
          s.standAt.set(t, time + STAND_TICK_MS);
          t.takeDamage(STAND_DAMAGE, { source: grid, sourceX: t.x, sourceY: t.y });
          this.addToxin(t, STAND_TOXIN);
          this.noteAcidHit(owner, t);
          this.fx(owner).droplets(t.x, t.y + 8, 3, {
            speed: 60, angle: -Math.PI / 2, spread: 1, size: 2.4, life: 380, depth: 5, tones: this.tones(owner),
          });
        }
      } else {
        s.standAt.delete(t);
      }
    }

    // Seeping Reflux (R+): every pool a bomb laid periodically buds a smaller one.
    if (this.up(owner, 'r')) {
      for (const sp of s.splats.slice()) {
        if (!sp.bud || time < sp.nextSpreadAt) continue;
        sp.nextSpreadAt = time + SPREAD_CHECK_MS;
        if (s.splats.length >= MAX_SPLATS || Math.random() >= SPREAD_CHANCE) continue;
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(SPREAD_OFFSET_MIN, SPREAD_OFFSET_MAX);
        this.addSplat(owner, sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d, Math.max(SPREAD_MIN_RADIUS, sp.radius * SPREAD_RADIUS_MULT), true, true);
      }
    }

    // Burrow: invincible while under, and the end of the acid is the end of the tunnel. A bot
    // comes up inside its own bite.
    if (s.burrowed) {
      if (!this.alive(f)) {
        s.burrowed = false;
      } else if (!this.isReplica(owner) && !grid.isAcid(f.x, f.y)) {
        this.surface(owner);
      } else {
        f.isInvincible = true;
        if (this.isBot(owner)) {
          const tgt = this.arena.player;
          if ((this.alive(tgt) && Phaser.Math.Distance.Between(f.x, f.y, tgt.x, tgt.y) < this.biteReach(owner) * 0.8)
              || time - s.burrowedAt > NPC_BURROW_MAX_MS) {
            this.surface(owner);
          }
        }
      }
    }

    // Acid Apocalypse: rain over all of this side's acid.
    if (time < s.rainUntil) {
      if (time >= s.rainTickAt) {
        s.rainTickAt += RAIN_TICK_MS;
        for (const t of this.targetsOf(owner)) {
          if (!grid.isAcid(t.x, t.y)) continue;
          t.takeDamage(RAIN_TICK_DAMAGE, { source: grid, sourceX: t.x, sourceY: t.y });
          this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(ACID.neon));
          this.fx(owner).splash(t.x, t.y, 30, { droplets: 5, fizz: 0, etch: false, depth: 8, tones: this.tones(owner) });
          this.noteAcidHit(owner, t);
        }
        // Acid Flood (Q+): the floor creeps outward for as long as it rains.
        if (this.up(owner, 'q')) grid.creep(FLOOD_CREEP_CHANCE);
      }
      s.rainDropAccum += delta;
      if (s.rainDropAccum >= RAIN_DROP_INTERVAL_MS) {
        s.rainDropAccum -= RAIN_DROP_INTERVAL_MS;
        for (let i = 0; i < 3; i++) {
          const p = grid.randomAcid();
          if (p) this.fx(owner).rainDrop(p.x + Phaser.Math.Between(-6, 6), p.y, 140, 6, this.tones(owner));
        }
      }
    }

    // Shed Skin milestones: each first crossing banks one shed.
    const cov = grid.coverage;
    let reached = 0;
    for (const m of SHED_MILESTONES) if (cov >= m) reached++;
    if (reached > s.shedReached) s.shedReached = reached;
    // A bot sheds itself, close enough that the barrage lands.
    if (this.isBot(owner) && this.shedSlot(owner) && this.shedCharges(owner) > 0 && this.alive(f) && !s.burrowed) {
      const tgt = this.arena.player;
      if (this.alive(tgt) && Phaser.Math.Distance.Between(f.x, f.y, tgt.x, tgt.y) < NPC_SHED_RANGE) this.tryShed(owner);
    }

    // Venom Mastery — Acid Walker: prints for 5s after stepping off acid.
    if (this.masteryOn(owner) && this.alive(f) && !this.isReplica(owner)) {
      const inAcid = grid.isAcid(f.x, f.y);
      if (s.wasInAcid && !inAcid) {
        s.footprintTrailUntil = time + FOOTPRINT_TRAIL_MS;
        s.lastPrintX = f.x;
        s.lastPrintY = f.y;
      }
      s.wasInAcid = inAcid;
      if (!inAcid && time < s.footprintTrailUntil
          && Phaser.Math.Distance.Between(f.x, f.y, s.lastPrintX, s.lastPrintY) >= FOOTPRINT_SPACING) {
        s.lastPrintX = f.x;
        s.lastPrintY = f.y;
        this.spawnFootprint(owner, f.x, f.y, time, time - s.lastUnburrowAt <= FOOTPRINT_BOOST_MS);
      }
    }
  }

  // ── Rattling drips, footprints ──────────────────────────────────────

  private updateDripping(time: number): void {
    for (const [t, st] of this.drippingEnemies) {
      if (!t.active || t.hp <= 0 || time >= st.until) { this.drippingEnemies.delete(t); continue; }
      if (time >= st.nextDripAt) {
        st.nextDripAt = time + RATTLING_DRIP_INTERVAL_MS;
        this.addSplat(st.owner, t.x, t.y, RATTLING_DRIP_RADIUS, false);
      }
    }
  }

  private spawnFootprint(owner: Owner, x: number, y: number, time: number, boosted: boolean): void {
    const radius = boosted ? FOOTPRINT_BOOST_RADIUS : FOOTPRINT_RADIUS;
    this.footprints.push({
      owner, x, y, radius, damage: boosted ? FOOTPRINT_BOOST_DAMAGE : FOOTPRINT_DAMAGE,
      expiresAt: time + FOOTPRINT_LIFETIME_MS, nextTickAt: time + FOOTPRINT_TICK_MS, boosted, seed: Math.random() * 6,
    });
    if (boosted) this.fx(owner).fizz(x, y, 3, radius, 4, this.tones(owner));
  }

  private updateFootprints(time: number): void {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      if (time >= fp.expiresAt) { this.footprints.splice(i, 1); continue; }
      if (time < fp.nextTickAt) continue;
      fp.nextTickAt = time + FOOTPRINT_TICK_MS;
      for (const t of this.targetsOf(fp.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, fp.x, fp.y) > fp.radius) continue;
        t.takeDamage(fp.damage, { source: fp, sourceX: fp.x, sourceY: fp.y });
        this.arena.spawnHitFlash(t.x, t.y, this.col(fp.owner)(ACID.neon));
        this.noteAcidHit(fp.owner, t);
      }
    }
  }

  // ── Electrolysis (perk, player) ───────────────────────────────────────

  /** The splats are the circuit: every beat a random pair close enough to conduct shorts across. */
  private updateElectrolysis(time: number): void {
    for (let i = this.electroArcs.length - 1; i >= 0; i--) {
      if (time - this.electroArcs[i].bornAt >= ELECTRO_ARC_MS) this.electroArcs.splice(i, 1);
    }
    // Jolts are re-applied every frame and written back on lapse — walkSpeedMult has no stacking discipline.
    for (const [f, until] of this.electroJolted) {
      if (!f.active || time >= until) {
        if (f.active) f.walkSpeedMult = 1;
        this.electroJolted.delete(f);
      } else {
        f.walkSpeedMult = Math.min(f.walkSpeedMult, ELECTRO_JOLT_SPEED_MULT);
      }
    }
    if (!this.isAcid('player') || !this.arena.hasPerk('player', 'electrolysis')) return;
    const splats = this.side('player').splats;
    if (splats.length < 2) { this.electroNextAt = time; return; }
    if (time < this.electroNextAt) return;
    this.electroNextAt = time + ELECTRO_INTERVAL_MS;
    const pair = this.pickConductingPair(null);
    if (!pair) return;
    const surge = Math.random() < ELECTRO_SURGE_CHANCE;
    this.fireElectroArc(pair[0], pair[1], time, surge);
    if (surge) {
      const onward = this.pickConductingPair(pair[1], pair[0]);
      if (onward) this.fireElectroArc(onward[0], onward[1], time, true);
    }
  }

  private pickConductingPair(from: Splat | null, avoid?: Splat): [Splat, Splat] | null {
    const splats = this.side('player').splats;
    const options: [Splat, Splat][] = [];
    for (const a of (from ? [from] : splats)) {
      for (const b of splats) {
        if (b === a || b === avoid) continue;
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (d > ELECTRO_MAX_SPAN || d < 1) continue;
        options.push([a, b]);
      }
    }
    return options.length === 0 ? null : options[Phaser.Math.Between(0, options.length - 1)];
  }

  private fireElectroArc(a: Splat, b: Splat, time: number, surge: boolean): void {
    this.electroArcs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, bornAt: time, surge, seed: Math.random() * Math.PI * 2 });
    const dmg = ELECTRO_DAMAGE * (surge ? ELECTRO_SURGE_MULT : 1);
    for (const t of this.targetsOf('player')) {
      if (distToSegment(t.x, t.y, a.x, a.y, b.x, b.y) > ELECTRO_LANE_HALF_W) continue;
      t.takeDamage(dmg, { source: a, sourceX: a.x, sourceY: a.y });
      this.electroJolted.set(t, time + ELECTRO_JOLT_MS);
      this.arena.spawnHitFlash(t.x, t.y, this.pcol(surge ? ACID.glow : ACID.caustic));
      this.noteAcidHit('player', t);
      this.pfx.fizz(t.x, t.y, surge ? 8 : 5, 26, 8, VILE_TONES);
    }
    this.pfx.fizz(a.x, a.y, surge ? 7 : 4, a.radius * 0.7, 5, VILE_TONES);
    this.pfx.fizz(b.x, b.y, surge ? 7 : 4, b.radius * 0.7, 5, VILE_TONES);
    if (surge) this.announce((a.x + b.x) / 2, (a.y + b.y) / 2 - 26, 'SURGE', ACID.glow, 11);
  }

  // ── Murk (divine perk, player) ────────────────────────────────────────

  private spawnMurkToad(): void {
    const p = this.arena.player;
    const time = this.now;
    this.murkToad = {
      x: p.x, y: p.y, fromX: p.x, fromY: p.y, toX: p.x, toY: p.y,
      hopStart: time, hopEnd: time, restUntil: time + TOAD_REST_MS, facing: 0,
    };
    this.pfx.fizz(p.x, p.y, 5, 24, 5, VILE_TONES);
  }

  private despawnMurkToad(): void {
    const toad = this.murkToad;
    if (!toad) return;
    this.murkToad = null;
    this.pfx.splash(toad.x, toad.y, 30, { droplets: 7, fizz: 3, etch: false, depth: 6, tones: VILE_TONES });
  }

  /** Rest, pick a spot, hop, dribble acid where it lands. It never chases — the acid is the threat. */
  private updateMurkToad(time: number): void {
    const toad = this.murkToad;
    if (!toad) return;
    const b = this.arena.bounds;
    const pad = 40;
    if (time < toad.hopEnd) {
      const p = (time - toad.hopStart) / Math.max(1, toad.hopEnd - toad.hopStart);
      toad.x = Phaser.Math.Linear(toad.fromX, toad.toX, p);
      toad.y = Phaser.Math.Linear(toad.fromY, toad.toY, p);
      return;
    }
    if (toad.restUntil < toad.hopEnd) {
      toad.x = toad.toX;
      toad.y = toad.toY;
      toad.restUntil = time + TOAD_REST_MS;
      this.addSplat('player', toad.x, toad.y, TOAD_PUDDLE_RADIUS, false);
      return;
    }
    if (time < toad.restUntil) return;
    const ang = Math.random() * Math.PI * 2;
    const dist = TOAD_HOP_DIST * (0.5 + Math.random() * 0.5);
    toad.fromX = toad.x;
    toad.fromY = toad.y;
    toad.toX = Phaser.Math.Clamp(toad.x + Math.cos(ang) * dist, b.x + pad, b.right - pad);
    toad.toY = Phaser.Math.Clamp(toad.y + Math.sin(ang) * dist, b.y + pad, b.bottom - pad);
    toad.facing = Math.atan2(toad.toY - toad.fromY, toad.toX - toad.fromX);
    toad.hopStart = time;
    toad.hopEnd = time + TOAD_HOP_MS;
  }

  /** A squat body that stretches into the hop and squashes on landing, bulging eyes, a pumping throat. */
  private drawMurkToad(g: Phaser.GameObjects.Graphics, time: number): void {
    const toad = this.murkToad;
    if (!toad) return;
    const hopping = time < toad.hopEnd;
    const p = hopping ? (time - toad.hopStart) / Math.max(1, toad.hopEnd - toad.hopStart) : 1;
    const lift = hopping ? Math.sin(p * Math.PI) * TOAD_HOP_HEIGHT : 0;
    const bx = toad.x, by = toad.y - lift;
    const stretch = hopping ? 1 + Math.sin(p * Math.PI) * 0.25 : 1;
    const throat = 1 + (hopping ? 0 : Math.sin(time / 260) * 0.12);
    const col = this.pcol;
    g.fillStyle(col(ACID.rot), 0.3 * (1 - lift / (TOAD_HOP_HEIGHT * 1.6)));
    g.fillEllipse(toad.x, toad.y + 5, 24, 8);
    g.lineStyle(3, col(ACID.bog), 0.9);
    for (const side of [-1, 1]) {
      const knee = hopping ? 0.9 : 0.3;
      g.beginPath();
      g.moveTo(bx + side * 6, by + 3);
      g.lineTo(bx + side * 13, by + 3 - knee * 6);
      g.lineTo(bx + side * 9, by + 8);
      g.strokePath();
      g.beginPath();
      g.moveTo(bx + side * 5, by + 1);
      g.lineTo(bx + side * 15, by - 2 + knee * 3);
      g.strokePath();
    }
    g.fillStyle(col(ACID.sludge), 0.95);
    g.fillEllipse(bx, by, 26 * stretch, 18 / stretch);
    g.fillStyle(col(ACID.neon), 0.5);
    g.fillEllipse(bx, by - 3, 18 * stretch, 9 / stretch);
    g.fillStyle(col(ACID.bog), 0.5);
    for (let i = 0; i < 4; i++) {
      const a = toad.facing + 1.2 + i * 0.9;
      g.fillCircle(bx + Math.cos(a) * 7, by + Math.sin(a) * 4 - 2, 1.6);
    }
    g.fillStyle(col(ACID.hotRim), 0.5);
    g.fillEllipse(bx, by + 6, 13 * throat, 6 * throat);
    for (const side of [-1, 1]) {
      const ex = bx + Math.cos(toad.facing) * 7 + Math.cos(toad.facing + Math.PI / 2) * side * 5;
      const ey = by + Math.sin(toad.facing) * 4 + Math.sin(toad.facing + Math.PI / 2) * side * 5 - 7;
      g.fillStyle(col(ACID.glow), 1);
      g.fillCircle(ex, ey, 3.4);
      g.fillStyle(0x120a02, 1);
      g.fillEllipse(ex + Math.cos(toad.facing) * 1.2, ey + Math.sin(toad.facing) * 1.2, 1.6, 3);
    }
  }

  // ── Visuals ───────────────────────────────────────────────────────────

  private updateVisuals(time: number, delta: number): void {
    const { scene } = this.arena;
    this.updateAvatars(delta);
    this.updateAuras(delta, time);
    this.updateProjectileTrails(delta);

    // The floors — only repainted when their grid moved.
    for (const owner of (['npc', 'player'] as const)) {
      const s = this.side(owner);
      if (!s.grid) continue;
      if (!this.floorGfx[owner]) {
        this.floorGfx[owner] = scene.add.graphics().setDepth(owner === 'player' ? 2.95 : 2.9);
        s.paintedVersion = -1;
      }
      if (s.paintedVersion !== s.grid.version) {
        s.paintedVersion = s.grid.version;
        drawAcidFloor(this.floorGfx[owner]!, this.col(owner), s.grid, this.tones(owner));
      }
      // A rotating handful of bubbles keeps the floor alive without repainting it.
      s.bubbleAccum += delta;
      if (s.bubbleAccum >= 70 && s.grid.count > 0) {
        s.bubbleAccum = 0;
        const p = s.grid.randomAcid();
        if (p) s.bubbles.push({ x: p.x + Phaser.Math.Between(-5, 5), y: p.y + Phaser.Math.Between(-5, 5), born: time, hot: s.grid.at(p.x, p.y) === CellState.Hot });
      }
      s.bubbles = s.bubbles.filter((b) => time - b.born < 900);
    }

    if (!this.overlayGfx) this.overlayGfx = scene.add.graphics().setDepth(3.1);
    const g = this.overlayGfx;
    const t = time / 1000;
    g.clear();
    for (const owner of BOTH) drawAcidBubbles(g, this.col(owner), this.side(owner).bubbles, time, this.tones(owner));
    for (const fp of this.footprints) {
      const a = Phaser.Math.Clamp((fp.expiresAt - time) / 600, 0, 1);
      AcidFx.drawPool(g, this.col(fp.owner), fp.x, fp.y, fp.radius, t, fp.seed, fp.boosted, a * 0.9);
    }
    for (const arc of this.electroArcs) {
      const life = Phaser.Math.Clamp(1 - (time - arc.bornAt) / ELECTRO_ARC_MS, 0, 1);
      AcidFx.drawElectroArc(g, this.pcol, arc.x1, arc.y1, arc.x2, arc.y2, t, arc.seed, arc.surge, life);
    }
    this.drawMurkToad(g, time);
    for (const f of this.allFighters()) {
      if (!f.active || f.hp <= 0 || f.forceInvisible || f.alpha < 0.05) continue;
      const by = this.poisonerOf(f);
      if (f.toxinStacks >= 1) drawToxinMark(g, this.col(by), f.x, f.y, f.toxinStacks, t, this.tones(by), f.alpha);
    }

    // Over the fighters: what is on them, what is in the air, what is in hand.
    if (!this.shotGfx) this.shotGfx = scene.add.graphics().setDepth(9);
    const sg = this.shotGfx;
    sg.clear();
    for (const f of this.allFighters()) {
      if (!f.active || f.hp <= 0 || f.forceInvisible || f.alpha < 0.05) continue;
      const rot = time < f.venomRotUntil ? 1 : 0;
      const vuln = f.venomVulnStacks > 0 && time < f.venomVulnUntil ? f.venomVulnStacks / VULN_MAX_STACKS : 0;
      const para = time < f.venomParalyzedUntil ? 1 : 0;
      const melt = time < f.venomMeltingUntil ? 1 : 0;
      if (rot || vuln || para || melt) drawAfflictions(sg, f.x, f.y, t, rot, vuln, para, melt);
    }
    for (const blob of this.blobs) {
      const p = blob.proj;
      if (!p.active) continue;
      const tones = this.tones(blob.owner);
      const col = this.col(blob.owner);
      const color = blob.poison !== null ? POISONS[blob.poison].color : col(tones.hot);
      const dark = blob.poison !== null ? POISONS[blob.poison].dark : col(tones.body);
      drawVenomBlob(sg, p.x, p.y, p.rotation, color, dark, t, blob.seed);
    }
    for (const bomb of this.bombs) {
      const tones = this.tones(bomb.owner);
      drawAcidBomb(sg, this.col(bomb.owner), bomb.x, bomb.y, BOMB_TIERS[bomb.tier - 1].size, bomb.tier, t, bomb.spin, tones);
    }
    for (const c of this.bomblets) {
      const p = Phaser.Math.Clamp((time - c.bornAt) / CLUSTER_FLIGHT_MS, 0, 1);
      if (time < c.bornAt) continue;
      const x = Phaser.Math.Linear(c.x0, c.x1, p);
      const y = Phaser.Math.Linear(c.y0, c.y1, p) - Math.sin(p * Math.PI) * 46;
      // Where it will land.
      sg.lineStyle(1.4, c.poison !== null ? POISONS[c.poison].color : this.col(c.owner)(ACID.hotRim), 0.25 + 0.5 * p);
      sg.strokeEllipse(c.x1, c.y1, CLUSTER_RADIUS * 2 * (0.4 + 0.6 * p), CLUSTER_RADIUS * 1.2 * (0.4 + 0.6 * p));
      drawAcidBomb(sg, this.col(c.owner), x, y, 6.5, 1, t, c.seed + p * 9, this.tones(c.owner));
      if (c.poison !== null) {
        sg.fillStyle(POISONS[c.poison].color, 0.9);
        sg.fillCircle(x, y, 2.6);
      }
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isAcid(owner) || !this.alive(f) || f.forceInvisible) continue;
      // The bomb in hand, hefted over the off shoulder and swelling as it is pulled out.
      if (s.bombHeld && !s.burrowed) {
        const facing = owner === 'player'
          ? Math.atan2(s.aimY - f.y, s.aimX - f.x) : Math.atan2(this.arena.player.y - f.y, this.arena.player.x - f.x);
        const grow = Phaser.Math.Clamp((time - s.bombHeldAt) / 220, 0, 1);
        const tier = this.bombTier(this.coverage(owner));
        const hx = f.x + Math.cos(facing - 2.1) * 30;
        const hy = f.y + Math.sin(facing - 2.1) * 30 - 6 + Math.sin(t * 5) * 2;
        drawAcidBomb(sg, this.col(owner), hx, hy, BOMB_TIERS[tier - 1].size * grow, tier, t, t * 1.2, this.tones(owner), f.alpha);
      }
    }
    this.drawWheel(sg, time, t);
    this.drawGauge(t);
  }

  /** Pick Your Poison, open: four vials round the player, and the name of the one the cursor leans to. */
  private drawWheel(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    const s = this.side('player');
    const f = this.arena.player;
    if (!s.wheelOpen || !this.isAcid('player') || !this.alive(f)) {
      this.wheelText?.setVisible(false);
      return;
    }
    const picked = this.wheelPick(f, s.aimX, s.aimY);
    drawPoisonWheel(g, f.x, f.y, WHEEL_RADIUS, picked, (time - s.wheelAt) / 140, t);
    if (!this.wheelText) {
      this.wheelText = this.arena.scene.add.text(0, 0, '', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#0a1406', strokeThickness: 4,
      }).setOrigin(0.5, 0.5).setDepth(9.1);
    }
    const p = POISONS[picked];
    this.wheelText.setVisible(true).setText(p.name)
      .setColor(`#${p.color.toString(16).padStart(6, '0')}`)
      .setPosition(f.x, f.y - WHEEL_RADIUS - 40);
  }

  /** The acidification gauge, top centre — the player's own, and the opponent's under it. */
  private drawGauge(t: number): void {
    const { scene } = this.arena;
    const showing = BOTH.filter((o) => this.isAcid(o));
    if (showing.length === 0) {
      this.barGfx?.clear();
      for (const o of BOTH) this.barText[o]?.setVisible(false);
      return;
    }
    if (!this.barGfx) this.barGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
    const g = this.barGfx;
    g.clear();
    const W = scene.scale.width;
    const bw = 220, bh = 8;
    // Just inside the arena's top wall, clear of the health bars above it.
    let y = 46;
    for (const owner of BOTH) {
      const txt = this.barText[owner];
      if (!this.isAcid(owner)) { txt?.setVisible(false); continue; }
      const s = this.side(owner);
      const cov = this.coverage(owner);
      const x = W / 2 - bw / 2;
      const shedding = !!this.shedSlot(owner);
      drawAcidBar(g, this.col(owner), x, y, bw, bh, cov, t, this.tones(owner), shedding ? SHED_MILESTONES : [], s.shedReached, BOMB_MARKS);
      if (!this.barText[owner]) {
        this.barText[owner] = scene.add.text(0, 0, '', {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#ccff88', stroke: '#0a1406', strokeThickness: 3,
        }).setOrigin(0, 0.5).setDepth(20).setScrollFactor(0);
      }
      const shed = shedding ? ` · SHED ${this.shedCharges(owner)}` : '';
      const load = s.loaded !== null ? ` · ${POISONS[s.loaded].name}${s.loadedShots > 1 ? ' ×2' : ''}` : '';
      const who = owner === 'player' ? 'ACID' : 'FOE ACID';
      this.barText[owner]!.setVisible(true).setPosition(x + bw + 10, y + bh / 2)
        .setColor(owner === 'player' ? '#ccff88' : '#eeff99')
        .setText(`${who} ${Math.floor(cov * 100)}%${shed}${load}`);
      y += 20;
    }
  }

  /** The masked rig for whichever fighters are Venom. The player faces the cursor; the npc its target. */
  private updateAvatars(delta: number): void {
    const { player, scene } = this.arena;
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!this.isAcid(owner) || !f?.active) {
        if (av) {
          av.destroy();
          if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        }
        continue;
      }
      if (!av) {
        av = new AcidAvatar(scene, this.col(owner), this.tones(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.side(owner);
      const facing = owner === 'player'
        ? Math.atan2((s.aimY || f.y) - f.y, (s.aimX || f.x + 1) - f.x)
        : Math.atan2(player.y - f.y, player.x - f.x);
      // The barrel: a third gone per shot, then drawn back full out of the venom's own body.
      const reloadP = this.now < s.reloadUntil ? Phaser.Math.Clamp((this.now - s.reloadStart) / RELOAD_MS, 0.01, 1) : 0;
      const fill = reloadP > 0 ? Phaser.Math.Clamp((reloadP - 0.4) / 0.6, 0, 1) : s.ammo / MAG_SIZE;
      av.setSyringe(fill, s.loaded !== null ? POISONS[s.loaded].color : null, reloadP);
      av.setFacing(facing);
      av.setIntensity(this.now < s.rainUntil ? 1.25 : 1 + s.shedSpeed);
      av.setMastered(this.masteryOn(owner));
      av.setHold(s.burrowed ? 'brace' : 'gun', facing);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    }
  }

  private updateAuras(delta: number, time: number): void {
    const { scene } = this.arena;
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const visible = f?.active && !f.forceInvisible;
      if (this.side(owner).burrowed && visible) {
        if (!this.burrowAuras[owner]) this.burrowAuras[owner] = new AcidAura(scene, this.col(owner), 'burrow', this.tones(owner), 30, 4);
        this.burrowAuras[owner]!.update(delta, f.x, f.y, 1);
      } else if (this.burrowAuras[owner]) {
        this.burrowAuras[owner]!.destroy();
        this.burrowAuras[owner] = null;
      }
    }
    for (const [victim, aura] of this.purgeAuras) {
      if (!victim.active || victim.hp <= 0 || time >= victim.purgedUntil) {
        aura.destroy();
        this.purgeAuras.delete(victim);
        continue;
      }
      aura.update(delta, victim.x, victim.y, victim.forceInvisible ? 0 : victim.alpha);
    }
  }

  /** Live Shed Skin darts shed droplets out of their back — what makes a bead of green read as travelling. */
  private updateProjectileTrails(delta: number): void {
    this.trailAccum += delta;
    if (this.trailAccum < TRAIL_INTERVAL_MS) return;
    this.trailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-acid-whip' || Math.random() > 0.3) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const back = Math.atan2(-body.velocity.y, -body.velocity.x);
      const owner: Owner = proj.isFromPlayer ? 'player' : 'npc';
      this.fx(owner).droplets(proj.x, proj.y, 1, {
        speed: 50, spread: 0.45, angle: back, size: 2.2, life: 320, fall: 22, depth: 5, tones: this.tones(owner),
      });
    }
  }

  // ── handleInput ───────────────────────────────────────────────────────

  handleInput(_time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (!this.isAcid('player')) return;
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const s = this.side('player');
    const now = this.now;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);
    const ready = (id: string): boolean => player.getCooldownRatio(id) >= 1;
    const shedSlot = this.shedSlot('player');

    // F: under, and back up. Entering needs acid underfoot, checked before the cooldown is spent.
    if (shedSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      if (s.burrowed) this.surface('player');
      else if (now >= s.burrowLockUntil && this.onAcid('player', player.x, player.y)) player.castAbility('venom-burrow', ctx);
    }
    // No attacking underground.
    if (s.burrowed) {
      s.wheelOpen = false;
      s.triggerHeld = false;
      return;
    }

    // Venom Mastery — Shed Skin takes over whichever slot it is bound to.
    if (shedSlot) {
      const key = shedSlot === 'e' ? eKey : shedSlot === 'r' ? rKey : shedSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryShed('player');
    }

    // Click: hold to keep firing. The burst has to start on a fresh press.
    if (pointer.isDown && !pointerWasDown) s.triggerHeld = true;
    if (!pointer.isDown) s.triggerHeld = false;
    if (s.triggerHeld && now >= s.reloadUntil && ready('venom-inject')) player.castAbility('venom-inject', ctx);

    // E: hold to open the wheel, release toward a vial. A tap picks whatever the cursor is nearest.
    if (shedSlot !== 'e') {
      if (Phaser.Input.Keyboard.JustDown(eKey) && ready('pick-your-poison')) {
        s.wheelOpen = true;
        s.wheelAt = now;
      }
      if (s.wheelOpen && !eKey.isDown) {
        s.wheelOpen = false;
        player.castAbility('pick-your-poison', ctx);
      }
    }

    // R: pull the bomb out, then throw it.
    if (shedSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      if (s.bombHeld) player.castAbility('acid-reflux', ctx);
      else if (ready('acid-reflux')) this.holdBomb('player');
    }

    if (shedSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('acid-apocalypse', ctx);
  }

  /** Online: the presses only the owner's sim decides. */
  replayNet(id: string): void {
    if (id === 'acid-surface') {
      this.surface('npc');
    } else if (id === 'acid-bomb-hold') {
      const s = this.side('npc');
      s.bombHeld = true;
      s.bombHeldAt = this.now;
    } else if (id.startsWith('acid-pick-')) {
      const k = Number(id.slice('acid-pick-'.length));
      if (!Number.isInteger(k) || k < 0 || k > 3) return;
      const s = this.side('npc');
      s.loaded = k as PoisonKind;
      s.loadedShots = this.up('npc', 'e') ? 2 : 1;
      s.pickRelayAt = this.now;
    } else if (id.startsWith('acid-cluster-')) {
      const bomb = this.bombs.find((b) => b.owner === 'npc' && !b.clustered);
      const k = Number(id.slice('acid-cluster-'.length));
      if (bomb) this.cluster(bomb, Number.isInteger(k) && k >= 0 && k <= 3 ? k as PoisonKind : null);
    }
  }

  // ── Bot reads (side-effect-free) ──────────────────────────────────────

  npcBurrowed(): boolean { return this.isAcid('npc') && this.side('npc').burrowed; }

  /** Which slot the bot's Shed Skin took over, so the rotation leaves that key alone. */
  npcShedSlot(): string | undefined { return this.shedSlot('npc') ?? undefined; }

  /** The syringe has a shot in it — a click during the self-stab would be a wasted cooldown. */
  npcInjectReady(): boolean { return this.isAcid('npc') && !this.reloading('npc'); }

  /**
   * Synergy — bomb + Inject: the bot's own bomb is in the air and unburst. Where to shoot to hit
   * it, led by the shot's flight time.
   */
  npcBombShotAim(): { x: number; y: number } | null {
    if (!this.isAcid('npc') || this.reloading('npc')) return null;
    const npc = this.arena.npc;
    const bomb = this.bombs.find((b) => b.owner === 'npc' && !b.clustered);
    if (!bomb || !this.alive(npc)) return null;
    const lead = Phaser.Math.Distance.Between(npc.x, npc.y, bomb.x, bomb.y) / (INJECT_SPEED - BOMB_SPEED * 0.6);
    return { x: bomb.x + bomb.vx * lead, y: bomb.y + bomb.vy * lead };
  }

  /** Nothing is loaded: Pick Your Poison is worth the press. */
  npcPoisonWorth(): boolean {
    return this.isAcid('npc') && this.side('npc').loaded === null && this.alive(this.arena.player);
  }

  /** No bomb of the bot's is already flying. */
  npcBombWorth(): boolean {
    return this.isAcid('npc') && !this.bombs.some((b) => b.owner === 'npc');
  }

  /**
   * Synergy — Burrow's bite restores debuffs and multiplies toxin: worth diving when the bot is on
   * its own acid, the target is a short tunnel away, and there is something on them to restore
   * (a running poison, or toxin worth a quarter more) — or the bot is hurt and wants out.
   */
  npcBurrowReady(): boolean {
    const s = this.side('npc');
    if (!this.isAcid('npc') || s.burrowed || this.now < s.burrowLockUntil) return false;
    const npc = this.arena.npc;
    const tgt = this.arena.player;
    if (!this.alive(npc) || !this.alive(tgt) || !this.onAcid('npc', npc.x, npc.y)) return false;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, tgt.x, tgt.y);
    const time = this.now;
    const poisoned = time < tgt.venomRotUntil || time < tgt.venomParalyzedUntil || time < tgt.venomMeltingUntil
      || time < tgt.purgedUntil || tgt.toxinStacks >= 12;
    const hurt = npc.hp / Math.max(1, npc.maxHp) < 0.35;
    return (poisoned && d > this.biteReach('npc') * 0.8 && d < 380) || (hurt && d < 260);
  }

  /** Burrowing is wanted but there is no acid underfoot: the nearest of its own, if it is close. */
  npcAcidSeekPoint(): { x: number; y: number } | null {
    const s = this.side('npc');
    if (!this.isAcid('npc') || s.burrowed || this.now < s.burrowLockUntil) return null;
    const npc = this.arena.npc;
    const tgt = this.arena.player;
    if (!this.alive(npc) || !this.alive(tgt) || this.onAcid('npc', npc.x, npc.y)) return null;
    if (npc.getCooldownRatio('venom-burrow') < 1 || this.npcShedSlot() === 'f') return null;
    if (npc.hp / Math.max(1, npc.maxHp) >= 0.35 && tgt.toxinStacks < 12) return null;
    return s.grid?.nearestAcid(npc.x, npc.y, 160) ?? null;
  }

  /** The target is standing on the bot's acid — the rain lands on them. */
  npcApocalypseReady(): boolean {
    if (!this.isAcid('npc')) return false;
    const tgt = this.arena.player;
    return this.alive(tgt) && this.onAcid('npc', tgt.x, tgt.y) && this.coverage('npc') >= 0.06;
  }
}
