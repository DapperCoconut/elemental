import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  Pt, STRING, StringAvatar, StringColorFn, StringFx, cocoon, hitKnot, controlBar, hexRope, hookTip,
  pointAlong, polyLength, puppetRig, ropeLine, silkLine, spiderBody, tombBar, wallTack,
} from './StringVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

const ID = {
  click: 'string-snag',
  e: 'string-spider-dance',
  r: 'string-hexing-strand',
  f: 'string-marionette',
  q: 'string-linen-tomb',
};

// ── Click: Tension Snag ──────────────────────────────────────────────────────
const HOOK_SPEED = 1250;
const HOOK_R = 9;
/** A hook that has flown this far without finding anything drops. Longer than the arena is wide. */
const HOOK_RANGE = 1300;
const HOOK_DMG = 6;
const MAX_SNAGS = 5;
const STRING_MS = 12000;
/** A tied enemy gets this much rope beyond the distance it was caught at. */
const TIE_SLACK = 12;
const TIE_MIN = 90;
const TIE_MAX = 560;
/** How hard the rope hauls a body back inside its length, px/s per px over, and its ceiling. */
const LEASH_K = 6;
const LEASH_MAX_PULL = 620;
/** Half the thickness a body meets when it walks into a string. */
const STRING_HALF = 5;
const PUSH_K = 10;
/** Pushing (or pulling) adds the body's speed into the string to its strain; past this it snaps. */
const SNAP_STRAIN = 260;
/** A single push this fast (a dash, a charge, a thrown body) snaps it on the spot. */
const HARD_PUSH = 640;
const STRAIN_DECAY = 160;
const SNAP_DMG = 16;
/** Shots crossing this close to the spider (or to a tied body) are theirs, not the string's. */
const NEAR_END = 0.08;

// ── Rope physics (looks only — gameplay reads the straight chord) ────────────
const NODES = 12;
const GRAVITY = 110;
const DAMP = 0.96;
const ITER = 6;

// ── E: Spider Dance ──────────────────────────────────────────────────────────
const SPIDER_COUNT = 5;
const SPIDER_MS = 8000;
const SPIDER_SPEED = 150;
/** How big the spiders are drawn; their bite reach grows with them. */
const SPIDER_SCALE = 3.15;
const SPIDER_R = 36;
const SPIDER_DMG = 8;
const SPIDER_GATE_MS = 550;
const LOOSE_SPEED = 230;
const LOOSE_MS = 3000;

// ── R: Hexing Strand ─────────────────────────────────────────────────────────
const HEX_SPEED = 1050;
const HEX_MS = 10000;
const HEX_SHOTS = 3;
/** Brushing it slows to `Fighter.stringSlowMult`'s hexed rate for this long after the last touch. */
const HEX_TOUCH_MS = 700;
const HEX_TOUCH_BAND = 8;
const HEX_SNAP_DMG = 22;
/** Caught in the snap: this close to the cord, or tied to it. */
const HEX_SNAP_BAND = 40;
const HEX_SNARE_MS = 3500;

// ── F: Marionette ────────────────────────────────────────────────────────────
const BAR_SPEED = 760;
const BAR_RANGE = 560;
const BAR_R = 24;
const BAR_DMG = 8;
const PUPPET_MS = 5000;
const STEER_SPEED = 290;

// ── Q: Linen Tomb ────────────────────────────────────────────────────────────
const TOMB_HP = 100;
/** A safety on the silk: however patient they are, they are let out after this. */
const TOMB_MAX_MS = 12000;
const TOMB_R = 22;
/** What one of their casts takes out of the silk, by key. */
const TOMB_CAST_HIT: Record<string, number> = { Click: 10, E: 20, R: 20, F: 20, Q: 35 };
/** Damage per px of movement they attempt while wrapped — walking costs ~11/s, a dash far more. */
const TOMB_TEAR_PER_PX = 0.05;
const TOMB_TICK_MS = 250;
/** Moving slower than this is not trying. */
const TOMB_MOVE_MIN = 25;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_HEX_RANGE = 640;
const NPC_HEX_MIN_AGE_MS = 900;
const NPC_STEER_ARRIVE = 14;

// ── Types ────────────────────────────────────────────────────────────────────

type StrandKind = 'snag' | 'hex' | 'tomb';

interface Node { x: number; y: number; px: number; py: number }

interface Strand {
  id: number;
  owner: Owner;
  kind: StrandKind;
  /** The body the far end is hooked into, or null for a wall (or a tomb corner). */
  tied: Fighter | null;
  /** Where on that body the hook bit, from its centre — the string pulls from that spot. */
  ox: number;
  oy: number;
  ax: number;
  ay: number;
  /** A tied string's rope: how far the body may go before it pulls. */
  len: number;
  dies: number;
  strain: number;
  /** Hexing Strand: shots it has eaten. */
  shots: number;
  born: number;
  nodes: Node[];
  seed: number;
}

interface Hook {
  owner: Owner;
  kind: 'snag' | 'hex';
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  /** Online: a picture of the other machine's throw. Where it lands arrives as `string-tie`. */
  visual: boolean;
}

interface Bar {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  spin: number;
  visual: boolean;
}

interface Spider {
  owner: Owner;
  strand: Strand | null;
  /** Distance along the strand's rope, px from the start end. */
  d: number;
  dir: number;
  x: number;
  y: number;
  ang: number;
  phase: number;
  until: number;
  /** Set when its string goes: it runs wild until this, then is gone. */
  looseUntil: number;
  vx: number;
  vy: number;
  nextTurn: number;
  gate: Map<Fighter, number>;
  visual: boolean;
}

interface Puppet { owner: Owner; until: number }

interface Tomb {
  owner: Owner;
  victim: Fighter;
  x: number;
  y: number;
  hp: number;
  until: number;
  /** Damage owed for movement attempts, paid out on the tick. */
  carry: number;
  nextTick: number;
  hook: ((abilityId: string) => void) | null;
  strands: Strand[];
  shake: number;
}

interface Side {
  aimX: number;
  aimY: number;
  steerX: number;
  steerY: number;
  sentSteer: string;
  nextId: number;
  tomb: Tomb | null;
}

