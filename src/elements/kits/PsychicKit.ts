import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { NetPsychicMsg } from '../../network/NetworkManager';
import { Sfx } from '../../audio';
import {
  PSY, PsychicAvatar, PsychicColorFn, PsychicFx, comaSwirl, destinyGhost, focusMandala, focusMark,
  foresightPath, keyChip, lashPoints, migraineMark, mindSigil, psiWhip, snareRune, stressCracks,
  thirdEye,
} from './PsychicVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Opened Eyes (passive) ────────────────────────────────────────────────────
/**
 * How far ahead the psychic sees, and — because the two have to be the same number for any of
 * this to be honest — how long every ability cast at him is held before it resolves.
 */
const FORESIGHT_MS = 2000;
/** Chips shown over an enemy's head. The spec asks for three; the queue itself is unbounded. */
const CHIPS_SHOWN = 3;
/** Steps in the projected route. 20 over two seconds is a marker every 100 ms. */
const PATH_STEPS = 20;
/** Online: how often the victim's own sim tells the psychic what is sitting in its queue. */
const QUEUE_RELAY_MS = 160;

// ── Stress ───────────────────────────────────────────────────────────────────
const STRESS_HOLD_MS = 10_000;
/** What counts as "a lot" for the size of the crack art and the burst. Not a cap. */
const STRESS_FULL = 80;

// ── Headache (Click) ─────────────────────────────────────────────────────────
const WHIP_DAMAGE = 12;
const WHIP_STRESS = 5;
const WHIP_TIP_BONUS = 5;
const WHIP_LEN = 196;
/**
 * How far off the cord still counts, *on top of* the victim's own body radius — the cord is a
 * cord, not a point, and a lash laid across someone's shoulder should land. Checked against the
 * segments rather than the 18 sample points so there are no cold gaps between them.
 */
const WHIP_HIT_R = 18;
/** Fallback body radius for a target with no physics body. Matches `Fighter.applySizeMult`. */
const WHIP_BODY_R = 22;
/** Past this far along the lash counts as the tip. The last ~45 px of a 196 px whip. */
const WHIP_TIP_FRAC = 0.77;
const WHIP_ANIM_MS = 260;
/** Where in the animation the lash is at full extension — also when the hit is resolved. */
const WHIP_CRACK_T = 0.55;

// ── Dodge Destiny (R) ────────────────────────────────────────────────────────
const DODGE_MS = 1250;

// ── Migraine (F) ─────────────────────────────────────────────────────────────
const MIGRAINE_MS = 3000;
const MIGRAINE_STRESS_PER_S = 10;
/** How long the charge sits under its mark before it goes off. */
const MIGRAINE_FUSE_MS = 2500;
/** How far the detonation reaches. Matches Fire's Pressure Bomb, which it is modelled on. */
const MIGRAINE_RADIUS = 100;
/** Stress from being caught by the blast itself, on top of the per-second ticks. */
const MIGRAINE_HIT_STRESS = 10;

// ── Coma (Q) ─────────────────────────────────────────────────────────────────
const COMA_MULT = 1.5;
/** Every this many points of detonated stress buys one second face down. */
const COMA_PER_STRESS = 20;
/** How much of a hit lands as damage while they are under; the rest is banked as stress. */
const COMA_SPLIT = 0.5;

// ── Whip Snap (Click+) ───────────────────────────────────────────────────────
/**
 * How far the end of a route has to be from the body before there is anything to aim at. The
 * same 24px the destiny ghost is drawn at, so what the player can hit is exactly what is painted.
 */
const SNAP_MIN_DIST = 24;
/** How close the cord has to pass to the ghost. Wider than a body: it is a spot, not a target. */
const SNAP_R = 26;
const SNAP_STRESS = 20;

// ── Ability Theft (E+) ───────────────────────────────────────────────────────
/** Taken off the thief's own ability in the slot they just robbed. */
const THEFT_REFUND_MS = 5000;

// ── Infinite Perspective (R+) ────────────────────────────────────────────────
/** Damage inside the window below that fires Dodge Destiny on its own. */
const PERSPECTIVE_DAMAGE = 50;
/** How long an incoming hit is remembered while adding up to that 50. */
const PERSPECTIVE_WINDOW_MS = 2000;

// ── Mind's Focus (F+) ────────────────────────────────────────────────────────
/** The longest the charge can be wound. It fires itself on reaching this rather than stalling. */
const FOCUS_MAX_MS = 5000;
/** Extra fuse bought per second held — 2.5s at a tap out to 6.5s fully wound. */
const FOCUS_FUSE_PER_S = 800;
/** Extra blast radius per second held — 100px out to 200px. */
const FOCUS_RADIUS_PER_S = 20;
/** Extra flat stress on the blast per second held. */
const FOCUS_STRESS_PER_S = 4;
/** Share of the pool they are *already* carrying added on the blast, per second held. */
const FOCUS_POOL_CUT_PER_S = 0.1;

// ── Cycle of Abuse (Q+) ──────────────────────────────────────────────────────
/** Taken off a comatose victim's pool every second and dealt to them as ordinary damage. */
const BLEED_PER_S = 3;
const BLEED_AOE_RADIUS = 120;
const BLEED_AOE_DAMAGE = 10;
/** How much of everything bled out is handed back to them when they wake up. */
const BLEED_RETURN = 0.25;

// ── Predictor's Snare (mastery passive) ──────────────────────────────────────
/** Stress put into whoever walks over a rune. */
const SNARE_STRESS = 15;
/** How close counts as standing on it, on top of the victim's own body radius. */
const SNARE_R = 20;
const SNARE_LIFE_MS = 14_000;
/** How long a fresh rune takes to settle. Nothing can be caught by a rune it is standing in. */
const SNARE_ARM_MS = 260;
/** Runes on the floor at once, per side. The oldest is rubbed out to make room. */
const SNARE_MAX = 6;

// ── Utter Focus (mastery ability) ────────────────────────────────────────────
const UTTER_ID = 'utter-focus';
const UTTER_MS = 8000;
/** What the two seconds of the passive becomes while his eyes are shut. */
const UTTER_FORESIGHT_MS = 5000;
const UTTER_STRESS_MULT = 1.2;
/** Taken off the window by every hit that lands on him while it runs. */
const UTTER_HIT_COST_MS = 500;
const UTTER_COOLDOWN_MS = 26_000;
/** Online: how often the psychic tells the victim how much of the window is left. */
const UTTER_RELAY_MS = 500;
/** Online: how often the victim tells the psychic where their held keys are taking them. */
const ROUTE_RELAY_MS = 160;
/** Points in a relayed route. Ten over five seconds is a marker every half second. */
const ROUTE_POINTS = 10;
/** A relayed route older than this is treated as gone, exactly as the queue mirror is. */
const ROUTE_STALE_MS = 700;
/** The bot reconsiders pressing it this often. */
const NPC_UTTER_CHECK_MS = 250;
/** …and only inside this range, where 1.2x on a lash is actually worth something. */
const NPC_UTTER_RANGE = 300;

// ── World objects ────────────────────────────────────────────────────────────

/** One ability sitting in a victim's delayed-cast queue. */
interface Queued {
  id: string;
  /** Legend on the chip — 'Click', 'E', 'R', 'F', 'Q'. */
  key: string;
  /** Ultimates get a gold chip and are worth spending Mind Control on. */
  big: boolean;
  /** Game-clock time at which it resolves. */
  at: number;
  fire: () => void;
}

interface Stress {
  amount: number;
  /** Game-clock time the pool goes off on its own. Every new point pushes it back. */
  releaseAt: number;
  by: Owner;
  seed: number;
}

interface Coma {
  until: number;
  by: Owner;
  /** Last seen `rawDamageTaken`, so the half of every hit we eat can be banked back. */
  lastRaw: number;
  /** Cycle of Abuse (Q+): game-clock time of the next point of stress coming out sideways. */
  nextBleedAt: number;
  /** Cycle of Abuse (Q+): everything bled so far, a quarter of which is waiting on the way out. */
  bled: number;
}

interface Migraine {
  until: number;
  by: Owner;
  nextTickAt: number;
}

/** A planted migraine, counting down to its detonation. */
interface Charge {
  x: number;
  y: number;
  /** Game-clock time it was put down, so the mark's fuse hand reads a wound charge correctly. */
  plantedAt: number;
  /** Game-clock time it goes off. */
  firesAt: number;
  by: Owner;
  /** How far it reaches. Mind's Focus (F+) buys this; without the upgrade it is always 100. */
  radius: number;
  /** Seconds of Mind's Focus wind-up baked into it. 0 for an ordinary tap. */
  charge: number;
}

/**
 * The whip, mid-crack. The hit is resolved the instant it is cast, so the origin is pinned
 * here rather than tracked to the moving hand — otherwise the line that was drawn and the line
 * that was tested would drift apart over the 260 ms the animation runs for.
 */
interface Lash {
  ox: number;
  oy: number;
  ang: number;
  start: number;
  tip: boolean;
}

/**
 * Predictor's Snare (mastery passive): a closed eye left on the floor where a dash landed.
 *
 * It is only ever planted on a spot the enemy's own thread said they were walking to, which is
 * why it needs no seeking behaviour of any kind — the trap and the prediction are the same thing.
 */
interface Snare {
  x: number;
  y: number;
  by: Owner;
  /** Game-clock time it fades on its own. */
  until: number;
  /** …and the time before which it cannot catch anybody, so a rune never trips on arrival. */
  armedAt: number;
  seed: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  lash: Lash | null;
  /** Game-clock expiry of Dodge Destiny. */
  dodgeUntil: number;
  /** Utter Focus (mastery): game-clock expiry of the window, or 0 when his eyes are open. */
  utterUntil: number;
  /** Game-clock time it was last cast. The card counts its own cooldown off this. */
  utterCastAt: number;
  /** Last seen `rawDamageTaken`, so every hit inside the window can shorten it. */
  utterRaw: number;
  /** Online: game-clock time of the last remaining-window heartbeat we sent. */
  utterRelayAt: number;
  /** The bot's next look at whether the window is worth opening. */
  npcUtterCheckAt: number;
  /** Mind's Focus (F+): game-clock time F went down, or 0 when nothing is being wound. */
  focusStart: number;
  /** Where the wind-up is currently pointed, so the preview ring and the plant agree. */
  focusX: number;
  focusY: number;
  /** Infinite Perspective (R+): recent hits, for the rolling total that trips it. */
  recent: { at: number; amt: number }[];
  /**
   * The `damageAbsorber` this kit installed, kept so it is only ever taken back off a body that
   * is still wearing ours — the slot is shared with Time's Remain and Air's wind dodge.
   */
  absorber: ((amount: number) => boolean) | null;
  /** Whatever was in that slot when we took it, chained under ours. */
  prevAbsorber: ((amount: number) => boolean) | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, lash: null, dodgeUntil: 0,
    // Readiness is measured against the absolute game clock, and the kit's *first* match runs
    // the constructor rather than `reset` — so a zero here would lock the ability out for the
    // first 26 seconds of it.
    utterUntil: 0, utterCastAt: -UTTER_COOLDOWN_MS, utterRaw: 0, utterRelayAt: 0,
    npcUtterCheckAt: 0,
    focusStart: 0, focusX: 0, focusY: 0, recent: [], absorber: null, prevAbsorber: null,
  };
}

