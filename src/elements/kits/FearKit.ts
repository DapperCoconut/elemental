import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import { Sfx } from '../../audio';
import { FONT_DISPLAY } from '../../ui/Theme';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import {
  FEAR, FearAvatar, FearColorFn, FearFx,
  drawBloodPuddle, drawBodyChart, drawButcherHook, drawClosingWalls, drawDragChain, drawDrainLine, drawFearMeter,
  drawFlashlightMask, drawFrozenFear, drawGashes, drawGazeCone, drawGraspCone, drawHole, drawHookSpin, drawJumpscare,
  drawMacheteStab, drawPhobia, drawRedacted, drawRune, drawSignatureCone, drawStatue, drawVignette,
} from './FearVisuals';
import { FearMazeRun } from './FearMazeRun';

type Owner = 'player' | 'npc';
type Body = Phaser.Physics.Arcade.Body;
interface Pt { x: number; y: number }
const BOTH: Owner[] = ['player', 'npc'];

/** Fear keeps Silence's element id — saves, recipes, courts and campaign tables all know it by that name. */
export const FEAR_ELEMENT_ID = 'silence';

export const FEAR_ID = {
  phobia: 'fear-phobia',
  grasp: 'fear-grasp',
  gaze: 'fear-gaze',
  manifest: 'fear-manifest',
  claustro: 'fear-claustrophobia',
  massacre: 'fear-massacre',
  haunt: 'fear-haunt',
  signature: 'fear-signature',
  descent: 'fear-descent',
  fall: 'fear-fall',
} as const;

/** The slasher's five keys, in tray order, against the gentleman's five. */
const SLASHER_OF: Record<string, string> = {
  [FEAR_ID.phobia]: FEAR_ID.massacre,
  [FEAR_ID.grasp]: FEAR_ID.haunt,
  [FEAR_ID.gaze]: FEAR_ID.signature,
  [FEAR_ID.manifest]: FEAR_ID.descent,
  [FEAR_ID.claustro]: FEAR_ID.fall,
};

// ── Tuning ───────────────────────────────────────────────────────────────────

const FEAR_MAX = 100;

/** Reassurance */
const DRAIN_RANGE = 120;
const DRAIN_TICK_MS = 500;
/** Damage and healing per second, per point of fear on the victim (100 fear = 10 a second). */
const DRAIN_PER_FEAR = 0.1;
const FLEE_RANGE = 170;
const FLEE_MS = 2500;
/** What a fled victim is left with, and how long before they can be routed again. */
const FLEE_RESET_FEAR = 60;
const FLEE_SAFE_MS = 5000;

/** Phobia */
const PHOBIA_CAP = 4;
const PHOBIA_R = 22;
const GREY_DAMAGE_MULT = 0.55;
const GREY_BACKLASH = 3;

/** Fear's Grasp */
const GRASP_RANGE = 150;
const GRASP_HALF = 0.66;
const GRASP_MS = 360;
const GRASP_HIT_MS = 150;
const GRASP_DMG = 12;
const GRASP_FEAR = 10;

/** Gaze */
const GAZE_MS = 3000;
const GAZE_SCARE_MS = 2500;
const GAZE_HALF_MIN = 0.2;
const GAZE_HALF_MAX = 0.6;
const GAZE_GROW_PER_S = 0.16;
const GAZE_MIN_LEN = 230;
const GAZE_FEAR_PER_S = 22;
const GAZE_DMG_PER_S = 10;
const SCARE_FEAR = 30;
const SCARE_FREEZE_MS = 3000;

/** Manifest */
export const MANIFEST_FEAR = 50;
const SLASHER_SPEED = 0.3325;
const SLASHER_SCALE = 1.35;
const SPEED_STACK = 0.3;
const RUNE_HP = 25;
const RUNE_R = 18;
const RUNE_TOUCH = 46;
const RUNE_TOUCH_DPS = 14;
/** How close a wandering bot has to stumble before it notices the rune. */
const RUNE_NOTICE = 240;
/** Husks never hunt the rune, so an Invasion slasher runs on a clock instead. */
const INVASION_SLASHER_MS = 20000;
const LIGHT_HALF = 0.42;
const LIGHT_LEN = 250;

/** Massacre */
const STAB_RANGE = 132;
const STAB_MIN = 44;
/** Half the blade's width: how far outside a body the point can stop and still be in it. */
const STAB_W = 5;
const MASSACRE_DMG = 28;
const MASSACRE_PER_FEAR = 0.3;
const STAB_MS = 230;

// Body parts
const HEAD = 0;
const HEART = 1;
const ARM_L = 2;
const ARM_R = 3;
const LEG_L = 4;
const LEG_R = 5;
type Part = 0 | 1 | 2 | 3 | 4 | 5;
const PARTS: readonly Part[] = [HEAD, HEART, ARM_L, ARM_R, LEG_L, LEG_R];
/** A part's wound runs 0–100: damaged (pink) from 35, severe (red) at 100. */
const WOUND_DAMAGED = 35;
const WOUND_SEVERE = 100;
const woundLevel = (w: number): 0 | 1 | 2 => (w >= WOUND_SEVERE ? 2 : w >= WOUND_DAMAGED ? 1 : 0);
/** One stab damages a limb or the head and three make it severe; the heart takes two and five. */
const WOUND_STAB = 35;
const WOUND_STAB_HEART = 20;
const WOUND_SLAM = 10;
const WOUND_SIG = 60;
/** The heart is the middle third of the hitbox; a hand is caught within this of its centre. */
const HEART_R = 0.34;
const HAND_R = 12;
/** By level (sound / damaged / severe). Arms and legs are per limb. */
const ARM_COOLDOWN = [0, 0.12, 0.25];
const LEG_SLOW = [0, 0.12, 0.22];
const HEAD_SLOW = [0, 0.06, 0.12];
const HEART_TAKEN = [1, 1.15, 1.3];
/** Percent of max health a second per severe part; each other hurt part is another 10% on top. */
const BLEED_PART = 0.3;
const BLEED_HEART = 0.9;
const BLEED_STACK = 0.1;
/** A boss husk's health bar is not a duellist's: the percentage is taken of at most this much. */
const BLEED_HP_CAP = 400;
const PUDDLE_MS = 14000;
const PUDDLE_CAP = 48;

// Slasher E
const HAUNT_SLOW = 0.85;
const HAUNT_GRACE_MS = 700;
const HAUNT_FAR = 460;
const HAUNT_RATE_FAR = 0.08;
const HAUNT_RATE_NEAR = 0.55;
const SPIN_MIN_MS = 1200;
const SPIN_MAX_MS = 4200;
const SPIN_RADIUS = 96;
const SPIN_RAD_PER_S = 9.5;
const HOOK_R = 12;
const DRAG_MS = 5000;
const DRAG_LEN = 50;
/** Hauling a body, he finds some speed: without it no butcher's hook is ever in reach. */
const DRAG_SPEED = 1.5;
const SLAM_REACH = 56;
const SLAM_DMG = 22;
const SLAM_STUN_MS = 500;
const HOOK_SNARE_R = 34;
const SNARE_MS = 3000;
const SNARE_BLEED = 3;

// Slasher R
const SIG_ROUNDS = 3;
const SIG_AIM_MS = 2000;
const SIG_ARMED_MS = 1000;
/** One degree, all told. */
const SIG_HALF = Math.PI / 360;
/** From the click to the line going live. */
const SIG_DELAY_MS = 1500;
/** How long he is out in the arena after cutting through somebody, before he is back on the wall. */
const SIG_AWAY_MS = 320;
const SIG_DMG = 26;

/** They Will Fall */
const HOLE_R0 = 34;
const HOLE_GROW_PER_S = 9;
const HOLE_MAX = 250;
const HOLE_MS = 26000;
const HOLE_HUSK_DMG = 60;
const MAZE_MS = 45000;
const MAZE_CATCH_DMG = 75;
const REDACTED_MS = 3000;

/** Claustrophobia */
const CLAUSTRO_MS = 22000;
const CLAUSTRO_MIN_HALF = 58;
const CLAUSTRO_FEAR_PER_S = 2.5;
const STATUE_HP = 100;
const STATUE_R = 24;
const STATUE_TOUCH = 48;
const STATUE_TOUCH_DPS = 28;
const STATUE_NEAR = 95;
const STATUE_TELL_MS = 3000;
const STATUE_TRAP_DMG = 40;
const STATUE_TRAP_FEAR = 20;
const CRUSH_INVASION_DMG = 120;

const SCARE_SHOW_MS = 900;
const FEAR_RELAY_MS = 200;

// ── Types ────────────────────────────────────────────────────────────────────

interface Statue { hp: number; real: boolean; nearMs: number; bleed: number; flash: number; breathAt: number }

interface Phobia {
  id: number;
  x: number; y: number;
  seed: number;
  born: number;
  gazeHalf: number;
  /** Fear's Grasp: when this one's claw went out, and whether it has landed yet. */
  clawAt: number;
  clawAng: number;
  clawHit: boolean;
  statue: Statue | null;
}

interface Signature {
  round: number;
  phase: 'aim' | 'wind' | 'armed';
  phaseAt: number;
  /** His spot on the wall (the line's apex) and the line's angle. */
  x: number; y: number; ang: number;
  /** He is out cutting through somebody until then; 0 = on the wall. */
  awayUntil: number;
  botArmAt: number;
  /** Who this round's line has already cut: once each per round. */
  struck: Set<Fighter>;
}

/** Haunt let go: the hook going round. Its angle is a function of the clock, so every machine agrees on it. */
interface Spin { start: number; until: number; ang0: number; whooshAt: number }

interface Side {
  phobias: Phobia[];
  nextId: number;
  form: 'fear' | 'slasher';
  slasherUntil: number;
  slasherSince: number;
  speedStacks: number;
  rune: { x: number; y: number; hp: number; flash: number } | null;
  haunt: { charge: number; since: number } | null;
  spin: Spin | null;
  drag: { victim: Fighter; until: number } | null;
  sig: Signature | null;
  stab: { at: number; ang: number; reach: number } | null;
  gaze: { until: number; scared: Set<Fighter> } | null;
  hole: { x: number; y: number; r: number; start: number; fell: Map<Fighter, number> } | null;
  claustro: { start: number; botPick: number } | null;
  aimX: number; aimY: number;
  wasLeft: boolean;
  drainAt: number;
  relayAt: number;
  relayed: number;
  /** Online replica: which statues are occupied, if that arrived before the cast it belongs to. */
  pendingBits: number;
}

function makeSide(): Side {
  return {
    phobias: [], nextId: 1, form: 'fear', slasherUntil: 0, slasherSince: 0, speedStacks: 0, rune: null,
    haunt: null, spin: null, drag: null, sig: null, stab: null, gaze: null, hole: null, claustro: null,
    aimX: 0, aimY: 0, wasLeft: false, drainAt: 0, relayAt: 0, relayed: -1, pendingBits: -1,
  };
}

/** What Fear has done to one body. */
interface Victim {
  /** Whose fear this is. */
  by: Owner;
  fear: number;
  fleeUntil: number;
  fleeSafeUntil: number;
  fleeing: boolean;
  frozenUntil: number;
  gazeMs: number;
  /** The slasher's work, by `Part`: 0–100 each. */
  wounds: number[];
  /** When each part was last cut (the chart flashes it). */
  woundAt: number[];
  bleedAt: number;
  bleedCarry: number;
  puddleAt: number;
  swimAt: number;
  /** Hanging on a butcher's hook until then, and where. */
  snaredUntil: number;
  snareX: number; snareY: number;
  /** Extra wounds that are only paint (the maze). */
  bloodied: number;
  seed: number;
  /** A line is being drawn from this body to whatever is drinking it. */
  drain: { x: number; y: number } | null;
  drainCarry: number;
  gazeCarry: number;
}

