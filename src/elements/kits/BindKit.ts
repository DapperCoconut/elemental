import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  BND, BindAvatar, BindColorFn, BindFx, SoulKind, boundPlaque, chainDagger, chainRun, chainShard,
  cosmicVeil, cultistFigure, darkMark, faithRing, favourBeads, hexWard, idolStatue, lostSoul,
  oblivionShard, patronEye, revenant, shackle, siphonStream, soulColor, soulCore, tithePlaque,
} from './BindVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

// ── Bound (passive) ──────────────────────────────────────────────────────────
type CurseId = 'shackled' | 'brittle' | 'feeble' | 'sluggish';
const CURSES: Record<CurseId, { name: string; emoji: string; what: string }> = {
  shackled: { name: 'Shackled', emoji: '⛓️', what: 'slower movement' },
  brittle: { name: 'Brittle', emoji: '💔', what: 'more damage taken' },
  feeble: { name: 'Feeble', emoji: '🥀', what: 'less damage dealt' },
  sluggish: { name: 'Sluggish', emoji: '⏳', what: 'longer cooldowns' },
};
const CURSE_IDS = Object.keys(CURSES) as CurseId[];
/** The curse at full strength: 25% of whatever it touches. */
const CURSE_MAX = 0.25;
/** Strength a second of siphoning takes off it, for good. A whole soul is about 0.18. */
const CURSE_SIPHON_RATE = 0.03;

// ── Lost souls ───────────────────────────────────────────────────────────────
const SOUL_WILD_MAX = 6;
const SOUL_SPAWN_MS = 3500;
const SOUL_DRIFT = 34;
const SOUL_BOUND_MAX = 6;
/** Seconds of siphoning a full soul holds before it is overdrained. */
const SOUL_DRAIN_S = 6;

// ── Chainbound Daggers (Click) ───────────────────────────────────────────────
const DAGGER_SPEED = 640;
const DAGGER_DAMAGE = 11;
const DAGGER_HIT_PAD = 5;
const DAGGER_STICK_MS = 5000;
const DAGGER_STUCK_MAX = 6;
const STUCK_SPRAY_MS = 1500;
const STUCK_SPRAY_COUNT = 3;
const STUCK_SPRAY_RANGE = 540;
const FRAG_DAMAGE = 5;
const FRAG_SPRAY_DAMAGE = 4;
const FRAG_SPEED = 820;
const FRAG_LIFE_MS = 420;
const DETONATE_FRAGS = 7;
/** Half-width of the detonation's shotgun cone. */
const DETONATE_CONE = 0.34;
const DETONATE_GUARD_MS = 300;
const CULT_DAGGER_DAMAGE = 7;

// ── Inspirit (Click+) ────────────────────────────────────────────────────────
const INSPIRIT_R = 18;
const INSPIRIT_STEP = 0.3;
/** How close to a body's centre counts as finding its soul. */
const CORE_R = 9;
const CORE_STEP = 0.5;

// ── Bind (E) ─────────────────────────────────────────────────────────────────
const BIND_FOE_RANGE = 150;
const BIND_SOUL_RANGE = 130;
const BIND_REV_RANGE = 170;
const BIND_FEED_RANGE = 150;
const TETHER_LEN = 150;
const TETHER_MS = 5000;
const TETHER_CD_MULT = 1.2;

// ── Bind the Hatred (E+) ─────────────────────────────────────────────────────
const HATRED_HOLD_MS = 5000;
const HATRED_DMG_MULT = 1.6;

// ── Blackened Eyes (R) ───────────────────────────────────────────────────────
const EYES_MS = 8000;
/** The body shrinks to its inner soul. */
const SOUL_HITBOX = 0.35;

// ── Choice Souls (R+) ────────────────────────────────────────────────────────
const KIND_HEAL_PS = 4;
const SAD_SPEED_PS = 0.05;
const SAD_SPEED_MAX = 0.3;

// ── Siphon (F) ───────────────────────────────────────────────────────────────
const SIPHON_RANGE = 340;
const SIPHON_BREAK = 420;
const SIPHON_GAIN_PS = 0.1;
const SIPHON_GAIN_MAX = 0.5;
const ANGRY_GAIN_PS = 0.16;
const ANGRY_GAIN_MAX = 0.8;
const SIPHON_LINGER_MS = 3000;

// ── Revenants ────────────────────────────────────────────────────────────────
const REV_MAX = 3;
const REV_KEEP = 210;
const REV_SPEED = 260;
const REV_CHARGE_EVERY = 3200;
const REV_CHARGE_MS = 900;
/** The wind-up's line stops tracking this long before the dash, so a step aside clears it. */
const REV_LOCK_MS = 450;
const REV_DASH_SPEED = 1000;
const REV_OVERSHOOT = 300;
const REV_HIT_R = 50;
/** Drawn size of a revenant. */
const REV_SCALE = 1.8;
/** Stalking revenants fan out this far (radians) either side of straight behind. */
const REV_FAN = 0.55;
const REV_SELF_DAMAGE = 12;
const REV_FOE_DAMAGE = 30;

// ── Trial by Faith (F+) ──────────────────────────────────────────────────────
const FURY_S = 4;
const CULT_MAX = 3;
const CULT_FAITH_MS = 12_000;
const CULT_FEED_MS = 6000;
const CULT_FAITH_CAP_MS = 18_000;
const CULT_THROW_MS = 1100;
const CULT_THROW_RANGE = 480;
const CULT_BIND_MS = 4500;
const CULT_BIND_RANGE = 200;
const CULT_TETHER_MS = 2000;
const CULT_TETHER_LEN = 140;
const CULT_SPEED = 120;

// ── Ritual (Q) ───────────────────────────────────────────────────────────────
const GOD_SHORT_MS = 5000;
const GOD_MID_MS = 8000;
const GOD_LONG_MS = 12_000;
const LIFT_LONG_MS = 15_000;
const WRATHFUL_MS_PER = 3000;
const WARD_CHARGES = 3;
const EYE_Y = 70;
const GOD_VOLLEY_MS = 1200;
const GOD_VOLLEY_SHARDS = 7;
const GOD_SHARD_DAMAGE = 10;
const GOD_SHARD_SPREAD = 68;
const GOD_SHARD_SPEED = 720;
const GOD_SHARD_BLAST_R = 34;
const GOD_SWIPE_MS = 2100;
const GOD_SWIPE_DAMAGE = 24;
const GOD_SWIPE_R = 96;
const GOD_LASER_MS = 620;
const GOD_LASER_DAMAGE = 8;
const GOD_LASER_HIT_R = 20;
const GOD_BLAST_MS = 3000;
const GOD_BLAST_TELL_MS = 900;
const GOD_BLAST_R = 122;
const GOD_BLAST_DAMAGE = 38;
const SACRIFICE_MS = 900_000;
const SACRIFICE_GRACE_MS = 800;
const SACRIFICE_SLOTS: { id: string; key: string }[] = [
  { id: 'bind-daggers', key: 'Click' },
  { id: 'bind-chain', key: 'E' },
  { id: 'bind-eyes', key: 'R' },
  { id: 'bind-siphon', key: 'F' },
];

// ── Mastery: False Idol ──────────────────────────────────────────────────────
const IDOL_ID = 'false-idol';
const IDOL_COOLDOWN = 18_000;
const IDOL_R = 110;
const IDOL_FAVOUR_S = 8;
const IDOL_FADE_S = 12;
const IDOL_PATIENCE_MS = 4000;
const IDOL_ZAP_MS = 1200;
const IDOL_ZAP_DAMAGE = 8;
const IDOL_SOUL_S = 15;
const IDOL_DMG = 0.35;
const IDOL_SPEED = 0.2;
const IDOL_ARMOUR = 0.25;

// ── World objects ────────────────────────────────────────────────────────────

interface Soul {
  id: number;
  x: number;
  y: number;
  heading: number;
  kind: SoulKind;
  essence: number;
  /** Who it follows, or null while it still wanders. */
  boundTo: Owner | null;
  /** Mastery: standing in a False Idol's ring on its owner's behalf. */
  onIdol: boolean;
  seed: number;
  /** Online: a stand-in for one of the opponent's bound souls, drawn and nothing else. */
  ghost: boolean;
}

interface Dagger {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  /** 0 while flying; the game-clock time it falls out of the wall once stuck. */
  stuckUntil: number;
  nextSprayAt: number;
  /** Inspirit (Click+): souls it has passed through. */
  stacks: number;
  passed: Set<number>;
  /** A cultist's throw: it never sticks, it just breaks on the wall. */
  cult: boolean;
  seed: number;
}

interface Frag {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  damage: number;
  dieAt: number;
  soul: boolean;
}

interface Revenant {
  id: number;
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  state: 'stalk' | 'charge' | 'dash' | 'held';
  stateUntil: number;
  nextChargeAt: number;
  dash: { x0: number; y0: number; tx: number; ty: number; hit: Fighter[] } | null;
  /** Where the wind-up locked on — set for the last REV_LOCK_MS of a charge. */
  lockX?: number;
  lockY?: number;
  /** Trial by Faith (F+): how far it has been wrung, 0–1. */
  fury: number;
  /** Bind the Hatred (E+): its next dash comes out of the hold harder. */
  empowered: boolean;
  seed: number;
}

interface Cultist {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  nextThrowAt: number;
  nextBindAt: number;
  seed: number;
}

interface Tether {
  owner: Owner;
  victim: Fighter;
  /** Null while the chain still runs back to its caster; set once it is anchored to the floor. */
  anchor: { x: number; y: number } | null;
  until: number;
  len: number;
  /** The caster's E chain (recastable) rather than a cultist's. */
  main: boolean;
}

interface Shard {
  owner: Owner;
  x: number;
  y: number;
  tx: number;
  ty: number;
  ang: number;
  liveAt: number;
  turned: boolean;
}

interface Mark {
  owner: Owner;
  x: number;
  y: number;
  landsAt: number;
  turned: boolean;
}

interface Spray {
  owner: Owner;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  until: number;
  turned: boolean;
}

interface Ward {
  charges: number;
  prev: ((amount: number) => boolean) | null;
}

interface Idol {
  x: number;
  y: number;
  favour: number;
  lastHeldAt: number;
  nextZapAt: number;
}

interface Side {
  aimX: number;
  aimY: number;

  curse: CurseId | null;
  /** 0–1. Only siphoning ever lowers it. */
  strength: number;
  /** Game-clock time the ritual's lifting of the curse runs out. */
  liftedUntil: number;
  lastSentCurse: string;

  eyesUntil: number;

  siphonSoul: number;
  siphonRev: number;
  siphonColor: number;
  /** Damage the siphon has pumped in, as a fraction. Lingers a moment after it stops. */
  gain: number;
  speedGain: number;
  gainUntil: number;
  healDebt: number;
  /** Online: the opponent is siphoning something on their own sim. */
  ghostSiphon: boolean;

  godUntil: number;
  godMs: number;
  wrathUntil: number;
  wrathMs: number;
  nextVolleyAt: number;
  nextSwipeAt: number;
  nextLaserAt: number;
  nextBlastAt: number;

  ward: Ward | null;

  pendingSacrifice: boolean;
  sacrificeAskedAt: number;
  sacrificed: string[];

  lastRefusalAt: number;
  lastDetonateAt: number;
  revSecs: number;

  idol: Idol | null;
  idolReadyAt: number;

  /** Online: how many souls the opponent says it has bound. */
  ghostSouls: number;

  // Bot
  nextBotDetonateAt: number;
  nextBotIdolAt: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, curse: null, strength: 1, liftedUntil: 0, lastSentCurse: '',
    eyesUntil: 0, siphonSoul: -1, siphonRev: -1, siphonColor: BND.soul,
    gain: 0, speedGain: 0, gainUntil: 0, healDebt: 0, ghostSiphon: false,
    godUntil: 0, godMs: 0, wrathUntil: 0, wrathMs: 0,
    nextVolleyAt: 0, nextSwipeAt: 0, nextLaserAt: 0, nextBlastAt: 0,
    ward: null, pendingSacrifice: false, sacrificeAskedAt: 0, sacrificed: [],
    lastRefusalAt: 0, lastDetonateAt: 0, revSecs: 0,
    idol: null, idolReadyAt: 0, ghostSouls: 0,
    nextBotDetonateAt: 0, nextBotIdolAt: 0,
  };
}

type BindPick =
  | { kind: 'foe'; f: Fighter; x: number; y: number }
  | { kind: 'soul'; soul: Soul; x: number; y: number }
  | { kind: 'rev'; rev: Revenant; x: number; y: number }
  | { kind: 'cult'; cult: Cultist; x: number; y: number }
  | { kind: 'idol'; x: number; y: number };

// ── Arena API ────────────────────────────────────────────────────────────────

export interface BindArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  /** The arena's walls — daggers stick in them. */
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op ally, never an enemy. */
  get isInvasion(): boolean;
  /** Mirror an x across the arena — positions online are seen from the other side. */
  get worldW(): number;
  isTargetable(f: Fighter): boolean;
  /** Skins: maps a Bind visual colour through that side's equipped skin. */
  bindColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Mastery: the enhancement bound over each of the player's slots this match. */
  masteryBindFor(slot: string): string | null;
  /** …and the opponent's, for a bot or remote player running the mastery. */
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's / a Hard+ bot's. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── BindKit ──────────────────────────────────────────────────────────────────

/**
 * Bind — something in chains, born under a curse, that makes its living off the dead.
 *
 * - **Bound** (passive) — every match starts with one random curse: slower, softer, weaker or
 *   slower to recover. It is printed at the top of the screen and only siphoning wears it down.
 *   The ancient god is not here any more; it only comes when the Ritual calls it.
 * - **Lost souls** wander every arena a Bind fights in, invisible until Blackened Eyes (R) shows
 *   them. Bound (E), they follow you and are visible to everyone; they are the fuel for Siphon (F)
 *   and the price of the Ritual (Q). Drain one dry and it comes back as a **revenant** that stalks
 *   and dashes at you — and through anybody in the way.
 * - **Chainbound Daggers** (Click) fly on a short chain and stick in walls; right click blows
 *   every one of them into shotgun sprays of chain.
 *
 * Online, the owner's sim decides everything; tethers, souls, revenants, cultists and the ritual
 * are relayed as `bind-*` pseudo-casts and the other sim only draws them.
 */
