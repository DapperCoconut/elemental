import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { FormRevertTarget } from '../../combat/FormRevert';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  CLT, ClothAvatar, ClothColorFn, ClothFx, bolaGlyph, burnScrap, clothWrap, clothesline, effigy,
  flameTongue, jacketGlyph, needleGlyph, pinGlyph, pincushion, scarfArm, scarfHand,
} from './ClothVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

// ── The scarf hand (Click, passive) ──────────────────────────────────────────
/** How far the scarf reaches. Everything else in the element is measured against this. */
const HAND_MAX = 250;
const HAND_MIN = 20;
/** Father of the Flame: the claw reaches anywhere in the arena. */
const HAND_MAX_EFFIGY = 2400;
/** How hard the hand springs after its target. The lag is what makes the scarf read as cloth. */
const HAND_SPRING = 16;
/** Reaching this close to an arena edge counts as gripping the wall rather than the floor. */
const WALL_BAND = 54;
/** Pixels of body movement per pixel of mouse movement while a grip is taking weight. */
const DRAG_GAIN = 1;
/** A wall gives the scarf something to pull against; the floor only gives it something to slide on. */
const WALL_DRAG_GAIN = 1.35;
const DRAG_MAX_SPEED = 560;
/** Wind the cursor this far past the grip and the scarf tears loose. */
const SLIP_DIST = HAND_MAX * 1.75;

const PUNCH_DAMAGE = 20;
const PUNCH_R = 36;
const SMACK_DAMAGE = 14;
const SMACK_R = 32;
/** Hand speed, px/s, at which a passing hand counts as a smack rather than a wave. */
const SMACK_SPEED = 620;
const SMACK_GATE_MS = 520;
const GRAB_R = 34;
/** Q+: the char claw. */
const CLAW_PUNCH_BONUS = 15;
const CLAW_SMACK_BONUS = 10;

const THROW_GAIN = 1.15;
const THROW_MIN_SPEED = 360;
const THROW_MAX_SPEED = 980;

// ── Needle Nexus (E) ─────────────────────────────────────────────────────────
const NEEDLE_COUNT = 3;
const NEEDLE_LEN = 36;
const NEEDLE_DAMAGE = 26;
/** Burning Man: red-hot needles. */
const NEEDLE_HOT_MULT = 1.5;
/** A needle that lands out of the sky on somebody. */
const NEEDLE_DROP_DAMAGE = 8;
const NEEDLE_FALL_MS = 420;
const NEEDLE_FLIGHT_MS = 1300;
/** Needles persist, so without a ceiling a patient player carpets the arena in them. */
const NEEDLE_MAX = 6;
const NEEDLE_GRAB_R = GRAB_R + 10;

// ── Needle Bombs (E+) ────────────────────────────────────────────────────────
const BOMB_PINS = 9;
const BOMB_SPREAD = 0.95;
const BOMB_PIN_DAMAGE = 6;

// ── Pins in the air (bombs, cushions, retaliation) ──────────────────────────
const PIN_SPEED = 520;
const PIN_LIFE_MS = 460;
const PIN_HIT_R = 18;

// ── Constraining Cloth (R) ───────────────────────────────────────────────────
const BOLA_SPEED = 600;
const BOLA_LIFE_MS = 1000;
const BOLA_DAMAGE = 10;
const BOLA_HIT_R = 26;
const WRAP_MS = 5000;
const WRAP_SLOW_MULT = 0.45;
const WALL_SLAM_DAMAGE = 30;
const WALL_STUCK_MS = 2500;
/** How long a thrown body stays "in flight" and able to earn the wall slam. */
const FLUNG_MS = 1400;
/** Burning Man: those stuck in your cloth burn while it lasts. */
const WRAP_BURN_DPS = 10;
/** R+ — Mystical Jacket: how fast the arrow keys drag a jacketed body around. */
const JACKET_STEER_SPEED = 300;

// ── Pincushion (F) ───────────────────────────────────────────────────────────
const CUSHION_PINS = 6;
/** F+ — Recycle. */
const CUSHION_PINS_UP = 8;
const CUSHION_R = 18;
const CUSHION_MS = 20000;
const CUSHION_BARRAGE = 14;
const CUSHION_PIN_DAMAGE = 7;
/** How close the tailor's body has to come to be stabbed by their own cushion. */
const CUSHION_TOUCH_R = 30;
const CUSHION_PUNCH_GATE_MS = 320;
const PINNED_CHARGES = 3;
const PINNED_MS = 12000;
const RETALIATE_DAMAGE = 12;
const RETALIATE_PINS = 10;
/** Hits smaller than this (burn and poison ticks) do not spend a Pinned charge. */
const PINNED_MIN_HIT = 3;
/** Burning cushions spit a burst on this beat until they are empty. */
const CUSHION_BURN_BEAT_MS = 650;
const CUSHION_BURN_PINS = 8;

// ── Burning Man (Q) ──────────────────────────────────────────────────────────
const BURN_MAN_MS = 6000;
const SCRAP_EVERY_MS = 150;
const SCRAP_DAMAGE = 6;
const SCRAP_LIFE_MS = 1000;
const SCRAP_R = 16;
/** The kit's own burn: scraps, hot needles and the effigy all set it. */
const IGNITE_MS = 2500;
const IGNITE_DPS = 4;

// ── Father of the Flame (Q+) ─────────────────────────────────────────────────
const EFFIGY_SIZE = 1.35;
const EFFIGY_IGNITE_MS = 3000;
const EFFIGY_IGNITE_DPS = 8;
const EFFIGY_EMBERS = 7;
const EFFIGY_GATE_MS = 250;

// ── Clotheslines (Click+) ────────────────────────────────────────────────────
/** How close to a line the hand has to land to catch it. Kept tight so the floor stays grabbable. */
const LINE_BAND = 22;
const LINE_SPEED = 680;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_STEER_TOWARD_R = 60;

// ── World objects ────────────────────────────────────────────────────────────

/**
 * A needle out of the sky, or a caught shot balled up in cloth. They share a struct for the same
 * reason Slime's ball and a caught shot do: from the hand's point of view both are a thing lying
 * around that can be picked up, aimed and let go of.
 */
interface Needle {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  state: 'falling' | 'ground' | 'wall' | 'flying';
  /** Game-clock time a falling needle lands, or a thrown one gives up and drops. */
  at: number;
  /** E+ wraps every throw in an exploding bundle of cloth. */
  wrapped: boolean;
  /** Caught enemy fire, balled up in wool. Deals its own damage and is spent once thrown. */
  stolen: boolean;
  damage: number;
  seed: number;
  hit: Set<Fighter>;
}

interface Pin {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  damage: number;
  hot: boolean;
  /** Replica pins are pictures — the owner's machine settles every hit. */
  visual: boolean;
  hit: Set<Fighter>;
}

interface Bola {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  jacket: boolean;
  spin: number;
  visual: boolean;
}

interface Wrap {
  owner: Owner;
  until: number;
  jacket: boolean;
  /** Told about by the owner's machine: the slow already arrives through the mirrored speed. */
  net: boolean;
  seed: number;
}

interface Cushion {
  owner: Owner;
  x: number;
  y: number;
  pins: number;
  max: number;
  purple: boolean;
  until: number;
  burning: boolean;
  nextBurstAt: number;
  squash: number;
  punchGate: number;
  seed: number;
  /** Was the tailor's body already on it last frame — a touch is a crossing, not a tick. */
  touching: boolean;
}

interface Scrap {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  diesAt: number;
  seed: number;
  visual: boolean;
  hit: Set<Fighter>;
}

interface Line {
  /** Horizontal lines are strung wall to wall at a fixed y; vertical ones at a fixed x. */
  vertical: boolean;
  at: number;
  seed: number;
}

interface Burn {
  owner: Owner;
  until: number;
  dps: number;
  acc: number;
}

interface Held {
  kind: 'needle' | 'body';
  needle: Needle | null;
  victim: Fighter | null;
}

interface Side {
  aimX: number;
  aimY: number;
  /** The hand — simulated here, sprung after its target, and the hitbox for everything it does. */
  handX: number;
  handY: number;
  handVx: number;
  handVy: number;
  handSeeded: boolean;

  anchored: boolean;
  anchorX: number;
  anchorY: number;
  anchorWall: boolean;

  held: Held | null;
  riding: { line: Line; dir: number } | null;

  /** Burning Man: game-clock end, and whether this one is the Father of the Flame. */
  burnUntil: number;
  effigy: boolean;
  nextScrapAt: number;
  effigyGate: number;

  /** Stabbed by your own cushion: the next few hits are answered with pins. */
  pinnedCharges: number;
  pinnedUntil: number;

  cushion: Cushion | null;

  prevMouseX: number;
  prevMouseY: number;
  haveMouse: boolean;
  smackGate: Map<Fighter, number>;

  /** R+: the arrow-key vector a jacketed body is being dragged along. */
  steerX: number;
  steerY: number;
  /** Online: the last steer and the last carry we told the other machine about. */
  sentSteer: string;
  nextHoldSendAt: number;

  /** The bot's stand-in for dragging: a haul cycle that makes it lurch rather than walk. */
  haul: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0,
    handX: 0, handY: 0, handVx: 0, handVy: 0, handSeeded: false,
    anchored: false, anchorX: 0, anchorY: 0, anchorWall: false,
    held: null, riding: null,
    burnUntil: 0, effigy: false, nextScrapAt: 0, effigyGate: 0,
    pinnedCharges: 0, pinnedUntil: 0,
    cushion: null,
    prevMouseX: 0, prevMouseY: 0, haveMouse: false, smackGate: new Map(),
    steerX: 0, steerY: 0, sentSteer: '0:0', nextHoldSendAt: 0,
    haul: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface ClothArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. The hand and the Recycle cushion both fish shots out of it. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local projectiles that never enter the shared group. Half the roster fires only here. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** R+: the arrow keys steer whoever is wearing the Mystical Jacket. */
  get upKey(): Phaser.Input.Keyboard.Key;
  get downKey(): Phaser.Input.Keyboard.Key;
  get leftKey(): Phaser.Input.Keyboard.Key;
  get rightKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  /** Space dodge in progress. The dash owns the body for its duration, scarf or no scarf. */
  get isDodging(): boolean;
  /** Online PvP or co-op: the npc slot is a person whose own machine settles their hits. */
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  get width(): number;
  get height(): number;
  /** Skins: maps a Cloth visual colour through that side's equipped skin. */
  clothColor(owner: Owner, base: number): number;
  /** Skins: the equipped skin id for that side, or null. */
  skinId(owner: Owner): string | null;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** Shop upgrades, per side — the npc half is the online opponent's or the bot's loadout. */
  hasUpgrade(owner: Owner, slot: string): boolean;
}

// ── ClothKit ─────────────────────────────────────────────────────────────────

/**
 * Cloth — a tailor with one long arm, and the arm is their scarf.
 *
 * The scarf hand is Slime's hand in wool: hold Click on the floor or a wall to grip, drag the mouse
 * and the scarf hauls the body the other way. It is the legs, the punch, the pickpocket that
 * catches a shot out of the air, and the hand that carries everything the rest of the kit puts on
 * the floor — needles out of the sky (E), a body tied up by the bola (R). The pincushion (F) is the
 * one object it does not carry: it punches it, and the cushion answers with a barrage.
 *
 * The cushion is also how the tailor arms themself. Walk into it and three pins go into you; the
 * next three hits you take each throw a ring of pins back out and stab whoever landed them.
 *
 * Burning Man (Q) sets all of it alight for six seconds — the scarf sheds burning scraps, needles
 * go red-hot, bound bodies burn, and the cushion catches and spits its pins out on its own until it
 * is empty. Q+ makes the tailor the Father of the Flame: a towering effigy whose claw reaches the
 * whole arena and whose wounds burn whoever gave them.
 *
 * Online, the owner's machine settles every hit. Throws, wraps, carries, the jacket's steering, a
 * cushion punch and the self-pin travel as `cloth-*` pseudo-casts; replica-owned objects here are
 * pictures that touch nobody.
 */
