import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  DPT, DepthsAvatar, DepthsColorFn, DepthsFx, FISH_COLOR, FISH_EMOJI, FISH_LABEL,
  FISH_PROFILE, FishKind, QuietDepthsFx, REMORA_PROFILE, algaeOrb, bubbleColumn, darkPuddle,
  fishBody, krakenArm, krakenHead, oxygenBar, piranha as drawPiranha, poisonBarb, sharkBody,
} from './DepthsVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';
type Slot = 'e' | 'r' | 'f' | 'q';
const SLOTS: Slot[] = ['e', 'r', 'f', 'q'];

const ARENA_PAD = 32;

// ── Passive: the anglerfish lure ─────────────────────────────────────────────
/** How long you have to stand still before the water starts taking you. */
const LURE_DELAY_MS = 450;
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 220;
/** How far in front of you the fake orb hangs — far enough that a biter is *beside* you. */
const LURE_STANDOFF = 56;
const LURE_BITE_R = 44;
/** The reward for a bite, and the window it lasts. */
const BOOST_MULT = 1.5;
const BOOST_MS = 1000;
/** After a bite, the lure can't be re-armed instantly — otherwise one stand is infinite boost. */
const LURE_REARM_MS = 1600;

// ── Piranha (Click) ──────────────────────────────────────────────────────────
const PIRANHA_SPEED = 640;
const PIRANHA_LIFE_MS = 1700;
const PIRANHA_HIT_R = 24;
const LATCH_MS = 3000;
const LATCH_DPS = 3;
const MAX_LATCH = 5;

// ── Lungfish Strike (E) ──────────────────────────────────────────────────────
const DASH_SPEED = 720;
const DASH_MS = 170;
const SLASH_REACH = 96;
const SLASH_HALF_WIDTH = 44;
const SLASH_DAMAGE = 15;
const SLASH_DAMAGE_BOOSTED = 30;
/** Air in the lungs, then how hard the water starts pressing. */
const O2_DRAIN_MS = 5000;
const DROWN_DPS = 12;
const DROWN_TOTAL_MS = 12000;
const PUDDLE_R = 48;
/** A puddle any closer than this to the victim isn't a run, it's a step. */
const PUDDLE_MIN_DIST = 280;

// ── Eutrophication (R) ───────────────────────────────────────────────────────
const ALGAE_COUNT = 12;
const ALGAE_HEAL = 12;
const ALGAE_R = 28;
const ALGAE_LIFE_MS = 25000;

// ── Angler (F) ───────────────────────────────────────────────────────────────
const FISH_CATCH_MS = 3000;
/** Every hit taken while the line is out drags the catch back by a second. */
const FISH_DAMAGE_PENALTY_MS = 1000;
/** How long the NPC admires its catch before throwing it. */
const NPC_THROW_DELAY_MS = 600;

const ALL_FISH: FishKind[] = ['icefish', 'barracuda', 'pufferfish', 'bombfish', 'gulper'];

const ICEFISH_DAMAGE = 15;
const ICEFISH_SLOW_MULT = 0.8;
const ICEFISH_SLOW_MS = 5000;
const BARRACUDA_DAMAGE = 25;
const PUFFER_DAMAGE = 15;
const PUFFER_LIFE_MS = 6000;
const PUFFER_REHIT_MS = 700;
const BOMBFISH_DAMAGE = 20;
const BOMBFISH_R = 92;
const GULPER_DPS = 10;

/** Speed, hit radius and lifetime for each thrown fish. */
const FISH_STATS: Record<FishKind, { speed: number; r: number; life: number; len: number }> = {
  icefish: { speed: 620, r: 22, life: 2200, len: 34 },
  barracuda: { speed: 800, r: 20, life: 2000, len: 46 },
  pufferfish: { speed: 400, r: 30, life: PUFFER_LIFE_MS, len: 34 },
  bombfish: { speed: 540, r: 24, life: 2400, len: 32 },
  gulper: { speed: 460, r: 30, life: 5000, len: 52 },
  sawfish: { speed: 560, r: 24, life: 2400, len: 46 },
  swordfish: { speed: 880, r: 22, life: 2200, len: 54 },
  // Speed and life restated rather than shared with WHALE_* below: this table is built at
  // module load, and those constants are declared further down the file.
  whaleshark: { speed: 150, r: 44, life: 12000, len: 100 },
  flyingfish: { speed: 900, r: 22, life: 3000, len: 32 },
  // Never actually thrown — resolved the instant it leaves your jaw. Here for the held-fish art.
  catfish: { speed: 420, r: 26, life: 2000, len: 42 },
  // Also never thrown as a projectile: the lionfish sheds where it stands and the skele-fish
  // gets up and walks. Both entries exist for the art in the angler's jaw.
  lionfish: { speed: 400, r: 26, life: 2000, len: 40 },
  skelefish: { speed: 300, r: 22, life: 12000, len: 40 },
};

// ── Megalodon (Q) ────────────────────────────────────────────────────────────
const SHARK_SPEED = 780;
const SHARK_LEN = 210;
/** How far behind the caster it surfaces, so it sweeps *through* where you are standing. */
const SHARK_SPAWN_BACK = 150;
const SHARK_MOUTH_R = 62;
const SHARK_HOLD_MS = 8000;
/** Nothing in its mouth: it still beaches itself, but only long enough to be seen leaving. */
const SHARK_EMPTY_HOLD_MS = 1400;
const SHARK_DPS = 8;

// ── Click+ — Swarm Tactics ───────────────────────────────────────────────────
/** Piranhas on one body at which the school starts biting twice as hard, and then slowing. */
const SWARM_DAMAGE_AT = 3;
const SWARM_SLOW_AT = 5;
const SWARM_DAMAGE_MULT = 2;
const SWARM_SLOW_MULT = 0.8;
const SWARM_SLOW_MS = 5000;
/** How much longer a piranha swims, and chews, with the upgrade equipped. */
const SWARM_LIFE_MULT = 1.5;

// ── E+ — Knock the Breath Out ────────────────────────────────────────────────
/**
 * Fraction of the oxygen bar each point of damage costs while a drown is running. Deliberately
 * per-point rather than per-hit: a piranha's 1s should cost a sip and a 50-damage sword fish
 * should cost a third of the bar, and a flat rate per hit would get both of those wrong.
 */
const BREATH_PER_DAMAGE = 0.006;

// ── R+ — Algae Trap ──────────────────────────────────────────────────────────
const RED_ALGAE_DAMAGE = 18;

// ── F+ — Deep Fishing ────────────────────────────────────────────────────────
/** How long F has to be held on a landed fish before it becomes bait instead of a throw. */
const BAIT_HOLD_MS = 500;
const RARE_FISH: FishKind[] = ['sawfish', 'swordfish', 'whaleshark', 'flyingfish', 'catfish'];
/** Depths Mastery: the two tables a line cast from inside the camouflage pulls from instead. */
const CAMO_ALL_FISH: FishKind[] = [...ALL_FISH, 'lionfish'];
const CAMO_RARE_FISH: FishKind[] = [...RARE_FISH, 'skelefish'];

/** Saw fish: it doesn't pass through, it stays in. */
const SAW_STICK_MS = 5000;
const SAW_TICK_MS = 100;
const SAW_TICK_DAMAGE = 1;
const SWORD_DAMAGE = 50;
/** Whale shark: a slow gun platform that steers itself to wherever you are pointing. */
const WHALE_SPEED = 150;
const WHALE_LIFE_MS = 12000;
const WHALE_BURST_MS = 3000;
const WHALE_BURST_SHOTS = 5;
const WHALE_BURST_SPREAD = 0.5;
const REMORA_DAMAGE = 3;
const REMORA_SPEED = 620;
const REMORA_LIFE_MS = 1700;
const REMORA_R = 14;
const FLYER_DAMAGE = 15;
const FLYER_RETURN_SPEED = 820;
/** How close the returning flying fish has to get before it is back in your jaw. */
const FLYER_CATCH_R = 34;
/** The catfish pays out every heal it ate, and a quarter again on top. */
const CATFISH_BONUS = 1.25;

// ── Q+ — Command the Depths ──────────────────────────────────────────────────
const SHARK_FOLLOW_SPEED = 120;
const SHARK_ALGAE_DAMAGE = 30;

// ── Mastery — Camo Fade (passive) ────────────────────────────────────────────
const CAMO_ID = 'camo-fade';
/** How long you have to go untouched before the water has taken you completely. */
const CAMO_FULL_MS = 6000;
/**
 * A hit has to be worth more than this to count as being attacked. Deliberately a threshold
 * rather than "any damage at all": a piranha bills 3 a second in whole points and a burn tick
 * is 2, and a camouflage that any chip in the game could strip would never finish once.
 */
const CAMO_BREAK_DAMAGE = 5;
/** Past this, the body is gone: bots stop being able to aim at it and the kit goes silent. */
const CAMO_HIDDEN_AT = 0.999;
/** How long a bloom you just poisoned refuses to feed *you* again. */
const CAMO_ALGAE_ARM_MS = 4000;

// ── Mastery — the lionfish ───────────────────────────────────────────────────
const LION_BARBS = 15;
const LION_BARB_DAMAGE = 2;
const LION_BARB_SPEED = 150;
/** Friction on a shed barb, per second. They drift out and then hang there. */
const LION_BARB_DRAG = 0.03;
const LION_BARB_LIFE_MS = 7000;
const LION_BARB_R = 17;
const LION_POISON_MS = 5000;
const LION_POISON_DPS = 3;
const LION_WEAKEN_MULT = 0.85;
const LION_WEAKEN_MS = 5000;

// ── Mastery — the skele-fish ─────────────────────────────────────────────────
const SKELE_HP = 50;
const SKELE_LIFE_MS = 12000;
const SKELE_SPEED = 270;
const SKELE_BITE = 15;
const SKELE_BITE_MS = 1000;
const SKELE_R = 22;
const SKELE_EAT_HEAL = 50;

// ── Mastery — Release the Kraken ─────────────────────────────────────────────
const KRAKEN_ID = 'release-the-kraken';
const KRAKEN_COOLDOWN_MS = 35000;
const KRAKEN_LIFE_MS = 25000;
const KRAKEN_ARMS = 3;
const KRAKEN_HEAD_R = 26;
/** How far an arm can reach off the mantle. */
const KRAKEN_REACH = 132;
const KRAKEN_GRAB_MS = 2000;
/** Throw a fish inside this of the beak and it is a feed rather than a throw. */
const KRAKEN_FEED_R = 76;
/** The bot re-checks whether the kraken is worth releasing this often. */
const NPC_KRAKEN_CHECK_MS = 500;
const NPC_KRAKEN_RANGE = 300;

// ── World objects ────────────────────────────────────────────────────────────

/** A piranha still swimming toward somebody. */
interface Swimmer {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  wig: number;
}

/** A piranha that arrived, and is now chewing. */
interface Latch {
  owner: Owner;
  victim: Fighter;
  until: number;
  /** Where it sits on the orbit around the victim, and its own chew phase. */
  orbit: number;
  chew: number;
}

/** Somebody with no air, the puddle that would give it back, and the clock on both. */
interface Drown {
  owner: Owner;
  victim: Fighter;
  /** 1 = a full breath, 0 = the water wins. */
  o2: number;
  endsAt: number;
  px: number;
  py: number;
  seed: number;
  /** Milliseconds since the last devastating tick. */
  tick: number;
  /**
   * `rawDamageTaken` as of the last frame — the poll behind Knock the Breath Out. Damage
   * dealt *by* the drown is billed through the same counter, but only ever once the bar is
   * already empty, so there is no loop to guard against.
   */
  lastRaw: number;
}

/**
 * A real healing orb. It feeds whoever gets there first, which is the whole ability — `owner`
 * is carried only so the bloom is painted through the right side's skin.
 *
 * `bad` is Algae Trap's poisoned half. It is a real, damaging object in the world for
 * everybody, and a red one *only* on the caster's own screen.
 */
interface Algae {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  seed: number;
  bad: boolean;
  /**
   * Camo Fade turns a bloom you walk over into a trap rather than eating it. That leaves you
   * standing on top of a live red orb, so the fighter who made it is refused by it until
   * `armedAt` — long enough to walk off, and not a second longer.
   */
  armedFor?: Fighter | null;
  armedAt?: number;
}

/** One of the lionfish's shed rays, hanging in the water. */
interface Barb {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  diesAt: number;
  wig: number;
}

/** A skele-fish that got up. It hunts on its own until something kills it or its time is up. */
interface Skele {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  diesAt: number;
  /** Next time it is allowed to bite whatever it is chewing on. */
  biteAt: number;
  wig: number;
}

/** One of the kraken's three arms. */
interface Arm {
  /** `ready` may grab, `holding` has somebody, `spent` is a stump until the beak is fed. */
  state: 'ready' | 'holding' | 'spent';
  victim: Fighter | null;
  until: number;
  /** Where the arm hangs when it has nothing — evenly spaced around the mantle. */
  rest: number;
  phase: number;
}

interface Kraken {
  owner: Owner;
  x: number;
  y: number;
  until: number;
  seed: number;
  arms: Arm[];
  gape: number;
}

/** A saw fish that stuck. It rides the body it found until its five seconds are up. */
interface Saw {
  owner: Owner;
  victim: Fighter;
  until: number;
  /** Milliseconds since the last 1-damage tick. */
  tick: number;
  /** Where on the body it went in — fixed, because a stuck fish does not orbit. */
  orbit: number;
  wig: number;
}

/** One of the whale shark's remoras. Small, fast, and gone the moment it finds anything. */
interface Remora {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  wig: number;
}

/** A thrown fish. What it does on arrival is entirely a function of `kind`. */
interface FishProj {
  owner: Owner;
  kind: FishKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  wig: number;
  /** Last time each fighter was hit — pierce and bounce both need per-target memory. */
  hits: Map<Fighter, number>;
  /** Gulper eel only: who is inside it. */
  swallowed: Fighter | null;
  eatAccum: number;
  /** Whale shark only: when the next five-round burst goes out. */
  burstAt: number;
  /** Flying fish only: true once it has hit something and is on its way home. */
  returning: boolean;
}

interface Shark {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  phase: 'rush' | 'hold';
  until: number;
  swallowed: Fighter[];
  /** Milliseconds since the last chew tick. */
  tick: number;
  gape: number;
}

