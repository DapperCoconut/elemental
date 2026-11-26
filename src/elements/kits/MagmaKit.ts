import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import type { Projectile } from '../../combat/Projectile';
import {
  MAG, MagmaAvatar, MagmaColorFn, MagmaFx, lavaRock, moltenPool, noise, pressureGauge,
} from './MagmaVisuals';
import {
  PIR, anchorChain, blunderbuss, deckCannon, flintlock, galleon, hangoverThrob, hotDrink,
  hotshotTracer, impactMarker, meltPuddle, moltenBall, numbHaze, shipAnchor, shotPellet,
  unstableCore,
} from './MagmaPirateVisuals';
import type { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { CelebrationFx, candyPool, wrappedCandy, RAINBOW } from './skins/CelebrationFx';

type Owner = 'player' | 'npc';

/** The rig a side wears: Magma's own pirate, or a skin's character that may share its hooks. */
type MagmaRig = BaseAvatar & Partial<Pick<MagmaAvatar, 'setVenting' | 'setHelm' | 'setPendant'>>;

/**
 * Magma — a pirate made of the melt, and everything he carries is loaded.
 *
 * Click  Blunderblast   a real spread of small pellets; the recoil only throws him when the
 *                       shot comes straight out of a dodge.
 * E      Hotshot        two flaming flintlocks: the next two clicks are hitscan, then back to
 *                       the blunderbuss.
 * R      Nice Hot Drink five seconds numb — no damage, no slows, no stuns — and then 80% of
 *                       what he did not feel arrives as one burn.
 * F      Unstable Core  clamped to somebody close. It takes every point they take; at zero it
 *                       erupts on them for five seconds and then goes off.
 * Q      Limoncello     melts into the floor and comes up on a galleon across the top of the
 *                       arena: three cannons lit by hand, each covering a third of the field,
 *                       and an anchor on a chain that a blunderblast turns into a tetherball.
 *
 * Every point of damage goes through `strike`. Everything the kit parks on a Fighter (the one
 * absorber, the `unstoppable` latch) is handed back in `reset`.
 */

const ARENA_PAD = 32;

// ── Lava on the floor ──
const POOL_R = 26;
const POOL_LIFE_MS = 5000;
/** Burn for anything standing in a pool. Overlap is a maximum, never a sum. */
const POOL_DPS = 24;
const MAX_POOLS = 40;

// ── Click: Blunderblast ──
const BLUNDER_CHARGES = 2;
const BLUNDER_RECHARGE_MS = 3000;
const BLUNDER_TAP_MS = 300;
const PELLETS = 8;
/** Half-angle of the spread. */
const PELLET_SPREAD = 0.27;
const PELLET_SPEED = 640;
const PELLET_RANGE = 310;
const PELLET_DMG = 4;
const PELLET_HIT_R = 20;
const PELLET_SHOVE = 16;
/** How long after a dodge starts the next blast still kicks. */
const KICK_WINDOW_MS = 700;
const KICK_DIST = 240;
const KICK_MS = 380;
/** A bot cannot press Space, so a point-blank blast stands in for the roll-shot, this often. */
const NPC_KICK_RANGE = 150;
const NPC_KICK_GAP_MS = 3500;
const MAX_PELLETS = 96;

// ── E: Hotshot ──
const HOTSHOT_ROUNDS = 2;
const HOTSHOT_DMG = 26;
const HOTSHOT_RANGE = 900;
/** How far off the line a body can be and still be hit. */
const HOTSHOT_HIT_R = 20;
const HOTSHOT_SHOVE = 30;

// ── R: Nice Hot Drink ──
const NUMB_MS = 5000;
/** The pain comes back with a fifth taken off. */
const HANGOVER_SHARE = 0.8;
const HANGOVER_MS = 4000;
const CHUG_MS = 520;

// ── F: Unstable Core ──
const CORE_RANGE = 120;
const CORE_HP = 100;
const CORE_ERUPT_MS = 5000;
const CORE_BURN_DPS = 10;
const CORE_POOL_MS = 650;
const CORE_POOL_R = 24;
const CORE_POOL_LIFE_MS = 3800;
const CORE_ROCK_MS = 240;
const CORE_BLAST_DMG = 45;
const CORE_BLAST_R = 130;
const CORE_BLAST_SHOVE = 110;
const ROCK_SPEED = 230;
const ROCK_DMG = 9;
const ROCK_LIFE_MS = 2200;
const ROCK_HIT_R = 22;
const MAX_ROCKS = 70;

// ── Q: Limoncello ──
const MELT_MS = 480;
const RISE_MS = 520;
const SHIP_W = 440;
const SHIP_H = 104;
const SHIP_HP = 200;
/** The hull burns itself down slowly, so a ship nobody shoots at still ends. */
const SHIP_DECAY_PER_S = 4;
const CANNONS = 3;
/** Deck positions of the three guns, in ship-local units (bow to the right). */
const CANNON_AT: Array<[number, number]> = [[-132, 33], [0, 37], [128, 31]];
/** How close the cursor has to be to a gun for the click to mean "light it". */
const CANNON_CLICK_R = 44;
/** …and how close the pirate has to be standing to reach the fuse. */
const CANNON_REACH = 130;
const CANNON_FUSE_MS = 600;
const CANNON_RELOAD_MS = 3200;
const BALL_FLIGHT_MS = 850;
const BALL_DMG = 36;
const BALL_R = 64;
const BALL_SHOVE = 120;
const BALL_POOLS = 3;
/** Where the chain leaves the hull, and where the anchor bites, in ship-local units. */
const HAWSE_AT: [number, number] = [172, 30];
const ANCHOR_REST: [number, number] = [250, 150];
const CHAIN_LEN = 380;
const ANCHOR_R = 26;
const ANCHOR_HIT_R = 32;
const ANCHOR_DMG = 24;
const ANCHOR_SHOVE = 130;
/** Speed a single pellet puts into the anchor. */
const ANCHOR_PELLET_KICK = 190;
const ANCHOR_MAX_SPEED = 950;
const ANCHOR_MIN_HIT_SPEED = 170;
const ANCHOR_FLY_MS = 2600;
const ANCHOR_HIT_GAP_MS = 600;
const ANCHOR_REEL_SPEED = 560;

const SHOVE_MS = 260;

// ── World objects ────────────────────────────────────────────────────────────

interface Pool {
  owner: Owner;
  x: number;
  y: number;
  born: number;
  until: number;
  r: number;
  life: number;
  seed: number;
}

interface Pellet {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  until: number;
  seed: number;
}

/** A chunk thrown out by an erupting core. `skip` is the body wearing that core. */
interface Rock {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  seed: number;
  spin: number;
  skip: Fighter | null;
}

interface Core {
  owner: Owner;
  host: Fighter;
  hp: number;
  /** The host's health last frame — what it has lost since is what the core takes. */
  lastHp: number;
  /** 0 until the shell is gone. */
  eruptFrom: number;
  eruptUntil: number;
  nextPoolAt: number;
  nextRockAt: number;
  rockAng: number;
  burnAcc: number;
  flashUntil: number;
  seed: number;
}

interface Cannon {
  /** When she is loaded again. */
  readyAt: number;
  /** 0 while unlit, else when the fuse reaches the powder. */
  fuseFrom: number;
  fireAt: number;
  /** When she last fired, for the recoil. */
  firedAt: number;
  /** Where the muzzle is pointing, eased toward whatever she would hit. */
  ang: number;
}

interface Ball {
  owner: Owner;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  from: number;
  landAt: number;
  seed: number;
}

interface Anchor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'rest' | 'fly' | 'reel';
  flyUntil: number;
  ang: number;
  hitAt: Map<Fighter, number>;
}

interface Ship {
  owner: Owner;
  x: number;
  y: number;
  hp: number;
  seed: number;
  riseFrom: number;
  flashUntil: number;
  cannons: Cannon[];
  anchor: Anchor;
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

  // Blunderblast
  blunderCharges: number;
  /** When the next charge comes back. Only one is ever in flight. */
  blunderRechargeAt: number;
  /** When the gun last went off, for the muzzle flash. */
  shotAt: number;
  shotAng: number;
  /** The dodge this side has already spent its kick on (the dodge's own timestamp). */
  kickSpent: number;
  npcKickAt: number;
  /** The recoil, played out as position. 0 while the pirate is on his feet. */
  flyUntil: number;
  flyFrom: number;
  flyX0: number;
  flyY0: number;
  flyAng: number;

  // Hotshot
  hotRounds: number;
  /** Per pistol: when it fired, for its flash. */
  hotFiredAt: [number, number];

  // Nice Hot Drink
  chugFrom: number;
  numbUntil: number;
  /** What he has not felt yet. */
  numbBank: number;
  /** Whether the `unstoppable` latch is ours right now, and what it was before. */
  numbLive: boolean;
  hadUnstoppable: boolean;
  /** The bill: what is still owed, and how fast it is being paid. */
  hangLeft: number;
  hangRate: number;
  hangTotal: number;
  hangAcc: number;

  // Limoncello
  meltFrom: number;
  meltUntil: number;
  meltX: number;
  meltY: number;
  ship: Ship | null;

  /** The one absorber this kit installs, and whatever was there before it. */
  absorber: ((amount: number) => boolean) | null;
  savedAbsorber: ((amount: number) => boolean) | null;