export class ClothKit implements SummonPurgeTarget, FormRevertTarget {
  private api: ClothArenaApi;

  // ── Visuals ──
  private readonly pcol: ClothColorFn;
  private readonly ncol: ClothColorFn;
  private readonly pfx: ClothFx;
  private readonly nfx: ClothFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Cushions, needles lying about, grips — beneath the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The effigy's robe — over the floor, under the ball it stands round. */
  private backGfx: Phaser.GameObjects.Graphics | null = null;
  /** The scarf arm and its hand — over the body, under the eyes and the collar. */
  private armGfx: Phaser.GameObjects.Graphics | null = null;
  /** Thrown needles, the bola, pins, scraps, wrappings and the clotheslines — over everything. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private needles: Needle[] = [];
  private pins: Pin[] = [];
  private bolas: Bola[] = [];
  private scraps: Scrap[] = [];
  private lines: Line[] = [];
  private wraps = new Map<Fighter, Wrap>();
  private burns = new Map<Fighter, Burn>();
  /**
   * Bodies mid-throw, watching for a wall. The velocity is re-applied every frame because the AI
   * writes its own the moment `doAI` runs, which is *before* this kit updates.
   */
  private flung = new Map<Fighter, { owner: Owner; until: number; vx: number; vy: number }>();
  private stuckUntil = new Map<Fighter, { owner: Owner; until: number }>();
  /** Online: the other tailor is carrying our body to this point. */
  private carriedTo: { x: number; y: number; until: number } | null = null;
  /** Everything this kit has written `walkSpeedMult` onto, so `reset` can hand it all back. */
  private touchedWalk = new Set<Fighter>();
  /** Fighters this kit is listening to for hits (the self-pin and the effigy both answer them). */
  private listening = new Map<Fighter, (amount: number) => void>();
  private sized = new Set<Fighter>();
  private pointerDown = false;
  private mouseDX = 0;
  private mouseDY = 0;