function makeSide(): Side {
  return { aimX: 0, aimY: 0, steerX: 0, steerY: 0, sentSteer: '0:0', nextId: 1, tomb: null };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface HuskShotView {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  from: Fighter | null;
  kill: () => void;
}

export interface StringArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  /** The shared physics group — strings catch enemy shots out of it. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local projectiles that never enter the shared group. */
  get projectileRegistry(): ProjectileRegistry;
  /** Invasion: the husks' own shots, which live in neither of the two above. Empty elsewhere. */
  huskShots(): HuskShotView[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** Marionette: the arrow keys walk the puppet. */
  get upKey(): Phaser.Input.Keyboard.Key;
  get downKey(): Phaser.Input.Keyboard.Key;
  get leftKey(): Phaser.Input.Keyboard.Key;
  get rightKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** Mirror an x across the arena — positions online are seen from the other side. */
  get worldW(): number;
  isTargetable(f: Fighter): boolean;
  stringColor(owner: Owner, base: number): number;
  /** Skins: the equipped skin id for that side, or null. */
  skinId(owner: Owner): string | null;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only one sim decides as a pseudo-cast. */
  broadcast(id: string): void;
}

// ── StringKit ────────────────────────────────────────────────────────────────

/**
 * String — the spider that weaves the arena shut.
 *
 * - **Tension Snag** — a heavy string to the cursor that hooks the first enemy (tying them on a
 *   rope, from the spot it struck) or the wall, and stays tied to the spider for 12s, up to five. Enemy bodies cannot
 *   pass a string: pushing on one, or pulling against the rope they are tied to, builds strain,
 *   and past it the string snaps and lashes whoever broke it. An enemy shot crossing one snaps it
 *   too, and lashes the shooter.
 * - **Spider Dance** — five spiders walk every strand back and forth, biting what they touch; a
 *   spider whose strand goes runs wild.
 * - **Hexing Strand** — one thick purple strand that bodies pass through but that slows them; three
 *   shots snap it, and so does recasting R, which snares everyone caught in it.
 * - **Marionette** — a control bar that makes its victim a puppet for 5s: the arrow keys walk them.
 * - **Linen Tomb** — the victim is wrapped in silk in the middle of the arena on four guy-lines
 *   (strands the spiders can walk). Only their own casts cut the silk; until it goes they cannot
 *   move or hurt the spider, and straining to move tears at them.
 *
 * Online, a hit is settled on the machine that owns the thing doing the hitting, and a body is
 * moved only by the machine that owns the body. So the spider's sim decides where a string
 * lands (`string-tie`), when a shot snaps it (`string-snap`), what the puppet's arrows say
 * (`string-steer`) and the tomb (`string-tomb` / `string-untomb`); the victim's sim leashes,
 * blocks and pins its own body against those strings and reports a string it broke by force
 * (`string-yank`), which the spider's sim then snaps — and lashes — for real.
 */
export class StringKit {
  private api: StringArenaApi;

  private readonly pcol: StringColorFn;
  private readonly ncol: StringColorFn;
  private readonly pfx: StringFx;
  private readonly nfx: StringFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Tacks in the walls, and the knots on bodies. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The strings, the hooks and the spiders — over the bodies they are tied to. */
  private ropeGfx: Phaser.GameObjects.Graphics | null = null;
  /** The cocoon and the puppet's bar — over everything else this kit draws. */
  private topGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private strands: Strand[] = [];
  private hooks: Hook[] = [];
  private bars: Bar[] = [];
  private spiders: Spider[] = [];
  private puppets = new Map<Fighter, Puppet>();
  /** Everything this kit has written a status onto, so `reset` can hand it back clean. */
  private touched = new Set<Fighter>();

  constructor(api: StringArenaApi) {
    this.api = api;
    this.pcol = (base) => api.stringColor('player', base);
    this.ncol = (base) => api.stringColor('npc', base);
    this.pfx = new StringFx(api.scene, this.pcol);
    this.nfx = new StringFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): StringFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): StringColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): BaseAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private rig(owner: Owner): StringAvatar | null {
    const av = this.avatar(owner);
    return av instanceof StringAvatar ? av : null;
  }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
  private mx(x: number): number { return this.api.worldW - x; }

  private isString(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'string' : this.api.npcElementId === 'string';
  }

  /** An online opponent (or a co-op ally in the npc slot) is simulated on its own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  /** Whether this sim decides what this side's strings, spiders and bars do. */
  private simulates(owner: Owner): boolean {
    return !this.isReplica(owner);
  }

  /** Online, the other player's body is moved on their machine; here it is only watched. */
  private isRemoteBody(f: Fighter): boolean {
    return f === this.api.npc && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /**
   * The bodies this machine moves against this side's strings: our own enemies, unless they are a
   * replica — and, for the other machine's strings, our own body.
   */
  private bodiesAgainst(owner: Owner): Fighter[] {
    if (this.isReplica(owner)) {
      const me = this.api.player;
      return this.alive(me) ? [me] : [];
    }
    return this.targetsOf(owner).filter((f) => !this.isRemoteBody(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number, max = Infinity): Fighter | null {
    let best: Fighter | null = null;
    let bestD = max;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
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

  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline && !this.api.isInvasion) this.api.broadcast(id);
  }

  /** The victim's half: our own body broke the other machine's string. */
  private relayAsVictim(id: string): void {
    if (this.api.isOnline && !this.api.isInvasion) this.api.broadcast(id);
  }

  private canAct(f: Fighter, slot: 'click' | 'other'): boolean {
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil) return false;
    if (slot !== 'click' && wall < f.silencedUntil) return false;
    return true;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /** `showFloatingText` is a no-op in this codebase, so the labels that matter are the kit's own. */
  private announce(x: number, y: number, text: string, color: number, size = 12): void {
    const { scene } = this.api;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: this.hex(color),
      stroke: '#1a1410', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** One hit from this element, settled on this sim. Never self-inflicted, so shields may answer it. */
  private hurt(owner: Owner, victim: Fighter, amount: number): void {
    if (!this.alive(victim) || amount <= 0) return;
    const src = this.fighter(owner);
    Fighter.asNonAllyDamage(() => victim.takeDamage(Math.max(1, Math.round(amount)),
      { source: src, sourceX: src?.x, sourceY: src?.y }));
  }

  /** Distance from p to segment ab, and how far along it (0..1) the nearest point is. */
  private segNear(ax: number, ay: number, bx: number, by: number, px: number, py: number): { d: number; u: number; x: number; y: number } {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    const x = ax + dx * u;
    const y = ay + dy * u;
    return { d: Math.hypot(px - x, py - y), u, x, y };
  }

  /** Do segments p0p1 and q0q1 cross? Returns how far along q (0..1), or -1. */
  private crossAt(p0: Pt, p1: Pt, q0: Pt, q1: Pt): number {
    const rx = p1.x - p0.x, ry = p1.y - p0.y;
    const sx = q1.x - q0.x, sy = q1.y - q0.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-6) return -1;
    const qpx = q0.x - p0.x, qpy = q0.y - p0.y;
    const t = (qpx * sy - qpy * sx) / den;
    const u = (qpx * ry - qpy * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1;
  }

  /** Where a hook that left the arena bites the wall. */
  private wallPoint(x: number, y: number): Pt {
    const b = this.api.bounds;
    return { x: Phaser.Math.Clamp(x, b.left + 2, b.right - 2), y: Phaser.Math.Clamp(y, b.top + 2, b.bottom - 2) };
  }

  // ── Strands ────────────────────────────────────────────────────────────────

  private aliveSpider(owner: Owner): boolean { return this.alive(this.fighter(owner)); }

  /** The spider's end: the hand, a touch above the body's middle. A guy-line starts at the tomb. */
  private startOf(s: Strand): Pt {
    if (s.kind === 'tomb') {
      const tb = this.side(s.owner).tomb;
      return tb ? { x: tb.x, y: tb.y } : { x: s.ax, y: s.ay };
    }
    const f = this.fighter(s.owner);
    return f ? { x: f.x, y: f.y - 4 } : { x: s.ax, y: s.ay };
  }

  private endOf(s: Strand): Pt {
    if (s.tied) return { x: s.tied.x + s.ox, y: s.tied.y + s.oy };
    return { x: s.ax, y: s.ay };
  }

  private makeNodes(a: Pt, b: Pt): Node[] {
    const out: Node[] = [];
    for (let i = 0; i < NODES; i++) {
      const k = i / (NODES - 1);
      const x = a.x + (b.x - a.x) * k;
      const y = a.y + (b.y - a.y) * k;
      out.push({ x, y, px: x, py: y });
    }
    return out;
  }

  private strandsOf(owner: Owner, kind?: StrandKind): Strand[] {
    return this.strands.filter((s) => s.owner === owner && (!kind || s.kind === kind));
  }

  private hexOf(owner: Owner): Strand | null {
    return this.strands.find((s) => s.owner === owner && s.kind === 'hex') ?? null;
  }

  /** Tie a new strand off. The owner's sim calls this; the other machine hears it as `string-tie`. */
  private tie(
    owner: Owner, kind: 'snag' | 'hex', tied: Fighter | null, ax: number, ay: number, id?: number, ox = 0, oy = 0,
  ): Strand | null {
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    const side = this.side(owner);
    // One hex strand at a time; five ordinary ones, oldest let go first.
    if (kind === 'hex') {
      const old = this.hexOf(owner);
      if (old) this.removeStrand(old);
    } else {
      const mine = this.strandsOf(owner, 'snag');
      while (mine.length >= MAX_SNAGS) {
        const old = mine.shift();
        if (!old) break;
        this.removeStrand(old);
        if (this.simulates(owner)) this.relay(owner, `string-snap:${old.id}:0`);
      }
    }
    const start = { x: f.x, y: f.y - 4 };
    const end = tied ? { x: tied.x + ox, y: tied.y + oy } : { x: ax, y: ay };
    const chord = Math.hypot(end.x - start.x, end.y - start.y);
    const s: Strand = {
      id: id ?? side.nextId++, owner, kind, tied, ox: tied ? ox : 0, oy: tied ? oy : 0, ax, ay,
      len: Phaser.Math.Clamp(chord + TIE_SLACK, TIE_MIN, TIE_MAX),
      dies: this.now + (kind === 'hex' ? HEX_MS : STRING_MS),
      strain: 0, shots: 0, born: this.now, nodes: this.makeNodes(start, end), seed: Math.random() * 999,
    };
    this.strands.push(s);
    this.fx(owner).bite(end.x, end.y, !tied, kind === 'hex');
    Sfx.playAt(tied ? 'grapple' : 'nail', end.x, { rate: kind === 'hex' ? 0.8 : 1.3, volume: 0.6 });
    if (tied && tied.active) {
      this.announce(tied.x, tied.y - 40, kind === 'hex' ? '🟣 HEXED' : '🧵 TIED', kind === 'hex' ? STRING.hexGlow : STRING.silk, 11);
    }
    if (this.simulates(owner) && owner === 'player' && this.api.isOnline) {
      const onThem = tied === this.api.npc ? 1 : 0;
      this.relay(owner, `string-tie:${s.id}:${kind === 'hex' ? 1 : 0}:${onThem}:${Math.round(this.mx(ax))}:${Math.round(ay)}:${Math.round(s.len)}:${Math.round(-s.ox)}:${Math.round(s.oy)}`);
    }
    return s;
  }

  /** Take a strand away, with no snap. Spiders on it are left to run. */
  private removeStrand(s: Strand): void {
    const i = this.strands.indexOf(s);
    if (i < 0) return;
    this.strands.splice(i, 1);
    for (const sp of this.spiders) {
      if (sp.strand === s) this.loosen(sp);
    }
  }

  /**
   * A string snaps. On the owner's sim this is the lash: `breaker` takes the hit. A hex strand
   * instead snares everyone caught in it. The other machine hears `string-snap` (or, for our
   * own body breaking their string, the victim side sends `string-yank` and lets them decide).
   */
  private snap(s: Strand, breaker: Fighter | null, bx: number, by: number): void {
    if (!this.strands.includes(s)) return;
    const a = this.startOf(s);
    const b = this.endOf(s);
    if (s.kind === 'hex') {
      this.hexBurst(s);
    } else {
      this.fx(s.owner).snap(a.x, a.y, b.x, b.y, bx, by, false);
      Sfx.playAt('whip', bx, { rate: 1.2, volume: 0.85 });
      Sfx.playAt('snap-back', bx, { rate: 1.1, volume: 0.6 });
      if (this.simulates(s.owner) && breaker && this.alive(breaker)) {
        this.hurt(s.owner, breaker, SNAP_DMG);
        this.fx(s.owner).lash(breaker.x, breaker.y);
        this.announce(breaker.x, breaker.y - 42, '💥 SNAP', STRING.snap, 12);
      }
    }
    this.removeStrand(s);
    if (this.simulates(s.owner)) this.relay(s.owner, `string-snap:${s.id}:1`);
  }

  /** The hex strand goes: everyone caught takes the hit and the heavy slow. */
  private hexBurst(s: Strand): void {
    const a = this.startOf(s);
    const b = this.endOf(s);
    this.fx(s.owner).hexSnap(s.nodes.map((n) => ({ x: n.x, y: n.y })), HEX_SNAP_BAND);
    Sfx.playAt('curse-cast', (a.x + b.x) / 2, { rate: 0.75, volume: 0.9 });
    Sfx.playAt('whip', (a.x + b.x) / 2, { rate: 0.7, volume: 0.8 });
    if (!this.simulates(s.owner)) return;
    for (const t of this.targetsOf(s.owner)) {
      const near = this.segNear(a.x, a.y, b.x, b.y, t.x, t.y);
      if (s.tied !== t && near.d > HEX_SNAP_BAND + this.bodyR(t)) continue;
      this.hurt(s.owner, t, HEX_SNAP_DMG);
      t.stringSnareUntil = Math.max(t.stringSnareUntil, Date.now() + HEX_SNARE_MS);
      this.touched.add(t);
      this.fx(s.owner).snared(t.x, t.y, this.bodyR(t));
      this.announce(t.x, t.y - 44, '🕸️ SNARED', STRING.hexGlow, 12);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const owner of BOTH) this.unhookTomb(this.sides[owner].tomb);
    for (const f of [...this.touched, ...this.allFighters()]) {
      if (!f) continue;
      f.stringHexUntil = 0;
      f.stringSnareUntil = 0;
      f.stringPuppetUntil = 0;
      f.stringTombedUntil = 0;
      f.stringWardFrom = null;
      f.stringWardAll = false;
      f.onStringWardHit = null;
    }
    this.touched.clear();
    this.sides = { player: makeSide(), npc: makeSide() };
    this.strands = [];
    this.hooks = [];
    this.bars = [];
    this.spiders = [];
    this.puppets.clear();
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.ropeGfx, this.topGfx]) g?.destroy();
    this.groundGfx = this.ropeGfx = this.topGfx = null;
    for (const id of ['string-hex-out', 'string-spider', 'string-tomb-hold', 'string-spiders']) this.api.setStatusIndicator(id, null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4.5);
    if (!this.ropeGfx) this.ropeGfx = scene.add.graphics().setDepth(9);
    if (!this.topGfx) this.topGfx = scene.add.graphics().setDepth(9.6);
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene) ?? new StringAvatar(this.api.scene, this.col(owner));
  }

  private ensureAvatars(): void {
    if (this.isString('player') && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (!this.isString('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isString('npc') && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'string') return;
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    // Marionette: the arrow keys. Read every frame; `updateSteering` tells the other machine on a change.
    s.steerX = (this.api.rightKey.isDown ? 1 : 0) - (this.api.leftKey.isDown ? 1 : 0);
    s.steerY = (this.api.downKey.isDown ? 1 : 0) - (this.api.upKey.isDown ? 1 : 0);
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    if (!this.alive(p)) return;

    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);
    if (left && this.canAct(p, 'click')) p.castAbility(ID.click, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility(ID.e, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      // R again while the hex strand is out snaps it — free, the cooldown already ran from the throw.
      const hx = this.hexOf('player');
      if (hx) {
        if (this.canAct(p, 'other')) this.snap(hx, null, (this.startOf(hx).x + this.endOf(hx).x) / 2, (this.startOf(hx).y + this.endOf(hx).y) / 2);
      } else {
        p.castAbility(ID.r, ctx());
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility(ID.f, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility(ID.q, ctx());
  }

  /**
   * Online: what the other machine decided. `tie`, `snap`, `steer`, `puppet`, `tomb` and `untomb`
   * are about *their* strings and land on our body or our picture of them; `yank` is our own
   * string, broken on their machine by their body, which our sim now snaps for real.
   */
  replayNet(id: string): void {
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    this.ensureLayers();
    this.ensureAvatars();
    const me = this.api.player;
    const them = this.api.npc;
    switch (head) {
      case 'string-tie': {
        if (!this.alive(them)) break;
        // Their throw's picture already flew; this is where it actually landed.
        this.hooks = this.hooks.filter((h) => !(h.owner === 'npc' && h.kind === (n(2) === 1 ? 'hex' : 'snag')));
        const s = this.tie('npc', n(2) === 1 ? 'hex' : 'snag', n(3) === 1 ? me : null, this.mx(n(4)), n(5), n(1), n(7), n(8));
        if (s) s.len = n(6) || s.len;
        break;
      }
      case 'string-snap': {
        const s = this.strands.find((x) => x.owner === 'npc' && x.id === n(1));
        if (!s) break;
        if (n(2) === 1) {
          const b = this.endOf(s);
          this.snap(s, null, b.x, b.y);
        } else {
          this.removeStrand(s);
        }
        break;
      }
      case 'string-yank': {
        const s = this.strands.find((x) => x.owner === 'player' && x.id === n(1));
        if (s) this.snap(s, this.alive(them) ? them : null, them.x, them.y);
        break;
      }
      case 'string-steer':
        this.sides.npc.steerX = Math.sign(n(1));
        this.sides.npc.steerY = Math.sign(n(2));
        break;
      case 'string-puppet':
        if (this.alive(me)) this.makePuppet('npc', me);
        break;
      case 'string-tomb':
        if (this.alive(me)) this.entomb('npc', me, this.mx(n(1)), n(2));
        break;
      case 'string-untomb':
        this.breakTomb('npc');
        break;
      default:
        break;
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Tension Snag. One heavy string, hook first. */
  doSnag(owner: Owner, tx: number, ty: number): void {
    this.throwHook(owner, 'snag', tx, ty);
  }

  /** R — Hexing Strand. The purple one. */
  doHex(owner: Owner, tx: number, ty: number): void {
    this.throwHook(owner, 'hex', tx, ty);
  }

  private throwHook(owner: Owner, kind: 'snag' | 'hex', tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const sp = kind === 'hex' ? HEX_SPEED : HOOK_SPEED;
    const x = f.x + Math.cos(ang) * 18;
    const y = f.y - 4 + Math.sin(ang) * 18;
    this.hooks.push({ owner, kind, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, travelled: 0, visual: !this.simulates(owner) });
    this.fx(owner).throwString(x, y, ang, kind === 'hex');
    this.avatar(owner)?.play('punch', ang);
    this.rig(owner)?.jerk(ang);
  }

  /** E — Spider Dance. Five spiders onto whatever strands this side has out. */
  doSpiders(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const list = this.strandsOf(owner);
    if (!list.length) {
      // Nothing to walk on: the spiders stay in their box, and the cooldown is handed back.
      if (this.simulates(owner)) this.refund(f, ID.e);
      if (owner === 'player') this.announce(f.x, f.y - 50, 'NO STRINGS', STRING.silkShade, 11);
      return;
    }
    const perStrand = new Map<Strand, number>();
    for (let i = 0; i < SPIDER_COUNT; i++) {
      const s = list[i % list.length];
      perStrand.set(s, (perStrand.get(s) ?? 0) + 1);
    }
    let i = 0;
    for (const [s, count] of perStrand) {
      const L = polyLength(s.nodes);
      for (let k = 0; k < count; k++) {
        const d = L * ((k + 1) / (count + 1));
        const p = pointAlong(s.nodes, d);
        this.spiders.push({
          owner, strand: s, d, dir: (i + k) % 2 ? 1 : -1, x: p.x, y: p.y, ang: p.ang, phase: Math.random() * TAU,
          until: this.now + SPIDER_MS, looseUntil: 0, vx: 0, vy: 0, nextTurn: 0, gate: new Map(),
          visual: !this.simulates(owner),
        });
        this.fx(owner).spiderDrop(p.x, p.y);
      }
      i++;
    }
    this.avatar(owner)?.play('flex');
    Sfx.playAt('tentacle', f.x, { rate: 1.6, volume: 0.6 });
  }

  /** F — Marionette. The control bar goes down the aim. */
  doMarionette(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.bars.push({
      owner, x: f.x + Math.cos(ang) * 20, y: f.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * BAR_SPEED, vy: Math.sin(ang) * BAR_SPEED, travelled: 0, spin: 0,
      visual: !this.simulates(owner),
    });
    this.avatar(owner)?.play('sweep', ang);
    this.rig(owner)?.jerk(ang);
  }

  /** Q — Linen Tomb. The enemy nearest the cursor (a bot's: its target) goes into the silk. */
  doTomb(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.avatar(owner)?.play('raise', -Math.PI / 2, 700);
    // Online, the other machine picks the victim and tells us (`string-tomb`).
    if (!this.simulates(owner)) return;
    const t = owner === 'player' ? this.nearestTarget(owner, tx, ty) : this.nearestTarget(owner, f.x, f.y);
    if (!t) { this.refund(f, ID.q); return; }
    const b = this.api.bounds;
    this.entomb(owner, t, b.centerX, b.centerY);
  }

  // ── Hooks ──────────────────────────────────────────────────────────────────

  private updateHooks(dt: number): void {
    const b = this.api.bounds;
    for (let i = this.hooks.length - 1; i >= 0; i--) {
      const h = this.hooks[i];
      const stepX = h.vx * dt;
      const stepY = h.vy * dt;
      h.x += stepX;
      h.y += stepY;
      h.travelled += Math.hypot(stepX, stepY);
      let done = false;
      if (!this.aliveSpider(h.owner)) done = true;
      if (!done) {
        for (const t of this.targetsOf(h.owner)) {
          if (Phaser.Math.Distance.Between(h.x, h.y, t.x, t.y) > HOOK_R + this.bodyR(t)) continue;
          done = true;
          if (!h.visual) {
            if (h.kind === 'snag') this.hurt(h.owner, t, HOOK_DMG);
            // The hook bites the skin where it struck, not the middle of the body.
            const a = Math.atan2(h.y - t.y, h.x - t.x);
            const r = this.bodyR(t) * 0.9;
            this.tie(h.owner, h.kind, t, t.x, t.y, undefined, Math.cos(a) * r, Math.sin(a) * r);
          }
          break;
        }
      }
      if (!done && !b.contains(h.x, h.y)) {
        done = true;
        if (!h.visual) {
          const w = this.wallPoint(h.x, h.y);
          this.tie(h.owner, h.kind, null, w.x, w.y);
        }
      }
      if (!done && h.travelled > HOOK_RANGE) done = true;
      if (done) this.hooks.splice(i, 1);
    }
  }

  // ── Rope physics ───────────────────────────────────────────────────────────

  /**
   * The rope's look: verlet nodes pinned at both ends, sagging under a little gravity, and bowed out
   * of any body pressing on them. A tied string reels out to its full rope; the others hang just
   * slack between their ends.
   */
  private stepRope(s: Strand, dt: number, bodies: Fighter[]): void {
    const a = this.startOf(s);
    const b = this.endOf(s);
    const chord = Math.hypot(b.x - a.x, b.y - a.y);
    // Taut: a tied string only gives a few px of play before its rope runs out, the rest none.
    const rest = s.tied && s.kind !== 'tomb' ? Math.min(Math.max(chord, s.len), chord * 1.02 + 2) : chord * 1.003 + 0.5;
    const seg = rest / (NODES - 1);
    const nodes = s.nodes;
    const g = GRAVITY * dt * dt * (s.kind === 'hex' ? 1.4 : 1);
    for (let i = 1; i < NODES - 1; i++) {
      const nd = nodes[i];
      const vx = (nd.x - nd.px) * DAMP;
      const vy = (nd.y - nd.py) * DAMP;
      nd.px = nd.x;
      nd.py = nd.y;
      nd.x += vx;
      nd.y += vy + g;
    }
    for (let it = 0; it < ITER; it++) {
      nodes[0].x = a.x; nodes[0].y = a.y;
      nodes[NODES - 1].x = b.x; nodes[NODES - 1].y = b.y;
      for (let i = 0; i < NODES - 1; i++) {
        const p = nodes[i];
        const q = nodes[i + 1];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const diff = (d - seg) / d;
        const pinP = i === 0;
        const pinQ = i + 1 === NODES - 1;
        if (pinP && pinQ) continue;
        const kp = pinP ? 0 : pinQ ? 1 : 0.5;
        const kq = pinQ ? 0 : pinP ? 1 : 0.5;
        p.x += dx * diff * kp; p.y += dy * diff * kp;
        q.x -= dx * diff * kq; q.y -= dy * diff * kq;
      }
      // A body leaning on the rope bends it round itself.
      if (s.kind !== 'hex') {
        for (const f of bodies) {
          if (f === s.tied) continue;
          const r = this.bodyR(f) + 2;
          for (let i = 1; i < NODES - 1; i++) {
            const nd = nodes[i];
            const dx = nd.x - f.x;
            const dy = nd.y - f.y;
            const d = Math.hypot(dx, dy);
            if (d >= r || d < 1e-3) continue;
            nd.x = f.x + (dx / d) * r;
            nd.y = f.y + (dy / d) * r;
          }
        }
      }
    }
    nodes[0].x = a.x; nodes[0].y = a.y;
    nodes[NODES - 1].x = b.x; nodes[NODES - 1].y = b.y;
  }

  // ── Bodies against strings ─────────────────────────────────────────────────

  /**
   * Leash and fence. A body tied to a string is held inside its rope; any other enemy body is held
   * on its own side of every string. Either way the effort it spends against the string is strain,
   * and enough strain snaps it — on the body's own machine, which tells the owner if it is not it.
   */
  private updateContacts(dt: number): void {
    for (const s of [...this.strands]) {
      if (s.kind !== 'snag') continue;
      let loaded = false;
      let breaker: Fighter | null = null;
      const a = this.startOf(s);
      const b = this.endOf(s);
      for (const f of this.bodiesAgainst(s.owner)) {
        const body = f.body as Phaser.Physics.Arcade.Body | null;
        if (!body) continue;
        let vx = body.velocity.x;
        let vy = body.velocity.y;
        let touched = false;
        if (s.tied === f) {
          const dx = f.x + s.ox - a.x;
          const dy = f.y + s.oy - a.y;
          const d = Math.hypot(dx, dy);
          if (d > s.len && d > 1e-3) {
            const ux = dx / d;
            const uy = dy / d;
            const out = vx * ux + vy * uy;
            if (out > 0) {
              s.strain += out * dt;
              if (out > HARD_PUSH) s.strain = SNAP_STRAIN;
              vx -= ux * out;
              vy -= uy * out;
            }
            const pull = Math.min(LEASH_MAX_PULL, (d - s.len) * LEASH_K);
            vx -= ux * pull;
            vy -= uy * pull;
            touched = true;
          }
        } else {
          const r = this.bodyR(f) + STRING_HALF;
          const near = this.segNear(a.x, a.y, b.x, b.y, f.x, f.y);
          if (near.d < r && near.u > NEAR_END && near.u < 1 - (s.tied ? NEAR_END : 0.02)) {
            // Which side of the string the body is on; on the line itself, the side it came from.
            let nx = f.x - near.x;
            let ny = f.y - near.y;
            let nl = Math.hypot(nx, ny);
            if (nl < 0.5) {
              const sx = b.x - a.x;
              const sy = b.y - a.y;
              const sl = Math.hypot(sx, sy) || 1;
              nx = -sy / sl; ny = sx / sl;
              if (nx * vx + ny * vy > 0) { nx = -nx; ny = -ny; }
              nl = 1;
            }
            nx /= nl; ny /= nl;
            const into = -(vx * nx + vy * ny);
            if (into > 0) {
              s.strain += into * dt;
              if (into > HARD_PUSH) s.strain = SNAP_STRAIN;
              vx += nx * into;
              vy += ny * into;
            }
            vx += nx * (r - near.d) * PUSH_K;
            vy += ny * (r - near.d) * PUSH_K;
            touched = true;
          }
        }
        if (touched) {
          body.setVelocity(vx, vy);
          loaded = true;
          if (s.strain >= SNAP_STRAIN) { breaker = f; break; }
        }
      }
      if (breaker) {
        if (this.isReplica(s.owner)) {
          // Our body broke their string. Their sim lashes us; ours just lets go of it.
          this.relayAsVictim(`string-yank:${s.id}`);
          const a2 = this.startOf(s);
          const b2 = this.endOf(s);
          this.fx(s.owner).snap(a2.x, a2.y, b2.x, b2.y, breaker.x, breaker.y);
          Sfx.playAt('whip', breaker.x, { rate: 1.2, volume: 0.85 });
          this.removeStrand(s);
        } else {
          this.snap(s, breaker, breaker.x, breaker.y);
        }
        continue;
      }
      if (!loaded) s.strain = Math.max(0, s.strain - STRAIN_DECAY * dt);
    }
  }

  /** The hex strand: whatever brushes it is slowed. Settled on the owner's sim, replicas included. */
  private updateHexTouch(): void {
    const wall = Date.now();
    for (const s of this.strands) {
      if (s.kind !== 'hex' || !this.simulates(s.owner)) continue;
      const a = this.startOf(s);
      const b = this.endOf(s);
      for (const t of this.targetsOf(s.owner)) {
        const near = this.segNear(a.x, a.y, b.x, b.y, t.x, t.y);
        if (s.tied !== t && (near.d > this.bodyR(t) + HEX_TOUCH_BAND || near.u < NEAR_END)) continue;
        t.stringHexUntil = Math.max(t.stringHexUntil, wall + HEX_TOUCH_MS);
        this.touched.add(t);
      }
    }
  }

  /**
   * Shots against strings. A shot crossing a string snaps it (a hex strand takes three). This
   * machine judges the shots it can see: the owner's sim every enemy shot, the victim's sim its
   * own shots against the other machine's strings (and tells them).
   */
  private updateShots(dt: number): void {
    for (const s of [...this.strands]) {
      if (s.kind === 'tomb') continue;
      const a = this.startOf(s);
      const b = this.endOf(s);
      const enemySide: Owner = s.owner === 'player' ? 'npc' : 'player';
      const caught: { x: number; y: number; kill: () => void; from?: Fighter | null }[] = [];
      for (const obj of this.api.projectiles.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal || p.isFromPlayer !== (enemySide === 'player')) continue;
        const pb = p.body as Phaser.Physics.Arcade.Body | null;
        const prev = { x: p.x - (pb?.velocity.x ?? 0) * dt, y: p.y - (pb?.velocity.y ?? 0) * dt };
        let u = this.crossAt(prev, { x: p.x, y: p.y }, a, b);
        if (u < 0) {
          const near = this.segNear(a.x, a.y, b.x, b.y, p.x, p.y);
          if (near.d < 8) u = near.u;
        }
        if (u < NEAR_END || (s.tied && u > 1 - NEAR_END * 1.25)) continue;
        caught.push({ x: p.x, y: p.y, kill: () => p.destroy() });
        if (s.kind !== 'hex') break;
      }
      // Invasion: the husks' shots are the director's, not the arena's.
      if (s.owner === 'player' && (s.kind === 'hex' || !caught.length)) {
        for (const h of this.api.huskShots()) {
          let u = this.crossAt({ x: h.x - h.vx * dt, y: h.y - h.vy * dt }, { x: h.x, y: h.y }, a, b);
          if (u < 0) {
            const near = this.segNear(a.x, a.y, b.x, b.y, h.x, h.y);
            if (near.d < 8) u = near.u;
          }
          if (u < NEAR_END || (s.tied && u > 1 - NEAR_END * 1.25)) continue;
          caught.push({ x: h.x, y: h.y, kill: h.kill, from: h.from });
          if (s.kind !== 'hex') break;
        }
      }
      if (s.kind === 'hex' || !caught.length) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const half = Math.hypot(b.x - a.x, b.y - a.y) / 2 + 12;
        for (const r of this.api.projectileRegistry.within(enemySide, mid.x, mid.y, half)) {
          const near = this.segNear(a.x, a.y, b.x, b.y, r.getX(), r.getY());
          if (near.d > 10 || near.u < NEAR_END || (s.tied && near.u > 1 - NEAR_END * 1.25)) continue;
          caught.push({ x: r.getX(), y: r.getY(), kill: () => this.api.projectileRegistry.steal(r) });
          if (s.kind !== 'hex') break;
        }
      }
      if (!caught.length) continue;
      if (s.kind === 'hex') {
        for (const c of caught) {
          c.kill();
          s.shots++;
          this.fx(s.owner).bite(c.x, c.y, false, true);
          Sfx.playAt('stretch', c.x, { rate: 0.7, volume: 0.6 });
          if (s.shots >= HEX_SHOTS) break;
        }
        if (s.shots < HEX_SHOTS) continue;
      } else {
        caught[0].kill();
      }
      const at = caught[0];
      if (this.isReplica(s.owner)) {
        this.relayAsVictim(`string-yank:${s.id}`);
        this.fx(s.owner).snap(a.x, a.y, b.x, b.y, at.x, at.y, s.kind === 'hex');
        this.removeStrand(s);
      } else {
        this.snap(s, at.from ?? this.shooterNear(s.owner, at.x, at.y), at.x, at.y);
      }
    }
  }

  /** Who fired a shot: in a duel the one opponent; among husks, the nearest one to it. */
  private shooterNear(owner: Owner, x: number, y: number): Fighter | null {
    if (!this.api.isInvasion || owner === 'npc') return this.targetsOf(owner)[0] ?? null;
    return this.nearestTarget(owner, x, y);
  }

  private updateExpiry(): void {
    for (const s of [...this.strands]) {
      if (s.kind === 'tomb') continue;
      const gone = this.now > s.dies || !this.aliveSpider(s.owner) || (s.tied && !this.alive(s.tied));
      if (gone) this.removeStrand(s);
    }
  }

  // ── Spiders ────────────────────────────────────────────────────────────────

  private loosen(sp: Spider): void {
    if (!sp.strand) return;
    sp.strand = null;
    sp.looseUntil = this.now + LOOSE_MS;
    sp.nextTurn = 0;
  }

  private updateSpiders(dt: number): void {
    const b = this.api.bounds;
    for (let i = this.spiders.length - 1; i >= 0; i--) {
      const sp = this.spiders[i];
      if (sp.strand) {
        if (this.now > sp.until) { this.spiders.splice(i, 1); this.fx(sp.owner).spiderDrop(sp.x, sp.y); continue; }
        const L = polyLength(sp.strand.nodes);
        sp.d += sp.dir * SPIDER_SPEED * dt;
        if (sp.d > L - 6) { sp.d = L - 6; sp.dir = -1; }
        if (sp.d < 6) { sp.d = 6; sp.dir = 1; }
        const p = pointAlong(sp.strand.nodes, sp.d);
        sp.x = p.x;
        sp.y = p.y;
        sp.ang = p.ang + (sp.dir < 0 ? Math.PI : 0);
        sp.phase += dt * 14;
      } else {
        if (this.now > sp.looseUntil) { this.spiders.splice(i, 1); continue; }
        if (this.now >= sp.nextTurn) {
          const a = Math.random() * TAU;
          const v = LOOSE_SPEED * (0.6 + Math.random() * 0.7);
          sp.vx = Math.cos(a) * v;
          sp.vy = Math.sin(a) * v;
          sp.nextTurn = this.now + 120 + Math.random() * 200;
        }
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        if (sp.x < b.left + 30 || sp.x > b.right - 30) { sp.vx = -sp.vx; sp.x = Phaser.Math.Clamp(sp.x, b.left + 30, b.right - 30); }
        if (sp.y < b.top + 30 || sp.y > b.bottom - 30) { sp.vy = -sp.vy; sp.y = Phaser.Math.Clamp(sp.y, b.top + 30, b.bottom - 30); }
        sp.ang = Math.atan2(sp.vy, sp.vx);
        sp.phase += dt * 24;
      }
      if (sp.visual) continue;
      for (const t of this.targetsOf(sp.owner)) {
        if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > SPIDER_R + this.bodyR(t)) continue;
        if (this.now < (sp.gate.get(t) ?? 0)) continue;
        sp.gate.set(t, this.now + SPIDER_GATE_MS);
        this.hurt(sp.owner, t, SPIDER_DMG);
        this.fx(sp.owner).spiderBite(t.x, t.y - 6);
        Sfx.playAt('stab', t.x, { rate: 1.6, volume: 0.45 });
      }
    }
  }

  // ── Marionette ─────────────────────────────────────────────────────────────

  private updateBars(dt: number): void {
    const b = this.api.bounds;
    for (let i = this.bars.length - 1; i >= 0; i--) {
      const bar = this.bars[i];
      const stepX = bar.vx * dt;
      const stepY = bar.vy * dt;
      bar.x += stepX;
      bar.y += stepY;
      bar.spin += dt * 14;
      bar.travelled += Math.hypot(stepX, stepY);
      let done = bar.travelled > BAR_RANGE || !b.contains(bar.x, bar.y);
      if (!done) {
        for (const t of this.targetsOf(bar.owner)) {
          if (Phaser.Math.Distance.Between(bar.x, bar.y, t.x, t.y) > BAR_R + this.bodyR(t)) continue;
          done = true;
          if (!bar.visual) {
            this.hurt(bar.owner, t, BAR_DMG);
            this.makePuppet(bar.owner, t);
          }
          break;
        }
      }
      if (done) {
        this.bars.splice(i, 1);
        this.fx(bar.owner).bite(bar.x, bar.y, true);
      }
    }
  }

  private makePuppet(owner: Owner, victim: Fighter): void {
    this.puppets.set(victim, { owner, until: this.now + PUPPET_MS });
    victim.stringPuppetUntil = Date.now() + PUPPET_MS;
    this.touched.add(victim);
    this.fx(owner).barHit(victim.x, victim.y, this.bodyR(victim));
    this.announce(victim.x, victim.y - 46, '🎎 PUPPET', STRING.woodLit, 12);
    Sfx.playAt('clang', victim.x, { rate: 1.6, volume: 0.6 });
    Sfx.playAt('stretch', victim.x, { rate: 1.1, volume: 0.6 });
    if (this.simulates(owner) && victim === this.api.npc) {
      this.relay(owner, 'string-puppet');
      this.side(owner).sentSteer = '';
    }
  }

  private spidering(owner: Owner): boolean {
    for (const p of this.puppets.values()) if (p.owner === owner) return true;
    return false;
  }

  /**
   * Marionette's steering. While the arrow keys are held the puppet goes where they point, whatever
   * it was doing; let go and its feet are its own. The bot walks its puppet into its own spiders, its
   * strings (to snap them over it) or its hex strand.
   */
  private updateSteering(): void {
    const ps = this.sides.player;
    if (this.spidering('player')) {
      const key = `${ps.steerX}:${ps.steerY}`;
      if (key !== ps.sentSteer) {
        ps.sentSteer = key;
        this.relay('player', `string-steer:${-ps.steerX}:${ps.steerY}`);
      }
    } else {
      ps.sentSteer = '';
    }
    for (const [victim, p] of [...this.puppets]) {
      if (this.now > p.until || !this.alive(victim)) {
        this.puppets.delete(victim);
        victim.stringPuppetUntil = 0;
        continue;
      }
      // A body pinned in the silk is not walking anywhere.
      if (Date.now() < victim.stringTombedUntil) continue;
      let sx = 0;
      let sy = 0;
      const s = this.side(p.owner);
      if (p.owner === 'player' || this.isReplica(p.owner)) {
        if (this.isReplica(p.owner) && victim !== this.api.player) continue;
        sx = s.steerX; sy = s.steerY;
      } else {
        const goal = this.botSteerGoal(victim);
        if (!goal) continue;
        const dx = goal.x - victim.x;
        const dy = goal.y - victim.y;
        if (Math.hypot(dx, dy) < NPC_STEER_ARRIVE) continue;
        sx = dx; sy = dy;
      }
      const m = Math.hypot(sx, sy);
      if (m < 0.01 || this.isRemoteBody(victim)) continue;
      (victim.body as Phaser.Physics.Arcade.Body).setVelocity((sx / m) * STEER_SPEED, (sy / m) * STEER_SPEED);
    }
  }

  /**
   * Where the bot walks its puppet: onto the nearest of its spiders, else through the nearest of
   * its strings (the push snaps it over them), else into its hex strand, else in front of itself.
   */
  private botSteerGoal(victim: Fighter): Pt | null {
    const bot = this.api.npc;
    if (!this.alive(bot)) return null;
    let best: Pt | null = null;
    let bestD = Infinity;
    for (const sp of this.spiders) {
      if (sp.owner !== 'npc') continue;
      const d = Phaser.Math.Distance.Between(victim.x, victim.y, sp.x, sp.y);
      if (d < bestD) { bestD = d; best = { x: sp.x, y: sp.y }; }
    }
    if (best) return best;
    for (const s of this.strandsOf('npc')) {
      if (s.kind === 'tomb' || s.tied === victim) continue;
      const a = this.startOf(s);
      const b = this.endOf(s);
      const near = this.segNear(a.x, a.y, b.x, b.y, victim.x, victim.y);
      if (near.u < 0.15 || near.u > 0.9) continue;
      if (near.d < bestD) {
        bestD = near.d;
        // Aim past the line, so the puppet leans into it rather than stopping short.
        const nx = near.x - victim.x;
        const ny = near.y - victim.y;
        const nl = Math.hypot(nx, ny) || 1;
        best = { x: near.x + (nx / nl) * 40, y: near.y + (ny / nl) * 40 };
      }
    }
    if (best) return best;
    return { x: bot.x + Math.cos(Math.atan2(victim.y - bot.y, victim.x - bot.x)) * 90, y: bot.y };
  }

  // ── Linen Tomb ─────────────────────────────────────────────────────────────

  private entomb(owner: Owner, victim: Fighter, cx: number, cy: number): void {
    this.breakTomb(owner, true);
    const side = this.side(owner);
    const b = this.api.bounds;
    if (!this.isRemoteBody(victim)) (victim.body as Phaser.Physics.Arcade.Body).reset(cx, cy);
    const tomb: Tomb = {
      owner, victim, x: cx, y: cy, hp: TOMB_HP, until: this.now + TOMB_MAX_MS, carry: 0,
      nextTick: this.now + TOMB_TICK_MS, hook: null, strands: [], shake: 0,
    };
    // Four guy-lines to the corners. Not snappable, but walkable: the spiders use them.
    for (const [ax, ay] of [[b.left + 4, b.top + 4], [b.right - 4, b.top + 4], [b.left + 4, b.bottom - 4], [b.right - 4, b.bottom - 4]]) {
      const s: Strand = {
        id: -1, owner, kind: 'tomb', tied: null, ox: 0, oy: 0, ax, ay, len: 0, dies: Infinity, strain: 0, shots: 0,
        born: this.now, nodes: this.makeNodes({ x: cx, y: cy }, { x: ax, y: ay }), seed: Math.random() * 999,
      };
      tomb.strands.push(s);
      this.strands.push(s);
    }
    // Every cast from inside the silk is a cut at it.
    tomb.hook = (abilityId: string) => {
      const ab = victim.element.abilities.find((a) => a.id === abilityId);
      const cut = TOMB_CAST_HIT[ab?.displayKey ?? 'Click'] ?? 20;
      this.cutTomb(tomb, cut);
    };
    victim.on('cast', tomb.hook);
    side.tomb = tomb;
    victim.stringTombedUntil = Date.now() + TOMB_MAX_MS;
    this.touched.add(victim);
    // The spider is out of their reach until it breaks.
    const f = this.fighter(owner);
    f.stringWardFrom = victim;
    f.stringWardAll = !this.api.isInvasion;
    f.onStringWardHit = (amount: number) => {
      // Husks never cast, so what they would have done to the spider goes into the silk instead.
      if (this.api.isInvasion) this.cutTomb(tomb, amount);
    };
    this.touched.add(f);
    this.puppets.delete(victim);
    this.fx(owner).tombWrap(cx, cy, this.bodyR(victim));
    this.announce(cx, cy - 56, '🕸️ LINEN TOMB', STRING.silk, 14);
    Sfx.playAt('tentacle', cx, { rate: 0.8, volume: 0.9 });
    Sfx.playAt('stretch', cx, { rate: 0.6, volume: 0.8 });
    if (this.simulates(owner) && victim === this.api.npc) this.relay(owner, `string-tomb:${Math.round(this.mx(cx))}:${Math.round(cy)}`);
  }

  private cutTomb(tomb: Tomb, amount: number): void {
    if (this.side(tomb.owner).tomb !== tomb) return;
    tomb.hp = Math.max(0, tomb.hp - amount);
    tomb.shake = 1;
    this.fx(tomb.owner).tombHit(tomb.x + (Math.random() - 0.5) * 20, tomb.y + (Math.random() - 0.5) * 24);
    Sfx.playAt('slash', tomb.x, { rate: 1.5, volume: 0.35 });
    // The owner's sim decides when it breaks; the victim's copy just shows the silk going.
    if (tomb.hp <= 0 && this.simulates(tomb.owner)) this.breakTomb(tomb.owner);
  }

  private unhookTomb(tomb: Tomb | null): void {
    if (!tomb) return;
    if (tomb.hook) tomb.victim.off('cast', tomb.hook);
    tomb.hook = null;
  }

  private breakTomb(owner: Owner, quiet = false): void {
    const side = this.side(owner);
    const tomb = side.tomb;
    if (!tomb) return;
    this.unhookTomb(tomb);
    side.tomb = null;
    for (const s of tomb.strands) this.removeStrand(s);
    tomb.victim.stringTombedUntil = 0;
    const f = this.fighter(owner);
    if (f) { f.stringWardFrom = null; f.stringWardAll = false; f.onStringWardHit = null; }
    if (quiet) return;
    this.fx(owner).tombBreak(tomb.x, tomb.y);
    this.announce(tomb.x, tomb.y - 50, 'TORN FREE', STRING.silkShade, 12);
    Sfx.playAt('slash', tomb.x, { rate: 0.8, volume: 0.9 });
    if (this.simulates(owner) && tomb.victim === this.api.npc) this.relay(owner, 'string-untomb');
  }

  /**
   * The tomb's frame: pin the victim in the middle, charge it for every pixel it tried to move this
   * frame (its own input or AI wrote that velocity before this kit ran), eat its shots, and let it go
   * when the silk is cut through or the safety runs out. The body's own machine does the pinning
   * and the tearing; the owner's sim keeps the HP.
   */
  private updateTomb(owner: Owner, dt: number): void {
    const tomb = this.side(owner).tomb;
    if (!tomb) return;
    const v = tomb.victim;
    tomb.shake = Math.max(0, tomb.shake - dt * 5);
    if (!this.alive(v) || this.now > tomb.until || !this.aliveSpider(owner)) { this.breakTomb(owner); return; }
    if (!this.isRemoteBody(v)) {
      const body = v.body as Phaser.Physics.Arcade.Body;
      const sp = Math.hypot(body.velocity.x, body.velocity.y);
      if (sp > TOMB_MOVE_MIN) {
        tomb.carry += sp * TOMB_TEAR_PER_PX * dt;
        tomb.shake = Math.min(1, tomb.shake + dt * 4);
      }
      body.setVelocity(0, 0);
      if (Math.hypot(v.x - tomb.x, v.y - tomb.y) > 0.5) body.reset(tomb.x, tomb.y);
      if (this.now >= tomb.nextTick) {
        tomb.nextTick = this.now + TOMB_TICK_MS;
        const owed = Math.floor(tomb.carry);
        if (owed >= 1) {
          tomb.carry -= owed;
          if (v === this.api.player && this.isReplica(owner)) {
            // Our own body, their tomb: only we may hurt it, and only as a hit already settled.
            v.takeDamage(owed, { netApplied: true });
          } else {
            this.hurt(owner, v, owed);
          }
          this.fx(owner).tear(v.x, v.y);
        }
      }
    }
    // Their shots go into the silk and no further.
    const theirs = this.ownerOf(v) ?? 'npc';
    const fromPlayer = v === this.api.player;
    for (const obj of [...this.api.projectiles.getChildren()]) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal || p.isFromPlayer !== fromPlayer) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, tomb.x, tomb.y) > TOMB_R * 1.4 + 24) continue;
      if (this.api.isInvasion && this.simulates(owner)) this.cutTomb(tomb, Math.max(1, p.damage));
      p.destroy();
    }
    for (const r of this.api.projectileRegistry.within(theirs, tomb.x, tomb.y, TOMB_R * 1.4 + 24)) {
      this.api.projectileRegistry.steal(r);
    }
    // A husk in the silk spits into it.
    for (const h of this.api.huskShots()) {
      if (h.from !== v || Phaser.Math.Distance.Between(h.x, h.y, tomb.x, tomb.y) > TOMB_R * 1.4 + 24) continue;
      h.kill();
      if (this.simulates(owner)) this.cutTomb(tomb, Math.max(1, h.damage));
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isString('player');
    const npcIs = this.isString('npc');
    const anyState = this.strands.length || this.hooks.length || this.bars.length || this.spiders.length
      || this.puppets.size || this.sides.player.tomb || this.sides.npc.tomb || this.playerAvatar;
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    const dt = Math.min(0.05, delta / 1000);
    this.vizT += dt;

    this.updateHooks(dt);
    this.updateBars(dt);
    this.updateExpiry();
    this.updateContacts(dt);
    this.updateHexTouch();
    this.updateShots(dt);
    this.updateSteering();
    for (const owner of BOTH) this.updateTomb(owner, dt);
    this.botHexSnap();
    const bodies = this.allFighters().filter((f) => this.alive(f));
    for (const s of this.strands) this.stepRope(s, dt, bodies);
    this.updateSpiders(dt);
    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /** The bot snaps its own hex strand once someone is caught in it and it has had time to slow them. */
  private botHexSnap(): void {
    if (!this.isString('npc') || !this.simulates('npc')) return;
    const s = this.hexOf('npc');
    const bot = this.api.npc;
    if (!s || !this.alive(bot) || this.now - s.born < NPC_HEX_MIN_AGE_MS) return;
    if (!this.canAct(bot, 'other')) return;
    if (!this.npcHexCaught(s)) return;
    const a = this.startOf(s);
    const b = this.endOf(s);
    this.snap(s, null, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }

  private npcHexCaught(s: Strand): boolean {
    const a = this.startOf(s);
    const b = this.endOf(s);
    for (const t of this.targetsOf(s.owner)) {
      if (s.tied === t) return true;
      if (this.segNear(a.x, a.y, b.x, b.y, t.x, t.y).d < HEX_SNAP_BAND * 0.7 + this.bodyR(t)) return true;
    }
    return false;
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private paint(): void {
    const ground = this.groundGfx!;
    const rope = this.ropeGfx!;
    const top = this.topGfx!;
    ground.clear();
    rope.clear();
    top.clear();
    const t = this.vizT;
    for (const s of this.strands) {
      const tint = this.col(s.owner);
      const pts = s.nodes;
      const end = pts[pts.length - 1];
      if (s.kind === 'hex') {
        hexRope(rope, tint, pts, t + s.seed, 1, s.shots);
      } else if (s.kind === 'tomb') {
        silkLine(rope, tint, pts, 0.95);
      } else {
        ropeLine(rope, tint, pts, 3, 1, s.strain / SNAP_STRAIN);
      }
      if (s.tied) {
        const prev = pts[pts.length - 2];
        hitKnot(rope, tint, end.x, end.y, Math.atan2(prev.y - end.y, prev.x - end.x), s.tied.alpha, s.kind === 'hex');
      } else if (s.kind !== 'tomb') {
        wallTack(ground, tint, end.x, end.y, 1, s.kind === 'hex');
      }
    }
    for (const h of this.hooks) {
      const f = this.fighter(h.owner);
      if (!f) continue;
      const tint = this.col(h.owner);
      const from = { x: f.x, y: f.y - 4 };
      // The line paying out behind the hook, with a little whip in it.
      const mid = { x: (from.x + h.x) / 2 + Math.sin(t * 30) * 1.5, y: (from.y + h.y) / 2 + 1.5 };
      if (h.kind === 'hex') hexRope(rope, tint, [from, mid, { x: h.x, y: h.y }], t, 0.9, 0);
      else ropeLine(rope, tint, [from, mid, { x: h.x, y: h.y }], 2.4, 0.95);
      hookTip(rope, tint, h.x, h.y, Math.atan2(h.vy, h.vx), 1, h.kind === 'hex');
    }
    for (const b of this.bars) controlBar(rope, this.col(b.owner), b.x, b.y, b.spin, 1.15, 1);
    for (const sp of this.spiders) {
      const fade = sp.strand ? Math.min(1, (sp.until - this.now) / 300) : Math.min(1, (sp.looseUntil - this.now) / 400);
      spiderBody(rope, this.col(sp.owner), sp.x, sp.y, sp.ang, sp.phase, SPIDER_SCALE, Math.max(0, fade), !sp.strand);
    }
    for (const [victim, p] of this.puppets) {
      if (!this.alive(victim)) continue;
      const s = this.side(p.owner);
      const steering = s.steerX !== 0 || s.steerY !== 0 || (p.owner === 'npc' && this.simulates('npc'));
      puppetRig(top, this.col(p.owner), victim.x, victim.y, this.bodyR(victim), t, steering, victim.alpha);
    }
    for (const owner of BOTH) {
      const tb = this.side(owner).tomb;
      if (!tb) continue;
      const tint = this.col(owner);
      const sx = Math.sin(t * 60) * 2.5 * tb.shake;
      cocoon(top, tint, tb.x + sx, tb.y, this.bodyR(tb.victim), 1 - tb.hp / TOMB_HP, t, 1);
      tombBar(top, tint, tb.x, tb.y - this.bodyR(tb.victim) * 1.5 - 14, tb.hp / TOMB_HP, 1);
    }
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const aim = this.aimOf(owner);
      av.setFacing(Math.atan2(aim.y - f.y, aim.x - f.x));
      const rig = this.rig(owner);
      rig?.setWeave(this.side(owner).tomb ? 1 : 0);
      av.setHold(this.spidering(owner) ? 'draw' : null, Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private aimOf(owner: Owner): Pt {
    if (owner === 'npc') {
      const f = this.api.npc;
      const t = f ? this.nearestTarget('npc', f.x, f.y) : null;
      if (t) return { x: t.x, y: t.y };
    }
    const s = this.side(owner);
    return { x: s.aimX, y: s.aimY };
  }

  private pushStatuses(playerIs: boolean): void {
    const set = this.api.setStatusIndicator.bind(this.api);
    const hx = this.hexOf('player');
    set('string-hex-out', playerIs && hx ? {
      name: 'Hexing Strand', emoji: '🟣', color: STRING.hex, priority: 150,
      description: `Your purple strand is out. Press R to snap it: ${HEX_SNAP_DMG} damage and a heavy slow to everyone caught in it. ${HEX_SHOTS - hx.shots} more shots and it snaps on its own.`,
      until: hx.dies,
    } : null);
    let puppetUntil = 0;
    for (const p of this.puppets.values()) if (p.owner === 'player') puppetUntil = Math.max(puppetUntil, p.until);
    set('string-spider', playerIs && puppetUntil > 0 ? {
      name: 'Marionette', emoji: '🎎', color: STRING.woodLit, priority: 151,
      description: 'Your puppet walks where the arrow keys point while you hold them.',
      until: puppetUntil,
    } : null);
    const tb = this.sides.player.tomb;
    set('string-tomb-hold', playerIs && tb ? {
      name: 'Linen Tomb', emoji: '🕸️', color: STRING.silk, priority: 152,
      description: `They are wrapped in silk: they cannot move or hurt you until they cut through it. ${Math.ceil(tb.hp)} HP left.`,
      count: Math.ceil(tb.hp),
      until: tb.until,
    } : null);
    const mine = this.spiders.filter((sp) => sp.owner === 'player');
    set('string-spiders', playerIs && mine.length ? {
      name: 'Spider Dance', emoji: '🕷️', color: STRING.spiderMark, priority: 153,
      description: 'Your spiders are walking your strings, biting whatever they touch.',
      count: mine.length,
      until: Math.max(...mine.map((sp) => sp.strand ? sp.until : sp.looseUntil)),
    } : null);
  }

  // ── Arena readers ──────────────────────────────────────────────────────────

  /** The ability cards: R stays lit while the hex strand is out (press to snap it). */
  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    if (abilityId === ID.r && this.hexOf('player')) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  /**
   * Spider Dance has somewhere worth walking: two strands out, a string tied to the target (the
   * spiders walk straight into them), or the tomb's guy-lines (which end at the victim).
   */
  npcStringSpiderReady(): boolean {
    const list = this.strandsOf('npc');
    if (!list.length) return false;
    if (this.sides.npc.tomb) return true;
    const t = this.targetsOf('npc')[0];
    if (t && list.some((s) => s.tied === t)) return true;
    return list.length >= 2;
  }

  /** The hex strand is worth throwing: none out, and the target in reach. */
  npcStringHexShot(): boolean {
    if (this.hexOf('npc')) return false;
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    return !!t && this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < NPC_HEX_RANGE;
  }

  /**
   * Marionette is worth throwing: the target in the bar's reach, not already a puppet or in the
   * tomb, and something on the field to walk them into — spiders, strings or the hex strand.
   */
  npcStringPuppetShot(): boolean {
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t || !this.alive(f)) return false;
    if (this.puppets.has(t) || Date.now() < t.stringTombedUntil) return false;
    if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > BAR_RANGE * 0.85) return false;
    return this.spiders.some((sp) => sp.owner === 'npc') || this.strandsOf('npc').length >= 2;
  }

  /** Linen Tomb is worth it: Spider Dance is ready to walk the guy-lines, or the target is low. */
  npcStringTombReady(): boolean {
    if (this.sides.npc.tomb) return false;
    const t = this.targetsOf('npc')[0];
    const f = this.api.npc;
    if (!t || !this.alive(f)) return false;
    return f.getCooldownRatio(ID.e) >= 1 || t.hp / t.maxHp < 0.4;
  }
}
