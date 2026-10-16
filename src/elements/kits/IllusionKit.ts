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
  gateway, illusionDagger, phantomFigure, warpPane,
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
/** Radians a shot is kicked by. Sign is a coin flip per shot, per pane. */
const VEIL_DEFLECT = Math.PI / 6;

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

// ── Mastery: Reality Shift (passive) ─────────────────────────────────────────
/** How far in from its wall a doorway stands. Far enough that nobody clips the world edge. */
const GATE_INSET = 52;
const GATE_HALF_W = 40;
const GATE_HALF_H = 30;
/** How close the owner's centre has to get to the arch before they are through it. */
const GATE_R = 34;
/**
 * How far past the far doorway you actually arrive. Larger than `GATE_R`, so you are never
 * standing inside the thing you just came out of — otherwise a single walk-in would chain
 * across every gateway on the map in four frames.
 */
const GATE_ARRIVE_PUSH = 72;
/** Belt and braces on top of that: no second trip for this long. */
const GATE_RELOCK_MS = 700;

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
/** Radians either side of the incoming heading the two halves leave on. */
const DUP_SPREAD = Math.PI / 7;

// ── Phantom (R+) ─────────────────────────────────────────────────────────────
const PHANTOM_FUSE_MS = 1000;
const PHANTOM_RADIUS = 100;
const PHANTOM_MARK_MS = 5000;
const PHANTOM_VULN_MULT = 1.2;
const PHANTOM_SLOW_MULT = 0.7;

// ── Re-Trick (F+) ────────────────────────────────────────────────────────────
const RETRICK_MS = 10000;
const RETRICK_MULT = 1.25;

// ── Blade Dance (Q+) ─────────────────────────────────────────────────────────
const BLADE_COUNT = 10;
const BLADE_DAMAGE = 15;
const BLADE_SPEED = 660;
/** Total width of the fan. */
const BLADE_SPREAD = Math.PI / 3;
const BLADE_LIFE_MS = 1500;
const BLADE_HIT_R = 26;
const BLADE_SIZE = 13;

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
  /** Duplication (E+): true for a copy, and for the original that made one. Splits once only. */
  split: boolean;
}