  /** Cursor this side is driving — the real one for the player, a phantom for the npc. */
  curX: number;
  curY: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    blunderCharges: BLUNDER_CHARGES,
    blunderRechargeAt: 0,
    shotAt: -9999,
    shotAng: 0,
    kickSpent: -9999,
    npcKickAt: 0,
    flyUntil: 0,
    flyFrom: 0,
    flyX0: 0,
    flyY0: 0,
    flyAng: 0,
    hotRounds: 0,
    hotFiredAt: [-9999, -9999],
    chugFrom: -9999,
    numbUntil: 0,
    numbBank: 0,
    numbLive: false,
    hadUnstoppable: false,
    hangLeft: 0,
    hangRate: 0,
    hangTotal: 0,
    hangAcc: 0,
    meltFrom: 0,
    meltUntil: 0,
    meltX: 0,
    meltY: 0,
    ship: null,
    absorber: null,
    savedAbsorber: null,
    curX: 0,
    curY: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface MagmaArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** Everything in the air. The galleon's hull stops enemy shots. */
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
  /** `scene.time.now` of the player's last dodge — a Blunderblast straight out of it kicks. */
  get lastDodgeAt(): number;
  /** Skins: maps a Magma visual colour through that side's equipped skin. */
  magmaColor(owner: Owner, base: number): number;
  /** Skins: the equipped skin id on that side, for the skins that redraw Magma's abilities. */
  skinId(owner: Owner): string | null;
  spawnHitFlash(x: number, y: number, color: number): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** The tray card showing this ability, if there is one — the click's charge pips sit on it. */
  barFor(abilityId: string): { fill: Phaser.GameObjects.Rectangle; maxWidth: number } | undefined;
}

// ── MagmaKit ─────────────────────────────────────────────────────────────────

export class MagmaKit {
  private api: MagmaArenaApi;