export class BindKit {
  private api: BindArenaApi;

  private readonly pcol: BindColorFn;
  private readonly ncol: BindColorFn;
  private readonly pfx: BindFx;
  private readonly nfx: BindFx;
  private playerAvatar: BindAvatar | null = null;
  private npcAvatar: BindAvatar | null = null;
  /** Idol rings, runes, the god's marks — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Souls, daggers, revenants, cultists, chains — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The god, when it has been called — over everything. */
  private godGfx: Phaser.GameObjects.Graphics | null = null;
  /** The Bound plaque, pinned to the screen. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudText: Phaser.GameObjects.Text | null = null;
  private hudFoeText: Phaser.GameObjects.Text | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private promptGfx: Phaser.GameObjects.Graphics | null = null;
  private promptKeys = '';
  private promptReady = false;
  private sacrificeClickArmed = false;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private souls: Soul[] = [];
  private daggers: Dagger[] = [];
  private frags: Frag[] = [];
  private revenants: Revenant[] = [];
  private cultists: Cultist[] = [];
  private tethers: Tether[] = [];
  private shards: Shard[] = [];
  private marks: Mark[] = [];
  private sprays: Spray[] = [];
  private nextSoulAt = 0;
  private nextId = 1;
  private rightWasDown = false;
  private inverted = false;

  /** What this kit last wrote onto each body's shared outgoing multiplier. */
  private appliedOut = new Map<Fighter, number>();
  /** Bodies whose hitbox currently carries the soul-only factor. */
  private shrunk = new Set<Fighter>();
  /** Speed this kit wants on each body this frame, pulled by ArenaScene. */
  private speedOf = new Map<Fighter, number>();

