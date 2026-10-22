import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { NetIllusionMsg } from '../../network/NetworkManager';
import { HealthBar } from '../../combat/HealthBar';
import { Sfx } from '../../audio';
import {
  ILL, IllusionAvatar, IllusionColorFn, IllusionFx,
  illusionBomb, phantomFigure, spentTint, warpPane,
} from './IllusionVisuals';

type Owner = 'player' | 'npc';

// ── Crack Shot (Click) ───────────────────────────────────────────────────────
const SHOT_SPEED = 760;
const SHOT_DAMAGE = 20;
/** What the crack pays out when the bullet finds a wall instead of a person. */
const CRACK_DAMAGE = 10;
/**
 * How close to the arena edge counts as "hit the wall". Wide enough that a bullet is always
 * caught here before ArenaScene's out-of-bounds sweep destroys it, which would eat the crack.
 */
const WALL_MARGIN = 18;

// ── Illusion Veil (E) ────────────────────────────────────────────────────────
const VEIL_MS = 6000;
/** How far in front of the caster the pane hangs. */
const VEIL_STANDOFF = 78;
const VEIL_HALF_LEN = 82;
const VEIL_HALF_THICK = 13;
/** Radians an enemy shot is kicked by. Sign is a coin flip per shot, per pane. */
const VEIL_DEFLECT = Math.PI / 18;
/**
 * The illusion bullets a pane spins off one of its owner's Crack Shots: four fanned either side
 * of the real one and a fifth trailing straight behind it, so the real bullet is never the
 * obvious odd one out. Degrees off the real heading, and a speed scale for each.
 */
const DECOY_FAN: Array<{ deg: number; speed: number }> = [
  { deg: -22, speed: 1 }, { deg: -11, speed: 0.94 }, { deg: 11, speed: 0.94 }, { deg: 22, speed: 1 },
  { deg: 0, speed: 0.8 },
];
const DECOY_LIFE_MS = 1800;
/** How close anything has to come to an illusion bullet to count as hitting it. */
const DECOY_HIT_R = 12;
/**
 * The owner's own shots can pop their own illusions too — "any source" — but not in the first
 * moment of their life, when the real bullet they split from is still lying on top of them.
 */
const DECOY_ARM_MS = 220;

// ── Relocate (R) / Illusion Dance (Q) ────────────────────────────────────────
/** How far inside a corner you actually land, so you never arrive stuck in the wall. */
const CORNER_INSET = 58;

const DANCE_MS = 20000;
const DANCE_HOP_MS = 3000;

// ── Guise (F) ────────────────────────────────────────────────────────────────
const GUISE_MS = 3000;
/** 80% smaller. Written to `shapeSizeMult`, so it rides on top of every other size system. */
const GUISE_SIZE = 0.2;
const GUISE_SPEED = 1.35;
/** What the illusionist looks like on their own screen while they are hidden from everyone else. */
const GUISE_SELF_ALPHA = 0.38;
/** The share of everything the clone soaked up that it hands back when it fades. */
const GUISE_PAYOUT = 0.2;
/** The clone's body: a normal fighter's radius, because it is meant to be taken for one. */
const CLONE_HIT_R = 22;
/** How often an online illusionist tells the other screen where their clone is. */
const CLONE_SYNC_MS = 50;
/** A bot's clone keeps about this far off its target, like a real fighter holding range. */
const CLONE_BOT_RANGE = 210;

const ARENA_PAD = 32;

// ── Mastery: Masquerade (bindable) ───────────────────────────────────────────
const MASK_COOLDOWN_MS = 14000;
/** What the mask is worth. Also the number the opponent's damage indicators are divided by. */
const MASK_DAMAGE_MULT = 1.5;
/** What reaching into a face that had nothing on it costs. */
const MASK_BACKFIRE = 15;
/** How close a click has to land to count as "on them". */
const MASK_GRAB_R = 38;
/**
 * The bot's suspicion, in milliseconds: how long after a mask goes on before it reaches for
 * the face. Randomised inside the window so a player can never learn the tell.
 */
const BOT_GRAB_MIN_MS = 2000;
const BOT_GRAB_MAX_MS = 8000;
/** …and how often it considers reaching for a face with nothing on it, and how often it does. */
const BOT_BLUFF_EVERY_MS = 6000;
const BOT_BLUFF_CHANCE = 0.14;
/** The bot's own mask: the earliest it puts one on, and how long it waits after losing one. */
const NPC_MASK_OPENING_MS = 3500;
const NPC_MASK_REGRIP_MS = 2500;

// ── Duplication (E+) ─────────────────────────────────────────────────────────
/** How long the doubled Crack Shot lasts once you step back out of the pane you spent. */
const DUP_MS = 3000;
/** How far either side of the aim line the two bullets of a doubled shot leave from. */
const DUP_OFFSET = 9;
/** Slack across a pane's thickness for "walked through it" — roughly a body's radius. */
const DUP_WALK_SLACK = 16;

// ── Phantom (R+) ─────────────────────────────────────────────────────────────
const PHANTOM_FUSE_MS = 1000;
const PHANTOM_RADIUS = 100;
const PHANTOM_MARK_MS = 5000;
const PHANTOM_VULN_MULT = 1.2;
const PHANTOM_SLOW_MULT = 0.7;

// ── Re-Trick (F+) ────────────────────────────────────────────────────────────
const RETRICK_MS = 10000;
const RETRICK_MULT = 1.25;

// ── Bomb Dance (Q+) ──────────────────────────────────────────────────────────
const BOMB_COUNT = 12;
const BOMB_DAMAGE = 14;
const BOMB_SPEED_MIN = 210;
const BOMB_SPEED_MAX = 290;
/** Half-width of the cone the volley leaves in, around the line to the enemy. */
const BOMB_SPREAD = Math.PI / 3;
/** The fastest a bomb's wander can swing it, in radians a second, either way. */
const BOMB_TURN_MAX = 4.6;
/** How hard each bomb is pulled back towards the enemy, in radians a second. */
const BOMB_HOMING = 1.1;
const BOMB_LIFE_MS = 4200;
/** How close an enemy has to come before a bomb goes off… */
const BOMB_TRIGGER_R = 44;
/** …and how far the blast reaches when it does. */
const BOMB_AOE_R = 105;
const BOMB_SIZE = 9;
/** How long a blast leaves its victims facing the wrong way. */
const TURN_MS = 2600;
/**
 * Online: a remote illusionist's teleport arrives on the state stream a moment after the cast
 * that caused it, so their bombs wait this long to leave from where they actually landed.
 */
const BOMB_REMOTE_DELAY_MS = 160;

// ── Mastery: Reality Shift (passive) ─────────────────────────────────────────
/** This much damage inside the window and you are somewhere else. */
const SHIFT_DAMAGE = 50;
const SHIFT_WINDOW_MS = 2500;
/** After a shift, the tally starts again from nothing and cannot fire for this long. */
const SHIFT_LOCK_MS = 1500;

// ── World objects ────────────────────────────────────────────────────────────

/** A Crack Shot in flight. The Projectile itself lives in ArenaScene's shared group. */
interface Shot {
  owner: Owner;
  proj: Projectile;
  /**
   * Immersion Breaker (Click+): the bodies this bullet has already been through. Without it
   * a piercing shot bills the same target on every frame it overlaps them, which at 760 px/s
   * is three or four full hits for one click.
   */
  through: Set<Fighter>;
}

/** A pane of warped space. Immutable once hung — it never moves with its caster. */
interface Veil {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  until: number;
  seed: number;
  /** One kick (or one fan of illusions) per shot per pane, or a slow shot would spiral. */
  bent: Set<Projectile>;
  /**
   * E+ (Duplication): its owner has walked through it and spent it. Drawn grey from then on,
   * and it can never double anybody's shots again — it still bends and still fans.
   */
  consumed: boolean;
}

/**
 * An illusion bullet: the five a pane throws off alongside one of its owner's Crack Shots.
 * Kit-owned rather than a group `Projectile`, so nothing in the game can be hurt by one — but
 * anything that hurts one (a shot, a blast, a husk's spit, even its owner's own bullets) cracks
 * it, and the crack pays out exactly as a real bullet's wall crack does.
 */
interface Decoy {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  bornAt: number;
  diesAt: number;
  /** The real bullet it was split from, which lies on top of it at birth and must not pop it. */
  parent: Projectile | null;
  img: Phaser.GameObjects.Image;
}

/**
 * A Guise clone's drawn body: the fighter's own sprite at full size, its own rig, and a health
 * bar mirroring the real one. All three, because the opponent is meant to take it for the real
 * thing — a body with no bar over it would be the tell.
 */
interface CloneViz {
  img: Phaser.GameObjects.Image;
  avatar: IllusionAvatar;
  bar: HealthBar;
}

/** The red understudy a Relocate leaves behind, and the clock it is counting down. */
interface Phantom {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  blowsAt: number;
  seed: number;
}

/** Somebody caught by a Phantom: softer and slower until it lapses. */
interface Mark {
  owner: Owner;
  until: number;
}

/**
 * One Bomb Dance bomb. Kit-owned, so a Guise can keep it off the other screen. It flies roughly
 * at the enemy but never straight: its heading wanders on a turn rate that is re-rolled every
 * fraction of a second, with a gentle pull back towards the target so the volley as a whole
 * still arrives.
 */
interface Bomb {
  owner: Owner;
  x: number;
  y: number;
  heading: number;
  speed: number;
  turn: number;
  nextTurnAt: number;
  diesAt: number;
  seed: number;
  /** Online, a remote illusionist's bombs are drawn but never resolved — their sim does that. */
  live: boolean;
}

/** Online: a remote illusionist's volley, waiting for their teleport to reach us. */
interface PendingVolley {
  owner: Owner;
  count: number;
  at: number;
}

