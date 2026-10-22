import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  RAD, RadiationAvatar, RadiationColorFn, RadiationFx, barrageCone, bunkerTurret, dropFootprint,
  dummyLink, falloutBunker, falloutPuddle, doseCells, flareRound, geigerDial, geigerTracer, lockReticle,
  testDummy, trefoil, uraniumRod, xrayOutline,
} from './RadiationVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import {
  SniperFx, jarRound, jarateMark, kukriSwing, laserDot, scopeCone, scopeReticle, sniperNest, sniperRound,
} from './skins/SniperFx';

/** A Radiation rig, or a skin's: the dose / ping hooks are optional on a skin rig. */
type RadRig = BaseAvatar & { setDose?(v: number): void; ping?(): void };

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ── Irradiated ───────────────────────────────────────────────────────────────
const IRRADIATED_MS = 10_000;

// ── Click: Radiation Railgun ────────────────────────────────────────────────
const TRACERS_TO_CONFIRM = 3;
const TRACER_SPEED = 950;
const TRACER_HIT_R = 17;
const TRACER_RANGE = 700;
const RAIL_DAMAGE = 50;

// ── E: Barrage ───────────────────────────────────────────────────────────────
/** The cone's full width when it opens, and the width at which the burst fires. */
const BARRAGE_OPEN_DEG = 45;
const BARRAGE_CLOSED_DEG = 5;
/** How long a held lock takes to close the cone from 45° to 5°. */
const BARRAGE_LOCK_MS = 3000;
const BARRAGE_RANGE = 560;
/** The cone gives up if it has not found anybody to close on in this long. */
const BARRAGE_SEEK_MS = 1200;
/**
 * How much of a body counts as "in the cone". A bit over half the body radius, so at 5° a
 * target is held by keeping the cone on their middle — not by grazing their edge.
 */
const BARRAGE_BODY_R = 13;
const BARRAGE_SHOTS = 5;
const BARRAGE_SHOT_GAP = 60;
const BARRAGE_DAMAGE = 5;
const BARRAGE_HOT_DAMAGE = 8;
/** The bot swings its cone at this rate — fast enough to track a walk, not a dash. */
const NPC_CONE_TURN = 2.6;

// ── R: Fallout Bunker ────────────────────────────────────────────────────────
const BUNKER_R = 72;
const BUNKER_HP = 75;
const BUNKER_MS = 10_000;
const BUNKER_BUILD_MS = 260;
/** Fighters are ~22px round; an enemy is held out at the wall plus this. */
const BUNKER_BODY_R = 22;
/** Invasion husk shots carry no damage figure the kit can read, so each one costs this. */
const BUNKER_HUSK_SHOT = 6;

// ── F: Rod Baton ─────────────────────────────────────────────────────────────
const ROD_REACH = 92;
/** Half-width of the strike, in radians. */
const ROD_ARC = 0.8;
const ROD_DAMAGE = 8;
const ROD_HOT_DAMAGE = 16;
const ROD_DOSE_MS = 4000;
const ROD_STUN_MS = 2000;
const ROD_SWING_MS = 300;

// ── Q: Extermination ─────────────────────────────────────────────────────────
const FLARE_AMMO = 5;
const FLARE_SPEED = 1350;
const FLARE_HIT_R = 15;
const FLARE_RANGE = 900;
/** The gun goes back in the holster after this long, spent or not. */
const FLARE_WINDOW_MS = 12_000;
const AIRDROP_TELL_MS = 1700;
const AIRDROP_DAMAGE = 200;

const BODY_R = 22;

// ── Shop upgrades ────────────────────────────────────────────────────────────
/** Click+ Flick Shot: aim this far off the nearest enemy counts as facing away from them. */
const FLICK_AWAY_RAD = 100 * DEG;
/** …and a tracer thrown within this long of facing away is a flick. */
const FLICK_WINDOW_MS = 350;
const FLICK_DAMAGE = 25;
/** E+ Trigger Happy: the sustained fire's gap, and how the cone keeps closing while it runs. */
const TRIGGER_GAP = 100;
const TRIGGER_MIN_DEG = 1;
const TRIGGER_NARROW_MS = 4000;
/** R+ Turret Town: one turret on each side of the wall. */
const TURRET_RANGE = 300;
/** A turret answers anything that hit its bunker this recently, from twice as far. */
const TURRET_AGGRO_MS = 3000;
const TURRET_GAP = 420;
const TURRET_DAMAGE = 4;
/** F+ Mutation. */
const MUTATION_MS = 15_000;
const MUTATION_HITBOX = 1.25;
/** Q+ Complete Annihilation. */
const OVER_MS = 8000;
const OVER_INCOMING = 1.3;
const PUDDLE_MS = 9000;
const PUDDLE_TICK_MS = 400;
const PUDDLE_DAMAGE = 3;
const PUDDLE_DOSE_MS = 2500;
/**
 * Where the puddles land, as fractions of the arena, with each one's radius. Fixed rather than
 * random so both sims of an online match paint them in the same places — the drop always lands
 * in the middle, so the splash pattern can be too.
 */
const PUDDLE_SPOTS: [number, number, number][] = [
  [0.5, 0.5, 58], [0.3, 0.32, 46], [0.7, 0.3, 50], [0.24, 0.66, 52], [0.76, 0.68, 46],
  [0.46, 0.8, 44], [0.58, 0.18, 40], [0.13, 0.4, 42], [0.87, 0.46, 44], [0.38, 0.52, 36],
  [0.64, 0.56, 38],
];

// ── Mastery ──────────────────────────────────────────────────────────────────
const DUMMY_ID = 'test-dummy';
const DUMMY_HP = 25;
/** A dummy nobody breaks comes down on its own after this long. */
const DUMMY_MS = 12_000;
const DUMMY_COOLDOWN_MS = 16_000;
/** How far it can be thrown, and how long it is in the air. */
const DUMMY_RANGE = 230;
const DUMMY_THROW_MS = 380;
/** The dummy's body, for shots and blasts that reach it. Centred a little above its feet. */
const DUMMY_HIT_R = 18;
const DUMMY_LIFT_Y = 4;
/** Invasion husk shots carry no damage figure the kit can read, so each one costs this. */
const DUMMY_HUSK_SHOT = 6;
/** One cell of the dummy's counter is this many HP — five cells for 25. */
const DUMMY_CELL_HP = 5;
/** The bot throws it when it drops below this much HP with the target this close. */
const NPC_DUMMY_HURT = 0.6;
const NPC_DUMMY_HURT_RANGE = 320;

/**
 * Closest point on the segment (ax,ay)→(bx,by) to (px,py).
 *
 * Everything this kit fires is hand-rolled rather than a `Projectile`, so nothing else sweeps
 * these for it — see `updateRounds`.
 */
function nearestOnSegment(
  ax: number, ay: number, bx: number, by: number, px: number, py: number,
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return { x: ax, y: ay };
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}

// ── World objects ────────────────────────────────────────────────────────────

/** A tracer or a flare in the air. The two differ only in what they do on contact. */
interface Round {
  owner: Owner;
  kind: 'tracer' | 'flare';
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  /** Distance still allowed before it counts as a miss. */
  left: number;
  /** Click+ Flick Shot: thrown straight out of facing away, so it hurts when it lands. */
  spiked: boolean;
}

/**
 * Barrage, from the moment the cone opens to the last round of the burst.
 *
 * `victim` is null while the cone is still looking for somebody; `lockedAt` is when it found
 * them. Once the lock closes the cone is gone and `shotsLeft` counts the burst down.
 */
interface Barrage {
  startedAt: number;
  ang: number;
  victim: Fighter | null;
  lockedAt: number;
  shotsLeft: number;
  nextShotAt: number;
  /** E+ Trigger Happy: when the sustained fire began (0 = not sustaining), and rounds fired. */
  firingSince: number;
  fired: number;
}

/** R+ Turret Town: one gun on the bunker wall. */
interface Turret {
  /** Which side of the wall, -1 or 1. */
  side: number;
  ang: number;
  nextAt: number;
  recoil: number;
  live: boolean;
}

/** Q+ Complete Annihilation: a pool of fallout left behind by the drop. */
interface Puddle {
  owner: Owner;
  x: number;
  y: number;
  r: number;
  until: number;
  seed: number;
}

interface Bunker {
  x: number;
  y: number;
  hp: number;
  builtAt: number;
  until: number;
  /** 0–1, decayed per frame — the wall flashing where it last stopped something. */
  hit: number;
  seed: number;
  /** R+ Turret Town: the two guns on the wall, or null without the upgrade. */
  turrets: Turret[] | null;
  /** Game clock until which the turrets answer whoever hit the bunker, from further out. */
  aggroUntil: number;
}

/** The flare gun, out and loaded. `hits` is the whole ability: five on one body or nothing. */
interface Flares {
  ammo: number;
  hits: Map<Fighter, number>;
  /** Rounds still in the air, so the verdict waits for the last one to land. */
  inFlight: number;
  expiresAt: number;
}

interface Airdrop {
  owner: Owner;
  x: number;
  y: number;
  landsAt: number;
}

/** One swing of the rod, purely for what gets drawn behind the hit. */
interface Swing {
  x: number;
  y: number;
  ang: number;
  start: number;
  hot: boolean;
}

