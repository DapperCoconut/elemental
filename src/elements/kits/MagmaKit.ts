import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  MAG, MagmaAvatar, MagmaColorFn, MagmaFx, breathCone, dragonEgg, lavaRock, magmaArm, magmaFist,
  moltenPool, pressureGauge, volcanoCone,
} from './MagmaVisuals';

type Owner = 'player' | 'npc';

/**
 * Magma — a test element, reachable only from a cheat-mode save for now.
 *
 * Two of its five abilities put a *pressure vessel* on the floor, and the thing that makes the
 * element what it is is that the vessels are charged by Magma's own attacks. Nothing else in
 * the game asks you to aim at your own summon. A volcano you never hit is a slow trickle of
 * lava; a volcano you stand next to and beat on with the fist erupts in six seconds and takes
 * the arena with it. The dragon egg is the same bargain at ten times the price: 250 pressure,
 * paid for out of your own damage output, for twenty seconds of being something else entirely.
 *
 * So every damage source below routes through one chokepoint — `feed` — and the question
 * "does this hurt them or does it charge me" is answered per-object, not per-ability.
 */

const ARENA_PAD = 32;

// ── Plume (Click) ────────────────────────────────────────────────────────────
const PLUME_COUNT = 5;
/** Gap between one lob and the next. Short enough to read as one burst. */
const PLUME_GAP_MS = 85;
const PLUME_FLIGHT_MS = 260;
const PLUME_MIN_DIST = 38;
const PLUME_MAX_DIST = 118;
/** Half-angle of the fan the five pools are thrown into. */
const PLUME_SPREAD = 0.62;
const POOL_R = 27;
const POOL_LIFE_MS = 6000;
const POOL_DPS = 34;
/** How fast a pool charges a vessel it is sitting on. */
const POOL_FEED_PER_S = 16;
const MAX_POOLS = 44;

/**
 * Overlapping pools are a *wider* trap, not a hotter one: burn is taken as a maximum across
 * every pool touching a body rather than a sum. Five pools stacked on one tile would otherwise
 * delete anyone who walked through them.
 */

// ── Volcano (E) ──────────────────────────────────────────────────────────────
const VOLCANO_MAX = 100;
const VOLCANO_LIFE_MS = 18000;
const VOLCANO_R = 30;
/** Two at once. A third would make the pressure economy trivial. */
const MAX_VOLCANOES = 2;
const VOLC_PUDDLE_SLOW_MS = 2600;
const VOLC_PUDDLE_FAST_MS = 700;
/** Pressure at which a volcano starts throwing rock as well as lava. */
const VOLC_ROCK_AT = 0.35;
const VOLC_ROCK_SLOW_MS = 1500;
const VOLC_ROCK_FAST_MS = 420;
/** The final show: rock in every direction, then the cone comes down. */
const VOLC_BLOW_MS = 5000;
const VOLC_BLOW_ROCK_MS = 130;
const VOLC_COLLAPSE_R = 150;
const VOLC_COLLAPSE_DMG = 60;

const ROCK_SPEED = 215;
const ROCK_DMG = 12;
const ROCK_LIFE_MS = 2600;
const ROCK_HIT_R = 22;
const ROCK_FEED = 10;
const MAX_ROCKS = 70;

// ── Magma Bloat (R) ──────────────────────────────────────────────────────────
const BLOAT_MS = 10000;
const BLOAT_DMG = 30;
const BLOAT_R = 96;
const BLOAT_FEED = 25;

// ── Magma Fist (F) ───────────────────────────────────────────────────────────
const FIST_MS = 8000;
const FIST_REACH = 262;
const FIST_R = 34;
/** How hard the fist chases the cursor. High enough that a flick survives the lerp. */
const FIST_FOLLOW = 22;
const SLAP_SPEED = 520;
const PUNCH_SPEED = 560;
/**
 * How radial the fist's motion has to be to count as a thrust rather than a sweep. Measured
 * against the caster→fist axis, which is the arm — pushing *along* the arm is a punch, moving
 * *across* it is a slap.
 */
const PUNCH_RADIAL = 0.55;
const SLAP_DMG = 15;
const SLAP_KNOCK = 190;
const PUNCH_DMG = 35;
const PUNCH_KNOCK = 70;
const FIST_HIT_GATE_MS = 500;
const SLAP_FEED = 8;
const PUNCH_FEED = 22;

// ── Dragon Kin (Q) ───────────────────────────────────────────────────────────
const EGG_MAX = 250;
const EGG_LIFE_MS = 40000;
const EGG_R = 26;
const DRAGON_MS = 20000;
const DRAGON_INCOMING = 0.8;
const DRAGON_SPEED = 1.2;
/** Dragon Breath replaces the click outright while hatched. */
const BREATH_MS = 900;
const BREATH_RANGE = 210;
const BREATH_HALF = 0.44;
const BREATH_TICK_MS = 180;
const BREATH_TICK_DMG = 14;
const BREATH_FEED_PER_S = 25;

/** Knockback is played out as a position shove — see `Shove`. */
const SHOVE_MS = 260;

// ── World objects ────────────────────────────────────────────────────────────

/**
 * One pool of lava. Lobbed rather than placed: until `landAt` it is a glob in the air and does
 * nothing, which is what stops Plume from being an instant 5-pool carpet under someone's feet.
 */
interface Pool {
  owner: Owner;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  landAt: number;
  until: number;
  seed: number;
}

/** A thrown chunk. `source` is the vessel that spat it, which it may never charge back. */
interface Rock {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  seed: number;
  spin: number;
  source: Vessel | null;
}

/**
 * A pressure vessel. The volcano and the egg are the same object with different numbers on it
 * and different answers to being filled — which is deliberate, because the player has to learn
 * the charging game exactly once.
 */
interface Vessel {
  owner: Owner;
  kind: 'volcano' | 'egg';
  x: number;
  y: number;
  r: number;
  pressure: number;
  max: number;
  until: number;
  seed: number;
  nextPoolAt: number;
  nextRockAt: number;
  rockAng: number;
  /** Volcano only: when the collapse lands. 0 until it tops out. */
  blowAt: number;
  /** Brief white-out after being fed, so a hit on your own summon reads as a hit. */
  flashUntil: number;
}

/** A knockback in progress. Velocity is stomped every frame by both movement systems, so a
 *  shove has to be played out as position rather than handed to the physics body. */
interface Shove {
  target: Fighter;
  vx: number;
  vy: number;
  until: number;
}

interface Side {
  owner: Owner;

  // Plume
  plumeLeft: number;
  plumeNextAt: number;
  plumeAng: number;

  // Magma Bloat
  bloatUntil: number;
  savedAbsorber: ((amount: number) => boolean) | null;
  absorberInstalled: boolean;