interface Side {
  owner: Owner;
  danceUntil: number;
  nextHopAt: number;
  /** Latched so the flag can be handed back exactly once when the dance ends. */
  phaseInstalled: boolean;
  /**
   * Bomb Dance (Q+): `rawDamageTaken` as it stood at the last hop. The upgrade fires when the
   * next hop arrives and this number hasn't moved — which is what "without taking any damage
   * since the last teleport" means, measured at the one place every hit in the game is tallied.
   */
  damageMark: number;
  /** Masquerade (mastery): the gold mask is on this side's face right now. */
  masked: boolean;
  /** When the mask went on. The 14s cooldown runs from here, not from when it came off. */
  maskCastAt: number;
  /** Reality Shift (mastery): recent hits, newest last, for the 50-in-2.5s tally. */
  shiftLog: Array<{ t: number; amt: number }>;
  /** `rawDamageTaken` as it stood last frame; -1 before the first look. */
  shiftRaw: number;
  /** …and the earliest the passive may fire again. */
  shiftLockUntil: number;
  /** E+ (Duplication): Crack Shots come out in pairs until here. */
  dupUntil: number;
  /** The pane this side spent, held on to while they are still standing in it. */
  dupVeil: Veil | null;
  /** Guise (F): when the clone fades. 0 when no clone is out. */
  guiseUntil: number;
  /** Latched so the fighter's size, alpha and visibility are handed back exactly once. */
  guiseInstalled: boolean;
  cloneX: number;
  cloneY: number;
  cloneVx: number;
  cloneVy: number;
  /** Everything the clone has soaked up this Guise. */
  cloneStored: number;
  /** The sprite the fighter was wearing at full size — the clone wears it too. */
  cloneTexture: string;
  cloneScale: number;
  /** Online: when this side last told the other screen where its clone is. */
  cloneSentAt: number;
  /** Re-Trick (F+): the surprise bonus runs until here. */
  retrickUntil: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, danceUntil: 0, nextHopAt: 0, phaseInstalled: false, damageMark: 0,
    // Ready on the first frame of a match: readiness is measured against `scene.time.now`,
    // which is already large by the time a kit is built, so 0 would lock the key out.
    masked: false, maskCastAt: -MASK_COOLDOWN_MS,
    shiftLog: [], shiftRaw: -1, shiftLockUntil: 0, dupUntil: 0, dupVeil: null,
    guiseUntil: 0, guiseInstalled: false, cloneX: 0, cloneY: 0, cloneVx: 0, cloneVy: 0,
    cloneStored: 0, cloneTexture: '', cloneScale: 1, cloneSentAt: 0, retrickUntil: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface IllusionArenaApi {
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
  /** Online PvP: the opponent is a real person with their own screen to lie to. */
  get isOnline(): boolean;
  /**
   * Invasion: the fighter in the npc slot is a co-op *ally*, not an opponent. Masquerade is a
   * duel mechanic on both halves — its bonus is written victim-side, and the player is not the
   * ally's victim — so the whole npc half of it stands down here.
   */
  get isInvasion(): boolean;
  /** Skins: maps an Illusion visual colour through that side's equipped skin. */
  illusionColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** The illusion messages the cast relay can't carry (blink, mask, the Guise clone). */
  sendIllusionMsg(msg: NetIllusionMsg): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded tricks reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
  /** Mastery: the enhancement bound over each of the player's slots this match. */
  masteryBindFor(slot: string): string | null;
  /** …and the opponent's, so a Nightmare bot or a remote player wears its own mask. */
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── IllusionKit ──────────────────────────────────────────────────────────────

export class IllusionKit {
  private api: IllusionArenaApi;

  // ── Visuals ──
  private readonly pcol: IllusionColorFn;
  private readonly ncol: IllusionColorFn;
  private readonly pfx: IllusionFx;
  private readonly nfx: IllusionFx;
  private playerAvatar: IllusionAvatar | null = null;
  private npcAvatar: IllusionAvatar | null = null;
  /** Panes and afterimages: under the fighters, over the shared projectile layer. */
  private fieldGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bomb Dance bombs: over the fighters, so a volley of them is unmissable. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * The opponent's effects while their Guise is up: a real `IllusionFx` whose every graphic is
   * born hidden. Everything the opponent does still happens — it is just not drawn here.
   */
  private readonly nfxHidden: IllusionFx;
  private clones: Record<Owner, CloneViz | null> = { player: null, npc: null };
  /**
   * What an AI is handed instead of the fighter while that fighter's Guise is up — see
   * `decoyOf`. Built once per side per match and dropped by `reset()`.
   */
  private decoys: Record<Owner, Fighter | null> = { player: null, npc: null };
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private shots: Shot[] = [];
  private veils: Veil[] = [];
  private phantoms: Phantom[] = [];
  private decoyShots: Decoy[] = [];
  private bombs: Bomb[] = [];
  private pendingVolleys: PendingVolley[] = [];
  /**
   * Everybody a Bomb Dance blast has turned around. Kept so the turn can be handed back (its
   * quarter zeroed) when it lapses, and so a bot or husk's walking can be turned with it.
   */
  private turned = new Set<Fighter>();
  /**
   * The velocity this kit last wrote onto each turned body. An AI that sets its velocity every
   * frame gets turned every frame; one that left last frame's alone must not be turned twice.
   */
  private turnedVel = new Map<Fighter, { x: number; y: number }>();
  /** The local camera's turn and the zoom factor that fits the arena inside it while sideways. */
  private camRot = 0;
  private camZoomF = 1;
  /** The camera those were written onto — a restarted scene has a fresh one to leave alone. */
  private camRef: Phaser.Cameras.Scene2D.Camera | null = null;
  private marks = new Map<Fighter, Mark>();
  /**
   * Every fighter this kit wrote `illusionIncomingMult` onto last frame. Rewriting from
   * scratch each frame is only safe if the previous frame's writes are handed back first,
   * or a mark that lapsed would leave a body permanently soft.
   */
  private touched = new Set<Fighter>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  /** The NPC's aim, latched from its own casts so its pane and its bullets agree. */
  private npcAimX = 0;
  private npcAimY = 0;

  // ── Mastery ──
  /**
   * Masquerade, bot side. The opponent cannot see the mask, so it is not allowed to *read*
   * one either: instead of checking whether the player is masked, the bot decides when it is
   * going to reach for the face and finds out the same way a person would. `grabAt` is set the
   * moment a mask actually goes on (2–8s of suspicion), and `bluffAt` is a separate, slower
   * clock that occasionally sends it reaching at a face with nothing on it — which costs it 15,
   * exactly as a wrong guess costs a player.
   */
  private botGrabAt = 0;
  private botBluffAt = 0;
  /** Rising edge of the local mouse, tracked here because `handleInput` is Illusion-only. */
  private prevPointerDown = false;
  /** The earliest a masked bot puts its own mask back on. */
  private npcMaskAt = 0;
  /** Per-side reach cooldown. Without it a spam-clicker takes 15 a frame off an empty face. */
  private grabLockUntil: Record<Owner, number> = { player: 0, npc: 0 };

  constructor(api: IllusionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.illusionColor('player', base);
    this.ncol = (base) => api.illusionColor('npc', base);
    this.pfx = new IllusionFx(api.scene, this.pcol);
    this.nfx = new IllusionFx(api.scene, this.ncol);
    this.nfxHidden = new IllusionFx(api.scene, this.ncol)
      .setSink((obj) => { (obj as Phaser.GameObjects.Graphics).setVisible(false); });
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): IllusionFx {
    if (owner === 'player') return this.pfx;
    return this.hides('npc') ? this.nfxHidden : this.nfx;
  }

  /**
   * Whether this side's attacks are being kept off the local screen: its Guise is up, so
   * nothing it throws may give away where it really is. Only ever the npc — the local player
   * always sees their own work.
   */
  private hides(owner: Owner): boolean {
    return owner === 'npc' && this.guised('npc');
  }

  private guised(owner: Owner): boolean { return this.side(owner).guiseUntil > 0; }

  /** A floating label for one side, unless that side is hiding from this screen. */
  private say(owner: Owner, x: number, y: number, text: string, color: string): void {
    if (!this.hides(owner)) this.api.showFloatingText(x, y, text, color);
  }

  /** …and a sound — panned by position, so it would give a hidden fighter away just as fast. */
  private sfx(owner: Owner, name: string, x: number, opts?: { volume?: number; rate?: number }): void {
    if (!this.hides(owner)) Sfx.playAt(name, x, opts);
  }
  private col(owner: Owner): IllusionColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private isIllusion(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'illusion' : this.api.npcElementId === 'illusion';
  }

  /**
   * Whether this side is running the given shop upgrade. The npc only ever answers true in
   * online play, where it is a real person's replica carrying that person's purchases.
   */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') {
      const p = this.api.player;
      return p && p.active && p.hp > 0 ? p : null;
    }
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return t && t.active && t.hp > 0 ? t : null;
  }

