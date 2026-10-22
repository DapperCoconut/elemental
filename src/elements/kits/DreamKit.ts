import Phaser from 'phaser';
import { FONT_DISPLAY } from '../../ui/Theme';
import { Sfx } from '../../audio';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import {
  DRM, DREAM_ORB, DREAM_WORLDS, DreamAvatar, DreamColorFn, DreamFx, DreamWorldView, LucidPanel,
  ammoClip, dreamLeech, dreamOrb, dreamShrink, dreamSpikes, dreamSplit, lullabyZone, musicBox,
  nightmareBeast, nightmareDarkness, redMistBand, scratchMarks, sleepDagger, sleepMeter, sleepyZ,
  star, stuckFeather,
} from './DreamVisuals';
import { meterGain } from '../../combat/Meters';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { smiler } from './skins/AnomalyFx';

type Owner = 'player' | 'npc';

const TAU_K = Math.PI * 2;

// ── Tuning ───────────────────────────────────────────────────────────────────

// Drowsiness
const DROWSY_MAX = 100;
/** What a sleeper burns, every second, until it runs out and they wake. */
const SLEEP_BURN_PER_SEC = 5;
/** Awake, drowsiness only wears off once nothing has added to it for this long… */
const DROWSY_IDLE_MS = 4000;
/** …and then at this rate. */
const DROWSY_DECAY_PER_SEC = 3;
/** Online: a report from the dreamer's sim this soon after a wake-up here is stale. */
const NET_WAKE_GRACE_MS = 600;

// Click — Sandmen
const SANDMEN_MAG = 30;
const SANDMEN_RELOAD_MS = 5000;
const SANDMEN_GAP_MS = 125;
const SANDMEN_DAMAGE = 4;
/** Hitscan: a round flies to the cursor and a little past it, never further. */
const SANDMEN_OVERSHOOT = 30;
const SANDMEN_MIN_RANGE = 90;
const SANDMEN_KICK = 9;
const SANDMEN_KICK_MAX = 180;
// Click (dreaming) — dream pistols
const PISTOL_MAG = 2;
const PISTOL_RELOAD_MS = 1500;
const PISTOL_GAP_MS = 240;
const PISTOL_DAMAGE = 30;
const PISTOL_BLAST_R = 54;
const PISTOL_KICK = 66;
const PISTOL_KICK_MAX = 260;
/** The crosshair only starts finding its way home once the trigger has been off this long. */
const RECOIL_SETTLE_MS = 220;
/** Exponential recovery rate once settled, per second. */
const RECOIL_RECOVER = 5;
/** The bot fights its own recoil all the time, at this rate, and kicks less to begin with. */
const NPC_RECOIL_TAME = 8;
const NPC_RECOIL_SHARE = 0.5;
const HIT_R = 22;

// E — Delve
const DELVE_RANGE = 170;
const DREAM_SPEED_MULT = 1.35;
const DREAM_COOLDOWN_MULT = 0.6;

// R — Pillow Fight / (dreaming) Claw Swipe
const PILLOW_REACH = 90;
const PILLOW_HALF_ARC = Math.PI / 3;
const PILLOW_DAMAGE = 6;
const PILLOW_DROWSY = 20;
const PILLOW_FRESH_AT = 10;
const PILLOW_FRESH_DROWSY = 34;
const CLAW_REACH = 100;
const CLAW_HALF_ARC = (55 * Math.PI) / 180;
const CLAW_DAMAGE = 30;
const CLAW_SLOW_MS = 2500;
const CLAW_SLOW_MULT = 0.55;

// F — Sleep Tight / (dreaming) Living Leech
const DAGGER_SPEED = 1150;
const DAGGER_RANGE = 640;
const DAGGER_R = 6;
const DAGGER_DAMAGE = 8;
const DAGGER_DROWSY = 16;
/** Extra drowsiness at a full meter, scaled down linearly to none at an empty one. */
const DAGGER_DROWSY_BONUS = 14;
const LEECH_SPEED = 640;
const LEECH_RANGE = 560;
const LEECH_R = 10;
const LEECH_DAMAGE = 22;
const LEECH_DRAIN = 3;
const LEECH_DRAIN_MS = 1000;
const LEECH_LIFE_MS = 8000;
const LEECH_PICKUP_R = 52;
/** Share of F's remaining cooldown a pulled leech gives back — more off a fed one. */
const LEECH_REFUND_FED = 0.6;
const LEECH_REFUND_DRY = 0.4;

// Q — Nightmare
const NIGHTMARE_MIN_DROWSY = 50;
const NIGHTMARE_RANGE = 520;
const NIGHTMARE_MS = 3000;
const NIGHTMARE_TICK_MS = 250;
const NIGHTMARE_TICK_DAMAGE = 5;
const NIGHTMARE_VULN = 1.25;
const NIGHTMARE_DROWSY_COST = 15;
const NIGHTMARE_SIGHT = 110;
const NIGHTMARE_PANIC_DEG = 40;
// Q (dreaming) — the nightmare that walks
const BEAST_STEP_EVERY_MS = 420;
const BEAST_STEP_MS = 150;
const BEAST_STEP_LEN = 38;
const BEAST_JITTER = 0.6;
const BEAST_CATCH_R = 30;
const BEAST_LIFE_MS = 10000;

// ── Shop upgrades ────────────────────────────────────────────────────────────

// Click+ — Amnesia
const AMNESIA_SPEED = 820;
/** A body this close to where the clip goes off takes the whole clip rather than its pellets. */
const AMNESIA_CORE_R = 28;
const AMNESIA_CORE_PER_ROUND = 1.5;
const AMNESIA_PELLET_SPEED = 640;
const AMNESIA_PELLET_RANGE = 250;
const AMNESIA_PELLET_DAMAGE = 4;
const AMNESIA_BLAST_R = 64;
// Click+ in a dream — the pistols' rounds thrown as one
const AMNESIA_DREAM_R = 115;
const AMNESIA_DREAM_ONE = 30;
const AMNESIA_DREAM_TWO = 75;

// E+ — Lucid Dream. Bits of the mask, in the panel's order.
const LUCID_SPLIT = 1 << 0;
const LUCID_SPIKES = 1 << 1;
const LUCID_BUFF = 1 << 2;
const LUCID_MIST = 1 << 3;
const LUCID_SHRINK = 1 << 4;
const LUCID_BUTTONS = [
  { key: 'split', emoji: '🪞', name: 'SPLIT' },
  { key: 'spikes', emoji: '🗡️', name: 'SPIKES' },
  { key: 'buff', emoji: '✨', name: 'EMPOWER' },
  { key: 'mist', emoji: '🩸', name: 'RED MIST' },
  { key: 'shrink', emoji: '🔲', name: 'SHRINK' },
];
/** Every switch that is on makes the sleeper burn their drowsiness this much faster. */
const LUCID_WAKE_PER = 0.25;
const LUCID_SPLIT_PAD = 22;
const LUCID_SPIKE_PATCHES = 7;
const LUCID_SPIKE_R = 26;
const LUCID_SPIKE_PERIOD_MS = 2600;
const LUCID_SPIKE_DAMAGE = 8;
const LUCID_SPIKE_GAP_MS = 500;
const LUCID_BUFF_SPEED = 1.2;
const LUCID_BUFF_DODGE = 0.2;
const LUCID_MIST_BAND = 70;
const LUCID_MIST_DAMAGE = 5;
const LUCID_MIST_GAP_MS = 400;
const LUCID_SHRINK_K = 0.62;

// R+ — Unending Comfort
const FEATHER_MS = 8000;
const FEATHER_MAX = 6;
/** Drowsiness per feather, every time one of your attacks lands — at most this often. */
const FEATHER_DROWSY = 1.5;
const FEATHER_GAP_MS = 350;
const SCRATCH_MS = 8000;
const SCRATCH_MAX = 6;
const SCRATCH_BONUS = 3;

// F+ — Sleeping Pills
const PILL_MS = 4000;
const PILL_DROWSY_PER_SEC = 6;
const LEECH_UP_DAMAGE = 30;
const LEECH_UP_DRAIN = 5;
const LEECH_DROP_MS = 12000;
const LEECH_DROP_PICKUP_R = 90;

// Q+ — Sleep Paralysis
const PARALYSIS_MS = 5000;
const PARALYSIS_SLOW = 0.8;

// ── Mastery ──────────────────────────────────────────────────────────────────

const BOX_ID = 'dream-music-box';
/** Held longer than this, the box throws itself. */
const BOX_MAX_CHARGE_MS = 5000;
const BOX_MAX_MS = 20000;
const BOX_MIN_MS = 2000;
const BOX_CD_MS = 12000;
const BOX_FLIGHT_MS = 450;
const BOX_R = 110;
const BOX_DROWSY_PER_SEC = 4;
const BOX_MAX_LIVE = 2;
// Dreamcatcher
const ORB_ROLL_MS = 700;
const ORB_CHANCE = 0.35;
const ORB_DIGEST_MS = 5000;
const ORB_HEAL = 10;
const MIGHT_MS = 10000;
const MIGHT_PER = 0.1;
const MIGHT_MAX = 5;

/** The tray's second set of names, for while the local dreamer is inside somebody's dream. */
const DREAM_CARDS: Record<string, { name: string; desc: string }> = {
  'dream-sandmen': { name: 'Dream Pistols', desc: '30 explosive a shot, perfect aim. 2 rounds, then reload — and brutal kick.' },
  'dream-delve': { name: 'Surface', desc: 'Back out to the waking world. They stay asleep; top them up and come back.' },
  'dream-pillow-fight': { name: 'Claw Swipe', desc: '30 damage in a wide rake, and a 2.5s slow.' },
  'dream-sleep-tight': { name: 'Living Leech', desc: 'Bites for 22 and keeps feeding. Walk up and pull it out to heal for all of it.' },
  'dream-nightmare': { name: 'Nightmare', desc: 'The nightmare, and a second one that stalks them on foot.' },
};

// ── State ────────────────────────────────────────────────────────────────────

/**
 * The bookkeeping the kit keeps on a body it is working on. The drowsiness and the sleep
 * themselves are Fighter fields (`dreamDrowsy` / `dreamAsleep`) so the tray and the online
 * mirror can read them; this is what sits around them.
 */
interface SleepRec {
  /** Last seen `rawDamageTaken` — waking is "you were hurt", detected without owning the callback. */
  lastRaw: number;
  lastGainAt: number;
  /** `scene.time.now` of the last wake-up, for the online staleness guard. */
  wokeAt: number;
  /** Whose sleep this is — colours the meter and owns the stun it renews. */
  by: Owner;
  nightmareBy: Owner;
  nightmareAccum: number;
  /** True while this kit holds the nightmare's vulnerability on the body. */
  vulnHeld: boolean;
}

/** One side's guns. */
interface Guns {
  mag: number;
  reloadUntil: number;
  pistolMag: number;
  pistolReloadUntil: number;
  nextShotAt: number;
  /** Which hand fires next: they take turns, so the rounds never line up. */
  side: 0 | 1;
  /** How far the recoil has walked the aim off the mouse, in world px. */
  recoilX: number;
  recoilY: number;
  lastShotAt: number;
}

function makeGuns(): Guns {
  return {
    mag: SANDMEN_MAG, reloadUntil: 0, pistolMag: PISTOL_MAG, pistolReloadUntil: 0,
    nextShotAt: 0, side: 0, recoilX: 0, recoilY: 0, lastShotAt: -1e9,
  };
}

/** A dreamer inside somebody's dream. One per side at most. */
interface Realm {
  owner: Owner;
  victim: Fighter;
  world: number;
  casterHome: { x: number; y: number };
  victimHome: { x: number; y: number };
  startedAt: number;
  /** The waking world this dream is laid over — what Lucid Dream splits, shrinks and lines. */
  box: { x: number; y: number; w: number; h: number };
  /** Lucid Dream's split: the side of the seam the foe is kept on, once it has been decided. */
  splitSide: number;
  spikeNextAt: number;
  mistNextAt: number;
}

/** Amnesia: a magazine in the air. */
interface Clip {
  owner: Owner;
  sx: number; sy: number;
  tx: number; ty: number;
  t0: number;
  dur: number;
  rounds: number;
  dream: boolean;
  spin: number;
}

/** Amnesia: one round thrown out of the clip when it goes off. */
interface Pellet {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
  skip: Set<Fighter>;
}

/** Sleeping Pills: a dagger left in somebody, still dosing them. */
interface Pill {
  owner: Owner;
  victim: Fighter;
  ox: number; oy: number;
  ang: number;
  until: number;
}

/** Unending Comfort: what is stuck in a body. */
interface Marks {
  feathers: { until: number; ang: number; ox: number; oy: number }[];
  scratches: number[];
  featherAt: number;
}

/** Mastery: a music box, in the air and then playing. */
interface MusicBox {
  owner: Owner;
  sx: number; sy: number;
  x: number; y: number;
  t0: number;
  landed: boolean;
  until: number;
  dur: number;
}

/** Mastery: a dream drawn out of a sleeper, on its way to the dreamcatcher. */
interface Orb {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  bad: boolean;
}

interface Catcher {
  digest: { bad: boolean; readyAt: number }[];
  might: number[];
  nextRollAt: number;
}

function makeCatcher(): Catcher { return { digest: [], might: [], nextRollAt: 0 }; }

interface Dagger {
  owner: Owner;
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
}

interface Leech {
  owner: Owner;
  state: 'flying' | 'stuck' | 'ground';
  x: number; y: number;
  vx: number; vy: number;
  travelled: number;
  victim: Fighter | null;
  /** Where on the victim it is biting, relative to their centre. */
  ox: number; oy: number;
  ang: number;
  dealt: number;
  drainAccum: number;
  until: number;
  /** Sleeping Pills: a leech that fed itself full and fell off — easier to pick back up. */
  dropped: boolean;
}

interface Beast {
  owner: Owner;
  victim: Fighter;
  x: number; y: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  stepAt: number;
  nextStepAt: number;
  facing: number;
  until: number;
}

