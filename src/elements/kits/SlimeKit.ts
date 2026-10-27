import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { stripBuffs } from '../../combat/StatusEffects';
import { AcidGrid, CellState } from './AcidGrid';
import {
  ACID, AcidAura, AcidAvatar, AcidColorFn, AcidFx, AcidTones, NPC_TONES, STING_TONES, TOXIN_TIERS, TailKnot,
  VILE_TONES, drawAcidBar, drawAcidBubbles, drawAcidFloor, drawToxinMark, drawVenomTail,
} from './AcidVisuals';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

/** Distance from a point to a line segment — the tail and the electrolysis lane are capsules. */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return Phaser.Math.Distance.Between(px, py, x1, y1);
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Phaser.Math.Distance.Between(px, py, x1 + dx * t, y1 + dy * t);
}

// ── Interfaces ────────────────────────────────────────────────────────────

/**
 * One Vile Spray splash (or a bud off one). The acid itself lives in the grid; a splat is only
 * remembered so Spray Spread has something to bud from and Electrolysis has terminals to arc
 * between.
 */
interface Splat {
  x: number;
  y: number;
  radius: number;
  nextSpreadAt: number;
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

/** Rattling Strike (R+): a target dripping acid for a few seconds after a surfacing blast. */
interface DrippingStatus {
  owner: Owner;
  until: number;
  nextDripAt: number;
}

/** Meltdown (F+): a generic buff Fighter field that can be snapshotted off a melting target. */
interface BuffFieldDef {
  key: 'walkSpeedMult' | 'outgoingDamageMult' | 'critChance' | 'dodgeChance' | 'cooldownMult' | 'regenPerSecond';
  neutral: number;
  better: 'higher' | 'lower';
  label(v: number): string;
}

const MELT_BUFF_FIELDS: BuffFieldDef[] = [
  { key: 'walkSpeedMult', neutral: 1, better: 'higher', label: (v) => `+${Math.round((v - 1) * 100)}% Speed` },
  { key: 'outgoingDamageMult', neutral: 1, better: 'higher', label: (v) => `+${Math.round((v - 1) * 100)}% Damage` },
  { key: 'critChance', neutral: 0, better: 'higher', label: (v) => `+${Math.round(v * 100)}% Crit` },
  { key: 'dodgeChance', neutral: 0, better: 'higher', label: (v) => `+${Math.round(v * 100)}% Dodge` },
  { key: 'cooldownMult', neutral: 1, better: 'lower', label: (v) => `-${Math.round((1 - v) * 100)}% Cooldown` },
  { key: 'regenPerSecond', neutral: 0, better: 'higher', label: (v) => `+${v.toFixed(1)}/s Regen` },
];

interface BuffSnapshotEntry {
  key: BuffFieldDef['key'];
  value: number;
  label: string;
}

interface MeltStatus {
  owner: Owner;
  until: number;
  nextDripAt: number;
  buffs: BuffSnapshotEntry[];
  /** The melting target's element colour — melt puddles are dyed to match. */
  color: number;
}

interface MeltPuddle {
  x: number;
  y: number;
  radius: number;
  buffs: BuffSnapshotEntry[];
  color: number;
  seed: number;
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

/** Shed Skin: the sloughed skin left lying where the serpent was, fading out. */
interface ShedHusk {
  owner: Owner;
  knots: TailKnot[];
  width: number;
  bornAt: number;
}

interface Bubble { x: number; y: number; born: number; hot: boolean }

/** Per-body toxin bookkeeping. Stacks live on the Fighter; the clocks for them live here. */
interface ToxinState {
  dotAt: number;
  tierSeen: number;
  maxHpCut: number;
  dripX: number;
  dripY: number;
  killAt: number;
}

interface Side {
  grid: AcidGrid | null;
  /** The grid version the floor Graphics last painted, so it only repaints on a change. */
  paintedVersion: number;
  splats: Splat[];
  burrowed: boolean;
  burrowedAt: number;
  rainUntil: number;
  rainTickAt: number;
  rainDropAccum: number;
  aimX: number;
  aimY: number;
  /** The tail, sampled from where the serpent has been. */
  tail: TailKnot[];
  lastSampleX: number;
  lastSampleY: number;
  /** Shed Skin: the tail's remaining length and the speed bonus banked this match. */
  tailMult: number;
  shedSpeed: number;
  /** How many of the four coverage milestones this side has reached, and how many it has spent. */
  shedReached: number;
  shedUsed: number;
  /** When each body standing on this side's acid next takes its 1 damage + 3 toxin. */
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
    grid: null, paintedVersion: -1, splats: [], burrowed: false, burrowedAt: 0,
    rainUntil: 0, rainTickAt: 0, rainDropAccum: 0, aimX: 0, aimY: 0,
    tail: [], lastSampleX: 0, lastSampleY: 0, tailMult: 1, shedSpeed: 0, shedReached: 0, shedUsed: 0,
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
  /** Hand-drawn kit projectiles — the tail has to catch these too. */
  readonly projectileRegistry: ProjectileRegistry;
  readonly elementId: string;
  readonly npcElementId: string;
  /** The arena's walls — the acid grid covers exactly this. */
  readonly bounds: Phaser.Geom.Rectangle;
  readonly isOnline: boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  readonly isInvasion: boolean;
  /** The player's Space dodge is in progress — the tail drops out of the hitbox for it. */
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

// Passive — Serpentine: the tail.
const TAIL_SEGMENTS = 14;
const TAIL_SPACING = 13;
const TAIL_WIDTH = 15;
const TAIL_HIT_R = 9;
/** A shot this close to the body is the body's business (ArenaScene's overlap), not the tail's. */
const TAIL_BODY_SKIP = 24;
/** Bot / replica dodge read: a body moving this fast is mid-dash. */
const DASH_SPEED_READ = 900;

// Click — Poison Whip
const WHIP_COUNT_BASE = 15;
const WHIP_COUNT_ENHANCED = 20;
const WHIP_DAMAGE = 1;
const WHIP_SPEED = 650;
const WHIP_STAGGER_MS = 25;
const WHIP_SPREAD_DEG = 5;
/** At this much coverage every lash lands two toxin instead of one. */
const WHIP_DOUBLE_AT = 0.5;

// E — Vile Spray and the floor
const SPLAT_RADIUS = 58;
const SPLAT_DISTANCES = [110, 180, 250];
/** Fresh acid: damage per hot cell a body walks over. A body crossing a full splash takes ~4. */
const HOT_DAMAGE_PER_CELL = 0.3;
/** Standing on acid: this much damage and toxin, once a second. */
const STAND_TICK_MS = 1000;
const STAND_DAMAGE = 1;
const STAND_TOXIN = 3;
const MAX_SPLATS = 60;

/** Gap between droplet puffs shed out of the back of a live acid shot. */
const TRAIL_INTERVAL_MS = 45;

const BURROW_SPEED_MULT = 1.25;
/** Bot: surface when this close to the target (R+), or this long after going under. */
const NPC_SURFACE_RANGE = 80;
const NPC_SURFACE_RANGE_PLAIN = 120;
const NPC_BURROW_MAX_MS = 3500;

// F — Festering Bite
const BITE_STAGES = [
  { maxCoverage: 0.24, damage: 15, purgeMs: 3000, reach: 70 },
  { maxCoverage: 0.50, damage: 30, purgeMs: 8000, reach: 85 },
  { maxCoverage: Infinity, damage: 45, purgeMs: 15000, reach: 100 },
];
const BITE_HALF_ANGLE = Phaser.Math.DegToRad(55);
const BITE_TOXIN = 12;
/** Meltdown (F+) needs a stage-3 bite. */
const BITE_MELT_STAGE = 3;

// Q — Acid Apocalypse
const RAIN_DURATION_MS = 8000;
const RAIN_TICK_MS = 500;
const RAIN_TICK_DAMAGE = 6;
const RAIN_DROP_INTERVAL_MS = 150;

// Spray Spread (E+)
const SPREAD_CHECK_MS = 2000;
const SPREAD_CHANCE = 0.2;
const SPREAD_RADIUS_MULT = 0.55;
const SPREAD_MIN_RADIUS = 18;
const SPREAD_OFFSET_MIN = 20;
const SPREAD_OFFSET_MAX = 50;

// Rattling Strike (R+)
const RATTLING_RADIUS = 90;
const RATTLING_DAMAGE = 20;
const RATTLING_DRIP_MS = 5000;
const RATTLING_DRIP_INTERVAL_MS = 1000;
const RATTLING_DRIP_RADIUS = 22;
/** R+: every toxin stack on a body caught by the surfacing is multiplied by this. */
const RATTLING_TOXIN_MULT = 1.5;

// Meltdown (F+)
const MELT_DURATION_MS = 3000;
const MELT_TICK_MS = 1000;
const MELT_HP_LOSS_PCT = 0.1;
const MELT_SIZE_LOSS_PCT = 0.1;
const MELT_MIN_SIZE_MULT = 0.3;
const MELT_PUDDLE_RADIUS = 24;
const MELT_BUFF_GRANT_MS = 8000;

// Acid Flood (Q+): each rain beat, every clean cell touching acid has this chance to fill.
const FLOOD_CREEP_CHANCE = 0.15;

// Toxin tiers.
const TOXIN_DOT_MS = 1000;
const TOXIN_DRIP_SPACING = 30;
const TOXIN_DRIP_RADIUS = 12;
const TOXIN_KILL_RETRY_MS = 600;

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
const SHED_TAIL_MULT = 0.67;
const SHED_SPEED_BONUS = 0.15;
const SHED_LASH_COUNT = 48;
const SHED_BARRAGE_MS = 600;
const SHED_POOL_RADIUS = 48;
const SHED_SPLATS = 6;
const SHED_HUSK_MS = 3000;
/** Bot: shed when the target is this close, so the barrage actually lands. */
const NPC_SHED_RANGE = 220;

// ── SlimeKit ──────────────────────────────────────────────────────────────

/**
 * Venom (element id `slime`) — the serpent.
 *
 * - **Serpentine** (passive): a long tail sampled from the serpent's path is part of its hitbox.
 *   It vanishes while dodging, and the dodge itself goes three times as far (ArenaScene/NpcOpponent).
 * - **Toxin**: stacks on the victim (`Fighter.toxinStacks`) that never fade. Tiers at 25/50/100/
 *   250/500/1000 — burn, acid drips, weakness, max HP, more of each, death — all run here.
 * - **The floor** is a grid of acid cells per owner (`AcidGrid`). Fresh cells nip the first body
 *   over them and cool; standing on acid burns 1 and lands 3 toxin a second. Coverage — acid cells
 *   over all cells — drives the whip's double toxin, the bite's stage and Shed Skin's charges.
 * - **Festering Bite** purges (strips every buff), bites and poisons, scaled by coverage.
 *
 * Every ability is owner-aware: the player, a bot and an online opponent all run the same code.
 * Online, the owner's sim decides; toxin reaches the victim through the `tox` status mirror.
 */
export class SlimeKit {
  private readonly pcol: AcidColorFn;
  private readonly ncol: AcidColorFn;
  private readonly pfx: AcidFx;
  private readonly nfx: AcidFx;
  private playerAvatar: AcidAvatar | null = null;
  private npcAvatar: AcidAvatar | null = null;
  private burrowAuras: Record<Owner, AcidAura | null> = { player: null, npc: null };
  private meltAuras = new Map<Fighter, AcidAura>();
  private purgeAuras = new Map<Fighter, AcidAura>();
  /** The floors, one per owner, repainted only when their grid changes. */
  private floorGfx: Record<Owner, Phaser.GameObjects.Graphics | null> = { player: null, npc: null };
  /** Bubbles, footprints, melt puddles, arcs, the toad and toxin marks — every frame. */
  private overlayGfx: Phaser.GameObjects.Graphics | null = null;
  /** Tails and shed skins: under the fighters, over the floor. */
  private tailGfx: Phaser.GameObjects.Graphics | null = null;
  /** The acidification gauge across the top of the screen. */
  private barGfx: Phaser.GameObjects.Graphics | null = null;
  private barText: Record<Owner, Phaser.GameObjects.Text | null> = { player: null, npc: null };
  private trailAccum = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private toxins = new Map<Fighter, ToxinState>();
  /** The last `purgedUntil` each body was stripped for — a fresh Purge (local or mirrored) strips again. */
  private purgeSeen = new WeakMap<Fighter, number>();
  private purgeHpStripped: WeakSet<Fighter> = new WeakSet();
  private murkToad: MurkToad | null = null;
  private electroArcs: ElectroArc[] = [];
  private electroNextAt = 0;
  private electroJolted = new Map<Fighter, number>();
  private drippingEnemies = new Map<Fighter, DrippingStatus>();
  private meltStatuses = new Map<Fighter, MeltStatus>();
  private meltPuddles: MeltPuddle[] = [];
  private activeMeltBuffs: { key: BuffFieldDef['key']; revertValue: number }[] = [];
  private meltBuffExpireAt = 0;
  private footprints: AcidFootprint[] = [];
  private shedHusks: ShedHusk[] = [];
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
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
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

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  /** `showFloatingText` is a no-op in this codebase, so the labels that matter are the kit's own. */
  private announce(x: number, y: number, text: string, color: number, size = 12): void {
    const { scene } = this.arena;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: this.hex(color),
      stroke: '#0a1406', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
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

  private addSplat(owner: Owner, x: number, y: number, radius: number, ring = true): void {
    this.paint(owner, x, y, radius);
    const s = this.side(owner);
    if (s.splats.length < MAX_SPLATS) s.splats.push({ x, y, radius, nextSpreadAt: this.now + SPREAD_CHECK_MS });
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
    for (const a of this.meltAuras.values()) a.destroy();
    this.meltAuras.clear();
    for (const a of this.purgeAuras.values()) a.destroy();
    this.purgeAuras.clear();
    for (const g of [this.overlayGfx, this.tailGfx, this.barGfx]) g?.destroy();
    this.overlayGfx = this.tailGfx = this.barGfx = null;
    this.trailAccum = 0;

    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const f of this.allFighters()) {
      f.toxinStacks = 0;
      f.toxinIncomingMult = 1;
    }
    this.toxins.clear();
    this.purgeSeen = new WeakMap();
    this.purgeHpStripped = new WeakSet();
    this.murkToad = null;
    for (const f of this.electroJolted.keys()) if (f.active) f.walkSpeedMult = 1;
    this.electroArcs = [];
    this.electroNextAt = 0;
    this.electroJolted = new Map();
    this.drippingEnemies = new Map();
    this.meltStatuses = new Map();
    this.meltPuddles = [];
    this.activeMeltBuffs = [];
    this.meltBuffExpireAt = 0;
    this.footprints = [];
    this.shedHusks = [];
    this.coverageAccum = 0;
    this.sessionBestCoverage = 0;
    this.meltKillCounted = new WeakSet();
  }