/** What `NpcOpponent` exposes about its locomotion, for the route projection. */
interface MovementPlan {
  closing: boolean;
  range: number;
  strafe: number;
  speed: number;
  frozen: boolean;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PsychicArenaApi {
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
  /** Online PvP: the opponent is a real person, delaying their own casts on their own machine. */
  get isOnline(): boolean;
  /** Skins: maps a Psychic visual colour through that side's equipped skin. */
  psychicColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: the queue mirror, and the three things the psychic does to a body it doesn't own. */
  sendPsychicMsg(msg: NetPsychicMsg): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an E/R/F/Q slot this match. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Cumulative mastery counters. Written unconditionally; the adapter gates on the element. */
  recordMasteryStat(key: string, amount: number): void;
  /** …and the ratchets, for a requirement that is a single best instance rather than a total. */
  recordMasteryBest(key: string, value: number): void;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded tricks reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── PsychicKit ───────────────────────────────────────────────────────────────

/**
 * Psychic.
 *
 * The element is one mechanism with four consequences. The mechanism is `castDelayMs`: while a
 * psychic is on the field, every ability aimed at him is **queued rather than resolved** — the
 * cooldown is paid at the press, the effect lands two seconds later, and this kit owns the gap.
 * Everything the player sees above an enemy's head is that queue, drawn; everything the player
 * sees on the floor is the same two seconds applied to their feet. Mind Control reaches into the
 * queue and takes something out of it. Dodge Destiny is exactly as long as a telegraph.
 *
 * The other half of the kit is **stress**, which is a second health bar that only exists in the
 * future. It is added by everything, it never ticks, and it does nothing at all until it goes off
 * — either on its own ten seconds after the last point landed, or on the Q, multiplied. Because
 * it releases as pierce damage it is the only thing in the element that armour cannot answer,
 * which is what makes a psychic worth being afraid of rather than merely annoying.
 *
 * The online story is the same story with the machines swapped. A remote opponent delays their
 * *own* casts on their *own* sim — they can see `npcElementId === 'psychic'` just as easily as
 * we can — and relays the resulting queue back for us to draw. Nothing about the foreknowledge
 * is computed on the psychic's machine, which is the only arrangement in which their shots
 * really do come out two seconds late rather than merely looking like they do.
 *
 * ## The shop upgrades
 *
 * All five are bought against the same fact: the element already draws the next two seconds on
 * the floor, and without upgrades that drawing is only ever *advice*. Every upgrade turns some
 * part of it into a mechanic.
 *
 * - **Click+ Whip Snap** — the ghost at the end of the route becomes a hitbox. Catch it and they
 *   are pulled to it for 20 stress and no damage at all.
 * - **E+ Ability Theft** — what comes out of their queue pays five seconds off the thief's own
 *   ability in the same slot.
 * - **R+ Infinite Perspective** — Dodge Destiny presses itself the instant 50 damage is about to
 *   land, and refuses that hit outright.
 * - **F+ Mind's Focus** — F is held for up to five seconds; the wind-up buys fuse, radius and
 *   stress, and the last of those scales off the pool the victim is already carrying.
 * - **Q+ Cycle of Abuse** — a comatose body bleeds its own pool out at 3 a second, throwing a
 *   120px shockwave with every point, and gets a quarter of it back when it wakes.
 *
 * ## The mastery
 *
 * Both halves are the same trade the element already makes — foreknowledge for tempo — bought
 * once more at a steeper price.
 *
 * - **Predictor's Snare** (passive) turns the Space dash into a teleport onto the *movement
 *   marker*: not where they are, where the thread says they will be. A closed eye is left burnt
 *   into that spot, and 15 stress goes into whoever walks over it — which, by construction, is
 *   the person whose own route put it there.
 * - **Utter Focus** (bindable) shuts his eyes for eight seconds and opens the window from two
 *   seconds to five. Everything aimed at him is held five seconds, everything he lands is worth
 *   1.2x stress, and against a real opponent their *movement keys* are held the same five — the
 *   only arrangement in the game in which the thread over another person is a fact. Every hit
 *   that lands on him while it runs takes half a second back off it.
 */
export class PsychicKit {
  private api: PsychicArenaApi;

  // ── Visuals ──
  private readonly pcol: PsychicColorFn;
  private readonly ncol: PsychicColorFn;
  private readonly pfx: PsychicFx;
  private readonly nfx: PsychicFx;
  private playerAvatar: PsychicAvatar | null = null;
  private npcAvatar: PsychicAvatar | null = null;
  /** Routes, coma mandalas and meditation rings — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** The whip, stress cracks, the prediction bar and the destiny ghost — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /**
   * Pooled legends for the prediction chips and the stress readouts. Pooled rather than made
   * per-enemy because both appear and vanish several times a second, and `setStyle` rebuilds a
   * Text's canvas texture — `setText` on an unchanged string does not.
   */
  private labels: Phaser.GameObjects.Text[] = [];
  private labelsUsed = 0;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  /** Every fighter whose casts this kit is currently holding, and what it is holding. */
  private queues = new Map<Fighter, Queued[]>();
  /** Everyone whose `castDelayMs`/`queueDelayedCast` this kit installed, so it can take them back. */
  private foreseen = new Set<Fighter>();
  private stress = new Map<Fighter, Stress>();
  private comas = new Map<Fighter, Coma>();
  private migraines = new Map<Fighter, Migraine>();
  /** Migraines that have been planted but have not gone off yet. */
  private charges: Charge[] = [];
  /** Predictor's Snare (mastery): closed eyes waiting on the floor, oldest first. */
  private snares: Snare[] = [];
  /** Fractions of a point of stress not yet written to the mastery counter. */
  private stressBanked = 0;
  /**
   * Utter Focus (mastery), on the machine being read: this player's own movement keys, held.
   *
   * Samples go in at the top of every frame and come out five seconds later, so the body is
   * always executing an input that was pressed a window ago. Oldest first; `movePlayed` is
   * whichever one has matured most recently and is therefore what the legs are currently doing.
   */
  private moveBuffer: { at: number; vx: number; vy: number }[] = [];
  private movePlayed = { vx: 0, vy: 0 };
  private lastRouteRelayAt = 0;
  /** …and on the psychic's machine, what came back: their real route, next-to-last last. */
  private netRoute: { x: number; y: number }[] = [];
  private netRouteAt = 0;
  /** Online: the opponent's own report of what is in their queue, next one last. */
  private netQueueKeys: string[] = [];
  private netQueueAt = 0;
  private lastQueueRelayAt = 0;
  private lastQueueSentAt = 0;
  private lastRelayedQueue = '';

  constructor(api: PsychicArenaApi) {
    this.api = api;
    this.pcol = (base) => api.psychicColor('player', base);
    this.ncol = (base) => api.psychicColor('npc', base);
    this.pfx = new PsychicFx(api.scene, this.pcol);
    this.nfx = new PsychicFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PsychicFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PsychicColorFn { return owner === 'player' ? this.pcol : this.ncol; }
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

  private isPsychic(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'psychic' : this.api.npcElementId === 'psychic';
  }

  /** Shop upgrades, for whichever side is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  private avatar(owner: Owner): PsychicAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Everything this kit ever writes a field on, so a stale multiplier can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /**
   * True for a body this machine is only rendering. Their sim owns what that fighter aims and
   * how it moves, so anything we apply to it here would be applied twice — see `doMigraine`.
   */
  private isNetReplica(f: Fighter): boolean {
    return this.api.isOnline && f === this.api.npc;
  }

  /** True when a status we just applied belongs to a person on another machine. */
  private shouldRelay(owner: Owner, victim: Fighter): boolean {
    return owner === 'player' && this.api.isOnline && victim === this.api.npc;
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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Hand every borrowed cast back before dropping the queues, or an ability paid for on the
    // last frame of a match would simply vanish along with the kit's state.
    for (const f of [...this.foreseen]) this.releaseForesight(f, false);
    this.foreseen.clear();
    // Infinite Perspective's absorber is a closure over this kit — dropped before the state it
    // reads is, or a stale one would still be sitting on a body at the start of the next match.
    for (const owner of BOTH) this.dropAbsorber(owner);
    this.queues.clear();
    this.stress.clear();
    this.comas.clear();
    this.migraines.clear();
    this.charges = [];
    this.snares = [];
    this.stressBanked = 0;
    this.moveBuffer = [];
    this.movePlayed = { vx: 0, vy: 0 };
    this.lastRouteRelayAt = 0;
    this.netRoute = [];
    this.netRouteAt = 0;
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.netQueueKeys = [];
    this.netQueueAt = 0;
    this.lastQueueRelayAt = 0;
    this.lastQueueSentAt = 0;
    this.lastRelayedQueue = '';
    this.vizT = 0;

    for (const f of this.allFighters()) {
      if (!f) continue;
      f.psychicIncomingMult = 1;
      f.aimScatterUntil = 0;
      f.castDelayMs = 0;
      f.queueDelayedCast = null;
      f.moveInputDelayMs = 0;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    for (const t of this.labels) t.destroy();
    this.labels = [];
    this.labelsUsed = 0;

    this.api.setStatusIndicator('psychic-stress', null);
    this.api.setStatusIndicator('psychic-coma', null);
    this.api.setStatusIndicator('psychic-foresight', null);
    this.api.setStatusIndicator('psychic-focus', null);
    this.api.setStatusIndicator('psychic-utter', null);
    this.api.setStatusIndicator('psychic-held', null);
  }

  // ── Mastery helpers ────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking. */
  private masteryOn(owner: Owner): boolean {
    return this.isPsychic(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /**
   * Which slot Utter Focus was dropped on, or null. E is never scanned — `excludeSlots` refuses
   * it, because a five-second queue with no Mind Control to reach into it is a window that reads
   * beautifully and does nothing at all.
   */
  private utterSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === UTTER_ID) return s;
    }
    return null;
  }

  /** The player's key for a bound slot. */
  private keyFor(slot: 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'r' ? this.api.rKey : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  /** True while that side has his eyes shut. */
  private focused(owner: Owner): boolean {
    return this.now < this.side(owner).utterUntil;
  }

  /**
   * How far ahead that psychic can see right now — and therefore, since the two are the same
   * number, how long everything aimed at him is held for.
   */
  private foresightMs(owner: Owner): number {
    return this.focused(owner) ? UTTER_FORESIGHT_MS : FORESIGHT_MS;
  }

  /**
   * Only ever recorded for the player: the grind is the human's, not the bot's. Written whether
   * or not the mastery is on — that is how it gets unlocked in the first place.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && amount > 0) this.api.recordMasteryStat(key, amount);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5, so the route goes just under them and everything the player has
    // to read at a glance goes well over them.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(16);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isPsychic('player') && !this.playerAvatar) {
      this.playerAvatar = new PsychicAvatar(scene, this.pcol);
    }
    if (this.isPsychic('npc') && !this.npcAvatar) {
      this.npcAvatar = new PsychicAvatar(scene, this.ncol);
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'psychic') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p) || this.comas.has(p)) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // Mastery: whichever of R/F/Q Utter Focus was dropped on stops being its own ability. The
    // wind-up included — a bound F is not a Migraine any more, so it must not open one either.
    const bound = this.utterSlot('player');
    if (bound && Phaser.Input.Keyboard.JustDown(this.keyFor(bound))) this.tryCastUtter('player');

    // Held rather than clicked: the whip is a 700 ms rhythm and its own cooldown is the gate.
    if (pointer.isDown) p.castAbility('psychic-headache', ctx);

    // Mind Control is refused before `castAbility` rather than inside the do-method, because a
    // cast that reaches `cast()` has already stamped (and voiced) its cooldown — reaching into
    // an empty queue would cost five seconds for nothing.
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      if (this.seizableFrom('player')) {
        p.castAbility('psychic-mind-control', ctx);
      } else if (p.getCooldownRatio('psychic-mind-control') >= 1) {
        this.api.showFloatingText(p.x, p.y - 46, 'NOTHING TO SEIZE', this.hex(PSY.violetLit));
      }
    }
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      p.castAbility('psychic-dodge-destiny', ctx);
    }
    // Mind's Focus turns F into a hold. The upgraded release never goes near `castAbility`, so
    // it stamps its own cooldown — the charge-and-release arrangement `startCooldown` exists for.
    if (bound !== 'f') {
      if (this.up('player', 'f')) this.handleFocus(p, mouseX, mouseY);
      else if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('psychic-migraine', ctx);
    }
    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      p.castAbility('psychic-coma', ctx);
    }
  }

  /**
   * F+ — winding the charge up in his hand instead of dropping it.
   *
   * Every gate `castAbility` would have applied is applied here at the *press* rather than the
   * release, because the release is what stamps: a psychic who starts winding while the ability
   * is still cooling would otherwise get a free one the moment he let go.
   */
  private handleFocus(p: Fighter, mx: number, my: number): void {
    const s = this.sides.player;
    s.focusX = mx;
    s.focusY = my;

    if (!s.focusStart) {
      if (!Phaser.Input.Keyboard.JustDown(this.api.fKey)) return;
      const now = Date.now();
      if (p.getCooldownRatio('psychic-migraine') < 1) return;
      if (now < p.disarmedUntil || now < p.silencedUntil || now < p.chickenUntil) return;
      s.focusStart = this.now;
      this.avatar('player')?.play('flex');
      return;
    }

    const held = this.now - s.focusStart;
    // Fires itself at the top of the wind-up rather than stalling there — a charge that can be
    // held open for ever is a charge nobody ever has to respect.
    if (this.api.fKey.isDown && held < FOCUS_MAX_MS) return;
    s.focusStart = 0;
    p.startCooldown('psychic-migraine');
    this.doMigraine('player', mx, my, Math.min(held, FOCUS_MAX_MS));
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — the whip. The lash is resolved the instant it is cast, against the shape it will be
   * drawn in at the crack, so what hits and what the player sees hit are the same geometry. The
   * tip is worth double the stress and is about 45 px of a 196 px lash, which is the whole skill
   * in the ability: standing at exactly the wrong distance is how you get the most out of it.
   */
  doHeadache(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-headache'); return; }
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const av = this.avatar(owner);
    const hand = av ? this.handOf(av, f) : { x: f.x, y: f.y };
    // Aim from the hand the cord actually leaves, not from the body centre. The two sit ~25 px
    // apart, and a lash thrown *parallel* to the aim instead of *along* it slides past a target
    // the cursor was sitting right on top of.
    const ang = Math.atan2(ty - hand.y, tx - hand.x);
    const pts = this.lashPoints(hand.x, hand.y, ang, WHIP_CRACK_T);

    // Whip Snap (Click+): the cord is tested against the *end of the route* first, and anything
    // caught there is taken out of the ordinary hit list entirely — the lash landed on where they
    // are going to be, not on them, so it deals no damage and none of the usual stress.
    const snapped = new Map<Fighter, { x: number; y: number }>();
    if (this.up(owner, 'click')) {
      for (const t of this.targetsOf(owner)) {
        const dest = this.destinyOf(t, owner);
        if (!dest) continue;
        for (let i = 1; i < pts.length; i++) {
          if (this.segDist(pts[i - 1], pts[i], dest.x, dest.y) > SNAP_R) continue;
          snapped.set(t, dest);
          break;
        }
      }
    }

    const hit = new Map<Fighter, boolean>();   // victim → was it the tip
    for (const t of this.targetsOf(owner)) {
      if (snapped.has(t)) continue;
      const body = t.body as Phaser.Physics.Arcade.Body | null;
      const reach = WHIP_HIT_R + (body?.radius || WHIP_BODY_R);
      for (let i = 1; i < pts.length; i++) {
        if (this.segDist(pts[i - 1], pts[i], t.x, t.y) > reach) continue;
        const isTip = i / (pts.length - 1) >= WHIP_TIP_FRAC;
        hit.set(t, (hit.get(t) ?? false) || isTip);
      }
    }

    for (const [t, dest] of snapped) this.snapTo(owner, t, dest);

    let anyTip = false;
    for (const [t, tip] of hit) {
      anyTip = anyTip || tip;
      t.takeDamage(WHIP_DAMAGE);
      this.addStress(t, WHIP_STRESS + (tip ? WHIP_TIP_BONUS : 0), owner);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(tip ? PSY.stress : PSY.violetLit));
      this.fx(owner).crack(t.x, t.y, ang, tip);
      if (tip) this.api.showFloatingText(t.x, t.y - 62, '⚡ TIP!', this.hex(PSY.gold));
    }
    if (!hit.size && !snapped.size) {
      // Nothing there — crack it in the air anyway, at the tip, so the reach is legible.
      const end = pts[pts.length - 1];
      this.fx(owner).crack(end.x, end.y, ang, false);
    }

    s.lash = { ox: hand.x, oy: hand.y, ang, start: this.now, tip: anyTip };
    av?.play('sweep', ang);
  }

  /**
   * Where a body's route ends, or null when there is nothing there to aim at.
   *
   * The 24px floor is the same one `paintAir` uses to decide whether to draw the ghost at all,
   * so the thing Whip Snap can catch is exactly the thing the player can see. Somebody standing
   * still has no future to be snapped to, which is the counterplay: stop walking.
   */
  private destinyOf(f: Fighter, owner: Owner): { x: number; y: number } | null {
    const pts = this.projectPath(f, this.foresightMs(owner));
    if (pts.length < 3) return null;
    const end = pts[pts.length - 1];
    return Phaser.Math.Distance.Between(end.x, end.y, f.x, f.y) < SNAP_MIN_DIST ? null : end;
  }

  /** Whip Snap (Click+): put them where the thread said they were going. */
  private snapTo(owner: Owner, v: Fighter, to: { x: number; y: number }): void {
    const fromX = v.x;
    const fromY = v.y;
    this.fx(owner).snap(fromX, fromY, to.x, to.y);
    Sfx.playAt('torment', to.x, { rate: 1.35, volume: 0.7 });
    if (this.isNetReplica(v)) {
      // Their position is streamed from their machine; moving the copy here would be undone by
      // the next packet, so the move is asked for rather than done.
      this.api.sendPsychicMsg({ t: 'psy', k: 'snap', x: to.x, y: to.y });
    } else {
      this.body(v).reset(to.x, to.y);
    }
    this.addStress(v, SNAP_STRESS, owner);
    this.api.showFloatingText(to.x, to.y - 46, '🪢 SNAPPED', this.hex(PSY.gold));
  }

  /**
   * E — reach into the queue over their head and take the front card off it. The ability never
   * happens and it goes back on a full cooldown from this moment, so a stolen ultimate is worth
   * far more than a stolen click.
   */
  doMindControl(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-mind-control'); return; }
    this.ensureLayers();

    const victim = this.seizableFrom(owner);
    if (!victim) { this.refund(f, 'psychic-mind-control'); return; }

    this.avatar(owner)?.play('clap', Math.atan2(victim.y - f.y, victim.x - f.x));
    this.fx(owner).seize(victim.x, victim.y, f.x, f.y);

    if (this.isNetReplica(victim)) {
      // Their queue lives on their machine. All we have here is the mirror, which their next
      // relay will correct — so take the head off it optimistically and tell them to do the same.
      const key = this.netQueueKeys.length ? this.netQueueKeys[this.netQueueKeys.length - 1] : '?';
      this.netQueueKeys.pop();
      this.api.sendPsychicMsg({ t: 'psy', k: 'cancel' });
      this.api.showFloatingText(victim.x, victim.y - 70, `🚫 ${key} SEIZED`, this.hex(PSY.gold));
      this.record(owner, 'castsDenied');
      if (this.up(owner, 'e')) this.creditTheft(owner, key);
      return;
    }

    const q = this.queues.get(victim);
    if (!q || !q.length) { this.refund(f, 'psychic-mind-control'); return; }
    const taken = q.shift() as Queued;
    if (!q.length) this.queues.delete(victim);
    victim.restampCooldown(taken.id);
    this.api.showFloatingText(victim.x, victim.y - 70, `🚫 ${taken.key} SEIZED`, this.hex(PSY.gold));
    this.record(owner, 'castsDenied');
    if (this.up(owner, 'e')) this.creditTheft(owner, taken.key);
  }

  /**
   * Ability Theft (E+): five seconds off the thief's own ability in the slot they just robbed.
   *
   * Matched on the display key rather than the id, because the two elements share nothing else —
   * "the slot" is the only thing a stolen Fireball and a Headache have in common. Stealing their
   * E is the funny case and is deliberately left in: Mind Control's own cooldown is 5 seconds, so
   * robbing an E pays for the robbery.
   */
  private creditTheft(owner: Owner, key: string): void {
    const f = this.fighter(owner);
    const own = f.element.abilities.find((a) => a.displayKey === key);
    if (!own) return;
    f.reduceCooldown(own.id, THEFT_REFUND_MS);
    this.api.showFloatingText(f.x, f.y - 54, `⏱ ${key} −5s`, this.hex(PSY.gold));
  }

  /**
   * R — 1.25 seconds of nothing being able to touch you. Re-asserted every frame rather than set
   * once, because a dash anywhere else in the game clears `isInvincible` on a timer of its own
   * and would otherwise cut this short.
   */
  doDodgeDestiny(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-dodge-destiny'); return; }
    this.ensureLayers();
    const s = this.side(owner);
    s.dodgeUntil = this.now + DODGE_MS;
    f.isInvincible = true;
    this.avatar(owner)?.setBlind(true);
    this.avatar(owner)?.play('flex');
    this.fx(owner).veil(f.x, f.y, DODGE_MS);
    this.api.showFloatingText(f.x, f.y - 50, '👁️ DESTINY DODGED', this.hex(PSY.gold));
  }

  /**
   * F — a migraine left on the floor rather than handed out.
   *
   * The charge is planted at the cursor and goes off two and a half seconds later, which is the
   * same deal Fire's Pressure Bomb offers: a mark on the ground everyone can read, and a wait
   * long enough that a placed charge is a prediction rather than a hit. It suits this element
   * better than it suits Fire's, because predicting where somebody will be standing is the
   * entire passive — the thread on the floor is already telling you where to put it.
   *
   * What it detonates is the migraine itself: three seconds in which most of what they aim goes
   * somewhere else, plus ten stress a second, plus ten for being caught at all. The aim half is
   * a single generic field on the victim, read where every ability in the game gets its target
   * point, so it works on anything they might be.
   */
  doMigraine(owner: Owner, tx: number, ty: number, chargeMs = 0): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-migraine'); return; }
    this.ensureLayers();

    // Clamped so a charge thrown at the edge still covers ground the fight happens on.
    const x = Phaser.Math.Clamp(tx, this.left, this.right);
    const y = Phaser.Math.Clamp(ty, this.top, this.bottom);
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    // Mind's Focus (F+) buys all three of a charge's numbers at once. Zero on an ordinary tap,
    // which is what makes every figure below identical to the unupgraded ability.
    const charge = chargeMs / 1000;
    const radius = MIGRAINE_RADIUS + charge * FOCUS_RADIUS_PER_S;
    const fuse = MIGRAINE_FUSE_MS + charge * FOCUS_FUSE_PER_S;

    this.avatar(owner)?.play('slam', Math.atan2(y - f.y, x - f.x));
    this.charges.push({
      x, y, plantedAt: this.now, firesAt: this.now + fuse, by: owner, radius, charge,
    });
    this.fx(owner).plant(x, y, radius * 0.34);
    if (charge > 0.05) {
      this.api.showFloatingText(x, y - 26, `🌀 ${charge.toFixed(1)}s FOCUS`, this.hex(PSY.violetLit));
    }
  }

  /** The fuse. Nothing about a planted charge moves — only the mark on it does. */
  private updateCharges(): void {
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const c = this.charges[i];
      if (this.now < c.firesAt) continue;
      this.charges.splice(i, 1);
      this.detonateCharge(c);
    }
  }

  private detonateCharge(c: Charge): void {
    this.ensureLayers();
    this.fx(c.by).detonation(c.x, c.y, c.radius);
    this.api.scene.cameras.main.shake(140, 0.003);
    Sfx.playAt('torment', c.x, { rate: 0.9, volume: 1 });

    // "Fully wound" is the whole five seconds of Mind's Focus, and it only counts if the blast
    // actually caught somebody — a perfect wind-up thrown at an empty floor is not a landing.
    let caught = false;

    for (const v of this.targetsOf(c.by)) {
      if (Phaser.Math.Distance.Between(c.x, c.y, v.x, v.y) > c.radius) continue;
      caught = true;
      // A replica's shots are fired on the machine that owns it, so scattering the copy here
      // would bend an angle that has already been bent once. Relay it and let them do it.
      if (!this.isNetReplica(v)) {
        v.aimScatterUntil = Math.max(v.aimScatterUntil, Date.now() + MIGRAINE_MS);
      }
      this.migraines.set(v, { until: this.now + MIGRAINE_MS, by: c.by, nextTickAt: this.now + 1000 });
      // Read before the add, or the wind-up would be scaling off stress it is itself applying.
      const carried = this.stress.get(v)?.amount ?? 0;
      this.addStress(v, MIGRAINE_HIT_STRESS
        + c.charge * FOCUS_STRESS_PER_S
        + carried * c.charge * FOCUS_POOL_CUT_PER_S, c.by);
      this.fx(c.by).throb(v.x, v.y);
      this.api.spawnHitFlash(v.x, v.y, this.col(c.by)(PSY.stress));
      this.api.showFloatingText(v.x, v.y - 54, '🤯 MIGRAINE', this.hex(PSY.stress));
      if (this.shouldRelay(c.by, v)) {
        this.api.sendPsychicMsg({ t: 'psy', k: 'scatter', ms: MIGRAINE_MS });
      }
    }

    if (caught && c.charge >= FOCUS_MAX_MS / 1000 - 0.05) this.record(c.by, 'fullMigraines');
  }

  /**
   * Q — cash the whole pool in at 1.5x and put them under for a second per twenty points. The
   * coma is the second half of the ability and the better half: while it runs, everything the
   * psychic lands is halved and the missing half goes straight back into a fresh pool, so a Q
   * that lands on 80 stress hands you four seconds in which to build the next 80.
   */
  doComa(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'psychic-coma'); return; }
    this.ensureLayers();
    this.avatar(owner)?.play('raise');

    let landed = false;
    for (const v of this.targetsOf(owner)) {
      const st = this.stress.get(v);
      if (!st || st.amount < 1) continue;
      landed = true;
      const total = Math.round(st.amount * COMA_MULT);
      this.stress.delete(v);
      this.api.showFloatingText(v.x, v.y - 74, `×${COMA_MULT} → ${total}`, this.hex(PSY.stress));
      this.detonate(v, total, owner);

      const secs = Math.floor(total / COMA_PER_STRESS);
      if (secs > 0) this.beginComa(owner, v, secs * 1000);
    }
    // No pool anywhere means the ultimate was spent on nothing at all — hand it back rather
    // than eating a thirty-second cooldown for a light show.
    if (!landed) {
      this.refund(f, 'psychic-coma');
      this.api.showFloatingText(f.x, f.y - 50, 'NO STRESS TO CASH', this.hex(PSY.violetLit));
    }
  }