  constructor(api: BindArenaApi) {
    this.api = api;
    this.pcol = (base) => api.bindColor('player', base);
    this.ncol = (base) => api.bindColor('npc', base);
    this.pfx = new BindFx(api.scene, this.pcol);
    this.nfx = new BindFx(api.scene, this.ncol);
    // The inverted screen is a CSS filter on the canvas — it must not survive into the menus.
    api.scene.events.on('shutdown', () => this.setInverted(false));
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): BindFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): BindColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): BindAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
  private dist(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(bx - ax, by - ay); }

  private isBind(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'bind' : this.api.npcElementId === 'bind';
  }

  /** Whether this sim decides what that side's things do. A remote side is only drawn here. */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.api.isOnline && !this.api.isInvasion);
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private up(owner: Owner, slot: string): boolean {
    if (!this.isBind(owner)) return false;
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  private masteryOn(owner: Owner): boolean {
    if (!this.isBind(owner)) return false;
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }

  /** The slot False Idol was bound over, if any. */
  private idolSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    const look = owner === 'player' ? this.api.masteryBindFor.bind(this.api) : this.api.npcMasteryBindFor.bind(this.api);
    for (const slot of ['r', 'f', 'q'] as const) if (look(slot) === IDOL_ID) return slot;
    return null;
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number, range = Infinity): Fighter | null {
    let best: Fighter | null = null;
    let bestD = range;
    for (const t of this.targetsOf(owner)) {
      const d = this.dist(x, y, t.x, t.y);
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

  private record(key: string, amount = 1): void {
    if (this.isBind('player')) this.api.recordMasteryStat(key, amount);
  }

  private canAct(f: Fighter): boolean {
    const wall = Date.now();
    return !(wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil);
  }

  private segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return this.dist(px, py, x0, y0);
    const t = Phaser.Math.Clamp(((px - x0) * dx + (py - y0) * dy) / len2, 0, 1);
    return this.dist(px, py, x0 + dx * t, y0 + dy * t);
  }

  private clampIn(x: number, y: number, pad = 24): { x: number; y: number } {
    const b = this.api.bounds;
    return { x: Phaser.Math.Clamp(x, b.left + pad, b.right - pad), y: Phaser.Math.Clamp(y, b.top + pad, b.bottom - pad) };
  }

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  /** A refusal: the label, a sound, rate-limited so a held key does not spam it. */
  private deny(owner: Owner, why: string): void {
    const s = this.side(owner);
    if (this.now - s.lastRefusalAt < 700) return;
    s.lastRefusalAt = this.now;
    const f = this.fighter(owner);
    if (owner !== 'player' || !this.alive(f)) return;
    this.announce(f.x, f.y - 50, why, BND.chainLit, 11);
    Sfx.playAt('ui-denied', f.x, { rate: 0.7, volume: 0.7 });
  }

  /** Every Bind hit goes through here — and only on the sim that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, flash: number): void {
    if (!this.simulates(owner) || !this.alive(t)) return;
    const f = this.fighter(owner);
    t.takeDamage(Math.round(dmg), { source: f, sourceX: f.x, sourceY: f.y });
    this.api.spawnHitFlash(t.x, t.y, this.col(owner)(flash));
  }

  /** Something of yours turning on you — never credited to anybody, but still a real hit. */
  private hurtSelf(owner: Owner, dmg: number, flash: number): void {
    if (!this.simulates(owner)) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    Fighter.asNonAllyDamage(() => f.takeDamage(Math.round(dmg)));
    this.api.spawnHitFlash(f.x, f.y, this.col(owner)(flash));
  }

  private setOutgoing(f: Fighter, mult: number): void {
    const prev = this.appliedOut.get(f) ?? 1;
    if (Math.abs(prev - mult) < 0.0005) return;
    f.outgoingDamageMult = (f.outgoingDamageMult / prev) * mult;
    if (Math.abs(mult - 1) < 0.0005) this.appliedOut.delete(f);
    else this.appliedOut.set(f, mult);
  }

  private setInverted(on: boolean): void {
    if (this.inverted === on) return;
    this.inverted = on;
    const canvas = this.api.scene.game.canvas as HTMLCanvasElement | undefined;
    if (!canvas) return;
    if (on) canvas.style.filter = 'invert(1)';
    else if (canvas.style.filter.includes('invert')) canvas.style.filter = '';
  }

  private eyesOpen(owner: Owner): boolean { return this.now < this.side(owner).eyesUntil; }
  private lifted(owner: Owner): boolean { return this.now < this.side(owner).liftedUntil; }
  private godAwake(owner: Owner): boolean { return this.now < this.side(owner).godUntil; }
  private turned(owner: Owner): boolean { return this.now < this.side(owner).wrathUntil; }
  private siphoning(owner: Owner): boolean {
    const s = this.side(owner);
    return s.siphonSoul >= 0 || s.siphonRev >= 0 || s.ghostSiphon;
  }

  private boundSouls(owner: Owner): Soul[] {
    return this.souls.filter((so) => so.boundTo === owner && !so.onIdol);
  }

  private soulCount(owner: Owner): number {
    if (!this.simulates(owner)) return this.side(owner).ghostSouls;
    return this.boundSouls(owner).length;
  }

  /**
   * Where a side is looking: the player's cursor, a remote player's synced facing, a bot's target.
   */
  private lookAngle(owner: Owner): number {
    const f = this.fighter(owner);
    if (owner === 'player') {
      const p = this.api.scene.input.activePointer;
      return Math.atan2(p.worldY - f.y, p.worldX - f.x);
    }
    if (this.api.isOnline) return f.facingAngle;
    const t = this.nearestTarget(owner, f.x, f.y);
    return t ? Math.atan2(t.y - f.y, t.x - f.x) : f.facingAngle;
  }

  private revsOf(owner: Owner): Revenant[] {
    return this.revenants.filter((r) => r.owner === owner);
  }

  private cultOf(owner: Owner): Cultist[] {
    return this.cultists.filter((c) => c.owner === owner);
  }

  /** Whether a soul can be seen — and so bound or siphoned — by that side. */
  private visibleTo(so: Soul, owner: Owner): boolean {
    if (so.ghost) return false;
    if (so.boundTo === owner) return true;
    return so.boundTo === null && this.eyesOpen(owner);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) this.dropWard(owner);
    for (const [f] of this.appliedOut) this.setOutgoing(f, 1);
    this.appliedOut.clear();
    for (const f of this.shrunk) {
      f.hitboxMult /= SOUL_HITBOX;
      if (f.active) f.applySizeMult();
    }
    this.shrunk.clear();
    for (const f of this.allFighters()) {
      f.bindIncomingMult = 1;
      f.bindCooldownMult = 1;
      f.soulWalking = false;
    }
    this.speedOf.clear();
    this.setInverted(false);

    this.sides = { player: makeSide(), npc: makeSide() };
    this.souls = [];
    this.daggers = [];
    this.frags = [];
    this.revenants = [];
    this.cultists = [];
    this.tethers = [];
    this.shards = [];
    this.marks = [];
    this.sprays = [];
    this.nextSoulAt = 0;
    this.rightWasDown = false;
    this.sacrificeClickArmed = false;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.godGfx?.destroy(); this.godGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudText?.destroy(); this.hudText = null;
    this.hudFoeText?.destroy(); this.hudFoeText = null;
    this.hidePrompt();

    for (const id of ['bind-curse', 'bind-souls', 'bind-siphon', 'bind-eyes', 'bind-lifted', 'bind-ward',
      'bind-god', 'bind-wrath', 'bind-revenants', 'bind-chained', 'bind-bond', 'bind-idol', 'bind-cult']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
    if (!this.godGfx) this.godGfx = scene.add.graphics().setDepth(18);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isBind('player') && !this.playerAvatar) this.playerAvatar = new BindAvatar(scene, this.pcol);
    if (this.isBind('npc') && !this.npcAvatar) this.npcAvatar = new BindAvatar(scene, this.ncol);
  }

  /** Bound: the curse is rolled the first frame a side is seen playing Bind. */
  private ensureCurse(owner: Owner): void {
    const s = this.side(owner);
    if (s.curse || !this.isBind(owner) || !this.simulates(owner)) return;
    s.curse = CURSE_IDS[Math.floor(Math.random() * CURSE_IDS.length)];
    s.strength = 1;
    const f = this.fighter(owner);
    if (this.alive(f)) this.announce(f.x, f.y - 60, `⛓ BOUND · ${CURSES[s.curse].name.toUpperCase()}`, BND.rune, 13);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'bind') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    if (!this.alive(p)) return;

    // Right click: every dagger you have out blows apart. Edge-triggered.
    const right = pointer.rightButtonDown();
    if (right && !this.rightWasDown) this.detonate('player');
    this.rightWasDown = right;

    // The ritual's price is paid before anything else can happen.
    if (s.pendingSacrifice) {
      const ready = this.now - s.sacrificeAskedAt >= SACRIFICE_GRACE_MS;
      this.setPromptReady(ready);
      if (!pointer.isDown) this.sacrificeClickArmed = ready;
      for (const slot of SACRIFICE_SLOTS) {
        const pressed = slot.key === 'Click'
          ? (pointer.leftButtonDown() && this.sacrificeClickArmed)
          : Phaser.Input.Keyboard.JustDown(this.keyFor(slot.key));
        if (!ready || !pressed || s.sacrificed.includes(slot.key)) continue;
        this.takeSacrifice('player', slot.id, slot.key);
        return;
      }
      return;
    }

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const idol = this.idolSlot('player');

    if (pointer.leftButtonDown()) p.castAbility('bind-daggers', ctx);

    // E: a recast while the chain is still on its caster drops it on the floor where you stand.
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      const main = this.tethers.find((t) => t.owner === 'player' && t.main && !t.anchor);
      if (main) {
        this.anchorChain('player', main);
      } else if (p.getCooldownRatio('bind-chain') >= 1) {
        if (this.pickBind('player', mouseX, mouseY)) p.castAbility('bind-chain', ctx);
        else this.deny('player', '⛓ NOTHING TO BIND');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      if (idol === 'r') this.tryIdol('player', mouseX, mouseY);
      else p.castAbility('bind-eyes', ctx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      if (idol === 'f') this.tryIdol('player', mouseX, mouseY);
      else if (this.siphoning('player')) this.stopSiphon('player', true);
      else if (p.getCooldownRatio('bind-siphon') >= 1) {
        if (this.pickSiphon('player', mouseX, mouseY)) p.castAbility('bind-siphon', ctx);
        else this.deny('player', '⛓ NO SOUL TO DRINK');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (idol === 'q') this.tryIdol('player', mouseX, mouseY);
      else if (p.getCooldownRatio('bind-ritual') >= 1) {
        if (this.offeringSize('player') > 0) p.castAbility('bind-ritual', ctx);
        else this.deny('player', '⛓ NO SOULS TO OFFER');
      }
    }
  }

  private keyFor(displayKey: string): Phaser.Input.Keyboard.Key {
    switch (displayKey) {
      case 'E': return this.api.eKey;
      case 'R': return this.api.rKey;
      default: return this.api.fKey;
    }
  }

  // ── Click: Chainbound Daggers ──────────────────────────────────────────────

  doDaggers(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.throwDagger(owner, f.x + Math.cos(ang) * 18, f.y + Math.sin(ang) * 18, ang, false);
    this.avatar(owner)?.play('punch', ang, 160);
    if (owner === 'npc' && !this.api.isOnline) Sfx.playAt('chain', f.x, { rate: 1.6, volume: 0.35 });
  }

  private throwDagger(owner: Owner, x: number, y: number, ang: number, cult: boolean): void {
    this.daggers.push({
      owner, x, y, ang, stuckUntil: 0, nextSprayAt: 0, stacks: 0, passed: new Set(), cult,
      seed: Math.random() * 999,
    });
  }

  /** Right click: every dagger of yours in the air or in a wall becomes a shotgun of chain. */
  private detonate(owner: Owner): void {
    const s = this.side(owner);
    if (this.now - s.lastDetonateAt < DETONATE_GUARD_MS) return;
    const mine = this.daggers.filter((d) => d.owner === owner && !d.cult);
    if (!mine.length) return;
    s.lastDetonateAt = this.now;
    this.relay(owner, 'bind-pop');
    for (const d of mine) {
      let ang = d.ang;
      if (d.stuckUntil) {
        // A stuck blade fires back out of the wall — at the nearest foe, or straight back out.
        const t = this.nearestTarget(owner, d.x, d.y, STUCK_SPRAY_RANGE);
        ang = t ? Math.atan2(t.y - d.y, t.x - d.x) : d.ang + Math.PI;
      }
      const bonus = 1 + d.stacks * INSPIRIT_STEP * 0.5;
      for (let i = 0; i < DETONATE_FRAGS; i++) {
        const u = DETONATE_FRAGS > 1 ? i / (DETONATE_FRAGS - 1) - 0.5 : 0;
        const a = ang + u * 2 * DETONATE_CONE + (Math.random() - 0.5) * 0.08;
        this.frags.push({
          owner, x: d.x, y: d.y, ang: a, damage: FRAG_DAMAGE * bonus,
          dieAt: this.now + FRAG_LIFE_MS * (0.85 + Math.random() * 0.3), soul: d.stacks > 0,
        });
      }
      this.fx(owner).daggerBurst(d.x, d.y, ang);
    }
    this.daggers = this.daggers.filter((d) => !mine.includes(d));
    const f = this.fighter(owner);
    Sfx.playAt('crystal-shatter', f.x, { rate: 1.3, volume: 0.6 });
    Sfx.playAt('chain', f.x, { rate: 0.8, volume: 0.6 });
  }

  private updateDaggers(dt: number): void {
    const b = this.api.bounds;
    for (let i = this.daggers.length - 1; i >= 0; i--) {
      const d = this.daggers[i];
      if (d.stuckUntil) {
        if (this.now >= d.stuckUntil) { this.daggers.splice(i, 1); continue; }
        if (!d.cult && this.now >= d.nextSprayAt) {
          d.nextSprayAt = this.now + STUCK_SPRAY_MS;
          const t = this.nearestTarget(d.owner, d.x, d.y, STUCK_SPRAY_RANGE);
          if (t) {
            const ang = Math.atan2(t.y - d.y, t.x - d.x);
            for (let k = 0; k < STUCK_SPRAY_COUNT; k++) {
              const a = ang + (k - (STUCK_SPRAY_COUNT - 1) / 2) * 0.13 + (Math.random() - 0.5) * 0.06;
              this.frags.push({
                owner: d.owner, x: d.x, y: d.y, ang: a,
                damage: FRAG_SPRAY_DAMAGE * (1 + d.stacks * INSPIRIT_STEP * 0.5),
                dieAt: this.now + FRAG_LIFE_MS * 1.4, soul: d.stacks > 0,
              });
            }
            this.fx(d.owner).daggerBurst(d.x, d.y, ang);
          }
        }
        continue;
      }

      const x0 = d.x;
      const y0 = d.y;
      d.x += Math.cos(d.ang) * DAGGER_SPEED * dt;
      d.y += Math.sin(d.ang) * DAGGER_SPEED * dt;

      // Inspirit (Click+): every soul the blade passes through lends it some of itself.
      if (!d.cult && this.up(d.owner, 'click')) {
        for (const so of this.souls) {
          if (so.ghost || d.passed.has(so.id)) continue;
          if (this.segDist(so.x, so.y, x0, y0, d.x, d.y) > INSPIRIT_R) continue;
          d.passed.add(so.id);
          d.stacks++;
          this.fx(d.owner).soulBound(so.x, so.y, soulColor(so.kind));
        }
      }

      // A body in the way.
      let landed = false;
      for (const t of this.targetsOf(d.owner)) {
        const sd = this.segDist(t.x, t.y, x0, y0, d.x, d.y);
        if (sd > this.bodyR(t) + DAGGER_HIT_PAD) continue;
        let dmg = d.cult ? CULT_DAGGER_DAMAGE : DAGGER_DAMAGE * (1 + d.stacks * INSPIRIT_STEP);
        const core = d.stacks > 0 && sd <= CORE_R;
        if (core) {
          dmg *= 1 + d.stacks * CORE_STEP;
          this.fx(d.owner).coreHit(t.x, t.y);
          if (d.owner === 'player') this.announce(t.x, t.y - 44, 'SOUL STRUCK', BND.soul, 11);
        }
        this.hit(d.owner, t, dmg, core ? BND.soul : BND.gold);
        this.fx(d.owner).daggerHit(t.x, t.y, d.ang, d.stacks > 0);
        landed = true;
        break;
      }
      if (landed) { this.daggers.splice(i, 1); continue; }

      // The wall.
      if (d.x <= b.left + 4 || d.x >= b.right - 4 || d.y <= b.top + 4 || d.y >= b.bottom - 4) {
        d.x = Phaser.Math.Clamp(d.x, b.left + 4, b.right - 4);
        d.y = Phaser.Math.Clamp(d.y, b.top + 4, b.bottom - 4);
        if (d.cult) { this.daggers.splice(i, 1); continue; }
        d.stuckUntil = this.now + DAGGER_STICK_MS;
        d.nextSprayAt = this.now + STUCK_SPRAY_MS * 0.6;
        Sfx.playAt('shield-block', d.x, { rate: 1.5, volume: 0.35 });
        const stuck = this.daggers.filter((o) => o.owner === d.owner && o.stuckUntil && !o.cult);
        if (stuck.length > DAGGER_STUCK_MAX) {
          const oldest = stuck.reduce((a, c) => (c.stuckUntil < a.stuckUntil ? c : a));
          this.daggers.splice(this.daggers.indexOf(oldest), 1);
        }
      }
    }

    for (let i = this.frags.length - 1; i >= 0; i--) {
      const fr = this.frags[i];
      if (this.now >= fr.dieAt) { this.frags.splice(i, 1); continue; }
      const x0 = fr.x;
      const y0 = fr.y;
      fr.x += Math.cos(fr.ang) * FRAG_SPEED * dt;
      fr.y += Math.sin(fr.ang) * FRAG_SPEED * dt;
      if (fr.x < b.left || fr.x > b.right || fr.y < b.top || fr.y > b.bottom) { this.frags.splice(i, 1); continue; }
      for (const t of this.targetsOf(fr.owner)) {
        if (this.segDist(t.x, t.y, x0, y0, fr.x, fr.y) > this.bodyR(t) + 3) continue;
        this.hit(fr.owner, t, fr.damage, fr.soul ? BND.soul : BND.chainLit);
        this.frags.splice(i, 1);
        break;
      }
    }
  }

  // ── E: Bind ────────────────────────────────────────────────────────────────

  /** What a bind at this cursor would take: whatever in reach is nearest the cursor. */
  private pickBind(owner: Owner, tx: number, ty: number): BindPick | null {
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    const cands: BindPick[] = [];
    for (const t of this.targetsOf(owner)) {
      if (this.dist(f.x, f.y, t.x, t.y) <= BIND_FOE_RANGE + this.bodyR(t)) cands.push({ kind: 'foe', f: t, x: t.x, y: t.y });
    }
    if (this.boundSouls(owner).length < SOUL_BOUND_MAX) {
      for (const so of this.souls) {
        if (so.boundTo !== null || !this.visibleTo(so, owner)) continue;
        if (this.dist(f.x, f.y, so.x, so.y) <= BIND_SOUL_RANGE) cands.push({ kind: 'soul', soul: so, x: so.x, y: so.y });
      }
    }
    if (this.up(owner, 'e')) {
      for (const r of this.revsOf(owner)) {
        if (r.state === 'held' || r.state === 'dash') continue;
        if (this.dist(f.x, f.y, r.x, r.y) <= BIND_REV_RANGE) cands.push({ kind: 'rev', rev: r, x: r.x, y: r.y });
      }
    }
    if (this.boundSouls(owner).length > 0) {
      for (const c of this.cultOf(owner)) {
        if (this.dist(f.x, f.y, c.x, c.y) <= BIND_FEED_RANGE) cands.push({ kind: 'cult', cult: c, x: c.x, y: c.y });
      }
      const idol = this.side(owner).idol;
      if (idol && !this.souls.some((so) => so.boundTo === owner && so.onIdol)
        && this.dist(f.x, f.y, idol.x, idol.y) <= BIND_FEED_RANGE) {
        cands.push({ kind: 'idol', x: idol.x, y: idol.y });
      }
    }
    if (!cands.length) return null;
    let best = cands[0];
    let bestD = Infinity;
    for (const c of cands) {
      const d = this.dist(tx, ty, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  doChain(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.side(owner).aimX = tx;
    this.side(owner).aimY = ty;
    // A remote caster's chain arrives as a `bind-tether` relay; the cast itself is only the throw.
    if (!this.simulates(owner)) { this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x), 200); return; }
    const pick = this.pickBind(owner, tx, ty);
    if (!pick) { f.resetCooldown('bind-chain'); return; }
    this.avatar(owner)?.play('punch', Math.atan2(pick.y - f.y, pick.x - f.x), 220);
    Sfx.playAt('chain', f.x, { rate: 0.9, volume: 0.9 });

    if (pick.kind === 'foe') {
      this.startTether(owner, pick.f, null, TETHER_MS, TETHER_LEN, true);
      this.relay(owner, `bind-tether:${TETHER_MS}:${TETHER_LEN}:f`);
      if (owner === 'player') this.announce(pick.f.x, pick.f.y - 46, 'BOUND', BND.chainLit, 12);
    } else if (pick.kind === 'soul') {
      pick.soul.boundTo = owner;
      this.fx(owner).soulBound(pick.soul.x, pick.soul.y, soulColor(pick.soul.kind));
      if (owner === 'player') {
        this.record('soulsBound');
        this.announce(pick.soul.x, pick.soul.y - 24, 'SOUL BOUND', soulColor(pick.soul.kind), 11);
      }
      this.sendSouls(owner);
    } else if (pick.kind === 'rev') {
      // Bind the Hatred (E+): held still five seconds, then straight at you, harder.
      const r = pick.rev;
      r.state = 'held';
      r.stateUntil = this.now + HATRED_HOLD_MS;
      r.empowered = true;
      r.dash = null;
      this.relay(owner, `bind-rhold:${r.id}`);
      if (owner === 'player') this.announce(r.x, r.y - 34, 'HATRED BOUND', BND.rune, 11);
    } else if (pick.kind === 'cult') {
      const so = this.boundSouls(owner).pop();
      if (so) {
        this.fx(owner).soulOffered(so.x, so.y, pick.cult.x, pick.cult.y, soulColor(so.kind));
        this.removeSoul(so);
        pick.cult.until = Math.min(this.now + CULT_FAITH_CAP_MS, Math.max(pick.cult.until, this.now) + CULT_FEED_MS);
        this.sendSouls(owner);
        if (owner === 'player') this.announce(pick.cult.x, pick.cult.y - 40, 'FAITH RESTORED', BND.goldLit, 11);
      }
    } else {
      const idol = this.side(owner).idol;
      const so = this.boundSouls(owner).pop();
      if (idol && so) {
        so.onIdol = true;
        this.fx(owner).soulBound(idol.x, idol.y, soulColor(so.kind));
        this.relay(owner, 'bind-fsoul');
        this.sendSouls(owner);
      }
    }
  }

  private startTether(owner: Owner, victim: Fighter, anchor: { x: number; y: number } | null, ms: number, len: number, main: boolean): void {
    if (main) this.tethers = this.tethers.filter((t) => !(t.owner === owner && t.main));
    this.tethers = this.tethers.filter((t) => !(t.victim === victim && t.owner === owner && !t.main && !main));
    this.tethers.push({ owner, victim, anchor, until: this.now + ms, len, main });
  }

  private anchorChain(owner: Owner, t: Tether): void {
    const f = this.fighter(owner);
    t.anchor = { x: f.x, y: f.y };
    this.relay(owner, `bind-anchor:${Math.round(f.x)}:${Math.round(f.y)}`);
    Sfx.playAt('chain', f.x, { rate: 0.6, volume: 0.8 });
    if (owner === 'player') this.announce(f.x, f.y - 44, 'ANCHORED', BND.chainLit, 11);
  }

  /** Every chain holding: the victim is put back inside its reach, after it has already moved. */
  private updateTethers(): void {
    for (let i = this.tethers.length - 1; i >= 0; i--) {
      const t = this.tethers[i];
      const caster = this.fighter(t.owner);
      if (this.now >= t.until || !this.alive(t.victim) || (!t.anchor && !this.alive(caster))) {
        this.tethers.splice(i, 1);
        continue;
      }
      // The victim's own sim decides where it stands — a replica is moved by its owner.
      if (t.victim.netGhost) continue;
      const ax = t.anchor ? t.anchor.x : caster.x;
      const ay = t.anchor ? t.anchor.y : caster.y;
      const d = this.dist(ax, ay, t.victim.x, t.victim.y);
      if (d <= t.len) continue;
      const k = t.len / d;
      const nx = ax + (t.victim.x - ax) * k;
      const ny = ay + (t.victim.y - ay) * k;
      t.victim.x = nx;
      t.victim.y = ny;
      const body = t.victim.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        // Kill only the outward part of the velocity, so it can still walk around the circle.
        const ux = (t.victim.x - ax) / t.len, uy = (t.victim.y - ay) / t.len;
        const out = body.velocity.x * ux + body.velocity.y * uy;
        if (out > 0) body.setVelocity(body.velocity.x - ux * out, body.velocity.y - uy * out);
      }
    }
  }

  // ── R: Blackened Eyes ──────────────────────────────────────────────────────

  doEyes(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.side(owner).eyesUntil = this.now + EYES_MS;
    this.fx(owner).eyesOpen(f.x, f.y);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('ghost-wail', f.x, { rate: 1.2, volume: 0.6 });
    if (owner === 'player') this.announce(f.x, f.y - 56, 'BLACKENED EYES', BND.soul, 12);
  }

  // ── F: Siphon ──────────────────────────────────────────────────────────────

  private pickSiphon(owner: Owner, tx: number, ty: number): { soul?: Soul; rev?: Revenant } | null {
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    let best: { soul?: Soul; rev?: Revenant } | null = null;
    let bestD = Infinity;
    for (const so of this.souls) {
      if (so.onIdol || !this.visibleTo(so, owner)) continue;
      if (this.dist(f.x, f.y, so.x, so.y) > SIPHON_RANGE) continue;
      const d = this.dist(tx, ty, so.x, so.y);
      if (d < bestD) { bestD = d; best = { soul: so }; }
    }
    if (this.up(owner, 'f')) {
      for (const r of this.revsOf(owner)) {
        if (this.dist(f.x, f.y, r.x, r.y) > SIPHON_RANGE) continue;
        const d = this.dist(tx, ty, r.x, r.y);
        if (d < bestD) { bestD = d; best = { rev: r }; }
      }
    }
    return best;
  }

  doSiphon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    if (!this.simulates(owner)) { s.ghostSiphon = true; return; }
    const pick = this.pickSiphon(owner, tx, ty);
    if (!pick) { f.resetCooldown('bind-siphon'); return; }
    s.siphonSoul = pick.soul ? pick.soul.id : -1;
    s.siphonRev = pick.rev ? pick.rev.id : -1;
    s.siphonColor = pick.soul ? soulColor(this.up(owner, 'r') ? pick.soul.kind : 'plain') : BND.rune;
    this.avatar(owner)?.setHold('draw', Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('beam-charge', f.x, { rate: 0.6, volume: 0.6 });
    if (owner === 'player') this.announce(f.x, f.y - 52, 'SIPHON', s.siphonColor, 11);
  }

  private stopSiphon(owner: Owner, announce: boolean): void {
    const s = this.side(owner);
    const was = this.siphoning(owner);
    s.siphonSoul = -1;
    s.siphonRev = -1;
    s.ghostSiphon = false;
    if (!was) return;
    s.gainUntil = this.now + SIPHON_LINGER_MS;
    this.avatar(owner)?.setHold(null);
    this.relay(owner, 'bind-siphoff');
    const f = this.fighter(owner);
    if (announce && owner === 'player' && this.alive(f) && s.gain > 0.05) {
      this.announce(f.x, f.y - 52, `+${Math.round(s.gain * 100)}% DAMAGE`, BND.goldLit, 11);
    }
  }

  private updateSiphons(dt: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (s.ghostSiphon) continue;
      if (!this.siphoning(owner)) {
        if (s.gainUntil && this.now >= s.gainUntil) { s.gain = 0; s.speedGain = 0; s.gainUntil = 0; }
        continue;
      }
      if (!this.alive(f) || !this.canAct(f)) { this.stopSiphon(owner, false); continue; }
      const so = s.siphonSoul >= 0 ? this.souls.find((x) => x.id === s.siphonSoul) : undefined;
      const rev = s.siphonRev >= 0 ? this.revenants.find((x) => x.id === s.siphonRev) : undefined;
      const tgt = so ?? rev;
      if (!tgt || this.dist(f.x, f.y, tgt.x, tgt.y) > SIPHON_BREAK) { this.stopSiphon(owner, true); continue; }

      // The pay: damage that builds the longer you drink. Choice Souls (R+) temper it.
      // Tempers only pay out with Choice Souls (R+); without it every soul is plain. A revenant is
      // always angry — that is all it has left.
      const kind: SoulKind = so ? (this.up(owner, 'r') ? so.kind : 'plain') : 'angry';
      const angry = kind === 'angry';
      s.gain = Math.min(angry ? ANGRY_GAIN_MAX : SIPHON_GAIN_MAX, s.gain + (angry ? ANGRY_GAIN_PS : SIPHON_GAIN_PS) * dt);
      if (kind === 'sad') s.speedGain = Math.min(SAD_SPEED_MAX, s.speedGain + SAD_SPEED_PS * dt);
      if (kind === 'kind') {
        // Healed in whole points, so the drink reads as a steady trickle rather than a blur of popups.
        s.healDebt += KIND_HEAL_PS * dt;
        if (s.healDebt >= 1) {
          const whole = Math.floor(s.healDebt);
          s.healDebt -= whole;
          if (f.hp < f.maxHp) f.heal(whole);
        }
      }
      s.gainUntil = 0;
      // And every second of it wears the curse down for good.
      if (s.curse && s.strength > 0) s.strength = Math.max(0, s.strength - CURSE_SIPHON_RATE * dt);

      if (so) {
        so.essence -= dt / SOUL_DRAIN_S;
        if (so.essence <= 0) {
          this.fx(owner).soulPop(so.x, so.y, soulColor(so.kind));
          const wasBound = so.boundTo === owner;
          this.removeSoul(so);
          if (wasBound) this.sendSouls(owner);
          this.stopSiphon(owner, true);
          if (this.revsOf(owner).length < REV_MAX) this.spawnRevenant(owner, so.x, so.y);
        }
      } else if (rev) {
        // Trial by Faith (F+): the revenant gets worse and worse, and then it kneels.
        rev.fury = Math.min(1, rev.fury + dt / FURY_S);
        if (rev.fury >= 1) {
          this.removeRevenant(rev);
          this.stopSiphon(owner, true);
          if (this.cultOf(owner).length < CULT_MAX) this.spawnCultist(owner, rev.x, rev.y);
        }
      }
    }
  }

  // ── Souls ──────────────────────────────────────────────────────────────────

  private spawnSoul(): void {
    const b = this.api.bounds;
    const pad = 60;
    const kinds: SoulKind[] = ['kind', 'angry', 'sad'];
    this.souls.push({
      id: this.nextId++,
      x: Phaser.Math.Between(b.left + pad, b.right - pad),
      y: Phaser.Math.Between(b.top + pad, b.bottom - pad),
      heading: Math.random() * TAU,
      kind: kinds[Math.floor(Math.random() * kinds.length)],
      essence: 1, boundTo: null, onIdol: false, seed: Math.random() * 999, ghost: false,
    });
  }

  private removeSoul(so: Soul): void {
    const i = this.souls.indexOf(so);
    if (i >= 0) this.souls.splice(i, 1);
    for (const owner of BOTH) {
      if (this.side(owner).siphonSoul === so.id) this.stopSiphon(owner, false);
    }
  }

  /** Online: tell the other sim how many souls trail us, so it can draw them. */
  private sendSouls(owner: Owner): void {
    this.relay(owner, `bind-souls:${this.boundSouls(owner).length}`);
  }

  private updateSouls(dt: number): void {
    // Lost souls only wander an arena a simulated Bind is fighting in.
    const wants = BOTH.some((o) => this.isBind(o) && this.simulates(o));
    const wild = this.souls.filter((so) => so.boundTo === null).length;
    if (wants && wild < SOUL_WILD_MAX && this.now >= this.nextSoulAt) {
      this.nextSoulAt = this.now + SOUL_SPAWN_MS;
      this.spawnSoul();
    }
    // Online: keep the opponent's stand-in souls matching what it says it has.
    const ghostOwner: Owner = 'npc';
    if (!this.simulates(ghostOwner)) {
      const ghosts = this.souls.filter((so) => so.ghost);
      const want = this.isBind(ghostOwner) ? this.side(ghostOwner).ghostSouls : 0;
      const nf = this.fighter(ghostOwner);
      while (ghosts.length < want) {
        const so: Soul = {
          id: this.nextId++, x: nf?.x ?? 0, y: nf?.y ?? 0, heading: 0, kind: 'plain', essence: 1,
          boundTo: ghostOwner, onIdol: false, seed: Math.random() * 999, ghost: true,
        };
        this.souls.push(so);
        ghosts.push(so);
      }
      while (ghosts.length > want) this.removeSoul(ghosts.pop()!);
    }

    const b = this.api.bounds;
    const trail: Record<Owner, number> = { player: 0, npc: 0 };
    const counts: Record<Owner, number> = {
      player: this.souls.filter((so) => so.boundTo === 'player' && !so.onIdol).length,
      npc: this.souls.filter((so) => so.boundTo === 'npc' && !so.onIdol).length,
    };
    for (const so of [...this.souls]) {
      const prevX = so.x;
      const prevY = so.y;
      if (so.boundTo === null) {
        so.heading += (Math.sin(this.vizT * 0.7 + so.seed) * 0.9 + (Math.random() - 0.5) * 0.6) * dt;
        so.x += Math.cos(so.heading) * SOUL_DRIFT * dt;
        so.y += Math.sin(so.heading) * SOUL_DRIFT * dt;
        if (so.x < b.left + 40 || so.x > b.right - 40) so.heading = Math.PI - so.heading;
        if (so.y < b.top + 40 || so.y > b.bottom - 40) so.heading = -so.heading;
        so.x = Phaser.Math.Clamp(so.x, b.left + 40, b.right - 40);
        so.y = Phaser.Math.Clamp(so.y, b.top + 40, b.bottom - 40);
        continue;
      }
      if (so.onIdol) {
        const idol = this.side(so.boundTo).idol;
        if (!idol) { so.onIdol = false; continue; }
        const p = this.vizT * 0.8 + so.seed;
        so.x += (idol.x + Math.cos(p) * 30 - so.x) * Math.min(1, dt * 3);
        so.y += (idol.y + 18 + Math.sin(p) * 12 - so.y) * Math.min(1, dt * 3);
        so.essence -= dt / IDOL_SOUL_S;
        if (so.essence <= 0) {
          this.fx(so.boundTo).soulPop(so.x, so.y, soulColor(so.kind));
          this.removeSoul(so);
        }
        continue;
      }
      // Bound: a slow ring trailing the owner.
      const f = this.fighter(so.boundTo);
      if (!f) continue;
      const n = Math.max(1, counts[so.boundTo]);
      const i = trail[so.boundTo]++;
      const p = (i / n) * TAU + this.vizT * 0.6;
      const tx = f.x + Math.cos(p) * 38;
      const ty = f.y + Math.sin(p) * 26 - 6;
      so.x += (tx - so.x) * Math.min(1, dt * 4);
      so.y += (ty - so.y) * Math.min(1, dt * 4);
      if (Math.abs(so.x - prevX) + Math.abs(so.y - prevY) > 0.3) so.heading = Math.atan2(so.y - prevY, so.x - prevX);
    }
  }

  // ── Revenants ──────────────────────────────────────────────────────────────

  private spawnRevenant(owner: Owner, x: number, y: number, id = this.nextId++): void {
    this.revenants.push({
      id, owner, x, y, ang: 0, state: 'stalk', stateUntil: 0,
      nextChargeAt: this.now + REV_CHARGE_EVERY, dash: null, fury: 0, empowered: false,
      seed: Math.random() * 999,
    });
    this.fx(owner).revenantRise(x, y);
    Sfx.playAt('nightmare', x, { rate: 1.1, volume: 0.7 });
    this.relay(owner, `bind-rev:${id}:${Math.round(x)}:${Math.round(y)}`);
    const f = this.fighter(owner);
    if (owner === 'player' && this.alive(f)) this.announce(x, y - 36, 'A REVENANT RISES', BND.rune, 12);
  }

  private removeRevenant(r: Revenant): void {
    const i = this.revenants.indexOf(r);
    if (i >= 0) this.revenants.splice(i, 1);
    this.relay(r.owner, `bind-revgone:${r.id}`);
    for (const owner of BOTH) {
      if (this.side(owner).siphonRev === r.id) this.stopSiphon(owner, false);
    }
  }

  private startDash(r: Revenant, tx: number, ty: number): void {
    const ang = Math.atan2(ty - r.y, tx - r.x);
    r.state = 'dash';
    r.ang = ang;
    r.lockX = r.lockY = undefined;
    r.dash = {
      x0: r.x, y0: r.y,
      tx: tx + Math.cos(ang) * REV_OVERSHOOT, ty: ty + Math.sin(ang) * REV_OVERSHOOT,
      hit: [],
    };
    Sfx.playAt('space-slash', r.x, { rate: 0.6, volume: 0.6 });
    this.relay(r.owner, `bind-rdash:${r.id}:${Math.round(tx)}:${Math.round(ty)}`);
  }

  private updateRevenants(dt: number): void {
    const b = this.api.bounds;
    for (const r of [...this.revenants]) {
      const f = this.fighter(r.owner);
      if (!this.alive(f)) continue;
      const sim = this.simulates(r.owner);
      const fury = r.fury;
      if (r.state === 'stalk') {
        // Keep its distance behind you — opposite where you are looking — the pack fanned out.
        const pack = this.revsOf(r.owner);
        const fan = (pack.indexOf(r) - (pack.length - 1) / 2) * REV_FAN;
        const a = this.lookAngle(r.owner) + Math.PI + fan + Math.sin(this.vizT * 0.5 + r.seed) * 0.12;
        const wx = Phaser.Math.Clamp(f.x + Math.cos(a) * REV_KEEP, b.left + 12, b.right - 12);
        const wy = Phaser.Math.Clamp(f.y + Math.sin(a) * REV_KEEP, b.top + 12, b.bottom - 12);
        const d = this.dist(r.x, r.y, wx, wy);
        if (d > 2) {
          const step = Math.min(d, REV_SPEED * (1 + fury * 0.4) * dt);
          r.x += ((wx - r.x) / d) * step;
          r.y += ((wy - r.y) / d) * step;
        }
        r.ang = Math.atan2(f.y - r.y, f.x - r.x);
        if (sim && this.now >= r.nextChargeAt) {
          r.state = 'charge';
          r.stateUntil = this.now + REV_CHARGE_MS * (1 - fury * 0.4);
          Sfx.playAt('beam-charge', r.x, { rate: 0.8, volume: 0.45 });
        }
      } else if (r.state === 'charge') {
        if (r.lockX === undefined && this.now >= r.stateUntil - REV_LOCK_MS) { r.lockX = f.x; r.lockY = f.y; }
        const lx = r.lockX ?? f.x;
        const ly = r.lockY ?? f.y;
        r.ang = Math.atan2(ly - r.y, lx - r.x);
        if (sim && this.now >= r.stateUntil) this.startDash(r, lx, ly);
      } else if (r.state === 'held') {
        if (sim && this.now >= r.stateUntil) this.startDash(r, f.x, f.y);
      } else if (r.state === 'dash' && r.dash) {
        const dsh = r.dash;
        const x0 = r.x;
        const y0 = r.y;
        const rem = this.dist(r.x, r.y, dsh.tx, dsh.ty);
        const step = Math.min(rem, REV_DASH_SPEED * (1 + fury * 0.3) * (r.empowered ? 1.2 : 1) * dt);
        if (rem > 0.5) {
          r.x += ((dsh.tx - r.x) / rem) * step;
          r.y += ((dsh.ty - r.y) / rem) * step;
        }
        const mult = (1 + fury) * (r.empowered ? HATRED_DMG_MULT : 1);
        // Its summoner, if they did not keep walking…
        if (!dsh.hit.includes(f) && this.segDist(f.x, f.y, x0, y0, r.x, r.y) <= REV_HIT_R + this.bodyR(f) * 0.5) {
          dsh.hit.push(f);
          this.hurtSelf(r.owner, REV_SELF_DAMAGE * mult, BND.rune);
        }
        // …and anybody else who happened to be standing in the line.
        for (const t of this.targetsOf(r.owner)) {
          if (dsh.hit.includes(t)) continue;
          if (this.segDist(t.x, t.y, x0, y0, r.x, r.y) > REV_HIT_R + this.bodyR(t) * 0.5) continue;
          dsh.hit.push(t);
          this.hit(r.owner, t, REV_FOE_DAMAGE * mult, BND.rune);
          if (r.owner === 'player') this.announce(t.x, t.y - 46, 'RAN THROUGH', BND.rune, 12);
        }
        const out = r.x <= b.left + 10 || r.x >= b.right - 10 || r.y <= b.top + 10 || r.y >= b.bottom - 10;
        if (rem <= 1 || out) {
          this.fx(r.owner).revenantStreak(dsh.x0, dsh.y0, r.x, r.y);
          r.x = Phaser.Math.Clamp(r.x, b.left + 12, b.right - 12);
          r.y = Phaser.Math.Clamp(r.y, b.top + 12, b.bottom - 12);
          r.state = 'stalk';
          r.dash = null;
          r.empowered = false;
          r.nextChargeAt = this.now + REV_CHARGE_EVERY * (1 - fury * 0.5);
        }
      }
    }

    // Mastery requirement: time spent with something angry on your heels.
    if (this.isBind('player') && this.revsOf('player').length) {
      const s = this.sides.player;
      s.revSecs += dt;
      if (s.revSecs >= 1) {
        const whole = Math.floor(s.revSecs);
        s.revSecs -= whole;
        this.record('revenantSeconds', whole);
      }
    }
  }

  // ── Cultists (F+) ──────────────────────────────────────────────────────────

  private spawnCultist(owner: Owner, x: number, y: number): void {
    this.cultists.push({
      owner, x, y, until: this.now + CULT_FAITH_MS,
      nextThrowAt: this.now + 600, nextBindAt: this.now + 1500, seed: Math.random() * 99,
    });
    this.fx(owner).cultistRise(x, y);
    Sfx.playAt('holy-chord', x, { rate: 0.7, volume: 0.8 });
    this.relay(owner, `bind-cult:${Math.round(x)}:${Math.round(y)}`);
    if (owner === 'player') {
      this.record('cultistsMade');
      this.announce(x, y - 44, 'A CULTIST KNEELS', BND.goldLit, 12);
    }
  }

  private updateCultists(dt: number): void {
    for (let i = this.cultists.length - 1; i >= 0; i--) {
      const c = this.cultists[i];
      const f = this.fighter(c.owner);
      if (this.now >= c.until || !this.alive(f)) {
        this.fx(c.owner).cultistStab(c.x, c.y);
        this.cultists.splice(i, 1);
        continue;
      }
      const sim = this.simulates(c.owner);
      const t = this.nearestTarget(c.owner, c.x, c.y);
      // Walk toward a spot a little short of the foe, on your side of it.
      if (t) {
        const a = Math.atan2(t.y - f.y, t.x - f.x) + (i - 1) * 0.6;
        const wx = t.x - Math.cos(a) * 170;
        const wy = t.y - Math.sin(a) * 170;
        const d = this.dist(c.x, c.y, wx, wy);
        if (d > 4) {
          const step = Math.min(d, CULT_SPEED * dt);
          c.x += ((wx - c.x) / d) * step;
          c.y += ((wy - c.y) / d) * step;
        }
        const p = this.clampIn(c.x, c.y, 30);
        c.x = p.x;
        c.y = p.y;
        const d2 = this.dist(c.x, c.y, t.x, t.y);
        if (this.now >= c.nextThrowAt && d2 <= CULT_THROW_RANGE) {
          c.nextThrowAt = this.now + CULT_THROW_MS;
          const ang = Math.atan2(t.y - c.y, t.x - c.x) + (Math.random() - 0.5) * 0.12;
          this.throwDagger(c.owner, c.x + Math.cos(ang) * 14, c.y - 6 + Math.sin(ang) * 14, ang, true);
        }
        if (sim && this.now >= c.nextBindAt && d2 <= CULT_BIND_RANGE) {
          c.nextBindAt = this.now + CULT_BIND_MS;
          this.startTether(c.owner, t, { x: c.x, y: c.y }, CULT_TETHER_MS, CULT_TETHER_LEN, false);
          this.relay(c.owner, `bind-tether:${CULT_TETHER_MS}:${CULT_TETHER_LEN}:c:${Math.round(c.x)}:${Math.round(c.y)}`);
          Sfx.playAt('chain', c.x, { rate: 1.1, volume: 0.7 });
        }
      }
    }
  }

  // ── Q: Ritual ──────────────────────────────────────────────────────────────

  /** What the ritual would be paid with: bound souls, and with Wrathful God (Q+) revenants too. */
  private offeringSize(owner: Owner): number {
    return this.soulCount(owner) + (this.up(owner, 'q') ? this.revsOf(owner).length : 0);
  }

  doRitual(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    // A remote ritual arrives as `bind-ritual:<souls>:<revenants>`, priced on its own sim.
    if (!this.simulates(owner)) return;
    const souls = this.boundSouls(owner);
    const revs = this.up(owner, 'q') ? this.revsOf(owner) : [];
    const n = souls.length + revs.length;
    if (n <= 0) { f.resetCooldown('bind-ritual'); this.deny(owner, '⛓ NO SOULS TO OFFER'); return; }
    for (const so of souls) {
      this.fx(owner).soulOffered(so.x, so.y, f.x, f.y, soulColor(so.kind));
      this.removeSoul(so);
    }
    for (const r of revs) {
      this.fx(owner).soulOffered(r.x, r.y, f.x, f.y, BND.rune);
      this.removeRevenant(r);
    }
    this.sendSouls(owner);
    this.relay(owner, `bind-ritual:${n}:${revs.length}`);
    this.beginRitual(owner, n, revs.length);
  }

  private beginRitual(owner: Owner, n: number, revs: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const godMs = n <= 2 ? GOD_SHORT_MS : n <= 4 ? GOD_MID_MS : GOD_LONG_MS;
    s.godUntil = this.now + godMs;
    s.godMs = godMs;
    s.wrathMs = revs * WRATHFUL_MS_PER;
    s.wrathUntil = 0;
    s.nextVolleyAt = this.now + 400;
    s.nextSwipeAt = this.now + 900;
    s.nextLaserAt = this.now + 300;
    s.nextBlastAt = this.now + 1400;

    this.fx(owner).ritualDrive(f.x, f.y, 70);
    this.fx(owner).wrath(this.eyeX, EYE_Y);
    this.avatar(owner)?.play('slam', Math.PI / 2, 360);
    this.api.scene.cameras.main.shake(600, 0.007);
    Sfx.playAt('judgement', f.x, { rate: 0.7, volume: 0.9 });
    Sfx.playAt('ghost-wail', f.x, { rate: 0.5, volume: 0.9 });
    if (owner === 'player') {
      this.record('godSummons');
      this.announce(f.x, f.y - 70, `THE GOD ANSWERS · ${n} SOUL${n === 1 ? '' : 'S'}`, BND.runeLit, 14);
    }

    if (n >= 3) {
      s.liftedUntil = this.now + (n >= 5 ? LIFT_LONG_MS : godMs);
      if (owner === 'player') this.announce(f.x, f.y - 52, 'UNBOUND', BND.goldLit, 12);
    }
    if (n >= 5) this.giveWard(owner);
    if (n <= 2) this.askSacrifice(owner);
  }

  private get eyeX(): number { return this.api.bounds.centerX; }

  private askSacrifice(owner: Owner): void {
    const s = this.side(owner);
    const left = SACRIFICE_SLOTS.filter((slot) => !s.sacrificed.includes(slot.key));
    if (!left.length) return;
    if (owner === 'player') {
      s.pendingSacrifice = true;
      s.sacrificeAskedAt = this.now;
      this.sacrificeClickArmed = false;
      this.showPrompt(left);
    } else if (this.simulates('npc')) {
      const slot = left[Math.floor(Math.random() * left.length)];
      this.takeSacrifice('npc', slot.id, slot.key);
    }
  }

  private takeSacrifice(owner: Owner, abilityId: string, key: string): void {
    const s = this.side(owner);
    s.pendingSacrifice = false;
    if (!s.sacrificed.includes(key)) s.sacrificed.push(key);
    this.hidePrompt();
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    f.lockAbility(abilityId, SACRIFICE_MS);
    if (abilityId === 'bind-siphon') this.stopSiphon(owner, false);
    this.fx(owner).shardBurst(f.x, f.y, true);
    Sfx.playAt('chain', f.x, { rate: 0.6, volume: 1 });
    if (owner === 'player') this.announce(f.x, f.y - 56, `⛓ ${key} TAKEN`, BND.wrath, 13);
  }

  private showPrompt(left: { id: string; key: string }[]): void {
    this.hidePrompt();
    const { width, height } = this.api.scene.scale;
    this.promptKeys = left.map((slot) => slot.key).join(' / ');
    this.promptReady = false;
    this.prompt = this.api.scene.add.text(width / 2, height - 96, this.promptText(false), {
      fontFamily: FONT_DISPLAY, fontSize: '16px',
      color: this.hex(BND.goldLit), stroke: '#080415', strokeThickness: 4,
      padding: { x: 4, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.promptGfx = this.api.scene.add.graphics().setScrollFactor(0).setDepth(29.9);
  }

  private promptText(ready: boolean): string {
    return ready
      ? `THE GOD TAKES A LIMB — press ${this.promptKeys} to give one up`
      : 'THE GOD TAKES A LIMB — it is deciding what to ask for…';
  }

  private setPromptReady(ready: boolean): void {
    if (!this.prompt || ready === this.promptReady) return;
    this.promptReady = ready;
    this.prompt.setText(this.promptText(ready));
  }

  private hidePrompt(): void {
    this.prompt?.destroy();
    this.prompt = null;
    this.promptGfx?.destroy();
    this.promptGfx = null;
    this.promptReady = false;
  }

  /** The old prophet's protection: three hexes that eat three hits whole. */
  private giveWard(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.dropWard(owner);
    const ward: Ward = { charges: WARD_CHARGES, prev: f.damageAbsorber };
    this.side(owner).ward = ward;
    f.damageAbsorber = () => {
      if (ward.charges <= 0) return false;
      ward.charges--;
      this.fx(owner).wardBlock(f.x, f.y);
      Sfx.playAt('shield-block', f.x, { rate: 0.75, volume: 0.9 });
      if (ward.charges <= 0) this.dropWard(owner);
      return true;
    };
    if (owner === 'player') this.announce(f.x, f.y - 40, "PROPHET'S PROTECTION", BND.goldLit, 11);
  }

  private dropWard(owner: Owner): void {
    const s = this.side(owner);
    const ward = s.ward;
    if (!ward) return;
    s.ward = null;
    const f = this.fighter(owner);
    if (f) f.damageAbsorber = ward.prev;
  }

  private godVictims(owner: Owner, turned: boolean): Fighter[] {
    if (!turned) return this.targetsOf(owner);
    const f = this.fighter(owner);
    return this.alive(f) ? [f] : [];
  }

  private godHurt(owner: Owner, victim: Fighter, amount: number, turned: boolean, flash: number): void {
    if (turned) {
      if (victim === this.fighter(owner)) this.hurtSelf(owner, amount, BND.wrath);
      return;
    }
    this.hit(owner, victim, amount, flash);
  }

  private updateGods(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.godAwake(owner)) {
        this.runGod(owner, false);
      } else if (s.godUntil) {
        s.godUntil = 0;
        // Wrathful God (Q+): every revenant thrown on the fire costs three seconds of it turned on you.
        if (s.wrathMs > 0) {
          s.wrathUntil = this.now + s.wrathMs;
          s.wrathMs = 0;
          s.nextVolleyAt = this.now + 150;
          s.nextSwipeAt = this.now + 500;
          s.nextLaserAt = this.now;
          s.nextBlastAt = this.now + 800;
          this.fx(owner).wrath(this.eyeX, EYE_Y);
          this.api.scene.cameras.main.flash(220, 190, 40, 30);
          const f = this.fighter(owner);
          if (owner === 'player' && this.alive(f)) this.announce(f.x, f.y - 70, 'THE GOD IS WRATHFUL', BND.wrath, 14);
          Sfx.playAt('nightmare', this.eyeX, { rate: 0.7, volume: 0.9 });
        }
      }
      if (this.turned(owner)) this.runGod(owner, true);
      else if (s.wrathUntil && this.now >= s.wrathUntil) s.wrathUntil = 0;
    }
  }

  /** The god acting — on your behalf, or (Q+) on you. */
  private runGod(owner: Owner, turned: boolean): void {
    const s = this.side(owner);
    const victims = this.godVictims(owner, turned);
    if (!victims.length) return;
    const pick = () => victims[Math.floor(Math.random() * victims.length)];
    const b = this.api.bounds;

    if (this.now >= s.nextVolleyAt) {
      s.nextVolleyAt = this.now + GOD_VOLLEY_MS;
      const v = pick();
      for (let i = 0; i < GOD_VOLLEY_SHARDS; i++) {
        const a = Math.random() * TAU;
        const d = Math.sqrt(Math.random()) * GOD_SHARD_SPREAD;
        const tx = Phaser.Math.Clamp(v.x + Math.cos(a) * d, b.left, b.right);
        const ty = Phaser.Math.Clamp(v.y + Math.sin(a) * d, b.top, b.bottom);
        const ox = this.eyeX + (Math.random() - 0.5) * 150;
        const oy = EYE_Y + 14 + Math.random() * 20;
        this.shards.push({ owner, x: ox, y: oy, tx, ty, ang: Math.atan2(ty - oy, tx - ox), liveAt: this.now + i * 26, turned });
      }
    }
    if (this.now >= s.nextSwipeAt) {
      s.nextSwipeAt = this.now + GOD_SWIPE_MS;
      const v = pick();
      this.fx(owner).swipe(v.x, v.y, Math.random() * TAU, GOD_SWIPE_R, turned);
      Sfx.playAt('space-slash', v.x, { rate: 0.7, volume: 0.9 });
      for (const t of victims) {
        if (this.dist(v.x, v.y, t.x, t.y) > GOD_SWIPE_R) continue;
        this.godHurt(owner, t, GOD_SWIPE_DAMAGE, turned, BND.goldLit);
      }
    }
    if (this.now >= s.nextLaserAt) {
      s.nextLaserAt = this.now + GOD_LASER_MS;
      for (let i = 0; i < 3; i++) {
        const v = pick();
        const off = (i - 1) * 46 + (Math.random() - 0.5) * 40;
        const x1 = Phaser.Math.Clamp(v.x + off, b.left, b.right);
        const y1 = v.y + (Math.random() - 0.5) * 30;
        const x0 = this.eyeX + (i - 1) * 34;
        this.sprays.push({ owner, x0, y0: EYE_Y + 20, x1, y1, until: this.now + 180, turned });
        for (const t of victims) {
          if (this.segDist(t.x, t.y, x0, EYE_Y + 20, x1, y1) > GOD_LASER_HIT_R) continue;
          this.godHurt(owner, t, GOD_LASER_DAMAGE, turned, BND.gold);
        }
      }
      Sfx.playAt('beam-fire', this.eyeX, { rate: 1.25, volume: 0.45 });
    }
    if (this.now >= s.nextBlastAt) {
      s.nextBlastAt = this.now + GOD_BLAST_MS;
      const v = pick();
      this.marks.push({
        owner,
        x: Phaser.Math.Clamp(v.x + (Math.random() - 0.5) * 90, b.left + 30, b.right - 30),
        y: Phaser.Math.Clamp(v.y + (Math.random() - 0.5) * 90, b.top + 30, b.bottom - 30),
        landsAt: this.now + GOD_BLAST_TELL_MS,
        turned,
      });
      Sfx.playAt('beam-charge', v.x, { rate: 0.5, volume: 0.7 });
    }
  }

  private updateShardsAndMarks(dt: number): void {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const sh = this.shards[i];
      if (this.now < sh.liveAt) continue;
      const d = this.dist(sh.x, sh.y, sh.tx, sh.ty);
      if (d <= GOD_SHARD_SPEED * dt + 4) {
        this.shards.splice(i, 1);
        this.fx(sh.owner).shardBurst(sh.tx, sh.ty, sh.turned);
        for (const t of this.godVictims(sh.owner, sh.turned)) {
          if (this.dist(sh.tx, sh.ty, t.x, t.y) > GOD_SHARD_BLAST_R) continue;
          this.godHurt(sh.owner, t, GOD_SHARD_DAMAGE, sh.turned, BND.gold);
        }
        continue;
      }
      sh.ang = Math.atan2(sh.ty - sh.y, sh.tx - sh.x);
      sh.x += Math.cos(sh.ang) * GOD_SHARD_SPEED * dt;
      sh.y += Math.sin(sh.ang) * GOD_SHARD_SPEED * dt;
    }
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      if (this.now < m.landsAt) continue;
      this.marks.splice(i, 1);
      this.fx(m.owner).darkBlast(m.x, m.y, GOD_BLAST_R);
      this.api.scene.cameras.main.shake(260, 0.009);
      Sfx.playAt('black-hole', m.x, { rate: 0.85, volume: 0.9 });
      for (const t of this.godVictims(m.owner, m.turned)) {
        if (this.dist(m.x, m.y, t.x, t.y) > GOD_BLAST_R) continue;
        this.godHurt(m.owner, t, GOD_BLAST_DAMAGE, m.turned, BND.iris);
      }
    }
    for (let i = this.sprays.length - 1; i >= 0; i--) {
      if (this.now >= this.sprays[i].until) this.sprays.splice(i, 1);
    }
  }

  // ── Mastery: False Idol ────────────────────────────────────────────────────

  private tryIdol(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    if (this.now < s.idolReadyAt) { this.deny(owner, '⛓ THE IDOL IS NOT READY'); return; }
    if (!this.canAct(f) || Date.now() < f.silencedUntil) return;
    this.ensureLayers();
    const p = this.clampIn(tx, ty, 50);
    this.placeIdol(owner, p.x, p.y);
    s.idolReadyAt = this.now + IDOL_COOLDOWN;
    this.relay(owner, `bind-fidol:${Math.round(p.x)}:${Math.round(p.y)}`);
  }

  private placeIdol(owner: Owner, x: number, y: number): void {
    const s = this.side(owner);
    // A soul left standing at the old idol goes home to its owner.
    for (const so of this.souls) if (so.boundTo === owner && so.onIdol) so.onIdol = false;
    s.idol = { x, y, favour: 0, lastHeldAt: this.now, nextZapAt: 0 };
    this.fx(owner).cultistRise(x, y);
    Sfx.playAt('holy-chord', x, { rate: 0.6, volume: 0.9 });
    if (owner === 'player') this.announce(x, y - 54, 'FALSE IDOL', BND.goldLit, 12);
  }

  private inIdol(owner: Owner): boolean {
    const idol = this.side(owner).idol;
    const f = this.fighter(owner);
    return !!idol && this.alive(f) && this.dist(f.x, f.y, idol.x, idol.y + 18) <= IDOL_R;
  }

  private updateIdols(dt: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const idol = s.idol;
      if (!idol) continue;
      if (!this.masteryOn(owner)) { s.idol = null; continue; }
      const held = this.inIdol(owner) || this.souls.some((so) => so.boundTo === owner && so.onIdol);
      if (held) {
        idol.favour = Math.min(1, idol.favour + dt / IDOL_FAVOUR_S);
        idol.lastHeldAt = this.now;
      } else {
        idol.favour = Math.max(0, idol.favour - dt / IDOL_FADE_S);
        if (this.now - idol.lastHeldAt > IDOL_PATIENCE_MS && this.now >= idol.nextZapAt) {
          idol.nextZapAt = this.now + IDOL_ZAP_MS;
          const f = this.fighter(owner);
          if (this.alive(f)) {
            this.fx(owner).idolZap(idol.x, idol.y - 30, f.x, f.y);
            this.hurtSelf(owner, IDOL_ZAP_DAMAGE, BND.wrath);
            Sfx.playAt('zap', f.x, { rate: 0.9, volume: 0.5 });
          }
        }
      }
    }
  }

  // ── The curse, the bond and every multiplier this kit owns ─────────────────

  /**
   * The one writer for everything Bind puts on a body: the curse, the Permanent Bond (mastery)
   * that hands it to the enemy, a chain's cooldown penalty, the siphon's pay and the idol's
   * favour. Rewritten from scratch each frame.
   */
  private applyMultipliers(): void {
    type Acc = { inc: number; out: number; cd: number; spd: number };
    const acc = new Map<Fighter, Acc>();
    const get = (f: Fighter): Acc => {
      let a = acc.get(f);
      if (!a) { a = { inc: 1, out: 1, cd: 1, spd: 1 }; acc.set(f, a); }
      return a;
    };
    const curse = (f: Fighter, id: CurseId, k: number): void => {
      if (k <= 0.001) return;
      const a = get(f);
      const v = CURSE_MAX * k;
      if (id === 'shackled') a.spd *= 1 - v;
      else if (id === 'brittle') a.inc *= 1 + v;
      else if (id === 'feeble') a.out *= 1 - v;
      else a.cd *= 1 + v;
    };

    for (const owner of BOTH) {
      if (!this.isBind(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f) continue;
      if (s.curse) {
        const lifted = this.lifted(owner);
        curse(f, s.curse, lifted ? 0 : s.strength);
        // Permanent Bond: whatever the curse has lost — for good or for now — the enemy carries.
        if (this.masteryOn(owner)) {
          const given = (1 - s.strength) + (lifted ? s.strength : 0);
          for (const t of this.targetsOf(owner)) curse(t, s.curse, given);
        }
      }
      const a = get(f);
      a.out *= 1 + s.gain;
      a.spd *= 1 + s.speedGain;
      if (s.idol && this.inIdol(owner)) {
        const k = s.idol.favour;
        a.out *= 1 + IDOL_DMG * k;
        a.spd *= 1 + IDOL_SPEED * k;
        a.inc *= 1 - IDOL_ARMOUR * k;
      }
    }
    for (const t of this.tethers) {
      if (this.alive(t.victim)) get(t.victim).cd *= TETHER_CD_MULT;
    }

    const fighters = new Set<Fighter>([...this.allFighters(), ...this.appliedOut.keys()]);
    this.speedOf.clear();
    for (const f of fighters) {
      const a = acc.get(f) ?? { inc: 1, out: 1, cd: 1, spd: 1 };
      f.bindIncomingMult = a.inc;
      f.bindCooldownMult = a.cd;
      this.setOutgoing(f, a.out);
      if (a.spd !== 1) this.speedOf.set(f, a.spd);
    }
  }

  /** The soul-only body: hitbox shrunk to the inner soul, and nothing solid stops it. */
  private applySoulBodies(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f) continue;
      const want = f.active && this.isBind(owner) && this.eyesOpen(owner);
      if (want && !this.shrunk.has(f)) {
        f.hitboxMult *= SOUL_HITBOX;
        f.applySizeMult();
        this.shrunk.add(f);
      } else if (!want && this.shrunk.has(f)) {
        f.hitboxMult /= SOUL_HITBOX;
        if (f.active) f.applySizeMult();
        this.shrunk.delete(f);
      }
      f.soulWalking = want;
    }
    // Only the local player's own eyes turn the screen over.
    this.setInverted(this.isBind('player') && this.eyesOpen('player') && this.alive(this.api.player));
  }

  // ── Bot ────────────────────────────────────────────────────────────────────

  /**
   * The bot's hands for the things a rotation cannot press: the right click, the chain's
   * anchor, letting go of a siphon before a soul turns, and the idol.
   */
  private updateBot(): void {
    if (!this.isBind('npc') || !this.simulates('npc')) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    const foe = this.nearestTarget('npc', f.x, f.y);

    // Detonate when a dagger is about to pass a foe, or a wall is full of them near one.
    if (foe && this.now >= s.nextBotDetonateAt) {
      const mine = this.daggers.filter((d) => d.owner === 'npc' && !d.cult);
      const close = mine.some((d) => !d.stuckUntil && this.dist(d.x, d.y, foe.x, foe.y) < 70);
      const walls = mine.filter((d) => d.stuckUntil && this.dist(d.x, d.y, foe.x, foe.y) < 240).length;
      if (close || walls >= 2) {
        this.detonate('npc');
        s.nextBotDetonateAt = this.now + 1200;
      }
    }

    // Anchor the chain once the foe has been dragged away and the bot wants to leave.
    const main = this.tethers.find((t) => t.owner === 'npc' && t.main && !t.anchor);
    if (main && f.hp / f.maxHp < 0.5 && this.now > main.until - TETHER_MS + 1200) this.anchorChain('npc', main);

    // Let go of a soul before it turns — unless Trial by Faith can make something of a revenant.
    const so = s.siphonSoul >= 0 ? this.souls.find((x) => x.id === s.siphonSoul) : undefined;
    if (so && so.essence < 0.15 && !(this.up('npc', 'f') && this.revsOf('npc').length < REV_MAX && so.boundTo === null)) {
      this.stopSiphon('npc', false);
    }
    if (s.siphonSoul >= 0 && s.gain >= SIPHON_GAIN_MAX && so && so.boundTo === 'npc') this.stopSiphon('npc', false);

    // False Idol: planted at its feet in the fight, fed a soul when it has spare.
    const slot = this.idolSlot('npc');
    if (slot && this.now >= s.nextBotIdolAt) {
      s.nextBotIdolAt = this.now + 1500;
      if (foe && (!s.idol || this.dist(f.x, f.y, s.idol.x, s.idol.y) > 320) && this.now >= s.idolReadyAt) {
        this.tryIdol('npc', f.x, f.y - 10);
      } else if (s.idol && !this.inIdol('npc') && this.boundSouls('npc').length >= 3
        && !this.souls.some((x) => x.boundTo === 'npc' && x.onIdol)
        && this.dist(f.x, f.y, s.idol.x, s.idol.y) <= BIND_FEED_RANGE) {
        const give = this.boundSouls('npc').pop();
        if (give) { give.onIdol = true; this.fx('npc').soulBound(s.idol.x, s.idol.y, soulColor(give.kind)); }
      }
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isBind('player');
    const npcIs = this.isBind('npc');
    const anyState = this.daggers.length || this.frags.length || this.souls.length || this.revenants.length
      || this.cultists.length || this.tethers.length || this.shards.length || this.marks.length
      || this.appliedOut.size || this.shrunk.size || this.speedOf.size || this.inverted;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    for (const owner of BOTH) this.ensureCurse(owner);
    const dt = Math.min(delta, 50) / 1000;
    this.vizT += dt;

    this.updateSouls(dt);
    this.updateDaggers(dt);
    this.updateSiphons(dt);
    // Online, the far side stalks our revenants behind our synced facing — keep it current
    // (Silence owns it while we are Stalked).
    const me = this.api.player;
    if (this.api.isOnline && this.isBind('player') && Date.now() >= me.stalkedUntil) me.facingAngle = this.lookAngle('player');
    this.updateRevenants(dt);
    this.updateCultists(dt);
    this.updateIdols(dt);
    this.updateGods();
    this.updateShardsAndMarks(dt);
    this.updateBot();
    this.updateTethers();
    this.applySoulBodies();
    this.applyMultipliers();
    this.sendCurse('player');

    this.paintGround();
    this.paintAir();
    this.paintGod();
    this.paintHud();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /** Online: the curse is decided here and drawn (and partly applied) on the other sim too. */
  private sendCurse(owner: Owner): void {
    const s = this.side(owner);
    if (!s.curse || !this.api.isOnline) return;
    const lift = Math.max(0, Math.round(s.liftedUntil - this.now));
    const key = `${s.curse}:${Math.round(s.strength * 20)}:${lift > 0 ? 1 : 0}`;
    if (key === s.lastSentCurse) return;
    s.lastSentCurse = key;
    this.relay(owner, `bind-curse:${s.curse}:${Math.round(s.strength * 100)}:${lift}`);
  }

  // ── Online replay ──────────────────────────────────────────────────────────

  /** A pseudo-cast from the opponent's sim. Their x is seen from the other side of the arena. */
  replayNet(id: string): void {
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => Number(parts[i] ?? 0) || 0;
    const mx = (i: number): number => this.api.worldW - n(i);
    const s = this.sides.npc;
    const f = this.api.npc;
    const me = this.api.player;
    this.ensureLayers();
    this.ensureAvatars();
    if (head === 'bind-pop') {
      this.detonate('npc');
    } else if (head === 'bind-curse') {
      if (CURSE_IDS.includes(parts[1] as CurseId)) s.curse = parts[1] as CurseId;
      s.strength = Phaser.Math.Clamp(n(2) / 100, 0, 1);
      s.liftedUntil = n(3) > 0 ? this.now + n(3) : 0;
    } else if (head === 'bind-tether') {
      if (!this.alive(me)) return;
      const anchor = parts[3] === 'c' ? { x: mx(4), y: n(5) } : null;
      this.startTether('npc', me, anchor, n(1), n(2), parts[3] !== 'c');
    } else if (head === 'bind-anchor') {
      const t = this.tethers.find((x) => x.owner === 'npc' && x.main);
      if (t) t.anchor = { x: mx(1), y: n(2) };
    } else if (head === 'bind-souls') {
      s.ghostSouls = Phaser.Math.Clamp(Math.round(n(1)), 0, SOUL_BOUND_MAX);
    } else if (head === 'bind-siphoff') {
      s.ghostSiphon = false;
    } else if (head === 'bind-rev') {
      this.revenants.push({
        id: n(1), owner: 'npc', x: mx(2), y: n(3), ang: 0, state: 'stalk', stateUntil: 0,
        nextChargeAt: Infinity, dash: null, fury: 0, empowered: false, seed: Math.random() * 999,
      });
      this.nfx.revenantRise(mx(2), n(3));
    } else if (head === 'bind-revgone') {
      const i = this.revenants.findIndex((r) => r.owner === 'npc' && r.id === n(1));
      if (i >= 0) this.revenants.splice(i, 1);
    } else if (head === 'bind-rhold') {
      const r = this.revenants.find((x) => x.owner === 'npc' && x.id === n(1));
      if (r) { r.state = 'held'; r.stateUntil = Infinity; r.empowered = true; }
    } else if (head === 'bind-rdash') {
      const r = this.revenants.find((x) => x.owner === 'npc' && x.id === n(1));
      if (r) this.startDash(r, mx(2), n(3));
    } else if (head === 'bind-cult') {
      this.cultists.push({
        owner: 'npc', x: mx(1), y: n(2), until: this.now + CULT_FAITH_MS,
        nextThrowAt: this.now + 600, nextBindAt: Infinity, seed: Math.random() * 99,
      });
      this.nfx.cultistRise(mx(1), n(2));
    } else if (head === 'bind-ritual') {
      if (this.alive(f)) this.beginRitual('npc', Math.max(1, n(1)), n(2));
      for (const r of this.revenants.filter((x) => x.owner === 'npc').slice(0, n(2))) this.revenants.splice(this.revenants.indexOf(r), 1);
    } else if (head === 'bind-fidol') {
      this.placeIdol('npc', mx(1), n(2));
    } else if (head === 'bind-fsoul') {
      const so = this.souls.find((x) => x.ghost);
      if (so) { so.onIdol = true; s.ghostSouls = Math.max(0, s.ghostSouls - 1); so.ghost = false; }
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const idol = this.side(owner).idol;
      if (!idol) continue;
      const angry = this.now - idol.lastHeldAt > IDOL_PATIENCE_MS;
      faithRing(g, this.col(owner), idol.x, idol.y + 18, IDOL_R, 0.9, angry ? 1 : 1 - idol.favour, this.vizT);
    }
    for (const m of this.marks) {
      const k = Phaser.Math.Clamp(1 - (m.landsAt - this.now) / GOD_BLAST_TELL_MS, 0, 1);
      darkMark(g, this.col(m.owner), m.x, m.y, GOD_BLAST_R, 0.95, k, this.vizT);
    }
    // A revenant's wind-up: the line it is about to run, burning in.
    for (const r of this.revenants) {
      if (r.state !== 'charge') continue;
      const f = this.fighter(r.owner);
      if (!this.alive(f)) continue;
      const k = Phaser.Math.Clamp(1 - (r.stateUntil - this.now) / REV_CHARGE_MS, 0, 1);
      // The full width it will cut, run out past the target as far as the dash will carry.
      const tx = r.lockX ?? f.x;
      const ty = r.lockY ?? f.y;
      const a = Math.atan2(ty - r.y, tx - r.x);
      const ex = tx + Math.cos(a) * REV_OVERSHOOT;
      const ey = ty + Math.sin(a) * REV_OVERSHOOT;
      const locked = r.lockX !== undefined;
      g.lineStyle(REV_HIT_R * 2 * (0.3 + k * 0.7), this.col(r.owner)(BND.wrathDeep), (locked ? 0.3 : 0.14) + k * 0.15);
      g.lineBetween(r.x, r.y, ex, ey);
      g.lineStyle(locked ? 2.4 : 1.4, this.col(r.owner)(BND.rune), 0.4 + k * 0.5);
      g.lineBetween(r.x, r.y, ex, ey);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    // Chains first, so everything they hold sits on top of them.
    for (const th of this.tethers) {
      const caster = this.fighter(th.owner);
      if (!this.alive(th.victim)) continue;
      const ax = th.anchor ? th.anchor.x : caster.x;
      const ay = th.anchor ? th.anchor.y : caster.y;
      const pull = Phaser.Math.Clamp(this.dist(ax, ay, th.victim.x, th.victim.y) / th.len, 0, 1);
      chainRun(g, this.col(th.owner), ax, ay, th.victim.x, th.victim.y + 6, 0.92, pull, t, th.main ? 5 : 9);
      shackle(g, this.col(th.owner), th.victim.x, th.victim.y, this.bodyR(th.victim) * 0.9, 0.9, t);
      if (th.anchor) {
        g.fillStyle(this.col(th.owner)(BND.void), 0.8);
        g.fillCircle(ax, ay, 7);
        g.lineStyle(2, this.col(th.owner)(BND.chainLit), 0.9);
        g.strokeCircle(ax, ay, 7);
      }
    }

    // Siphon streams.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      let src: { x: number; y: number } | undefined;
      if (s.siphonSoul >= 0) src = this.souls.find((x) => x.id === s.siphonSoul);
      else if (s.siphonRev >= 0) src = this.revenants.find((x) => x.id === s.siphonRev);
      else if (s.ghostSiphon) src = this.souls.find((x) => x.ghost) ?? undefined;
      if (src) siphonStream(g, this.col(owner), src.x, src.y, f.x, f.y, 0.9, t, Math.min(1, s.gain / SIPHON_GAIN_MAX), s.siphonColor);
    }

    // Souls. A wild one is only drawn for a local player whose eyes are open.
    const seeWild = this.isBind('player') && this.eyesOpen('player');
    const showKinds = (owner: Owner | null): boolean => (owner ? this.up(owner, 'r') : this.up('player', 'r'));
    for (const so of this.souls) {
      const owner = so.boundTo;
      if (owner === null && !seeWild) {
        // Unless it is being siphoned in plain sight.
        if (this.side('player').siphonSoul !== so.id && this.side('npc').siphonSoul !== so.id) continue;
      }
      const tint = this.col(owner ?? 'player');
      lostSoul(g, tint, so.x, so.y, owner === null ? 0.85 : 0.95, {
        kind: showKinds(owner) ? so.kind : 'plain', t, seed: so.seed, ang: so.heading,
        essence: so.essence, bound: owner !== null && !so.onIdol,
      });
    }

    // Idols.
    for (const owner of BOTH) {
      const idol = this.side(owner).idol;
      if (!idol) continue;
      const angry = this.now - idol.lastHeldAt > IDOL_PATIENCE_MS;
      idolStatue(g, this.col(owner), idol.x, idol.y, 1, angry ? 0 : Math.ceil(idol.favour * 10), 10, t);
      favourBeads(g, this.col(owner), idol.x, idol.y + 18, 46, idol.favour, 0.9, t, angry);
    }

    // Cultists, with how much faith they have left.
    for (const c of [...this.cultists].sort((a, b) => a.y - b.y)) {
      cultistFigure(g, this.col(c.owner), c.x, c.y, 1, { awakened: true, t, seed: c.seed });
      const left = Phaser.Math.Clamp((c.until - this.now) / CULT_FAITH_MS, 0, 1);
      g.fillStyle(this.col(c.owner)(BND.void), 0.8);
      g.fillRect(c.x - 15, c.y - 36, 30, 4);
      g.fillStyle(this.col(c.owner)(left < 0.3 ? BND.wrath : BND.goldLit), 0.95);
      g.fillRect(c.x - 14, c.y - 35, 28 * left, 2);
    }

    // Revenants.
    for (const r of this.revenants) {
      const charge = r.state === 'charge' ? Phaser.Math.Clamp(1 - (r.stateUntil - this.now) / REV_CHARGE_MS, 0, 1)
        : r.state === 'dash' ? 1 : 0;
      revenant(g, this.col(r.owner), r.x, r.y, 0.97, {
        t, seed: r.seed, ang: r.ang, charge, fury: r.fury, frozen: r.state === 'held' ? 1 : 0, scale: REV_SCALE,
      });
    }

    // Daggers and their shrapnel.
    for (const d of this.daggers) {
      const stuck = d.stuckUntil ? Phaser.Math.Clamp(1 - (d.nextSprayAt - this.now) / STUCK_SPRAY_MS, 0, 1) : 0;
      chainDagger(g, this.col(d.owner), d.x, d.y, d.ang, d.stuckUntil ? 0.92 : 1,
        { t, seed: d.seed, stacks: d.stacks, stuck, scale: d.cult ? 0.8 : 1 });
    }
    for (const fr of this.frags) {
      chainShard(g, this.col(fr.owner), fr.x, fr.y, fr.ang, 0.95, 1, fr.soul);
    }

    // The god's shards.
    for (const sh of this.shards) {
      if (this.now < sh.liveAt) continue;
      oblivionShard(g, this.col(sh.owner), sh.x, sh.y, sh.ang, 1, { scale: 1, eye: 1, turned: sh.turned });
    }

    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.isBind(owner)) continue;
      const s = this.side(owner);
      if (s.ward) hexWard(g, this.col(owner), f.x, f.y, 34, 0.9, s.ward.charges, t);
      // Walking soul-only: the small inner soul is all that can be hit, so it is drawn.
      if (this.eyesOpen(owner)) soulCore(g, this.col(owner), f.x, f.y, 5, 0.95, t);
    }

    // Inspirit (Click+): while a soul-lit dagger is out, the foe's soul glows for it.
    const lit = this.daggers.some((d) => d.owner === 'player' && d.stacks > 0 && !d.stuckUntil);
    if (lit) for (const tg of this.targetsOf('player')) soulCore(g, this.pcol, tg.x, tg.y, 3.4, 0.85, t);
  }

  private paintGod(): void {
    const g = this.godGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const awake = this.godAwake(owner);
      const turned = this.turned(owner);
      if (!awake && !turned) continue;
      const tint = this.col(owner);
      // It arrives and leaves rather than snapping in and out.
      const total = turned ? Math.max(1, s.wrathUntil - this.now) : s.godUntil - this.now;
      const fade = Phaser.Math.Clamp(Math.min(total / 600, (this.now - (s.godUntil - s.godMs)) / 600), 0, 1);
      const a = turned ? 1 : Math.max(0.15, fade);
      cosmicVeil(g, tint, this.eyeX, EYE_Y - 6, 420, 150, 0.95 * a, t);
      patronEye(g, tint, this.eyeX, EYE_Y, 46, 0.9 * a + 0.1, a,
        { wrath: turned ? 1 : 0, drift: Math.sin(t * 0.7) + (turned ? Math.sin(t * 11) : 0), t });
    }
    for (const sp of this.sprays) {
      const a = Phaser.Math.Clamp((sp.until - this.now) / 180, 0, 1);
      const tint = this.col(sp.owner);
      g.lineStyle(9, tint(BND.cosmic), a * 0.25);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.lineStyle(3.4, tint(sp.turned ? BND.wrath : BND.gold), a * 0.9);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.lineStyle(1.2, tint(BND.goldLit), a);
      g.lineBetween(sp.x0, sp.y0, sp.x1, sp.y1);
      g.fillStyle(tint(sp.turned ? BND.wrath : BND.goldLit), a * 0.6);
      g.fillCircle(sp.x1, sp.y1, 9 * a + 2);
    }

    const pg = this.promptGfx;
    if (pg) {
      pg.clear();
      if (this.prompt) {
        tithePlaque(pg, this.pcol, this.prompt.x, this.prompt.y,
          this.prompt.width + 92, this.prompt.height + 16, this.promptReady, t);
        this.prompt.setColor(this.hex(this.promptReady ? BND.goldLit : BND.gold));
      }
    }
  }

  /** Bound: the curse, printed at the top of the screen for whoever is carrying it. */
  private paintHud(): void {
    const { scene } = this.api;
    const mine = this.isBind('player') && this.sides.player.curse;
    const theirs = this.isBind('npc') && this.sides.npc.curse;
    if (!mine && !theirs) {
      this.hudGfx?.clear();
      this.hudText?.setVisible(false);
      this.hudFoeText?.setVisible(false);
      return;
    }
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setScrollFactor(0).setDepth(29);
    const g = this.hudGfx;
    g.clear();
    const cx = scene.scale.width / 2;
    const line = (owner: Owner): string => {
      const s = this.side(owner);
      const c = CURSES[s.curse!];
      const pct = Math.round(CURSE_MAX * s.strength * 100);
      if (this.lifted(owner)) return `${c.emoji} ${c.name.toUpperCase()} · LIFTED`;
      return `${c.emoji} BOUND · ${c.name.toUpperCase()} · ${pct}% ${c.what}`;
    };
    if (mine) {
      if (!this.hudText) {
        this.hudText = scene.add.text(cx + 8, 20, '', {
          fontFamily: FONT_DISPLAY, fontSize: '12px', color: this.hex(BND.goldLit),
          stroke: '#080415', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
      }
      this.hudText.setVisible(true).setText(line('player'));
      const s = this.sides.player;
      boundPlaque(g, this.pcol, cx, 22, this.hudText.width + 64, 30, s.strength, this.lifted('player') ? 1 : 0, this.vizT);
      this.hudText.setColor(this.hex(this.lifted('player') ? BND.goldLit : BND.chainLit));
    } else {
      this.hudText?.setVisible(false);
    }
    if (theirs) {
      if (!this.hudFoeText) {
        this.hudFoeText = scene.add.text(cx, 0, '', {
          fontFamily: FONT_DISPLAY, fontSize: '10px', color: this.hex(BND.chainLit),
          stroke: '#080415', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
      }
      const y = mine ? 50 : 20;
      this.hudFoeText.setVisible(true).setY(y).setText(`FOE · ${line('npc')}`);
      boundPlaque(g, this.ncol, cx, y + 2, this.hudFoeText.width + 50, 22, this.sides.npc.strength, this.lifted('npc') ? 1 : 0, this.vizT);
    } else {
      this.hudFoeText?.setVisible(false);
    }
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      // The halo strains with the curse, and runs red while the god is turned on you.
      av.setStrain(this.turned(owner) ? 1 : (this.lifted(owner) ? 0 : s.strength * 0.6));
      av.setChannelling(this.godAwake(owner) || this.siphoning(owner));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);

    set('bind-curse', playerIs && s.curse ? {
      name: `Bound: ${CURSES[s.curse].name}`, emoji: CURSES[s.curse].emoji, color: BND.rune, priority: 4,
      description: `Born under a curse: ${Math.round(CURSE_MAX * s.strength * 100)}% ${CURSES[s.curse].what}. Every second spent siphoning a soul wears it down for good, and the god can lift it for a while.`,
      count: Math.round(s.strength * 100), suffix: '%',
    } : null);
    set('bind-lifted', playerIs && this.lifted('player') ? {
      name: 'Unbound', emoji: '🔓', color: BND.goldLit, priority: 3,
      description: 'The god has taken the curse off you for now.',
      until: s.liftedUntil,
    } : null);
    const souls = this.boundSouls('player').length;
    set('bind-souls', playerIs && souls > 0 ? {
      name: 'Bound Souls', emoji: '👻', color: BND.soul, priority: 130,
      description: 'Souls on your chain. Siphon (F) drinks them; the Ritual (Q) is paid in them — 3 lifts your curse, 5 brings the god for its full twelve seconds.',
      count: souls, suffix: `/${SOUL_BOUND_MAX}`,
    } : null);
    set('bind-siphon', playerIs && (this.siphoning('player') || s.gain > 0) ? {
      name: 'Siphon', emoji: '🩸', color: BND.goldLit, priority: 131,
      description: `+${Math.round(s.gain * 100)}% damage${s.speedGain > 0 ? ` and +${Math.round(s.speedGain * 100)}% speed` : ''} from drinking a soul.${this.siphoning('player') ? ' Press F to stop.' : ''}`,
      count: Math.round(s.gain * 100), suffix: '%',
      until: this.siphoning('player') ? undefined : s.gainUntil,
    } : null);
    set('bind-eyes', playerIs && this.eyesOpen('player') ? {
      name: 'Blackened Eyes', emoji: '👁️', color: BND.soul, priority: 132,
      description: 'You can see the lost souls. Your body is only its small inner soul — much harder to hit — and nothing solid stops you.',
      until: s.eyesUntil,
    } : null);
    set('bind-ward', playerIs && s.ward ? {
      name: "Prophet's Protection", emoji: '✦', color: BND.goldLit, priority: 133,
      description: 'Hexes that eat the next hits whole, however large.',
      count: s.ward.charges,
    } : null);
    set('bind-god', playerIs && this.godAwake('player') ? {
      name: 'The God Answers', emoji: '🌌', color: BND.iris, priority: 134,
      description: 'Shard volleys, claw swipes, lasers and beams of dark light, all on the enemy.',
      until: s.godUntil,
    } : null);
    set('bind-wrath', playerIs && this.turned('player') ? {
      name: 'Wrathful God', emoji: '⛓️', color: BND.wrath, priority: 1,
      description: 'The revenants you burned have angered it. Everything it does lands on you until it calms.',
      until: s.wrathUntil,
    } : null);
    const revs = this.revsOf('player').length;
    set('bind-revenants', playerIs && revs > 0 ? {
      name: 'Revenants', emoji: '😡', color: BND.rune, priority: 5,
      description: 'Souls you drained dry. They keep their distance, wind up, and dash at you — keep walking. Anyone in the way takes far worse.',
      count: revs, suffix: `/${REV_MAX}`,
    } : null);
    const cult = this.cultOf('player').length;
    set('bind-cult', playerIs && cult > 0 ? {
      name: 'Cultists', emoji: '🕯️', color: BND.goldLit, priority: 135,
      description: 'Revenants brought to faith. They throw daggers and chain the enemy until their faith runs out — bind a soul to one (E) to give it more.',
      count: cult,
    } : null);
    const idol = s.idol;
    set('bind-idol', playerIs && idol ? {
      name: 'False Idol', emoji: '🗿', color: BND.gold, priority: 136,
      description: this.inIdol('player')
        ? `+${Math.round(IDOL_DMG * idol.favour * 100)}% damage, +${Math.round(IDOL_SPEED * idol.favour * 100)}% speed, ${Math.round(IDOL_ARMOUR * idol.favour * 100)}% less damage taken while you stand in its ring.`
        : 'Leave it alone too long and it starts burning you. Bind a soul to it (E) to stand there for you.',
      count: Math.round(idol.favour * 100), suffix: '%',
    } : null);
    const held = this.tethers.find((th) => th.victim === this.api.player && th.owner === 'npc');
    set('bind-chained', held ? {
      name: 'Chained', emoji: '⛓️', color: BND.chainLit, priority: 6,
      description: 'You cannot get far from the end of the chain, and your cooldowns are 20% longer.',
      until: held.until,
    } : null);
    const npcS = this.sides.npc;
    const bonded = this.isBind('npc') && this.masteryOn('npc') && npcS.curse
      ? (1 - npcS.strength) + (this.lifted('npc') ? npcS.strength : 0) : 0;
    set('bind-bond', bonded > 0.01 && npcS.curse ? {
      name: `Permanent Bond: ${CURSES[npcS.curse].name}`, emoji: CURSES[npcS.curse].emoji, color: BND.rune, priority: 7,
      description: `The curse your enemy shed has landed on you: ${Math.round(CURSE_MAX * bonded * 100)}% ${CURSES[npcS.curse].what}.`,
      count: Math.round(bonded * 100), suffix: '%',
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ─────────────────────────

  getBarRatio(abilityId: string, time: number): number {
    void time;
    if (abilityId === IDOL_ID) {
      const s = this.sides.player;
      return Phaser.Math.Clamp(1 - (s.idolReadyAt - this.now) / IDOL_COOLDOWN, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const bound = this.souls.filter((so) => so.boundTo === owner);
    const take = Math.ceil(bound.length * 0.4);
    if (take <= 0) return null;
    // The newest followers forget whose they were and wander off.
    for (const so of bound.slice(-take)) { so.boundTo = null; so.onIdol = false; }
    return `−${take} SOUL${take === 1 ? '' : 'S'}`;
  }

  getPlayerSpeedMult(): number {
    return this.speedOf.get(this.api.player) ?? 1;
  }

  getNpcSpeedMult(): number {
    return this.speedOf.get(this.api.npc) ?? 1;
  }

  /** Bot: the slot False Idol took, so the rotation leaves that key alone. */
  npcIdolSlot(): 'r' | 'f' | 'q' | null {
    return this.idolSlot('npc');
  }

  npcEyesOpen(): boolean { return this.eyesOpen('npc'); }
  npcSiphoning(): boolean { return this.siphoning('npc'); }
  npcSoulCount(): number { return this.boundSouls('npc').length; }
  /** Souls (or, with Wrathful God, revenants too) the ritual would be paid with. */
  npcOffering(): number { return this.offeringSize('npc'); }
  npcRevenants(): number { return this.revsOf('npc').length; }

  /**
   * Bot: a wild soul worth walking to while its eyes are open — the nearest one, while the chain
   * has room. Null otherwise, which hands movement back to the normal state machine.
   */
  npcSoulSeek(): { x: number; y: number } | null {
    if (!this.isBind('npc') || !this.eyesOpen('npc')) return null;
    if (this.boundSouls('npc').length >= SOUL_BOUND_MAX) return null;
    const f = this.api.npc;
    if (!this.alive(f)) return null;
    let best: Soul | null = null;
    let bestD = Infinity;
    for (const so of this.souls) {
      if (so.boundTo !== null || so.ghost) continue;
      const d = this.dist(f.x, f.y, so.x, so.y);
      if (d < bestD) { bestD = d; best = so; }
    }
    if (!best || bestD < BIND_SOUL_RANGE * 0.6) return null;
    return { x: best.x, y: best.y };
  }

  /**
   * Bot: where to aim E, in priority order — a wild soul in reach (eyes open), a revenant that
   * would run *through* the foe on its way back (E+), a cultist to feed, else the foe itself.
   */
  npcBindAim(): { x: number; y: number } | null {
    if (!this.isBind('npc')) return null;
    const f = this.api.npc;
    if (!this.alive(f)) return null;
    for (const so of this.souls) {
      if (so.boundTo !== null || !this.visibleTo(so, 'npc')) continue;
      if (this.boundSouls('npc').length >= SOUL_BOUND_MAX) break;
      if (this.dist(f.x, f.y, so.x, so.y) <= BIND_SOUL_RANGE) return { x: so.x, y: so.y };
    }
    const foe = this.nearestTarget('npc', f.x, f.y);
    if (this.up('npc', 'e') && foe) {
      for (const r of this.revsOf('npc')) {
        if (r.state === 'held' || r.state === 'dash') continue;
        if (this.dist(f.x, f.y, r.x, r.y) > BIND_REV_RANGE) continue;
        // The foe sits on the line from the revenant back to us.
        if (this.segDist(foe.x, foe.y, r.x, r.y, f.x, f.y) < 50) return { x: r.x, y: r.y };
      }
    }
    if (this.boundSouls('npc').length > 0) {
      for (const c of this.cultOf('npc')) {
        if (c.until - this.now < 5000 && this.dist(f.x, f.y, c.x, c.y) <= BIND_FEED_RANGE) return { x: c.x, y: c.y };
      }
    }
    if (foe && this.dist(f.x, f.y, foe.x, foe.y) <= BIND_FOE_RANGE + this.bodyR(foe)) return { x: foe.x, y: foe.y };
    return null;
  }

  /**
   * Bot: what to drink. A revenant first when Trial by Faith can turn it; a wild soul while the
   * eyes are open; a bound soul only when there are plenty to spare for the ritual.
   */
  npcSiphonAim(): { x: number; y: number } | null {
    if (!this.isBind('npc') || this.siphoning('npc')) return null;
    const f = this.api.npc;
    if (!this.alive(f)) return null;
    if (this.up('npc', 'f') && this.cultOf('npc').length < CULT_MAX) {
      const r = this.revsOf('npc').find((x) => this.dist(f.x, f.y, x.x, x.y) <= SIPHON_RANGE);
      if (r) return { x: r.x, y: r.y };
    }
    for (const so of this.souls) {
      if (so.boundTo !== null || !this.visibleTo(so, 'npc')) continue;
      if (this.dist(f.x, f.y, so.x, so.y) <= SIPHON_RANGE) return { x: so.x, y: so.y };
    }
    const mine = this.boundSouls('npc');
    if (mine.length >= 5) return { x: mine[0].x, y: mine[0].y };
    return null;
  }
}