  private avatar(owner: Owner): IllusionAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private aimOf(owner: Owner): { x: number; y: number } {
    if (owner === 'player') return { x: this.aimX, y: this.aimY };
    return { x: this.npcAimX, y: this.npcAimY };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything written onto a fighter has to be handed back, or the next match starts with
    // somebody permanently tiny and somebody else permanently immune to bullets.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (f && this.sides[owner].phaseInstalled) f.projectilePhase = false;
      if (this.sides[owner].guiseInstalled) this.uninstallGuise(owner);
      this.destroyClone(owner);
    }
    this.decoys = { player: null, npc: null };
    // Same debt, different field: a Phantom's vulnerability is written straight onto bodies.
    for (const f of this.touched) f.illusionIncomingMult = 1;
    this.touched.clear();
    this.marks.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.shots = [];
    this.veils = [];
    this.phantoms = [];
    for (const d of this.decoyShots) d.img.destroy();
    this.decoyShots = [];
    this.bombs = [];
    this.pendingVolleys = [];
    for (const f of this.turned) { f.viewTurnedUntil = 0; f.viewTurnQuarter = 0; }
    this.turned.clear();
    this.turnedVel.clear();
    this.restoreCamera();
    this.aimX = 0;
    this.aimY = 0;
    this.npcAimX = 0;
    this.npcAimY = 0;
    this.vizT = 0;
    this.botGrabAt = 0;
    this.botBluffAt = 0;
    this.prevPointerDown = false;
    this.npcMaskAt = 0;
    this.grabLockUntil = { player: 0, npc: 0 };

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.fieldGfx?.destroy(); this.fieldGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'illusion') return;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // Mastery: Masquerade takes over whichever slot it was bound to. Handled before the base
    // keys because `JustDown` consumes the flag — testing the bind afterwards eats the press.
    const mask = this.maskSlot('player');
    if (mask) {
      const key = mask === 'e' ? this.api.eKey : mask === 'r' ? this.api.rKey
        : mask === 'f' ? this.api.fKey : this.api.qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryMasquerade('player', time);
    }

    if (clicked) p.castAbility('illusion-crack-shot', ctx);
    if (mask !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('illusion-veil', ctx);
    if (mask !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('illusion-relocate', ctx);
    if (mask !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      // F+ (Re-Trick): with a clone out, F is the swap — a recast, so the cooldown is not asked.
      if (this.guised('player') && this.up('player', 'f')) this.doRetrick('player');
      else p.castAbility('illusion-guise', ctx);
    }
    if (mask !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('illusion-dance', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Crack Shot. Solid, fast, and worth something even when it misses. */
  doCrackShot(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const sx = f.x + Math.cos(ang) * 26;
    const sy = f.y + Math.sin(ang) * 26;
    if (this.dupActive(owner)) {
      // E+ (Duplication): two bullets side by side on the same heading, one either side of the
      // aim line — a pair, not a spread, so both still go where you pointed.
      const px = -Math.sin(ang) * DUP_OFFSET;
      const py = Math.cos(ang) * DUP_OFFSET;
      this.spawnShot(owner, sx + px, sy + py, ang);
      this.spawnShot(owner, sx - px, sy - py, ang);
      this.fx(owner).split(sx, sy, ang, 0.18, ILL.spark);
    } else {
      this.spawnShot(owner, sx, sy, ang);
    }

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).shards(sx, sy, 3, 16, ILL.crimson, 260, 6);
  }

  /** One bullet, tracked. Shared by the ability and by Duplication's pair. */
  private spawnShot(owner: Owner, x: number, y: number, ang: number): Shot {
    const proj = new Projectile(this.api.scene, x, y, 'proj-illusion-crack', SHOT_DAMAGE, owner === 'player');
    proj.setRotation(ang);
    this.api.projectiles.add(proj);
    proj.launch(Math.cos(ang) * SHOT_SPEED, Math.sin(ang) * SHOT_SPEED);
    // Guise: a bullet out of nowhere is the whole point. It still flies and still hurts.
    if (this.hides(owner)) proj.setAlpha(0);
    const shot: Shot = { owner, proj, through: new Set() };
    this.shots.push(shot);
    return shot;
  }

  /**
   * Click+ (Immersion Breaker), called from both projectile-overlap paths in ArenaScene.
   *
   * Returning true means the kit has taken the whole hit and the bullet is still flying, so
   * the caller must neither resolve nor destroy it. Without the upgrade this answers false and
   * the shot goes down the ordinary path, where a body stops it.
   */
  onCrackShotHit(proj: Projectile, target: Fighter): boolean {
    const s = this.shots.find((sh) => sh.proj === proj);
    if (!s) return false;
    const pierces = this.up(s.owner, 'click');
    // Already been through this one — silently pass, so a single overlap can't be billed twice.
    if (pierces && s.through.has(target)) return true;
    s.through.add(target);
    // Every crack-shot overlap in the game arrives here, upgrade or not, which makes this the
    // one place a bullet landing on a body can be counted. Dodges never reach it — ArenaScene
    // rolls those above this hook.
    if (s.owner === 'player') this.api.recordMasteryStat('crackShotHits', 1);
    if (!pierces) return false;

    target.takeDamage(SHOT_DAMAGE);
    this.api.spawnHitFlash(target.x, target.y, this.col(s.owner)(ILL.crimson));
    const body = proj.body as Phaser.Physics.Arcade.Body | null;
    const through = body ? Math.atan2(body.velocity.y, body.velocity.x) : 0;
    this.fx(s.owner).pierceSpray(target.x, target.y, through);
    this.sfx(s.owner, 'crystal-shatter', target.x, { volume: 0.4, rate: 1.6 });
    return true;
  }

  /** E — Illusion Veil. A pane that belongs to nobody once it is hung. */
  doVeil(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const x = Phaser.Math.Clamp(f.x + Math.cos(ang) * VEIL_STANDOFF, this.left + 20, this.right - 20);
    const y = Phaser.Math.Clamp(f.y + Math.sin(ang) * VEIL_STANDOFF, this.top + 20, this.bottom - 20);
    // The pane stands across the aim, not along it — you hang it between yourself and them.
    this.veils.push({
      owner, x, y, ang: ang + Math.PI / 2, until: this.now + VEIL_MS,
      seed: Math.random() * 999, bent: new Set(), consumed: false,
    });

    this.avatar(owner)?.play('sweep', ang);
    this.avatar(owner)?.setScattered(true);
    this.fx(owner).ring(x, y, 12, VEIL_HALF_LEN, ILL.warp, 420);
    this.say(owner, f.x, f.y - 46, '🌫️ VEIL', this.hex(ILL.warp));
  }

  /** R — Relocate. The whole ability is one line; the point is that there is nothing else. */
  doRelocate(owner: Owner): void {
    const f = this.fighter(owner);
    const fromX = f?.x ?? 0;
    const fromY = f?.y ?? 0;
    const alive = !!f && f.active && f.hp > 0;
    const leaves = alive && this.up(owner, 'r');
    this.teleportToCorner(owner, true);
    // R+ (Phantom): the understudy stays where the real one was standing.
    if (leaves) this.dropPhantom(owner, fromX, fromY);
    // Q+ (Bomb Dance): a Relocate taken mid-Dance is one more teleport, and every teleport in
    // the Dance throws a volley — this one with no clean-hop condition, because it was pressed.
    if (alive && this.isDancing(owner)) this.danceVolley(owner);
  }

  /**
   * F — Guise. The illusionist shrinks to a fifth of their size, speeds up and vanishes, and a
   * full-size clone walks off after the cursor wearing their face, their rig and their health
   * bar. Everything that comes for the clone is remembered, and a fifth of it is paid back to
   * the enemy when the clone fades.
   *
   * Online the cast is replayed on the opponent's sim like any other, so their copy of us
   * shrinks and hides there too; the clone's position is streamed separately (`k:'clone'`),
   * because only this sim knows where our cursor is.
   */
  doGuise(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }
    const s = this.side(owner);
    // A recast with a clone already out is Re-Trick's business, and without the upgrade it is
    // simply not available — the cooldown would have refused it anyway.
    if (this.guised(owner)) return;

    // The clone is the body the fighter had a moment ago, so it is captured before the shrink.
    s.cloneTexture = f.texture.key;
    s.cloneScale = f.scaleX;
    s.cloneX = f.x;
    s.cloneY = f.y;
    s.cloneVx = 0;
    s.cloneVy = 0;
    s.cloneStored = 0;
    s.cloneSentAt = 0;
    s.guiseUntil = this.now + GUISE_MS;
    this.installGuise(owner);

    // The puff is visible to everyone — it is the clone's opponent who is meant to believe the
    // smoke cleared on the same body. What they must not get is a tell for the *small* one.
    const fx = this.fx(owner);
    fx.ring(f.x, f.y, 8, 46, ILL.violet, 360);
    fx.shards(f.x, f.y, 6, 26, ILL.magenta, 360, 6);
    this.avatar(owner)?.play('flex');
    if (owner === 'player') {
      Sfx.playAt('blink', f.x, { volume: 0.6, rate: 1.3 });
      this.api.showFloatingText(f.x, f.y - 50, '🎭 GUISE', this.hex(ILL.magenta));
    }
  }

  /**
   * F+ — Re-Trick. Swap into the clone: the illusionist arrives exactly where it stood, at full
   * size, and the clone is simply not there any more. Its store is still paid out — it faded,
   * after all — and the surprise is worth 25% more damage for ten seconds.
   *
   * Nothing about the swap is drawn on the opponent's screen. From their side the body they
   * were chasing just keeps standing there, now real.
   */
  doRetrick(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0 || !this.guised(owner) || !this.up(owner, 'f')) return;
    const x = s.cloneX;
    const y = s.cloneY;

    this.payOut(owner, false);
    this.endGuise(owner);
    // Online: a replica's position belongs to the peer's state stream, but their next packet
    // carries this exact spot — moving it here too saves a frame of it standing in the old one.
    this.body(f).reset(x, y);
    s.retrickUntil = this.now + RETRICK_MS;

    if (owner === 'player') {
      this.pfx.blinkIn(x, y, ILL.magenta);
      this.pfx.ring(x, y, 10, 40, ILL.crimson, 300);
      this.api.showFloatingText(x, y - 50, '🃏 RE-TRICK', this.hex(ILL.crimson));
      if (this.api.isOnline) this.api.sendIllusionMsg({ t: 'ill', k: 'retrick', x, y });
    }
  }

  /** Shrink, speed up and vanish. Re-applied every frame by `updateGuise` so nothing drops it. */
  private installGuise(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.guiseInstalled = true;
    if (f.shapeSizeMult !== GUISE_SIZE) { f.shapeSizeMult = GUISE_SIZE; f.applySizeMult(); }
    if (owner === 'player') {
      // Hidden from everyone else; a ghost to its own player, who still has to steer it.
      f.setAlpha(GUISE_SELF_ALPHA);
    } else {
      f.forceInvisible = true;
      f.setAlpha(0);
      f.setHealthBarVisible(false);
    }
  }

  private uninstallGuise(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.guiseInstalled = false;
    if (!f) return;
    if (f.shapeSizeMult !== 1) {
      f.shapeSizeMult = 1;
      if (f.active) f.applySizeMult();
    }
    if (owner === 'npc') {
      f.forceInvisible = false;
      if (f.active) f.setHealthBarVisible(true);
    }
    if (f.active) f.setAlpha(1);
  }

  /** The clone is gone, whichever way it went. Its store has already been paid by the caller. */
  private endGuise(owner: Owner): void {
    const s = this.side(owner);
    s.guiseUntil = 0;
    s.cloneStored = 0;
    this.uninstallGuise(owner);
    this.destroyClone(owner);
  }

  /**
   * A fifth of everything the clone soaked up, paid to whoever is nearest it. Resolved only on
   * the sim that owns the clone — a remote illusionist's sim pays us, and its hit is relayed.
   */
  private payOut(owner: Owner, loud: boolean): void {
    const s = this.side(owner);
    const fx = this.fx(owner);
    if (loud) {
      fx.shards(s.cloneX, s.cloneY, 10, 34, ILL.violet, 460, 8);
      fx.blinkOut(s.cloneX, s.cloneY, ILL.violet);
      this.sfx(owner, 'crystal-shatter', s.cloneX, { volume: 0.6, rate: 1.2 });
    }
    if (owner === 'npc' && this.api.isOnline) return;
    const amount = Math.round(s.cloneStored * GUISE_PAYOUT);
    if (amount < 1) return;
    const target = owner === 'player'
      ? this.api.getNearestEnemy(s.cloneX, s.cloneY)
      : this.api.player;
    if (!target || !target.active || target.hp <= 0) return;
    fx.crackBeam(s.cloneX, s.cloneY, target.x, target.y, ILL.violet);
    target.takeDamage(amount);
    this.api.spawnHitFlash(target.x, target.y, this.col(owner)(ILL.violet));
    this.say(owner, target.x, target.y - 50, `🎭 ${amount} RETURNED`, this.hex(ILL.violet));
  }

  /**
   * The clone soaking up a hit. Only the owning sim banks it (see `payOut`); the other screen
   * still stops the shot on the body it believes in.
   */
  private cloneAbsorb(owner: Owner, amount: number): void {
    if (!this.guised(owner) || amount <= 0) return;
    const s = this.side(owner);
    if (!(owner === 'npc' && this.api.isOnline)) s.cloneStored += amount;
    this.api.spawnHitFlash(s.cloneX, s.cloneY, this.col(owner)(ILL.violet));
  }

  /** Whether a point is on this side's clone, with some slack for whatever is testing it. */
  private onClone(owner: Owner, x: number, y: number, slack: number): boolean {
    const s = this.side(owner);
    return this.guised(owner)
      && Phaser.Math.Distance.Between(x, y, s.cloneX, s.cloneY) <= CLONE_HIT_R + slack;
  }

  private updateGuise(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      if (!this.guised(owner)) continue;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) { this.endGuise(owner); continue; }
      if (time >= s.guiseUntil) {
        this.payOut(owner, true);
        this.endGuise(owner);
        continue;
      }
      // Held every frame: a Fate roll, a hit flash or another kit's resize must not be the
      // thing that hands the illusionist their body back early.
      this.installGuise(owner);

      // ── Where the clone goes ──
      // The local player's clone follows the cursor at the fighter's own walking pace. A
      // bot's holds range on its target like a fighter would. A remote illusionist's is
      // wherever their last `k:'clone'` said it was.
      if (!(owner === 'npc' && this.api.isOnline)) {
        let gx: number;
        let gy: number;
        if (owner === 'player') {
          gx = this.aimX;
          gy = this.aimY;
        } else {
          const p = this.api.player;
          const ang = Math.atan2(s.cloneY - p.y, s.cloneX - p.x) + dt * 0.7;
          gx = p.x + Math.cos(ang) * CLONE_BOT_RANGE;
          gy = p.y + Math.sin(ang) * CLONE_BOT_RANGE;
        }
        gx = Phaser.Math.Clamp(gx, this.left + 24, this.right - 24);
        gy = Phaser.Math.Clamp(gy, this.top + 24, this.bottom - 24);
        const dx = gx - s.cloneX;
        const dy = gy - s.cloneY;
        const d = Math.hypot(dx, dy);
        const speed = f.speed;
        if (d > 4) {
          const step = Math.min(d, speed * dt);
          s.cloneVx = (dx / d) * speed;
          s.cloneVy = (dy / d) * speed;
          s.cloneX += (dx / d) * step;
          s.cloneY += (dy / d) * step;
        } else {
          s.cloneVx = 0;
          s.cloneVy = 0;
        }
      }
      if (owner === 'player' && this.api.isOnline && time - s.cloneSentAt >= CLONE_SYNC_MS) {
        s.cloneSentAt = time;
        this.api.sendIllusionMsg({ t: 'ill', k: 'clone', x: s.cloneX, y: s.cloneY });
      }

      // ── What hits it ──
      // A snapshot: `destroy()` splices the group's live array.
      const mineIsPlayer = owner === 'player';
      for (const obj of [...this.api.projectiles.getChildren()]) {
        const p = obj as Projectile;
        if (!p.active || !p.body || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        if (!this.onClone(owner, p.x, p.y, 6)) continue;
        this.cloneAbsorb(owner, Math.max(1, p.damage ?? 8));
        p.destroy();
      }
    }
  }

  // ── Guise: the clone's body ────────────────────────────────────────────────

  private destroyClone(owner: Owner): void {
    const c = this.clones[owner];
    if (!c) return;
    c.img.destroy();
    c.avatar.destroy();
    c.bar.destroy();
    this.clones[owner] = null;
  }

  private updateClones(delta: number): void {
    const { scene } = this.api;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.guised(owner) || !f) { this.destroyClone(owner); continue; }
      let c = this.clones[owner];
      if (!c) {
        const key = scene.textures.exists(s.cloneTexture) ? s.cloneTexture : 'elem-illusion';
        c = {
          img: scene.add.image(s.cloneX, s.cloneY, key).setDepth(5).setScale(s.cloneScale),
          avatar: new IllusionAvatar(scene, this.col(owner)),
          bar: new HealthBar(scene, f.maxHp),
        };
        this.clones[owner] = c;
      }
      c.img.setPosition(s.cloneX, s.cloneY);
      // The opponent's copy faces whoever it is pretending to fight; ours faces the way it walks.
      const foe = owner === 'player' ? this.api.getNearestEnemy(s.cloneX, s.cloneY) : this.api.player;
      const facing = foe && foe.active
        ? Math.atan2(foe.y - s.cloneY, foe.x - s.cloneX)
        : Math.atan2(s.cloneVy, s.cloneVx);
      c.avatar.setFacing(facing);
      c.avatar.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      // The last third of a second fades it, so the shatter has something to come out of.
      const fade = Phaser.Math.Clamp((s.guiseUntil - this.now) / 300, 0, 1);
      c.img.setAlpha(fade);
      c.avatar.update(delta, s.cloneX, s.cloneY, fade);
      c.bar.setMaxHp(f.maxHp);
      c.bar.update(s.cloneX, s.cloneY, f.hp, f.shieldHp);
    }
  }

  /**
   * What an AI chases instead of this side's fighter while its Guise is up: the real fighter,
   * standing where the clone is. Reads of `x`, `y` and `body.velocity` answer for the clone;
   * a `takeDamage` lands in the clone's store; every write is swallowed, so a slow or a bleed
   * a husk tries to put on "the player" goes nowhere. Everything else (hp, element, flags)
   * still reads through, so the AI's own decisions about range and health stay honest.
   */
  private decoyOf(owner: Owner): Fighter | null {
    if (!this.guised(owner)) return null;
    const real = this.fighter(owner);
    if (!real) return null;
    const cached = this.decoys[owner];
    if (cached) return cached;
    const kit = this;
    const realBody = real.body as Phaser.Physics.Arcade.Body;
    const body = new Proxy(realBody, {
      get(t, k) {
        if (k === 'velocity') {
          const s = kit.side(owner);
          return new Phaser.Math.Vector2(s.cloneVx, s.cloneVy);
        }
        const v = Reflect.get(t, k, t);
        // Nothing may move or reshape the real body through the decoy.
        return typeof v === 'function' ? () => undefined : v;
      },
      set() { return true; },
    });
    const decoy = new Proxy(real, {
      get(t, k) {
        const s = kit.side(owner);
        if (k === 'x') return s.cloneX;
        if (k === 'y') return s.cloneY;
        if (k === 'body') return body;
        if (k === 'takeDamage') return (amount: number) => kit.cloneAbsorb(owner, amount);
        return Reflect.get(t, k, t);
      },
      set() { return true; },
    });
    this.decoys[owner] = decoy;
    return decoy;
  }

  /** Q — Illusion Dance. Twenty seconds of being somewhere else and being made of nothing. */
  doDance(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.danceUntil = this.now + DANCE_MS;
    s.nextHopAt = this.now + DANCE_HOP_MS;
    // Q+: the dance's opening counts as the first teleport, so the first hop can already
    // pay out if nothing has touched you in the three seconds since you pressed it.
    s.damageMark = f ? f.rawDamageTaken : 0;
    if (f) {
      f.projectilePhase = true;
      s.phaseInstalled = true;
      this.avatar(owner)?.play('raise');
      this.avatar(owner)?.setEchoes(6);
      this.fx(owner).ring(f.x, f.y, 14, 130, ILL.violet, 620);
      this.fx(owner).ring(f.x, f.y, 14, 168, ILL.magenta, 760);
      this.say(owner, f.x, f.y - 50, '🎭 ILLUSION DANCE', this.hex(ILL.magenta));
    }
  }

  // ── Phantom (R+) ───────────────────────────────────────────────────────────

  private dropPhantom(owner: Owner, x: number, y: number): void {
    this.phantoms.push({
      owner, x, y, bornAt: this.now, blowsAt: this.now + PHANTOM_FUSE_MS, seed: Math.random() * 999,
    });
    this.fx(owner).ring(x, y, 8, 40, ILL.crimson, 320);
    this.say(owner, x, y - 42, '👻 PHANTOM', this.hex(ILL.crimson));
  }

  private updatePhantoms(time: number): void {
    for (let i = this.phantoms.length - 1; i >= 0; i--) {
      const p = this.phantoms[i];
      if (time < p.blowsAt) continue;
      this.phantoms.splice(i, 1);
      this.detonatePhantom(p);
    }
  }

  private detonatePhantom(p: Phantom): void {
    this.fx(p.owner).phantomBurst(p.x, p.y, PHANTOM_RADIUS);
    this.sfx(p.owner, 'blink', p.x, { volume: 0.7, rate: 0.7 });

    for (const t of this.targetsOf(p.owner)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > PHANTOM_RADIUS) continue;
      // Re-marking refreshes rather than stacking: two Phantoms in five seconds is a longer
      // window on the same debuff, not a compounding one.
      this.marks.set(t, { owner: p.owner, until: this.now + PHANTOM_MARK_MS });
      this.api.spawnHitFlash(t.x, t.y, this.col(p.owner)(ILL.crimson));
      this.api.showFloatingText(t.x, t.y - 44, '👻 UNDERSTUDIED', this.hex(ILL.crimson));
    }
  }

  private updateMarks(time: number): void {
    for (const [f, m] of [...this.marks]) {
      if (!f.active || f.hp <= 0 || time >= m.until) this.marks.delete(f);
    }
  }

  /**
   * Every damage bonus this element writes onto its victims, rewritten from scratch.
   *
   * Pulled together into one pass because they share a field, and share a field because a
   * Phantom-marked body hit by a masked, Re-Tricked illusionist is meant to be worth
   * 1.2 × 1.5 × 1.25 rather than whichever of the three happened to write last.
   */
  private refreshIncoming(time: number): void {
    const next = new Map<Fighter, number>();
    const mul = (f: Fighter, m: number): void => { next.set(f, (next.get(f) ?? 1) * m); };

    for (const [f, m] of this.marks) {
      if (f.active && f.hp > 0 && m.until > time) mul(f, PHANTOM_VULN_MULT);
    }
    // Masquerade and Re-Trick: the wearer's 50% is written onto everything they are allowed to hurt, which
    // in every mode this element sees is exactly the set of things that can damage them back.
    // A remote opponent's mask is skipped: their sim already applied it and relayed the result,
    // so a second application here would bill the hit twice.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (owner === 'npc' && (this.api.isOnline || this.api.isInvasion)) continue;
      const s = this.side(owner);
      if (s.masked) for (const t of this.targetsOf(owner)) mul(t, MASK_DAMAGE_MULT);
      // F+ Re-Trick: the surprise is the illusionist's, so it is written onto what they hit —
      // the same victim-side field the mask uses, so the two multiply.
      if (s.retrickUntil > time) for (const t of this.targetsOf(owner)) mul(t, RETRICK_MULT);
    }

    for (const f of this.touched) if (!next.has(f)) f.illusionIncomingMult = 1;
    this.touched.clear();
    for (const [f, m] of next) { f.illusionIncomingMult = m; this.touched.add(f); }
  }

  // ── Teleporting ────────────────────────────────────────────────────────────

  /** The corners, in reading order. Inset so nobody ever arrives inside a wall. */
  private corners(): Array<{ x: number; y: number }> {
    return [
      { x: this.left + CORNER_INSET, y: this.top + CORNER_INSET },
      { x: this.right - CORNER_INSET, y: this.top + CORNER_INSET },
      { x: this.left + CORNER_INSET, y: this.bottom - CORNER_INSET },
      { x: this.right - CORNER_INSET, y: this.bottom - CORNER_INSET },
    ];
  }

  /**
   * Somewhere else, now. `announce` is off for the dance's own hops — one floating label
   * every three seconds for twenty seconds would bury everything else on screen.
   */
  private teleportToCorner(owner: Owner, announce: boolean): void {
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;

    // Never the corner already stood in: "random" that can leave you where you were is a
    // dead ability roughly a quarter of the time.
    const all = this.corners();
    const nearest = all.reduce((best, c, i) => (
      Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y)
        < Phaser.Math.Distance.Between(f.x, f.y, all[best].x, all[best].y) ? i : best), 0);
    const choices = all.filter((_, i) => i !== nearest);
    const to = choices[Math.floor(Math.random() * choices.length)];

    const fx = this.fx(owner);
    fx.blinkOut(f.x, f.y, ILL.violet);
    // Online: a replica's position belongs to the peer's state stream. Moving it here would
    // only be undone by the next packet, so the replay keeps the effect and drops the jump.
    if (!(owner === 'npc' && this.api.isOnline)) this.body(f).reset(to.x, to.y);
    fx.blinkIn(to.x, to.y, ILL.magenta);
    this.sfx(owner, 'blink', to.x, { volume: 0.8 });

    this.avatar(owner)?.play('dash');
    this.avatar(owner)?.setScattered(true);
    if (announce) this.say(owner, to.x, to.y - 46, '✨ RELOCATE', this.hex(ILL.violet));
    // Recorded unconditionally, mastery or not — this is how the mastery is earned. The R, the
    // Dance's own hops and a mastered Reality Shift all come through here.
    if (owner === 'player') this.api.recordMasteryStat('teleports', 1);
  }

  // ── Mastery: Reality Shift ─────────────────────────────────────────────────

  /** Whether this side is a mastered illusionist, and therefore shifts out of a beating. */
  private hasRealityShift(owner: Owner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive && this.isIllusion('npc');
  }

  /** How much of the 50 this side has taken inside the current window. */
  private shiftTally(owner: Owner, time: number): number {
    let sum = 0;
    for (const e of this.side(owner).shiftLog) if (time - e.t <= SHIFT_WINDOW_MS) sum += e.amt;
    return sum;
  }

  /**
   * Take 50 inside two and a half seconds and you are in a random corner. Read off
   * `rawDamageTaken`, the one tally every hit in the game is billed against, so blasts, beams,
   * bleeds and shots all count the same.
   *
   * A remote illusionist's tally belongs to their sim — it is the only one that sees every hit
   * they take — so ours never fires it for them; it tells us with `k:'shift'` instead.
   */
  private updateShift(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.hasRealityShift(owner)) continue;
      if (owner === 'npc' && this.api.isOnline) continue;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const s = this.side(owner);

      const raw = f.rawDamageTaken;
      if (s.shiftRaw < 0) s.shiftRaw = raw;
      const took = raw - s.shiftRaw;
      s.shiftRaw = raw;
      if (took > 0) s.shiftLog.push({ t: time, amt: took });
      while (s.shiftLog.length && time - s.shiftLog[0].t > SHIFT_WINDOW_MS) s.shiftLog.shift();

      if (time < s.shiftLockUntil || this.shiftTally(owner, time) < SHIFT_DAMAGE) continue;
      s.shiftLog = [];
      s.shiftLockUntil = time + SHIFT_LOCK_MS;
      this.realityShift(owner);
      if (owner === 'player' && this.api.isOnline) this.api.sendIllusionMsg({ t: 'ill', k: 'shift' });
    }
  }

  /** Out of the beating and into a corner — and, mid-Dance, one more volley of bombs. */
  private realityShift(owner: Owner): void {
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;
    this.teleportToCorner(owner, false);
    this.fx(owner).ring(f.x, f.y, 10, 54, ILL.warp, 420);
    this.say(owner, f.x, f.y - 48, '🚪 REALITY SHIFT', this.hex(ILL.warp));
    if (this.isDancing(owner)) this.danceVolley(owner);
  }

  // ── Mastery: Masquerade ────────────────────────────────────────────────────

  /** The slot Masquerade is bound over for this side, or null when it isn't bound. */
  private maskSlot(owner: Owner): 'e' | 'r' | 'f' | 'q' | null {
    const on = owner === 'player' ? this.api.masteryActive
      : this.api.npcMasteryActive && this.isIllusion('npc');
    if (!on) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === 'masquerade') return s;
    }
    return null;
  }

  private tryMasquerade(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;
    if (s.masked) return;
    if (time - s.maskCastAt < MASK_COOLDOWN_MS) return;
    s.maskCastAt = time;
    this.wearMask(owner);
  }

  /**
   * On it goes — silently on the other side's screen.
   *
   * Nothing here is allowed to be visible to the opponent: no flash, no floating text, no
   * sound, and (in `updateAvatars`) no mask drawn on their copy of the wearer. The only side
   * that ever learns a mask exists is the side wearing it.
   */
  private wearMask(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.masked = true;
    if (owner === 'player') {
      this.pfx.ring(f.x, f.y, 10, 48, 0xffc94a, 380);
      Sfx.playAt('blink', f.x, { volume: 0.45, rate: 1.5 });
      this.api.showFloatingText(f.x, f.y - 52, '🎭 MASQUERADE', '#ffc94a');
      // The peer needs the flag so its own damage indicators keep lying for us. It is never
      // used to draw anything — see `handleNetMsg`.
      if (this.api.isOnline) this.api.sendIllusionMsg({ t: 'ill', k: 'mask', on: true });
    }
  }

  /** And off it comes, which — unlike putting it on — everybody gets to watch. */
  private removeMask(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.masked = false;
    this.fx(owner).maskBreak(f.x, f.y - 4);
    this.sfx(owner, 'crystal-shatter', f.x, { volume: 0.7, rate: 1.1 });
    this.say(owner, f.x, f.y - 52, '🎭 UNMASKED', '#ffc94a');
    if (owner === 'npc') this.npcMaskAt = time + NPC_MASK_REGRIP_MS;
    if (owner === 'player' && this.api.isOnline) this.api.sendIllusionMsg({ t: 'ill', k: 'mask', on: false });
  }

  /**
   * Somebody reached for the other side's face.
   *
   * The reach is blind by construction: the grabber never gets to check whether there is a
   * mask there first, because knowing would be the whole ability. A mask comes off; an empty
   * face costs the person who reached 15. Rate-limited, or a spam-clicker facing an unmasked
   * illusionist would kill themselves in under two seconds.
   */
  private attemptGrab(grabber: Owner, time: number): void {
    if (time < this.grabLockUntil[grabber]) return;
    this.grabLockUntil[grabber] = time + 1200;

    const victim: Owner = grabber === 'player' ? 'npc' : 'player';
    const vf = this.fighter(victim);
    const gf = this.fighter(grabber);
    if (!vf || !vf.active || vf.hp <= 0 || !gf || !gf.active || gf.hp <= 0) return;

    this.fx(grabber).grab(vf.x, vf.y);
    Sfx.playAt('blink', vf.x, { volume: 0.5, rate: 1.6 });

    if (this.side(victim).masked) { this.removeMask(victim, time); return; }
    gf.takeDamage(MASK_BACKFIRE);
    this.api.spawnHitFlash(gf.x, gf.y, this.col(grabber)(ILL.crimson));
    this.api.showFloatingText(gf.x, gf.y - 50, '🤚 NOTHING THERE', this.hex(ILL.crimson));
  }

  /**
   * Everything the mask does outside of being worn: the bot putting its own on, a human
   * clicking at one, and the bot reaching for a human's.
   *
   * The bot's half is kept here rather than in `NpcOpponent` on purpose. Every other bot
   * behaviour reads an opportunity the kit published, but the whole point of this one is that
   * the opponent has no idea whether a mask is there — so the kit *drives* the reach on a
   * blind timer instead of handing the AI a flag that would tell it the answer.
   */
  private updateMasquerade(time: number): void {
    const playerIll = this.api.elementId === 'illusion';
    const npcIll = this.api.npcElementId === 'illusion';

    const ptr = this.api.scene.input.activePointer;
    const clicked = ptr.isDown && !this.prevPointerDown;
    this.prevPointerDown = ptr.isDown;

    // ── The opponent as illusionist: its own mask, and our clicks at it ──
    // Not gated on us being something else: in a mirror match either illusionist may reach for
    // the other's face, which does mean an ordinary attack click landing on top of an unmasked
    // opponent costs 15. That is the rule working, not a hole in it.
    if (npcIll && !this.api.isInvasion) {
      const f = this.api.npc;
      const alive = !!f && f.active && f.hp > 0;

      // A bot wears one on its own initiative. A remote player's mask belongs to their sim.
      if (alive && !this.api.isOnline && this.maskSlot('npc') && !this.sides.npc.masked) {
        if (this.npcMaskAt === 0) this.npcMaskAt = time + NPC_MASK_OPENING_MS;
        else if (time >= this.npcMaskAt && time - this.sides.npc.maskCastAt >= MASK_COOLDOWN_MS) {
          this.sides.npc.maskCastAt = time;
          this.wearMask('npc');
        }
      }

      if (clicked && alive) {
        const r = MASK_GRAB_R * Math.max(1, f.sizeMult * f.shapeSizeMult);
        if (Phaser.Math.Distance.Between(ptr.worldX, ptr.worldY, f.x, f.y) <= r) {
          if (this.api.isOnline) {
            // Their face, their sim. We show the reach and let them tell us what was under it.
            if (time >= this.grabLockUntil.player) {
              this.grabLockUntil.player = time + 1200;
              this.pfx.grab(f.x, f.y);
              this.api.sendIllusionMsg({ t: 'ill', k: 'grab' });
            }
          } else {
            this.attemptGrab('player', time);
          }
        }
      }
    }

    // ── Us as illusionist: the bot deciding, blindly, when to reach ──
    if (playerIll && !this.api.isOnline && this.maskSlot('player')) {
      const bot = this.api.npc;
      if (bot && bot.active && bot.hp > 0) {
        if (this.sides.player.masked) {
          // Something about this fight is off. It takes 2–8 seconds to act on that.
          if (this.botGrabAt === 0) {
            this.botGrabAt = time + BOT_GRAB_MIN_MS + Math.random() * (BOT_GRAB_MAX_MS - BOT_GRAB_MIN_MS);
          } else if (time >= this.botGrabAt) {
            this.botGrabAt = 0;
            this.attemptGrab('npc', time);
          }
        } else {
          this.botGrabAt = 0;
          // …and sometimes it is simply wrong, and pays the 15 for it. A bot that only ever
          // reaches when there is something to find is a bot that has read the save file.
          if (this.botBluffAt === 0) this.botBluffAt = time + BOT_BLUFF_EVERY_MS;
          else if (time >= this.botBluffAt) {
            this.botBluffAt = time + BOT_BLUFF_EVERY_MS;
            if (Math.random() < BOT_BLUFF_CHANCE) this.attemptGrab('npc', time);
          }
        }
      }
    }
  }

  /**
   * Whether the damage numbers the local player sees over themselves are currently lying.
   *
   * Read by ArenaScene's own `damaged` listener rather than applied in `Fighter`, because the
   * mask has to change the *drawn* number without changing the number every other system in
   * the game is working from. Self-inflicted hits are exempt — the mask had nothing to do with
   * those, and a Plasma player poisoning themselves should still read their own cost honestly.
   */
  private concealsFromPlayer(): boolean {
    return this.sides.npc.masked && this.api.npcElementId === 'illusion' && !this.api.isInvasion
      && !this.api.player.damageWasSelfInflicted;
  }

  /** The figure the local player is allowed to see for a hit they just took. */
  maskDisplayDamage(amount: number): number {
    if (amount <= 0 || !this.concealsFromPlayer()) return amount;
    return Math.round(amount / MASK_DAMAGE_MULT);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'illusion';
    const npcIs = this.api.npcElementId === 'illusion';
    // Phantom marks and a Guise outlive their caster's presence in a match (an online opponent
    // can mark you and then die), so their bookkeeping has to run even when neither side is
    // Illusion — a mark left un-expired would leave a body soft for the rest of the fight.
    // A Bomb Dance turn is the same: the local camera has to be handed back even after the
    // illusionist who turned it has gone.
    if (!playerIs && !npcIs && this.marks.size === 0 && this.touched.size === 0
        && !this.guised('player') && !this.guised('npc')
        && this.turned.size === 0 && this.camRot === 0 && this.camZoomF === 1
        && this.api.player?.viewTurnedUntil <= time) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateShots(time);
    this.updateVeils(time);
    this.updateDecoys(time, delta);
    this.updateGuise(time, delta);
    this.updatePhantoms(time);
    this.updateVolleys(time);
    this.updateBombs(time, delta);
    this.updateShift(time);
    this.updateMasquerade(time);
    for (const owner of ['player', 'npc'] as Owner[]) this.updateDance(owner, time);
    this.updateMarks(time);
    this.updateTurned(time, delta);
    this.refreshIncoming(time);
    this.updateAvatars(delta, playerIs, npcIs);
    this.updateClones(delta);

    this.paintField(time);
    this.paintAir(time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. The panes belong behind them (they are in the floor's plane and
    // must never hide a character); the bombs belong in front.
    if (!this.fieldGfx) this.fieldGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  // ── Crack Shot ─────────────────────────────────────────────────────────────

  /**
   * The one thing this has to get right: telling "hit the wall" apart from "hit a person".
   * A bullet that reaches the arena edge is cracked here and destroyed by us; a bullet that
   * goes inactive anywhere else was eaten by a body, a shield or a block, and pays nothing.
   */
  private updateShots(time: number): void {
    void time;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const p = s.proj;
      if (!p || !p.active || !p.body) { this.shots.splice(i, 1); continue; }

      const atLeft = p.x <= this.left + WALL_MARGIN;
      const atRight = p.x >= this.right - WALL_MARGIN;
      const atTop = p.y <= this.top + WALL_MARGIN;
      const atBottom = p.y >= this.bottom - WALL_MARGIN;
      if (!atLeft && !atRight && !atTop && !atBottom) continue;

      // Pin the crack to the wall it actually met, not to the bullet's centre.
      const hx = atLeft ? this.left : atRight ? this.right : p.x;
      const hy = atTop ? this.top : atBottom ? this.bottom : p.y;
      const inward = Math.atan2(this.api.height / 2 - hy, this.api.width / 2 - hx);

      p.setActive(false).setVisible(false);
      (p.body as Phaser.Physics.Arcade.Body).stop();
      this.shots.splice(i, 1);
      this.crack(s.owner, hx, hy, inward);
    }
  }

  /** The bullet splits, and the split goes looking for whoever it was supposed to hit. */
  private crack(owner: Owner, x: number, y: number, inwardAng: number): void {
    const fx = this.fx(owner);
    fx.wallCrack(x, y, inwardAng, ILL.crimson);
    this.sfx(owner, 'crystal-shatter', x, { volume: 0.55, rate: 1.35 });

    const target = this.enemyOf(owner);
    if (!target) return;
    fx.crackBeam(x, y, target.x, target.y, ILL.crimson);
    target.takeDamage(CRACK_DAMAGE);
    this.api.spawnHitFlash(target.x, target.y, this.col(owner)(ILL.crimson));
    // The splinter counts towards Off The Wall exactly as the bullet does — the requirement is
    // about landing the click, and this element gives the click two ways to land.
    if (owner === 'player') this.api.recordMasteryStat('crackShotHits', 1);
  }

  // ── Illusion Veil ──────────────────────────────────────────────────────────

  private updateVeils(time: number): void {
    for (let i = this.veils.length - 1; i >= 0; i--) {
      const v = this.veils[i];
      if (time >= v.until) {
        this.fx(v.owner).ring(v.x, v.y, VEIL_HALF_LEN, 14, v.consumed ? ILL.ghost : ILL.warp, 320);
        this.veils.splice(i, 1);
        continue;
      }
      this.bendThrough(v);
    }
    for (const owner of ['player', 'npc'] as Owner[]) this.updateDuplication(owner, time);
  }

  /** Whether a point is inside a pane, with some slack across its thickness. */
  private inPane(v: Veil, x: number, y: number, slack: number): boolean {
    const ca = Math.cos(-v.ang);
    const sa = Math.sin(-v.ang);
    const dx = x - v.x;
    const dy = y - v.y;
    const along = dx * ca - dy * sa;
    const across = dx * sa + dy * ca;
    return Math.abs(along) <= VEIL_HALF_LEN && Math.abs(across) <= VEIL_HALF_THICK + slack;
  }

  /**
   * E+ (Duplication): walking through one of your own panes spends it — it goes grey — and your
   * Crack Shots come out in pairs for as long as you stand in it and three seconds after you
   * leave. A spent pane never doubles anything again, but still bends and still fans.
   */
  private updateDuplication(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.dupVeil = null; return; }

    // Still standing in the pane you spent: the three seconds have not started yet.
    if (s.dupVeil) {
      if (this.veils.includes(s.dupVeil) && this.inPane(s.dupVeil, f.x, f.y, DUP_WALK_SLACK)) {
        s.dupUntil = time + DUP_MS;
        return;
      }
      s.dupVeil = null;
    }
    if (!this.isIllusion(owner) || !this.up(owner, 'e')) return;

    const v = this.veils.find((p) => p.owner === owner && !p.consumed
      && this.inPane(p, f.x, f.y, DUP_WALK_SLACK));
    if (!v) return;
    v.consumed = true;
    s.dupVeil = v;
    s.dupUntil = time + DUP_MS;
    this.fx(owner).ring(f.x, f.y, 8, 44, ILL.spark, 340);
    this.fx(owner).shards(v.x, v.y, 8, VEIL_HALF_LEN * 0.6, ILL.ghost, 420, 6);
    this.sfx(owner, 'blink', f.x, { volume: 0.5, rate: 1.4 });
    this.say(owner, f.x, f.y - 50, '✂️ DUPLICATION', this.hex(ILL.spark));
  }

  /** True while this side's Crack Shots come out in pairs. */
  private dupActive(owner: Owner): boolean {
    return this.side(owner).dupUntil > this.now;
  }

  /**
   * What a pane does to a shot depends on whose shot it is.
   *
   * Somebody else's comes out 10° crooked, on a fresh coin flip. The owner's own shots pass
   * straight — and one of their Crack Shots comes out with five illusion bullets fanned around
   * it, none of which can hurt anyone but every one of which cracks for 10 if anything hurts it.
   */
  private bendThrough(v: Veil): void {
    const ownerIsPlayer = v.owner === 'player';
    for (const child of this.api.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || !proj.body) continue;
      if (v.bent.has(proj)) continue;
      if (!this.inPane(v, proj.x, proj.y, 0)) continue;

      const body = proj.body as Phaser.Physics.Arcade.Body;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed < 1) continue;
      const heading = Math.atan2(body.velocity.y, body.velocity.x);
      v.bent.add(proj);

      if (proj.isFromPlayer === ownerIsPlayer) {
        const shot = this.shots.find((sh) => sh.proj === proj);
        if (shot) this.spawnDecoys(v, proj, heading, speed);
        continue;
      }

      const kick = Math.random() < 0.5 ? VEIL_DEFLECT : -VEIL_DEFLECT;
      const ang = heading + kick;
      body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      proj.setRotation(ang);

      this.fx(v.owner).shards(proj.x, proj.y, 4, 14, ILL.warp, 300, 6);
      if (!this.hides(v.owner)) this.api.spawnHitFlash(proj.x, proj.y, this.col(v.owner)(ILL.warp));
      if (v.owner === 'player') this.api.recordMasteryStat('veilDeflects', 1);
    }
  }

  // ── Illusion bullets ───────────────────────────────────────────────────────

  private spawnDecoys(v: Veil, parent: Projectile, heading: number, speed: number): void {
    const { scene } = this.api;
    const now = this.now;
    const hidden = this.hides(v.owner);
    for (const d of DECOY_FAN) {
      const ang = heading + Phaser.Math.DegToRad(d.deg);
      const sp = speed * d.speed;
      // The same dart as the real thing. Telling them apart is meant to be the hard part.
      const img = scene.add.image(parent.x, parent.y, 'proj-illusion-crack')
        .setRotation(ang).setDepth(parent.depth).setAlpha(hidden ? 0 : 0.92);
      this.decoyShots.push({
        owner: v.owner, x: parent.x, y: parent.y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ang,
        bornAt: now, diesAt: now + DECOY_LIFE_MS, parent, img,
      });
    }
    this.fx(v.owner).split(parent.x, parent.y, heading, Phaser.Math.DegToRad(22), ILL.crimson);
    this.fx(v.owner).shards(parent.x, parent.y, 5, 18, ILL.warp, 300, 6);
    this.sfx(v.owner, 'blink', parent.x, { volume: 0.35, rate: 1.8 });
  }

  /**
   * Illusion bullets in flight. Each one is popped by anything that would have hurt it: a
   * projectile of either side's (an enemy's is stopped by it; the owner's own sails on), and —
   * from `notifyAoe`, `tryHitClone` and the bombs — every blast and husk shot. At a wall or at
   * the end of its life it simply fades: only being hit makes it crack.
   */
  private updateDecoys(time: number, delta: number): void {
    if (this.decoyShots.length === 0) return;
    const dt = delta / 1000;
    const projs = this.api.projectiles.getChildren() as Projectile[];
    for (let i = this.decoyShots.length - 1; i >= 0; i--) {
      const d = this.decoyShots[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      const out = d.x <= this.left + WALL_MARGIN || d.x >= this.right - WALL_MARGIN
        || d.y <= this.top + WALL_MARGIN || d.y >= this.bottom - WALL_MARGIN;
      if (out || time >= d.diesAt) {
        this.fx(d.owner).shards(d.x, d.y, 4, 14, ILL.ghost, 280, 6);
        d.img.destroy();
        this.decoyShots.splice(i, 1);
        continue;
      }

      const ownerIsPlayer = d.owner === 'player';
      let hit: Projectile | null = null;
      for (const p of projs) {
        if (!p.active || !p.body || p.isHeal || p === d.parent) continue;
        const own = p.isFromPlayer === ownerIsPlayer;
        if (own && time < d.bornAt + DECOY_ARM_MS) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y) > DECOY_HIT_R + 6) continue;
        hit = p;
        break;
      }
      if (hit) {
        // Somebody else's shot spends itself on the illusion; the owner's own carries on.
        if (hit.isFromPlayer !== ownerIsPlayer) hit.destroy();
        this.popDecoy(i);
        continue;
      }

      d.img.setPosition(d.x, d.y);
      if (!this.hides(d.owner)) d.img.setAlpha(0.8 + Math.sin(time * 0.04 + i) * 0.12);
      else d.img.setAlpha(0);
    }
  }

  /** An illusion bullet took a hit: it cracks, and the crack goes after its owner's enemy. */
  private popDecoy(i: number): void {
    const d = this.decoyShots[i];
    if (!d) return;
    this.decoyShots.splice(i, 1);
    d.img.destroy();
    this.crack(d.owner, d.x, d.y, d.ang + Math.PI);
  }

  /** Every illusion bullet inside a circle, popped — the way a blast reaches them. */
  private popDecoysIn(x: number, y: number, radius: number): number {
    let n = 0;
    for (let i = this.decoyShots.length - 1; i >= 0; i--) {
      const d = this.decoyShots[i];
      if (Phaser.Math.Distance.Between(x, y, d.x, d.y) > radius + DECOY_HIT_R) continue;
      this.popDecoy(i);
      n++;
    }
    return n;
  }

  // ── Guise: Ruin Second Skin ────────────────────────────────────────────────

  /**
   * Ruin Mastery — Second Skin. A Guise is a form in the plainest sense: a different size, a
   * different speed and a body nobody can see. Ending it the kit's own way is the only thing
   * that hands back `shapeSizeMult`, the alpha and the health bar — and the clone is torn down
   * without paying out, because it did not fade, it was broken.
   */
  revertForms(f: Fighter): string[] {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.fighter(owner) !== f || !this.guised(owner)) continue;
      this.fx(owner).shards(this.side(owner).cloneX, this.side(owner).cloneY, 8, 30, ILL.violet, 420, 8);
      this.endGuise(owner);
      return ['Guise'];
    }
    return [];
  }

  // ── Illusion Dance ─────────────────────────────────────────────────────────

  private updateDance(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.danceUntil <= 0) return;

    if (time >= s.danceUntil) {
      s.danceUntil = 0;
      if (f && s.phaseInstalled) f.projectilePhase = false;
      s.phaseInstalled = false;
      this.avatar(owner)?.setEchoes(2);
      this.avatar(owner)?.setScattered(false);
      if (f) {
        this.fx(owner).ring(f.x, f.y, 90, 12, ILL.violet, 420);
        this.say(owner, f.x, f.y - 46, '🎭 THE DANCE ENDS', this.hex(ILL.ghost));
      }
      return;
    }

    // Held open every frame: a slow, a stun or another kit's own reset could otherwise drop
    // the flag mid-dance and quietly turn the ultimate off.
    if (f) { f.projectilePhase = true; s.phaseInstalled = true; }
    this.avatar(owner)?.setScattered(true);

    if (time >= s.nextHopAt) {
      s.nextHopAt = time + DANCE_HOP_MS;
      // Q+ (Bomb Dance): decided before the jump, thrown after it — the volley has to come out
      // of where the illusionist arrives, not out of where they left.
      const clean = !!f && f.rawDamageTaken <= s.damageMark;
      this.teleportToCorner(owner, false);
      if (clean) this.danceVolley(owner);
      if (f) s.damageMark = f.rawDamageTaken;
    }
  }

  // ── Bomb Dance (Q+) ────────────────────────────────────────────────────────

  /**
   * One Dance teleport's worth of bombs, if this side owns the upgrade: twelve, or twenty-four
   * while Duplication is running. A remote illusionist's volley waits a beat so it leaves from
   * where their state stream says they landed, not from where they were.
   */
  private danceVolley(owner: Owner): void {
    if (!this.up(owner, 'q')) return;
    const count = BOMB_COUNT * (this.dupActive(owner) ? 2 : 1);
    if (owner === 'npc' && this.api.isOnline) {
      this.pendingVolleys.push({ owner, count, at: this.now + BOMB_REMOTE_DELAY_MS });
      return;
    }
    this.throwBombs(owner, count);
  }

  private updateVolleys(time: number): void {
    for (let i = this.pendingVolleys.length - 1; i >= 0; i--) {
      const v = this.pendingVolleys[i];
      if (time < v.at) continue;
      this.pendingVolleys.splice(i, 1);
      this.throwBombs(v.owner, v.count);
    }
  }

  /** The volley itself: a loose cone at whoever is nearest, every bomb on its own wander. */
  private throwBombs(owner: Owner, count: number): void {
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;

    const target = this.enemyOf(owner);
    const aim = this.aimOf(owner);
    const base = target
      ? Math.atan2(target.y - f.y, target.x - f.x)
      : Math.atan2(aim.y - f.y, aim.x - f.x);
    // Resolved only on the sim the bombs really belong to — see `Bomb.live`.
    const live = !(owner === 'npc' && (this.api.isOnline || this.api.isInvasion));

    for (let i = 0; i < count; i++) {
      const heading = base + (Math.random() * 2 - 1) * BOMB_SPREAD;
      this.bombs.push({
        owner,
        x: f.x + Math.cos(heading) * 20,
        y: f.y + Math.sin(heading) * 20,
        heading,
        speed: BOMB_SPEED_MIN + Math.random() * (BOMB_SPEED_MAX - BOMB_SPEED_MIN),
        turn: (Math.random() * 2 - 1) * BOMB_TURN_MAX,
        nextTurnAt: this.now + 200 + Math.random() * 500,
        diesAt: this.now + BOMB_LIFE_MS * (0.85 + Math.random() * 0.3),
        seed: Math.random() * 999,
        live,
      });
    }

    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 10, 70, ILL.magenta, 420);
    this.sfx(owner, 'crystal-shatter', f.x, { volume: 0.55, rate: 0.75 });
    this.say(owner, f.x, f.y - 54, count > BOMB_COUNT ? `💣 BOMB DANCE ×${count}` : '💣 BOMB DANCE', this.hex(ILL.magenta));
  }

  private updateBombs(time: number, delta: number): void {
    if (this.bombs.length === 0) return;
    const dt = delta / 1000;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];

      // The wander: a turn rate re-rolled every fraction of a second, so each bomb loops and
      // corkscrews on its own — plus a gentle pull back at the target, so the volley still lands.
      if (time >= b.nextTurnAt) {
        b.turn = (Math.random() * 2 - 1) * BOMB_TURN_MAX;
        b.nextTurnAt = time + 250 + Math.random() * 550;
      }
      const foe = this.nearestTarget(b.owner, b.x, b.y);
      let pull = 0;
      if (foe) {
        const want = Math.atan2(foe.y - b.y, foe.x - b.x);
        pull = Phaser.Math.Angle.Wrap(want - b.heading) * BOMB_HOMING;
      }
      b.heading += (b.turn + pull) * dt;
      b.x += Math.cos(b.heading) * b.speed * dt;
      b.y += Math.sin(b.heading) * b.speed * dt;

      // Walls turn them back in rather than eat them.
      if (b.x < this.left + 8 || b.x > this.right - 8) {
        b.heading = Math.PI - b.heading;
        b.x = Phaser.Math.Clamp(b.x, this.left + 8, this.right - 8);
      }
      if (b.y < this.top + 8 || b.y > this.bottom - 8) {
        b.heading = -b.heading;
        b.y = Phaser.Math.Clamp(b.y, this.top + 8, this.bottom - 8);
      }

      const close = foe && Phaser.Math.Distance.Between(b.x, b.y, foe.x, foe.y)
        <= BOMB_TRIGGER_R * Math.max(0.6, foe.sizeMult * foe.shapeSizeMult);
      if (close) {
        this.bombs.splice(i, 1);
        this.detonateBomb(b);
        continue;
      }
      if (time >= b.diesAt) {
        // A dud: it never found anybody, so it fizzles rather than going off.
        this.fx(b.owner).shards(b.x, b.y, 5, 20, ILL.violet, 320, 8);
        this.bombs.splice(i, 1);
      }
    }
  }

  /** The nearest thing this side's bombs are allowed to go off on. */
  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /**
   * Boom: 14 to everyone in 105px, and everyone it catches is turned around — their camera
   * swung a random quarter, half or three-quarter turn for 2.6s. Illusion bullets inside the
   * blast pop too, whoever's they are.
   */
  private detonateBomb(b: Bomb): void {
    const fx = this.fx(b.owner);
    fx.bombBlast(b.x, b.y, BOMB_AOE_R);
    this.sfx(b.owner, 'crystal-shatter', b.x, { volume: 0.5, rate: 0.6 });
    if (!b.live) return;

    for (const t of this.targetsOf(b.owner)) {
      if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BOMB_AOE_R) continue;
      t.takeDamage(BOMB_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(b.owner)(ILL.magenta));
      if (b.owner === 'player') this.api.recordMasteryStat('danceBladeHits', 1);
      this.turnAround(b.owner, t);
    }
    this.popDecoysIn(b.x, b.y, BOMB_AOE_R);
  }

  /**
   * Face the wrong way. A fresh turn rolls a new direction; a body already turned only has
   * its clock refreshed — a dozen blasts re-rolling the camera a dozen times would just be noise.
   */
  private turnAround(owner: Owner, t: Fighter): void {
    const now = this.now;
    const fresh = t.viewTurnedUntil <= now || t.viewTurnQuarter <= 0;
    if (fresh) t.viewTurnQuarter = 1 + Math.floor(Math.random() * 3);
    t.viewTurnedUntil = Math.max(t.viewTurnedUntil, now + TURN_MS);
    this.turned.add(t);
    if (fresh) {
      this.fx(owner).turnSwirl(t.x, t.y);
      this.api.showFloatingText(t.x, t.y - 46, '🌀 TURNED AROUND', this.hex(ILL.magenta));
    }
  }

  /**
   * Everybody currently turned. The local player's turn is a camera turn (`updateCamera`); a
   * bot or a husk has no screen, so the honest equivalent is its walking — whatever direction
   * its AI picked this frame comes out turned by the same angle. A remote opponent's replica
   * is left alone: its position is their state stream's, and the turn reaches their real
   * screen through the status mirror.
   */
  private updateTurned(time: number, delta: number): void {
    const p = this.api.player;
    // The mirror can turn the local player without this sim ever having thrown anything.
    if (p && p.viewTurnedUntil > time && p.viewTurnQuarter > 0) this.turned.add(p);

    for (const f of [...this.turned]) {
      if (!f.active || f.hp <= 0 || f.viewTurnedUntil <= time) {
        f.viewTurnQuarter = 0;
        this.turned.delete(f);
        this.turnedVel.delete(f);
        continue;
      }
      if (f === p || (f === this.api.npc && this.api.isOnline)) continue;
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const last = this.turnedVel.get(f);
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      // Untouched since we turned it last frame: turning it again would spin it in place.
      if (last && Math.abs(last.x - vx) < 0.5 && Math.abs(last.y - vy) < 0.5) continue;
      const a = f.viewTurnQuarter * (Math.PI / 2);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const nx = vx * ca - vy * sa;
      const ny = vx * sa + vy * ca;
      body.setVelocity(nx, ny);
      this.turnedVel.set(f, { x: nx, y: ny });
    }
    this.updateCamera(delta);
  }

  /**
   * The local player turned around: the whole view swings to the rolled direction and back.
   * A quarter turn puts a 3:2 arena on its side, so it also zooms out until it fits.
   * The zoom is applied as a ratio on top of whatever else has the camera, so a Silence maze
   * zoom underneath survives it.
   */
  private updateCamera(delta: number): void {
    const p = this.api.player;
    const cam = this.api.scene.cameras.main;
    if (!cam) return;
    const on = !!p && p.active && p.viewTurnedUntil > this.now && p.viewTurnQuarter > 0;
    const goalRot = on ? p.viewTurnQuarter * (Math.PI / 2) : 0;
    const goalZoom = on && p.viewTurnQuarter % 2 === 1 ? this.api.height / this.api.width : 1;
    if (this.camRot === goalRot && this.camZoomF === goalZoom) return;

    const k = 1 - Math.exp(-(delta / 1000) * 7);
    let rot = this.camRot + (goalRot - this.camRot) * k;
    let zf = this.camZoomF + (goalZoom - this.camZoomF) * k;
    if (Math.abs(goalRot - rot) < 0.003) rot = goalRot;
    if (Math.abs(goalZoom - zf) < 0.002) zf = goalZoom;
    if (this.camRef !== cam) { this.camRef = cam; this.camRot = 0; this.camZoomF = 1; }
    cam.setRotation(rot);
    cam.setZoom((cam.zoom / this.camZoomF) * zf);
    this.camRot = rot;
    this.camZoomF = zf;
  }

  /** Hand the camera back untouched. */
  private restoreCamera(): void {
    const cam = this.api.scene.cameras?.main;
    if (cam && cam === this.camRef && (this.camRot !== 0 || this.camZoomF !== 1)) {
      cam.setRotation(0);
      cam.setZoom(cam.zoom / this.camZoomF);
    }
    this.camRot = 0;
    this.camZoomF = 1;
    this.camRef = null;
  }

  // ── Online: what the other sim tells us ────────────────────────────────────

  /** The illusion events the cast relay cannot carry. */
  handleNetMsg(msg: NetIllusionMsg): void {
    const p = this.api.player;
    if (!p || !p.active || p.hp <= 0) return;

    // Their Reality Shift fired on their sim — the only one that saw every hit they took. The
    // jump itself arrives on their state stream; this carries the flash, and the bombs a shift
    // mid-Dance throws (which `danceVolley` holds back until the jump has reached us).
    if (msg.k === 'shift') {
      const n = this.api.npc;
      this.ensureLayers();
      if (n && n.active) {
        this.nfx.blinkOut(n.x, n.y, ILL.violet);
        this.say('npc', n.x, n.y - 48, '🚪 REALITY SHIFT', this.hex(ILL.warp));
      }
      if (this.isDancing('npc')) this.danceVolley('npc');
      return;
    }

    // They reached for our face. Ours is the only sim that knows what is on it, so this is the
    // only place the question can be answered — and the answer is sent back as a mask flag or
    // paid for in the 15 the empty-handed reach costs them.
    if (msg.k === 'grab') {
      this.ensureLayers();
      this.attemptGrab('npc', this.now);
      return;
    }

    // The opponent's mask went on or off. Stored to keep our own damage indicators lying for
    // them (see `maskDisplayDamage`) — never to draw anything, which is why only the "off"
    // case produces so much as a spark.
    if (msg.k === 'mask') {
      this.sides.npc.masked = msg.on;
      if (!msg.on) {
        const n = this.api.npc;
        this.ensureLayers();
        if (n && n.active) {
          this.nfx.maskBreak(n.x, n.y - 4);
          this.api.showFloatingText(n.x, n.y - 52, '🎭 UNMASKED', '#ffc94a');
        }
      }
      return;
    }

    // Their Guise clone moved. Our replay of the cast already shrank and hid them; only their
    // sim knows where their cursor is, so the clone's position is all this carries.
    if (msg.k === 'clone') {
      const s = this.sides.npc;
      if (!this.guised('npc')) return;
      const dt = Math.max(1, this.now - s.cloneSentAt) / 1000;
      s.cloneVx = (msg.x - s.cloneX) / dt;
      s.cloneVy = (msg.y - s.cloneY) / dt;
      s.cloneX = msg.x;
      s.cloneY = msg.y;
      s.cloneSentAt = this.now;
      return;
    }

    // They swapped into it. Silently — the body we were looking at simply becomes real.
    if (msg.k === 'retrick') {
      const n = this.api.npc;
      if (!this.guised('npc')) return;
      this.endGuise('npc');
      if (n && n.active) this.body(n).reset(msg.x, msg.y);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      if (!this.playerAvatar) this.playerAvatar = new IllusionAvatar(scene, this.pcol);
      const s = this.sides.player;
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setIntensity(s.danceUntil > 0 ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.setMasquerade(s.masked);
      // Guise: the rig shrinks with the body, so the ghost being steered is honestly that small.
      this.playerAvatar.setRigScale(s.guiseUntil > 0 ? GUISE_SIZE : 1);
      this.playerAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      if (!this.npcAvatar) this.npcAvatar = new IllusionAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(this.npcAimY - f.y, this.npcAimX - f.x));
      this.npcAvatar.setIntensity(s.danceUntil > 0 ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.setRigScale(s.guiseUntil > 0 ? GUISE_SIZE : 1);
      // Deliberately never told about its own mask. This avatar is drawn on the *opponent's*
      // screen, and the mask not being there is the entire ability.
      this.npcAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Panes of warped space, under the fighters. */
  private paintField(time: number): void {
    const g = this.fieldGfx;
    if (!g) return;
    g.clear();

    for (const v of this.veils) {
      // Guise: the opponent's panes go dark while they are hidden, and come back after.
      if (this.hides(v.owner)) continue;
      // Fades over its last third of a second, so it never blinks out of existence.
      const fade = Phaser.Math.Clamp((v.until - time) / 320, 0, 1);
      // E+: a pane its owner has walked through and spent goes grey.
      const tint = v.consumed ? spentTint(this.col(v.owner)) : this.col(v.owner);
      warpPane(g, tint, v.x, v.y, v.ang, VEIL_HALF_LEN, VEIL_HALF_THICK,
        this.vizT, fade * (v.consumed ? 0.8 : 1), v.seed);
    }

    // Phantoms stand on the floor plane with the panes — they are scenery the opponent has
    // to decide whether to believe, not something in the air.
    for (const p of this.phantoms) {
      if (this.hides(p.owner)) continue;
      const charge = Phaser.Math.Clamp((time - p.bornAt) / PHANTOM_FUSE_MS, 0, 1);
      phantomFigure(g, this.col(p.owner), p.x, p.y, this.vizT, charge, 1, p.seed);
    }
  }

  /** Bomb Dance bombs, over the fighters. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const b of this.bombs) {
      if (this.hides(b.owner)) continue;
      // The fuse burns down over the bomb's life, so a volley that has been wandering a while
      // visibly reads as about to give up.
      const life = Phaser.Math.Clamp((b.diesAt - time) / BOMB_LIFE_MS, 0, 1);
      illusionBomb(g, this.col(b.owner), b.x, b.y, BOMB_SIZE, b.heading + this.vizT * 3, this.vizT, life, 1, b.seed);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsIllusion: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('illusion-dance', playerIsIllusion && s.danceUntil > time ? {
      name: 'Illusion Dance', emoji: '🎭', color: ILL.magenta,
      description: this.up('player', 'q')
        ? 'Projectiles pass straight through you, and you are thrown to a new corner every 3 seconds — a clean hop throws 12 bombs, and so does every Relocate you take. Blasts, beams and contact damage still land.'
        : 'Projectiles pass straight through you, and you are thrown to a new corner every 3 seconds. Blasts, beams and contact damage still land.',
      until: s.danceUntil, priority: 100,
    } : null);

    // Mastery: the mask, and the four doors. Both are the local player's own business — the
    // tray is their screen, so it is the one place the mask is allowed to be admitted to.
    this.api.setStatusIndicator('illusion-masquerade', playerIsIllusion && s.masked ? {
      name: 'Masquerade', emoji: '🎭', color: 0xffc94a,
      description: 'You are wearing the mask: everything you do lands for 50% more. They cannot see it, and their damage numbers still read as though it were not there — but a click on you takes it off.',
      priority: 102,
    } : null);

    this.api.setStatusIndicator('illusion-reality-shift', playerIsIllusion && this.api.masteryActive ? {
      name: 'Reality Shift', emoji: '🚪', color: ILL.warp,
      description: `Take ${SHIFT_DAMAGE} damage inside ${SHIFT_WINDOW_MS / 1000}s and you are thrown to a random corner on your own. Mid-Illusion Dance, with Bomb Dance, the shift throws a volley of bombs too. The count is what you have taken in the window.`,
      count: Math.round(this.shiftTally('player', time)), priority: 150,
    } : null);

    this.api.setStatusIndicator('illusion-duplication', playerIsIllusion && s.dupUntil > time ? {
      name: 'Duplication', emoji: '✂️', color: ILL.spark,
      description: 'You walked through your own Veil: every Crack Shot fires two bullets, and a Dance teleport throws twice the bombs. Lasts 3s after you step out of the pane.',
      until: s.dupVeil ? undefined : s.dupUntil, priority: 104,
    } : null);

    const myVeil = this.veils.find((v) => v.owner === 'player');
    this.api.setStatusIndicator('illusion-veil', playerIsIllusion && myVeil ? {
      name: 'Illusion Veil', emoji: '🌫️', color: ILL.warp,
      description: this.up('player', 'e') && !myVeil?.consumed
        ? 'A pane of warped space is hanging out there. Enemy shots that cross it come out 10° off; your Crack Shots come out with five illusion bullets. Walk through it to double your shots.'
        : 'A pane of warped space is hanging out there. Enemy shots that cross it come out 10° off; your Crack Shots come out with five illusion bullets that crack for 10 if anything hits them.',
      until: myVeil.until, priority: 116,
    } : null);

    this.api.setStatusIndicator('illusion-guise', playerIsIllusion && this.guised('player') ? {
      name: 'Guise', emoji: '🎭', color: ILL.magenta,
      description: this.up('player', 'f')
        ? 'You are tiny, fast and invisible, and your clone is drawing the fire. Everything you throw is invisible too. When it fades it pays back 20% of what it soaked up — or press F to swap into it.'
        : 'You are tiny, fast and invisible, and your clone is drawing the fire. Everything you throw is invisible too. When it fades it pays back 20% of what it soaked up.',
      until: s.guiseUntil, count: Math.round(s.cloneStored), priority: 101,
    } : null);

    this.api.setStatusIndicator('illusion-retrick', playerIsIllusion && s.retrickUntil > time ? {
      name: 'Re-Trick', emoji: '🃏', color: ILL.crimson,
      description: 'You swapped into your clone and they never saw it coming: +25% damage.',
      until: s.retrickUntil, priority: 103,
    } : null);

    // …and the local player caught by somebody's Phantom.
    const marked = this.marks.get(this.api.player);
    this.api.setStatusIndicator('illusion-understudied', marked ? {
      name: 'Understudied', emoji: '👻', color: ILL.crimson,
      description: 'A phantom went off next to you. Everything hits you 20% harder and you move 30% slower until it fades.',
      until: marked.until, priority: 12,
    } : null);

    // The caster side: an understudy is standing out there with a lit fuse.
    const fuse = this.phantoms.find((p) => p.owner === 'player');
    this.api.setStatusIndicator('illusion-phantom', playerIsIllusion && fuse ? {
      name: 'Phantom', emoji: '👻', color: ILL.crimson,
      description: 'A red copy of you is standing where you left it. When it goes off, everyone near it takes 20% more damage and moves 30% slower for 5 seconds.',
      until: fuse.blowsAt, priority: 118,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** True while this side's ultimate is running — the AI must not recast it. */
  isDancing(owner: Owner): boolean { return this.side(owner).danceUntil > this.now; }

  /** Whether this side already has a pane out, so the AI spends E on a fresh one. */
  hasVeil(owner: Owner): boolean { return this.veils.some((v) => v.owner === owner); }

  /** True while this side's Guise clone is out. */
  isGuised(owner: Owner): boolean { return this.guised(owner); }

  /**
   * Bot synergy (F+ Re-Trick): the swap is worth taking now. Either the clone is about to fade
   * anyway — swapping a moment early costs nothing and buys the 25% — or the player has found
   * the real, tiny bot and the clone is the safer place to be. Side-effect-free.
   */
  npcRetrickReady(): boolean {
    const s = this.sides.npc;
    if (!this.guised('npc') || !this.up('npc', 'f') || this.api.isOnline) return false;
    if (s.guiseUntil - this.now < 450) return true;
    const n = this.api.npc;
    const p = this.api.player;
    if (!n || !p || !p.active) return false;
    const toReal = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const toClone = Phaser.Math.Distance.Between(s.cloneX, s.cloneY, p.x, p.y);
    return toReal < 130 && toClone > toReal + 60;
  }

  /**
   * Bot synergy (E+ Duplication): one of its own unspent panes is close enough to walk through
   * for doubled shots — and, mid-Dance, doubled bombs. The point to walk to, or null.
   * Side-effect-free.
   */
  npcVeilWalkPoint(): { x: number; y: number } | null {
    if (this.api.isOnline || !this.isIllusion('npc') || !this.up('npc', 'e')) return null;
    if (this.dupActive('npc')) return null;
    const n = this.api.npc;
    if (!n || !n.active || n.hp <= 0) return null;
    let best: Veil | null = null;
    let bestD = 280;
    for (const v of this.veils) {
      if (v.owner !== 'npc' || v.consumed || v.until - this.now < 600) continue;
      const d = Phaser.Math.Distance.Between(n.x, n.y, v.x, v.y);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  /**
   * Bot synergy (Q+ Bomb Dance): a Relocate now is a free volley. Held back while there is an
   * unspent pane nearby to walk through first, because doubled the volley is twice the bombs.
   * Side-effect-free.
   */
  npcDanceRelocateReady(): boolean {
    if (this.api.isOnline || !this.isDancing('npc') || !this.up('npc', 'q')) return false;
    return this.dupActive('npc') || !this.npcVeilWalkPoint();
  }

  /**
   * What the npc AI should chase this frame instead of the player: the player's Guise clone,
   * or null when there is no Guise. Bots are meant to be fooled by it — that is the ability.
   */
  npcDecoyTarget(): Fighter | null { return this.decoyOf('player'); }

  /** Invasion: the husks' view of who is in the room — the player swapped for their clone. */
  huskTargetsView(list: Fighter[]): Fighter[] {
    const decoy = this.decoyOf('player');
    if (!decoy) return list;
    return list.map((f) => (f === this.api.player ? decoy : f));
  }

  /** Invasion: a husk hit that was aimed at a decoy. True when the clone took it. */
  absorbDecoyHit(target: Fighter, amount: number): boolean {
    if (!this.guised('player') || target !== this.decoys.player) return false;
    this.cloneAbsorb('player', amount);
    return true;
  }

  /**
   * Invasion: a husk shot passing through the player's clone, or through an illusion bullet
   * (which it cracks). True when it stopped there.
   */
  tryHitClone(x: number, y: number, radius: number, damage: number): boolean {
    for (let i = this.decoyShots.length - 1; i >= 0; i--) {
      const d = this.decoyShots[i];
      if (Phaser.Math.Distance.Between(x, y, d.x, d.y) > radius + DECOY_HIT_R) continue;
      this.popDecoy(i);
      return true;
    }
    if (!this.onClone('player', x, y, radius)) return false;
    this.cloneAbsorb('player', damage);
    return true;
  }

  /**
   * ArenaScene's AoE chokepoint: a blast owned by `owner` that reaches the *other* side's clone
   * is banked by it. The real fighter is resolved separately and on its own position, so a
   * blast on the clone does nothing to the tiny body standing somewhere else.
   */
  notifyAoe(cx: number, cy: number, radius: number, damage: number, owner: Owner): void {
    // Any blast at all cracks the illusion bullets inside it — theirs, or the owner's own.
    if (this.decoyShots.length) this.popDecoysIn(cx, cy, radius);
    const victim: Owner = owner === 'player' ? 'npc' : 'player';
    if (this.onClone(victim, cx, cy, radius - CLONE_HIT_R)) this.cloneAbsorb(victim, damage);
  }

  /**
   * The slot the opponent gave up to Masquerade, so its AI stops casting what used to be
   * there. Deliberately not "is it wearing one" — that is the one thing the other side of the
   * fight is never allowed to be told, bot or not.
   */
  npcMaskSlot(): 'e' | 'r' | 'f' | 'q' | null { return this.maskSlot('npc'); }

  /**
   * R+ (Phantom): the blast's slow, on whoever is wearing the mark. Pulled by ArenaScene
   * rather than pushed onto the fighter, because this kit's update runs long after the
   * frame's movement has already resolved.
   */
  getPlayerSpeedMult(): number { return this.speedMultFor(this.api.player); }

  getNpcSpeedMult(): number { return this.speedMultFor(this.api.npc); }

  private speedMultFor(f: Fighter): number {
    const m = f ? this.marks.get(f) : undefined;
    const slow = m && m.until > this.now ? PHANTOM_SLOW_MULT : 1;
    // Guise: a fifth of the size and a third again as fast.
    const quick = f === this.api.player ? this.guised('player') : f === this.api.npc && this.guised('npc');
    return slow * (quick ? GUISE_SPEED : 1);
  }

  /**
   * Ability tray fill. Two of the five spend most of their life showing something that isn't
   * a cooldown: the pane's remaining seconds, and the dance's own clock.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;

    // Masquerade reads full for as long as the mask is on — there is no duration to count
    // down, only the moment somebody takes it off you and the 14 seconds after that.
    if (abilityId === 'masquerade') {
      if (s.masked) return 1;
      return Phaser.Math.Clamp((time - s.maskCastAt) / MASK_COOLDOWN_MS, 0, 1);
    }
    if (abilityId === 'illusion-dance' && s.danceUntil > time) {
      return Phaser.Math.Clamp((s.danceUntil - time) / DANCE_MS, 0, 1);
    }
    if (abilityId === 'illusion-veil') {
      const v = this.veils.find((veil) => veil.owner === 'player');
      if (v) return Phaser.Math.Clamp((v.until - time) / VEIL_MS, 0, 1);
    }
    // The clone's own clock while it is out — the card is the Re-Trick window too.
    if (abilityId === 'illusion-guise' && this.guised('player')) {
      return Phaser.Math.Clamp((s.guiseUntil - time) / GUISE_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Warp panes and un-detonated Phantoms — the two things this element plants and leaves
   * standing. Anything already bent by a pane keeps its new heading: the kick has already
   * been applied, and the pane was only ever the thing that applied it. Bombs and illusion
   * bullets are shots in flight rather than structures, and a Guise clone is a form (see `revertForms`), so the
   * spikes never touch either.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      return true;
    };
    let razed = 0;
    for (let i = this.veils.length - 1; i >= 0; i--) {
      const v = this.veils[i];
      if (v.owner === exceptOwner || !near(v.x, v.y)) continue;
      this.veils.splice(i, 1);
      razed++;
    }
    for (let i = this.phantoms.length - 1; i >= 0; i--) {
      const p = this.phantoms[i];
      if (p.owner === exceptOwner || !near(p.x, p.y)) continue;
      // Torn down, not set off: the spikes deny the ability rather than triggering it early.
      this.fx(p.owner).shards(p.x, p.y, 8, 34, ILL.crimson, 420, 8);
      this.phantoms.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