/** A pane of warped space. Immutable once hung — it never moves with its caster. */
interface Veil {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  until: number;
  seed: number;
  /** One kick per shot per pane, or a projectile crawling through would spiral. */
  bent: Set<Projectile>;
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

/** One Blade Dance dagger in flight. Kit-owned, so a Guise can keep it off the other screen. */
interface Blade {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  diesAt: number;
  /** A dagger is spent on the first body it finds, but the set keeps a miss honest. */
  hit: Set<Fighter>;
}

interface Side {
  owner: Owner;
  danceUntil: number;
  nextHopAt: number;
  /** Latched so the flag can be handed back exactly once when the dance ends. */
  phaseInstalled: boolean;
  /**
   * Blade Dance (Q+): `rawDamageTaken` as it stood at the last hop. The upgrade fires when the
   * next hop arrives and this number hasn't moved — which is what "without taking any damage
   * since the last teleport" means, measured at the one place every hit in the game is tallied.
   */
  damageMark: number;
  /** Masquerade (mastery): the gold mask is on this side's face right now. */
  masked: boolean;
  /** When the mask went on. The 14s cooldown runs from here, not from when it came off. */
  maskCastAt: number;
  /** Reality Shift (mastery): the earliest this side may take another gateway. */
  gateLockUntil: number;
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
    masked: false, maskCastAt: -MASK_COOLDOWN_MS, gateLockUntil: 0,
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
  /** Blade Dance daggers: over the fighters, so a fan of them is unmissable. */
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
  private blades: Blade[] = [];
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
  private gateSeed = Math.random() * 999;

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
    this.blades = [];
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
    this.gateSeed = Math.random() * 999;

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
    this.spawnShot(owner, sx, sy, ang, false);

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).shards(sx, sy, 3, 16, ILL.crimson, 260, 6);
  }

  /** One bullet, tracked. Shared by the ability and by Duplication's copy. */
  private spawnShot(owner: Owner, x: number, y: number, ang: number, split: boolean): Shot {
    const proj = new Projectile(this.api.scene, x, y, 'proj-illusion-crack', SHOT_DAMAGE, owner === 'player');
    proj.setRotation(ang);
    this.api.projectiles.add(proj);
    proj.launch(Math.cos(ang) * SHOT_SPEED, Math.sin(ang) * SHOT_SPEED);
    // Guise: a bullet out of nowhere is the whole point. It still flies and still hurts.
    if (this.hides(owner)) proj.setAlpha(0);
    const shot: Shot = { owner, proj, through: new Set(), split };
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
    this.api.spawnHitFlash(target.x, target.y, ILL.crimson);
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
      seed: Math.random() * 999, bent: new Set(),
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
    const leaves = !!f && f.active && f.hp > 0 && this.up(owner, 'r');
    this.teleportToCorner(owner, true);
    // R+ (Phantom): the understudy stays where the real one was standing.
    if (leaves) this.dropPhantom(owner, fromX, fromY);
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
    this.api.spawnHitFlash(target.x, target.y, ILL.violet);
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
    this.api.spawnHitFlash(s.cloneX, s.cloneY, ILL.violet);
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
      this.api.spawnHitFlash(t.x, t.y, ILL.crimson);
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
    // Recorded unconditionally, mastery or not — this is how the mastery is earned. Both the
    // R and the Dance's own hops come through here, and the gateways record their own.
    if (owner === 'player') this.api.recordMasteryStat('teleports', 1);
  }

  // ── Mastery: Reality Shift ─────────────────────────────────────────────────

  /** Whether this side is a mastered illusionist, and therefore owns the four doorways. */
  private hasRealityShift(owner: Owner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive && this.isIllusion('npc');
  }

  /**
   * The four doorways: one standing in the middle of each wall, facing into the room.
   * Recomputed rather than cached because the arena's size is a live value — a World Shift map
   * or a resize would otherwise leave the arches hanging in the wrong place all match.
   */
  private gates(): Array<{ x: number; y: number; inward: number }> {
    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;
    return [
      { x: cx, y: this.top + GATE_INSET, inward: Math.PI / 2 },
      { x: cx, y: this.bottom - GATE_INSET, inward: -Math.PI / 2 },
      { x: this.left + GATE_INSET, y: cy, inward: 0 },
      { x: this.right - GATE_INSET, y: cy, inward: Math.PI },
    ];
  }

  /** 0–1 for how close this side's owner is to walking into a given doorway. Paint only. */
  private gateCharge(g: { x: number; y: number }): number {
    let best = 0;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.hasRealityShift(owner)) continue;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, g.x, g.y);
      best = Math.max(best, Phaser.Math.Clamp(1 - (d - GATE_R) / 110, 0, 1));
    }
    return best;
  }

  private updateGates(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.hasRealityShift(owner)) continue;
      const s = this.side(owner);
      if (time < s.gateLockUntil) continue;
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;

      const gs = this.gates();
      const at = gs.findIndex((g) => Phaser.Math.Distance.Between(f.x, f.y, g.x, g.y) <= GATE_R);
      if (at < 0) continue;
      const others = gs.filter((_, i) => i !== at);
      this.stepThroughGate(owner, gs[at], others[Math.floor(Math.random() * others.length)], time);
    }
  }

  /** In one doorway, out of another. The only teleport in the kit that nobody has to press. */
  private stepThroughGate(
    owner: Owner,
    from: { x: number; y: number },
    to: { x: number; y: number; inward: number },
    time: number,
  ): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.gateLockUntil = time + GATE_RELOCK_MS;

    // Arrive *past* the far arch rather than inside it, or the trip would immediately chain.
    const ax = Phaser.Math.Clamp(to.x + Math.cos(to.inward) * GATE_ARRIVE_PUSH, this.left + 24, this.right - 24);
    const ay = Phaser.Math.Clamp(to.y + Math.sin(to.inward) * GATE_ARRIVE_PUSH, this.top + 24, this.bottom - 24);

    const fx = this.fx(owner);
    fx.blinkOut(from.x, from.y, ILL.warp);
    fx.ring(from.x, from.y, 8, GATE_HALF_W + 18, ILL.cyan, 380);
    // Online: a replica's position belongs to the peer's state stream — same rule as Relocate.
    if (!(owner === 'npc' && this.api.isOnline)) this.body(f).reset(ax, ay);
    fx.blinkIn(ax, ay, ILL.magenta);
    fx.ring(ax, ay, GATE_HALF_W + 18, 10, ILL.violet, 420);
    this.sfx(owner, 'blink', ax, { volume: 0.7, rate: 1.15 });
    this.avatar(owner)?.play('dash');
    this.avatar(owner)?.setScattered(true);
    this.say(owner, ax, ay - 48, '🚪 REALITY SHIFT', this.hex(ILL.warp));
    if (owner === 'player') this.api.recordMasteryStat('teleports', 1);

    // The passive's whole reason to exist mid-ultimate: a gateway taken during the Dance is a
    // free extra fan of knives, on top of whatever the Dance's own hop was going to throw.
    if (this.side(owner).danceUntil > time) this.bladeDance(owner);
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
    this.api.spawnHitFlash(gf.x, gf.y, ILL.crimson);
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
    if (!playerIs && !npcIs && this.marks.size === 0 && this.touched.size === 0
        && !this.guised('player') && !this.guised('npc')) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateShots(time);
    this.updateVeils(time);
    this.updateGuise(time, delta);
    this.updatePhantoms(time);
    this.updateBlades(time, delta);
    this.updateGates(time);
    this.updateMasquerade(time);
    for (const owner of ['player', 'npc'] as Owner[]) this.updateDance(owner, time);
    this.updateMarks(time);
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
    // must never hide a character); the daggers belong in front.
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
    this.api.spawnHitFlash(target.x, target.y, ILL.crimson);
    // The splinter counts towards Off The Wall exactly as the bullet does — the requirement is
    // about landing the click, and this element gives the click two ways to land.
    if (owner === 'player') this.api.recordMasteryStat('crackShotHits', 1);
  }

  // ── Illusion Veil ──────────────────────────────────────────────────────────

  private updateVeils(time: number): void {
    for (let i = this.veils.length - 1; i >= 0; i--) {
      const v = this.veils[i];
      if (time >= v.until) {
        this.fx(v.owner).ring(v.x, v.y, VEIL_HALF_LEN, 14, ILL.warp, 320);
        this.veils.splice(i, 1);
        continue;
      }
      this.bendThrough(v);
    }
  }

  /**
   * Anything crossing the pane comes out crooked — including the caster's own shots. That is
   * deliberate: a wall that only inconveniences the opponent would be a free block, and this
   * element already has one of those. Making it symmetrical turns the pane into a placement
   * decision rather than a button.
   */
  private bendThrough(v: Veil): void {
    const ca = Math.cos(-v.ang);
    const sa = Math.sin(-v.ang);
    for (const child of this.api.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || !proj.body) continue;
      if (v.bent.has(proj)) continue;

      // Into the pane's own frame: along its length, and across its thickness.
      const dx = proj.x - v.x;
      const dy = proj.y - v.y;
      const along = dx * ca - dy * sa;
      const across = dx * sa + dy * ca;
      if (Math.abs(along) > VEIL_HALF_LEN || Math.abs(across) > VEIL_HALF_THICK) continue;

      const body = proj.body as Phaser.Physics.Arcade.Body;
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed < 1) continue;
      const heading = Math.atan2(body.velocity.y, body.velocity.x);
      v.bent.add(proj);

      // E+ (Duplication): a Crack Shot doesn't come out of a pane bent, it comes out twice.
      // The pane still only touches a given bullet once, and a copy may not be copied — so
      // one shot through one pane is exactly two shots, however long it spends inside.
      const shot = this.shots.find((sh) => sh.proj === proj);
      if (shot && !shot.split && this.up(shot.owner, 'e')) {
        shot.split = true;
        const outA = heading + DUP_SPREAD;
        const outB = heading - DUP_SPREAD;
        body.setVelocity(Math.cos(outA) * speed, Math.sin(outA) * speed);
        proj.setRotation(outA);
        const copy = this.spawnShot(shot.owner, proj.x, proj.y, outB, true);
        // The copy is born inside the pane it was born from, so it has to be pre-forgiven
        // or the same pane would immediately bend the thing it just made.
        v.bent.add(copy.proj);
        this.fx(v.owner).split(proj.x, proj.y, heading, DUP_SPREAD);
        if (!this.hides(v.owner)) this.api.spawnHitFlash(proj.x, proj.y, ILL.spark);
        continue;
      }

      const kick = Math.random() < 0.5 ? VEIL_DEFLECT : -VEIL_DEFLECT;
      const ang = heading + kick;
      body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      proj.setRotation(ang);

      this.fx(v.owner).shards(proj.x, proj.y, 4, 14, ILL.warp, 300, 6);
      if (!this.hides(v.owner)) this.api.spawnHitFlash(proj.x, proj.y, ILL.warp);
      // Only somebody else's shot counts towards the mastery. The pane bending your own
      // bullets is the ability working as designed, but firing into your own pane on a loop
      // would be a grind rather than a skill, so it is worth nothing.
      if (v.owner === 'player' && !proj.isFromPlayer) this.api.recordMasteryStat('veilDeflects', 1);
    }
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
      // Q+ (Blade Dance): decided before the jump, thrown after it — the fan has to come out
      // of where the illusionist arrives, not out of where they left.
      const clean = !!f && this.up(owner, 'q') && f.rawDamageTaken <= s.damageMark;
      this.teleportToCorner(owner, false);
      if (clean) this.bladeDance(owner);
      if (f) s.damageMark = f.rawDamageTaken;
    }
  }

  // ── Blade Dance (Q+) ───────────────────────────────────────────────────────

  /** Five daggers, fanned at whoever is nearest, thrown the instant the dancer lands. */
  private bladeDance(owner: Owner): void {
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) return;

    const target = this.enemyOf(owner);
    const aim = this.aimOf(owner);
    const base = target
      ? Math.atan2(target.y - f.y, target.x - f.x)
      : Math.atan2(aim.y - f.y, aim.x - f.x);

    for (let i = 0; i < BLADE_COUNT; i++) {
      const spread = (i / (BLADE_COUNT - 1) - 0.5) * BLADE_SPREAD;
      const ang = base + spread;
      this.blades.push({
        owner,
        x: f.x + Math.cos(ang) * 24,
        y: f.y + Math.sin(ang) * 24,
        vx: Math.cos(ang) * BLADE_SPEED,
        vy: Math.sin(ang) * BLADE_SPEED,
        ang,
        diesAt: this.now + BLADE_LIFE_MS,
        hit: new Set(),
      });
    }

    this.avatar(owner)?.play('sweep', base);
    this.fx(owner).ring(f.x, f.y, 10, 62, ILL.magenta, 380);
    this.sfx(owner, 'crystal-shatter', f.x, { volume: 0.6, rate: 0.9 });
    this.say(owner, f.x, f.y - 54, '🗡️ BLADE DANCE', this.hex(ILL.violet));
  }

  private updateBlades(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let landed = false;
      for (const t of this.targetsOf(b.owner)) {
        if (b.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BLADE_HIT_R) continue;
        b.hit.add(t);
        t.takeDamage(BLADE_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, ILL.violet);
        this.fx(b.owner).stab(t.x, t.y, b.ang);
        if (b.owner === 'player') this.api.recordMasteryStat('danceBladeHits', 1);
        this.castAcross(b.owner, t);
        landed = true;
        break;
      }

      const spent = landed || time >= b.diesAt
        || b.x < this.left || b.x > this.right || b.y < this.top || b.y > this.bottom;
      if (spent) {
        if (!landed) this.fx(b.owner).shards(b.x, b.y, 4, 18, ILL.violet, 300, 8);
        this.blades.splice(i, 1);
      }
    }
  }

  /**
   * Straight across from the thrower: their position reflected through the middle of the
   * arena, inset so nobody ever arrives standing in a wall. The farthest point from someone
   * inside a rectangle is a corner, but a corner is also a place a fight can be resumed from
   * — reflecting instead puts the victim exactly opposite, which is the readable version.
   */
  private castAcross(owner: Owner, victim: Fighter): void {
    const f = this.fighter(owner);
    if (!f) return;
    const tx = Phaser.Math.Clamp(this.api.width - f.x, this.left + CORNER_INSET, this.right - CORNER_INSET);
    const ty = Phaser.Math.Clamp(this.api.height - f.y, this.top + CORNER_INSET, this.bottom - CORNER_INSET);

    const fx = this.fx(owner);
    fx.blinkOut(victim.x, victim.y, ILL.crimson);

    if (owner === 'player' && this.api.isOnline && victim === this.api.npc) {
      // A replica's position belongs to the peer's state stream, so the move is asked for
      // rather than performed — their sim is the only place it can actually happen.
      this.api.sendIllusionMsg({ t: 'ill', k: 'blink', x: tx, y: ty });
    } else if (!(owner === 'npc' && this.api.isOnline)) {
      // Online, the opponent's own sim already threw this dagger and relayed the result;
      // replaying the throw locally must not move us a second time.
      this.body(victim).reset(tx, ty);
    }

    fx.blinkIn(tx, ty, ILL.violet);
    this.sfx(owner, 'blink', tx, { volume: 0.8, rate: 0.85 });
    this.say(owner, tx, ty - 46, '🗡️ CAST ACROSS', this.hex(ILL.violet));
  }

  // ── Online: what the other sim tells us ────────────────────────────────────

  /** The illusion events the cast relay cannot carry. */
  handleNetMsg(msg: NetIllusionMsg): void {
    const p = this.api.player;
    if (!p || !p.active || p.hp <= 0) return;

    // A dagger found us on their sim. Our position is ours to change, so this is the only
    // place the throw can actually land.
    if (msg.k === 'blink') {
      this.pfx.blinkOut(p.x, p.y, ILL.crimson);
      this.body(p).reset(msg.x, msg.y);
      this.pfx.blinkIn(msg.x, msg.y, ILL.violet);
      this.api.showFloatingText(msg.x, msg.y - 46, '🗡️ CAST ACROSS', this.hex(ILL.violet));
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

    // Reality Shift's four doorways. Drawn for everyone — they are scenery, and a mastered
    // illusionist having four exits is information the opponent is entitled to. Only the
    // illusionist can actually walk through one.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.hasRealityShift(owner)) continue;
      const tint = this.col(owner);
      this.gates().forEach((gate, i) => {
        gateway(g, tint, gate.x, gate.y, gate.inward, GATE_HALF_W, GATE_HALF_H,
          this.vizT, 0.9, this.gateCharge(gate), this.gateSeed + i * 17);
      });
      // One set of doors per match: if both sides are Illusion they share the same four.
      break;
    }

    for (const v of this.veils) {
      // Guise: the opponent's panes go dark while they are hidden, and come back after.
      if (this.hides(v.owner)) continue;
      // Fades over its last third of a second, so it never blinks out of existence.
      const fade = Phaser.Math.Clamp((v.until - time) / 320, 0, 1);
      warpPane(g, this.col(v.owner), v.x, v.y, v.ang, VEIL_HALF_LEN, VEIL_HALF_THICK,
        this.vizT, fade, v.seed);
    }

    // Phantoms stand on the floor plane with the panes — they are scenery the opponent has
    // to decide whether to believe, not something in the air.
    for (const p of this.phantoms) {
      if (this.hides(p.owner)) continue;
      const charge = Phaser.Math.Clamp((time - p.bornAt) / PHANTOM_FUSE_MS, 0, 1);
      phantomFigure(g, this.col(p.owner), p.x, p.y, this.vizT, charge, 1, p.seed);
    }
  }

  /** Blade Dance daggers, over the fighters. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    void time;

    // Daggers, over everything: five of them crossing an arena has to be unmissable.
    for (const b of this.blades) {
      if (this.hides(b.owner)) continue;
      const tint = this.col(b.owner);
      for (let i = 2; i >= 1; i--) {
        illusionDagger(g, tint, b.x - (b.vx / BLADE_SPEED) * i * 9, b.y - (b.vy / BLADE_SPEED) * i * 9,
          b.ang, BLADE_SIZE * (1 - i * 0.16), 0.2 / i);
      }
      illusionDagger(g, tint, b.x, b.y, b.ang, BLADE_SIZE, 1);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsIllusion: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('illusion-dance', playerIsIllusion && s.danceUntil > time ? {
      name: 'Illusion Dance', emoji: '🎭', color: ILL.magenta,
      description: 'Projectiles pass straight through you, and you are thrown to a new corner every 3 seconds. Blasts, beams and contact damage still land.',
      until: s.danceUntil, priority: 100,
    } : null);

    // Mastery: the mask, and the four doors. Both are the local player's own business — the
    // tray is their screen, so it is the one place the mask is allowed to be admitted to.
    this.api.setStatusIndicator('illusion-masquerade', playerIsIllusion && s.masked ? {
      name: 'Masquerade', emoji: '🎭', color: 0xffc94a,
      description: 'You are wearing the mask: everything you do lands for 50% more. They cannot see it, and their damage numbers still read as though it were not there — but a click on you takes it off.',
      priority: 102,
    } : null);

    this.api.setStatusIndicator('illusion-gateways', playerIsIllusion && this.api.masteryActive ? {
      name: 'Reality Shift', emoji: '🚪', color: ILL.warp,
      description: 'Four gateways stand against the middle of each wall. Walk into one and you come out of another at random — no cast, no cooldown. Only you can use them. Take one mid-Illusion Dance and you throw an extra round of knives on arrival.',
      priority: 150,
    } : null);

    const myVeil = this.veils.find((v) => v.owner === 'player');
    this.api.setStatusIndicator('illusion-veil', playerIsIllusion && myVeil ? {
      name: 'Illusion Veil', emoji: '🌫️', color: ILL.warp,
      description: 'A pane of warped space is hanging out there. Every shot that crosses it — including your own — comes out 30° off.',
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

  /** Invasion: a husk shot passing through the player's clone. True when it stopped there. */
  tryHitClone(x: number, y: number, radius: number, damage: number): boolean {
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
   * been applied, and the pane was only ever the thing that applied it. Daggers are shots in
   * flight rather than structures, and a Guise clone is a form (see `revertForms`), so the
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