  // ── Stress ─────────────────────────────────────────────────────────────────

  /**
   * Add to a victim's pool and push the fuse back out to a full ten seconds.
   *
   * `quiet` is for the coma's banking, which lands on every single tick of every burn, poison
   * and bleed the victim is wearing — a pop-up per tick would bury the arena. The readout over
   * their head is already live, so the number is never actually hidden.
   */
  private addStress(victim: Fighter, amount: number, by: Owner, quiet = false): void {
    if (amount <= 0 || !this.alive(victim)) return;
    // Utter Focus (mastery) is applied here rather than at each call site, so every source in
    // the element is covered by it at once — lashes, ticks, blasts, snares and the coma's own
    // banking. The number the player sees pop is the boosted one, because it is the real one.
    // Ruin's Combo Breaker halves every meter in the game, and stress is the biggest of them.
    // Applied here for the same reason Utter Focus is: one place covers every source at once.
    const amt = meterGain(this.fighter(by), this.focused(by) ? amount * UTTER_STRESS_MULT : amount);
    const cur = this.stress.get(victim);
    this.stress.set(victim, {
      amount: (cur?.amount ?? 0) + amt,
      releaseAt: this.now + STRESS_HOLD_MS,
      by,
      seed: cur?.seed ?? Math.random() * 999,
    });
    // Banked to whole points before it is written. The coma's half-damage banking calls this
    // every frame a burn is ticking, and a `localStorage` write per frame for a fraction of a
    // point is the one thing this counter must not become.
    if (by === 'player') {
      this.stressBanked += amt;
      if (this.stressBanked >= 1) {
        const whole = Math.floor(this.stressBanked);
        this.stressBanked -= whole;
        this.record('player', 'stressDealt', whole);
      }
    }
    if (quiet) return;
    this.api.showFloatingText(
      victim.x + (Math.random() - 0.5) * 22, victim.y - 34,
      `+${Math.round(amt)}`, this.hex(PSY.stress),
    );
  }