  // ── Ruin Mastery — Second Skin ──────────────────────────────────────

  /** Being under the acid is a form, not a buff — surfacing is the kit's own, safe undo. */
  revertForms(f: Fighter): string[] {
    const owner: Owner | null = f === this.arena.player ? 'player' : f === this.arena.npc ? 'npc' : null;
    if (!owner || !this.side(owner).burrowed) return [];
    this.surface(owner, 'DRAGGED UP');
    return ['Burrow'];
  }

  // ── Projectile hooks (ArenaScene's hit pipeline) ──────────────────────

  /** A Poison Whip lash landed on `target`: one toxin, or two at half coverage. */
  onWhipHit(target: Fighter, proj: Projectile): void {
    const n = (proj as unknown as { venomToxin?: number }).venomToxin ?? 1;
    this.addToxin(target, n);
  }

  // ── Toxin ─────────────────────────────────────────────────────────────

  private toxinState(f: Fighter): ToxinState {
    let st = this.toxins.get(f);
    if (!st) {
      st = { dotAt: this.now + TOXIN_DOT_MS, tierSeen: 0, maxHpCut: 0, dripX: f.x, dripY: f.y, killAt: 0 };
      this.toxins.set(f, st);
    }
    return st;
  }

  /**
   * The one place toxin is laid. The local player in an online match is skipped: the attacker's
   * sim owns that count and it arrives through the `tox` mirror, so adding here would double it.
   */
  addToxin(f: Fighter, n: number): void {
    // Invincible frames (a burrow, a dodge) refuse toxin the same way they refuse the hit.
    if (n <= 0 || !this.alive(f) || f.netAuthoritativeDamage || f.isInvincible) return;
    // Memory's Rebirth: a sealed venom lays no toxin.
    if ((f === this.arena.player ? this.arena.npc : this.arena.player).passivesSealed()) return;
    f.toxinStacks += n;
    this.toxinState(f);
  }

