import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Ability, CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  ABDOMEN, AbdomenChain, Pt, STRING, StringAvatar, StringColorFn, StringFx, bewitchedHalo, cocoon, corpseWrap, hitKnot, controlBar, hexRope,
  hookTip, metalLine, pointAlong, polyLength, puppetRig, ropeLine, silkLine, spiderBody, spoolCharge, tombBar, wallTack,
  webBar, webCover, webWad,
} from './StringVisuals';
import { BaseAvatar } from './ElementVisuals';
import { BodySection } from '../../entities/BodySection';
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

// ── Shop upgrades ────────────────────────────────────────────────────────────
// Click+ Metal Spool: hold click this long and a metal string fires on its own.
const SPOOL_MS = 2000;
const METAL_MS = 20000;
const METAL_SHOTS = 12;
/** About four times a string's strain — and no single shove, however hard, snaps it. */
const METAL_SNAP_STRAIN = 1040;
const METAL_HARD_PUSH = Infinity;
const METAL_SNAP_DMG = 34;
// E+ Bewitched Spiders: the ones that land on the hex strand.
const BEWITCHED_SCALE = 1.45;
const BEWITCHED_MS = 20000;
const SPIT_MS = 1600;
const SPIT_JITTER_MS = 400;
const WAD_RANGE = 560;
const WAD_SPEED = 480;
const WAD_R = 6;
const WAD_DMG = 7;
const WAD_SLOW_MS = 1200;
// R+ Spider Swing.
const SWING_SPEED = 1100;
const SWING_MIN_MS = 220;
const SWING_MAX_MS = 560;
/** How far the swing's arc dips below the straight line, as a share of its length. */
const SWING_BOW = 0.22;
/** A bot in trouble swings away on a wall-tied hex strand: below this health, with the target this close… */
const NPC_SWING_HP = 0.35;
const NPC_SWING_THREAT = 220;
/** …and the far end at least this far from the target. */
const NPC_SWING_AWAY = 300;
// F+ Puppet Play. The puppet's real ability is cast at it from just in front of it, on the spider's side.
const PUPPET_CAST_OFFSET = 40;
/** The stand-in hit, by key, for an ability whose `cast()` is empty (its kit drives it) or throws. */
const BACKFIRE_DMG: Record<string, number> = { Click: 6, E: 16, R: 16, F: 16, Q: 30 };
// Q+ Spinal Snap.
const WEB_HP = 200;
/** A web nobody fights under fades after this, with no payoff. */
const WEB_MAX_MS = 30000;
/** What one attack takes out of the web, by key — anyone's: the spider's or its enemy's. */
const WEB_CAST_HIT: Record<string, number> = { Click: 6, E: 15, R: 15, F: 15, Q: 30 };
const WEB_BREAK_DMG = 35;
const INFEST_MS = 8000;
const BROOD_EVERY_MS = 1800;
const BROOD_JITTER_MS = 900;
const BROOD_MS = 5000;
const BROOD_SCALE = 1.25;
const BROOD_R = 16;
const BROOD_DMG = 5;
const BROOD_SPEED = 200;
/** A brood spider this close to one of the spider's strands climbs onto it. */
const BROOD_HOP = 26;
/** A spider just out of its host does not bite it straight away. */
const BROOD_HOST_GRACE_MS = 900;
/** The bodies hanging in the web: whose sprites they wear, and where along the top they hang. */
const CORPSE_IDS = ['fire', 'water', 'earth', 'air', 'life', 'ice', 'metal', 'light', 'shadow', 'crystal'];
const CORPSE_AT = [0.17, 0.38, 0.62, 0.83];
const CORPSE_DROP = [74, 128, 96, 146];
const CORPSE_R = 17;

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
  /** Hexing Strand (or a metal string): shots it has eaten. */
  shots: number;
  born: number;
  nodes: Node[];
  seed: number;
  /** Click+ Metal Spool: a steel string — 12 shots, far more strain, a harder lash. */
  metal: boolean;
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
  metal: boolean;
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
  scale: number;
  /** E+ on the hex strand: small, spits web, never bites; perches when its strand is gone. */
  bewitched: boolean;
  nextSpit: number;
  /** Q+ Infested: crawled out of a host, scuttles about and climbs any of its owner's strands. */
  brood: boolean;
  nextHop: number;
}

/** E+ a wad of web a Bewitched spider spat. */
interface Wad {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  visual: boolean;
}

/** R+ Spider Swing: an arc from where the spider was to the hex strand's far end. */
interface Swing {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** The arc's control point. */
  cx: number;
  cy: number;
  /** Where the strand was anchored — the dragline is drawn to it. */
  ax: number;
  ay: number;
  start: number;
  dur: number;
  /** Online: the other machine's swing. Its body moves there; here we only draw the line. */
  visual: boolean;
}

interface Corpse { img: Phaser.GameObjects.Image | null; ax: number; ay: number; len: number; phase: number }

/** Q+ Spinal Snap: the web over the whole arena. */
interface Web {
  owner: Owner;
  hp: number;
  until: number;
  flash: number;
  /** Redraw the lattice next frame (it is only repainted when it changes). */
  dirty: boolean;
  hooks: { f: Fighter; ev: string; fn: (...args: unknown[]) => void }[];
  corpses: Corpse[];
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
  /** Click+: when the held click started winding the spool (0 = not winding). */
  spoolSince: number;
  wasLeft: boolean;
  swing: Swing | null;
  web: Web | null;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, steerX: 0, steerY: 0, sentSteer: '0:0', nextId: 1, tomb: null,
    spoolSince: 0, wasLeft: false, swing: null, web: null,
  };
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
  /** Shop upgrades: the player's own (Quantum-aware), or the opponent's from the handshake / loadout. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  stringColor(owner: Owner, base: number): number;
  /** Skins: the equipped skin id for that side, or null. */
  skinId(owner: Owner): string | null;
  buildPlayerContext(x: number, y: number): CastContext;
  /** F+ Puppet Play, a bot's (or the online opponent's) puppet: the cast aimed at our own body. */
  buildNpcContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only one sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** The abdomen: put a hit body where that side's attackers look for targets, and take it back. */
  addBodySection(owner: Owner, f: Fighter): void;
  removeBodySection(owner: Owner, f: Fighter): void;
}

