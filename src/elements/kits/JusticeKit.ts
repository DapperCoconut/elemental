import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  ColiseumRing, FlamePillar, JUS, JudgeRig, JusticeAvatar, JusticeColorFn, JusticeFx, SeraphForm,
  angelBite, barrageSpear, chainHead, chainRun, drawJudgeScene, holySpikes, impaleRig, judgeRig,
  padlock, spearShape, styleMeter, tranceBeams, wallSlab, willMeter,
} from './JusticeVisuals';
import { meterStep } from '../../combat/Meters';
import {
  BEYOND_JUSTICE_RANK, STYLE_PER_RANK, STYLE_RANKS, getCombo,
} from '../../data/JusticeCombos';

type Owner = 'player' | 'npc';
export type JusticeForm = 'ground' | 'flight';
type Edge = 'top' | 'bottom' | 'left' | 'right';
/** The four slots a mastery ability may be dropped on. Click is deliberately not one of them. */
type MasterySlotKey = 'e' | 'r' | 'f' | 'q';

// ── Willpower ────────────────────────────────────────────────────────────────
const WILL_MAX = 100;
const WILL_REGEN_PER_SEC = 5;
/** Getting hit makes you more determined, not less — 20% faster regen for 2s. */
const WILL_HURT_REGEN_BONUS = 0.2;
const WILL_HURT_WINDOW_MS = 2000;
const WILL_DRAIN_SHEER = 10;
const WILL_DRAIN_FLIGHT = 2;

// ── Sheer Will ───────────────────────────────────────────────────────────────
const SHEER_SPEED_MULT = 1.2;
/** How long an attacker stays cowed after landing a hit on a willing Justice. */
const SHEER_RETALIATE_MS = 3000;
const SHEER_ATTACKER_MULT = 0.75;
const SHEER_NEXT_HIT_MULT = 1.33;

// ── Flight ───────────────────────────────────────────────────────────────────
const FLIGHT_SPEED_MULT = 1.33;
const FLIGHT_VULN_MULT = 1.2;

// ── Ground click ─────────────────────────────────────────────────────────────
const STAB_DAMAGE = 20;
const STAB_REACH = 76;
const STAB_ARC = Math.PI / 3;
const STAB_PROJ_DAMAGE = 15;
const STAB_PROJ_SPEED = 620;

// ── Coliseum ─────────────────────────────────────────────────────────────────
const COLISEUM_RADIUS = 152;
const COLISEUM_MS = 8000;
const COLISEUM_RISE_MS = 320;
const COLISEUM_FADE_MS = 400;

// ── Judgement Day ────────────────────────────────────────────────────────────
const JUDGE_SCENE_MS = 2600;
/** Damage the enemy has dealt you → how long they spend in chains. */
const JUDGE_TIERS = [
  { min: 300, label: 'DAMNED',     color: '#ff3344', bindMs: 10000, damned: true },
  { min: 200, label: 'GUILTY',     color: '#ffcc33', bindMs: 8000,  damned: false },
  { min: 100, label: 'GUILTY',     color: '#ffcc33', bindMs: 5000,  damned: false },
  { min: 0,   label: 'NOT GUILTY', color: '#88ffaa', bindMs: 0,     damned: false },
];
const DAMNED_VULN_MULT = 1.25;

// ── Flight click ─────────────────────────────────────────────────────────────
const SPEAR_SPEED = 800;
const SPEAR_DAMAGE = 20;
const SPEAR_BLAST_RADIUS = 64;

// ── Bind ─────────────────────────────────────────────────────────────────────
const CHAIN_SPEED = 1050;
const CHAIN_PIERCE_DAMAGE = 10;
/** An anchored chain rots off on its own if it is never used. */
const CHAIN_HOLD_MS = 7000;
const WALL_SPEED = 300;
const WALL_THICK = 26;
const WALL_MISSING_MS = 15000;
const WALL_IMPACT_DAMAGE = 20;
const WALL_IMPACT_STUN_MS = 2000;

// ── Pillar of Flame ──────────────────────────────────────────────────────────
const PILLAR_MS = 8000;
const PILLAR_HALF_W = 26;
const PILLAR_TICK_MS = 500;
const PILLAR_DAMAGE_PER_TICK = 6;
const PILLAR_SLOW_MULT = 0.75;

// ── Seraphim's Gaze ──────────────────────────────────────────────────────────
const SERAPH_FORM_MS = 3000;
const TRANCE_MS = 10000;

const ARENA_PAD = 32;

// ── Mastery · Combo Excelsius ────────────────────────────────────────────────
export const EXCELSIUS_ID = 'combo-excelsius';
/** How long the meter glows after style is scored. */
const STYLE_HEAT_MS = 900;
/** Style a dropped rank lands on, so falling is not a cliff. */
const STYLE_ON_DEMOTION = 60;
/** How long the "I AM BEYOND JUSTICE" banner stays on screen. */
const BEYOND_BANNER_MS = 1800;
/** Untouched: how long without damage the combo wants, and at what rank it starts counting. */
const UNTOUCHED_MS = 15000;
const UNTOUCHED_MIN_RANK = 1;
/** Axe Chain: how many swings on one body inside the window, and what the window is. */
const AXE_CHAIN_HITS = 4;
const AXE_CHAIN_WINDOW_MS = 2500;
/** Held to the Fire: how long a body has to be pinned against a solid pillar. */
const PILLAR_PIN_MS = 1000;
/** Nothing Left / Grounded: how long after the event a kill still counts. */
const AFTER_EMPTY_MS = 2000;
const AFTER_LANDING_MS = 3000;
/** Both Feet: how close together the two stance changes have to be. */
const STANCE_DANCE_MS = 4000;

// ── Mastery · Vigilante Vengeance ────────────────────────────────────────────
export const VENGEANCE_ID = 'vigilante-vengeance';
const VENGEANCE_COOLDOWN_MS = 28000;

/** Ground half. */
const DASH_DIST = 260;
const DASH_MS = 220;
const DASH_CATCH_R = 40;
/** The impalement and the kick together. */
const IMPALE_DAMAGE = 45;
const IMPALE_HOLD_MS = 320;
/** How far the kick throws them, and how fast. */
const KICK_SPEED = 900;
const KICK_MAX_DIST = 420;
/** What the landing is worth, by what they landed on. */
const SLAM_WALL_DAMAGE = 30;
const SLAM_WALL_STUN_MS = 2000;
const SLAM_MOVING_DAMAGE = 45;
const SLAM_MOVING_STUN_MS = 3000;
const SLAM_PILLAR_DAMAGE = 30;
const SLAM_BURN_MS = 5000;

/** Flight half. */
const BARRAGE_COUNT = 200;
const BARRAGE_DAMAGE = 2;
/** How long the whole sky takes to come down. */
const BARRAGE_MS = 2600;
const BARRAGE_SPEED = 780;
/** Standard deviation of the landing spread around the cursor, in pixels. */
const BARRAGE_SPREAD = 150;
const BARRAGE_HIT_R = 20;
/** How hard a spear bends toward a bitten body, per open bite, in radians a second. */
const BARRAGE_HOME_PER_BITE = 1.7;
const BARRAGE_HOME_RANGE = 210;
/** Rain of Spears: how many of one barrage have to land on the same body. */
const BARRAGE_CLUSTER = 20;

// ── Click+ · Hell-Piercer ────────────────────────────────────────────────────
/** How long one angel bite stays open. Each bite runs its own clock, oldest first. */
const BITE_MS = 3000;
const BITE_MAX = 3;
/** Execution threshold per open bite: 5% of max health, up to 15% at three. */
const BITE_EXECUTE_PCT = 0.05;
/** How close the ground click's thrown spear has to get before it counts as a bite. */
const BITE_CONTACT = 34;

// ── E+ · World Maker ─────────────────────────────────────────────────────────
const WORLD_SPEED_MULT = 1.25;
const WORLD_DAMAGE_MULT = 1.25;
const SPIKE_DAMAGE = 20;
const SPIKE_CD_MS = 2000;
/** How far off a wall the spikes reach. A body's own radius is included. */
const SPIKE_REACH = 40;

// ── R+ · Indomitable Will ────────────────────────────────────────────────────
const INDOMITABLE_FLOOR = 1;
const INDOMITABLE_DRAIN_MULT = 2;

// ── F+ · Death from Above ────────────────────────────────────────────────────
const AXE_MS = 5000;
const AXE_DAMAGE = 5;
const AXE_REACH = 64;
const AXE_ARC = Math.PI / 2;
/** 800ms of Spear Thrust becomes about 100ms of axe. */
const AXE_COOLDOWN_MULT = 0.125;
const AXE_LUNGE_DIST = 22;
const AXE_LUNGE_MS = 110;

// ── Q+ · Swift and Blind ─────────────────────────────────────────────────────
const SWIFT_BLESSING_MS = 8000;
/** Progress through the Judgement Day scene at which the placard drops and the word appears. */
const VERDICT_AT = 0.64;

// ── World objects ────────────────────────────────────────────────────────────

interface Coliseum {
  owner: Owner;
  x: number; y: number;
  bornAt: number;
  until: number;
  ring: ColiseumRing;
  /** Which side of the wall each fighter was on when it went up. */
  inside: Map<Fighter, boolean>;
  /**
   * Which side of *this* ring each live projectile was on last frame. Per-ring rather
   * than per-kit, because with two rings up a shared map would have each one overwriting
   * the other's sample and neither would ever see a crossing.
   */
  projSide: WeakMap<Projectile, boolean>;
}

interface Chain {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  /** Where the chain is paid out from — redrawn to the caster each frame. */
  hit: Set<Fighter>;
}

interface Anchor {
  owner: Owner;
  edge: Edge;
  x: number; y: number;
  until: number;
}

interface FlyingWall {
  owner: Owner;
  edge: Edge;
  /** Distance travelled inward from its home edge. */
  travelled: number;
  span: number;
  hit: Set<Fighter>;
}

interface ThrownSpear {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  angle: number;
}

interface Pillar {
  owner: Owner;
  x: number;
  until: number;
  tickAccum: number;
  fx: FlamePillar;
  /**
   * R+ Indomitable Will: which side of a *solid* pillar each body was last seen on, so it can
   * be held there. Sampled every frame anyone is clear of the fire, which is the only moment
   * the answer is unambiguous.
   */
  side: Map<Fighter, number>;
}

interface JudgeScene {
  owner: Owner;
  victim: Fighter;
  until: number;
  /** Chosen at cast so the whole set piece animates toward its own ending. */
  tier: typeof JUDGE_TIERS[number];
  damage: number;
  announced: boolean;
  /** The word has been printed into the placard — see {@link VERDICT_AT}. */
  placarded: boolean;
}

/** Click+ Hell-Piercer: the ground click's thrown spear, watched so a long-range hit can bite. */
interface StabShot {
  proj: Projectile;
  owner: Owner;
  bitten: Set<Fighter>;
}

interface Bind {
  until: number;
  damned: boolean;
  by: Owner;
}

// ── Mastery world objects ────────────────────────────────────────────────────

/**
 * The ground half of Vigilante Vengeance, from the moment the key is pressed to the moment the
 * victim stops travelling. One object rather than three because it is one motion — the dash,
 * the impalement and the kick are the same press and the painter has to know which part of it
 * is on screen.
 */
interface Vengeance {
  phase: 'dash' | 'impale' | 'launch';
  /** `scene.time.now` the current phase ends. */
  until: number;
  angle: number;
  /** Where the dash started, so it can be walked out as a position delta. */
  fromX: number; fromY: number;
  victim: Fighter | null;
  /** Bodies the dash has already run through, so one press cannot skewer the same body twice. */
  caught: Set<Fighter>;
  /** How far the kicked body has travelled, for the distance cap. */
  flown: number;
}

/** One spear of the flight barrage, on its way down. */
interface BarrageSpear {
  x: number; y: number;
  angle: number;
  /** `scene.time.now` it is released at. Before that it is still in the sky. */
  bornAt: number;
  dead: boolean;
}

/** A barrage in progress: the spears, the aim they were thrown at, and the cluster tally. */
interface Barrage {
  spears: BarrageSpear[];
  until: number;
  /** How many of these have landed on each body — Rain of Spears counts this. */
  landed: Map<Fighter, number>;
  /** Whether any spear of this barrage has bent toward a three-bite body yet. */
  homed: boolean;
}

// ── Per-side state ───────────────────────────────────────────────────────────

interface Side {
  owner: Owner;
  form: JusticeForm;
  will: number;
  sheerActive: boolean;
  /** `scene.time.now` until which regen runs hot after a hit. */
  hurtUntil: number;
  /** Last seen `rawDamageTaken`, so a hit can be detected without owning the callback. */
  lastRaw: number;
  /** Sheer Will: whoever hit us is cowed until this timestamp. */
  retaliateUntil: number;
  /** Sheer Will: the next hit we land is amplified. */
  nextHitBonus: boolean;
  /** Seraph set piece: `scene.time.now` the transformation ends. */
  seraphUntil: number;
  seraph: SeraphForm | null;
  /** Who we have entranced, and until when. */
  tranceUntil: number;
  tranceVictim: Fighter | null;
  /** Latch so dropping to zero Willpower announces itself once. */
  exhausted: boolean;
  /** NPC pacing — the AI is not allowed to spam stance changes. */
  nextStanceAt: number;
  /** F+ Death from Above: `scene.time.now` until which the ground click is an axe. */
  axeUntil: number;
  /** F+ : the short forward shove each axe swing carries, applied as a position delta. */
  lunge: { vx: number; vy: number; until: number } | null;
  /** Q+ Swift and Blind: Willpower pinned full and the F key free until this timestamp. */
  blessedUntil: number;
}

/**
 * Combo Excelsius' ledger. Player-only — a bot has no mastery loadout to switch the passive on
 * with, and a style meter nobody can see is not a passive.
 */
interface Style {
  /** Style inside the current rank, 0–100. */
  points: number;
  /** Index into {@link STYLE_RANKS}. */
  rank: number;
  /** `scene.time.now` the meter stops glowing after a score. */
  heatUntil: number;
  /** Per-combo re-award gates, keyed by combo id. */
  readyAt: Map<string, number>;
  /** `scene.time.now` the last combo name faded, so a chain of them stacks up the screen. */
  lastNameAt: number;
  nameStack: number;