  private static tierOf(stacks: number): number {
    let tier = 0;
    for (const th of TOXIN_TIERS) if (stacks >= th) tier++;
    return tier;
  }

  private static dps(stacks: number): number {
    return stacks >= 500 ? 8 : stacks >= 100 ? 5 : stacks >= 25 ? 3 : 0;
  }

  /** What toxin leaves of a body's outgoing damage: 20% off at 100, another 20% at 500. */
  private static weakenMult(stacks: number): number {
    return stacks >= 500 ? 0.6 : stacks >= 100 ? 0.8 : 1;
  }

  private static TIER_LABELS = ['TOXIN 25', 'TOXIN 50 · DRIPPING', 'TOXIN 100 · WEAKENED', 'TOXIN 250 · −50 MAX HP', 'TOXIN 500 · −100 MAX HP', 'DISSOLVED'];

  private updateToxins(time: number): void {
    const { player, npc } = this.arena;
    for (const f of this.allFighters()) {
      // A mirrored count arrives with no state of its own yet.
      if (f.toxinStacks > 0 && !this.toxins.has(f)) this.toxinState(f);
    }
    for (const [f, st] of this.toxins) {
      if (!f.active) { this.toxins.delete(f); continue; }
      if (f.hp <= 0) continue;
      const stacks = f.toxinStacks;
      const poisoner = this.poisonerOf(f);
      const tier = SlimeKit.tierOf(stacks);
      if (tier > st.tierSeen) {
        st.tierSeen = tier;
        this.announce(f.x, f.y - 46, SlimeKit.TIER_LABELS[tier - 1], tier >= 4 ? ACID.sting : ACID.neon, tier >= 5 ? 14 : 12);
        this.fx(poisoner).splash(f.x, f.y, 34 + tier * 6, { droplets: 6 + tier * 2, fizz: 3, etch: false, depth: 8, tones: this.tones(poisoner) });
      }

      // The burn: once a second at 25+, harder at 100 and 500.
      const dps = SlimeKit.dps(stacks);
      if (dps > 0 && time >= st.dotAt) {
        st.dotAt = time + TOXIN_DOT_MS;
        f.takeDamage(dps, { source: st });
        this.noteAcidHit(poisoner, f);
        this.fx(poisoner).droplets(f.x, f.y - 6, 2 + Math.min(4, tier), {
          speed: 50, angle: Math.PI / 2, spread: 1.2, size: 2.4, life: 420, fall: 24, depth: 8, tones: this.tones(poisoner),
        });
      } else if (dps === 0) {
        st.dotAt = time + TOXIN_DOT_MS;
      }

      // 50+: acid runs off the body as it walks, laid a step behind so it never feeds itself.
      if (stacks >= 50 && this.isAcid(poisoner)) {
        const moved = Phaser.Math.Distance.Between(f.x, f.y, st.dripX, st.dripY);
        if (moved >= TOXIN_DRIP_SPACING) {
          this.paint(poisoner, st.dripX, st.dripY, TOXIN_DRIP_RADIUS);
          st.dripX = f.x;
          st.dripY = f.y;
        }
      } else {
        st.dripX = f.x;
        st.dripY = f.y;
      }

      // 250 / 500: max HP eaten. A replica's max HP is the victim's to report (vitals sync).
      const isReplica = f === npc && this.arena.isOnline;
      const cut = (stacks >= 250 ? 50 : 0) + (stacks >= 500 ? 100 : 0);
      if (!isReplica && cut > st.maxHpCut) {
        f.reduceMaxHp(cut - st.maxHpCut);
        st.maxHpCut = cut;
      }

      // 1000: dead. Retried, because an invincible frame can refuse it.
      if (stacks >= 1000 && time >= st.killAt) {
        st.killAt = time + TOXIN_KILL_RETRY_MS;
        f.takeDamage(99999, { trueDamage: true, source: st });
        this.noteAcidHit(poisoner, f);
      }
    }

    // Weakness: the toxified body deals less. `takeDamage` has no attacker, so the *victim* of a
    // weakened attacker carries the cut (the hopelessness pattern).
    if (!this.arena.isInvasion) {
      player.toxinIncomingMult = SlimeKit.weakenMult(npc?.toxinStacks ?? 0);
      if (npc) npc.toxinIncomingMult = SlimeKit.weakenMult(player.toxinStacks);
    } else {
      // A husk crowd: the least-poisoned husk near enough to be the one swinging decides it.
      let mult = 1;
      let any = false;
      for (const e of this.arena.enemies) {
        if (!this.alive(e) || Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y) > 320) continue;
        const m = SlimeKit.weakenMult(e.toxinStacks);
        mult = any ? Math.max(mult, m) : m;
        any = true;
      }
      player.toxinIncomingMult = any ? mult : 1;
    }