/** A spider's abdomen: the chain it drags and the hit body riding each node. */
interface Tail { of: Fighter; chain: AbdomenChain; parts: BodySection[] }

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
 *
 * Shop upgrades (2026-10-26), all in this kit:
 * - **Click+ Metal Spool** — holding click winds a spool; at 2s a metal string fires (`Strand.metal`:
 *   20s, 12 shots, ~4× strain, 34 lash). Online `string-spool` draws the hook; `string-tie` kind 2.
 * - **E+ Bewitched Spiders** — spiders put on the hex strand are small and spit `Wad`s (slow via
 *   `stringHexUntil`), 20s; when the strand goes they hop to another, or perch.
 * - **R+ Spider Swing** — `recastHex` snaps, then `startSwing` flies the body along an arc to the far
 *   end. Online the body moves on its own machine; `string-swing` only draws the line.
 * - **F+ Puppet Play** — each cast entry point calls `puppetPlay(key)`: every live puppet's own
 *   ability on that key is really cast at it as the spider's (`castPuppet`, Memory's Repression trick),
 *   relayed as `string-puppetcast`; an empty or throwing cast falls back to a fixed `backfire` hit.
 * - **Q+ Spinal Snap** — `hangWeb` with the tomb: listens to everyone's `cast` (and husk damage in
 *   Invasion), breaks at 0 on the spider's sim (`string-webbreak`): 35 + `stringInfestedUntil`, and
 *   `infest` spawns brood spiders (`string-brood` pictures them on the other machine).
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
  /** Q+ Spinal Snap's web over the floor; repainted only when it changes. */
  private webGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private strands: Strand[] = [];
  private hooks: Hook[] = [];
  private bars: Bar[] = [];
  private spiders: Spider[] = [];
  private wads: Wad[] = [];
  private puppets = new Map<Fighter, Puppet>();
  /** Q+ the hosts this sim breeds spiders out of, and whose they are. */
  private infest = new Map<Fighter, { owner: Owner; next: number }>();
  private tails: Record<Owner, Tail | null> = { player: null, npc: null };
  /** Everything this kit has written a status onto, so `reset` can hand it back clean. */
  private touched = new Set<Fighter>();
  /** F+ inside a puppet's cast: a String puppet's strings must not pull a puppet of their own. */
  private puppetCasting = false;

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

  /** A shop upgrade, on a side that is actually String. */
  private up(owner: Owner, slot: string): boolean {
    return this.isString(owner) && this.api.hasUpgrade(owner, slot);
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
    // A string ties a body, not a lobe of one: another spider's abdomen is not a target here.
    return list.filter((f) => this.alive(f) && !(f instanceof BodySection) && this.api.isTargetable(f));
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

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
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
    metal = false,
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
        // A metal string outlasts the plain ones: they are let go first.
        const at = mine.findIndex((x) => !x.metal);
        const old = mine.splice(at < 0 ? 0 : at, 1)[0];
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
      dies: this.now + (kind === 'hex' ? HEX_MS : metal ? METAL_MS : STRING_MS),
      strain: 0, shots: 0, born: this.now, nodes: this.makeNodes(start, end), seed: Math.random() * 999, metal,
    };
    this.strands.push(s);
    this.fx(owner).bite(end.x, end.y, !tied, kind === 'hex');
    if (metal) this.fx(owner).clang(end.x, end.y);
    Sfx.playAt(tied ? 'grapple' : 'nail', end.x, { rate: kind === 'hex' ? 0.8 : 1.3, volume: 0.6 });
    if (tied && tied.active) {
      this.announce(tied.x, tied.y - 40, kind === 'hex' ? '🟣 HEXED' : metal ? '⛓️ CHAINED' : '🧵 TIED',
        kind === 'hex' ? STRING.hexGlow : metal ? STRING.steelLit : STRING.silk, 11);
    }
    if (this.simulates(owner) && owner === 'player' && this.api.isOnline) {
      const onThem = tied === this.api.npc ? 1 : 0;
      this.relay(owner, `string-tie:${s.id}:${kind === 'hex' ? 1 : metal ? 2 : 0}:${onThem}:${Math.round(this.mx(ax))}:${Math.round(ay)}:${Math.round(s.len)}:${Math.round(-s.ox)}:${Math.round(s.oy)}`);
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
      if (s.metal) this.fx(s.owner).clang(bx, by);
      if (this.simulates(s.owner) && breaker && this.alive(breaker)) {
        this.hurt(s.owner, breaker, s.metal ? METAL_SNAP_DMG : SNAP_DMG);
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
    for (const owner of BOTH) {
      this.unhookTomb(this.sides[owner].tomb);
      this.dropWeb(this.sides[owner].web);
    }
    for (const f of [...this.touched, ...this.allFighters()]) {
      if (!f) continue;
      f.stringHexUntil = 0;
      f.stringSnareUntil = 0;
      f.stringInfestedUntil = 0;
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
    this.wads = [];
    this.puppets.clear();
    this.infest.clear();
    // The sections went with the old scene; only the plain field on a surviving fighter is ours to clear.
    for (const owner of BOTH) {
      const tail = this.tails[owner];
      if (tail?.of) tail.of.bodySections = [];
      this.tails[owner] = null;
    }
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.ropeGfx, this.topGfx, this.webGfx]) g?.destroy();
    this.groundGfx = this.ropeGfx = this.topGfx = this.webGfx = null;
    for (const id of ['string-hex-out', 'string-spider', 'string-tomb-hold', 'string-spiders', 'string-web']) this.api.setStatusIndicator(id, null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4.5);
    if (!this.ropeGfx) this.ropeGfx = scene.add.graphics().setDepth(9);
    if (!this.topGfx) this.topGfx = scene.add.graphics().setDepth(9.6);
    if (!this.webGfx) this.webGfx = scene.add.graphics().setDepth(4.4);
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene) ?? new StringAvatar(this.api.scene, this.col(owner));
  }

  private ensureAvatars(): void {
    if (this.isString('player') && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (!this.isString('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isString('npc') && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
  }

  // ── The abdomen ────────────────────────────────────────────────────────────

  /**
   * A spider drags its abdomen behind it, and every lobe is a body that can be hit (`BodySection`):
   * what lands on one lands on the spider, the red bulb at three times over. A side that stops
   * being String (Quantum swapping its live element) loses them again. In an Invasion the npc
   * slot is an ally or a placeholder, so it grows none.
   */
  private updateTails(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const wanted = this.isString(owner) && !!f && f.active && !(owner === 'npc' && this.api.isInvasion);
      let tail = this.tails[owner];
      if (tail && (!wanted || tail.of !== f)) {
        for (const part of tail.parts) {
          this.api.removeBodySection(owner, part);
          if (part.active) part.destroy();
        }
        if (tail.of) tail.of.bodySections = [];
        this.rig(owner)?.setTail(null);
        tail = this.tails[owner] = null;
      }
      if (!wanted) continue;
      if (!tail) {
        const chain = new AbdomenChain();
        const parts = ABDOMEN.map((def) => {
          const part = new BodySection(this.api.scene, f, def.mult, def.r);
          part.onStruck = () => {
            this.fx(owner).abdomenHit(part.x, part.y, def.r, def.mult > 1);
            if (def.mult > 1) this.rig(owner)?.stung();
          };
          this.api.addBodySection(owner, part);
          return part;
        });
        f.bodySections = parts;
        tail = this.tails[owner] = { of: f, chain, parts };
      }
      // Laid out away from the middle of the arena to begin with; after that it only follows.
      const b = this.api.bounds;
      tail.chain.step(f.x, f.y, f.x < b.centerX ? Math.PI : 0);
      for (let i = 0; i < tail.parts.length; i++) tail.parts[i].place(tail.chain.nodes[i].x, tail.chain.nodes[i].y);
      this.rig(owner)?.setTail(tail.chain.nodes);
    }
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
    const pressed = left && !s.wasLeft;
    s.wasLeft = left;
    if (!this.alive(p)) { s.spoolSince = 0; return; }

    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);
    if (this.up('player', 'click')) {
      // Metal Spool: a click is one string; holding it winds the spool instead of throwing more.
      if (pressed && this.canAct(p, 'click')) p.castAbility(ID.click, ctx());
      this.windSpool('player', left && this.canAct(p, 'click'), mouseX, mouseY);
    } else if (left && this.canAct(p, 'click')) {
      p.castAbility(ID.click, ctx());
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility(ID.e, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      // R again while the hex strand is out snaps it — free, the cooldown already ran from the throw.
      const hx = this.hexOf('player');
      if (hx) {
        if (this.canAct(p, 'other')) this.recastHex('player', hx);
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
        const kind = n(2) === 1 ? 'hex' : 'snag';
        const metal = n(2) === 2;
        this.hooks = this.hooks.filter((h) => !(h.owner === 'npc' && h.kind === kind && h.metal === metal));
        const s = this.tie('npc', kind, n(3) === 1 ? me : null, this.mx(n(4)), n(5), n(1), n(7), n(8), metal);
        if (s) s.len = n(6) || s.len;
        break;
      }
      case 'string-spool':
        // Their spool let go: a picture of the metal hook, until `string-tie` says where it bit.
        if (this.alive(them)) {
          this.throwHook('npc', 'snag', this.mx(n(1)), n(2), true);
          this.fx('npc').spoolFire(them.x, them.y - 4, Math.atan2(n(2) - them.y, this.mx(n(1)) - them.x));
        }
        break;
      case 'string-swing':
        if (this.alive(them)) this.startSwing('npc', { x: this.mx(n(1)), y: n(2) }, { x: this.mx(n(3)), y: n(4) }, true);
        break;
      case 'string-puppetcast': {
        // Our own ability, cast at us by their puppet strings: run it here as theirs, aimed at us.
        const ab = me.element.abilities.find((a) => a.id === parts[1]);
        if (ab && this.alive(me) && this.alive(them)) {
          this.castPuppet('npc', me, ab, this.mx(n(2)), n(3), this.mx(n(4)), n(5));
        }
        break;
      }
      case 'string-backfire':
        // Our own ability, turned on us by their puppet strings. The hit itself arrives as damage.
        if (this.alive(me)) this.backfire('npc', me, parts[1] ?? 'E', false);
        break;
      case 'string-brood':
        this.spawnBrood('npc', this.mx(n(1)), n(2), me, true);
        break;
      case 'string-webbreak':
        this.breakWeb('npc', true);
        break;
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
    this.puppetPlay(owner, 'Click');
  }

  /** R — Hexing Strand. The purple one. */
  doHex(owner: Owner, tx: number, ty: number): void {
    this.throwHook(owner, 'hex', tx, ty);
    this.puppetPlay(owner, 'R');
  }

  private throwHook(owner: Owner, kind: 'snag' | 'hex', tx: number, ty: number, metal = false): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const sp = kind === 'hex' ? HEX_SPEED : HOOK_SPEED;
    const x = f.x + Math.cos(ang) * 18;
    const y = f.y - 4 + Math.sin(ang) * 18;
    this.hooks.push({ owner, kind, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, travelled: 0, visual: !this.simulates(owner), metal });
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
    // E+ Bewitched Spiders: the ones that land on the hex strand.
    const bewitch = this.up(owner, 'e');
    let i = 0;
    for (const [s, count] of perStrand) {
      const L = polyLength(s.nodes);
      const bew = bewitch && s.kind === 'hex';
      for (let k = 0; k < count; k++) {
        const d = L * ((k + 1) / (count + 1));
        const p = pointAlong(s.nodes, d);
        this.spiders.push({
          owner, strand: s, d, dir: (i + k) % 2 ? 1 : -1, x: p.x, y: p.y, ang: p.ang, phase: Math.random() * TAU,
          until: this.now + (bew ? BEWITCHED_MS : SPIDER_MS), looseUntil: 0, vx: 0, vy: 0, nextTurn: 0, gate: new Map(),
          visual: !this.simulates(owner), scale: bew ? BEWITCHED_SCALE : SPIDER_SCALE,
          bewitched: bew, nextSpit: this.now + 350 + k * 260, brood: false, nextHop: 0,
        });
        this.fx(owner).spiderDrop(p.x, p.y);
      }
      i++;
    }
    this.avatar(owner)?.play('flex');
    Sfx.playAt('tentacle', f.x, { rate: 1.6, volume: 0.6 });
    this.puppetPlay(owner, 'E');
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
    this.puppetPlay(owner, 'F');
  }

  /** Q — Linen Tomb. The enemy nearest the cursor (a bot's: its target) goes into the silk. */
  doTomb(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.avatar(owner)?.play('raise', -Math.PI / 2, 700);
    // Online, the other machine picks the victim and tells us (`string-tomb`). Their web we hang here.
    if (!this.simulates(owner)) {
      if (this.up(owner, 'q')) this.hangWeb(owner);
      return;
    }
    const t = owner === 'player' ? this.nearestTarget(owner, tx, ty) : this.nearestTarget(owner, f.x, f.y);
    if (!t) { this.refund(f, ID.q); return; }
    // Puppet Play before the silk takes them: the tomb ends the puppet.
    this.puppetPlay(owner, 'Q');
    const b = this.api.bounds;
    this.entomb(owner, t, b.centerX, b.centerY);
    if (this.up(owner, 'q')) this.hangWeb(owner);
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
            this.tie(h.owner, h.kind, t, t.x, t.y, undefined, Math.cos(a) * r, Math.sin(a) * r, h.metal);
          }
          break;
        }
      }
      if (!done && !b.contains(h.x, h.y)) {
        done = true;
        if (!h.visual) {
          const w = this.wallPoint(h.x, h.y);
          this.tie(h.owner, h.kind, null, w.x, w.y, undefined, 0, 0, h.metal);
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
      const snapAt = s.metal ? METAL_SNAP_STRAIN : SNAP_STRAIN;
      const hard = s.metal ? METAL_HARD_PUSH : HARD_PUSH;
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
              if (out > hard) s.strain = snapAt;
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
              if (into > hard) s.strain = snapAt;
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
          if (s.strain >= snapAt) { breaker = f; break; }
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
      // A plain string goes on the first shot; the hex strand takes 3, a metal string 12.
      const cap = s.kind === 'hex' ? HEX_SHOTS : s.metal ? METAL_SHOTS : 1;
      const multi = cap > 1;
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
        if (!multi) break;
      }
      // Invasion: the husks' shots are the director's, not the arena's.
      if (s.owner === 'player' && (multi || !caught.length)) {
        for (const h of this.api.huskShots()) {
          let u = this.crossAt({ x: h.x - h.vx * dt, y: h.y - h.vy * dt }, { x: h.x, y: h.y }, a, b);
          if (u < 0) {
            const near = this.segNear(a.x, a.y, b.x, b.y, h.x, h.y);
            if (near.d < 8) u = near.u;
          }
          if (u < NEAR_END || (s.tied && u > 1 - NEAR_END * 1.25)) continue;
          caught.push({ x: h.x, y: h.y, kill: h.kill, from: h.from });
          if (!multi) break;
        }
      }
      if (multi || !caught.length) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const half = Math.hypot(b.x - a.x, b.y - a.y) / 2 + 12;
        for (const r of this.api.projectileRegistry.within(enemySide, mid.x, mid.y, half)) {
          const near = this.segNear(a.x, a.y, b.x, b.y, r.getX(), r.getY());
          if (near.d > 10 || near.u < NEAR_END || (s.tied && near.u > 1 - NEAR_END * 1.25)) continue;
          caught.push({ x: r.getX(), y: r.getY(), kill: () => this.api.projectileRegistry.steal(r) });
          if (!multi) break;
        }
      }
      if (!caught.length) continue;
      if (multi) {
        for (const c of caught) {
          c.kill();
          s.shots++;
          if (s.metal) {
            this.fx(s.owner).clang(c.x, c.y);
            Sfx.playAt('clang', c.x, { rate: 1.5, volume: 0.4 });
          } else {
            this.fx(s.owner).bite(c.x, c.y, false, true);
            Sfx.playAt('stretch', c.x, { rate: 0.7, volume: 0.6 });
          }
          if (s.shots >= cap) break;
        }
        if (s.shots < cap) continue;
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
    const old = sp.strand;
    sp.strand = null;
    sp.nextTurn = 0;
    if (sp.bewitched) {
      // A Bewitched spider hops to another of its owner's strands, or sits where it fell and spits.
      const next = this.nearestStrandFor(sp, old);
      if (next) { this.board(sp, next); return; }
      sp.looseUntil = sp.until;
      sp.vx = sp.vy = 0;
      return;
    }
    sp.looseUntil = sp.brood ? sp.until : this.now + LOOSE_MS;
  }

  /** The owner's strand nearest a spider, measured to its straight chord. */
  private nearestStrandFor(sp: Spider, not: Strand | null, max = Infinity): Strand | null {
    let best: Strand | null = null;
    let bestD = max;
    for (const s of this.strands) {
      if (s === not || s.owner !== sp.owner) continue;
      const a = this.startOf(s);
      const b = this.endOf(s);
      const d = this.segNear(a.x, a.y, b.x, b.y, sp.x, sp.y).d;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  /** Put a spider on a strand at the point of it nearest the spider. */
  private board(sp: Spider, s: Strand): void {
    const a = this.startOf(s);
    const b = this.endOf(s);
    const near = this.segNear(a.x, a.y, b.x, b.y, sp.x, sp.y);
    sp.strand = s;
    sp.d = polyLength(s.nodes) * near.u;
    sp.dir = Math.random() < 0.5 ? 1 : -1;
    this.fx(sp.owner).spiderDrop(near.x, near.y);
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
      } else if (sp.bewitched) {
        // Perched: it stays put and keeps spitting until its time is up.
        if (this.now > sp.looseUntil) { this.spiders.splice(i, 1); this.fx(sp.owner).spiderDrop(sp.x, sp.y); continue; }
        const t = this.nearestTarget(sp.owner, sp.x, sp.y);
        if (t) sp.ang = Math.atan2(t.y - sp.y, t.x - sp.x);
        sp.phase += dt * 3;
      } else {
        if (this.now > sp.looseUntil) { this.spiders.splice(i, 1); continue; }
        if (this.now >= sp.nextTurn) {
          const a = Math.random() * TAU;
          const v = (sp.brood ? BROOD_SPEED : LOOSE_SPEED) * (0.6 + Math.random() * 0.7);
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
        // Q+ a brood spider climbs onto any of its owner's strings it scuttles across.
        if (sp.brood && this.now >= sp.nextHop) {
          sp.nextHop = this.now + 150;
          const s = this.nearestStrandFor(sp, null, BROOD_HOP);
          if (s) this.board(sp, s);
        }
      }
      if (sp.bewitched) {
        if (this.now >= sp.nextSpit) this.spit(sp);
        continue;
      }
      if (sp.visual) continue;
      const reach = sp.brood ? BROOD_R : SPIDER_R;
      const dmg = sp.brood ? BROOD_DMG : SPIDER_DMG;
      for (const t of this.targetsOf(sp.owner)) {
        if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > reach + this.bodyR(t)) continue;
        if (this.now < (sp.gate.get(t) ?? 0)) continue;
        sp.gate.set(t, this.now + SPIDER_GATE_MS);
        this.hurt(sp.owner, t, dmg);
        this.fx(sp.owner).spiderBite(t.x, t.y - 6);
        Sfx.playAt('stab', t.x, { rate: sp.brood ? 2 : 1.6, volume: sp.brood ? 0.3 : 0.45 });
      }
    }
  }

  // ── E+ Bewitched Spiders: web wads ─────────────────────────────────────────

  private spit(sp: Spider): void {
    sp.nextSpit = this.now + SPIT_MS + Math.random() * SPIT_JITTER_MS;
    const t = this.nearestTarget(sp.owner, sp.x, sp.y, WAD_RANGE);
    if (!t) return;
    const ang = Math.atan2(t.y - sp.y, t.x - sp.x);
    this.wads.push({
      owner: sp.owner, x: sp.x + Math.cos(ang) * 8, y: sp.y + Math.sin(ang) * 8,
      vx: Math.cos(ang) * WAD_SPEED, vy: Math.sin(ang) * WAD_SPEED, travelled: 0, visual: sp.visual,
    });
    sp.ang = ang;
    Sfx.playAt('stretch', sp.x, { rate: 1.9, volume: 0.25 });
  }

  private updateWads(dt: number): void {
    const b = this.api.bounds;
    for (let i = this.wads.length - 1; i >= 0; i--) {
      const w = this.wads[i];
      const sx = w.vx * dt;
      const sy = w.vy * dt;
      w.x += sx;
      w.y += sy;
      w.travelled += Math.hypot(sx, sy);
      let done = w.travelled > WAD_RANGE * 1.15 || !b.contains(w.x, w.y) || !this.aliveSpider(w.owner);
      if (!done) {
        for (const t of this.targetsOf(w.owner)) {
          if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > WAD_R + this.bodyR(t)) continue;
          done = true;
          this.fx(w.owner).wadSplat(w.x, w.y);
          if (!w.visual) {
            this.hurt(w.owner, t, WAD_DMG);
            t.stringHexUntil = Math.max(t.stringHexUntil, Date.now() + WAD_SLOW_MS);
            this.touched.add(t);
          }
          break;
        }
      }
      if (done) this.wads.splice(i, 1);
    }
  }

  // ── Click+ Metal Spool ─────────────────────────────────────────────────────

  /** A held click winds the spool; at two seconds it fires a metal string and starts on the next. */
  private windSpool(owner: Owner, holding: boolean, tx: number, ty: number): void {
    const s = this.side(owner);
    if (!holding) { s.spoolSince = 0; return; }
    if (!s.spoolSince) { s.spoolSince = this.now; return; }
    if (this.now - s.spoolSince < SPOOL_MS) return;
    s.spoolSince = this.now;
    const f = this.fighter(owner);
    this.throwHook(owner, 'snag', tx, ty, true);
    this.fx(owner).spoolFire(f.x, f.y - 4, Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('clang', f.x, { rate: 0.8, volume: 0.6 });
    this.relay(owner, `string-spool:${Math.round(this.mx(tx))}:${Math.round(ty)}`);
  }

  /** The bot's hand on the spool: wound while a target is in reach and it has no metal string out. */
  private botSpool(): void {
    if (!this.isString('npc') || !this.simulates('npc')) return;
    const bot = this.api.npc;
    const s = this.sides.npc;
    if (!this.up('npc', 'click') || !this.alive(bot)) { s.spoolSince = 0; return; }
    const t = this.targetsOf('npc')[0];
    const want = !!t && this.canAct(bot, 'click') && Date.now() >= bot.stringTombedUntil
      && Phaser.Math.Distance.Between(bot.x, bot.y, t.x, t.y) < 700
      && !this.strands.some((x) => x.owner === 'npc' && x.metal);
    this.windSpool('npc', want, t?.x ?? 0, t?.y ?? 0);
  }

  // ── R+ Spider Swing ────────────────────────────────────────────────────────

  /** R again: snap the hex strand — and with Spider Swing, ride it to its far end. */
  private recastHex(owner: Owner, s: Strand): void {
    const a = this.startOf(s);
    const b = this.endOf(s);
    const swingTo = this.up(owner, 'r') ? this.swingGoal(owner, s) : null;
    this.snap(s, null, (a.x + b.x) / 2, (a.y + b.y) / 2);
    if (swingTo) this.startSwing(owner, swingTo, b, false);
  }

  /** Where the swing ends: the wall it bit, or just short of the body it is tied to. */
  private swingGoal(owner: Owner, s: Strand): Pt {
    const f = this.fighter(owner);
    const e = this.endOf(s);
    const r = this.bodyR(f) + 6;
    if (s.tied) {
      const back = this.bodyR(s.tied) + r;
      const a = Math.atan2(f.y - s.tied.y, f.x - s.tied.x);
      return this.inside(s.tied.x + Math.cos(a) * back, s.tied.y + Math.sin(a) * back, r);
    }
    return this.inside(e.x, e.y, r);
  }

  private inside(x: number, y: number, pad: number): Pt {
    const b = this.api.bounds;
    return { x: Phaser.Math.Clamp(x, b.left + pad, b.right - pad), y: Phaser.Math.Clamp(y, b.top + pad, b.bottom - pad) };
  }

  private startSwing(owner: Owner, to: Pt, anchor: Pt, visual: boolean): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const dist = Phaser.Math.Distance.Between(f.x, f.y, to.x, to.y);
    if (dist < 24 && !visual) return;
    const mx = (f.x + to.x) / 2;
    const my = (f.y + to.y) / 2;
    this.side(owner).swing = {
      fromX: f.x, fromY: f.y, toX: to.x, toY: to.y, cx: mx, cy: my + dist * SWING_BOW,
      ax: anchor.x, ay: anchor.y, start: this.now,
      dur: Phaser.Math.Clamp((dist / SWING_SPEED) * 1000, SWING_MIN_MS, SWING_MAX_MS), visual,
    };
    this.avatar(owner)?.play('raise', Math.atan2(anchor.y - f.y, anchor.x - f.x), 300);
    Sfx.playAt('grapple', f.x, { rate: 1.4, volume: 0.6 });
    if (!visual) {
      this.relay(owner, `string-swing:${Math.round(this.mx(to.x))}:${Math.round(to.y)}:${Math.round(this.mx(anchor.x))}:${Math.round(anchor.y)}`);
    }
  }

  /** Fly the arc. The body is only moved on its own machine; the other one just draws the line. */
  private updateSwing(owner: Owner): void {
    const side = this.side(owner);
    const sw = side.swing;
    if (!sw) return;
    const f = this.fighter(owner);
    const k = Math.min(1, (this.now - sw.start) / sw.dur);
    const moves = !sw.visual && !this.isRemoteBody(f) && this.alive(f);
    if (moves) {
      const e = k * k * (3 - 2 * k);
      const u = 1 - e;
      const x = u * u * sw.fromX + 2 * u * e * sw.cx + e * e * sw.toX;
      const y = u * u * sw.fromY + 2 * u * e * sw.cy + e * e * sw.toY;
      (f.body as Phaser.Physics.Arcade.Body).reset(x, y);
    }
    if (k >= 1 || !this.alive(f)) {
      side.swing = null;
      if (this.alive(f)) this.fx(owner).swingLand(f.x, f.y);
    }
  }

  // ── F+ Puppet Play ─────────────────────────────────────────────────────────

  /** One of the spider's casts: every puppet it holds uses its own ability on that key, on itself. */
  private puppetPlay(owner: Owner, key: string): void {
    if (this.puppetCasting || !this.simulates(owner) || !this.up(owner, 'f')) return;
    for (const [victim, p] of [...this.puppets]) {
      if (p.owner !== owner || this.now > p.until || !this.alive(victim)) continue;
      const ab = victim.element?.abilities.find((a) => a.displayKey === key);
      // Empty casts are driven by their kit's input, so there is nothing here to run: the stand-in hit.
      if (!ab || /\{\s*\}\s*$/.test(ab.cast.toString())) { this.backfire(owner, victim, key, true); continue; }
      const f = this.fighter(owner);
      const a = Math.atan2(f.y - victim.y, f.x - victim.x);
      const x = victim.x + Math.cos(a) * PUPPET_CAST_OFFSET;
      const y = victim.y + Math.sin(a) * PUPPET_CAST_OFFSET;
      if (!this.castPuppet(owner, victim, ab, x, y, victim.x, victim.y)) { this.backfire(owner, victim, key, true); continue; }
      if (victim === this.api.npc) {
        this.relay(owner, `string-puppetcast:${ab.id}:${Math.round(this.mx(x))}:${Math.round(y)}:${Math.round(this.mx(victim.x))}:${Math.round(victim.y)}`);
      }
    }
  }

  /**
   * The puppet's real ability, cast as the spider's: the spider's body steps to (x, y) for the length
   * of the cast and aims at (ax, ay) — the puppet — so whatever it spawns is the spider's and hits the
   * puppet. Anything the cast does to its caster's position is undone, and everything it put on screen
   * right away is tinted red. Returns false when the cast threw.
   *
   * Edge cases are left as they fall: a self-buff or heal lands on the spider, a form or stance it
   * starts belongs to a kit that is not running for the spider and may do nothing, and effects a kit
   * spawns later (off a timer or its own update) are not tinted.
   */
  private castPuppet(owner: Owner, victim: Fighter, ab: Ability, x: number, y: number, ax: number, ay: number): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    const { scene } = this.api;
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    const ox = f.x;
    const oy = f.y;
    const vx = body?.velocity.x ?? 0;
    const vy = body?.velocity.y ?? 0;
    const tweens = scene.tweens;
    const beforeTweens = new Set(tweens.getTweensOf(f));
    const beforeObjs = new Set(scene.children.list);
    let ok = true;
    f.x = x;
    f.y = y;
    this.puppetCasting = true;
    try {
      ab.cast(owner === 'player' ? this.api.buildPlayerContext(ax, ay) : this.api.buildNpcContext(ax, ay));
    } catch (err) {
      ok = false;
      console.warn(`Puppet Play: ${ab.id} could not be cast`, err);
    } finally {
      this.puppetCasting = false;
      for (const tw of tweens.getTweensOf(f)) if (!beforeTweens.has(tw)) tw.remove();
      f.x = ox;
      f.y = oy;
      body?.velocity.set(vx, vy);
    }
    for (const obj of scene.children.list) {
      if (beforeObjs.has(obj)) continue;
      const tintable = obj as unknown as { setTint?: (c: number) => unknown };
      if (typeof tintable.setTint === 'function') tintable.setTint(STRING.backfire);
    }
    this.fx(owner).backfire(victim.x, victim.y, this.bodyR(victim), victim.element?.color ?? STRING.backfire, ab.displayKey === 'Q');
    this.announce(victim.x, victim.y - 54, `↩ ${ab.name.toUpperCase()}`, STRING.backfire, ab.displayKey === 'Q' ? 14 : 12);
    return ok;
  }

  /**
   * The stand-in for a puppet ability that cannot be run (an empty, kit-driven cast, or one that
   * threw): a hit in its name and colour. `real` on the spider's sim, which deals the hit and tells
   * the victim's machine (`string-backfire`) so it can show it on their body.
   */
  private backfire(owner: Owner, victim: Fighter, key: string, real: boolean): void {
    const ab = victim.element?.abilities.find((a) => a.displayKey === key);
    this.fx(owner).backfire(victim.x, victim.y, this.bodyR(victim), victim.element?.color ?? STRING.backfire, key === 'Q');
    this.announce(victim.x, victim.y - 54, `↩ ${(ab?.name ?? key).toUpperCase()}`, STRING.backfire, key === 'Q' ? 14 : 12);
    Sfx.playAt('curse-cast', victim.x, { rate: 1.3, volume: 0.6 });
    if (!real) return;
    this.hurt(owner, victim, BACKFIRE_DMG[key] ?? 16);
    if (victim === this.api.npc) this.relay(owner, `string-backfire:${key}`);
  }

  // ── Q+ Spinal Snap ─────────────────────────────────────────────────────────

  /**
   * Hang the web over the arena. Every attack — the spider's or its enemy's — tears at it; in an
   * Invasion, where husks never cast, what they do to the spider tears it instead.
   */
  private hangWeb(owner: Owner): void {
    const side = this.side(owner);
    this.dropWeb(side.web);
    const web: Web = { owner, hp: WEB_HP, until: this.now + WEB_MAX_MS, flash: 1, dirty: true, hooks: [], corpses: [] };
    const listen = (f: Fighter, ev: string, fn: (...args: unknown[]) => void): void => {
      f.on(ev, fn);
      web.hooks.push({ f, ev, fn });
    };
    for (const f of [this.fighter(owner), ...this.targetsOf(owner)]) {
      if (!f) continue;
      listen(f, 'cast', (abilityId: unknown) => {
        const ab = f.element?.abilities.find((a) => a.id === abilityId);
        this.tearWeb(web, WEB_CAST_HIT[ab?.displayKey ?? 'Click'] ?? 15);
      });
    }
    if (this.api.isInvasion && owner === 'player') {
      listen(this.api.player, 'damaged', (amount: unknown) => {
        if (typeof amount === 'number' && amount > 0) this.tearWeb(web, amount);
      });
    }
    // The dead: grey, bloodless bodies of other elements, hanging from the top of the web.
    const { scene } = this.api;
    const b = this.api.bounds;
    const ids = [...CORPSE_IDS].sort(() => Math.random() - 0.5);
    CORPSE_AT.forEach((at, i) => {
      const key = `elem-${ids[i]}`;
      const img = scene.textures.exists(key)
        ? scene.add.image(0, 0, key).setDisplaySize(CORPSE_R * 2, CORPSE_R * 2).setTint(STRING.corpse).setAlpha(0.92).setDepth(9.4)
        : null;
      web.corpses.push({ img, ax: b.left + (b.right - b.left) * at, ay: b.top + 2, len: CORPSE_DROP[i], phase: Math.random() * TAU });
    });
    side.web = web;
    this.fx(owner).tombWrap(b.centerX, b.top + 40, 60);
    this.announce(b.centerX, b.top + 60, '🕸️ SPINAL SNAP', STRING.silkShade, 14);
    Sfx.playAt('tentacle', b.centerX, { rate: 0.6, volume: 0.8 });
  }

  private tearWeb(web: Web, amount: number): void {
    if (this.side(web.owner).web !== web) return;
    // Only the spider's sim lets it break; the other machine holds it at a thread until told.
    web.hp = Math.max(this.simulates(web.owner) ? 0 : 1, web.hp - amount);
    web.flash = 1;
    web.dirty = true;
    if (web.hp <= 0) this.breakWeb(web.owner, true);
  }

  /** Unhook the web's listeners and take its dead down. */
  private dropWeb(web: Web | null): void {
    if (!web) return;
    for (const h of web.hooks) h.f.off(h.ev, h.fn);
    web.hooks = [];
    for (const c of web.corpses) c.img?.destroy();
    web.corpses = [];
  }

  /**
   * The web goes. Broken (`payoff`), every enemy takes the hit and is Infested; faded out unfought,
   * it just comes down.
   */
  private breakWeb(owner: Owner, payoff: boolean): void {
    const side = this.side(owner);
    const web = side.web;
    if (!web) return;
    side.web = null;
    // The dead fall out of it.
    for (const c of web.corpses) {
      if (!c.img) continue;
      const img = c.img;
      c.img = null;
      this.api.scene.tweens.add({
        targets: img, y: img.y + 260, angle: (Math.random() - 0.5) * 120, alpha: 0, duration: 800, ease: 'Quad.easeIn',
        onComplete: () => img.destroy(),
      });
    }
    this.dropWeb(web);
    this.webGfx?.clear();
    const other = this.side(owner === 'player' ? 'npc' : 'player').web;
    if (other) other.dirty = true;
    const b = this.api.bounds;
    this.fx(owner).webBreak(b);
    Sfx.playAt('whip', b.centerX, { rate: 0.6, volume: 0.9 });
    if (!payoff || !this.simulates(owner)) return;
    Sfx.playAt('slash', b.centerX, { rate: 0.6, volume: 0.9 });
    for (const t of this.targetsOf(owner)) {
      this.hurt(owner, t, WEB_BREAK_DMG);
      t.stringInfestedUntil = Math.max(t.stringInfestedUntil, Date.now() + INFEST_MS);
      this.touched.add(t);
      this.infest.set(t, { owner, next: this.now + 500 });
      this.announce(t.x, t.y - 50, '🕷️ INFESTED', STRING.silkShade, 12);
    }
    this.relay(owner, 'string-webbreak');
  }

  private updateWeb(owner: Owner, dt: number): void {
    const web = this.side(owner).web;
    if (!web) return;
    if (this.now > web.until || !this.aliveSpider(owner)) { this.breakWeb(owner, false); return; }
    if (web.flash > 0) { web.flash = Math.max(0, web.flash - dt * 4); web.dirty = true; }
  }

  /** Infested hosts on this sim: every couple of seconds a spider crawls out of them. */
  private updateInfest(): void {
    for (const [f, inf] of [...this.infest]) {
      if (!this.alive(f) || Date.now() >= f.stringInfestedUntil) { this.infest.delete(f); continue; }
      if (this.now < inf.next) continue;
      inf.next = this.now + BROOD_EVERY_MS + Math.random() * BROOD_JITTER_MS;
      this.spawnBrood(inf.owner, f.x, f.y, f, false);
      if (f === this.api.npc) this.relay(inf.owner, `string-brood:${Math.round(this.mx(f.x))}:${Math.round(f.y)}`);
    }
  }

  private spawnBrood(owner: Owner, x: number, y: number, host: Fighter | null, visual: boolean): void {
    this.ensureLayers();
    const gate = new Map<Fighter, number>();
    if (host) gate.set(host, this.now + BROOD_HOST_GRACE_MS);
    this.spiders.push({
      owner, strand: null, d: 0, dir: 1, x, y, ang: Math.random() * TAU, phase: Math.random() * TAU,
      until: this.now + BROOD_MS, looseUntil: this.now + BROOD_MS, vx: 0, vy: 0, nextTurn: 0, gate,
      visual, scale: BROOD_SCALE, bewitched: false, nextSpit: 0, brood: true, nextHop: this.now + 300,
    });
    this.fx(owner).broodBurst(x, y);
    Sfx.playAt('stab', x, { rate: 2.2, volume: 0.25 });
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
        born: this.now, nodes: this.makeNodes({ x: cx, y: cy }, { x: ax, y: ay }), seed: Math.random() * 999, metal: false,
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
      || this.puppets.size || this.sides.player.tomb || this.sides.npc.tomb || this.playerAvatar
      || this.wads.length || this.infest.size || this.sides.player.web || this.sides.npc.web
      || this.sides.player.swing || this.sides.npc.swing || this.tails.player || this.tails.npc;
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    this.updateTails();
    const dt = Math.min(0.05, delta / 1000);
    this.vizT += dt;

    this.updateHooks(dt);
    this.updateBars(dt);
    this.updateExpiry();
    this.updateContacts(dt);
    this.updateHexTouch();
    this.updateShots(dt);
    this.updateSteering();
    for (const owner of BOTH) {
      this.updateTomb(owner, dt);
      this.updateSwing(owner);
      this.updateWeb(owner, dt);
    }
    this.botHexSnap();
    this.botSpool();
    this.updateInfest();
    const bodies = this.allFighters().filter((f) => this.alive(f));
    for (const s of this.strands) this.stepRope(s, dt, bodies);
    this.updateSpiders(dt);
    this.updateWads(dt);
    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /**
   * The bot snaps its own hex strand once someone is caught in it and it has had time to slow them.
   * With Spider Swing it also snaps a wall-tied one to get away: low, the target close, and the far
   * end well clear of them.
   */
  private botHexSnap(): void {
    if (!this.isString('npc') || !this.simulates('npc')) return;
    const s = this.hexOf('npc');
    const bot = this.api.npc;
    if (!s || !this.alive(bot) || this.now - s.born < NPC_HEX_MIN_AGE_MS) return;
    if (!this.canAct(bot, 'other')) return;
    if (this.npcHexCaught(s) || this.npcSwingAway(s)) this.recastHex('npc', s);
  }

  private npcSwingAway(s: Strand): boolean {
    if (!this.up('npc', 'r') || s.tied) return false;
    const bot = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t || bot.hp / bot.maxHp >= NPC_SWING_HP) return false;
    if (Phaser.Math.Distance.Between(bot.x, bot.y, t.x, t.y) > NPC_SWING_THREAT) return false;
    const e = this.endOf(s);
    return Phaser.Math.Distance.Between(e.x, e.y, t.x, t.y) > NPC_SWING_AWAY;
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
      } else if (s.metal) {
        metalLine(rope, tint, pts, t + s.seed, 1, s.strain / METAL_SNAP_STRAIN, s.shots);
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
      else if (h.metal) metalLine(rope, tint, [from, mid, { x: h.x, y: h.y }], t, 0.95, 0, 0);
      else ropeLine(rope, tint, [from, mid, { x: h.x, y: h.y }], 2.4, 0.95);
      hookTip(rope, tint, h.x, h.y, Math.atan2(h.vy, h.vx), 1, h.kind === 'hex');
    }
    for (const b of this.bars) controlBar(rope, this.col(b.owner), b.x, b.y, b.spin, 1.15, 1);
    for (const sp of this.spiders) {
      const fade = sp.strand ? Math.min(1, (sp.until - this.now) / 300) : Math.min(1, (sp.looseUntil - this.now) / 400);
      if (sp.bewitched) bewitchedHalo(rope, this.col(sp.owner), sp.x, sp.y, t + sp.phase, Math.max(0, fade));
      spiderBody(rope, this.col(sp.owner), sp.x, sp.y, sp.ang, sp.phase, sp.scale, Math.max(0, fade), !sp.strand && !sp.bewitched);
    }
    for (const w of this.wads) webWad(rope, this.col(w.owner), w.x, w.y, Math.atan2(w.vy, w.vx), t, 1);
    this.paintUpgrades(rope, top, t);
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

  /** Spool, swing line, the arena web and its dead, and the spiders on Infested hosts. */
  private paintUpgrades(rope: Phaser.GameObjects.Graphics, top: Phaser.GameObjects.Graphics, t: number): void {
    // The lattice is one layer for both sides' webs, repainted only when one of them changed.
    const webs = BOTH.map((o) => this.side(o).web).filter((w): w is Web => !!w);
    if (this.webGfx && webs.some((w) => w.dirty)) {
      this.webGfx.clear();
      for (const w of webs) {
        w.dirty = false;
        webCover(this.webGfx, this.col(w.owner), this.api.bounds, 1 - w.hp / WEB_HP, w.flash, 1);
      }
    }
    for (const owner of BOTH) {
      const side = this.side(owner);
      const f = this.fighter(owner);
      const tint = this.col(owner);
      if (side.spoolSince && this.alive(f)) {
        const aim = this.aimOf(owner);
        const a = Math.atan2(aim.y - f.y, aim.x - f.x);
        spoolCharge(top, tint, f.x + Math.cos(a) * 22, f.y - 4 + Math.sin(a) * 22, Math.min(1, (this.now - side.spoolSince) / SPOOL_MS), t, 1);
      }
      if (side.swing && this.alive(f)) {
        silkLine(rope, tint, [{ x: f.x, y: f.y - 4 }, { x: side.swing.ax, y: side.swing.ay }], 1);
        hitKnot(rope, tint, side.swing.ax, side.swing.ay, Math.atan2(f.y - side.swing.ay, f.x - side.swing.ax), 1, true);
      }
      const web = side.web;
      if (!web) continue;
      const b = this.api.bounds;
      web.corpses.forEach((c, i) => {
        const sway = Math.sin(t * 0.9 + c.phase) * 0.16 + Math.sin(t * 2.3 + i) * 0.03 * web.flash * 4;
        const x = c.ax + Math.sin(sway) * c.len;
        const y = c.ay + Math.cos(sway) * c.len;
        c.img?.setPosition(x, y).setRotation(-sway * 0.8);
        corpseWrap(top, tint, c.ax, c.ay, x, y, CORPSE_R, -sway * 0.8, 1);
      });
      webBar(top, tint, b.centerX, b.top + 30, web.hp / WEB_HP, 0.9);
    }
    // Infested: small spiders crawling over the host.
    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!this.alive(f) || wall >= f.stringInfestedUntil) continue;
      const owner = this.infest.get(f)?.owner ?? (f === this.api.player ? 'npc' : 'player');
      const r = this.bodyR(f);
      for (let i = 0; i < 3; i++) {
        const a = t * (1.4 + i * 0.3) + i * 2.1;
        const x = f.x + Math.cos(a) * r * 0.8;
        const y = f.y + Math.sin(a) * r * 0.7;
        spiderBody(top, this.col(owner), x, y, a + Math.PI / 2, t * 20 + i, 0.75, f.alpha * 0.95, true);
      }
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
      av.setHold(this.spidering(owner) || this.side(owner).spoolSince ? 'draw' : null, Math.atan2(aim.y - f.y, aim.x - f.x));
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
    const web = this.sides.player.web;
    set('string-web', playerIs && web ? {
      name: 'Spinal Snap', emoji: '🕸️', color: STRING.silkShade, priority: 154,
      description: `Your web hangs over the arena. Every attack anyone makes tears it; when it breaks every enemy takes ${WEB_BREAK_DMG} and is Infested. ${Math.ceil(web.hp)} HP left.`,
      count: Math.ceil(web.hp),
      until: web.until,
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

  /** Click+: the kit is winding the bot's metal string; it holds its plain throws until it fires. */
  npcStringSpooling(): boolean {
    return this.sides.npc.spoolSince > 0;
  }

  /** F+: the target is the bot's puppet, so every cast is also their own ability turned on them. */
  npcStringPuppetPlay(): boolean {
    if (!this.up('npc', 'f')) return false;
    for (const [v, p] of this.puppets) if (p.owner === 'npc' && this.alive(v) && this.now <= p.until) return true;
    return false;
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