  constructor(api: ClothArenaApi) {
    this.api = api;
    this.pcol = (base) => api.clothColor('player', base);
    this.ncol = (base) => api.clothColor('npc', base);
    this.pfx = new ClothFx(api.scene, this.pcol);
    this.nfx = new ClothFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): ClothFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): ClothColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): BaseAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private clothAvatar(owner: Owner): ClothAvatar | null {
    const av = this.avatar(owner);
    return av instanceof ClothAvatar ? av : null;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isCloth(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'cloth' : this.api.npcElementId === 'cloth';
  }

  /** An online opponent's body (or a co-op ally's): drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  /** Whether this machine decides what this side's objects do. */
  private simulates(owner: Owner): boolean {
    return !this.isReplica(owner);
  }

  /** A shop upgrade, but only for a side that is actually playing Cloth. */
  private up(owner: Owner, slot: string): boolean {
    return this.isCloth(owner) && this.api.hasUpgrade(owner, slot);
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
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

  /** Is this point close enough to an arena edge to count as a wall? */
  private isWall(x: number, y: number): boolean {
    return x - this.left < WALL_BAND || this.right - x < WALL_BAND
      || y - this.top < WALL_BAND || this.bottom - y < WALL_BAND;
  }

  private onWall(f: Fighter, pad = 6): boolean {
    return f.x <= this.left + pad || f.x >= this.right - pad || f.y <= this.top + pad || f.y >= this.bottom - pad;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline && !this.api.isInvasion) this.api.broadcast(id);
  }

  /** Online coordinates are mirrored left-to-right between the two machines. */
  private mx(x: number): number { return this.api.width - x; }

  /** One hit from this element. Never self-inflicted, so shields and wards may answer it. */
  private hurt(owner: Owner, victim: Fighter, amount: number, flash: number): void {
    if (!this.alive(victim) || amount <= 0) return;
    const src = this.fighter(owner);
    Fighter.asNonAllyDamage(() => victim.takeDamage(Math.max(1, Math.round(amount)),
      { source: src, sourceX: src?.x, sourceY: src?.y }));
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(flash));
  }

  private burning(owner: Owner): boolean {
    return this.now < this.side(owner).burnUntil;
  }

  private effigyOn(owner: Owner): boolean {
    return this.burning(owner) && this.side(owner).effigy;
  }

  private reach(owner: Owner): number {
    return this.effigyOn(owner) ? HAND_MAX_EFFIGY : HAND_MAX;
  }

  /** Where the hand is. Before the first tick of a match it stands in at the aim, clamped. */
  private handPoint(owner: Owner): { x: number; y: number } {
    const s = this.side(owner);
    if (s.handSeeded) return { x: s.handX, y: s.handY };
    const f = this.fighter(owner);
    if (!f) return { x: s.aimX, y: s.aimY };
    const d = Phaser.Math.Clamp(Math.hypot(s.aimX - f.x, s.aimY - f.y) || 1, HAND_MIN, this.reach(owner));
    const a = Math.atan2(s.aimY - f.y, s.aimX - f.x);
    return { x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d };
  }

  /** Where the scarf leaves the body: the collar, on the crown. */
  private collar(owner: Owner): { x: number; y: number } {
    const f = this.fighter(owner);
    const k = this.effigyOn(owner) ? EFFIGY_SIZE : 1;
    return { x: f.x, y: f.y - 14 * k };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const [f, fn] of this.listening) f.off('damaged', fn);
    this.listening.clear();
    for (const f of this.touchedWalk) {
      if (f && f.active) f.walkSpeedMult = 1;
    }
    this.touchedWalk.clear();
    for (const f of this.sized) {
      if (f && f.active) { f.oozeSizeMult = 1; f.applySizeMult(); }
    }
    this.sized.clear();

    this.sides = { player: makeSide(), npc: makeSide() };
    this.needles = [];
    this.pins = [];
    this.bolas = [];
    this.scraps = [];
    this.lines = [];
    this.wraps.clear();
    this.burns.clear();
    this.flung.clear();
    this.stuckUntil.clear();
    this.carriedTo = null;
    this.pointerDown = false;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.backGfx?.destroy(); this.backGfx = null;
    this.armGfx?.destroy(); this.armGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;

    for (const id of ['cloth-hand', 'cloth-needles', 'cloth-pinned', 'cloth-burning-man', 'cloth-cushion',
      'cloth-wrapped', 'cloth-stuck', 'cloth-burn']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  /** The clotheslines, hung once: they belong to the arena, not to a cast. */
  private ensureLines(): void {
    if (this.lines.length) return;
    const owns = this.up('player', 'click') || this.up('npc', 'click');
    if (!owns) return;
    const h = this.bottom - this.top;
    const w = this.right - this.left;
    this.lines.push({ vertical: false, at: this.top + h * 0.3, seed: 2 });
    this.lines.push({ vertical: false, at: this.top + h * 0.7, seed: 5 });
    this.lines.push({ vertical: true, at: this.left + w * 0.3, seed: 8 });
    this.lines.push({ vertical: true, at: this.left + w * 0.7, seed: 11 });
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.backGfx) this.backGfx = scene.add.graphics().setDepth(4.6);
    if (!this.armGfx) this.armGfx = scene.add.graphics().setDepth(5.8);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene) ?? new ClothAvatar(this.api.scene, this.col(owner));
  }

  private ensureAvatars(): void {
    if (this.isCloth('player') && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (this.isCloth('npc') && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
  }

  /** The self-pin and the effigy both answer hits, so each tailor is listened to. */
  private ensureListeners(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f || !this.isCloth(owner) || this.listening.has(f)) continue;
      const fn = (amount: number) => { if (amount > 0) this.onHurt(owner, amount); };
      f.on('damaged', fn);
      this.listening.set(f, fn);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'cloth') return;
    this.ensureLayers();
    this.ensureAvatars();

    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    if (s.haveMouse) {
      this.mouseDX = mouseX - s.prevMouseX;
      this.mouseDY = mouseY - s.prevMouseY;
    }
    s.prevMouseX = mouseX;
    s.prevMouseY = mouseY;
    s.haveMouse = true;

    const p = this.api.player;
    const justDown = pointer.isDown && !this.pointerDown;
    const justUp = !pointer.isDown && this.pointerDown;
    this.pointerDown = pointer.isDown;
    if (!this.alive(p)) return;

    if (justDown) this.pressHand('player');
    if (justUp) this.letGo('player', true);

    // R+: the arrow keys. Read every frame; `updateSteering` tells the other machine on a change.
    s.steerX = (this.api.rightKey.isDown ? 1 : 0) - (this.api.leftKey.isDown ? 1 : 0);
    s.steerY = (this.api.downKey.isDown ? 1 : 0) - (this.api.upKey.isDown ? 1 : 0);

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('cloth-needle-nexus', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('cloth-constraining-cloth', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('cloth-pincushion', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('cloth-burning-man', ctx);
  }

  /**
   * The click, resolved against whatever the hand happens to be over. Things that can be *carried*
   * outrank things that can be *hit*: a player reaching for a needle at the enemy's feet meant the
   * needle.
   */
  private pressHand(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.held || s.anchored || s.riding) return;
    const { x: hx, y: hy } = this.handPoint(owner);

    // 1 — a body we have tied up.
    for (const [victim, w] of this.wraps) {
      if (w.owner !== owner || !this.alive(victim)) continue;
      if (Phaser.Math.Distance.Between(hx, hy, victim.x, victim.y) > GRAB_R + 14) continue;
      s.held = { kind: 'body', needle: null, victim };
      this.flung.delete(victim);
      this.stuckUntil.delete(victim);
      this.api.showFloatingText(victim.x, victim.y - 40, '🫳 GRABBED', this.hex(CLT.clothLit));
      Sfx.playAt('stretch', victim.x, { rate: 0.85, volume: 0.9 });
      return;
    }

    // 2 — one of our needles, on the floor or stuck in a wall.
    let best: Needle | null = null;
    let bestD = NEEDLE_GRAB_R;
    for (const n of this.needles) {
      if (n.owner !== owner || (n.state !== 'ground' && n.state !== 'wall')) continue;
      const d = Phaser.Math.Distance.Between(hx, hy, n.x, n.y);
      if (d <= bestD) { best = n; bestD = d; }
    }
    if (best) {
      const fromWall = best.state === 'wall';
      s.held = { kind: 'needle', needle: best, victim: null };
      best.state = 'ground';
      Sfx.playAt(fromWall ? 'nail' : 'clang', best.x, { rate: 1.5, volume: 0.45 });
      return;
    }

    // 3 — our pincushion. The hand does not pick it up: it punches it, and the cushion fires.
    const c = s.cushion;
    if (c && Phaser.Math.Distance.Between(hx, hy, c.x, c.y) <= GRAB_R + CUSHION_R) {
      this.punchCushion(owner, c);
      return;
    }

    // 4 — an enemy shot passing through the hand. Caught in a fold of wool, and ours to throw.
    const caught = this.catchShot(owner, hx, hy, GRAB_R);
    if (caught !== null) {
      const n: Needle = {
        owner, x: hx, y: hy, ang: 0, vx: 0, vy: 0, state: 'ground', at: 0,
        wrapped: false, stolen: true, damage: caught, seed: Math.random() * 999, hit: new Set(),
      };
      this.needles.push(n);
      s.held = { kind: 'needle', needle: n, victim: null };
      this.fx(owner).lint(hx, hy, 8, 18);
      this.api.showFloatingText(hx, hy - 26, `🫳 CAUGHT ${caught}`, this.hex(CLT.clothPale));
      Sfx.playAt('boing', hx, { rate: 1.2, volume: 0.8 });
      return;
    }

    // 5 — somebody standing in the hand: the punch, and the only part of the click with a cooldown.
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(hx, hy, t.x, t.y) > PUNCH_R) continue;
      if (owner === 'player') {
        this.api.player.castAbility('cloth-scarf-hand', this.api.buildPlayerContext(t.x, t.y));
      } else {
        this.doGrab('npc', t.x, t.y);
      }
      return;
    }

    // 6 — a clothesline (Click+). Catch it and it hauls you along it until a wall stops you.
    // The Father of the Flame is rooted: no lines to ride and no floor worth gripping.
    if (this.effigyOn(owner)) return;

    if (this.up(owner, 'click') && owner === 'player') {
      let line: Line | null = null;
      let lineD = LINE_BAND;
      for (const l of this.lines) {
        const d = l.vertical ? Math.abs(hx - l.at) : Math.abs(hy - l.at);
        if (d <= lineD) { line = l; lineD = d; }
      }
      if (line) {
        const along = line.vertical ? (hy - f.y) || (s.aimY - f.y) : (hx - f.x) || (s.aimX - f.x);
        s.riding = { line, dir: Math.sign(along) || 1 };
        this.fx(owner).grip(hx, hy, false);
        this.api.showFloatingText(f.x, f.y - 50, '🧺 CLOTHESLINE', this.hex(CLT.brassLit));
        Sfx.playAt('whoosh', f.x, { rate: 1.4, volume: 0.8 });
        return;
      }
    }

    // 7 — the floor, or a wall. This is how the element walks.
    s.anchored = true;
    s.anchorX = Phaser.Math.Clamp(hx, this.left, this.right);
    s.anchorY = Phaser.Math.Clamp(hy, this.top, this.bottom);
    s.anchorWall = this.isWall(s.anchorX, s.anchorY);
    this.fx(owner).grip(s.anchorX, s.anchorY, s.anchorWall);
    Sfx.playAt('stretch', s.anchorX, { rate: s.anchorWall ? 1.1 : 1.4, volume: 0.4 });
  }

  /** Let go of whatever the hand has. `throwIt` is false when the hand was taken from us. */
  private letGo(owner: Owner, throwIt: boolean): void {
    const s = this.side(owner);
    s.anchored = false;
    if (s.riding) {
      s.riding = null;
      const f = this.fighter(owner);
      if (this.alive(f)) (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    if (!s.held) return;
    const held = s.held;
    s.held = null;
    if (held.kind === 'body') this.relay(owner, 'cloth-drop');
    if (!throwIt) return;
    this.throwHeld(owner, held);
  }

  /** Release. The hand's own velocity is the throw, which is why a flick beats a nudge. */
  private throwHeld(owner: Owner, held: Held): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    let vx = s.handVx * THROW_GAIN;
    let vy = s.handVy * THROW_GAIN;
    let sp = Math.hypot(vx, vy);
    if (sp < THROW_MIN_SPEED) {
      const a = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      vx = Math.cos(a) * THROW_MIN_SPEED;
      vy = Math.sin(a) * THROW_MIN_SPEED;
      sp = THROW_MIN_SPEED;
    }
    if (sp > THROW_MAX_SPEED) {
      vx = (vx / sp) * THROW_MAX_SPEED;
      vy = (vy / sp) * THROW_MAX_SPEED;
    }

    if (held.kind === 'needle' && held.needle) {
      const wrapped = this.up(owner, 'e') && !held.needle.stolen;
      this.launchNeedle(owner, held.needle, s.handX, s.handY, vx, vy, wrapped);
      this.relay(owner, `cloth-throw:${Math.round(this.mx(s.handX))}:${Math.round(s.handY)}:${Math.round(-vx)}:${Math.round(vy)}:${wrapped ? 1 : 0}`);
      return;
    }

    const victim = held.victim;
    if (!victim || !this.alive(victim)) return;
    this.fling(owner, victim, vx, vy);
    this.relay(owner, `cloth-fling:${Math.round(-vx)}:${Math.round(vy)}`);
  }

  /** Online, the other player's body is moved on their machine; here it is only watched. */
  private isRemoteBody(f: Fighter): boolean {
    return f === this.api.npc && this.api.isOnline;
  }

  private fling(owner: Owner, victim: Fighter, vx: number, vy: number): void {
    if (!this.isRemoteBody(victim)) (victim.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
    this.flung.set(victim, { owner, until: this.now + FLUNG_MS, vx, vy });
    this.api.showFloatingText(victim.x, victim.y - 44, '🤾 THROWN', this.hex(CLT.clothLit));
    Sfx.playAt('whoosh', victim.x, { rate: 0.7, volume: 1 });
  }

  private launchNeedle(owner: Owner, n: Needle, x: number, y: number, vx: number, vy: number, wrapped: boolean): void {
    n.x = x;
    n.y = y;
    n.vx = vx;
    n.vy = vy;
    n.ang = Math.atan2(vy, vx);
    n.state = 'flying';
    n.wrapped = wrapped;
    n.hit.clear();
    n.at = this.now + NEEDLE_FLIGHT_MS;
    this.fx(owner).lint(x, y, 4, 10, 260, CLT.clothDeep);
    Sfx.playAt('spear-throw', x, { rate: 1.3, volume: 0.6 });
  }

  /**
   * Pull one enemy shot out of the air, from either of the two places the game keeps them.
   * Returns the damage it would have done, or null if there was nothing there.
   */
  private catchShot(owner: Owner, x: number, y: number, radius: number): number | null {
    const fromPlayer = owner === 'npc';
    for (const obj of [...this.api.projectiles.getChildren()]) {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer !== fromPlayer || p.isHeal) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, x, y) > radius) continue;
      const dmg = Math.max(1, Math.round(p.damage));
      p.destroy();
      return dmg;
    }
    const theirs: Owner = owner === 'player' ? 'npc' : 'player';
    const reg = this.api.projectileRegistry.nearest(theirs, x, y, radius);
    if (!reg) return null;
    const dmg = Math.max(1, Math.round(reg.damage));
    this.api.projectileRegistry.steal(reg);
    return dmg;
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — the punch. Gripping, grabbing and smacking are the free half of the same hand. */
  doGrab(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'cloth-scarf-hand'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    const a = Math.atan2(ty - f.y, tx - f.x);
    const { x: hx, y: hy } = this.handPoint(owner);
    const claw = this.effigyOn(owner);

    // The bot has no cursor, so its click is the decision a player would make with one.
    if (owner === 'npc' && this.simulates('npc')) {
      if (this.botClick(f, s, a)) return;
    }

    let landed = false;
    if (this.simulates(owner)) {
      for (const t of this.targetsOf(owner)) {
        const reachHand = Phaser.Math.Distance.Between(hx, hy, t.x, t.y) <= PUNCH_R;
        const reachBody = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= PUNCH_R + HAND_MIN;
        if (!reachHand && !reachBody) continue;
        this.hurt(owner, t, PUNCH_DAMAGE + (claw ? CLAW_PUNCH_BONUS : 0), claw ? CLT.ember : CLT.clothLit);
        if (claw) this.ignite(owner, t, IGNITE_MS, IGNITE_DPS);
        this.fx(owner).lint(t.x, t.y, 8, 20, 360, claw ? CLT.ember : CLT.cloth);
        landed = true;
      }
    }
    this.avatar(owner)?.play('punch', a);
    Sfx.playAt(landed ? 'hit-medium' : 'whoosh', f.x, { rate: landed ? 0.9 : 1.25, volume: landed ? 0.9 : 0.45 });
  }

  /**
   * The bot's click, in priority order: fling a body it has tied up toward a wall, punch its own
   * cushion when somebody is standing near it, throw a needle it is within reach of. Returns true
   * if the click was spent on one of those.
   */
  private botClick(f: Fighter, s: Side, a: number): boolean {
    const reach = this.reach('npc');
    // A tied-up body in reach goes into the nearest wall.
    for (const [victim, w] of this.wraps) {
      if (w.owner !== 'npc' || !this.alive(victim)) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, victim.x, victim.y) > reach) continue;
      const wall = this.nearestWallDir(victim);
      this.fling('npc', victim, wall.x * 760, wall.y * 760);
      this.avatar('npc')?.play('sweep', a);
      return true;
    }
    // The cushion, with somebody close enough to it to catch the barrage.
    const c = s.cushion;
    if (c && c.pins > 0 && Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= reach
      && this.nearestTarget('npc', c.x, c.y, 190)) {
      this.punchCushion('npc', c);
      this.avatar('npc')?.play('punch', Math.atan2(c.y - f.y, c.x - f.x));
      return true;
    }
    // A needle within reach, thrown at whoever it is fighting.
    const t = this.targetsOf('npc')[0];
    if (!t) return false;
    let best: Needle | null = null;
    let bestD = reach;
    for (const n of this.needles) {
      if (n.owner !== 'npc' || (n.state !== 'ground' && n.state !== 'wall')) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, n.x, n.y);
      if (d <= bestD) { best = n; bestD = d; }
    }
    if (!best) return false;
    const na = Math.atan2(t.y - best.y, t.x - best.x);
    this.launchNeedle('npc', best, best.x, best.y, Math.cos(na) * 700, Math.sin(na) * 700, this.up('npc', 'e'));
    this.avatar('npc')?.play('punch', a);
    return true;
  }

  /** The unit vector from a body toward the nearest arena wall. */
  private nearestWallDir(f: Fighter): { x: number; y: number } {
    const d = [
      { x: -1, y: 0, d: f.x - this.left },
      { x: 1, y: 0, d: this.right - f.x },
      { x: 0, y: -1, d: f.y - this.top },
      { x: 0, y: 1, d: this.bottom - f.y },
    ].sort((p, q) => p.d - q.d)[0];
    return { x: d.x, y: d.y };
  }

  /** E — Needle Nexus: three needles drop out of the sky in front of you. Ammunition, not an attack. */
  doNeedles(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'cloth-needle-nexus'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    // Never evict the one in the hand. Oldest first, so a spammer refreshes rather than being refused.
    const held = this.side(owner).held?.needle ?? null;
    const mine = this.needles.filter((n) => n.owner === owner && n !== held && !n.stolen && n.state !== 'flying');
    while (mine.length > NEEDLE_MAX - NEEDLE_COUNT) {
      const old = mine.shift();
      if (!old) break;
      this.needles = this.needles.filter((n) => n !== old);
    }

    const base = Math.atan2(ty - f.y, tx - f.x);
    const hot = this.burning(owner);
    for (let i = 0; i < NEEDLE_COUNT; i++) {
      // Deterministic, so the other machine's replay drops them in the same places.
      const a = base + (i - 1) * 0.45;
      const d = i === 1 ? 96 : 78;
      const x = Phaser.Math.Clamp(f.x + Math.cos(a) * d, this.left, this.right);
      const y = Phaser.Math.Clamp(f.y + Math.sin(a) * d, this.top, this.bottom);
      this.needles.push({
        owner, x, y, ang: Math.PI / 2 + (i - 1) * 0.25, vx: 0, vy: 0, state: 'falling',
        at: this.now + NEEDLE_FALL_MS + i * 70, wrapped: false, stolen: false,
        damage: NEEDLE_DAMAGE, seed: i * 31 + x, hit: new Set(),
      });
      this.api.scene.time.delayedCall(i * 70, () => this.fx(owner).needleFall(x, y, hot));
    }
    this.avatar(owner)?.play('raise');
    this.api.showFloatingText(f.x, f.y - 48, '🪡 NEEDLE NEXUS', this.hex(CLT.steelLit));
    Sfx.playAt('whoosh', f.x, { rate: 0.7, volume: 0.8 });
  }

  /** R — Constraining Cloth: one bola (or, with R+, a flying jacket) straight down the aim. */
  doBola(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'cloth-constraining-cloth'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const a = Math.atan2(ty - f.y, tx - f.x);
    const jacket = this.up(owner, 'r');
    this.bolas.push({
      owner, x: f.x + Math.cos(a) * 24, y: f.y + Math.sin(a) * 24,
      vx: Math.cos(a) * BOLA_SPEED, vy: Math.sin(a) * BOLA_SPEED,
      diesAt: this.now + BOLA_LIFE_MS, jacket, spin: 0, visual: !this.simulates(owner),
    });
    this.avatar(owner)?.play('sweep', a);
    this.api.showFloatingText(f.x, f.y - 48, jacket ? '🧥 MYSTICAL JACKET' : '🪢 CONSTRAINING CLOTH',
      this.hex(jacket ? CLT.jacketLit : CLT.web));
    Sfx.playAt('whip', f.x, { rate: 0.8, volume: 0.9 });
  }

  /** F — Pincushion: set one down where the hand is. One at a time; a recast replaces it. */
  doCushion(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'cloth-pincushion'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    const purple = this.up(owner, 'f');
    const max = purple ? CUSHION_PINS_UP : CUSHION_PINS;
    // A player sets it where the hand is; a bot (or a replay) a short way along the aim.
    let x: number;
    let y: number;
    if (owner === 'player') {
      const h = this.handPoint('player');
      x = h.x; y = h.y;
    } else {
      const a = Math.atan2(ty - f.y, tx - f.x);
      x = f.x + Math.cos(a) * 46;
      y = f.y + Math.sin(a) * 46;
    }
    x = Phaser.Math.Clamp(x, this.left + CUSHION_R, this.right - CUSHION_R);
    y = Phaser.Math.Clamp(y, this.top + CUSHION_R, this.bottom - CUSHION_R);
    if (s.cushion) this.fx(owner).burst(s.cushion.x, s.cushion.y, 30, purple ? CLT.pinned : CLT.tomato);
    const touching = Phaser.Math.Distance.Between(f.x, f.y, x, y) <= CUSHION_TOUCH_R;
    s.cushion = {
      owner, x, y, pins: max, max, purple, until: this.now + CUSHION_MS,
      burning: this.burning(owner), nextBurstAt: this.now + CUSHION_BURN_BEAT_MS,
      squash: 1, punchGate: 0, seed: Math.random() * 999, touching,
    };
    this.relay(owner, `cloth-cushion:${Math.round(this.mx(x))}:${Math.round(y)}`);
    this.avatar(owner)?.play('slam', Math.atan2(y - f.y, x - f.x));
    this.fx(owner).burst(x, y, 26, purple ? CLT.pinned : CLT.tomato);
    this.api.showFloatingText(x, y - 34, purple ? '🟣 PINCUSHION' : '🍅 PINCUSHION', this.hex(purple ? CLT.pinnedLit : CLT.tomatoLit));
    Sfx.playAt('land', x, { rate: 1.2, volume: 0.8 });
  }

  /** Q — Burning Man (and, with Q+, the Father of the Flame). */
  doBurningMan(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'cloth-burning-man'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.burnUntil = this.now + BURN_MAN_MS;
    s.effigy = this.up(owner, 'q');
    s.nextScrapAt = 0;
    if (s.cushion) s.cushion.burning = true;
    if (s.effigy) {
      // The effigy is planted where it was lit: any ride or grip ends here.
      this.letGo(owner, false);
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      f.oozeSizeMult = EFFIGY_SIZE;
      f.applySizeMult();
      this.sized.add(f);
      this.avatar(owner)?.setRigScale(EFFIGY_SIZE);
    }
    this.clothAvatar(owner)?.setBurn(true);
    this.clothAvatar(owner)?.setEffigy(s.effigy);
    this.avatar(owner)?.play('raise');
    this.fx(owner).ignite(f.x, f.y, s.effigy ? 120 : 80);
    this.api.scene.cameras.main.shake(260, s.effigy ? 0.009 : 0.005);
    this.api.showFloatingText(f.x, f.y - 60, s.effigy ? '🔥 FATHER OF THE FLAME' : '🔥 BURNING MAN', this.hex(CLT.ember));
    Sfx.playAt('flame-burst', f.x, { rate: s.effigy ? 0.7 : 0.9, volume: 1 });
    Sfx.playAt('inferno', f.x, { rate: 1.1, volume: 0.6 });
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /**
   * Online: what only the other tailor's machine decides. Some of it is about their objects (a
   * throw, a cushion punch, the self-pin) and keeps our picture of them honest; the rest lands on
   * our own body (a wrap, a carry, a fling, the jacket's steering) and is applied here, because
   * only this machine moves it.
   */
  replayNet(id: string): void {
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.sides.npc;
    const p = this.api.player;
    switch (head) {
      case 'cloth-throw': {
        const x = n(1);
        const y = n(2);
        let best: Needle | null = null;
        let bestD = 80;
        for (const nd of this.needles) {
          if (nd.owner !== 'npc' || nd.state === 'flying') continue;
          const d = Phaser.Math.Distance.Between(x, y, nd.x, nd.y);
          if (d < bestD) { best = nd; bestD = d; }
        }
        if (!best) {
          best = {
            owner: 'npc', x, y, ang: 0, vx: 0, vy: 0, state: 'ground', at: 0, wrapped: false, stolen: false,
            damage: NEEDLE_DAMAGE, seed: Math.random() * 999, hit: new Set(),
          };
          this.needles.push(best);
        }
        this.launchNeedle('npc', best, x, y, n(3), n(4), n(5) === 1);
        break;
      }
      case 'cloth-wrap':
        if (this.alive(p)) this.wrap('npc', p, n(1) === 1, true);
        break;
      case 'cloth-hold':
        this.carriedTo = { x: n(1), y: n(2), until: this.now + 350 };
        break;
      case 'cloth-drop':
        this.carriedTo = null;
        break;
      case 'cloth-fling':
        this.carriedTo = null;
        if (this.alive(p)) this.fling('npc', p, n(1), n(2));
        break;
      case 'cloth-steer':
        s.steerX = Math.sign(n(1));
        s.steerY = Math.sign(n(2));
        break;
      case 'cloth-cushion':
        // The cast replay set it down along the aim; the owner set it down at their hand.
        if (s.cushion) { s.cushion.x = n(1); s.cushion.y = n(2); }
        break;
      case 'cloth-punch':
        if (s.cushion) this.punchCushion('npc', s.cushion);
        break;
      case 'cloth-pinned':
        s.pinnedCharges = PINNED_CHARGES;
        s.pinnedUntil = this.now + PINNED_MS;
        if (s.cushion) s.cushion.pins = Math.max(0, s.cushion.pins - 1);
        this.nfx.selfPin(this.api.npc.x, this.api.npc.y);
        break;
      case 'cloth-burn':
        if (this.alive(p)) this.ignite('npc', p, n(1), 0);
        break;
      default:
        break;
    }
  }

  // ── The cushion ────────────────────────────────────────────────────────────

  /** A punch: the cushion flinches and fires a ring of pins, one pin lighter. */
  private punchCushion(owner: Owner, c: Cushion): void {
    if (this.now < c.punchGate) return;
    c.punchGate = this.now + CUSHION_PUNCH_GATE_MS;
    if (c.pins <= 0) return;
    c.pins--;
    c.squash = 1;
    this.cushionBurst(owner, c, CUSHION_BARRAGE, c.burning);
    this.api.showFloatingText(c.x, c.y - 36, `📌 ${c.pins} LEFT`, this.hex(c.purple ? CLT.pinnedLit : CLT.tomatoLit));
    Sfx.playAt('shotgun', c.x, { rate: 1.6, volume: 0.6 });
    Sfx.playAt('stab', c.x, { rate: 1.2, volume: 0.6 });
    this.relay(owner, 'cloth-punch');
    if (c.pins <= 0) this.popCushion(owner);
  }

  private cushionBurst(owner: Owner, c: Cushion, count: number, hot: boolean): void {
    const off = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      const a = off + (i / count) * TAU;
      this.spawnPin(owner, c.x, c.y, a, CUSHION_PIN_DAMAGE, hot);
    }
    this.fx(owner).barrage(c.x, c.y, 44, c.purple ? CLT.pinnedLit : CLT.clothPale);
  }

  private popCushion(owner: Owner): void {
    const s = this.side(owner);
    const c = s.cushion;
    if (!c) return;
    s.cushion = null;
    this.fx(owner).burst(c.x, c.y, 34, c.purple ? CLT.pinned : CLT.tomato);
    this.fx(owner).lint(c.x, c.y, 10, 24, 500, c.purple ? CLT.pinned : CLT.tomato);
    Sfx.playAt('explosion-small', c.x, { rate: 1.4, volume: 0.5 });
  }

  private spawnPin(owner: Owner, x: number, y: number, a: number, damage: number, hot: boolean): void {
    const sp = PIN_SPEED * (0.85 + Math.random() * 0.3);
    this.pins.push({
      owner, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      diesAt: this.now + PIN_LIFE_MS, damage: hot ? damage * NEEDLE_HOT_MULT : damage, hot,
      visual: !this.simulates(owner), hit: new Set(),
    });
  }

  /**
   * Everything the cushion does on its own: the tailor walking into it, catching shots with F+,
   * spitting pins while it burns, and expiring.
   */
  private updateCushions(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const c = s.cushion;
      if (!c) continue;
      c.squash = Math.max(0, c.squash - delta / 220);
      const f = this.fighter(owner);

      if (this.now >= c.until && !c.burning) { this.popCushion(owner); continue; }

      // The self-pin. A crossing, not a tick: stand on it and nothing more happens.
      const touching = this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) <= CUSHION_TOUCH_R;
      if (touching && !c.touching && c.pins > 0 && this.simulates(owner)) {
        c.pins--;
        s.pinnedCharges = PINNED_CHARGES;
        s.pinnedUntil = this.now + PINNED_MS;
        this.fx(owner).selfPin(f.x, f.y);
        this.api.showFloatingText(f.x, f.y - 52, '📌 PINNED ×3', this.hex(CLT.pinnedLit));
        Sfx.playAt('stab', f.x, { rate: 0.8, volume: 0.9 });
        this.relay(owner, 'cloth-pinned');
        if (c.pins <= 0) { this.popCushion(owner); continue; }
      }
      c.touching = touching;

      // F+ — Recycle: enemy fire that reaches the cushion becomes another pin in it.
      if (c.purple && c.pins < c.max && this.simulates(owner)) {
        const got = this.catchShot(owner, c.x, c.y, CUSHION_R + 10);
        if (got !== null) {
          c.pins++;
          c.squash = 0.6;
          this.fx(owner).stab(c.x, c.y - 6, -Math.PI / 2, 1.2);
          this.api.showFloatingText(c.x, c.y - 34, '♻ +1 PIN', this.hex(CLT.pinnedLit));
          Sfx.playAt('nail', c.x, { rate: 1.4, volume: 0.6 });
        }
      }

      // Burning: a burst on every beat until it is empty.
      if (c.burning && this.now >= c.nextBurstAt) {
        c.nextBurstAt = this.now + CUSHION_BURN_BEAT_MS;
        c.pins--;
        c.squash = 0.8;
        this.cushionBurst(owner, c, CUSHION_BURN_PINS, true);
        this.fx(owner).embers(c.x, c.y - 10, 6, 16);
        Sfx.playAt('sizzle', c.x, { rate: 1.2, volume: 0.5 });
        if (c.pins <= 0) this.popCushion(owner);
      }
    }
  }

  // ── Getting hurt ───────────────────────────────────────────────────────────

  /**
   * Every hit a tailor takes. Pinned: one charge, a ring of pins out of the body and a stab back at
   * whoever did it. The Father of the Flame: the attacker catches fire and embers fly.
   */
  private onHurt(owner: Owner, amount: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.simulates(owner)) return;

    if (s.pinnedCharges > 0 && this.now < s.pinnedUntil && amount >= PINNED_MIN_HIT) {
      s.pinnedCharges--;
      const off = Math.random() * TAU;
      for (let i = 0; i < RETALIATE_PINS; i++) {
        this.spawnPin(owner, f.x, f.y, off + (i / RETALIATE_PINS) * TAU, CUSHION_PIN_DAMAGE * 0.6, this.burning(owner));
      }
      const attacker = this.nearestTarget(owner, f.x, f.y);
      if (attacker) {
        this.hurt(owner, attacker, RETALIATE_DAMAGE, CLT.pinnedLit);
        this.fx(owner).stab(attacker.x, attacker.y, Math.atan2(attacker.y - f.y, attacker.x - f.x), 1.3);
      }
      this.fx(owner).barrage(f.x, f.y, 40, CLT.pinnedLit);
      Sfx.playAt('stab', f.x, { rate: 1.3, volume: 0.7 });
    }

    if (this.effigyOn(owner) && this.now >= s.effigyGate) {
      s.effigyGate = this.now + EFFIGY_GATE_MS;
      const attacker = this.nearestTarget(owner, f.x, f.y);
      if (attacker) {
        this.ignite(owner, attacker, EFFIGY_IGNITE_MS, EFFIGY_IGNITE_DPS);
        this.relay(owner, `cloth-burn:${EFFIGY_IGNITE_MS}`);
      }
      for (let i = 0; i < EFFIGY_EMBERS; i++) {
        const a = (i / EFFIGY_EMBERS) * TAU + Math.random() * 0.4;
        this.spawnScrap(owner, f.x, f.y - 10, a, 260);
      }
      this.fx(owner).embers(f.x, f.y - 20, 10, 30);
    }
  }

  /** The kit's own burn. Refreshes rather than stacks; a hotter source wins. */
  private ignite(owner: Owner, victim: Fighter, ms: number, dps: number): void {
    if (!this.alive(victim)) return;
    const prev = this.burns.get(victim);
    const until = this.now + ms;
    if (prev) {
      prev.until = Math.max(prev.until, until);
      prev.dps = Math.max(prev.dps, dps);
      prev.owner = owner;
      return;
    }
    this.burns.set(victim, { owner, until, dps, acc: 0 });
    this.fx(owner).embers(victim.x, victim.y, 6, 14);
  }

  private updateBurns(delta: number): void {
    const dt = delta / 1000;
    for (const [f, b] of [...this.burns]) {
      if (!this.alive(f) || this.now >= b.until) { this.burns.delete(f); continue; }
      // Online, the owner's machine deals it; here it is only a picture of a fire.
      if (!this.simulates(b.owner) || b.dps <= 0) continue;
      b.acc += b.dps * dt;
      if (b.acc >= 1) {
        const whole = Math.floor(b.acc);
        b.acc -= whole;
        Fighter.asNonAllyDamage(() => f.takeDamage(whole, { source: this.fighter(b.owner) }));
      }
    }
  }

  // ── Burning Man ────────────────────────────────────────────────────────────

  private spawnScrap(owner: Owner, x: number, y: number, a: number, speed: number): void {
    const sp = speed * (0.5 + Math.random() * 0.6);
    this.scraps.push({
      owner, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      spin: Math.random() * TAU, diesAt: this.now + SCRAP_LIFE_MS, seed: Math.random() * 999,
      visual: !this.simulates(owner), hit: new Set(),
    });
  }

  private updateBurningMen(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!s.burnUntil) continue;
      if (this.now >= s.burnUntil || !this.alive(f)) {
        this.endBurningMan(owner);
        continue;
      }
      // The scarf sheds burning scraps along its length.
      if (this.now >= s.nextScrapAt) {
        s.nextScrapAt = this.now + SCRAP_EVERY_MS;
        const c = this.collar(owner);
        const u = Math.random();
        const x = c.x + (s.handX - c.x) * u;
        const y = c.y + (s.handY - c.y) * u;
        this.spawnScrap(owner, x, y, Math.random() * TAU, 120);
      }
    }
  }

  private endBurningMan(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const was = s.effigy;
    s.burnUntil = 0;
    s.effigy = false;
    this.clothAvatar(owner)?.setBurn(false);
    this.clothAvatar(owner)?.setEffigy(false);
    if (was && f) {
      f.oozeSizeMult = 1;
      f.applySizeMult();
      this.sized.delete(f);
      this.avatar(owner)?.setRigScale(1);
    }
    if (this.alive(f)) this.fx(owner).embers(f.x, f.y, 10, 26);
    // The reach shrinks back: a grip further out than the scarf goes is let go of.
    if (was && s.anchored && f && Phaser.Math.Distance.Between(f.x, f.y, s.anchorX, s.anchorY) > HAND_MAX * 1.2) {
      this.letGo(owner, false);
    }
  }

  /** Ruin's Second Skin: the fire goes out, the effigy collapses, and a ride ends. */
  revertForms(f: Fighter): string[] {
    const owner = this.ownerOf(f);
    if (!owner) return [];
    const s = this.side(owner);
    const out: string[] = [];
    if (s.burnUntil) {
      out.push(s.effigy ? 'Father of the Flame' : 'Burning Man');
      this.endBurningMan(owner);
    }
    if (s.riding) {
      s.riding = null;
      if (this.alive(f)) (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      out.push('Clothesline');
    }
    return out;
  }

  /** Ruin's Spikes of Ruin: the pincushion is the one thing this kit builds. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let n = 0;
    for (const owner of BOTH) {
      if (owner === exceptOwner) continue;
      const c = this.side(owner).cushion;
      if (!c || Phaser.Math.Distance.Between(x, y, c.x, c.y) > radius) continue;
      report?.(c.x, c.y);
      this.popCushion(owner);
      n++;
    }
    return n;
  }

  // ── Wraps ──────────────────────────────────────────────────────────────────

  private wrap(owner: Owner, victim: Fighter, jacket: boolean, net = false): void {
    // A rooted effigy cannot be bound, carried or thrown.
    const own = this.ownerOf(victim);
    if (own && this.isCloth(own) && this.effigyOn(own)) return;
    const prev = this.wraps.get(victim);
    const until = this.now + WRAP_MS;
    if (prev) {
      prev.owner = owner;
      prev.until = Math.max(prev.until, until);
      prev.jacket = prev.jacket || jacket;
      return;
    }
    this.wraps.set(victim, { owner, until, jacket, net, seed: Math.random() * 999 });
    this.fx(owner).wrap(victim.x, victim.y, 24, jacket);
    this.api.showFloatingText(victim.x, victim.y - 42, jacket ? '🧥 JACKETED' : '🪢 BOUND', this.hex(jacket ? CLT.jacketLit : CLT.web));
    Sfx.playAt('whip', victim.x, { rate: 1.2, volume: 0.8 });
  }

  /** Whether this side has somebody in a Mystical Jacket right now. */
  private jacketing(owner: Owner): boolean {
    for (const w of this.wraps.values()) if (w.owner === owner && w.jacket) return true;
    return false;
  }

  private updateWraps(delta: number): void {
    const dt = delta / 1000;
    for (const [victim, w] of [...this.wraps]) {
      const carried = this.side(w.owner).held?.victim === victim;
      if (!this.alive(victim)) { this.wraps.delete(victim); continue; }
      if (this.now >= w.until && !carried) {
        this.wraps.delete(victim);
        this.fx(w.owner).lint(victim.x, victim.y, 8, 22, 420, CLT.web);
        Sfx.playAt('snap-back', victim.x, { rate: 1.3, volume: 0.5 });
        continue;
      }
      // Burning Man: anybody tied up in your cloth burns while it lasts.
      if (this.burning(w.owner) && this.simulates(w.owner)) {
        const b = this.burns.get(victim);
        if (!b || b.until < this.now + 300) this.ignite(w.owner, victim, 400, WRAP_BURN_DPS);
      }
      void dt;
    }
  }

  /**
   * R+: the jacket's steering. While the arrow keys are held the body goes where they point,
   * whatever it was doing; let go and it is its own again. The bot steers its victim onto its
   * own cushion when it has one, and into its reach when it does not.
   */
  private updateSteering(): void {
    // Online: the other machine hears about the arrow keys only while a jacket is on, and only
    // when they change — and a fresh jacket is always told where the keys already are.
    const ps = this.sides.player;
    if (this.jacketing('player')) {
      const key = `${ps.steerX}:${ps.steerY}`;
      if (key !== ps.sentSteer) {
        ps.sentSteer = key;
        this.relay('player', `cloth-steer:${-ps.steerX}:${ps.steerY}`);
      }
    } else {
      ps.sentSteer = '';
    }
    for (const [victim, w] of this.wraps) {
      if (!w.jacket || !this.alive(victim)) continue;
      if (this.side(w.owner).held?.victim === victim || this.flung.has(victim)) continue;
      let sx = 0;
      let sy = 0;
      const s = this.side(w.owner);
      if (w.owner === 'player') {
        sx = s.steerX; sy = s.steerY;
      } else if (this.isReplica('npc')) {
        // Only our own body is ours to move; the other machine moves everything else.
        if (victim !== this.api.player) continue;
        sx = s.steerX; sy = s.steerY;
      } else {
        const bot = this.api.npc;
        const goal = s.cushion && s.cushion.pins > 0 ? s.cushion : bot;
        if (!goal || !this.alive(bot)) continue;
        const dx = goal.x - victim.x;
        const dy = goal.y - victim.y;
        if (Math.hypot(dx, dy) < NPC_STEER_TOWARD_R) continue;
        sx = dx; sy = dy;
      }
      const m = Math.hypot(sx, sy);
      if (m < 0.01) continue;
      // Online, a replica of the other player is moved on their machine, not ours.
      if (victim === this.api.npc && this.api.isOnline) continue;
      (victim.body as Phaser.Physics.Arcade.Body).setVelocity((sx / m) * JACKET_STEER_SPEED, (sy / m) * JACKET_STEER_SPEED);
    }
  }

  // ── The hand ───────────────────────────────────────────────────────────────

  /**
   * Where the hand wants to be this frame, and the spring that drags it there. Free it chases the
   * cursor (clamped to the scarf's reach); gripping it stays on the world point it grabbed.
   */
  private updateHand(delta: number): void {
    const dt = Math.max(0.001, delta / 1000);
    for (const owner of BOTH) {
      if (!this.isCloth(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const av = this.avatar(owner);
      if (!f) continue;

      if (owner === 'npc') {
        // The bot (or a replica) has no cursor: the hand reaches toward whatever it is fighting.
        const t = this.targetsOf('npc')[0] ?? null;
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }

      let tx: number;
      let ty: number;
      if (s.riding) {
        tx = s.riding.line.vertical ? s.riding.line.at : f.x + s.riding.dir * 46;
        ty = s.riding.line.vertical ? f.y + s.riding.dir * 46 : s.riding.line.at;
      } else if (s.anchored) {
        tx = s.anchorX;
        ty = s.anchorY;
      } else {
        const d = Phaser.Math.Clamp(Math.hypot(s.aimX - f.x, s.aimY - f.y) || 1, HAND_MIN, this.reach(owner));
        const a = Math.atan2(s.aimY - f.y, s.aimX - f.x);
        tx = f.x + Math.cos(a) * d;
        ty = f.y + Math.sin(a) * d;
      }
      if (!s.handSeeded) {
        s.handX = tx; s.handY = ty; s.handVx = 0; s.handVy = 0; s.handSeeded = true;
      } else {
        const k = Math.min(1, HAND_SPRING * dt);
        const nx = s.handX + (tx - s.handX) * k;
        const ny = s.handY + (ty - s.handY) * k;
        s.handVx = (nx - s.handX) / dt;
        s.handVy = (ny - s.handY) / dt;
        s.handX = nx;
        s.handY = ny;
      }
      if (av) {
        av.setFacing(Math.atan2(s.handY - f.y, s.handX - f.x));
        av.update(delta, f.x, f.y, f.alpha);
      }
    }
  }

  /** Whipping the hand over somebody. Free, weak, and the reason movement is never wasted. */
  private updateSmack(): void {
    for (const owner of BOTH) {
      if (!this.isCloth(owner) || !this.simulates(owner)) continue;
      const s = this.side(owner);
      if (s.held || s.anchored) continue;
      if (Math.hypot(s.handVx, s.handVy) < SMACK_SPEED) continue;
      const claw = this.effigyOn(owner);
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(s.handX, s.handY, t.x, t.y) > SMACK_R) continue;
        const gate = s.smackGate.get(t) ?? 0;
        if (this.now < gate) continue;
        s.smackGate.set(t, this.now + SMACK_GATE_MS);
        this.hurt(owner, t, SMACK_DAMAGE + (claw ? CLAW_SMACK_BONUS : 0), claw ? CLT.ember : CLT.clothLit);
        if (claw) this.ignite(owner, t, IGNITE_MS, IGNITE_DPS);
        this.fx(owner).lint(t.x, t.y, 6, 16, 300, claw ? CLT.ember : CLT.cloth);
        Sfx.playAt('hit-light', t.x, { rate: claw ? 0.8 : 1.15, volume: 0.7 });
      }
      // A whip across your own cushion is a punch too.
      const c = s.cushion;
      if (c && Phaser.Math.Distance.Between(s.handX, s.handY, c.x, c.y) <= SMACK_R + CUSHION_R) this.punchCushion(owner, c);
    }
  }

  /**
   * The drag. The grip is fixed in the world and the mouse is a handle: every pixel the cursor
   * travels moves the body the same distance the other way. The rope constraint stops the body
   * sliding past the end of its own scarf.
   */
  private updateDrag(delta: number): void {
    if (this.api.elementId !== 'cloth') return;
    const s = this.sides.player;
    const p = this.api.player;
    if (!this.alive(p)) return;
    if (this.api.isDodging) { this.mouseDX = 0; this.mouseDY = 0; return; }
    const body = p.body as Phaser.Physics.Arcade.Body;
    if (s.riding) { this.mouseDX = 0; this.mouseDY = 0; return; }

    if (!s.anchored || s.held || this.effigyOn('player')) {
      body.setVelocity(0, 0);
      this.mouseDX = 0;
      this.mouseDY = 0;
      return;
    }

    const reach = this.reach('player');
    if (!this.effigyOn('player')
      && Phaser.Math.Distance.Between(s.aimX, s.aimY, s.anchorX, s.anchorY) > SLIP_DIST) {
      this.letGo('player', false);
      this.pfx.lint(s.anchorX, s.anchorY, 6, 16);
      this.api.showFloatingText(s.anchorX, s.anchorY - 24, '💢 SLIPPED', this.hex(CLT.clothPale));
      Sfx.playAt('snap-back', s.anchorX, { rate: 1.1, volume: 0.7 });
      body.setVelocity(0, 0);
      this.mouseDX = 0;
      this.mouseDY = 0;
      return;
    }

    const dt = Math.max(0.001, delta / 1000);
    const gain = (s.anchorWall ? WALL_DRAG_GAIN : DRAG_GAIN) * this.speedMultFor(p);
    let vx = (-this.mouseDX * gain) / dt;
    let vy = (-this.mouseDY * gain) / dt;
    const sp = Math.hypot(vx, vy);
    if (sp > DRAG_MAX_SPEED) {
      vx = (vx / sp) * DRAG_MAX_SPEED;
      vy = (vy / sp) * DRAG_MAX_SPEED;
    }
    const ax = p.x - s.anchorX;
    const ay = p.y - s.anchorY;
    const d = Math.hypot(ax, ay);
    if (d > reach && d > 0.001) {
      const nx = ax / d;
      const ny = ay / d;
      const out = vx * nx + vy * ny;
      if (out > 0) { vx -= nx * out; vy -= ny * out; }
    }
    body.setVelocity(vx, vy);
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  /** Click+: the ride. The line hauls the body along it until a wall stops it. */
  private updateRide(): void {
    const s = this.sides.player;
    const p = this.api.player;
    if (!s.riding) return;
    if (!this.alive(p) || this.api.isDodging) { this.letGo('player', false); return; }
    const body = p.body as Phaser.Physics.Arcade.Body;
    const l = s.riding.line;
    const sp = LINE_SPEED * s.riding.dir * this.speedMultFor(p);
    if (l.vertical) {
      body.setVelocity(Phaser.Math.Clamp((l.at - p.x) * 6, -LINE_SPEED, LINE_SPEED), sp);
    } else {
      body.setVelocity(sp, Phaser.Math.Clamp((l.at - p.y) * 6, -LINE_SPEED, LINE_SPEED));
    }
    const pos = l.vertical ? p.y : p.x;
    const lo = l.vertical ? this.top : this.left;
    const hi = l.vertical ? this.bottom : this.right;
    if ((s.riding.dir < 0 && pos <= lo + 6) || (s.riding.dir > 0 && pos >= hi - 6)) {
      this.pfx.lint(p.x, p.y, 8, 20);
      Sfx.playAt('hit-light', p.x, { rate: 0.8, volume: 0.6 });
      this.letGo('player', false);
      body.setVelocity(0, 0);
    }
  }

  // ── Needles ────────────────────────────────────────────────────────────────

  private updateNeedles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.needles.length - 1; i >= 0; i--) {
      const n = this.needles[i];
      const s = this.side(n.owner);
      if (s.held?.needle === n) {
        n.x = s.handX;
        n.y = s.handY;
        n.ang = Math.atan2(s.handY - this.fighter(n.owner).y, s.handX - this.fighter(n.owner).x);
        continue;
      }

      if (n.state === 'falling') {
        if (this.now < n.at) continue;
        n.state = 'ground';
        if (this.simulates(n.owner)) {
          for (const t of this.targetsOf(n.owner)) {
            if (Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y) > 24) continue;
            this.hurt(n.owner, t, NEEDLE_DROP_DAMAGE * (this.burning(n.owner) ? NEEDLE_HOT_MULT : 1), CLT.steelLit);
          }
        }
        Sfx.playAt('nail', n.x, { rate: 1.1 + Math.random() * 0.2, volume: 0.5 });
        continue;
      }
      if (n.state !== 'flying') continue;

      n.x += n.vx * dt;
      n.y += n.vy * dt;
      const hot = this.burning(n.owner);

      let spent = false;
      if (this.simulates(n.owner)) {
        for (const t of this.targetsOf(n.owner)) {
          if (n.hit.has(t)) continue;
          if (Phaser.Math.Distance.Between(n.x, n.y, t.x, t.y) > 20) continue;
          n.hit.add(t);
          const dmg = n.stolen ? n.damage : n.damage * (hot ? NEEDLE_HOT_MULT : 1);
          this.hurt(n.owner, t, dmg, hot ? CLT.hot : CLT.steelLit);
          if (hot) this.ignite(n.owner, t, IGNITE_MS, IGNITE_DPS);
          this.fx(n.owner).stab(t.x, t.y, n.ang, 1.4);
          Sfx.playAt('stab', t.x, { rate: 0.9, volume: 0.9 });
          spent = true;
          break;
        }
      } else {
        // A replica's needle stops on our body; the damage arrives from their machine.
        const p = this.api.player;
        if (n.owner === 'npc' && this.alive(p) && Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y) <= 20) spent = true;
      }
      if (spent) {
        if (n.wrapped) this.needleBomb(n.owner, n.x, n.y, n.ang);
        this.needles.splice(i, 1);
        continue;
      }

      const hitWall = n.x <= this.left || n.x >= this.right || n.y <= this.top || n.y >= this.bottom;
      if (hitWall) {
        n.x = Phaser.Math.Clamp(n.x, this.left, this.right);
        n.y = Phaser.Math.Clamp(n.y, this.top, this.bottom);
        if (n.wrapped) {
          // The bundle bursts back off the wall, and the bare needle stays stuck where it hit.
          const nx = n.x <= this.left ? 1 : n.x >= this.right ? -1 : 0;
          const ny = n.y <= this.top ? 1 : n.y >= this.bottom ? -1 : 0;
          this.needleBomb(n.owner, n.x, n.y, Math.atan2(ny || -Math.sin(n.ang), nx || -Math.cos(n.ang)));
          n.wrapped = false;
        }
        if (n.stolen) {
          this.fx(n.owner).lint(n.x, n.y, 8, 18);
          this.needles.splice(i, 1);
          continue;
        }
        n.state = 'wall';
        n.vx = 0;
        n.vy = 0;
        this.fx(n.owner).stab(n.x, n.y, n.ang, 1.2);
        Sfx.playAt('nail', n.x, { rate: 0.9, volume: 0.8 });
        continue;
      }

      if (this.now >= n.at) {
        if (n.stolen) { this.fx(n.owner).lint(n.x, n.y, 8, 18); this.needles.splice(i, 1); continue; }
        n.state = 'ground';
        n.vx = 0;
        n.vy = 0;
        if (n.wrapped) { this.needleBomb(n.owner, n.x, n.y, n.ang); n.wrapped = false; }
        Sfx.playAt('nail', n.x, { rate: 1.3, volume: 0.4 });
      }
    }
  }

  /** E+: the bundle goes off — a shotgun spray of pins along `ang`. */
  private needleBomb(owner: Owner, x: number, y: number, ang: number): void {
    const hot = this.burning(owner);
    for (let i = 0; i < BOMB_PINS; i++) {
      const a = ang + (i / (BOMB_PINS - 1) - 0.5) * BOMB_SPREAD * 2 + (Math.random() - 0.5) * 0.1;
      this.spawnPin(owner, x, y, a, BOMB_PIN_DAMAGE, hot);
    }
    this.fx(owner).barrage(x, y, 36, hot ? CLT.ember : CLT.cloth);
    this.fx(owner).lint(x, y, 10, 24, 420, hot ? CLT.ember : CLT.cloth);
    Sfx.playAt('shotgun', x, { rate: 1.3, volume: 0.75 });
  }

  // ── Pins, bolas, scraps ────────────────────────────────────────────────────

  private updatePins(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.pins.length - 1; i >= 0; i--) {
      const p = this.pins[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let spent = false;
      if (!p.visual) {
        for (const t of this.targetsOf(p.owner)) {
          if (p.hit.has(t)) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > PIN_HIT_R) continue;
          p.hit.add(t);
          this.hurt(p.owner, t, p.damage, p.hot ? CLT.hot : CLT.steelLit);
          if (p.hot) this.ignite(p.owner, t, IGNITE_MS, IGNITE_DPS);
          spent = true;
          break;
        }
      }
      const out = p.x < this.left - 10 || p.x > this.right + 10 || p.y < this.top - 10 || p.y > this.bottom + 10;
      if (spent || out || this.now >= p.diesAt) this.pins.splice(i, 1);
    }
  }

  private updateBolas(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bolas.length - 1; i >= 0; i--) {
      const b = this.bolas[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 16;
      let caught: Fighter | null = null;
      if (!b.visual) {
        for (const t of this.targetsOf(b.owner)) {
          if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BOLA_HIT_R) continue;
          caught = t;
          break;
        }
      } else if (b.owner === 'npc') {
        const p = this.api.player;
        if (this.alive(p) && Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) <= BOLA_HIT_R) {
          this.bolas.splice(i, 1);
          continue;
        }
      }
      if (caught) {
        this.hurt(b.owner, caught, BOLA_DAMAGE, b.jacket ? CLT.jacketLit : CLT.web);
        this.wrap(b.owner, caught, b.jacket);
        if (caught === this.api.npc) this.relay(b.owner, `cloth-wrap:${b.jacket ? 1 : 0}`);
        this.bolas.splice(i, 1);
        continue;
      }
      const out = b.x <= this.left || b.x >= this.right || b.y <= this.top || b.y >= this.bottom;
      if (out || this.now >= b.diesAt) {
        this.fx(b.owner).lint(b.x, b.y, 6, 16, 360, b.jacket ? CLT.jacket : CLT.web);
        this.bolas.splice(i, 1);
      }
    }
  }

  private updateScraps(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const sc = this.scraps[i];
      sc.x += sc.vx * dt;
      sc.y += sc.vy * dt;
      sc.vx *= 1 - dt * 1.2;
      sc.vy = sc.vy * (1 - dt * 1.2) - 20 * dt;
      sc.spin += dt * 6;
      if (!sc.visual) {
        for (const t of this.targetsOf(sc.owner)) {
          if (sc.hit.has(t)) continue;
          if (Phaser.Math.Distance.Between(sc.x, sc.y, t.x, t.y) > SCRAP_R) continue;
          sc.hit.add(t);
          this.hurt(sc.owner, t, SCRAP_DAMAGE, CLT.ember);
          this.ignite(sc.owner, t, IGNITE_MS, IGNITE_DPS);
        }
      }
      if (this.now >= sc.diesAt) this.scraps.splice(i, 1);
    }
  }

  /** A carried body rides the hand; a thrown one is watching for a wall. */
  private updateCarriedAndFlung(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const victim = s.held?.victim;
      if (s.held?.kind !== 'body' || !victim) continue;
      if (!this.alive(victim)) { this.letGo(owner, false); continue; }
      // Online, the other machine is the only one that can move the body for real.
      if (this.isRemoteBody(victim)) {
        if (this.now >= s.nextHoldSendAt) {
          s.nextHoldSendAt = this.now + 100;
          this.relay(owner, `cloth-hold:${Math.round(this.mx(s.handX))}:${Math.round(s.handY)}`);
        }
        continue;
      }
      (victim.body as Phaser.Physics.Arcade.Body).reset(s.handX, s.handY);
    }
    // Being carried by a tailor on the other machine.
    const p = this.api.player;
    if (this.carriedTo && this.alive(p)) {
      if (this.now >= this.carriedTo.until) this.carriedTo = null;
      else (p.body as Phaser.Physics.Arcade.Body).reset(this.carriedTo.x, this.carriedTo.y);
    }

    for (const [victim, fl] of [...this.flung]) {
      if (!this.alive(victim)) { this.flung.delete(victim); continue; }
      if (this.onWall(victim)) {
        this.flung.delete(victim);
        if (this.simulates(fl.owner)) this.hurt(fl.owner, victim, WALL_SLAM_DAMAGE, CLT.clothLit);
        this.stuckUntil.set(victim, { owner: fl.owner, until: this.now + WALL_STUCK_MS });
        if (!this.isRemoteBody(victim)) (victim.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.fx(fl.owner).burst(victim.x, victim.y, 30, CLT.web);
        this.api.showFloatingText(victim.x, victim.y - 46, '📌 PINNED TO THE WALL', this.hex(CLT.clothLit));
        this.api.scene.cameras.main.shake(200, 0.006);
        Sfx.playAt('hit-heavy', victim.x, { rate: 0.8, volume: 1 });
        continue;
      }
      if (this.now >= fl.until) { this.flung.delete(victim); continue; }
      if (!this.isRemoteBody(victim)) (victim.body as Phaser.Physics.Arcade.Body).setVelocity(fl.vx, fl.vy);
    }

    for (const [victim, st] of [...this.stuckUntil]) {
      if (!this.alive(victim) || this.now >= st.until) { this.stuckUntil.delete(victim); continue; }
      if (!this.isRemoteBody(victim)) (victim.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  // ── Slows ──────────────────────────────────────────────────────────────────

  /** Everything this element does to one body's movement, folded into a single factor. */
  private speedMultFor(f: Fighter | null | undefined): number {
    if (!f) return 1;
    const own = this.ownerOf(f);
    if (own && this.isCloth(own) && this.effigyOn(own)) return 0;
    const stuck = this.stuckUntil.get(f);
    if (stuck && this.now < stuck.until) return 0;
    let m = 1;
    const w = this.wraps.get(f);
    // A wrap the other machine told us about already arrives as its mirrored speed.
    if (w && !w.net) m *= WRAP_SLOW_MULT;
    return m;
  }

  /**
   * Husks and co-op allies never pass through ArenaScene's duel speed aggregate, so they are
   * slowed the only way that reaches them: by writing the generic field every frame and handing
   * it back the moment the effect ends.
   */
  private pushWalkSpeeds(): void {
    const duelists = [this.api.player, this.api.npc];
    for (const f of this.allFighters()) {
      if (!f || duelists.includes(f)) continue;
      const m = this.speedMultFor(f);
      if (m < 0.999) {
        f.walkSpeedMult = Math.min(f.walkSpeedMult, m);
        this.touchedWalk.add(f);
      } else if (this.touchedWalk.has(f)) {
        f.walkSpeedMult = 1;
        this.touchedWalk.delete(f);
      }
    }
  }

  /** The bot cannot drag itself, so its movement is pulsed: a hard haul, then a pause. */
  private haulMult(): number {
    const phase = (this.sides.npc.haul % 0.95) / 0.95;
    return phase < 0.55 ? 1.45 : 0.2;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isCloth('player');
    const npcIs = this.isCloth('npc');
    const anyState = this.needles.length || this.pins.length || this.bolas.length || this.scraps.length
      || this.wraps.size || this.burns.size || this.flung.size || this.stuckUntil.size || this.carriedTo
      || this.sides.player.cushion || this.sides.npc.cushion;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.ensureLines();
    this.ensureListeners();
    this.vizT += delta / 1000;
    this.sides.npc.haul += delta / 1000;

    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.pinnedCharges > 0 && this.now >= s.pinnedUntil) s.pinnedCharges = 0;
      this.clothAvatar(owner)?.setPins(s.pinnedCharges);
    }

    this.updateHand(delta);
    this.updateDrag(delta);
    this.updateRide();
    this.updateSmack();
    this.updateNeedles(delta);
    this.updateBolas(delta);
    this.updatePins(delta);
    this.updateScraps(delta);
    this.updateCushions(delta);
    this.updateBurningMen();
    this.updateWraps(delta);
    this.updateBurns(delta);
    this.updateCarriedAndFlung();
    this.updateSteering();
    this.pushWalkSpeeds();

    this.paintGround();
    this.paintBack();
    this.paintArms();
    this.paintAir();
    this.pushStatuses(playerIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const owner of BOTH) {
      const c = this.side(owner).cushion;
      if (!c) continue;
      pincushion(g, this.col(owner), c.x, c.y, CUSHION_R, c.pins, c.max, 1, this.vizT, {
        purple: c.purple, burn: c.burning, squash: c.squash, seed: c.seed,
        life: c.burning ? undefined : Phaser.Math.Clamp((c.until - this.now) / CUSHION_MS, 0, 1),
      });
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.anchored) continue;
      g.fillStyle(this.col(owner)(CLT.clothDeep), 0.45);
      g.fillEllipse(s.anchorX, s.anchorY + 2, 22, 10);
    }

    for (const n of this.needles) {
      if (n.state !== 'ground' && n.state !== 'wall') continue;
      if (this.side(n.owner).held?.needle === n) continue;
      const tint = this.col(n.owner);
      if (n.stolen) {
        clothWrap(g, tint, n.x, n.y, 8, 1, this.vizT, { seed: n.seed, life: 0.5 });
        continue;
      }
      needleGlyph(g, tint, n.x, n.y, n.ang, NEEDLE_LEN, 1, this.vizT,
        { stuck: true, hot: this.burning(n.owner), seed: n.seed });
    }
  }

  private paintBack(): void {
    const g = this.backGfx;
    if (!g) return;
    g.clear();
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.effigyOn(owner) || !this.alive(f)) continue;
      effigy(g, this.col(owner), f.x, f.y, 40 * EFFIGY_SIZE, f.alpha, this.vizT, 'back');
    }
  }

  private paintArms(): void {
    const g = this.armGfx;
    if (!g) return;
    g.clear();
    for (const owner of BOTH) {
      if (!this.isCloth(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f) || !s.handSeeded) continue;
      const tint = this.col(owner);
      const c = this.collar(owner);
      const burn = this.burning(owner) ? 1 : 0;
      const char = this.effigyOn(owner);
      const taut = s.anchored || !!s.riding || !!s.held;
      const scale = char ? EFFIGY_SIZE : 1;
      scarfArm(g, tint, c.x, c.y, s.handX, s.handY, f.alpha, this.vizT,
        { width: 10 * scale, slack: taut ? 0.05 : 0.45, seed: owner === 'player' ? 1 : 7, burn, char });
      const ang = Math.atan2(s.handY - c.y, s.handX - c.x);
      const grip = s.anchored || s.riding || s.held ? 1 : 0;
      scarfHand(g, tint, s.handX, s.handY, ang, f.alpha, this.vizT, { grip, scale, burn, char });
      if (s.held?.kind === 'needle' && s.held.needle) {
        const n = s.held.needle;
        if (n.stolen) clothWrap(g, tint, s.handX, s.handY, 9, 1, this.vizT, { seed: n.seed, life: 0.5 });
        else needleGlyph(g, tint, s.handX + Math.cos(ang) * 8, s.handY + Math.sin(ang) * 8, ang, NEEDLE_LEN, 1, this.vizT,
          { hot: !!burn, wrapped: this.up(owner, 'e'), seed: n.seed });
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // Clotheslines overhead: the player has to read them as something to reach up and catch.
    for (const l of this.lines) {
      const riding = this.sides.player.riding?.line === l;
      if (l.vertical) clothesline(g, this.pcol, l.at, this.top, l.at, this.bottom, riding ? 1 : 0.8, this.vizT, { seed: l.seed, lit: riding });
      else clothesline(g, this.pcol, this.left, l.at, this.right, l.at, riding ? 1 : 0.8, this.vizT, { seed: l.seed, lit: riding });
    }

    for (const n of this.needles) {
      const tint = this.col(n.owner);
      if (n.state === 'flying') {
        if (n.stolen) {
          clothWrap(g, tint, n.x, n.y, 9, 1, this.vizT, { seed: n.seed, life: 0.5 });
          continue;
        }
        // A thread trail behind it.
        g.lineStyle(1.4, tint(CLT.cloth), 0.6);
        g.lineBetween(n.x, n.y, n.x - Math.cos(n.ang) * 40, n.y - Math.sin(n.ang) * 40);
        needleGlyph(g, tint, n.x, n.y, n.ang, NEEDLE_LEN, 1, this.vizT,
          { hot: this.burning(n.owner), wrapped: n.wrapped, seed: n.seed });
      } else if (n.state === 'falling') {
        // A shadow on the floor where it is going to land, growing as it comes down.
        const k = 1 - Phaser.Math.Clamp((n.at - this.now) / NEEDLE_FALL_MS, 0, 1);
        g.fillStyle(tint(CLT.ink), 0.25 + 0.3 * k);
        g.fillEllipse(n.x, n.y, 8 + k * 10, 3 + k * 4);
      }
    }

    for (const b of this.bolas) {
      bolaGlyph(g, this.col(b.owner), b.x, b.y, b.spin, 1, this.vizT,
        { jacket: b.jacket, hot: this.burning(b.owner), heading: Math.atan2(b.vy, b.vx) });
    }

    for (const p of this.pins) {
      pinGlyph(g, this.col(p.owner), p.x, p.y, Math.atan2(p.vy, p.vx), 13, 1, { head: 1.8, hot: p.hot });
    }

    for (const sc of this.scraps) {
      const life = Phaser.Math.Clamp((sc.diesAt - this.now) / SCRAP_LIFE_MS, 0, 1);
      burnScrap(g, this.col(sc.owner), sc.x, sc.y, sc.spin, 6 * (0.5 + life * 0.5), Math.min(1, life * 2), this.vizT, sc.seed);
    }

    for (const [victim, w] of this.wraps) {
      if (!this.alive(victim)) continue;
      const life = Phaser.Math.Clamp((w.until - this.now) / WRAP_MS, 0, 1);
      if (w.jacket) jacketGlyph(g, this.col(w.owner), victim.x, victim.y, 0, 22, 0.95, this.vizT, { hot: this.burning(w.owner) });
      else clothWrap(g, this.col(w.owner), victim.x, victim.y, 22, 0.95, this.vizT, { hot: this.burning(w.owner), life, seed: w.seed });
    }

    for (const [victim, b] of this.burns) {
      if (!this.alive(victim)) continue;
      for (let i = 0; i < 3; i++) {
        flameTongue(g, this.col(b.owner), victim.x + (i - 1) * 9, victim.y - 6 + Math.abs(i - 1) * 4, 5, 0.85, this.vizT, i + victim.x);
      }
    }

    for (const [victim, st] of this.stuckUntil) {
      if (!this.alive(victim)) continue;
      const left = Phaser.Math.Clamp((st.until - this.now) / WALL_STUCK_MS, 0, 1);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4;
        pinGlyph(g, this.col(st.owner), victim.x + Math.cos(a) * 20, victim.y + Math.sin(a) * 20, a + Math.PI, 16, left,
          { head: 2.2 });
      }
    }

    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.effigyOn(owner) || !this.alive(f)) continue;
      effigy(g, this.col(owner), f.x, f.y, 40 * EFFIGY_SIZE, f.alpha, this.vizT, 'front');
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const p = this.api.player;

    const holding = s.held?.kind === 'body' ? 'a bound body'
      : s.held?.kind === 'needle' ? (s.held.needle?.stolen ? 'a caught shot' : 'a needle') : null;
    this.api.setStatusIndicator('cloth-hand', playerIs ? {
      name: s.riding ? 'On the Line' : holding ? 'Carrying' : s.anchored ? 'Gripping' : 'Scarf Hand',
      emoji: s.riding ? '🧺' : holding ? '🫳' : s.anchored ? '✊' : '🧣',
      color: s.anchored || s.riding ? CLT.clothPale : CLT.clothLit,
      priority: 140,
      description: s.riding
        ? 'Hanging off a clothesline. It hauls you along it the way you set off until a wall stops you or you let go.'
        : holding
          ? `The scarf is carrying ${holding}, so it cannot take your weight. Let go to throw it — the hand's own speed is the throw.`
          : s.anchored
            ? `Gripping ${s.anchorWall ? 'a wall' : 'the floor'}. Move the mouse and the scarf hauls your body the other way; a wall pulls harder than the ground. Wind too far past the grip and it slips.`
            : 'You do not walk. Hold Click on the floor or a wall to grip it with your scarf, then drag the mouse to haul yourself along. The same hand punches, grabs needles and bound bodies, and catches shots out of the air.',
    } : null);

    const mine = this.needles.filter((n) => n.owner === 'player' && (n.state === 'ground' || n.state === 'wall')).length;
    this.api.setStatusIndicator('cloth-needles', playerIs && mine > 0 ? {
      name: 'Needles', emoji: '🪡', color: CLT.steelLit, priority: 141,
      description: `Lying on the floor or stuck in a wall, waiting for the hand. Thrown, one is ${NEEDLE_DAMAGE} damage${this.up('player', 'e') ? ' and bursts into a spray of pins' : ''}; one that hits a wall stays stuck in it to be pulled out and thrown again.`,
      count: mine, suffix: `/${NEEDLE_MAX}`,
    } : null);

    this.api.setStatusIndicator('cloth-pinned', playerIs && s.pinnedCharges > 0 ? {
      name: 'Pinned', emoji: '📌', color: CLT.pinnedLit, priority: 132,
      description: `You walked into your own pincushion and took three pins. Each of the next ${s.pinnedCharges} hits you take throws a ring of pins out of you and stabs whoever landed it for ${RETALIATE_DAMAGE}.`,
      count: s.pinnedCharges, until: s.pinnedUntil,
    } : null);

    const c = s.cushion;
    this.api.setStatusIndicator('cloth-cushion', playerIs && c ? {
      name: c.burning ? 'Burning Cushion' : 'Pincushion', emoji: c.burning ? '🔥' : c.purple ? '🟣' : '🍅',
      color: c.burning ? CLT.ember : c.purple ? CLT.pinnedLit : CLT.tomatoLit, priority: 138,
      description: c.burning
        ? 'Your pincushion is on fire. It spits a burst of red-hot pins on its own every beat until it is empty, and then it is gone.'
        : `Punch it with the scarf hand and it fires ${CUSHION_BARRAGE} pins in every direction, one pin lighter. Walk into it and three go into you instead.${c.purple ? ' Enemy shots that reach it become new pins.' : ''}`,
      count: c.pins, suffix: `/${c.max}`,
    } : null);

    this.api.setStatusIndicator('cloth-burning-man', playerIs && this.burning('player') ? {
      name: s.effigy ? 'Father of the Flame' : 'Burning Man', emoji: '🔥', color: CLT.ember, priority: 130,
      description: s.effigy
        ? 'A towering burning effigy. Your char claw reaches anywhere in the arena and burns what it hits, and whoever hurts you catches fire as embers fly off you. Everything Burning Man does, too.'
        : 'Your clothes are alight. The scarf sheds burning scraps, needles are red-hot, anybody bound in your cloth burns, and your pincushion catches and spits its pins out until it is empty.',
      until: s.burnUntil,
    } : null);

    // Victim side.
    const w = p ? this.wraps.get(p) : undefined;
    this.api.setStatusIndicator('cloth-wrapped', w && w.owner === 'npc' ? {
      name: w.jacket ? 'Mystical Jacket' : 'Bound', emoji: w.jacket ? '🧥' : '🪢',
      color: w.jacket ? CLT.jacketLit : CLT.web, priority: 3,
      description: w.jacket
        ? 'Strapped into a magic jacket: badly slowed, light enough for a tailor\'s scarf to pick up and throw, and the tailor can steer you around with the arrow keys.'
        : 'Tied up in cloth: badly slowed, and light enough for a tailor\'s scarf to pick up and throw into a wall.',
      until: w.until,
    } : null);

    const st = p ? this.stuckUntil.get(p) : undefined;
    this.api.setStatusIndicator('cloth-stuck', st && this.now < st.until ? {
      name: 'Pinned to the Wall', emoji: '📌', color: CLT.clothLit, priority: 1,
      description: 'Thrown into a wall and pinned there. You cannot move until it gives.',
      until: st.until,
    } : null);

    const b = p ? this.burns.get(p) : undefined;
    this.api.setStatusIndicator('cloth-burn', b && b.owner === 'npc' ? {
      name: 'Burning Cloth', emoji: '🔥', color: CLT.ember, priority: 4,
      description: 'Burning scraps of cloth have set you alight. It burns until it goes out.',
      until: b.until,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  getPlayerSpeedMult(): number {
    return this.speedMultFor(this.api.player);
  }

  getNpcSpeedMult(): number {
    let m = this.speedMultFor(this.api.npc);
    if (this.isCloth('npc') && this.simulates('npc')) m *= this.haulMult();
    return m;
  }

  /** Needles the bot is within reach of — its reason to press Click at range. */
  npcNeedlesReady(): number {
    const f = this.api.npc;
    if (!this.alive(f)) return 0;
    const reach = this.reach('npc');
    return this.needles.filter((n) => n.owner === 'npc' && (n.state === 'ground' || n.state === 'wall')
      && Phaser.Math.Distance.Between(f.x, f.y, n.x, n.y) <= reach).length;
  }

  /** The bot has somebody tied up within reach: Click throws them into a wall. */
  npcTargetWrapped(): boolean {
    const f = this.api.npc;
    if (!this.alive(f)) return false;
    for (const [victim, w] of this.wraps) {
      if (w.owner === 'npc' && this.alive(victim)
        && Phaser.Math.Distance.Between(f.x, f.y, victim.x, victim.y) <= this.reach('npc')) return true;
    }
    return false;
  }

  /** The bot's cushion has pins, is within reach, and somebody is standing near it: punch it. */
  npcCushionPunch(): boolean {
    const f = this.api.npc;
    const c = this.sides.npc.cushion;
    if (!c || c.pins <= 0 || !this.alive(f)) return false;
    if (Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) > this.reach('npc')) return false;
    return !!this.nearestTarget('npc', c.x, c.y, 190);
  }

  /** The bot already has a cushion out. */
  npcHasCushion(): boolean {
    return !!this.sides.npc.cushion;
  }

  /** The bot is alight: needles and bolas are worth more right now. */
  npcBurning(): boolean {
    return this.burning('npc');
  }
}