  // ── Context the combos are watched from ──
  /** `scene.time.now` the caster was last hurt. Untouched counts from here. */
  lastHurtAt: number;
  /** `scene.time.now` the Willpower bar last hit zero. */
  emptiedAt: number;
  /** `scene.time.now` the caster last put its feet back on the floor. */
  landedAt: number;
  /** The two stance changes Both Feet wants, and whether a hit landed in each stance. */
  stanceChangedAt: number;
  stanceHits: number;
  /** Death from Above's chain: how many swings have landed on `axeTarget`, and when it started. */
  axeTarget: Fighter | null;
  axeHits: number;
  axeSince: number;
  /** How long each body has been held against a solid pillar face. */
  pinnedFor: Map<Fighter, number>;
  /** `scene.time.now` the beyond-justice banner clears. */
  beyondUntil: number;
}

function makeStyle(): Style {
  return {
    points: 0, rank: 0, heatUntil: 0, readyAt: new Map(), lastNameAt: 0, nameStack: 0,
    lastHurtAt: 0, emptiedAt: -Infinity, landedAt: -Infinity,
    stanceChangedAt: -Infinity, stanceHits: 0,
    axeTarget: null, axeHits: 0, axeSince: 0,
    pinnedFor: new Map(), beyondUntil: 0,
  };
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    form: 'ground',
    will: WILL_MAX,
    sheerActive: false,
    hurtUntil: 0,
    lastRaw: 0,
    retaliateUntil: 0,
    nextHitBonus: false,
    seraphUntil: 0,
    seraph: null,
    tranceUntil: 0,
    tranceVictim: null,
    exhausted: false,
    nextStanceAt: 0,
    axeUntil: 0,
    lunge: null,
    blessedUntil: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface JusticeArenaApi {
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
  /** Skins: maps a Justice visual colour through that side's equipped skin. */
  justiceColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(
    x: number, y: number, radius: number, damage: number, owner: Owner, except?: Fighter,
  ): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Swap the ability tray to the stance the local player is in. */
  setHudForm(form: JusticeForm): void;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Mastery: the enhancement bound over each of the player's slots this match. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBestStat(key: string, value: number): void;
}

// ── JusticeKit ───────────────────────────────────────────────────────────────

export class JusticeKit {
  private api: JusticeArenaApi;

  // ── Visuals ──
  private readonly pcol: JusticeColorFn;
  private readonly ncol: JusticeColorFn;
  private readonly pfx: JusticeFx;
  private readonly nfx: JusticeFx;
  private playerAvatar: JusticeAvatar | null = null;
  private npcAvatar: JusticeAvatar | null = null;
  /** Under the fighters: ripped walls, bind chains on the floor, arena border patches. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over them: thrown spears, live chains, trance beams. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The Judgement Day / Seraph set pieces, over everything but the HUD. */
  private sceneGfx: Phaser.GameObjects.Graphics | null = null;
  /** The Willpower meter. Depth 20 with the rest of the HUD. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private coliseums: Coliseum[] = [];
  private chains: Chain[] = [];
  private anchors: Anchor[] = [];
  private walls: FlyingWall[] = [];
  private spears: ThrownSpear[] = [];
  private pillars: Pillar[] = [];
  private judge: JudgeScene | null = null;
  private binds = new Map<Fighter, Bind>();
  /**
   * Click+ : the open angel bites on a body — one expiry timestamp each, oldest first, plus
   * whose spear opened them, so a skin recolours the light coming out of the right one.
   */
  private bites = new Map<Fighter, { list: number[]; by: Owner }>();
  private stabShots: StabShot[] = [];
  /** E+ : `scene.time.now` at which each body may be pricked by holy spikes again. */
  private spikeReadyAt = new Map<Fighter, number>();
  /** `scene.time.now` each arena edge is rebuilt at. 0 = the wall is standing. */
  private missingEdges: Record<Edge, number> = { top: 0, bottom: 0, left: 0, right: 0 };
  /** Last HUD stance pushed, so the tray is only swapped when it actually changes. */
  private hudForm: JusticeForm | null = null;
  private lastAimX = 0;
  private lastAimY = 0;

  // ── Mastery ──
  private style: Style = makeStyle();
  private styleLabel: Phaser.GameObjects.Text | null = null;
  private styleName: Phaser.GameObjects.Text | null = null;
  private beyondLabel: Phaser.GameObjects.Text | null = null;
  private vengeance: Vengeance | null = null;
  private barrage: Barrage | null = null;
  /** Private timer — the ability is not in `element.abilities`, so it owns its own cooldown. */
  private vengeanceAt = -VENGEANCE_COOLDOWN_MS;
  /** Health each live enemy had last frame, so a death can be attributed to its context. */
  private killWatch = new Map<Fighter, number>();

  constructor(api: JusticeArenaApi) {
    this.api = api;
    this.pcol = (base) => api.justiceColor('player', base);
    this.ncol = (base) => api.justiceColor('npc', base);
    this.pfx = new JusticeFx(api.scene, this.pcol);
    this.nfx = new JusticeFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): JusticeFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): JusticeColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isJustice(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'justice' : this.api.npcElementId === 'justice';
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  /**
   * Consume Sheer Will's stored retaliation, if any. Every Justice damage number passes
   * through here so the bonus is spent exactly once, on whatever lands next.
   */
  private boosted(owner: Owner, amount: number): number {
    const s = this.side(owner);
    // E+ World Maker: fighting inside your own arena is worth a quarter more of everything.
    let out = this.inOwnColiseum(owner) ? amount * WORLD_DAMAGE_MULT : amount;
    // Both Feet: a hit landed in this stance. Bumped here because every Justice damage figure
    // in the kit passes through this one function.
    if (owner === 'player' && this.mastered) this.style.stanceHits++;
    if (!s.nextHitBonus) return Math.round(out);
    s.nextHitBonus = false;
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 44, '⚖️ RIGHTEOUS +33%', '#a8ccff');
    this.awardStyle('righteous-spend', owner);
    out *= SHEER_NEXT_HIT_MULT;
    return Math.round(out);
  }

  /**
   * E+ World Maker: whether this side is standing inside a Coliseum ring of their own. Both
   * halves of the upgrade — the speed and the damage — hang off this one answer.
   */
  private inOwnColiseum(owner: Owner): boolean {
    if (!this.upgraded(owner, 'e')) return false;
    const f = this.fighter(owner);
    if (!f || !f.active) return false;
    return this.coliseums.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= COLISEUM_RADIUS);
  }

  // ── Hell-Piercer (Click+) ──────────────────────────────────────────────────

  /** How many angel bites are still open on a body. */
  private biteCount(f: Fighter): number {
    const rec = this.bites.get(f);
    if (!rec) return 0;
    const now = this.now;
    let n = 0;
    for (const until of rec.list) if (until > now) n++;
    return n;
  }

  /**
   * Take a bite out of somebody. Refuses to stack past three, and a fourth bite refreshes the
   * oldest rather than being thrown away — the wound is meant to be maintainable at range.
   */
  private addBite(target: Fighter, owner: Owner): void {
    if (!target.active || target.hp <= 0) return;
    // Ruin's Combo Breaker halves every meter in the game — the bite count included, carried so
    // that the three still arrive, just over twice as many hits.
    if (meterStep(this.fighter(owner), 'bite') <= 0) return;
    const now = this.now;
    const rec = this.bites.get(target);
    const list = (rec?.by === owner ? rec.list : []).filter((u) => u > now);
    if (list.length >= BITE_MAX) list.shift();
    list.push(now + BITE_MS);
    this.bites.set(target, { list, by: owner });
    const fx = this.fx(owner);
    fx.flash(target.x, target.y, 26, 7);
    fx.motes(target.x, target.y, 5, 22, 520);
    if (list.length === BITE_MAX) {
      this.announce(target.x, target.y - 50, '👼 BITTEN ×3 — 15%', '#fff3cf', 11);
      this.awardStyle('execute-triple-bite', owner);
    }
  }

  /**
   * The kill. Nothing about it is a damage figure: whatever is left is taken outright, pierced
   * through every absorb layer in the game, and the body comes apart in two.
   *
   * A Justice standing in their own Indomitable Will survives it at one health, because that
   * floor is checked inside `takeDamage` and this goes through `takeDamage` like anything else.
   */
  private executeTarget(target: Fighter, owner: Owner, angle: number): void {
    const f = this.fighter(owner);
    this.bites.delete(target);
    this.fx(owner).execution(target.x, target.y, angle + Math.PI / 2);
    this.announce(target.x, target.y - 56, '⚔️ EXECUTED', '#ffffff', 15, 1400);
    this.api.spawnHitFlash(target.x, target.y, JUS.white);
    // Pierced so no shield, absorber or clotted layer gets to argue with a verdict. Five times
    // what is left rather than an arbitrary huge figure: enough to punch through any stack of
    // armour in the game, and small enough that the running damage tally stays meaningful for
    // the one body that can survive this — a Justice standing in their own Indomitable Will.
    //
    // Deliberately *not* wrapped in `asNonAllyDamage`: in co-op the ally sits in the npc slot,
    // so lifting the friendly-fire block here would let an allied Justice execute you.
    target.takeDamage(target.hp * 5 + 50, { pierce: true });
    this.fx(owner).ring(f.x, f.y, 12, 70, JUS.pale, 460, 5, 6);
    this.record(owner, 'executions');
    this.awardStyle('execute', owner);
  }

  /**
   * Damage from a melee Justice swing, plus the execution the bites on that body may have
   * earned. The threshold is checked *after* the hit lands, so a body the swing itself pushed
   * under 5% is still taken — an execute that only fires above its own threshold is a bug.
   */
  private meleeStrike(target: Fighter, owner: Owner, damage: number, angle: number): void {
    // Contempt of Court, before the hit: a body the swing itself un-stuns still counts.
    if (this.isStunned(target)) this.awardStyle('stab-stunned', owner);
    // Through the Fire: a melee hit landed on somebody standing in your own wall of flame.
    if (this.pillars.some((p) => p.owner === owner && Math.abs(target.x - p.x) <= PILLAR_HALF_W + 16)) {
      this.awardStyle('stab-through-pillar', owner);
    }
    if (owner === 'player') this.noteAxeChain(target);
    target.takeDamage(damage);
    if (!this.upgraded(owner, 'click')) return;
    if (!target.active || target.hp <= 0) return;
    const bites = this.biteCount(target);
    if (bites <= 0) return;
    if (target.hp > target.maxHp * BITE_EXECUTE_PCT * bites) return;
    this.executeTarget(target, owner, angle);
  }

  /**
   * The ground click's thrown spear, watched from here rather than from a hook on the shot.
   *
   * That spear is a real arena `Projectile` and ArenaScene owns its collisions, so the bite is
   * applied on proximity a frame before the overlap resolves — the physics pass runs after the
   * scene's update, which is the only reason this ordering is reliable.
   */
  private updateStabShots(): void {
    if (!this.stabShots.length) return;
    const keep: StabShot[] = [];
    for (const s of this.stabShots) {
      if (!s.proj.active) continue;
      for (const t of this.targetsOf(s.owner)) {
        if (s.bitten.has(t)) continue;
        if (Phaser.Math.Distance.Between(s.proj.x, s.proj.y, t.x, t.y) > BITE_CONTACT) continue;
        s.bitten.add(t);
        this.addBite(t, s.owner);
      }
      keep.push(s);
    }
    this.stabShots = keep;
  }

  private updateBites(time: number): void {
    for (const [f, rec] of [...this.bites]) {
      const live = rec.list.filter((u) => u > time);
      if (!live.length || !f.active || f.hp <= 0) this.bites.delete(f);
      else rec.list = live;
    }
  }

  /**
   * Death from Above's chain: four swings on the same body inside the window, no misses. Only
   * counted while the axe is actually out — an ordinary spear thrust is not a chain of anything.
   */
  private noteAxeChain(target: Fighter): void {
    if (!this.mastered || this.sides.player.axeUntil <= this.now) return;
    const s = this.style;
    if (s.axeTarget !== target) {
      s.axeTarget = target;
      s.axeHits = 0;
      s.axeSince = this.now;
    }
    s.axeHits++;
    s.axeSince = this.now;
    if (s.axeHits >= AXE_CHAIN_HITS) {
      this.awardStyle('axe-chain');
      s.axeHits = 0;
    }
  }

  /**
   * Both Feet, Neither Floor: two stance changes inside four seconds with a hit landed in each.
   * The hit counter is bumped by `boosted`, which every Justice damage figure passes through —
   * so "landed a hit" means the same thing here as it does everywhere else in the kit.
   */
  private noteStanceChange(): void {
    if (!this.mastered) return;
    const s = this.style;
    const now = this.now;
    if (now - s.stanceChangedAt <= STANCE_DANCE_MS && s.stanceHits >= 2) {
      this.awardStyle('stance-dance');
    }
    s.stanceChangedAt = now;
    s.stanceHits = 0;
  }

  /** The banner. Its own object rather than an `announce`, because it holds rather than drifts. */
  private declareBeyondJustice(): void {
    this.style.beyondUntil = this.now + BEYOND_BANNER_MS;
    if (!this.beyondLabel) {
      this.beyondLabel = this.api.scene.add.text(this.api.width / 2, this.api.height / 2 - 60,
        'I AM BEYOND JUSTICE!', {
          fontSize: '30px',
          fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: '#ff3b5c', stroke: '#05070f', strokeThickness: 7,
        }).setOrigin(0.5).setDepth(24).setScrollFactor(0);
    }
    this.beyondLabel.setVisible(true);
    this.beyondLabel.setAlpha(1);
    Sfx.playAt('roar', this.api.player.x, { rate: 0.6, volume: 1 });
  }

  /** Hard control. Skips anyone the game has declared unstoppable. */
  private stun(target: Fighter, ms: number): void {
    if (target.unstoppable) return;
    target.earthStunnedUntil = Math.max(target.earthStunnedUntil, this.now + ms);
  }

  private isStunned(f: Fighter): boolean {
    return !f.unstoppable && f.earthStunnedUntil > this.now;
  }

  private clampToArena(f: Fighter): void {
    f.x = Phaser.Math.Clamp(f.x, this.left + 16, this.right - 16);
    f.y = Phaser.Math.Clamp(f.y, this.top + 16, this.bottom - 16);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    for (const c of this.coliseums) c.ring.destroy();
    this.coliseums = [];
    for (const p of this.pillars) p.fx.destroy();
    this.pillars = [];
    this.chains = [];
    this.anchors = [];
    this.walls = [];
    this.spears = [];
    this.judge = null;
    this.binds.clear();
    this.bites.clear();
    this.stabShots = [];
    this.spikeReadyAt.clear();
    this.missingEdges = { top: 0, bottom: 0, left: 0, right: 0 };
    this.hudForm = null;
    this.vizT = 0;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      s.seraph?.destroy();
      s.seraph = null;
    }

    // ── Mastery ──
    this.style = makeStyle();
    this.vengeance = null;
    this.barrage = null;
    this.killWatch.clear();
    // `scene.time.now` does not restart between matches and readiness is absolute, so a plain 0
    // here would lock the ability for its whole cooldown at the start of the first match.
    this.vengeanceAt = -VENGEANCE_COOLDOWN_MS;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.sceneGfx?.destroy(); this.sceneGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.styleLabel?.destroy(); this.styleLabel = null;
    this.styleName?.destroy(); this.styleName = null;
    this.beyondLabel?.destroy(); this.beyondLabel = null;

    // Anything we were holding on a fighter has to be handed back, or a Justice match
    // would leak its multipliers into whatever element is picked next.
    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.justiceIncomingMult = 1;
      f.justiceCooldownMult = 1;
      f.levitating = false;
      f.minHpFloor = 0;
    }
  }

  // ── Upgrades ───────────────────────────────────────────────────────────────

  /**
   * Whether this side is a Justice carrying the shop upgrade in `slot`.
   *
   * The npc arm only ever answers true in online play, where the "npc" is a replica of a
   * remote player whose own casts are being replayed here — see `hasNpcUpgrade`.
   */
  private upgraded(owner: Owner, slot: string): boolean {
    if (!this.isJustice(owner)) return false;
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** True while anybody on the field is holding an upgrade — the cue to paint its world art. */
  private anyoneHas(slot: string): boolean {
    return this.upgraded('player', slot) || this.upgraded('npc', slot);
  }

  /**
   * A kit-owned pop-up.
   *
   * `ArenaScene.showFloatingText` is a deliberate no-op these days — seven hundred flavour
   * labels were too many — so the handful of Justice events that genuinely have to be *read*
   * (a verdict, an execution, a stance the ability tray cannot show) print their own text
   * rather than quietly saying nothing at all.
   */
  private announce(x: number, y: number, text: string, color: string, size = 12, life = 1100): void {
    const t = this.api.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color,
      stroke: '#05070f',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(22);
    this.api.scene.tweens.add({
      targets: t,
      y: y - 24,
      alpha: 0,
      duration: life,
      ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  // ── Mastery: Combo Excelsius ───────────────────────────────────────────────

  /** Whether Element Mastery is on for the local Justice player. */
  private get mastered(): boolean {
    return this.api.elementId === 'justice' && this.api.masteryActive;
  }

  /** The rank the meter is currently sitting on. */
  private get rank(): typeof STYLE_RANKS[number] {
    return STYLE_RANKS[Phaser.Math.Clamp(this.style.rank, 0, STYLE_RANKS.length - 1)];
  }

  /** True at S and above, where Judgement Day stops weighing anybody. */
  private get beyondJustice(): boolean {
    return this.mastered && this.style.rank >= BEYOND_JUSTICE_RANK;
  }

  /** Only ever recorded for the player: the grind is the human's, not the bot's. */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player') this.api.recordMasteryStat(key, amount);
  }

  /**
   * Score a combo. Every style award in the kit comes through here, so the per-combo re-award
   * gate, the rank ladder and the on-screen name are all in one place — and a combo that is
   * awarded but has no row in `JUSTICE_COMBOS` scores nothing rather than crashing, which is
   * what makes the table the authority rather than a copy of one.
   */
  private awardStyle(id: string, owner: Owner = 'player'): void {
    if (owner !== 'player' || !this.mastered) return;
    const def = getCombo(id);
    if (!def) return;
    const s = this.style;
    const now = this.now;
    if ((s.readyAt.get(id) ?? 0) > now) return;
    if (def.cooldownMs) s.readyAt.set(id, now + def.cooldownMs);

    s.points += def.style;
    s.heatUntil = now + STYLE_HEAT_MS;
    while (s.points >= STYLE_PER_RANK && s.rank < STYLE_RANKS.length - 1) {
      s.points -= STYLE_PER_RANK;
      s.rank++;
      const r = this.rank;
      this.announce(this.api.width / 2, 116, `${r.letter}  ${r.name}`, r.text, 26, 1200);
      Sfx.playAt('ui-purchase', this.api.player.x, { rate: 1 + s.rank * 0.08, volume: 0.85 });
    }
    if (s.rank >= STYLE_RANKS.length - 1) s.points = Math.min(s.points, STYLE_PER_RANK);

    // The combo's name, stacking up the right of the screen so a chain reads as a chain.
    if (now - s.lastNameAt > 900) s.nameStack = 0;
    s.lastNameAt = now;
    s.nameStack = Math.min(5, s.nameStack + 1);
    this.announce(this.api.width - 96, 92 + s.nameStack * 17,
      `+${def.style}  ${def.name.toUpperCase()}`, this.rank.text, 12, 1000);
  }

  /** The style ledger: the bleed, the demotion, and the three things a rank pays for. */
  private updateStyle(time: number, delta: number): void {
    const s = this.style;
    const p = this.api.player;
    if (!this.mastered || !p) {
      if (p) p.justiceCooldownMult = 1;
      return;
    }

    s.points -= this.rank.decay * (delta / 1000);
    if (s.points < 0) {
      if (s.rank > 0) { s.rank--; s.points = STYLE_ON_DEMOTION; }
      else s.points = 0;
    }
    p.justiceCooldownMult = this.rank.cooldown;

    // ── Untouched ──
    // `lastHurtAt` is stamped by `updateSide`, which owns the frame-over-frame comparison.
    if (s.rank >= UNTOUCHED_MIN_RANK && time - s.lastHurtAt >= UNTOUCHED_MS) {
      this.awardStyle('no-damage-window');
      s.lastHurtAt = time;
    }

    // ── Death from Above's chain: a swing that stops landing breaks it ──
    if (s.axeTarget && time - s.axeSince > AXE_CHAIN_WINDOW_MS) {
      s.axeTarget = null;
      s.axeHits = 0;
    }

    // ── Held to the Fire ──
    // Recomputed from the pillar pass, which is where the pin actually happens; anything not
    // touched this frame has let go and its clock is dropped.
    for (const [f, held] of [...s.pinnedFor]) {
      if (!f.active || f.hp <= 0) { s.pinnedFor.delete(f); continue; }
      if (held >= PILLAR_PIN_MS) {
        this.awardStyle('pillar-pin');
        s.pinnedFor.set(f, 0);
      }
    }

    if (s.beyondUntil > 0 && time >= s.beyondUntil) {
      s.beyondUntil = 0;
      this.beyondLabel?.setVisible(false);
    }
  }

  /**
   * Deaths, watched centrally rather than at each damage site.
   *
   * Four of the combos are "a kill made while X was true", and the kill can come from anything
   * — a projectile ArenaScene owns, a pillar tick, a barrage spear. Sampling health once a
   * frame catches all of them from one place and cannot double-count.
   */
  private updateKillWatch(time: number): void {
    if (!this.mastered) return;
    const p = this.api.player;
    const s = this.style;
    for (const t of [...this.api.enemies, this.api.npc]) {
      if (!t) continue;
      const before = this.killWatch.get(t);
      if (t.hp > 0) { this.killWatch.set(t, t.hp); continue; }
      if (before === undefined || before <= 0) continue;
      this.killWatch.set(t, 0);

      // What was true at the moment they went down.
      if (p && p.hp > 0 && p.hp <= p.maxHp * 0.1) this.awardStyle('low-hp-kill');
      if (time - s.emptiedAt <= AFTER_EMPTY_MS) this.awardStyle('empty-will-hold');
      if (time - s.landedAt <= AFTER_LANDING_MS) this.awardStyle('flight-descend-kill');
      const bind = this.binds.get(t);
      if (bind && bind.by === 'player' && bind.until > time) this.awardStyle('verdict-kill');
      if (this.sides.player.tranceVictim === t && this.sides.player.tranceUntil > time) {
        this.awardStyle('seraph-trance-kill');
      }
      // The mastery requirement, on the same sample: the only body that can be sitting on
      // exactly one health and still swinging is one Indomitable Will is holding there.
      if (p && p.hp > 0 && p.hp <= INDOMITABLE_FLOOR && this.upgraded('player', 'r')
        && this.sides.player.sheerActive) {
        this.api.recordMasteryBestStat('lastStandKills', 1);
      }
    }
    for (const [f] of [...this.killWatch]) {
      if (!f.active) this.killWatch.delete(f);
    }
  }

  // ── Mastery: Vigilante Vengeance ───────────────────────────────────────────

  /** Which slot Vigilante Vengeance was dropped on, or null. */
  private vengeanceSlot(): MasterySlotKey | null {
    if (!this.mastered) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === VENGEANCE_ID) return s;
    }
    return null;
  }

  private keyFor(slot: MasterySlotKey): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.api.eKey
      : slot === 'r' ? this.api.rKey
      : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  private vengeanceReady(time: number): boolean {
    return time >= this.vengeanceAt + VENGEANCE_COOLDOWN_MS && !this.vengeance && !this.barrage;
  }

  /** The press. Which half it is depends entirely on whether your feet are on the floor. */
  private castVengeance(mouseX: number, mouseY: number): void {
    const time = this.now;
    if (!this.vengeanceReady(time)) return;
    this.vengeanceAt = time;
    if (this.sides.player.form === 'flight') this.beginBarrage(mouseX, mouseY);
    else this.beginCharge(mouseX, mouseY);
  }

  private beginCharge(mouseX: number, mouseY: number): void {
    const f = this.api.player;
    const angle = Math.atan2(mouseY - f.y, mouseX - f.x);
    this.vengeance = {
      phase: 'dash',
      until: this.now + DASH_MS,
      angle,
      fromX: f.x, fromY: f.y,
      victim: null,
      caught: new Set(),
      flown: 0,
    };
    this.avatar('player')?.play('dash', angle);
    this.fx('player').motes(f.x, f.y, 10, 30, 500);
    this.announce(f.x, f.y - 52, '🗡️ VIGILANTE VENGEANCE', '#ffb26b', 13);
    Sfx.playAt('whoosh', f.x, { rate: 0.75, volume: 0.9 });
  }

  /**
   * The ground half, walked out a frame at a time.
   *
   * The dash and the kick are both **position deltas** rather than velocities: ArenaScene
   * rebuilds a fighter's velocity from WASD (and a bot's from its AI) long before this runs, so
   * anything pushed into a body is erased before it renders. Same rule as the F⁺ axe's lunge.
   */
  private updateVengeance(time: number, delta: number): void {
    const v = this.vengeance;
    if (!v) return;
    const f = this.api.player;
    if (!f || !f.active || f.hp <= 0) { this.vengeance = null; return; }

    if (v.phase === 'dash') {
      const step = (DASH_DIST / DASH_MS) * delta;
      f.setPosition(f.x + Math.cos(v.angle) * step, f.y + Math.sin(v.angle) * step);
      this.clampToArena(f);
      // Anything the dash runs through is run *through*.
      for (const t of this.targetsOf('player')) {
        if (v.caught.has(t)) continue;
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > DASH_CATCH_R) continue;
        v.caught.add(t);
        v.victim = t;
        v.phase = 'impale';
        v.until = time + IMPALE_HOLD_MS;
        this.stun(t, IMPALE_HOLD_MS + 120);
        this.fx('player').flash(t.x, t.y, 46, 9);
        Sfx.playAt('hit-heavy', t.x, { rate: 0.8, volume: 1 });
        this.announce(t.x, t.y - 50, '🗡️ IMPALED', '#fff3cf', 13);
        break;
      }
      if (v.phase === 'dash' && time >= v.until) this.vengeance = null;
      return;
    }

    if (v.phase === 'impale') {
      const t = v.victim;
      if (!t || !t.active || t.hp <= 0) { this.vengeance = null; return; }
      // Held on the end of the spear. Written every frame — their own AI rebuilds velocity.
      t.setPosition(f.x + Math.cos(v.angle) * 42, f.y + Math.sin(v.angle) * 42);
      this.body(t).setVelocity(0, 0);
      this.stun(t, 160);
      if (time < v.until) return;

      // …and the boot.
      t.takeDamage(this.boosted('player', IMPALE_DAMAGE));
      this.api.spawnHitFlash(t.x, t.y, JUS.white);
      this.fx('player').shards(t.x, t.y, 10, 220, 520);
      Sfx.playAt('hit-heavy', t.x, { rate: 0.6, volume: 1 });
      v.phase = 'launch';
      v.until = time + (KICK_MAX_DIST / KICK_SPEED) * 1000;
      v.flown = 0;
      return;
    }

    // ── The flight ──
    const t = v.victim;
    if (!t || !t.active || t.hp <= 0) { this.vengeance = null; return; }
    const step = KICK_SPEED * (delta / 1000);
    v.flown += step;
    const nx = t.x + Math.cos(v.angle) * step;
    const ny = t.y + Math.sin(v.angle) * step;
    t.setPosition(nx, ny);
    this.body(t).setVelocity(0, 0);
    this.stun(t, 160);

    const landing = this.landingFor(t, v.angle);
    if (landing) { this.resolveSlam(t, v, landing); return; }
    if (v.flown >= KICK_MAX_DIST || time >= v.until) {
      this.clampToArena(t);
      this.fx('player').rubble(t.x, t.y, 8, 30);
      this.vengeance = null;
    }
  }

  /**
   * What a kicked body has just hit, in the order the combos care about — a wall that is
   * itself still moving beats a pillar beats a coliseum beats the edge of the map, because the
   * moving wall is the one that is hardest to arrange and the one worth the most.
   */
  private landingFor(t: Fighter, angle: number): 'moving' | 'pillar' | 'coliseum' | 'wall' | null {
    for (const w of this.walls) {
      if (w.owner === 'player' && this.wallTouches(w, t)) return 'moving';
    }
    for (const p of this.pillars) {
      if (p.owner === 'player' && Math.abs(t.x - p.x) <= PILLAR_HALF_W + 14) return 'pillar';
    }
    for (const c of this.coliseums) {
      if (c.owner !== 'player') continue;
      const d = Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y);
      if (Math.abs(d - COLISEUM_RADIUS) <= 22) return 'coliseum';
    }
    // The arena edge, but only the one they are actually travelling into.
    const ahead = 20;
    const px = t.x + Math.cos(angle) * ahead;
    const py = t.y + Math.sin(angle) * ahead;
    return this.edgeAt(px, py) ? 'wall' : null;
  }

  private resolveSlam(t: Fighter, v: Vengeance, kind: 'moving' | 'pillar' | 'coliseum' | 'wall'): void {
    const fx = this.fx('player');
    if (kind === 'moving') {
      t.takeDamage(this.boosted('player', SLAM_MOVING_DAMAGE));
      this.stun(t, SLAM_MOVING_STUN_MS);
      this.announce(t.x, t.y - 52, '💥 CAUGHT BY THE WALL', '#ffb26b', 14);
      this.awardStyle('vengeance-moving-wall');
    } else if (kind === 'pillar') {
      t.takeDamage(this.boosted('player', SLAM_PILLAR_DAMAGE));
      // Set alight on the way through. The generic burn every element writes.
      t.burningUntil = Math.max(t.burningUntil, Date.now() + SLAM_BURN_MS);
      this.announce(t.x, t.y - 52, '🔥 INTO THE FIRE', '#ff9a3c', 14);
      this.awardStyle('vengeance-pillar');
    } else {
      t.takeDamage(this.boosted('player', SLAM_WALL_DAMAGE));
      this.stun(t, SLAM_WALL_STUN_MS);
      this.announce(t.x, t.y - 52, '💥 INTO THE WALL', '#e6e1d2', 14);
      this.awardStyle('vengeance-wall');
    }
    this.clampToArena(t);
    this.api.spawnHitFlash(t.x, t.y, JUS.stone);
    fx.rubble(t.x, t.y, 18, 56);
    fx.flash(t.x, t.y, 60, 9);
    Sfx.playAt('hit-heavy', t.x, { rate: 0.5, volume: 1 });
    void v;
    this.vengeance = null;
  }

  /** The flight half: two hundred spears, released over two and a half seconds. */
  private beginBarrage(mouseX: number, mouseY: number): void {
    const spears: BarrageSpear[] = [];
    const now = this.now;
    for (let i = 0; i < BARRAGE_COUNT; i++) {
      // A sum of two uniforms is a passable bell without a Gaussian: tightest at the cursor,
      // thinning out to either side of it, which is exactly what the spread has to feel like.
      const bell = (Math.random() + Math.random() - 1);
      const x = Phaser.Math.Clamp(mouseX + bell * BARRAGE_SPREAD, this.left + 8, this.right - 8);
      spears.push({
        x,
        y: this.top - 40 - Math.random() * 120,
        angle: Math.PI / 2 + (Math.random() - 0.5) * 0.24,
        bornAt: now + (i / BARRAGE_COUNT) * BARRAGE_MS + Math.random() * 90,
        dead: false,
      });
    }
    this.barrage = { spears, until: now + BARRAGE_MS + 2600, landed: new Map(), homed: false };
    void mouseY;
    const f = this.api.player;
    this.avatar('player')?.play('raise', undefined, 700);
    this.fx('player').verdictBeam(mouseX, this.top, JUS.pale, this.api.height, 800, 11);
    this.announce(this.api.width / 2, this.top + 60, '🌧️ VIGILANTE VENGEANCE', '#a8ccff', 18, 1400);
    Sfx.playAt('beam-charge', f.x, { rate: 0.7, volume: 0.9 });
  }

  private updateBarrage(time: number, delta: number): void {
    const b = this.barrage;
    if (!b) return;
    const dt = delta / 1000;
    let alive = 0;

    for (const s of b.spears) {
      if (s.dead || time < s.bornAt) { if (!s.dead) alive++; continue; }
      alive++;

      // Click⁺ Hell-Piercer: an open bite is a hole in the sky's aim, and three is a funnel.
      let bestBites = 0;
      let bestAng = 0;
      for (const t of this.targetsOf('player')) {
        const bites = this.biteCount(t);
        if (bites <= 0) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) > BARRAGE_HOME_RANGE) continue;
        if (bites <= bestBites) continue;
        bestBites = bites;
        bestAng = Math.atan2(t.y - s.y, t.x - s.x);
      }
      if (bestBites > 0) {
        const turn = BARRAGE_HOME_PER_BITE * bestBites * dt;
        s.angle += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(bestAng - s.angle), -turn, turn);
        if (bestBites >= BITE_MAX && !b.homed) {
          b.homed = true;
          this.awardStyle('barrage-homing');
        }
      }

      s.x += Math.cos(s.angle) * BARRAGE_SPEED * dt;
      s.y += Math.sin(s.angle) * BARRAGE_SPEED * dt;

      if (s.y > this.bottom + 30 || s.x < this.left - 40 || s.x > this.right + 40) {
        s.dead = true;
        continue;
      }
      if (s.y < this.top) continue;

      const hit = this.targetsOf('player')
        .find((t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= BARRAGE_HIT_R);
      if (!hit) continue;
      s.dead = true;
      hit.takeDamage(this.boosted('player', BARRAGE_DAMAGE));
      this.api.spawnHitFlash(hit.x, hit.y, JUS.pale);
      const n = (b.landed.get(hit) ?? 0) + 1;
      b.landed.set(hit, n);
      if (n === BARRAGE_CLUSTER) this.awardStyle('barrage-cluster');
    }

    if (alive === 0 || time >= b.until) this.barrage = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'justice') return;
    const s = this.sides.player;
    const p = this.api.player;
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    // The set pieces take the controls entirely — Judgement Day and the Seraph are
    // both scenes, and a scene you can walk out of is not a scene.
    if (s.seraphUntil > time) return;
    if (this.judge && this.judge.owner === 'player' && this.judge.until > time) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;
    // Vigilante Vengeance takes its slot outright in *both* stances, because it is one ability
    // with two halves rather than two abilities that happen to share a key.
    const veng = this.vengeanceSlot();
    if (veng && Phaser.Input.Keyboard.JustDown(this.keyFor(veng))) {
      this.castVengeance(mouseX, mouseY);
      return;
    }
    // The ground dash owns the body while it is running; a key pressed mid-charge is not a cast.
    if (this.vengeance) return;

    if (s.form === 'ground') {
      if (s.axeUntil > time) {
        // F+ Death from Above: the axe auto-fires on a held button. Asking for ten distinct
        // clicks a second is not a rush-down, it is a wrist injury.
        //
        // The short cooldown rides `nextCastCooldownMult`, which `stampCast` banks per ability
        // and clears — and is put back by hand if the cast is refused, so a disarm cannot leave
        // a 0.125 armed for whatever key is pressed next. `Math.min` so a Quantum Ability Split
        // already banked on this body still wins.
        if (pointer.isDown) {
          const banked = p.nextCastCooldownMult;
          p.nextCastCooldownMult = Math.min(banked, AXE_COOLDOWN_MULT);
          if (!p.castAbility('justice-stab', ctx)) p.nextCastCooldownMult = banked;
        }
      } else if (clicked) {
        p.castAbility('justice-stab', ctx);
      }
      if (veng !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('justice-coliseum', ctx);
      if (veng !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('justice-sheer-will', ctx);
      if (veng !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('justice-flight', ctx);
      if (veng !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('justice-judgement-day', ctx);
      return;
    }

    if (clicked) p.castAbility('justice-spear-throw', ctx);
    if (veng !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      // A chain already hooked into a wall recasts for free — the cooldown bought the throw.
      if (this.anchors.some((a) => a.owner === 'player')) this.doBind(mouseX, mouseY, 'player');
      else p.castAbility('justice-bind', ctx);
    }
    if (veng !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('justice-pillar', ctx);
    if (veng !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('justice-descend', ctx);
    if (veng !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('justice-seraphim', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  doStab(tx: number, ty: number, owner: Owner): void {
    // F+ Death from Above: for five seconds after coming down, this key is an axe.
    if (this.side(owner).axeUntil > this.now) { this.doAxe(tx, ty, owner); return; }

    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);

    fx.thrust(f.x, f.y, angle, STAB_REACH);
    this.avatar(owner)?.play('punch', angle);

    // The stab itself: a narrow wedge in front, not a circle around you.
    const dmg = this.boosted(owner, STAB_DAMAGE);
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > STAB_REACH + 20) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - angle));
      if (off > STAB_ARC / 2) continue;
      this.api.spawnHitFlash(t.x, t.y, JUS.bright);
      fx.shards(t.x, t.y, 6, 130);
      this.meleeStrike(t, owner, dmg, angle);
    }

    // ...and the spear that keeps going.
    const proj = new Projectile(
      this.api.scene,
      f.x + Math.cos(angle) * 30, f.y + Math.sin(angle) * 30,
      'proj-justice-spear', this.boosted(owner, STAB_PROJ_DAMAGE), owner === 'player',
    );
    proj.setRotation(angle);
    this.api.projectiles.add(proj);
    proj.launch(Math.cos(angle) * STAB_PROJ_SPEED, Math.sin(angle) * STAB_PROJ_SPEED);
    fx.motes(f.x + Math.cos(angle) * 34, f.y + Math.sin(angle) * 34, 4, 12, 420);
    // Click+ Hell-Piercer: this is a long-range spear, so it is one of the two that bite.
    if (this.upgraded(owner, 'click')) this.stabShots.push({ proj, owner, bitten: new Set() });
  }

  /**
   * F+ Death from Above. A fifth of the damage at eight times the rate, and every swing throws
   * you a little further along whatever direction you were already running — the whole point is
   * that you land out of the sky on somebody and do not stop moving until they are down.
   */
  private doAxe(tx: number, ty: number, owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);

    fx.axeChop(f.x, f.y, angle, AXE_REACH);
    this.avatar(owner)?.play('punch', angle);

    const dmg = this.boosted(owner, AXE_DAMAGE);
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > AXE_REACH + 20) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - angle));
      if (off > AXE_ARC / 2) continue;
      this.api.spawnHitFlash(t.x, t.y, JUS.pale);
      fx.shards(t.x, t.y, 4, 90, 300);
      this.meleeStrike(t, owner, dmg, angle);
    }

    // The rush. Taken from the body's own velocity so it extends the run you are already
    // making, and falls back to the aim when you swing standing still.
    const b = this.body(f);
    let vx = b.velocity.x;
    let vy = b.velocity.y;
    if (Math.hypot(vx, vy) < 1) { vx = Math.cos(angle); vy = Math.sin(angle); }
    const m = Math.hypot(vx, vy) || 1;
    s.lunge = { vx: vx / m, vy: vy / m, until: this.now + AXE_LUNGE_MS };
  }

  doColiseum(owner: Owner): void {
    const f = this.fighter(owner);
    // One ring per side. Raising a second drops the first — two overlapping cages
    // would carve the arena into pockets nobody can leave.
    this.dropColiseums(owner);

    const inside = new Map<Fighter, boolean>();
    for (const t of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (!t || !t.active) continue;
      inside.set(t, Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= COLISEUM_RADIUS);
    }

    this.coliseums.push({
      owner,
      x: f.x, y: f.y,
      bornAt: this.now,
      until: this.now + COLISEUM_MS,
      ring: new ColiseumRing(this.api.scene, this.col(owner), COLISEUM_RADIUS),
      inside,
      projSide: new WeakMap(),
    });

    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(f.x, f.y, 20, COLISEUM_RADIUS, JUS.gold, 480, 6, 5);
    this.fx(owner).rubble(f.x, f.y, 12, 30);
    this.api.showFloatingText(f.x, f.y - 40, '🏛️ COLISEUM', '#f0d68a');
    // Court Is In Session: fencing somebody in. Fencing yourself in alone is not style.
    if (this.targetsOf(owner).some((t) => inside.get(t))) this.awardStyle('coliseum-trap', owner);
    if (this.upgraded(owner, 'e')) this.announce(f.x, f.y - 52, '🏛️ MY ARENA', '#f0d68a', 12);
  }

  doSheerWill(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.sheerActive) {
      s.sheerActive = false;
      this.api.showFloatingText(f.x, f.y - 40, 'Will released', '#a8ccff');
      return;
    }
    if (s.will < 5) {
      this.api.showFloatingText(f.x, f.y - 40, '💤 No willpower', '#7788aa');
      return;
    }
    s.sheerActive = true;
    s.exhausted = false;
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 10, 62, JUS.will, 420, 5, 6);
    this.api.showFloatingText(f.x, f.y - 40, '💙 SHEER WILL', '#2f7bff');
  }

  doFlight(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.form === 'flight') return;
    if (s.will < 5) {
      this.api.showFloatingText(f.x, f.y - 40, '💤 Too spent to fly', '#7788aa');
      return;
    }
    s.form = 'flight';
    if (owner === 'player') this.noteStanceChange();
    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 12, 74, JUS.pale, 460, 5, 6);
    this.fx(owner).motes(f.x, f.y, 14, 40, 900);
    this.api.showFloatingText(f.x, f.y - 44, '🕊️ FLIGHT OF THE VALKYRIE', '#fff3cf');
    if (owner === 'player') this.pushHudForm();
  }

  doDescend(owner: Owner): void {
    const s = this.side(owner);
    if (s.form === 'ground') return;
    this.leaveFlight(owner, 'Descend');
    // F+ Death from Above. Deliberately only on the *pressed* landing — being dropped out of
    // the sky by an empty Willpower bar is not an entrance.
    if (!this.upgraded(owner, 'f')) return;
    s.axeUntil = this.now + AXE_MS;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('slam');
    this.fx(owner).ring(f.x, f.y, 10, 96, JUS.flameCore, 420, 6, 6);
    this.fx(owner).rubble(f.x, f.y + 12, 14, 44);
    this.announce(f.x, f.y - 50, '🪓 DEATH FROM ABOVE', '#ffd24a', 13);
  }

  doJudgementDay(owner: Owner): void {
    const f = this.fighter(owner);
    const victim = owner === 'player'
      ? this.api.getNearestEnemy(f.x, f.y)
      : this.api.player;
    if (!victim || !victim.active || victim.hp <= 0) {
      this.api.showFloatingText(f.x, f.y - 40, 'Nobody to try', '#998877');
      return;
    }

    // "How much damage has the enemy done to you" — the running pre-mitigation tally
    // the fighter already keeps. Mitigating a hit shouldn't pardon the one who threw it.
    const damage = Math.round(f.rawDamageTaken);
    // Combo Excelsius, at S and above: the scales stop weighing anybody. There is no tally to
    // read and no tier to find — the worst verdict there is, every time.
    const beyond = owner === 'player' && this.beyondJustice;
    const tier = beyond
      ? JUDGE_TIERS[0]
      : (JUDGE_TIERS.find((t) => damage >= t.min) ?? JUDGE_TIERS[JUDGE_TIERS.length - 1]);
    if (beyond) this.declareBeyondJustice();

    this.judge = {
      owner, victim, tier, damage,
      until: this.now + JUDGE_SCENE_MS,
      announced: false,
      placarded: false,
    };
    this.avatar(owner)?.play('raise', undefined, JUDGE_SCENE_MS);
    this.fx(owner).verdictBeam(f.x, f.y, JUS.gold, this.api.height, 700, 11);
    this.api.showFloatingText(f.x, f.y - 52, '⚖️ JUDGEMENT DAY', '#f0d68a');
  }

  doSpearThrow(tx: number, ty: number, owner: Owner): void {
    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.spears.push({
      owner,
      x: f.x + Math.cos(angle) * 26,
      y: f.y + Math.sin(angle) * 26,
      vx: Math.cos(angle) * SPEAR_SPEED,
      vy: Math.sin(angle) * SPEAR_SPEED,
      tx, ty, angle,
    });
    this.avatar(owner)?.play('punch', angle);
    this.fx(owner).motes(f.x + Math.cos(angle) * 30, f.y + Math.sin(angle) * 30, 5, 14, 400);
  }

  doBind(tx: number, ty: number, owner: Owner): void {
    // Recast with a chain already sunk into a wall: rip it out.
    const anchor = this.anchors.find((a) => a.owner === owner);
    if (anchor) {
      this.anchors = this.anchors.filter((a) => a !== anchor);
      this.ripWall(anchor, owner);
      return;
    }

    const f = this.fighter(owner);
    const angle = Math.atan2(ty - f.y, tx - f.x);
    this.chains.push({
      owner,
      x: f.x + Math.cos(angle) * 24,
      y: f.y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * CHAIN_SPEED,
      vy: Math.sin(angle) * CHAIN_SPEED,
      hit: new Set(),
    });
    this.avatar(owner)?.play('sweep', angle);
  }

  doPillar(tx: number, _ty: number, owner: Owner): void {
    const x = Phaser.Math.Clamp(tx, this.left + PILLAR_HALF_W, this.right - PILLAR_HALF_W);
    this.pillars.push({
      owner,
      x,
      until: this.now + PILLAR_MS,
      tickAccum: 0,
      fx: new FlamePillar(this.api.scene, this.col(owner), PILLAR_HALF_W, this.top, this.bottom),
      side: new Map(),
    });
    const f = this.fighter(owner);
    this.avatar(owner)?.play('slam', Math.atan2(0, x - f.x));
    this.fx(owner).verdictBeam(x, this.bottom, JUS.flame, this.bottom - this.top, 600, 5);
    this.api.showFloatingText(x, this.top + 26, '🔥 PILLAR OF FLAME', '#ff7a1f');
    // Trial by Fire: a wall of flame raised through a ring somebody cannot walk out of.
    const caged = this.targetsOf(owner).some((t) => this.coliseums.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= COLISEUM_RADIUS
      && Math.abs(c.x - x) <= COLISEUM_RADIUS));
    if (caged) this.awardStyle('coliseum-pillar', owner);
    if (this.upgraded(owner, 'r')) this.announce(x, this.top + 40, '🧱 SOLID FIRE', '#ff9a3c', 11);
  }

  doSeraphim(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const victim = owner === 'player' ? this.api.getNearestEnemy(f.x, f.y) : this.api.player;

    // Teleport to the middle — the whole point is that everyone has to look at you.
    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;
    this.fx(owner).motes(f.x, f.y, 12, 34, 600);
    f.setPosition(cx, cy);
    this.body(f).reset(cx, cy);

    s.seraphUntil = this.now + SERAPH_FORM_MS;
    s.seraph?.destroy();
    s.seraph = new SeraphForm(this.api.scene, this.col(owner));
    if (victim && victim.active && victim.hp > 0) {
      s.tranceVictim = victim;
      // The trance starts when the form drops, not when it opens.
      s.tranceUntil = this.now + SERAPH_FORM_MS + TRANCE_MS;
    }
    this.fx(owner).flash(cx, cy, 90, 13);
    this.api.showFloatingText(cx, cy - 70, "👁️ SERAPHIM'S GAZE", '#ffffff');
  }

  // ── Stance plumbing ────────────────────────────────────────────────────────

  private avatar(owner: Owner): JusticeAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private leaveFlight(owner: Owner, why: string): void {
    const s = this.side(owner);
    if (s.form === 'ground') return;
    s.form = 'ground';
    if (owner === 'player') {
      this.noteStanceChange();
      this.style.landedAt = this.now;
    }
    const f = this.fighter(owner);
    f.levitating = false;
    // Anything the flight stance was holding comes down with you.
    this.anchors = this.anchors.filter((a) => a.owner !== owner);
    this.chains = this.chains.filter((c) => c.owner !== owner);
    this.fx(owner).rubble(f.x, f.y + 14, 6, 22);
    this.api.showFloatingText(f.x, f.y - 40, `🪶 ${why}`, '#e6e1d2');
    if (owner === 'player') this.pushHudForm();
  }

  /**
   * Ruin Mastery — Second Skin. The flight stance is a whole second ability tray and a body
   * that no longer touches the floor, so it is a form in the strictest sense. `leaveFlight` is
   * the kit's own landing: it drops the levitation, cuts the anchors and chains the stance was
   * holding, and swaps the tray back.
   */
  revertForms(f: Fighter): string[] {
    const owner: Owner | null = f === this.api.player ? 'player'
      : f === this.api.npc ? 'npc' : null;
    if (!owner || this.side(owner).form === 'ground') return [];
    this.leaveFlight(owner, 'DRAGGED DOWN');
    return ['Flight'];
  }

  private pushHudForm(): void {
    const form = this.sides.player.form;
    if (form === this.hudForm) return;
    this.hudForm = form;
    this.api.setHudForm(form);
  }

  private dropColiseums(owner: Owner): void {
    for (const c of this.coliseums) {
      if (c.owner !== owner) continue;
      // Fade it out rather than deleting it, so the columns sink instead of blinking away.
      c.until = Math.min(c.until, this.now + 120);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'justice';
    const npcIs = this.api.npcElementId === 'justice';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    if (playerIs) this.pushHudForm();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.isJustice(owner)) this.updateSide(owner, time, delta);
    }

    this.updateColiseums(time, delta);
    this.updateChains(time, delta);
    this.updateWalls(delta);
    this.updateWallSpikes(time);
    this.updateSpears(delta);
    this.updateStabShots();
    this.updateBites(time);
    this.updatePillars(time, delta);
    this.updateJudgeScene(time);
    this.updateBinds(time);
    this.updateTrances(time);
    this.updateVengeance(time, delta);
    this.updateBarrage(time, delta);
    this.updateStyle(time, delta);
    this.updateKillWatch(time);
    this.updateIncomingMults();
    this.updateAvatars(delta, playerIs, npcIs);
    this.paintWorld();
    this.paintScene(delta);
    this.paintHud(playerIs);
    // After `paintHud`, not before: the style meter shares `hudGfx` with the Willpower bar, and
    // that method opens with a `clear()`.
    this.paintMastery();
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7);
    if (!this.sceneGfx) this.sceneGfx = scene.add.graphics().setDepth(12);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /** Willpower, stance upkeep, speed and the hit-detection that drives Sheer Will. */
  private updateSide(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const dt = delta / 1000;

    // ── Did we just get hit? ──
    // Read off the fighter's own running tally rather than claiming its damage callback,
    // which ArenaScene already owns.
    if (f.rawDamageTaken > s.lastRaw + 0.5) {
      s.hurtUntil = time + WILL_HURT_WINDOW_MS;
      // Untouched counts from here. It has to be stamped inside this comparison — by the time
      // `updateStyle` runs, the line below has already caught `lastRaw` up and there is nothing
      // left to notice.
      if (owner === 'player') this.style.lastHurtAt = time;
      if (s.sheerActive) {
        s.retaliateUntil = time + SHEER_RETALIATE_MS;
        s.nextHitBonus = true;
        this.fx(owner).ring(f.x, f.y, 14, 46, JUS.will, 340, 3, 6);
      }
    }
    s.lastRaw = f.rawDamageTaken;

    // ── Indomitable Will (R+) ──
    // The floor is held on the fighter rather than checked here, because the only honest place
    // to stop a death is inside the subtraction that would have caused it.
    const indomitable = s.sheerActive && this.upgraded(owner, 'r');
    f.minHpFloor = indomitable ? INDOMITABLE_FLOOR : 0;
    const onTheFloor = indomitable && f.hp <= INDOMITABLE_FLOOR;
    // Sheer Will (the combo): the floor is the only reason you are still standing here.
    if (onTheFloor && owner === 'player') this.awardStyle('one-hp-survive');

    // ── Willpower ledger ──
    // Regen never stops — the drains are subtracted from it, so Sheer Will nets −5/s
    // while flight on its own is close to free. Combo Excelsius multiplies the regeneration
    // rather than the net, so a rank is worth more the harder you are already spending.
    const regen = WILL_REGEN_PER_SEC * (s.hurtUntil > time ? 1 + WILL_HURT_REGEN_BONUS : 1)
      * (owner === 'player' && this.mastered ? this.rank.will : 1);
    let drain = 0;
    // Refusing to die costs double: on one health the bar is the only thing keeping you there.
    if (s.sheerActive) drain += WILL_DRAIN_SHEER * (onTheFloor ? INDOMITABLE_DRAIN_MULT : 1);
    if (s.form === 'flight') drain += WILL_DRAIN_FLIGHT;
    // Q+ Swift and Blind: for eight seconds after the seraph, the bar simply does not move.
    if (s.blessedUntil > time) s.will = WILL_MAX;
    else s.will = Phaser.Math.Clamp(s.will + (regen - drain) * dt, 0, WILL_MAX);

    if (s.blessedUntil > time) {
      // ...and the stance door swings freely with it.
      f.resetCooldown('justice-flight');
      f.resetCooldown('justice-descend');
    }

    if (s.will <= 0 && (s.sheerActive || s.form === 'flight')) {
      if (!s.exhausted) {
        s.exhausted = true;
        if (owner === 'player') this.style.emptiedAt = time;
        this.api.showFloatingText(f.x, f.y - 46, '💤 WILL SPENT', '#7788aa');
      }
      s.sheerActive = false;
      if (s.form === 'flight') this.leaveFlight(owner, 'Grounded');
    } else if (s.will > 5) {
      s.exhausted = false;
    }

    // ── Stance upkeep ──
    // Speed itself is *pulled* by ArenaScene — see `speedMultFor`.
    f.levitating = s.form === 'flight';

    // ── The seraph set piece holds you in place ──
    if (s.seraphUntil > time) {
      this.body(f).setVelocity(0, 0);
      f.isInvincible = true;
    } else if (s.seraph) {
      s.seraph.destroy();
      s.seraph = null;
      f.isInvincible = false;
      this.fx(owner).ring(f.x, f.y, 60, 150, JUS.white, 520, 5, 8);
      const v = s.tranceVictim;
      if (v && v.active && v.hp > 0) {
        this.api.showFloatingText(v.x, v.y - 44, '🌀 ENTRANCED', '#ffffff');
      }
      // Q+ Swift and Blind: the blessing starts where the form ends, not where it was cast.
      if (this.upgraded(owner, 'q')) {
        s.blessedUntil = time + SWIFT_BLESSING_MS;
        s.exhausted = false;
        this.fx(owner).ring(f.x, f.y, 20, 110, JUS.willPale, 620, 6, 8);
        this.announce(f.x, f.y - 58, '👑 SWIFT AND BLIND', '#a8ccff', 13);
      }
    }

    // ── Hard control from our own effects still applies to us ──
    if (this.isStunned(f)) this.body(f).setVelocity(0, 0);

    // ── F+ : the axe's lunge, written as a position delta ──
    // ArenaScene rebuilds velocity from WASD every frame long before this runs, so a shove
    // pushed into the body would simply be erased. Moving the body itself cannot be.
    if (s.lunge) {
      if (time >= s.lunge.until) {
        s.lunge = null;
      } else {
        const step = (AXE_LUNGE_DIST / AXE_LUNGE_MS) * delta;
        f.setPosition(f.x + s.lunge.vx * step, f.y + s.lunge.vy * step);
        this.clampToArena(f);
      }
    }

    // ── Status tray (player side only) ──
    if (owner === 'player') {
      this.api.setStatusIndicator('justice-sheer', s.sheerActive ? {
        name: 'Sheer Will', emoji: '💙', color: JUS.will,
        description: `+${Math.round((SHEER_SPEED_MULT - 1) * 100)}% speed. Attackers deal 25% less to you for 3s and eat +33% on your next hit. Burns ${WILL_DRAIN_SHEER} Willpower/s.`,
        count: Math.round(s.will), suffix: '', priority: 110,
      } : null);
      this.api.setStatusIndicator('justice-flight', s.form === 'flight' ? {
        name: 'Flight', emoji: '🕊️', color: JUS.pale,
        description: `+33% speed and you hover over ground hazards and your own walls — but you take 20% more damage and burn ${WILL_DRAIN_FLIGHT} Willpower/s.`,
        count: Math.round(s.will), suffix: '', priority: 111,
      } : null);
      this.api.setStatusIndicator('justice-indomitable', indomitable ? {
        name: 'Indomitable Will', emoji: '🛡️', color: JUS.will,
        description: onTheFloor
          ? 'You cannot die. On 1 health the bar is all that is holding you there, and it is burning twice as fast.'
          : 'You cannot be taken below 1 health for as long as Sheer Will is burning. Down there the drain doubles.',
        count: Math.round(f.hp), suffix: ' hp', priority: 112,
      } : null);
      this.api.setStatusIndicator('justice-arena', this.inOwnColiseum('player') ? {
        name: 'My Arena', emoji: '🏛️', color: JUS.gold,
        description: `Standing inside a Coliseum of your own: +${Math.round((WORLD_SPEED_MULT - 1) * 100)}% speed and +${Math.round((WORLD_DAMAGE_MULT - 1) * 100)}% damage on everything Justice deals.`,
        priority: 109,
      } : null);
      this.api.setStatusIndicator('justice-axe', s.axeUntil > time ? {
        name: 'Death from Above', emoji: '🪓', color: JUS.flameCore,
        description: `Click is a ${AXE_DAMAGE}-damage axe on a ${Math.round(800 * AXE_COOLDOWN_MULT)}ms swing that drags you along the way you are already running. Hold the button.`,
        count: Math.ceil((s.axeUntil - time) / 1000), suffix: 's', priority: 113,
      } : null);
      this.api.setStatusIndicator('justice-blessed', s.blessedUntil > time ? {
        name: 'Swift and Blind', emoji: '👑', color: JUS.willPale,
        description: 'Willpower is pinned at full and cannot drain, and taking off or landing costs no cooldown at all.',
        count: Math.ceil((s.blessedUntil - time) / 1000), suffix: 's', priority: 114,
      } : null);
      const r = this.rank;
      this.api.setStatusIndicator('justice-style', this.mastered ? {
        name: `${r.letter} — ${r.name}`, emoji: '🗡️', color: r.color,
        description: `Combo Excelsius. ${Math.round((r.will - 1) * 100)}% faster Willpower, `
          + `${Math.round((r.speed - 1) * 100)}% movement and ${Math.round((1 - r.cooldown) * 100)}% off every cooldown. `
          + `Bleeding ${r.decay} style a second`
          + (this.beyondJustice ? ' — and Judgement Day no longer weighs anybody.' : '.'),
        count: Math.round(this.style.points), suffix: `/${STYLE_PER_RANK}`, priority: 116,
      } : null);
      this.api.setStatusIndicator('justice-vengeance', this.vengeance || this.barrage ? {
        name: 'Vigilante Vengeance', emoji: '🗡️', color: JUS.flameCore,
        description: this.barrage
          ? `${BARRAGE_COUNT} spears coming down, ${BARRAGE_DAMAGE} each, clustered where you pointed. Open angel bites pull them in.`
          : 'Run them through, then kick them off it. Whatever they land on decides the rest.',
        priority: 117,
      } : null);
    }
  }

  /** The Coliseum: a wall that works in both directions, for everyone but its airborne owner. */
  private updateColiseums(time: number, delta: number): void {
    for (const c of this.coliseums) {
      const rise = Math.min(1, (time - c.bornAt) / COLISEUM_RISE_MS);
      const fade = c.until - time < COLISEUM_FADE_MS
        ? Math.min(1, (COLISEUM_FADE_MS - (c.until - time)) / COLISEUM_FADE_MS)
        : 0;
      c.ring.update(delta, c.x, c.y, rise, fade);
      if (rise < 0.6) continue;

      for (const [f, wasInside] of c.inside) {
        if (!f || !f.active || f.hp <= 0) continue;
        // Its owner flies over their own walls. Nobody else does.
        const ownerSide = this.side(c.owner);
        if (f === this.fighter(c.owner) && ownerSide.form === 'flight') continue;

        const d = Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y);
        const ang = Math.atan2(f.y - c.y, f.x - c.x);
        const pad = 18;
        // Above the Law: your own ring is holding somebody who is not you while you fly over it.
        if (c.owner === 'player' && this.sides.player.form === 'flight'
          && f !== this.api.player && Math.abs(d - COLISEUM_RADIUS) <= pad * 2) {
          this.awardStyle('flight-over-own-wall');
        }
        if (wasInside && d > COLISEUM_RADIUS - pad) {
          f.setPosition(c.x + Math.cos(ang) * (COLISEUM_RADIUS - pad), c.y + Math.sin(ang) * (COLISEUM_RADIUS - pad));
          this.body(f).stop();
        } else if (!wasInside && d < COLISEUM_RADIUS + pad) {
          f.setPosition(c.x + Math.cos(ang) * (COLISEUM_RADIUS + pad), c.y + Math.sin(ang) * (COLISEUM_RADIUS + pad));
          this.body(f).stop();
        }
      }

      // Shots die on the wall. Tracked by which side of the ring they were on last
      // frame, so a fast projectile can't tunnel through between two samples.
      for (const child of this.api.projectiles.getChildren()) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const inside = Phaser.Math.Distance.Between(c.x, c.y, proj.x, proj.y) <= COLISEUM_RADIUS;
        const prev = c.projSide.get(proj);
        c.projSide.set(proj, inside);
        if (prev === undefined || prev === inside) continue;
        const ang = Math.atan2(proj.y - c.y, proj.x - c.x);
        const hx = c.x + Math.cos(ang) * COLISEUM_RADIUS;
        const hy = c.y + Math.sin(ang) * COLISEUM_RADIUS;
        this.fx(c.owner).shards(hx, hy, 4, 110, 380);
        this.api.spawnHitFlash(hx, hy, JUS.marble);
        // Objection: only a shot that was aimed at *you* is worth anything.
        if (c.owner === 'player' && !proj.isFromPlayer) this.awardStyle('coliseum-shot');
        proj.destroy();
      }
    }

    const dead = this.coliseums.filter((c) => time >= c.until);
    for (const c of dead) c.ring.destroy();
    if (dead.length) this.coliseums = this.coliseums.filter((c) => time < c.until);
  }

  /** The grappling chain, out to whichever wall it finds. */
  private updateChains(time: number, delta: number): void {
    const dt = delta / 1000;
    const keep: Chain[] = [];
    for (const c of this.chains) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Pierces anything in the way — it does not stop for bodies, only for walls.
      for (const t of this.targetsOf(c.owner)) {
        if (c.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > 26) continue;
        c.hit.add(t);
        t.takeDamage(this.boosted(c.owner, CHAIN_PIERCE_DAMAGE));
        this.api.spawnHitFlash(t.x, t.y, JUS.gold);
        this.fx(c.owner).shards(t.x, t.y, 5, 120, 360);
        // Strung Together: one throw, two bodies.
        if (c.hit.size >= 2) this.awardStyle('chain-pierce-two', c.owner);
      }

      const edge = this.edgeAt(c.x, c.y);
      if (!edge) { keep.push(c); continue; }

      this.anchors = this.anchors.filter((a) => a.owner !== c.owner);
      this.anchors.push({
        owner: c.owner, edge,
        x: Phaser.Math.Clamp(c.x, this.left, this.right),
        y: Phaser.Math.Clamp(c.y, this.top, this.bottom),
        until: time + CHAIN_HOLD_MS,
      });
      this.fx(c.owner).shards(c.x, c.y, 7, 150, 420);
      this.api.spawnHitFlash(c.x, c.y, JUS.gold);
      const f = this.fighter(c.owner);
      this.api.showFloatingText(f.x, f.y - 44, '⛓️ HOOKED — press E', '#f0d68a');
    }
    this.chains = keep;
    this.anchors = this.anchors.filter((a) => time < a.until);
  }

  /** Which arena edge a point has reached, or null while it is still in play. */
  private edgeAt(x: number, y: number): Edge | null {
    if (x <= this.left) return 'left';
    if (x >= this.right) return 'right';
    if (y <= this.top) return 'top';
    if (y >= this.bottom) return 'bottom';
    return null;
  }

  private ripWall(anchor: Anchor, owner: Owner): void {
    const f = this.fighter(owner);
    // You cannot rip out a wall that is already lying somewhere else. The chain simply
    // passes through the gap and comes back with nothing.
    if (this.missingEdges[anchor.edge] > this.now) {
      this.api.showFloatingText(f.x, f.y - 44, '⛓️ Nothing there', '#998877');
      this.fx(owner).motes(anchor.x, anchor.y, 5, 20, 460);
      return;
    }

    this.missingEdges[anchor.edge] = this.now + WALL_MISSING_MS;
    const vertical = anchor.edge === 'left' || anchor.edge === 'right';
    this.walls.push({
      owner,
      edge: anchor.edge,
      travelled: 0,
      span: vertical ? this.bottom - this.top : this.right - this.left,
      hit: new Set(),
    });

    this.avatar(owner)?.play('dash', Math.atan2(anchor.y - f.y, anchor.x - f.x));
    this.fx(owner).rubble(anchor.x, anchor.y, 18, vertical ? 60 : 120);
    this.api.showFloatingText(f.x, f.y - 44, '⛓️ TEAR IT DOWN', '#c9a13a');
    this.awardStyle('chain-anchor-rip', owner);
  }

  /** The ripped-out wall crossing the arena, and what it does to anyone in the way. */
  private updateWalls(delta: number): void {
    const dt = delta / 1000;
    const keep: FlyingWall[] = [];
    for (const w of this.walls) {
      w.travelled += WALL_SPEED * dt;
      const limit = (w.edge === 'left' || w.edge === 'right')
        ? this.right - this.left
        : this.bottom - this.top;

      const face = this.wallFace(w);
      for (const t of this.targetsOf(w.owner)) {
        if (!this.wallTouches(w, t)) continue;
        // Into the Blaze: the wall is doing the moving and the fire is doing the rest.
        if (this.pillars.some((p) => p.owner === w.owner && Math.abs(t.x - p.x) <= PILLAR_HALF_W + 16)) {
          this.awardStyle('wall-pillar', w.owner);
        }
        // Between a Rock: crushed against the outside of one of your own rings.
        if (this.coliseums.some((c) => c.owner === w.owner
          && Math.abs(Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) - COLISEUM_RADIUS) <= 26)) {
          this.awardStyle('wall-coliseum', w.owner);
          this.awardStyle('arena-corner', w.owner);
        }
        // Sentenced and Served: still in the chains a verdict put them in.
        const bind = this.binds.get(t);
        if (bind && bind.by === w.owner && bind.until > this.now) {
          this.awardStyle('bind-then-wall', w.owner);
        }
        // Shoved along in front of it and unable to do anything about it.
        t.setPosition(
          face.nx !== 0 ? face.x + face.nx * (WALL_THICK / 2 + 20) : t.x,
          face.ny !== 0 ? face.y + face.ny * (WALL_THICK / 2 + 20) : t.y,
        );
        this.clampToArena(t);
        this.body(t).setVelocity(face.nx * WALL_SPEED, face.ny * WALL_SPEED);
        this.stun(t, 260);
      }

      // E+ World Maker: a wall you ripped out brings its spikes with it.
      if (this.upgraded(w.owner, 'e')) {
        for (const t of this.targetsOf(w.owner)) {
          if (this.wallTouches(w, t)) this.prick(t, w.owner);
        }
      }

      if (w.travelled < limit) { keep.push(w); continue; }

      // It hits the far side and comes apart.
      const dmg = this.boosted(w.owner, WALL_IMPACT_DAMAGE);
      for (const t of this.targetsOf(w.owner)) {
        t.takeDamage(dmg);
        this.stun(t, WALL_IMPACT_STUN_MS);
        this.api.spawnHitFlash(t.x, t.y, JUS.stone);
        // Compacted: rode it the whole way, and was still in front of it at the far side.
        if (this.wallTouches(w, t)) this.awardStyle('wall-impact', w.owner);
      }
      const cx = face.nx !== 0 ? face.x : (this.left + this.right) / 2;
      const cy = face.ny !== 0 ? face.y : (this.top + this.bottom) / 2;
      this.fx(w.owner).rubble(cx, cy, 26, w.span * 0.6);
      this.fx(w.owner).flash(cx, cy, 70, 8);
      this.api.showFloatingText(cx, cy - 40, '💥 IMPACT', '#e6e1d2');
    }
    this.walls = keep;
  }

  /** The leading face of a flying wall, plus its inward normal. */
  private wallFace(w: FlyingWall): { x: number; y: number; nx: number; ny: number } {
    switch (w.edge) {
      case 'left':   return { x: this.left + w.travelled, y: 0, nx: 1, ny: 0 };
      case 'right':  return { x: this.right - w.travelled, y: 0, nx: -1, ny: 0 };
      case 'top':    return { x: 0, y: this.top + w.travelled, nx: 0, ny: 1 };
      default:       return { x: 0, y: this.bottom - w.travelled, nx: 0, ny: -1 };
    }
  }

  private wallTouches(w: FlyingWall, f: Fighter): boolean {
    const face = this.wallFace(w);
    if (face.nx !== 0) return Math.abs(f.x - face.x) <= WALL_THICK / 2 + 20;
    return Math.abs(f.y - face.y) <= WALL_THICK / 2 + 20;
  }

  // ── World Maker (E+) ───────────────────────────────────────────────────────

  /**
   * One body onto one set of holy spikes. The 2-second wait is per *body* rather than per
   * wall, so backing into a corner where two edges meet is not worth double.
   */
  private prick(target: Fighter, owner: Owner): void {
    const time = this.now;
    if ((this.spikeReadyAt.get(target) ?? 0) > time) return;
    this.spikeReadyAt.set(target, time + SPIKE_CD_MS);
    target.takeDamage(this.boosted(owner, SPIKE_DAMAGE));
    // Nailed to the World: the spikes took the last of them.
    if (target.hp <= 0) this.awardStyle('spike-kill', owner);
    this.api.spawnHitFlash(target.x, target.y, JUS.willPale);
    const fx = this.fx(owner);
    fx.shards(target.x, target.y, 6, 140, 360);
    fx.motes(target.x, target.y, 4, 20, 420);
  }

  /**
   * E+ World Maker: the arena border is a weapon now. Only the sides that are actually still
   * standing bite — a wall that has been torn out and driven across the map left a hole, and a
   * hole has no spikes in it.
   */
  private updateWallSpikes(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.upgraded(owner, 'e')) continue;
      for (const t of this.targetsOf(owner)) {
        const near = (this.missingEdges.left <= time && t.x - this.left <= SPIKE_REACH)
          || (this.missingEdges.right <= time && this.right - t.x <= SPIKE_REACH)
          || (this.missingEdges.top <= time && t.y - this.top <= SPIKE_REACH)
          || (this.missingEdges.bottom <= time && this.bottom - t.y <= SPIKE_REACH);
        if (near) this.prick(t, owner);
      }
    }
    for (const [f] of [...this.spikeReadyAt]) {
      if (!f.active || f.hp <= 0) this.spikeReadyAt.delete(f);
    }
  }

  private updateSpears(delta: number): void {
    const dt = delta / 1000;
    const keep: ThrownSpear[] = [];
    for (const s of this.spears) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const reached = Phaser.Math.Distance.Between(s.x, s.y, s.tx, s.ty) < 18;
      const struck = this.targetsOf(s.owner).find(
        (t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) < 24,
      );
      const outside = !!this.edgeAt(s.x, s.y);
      if (!reached && !struck && !outside) { keep.push(s); continue; }

      const fx = this.fx(s.owner);
      fx.flash(s.x, s.y, SPEAR_BLAST_RADIUS * 0.7, 8);
      fx.ring(s.x, s.y, 8, SPEAR_BLAST_RADIUS, JUS.bright, 400, 4, 6);
      fx.shards(s.x, s.y, 9, 190, 460);
      // Spear of Heaven: two or more inside the burst. Counted before the damage, so a blast
      // that kills one of them still reads as having caught two.
      const caught = this.targetsOf(s.owner)
        .filter((t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= SPEAR_BLAST_RADIUS);
      if (caught.length >= 2) this.awardStyle('spear-airburst', s.owner);
      this.api.dealAoeDamageFromOwner(
        s.x, s.y, SPEAR_BLAST_RADIUS, this.boosted(s.owner, SPEAR_DAMAGE), s.owner,
      );
      // Click+ Hell-Piercer: the flight stance's long-range spear bites too.
      if (this.upgraded(s.owner, 'click')) {
        for (const t of this.targetsOf(s.owner)) {
          if (Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= SPEAR_BLAST_RADIUS) {
            this.addBite(t, s.owner);
          }
        }
      }
    }
    this.spears = keep;
  }

  private updatePillars(time: number, delta: number): void {
    for (const p of this.pillars) {
      p.fx.update(delta, p.x, p.until - time < 500 ? Math.max(0, (p.until - time) / 500) : 1);
      p.tickAccum += delta;
      const ticked = p.tickAccum >= PILLAR_TICK_MS;
      if (ticked) p.tickAccum -= PILLAR_TICK_MS;

      // R+ Indomitable Will: the fire is a wall. Held on whichever side each body was last
      // seen clear of it, so nobody is ever teleported across a pillar they were about to
      // walk into — and the face they are pressed against still burns them, which is the point.
      const solid = this.upgraded(p.owner, 'r');
      const band = PILLAR_HALF_W + 16;
      for (const t of this.targetsOf(p.owner)) {
        const off = t.x - p.x;
        if (Math.abs(off) > band) { p.side.set(t, Math.sign(off) || 1); continue; }
        if (!solid || t.unstoppable) continue;
        const held = p.side.get(t) ?? (Math.sign(off) || 1);
        t.setPosition(p.x + held * band, t.y);
        this.body(t).setVelocityX(0);
        // Held to the Fire: the clock only runs while they are actually pressed against it.
        if (p.owner === 'player' && this.mastered) {
          this.style.pinnedFor.set(t, (this.style.pinnedFor.get(t) ?? 0) + delta);
        }
      }

      if (!ticked) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Math.abs(t.x - p.x) > PILLAR_HALF_W + 16) continue;
        t.takeDamage(this.boosted(p.owner, PILLAR_DAMAGE_PER_TICK));
        this.api.spawnHitFlash(t.x, t.y, JUS.flame);
      }
    }
    const dead = this.pillars.filter((p) => time >= p.until);
    for (const p of dead) p.fx.destroy();
    if (dead.length) this.pillars = this.pillars.filter((p) => time < p.until);
  }

  /** The courtroom: both parties frozen, the scales tipping, then the sentence. */
  private updateJudgeScene(time: number): void {
    const j = this.judge;
    if (!j) return;
    const caster = this.fighter(j.owner);
    const v = j.victim;

    if (time < j.until) {
      this.body(caster).setVelocity(0, 0);
      // The word goes into the placard while the placard is still on screen. It used to be
      // handed to `showFloatingText` at the very end of the scene — which is a no-op these
      // days, and was in any case a caption printed after its own frame had gone.
      const progress = 1 - (j.until - time) / JUDGE_SCENE_MS;
      if (!j.placarded && progress >= VERDICT_AT) {
        j.placarded = true;
        const cx = (this.left + this.right) / 2;
        this.announce(cx, this.top + 84, `⚖️ ${j.tier.label}`, j.tier.color, 22, 1500);
        this.announce(cx, this.top + 108, `${j.damage} DAMAGE ON THE RECORD`, '#e6e1d2', 11, 1500);
      }
      if (v.active && v.hp > 0) {
        // The victim is lifted into the pan — position is written directly, because
        // its own AI rebuilds velocity every frame.
        const pan = this.judgeRig(j, time).seat;
        v.setPosition(pan.x, pan.y);
        this.body(v).setVelocity(0, 0);
        this.stun(v, 120);
      }
      return;
    }

    if (!j.announced) {
      j.announced = true;
      // Damned / Guilty, and the mastery requirement that counts the same thing.
      if (j.tier.bindMs > 0) {
        this.record(j.owner, 'guiltyVerdicts');
        this.awardStyle(j.tier.damned ? 'verdict-damned' : 'verdict-guilty', j.owner);
      }
      // Q+ Swift and Blind: the scales do not only weigh the two of you, they level you.
      if (this.upgraded(j.owner, 'q')) this.swapHealth(caster, v);
      if (j.tier.bindMs > 0 && v.active && v.hp > 0) {
        this.binds.set(v, { until: time + j.tier.bindMs, damned: j.tier.damned, by: j.owner });
        v.applyDisarm(j.tier.bindMs);
        this.fx(j.owner).verdictBeam(v.x, v.y, j.tier.damned ? JUS.damned : JUS.gold, this.api.height, 900, 11);
        this.api.showFloatingText(
          v.x, v.y - 46,
          j.tier.damned ? '⛓️ DAMNED' : '⛓️ SENTENCED',
          j.tier.color,
        );
      } else {
        this.fx(j.owner).motes(v.x, v.y, 10, 30, 800);
      }
    }
    this.judge = null;
  }

  /**
   * Q+ Swift and Blind: the two of you trade health outright.
   *
   * Written straight onto the fighters rather than through damage and healing, because it is
   * neither — nothing here should feed a lifesteal, arm a "next hit" buff, or be mitigated by
   * armour. Each figure is clamped into the receiver's own pool, since the two are rarely the
   * same size, and floored at 1: a swap is a levelling, not a kill.
   */
  private swapHealth(a: Fighter, b: Fighter): void {
    if (!a?.active || !b?.active || a.hp <= 0 || b.hp <= 0) return;
    // Online: the opponent's vitals are network-authoritative and would simply snap back.
    if (a.netGhost || b.netGhost || a.netAuthoritativeDamage || b.netAuthoritativeDamage) return;
    // Co-op: the ally sits in the npc slot, so an allied Justice's scales would otherwise be
    // able to trade health with you. The same flag every hostile damage path is gated on.
    if (a.allyDamageBlocked || b.allyDamageBlocked) return;
    const toA = Phaser.Math.Clamp(Math.round(b.hp), 1, a.maxHp);
    const toB = Phaser.Math.Clamp(Math.round(a.hp), 1, b.maxHp);
    if (toA === a.hp && toB === b.hp) return;
    // Swift and Blind: only style when the trade was actually in your favour.
    if (a === this.api.player && b.hp > a.hp) this.awardStyle('seraph-swap');
    a.hp = toA;
    b.hp = toB;
    const owner: Owner = a === this.api.player ? 'player' : 'npc';
    const fx = this.fx(owner);
    for (const who of [a, b]) {
      fx.ring(who.x, who.y, 8, 62, JUS.willPale, 520, 5, 8);
      fx.motes(who.x, who.y, 8, 26, 700);
    }
    this.announce(a.x, a.y - 50, `⚖️ ${toA} HP`, '#a8ccff', 14, 1300);
    this.announce(b.x, b.y - 50, `⚖️ ${toB} HP`, '#a8ccff', 14, 1300);
  }

  /** The scale rig for the frame, from the shared geometry in JusticeVisuals. */
  private judgeRig(j: JudgeScene, time: number): JudgeRig {
    return judgeRig({
      cx: (this.left + this.right) / 2,
      bottom: this.bottom,
      t: Phaser.Math.Clamp(1 - (j.until - time) / JUDGE_SCENE_MS, 0, 1),
      guilt: Phaser.Math.Clamp(j.damage / 400, 0, 1),
    });
  }

  private updateBinds(time: number): void {
    for (const [f, b] of [...this.binds]) {
      if (!f.active || f.hp <= 0 || time >= b.until) {
        this.binds.delete(f);
        if (f.active && f.hp > 0) this.fx(b.by).chainBurst(f.x, f.y);
        continue;
      }
      // Keep the disarm renewed so nothing else can quietly clear it early.
      f.applyDisarm(80);
    }
  }

  /** The Seraph's trance: the victim walks a straight line to whoever opened its eyes. */
  private updateTrances(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const v = s.tranceVictim;
      if (!v) continue;
      if (time >= s.tranceUntil || !v.active || v.hp <= 0) {
        s.tranceVictim = null;
        s.tranceUntil = 0;
        continue;
      }
      // The form is still up — the trance has not started walking yet.
      if (s.seraphUntil > time) continue;
      if (v.unstoppable || this.isStunned(v)) continue;

      const f = this.fighter(owner);
      const ang = Math.atan2(f.y - v.y, f.x - v.x);
      const dist = Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y);
      // Straight at them, and only stopping once they are on top of you.
      const sp = dist > 34 ? v.speed : 0;
      this.body(v).setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
    }
  }

  /**
   * Every incoming-damage multiplier Justice owns, recomputed from scratch each frame.
   * Written to a dedicated `Fighter` field so it composes with (rather than stomps) the
   * armour and vulnerability other systems hold.
   */
  private updateIncomingMults(): void {
    const time = this.now;
    const seen = new Set<Fighter>();
    const apply = (f: Fighter) => {
      if (!f || seen.has(f)) return;
      seen.add(f);
      let m = 1;
      for (const owner of ['player', 'npc'] as Owner[]) {
        if (!this.isJustice(owner) || this.fighter(owner) !== f) continue;
        const s = this.side(owner);
        if (s.form === 'flight') m *= FLIGHT_VULN_MULT;
        if (s.retaliateUntil > time) m *= SHEER_ATTACKER_MULT;
      }
      const bind = this.binds.get(f);
      if (bind && bind.damned && bind.until > time) m *= DAMNED_VULN_MULT;
      f.justiceIncomingMult = m;
    };
    apply(this.api.player);
    apply(this.api.npc);
    for (const e of this.api.enemies) apply(e);
  }

  // ── Rig ────────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { player, npc, scene } = this.api;

    if (playerIs && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new JusticeAvatar(scene, this.pcol);
      const s = this.sides.player;
      const ax = this.lastAimX || player.x + 1;
      const ay = this.lastAimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(ay - player.y, ax - player.x));
      this.playerAvatar.setFlying(s.form === 'flight');
      this.playerAvatar.setWilling(s.sheerActive);
      this.playerAvatar.setIntensity(s.sheerActive ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // The seraph replaces the character outright for its three seconds.
      const hidden = s.seraphUntil > this.now;
      this.playerAvatar.update(delta, player.x, player.y, hidden || player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new JusticeAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setFlying(s.form === 'flight');
      this.npcAvatar.setWilling(s.sheerActive);
      this.npcAvatar.setIntensity(s.sheerActive ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      const hidden = s.seraphUntil > this.now;
      this.npcAvatar.update(delta, npc.x, npc.y, hidden || npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painters ───────────────────────────────────────────────────────────────

  private paintWorld(): void {
    const gg = this.groundGfx;
    const ag = this.airGfx;
    if (!gg || !ag) return;
    gg.clear();
    ag.clear();
    const time = this.now;

    // ── Missing arena walls ──
    // The border is drawn once by ArenaScene, so a hole is painted rather than erased:
    // a strip of void over the edge, with a torn lip at each end.
    for (const edge of ['top', 'bottom', 'left', 'right'] as Edge[]) {
      const until = this.missingEdges[edge];
      if (until <= time) continue;
      const back = Math.min(1, (until - time) / 700);
      const vertical = edge === 'left' || edge === 'right';
      const ex = edge === 'left' ? this.left : edge === 'right' ? this.right : (this.left + this.right) / 2;
      const ey = edge === 'top' ? this.top : edge === 'bottom' ? this.bottom : (this.top + this.bottom) / 2;
      const len = vertical ? this.bottom - this.top : this.right - this.left;
      gg.fillStyle(0x0d0d1a, 1);
      if (vertical) gg.fillRect(ex - 5, this.top - 2, 10, len + 4);
      else gg.fillRect(this.left - 2, ey - 5, len + 4, 10);
      // Torn stubs where the wall used to key in, so it reads as broken, not missing.
      gg.fillStyle(this.pcol(JUS.stoneDark), 0.9 * back);
      for (const s of [-1, 1]) {
        const tx = vertical ? ex : ex + (s * len) / 2;
        const ty = vertical ? ey + (s * len) / 2 : ey;
        gg.fillTriangle(
          tx, ty,
          tx - (vertical ? 6 : s * 16), ty - (vertical ? s * 16 : 6),
          tx + (vertical ? 6 : 0), ty + (vertical ? 0 : 6),
        );
      }
    }

    // ── E+ World Maker: spiked arena border ──
    // Drawn per owner rather than once, so a skin recolours the right side's iron — and only
    // on edges that are still standing, because the spikes go with the wall when it is torn out.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.upgraded(owner, 'e')) continue;
      const tint = this.col(owner);
      const w = this.right - this.left;
      const h = this.bottom - this.top;
      const mx = (this.left + this.right) / 2;
      const my = (this.top + this.bottom) / 2;
      const rows: [number, number, boolean, number, number, number][] = [
        [this.left, my, true, h, 1, 0],
        [this.right, my, true, h, -1, 0],
        [mx, this.top, false, w, 0, 1],
        [mx, this.bottom, false, w, 0, -1],
      ];
      const edges: Edge[] = ['left', 'right', 'top', 'bottom'];
      rows.forEach(([x, y, vertical, span, nx, ny], i) => {
        if (this.missingEdges[edges[i]] > time) return;
        holySpikes(gg, tint, { x, y, vertical, span, nx, ny, t: this.vizT, alpha: 0.9 });
      });
    }

    // ── Flying walls ──
    for (const w of this.walls) {
      const face = this.wallFace(w);
      const vertical = face.nx !== 0;
      wallSlab(gg, this.col(w.owner), {
        x: vertical ? face.x : (this.left + this.right) / 2,
        y: vertical ? (this.top + this.bottom) / 2 : face.y,
        vertical,
        span: w.span,
        thick: WALL_THICK,
        nx: face.nx, ny: face.ny,
        t: this.vizT,
      });
      // The spikes travel with the slab, on its leading face.
      if (!this.upgraded(w.owner, 'e')) continue;
      holySpikes(gg, this.col(w.owner), {
        x: vertical ? face.x + face.nx * (WALL_THICK / 2) : (this.left + this.right) / 2,
        y: vertical ? (this.top + this.bottom) / 2 : face.y + face.ny * (WALL_THICK / 2),
        vertical,
        span: w.span,
        nx: face.nx, ny: face.ny,
        t: this.vizT,
      });
    }

    // ── Bind chains on the guilty ──
    for (const [f, b] of this.binds) {
      if (!f.active) continue;
      const tint = this.col(b.by);
      const wrap = 3;
      for (let i = 0; i < wrap; i++) {
        const yy = f.y - 12 + i * 12;
        const sway = Math.sin(this.vizT * 3 + i) * 3;
        chainRun(ag, tint, f.x - 20 + sway, yy, f.x + 20 + sway, yy, 0.95, 9, 2.1, 3);
      }
      padlock(ag, tint, f.x, f.y + 2, 7, 0.95);
      if (b.damned) {
        ag.lineStyle(2, this.pcol(JUS.damned), 0.4 + 0.2 * Math.sin(this.vizT * 7));
        ag.strokeCircle(f.x, f.y, 27);
      }
    }

    // ── Live chains, still flying ──
    for (const c of this.chains) {
      const f = this.fighter(c.owner);
      chainRun(ag, this.col(c.owner), f.x, f.y, c.x, c.y, 0.95, 11, 2.4, 6);
      chainHead(ag, this.col(c.owner), c.x, c.y, Math.atan2(c.vy, c.vx));
    }

    // ── Anchored chains, waiting on a recast ──
    for (const a of this.anchors) {
      const f = this.fighter(a.owner);
      const tug = Math.sin(this.vizT * 5) * 3;
      chainRun(ag, this.col(a.owner), f.x, f.y, a.x, a.y, 0.85, 11, 2.2, 10 + tug);
      const tint = this.col(a.owner);
      ag.fillStyle(tint(JUS.gold), 0.9);
      ag.fillCircle(a.x, a.y, 6);
      ag.lineStyle(2, tint(JUS.pale), 0.5 + 0.3 * Math.sin(this.vizT * 8));
      ag.strokeCircle(a.x, a.y, 11 + Math.sin(this.vizT * 8) * 2);
    }

    // ── Thrown spears ──
    for (const s of this.spears) {
      spearShape(ag, this.col(s.owner), s.x - Math.cos(s.angle) * 26, s.y - Math.sin(s.angle) * 26, s.angle, 34, 1, 1);
      ag.fillStyle(this.col(s.owner)(JUS.pale), 0.35);
      ag.fillCircle(s.x - Math.cos(s.angle) * 30, s.y - Math.sin(s.angle) * 30, 4);
    }

    // ── Click+ Hell-Piercer: angel bites ──
    // Spaced evenly around the body so three of them read as three, and painted on the air
    // layer so the wound sits over the fighter rather than under it.
    for (const [f, rec] of this.bites) {
      if (!f.active) continue;
      const live = rec.list.filter((u) => u > time).length;
      if (!live) continue;
      const tint = this.col(rec.by);
      for (let i = 0; i < live; i++) {
        const a = -Math.PI / 2 + (i / BITE_MAX) * Math.PI * 2 + Math.sin(this.vizT * 1.4 + i) * 0.12;
        angelBite(ag, tint, f.x, f.y, 19, a, this.vizT + i);
      }
      // Inside twice the execution threshold, a closing halo says the next melee hit ends it.
      if (f.hp <= f.maxHp * BITE_EXECUTE_PCT * live * 2) {
        ag.lineStyle(2, tint(JUS.white), 0.25 + 0.35 * Math.sin(this.vizT * 9));
        ag.strokeCircle(f.x, f.y, 30);
      }
    }

    // ── Trance beams ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const v = s.tranceVictim;
      if (!v || !v.active || s.tranceUntil <= time || s.seraphUntil > time) continue;
      const f = this.fighter(owner);
      tranceBeams(ag, this.col(owner), v.x, v.y, Math.atan2(f.y - v.y, f.x - v.x), this.vizT);
    }
  }

  /**
   * The mastery's world art: the vengeance rig, the barrage, and the style meter.
   *
   * The meter is HUD and everything else is world, but they share a pass because both are
   * player-only and both are switched off by the same question — is the mastery even on.
   */
  private paintMastery(): void {
    const ag = this.airGfx;
    const hg = this.hudGfx;
    if (!ag) return;
    const time = this.now;

    // ── Vigilante Vengeance, ground ──
    const v = this.vengeance;
    if (v) {
      const f = this.api.player;
      if (v.phase === 'dash') {
        // The charge: a wedge of afterimages back to where it started.
        for (let i = 1; i <= 5; i++) {
          const p = i / 6;
          ag.fillStyle(this.pcol(JUS.pale), 0.22 * (1 - p));
          ag.fillCircle(f.x + (v.fromX - f.x) * p, f.y + (v.fromY - f.y) * p, 16 * (1 - p * 0.5));
        }
        spearShape(ag, this.pcol, f.x, f.y, v.angle, 54, 1, 1.1);
      } else if (v.phase === 'impale' && v.victim) {
        const t = Phaser.Math.Clamp(1 - (v.until - time) / IMPALE_HOLD_MS, 0, 1);
        impaleRig(ag, this.pcol, v.victim.x, v.victim.y, v.angle, t * 0.5);
      } else if (v.phase === 'launch' && v.victim) {
        impaleRig(ag, this.pcol, v.victim.x, v.victim.y, v.angle, 0.5 + Math.min(0.5, v.flown / 200));
        // A comet tail on whatever is being thrown.
        for (let i = 1; i <= 5; i++) {
          ag.fillStyle(this.pcol(JUS.flame), 0.2 * (1 - i / 6));
          ag.fillCircle(v.victim.x - Math.cos(v.angle) * i * 14,
            v.victim.y - Math.sin(v.angle) * i * 14, 14 - i * 2);
        }
      }
    }

    // ── Vigilante Vengeance, flight ──
    const b = this.barrage;
    if (b) {
      for (const s of b.spears) {
        if (s.dead || time < s.bornAt) continue;
        // Above the ceiling it is still falling in from off screen; draw the shadow only.
        if (s.y < this.top) {
          ag.fillStyle(this.pcol(JUS.pale), 0.25);
          ag.fillEllipse(s.x, this.top + 4, 7, 2.5);
          continue;
        }
        barrageSpear(ag, this.pcol, s.x, s.y, s.angle, 26);
      }
    }

    // ── The style meter ──
    if (!hg || !this.mastered) {
      this.styleLabel?.setVisible(false);
      this.styleName?.setVisible(false);
      return;
    }
    const s = this.style;
    const r = this.rank;
    const w = 230, h = 11;
    const x = this.api.width - w - 26;
    const y = this.top + 8;
    const heat = Phaser.Math.Clamp((s.heatUntil - time) / STYLE_HEAT_MS, 0, 1);
    styleMeter(hg, this.pcol, x, y, w, h, s.points / STYLE_PER_RANK, r.color,
      heat, s.points < 18 && s.rank > 0, this.vizT);

    if (!this.styleLabel) {
      this.styleLabel = this.api.scene.add.text(x + w + 8, y + h / 2 - 1, '', {
        fontSize: '22px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffffff', stroke: '#05070f', strokeThickness: 5,
      }).setOrigin(0, 0.5).setDepth(21).setScrollFactor(0);
    }
    if (!this.styleName) {
      this.styleName = this.api.scene.add.text(x + w, y + h + 6, '', {
        fontSize: '9px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#8a8f9c', stroke: '#05070f', strokeThickness: 3,
      }).setOrigin(1, 0).setDepth(21).setScrollFactor(0);
    }
    this.styleLabel.setVisible(true).setText(r.letter).setColor(r.text)
      // A rank that has just gone up leans into the screen for a moment.
      .setScale(1 + heat * 0.18);
    this.styleName.setVisible(true).setText(r.name).setColor(r.text);

    if (this.beyondLabel && s.beyondUntil > 0) {
      this.beyondLabel.setAlpha(Phaser.Math.Clamp((s.beyondUntil - time) / 600, 0, 1));
      this.beyondLabel.setScale(1 + Math.sin(this.vizT * 14) * 0.03);
    }
  }

  /** The two set pieces, plus the seraph itself. */
  private paintScene(delta: number): void {
    const g = this.sceneGfx;
    if (!g) return;
    g.clear();
    const time = this.now;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!s.seraph) continue;
      const f = this.fighter(owner);
      const elapsed = SERAPH_FORM_MS - (s.seraphUntil - time);
      const grow = Phaser.Math.Clamp(elapsed / 420, 0, 1) * Phaser.Math.Clamp((s.seraphUntil - time) / 300, 0, 1);
      const v = s.tranceVictim;
      const look = v && v.active ? Math.atan2(v.y - f.y, v.x - f.x) : 0;
      s.seraph.update(delta, f.x, f.y, grow, look);
    }

    const j = this.judge;
    if (!j || time >= j.until) return;
    const r = this.judgeRig(j, time);
    const tint = this.col(j.owner);
    // The word on the placard is Text, dropped by showFloatingText when the sentence lands —
    // the plate the painter draws is the frame it appears in.
    drawJudgeScene(g, tint, r, {
      width: this.api.width,
      height: this.api.height,
      top: this.top,
      cx: (this.left + this.right) / 2,
      fade: r.t < 0.12 ? r.t / 0.12 : r.t > 0.9 ? (1 - r.t) / 0.1 : 1,
      placardColor: j.tier.damned ? this.pcol(JUS.damned) : tint(JUS.gold),
    });
  }

  /** The Willpower meter — the one number both stances spend. */
  private paintHud(playerIsJustice: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    if (!playerIsJustice) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const w = 190, h = 12;
    const x = this.left + 8;
    const y = this.top + 8;
    const ratio = s.will / WILL_MAX;

    // Draining reads red-hot at the bottom of the bar; regen glows.
    const low = ratio < 0.25;
    willMeter(g, this.pcol, x, y, w, h, ratio);

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, y + h + 3, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#a8ccff',
        stroke: '#05070f',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    const p = this.api.player;
    const indomitable = s.sheerActive && this.upgraded('player', 'r');
    const regen = WILL_REGEN_PER_SEC * (s.hurtUntil > this.now ? 1 + WILL_HURT_REGEN_BONUS : 1);
    const sheerDrain = s.sheerActive
      ? WILL_DRAIN_SHEER * (indomitable && p.hp <= INDOMITABLE_FLOOR ? INDOMITABLE_DRAIN_MULT : 1)
      : 0;
    const net = regen - sheerDrain - (s.form === 'flight' ? WILL_DRAIN_FLIGHT : 0);
    // Q+ holds the bar still, so the rate the HUD prints has to say so rather than lying
    // about a drain that is not happening.
    const blessed = s.blessedUntil > this.now;
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(blessed
      ? `WILLPOWER ${Math.round(s.will)}  👑 HELD`
      : `WILLPOWER ${Math.round(s.will)}  ${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)}/s`);
    this.hudLabel.setColor(blessed ? '#fff3cf' : low ? '#ff8899' : '#a8ccff');
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Everything Justice does to one fighter's movement, as a single factor.
   *
   * ArenaScene *pulls* this while it rebuilds the frame's speed multipliers, because that
   * block runs long before `update()` does — a push from here would be wiped before it was
   * ever read.
   */
  private speedMultFor(f: Fighter, owner: Owner): number {
    let m = 1;
    if (this.isJustice(owner) && this.fighter(owner) === f) {
      const s = this.side(owner);
      if (s.sheerActive) m *= SHEER_SPEED_MULT;
      if (s.form === 'flight') m *= FLIGHT_SPEED_MULT;
      // E+ World Maker: your own arena carries you.
      if (this.inOwnColiseum(owner)) m *= WORLD_SPEED_MULT;
      // Combo Excelsius: style is speed.
      if (owner === 'player' && this.mastered) m *= this.rank.speed;
      // The vengeance dash and the impale both drive the body themselves, as position deltas —
      // WASD on top of that would fight the charge for control of it.
      if (owner === 'player' && this.vengeance && this.vengeance.phase !== 'launch') m = 0;
    }
    // Anything standing in a hostile wall of fire wades.
    for (const p of this.pillars) {
      if (p.owner === owner) continue;
      if (Math.abs(f.x - p.x) <= PILLAR_HALF_W + 16) { m *= PILLAR_SLOW_MULT; break; }
    }
    return m;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor(this.api.player, 'player'); }
  getNpcSpeedMult(): number { return this.speedMultFor(this.api.npc, 'npc'); }

  /** Which stance a side is in. */
  getForm(owner: Owner): JusticeForm { return this.side(owner).form; }

  getWill(owner: Owner): number { return this.side(owner).will; }

  isSheerWillActive(owner: Owner): boolean { return this.side(owner).sheerActive; }

  /** True while a set piece owns the caster — ArenaScene must not let it move or act. */
  isLocked(owner: Owner): boolean {
    const s = this.side(owner);
    if (s.seraphUntil > this.now) return true;
    // The vengeance charge drives the body itself; WASD must not fight it for control.
    if (owner === 'player' && this.vengeance && this.vengeance.phase !== 'launch') return true;
    return !!this.judge && this.judge.owner === owner && this.judge.until > this.now;
  }

  /** True while a body is being carried by the vengeance kick — its own AI must stand down. */
  isBeingKicked(f: Fighter): boolean {
    return !!this.vengeance && this.vengeance.victim === f && this.vengeance.phase !== 'dash';
  }

  /** True while this fighter is being held in the scales. */
  isOnTrial(f: Fighter): boolean {
    return !!this.judge && this.judge.victim === f && this.judge.until > this.now;
  }

  /** X of the nearest hostile flame pillar to `f`, or null. Drives the NPC's avoidance. */
  getHostilePillarX(f: Fighter): number | null {
    let best: number | null = null;
    let bestD = Infinity;
    for (const p of this.pillars) {
      if (!this.targetsOf(p.owner).includes(f)) continue;
      const d = Math.abs(f.x - p.x);
      if (d < bestD) { bestD = d; best = p.x; }
    }
    return best;
  }

  /** Half-width of a pillar's danger band, including a body's worth of margin. */
  get pillarAvoidHalfWidth(): number { return PILLAR_HALF_W + 34; }

  /** Whether a chain is hooked and waiting on a recast — the NPC's cue to pull. */
  hasAnchor(owner: Owner): boolean { return this.anchors.some((a) => a.owner === owner); }

  /**
   * Ability tray fill. Sheer Will and Flight are toggles, so their cards read "on"
   * rather than counting down a cooldown nobody is waiting for.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;
    if (abilityId === 'justice-sheer-will' && s.sheerActive) return 1;
    if (abilityId === 'justice-flight' && s.form === 'flight') return 1;
    if (abilityId === 'justice-bind' && this.hasAnchor('player')) return 1;
    if (abilityId === VENGEANCE_ID) {
      return Phaser.Math.Clamp((time - this.vengeanceAt) / VENGEANCE_COOLDOWN_MS, 0, 1);
    }
    void time;
    return p.getCooldownRatio(abilityId);
  }
}
