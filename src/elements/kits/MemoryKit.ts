import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { Ability, CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  MEMORY, MemoryAvatar, MemoryColorFn, MemoryFx, latchedShard, rebirthLine, saltBall, saltBorder, saltPhantom,
  shardBody, staticBubble, staticDisc, staticEcho, staticRect, woundMark,
} from './MemoryVisuals';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];

const ID = {
  click: 'memory-forget',
  e: 'memory-snatch',
  r: 'memory-rebirth',
  f: 'memory-repression',
  q: 'memory-trauma',
};

// ── Click: Forget ────────────────────────────────────────────────────────────
const SHARD_SPEED = 700;
const SHARD_RANGE = 620;
const SHARD_R = 6;
const SHARD_DMG = 6;
const LATCH_MS = 5000;
const MAX_LATCH = 3;
// One shard: a bot aiming at the Memory it carries a shard from goes wide 40% of the time (ArenaScene.scatterAim).
/** Three shards: how often a bot re-rolls whether it can read its bars, and how often it can't. */
const BLIND_ROLL_MS = 800;
const BLIND_CHANCE = 0.45;

// ── E: Memory Snatch ─────────────────────────────────────────────────────────
const SPIN_MS = 2000;
const SPIN_SPEED_MULT = 0.4;
const SNATCH_MAX = 560;
const SNATCH_MIN = 140;
const SNATCH_W = 22;
const SNATCH_DMG = 20;
const SLICE_DMG = 9;
const SLICE_HALF_ANGLE = Phaser.Math.DegToRad(30);
const SLICE_SWEEP_MS = 240;
const SLICE_W = 14;
/** The main line: each ready ability gives back at most this long, and all of them together at most this. */
const STEAL_PER_ABILITY_MS = 6000;
const STEAL_TOTAL_MS = 12000;
/** A replica's bars live on its own machine: what each ready one counts for. */
const STEAL_GHOST_MS = 2500;
const SLICE_LOCK_MS = 2000;
const SLICE_REFUND_MS = 2000;

// ── R: Practice (the sweep is still called Rebirth inside the kit) ───────────
const SWEEP_RAD_PER_S = Math.PI * 1.5;
const SWEEP_MAX_MS = 3000;
const REBIRTH_W = 40;
/** Practice's beam: the base, and what every strike adds for the rest of the match. */
const REBIRTH_DMG = 24;
const PRACTICE_DMG_PER_USE = 4;
/** Brain Drain (R+): the old Rebirth's seal on their passives, and how long it lasts. */
const SEAL_MS = 8000;

// ── F: Repression ────────────────────────────────────────────────────────────
const RECORD_MS = 6000;
const SAMPLE_MS = 60;
const ECHO_R = 20;
const ECHO_BOLT_SPEED = 620;
const ECHO_BOLT_RANGE = 600;
/** The stand-in bolt, for the two clicks whose cast lives wholly in their kit's input (`KIT_DRIVEN_CLICKS`). */
const ECHO_CLICK_DMG = 7;
/** Clicks whose `cast()` is empty — their kit drives them off the held button — so the copy cannot run them. */
const KIT_DRIVEN_CLICKS = new Set(['bash', 'light-lance']);

// ── Q: Trauma ────────────────────────────────────────────────────────────────
const TRAUMA_MS = 5000;
const TRAUMA_SHARE = 0.05;
const WOUND_TICK_MS = 1000;

// ── Shop upgrades ────────────────────────────────────────────────────────────
// Click+: none yet.
// E+ Shutdown: each snatch also steals ultimate charge — a flat bite plus a share of the bank,
// so a fuller bank loses more. The beam takes more than a slice.
const SHUTDOWN_MAIN_FLAT = 14;
const SHUTDOWN_MAIN_SHARE = 0.3;
const SHUTDOWN_SLICE_FLAT = 6;
const SHUTDOWN_SLICE_SHARE = 0.15;
// R+ Brain Drain: Practice's strike seals their passives and drains their snowball (`SEAL_MS`).
// F+ Unforgettable: the copy lasts 8s, walking the recording back once it runs out; a recording
// also copies every static copy on the field; up to 10 at once.
const ECHO_UP_MS = 8000;
const MAX_ECHOES = 10;
/** Given back off Repression's cooldown when an Unforgettable recording ends, so the next one can catch the copy. */
const UNFORGETTABLE_REFUND_MS = 7000;
// Q+ Salt in the Wound: for the length of the window, red static along the walls and phantoms in
// it that throw static balls.
const SALT_PHANTOMS = 5;
const SALT_INSET = 30;
const SALT_BAND = 24;
const SALT_THROW_MS = 1700;
const SALT_SPEED = 950;
const SALT_R = 7;
const SALT_DMG = 12;
const SALT_RANGE = 1300;
const SALT_TRAIL = 7;
const SALT_BUBBLE_MS = 900;
/** What the phantoms used to be, before the static got them. */
const SALT_COLORS = [0xff6a2a, 0x3a8cff, 0x55d66b, 0xffe24a, 0x9b6a3c, 0x8a5cff, 0x7fe0ff, 0xff4fb8];

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_SNATCH_RANGE = 500;
const NPC_REBIRTH_OFFSET = 90;

// ── Types ────────────────────────────────────────────────────────────────────

interface Shard {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
}

interface Spin {
  start: number;
}

interface Sweep {
  start: number;
  ang: number;
  px: number;
  py: number;
  trail: { x0: number; y0: number; x1: number; y1: number }[];
}

interface Sample { t: number; x: number; y: number }

/** One of their clicks: the real ability, run again from the copy (`castEchoClick`). */
interface CastRec { t: number; ability: Ability }

interface Recording {
  start: number;
  target: Fighter;
  samples: Sample[];
  casts: CastRec[];
  nextSample: number;
  hook: (abilityId: string) => void;
  /** Unforgettable: the copies being recorded too. */
  tracks: Track[];
}

/** Unforgettable: a static copy already on the field, recorded alongside the opponent. */
interface Track {
  echo: Echo;
  color: number;
  samples: Sample[];
  casts: CastRec[];
}

interface Echo {
  start: number;
  color: number;
  samples: Sample[];
  /** Every click it will cast, by time since `start` — Unforgettable's walk back included. */
  casts: CastRec[];
  next: number;
  x: number;
  y: number;
  /** How long the recording runs, and how long the copy stays out. */
  dur: number;
  life: number;
}

interface Phantom {
  x: number;
  y: number;
  color: number;
  seed: number;
  nextThrow: number;
  throwAt: number;
  aim: number;
  nextBubble: number;
  bubbleUntil: number;
}

interface Salt {
  start: number;
  until: number;
  phantoms: Phantom[];
}

interface SaltBall {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  trail: { x: number; y: number }[];
}

interface EchoBolt {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  color: number;
}

interface Wound {
  owner: Owner;
  dps: number;
  next: number;
  carry: number;
}

interface Side {
  aimX: number;
  aimY: number;
  spin: Spin | null;
  sweep: Sweep | null;
  rec: Recording | null;
  echoes: Echo[];
  /** Salt in the Wound: the phantoms in the walls, while the window is open. */
  salt: Salt | null;
  /** Trauma: when the window shuts (0 = none), and what each enemy has taken in it so far. */
  traumaUntil: number;
  traumaTaken: Map<Fighter, number>;
  traumaLastHp: Map<Fighter, number>;
  /** `damaged` listeners counting each hit into `traumaTaken` while the window is open. */
  traumaHooks: Map<Fighter, (amount: number) => void>;
  wasLeft: boolean;
  /** Practice: strikes made this match — each one adds `PRACTICE_DMG_PER_USE` for good. */
  practice: number;
  /** Bot: where it plants Rebirth's pivot. */
  botPivot: { x: number; y: number } | null;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, spin: null, sweep: null, rec: null, echoes: [], salt: null, traumaUntil: 0,
    traumaTaken: new Map(), traumaLastHp: new Map(), traumaHooks: new Map(), wasLeft: false, practice: 0, botPivot: null,
  };
}

export interface HudRect { x: number; y: number; w: number; h: number }

// ── Arena API ────────────────────────────────────────────────────────────────