/** Mastery — Test Dummy: thrown, then standing on its base until it is broken or times out. */
interface TestDummy {
  owner: Owner;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  thrownAt: number;
  landsAt: number;
  landed: boolean;
  hp: number;
  until: number;
  /** 0–1, decayed per frame — the plate flaring where the link just dumped a hit into it. */
  hit: number;
  seed: number;
  /** Online, the owner's sim: the HP last relayed to the peer, so a change is sent once. */
  sentHp: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /**
   * Tracers currently clamped to a body, by victim. Cleared wholesale by a miss.
   */
  stuck: Map<Fighter, number>;
  barrage: Barrage | null;
  bunker: Bunker | null;
  /** The absorber this kit installed for the bunker, so it is only handed back if nobody replaced it. */
  absorber: ((amount: number) => boolean) | null;
  /** Whatever was on the fighter before the bunker claimed the slot. */
  prevAbsorber: ((amount: number) => boolean) | null;
  flares: Flares | null;
  swing: Swing | null;
  /** Click+ Flick Shot: the last game-clock moment this side was facing away from its enemy. */
  awayAt: number;
  /** The bot's facing, read off its walk — offline it has no cursor to flick. */
  face: number;
  /** Mastery — the Test Dummy standing for this side, and when it was last thrown (scene time). */
  dummy: TestDummy | null;
  dummyAt: number;
  /** The absorber the dummy installed, and whatever it took the slot from — see `installAbsorber`. */
  dummyAbsorber: ((amount: number) => boolean) | null;
  dummyPrevAbsorber: ((amount: number) => boolean) | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, stuck: new Map(),
    barrage: null, bunker: null, absorber: null, prevAbsorber: null,
    flares: null, swing: null, awayAt: -Infinity, face: 0,
    // Thrown "long ago", so the first match's dummy is ready — the kit's clock is absolute.
    dummy: null, dummyAt: -Infinity, dummyAbsorber: null, dummyPrevAbsorber: null,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface RadiationArenaApi {
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
  /** Online: the npc is a replica of a real player, so its cone follows their relayed facing. */
  get isOnline(): boolean;
  /** The bot's difficulty aim error, so its Barrage cone wobbles like the rest of its aim. */
  get npcAimOffsetDeg(): number;
  /** The arena's shared projectile group — the bunker wall stops enemy shots in it. */
  get projectiles(): Phaser.Physics.Arcade.Group | null;
  /** Invasion: husk shots live outside the projectile group. True if one near (x,y) was eaten. */
  blockHuskShot(x: number, y: number, r: number): boolean;
  /** Skins: maps a Radiation visual colour through that side's equipped skin. */
  radiationColor(owner: Owner, base: number): number;
  /** Skins: the skin id that side has equipped, or null. */
  skinId(owner: Owner): string | null;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Shop upgrades: the player's own, or the opponent's (a bot's loadout, a remote handshake). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get isInvasion(): boolean;
  /** Invasion: only husks in the room being played are real to the player. */
  isTargetable(f: Fighter): boolean;

  // ── Mastery ──
  readonly masteryActive: boolean;
  readonly npcMasteryActive: boolean;
  /** Which mastery enhancement each side dropped over an R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
  /** Online: relay a press that never touches a cooldown (see `replayNet`). */
  broadcast(id: string): void;
}

// ── RadiationKit ─────────────────────────────────────────────────────────────

/**
 * Radiation — a sniper in lead plate.
 *
 * The click is a **chain**: it plants a tracer that does no damage, three tracers on one body
 * confirm a 50-damage railgun the kit fires itself, and a single tracer that hits nothing scrubs
 * the board. The Q is the same shape with the stakes moved: five flares into one enemy calls the
 * airdrop, anything less calls nothing.
 *
 * The status the element sells is **irradiated**: while it lasts, every heal aimed at the victim
 * lands as a hit instead. The railgun and the airdrop put ten seconds of it on, the Rod Baton
 * four — and the kit's other two damage keys are worth more against somebody already carrying it:
 * Barrage's rounds go from 5 to 8, and the rod stops dosing and starts stunning.
 *
 * - **E Barrage** — a 45° sighting cone. Hold it on an enemy and it closes to 5° over three
 *   seconds; let them out and it is gone. Closed, it fires a five-round hitscan burst.
 * - **R Fallout Bunker** — a 75 HP lead ring where you stand. Enemy shots stop in the wall,
 *   enemies cannot get in, and while you are inside nothing can hurt you; the bunker takes it.
 * - **F Rod Baton** — a close strike with a uranium rod. A clean target is dosed; a dosed one
 *   takes double and is stunned for two seconds.
 */
export class RadiationKit {
  private api: RadiationArenaApi;

  // ── Visuals ──
  private readonly pcol: RadiationColorFn;
  private readonly ncol: RadiationColorFn;
  private readonly pfx: RadiationFx;
  private readonly nfx: RadiationFx;
  private playerAvatar: RadRig | null = null;
  private npcAvatar: RadRig | null = null;
  /** The Sniper skin's one-shots, used for whichever side has it equipped. */
  private readonly psfx: SniperFx;
  private readonly nsfx: SniperFx;
  /** Bunkers and the airdrop's footprint — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Rounds in the air, stuck tracers, cones, rods and counters — over everything. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private rounds: Round[] = [];
  private airdrop: Airdrop | null = null;
  /** Victim → game-clock expiry of their dose, and who gave it to them. */
  private irradiated = new Map<Fighter, { until: number; full: number; by: Owner }>();
  /** Victim → game-clock expiry of a rod stun. */
  private stunned = new Map<Fighter, number>();
  /** Q+ fallout puddles on the floor. */
  private puddles: Puddle[] = [];
  /** Victim → game clock of their next puddle tick, so overlapping pools never double up. */
  private puddleTickAt = new Map<Fighter, number>();
  /** Fighters whose `hitboxMult` currently carries the Mutation factor. */
  private grown = new Set<Fighter>();
  /** Mastery — the stand-in an AI chases while a side's dummy is up. See `decoyOf`. */
  private decoys: Record<Owner, Fighter | null> = { player: null, npc: null };
  /** Online: a counter on the relayed dummy-HP ids, so two equal values are never deduped. */
  private dummySeq = 0;

  constructor(api: RadiationArenaApi) {
    this.api = api;
    this.pcol = (base) => api.radiationColor('player', base);
    this.ncol = (base) => api.radiationColor('npc', base);
    this.pfx = new RadiationFx(api.scene, this.pcol);
    this.nfx = new RadiationFx(api.scene, this.ncol);
    this.psfx = new SniperFx(api.scene, this.pcol);
    this.nsfx = new SniperFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): RadiationFx {
    if (this.sniper(owner)) return owner === 'player' ? this.psfx : this.nsfx;
    return owner === 'player' ? this.pfx : this.nfx;
  }
  /** Sniper skin: that side's art is the bushman's (visual only). */
  private sniper(owner: Owner): boolean { return this.api.skinId(owner) === 'sniper'; }
  private col(owner: Owner): RadiationColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isRadiation(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'radiation' : this.api.npcElementId === 'radiation';
  }

  private avatar(owner: Owner): RadRig | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Everything this kit ever writes a field on, so a stale value can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** Shop upgrade check — only ever true for a side that is actually playing Radiation. */
  private up(owner: Owner, slot: string): boolean {
    return this.isRadiation(owner) && this.api.hasUpgrade(owner, slot);
  }

  private refund(f: Fighter, abilityId: string): void {
    f.resetCooldown(abilityId);
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** Where the shot leaves from — the weapon hand if the rig is up, the chest otherwise. */
  private muzzle(owner: Owner): { x: number; y: number } {
    const f = this.fighter(owner);
    const av = this.avatar(owner);
    if (!av) return { x: f.x, y: f.y };
    const h = av.castHand();
    return Number.isFinite(h.x) && (h.x || h.y) ? h : { x: f.x, y: f.y };
  }

  /**
   * How much wider than a normal body that target currently is, in pixels. Zero unless
   * something else in the game has swelled, folded or shrunk it — every range check in this
   * kit is hand-rolled, so without this a Fate slots roll would resize a body nothing Radiation
   * owns was measuring against.
   */
  private swell(t: Fighter): number {
    const scale = t.sizeMult * t.shapeSizeMult * t.oozeSizeMult * t.hitboxMult;
    return BODY_R * (scale - 1);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) this.dropBunker(owner, true);
    for (const owner of BOTH) this.dropDummy(owner, true);
    this.decoys = { player: null, npc: null };
    this.dummySeq = 0;
    for (const f of this.allFighters()) {
      if (!f) continue;
      f.healInvertedUntil = 0;
      f.onHealInverted = null;
      f.radMutatedUntil = 0;
      f.overRadiatedUntil = 0;
      f.radiationIncomingMult = 1;
    }
    for (const f of this.grown) {
      if (!f) continue;
      f.hitboxMult /= MUTATION_HITBOX;
      if (f.active) f.applySizeMult();
    }
    this.grown.clear();
    this.puddles = [];
    this.puddleTickAt.clear();

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.rounds = [];
    this.airdrop = null;
    this.irradiated.clear();
    this.stunned.clear();
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;

    this.api.setStatusIndicator('radiation-irradiated', null);
    this.api.setStatusIndicator('radiation-flares', null);
    this.api.setStatusIndicator('radiation-barrage', null);
    this.api.setStatusIndicator('radiation-bunker', null);
    this.api.setStatusIndicator('radiation-dummy', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5. The bunker slab goes under them; everything airborne well above.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isRadiation('player') && !this.playerAvatar) {
      this.playerAvatar = makeSkinAvatar(this.api.skinId('player'), scene) ?? new RadiationAvatar(scene, this.pcol);
    }
    if (this.isRadiation('npc') && !this.npcAvatar) {
      this.npcAvatar = makeSkinAvatar(this.api.skinId('npc'), scene) ?? new RadiationAvatar(scene, this.ncol);
    }
  }

  // ── Irradiated ─────────────────────────────────────────────────────────────

  /**
   * Put a dose on someone. Refreshes rather than stacks, and never shortens: a four-second rod
   * dose landing on somebody with nine seconds of railgun left leaves them on nine.
   */
  private irradiate(victim: Fighter, by: Owner, ms = IRRADIATED_MS, quiet = false): void {
    if (!this.alive(victim)) return;
    const prev = this.irradiated.get(victim);
    const until = Math.max(prev?.until ?? 0, this.now + ms);
    this.irradiated.set(victim, { until, full: Math.max(ms, prev ? prev.until - this.now : 0), by });
    victim.healInvertedUntil = Math.max(victim.healInvertedUntil, Date.now() + (until - this.now));
    // The inversion is silent inside `Fighter.heal`, and a heal that quietly hurt would read as
    // a bug — so the pop-up is hung off the fighter for as long as the dose lasts.
    victim.onHealInverted = (harm) => {
      this.api.showFloatingText(victim.x, victim.y - 40, this.sniper(by) ? `${harm} JARATE'D` : `☢ ${harm} REJECTED`, this.hex(this.col(by)(RAD.neon)));
    };
    if (quiet) return;
    this.fx(by).dose(victim.x, victim.y);
    if (!prev) {
      this.api.showFloatingText(victim.x, victim.y - 48, this.sniper(by) ? 'JARATE' : '☢ IRRADIATED', this.hex(this.col(by)(RAD.neon)));
      Sfx.playAt('status-poison', victim.x, { rate: 1.25, volume: 0.8 });
    }
  }

  /** Take a dose off somebody outright (F+ Mutation turns it into something worse). */
  private cleanse(victim: Fighter): void {
    this.irradiated.delete(victim);
    victim.healInvertedUntil = 0;
    victim.onHealInverted = null;
  }

  private isIrradiated(victim: Fighter): boolean {
    return this.irradiated.has(victim) || Date.now() < victim.healInvertedUntil;
  }

  private updateIrradiated(): void {
    // Online, a dose the opponent put on us arrives as a bare `healInvertedUntil` (relayed by
    // NetStatusSync) rather than through this kit. Adopt it, so the marker, the tray entry and the
    // "REJECTED" pop-up all show on the victim's own screen.
    const p = this.api.player;
    const mirrored = p ? p.healInvertedUntil - Date.now() : 0;
    if (p && mirrored > 0 && this.alive(p)
      && (this.irradiated.get(p)?.until ?? 0) < this.now + mirrored - 100) {
      this.irradiate(p, 'npc', mirrored, this.irradiated.has(p));
    }
    for (const [v, d] of [...this.irradiated]) {
      // Online, an adopted dose ends when the mirror drops it — F+ Mutation takes it off early.
      const dropped = this.api.isOnline && v === p && d.by === 'npc' && Date.now() >= v.healInvertedUntil;
      if (this.alive(v) && this.now < d.until && !dropped) continue;
      this.irradiated.delete(v);
      if (v) { v.healInvertedUntil = 0; v.onHealInverted = null; }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'radiation') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p) || this.stunned.has(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) p.castAbility('radiation-railgun', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('radiation-barrage', ctx);
    // Mastery: whichever of R/F/Q the Test Dummy was dropped on stops being its own ability.
    const bound = this.dummySlot('player');
    const keys = { r: this.api.rKey, f: this.api.fKey, q: this.api.qKey };
    if (bound && Phaser.Input.Keyboard.JustDown(keys[bound])) this.tryTestDummy('player', mouseX, mouseY);
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('radiation-bunker', ctx);
    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('radiation-baton', ctx);
    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('radiation-extermination', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — a tracer, or a flare while the gun is out.
   *
   * Nothing here deals damage. The tracer is a delivery vehicle for a count, and the count is
   * the ability: three on one body and the kit fires the railgun itself.
   */
  doRailgun(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-railgun'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const flaring = !!s.flares && s.flares.ammo > 0;
    const m = this.muzzle(owner);
    const ang = Math.atan2(ty - m.y, tx - m.x);
    // Click+ Flick Shot: a tracer thrown straight out of facing away from them comes out barbed.
    const spiked = !flaring && this.up(owner, 'click') && this.now - s.awayAt <= FLICK_WINDOW_MS
      && !this.facingAway(owner, ang);
    if (spiked) Sfx.playAt('whoosh', f.x, { rate: 1.6, volume: 0.6 });
    this.rounds.push({
      spiked,
      owner,
      kind: flaring ? 'flare' : 'tracer',
      x: m.x, y: m.y,
      vx: Math.cos(ang) * (flaring ? FLARE_SPEED : TRACER_SPEED),
      vy: Math.sin(ang) * (flaring ? FLARE_SPEED : TRACER_SPEED),
      ang,
      left: flaring ? FLARE_RANGE : TRACER_RANGE,
    });

    if (flaring && s.flares) {
      s.flares.ammo--;
      s.flares.inFlight++;
      Sfx.playAt('musket', f.x, { rate: 1.6, volume: 0.6 });
    }
    this.avatar(owner)?.play('punch', ang);
    this.avatar(owner)?.ping?.();
  }

  /**
   * E — open the sighting cone.
   *
   * Everything after this is `updateBarrage`: the cone has to follow the aim every frame, find a
   * target, hold it while it closes, and let go the instant they step out.
   */
  doBarrage(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-barrage'); return; }
    const s = this.side(owner);
    if (s.barrage) { this.refund(f, 'radiation-barrage'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    s.aimX = tx;
    s.aimY = ty;
    s.barrage = {
      startedAt: this.now,
      ang: Math.atan2(ty - f.y, tx - f.x),
      victim: null,
      lockedAt: 0,
      shotsLeft: 0,
      nextShotAt: 0,
      firingSince: 0,
      fired: 0,
    };
    this.avatar(owner)?.setHold('reach', s.barrage.ang);
    Sfx.playAt('sonic-pulse', f.x, { rate: 1.3, volume: 0.6 });
  }

  /** R — the bunker goes up where you are standing. A second one replaces the first. */
  doBunker(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-bunker'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    this.dropBunker(owner, true);
    const s = this.side(owner);
    s.bunker = {
      x: f.x, y: f.y, hp: BUNKER_HP,
      builtAt: this.now, until: this.now + BUNKER_MS,
      hit: 0, seed: Math.random() * 999,
      turrets: this.up(owner, 'r')
        ? [-1, 1].map((side) => ({ side, ang: side < 0 ? Math.PI : 0, nextAt: 0, recoil: 0, live: false }))
        : null,
      aggroUntil: 0,
    };
    this.installAbsorber(owner);
    this.avatar(owner)?.play('slam');
    this.fx(owner).bunkerRise(f.x, f.y, BUNKER_R);
    this.api.showFloatingText(f.x, f.y - 58, '☢ FALLOUT BUNKER', this.hex(RAD.neonLit));
    Sfx.playAt('quake', f.x, { rate: 1.4, volume: 0.6 });
    Sfx.playAt('shield-up', f.x, { rate: 0.8, volume: 0.8 });
    this.api.scene.cameras.main.shake(140, 0.004);
  }

  /**
   * F — strike with the rod.
   *
   * The branch is the ability: a clean target is dosed, a dosed one is hit twice as hard and
   * stunned. The rod is the one thing in the kit that wants the status to already be there.
   */
  doBaton(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-baton'); return; }
    this.ensureLayers();
    this.ensureAvatars();
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.aimX = tx;
    s.aimY = ty;

    let anyHot = false;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > ROD_REACH + BODY_R + this.swell(t)) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (off > ROD_ARC) continue;

      const hot = this.isIrradiated(t);
      anyHot = anyHot || hot;
      t.takeDamage(hot ? ROD_HOT_DAMAGE : ROD_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(hot ? RAD.hazard : RAD.neon));
      this.fx(owner).rodStrike(t.x, t.y, ang, hot);
      if (hot) this.stun(t, owner, ROD_STUN_MS);
      else this.irradiate(t, owner, ROD_DOSE_MS);
      // F+ Mutation: the dose they were already carrying curdles into a mutation.
      if (hot && this.up(owner, 'f')) this.mutate(t, owner);
    }

    s.swing = { x: f.x, y: f.y, ang, start: this.now, hot: anyHot };
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('flail-swing', f.x, { rate: 0.8, volume: 0.9 });
    if (anyHot) Sfx.playAt('explosion-small', f.x, { rate: 1.3, volume: 0.6 });
  }

  /**
   * Q — the flare gun.
   *
   * The ultimate does nothing on its own. It hands over five rounds and twelve seconds, and the
   * payout arrives only if every single one of them lands on the same body.
   */
  doExtermination(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'radiation-extermination'); return; }
    const s = this.side(owner);
    if (s.flares) { this.refund(f, 'radiation-extermination'); return; }
    this.ensureLayers();
    this.ensureAvatars();

    s.flares = { ammo: FLARE_AMMO, hits: new Map(), inFlight: 0, expiresAt: this.now + FLARE_WINDOW_MS };
    this.avatar(owner)?.play('raise');
    this.avatar(owner)?.ping?.();
    this.api.showFloatingText(f.x, f.y - 58, `☢ ${FLARE_AMMO} FLARES · ONE TARGET`, this.hex(RAD.neon));
    Sfx.playAt('reload', f.x, { rate: 0.9, volume: 1 });
  }

  // ── Rounds in the air ──────────────────────────────────────────────────────

  private updateRounds(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.rounds.length - 1; i >= 0; i--) {
      const r = this.rounds[i];
      const step = Math.hypot(r.vx, r.vy) * dt;
      const fromX = r.x;
      const fromY = r.y;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.left -= step;

      const out = r.x < this.left || r.x > this.right || r.y < this.top || r.y > this.bottom;
      let landed: Fighter | null = null;
      const hitR = r.kind === 'tracer' ? TRACER_HIT_R : FLARE_HIT_R;
      for (const t of this.targetsOf(r.owner)) {
        const rr = hitR + 18 + this.swell(t);
        // Swept, not sampled: a tracer covers ~16px between two frames, so testing only where
        // it ended let it step clean over a body it went straight through.
        const near = nearestOnSegment(fromX, fromY, r.x, r.y, t.x, t.y);
        if (Phaser.Math.Distance.Between(near.x, near.y, t.x, t.y) > rr) continue;
        landed = t;
        break;
      }

      if (landed) {
        this.rounds.splice(i, 1);
        if (r.kind === 'tracer') {
          if (r.spiked) this.onFlickHit(r.owner, landed, r.ang);
          this.onTracerHit(r.owner, landed);
        } else this.onFlareHit(r.owner, landed);
        continue;
      }
      if (out || r.left <= 0) {
        this.rounds.splice(i, 1);
        if (r.kind === 'tracer') this.onTracerMiss(r.owner, r.x, r.y);
        else this.onFlareMiss(r.owner);
      }
    }
  }

  /** Click+ Flick Shot: the barbs land for 25 before the tracer counts like any other. */
  private onFlickHit(owner: Owner, victim: Fighter, ang: number): void {
    if (!this.alive(victim)) return;
    victim.takeDamage(FLICK_DAMAGE);
    this.record(owner, 'flickHits');
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(RAD.hot));
    this.fx(owner).flickHit(victim.x, victim.y, ang);
    this.api.showFloatingText(victim.x, victim.y - 66, '✦ FLICK SHOT', this.hex(RAD.hotLit));
    Sfx.playAt('hit-heavy', victim.x, { rate: 1.2, volume: 0.7 });
  }