  // Magma Fist
  fistUntil: number;
  fistX: number;
  fistY: number;
  /** Peak-held speed, so a flick still registers on the frame contact happens. */
  fistSpeed: number;
  fistDirX: number;
  fistDirY: number;
  fistClench: number;
  /** Latched so the fist can be put away with a puff on the frame its window closes. */
  fistWasOut: boolean;
  fistHitAt: Map<Fighter, number>;
  fistFedAt: Map<Vessel, number>;
  /** The npc has no mouse: 0 = sweeping across the target, 1 = winding up, 2 = thrusting. */
  npcFistPhase: number;
  npcFistUntil: number;

  // Dragon Kin
  dragonUntil: number;
  breathUntil: number;
  breathTickAt: number;

  /** Cursor this side is driving — the real one for the player, a phantom for the npc. */
  curX: number;
  curY: number;
  curAng: number;

}

function makeSide(owner: Owner): Side {
  return {
    owner,
    plumeLeft: 0,
    plumeNextAt: 0,
    plumeAng: 0,
    bloatUntil: 0,
    savedAbsorber: null,
    absorberInstalled: false,
    fistUntil: 0,
    fistX: 0,
    fistY: 0,
    fistSpeed: 0,
    fistDirX: 1,
    fistDirY: 0,
    fistClench: 0,
    fistWasOut: false,
    fistHitAt: new Map(),
    fistFedAt: new Map(),
    npcFistPhase: 0,
    npcFistUntil: 0,
    dragonUntil: 0,
    breathUntil: 0,
    breathTickAt: 0,
    curX: 0,
    curY: 0,
    curAng: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface MagmaArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Skins: maps a Magma visual colour through that side's equipped skin. */
  magmaColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── MagmaKit ─────────────────────────────────────────────────────────────────

export class MagmaKit {
  private api: MagmaArenaApi;

  // ── Visuals ──
  private readonly pcol: MagmaColorFn;
  private readonly ncol: MagmaColorFn;
  private readonly pfx: MagmaFx;
  private readonly nfx: MagmaFx;
  private playerAvatar: MagmaAvatar | null = null;
  private npcAvatar: MagmaAvatar | null = null;
  /** Lava on the floor. Under the fighters — you stand *in* it. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Things standing on the floor: vessels and flying rock. Over the fighters. */
  private objGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pressure gauges, which must clear the vessels they belong to. */
  private gaugeGfx: Phaser.GameObjects.Graphics | null = null;
  /** The fist, its arm, and the breath cone — the only things allowed over everything. */
  private fistGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private pools: Pool[] = [];
  private rocks: Rock[] = [];
  private vessels: Vessel[] = [];
  private shoves: Shove[] = [];
  /** Fractional pool damage carried between frames, per victim. */
  private burnAccum = new Map<Fighter, number>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;

  constructor(api: MagmaArenaApi) {
    this.api = api;
    this.pcol = (base) => api.magmaColor('player', base);
    this.ncol = (base) => api.magmaColor('npc', base);
    this.pfx = new MagmaFx(api.scene, this.pcol);
    this.nfx = new MagmaFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MagmaFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MagmaColorFn { return owner === 'player' ? this.pcol : this.ncol; }

  private isMagma(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'magma' : this.api.npcElementId === 'magma';
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  /** Whoever this side is aiming at. Drives the npc's phantom cursor. */
  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') {
      const p = this.api.player;
      return p && p.active && p.hp > 0 ? p : null;
    }
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return t && t.active && t.hp > 0 ? t : null;
  }

  private avatar(owner: Owner): MagmaAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private isDragon(owner: Owner): boolean {
    return this.side(owner).dragonUntil > this.now;
  }

  private vesselsOf(owner: Owner, kind?: 'volcano' | 'egg'): Vessel[] {
    return this.vessels.filter((v) => v.owner === owner && (!kind || v.kind === kind));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything parked on a Fighter has to be handed back, or the next match starts with a
    // permanently armoured player and an absorber pointing at a shield that no longer exists.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (f) {
        if (s.absorberInstalled) f.damageAbsorber = s.savedAbsorber;
        f.magmaIncomingMult = 1;
      }
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.pools = [];
    this.rocks = [];
    this.vessels = [];
    this.shoves = [];
    this.burnAccum.clear();
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.objGfx?.destroy(); this.objGfx = null;
    this.gaugeGfx?.destroy(); this.gaugeGfx = null;
    this.fistGfx?.destroy(); this.fistGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'magma') return;
    void time;
    // Latched before anything else: the cursor is where the fist is, and a frame that early-
    // outs on an ability still has to move the fist.
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('magma-plume', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('magma-volcano', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('magma-bloat', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('magma-fist', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('magma-dragon-kin', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Plume, or Dragon Breath while hatched. One ability id covers both because the two
   * are never available at the same time, and sharing the slot is the point of Dragon Kin.
   */
  doPlume(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;

    if (this.isDragon(owner)) {
      s.breathUntil = this.now + BREATH_MS;
      s.breathTickAt = 0;
      this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
      this.api.showFloatingText(f.x, f.y - 50, '🐉 BREATHE', this.hex(MAG.breath));
      return;
    }

    s.plumeLeft = PLUME_COUNT;
    s.plumeNextAt = this.now;
    s.plumeAng = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('sweep', s.plumeAng);
  }

  /** E — Volcano. */
  doVolcano(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f) return;
    const mine = this.vesselsOf(owner, 'volcano');
    // Oldest goes if the pair is already out, so the ability never becomes uncastable.
    if (mine.length >= MAX_VOLCANOES) this.removeVessel(mine[0], 'crumble');

    const x = this.clampX(tx);
    const y = this.clampY(ty);
    const v: Vessel = {
      owner, kind: 'volcano', x, y, r: VOLCANO_R,
      pressure: 0, max: VOLCANO_MAX,
      until: this.now + VOLCANO_LIFE_MS,
      seed: Math.random() * 999,
      nextPoolAt: this.now + VOLC_PUDDLE_SLOW_MS,
      nextRockAt: this.now + VOLC_ROCK_SLOW_MS,
      rockAng: Math.random() * Math.PI * 2,
      blowAt: 0,
      flashUntil: 0,
    };
    this.vessels.push(v);

    const fx = this.fx(owner);
    fx.shock(x, y, 8, 70, MAG.magma, 520);
    fx.smoke(x, y - 26, 6, 900);
    fx.ember(x, y - 20, 10, 26, 700);
    this.avatar(owner)?.play('slam', Math.atan2(y - f.y, x - f.x));
    this.api.showFloatingText(x, y - 74, '🌋 VOLCANO', this.hex(MAG.lava));
    this.api.scene.cameras.main.shake(160, 0.004);
  }

  /** R — Magma Bloat. */
  doBloat(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    s.bloatUntil = this.now + BLOAT_MS;
    this.installAbsorber(owner);
    this.avatar(owner)?.play('flex');
    this.avatar(owner)?.setVenting(true);
    const fx = this.fx(owner);
    fx.shock(f.x, f.y, 10, 44, MAG.gold, 420);
    fx.ember(f.x, f.y - 6, 10, 30, 600);
    this.api.showFloatingText(f.x, f.y - 48, '💦 BLOATED', this.hex(MAG.gold));
  }

  /** F — Magma Fist. */
  doFist(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    s.fistUntil = this.now + FIST_MS;
    // Starts at the shoulder and is thrown out to the cursor, rather than blinking into place.
    s.fistX = f.x;
    s.fistY = f.y;
    s.fistSpeed = 0;
    s.fistHitAt.clear();
    s.fistFedAt.clear();
    s.npcFistPhase = 0;
    s.npcFistUntil = this.now + 1400;
    void tx; void ty;
    this.avatar(owner)?.play('punch');
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, 46, MAG.magma);
    this.api.showFloatingText(f.x, f.y - 52, '👊 MAGMA FIST', this.hex(MAG.magma));
    this.api.scene.cameras.main.shake(180, 0.005);
  }

  /** Q — Dragon Kin. */
  doDragonKin(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!f) return;
    for (const old of this.vesselsOf(owner, 'egg')) this.removeVessel(old, 'crumble');

    const x = this.clampX(tx);
    const y = this.clampY(ty);
    this.vessels.push({
      owner, kind: 'egg', x, y, r: EGG_R,
      pressure: 0, max: EGG_MAX,
      until: this.now + EGG_LIFE_MS,
      seed: Math.random() * 999,
      nextPoolAt: Infinity,
      nextRockAt: Infinity,
      rockAng: 0,
      blowAt: 0,
      flashUntil: 0,
    });

    const fx = this.fx(owner);
    fx.shock(x, y, 8, 90, MAG.scale, 620);
    fx.ember(x, y - 16, 14, 34, 900, MAG.scaleLit);
    this.avatar(owner)?.play('raise');
    this.api.showFloatingText(x, y - 60, '🥚 DRAGON KIN', this.hex(MAG.scaleLit));
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'magma';
    const npcIs = this.api.npcElementId === 'magma';
    if (!playerIs && !npcIs) return;

    const dt = delta / 1000;
    this.vizT += dt;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      this.advanceCursor(owner, dt);
      this.firePlume(owner, time);
      this.updateBloat(owner, time);
      this.updateFist(owner, time, dt);
      this.updateBreath(owner, time, dt);
      this.updateDragon(owner, time);
    }

    this.updatePools(time, dt);
    this.updateVessels(time, dt);
    this.updateRocks(time, dt);
    this.updateShoves(dt);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintObjects(time);
    this.paintGauges();
    this.paintFists(time);
    this.paintHud(playerIs, time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.objGfx) this.objGfx = scene.add.graphics().setDepth(6);
    if (!this.gaugeGfx) this.gaugeGfx = scene.add.graphics().setDepth(8);
    if (!this.fistGfx) this.fistGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(20).setScrollFactor(0);
  }

  /**
   * The npc has no mouse, so it gets a phantom one. Everything the element does is aimed with
   * that cursor, so this is the whole of the AI's aim: pools and summons go near the target,
   * and the fist runs a three-beat loop — sweep across them, wind up, thrust — which the same
   * slap/punch classifier below then reads exactly as if a player had done it.
   */
  private advanceCursor(owner: Owner, dt: number): void {
    const s = this.side(owner);
    if (owner === 'player') {
      s.curX = this.aimX;
      s.curY = this.aimY;
      return;
    }

    const f = this.fighter(owner);
    if (!f || !f.active) return;
    const target = this.enemyOf(owner);
    // What the fist is being swung at. A vessel of its own that still has room in it and is
    // within arm's reach outranks the player — beating on your own summon is the element, and
    // an AI that never did it would never reach a collapse or a hatch.
    const vessel = this.vesselsOf(owner)
      .filter((v) => v.pressure < v.max
        && Phaser.Math.Distance.Between(f.x, f.y, v.x, v.y) < FIST_REACH * 0.8)
      .sort((a, b) => (b.kind === 'egg' ? 1 : 0) - (a.kind === 'egg' ? 1 : 0))[0];
    const focus = s.fistUntil > this.now && vessel ? vessel : target;
    const tx = focus ? focus.x : f.x;
    const ty = focus ? focus.y : f.y;

    if (s.fistUntil > this.now && focus) {
      if (this.now >= s.npcFistUntil) {
        s.npcFistPhase = (s.npcFistPhase + 1) % 3;
        s.npcFistUntil = this.now + (s.npcFistPhase === 0 ? 1400 : s.npcFistPhase === 1 ? 420 : 220);
      }
      const toward = Math.atan2(ty - f.y, tx - f.x);
      if (s.npcFistPhase === 0) {
        // Sweeping: a wide fast orbit of the target, which is tangential motion — a slap.
        s.curAng += dt * 9;
        s.curX = this.clampX(tx + Math.cos(s.curAng) * 70);
        s.curY = this.clampY(ty + Math.sin(s.curAng) * 70);
      } else if (s.npcFistPhase === 1) {
        // Winding up: drift back along the arm, slowly enough not to trip either threshold.
        const back = 1 - (s.npcFistUntil - this.now) / 420;
        s.curX = this.clampX(tx - Math.cos(toward) * (30 + back * 70));
        s.curY = this.clampY(ty - Math.sin(toward) * (30 + back * 70));
      } else {
        // Thrusting: straight down the arm and through them — a punch. The travel has to be
        // long enough that the fist's follow filter still clears PUNCH_SPEED at the far end.
        const f2 = 1 - (s.npcFistUntil - this.now) / 220;
        s.curX = this.clampX(tx - Math.cos(toward) * (110 - f2 * 175));
        s.curY = this.clampY(ty - Math.sin(toward) * (110 - f2 * 175));
      }
      return;
    }

    // No fist out: loiter around whatever it is aiming at.
    s.curAng += dt * 2.2;
    s.curX = this.clampX(tx + Math.cos(s.curAng) * 46);
    s.curY = this.clampY(ty + Math.sin(s.curAng) * 46 * 0.8);
  }

  // ── Pressure ───────────────────────────────────────────────────────────────

  /**
   * The one place pressure is ever added. Everything Magma does that hurts anybody passes
   * through here first with the same geometry it used for damage, which is what makes "all of
   * magma's attacks charge it" true rather than a list of special cases.
   *
   * Returns the vessels that were actually fed, so a rock can die on the thing it charged.
   */
  private feed(owner: Owner, x: number, y: number, radius: number, amount: number, except?: Vessel | null): Vessel[] {
    const hit: Vessel[] = [];
    for (const v of this.vessels) {
      if (v.owner !== owner || v === except) continue;
      if (v.pressure >= v.max) continue;
      if (Phaser.Math.Distance.Between(x, y, v.x, v.y) > radius + v.r) continue;
      const before = v.pressure;
      v.pressure = Math.min(v.max, v.pressure + amount);
      if (v.pressure === before) continue;
      hit.push(v);
      v.flashUntil = this.now + 110;
      // A whole point of pressure is worth a spark; a fractional tick is not.
      if (Math.floor(v.pressure) > Math.floor(before)) {
        this.fx(owner).ember(v.x + (Math.random() - 0.5) * v.r, v.y - v.r * 0.5, 1, 8, 420,
          v.kind === 'egg' ? MAG.scaleLit : MAG.ember);
      }
      if (v.pressure >= v.max && before < v.max) this.onVesselFull(v);
    }
    return hit;
  }

  /** A vessel has topped out. The volcano starts its countdown; the egg hatches on the spot. */
  private onVesselFull(v: Vessel): void {
    const fx = this.fx(v.owner);
    if (v.kind === 'volcano') {
      v.blowAt = this.now + VOLC_BLOW_MS;
      v.until = v.blowAt + 1;
      v.nextRockAt = this.now;
      fx.erupt(v.x, v.y - v.r, 60, MAG.gold);
      this.api.showFloatingText(v.x, v.y - 78, '🌋 CRITICAL', this.hex(MAG.white));
      this.api.scene.cameras.main.shake(240, 0.006);
    } else {
      this.hatch(v);
    }
  }

  private hatch(v: Vessel): void {
    const s = this.side(v.owner);
    const f = this.fighter(v.owner);
    s.dragonUntil = this.now + DRAGON_MS;
    this.vessels = this.vessels.filter((o) => o !== v);

    const fx = this.fx(v.owner);
    fx.erupt(v.x, v.y, 110, MAG.scale);
    fx.ember(v.x, v.y, 24, 90, 1100, MAG.scaleLit);
    fx.shock(v.x, v.y, 20, 170, MAG.scaleLit, 700);
    if (f) {
      fx.shock(f.x, f.y, 12, 96, MAG.scale, 620);
      this.api.showFloatingText(f.x, f.y - 56, '🐉 DRAGON KIN', this.hex(MAG.scaleLit));
    }
    this.api.scene.cameras.main.shake(360, 0.009);
  }

  // ── Plume ──────────────────────────────────────────────────────────────────

  /** Lob the queued pools out one at a time. Cast fires five of these over ~0.4s. */
  private firePlume(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.plumeLeft <= 0 || time < s.plumeNextAt) return;
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.plumeLeft = 0; return; }

    const i = PLUME_COUNT - s.plumeLeft;
    // Fanned and staggered in distance, so five pools cover an area rather than a line.
    const spread = ((i / (PLUME_COUNT - 1)) - 0.5) * 2 * PLUME_SPREAD;
    const ang = s.plumeAng + spread;
    const dist = PLUME_MIN_DIST + (PLUME_MAX_DIST - PLUME_MIN_DIST) * (0.35 + Math.random() * 0.65);
    const x = this.clampX(f.x + Math.cos(ang) * dist);
    const y = this.clampY(f.y + Math.sin(ang) * dist);

    this.pools.push({
      owner, x, y, fromX: f.x, fromY: f.y,
      landAt: time + PLUME_FLIGHT_MS,
      until: time + PLUME_FLIGHT_MS + POOL_LIFE_MS,
      seed: Math.random() * 999,
    });
    while (this.pools.length > MAX_POOLS) this.pools.shift();

    this.fx(owner).ember(f.x, f.y, 3, 14, 380);
    s.plumeLeft--;
    s.plumeNextAt = time + PLUME_GAP_MS;
    this.avatar(owner)?.setVenting(true);
  }

  private updatePools(time: number, dt: number): void {
    const landing = this.pools.filter((p) => p.landAt <= time && p.landAt > time - 40);
    for (const p of landing) {
      const fx = this.fx(p.owner);
      fx.splat(p.x, p.y, POOL_R * 0.9);
      fx.ember(p.x, p.y, 4, POOL_R * 0.7, 520);
    }
    this.pools = this.pools.filter((p) => time < p.until);

    // Burn: taken as a maximum across every pool touching a body, never a sum.
    const burn = new Map<Fighter, Owner>();
    for (const p of this.pools) {
      if (time < p.landAt) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > POOL_R) continue;
        burn.set(t, p.owner);
      }
      // …and the same pool charges anything of its owner's that it is sitting on.
      this.feed(p.owner, p.x, p.y, POOL_R, POOL_FEED_PER_S * dt);
    }

    for (const [t, owner] of burn) {
      const acc = (this.burnAccum.get(t) ?? 0) + POOL_DPS * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole > 0) {
        t.takeDamage(whole);
        if (Math.random() < 0.3) this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
      }
    }
    // Anything that stepped off loses its part-tick rather than banking it.
    for (const t of [...this.burnAccum.keys()]) if (!burn.has(t)) this.burnAccum.delete(t);
  }

  // ── Vessels ────────────────────────────────────────────────────────────────

  private updateVessels(time: number, dt: number): void {
    void dt;
    for (const v of [...this.vessels]) {
      const ratio = v.pressure / v.max;

      if (v.kind === 'volcano') {
        // Lava. The fuller it is, the faster it comes.
        if (time >= v.nextPoolAt) {
          const gap = Phaser.Math.Linear(VOLC_PUDDLE_SLOW_MS, VOLC_PUDDLE_FAST_MS, ratio);
          v.nextPoolAt = time + gap;
          this.ventPool(v, time);
        }
        // Rock, once there is enough pressure behind it to throw any.
        if (ratio >= VOLC_ROCK_AT || v.blowAt > 0) {
          if (time >= v.nextRockAt) {
            if (v.blowAt > 0) {
              v.nextRockAt = time + VOLC_BLOW_ROCK_MS;
              this.spitRock(v, v.rockAng);
              v.rockAng += 2.4;
            } else {
              const f = Phaser.Math.Clamp((ratio - VOLC_ROCK_AT) / (1 - VOLC_ROCK_AT), 0, 1);
              v.nextRockAt = time + Phaser.Math.Linear(VOLC_ROCK_SLOW_MS, VOLC_ROCK_FAST_MS, f);
              // A three-spoke burst, turning a little each time, so cover builds up all round.
              for (let i = 0; i < 3; i++) this.spitRock(v, v.rockAng + (i / 3) * Math.PI * 2);
              v.rockAng += 0.9;
            }
          }
        }
        if (v.blowAt > 0 && time >= v.blowAt) { this.collapse(v); continue; }
      }

      if (time >= v.until) {
        this.removeVessel(v, v.kind === 'egg' ? 'spoil' : 'crumble');
      }
    }
  }

  /** A volcano coughing up a pool of lava somewhere near its own base. */
  private ventPool(v: Vessel, time: number): void {
    const ang = Math.random() * Math.PI * 2;
    const d = v.r + 14 + Math.random() * 58;
    const x = this.clampX(v.x + Math.cos(ang) * d);
    const y = this.clampY(v.y + Math.sin(ang) * d * 0.8);
    this.pools.push({
      owner: v.owner, x, y, fromX: v.x, fromY: v.y - v.r * 1.4,
      landAt: time + PLUME_FLIGHT_MS,
      until: time + PLUME_FLIGHT_MS + POOL_LIFE_MS,
      seed: Math.random() * 999,
    });
    while (this.pools.length > MAX_POOLS) this.pools.shift();
    this.fx(v.owner).ember(v.x, v.y - v.r * 1.5, 3, 14, 480);
  }

  private spitRock(v: Vessel, ang: number): void {
    const jitter = ang + (Math.random() - 0.5) * 0.5;
    // Offset clear of the mouth: a rock born inside its own volcano would collide on frame one.
    const ox = v.x + Math.cos(jitter) * (v.r * 0.7);
    const oy = v.y - v.r * 1.2 + Math.sin(jitter) * (v.r * 0.4);
    this.rocks.push({
      owner: v.owner, x: ox, y: oy,
      vx: Math.cos(jitter) * ROCK_SPEED,
      vy: Math.sin(jitter) * ROCK_SPEED * 0.85,
      until: this.now + ROCK_LIFE_MS,
      seed: Math.random() * 999,
      spin: Math.random() * Math.PI * 2,
      source: v,
    });
    while (this.rocks.length > MAX_ROCKS) this.rocks.shift();
  }

  /** The end of a volcano that made it to 100: everything at once, then nothing. */
  private collapse(v: Vessel): void {
    this.vessels = this.vessels.filter((o) => o !== v);
    const fx = this.fx(v.owner);
    fx.erupt(v.x, v.y, VOLC_COLLAPSE_R * 0.7, MAG.magma);
    fx.shock(v.x, v.y, 30, VOLC_COLLAPSE_R, MAG.gold, 720);
    fx.smoke(v.x, v.y - 20, 12, 1400);

    for (const t of this.targetsOf(v.owner)) {
      if (Phaser.Math.Distance.Between(v.x, v.y, t.x, t.y) > VOLC_COLLAPSE_R) continue;
      t.takeDamage(VOLC_COLLAPSE_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(v.owner)(MAG.magma));
      const a = Math.atan2(t.y - v.y, t.x - v.x);
      this.shove(t, a, 120);
    }
    // The blast is an attack like any other, so it charges whatever else is standing nearby.
    this.feed(v.owner, v.x, v.y, VOLC_COLLAPSE_R, 40, v);

    // It leaves the field it was standing in behind it.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      const d = 30 + Math.random() * 70;
      this.pools.push({
        owner: v.owner,
        x: this.clampX(v.x + Math.cos(a) * d),
        y: this.clampY(v.y + Math.sin(a) * d * 0.8),
        fromX: v.x, fromY: v.y,
        landAt: this.now + PLUME_FLIGHT_MS,
        until: this.now + PLUME_FLIGHT_MS + POOL_LIFE_MS,
        seed: Math.random() * 999,
      });
    }
    this.api.showFloatingText(v.x, v.y - 60, '💥 COLLAPSE', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(420, 0.012);
  }

  /** A vessel going away without paying out — timed out, or replaced by a fresh cast. */
  private removeVessel(v: Vessel, why: 'crumble' | 'spoil'): void {
    this.vessels = this.vessels.filter((o) => o !== v);
    const fx = this.fx(v.owner);
    fx.smoke(v.x, v.y - 10, 7, 1000);
    fx.ember(v.x, v.y, 5, v.r, 620, v.kind === 'egg' ? MAG.scaleLit : MAG.ember);
    if (why === 'spoil') {
      this.api.showFloatingText(v.x, v.y - 44, '🥚 WENT COLD', '#8a8a8a');
    }
  }

  // ── Rocks ──────────────────────────────────────────────────────────────────

  private updateRocks(time: number, dt: number): void {
    const gone: Rock[] = [];
    for (const r of this.rocks) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.spin += dt * 6;
      if (time >= r.until || r.x < this.left - 20 || r.x > this.right + 20
        || r.y < this.top - 20 || r.y > this.bottom + 20) {
        gone.push(r);
        continue;
      }

      // Enemies first — a rock that could do both should hurt somebody.
      const victim = this.targetsOf(r.owner)
        .find((t) => Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) <= ROCK_HIT_R);
      if (victim) {
        victim.takeDamage(ROCK_DMG);
        this.api.spawnHitFlash(victim.x, victim.y, this.col(r.owner)(MAG.magma));
        this.fx(r.owner).ember(r.x, r.y, 5, 18, 480);
        gone.push(r);
        continue;
      }

      if (this.feed(r.owner, r.x, r.y, 8, ROCK_FEED, r.source).length) {
        this.fx(r.owner).ember(r.x, r.y, 5, 16, 460);
        gone.push(r);
      }
    }
    if (gone.length) this.rocks = this.rocks.filter((r) => !gone.includes(r));
  }

  // ── Magma Bloat ────────────────────────────────────────────────────────────

  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.absorberInstalled) return;
    s.savedAbsorber = f.damageAbsorber;
    s.absorberInstalled = true;
    // Looked up through `this.side` rather than captured, so a match restart that rebuilds the
    // side objects can never leave a live closure pointing at a dead shield.
    f.damageAbsorber = (amount: number) => {
      const st = this.side(owner);
      if (st.bloatUntil <= this.now) return false;
      void amount;
      st.bloatUntil = 0;
      this.popBloat(owner);
      return true;
    };
  }

  /**
   * A bloat that ran its window out without ever being hit. The absorber has to come back off
   * rather than sitting there returning false — leaving it installed would shadow whatever
   * absorber the fighter picks up next.
   */
  private updateBloat(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!s.absorberInstalled || s.bloatUntil > time) return;
    const f = this.fighter(owner);
    this.uninstallAbsorber(owner);
    if (s.bloatUntil > 0) {
      s.bloatUntil = 0;
      if (f) this.fx(owner).smoke(f.x, f.y, 5, 700);
    }
  }

  private uninstallAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!s.absorberInstalled) return;
    if (f) f.damageAbsorber = s.savedAbsorber;
    s.absorberInstalled = false;
    s.savedAbsorber = null;
  }

  /** The hit that popped it is already gone; this is what the player gets in exchange. */
  private popBloat(owner: Owner): void {
    const f = this.fighter(owner);
    this.uninstallAbsorber(owner);
    if (!f) return;
    const fx = this.fx(owner);
    fx.erupt(f.x, f.y, BLOAT_R * 0.8, MAG.lava);
    fx.shock(f.x, f.y, 16, BLOAT_R, MAG.gold, 520);

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > BLOAT_R) continue;
      t.takeDamage(BLOAT_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
      this.shove(t, Math.atan2(t.y - f.y, t.x - f.x), 90);
    }
    this.feed(owner, f.x, f.y, BLOAT_R, BLOAT_FEED);
    this.api.showFloatingText(f.x, f.y - 50, '💥 BLOCKED', this.hex(MAG.gold));
    this.api.scene.cameras.main.shake(200, 0.006);
  }

  // ── Magma Fist ─────────────────────────────────────────────────────────────

  private updateFist(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);

    if (s.fistUntil <= time) {
      if (s.fistWasOut) {
        // Just expired — put it away with a puff rather than blinking it out.
        s.fistWasOut = false;
        s.fistSpeed = 0;
        this.fx(owner).smoke(s.fistX, s.fistY, 6, 800);
      }
      return;
    }
    if (!f || !f.active || f.hp <= 0) { s.fistUntil = 0; return; }
    s.fistWasOut = true;

    // ── Where it is ──
    let tx = s.curX;
    let ty = s.curY;
    const reach = Phaser.Math.Distance.Between(f.x, f.y, tx, ty);
    if (reach > FIST_REACH) {
      const a = Math.atan2(ty - f.y, tx - f.x);
      tx = f.x + Math.cos(a) * FIST_REACH;
      ty = f.y + Math.sin(a) * FIST_REACH;
    }
    const prevX = s.fistX;
    const prevY = s.fistY;
    const k = Math.min(1, FIST_FOLLOW * dt);
    s.fistX += (tx - s.fistX) * k;
    s.fistY += (ty - s.fistY) * k;

    // ── How fast, and which way ──
    const mx = s.fistX - prevX;
    const my = s.fistY - prevY;
    const raw = dt > 0 ? Math.hypot(mx, my) / dt : 0;
    // Peak-held with a ~120ms decay: a flick that peaks a frame before contact still counts,
    // which is the difference between the ability feeling responsive and feeling broken.
    s.fistSpeed = Math.max(raw, s.fistSpeed * Math.exp(-dt * 8));
    if (raw > 140) {
      const inv = 1 / Math.max(1e-4, Math.hypot(mx, my));
      s.fistDirX = mx * inv;
      s.fistDirY = my * inv;
    }
    s.fistClench += ((s.fistSpeed > SLAP_SPEED * 0.6 ? 1 : 0) - s.fistClench) * Math.min(1, dt * 8);

    // The arm, as a unit vector. Motion along it is a thrust; motion across it is a sweep.
    const ax = s.fistX - f.x;
    const ay = s.fistY - f.y;
    const alen = Math.hypot(ax, ay) || 1;
    const radial = (s.fistDirX * ax + s.fistDirY * ay) / alen;

    const punching = s.fistSpeed >= PUNCH_SPEED && radial >= PUNCH_RADIAL;
    const slapping = !punching && s.fistSpeed >= SLAP_SPEED && Math.abs(radial) < PUNCH_RADIAL;
    if (!punching && !slapping) return;

    const fx = this.fx(owner);
    let connected = false;

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(s.fistX, s.fistY, t.x, t.y) > FIST_R + 12) continue;
      if (time < (s.fistHitAt.get(t) ?? 0)) continue;
      s.fistHitAt.set(t, time + FIST_HIT_GATE_MS);
      connected = true;

      if (punching) {
        t.takeDamage(PUNCH_DMG);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.gold));
        fx.erupt(t.x, t.y, 46, MAG.gold);
        this.shove(t, Math.atan2(ay, ax), PUNCH_KNOCK);
        this.api.showFloatingText(t.x, t.y - 40, '👊 PUNCH', this.hex(MAG.gold));
        this.api.scene.cameras.main.shake(140, 0.005);
      } else {
        t.takeDamage(SLAP_DMG);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.magma));
        fx.splat(t.x, t.y, 34);
        // Slapped *along the swing*, not away from the caster — that is what a backhand does.
        this.shove(t, Math.atan2(s.fistDirY, s.fistDirX), SLAP_KNOCK);
        this.api.showFloatingText(t.x, t.y - 40, '🖐️ SLAP', this.hex(MAG.magma));
      }
    }

    // Beating on your own vessel is the intended way to charge one, so it gets the same gate.
    for (const v of this.vessels) {
      if (v.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(s.fistX, s.fistY, v.x, v.y) > FIST_R + v.r) continue;
      if (time < (s.fistFedAt.get(v) ?? 0)) continue;
      s.fistFedAt.set(v, time + FIST_HIT_GATE_MS);
      connected = true;
      this.feed(owner, s.fistX, s.fistY, FIST_R, punching ? PUNCH_FEED : SLAP_FEED);
      fx.ember(s.fistX, s.fistY, 6, 22, 520, v.kind === 'egg' ? MAG.scaleLit : MAG.ember);
    }

    // Whatever it hit, the fist has spent its swing.
    if (connected) s.fistSpeed = 0;
  }

  // ── Dragon ─────────────────────────────────────────────────────────────────

  private updateBreath(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    if (s.breathUntil <= time) return;
    const f = this.fighter(owner);
    if (!f || !f.active || f.hp <= 0) { s.breathUntil = 0; return; }

    const ang = Math.atan2(s.curY - f.y, s.curX - f.x);

    // Charges anything of yours standing in the fire, same as everything else does.
    const midX = f.x + Math.cos(ang) * BREATH_RANGE * 0.55;
    const midY = f.y + Math.sin(ang) * BREATH_RANGE * 0.55;
    this.feed(owner, midX, midY, BREATH_RANGE * 0.5, BREATH_FEED_PER_S * dt);

    if (time < s.breathTickAt) return;
    s.breathTickAt = time + BREATH_TICK_MS;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > BREATH_RANGE) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      // Widens with distance the way a real cone does, rather than being a fixed wedge.
      if (off > BREATH_HALF + 14 / Math.max(24, d)) continue;
      t.takeDamage(BREATH_TICK_DMG);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.breath));
    }
  }

  /** Keeps the hatched buffs on the Fighter and takes them off again when the clock runs out. */
  private updateDragon(owner: Owner, time: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    const on = s.dragonUntil > time;
    f.magmaIncomingMult = on ? DRAGON_INCOMING : 1;
    if (!on && s.breathUntil > time) s.breathUntil = 0;
    // The moment it lapses, say so — twenty seconds is long enough to have forgotten.
    if (!on && s.dragonUntil > 0) {
      s.dragonUntil = 0;
      this.fx(owner).smoke(f.x, f.y, 8, 900);
      this.api.showFloatingText(f.x, f.y - 50, '🐉 SPENT', '#8a8a8a');
    }
  }

  // ── Knockback ──────────────────────────────────────────────────────────────

  /**
   * Both movement systems rewrite a fighter's velocity every frame, so a knockback handed to
   * the physics body is gone before it renders. Played out as position instead.
   */
  private shove(target: Fighter, ang: number, distance: number): void {
    const speed = distance / (SHOVE_MS / 1000);
    this.shoves = this.shoves.filter((s) => s.target !== target);
    this.shoves.push({
      target,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      until: this.now + SHOVE_MS,
    });
  }

  private updateShoves(dt: number): void {
    if (!this.shoves.length) return;
    const now = this.now;
    for (const s of this.shoves) {
      const t = s.target;
      if (!t || !t.active) continue;
      // Eases out over its life, so a shove decelerates instead of stopping dead.
      const left = Phaser.Math.Clamp((s.until - now) / SHOVE_MS, 0, 1);
      t.setPosition(
        this.clampX(t.x + s.vx * dt * left * 2),
        this.clampY(t.y + s.vy * dt * left * 2),
      );
    }
    this.shoves = this.shoves.filter((s) => s.until > now && s.target?.active);
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      if (!this.playerAvatar) this.playerAvatar = new MagmaAvatar(scene, this.pcol);
      const s = this.sides.player;
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setDragon(this.isDragon('player'));
      this.playerAvatar.setVenting(s.plumeLeft > 0 || s.breathUntil > this.now || s.fistUntil > this.now);
      this.playerAvatar.setIntensity(this.isDragon('player') ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      if (!this.npcAvatar) this.npcAvatar = new MagmaAvatar(scene, this.ncol);
      const s = this.sides.npc;
      this.npcAvatar.setFacing(Math.atan2(s.curY - f.y, s.curX - f.x));
      this.npcAvatar.setDragon(this.isDragon('npc'));
      this.npcAvatar.setVenting(s.plumeLeft > 0 || s.breathUntil > this.now || s.fistUntil > this.now);
      this.npcAvatar.setIntensity(this.isDragon('npc') ? 1.35 : 1);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    for (const p of this.pools) {
      if (time < p.landAt) continue;
      const age = (time - p.landAt) / POOL_LIFE_MS;
      // Skins over as it dies, which is also the warning that it is about to stop hurting.
      const heat = Phaser.Math.Clamp(1 - age * 1.15, 0.05, 1);
      const fade = Phaser.Math.Clamp((p.until - time) / 900, 0, 1);
      moltenPool(g, this.col(p.owner), p.x, p.y, POOL_R, heat, this.vizT, p.seed, fade);
    }
  }

  private paintObjects(time: number): void {
    const g = this.objGfx;
    if (!g) return;
    g.clear();

    // Pools still in the air, thrown on an arc from wherever they came from.
    for (const p of this.pools) {
      if (time >= p.landAt) continue;
      const f = 1 - (p.landAt - time) / PLUME_FLIGHT_MS;
      const x = Phaser.Math.Linear(p.fromX, p.x, f);
      const y = Phaser.Math.Linear(p.fromY, p.y, f) - Math.sin(f * Math.PI) * 44;
      const tint = this.col(p.owner);
      g.fillStyle(tint(MAG.magma), 0.3);
      g.fillCircle(x, y, 13);
      g.fillStyle(tint(MAG.lava), 1);
      g.fillCircle(x, y, 8);
      g.fillStyle(tint(MAG.white), 0.8);
      g.fillCircle(x - 2, y - 2, 3.2);
      // Where it is going to land, so it can be stepped out of.
      g.lineStyle(1.6, tint(MAG.ember), 0.35 + f * 0.35);
      g.strokeEllipse(p.x, p.y, POOL_R * 1.7 * (0.5 + f * 0.5), POOL_R * 1.15 * (0.5 + f * 0.5));
    }

    for (const v of this.vessels) {
      const tint = this.col(v.owner);
      const ratio = v.pressure / v.max;
      if (v.kind === 'volcano') {
        volcanoCone(g, tint, v.x, v.y + v.r * 0.5, v.r, ratio, this.vizT, v.seed);
      } else {
        dragonEgg(g, tint, v.x, v.y, v.r, ratio, this.vizT, v.seed);
      }
      if (v.flashUntil > time) {
        g.fillStyle(tint(MAG.white), ((v.flashUntil - time) / 110) * 0.45);
        g.fillCircle(v.x, v.y, v.r * 1.5);
      }
    }

    for (const r of this.rocks) {
      lavaRock(g, this.col(r.owner), r.x, r.y, 6, r.spin, r.seed);
    }
  }

  private paintGauges(): void {
    const g = this.gaugeGfx;
    if (!g) return;
    g.clear();
    for (const v of this.vessels) {
      const tint = this.col(v.owner);
      const isEgg = v.kind === 'egg';
      const y = v.y - (isEgg ? v.r * 1.5 : v.r * 2.1);
      pressureGauge(g, tint, v.x, y, isEgg ? 62 : 48, v.pressure / v.max,
        isEgg ? MAG.scaleLit : MAG.magma);
    }
  }

  private paintFists(time: number): void {
    const g = this.fistGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f || !f.active || f.hp <= 0) continue;
      const tint = this.col(owner);
      const dragon = this.isDragon(owner);

      // Dragon Breath.
      if (s.breathUntil > time) {
        const ang = Math.atan2(s.curY - f.y, s.curX - f.x);
        const left = (s.breathUntil - time) / BREATH_MS;
        // Flares open, then chokes off — a cone at constant width reads as a texture.
        const grow = Phaser.Math.Clamp((1 - left) * 4, 0, 1) * Phaser.Math.Clamp(left * 3, 0, 1);
        breathCone(g, tint,
          f.x + Math.cos(ang) * 14, f.y + Math.sin(ang) * 14, ang,
          BREATH_RANGE * (0.5 + grow * 0.5), BREATH_HALF * (0.4 + grow * 0.6),
          this.vizT, 7, MAG.scaleLit, MAG.membrane, 0.55 + grow * 0.45);
      }

      // The fist and the arm holding it up.
      if (s.fistUntil <= time) continue;
      const ang = Math.atan2(s.fistY - f.y, s.fistX - f.x);
      const fade = Phaser.Math.Clamp((s.fistUntil - time) / 600, 0, 1);
      magmaArm(g, tint, f.x, f.y, s.fistX, s.fistY, 7.5, this.vizT, 13, fade);
      magmaFist(g, tint, s.fistX, s.fistY, ang,
        1 + s.fistClench * 0.16, s.fistClench, this.vizT, 21,
        dragon ? MAG.scaleLit : MAG.lava, dragon ? MAG.scaleDeep : MAG.basalt, fade);

      // A speed streak behind it while it is actually swinging, which is the only cue that
      // the swing is fast enough to land anything.
      if (s.fistSpeed > SLAP_SPEED * 0.7) {
        const k = Phaser.Math.Clamp((s.fistSpeed - SLAP_SPEED * 0.7) / SLAP_SPEED, 0, 1);
        g.lineStyle(6 * k + 1, tint(MAG.gold), 0.4 * k * fade);
        g.lineBetween(s.fistX, s.fistY,
          s.fistX - s.fistDirX * 34 * k, s.fistY - s.fistDirY * 34 * k);
      }
    }
  }

  /** What is in hand: the fist's clock and how to use it, or the dragon's. */
  private paintHud(playerIsMagma: boolean, time: number): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    const s = this.sides.player;
    const showFist = playerIsMagma && s.fistUntil > time;
    const showDragon = playerIsMagma && this.isDragon('player');
    if (!showFist && !showDragon) {
      this.hudLabel?.setVisible(false);
      return;
    }

    const x = this.left + 8;
    const y = this.top + 8;
    const w = 186;
    const hot = showDragon ? MAG.scaleLit : MAG.magma;

    g.fillStyle(0x05070a, 0.85);
    g.fillRoundedRect(x - 4, y - 4, w, 34, 4);
    g.lineStyle(1.5, this.pcol(hot), 0.7);
    g.strokeRoundedRect(x - 4, y - 4, w, 34, 4);

    const ratio = showFist
      ? Phaser.Math.Clamp((s.fistUntil - time) / FIST_MS, 0, 1)
      : Phaser.Math.Clamp((s.dragonUntil - time) / DRAGON_MS, 0, 1);
    g.fillStyle(this.pcol(MAG.smoke), 1);
    g.fillRect(x, y + 20, w - 8, 6);
    g.fillStyle(this.pcol(hot), 1);
    g.fillRect(x, y + 20, (w - 8) * ratio, 6);

    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(x, y, '', {
        fontSize: '10px',
        fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ff8b22',
        stroke: '#05070a',
        strokeThickness: 3,
      }).setDepth(21).setScrollFactor(0);
    }
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(showFist
      ? 'MAGMA FIST\nFLICK ACROSS = SLAP · THRUST = PUNCH'
      : 'DRAGON KIN\nCLICK = BREATH · −20% TAKEN · +20% SPEED');
    this.hudLabel.setColor(this.hex(hot));
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsMagma: boolean, time: number): void {
    const s = this.sides.player;

    this.api.setStatusIndicator('magma-dragon', playerIsMagma && this.isDragon('player') ? {
      name: 'Dragon Kin', emoji: '🐉', color: MAG.scaleLit,
      description: `Hatched. You take ${Math.round((1 - DRAGON_INCOMING) * 100)}% less damage, move ${Math.round((DRAGON_SPEED - 1) * 100)}% faster, and your click is dragon breath.`,
      until: s.dragonUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('magma-fist', playerIsMagma && s.fistUntil > time ? {
      name: 'Magma Fist', emoji: '👊', color: MAG.magma,
      description: 'A fist on the end of your arm, wherever the cursor is. Flick sideways across someone to slap them away; drive it straight out at them to punch.',
      until: s.fistUntil, priority: 112,
    } : null);

    this.api.setStatusIndicator('magma-bloat', playerIsMagma && s.bloatUntil > time ? {
      name: 'Magma Bloat', emoji: '💦', color: MAG.gold,
      description: `Swollen with magma. The next hit that lands is blocked outright and bursts for ${BLOAT_DMG} around you.`,
      until: s.bloatUntil, priority: 106,
    } : null);

    const egg = this.vesselsOf('player', 'egg')[0];
    this.api.setStatusIndicator('magma-egg', playerIsMagma && egg ? {
      name: 'Dragon Egg', emoji: '🥚', color: MAG.scaleLit,
      description: `Attack your own egg to pressurise it. At ${EGG_MAX} it hatches.`,
      count: Math.floor(egg?.pressure ?? 0), suffix: ` / ${EGG_MAX}`, priority: 118,
    } : null);

    const volcanoes = this.vesselsOf('player', 'volcano');
    const hottest = volcanoes.reduce((m, v) => Math.max(m, v.pressure), 0);
    this.api.setStatusIndicator('magma-volcano', playerIsMagma && volcanoes.length ? {
      name: 'Volcano', emoji: '🌋', color: MAG.magma,
      description: `Attack it to raise its pressure — more pressure means more lava and more rock. At ${VOLCANO_MAX} it goes critical and collapses.`,
      count: Math.round(hottest), suffix: ` / ${VOLCANO_MAX}`, priority: 120,
    } : null);

    // The victim side: hostile lava under the local player's feet.
    const standing = this.pools.some((p) => p.owner === 'npc' && time >= p.landAt
      && Phaser.Math.Distance.Between(p.x, p.y, this.api.player.x, this.api.player.y) <= POOL_R);
    this.api.setStatusIndicator('magma-scalded', standing ? {
      name: 'Standing In Lava', emoji: '🔥', color: MAG.lava,
      description: `You are standing in someone else's magma — ${POOL_DPS} a second for as long as you do. Step out of it.`,
      priority: 15,
    } : null);
  }

  // ── Accessors read by ArenaScene / the npc ─────────────────────────────────

  /** Dragon Kin's haste. Pulled by ArenaScene, not pushed — its update runs after movement. */
  private speedMultFor(owner: Owner): number {
    return this.isMagma(owner) && this.isDragon(owner) ? DRAGON_SPEED : 1;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** True while the hatched window is running — the AI plays very differently inside it. */
  isDragonActive(owner: Owner): boolean { return this.isDragon(owner); }

  isFistActive(owner: Owner): boolean { return this.side(owner).fistUntil > this.now; }

  isBloatActive(owner: Owner): boolean { return this.side(owner).bloatUntil > this.now; }

  /** How many volcanoes this side has standing — the AI stops at the cap. */
  volcanoCount(owner: Owner): number { return this.vesselsOf(owner, 'volcano').length; }

  hasEgg(owner: Owner): boolean { return this.vesselsOf(owner, 'egg').length > 0; }

  /**
   * Where the AI should aim if it wants to charge something of its own, or null when there is
   * nothing left to fill. The egg comes first: it is the expensive one, and the only one that
   * expires having paid out nothing at all.
   */
  chargeTarget(owner: Owner): { x: number; y: number } | null {
    const list = [...this.vesselsOf(owner, 'egg'), ...this.vesselsOf(owner, 'volcano')]
      .filter((v) => v.pressure < v.max);
    return list.length ? { x: list[0].x, y: list[0].y } : null;
  }

  /**
   * Ability tray fill. Three of the five spend most of their life showing something other than
   * a cooldown — a live fist's clock, a bloat's window, and Q's whole pressure-then-dragon arc.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;

    if (abilityId === 'magma-fist' && s.fistUntil > time) {
      return Phaser.Math.Clamp((s.fistUntil - time) / FIST_MS, 0, 1);
    }
    if (abilityId === 'magma-bloat' && s.bloatUntil > time) {
      return Phaser.Math.Clamp((s.bloatUntil - time) / BLOAT_MS, 0, 1);
    }
    if (abilityId === 'magma-dragon-kin') {
      if (this.isDragon('player')) return Phaser.Math.Clamp((s.dragonUntil - time) / DRAGON_MS, 0, 1);
      const egg = this.vesselsOf('player', 'egg')[0];
      if (egg) return Phaser.Math.Clamp(egg.pressure / egg.max, 0, 1);
    }
    if (abilityId === 'magma-volcano') {
      const hottest = this.vesselsOf('player', 'volcano')
        .reduce((m, v) => Math.max(m, v.pressure / v.max), 0);
      if (hottest > 0) return Phaser.Math.Clamp(hottest, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Pressure vessels — volcanoes and dragon eggs alike. A vessel razed this way is simply
   * gone: it does not top out, so nothing erupts and nothing hatches.
   */
  purgeSummons(x: number, y: number, radius: number, exceptOwner: 'player' | 'npc'): number {
    const near = (px: number, py: number): boolean => Phaser.Math.Distance.Between(x, y, px, py) <= radius;
    let razed = 0;
    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const v = this.vessels[i];
      if (v.owner === exceptOwner || !near(v.x, v.y)) continue;
      this.vessels.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
