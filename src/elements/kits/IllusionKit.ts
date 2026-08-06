import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { NetIllusionMsg } from '../../network/NetworkManager';
import { Sfx } from '../../audio';
import {
  ILL, IllusionAvatar, IllusionColorFn, IllusionFx, SHAPE_LABEL, ShapeKind,
  fracture, harlequinMask, illusionDagger, phantomFigure, shapeBody, tesseract, warpPane, weakCone,
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

// ── Tesseract (F) ────────────────────────────────────────────────────────────
const TESS_SPEED = 430;
const TESS_DAMAGE = 20;
const TESS_SIZE = 21;
const TESS_HIT_R = 30;
/** How long it flies before folding away unspent. */
const TESS_LIFE_MS = 2600;
const SHAPE_MS = 8000;
/** Everything a folded fighter gains: size, and therefore hitbox. */
const SHAPE_SIZE_MULT = 1.3;

const ARENA_PAD = 32;
const SHAPE_KINDS: ShapeKind[] = ['square', 'star', 'rhombus'];

// ── Duplication (E+) ─────────────────────────────────────────────────────────
/** Radians either side of the incoming heading the two halves leave on. */
const DUP_SPREAD = Math.PI / 7;

// ── Phantom (R+) ─────────────────────────────────────────────────────────────
const PHANTOM_FUSE_MS = 1000;
const PHANTOM_RADIUS = 100;
const PHANTOM_MARK_MS = 5000;
const PHANTOM_VULN_MULT = 1.2;
const PHANTOM_SLOW_MULT = 0.7;

// ── Mind-Boggle (F+) ─────────────────────────────────────────────────────────
/** Half the cone, in radians — a 30° wedge in total. */
const BOGGLE_HALF = Math.PI / 12;
/** How far the wedge sticks out of the folded body. Cosmetic: the test is angular. */
const BOGGLE_REACH = 52;
const BOGGLE_MULT = 1.5;
/** Radians per second the weak point turns at, so it can never just be camped on. */
const BOGGLE_SPIN = 0.85;

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
 * A tesseract in flight. Kit-owned rather than a group `Projectile` for one reason: a shared
 * group member is drawn by whoever's sim it exists on, and this is the one thing in the game
 * that is only allowed to be visible to the person who threw it.
 */
interface Tess {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  diesAt: number;
}

/** Somebody who has been folded, and everything needed to put them back. */
interface Morph {
  kind: ShapeKind;
  until: number;
  /** The texture they were wearing before — restored verbatim when the fold lapses. */
  texture: string;
  spin: number;
  /**
   * Mind-Boggle (F+): the turning seam in this fold, and who is allowed to exploit it. Null
   * unless whoever threw the tesseract owned the upgrade at the moment it landed.
   */
  weak: { owner: Owner; ang: number } | null;
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

/** One Blade Dance dagger in flight. Kit-owned, like the tesseract, and for the same reason. */
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
}

function makeSide(owner: Owner): Side {
  return { owner, danceUntil: 0, nextHopAt: 0, phaseInstalled: false, damageMark: 0 };
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
  /** Skins: maps an Illusion visual colour through that side's equipped skin. */
  illusionColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Attacker → victim: a fold the local sim just resolved against its replica. */
  sendIllusionMsg(msg: NetIllusionMsg): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded tricks reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
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
  /** Tesseracts and folded bodies: over the fighters, because both are meant to obscure. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Online PvP only: the full-screen invert a folded player is left looking through. A white
   * rectangle in DIFFERENCE blend is the cheapest honest colour inversion there is.
   */
  private invertRect: Phaser.GameObjects.Rectangle | null = null;
  private invertUntil = 0;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private shots: Shot[] = [];
  private veils: Veil[] = [];
  private tesses: Tess[] = [];
  private morphs = new Map<Fighter, Morph>();
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

  constructor(api: IllusionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.illusionColor('player', base);
    this.ncol = (base) => api.illusionColor('npc', base);
    this.pfx = new IllusionFx(api.scene, this.pcol);
    this.nfx = new IllusionFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): IllusionFx { return owner === 'player' ? this.pfx : this.nfx; }
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
    // somebody permanently square and somebody else permanently immune to bullets.
    for (const f of [...this.morphs.keys()]) this.unfold(f, false);
    this.morphs.clear();
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (f && this.sides[owner].phaseInstalled) f.projectilePhase = false;
    }
    // Same debt, different field: a Phantom's vulnerability is written straight onto bodies.
    for (const f of this.touched) f.illusionIncomingMult = 1;
    this.touched.clear();
    this.marks.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.shots = [];
    this.veils = [];
    this.tesses = [];
    this.phantoms = [];
    this.blades = [];
    this.aimX = 0;
    this.aimY = 0;
    this.npcAimX = 0;
    this.npcAimY = 0;
    this.vizT = 0;
    this.invertUntil = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.fieldGfx?.destroy(); this.fieldGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.invertRect?.destroy(); this.invertRect = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'illusion') return;
    void time;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('illusion-crack-shot', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('illusion-veil', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('illusion-relocate', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('illusion-tesseract', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('illusion-dance', ctx);
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
    if (!s || !this.up(s.owner, 'click')) return false;
    // Already been through this one — silently pass, so a single overlap can't be billed twice.
    if (s.through.has(target)) return true;
    s.through.add(target);

    target.takeDamage(SHOT_DAMAGE);
    this.api.spawnHitFlash(target.x, target.y, ILL.crimson);
    const body = proj.body as Phaser.Physics.Arcade.Body | null;
    const through = body ? Math.atan2(body.velocity.y, body.velocity.x) : 0;
    this.fx(s.owner).pierceSpray(target.x, target.y, through);
    Sfx.playAt('crystal-shatter', target.x, { volume: 0.4, rate: 1.6 });
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
    this.api.showFloatingText(f.x, f.y - 46, '🌫️ VEIL', this.hex(ILL.warp));
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

  /** F — Tesseract. Thrown at a person who is not allowed to know it exists. */
  doTesseract(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f || !f.active) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }
    // Online: the victim's replay of this cast must produce nothing. The cube is invisible to
    // them by design, so a local copy could only ever fold them a second time — with its own
    // roll of the shape — on top of the fold the thrower's sim already relayed.
    if (owner === 'npc' && this.api.isOnline) return;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.tesses.push({
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * TESS_SPEED,
      vy: Math.sin(ang) * TESS_SPEED,
      spin: 0,
      diesAt: this.now + TESS_LIFE_MS,
    });

    this.avatar(owner)?.play('slam', ang);
    // Only the thrower gets a cast tell — the other side must have nothing to react to.
    if (this.showsTess(owner)) {
      this.fx(owner).ring(f.x, f.y, 10, 54, ILL.cyan, 380);
      this.api.showFloatingText(f.x, f.y - 46, '⬛ TESSERACT', this.hex(ILL.cyan));
    }
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
      this.api.showFloatingText(f.x, f.y - 50, '🎭 ILLUSION DANCE', this.hex(ILL.magenta));
    }
  }

  // ── Phantom (R+) ───────────────────────────────────────────────────────────

  private dropPhantom(owner: Owner, x: number, y: number): void {
    this.phantoms.push({
      owner, x, y, bornAt: this.now, blowsAt: this.now + PHANTOM_FUSE_MS, seed: Math.random() * 999,
    });
    this.fx(owner).ring(x, y, 8, 40, ILL.crimson, 320);
    this.api.showFloatingText(x, y - 42, '👻 PHANTOM', this.hex(ILL.crimson));
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
    Sfx.playAt('blink', p.x, { volume: 0.7, rate: 0.7 });

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
   * Both of this element's upgrade vulnerabilities, rewritten onto their victims from scratch.
   *
   * Pulled together into one pass because they share a field, and share a field because a
   * folded body standing in a Phantom's blast is meant to be worth 1.2 × 1.5 rather than
   * whichever of the two happened to write last.
   */
  private refreshIncoming(time: number): void {
    const next = new Map<Fighter, number>();
    const mul = (f: Fighter, m: number): void => { next.set(f, (next.get(f) ?? 1) * m); };

    for (const [f, m] of this.marks) {
      if (f.active && f.hp > 0 && m.until > time) mul(f, PHANTOM_VULN_MULT);
    }
    for (const [victim, m] of this.morphs) {
      if (!m.weak || !victim.active || victim.hp <= 0) continue;
      const src = this.fighter(m.weak.owner);
      if (!src || !src.active || src.hp <= 0) continue;
      // The test is which side of them you are on, not where the shot happens to be: a hit
      // has no position by the time it reaches `takeDamage`, and a ranged element's shots
      // arrive along the line from the shooter anyway.
      const toSrc = Math.atan2(src.y - victim.y, src.x - victim.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toSrc - m.weak.ang)) <= BOGGLE_HALF) mul(victim, BOGGLE_MULT);
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
    Sfx.playAt('blink', to.x, { volume: 0.8 });

    this.avatar(owner)?.play('dash');
    this.avatar(owner)?.setScattered(true);
    if (announce) this.api.showFloatingText(to.x, to.y - 46, '✨ RELOCATE', this.hex(ILL.violet));
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'illusion';
    const npcIs = this.api.npcElementId === 'illusion';
    // Folds and Phantom marks outlive their caster's presence in a match (an online opponent
    // can fold you and then die), so their bookkeeping has to run even when neither side is
    // Illusion — a mark left un-expired would leave a body soft for the rest of the fight.
    if (!playerIs && !npcIs && this.morphs.size === 0 && this.marks.size === 0
        && this.invertUntil <= time) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateShots(time);
    this.updateVeils(time);
    this.updateTesseracts(time, delta);
    this.updatePhantoms(time);
    this.updateBlades(time, delta);
    for (const owner of ['player', 'npc'] as Owner[]) this.updateDance(owner, time);
    this.updateMorphs(time, delta);
    this.updateMarks(time);
    this.refreshIncoming(time);
    this.updateInvert(time);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintField(time);
    this.paintAir(time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. The panes belong behind them (they are in the floor's plane and
    // must never hide a character); the tesseract and the folded bodies belong in front.
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
    Sfx.playAt('crystal-shatter', x, { volume: 0.55, rate: 1.35 });

    const target = this.enemyOf(owner);
    if (!target) return;
    fx.crackBeam(x, y, target.x, target.y, ILL.crimson);
    target.takeDamage(CRACK_DAMAGE);
    this.api.spawnHitFlash(target.x, target.y, ILL.crimson);
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
        this.api.spawnHitFlash(proj.x, proj.y, ILL.spark);
        continue;
      }

      const kick = Math.random() < 0.5 ? VEIL_DEFLECT : -VEIL_DEFLECT;
      const ang = heading + kick;
      body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      proj.setRotation(ang);

      this.fx(v.owner).shards(proj.x, proj.y, 4, 14, ILL.warp, 300, 6);
      this.api.spawnHitFlash(proj.x, proj.y, ILL.warp);
    }
  }

  // ── Tesseract ──────────────────────────────────────────────────────────────

  /** Whether this side's tesseracts are drawn at all — only their thrower may see one. */
  private showsTess(owner: Owner): boolean {
    return owner === 'player';
  }

  private updateTesseracts(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.tesses.length - 1; i >= 0; i--) {
      const t = this.tesses[i];
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.spin += dt * 3.4;

      const spent = time >= t.diesAt
        || t.x < this.left || t.x > this.right || t.y < this.top || t.y > this.bottom;

      let hit: Fighter | null = null;
      for (const f of this.targetsOf(t.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, f.x, f.y) <= TESS_HIT_R) { hit = f; break; }
      }

      if (hit) {
        this.tesses.splice(i, 1);
        // The impact is visible to everyone: the *cube* is the secret, not being hit by it.
        this.fx(t.owner).fold(hit.x, hit.y, ILL.cyan);
        hit.takeDamage(TESS_DAMAGE);
        this.applyFold(t.owner, hit);
      } else if (spent) {
        this.tesses.splice(i, 1);
        if (this.showsTess(t.owner)) this.fx(t.owner).shards(t.x, t.y, 6, 26, ILL.cyan, 380, 8);
      }
    }
  }

  /**
   * Fold a fighter into a shape. Husks, the 1v1 npc and an online replica all take this the
   * same way — everything it touches is a `Fighter`, so nothing has to be special-cased.
   */
  private applyFold(owner: Owner, victim: Fighter): void {
    const kind = SHAPE_KINDS[Math.floor(Math.random() * SHAPE_KINDS.length)];
    this.fold(victim, kind, SHAPE_MS);
    this.api.showFloatingText(victim.x, victim.y - 48, `⬛ ${SHAPE_LABEL[kind]}`, this.hex(ILL.cyan));

    // F+ (Mind-Boggle): the fold was done badly on purpose, and left a seam. Stamped at the
    // moment of the fold rather than read live, so an upgrade equipped mid-match can't
    // retroactively open a hole in somebody who is already square.
    if (this.up(owner, 'f')) {
      const m = this.morphs.get(victim);
      if (m) {
        m.weak = { owner, ang: Math.random() * Math.PI * 2 };
        this.api.showFloatingText(victim.x, victim.y - 66, '🎯 MIND-BOGGLE', this.hex(ILL.crimson));
      }
    }

    // Online: our sim just folded a replica. The person that body belongs to has to be told,
    // both to wear the shape and to have their screen turned inside out for the duration.
    if (owner === 'player' && this.api.isOnline && victim === this.api.npc) {
      this.api.sendIllusionMsg({ t: 'ill', k: 'shape', s: kind, ms: SHAPE_MS });
    }
  }

  /** Put a fighter into a shape for `ms`. Re-folding refreshes rather than stacking. */
  private fold(victim: Fighter, kind: ShapeKind, ms: number): void {
    const existing = this.morphs.get(victim);
    if (existing) {
      existing.kind = kind;
      existing.until = this.now + ms;
      return;
    }
    this.morphs.set(victim, {
      kind, until: this.now + ms, texture: victim.texture.key, spin: Math.random() * Math.PI,
      weak: null,
    });
    victim.setTexture(this.shapeTexture(kind));
    victim.shapeSizeMult = SHAPE_SIZE_MULT;
    victim.applySizeMult();
  }

  private shapeTexture(kind: ShapeKind): string {
    return `illusion-shape-${kind}`;
  }

  /** Hand a fighter its own body back. */
  private unfold(victim: Fighter, announce: boolean): void {
    const m = this.morphs.get(victim);
    if (!m) return;
    this.morphs.delete(victim);
    if (victim.active) {
      if (this.api.scene.textures.exists(m.texture)) victim.setTexture(m.texture);
      victim.shapeSizeMult = 1;
      victim.applySizeMult();
      if (announce) {
        this.pfx.shards(victim.x, victim.y, 7, 30, ILL.cyan, 420, 8);
        this.api.showFloatingText(victim.x, victim.y - 44, '⬛ UNFOLDED', this.hex(ILL.ghost));
      }
    } else {
      victim.shapeSizeMult = 1;
    }
  }

  private updateMorphs(time: number, delta: number): void {
    for (const [victim, m] of [...this.morphs]) {
      if (!victim.active || victim.hp <= 0) { this.unfold(victim, false); continue; }
      if (time >= m.until) { this.unfold(victim, true); continue; }
      m.spin += (delta / 1000) * 1.3;
      // The seam turns on its own clock, slower than the body — you have to keep walking
      // around them to stay on it, which is the whole cost of the upgrade.
      if (m.weak) m.weak.ang += (delta / 1000) * BOGGLE_SPIN;
    }
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
        this.api.showFloatingText(f.x, f.y - 46, '🎭 THE DANCE ENDS', this.hex(ILL.ghost));
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
    Sfx.playAt('crystal-shatter', f.x, { volume: 0.6, rate: 0.9 });
    this.api.showFloatingText(f.x, f.y - 54, '🗡️ BLADE DANCE', this.hex(ILL.violet));
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
    Sfx.playAt('blink', tx, { volume: 0.8, rate: 0.85 });
    this.api.showFloatingText(tx, ty - 46, '🗡️ CAST ACROSS', this.hex(ILL.violet));
  }

  // ── Online: the folded player's own screen ─────────────────────────────────

  /** Attacker's sim folded us. Wear the shape, and look at the world through the negative. */
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

    if (msg.k !== 'shape') return;
    this.ensureLayers();
    this.fold(p, msg.s, msg.ms);
    this.invertUntil = this.now + msg.ms;
    this.pfx.fold(p.x, p.y, ILL.cyan);
    this.api.showFloatingText(p.x, p.y - 48, `⬛ ${SHAPE_LABEL[msg.s]}`, this.hex(ILL.cyan));
  }

  private updateInvert(time: number): void {
    const on = time < this.invertUntil;
    if (on && !this.invertRect) {
      const { scene } = this.api;
      this.invertRect = scene.add.rectangle(
        0, 0, scene.scale.width, scene.scale.height, 0xffffff, 1,
      ).setOrigin(0, 0).setScrollFactor(0).setDepth(40);
      this.invertRect.setBlendMode(Phaser.BlendModes.DIFFERENCE);
    } else if (!on && this.invertRect) {
      this.invertRect.destroy();
      this.invertRect = null;
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
      // Fades over its last third of a second, so it never blinks out of existence.
      const fade = Phaser.Math.Clamp((v.until - time) / 320, 0, 1);
      warpPane(g, this.col(v.owner), v.x, v.y, v.ang, VEIL_HALF_LEN, VEIL_HALF_THICK,
        this.vizT, fade, v.seed);
    }

    // Phantoms stand on the floor plane with the panes — they are scenery the opponent has
    // to decide whether to believe, not something in the air.
    for (const p of this.phantoms) {
      const charge = Phaser.Math.Clamp((time - p.bornAt) / PHANTOM_FUSE_MS, 0, 1);
      phantomFigure(g, this.col(p.owner), p.x, p.y, this.vizT, charge, 1, p.seed);
    }
  }

  /** Tesseracts and folded bodies, over the fighters. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    void time;

    for (const t of this.tesses) {
      if (!this.showsTess(t.owner)) continue;
      const tint = this.col(t.owner);
      // A wake of two lagging ghosts, so it reads as a thing moving through a dimension
      // rather than a sprite sliding across the floor.
      for (let i = 2; i >= 1; i--) {
        tesseract(g, tint, t.x - (t.vx / TESS_SPEED) * i * 11, t.y - (t.vy / TESS_SPEED) * i * 11,
          TESS_SIZE * (1 - i * 0.14), t.spin - i * 0.5, 0.24 / i);
      }
      tesseract(g, tint, t.x, t.y, TESS_SIZE, t.spin, 1);
    }

    for (const [victim, m] of this.morphs) {
      if (!victim.active || victim.hp <= 0) continue;
      const tint = victim === this.api.player ? this.ncol : this.pcol;
      const left = m.until - this.now;
      const alpha = Phaser.Math.Clamp(left / 400, 0, 1) * (victim.alpha > 0.02 ? 1 : 0);
      // Drawn over the sprite as well as swapped onto it: a body wearing a rig (most elements
      // paint one) would otherwise still be a circle under all those hands and eyes.
      shapeBody(g, tint, m.kind, victim.x, victim.y,
        27 * victim.sizeMult * victim.shapeSizeMult, m.spin, alpha * 0.85);
      // The seam the fold left, ticking round the shape.
      const a = m.spin * 2.2;
      fracture(g, tint, victim.x + Math.cos(a) * 30, victim.y + Math.sin(a) * 30,
        victim.x - Math.cos(a) * 30, victim.y - Math.sin(a) * 30, 1.4, ILL.cyan, alpha * 0.4,
        m.spin * 10, 1.2);
      harlequinMask(g, tint, victim.x, victim.y - 2, 7, alpha * 0.55, ILL.cyan);
      // F+: the seam. Drawn in the *attacker's* colours — it belongs to whoever folded them.
      if (m.weak) {
        weakCone(g, this.col(m.weak.owner), victim.x, victim.y, m.weak.ang,
          BOGGLE_HALF, BOGGLE_REACH, alpha, this.vizT);
      }
    }

    // Daggers, over everything: five of them crossing an arena has to be unmissable.
    for (const b of this.blades) {
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

    const myVeil = this.veils.find((v) => v.owner === 'player');
    this.api.setStatusIndicator('illusion-veil', playerIsIllusion && myVeil ? {
      name: 'Illusion Veil', emoji: '🌫️', color: ILL.warp,
      description: 'A pane of warped space is hanging out there. Every shot that crosses it — including your own — comes out 30° off.',
      until: myVeil.until, priority: 116,
    } : null);

    // The victim side: the local player folded into a shape, whoever did it.
    const mine = this.morphs.get(this.api.player);
    this.api.setStatusIndicator('illusion-folded', mine ? {
      name: `Folded — ${SHAPE_LABEL[mine.kind].toLowerCase()}`, emoji: '⬛', color: ILL.cyan,
      description: mine.weak
        ? 'A tesseract folded you flat. You are 30% larger, which means 30% easier to hit — and the fold left a seam, so anything landing on that side of you hits for 1.5×.'
        : 'A tesseract folded you flat. You are 30% larger, which means 30% easier to hit, until it wears off.',
      until: mine.until, priority: 14,
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

  /** Whether the local player is currently folded — read by the AI to press its advantage. */
  isFolded(f: Fighter): boolean { return this.morphs.has(f); }

  /**
   * R+ (Phantom): the blast's slow, on whoever is wearing the mark. Pulled by ArenaScene
   * rather than pushed onto the fighter, because this kit's update runs long after the
   * frame's movement has already resolved.
   */
  getPlayerSpeedMult(): number { return this.speedMultFor(this.api.player); }

  getNpcSpeedMult(): number { return this.speedMultFor(this.api.npc); }

  private speedMultFor(f: Fighter): number {
    const m = f ? this.marks.get(f) : undefined;
    return m && m.until > this.now ? PHANTOM_SLOW_MULT : 1;
  }

  /**
   * Ability tray fill. Two of the five spend most of their life showing something that isn't
   * a cooldown: the pane's remaining seconds, and the dance's own clock.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;

    if (abilityId === 'illusion-dance' && s.danceUntil > time) {
      return Phaser.Math.Clamp((s.danceUntil - time) / DANCE_MS, 0, 1);
    }
    if (abilityId === 'illusion-veil') {
      const v = this.veils.find((veil) => veil.owner === 'player');
      if (v) return Phaser.Math.Clamp((v.until - time) / VEIL_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Warp panes and un-detonated Phantoms — the two things this element plants and leaves
   * standing. Anything already bent by a pane keeps its new heading: the kick has already
   * been applied, and the pane was only ever the thing that applied it. Daggers and
   * tesseracts are shots in flight rather than structures, so the spikes never touch them.
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
