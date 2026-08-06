import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { isDebuff, seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import { JournalBonuses, NO_JOURNAL_BONUSES, journalBonuses, journalElementName } from '../../data/PaperJournal';
import { Sfx } from '../../audio';
import {
  BOOK_TONE, BookId, PAP, PaperAvatar, PaperColorFn, PaperFx, arcaneSpike, burningScrap,
  chainRun, crucifixShape, flameSpirit, fortuneTeller, ghostBlade, ghostKnight, herbSeed,
  lightSlab, lotusBloom, paperPlaneShape, paperSheet, pinwheelShape, portalTear,
  shurikenShape, targetRing,
} from './PaperVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const TAU = Math.PI * 2;

// ── Storybook Summoning (Click) ──────────────────────────────────────────────

/** Knight — Excalibur. */
const BLADE_DAMAGE = 15;
const BLADE_SPEED = 620;
const BLADE_LIFE_MS = 2200;
/** How close a body has to be before the blade starts bending toward it, and how hard it bends. */
const BLADE_SEEK_R = 155;
const BLADE_TURN = 3.6;

/** Alien — the laser. Four ticks of 4 over two seconds, then a reload you have to sit through. */
const LASER_TICK_DAMAGE = 4;
const LASER_TICK_MS = 500;
const LASER_BURST_MS = 2000;
const LASER_RELOAD_MS = 1500;
const LASER_RANGE = 900;
const LASER_HALF_WIDTH = 16;

/** Fantasy — the spike, and its two follow-up strikes. */
const SPIKE_DAMAGE = 6;
const SPIKE_SPEED = 700;
const SPIKE_STRIKES = 3;
const SPIKE_LIFE_MS = 3200;
/** How far from the body it reappears, and how long the portal holds it before it comes again. */
const SPIKE_WARP_DIST = 96;
const SPIKE_WARP_MS = 280;

/**
 * Bible — the slab of light. Thrown broadside on: `SLAB_LEN` runs *across* the direction of
 * travel, so it sweeps a lane rather than drilling a line.
 */
const SLAB_DAMAGE = 12;
const SLAB_SPEED = 520;
const SLAB_LEN = 96;
const SLAB_WIDTH = 22;
const SLAB_LIFE_MS = 1800;
/** How far the slab throws a body, and over how long. High: this is its whole identity. */
const SLAB_KNOCK = 320;
const SHOVE_MS = 280;

/**
 * Herbology — the three seeds. They heal only when they reach a wall, and only as much as they
 * dared: the heal is banked from the closest a seed came to a body without touching it.
 */
const SEED_COUNT = 3;
const SEED_SPEED = 620;
const SEED_R = 7;
const SEED_SPREAD = 0.13;
const SEED_LIFE_MS = 2600;
const SEED_HEAL = 3;
const SEED_HEAL_BONUS = 6;
/**
 * Grazing pays from `SEED_FAR` inward, and pays in full at `SEED_NEAR`. `SEED_NEAR` has to sit a
 * clear margin outside the seed's own hit reach (~19px against a normal body) or the window
 * between "full value" and "wasted" would be a handful of pixels wide and nobody could aim at it.
 */
const SEED_FAR = 150;
const SEED_NEAR = 42;

// ── Larger Library, the endings (Click upgrade + Q) ──────────────────────────

/** Bible — the crucifix. A root, not a stun: five seconds of standing exactly where you are. */
const CROSS_MS = 5000;
const CROSS_FADE_MS = 600;

/** Herbology — the lotus. */
const LOTUS_HEAL = 100;
const LOTUS_MS = 2200;

// ── Paper Plane (E) ──────────────────────────────────────────────────────────

const PLANE_DAMAGE = 10;
const PLANE_SPEED = 560;
/** Slower under a passenger — a ridden plane you cannot react to is a teleport, not a glide. */
const PLANE_RIDE_SPEED = 470;
const PLANE_LIFE_MS = 2600;
/** Radians per second a ridden plane can be steered. Enough to turn, not enough to home. */
const PLANE_STEER = 2.4;
const PLANE_HIT_R = 20;

/** Plane Drill (E upgrade): what the wall costs whoever was being carried into it. */
const DRILL_AOE_R = 96;
const DRILL_AOE_DAMAGE = 10;

// ── Paper Shuriken (R) ───────────────────────────────────────────────────────

const SHURIKEN_DAMAGE = 15;
const SHURIKEN_SPEED = 640;
const SHURIKEN_R = 20;
/** How long it spins in the wall, and how often the same body can cut itself on it. */
const SHURIKEN_STUCK_MS = 8000;
const SHURIKEN_STUCK_GATE_MS = 1200;

/**
 * Paper Pinwheel (R upgrade): twice the size, twice as long in the wall, and a shot passing over
 * one kicks it off into the room again.
 */
const PINWHEEL_SIZE_MULT = 2;
const PINWHEEL_STUCK_MULT = 2;
/** What each launch is worth in extra wall time, and how long before it can be kicked again. */
const PINWHEEL_BONUS_MS = 2000;
const PINWHEEL_GATE_MS = 260;

/** The bleed: 2% of what the victim has left, every second, for four seconds. */
const BLEED_MS = 4000;
const BLEED_TICK_MS = 1000;
const BLEED_FRACTION = 0.02;

// ── Mâché Monsters (F) ───────────────────────────────────────────────────────

const MACHE_COUNT = 6;
const MACHE_LIFE_MS = 10000;
const MACHE_BITE_DAMAGE = 6;
const MACHE_CHARGE_DAMAGE = 8;
const MACHE_BITE_R = 26;
/** How close a projectile has to pass before a monster eats it. */
const MACHE_EAT_R = 26;
const MACHE_CHARGE_SPEED = 330;
const MACHE_CHARGE_LIFE_MS = 5000;
const MACHE_R = 15;

/**
 * Magical Monsters (F upgrade): they get up the moment they land and walk the enemy down for 4.
 * Eating a bullet still enrages them into the ordinary 8-damage charge, so the upgrade changes
 * what a monster does with its life, not what an enraged one is worth.
 */
const MACHE_HUNT_SPEED = 185;
const MACHE_HUNT_DAMAGE = 4;

// ── Climax (Q) ───────────────────────────────────────────────────────────────

/** Knight — the charge. One wave, one hit, fifty damage; the twelve riders are all one attack. */
const CHARGE_COUNT = 12;
const CHARGE_DAMAGE = 50;
const CHARGE_SPEED = 760;
const CHARGE_HIT_R = 40;

/** Alien — the bombardment. */
const BOMB_COUNT = 60;
const BOMB_DAMAGE = 25;
const BOMB_R = 46;
const BOMB_ARM_MS = 2000;
/**
 * Staggered so the barrage reads as a barrage rather than one screen-wide flash. Tightened
 * from 85ms when the count went to sixty — at the old spacing the last beam landed five
 * seconds after the cast, which is a siege, not a climax.
 */
const BOMB_STAGGER_MS = 25;
/** No more than one explosion per this, or forty beams a second sum into white noise. */
const BOMB_SFX_GAP_MS = 70;
const BOMB_STUN_MS = 2000;
/** How many of the sixty are aimed at somebody rather than scattered. */
const BOMB_AIMED = 25;
const BOMB_AIM_SPREAD = 90;

/** Fantasy — the spirit, and the fire it leaves behind. */
const SPIRIT_MS = 8000;
const SPIRIT_SPEED = 330;
const SPIRIT_R = 18;
const SPIRIT_TRAIL_MS = 90;
const TRAIL_LIFE_MS = 3000;
const TRAIL_R = 28;
const TRAIL_DAMAGE = 4;
const TRAIL_TICK_MS = 500;

// ── World objects ────────────────────────────────────────────────────────────

/** Excalibur in flight. Bends toward whatever it passes near, which is the whole ability. */
interface Blade {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  diesAt: number;
  hits: Set<Fighter>;
}

/** The fantasy spike, mid-run or parked in a portal between strikes. */
interface Spike {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  strikes: number;
  /** While `now` is under this the spike is inside a portal: no movement, no damage. */
  armedAt: number;
  /** Where the portal it is sitting in was torn, for the painter. */
  portalX: number;
  portalY: number;
  portalAt: number;
  diesAt: number;
  seed: number;
}

/** A paper plane, thrown or ridden. `rider` is the only thing that makes those two different. */
interface Plane {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  /** Set while the caster is holding the key down; cleared the frame they let go. */
  rider: Fighter | null;
  /** Signed −1..1, for the banked-wing drawing. Smoothed, so a hard turn leans in. */
  bank: number;
  diesAt: number;
  hits: Set<Fighter>;
  /**
   * Plane Drill: everybody speared on the nose and being carried to the wall. Emptying it is
   * what marks the blast as paid — a plane that picks somebody up again later gets another.
   */
  drilled: Fighter[];
}

/** The Bible book's slab of light, mid-flight. */
interface Slab {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  diesAt: number;
  seed: number;
  hits: Set<Fighter>;
}

/** One Herbology seed. `near` is the closest it has come to a body — that is what it is worth. */
interface Seed {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  near: number;
  diesAt: number;
}

/** A planted crucifix and whoever it has chained to the spot. */
interface Cross {
  owner: Owner;
  target: Fighter;
  x: number;
  y: number;
  endsAt: number;
}

/** An open lotus. Purely a drawing — the 100 is paid the instant it is cast. */
interface Lotus {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  diesAt: number;
  seed: number;
}

/**
 * A knockback in progress. Both movement systems rewrite a fighter's velocity every frame, so a
 * shove handed to the physics body is gone before it renders — it has to be played out as
 * position, exactly as Magma's does.
 */
interface Shove {
  target: Fighter;
  vx: number;
  vy: number;
  until: number;
}

/** A shuriken, in the air or buried in a wall. */
interface Shuriken {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  /** 0 while flying; the expiry once it has stuck. */
  stuckUntil: number;
  /** Per-victim re-cut clock, used only once it is stuck. */
  gate: Map<Fighter, number>;
  hits: Set<Fighter>;
  diesAt: number;
  /** Pinwheel: extra wall time earned by being kicked off it, accumulated across launches. */
  bonusMs: number;
  /** Pinwheel: the earliest it can be kicked again, so one bullet is one launch. */
  nextKickAt: number;
}

/** One fortune-teller: face-up on the floor, or up and running after somebody. */
interface Mache {
  owner: Owner;
  x: number;
  y: number;
  /** 0–1, worked by the chewing animation and by standing up. */
  open: number;
  spin: number;
  seed: number;
  /** Up and moving. Face-down mines start false; Magical Monsters start true. */
  alive: boolean;
  /** It has eaten a bullet: 8 damage instead of 4, and it runs. */
  enraged: boolean;
  diesAt: number;
  /** Who it is chasing, once it is on its feet. */
  target: Fighter | null;
}

/** One rider in the Knight Climax. */
interface Charger {
  x: number;
  y: number;
  /** −1 or 1 — every rider in a wave travels the same way. */
  dir: number;
  scale: number;
  phase: number;
  mounted: boolean;
  startAt: number;
}

/** A whole cavalry charge. One `hits` set for the wave, so twelve riders are one 50. */
interface Charge {
  owner: Owner;
  riders: Charger[];
  hits: Set<Fighter>;
  diesAt: number;
}

/** One painted circle in the Alien Climax, and the bomb that is coming for it. */
interface Bomb {
  owner: Owner;
  x: number;
  y: number;
  landsAt: number;
  seed: number;
}

/** The Fantasy Climax's spirit, ricocheting off the walls. */
interface Spirit {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  endsAt: number;
  nextTrailAt: number;
  seed: number;
}

/** A patch of burning paper the spirit left behind. */
interface Trail {
  owner: Owner;
  x: number;
  y: number;
  diesAt: number;
  seed: number;
  gate: Map<Fighter, number>;
}

/** An active bleed, wherever it came from. */
interface Bleed {
  owner: Owner;
  until: number;
  nextTickAt: number;
}

interface Side {
  owner: Owner;
  book: BookId;
  /** Latched from input (player) or from the last cast (npc). */
  aimX: number;
  aimY: number;
  /** Alien click: when the burst ends, when the next tick fires, when the reload ends. */
  laserUntil: number;
  nextLaserAt: number;
  reloadUntil: number;
  /** The npc has no right mouse button, so it cycles on a timer instead. */
  nextBookAt: number;
}

/** What the status tray says about whichever book is open. Indexed by `BookId`. */
const BOOK_BLURB = [
  'Click throws Excalibur — 15, and it bends toward anyone it passes near. Q sends the cavalry across the whole arena for 50.',
  'Click opens a 2-second laser — 4 every half-second, then a 1.5s reload. Q paints the floor with rings and bombards them for 25 and a 2s stun each.',
  'Click throws a spike for 6 that portals back for two more strikes. Q lets a flame spirit loose to ricochet for 8 seconds.',
  'Click hurls a slab of scripture-light — 12, and it throws whoever it catches a long way. Q plants a crucifix that chains one enemy to the spot for 5 seconds.',
  'Click sows 3 seeds. They heal you only if they reach a wall, and only as much as they dared: the closer one passes a body without touching it, the darker and richer it comes home. Q opens a lotus for 100 health.',
];

function makeSide(owner: Owner): Side {
  return {
    owner, book: 0, aimX: 0, aimY: 0,
    laserUntil: 0, nextLaserAt: 0, reloadUntil: 0, nextBookAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PaperArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. Mâché monsters eat out of it. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local projectiles. Monsters eat out of this too, or half the game would fly straight past. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get rightPointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Riding a paper plane places the body directly, so WASD has to stand down for the duration. */
  isDodging: boolean;
  /** Skins: maps a Paper visual colour through that side's equipped skin. */
  paperColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded books reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── PaperKit ─────────────────────────────────────────────────────────────────

export class PaperKit implements SummonPurgeTarget {
  private api: PaperArenaApi;

  // ── Visuals ──
  private readonly pcol: PaperColorFn;
  private readonly ncol: PaperColorFn;
  private readonly pfx: PaperFx;
  private readonly nfx: PaperFx;
  private playerAvatar: PaperAvatar | null = null;
  private npcAvatar: PaperAvatar | null = null;
  /** Everything lying on the floor: monsters, target rings, burning scraps. Under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Everything in the air: blades, spikes, planes, shuriken, knights, the spirit. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private blades: Blade[] = [];
  private spikes: Spike[] = [];
  private planes: Plane[] = [];
  private shurikens: Shuriken[] = [];
  private maches: Mache[] = [];
  private charges: Charge[] = [];
  private bombs: Bomb[] = [];
  /** Timestamp of the last bombardment explosion that was allowed to make a sound. */
  private lastBombSfxAt = 0;
  private spirits: Spirit[] = [];
  private trails: Trail[] = [];
  private slabs: Slab[] = [];
  private seeds: Seed[] = [];
  private crosses: Cross[] = [];
  private lotuses: Lotus[] = [];
  private shoves: Shove[] = [];
  private bleeds = new Map<Fighter, Bleed>();
  /** Everyone this kit has stunned, so it can hold their velocity at zero itself. */
  private stunned = new Map<Fighter, number>();
  /** Everyone this kit has written `journalIncomingMult` onto. */
  private touched = new Set<Fighter>();
  /** True while *this* kit is the one holding the arena's dodge flag down. */
  private claimsDodge = false;
  private lastDelta = 16.67;

  // ── Journal ──
  /**
   * The journal's contribution to this match, resolved from the save. Cached against the
   * opponent's element rather than recomputed per frame: `journalBonuses` reads through
   * `PlayerData`, which parses the entire save out of localStorage on every call, and the journal
   * cannot change mid-match anyway.
   */
  private bonuses: JournalBonuses = NO_JOURNAL_BONUSES;
  /** The element `bonuses` was resolved against; '' means nothing has been resolved yet. */
  private bonusesFor = '';
  /** The shield entries are paid once per match, not once per frame. */
  private guardGranted = false;
  /**
   * Snapshot behind the `shrug` entries. Statuses are written all over the codebase as bare
   * expiry timestamps with no central hook, so the only way to shorten "debuffs that element puts
   * on you" is to diff every writable timer against last frame — which is exactly the machinery
   * Creation's Gold Potion uses to *lengthen* them, run with a multiplier below 1.
   */
  private shrugSnapshot = new Map<string, number>();

  constructor(api: PaperArenaApi) {
    this.api = api;
    this.pcol = (base) => api.paperColor('player', base);
    this.ncol = (base) => api.paperColor('npc', base);
    this.pfx = new PaperFx(api.scene, this.pcol);
    this.nfx = new PaperFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PaperFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PaperColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private tone(owner: Owner) { return BOOK_TONE[this.sides[owner].book]; }

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

  private isPaper(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'paper' : this.api.npcElementId === 'paper';
  }

  /**
   * Whether that side owns a shop upgrade. The npc side only ever answers true online — a bot has
   * no save to have bought anything out of, which is also why the two branches never collide.
   */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** How many books that side is carrying. Larger Library is the only thing that changes it. */
  private bookCount(owner: Owner): number {
    return this.up(owner, 'click') ? BOOK_TONE.length : 3;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private avatar(owner: Owner): PaperAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Hit radius against a body, allowing for anything that has been resized. */
  private reach(t: Fighter, own: number): number {
    return own + 12 * t.sizeMult;
  }

  private setDodgeClaim(on: boolean): void {
    this.claimsDodge = on;
    this.api.isDodging = on;
  }

  /**
   * Re-assert the claim every frame. A Space dodge taken mid-flight owns the same flag and hands
   * it back when *it* finishes — without this, WASD would come back under a plane that is still
   * carrying you and fight the kit for the body.
   */
  private assertDodgeClaim(): void {
    if (this.claimsDodge) this.api.isDodging = true;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const f of this.touched) f.journalIncomingMult = 1;
    this.touched.clear();
    for (const [f] of this.bleeds) {
      if (f?.active) f.bleeding = false;
    }
    this.bleeds.clear();
    this.stunned.clear();
    this.shoves = [];
    this.setDodgeClaim(false);

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    // The npc's book is rolled rather than fixed, so consecutive bot fights are not identical.
    this.sides.npc.book = Math.floor(Math.random() * this.bookCount('npc')) as BookId;
    this.blades = [];
    this.spikes = [];
    this.planes = [];
    this.shurikens = [];
    this.maches = [];
    this.charges = [];
    this.bombs = [];
    this.lastBombSfxAt = 0;
    this.spirits = [];
    this.trails = [];
    this.slabs = [];
    this.seeds = [];
    this.crosses = [];
    this.lotuses = [];
    this.vizT = 0;

    this.bonuses = NO_JOURNAL_BONUSES;
    this.bonusesFor = '';
    this.guardGranted = false;
    this.shrugSnapshot.clear();

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'paper') return;
    void time;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // Right-click cycles the book. Free and instant on purpose: the cost of Storybook Summoning
    // is that only one of its three attacks is available at a time, not that switching is slow.
    if (pointer.rightButtonDown() && !this.api.rightPointerWasDown) {
      this.cycleBook('player');
    }

    if (pointer.isDown && !this.api.pointerWasDown) p.castAbility('paper-storybook', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('paper-plane', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('paper-shuriken', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('paper-mache', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('paper-climax', ctx);

    // The ride is read straight off the key rather than through an ability: "until you stop
    // holding" is a per-frame question, and routing it through `castAbility` would stamp the
    // cooldown sixty times a second.
    if (!this.api.eKey.isDown) {
      for (const pl of this.planes) {
        if (pl.rider === p) this.dismount(pl, true);
      }
    }
  }

  private cycleBook(owner: Owner): void {
    const s = this.sides[owner];
    const from = BOOK_TONE[s.book].cover;
    // Larger Library widens the ring from three to five rather than adding a second key: the
    // Bible and the Herbology book are shelved with the other three, not beside them.
    s.book = ((s.book + 1) % this.bookCount(owner)) as BookId;
    const tone = BOOK_TONE[s.book];
    // Cycling out of a half-fired laser drops the burst but not the reload — you do not get to
    // dodge the downside of the Alien book by flipping the page.
    s.laserUntil = 0;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.avatar(owner)?.setBook(s.book);
    this.fx(owner).turnPage(f.x, f.y, from, tone.cover);
    this.api.showFloatingText(f.x, f.y - 46, `${tone.emoji} ${tone.name.toUpperCase()}`, this.hex(tone.accent));
    Sfx.playAt('ui-page', f.x, { volume: 0.6, rate: 1 });
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Storybook Summoning. Three completely different attacks behind one key; which one
   * you get is whatever book is open, and the cast fans out immediately rather than sharing any
   * logic, because the three have nothing in common beyond the button.
   */
  doStorybook(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);

    switch (s.book) {
      case 0: this.castExcalibur(owner, f, ang); break;
      case 1: this.castLaser(owner, f); break;
      case 2: this.castSpike(owner, f, ang); break;
      case 3: this.castSlab(owner, f, ang); break;
      default: this.castSeeds(owner, f, ang); break;
    }
  }

  private castExcalibur(owner: Owner, f: Fighter, ang: number): void {
    this.blades.push({
      owner, x: f.x, y: f.y, ang,
      diesAt: this.now + BLADE_LIFE_MS,
      hits: new Set<Fighter>(),
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).ripple(f.x, f.y, 12, 46, 320, 9, PAP.spectre);
    this.api.showFloatingText(f.x, f.y - 44, '⚔️ EXCALIBUR', this.hex(PAP.spectre));
    Sfx.playAt('slash', f.x, { volume: 0.75, rate: 1.05 });
  }

  private castLaser(owner: Owner, f: Fighter): void {
    const s = this.side(owner);
    // Mid-burst or mid-reload the click does nothing at all, and it does not cost the cooldown
    // either — the Alien book's whole economy is its own two clocks, not the ability's.
    if (this.now < s.laserUntil || this.now < s.reloadUntil) {
      f.resetCooldown('paper-storybook');
      if (this.now < s.reloadUntil && owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 44, '📘 RELOADING', this.hex(PAP.beamDeep));
      }
      return;
    }
    s.laserUntil = this.now + LASER_BURST_MS;
    // First tick is free and immediate, so the click has a response rather than a delay.
    s.nextLaserAt = this.now;
    this.api.showFloatingText(f.x, f.y - 44, '📘 LASER', this.hex(PAP.beam));
  }

  private castSpike(owner: Owner, f: Fighter, ang: number): void {
    this.spikes.push({
      owner, x: f.x, y: f.y, ang, strikes: 0,
      armedAt: 0, portalX: 0, portalY: 0, portalAt: 0,
      diesAt: this.now + SPIKE_LIFE_MS,
      seed: Math.random() * 999,
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).ripple(f.x, f.y, 10, 40, 300, 9, PAP.arcane);
    this.api.showFloatingText(f.x, f.y - 44, '📕 SPIKE', this.hex(PAP.arcane));
    Sfx.playAt('spellbook', f.x, { volume: 0.65, rate: 1.2 });
  }

  /**
   * Bible — a slab of scripture-light, thrown broadside. Wide across the lane and slow enough to
   * walk out of, and what it is really for is the shove: 12 is a rounding error next to being put
   * three hundred pixels back into a wall you were trying to leave.
   */
  private castSlab(owner: Owner, f: Fighter, ang: number): void {
    this.slabs.push({
      owner, x: f.x, y: f.y, ang,
      diesAt: this.now + SLAB_LIFE_MS,
      seed: Math.random() * 999,
      hits: new Set<Fighter>(),
    });
    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).ripple(f.x, f.y, 12, 52, 340, 9, PAP.halo);
    this.api.showFloatingText(f.x, f.y - 44, '📙 SCRIPTURE', this.hex(PAP.halo));
    Sfx.playAt('holy-chord', f.x, { volume: 0.7, rate: 1.15 });
  }

  /**
   * Herbology — three seeds that are worth nothing at all if they land. They pay out on the wall
   * behind you, and they pay more the closer they came to a body on the way, so the ability is
   * entirely about how tightly you are willing to shave somebody.
   */
  private castSeeds(owner: Owner, f: Fighter, ang: number): void {
    for (let i = 0; i < SEED_COUNT; i++) {
      this.seeds.push({
        owner, x: f.x, y: f.y,
        ang: ang + (i - (SEED_COUNT - 1) / 2) * SEED_SPREAD,
        near: Infinity,
        diesAt: this.now + SEED_LIFE_MS,
      });
    }
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).ripple(f.x, f.y, 8, 38, 300, 9, PAP.leaf);
    this.api.showFloatingText(f.x, f.y - 44, `📓 SEEDS ×${SEED_COUNT}`, this.hex(PAP.leaf));
    Sfx.playAt('spore', f.x, { volume: 0.65, rate: 1.25 });
  }

  /**
   * E — Paper Plane. One object with two completely different jobs: let go of the key and it is a
   * projectile, hold it and it is a mount. The caster is put on board immediately rather than on
   * a hold timer, so a tap throws it and anything longer rides it.
   */
  doPlane(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);

    // The npc has no key to hold, so it decides up front — riding when it wants to close the gap
    // and throwing when it just wants the damage.
    const wantsRide = owner === 'player'
      ? this.api.eKey.isDown
      : Phaser.Math.Distance.Between(f.x, f.y, tx, ty) > 260;

    const plane: Plane = {
      owner, x: f.x, y: f.y, ang, rider: wantsRide ? f : null, bank: 0,
      diesAt: this.now + PLANE_LIFE_MS,
      hits: new Set<Fighter>(),
      drilled: [],
    };
    this.planes.push(plane);
    if (wantsRide && owner === 'player') this.setDodgeClaim(true);

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).ripple(f.x, f.y, 8, 44, 300, 9, PAP.pulp);
    this.api.showFloatingText(f.x, f.y - 44, wantsRide ? '✈️ TAKE OFF' : '✈️ PAPER PLANE', this.hex(PAP.crease));
    Sfx.playAt('whoosh', f.x, { volume: 0.7, rate: 1.35 });
  }

  /** Put a rider back on their feet where the plane is, and hand the body back to WASD. */
  private dismount(plane: Plane, land: boolean): void {
    const rider = plane.rider;
    plane.rider = null;
    if (plane.owner === 'player') this.setDodgeClaim(false);
    if (!rider || !this.alive(rider)) return;
    const x = Phaser.Math.Clamp(plane.x, this.left + 16, this.right - 16);
    const y = Phaser.Math.Clamp(plane.y, this.top + 16, this.bottom - 16);
    rider.setPosition(x, y);
    this.body(rider).reset(x, y);
    if (!land) return;
    this.fx(plane.owner).shred(x, y, 5, 20, 380, 9);
  }

  /**
   * R — Paper Shuriken. The 15 and the bleed are the ability; the eight seconds it spends buried
   * in a wall are a second, slower ability that the caster gets for free and has to remember to
   * fight next to.
   */
  doShuriken(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);

    this.shurikens.push({
      owner, x: f.x, y: f.y,
      vx: Math.cos(ang) * SHURIKEN_SPEED,
      vy: Math.sin(ang) * SHURIKEN_SPEED,
      spin: 0, stuckUntil: 0,
      gate: new Map<Fighter, number>(),
      hits: new Set<Fighter>(),
      diesAt: this.now + 4000,
      bonusMs: 0, nextKickAt: 0,
    });

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).ripple(f.x, f.y, 10, 50, 340, 9, PAP.crease);
    this.api.showFloatingText(f.x, f.y - 44, '🌀 SHURIKEN', this.hex(PAP.blood));
    Sfx.playAt('whoosh', f.x, { volume: 0.8, rate: 0.85 });
  }

  /**
   * F — Mâché Monsters. Six of them, face-up, in a ring around the caster: close enough that
   * anybody pressuring you has to walk through them, spread enough that they are not one AoE.
   */
  doMache(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    // Magical Monsters: they land on their feet and go looking. The ring they are scattered in is
    // the same either way — six mines and six hunters want the same spread.
    const magical = this.up(owner, 'f');

    const phase = Math.random() * TAU;
    for (let i = 0; i < MACHE_COUNT; i++) {
      const a = phase + (i / MACHE_COUNT) * TAU + (Math.random() - 0.5) * 0.4;
      const d = 58 + Math.random() * 78;
      const x = Phaser.Math.Clamp(f.x + Math.cos(a) * d, this.left + MACHE_R, this.right - MACHE_R);
      const y = Phaser.Math.Clamp(f.y + Math.sin(a) * d, this.top + MACHE_R, this.bottom - MACHE_R);
      this.maches.push({
        owner, x, y,
        open: 0.35, spin: Math.random() * TAU, seed: Math.random() * 999,
        alive: magical, enraged: false,
        diesAt: this.now + MACHE_LIFE_MS,
        target: magical ? this.nearestTarget(owner, x, y) : null,
      });
    }

    this.avatar(owner)?.play('clap');
    this.fx(owner).ripple(f.x, f.y, 20, 140, 460, 9, PAP.pulp);
    this.api.showFloatingText(f.x, f.y - 46,
      magical ? `👹 MONSTERS ×${MACHE_COUNT}` : `👹 MÂCHÉ ×${MACHE_COUNT}`, this.hex(PAP.crease));
    Sfx.playAt('trap-set', f.x, { volume: 0.8, rate: magical ? 0.9 : 1.1 });
  }

  /** Q — Climax. Same key, three endings; which one you get is whichever book is open. */
  doClimax(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    this.avatar(owner)?.play('raise');
    this.runClimax(owner, s.book, f, tx, ty);

    // Open-Ended: a second book's ending goes off with the first. Rolled out of everything on the
    // shelf *except* the one that is open, so the upgrade always adds an ability rather than
    // occasionally casting the same one twice.
    if (!this.up(owner, 'q')) return;
    const n = this.bookCount(owner);
    if (n < 2) return;
    let other = Math.floor(Math.random() * (n - 1));
    if (other >= s.book) other++;
    const tone = BOOK_TONE[other];
    this.api.showFloatingText(f.x, f.y - 68, `📖 OPEN-ENDED · ${tone.name.toUpperCase()}`, this.hex(PAP.gilt));
    this.fx(owner).ripple(f.x, f.y, 16, 120, 460, 9, PAP.gilt);
    this.runClimax(owner, other as BookId, f, tx, ty);
  }

  /** One book's ending, decoupled from whose turn it is so Open-Ended can fire a second. */
  private runClimax(owner: Owner, book: BookId, f: Fighter, tx: number, ty: number): void {
    switch (book) {
      case 0: this.climaxCharge(owner, f, tx); break;
      case 1: this.climaxBombardment(owner, f); break;
      case 2: this.climaxSpirit(owner, f, tx, ty); break;
      case 3: this.climaxCrucifix(owner, f, tx, ty); break;
      default: this.climaxLotus(owner, f); break;
    }
  }

  /** Knight: the whole arena width, one wave, fifty damage to anything that does not leave it. */
  private climaxCharge(owner: Owner, f: Fighter, tx: number): void {
    const dir = tx >= f.x ? 1 : -1;
    const startX = dir > 0 ? this.left - 90 : this.right + 90;
    const riders: Charger[] = [];
    for (let i = 0; i < CHARGE_COUNT; i++) {
      riders.push({
        // Spread down the full height with a jitter, and staggered back so the wave has depth.
        x: startX - dir * (i % 4) * 70,
        y: this.top + ((i + 0.5) / CHARGE_COUNT) * (this.bottom - this.top) + (Math.random() - 0.5) * 26,
        dir,
        scale: 15 + Math.random() * 6,
        phase: Math.random() * TAU,
        mounted: i % 3 !== 1,
        startAt: this.now + (i % 4) * 60,
      });
    }
    this.charges.push({
      owner, riders, hits: new Set<Fighter>(),
      diesAt: this.now + 3000,
    });
    this.api.showFloatingText(f.x, f.y - 52, '📗 THE CHARGE', this.hex(PAP.spectre));
    Sfx.playAt('roar', f.x, { volume: 1, rate: 0.9 });
  }

  /** Alien: sixty rings painted on the floor, twenty-five of them on top of somebody. */
  private climaxBombardment(owner: Owner, f: Fighter): void {
    const mark = this.nearestTarget(owner, f.x, f.y);
    for (let i = 0; i < BOMB_COUNT; i++) {
      let x: number;
      let y: number;
      if (i < BOMB_AIMED && mark) {
        const a = Math.random() * TAU;
        const d = Math.random() * BOMB_AIM_SPREAD;
        x = mark.x + Math.cos(a) * d;
        y = mark.y + Math.sin(a) * d;
      } else {
        x = Phaser.Math.Between(this.left + BOMB_R, this.right - BOMB_R);
        y = Phaser.Math.Between(this.top + BOMB_R, this.bottom - BOMB_R);
      }
      this.bombs.push({
        owner,
        x: Phaser.Math.Clamp(x, this.left + BOMB_R * 0.5, this.right - BOMB_R * 0.5),
        y: Phaser.Math.Clamp(y, this.top + BOMB_R * 0.5, this.bottom - BOMB_R * 0.5),
        landsAt: this.now + BOMB_ARM_MS + i * BOMB_STAGGER_MS,
        seed: Math.random() * 999,
      });
    }
    this.api.showFloatingText(f.x, f.y - 52, '📘 BOMBARDMENT', this.hex(PAP.beam));
    Sfx.playAt('digital-beep', f.x, { volume: 0.85, rate: 1.1 });
  }

  /** Fantasy: one spirit, eight seconds, no aiming and no control — it goes where it goes. */
  private climaxSpirit(owner: Owner, f: Fighter, tx: number, ty: number): void {
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.spirits.push({
      owner, x: f.x, y: f.y,
      vx: Math.cos(ang) * SPIRIT_SPEED,
      vy: Math.sin(ang) * SPIRIT_SPEED,
      endsAt: this.now + SPIRIT_MS,
      nextTrailAt: 0,
      seed: Math.random() * 999,
    });
    this.api.showFloatingText(f.x, f.y - 52, '📕 FLAME SPIRIT', this.hex(PAP.flame));
    Sfx.playAt('flame-burst', f.x, { volume: 0.9, rate: 0.85 });
  }

  /**
   * Bible: a crucifix comes down on whoever is nearest the cursor and chains them to the floor for
   * five seconds. No damage at all — it is the only ending in the kit that buys time instead of
   * spending it, and five seconds of a stationary opponent is worth more than fifty damage to
   * every other book Paper is holding.
   */
  private climaxCrucifix(owner: Owner, f: Fighter, tx: number, ty: number): void {
    const mark = this.nearestTarget(owner, tx, ty) ?? this.nearestTarget(owner, f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 52, '📙 JUDGEMENT', this.hex(PAP.halo));
    Sfx.playAt('holy-chord', f.x, { volume: 0.95, rate: 0.85 });
    // Nothing to plant it on if they cannot be held — a cross with no chain on it would be a
    // five-second lie about what just happened.
    if (!mark || mark.unstoppable) {
      if (mark) this.api.showFloatingText(mark.x, mark.y - 40, '⛓️ UNBOUND', this.hex(PAP.gilt));
      return;
    }

    this.crosses.push({
      owner, target: mark, x: mark.x, y: mark.y,
      endsAt: this.now + CROSS_MS,
    });
    this.stun(mark, CROSS_MS, '⛓️ CHAINED', PAP.gilt);
    this.fx(owner).godRay(mark.x, mark.y, 54);
    Sfx.playAt('chain', mark.x, { volume: 0.85, rate: 0.9 });
  }

  /** Herbology: the whole book's payoff in one press — a lotus opens and hands back 100 health. */
  private climaxLotus(owner: Owner, f: Fighter): void {
    this.lotuses.push({
      owner, x: f.x, y: f.y + 6,
      bornAt: this.now, diesAt: this.now + LOTUS_MS,
      seed: Math.random() * 999,
    });
    const before = f.hp;
    f.heal(LOTUS_HEAL);
    const gained = Math.round(f.hp - before);
    this.fx(owner).petals(f.x, f.y, 18, 110);
    this.api.showFloatingText(f.x, f.y - 52, `🪷 +${gained}`, this.hex(PAP.petal));
    Sfx.playAt('bloom', f.x, { volume: 0.9, rate: 0.95 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  /**
   * Called unconditionally from ArenaScene rather than behind an element check, because the two
   * things this kit owns that outlive being Paper — a rider glued to a plane, and the journal
   * multipliers written onto both fighters — are both things only this loop ever hands back.
   */
  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'paper';
    const npcIs = this.api.npcElementId === 'paper';
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.lastDelta = delta;
    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateSides(time, playerIs, npcIs);
    this.updateBlades(delta);
    this.updateSpikes(delta);
    this.updatePlanes(delta);
    this.updateShurikens(time, delta);
    this.updateMaches(delta);
    this.updateCharges(time, delta);
    this.updateBombs(time);
    this.updateSpirits(time, delta);
    this.updateTrails(time);
    this.updateSlabs(delta);
    this.updateSeeds(delta);
    this.updateCrosses(time);
    this.updateLotuses(time);
    this.updateBleeds(time);
    this.updateStuns();
    this.updateShoves(delta / 1000);
    this.updateJournal(playerIs, delta);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.pushStatuses(time, playerIs);
  }

  /** Anything of this kit's still standing in the world, whoever is currently Paper. */
  private hasLiveState(): boolean {
    return this.blades.length > 0 || this.spikes.length > 0 || this.planes.length > 0
      || this.shurikens.length > 0 || this.maches.length > 0 || this.charges.length > 0
      || this.bombs.length > 0 || this.spirits.length > 0 || this.trails.length > 0
      || this.slabs.length > 0 || this.seeds.length > 0 || this.crosses.length > 0
      || this.lotuses.length > 0 || this.shoves.length > 0
      || this.bleeds.size > 0 || this.touched.size > 0 || this.claimsDodge;
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Monsters and target rings are things you walk on; everything thrown
    // goes over the top, because a plane passing behind a body stops reading as an object.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  // ── Per-side bookkeeping ───────────────────────────────────────────────────

  private updateSides(time: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const is = owner === 'player' ? playerIs : npcIs;
      const s = this.sides[owner];
      const f = this.fighter(owner);

      if (!is) {
        // Stopped being Paper mid-match (Magic borrowing the element, a fresh round sharing the
        // kit). The laser is the only thing that would otherwise keep firing off somebody else's
        // body, so it is the only thing that has to be stopped here.
        s.laserUntil = 0;
        s.reloadUntil = 0;
        continue;
      }
      if (!this.alive(f)) continue;

      // The npc has no right mouse button, so it turns the page on a timer. Slow enough that a
      // player can read which book is open off the character before it changes again.
      if (owner === 'npc') {
        if (s.nextBookAt === 0) s.nextBookAt = time + 9000;
        else if (time >= s.nextBookAt) { this.cycleBook('npc'); s.nextBookAt = time + 9000 + Math.random() * 4000; }
      }

      this.updateLaser(owner, time, f);
    }
    this.assertDodgeClaim();
  }

  /**
   * The Alien book's beam. Hitscan, so there is no travelling object: every half-second it simply
   * asks who is standing on the line and charges them four.
   */
  private updateLaser(owner: Owner, time: number, f: Fighter): void {
    const s = this.sides[owner];
    if (time >= s.laserUntil) {
      // The burst ending is what starts the reload, and only once.
      if (s.laserUntil > 0) {
        s.laserUntil = 0;
        s.reloadUntil = time + LASER_RELOAD_MS;
        Sfx.playAt('reload', f.x, { volume: 0.5, rate: 1.1 });
      }
      return;
    }
    if (time < s.nextLaserAt) return;
    s.nextLaserAt = time + LASER_TICK_MS;

    // Aimed live: the player's cursor, or straight at whoever the bot is fighting.
    const mark = owner === 'player' ? null : this.nearestTarget(owner, f.x, f.y);
    const tx = mark ? mark.x : s.aimX;
    const ty = mark ? mark.y : s.aimY;
    const ang = Math.atan2(ty - f.y, tx - f.x);

    let reach = LASER_RANGE;
    for (const t of this.targetsOf(owner)) {
      const dx = t.x - f.x;
      const dy = t.y - f.y;
      const along = dx * Math.cos(ang) + dy * Math.sin(ang);
      if (along < 0 || along > LASER_RANGE) continue;
      const across = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
      if (across > this.reach(t, LASER_HALF_WIDTH)) continue;
      t.takeDamage(LASER_TICK_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, PAP.beam);
      this.fx(owner).splat(t.x, t.y, 16, PAP.beam);
      reach = Math.min(reach, along + 20);
    }

    this.fx(owner).beam(f.x, f.y, f.x + Math.cos(ang) * reach, f.y + Math.sin(ang) * reach, 5, 220, 11);
    Sfx.playAt('beam-fire', f.x, { volume: 0.45, rate: 1.3 });
  }

  // ── Excalibur ──────────────────────────────────────────────────────────────

  private updateBlades(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];

      // Bend toward the nearest body inside the seek radius. Capped turn rate, so a blade thrown
      // wide curves in rather than snapping — the ability is "homes if it is near", not "homes".
      const mark = this.nearestTarget(b.owner, b.x, b.y);
      if (mark && Phaser.Math.Distance.Between(b.x, b.y, mark.x, mark.y) <= BLADE_SEEK_R) {
        const want = Math.atan2(mark.y - b.y, mark.x - b.x);
        b.ang += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - b.ang), -BLADE_TURN * dt, BLADE_TURN * dt);
      }
      b.x += Math.cos(b.ang) * BLADE_SPEED * dt;
      b.y += Math.sin(b.ang) * BLADE_SPEED * dt;

      let spent = false;
      for (const t of this.targetsOf(b.owner)) {
        if (b.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > this.reach(t, 16)) continue;
        b.hits.add(t);
        t.takeDamage(BLADE_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, PAP.spectre);
        this.fx(b.owner).cut(t.x, t.y, 24, PAP.spectre);
        Sfx.playAt('hit-medium', t.x, { volume: 0.7, rate: 1.1 });
        spent = true;
      }

      const out = b.x < this.left || b.x > this.right || b.y < this.top || b.y > this.bottom;
      if (!spent && !out && this.now < b.diesAt) continue;
      this.fx(b.owner).shred(b.x, b.y, 4, 16, 320, 9, PAP.spectre);
      this.blades.splice(i, 1);
    }
  }

  // ── The fantasy spike ──────────────────────────────────────────────────────

  private updateSpikes(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const sp = this.spikes[i];

      // Parked in a portal between strikes: it exists, it is drawn, and it cannot be walked into.
      if (this.now < sp.armedAt) continue;

      sp.x += Math.cos(sp.ang) * SPIKE_SPEED * dt;
      sp.y += Math.sin(sp.ang) * SPIKE_SPEED * dt;

      let struck: Fighter | null = null;
      for (const t of this.targetsOf(sp.owner)) {
        if (Phaser.Math.Distance.Between(sp.x, sp.y, t.x, t.y) > this.reach(t, 14)) continue;
        struck = t;
        break;
      }

      if (struck) {
        struck.takeDamage(SPIKE_DAMAGE);
        this.api.spawnHitFlash(struck.x, struck.y, PAP.arcane);
        this.fx(sp.owner).cut(struck.x, struck.y, 22, PAP.arcane);
        sp.strikes++;
        if (sp.strikes >= SPIKE_STRIKES) {
          this.fx(sp.owner).shred(sp.x, sp.y, 6, 20, 380, 10, PAP.arcane);
          this.api.showFloatingText(struck.x, struck.y - 40, '📕 ×3', this.hex(PAP.arcane));
          this.spikes.splice(i, 1);
          continue;
        }
        // Through the portal and out again on the far side of the same body, so the follow-ups
        // come from somewhere the victim was not already backing away from.
        const a = Math.random() * TAU;
        sp.portalX = sp.x;
        sp.portalY = sp.y;
        sp.portalAt = this.now;
        sp.x = Phaser.Math.Clamp(struck.x + Math.cos(a) * SPIKE_WARP_DIST, this.left + 12, this.right - 12);
        sp.y = Phaser.Math.Clamp(struck.y + Math.sin(a) * SPIKE_WARP_DIST, this.top + 12, this.bottom - 12);
        sp.ang = Math.atan2(struck.y - sp.y, struck.x - sp.x);
        sp.armedAt = this.now + SPIKE_WARP_MS;
        sp.diesAt = this.now + SPIKE_LIFE_MS;
        Sfx.playAt('teleport', sp.x, { volume: 0.55, rate: 1.25 });
        continue;
      }

      const out = sp.x < this.left || sp.x > this.right || sp.y < this.top || sp.y > this.bottom;
      if (!out && this.now < sp.diesAt) continue;
      this.fx(sp.owner).shred(sp.x, sp.y, 3, 14, 300, 9, PAP.arcane);
      this.spikes.splice(i, 1);
    }
  }

  // ── Paper planes ───────────────────────────────────────────────────────────

  private updatePlanes(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.planes.length - 1; i >= 0; i--) {
      const pl = this.planes[i];
      const riding = !!pl.rider && this.alive(pl.rider);
      if (pl.rider && !riding) this.dismount(pl, false);

      if (riding) {
        // Gentle steering toward wherever the rider is aiming. A paper plane glides; it does not
        // turn on the spot, and the cap is what keeps E from being a homing dash.
        const s = this.sides[pl.owner];
        const want = Math.atan2(s.aimY - pl.y, s.aimX - pl.x);
        const turn = Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - pl.ang), -PLANE_STEER * dt, PLANE_STEER * dt);
        pl.ang += turn;
        pl.bank += (Phaser.Math.Clamp(turn / (PLANE_STEER * dt || 1), -1, 1) - pl.bank) * 0.2;
      } else {
        pl.bank += (0 - pl.bank) * 0.1;
      }

      const speed = riding ? PLANE_RIDE_SPEED : PLANE_SPEED;
      pl.x += Math.cos(pl.ang) * speed * dt;
      pl.y += Math.sin(pl.ang) * speed * dt;

      const drill = this.up(pl.owner, 'e');
      for (const t of this.targetsOf(pl.owner)) {
        if (pl.hits.has(t)) continue;
        if (Phaser.Math.Distance.Between(pl.x, pl.y, t.x, t.y) > this.reach(t, PLANE_HIT_R)) continue;
        pl.hits.add(t);
        t.takeDamage(PLANE_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, PAP.pulp);
        this.fx(pl.owner).cut(t.x, t.y, 24, PAP.crease);
        // Plane Drill: the plane does not pass through, it picks them up. Anything that cannot be
        // moved is simply hit — a drill that silently fails to carry reads as a broken upgrade.
        if (!drill || t.unstoppable || pl.drilled.includes(t)) continue;
        pl.drilled.push(t);
        this.api.showFloatingText(t.x, t.y - 38, '✈️ DRILLED', this.hex(PAP.crease));
      }

      // A ridden plane is clamped rather than killed at the wall, so a rider is never carried out
      // of the arena; a thrown one crumples against it.
      const hitWall = pl.x < this.left || pl.x > this.right || pl.y < this.top || pl.y > this.bottom;
      if (riding && hitWall) {
        pl.x = Phaser.Math.Clamp(pl.x, this.left, this.right);
        pl.y = Phaser.Math.Clamp(pl.y, this.top, this.bottom);
      }
      if (riding) {
        const r = pl.rider!;
        r.setPosition(pl.x, pl.y);
        this.body(r).reset(pl.x, pl.y);
      }
      // Passengers ride the nose, one frame behind nothing — the same position stomp the rider
      // gets, because anything gentler loses the fight with WASD.
      this.carryDrilled(pl);
      if (hitWall) this.detonateDrill(pl);

      if (this.now < pl.diesAt && !(hitWall && !riding)) continue;
      if (riding) this.dismount(pl, true);
      pl.drilled.length = 0;
      this.fx(pl.owner).shred(pl.x, pl.y, 6, 22, 420, 9);
      this.planes.splice(i, 1);
    }
  }

  /** Hold everyone the drill has speared on the plane's nose, inside the arena. */
  private carryDrilled(pl: Plane): void {
    if (pl.drilled.length === 0) return;
    for (let j = pl.drilled.length - 1; j >= 0; j--) {
      const t = pl.drilled[j];
      if (!this.alive(t) || t.unstoppable) { pl.drilled.splice(j, 1); continue; }
      const x = Phaser.Math.Clamp(pl.x + Math.cos(pl.ang) * 16, this.left + 12, this.right - 12);
      const y = Phaser.Math.Clamp(pl.y + Math.sin(pl.ang) * 16, this.top + 12, this.bottom - 12);
      t.setPosition(x, y);
      this.body(t).reset(x, y);
    }
  }

  /** The end of a drill run: everyone let go, and a small blast where the plane met the wall. */
  private detonateDrill(pl: Plane): void {
    if (pl.drilled.length === 0) return;
    const x = Phaser.Math.Clamp(pl.x, this.left, this.right);
    const y = Phaser.Math.Clamp(pl.y, this.top, this.bottom);
    pl.drilled.length = 0;

    for (const t of this.targetsOf(pl.owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > DRILL_AOE_R + 8 * t.sizeMult) continue;
      t.takeDamage(DRILL_AOE_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, PAP.crease);
    }
    this.fx(pl.owner).ripple(x, y, 10, DRILL_AOE_R, 380, 10, PAP.crease);
    this.fx(pl.owner).shred(x, y, 12, DRILL_AOE_R * 0.7, 460, 10);
    this.api.showFloatingText(x, y - 40, '✈️ CRASH', this.hex(PAP.crease));
    Sfx.playAt('explosion-small', x, { volume: 0.75, rate: 1.2 });
  }

  // ── Shuriken ───────────────────────────────────────────────────────────────

  private updateShurikens(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shurikens.length - 1; i >= 0; i--) {
      const sh = this.shurikens[i];
      const stuck = sh.stuckUntil > 0;
      const pinwheel = this.up(sh.owner, 'r');
      const r = SHURIKEN_R * (pinwheel ? PINWHEEL_SIZE_MULT : 1);
      sh.spin += dt * (stuck ? 9 : 22);

      if (!stuck) {
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;

        for (const t of this.targetsOf(sh.owner)) {
          if (sh.hits.has(t)) continue;
          if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > this.reach(t, r)) continue;
          sh.hits.add(t);
          this.cutAndBleed(sh.owner, t);
        }

        // It does not stop at the wall, it buries itself in it — so the stuck position is clamped
        // onto the boundary rather than left wherever the frame happened to put it.
        const past = sh.x <= this.left || sh.x >= this.right || sh.y <= this.top || sh.y >= this.bottom;
        if (past || time >= sh.diesAt) {
          sh.x = Phaser.Math.Clamp(sh.x, this.left, this.right);
          sh.y = Phaser.Math.Clamp(sh.y, this.top, this.bottom);
          // Every launch it has survived is banked here, so a pinwheel that keeps being shot off
          // the wall keeps getting harder to be rid of.
          sh.stuckUntil = time + SHURIKEN_STUCK_MS * (pinwheel ? PINWHEEL_STUCK_MULT : 1) + sh.bonusMs;
          sh.vx = 0;
          sh.vy = 0;
          this.fx(sh.owner).shred(sh.x, sh.y, 5, 16, 340, 9);
          Sfx.playAt('nail', sh.x, { volume: 0.6, rate: 1.4 });
        }
        continue;
      }

      // Buried: an ordinary hazard with a per-victim clock, and it cuts its owner's enemies only.
      for (const t of this.targetsOf(sh.owner)) {
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > this.reach(t, r)) continue;
        if (time < (sh.gate.get(t) ?? 0)) continue;
        sh.gate.set(t, time + SHURIKEN_STUCK_GATE_MS);
        this.cutAndBleed(sh.owner, t);
      }

      // Anything flying past a pinwheel spins it off the wall. Either side's shots count and the
      // shot is not eaten — the wheel is a thing in the room that reacts, not a shield.
      if (pinwheel && time >= sh.nextKickAt && this.projectileNear(sh.x, sh.y, r + 8)) {
        this.kickPinwheel(sh, time);
        continue;
      }

      if (time < sh.stuckUntil) continue;
      this.fx(sh.owner).shred(sh.x, sh.y, 7, 24, 420, 9);
      this.shurikens.splice(i, 1);
    }
  }

  /** Any live projectile from either side within `r` of a point, from both projectile systems. */
  private projectileNear(x: number, y: number, r: number): boolean {
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, x, y) <= r) return true;
    }
    return !!this.api.projectileRegistry.nearest('player', x, y, r)
      || !!this.api.projectileRegistry.nearest('npc', x, y, r);
  }

  /**
   * Kick a stuck pinwheel back into the room. Aimed roughly inward rather than truly at random —
   * it is pinned flat against a wall, so half of a full circle would put it straight back into
   * the same wall on the next frame and the launch would never be seen.
   */
  private kickPinwheel(sh: Shuriken, time: number): void {
    const inward = Math.atan2((this.top + this.bottom) / 2 - sh.y, (this.left + this.right) / 2 - sh.x);
    const ang = inward + (Math.random() - 0.5) * Math.PI * 1.1;
    sh.vx = Math.cos(ang) * SHURIKEN_SPEED;
    sh.vy = Math.sin(ang) * SHURIKEN_SPEED;
    sh.stuckUntil = 0;
    sh.hits.clear();
    sh.gate.clear();
    sh.bonusMs += PINWHEEL_BONUS_MS;
    sh.nextKickAt = time + PINWHEEL_GATE_MS;
    // No expiry in flight: "only stopping when hitting another wall" is the whole promise.
    sh.diesAt = time + 8000;
    this.fx(sh.owner).ripple(sh.x, sh.y, 8, 46, 300, 9, PAP.crease);
    this.api.showFloatingText(sh.x, sh.y - 34, '🌀 SPUN OFF', this.hex(PAP.crease));
    Sfx.playAt('whoosh', sh.x, { volume: 0.6, rate: 1.5 });
  }

  private cutAndBleed(owner: Owner, t: Fighter): void {
    t.takeDamage(SHURIKEN_DAMAGE);
    this.api.spawnHitFlash(t.x, t.y, PAP.blood);
    this.fx(owner).splat(t.x, t.y, 24, PAP.blood);
    this.applyBleed(owner, t);
    Sfx.playAt('slash', t.x, { volume: 0.7, rate: 1.1 });
  }

  /**
   * The bleed. Deliberately a fraction of what the victim has *left* rather than a flat number:
   * against a husk it is a rounding error and against a boss it is real, which is the right shape
   * for a debuff that is free damage attached to a hit you already landed.
   */
  private applyBleed(owner: Owner, t: Fighter): void {
    const until = this.now + BLEED_MS;
    const prev = this.bleeds.get(t);
    this.bleeds.set(t, {
      owner,
      until: Math.max(prev?.until ?? 0, until),
      nextTickAt: prev?.nextTickAt ?? this.now + BLEED_TICK_MS,
    });
    t.bleeding = true;
    t.bleedingUntil = Math.max(t.bleedingUntil, until);
    this.api.showFloatingText(t.x, t.y - 34, '🩸 BLEEDING', this.hex(PAP.blood));
  }

  private updateBleeds(time: number): void {
    for (const [t, b] of [...this.bleeds]) {
      if (!this.alive(t) || time >= b.until) {
        if (t?.active) t.bleeding = false;
        this.bleeds.delete(t);
        continue;
      }
      if (time < b.nextTickAt) continue;
      b.nextTickAt = time + BLEED_TICK_MS;
      const dmg = Math.max(1, Math.round(t.hp * BLEED_FRACTION));
      t.takeDamage(dmg);
      this.fx(b.owner).splat(t.x, t.y + 8, 14, PAP.blood);
    }
  }

  // ── Mâché monsters ─────────────────────────────────────────────────────────

  private updateMaches(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.maches.length - 1; i >= 0; i--) {
      const m = this.maches[i];

      if (m.alive) {
        if (!this.alive(m.target)) m.target = this.nearestTarget(m.owner, m.x, m.y);
        const t = m.target;
        // A monster that has not eaten anything yet walks; an enraged one runs and bites twice
        // as hard. Both are the same creature, which is why only the two numbers differ.
        const speed = m.enraged ? MACHE_CHARGE_SPEED : MACHE_HUNT_SPEED;
        const damage = m.enraged ? MACHE_CHARGE_DAMAGE : MACHE_HUNT_DAMAGE;
        if (t) {
          const a = Math.atan2(t.y - m.y, t.x - m.x);
          m.x += Math.cos(a) * speed * dt;
          m.y += Math.sin(a) * speed * dt;
          m.spin += dt * (m.enraged ? 6 : 3.4);
          m.open = 0.6 + Math.sin(this.vizT * (m.enraged ? 16 : 8)) * 0.4;
          if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) <= this.reach(t, MACHE_BITE_R)) {
            t.takeDamage(damage);
            this.api.spawnHitFlash(t.x, t.y, PAP.pulp);
            this.fx(m.owner).shred(t.x, t.y, 7, 22, 420, 10);
            this.api.showFloatingText(t.x, t.y - 36, '👹 CHOMP', this.hex(PAP.crease));
            Sfx.playAt('claw', t.x, { volume: 0.7, rate: m.enraged ? 1.15 : 1.35 });
            this.maches.splice(i, 1);
            continue;
          }
        }
        // Still swallows the bullet that would have flown past it — that is what enrages it, and
        // the bullet stopping is half of why a wall of monsters is worth having.
        if (!m.enraged && this.eatNearbyProjectile(m)) this.enrage(m);
        if (this.now < m.diesAt) continue;
        this.fx(m.owner).shred(m.x, m.y, 5, 18, 380, 9);
        this.maches.splice(i, 1);
        continue;
      }

      // ── Face-up on the floor ──
      m.open = 0.3 + Math.sin(this.vizT * 2.4 + m.seed) * 0.12;

      // Bite anything that walks over it. The monster is spent either way — this is a mine.
      let bit = false;
      for (const t of this.targetsOf(m.owner)) {
        if (Phaser.Math.Distance.Between(m.x, m.y, t.x, t.y) > this.reach(t, MACHE_BITE_R)) continue;
        t.takeDamage(MACHE_BITE_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, PAP.pulp);
        this.fx(m.owner).shred(m.x, m.y, 6, 20, 400, 10);
        this.api.showFloatingText(t.x, t.y - 34, '👹 BITE', this.hex(PAP.crease));
        Sfx.playAt('trap-snap', t.x, { volume: 0.6, rate: 1.3 });
        bit = true;
        break;
      }
      if (bit) { this.maches.splice(i, 1); continue; }

      if (this.eatNearbyProjectile(m)) {
        this.enrage(m);
        continue;
      }

      if (this.now < m.diesAt) continue;
      this.fx(m.owner).shred(m.x, m.y, 4, 14, 340, 9);
      this.maches.splice(i, 1);
    }
  }

  /** A monster that has just swallowed a shot: on its feet, faster, and worth 8 instead of 4. */
  private enrage(m: Mache): void {
    m.alive = true;
    m.enraged = true;
    m.target = this.nearestTarget(m.owner, m.x, m.y);
    m.diesAt = this.now + MACHE_CHARGE_LIFE_MS;
    this.fx(m.owner).ripple(m.x, m.y, 6, 34, 320, 9, PAP.pulp);
    this.api.showFloatingText(m.x, m.y - 26, '👹 ENRAGED!', this.hex(PAP.ink));
    Sfx.playAt('trap-snap', m.x, { volume: 0.75, rate: 0.85 });
  }

  /**
   * Swallow one enemy projectile passing over this monster, if there is one.
   *
   * Two sources, because the game has two: the shared physics group that most elements fire into,
   * and the registry that kit-local projectiles publish themselves to. Missing the second would
   * make the ability read as broken against half the roster.
   */
  private eatNearbyProjectile(m: Mache): boolean {
    const fromPlayer = m.owner === 'npc';
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer !== fromPlayer || p.isHeal) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) > MACHE_EAT_R) continue;
      p.destroy();
      return true;
    }
    const enemyOwner: Owner = m.owner === 'player' ? 'npc' : 'player';
    const reg = this.api.projectileRegistry.nearest(enemyOwner, m.x, m.y, MACHE_EAT_R);
    if (!reg) return false;
    this.api.projectileRegistry.steal(reg);
    return true;
  }

  // ── Knight Climax ──────────────────────────────────────────────────────────

  private updateCharges(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const c = this.charges[i];
      let anyOnScreen = false;

      for (const r of c.riders) {
        if (time < r.startAt) { anyOnScreen = true; continue; }
        r.x += r.dir * CHARGE_SPEED * dt;
        r.phase += dt * 16;
        if (r.x > this.left - 120 && r.x < this.right + 120) anyOnScreen = true;

        for (const t of this.targetsOf(c.owner)) {
          if (c.hits.has(t)) continue;
          if (Math.abs(t.x - r.x) > CHARGE_HIT_R || Math.abs(t.y - r.y) > CHARGE_HIT_R * 1.2) continue;
          // One set for the whole wave: twelve riders are one attack, not twelve.
          c.hits.add(t);
          t.takeDamage(CHARGE_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, PAP.spectre);
          this.fx(c.owner).cut(t.x, t.y, 46, PAP.spectre);
          this.api.showFloatingText(t.x, t.y - 44, '⚔️ RIDDEN DOWN', this.hex(PAP.spectre));
          Sfx.playAt('hit-heavy', t.x, { volume: 1, rate: 0.9 });
        }
      }

      if (anyOnScreen && time < c.diesAt) continue;
      this.charges.splice(i, 1);
    }
  }

  // ── Alien Climax ───────────────────────────────────────────────────────────

  private updateBombs(time: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      if (time < b.landsAt) continue;

      this.fx(b.owner).beam(b.x, b.y - 260, b.x, b.y, 8, 200, 12);
      this.fx(b.owner).detonation(b.x, b.y, BOMB_R, 520, 12);
      // Every beam still gets its own light and crater; only the audio is thinned.
      if (time - this.lastBombSfxAt >= BOMB_SFX_GAP_MS) {
        this.lastBombSfxAt = time;
        Sfx.playAt('explosion-medium', b.x, { volume: 0.8, rate: 1.15 });
      }

      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BOMB_R + 8 * t.sizeMult) continue;
        t.takeDamage(BOMB_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, PAP.beam);
        this.stun(t, BOMB_STUN_MS);
      }
      this.bombs.splice(i, 1);
    }
  }

  /**
   * Paper's only stun. `earthStunnedUntil` is the field the husk AI and ArenaScene's own npc
   * override already read, but nothing consumes it for the *player* — so the kit holds the
   * velocity at zero itself, exactly as Hunt and Fate do.
   */
  private stun(t: Fighter, ms: number, label = '💫 STUNNED', color = PAP.beam): void {
    if (t.unstoppable) return;
    const until = this.now + ms;
    t.earthStunnedUntil = Math.max(t.earthStunnedUntil, until);
    this.stunned.set(t, Math.max(this.stunned.get(t) ?? 0, until));
    this.api.showFloatingText(t.x, t.y - 38, label, this.hex(color));
  }

  private updateStuns(): void {
    for (const [t, until] of [...this.stunned]) {
      if (!this.alive(t) || this.now >= until) { this.stunned.delete(t); continue; }
      if (t.unstoppable) { this.stunned.delete(t); continue; }
      this.body(t).setVelocity(0, 0);
    }
  }

  // ── Fantasy Climax ─────────────────────────────────────────────────────────

  private updateSpirits(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.spirits.length - 1; i >= 0; i--) {
      const sp = this.spirits[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;

      // A DVD logo: reflect, clamp, and never lose speed.
      if (sp.x < this.left + SPIRIT_R) { sp.x = this.left + SPIRIT_R; sp.vx = Math.abs(sp.vx); }
      if (sp.x > this.right - SPIRIT_R) { sp.x = this.right - SPIRIT_R; sp.vx = -Math.abs(sp.vx); }
      if (sp.y < this.top + SPIRIT_R) { sp.y = this.top + SPIRIT_R; sp.vy = Math.abs(sp.vy); }
      if (sp.y > this.bottom - SPIRIT_R) { sp.y = this.bottom - SPIRIT_R; sp.vy = -Math.abs(sp.vy); }

      if (time >= sp.nextTrailAt) {
        sp.nextTrailAt = time + SPIRIT_TRAIL_MS;
        this.trails.push({
          owner: sp.owner, x: sp.x, y: sp.y,
          diesAt: time + TRAIL_LIFE_MS,
          seed: Math.random() * 999,
          gate: new Map<Fighter, number>(),
        });
      }

      if (time < sp.endsAt) continue;
      this.fx(sp.owner).shred(sp.x, sp.y, 10, 34, 520, 10, PAP.flame);
      this.spirits.splice(i, 1);
    }
  }

  private updateTrails(time: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      for (const t of this.targetsOf(tr.owner)) {
        if (Phaser.Math.Distance.Between(tr.x, tr.y, t.x, t.y) > TRAIL_R + 6 * t.sizeMult) continue;
        if (time < (tr.gate.get(t) ?? 0)) continue;
        tr.gate.set(t, time + TRAIL_TICK_MS);
        t.takeDamage(TRAIL_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, PAP.flame);
      }
      if (time < tr.diesAt) continue;
      this.trails.splice(i, 1);
    }
  }

  // ── Larger Library: the Bible's slab ───────────────────────────────────────

  /**
   * The slab is tested as the rectangle it is drawn as rather than as a circle: it is four times
   * wider than it is thick, and a radius around its centre would miss most of what it visibly
   * sweeps through.
   */
  private updateSlabs(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.slabs.length - 1; i >= 0; i--) {
      const sl = this.slabs[i];
      const ca = Math.cos(sl.ang);
      const sa = Math.sin(sl.ang);
      sl.x += ca * SLAB_SPEED * dt;
      sl.y += sa * SLAB_SPEED * dt;

      for (const t of this.targetsOf(sl.owner)) {
        if (sl.hits.has(t)) continue;
        const dx = t.x - sl.x;
        const dy = t.y - sl.y;
        const along = Math.abs(dx * ca + dy * sa);
        const across = Math.abs(-dx * sa + dy * ca);
        if (along > this.reach(t, SLAB_WIDTH * 0.5) || across > this.reach(t, SLAB_LEN * 0.5)) continue;
        sl.hits.add(t);
        t.takeDamage(SLAB_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, PAP.halo);
        this.fx(sl.owner).cut(t.x, t.y, 30, PAP.halo);
        this.shove(t, sl.ang, SLAB_KNOCK);
        this.api.showFloatingText(t.x, t.y - 40, '📙 CAST OUT', this.hex(PAP.halo));
        Sfx.playAt('judgement', t.x, { volume: 0.8, rate: 1.05 });
      }

      const out = sl.x < this.left - SLAB_LEN || sl.x > this.right + SLAB_LEN
        || sl.y < this.top - SLAB_LEN || sl.y > this.bottom + SLAB_LEN;
      if (!out && this.now < sl.diesAt) continue;
      this.fx(sl.owner).ripple(sl.x, sl.y, 8, 40, 300, 9, PAP.halo);
      this.slabs.splice(i, 1);
    }
  }

  // ── Larger Library: the Herbology seeds ────────────────────────────────────

  /**
   * A seed is worth whatever the closest it ever came to a body was — banked as it flies, cashed
   * on the wall, and thrown away entirely if it actually connects. Nothing else in the kit asks
   * you to *miss* on purpose, so the running minimum is the whole ability.
   */
  private updateSeeds(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const sd = this.seeds[i];
      sd.x += Math.cos(sd.ang) * SEED_SPEED * dt;
      sd.y += Math.sin(sd.ang) * SEED_SPEED * dt;

      let spent = false;
      for (const t of this.targetsOf(sd.owner)) {
        const d = Phaser.Math.Distance.Between(sd.x, sd.y, t.x, t.y);
        if (d < sd.near) sd.near = d;
        if (d > this.reach(t, SEED_R)) continue;
        // It touched them. No damage, no heal — a seed that hits is simply wasted.
        spent = true;
        this.fx(sd.owner).splat(sd.x, sd.y, 12, PAP.leafDeep);
        this.api.showFloatingText(sd.x, sd.y - 26, '📓 WASTED', this.hex(PAP.leafDeep));
        break;
      }
      if (spent) { this.seeds.splice(i, 1); continue; }

      const wall = sd.x <= this.left || sd.x >= this.right || sd.y <= this.top || sd.y >= this.bottom;
      if (wall) {
        this.cashSeed(sd);
        this.seeds.splice(i, 1);
        continue;
      }
      if (this.now < sd.diesAt) continue;
      this.fx(sd.owner).shred(sd.x, sd.y, 3, 12, 280, 9, PAP.leaf);
      this.seeds.splice(i, 1);
    }
  }

  /** How much a seed has banked: base at arm's length, everything at a graze. */
  private seedCharge(sd: Seed): number {
    if (!isFinite(sd.near)) return 0;
    return Phaser.Math.Clamp((SEED_FAR - sd.near) / (SEED_FAR - SEED_NEAR), 0, 1);
  }

  private cashSeed(sd: Seed): void {
    const f = this.fighter(sd.owner);
    const charge = this.seedCharge(sd);
    const amount = SEED_HEAL + Math.round(SEED_HEAL_BONUS * charge);
    const x = Phaser.Math.Clamp(sd.x, this.left, this.right);
    const y = Phaser.Math.Clamp(sd.y, this.top, this.bottom);
    this.fx(sd.owner).ripple(x, y, 5, 26 + charge * 22, 320, 9, PAP.leaf);
    if (!this.alive(f)) return;
    const before = f.hp;
    f.heal(amount);
    const gained = Math.round(f.hp - before);
    if (gained <= 0) return;
    this.api.showFloatingText(f.x, f.y - 30, `🌿 +${gained}`, this.hex(PAP.leaf));
  }

  // ── Larger Library: the crucifix and the lotus ─────────────────────────────

  /**
   * The chain is re-asserted every frame rather than applied once, because a stun written as a
   * timestamp can be overwritten by anything that writes the same field — and five seconds is
   * long enough for something to.
   */
  private updateCrosses(time: number): void {
    for (let i = this.crosses.length - 1; i >= 0; i--) {
      const c = this.crosses[i];
      const held = this.alive(c.target) && !c.target.unstoppable;
      if (held && time < c.endsAt) {
        c.x = c.target.x;
        c.y = c.target.y;
        c.target.earthStunnedUntil = Math.max(c.target.earthStunnedUntil, c.endsAt);
        this.stunned.set(c.target, Math.max(this.stunned.get(c.target) ?? 0, c.endsAt));
        continue;
      }
      // Left standing for a beat after it lets go, so the release is visible.
      if (time < c.endsAt + CROSS_FADE_MS) continue;
      this.fx(c.owner).shred(c.x, c.y, 6, 26, 420, 9, PAP.halo);
      this.crosses.splice(i, 1);
    }
  }

  private updateLotuses(time: number): void {
    for (let i = this.lotuses.length - 1; i >= 0; i--) {
      if (time < this.lotuses[i].diesAt) continue;
      this.lotuses.splice(i, 1);
    }
  }

  // ── Knockback ──────────────────────────────────────────────────────────────

  private shove(t: Fighter, ang: number, distance: number): void {
    const speed = distance / (SHOVE_MS / 1000);
    this.shoves = this.shoves.filter((s) => s.target !== t);
    this.shoves.push({
      target: t,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      until: this.now + SHOVE_MS,
    });
  }

  private updateShoves(dt: number): void {
    if (this.shoves.length === 0) return;
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const s = this.shoves[i];
      if (!this.alive(s.target) || this.now >= s.until) { this.shoves.splice(i, 1); continue; }
      // Eases out over its life, so a shove decelerates rather than stopping dead.
      const left = Phaser.Math.Clamp((s.until - this.now) / SHOVE_MS, 0, 1);
      const x = Phaser.Math.Clamp(s.target.x + s.vx * dt * left * 2, this.left + 12, this.right - 12);
      const y = Phaser.Math.Clamp(s.target.y + s.vy * dt * left * 2, this.top + 12, this.bottom - 12);
      s.target.setPosition(x, y);
      this.body(s.target).reset(x, y);
    }
  }

  // ── The Journal ────────────────────────────────────────────────────────────

  /**
   * The passive. Everything the save has written up about the element you are fighting, applied
   * to this frame.
   *
   * Player-only by construction — the journal is save-backed, an npc has no save, and that is
   * exactly why `journalIncomingMult` can safely mean two opposite things on the two sides of the
   * fight (a resist on you, a vulnerability on them) without ever colliding.
   */
  private updateJournal(playerIs: boolean, delta: number): void {
    for (const f of [...this.touched]) {
      f.journalIncomingMult = 1;
      if (!this.alive(f)) this.touched.delete(f);
    }
    if (!playerIs) { this.bonuses = NO_JOURNAL_BONUSES; this.bonusesFor = ''; return; }

    if (this.bonusesFor !== this.api.npcElementId) {
      this.bonusesFor = this.api.npcElementId;
      this.bonuses = journalBonuses(this.bonusesFor);
    }
    const p = this.api.player;
    if (!this.alive(p)) return;

    if (this.bonuses.resist > 0) {
      p.journalIncomingMult = 1 - this.bonuses.resist;
      this.touched.add(p);
    }
    if (this.bonuses.pressure > 0) {
      for (const t of this.targetsOf('player')) {
        t.journalIncomingMult = 1 + this.bonuses.pressure;
        this.touched.add(t);
      }
    }

    // The shield is paid once. Deferred to the first frame rather than done in `reset()` because
    // `reset()` runs before ArenaScene has finished standing the fighters up.
    if (!this.guardGranted) {
      this.guardGranted = true;
      seedEffectSnapshot(p, this.shrugSnapshot);
      if (this.bonuses.guard > 0) {
        p.shieldHp += this.bonuses.guard;
        this.api.showFloatingText(p.x, p.y - 52, `📖 +${this.bonuses.guard} SHIELD`, this.hex(PAP.gilt));
      }
      if (this.bonuses.unlocked > 0) {
        const name = journalElementName(this.api.npcElementId);
        this.api.showFloatingText(p.x, p.y - 70,
          `📖 ${this.bonuses.unlocked}/6 ON ${name.toUpperCase()}`, this.hex(PAP.gilt));
      }
    }

    // The shrug entries. Diffed against last frame's expiries, so a debuff applied this tick has
    // whatever it has left scaled down — see `shrugSnapshot`.
    void delta;
    if (this.bonuses.shrug > 0) {
      stretchNewEffects(p, Date.now(), this.now, 1 - this.bonuses.shrug, this.shrugSnapshot, isDebuff);
    } else {
      seedEffectSnapshot(p, this.shrugSnapshot);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    for (const owner of ['player', 'npc'] as Owner[]) {
      const is = owner === 'player' ? playerIs : npcIs;
      let av = this.avatar(owner);
      if (!is) {
        if (av) av.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        continue;
      }
      const f = this.fighter(owner);
      const s = this.sides[owner];
      if (!av) {
        av = new PaperAvatar(scene, this.col(owner));
        av.setBook(s.book);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setIntensity(this.now < s.laserUntil ? 1.35 : 1);
      // Both of Paper's sustained poses are resolved here rather than at their cast sites: the
      // rig allows exactly one hold at a time, so two abilities setting and clearing it
      // independently would have a dismount cancel a laser that was still firing.
      av.setBook(s.book);
      av.setHold(this.isRiding(owner) ? 'ride' : this.now < s.laserUntil ? 'spray' : null);
      // Crumples as he runs out of health. Paper is the one element where "nearly dead" can be a
      // silhouette change rather than a health bar you have to look away to read.
      av.setCrumple(f.maxHp > 0 ? Phaser.Math.Clamp(1 - f.hp / f.maxHp, 0, 1) : 0);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Monsters, target rings and burning scraps — everything you walk on. */
  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const b of this.bombs) {
      const k = Phaser.Math.Clamp(1 - (b.landsAt - this.now) / BOMB_ARM_MS, 0, 1);
      targetRing(g, this.col(b.owner), b.x, b.y, BOMB_R, k, 1, { seed: b.seed });
    }

    for (const tr of this.trails) {
      const life = Phaser.Math.Clamp((tr.diesAt - this.now) / TRAIL_LIFE_MS, 0, 1);
      burningScrap(g, this.col(tr.owner), tr.x, tr.y, TRAIL_R * (0.6 + life * 0.4), life,
        0.5 + life * 0.5, { seed: tr.seed, t: this.vizT });
    }

    // Crucifixes go on the floor layer on purpose: whoever is chained to one should be standing
    // in front of it, not behind it.
    for (const c of this.crosses) {
      const over = this.now - c.endsAt;
      const fade = over <= 0 ? 1 : Phaser.Math.Clamp(1 - over / CROSS_FADE_MS, 0, 1);
      crucifixShape(g, this.col(c.owner), c.x, c.y + 14, 26, fade, { t: this.vizT });
    }

    for (const lo of this.lotuses) {
      const age = (this.now - lo.bornAt) / 460;
      const open = Phaser.Math.Clamp(age, 0, 1);
      const fade = Phaser.Math.Clamp((lo.diesAt - this.now) / 700, 0, 1);
      lotusBloom(g, this.col(lo.owner), lo.x, lo.y, 54, open, fade, { t: this.vizT, seed: lo.seed });
    }

    for (const m of this.maches) {
      if (m.alive) continue;
      const left = Phaser.Math.Clamp((m.diesAt - this.now) / MACHE_LIFE_MS, 0, 1);
      // Fades out over its last second rather than vanishing, so a monster you were counting on
      // never disappears without warning.
      fortuneTeller(g, this.col(m.owner), m.x, m.y, MACHE_R, m.open, Math.min(1, left * 6),
        { seed: m.seed, spin: m.spin });
    }
  }

  /** Everything thrown, ridden, charging or on fire. */
  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Charging monsters, drawn up here because they are off the floor ──
    for (const m of this.maches) {
      if (!m.alive) continue;
      const hop = Math.abs(Math.sin(this.vizT * 14)) * 7;
      fortuneTeller(g, this.col(m.owner), m.x, m.y - hop, MACHE_R * 1.15, m.open, 1,
        { seed: m.seed, spin: m.spin, drop: 4 + hop });
    }

    // ── Shuriken, or the pinwheel it becomes ──
    for (const sh of this.shurikens) {
      const stuck = sh.stuckUntil > 0;
      const fade = stuck ? Phaser.Math.Clamp((sh.stuckUntil - this.now) / 900, 0, 1) : 1;
      const pinwheel = this.up(sh.owner, 'r');
      const r = SHURIKEN_R * (pinwheel ? PINWHEEL_SIZE_MULT : 1) * (stuck ? 1 : 1.1);
      if (pinwheel) {
        pinwheelShape(g, this.col(sh.owner), sh.x, sh.y, sh.spin, r, fade,
          { accent: stuck ? PAP.blood : PAP.crease, stuck: stuck ? 1 : 0 });
      } else {
        shurikenShape(g, this.col(sh.owner), sh.x, sh.y, sh.spin, r, fade,
          { accent: stuck ? PAP.blood : PAP.crease });
      }
    }

    // ── The Bible's slabs, and the chains its crucifixes are holding ──
    for (const sl of this.slabs) {
      lightSlab(g, this.col(sl.owner), sl.x, sl.y, sl.ang, SLAB_LEN, SLAB_WIDTH, 1, { seed: sl.seed });
    }
    for (const c of this.crosses) {
      if (this.now >= c.endsAt || !this.alive(c.target)) continue;
      // Two runs from the crossbar down to the wrists — the chain is what says "held", and it has
      // to be drawn over the body rather than under it.
      const barY = c.y + 14 - 26 * 2 * 0.56;
      for (const s of [-1, 1]) {
        chainRun(g, this.col(c.owner), c.x + s * 24, barY, c.target.x + s * 11, c.target.y - 2, 5, 0.95);
      }
    }

    // ── The Herbology seeds ──
    for (const sd of this.seeds) {
      herbSeed(g, this.col(sd.owner), sd.x, sd.y, sd.ang, SEED_R, this.seedCharge(sd), 1);
    }

    // ── Excalibur, the spike and its portals ──
    for (const b of this.blades) {
      ghostBlade(g, this.col(b.owner), b.x, b.y, b.ang, 26, 0.95);
    }
    for (const sp of this.spikes) {
      const warping = this.now < sp.armedAt;
      if (sp.portalAt > 0) {
        // Two tears: the one it left through, closing, and the one it is arriving from.
        const k = (this.now - sp.portalAt) / SPIKE_WARP_MS;
        portalTear(g, this.col(sp.owner), sp.portalX, sp.portalY, 20, k, 1, { seed: sp.seed, spin: this.vizT * 2 });
        portalTear(g, this.col(sp.owner), sp.x, sp.y, 22, k, 1, { seed: sp.seed + 3, spin: -this.vizT * 2 });
      }
      arcaneSpike(g, this.col(sp.owner), sp.x, sp.y, sp.ang, 16, warping ? 0.55 : 1,
        { trail: warping ? 0 : 1 });
    }

    // ── Planes ──
    for (const pl of this.planes) {
      paperPlaneShape(g, this.col(pl.owner), pl.x, pl.y, pl.ang, pl.rider ? 20 : 15, 1,
        { accent: this.tone(pl.owner).accent, bank: pl.bank });
    }

    // ── The cavalry ──
    for (const c of this.charges) {
      for (const r of c.riders) {
        if (this.now < r.startAt) continue;
        ghostKnight(g, this.col(c.owner), r.x, r.y, r.dir, r.scale, 0.85,
          { mounted: r.mounted, phase: r.phase });
      }
    }

    // ── The spirit ──
    for (const sp of this.spirits) {
      const fade = Phaser.Math.Clamp((sp.endsAt - this.now) / 700, 0, 1);
      flameSpirit(g, this.col(sp.owner), sp.x, sp.y, SPIRIT_R, fade, this.vizT,
        { seed: sp.seed, vx: sp.vx, vy: sp.vy });
    }

    // ── The open book's page, floating over a laser burst ──
    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (this.now >= s.laserUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const k = (s.laserUntil - this.now) / LASER_BURST_MS;
      paperSheet(g, this.col(owner), f.x, f.y - 40 - (1 - k) * 6, Math.sin(this.vizT * 3) * 0.2,
        22, 16, 0.8, { color: PAP.beam, seed: 9, curl: 1, drop: 2 });
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(time: number, playerIs: boolean): void {
    const s = this.sides.player;
    const tone = BOOK_TONE[s.book];

    this.api.setStatusIndicator('paper-book', playerIs ? {
      name: `${tone.name} Book`, emoji: tone.emoji, color: tone.accent,
      description: BOOK_BLURB[s.book] + ' Right-click to turn the page.',
      priority: 152,
    } : null);

    this.api.setStatusIndicator('paper-reload', playerIs && time < s.reloadUntil ? {
      name: 'Reloading', emoji: '📘', color: PAP.beamDeep,
      description: 'The Alien book is spent. The click does nothing until it is back — and turning the page will not skip it.',
      until: s.reloadUntil, priority: 8,
    } : null);

    const b = this.bonuses;
    this.api.setStatusIndicator('paper-journal', playerIs && b.unlocked > 0 ? {
      name: 'Journal', emoji: '📖', color: PAP.gilt,
      description: `${b.unlocked} of 6 entries written up on ${journalElementName(this.api.npcElementId)}.`
        + (b.resist > 0 ? ` Taking ${Math.round(b.resist * 100)}% less from it.` : '')
        + (b.pressure > 0 ? ` Dealing ${Math.round(b.pressure * 100)}% more to it.` : '')
        + (b.shrug > 0 ? ` Its debuffs wear off ${Math.round(b.shrug * 100)}% sooner.` : '')
        + (b.footwork > 0 ? ` Moving ${Math.round(b.footwork * 100)}% faster.` : '')
        + (b.guard > 0 ? ` Started with ${b.guard} shield.` : ''),
      count: b.unlocked, priority: 154,
    } : null);

    this.api.setStatusIndicator('paper-riding', playerIs && this.planes.some((p) => p.rider === this.api.player) ? {
      name: 'Gliding', emoji: '✈️', color: PAP.crease,
      description: 'Riding the plane. It steers gently toward your cursor and puts you down the moment you let go of E.',
      priority: 130,
    } : null);
  }

  // ── Cross-kit contracts ────────────────────────────────────────────────────

  /**
   * Ruin's Spikes of Ruin. The monsters and the buried shuriken are things somebody placed on the
   * floor, so both go; planes, blades, spikes and the spirit are in flight and stay, and the
   * bleed is a status rather than a structure.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.maches.length - 1; i >= 0; i--) {
      const m = this.maches[i];
      if (m.owner === exceptOwner) continue;
      if (Phaser.Math.Distance.Between(x, y, m.x, m.y) > radius) continue;
      report?.(m.x, m.y);
      this.fx(m.owner).shred(m.x, m.y, 5, 18, 380, 9);
      this.maches.splice(i, 1);
      razed++;
    }
    for (let i = this.shurikens.length - 1; i >= 0; i--) {
      const sh = this.shurikens[i];
      if (sh.owner === exceptOwner || sh.stuckUntil === 0) continue;
      if (Phaser.Math.Distance.Between(x, y, sh.x, sh.y) > radius) continue;
      report?.(sh.x, sh.y);
      this.fx(sh.owner).shred(sh.x, sh.y, 6, 20, 400, 9);
      this.shurikens.splice(i, 1);
      razed++;
    }
    return razed;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** The `footwork` journal entries. Pulled by ArenaScene's speed aggregate every frame. */
  getPlayerSpeedMult(): number {
    return this.api.elementId === 'paper' ? 1 + this.bonuses.footwork : 1;
  }

  /** Which book that side has open — the bot's branch selector, and the info panel's. */
  getBook(owner: Owner): number { return this.sides[owner].book; }
  /** True while the Alien book is mid-burst or mid-reload: the bot must not click. */
  isLaserBusy(owner: Owner): boolean {
    const s = this.sides[owner];
    return this.now < s.laserUntil || this.now < s.reloadUntil;
  }
  /** True while that side is glued to a plane. */
  isRiding(owner: Owner): boolean {
    const f = this.fighter(owner);
    return this.planes.some((p) => p.rider === f);
  }
  /** How many monsters that side still has lying about — the bot's re-cast check. */
  macheCount(owner: Owner): number {
    return this.maches.filter((m) => m.owner === owner).length;
  }

  /**
   * Ability tray fill. The click spends most of its life showing the Alien book's two clocks
   * rather than a cooldown, because that is the only thing gating it.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'paper-storybook') {
      if (time < s.laserUntil) return Phaser.Math.Clamp((s.laserUntil - time) / LASER_BURST_MS, 0, 1);
      if (time < s.reloadUntil) return 1 - Phaser.Math.Clamp((s.reloadUntil - time) / LASER_RELOAD_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }
}