  private onTracerHit(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    const n = (s.stuck.get(victim) ?? 0) + 1;
    this.fx(owner).stick(victim.x, victim.y);
    Sfx.playAt('nail', victim.x, { rate: 1 + n * 0.18, volume: 0.7 });

    if (n < TRACERS_TO_CONFIRM) {
      s.stuck.set(victim, n);
      this.api.showFloatingText(victim.x, victim.y - 40, `TRACER ${n}/${TRACERS_TO_CONFIRM}`, this.hex(RAD.hazard));
      return;
    }
    // Confirmed. The three are spent on the shot rather than left on the body, so the next
    // railgun costs another three clicks — the ability is a reload, not a stack.
    s.stuck.delete(victim);
    this.fireRailgun(owner, victim);
  }

  /**
   * A tracer that hit nothing scrubs the board — every tracer this side has planted, on every
   * body, falls off. The click is free, the confirm is not.
   */
  private onTracerMiss(owner: Owner, x: number, y: number): void {
    const s = this.side(owner);
    this.fx(owner).shed(x, y);
    if (!s.stuck.size) return;
    for (const [v] of s.stuck) this.fx(owner).shed(v.x, v.y - 8);
    s.stuck.clear();
    const f = this.fighter(owner);
    this.api.showFloatingText(f.x, f.y - 46, '✖ TRACERS LOST', this.hex(RAD.hazard));
    Sfx.playAt('status-expire', f.x, { rate: 1.2, volume: 0.8 });
  }