export interface MemoryArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** Mirror an x across the arena — positions online are seen from the other side. */
  get worldW(): number;
  isTargetable(f: Fighter): boolean;
  memoryColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** Rebirth, the victim's half: drain that side's snowball. Returns labels of what went. */
  rebirthDrain(owner: Owner): string[];
  hasUpgrade(owner: Owner, slot: string): boolean;
  /** The local player's HUD: the top health gauge and every ability card, in screen space. */
  hudRects(): { hpGauge: HudRect | null; cards: HudRect[] };
}

// ── MemoryKit ────────────────────────────────────────────────────────────────

/**
 * Memory — the gentleman with a face of static.
 *
 * - **Guilt** (passive) — every hit an enemy of Memory takes is +1% on every hit after it. The
 *   kit only keeps `guiltMarked` on the right bodies; `Fighter.takeDamage` does the rest.
 * - **Forget** — an obsidian shard that latches for 5s, up to three. The static they cause is
 *   drawn here on the *victim's* screen: one hides Memory and its bar, two the victim's own
 *   health, three their cooldown cards. Bots go wide on one (`ArenaScene.scatterAim`) and lose
 *   track of their bars on three (`memoryBlindUntil`).
 * - **Memory Snatch** — a two-second cane spin, then a static beam to the cursor that splits into
 *   two slices sweeping out into a cone. The beam resets their ready abilities and gives Memory the
 *   time they sat idle; the slices lock theirs for 2s and give 2s back.
 * - **Practice** — a wall-to-wall line through the cursor that sweeps round; Click strikes along it.
 *   Every strike adds damage for the rest of the match.
 * - **Repression** — six seconds of recording the opponent's steps and clicks, then a static copy
 *   walks the steps and casts each click again — their real click, aimed at Memory's cursor.
 * - **Trauma** — a five-second window; afterwards each enemy relives 5% of what it took in it,
 *   every second, for the rest of the match. A new window replaces the old wounds.
 *
 * Shop upgrades: **Shutdown** (E+) — the snatch robs their ultimate bank too. **Brain Drain** (R+) —
 * Practice's strike seals their passives and drains their snowball (ArenaScene.memoryRebirthDrain),
 * pulled across into Memory. **Unforgettable** (F+) — 8s copies that walk the recording back, and a
 * recording copies the copies, up to 10. **Salt in the Wound** (Q+) — red static along the walls for
 * the window, with phantoms in it that throw static balls. Click+ is still to come.
 *
 * Online, the owner's sim decides every hit. What lands on the *victim's* own body — the snatched
 * cooldowns and Rebirth's drain — is relayed as `memory-*` pseudo-casts for the victim to apply.
 */
export class MemoryKit {
  private api: MemoryArenaApi;

  private readonly pcol: MemoryColorFn;
  private readonly ncol: MemoryColorFn;
  private readonly pfx: MemoryFx;
  private readonly nfx: MemoryFx;
  private playerAvatar: MemoryAvatar | null = null;
  private npcAvatar: MemoryAvatar | null = null;
  /** Shards in flight, latched shards, the copy, wound marks. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Rebirth's line — over the bodies. */
  private lineGfx: Phaser.GameObjects.Graphics | null = null;
  /** The static over a Memory and its health bar, on the screen of someone carrying a shard. */
  private veilGfx: Phaser.GameObjects.Graphics | null = null;
  /** The static over the local player's own HUD. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private shards: Shard[] = [];
  private echoBolts: EchoBolt[] = [];
  private saltBalls: SaltBall[] = [];
  /** Which way each latched shard sits on a body, parallel to `Fighter.memoryShards`. */
  private latchAngles = new Map<Fighter, number[]>();
  private wounds = new Map<Fighter, Wound>();
  private marked = new Set<Fighter>();
  private nextBlindRoll = 0;

  constructor(api: MemoryArenaApi) {
    this.api = api;
    this.pcol = (base) => api.memoryColor('player', base);
    this.ncol = (base) => api.memoryColor('npc', base);
    this.pfx = new MemoryFx(api.scene, this.pcol);
    this.nfx = new MemoryFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MemoryFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MemoryColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): MemoryAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

  private isMemory(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'memory' : this.api.npcElementId === 'memory';
  }

  private up(owner: Owner, slot: string): boolean {
    return this.isMemory(owner) && this.api.hasUpgrade(owner, slot);
  }

  /** Brain Drain: Practice's strike also seals their passives and drains their snowball. */
  private stripsKit(owner: Owner): boolean { return this.up(owner, 'r'); }