/** What the bot reads off the kit each frame. Built side-effect free — see `npcAiInfo`. */
export interface DreamNpcInfo {
  inDream: boolean;
  targetDrowsy: number;
  targetAsleep: boolean;
  /** Sandmen (or the pistols) can fire right now. */
  canFire: boolean;
  /** A sleeper is in Delve range. */
  delveReady: boolean;
  /** In a dream with too little drowsiness left to be worth staying: surface and top up. */
  shouldSurface: boolean;
  /** The target has the 50 drowsiness Nightmare needs. */
  nightmareReady: boolean;
  /** At 10 or less, so the pillow pays its bigger dose. */
  pillowFresh: boolean;
  /** A leech of the bot's is out (stuck or lying about). */
  leechOut: boolean;
  /** R+: feathers are in an awake target — every round adds drowsiness, so shoot. */
  featherShots: boolean;
  /** R+ in a dream: scratch them before the pistols, every scratch adds 3 to every hit. */
  clawFirst: boolean;
  /** Mastery: the key the music box was bound over, which the rotation leaves alone. */
  boxSlot?: 'r' | 'f' | 'q';
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DreamArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op ally, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  /** Skins: maps a Dream visual colour through that side's equipped skin. */
  dreamColor(owner: Owner, base: number): number;
  skinId(owner: Owner): string | null;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay a press that never touches a cooldown (surfacing, a pulled leech). */
  broadcast(id: string): void;
  /** Rename one tray card — the dream turns every key but E into something else. */
  relabelCard(abilityId: string, name: string, desc: string): void;
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── DreamKit ─────────────────────────────────────────────────────────────────

/**
 * Dream — the sandman with two little guns.
 *
 * - **Sandmen** (Click): a held barrage of hitscan rounds, turn about from two guns, with a
 *   kick that walks the crosshair off target. In a dream they become two dream pistols.
 * - **Delve** (E): step into a sleeper's dream — a full-screen world of its own, framed in
 *   purple mist, where they are awake and fighting but cannot be woken, and you are faster.
 * - **Pillow Fight** (R): the gentle way to put somebody under. In a dream, a claw.
 * - **Sleep Tight** (F): a quick dagger that puts them under faster the sleepier they are. In a
 *   dream, a leech you pull back out to heal.
 * - **Nightmare** (Q): darkness, panic and damage for anyone at 50 drowsiness. In a dream it
 *   also lets something loose to stalk them.
 *
 * Sleep is victim-side (`Fighter.dreamDrowsy` / `dreamAsleep`), so a Dream-versus-Dream match
 * has both sides writing the same two numbers. Waking is detected by polling `rawDamageTaken`.
 */
export class DreamKit {
  private api: DreamArenaApi;

  // ── Visuals ──
  private readonly pcol: DreamColorFn;
  private readonly ncol: DreamColorFn;
  private readonly pfx: DreamFx;
  private readonly nfx: DreamFx;
  private playerAvatar: DreamAvatar | null = null;
  private npcAvatar: DreamAvatar | null = null;
  /** Daggers, leeches and the walking nightmare. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Sleep meters over heads. */
  private overheadGfx: Phaser.GameObjects.Graphics | null = null;
  /** The darkness a nightmare drops over the local player. Screen space. */
  private darkGfx: Phaser.GameObjects.Graphics | null = null;
  /** The crosshair the recoil kicks around. */
  private cursorGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  /** The dream on this screen, if the local player is in one (as dreamer or as dreamt). */
  private view: DreamWorldView | null = null;
  /** Dreams still fading out after they ended. */
  private fading: DreamWorldView[] = [];
  private cursorHidden = false;
  private vizT = 0;

  // ── Sim ──
  private recs = new Map<Fighter, SleepRec>();
  private guns: Record<Owner, Guns> = { player: makeGuns(), npc: makeGuns() };
  private realms: Partial<Record<Owner, Realm>> = {};
  private daggers: Dagger[] = [];
  private leeches: Leech[] = [];
  private beasts: Beast[] = [];
  private delveCount = 0;
  private lastAimX = 0;
  private lastAimY = 0;
  /** Latched so the tray is only renamed when the dream actually starts or ends. */
  private cardsDreaming = false;
  /** Throttle for the "why didn't that work" labels. */
  private deniedAt = 0;

  // ── Upgrades + mastery ──
  private clips: Clip[] = [];
  private pellets: Pellet[] = [];
  private pills: Pill[] = [];
  private marks = new Map<Fighter, Marks>();
  private lucid: Record<Owner, number> = { player: 0, npc: 0 };
  private panel: LucidPanel | null = null;
  private panelHover = -1;
  /** A press that landed on the panel holds the guns until it is let go. */
  private panelLatch = false;
  private leftWasDown = false;
  private rightWasDown = false;
  /** Lucid Dream's floor (spikes, the seam, the dark) and its mist, world space. */
  private floorGfx: Phaser.GameObjects.Graphics | null = null;
  private topGfx: Phaser.GameObjects.Graphics | null = null;
  private boxes: MusicBox[] = [];
  private winds: Partial<Record<Owner, { startAt: number; planMs: number }>> = {};
  private boxLastAt: Record<Owner, number> = { player: -BOX_CD_MS, npc: -BOX_CD_MS };
  private orbs: Orb[] = [];
  private catchers: Record<Owner, Catcher> = { player: makeCatcher(), npc: makeCatcher() };
  private npcAmnesiaAt = 0;
  private npcLucidAt = 0;

  constructor(api: DreamArenaApi) {
    this.api = api;
    this.pcol = (base) => api.dreamColor('player', base);
    this.ncol = (base) => api.dreamColor('npc', base);
    this.pfx = new DreamFx(api.scene, this.pcol);
    this.nfx = new DreamFx(api.scene, this.ncol);
    // Leaving the arena with the system cursor still hidden would follow the player all the
    // way back to the menu, so the scene's own teardown hands it back.
    api.scene.events.on('shutdown', () => this.releaseCursor());
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DreamFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DreamColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private isDream(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'dream' : this.api.npcElementId === 'dream';
  }
  /** A cast from the online opponent: already validated on their sim, so it is trusted here. */
  private remote(owner: Owner): boolean { return owner === 'npc' && this.api.isOnline; }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private avatar(owner: Owner): DreamAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  /** The owner's skin rig, or the sleepwalker. A Dream skin rig must extend `DreamAvatar` (it drives the guns). */
  private makeAvatar(owner: Owner): DreamAvatar {
    const skin = makeSkinAvatar(this.api.skinId(owner), this.api.scene);
    if (skin instanceof DreamAvatar) return skin;
    skin?.destroy();
    return new DreamAvatar(this.api.scene, this.col(owner));
  }
  /** Anomaly skin: this side's dreams are all the Backrooms. */
  private backrooms(owner: Owner): boolean { return this.api.skinId(owner) === 'anomaly'; }

  /** This side is a Dream and owns the upgrade for `slot`. */
  private up(owner: Owner, slot: string): boolean {
    return this.isDream(owner) && this.api.hasUpgrade(owner, slot);
  }

  private masteryOn(owner: Owner): boolean {
    return this.isDream(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which slot the music box was dropped on, or null. */
  private boxSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const sl of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(sl) : this.api.npcMasteryBindFor(sl);
      if (bind === BOX_ID) return sl;
    }
    return null;
  }

  /** How many of a list of expiry times are still running. */
  private live(list: { until: number }[] | number[]): number {
    let n = 0;
    for (const e of list) if ((typeof e === 'number' ? e : e.until) > this.now) n++;
    return n;
  }

  private marksOf(f: Fighter): Marks {
    let m = this.marks.get(f);
    if (!m) { m = { feathers: [], scratches: [], featherAt: -1e9 }; this.marks.set(f, m); }
    return m;
  }

  /** Mastery requirement: every magazine refilled counts, however it was emptied. */
  private noteReload(owner: Owner): void {
    if (owner === 'player') this.api.recordMasteryStat('reloads', 1);
  }

  /** Mastery: the red dreams the dreamcatcher has digested, as a damage multiplier. */
  private might(owner: Owner): number {
    return 1 + MIGHT_PER * Math.min(MIGHT_MAX, this.live(this.catchers[owner].might));
  }

  /** Lucid Dream's switches that are actually shaping a dream of this side's right now. */
  private lucidMask(owner: Owner): number {
    return this.realms[owner] && this.up(owner, 'e') ? this.lucid[owner] : 0;
  }

  private static bits(mask: number): number {
    let n = 0;
    for (let m = mask; m; m &= m - 1) n++;
    return n;
  }

  /** How much faster than usual this body is burning its sleep — Lucid Dream's price. */
  private burnMult(f: Fighter): number {
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.realms[owner]?.victim === f) return 1 + LUCID_WAKE_PER * DreamKit.bits(this.lucidMask(owner));
    }
    return 1;
  }