  /**
   * Let a pool go. Pierce, because "stress damage pierces through damage resistance" — which in
   * this codebase means it skips the whole mitigation product *and* every absorb layer under it.
   * A comatose victim is re-baselined straight afterwards, or the half of this hit the coma eats
   * would come back as stress and the two would feed each other forever.
   */
  private detonate(victim: Fighter, amount: number, by: Owner): void {
    if (amount <= 0) return;
    // The biggest single release, ever, on one body — a ratchet rather than a total, so it is
    // one enormous Q that finishes it rather than a hundred small ones.
    if (by === 'player') this.api.recordMasteryBest('bestDetonation', Math.round(amount));
    this.fx(by).burst(victim.x, victim.y, Math.min(1, amount / STRESS_FULL));
    victim.takeDamage(amount, { pierce: true });
    const c = this.comas.get(victim);
    if (c) c.lastRaw = victim.rawDamageTaken;
  }

  private updateStress(): void {
    for (const [v, st] of [...this.stress]) {
      if (!this.alive(v)) { this.stress.delete(v); continue; }
      if (this.now < st.releaseAt) continue;
      this.stress.delete(v);
      this.api.showFloatingText(v.x, v.y - 60, `💥 ${Math.round(st.amount)} STRESS`, this.hex(PSY.stress));
      this.detonate(v, Math.round(st.amount), st.by);
    }
  }

  // ── Coma ───────────────────────────────────────────────────────────────────

  private beginComa(owner: Owner, victim: Fighter, ms: number): void {
    this.comas.set(victim, {
      until: this.now + ms, by: owner, lastRaw: victim.rawDamageTaken,
      nextBleedAt: this.now + 1000, bled: 0,
    });
    this.fx(owner).sleep(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 58, `💤 COMA ${(ms / 1000).toFixed(0)}s`, this.hex(PSY.violetLit));
    if (this.shouldRelay(owner, victim)) this.api.sendPsychicMsg({ t: 'psy', k: 'coma', ms });
  }

  /**
   * The armour multiplier is rewritten from scratch onto every body each frame — the Justice
   * pattern — so a coma that ends between two ticks can never leave a stale 0.5 behind.
   */
  private updateComas(): void {
    for (const f of this.allFighters()) {
      if (f) f.psychicIncomingMult = 1;
    }
    for (const [v, c] of [...this.comas]) {
      if (!this.alive(v) || this.now >= c.until) {
        this.comas.delete(v);
        this.endComa(v, c);
        continue;
      }
      v.psychicIncomingMult = COMA_SPLIT;
      // Casting is a generic field; being held still is this kit's own speed multiplier, since
      // a comatose fighter still has to be pushable by everything else in the game.
      v.disarmedUntil = Math.max(v.disarmedUntil, Date.now() + 150);
      if (!this.isNetReplica(v)) this.body(v).setVelocity(0, 0);

      // Whatever the armour just ate, banked back as stress. `rawDamageTaken` is tallied before
      // any multiplier runs, so the difference is the *full* hit and half of it is what landed.
      const raw = v.rawDamageTaken;
      const dealt = raw - c.lastRaw;
      c.lastRaw = raw;
      if (dealt > 0.5) this.addStress(v, dealt * COMA_SPLIT, c.by, true);

      // Cycle of Abuse last, so the banking above has already settled everything else this
      // frame — the bleed re-baselines behind itself and must not be reached by it.
      if (this.up(c.by, 'q') && this.now >= c.nextBleedAt) {
        c.nextBleedAt += 1000;
        this.bleed(v, c);
      }
    }
  }

  /**
   * Cycle of Abuse (Q+): one point of pressure a second coming out of a comatose body sideways.
   *
   * The stress is *removed* rather than released — it comes off the pool and lands on them as
   * ordinary damage, which their armour (including the coma's own halving) answers normally.
   * What it is not is banked: `lastRaw` is re-baselined immediately, exactly as `detonate` does,
   * or the coma would hand half of every bleed straight back and the pool would never drain.
   *
   * The shockwave is the interesting half. It hits everything in 120px *except* the body it came
   * out of — which in a duel means the psychic standing over them, and that is the point of the
   * name. Cashing a Coma and then camping on top of it costs 10 a second.
   */
  private bleed(v: Fighter, c: Coma): void {
    const st = this.stress.get(v);
    if (!st || st.amount < 0.5) return;
    const amt = Math.min(BLEED_PER_S, st.amount);
    st.amount -= amt;
    if (st.amount < 0.5) this.stress.delete(v);
    c.bled += amt;

    v.takeDamage(amt);
    c.lastRaw = v.rawDamageTaken;
    this.fx(c.by).bleedBurst(v.x, v.y, BLEED_AOE_RADIUS);
    this.api.showFloatingText(v.x - 18, v.y - 30, `−${amt.toFixed(0)}`, this.hex(PSY.stressDeep));

    const caster = this.fighter(c.by);
    for (const other of this.allFighters()) {
      if (other === v || !this.alive(other)) continue;
      if (Phaser.Math.Distance.Between(v.x, v.y, other.x, other.y) > BLEED_AOE_RADIUS) continue;
      other.takeDamage(BLEED_AOE_DAMAGE, other === caster ? { selfInflicted: true } : undefined);
      this.api.spawnHitFlash(other.x, other.y, this.col(c.by)(PSY.stress));
    }
  }

  /** Cycle of Abuse (Q+): a quarter of everything bled is waiting on them when they wake up. */
  private endComa(v: Fighter, c: Coma): void {
    if (!this.alive(v) || c.bled <= 0 || !this.up(c.by, 'q')) return;
    const back = Math.round(c.bled * BLEED_RETURN);
    if (back < 1) return;
    this.addStress(v, back, c.by, true);
    this.api.showFloatingText(v.x, v.y - 66, `🔁 ${back} RETURNED`, this.hex(PSY.stress));
  }

  private updateMigraines(): void {
    for (const [v, m] of [...this.migraines]) {
      if (!this.alive(v) || this.now >= m.until) { this.migraines.delete(v); continue; }
      if (this.now < m.nextTickAt) continue;
      m.nextTickAt += 1000;
      this.addStress(v, MIGRAINE_STRESS_PER_S, m.by);
    }
  }

  // ── Predictor's Snare (mastery passive) ────────────────────────────────────