  /** The confirmed shot: hitscan from the muzzle, 50 damage, and a dose on the way out. */
  private fireRailgun(owner: Owner, victim: Fighter): void {
    const m = this.muzzle(owner);
    const ang = Math.atan2(victim.y - m.y, victim.x - m.x);
    this.fx(owner).rail(m.x, m.y, victim.x, victim.y);
    this.fx(owner).railHit(victim.x, victim.y, ang);
    this.avatar(owner)?.ping?.();

    victim.takeDamage(RAIL_DAMAGE);
    this.record(owner, 'snipes');
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(RAD.core));
    this.irradiate(victim, owner, IRRADIATED_MS, true);
    this.api.showFloatingText(victim.x, victim.y - 62, '☢ CONFIRMED', this.hex(RAD.core));
    Sfx.playAt('beam-fire', victim.x, { rate: 0.85, volume: 1 });
    this.api.scene.cameras.main.shake(120, 0.004);
  }

  private onFlareHit(owner: Owner, victim: Fighter): void {
    const s = this.side(owner);
    if (!s.flares) return;
    s.flares.inFlight = Math.max(0, s.flares.inFlight - 1);
    const n = (s.flares.hits.get(victim) ?? 0) + 1;
    s.flares.hits.set(victim, n);
    this.fx(owner).stick(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 44, `${n}/${FLARE_AMMO}`, this.hex(RAD.neonLit));
    Sfx.playAt('sparkle', victim.x, { rate: 0.9 + n * 0.12, volume: 0.7 });
    this.settleFlares(owner);
  }

  private onFlareMiss(owner: Owner): void {
    const s = this.side(owner);
    if (!s.flares) return;
    s.flares.inFlight = Math.max(0, s.flares.inFlight - 1);
    this.settleFlares(owner);
  }

  /**
   * Decide the ultimate, once the magazine is empty and the last round has resolved. Five on one
   * body calls the drop; anything else is simply gone.
   */
  private settleFlares(owner: Owner): void {
    const s = this.side(owner);
    const fl = s.flares;
    if (!fl || fl.ammo > 0 || fl.inFlight > 0) return;

    let confirmed = false;
    for (const [, n] of fl.hits) if (n >= FLARE_AMMO) confirmed = true;
    s.flares = null;

    const f = this.fighter(owner);
    if (!confirmed) {
      this.api.showFloatingText(f.x, f.y - 56, '✖ NO CONFIRMATION', this.hex(RAD.hazard));
      Sfx.playAt('ui-denied', f.x, { rate: 0.7, volume: 0.8 });
      return;
    }
    this.airdrop = {
      owner,
      x: this.api.width / 2,
      y: this.api.height / 2,
      landsAt: this.now + AIRDROP_TELL_MS,
    };
    this.api.showFloatingText(f.x, f.y - 70, '☢☢ AIRDROP INBOUND ☢☢', this.hex(RAD.core));
    Sfx.playAt('countdown-go', f.x, { rate: 0.55, volume: 1 });
    Sfx.playAt('train-horn', f.x, { rate: 0.7, volume: 0.9 });
    this.api.scene.cameras.main.shake(AIRDROP_TELL_MS, 0.0035);
  }

  private updateAirdrop(): void {
    const a = this.airdrop;
    if (!a) return;
    if (this.now < a.landsAt) return;
    this.airdrop = null;

    this.fx(a.owner).airdrop(a.x, a.y);
    this.api.scene.cameras.main.shake(1100, 0.026);
    this.api.scene.cameras.main.flash(360, 200, 255, 160);
    Sfx.playAt('explosion-large', a.x, { rate: 0.55, volume: 1 });
    Sfx.playAt('quake', a.x, { rate: 0.6, volume: 1 });

    const annihilation = this.up(a.owner, 'q');
    for (const t of this.targetsOf(a.owner)) {
      // Q+: read before the drop doses them, or every target would count as already irradiated.
      const wasHot = this.isIrradiated(t);
      t.takeDamage(AIRDROP_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(a.owner)(RAD.core));
      this.irradiate(t, a.owner, IRRADIATED_MS, true);
      if (annihilation && wasHot) this.overRadiate(t, a.owner);
    }
    if (annihilation) this.spillPuddles(a.owner);
    // "Everyone on screen" includes the caster. The self-hit goes through the self-damage route
    // so a shield can't be spent dodging your own bomb — but a caster inside their own bunker is
    // exactly what the bunker is for: it takes the drop, and comes down doing it.
    const caster = this.fighter(a.owner);
    if (!this.alive(caster)) return;
    if (this.sheltered(a.owner)) {
      this.api.showFloatingText(caster.x, caster.y - 60, '☢ THE BUNKER HELD', this.hex(RAD.neonLit));
      this.breakBunker(a.owner);
      return;
    }
    // Mastery: a standing Test Dummy takes it down the link, exactly as it takes everything else.
    if (this.dummyStanding(a.owner)) {
      this.api.showFloatingText(caster.x, caster.y - 60, '🎯 THE DUMMY TOOK IT', this.hex(RAD.hazard));
      if (!this.isReplica(a.owner)) this.breakDummy(a.owner);
      return;
    }
    caster.applySelfDamage(AIRDROP_DAMAGE);
    this.api.showFloatingText(caster.x, caster.y - 60, '☢ EXTERMINATED', this.hex(RAD.hazard));
  }

  /** The gun goes back in the holster when the window runs out, spent rounds or not. */
  private updateFlareWindow(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const fl = s.flares;
      if (!fl || this.now < fl.expiresAt) continue;
      s.flares = null;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      this.api.showFloatingText(f.x, f.y - 56, '✖ FLARES EXPIRED', this.hex(RAD.hazard));
      Sfx.playAt('status-expire', f.x, { rate: 0.9, volume: 0.75 });
    }
  }

  // ── Barrage ────────────────────────────────────────────────────────────────

  /** The cone's current half-width, in radians. */
  private coneHalf(b: Barrage): number {
    // E+ Trigger Happy: once the fire is sustained the cone carries on closing, 5° down to 1°.
    if (b.firingSince > 0) {
      const k = Phaser.Math.Clamp((this.now - b.firingSince) / TRIGGER_NARROW_MS, 0, 1);
      return (Phaser.Math.Linear(BARRAGE_CLOSED_DEG, TRIGGER_MIN_DEG, k) / 2) * DEG;
    }
    const k = b.victim ? Phaser.Math.Clamp((this.now - b.lockedAt) / BARRAGE_LOCK_MS, 0, 1) : 0;
    return (Phaser.Math.Linear(BARRAGE_OPEN_DEG, BARRAGE_CLOSED_DEG, k) / 2) * DEG;
  }

  private lockProgress(b: Barrage): number {
    return b.victim ? Phaser.Math.Clamp((this.now - b.lockedAt) / BARRAGE_LOCK_MS, 0, 1) : 0;
  }

  /** Whether a body is inside the cone right now — its middle, not its edge. */
  private inCone(owner: Owner, b: Barrage, t: Fighter): boolean {
    const f = this.fighter(owner);
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d > BARRAGE_RANGE + BARRAGE_BODY_R) return false;
    const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - b.ang));
    return off <= this.coneHalf(b) + Math.atan2(BARRAGE_BODY_R, Math.max(1, d));
  }

  /**
   * Where the cone is pointing this frame.
   *
   * The player's cone is their cursor. The bot's swings toward its target at a capped rate with
   * its difficulty's aim error riding on it, so a strafing player can genuinely walk out of it.
   * Online, the npc is somebody else's cursor — relayed as their facing.
   */
  private aimCone(owner: Owner, b: Barrage, dt: number): void {
    const f = this.fighter(owner);
    if (owner === 'player') {
      const s = this.side(owner);
      b.ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      // Relayed to the peer as the facing angle, which is how their replica's cone follows ours.
      f.facingAngle = b.ang;
      return;
    }
    if (this.api.isOnline) { b.ang = f.facingAngle; return; }
    const t = b.victim ?? this.nearestTarget(owner);
    if (!t) return;
    const wobble = Math.sin(this.vizT * 1.7) * this.api.npcAimOffsetDeg * DEG * 0.6;
    const want = Math.atan2(t.y - f.y, t.x - f.x) + wobble;
    const diff = Phaser.Math.Angle.Wrap(want - b.ang);
    const step = NPC_CONE_TURN * dt;
    b.ang = Phaser.Math.Angle.Wrap(b.ang + Phaser.Math.Clamp(diff, -step, step));
  }

  private updateBarrage(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const b = s.barrage;
      if (!b) continue;
      const f = this.fighter(owner);
      const av = this.avatar(owner);
      if (!this.alive(f) || this.stunned.has(f)) { this.endBarrage(owner, 'quiet'); continue; }

      // ── The burst ──
      if (b.shotsLeft > 0 || b.firingSince > 0) {
        const v = b.victim;
        // E+ Trigger Happy keeps the cone up through the burst: it is what ends the fire.
        if (b.firingSince > 0) {
          this.aimCone(owner, b, delta / 1000);
          av?.setHold('reach', b.ang);
        }
        if (this.now < b.nextShotAt) continue;
        if (!v || !this.alive(v)) { this.endBarrage(owner, b.firingSince > 0 ? 'ceased' : 'quiet'); continue; }
        if (b.shotsLeft > 0) {
          this.fireBarrageRound(owner, v, b.fired++);
          b.shotsLeft--;
          b.nextShotAt = this.now + (b.firingSince > 0 ? TRIGGER_GAP : BARRAGE_SHOT_GAP);
          if (b.shotsLeft <= 0 && b.firingSince <= 0) this.endBarrage(owner, 'quiet');
          continue;
        }
        // Past the guaranteed five: every further round needs them still inside the cone.
        if (!this.inCone(owner, b, v)) { this.endBarrage(owner, 'ceased'); continue; }
        this.fireBarrageRound(owner, v, b.fired++);
        b.nextShotAt = this.now + TRIGGER_GAP;
        continue;
      }

      // ── The cone ──
      this.aimCone(owner, b, delta / 1000);
      av?.setHold('reach', b.ang);

      if (!b.victim) {
        // Close on the nearest body inside the cone, if there is one.
        let best: Fighter | null = null;
        let bestD = Infinity;
        for (const t of this.targetsOf(owner)) {
          if (!this.inCone(owner, b, t)) continue;
          const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
          if (d < bestD) { bestD = d; best = t; }
        }
        if (best) {
          b.victim = best;
          b.lockedAt = this.now;
          this.api.showFloatingText(best.x, best.y - 50, '◎ LOCKING', this.hex(RAD.neonLit));
          Sfx.playAt('ui-click', best.x, { rate: 0.8, volume: 0.8 });
        } else if (this.now - b.startedAt >= BARRAGE_SEEK_MS) {
          this.endBarrage(owner, 'nothing');
        }
        continue;
      }

      if (!this.alive(b.victim) || !this.inCone(owner, b, b.victim)) {
        this.endBarrage(owner, 'lost');
        continue;
      }
      if (this.lockProgress(b) < 1) continue;
      // Closed. The cone is spent and the burst begins on the next frame.
      b.shotsLeft = BARRAGE_SHOTS;
      b.nextShotAt = this.now;
      if (this.up(owner, 'e')) {
        b.firingSince = this.now;
        this.api.showFloatingText(b.victim.x, b.victim.y - 54, '☢ TRIGGER HAPPY', this.hex(RAD.hazard));
        continue;
      }
      av?.setHold(null);
      this.api.showFloatingText(b.victim.x, b.victim.y - 54, '☢ BARRAGE', this.hex(RAD.hazard));
    }
  }

  /** One round of the burst: hitscan from the hand to wherever the target is right now. */
  private fireBarrageRound(owner: Owner, victim: Fighter, i: number): void {
    const m = this.muzzle(owner);
    const ang = Math.atan2(victim.y - m.y, victim.x - m.x);
    // A little scatter on the drawn end so five rounds read as five, not one thick line.
    const jx = victim.x + (Math.random() - 0.5) * 10;
    const jy = victim.y + (Math.random() - 0.5) * 10;
    this.fx(owner).pistolShot(m.x, m.y, jx, jy);
    this.avatar(owner)?.play('punch', ang, 90);
    const hot = this.isIrradiated(victim);
    victim.takeDamage(hot ? BARRAGE_HOT_DAMAGE : BARRAGE_DAMAGE);
    // Mastery progress: one enemy hit by one burst, counted on its first round.
    if (i === 0) this.record(owner, 'barrageHits');
    this.api.spawnHitFlash(victim.x, victim.y, this.col(owner)(hot ? RAD.hazard : RAD.neon));
    Sfx.playAt('musket', victim.x, { rate: 1.5 + Math.min(i, 8) * 0.06, volume: 0.55 });
  }

  private endBarrage(owner: Owner, why: 'quiet' | 'lost' | 'nothing' | 'ceased'): void {
    const s = this.side(owner);
    const b = s.barrage;
    if (!b) return;
    s.barrage = null;
    this.avatar(owner)?.setHold(null);
    if (why === 'quiet') return;
    const f = this.fighter(owner);
    if (why === 'ceased') {
      this.fx(owner).lockLost(f.x, f.y, b.ang, this.coneHalf(b), BARRAGE_RANGE);
      this.api.showFloatingText(f.x, f.y - 50, `✖ CEASE FIRE · ${b.fired} ROUNDS`, this.hex(RAD.hazard));
      Sfx.playAt('reload', f.x, { rate: 1.3, volume: 0.6 });
      return;
    }
    this.fx(owner).lockLost(f.x, f.y, b.ang, this.coneHalf(b), BARRAGE_RANGE);
    this.api.showFloatingText(f.x, f.y - 50, why === 'lost' ? '✖ LOCK LOST' : '✖ NO TARGET',
      this.hex(RAD.hazard));
    Sfx.playAt('status-expire', f.x, { rate: 1.3, volume: 0.7 });
  }

  // ── Fallout Bunker ─────────────────────────────────────────────────────────

  /** True while that side has a standing bunker and is inside it. */
  private sheltered(owner: Owner): boolean {
    const bk = this.side(owner).bunker;
    if (!bk || bk.hp <= 0) return false;
    const f = this.fighter(owner);
    return this.alive(f) && Phaser.Math.Distance.Between(f.x, f.y, bk.x, bk.y) < BUNKER_R;
  }

  /**
   * Claim the fighter's absorber slot for the bunker. It is a single slot shared with Time's
   * Remain and Air's dodge, so the bunker chains: a hit taken outside the walls falls through to
   * whatever was there before.
   */
  private installAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.absorber) return;
    const prev = f.damageAbsorber;
    const mine = (amount: number): boolean => {
      if (this.sheltered(owner)) {
        this.damageBunker(owner, amount, f.x, f.y - 24);
        return true;
      }
      return prev ? prev(amount) : false;
    };
    s.prevAbsorber = prev;
    s.absorber = mine;
    f.damageAbsorber = mine;
  }

  private damageBunker(owner: Owner, amount: number, x: number, y: number): void {
    const bk = this.side(owner).bunker;
    if (!bk || bk.hp <= 0) return;
    const dmg = Math.max(0, Math.round(amount));
    bk.hp -= dmg;
    bk.hit = 1;
    bk.aggroUntil = this.now + TURRET_AGGRO_MS;
    if (dmg > 0) this.api.showFloatingText(x, y, `🛡 ${dmg}`, this.hex(RAD.leadLit));
    Sfx.playAt('hit-light', x, { rate: 0.7, volume: 0.6 });
    if (bk.hp <= 0) this.breakBunker(owner);
  }

  private breakBunker(owner: Owner): void {
    const bk = this.side(owner).bunker;
    if (!bk) return;
    this.fx(owner).bunkerBreak(bk.x, bk.y, BUNKER_R);
    this.api.showFloatingText(bk.x, bk.y - BUNKER_R - 20, '✖ BUNKER DOWN', this.hex(RAD.hazard));
    Sfx.playAt('explosion-small', bk.x, { rate: 0.8, volume: 0.9 });
    this.api.scene.cameras.main.shake(160, 0.005);
    this.dropBunker(owner, true);
  }

  /** Take the bunker away and hand the absorber slot back if nobody has claimed it since. */
  private dropBunker(owner: Owner, silent = false): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.absorber && f && f.damageAbsorber === s.absorber) f.damageAbsorber = s.prevAbsorber;
    s.absorber = null;
    s.prevAbsorber = null;
    const bk = s.bunker;
    s.bunker = null;
    if (!bk || silent) return;
    this.fx(owner).bunkerBreak(bk.x, bk.y, BUNKER_R);
    Sfx.playAt('status-expire', bk.x, { rate: 0.8, volume: 0.6 });
  }

  /**
   * Per frame: expire, hold enemies outside the wall, and stop enemy shots in it.
   *
   * Runs after both movement paths, so the push is the last word on an enemy's position — the
   * same arrangement every other wall in the game relies on.
   */
  private updateBunkers(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const bk = s.bunker;
      if (!bk) continue;
      bk.hit = Math.max(0, bk.hit - delta / 220);
      const self = this.fighter(owner);
      if (!this.alive(self) || this.now >= bk.until) { this.dropBunker(owner); continue; }

      // The bot sits its own airdrop out inside the walls: its chase would otherwise walk it
      // straight back out between casting the bunker and the drop landing. Written after both
      // movement paths, so it is the last word on the bot's velocity this frame.
      if (owner === 'npc' && !this.api.isOnline && this.airdrop?.owner === 'npc') {
        const d = Phaser.Math.Distance.Between(self.x, self.y, bk.x, bk.y);
        const v = this.body(self);
        if (v) {
          if (d > BUNKER_R * 0.4) {
            const a = Math.atan2(bk.y - self.y, bk.x - self.x);
            v.setVelocity(Math.cos(a) * 220, Math.sin(a) * 220);
          } else v.setVelocity(0, 0);
        }
      }

      // ── Enemies stay out ──
      const hold = BUNKER_R + BUNKER_BODY_R;
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(bk.x, bk.y, t.x, t.y);
        if (d >= hold) continue;
        const a = d < 0.5 ? Math.random() * TAU : Math.atan2(t.y - bk.y, t.x - bk.x);
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        t.setPosition(bk.x + ux * hold, bk.y + uy * hold);
        const v = this.body(t);
        if (v) {
          // Strip only the inward component, so they slide round the wall rather than stick.
          const inward = v.velocity.x * ux + v.velocity.y * uy;
          if (inward < 0) v.setVelocity(v.velocity.x - inward * ux, v.velocity.y - inward * uy);
        }
      }

      // ── Enemy shots stop in the wall ──
      const group = this.api.projectiles;
      if (group) {
        for (const go of group.getChildren()) {
          const p = go as Projectile;
          if (!p.active) continue;
          if (p.isFromPlayer === (owner === 'player')) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, bk.x, bk.y) > BUNKER_R + 6) continue;
          p.setActive(false).setVisible(false);
          this.fx(owner).bunkerHit(p.x, p.y, Math.atan2(p.y - bk.y, p.x - bk.x));
          this.damageBunker(owner, p.damage ?? 0, p.x, p.y);
          if (!s.bunker) break;
        }
      }
      if (owner === 'player' && s.bunker) {
        for (let i = 0; i < 6 && s.bunker && this.api.blockHuskShot(bk.x, bk.y, BUNKER_R + 6); i++) {
          this.fx(owner).bunkerHit(bk.x, bk.y - BUNKER_R, -Math.PI / 2);
          this.damageBunker(owner, BUNKER_HUSK_SHOT, bk.x, bk.y - BUNKER_R);
        }
      }
    }
  }

  // ── Stun ───────────────────────────────────────────────────────────────────

  private stun(victim: Fighter, by: Owner, ms: number): void {
    if (victim.unstoppable) {
      this.api.showFloatingText(victim.x, victim.y - 50, 'UNSTOPPABLE', this.hex(RAD.hazard));
      return;
    }
    this.stunned.set(victim, Math.max(this.stunned.get(victim) ?? 0, this.now + ms));
    victim.applyDisarm(ms);
    this.fx(by).stick(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 52, '⚡ STUNNED', this.hex(RAD.hazard));
    Sfx.playAt('status-stun', victim.x, { rate: 0.85, volume: 0.9 });
  }

  private updateStuns(): void {
    for (const [v, until] of [...this.stunned]) {
      if (!this.alive(v) || this.now >= until || v.unstoppable) { this.stunned.delete(v); continue; }
      this.body(v)?.setVelocity(0, 0);
      v.disarmedUntil = Math.max(v.disarmedUntil, Date.now() + 120);
    }
  }

  // ── Shop upgrades ──────────────────────────────────────────────────────────

  /** Which way that side is facing — the cursor, the relayed facing online, or the bot's walk. */
  private faceAngle(owner: Owner): number {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (owner === 'player') return Math.atan2(s.aimY - f.y, s.aimX - f.x);
    if (this.api.isOnline) return f.facingAngle;
    return s.face;
  }

  /** Whether an angle points away from that side's nearest enemy. */
  private facingAway(owner: Owner, ang: number): boolean {
    const f = this.fighter(owner);
    const t = this.nearestTarget(owner);
    if (!t) return false;
    const to = Math.atan2(t.y - f.y, t.x - f.x);
    return Math.abs(Phaser.Math.Angle.Wrap(to - ang)) > FLICK_AWAY_RAD;
  }

  /**
   * Click+ Flick Shot bookkeeping: stamp the last moment each side was facing away. The bot has
   * no cursor, so offline it faces where it is walking — a retreat turns its back, and a tracer
   * thrown on the way out is its flick.
   */
  private updateFlick(delta: number): void {
    void delta;
    for (const owner of BOTH) {
      if (!this.up(owner, 'click')) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const s = this.side(owner);
      if (owner === 'npc' && !this.api.isOnline) {
        const v = this.body(f)?.velocity;
        if (v && Math.hypot(v.x, v.y) > 40) s.face = Math.atan2(v.y, v.x);
      }
      if (this.facingAway(owner, this.faceAngle(owner))) s.awayAt = this.now;
    }
  }

  /**
   * R+ Turret Town: a gun each side of the wall. They only ever shoot somebody who is already
   * irradiated — within their own range, or anybody who has hit the bunker in the last three
   * seconds from twice as far.
   */
  private turretPos(bk: Bunker, tr: Turret): { x: number; y: number } {
    return { x: bk.x + tr.side * (BUNKER_R + 2), y: bk.y };
  }

  private updateTurrets(delta: number): void {
    for (const owner of BOTH) {
      const bk = this.side(owner).bunker;
      if (!bk?.turrets) continue;
      const aggro = this.now < bk.aggroUntil;
      for (const tr of bk.turrets) {
        tr.recoil = Math.max(0, tr.recoil - delta / 140);
        const at = this.turretPos(bk, tr);
        let best: Fighter | null = null;
        let bestD = Infinity;
        for (const t of this.targetsOf(owner)) {
          if (!this.isIrradiated(t)) continue;
          const d = Phaser.Math.Distance.Between(at.x, at.y, t.x, t.y);
          if (d > TURRET_RANGE * (aggro ? 2 : 1) || d >= bestD) continue;
          best = t;
          bestD = d;
        }
        tr.live = !!best;
        if (!best) continue;
        const want = Math.atan2(best.y - at.y, best.x - at.x);
        tr.ang = Phaser.Math.Angle.RotateTo(tr.ang, want, 9 * (delta / 1000));
        if (this.now < tr.nextAt) continue;
        tr.nextAt = this.now + TURRET_GAP;
        tr.recoil = 1;
        const mx = at.x + Math.cos(tr.ang) * 20;
        const my = at.y + Math.sin(tr.ang) * 20;
        this.fx(owner).pistolShot(mx, my, best.x + (Math.random() - 0.5) * 8, best.y + (Math.random() - 0.5) * 8);
        best.takeDamage(TURRET_DAMAGE);
        this.api.spawnHitFlash(best.x, best.y, this.col(owner)(RAD.neon));
        Sfx.playAt('musket', at.x, { rate: 2.1, volume: 0.35 });
      }
    }
  }

  /** F+ Mutation: the dose comes off, and the body comes out 25% bigger for 15 seconds. */
  private mutate(victim: Fighter, by: Owner): void {
    if (!this.alive(victim)) return;
    this.cleanse(victim);
    victim.radMutatedUntil = Math.max(victim.radMutatedUntil, Date.now() + MUTATION_MS);
    this.record(by, 'mutations');
    this.fx(by).mutate(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 66, '🧬 MUTATED', this.hex(RAD.neonLit));
    Sfx.playAt('status-poison', victim.x, { rate: 0.7, volume: 0.85 });
  }

  /** Q+: caught by the drop while already carrying a dose. */
  private overRadiate(victim: Fighter, by: Owner): void {
    if (!this.alive(victim)) return;
    victim.overRadiatedUntil = Math.max(victim.overRadiatedUntil, Date.now() + OVER_MS);
    this.fx(by).overRadiate(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 78, '☢☢ OVER-RADIATED', this.hex(RAD.hot));
  }

  /** Q+: the drop splashes fallout across the floor in a fixed pattern round the middle. */
  private spillPuddles(owner: Owner): void {
    const w = this.api.width;
    const h = this.api.height;
    PUDDLE_SPOTS.forEach(([fx, fy, r], i) => {
      const x = Phaser.Math.Clamp(w * fx, this.left + r * 0.5, this.right - r * 0.5);
      const y = Phaser.Math.Clamp(h * fy, this.top + r * 0.5, this.bottom - r * 0.5);
      this.puddles.push({ owner, x, y, r, until: this.now + PUDDLE_MS, seed: i * 7.31 + 1.7 });
      this.fx(owner).puddleSplash(x, y, r);
    });
  }

  private updatePuddles(): void {
    this.puddles = this.puddles.filter((pd) => this.now < pd.until);
    if (!this.puddles.length) { this.puddleTickAt.clear(); return; }
    for (const pd of this.puddles) {
      for (const t of this.targetsOf(pd.owner)) {
        const d = Phaser.Math.Distance.Between(pd.x, pd.y, t.x, t.y);
        if (d > pd.r + this.swell(t)) continue;
        if (this.now < (this.puddleTickAt.get(t) ?? 0)) continue;
        this.puddleTickAt.set(t, this.now + PUDDLE_TICK_MS);
        t.takeDamage(PUDDLE_DAMAGE);
        this.irradiate(t, pd.owner, PUDDLE_DOSE_MS, this.isIrradiated(t));
      }
    }
  }

  /**
   * Turn the two upgrade timers on every fighter into what they do. Read off the generic fields
   * rather than kept in the kit, so a timer mirrored over the network works on the victim's sim
   * exactly like one this kit wrote.
   */
  private updateAfflictions(): void {
    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!f) continue;
      const want = f.active && wall < f.radMutatedUntil;
      if (want && !this.grown.has(f)) {
        f.hitboxMult *= MUTATION_HITBOX;
        f.applySizeMult();
        this.grown.add(f);
      } else if (!want && this.grown.has(f)) {
        f.hitboxMult /= MUTATION_HITBOX;
        if (f.active) f.applySizeMult();
        this.grown.delete(f);
      }
      f.radiationIncomingMult = wall < f.overRadiatedUntil ? OVER_INCOMING : 1;
    }
  }

  // ── Mastery ────────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are Radiation. */
  private masteryOn(owner: Owner): boolean {
    return this.isRadiation(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Online, the npc is somebody else's sim: its dummy is a picture, its HP arrives by relay. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  /** Which slot the Test Dummy was dropped on, or null. */
  private dummySlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const k of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(k) : this.api.npcMasteryBindFor(k);
      if (bind === DUMMY_ID) return k;
    }
    return null;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's, not the bot's — and not
   * gated on the mastery being on, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && this.isRadiation('player')) this.api.recordMasteryStat(key, amount);
  }

  private dummyStanding(owner: Owner): boolean {
    const d = this.side(owner).dummy;
    return !!d && d.hp > 0;
  }

  /** Where the dummy is right now — partway along its throw while it is still in the air. */
  private dummyPos(d: TestDummy): { x: number; y: number; lift: number; u: number } {
    const u = Phaser.Math.Clamp((this.now - d.thrownAt) / DUMMY_THROW_MS, 0, 1);
    return {
      x: Phaser.Math.Linear(d.fromX, d.x, u),
      y: Phaser.Math.Linear(d.fromY, d.y, u),
      lift: Math.sin(u * Math.PI) * 46,
      u,
    };
  }

  /**
   * Test Dummy, from the bound key, the bot, or an online peer's replay. It never goes through
   * `castAbility` (the enhancement is not in the element's ability list), so the refusals that
   * gate every other key are repeated here.
   */
  private tryTestDummy(owner: Owner, tx: number, ty: number): boolean {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return false;
    if (!this.isReplica(owner)) {
      const wall = Date.now();
      if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil || wall < f.stunnedUntil) return false;
      if (this.stunned.has(f)) return false;
      if (this.now - s.dummyAt < DUMMY_COOLDOWN_MS) return false;
    }
    this.ensureLayers();
    this.ensureAvatars();
    this.dropDummy(owner, true);
    s.dummyAt = this.now;

    const a = Math.atan2(ty - f.y, tx - f.x);
    const reach = Math.min(DUMMY_RANGE, Math.hypot(tx - f.x, ty - f.y));
    const x = Phaser.Math.Clamp(f.x + Math.cos(a) * reach, this.left + 14, this.right - 14);
    const y = Phaser.Math.Clamp(f.y + Math.sin(a) * reach, this.top + 26, this.bottom - 20);
    s.dummy = {
      owner, fromX: f.x, fromY: f.y, x, y,
      thrownAt: this.now, landsAt: this.now + DUMMY_THROW_MS, landed: false,
      hp: DUMMY_HP, until: this.now + DUMMY_MS, hit: 0, seed: Math.random() * 999, sentHp: DUMMY_HP,
    };
    // A replica's hits are decided on its owner's machine, so only a real side claims the slot.
    if (!this.isReplica(owner)) this.installDummyAbsorber(owner);
    this.decoys[owner] = null;

    this.avatar(owner)?.play('punch', a, 320);
    this.avatar(owner)?.ping?.();
    this.api.showFloatingText(f.x, f.y - 52, '🎯 TEST DUMMY', this.hex(RAD.hazard));
    Sfx.playAt('whoosh', f.x, { rate: 0.8, volume: 0.7 });
    if (owner === 'player') this.api.broadcast(DUMMY_ID);
    return true;
  }

  /**
   * Claim the fighter's absorber slot for the dummy, chained exactly like the bunker's: while
   * the dummy stands every hit is handed to it, and once it is down the hit falls through to
   * whatever held the slot before.
   */
  private installDummyAbsorber(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || s.dummyAbsorber) return;
    const prev = f.damageAbsorber;
    const mine = (amount: number): boolean => {
      if (this.dummyStanding(owner)) {
        this.damageDummy(owner, amount);
        return true;
      }
      return prev ? prev(amount) : false;
    };
    s.dummyPrevAbsorber = prev;
    s.dummyAbsorber = mine;
    f.damageAbsorber = mine;
  }

  private damageDummy(owner: Owner, amount: number): void {
    const d = this.side(owner).dummy;
    if (!d || d.hp <= 0) return;
    const dmg = Math.max(0, amount);
    d.hp -= dmg;
    d.hit = 1;
    const p = this.dummyPos(d);
    if (dmg >= 1) this.api.showFloatingText(p.x, p.y - p.lift - 34, `🎯 ${Math.round(dmg)}`, this.hex(RAD.hazard));
    Sfx.playAt('hit-light', p.x, { rate: 1.3, volume: 0.6 });
    if (d.hp <= 0) this.breakDummy(owner);
  }

  private breakDummy(owner: Owner): void {
    const d = this.side(owner).dummy;
    if (!d) return;
    const p = this.dummyPos(d);
    this.fx(owner).dummyBreak(p.x, p.y - p.lift);
    this.api.showFloatingText(p.x, p.y - p.lift - 46, '✖ DUMMY DOWN', this.hex(RAD.hazard));
    Sfx.playAt('explosion-small', p.x, { rate: 1.4, volume: 0.7 });
    if (owner === 'player') this.api.broadcast('rad-dummy-down');
    this.dropDummy(owner, true);
  }

  /** Take the dummy away and hand the absorber slot back if nobody has claimed it since. */
  private dropDummy(owner: Owner, silent = false): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.dummyAbsorber && f && f.damageAbsorber === s.dummyAbsorber) f.damageAbsorber = s.dummyPrevAbsorber;
    s.dummyAbsorber = null;
    s.dummyPrevAbsorber = null;
    const d = s.dummy;
    s.dummy = null;
    this.decoys[owner] = null;
    if (!d || silent) return;
    const p = this.dummyPos(d);
    this.fx(owner).dummyBreak(p.x, p.y - p.lift);
    Sfx.playAt('status-expire', p.x, { rate: 0.9, volume: 0.6 });
  }

  /**
   * Per frame: land, expire, and stop enemy shots that hit the dummy. A shot it stops is a hit on
   * its owner — handed to `takeDamage`, which the link then pours into the dummy (and which, on an
   * online replica, is forwarded to the owner's machine like any other hit).
   */
  private updateDummies(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const d = s.dummy;
      if (!d) continue;
      d.hit = Math.max(0, d.hit - delta / 240);
      const self = this.fighter(owner);
      if (!this.alive(self) || this.now >= d.until) { this.dropDummy(owner); continue; }
      if (this.now < d.landsAt) continue;
      if (!d.landed) {
        d.landed = true;
        this.fx(owner).dummyLand(d.x, d.y);
        Sfx.playAt('stone-rise', d.x, { rate: 1.5, volume: 0.5 });
      }

      // Online, the owner tells the peer what the dummy has left.
      if (owner === 'player' && this.api.isOnline) {
        const hp = Math.max(0, Math.ceil(d.hp));
        if (hp !== d.sentHp) {
          d.sentHp = hp;
          this.api.broadcast(`rad-dummy-hp:${hp}:${this.dummySeq++}`);
        }
      }

      // In co-op the npc slot is an ally, whose dummy has no business stopping our shots.
      if (owner === 'npc' && this.api.isInvasion) continue;
      const cy = d.y - DUMMY_LIFT_Y;
      const group = this.api.projectiles;
      if (group) {
        for (const go of group.getChildren()) {
          const p = go as Projectile;
          if (!p.active) continue;
          if (p.isFromPlayer === (owner === 'player')) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, d.x, cy) > DUMMY_HIT_R + 6) continue;
          p.setActive(false).setVisible(false);
          this.fx(owner).bunkerHit(p.x, p.y, Math.atan2(p.y - cy, p.x - d.x));
          self.takeDamage(p.damage ?? 0);
          if (!s.dummy) break;
        }
      }
      if (owner === 'player') {
        for (let i = 0; i < 6 && s.dummy && this.api.blockHuskShot(d.x, cy, DUMMY_HIT_R + 6); i++) {
          this.fx(owner).bunkerHit(d.x, cy - DUMMY_HIT_R, -Math.PI / 2);
          this.damageDummy(owner, DUMMY_HUSK_SHOT);
        }
      }
    }
  }

  /** The link and the dummy, on the floor layer under the fighters. */
  private paintDummies(g: Phaser.GameObjects.Graphics): void {
    for (const owner of BOTH) {
      const d = this.side(owner).dummy;
      if (!d) continue;
      const f = this.fighter(owner);
      const tint = this.col(owner);
      const p = this.dummyPos(d);
      const fade = Phaser.Math.Clamp((d.until - this.now) / 400, 0, 1);
      if (this.alive(f)) {
        dummyLink(g, tint, f.x, f.y + 4, p.x, p.y - p.lift - 2, 0.85 * fade * f.alpha, this.vizT, d.hit);
      }
      testDummy(g, tint, p.x, p.y, 0.98 * fade, this.vizT, {
        hp: Phaser.Math.Clamp(d.hp / DUMMY_HP, 0, 1),
        hit: d.hit,
        lift: p.lift,
        tumble: p.u < 1 ? p.u * TAU * 2 : 0,
        seed: d.seed,
      });
      if (p.u >= 1) {
        doseCells(g, tint, p.x, p.y - 34, Math.ceil(Math.max(0, d.hp) / DUMMY_CELL_HP),
          DUMMY_HP / DUMMY_CELL_HP, 0.4 + d.hit * 0.6, this.vizT);
      }
    }
  }

  /**
   * What an AI chases instead of this side's fighter while its dummy stands: the real fighter,
   * standing where the dummy is. Reads of `x`, `y` and `body.velocity` answer for the dummy; a
   * `takeDamage` lands on the dummy; every write is swallowed, so a slow or a bleed meant for
   * the dummy goes nowhere. Everything else still reads through. Same shape as Illusion's Guise.
   */
  private decoyOf(owner: Owner): Fighter | null {
    const d = this.side(owner).dummy;
    if (!d || d.hp <= 0) return null;
    const real = this.fighter(owner);
    if (!real) return null;
    const cached = this.decoys[owner];
    if (cached) return cached;
    const kit = this;
    const realBody = real.body as Phaser.Physics.Arcade.Body;
    const body = new Proxy(realBody, {
      get(t, k) {
        if (k === 'velocity') return new Phaser.Math.Vector2(0, 0);
        const v = Reflect.get(t, k, t);
        return typeof v === 'function' ? () => undefined : v;
      },
      set() { return true; },
    });
    const decoy = new Proxy(real, {
      get(t, k) {
        const cur = kit.side(owner).dummy;
        if (cur && k === 'x') return kit.dummyPos(cur).x;
        if (cur && k === 'y') return kit.dummyPos(cur).y - DUMMY_LIFT_Y;
        if (k === 'body') return body;
        if (k === 'takeDamage') return (amount: number) => kit.damageDummy(owner, amount);
        return Reflect.get(t, k, t);
      },
      set() { return true; },
    });
    this.decoys[owner] = decoy;
    return decoy;
  }

  /**
   * The bot's Test Dummy, fired by the kit. Three reasons, the first two the kit's own synergies:
   * its airdrop is falling with no bunker round it (the bunker is the slot it gave up — the dummy
   * takes the self-hit instead), the flare gun is out and five rounds have to be placed from
   * close, or it is hurt and pressed. Thrown between itself and the target, where shots land.
   */
  private updateNpcMastery(): void {
    if (this.api.isOnline || this.api.isInvasion || !this.dummySlot('npc')) return;
    const n = this.api.npc;
    const p = this.api.player;
    const s = this.sides.npc;
    if (!this.alive(n) || !this.alive(p) || s.dummy || s.barrage) return;
    if (this.now - s.dummyAt < DUMMY_COOLDOWN_MS) return;
    const dist = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    const drop = this.airdrop?.owner === 'npc' && !this.sheltered('npc');
    const flaring = !!s.flares && dist < 460;
    const pressed = n.hp / Math.max(1, n.maxHp) < NPC_DUMMY_HURT && dist < NPC_DUMMY_HURT_RANGE;
    if (!drop && !flaring && !pressed) return;
    this.tryTestDummy('npc', n.x + (p.x - n.x) * 0.45, n.y + (p.y - n.y) * 0.45);
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isRadiation('player');
    const npcIs = this.isRadiation('npc');
    const anyState = this.rounds.length || this.irradiated.size || this.stunned.size || this.airdrop
      || this.sides.player.bunker || this.sides.npc.bunker || this.puddles.length || this.grown.size
      || this.sides.player.dummy || this.sides.npc.dummy;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    this.updateFlick(delta);
    this.updateRounds(delta);
    this.updateBarrage(delta);
    this.updateIrradiated();
    this.updateStuns();
    this.updateBunkers(delta);
    this.updateTurrets(delta);
    this.updateFlareWindow();
    this.updateAirdrop();
    this.updatePuddles();
    this.updateAfflictions();
    this.updateDummies(delta);
    this.updateNpcMastery();

    this.paintGround();
    this.paintAir();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    for (const pd of this.puddles) {
      const fade = Phaser.Math.Clamp((pd.until - this.now) / 800, 0, 1);
      falloutPuddle(g, this.col(pd.owner), pd.x, pd.y, pd.r, 0.9 * fade, this.vizT, pd.seed);
    }

    for (const owner of BOTH) {
      const bk = this.side(owner).bunker;
      if (!bk) continue;
      const fade = Phaser.Math.Clamp((bk.until - this.now) / 500, 0, 1);
      const nest = {
        hp: bk.hp / BUNKER_HP,
        built: Phaser.Math.Clamp((this.now - bk.builtAt) / BUNKER_BUILD_MS, 0, 1),
        occupied: this.sheltered(owner),
        hit: bk.hit,
        seed: bk.seed,
      };
      if (this.sniper(owner)) sniperNest(g, bk.x, bk.y, BUNKER_R, 0.95 * fade, this.vizT, nest);
      else falloutBunker(g, this.col(owner), bk.x, bk.y, BUNKER_R, 0.95 * fade, this.vizT, nest);
      const built = Phaser.Math.Clamp((this.now - bk.builtAt) / BUNKER_BUILD_MS, 0, 1);
      for (const tr of bk.turrets ?? []) {
        const at = this.turretPos(bk, tr);
        bunkerTurret(g, this.col(owner), at.x, at.y, tr.ang, 0.95 * fade * built, this.vizT,
          { recoil: tr.recoil, live: tr.live });
      }
    }

    this.paintDummies(g);

    const a = this.airdrop;
    if (a) {
      const k = Phaser.Math.Clamp(1 - (a.landsAt - this.now) / AIRDROP_TELL_MS, 0, 1);
      const r = Math.max(this.api.width, this.api.height) * 0.62;
      dropFootprint(g, this.col(a.owner), a.x, a.y, r, 0.95, k, this.vizT);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Mastery — X-Ray Vision: every enemy outlined, seen or not ──
    if (this.masteryOn('player')) {
      let i = 0;
      for (const t of this.targetsOf('player')) {
        if (!this.api.isTargetable(t)) continue;
        xrayOutline(g, this.pcol, t.x, t.y, BODY_R + this.swell(t) + 4, 0.9, this.vizT, i++ * 2.7);
      }
    }

    // ── Barrage cones and their lock ──
    for (const owner of BOTH) {
      const b = this.side(owner).barrage;
      if (!b || (b.shotsLeft > 0 && b.firingSince <= 0)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      const lock = this.lockProgress(b);
      if (this.sniper(owner)) {
        scopeCone(g, f.x, f.y, b.ang, this.coneHalf(b), BARRAGE_RANGE, 0.9, this.vizT, { lock, locked: !!b.victim });
        if (b.victim && this.alive(b.victim)) scopeReticle(g, b.victim.x, b.victim.y, lock, 0.95, this.vizT);
        continue;
      }
      barrageCone(g, tint, f.x, f.y, b.ang, this.coneHalf(b), BARRAGE_RANGE, 0.9, this.vizT,
        { lock, locked: !!b.victim });
      if (b.victim && this.alive(b.victim)) lockReticle(g, tint, b.victim.x, b.victim.y, lock, 0.95, this.vizT);
    }

    // ── Rounds in the air ──
    for (const r of this.rounds) {
      const tint = this.col(r.owner);
      if (this.sniper(r.owner)) {
        if (r.kind === 'flare') jarRound(g, r.x, r.y, r.ang, 1, this.vizT);
        else sniperRound(g, r.x, r.y, r.ang, 1, !!r.spiked);
        continue;
      }
      if (r.kind === 'flare') flareRound(g, tint, r.x, r.y, r.ang, 1, this.vizT);
      else geigerTracer(g, tint, r.x, r.y, r.ang + this.vizT * 9, 1, { lamp: 0.5, spiked: r.spiked });
    }

    // ── Tracers clamped to a body, and the confirm pips over its head ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      for (const [v, n] of s.stuck) {
        if (!this.alive(v)) continue;
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(this.vizT * (3 + n * 2.6)));
        for (let i = 0; i < n; i++) {
          const a = this.vizT * 1.6 + (i / TRACERS_TO_CONFIRM) * TAU;
          if (this.sniper(owner)) {
            laserDot(g, v.x + Math.cos(a) * 20, v.y + Math.sin(a) * 20 - 2, 0.95, blink);
            continue;
          }
          geigerTracer(g, tint, v.x + Math.cos(a) * 20, v.y + Math.sin(a) * 20 - 2,
            a + Math.PI / 2, 0.95, { lamp: blink, legs: true, scale: 0.85 });
        }
        this.pips(g, tint, v.x, v.y - 46, n, TRACERS_TO_CONFIRM, blink);
      }
    }

    // ── Flare tallies ──
    for (const owner of BOTH) {
      const fl = this.side(owner).flares;
      if (!fl) continue;
      const tint = this.col(owner);
      for (const [v, n] of fl.hits) {
        if (!this.alive(v)) continue;
        this.pips(g, tint, v.x, v.y - 54, n, FLARE_AMMO, 0.9);
      }
      // The magazine, over the shooter's own head.
      const f = this.fighter(owner);
      if (this.alive(f)) this.pips(g, tint, f.x, f.y - 44, fl.ammo, FLARE_AMMO, 0.85);
    }

    // ── The rod, mid-swing ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.swing) continue;
      const t = (this.now - s.swing.start) / ROD_SWING_MS;
      if (t >= 1) { s.swing = null; continue; }
      const f = this.fighter(owner);
      const ox = this.alive(f) ? f.x : s.swing.x;
      const oy = this.alive(f) ? f.y : s.swing.y;
      // Brought down hard across the strike, easing out at the far edge of the arc.
      const e = 1 - (1 - t) * (1 - t);
      const a = s.swing.ang - ROD_ARC + e * ROD_ARC * 2;
      const tint = this.col(owner);
      if (this.sniper(owner)) {
        kukriSwing(g, ox, oy, s.swing.ang - ROD_ARC, a, ROD_REACH, t, s.swing.hot);
        continue;
      }
      // A faint trail of where the rod has been this swing.
      g.lineStyle(10, tint(s.swing.hot ? RAD.hazard : RAD.neon), 0.18 * (1 - t));
      g.beginPath();
      g.arc(ox, oy, ROD_REACH * 0.85, s.swing.ang - ROD_ARC, a, false);
      g.strokePath();
      uraniumRod(g, tint, ox + Math.cos(a) * 14, oy + Math.sin(a) * 14,
        ox + Math.cos(a) * ROD_REACH, oy + Math.sin(a) * ROD_REACH, 1 - t * 0.3, this.vizT,
        { heat: s.swing.hot ? 1 : 0.3 });
    }

    // ── Irradiated markers ──
    for (const [v, d] of this.irradiated) {
      if (!this.alive(v)) continue;
      const left = Phaser.Math.Clamp((d.until - this.now) / Math.max(1, d.full), 0, 1);
      const tint = this.col(d.by);
      if (this.sniper(d.by)) {
        jarateMark(g, v.x, v.y, left, this.vizT, 0.95, 0.37);
        continue;
      }
      geigerDial(g, tint, v.x, v.y - 27, 11, left, this.vizT + v.x * 0.01, 0.95);
    }
  }

  /** A row of dose cells — the one counter shape the element uses everywhere. */
  private pips(
    g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
    x: number, y: number, filled: number, total: number, glow: number,
  ): void {
    doseCells(g, tint, x, y, filled, total, glow, this.vizT);
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      av.setMastered(this.masteryOn(owner));
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      const b = s.barrage;
      av.setFacing(b && (!b.shotsLeft || b.firingSince > 0) ? b.ang : Math.atan2(s.aimY - f.y, s.aimX - f.x));
      // The suit runs warm at rest and hot while a lock is closing.
      av.setDose?.(b ? 0.5 + this.lockProgress(b) * 0.5 : 0.5);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const p = this.api.player;
    const s = this.sides.player;

    const dose = this.irradiated.get(p);
    this.api.setStatusIndicator('radiation-irradiated', dose ? {
      name: this.sniper(dose.by) ? 'Jarate' : 'Irradiated', emoji: this.sniper(dose.by) ? '🫙' : '☢️',
      color: this.col(dose.by)(RAD.neon), priority: 5,
      description: 'Every point of healing aimed at you from any source lands as damage instead. Radiation\'s Barrage hits you for 8 a round instead of 5, and its Rod Baton stuns you.',
      until: dose.until,
    } : null);

    const b = s.barrage;
    this.api.setStatusIndicator('radiation-barrage', playerIs && b && b.firingSince > 0 ? {
      name: 'Trigger Happy', emoji: '🎯', color: RAD.hazard, priority: 141,
      description: `Firing until they leave the cone — and it keeps closing, down to ${TRIGGER_MIN_DEG}°.`,
      count: b.fired, suffix: ' rds',
    } : playerIs && b && !b.shotsLeft ? {
      name: 'Barrage', emoji: '🎯', color: RAD.hazard, priority: 141,
      description: b.victim
        ? `Locking. Keep them inside the cone while it closes from ${BARRAGE_OPEN_DEG}° to ${BARRAGE_CLOSED_DEG}° — if they get out, the lock is lost.`
        : 'The cone is open. Put an enemy inside it to start the lock.',
      count: Math.round(this.lockProgress(b) * 100), suffix: '%',
    } : null);

    const bk = s.bunker;
    this.api.setStatusIndicator('radiation-bunker', playerIs && bk ? {
      name: 'Fallout Bunker', emoji: '🛡️', color: RAD.neonLit, priority: 140,
      description: this.sheltered('player')
        ? 'You are inside. Nothing can hurt you — every hit lands on the bunker instead. Enemy shots stop in the wall and enemies cannot get in.'
        : 'Your bunker is standing. Get back inside it to be safe.',
      count: Math.max(0, Math.ceil(bk.hp)), suffix: ' HP',
      until: bk.until,
    } : null);

    const dm = s.dummy;
    this.api.setStatusIndicator('radiation-dummy', playerIs && dm && dm.hp > 0 ? {
      name: 'Test Dummy', emoji: '🎯', color: RAD.hazard, priority: 143,
      description: 'Your test dummy is standing. You cannot be hurt — every hit runs down the link into it instead. When it breaks, you are back on the line.',
      count: Math.max(0, Math.ceil(dm.hp)), suffix: ' HP',
      until: dm.until,
    } : null);

    const fl = s.flares;
    this.api.setStatusIndicator('radiation-flares', playerIs && fl ? {
      name: 'Extermination', emoji: '🔫', color: RAD.neon, priority: 142,
      description: 'The flare gun is out. Every one of these rounds has to land on the same enemy — five on one body calls the airdrop, and anything else calls nothing at all.',
      until: fl.expiresAt, count: fl.ammo,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** A full stop for a body the rod has stunned. */
  getPlayerSpeedMult(): number {
    const p = this.api.player;
    if (this.stunned.has(p)) return 0;
    // Online, an opponent's over-radiation already reaches us through the relayed speed (`spd`),
    // so applying the mirrored timer here too would slow us twice.
    return this.api.isOnline ? 1 : p.overRadiatedSpeedMult();
  }

  getNpcSpeedMult(): number {
    const n = this.api.npc;
    if (this.stunned.has(n)) return 0;
    return n.overRadiatedSpeedMult();
  }

  /** Tracers already on the bot's target — the AI's cue for how badly a miss would hurt. */
  tracersOn(owner: Owner): number {
    const t = this.nearestTarget(owner);
    return t ? (this.side(owner).stuck.get(t) ?? 0) : 0;
  }

  /** True while that side has the flare gun out and rounds left to place. */
  flaresOut(owner: Owner): boolean {
    return !!this.side(owner).flares;
  }

  /** True while that side's Barrage cone is open or its burst is still firing. */
  isBarraging(owner: Owner): boolean {
    return !!this.side(owner).barrage;
  }

  /**
   * Whether the bot's target is already carrying a dose. That is the whole of two synergies: the
   * rod stops dosing and starts stunning, and Barrage's rounds go from 5 to 8.
   */
  targetIrradiated(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    return !!t && this.isIrradiated(t);
  }

  /** Whether the bot's target is stunned — the moment a Barrage lock cannot be walked out of. */
  targetStunned(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    return !!t && this.stunned.has(t);
  }

  /**
   * The airdrop synergy: that side's own airdrop is falling and they are not inside a bunker.
   * A bunker standing round them when it lands takes the self-hit for them.
   */
  needsCover(owner: Owner): boolean {
    return !!this.airdrop && this.airdrop.owner === owner && !this.sheltered(owner) && !this.dummyStanding(owner);
  }

  /** True while that side is inside its own standing bunker. */
  isSheltered(owner: Owner): boolean {
    return this.sheltered(owner);
  }

  /** Click+ Flick Shot: that side turned its back within the window, so a tracer now is barbed. */
  flickReady(owner: Owner): boolean {
    return this.up(owner, 'click') && !this.side(owner).flares && this.now - this.side(owner).awayAt <= FLICK_WINDOW_MS;
  }

  /**
   * Whether that side has something standing that only pays out on a dosed target and its target
   * is clean: R+ turrets with the target in their reach, or a Q+ drop falling (an irradiated
   * target becomes over-radiated).
   */
  wantsDose(owner: Owner): boolean {
    const t = this.nearestTarget(owner);
    if (!t || this.isIrradiated(t)) return false;
    if (this.up(owner, 'q') && this.airdrop?.owner === owner) return true;
    const bk = this.side(owner).bunker;
    return !!bk?.turrets && Phaser.Math.Distance.Between(bk.x, bk.y, t.x, t.y) < TURRET_RANGE + 80;
  }

  /**
   * F+ Mutation strips the dose it cashes in. That is the wrong trade while a Q+ drop is falling
   * (the dose is what over-radiates them) or R+ turrets are standing (the dose is what they shoot).
   */
  keepDose(owner: Owner): boolean {
    if (!this.up(owner, 'f')) return false;
    if (this.up(owner, 'q') && this.airdrop?.owner === owner) return true;
    return !!this.side(owner).bunker?.turrets;
  }

  // ── Mastery accessors ──────────────────────────────────────────────────

  /**
   * Online: one of the opponent's presses that never touches a cooldown — the dummy itself, and
   * what their machine says it has left.
   */
  replayNet(id: string, tx: number, ty: number): void {
    if (id === DUMMY_ID) { this.tryTestDummy('npc', tx, ty); return; }
    if (id === 'rad-dummy-down') { this.breakDummy('npc'); return; }
    if (id.startsWith('rad-dummy-hp:')) {
      const d = this.sides.npc.dummy;
      const hp = Number(id.split(':')[1]);
      if (d && Number.isFinite(hp) && hp < d.hp) { d.hp = hp; d.hit = 1; }
    }
  }

  /** What the npc AI should chase this frame instead of the player: their dummy, or null. */
  npcDecoyTarget(): Fighter | null { return this.decoyOf('player'); }

  /** Invasion: the husks' view of who is in the room — the player swapped for their dummy. */
  huskTargetsView(list: Fighter[]): Fighter[] {
    const decoy = this.decoyOf('player');
    if (!decoy) return list;
    return list.map((f) => (f === this.api.player ? decoy : f));
  }

  /** Invasion: a husk hit that was aimed at the decoy. True when the dummy took it. */
  absorbDecoyHit(target: Fighter, amount: number): boolean {
    if (!this.dummyStanding('player') || target !== this.decoys.player) return false;
    this.damageDummy('player', amount);
    return true;
  }

  /**
   * ArenaScene's AoE chokepoint: a blast owned by `owner` that reaches the *other* side's dummy
   * is a hit on that side, through the link — unless the blast already reached their body, which
   * the scene resolves itself (and the link then carries anyway).
   */
  notifyAoe(cx: number, cy: number, radius: number, damage: number, owner: Owner): void {
    const victim: Owner = owner === 'player' ? 'npc' : 'player';
    if (victim === 'npc' && this.api.isInvasion) return;
    const d = this.side(victim).dummy;
    if (!d || d.hp <= 0 || this.now < d.landsAt) return;
    if (Phaser.Math.Distance.Between(cx, cy, d.x, d.y - DUMMY_LIFT_Y) > radius + DUMMY_HIT_R) return;
    const f = this.fighter(victim);
    if (!this.alive(f) || Phaser.Math.Distance.Between(cx, cy, f.x, f.y) <= radius) return;
    f.takeDamage(damage);
  }

  /** The mastery card. */
  getDummyCooldownRatio(): number {
    return Phaser.Math.Clamp((this.now - this.sides.player.dummyAt) / DUMMY_COOLDOWN_MS, 0, 1);
  }

  /** Which slot the bot gave up for the Test Dummy, so its rotation leaves that key alone. */
  npcDummySlot(): 'r' | 'f' | 'q' | undefined {
    return this.dummySlot('npc') ?? undefined;
  }

  /**
   * Whether the bot's dummy is ready or already standing — its cover for the airdrop when the
   * dummy took the bunker's slot, so the ultimate is only drawn with one of the two in hand.
   */
  npcDummyCoverReady(): boolean {
    const s = this.sides.npc;
    return !!s.dummy || this.now - s.dummyAt >= DUMMY_COOLDOWN_MS;
  }

  /** X-Ray Vision: that side sees through stealth, so an invisible target is not invisible to it. */
  seesInvisible(owner: Owner): boolean {
    return this.masteryOn(owner);
  }
}