  private rec(f: Fighter): SleepRec {
    let r = this.recs.get(f);
    if (!r) {
      // Seeded from the running tally, or every existing point of damage would read as one
      // enormous hit on the first frame this body is tracked.
      r = { lastRaw: f.rawDamageTaken, lastGainAt: 0, wokeAt: -1e9, by: 'player', nightmareBy: 'player', nightmareAccum: 0, vulnHeld: false };
      this.recs.set(f, r);
    }
    return r;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'player') return this.api.enemies.filter((f) => this.alive(f) && this.api.isTargetable(f));
    return this.api.isInvasion ? [] : [this.api.player].filter((f) => this.alive(f));
  }

  /** Every body the kit has to look after this frame. */
  private tracked(): Fighter[] {
    const out = new Set<Fighter>();
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) if (this.alive(f)) out.add(f);
    return [...out];
  }

  private bounds(): Phaser.Geom.Rectangle { return this.api.scene.physics.world.bounds; }

  /** Kit-made label — the arena's own floating text is switched off, so the ones that matter are ours. */
  private announce(x: number, y: number, text: string, color: string, size = 12): void {
    const t = this.api.scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#0b0620', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19);
    this.api.scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private deny(text: string): void {
    if (this.now - this.deniedAt < 700) return;
    this.deniedAt = this.now;
    const p = this.api.player;
    this.announce(p.x, p.y - 44, text, '#c9b8ff', 11);
  }

  private releaseCursor(): void {
    if (!this.cursorHidden) return;
    this.cursorHidden = false;
    this.api.scene.input.setDefaultCursor('default');
  }

  /**
   * Dream's damage. `dot` marks the ticking kind (a nightmare, a leech feeding, Lucid Dream's
   * hazards), which the R+ marks leave alone — feathers and scratches only answer attacks.
   */
  private strike(t: Fighter, amount: number, by: Owner, dot = false): void {
    let dmg = amount * this.might(by);
    if (!dot) {
      const m = this.marks.get(t);
      if (m) {
        // Scratches only exist inside the dream, and every one adds to every attack in there.
        const sc = this.live(m.scratches);
        if (sc > 0) dmg += SCRATCH_BONUS * sc;
        const fe = this.live(m.feathers);
        if (fe > 0 && this.now - m.featherAt >= FEATHER_GAP_MS) {
          m.featherAt = this.now;
          this.addDrowsy(t, FEATHER_DROWSY * fe, by);
        }
      }
    }
    const wasAlive = t.hp > 0;
    t.takeDamage(dmg);
    // Mastery requirement: a dream they never woke up from.
    if (wasAlive && t.hp <= 0 && by === 'player' && this.realms.player?.victim === t) {
      this.api.recordMasteryStat('dreamKills', 1);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // The dream holds positions, a cooldown share and the arena's backdrop — hand all of it
    // back before the state is thrown away.
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.realms[owner]) this.exitRealm(owner, 'reset');
    }
    this.view?.destroy(); this.view = null;
    for (const v of this.fading) v.destroy();
    this.fading = [];
    this.realms = {};
    this.recs.clear();
    this.guns = { player: makeGuns(), npc: makeGuns() };
    this.daggers = [];
    this.leeches = [];
    this.beasts = [];
    this.delveCount = 0;
    this.cardsDreaming = false;
    this.deniedAt = 0;
    this.vizT = 0;
    this.clips = [];
    this.pellets = [];
    this.pills = [];
    this.marks.clear();
    this.lucid = { player: 0, npc: 0 };
    this.panel?.destroy(); this.panel = null;
    this.panelHover = -1;
    this.panelLatch = false;
    this.leftWasDown = false;
    this.rightWasDown = false;
    this.floorGfx?.destroy(); this.floorGfx = null;
    this.topGfx?.destroy(); this.topGfx = null;
    this.boxes = [];
    this.winds = {};
    this.boxLastAt = { player: -BOX_CD_MS, npc: -BOX_CD_MS };
    this.orbs = [];
    this.catchers = { player: makeCatcher(), npc: makeCatcher() };
    this.npcAmnesiaAt = 0;
    this.npcLucidAt = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.overheadGfx?.destroy(); this.overheadGfx = null;
    this.darkGfx?.destroy(); this.darkGfx = null;
    this.cursorGfx?.destroy(); this.cursorGfx = null;
    this.hudLabel?.destroy(); this.hudLabel = null;
    this.releaseCursor();

    for (const f of [this.api.player, this.api.npc]) {
      if (!f) continue;
      f.dreamDrowsy = 0;
      f.dreamAsleep = false;
      f.dreamNetDrowsy = 0;
      f.dreamNetAsleep = false;
      f.dreamNightmareUntil = 0;
      f.dreamClawedUntil = 0;
      f.dreamParalysisUntil = 0;
      f.dreamSlowMult = 1;
      f.dreamLucidDodge = 0;
      f.dreamIncomingMult = 1;
      f.dreamCooldownMult = 1;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'dream') return;
    void time;
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;
    const p = this.api.player;
    const leftClicked = pointer.isDown && !this.leftWasDown;
    this.leftWasDown = pointer.isDown;
    const right = pointer.rightButtonDown();
    const rightClicked = right && !this.rightWasDown;
    this.rightWasDown = right;
    if (!pointer.isDown) this.panelLatch = false;
    if (!this.alive(p)) return;
    // Asleep in the waking world: the controls are not yours.
    if (p.dreamAsleep && !this.isDreaming(p)) return;

    const aim = this.aimFor('player');
    const ctx = this.api.buildPlayerContext(aim.x, aim.y);
    const realm = this.realms.player;

    // E+ Lucid Dream: a click on the panel flips a switch and never fires a gun.
    this.panelHover = -1;
    if (realm && this.up('player', 'e') && this.panel) {
      const cam = this.api.scene.cameras.main;
      this.panelHover = this.panel.hit(mouseX - cam.scrollX, mouseY - cam.scrollY);
      if (leftClicked && this.panelHover >= 0) {
        this.toggleLucid(this.panelHover);
        this.panelLatch = true;
      }
    }

    if (pointer.isDown && !this.panelLatch && this.canFire('player')) p.castAbility('dream-sandmen', ctx);
    // Click+ Amnesia: right-click throws whatever is left in the guns.
    if (rightClicked && this.up('player', 'click')) {
      if (this.canAmnesia('player')) this.throwAmnesia('player', aim.x, aim.y);
      else this.deny('⌛ NOTHING LEFT TO THROW');
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      if (realm) {
        this.surfaceByHand('player');
      } else if (this.delveCandidate('player')) {
        p.castAbility('dream-delve', ctx);
      } else {
        this.deny('💤 NOBODY ASLEEP NEARBY');
      }
    }
    // Mastery: the key the music box was dropped on winds the box instead.
    const box = this.boxSlot('player');
    if (box) this.handleBoxKey(box === 'r' ? this.api.rKey : box === 'f' ? this.api.fKey : this.api.qKey);
    if (box !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('dream-pillow-fight', ctx);
    if (box !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('dream-sleep-tight', ctx);
    if (box !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (this.nightmareTarget('player')) p.castAbility('dream-nightmare', ctx);
      else if (p.getCooldownRatio('dream-nightmare') >= 1) this.deny(`👁️ NEEDS ${NIGHTMARE_MIN_DROWSY}% DROWSY`);
    }
  }

  /** Held: wind. Let go (or hold past five seconds): throw. The key is read raw, never JustDown. */
  private handleBoxKey(key: Phaser.Input.Keyboard.Key): void {
    const w = this.winds.player;
    if (key.isDown && !w) {
      if (this.boxReady('player')) this.winds.player = { startAt: this.now, planMs: BOX_MAX_CHARGE_MS };
      return;
    }
    if (w && !key.isDown) this.releaseBox('player', this.lastAimX, this.lastAimY);
  }

  /** Where this side is really pointing: the mouse (or the bot's aim) plus the recoil. */
  private aimFor(owner: Owner): { x: number; y: number } {
    const g = this.guns[owner];
    if (owner === 'player') {
      const p = this.api.player;
      const mx = this.lastAimX || p.x + 1;
      const my = this.lastAimY || p.y;
      return { x: mx + g.recoilX, y: my + g.recoilY };
    }
    const npc = this.api.npc;
    const t = this.targetsOf('npc')[0];
    return { x: (t?.x ?? npc.x + 1) + g.recoilX, y: (t?.y ?? npc.y) + g.recoilY };
  }

  // ── Click: Sandmen / dream pistols ─────────────────────────────────────────

  /** Side-effect free: whether this side's guns would go off right now. */
  canFire(owner: Owner): boolean {
    const g = this.guns[owner];
    const t = this.now;
    if (t < g.nextShotAt) return false;
    if (this.realms[owner]) return t >= g.pistolReloadUntil && g.pistolMag > 0;
    return t >= g.reloadUntil && g.mag > 0;
  }

  doSandmen(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    // A trusted replay fires whatever its own magazine says; the bot and the player are gated.
    if (!this.remote(owner) && !this.canFire(owner)) return;
    if (this.realms[owner]) this.firePistol(owner, f, tx, ty);
    else this.fireSandman(owner, f, tx, ty);
  }

  /** The bot's aim carries its own recoil, the player's already has it from `aimFor`. */
  private botAim(owner: Owner, tx: number, ty: number): { x: number; y: number } {
    if (owner !== 'npc' || this.remote(owner)) return { x: tx, y: ty };
    const g = this.guns.npc;
    return { x: tx + g.recoilX, y: ty + g.recoilY };
  }

  private muzzleOf(owner: Owner, f: Fighter, side: 0 | 1, aimX: number, aimY: number): { x: number; y: number } {
    const av = this.avatar(owner);
    // A rig built this frame still has its hands springing in from the origin; until they
    // arrive, shoot from where the hand will be rather than from the corner of the arena.
    const m = av?.muzzle(side);
    if (m && Phaser.Math.Distance.Between(m.x, m.y, f.x, f.y) < 70) return m;
    const a = Math.atan2(aimY - f.y, aimX - f.x);
    const s = side === 0 ? -1 : 1;
    return { x: f.x + Math.cos(a) * 26 - Math.sin(a) * 10 * s, y: f.y + Math.sin(a) * 26 + Math.cos(a) * 10 * s };
  }

  /** First body a ray from (x1,y1) toward (x2,y2) runs into, and where. */
  private rayHit(owner: Owner, x1: number, y1: number, x2: number, y2: number): { t: Fighter | null; x: number; y: number } {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let best: Fighter | null = null;
    let bestU = 1;
    for (const t of this.targetsOf(owner)) {
      const r = HIT_R * (t.scaleX || 1);
      const u = Phaser.Math.Clamp(((t.x - x1) * dx + (t.y - y1) * dy) / len2, 0, 1);
      const px = x1 + dx * u, py = y1 + dy * u;
      if ((t.x - px) ** 2 + (t.y - py) ** 2 > r * r) continue;
      // Step back to where the ray first enters the body, so the tracer stops on its skin.
      const back = Math.sqrt(Math.max(0, r * r - ((t.x - px) ** 2 + (t.y - py) ** 2))) / Math.sqrt(len2);
      const enter = Math.max(0, u - back);
      if (enter < bestU) { bestU = enter; best = t; }
    }
    return { t: best, x: x1 + dx * bestU, y: y1 + dy * bestU };
  }

  private kickRecoil(owner: Owner, kick: number, cap: number, spread: number): void {
    const g = this.guns[owner];
    const share = owner === 'npc' ? NPC_RECOIL_SHARE : 1;
    // Mostly up, wandering side to side, and each hand pulls its own way.
    const bias = g.side === 0 ? -0.35 : 0.35;
    const a = -Math.PI / 2 + bias + (Math.random() * 2 - 1) * spread;
    g.recoilX += Math.cos(a) * kick * share;
    g.recoilY += Math.sin(a) * kick * share;
    const m = Math.hypot(g.recoilX, g.recoilY);
    if (m > cap) { g.recoilX *= cap / m; g.recoilY *= cap / m; }
  }

  private fireSandman(owner: Owner, f: Fighter, tx: number, ty: number): void {
    const g = this.guns[owner];
    const aim = this.botAim(owner, tx, ty);
    const side = g.side;
    const mz = this.muzzleOf(owner, f, side, aim.x, aim.y);
    const ang = Math.atan2(aim.y - mz.y, aim.x - mz.x);
    const reach = Math.max(SANDMEN_MIN_RANGE, Phaser.Math.Distance.Between(mz.x, mz.y, aim.x, aim.y) + SANDMEN_OVERSHOOT);
    const ex = mz.x + Math.cos(ang) * reach, ey = mz.y + Math.sin(ang) * reach;
    const hit = this.rayHit(owner, mz.x, mz.y, ex, ey);
    if (hit.t) {
      this.strike(hit.t, SANDMEN_DAMAGE, owner);
      this.syncDamage(hit.t);
    }
    this.fx(owner).sandShot(mz.x, mz.y, hit.x, hit.y, !!hit.t);
    this.avatar(owner)?.kick(side, 0.7);

    g.side = side === 0 ? 1 : 0;
    g.nextShotAt = this.now + SANDMEN_GAP_MS * f.dreamCooldownMult;
    g.lastShotAt = this.now;
    this.kickRecoil(owner, SANDMEN_KICK, SANDMEN_KICK_MAX, 0.95);
    g.mag--;
    if (g.mag <= 0) {
      g.reloadUntil = this.now + SANDMEN_RELOAD_MS;
      g.mag = SANDMEN_MAG;
      this.noteReload(owner);
      Sfx.playAt('reload', f.x, { rate: 0.8, volume: 0.6 });
      if (owner === 'player') this.announce(f.x, f.y - 46, '⌛ RELOADING', '#f0d48a', 10);
    }
  }

  private firePistol(owner: Owner, f: Fighter, tx: number, ty: number): void {
    const g = this.guns[owner];
    const aim = this.botAim(owner, tx, ty);
    const side = g.side;
    const mz = this.muzzleOf(owner, f, side, aim.x, aim.y);
    // Perfect accuracy: the round goes exactly where the crosshair is (or into whoever is
    // standing in the way first), and it is the *kick afterwards* that is the problem.
    const hit = this.rayHit(owner, mz.x, mz.y, aim.x, aim.y);
    this.fx(owner).pistolShot(mz.x, mz.y, hit.x, hit.y);
    this.fx(owner).starBurst(hit.x, hit.y, PISTOL_BLAST_R);
    Sfx.playAt('explosion-small', hit.x, { rate: 1.3, volume: 0.55 });
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, hit.x, hit.y) > PISTOL_BLAST_R + HIT_R * 0.5) continue;
      this.strike(t, PISTOL_DAMAGE, owner);
      this.syncDamage(t);
      this.api.spawnHitFlash(t.x, t.y, DRM.pistol);
    }
    this.avatar(owner)?.kick(side, 1.4);
    this.api.scene.cameras.main.shake(70, 0.002);

    g.side = side === 0 ? 1 : 0;
    g.nextShotAt = this.now + PISTOL_GAP_MS;
    g.lastShotAt = this.now;
    this.kickRecoil(owner, PISTOL_KICK, PISTOL_KICK_MAX, 0.6);
    g.pistolMag--;
    if (g.pistolMag <= 0) {
      g.pistolReloadUntil = this.now + PISTOL_RELOAD_MS * f.dreamCooldownMult;
      g.pistolMag = PISTOL_MAG;
      this.noteReload(owner);
      Sfx.playAt('reload', f.x, { rate: 0.6, volume: 0.7 });
    }
  }

  private updateRecoil(owner: Owner, dt: number): void {
    const g = this.guns[owner];
    const rate = owner === 'npc' ? NPC_RECOIL_TAME : (this.now - g.lastShotAt > RECOIL_SETTLE_MS ? RECOIL_RECOVER : 0);
    if (rate <= 0) return;
    const k = Math.exp(-rate * dt);
    g.recoilX *= k;
    g.recoilY *= k;
  }

  // ── E: Delve ───────────────────────────────────────────────────────────────

  /** Whether this body is inside somebody's dream right now (awake in there, asleep out here). */
  isDreaming(f: Fighter): boolean {
    return this.realms.player?.victim === f || this.realms.npc?.victim === f;
  }

  /** The nearest sleeper this side could step into. Side-effect free. */
  private delveCandidate(owner: Owner): Fighter | null {
    if (this.realms[owner]) return null;
    const f = this.fighter(owner);
    if (!this.alive(f) || f.dreamAsleep) return null;
    let best: Fighter | null = null;
    let bestD = DELVE_RANGE;
    for (const t of this.targetsOf(owner)) {
      if (!t.dreamAsleep || this.isDreaming(t)) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d <= bestD) { bestD = d; best = t; }
    }
    return best;
  }

  doDelve(owner: Owner): void {
    if (this.realms[owner]) {
      // A bot presses E to come back out; a replay never toggles (surfacing has its own relay).
      if (!this.remote(owner)) this.exitRealm(owner, 'surface');
      return;
    }
    const victim = this.remote(owner) ? this.api.player : this.delveCandidate(owner);
    if (!this.alive(victim)) return;
    this.enterRealm(owner, victim);
  }

  /** The player surfacing: off the cooldown's books, so it is restamped and relayed by hand. */
  private surfaceByHand(owner: Owner): void {
    const f = this.fighter(owner);
    if (f.getCooldownRatio('dream-delve') < 1) return;
    f.restampCooldown('dream-delve');
    this.exitRealm(owner, 'surface');
    if (owner === 'player' && this.api.isOnline) this.api.broadcast('dream-surface');
  }

  /**
   * Online: the opponent's own presses that never touch a cooldown — surfacing, a pulled leech,
   * Amnesia's throw, a Lucid Dream switch and the music box. Whatever they need rides in the id.
   */
  replayNet(id: string): void {
    const [head, ...args] = id.split(':');
    const n = args.map((a) => Number(a) || 0);
    // Online every coordinate is mirrored left-to-right, and these ones ride in the id.
    const mx = (x: number): number => this.bounds().width - x;
    if (head === 'dream-surface') {
      if (this.realms.npc) this.exitRealm('npc', 'surface');
    } else if (head === 'dream-leech-off') {
      this.leeches = this.leeches.filter((l) => l.owner !== 'npc');
    } else if (head === 'dream-amnesia') {
      this.launchClip('npc', mx(n[2]), n[3], n[0], n[1] === 1);
    } else if (head === 'dream-lucid') {
      this.lucid.npc = n[0];
    } else if (head === 'dream-box') {
      this.boxLastAt.npc = this.now;
      this.spawnBox('npc', mx(n[1]), n[2], n[0]);
    }
  }

  private enterRealm(owner: Owner, victim: Fighter): void {
    const f = this.fighter(owner);
    // Online, both sims have to dream the same place, and both see every delve in order.
    const world = this.api.isOnline
      ? this.delveCount % DREAM_WORLDS.length
      : (this.delveCount + Math.floor(Math.random() * DREAM_WORLDS.length)) % DREAM_WORLDS.length;
    this.delveCount++;
    // The arena is the dream's floor; in Invasion the map scrolls, so it is whatever the camera
    // was showing when they went under.
    const wb = this.bounds();
    const cam = this.api.scene.cameras.main;
    const box = this.api.isInvasion
      ? { x: cam.scrollX, y: cam.scrollY, w: this.api.width, h: this.api.height }
      : { x: wb.x, y: wb.y, w: wb.width, h: wb.height };
    const realm: Realm = {
      owner, victim, world,
      casterHome: { x: f.x, y: f.y },
      victimHome: { x: victim.x, y: victim.y },
      startedAt: this.now,
      box, splitSide: 0, spikeNextAt: 0, mistNextAt: 0,
    };
    this.realms[owner] = realm;
    // Their sleep is still running out here — it is only the body that is up and about now.
    if (victim.earthStunnedUntil <= this.now + 200) victim.earthStunnedUntil = this.now;
    this.daggers = this.daggers.filter((d) => d.owner !== owner);
    this.fx(owner).delveSwirl(victim.x, victim.y, false);
    this.fx(owner).delveSwirl(f.x, f.y, false);
    Sfx.playAt('dream-chime', victim.x, { rate: 0.7, volume: 0.9 });

    const local = this.api.player;
    if (f === local || victim === local) {
      this.view?.destroy();
      const br = this.backrooms(owner);
      this.view = new DreamWorldView(this.api.scene, this.col(owner), world, this.api.width, this.api.height, this.api.isInvasion, br);
      const w = br ? { name: 'The Backrooms', color: '#e8d36a' } : DREAM_WORLDS[world];
      const banner = this.api.scene.add.text(this.api.width / 2, 92, `💭 ${w.name.toUpperCase()}`, {
        fontSize: '22px', fontFamily: FONT_DISPLAY, color: w.color, stroke: '#0b0620', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(24).setScrollFactor(0).setAlpha(0);
      this.api.scene.tweens.add({
        targets: banner, alpha: 1, y: 82, duration: 380, yoyo: true, hold: 900,
        onComplete: () => banner.destroy(),
      });
    }
  }

  private exitRealm(owner: Owner, why: 'surface' | 'woke' | 'reset' | 'ended'): void {
    const realm = this.realms[owner];
    if (!realm) return;
    delete this.realms[owner];
    const f = this.fighter(owner);
    const v = realm.victim;

    if (why !== 'reset') {
      // Back to where the bodies were lying. Online each sim only moves its own fighter —
      // the other one arrives on the position stream. Husks stay where the dream left them.
      const mayMove = (x: Fighter): boolean => (!this.api.isOnline || x === this.api.player)
        && (x === this.api.player || x === this.api.npc);
      if (this.alive(f) && mayMove(f)) {
        f.setPosition(realm.casterHome.x, realm.casterHome.y);
        this.body(f)?.setVelocity(0, 0);
      }
      if (this.alive(v) && mayMove(v)) {
        v.setPosition(realm.victimHome.x, realm.victimHome.y);
        this.body(v)?.setVelocity(0, 0);
      }
      this.fx(owner).delveSwirl(f.x, f.y, true);
    }
    f.dreamCooldownMult = 1;
    f.dreamLucidDodge = 0;
    // Whatever was dreamt stays in the dream — the claw's scratches included.
    this.leeches = this.leeches.filter((l) => l.owner !== owner);
    this.beasts = this.beasts.filter((b) => b.owner !== owner);
    const vm = this.marks.get(v);
    if (vm) vm.scratches = [];

    if (this.view && (f === this.api.player || v === this.api.player)) {
      this.view.close();
      this.fading.push(this.view);
      this.view = null;
    }
    if (why === 'woke' && this.alive(v)) {
      this.announce(v.x, v.y - 50, '⏰ THE DREAM ENDS', '#d8e2ff');
    }
  }

  // ── R: Pillow Fight / Claw Swipe ───────────────────────────────────────────

  doPillowFight(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    if (this.realms[owner]) {
      this.doClaw(owner, f, ang);
      return;
    }
    this.fx(owner).pillowSwing(f.x, f.y, ang, PILLOW_REACH);
    this.avatar(owner)?.play('sweep', ang);
    for (const t of this.inArc(owner, f, ang, PILLOW_REACH, PILLOW_HALF_ARC)) {
      this.fx(owner).feathers(t.x, t.y, 9, ang);
      if (t.dreamAsleep) {
        // A sleeper gets tucked in, not hit: no damage, so nothing wakes them.
        this.addDrowsy(t, PILLOW_DROWSY, owner);
      } else {
        const fresh = t.dreamDrowsy <= PILLOW_FRESH_AT;
        this.strike(t, PILLOW_DAMAGE, owner);
        this.addDrowsy(t, fresh ? PILLOW_FRESH_DROWSY : PILLOW_DROWSY, owner);
        if (fresh) this.announce(t.x, t.y - 46, '🥱 YAWN', '#bfd0ff', 10);
      }
      // R+ Unending Comfort: a few feathers stay behind in them.
      if (this.up(owner, 'r')) this.stickFeathers(t, ang);
    }
  }

  private doClaw(owner: Owner, f: Fighter, ang: number): void {
    this.fx(owner).clawSwipe(f.x, f.y, ang, CLAW_REACH);
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('claw', f.x, { rate: 0.9, volume: 0.8 });
    for (const t of this.inArc(owner, f, ang, CLAW_REACH, CLAW_HALF_ARC)) {
      this.strike(t, CLAW_DAMAGE, owner);
      this.syncDamage(t);
      t.dreamClawedUntil = Math.max(t.dreamClawedUntil, this.now + CLAW_SLOW_MS);
      this.api.spawnHitFlash(t.x, t.y, DRM.claw);
      // R+ in a dream: the claw leaves scratches, and every scratch makes every hit worse.
      if (this.up(owner, 'r')) {
        const m = this.marksOf(t);
        m.scratches = m.scratches.filter((u) => u > this.now);
        const add = Phaser.Math.Between(1, 3);
        for (let i = 0; i < add && m.scratches.length < SCRATCH_MAX; i++) m.scratches.push(this.now + SCRATCH_MS);
        this.announce(t.x, t.y - 46, `🩸 ${m.scratches.length} SCRATCH${m.scratches.length > 1 ? 'ES' : ''}`, '#ff7aa8', 10);
      }
    }
  }

  /** R+: 1–3 feathers left in a body, each for 8 seconds, at most six in at once. */
  private stickFeathers(t: Fighter, ang: number): void {
    const m = this.marksOf(t);
    m.feathers = m.feathers.filter((e) => e.until > this.now);
    const add = Phaser.Math.Between(1, 3);
    for (let i = 0; i < add && m.feathers.length < FEATHER_MAX; i++) {
      // Driven in on the side the pillow came from, at a jaunty angle.
      const a = ang + Math.PI + (Math.random() - 0.5) * 2.2;
      m.feathers.push({ until: this.now + FEATHER_MS, ang: a, ox: Math.cos(a) * 12, oy: Math.sin(a) * 10 });
    }
  }

  private inArc(owner: Owner, f: Fighter, ang: number, reach: number, half: number): Fighter[] {
    return this.targetsOf(owner).filter((t) => {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > reach + HIT_R) return false;
      if (d < HIT_R) return true;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      return diff <= half;
    });
  }

  // ── F: Sleep Tight / Living Leech ──────────────────────────────────────────

  doSleepTight(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.play('punch', ang);
    const sx = f.x + Math.cos(ang) * 20, sy = f.y + Math.sin(ang) * 20;
    if (this.realms[owner]) {
      this.leeches.push({
        owner, state: 'flying', x: sx, y: sy,
        vx: Math.cos(ang) * LEECH_SPEED, vy: Math.sin(ang) * LEECH_SPEED, travelled: 0,
        victim: null, ox: 0, oy: 0, ang, dealt: 0, drainAccum: 0, until: 0, dropped: false,
      });
      Sfx.playAt('whoosh', f.x, { rate: 0.6, volume: 0.6 });
      return;
    }
    this.daggers.push({ owner, x: sx, y: sy, vx: Math.cos(ang) * DAGGER_SPEED, vy: Math.sin(ang) * DAGGER_SPEED, travelled: 0 });
  }

  private updateDaggers(dt: number): void {
    const b = this.bounds();
    for (let i = this.daggers.length - 1; i >= 0; i--) {
      const d = this.daggers[i];
      const steps = 3;
      let done = false;
      for (let s = 0; s < steps && !done; s++) {
        d.x += (d.vx * dt) / steps;
        d.y += (d.vy * dt) / steps;
        d.travelled += (DAGGER_SPEED * dt) / steps;
        for (const t of this.targetsOf(d.owner)) {
          if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > HIT_R + DAGGER_R) continue;
          this.daggerHit(d, t);
          done = true;
          break;
        }
      }
      if (done || d.travelled > DAGGER_RANGE || !b.contains(d.x, d.y)) this.daggers.splice(i, 1);
    }
  }

  private daggerHit(d: Dagger, t: Fighter): void {
    const f = this.fighter(d.owner);
    const sleepy = Phaser.Math.Clamp(t.dreamDrowsy / DROWSY_MAX, 0, 1);
    // A sleeper is not stabbed — only sung to.
    if (!t.dreamAsleep) this.strike(t, DAGGER_DAMAGE, d.owner);
    this.addDrowsy(t, DAGGER_DROWSY + DAGGER_DROWSY_BONUS * sleepy, d.owner);
    this.fx(d.owner).stardust(t.x, t.y, 6, 20, 520, 8);
    this.api.spawnHitFlash(t.x, t.y, DRM.blade);
    // F+ Sleeping Pills: the dagger stays in, and keeps dosing them while it does.
    if (this.up(d.owner, 'f')) {
      const a = Math.atan2(d.vy, d.vx);
      this.pills = this.pills.filter((p) => p.victim !== t || p.owner !== d.owner);
      this.pills.push({ owner: d.owner, victim: t, ox: -Math.cos(a) * 10, oy: -Math.sin(a) * 8, ang: a, until: this.now + PILL_MS });
    }
    if (this.alive(f)) {
      const cd = (f.element.abilities.find((a) => a.id === 'dream-sleep-tight')?.cooldown ?? 6000) * f.dreamCooldownMult;
      f.reduceCooldown('dream-sleep-tight', cd * 0.5);
    }
  }

  private updateLeeches(dt: number, delta: number): void {
    const b = this.bounds();
    for (let i = this.leeches.length - 1; i >= 0; i--) {
      const l = this.leeches[i];
      const caster = this.fighter(l.owner);
      if (l.state === 'flying') {
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.travelled += LEECH_SPEED * dt;
        const t = this.targetsOf(l.owner).find((x) => Phaser.Math.Distance.Between(l.x, l.y, x.x, x.y) <= HIT_R + LEECH_R);
        if (t) {
          l.state = 'stuck';
          l.victim = t;
          l.ox = (l.x - t.x) * 0.7;
          l.oy = (l.y - t.y) * 0.7;
          l.until = this.now + LEECH_LIFE_MS;
          const bite = this.up(l.owner, 'f') ? LEECH_UP_DAMAGE : LEECH_DAMAGE;
          this.strike(t, bite, l.owner);
          this.syncDamage(t);
          l.dealt += bite;
          this.api.spawnHitFlash(t.x, t.y, DRM.leechBelly);
          this.announce(t.x, t.y - 44, '🪱 LATCHED ON', '#ff7ab0', 10);
        } else if (l.travelled > LEECH_RANGE || !b.contains(l.x, l.y)) {
          l.state = 'ground';
          l.until = this.now + LEECH_LIFE_MS;
        }
      } else if (l.state === 'stuck') {
        const v = l.victim;
        if (!this.alive(v)) { l.state = 'ground'; l.victim = null; continue; }
        l.x = v.x + l.ox;
        l.y = v.y + l.oy;
        l.ang = Math.atan2(-l.oy, -l.ox);
        l.drainAccum += delta;
        while (l.drainAccum >= LEECH_DRAIN_MS) {
          l.drainAccum -= LEECH_DRAIN_MS;
          const drain = this.up(l.owner, 'f') ? LEECH_UP_DRAIN : LEECH_DRAIN;
          this.strike(v, drain, l.owner, true);
          l.dealt += drain;
        }
      }
      if (l.state !== 'flying' && this.now >= l.until) {
        if (l.state === 'stuck' && this.up(l.owner, 'f')) {
          // F+: fed full, it lets go and lies there for you to come and collect.
          l.state = 'ground';
          l.victim = null;
          l.dropped = true;
          l.until = this.now + LEECH_DROP_MS;
          this.announce(l.x, l.y - 30, '🪱 FULL', '#ff9cc8', 10);
          continue;
        }
        this.leeches.splice(i, 1);
        continue;
      }
      // Pulling it back out: walk up to wherever it is.
      if (l.state !== 'flying' && this.alive(caster) && !this.remote(l.owner)
        && Phaser.Math.Distance.Between(caster.x, caster.y, l.x, l.y) <= (l.dropped ? LEECH_DROP_PICKUP_R : LEECH_PICKUP_R)) {
        this.pullLeech(l, caster);
        this.leeches.splice(i, 1);
      }
    }
  }

  private pullLeech(l: Leech, caster: Fighter): void {
    const fed = l.dealt > 0;
    if (fed) caster.heal(l.dealt);
    const ratio = caster.getCooldownRatio('dream-sleep-tight');
    const cd = (caster.element.abilities.find((a) => a.id === 'dream-sleep-tight')?.cooldown ?? 6000) * caster.dreamCooldownMult;
    caster.reduceCooldown('dream-sleep-tight', (1 - ratio) * cd * (fed ? LEECH_REFUND_FED : LEECH_REFUND_DRY));
    this.fx(l.owner).stardust(l.x, l.y, 8, 24, 600, 8);
    this.announce(caster.x, caster.y - 44, fed ? `🩸 +${Math.round(l.dealt)}` : '🪱 PULLED', '#ff9cc8', 11);
    if (l.owner === 'player' && this.api.isOnline) this.api.broadcast('dream-leech-off');
  }

  // ── Q: Nightmare ───────────────────────────────────────────────────────────

  /** Who a Nightmare from this side would land on. Side-effect free. */
  private nightmareTarget(owner: Owner): Fighter | null {
    const realm = this.realms[owner];
    if (realm) return this.alive(realm.victim) && realm.victim.dreamDrowsy >= NIGHTMARE_MIN_DROWSY ? realm.victim : null;
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    let best: Fighter | null = null;
    let bestD = NIGHTMARE_RANGE;
    for (const t of this.targetsOf(owner)) {
      if (t.dreamDrowsy < NIGHTMARE_MIN_DROWSY) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d <= bestD) { bestD = d; best = t; }
    }
    return best;
  }

  doNightmare(owner: Owner, tx: number, ty: number): void {
    void tx; void ty;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const realm = this.realms[owner];
    const t = this.remote(owner) ? (realm?.victim ?? this.api.player) : this.nightmareTarget(owner);
    if (!this.alive(t)) return;
    this.avatar(owner)?.play('raise');
    this.applyNightmare(t, owner);
    t.dreamDrowsy = Math.max(0, t.dreamDrowsy - NIGHTMARE_DROWSY_COST);
    if (t.dreamAsleep && t.dreamDrowsy <= 0) this.wake(t, 'natural');
    if (realm) {
      const a = Math.atan2(t.y - f.y, t.x - f.x);
      const bx = f.x + Math.cos(a) * 30, by = f.y + Math.sin(a) * 30;
      this.beasts.push({
        owner, victim: t, x: bx, y: by, fromX: bx, fromY: by, toX: bx, toY: by,
        stepAt: this.now, nextStepAt: this.now + BEAST_STEP_EVERY_MS, facing: a, until: this.now + BEAST_LIFE_MS,
      });
      this.fx(owner).ring(bx, by, 6, 46, DRM.dread, 420, 4, 8);
    }
  }

  private applyNightmare(t: Fighter, owner: Owner): void {
    const r = this.rec(t);
    t.dreamNightmareUntil = this.now + NIGHTMARE_MS;
    r.nightmareBy = owner;
    r.nightmareAccum = 0;
    // Q+ Sleep Paralysis: for a while after, nothing lets their drowsiness go down.
    if (this.up(owner, 'q')) t.dreamParalysisUntil = Math.max(t.dreamParalysisUntil, this.now + PARALYSIS_MS);
    if (owner === 'player' && t !== this.api.player) this.api.recordMasteryStat('nightmares', 1);
    this.fx(owner).ring(t.x, t.y, 10, 70, DRM.dread, 520, 5, 8);
    this.api.spawnHitFlash(t.x, t.y, DRM.dread);
    this.announce(t.x, t.y - 52, '👁️ NIGHTMARE', '#ff3b6b', 13);
    // Panic: the local victim's whole screen shudders.
    if (t === this.api.player) this.api.scene.cameras.main.shake(260, 0.006);
  }

  private updateBeasts(): void {
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const b = this.beasts[i];
      const v = b.victim;
      if (!this.alive(v) || this.now >= b.until || !this.realms[b.owner]) {
        this.fx(b.owner).stardust(b.x, b.y, 6, 26, 600, 7);
        this.beasts.splice(i, 1);
        continue;
      }
      // Lurch, freeze, lurch: a jittery step toward them, never a walk.
      if (this.now >= b.nextStepAt) {
        const a = Math.atan2(v.y - b.y, v.x - b.x) + (Math.random() * 2 - 1) * BEAST_JITTER;
        b.fromX = b.x; b.fromY = b.y;
        b.toX = b.x + Math.cos(a) * BEAST_STEP_LEN;
        b.toY = b.y + Math.sin(a) * BEAST_STEP_LEN;
        b.facing = a;
        b.stepAt = this.now;
        b.nextStepAt = this.now + BEAST_STEP_EVERY_MS * (0.7 + Math.random() * 0.6);
      }
      const u = Phaser.Math.Clamp((this.now - b.stepAt) / BEAST_STEP_MS, 0, 1);
      b.x = b.fromX + (b.toX - b.fromX) * u;
      b.y = b.fromY + (b.toY - b.fromY) * u;
      if (Phaser.Math.Distance.Between(b.x, b.y, v.x, v.y) <= BEAST_CATCH_R) {
        this.applyNightmare(v, b.owner);
        this.fx(b.owner).ring(b.x, b.y, 6, 60, DRM.dreadDeep, 480, 6, 8);
        this.beasts.splice(i, 1);
      }
    }
  }

  // ── Click+: Amnesia ────────────────────────────────────────────────────────

  /** Side-effect free: whether this side has rounds left to throw (and is not mid-reload). */
  private canAmnesia(owner: Owner): boolean {
    const f = this.fighter(owner);
    if (!this.up(owner, 'click') || !this.alive(f)) return false;
    const g = this.guns[owner];
    if (this.realms[owner]) return this.now >= g.pistolReloadUntil && g.pistolMag > 0;
    return this.now >= g.reloadUntil && g.mag > 0;
  }

  /** Throw the rest of the magazine at (tx, ty) and start the reload it costs. */
  private throwAmnesia(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const g = this.guns[owner];
    const dream = !!this.realms[owner];
    let rounds: number;
    if (dream) {
      rounds = g.pistolMag;
      g.pistolMag = PISTOL_MAG;
      g.pistolReloadUntil = this.now + PISTOL_RELOAD_MS * f.dreamCooldownMult;
    } else {
      rounds = g.mag;
      g.mag = SANDMEN_MAG;
      g.reloadUntil = this.now + SANDMEN_RELOAD_MS;
      if (owner === 'player') this.announce(f.x, f.y - 46, '⌛ RELOADING', '#f0d48a', 10);
    }
    this.noteReload(owner);
    Sfx.playAt('reload', f.x, { rate: 0.7, volume: 0.6 });
    this.launchClip(owner, tx, ty, rounds, dream);
    if (owner === 'player' && this.api.isOnline) {
      this.api.broadcast(`dream-amnesia:${rounds}:${dream ? 1 : 0}:${Math.round(tx)}:${Math.round(ty)}`);
    }
  }

  private launchClip(owner: Owner, tx: number, ty: number, rounds: number, dream: boolean): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const d = Phaser.Math.Distance.Between(f.x, f.y, tx, ty);
    this.clips.push({
      owner, sx: f.x, sy: f.y, tx, ty, t0: this.now, dur: Math.max(160, (d / AMNESIA_SPEED) * 1000),
      rounds, dream, spin: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 6),
    });
    this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('whoosh', f.x, { rate: 1.2, volume: 0.6 });
  }

  private updateClips(dt: number): void {
    for (let i = this.clips.length - 1; i >= 0; i--) {
      const c = this.clips[i];
      if (this.now - c.t0 < c.dur) continue;
      this.clips.splice(i, 1);
      if (c.dream) this.amnesiaDreamBurst(c);
      else this.amnesiaBurst(c);
    }
    const b = this.bounds();
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];
      const step = AMNESIA_PELLET_SPEED * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.travelled += step;
      let done = p.travelled > AMNESIA_PELLET_RANGE || !b.contains(p.x, p.y);
      if (!done) {
        for (const t of this.targetsOf(p.owner)) {
          if (p.skip.has(t)) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > HIT_R * (t.scaleX || 1) + 3) continue;
          this.strike(t, AMNESIA_PELLET_DAMAGE, p.owner);
          this.syncDamage(t);
          this.fx(p.owner).sandShot(p.x - p.vx * 0.02, p.y - p.vy * 0.02, t.x, t.y, true);
          done = true;
          break;
        }
      }
      if (done) this.pellets.splice(i, 1);
    }
  }

  /**
   * The clip goes off. Whoever is right under it takes the whole magazine at once; everyone
   * else is in the way of the rounds it throws out in every direction.
   */
  private amnesiaBurst(c: Clip): void {
    const fx = this.fx(c.owner);
    fx.flash(c.tx, c.ty, AMNESIA_BLAST_R * 0.6);
    fx.ring(c.tx, c.ty, 8, AMNESIA_BLAST_R, DRM.sand, 380, 5, 8);
    fx.stardust(c.tx, c.ty, 10, 40, 700, 8);
    Sfx.playAt('explosion-small', c.tx, { rate: 1.1, volume: 0.7 });
    this.api.scene.cameras.main.shake(90, 0.003);
    const core = new Set<Fighter>();
    for (const t of this.targetsOf(c.owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, c.tx, c.ty) > AMNESIA_CORE_R + HIT_R * 0.5) continue;
      core.add(t);
      this.strike(t, c.rounds * AMNESIA_CORE_PER_ROUND, c.owner);
      this.syncDamage(t);
      this.api.spawnHitFlash(t.x, t.y, DRM.sand);
    }
    const off = Math.random() * TAU_K;
    for (let i = 0; i < c.rounds; i++) {
      const a = off + (i / c.rounds) * TAU_K + (Math.random() - 0.5) * 0.12;
      this.pellets.push({
        owner: c.owner,
        x: c.tx + Math.cos(a) * AMNESIA_CORE_R, y: c.ty + Math.sin(a) * AMNESIA_CORE_R,
        vx: Math.cos(a) * AMNESIA_PELLET_SPEED, vy: Math.sin(a) * AMNESIA_PELLET_SPEED,
        travelled: 0, skip: core,
      });
    }
    if (c.owner === 'player' && c.rounds > 0) this.announce(c.tx, c.ty - 30, `💥 ${c.rounds} ROUNDS`, '#f0d48a', 11);
  }

  /** In a dream there is no clip to scatter — both pistols' rounds go off as one big star. */
  private amnesiaDreamBurst(c: Clip): void {
    const both = c.rounds >= PISTOL_MAG;
    const dmg = both ? AMNESIA_DREAM_TWO : AMNESIA_DREAM_ONE;
    const fx = this.fx(c.owner);
    fx.starBurst(c.tx, c.ty, AMNESIA_DREAM_R);
    fx.ring(c.tx, c.ty, 12, AMNESIA_DREAM_R + 20, both ? DRM.star : DRM.purple, 520, 7, 9);
    fx.flash(c.tx, c.ty, AMNESIA_DREAM_R * 0.5);
    Sfx.playAt('explosion', c.tx, { rate: 1.2, volume: 0.75 });
    this.api.scene.cameras.main.shake(both ? 180 : 110, both ? 0.007 : 0.004);
    for (const t of this.targetsOf(c.owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, c.tx, c.ty) > AMNESIA_DREAM_R + HIT_R * 0.5) continue;
      this.strike(t, dmg, c.owner);
      this.syncDamage(t);
      this.api.spawnHitFlash(t.x, t.y, DRM.pistol);
    }
    this.announce(c.tx, c.ty - 34, both ? '💥 BOTH BARRELS' : '💥 AMNESIA', both ? '#fff4c2' : '#c9b8ff', both ? 13 : 11);
  }

  // ── E+: Lucid Dream ────────────────────────────────────────────────────────

  private toggleLucid(i: number): void {
    this.lucid.player ^= 1 << i;
    const on = (this.lucid.player & (1 << i)) !== 0;
    const p = this.api.player;
    this.announce(p.x, p.y - 48, `${LUCID_BUTTONS[i].emoji} ${LUCID_BUTTONS[i].name} ${on ? 'ON' : 'OFF'}`, on ? '#fff4c2' : '#a99bd6', 11);
    Sfx.playAt('dream-chime', p.x, { rate: on ? 1.4 : 1.0, volume: 0.5 });
    if (this.api.isOnline) this.api.broadcast(`dream-lucid:${this.lucid.player}`);
  }

  /** The dream's walkable floor once Lucid Dream has shrunk it (or the whole box if not). */
  private lucidFloor(owner: Owner, realm: Realm): { x: number; y: number; w: number; h: number } {
    const b = realm.box;
    if (!(this.lucidMask(owner) & LUCID_SHRINK)) return b;
    const w = b.w * LUCID_SHRINK_K, h = b.h * LUCID_SHRINK_K;
    return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h };
  }

  /** Where Lucid Dream's spike patches sit, and how far out of the floor each one is (0–1). */
  private spikePatches(owner: Owner, realm: Realm): { x: number; y: number; up: number }[] {
    const fl = this.lucidFloor(owner, realm);
    const out: { x: number; y: number; up: number }[] = [];
    for (let i = 0; i < LUCID_SPIKE_PATCHES; i++) {
      const hx = DreamKit.hash(i * 3 + realm.world * 11), hy = DreamKit.hash(i * 7 + 5 + realm.world * 13);
      // The opponent's dream is laid out on their machine, which this one sees mirrored.
      const ux = this.remote(owner) ? 1 - hx : hx;
      const x = fl.x + 50 + ux * (fl.w - 100), y = fl.y + 50 + hy * (fl.h - 100);
      // Up for a little over half of every cycle, each patch on its own phase.
      const ph = ((this.now / LUCID_SPIKE_PERIOD_MS) + DreamKit.hash(i + 40)) % 1;
      const up = ph < 0.35 ? 0 : ph < 0.45 ? (ph - 0.35) / 0.1 : ph < 0.88 ? 1 : 1 - (ph - 0.88) / 0.12;
      out.push({ x, y, up });
    }
    return out;
  }

  private static hash(i: number): number {
    const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  /** May this sim move this body? Online each sim only moves its own fighter; husks are left alone online. */
  private mayMove(x: Fighter): boolean {
    if (!this.api.isOnline) return true;
    return x === this.api.player;
  }

  private clampInto(f: Fighter, r: { x: number; y: number; w: number; h: number }, pad: number): void {
    const x = Phaser.Math.Clamp(f.x, r.x + pad, r.x + r.w - pad);
    const y = Phaser.Math.Clamp(f.y, r.y + pad, r.y + r.h - pad);
    const hitX = x !== f.x, hitY = y !== f.y;
    if (!hitX && !hitY) return;
    f.setPosition(x, y);
    const b = this.body(f);
    if (b && hitX) b.setVelocityX(0);
    if (b && hitY) b.setVelocityY(0);
  }

  /** The five switches, every frame, for one side's dream. */
  private updateLucid(owner: Owner): void {
    const realm = this.realms[owner];
    const f = this.fighter(owner);
    if (!realm || !this.alive(f)) return;
    const mask = this.lucidMask(owner);
    const v = realm.victim;
    // Empowered: the dodge is rolled on the dreamer's own machine, so a replica never holds one.
    f.dreamLucidDodge = (mask & LUCID_BUFF) && !this.remote(owner) ? LUCID_BUFF_DODGE : 0;
    if (!mask || !this.alive(v)) return;
    const fl = this.lucidFloor(owner, realm);
    if (mask & LUCID_SHRINK) {
      if (this.mayMove(v)) this.clampInto(v, fl, 18);
      if (this.mayMove(f)) this.clampInto(f, fl, 18);
    }
    if (mask & LUCID_SPLIT) {
      const mid = realm.box.x + realm.box.w / 2;
      if (!realm.splitSide) realm.splitSide = v.x < mid ? -1 : 1;
      if (this.mayMove(v)) {
        const lo = realm.splitSide < 0 ? -1e9 : mid + LUCID_SPLIT_PAD;
        const hi = realm.splitSide < 0 ? mid - LUCID_SPLIT_PAD : 1e9;
        if (v.x < lo || v.x > hi) {
          v.setPosition(Phaser.Math.Clamp(v.x, lo, hi), v.y);
          this.body(v)?.setVelocityX(0);
        }
      }
    }
    if ((mask & LUCID_SPIKES) && this.now >= realm.spikeNextAt) {
      const on = this.spikePatches(owner, realm).some((p) => p.up > 0.6
        && Phaser.Math.Distance.Between(p.x, p.y, v.x, v.y) <= LUCID_SPIKE_R + HIT_R * 0.6);
      if (on) {
        realm.spikeNextAt = this.now + LUCID_SPIKE_GAP_MS;
        this.strike(v, LUCID_SPIKE_DAMAGE, owner, true);
        this.api.spawnHitFlash(v.x, v.y, DRM.violet);
      }
    }
    if ((mask & LUCID_MIST) && this.now >= realm.mistNextAt) {
      const inMist = v.x < fl.x + LUCID_MIST_BAND || v.x > fl.x + fl.w - LUCID_MIST_BAND
        || v.y < fl.y + LUCID_MIST_BAND || v.y > fl.y + fl.h - LUCID_MIST_BAND;
      if (inMist) {
        realm.mistNextAt = this.now + LUCID_MIST_GAP_MS;
        this.strike(v, LUCID_MIST_DAMAGE, owner, true);
      }
    }
  }

  /**
   * The bot's Lucid Dream: switches on what the sleep it has left can pay for, and off again as
   * the dream runs low — every switch is drowsiness spent faster.
   */
  private updateNpcLucid(): void {
    if (this.api.isOnline || !this.up('npc', 'e') || this.now < this.npcLucidAt) return;
    const realm = this.realms.npc;
    if (!realm) return;
    this.npcLucidAt = this.now + 700;
    const d = realm.victim.dreamDrowsy;
    const paralysed = realm.victim.dreamParalysisUntil > this.now;
    // While Sleep Paralysis holds the meter still the switches cost nothing — throw them all on.
    this.lucid.npc = paralysed || d >= 70 ? (LUCID_SPIKES | LUCID_BUFF | LUCID_MIST | LUCID_SHRINK)
      : d >= 45 ? (LUCID_SPIKES | LUCID_BUFF)
      : d >= 28 ? LUCID_BUFF : 0;
  }

  // ── F+: Sleeping Pills ─────────────────────────────────────────────────────

  private updatePills(dt: number): void {
    this.pills = this.pills.filter((p) => {
      if (this.now >= p.until || !this.alive(p.victim)) return false;
      this.addDrowsy(p.victim, PILL_DROWSY_PER_SEC * dt, p.owner);
      return true;
    });
  }

  // ── Mastery: the music box ─────────────────────────────────────────────────

  private boxReady(owner: Owner): boolean {
    return !!this.boxSlot(owner) && this.now - this.boxLastAt[owner] >= BOX_CD_MS;
  }

  private releaseBox(owner: Owner, tx: number, ty: number): void {
    const w = this.winds[owner];
    delete this.winds[owner];
    if (!w) return;
    const charge = Phaser.Math.Clamp((this.now - w.startAt) / BOX_MAX_CHARGE_MS, 0, 1);
    const dur = Math.round(Math.max(BOX_MIN_MS, charge * BOX_MAX_MS));
    this.boxLastAt[owner] = this.now;
    this.spawnBox(owner, tx, ty, dur);
    if (owner === 'player' && this.api.isOnline) {
      this.api.broadcast(`dream-box:${dur}:${Math.round(tx)}:${Math.round(ty)}`);
    }
  }

  private spawnBox(owner: Owner, tx: number, ty: number, dur: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const b = this.bounds();
    const x = Phaser.Math.Clamp(tx, b.x + 20, b.right - 20), y = Phaser.Math.Clamp(ty, b.y + 20, b.bottom - 20);
    const mine = this.boxes.filter((m) => m.owner === owner);
    if (mine.length >= BOX_MAX_LIVE) this.boxes.splice(this.boxes.indexOf(mine[0]), 1);
    this.boxes.push({ owner, sx: f.x, sy: f.y, x, y, t0: this.now, landed: false, until: 0, dur });
    this.avatar(owner)?.play('punch', Math.atan2(y - f.y, x - f.x));
    Sfx.playAt('whoosh', f.x, { rate: 0.9, volume: 0.6 });
  }

  private updateBoxes(dt: number): void {
    // A winding interrupted by sleep is dropped; one held to the end throws itself.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const w = this.winds[owner];
      if (!w) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.boxSlot(owner) || (f.dreamAsleep && !this.isDreaming(f))) { delete this.winds[owner]; continue; }
      if (this.now - w.startAt >= w.planMs) {
        const aim = owner === 'player' ? { x: this.lastAimX, y: this.lastAimY } : this.npcBoxAim();
        this.releaseBox(owner, aim.x, aim.y);
      }
    }
    this.boxes = this.boxes.filter((m) => {
      if (!m.landed) {
        if (this.now - m.t0 < BOX_FLIGHT_MS) return true;
        m.landed = true;
        m.until = this.now + m.dur;
        this.fx(m.owner).ring(m.x, m.y, 10, BOX_R, DRM.purple, 600, 4, 6);
        this.fx(m.owner).stardust(m.x, m.y, 8, 30, 700, 7);
        Sfx.playAt('dream-chime', m.x, { rate: 1.25, volume: 0.7 });
      }
      if (this.now >= m.until) {
        this.fx(m.owner).stardust(m.x, m.y, 6, 26, 600, 7);
        return false;
      }
      for (const t of this.targetsOf(m.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, m.x, m.y) <= BOX_R) this.addDrowsy(t, BOX_DROWSY_PER_SEC * dt, m.owner);
      }
      return true;
    });
  }

  private npcBoxAim(): { x: number; y: number } {
    const t = this.targetsOf('npc')[0];
    const npc = this.api.npc;
    return t ? { x: t.x, y: t.y } : { x: npc.x + 1, y: npc.y };
  }

  /**
   * The bot's music box, fired here because it runs off the kit's own clock. Its synergy: a
   * lullaby over a sleeper outpaces the sleep's burn, so it holds them under for as long as the
   * box plays — and over a drowsy foe it is a slow, steady push the rest of the kit tips over.
   */
  private updateNpcBox(): void {
    if (this.api.isOnline || this.winds.npc || !this.boxReady('npc')) return;
    const npc = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!this.alive(npc) || !t || (npc.dreamAsleep && !this.isDreaming(npc))) return;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y);
    const sleeper = t.dreamAsleep && !this.isDreaming(t) && d < 420;
    const drowsy = !t.dreamAsleep && t.dreamDrowsy >= 35 && d < 360;
    if (!sleeper && !drowsy) return;
    // A sleeper is worth the long wind; a drowsy foe gets a quicker one before they walk out.
    const plan = sleeper ? 3500 + Math.random() * 1500 : 1500 + Math.random() * 1500;
    this.winds.npc = { startAt: this.now, planMs: plan };
  }

  // ── Mastery: the Dreamcatcher ──────────────────────────────────────────────

  /** Where on a dreamer the dreamcatcher hangs — slung behind, away from the aim. */
  private catcherAt(owner: Owner): { x: number; y: number } {
    const f = this.fighter(owner);
    const aim = this.aimFor(owner);
    const back = Math.atan2(aim.y - f.y, aim.x - f.x) + Math.PI;
    return { x: f.x + Math.cos(back) * 15, y: f.y - 8 + Math.sin(back) * 9 };
  }

  private updateCatcher(owner: Owner, dt: number): void {
    const c = this.catchers[owner];
    const f = this.fighter(owner);
    const realm = this.realms[owner];
    // Only the dreamer's own sim draws dreams out — the buff is theirs, and a replica's heal
    // would only fight the health stream.
    if (realm && this.masteryOn(owner) && !this.remote(owner) && this.alive(f) && this.alive(realm.victim)
      && this.now >= c.nextRollAt) {
      c.nextRollAt = this.now + ORB_ROLL_MS;
      if (Math.random() < ORB_CHANCE) {
        const v = realm.victim;
        const bad = v.dreamNightmareUntil > this.now;
        const a = Math.random() * TAU_K;
        this.orbs.push({ owner, x: v.x, y: v.y - 10, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 80, bad });
        this.fx(owner).stardust(v.x, v.y - 10, 3, 14, 420, 8);
      }
    }
    // Orbs home in on the hoop.
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (o.owner !== owner) continue;
      if (!this.alive(f)) { this.orbs.splice(i, 1); continue; }
      const at = this.catcherAt(owner);
      const dx = at.x - o.x, dy = at.y - o.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 12) {
        this.orbs.splice(i, 1);
        c.digest.push({ bad: o.bad, readyAt: this.now + ORB_DIGEST_MS });
        Sfx.playAt('dream-chime', f.x, { rate: o.bad ? 0.7 : 1.6, volume: 0.35 });
        continue;
      }
      const acc = 900;
      o.vx += (dx / d) * acc * dt;
      o.vy += (dy / d) * acc * dt;
      const sp = Math.hypot(o.vx, o.vy);
      const max = 420;
      if (sp > max) { o.vx *= max / sp; o.vy *= max / sp; }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
    }
    // Digested dreams pay out.
    for (let i = c.digest.length - 1; i >= 0; i--) {
      const dg = c.digest[i];
      if (this.now < dg.readyAt) continue;
      c.digest.splice(i, 1);
      if (!this.alive(f)) continue;
      if (dg.bad) {
        c.might = c.might.filter((u) => u > this.now);
        if (c.might.length >= MIGHT_MAX) c.might.shift();
        c.might.push(this.now + MIGHT_MS);
        this.announce(f.x, f.y - 50, `🔴 NIGHTMARE FUEL ×${c.might.length}`, '#ff6b7f', 11);
        this.fx(owner).ring(f.x, f.y, 10, 46, DREAM_ORB.bad, 420, 4, 8);
      } else {
        f.heal(ORB_HEAL);
        this.announce(f.x, f.y - 50, `🟢 SWEET DREAM +${ORB_HEAL}`, '#7af2a6', 11);
        this.fx(owner).ring(f.x, f.y, 10, 46, DREAM_ORB.good, 420, 4, 8);
      }
    }
  }

  // ── Bot: the shop upgrades it has to fire itself ───────────────────────────

  /**
   * Amnesia for the bot. Out here it throws a magazine that still has plenty in it at a foe who
   * is awake (rounds would wake a sleeper); in a dream, only with both pistols loaded, for the
   * bigger star.
   */
  private updateNpcAmnesia(): void {
    if (this.api.isOnline || this.now < this.npcAmnesiaAt || !this.canAmnesia('npc')) return;
    this.npcAmnesiaAt = this.now + 1200;
    const npc = this.api.npc;
    const realm = this.realms.npc;
    const t = realm?.victim ?? this.targetsOf('npc')[0];
    if (!this.alive(npc) || !this.alive(t)) return;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y);
    const g = this.guns.npc;
    const go = realm ? g.pistolMag >= PISTOL_MAG && d < 380
      : !t.dreamAsleep && g.mag >= 12 && d < 320;
    if (!go || Math.random() < 0.4) return;
    this.npcAmnesiaAt = this.now + 4000 + Math.random() * 2500;
    this.throwAmnesia('npc', t.x, t.y);
  }

  // ── Drowsiness ─────────────────────────────────────────────────────────────

  private addDrowsy(t: Fighter, amount: number, by: Owner): void {
    // A body that is off dreaming cannot be made any sleepier — it is not here.
    if (this.isDreaming(t)) return;
    const r = this.rec(t);
    t.dreamDrowsy = Math.min(DROWSY_MAX, t.dreamDrowsy + meterGain(this.fighter(by), amount));
    r.lastGainAt = this.now;
    if (!t.dreamAsleep && t.dreamDrowsy >= DROWSY_MAX) this.fallAsleep(t, by);
    else if (t.dreamAsleep) r.by = by;
  }

  private fallAsleep(t: Fighter, by: Owner): void {
    if (t.unstoppable) {
      // Nothing that ignores stuns is going to lie down for a pillow either.
      t.dreamDrowsy = DROWSY_MAX * 0.99;
      this.announce(t.x, t.y - 46, '☕ WIDE AWAKE', '#ffd98a');
      return;
    }
    const r = this.rec(t);
    t.dreamAsleep = true;
    t.dreamDrowsy = Math.max(t.dreamDrowsy, 1);
    r.by = by;
    r.lastRaw = t.rawDamageTaken;
    this.body(t)?.setVelocity(0, 0);
    this.fx(by).zzzPuff(t.x, t.y);
    this.fx(by).ring(t.x, t.y, 10, 70, DRM.purple, 620, 5, 7);
    this.announce(t.x, t.y - 50, '😴 ASLEEP', '#a78bfa', 13);
    if (by === 'player' && t !== this.api.player) this.api.recordMasteryStat('sleeps', 1);
    Sfx.playAt('dream-chime', t.x, { rate: 0.85, volume: 0.8 });
  }

  private wake(t: Fighter, why: 'damage' | 'natural'): void {
    const r = this.rec(t);
    t.dreamAsleep = false;
    t.dreamDrowsy = 0;
    r.wokeAt = this.now;
    // Only lift the stun if it is the one sleep was renewing.
    if (t.earthStunnedUntil <= this.now + 200) t.earthStunnedUntil = this.now;
    for (const owner of ['player', 'npc'] as Owner[]) {
      if (this.realms[owner]?.victim === t) this.exitRealm(owner, 'woke');
    }
    this.fx(r.by).stardust(t.x, t.y, 7, 26, 640, 7);
    this.announce(t.x, t.y - 44, why === 'damage' ? '⏰ AWAKE!' : '🥱 Woke up', '#d8e2ff', 11);
  }

  /** Compare a body's damage tally with the last one seen. Any hit to a sleeper out here wakes it. */
  private syncDamage(t: Fighter): void {
    const r = this.rec(t);
    const d = t.rawDamageTaken - r.lastRaw;
    r.lastRaw = t.rawDamageTaken;
    if (d <= 0.5 || !t.dreamAsleep) return;
    // In a dream they are awake already, and nothing that happens in there reaches the body.
    if (this.isDreaming(t)) return;
    this.wake(t, 'damage');
  }

  private updateSleepers(delta: number): void {
    const dt = delta / 1000;
    const now = this.now;
    for (const f of this.tracked()) {
      const r = this.rec(f);

      // Online: fold in what the dreamer's sim says about our own body.
      if (this.api.isOnline && f === this.api.player && this.api.npcElementId === 'dream'
        && now - r.wokeAt > NET_WAKE_GRACE_MS) {
        if (f.dreamNetDrowsy > f.dreamDrowsy && !this.isDreaming(f)) f.dreamDrowsy = Math.min(DROWSY_MAX, f.dreamNetDrowsy);
        if (f.dreamNetAsleep && !f.dreamAsleep) this.fallAsleep(f, 'npc');
      }

      // Woken by damage? Checked before the nightmare ticks so a real hit is never swallowed.
      this.syncDamage(f);

      // ── Nightmare ──
      if (f.dreamNightmareUntil > now) {
        r.nightmareAccum += delta;
        while (r.nightmareAccum >= NIGHTMARE_TICK_MS) {
          r.nightmareAccum -= NIGHTMARE_TICK_MS;
          this.strike(f, NIGHTMARE_TICK_DAMAGE, r.nightmareBy, true);
          // A nightmare is not an alarm clock: its own damage must not wake its host.
          r.lastRaw = f.rawDamageTaken;
        }
        f.dreamIncomingMult = NIGHTMARE_VULN;
        r.vulnHeld = true;
        // Panic, for anything that aims with a hand that can shake.
        if (f !== this.api.player) {
          f.aimOffsetBonusDeg = Math.max(now < f.aimOffsetBonusUntil ? f.aimOffsetBonusDeg : 0, NIGHTMARE_PANIC_DEG);
          f.aimOffsetBonusUntil = Math.max(f.aimOffsetBonusUntil, now + 150);
        }
      } else if (r.vulnHeld) {
        r.vulnHeld = false;
        f.dreamIncomingMult = 1;
        r.nightmareAccum = 0;
      }

      // Q+: paralysed, the meter cannot go down at all — not by sleeping, not by wearing off.
      const paralysed = f.dreamParalysisUntil > now;
      // ── Sleep ──
      if (f.dreamAsleep) {
        if (!paralysed) f.dreamDrowsy -= SLEEP_BURN_PER_SEC * this.burnMult(f) * dt;
        if (f.dreamDrowsy <= 0) { this.wake(f, 'natural'); continue; }
        if (this.isDreaming(f)) continue;
        this.body(f)?.setVelocity(0, 0);
        f.earthStunnedUntil = Math.max(f.earthStunnedUntil, now + 140);
        f.applyDisarm(160);
        continue;
      }
      if (!paralysed && f.dreamDrowsy > 0 && now - r.lastGainAt > DROWSY_IDLE_MS) {
        f.dreamDrowsy = Math.max(0, f.dreamDrowsy - DROWSY_DECAY_PER_SEC * dt);
      }
    }
  }

  // ── Per frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isDream('player');
    const npcIs = this.isDream('npc');
    this.vizT += delta / 1000;
    const dt = Math.min(0.05, delta / 1000);
    this.ensureLayers();

    // Dreams end when either of the two in them does.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const realm = this.realms[owner];
      if (!realm) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.alive(realm.victim) || !this.isDream(owner)) this.exitRealm(owner, 'ended');
      else if (f.dreamAsleep) this.exitRealm(owner, 'ended');
      else f.dreamCooldownMult = DREAM_COOLDOWN_MULT;
    }

    if (playerIs) this.updateRecoil('player', dt);
    if (npcIs) this.updateRecoil('npc', dt);
    if (npcIs) {
      this.updateNpcAmnesia();
      this.updateNpcLucid();
      this.updateNpcBox();
    }
    this.updateLucid('player');
    this.updateLucid('npc');
    this.updateDaggers(dt);
    this.updateClips(dt);
    this.updateLeeches(dt, delta);
    this.updatePills(dt);
    this.updateBeasts();
    this.updateBoxes(dt);
    this.updateCatcher('player', dt);
    this.updateCatcher('npc', dt);
    this.updateSleepers(delta);
    for (const f of this.tracked()) f.dreamSlowMult = this.slowOf(f);
    this.updateCards(playerIs);

    // Q+ Sleep Paralysis: the dream on this screen turns into its nightmare while it holds.
    if (this.view) {
      const local = this.api.player;
      const realm = (['player', 'npc'] as Owner[]).map((o) => this.realms[o])
        .find((r) => !!r && (this.fighter(r.owner) === local || r.victim === local));
      this.view.setNightmare(!!realm && realm.victim.dreamParalysisUntil > this.now);
      this.view.setOminous(!!realm && (realm.victim.dreamNightmareUntil > this.now
        || this.beasts.some((b) => b.owner === realm.owner)));
    }
    this.view?.update(delta);
    this.fading = this.fading.filter((v) => {
      if (v.update(delta)) return true;
      v.destroy();
      return false;
    });

    this.updateAvatars(delta, playerIs, npcIs);
    this.paintFloor();
    this.paintAir();
    this.paintOverhead();
    this.paintPanel(playerIs);
    this.paintDarkness();
    this.paintCursor(playerIs);
    this.paintHud(playerIs);
    this.pushStatuses(playerIs);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(7.5);
    if (!this.overheadGfx) this.overheadGfx = scene.add.graphics().setDepth(16);
    if (!this.darkGfx) this.darkGfx = scene.add.graphics().setDepth(13.6).setScrollFactor(0);
    if (!this.cursorGfx) this.cursorGfx = scene.add.graphics().setDepth(30);
    if (!this.floorGfx) this.floorGfx = scene.add.graphics().setDepth(0.7);
    if (!this.topGfx) this.topGfx = scene.add.graphics().setDepth(13.2);
  }

  /** Rename the tray for the dream, and back again, only on the frames it changes. */
  private updateCards(playerIs: boolean): void {
    const dreaming = playerIs && !!this.realms.player;
    if (dreaming === this.cardsDreaming) return;
    this.cardsDreaming = dreaming;
    const el = this.api.player.element;
    for (const ab of el.abilities) {
      const alt = DREAM_CARDS[ab.id];
      if (!alt) continue;
      if (dreaming) this.api.relabelCard(ab.id, alt.name, alt.desc);
      else this.api.relabelCard(ab.id, ab.name, ab.description);
    }
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { player, npc } = this.api;
    const drive = (owner: Owner, f: Fighter, on: boolean): void => {
      let av = this.avatar(owner);
      if (!on || !f?.active) {
        av?.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        return;
      }
      if (!av) {
        av = this.makeAvatar(owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const aim = this.aimFor(owner);
      const ang = Math.atan2(aim.y - f.y, aim.x - f.x);
      av.setFacing(ang);
      const realm = this.realms[owner];
      av.setGuns(realm ? 'pistols' : 'sandmen');
      av.setDreaming(!!realm);
      av.setSwing(realm ? 1 : 0);
      av.setIntensity(realm ? 1.2 : 1);
      av.setDrowsy(f.dreamAsleep ? 1 : Phaser.Math.Clamp(f.dreamDrowsy / DROWSY_MAX, 0, 1));
      const firing = this.now - this.guns[owner].lastShotAt < 200;
      av.setHold(firing ? 'spray' : null, ang);
      av.setMastered(this.masteryOn(owner));
      const c = this.catchers[owner];
      av.setCatcher(c.digest.slice(-6).map((d) => ({ bad: d.bad, k: 1 - Phaser.Math.Clamp((d.readyAt - this.now) / ORB_DIGEST_MS, 0, 1) })));
      const w = this.winds[owner];
      av.setWinding(w ? Phaser.Math.Clamp((this.now - w.startAt) / BOX_MAX_CHARGE_MS, 0, 1) : -1);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    };
    drive('player', player, playerIs);
    drive('npc', npc, npcIs);
  }

  // ── Painters ───────────────────────────────────────────────────────────────

  /**
   * The floor layer: the music boxes' lullabies, and Lucid Dream's reshaping of whichever dream
   * is on this screen — the dark that has eaten its edges, the seam, the spikes and the mist.
   */
  private paintFloor(): void {
    const g = this.floorGfx;
    const top = this.topGfx;
    if (!g || !top) return;
    g.clear();
    top.clear();
    const t = this.vizT;
    for (const m of this.boxes) {
      if (!m.landed) continue;
      const left = Phaser.Math.Clamp((m.until - this.now) / m.dur, 0, 1);
      lullabyZone(g, this.col(m.owner), m.x, m.y, BOX_R, t, left, Math.min(1, (m.until - this.now) / 400));
    }
    const local = this.api.player;
    for (const owner of ['player', 'npc'] as Owner[]) {
      const realm = this.realms[owner];
      if (!realm || (this.fighter(owner) !== local && realm.victim !== local)) continue;
      const mask = this.lucidMask(owner);
      if (!mask) continue;
      const tint = this.col(owner);
      const b = realm.box;
      const fl = this.lucidFloor(owner, realm);
      if (mask & LUCID_SHRINK) dreamShrink(g, tint, b.x, b.y, b.w, b.h, fl.x, fl.y, fl.w, fl.h, t);
      if (mask & LUCID_SPIKES) {
        for (const sp of this.spikePatches(owner, realm)) dreamSpikes(g, tint, sp.x, sp.y, LUCID_SPIKE_R, sp.up, t);
      }
      if (mask & LUCID_SPLIT) {
        const mid = b.x + b.w / 2;
        const side = realm.splitSide || (realm.victim.x < mid ? -1 : 1);
        // The wall is on the foe's side of the seam: it faces them.
        dreamSplit(g, tint, mid, fl.y, fl.y + fl.h, side < 0 ? 1 : -1, t);
      }
      if (mask & LUCID_MIST) redMistBand(top, tint, fl.x, fl.y, fl.w, fl.h, LUCID_MIST_BAND, t);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    // Amnesia: clips tumbling to the cursor, then the rounds they scatter.
    for (const c of this.clips) {
      const u = Phaser.Math.Clamp((this.now - c.t0) / c.dur, 0, 1);
      const x = c.sx + (c.tx - c.sx) * u, y = c.sy + (c.ty - c.sy) * u - Math.sin(u * Math.PI) * 26;
      const fill = c.dream ? c.rounds / PISTOL_MAG : c.rounds / SANDMEN_MAG;
      ammoClip(g, this.col(c.owner), x, y, u * c.spin, fill, 1, c.dream);
    }
    for (const p of this.pellets) {
      const a = Math.atan2(p.vy, p.vx);
      g.lineStyle(2, this.col(p.owner)(DRM.sandDeep), 0.5);
      g.lineBetween(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12, p.x, p.y);
      g.fillStyle(this.col(p.owner)(DRM.sand), 1);
      g.fillCircle(p.x, p.y, 2);
    }
    // R+: what is stuck in everybody.
    for (const [f, m] of this.marks) {
      if (!this.alive(f) || f.forceInvisible) continue;
      for (const fe of m.feathers) {
        if (fe.until <= this.now) continue;
        const fade = Math.min(1, (fe.until - this.now) / 600);
        stuckFeather(g, this.col('player'), f.x + fe.ox, f.y + fe.oy, fe.ang, t, fade);
      }
      const sc = this.live(m.scratches);
      if (sc > 0) scratchMarks(g, this.col('player'), f.x, f.y, sc, t, 0.9);
    }
    // F+: daggers left in, and the drowsiness seeping out of them.
    for (const p of this.pills) {
      const v = p.victim;
      if (!this.alive(v)) continue;
      const fade = Math.min(1, (p.until - this.now) / 400);
      sleepDagger(g, this.col(p.owner), v.x + p.ox, v.y + p.oy, p.ang, fade, 18);
      const ph = (t * 0.8 + p.ang) % 1;
      g.fillStyle(this.col(p.owner)(DRM.sky), 0.55 * (1 - ph) * fade);
      g.fillCircle(v.x + p.ox - Math.cos(p.ang) * 6, v.y + p.oy - 4 - ph * 16, 2 + ph * 2);
    }
    // Mastery: music boxes, in the air and playing; dreams flying to the hoop.
    for (const m of this.boxes) {
      const tint = this.col(m.owner);
      if (!m.landed) {
        const u = Phaser.Math.Clamp((this.now - m.t0) / BOX_FLIGHT_MS, 0, 1);
        const x = m.sx + (m.x - m.sx) * u, y = m.sy + (m.y - m.sy) * u - Math.sin(u * Math.PI) * 60;
        musicBox(g, tint, x, y, t, 0.1, u * 12, 1, 0.9 + Math.sin(u * Math.PI) * 0.25);
      } else {
        const fade = Math.min(1, (m.until - this.now) / 400);
        musicBox(g, tint, m.x, m.y, t, 1, t * 3, fade, 1);
      }
    }
    for (const o of this.orbs) dreamOrb(g, this.col(o.owner), o.x, o.y, o.bad, t, 1, 5);
    for (const d of this.daggers) {
      const a = Math.atan2(d.vy, d.vx);
      g.lineStyle(2, this.col(d.owner)(DRM.pale), 0.35);
      g.lineBetween(d.x - Math.cos(a) * 26, d.y - Math.sin(a) * 26, d.x, d.y);
      sleepDagger(g, this.col(d.owner), d.x, d.y, a, 1);
    }
    for (const l of this.leeches) {
      const a = l.state === 'flying' ? Math.atan2(l.vy, l.vx) : l.ang;
      const fat = l.state === 'stuck' ? Math.min(1, l.dealt / 60) : 0;
      const fade = l.state === 'ground' ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
      dreamLeech(g, this.col(l.owner), l.x, l.y, a, t, fade, l.state === 'stuck', fat);
      // The cue to come and get it: a soft ring when it is worth pulling.
      if (l.state !== 'flying' && l.owner === 'player') {
        g.lineStyle(l.dropped ? 2.2 : 1.5, this.pcol(DRM.leechBelly), 0.35 + 0.2 * Math.sin(t * 5));
        g.strokeCircle(l.x, l.y, (l.dropped ? LEECH_DROP_PICKUP_R : LEECH_PICKUP_R) * 0.6);
      }
    }
    for (const b of this.beasts) {
      const step = Phaser.Math.Clamp((this.now - b.stepAt) / BEAST_STEP_MS, 0, 1);
      const left = (b.until - this.now) / BEAST_LIFE_MS;
      if (this.backrooms(b.owner)) smiler(g, b.x, b.y, b.facing, t, Math.min(1, left * 4), step);
      else nightmareBeast(g, this.col(b.owner), b.x, b.y, b.facing, t, Math.min(1, left * 4), step);
    }
  }

  private paintOverhead(): void {
    const g = this.overheadGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const f of this.tracked()) {
      if (f.dreamDrowsy <= 0.5 && !f.dreamAsleep) continue;
      if (f.forceInvisible) continue;
      const r = this.rec(f);
      const tint = this.col(r.by);
      const ratio = Phaser.Math.Clamp(f.dreamDrowsy / DROWSY_MAX, 0, 1);
      sleepMeter(g, tint, f.x, f.y - 60, ratio, t, f.dreamAsleep, 1);
      if (f.dreamAsleep && !this.isDreaming(f)) {
        for (let i = 0; i < 3; i++) {
          const p = (t * 0.45 + i / 3) % 1;
          sleepyZ(g, tint, f.x + 17 + Math.sin(p * 3.2 + i) * 7, f.y - 32 - p * 28, 5 + p * 3, (1 - p) * 0.9, -0.2);
        }
      }
      if (this.isDreaming(f)) {
        // A thought bubble: they are somewhere else, and this is how long they have left there.
        g.fillStyle(tint(DRM.pale), 0.8);
        g.fillCircle(f.x + 24, f.y - 34, 3);
        g.fillCircle(f.x + 30, f.y - 42, 4.5);
        star(g, tint, f.x + 38, f.y - 50, 6, 0.9, DRM.star, t);
      }
    }
  }

  /** The darkness over the local player while a nightmare has them. Screen space. */
  private paintDarkness(): void {
    const g = this.darkGfx;
    if (!g) return;
    g.clear();
    const p = this.api.player;
    if (!this.alive(p) || p.dreamNightmareUntil <= this.now) return;
    const cam = this.api.scene.cameras.main;
    const left = p.dreamNightmareUntil - this.now;
    const fadeIn = Phaser.Math.Clamp((NIGHTMARE_MS - left) / 200, 0, 1);
    const fadeOut = Phaser.Math.Clamp(left / 300, 0, 1);
    const by = this.rec(p).nightmareBy;
    nightmareDarkness(g, this.col(by), p.x - cam.scrollX, p.y - cam.scrollY, NIGHTMARE_SIGHT,
      Math.max(this.api.width, this.api.height), this.vizT, Math.min(fadeIn, fadeOut));
  }

  /**
   * The crosshair. The system pointer is hidden for a Dream player, because the whole point of
   * the recoil is that the crosshair is *not* where the mouse is.
   */
  private paintCursor(playerIs: boolean): void {
    const g = this.cursorGfx;
    if (!g) return;
    g.clear();
    if (!playerIs || !this.alive(this.api.player)) {
      this.releaseCursor();
      return;
    }
    if (!this.cursorHidden) {
      this.cursorHidden = true;
      this.api.scene.input.setDefaultCursor('none');
    }
    const { x, y } = this.aimFor('player');
    const gun = this.guns.player;
    const dreaming = !!this.realms.player;
    const c = (k: number) => this.pcol(k);
    const r = dreaming ? 13 : 10;
    const main = dreaming ? DRM.pistol : DRM.sand;
    g.lineStyle(3, c(DRM.night), 0.8);
    g.strokeCircle(x, y, r);
    g.lineStyle(1.6, c(main), 1);
    g.strokeCircle(x, y, r);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.lineBetween(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3), x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8));
    }
    g.fillStyle(c(DRM.white), 1);
    g.fillCircle(x, y, 1.6);
    // Where the mouse really is, faintly — the thing you are dragging against the kick.
    if (Math.hypot(gun.recoilX, gun.recoilY) > 6) {
      g.lineStyle(1, c(DRM.pale), 0.25);
      g.strokeCircle(this.lastAimX, this.lastAimY, 4);
    }
    // Ammo: pips around the ring, or a reload sweep.
    const reloading = dreaming ? this.now < gun.pistolReloadUntil : this.now < gun.reloadUntil;
    if (reloading) {
      const until = dreaming ? gun.pistolReloadUntil : gun.reloadUntil;
      const total = dreaming ? PISTOL_RELOAD_MS * this.api.player.dreamCooldownMult : SANDMEN_RELOAD_MS;
      const k = 1 - Phaser.Math.Clamp((until - this.now) / total, 0, 1);
      g.lineStyle(3, c(DRM.sandDeep), 0.9);
      g.beginPath();
      g.arc(x, y, r + 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false);
      g.strokePath();
    } else {
      const n = dreaming ? gun.pistolMag : gun.mag;
      const max = dreaming ? PISTOL_MAG : SANDMEN_MAG;
      const R = r + 12;
      for (let i = 0; i < max; i++) {
        const a = -Math.PI / 2 + (i / max) * Math.PI * 2;
        g.fillStyle(c(i < n ? (dreaming ? DRM.star : DRM.sand) : DRM.deep), i < n ? 1 : 0.5);
        g.fillCircle(x + Math.cos(a) * R, y + Math.sin(a) * R, dreaming ? 3 : 1.4);
      }
    }
  }

  private paintHud(playerIs: boolean): void {
    const realm = this.realms.player;
    if (!playerIs || !realm) {
      this.hudLabel?.setVisible(false);
      return;
    }
    if (!this.hudLabel) {
      this.hudLabel = this.api.scene.add.text(this.api.width / 2, 48, '', {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: '#e9ddff', stroke: '#0b0620', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
    }
    const left = Math.max(0, realm.victim.dreamDrowsy / (SLEEP_BURN_PER_SEC * this.burnMult(realm.victim)));
    const held = realm.victim.dreamParalysisUntil > this.now;
    this.hudLabel.setVisible(true);
    this.hudLabel.setText(`💭 ${DREAM_WORLDS[realm.world].name.toUpperCase()} — ${left.toFixed(1)}s OF DREAM LEFT${held ? ' (HELD)' : ''}   ·   E TO SURFACE`);
    this.hudLabel.setColor(held ? '#ff6b7f' : left < 4 ? '#ff9cc8' : '#e9ddff');
  }

  /** E+: the Lucid Dream panel, for the local dreamer only. */
  private paintPanel(playerIs: boolean): void {
    const show = playerIs && !!this.realms.player && this.up('player', 'e');
    if (!show) {
      this.panel?.setVisible(false);
      return;
    }
    if (!this.panel) this.panel = new LucidPanel(this.api.scene, this.pcol, this.api.width, LUCID_BUTTONS);
    this.panel.setVisible(true);
    this.panel.paint(this.lucid.player, this.panelHover, this.burnMult(this.realms.player!.victim), this.vizT);
  }

  /** The dreamer's own buff, for the top-right tray. The victim's effects are Fighter descriptors. */
  private pushStatuses(playerIs: boolean): void {
    const realm = this.realms.player;
    this.api.setStatusIndicator('dream-dreamwalking', playerIs && realm ? {
      name: 'Dreamwalking', emoji: '💭', color: DRM.purple,
      description: `Inside their dream: ${Math.round((DREAM_SPEED_MULT - 1) * 100)}% faster, cooldowns ${Math.round((1 - DREAM_COOLDOWN_MULT) * 100)}% shorter, and every key but E is its dream version. Nothing you do in here wakes their body. It ends when their drowsiness runs out — or when you press E.`,
      count: Math.ceil(Math.max(0, realm.victim.dreamDrowsy / SLEEP_BURN_PER_SEC)), suffix: 's', priority: 112,
    } : null);
    const gun = this.guns.player;
    this.api.setStatusIndicator('dream-reload', playerIs && !realm && this.now < gun.reloadUntil ? {
      name: 'Reloading', emoji: '⌛', color: DRM.sandDeep,
      description: `Both Sandmen are being refilled — ${SANDMEN_MAG} rounds, ${SANDMEN_RELOAD_MS / 1000} seconds.`,
      until: gun.reloadUntil, priority: 111,
    } : null);

    // Mastery.
    const c = this.catchers.player;
    const mightN = this.live(c.might);
    this.api.setStatusIndicator('dream-catcher', playerIs && c.digest.length > 0 ? {
      name: 'Dreamcatcher', emoji: '🕸️', color: DRM.hoop,
      description: `Dreams caught and digesting: ${c.digest.filter((d) => !d.bad).length} good, ${c.digest.filter((d) => d.bad).length} nightmares. Each pays out ${ORB_DIGEST_MS / 1000}s after it was caught — a good dream heals ${ORB_HEAL}, a nightmare is +${Math.round(MIGHT_PER * 100)}% damage for ${MIGHT_MS / 1000}s.`,
      count: c.digest.length, priority: 110,
    } : null);
    this.api.setStatusIndicator('dream-might', playerIs && mightN > 0 ? {
      name: 'Nightmare Fuel', emoji: '🔴', color: DREAM_ORB.bad,
      description: `Digested nightmares: +${Math.round(MIGHT_PER * 100)}% damage each, up to ${MIGHT_MAX}. Each lasts ${MIGHT_MS / 1000}s.`,
      count: mightN, until: Math.max(...c.might), priority: 109,
    } : null);
    const boxed = playerIs && !!this.boxSlot('player') && !this.winds.player && !this.boxReady('player');
    this.api.setStatusIndicator('dream-box', boxed ? {
      name: 'Music-box', emoji: '🎶', color: DRM.purple,
      description: 'Winding up again. Hold the bound key to wind it — the longer, the longer it plays — and let go to throw it.',
      until: this.boxLastAt.player + BOX_CD_MS, priority: 108,
    } : null);

    // R+ on the local player, from another Dream.
    const me = this.api.player;
    const mm = this.marks.get(me);
    const fe = mm ? this.live(mm.feathers) : 0;
    const sc = mm ? this.live(mm.scratches) : 0;
    this.api.setStatusIndicator('dream-feathers', fe > 0 ? {
      name: 'Feathered', emoji: '🪶', color: DRM.pillow,
      description: `Pillow feathers stuck in you. Every attack a Dream lands on you adds ${FEATHER_DROWSY} drowsiness per feather.`,
      count: fe, priority: 30,
    } : null);
    this.api.setStatusIndicator('dream-scratches', sc > 0 ? {
      name: 'Scratched', emoji: '🩸', color: DRM.claw,
      description: `Claw scratches from inside the dream: every attack in here deals ${SCRATCH_BONUS} more per scratch.`,
      count: sc, priority: 30,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /**
   * The dream's haste and the claw's slow, pulled by ArenaScene rather than pushed — this kit's
   * update runs after the frame's movement has already resolved.
   */
  private speedMultFor(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f) return 1;
    let mult = 1;
    if (this.realms[owner]) mult *= DREAM_SPEED_MULT;
    if (this.lucidMask(owner) & LUCID_BUFF) mult *= LUCID_BUFF_SPEED;
    // Online the slow on our own body already arrives as the opponent's speed relay.
    const relayed = owner === 'player' && this.api.isOnline;
    if (!relayed) mult *= this.slowOf(f);
    return mult;
  }

  /** The claw's slow and Sleep Paralysis', on any body. */
  private slowOf(f: Fighter): number {
    let mult = 1;
    if (f.dreamClawedUntil > this.now) mult *= CLAW_SLOW_MULT;
    if (f.dreamParalysisUntil > this.now) mult *= PARALYSIS_SLOW;
    return mult;
  }

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /** Asleep out here and not dreaming — the npc's AI stands down. */
  locksNpcAi(): boolean {
    const npc = this.api.npc;
    return !!npc && npc.dreamAsleep && !this.isDreaming(npc);
  }

  isAsleep(f: Fighter): boolean { return !!f && f.dreamAsleep && !this.isDreaming(f); }

  /** True while the local player is asleep in the waking world. */
  isPlayerLocked(): boolean { return this.isAsleep(this.api.player); }

  /**
   * Everything the Dream bot needs to play its kit's synergies, computed owner-side. Reads only —
   * nothing here changes state, so ArenaScene can build it every frame.
   */
  npcAiInfo(): DreamNpcInfo | undefined {
    if (!this.isDream('npc')) return undefined;
    const realm = this.realms.npc;
    const t = realm?.victim ?? this.targetsOf('npc')[0];
    const drowsy = t?.dreamDrowsy ?? 0;
    return {
      inDream: !!realm,
      targetDrowsy: drowsy,
      targetAsleep: !!t?.dreamAsleep,
      canFire: this.canFire('npc'),
      delveReady: !!this.delveCandidate('npc'),
      shouldSurface: !!realm && drowsy < 22,
      nightmareReady: !!this.nightmareTarget('npc'),
      pillowFresh: !realm && drowsy <= PILLOW_FRESH_AT,
      leechOut: this.leeches.some((l) => l.owner === 'npc'),
      featherShots: !realm && !!t && !t.dreamAsleep && this.up('npc', 'r') && this.live(this.marks.get(t)?.feathers ?? []) > 0,
      clawFirst: !!realm && this.up('npc', 'r') && this.live(this.marks.get(realm.victim)?.scratches ?? []) < 2,
      boxSlot: this.boxSlot('npc') ?? undefined,
    };
  }

  /**
   * Where the bot should be walking for one of its own plays: up to a sleeper to step into its
   * dream, or over to a leech to pull it. Undefined when the fight should steer.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    if (!this.isDream('npc')) return undefined;
    const npc = this.api.npc;
    if (!this.alive(npc)) return undefined;
    const realm = this.realms.npc;
    if (realm) {
      const l = this.leeches.find((x) => x.owner === 'npc' && x.state !== 'flying');
      return l ? { x: l.x, y: l.y } : undefined;
    }
    const t = this.targetsOf('npc')[0];
    // Only once there is enough sleep left to make the trip worth it.
    if (t?.dreamAsleep && t.dreamDrowsy >= 45
      && Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y) > DELVE_RANGE * 0.7) {
      return { x: t.x, y: t.y };
    }
    return undefined;
  }

  /**
   * Ability tray fill. Click reads the magazine (or the reload), so it is never a cooldown
   * nobody is waiting on.
   */
  getBarRatio(abilityId: string, time: number): number {
    void time;
    if (abilityId === BOX_ID) {
      const w = this.winds.player;
      if (w) return Phaser.Math.Clamp((this.now - w.startAt) / BOX_MAX_CHARGE_MS, 0, 1);
      return Phaser.Math.Clamp((this.now - this.boxLastAt.player) / BOX_CD_MS, 0, 1);
    }
    if (abilityId === 'dream-sandmen') {
      const g = this.guns.player;
      if (this.realms.player) {
        if (this.now < g.pistolReloadUntil) return 1 - (g.pistolReloadUntil - this.now) / (PISTOL_RELOAD_MS * this.api.player.dreamCooldownMult);
        return g.pistolMag / PISTOL_MAG;
      }
      if (this.now < g.reloadUntil) return 1 - (g.reloadUntil - this.now) / SANDMEN_RELOAD_MS;
      return g.mag / SANDMEN_MAG;
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