  /**
   * The dash, replaced.
   *
   * Called from `ArenaScene.executeDodge` before it decides what kind of movement the Space key
   * is. Returning true means this kit has already put the body where it is going — there is no
   * velocity to set and no direction to honour, because the destination was never the direction
   * he was holding. It was the end of somebody else's thread.
   *
   * Refuses when nobody has a route worth reading, and the dash is then an ordinary dash. That
   * is the whole counterplay to the passive and it is the same one the element already has:
   * stand still and you have no future to be ambushed at.
   */
  trySnareDash(): boolean {
    if (!this.masteryOn('player')) return false;
    const p = this.api.player;
    if (!this.alive(p) || this.comas.has(p)) return false;

    let dest: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf('player')) {
      const d = this.destinyOf(t, 'player');
      if (!d) continue;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
      if (dist >= bestD) continue;
      bestD = dist;
      dest = d;
    }
    if (!dest) return false;

    this.ensureLayers();
    const x = Phaser.Math.Clamp(dest.x, this.left, this.right);
    const y = Phaser.Math.Clamp(dest.y, this.top, this.bottom);
    const fromX = p.x;
    const fromY = p.y;
    this.body(p).reset(x, y);
    this.pfx.snare(fromX, fromY, x, y);
    Sfx.playAt('teleport', x, { rate: 1.2, volume: 0.8 });
    this.plantSnare('player', x, y);
    this.api.showFloatingText(x, y - 50, '🧿 SNARE SET', this.hex(PSY.gold));
    return true;
  }

  /** Leave a closed eye on the spot. The oldest is rubbed out rather than refusing a new one. */
  private plantSnare(owner: Owner, x: number, y: number): void {
    const mine = this.snares.filter((s) => s.by === owner);
    if (mine.length >= SNARE_MAX) {
      const oldest = mine[0];
      this.snares.splice(this.snares.indexOf(oldest), 1);
    }
    this.snares.push({
      x, y, by: owner,
      until: this.now + SNARE_LIFE_MS,
      armedAt: this.now + SNARE_ARM_MS,
      seed: Math.random() * 999,
    });
  }

  /**
   * Runes catching people, and runes running out.
   *
   * A rune is spent the moment it fires — it is a prediction that came true, and a prediction
   * cannot come true twice. Only the planter's own enemies can trip one, so a psychic walking
   * back over his own eye does nothing at all.
   */
  private updateSnares(): void {
    for (let i = this.snares.length - 1; i >= 0; i--) {
      const s = this.snares[i];
      if (this.now >= s.until) { this.snares.splice(i, 1); continue; }
      if (this.now < s.armedAt) continue;
      for (const v of this.targetsOf(s.by)) {
        const body = v.body as Phaser.Physics.Arcade.Body | null;
        const reach = SNARE_R + (body?.radius || WHIP_BODY_R);
        if (Phaser.Math.Distance.Between(s.x, s.y, v.x, v.y) > reach) continue;
        this.snares.splice(i, 1);
        this.ensureLayers();
        this.fx(s.by).snareTrip(s.x, s.y);
        Sfx.playAt('torment', s.x, { rate: 1.5, volume: 0.6 });
        this.addStress(v, SNARE_STRESS, s.by);
        this.api.spawnHitFlash(v.x, v.y, this.col(s.by)(PSY.stress));
        this.api.showFloatingText(v.x, v.y - 46, '🧿 SNARED', this.hex(PSY.gold));
        break;
      }
    }
  }

  // ── Utter Focus (mastery ability) ──────────────────────────────────────────

  /**
   * The press.
   *
   * It never goes near `castAbility` — the enhancement is not in the element's ability list —
   * so every refusal that function applies has to be repeated here, or a disarmed psychic would
   * find one key on his bar still worked.
   */
  private tryCastUtter(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || this.comas.has(f)) return;
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.silencedUntil || wall < f.chickenUntil) return;
    if (this.focused(owner)) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 46, 'ALREADY FOCUSED', this.hex(PSY.violetLit));
      }
      return;
    }
    if (this.now - s.utterCastAt < UTTER_COOLDOWN_MS) return;
    this.beginUtter(owner);
    // `triggerCooldown` is both what the ability card counts down from and what puts the cast on
    // the wire — online it reaches the opponent as an unknown id and lands in `replayNpcMastery`.
    if (owner === 'player') f.triggerCooldown(UTTER_ID);
  }

  /**
   * The window itself. Separate from the refusals above because the machine on the *other* end
   * of it opens the same eight seconds on a body that never pressed anything.
   */
  private beginUtter(owner: Owner, ms = UTTER_MS): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.utterUntil = this.now + ms;
    s.utterCastAt = this.now;
    s.utterRaw = f?.rawDamageTaken ?? 0;
    s.utterRelayAt = 0;
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.avatar(owner)?.setBlind(true);
    this.avatar(owner)?.play('raise');
    this.fx(owner).focus(f.x, f.y);
    Sfx.playAt('status-curse', f.x, { rate: 0.6, volume: 0.9 });
    this.api.showFloatingText(f.x, f.y - 54, '🧿 UTTER FOCUS', this.hex(PSY.gold));
    this.api.showFloatingText(f.x, f.y - 36,
      `${UTTER_FORESIGHT_MS / 1000}s AHEAD · ×${UTTER_STRESS_MULT} STRESS`, this.hex(PSY.violetLit));
  }

  /**
   * Online replay: the remote psychic pressed their bound key.
   *
   * Their cast relay and their first remaining-time heartbeat are two packets describing the
   * same instant and either may arrive first, so this refuses a window that is already open
   * rather than opening a second one on top of it.
   */
  doNpcUtterFocus(): void {
    if (this.focused('npc')) return;
    this.beginUtter('npc');
  }

  private endUtter(owner: Owner): void {
    const s = this.side(owner);
    if (!s.utterUntil) return;
    s.utterUntil = 0;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.avatar(owner)?.setBlind(false);
      this.api.showFloatingText(f.x, f.y - 46, '👁️ EYES OPEN', this.hex(PSY.violetLit));
      Sfx.playAt('status-expire', f.x, { rate: 1.1, volume: 0.6 });
    }
    // Whoever was being held is let go on the same frame, so a window that ends between two
    // relays never leaves an opponent walking five seconds behind their own hands.
    if (owner === 'npc') this.releaseHeldMovement();
    if (this.shouldRelayUtter(owner)) {
      this.api.sendPsychicMsg({ t: 'psy', k: 'utter', ms: 0 });
      s.utterRelayAt = this.now;
    }
  }

  /** True when the person on the other end of this window is a real one, on another machine. */
  private shouldRelayUtter(owner: Owner): boolean {
    return owner === 'player' && this.api.isOnline && this.alive(this.api.npc);
  }

  /**
   * The window, per frame, for both sides.
   *
   * Two things happen in here that do not happen anywhere else in the kit. The first is the
   * price: `rawDamageTaken` is diffed exactly as the coma's banking diffs it, and any hit at all
   * inside a frame costs half a second of the eight. The second is the heartbeat — the remaining
   * time is what crosses the wire rather than the duration, because the duration is not a
   * constant once anything has hit him.
   */
  private updateUtter(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.utterUntil) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.isPsychic(owner)) { this.endUtter(owner); continue; }

      // The price. Counted once a frame however many things landed in it — the window is paid
      // for in hits taken, not in damage, and a burn tick is not worth the same as a nuke.
      const raw = f.rawDamageTaken;
      if (raw > s.utterRaw + 0.5) {
        s.utterUntil -= UTTER_HIT_COST_MS;
        this.fx(owner).mote(f.x, f.y - 20);
        this.api.showFloatingText(f.x + 22, f.y - 40,
          `−${UTTER_HIT_COST_MS / 1000}s FOCUS`, this.hex(PSY.stress));
      }
      s.utterRaw = raw;

      if (this.now >= s.utterUntil) { this.endUtter(owner); continue; }

      if (this.shouldRelayUtter(owner) && this.now - s.utterRelayAt >= UTTER_RELAY_MS) {
        s.utterRelayAt = this.now;
        this.api.sendPsychicMsg({ t: 'psy', k: 'utter', ms: Math.round(s.utterUntil - this.now) });
      }
    }
  }

  /**
   * The bot's half of the mastery.
   *
   * The window is worth pressing for exactly two things the kit already owns: every point of
   * stress inside it is worth 1.2, and the queue over the target's head grows long enough that
   * Mind Control has something to pick out of it. Both of those want the same thing — a target
   * close enough to keep whipping — so the opportunity is computed here and nowhere else, and
   * `doPsychicAbilities` never has to reason about the mastery at all.
   */
  private updateNpcMastery(): void {
    const s = this.sides.npc;
    if (!this.utterSlot('npc')) return;
    if (this.now < s.npcUtterCheckAt) return;
    s.npcUtterCheckAt = this.now + NPC_UTTER_CHECK_MS;
    const f = this.api.npc;
    if (!this.alive(f) || this.comas.has(f)) return;
    if (this.focused('npc') || this.now - s.utterCastAt < UTTER_COOLDOWN_MS) return;
    const t = this.nearestTarget('npc');
    if (!t) return;
    // Close enough that the multiplier lands on something, or already holding a press of theirs
    // worth stretching out to five seconds.
    const near = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= NPC_UTTER_RANGE;
    if (!near && !this.queues.get(t)?.length) return;
    this.tryCastUtter('npc');
  }

  // ── Utter Focus, on the machine being read ─────────────────────────────────

  /**
   * How long this player's own movement keys are being held back, or 0.
   *
   * Only ever non-zero online. Offline the psychic is a bot whose route this kit already
   * projects exactly — holding a human's feet would buy the bot nothing it does not have, and
   * would cost the human the one thing the passive was never supposed to take.
   */
  private moveDelayMs(): number {
    if (!this.api.isOnline || !this.isPsychic('npc') || !this.focused('npc')) return 0;
    return UTTER_FORESIGHT_MS;
  }

  /**
   * Hold this frame's movement, and hand back whatever was pressed a window ago.
   *
   * Called from `ArenaScene`'s movement block with the velocity it was about to set. Everything
   * that has matured is drained (so a frame drop cannot make the body skip an input entirely)
   * and the last one out is what the legs keep doing until the next matures. Until the buffer is
   * a full window deep there is nothing mature in it at all, which is why the first stretch of
   * somebody else's Utter Focus is spent standing still: the keys being pressed have not
   * happened yet.
   */
  delayMovement(vx: number, vy: number): { vx: number; vy: number } {
    const delay = this.moveDelayMs();
    if (delay <= 0) {
      this.releaseHeldMovement();
      return { vx, vy };
    }
    this.api.player.moveInputDelayMs = delay;
    this.moveBuffer.push({ at: this.now, vx, vy });
    while (this.moveBuffer.length && this.now - this.moveBuffer[0].at >= delay) {
      const done = this.moveBuffer.shift() as { at: number; vx: number; vy: number };
      this.movePlayed = { vx: done.vx, vy: done.vy };
    }
    return this.movePlayed;
  }

  /** Give the legs back. Everything still in the buffer is dropped rather than replayed late. */
  private releaseHeldMovement(): void {
    if (this.api.player) this.api.player.moveInputDelayMs = 0;
    if (!this.moveBuffer.length && !this.movePlayed.vx && !this.movePlayed.vy) return;
    this.moveBuffer.length = 0;
    this.movePlayed = { vx: 0, vy: 0 };
  }

  /**
   * …and tell the psychic where those held keys are taking us.
   *
   * This is the only piece of the whole element in which the thread on the psychic's floor is a
   * fact rather than an estimate, and the reason is simply that the answer is already known over
   * here: the buffer *is* the next five seconds of this body's movement, so it is integrated
   * forward and sent as ten points rather than guessed at from a velocity on the other side.
   */
  private relayRoute(): void {
    const delay = this.moveDelayMs();
    if (delay <= 0) return;
    if (this.now - this.lastRouteRelayAt < ROUTE_RELAY_MS) return;
    this.lastRouteRelayAt = this.now;
    const p = this.api.player;
    if (!this.alive(p)) return;

    // The timeline of what the legs are going to do, as segments ending at a game-clock time.
    // A sample pressed at `at` takes over the body at `at + delay` and holds it until the next
    // one matures; whatever they are doing right now holds until the oldest held sample does.
    const buf = this.moveBuffer;
    const segs: { vx: number; vy: number; until: number }[] = [];
    const end = this.now + delay;
    if (!buf.length) {
      segs.push({ vx: this.movePlayed.vx, vy: this.movePlayed.vy, until: end });
    } else {
      segs.push({ vx: this.movePlayed.vx, vy: this.movePlayed.vy, until: buf[0].at + delay });
      for (let i = 0; i < buf.length - 1; i++) {
        segs.push({ vx: buf[i].vx, vy: buf[i].vy, until: buf[i + 1].at + delay });
      }
      const last = buf[buf.length - 1];
      segs.push({ vx: last.vx, vy: last.vy, until: end });
    }

    const pts: number[] = [];
    const step = delay / ROUTE_POINTS;
    let x = p.x;
    let y = p.y;
    let t = this.now;
    let si = 0;
    for (let i = 1; i <= ROUTE_POINTS; i++) {
      const to = this.now + step * i;
      while (t < to) {
        const seg = segs[si];
        const cut = Math.min(to, seg.until);
        if (cut > t) {
          x = Phaser.Math.Clamp(x + seg.vx * ((cut - t) / 1000), this.left, this.right);
          y = Phaser.Math.Clamp(y + seg.vy * ((cut - t) / 1000), this.top, this.bottom);
          t = cut;
        }
        if (t < seg.until) break;
        if (si >= segs.length - 1) { t = to; break; }
        si++;
      }
      pts.push(Math.round(x), Math.round(y));
    }
    this.api.sendPsychicMsg({ t: 'psy', k: 'route', pts });
  }

  // ── Opened Eyes: the queue ─────────────────────────────────────────────────

  /**
   * Install or remove the delayed-cast hook on everyone who should be under it.
   *
   * Online is the interesting case. The psychic never touches the replica: the person behind it
   * can see they are fighting a psychic just as well as we can, so they delay their own casts on
   * their own machine and send the queue back. Delaying the copy here as well would put their
   * shots four seconds late instead of two.
   */
  private updateForesight(): void {
    // Whose window each victim is under. Mapped rather than collected because the mastery makes
    // the length a live number — five seconds while that psychic has his eyes shut, two when he
    // opens them — and it has to be rewritten every frame rather than stamped once on install.
    const want = new Map<Fighter, number>();
    if (this.isPsychic('npc') && this.alive(this.api.npc)) {
      want.set(this.api.player, this.foresightMs('npc'));
    }
    if (this.isPsychic('player') && this.alive(this.api.player) && !this.api.isOnline) {
      for (const f of this.targetsOf('player')) want.set(f, this.foresightMs('player'));
    }

    for (const f of [...this.foreseen]) {
      if (!want.has(f)) this.releaseForesight(f, true);
    }
    for (const [f, ms] of want) {
      // A window that widens does not retro-delay what is already queued — those casts were
      // stamped against the window that was running when they were pressed, and reaching back
      // into the queue to push them out would be the psychic stealing time twice for one press.
      f.castDelayMs = ms;
      if (this.foreseen.has(f)) continue;
      f.queueDelayedCast = (id, delay, fire) => this.enqueue(f, id, delay, fire);
      this.foreseen.add(f);
    }
  }

  /**
   * Give a fighter its casts back. Anything still queued fires immediately rather than being
   * dropped: it was paid for at the press, and a psychic dying mid-telegraph should read as the
   * held-back second going off all at once, not as free cooldowns for whoever killed him.
   */
  private releaseForesight(f: Fighter, fire: boolean): void {
    f.castDelayMs = 0;
    f.queueDelayedCast = null;
    this.foreseen.delete(f);
    const q = this.queues.get(f);
    this.queues.delete(f);
    if (!fire || !q || !this.alive(f)) return;
    for (const e of q) e.fire();
  }

  private enqueue(f: Fighter, abilityId: string, ms: number, fire: () => void): boolean {
    if (!this.alive(f)) return false;
    const ability = f.element.abilities.find((a) => a.id === abilityId);
    const q = this.queues.get(f) ?? [];
    q.push({
      id: abilityId,
      key: ability?.displayKey ?? '?',
      big: !!(ability as { isUltimate?: boolean } | undefined)?.isUltimate,
      at: this.now + ms,
      fire,
    });
    q.sort((a, b) => a.at - b.at);
    this.queues.set(f, q);
    return true;
  }

  private updateQueues(): void {
    for (const [f, q] of [...this.queues]) {
      if (!this.alive(f)) { this.queues.delete(f); continue; }
      while (q.length && q[0].at <= this.now) {
        const e = q.shift() as Queued;
        e.fire();
      }
      if (!q.length) this.queues.delete(f);
    }
  }

  /** The nearest enemy with something in their queue worth stealing, or null. */
  private seizableFrom(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const has = this.isNetReplica(t)
        ? this.netQueueKeys.length > 0 && this.now - this.netQueueAt < 1200
        : (this.queues.get(t)?.length ?? 0) > 0;
      if (!has) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** What is queued on a body, as chip legends with the next one *last* (i.e. rightmost). */
  private chipsFor(f: Fighter, window: number): { key: string; big: boolean; heat: number }[] {
    if (this.isNetReplica(f)) {
      if (this.now - this.netQueueAt > 1200) return [];
      return this.netQueueKeys.slice(-CHIPS_SHOWN).map((key, i, arr) => ({
        key, big: key === 'Q', heat: i === arr.length - 1 ? 0.85 : 0.3,
      }));
    }
    const q = this.queues.get(f);
    if (!q || !q.length) return [];
    // The queue is soonest-first; the bar reads next-on-the-right, so it is drawn reversed.
    return q.slice(0, CHIPS_SHOWN).reverse().map((e) => ({
      key: e.key,
      big: e.big,
      heat: Phaser.Math.Clamp(1 - (e.at - this.now) / window, 0, 1),
    }));
  }

  /**
   * Online: tell the psychic what our own sim is holding. This is the only piece of the passive
   * that cannot be worked out locally on their machine, and it is three short strings at 6 Hz.
   */
  private relayQueue(): void {
    if (!this.api.isOnline || !this.isPsychic('npc')) return;
    if (this.now - this.lastQueueRelayAt < QUEUE_RELAY_MS) return;
    this.lastQueueRelayAt = this.now;
    const q = this.queues.get(this.api.player) ?? [];
    // Soonest-first locally; sent next-last so the receiver can draw it straight out.
    const keys = q.slice(0, CHIPS_SHOWN).reverse().map((e) => e.key);
    const sig = keys.join(',');
    // Resent on a heartbeat as well as on change: the receiver treats a mirror older than
    // 1.2 s as gone, so a queue that happens to sit unchanged must not go quiet.
    if (sig === this.lastRelayedQueue && this.now - this.lastQueueSentAt < 700) return;
    this.lastRelayedQueue = sig;
    this.lastQueueSentAt = this.now;
    this.api.sendPsychicMsg({ t: 'psy', k: 'queue', keys });
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /** Everything the opponent's sim decided that ours has no way to work out for itself. */
  handleNetMsg(msg: NetPsychicMsg): void {
    const p = this.api.player;
    switch (msg.k) {
      case 'queue':
        this.netQueueKeys = msg.keys.slice(0, CHIPS_SHOWN);
        this.netQueueAt = this.now;
        break;
      case 'cancel': {
        const q = this.queues.get(p);
        if (!q || !q.length) break;
        const taken = q.shift() as Queued;
        if (!q.length) this.queues.delete(p);
        p.restampCooldown(taken.id);
        this.ensureLayers();
        this.nfx.seize(p.x, p.y, p.x, p.y - 60);
        this.api.showFloatingText(p.x, p.y - 70, `🚫 ${taken.key} SEIZED`, this.hex(PSY.gold));
        break;
      }
      case 'scatter':
        if (!this.alive(p)) break;
        p.aimScatterUntil = Math.max(p.aimScatterUntil, Date.now() + msg.ms);
        this.migraines.set(p, { until: this.now + msg.ms, by: 'npc', nextTickAt: Infinity });
        this.ensureLayers();
        this.nfx.throb(p.x, p.y);
        this.api.showFloatingText(p.x, p.y - 54, '🤯 MIGRAINE', this.hex(PSY.stress));
        break;
      case 'snap': {
        if (!this.alive(p)) break;
        // Whip Snap caught the end of our route on their sim. Our body is the authority on where
        // it is, so the move is done here and streamed back rather than assumed over there.
        const fromX = p.x;
        const fromY = p.y;
        this.body(p).reset(
          Phaser.Math.Clamp(msg.x, this.left, this.right),
          Phaser.Math.Clamp(msg.y, this.top, this.bottom),
        );
        this.ensureLayers();
        this.nfx.snap(fromX, fromY, p.x, p.y);
        this.api.showFloatingText(p.x, p.y - 46, '🪢 SNAPPED', this.hex(PSY.gold));
        break;
      }
      case 'coma':
        if (!this.alive(p)) break;
        // Applied without a relay of its own — the psychic's sim already has its own copy
        // running on the replica, which is where their half-damage banking is computed.
        this.comas.set(p, {
          until: this.now + msg.ms, by: 'npc', lastRaw: p.rawDamageTaken,
          nextBleedAt: this.now + 1000, bled: 0,
        });
        this.ensureLayers();
        this.nfx.sleep(p.x, p.y);
        this.api.showFloatingText(p.x, p.y - 58, `💤 COMA ${(msg.ms / 1000).toFixed(0)}s`, this.hex(PSY.violetLit));
        break;
      case 'utter': {
        // The heartbeat carries what is *left*, so this is a set rather than an add — a psychic
        // who has been hit four times since the last packet is three seconds shorter than the
        // duration he opened with, and this side has no way of knowing that on its own.
        const s = this.sides.npc;
        if (msg.ms <= 0) { this.endUtter('npc'); break; }
        const wasOpen = s.utterUntil > 0;
        s.utterUntil = this.now + msg.ms;
        if (!wasOpen) this.beginUtter('npc', msg.ms);
        break;
      }
      case 'route':
        // The psychic's side of the same window: their held keys, integrated on their machine.
        this.netRoute = [];
        for (let i = 0; i + 1 < msg.pts.length; i += 2) {
          this.netRoute.push({ x: msg.pts[i], y: msg.pts[i + 1] });
        }
        this.netRouteAt = this.now;
        break;
      default:
        break;
    }
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isPsychic('player');
    const npcIs = this.isPsychic('npc');
    const anyState = this.queues.size || this.stress.size || this.comas.size
      || this.migraines.size || this.foreseen.size || this.charges.length
      || this.snares.length || this.sides.player.utterUntil || this.sides.npc.utterUntil
      || this.sides.player.absorber || this.sides.npc.absorber;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.vizT += delta / 1000;

    // The window first: it decides how long everything installed below it is held for, and a
    // frame in which the two disagreed would put a cast in the queue against the wrong clock.
    this.updateUtter();
    this.updateNpcMastery();
    this.updateForesight();
    this.updatePerspective();
    this.updateQueues();
    this.updateCharges();
    this.updateMigraines();
    this.updateStress();
    this.updateComas();
    this.updateSnares();
    this.updateDodges();
    this.updateFocus();
    this.relayQueue();
    this.relayRoute();

    this.paintGround();
    this.paintAir();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs, npcIs);
  }

  // ── Infinite Perspective (R+) ──────────────────────────────────────────────

  /**
   * Keep the automatic dodge's hook on whichever psychic has bought it.
   *
   * `damageAbsorber` is one slot shared with Time's Remain and Air's wind dodge, so ours chains
   * onto whatever was there when we took it and is only ever handed back if the body is still
   * wearing ours. It is re-seated only when the slot has been emptied outright — a kit that
   * chained *onto* us is still calling us, and reinstalling on top of it would double us up.
   */
  private updatePerspective(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      const want = this.isPsychic(owner) && this.up(owner, 'r') && this.alive(f);
      if (!want) { this.dropAbsorber(owner); continue; }
      if (!s.absorber) {
        const prev = f.damageAbsorber;
        const fn = (amount: number): boolean =>
          this.tryPerspective(owner, amount) || (prev ? prev(amount) : false);
        s.prevAbsorber = prev;
        s.absorber = fn;
        f.damageAbsorber = fn;
      } else if (!f.damageAbsorber) {
        f.damageAbsorber = s.absorber;
      }
    }
  }

  private dropAbsorber(owner: Owner): void {
    const s = this.side(owner);
    if (!s.absorber) return;
    const f = this.fighter(owner);
    if (f && f.damageAbsorber === s.absorber) f.damageAbsorber = s.prevAbsorber;
    s.absorber = null;
    s.prevAbsorber = null;
    s.recent = [];
  }

  /**
   * The read, made for him. True means the hit is refused outright.
   *
   * "50 damage" is a rolling total rather than one number, because chip damage is still damage
   * and an ability that only ever answered single big hits would be dead against half the roster.
   * A hit that trips it is the one that never lands; the window is thrown away with it, so the
   * next 50 has to be earned from scratch.
   */
  private tryPerspective(owner: Owner, amount: number): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f) || amount <= 0) return false;
    const s = this.side(owner);
    const now = this.now;
    s.recent = s.recent.filter((r) => now - r.at < PERSPECTIVE_WINDOW_MS);
    const total = s.recent.reduce((n, r) => n + r.amt, 0) + amount;
    // Not enough yet, or the window is on cooldown along with the ability it presses.
    if (total < PERSPECTIVE_DAMAGE || f.getCooldownRatio('psychic-dodge-destiny') < 1) {
      s.recent.push({ at: now, amt: amount });
      return false;
    }
    s.recent = [];
    // Stamped through the fighter rather than cast, so the cooldown, the sound and the online
    // relay all happen exactly as they would have if he had pressed it himself.
    f.startCooldown('psychic-dodge-destiny');
    this.doDodgeDestiny(owner);
    this.api.showFloatingText(f.x, f.y - 68, '👁️ INFINITE PERSPECTIVE', this.hex(PSY.gold));
    return true;
  }

  /**
   * Mind's Focus (F+): a wind-up cannot outlive the man doing it.
   *
   * `handleInput` stops being called the moment he is comatose or dead, so without this the
   * charge would sit at whatever it had reached and go off on whatever key press woke him.
   * Nothing is refunded because nothing was spent — the cooldown is stamped at the release.
   */
  private updateFocus(): void {
    const s = this.sides.player;
    if (!s.focusStart) return;
    const p = this.api.player;
    if (this.alive(p) && !this.comas.has(p) && this.up('player', 'f')) return;
    s.focusStart = 0;
    this.api.showFloatingText(p.x, p.y - 46, 'FOCUS LOST', this.hex(PSY.violetLit));
  }

  private updateDodges(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.dodgeUntil) continue;
      const f = this.fighter(owner);
      if (this.now < s.dodgeUntil) {
        // Re-asserted every frame: `dashCaster` and half a dozen kits clear `isInvincible` on
        // timers of their own, and this window has to outlast all of them.
        if (this.alive(f)) f.isInvincible = true;
        continue;
      }
      s.dodgeUntil = 0;
      if (this.alive(f)) f.isInvincible = false;
      this.avatar(owner)?.setBlind(false);
    }
  }

  // ── Projection ─────────────────────────────────────────────────────────────

  /**
   * The next two seconds of a body's movement, as a polyline.
   *
   * For a bot this is not a guess: `NpcOpponent.movementPlan` hands over the exact locomotion
   * rule it is following this tick — close to `range`, then strafe at 60% speed in `strafe` —
   * and this replays that rule forward against the player's current position. It stops being
   * true the moment the player moves, which is the point: the thread is a promise the psychic
   * can walk out from under.
   *
   * A body with no plan to read (an online replica, a husk) falls back to dead reckoning off
   * its current velocity, lightly damped — *unless* Utter Focus is running, in which case the
   * replica's own machine is holding its movement keys and relaying the route they will actually
   * produce, and that is used verbatim. It is the one time this thread is not a projection.
   *
   * `ms` is the horizon, which is the psychic's own window: two seconds normally, five while his
   * eyes are shut. The step stays at 100ms either way, so the half-second ticks stay honest.
   */
  private projectPath(f: Fighter, ms = FORESIGHT_MS): { x: number; y: number }[] {
    if (this.isNetReplica(f) && this.now - this.netRouteAt < ROUTE_STALE_MS && this.netRoute.length > 2) {
      return this.netRoute;
    }
    const steps = Math.max(4, Math.round(ms / (FORESIGHT_MS / PATH_STEPS)));
    const dt = ms / 1000 / steps;
    const pts: { x: number; y: number }[] = [{ x: f.x, y: f.y }];
    const plan = (f as unknown as { movementPlan?: MovementPlan }).movementPlan;
    const px = this.api.player.x;
    const py = this.api.player.y;
    let x = f.x;
    let y = f.y;

    if (plan) {
      if (plan.frozen) return pts;
      for (let i = 0; i < steps; i++) {
        const d = Phaser.Math.Distance.Between(x, y, px, py);
        const toward = Math.atan2(py - y, px - x);
        const closing = d > plan.range;
        const a = closing ? toward : toward + plan.strafe * (Math.PI / 2);
        const sp = plan.speed * (closing ? 1 : 0.6);
        x = Phaser.Math.Clamp(x + Math.cos(a) * sp * dt, this.left, this.right);
        y = Phaser.Math.Clamp(y + Math.sin(a) * sp * dt, this.top, this.bottom);
        pts.push({ x, y });
      }
      return pts;
    }

    const b = this.body(f);
    let vx = b.velocity.x;
    let vy = b.velocity.y;
    if (Math.hypot(vx, vy) < 8) return pts;
    for (let i = 0; i < steps; i++) {
      x = Phaser.Math.Clamp(x + vx * dt, this.left, this.right);
      y = Phaser.Math.Clamp(y + vy * dt, this.top, this.bottom);
      vx *= 0.97;
      vy *= 0.97;
      pts.push({ x, y });
    }
    return pts;
  }

  /** The whip's cord: a snaking walk out from the hand, with a wave travelling down it. */
  /** Distance from a point to the segment a→b, so the cord hits along its length, not at its knots. */
  private segDist(a: { x: number; y: number }, b: { x: number; y: number }, px: number, py: number): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - a.x) * dx + (py - a.y) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(a.x + dx * u, a.y + dy * u, px, py);
  }

  /** The cord's shape at `t`. Lives in the visuals because it is the art and the hitbox at once. */
  private lashPoints(x: number, y: number, ang: number, t: number): { x: number; y: number }[] {
    return lashPoints(x, y, ang, t, { len: WHIP_LEN, crackT: WHIP_CRACK_T });
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // The passive, on the floor: one thread per enemy, only for the side that can see.
    for (const owner of BOTH) {
      if (!this.isPsychic(owner) || !this.alive(this.fighter(owner))) continue;
      // The npc's foreknowledge is real but private — drawing it would hand the player the
      // bot's routing for free. Only the local player's copy is ever painted.
      if (owner !== 'player') continue;
      const tint = this.col(owner);
      for (const t of this.targetsOf(owner)) {
        const pts = this.projectPath(t, this.foresightMs(owner));
        if (pts.length < 3) continue;
        foresightPath(g, tint, pts, 0.95, this.vizT);
      }
    }

    // Predictor's Snare (mastery): both sides' runes, because a trap nobody can see is not a
    // prediction, it is a landmine — and the thread that put it there was public too.
    for (const s of this.snares) {
      const life = Phaser.Math.Clamp((s.until - this.now) / 1200, 0, 1);
      const arm = Phaser.Math.Clamp(1 - (s.armedAt - this.now) / SNARE_ARM_MS, 0, 1);
      snareRune(g, this.col(s.by), s.x, s.y, SNARE_R, 0.9 * life, this.vizT + s.seed, arm);
    }

    // Utter Focus (mastery): the mandala under whoever has his eyes shut.
    for (const owner of BOTH) {
      const side = this.side(owner);
      if (!this.focused(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      focusMandala(g, this.col(owner), f.x, f.y, 52,
        (side.utterUntil - this.now) / UTTER_MS, this.vizT);
    }

    // Meditation rings under a psychic who is holding someone's future.
    for (const owner of BOTH) {
      if (!this.isPsychic(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const held = this.heldCount(owner);
      if (!held) continue;
      const tint = this.col(owner);
      for (let i = 0; i < 2; i++) {
        const r = 26 + i * 9 + Math.sin(this.vizT * 2 + i) * 2;
        g.lineStyle(1.2 - i * 0.4, tint(PSY.violet), 0.4 - i * 0.12);
        g.strokeEllipse(f.x, f.y + 14, r * 2, r * 0.7);
      }
    }

    // Planted migraines, ticking down. Both sides' charges are drawn: a mark you cannot see is
    // not a telegraph, it is an ambush, and this ability is meant to be walked out of.
    for (const c of this.charges) {
      // Measured against this charge's own fuse rather than the constant: a wound one runs
      // longer, and a hand that swept the rim early would lie about when it goes off.
      const t = 1 - (c.firesAt - this.now) / Math.max(1, c.firesAt - c.plantedAt);
      migraineMark(g, this.col(c.by), c.x, c.y, c.radius, t);
    }

    // Mind's Focus (F+), still in his hand: the blast he would get if he let go now.
    const fs = this.sides.player;
    if (fs.focusStart) {
      const charge = Math.min(FOCUS_MAX_MS, this.now - fs.focusStart) / 1000;
      focusMark(g, this.pcol, fs.focusX, fs.focusY,
        MIGRAINE_RADIUS + charge * FOCUS_RADIUS_PER_S,
        charge / (FOCUS_MAX_MS / 1000), this.vizT);
    }

    // Coma mandalas, under the body so they never cover a draining health bar.
    for (const [v, c] of this.comas) {
      if (!this.alive(v)) continue;
      comaSwirl(g, this.col(c.by), v.x, v.y, 26, 0.9, this.vizT);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    this.labelsUsed = 0;

    // ── The whip ──
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.lash) continue;
      const t = (this.now - s.lash.start) / WHIP_ANIM_MS;
      if (t >= 1) { s.lash = null; continue; }
      if (!this.alive(this.fighter(owner))) { s.lash = null; continue; }
      const pts = this.lashPoints(s.lash.ox, s.lash.oy, s.lash.ang, t);
      // Fades out over the back half, so the crack is the brightest frame.
      const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      psiWhip(g, this.col(owner), pts, alpha, {
        tipHot: s.lash.tip ? Phaser.Math.Clamp(1 - Math.abs(t - WHIP_CRACK_T) * 4, 0, 1) : 0,
      });
    }

    // ── Stress, on whoever is carrying it ──
    for (const [v, st] of this.stress) {
      if (!this.alive(v)) continue;
      const load = Math.min(1, st.amount / STRESS_FULL);
      const tint = this.col(st.by);
      stressCracks(g, tint, v.x, v.y - 4, load, 0.85, st.seed, this.vizT * 7);

      // The readout, and under it the ten-second fuse as a bar that empties. Both sit above
      // the prediction chips, which is the order the spec asks for.
      const fuse = Phaser.Math.Clamp((st.releaseAt - this.now) / STRESS_HOLD_MS, 0, 1);
      const bx = v.x;
      const by = v.y - 84;
      g.fillStyle(tint(PSY.stressDeep), 0.5);
      g.fillRect(bx - 20, by + 9, 40, 2.6);
      g.fillStyle(tint(PSY.stress), 0.95);
      g.fillRect(bx - 20, by + 9, 40 * fuse, 2.6);
      this.label(`${Math.round(st.amount)}`, bx, by, 15, this.hex(PSY.stress), true);
    }

    // ── The prediction bar ──
    // Only the local player ever sees one, and only over things they are fighting.
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      const tint = this.pcol;
      const window = this.foresightMs('player');
      for (const t of this.targetsOf('player')) {
        const chips = this.chipsFor(t, window);
        if (!chips.length) continue;
        const w = 26;
        const gap = 4;
        const total = chips.length * w + (chips.length - 1) * gap;
        const y = t.y - 62;
        for (let i = 0; i < chips.length; i++) {
          const c = chips[i];
          const x = t.x - total / 2 + w / 2 + i * (w + gap);
          keyChip(g, tint, x, y, w, 18, 0.95, c.heat);
          if (c.big) {
            mindSigil(g, tint, x, y, 12, 0.35 * c.heat, { phase: this.vizT * 2, sides: 5, eye: false });
          }
          this.label(c.key, x, y, c.key.length > 2 ? 8 : 11,
            this.hex(c.big ? PSY.gold : PSY.aether), true);
        }
        // An eye at the right-hand end, pointing at the one that is about to happen.
        thirdEye(g, tint, t.x + total / 2 + 11, y, 5.5, 0.6 + 0.4 * Math.sin(this.vizT * 4), 0.9,
          { glow: 0.5, lash: false });
      }
    }

    // ── Where they will be ──
    if (this.isPsychic('player') && this.alive(this.api.player)) {
      const snappable = this.up('player', 'click');
      for (const t of this.targetsOf('player')) {
        const pts = this.projectPath(t, this.foresightMs('player'));
        if (pts.length < 3) continue;
        const end = pts[pts.length - 1];
        if (Phaser.Math.Distance.Between(end.x, end.y, t.x, t.y) < SNAP_MIN_DIST) continue;
        destinyGhost(g, this.pcol, end.x, end.y, snappable ? 0.95 : 0.8, this.vizT);
        // Whip Snap (Click+): the ghost stops being a read-out and becomes a target, so it is
        // ringed at exactly the window the cord is tested against.
        if (!snappable) continue;
        g.lineStyle(1.4, this.pcol(PSY.gold), 0.5 + 0.25 * Math.sin(this.vizT * 5));
        g.strokeCircle(end.x, end.y, SNAP_R);
      }
    }

    for (let i = this.labelsUsed; i < this.labels.length; i++) this.labels[i].setVisible(false);
  }

  /**
   * A pooled label. `setText`/`setPosition` are cheap on an unchanged value; `setStyle` is not,
   * so size and colour are only written when they actually differ from what the slot is wearing.
   */
  private label(text: string, x: number, y: number, size: number, color: string, bold: boolean): void {
    let t = this.labels[this.labelsUsed];
    if (!t) {
      t = this.api.scene.add.text(0, 0, '', {
        fontFamily: 'monospace', fontSize: `${size}px`, color,
        fontStyle: bold ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(17);
      this.labels.push(t);
    }
    this.labelsUsed++;
    const style = t.style as unknown as { fontSize: string; color: string };
    if (style.fontSize !== `${size}px` || style.color !== color) {
      t.setStyle({ fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' });
    }
    t.setText(text);
    t.setPosition(x, y);
    t.setVisible(true);
  }

  /** How many abilities this side is currently holding out of the world. */
  private heldCount(owner: Owner): number {
    if (owner === 'player' && this.isNetReplica(this.api.npc)) {
      return this.now - this.netQueueAt < 1200 ? this.netQueueKeys.length : 0;
    }
    let n = 0;
    for (const t of this.targetsOf(owner)) n += this.queues.get(t)?.length ?? 0;
    return n;
  }

  private handOf(av: PsychicAvatar, f: Fighter): { x: number; y: number } {
    const h = av.castHand();
    return Number.isFinite(h.x) && (h.x || h.y) ? h : { x: f.x, y: f.y };
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      const target = this.nearestTarget(owner);
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      // Focus is "how much of the future am I holding right now" — the queue, plus whatever
      // pressure is sitting on the person I am holding it for.
      const load = target ? (this.stress.get(target)?.amount ?? 0) / STRESS_FULL : 0;
      av.setFocus(Math.min(1, 0.2 + this.heldCount(owner) * 0.24 + load * 0.45));
      // The third eye is written here rather than at each cast, because two different things
      // now shut it — a dodge and the mastery's window — and they overlap freely.
      av.setBlind(this.now < s.dodgeUntil || this.focused(owner));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const p = this.api.player;

    const st = this.stress.get(p);
    this.api.setStatusIndicator('psychic-stress', st ? {
      name: 'Stress', emoji: '🩸', color: PSY.stress, priority: 6,
      description: 'A pool of psychic pressure. It does nothing until it goes off, then lands all at once and straight through every scrap of armour you own. Every new point puts the fuse back to 10 seconds.',
      until: st.releaseAt, count: Math.round(st.amount),
    } : null);

    const coma = this.comas.get(p);
    this.api.setStatusIndicator('psychic-coma', coma ? {
      name: 'Coma', emoji: '💤', color: PSY.violet, priority: 2,
      description: this.up(coma.by, 'q')
        ? 'Face down. Held still and unable to cast, half of every hit banked back as stress — and 3 of that stress a second is being torn back out of you and thrown at everything nearby.'
        : 'Face down. Held still and unable to cast — and half of every hit you take is being banked straight back as stress.',
      until: coma.until,
    } : null);

    // Mind's Focus (F+), while it is being wound. Untimed on purpose: the bar is the arc on the
    // floor, and a second countdown in the tray would be the same number said twice.
    const fs = this.sides.player;
    const charge = fs.focusStart ? Math.min(FOCUS_MAX_MS, this.now - fs.focusStart) / 1000 : 0;
    this.api.setStatusIndicator('psychic-focus', fs.focusStart ? {
      name: "Mind's Focus", emoji: '🌀', color: PSY.violetLit, priority: 150,
      description: 'Winding a Migraine up. Every second buys 0.8s of extra fuse, 20px of extra blast, 4 more stress on the hit and another 10% of whatever pool the target is already carrying. It goes off on its own at 5 seconds.',
      count: Math.round(charge * 10) / 10, suffix: 's',
    } : null);

    // The passive, shown to both sides for opposite reasons: the psychic is told how much he is
    // holding, and his opponent is told that everything they press is two seconds late.
    const held = playerIs ? this.heldCount('player') : 0;
    const secs = (ms: number): string => `${Math.round(ms / 100) / 10}`;
    this.api.setStatusIndicator('psychic-foresight', playerIs && held > 0 ? {
      name: 'Opened Eyes', emoji: '👁️', color: PSY.gold, priority: 152,
      description: `You are ${secs(this.foresightMs('player'))} seconds ahead. Everything they press is sitting in the queue over their head until it catches up with them.`,
      count: held,
    } : (npcIs && p.castDelayMs > 0 ? {
      name: 'Foreseen', emoji: '👁️', color: PSY.violet, priority: 8,
      description: `Something is reading you. Everything you cast is paid for on the press and only happens ${secs(p.castDelayMs)} seconds later — and they can see it coming the whole way.`,
      count: this.queues.get(p)?.length ?? 0,
    } : null));

    // Utter Focus (mastery), for whichever of the two is wearing it.
    const ps = this.sides.player;
    this.api.setStatusIndicator('psychic-utter', playerIs && this.focused('player') ? {
      name: 'Utter Focus', emoji: '🧿', color: PSY.gold, priority: 153,
      description: `Your eyes are shut and you are ${UTTER_FORESIGHT_MS / 1000} seconds ahead instead of ${FORESIGHT_MS / 1000}. Every point of stress you inflict is worth ×${UTTER_STRESS_MULT}, and online their movement keys are held back the same ${UTTER_FORESIGHT_MS / 1000} seconds as their casts. Every hit that lands on you takes ${UTTER_HIT_COST_MS / 1000}s off it.`,
      until: ps.utterUntil,
    } : null);

    // …and for the person on the other end of it, who has an entirely different problem.
    this.api.setStatusIndicator('psychic-held', npcIs && this.focused('npc') ? {
      name: 'Held', emoji: '🧿', color: PSY.stress, priority: 3,
      description: p.moveInputDelayMs > 0
        ? `They have closed their eyes. Everything you press — abilities *and* movement — is being held for ${UTTER_FORESIGHT_MS / 1000} seconds before your body does it, and they have been watching where it takes you the whole time. Hit them: every hit shortens it by ${UTTER_HIT_COST_MS / 1000}s.`
        : `They have closed their eyes and gone ${UTTER_FORESIGHT_MS / 1000} seconds ahead. Everything you cast is held that long, and everything they land on you is worth ×${UTTER_STRESS_MULT} stress. Hit them: every hit shortens it by ${UTTER_HIT_COST_MS / 1000}s.`,
      until: this.sides.npc.utterUntil,
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ──────────────────────────

  /** Held still while comatose. Pulled by ArenaScene rather than pushed onto the body. */
  getPlayerSpeedMult(): number {
    return this.comas.has(this.api.player) ? 0 : 1;
  }

  getNpcSpeedMult(): number {
    return this.comas.has(this.api.npc) ? 0 : 1;
  }

  /** How many of the player's abilities the npc psychic is currently holding. */
  queueCount(owner: Owner): number {
    return this.heldCount(owner);
  }

  /** True when the thing at the front of that side's stolen queue is an ultimate. */
  queueHasUltimate(owner: Owner): boolean {
    for (const t of this.targetsOf(owner)) {
      for (const e of this.queues.get(t) ?? []) if (e.big) return true;
    }
    return false;
  }

  /** Stress currently sitting on that side's nearest enemy — the bot's cue for the Q. */
  stressOnTarget(owner: Owner): number {
    const t = this.nearestTarget(owner);
    return t ? Math.round(this.stress.get(t)?.amount ?? 0) : 0;
  }

  /**
   * Which of the bot's own slots Utter Focus was dropped on, or undefined. Published into
   * `NpcAiState` so `doPsychicAbilities` stops pressing the ability that is no longer there —
   * the kit casts the window itself, so the AI only needs to know what it gave up for it.
   */
  npcMasterySlot(): 'r' | 'f' | 'q' | undefined {
    return this.utterSlot('npc') ?? undefined;
  }

  /**
   * Ability tray fill. Utter Focus is the only card in the element that spends most of its life
   * showing a state rather than a cooldown — the eight seconds while they run, and the 26
   * filling back up once they do not.
   */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === UTTER_ID) {
      if (time < s.utterUntil) return 0.1 + 0.9 * Phaser.Math.Clamp((s.utterUntil - time) / UTTER_MS, 0, 1);
      return Phaser.Math.Clamp((time - s.utterCastAt) / UTTER_COOLDOWN_MS, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