    // Purge watch: a fresh Purge — ours, or the opponent's arriving through the mirror — strips.
    for (const f of this.allFighters()) {
      if (!f.active) continue;
      const seen = this.purgeSeen.get(f) ?? 0;
      if (f.purgedUntil > seen) {
        this.purgeSeen.set(f, f.purgedUntil);
        if (f.purgedUntil > time) stripBuffs(f);
      }
    }
  }

  // ── The tail ──────────────────────────────────────────────────────────

  private dodging(owner: Owner): boolean {
    if (owner === 'player') return this.arena.playerDodging;
    const npc = this.arena.npc;
    const body = npc.body as Phaser.Physics.Arcade.Body | null;
    const fast = !!body && body.velocity.length() > DASH_SPEED_READ;
    return Date.now() - npc.dodgingAt < 160 || fast;
  }

  /** The tail counts as a hitbox only while it is out: not burrowed, not mid-dodge. */
  private tailLive(owner: Owner): boolean {
    const s = this.side(owner);
    return s.tail.length >= 2 && !s.burrowed && !this.dodging(owner);
  }

  /** Sample where the serpent has been, at a fixed spacing — the shape is a hitbox, so it cannot depend on frame rate. */
  private updateTail(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.isAcid(owner) || !this.alive(f)) { s.tail = []; return; }
    if (s.tail.length === 0) {
      s.tail = [{ x: f.x, y: f.y }];
      s.lastSampleX = f.x;
      s.lastSampleY = f.y;
    }
    const moved = Phaser.Math.Distance.Between(f.x, f.y, s.lastSampleX, s.lastSampleY);
    if (moved >= TAIL_SPACING) {
      s.tail.unshift({ x: f.x, y: f.y });
      s.lastSampleX = f.x;
      s.lastSampleY = f.y;
    } else {
      s.tail[0] = { x: f.x, y: f.y };
    }
    const want = Math.max(3, Math.round(TAIL_SEGMENTS * s.tailMult)) + 1;
    if (s.tail.length > want) s.tail.length = want;
    // An idle serpent still lies at full length: pay slack out behind the last knot.
    while (s.tail.length < want) {
      const tail = s.tail[s.tail.length - 1];
      const prev = s.tail[s.tail.length - 2] ?? { x: tail.x - 1, y: tail.y };
      const ang = Math.atan2(tail.y - prev.y, tail.x - prev.x);
      s.tail.push({ x: tail.x + Math.cos(ang) * TAIL_SPACING, y: tail.y + Math.sin(ang) * TAIL_SPACING });
    }
  }

  private nearTail(tail: TailKnot[], x: number, y: number): boolean {
    for (let i = 1; i < tail.length - 1; i++) {
      if (distToSegment(x, y, tail[i].x, tail[i].y, tail[i + 1].x, tail[i + 1].y) <= TAIL_HIT_R) return true;
    }
    return false;
  }