interface Side {
  owner: Owner;
  // Passive
  stillMs: number;
  /** 0–1 fade into the water. */
  hidden: number;
  /** True once the fade is deep enough for the lure to be worth looking at. */
  lureOn: boolean;
  lureX: number;
  lureY: number;
  lureSeed: number;
  lureArmedAt: number;
  boostUntil: number;
  /** Latched so the fighter's alpha is handed back exactly once. */
  alphaOwned: boolean;
  /** Same, for the health bar — a green bar floating over nothing gives the whole thing away. */
  barHidden: boolean;
  // E
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  // F
  fishing: boolean;
  fishRemain: number;
  fish: FishKind | null;
  /** `rawDamageTaken` as of the last frame — the poll behind the +1s penalty. */
  lastRaw: number;
  npcThrowAt: number;
  // F+ — Deep Fishing
  /** When the current F press started, or 0 if the key is up. Drives the tap/hold split. */
  fHeldSince: number;
  /** True once this press has already turned the catch into bait, so the release does nothing. */
  fConsumed: boolean;
  /** A fish has been given up to the hook. The next landed catch comes off the rare table. */
  baited: boolean;
  // Mastery — Camo Fade
  /** 0–1 fade into the water, driven purely by not being hit. Independent of `hidden`. */
  camo: number;
  /** `rawDamageTaken` as of the last frame — the poll behind "was that worth more than 5?". */
  camoRaw: number;
  /** Latched, so `forceInvisible` is handed back exactly once. */
  camoForced: boolean;
  // Mastery — Release the Kraken
  krakenCastAt: number;
  npcKrakenCheckAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    stillMs: 0, hidden: 0, lureOn: false, lureX: 0, lureY: 0, lureSeed: 0, lureArmedAt: 0,
    boostUntil: 0, alphaOwned: false, barHidden: false,
    dashUntil: 0, dashVx: 0, dashVy: 0,
    fishing: false, fishRemain: 0, fish: null, lastRaw: 0, npcThrowAt: 0,
    fHeldSince: 0, fConsumed: false, baited: false,
    camo: 0, camoRaw: 0, camoForced: false,
    // Negative, so the first match's very first press is not refused by a cooldown nobody paid.
    krakenCastAt: -KRAKEN_COOLDOWN_MS, npcKrakenCheckAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DepthsArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** Every shot in flight — the only way anything can put damage into a skele-fish. */
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
  /** Skins: maps a Depths visual colour through that side's equipped skin. */
  depthsColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(fromX: number, fromY: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an E/R/F/Q slot this match. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Cumulative mastery counters. Written unconditionally; the adapter gates on the element. */
  recordMasteryStat(key: string, amount: number): void;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded water reproduces on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── DepthsKit ────────────────────────────────────────────────────────────────

export class DepthsKit implements SummonPurgeTarget {
  private api: DepthsArenaApi;

  // ── Visuals ──
  private readonly pcol: DepthsColorFn;
  private readonly ncol: DepthsColorFn;
  private readonly pfx: DepthsFx;
  private readonly nfx: DepthsFx;
  /** Handed out in place of the real Fx while that side is fully camouflaged. */
  private readonly pquiet: DepthsFx;
  private readonly nquiet: DepthsFx;
  private playerAvatar: DepthsAvatar | null = null;
  private npcAvatar: DepthsAvatar | null = null;
  /** Puddles, blooms and lures: on the floor, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Everything swimming, plus the oxygen bars — over the fighters, because it obscures them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private swimmers: Swimmer[] = [];
  private latches: Latch[] = [];
  private latchAccum = new Map<Fighter, number>();
  /** Fractional chew damage carried between frames, per victim. */
  private chewCarry = new Map<Fighter, number>();
  private drowns: Drown[] = [];
  private algae: Algae[] = [];
  private fishes: FishProj[] = [];
  private sharks: Shark[] = [];
  private saws: Saw[] = [];
  private remoras: Remora[] = [];
  private barbs: Barb[] = [];
  private skeles: Skele[] = [];
  private krakens: Kraken[] = [];
  /**
   * The lionfish's weaken. `outgoingDamageMult` is shared with every other kit that writes it,
   * so this kit's own share is tracked per victim and divided straight back out on expiry —
   * the same arrangement Echo's blossoms and Magma's coat use.
   */
  private weakened = new Map<Fighter, { until: number; applied: number }>();
  /** Icefish chill: fighter → the timestamp it wears off. */
  private slowed = new Map<Fighter, number>();
  /** Swarm Tactics' own slow, kept apart from the chill so the two can stack and read apart. */
  private swarmSlow = new Map<Fighter, number>();
  /** Who is currently under a doubled school — recomputed every frame, read by the status tray. */
  private swarming = new Set<Fighter>();
  /** Latched each frame from `handleInput` — the player's real cursor. */
  private aimX = 0;
  private aimY = 0;
  /** The NPC's aim, latched from its own casts. */
  private npcAimX = 0;
  private npcAimY = 0;

  constructor(api: DepthsArenaApi) {
    this.api = api;
    this.pcol = (base) => api.depthsColor('player', base);
    this.ncol = (base) => api.depthsColor('npc', base);
    this.pfx = new DepthsFx(api.scene, this.pcol);
    this.nfx = new DepthsFx(api.scene, this.ncol);
    this.pquiet = new QuietDepthsFx(api.scene, this.pcol);
    this.nquiet = new QuietDepthsFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  /**
   * This side's effects — or a silent stand-in while Camo Fade has finished.
   *
   * Every visual the kit throws goes through here, so one branch is the whole of "all particle
   * effects are removed while you are invisible". Damage numbers and hit flashes are
   * ArenaScene's, not this kit's, and deliberately survive: the enemy is still allowed to know
   * that something is happening to *them*.
   */
  private fx(owner: Owner): DepthsFx {
    if (this.camoHidden(owner)) return owner === 'player' ? this.pquiet : this.nquiet;
    return owner === 'player' ? this.pfx : this.nfx;
  }
  private col(owner: Owner): DepthsColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

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

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private enemyOf(owner: Owner): Fighter | null {
    if (owner === 'npc') return this.alive(this.api.player) ? this.api.player : null;
    const f = this.api.player;
    const t = this.api.getNearestEnemy(f.x, f.y);
    return this.alive(t) ? t : null;
  }

  /** Every fighter in the match, for the effects that don't care whose side anybody is on. */
  private everyone(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (this.alive(f) && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private avatar(owner: Owner): DepthsAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private isDepths(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'depths' : this.api.npcElementId === 'depths';
  }

  // ── Mastery helpers ────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking. */
  private masteryOn(owner: Owner): boolean {
    return this.isDepths(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which slot Release the Kraken was dropped on, or null. */
  private krakenSlot(owner: Owner): Slot | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of SLOTS) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === KRAKEN_ID) return s;
    }
    return null;
  }

  /** The player's key for a bound slot. */
  private keyFor(slot: Slot): Phaser.Input.Keyboard.Key {
    return slot === 'e' ? this.api.eKey
      : slot === 'r' ? this.api.rKey
        : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  /** True once the water has taken this side completely. */
  private camoHidden(owner: Owner): boolean {
    return this.sides[owner].camo >= CAMO_HIDDEN_AT;
  }

  /**
   * Anything the caster says about themselves, swallowed while they are invisible. Text about
   * what happened to *somebody else* keeps using `showFloatingText` directly.
   */
  private say(owner: Owner, x: number, y: number, text: string, color: number): void {
    if (this.camoHidden(owner)) return;
    this.api.showFloatingText(x, y, text, this.hex(color));
  }

  /**
   * Only ever recorded for the player: the grind is the human's, not the bot's. Written whether
   * or not the mastery is on — that is how it gets unlocked in the first place.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && amount > 0) this.api.recordMasteryStat(key, amount);
  }

  /**
   * Whether this side is running the given shop upgrade. The npc only ever answers true in
   * online play, where it is a real person's replica carrying that person's purchases.
   */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** Where this side is pointing. The Q upgrade steers a beached shark off exactly this. */
  private aimOf(owner: Owner): { x: number; y: number } {
    return owner === 'player'
      ? { x: this.aimX, y: this.aimY }
      : { x: this.npcAimX, y: this.npcAimY };
  }

  /** Whether a fighter's body currently belongs to something else — an eel, or a shark. */
  private isHeld(f: Fighter): boolean {
    return this.fishes.some((p) => p.swallowed === f) || this.sharks.some((s) => s.swallowed.includes(f));
  }

  private isStill(f: Fighter): boolean {
    const b = this.body(f);
    return Math.hypot(b.velocity.x, b.velocity.y) < 14;
  }

  /** Perpendicular distance from a point to the segment a→b — the Lungfish's slash test. */
  private distToSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Phaser.Math.Distance.Between(ax, ay, px, py);
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(ax + dx * t, ay + dy * t, px, py);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Anything written onto a fighter has to be handed back, or the next match starts with
    // somebody permanently transparent or permanently stuck in a shark.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighter(owner);
      if (!f) continue;
      if (this.sides[owner].alphaOwned) f.setAlpha(1);
      if (this.sides[owner].camoForced) f.forceInvisible = false;
      if (this.sides[owner].barHidden && f.active && f.hp > 0) f.setHealthBarVisible(true);
    }
    // The lionfish's share of a shared multiplier, handed back before the map is dropped.
    for (const [f, w] of this.weakened) {
      if (f && w.applied !== 1) f.outgoingDamageMult /= w.applied;
    }
    this.weakened.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.swimmers = [];
    this.latches = [];
    this.latchAccum.clear();
    this.chewCarry.clear();
    this.drowns = [];
    this.algae = [];
    this.fishes = [];
    this.sharks = [];
    this.saws = [];
    this.remoras = [];
    this.barbs = [];
    this.skeles = [];
    this.krakens = [];
    this.slowed.clear();
    this.swarmSlow.clear();
    this.swarming.clear();
    this.aimX = 0;
    this.aimY = 0;
    this.npcAimX = 0;
    this.npcAimY = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'depths') return;
    void time;
    this.aimX = mouseX;
    this.aimY = mouseY;

    const p = this.api.player;
    const s = this.sides.player;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    const clicked = pointer.isDown && !this.api.pointerWasDown;

    // Mastery: whichever of E/R/F/Q the kraken was dropped on stops being its own ability.
    const bound = this.krakenSlot('player');
    if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) {
      this.tryCastKraken('player', mouseX, mouseY);
    }

    if (clicked) p.castAbility('depths-piranha', ctx);
    if (bound !== 'e' && Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('depths-lungfish', ctx);
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('depths-eutrophication', ctx);

    // F is one key with two meanings once Deep Fishing is equipped: a tap still throws the
    // catch, a hold gives it up to the hook. That forces the throw down to the *release* —
    // on the press there is no way yet to know which of the two this is going to be. The
    // JustDown flag is consumed exactly once either way, so the two paths can't fight over it.
    // A bound F is neither, and the whole block is skipped; `excludeSlots` refuses that bind
    // anyway, since the fish are what the kraken eats.
    const fJust = bound === 'f' ? false : Phaser.Input.Keyboard.JustDown(this.api.fKey);
    const fDown = bound === 'f' ? false : this.api.fKey.isDown;
    if (this.up('player', 'f') && (s.fish || s.fHeldSince > 0)) {
      if (fJust) { s.fHeldSince = time; s.fConsumed = false; }
      if (fDown && s.fish && !s.fConsumed && s.fHeldSince > 0 && time - s.fHeldSince >= BAIT_HOLD_MS) {
        this.makeBait('player');
        s.fConsumed = true;
      }
      if (!fDown && s.fHeldSince > 0) {
        if (!s.fConsumed && s.fish) this.throwFish('player', mouseX, mouseY);
        s.fHeldSince = 0;
        s.fConsumed = false;
      }
    } else if (fJust) {
      // The throw is a recast, not a second cast: a landed fish has already paid the
      // cooldown, and routing it back through `castAbility` would strand it in your mouth.
      if (s.fish) this.throwFish('player', mouseX, mouseY);
      else p.castAbility('depths-angler', ctx);
    }

    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      p.castAbility('depths-megalodon', ctx);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Piranha. No impact damage at all; everything it is worth happens after it lands. */
  doPiranha(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const sx = f.x + Math.cos(ang) * 26;
    const sy = f.y + Math.sin(ang) * 26;
    // Swarm Tactics stretches the whole life of a piranha, not just the chew — a school that
    // swims 50% further is a school that can be assembled from 50% further out.
    const life = this.up(owner, 'click') ? SWARM_LIFE_MULT : 1;
    this.swimmers.push({
      owner, x: sx, y: sy,
      vx: Math.cos(ang) * PIRANHA_SPEED, vy: Math.sin(ang) * PIRANHA_SPEED,
      diesAt: this.now + PIRANHA_LIFE_MS * life, wig: Math.random() * 6,
    });

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).bubbles(sx, sy, 4, 14, DPT.foam, 420, 7);
  }

  /**
   * E — Lungfish Strike. The dash and the slash are the small half; the drowning is the ability,
   * and the slash is what buys it — a whiff spends the sixteen seconds and starts nothing. The
   * drown lands on whoever the blade actually reached, nearest first, so a strike that catches
   * two bodies still only ever puts one oxygen bar on screen.
   */
  doLungfish(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const s = this.side(owner);
    const boosted = s.boostUntil > this.now;
    const ang = Math.atan2(ty - f.y, tx - f.x);

    s.dashUntil = this.now + DASH_MS;
    s.dashVx = Math.cos(ang) * DASH_SPEED;
    s.dashVy = Math.sin(ang) * DASH_SPEED;

    const ex = f.x + Math.cos(ang) * SLASH_REACH;
    const ey = f.y + Math.sin(ang) * SLASH_REACH;

    // Mastery: a skeleton of your own on the end of the blade is a meal, not a target. Checked
    // before the enemy scan so a strike that catches both is unambiguously the meal — and it
    // still runs the rest of the ability, so the drowning is not given up for the fifty health.
    this.eatSkele(owner, f.x, f.y, ex, ey);

    const dmg = boosted ? SLASH_DAMAGE_BOOSTED : SLASH_DAMAGE;
    let victim: Fighter | null = null;
    let victimDist = Infinity;
    for (const t of this.targetsOf(owner)) {
      if (this.distToSegment(f.x, f.y, ex, ey, t.x, t.y) > SLASH_HALF_WIDTH) continue;
      t.takeDamage(dmg);
      this.api.spawnHitFlash(t.x, t.y, DPT.cyan);
      this.fx(owner).chomp(t.x, t.y, ang, 24, DPT.blood);
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < victimDist) { victimDist = d; victim = t; }
    }

    this.avatar(owner)?.play('dash', ang);
    this.fx(owner).slashArc(f.x, f.y, ang, SLASH_REACH * 0.8, boosted ? DPT.lure : DPT.cyan);
    if (boosted) this.say(owner, f.x, f.y - 50, '🩸 FED', DPT.blood);

    if (victim) this.startDrown(owner, victim);
    else this.say(owner, f.x, f.y - 46, '🫧 MISSED', DPT.trench);
  }