  /**
   * Whether this sim decides what this side's attacks do. An online opponent (or a co-op ally in
   * the npc slot of an Invasion) is simulated on its own machine: here it is drawn, nothing more.
   */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.api.isOnline && !this.api.isInvasion);
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
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

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private canAct(f: Fighter, slot: 'click' | 'other'): boolean {
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil) return false;
    if (slot !== 'click' && wall < f.silencedUntil) return false;
    return true;
  }

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  /** The chord a line through (px,py) at `ang` cuts across the arena. */
  private chord(px: number, py: number, ang: number): { x0: number; y0: number; x1: number; y1: number } {
    const b = this.api.bounds;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const reach = (sx: number, sy: number): number => {
      let best = Infinity;
      if (sx > 1e-6) best = Math.min(best, (b.right - px) / sx);
      if (sx < -1e-6) best = Math.min(best, (b.left - px) / sx);
      if (sy > 1e-6) best = Math.min(best, (b.bottom - py) / sy);
      if (sy < -1e-6) best = Math.min(best, (b.top - py) / sy);
      return Number.isFinite(best) ? Math.max(0, best) : 0;
    };
    const f = reach(dx, dy);
    const r = reach(-dx, -dy);
    return { x0: px - dx * r, y0: py - dy * r, x1: px + dx * f, y1: py + dy * f };
  }

  private clampToArena(x: number, y: number, pad = 24): { x: number; y: number } {
    const b = this.api.bounds;
    return { x: Phaser.Math.Clamp(x, b.left + pad, b.right - pad), y: Phaser.Math.Clamp(y, b.top + pad, b.bottom - pad) };
  }

  /** Every Memory hit goes through here — and only on the sim that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, opts?: DamageOpts): void {
    const f = this.fighter(owner);
    t.takeDamage(Math.round(dmg), { source: f, sourceX: f.x, sourceY: f.y, ...opts });
  }

  /** Where this side is aiming: the player's cursor, a bot's target. */
  private aimOf(owner: Owner): { x: number; y: number } {
    const s = this.side(owner);
    if (owner === 'npc') {
      const t = this.nearestTarget('npc');
      if (t) return { x: t.x, y: t.y };
    }
    return { x: s.aimX, y: s.aimY };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const owner of BOTH) { this.stopRecording(owner); this.unhookTrauma(owner); }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.shards = [];
    this.echoBolts = [];
    this.saltBalls = [];
    this.latchAngles.clear();
    this.wounds.clear();
    for (const f of [...this.marked, ...this.allFighters()]) {
      f.guiltMarked = false;
      f.guiltStacks = 0;
      f.memoryShards = [];
      f.memoryShardMirror = 0;
      f.memoryShardMirrorUntil = 0;
      f.passivesSealedUntil = 0;
      f.memoryBlindUntil = 0;
    }
    this.marked.clear();
    this.nextBlindRoll = 0;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.airGfx, this.lineGfx, this.veilGfx, this.hudGfx]) g?.destroy();
    this.airGfx = this.lineGfx = this.veilGfx = this.hudGfx = null;
    for (const id of ['memory-spin', 'memory-sweep', 'memory-record', 'memory-replay', 'memory-trauma']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.lineGfx) this.lineGfx = scene.add.graphics().setDepth(9.5);
    // Over the sprite, the rig and the over-head bars (depth 10).
    if (!this.veilGfx) this.veilGfx = scene.add.graphics().setDepth(10.5);
    // Over the tray and the top gauge.
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(26);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isMemory('player') && !this.playerAvatar) this.playerAvatar = new MemoryAvatar(scene, this.pcol);
    if (!this.isMemory('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isMemory('npc') && !this.npcAvatar) this.npcAvatar = new MemoryAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'memory') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const leftJust = left && !s.wasLeft;
    s.wasLeft = left;
    if (!this.alive(p)) return;

    // Rebirth's sweep owns the click: the press strikes the line.
    if (s.sweep) {
      s.sweep.px = mouseX;
      s.sweep.py = mouseY;
      if (leftJust && this.canAct(p, 'click')) this.fireRebirth('player');
      return;
    }

    if (left && !s.spin && this.canAct(p, 'click')) p.castAbility(ID.click, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey) && !s.spin) p.castAbility(ID.e, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey) && !s.spin) p.castAbility(ID.r, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility(ID.f, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility(ID.q, this.api.buildPlayerContext(mouseX, mouseY));
  }

  /**
   * Online: what only the owner's sim decides. Gameplay was settled on their machine; this keeps
   * our picture of them honest — and the snatch and the drain land on *our* body, which only our
   * sim may rob.
   */
  replayNet(id: string): void {
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const f = this.api.npc;
    const me = this.api.player;
    this.ensureLayers();
    this.ensureAvatars();
    if (head === 'memory-fire') {
      // Their x is seen from the other side of the arena, and so is an angle.
      const s = this.sides.npc;
      if (!s.sweep) s.sweep = { start: this.now, ang: 0, px: 0, py: 0, trail: [] };
      s.sweep.px = this.api.worldW - n(1);
      s.sweep.py = n(2);
      s.sweep.ang = Math.PI - n(3) / 1000;
      if (this.alive(f)) this.fireRebirth('npc');
    } else if (head === 'memory-click') {
      // Their copy's click: the ability is one of ours, and their x is seen from across the arena.
      const ab = me.element.abilities.find((a) => a.id === parts[1]);
      if (ab && this.alive(f)) {
        this.castEchoClick('npc', ab, this.api.worldW - n(2), n(3), this.api.worldW - n(4), n(5), me.element.color);
      }
    } else if (head === 'memory-snatched') {
      if (!this.alive(me)) return;
      // Shutdown's half lands here too: our bank is ours. Whatever it took goes back to them.
      const took = this.robVictim('npc', me, parts[1] === 'main', parts[2] === '1');
      if (took > 0 && this.api.isOnline) this.api.broadcast(`memory-ultgive:${Math.round(took)}`);
    } else if (head === 'memory-ultgive') {
      // Our snatch robbed their bank on their machine; this is what came out of it.
      if (this.alive(me) && this.alive(f)) this.gainUlt('player', f, n(1), true);
    } else if (head === 'memory-reborn') {
      if (this.alive(me)) this.drain('npc', me, 'player');
    } else if (head === 'memory-salt') {
      this.replaySaltThrow(Math.floor(n(1)), this.api.worldW - n(2), n(3), Math.PI - n(4) / 1000);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Forget. One obsidian shard. */
  doForget(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const x = f.x + Math.cos(ang) * 20;
    const y = f.y + Math.sin(ang) * 20;
    this.shards.push({ owner, x, y, vx: Math.cos(ang) * SHARD_SPEED, vy: Math.sin(ang) * SHARD_SPEED, travelled: 0 });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).shardLaunch(x, y, ang);
  }

  /** E — Memory Snatch. The wind-up; the beam goes when it ends. */
  doSnatch(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    s.spin = { start: this.now };
    this.avatar(owner)?.setSpin(true);
  }

  /** R — Rebirth. The line appears through the cursor and starts to sweep. */
  doRebirth(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    const t = owner === 'npc' ? this.nearestTarget('npc') : null;
    let px = tx;
    let py = ty;
    if (owner === 'npc' && t && this.simulates('npc')) {
      // A bot plants the pivot beside its target and waits for the sweep to cross them.
      const a = Math.random() * Math.PI * 2;
      const p = this.clampToArena(t.x + Math.cos(a) * NPC_REBIRTH_OFFSET, t.y + Math.sin(a) * NPC_REBIRTH_OFFSET, 30);
      px = p.x;
      py = p.y;
    }
    s.botPivot = owner === 'npc' ? { x: px, y: py } : null;
    s.sweep = { start: this.now, ang: Math.random() * Math.PI, px, py, trail: [] };
    this.avatar(owner)?.play('raise', -Math.PI / 2, 380);
  }

  /** F — Repression. Six seconds of the opponent, recorded. */
  doRepression(owner: Owner, tx: number, ty: number): void {
    void tx; void ty;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const t = this.nearestTarget(owner) ?? (owner === 'npc' ? this.api.player : null);
    if (!t) return;
    this.stopRecording(owner);
    const s = this.side(owner);
    const rec: Recording = {
      start: this.now, target: t, samples: [{ t: 0, x: t.x, y: t.y }], casts: [], nextSample: this.now + SAMPLE_MS,
      hook: (abilityId: string) => {
        // Only their clicks are copied.
        const a = t.element.abilities.find((ab) => ab.id === abilityId);
        if (a?.displayKey === 'Click') rec.casts.push({ t: this.now - rec.start, ability: a });
      },
      // Unforgettable: every copy already out is recorded too, and comes back as a copy of a copy.
      tracks: this.up(owner, 'f')
        ? s.echoes.map((e) => ({ echo: e, color: e.color, samples: [{ t: 0, x: e.x, y: e.y }], casts: [] }))
        : [],
    };
    for (const tr of rec.tracks) this.fx(owner).repressMark(tr.echo.x, tr.echo.y, true);
    t.on('cast', rec.hook);
    s.rec = rec;
    this.fx(owner).repressMark(f.x, f.y, true);
    this.avatar(owner)?.play('flex');
  }

  /** Q — Trauma. The window opens. */
  doTrauma(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    this.unhookTrauma(owner);
    s.traumaUntil = this.now + TRAUMA_MS;
    s.traumaTaken.clear();
    s.traumaLastHp.clear();
    this.hookTrauma(owner);
    this.fx(owner).traumaPulse(f.x, f.y);
    this.avatar(owner)?.play('raise', -Math.PI / 2, 520);
    if (this.up(owner, 'q')) this.startSalt(owner);
  }

  // ── Forget ─────────────────────────────────────────────────────────────────

  private latch(owner: Owner, t: Fighter, fromAng: number): void {
    const now = Date.now();
    t.memoryShards = t.memoryShards.filter((u) => u > now);
    const held = t.memoryShards.length;
    const angs = held ? (this.latchAngles.get(t) ?? []).slice(-held) : [];
    if (t.memoryShards.length >= MAX_LATCH) {
      t.memoryShards.shift();
      const old = angs.shift() ?? 0;
      const r = this.bodyR(t);
      this.fx(owner).shardBreak(t.x + Math.cos(old) * r, t.y + Math.sin(old) * r);
    }
    t.memoryShards.push(now + LATCH_MS);
    angs.push(fromAng);
    this.latchAngles.set(t, angs);
  }

  private updateShards(dt: number): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      const stepX = sh.vx * dt;
      const stepY = sh.vy * dt;
      sh.x += stepX;
      sh.y += stepY;
      sh.travelled += Math.hypot(stepX, stepY);
      const b = this.api.bounds;
      let done = sh.travelled > SHARD_RANGE || !b.contains(sh.x, sh.y);
      if (!done) {
        for (const t of this.targetsOf(sh.owner)) {
          if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > SHARD_R + this.bodyR(t)) continue;
          done = true;
          this.fx(sh.owner).shardHit(sh.x, sh.y);
          if (this.simulates(sh.owner)) {
            this.hit(sh.owner, t, SHARD_DMG);
            this.latch(sh.owner, t, Math.atan2(sh.y - t.y, sh.x - t.x));
          }
          break;
        }
      }
      if (done) this.shards.splice(i, 1);
    }
  }

  /** Expired latches crumble; a bot on three rolls whether it can read its bars this beat. */
  private updateLatches(): void {
    const now = Date.now();
    for (const f of this.allFighters()) {
      if (!f.memoryShards.length) continue;
      const angs = this.latchAngles.get(f) ?? [];
      while (f.memoryShards.length && f.memoryShards[0] <= now) {
        f.memoryShards.shift();
        const a = angs.shift() ?? 0;
        if (this.alive(f)) {
          const r = this.bodyR(f);
          this.fx('player').shardBreak(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
        }
      }
      this.latchAngles.set(f, angs);
    }
    if (this.now >= this.nextBlindRoll) {
      this.nextBlindRoll = this.now + BLIND_ROLL_MS;
      for (const f of this.allFighters()) {
        if (f === this.api.player || f.netGhost) continue;
        if (f.memoryShardCount() >= MAX_LATCH && Math.random() < BLIND_CHANCE) f.memoryBlindUntil = Date.now() + BLIND_ROLL_MS;
      }
    }
  }

  // ── Memory Snatch ──────────────────────────────────────────────────────────

  private updateSpin(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.spin) return;
    if (!this.alive(f) || !this.canAct(f, 'other')) {
      s.spin = null;
      this.avatar(owner)?.setSpin(false);
      return;
    }
    if (this.now - s.spin.start < SPIN_MS) return;
    s.spin = null;
    this.avatar(owner)?.setSpin(false);
    const aim = this.aimOf(owner);
    this.releaseSnatch(owner, aim.x, aim.y);
  }

  private releaseSnatch(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const len = Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, tx, ty), SNATCH_MIN, SNATCH_MAX);
    const x0 = f.x + Math.cos(ang) * 16;
    const y0 = f.y + Math.sin(ang) * 16;
    const x1 = f.x + Math.cos(ang) * len;
    const y1 = f.y + Math.sin(ang) * len;
    const fx = this.fx(owner);
    fx.snatchBeam(x0, y0, x1, y1, SNATCH_W);
    fx.snatchSlice(x0, y0, ang, ang - SLICE_HALF_ANGLE, len, SLICE_SWEEP_MS, SLICE_W);
    fx.snatchSlice(x0, y0, ang, ang + SLICE_HALF_ANGLE, len, SLICE_SWEEP_MS, SLICE_W);
    this.avatar(owner)?.play('sweep', ang);
    // The cast's own voice played at the wind-up; the release gets one of its own.
    Sfx.playAt('glitch', f.x, { rate: 1.1, volume: 0.8 });
    if (!this.simulates(owner)) return;
    for (const t of this.targetsOf(owner)) {
      const r = this.bodyR(t);
      // The main line first: anyone it touches is its, and the slices pass them by.
      if (this.segDist(x0, y0, x1, y1, t.x, t.y) <= SNATCH_W / 2 + r) {
        fx.snatchHit(t.x, t.y, true);
        this.hit(owner, t, SNATCH_DMG);
        this.snatchCooldowns(owner, t, true);
        continue;
      }
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > len + r) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      const pad = Math.asin(Math.min(1, r / Math.max(d, 1)));
      if (off > SLICE_HALF_ANGLE + pad) continue;
      // The blade reaches them partway through its swing.
      const delay = SLICE_SWEEP_MS * Phaser.Math.Clamp(off / SLICE_HALF_ANGLE, 0, 1);
      this.api.scene.time.delayedCall(delay, () => {
        if (!this.alive(t) || !this.alive(f)) return;
        fx.snatchHit(t.x, t.y, false);
        this.hit(owner, t, SLICE_DMG);
        this.snatchCooldowns(owner, t, false);
      });
    }
  }

  /**
   * The beam's theft. The main line: every ability they have ready goes back on cooldown, and
   * Memory's own cooldowns come down by how long each had sat ready. A slice: their ready
   * abilities are locked 2s, and Memory's come down 2s.
   */
  private snatchCooldowns(owner: Owner, t: Fighter, main: boolean): void {
    const f = this.fighter(owner);
    let gain = 0;
    if (main) {
      for (const a of t.element.abilities) {
        if (a.isUltimate || a.displayKey === 'Q') continue;
        if (t.getCooldownRatio(a.id) < 1) continue;
        gain += Math.min(STEAL_PER_ABILITY_MS, t.netGhost ? STEAL_GHOST_MS : Math.max(500, t.readyForMs(a.id)));
      }
      gain = Math.min(STEAL_TOTAL_MS, gain);
    } else {
      gain = SLICE_REFUND_MS;
    }
    // The victim's half lands on whichever sim owns their body. Shutdown's take comes back with
    // it: here at once, or from their machine as `memory-ultgive`.
    const shutdown = this.up(owner, 'e');
    if (t.netGhost) this.relay(owner, `memory-snatched:${main ? 'main' : 'slice'}:${shutdown ? 1 : 0}`);
    else {
      const took = this.robVictim(owner, t, main, shutdown);
      if (took > 0) this.gainUlt(owner, t, took, false);
    }
    if (gain > 0) {
      f.reduceCooldowns(gain, ID.e);
      this.fx(owner).timeSteal(t.x, t.y, () => ({ x: f.x, y: f.y }), gain / 1000);
      this.announce(f.x, f.y - 52, `-${(gain / 1000).toFixed(1)}s`, MEMORY.staticHi, 12);
    }
  }

  /**
   * The victim's half of the snatch, on the sim that owns their body. With Shutdown it also robs
   * their ultimate bank; returns the points taken.
   */
  private robVictim(thief: Owner, v: Fighter, main: boolean, shutdown: boolean): number {
    let taken = 0;
    for (const a of v.element.abilities) {
      if (a.isUltimate || a.displayKey === 'Q') continue;
      if (v.getCooldownRatio(a.id) < 1) continue;
      if (main) v.restampCooldown(a.id);
      else v.lockAbility(a.id, SLICE_LOCK_MS);
      taken++;
    }
    if (taken > 0) this.announce(v.x, v.y - 48, main ? 'FORGOTTEN' : '+2s', MEMORY.staticMid, main ? 13 : 11);
    if (!shutdown || !v.ultChargeEnabled) return 0;
    const bank = v.ultCharge;
    const take = Math.min(bank, main
      ? SHUTDOWN_MAIN_FLAT + bank * SHUTDOWN_MAIN_SHARE
      : SHUTDOWN_SLICE_FLAT + bank * SHUTDOWN_SLICE_SHARE);
    if (take < 1) return 0;
    v.ultCharge = bank - take;
    const thiefBody = this.fighter(thief);
    this.fx(thief).ultSteal(v.x, v.y, () => ({ x: thiefBody.x, y: thiefBody.y }), take);
    this.announce(v.x, v.y - 64, `-${Math.round(take)} ULT`, MEMORY.redHot, main ? 13 : 11);
    return take;
  }

  /**
   * Shutdown, the thief's half: bank what the snatch took. `motes` when the theft happened on the
   * victim's machine, so the sparks have not been drawn here yet.
   */
  private gainUlt(owner: Owner, from: Fighter, points: number, motes: boolean): void {
    if (!(points > 0)) return;
    const f = this.fighter(owner);
    f.addUltCharge(points);
    if (motes) this.fx(owner).ultSteal(from.x, from.y, () => ({ x: f.x, y: f.y }), points);
    this.api.scene.time.delayedCall(500, () => {
      if (this.alive(f)) this.announce(f.x, f.y - 66, `+${Math.round(points)} ULT`, MEMORY.bandLit, 12);
    });
  }

  // ── Rebirth ────────────────────────────────────────────────────────────────

  private updateSweep(owner: Owner, dt: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const sw = s.sweep;
    if (!sw) return;
    if (!this.alive(f)) { s.sweep = null; return; }
    const prev = this.chord(sw.px, sw.py, sw.ang);
    sw.trail.push(prev);
    if (sw.trail.length > 5) sw.trail.shift();
    sw.ang += SWEEP_RAD_PER_S * dt;
    if (owner === 'npc' && this.simulates('npc')) {
      if (s.botPivot) { sw.px = s.botPivot.x; sw.py = s.botPivot.y; }
      // The bot strikes when the line lies across its target.
      const t = this.nearestTarget('npc');
      if (t && this.canAct(f, 'click')) {
        const e = this.chord(sw.px, sw.py, sw.ang);
        if (this.segDist(e.x0, e.y0, e.x1, e.y1, t.x, t.y) < this.bodyR(t) * 0.5) { this.fireRebirth('npc'); return; }
      }
    }
    // Whoever never clicks gets it anyway, where the line has come to rest. A replica's strike
    // arrives as `memory-fire`; if it never does (they died mid-sweep), the line just goes.
    if (this.simulates(owner) && this.now - sw.start >= SWEEP_MAX_MS) this.fireRebirth(owner);
    else if (!this.simulates(owner) && this.now - sw.start >= SWEEP_MAX_MS + 1500) s.sweep = null;
  }

  private fireRebirth(owner: Owner): void {
    const s = this.side(owner);
    const sw = s.sweep;
    if (!sw) return;
    s.sweep = null;
    s.botPivot = null;
    const e = this.chord(sw.px, sw.py, sw.ang);
    this.fx(owner).rebirthBeam(e.x0, e.y0, e.x1, e.y1, REBIRTH_W);
    this.api.scene.cameras.main.flash(120, 255, 255, 255, false);
    const f = this.fighter(owner);
    Sfx.playAt('light-beam', f.x, { rate: 0.9, volume: 0.8 });
    // Practice: this strike lands at the old rate, the next one harder. Counted on every sim so a
    // replica's readout matches; only the owner's count ever deals damage.
    const dmg = this.practiceDamage(owner);
    s.practice++;
    if (this.alive(f)) this.announce(f.x, f.y - 52, `PRACTICE +${PRACTICE_DMG_PER_USE}`, MEMORY.white, 11);
    if (!this.simulates(owner)) return;
    this.relay(owner, `memory-fire:${Math.round(sw.px)}:${Math.round(sw.py)}:${Math.round(Phaser.Math.Angle.Wrap(sw.ang) * 1000)}`);
    for (const t of this.targetsOf(owner)) {
      if (this.segDist(e.x0, e.y0, e.x1, e.y1, t.x, t.y) > REBIRTH_W / 2 + this.bodyR(t)) continue;
      this.fx(owner).rebirthHit(t.x, t.y);
      this.hit(owner, t, dmg);
      if (!this.stripsKit(owner)) continue;
      t.passivesSealedUntil = Math.max(t.passivesSealedUntil, Date.now() + SEAL_MS);
      if (t.netGhost) {
        // Their snowball is drained on their machine, which names what went; here it only goes.
        this.relay(owner, 'memory-reborn');
        this.fx(owner).brainDrain(t.x, t.y, () => ({ x: f.x, y: f.y }));
      } else if (t === this.api.npc) this.drain(owner, t, 'npc');
      else if (t === this.api.player) this.drain(owner, t, 'player');
      else this.drain(owner, t, null);
    }
  }

  /** Practice's beam damage for this side's next strike. */
  practiceDamage(owner: Owner): number {
    return REBIRTH_DMG + PRACTICE_DMG_PER_USE * this.side(owner).practice;
  }

  /**
   * Brain Drain on a body this sim owns (`victim` null for a husk, which has no snowball). What
   * goes is pulled out of them and across into the Memory — the stream, and each label after it.
   */
  private drain(owner: Owner, t: Fighter, victim: Owner | null): void {
    const labels = victim ? this.api.rebirthDrain(victim) : [];
    const f = this.fighter(owner);
    this.announce(t.x, t.y - 50, 'DRAINED', MEMORY.white, 13);
    this.fx(owner).brainDrain(t.x, t.y, () => ({ x: f.x, y: f.y }));
    labels.slice(0, 3).forEach((l, i) => this.api.scene.time.delayedCall(160 * (i + 1), () => {
      if (this.alive(t)) this.suckLabel(owner, t.x, t.y - 34 + i * 12, l);
    }));
  }

  /** One drained thing, as its label, dragged out of the victim and swallowed by the Memory. */
  private suckLabel(owner: Owner, sx: number, sy: number, text: string): void {
    const { scene } = this.api;
    const f = this.fighter(owner);
    const t = scene.add.text(sx, sy, text, {
      fontSize: '11px', fontFamily: 'Arial Black', color: this.hex(MEMORY.staticHi),
      stroke: '#0d0b12', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 950, ease: 'Cubic.easeIn',
      onUpdate: (tw) => {
        if (!t.active) return;
        const k = Number(tw.getValue());
        const dx = f.x;
        const dy = f.y - 34;
        t.setPosition(sx + (dx - sx) * k, sy + (dy - sy) * k - Math.sin(k * Math.PI) * 26);
        t.setScale(1 - 0.65 * k);
        t.setAlpha(k < 0.85 ? 1 : (1 - k) / 0.15);
      },
      onComplete: () => t.destroy(),
    });
  }

  // ── Repression ─────────────────────────────────────────────────────────────

  private stopRecording(owner: Owner): void {
    const rec = this.sides[owner]?.rec;
    if (!rec) return;
    rec.target.off('cast', rec.hook);
    this.sides[owner].rec = null;
  }

  private updateRecording(owner: Owner): void {
    const s = this.side(owner);
    const rec = s.rec;
    if (!rec) return;
    const f = this.fighter(owner);
    const t = rec.target;
    if (!this.alive(f)) { this.stopRecording(owner); return; }
    if (this.now >= rec.nextSample) {
      rec.nextSample += SAMPLE_MS;
      const at = this.now - rec.start;
      if (this.alive(t)) rec.samples.push({ t: at, x: t.x, y: t.y });
      // A copy that has gone stops being recorded where it went.
      for (const tr of rec.tracks) if (s.echoes.includes(tr.echo)) tr.samples.push({ t: at, x: tr.echo.x, y: tr.echo.y });
    }
    if (this.now - rec.start < RECORD_MS) return;
    // The recording ends; each copy steps out where its original stood when it began.
    const tracks = rec.tracks;
    this.stopRecording(owner);
    this.addEcho(owner, rec.samples, rec.casts, t.element.color);
    for (const tr of tracks) this.addEcho(owner, tr.samples, tr.casts, tr.color);
    // Unforgettable: most of the wait is given back, so the next recording catches these copies.
    if (this.up(owner, 'f')) f.reduceCooldown(ID.f, UNFORGETTABLE_REFUND_MS);
  }

  /**
   * A new static copy. Plain, it walks the recording once. Unforgettable keeps it out for 8s:
   * when the recording runs out it walks it back the other way, clicking again as it goes.
   */
  private addEcho(owner: Owner, samples: Sample[], casts: CastRec[], color: number): void {
    const s = this.side(owner);
    const first = samples[0];
    const dur = samples[samples.length - 1].t;
    const unforgettable = this.up(owner, 'f');
    const life = unforgettable ? ECHO_UP_MS : Math.max(RECORD_MS, dur + 200);
    let schedule: CastRec[] = casts.slice();
    if (unforgettable && dur >= 300) {
      schedule = [];
      for (let pass = 0; pass * dur < life; pass++) {
        for (const c of casts) {
          const at = pass % 2 === 0 ? pass * dur + c.t : (pass + 1) * dur - c.t;
          if (at <= life) schedule.push({ t: at, ability: c.ability });
        }
      }
      schedule.sort((a, b) => a.t - b.t);
    }
    s.echoes.push({ start: this.now, color, samples, casts: schedule, next: 0, x: first.x, y: first.y, dur, life });
    this.fx(owner).repressMark(first.x, first.y, false);
    while (s.echoes.length > MAX_ECHOES) {
      const old = s.echoes.shift()!;
      this.fx(owner).echoFade(old.x, old.y, old.color);
    }
  }

  private updateEchoes(owner: Owner): void {
    const s = this.side(owner);
    if (!s.echoes.length) return;
    const memoryAlive = this.alive(this.fighter(owner));
    for (const e of s.echoes.slice()) {
      const el = this.now - e.start;
      if (el > e.life || !memoryAlive) {
        this.fx(owner).echoFade(e.x, e.y, e.color);
        s.echoes.splice(s.echoes.indexOf(e), 1);
        continue;
      }
      // Where they were at this moment of the recording — walked back again once it runs out.
      const phase = e.dur > 0 ? el % (2 * e.dur) : 0;
      const r = phase <= e.dur ? phase : 2 * e.dur - phase;
      let i = 0;
      while (i < e.samples.length - 1 && e.samples[i + 1].t <= r) i++;
      const a = e.samples[i];
      const b = e.samples[Math.min(i + 1, e.samples.length - 1)];
      const k = b.t > a.t ? Phaser.Math.Clamp((r - a.t) / (b.t - a.t), 0, 1) : 0;
      const p = this.clampToArena(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 20);
      e.x = p.x;
      e.y = p.y;
      while (e.next < e.casts.length && e.casts[e.next].t <= el) {
        this.echoCast(owner, e, e.casts[e.next]);
        e.next++;
      }
    }
  }

  /**
   * One of their clicks, cast again from the copy at Memory's cursor — the real ability, run
   * through Memory's own context with Memory's body standing in the copy's place for the call.
   * Online the owner's sim casts it and relays `memory-click`; the receiver casts it there.
   */
  private echoCast(owner: Owner, e: Echo, c: CastRec): void {
    // Unforgettable: a recording running now copies this click into the copy of this copy.
    const rec = this.side(owner).rec;
    rec?.tracks.find((tr) => tr.echo === e)?.casts.push({ t: this.now - rec.start, ability: c.ability });
    if (owner === 'npc' && this.api.isOnline) return;
    const aim = this.aimOf(owner);
    this.castEchoClick(owner, c.ability, e.x, e.y, aim.x, aim.y, e.color);
    this.relay(owner, `memory-click:${c.ability.id}:${Math.round(e.x)}:${Math.round(e.y)}:${Math.round(aim.x)}:${Math.round(aim.y)}`);
  }

  private castEchoClick(owner: Owner, ab: Ability, x: number, y: number, ax: number, ay: number, color: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (KIT_DRIVEN_CLICKS.has(ab.id)) {
      const ang = Math.atan2(ay - y, ax - x);
      this.fx(owner).echoBolt(x, y, ang, color);
      this.echoBolts.push({
        owner, x, y, vx: Math.cos(ang) * ECHO_BOLT_SPEED, vy: Math.sin(ang) * ECHO_BOLT_SPEED, travelled: 0, color,
      });
      return;
    }
    // Memory's body steps into the copy for the length of the cast, so whatever the click
    // spawns at its caster spawns at the copy; anything the click does to its caster's
    // position — a lunge, a velocity, a glide — is undone when it steps back.
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    const ox = f.x;
    const oy = f.y;
    const vx = body?.velocity.x ?? 0;
    const vy = body?.velocity.y ?? 0;
    const tweens = this.api.scene.tweens;
    const before = new Set(tweens.getTweensOf(f));
    f.x = x;
    f.y = y;
    try {
      ab.cast(owner === 'player' ? this.api.buildPlayerContext(ax, ay) : this.api.buildNpcContext(ax, ay));
    } catch (err) {
      console.warn(`Repression: ${ab.id} could not be copied`, err);
    } finally {
      for (const tw of tweens.getTweensOf(f)) if (!before.has(tw)) tw.remove();
      f.x = ox;
      f.y = oy;
      body?.velocity.set(vx, vy);
    }
  }

  private updateEchoBolts(dt: number): void {
    for (let i = this.echoBolts.length - 1; i >= 0; i--) {
      const b = this.echoBolts[i];
      const sx = b.vx * dt;
      const sy = b.vy * dt;
      b.x += sx;
      b.y += sy;
      b.travelled += Math.hypot(sx, sy);
      let done = b.travelled > ECHO_BOLT_RANGE || !this.api.bounds.contains(b.x, b.y);
      if (!done) {
        for (const t of this.targetsOf(b.owner)) {
          if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > 7 + this.bodyR(t)) continue;
          done = true;
          this.fx(b.owner).echoBurst(b.x, b.y, 18, b.color);
          if (this.simulates(b.owner)) this.hit(b.owner, t, ECHO_CLICK_DMG);
          break;
        }
      }
      if (done) this.echoBolts.splice(i, 1);
    }
  }

  // ── Trauma ─────────────────────────────────────────────────────────────────

  /**
   * Count every hit each target takes in the window, whatever caused it. A body's own `damaged`
   * event carries the hit as dealt — which is what counts on a practice dummy, whose health never
   * actually falls. A replica never fires it (its health arrives over the wire), so its hp drops
   * are counted instead, in `updateTrauma`. Husks that appear mid-window are picked up there too.
   */
  private hookTrauma(owner: Owner): void {
    const s = this.side(owner);
    for (const t of this.targetsOf(owner)) {
      if (t.netGhost) { if (!s.traumaLastHp.has(t)) s.traumaLastHp.set(t, t.hp); continue; }
      if (s.traumaHooks.has(t)) continue;
      const hook = (amount: number): void => {
        if (amount > 0) s.traumaTaken.set(t, (s.traumaTaken.get(t) ?? 0) + amount);
      };
      t.on('damaged', hook);
      s.traumaHooks.set(t, hook);
    }
  }

  private unhookTrauma(owner: Owner): void {
    const s = this.sides[owner];
    if (!s) return;
    for (const [t, hook] of s.traumaHooks) t.off('damaged', hook);
    s.traumaHooks.clear();
  }

  private updateTrauma(owner: Owner): void {
    const s = this.side(owner);
    if (s.traumaUntil <= 0) return;
    this.hookTrauma(owner);
    for (const [t, last] of s.traumaLastHp) {
      if (t.hp < last) s.traumaTaken.set(t, (s.traumaTaken.get(t) ?? 0) + (last - t.hp));
      s.traumaLastHp.set(t, t.hp);
    }
    if (this.now < s.traumaUntil) return;
    s.traumaUntil = 0;
    this.unhookTrauma(owner);
    // The new wounds replace this Memory's old ones.
    for (const [t, w] of [...this.wounds]) if (w.owner === owner) this.wounds.delete(t);
    for (const [t, taken] of s.traumaTaken) {
      if (taken <= 0 || !this.alive(t)) continue;
      const dps = taken * TRAUMA_SHARE;
      this.wounds.set(t, { owner, dps, next: this.now + WOUND_TICK_MS, carry: 0 });
      this.fx(owner).traumaSeal(t.x, t.y);
      this.announce(t.x, t.y - 50, `TRAUMA  ${dps.toFixed(1)}/s`, MEMORY.redHot, 14);
    }
    s.traumaTaken.clear();
    s.traumaLastHp.clear();
  }

  private updateWounds(): void {
    for (const [t, w] of [...this.wounds]) {
      if (!t.active) { this.wounds.delete(t); continue; }
      if (t.hp <= 0 || this.now < w.next) continue;
      w.next += WOUND_TICK_MS;
      this.fx(w.owner).traumaTick(t.x, t.y);
      if (!this.simulates(w.owner)) continue;
      w.carry += w.dps;
      const dmg = Math.floor(w.carry);
      if (dmg < 1) continue;
      w.carry -= dmg;
      this.hit(w.owner, t, dmg);
      // Small numbers, every second, forever: the kit labels each one so the wound reads.
      const dealt = Math.round(t.lastIncomingDamage) || dmg;
      this.announce(t.x + 18, t.y - 30, `-${dealt}`, MEMORY.redHot, 13);
    }
  }

  // ── Salt in the Wound (Q+) ─────────────────────────────────────────────────

  /** A point `u` (0–1) of the way round the arena, just inside the walls. */
  private perimeterPoint(u: number): { x: number; y: number } {
    const b = this.api.bounds;
    const x0 = b.left + SALT_INSET;
    const y0 = b.top + SALT_INSET;
    const w = b.width - SALT_INSET * 2;
    const h = b.height - SALT_INSET * 2;
    let d = (((u % 1) + 1) % 1) * 2 * (w + h);
    if (d < w) return { x: x0 + d, y: y0 };
    d -= w;
    if (d < h) return { x: x0 + w, y: y0 + d };
    d -= h;
    if (d < w) return { x: x0 + w - d, y: y0 + h };
    d -= w;
    return { x: x0, y: y0 + h - d };
  }

  private startSalt(owner: Owner): void {
    const s = this.side(owner);
    const off = Math.random();
    const colors = Phaser.Utils.Array.Shuffle(SALT_COLORS.slice());
    const phantoms: Phantom[] = [];
    for (let i = 0; i < SALT_PHANTOMS; i++) {
      const p = this.perimeterPoint(off + i / SALT_PHANTOMS + (Math.random() - 0.5) * 0.06);
      phantoms.push({
        x: p.x, y: p.y, color: colors[i % colors.length], seed: i * 1.7 + Math.random(),
        nextThrow: this.now + 450 + i * 240, throwAt: -1e9, aim: 0,
        nextBubble: this.now + 150 + i * 330, bubbleUntil: 0,
      });
      this.fx(owner).phantomRise(p.x, p.y);
    }
    s.salt = { start: this.now, until: this.now + TRAUMA_MS, phantoms };
  }

  private updateSalt(owner: Owner): void {
    const s = this.side(owner);
    const salt = s.salt;
    if (!salt) return;
    if (this.now >= salt.until || !this.alive(this.fighter(owner))) {
      for (const ph of salt.phantoms) this.fx(owner).phantomFade(ph.x, ph.y, ph.color);
      s.salt = null;
      return;
    }
    for (let i = 0; i < salt.phantoms.length; i++) {
      const ph = salt.phantoms[i];
      const t = this.nearestTarget(owner);
      if (t) ph.aim = Math.atan2(t.y - ph.y, t.x - ph.x);
      // The insults: a bubble of red static, every so often.
      if (this.now >= ph.nextBubble) {
        ph.bubbleUntil = this.now + SALT_BUBBLE_MS;
        ph.nextBubble = this.now + SALT_BUBBLE_MS + 500 + Math.random() * 900;
      }
      if (!this.simulates(owner) || !t || this.now < ph.nextThrow) continue;
      ph.nextThrow = this.now + SALT_THROW_MS;
      // Thrown where they are going, not where they are.
      const body = t.body as Phaser.Physics.Arcade.Body | null;
      const lead = (Phaser.Math.Distance.Between(ph.x, ph.y, t.x, t.y) / SALT_SPEED) * 0.7;
      const ang = Math.atan2(t.y + (body?.velocity.y ?? 0) * lead - ph.y, t.x + (body?.velocity.x ?? 0) * lead - ph.x);
      this.throwSalt(owner, ph, ang);
      this.relay(owner, `memory-salt:${i}:${Math.round(ph.x)}:${Math.round(ph.y)}:${Math.round(Phaser.Math.Angle.Wrap(ang) * 1000)}`);
    }
  }

  private throwSalt(owner: Owner, ph: Phantom, ang: number): void {
    ph.throwAt = this.now;
    ph.aim = ang;
    const x = ph.x + Math.cos(ang) * 22;
    const y = ph.y + Math.sin(ang) * 22;
    this.saltBalls.push({ owner, x, y, vx: Math.cos(ang) * SALT_SPEED, vy: Math.sin(ang) * SALT_SPEED, travelled: 0, trail: [] });
    Sfx.playAt('glitch', x, { rate: 1.5, volume: 0.45 });
  }

  /** Online: a replica's phantom threw. Their phantoms stand where ours do not, so it moves to its throw. */
  private replaySaltThrow(i: number, x: number, y: number, ang: number): void {
    const salt = this.sides.npc.salt;
    const ph = salt?.phantoms[i];
    if (!ph) return;
    ph.x = x;
    ph.y = y;
    this.throwSalt('npc', ph, ang);
  }

  private updateSaltBalls(dt: number): void {
    for (let i = this.saltBalls.length - 1; i >= 0; i--) {
      const b = this.saltBalls[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > SALT_TRAIL) b.trail.shift();
      const sx = b.vx * dt;
      const sy = b.vy * dt;
      b.x += sx;
      b.y += sy;
      b.travelled += Math.hypot(sx, sy);
      let done = b.travelled > SALT_RANGE || !this.api.bounds.contains(b.x, b.y);
      if (!done) {
        for (const t of this.targetsOf(b.owner)) {
          if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > SALT_R + this.bodyR(t)) continue;
          done = true;
          this.fx(b.owner).saltBurst(b.x, b.y);
          if (this.simulates(b.owner)) this.hit(b.owner, t, SALT_DMG);
          break;
        }
      }
      if (done) this.saltBalls.splice(i, 1);
    }
  }

  // ── Guilt ──────────────────────────────────────────────────────────────────

  /** Keep `guiltMarked` on exactly the bodies a Memory is fighting. */
  private updateGuilt(): void {
    const want = new Set<Fighter>();
    if (this.isMemory('player')) for (const t of this.api.enemies) if (t) want.add(t);
    if (this.isMemory('npc') && !this.api.isInvasion && this.api.player) want.add(this.api.player);
    for (const f of this.marked) if (!want.has(f)) f.guiltMarked = false;
    for (const f of want) f.guiltMarked = true;
    this.marked = want;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isMemory('player');
    const npcIs = this.isMemory('npc');
    const anyState = this.shards.length || this.echoBolts.length || this.saltBalls.length || this.wounds.size || this.playerAvatar
      || this.api.player?.memoryShardCount() > 0;
    if (!playerIs && !npcIs && !anyState) {
      if (this.marked.size) this.updateGuilt();
      return;
    }
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateGuilt();
    for (const owner of BOTH) {
      if (!this.isMemory(owner)) {
        if (this.side(owner).rec) this.stopRecording(owner);
        continue;
      }
      this.updateSpin(owner);
      this.updateSweep(owner, dt);
      this.updateRecording(owner);
      this.updateEchoes(owner);
      this.updateTrauma(owner);
      this.updateSalt(owner);
    }
    this.updateShards(dt);
    this.updateEchoBolts(dt);
    this.updateSaltBalls(dt);
    this.updateLatches();
    this.updateWounds();
    this.paint();
    this.paintStatic();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private paint(): void {
    const air = this.airGfx!;
    const line = this.lineGfx!;
    air.clear();
    line.clear();
    const t = this.vizT;
    for (const owner of BOTH) {
      const salt = this.isMemory(owner) ? this.side(owner).salt : null;
      if (salt) this.paintSalt(air, owner, salt, t);
    }
    for (const b of this.saltBalls) saltBall(air, this.col(b.owner), b.x, b.y, b.trail, SALT_R, t);
    for (const sh of this.shards) shardBody(air, this.col(sh.owner), sh.x, sh.y, Math.atan2(sh.vy, sh.vx), 1, 1);
    for (const b of this.echoBolts) {
      air.fillStyle(b.color, 0.45);
      air.fillCircle(b.x, b.y, 8);
      staticDisc(air, this.col(b.owner), b.x, b.y, 5, t, 0.9, 2, 3);
    }
    // Shards latched into bodies, legs and all.
    const now = Date.now();
    for (const f of this.allFighters()) {
      if (!this.alive(f)) continue;
      const n = f.memoryShardCount();
      if (n <= 0) continue;
      const own = f.memoryShards.filter((u) => u > now).length;
      const angs = own === n ? (this.latchAngles.get(f) ?? []) : [];
      const r = this.bodyR(f);
      for (let i = 0; i < n; i++) {
        const a = angs[i] ?? (-2.4 + i * 2);
        latchedShard(air, this.pcol, f.x, f.y, r, a, t + i, f.alpha);
      }
    }
    for (const [f, w] of this.wounds) if (this.alive(f)) woundMark(air, this.col(w.owner), f.x + 20, f.y - 30, t, f.alpha);
    for (const owner of BOTH) {
      if (!this.isMemory(owner)) continue;
      const s = this.side(owner);
      if (s.sweep) {
        const e = this.chord(s.sweep.px, s.sweep.py, s.sweep.ang);
        rebirthLine(line, this.col(owner), s.sweep.px, s.sweep.py, e, s.sweep.trail, t, 1);
      }
      const aim = this.aimOf(owner);
      for (const e of s.echoes) {
        staticEcho(air, this.col(owner), e.x, e.y, ECHO_R, e.color, Math.atan2(aim.y - e.y, aim.x - e.x), t, 0.92);
      }
    }
  }

  /** The walls in red static, the phantoms standing in it, and what they have to say. */
  private paintSalt(g: Phaser.GameObjects.Graphics, owner: Owner, salt: Salt, t: number): void {
    const tint = this.col(owner);
    const b = this.api.bounds;
    const fadeIn = Phaser.Math.Clamp((this.now - salt.start) / 300, 0, 1);
    const fadeOut = Phaser.Math.Clamp((salt.until - this.now) / 300, 0, 1);
    const a = Math.min(fadeIn, fadeOut);
    saltBorder(g, tint, b.left, b.top, b.width, b.height, SALT_BAND, t, a * 0.85);
    for (const ph of salt.phantoms) {
      const throwK = (this.now - ph.throwAt) / 420;
      saltPhantom(g, tint, ph.x, ph.y, ph.color, ph.aim, t, a, throwK >= 0 && throwK < 1 ? throwK : 0, ph.seed);
      if (this.now < ph.bubbleUntil) {
        // The bubble sits on the arena side of the phantom, so it never hangs off the wall.
        const inX = Phaser.Math.Clamp(b.centerX - ph.x, -1, 1);
        const inY = Phaser.Math.Clamp(b.centerY - ph.y, -1, 1);
        const bx = Phaser.Math.Clamp(ph.x + Math.sign(inX) * 44, b.left + 40, b.right - 40);
        const by = Phaser.Math.Clamp(ph.y + Math.sign(inY) * 36 - (Math.abs(inY) < 0.5 ? 34 : 0), b.top + 22, b.bottom - 22);
        const pop = Phaser.Math.Clamp((ph.bubbleUntil - this.now) / 120, 0, 1) * Phaser.Math.Clamp((SALT_BUBBLE_MS - (ph.bubbleUntil - this.now)) / 120, 0, 1);
        staticBubble(g, tint, bx, by, 62 * (0.6 + 0.4 * pop), 24 * (0.6 + 0.4 * pop), ph.x, ph.y, t, a * pop, ph.seed * 5);
      }
    }
  }

  /**
   * The static a shard puts on its victim's screen — drawn only for the local player, since only
   * the local player has a screen here. One: the Memory and its bar. Two: our own health. Three:
   * our cooldown cards.
   */
  private paintStatic(): void {
    const veil = this.veilGfx!;
    const hud = this.hudGfx!;
    veil.clear();
    hud.clear();
    const me = this.api.player;
    if (!this.alive(me)) return;
    const n = me.memoryShardCount();
    if (n <= 0) return;
    const t = this.vizT;
    const tint = this.ncol;
    if (this.isMemory('npc') && !this.api.isInvasion) {
      const m = this.api.npc;
      if (this.alive(m) && m.alpha > 0.05) {
        staticDisc(veil, tint, m.x, m.y - 4, 34, t, 0.9, 4, 21);
        staticRect(veil, tint, m.x - 28, m.y - 46, 56, 14, t, 0.95, 3, 22);
      }
    }
    if (n >= 2) {
      staticRect(veil, tint, me.x - 28, me.y - 41, 56, 11, t, 0.95, 3, 23);
      const g = this.api.hudRects().hpGauge;
      if (g) staticRect(hud, tint, g.x - 2, g.y - 2, g.w + 4, g.h + 4, t, 0.96, 4, 24);
    }
    if (n >= 3) {
      this.api.hudRects().cards.forEach((c, i) => staticRect(hud, tint, c.x, c.y, c.w, c.h, t, 0.93, 5, 30 + i));
    }
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      const aim = this.aimOf(owner);
      av.setFacing(Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setSpin(!!s.spin);
      if (s.traumaUntil > 0) av.setAura('red', 1 - Phaser.Math.Clamp((s.traumaUntil - this.now) / TRAUMA_MS, 0, 1));
      else if (s.rec) av.setAura('grey');
      else av.setAura(null);
      if (s.spin) av.setHold('charge', Math.atan2(aim.y - f.y, aim.x - f.x));
      else if (s.sweep) av.setHold('reach', Math.atan2(s.sweep.py - f.y, s.sweep.px - f.x));
      else av.setHold(null);
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);
    set('memory-spin', playerIs && s.spin ? {
      name: 'Memory Snatch', emoji: '🎩', color: MEMORY.staticHi, priority: 150,
      description: 'Spinning the cane. The beam goes at your cursor when the spin ends.',
      until: s.spin.start + SPIN_MS,
    } : null);
    set('memory-sweep', playerIs && s.sweep ? {
      name: 'Practice', emoji: '⚪', color: MEMORY.white, priority: 151,
      description: `Click to strike the line (${this.practiceDamage('player')} damage). It strikes on its own when time runs out.`,
      until: s.sweep.start + SWEEP_MAX_MS,
    } : null);
    set('memory-record', playerIs && s.rec ? {
      name: 'Repression', emoji: '📼', color: MEMORY.grey, priority: 152,
      description: 'Recording your opponent. Then a static copy of them replays it all at your cursor.',
      until: s.rec.start + RECORD_MS,
    } : null);
    set('memory-replay', playerIs && s.echoes.length ? {
      name: 'Replaying', emoji: '📼', color: MEMORY.grey, priority: 152,
      description: s.echoes.length > 1
        ? `${s.echoes.length} static copies are replaying steps and casts at your cursor.`
        : 'The static copy is replaying their steps and casts at your cursor.',
      count: s.echoes.length > 1 ? s.echoes.length : undefined,
      until: Math.max(...s.echoes.map((e) => e.start + e.life)),
    } : null);
    set('memory-trauma', playerIs && s.traumaUntil > 0 ? {
      name: 'Trauma', emoji: '🩸', color: MEMORY.red, priority: 149,
      description: `Everything enemies take now, they will take 5% of every second for the rest of the match. Banked so far: ${Math.round(this.traumaBanked('player'))} damage.`,
      count: Math.round(this.traumaBanked('player')),
      until: s.traumaUntil,
    } : null);
  }

  /** Damage taken by every enemy so far in this side's open Trauma window. */
  private traumaBanked(owner: Owner): number {
    let sum = 0;
    for (const v of this.side(owner).traumaTaken.values()) sum += v;
    return sum;
  }

  // ── Arena readers ──────────────────────────────────────────────────────────

  /** Slowed through the Snatch wind-up. */
  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    if (!this.isMemory(owner)) return 1;
    return this.side(owner).spin ? SPIN_SPEED_MULT : 1;
  }

  /** The ability cards: E fills with the spin, R lit while the line sweeps, Q counts the window. */
  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === ID.e && s.spin) return Phaser.Math.Clamp((this.now - s.spin.start) / SPIN_MS, 0, 1);
    if (abilityId === ID.r && s.sweep) return 1;
    if (abilityId === ID.f && s.rec) return Phaser.Math.Clamp((this.now - s.rec.start) / RECORD_MS, 0, 1);
    if (abilityId === ID.q && s.traumaUntil > 0) return 1 - Phaser.Math.Clamp((s.traumaUntil - this.now) / TRAUMA_MS, 0, 1);
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  /** Spinning the cane or sweeping the line — the kit has the bot's hands. */
  npcMemoryBusy(): boolean {
    const s = this.sides.npc;
    return !!s.spin || !!s.sweep;
  }

  /**
   * Snatch is worth the wind-up: the target is in reach and has two or more abilities sitting
   * ready (that is what the beam steals), or is held still (stunned, slowed by a shard-blind
   * stumble) so the two seconds cannot be walked out of.
   */
  npcMemorySnatchShot(): boolean {
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f)) return false;
    if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > NPC_SNATCH_RANGE) return false;
    const ready = t.element.abilities.filter((a) => a.displayKey !== 'Q' && !a.isUltimate && t.getCooldownRatio(a.id) >= 1).length;
    return ready >= 2 || Date.now() < t.stunnedUntil;
  }

  /** Practice is worth it: there is someone to strike (and, while it strips kits, their passives are live). */
  npcMemoryRebirthWorth(): boolean {
    const t = this.nearestTarget('npc');
    return !!t && (!this.stripsKit('npc') || !t.passivesSealed());
  }

  /**
   * Repression is worth recording: the target is close and fighting, so the copy will have
   * casts to replay — or a Trauma window is about to open over the replay.
   */
  npcMemoryRepressReady(): boolean {
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f)) return false;
    // Unforgettable: copies on the field are copied too — record while they still have time to walk.
    const s = this.sides.npc;
    if (this.up('npc', 'f') && s.echoes.some((e) => e.life - (this.now - e.start) > 2500)) return true;
    return Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < 420;
  }

  /**
   * Trauma's window should cover a burst: the Snatch beam is about to go, the copy is replaying
   * (every echo is wound the target will relive), or Guilt has stacked high enough that any
   * three seconds hurt.
   */
  npcMemoryTraumaReady(): boolean {
    const s = this.sides.npc;
    const t = this.nearestTarget('npc');
    if (!t || s.traumaUntil > 0) return false;
    if (s.spin && this.now - s.spin.start > SPIN_MS - 900) return true;
    if (s.echoes.reduce((n, e) => n + e.casts.length - e.next, 0) >= 2) return true;
    if (s.rec && this.now - s.rec.start > RECORD_MS - 1200 && s.rec.casts.length >= 2) return true;
    return t.guiltStacks >= 40;
  }

  /** In the Trauma window: spend everything. */
  npcMemoryInTrauma(): boolean { return this.sides.npc.traumaUntil > 0; }
}