  /**
   * Serpentine doing its job: an enemy shot that touches the tail hits the serpent. Both shot
   * systems — the physics group and the hand-drawn registry — are checked, as Cloth's scarf does.
   */
  private tailCatchesShots(owner: Owner): void {
    // An Invasion npc slot is a co-op ally: the player's shots must pass straight through it.
    if (!this.tailLive(owner) || (owner === 'npc' && this.arena.isInvasion)) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const tail = this.side(owner).tail;
    const mineIsPlayer = owner === 'player';
    // A snapshot: `destroy()` splices the group's live array.
    for (const obj of [...this.arena.projectiles.getChildren()]) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal || p.isFromPlayer === mineIsPlayer) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < TAIL_BODY_SKIP) continue;
      if (!this.nearTail(tail, p.x, p.y)) continue;
      this.tailHit(owner, Math.max(1, p.damage ?? 8), p.x, p.y);
      p.destroy();
    }
    for (let i = 2; i < tail.length; i += 2) {
      const k = tail[i];
      for (const rp of this.arena.projectileRegistry.within(this.other(owner), k.x, k.y, TAIL_HIT_R)) {
        this.tailHit(owner, Math.max(1, rp.damage), k.x, k.y);
        this.arena.projectileRegistry.steal(rp);
      }
    }
  }

  private tailHit(owner: Owner, damage: number, x: number, y: number): void {
    const f = this.fighter(owner);
    f.takeDamage(damage, { sourceX: x, sourceY: y });
    this.arena.spawnHitFlash(x, y, this.col(owner)(ACID.lime));
    this.fx(owner).droplets(x, y, 3, { speed: 80, size: 2.4, life: 300, depth: 7, tones: this.tones(owner) });
  }

  // ── Abilities (every one reachable from the player, a bot and an online replay) ──

  doWhip(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const { scene } = this.arena;
    const count = this.onAcid(owner, f.x, f.y) ? WHIP_COUNT_ENHANCED : WHIP_COUNT_BASE;
    const toxin = this.coverage(owner) >= WHIP_DOUBLE_AT ? 2 : 1;
    const baseAngle = Math.atan2(ty - f.y, tx - f.x);
    this.side(owner).aimX = tx;
    this.side(owner).aimY = ty;
    this.avatar(owner)?.play('punch', baseAngle);
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * WHIP_STAGGER_MS, () => {
        if (!this.alive(f)) return;
        const ang = baseAngle + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-WHIP_SPREAD_DEG, WHIP_SPREAD_DEG));
        // A muzzle spray every third lash: fifteen in 375ms is a wall of white.
        if (i % 3 === 0) fx.muzzleSpray(f.x, f.y, ang, 0.85, 7, tones);
        this.spawnLash(owner, f.x + Math.cos(ang) * 30, f.y + Math.sin(ang) * 30, ang, toxin);
      });
    }
  }

  private spawnLash(owner: Owner, x: number, y: number, ang: number, toxin: number): void {
    const proj = new Projectile(this.arena.scene, x, y, 'proj-acid-whip', WHIP_DAMAGE, owner === 'player');
    (proj as unknown as { venomToxin: number }).venomToxin = toxin;
    this.arena.projectiles.add(proj);
    proj.launch(Math.cos(ang) * WHIP_SPEED, Math.sin(ang) * WHIP_SPEED);
    proj.setRotation(ang);
  }

  doSpray(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    this.avatar(owner)?.play('sweep', ang);
    fx.muzzleSpray(f.x, f.y, ang, 1.6, 7, tones);
    for (const dist of SPLAT_DISTANCES) {
      this.addSplat(owner, f.x + Math.cos(ang) * dist, f.y + Math.sin(ang) * dist, SPLAT_RADIUS);
      // Each splash is thrown out there, so the spray reads as one arcing stream.
      fx.droplets(f.x, f.y, 5, {
        speed: dist * 2.2, angle: ang, spread: 0.22, size: 4.4, life: 340, fall: 20, depth: 6, tones,
      });
    }
  }

  doBurrow(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.burrowed || !this.alive(f)) return;
    // The player is checked before the cooldown is spent; a replica was in acid on its own sim.
    if (owner === 'npc' && !this.isReplica('npc') && !this.onAcid('npc', f.x, f.y)) return;
    s.burrowed = true;
    s.burrowedAt = this.now;
    f.isInvincible = true;
    f.setAlpha(0.4);
    if (owner === 'player' && this.arena.hasPerk('player', 'murk')) this.spawnMurkToad();
    this.avatar(owner)?.play('flex');
    this.fx(owner).gather(f.x, f.y, 46, 400, () => (f.active ? { x: f.x, y: f.y } : null), 5, this.tones(owner));
    this.fx(owner).ring(f.x, f.y, 46, 12, ACID.hotRim, 380, 3.5, 4);
  }

  private surface(owner: Owner, reason: string | null): void {
    const s = this.side(owner);
    if (!s.burrowed) return;
    s.burrowed = false;
    s.lastUnburrowAt = this.now;
    if (owner === 'player') this.despawnMurkToad();
    const f = this.fighter(owner);
    f.isInvincible = false;
    f.setAlpha(1);
    this.relay(owner, 'acid-surface');
    if (reason) this.announce(f.x, f.y - 34, reason, ACID.hotRim, 11);
    this.fx(owner).splash(f.x, f.y, 56, { droplets: 12, fizz: 4, etch: false, depth: 6, tones: this.tones(owner) });
    this.avatar(owner)?.play('flex');

    // Rattling Strike (R+): a red blast at the hole, and every toxin stack on the caught ×1.5.
    if (!this.up(owner, 'r')) return;
    const x = f.x, y = f.y;
    this.fx(owner).splash(x, y, RATTLING_RADIUS, { droplets: 18, fizz: 4, depth: 6, duration: 480, tones: STING_TONES });
    this.arena.scene.cameras.main.shake(180, 0.005);
    let hit = 0;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > RATTLING_RADIUS + this.bodyR(t)) continue;
      t.takeDamage(RATTLING_DAMAGE, { source: f, sourceX: x, sourceY: y });
      this.addToxin(t, t.toxinStacks * (RATTLING_TOXIN_MULT - 1));
      this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(ACID.sting));
      this.fx(owner).splash(t.x, t.y, 34, { droplets: 6, fizz: 0, etch: false, depth: 8, tones: STING_TONES });
      this.drippingEnemies.set(t, { owner, until: this.now + RATTLING_DRIP_MS, nextDripAt: this.now });
      if (owner === 'player') this.arena.recordMasteryStat('burrowAttacks', 1);
      this.noteAcidHit(owner, t);
      hit++;
    }
    if (hit > 0) this.announce(x, y - 48, 'RATTLING STRIKE', ACID.sting, 12);
  }

  private biteStage(owner: Owner): { stage: number; def: typeof BITE_STAGES[number] } {
    const cov = this.coverage(owner);
    const idx = BITE_STAGES.findIndex((s) => cov < s.maxCoverage);
    const i = idx < 0 ? BITE_STAGES.length - 1 : idx;
    return { stage: i + 1, def: BITE_STAGES[i] };
  }

  /** How far the bite reaches from this body's centre right now — the bot reads this. */
  biteReach(owner: Owner): number {
    return this.biteStage(owner).def.reach + this.bodyR(this.fighter(owner));
  }

  doBite(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const { stage, def } = this.biteStage(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const reach = def.reach + this.bodyR(f);
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    this.avatar(owner)?.play('slam', ang);
    fx.bite(f.x, f.y, ang, reach, stage, 8, tones);
    let hit = 0;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > reach + this.bodyR(t)) continue;
      const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (d > this.bodyR(f) + this.bodyR(t) && da > BITE_HALF_ANGLE) continue;
      // Snapshot first: Purge takes the buffs, Meltdown carries away exactly what it took.
      const melt = stage === BITE_MELT_STAGE && this.up(owner, 'f');
      const buffs = melt ? this.snapshotBuffs(t) : [];
      this.purge(owner, t, def.purgeMs);
      t.takeDamage(def.damage, { source: f, sourceX: f.x, sourceY: f.y });
      this.addToxin(t, BITE_TOXIN);
      if (melt) this.startMelt(owner, t, buffs);
      fx.punctures(t.x, t.y, ang, 9, tones);
      this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(ACID.neon));
      this.noteAcidHit(owner, t);
      hit++;
    }
    if (hit > 0 && stage >= 2) this.announce(f.x + Math.cos(ang) * reach, f.y + Math.sin(ang) * reach - 30, stage === 3 ? 'FESTERING BITE III' : 'FESTERING BITE II', ACID.neon, 11);
  }

  /** Purge: every buff stripped now, speed boosts held down for `ms`, a husk's baked bonuses gone. */
  private purge(owner: Owner, target: Fighter, ms: number): void {
    target.purgedUntil = Math.max(target.purgedUntil, this.now + ms);
    this.purgeSeen.set(target, target.purgedUntil);
    stripBuffs(target);
    this.fx(owner).splash(target.x, target.y, 52, { droplets: 12, fizz: 4, depth: 8, tones: this.tones(owner) });
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
      this.announce(target.x, target.y - 44, 'BONUS HP STRIPPED', ACID.caustic, 11);
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
    const { width: W, height: H } = this.arena.scene.scale;
    this.announce(W / 2, H / 2 - 60, 'ACID APOCALYPSE', ACID.neon, 16);
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
    if (this.shedCharges(owner) <= 0) {
      if (owner === 'player') {
        const s = this.side(owner);
        const next = SHED_MILESTONES[s.shedReached];
        this.announce(f.x, f.y - 34, next ? `SHED AT ${Math.round(next * 100)}% ACID` : 'NO SKIN LEFT', ACID.sting, 11);
      }
      return;
    }
    this.side(owner).shedUsed++;
    // triggerCooldown broadcasts the cast online; the peer replays through `doNpcShed`.
    if (owner === 'player') f.triggerCooldown('shed-skin');
    this.shed(owner);
  }

  /** Online replay: the remote serpent shed. Their sim already checked the charge. */
  doNpcShed(): void { this.shed('npc'); }

  private shed(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    const { scene } = this.arena;
    // The old skin stays where it lay, and the serpent comes out of it shorter and quicker.
    if (s.tail.length >= 2) {
      this.shedHusks.push({ owner, knots: s.tail.map((k) => ({ x: k.x, y: k.y })), width: TAIL_WIDTH * 1.1, bornAt: this.now });
    }
    s.tailMult *= SHED_TAIL_MULT;
    s.shedSpeed += SHED_SPEED_BONUS;
    this.announce(f.x, f.y - 46, 'SHED SKIN', ACID.glow, 14);
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    this.avatar(owner)?.play('flex');
    fx.splash(f.x, f.y, 90, { droplets: 20, fizz: 6, duration: 560, depth: 6, tones });
    scene.cameras.main.shake(220, 0.005);

    const toxin = this.coverage(owner) >= WHIP_DOUBLE_AT ? 2 : 1;
    for (let i = 0; i < SHED_LASH_COUNT; i++) {
      scene.time.delayedCall(Math.floor((i * SHED_BARRAGE_MS) / SHED_LASH_COUNT), () => {
        if (!this.alive(f)) return;
        // Spiralling out, so the barrage sweeps the whole ring instead of clumping.
        const ang = (i / SHED_LASH_COUNT) * Math.PI * 6 + Math.random() * 0.2;
        this.spawnLash(owner, f.x + Math.cos(ang) * 24, f.y + Math.sin(ang) * 24, ang, toxin);
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
    this.updateToxins(time);
    this.updateElectrolysis(time);
    this.updateMurkToad(time);
    if (this.drippingEnemies.size > 0) this.updateDripping(time);
    if (this.meltStatuses.size > 0) this.updateMelts(time);
    if (this.meltPuddles.length > 0 || this.activeMeltBuffs.length > 0) this.updateMeltPickup(time);
    if (this.footprints.length > 0) this.updateFootprints(time);
    this.shedHusks = this.shedHusks.filter((h) => time - h.bornAt < SHED_HUSK_MS);

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

    this.updateTail(owner);
    if (this.isAcid(owner)) this.tailCatchesShots(owner);

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

    // Spray Spread (E+): every splat periodically buds a smaller one.
    if (this.up(owner, 'e')) {
      for (const sp of s.splats.slice()) {
        if (time < sp.nextSpreadAt) continue;
        sp.nextSpreadAt = time + SPREAD_CHECK_MS;
        if (s.splats.length >= MAX_SPLATS || Math.random() >= SPREAD_CHANCE) continue;
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(SPREAD_OFFSET_MIN, SPREAD_OFFSET_MAX);
        this.addSplat(owner, sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d, Math.max(SPREAD_MIN_RADIUS, sp.radius * SPREAD_RADIUS_MULT));
      }
    }

    // Burrow: invincible while under, forced up off the acid. A bot surfaces itself at its target.
    if (s.burrowed) {
      if (!this.alive(f)) {
        s.burrowed = false;
      } else if (!this.isReplica(owner) && !grid.isAcid(f.x, f.y)) {
        this.surface(owner, 'OUT OF ACID');
      } else {
        f.isInvincible = true;
        if (this.isBot(owner)) {
          const tgt = this.arena.player;
          const range = this.up(owner, 'r') ? NPC_SURFACE_RANGE : NPC_SURFACE_RANGE_PLAIN;
          if ((this.alive(tgt) && Phaser.Math.Distance.Between(f.x, f.y, tgt.x, tgt.y) < range)
              || time - s.burrowedAt > NPC_BURROW_MAX_MS) {
            this.surface(owner, null);
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
    if (reached > s.shedReached) {
      s.shedReached = reached;
      if (this.shedSlot(owner) && this.alive(f)) {
        this.announce(f.x, f.y - 52, `${Math.round(SHED_MILESTONES[reached - 1] * 100)}% · SHED READY`, ACID.glow, 12);
      }
    }
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

  // ── Rattling drips, Meltdown, footprints ────────────────────────────

  private updateDripping(time: number): void {
    for (const [t, st] of this.drippingEnemies) {
      if (!t.active || t.hp <= 0 || time >= st.until) { this.drippingEnemies.delete(t); continue; }
      if (time >= st.nextDripAt) {
        st.nextDripAt = time + RATTLING_DRIP_INTERVAL_MS;
        this.addSplat(st.owner, t.x, t.y, RATTLING_DRIP_RADIUS, false);
      }
    }
  }

  private snapshotBuffs(target: Fighter): BuffSnapshotEntry[] {
    const out: BuffSnapshotEntry[] = [];
    for (const f of MELT_BUFF_FIELDS) {
      const v = target[f.key];
      const isBuffed = f.better === 'higher' ? v > f.neutral : v < f.neutral;
      if (isBuffed) out.push({ key: f.key, value: v, label: f.label(v) });
    }
    return out;
  }

  private startMelt(owner: Owner, target: Fighter, buffs: BuffSnapshotEntry[]): void {
    this.meltStatuses.set(target, {
      owner, until: this.now + MELT_DURATION_MS, nextDripAt: this.now + MELT_TICK_MS, buffs, color: target.element.color,
    });
    this.announce(target.x, target.y - 40, 'MELTING', ACID.caustic, 12);
    if (!this.meltAuras.has(target)) {
      this.meltAuras.set(target, new AcidAura(this.arena.scene, this.col(owner), 'melt', this.tones(owner), 24, 4));
    }
  }

  private updateMelts(time: number): void {
    for (const [target, st] of this.meltStatuses) {
      if (!target.active || target.hp <= 0) { this.meltStatuses.delete(target); continue; }
      // `nextDripAt <= until` so the boundary tick still fires instead of being cut off by expiry.
      if (time >= st.nextDripAt && st.nextDripAt <= st.until) {
        st.nextDripAt += MELT_TICK_MS;
        target.takeDamage(Math.max(1, Math.round(target.hp * MELT_HP_LOSS_PCT)));
        if (!(target === this.arena.npc && this.arena.isOnline)) {
          target.reduceMaxHp(Math.max(1, Math.round(target.maxHp * MELT_HP_LOSS_PCT)));
        }
        target.sizeMult = Math.max(MELT_MIN_SIZE_MULT, target.sizeMult * (1 - MELT_SIZE_LOSS_PCT));
        target.applySizeMult();
        this.arena.spawnHitFlash(target.x, target.y, st.color);
        // Only the player can stand in a puddle and take the buffs, so only theirs leave puddles.
        if (st.owner === 'player') {
          this.meltPuddles.push({ x: target.x, y: target.y, radius: MELT_PUDDLE_RADIUS, buffs: st.buffs, color: st.color, seed: Math.random() * 6 });
        }
        this.noteAcidHit(st.owner, target);
      }
      if (time >= st.until) this.meltStatuses.delete(target);
    }
  }

  private grantMeltBuffs(recipient: Fighter, buffs: BuffSnapshotEntry[], time: number): void {
    this.revertMeltBuffs(recipient);
    if (buffs.length === 0) {
      this.announce(recipient.x, recipient.y - 40, 'EMPTY PUDDLE', 0x888888, 10);
      return;
    }
    const labels: string[] = [];
    for (const b of buffs) {
      this.activeMeltBuffs.push({ key: b.key, revertValue: recipient[b.key] });
      recipient[b.key] = b.value;
      labels.push(b.label);
    }
    this.meltBuffExpireAt = time + MELT_BUFF_GRANT_MS;
    this.announce(recipient.x, recipient.y - 44, `${labels.join(', ')} (8s)`, ACID.caustic, 11);
  }

  private revertMeltBuffs(recipient: Fighter): void {
    for (const b of this.activeMeltBuffs) recipient[b.key] = b.revertValue;
    this.activeMeltBuffs = [];
  }

  private updateMeltPickup(time: number): void {
    const player = this.arena.player;
    for (let i = this.meltPuddles.length - 1; i >= 0; i--) {
      const mp = this.meltPuddles[i];
      if (Phaser.Math.Distance.Between(player.x, player.y, mp.x, mp.y) > mp.radius) continue;
      this.grantMeltBuffs(player, mp.buffs, time);
      this.pfx.gather(mp.x, mp.y, mp.radius * 1.6, 380, () => (player.active ? { x: player.x, y: player.y } : null), 5, VILE_TONES);
      this.pfx.ring(mp.x, mp.y, mp.radius, 6, mp.color, 340, 3, 5);
      this.meltPuddles.splice(i, 1);
    }
    if (this.activeMeltBuffs.length > 0 && time >= this.meltBuffExpireAt) this.revertMeltBuffs(player);
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
    for (const mp of this.meltPuddles) {
      AcidFx.drawMeltPuddle(g, this.pcol, mp.x, mp.y, mp.radius, mp.color, t, mp.seed, mp.buffs.length);
    }
    for (const arc of this.electroArcs) {
      const life = Phaser.Math.Clamp(1 - (time - arc.bornAt) / ELECTRO_ARC_MS, 0, 1);
      AcidFx.drawElectroArc(g, this.pcol, arc.x1, arc.y1, arc.x2, arc.y2, t, arc.seed, arc.surge, life);
    }
    this.drawMurkToad(g, time);
    for (const f of this.allFighters()) {
      if (!f.active || f.hp <= 0 || f.toxinStacks < 1) continue;
      const by = this.poisonerOf(f);
      drawToxinMark(g, this.col(by), f.x, f.y, f.toxinStacks, t, this.tones(by), f.forceInvisible ? 0 : f.alpha);
    }

    // Tails and sloughed skins.
    if (!this.tailGfx) this.tailGfx = scene.add.graphics().setDepth(4.5);
    const tg = this.tailGfx;
    tg.clear();
    for (const h of this.shedHusks) {
      drawVenomTail(tg, this.col(h.owner), h.knots, h.width, t, this.tones(h.owner), 1 - (time - h.bornAt) / SHED_HUSK_MS, true);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isAcid(owner) || !this.alive(f) || s.tail.length < 2 || s.burrowed) continue;
      // Mid-dodge the tail is gone from the hitbox, and it reads that way: a faint after-image.
      const alpha = (f.forceInvisible ? 0 : f.alpha) * (this.dodging(owner) ? 0.25 : 1);
      drawVenomTail(tg, this.col(owner), s.tail, TAIL_WIDTH, t, this.tones(owner), alpha);
    }

    this.drawGauge(t);
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
    let y = 12;
    for (const owner of BOTH) {
      const txt = this.barText[owner];
      if (!this.isAcid(owner)) { txt?.setVisible(false); continue; }
      const s = this.side(owner);
      const cov = this.coverage(owner);
      const x = W / 2 - bw / 2;
      drawAcidBar(g, this.col(owner), x, y, bw, bh, cov, t, this.tones(owner), SHED_MILESTONES, s.shedReached);
      if (!this.barText[owner]) {
        this.barText[owner] = scene.add.text(0, 0, '', {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#ccff88', stroke: '#0a1406', strokeThickness: 3,
        }).setOrigin(0, 0.5).setDepth(20).setScrollFactor(0);
      }
      const shed = this.shedSlot(owner) ? ` · SHED ${this.shedCharges(owner)}` : '';
      const who = owner === 'player' ? 'ACID' : 'FOE ACID';
      this.barText[owner]!.setVisible(true).setPosition(x + bw + 10, y + bh / 2)
        .setColor(owner === 'player' ? '#ccff88' : '#eeff99')
        .setText(`${who} ${Math.floor(cov * 100)}%${shed}`);
      y += 20;
    }
  }

  /** The dripping rig for whichever fighters are Venom. The player faces the cursor; the npc its target. */
  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.arena;
    if (this.isAcid('player') && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new AcidAvatar(scene, this.pcol, VILE_TONES);
      const s = this.side('player');
      const aimX = s.aimX || player.x + 1;
      const aimY = s.aimY || player.y;
      const facing = Math.atan2(aimY - player.y, aimX - player.x);
      this.playerAvatar.setFacing(facing);
      this.playerAvatar.setIntensity(this.now < s.rainUntil ? 1.25 : 1 + s.shedSpeed);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.setHold(s.burrowed ? 'brace' : null, facing);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }
    if (this.isAcid('npc') && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new AcidAvatar(scene, this.ncol, NPC_TONES);
      const s = this.side('npc');
      const facing = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar.setFacing(facing);
      this.npcAvatar.setIntensity(this.now < s.rainUntil ? 1.25 : 1 + s.shedSpeed);
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.setHold(s.burrowed ? 'brace' : null, facing);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
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
    for (const [victim, aura] of this.meltAuras) {
      if (!this.meltStatuses.has(victim) || !victim.active || victim.hp <= 0) {
        aura.destroy();
        this.meltAuras.delete(victim);
        continue;
      }
      aura.update(delta, victim.x, victim.y, victim.forceInvisible ? 0 : victim.alpha);
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

  /** Live lashes shed droplets out of their back — what makes a bead of green read as travelling. */
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
    s.aimX = mouseX;
    s.aimY = mouseY;
    const ctx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Venom Mastery — Shed Skin takes over whichever slot it is bound to.
    const shedSlot = this.shedSlot('player');
    if (shedSlot) {
      const key = shedSlot === 'e' ? eKey : shedSlot === 'r' ? rKey : shedSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryShed('player');
    }

    if (pointer.isDown && !pointerWasDown) player.castAbility('poison-whip', ctx);

    if (shedSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('vile-spray', ctx);

    // R: toggle. Entering needs acid underfoot, checked before the cooldown is spent.
    if (shedSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      if (s.burrowed) {
        this.surface('player', null);
      } else if (!this.onAcid('player', player.x, player.y)) {
        this.announce(player.x, player.y - 30, 'NEED ACID UNDERFOOT', ACID.sting, 11);
      } else {
        player.castAbility('snake-burrow', ctx);
      }
    }

    if (shedSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('festering-bite', ctx);
    if (shedSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('acid-apocalypse', ctx);
  }

  /** Online: the presses only the owner's sim decides. */
  replayNet(id: string): void {
    if (id === 'acid-surface') this.surface('npc', null);
  }

  // ── Bot reads (side-effect-free) ──────────────────────────────────────

  npcBurrowed(): boolean { return this.isAcid('npc') && this.side('npc').burrowed; }

  /** Which slot the bot's Shed Skin took over, so the rotation leaves that key alone. */
  npcShedSlot(): string | undefined { return this.shedSlot('npc') ?? undefined; }

  /**
   * Snake Burrow is worth entering: the bot is on its own acid and either has Rattling Strike and a
   * target close enough to tunnel up under, or is hurt and wants out.
   */
  npcBurrowReady(): boolean {
    if (!this.isAcid('npc') || this.side('npc').burrowed) return false;
    const npc = this.arena.npc;
    const tgt = this.arena.player;
    if (!this.alive(npc) || !this.alive(tgt) || !this.onAcid('npc', npc.x, npc.y)) return false;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, tgt.x, tgt.y);
    const hurt = npc.hp / Math.max(1, npc.maxHp) < 0.35;
    return (this.up('npc', 'r') && d > NPC_SURFACE_RANGE && d < 380) || (hurt && d < 260);
  }

  /** Burrowing is wanted but there is no acid underfoot: the nearest of its own, if it is close. */
  npcAcidSeekPoint(): { x: number; y: number } | null {
    if (!this.isAcid('npc') || this.side('npc').burrowed) return null;
    const npc = this.arena.npc;
    const tgt = this.arena.player;
    if (!this.alive(npc) || !this.alive(tgt) || this.onAcid('npc', npc.x, npc.y)) return null;
    if (npc.getCooldownRatio('snake-burrow') < 1 || this.npcShedSlot() === 'r') return null;
    const hurt = npc.hp / Math.max(1, npc.maxHp) < 0.35;
    if (!this.up('npc', 'r') && !hurt) return null;
    return this.side('npc').grid?.nearestAcid(npc.x, npc.y, 160) ?? null;
  }

  /** The target is standing on the bot's acid — the rain lands on them. */
  npcApocalypseReady(): boolean {
    if (!this.isAcid('npc')) return false;
    const tgt = this.arena.player;
    return this.alive(tgt) && this.onAcid('npc', tgt.x, tgt.y) && this.coverage('npc') >= 0.06;
  }

  /** The target is inside the bite's reach right now (stage-aware). */
  npcBiteReady(): boolean {
    if (!this.isAcid('npc')) return false;
    const npc = this.arena.npc;
    const tgt = this.arena.player;
    if (!this.alive(npc) || !this.alive(tgt)) return false;
    return Phaser.Math.Distance.Between(npc.x, npc.y, tgt.x, tgt.y) <= this.biteReach('npc') + this.bodyR(tgt) * 0.5;
  }

  /** Spraying is worth it: the target is off the bot's acid (spray it under them), or a milestone is near. */
  npcSprayWorth(): boolean {
    if (!this.isAcid('npc')) return false;
    const tgt = this.arena.player;
    if (!this.alive(tgt)) return false;
    if (!this.onAcid('npc', tgt.x, tgt.y)) return true;
    const s = this.side('npc');
    return s.shedReached < SHED_MILESTONES.length || this.coverage('npc') < WHIP_DOUBLE_AT;
  }
}