  /** R — Eutrophication. The only ability in the kit that helps the person it is aimed at. */
  doEutrophication(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    // R+ — Algae Trap. Twelve more orbs that are not orbs. They alternate with the real ones
    // rather than being appended, so the poisoned half gets the same quality of placement:
    // a trap that always landed in the leftover corners would be a trap you could read.
    const trap = this.up(owner, 'r');
    const total = trap ? ALGAE_COUNT * 2 : ALGAE_COUNT;

    const placed: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < total; i++) {
      let x = 0;
      let y = 0;
      // Ten tries at a spot that isn't on top of one already down; the bloom should cover
      // the arena, not pile up in a corner.
      for (let attempt = 0; attempt < 10; attempt++) {
        x = Phaser.Math.Between(this.left + 40, this.right - 40);
        y = Phaser.Math.Between(this.top + 40, this.bottom - 40);
        if (placed.every((p) => Phaser.Math.Distance.Between(p.x, p.y, x, y) > 80)) break;
      }
      placed.push({ x, y });
      this.algae.push({
        owner, x, y, until: this.now + ALGAE_LIFE_MS, seed: Math.random() * 999,
        bad: trap && i % 2 === 1,
      });
    }

    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 20, 240, trap ? DPT.rot : DPT.algae, 700);
    this.say(owner, f.x, f.y - 50,
      trap ? '🌿 ALGAE TRAP' : '🌿 EUTROPHICATION', trap ? DPT.rot : DPT.algae);
    Sfx.playAt('bloom', f.x, { volume: 0.8 });
  }

  /** F — Angler. Casting starts the wait; the recast throws whatever came up. */
  doAngler(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }

    const s = this.side(owner);
    if (s.fish) { this.throwFish(owner, tx, ty); return; }
    if (s.fishing) return;

    s.fishing = true;
    s.fishRemain = FISH_CATCH_MS;
    s.lastRaw = f.rawDamageTaken;
    this.avatar(owner)?.play('sweep', Math.atan2(ty - f.y, tx - f.x));
    this.say(owner, f.x, f.y - 46, '🎣 CAST OUT', DPT.foam);
    Sfx.playAt('splash', f.x, { volume: 0.5, rate: 1.3 });
  }

  /** Q — Megalodon. Surfaces behind you and takes the line you were pointing along with it. */
  doMegalodon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (owner === 'npc') { this.npcAimX = tx; this.npcAimY = ty; }
    // One shark per side. A second would only ever steal the first one's mouthful.
    if (this.sharks.some((s) => s.owner === owner)) return;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.sharks.push({
      owner,
      x: f.x - Math.cos(ang) * SHARK_SPAWN_BACK,
      y: f.y - Math.sin(ang) * SHARK_SPAWN_BACK,
      ang,
      vx: Math.cos(ang) * SHARK_SPEED,
      vy: Math.sin(ang) * SHARK_SPEED,
      phase: 'rush',
      until: 0,
      swallowed: [],
      tick: 0,
      gape: 1,
    });

    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 20, 180, DPT.trench, 640);
    this.fx(owner).bubbles(f.x, f.y, 14, 70, DPT.foam, 800, 7);
    this.say(owner, f.x, f.y - 54, '🦈 MEGALODON', DPT.shark);
    Sfx.playAt('roar', f.x, { volume: 0.95, rate: 0.55 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'depths';
    const npcIs = this.api.npcElementId === 'depths';
    if (!playerIs && !npcIs) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    for (const owner of ['player', 'npc'] as Owner[]) {
      if (!this.isDepths(owner)) continue;
      this.updateDash(owner, time);
      // Camo first: the fade it computes is what the lure pass then paints onto the body.
      this.updateCamo(owner, delta);
      this.updateLure(owner, time, delta);
      this.updateFishing(owner, time, delta);
    }

    this.updateSwimmers(time, delta);
    this.updateLatches(time, delta);
    this.updateFishProjectiles(time, delta);
    this.updateSaws(time, delta);
    this.updateRemoras(time, delta);
    this.updateBarbs(time, delta);
    this.updateSkeles(time, delta);
    this.updateKrakens(time, delta);
    this.updateSharks(time, delta);
    this.updateDrowns(time, delta);
    this.updateAlgae(time);
    this.updateSlows(time);
    this.updateWeakened(time);
    this.updateNpcKraken();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround(time);
    this.paintAir(time);
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Everything on the floor goes under them; everything swimming
    // goes over, because a fish that passes behind a body reads as a decal.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  // ── Mastery passive: Camo Fade ─────────────────────────────────────────────

  /**
   * The mastery's second fade.
   *
   * The base passive pays you for standing still; this one pays you for not being hit, and it
   * runs whatever your feet are doing. Six seconds untouched and there is nothing there at all
   * — no body, no health bar, no bubbles, no lure, and nothing a bot is able to aim at.
   *
   * The price is written into the threshold rather than the timer: any single hit worth more
   * than five points puts the whole six seconds back to zero, so the counterplay to an
   * invisible angler is to land one real thing on them rather than to chip at them.
   */
  private updateCamo(owner: Owner, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);

    if (!this.masteryOn(owner) || !this.alive(f)) {
      s.camo = 0;
      if (f) {
        s.camoRaw = f.rawDamageTaken;
        if (s.camoForced) { f.forceInvisible = false; s.camoForced = false; }
      }
      return;
    }

    // Polled every frame: this is the damage that landed inside *this* frame, so a burn tick
    // and a piranha bite are each judged on their own rather than as a running total.
    const raw = f.rawDamageTaken;
    if (raw - s.camoRaw > CAMO_BREAK_DAMAGE) {
      if (s.camo > 0.25) {
        // Said with the real Fx: by the time this fires the camouflage is already gone.
        this.api.showFloatingText(f.x, f.y - 50, '👁️ SPOTTED', this.hex(DPT.blood));
        this.fx(owner).ring(f.x, f.y, 12, 66, DPT.foam, 380);
      }
      s.camo = 0;
    }
    s.camoRaw = raw;

    const was = this.camoHidden(owner);
    s.camo = Phaser.Math.Clamp(
      s.camo + meterGain(this.fighter(owner), delta / CAMO_FULL_MS), 0, 1);
    if (!was && this.camoHidden(owner)) {
      // The last thing said before the kit goes quiet, and the only announcement of it.
      this.api.showFloatingText(f.x, f.y - 54, '🫥 GONE', this.hex(DPT.trench));
    }

    // `forceInvisible` exists for exactly this: without it `takeDamage`'s alpha flash would
    // paint a body back onto the water every time a piranha chewed on somebody invisible.
    const wantForced = this.camoHidden(owner);
    if (wantForced !== s.camoForced) {
      s.camoForced = wantForced;
      f.forceInvisible = wantForced;
    }
  }

  // ── Passive: the lure ──────────────────────────────────────────────────────

  /**
   * The whole passive. Standing still fades the body into the water and leaves an orb that is
   * indistinguishable from a real Eutrophication heal — deliberately, since the AI's rule for
   * both is the same and telling them apart is the opponent's problem.
   */
  private updateLure(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) {
      // A dead fighter has already had its bar hidden by the death path; only the alpha,
      // which nothing else owns, is worth handing back here.
      if (s.alphaOwned && f) { f.setAlpha(1); s.alphaOwned = false; }
      s.barHidden = false;
      s.hidden = 0;
      s.lureOn = false;
      s.stillMs = 0;
      return;
    }

    // Being carried is not standing still — an eel does the moving for you.
    const still = this.isStill(f) && !this.isHeld(f);
    if (still) s.stillMs += delta; else s.stillMs = 0;

    const want = s.stillMs > LURE_DELAY_MS && time >= s.lureArmedAt ? 1 : 0;
    const step = delta / (want ? FADE_IN_MS : FADE_OUT_MS);
    s.hidden = Phaser.Math.Clamp(s.hidden + (want ? step : -step), 0, 1);

    // The two fades are one number on the body. Whichever has taken more of you wins, so a
    // camouflaged angler who then stands still does not become somehow more visible.
    const veil = Math.max(s.hidden, s.camo);

    if (veil > 0.02) {
      f.setAlpha(1 - veil);
      s.alphaOwned = true;
    } else if (s.alphaOwned) {
      f.setAlpha(1);
      s.alphaOwned = false;
    }

    const wantBarHidden = veil > 0.85;
    if (wantBarHidden !== s.barHidden) {
      s.barHidden = wantBarHidden;
      f.setHealthBarVisible(!wantBarHidden);
    }

    // Camouflage puts the lure out. It is a light, and the whole point of the mastery is that
    // there is nothing to see — so the two passives are exclusive at the top end.
    if (s.hidden < 0.3 || this.camoHidden(owner)) { s.lureOn = false; return; }

    if (!s.lureOn) {
      s.lureOn = true;
      s.lureSeed = Math.random() * 999;
    }
    // The orb hangs between you and whoever is coming, so a biter ends up beside you rather
    // than on top of you — the difference between a free burst and a free trade.
    const e = this.enemyOf(owner);
    const ang = e ? Math.atan2(e.y - f.y, e.x - f.x) : -Math.PI / 2;
    s.lureX = Phaser.Math.Clamp(f.x + Math.cos(ang) * LURE_STANDOFF, this.left + 10, this.right - 10);
    s.lureY = Phaser.Math.Clamp(f.y + Math.sin(ang) * LURE_STANDOFF, this.top + 10, this.bottom - 10);

    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, s.lureX, s.lureY) > LURE_BITE_R) continue;
      this.bite(owner, t);
      break;
    }
  }

  /** Something came to eat the light. */
  private bite(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.boostUntil = this.now + BOOST_MS;
    s.lureOn = false;
    s.hidden = 0;
    s.stillMs = 0;
    s.lureArmedAt = this.now + LURE_REARM_MS;
    if (s.alphaOwned && f) { f.setAlpha(1); s.alphaOwned = false; }

    const fx = this.fx(owner);
    fx.chomp(s.lureX, s.lureY, Math.atan2(f.y - victim.y, f.x - victim.x), 28, DPT.lure);
    fx.ring(f.x, f.y, 10, 90, DPT.lure, 420);
    this.say(owner, f.x, f.y - 50, '🎣 BITE!', DPT.lure);
    this.api.showFloatingText(victim.x, victim.y - 40, '❗', this.hex(DPT.blood));
    Sfx.playAt('bubble', f.x, { volume: 0.9, rate: 0.8 });
  }

  /** The Lungfish dash. Applied post-movement, so WASD can't cancel it mid-flight. */
  private updateDash(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.dashUntil <= time) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.dashUntil = 0; return; }
    this.body(f).setVelocity(s.dashVx, s.dashVy);
  }

  // ── Piranha ────────────────────────────────────────────────────────────────

  private updateSwimmers(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.swimmers.length - 1; i >= 0; i--) {
      const p = this.swimmers[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wig += dt * 16;

      let landed: Fighter | null = null;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= PIRANHA_HIT_R) { landed = t; break; }
      }

      if (landed) {
        this.swimmers.splice(i, 1);
        this.latchOn(p.owner, landed);
        continue;
      }
      if (time >= p.diesAt || p.x < this.left || p.x > this.right || p.y < this.top || p.y > this.bottom) {
        this.swimmers.splice(i, 1);
        this.fx(p.owner).bubbles(p.x, p.y, 3, 12, DPT.foam, 340, 7);
      }
    }
  }

  /** A piranha arrives. Past five on one body the newest one just shoulders the oldest aside. */
  private latchOn(owner: Owner, victim: Fighter): void {
    const chewMs = LATCH_MS * (this.up(owner, 'click') ? SWARM_LIFE_MULT : 1);
    const mine = this.latches.filter((l) => l.victim === victim);
    if (mine.length >= MAX_LATCH) {
      const oldest = mine.reduce((a, b) => (a.until <= b.until ? a : b));
      oldest.until = this.now + chewMs;
      oldest.owner = owner;
    } else {
      this.latches.push({
        owner, victim, until: this.now + chewMs,
        orbit: Math.random() * Math.PI * 2, chew: Math.random() * 6,
      });
    }
    this.fx(owner).chomp(victim.x, victim.y, Math.random() * Math.PI * 2, 20, DPT.blood);
    this.api.spawnHitFlash(victim.x, victim.y, DPT.blood);
    Sfx.playAt('claw', victim.x, { volume: 0.5, rate: 1.4 });
  }

  private updateLatches(time: number, delta: number): void {
    for (let i = this.latches.length - 1; i >= 0; i--) {
      const l = this.latches[i];
      if (!this.alive(l.victim) || time >= l.until) { this.latches.splice(i, 1); continue; }
      l.orbit += (delta / 1000) * 1.6;
      l.chew += (delta / 1000) * 14;
    }

    // Chewing is billed per victim rather than per piranha, so five of them are one number
    // on the health bar instead of five racing accumulators. Swarm Tactics is a property of
    // the *pile*, so the count has to be known before any of it is charged — which is the
    // same reason this loop was already shaped this way.
    this.latchAccum.clear();
    this.swarming.clear();
    const counts = new Map<Fighter, number>();
    const upgraded = new Set<Fighter>();
    for (const l of this.latches) {
      counts.set(l.victim, (counts.get(l.victim) ?? 0) + 1);
      if (this.up(l.owner, 'click')) upgraded.add(l.victim);
    }
    for (const [victim, n] of counts) {
      const swarm = upgraded.has(victim) && n >= SWARM_DAMAGE_AT;
      if (swarm) this.swarming.add(victim);
      this.latchAccum.set(victim, n * LATCH_DPS * (swarm ? SWARM_DAMAGE_MULT : 1));
      // A full school doesn't just bite harder, it holds you still enough to be bitten.
      if (upgraded.has(victim) && n >= SWARM_SLOW_AT) {
        const had = (this.swarmSlow.get(victim) ?? 0) > time;
        this.swarmSlow.set(victim, time + SWARM_SLOW_MS);
        if (!had) {
          this.api.showFloatingText(victim.x, victim.y - 52, '🐟 SWARMED', this.hex(DPT.blood));
        }
      }
    }
    for (const [victim, dps] of this.latchAccum) {
      const carry = (this.chewCarry.get(victim) ?? 0) + dps * (delta / 1000);
      const whole = Math.floor(carry);
      this.chewCarry.set(victim, carry - whole);
      if (whole > 0) victim.takeDamage(whole);
    }
    // Anybody who stopped being chewed loses their part-tick rather than banking it.
    for (const f of [...this.chewCarry.keys()]) {
      if (!this.latchAccum.has(f)) this.chewCarry.delete(f);
    }
  }

  // ── Lungfish Strike: drowning ──────────────────────────────────────────────

  private startDrown(owner: Owner, victim: Fighter): void {
    // One drown per caster — a second would just be two bars on the same body.
    const existing = this.drowns.findIndex((d) => d.owner === owner);
    if (existing >= 0) this.drowns.splice(existing, 1);

    let px = this.api.width - victim.x;
    let py = this.api.height - victim.y;
    // A victim standing dead centre would have the puddle land on their feet, which is not
    // a run for air, so send it to the far corner instead.
    if (Phaser.Math.Distance.Between(px, py, victim.x, victim.y) < PUDDLE_MIN_DIST) {
      px = victim.x < this.api.width / 2 ? this.right - 70 : this.left + 70;
      py = victim.y < this.api.height / 2 ? this.bottom - 70 : this.top + 70;
    }
    px = Phaser.Math.Clamp(px, this.left + 60, this.right - 60);
    py = Phaser.Math.Clamp(py, this.top + 60, this.bottom - 60);

    this.drowns.push({
      owner, victim, o2: 1, endsAt: this.now + DROWN_TOTAL_MS,
      px, py, seed: Math.random() * 999, tick: 0,
      // Latched after the slash that started this, so the hit that bought the drown isn't
      // also billed against the bar it just opened.
      lastRaw: victim.rawDamageTaken,
    });

    this.fx(owner).ring(px, py, 14, PUDDLE_R * 1.6, DPT.cyan, 620);
    this.fx(owner).splash(victim.x, victim.y, 30, DPT.trench);
    this.api.showFloatingText(victim.x, victim.y - 48, '🫧 NO AIR', this.hex(DPT.cyan));
    Sfx.playAt('bubble', victim.x, { volume: 0.85, rate: 0.7 });
  }

  private updateDrowns(time: number, delta: number): void {
    for (let i = this.drowns.length - 1; i >= 0; i--) {
      const d = this.drowns[i];
      if (!this.alive(d.victim) || time >= d.endsAt) {
        if (this.alive(d.victim)) {
          this.api.showFloatingText(d.victim.x, d.victim.y - 46, '🫧 SURFACED', this.hex(DPT.foam));
          this.fx(d.owner).bubbles(d.px, d.py, 8, 40, DPT.foam, 520, 7);
        }
        this.drowns.splice(i, 1);
        continue;
      }

      // Polled every frame, whether or not the upgrade is on and whether or not they are
      // standing in air — a hit taken in the puddle must not be banked against the next breath.
      const raw = d.victim.rawDamageTaken;
      const took = raw - d.lastRaw;
      d.lastRaw = raw;

      // The puddle is the only answer, and touching it is a full breath rather than a trickle.
      if (Phaser.Math.Distance.Between(d.victim.x, d.victim.y, d.px, d.py) <= PUDDLE_R) {
        if (d.o2 < 0.999) {
          this.fx(d.owner).bubbles(d.victim.x, d.victim.y, 8, 30, DPT.foam, 500, 9);
          this.api.showFloatingText(d.victim.x, d.victim.y - 46, '💨 AIR', this.hex(DPT.foam));
          Sfx.playAt('bubble', d.victim.x, { volume: 0.7, rate: 1.3 });
        }
        d.o2 = 1;
        d.tick = 0;
        continue;
      }

      d.o2 = Math.max(0, d.o2 - delta / O2_DRAIN_MS);

      // E+ — Knock the Breath Out. Every point that lands on somebody with no air to spare
      // costs them some of what is left, which is what turns the drown from a timer you wait
      // out into something the rest of the kit can shorten.
      if (took > 0.01 && d.o2 > 0 && this.up(d.owner, 'e')) {
        const cost = took * BREATH_PER_DAMAGE;
        d.o2 = Math.max(0, d.o2 - cost);
        // Only the hits worth seeing — a piranha's 1s would otherwise bury the screen.
        if (cost >= 0.05) {
          this.api.showFloatingText(d.victim.x, d.victim.y - 58, '💨 WINDED', this.hex(DPT.cyan));
          this.fx(d.owner).bubbles(d.victim.x, d.victim.y - 12, 4, 16, DPT.foam, 380, 9);
        }
      }

      if (d.o2 > 0) continue;

      d.tick += delta;
      while (d.tick >= 1000) {
        d.tick -= 1000;
        d.victim.takeDamage(DROWN_DPS);
        this.record(d.owner, 'drownDamage', DROWN_DPS);
        this.api.spawnHitFlash(d.victim.x, d.victim.y, DPT.trench);
        this.fx(d.owner).bubbles(d.victim.x, d.victim.y - 10, 5, 18, DPT.cyan, 420, 9);
      }
    }
  }

  // ── Eutrophication ─────────────────────────────────────────────────────────

  private updateAlgae(time: number): void {
    for (let i = this.algae.length - 1; i >= 0; i--) {
      const a = this.algae[i];
      if (time >= a.until) { this.algae.splice(i, 1); continue; }

      for (const f of this.everyone()) {
        if (Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y) > ALGAE_R) continue;

        if (a.bad) {
          // A red orb feeds on whoever reaches it first, exactly like a green one — and that
          // includes the person who planted it. There is no owner check here on purpose. The
          // one exception is the angler still standing on a bloom they *just* poisoned.
          if (a.armedFor === f && time < (a.armedAt ?? 0)) continue;
          f.takeDamage(RED_ALGAE_DAMAGE);
          this.api.spawnHitFlash(f.x, f.y, DPT.rot);
          this.fx(a.owner).bubbles(a.x, a.y, 7, 26, DPT.rot, 520, 9);
          Sfx.playAt('slime-splat', f.x, { volume: 0.6, rate: 0.9 });
        } else {
          if (f.hp >= f.maxHp) continue;
          f.heal(ALGAE_HEAL);
          // Mastery: an angler nobody can see does not eat a bloom, they *spoil* it. The heal
          // is theirs and the orb stays on the floor as the thing the enemy walks into next.
          const spoiler = this.camoSpoiler(f);
          if (!spoiler) {
            const fx = f === this.api.player ? this.pfx : this.nfx;
            fx.bubbles(a.x, a.y, 7, 26, DPT.algae, 520, 9);
            this.api.showFloatingText(f.x, f.y - 44, `+${ALGAE_HEAL}`, this.hex(DPT.algae));
          }
          if (f === this.api.player && this.isDepths('player')) {
            this.record('player', 'algaeHealed', ALGAE_HEAL);
          }

          if (spoiler) {
            a.bad = true;
            a.owner = spoiler;
            a.until = time + ALGAE_LIFE_MS;
            a.seed = Math.random() * 999;
            a.armedFor = f;
            a.armedAt = time + CAMO_ALGAE_ARM_MS;
            break;
          }
        }

        this.algae.splice(i, 1);
        break;
      }
    }
  }

  /**
   * Which side, if either, this body is a fully camouflaged Depths angler for. The one place
   * "who is invisible right now" is turned back into an owner.
   */
  private camoSpoiler(f: Fighter): Owner | null {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.fighter(owner) === f && this.camoHidden(owner)) return owner;
    }
    return null;
  }

  // ── Angler ─────────────────────────────────────────────────────────────────

  private updateFishing(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.fishing = false; s.fish = null; return; }

    if (s.fishing) {
      // The NPC has to be made to stand still, since its movement machine never would.
      if (owner === 'npc') this.body(f).setVelocity(0, 0);

      const raw = f.rawDamageTaken;
      if (raw > s.lastRaw + 0.01) {
        s.fishRemain += FISH_DAMAGE_PENALTY_MS;
        this.say(owner, f.x, f.y - 40, '🎣 +1s', DPT.blood);
      }
      s.lastRaw = raw;

      if (this.isStill(f)) s.fishRemain -= delta;
      if (s.fishRemain <= 0) {
        s.fishing = false;
        // A baited line pulls from the rare table instead, and the bait is spent doing it.
        // Mastery: a line cast by something the water has already swallowed reaches two things
        // that do not exist for anybody visible — one on each table.
        const hidden = this.camoHidden(owner);
        const table = s.baited
          ? (hidden ? CAMO_RARE_FISH : RARE_FISH)
          : (hidden ? CAMO_ALL_FISH : ALL_FISH);
        if (s.baited) this.record(owner, 'rareFishCaught', 1);
        s.baited = false;
        s.fish = table[Math.floor(Math.random() * table.length)];
        s.npcThrowAt = time + NPC_THROW_DELAY_MS;
        this.fx(owner).splash(f.x, f.y - 20, 34, FISH_COLOR[s.fish]);
        this.say(owner, f.x, f.y - 54,
          `${FISH_EMOJI[s.fish]} ${FISH_LABEL[s.fish]}`, FISH_COLOR[s.fish]);
        Sfx.playAt('splash', f.x, { volume: 0.9, rate: 0.9 });
      }
      return;
    }

    if (s.fish && owner === 'npc' && time >= s.npcThrowAt) {
      // Mastery synergy: a kraken with a stump on it is worth more than any throw. The bot
      // posts the catch into the beak rather than at the player, and gets its arms back.
      const feed = this.npcThrowAim();
      if (feed) { this.throwFish('npc', feed.x, feed.y); return; }
      const e = this.enemyOf('npc');
      if (e) this.throwFish('npc', e.x, e.y);
    }
  }

  /**
   * F+ — the hold half of Deep Fishing. The catch goes on the hook rather than at them, and
   * the rod comes back with something from the bottom next time.
   */
  private makeBait(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const kind = s.fish;
    if (!kind || !this.alive(f)) return;
    s.fish = null;
    s.baited = true;

    this.avatar(owner)?.play('flex');
    this.fx(owner).bubbles(f.x, f.y - 12, 8, 26, FISH_COLOR[kind], 560, 9);
    this.fx(owner).ring(f.x, f.y, 8, 60, DPT.lure, 420);
    this.say(owner, f.x, f.y - 52, '🎣 BAITED', DPT.lure);
    Sfx.playAt('bubble', f.x, { volume: 0.75, rate: 0.85 });
  }

  private throwFish(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const kind = s.fish;
    const f = this.fighter(owner);
    if (!kind || !this.alive(f)) return;

    // Aim at your own kraken and the throw is a feed instead. Every fish counts, including the
    // three that never become projectiles — which is the only reason the check lives here at
    // the throw rather than on a flying body passing through the beak.
    const mouth = this.krakens.find((k) => k.owner === owner
      && Phaser.Math.Distance.Between(k.x, k.y, tx, ty) <= KRAKEN_FEED_R);
    if (mouth) { s.fish = null; this.feedKraken(mouth, kind); return; }

    s.fish = null;

    // The catfish never flies. Its whole ability is what it does to the bloom on the floor.
    if (kind === 'catfish') { this.doCatfish(owner); return; }
    // Nor does the lionfish: it comes apart in your hands where you stand.
    if (kind === 'lionfish') { this.doLionfish(owner); return; }
    // The skele-fish is not thrown at anything either — it is put down, and it walks.
    if (kind === 'skelefish') { this.releaseSkele(owner, tx, ty); return; }

    const stats = FISH_STATS[kind];
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.fishes.push({
      owner, kind,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * stats.speed,
      vy: Math.sin(ang) * stats.speed,
      diesAt: this.now + stats.life,
      wig: Math.random() * 6,
      hits: new Map<Fighter, number>(),
      swallowed: null,
      eatAccum: 0,
      // A whale shark opens fire the moment it is in the water, then every three seconds.
      burstAt: this.now,
      returning: false,
    });

    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).bubbles(f.x, f.y, 5, 18, DPT.foam, 380, 7);
    this.say(owner, f.x, f.y - 46, `${FISH_EMOJI[kind]} THROWN`, FISH_COLOR[kind]);
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 1.15 });
  }

  /**
   * The catfish. It doesn't attack anybody — it strips the bloom off the floor and hands you
   * every heal that was standing in it, plus a quarter. Only the green half: a red orb is not
   * food, and eating your own trap would defeat the point of having laid one.
   */
  private doCatfish(owner: Owner): void {
    const f = this.fighter(owner);
    let eaten = 0;
    for (let i = this.algae.length - 1; i >= 0; i--) {
      const a = this.algae[i];
      if (a.bad) continue;
      this.fx(owner).bubbles(a.x, a.y, 5, 20, DPT.algae, 460, 9);
      this.algae.splice(i, 1);
      eaten++;
    }

    const heal = Math.round(eaten * ALGAE_HEAL * CATFISH_BONUS);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 16, 200, DPT.cat, 660);
    if (heal > 0) {
      f.heal(heal);
      // Every point of it came off the bloom, so it counts exactly as eating the orbs would.
      this.record(owner, 'algaeHealed', heal);
      this.say(owner, f.x, f.y - 52, `🐈 +${heal}`, DPT.algae);
      Sfx.playAt('bloom', f.x, { volume: 0.85, rate: 1.1 });
    } else {
      this.say(owner, f.x, f.y - 52, '🐈 NOTHING TO EAT', DPT.cat);
      Sfx.playAt('bubble', f.x, { volume: 0.5, rate: 0.7 });
    }
  }

  /** A saw fish went in and stayed in. Ten one-point ticks a second for five seconds. */
  private stickSaw(owner: Owner, victim: Fighter): void {
    const existing = this.saws.find((s) => s.owner === owner && s.victim === victim);
    if (existing) {
      existing.until = this.now + SAW_STICK_MS;
    } else {
      this.saws.push({
        owner, victim, until: this.now + SAW_STICK_MS, tick: 0,
        orbit: Math.random() * Math.PI * 2, wig: Math.random() * 6,
      });
    }
    this.fx(owner).chomp(victim.x, victim.y, Math.random() * Math.PI * 2, 26, DPT.blood);
    this.api.spawnHitFlash(victim.x, victim.y, DPT.saw);
    this.api.showFloatingText(victim.x, victim.y - 50, '🔪 STUCK', this.hex(DPT.saw));
    Sfx.playAt('claw', victim.x, { volume: 0.7, rate: 0.9 });
  }

  /** The whale shark's five-round burst, fanned at whoever is nearest to it. */
  private whaleBurst(p: FishProj): void {
    const target = this.targetsOf(p.owner)
      .reduce<Fighter | null>((best, t) => {
        if (!best) return t;
        return Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y)
          < Phaser.Math.Distance.Between(p.x, p.y, best.x, best.y) ? t : best;
      }, null);
    if (!target) return;

    const base = Math.atan2(target.y - p.y, target.x - p.x);
    for (let i = 0; i < WHALE_BURST_SHOTS; i++) {
      const a = base + (i / (WHALE_BURST_SHOTS - 1) - 0.5) * WHALE_BURST_SPREAD;
      this.remoras.push({
        owner: p.owner,
        x: p.x + Math.cos(a) * 30,
        y: p.y + Math.sin(a) * 30,
        vx: Math.cos(a) * REMORA_SPEED,
        vy: Math.sin(a) * REMORA_SPEED,
        diesAt: this.now + REMORA_LIFE_MS,
        wig: Math.random() * 6,
      });
    }
    this.fx(p.owner).bubbles(p.x, p.y, 6, 30, DPT.foam, 460, 9);
    Sfx.playAt('whoosh', p.x, { volume: 0.45, rate: 1.4 });
  }

  private updateFishProjectiles(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const p = this.fishes[i];
      const stats = FISH_STATS[p.kind];
      const f = this.fighter(p.owner);

      // ── Whale shark: it doesn't fly at anything, it swims to where you are pointing ──
      if (p.kind === 'whaleshark') {
        const aim = this.aimOf(p.owner);
        const d = Phaser.Math.Distance.Between(p.x, p.y, aim.x, aim.y);
        if (d > 14) {
          const a = Math.atan2(aim.y - p.y, aim.x - p.x);
          p.vx = Math.cos(a) * WHALE_SPEED;
          p.vy = Math.sin(a) * WHALE_SPEED;
        } else {
          p.vx = 0;
          p.vy = 0;
        }
        if (time >= p.burstAt) {
          this.whaleBurst(p);
          p.burstAt = time + WHALE_BURST_MS;
        }
      }

      // ── Flying fish: it comes back, and it is inert on the way ──
      if (p.returning) {
        if (!this.alive(f)) {
          this.fishes.splice(i, 1);
          continue;
        }
        const a = Math.atan2(f.y - p.y, f.x - p.x);
        p.vx = Math.cos(a) * FLYER_RETURN_SPEED;
        p.vy = Math.sin(a) * FLYER_RETURN_SPEED;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= FLYER_CATCH_R) {
          // Straight back into the jaw, ready to be thrown again — no cast, no cooldown.
          this.side(p.owner).fish = 'flyingfish';
          this.fishes.splice(i, 1);
          this.fx(p.owner).splash(f.x, f.y - 16, 26, DPT.flyer);
          this.api.showFloatingText(f.x, f.y - 52, '🐬 CAUGHT', this.hex(DPT.flyer));
          Sfx.playAt('splash', f.x, { volume: 0.6, rate: 1.35 });
          continue;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wig += dt * 14;

      const hitWall = p.x <= this.left || p.x >= this.right || p.y <= this.top || p.y >= this.bottom;

      if (p.kind === 'whaleshark') {
        // Too big to be stopped by a wall, and it has nowhere else to be.
        p.x = Phaser.Math.Clamp(p.x, this.left, this.right);
        p.y = Phaser.Math.Clamp(p.y, this.top, this.bottom);
      } else if (p.returning && hitWall) {
        // Coming home takes precedence over the arena's edges — it is already inside them.
        p.x = Phaser.Math.Clamp(p.x, this.left + 1, this.right - 1);
        p.y = Phaser.Math.Clamp(p.y, this.top + 1, this.bottom - 1);
      } else if (p.kind === 'pufferfish' && hitWall) {
        // Bouncy, and only bouncy — a pufferfish that expired on a wall would be a dud.
        if (p.x <= this.left || p.x >= this.right) p.vx *= -1;
        if (p.y <= this.top || p.y >= this.bottom) p.vy *= -1;
        p.x = Phaser.Math.Clamp(p.x, this.left + 1, this.right - 1);
        p.y = Phaser.Math.Clamp(p.y, this.top + 1, this.bottom - 1);
        this.fx(p.owner).bubbles(p.x, p.y, 4, 16, DPT.puffer, 340, 9);
        Sfx.playAt('boing', p.x, { volume: 0.45, rate: 1.2 });
      } else if (hitWall) {
        if (p.kind === 'bombfish') this.detonate(p);
        else if (p.kind === 'gulper') this.releaseGulper(p, true);
        else this.fx(p.owner).bubbles(p.x, p.y, 4, 14, FISH_COLOR[p.kind], 340, 9);
        this.fishes.splice(i, 1);
        continue;
      }

      if (time >= p.diesAt) {
        if (p.kind === 'gulper') this.releaseGulper(p, false);
        this.fx(p.owner).bubbles(p.x, p.y, 4, 16, FISH_COLOR[p.kind], 380, 9);
        this.fishes.splice(i, 1);
        continue;
      }

      // Gulper: whoever is inside comes along for the ride and is chewed on the way.
      if (p.swallowed) {
        if (!this.alive(p.swallowed)) {
          p.swallowed = null;
        } else {
          this.body(p.swallowed).reset(p.x, p.y);
          p.eatAccum += GULPER_DPS * dt;
          const whole = Math.floor(p.eatAccum);
          if (whole > 0) {
            p.eatAccum -= whole;
            p.swallowed.takeDamage(whole);
          }
        }
        continue;
      }

      // A whale shark is a platform, not a projectile — its body is harmless, and a flying
      // fish on the way home has already spent its one hit.
      if (p.kind === 'whaleshark' || p.returning) continue;

      let consumed = false;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > stats.r + 12) continue;
        const last = p.hits.get(t) ?? -99999;

        switch (p.kind) {
          case 'icefish': {
            t.takeDamage(ICEFISH_DAMAGE);
            this.slowed.set(t, time + ICEFISH_SLOW_MS);
            this.api.spawnHitFlash(t.x, t.y, DPT.ice);
            this.fx(p.owner).bubbles(t.x, t.y, 7, 26, DPT.ice, 520, 9);
            this.api.showFloatingText(t.x, t.y - 44, '🧊 CHILLED', this.hex(DPT.ice));
            consumed = true;
            break;
          }
          case 'barracuda': {
            if (time - last < 400) break;
            p.hits.set(t, time);
            t.takeDamage(BARRACUDA_DAMAGE);
            this.api.spawnHitFlash(t.x, t.y, DPT.barracuda);
            this.fx(p.owner).chomp(t.x, t.y, Math.atan2(p.vy, p.vx), 22, DPT.blood);
            // Pierces: it keeps going, and can take the next body on the same line.
            break;
          }
          case 'pufferfish': {
            if (time - last < PUFFER_REHIT_MS) break;
            p.hits.set(t, time);
            t.takeDamage(PUFFER_DAMAGE);
            this.api.spawnHitFlash(t.x, t.y, DPT.puffer);
            this.fx(p.owner).bubbles(t.x, t.y, 6, 24, DPT.puffer, 420, 9);
            // Bounce off the body too, or it sits inside them chewing on the re-hit timer.
            const away = Math.atan2(p.y - t.y, p.x - t.x);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(away) * sp;
            p.vy = Math.sin(away) * sp;
            break;
          }
          case 'bombfish': {
            this.detonate(p);
            consumed = true;
            break;
          }
          case 'gulper': {
            p.swallowed = t;
            this.fx(p.owner).chomp(t.x, t.y, Math.atan2(p.vy, p.vx), 34, DPT.gulper);
            this.api.showFloatingText(t.x, t.y - 48, '🐍 SWALLOWED', this.hex(DPT.gulper));
            Sfx.playAt('slime-splat', t.x, { volume: 0.8, rate: 0.75 });
            break;
          }
          case 'sawfish': {
            // It stops here. Everything it is worth happens over the next five seconds.
            this.stickSaw(p.owner, t);
            consumed = true;
            break;
          }
          case 'swordfish': {
            if (time - last < 400) break;
            p.hits.set(t, time);
            t.takeDamage(SWORD_DAMAGE);
            this.api.spawnHitFlash(t.x, t.y, DPT.sword);
            this.fx(p.owner).slashArc(t.x, t.y, Math.atan2(p.vy, p.vx), 40, DPT.sword);
            this.api.showFloatingText(t.x, t.y - 48, '⚔️ RUN THROUGH', this.hex(DPT.sword));
            Sfx.playAt('claw', t.x, { volume: 0.8, rate: 0.7 });
            // Pierces, like the barracuda it is an escalation of.
            break;
          }
          case 'flyingfish': {
            t.takeDamage(FLYER_DAMAGE);
            this.api.spawnHitFlash(t.x, t.y, DPT.flyer);
            this.fx(p.owner).chomp(t.x, t.y, Math.atan2(p.vy, p.vx), 20, DPT.flyer);
            // Not consumed — it turns around instead, and the clock is reset so the trip
            // home can't be cut short by the throw's own two seconds running out.
            p.returning = true;
            p.diesAt = time + FISH_STATS.flyingfish.life;
            break;
          }
          // A catfish never becomes a projectile — it resolves the moment it leaves your jaw.
          // (The whale shark is already gone by here; the guard above skips it entirely.)
          case 'catfish':
            break;
        }
        if (consumed || p.swallowed || p.returning) break;
      }

      if (consumed) this.fishes.splice(i, 1);
    }
  }

  /** The bomb fish. The only fish that doesn't care whether it found a body or a wall. */
  private detonate(p: FishProj): void {
    this.fx(p.owner).blast(p.x, p.y, BOMBFISH_R, DPT.bomb);
    Sfx.playAt('explosion-medium', p.x, { volume: 0.85, rate: 0.95 });
    for (const t of this.targetsOf(p.owner)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > BOMBFISH_R) continue;
      t.takeDamage(BOMBFISH_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, DPT.bomb);
    }
  }

  /** Let go of whoever the eel is carrying. */
  private releaseGulper(p: FishProj, onWall: boolean): void {
    const v = p.swallowed;
    p.swallowed = null;
    this.fx(p.owner).splash(p.x, p.y, 34, DPT.gulper);
    if (!v || !this.alive(v)) return;
    this.body(v).reset(
      Phaser.Math.Clamp(p.x, this.left + 30, this.right - 30),
      Phaser.Math.Clamp(p.y, this.top + 30, this.bottom - 30),
    );
    this.api.showFloatingText(v.x, v.y - 46, onWall ? '🐍 SPAT AT THE WALL' : '🐍 RELEASED',
      this.hex(DPT.gulper));
  }

  // ── Mastery: the lionfish ──────────────────────────────────────────────────

  /**
   * The lionfish. It is not a throw at all — the fish comes apart where you are standing and
   * leaves fifteen of its rays hanging in the water around you.
   *
   * Every barb is worth almost nothing on its own (two points) and the field of them is worth
   * a great deal, which is exactly the shape the rest of the element already has: it is an
   * area you have made expensive to walk into rather than a shot you have to land.
   */
  private doLionfish(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < LION_BARBS; i++) {
      // A ring with the angles jittered, so it reads as a thing that burst rather than a dial.
      const a = base + (i / LION_BARBS) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const speed = LION_BARB_SPEED * (0.55 + Math.random() * 0.75);
      this.barbs.push({
        owner,
        x: f.x + Math.cos(a) * 14,
        y: f.y + Math.sin(a) * 14,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        ang: a,
        diesAt: this.now + LION_BARB_LIFE_MS,
        wig: Math.random() * 6,
      });
    }

    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(f.x, f.y, 10, 90, DPT.lion, 520);
    this.fx(owner).bubbles(f.x, f.y, 9, 40, DPT.venom, 620, 9);
    this.say(owner, f.x, f.y - 52, `🦂 ${LION_BARBS} BARBS`, DPT.venom);
    Sfx.playAt('slime-splat', f.x, { volume: 0.7, rate: 1.35 });
  }

  private updateBarbs(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.barbs.length - 1; i >= 0; i--) {
      const b = this.barbs[i];
      // They drift out of the burst and then simply hang there for the rest of their life —
      // a thicket you have to walk around, not a volley you have to dodge.
      const drag = Math.pow(LION_BARB_DRAG, dt);
      b.vx *= drag;
      b.vy *= drag;
      b.x = Phaser.Math.Clamp(b.x + b.vx * dt, this.left, this.right);
      b.y = Phaser.Math.Clamp(b.y + b.vy * dt, this.top, this.bottom);
      b.wig += dt * 3;
      if (Math.hypot(b.vx, b.vy) > 6) b.ang = Math.atan2(b.vy, b.vx);

      if (time >= b.diesAt) { this.barbs.splice(i, 1); continue; }

      for (const t of this.targetsOf(b.owner)) {
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > LION_BARB_R + 10) continue;
        this.stingBarb(b, t);
        this.barbs.splice(i, 1);
        break;
      }
    }
  }

  /** One barb goes in. Two points, then five seconds of the parts that actually matter. */
  private stingBarb(b: Barb, t: Fighter): void {
    t.takeDamage(LION_BARB_DAMAGE);
    this.api.spawnHitFlash(t.x, t.y, DPT.venom);
    this.fx(b.owner).bubbles(t.x, t.y, 4, 18, DPT.venom, 420, 9);

    // Poison rides the generic toxic fields, so the status tray, the DOT tick and the network
    // mirror all pick it up without this kit owning any of them.
    t.toxicUntil = Math.max(t.toxicUntil, this.now + LION_POISON_MS);
    t.toxicDps = Math.max(t.toxicDps, LION_POISON_DPS);
    this.applyWeaken(t);
  }

  /**
   * The venom's other half: everything the stung fighter does hits softer.
   *
   * `outgoingDamageMult` is shared with every other kit that writes it, so this kit's own
   * factor is banked per victim and divided back out rather than assigned — a refresh replaces
   * the timer, never the multiplier, so fifteen barbs are worth one weaken and not fifteen.
   */
  private applyWeaken(t: Fighter): void {
    const held = this.weakened.get(t);
    if (held) {
      held.until = this.now + LION_WEAKEN_MS;
      return;
    }
    t.outgoingDamageMult *= LION_WEAKEN_MULT;
    this.weakened.set(t, { until: this.now + LION_WEAKEN_MS, applied: LION_WEAKEN_MULT });
    this.api.showFloatingText(t.x, t.y - 46, '🦂 ENVENOMED', this.hex(DPT.venom));
  }

  private updateWeakened(time: number): void {
    for (const [t, w] of [...this.weakened]) {
      if (time < w.until && this.alive(t)) continue;
      if (t && w.applied !== 1) t.outgoingDamageMult /= w.applied;
      this.weakened.delete(t);
    }
  }

  // ── Mastery: the skele-fish ────────────────────────────────────────────────

  /** The catch gets up. One per throw, and there is no cap on how many can be walking. */
  private releaseSkele(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.skeles.push({
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * SKELE_SPEED,
      vy: Math.sin(ang) * SKELE_SPEED,
      hp: SKELE_HP,
      diesAt: this.now + SKELE_LIFE_MS,
      biteAt: 0,
      wig: Math.random() * 6,
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).splash(f.x, f.y - 16, 30, DPT.skele);
    this.say(owner, f.x, f.y - 50, '💀 IT MOVED', DPT.skele);
    Sfx.playAt('claw', f.x, { volume: 0.7, rate: 0.7 });
  }

  private updateSkeles(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.skeles.length - 1; i >= 0; i--) {
      const k = this.skeles[i];
      if (time >= k.diesAt || k.hp <= 0) {
        this.fx(k.owner).bubbles(k.x, k.y, 6, 22, DPT.skele, 460, 9);
        this.api.showFloatingText(k.x, k.y - 20, '💀 BONES', this.hex(DPT.skele));
        this.skeles.splice(i, 1);
        continue;
      }

      // Home on whoever is nearest. Nothing else about it is clever — it is a set of jaws.
      const t = this.targetsOf(k.owner).reduce<Fighter | null>((best, c) => {
        if (!best) return c;
        return Phaser.Math.Distance.Between(k.x, k.y, c.x, c.y)
          < Phaser.Math.Distance.Between(k.x, k.y, best.x, best.y) ? c : best;
      }, null);
      if (t) {
        const a = Math.atan2(t.y - k.y, t.x - k.x);
        k.vx = Math.cos(a) * SKELE_SPEED;
        k.vy = Math.sin(a) * SKELE_SPEED;
      }
      k.x = Phaser.Math.Clamp(k.x + k.vx * dt, this.left, this.right);
      k.y = Phaser.Math.Clamp(k.y + k.vy * dt, this.top, this.bottom);
      k.wig += dt * 15;

      if (t && time >= k.biteAt
        && Phaser.Math.Distance.Between(k.x, k.y, t.x, t.y) <= SKELE_R + 14) {
        k.biteAt = time + SKELE_BITE_MS;
        t.takeDamage(SKELE_BITE);
        this.api.spawnHitFlash(t.x, t.y, DPT.skele);
        this.fx(k.owner).chomp(t.x, t.y, Math.atan2(t.y - k.y, t.x - k.x), 22, DPT.blood);
        Sfx.playAt('claw', t.x, { volume: 0.55, rate: 1.5 });
      }

      // The only thing in the game that can put damage into it: a shot from the other side.
      // Melee, auras and area damage pass straight through a set of bones, by design.
      for (const child of [...this.api.projectiles.getChildren()]) {
        const proj = child as Projectile;
        if (!proj.active) continue;
        const hostile = k.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostile) continue;
        if (Phaser.Math.Distance.Between(k.x, k.y, proj.x, proj.y) > SKELE_R + 10) continue;
        k.hp -= proj.damage;
        this.api.spawnHitFlash(k.x, k.y, DPT.bone);
        this.api.showFloatingText(k.x, k.y - 16, `${Math.round(proj.damage)}`, this.hex(DPT.bone));
        proj.destroy();
        break;
      }
    }
  }

  /**
   * The Lungfish Strike, aimed at your own skeleton. Whoever wrote the rule that a fish in the
   * jaw is worth something clearly never checked whether the fish had to be alive.
   */
  private eatSkele(owner: Owner, ax: number, ay: number, bx: number, by: number): boolean {
    const f = this.fighter(owner);
    for (let i = 0; i < this.skeles.length; i++) {
      const k = this.skeles[i];
      if (k.owner !== owner) continue;
      if (this.distToSegment(ax, ay, bx, by, k.x, k.y) > SLASH_HALF_WIDTH + SKELE_R) continue;
      this.skeles.splice(i, 1);
      f.heal(SKELE_EAT_HEAL);
      this.fx(owner).chomp(f.x, f.y, Math.atan2(by - ay, bx - ax), 30, DPT.skele);
      this.say(owner, f.x, f.y - 52, `💀 +${SKELE_EAT_HEAL}`, DPT.algae);
      Sfx.playAt('bloom', f.x, { volume: 0.85, rate: 0.85 });
      return true;
    }
    return false;
  }

  // ── Mastery: Release the Kraken ────────────────────────────────────────────

  /**
   * The press.
   *
   * It never goes near `castAbility` — the enhancement is not in the element's ability list —
   * so every refusal that function applies has to be repeated here, or a disarmed angler would
   * find one key on their bar still worked.
   */
  private tryCastKraken(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.silencedUntil || wall < f.chickenUntil) return;
    if (this.now - s.krakenCastAt < KRAKEN_COOLDOWN_MS) return;
    this.summonKraken(owner, tx, ty);
    // `triggerCooldown` is both what the ability card counts down from and what puts the cast
    // on the wire — online it reaches the opponent as an unknown id and lands in
    // `replayNpcMastery`, which calls `doNpcKraken`.
    if (owner === 'player') f.triggerCooldown(KRAKEN_ID);
  }

  private summonKraken(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    s.krakenCastAt = this.now;
    // One per side. A second would only ever be standing in the first one's water.
    const old = this.krakens.findIndex((k) => k.owner === owner);
    if (old >= 0) this.releaseKraken(this.krakens[old], old);

    const x = Phaser.Math.Clamp(tx, this.left + 40, this.right - 40);
    const y = Phaser.Math.Clamp(ty, this.top + 40, this.bottom - 40);
    this.krakens.push({
      owner, x, y,
      until: this.now + KRAKEN_LIFE_MS,
      seed: Math.random() * 999,
      gape: 0.3,
      arms: Array.from({ length: KRAKEN_ARMS }, (_, i) => ({
        state: 'ready' as const,
        victim: null,
        until: 0,
        rest: (i / KRAKEN_ARMS) * Math.PI * 2 + Math.random() * 0.4,
        phase: Math.random() * 6,
      })),
    });

    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(x, y, 16, 150, DPT.kraken, 620);
    this.fx(owner).bubbles(x, y, 14, 70, DPT.foam, 800, 9);
    this.api.showFloatingText(x, y - 54, '🐙 THE KRAKEN', this.hex(DPT.kraken));
    Sfx.playAt('roar', x, { volume: 0.95, rate: 0.45 });
  }

  /** Online replay: the remote angler pressed their bound key. */
  doNpcKraken(tx: number, ty: number): void {
    this.summonKraken('npc', tx, ty);
  }

  /** Everything a kraken is holding is let go, and the record dropped. */
  private releaseKraken(k: Kraken, index: number): void {
    for (const a of k.arms) a.victim = null;
    this.fx(k.owner).ring(k.x, k.y, 20, 120, DPT.krakenDeep, 520);
    this.fx(k.owner).bubbles(k.x, k.y, 10, 50, DPT.foam, 620, 9);
    this.krakens.splice(index, 1);
  }

  /** A fish went into the beak. Every stump grows back. */
  private feedKraken(k: Kraken, kind: FishKind): void {
    let regrown = 0;
    for (const a of k.arms) {
      if (a.state !== 'spent') continue;
      a.state = 'ready';
      regrown++;
    }
    k.gape = 1;
    this.fx(k.owner).chomp(k.x, k.y + KRAKEN_HEAD_R * 0.4, Math.PI / 2, 30, FISH_COLOR[kind]);
    this.fx(k.owner).bubbles(k.x, k.y, 8, 34, DPT.kraken, 560, 9);
    this.api.showFloatingText(k.x, k.y - 48,
      regrown ? `🐙 +${regrown} ARM${regrown > 1 ? 'S' : ''}` : '🐙 FED', this.hex(DPT.kraken));
    Sfx.playAt('slime-splat', k.x, { volume: 0.8, rate: 0.6 });
  }

  /** Whether any arm anywhere already has this body. A tentacle will not take a second grip. */
  private krakenHolds(f: Fighter): boolean {
    return this.krakens.some((k) => k.arms.some((a) => a.state === 'holding' && a.victim === f));
  }

  private updateKrakens(time: number, delta: number): void {
    for (let i = this.krakens.length - 1; i >= 0; i--) {
      const k = this.krakens[i];
      if (time >= k.until) { this.releaseKraken(k, i); continue; }
      k.gape = Math.max(0.18 + 0.12 * Math.sin(time / 260 + k.seed), k.gape - delta / 700);

      for (const a of k.arms) {
        if (a.state === 'holding') {
          const v = a.victim;
          if (!v || !this.alive(v) || time >= a.until) {
            a.state = 'spent';
            a.victim = null;
            continue;
          }
          // Held rather than dragged: the body stays where the arm found it. Pinning the
          // velocity is the whole stun, because `earthStunnedUntil` is inert for a player.
          this.body(v).setVelocity(0, 0);
          v.earthStunnedUntil = Math.max(v.earthStunnedUntil, a.until);
          continue;
        }
        if (a.state !== 'ready') continue;

        for (const t of this.targetsOf(k.owner)) {
          if (t.unstoppable) continue;
          if (this.krakenHolds(t)) continue;
          if (Phaser.Math.Distance.Between(k.x, k.y, t.x, t.y) > KRAKEN_REACH) continue;
          a.state = 'holding';
          a.victim = t;
          a.until = time + KRAKEN_GRAB_MS;
          t.earthStunnedUntil = Math.max(t.earthStunnedUntil, a.until);
          k.gape = 1;
          this.fx(k.owner).ring(t.x, t.y, 8, 44, DPT.kraken, 380);
          this.api.showFloatingText(t.x, t.y - 48, '🐙 GRABBED', this.hex(DPT.kraken));
          Sfx.playAt('claw', t.x, { volume: 0.85, rate: 0.55 });
          break;
        }
      }
    }
  }

  /**
   * The bot's half of the mastery.
   *
   * Enhancement ids are not in `element.abilities`, so there is nothing for `castAbility` to
   * find and the press has to be made here — the same private-timer arrangement Magma's saw
   * uses. Everything the kraken is *worth* to a bot (a two-second stun it can walk a Lungfish
   * Strike into) is published as an opportunity field instead, so `doDepthsAbilities` never has
   * to reason about the mastery at all.
   */
  private updateNpcKraken(): void {
    const s = this.sides.npc;
    if (!this.krakenSlot('npc')) return;
    if (this.now < s.npcKrakenCheckAt) return;
    s.npcKrakenCheckAt = this.now + NPC_KRAKEN_CHECK_MS;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    if (this.now - s.krakenCastAt < KRAKEN_COOLDOWN_MS) return;
    if (this.krakens.some((k) => k.owner === 'npc')) return;
    const t = this.enemyOf('npc');
    if (!t) return;
    if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > NPC_KRAKEN_RANGE) return;
    // Dropped a little ahead of them rather than on them: by the time the mantle settles they
    // have walked on, and an arm that reaches 132px only has to be roughly right.
    const b = this.body(t);
    this.tryCastKraken('npc', t.x + b.velocity.x * 0.3, t.y + b.velocity.y * 0.3);
  }

  // ── Rare fish: the saw, and the whale shark's escort ───────────────────────

  /**
   * Saw fish, once it is in. Ten one-point ticks a second is deliberately not one ten-point
   * tick: the point of this fish is that the health bar never stops moving for five seconds.
   */
  private updateSaws(time: number, delta: number): void {
    for (let i = this.saws.length - 1; i >= 0; i--) {
      const s = this.saws[i];
      if (!this.alive(s.victim) || time >= s.until) {
        if (this.alive(s.victim)) this.fx(s.owner).bubbles(s.victim.x, s.victim.y, 4, 18, DPT.saw, 380, 9);
        this.saws.splice(i, 1);
        continue;
      }
      s.wig += (delta / 1000) * 18;
      s.tick += delta;
      while (s.tick >= SAW_TICK_MS) {
        s.tick -= SAW_TICK_MS;
        s.victim.takeDamage(SAW_TICK_DAMAGE);
      }
    }
  }

  private updateRemoras(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.remoras.length - 1; i >= 0; i--) {
      const r = this.remoras[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.wig += dt * 22;

      let hit = false;
      for (const t of this.targetsOf(r.owner)) {
        if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > REMORA_R + 12) continue;
        t.takeDamage(REMORA_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, DPT.whale);
        this.fx(r.owner).bubbles(t.x, t.y, 3, 14, DPT.foam, 320, 9);
        hit = true;
        break;
      }

      if (hit || time >= r.diesAt
        || r.x < this.left || r.x > this.right || r.y < this.top || r.y > this.bottom) {
        this.remoras.splice(i, 1);
      }
    }
  }

  // ── Megalodon ──────────────────────────────────────────────────────────────

  private updateSharks(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.sharks.length - 1; i >= 0; i--) {
      const s = this.sharks[i];

      if (s.phase === 'rush') {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.gape = 1;

        // The mouth leads the body, so the swallow point is out at the nose.
        const mx = s.x + Math.cos(s.ang) * SHARK_LEN * 0.42;
        const my = s.y + Math.sin(s.ang) * SHARK_LEN * 0.42;
        for (const t of this.targetsOf(s.owner)) {
          if (s.swallowed.includes(t)) continue;
          if (Phaser.Math.Distance.Between(mx, my, t.x, t.y) > SHARK_MOUTH_R) continue;
          s.swallowed.push(t);
          this.fx(s.owner).chomp(t.x, t.y, s.ang, 46, DPT.blood);
          this.api.showFloatingText(t.x, t.y - 50, '🦈 SWALLOWED', this.hex(DPT.shark));
          Sfx.playAt('beast-transform', t.x, { volume: 0.8, rate: 0.7 });
        }

        const past = mx < this.left || mx > this.right || my < this.top || my > this.bottom;
        if (!past) continue;

        s.phase = 'hold';
        s.x = Phaser.Math.Clamp(s.x, this.left + 40, this.right - 40);
        s.y = Phaser.Math.Clamp(s.y, this.top + 40, this.bottom - 40);
        // It turns to face the arena. Everything downstream reads the mouth off `ang`, so
        // reversing it here is what keeps a held fighter inside the walls rather than through
        // the one the shark just beached itself on.
        s.ang += Math.PI;
        s.until = time + (s.swallowed.length ? SHARK_HOLD_MS : SHARK_EMPTY_HOLD_MS);
        s.tick = 0;
        this.fx(s.owner).splash(mx, my, 60, DPT.trench);
        this.fx(s.owner).ring(s.x, s.y, 30, 140, DPT.foam, 620);
        continue;
      }

      // ── Holding against the wall ──
      s.gape = 0.15 + 0.15 * Math.sin(time / 90);
      s.swallowed = s.swallowed.filter((f) => this.alive(f));

      // Q+ — Command the Depths. The beached shark stops being furniture and becomes a body
      // you steer, which is what lets it be driven over the bloom below.
      const commanded = this.up(s.owner, 'q');
      if (commanded) {
        const aim = this.aimOf(s.owner);
        const d = Phaser.Math.Distance.Between(s.x, s.y, aim.x, aim.y);
        if (d > 12) {
          const a = Math.atan2(aim.y - s.y, aim.x - s.x);
          const step = Math.min(SHARK_FOLLOW_SPEED * dt, d);
          s.x = Phaser.Math.Clamp(s.x + Math.cos(a) * step, this.left + 40, this.right - 40);
          s.y = Phaser.Math.Clamp(s.y + Math.sin(a) * step, this.top + 40, this.bottom - 40);
          s.ang = a;
        }
      }

      const mouthX = s.x + Math.cos(s.ang) * SHARK_LEN * 0.3;
      const mouthY = s.y + Math.sin(s.ang) * SHARK_LEN * 0.3;
      for (const f of s.swallowed) this.body(f).reset(mouthX, mouthY);

      if (commanded) {
        // Anything the mouth passes over goes in with them, and lands on whoever is in there.
        // Green or red makes no difference — the damage is the grinding, not the algae.
        for (let k = this.algae.length - 1; k >= 0; k--) {
          const a = this.algae[k];
          if (Phaser.Math.Distance.Between(mouthX, mouthY, a.x, a.y) > SHARK_MOUTH_R) continue;
          this.algae.splice(k, 1);
          this.fx(s.owner).chomp(a.x, a.y, s.ang, 26, a.bad ? DPT.rot : DPT.algae);
          // The mastery's fourth requirement: a *poisoned* orb ground into somebody's mouth.
          if (a.bad && s.swallowed.length) this.record(s.owner, 'badAlgaeFeeds', 1);
          for (const f of s.swallowed) {
            f.takeDamage(SHARK_ALGAE_DAMAGE);
            this.api.spawnHitFlash(f.x, f.y, DPT.blood);
            this.api.showFloatingText(f.x, f.y - 54, '🦈 GROUND UP', this.hex(DPT.blood));
          }
          if (s.swallowed.length) Sfx.playAt('claw', mouthX, { volume: 0.8, rate: 0.6 });
        }
      }

      s.tick += delta;
      while (s.tick >= 1000) {
        s.tick -= 1000;
        for (const f of s.swallowed) {
          f.takeDamage(SHARK_DPS);
          this.api.spawnHitFlash(f.x, f.y, DPT.blood);
        }
        if (s.swallowed.length) this.fx(s.owner).bubbles(mouthX, mouthY, 5, 26, DPT.blood, 480, 9);
      }

      if (time < s.until) continue;

      // ── The spit ──
      const cx = this.api.width / 2;
      const cy = this.api.height / 2;
      for (const f of s.swallowed) {
        const a = Math.random() * Math.PI * 2;
        this.body(f).reset(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        this.fx(s.owner).splash(f.x, f.y, 40, DPT.trench);
        this.api.showFloatingText(f.x, f.y - 46, '🦈 SPAT OUT', this.hex(DPT.foam));
      }
      this.fx(s.owner).ring(s.x, s.y, 20, 150, DPT.trench, 560);
      this.sharks.splice(i, 1);
    }
  }

  // ── Icefish chill ──────────────────────────────────────────────────────────

  private updateSlows(time: number): void {
    for (const [f, until] of [...this.slowed]) {
      if (time >= until || !this.alive(f)) this.slowed.delete(f);
    }
    for (const [f, until] of [...this.swarmSlow]) {
      if (time >= until || !this.alive(f)) this.swarmSlow.delete(f);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;

    if (playerIs) {
      const f = this.api.player;
      const s = this.sides.player;
      if (!this.playerAvatar) this.playerAvatar = new DepthsAvatar(scene, this.pcol);
      this.playerAvatar.setFacing(Math.atan2(this.aimY - f.y, this.aimX - f.x));
      this.playerAvatar.setIntensity(s.boostUntil > this.now ? 1.35 : 1);
      this.playerAvatar.setHidden(s.hidden);
      this.playerAvatar.setCamo(s.camo);
      this.playerAvatar.setFish(s.fish);
      this.playerAvatar.setFishing(s.fishing ? 1 - s.fishRemain / FISH_CATCH_MS : 0);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // The rig is driven off the fade rather than the sprite's alpha, so the esca survives
      // the body going completely transparent.
      this.playerAvatar.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcIs) {
      const f = this.api.npc;
      const s = this.sides.npc;
      if (!this.npcAvatar) this.npcAvatar = new DepthsAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(Math.atan2(this.npcAimY - f.y, this.npcAimX - f.x));
      this.npcAvatar.setIntensity(s.boostUntil > this.now ? 1.35 : 1);
      this.npcAvatar.setHidden(s.hidden);
      this.npcAvatar.setCamo(s.camo);
      this.npcAvatar.setFish(s.fish);
      this.npcAvatar.setFishing(s.fishing ? 1 - s.fishRemain / FISH_CATCH_MS : 0);
      this.npcAvatar.setMastered(this.api.npcMasteryActive);
      this.npcAvatar.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /** Air pockets, blooms and lures — everything that lives on the floor. */
  private paintGround(time: number): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const d of this.drowns) {
      const fade = Phaser.Math.Clamp((d.endsAt - time) / 500, 0, 1);
      darkPuddle(g, this.col(d.owner), d.px, d.py, PUDDLE_R, this.vizT, fade, d.seed);
    }

    for (const a of this.algae) {
      const fade = Phaser.Math.Clamp((a.until - time) / 800, 0, 1);
      // Algae Trap. The red is a *view*, not a property: only the side that planted the orb
      // is shown what it really is, and on this client that can only ever be the player. An
      // online opponent's trap arrives painted green, which is the entire ability.
      algaeOrb(g, this.col(a.owner), a.x, a.y, 8, this.vizT, fade, a.seed,
        a.bad && a.owner === 'player');
    }

    // The kraken's arms lie on the floor under everybody; only its head rises into the water.
    for (const k of this.krakens) {
      const fade = Phaser.Math.Clamp((k.until - time) / 800, 0, 1);
      const tint = this.col(k.owner);
      for (const a of k.arms) {
        if (a.state === 'spent') {
          // A stump: a short curl of what is left, so an empty kraken reads as an empty one.
          const tx = k.x + Math.cos(a.rest) * 26;
          const ty = k.y + Math.sin(a.rest) * 26;
          krakenArm(g, tint, k.x, k.y, tx, ty, this.vizT, fade * 0.55, 5, a.phase, false);
          continue;
        }
        const holding = a.state === 'holding' && a.victim && this.alive(a.victim);
        const tx = holding ? a.victim!.x : k.x + Math.cos(a.rest) * KRAKEN_REACH * 0.62;
        const ty = holding ? a.victim!.y : k.y + Math.sin(a.rest) * KRAKEN_REACH * 0.62;
        krakenArm(g, tint, k.x, k.y, tx, ty, this.vizT, fade, 9, a.phase, !!holding);
      }
    }

    for (const owner of ['player', 'npc'] as Owner[]) {
      const s = this.sides[owner];
      if (!s.lureOn) continue;
      // Drawn at the fade's own strength: the deeper you are gone, the brighter the lie.
      algaeOrb(g, this.col(owner), s.lureX, s.lureY, 8, this.vizT, s.hidden, s.lureSeed);
      bubbleColumn(g, this.col(owner), s.lureX, s.lureY, this.vizT, 3, 5, 26, s.hidden * 0.6, s.lureSeed);
      // The line back to whoever is holding it — faint, and only visible up close.
      const f = this.fighter(owner);
      if (this.alive(f)) {
        g.lineStyle(1, this.col(owner)(DPT.lure), s.hidden * 0.16);
        g.lineBetween(s.lureX, s.lureY, f.x, f.y - 14);
      }
    }
  }

  /** Everything swimming, plus the oxygen bars. */
  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Piranhas in flight ──
    for (const p of this.swimmers) {
      const ang = Math.atan2(p.vy, p.vx) + Math.sin(p.wig) * 0.32;
      drawPiranha(g, this.col(p.owner), p.x, p.y, ang, 9, 1, p.wig * 1.6);
    }

    // ── Piranhas chewing ──
    for (const l of this.latches) {
      const r = 26 * l.victim.sizeMult * l.victim.shapeSizeMult;
      const lx = l.victim.x + Math.cos(l.orbit) * r;
      const ly = l.victim.y + Math.sin(l.orbit) * r * 0.9;
      // Nose-in: a piranha on a body is pointed at the body.
      const fade = Phaser.Math.Clamp((l.until - time) / 400, 0, 1);
      drawPiranha(g, this.col(l.owner), lx, ly, l.orbit + Math.PI, 9, fade, l.chew);
    }

    // ── Thrown fish ──
    for (const p of this.fishes) {
      const stats = FISH_STATS[p.kind];
      const ang = Math.atan2(p.vy, p.vx) + Math.sin(p.wig) * 0.18;
      if (p.kind === 'gulper' && p.swallowed) {
        // A full eel is a bulge with somebody in it.
        g.fillStyle(this.col(p.owner)(DPT.gulper), 0.4);
        g.fillCircle(p.x, p.y, 30 + Math.sin(p.wig * 2) * 3);
      }
      fishBody(g, this.col(p.owner), p.x, p.y, ang, stats.len,
        FISH_COLOR[p.kind], 1, FISH_PROFILE[p.kind], p.wig);
      if (p.kind === 'icefish') {
        // A cold wake, so the slow is visible before it lands.
        g.fillStyle(this.col(p.owner)(DPT.ice), 0.18);
        g.fillCircle(p.x - p.vx * 0.02, p.y - p.vy * 0.02, 16);
      }
    }

    // ── Saw fish, stuck where they landed ──
    for (const s of this.saws) {
      if (!this.alive(s.victim)) continue;
      const r = 24 * s.victim.sizeMult * s.victim.shapeSizeMult;
      const sx = s.victim.x + Math.cos(s.orbit) * r;
      const sy = s.victim.y + Math.sin(s.orbit) * r * 0.9;
      const fade = Phaser.Math.Clamp((s.until - time) / 400, 0, 1);
      // Nose-in, and buried to the gills — only the back half of a stuck fish shows.
      fishBody(g, this.col(s.owner), sx, sy, s.orbit + Math.PI, FISH_STATS.sawfish.len * 0.8,
        FISH_COLOR.sawfish, fade, FISH_PROFILE.sawfish, s.wig);
      g.fillStyle(this.col(s.owner)(DPT.blood), fade * 0.5);
      g.fillCircle(s.victim.x + Math.cos(s.orbit) * r * 0.7,
        s.victim.y + Math.sin(s.orbit) * r * 0.63, 5 + Math.sin(s.wig) * 1.4);
    }

    // ── Remoras ──
    for (const r of this.remoras) {
      const ang = Math.atan2(r.vy, r.vx) + Math.sin(r.wig) * 0.3;
      fishBody(g, this.col(r.owner), r.x, r.y, ang, 17, DPT.scale, 1, REMORA_PROFILE, r.wig);
    }

    // ── Poison barbs, hanging where the lionfish shed them ──
    for (const b of this.barbs) {
      const fade = Phaser.Math.Clamp((b.diesAt - time) / 900, 0, 1);
      poisonBarb(g, this.col(b.owner), b.x, b.y, b.ang, 26, fade, b.wig);
    }

    // ── Skele-fish ──
    for (const k of this.skeles) {
      const ang = Math.atan2(k.vy, k.vx) + Math.sin(k.wig) * 0.22;
      const fade = Phaser.Math.Clamp((k.diesAt - time) / 900, 0, 1);
      fishBody(g, this.col(k.owner), k.x, k.y, ang, FISH_STATS.skelefish.len,
        FISH_COLOR.skelefish, fade, FISH_PROFILE.skelefish, k.wig);
      // A bone bar under it — the fifty points are the whole counterplay, so they are shown.
      const w = 30;
      const r = Phaser.Math.Clamp(k.hp / SKELE_HP, 0, 1);
      g.fillStyle(this.col(k.owner)(DPT.abyss), fade * 0.8);
      g.fillRect(k.x - w / 2 - 1, k.y + 17, w + 2, 4);
      g.fillStyle(this.col(k.owner)(DPT.bone), fade * 0.95);
      g.fillRect(k.x - w / 2, k.y + 18, w * r, 2);
    }

    // ── The kraken's head ──
    for (const k of this.krakens) {
      const fade = Phaser.Math.Clamp((k.until - time) / 800, 0, 1);
      krakenHead(g, this.col(k.owner), k.x, k.y, KRAKEN_HEAD_R, this.vizT, fade, k.gape, k.seed);
    }

    // ── Sharks ──
    for (const s of this.sharks) {
      sharkBody(g, this.col(s.owner), s.x, s.y, s.ang, SHARK_LEN, 1, s.gape, this.vizT);
      if (s.phase === 'hold' && s.swallowed.length) {
        bubbleColumn(g, this.col(s.owner), s.x + Math.cos(s.ang) * SHARK_LEN * 0.3,
          s.y + Math.sin(s.ang) * SHARK_LEN * 0.3, this.vizT, 5, 8, 34, 0.7, 3);
      }
    }

    // ── Oxygen bars ──
    for (const d of this.drowns) {
      if (!this.alive(d.victim)) continue;
      const fade = Phaser.Math.Clamp((d.endsAt - time) / 400, 0, 1);
      oxygenBar(g, this.col(d.owner), d.victim.x, d.victim.y - 46, 54, d.o2, this.vizT, fade);
      // A tether from the gasping fighter to the air they are supposed to be running for.
      g.lineStyle(1.6, this.col(d.owner)(d.o2 > 0 ? DPT.cyan : DPT.blood), 0.28 * fade);
      g.lineBetween(d.victim.x, d.victim.y, d.px, d.py);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsDepths: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('depths-lure', playerIsDepths && s.lureOn ? {
      name: 'Anglerfish', emoji: '🎣', color: DPT.lure,
      description: 'The water has taken you. Whatever comes to eat the orb you left behind gives you a burst of speed and a doubled Lungfish Strike.',
      priority: 118,
    } : null);

    this.api.setStatusIndicator('depths-frenzy', playerIsDepths && s.boostUntil > time ? {
      name: 'Feeding Frenzy', emoji: '🩸', color: DPT.blood,
      description: 'Something took the bait. +50% movement speed, and Lungfish Strike hits for 30 instead of 15.',
      until: s.boostUntil, priority: 100,
    } : null);

    this.api.setStatusIndicator('depths-fishing', playerIsDepths && s.fishing ? {
      name: 'On the Line', emoji: '🎣', color: DPT.foam,
      description: 'Stand still to bring the catch in. Moving stops the line, and every hit you take adds a second.',
      priority: 120,
    } : null);

    this.api.setStatusIndicator('depths-catch', playerIsDepths && s.fish ? {
      name: FISH_LABEL[s.fish].toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      emoji: FISH_EMOJI[s.fish], color: FISH_COLOR[s.fish],
      description: this.api.hasUpgrade('f')
        ? 'A fish is clamped in your jaw. Tap F to throw it, or hold F to give it up as bait.'
        : 'A fish is clamped in your jaw. Press F again to throw it.',
      priority: 108,
    } : null);

    this.api.setStatusIndicator('depths-bait', playerIsDepths && s.baited ? {
      name: 'Baited Line', emoji: '🎣', color: DPT.lure,
      description: this.masteryOn('player')
        ? 'A fish is on the hook. The next catch comes off the rare table — and if the water has taken you when it lands, the skele-fish is on that table too.'
        : 'A fish is on the hook. The next catch comes off the rare table — saw fish, sword fish, whale shark, flying fish or catfish.',
      priority: 110,
    } : null);

    // ── Mastery ──
    const camoOn = playerIsDepths && this.masteryOn('player') && s.camo > 0.01;
    this.api.setStatusIndicator('depths-camo', camoOn ? {
      name: this.camoHidden('player') ? 'Gone' : 'Camo Fade', emoji: '🫥', color: DPT.trench,
      description: this.camoHidden('player')
        ? 'The water has you. Nothing you do makes a bubble, bots cannot aim at you at all, algae you walk over turns to poison behind you, and the line reaches the lionfish and the skele-fish. One hit worth more than 5 ends it.'
        : 'Fading. Six seconds untouched and there is nothing left to see — but any single hit worth more than 5 puts it back to the start.',
      count: Math.round(s.camo * 100), suffix: '%', priority: 112,
    } : null);

    const kraken = this.krakens.find((k) => k.owner === 'player');
    const arms = kraken ? kraken.arms.filter((a) => a.state !== 'spent').length : 0;
    this.api.setStatusIndicator('depths-kraken', kraken ? {
      name: 'The Kraken', emoji: '🐙', color: DPT.kraken,
      description: `Your kraken is on the floor. ${arms} arm${arms === 1 ? '' : 's'} left — each takes one body for 2 seconds and is then a stump until you throw a fish into the beak.`,
      count: arms, until: kraken.until, priority: 114,
    } : null);

    // ── Victim side ──
    const grabbed = this.krakens.some((k) => k.arms.some((a) => a.state === 'holding' && a.victim === p));
    this.api.setStatusIndicator('depths-grabbed', grabbed ? {
      name: 'Grabbed', emoji: '🐙', color: DPT.kraken,
      description: 'A tentacle has you. You cannot move or act for two seconds — and when it lets go, one of the other arms may take its turn.',
      priority: 5,
    } : null);

    const weak = this.weakened.get(p);
    this.api.setStatusIndicator('depths-envenomed', weak && weak.until > time ? {
      name: 'Envenomed', emoji: '🦂', color: DPT.venom,
      description: 'Lionfish venom. Everything you deal is worth 15% less until it works out of you.',
      until: weak.until, priority: 26,
    } : null);

    // ── Victim side: everything below can be on the player whoever is playing Depths. ──
    const drown = this.drowns.find((d) => d.victim === p);
    this.api.setStatusIndicator('depths-drowning', drown ? {
      name: drown.o2 > 0 ? 'Drowning' : 'No Air', emoji: '🫧', color: DPT.cyan,
      description: 'Your oxygen is running out. Reach the dark puddle to refill it — once the bar empties, the water takes 12 HP a second.',
      until: drown.endsAt, priority: 8,
    } : null);

    const chewed = this.latches.filter((l) => l.victim === p).length;
    const swarmed = this.swarming.has(p);
    this.api.setStatusIndicator('depths-chewed', chewed ? {
      name: swarmed ? 'Swarmed' : 'Chewed', emoji: '🐟', color: DPT.blood,
      description: swarmed
        ? `The school has you. ${LATCH_DPS * SWARM_DAMAGE_MULT} HP a second each while three or more are latched on.`
        : `Piranhas are latched on, taking ${LATCH_DPS} HP a second each until they let go.`,
      count: chewed, priority: 20,
    } : null);

    const dragged = this.swarmSlow.get(p);
    this.api.setStatusIndicator('depths-dragged', dragged && dragged > time ? {
      name: 'Dragged Down', emoji: '🐟', color: DPT.trench,
      description: 'A full school got on you. 20% slower until you shake the weight.',
      until: dragged, priority: 28,
    } : null);

    const sawed = this.saws.find((sw) => sw.victim === p);
    this.api.setStatusIndicator('depths-sawed', sawed ? {
      name: 'Saw Fish', emoji: '🔪', color: DPT.saw,
      description: 'There is a saw fish in you. 10 HP a second until it works itself loose.',
      until: sawed.until, priority: 18,
    } : null);

    const chill = this.slowed.get(p);
    this.api.setStatusIndicator('depths-chilled', chill && chill > time ? {
      name: 'Chilled', emoji: '🧊', color: DPT.ice,
      description: 'An icefish caught you. 20% slower until it wears off.',
      until: chill, priority: 30,
    } : null);

    const held = this.isHeld(p);
    this.api.setStatusIndicator('depths-swallowed', held ? {
      name: 'Swallowed', emoji: '🦈', color: DPT.shark,
      description: 'You are inside something. You go where it goes, and it is eating.',
      priority: 6,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * Movement multipliers. Pulled by ArenaScene rather than pushed from `update()`, which runs
   * after the frame's movement has already resolved.
   */
  getPlayerSpeedMult(): number {
    let m = 1;
    if (this.sides.player.boostUntil > this.now) m *= BOOST_MULT;
    const chill = this.slowed.get(this.api.player);
    if (chill && chill > this.now) m *= ICEFISH_SLOW_MULT;
    const drag = this.swarmSlow.get(this.api.player);
    if (drag && drag > this.now) m *= SWARM_SLOW_MULT;
    return m;
  }

  getNpcSpeedMult(): number {
    let m = 1;
    if (this.sides.npc.boostUntil > this.now) m *= BOOST_MULT;
    const chill = this.slowed.get(this.api.npc);
    if (chill && chill > this.now) m *= ICEFISH_SLOW_MULT;
    const drag = this.swarmSlow.get(this.api.npc);
    if (drag && drag > this.now) m *= SWARM_SLOW_MULT;
    return m;
  }

  /**
   * Where the NPC's feet should be going, or null to let its own state machine drive.
   *
   * Air first — nothing else matters to something that is drowning. Then a heal it can
   * actually use, then the lure, which it has no way of knowing is not a heal.
   */
  npcSeekPoint(): { x: number; y: number } | null {
    const npc = this.api.npc;
    if (!this.alive(npc)) return null;

    const drown = this.drowns.find((d) => d.victim === npc);
    if (drown) return { x: drown.px, y: drown.py };

    // Mastery synergy: an invisible angler does not eat a bloom, it poisons one. That is worth
    // walking to at *any* health short of full, because the payout is the trap and not the 12.
    const spoiling = this.camoHidden('npc');
    if ((spoiling ? npc.hp < npc.maxHp : npc.hp < npc.maxHp * 0.9) && this.algae.length) {
      let best: Algae | null = null;
      let bestD = Infinity;
      for (const a of this.algae) {
        // A poisoned orb is nothing to walk to while camouflaged: there is no heal in it and
        // nothing left to spoil.
        if (spoiling && a.bad) continue;
        const d = Phaser.Math.Distance.Between(npc.x, npc.y, a.x, a.y);
        if (d < bestD) { bestD = d; best = a; }
      }
      if (best) return { x: best.x, y: best.y };
    }

    const lure = this.sides.player;
    if (this.api.elementId === 'depths' && lure.lureOn) {
      return { x: lure.lureX, y: lure.lureY };
    }
    return null;
  }

  /** True while the NPC is standing over its own line — the AI must not walk away from it. */
  isFishing(owner: Owner): boolean { return this.side(owner).fishing; }
  hasFish(owner: Owner): boolean { return this.side(owner).fish !== null; }
  isSharkOut(owner: Owner): boolean { return this.sharks.some((s) => s.owner === owner); }
  /** How many piranhas are already on a body, so the AI stops feeding a full one. */
  latchCount(f: Fighter): number { return this.latches.filter((l) => l.victim === f).length; }
  isDrowning(f: Fighter): boolean { return this.drowns.some((d) => d.victim === f); }

  // ── Mastery: what the AI and ArenaScene are allowed to ask ─────────────────

  /**
   * True once that side has faded out completely. ArenaScene folds the player's answer into
   * `NpcAiState.targetInvisible`, which is the whole of "bots cannot attack you" — the bot
   * stops fighting and ambles instead, exactly as it does against Silence's stealth.
   */
  isCamoFull(owner: Owner): boolean {
    return this.isDepths(owner) && this.camoHidden(owner);
  }

  /** Which base ability the bot has given up to the kraken, so its rotation can skip it. */
  npcKrakenSlot(): string | null { return this.krakenSlot('npc'); }

  /**
   * A body one of the bot's own tentacles is holding right now.
   *
   * The kraken's payoff is not the two seconds by itself — it is that a Lungfish Strike aimed
   * at somebody who cannot move always connects, and a strike that connects is what buys the
   * drowning. Published here so `doDepthsAbilities` plays the combination deliberately.
   */
  npcKrakenStunTarget(): { x: number; y: number } | null {
    for (const k of this.krakens) {
      if (k.owner !== 'npc') continue;
      for (const a of k.arms) {
        if (a.state === 'holding' && a.victim && this.alive(a.victim)) {
          return { x: a.victim.x, y: a.victim.y };
        }
      }
    }
    return null;
  }

  /**
   * One of the bot's own skeletons, close enough to be eaten off the end of a slash. Only
   * offered while it is actually worth fifty health, since the strike costs sixteen seconds.
   */
  npcSkeleMeal(): { x: number; y: number } | null {
    const npc = this.api.npc;
    if (!this.alive(npc) || npc.hp > npc.maxHp - SKELE_EAT_HEAL * 0.6) return null;
    for (const k of this.skeles) {
      if (k.owner !== 'npc') continue;
      if (Phaser.Math.Distance.Between(npc.x, npc.y, k.x, k.y) > SLASH_REACH + SKELE_R) continue;
      return { x: k.x, y: k.y };
    }
    return null;
  }

  /**
   * Where the bot should throw the fish in its jaw, when the throw is worth more as a meal.
   *
   * Unlike every other synergy in this kit this one is consumed here rather than by the AI:
   * the npc never presses F for the throw at all — `updateFishing` does it 600ms after the
   * catch lands — so the *aim* is the only decision there is, and it belongs where the throw is.
   */
  private npcThrowAim(): { x: number; y: number } | null {
    const hungry = this.krakens.find((k) => k.owner === 'npc' && k.arms.some((a) => a.state === 'spent'));
    return hungry ? { x: hungry.x, y: hungry.y } : null;
  }

  /**
   * Ability tray fill. Three of the five spend most of their life showing something that is
   * not a cooldown: the line coming in, the drowning clock, and the shark's own eight seconds.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;

    if (abilityId === KRAKEN_ID) {
      // The kraken's own twenty-five seconds first, its thirty-five afterwards.
      const k = this.krakens.find((kr) => kr.owner === 'player');
      if (k) return Phaser.Math.Clamp((k.until - time) / KRAKEN_LIFE_MS, 0, 1);
      return Phaser.Math.Clamp((this.now - s.krakenCastAt) / KRAKEN_COOLDOWN_MS, 0, 1);
    }
    if (abilityId === 'depths-angler') {
      if (s.fish) return 1;
      if (s.fishing) return Phaser.Math.Clamp(1 - s.fishRemain / FISH_CATCH_MS, 0, 1);
    }
    if (abilityId === 'depths-lungfish') {
      const d = this.drowns.find((dr) => dr.owner === 'player');
      if (d) return Phaser.Math.Clamp((d.endsAt - time) / DROWN_TOTAL_MS, 0, 1);
    }
    if (abilityId === 'depths-megalodon') {
      const shark = this.sharks.find((sh) => sh.owner === 'player');
      if (shark) {
        if (shark.phase === 'rush') return 1;
        return Phaser.Math.Clamp((shark.until - time) / SHARK_HOLD_MS, 0, 1);
      }
    }
    return p.getCooldownRatio(abilityId);
  }

  /**
   * Ruin's Spikes of Ruin, razing the board.
   *
   * Only the two things the mastery *builds* answer: the kraken and a skele-fish that got up.
   * Barbs, algae, thrown fish, piranhas and the Megalodon are all shots and hazards rather
   * than structures, and are left alone exactly as the contract asks.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      razed++;
      report?.(px, py);
      return true;
    };

    for (let i = this.krakens.length - 1; i >= 0; i--) {
      const k = this.krakens[i];
      if (k.owner === exceptOwner) continue;
      if (!near(k.x, k.y)) continue;
      this.releaseKraken(k, i);
    }
    for (let i = this.skeles.length - 1; i >= 0; i--) {
      const k = this.skeles[i];
      if (k.owner === exceptOwner) continue;
      if (!near(k.x, k.y)) continue;
      this.fx(k.owner).bubbles(k.x, k.y, 6, 22, DPT.skele, 460, 9);
      this.skeles.splice(i, 1);
    }
    return razed;
  }
}