interface Maze {
  owner: Owner;
  victim: Fighter;
  run: FearMazeRun;
  victimWasInvincible: boolean;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FearArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get wKey(): Phaser.Input.Keyboard.Key;
  get aKey(): Phaser.Input.Keyboard.Key;
  get sKey(): Phaser.Input.Keyboard.Key;
  get dKey(): Phaser.Input.Keyboard.Key;
  /** The player's live element as this kit sees it (Quantum reports a carried Fear as itself). */
  get elementId(): string;
  get npcElementId(): string;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  get width(): number;
  get height(): number;
  /** 0 (flawless) … ~0.5 (easy): the bot's `castSkipChance`. */
  get npcSlack(): number;
  get abilityBars(): Array<{ abilityId: string; lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  isTargetable(f: Fighter): boolean;
  fearColor(owner: Owner, base: number): number;
  skinId(owner: Owner): string | null;
  buildPlayerContext(x: number, y: number): CastContext;
  /** While in the future, WASD is blocked and whatever velocity the kit set stands. */
  setPlayerYankUntil(t: number): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
}

// ── FearKit ──────────────────────────────────────────────────────────────────

/**
 * Fear — a dapper gentleman behind a blank white mask, and what he turns into.
 *
 * Every enemy carries a **fear** meter (0–100). *Reassurance* drinks it: stand next to a frightened
 * enemy — or leave a phobia next to one — and a grey line drains them and heals you, harder the
 * more afraid they are. An enemy at full fear runs from you, taking a third more damage as they go.
 *
 * - **Phobia** — a ghostly copy of you at the cursor. Enemy shots that pass through one go grey,
 *   hit softer and bite the shooter.
 * - **Fear's Grasp** — every phobia slashes a claw toward the cursor: damage and 10 fear.
 * - **Gaze** — every phobia opens its mask and shines its eye at you for three seconds. Enemies in
 *   a cone gain fear fast and widen it; 2.5s inside is a jumpscare — frozen for 3s, +30 fear.
 * - **Manifest** (50 fear on the field) — become the slasher: invincible, 67% slower, the enemy's
 *   sight cut to a flickering flashlight. A 25hp rune on the arena's edge undoes it.
 *   Massacre / Haunt / Signature Move / Shadowy Descent / They Will Fall are the slasher's keys.
 *   He works on a body part by part (see "Body parts"): a stab cuts where it lands, Haunt's hook
 *   drags them to a slam or a butcher's hook, and the chart of it is on his screen alone.
 * - **Claustrophobia** — the walls close in and the phobias turn to marble. Break any statue to
 *   stop it; half of them are trapped, and the trapped ones bleed if you stand by them and watch.
 *
 * Each side has its own state. Online the owner's sim decides every hit and every roll; what the
 * other machine cannot derive travels as `fear-*` pseudo-casts (see `replayNet`).
 */
export class FearKit {
  private api: FearArenaApi;
  private readonly pcol: FearColorFn;
  private readonly ncol: FearColorFn;
  private readonly pfx: FearFx;
  private readonly nfx: FearFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;

  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Over the darkness: the rune has to be findable by flashlight or without one. */
  private topGfx: Phaser.GameObjects.Graphics | null = null;
  private screenGfx: Phaser.GameObjects.Graphics | null = null;
  private darkRect: Phaser.GameObjects.Rectangle | null = null;
  private darkHoles: Phaser.GameObjects.Graphics | null = null;
  private redactedText: Phaser.GameObjects.Text | null = null;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private victims = new Map<Fighter, Victim>();
  private greyed = new WeakSet<Projectile>();
  private struck = new WeakSet<Projectile>();
  private maze: Maze | null = null;
  private redacted: { owner: Owner; victim: Fighter; start: number; screams: number } | null = null;
  private scare: { start: number; variant: 0 | 1 } | null = null;
  private pulseUntil = 0;
  private npcYankUntil = 0;
  /** Blood on the floor. Paint only. */
  private puddles: Array<{ x: number; y: number; r: number; born: number; seed: number; by: Owner }> = [];
  private hooks: Pt[] | null = null;
  /** Whose body the slasher's chart is showing: the last one he cut. */
  private chartOf: Fighter | null = null;
  private barsSlasher = false;
  private scaled = new Map<Fighter, number>();
  private camTilted = false;
  private vizT = 0;