  // ── Visuals ──
  private readonly pcol: MagmaColorFn;
  private readonly ncol: MagmaColorFn;
  private readonly pfx: MagmaFx;
  private readonly nfx: MagmaFx;
  private playerAvatar: MagmaRig | null = null;
  private npcAvatar: MagmaRig | null = null;
  /** Celebration skin: confetti and candy one-shots, drawn in its own colours. */
  private readonly cfx: CelebrationFx;
  /** Lava on the floor. Under the fighters — you stand *in* it. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The galleon's hull, deck and guns: over the lava, under the fighters who walk on it. */
  private hullGfx: Phaser.GameObjects.Graphics | null = null;
  /** Rigging, the anchor, and everything in the air. Over the fighters. */
  private objGfx: Phaser.GameObjects.Graphics | null = null;
  /** What is in hand or on a body: guns, the tankard, numbness, cores and their gauges. */
  private toolGfx: Phaser.GameObjects.Graphics | null = null;
  /** The click card's charge pips and cell divider, on the ability tray. */
  private trayGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private pools: Pool[] = [];
  private pellets: Pellet[] = [];
  private rocks: Rock[] = [];
  private cores: Core[] = [];
  private balls: Ball[] = [];
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
    this.cfx = new CelebrationFx(api.scene);
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

  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => f && f.active && f.hp > 0);
  }

  /** Whoever this side is aiming at. */
  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') return this.alive(this.api.player) ? this.api.player : null;
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return this.alive(t) ? t : null;
  }

  /** True when that side wears the Celebration skin — the art below branches on it, never the play. */
  private party(owner: Owner): boolean {
    return this.api.skinId(owner) === 'celebration';
  }

  private makeAvatar(owner: Owner): MagmaRig {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene) ?? new MagmaAvatar(this.api.scene, this.col(owner));
  }

  private avatar(owner: Owner): MagmaRig | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** The one way the kit ever hurts a body. */
  private strike(_owner: Owner, t: Fighter, amount: number, opts?: Parameters<Fighter['takeDamage']>[1]): void {
    if (amount > 0) t.takeDamage(amount, opts);
  }

  private aimAng(owner: Owner): number {
    const s = this.side(owner);
    const f = this.fighter(owner);
    return Math.atan2(s.curY - f.y, s.curX - f.x);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything parked on a Fighter has to be handed back, or the next match starts with an
    // absorber pointing at a ship that no longer exists.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (!f) continue;
      if (s.absorber && f.damageAbsorber === s.absorber) f.damageAbsorber = s.savedAbsorber;
      if (s.numbLive) f.unstoppable = s.hadUnstoppable;
    }

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.pools = [];
    this.pellets = [];
    this.rocks = [];
    this.cores = [];
    this.balls = [];
    this.shoves = [];
    this.burnAccum.clear();
    this.vizT = 0;
    this.aimX = 0;
    this.aimY = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.hullGfx?.destroy(); this.hullGfx = null;
    this.objGfx?.destroy(); this.objGfx = null;
    this.toolGfx?.destroy(); this.toolGfx = null;
    this.trayGfx?.destroy(); this.trayGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(_time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'magma') return;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    if (clicked) p.castAbility('magma-blunder', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('magma-hotshot', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('magma-drink', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('magma-core', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('magma-limoncello', ctx);
  }

  // ── Click: Blunderblast ────────────────────────────────────────────────────

  /**
   * Whether the blast about to be fired kicks. For the player that is a dodge inside the last
   * 700ms that has not already paid for a kick. A bot has no Space bar, so its point-blank
   * blast stands in for the roll-shot on a clock of its own. A replica never kicks here — its
   * position is whatever its own machine says.
   */
  private kickArmed(owner: Owner): boolean {
    const f = this.fighter(owner);
    if (!f || f.netGhost) return false;
    const s = this.side(owner);
    if (owner === 'player') {
      const at = this.api.lastDodgeAt;
      return at !== s.kickSpent && this.now - at <= KICK_WINDOW_MS;
    }
    const e = this.enemyOf(owner);
    return !!e && this.now >= s.npcKickAt
      && Phaser.Math.Distance.Between(f.x, f.y, e.x, e.y) <= NPC_KICK_RANGE;
  }

  /**
   * Click. Three things share the button, in this order: a gun on the deck under the cursor is
   * lit; a drawn flintlock is fired; otherwise the blunderbuss goes off.
   */
  doBlunder(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.meltUntil > this.now) return;

    if (this.tryLightCannon(owner, tx, ty)) return;
    if (s.hotRounds > 0) { this.fireHotshot(owner, tx, ty); return; }
    if (s.blunderCharges <= 0) return;

    // Only one charge is ever reloading; the clock starts on the shot that broke the stack.
    if (s.blunderCharges >= BLUNDER_CHARGES) s.blunderRechargeAt = this.now + BLUNDER_RECHARGE_MS;
    s.blunderCharges--;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const fx = this.fx(owner);
    this.avatar(owner)?.play('punch', ang);
    s.shotAt = this.now;
    s.shotAng = ang;

    // The spread: evenly fanned and then jittered, so it is a pattern with holes in it rather
    // than either a perfect comb or a lottery. The jitter is seeded off the aim point, not
    // rolled: online, both machines replay the same click and must throw the same pattern, or
    // the anchor one of them knocked loose would fly somewhere else on the other.
    const mx = f.x + Math.cos(ang) * 24;
    const my = f.y + Math.sin(ang) * 24;
    const roll = Math.round(tx) * 0.731 + Math.round(ty) * 0.317;
    for (let i = 0; i < PELLETS; i++) {
      const lane = (i / (PELLETS - 1)) * 2 - 1;
      const a = ang + lane * PELLET_SPREAD + (noise(roll, i) - 0.5) * 0.09;
      const speed = PELLET_SPEED * (0.86 + noise(roll, 40 + i) * 0.28);
      this.pellets.push({
        owner, x: mx, y: my,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        born: this.now,
        until: this.now + (PELLET_RANGE / speed) * 1000,
        seed: Math.random() * 999,
      });
    }
    while (this.pellets.length > MAX_PELLETS) this.pellets.shift();

    fx.ember(mx, my, 8, 30, 380, MAG.gold);
    fx.smoke(mx, my, 4, 620);
    if (this.party(owner)) this.cfx.confettiBurst(f.x + Math.cos(ang) * 40, f.y + Math.sin(ang) * 40, 50);
    Sfx.playAt('explosion-small', f.x, { volume: 0.7, rate: 1.05 });

    // ── The kick: only straight out of a dodge ──
    if (!this.kickArmed(owner)) {
      this.api.scene.cameras.main.shake(90, 0.003);
      return;
    }
    if (owner === 'player') s.kickSpent = this.api.lastDodgeAt;
    else s.npcKickAt = this.now + NPC_KICK_GAP_MS;
    s.flyFrom = this.now;
    s.flyUntil = this.now + KICK_MS;
    s.flyX0 = f.x;
    s.flyY0 = f.y;
    s.flyAng = ang + Math.PI;
    this.avatar(owner)?.setVenting?.(true);
    fx.shock(f.x, f.y, 10, 58, MAG.gold, 380);
    fx.erupt(mx, my, 34, MAG.white);
    this.api.scene.cameras.main.shake(160, 0.005);
  }

  /** The recoil, played out as position so neither movement system can erase it. */
  private updateFly(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.flyUntil <= 0) return;
    const f = this.fighter(owner);
    if (s.flyUntil <= time || !this.alive(f) || f.netGhost) { s.flyUntil = 0; return; }
    const u = Phaser.Math.Clamp((time - s.flyFrom) / KICK_MS, 0, 1);
    const ease = 1 - (1 - u) * (1 - u);
    f.setPosition(
      this.clampX(s.flyX0 + Math.cos(s.flyAng) * KICK_DIST * ease),
      this.clampY(s.flyY0 + Math.sin(s.flyAng) * KICK_DIST * ease),
    );
    (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.fx(owner).ember(f.x - Math.cos(s.flyAng) * 10, f.y - Math.sin(s.flyAng) * 10, 2, 14, 300, MAG.ember);
  }

  /** Charges come back one at a time. */
  private updateBlunder(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.blunderCharges < BLUNDER_CHARGES && time >= s.blunderRechargeAt) {
      s.blunderCharges++;
      if (s.blunderCharges < BLUNDER_CHARGES) s.blunderRechargeAt = time + BLUNDER_RECHARGE_MS;
    }
  }

  private updatePellets(time: number, dt: number): void {
    if (!this.pellets.length) return;
    const gone = new Set<Pellet>();
    for (const p of this.pellets) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (time >= p.until || p.x < this.left - 10 || p.x > this.right + 10
        || p.y < this.top - 10 || p.y > this.bottom + 10) {
        gone.add(p);
        continue;
      }
      // The anchor first: it is the one thing on the field that is *meant* to be shot.
      const anchor = this.side(p.owner).ship?.anchor;
      if (anchor && this.shipUp(p.owner)
        && Phaser.Math.Distance.Between(p.x, p.y, anchor.x, anchor.y) <= ANCHOR_R) {
        this.knockAnchor(p.owner, anchor, p.vx, p.vy);
        gone.add(p);
        continue;
      }
      const victim = this.targetsOf(p.owner)
        .find((t) => Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= PELLET_HIT_R);
      if (!victim) continue;
      this.strike(p.owner, victim, PELLET_DMG);
      this.api.spawnHitFlash(victim.x, victim.y, this.col(p.owner)(MAG.lava));
      this.shove(victim, Math.atan2(p.vy, p.vx), PELLET_SHOVE);
      this.fx(p.owner).ember(p.x, p.y, 3, 12, 300);
      gone.add(p);
    }
    if (gone.size) this.pellets = this.pellets.filter((p) => !gone.has(p));
  }

  // ── E: Hotshot ─────────────────────────────────────────────────────────────

  /** E — draw both pistols. The next two clicks are theirs. */
  doHotshot(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.meltUntil > this.now) return;
    s.hotRounds = HOTSHOT_ROUNDS;
    s.hotFiredAt = [-9999, -9999];
    this.avatar(owner)?.play('flex');
    const fx = this.fx(owner);
    fx.ember(f.x, f.y - 4, 10, 30, 520, MAG.gold);
    fx.shock(f.x, f.y, 8, 40, MAG.lava, 320);
  }

  /** One flintlock: a line from the pirate through the cursor, and the first body on it. */
  private fireHotshot(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    // Right hand first, then the left.
    const hand: 0 | 1 = s.hotRounds === HOTSHOT_ROUNDS ? 1 : 0;
    s.hotRounds--;
    s.hotFiredAt[hand] = this.now;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const c = Math.cos(ang), sn = Math.sin(ang);
    const from = this.avatar(owner)?.handPos(hand) ?? { x: f.x, y: f.y };

    // How far the line runs before it leaves the arena.
    let reach = HOTSHOT_RANGE;
    if (c > 0.0001) reach = Math.min(reach, (this.right - f.x) / c);
    if (c < -0.0001) reach = Math.min(reach, (this.left - f.x) / c);
    if (sn > 0.0001) reach = Math.min(reach, (this.bottom - f.y) / sn);
    if (sn < -0.0001) reach = Math.min(reach, (this.top - f.y) / sn);
    reach = Math.max(20, reach);

    let hit: Fighter | null = null;
    let hitAt = reach;
    for (const t of this.targetsOf(owner)) {
      const along = (t.x - f.x) * c + (t.y - f.y) * sn;
      if (along < 0 || along > hitAt) continue;
      const off = Math.abs(-(t.x - f.x) * sn + (t.y - f.y) * c);
      if (off > HOTSHOT_HIT_R) continue;
      hit = t;
      hitAt = along;
    }
    const ex = f.x + c * hitAt;
    const ey = f.y + sn * hitAt;

    const tint = this.col(owner);
    const fx = this.fx(owner);
    fx.anim(9, 200, (g, u) => hotshotTracer(g, tint, from.x, from.y, ex, ey, u));
    fx.ember(ex, ey, 7, 22, 420, MAG.gold);
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('explosion-small', f.x, { volume: 0.6, rate: 1.5 });
    this.api.scene.cameras.main.shake(70, 0.003);

    if (hit) {
      this.strike(owner, hit, HOTSHOT_DMG);
      this.api.spawnHitFlash(hit.x, hit.y, tint(MAG.white));
      this.shove(hit, ang, HOTSHOT_SHOVE);
      fx.erupt(ex, ey, 22, MAG.gold);
    }
  }

  // ── R: Nice Hot Drink ──────────────────────────────────────────────────────

  /**
   * The kit's one absorber, installed the first time a side needs it and left on until
   * `reset`. Numbness swallows the hit and banks it; failing that, a pirate standing on his own
   * deck has the hull take it; failing that, whoever was there before us gets their say — so
   * nothing this kit does can shadow another kit's absorber.
   */
  private ensureAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || (s.absorber && f.damageAbsorber === s.absorber)) return;
    const saved = f.damageAbsorber;
    // Looked up through `this.side` rather than captured, so a restart that rebuilds the side
    // objects can never leave a live closure pointing at a dead drink.
    const absorber = (amount: number): boolean => {
      const st = this.side(owner);
      if (st.numbUntil > this.now) {
        st.numbBank += amount;
        const me = this.fighter(owner);
        this.fx(owner).ember(me.x, me.y, 4, 24, 380, PIR.numb);
        return true;
      }
      if (st.ship && this.aboard(owner, this.fighter(owner))) {
        this.hurtShip(st.ship, amount);
        return true;
      }
      return saved ? saved(amount) : false;
    };
    s.absorber = absorber;
    s.savedAbsorber = saved;
    f.damageAbsorber = absorber;
  }

  /** R — down it in one. */
  doDrink(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.meltUntil > this.now) return;
    s.chugFrom = this.now;
    s.numbUntil = this.now + NUMB_MS;
    s.numbBank = 0;
    this.ensureAbsorber(owner);
    this.avatar(owner)?.play('raise');
    const fx = this.fx(owner);
    fx.ember(f.x, f.y - 10, 12, 30, 640, MAG.gold);
    fx.shock(f.x, f.y, 10, 46, PIR.numb, 460);
  }

  /** Numbness while it lasts, then the bill. */
  private updateDrink(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;

    const numb = s.numbUntil > time && this.alive(f);
    if (numb) {
      // "No slowing or stunning effects": the game's one flag for exactly that. Latched and
      // re-asserted every frame, and handed back as we found it.
      if (!s.numbLive) {
        s.numbLive = true;
        s.hadUnstoppable = f.unstoppable;
        if (!f.netGhost) f.stunnedUntil = 0;
      }
      f.unstoppable = true;
    } else if (s.numbLive) {
      s.numbLive = false;
      f.unstoppable = s.hadUnstoppable;
      s.numbUntil = 0;
      // Everything he did not feel, less a fifth, all at once — as a burn.
      const owed = Math.round(s.numbBank * HANGOVER_SHARE);
      s.numbBank = 0;
      if (owed > 0 && this.alive(f)) {
        s.hangLeft += owed;
        s.hangTotal = s.hangLeft;
        s.hangRate = s.hangLeft / (HANGOVER_MS / 1000);
        this.fx(owner).shock(f.x, f.y, 44, 14, MAG.pendantLit, 420);
        this.fx(owner).smoke(f.x, f.y - 10, 5, 800);
      }
    }

    if (s.hangLeft <= 0) return;
    if (!this.alive(f)) { s.hangLeft = 0; s.hangAcc = 0; return; }
    const pay = Math.min(s.hangLeft, s.hangRate * dt);
    s.hangLeft -= pay;
    s.hangAcc += pay;
    if (s.hangLeft <= 0.001) { s.hangAcc = Math.round(s.hangAcc); s.hangLeft = 0; }
    const whole = Math.floor(s.hangAcc);
    if (whole <= 0) return;
    s.hangAcc -= whole;
    // The number was already through every mitigation when it was banked, so it is paid as
    // computed, straight to health: no second armour pass, and no shield (or second drink)
    // gets to swallow it again. A replica is charged by its own machine, not this one.
    if (!f.netGhost) f.takeDamage(whole, { netApplied: true, pierce: true });
  }

  // ── F: Unstable Core ───────────────────────────────────────────────────────

  /** F — clamp a core on the nearest body inside arm's reach. A whiff costs nothing. */
  doCore(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.meltUntil > this.now) return;
    let host: Fighter | null = null;
    let best = CORE_RANGE;
    for (const t of this.targetsOf(owner)) {
      if (this.cores.some((c) => c.host === t && c.owner === owner)) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > best) continue;
      best = d;
      host = t;
    }
    const fx = this.fx(owner);
    if (!host) {
      f.resetCooldown('magma-core');
      fx.smoke(f.x, f.y, 3, 500);
      return;
    }
    this.cores.push({
      owner, host, hp: CORE_HP, lastHp: host.hp,
      eruptFrom: 0, eruptUntil: 0, nextPoolAt: 0, nextRockAt: 0,
      rockAng: Math.random() * Math.PI * 2, burnAcc: 0, flashUntil: 0,
      seed: Math.random() * 999,
    });
    this.avatar(owner)?.play('slam', Math.atan2(host.y - f.y, host.x - f.x));
    fx.shock(host.x, host.y, 34, 12, MAG.gold, 300);
    fx.ember(host.x, host.y, 10, 26, 520);
    this.api.spawnHitFlash(host.x, host.y, this.col(owner)(MAG.gold));
  }

  /** Where a core rides on whoever is wearing it. */
  private corePos(c: Core): { x: number; y: number } {
    return { x: c.host.x, y: c.host.y - 30 };
  }

  private updateCores(time: number, dt: number): void {
    if (!this.cores.length) return;
    for (const c of [...this.cores]) {
      const h = c.host;
      if (!this.alive(h)) { this.cores = this.cores.filter((o) => o !== c); continue; }
      const fx = this.fx(c.owner);
      const at = this.corePos(c);
      // Whatever the host lost since last frame, from anybody, the core lost too.
      const lost = Math.max(0, c.lastHp - h.hp);

      if (c.eruptUntil <= 0) {
        c.lastHp = h.hp;
        if (lost > 0) {
          c.hp -= lost;
          c.flashUntil = time + 110;
          fx.ember(at.x, at.y, Math.min(8, 1 + Math.round(lost / 3)), 16, 380, MAG.gold);
        }
        if (c.hp <= 0) {
          c.hp = 0;
          c.eruptFrom = time;
          c.eruptUntil = time + CORE_ERUPT_MS;
          c.nextPoolAt = time;
          c.nextRockAt = time + 120;
          fx.erupt(at.x, at.y, 46, MAG.white);
          fx.shock(at.x, at.y, 12, 70, MAG.gold, 460);
          Sfx.playAt('explosion-small', at.x, { volume: 0.75, rate: 0.8 });
          this.api.scene.cameras.main.shake(160, 0.005);
        }
        continue;
      }

      if (time >= c.eruptUntil) {
        this.coreBlast(c);
        this.cores = this.cores.filter((o) => o !== c);
        continue;
      }

      // Erupting: a steady burn on the host…
      c.burnAcc += CORE_BURN_DPS * dt;
      const whole = Math.floor(c.burnAcc);
      if (whole > 0) {
        c.burnAcc -= whole;
        this.strike(c.owner, h, whole);
      }
      // …lava wherever they are standing…
      if (time >= c.nextPoolAt) {
        c.nextPoolAt = time + CORE_POOL_MS;
        this.addPool(c.owner, h.x, h.y, CORE_POOL_R, CORE_POOL_LIFE_MS);
      }
      // …and rock thrown out in a turning spray.
      if (time >= c.nextRockAt) {
        c.nextRockAt = time + CORE_ROCK_MS;
        c.rockAng += 2.39996;
        const a = c.rockAng + (Math.random() - 0.5) * 0.4;
        this.rocks.push({
          owner: c.owner, x: at.x + Math.cos(a) * 10, y: at.y + Math.sin(a) * 10,
          vx: Math.cos(a) * ROCK_SPEED, vy: Math.sin(a) * ROCK_SPEED,
          until: time + ROCK_LIFE_MS, seed: Math.random() * 999,
          spin: Math.random() * Math.PI * 2, skip: h,
        });
        while (this.rocks.length > MAX_ROCKS) this.rocks.shift();
        fx.ember(at.x, at.y, 2, 12, 300, MAG.gold);
      }
    }
  }

  /** The end of an eruption: the host and anyone standing near them. */
  private coreBlast(c: Core): void {
    const h = c.host;
    const fx = this.fx(c.owner);
    fx.erupt(h.x, h.y, CORE_BLAST_R * 0.8, MAG.magma);
    fx.shock(h.x, h.y, 18, CORE_BLAST_R, MAG.white, 620);
    fx.crack(h.x, h.y, CORE_BLAST_R * 0.6);
    fx.smoke(h.x, h.y, 12, 1200);
    if (this.party(c.owner)) this.cfx.confettiBurst(h.x, h.y, CORE_BLAST_R * 0.8);
    Sfx.playAt('explosion-large', h.x, { volume: 0.85, rate: 0.95 });
    this.api.scene.cameras.main.shake(320, 0.01);
    for (const t of this.targetsOf(c.owner)) {
      if (t !== h && Phaser.Math.Distance.Between(h.x, h.y, t.x, t.y) > CORE_BLAST_R) continue;
      this.strike(c.owner, t, CORE_BLAST_DMG, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, this.col(c.owner)(MAG.white));
      if (t !== h) this.shove(t, Math.atan2(t.y - h.y, t.x - h.x), CORE_BLAST_SHOVE);
    }
    this.addPool(c.owner, h.x, h.y, POOL_R, POOL_LIFE_MS);
  }

  private updateRocks(time: number, dt: number): void {
    if (!this.rocks.length) return;
    const gone = new Set<Rock>();
    for (const r of this.rocks) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.spin += dt * 6;
      if (time >= r.until || r.x < this.left - 20 || r.x > this.right + 20
        || r.y < this.top - 20 || r.y > this.bottom + 20) {
        gone.add(r);
        continue;
      }
      const victim = this.targetsOf(r.owner)
        .find((t) => t !== r.skip && Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) <= ROCK_HIT_R);
      if (!victim) continue;
      this.strike(r.owner, victim, ROCK_DMG);
      this.api.spawnHitFlash(victim.x, victim.y, this.col(r.owner)(MAG.magma));
      this.fx(r.owner).ember(r.x, r.y, 5, 18, 480);
      gone.add(r);
    }
    if (gone.size) this.rocks = this.rocks.filter((r) => !gone.has(r));
  }

  // ── Lava on the floor ──────────────────────────────────────────────────────

  private addPool(owner: Owner, x: number, y: number, r: number, life: number): void {
    const px = this.clampX(x), py = this.clampY(y);
    this.pools.push({ owner, x: px, y: py, born: this.now, until: this.now + life, r, life, seed: Math.random() * 999 });
    while (this.pools.length > MAX_POOLS) this.pools.shift();
    const fx = this.fx(owner);
    fx.splat(px, py, r * 0.9);
    if (this.party(owner)) this.cfx.sprinkleSplat(px, py, r * 0.9);
  }

  private updatePools(time: number, dt: number): void {
    if (!this.pools.length && !this.burnAccum.size) return;
    this.pools = this.pools.filter((p) => time < p.until);

    // Burn: taken as a maximum across every pool touching a body, never a sum.
    const burn = new Map<Fighter, Owner>();
    for (const p of this.pools) {
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > p.r) continue;
        burn.set(t, p.owner);
      }
    }
    for (const [t, owner] of burn) {
      const acc = (this.burnAccum.get(t) ?? 0) + POOL_DPS * dt;
      const whole = Math.floor(acc);
      this.burnAccum.set(t, acc - whole);
      if (whole > 0) {
        this.strike(owner, t, whole);
        if (Math.random() < 0.3) this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.lava));
      }
    }
    // Anything that stepped off loses its part-tick rather than banking it.
    for (const t of [...this.burnAccum.keys()]) if (!burn.has(t)) this.burnAccum.delete(t);
  }

  // ── Q: Limoncello ──────────────────────────────────────────────────────────

  /** Across the top of the screen — of whatever the camera is showing when she comes up. */
  private shipCentre(): { x: number; y: number } {
    const cam = this.api.scene.cameras.main;
    return { x: cam.scrollX + this.api.width / 2, y: cam.scrollY + this.top + SHIP_H / 2 + 14 };
  }

  /** The ship exists and has finished coming up. */
  private shipUp(owner: Owner): boolean {
    const ship = this.side(owner).ship;
    return !!ship && this.now >= ship.riseFrom + RISE_MS;
  }

  private onDeck(ship: Ship, x: number, y: number): boolean {
    return Math.abs(x - ship.x) <= SHIP_W / 2 - 10 && Math.abs(y - ship.y) <= SHIP_H / 2 - 2;
  }

  /** Standing on your own deck — the only definition of "aboard" there is. Walk off and you are not. */
  private aboard(owner: Owner, f: Fighter | null): boolean {
    const ship = this.side(owner).ship;
    return !!ship && !!f && this.shipUp(owner) && this.onDeck(ship, f.x, f.y);
  }

  private cannonPos(ship: Ship, i: number): { x: number; y: number } {
    return { x: ship.x + CANNON_AT[i][0], y: ship.y + CANNON_AT[i][1] };
  }

  /**
   * What gun `i` would hit if it went off now. Each gun owns a third of the arena's width:
   * the nearest enemy inside its third, or failing that the middle of it.
   */
  private cannonTarget(owner: Owner, ship: Ship, i: number): { x: number; y: number; live: boolean } {
    const w = (this.right - this.left) / CANNONS;
    const x0 = this.left + w * i;
    const from = this.cannonPos(ship, i);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      if (t.x < x0 || t.x > x0 + w) continue;
      const d = Phaser.Math.Distance.Between(from.x, from.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (best) return { x: best.x, y: best.y, live: true };
    return { x: x0 + w / 2, y: this.clampY(ship.y + 300), live: false };
  }

  /** Q — into the floor, and up again on the ship. Refused (and refunded) while one is afloat. */
  doLimoncello(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f) return;
    if (s.ship || s.meltUntil > this.now) { f.resetCooldown('magma-limoncello'); return; }
    s.meltFrom = this.now;
    s.meltUntil = this.now + MELT_MS;
    s.meltX = f.x;
    s.meltY = f.y;
    s.flyUntil = 0;
    this.avatar(owner)?.play('raise');
    const fx = this.fx(owner);
    fx.splat(f.x, f.y, 30);
    fx.ember(f.x, f.y, 12, 30, 520, MAG.gold);
  }

  private updateMelt(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.meltUntil <= 0) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.meltUntil = 0; return; }
    if (time < s.meltUntil) {
      // Rooted while he goes under. A replica's position is not ours to write.
      if (!f.netGhost) {
        f.setPosition(s.meltX, s.meltY);
        (f.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      return;
    }
    s.meltUntil = 0;
    const at = this.shipCentre();
    const anchorX = this.clampX(at.x + ANCHOR_REST[0]);
    const anchorY = this.clampY(at.y + ANCHOR_REST[1]);
    s.ship = {
      owner, x: at.x, y: at.y, hp: SHIP_HP, seed: Math.random() * 999,
      riseFrom: time, flashUntil: 0,
      cannons: CANNON_AT.map(() => ({ readyAt: time + RISE_MS, fuseFrom: 0, fireAt: 0, firedAt: -9999, ang: Math.PI / 2 })),
      anchor: { x: anchorX, y: anchorY, vx: 0, vy: 0, state: 'rest', flyUntil: 0, ang: Math.PI / 2, hitAt: new Map() },
    };
    this.ensureAbsorber(owner);
    if (!f.netGhost) {
      (f.body as Phaser.Physics.Arcade.Body).reset(at.x - 40, at.y);
    }
    const fx = this.fx(owner);
    fx.erupt(at.x, at.y, 120, MAG.magma);
    fx.shock(at.x, at.y, 30, SHIP_W * 0.56, MAG.gold, 700);
    fx.smoke(at.x, at.y, 14, 1300);
    fx.splat(s.meltX, s.meltY, 34);
    Sfx.playAt('explosion-large', at.x, { volume: 0.8, rate: 0.75 });
    this.api.scene.cameras.main.shake(360, 0.009);
  }

  private hurtShip(ship: Ship, amount: number): void {
    if (amount <= 0) return;
    ship.hp -= amount;
    ship.flashUntil = this.now + 110;
    this.fx(ship.owner).ember(
      ship.x + (Math.random() - 0.5) * SHIP_W * 0.7, ship.y + (Math.random() - 0.5) * SHIP_H * 0.6, 4, 16, 420);
  }

  /** Click with the cursor on a gun, standing close enough to reach it: the fuse is lit. */
  private tryLightCannon(owner: Owner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    const ship = s.ship;
    const f = this.fighter(owner);
    if (!ship || !f || !this.shipUp(owner)) return false;
    for (let i = 0; i < CANNONS; i++) {
      const at = this.cannonPos(ship, i);
      if (Phaser.Math.Distance.Between(tx, ty, at.x, at.y) > CANNON_CLICK_R) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, at.x, at.y) > CANNON_REACH) return false;
      const c = ship.cannons[i];
      // A click on a gun is never a blunderblast into your own deck, loaded or not.
      if (c.fuseFrom > 0 || this.now < c.readyAt) return true;
      c.fuseFrom = this.now;
      c.fireAt = this.now + CANNON_FUSE_MS;
      this.avatar(owner)?.play('punch', Math.atan2(at.y - f.y, at.x - f.x));
      this.fx(owner).ember(at.x - 10, at.y - 6, 5, 10, 300, MAG.white);
      return true;
    }
    return false;
  }

  private fireCannon(owner: Owner, ship: Ship, i: number, time: number): void {
    const c = ship.cannons[i];
    const at = this.cannonPos(ship, i);
    const aim = this.cannonTarget(owner, ship, i);
    const ang = Math.atan2(aim.y - at.y, aim.x - at.x);
    c.ang = ang;
    c.fuseFrom = 0;
    c.firedAt = time;
    c.readyAt = time + CANNON_RELOAD_MS;
    const mx = at.x + Math.cos(ang) * 28;
    const my = at.y + Math.sin(ang) * 28;
    this.balls.push({
      owner, x0: mx, y0: my, tx: this.clampX(aim.x), ty: this.clampY(aim.y),
      from: time, landAt: time + BALL_FLIGHT_MS, seed: Math.random() * 999,
    });
    const fx = this.fx(owner);
    fx.erupt(mx, my, 40, MAG.white);
    fx.smoke(mx, my, 8, 900);
    fx.shock(mx, my, 8, 46, MAG.gold, 320);
    Sfx.playAt('explosion-large', mx, { volume: 0.75, rate: 1.15 });
    this.api.scene.cameras.main.shake(150, 0.006);
  }

  private landBall(b: Ball): void {
    const fx = this.fx(b.owner);
    fx.erupt(b.tx, b.ty, BALL_R * 0.85, MAG.magma);
    fx.shock(b.tx, b.ty, 14, BALL_R, MAG.gold, 520);
    fx.crack(b.tx, b.ty, BALL_R * 0.6);
    fx.smoke(b.tx, b.ty, 8, 1000);
    if (this.party(b.owner)) this.cfx.confettiBurst(b.tx, b.ty, BALL_R);
    Sfx.playAt('explosion-large', b.tx, { volume: 0.8, rate: 1 });
    this.api.scene.cameras.main.shake(220, 0.008);
    for (const t of this.targetsOf(b.owner)) {
      if (Phaser.Math.Distance.Between(b.tx, b.ty, t.x, t.y) > BALL_R) continue;
      this.strike(b.owner, t, BALL_DMG, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, this.col(b.owner)(MAG.gold));
      this.shove(t, Math.atan2(t.y - b.ty, t.x - b.tx), BALL_SHOVE);
    }
    // What it leaves behind: one pool where it hit and the rest splashed round it.
    this.addPool(b.owner, b.tx, b.ty, POOL_R + 4, POOL_LIFE_MS);
    for (let i = 1; i < BALL_POOLS; i++) {
      const a = b.seed + (i / (BALL_POOLS - 1)) * Math.PI * 2 + Math.random() * 0.8;
      this.addPool(b.owner, b.tx + Math.cos(a) * 42, b.ty + Math.sin(a) * 34, POOL_R, POOL_LIFE_MS);
    }
  }

  private updateBalls(time: number): void {
    if (!this.balls.length) return;
    for (const b of this.balls) if (time >= b.landAt) this.landBall(b);
    this.balls = this.balls.filter((b) => time < b.landAt);
  }

  /** A pellet has found the anchor: it comes out of the floor and goes where the shot sent it. */
  private knockAnchor(owner: Owner, a: Anchor, vx: number, vy: number): void {
    const sp = Math.max(1, Math.hypot(vx, vy));
    if (a.state !== 'fly') {
      a.state = 'fly';
      a.flyUntil = this.now + ANCHOR_FLY_MS;
      a.hitAt.clear();
      this.fx(owner).crack(a.x, a.y, 30);
      this.fx(owner).erupt(a.x, a.y, 30, MAG.gold);
      Sfx.playAt('explosion-small', a.x, { volume: 0.7, rate: 0.7 });
    }
    a.vx += (vx / sp) * ANCHOR_PELLET_KICK;
    a.vy += (vy / sp) * ANCHOR_PELLET_KICK;
    const now = Math.hypot(a.vx, a.vy);
    if (now > ANCHOR_MAX_SPEED) { a.vx *= ANCHOR_MAX_SPEED / now; a.vy *= ANCHOR_MAX_SPEED / now; }
    this.fx(owner).ember(a.x, a.y, 4, 14, 320, MAG.white);
  }

  /**
   * The tetherball. Free flight under a little drag, inside the arena and inside the chain:
   * at the end of the chain the outward part of its velocity is taken off and the rest
   * carries it round the hawse in an arc. When it runs out of time or speed it is hauled home.
   */
  private updateAnchor(owner: Owner, ship: Ship, time: number, dt: number): void {
    const a = ship.anchor;
    const restX = this.clampX(ship.x + ANCHOR_REST[0]);
    const restY = this.clampY(ship.y + ANCHOR_REST[1]);
    if (a.state === 'rest') { a.x = restX; a.y = restY; a.vx = 0; a.vy = 0; return; }

    if (a.state === 'reel') {
      const d = Phaser.Math.Distance.Between(a.x, a.y, restX, restY);
      const step = ANCHOR_REEL_SPEED * dt;
      if (d <= step) {
        a.state = 'rest';
        a.x = restX; a.y = restY;
        this.fx(owner).crack(restX, restY, 24);
        this.fx(owner).ember(restX, restY, 6, 18, 420);
        return;
      }
      a.x += ((restX - a.x) / d) * step;
      a.y += ((restY - a.y) / d) * step;
      a.ang += dt * 9;
      return;
    }

    a.x += a.vx * dt;
    a.y += a.vy * dt;
    const drag = Math.max(0, 1 - 0.45 * dt);
    a.vx *= drag;
    a.vy *= drag;

    // The walls.
    if (a.x < this.left + ANCHOR_R) { a.x = this.left + ANCHOR_R; a.vx = Math.abs(a.vx) * 0.75; }
    if (a.x > this.right - ANCHOR_R) { a.x = this.right - ANCHOR_R; a.vx = -Math.abs(a.vx) * 0.75; }
    if (a.y < this.top + ANCHOR_R) { a.y = this.top + ANCHOR_R; a.vy = Math.abs(a.vy) * 0.75; }
    if (a.y > this.bottom - ANCHOR_R) { a.y = this.bottom - ANCHOR_R; a.vy = -Math.abs(a.vy) * 0.75; }

    // The chain.
    const hx = ship.x + HAWSE_AT[0], hy = ship.y + HAWSE_AT[1];
    const dx = a.x - hx, dy = a.y - hy;
    const dist = Math.hypot(dx, dy);
    if (dist > CHAIN_LEN) {
      const nx = dx / dist, ny = dy / dist;
      a.x = hx + nx * CHAIN_LEN;
      a.y = hy + ny * CHAIN_LEN;
      const out = a.vx * nx + a.vy * ny;
      if (out > 0) { a.vx -= out * nx; a.vy -= out * ny; }
    }

    const speed = Math.hypot(a.vx, a.vy);
    if (speed > 1) a.ang = Math.atan2(a.vy, a.vx);
    if (Math.random() < 0.5) this.fx(owner).ember(a.x, a.y, 1, 10, 300, MAG.ember);

    if (speed >= ANCHOR_MIN_HIT_SPEED) {
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y) > ANCHOR_HIT_R) continue;
        if (time < (a.hitAt.get(t) ?? 0)) continue;
        a.hitAt.set(t, time + ANCHOR_HIT_GAP_MS);
        this.strike(owner, t, ANCHOR_DMG);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MAG.white));
        this.shove(t, a.ang, ANCHOR_SHOVE);
        this.fx(owner).erupt(t.x, t.y, 30, MAG.gold);
        this.api.scene.cameras.main.shake(140, 0.006);
      }
    }
    if (time >= a.flyUntil || speed < 70) a.state = 'reel';
  }

  /**
   * The ship, every frame: the slow burn, the fuses, the guns tracking their thirds, the
   * anchor, and the hull stopping enemy shots.
   */
  private updateShip(owner: Owner, time: number, dt: number): void {
    const s = this.side(owner);
    const ship = s.ship;
    if (!ship) return;

    ship.hp -= SHIP_DECAY_PER_S * dt;
    if (ship.hp <= 0) { this.sink(owner); return; }
    if (!this.shipUp(owner)) return;

    ship.cannons.forEach((c, i) => {
      if (c.fuseFrom > 0 && time >= c.fireAt) { this.fireCannon(owner, ship, i, time); return; }
      const at = this.cannonPos(ship, i);
      const aim = this.cannonTarget(owner, ship, i);
      const want = Math.atan2(aim.y - at.y, aim.x - at.x);
      c.ang += Phaser.Math.Angle.Wrap(want - c.ang) * Math.min(1, dt * 5);
    });

    this.updateAnchor(owner, ship, time, dt);

    // The hull stops shots. Theirs only; yours sail through. Snapshotted, because destroying
    // a child while iterating the live group array skips every other shot.
    for (const child of [...this.api.projectiles.getChildren()]) {
      const proj = child as Projectile;
      if (!proj.active || !proj.body) continue;
      if (proj.isFromPlayer === (owner === 'player')) continue;
      if (!this.onDeck(ship, proj.x, proj.y)) continue;
      this.hurtShip(ship, Math.max(1, proj.damage));
      proj.destroy();
    }
  }

  private sink(owner: Owner): void {
    const s = this.side(owner);
    const ship = s.ship;
    if (!ship) return;
    s.ship = null;
    const fx = this.fx(owner);
    for (let i = -1; i <= 1; i++) {
      fx.erupt(ship.x + i * SHIP_W * 0.3, ship.y, 60, MAG.magma);
      fx.smoke(ship.x + i * SHIP_W * 0.3, ship.y, 8, 1400);
    }
    fx.shock(ship.x, ship.y, 30, SHIP_W * 0.5, MAG.ash, 800);
    fx.splat(ship.x, ship.y, 60);
    Sfx.playAt('explosion-large', ship.x, { volume: 0.8, rate: 0.7 });
    this.api.scene.cameras.main.shake(300, 0.008);
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'magma';
    const npcIs = this.api.npcElementId === 'magma';
    if (!playerIs && !npcIs) return;

    const dt = delta / 1000;
    this.vizT += dt;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      this.advanceCursor(owner);
      this.updateBlunder(owner, time);
      this.updateFly(owner, time);
      this.updateDrink(owner, time, dt);
      this.updateMelt(owner, time);
      this.updateShip(owner, time, dt);
    }

    this.updatePellets(time, dt);
    this.updateCores(time, dt);
    this.updateRocks(time, dt);
    this.updateBalls(time);
    this.updatePools(time, dt);
    this.updateShoves(dt);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintHull(time);
    this.paintObjects(time);
    this.paintTools(time);
    this.paintTray(playerIs, time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(2);
    if (!this.hullGfx) this.hullGfx = scene.add.graphics().setDepth(4);
    if (!this.objGfx) this.objGfx = scene.add.graphics().setDepth(7);
    if (!this.toolGfx) this.toolGfx = scene.add.graphics().setDepth(9);
  }

  /** The npc has no mouse, so its cursor is simply whoever it is fighting. */
  private advanceCursor(owner: Owner): void {
    const s = this.side(owner);
    if (owner === 'player') { s.curX = this.aimX; s.curY = this.aimY; return; }
    const f = this.fighter(owner);
    const target = this.enemyOf(owner);
    s.curX = target ? target.x : f?.x ?? 0;
    s.curY = target ? target.y : f?.y ?? 0;
  }

  private shove(target: Fighter, ang: number, distance: number): void {
    const speed = distance / (SHOVE_MS / 1000);
    this.shoves = this.shoves.filter((s) => s.target !== target);
    this.shoves.push({ target, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, until: this.now + SHOVE_MS });
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
    for (const owner of ['player', 'npc'] as Owner[]) {
      const is = owner === 'player' ? playerIs : npcIs;
      let av = this.avatar(owner);
      if (!is) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      const f = this.fighter(owner);
      if (!av) {
        av = this.makeAvatar(owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.side(owner);
      const ang = this.aimAng(owner);
      av.setFacing(ang);
      av.setHold(s.hotRounds > 0 ? 'gun' : null, ang);
      av.setVenting?.(s.flyUntil > this.now || this.now - s.shotAt < 220);
      av.setHelm?.(false);
      av.setPendant?.(-1);
      av.setIntensity(this.aboard(owner, f) ? 1.2 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      // Going into the floor, he is simply not there to draw.
      const melted = s.meltUntil > this.now
        ? 1 - Phaser.Math.Clamp((this.now - s.meltFrom) / (MELT_MS * 0.7), 0, 1) : 1;
      av.update(delta, f.x, f.y, f.active && f.hp > 0 ? f.alpha * melted : 0);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    for (const p of this.pools) {
      const age = (time - p.born) / p.life;
      // Skins over as it dies, which is also the warning that it is about to stop hurting.
      const heat = Phaser.Math.Clamp(1 - age * 1.15, 0.05, 1);
      const grow = Phaser.Math.Clamp((time - p.born) / 160, 0.3, 1);
      const fade = Phaser.Math.Clamp((p.until - time) / Math.min(900, p.life * 0.5), 0, 1);
      if (this.party(p.owner)) candyPool(g, p.x, p.y, p.r * grow, heat, this.vizT, p.seed, fade);
      else moltenPool(g, this.col(p.owner), p.x, p.y, p.r * grow, heat, this.vizT, p.seed, fade);
    }
    // Where a ball is coming down.
    for (const b of this.balls) {
      const u = Phaser.Math.Clamp((time - b.from) / BALL_FLIGHT_MS, 0, 1);
      impactMarker(g, this.col(b.owner), b.tx, b.ty, BALL_R, u, this.vizT);
    }
  }

  /** The hull, deck and guns, under the fighters: the captain walks on it. */
  private paintHull(time: number): void {
    const g = this.hullGfx;
    if (!g) return;
    g.clear();
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.side(owner);
      const ship = s.ship;
      if (!ship) continue;
      const tint = this.col(owner);
      const rise = Phaser.Math.Clamp((time - ship.riseFrom) / RISE_MS, 0, 1);
      if (rise < 1) meltPuddle(g, tint, ship.x, ship.y, SHIP_W * 0.42, 1 - rise * 0.6, this.vizT, ship.seed);
      const flash = ship.flashUntil > time ? (ship.flashUntil - time) / 110 : 0;
      galleon(g, tint, ship.x, ship.y + (1 - rise) * 10, SHIP_W, SHIP_H, this.vizT,
        ship.hp / SHIP_HP, ship.seed, 'hull', rise, flash);
      if (rise < 1) continue;

      const f = this.fighter(owner);
      ship.cannons.forEach((c, i) => {
        const at = this.cannonPos(ship, i);
        const loaded = Phaser.Math.Clamp(1 - (c.readyAt - time) / CANNON_RELOAD_MS, 0, 1);
        const fuse = c.fuseFrom > 0 ? Phaser.Math.Clamp((time - c.fuseFrom) / CANNON_FUSE_MS, 0.001, 1) : 0;
        const recoil = Phaser.Math.Clamp(1 - (time - c.firedAt) / 260, 0, 1);
        // The ring that says "click here": the local captain's cursor on a gun he can reach.
        const hover = owner === 'player' && this.alive(f)
          && Phaser.Math.Distance.Between(s.curX, s.curY, at.x, at.y) <= CANNON_CLICK_R
          && Phaser.Math.Distance.Between(f.x, f.y, at.x, at.y) <= CANNON_REACH;
        deckCannon(g, tint, at.x, at.y, c.ang, loaded, fuse, recoil, this.vizT, hover);
      });
    }
  }

  private paintObjects(time: number): void {
    const g = this.objGfx;
    if (!g) return;
    g.clear();

    for (const owner of ['player', 'npc'] as Owner[]) {
      const ship = this.side(owner).ship;
      if (!ship) continue;
      const tint = this.col(owner);
      const rise = Phaser.Math.Clamp((time - ship.riseFrom) / RISE_MS, 0, 1);
      galleon(g, tint, ship.x, ship.y + (1 - rise) * 10, SHIP_W, SHIP_H, this.vizT,
        ship.hp / SHIP_HP, ship.seed, 'rig', rise);
      if (rise < 1) continue;
      // The hull's gauge, over the quarterdeck.
      pressureGauge(g, tint, ship.x, ship.y - SHIP_H / 2 - 6, 96, ship.hp / SHIP_HP, MAG.gold);

      const a = ship.anchor;
      const hx = ship.x + HAWSE_AT[0], hy = ship.y + HAWSE_AT[1];
      const dist = Phaser.Math.Distance.Between(hx, hy, a.x, a.y);
      const speed = Math.hypot(a.vx, a.vy);
      const hot = a.state === 'fly' ? Phaser.Math.Clamp(speed / 500, 0.15, 1) : a.state === 'reel' ? 0.2 : 0;
      anchorChain(g, tint, hx, hy, a.x, a.y, Phaser.Math.Clamp((CHAIN_LEN - dist) * 0.12, 0, 26), hot);
      shipAnchor(g, tint, a.x, a.y, a.state === 'rest' ? Math.PI / 2 : a.ang, hot, this.vizT, a.state === 'rest');
    }

    for (const r of this.rocks) {
      if (this.party(r.owner)) wrappedCandy(g, r.x, r.y, 4, r.spin, RAINBOW[Math.floor(r.seed) % RAINBOW.length]);
      else lavaRock(g, this.col(r.owner), r.x, r.y, 6, r.spin, r.seed);
    }
    for (const p of this.pellets) {
      const life = Phaser.Math.Clamp((p.until - time) / Math.max(1, p.until - p.born), 0, 1);
      shotPellet(g, this.col(p.owner), p.x, p.y, Math.atan2(p.vy, p.vx), life, p.seed);
    }
    for (const b of this.balls) {
      const u = Phaser.Math.Clamp((time - b.from) / BALL_FLIGHT_MS, 0, 1);
      const x = Phaser.Math.Linear(b.x0, b.tx, u);
      const lift = Math.sin(u * Math.PI);
      const y = Phaser.Math.Linear(b.y0, b.ty, u) - lift * 70;
      // The heading follows the arc, so the tail trails the ball rather than the chord.
      const ang = Math.atan2((b.ty - b.y0) - Math.cos(u * Math.PI) * Math.PI * 70, b.tx - b.x0);
      moltenBall(g, this.col(b.owner), x, y, 13 + lift * 6, ang, this.vizT, b.seed);
    }
  }

  /** What is in hand or on a body: the guns, the tankard, the numbness, the cores. */
  private paintTools(time: number): void {
    const g = this.toolGfx;
    if (!g) return;
    g.clear();

    for (const c of this.cores) {
      if (!this.alive(c.host)) continue;
      const tint = this.col(c.owner);
      const at = this.corePos(c);
      const erupt = c.eruptUntil > 0 ? Phaser.Math.Clamp((time - c.eruptFrom) / CORE_ERUPT_MS, 0.001, 1) : 0;
      unstableCore(g, tint, at.x, at.y, 11, c.hp / CORE_HP, erupt, this.vizT, c.seed);
      if (c.flashUntil > time) {
        g.fillStyle(tint(MAG.white), ((c.flashUntil - time) / 110) * 0.55);
        g.fillCircle(at.x, at.y, 16);
      }
      // Its gauge: the shell's health while it holds, the eruption's clock once it does not.
      pressureGauge(g, tint, at.x, at.y - 22, 40,
        erupt > 0 ? 1 - erupt : c.hp / CORE_HP, erupt > 0 ? MAG.white : MAG.magma);
    }

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isMagma(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      const tint = this.col(owner);

      // Going under: the pool he melts into, over the top of him.
      if (s.meltUntil > time) {
        const k = Phaser.Math.Clamp((time - s.meltFrom) / MELT_MS, 0, 1);
        meltPuddle(g, tint, s.meltX, s.meltY + 6, 30, 0.35 + k * 0.65, this.vizT, 7);
        continue;
      }
      if (!this.alive(f)) continue;
      const av = this.avatar(owner);
      const ang = this.aimAng(owner);

      if (s.numbUntil > time) {
        numbHaze(g, tint, f.x, f.y, this.vizT, (s.numbUntil - time) / NUMB_MS,
          Phaser.Math.Clamp(s.numbBank / 120, 0, 1));
      } else if (s.hangLeft > 0) {
        hangoverThrob(g, tint, f.x, f.y, this.vizT, s.hangLeft / Math.max(1, s.hangTotal));
      }
      // The tankard, for as long as it takes to empty it.
      const chug = (time - s.chugFrom) / CHUG_MS;
      if (chug >= 0 && chug < 1) {
        hotDrink(g, tint, f.x + 13, f.y - 16 - Math.sin(chug * Math.PI) * 5, Math.sin(chug * Math.PI), this.vizT);
      }

      // Pistols out.
      if (s.hotRounds > 0 || time - Math.max(s.hotFiredAt[0], s.hotFiredAt[1]) < 260) {
        for (const hand of [0, 1] as const) {
          const at = av?.handPos(hand) ?? { x: f.x, y: f.y };
          // Right fires first: with two rounds both are lit, with one only the left is.
          const lit = hand === 1 ? s.hotRounds >= 2 : s.hotRounds >= 1;
          const flash = Phaser.Math.Clamp(1 - (time - s.hotFiredAt[hand]) / 150, 0, 1);
          flintlock(g, tint, at.x, at.y, ang, lit, flash, this.vizT, hand * 1.7);
        }
        continue;
      }

      // The blunderbuss, for the moment of the shot.
      const since = time - s.shotAt;
      if (since < 320) {
        const at = av?.castHand() ?? { x: f.x, y: f.y };
        blunderbuss(g, tint, at.x, at.y, s.shotAng, Phaser.Math.Clamp(1 - since / 150, 0, 1),
          s.blunderCharges / BLUNDER_CHARGES, this.vizT);
      }
      // The kick window, on the local pirate: a gold ring that says the next blast throws him.
      if (owner === 'player' && s.blunderCharges > 0 && this.kickArmed('player')) {
        g.lineStyle(2, tint(MAG.gold), 0.5 + 0.35 * Math.sin(this.vizT * 26));
        g.strokeCircle(f.x, f.y, 24);
        const back = ang + Math.PI;
        for (let i = -1; i <= 1; i++) {
          const a = back + i * 0.42;
          g.lineBetween(f.x + Math.cos(a) * 28, f.y + Math.sin(a) * 28, f.x + Math.cos(a) * 38, f.y + Math.sin(a) * 38);
        }
      }
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsMagma: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;
    const set = (id: string, status: CustomStatus | null) => this.api.setStatusIndicator(id, status);

    set('magma-hotshot', playerIsMagma && s.hotRounds > 0 ? {
      name: 'Hotshot', emoji: '🔫', color: MAG.gold,
      description: `Both flintlocks are out. Each click fires one — a line through your cursor for ${HOTSHOT_DMG} to the first body on it. When both are spent you are back on the blunderbuss.`,
      count: s.hotRounds, suffix: ` / ${HOTSHOT_ROUNDS}`, priority: 104,
    } : null);

    set('magma-numb', playerIsMagma && s.numbUntil > time ? {
      name: 'Numb', emoji: '🍺', color: PIR.numb,
      description: `You take no damage and nothing can slow or stun you. Everything you are not feeling is being counted, and ${Math.round(HANGOVER_SHARE * 100)}% of it comes back as a burn when this ends.`,
      count: Math.round(s.numbBank), until: s.numbUntil, priority: 110,
    } : null);

    set('magma-hangover', playerIsMagma && s.hangLeft > 0 ? {
      name: 'Hangover', emoji: '🤕', color: MAG.pendantLit,
      description: 'The pain the drink was holding back, less a fifth, burning through you now. Nothing blocks it.',
      count: Math.ceil(s.hangLeft), priority: 108,
    } : null);

    const mine = this.cores.filter((c) => c.owner === 'player');
    const erupting = mine.find((c) => c.eruptUntil > 0);
    const holding = mine.reduce((m, c) => (c.eruptUntil <= 0 ? Math.min(m, c.hp) : m), Infinity);
    set('magma-core', playerIsMagma && mine.length ? {
      name: erupting ? 'Core Erupting' : 'Unstable Core', emoji: '☄️', color: erupting ? MAG.white : MAG.magma,
      description: erupting
        ? `It is going off on them: ${CORE_BURN_DPS} a second, lava wherever they stand, rock thrown in every direction, and ${CORE_BLAST_DMG} to everything within ${CORE_BLAST_R}px when it finishes.`
        : `Clamped on. Every point of damage they take, from anything, comes off the core's ${CORE_HP} too. At zero it erupts.`,
      count: erupting ? undefined : Math.max(0, Math.ceil(holding)),
      suffix: erupting ? undefined : ` / ${CORE_HP}`,
      until: erupting ? erupting.eruptUntil : undefined, priority: 112,
    } : null);

    const ship = s.ship;
    set('magma-ship', playerIsMagma && ship ? {
      name: this.aboard('player', p) ? 'On Deck' : 'The Ship', emoji: '🏴‍☠️', color: MAG.gold,
      description: this.aboard('player', p)
        ? `The hull takes every hit meant for you while you stand on it, and stops enemy shots. Click a gun you are standing by to light its fuse: each covers a third of the arena for ${BALL_DMG} and leaves lava. Blast the anchor to send it swinging on its chain for ${ANCHOR_DMG}.`
        : `Still afloat, still stopping shots, burning down ${SHIP_DECAY_PER_S} a second. Walk back onto the deck to man the guns; the anchor can be blasted from anywhere.`,
      count: Math.max(0, Math.round(ship.hp)), suffix: ` / ${SHIP_HP}`, priority: 102,
    } : null);

    // The victim side: hostile lava under the local player's feet, and a hostile core on them.
    const standing = this.pools.some((pl) => pl.owner === 'npc'
      && Phaser.Math.Distance.Between(pl.x, pl.y, p.x, p.y) <= pl.r);
    set('magma-scalded', standing ? {
      name: 'Standing In Lava', emoji: '🔥', color: MAG.lava,
      description: `You are standing in someone else's magma — ${POOL_DPS} a second for as long as you do. Step out of it.`,
      priority: 15,
    } : null);

    const worn = this.cores.find((c) => c.owner === 'npc' && c.host === p);
    set('magma-cored', worn ? {
      name: worn.eruptUntil > 0 ? 'Core Erupting' : 'Unstable Core', emoji: '☄️',
      color: worn.eruptUntil > 0 ? MAG.white : MAG.magma,
      description: worn.eruptUntil > 0
        ? `It is erupting on you: ${CORE_BURN_DPS} a second and lava under your feet — keep moving — then ${CORE_BLAST_DMG} when it finishes.`
        : `A molten core is clamped to you. Every point of damage you take comes off its ${CORE_HP}; when it is gone, it erupts.`,
      count: worn.eruptUntil > 0 ? undefined : Math.max(0, Math.ceil(worn.hp)),
      suffix: worn.eruptUntil > 0 ? undefined : ` / ${CORE_HP}`,
      until: worn.eruptUntil > 0 ? worn.eruptUntil : undefined, priority: 16,
    } : null);
  }

  // ── Reads for the bot (side-effect-free: `NpcAiState` is rebuilt every frame) ──

  npcBlunderCharges(): number { return this.sides.npc.blunderCharges; }
  npcHotRounds(): number { return this.sides.npc.hotRounds; }
  npcNumb(): boolean { return this.sides.npc.numbUntil > this.now; }
  npcBusy(): boolean { return this.sides.npc.meltUntil > this.now; }
  npcHasShip(): boolean { return !!this.sides.npc.ship; }

  /** Synergy: a core of the bot's is on somebody and still has its shell — damage now is worth double. */
  npcCoreHolding(): boolean {
    return this.cores.some((c) => c.owner === 'npc' && c.eruptUntil <= 0);
  }

  /** A body with no core of the bot's on it, close enough to clamp one to. */
  npcCoreInReach(): boolean {
    const f = this.api.npc;
    if (!this.alive(f)) return false;
    return this.targetsOf('npc').some((t) => !this.cores.some((c) => c.owner === 'npc' && c.host === t)
      && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= CORE_RANGE * 0.9);
  }

  /** The loaded gun whose third currently holds a target, nearest the bot first. */
  private npcLiveCannon(): { x: number; y: number } | null {
    const ship = this.sides.npc.ship;
    const f = this.api.npc;
    if (!ship || !this.alive(f) || !this.shipUp('npc')) return null;
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    ship.cannons.forEach((c, i) => {
      if (c.fuseFrom > 0 || this.now < c.readyAt) return;
      if (!this.cannonTarget('npc', ship, i).live) return;
      const at = this.cannonPos(ship, i);
      const d = Phaser.Math.Distance.Between(f.x, f.y, at.x, at.y);
      if (d < bestD) { bestD = d; best = at; }
    });
    return best;
  }

  /** Synergy: a gun the bot is standing by that would land on somebody. Click here to light it. */
  npcCannonAim(): { x: number; y: number } | null {
    const at = this.npcLiveCannon();
    const f = this.api.npc;
    if (!at || Phaser.Math.Distance.Between(f.x, f.y, at.x, at.y) > CANNON_REACH * 0.85) return null;
    return at;
  }

  /**
   * Where the bot's feet should be going, with how close is close enough — or null to leave
   * its movement alone. Two reasons, in this order:
   *  - Synergy (drink → core): the core is off cooldown and nobody is wearing one. Clamping
   *    needs arm's reach, which a skirmisher never volunteers for, so it walks in — from any
   *    distance while numb (nothing can hurt it), otherwise only when it is already close.
   *  - Synergy (ship → guns): a loaded gun whose third holds a target, if the deck beside it
   *    is near enough to be worth the walk.
   */
  npcSeekPoint(): { x: number; y: number; stop: number } | null {
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f) || s.meltUntil > this.now) return null;
    const e = this.enemyOf('npc');
    if (e && f.getCooldownRatio('magma-core') >= 1
      && !this.cores.some((c) => c.owner === 'npc' && c.host === e)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, e.x, e.y);
      if (s.numbUntil > this.now + 600 || d < 230) return { x: e.x, y: e.y, stop: CORE_RANGE * 0.75 };
    }
    const at = this.npcLiveCannon();
    const ship = s.ship;
    if (!at || !ship) return null;
    const d = Phaser.Math.Distance.Between(f.x, f.y, at.x, at.y);
    if (d <= CANNON_REACH * 0.6 || d > 340) return null;
    return { x: at.x, y: ship.y + 4, stop: 30 };
  }

  /**
   * Synergy: the anchor is sitting in the floor, the bot is close enough to hit it with the
   * spread, and a blast from where it stands would send it at the target, who is inside the
   * chain's sweep. The point to shoot at, or null.
   */
  npcAnchorAim(): { x: number; y: number } | null {
    const ship = this.sides.npc.ship;
    const f = this.api.npc;
    const e = this.enemyOf('npc');
    if (!ship || !e || !this.alive(f) || !this.shipUp('npc') || ship.anchor.state !== 'rest') return null;
    const a = ship.anchor;
    if (Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y) > PELLET_RANGE * 0.8) return null;
    const hx = ship.x + HAWSE_AT[0], hy = ship.y + HAWSE_AT[1];
    if (Phaser.Math.Distance.Between(hx, hy, e.x, e.y) > CHAIN_LEN + ANCHOR_HIT_R) return null;
    const shot = Math.atan2(a.y - f.y, a.x - f.x);
    const want = Math.atan2(e.y - a.y, e.x - a.x);
    if (Math.abs(Phaser.Math.Angle.Wrap(want - shot)) > 0.4) return null;
    return { x: a.x, y: a.y };
  }

  // ── Ability tray ───────────────────────────────────────────────────────────

  /**
   * The click card holds two shots, so it is drawn as two cells: a divider down the middle of
   * the fill, and one pip per shot in the corner — lit while held, filling as a pie while it
   * reloads. With the flintlocks out the same two pips count the rounds left in them.
   */
  private paintTray(playerIs: boolean, time: number): void {
    const card = playerIs ? this.api.barFor('magma-blunder') : undefined;
    if (!card || !card.fill.visible) { this.trayGfx?.clear(); return; }
    if (!this.trayGfx) this.trayGfx = this.api.scene.add.graphics().setDepth(24);
    const g = this.trayGfx;
    g.clear();
    g.setAlpha(card.fill.alpha > 0 ? 1 : 0);

    const s = this.sides.player;
    const hot = s.hotRounds > 0;
    const slots = hot ? HOTSHOT_ROUNDS : BLUNDER_CHARGES;
    const held = hot ? s.hotRounds : s.blunderCharges;
    const reload = hot ? 0
      : Phaser.Math.Clamp(1 - (s.blunderRechargeAt - time) / BLUNDER_RECHARGE_MS, 0, 1);
    const left = card.fill.x;
    const top = card.fill.y - card.fill.height / 2;
    const lit = this.pcol(hot ? MAG.white : MAG.gold);

    // Cell dividers: the fill crossing one is a whole shot back.
    for (let i = 1; i < slots; i++) {
      const dx = Math.round(left + (card.maxWidth * i) / slots);
      g.fillStyle(0x000000, 0.6);
      g.fillRect(dx - 1, top + 3, 2, card.fill.height - 6);
      g.fillStyle(0xffffff, 0.18);
      g.fillRect(dx + 1, top + 3, 1, card.fill.height - 6);
    }

    const R = 4;
    for (let i = 0; i < slots; i++) {
      const px = left + card.maxWidth - 9 - (slots - 1 - i) * 12;
      const py = top + 9;
      g.fillStyle(0x140805, 0.95);
      g.fillCircle(px, py, R + 1.5);
      if (i < held) {
        g.fillStyle(lit, 1);
        g.fillCircle(px, py, R);
        g.fillStyle(0xffffff, 0.55);
        g.fillCircle(px - 1.2, py - 1.2, 1.3);
      } else if (i === held && reload > 0) {
        // The one shot on its way back, as a pie filling clockwise from the top.
        g.fillStyle(lit, 0.5);
        g.beginPath();
        g.moveTo(px, py);
        g.arc(px, py, R, -Math.PI / 2, -Math.PI / 2 + reload * Math.PI * 2, false);
        g.closePath();
        g.fillPath();
      }
      g.lineStyle(1, lit, i < held ? 1 : 0.55);
      g.strokeCircle(px, py, R);
    }
  }

  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    const p = this.api.player;
    if (abilityId === 'magma-blunder') {
      if (s.hotRounds > 0) return s.hotRounds / HOTSHOT_ROUNDS;
      if (s.blunderCharges >= BLUNDER_CHARGES) return 1;
      const partial = Phaser.Math.Clamp(1 - (s.blunderRechargeAt - time) / BLUNDER_RECHARGE_MS, 0, 1);
      return Phaser.Math.Clamp((s.blunderCharges + partial) / BLUNDER_CHARGES, 0, 1);
    }
    if (abilityId === 'magma-hotshot' && s.hotRounds > 0) return s.hotRounds / HOTSHOT_ROUNDS;
    if (abilityId === 'magma-drink' && s.numbUntil > time) {
      return Phaser.Math.Clamp((s.numbUntil - time) / NUMB_MS, 0, 1);
    }
    if (abilityId === 'magma-core') {
      const mine = this.cores.filter((c) => c.owner === 'player');
      const erupting = mine.find((c) => c.eruptUntil > 0);
      if (erupting) return Phaser.Math.Clamp((erupting.eruptUntil - time) / CORE_ERUPT_MS, 0, 1);
    }
    if (abilityId === 'magma-limoncello' && s.ship) return Phaser.Math.Clamp(s.ship.hp / SHIP_HP, 0, 1);
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`): cores and the ship. A core razed this
   * way is simply gone — it does not erupt. A razed ship goes down without a blast.
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
    for (let i = this.cores.length - 1; i >= 0; i--) {
      const c = this.cores[i];
      if (c.owner === exceptOwner || !near(c.host.x, c.host.y)) continue;
      this.cores.splice(i, 1);
      razed++;
    }
    for (const owner of ['player', 'npc'] as Owner[]) {
      const ship = this.side(owner).ship;
      if (owner === exceptOwner || !ship) continue;
      // The hull is a long target: the spikes reach it anywhere along its length.
      const cx = Phaser.Math.Clamp(x, ship.x - SHIP_W / 2, ship.x + SHIP_W / 2);
      if (!near(cx, ship.y)) continue;
      this.side(owner).ship = null;
      razed++;
    }
    return razed;
  }
}

/** The one tap guard on the click, exported so the element file and the kit cannot disagree. */
export const MAGMA_CLICK_TAP_MS = BLUNDER_TAP_MS;