  constructor(api: FearArenaApi) {
    this.api = api;
    this.pcol = (base) => api.fearColor('player', base);
    this.ncol = (base) => api.fearColor('npc', base);
    this.pfx = new FearFx(api.scene, this.pcol);
    this.nfx = new FearFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): FearFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): FearColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): BaseAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private bodyR(f: Fighter): number { return (f.body as Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private dist(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }

  private isFear(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === FEAR_ELEMENT_ID : this.api.npcElementId === FEAR_ELEMENT_ID;
  }

  /**
   * Whether this sim decides what this side's kit does. An online opponent (or a co-op ally in the
   * npc slot of an Invasion) is simulated on its own machine: here it is drawn, nothing more.
   */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.api.isOnline && !this.api.isInvasion);
  }

  /** A one-on-one bout: the only place there is somebody to drop down a hole. */
  private isDuel(): boolean { return !this.api.isInvasion; }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner, x?: number, y?: number): Fighter | null {
    const f = this.fighter(owner);
    const ox = x ?? f.x;
    const oy = y ?? f.y;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = this.dist(ox, oy, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** Something the other machine has to be told (we are the owner, and there is another machine). */
  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private refund(owner: Owner, id: string): void {
    if (this.simulates(owner)) this.fighter(owner).resetCooldown(id);
  }

  private sfx(owner: Owner, name: string, x: number, rate = 1, volume = 0.7): void {
    Sfx.playAt(name, x, { rate, volume: owner === 'player' ? volume : volume * 0.7 });
  }

  /** Every Fear hit goes through here — and only on the sim that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, opts?: DamageOpts): void {
    if (!this.simulates(owner) || dmg <= 0) return;
    const f = this.fighter(owner);
    t.takeDamage(Math.max(1, Math.round(dmg)), { source: f, sourceX: f.x, sourceY: f.y, ...opts });
  }

  private stun(f: Fighter, ms: number): void {
    if (ms <= 0) return;
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  /**
   * Take a body's legs for a moment and move it ourselves. Never on a replica: its position is
   * somebody else's stream. A husk has no hook for this, so it is simply held still.
   */
  private drive(f: Fighter, vx: number, vy: number, ms: number): void {
    if (f.netGhost) return;
    const body = f.body as Body | null;
    if (!body) return;
    if (f === this.api.player) this.api.setPlayerYankUntil(this.now + ms);
    else if (f === this.api.npc) {
      this.npcYankUntil = Math.max(this.npcYankUntil, this.now + ms);
      // ArenaScene scales the bot's velocity by its speed mult after us; undo our own share of it
      // so a slasher's lunge is the same lunge whoever is wearing him.
      const own = this.speedFor('npc');
      if (own > 0.05) { vx /= own; vy /= own; }
    }
    else { f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms); return; }
    body.setVelocity(vx, vy);
  }

  private place(f: Fighter, x: number, y: number): void {
    if (f.netGhost) return;
    const body = f.body as Body | null;
    if (body) body.reset(x, y); else f.setPosition(x, y);
  }

  private inCone(ax: number, ay: number, ang: number, half: number, len: number, t: Fighter): boolean {
    const dx = t.x - ax;
    const dy = t.y - ay;
    const d = Math.hypot(dx, dy);
    const r = this.bodyR(t);
    if (d > len + r) return false;
    if (d < r) return true;
    const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - ang));
    return off <= half + Math.asin(Math.min(1, r / d)) * 0.6;
  }

  private randomEdge(): { x: number; y: number } {
    const b = this.api.bounds;
    const m = 34;
    const edge = Math.floor(Math.random() * 4);
    const rx = Phaser.Math.Between(b.left + m, b.right - m);
    const ry = Phaser.Math.Between(b.top + m, b.bottom - m);
    if (edge === 0) return { x: rx, y: b.top + m };
    if (edge === 1) return { x: rx, y: b.bottom - m };
    if (edge === 2) return { x: b.left + m, y: ry };
    return { x: b.right - m, y: ry };
  }

  private mirrorX(x: number): number { return this.api.width - x; }

  private live(owner: Owner): Phobia[] { return this.side(owner).phobias.filter((p) => !p.statue); }

  // ── Fear ───────────────────────────────────────────────────────────────────

  private victim(t: Fighter, by: Owner): Victim {
    let v = this.victims.get(t);
    if (!v) {
      v = {
        by, fear: 0, fleeUntil: 0, fleeSafeUntil: 0, fleeing: false, frozenUntil: 0, gazeMs: 0,
        wounds: [0, 0, 0, 0, 0, 0], woundAt: [-1e9, -1e9, -1e9, -1e9, -1e9, -1e9],
        bleedAt: 0, bleedCarry: 0, puddleAt: 0, swimAt: 0, snaredUntil: 0, snareX: 0, snareY: 0, bloodied: 0,
        seed: 1 + Math.floor(Math.random() * 9973), drain: null, drainCarry: 0, gazeCarry: 0,
      };
      this.victims.set(t, v);
    }
    v.by = by;
    return v;
  }

  /** How afraid `t` is, 0–100. */
  fearOf(t: Fighter): number { return this.victims.get(t)?.fear ?? 0; }

  /** All the fear this side has put on the field. */
  fearTotal(owner: Owner): number {
    let sum = 0;
    for (const t of this.targetsOf(owner)) sum += this.fearOf(t);
    return sum;
  }

  private addFear(owner: Owner, t: Fighter, amount: number): void {
    if (!this.simulates(owner) || !this.alive(t)) return;
    const v = this.victim(t, owner);
    const before = v.fear;
    v.fear = Phaser.Math.Clamp(v.fear + amount, 0, FEAR_MAX);
    if (amount >= 8 && v.fear > before) this.fx(owner).fearBurst(t.x, t.y - this.bodyR(t), amount);
  }

  private startFlee(owner: Owner, t: Fighter): void {
    const v = this.victim(t, owner);
    v.fleeUntil = this.now + FLEE_MS;
    v.fleeing = true;
    t.fearFleeUntil = Date.now() + FLEE_MS;
    if (t === this.api.player) this.pulseUntil = this.now + 500;
    this.sfx(owner, 'status-fear', t.x, 1, 0.75);
    if (t !== this.api.player) this.relay(owner, 'fear-flee');
  }

  private freeze(owner: Owner, t: Fighter, ms: number): void {
    const v = this.victim(t, owner);
    v.frozenUntil = this.now + ms;
    this.stun(t, ms);
  }

  /** The awakened phobia, full screen, for whoever is sitting at this machine. */
  private showScare(variant: 0 | 1): void {
    this.scare = { start: this.now, variant };
    this.api.scene.cameras.main.shake(420, 0.02);
    Sfx.play('fear-jumpscare', { force: true });
    Sfx.play('fear-scream', { rate: 1.25, volume: 0.9, force: true });
  }

  private jumpscare(owner: Owner, t: Fighter): void {
    this.addFear(owner, t, SCARE_FEAR);
    this.freeze(owner, t, SCARE_FREEZE_MS);
    if (t === this.api.player) this.showScare(0);
    else { this.relay(owner, 'fear-js:0'); this.sfx(owner, 'screech', t.x, 0.8, 0.5); }
  }

  private updateVictims(delta: number): void {
    const now = this.now;
    for (const [t, v] of this.victims) {
      if (!t.active) { this.victims.delete(t); continue; }
      v.drain = null;
      if (!this.alive(t)) continue;
      const by = this.fighter(v.by);
      const sim = this.simulates(v.by);

      // Full fear and the gentleman in arm's reach: run.
      if (sim && !v.fleeing && v.fear >= FEAR_MAX && now >= v.fleeSafeUntil && now >= v.frozenUntil
          && this.alive(by) && !this.maze && this.dist(t.x, t.y, by.x, by.y) < FLEE_RANGE) {
        this.startFlee(v.by, t);
      }
      if (v.fleeing) {
        if (now >= v.fleeUntil) {
          v.fleeing = false;
          v.fleeSafeUntil = now + FLEE_SAFE_MS;
          if (sim) v.fear = Math.min(v.fear, FLEE_RESET_FEAR);
        } else if (this.alive(by)) {
          const a = Math.atan2(t.y - by.y, t.x - by.x);
          const sp = t.speed * 1.1;
          this.drive(t, Math.cos(a) * sp, Math.sin(a) * sp, 80);
        }
      }
      // Frozen with fear: the stun holds a bot; the local human is held here.
      if (now < v.frozenUntil && t === this.api.player) this.drive(t, 0, 0, 80);

      this.updateWounds(t, v);
    }
    void delta;
  }

  /** Reassurance: the user, and every phobia, drinks whatever frightened body is in reach. */
  private updateDrain(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || this.maze) return;
    const tick = this.now >= s.drainAt;
    if (tick) s.drainAt = this.now + DRAIN_TICK_MS;
    for (const t of this.targetsOf(owner)) {
      const v = this.victims.get(t);
      if (!v || v.fear < 1) continue;
      let src: { x: number; y: number } | null = null;
      let best = DRAIN_RANGE + this.bodyR(t);
      const dUser = this.dist(t.x, t.y, f.x, f.y);
      if (dUser < best) { best = dUser; src = { x: f.x, y: f.y }; }
      for (const p of s.phobias) {
        if (p.statue) continue;
        const d = this.dist(t.x, t.y, p.x, p.y);
        if (d < best) { best = d; src = { x: p.x, y: p.y }; }
      }
      if (!src) continue;
      v.drain = src;
      if (!tick) continue;
      // Whole points only, with the fraction carried, so 10 fear really is 1 a second.
      v.drainCarry += v.fear * DRAIN_PER_FEAR * (DRAIN_TICK_MS / 1000);
      const amount = Math.floor(v.drainCarry);
      if (amount < 1) continue;
      v.drainCarry -= amount;
      this.hit(owner, t, amount);
      if (this.simulates(owner)) f.heal(amount);
    }
  }

  // ── Click — Phobia ─────────────────────────────────────────────────────────

  doPhobia(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (s.form === 'slasher' || s.claustro) { this.refund(owner, FEAR_ID.phobia); return; }
    this.ensureLayers();
    const b = this.api.bounds;
    const x = Phaser.Math.Clamp(tx, b.left + 22, b.right - 22);
    const y = Phaser.Math.Clamp(ty, b.top + 26, b.bottom - 22);
    s.phobias.push({
      id: s.nextId++, x, y, seed: 1 + Math.floor(Math.random() * 9973), born: this.now,
      gazeHalf: GAZE_HALF_MIN, clawAt: -1, clawAng: 0, clawHit: true, statue: null,
    });
    // The fifth pushes the oldest out — the same rule on both machines, so the ids stay in step.
    while (s.phobias.length > PHOBIA_CAP) {
      const old = s.phobias.shift()!;
      this.fx(owner).phobiaDie(old.x, old.y);
    }
    this.fx(owner).phobiaRise(x, y);
    this.avatar(owner)?.play('raise');
    this.sfx(owner, 'ghost-wail', x, 1.3, 0.45);
  }

  private removePhobia(owner: Owner, id: number): Phobia | null {
    const s = this.side(owner);
    const i = s.phobias.findIndex((p) => p.id === id);
    if (i < 0) return null;
    const [p] = s.phobias.splice(i, 1);
    this.fx(owner).phobiaDie(p.x, p.y);
    return p;
  }

  /**
   * Enemy shots that cross a phobia go grey: they hit softer, and the shooter is bitten for it.
   * Run on the machine that owns the shot, since that is the one that decides what it does.
   */
  private updateGreying(): void {
    const kids = this.api.projectiles?.getChildren?.() ?? [];
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.phobias.length) continue;
      for (const obj of kids) {
        const p = obj as Projectile;
        if (!p.active || !(p instanceof Projectile) || this.greyed.has(p) || p.isHeal) continue;
        // Only the other side's shots, and only ones this machine fires for real.
        if (p.isFromPlayer === (owner === 'player')) continue;
        if (!p.isFromPlayer && this.api.isOnline) continue;
        const through = s.phobias.find((ph) => !ph.statue && this.dist(p.x, p.y, ph.x, ph.y) < PHOBIA_R + 6);
        if (!through) continue;
        this.greyed.add(p);
        p.damage *= GREY_DAMAGE_MULT;
        p.setTint(0x8a8a8a);
        const shooter = p.isFromPlayer ? this.api.player : this.nearestTarget(owner, p.x, p.y);
        if (!shooter || !this.alive(shooter)) continue;
        if (shooter === this.api.player) {
          // Our own shot, their phobia: the bite is ours to take, wherever they are sitting.
          Fighter.asNonAllyDamage(() => shooter.takeDamage(GREY_BACKLASH, { selfInflicted: true }));
          this.pulseUntil = this.now + 420;
          Sfx.play('heartbeat', { volume: 0.5 });
        } else {
          this.hit(owner, shooter, GREY_BACKLASH);
        }
      }
    }
  }

  // ── E — Fear's Grasp ───────────────────────────────────────────────────────

  doGrasp(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ph = this.live(owner);
    if (this.side(owner).form === 'slasher' || !ph.length) { this.refund(owner, FEAR_ID.grasp); return; }
    for (const p of ph) {
      p.clawAt = this.now;
      p.clawAng = Math.atan2(ty - p.y, tx - p.x);
      p.clawHit = false;
    }
    this.avatar(owner)?.play('sweep', Math.atan2(ty - f.y, tx - f.x));
    this.sfx(owner, 'claw', f.x, 0.75, 0.8);
  }

  private updateGrasp(owner: Owner): void {
    for (const p of this.side(owner).phobias) {
      if (p.clawHit || p.clawAt < 0 || this.now - p.clawAt < GRASP_HIT_MS) continue;
      p.clawHit = true;
      if (p.statue) continue;
      for (const t of this.targetsOf(owner)) {
        if (!this.inCone(p.x, p.y, p.clawAng, GRASP_HALF, GRASP_RANGE, t)) continue;
        this.hit(owner, t, GRASP_DMG);
        this.addFear(owner, t, GRASP_FEAR);
        this.fx(owner).slashHit(t.x, t.y, p.clawAng);
      }
    }
  }

  // ── R — Gaze ───────────────────────────────────────────────────────────────

  doGaze(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (s.form === 'slasher' || !this.live(owner).length) { this.refund(owner, FEAR_ID.gaze); return; }
    s.gaze = { until: this.now + GAZE_MS, scared: new Set() };
    for (const p of s.phobias) p.gazeHalf = GAZE_HALF_MIN;
    for (const t of this.targetsOf(owner)) { const v = this.victim(t, owner); v.gazeMs = 0; v.gazeCarry = 0; }
    this.avatar(owner)?.play('raise');
    this.sfx(owner, 'nightmare', f.x, 0.8, 0.7);
  }

  /** The cone a phobia's eye throws: from it, at its master, and a little past. */
  private gazeCone(owner: Owner, p: Phobia): { ang: number; len: number } {
    const f = this.fighter(owner);
    return {
      ang: Math.atan2(f.y - p.y, f.x - p.x),
      len: Math.max(GAZE_MIN_LEN, this.dist(f.x, f.y, p.x, p.y) + 50),
    };
  }

  private updateGaze(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const g = s.gaze;
    if (!g) return;
    const f = this.fighter(owner);
    if (this.now >= g.until || !this.alive(f) || s.form === 'slasher') { s.gaze = null; return; }
    const dt = delta / 1000;
    const caught = new Set<Fighter>();
    for (const p of s.phobias) {
      if (p.statue) continue;
      const c = this.gazeCone(owner, p);
      let any = false;
      for (const t of this.targetsOf(owner)) {
        if (!this.inCone(p.x, p.y, c.ang, p.gazeHalf, c.len, t)) continue;
        any = true;
        caught.add(t);
      }
      // A cone with somebody in it opens wider around them.
      if (any) p.gazeHalf = Math.min(GAZE_HALF_MAX, p.gazeHalf + GAZE_GROW_PER_S * dt);
    }
    for (const t of caught) {
      const v = this.victim(t, owner);
      v.gazeMs += delta;
      this.addFear(owner, t, GAZE_FEAR_PER_S * dt);
      // The light burns: whole points only, the fraction carried.
      v.gazeCarry += GAZE_DMG_PER_S * dt;
      const burn = Math.floor(v.gazeCarry);
      if (burn >= 1) { v.gazeCarry -= burn; this.hit(owner, t, burn); }
      if (this.simulates(owner) && v.gazeMs >= GAZE_SCARE_MS && !g.scared.has(t)) {
        g.scared.add(t);
        this.jumpscare(owner, t);
      }
    }
  }

  // ── F — Manifest ───────────────────────────────────────────────────────────

  doManifest(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.form === 'slasher') return;
    // Not while the walls are closing: the statues are the phobias, and the rite needs its priest.
    if (this.simulates(owner) && (s.claustro || this.fearTotal(owner) < MANIFEST_FEAR)) { this.refund(owner, FEAR_ID.manifest); return; }
    this.ensureLayers();
    s.form = 'slasher';
    s.slasherSince = this.now;
    s.slasherUntil = this.api.isInvasion ? this.now + INVASION_SLASHER_MS : Infinity;
    s.speedStacks = 0;
    s.gaze = null;
    if (!this.scaled.has(f)) { this.scaled.set(f, f.scaleX); f.setScale(f.scaleX * SLASHER_SCALE); }
    this.fx(owner).manifest(f.x, f.y);
    this.avatar(owner)?.play('flex');
    this.api.scene.cameras.main.shake(260, 0.008);
    this.sfx(owner, 'beast-transform', f.x, 0.7, 0.9);
    // The rune: the one thing on the field that can end this. Only where somebody can go and break it.
    if (this.simulates(owner) && this.isDuel()) {
      const at = this.randomEdge();
      s.rune = { x: at.x, y: at.y, hp: RUNE_HP, flash: 0 };
      this.relay(owner, `fear-rune:${Math.round(at.x)}:${Math.round(at.y)}`);
    }
  }

  /** Back to the gentleman. `loud` plays the sink; a reset or a death just clears the state. */
  private revert(owner: Owner, loud: boolean): void {
    const s = this.side(owner);
    if (s.form !== 'slasher') return;
    const f = this.fighter(owner);
    s.form = 'fear';
    s.rune = null;
    s.haunt = null;
    s.spin = null;
    s.drag = null;
    s.sig = null;
    s.hole = null;
    s.speedStacks = 0;
    const prev = this.scaled.get(f);
    if (prev !== undefined) {
      if (f?.active) f.setScale(prev);
      this.scaled.delete(f);
    }
    if (f && !f.netGhost) f.isInvincible = false;
    if (loud && f) {
      this.fx(owner).revert(f.x, f.y);
      this.sfx(owner, 'hush', f.x, 0.8, 0.8);
    }
  }

  isSlasher(owner: Owner): boolean { return this.isFear(owner) && this.side(owner).form === 'slasher'; }

  /** What an enemy's flashlight is pointed at: the cursor for a human, the way it walks for a bot. */
  private lightOf(t: Fighter): { ang: number; flicker: number } {
    const tt = this.vizT;
    const n = Math.sin(tt * 31.7) + Math.sin(tt * 17.3 + 1.1) + Math.sin(tt * 7.9 + 4);
    return { ang: t.facingAngle, flicker: n > 2.1 ? 0.9 : n > 1.7 ? 0.45 : 0.04 + 0.03 * Math.sin(tt * 40) };
  }

  private updateSlasher(owner: Owner, delta: number): void {
    const s = this.side(owner);
    if (s.form !== 'slasher') return;
    const f = this.fighter(owner);
    if (!this.isFear(owner) || !this.alive(f)) { this.revert(owner, false); return; }
    if (!f.netGhost) f.isInvincible = true;
    if (this.simulates(owner) && this.now >= s.slasherUntil && !this.maze) {
      this.revert(owner, true);
      this.relay(owner, 'fear-rev');
      return;
    }
    const r = s.rune;
    if (!r) return;
    r.flash = Math.max(0, r.flash - delta / 220);
    if (!this.simulates(owner) || this.maze) return;
    // Anything the enemy does to it counts, and so does simply standing on it.
    for (const t of this.targetsOf(owner)) {
      if (this.dist(t.x, t.y, r.x, r.y) < RUNE_TOUCH) { r.hp -= RUNE_TOUCH_DPS * (delta / 1000); r.flash = Math.max(r.flash, 0.4); }
    }
    r.hp -= this.shotsInto(owner, r.x, r.y, RUNE_R);
    if (r.hp <= 0) this.breakRune(owner);
  }

  private breakRune(owner: Owner): void {
    const r = this.side(owner).rune;
    if (!r) return;
    this.fx(owner).runeBreak(r.x, r.y);
    this.sfx(owner, 'crystal-shatter', r.x, 0.8, 0.9);
    this.revert(owner, true);
    this.relay(owner, 'fear-rev');
  }

  /** Damage from the other side's shots that are inside this circle right now (each shot counts once). */
  private shotsInto(owner: Owner, x: number, y: number, r: number): number {
    let total = 0;
    for (const obj of this.api.projectiles?.getChildren?.() ?? []) {
      const p = obj as Projectile;
      if (!p.active || !(p instanceof Projectile) || p.isHeal || this.struck.has(p)) continue;
      if (p.isFromPlayer === (owner === 'player')) continue;
      if (this.dist(p.x, p.y, x, y) > r + 10) continue;
      this.struck.add(p);
      total += Math.max(1, p.damage);
    }
    return total;
  }

  /** ArenaScene's shared AoE helper: a blast from `attacker` went off here. */
  notifyAoeDamage(x: number, y: number, radius: number, attacker: Owner, damage = 10): void {
    const owner: Owner = attacker === 'player' ? 'npc' : 'player';
    const s = this.side(owner);
    if (!this.simulates(owner)) return;
    if (s.rune && this.dist(x, y, s.rune.x, s.rune.y) <= radius + RUNE_R) {
      s.rune.hp -= damage;
      s.rune.flash = 1;
      if (s.rune.hp <= 0) this.breakRune(owner);
    }
    if (!s.claustro) return;
    for (const p of [...s.phobias]) {
      if (!p.statue || this.dist(x, y, p.x, p.y) > radius + STATUE_R) continue;
      this.hurtStatue(owner, p, damage);
      if (!s.claustro) return;
    }
  }

  // ── Body parts ─────────────────────────────────────────────────────────────
  //
  // The slasher does not just take hit points: he takes a body apart. Each victim has six parts —
  // head, heart, two arms, two legs — and each goes sound → damaged → severe as it is cut.
  //
  //   arms   every cooldown longer            legs   slower
  //   head   slower, and vision swims         heart  takes more damage
  //
  // A severe part bleeds (a percentage of max health a second, more for every other part that is
  // hurt, most of all from the heart) and leaves it on the floor.

  /** The two hands of `t`: the rig's own if it wears one, otherwise where they would hang. */
  private handsOf(t: Fighter): [Pt, Pt] {
    const rig = BaseAvatar.handsAt(this.api.scene, t.x, t.y);
    if (rig) return rig;
    const r = this.bodyR(t) + 7;
    const a = t.facingAngle;
    return [
      { x: t.x + Math.cos(a - 1.25) * r, y: t.y + Math.sin(a - 1.25) * r },
      { x: t.x + Math.cos(a + 1.25) * r, y: t.y + Math.sin(a + 1.25) * r },
    ];
  }

  /**
   * Which part of `t` a point is on, as the body is seen on screen: the hands are the arms, the
   * very middle of the hitbox is the heart, the top of it the head and the bottom the legs.
   */
  private partAt(t: Fighter, x: number, y: number): Part {
    for (const h of this.handsOf(t)) {
      if (this.dist(x, y, h.x, h.y) <= HAND_R) return h.x < t.x ? ARM_L : ARM_R;
    }
    const r = this.bodyR(t);
    const dx = x - t.x;
    const dy = y - t.y;
    if (Math.hypot(dx, dy) <= r * HEART_R) return HEART;
    if (dy < -r * 0.3) return HEAD;
    if (dy > r * 0.3) return dx < 0 ? LEG_L : LEG_R;
    return dx < 0 ? ARM_L : ARM_R;
  }

  /** Where a part of `t` is, for anything that has to ask which of them something reached first. */
  private partSpot(t: Fighter, part: Part): Pt {
    const r = this.bodyR(t);
    if (part === HEAD) return { x: t.x, y: t.y - r * 0.7 };
    if (part === LEG_L) return { x: t.x - r * 0.42, y: t.y + r * 0.7 };
    if (part === LEG_R) return { x: t.x + r * 0.42, y: t.y + r * 0.7 };
    if (part === HEART) return { x: t.x, y: t.y };
    const [a, b] = this.handsOf(t);
    const left = a.x <= b.x ? a : b;
    return part === ARM_L ? left : (left === a ? b : a);
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const u = l2 < 1e-6 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return this.dist(px, py, ax + dx * u, ay + dy * u);
  }

  /**
   * Where a thrust from `(ax, ay)` to its point `(bx, by)` goes into `t`, or null if it misses.
   * A point that stops inside the body (or on a hand) cuts exactly there; one that carries on
   * through cuts where the blade went in.
   */
  private strikePoint(ax: number, ay: number, bx: number, by: number, t: Fighter): Pt | null {
    for (const h of this.handsOf(t)) if (this.dist(bx, by, h.x, h.y) <= HAND_R) return { x: bx, y: by };
    const r = this.bodyR(t) + STAB_W;
    if (this.dist(bx, by, t.x, t.y) <= r) return { x: bx, y: by };
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const ux = dx / len;
    const uy = dy / len;
    const along = (t.x - ax) * ux + (t.y - ay) * uy;
    if (along < 0 || along > len) return null;
    const off = Math.abs((t.x - ax) * uy - (t.y - ay) * ux);
    if (off > r) return null;
    const enter = Math.max(0, along - Math.sqrt(r * r - off * off));
    return { x: ax + ux * enter, y: ay + uy * enter };
  }

  private snared(t: Fighter): boolean { return this.now < (this.victims.get(t)?.snaredUntil ?? 0); }

  /** Who the slasher can cut right now: nobody hanging on a butcher's hook. */
  private prey(owner: Owner): Fighter[] { return this.targetsOf(owner).filter((t) => !this.snared(t)); }

  /** The duel opponent is somebody else's machine: tell it what was just done to its body. */
  private duelRelay(owner: Owner, t: Fighter, id: string): void {
    if (t === this.api.npc && !this.api.isInvasion) this.relay(owner, id);
  }

  private relayWounds(owner: Owner, t: Fighter): void {
    const v = this.victims.get(t);
    if (v) this.duelRelay(owner, t, `fear-w:${v.wounds.map((w) => Math.round(w)).join(':')}`);
  }

  /** Cut one part. `quiet` leaves the relay to the caller (somebody cutting all six at once). */
  private wound(owner: Owner, t: Fighter, part: Part, amount: number, quiet = false): void {
    if (!this.simulates(owner) || !this.alive(t)) return;
    const v = this.victim(t, owner);
    const before = woundLevel(v.wounds[part]);
    v.wounds[part] = Math.min(WOUND_SEVERE, v.wounds[part] + amount);
    v.woundAt[part] = this.now;
    this.chartOf = t;
    if (woundLevel(v.wounds[part]) === 2 && before < 2) {
      const at = this.partSpot(t, part);
      this.fx(owner).bloodSplash(at.x, at.y);
      this.sfx(owner, 'stab', t.x, 0.8, 0.8);
    }
    if (!quiet) this.relayWounds(owner, t);
  }

  private woundAll(owner: Owner, t: Fighter, amount: number): void {
    for (const p of PARTS) this.wound(owner, t, p, amount, true);
    this.relayWounds(owner, t);
  }

  /** How much of its speed a cut-up body has left. */
  private woundSpeed(v: Victim): number {
    return (1 - LEG_SLOW[woundLevel(v.wounds[LEG_L])]) * (1 - LEG_SLOW[woundLevel(v.wounds[LEG_R])])
      * (1 - HEAD_SLOW[woundLevel(v.wounds[HEAD])]);
  }

  /** Percent of max health a second this body is losing, before a butcher's hook triples it. */
  private bleedRate(v: Victim): number {
    let hurt = 0;
    let pct = 0;
    for (const p of PARTS) {
      const lv = woundLevel(v.wounds[p]);
      if (lv > 0) hurt++;
      if (lv === 2) pct += p === HEART ? BLEED_HEART : BLEED_PART;
    }
    return pct > 0 ? pct * (1 + BLEED_STACK * (hurt - 1)) : 0;
  }

  /** What the wounds do, every frame, on whichever machine this body lives on. */
  private updateWounds(t: Fighter, v: Victim): void {
    const now = this.now;
    t.fearCooldownMult = 1 + ARM_COOLDOWN[woundLevel(v.wounds[ARM_L])] + ARM_COOLDOWN[woundLevel(v.wounds[ARM_R])];
    t.fearHeartMult = HEART_TAKEN[woundLevel(v.wounds[HEART])];
    const head = woundLevel(v.wounds[HEAD]);
    if (head > 0 && now >= v.swimAt) {
      v.swimAt = now + (head === 2 ? 4200 : 7000) * (0.8 + 0.4 * Math.random());
      t.hallucinatingUntil = Math.max(t.hallucinatingUntil, Date.now() + (head === 2 ? 2600 : 1700));
    }
    const hung = now < v.snaredUntil;
    if (hung) {
      this.hold(t);
      if (!t.netGhost) this.place(t, v.snareX, v.snareY);
    }
    const rate = this.bleedRate(v);
    if (rate <= 0) return;
    if (now >= v.bleedAt) {
      v.bleedAt = now + 1000;
      v.bleedCarry += (Math.min(t.maxHp, BLEED_HP_CAP) * rate * (hung ? SNARE_BLEED : 1)) / 100;
      const dmg = Math.floor(v.bleedCarry);
      if (dmg >= 1) { v.bleedCarry -= dmg; this.hit(v.by, t, dmg, { pierce: true }); }
    }
    // It goes on the floor.
    if (now >= v.puddleAt && !t.forceInvisible) {
      v.puddleAt = now + (hung ? 320 : 850);
      const r = this.bodyR(t);
      this.puddles.push({
        x: t.x + (Math.random() - 0.5) * r, y: t.y + r * 0.75 + (Math.random() - 0.5) * 6,
        r: 5 + rate * 5 + Math.random() * 3, born: now, seed: 1 + Math.floor(Math.random() * 9973), by: v.by,
      });
      if (this.puddles.length > PUDDLE_CAP) this.puddles.shift();
    }
  }

  // ── Slasher Click — Massacre ───────────────────────────────────────────────

  doMassacre(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.form !== 'slasher' || s.spin || s.drag) return;
    if (owner === 'npc' && this.simulates('npc')) {
      // A bot has no cursor to put on a part: it stabs at the body and lands where it lands.
      const t = this.nearestTarget('npc', tx, ty);
      if (t && this.dist(tx, ty, t.x, t.y) < this.bodyR(t) * 2) {
        const a = Math.random() * Math.PI * 2;
        const d = this.bodyR(t) * (0.2 + 0.75 * Math.sqrt(Math.random()));
        tx = t.x + Math.cos(a) * d;
        ty = t.y + Math.sin(a) * d;
      }
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    // The point goes where the cursor is, as far as the arm reaches.
    const reach = Phaser.Math.Clamp(this.dist(f.x, f.y, tx, ty), STAB_MIN, STAB_RANGE);
    const bx = f.x + Math.cos(ang) * reach;
    const by = f.y + Math.sin(ang) * reach;
    s.stab = { at: this.now, ang, reach };
    this.avatar(owner)?.play('punch', ang);
    this.sfx(owner, 'slash', f.x, 1.1, 0.8);
    for (const t of this.prey(owner)) {
      const at = this.strikePoint(f.x, f.y, bx, by, t);
      if (!at) continue;
      const part = this.partAt(t, at.x, at.y);
      this.hit(owner, t, MASSACRE_DMG + this.fearOf(t) * MASSACRE_PER_FEAR);
      this.wound(owner, t, part, part === HEART ? WOUND_STAB_HEART : WOUND_STAB);
      this.fx(owner).slashHit(at.x, at.y, ang);
      this.sfx(owner, 'stab', t.x, 1, 0.7);
    }
    if (!this.simulates(owner)) return;
    // His own phobias are in the way too — and running one through feeds him.
    for (const p of this.live(owner)) {
      if (this.segDist(f.x, f.y, bx, by, p.x, p.y) > PHOBIA_R) continue;
      this.removePhobia(owner, p.id);
      this.fx(owner).bloodSplash(p.x, p.y);
      s.speedStacks++;
      this.relay(owner, `fear-phx:${p.id}`);
    }
  }

  // ── Slasher E — Haunt ──────────────────────────────────────────────────────
  //
  // Stalk (grey, slower, charging faster the nearer he is) → let go, or get caught in a
  // flashlight → a hook swung round him on a chain for as long as the charge bought → whoever it
  // finds is dragged behind him for five seconds, helpless → slammed down in front of him when
  // the time is up or he presses again — or hung on one of the arena's butcher's hooks if he got
  // them that far, where he cannot touch them and they bleed three times as fast.

  doHaunt(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.form !== 'slasher' || s.spin) return;
    if (s.drag) { if (this.simulates(owner)) this.slam(owner); return; }
    if (s.haunt) { if (this.simulates(owner)) this.releaseHaunt(owner); return; }
    s.haunt = { charge: 0, since: this.now };
    this.sfx(owner, 'hush', f.x, 0.6, 0.7);
  }

  private releaseHaunt(owner: Owner): void {
    const s = this.side(owner);
    if (!s.haunt) return;
    const ms = Math.round(Phaser.Math.Linear(SPIN_MIN_MS, SPIN_MAX_MS, Phaser.Math.Clamp(s.haunt.charge, 0, 1)));
    this.startSpin(owner, ms);
    this.relay(owner, `fear-spin:${ms}`);
  }

  private startSpin(owner: Owner, ms: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.haunt = null;
    s.spin = { start: this.now, until: this.now + ms, ang0: f.facingAngle, whooshAt: 0 };
    this.avatar(owner)?.play('sweep', f.facingAngle);
    this.sfx(owner, 'roar', f.x, 1.2, 0.7);
  }

  private hookAngle(sp: Spin): number { return sp.ang0 + ((this.now - sp.start) / 1000) * SPIN_RAD_PER_S; }

  private updateHaunt(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const h = s.haunt;
    if (!h) return;
    const f = this.fighter(owner);
    const t = this.nearestTarget(owner);
    const d = t ? this.dist(f.x, f.y, t.x, t.y) : HAUNT_FAR;
    const near = 1 - Phaser.Math.Clamp(d / HAUNT_FAR, 0, 1);
    h.charge = Math.min(1, h.charge + (delta / 1000) * Phaser.Math.Linear(HAUNT_RATE_FAR, HAUNT_RATE_NEAR, near));
    if (!this.simulates(owner) || this.now - h.since < HAUNT_GRACE_MS) return;
    // Caught in a flashlight: the stalking is over, and the hook comes out with whatever was banked.
    for (const e of this.targetsOf(owner)) {
      if (!this.inCone(e.x, e.y, this.lightOf(e).ang, LIGHT_HALF, LIGHT_LEN, f)) continue;
      this.releaseHaunt(owner);
      return;
    }
  }

  private updateSpin(owner: Owner): void {
    const s = this.side(owner);
    const sp = s.spin;
    if (!sp) return;
    if (this.now >= sp.until) { s.spin = null; return; }
    const f = this.fighter(owner);
    if (this.now >= sp.whooshAt) {
      sp.whooshAt = this.now + (Math.PI * 2000) / SPIN_RAD_PER_S;
      this.sfx(owner, 'whoosh', f.x, 0.75, 0.55);
    }
    if (!this.simulates(owner)) return;
    const a = this.hookAngle(sp);
    const hx = f.x + Math.cos(a) * SPIN_RADIUS;
    const hy = f.y + Math.sin(a) * SPIN_RADIUS;
    // The chain takes them as surely as the hook does: standing inside the circle is no shelter.
    for (const t of this.prey(owner)) {
      if (this.segDist(f.x, f.y, hx, hy, t.x, t.y) > this.bodyR(t) + HOOK_R) continue;
      this.startDrag(owner, t);
      this.duelRelay(owner, t, 'fear-drag');
      return;
    }
  }

  private startDrag(owner: Owner, t: Fighter): void {
    const s = this.side(owner);
    s.haunt = null;
    s.spin = null;
    s.drag = { victim: t, until: this.now + DRAG_MS };
    this.fx(owner).bloodSplash(t.x, t.y);
    this.sfx(owner, 'stab', t.x, 0.75, 1);
    this.sfx(owner, 'status-root', t.x, 1, 0.8);
    if (t === this.api.player) { this.pulseUntil = this.now + 500; this.api.scene.cameras.main.shake(200, 0.01); }
  }

  /** A body on the chain or on a butcher's hook: no weapons, no legs of its own. */
  private hold(t: Fighter): void {
    t.applyDisarm(150);
    this.drive(t, 0, 0, 120);
  }

  /** The arena's butcher's hooks. They are furniture: the same six places on every machine. */
  private hookSpots(): Pt[] {
    if (this.hooks) return this.hooks;
    const b = this.api.bounds;
    const at = (u: number, v: number): Pt => ({ x: b.left + b.width * u, y: b.top + b.height * v });
    this.hooks = [at(0.17, 0.27), at(0.83, 0.27), at(0.17, 0.78), at(0.83, 0.78), at(0.5, 0.15), at(0.5, 0.9)];
    return this.hooks;
  }

  private hooksShown(): boolean {
    if (BOTH.some((o) => this.side(o).form === 'slasher')) return true;
    for (const v of this.victims.values()) if (this.now < v.snaredUntil) return true;
    return false;
  }

  private updateDrag(owner: Owner): void {
    const s = this.side(owner);
    const d = s.drag;
    if (!d) return;
    const f = this.fighter(owner);
    const t = d.victim;
    if (!this.alive(t) || this.maze) { s.drag = null; return; }
    this.hold(t);
    // The chain is only so long: when he walks, they come.
    if (!t.netGhost) {
      const len = this.dist(f.x, f.y, t.x, t.y);
      if (len > DRAG_LEN) {
        const k = DRAG_LEN / len;
        this.place(t, f.x + (t.x - f.x) * k, f.y + (t.y - f.y) * k);
      }
    }
    if (!this.simulates(owner)) return;
    for (const h of this.hookSpots()) {
      if (this.dist(t.x, t.y, h.x, h.y) > HOOK_SNARE_R) continue;
      this.snare(owner, t, h.x, h.y);
      this.duelRelay(owner, t, `fear-snare:${Math.round(h.x)}:${Math.round(h.y)}`);
      return;
    }
    if (this.now >= d.until) this.slam(owner);
  }

  /** Hung up. He cannot touch them there; they just empty, three times as fast. */
  private snare(owner: Owner, t: Fighter, x: number, y: number): void {
    const s = this.side(owner);
    s.drag = null;
    const v = this.victim(t, owner);
    v.snaredUntil = this.now + SNARE_MS;
    v.snareX = x;
    v.snareY = y;
    v.bleedAt = Math.min(v.bleedAt, this.now + 400);
    this.place(t, x, y);
    this.fx(owner).bloodSplash(x, y);
    this.sfx(owner, 'trap-set', x, 0.7, 0.9);
    this.sfx(owner, 'stab', x, 0.6, 1);
    if (t === this.api.player) this.api.scene.cameras.main.shake(240, 0.012);
  }

  /** The drag ends the hard way: thrown down in front of him. */
  private slam(owner: Owner): void {
    const s = this.side(owner);
    const d = s.drag;
    if (!d) return;
    s.drag = null;
    const f = this.fighter(owner);
    const t = d.victim;
    if (!this.alive(t)) return;
    const ang = owner === 'player' ? Math.atan2(s.aimY - f.y, s.aimX - f.x) : f.facingAngle;
    const b = this.api.bounds;
    const x = Phaser.Math.Clamp(f.x + Math.cos(ang) * SLAM_REACH, b.left + 24, b.right - 24);
    const y = Phaser.Math.Clamp(f.y + Math.sin(ang) * SLAM_REACH, b.top + 24, b.bottom - 24);
    this.place(t, x, y);
    this.slamFx(owner, x, y, ang);
    this.hit(owner, t, SLAM_DMG);
    this.woundAll(owner, t, WOUND_SLAM);
    this.stun(t, SLAM_STUN_MS);
    this.duelRelay(owner, t, `fear-slam:${Math.round(x)}:${Math.round(y)}`);
  }

  private slamFx(owner: Owner, x: number, y: number, ang: number): void {
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).bloodSplash(x, y);
    this.fx(owner).slashHit(x, y, ang + Math.PI / 2);
    this.api.scene.cameras.main.shake(220, 0.014);
    this.sfx(owner, 'quake', x, 1.4, 0.8);
  }

  // ── Slasher R — Signature Move ─────────────────────────────────────────────

  doSignature(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.form !== 'slasher' || s.sig) return;
    this.fx(owner).teleport(f.x, f.y);
    this.sfx(owner, 'teleport', f.x, 0.6, 0.8);
    if (!this.simulates(owner)) return;
    const at = this.randomEdge();
    this.place(f, at.x, at.y);
    this.fx(owner).teleport(at.x, at.y);
    s.haunt = null;
    s.sig = { round: 0, phase: 'aim', phaseAt: this.now, x: at.x, y: at.y, ang: 0, awayUntil: 0, botArmAt: this.botArmDelay(), struck: new Set() };
  }

  /** Long enough to cross the arena from any wall. */
  private sigLen(): number {
    const b = this.api.bounds;
    return Math.hypot(b.right - b.left, b.bottom - b.top);
  }

  private botArmDelay(): number { return this.now + 450 + Math.random() * 500 + this.api.npcSlack * 900; }

  private armSignature(owner: Owner): void {
    const sig = this.side(owner).sig;
    if (!sig || sig.phase !== 'aim') return;
    // The angle is locked here; the line itself comes a beat and a half later.
    sig.phase = 'wind';
    sig.phaseAt = this.now;
    this.sfx(owner, 'trap-set', sig.x, 0.8, 0.6);
  }

  /** Back to his spot on the wall after a cut. */
  private signatureHome(owner: Owner, sig: Signature): void {
    if (!sig.awayUntil) return;
    sig.awayUntil = 0;
    const f = this.fighter(owner);
    this.fx(owner).teleport(f.x, f.y);
    this.place(f, sig.x, sig.y);
  }

  private updateSignature(owner: Owner): void {
    const s = this.side(owner);
    const sig = s.sig;
    if (!sig) return;
    if (sig.awayUntil && this.now >= sig.awayUntil) this.signatureHome(owner, sig);
    if (sig.phase === 'aim') {
      // The line starts at his spot on the wall and runs through the cursor.
      if (owner === 'player') sig.ang = Math.atan2(s.aimY - sig.y, s.aimX - sig.x);
      else {
        const t = this.nearestTarget(owner);
        if (t) {
          const v = (t.body as Body | null)?.velocity;
          // Aim where they will be when the line finally comes.
          const lead = (0.3 + (SIG_DELAY_MS / 1000) * 0.7) * (1 - this.api.npcSlack);
          sig.ang = Math.atan2(t.y + (v?.y ?? 0) * lead - sig.y, t.x + (v?.x ?? 0) * lead - sig.x);
        }
        if (this.now >= sig.botArmAt) this.armSignature(owner);
      }
      if (sig.phase === 'aim' && this.now - sig.phaseAt >= SIG_AIM_MS) this.armSignature(owner);
      return;
    }
    if (sig.phase === 'wind') {
      if (this.now - sig.phaseAt < SIG_DELAY_MS) return;
      sig.phase = 'armed';
      sig.phaseAt = this.now;
      sig.struck.clear();
      this.sfx(owner, 'stab', sig.x, 1.3, 0.5);
    }
    // Everybody on the line is cut, once a round, and the rounds go on.
    const len = this.sigLen();
    for (const t of this.prey(owner)) {
      if (sig.struck.has(t) || !this.inCone(sig.x, sig.y, sig.ang, SIG_HALF, len, t)) continue;
      sig.struck.add(t);
      this.signatureHit(owner, t, sig.ang);
    }
    if (this.now - sig.phaseAt < SIG_ARMED_MS) return;
    sig.round++;
    if (sig.round >= SIG_ROUNDS) { this.signatureHome(owner, sig); s.sig = null; return; }
    sig.phase = 'aim';
    sig.phaseAt = this.now;
    sig.botArmAt = this.botArmDelay();
  }

  /**
   * Which part of `t` is in the cone — the one that reached it first. With several inside, that is
   * the one furthest in; the heart is never first to arrive anywhere.
   */
  private partInCone(sig: Signature, t: Fighter): Part {
    let best: Part = HEAD;
    let bestScore = -Infinity;
    for (const p of PARTS) {
      if (p === HEART) continue;
      const at = this.partSpot(t, p);
      const d = this.dist(sig.x, sig.y, at.x, at.y);
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(at.y - sig.y, at.x - sig.x) - sig.ang));
      // Positive = that far inside the cone's nearest edge; negative = that far short of it.
      const score = (SIG_HALF - off) * Math.max(d, 1);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  /** He is simply there, already through them — and back on the wall a moment later. */
  private signatureHit(owner: Owner, t: Fighter, ang: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const part = s.sig ? this.partInCone(s.sig, t) : HEAD;
    this.fx(owner).teleport(f.x, f.y);
    const b = this.api.bounds;
    const ex = Phaser.Math.Clamp(t.x + Math.cos(ang) * 52, b.left + 24, b.right - 24);
    const ey = Phaser.Math.Clamp(t.y + Math.sin(ang) * 52, b.top + 24, b.bottom - 24);
    this.place(f, ex, ey);
    if (s.sig) s.sig.awayUntil = this.now + SIG_AWAY_MS;
    s.stab = { at: this.now, ang: ang + Math.PI, reach: 70 };
    this.hit(owner, t, SIG_DMG);
    this.wound(owner, t, part, WOUND_SIG);
    this.signatureFx(owner, t.x, t.y, ang);
    this.relay(owner, `fear-sigh:${Math.round(t.x)}:${Math.round(t.y)}`);
  }

  private signatureFx(owner: Owner, x: number, y: number, ang: number): void {
    this.fx(owner).slashHit(x, y, ang);
    this.fx(owner).bloodSplash(x, y);
    this.api.scene.cameras.main.shake(180, 0.012);
    this.sfx(owner, 'stab', x, 0.7, 1);
  }

  // ── Slasher F — Shadowy Descent ────────────────────────────────────────────

  doDescent(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.form !== 'slasher' || this.maze) return;
    this.revert(owner, true);
    if (!this.simulates(owner) || !this.alive(f)) return;
    const at = this.randomEdge();
    this.place(f, at.x, at.y);
    this.fx(owner).teleport(at.x, at.y);
  }

  // ── Slasher Q — They Will Fall ─────────────────────────────────────────────

  doFall(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.form !== 'slasher' || s.hole || this.maze) return;
    this.ensureLayers();
    const b = this.api.bounds;
    s.hole = { x: b.centerX, y: b.centerY, r: HOLE_R0, start: this.now, fell: new Map() };
    this.avatar(owner)?.play('slam', Math.PI / 2);
    this.api.scene.cameras.main.shake(500, 0.006);
    this.sfx(owner, 'quake', b.centerX, 0.6, 0.9);
  }

  private updateHole(owner: Owner): void {
    const s = this.side(owner);
    const h = s.hole;
    if (!h) return;
    const age = this.now - h.start;
    if (age >= HOLE_MS || s.form !== 'slasher') { s.hole = null; return; }
    h.r = Math.min(HOLE_MAX, HOLE_R0 + HOLE_GROW_PER_S * (age / 1000));
    if (!this.simulates(owner) || this.maze) return;
    for (const t of this.targetsOf(owner)) {
      if (this.dist(t.x, t.y, h.x, h.y) > h.r - 4) continue;
      const one = t === this.api.player || t === this.api.npc;
      if (this.isDuel() && one) {
        const seed = 1 + Math.floor(Math.random() * 0x7ffffffe);
        this.relay(owner, `fear-mz:${seed}`);
        this.startMaze(owner, t, seed);
        return;
      }
      // A husk has no first person to be put in: the hole just takes its due.
      if (this.now < (h.fell.get(t) ?? 0)) continue;
      h.fell.set(t, this.now + 3000);
      this.hit(owner, t, HOLE_HUSK_DMG);
      this.stun(t, 1500);
      this.fx(owner).bloodSplash(t.x, t.y);
    }
  }

  private startMaze(owner: Owner, victim: Fighter, seed: number): void {
    if (this.maze) return;
    const s = this.side(owner);
    s.hole = null;
    s.haunt = null;
    s.spin = null;
    s.drag = null;
    s.sig = null;
    const localRole = owner === 'player' ? 'hunter' : 'victim';
    const api = this.api;
    const run = new FearMazeRun({
      get scene() { return api.scene; },
      get wKey() { return api.wKey; },
      get aKey() { return api.aKey; },
      get sKey() { return api.sKey; },
      get dKey() { return api.dKey; },
      get npcSlack() { return api.npcSlack; },
      send: (id) => { if (api.isOnline) api.broadcast(id); },
    }, {
      seed, localRole, remote: api.isOnline, authoritative: this.simulates(owner),
      victimTexture: victim.texture?.key, durationMs: MAZE_MS,
    });
    run.onHeartbeat = (dread) => Sfx.play('heartbeat', { volume: 0.35 + dread * 0.6, rate: 0.9 + dread * 0.4 });
    this.maze = { owner, victim, run, victimWasInvincible: victim.isInvincible };
    api.scene.events.once('shutdown', () => run.destroy());
    Sfx.play('fear-scream', { rate: 0.7, volume: 0.6 });
  }

  private updateMaze(delta: number): void {
    const m = this.maze;
    if (!m) return;
    const slasher = this.fighter(m.owner);
    // Both bodies wait in the arena, untouchable, while the hunt happens somewhere else.
    for (const f of [slasher, m.victim]) {
      if (!f?.active || f.netGhost) continue;
      f.isInvincible = true;
      this.drive(f, 0, 0, 120);
    }
    if (m.victim === this.api.player) this.api.player.applyDisarm(150);
    const outcome = m.run.update(delta);
    if (!this.alive(slasher) || !this.alive(m.victim)) { this.endMaze(false); return; }
    if (outcome === 'running') return;
    this.relay(m.owner, `fear-mzend:${outcome === 'caught' ? 1 : 0}`);
    this.endMaze(outcome === 'caught');
  }

  private endMaze(caught: boolean): void {
    const m = this.maze;
    if (!m) return;
    m.run.destroy();
    if (caught) {
      this.redacted = { owner: m.owner, victim: m.victim, start: this.now, screams: 0 };
      return;
    }
    this.leaveMaze(false);
  }

  private updateRedacted(): void {
    const r = this.redacted;
    if (!r) return;
    const age = this.now - r.start;
    // Five screams across the three seconds, each pitched wrong in a different direction.
    const cues = [60, 620, 1180, 1750, 2350];
    while (r.screams < cues.length && age >= cues[r.screams]) {
      const rate = [0.82, 1.3, 0.62, 1.05, 0.5][r.screams];
      Sfx.play('fear-scream', { rate, volume: 1, force: true, pan: r.screams % 2 ? 0.6 : -0.6 });
      if (r.screams % 2 === 0) Sfx.play('stab', { rate: 0.6, volume: 0.8, force: true });
      r.screams++;
    }
    if (age < REDACTED_MS) return;
    this.redacted = null;
    this.leaveMaze(true);
  }

  /** Back up into the arena. */
  private leaveMaze(caught: boolean): void {
    const m = this.maze;
    if (!m) return;
    this.maze = null;
    const { owner, victim } = m;
    const slasher = this.fighter(owner);
    const b = this.api.bounds;
    if (victim?.active && !victim.netGhost) {
      victim.isInvincible = m.victimWasInvincible;
      this.place(victim, Phaser.Math.Between(b.left + 90, b.right - 90), Phaser.Math.Between(b.top + 90, b.bottom - 90));
    }
    if (slasher?.active && !slasher.netGhost) {
      const at = this.randomEdge();
      this.place(slasher, at.x, at.y);
    }
    if (!caught || !this.alive(victim)) return;
    this.hit(owner, victim, MAZE_CATCH_DMG, { pierce: true });
    // Nobody is shown what happened down there. Every part of them knows.
    this.woundAll(owner, victim, WOUND_SEVERE);
    this.fx(owner).bloodSplash(victim.x, victim.y);
    this.addFear(owner, victim, 25);
  }

  // ── Q — Claustrophobia ─────────────────────────────────────────────────────

  doClaustro(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.claustro) return;
    if (s.form === 'slasher' || !s.phobias.length) { this.refund(owner, FEAR_ID.claustro); return; }
    this.ensureLayers();
    s.gaze = null;
    s.claustro = { start: this.now, botPick: -1 };
    for (const p of s.phobias) p.statue = { hp: STATUE_HP, real: false, nearMs: 0, bleed: 0, flash: 0, breathAt: 0 };
    this.avatar(owner)?.play('raise');
    this.api.scene.cameras.main.shake(600, 0.006);
    this.sfx(owner, 'stone-slam', f.x, 0.6, 1);
    if (!this.simulates(owner)) {
      if (s.pendingBits >= 0) this.applyStatueBits(s, s.pendingBits);
      s.pendingBits = -1;
      return;
    }
    // Half of them (rounded down) are occupied. Which half is the whole game.
    const order = Phaser.Utils.Array.Shuffle(s.phobias.map((_, i) => i));
    let bits = 0;
    for (const i of order.slice(0, Math.floor(s.phobias.length / 2))) { s.phobias[i].statue!.real = true; bits |= 1 << i; }
    this.relay(owner, `fear-cl:${bits}`);
  }

  private applyStatueBits(s: Side, bits: number): void {
    s.phobias.forEach((p, i) => { if (p.statue) p.statue.real = (bits & (1 << i)) !== 0; });
  }

  /** The room that is left: the arena shrinking on its centre. */
  private claustroRect(owner: Owner): Phaser.Geom.Rectangle | null {
    const c = this.side(owner).claustro;
    if (!c) return null;
    const b = this.api.bounds;
    const k = Phaser.Math.Clamp((this.now - c.start) / CLAUSTRO_MS, 0, 1);
    const hw = Phaser.Math.Linear(b.width / 2, CLAUSTRO_MIN_HALF, k);
    const hh = Phaser.Math.Linear(b.height / 2, CLAUSTRO_MIN_HALF, k);
    return new Phaser.Geom.Rectangle(b.centerX - hw, b.centerY - hh, hw * 2, hh * 2);
  }

  private endClaustro(owner: Owner): void {
    const s = this.side(owner);
    s.claustro = null;
    for (const p of s.phobias) p.statue = null;
  }

  private hurtStatue(owner: Owner, p: Phobia, dmg: number): void {
    const st = p.statue;
    if (!st || dmg <= 0) return;
    st.hp -= dmg;
    st.flash = 1;
    if (st.hp > 0) return;
    this.relay(owner, `fear-clx:${p.id}`);
    this.shatter(owner, p);
  }

  private shatter(owner: Owner, p: Phobia): void {
    const s = this.side(owner);
    const real = !!p.statue?.real;
    const i = s.phobias.indexOf(p);
    if (i >= 0) s.phobias.splice(i, 1);
    this.fx(owner).statueShatter(p.x, p.y, real);
    this.sfx(owner, 'stone-slam', p.x, 1.3, 1);
    this.endClaustro(owner);
    if (!real) return;
    // It was not empty.
    for (const t of this.targetsOf(owner)) {
      this.hit(owner, t, STATUE_TRAP_DMG);
      this.addFear(owner, t, STATUE_TRAP_FEAR);
    }
    if (owner === 'npc' && this.alive(this.api.player) && !this.api.isInvasion) this.showScare(1);
    else this.sfx(owner, 'screech', p.x, 0.7, 0.8);
  }

  private updateClaustro(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const c = s.claustro;
    if (!c) return;
    const f = this.fighter(owner);
    const rect = this.claustroRect(owner)!;
    const sim = this.simulates(owner);
    if (!this.alive(f) || !this.isFear(owner)) { this.endClaustro(owner); return; }
    const dt = delta / 1000;

    // Nobody is outside the room, and neither are the statues.
    for (const b of this.allFighters()) {
      if (!this.alive(b) || b.netGhost) continue;
      const r = Math.min(this.bodyR(b), rect.width / 2 - 2);
      const x = Phaser.Math.Clamp(b.x, rect.left + r, rect.right - r);
      const y = Phaser.Math.Clamp(b.y, rect.top + r, rect.bottom - r);
      if (x !== b.x || y !== b.y) b.setPosition(x, y);
    }
    for (const p of s.phobias) {
      const m = Math.min(STATUE_R, rect.width / 2 - 2);
      p.x = Phaser.Math.Clamp(p.x, rect.left + m, rect.right - m);
      p.y = Phaser.Math.Clamp(p.y, rect.top + m, rect.bottom - m);
    }

    const foes = this.targetsOf(owner);
    for (const p of [...s.phobias]) {
      const st = p.statue;
      if (!st) continue;
      st.flash = Math.max(0, st.flash - delta / 200);
      // Stand by one and watch: an occupied statue cannot keep still for more than three seconds.
      const watcher = foes.find((t) => this.dist(t.x, t.y, p.x, p.y) < STATUE_NEAR);
      st.nearMs = watcher ? st.nearMs + delta : Math.max(0, st.nearMs - delta * 2);
      if (st.real && st.nearMs >= STATUE_TELL_MS) {
        st.bleed = Math.min(1, st.bleed + dt / 2.2);
        if (watcher === this.api.player && this.now >= st.breathAt) {
          st.breathAt = this.now + 1500;
          Sfx.play('fear-breath', { volume: 0.5 + st.bleed * 0.4 });
        }
      }
      if (!sim) continue;
      let dmg = this.shotsInto(owner, p.x, p.y, STATUE_R);
      for (const t of foes) if (this.dist(t.x, t.y, p.x, p.y) < STATUE_TOUCH) dmg += STATUE_TOUCH_DPS * dt;
      if (dmg > 0) this.hurtStatue(owner, p, dmg);
      if (!s.claustro) return;
    }

    for (const t of foes) this.addFear(owner, t, CLAUSTRO_FEAR_PER_S * dt);
    if (this.now - c.start < CLAUSTRO_MS) return;
    // The walls met.
    this.api.scene.cameras.main.shake(500, 0.02);
    this.sfx(owner, 'stone-slam', f.x, 0.5, 1);
    for (const t of foes) {
      this.hit(owner, t, this.api.isInvasion ? CRUSH_INVASION_DMG : t.maxHp * 10, { pierce: true });
      this.fx(owner).bloodSplash(t.x, t.y);
    }
    this.endClaustro(owner);
  }

  // ── Net ────────────────────────────────────────────────────────────────────

  /**
   * A `fear-*` pseudo-cast from the other machine. Everything here is about the *opponent's* Fear
   * (`npc` on this machine) — except `fear-mp`, which is whoever we are in the maze with.
   */
  replayNet(id: string): void {
    const parts = id.split(':');
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const s = this.sides.npc;
    const me = this.api.player;
    switch (parts[0]) {
      case 'fear-lv':
        if (this.alive(me)) this.victim(me, 'npc').fear = Phaser.Math.Clamp(n(1), 0, FEAR_MAX);
        break;
      case 'fear-flee':
        if (this.alive(me)) this.startFlee('npc', me);
        break;
      case 'fear-js':
        if (!this.alive(me)) break;
        this.freeze('npc', me, SCARE_FREEZE_MS);
        this.showScare(n(1) === 1 ? 1 : 0);
        break;
      case 'fear-w': {
        if (!this.alive(me)) break;
        // The other machine's screen is ours mirrored: its left is our right.
        const v = this.victim(me, 'npc');
        const got = [n(1), n(2), n(4), n(3), n(6), n(5)];
        for (const p of PARTS) {
          const w = Phaser.Math.Clamp(got[p], 0, WOUND_SEVERE);
          if (w > v.wounds[p]) v.woundAt[p] = this.now;
          v.wounds[p] = w;
        }
        break;
      }
      case 'fear-spin':
        if (s.form === 'slasher') this.startSpin('npc', Phaser.Math.Clamp(n(1), SPIN_MIN_MS, SPIN_MAX_MS));
        break;
      case 'fear-drag':
        if (this.alive(me) && s.form === 'slasher') this.startDrag('npc', me);
        break;
      case 'fear-snare':
        if (this.alive(me)) this.snare('npc', me, this.mirrorX(n(1)), n(2));
        break;
      case 'fear-slam': {
        s.drag = null;
        if (!this.alive(me)) break;
        const x = this.mirrorX(n(1));
        this.place(me, x, n(2));
        this.slamFx('npc', x, n(2), Math.atan2(n(2) - this.api.npc.y, x - this.api.npc.x));
        break;
      }
      case 'fear-rune':
        this.ensureLayers();
        s.rune = { x: this.mirrorX(n(1)), y: n(2), hp: RUNE_HP, flash: 0 };
        break;
      case 'fear-rev':
        this.revert('npc', true);
        break;
      case 'fear-phx':
        this.removePhobia('npc', n(1));
        break;
      case 'fear-sigh':
        this.signatureFx('npc', this.mirrorX(n(1)), n(2), 0);
        break;
      case 'fear-cl': {
        // The relay can outrun the cast it describes.
        if (s.claustro) this.applyStatueBits(s, n(1)); else s.pendingBits = n(1);
        break;
      }
      case 'fear-clx': {
        const p = s.phobias.find((q) => q.id === n(1));
        if (p) this.shatter('npc', p);
        break;
      }
      case 'fear-mz':
        if (this.alive(me)) this.startMaze('npc', me, n(1));
        break;
      case 'fear-mp':
        this.maze?.run.onRemotePos(n(1) / 1000, n(2) / 1000, n(3) / 1000);
        break;
      case 'fear-mzend':
        if (this.maze && this.maze.owner === 'npc') this.endMaze(n(1) === 1);
        break;
    }
  }

  /** How afraid the opponent is, for the machine that has to act on it. */
  private relayFear(): void {
    const s = this.sides.player;
    if (!this.api.isOnline || this.api.isInvasion || !this.isFear('player') || this.now < s.relayAt) return;
    const lvl = Math.round(this.fearOf(this.api.npc));
    if (lvl === s.relayed) return;
    s.relayed = lvl;
    s.relayAt = this.now + FEAR_RELAY_MS;
    this.api.broadcast(`fear-lv:${lvl}`);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== FEAR_ELEMENT_ID) return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const leftJust = left && !s.wasLeft;
    s.wasLeft = left;
    if (!this.alive(p) || this.maze || this.redacted) return;
    if (this.now < (this.victims.get(p)?.frozenUntil ?? 0)) return;
    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);
    const { eKey, rKey, fKey, qKey } = this.api;
    const just = (k: Phaser.Input.Keyboard.Key): boolean => Phaser.Input.Keyboard.JustDown(k);

    if (s.form === 'slasher') {
      const e = just(eKey);
      const r = just(rKey);
      const f = just(fKey);
      const q = just(qKey);
      // Signature Move: the click is the cone, and nothing else is on the table until it is over.
      if (s.sig) { if (leftJust) this.armSignature('player'); return; }
      // Somebody is on the chain: the only key left is the one that throws them down.
      if (s.drag) { if (e) this.slam('player'); return; }
      if (s.spin) return;
      if (e) { if (s.haunt) this.releaseHaunt('player'); else p.castAbility(FEAR_ID.haunt, ctx()); }
      if (s.haunt) return;
      if (left) p.castAbility(FEAR_ID.massacre, ctx());
      if (r) p.castAbility(FEAR_ID.signature, ctx());
      if (f) p.castAbility(FEAR_ID.descent, ctx());
      if (q && !s.hole) p.castAbility(FEAR_ID.fall, ctx());
      return;
    }
    const some = this.live('player').length > 0;
    if (leftJust && !s.claustro) p.castAbility(FEAR_ID.phobia, ctx());
    if (just(eKey) && some) p.castAbility(FEAR_ID.grasp, ctx());
    if (just(rKey) && some && !s.gaze) p.castAbility(FEAR_ID.gaze, ctx());
    if (just(fKey) && !s.claustro && this.fearTotal('player') >= MANIFEST_FEAR) p.castAbility(FEAR_ID.manifest, ctx());
    if (just(qKey) && s.phobias.length > 0 && !s.claustro) p.castAbility(FEAR_ID.claustro, ctx());
  }

  // ── What ArenaScene asks ───────────────────────────────────────────────────

  private speedFor(owner: Owner): number {
    const f = this.fighter(owner);
    let m = 1;
    const v = this.victims.get(f);
    if (v) m *= this.woundSpeed(v);
    if (!this.isFear(owner)) return m;
    const s = this.side(owner);
    if (s.form !== 'slasher') return m;
    if (s.sig) return 0;
    m *= SLASHER_SPEED * (1 + SPEED_STACK * s.speedStacks);
    if (s.haunt) m *= HAUNT_SLOW;
    if (s.drag) m *= DRAG_SPEED;
    return m;
  }

  getPlayerSpeedMult(): number { return this.speedFor('player'); }
  getNpcSpeedMult(): number { return this.speedFor('npc'); }
  getNpcYankUntil(): number { return this.npcYankUntil; }

  /** No dodge roll: held by fear, on a chain or a hook, down the hole, or wearing a body far too heavy for one. */
  isPlayerControlLost(): boolean {
    const p = this.api.player;
    const v = this.victims.get(p);
    if (this.maze || this.redacted) return true;
    if (v && (v.fleeing || this.now < v.frozenUntil || this.now < v.snaredUntil)) return true;
    if (BOTH.some((o) => this.side(o).drag?.victim === p)) return true;
    return this.isSlasher('player');
  }

  /** Invasion: husks leave a player alone while they are down the hole. Nothing else hides Fear. */
  isPlayerHidden(): boolean { return false; }

  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (s.form === 'slasher') {
      const id = SLASHER_OF[abilityId] ?? abilityId;
      if (id === FEAR_ID.haunt && s.haunt) return s.haunt.charge;
      if (id === FEAR_ID.haunt && s.spin) return Phaser.Math.Clamp((s.spin.until - this.now) / (s.spin.until - s.spin.start), 0, 1);
      if (id === FEAR_ID.haunt && s.drag) return Phaser.Math.Clamp((s.drag.until - this.now) / DRAG_MS, 0, 1);
      return p.getCooldownRatio(id);
    }
    // Manifest's card fills with the fear on the field as well as with its cooldown.
    if (abilityId === FEAR_ID.manifest) {
      return Math.min(p.getCooldownRatio(abilityId), Phaser.Math.Clamp(this.fearTotal('player') / MANIFEST_FEAR, 0, 1));
    }
    return p.getCooldownRatio(abilityId);
  }

  private relabelBars(slasher: boolean): void {
    if (this.barsSlasher === slasher) return;
    this.barsSlasher = slasher;
    const abs = this.api.player.element.abilities;
    this.api.abilityBars.forEach((bar) => {
      const base = abs.find((a) => a.id === bar.abilityId);
      if (!base) return;
      const shown = slasher ? abs.find((a) => a.id === SLASHER_OF[base.id]) ?? base : base;
      bar.lbl?.setText(`${shown.displayKey}  ${shown.name}`);
      bar.desc?.setText(shown.description);
    });
  }

  /** Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`): phobias are summons; marble is not razed mid-rite. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (const owner of BOTH) {
      if (owner === exceptOwner) continue;
      for (const p of [...this.side(owner).phobias]) {
        if (p.statue || this.dist(x, y, p.x, p.y) > radius) continue;
        report?.(p.x, p.y);
        this.removePhobia(owner, p.id);
        razed++;
      }
    }
    return razed;
  }

  /** FormRevert contract: the slasher is a body. */
  revertForms(f: Fighter): string[] {
    for (const owner of BOTH) {
      if (this.fighter(owner) !== f || this.side(owner).form !== 'slasher' || this.maze) continue;
      this.revert(owner, true);
      this.relay(owner, 'fear-rev');
      return ['Slasher'];
    }
    return [];
  }

  // ── Bot ────────────────────────────────────────────────────────────────────
  //
  // The bot presses its keys in NpcOpponent; these are the kit's reads of what each key would do
  // right now. All side-effect free.

  private botTarget(): Fighter | null { return this.isFear('npc') ? this.nearestTarget('npc') : null; }

  /** Mid-move: nothing should be pressed. */
  npcFearBusy(): boolean {
    const s = this.sides.npc;
    return !!(this.maze || this.redacted || s.sig);
  }
  npcFearPhobias(): number { return this.live('npc').length; }
  /** Stalking, or the hook is going round: keep walking at them and press nothing. */
  npcFearHaunting(): boolean { return !!(this.sides.npc.haunt || this.sides.npc.spin); }

  /**
   * Haunt → butcher's hook: somebody is on the chain, and this is where to walk so that they are
   * pulled onto the nearest hook (a chain's length past it, on the far side from them).
   */
  npcFearDragTo(): { x: number; y: number } | null {
    const d = this.sides.npc.drag;
    if (!d || !this.alive(d.victim)) return null;
    const t = d.victim;
    let best: Pt | null = null;
    let bestD = Infinity;
    for (const h of this.hookSpots()) {
      const dd = this.dist(t.x, t.y, h.x, h.y);
      if (dd < bestD) { bestD = dd; best = h; }
    }
    if (!best) return null;
    const a = Math.atan2(best.y - t.y, best.x - t.x);
    const b = this.api.bounds;
    return {
      x: Phaser.Math.Clamp(best.x + Math.cos(a) * (DRAG_LEN + 8), b.left + 20, b.right - 20),
      y: Phaser.Math.Clamp(best.y + Math.sin(a) * (DRAG_LEN + 8), b.top + 20, b.bottom - 20),
    };
  }
  npcFearManifestReady(): boolean {
    return this.isFear('npc') && this.sides.npc.form === 'fear' && !this.sides.npc.claustro && this.fearTotal('npc') >= MANIFEST_FEAR;
  }

  /** Phobia → Grasp: the target is inside some phobia's reach. */
  npcFearGraspAim(): { x: number; y: number } | null {
    const t = this.botTarget();
    if (!t || this.sides.npc.form !== 'fear') return null;
    return this.live('npc').some((p) => this.dist(p.x, p.y, t.x, t.y) < GRASP_RANGE - 12) ? { x: t.x, y: t.y } : null;
  }

  /** Phobia → Gaze: the target is standing in the line between a phobia and us. */
  npcFearGazeCovers(): boolean {
    const t = this.botTarget();
    const s = this.sides.npc;
    if (!t || s.form !== 'fear' || s.gaze) return false;
    return this.live('npc').some((p) => {
      const c = this.gazeCone('npc', p);
      return this.inCone(p.x, p.y, c.ang, GAZE_HALF_MIN * 1.6, c.len, t);
    });
  }

  /** Where the next phobia belongs: just past the target, so they stand between it and us. */
  npcFearPhobiaSpot(): { x: number; y: number } | null {
    const t = this.botTarget();
    const s = this.sides.npc;
    if (!t || s.form !== 'fear' || s.claustro) return null;
    const f = this.api.npc;
    // A full set that already has the target covered is left alone.
    if (this.live('npc').length >= PHOBIA_CAP && this.live('npc').some((p) => this.dist(p.x, p.y, t.x, t.y) < GRASP_RANGE)) return null;
    const a = Math.atan2(t.y - f.y, t.x - f.x) + (Math.random() - 0.5) * 0.5;
    const b = this.api.bounds;
    return {
      x: Phaser.Math.Clamp(t.x + Math.cos(a) * 85, b.left + 24, b.right - 24),
      y: Phaser.Math.Clamp(t.y + Math.sin(a) * 85, b.top + 28, b.bottom - 24),
    };
  }

  /** Phobias → Claustrophobia: at least one of them will be occupied. */
  npcFearClaustroOpen(): boolean {
    const s = this.sides.npc;
    return this.isFear('npc') && s.form === 'fear' && !s.claustro && s.phobias.length >= 2;
  }

  /** Slasher: an own phobia in machete reach while the target is not — cut it down for the speed. */
  npcFearFodder(): { x: number; y: number } | null {
    const t = this.botTarget();
    const s = this.sides.npc;
    if (!t || s.form !== 'slasher' || s.haunt || s.spin || s.drag) return null;
    const f = this.api.npc;
    if (this.dist(f.x, f.y, t.x, t.y) < STAB_RANGE + 60) return null;
    const p = this.live('npc').find((q) => this.dist(f.x, f.y, q.x, q.y) < STAB_RANGE);
    return p ? { x: p.x, y: p.y } : null;
  }

  /** Slasher: nobody left to fall, or the form has run long with nothing in reach — go back. */
  npcFearShouldDescend(): boolean {
    const s = this.sides.npc;
    return s.form === 'slasher' && !s.hole && !s.haunt && !s.spin && !s.drag && this.now - s.slasherSince > 28000;
  }

  /** The player's slasher is out: a bot sees a flashlight's worth and wanders. */
  npcBlinded(): boolean {
    return this.isSlasher('player') && !this.api.isInvasion && !this.maze;
  }

  /**
   * Somewhere the bot should walk to and hit instead of fighting: the rune once it has stumbled
   * close enough to notice it, or the statue it has picked to break.
   */
  npcObjective(): { x: number; y: number } | null {
    if (!this.isFear('player') || this.api.isInvasion || this.maze) return null;
    const s = this.sides.player;
    const n = this.api.npc;
    if (!this.alive(n)) return null;
    if (s.rune && s.form === 'slasher' && this.dist(n.x, n.y, s.rune.x, s.rune.y) < RUNE_NOTICE) return { x: s.rune.x, y: s.rune.y };
    const c = s.claustro;
    if (!c) return null;
    let p = s.phobias[c.botPick];
    if (!p?.statue) {
      // A sharp bot tends to pick an empty one; a slack one takes whichever is nearest.
      const safe = s.phobias.filter((q) => q.statue && !q.statue.real);
      const pool = safe.length && Math.random() > 0.35 + this.api.npcSlack ? safe : s.phobias.filter((q) => q.statue);
      pool.sort((a, b) => this.dist(n.x, n.y, a.x, a.y) - this.dist(n.x, n.y, b.x, b.y));
      c.botPick = pool.length ? s.phobias.indexOf(pool[0]) : -1;
      p = s.phobias[c.botPick];
    }
    return p ? { x: p.x, y: p.y } : null;
  }

  /** The bot's Haunt has no second key press to make: the kit lets go for it. */
  private updateBot(): void {
    if (!this.isFear('npc') || !this.simulates('npc')) return;
    const s = this.sides.npc;
    const h = s.haunt;
    if (!h) return;
    const t = this.nearestTarget('npc');
    const d = t ? this.dist(this.api.npc.x, this.api.npc.y, t.x, t.y) : Infinity;
    // Let go where the hook will find them: inside its circle, or just outside it and closing.
    if (h.charge >= 1 ? d < SPIN_RADIUS + 50 : (d < SPIN_RADIUS - 8 && h.charge >= 0.4)) this.releaseHaunt('npc');
    else if (this.now - h.since > 9000) this.releaseHaunt('npc');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    this.maze?.run.destroy();
    this.maze = null;
    this.redacted = null;
    this.scare = null;
    for (const [f, prev] of this.scaled) if (f?.active) f.setScale(prev);
    this.scaled.clear();
    this.sides = { player: makeSide(), npc: makeSide() };
    this.victims.clear();
    this.greyed = new WeakSet();
    this.struck = new WeakSet();
    this.pulseUntil = 0;
    this.npcYankUntil = 0;
    this.puddles = [];
    this.hooks = null;
    this.chartOf = null;
    this.barsSlasher = false;
    this.vizT = 0;
    this.untilt();
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.airGfx, this.topGfx, this.screenGfx, this.darkHoles]) g?.destroy();
    this.groundGfx = this.airGfx = this.topGfx = this.screenGfx = this.darkHoles = null;
    this.darkRect?.destroy(); this.darkRect = null;
    this.redactedText?.destroy(); this.redactedText = null;
  }

  private untilt(): void {
    if (!this.camTilted) return;
    this.camTilted = false;
    this.api.scene.cameras?.main?.setRotation(0);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(6.2);
    if (!this.topGfx) this.topGfx = scene.add.graphics().setDepth(16.6);
    if (!this.screenGfx) this.screenGfx = scene.add.graphics().setDepth(40).setScrollFactor(0);
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene)
      ?? new FearAvatar(this.api.scene, this.col(owner), owner);
  }

  private ensureAvatars(): void {
    if (this.isFear('player') && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (!this.isFear('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isFear('npc') && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
    if (!this.isFear('npc') && this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
  }

  private idle(): boolean {
    if (this.isFear('player') || this.isFear('npc')) return false;
    if (this.maze || this.redacted || this.scare || this.victims.size || this.playerAvatar || this.npcAvatar) return false;
    return !BOTH.some((o) => this.side(o).phobias.length || this.side(o).form === 'slasher');
  }

  /** Which way everybody is looking: the cursor for the human, the way it is walking for a bot. */
  private updateFacing(): void {
    const { player, npc, scene } = this.api;
    if (this.alive(player)) {
      const ptr = scene.input.activePointer;
      player.facingAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    }
    if (this.alive(npc) && !npc.netGhost) {
      const v = (npc.body as Body | null)?.velocity;
      if (v && Math.hypot(v.x, v.y) > 12) npc.facingAngle = Math.atan2(v.y, v.x);
    }
  }

  update(time: number, delta: number): void {
    void time;
    if (this.idle()) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;
    this.updateFacing();

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isFear(owner) || !this.alive(f)) {
        // The gentleman is gone, and so is everything he was holding up.
        if (s.form === 'slasher' && !this.maze) this.revert(owner, false);
        s.spin = null;
        s.drag = null;
        if (s.phobias.length && !this.isFear(owner)) s.phobias = [];
        s.gaze = null;
        if (s.claustro) this.endClaustro(owner);
        continue;
      }
      this.updateDrain(owner);
      this.updateGrasp(owner);
      this.updateGaze(owner, delta);
      this.updateSlasher(owner, delta);
      this.updateHaunt(owner, delta);
      this.updateSpin(owner);
      this.updateDrag(owner);
      this.updateSignature(owner);
      this.updateHole(owner);
      this.updateClaustro(owner, delta);
      if (s.stab && this.now - s.stab.at > STAB_MS) s.stab = null;
    }
    this.updateGreying();
    this.updateVictims(delta);
    this.updateBot();
    this.updateMaze(delta);
    this.updateRedacted();
    this.relayFear();
    if (this.isFear('player')) this.relabelBars(this.sides.player.form === 'slasher');
    this.paint();
    this.paintScreen();
    this.updateAvatars(delta);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paint(): void {
    const ground = this.groundGfx!;
    const air = this.airGfx!;
    const top = this.topGfx!;
    ground.clear();
    air.clear();
    top.clear();
    if (this.maze || this.redacted) return;
    const t = this.vizT;
    const now = this.now;

    if (this.puddles.length) {
      while (this.puddles.length && now - this.puddles[0].born >= PUDDLE_MS) this.puddles.shift();
      for (const p of this.puddles) drawBloodPuddle(ground, this.col(p.by), p.x, p.y, p.r, p.seed, (now - p.born) / PUDDLE_MS);
    }
    if (this.hooksShown()) {
      // Somebody is being dragged: the hooks call out. Otherwise they just stand there.
      const dragger = BOTH.find((o) => this.side(o).drag) ?? null;
      const hookTint = this.col(dragger ?? (this.side('player').form === 'slasher' ? 'player' : 'npc'));
      this.hookSpots().forEach((h, i) => {
        let loaded = false;
        for (const v of this.victims.values()) if (now < v.snaredUntil && v.snareX === h.x && v.snareY === h.y) loaded = true;
        drawButcherHook(ground, air, hookTint, h.x + 15, h.y + 8, t, 31 + i * 7, dragger ? 1 : 0, loaded);
      });
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      const f = this.fighter(owner);

      const rect = this.claustroRect(owner);
      if (rect) drawClosingWalls(ground, tint, this.api.bounds, rect, t);
      if (s.hole) drawHole(ground, tint, s.hole.x, s.hole.y, s.hole.r, t);

      const foe = this.nearestTarget(owner);
      for (const p of s.phobias) {
        if (p.statue) {
          drawStatue(air, tint, p.x, p.y, t, { hp: Math.max(0, p.statue.hp / STATUE_HP), bleed: p.statue.bleed, seed: p.seed, flash: p.statue.flash });
          continue;
        }
        const clawK = p.clawAt >= 0 && now - p.clawAt < GRASP_MS ? (now - p.clawAt) / GRASP_MS : -1;
        if (clawK >= 0) drawGraspCone(ground, tint, p.x, p.y, p.clawAng, GRASP_HALF, GRASP_RANGE, 1 - clawK);
        let gaze = 0;
        if (s.gaze && this.alive(f)) {
          const c = this.gazeCone(owner, p);
          const left = s.gaze.until - now;
          gaze = Math.min(1, (GAZE_MS - left) / 300, left / 250);
          drawGazeCone(ground, tint, p.x, p.y, c.ang, p.gazeHalf, c.len, t, Math.max(0, gaze));
        }
        const look = foe ? Math.atan2(foe.y - p.y, foe.x - p.x) : 0;
        const rise = Math.min(1, (now - p.born) / 320);
        drawPhobia(air, tint, p.x, p.y, t, { look, gaze: Math.max(0, gaze), claw: clawK, clawAng: p.clawAng, alpha: rise, seed: p.seed });
      }

      if (s.stab && this.alive(f)) {
        drawMacheteStab(air, tint, f.x, f.y, s.stab.ang, s.stab.reach, Phaser.Math.Clamp((now - s.stab.at) / STAB_MS, 0, 1));
      }
      if (s.spin && this.alive(f)) {
        const left = s.spin.until - now;
        drawHookSpin(air, tint, f.x, f.y, this.hookAngle(s.spin), SPIN_RADIUS, t, Math.min(1, (now - s.spin.start) / 120, left / 160));
      }
      if (s.drag && this.alive(f) && this.alive(s.drag.victim)) drawDragChain(air, tint, f.x, f.y, s.drag.victim.x, s.drag.victim.y, t);
      // The cone is the slasher's own secret: only the one aiming it ever sees it.
      if (s.sig && owner === 'player') drawSignatureCone(ground, tint, s.sig.x, s.sig.y, s.sig.ang, SIG_HALF, this.sigLen(), s.sig.phase === 'armed', t);
      if (s.rune) drawRune(top, tint, s.rune.x, s.rune.y, t, Math.max(0, s.rune.hp / RUNE_HP), s.rune.flash);
    }

    for (const [f, v] of this.victims) {
      if (!this.alive(f) || f.forceInvisible) continue;
      const tint = this.col(v.by);
      const r = this.bodyR(f);
      if (v.drain) drawDrainLine(air, tint, f.x, f.y, v.drain.x, v.drain.y, t, v.fear / FEAR_MAX);
      // Cut parts show as cuts; severe ones run.
      let cuts = v.bloodied;
      for (const p of PARTS) cuts += woundLevel(v.wounds[p]);
      if (cuts > 0) drawGashes(air, tint, f.x, f.y, r, Math.min(12, cuts), v.seed, t);
      if (now < v.frozenUntil) drawFrozenFear(air, tint, f.x, f.y, r, t);
      if (v.fear >= 1) drawFearMeter(air, tint, f.x, f.y - r - 22, v.fear / FEAR_MAX, t, v.fleeing);
    }
  }

  /** Everything pinned to the glass: the dark, the red at the edges, the thing in your face. */
  private paintScreen(): void {
    const g = this.screenGfx!;
    g.clear();
    const { width: W, height: H, scene } = this.api;
    const me = this.api.player;
    const now = this.now;
    const t = this.vizT;

    // The enemy's slasher is out: all we have is a flashlight.
    const dark = this.isSlasher('npc') && !this.api.isInvasion && !this.maze && !this.redacted && this.alive(me);
    if (dark) {
      if (!this.darkRect) {
        this.darkRect = scene.add.rectangle(W / 2, H / 2, W * 1.2, H * 1.2, 0x020203, 0.95).setDepth(16);
        this.darkHoles = scene.make.graphics({}, false);
        const mask = this.darkHoles.createGeometryMask();
        mask.invertAlpha = true;
        this.darkRect.setMask(mask);
      }
      this.darkRect.setVisible(true);
      const light = this.lightOf(me);
      this.darkHoles!.clear();
      drawFlashlightMask(this.darkHoles!, me.x, me.y, light.ang, LIGHT_HALF, LIGHT_LEN, 34, light.flicker);
    } else if (this.darkRect) {
      this.darkRect.setVisible(false);
    }

    if (now < this.pulseUntil) drawVignette(g, W, H, 0.55 * Math.min(1, (this.pulseUntil - now) / 420), this.ncol(FEAR.blood));
    const mine = this.victims.get(me);
    if (mine && mine.fear >= 60 && !this.maze) {
      // Dread you can see coming: the edges close in as the meter fills.
      drawVignette(g, W, H, ((mine.fear - 60) / 40) * (0.35 + 0.15 * Math.sin(t * 5)), 0x000000);
    }

    // Vision swims: the whole world leans, slowly, the wrong way.
    const swimming = this.alive(me) && Date.now() < me.hallucinatingUntil && !this.maze;
    if (swimming) {
      this.camTilted = true;
      scene.cameras.main.setRotation(Math.sin(t * 1.3) * 0.022 + Math.sin(t * 2.9) * 0.009);
      drawVignette(g, W, H, 0.3 + 0.2 * Math.sin(t * 2.1), 0x1a0508);
    } else {
      this.untilt();
    }

    this.paintChart(g, W, H, t);

    if (this.redacted) {
      const k = Phaser.Math.Clamp((now - this.redacted.start) / REDACTED_MS, 0, 1);
      drawRedacted(g, W, H, k, t);
      if (!this.redactedText) {
        this.redactedText = scene.add.text(W / 2, H / 2, 'REDACTED', {
          fontFamily: FONT_DISPLAY, fontSize: '64px', color: '#f2f2f2', letterSpacing: 18,
        }).setOrigin(0.5).setDepth(40.1).setScrollFactor(0).setRotation(-0.035);
      }
      this.redactedText.setVisible(true).setAlpha(Math.random() < 0.06 ? 0.4 : 1);
    } else if (this.redactedText) {
      this.redactedText.setVisible(false);
    }

    if (this.scare) {
      const k = (now - this.scare.start) / SCARE_SHOW_MS;
      if (k >= 1) this.scare = null;
      else drawJumpscare(g, this.ncol, W, H, k, t, this.scare.variant);
    }
  }

  /** The slasher's own chart of the body he is working on, bottom right of his screen and nobody else's. */
  private paintChart(g: Phaser.GameObjects.Graphics, W: number, H: number, t: number): void {
    if (!this.isSlasher('player') || this.maze || this.redacted) return;
    const targets = this.targetsOf('player');
    const who = this.chartOf && targets.includes(this.chartOf) ? this.chartOf : this.nearestTarget('player');
    if (!who) return;
    const v = this.victims.get(who);
    const wounds = v?.wounds ?? [0, 0, 0, 0, 0, 0];
    const now = this.now;
    drawBodyChart(
      g, W - 64, H - 172, t,
      wounds.map(woundLevel), wounds.map((w) => w / WOUND_SEVERE),
      PARTS.map((p) => Phaser.Math.Clamp(1 - (now - (v?.woundAt[p] ?? -1e9)) / 380, 0, 1)),
      { bleeding: v ? this.bleedRate(v) / BLEED_PART : 0, hooked: !!v && now < v.snaredUntil },
    );
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.maze || this.redacted) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      let ang = f.facingAngle;
      if (owner === 'npc') {
        const t = this.nearestTarget('npc') ?? this.api.player;
        if (t) ang = Math.atan2(t.y - f.y, t.x - f.x);
      }
      av.setFacing(ang);
      av.setMastered(false);
      if (av instanceof FearAvatar) {
        av.setForm(s.form);
        av.setHaunting(!!s.haunt);
      }
      av.setHold(s.sig ? 'reach' : s.haunt ? 'brace' : null, ang);
      // In the enemy's dark the slasher is only ever what the flashlight finds.
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha * (s.haunt ? 0.75 : 1));
    }
  }
}
