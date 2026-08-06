import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import { isDebuff, seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import {
  DEA, DeathAvatar, DeathColorFn, DeathFx, clockFace, cutMark, deathMask, leash, shade,
  sheath, shuriken, slashArc, slicedBullet, stumps, styxBrand, tentacle, wallFace, wallScar,
  weaponCore,
} from './DeathVisuals';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];

// ── Passive: Midnight ────────────────────────────────────────────────────────
/** One minute, and then somebody is dead. The whole element is arithmetic on this number. */
const MIDNIGHT_MS = 60_000;
/** Seconds at which the clock is allowed to announce itself. */
const TOLL_MARKS = [30, 10, 5, 4, 3, 2, 1];

// ── Styx Shurikens (Click) ───────────────────────────────────────────────────
const STYX_SPEED = 780;
const STYX_LIFE_MS = 1500;
const STYX_HIT_R = 17;
const STYX_MS = 3000;
const STYX_MAX = 3;
/** Slow *and* damage cut, per stack. */
const STYX_STEP = 0.15;
/** Three stars, three stacks — but only if all three connect. */
const STYX_COUNT = 3;
/** Angle between adjacent stars. ~14°, so the fan is a cone rather than a wall. */
const STYX_SPREAD = 0.25;
const STYX_SPIN = 17;

// ── Disarm (E) ───────────────────────────────────────────────────────────────
const DISARM_REACH = 126;
/** Half-angle of the arc. 1.05 rad ≈ 60° each side, so it is a cleave, not a poke. */
const DISARM_HALF = 1.05;
/**
 * One second of standing still per brand, and the brands are spent paying for it. The click is
 * no longer just an opener — it is the ammunition this ability fires.
 */
const DISARM_STUN_PER_STACK = 1000;
const DISARM_HASTE_MS = 5000;
const DISARM_HASTE = 1.30;
/** How long the yellow afterimage hangs in the air after the blade has gone. */
const DISARM_AFTER_MS = 700;

// ── Riposte (R) ──────────────────────────────────────────────────────────────
const RIPOSTE_MS = 3000;
/** The blade as a line segment: from this far in front of the body, out to this far. */
const RIPOSTE_NEAR = 14;
const RIPOSTE_FAR = 84;
/** How close a shot has to get to the steel. Generous — the ability is the whole cast. */
const RIPOSTE_R = 26;
/** Radians each half is thrown off the line it arrived on. Well past 45°, so neither can graze. */
const RIPOSTE_DEFLECT = 1.05;
const HALF_SPEED = 540;
const HALF_LIFE_MS = 760;

// ── Amputate (F) ─────────────────────────────────────────────────────────────
/** Farthest the dash will carry him, and the shortest it is allowed to be worth casting. */
const AMP_REACH = 340;
const AMP_MIN = 130;
const AMP_MS = 230;
/** How close the dash has to pass. Generous: the ability deals no damage, so a graze is a hit. */
const AMP_HIT_R = 34;
/** Two, out of the four a body has. Nothing regrows, so this is the budget for the whole game. */
const AMP_MAX = 2;
/** Indexed by legs gone: none, one, both. */
const AMP_LEG_SPEED = [1, 0.67, 0.34];
/** Indexed by arms gone. Cooldowns get longer; damage dealt gets smaller. */
const AMP_ARM_CD = [1, 1.25, 1.33];
const AMP_ARM_DMG = [1, 0.9, 0.75];

/** Left and right are cosmetic — only the count of each kind is worth anything. */
type Limb = 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg';
const LIMBS: Limb[] = ['left-arm', 'right-arm', 'left-leg', 'right-leg'];
const LIMB_LABEL: Record<Limb, string> = {
  'left-arm': 'LEFT ARM', 'right-arm': 'RIGHT ARM',
  'left-leg': 'LEFT LEG', 'right-leg': 'RIGHT LEG',
};
const LIMB_EMOJI: Record<Limb, string> = {
  'left-arm': '💪', 'right-arm': '💪', 'left-leg': '🦵', 'right-leg': '🦵',
};
function isLeg(limb: Limb): boolean { return limb.endsWith('leg'); }

// ── Deal with Death (Q) ──────────────────────────────────────────────────────
const DEAL_APPROACH = 48;
const DEAL_SHAKE_MS = 640;
const DEAL_RETREAT = 340;
const DEAL_MS = 10_000;
const DEAL_HASTE = 1.33;
const DEAL_DODGE = 0.33;
/** Take this much in the ten seconds and the deal is off. */
const DEAL_TOLL = 50;
/** What honouring it is worth, taken straight off the clock. */
const DEAL_REWARD_MS = 10_000;

// ── Upgrade: Sheath (Click) ──────────────────────────────────────────────────
/**
 * Three seconds of not swinging at anybody and the blade goes back in the saya. The next thing
 * he draws it for — whichever of the five it is — comes out powered, and the sheath is empty
 * again. Every one of the five has its own answer to being drawn from a full sheath; they live
 * next to the ability that owns them rather than in one table, because none of them is the same
 * *kind* of upgrade as the others.
 */
const SHEATH_MS = 3000;
/** Powered click: the fan becomes a line, thrown one star at a time straight down the cursor. */
const SHEATH_VOLLEY_GAP = 105;
/** Powered Disarm. */
const SHEATH_STUN_BONUS = 1000;
const SHEATH_KNOCK = 230;
/** Powered Riposte's parting wave: a fifth of everything the blade ate, as a slow. */
const SHOCK_R = 320;
const SHOCK_MS = 3000;
const SHOCK_PER_DAMAGE = 0.2;
const SHOCK_MAX = 0.9;
/** Powered Amputate: Exsanguination. Nothing to do with limbs — it is what the cut leaves open. */
const BLEED_MS = 15_000;
const BLEED_SLOW = 0.1;
const BLEED_DAMAGE = 0.1;
/** Powered Deal: what the bargain will tolerate before it is off. */
const SHEATH_DEAL_TOLL = 75;
/** Knockback is played out as position — both movement systems rewrite velocity every frame. */
const SHOVE_MS = 260;

// ── Upgrade: Disarmed (E) ────────────────────────────────────────────────────
/** A weapon taken off somebody at full brand. They cannot cast again until they walk to it. */
const WEAPON_FLIGHT_MS = 520;
const WEAPON_THROW = 250;
const WEAPON_PICKUP_R = 30;
/** Re-applied every frame while the core is on the floor: a lapse must not hand the keys back. */
const WEAPON_DISARM_TICK = 250;

// ── Upgrade: Dishonor (R) ────────────────────────────────────────────────────
/** A shot that ends on the stone is a shot that was never aimed. The wall remembers for 20s. */
const DISHONOR_MS = 20_000;
const DISHONOR_STEP = 0.02;
/** How far into the arena the stone stands, and how many scars it keeps before the oldest goes. */
const WALL_THICK = 15;
const SCAR_MAX = 48;

// ── Upgrade: Death by 1000 Cuts (F) ──────────────────────────────────────────
const CUT_LIFE_MS = 5000;
const CUT_EVERY_MS = 90;
/** Minimum travel between two cuts, so standing still does not pile a hundred on one tile. */
const CUT_MIN_MOVE = 11;
const CUT_LEN = 46;
const CUT_R = 34;
const CUT_SLOW = 0.25;
/** What standing in them does to everything else that is wrong with you. */
const CUT_AMP = 1.5;

// ── Upgrade: True Grimdark (Q) ───────────────────────────────────────────────
const TENTACLES = 5;
const TENT_LEN = 74;
/** How often an arm is allowed to take something out of the air, and how far it can reach. */
const GRAB_EVERY_MS = 430;
const GRAB_R = 175;
/** Instances of damage, not points of it. The mask does not care how big the hit was. */
const MASK_CHARGES = 3;

// ── HUD ──────────────────────────────────────────────────────────────────────
/**
 * The dial sits under the two rows of the status tray (`StatusHudKit`: origin y=60, two 34px
 * rows), hard against the same right margin — so it reads as the bottom of that corner stack
 * rather than as a thing floating in the middle of the screen. Invasion pushes the tray down a
 * row, and this follows it.
 */
const CLOCK_R = 40;
const CLOCK_MARGIN_X = 62;
const CLOCK_Y = 196;
const CLOCK_INVASION_DY = 38;
const CLOCK_DEPTH = 44;

/**
 * The limb picker. High on the screen and centred, out of the band where the fighting actually
 * happens — it is up for as long as it takes to press one key, and it must never be the reason
 * a shot was missed.
 */
const PICK_Y = 0.3;
const PICK_W = 300;
const PICK_ROW = 26;
const PICK_DEPTH = 46;

// ── World objects ────────────────────────────────────────────────────────────

/** One star of the river in flight. Carries no damage at all — only the brand. */
interface Shot {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  seed: number;
  /** Radians turned so far, so the star spins on its own axis rather than sliding flat. */
  spin: number;
  diesAt: number;
  /** Registry handle, so a Technology goose (or another Death's Riposte) can take it. */
  reg: { owner: Owner; getX(): number; getY(): number; damage: number; steal(): void } | null;
}

/** One of the two pieces of a cut bullet. Purely a consequence — it can never hit anything. */
interface Half {
  /** The side that cut it, so a skinned Death's steel colours its own debris. */
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  spin: number;
  side: 1 | -1;
  seed: number;
  diesAt: number;
  color: number;
}

/** The yellow crescent Disarm leaves behind. */
interface Afterimage {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  bornAt: number;
  diesAt: number;
  seed: number;
}

/** The brand on a victim: stacks and one shared expiry, refreshed by every new shot. */
interface Mark {
  stacks: number;
  until: number;
}

/** The amputating dash. The kit drives the body for its whole length — see `updateDashes`. */
interface Dash {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  startedAt: number;
  endsAt: number;
  /** Chosen before the dash left, and the same limb comes off everything it passes through. */
  limb: Limb;
  /** Drawn from a full sheath: everything it passes through is left bleeding out as well. */
  powered: boolean;
  /** Bodies already cut this dash, so one pass cannot take two limbs off one person. */
  hit: Set<Fighter>;
  took: number;
  seed: number;
}

/**
 * Q's state machine. `shake` is the handshake by the enemy; `settled` is the ten seconds
 * afterwards during which the bill either comes due or it doesn't.
 */
interface Deal {
  phase: 'shake' | 'settled';
  victim: Fighter;
  shakeUntil: number;
  endsAt: number;
  /** `rawDamageTaken` at the moment the ten seconds started, so the tally is a subtraction. */
  rawAt0: number;
  /** What this particular bargain will tolerate — 50, or 75 out of a full sheath. */
  toll: number;
  /** True Grimdark: the tentacles and the mask are out for as long as this deal is. */
  grim: boolean;
}

/**
 * Somebody's weapon, lying where the katana put it. Until they walk over it they are disarmed —
 * not for a duration, but until the thing is back in their hands.
 */
interface Weapon {
  /** The side that took it off them, so a skinned Death's steel throws in its own colours. */
  owner: Owner;
  victim: Fighter;
  x: number;
  y: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  bornAt: number;
  landsAt: number;
  seed: number;
  /** Their element's colour, used raw — the one thing on screen not in Death's palette. */
  color: number;
}

/** One of the thousand: a gash on the floor that hurts nobody and makes everything else worse. */
interface Cut {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  bornAt: number;
  diesAt: number;
  seed: number;
}

/** Where a shot died against the stone. Kept exactly as long as the penalty it bought. */
interface Scar {
  x: number;
  y: number;
  /** Into the arena, so the cracks run the right way out of the crater. */
  inAng: number;
  bornAt: number;
  diesAt: number;
  seed: number;
}

/** A knockback in progress. Velocity is stomped every frame, so this is played out as position. */
interface Shove {
  target: Fighter;
  vx: number;
  vy: number;
  until: number;
}

/** The drag a powered Riposte leaves on whoever was doing the shooting. */
interface Shock {
  until: number;
  /** 0–0.9. A fifth of the damage the blade ate, as a fraction of their speed. */
  pct: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Milliseconds left before midnight. */
  clockMs: number;
  /** True once the clock has struck and taken somebody — it does not run twice. */
  clockSpent: boolean;
  /** Largest `TOLL_MARKS` entry already announced, so a warning fires exactly once. */
  lastToll: number;
  hasteUntil: number;
  guardUntil: number;
  deal: Deal | null;
  dodgeApplied: boolean;
  dash: Dash | null;
  /** Chosen at the picker (player) or by the bot, and consumed by the next Amputate cast. */
  nextLimb: Limb | null;

  // ── Sheath (Click upgrade) ──
  /** When he last drew. Three seconds of this not moving and the sheath fills. */
  lastDrawAt: number;
  sheathed: boolean;
  /** A powered click, mid-throw: the stars go one at a time rather than all at once. */
  volley: { left: number; nextAt: number } | null;
  /** The live guard was drawn from a full sheath, so it owes a wave when it drops. */
  guardPowered: boolean;
  /** Damage the blade has eaten this guard. A fifth of it becomes the wave's slow. */
  guardBlocked: number;

  // ── Death by 1000 Cuts (F upgrade) ──
  cutNextAt: number;
  cutLastX: number;
  cutLastY: number;

  // ── True Grimdark (Q upgrade) ──
  /** Damage instances the mask has left. Zero and it is off. */
  maskCharges: number;
  /** The body the mask is actually on, so `reset` hands the absorber back to the right one. */
  maskOn: Fighter | null;
  maskPrev: ((amount: number) => boolean) | null;
  grabNextAt: number;
  /** Where the last arm went, so one tentacle is drawn reaching for it. */
  lastGrabX: number;
  lastGrabY: number;
  lastGrabAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, clockMs: MIDNIGHT_MS, clockSpent: false, lastToll: 999,
    hasteUntil: 0, guardUntil: 0, deal: null, dodgeApplied: false, dash: null, nextLimb: null,
    lastDrawAt: 0, sheathed: false, volley: null, guardPowered: false, guardBlocked: 0,
    cutNextAt: 0, cutLastX: 0, cutLastY: 0,
    maskCharges: 0, maskOn: null, maskPrev: null, grabNextAt: 0,
    lastGrabX: 0, lastGrabY: 0, lastGrabAt: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface DeathArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything this player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. Riposte has to be able to see every shot in the game. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** ...and the other half of them, which never join a group. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** Midnight and the Deal both behave differently when the npc slot is a co-op ally. */
  get isInvasion(): boolean;
  /** Q places the body itself at both ends of the teleport, so WASD has to stand down. */
  isDodging: boolean;
  /** Skins: maps a Death visual colour through that side's equipped skin. */
  deathColor(owner: Owner, base: number): number;
  /** Shop upgrades, this side's and — online — the opponent's. */
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  /** That side's element colour, for the core Disarm knocks out of somebody's hands. */
  elementColorOf(owner: Owner): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter | null;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── DeathKit ─────────────────────────────────────────────────────────────────

export class DeathKit {
  private api: DeathArenaApi;

  // ── Visuals ──
  private readonly pcol: DeathColorFn;
  private readonly ncol: DeathColorFn;
  private readonly pfx: DeathFx;
  private readonly nfx: DeathFx;
  private playerAvatar: DeathAvatar | null = null;
  private npcAvatar: DeathAvatar | null = null;
  /** The pool he stands in and the afterimages, under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shots, cut bullets, brands, nooses and the held blade — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The doomsday dial. Its own layer because it lives in screen space, not the arena. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudTitle: Phaser.GameObjects.Text | null = null;
  private hudCount: Phaser.GameObjects.Text | null = null;
  /** The limb picker, also screen space. Built on the first F and then shown and hidden. */
  private pickGfx: Phaser.GameObjects.Graphics | null = null;
  private pickTitle: Phaser.GameObjects.Text | null = null;
  private pickRows: Phaser.GameObjects.Text[] = [];
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private shots: Shot[] = [];
  private halves: Half[] = [];
  private afterimages: Afterimage[] = [];
  /** Brands, per the side that applied them. Both sides can be Death at once. */
  private marks: Record<Owner, Map<Fighter, Mark>> = { player: new Map(), npc: new Map() };
  /**
   * What each body has lost, keyed by the body rather than by who took it. Legs and arms are a
   * property of the person standing there, not of the reaper — and the two-limb budget is a
   * budget the *body* has, so a second Death could not start again from four.
   */
  private amputations = new Map<Fighter, Set<Limb>>();
  /** Everyone this kit has written `amputationCooldownMult` onto. */
  private ampTouched = new Set<Fighter>();
  /** Disarm's stun, held here because nothing consumes `earthStunnedUntil` for a player. */
  private stunned = new Map<Fighter, number>();
  /** Everyone this kit has written `deathIncomingMult` onto. */
  private touched = new Set<Fighter>();
  /** True while *this* kit is the one holding the arena's dodge flag down. */
  private claimsDodge = false;
  /** The limb picker is open and waiting on a number key. Player only — the bot just decides. */
  private picking = false;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];

  // ── Upgrade state ──
  /** Cores on the floor. One per victim: taking a second weapon off an empty pair of hands. */
  private weapons: Weapon[] = [];
  /** Exsanguination, per the side that opened it. */
  private bleeds: Record<Owner, Map<Fighter, number>> = { player: new Map(), npc: new Map() };
  /** Dishonor: one expiry per missed shot, so twenty stacks are twenty separate clocks. */
  private dishonor: Record<Owner, Map<Fighter, number[]>> = { player: new Map(), npc: new Map() };
  private scars: Scar[] = [];
  /** A powered Riposte's parting drag, per the side that let it go. */
  private shocks: Record<Owner, Map<Fighter, Shock>> = { player: new Map(), npc: new Map() };
  private cuts: Cut[] = [];
  /** Recomputed every frame: who is standing in somebody's cuts right now. */
  private carved = new Map<Fighter, Owner>();
  /** Per-victim effect snapshots, so the cuts can stretch what lands on them while they stand. */
  private cutSnapshots = new Map<Fighter, Map<string, number>>();
  private shoves: Shove[] = [];

  constructor(api: DeathArenaApi) {
    this.api = api;
    this.pcol = (base) => api.deathColor('player', base);
    this.ncol = (base) => api.deathColor('npc', base);
    this.pfx = new DeathFx(api.scene, this.pcol);
    this.nfx = new DeathFx(api.scene, this.ncol);
    this.setupKeys();
  }

  /** Idempotent — `addKey` hands back the existing Key when one is still registered. */
  private setupKeys(): void {
    const kb = this.api.scene.input.keyboard;
    if (!kb) return;
    this.numberKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
    ].map((c) => kb.addKey(c));
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): DeathFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): DeathColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }

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

  private isDeath(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'death' : this.api.npcElementId === 'death';
  }

  /** Shop upgrades, from whichever end of the arena is asking. */
  private up(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /**
   * Death by 1000 Cuts: everything wrong with a body standing in the gashes is half again as
   * wrong. Applied to the *deficit* rather than the multiplier — a 15% slow becomes 22.5%, not
   * a 15% slow multiplied by 1.5 into something that would make them faster at the other end.
   *
   * Amputations are exempt on purpose. A missing leg is not an effect somebody is maintaining;
   * it is the shape of the body, and there is nothing there for the cuts to make worse.
   */
  private ampOn(victim: Fighter): number {
    return this.carved.has(victim) ? CUT_AMP : 1;
  }

  /** A fraction (0.15 of their speed, say) scaled by whatever the cuts are doing to them. */
  private amped(victim: Fighter, deficit: number): number {
    return Math.min(0.95, deficit * this.ampOn(victim));
  }

  /**
   * Every cast goes through here. It empties the sheath, reports whether it was full when the
   * blade came out, and restarts the three seconds — so the *only* way to be powered is to have
   * genuinely done nothing for that long, and a whiffed cast costs the charge exactly like a
   * landed one.
   */
  private drawBlade(owner: Owner): boolean {
    const s = this.side(owner);
    const powered = s.sheathed && this.up(owner, 'click');
    s.sheathed = false;
    s.lastDrawAt = this.now;
    return powered;
  }

  private avatar(owner: Owner): DeathAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** Everything this side is allowed to hurt. */
  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /**
   * The one body the clock is counting down for. In Invasion the npc slot is a co-op ally, so
   * "the enemy" is instead whichever husk is standing up best — and the clock restarts rather
   * than ending the match, since a wave is not one person.
   */
  private primaryVictim(owner: Owner): Fighter | null {
    if (this.api.isInvasion && owner === 'player') {
      let best: Fighter | null = null;
      for (const t of this.targetsOf(owner)) if (!best || t.hp > best.hp) best = t;
      return best;
    }
    const t = this.fighter(this.other(owner));
    return this.alive(t) ? t : null;
  }

  /** What `f` is missing. The whole amputation model is these two numbers. */
  private limbCounts(f: Fighter): { arms: number; legs: number } {
    const set = this.amputations.get(f);
    if (!set) return { arms: 0, legs: 0 };
    let arms = 0;
    let legs = 0;
    for (const l of set) if (isLeg(l)) legs++; else arms++;
    return { arms, legs };
  }

  private limbsGone(f: Fighter): Set<Limb> {
    return this.amputations.get(f) ?? new Set<Limb>();
  }

  private markOn(owner: Owner, victim: Fighter): Mark | null {
    const m = this.marks[owner].get(victim);
    return m && this.now < m.until ? m : null;
  }

  /** Fraction of the minute already spent, for the avatar and the dial. */
  private doomOf(owner: Owner): number {
    return 1 - Phaser.Math.Clamp(this.sides[owner].clockMs / MIDNIGHT_MS, 0, 1);
  }

  /**
   * The arena's dodge flag, resolved from state rather than toggled at each call site — two
   * different things in this kit now drive the body (the handshake and the amputating dash), and
   * whichever finished second would otherwise hand WASD back underneath the other one.
   *
   * Re-asserted every frame on purpose: a Space dodge taken mid-handshake owns the same flag and
   * releases it when *it* finishes.
   */
  private syncDodgeClaim(): void {
    const s = this.sides.player;
    const want = s.deal?.phase === 'shake' || !!s.dash;
    if (want) { this.claimsDodge = true; this.api.isDodging = true; }
    else if (this.claimsDodge) { this.claimsDodge = false; this.api.isDodging = false; }
  }

  /** Distance from a point to the katana's line segment. */
  private distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 <= 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Everything written onto a fighter is handed back here, or the next match opens with a
    // permanently discounted, permanently stunned, permanently lucky pair of bodies.
    for (const f of this.touched) f.deathIncomingMult = 1;
    this.touched.clear();
    // Nothing regrows *within* a game. A new one is a new body.
    for (const f of this.ampTouched) f.amputationCooldownMult = 1;
    this.ampTouched.clear();
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.dodgeApplied && f?.active) f.dodgeChance = Math.max(0, f.dodgeChance - DEAL_DODGE);
      // The mask holds a `damageAbsorber` that would otherwise eat three hits in the next match.
      this.dropMask(owner);
    }
    this.stunned.clear();
    this.claimsDodge = false;
    this.api.isDodging = false;
    this.picking = false;

    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    // `scene.time.now` keeps counting across match restarts, so the sheath is charged from the
    // moment this round opened rather than from the moment the scene did.
    for (const owner of BOTH) this.sides[owner].lastDrawAt = this.now;
    this.shots = [];
    this.halves = [];
    this.afterimages = [];
    this.marks = { player: new Map(), npc: new Map() };
    this.amputations.clear();
    this.weapons = [];
    this.bleeds = { player: new Map(), npc: new Map() };
    this.dishonor = { player: new Map(), npc: new Map() };
    this.scars = [];
    this.shocks = { player: new Map(), npc: new Map() };
    this.cuts = [];
    this.carved.clear();
    this.cutSnapshots.clear();
    this.shoves = [];
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    this.hudTitle?.destroy(); this.hudTitle = null;
    this.hudCount?.destroy(); this.hudCount = null;
    this.pickGfx?.destroy(); this.pickGfx = null;
    this.pickTitle?.destroy(); this.pickTitle = null;
    for (const r of this.pickRows) r.destroy();
    this.pickRows = [];

    // The scene's keyboard plugin is torn down between runs, so the Keys have to be re-taken.
    this.setupKeys();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'death') return;
    void time;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) { this.picking = false; return; }
    // Mid-handshake the body is not his to drive and neither is the katana. The dash is the
    // same: it is a committed movement, and it is over in a fifth of a second.
    if (s.deal?.phase === 'shake' || s.dash) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // ── The limb picker ──
    // F opens it; a number key spends it. The cooldown is not touched until the dash actually
    // leaves, so opening the menu and changing your mind costs nothing.
    const pickVictim = this.picking ? this.primaryVictim('player') : null;
    // Whoever the menu was opened over has died in the meantime — there is nothing to choose.
    if (this.picking && !this.alive(pickVictim)) this.picking = false;

    if (this.picking) {
      const gone = this.limbsGone(pickVictim as Fighter);
      for (let i = 0; i < this.numberKeys.length; i++) {
        if (!Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) continue;
        const limb = LIMBS[i];
        if (gone.has(limb)) {
          this.api.showFloatingText(p.x, p.y - 46, '🦴 ALREADY GONE', this.hex(DEA.pale));
          continue;
        }
        s.nextLimb = limb;
        this.picking = false;
        // A refused cast (disarmed, dead, chickened) must not eat the choice.
        if (!p.castAbility('death-amputate', ctx)) s.nextLimb = null;
      }
      // F again closes it, so the key that opened the menu is also the key that backs out.
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.picking = false;
    } else if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      this.openPicker();
    }

    if (pointer.isDown && !this.api.pointerWasDown) p.castAbility('death-styx', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('death-disarm', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('death-riposte', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('death-deal', ctx);
  }

  /** F, when nothing is pending. Refuses early rather than opening a menu with no answers in it. */
  private openPicker(): void {
    const p = this.api.player;
    if (p.getCooldownRatio('death-amputate') < 1) return;
    const victim = this.primaryVictim('player');
    if (!this.alive(victim)) {
      this.api.showFloatingText(p.x, p.y - 46, '🦴 NOBODY TO CUT', this.hex(DEA.pale));
      return;
    }
    if (this.limbsGone(victim as Fighter).size >= AMP_MAX) {
      this.api.showFloatingText(p.x, p.y - 46, '🦴 NOTHING LEFT TO TAKE', this.hex(DEA.pale));
      return;
    }
    this.picking = true;
    Sfx.playAt('clang', p.x, { volume: 0.45, rate: 1.5 });
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — Styx Shurikens. Deals nothing. What it does is take fifteen percent of their legs
   * and fifteen percent of their teeth for three seconds, and it throws three stars to do it, so
   * the whole brand can land in one press at knife range and only a third of it lands across the
   * arena. That is the whole reason the clock is allowed to be a guaranteed kill: the minute is
   * only survivable if they can reach you, and this is the ability that decides whether they can.
   */
  doStyxShot(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.deal?.phase === 'shake') { f.resetCooldown('death-styx'); return; }

    const aim = Math.atan2(ty - f.y, tx - f.x);
    // Drawn from a full sheath the fan closes into a line: the same three stars, thrown one
    // after another straight down the cursor, so all three stacks land at any range instead of
    // only at knife range. `updateVolleys` throws them; the cast itself only loads the barrel.
    if (this.drawBlade(owner)) {
      s.volley = { left: STYX_COUNT, nextAt: this.now };
      this.api.showFloatingText(f.x, f.y - 46, '🗡️ DRAWN — STRAIGHT LINE', this.hex(DEA.edge));
      Sfx.playAt('clang', f.x, { volume: 0.55, rate: 1.7 });
      this.avatar(owner)?.play('punch', aim);
      return;
    }

    for (let i = 0; i < STYX_COUNT; i++) {
      // Centred fan: with three stars that is one straight down the aim and one to each side.
      this.fireStar(owner, aim + (i - (STYX_COUNT - 1) / 2) * STYX_SPREAD);
    }

    this.avatar(owner)?.play('punch', aim);
    Sfx.playAt('dark-drain', f.x, { volume: 0.5, rate: 1.25 });
  }

  /** One star of the river, leaving his hand along `ang`. */
  private fireStar(owner: Owner, ang: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const shot: Shot = {
      owner,
      x: f.x + Math.cos(ang) * 26,
      y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * STYX_SPEED,
      vy: Math.sin(ang) * STYX_SPEED,
      seed: Math.random() * 999,
      spin: Math.random() * Math.PI,
      diesAt: this.now + STYX_LIFE_MS,
      reg: null,
    };
    // Registered so the rest of the game can interact with it — including another Death's
    // Riposte, which is the only symmetry that would be strange to leave out.
    const reg = {
      owner,
      getX: () => shot.x,
      getY: () => shot.y,
      damage: 0,
      steal: () => {
        const j = this.shots.indexOf(shot);
        if (j >= 0) this.shots.splice(j, 1);
      },
    };
    shot.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.shots.push(shot);
    this.fx(owner).soot(shot.x, shot.y, 2, 9, 320, 9);
  }

  /**
   * The powered click, throwing itself. Each star leaves along the aim *as it is now* rather
   * than as it was when the key went down, so the line can be walked across a moving target.
   */
  private updateVolleys(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!s.volley) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.isDeath(owner)) { s.volley = null; continue; }
      if (this.now < s.volley.nextAt) continue;

      this.fireStar(owner, this.aimAngle(owner));
      Sfx.playAt('dark-drain', f.x, { volume: 0.5, rate: 1.45 });
      s.volley.left--;
      s.volley.nextAt = this.now + SHEATH_VOLLEY_GAP;
      if (s.volley.left <= 0) s.volley = null;
    }
  }

  /** Where that side is pointing: the cursor for the player, the enemy for the bot. */
  private aimAngle(owner: Owner): number {
    const f = this.fighter(owner);
    const s = this.sides[owner];
    if (owner === 'player') return Math.atan2(s.aimY - f.y, s.aimX - f.x);
    const t = this.primaryVictim(owner) ?? this.api.player;
    return Math.atan2(t.y - f.y, t.x - f.x);
  }

  /**
   * E — Disarm. A cleave through everything in front of him that deals no damage at all and
   * instead cashes in the river: one second of standing still for every brand they are carrying,
   * and every brand comes off them to pay for it. Three stacks is three seconds in which the
   * clock keeps running and they cannot do anything about it; no stacks is no stun at all.
   *
   * The speed is not part of that bargain. It is paid on the swing, whatever the swing found.
   */
  doDisarm(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    const powered = this.drawBlade(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.afterimages.push({
      owner, x: f.x, y: f.y, ang,
      bornAt: this.now, diesAt: this.now + DISARM_AFTER_MS,
      seed: Math.random() * 999,
    });

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).sweep(f.x, f.y, ang, DISARM_HALF, DISARM_REACH, 420, 10, DEA.after);
    Sfx.playAt('slash', f.x, { volume: 1, rate: 0.85 });

    let hits = 0;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > DISARM_REACH + 14 * t.sizeMult) continue;
      const to = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(to - ang)) > DISARM_HALF) continue;
      hits++;
      this.api.spawnHitFlash(t.x, t.y, DEA.after);
      this.fx(owner).spark(t.x, t.y, ang);

      // Out of a full sheath the swing itself has weight: whatever it touches leaves the ground.
      if (powered) this.shove(t, ang, SHEATH_KNOCK);

      // The river is the ammunition. Spend it here or it expires on its own in three seconds.
      const stacks = this.markOn(owner, t)?.stacks ?? 0;
      // A powered swing is worth a second of stillness on its own — that is the "one second
      // longer" in the upgrade, and it is what makes the cleave worth throwing at a clean target.
      const ms = stacks * DISARM_STUN_PER_STACK + (powered ? SHEATH_STUN_BONUS : 0);
      if (ms <= 0) {
        this.api.showFloatingText(t.x, t.y - 40, '🌊 NO STACKS', this.hex(DEA.pale));
        continue;
      }
      // Full brand and a hand free: the weapon goes with the stun, and it does not come back
      // until they walk to it. Checked before the stacks are spent, since the brand is the cost.
      if (stacks >= STYX_MAX && this.up(owner, 'e')) this.flingWeapon(owner, t, ang);
      this.marks[owner].delete(t);
      this.stun(t, ms);
      this.fx(owner).brand(t.x, t.y, 26, 10);
    }

    // Unconditional, and deliberately so: it is the reason the cleave is worth pressing into an
    // empty room or into somebody you have not managed to brand yet.
    s.hasteUntil = this.now + DISARM_HASTE_MS;
    this.api.showFloatingText(f.x, f.y - 46, '🌀 QUICKENED +30%', this.hex(DEA.after));
    Sfx.playAt('status-haste', f.x, { volume: 0.7, rate: 0.9 });
    if (hits === 0) this.api.showFloatingText(f.x, f.y - 62, '🗡️ NOTHING THERE', this.hex(DEA.pale));
  }

  /**
   * R — Riposte. Three seconds of holding the blade out along the cursor. Anything that reaches
   * the steel is cut in two and the two pieces leave at over sixty degrees off the line they
   * came in on, which is far enough that neither can come back around onto him.
   */
  doRiposte(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    s.guardUntil = this.now + RIPOSTE_MS;
    // Everything the blade eats from here is weighed at the end: a fifth of it comes back out
    // of the floor as a slow when the guard drops. Only a guard drawn from a full sheath owes
    // that wave, so the tally is reset either way and read only if it was powered.
    s.guardPowered = this.drawBlade(owner);
    s.guardBlocked = 0;

    this.avatar(owner)?.play('punch', Math.atan2(ty - f.y, tx - f.x));
    this.api.showFloatingText(f.x, f.y - 46, s.guardPowered ? '🗡️ RIPOSTE — DRAWN' : '🗡️ RIPOSTE',
      this.hex(s.guardPowered ? DEA.edge : DEA.blade));
    Sfx.playAt('clang', f.x, { volume: 0.7, rate: s.guardPowered ? 0.55 : 0.7 });
  }

  /**
   * F — Amputate. A dash to the cursor that deals no damage and takes a piece of everything it
   * goes through instead. Two limbs is all any body has to give for the whole game, so this is
   * an ability with exactly two presses of consequence in it — and neither of them is undone by
   * healing, by a new round of the minute, or by anything else in the game.
   *
   * The limb is chosen before the dash leaves (`nextLimb`), because "which one" is the entire
   * decision: legs are how fast they close on you, arms are how often and how hard they swing.
   */
  doAmputate(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    if (s.deal?.phase === 'shake' || s.dash) { f.resetCooldown('death-amputate'); return; }

    const limb = s.nextLimb ?? this.pickLimbFor(owner);
    s.nextLimb = null;
    if (!limb) {
      f.resetCooldown('death-amputate');
      this.api.showFloatingText(f.x, f.y - 46, '🦴 NOTHING LEFT TO TAKE', this.hex(DEA.pale));
      return;
    }

    const powered = this.drawBlade(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const reach = Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, tx, ty), AMP_MIN, AMP_REACH);
    s.dash = {
      powered,
      x0: f.x,
      y0: f.y,
      x1: Phaser.Math.Clamp(f.x + Math.cos(ang) * reach, this.left + 16, this.right - 16),
      y1: Phaser.Math.Clamp(f.y + Math.sin(ang) * reach, this.top + 16, this.bottom - 16),
      startedAt: this.now,
      endsAt: this.now + AMP_MS,
      limb,
      hit: new Set(),
      took: 0,
      seed: Math.random() * 999,
    };
    if (owner === 'player') this.syncDodgeClaim();

    this.avatar(owner)?.play('sweep', ang);
    this.fx(owner).sweep(f.x, f.y, ang, 0.5, 90, 320, 10, DEA.blade);
    this.api.showFloatingText(f.x, f.y - 46, `🗡️ ${LIMB_EMOJI[limb]} ${LIMB_LABEL[limb]}`, this.hex(DEA.blade));
    Sfx.playAt('slash', f.x, { volume: 1, rate: 1.15 });
  }

  /** The bot's choice, and the fallback if a cast somehow arrives with nothing queued. */
  private pickLimbFor(owner: Owner): Limb | null {
    const v = this.primaryVictim(owner) ?? this.api.getNearestEnemy(this.fighter(owner).x, this.fighter(owner).y);
    if (!this.alive(v)) return null;
    const gone = this.limbsGone(v as Fighter);
    if (gone.size >= AMP_MAX) return null;
    // Legs first. A body that cannot close the distance cannot beat the clock, which is the
    // only thing the bot is actually playing for.
    return LIMBS.slice().sort((a, b) => Number(isLeg(b)) - Number(isLeg(a))).find((l) => !gone.has(l)) ?? null;
  }

  /**
   * Take one. Returns false when there was nothing to take, so the dash can report an honest
   * "nothing left" rather than silently doing nothing.
   */
  private amputate(owner: Owner, victim: Fighter, wanted: Limb): boolean {
    let set = this.amputations.get(victim);
    if (!set) { set = new Set<Limb>(); this.amputations.set(victim, set); }
    if (set.size >= AMP_MAX) {
      this.api.showFloatingText(victim.x, victim.y - 44, '🦴 NOTHING LEFT', this.hex(DEA.pale));
      return false;
    }
    // The chosen side is already gone (a second body, or a menu opened before the first cut):
    // take its pair rather than wasting the whole cast on a bookkeeping detail.
    let limb = wanted;
    if (set.has(limb)) {
      const alt = LIMBS.find((l) => isLeg(l) === isLeg(wanted) && !set.has(l));
      if (!alt) {
        this.api.showFloatingText(victim.x, victim.y - 44, '🦴 BOTH ALREADY GONE', this.hex(DEA.pale));
        return false;
      }
      limb = alt;
    }
    set.add(limb);

    const { arms, legs } = this.limbCounts(victim);
    // Written once and left alone: an amputation is not a timer, and nothing hands it back
    // before `reset`. The speed and the damage cut are pulled instead — see `speedMultFor`
    // and `updateMirror`.
    victim.amputationCooldownMult = AMP_ARM_CD[arms];
    this.ampTouched.add(victim);

    const ang = Math.atan2(victim.y - this.fighter(owner).y, victim.x - this.fighter(owner).x);
    this.fx(owner).amputate(victim.x, victim.y, ang, isLeg(limb));
    this.api.spawnHitFlash(victim.x, victim.y, DEA.blood);
    this.api.showFloatingText(victim.x, victim.y - 56, `🗡️ ${LIMB_EMOJI[limb]} ${LIMB_LABEL[limb]} TAKEN`, this.hex(DEA.blood));
    const lines: string[] = [];
    if (legs > 0) lines.push(`−${Math.round((1 - AMP_LEG_SPEED[legs]) * 100)}% SPEED`);
    if (arms > 0) {
      lines.push(`+${Math.round((AMP_ARM_CD[arms] - 1) * 100)}% COOLDOWNS`);
      lines.push(`−${Math.round((1 - AMP_ARM_DMG[arms]) * 100)}% DAMAGE`);
    }
    this.api.showFloatingText(victim.x, victim.y - 38, lines.join(' · '), this.hex(DEA.bone));
    if (set.size >= AMP_MAX) {
      this.api.showFloatingText(victim.x, victim.y - 20, 'NOTHING MORE TO TAKE', this.hex(DEA.pale));
    }
    Sfx.playAt('slash', victim.x, { volume: 1, rate: 0.55 });
    Sfx.playAt('death-npc', victim.x, { volume: 0.5, rate: 1.3 });
    return true;
  }

  /** The dash itself. The kit owns the body for its whole 230ms — see `syncDodgeClaim`. */
  private updateDashes(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const d = s.dash;
      if (!d) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.dash = null; continue; }

      const k = Phaser.Math.Clamp((this.now - d.startedAt) / (d.endsAt - d.startedAt), 0, 1);
      // Ease out: he arrives at speed and stops, rather than coasting into the last few pixels.
      const e = 1 - (1 - k) * (1 - k);
      const x = d.x0 + (d.x1 - d.x0) * e;
      const y = d.y0 + (d.y1 - d.y0) * e;
      f.setPosition(x, y);
      this.body(f).reset(x, y);

      for (const t of this.targetsOf(owner)) {
        if (d.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > AMP_HIT_R + 14 * t.sizeMult) continue;
        d.hit.add(t);
        if (this.amputate(owner, t, d.limb)) d.took++;
        // Exsanguination is paid for by the *pass*, not by the limb: a body with nothing left
        // to take is still opened up by a blade going through it.
        if (d.powered) this.openBleed(owner, t);
      }

      if (k < 1) continue;
      s.dash = null;
      if (d.took === 0 && d.hit.size === 0) {
        this.api.showFloatingText(f.x, f.y - 46, '🗡️ CUT NOTHING', this.hex(DEA.pale));
      }
      this.fx(owner).soot(f.x, f.y, 6, 20, 460, 9);
    }
    this.syncDodgeClaim();
  }

  /**
   * Q — Deal with Death. He appears next to them, shakes their hand, and leaves — and then has
   * ten seconds to prove he did not need to be there. Nothing about the ten seconds is
   * defensive by accident: the speed and the dodge exist to make surviving them possible, and
   * the reward is the only thing in the kit that moves the clock.
   */
  doDeal(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    // Mid-dash the kit is already driving this body to somewhere specific.
    if (s.deal || s.dash) { f.resetCooldown('death-deal'); return; }

    const v = this.primaryVictim(owner) ?? this.api.getNearestEnemy(f.x, f.y);
    if (!this.alive(v)) {
      f.resetCooldown('death-deal');
      this.api.showFloatingText(f.x, f.y - 46, '🤝 NOBODY TO DEAL WITH', this.hex(DEA.pale));
      return;
    }
    const victim = v as Fighter;

    // ── Appear beside them ──
    const fx = this.fx(owner);
    fx.vanish(f.x, f.y, 30, 380, 10, false);
    const ang = Math.atan2(f.y - victim.y, f.x - victim.x);
    const ax = Phaser.Math.Clamp(victim.x + Math.cos(ang) * DEAL_APPROACH, this.left + 20, this.right - 20);
    const ay = Phaser.Math.Clamp(victim.y + Math.sin(ang) * DEAL_APPROACH, this.top + 20, this.bottom - 20);
    f.setPosition(ax, ay);
    this.body(f).reset(ax, ay);
    fx.vanish(ax, ay, 30, 380, 10, true);

    const powered = this.drawBlade(owner);
    s.deal = {
      phase: 'shake',
      victim,
      shakeUntil: this.now + DEAL_SHAKE_MS,
      endsAt: 0,
      rawAt0: f.rawDamageTaken,
      // A bargain struck with the blade still in the saya is a more generous one.
      toll: powered ? SHEATH_DEAL_TOLL : DEAL_TOLL,
      grim: this.up(owner, 'q'),
    };
    if (owner === 'player') this.syncDodgeClaim();
    // True Grimdark: the arms and the face come out with him, and go back in when the ten
    // seconds are over however they end.
    if (s.deal.grim) this.wearMask(owner);

    this.avatar(owner)?.play('punch', Math.atan2(victim.y - ay, victim.x - ax));
    this.api.showFloatingText(ax, ay - 50, '🤝 DEAL WITH DEATH', this.hex(DEA.gold));
    if (powered) this.api.showFloatingText(ax, ay - 66, `🗡️ DRAWN — ${SHEATH_DEAL_TOLL} DMG ALLOWED`, this.hex(DEA.edge));
    Sfx.playAt('judgement', ax, { volume: 0.9, rate: 0.7 });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.api.elementId === 'death';
    const npcIs = this.api.npcElementId === 'death';
    // Not an optimisation — a safety catch. A fighter who stops being Death mid-handshake still
    // has a body the kit is holding still, and only this loop ever hands it back.
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateSides(time, delta, playerIs, npcIs);
    this.updateClocks(delta, playerIs, npcIs);
    this.updateSheath();
    this.updateVolleys();
    this.updateShots(delta);
    this.updateHalves(delta);
    this.updateAfterimages();
    this.updateMarks();
    this.updateGuards();
    this.updateDashes();
    this.updateDeals();
    this.updateStuns();
    this.updateWeapons();
    this.updateDishonor();
    this.updateDishonorTimers();
    this.updateShocks();
    this.updateBleeds();
    this.updateShoves(delta);
    this.updateGrimdark();
    // Before the mirror and before anything reads `amped`: standing in the gashes is what
    // decides how bad every other number in this kit is this frame.
    this.updateCuts();
    this.updateMirror();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintClock(playerIs, npcIs);
    this.paintPicker(playerIs);
    this.pushStatuses(playerIs, npcIs);
  }

  /**
   * Anything of this kit's still standing in the world, whoever is currently Death. Amputations
   * count: they outlive the reaper who made them, and the stumps have to keep being drawn.
   */
  private hasLiveState(): boolean {
    return this.shots.length > 0 || this.halves.length > 0 || this.afterimages.length > 0
      || this.stunned.size > 0 || this.touched.size > 0 || this.amputations.size > 0
      || this.weapons.length > 0 || this.cuts.length > 0 || this.scars.length > 0
      || this.shoves.length > 0
      || BOTH.some((o) => this.marks[o].size > 0 || !!this.sides[o].deal
        || !!this.sides[o].dash || this.sides[o].dodgeApplied || !!this.sides[o].volley
        || !!this.sides[o].maskOn || this.bleeds[o].size > 0 || this.dishonor[o].size > 0
        || this.shocks[o].size > 0);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Everything he stands in goes under them; the blade, the shots and
    // the nooses go over, because a katana that passes behind a body stops being a threat.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(8);
  }

  private updateSides(time: number, delta: number, playerIs: boolean, npcIs: boolean): void {
    void time;
    void delta;
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const s = this.sides[owner];
      if (is) continue;
      // Stopped being Death mid-match (Magic borrowing the element, a fresh round sharing the
      // kit): everything he was holding open closes. A running deal is exempt — it has a body
      // parked somewhere and a dodge bonus to hand back, and `updateDeals` does that.
      s.guardUntil = 0;
      s.hasteUntil = 0;
      s.nextLimb = null;
      s.sheathed = false;
      s.volley = null;
      s.guardPowered = false;
      s.guardBlocked = 0;
      this.marks[owner].clear();
      if (owner === 'player') this.picking = false;
    }
    this.syncDodgeClaim();
  }

  // ── Midnight ───────────────────────────────────────────────────────────────

  /**
   * The passive. One minute of match time per side, counted down only while that side is alive
   * and actually Death — a reaper who has been killed has stopped being anybody's problem.
   */
  private updateClocks(delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const s = this.sides[owner];
      if (!is) { s.clockMs = MIDNIGHT_MS; s.clockSpent = false; s.lastToll = 999; continue; }
      if (s.clockSpent) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;

      s.clockMs = Math.max(0, s.clockMs - delta);
      const secs = Math.ceil(s.clockMs / 1000);
      const mark = TOLL_MARKS.find((m) => m === secs);
      if (mark !== undefined && mark < s.lastToll) {
        s.lastToll = mark;
        const mine = owner === 'player';
        this.fx(owner).toll(f.x, f.y, 16, 70 + (30 - Math.min(30, mark)) * 2, 520, 10,
          mine ? DEA.gold : DEA.blood);
        this.api.showFloatingText(f.x, f.y - 58, `🕛 ${mark}`, this.hex(mine ? DEA.gold : DEA.blood));
        Sfx.playAt('clock-tick', f.x, { volume: 0.5 + (1 - mark / 30) * 0.4, rate: 0.7 + (1 - mark / 30) * 0.6 });
      }

      if (s.clockMs > 0) continue;
      this.strikeMidnight(owner);
    }
  }

  /** Twelve. Whoever this side is fighting stops existing. */
  private strikeMidnight(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const victim = this.primaryVictim(owner);
    if (!victim) {
      // Nobody standing there to collect from. Give it a second and ask again rather than
      // burning the passive on an empty arena.
      s.clockMs = 1000;
      return;
    }

    const fx = this.fx(owner);
    fx.reap(victim.x, victim.y, 120, 900, 12);
    fx.toll(f.x, f.y, 10, 220, 900, 11, DEA.blood);
    this.api.spawnHitFlash(victim.x, victim.y, DEA.blood);
    this.api.showFloatingText(victim.x, victim.y - 60, '🕛 MIDNIGHT', this.hex(DEA.blood));
    Sfx.playAt('judgement', victim.x, { volume: 1, rate: 0.55 });
    Sfx.playAt('death-npc', victim.x, { volume: 0.9, rate: 0.7 });

    // Pierce so no invincibility window can hold it off, `netApplied` so an online replica's
    // authoritative-damage gate lets it through and relays it — the same execute route
    // Passion's charm uses, and the only one that actually kills across the wire.
    victim.takeDamage(Math.max(1, victim.hp), { pierce: true, netApplied: true });

    // A wave is not one person: in Invasion the minute simply starts again.
    if (this.api.isInvasion && owner === 'player') {
      s.clockMs = MIDNIGHT_MS;
      s.lastToll = 999;
      return;
    }
    s.clockSpent = true;
  }

  // ── Styx Shot ──────────────────────────────────────────────────────────────

  private updateShots(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.spin += STYX_SPIN * dt;

      let spent = false;
      for (const t of this.targetsOf(sh.owner)) {
        if (Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) > STYX_HIT_R + 12 * t.sizeMult) continue;
        this.brand(sh.owner, t);
        spent = true;
        break;
      }

      const gone = spent || this.now >= sh.diesAt
        || sh.x < this.left || sh.x > this.right || sh.y < this.top || sh.y > this.bottom;
      if (!gone) continue;
      if (!spent) this.fx(sh.owner).soot(sh.x, sh.y, 3, 12, 380, 9);
      if (sh.reg) this.api.projectileRegistry.remove(sh.reg);
      this.shots.splice(i, 1);
    }
  }

  private brand(owner: Owner, victim: Fighter): void {
    const cur = this.markOn(owner, victim);
    const stacks = Math.min(STYX_MAX, (cur?.stacks ?? 0) + 1);
    this.marks[owner].set(victim, { stacks, until: this.now + STYX_MS });

    const pct = Math.round(STYX_STEP * stacks * 100);
    this.fx(owner).brand(victim.x, victim.y, 24, 10);
    this.api.spawnHitFlash(victim.x, victim.y, DEA.styx);
    this.api.showFloatingText(victim.x, victim.y - 40, `🌊 STYX ×${stacks}`, this.hex(DEA.styx));
    this.api.showFloatingText(victim.x, victim.y - 24, `−${pct}% SPEED · −${pct}% DAMAGE`, this.hex(DEA.deep));
    Sfx.playAt('status-slow', victim.x, { volume: 0.6, rate: 1 + stacks * 0.12 });
  }

  private updateMarks(): void {
    for (const owner of BOTH) {
      for (const [victim, m] of [...this.marks[owner]]) {
        if (!this.alive(victim) || this.now >= m.until) this.marks[owner].delete(victim);
      }
    }
  }

  // ── Disarm's stun ──────────────────────────────────────────────────────────

  /**
   * `earthStunnedUntil` is what husk AI and ArenaScene's own npc override already read, but
   * nothing consumes it for the *player* — so the kit pins the velocity itself, exactly as
   * Hunt, Fate and Paper do. `applyDisarm` is what stops them casting out of it.
   */
  private stun(t: Fighter, ms: number): void {
    if (t.unstoppable) return;
    const until = this.now + ms;
    t.earthStunnedUntil = Math.max(t.earthStunnedUntil, until);
    t.applyDisarm(ms);
    this.stunned.set(t, Math.max(this.stunned.get(t) ?? 0, until));
    this.api.showFloatingText(t.x, t.y - 40, `💫 DISARMED ${(ms / 1000).toFixed(0)}s`, this.hex(DEA.after));
  }

  private updateStuns(): void {
    for (const [t, until] of [...this.stunned]) {
      if (!this.alive(t) || this.now >= until || t.unstoppable) { this.stunned.delete(t); continue; }
      this.body(t).setVelocity(0, 0);
    }
  }

  // ── Riposte ────────────────────────────────────────────────────────────────

  /** Where the blade is right now for a guarding side: base and tip, in world space. */
  private guardSegment(owner: Owner): { ax: number; ay: number; bx: number; by: number; ang: number } | null {
    const s = this.sides[owner];
    if (this.now >= s.guardUntil) return null;
    const f = this.fighter(owner);
    if (!this.alive(f)) return null;
    const ang = owner === 'player'
      ? Math.atan2(s.aimY - f.y, s.aimX - f.x)
      : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
    return {
      ax: f.x + Math.cos(ang) * RIPOSTE_NEAR,
      ay: f.y + Math.sin(ang) * RIPOSTE_NEAR,
      bx: f.x + Math.cos(ang) * RIPOSTE_FAR,
      by: f.y + Math.sin(ang) * RIPOSTE_FAR,
      ang,
    };
  }

  private updateGuards(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      // The guard has just dropped and it was drawn from a full sheath: everything it ate comes
      // back out of the floor. Checked before the segment, which no longer exists by now.
      if (s.guardPowered && this.now >= s.guardUntil) this.releaseShock(owner);

      const seg = this.guardSegment(owner);
      if (!seg) continue;
      const mineIsPlayer = owner === 'player';

      // The shared physics group. Copied first: destroying out of the live array mid-loop
      // steps over whatever slid into the gap.
      for (const obj of this.api.projectiles.getChildren().slice()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        if (this.distToSegment(p.x, p.y, seg.ax, seg.ay, seg.bx, seg.by) > RIPOSTE_R) continue;
        const b = p.body as Phaser.Physics.Arcade.Body | null;
        const inAng = b && (b.velocity.x || b.velocity.y)
          ? Math.atan2(b.velocity.y, b.velocity.x)
          : seg.ang + Math.PI;
        // What that shot was worth, banked for the parting wave. Counted whether or not this
        // guard was powered — the tally is cheap and the flag decides if it is ever read.
        s.guardBlocked += Math.max(0, p.damage);
        this.cleave(owner, p.x, p.y, inAng);
        p.destroy();
      }

      // ...and the half of the game's shots that never join a group.
      const theirs: Owner = this.other(owner);
      const midX = (seg.ax + seg.bx) / 2;
      const midY = (seg.ay + seg.by) / 2;
      const reach = (RIPOSTE_FAR - RIPOSTE_NEAR) / 2 + RIPOSTE_R;
      for (const rp of this.api.projectileRegistry.within(theirs, midX, midY, reach)) {
        const px = rp.getX();
        const py = rp.getY();
        if (this.distToSegment(px, py, seg.ax, seg.ay, seg.bx, seg.by) > RIPOSTE_R) continue;
        // No velocity handle out here, so the incoming line is taken from the geometry: it was
        // on its way to the blade, which is all the cleave needs to know.
        s.guardBlocked += Math.max(0, rp.damage);
        this.cleave(owner, px, py, Math.atan2(seg.ay - py, seg.ax - px));
        this.api.projectileRegistry.steal(rp);
      }
    }
  }

  /** One shot becomes two pieces of a shot, thrown wide to either side. */
  private cleave(owner: Owner, x: number, y: number, inAng: number): void {
    const f = this.fighter(owner);
    for (const side of [1, -1] as const) {
      const a = inAng + side * RIPOSTE_DEFLECT;
      this.halves.push({
        owner,
        // Offset onto its own side of the blade before it starts moving, so the two pieces are
        // visibly separating from the first frame rather than overlapping and then splitting.
        x: x + Math.cos(inAng + side * (Math.PI / 2)) * 5,
        y: y + Math.sin(inAng + side * (Math.PI / 2)) * 5,
        vx: Math.cos(a) * HALF_SPEED,
        vy: Math.sin(a) * HALF_SPEED,
        ang: a,
        spin: side * (3 + Math.random() * 4),
        side,
        seed: Math.random() * 999,
        diesAt: this.now + HALF_LIFE_MS,
        color: DEA.pale,
      });
    }
    this.fx(owner).spark(x, y, inAng);
    this.api.showFloatingText(x, y - 20, '🗡️ CUT', this.hex(DEA.blade));
    Sfx.playAt('clang', f.x, { volume: 0.55, rate: 1.35 });
  }

  private updateAfterimages(): void {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      if (this.now >= this.afterimages[i].diesAt) this.afterimages.splice(i, 1);
    }
  }

  private updateHalves(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.ang += h.spin * dt;
      if (this.now < h.diesAt) continue;
      this.halves.splice(i, 1);
    }
  }

  // ── Deal with Death ────────────────────────────────────────────────────────

  private updateDeals(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const d = s.deal;
      if (!d) continue;
      const f = this.fighter(owner);

      if (!this.alive(f)) { this.endDeal(owner, false, true); continue; }

      if (d.phase === 'shake') {
        // He is standing still with his hand out. The enemy is not held — the handshake is a
        // formality, not a grab, and taking their turn away would make Q a stun as well.
        this.body(f).setVelocity(0, 0);
        if (this.now < d.shakeUntil) continue;
        this.settleDeal(owner);
        continue;
      }

      // The dodge is a sustained 33%, not a charge: `rollDodge` spends 0.2 every time it saves
      // him, so it is topped back up each frame for as long as the deal is running.
      if (s.dodgeApplied && f.dodgeChance < DEAL_DODGE) f.dodgeChance = DEAL_DODGE;
      if (this.now < d.endsAt) continue;

      const taken = Math.max(0, f.rawDamageTaken - d.rawAt0);
      this.endDeal(owner, taken < d.toll, false);
    }
  }

  /** The handshake is over: he leaves, and the ten seconds start. */
  private settleDeal(owner: Owner): void {
    const s = this.sides[owner];
    const d = s.deal;
    if (!d) return;
    const f = this.fighter(owner);
    const fx = this.fx(owner);

    const away = this.alive(d.victim)
      ? Math.atan2(f.y - d.victim.y, f.x - d.victim.x)
      : Math.random() * Math.PI * 2;
    const anchorX = this.alive(d.victim) ? d.victim.x : f.x;
    const anchorY = this.alive(d.victim) ? d.victim.y : f.y;
    const rx = Phaser.Math.Clamp(anchorX + Math.cos(away) * DEAL_RETREAT, this.left + 24, this.right - 24);
    const ry = Phaser.Math.Clamp(anchorY + Math.sin(away) * DEAL_RETREAT, this.top + 24, this.bottom - 24);

    fx.vanish(f.x, f.y, 30, 380, 10, false);
    f.setPosition(rx, ry);
    this.body(f).reset(rx, ry);
    fx.vanish(rx, ry, 30, 380, 10, true);

    d.phase = 'settled';
    d.endsAt = this.now + DEAL_MS;
    // The clock on the bargain starts when he lets go of their hand, not when he arrived —
    // damage taken during the handshake itself is not part of the deal.
    d.rawAt0 = f.rawDamageTaken;
    f.dodgeChance += DEAL_DODGE;
    s.dodgeApplied = true;
    if (owner === 'player') this.syncDodgeClaim();

    this.avatar(owner)?.play('flex');
    this.api.showFloatingText(rx, ry - 50, '🤝 STRUCK', this.hex(DEA.gold));
    this.api.showFloatingText(rx, ry - 32, `+33% SPEED · +33% DODGE · <${d.toll} DMG`, this.hex(DEA.bone));
    Sfx.playAt('teleport', rx, { volume: 0.85, rate: 0.75 });
  }

  private endDeal(owner: Owner, honoured: boolean, aborted: boolean): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.deal = null;
    // The arms go back in with the bargain, whichever way it ended.
    this.dropMask(owner);
    if (owner === 'player') this.syncDodgeClaim();
    if (s.dodgeApplied) {
      if (f?.active) f.dodgeChance = Math.max(0, f.dodgeChance - DEAL_DODGE);
      s.dodgeApplied = false;
    }
    if (aborted || !this.alive(f)) return;

    if (!honoured) {
      this.api.showFloatingText(f.x, f.y - 46, '☠️ DEAL BROKEN', this.hex(DEA.blood));
      this.fx(owner).soot(f.x, f.y, 10, 30, 620, 10);
      Sfx.playAt('status-expire', f.x, { volume: 0.8, rate: 0.7 });
      return;
    }

    s.clockMs = Math.max(0, s.clockMs - DEAL_REWARD_MS);
    s.lastToll = 999;
    this.fx(owner).toll(f.x, f.y, 14, 150, 720, 11, DEA.gold);
    this.api.showFloatingText(f.x, f.y - 50, '🕛 DEAL HONOURED', this.hex(DEA.gold));
    this.api.showFloatingText(f.x, f.y - 32, '−10s TO MIDNIGHT', this.hex(DEA.blood));
    Sfx.playAt('clock-tick', f.x, { volume: 0.95, rate: 0.5 });
  }

  // ── Sheath (Click upgrade) ─────────────────────────────────────────────────

  /**
   * The three seconds. Nothing charges it but patience: every cast in the kit runs through
   * `drawBlade`, so the clock restarts on a whiff exactly as it does on a kill.
   */
  private updateSheath(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!this.isDeath(owner) || !this.up(owner, 'click')) { s.sheathed = false; continue; }
      const f = this.fighter(owner);
      if (!this.alive(f) || s.sheathed) continue;
      if (this.now - s.lastDrawAt < SHEATH_MS) continue;
      s.sheathed = true;
      this.fx(owner).spark(f.x, f.y + 6, Math.PI);
      this.api.showFloatingText(f.x, f.y - 46, '🗡️ SHEATHED', this.hex(DEA.edge));
      Sfx.playAt('clang', f.x, { volume: 0.5, rate: 1.9 });
    }
  }

  /** 0–1, for the saya's charge line and the tray. */
  private sheathCharge(owner: Owner): number {
    const s = this.sides[owner];
    if (s.sheathed) return 1;
    return Phaser.Math.Clamp((this.now - s.lastDrawAt) / SHEATH_MS, 0, 1);
  }

  // ── Knockback ──────────────────────────────────────────────────────────────

  /**
   * Both movement systems rewrite a fighter's velocity every frame, so a knockback handed to
   * the physics body is gone before it renders. Played out as position instead — the same shape
   * Magma's Shove uses, and for the same reason.
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

  private updateShoves(delta: number): void {
    if (!this.shoves.length) return;
    const dt = delta / 1000;
    for (const s of this.shoves) {
      const t = s.target;
      if (!t || !t.active) continue;
      // Eases out over its life, so a shove decelerates instead of stopping dead.
      const left = Phaser.Math.Clamp((s.until - this.now) / SHOVE_MS, 0, 1);
      t.setPosition(
        Phaser.Math.Clamp(t.x + s.vx * dt * left * 2, this.left + 12, this.right - 12),
        Phaser.Math.Clamp(t.y + s.vy * dt * left * 2, this.top + 12, this.bottom - 12),
      );
    }
    this.shoves = this.shoves.filter((s) => s.until > this.now && s.target?.active);
  }

  // ── Disarmed (E upgrade) ───────────────────────────────────────────────────

  /**
   * Three brands and a cleave, and the thing they were fighting with leaves their hands. Nobody
   * in this game is holding a weapon, so what comes out is a core of their own element — and
   * until they physically walk to it and pick it up, none of their five keys do anything.
   *
   * A single core per body: a second Disarm on somebody who is already unarmed has nothing left
   * to throw, and re-throwing the same one would only move their errand further away for free.
   */
  private flingWeapon(owner: Owner, victim: Fighter, ang: number): void {
    if (this.weapons.some((w) => w.victim === victim)) return;
    const a = ang + (Math.random() - 0.5) * 0.8;
    const x1 = Phaser.Math.Clamp(victim.x + Math.cos(a) * WEAPON_THROW, this.left + 24, this.right - 24);
    const y1 = Phaser.Math.Clamp(victim.y + Math.sin(a) * WEAPON_THROW, this.top + 24, this.bottom - 24);
    this.weapons.push({
      owner,
      victim,
      x: victim.x,
      y: victim.y,
      x0: victim.x,
      y0: victim.y,
      x1,
      y1,
      bornAt: this.now,
      landsAt: this.now + WEAPON_FLIGHT_MS,
      seed: Math.random() * 999,
      color: this.api.elementColorOf(victim === this.api.player ? 'player' : 'npc'),
    });

    this.fx(owner).spark(victim.x, victim.y, ang);
    this.api.showFloatingText(victim.x, victim.y - 52, '🗡️ WEAPON TAKEN', this.hex(DEA.after));
    this.api.showFloatingText(victim.x, victim.y - 36, 'GO AND GET IT', this.hex(DEA.pale));
    Sfx.playAt('clang', victim.x, { volume: 1, rate: 0.9 });
  }

  /**
   * The core in flight and then on the floor. The disarm is re-applied every frame rather than
   * given a duration: this is not a timer, it is a state, and it ends when they are standing on
   * top of the thing.
   */
  private updateWeapons(): void {
    for (let i = this.weapons.length - 1; i >= 0; i--) {
      const w = this.weapons[i];
      if (!this.alive(w.victim)) { this.weapons.splice(i, 1); continue; }

      const k = Phaser.Math.Clamp((this.now - w.bornAt) / (w.landsAt - w.bornAt), 0, 1);
      const e = 1 - (1 - k) * (1 - k);
      w.x = w.x0 + (w.x1 - w.x0) * e;
      w.y = w.y0 + (w.y1 - w.y0) * e;

      // Still theirs to reach, so still not theirs to use.
      w.victim.applyDisarm(WEAPON_DISARM_TICK);

      if (k < 1) continue;
      if (Phaser.Math.Distance.Between(w.x, w.y, w.victim.x, w.victim.y)
        > WEAPON_PICKUP_R + 12 * w.victim.sizeMult) continue;

      this.weapons.splice(i, 1);
      // Handed straight back: the frame after this one is the first they can cast in.
      w.victim.disarmedUntil = 0;
      this.api.spawnHitFlash(w.victim.x, w.victim.y, w.color);
      this.api.showFloatingText(w.victim.x, w.victim.y - 44, '🗡️ REARMED', this.hex(DEA.bone));
      Sfx.playAt('clang', w.victim.x, { volume: 0.8, rate: 1.25 });
    }
  }

  // ── Dishonor (R upgrade) ───────────────────────────────────────────────────

  /**
   * A shot that ends on the stone was never aimed at anybody. Every one costs its owner 2% of
   * their damage for twenty seconds, and the wall keeps the mark for exactly as long.
   *
   * Detected here rather than at a projectile chokepoint because there isn't one: ArenaScene
   * culls a shot 60px outside the world bounds with no hook, so the kit catches them on the
   * frame they reach the inner face — this update runs before that cull — and **destroys** it
   * there. Ending the shot on the stone is what makes it a wall hit rather than a fly-past, and
   * it is also what stops the same shot billing them twice: a flag would not survive the group
   * recycling a dead member into the next bullet.
   *
   * The velocity test is the other half of it. A fighter is clamped to these same bounds, so a
   * shot fired *from* the wall starts inside the band — only one travelling into the stone has
   * actually missed anything.
   */
  private updateDishonor(): void {
    const wb = this.api.scene.physics.world.bounds;
    for (const owner of BOTH) {
      if (!this.isDeath(owner) || !this.up(owner, 'r')) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const mineIsPlayer = owner === 'player';

      // Copied: the loop destroys out of the live array.
      for (const obj of this.api.projectiles.getChildren().slice()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        const b = p.body as Phaser.Physics.Arcade.Body | null;
        const vx = b?.velocity.x ?? 0;
        const vy = b?.velocity.y ?? 0;
        // Which face it reached, and which way the cracks should run out of the crater.
        let inAng: number | null = null;
        if (p.x <= wb.left + WALL_THICK && vx < -20) inAng = 0;
        else if (p.x >= wb.right - WALL_THICK && vx > 20) inAng = Math.PI;
        else if (p.y <= wb.top + WALL_THICK && vy < -20) inAng = Math.PI / 2;
        else if (p.y >= wb.bottom - WALL_THICK && vy > 20) inAng = -Math.PI / 2;
        if (inAng === null) continue;
        // A body is clamped to these same bounds, so a reaper standing against the stone has
        // incoming shots arriving *inside* the band. Those are hits about to land, not misses,
        // and eating them here would turn wall-hugging into blanket immunity.
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < 44 + 14 * f.sizeMult) continue;

        this.markDishonor(owner, p.x, p.y, inAng);
        p.destroy();
      }
    }
  }

  /** One miss: a scar on the wall, and a stack on whoever fired it. */
  private markDishonor(owner: Owner, x: number, y: number, inAng: number): void {
    // No attacker reference on a projectile, so the bill goes to the body the clock is counting
    // down for — the opponent in a duel, and the healthiest husk in a wave.
    const shooter = this.primaryVictim(owner);
    if (!this.alive(shooter)) return;
    const victim = shooter as Fighter;

    const list = this.dishonor[owner].get(victim) ?? [];
    list.push(this.now + DISHONOR_MS);
    this.dishonor[owner].set(victim, list);

    this.scars.push({ x, y, inAng, bornAt: this.now, diesAt: this.now + DISHONOR_MS, seed: Math.random() * 999 });
    if (this.scars.length > SCAR_MAX) this.scars.shift();

    this.fx(owner).spark(x, y, inAng + Math.PI);
    this.api.spawnHitFlash(x, y, DEA.blood);
    const pct = Math.round(DISHONOR_STEP * list.length * 100);
    this.api.showFloatingText(x, y - 18, `⚖️ DISHONOR ×${list.length}`, this.hex(DEA.blood));
    this.api.showFloatingText(victim.x, victim.y - 42, `−${pct}% DAMAGE`, this.hex(DEA.ash));
    Sfx.playAt('clang', x, { volume: 0.45, rate: 0.6 });
  }

  private updateDishonorTimers(): void {
    for (const owner of BOTH) {
      for (const [victim, list] of [...this.dishonor[owner]]) {
        const live = list.filter((until) => this.now < until);
        if (!live.length || !this.alive(victim)) this.dishonor[owner].delete(victim);
        else this.dishonor[owner].set(victim, live);
      }
    }
    for (let i = this.scars.length - 1; i >= 0; i--) {
      if (this.now >= this.scars[i].diesAt) this.scars.splice(i, 1);
    }
  }

  /** Live stacks `owner` has on `f`. */
  private dishonorOn(owner: Owner, f: Fighter): number {
    return (this.dishonor[owner].get(f) ?? []).filter((until) => this.now < until).length;
  }

  // ── The parting wave (powered Riposte) ─────────────────────────────────────

  /**
   * The guard drops and everything the blade ate comes back out of the floor as a drag. It
   * deals nothing — a fifth of the damage those shots would have done is taken out of their
   * legs for three seconds instead, which is the whole trade: they spent that magazine on you
   * and it bought them a slow.
   */
  private releaseShock(owner: Owner): void {
    const s = this.sides[owner];
    s.guardPowered = false;
    const blocked = s.guardBlocked;
    s.guardBlocked = 0;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    this.fx(owner).shockwave(f.x, f.y, 24, SHOCK_R);
    Sfx.playAt('clang', f.x, { volume: 0.8, rate: 0.45 });

    const pct = Math.min(SHOCK_MAX, (blocked * SHOCK_PER_DAMAGE) / 100);
    if (pct <= 0) {
      this.api.showFloatingText(f.x, f.y - 46, '🗡️ NOTHING TO GIVE BACK', this.hex(DEA.pale));
      return;
    }
    this.api.showFloatingText(f.x, f.y - 46, `🌊 ${Math.round(blocked)} CUT → −${Math.round(pct * 100)}% SPEED`,
      this.hex(DEA.blade));
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > SHOCK_R + 14 * t.sizeMult) continue;
      this.shocks[owner].set(t, { until: this.now + SHOCK_MS, pct });
      this.api.spawnHitFlash(t.x, t.y, DEA.blade);
      this.api.showFloatingText(t.x, t.y - 38, `🐌 −${Math.round(this.amped(t, pct) * 100)}% SPEED`, this.hex(DEA.blade));
      Sfx.playAt('status-slow', t.x, { volume: 0.7, rate: 0.7 });
    }
  }

  private updateShocks(): void {
    for (const owner of BOTH) {
      for (const [victim, sh] of [...this.shocks[owner]]) {
        if (!this.alive(victim) || this.now >= sh.until) this.shocks[owner].delete(victim);
      }
    }
  }

  // ── Exsanguination (powered Amputate) ──────────────────────────────────────

  private openBleed(owner: Owner, victim: Fighter): void {
    this.bleeds[owner].set(victim, this.now + BLEED_MS);
    this.fx(owner).bleed(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 68, '🩸 EXSANGUINATION 15s', this.hex(DEA.blood));
    Sfx.playAt('status-slow', victim.x, { volume: 0.6, rate: 0.6 });
  }

  private updateBleeds(): void {
    for (const owner of BOTH) {
      for (const [victim, until] of [...this.bleeds[owner]]) {
        if (!this.alive(victim) || this.now >= until) this.bleeds[owner].delete(victim);
      }
    }
  }

  private bleedOn(owner: Owner, f: Fighter): boolean {
    const until = this.bleeds[owner].get(f);
    return until !== undefined && this.now < until;
  }

  // ── Death by 1000 Cuts (F upgrade) ─────────────────────────────────────────

  /**
   * A blade dragged along behind him for the whole match. The gashes deal nothing at all —
   * what standing in them does is make everything *else* that is wrong with you half again as
   * bad, and take a quarter of your speed on top.
   *
   * Two halves: the trail is laid here, and `carved` is rebuilt from scratch every frame so the
   * amplifier is a fact about where a body is standing rather than a status somebody applied.
   */
  private updateCuts(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!this.isDeath(owner) || !this.up(owner, 'f')) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      // Nothing is dropped mid-handshake: he is not walking, he is standing there shaking a hand.
      if (s.deal?.phase === 'shake') continue;
      if (this.now < s.cutNextAt) continue;
      const moved = Phaser.Math.Distance.Between(s.cutLastX, s.cutLastY, f.x, f.y);
      if (moved < CUT_MIN_MOVE) continue;

      const along = Math.atan2(f.y - s.cutLastY, f.x - s.cutLastX);
      s.cutNextAt = this.now + CUT_EVERY_MS;
      s.cutLastX = f.x;
      s.cutLastY = f.y;
      this.cuts.push({
        owner,
        x: f.x,
        y: f.y,
        // Across the path rather than along it: a slash he left, not a skidmark.
        ang: along + Math.PI / 2 + (Math.random() - 0.5) * 0.7,
        bornAt: this.now,
        diesAt: this.now + CUT_LIFE_MS,
        seed: Math.random() * 999,
      });
    }

    for (let i = this.cuts.length - 1; i >= 0; i--) {
      if (this.now >= this.cuts[i].diesAt) this.cuts.splice(i, 1);
    }

    // ── Who is standing in them ──
    const was = new Set(this.carved.keys());
    this.carved.clear();
    for (const cut of this.cuts) {
      for (const t of this.targetsOf(cut.owner)) {
        if (this.carved.has(t)) continue;
        if (Phaser.Math.Distance.Between(cut.x, cut.y, t.x, t.y) > CUT_R + 10 * t.sizeMult) continue;
        this.carved.set(t, cut.owner);
      }
    }

    // ── The amplifier ──
    // Magnitudes are read straight off `carved` (see `amped`). Durations are the other half of
    // "stronger", and there is no central "effect applied" hook to intercept — so the same
    // snapshot diff Creation's Gold Potion uses stretches anything *new* that lands on a body
    // while it is standing in the gashes. Debuffs only: extending an enemy's own regen while
    // they bleed in the cuts would be the opposite of the ability.
    for (const [victim] of this.carved) {
      let snap = this.cutSnapshots.get(victim);
      if (!snap) {
        snap = new Map<string, number>();
        seedEffectSnapshot(victim, snap);
        this.cutSnapshots.set(victim, snap);
        if (!was.has(victim)) {
          this.api.showFloatingText(victim.x, victim.y - 46, '🗡️ CARVED', this.hex(DEA.blade));
          Sfx.playAt('slash', victim.x, { volume: 0.45, rate: 1.4 });
        }
        continue;
      }
      stretchNewEffects(victim, Date.now(), this.now, CUT_AMP, snap, isDebuff);
    }
    for (const victim of [...this.cutSnapshots.keys()]) {
      if (!this.carved.has(victim)) this.cutSnapshots.delete(victim);
    }
  }

  // ── True Grimdark (Q upgrade) ──────────────────────────────────────────────

  /**
   * The mask. Three instances of damage, whatever they were worth — it does not soak, it
   * refuses, and then it comes apart.
   *
   * Installed on `damageAbsorber`, the one hook that sits above every shield in `takeDamage`.
   * The previous owner's absorber is kept and handed back when the deal ends, and the *body* it
   * went onto is remembered rather than looked up again, so a match restart cannot leave one
   * fighter wearing a mask that belongs to a different match.
   */
  private wearMask(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.maskOn || !this.alive(f)) return;
    s.maskOn = f;
    s.maskPrev = f.damageAbsorber;
    s.maskCharges = MASK_CHARGES;
    f.damageAbsorber = (amount: number) => {
      if (s.maskCharges <= 0) return s.maskPrev ? s.maskPrev(amount) : false;
      s.maskCharges--;
      this.fx(owner).spark(f.x, f.y - 12, -Math.PI / 2);
      this.api.showFloatingText(f.x, f.y - 56, `🎭 MASK HELD (${s.maskCharges} LEFT)`, this.hex(DEA.bone));
      Sfx.playAt('shield-block', f.x, { volume: 0.8, rate: 0.75 });
      if (s.maskCharges <= 0) {
        this.fx(owner).maskBreak(f.x, f.y - 8);
        this.api.showFloatingText(f.x, f.y - 72, '🎭 MASK BROKEN', this.hex(DEA.blood));
        Sfx.playAt('shield-break', f.x, { volume: 0.9, rate: 0.7 });
      }
      return true;
    };
    this.fx(owner).soot(f.x, f.y, 10, 26, 620, 10);
    this.api.showFloatingText(f.x, f.y - 66, '🐙 TRUE GRIMDARK', this.hex(DEA.shroud));
    Sfx.playAt('dark-drain', f.x, { volume: 0.9, rate: 0.55 });
  }

  private dropMask(owner: Owner): void {
    const s = this.side(owner);
    if (!s.maskOn) return;
    // Handed back to the body it was taken from, not to whoever is in that slot now.
    if (s.maskOn.active) s.maskOn.damageAbsorber = s.maskPrev;
    s.maskOn = null;
    s.maskPrev = null;
    s.maskCharges = 0;
  }

  /**
   * The arms. Every so often one of them takes a shot out of the air — a grab, not a parry, so
   * unlike Riposte it does not care which way the thing was travelling or how close to a blade
   * it got. Both halves of the game's projectiles are eligible: the shared group, and the
   * registry that the other half never joins.
   */
  private updateGrimdark(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!s.deal?.grim) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      if (this.now < s.grabNextAt) continue;
      s.grabNextAt = this.now + GRAB_EVERY_MS;

      const mineIsPlayer = owner === 'player';
      let bestX: number | null = null;
      let bestY = 0;
      let bestD = GRAB_R;
      let take: (() => void) | null = null;

      for (const obj of this.api.projectiles.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal || p.isFromPlayer === mineIsPlayer) continue;
        const d = Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y);
        if (d > bestD) continue;
        bestD = d;
        bestX = p.x;
        bestY = p.y;
        take = () => p.destroy();
      }
      if (bestX === null) {
        for (const rp of this.api.projectileRegistry.within(this.other(owner), f.x, f.y, GRAB_R)) {
          const d = Phaser.Math.Distance.Between(f.x, f.y, rp.getX(), rp.getY());
          if (d > bestD) continue;
          bestD = d;
          bestX = rp.getX();
          bestY = rp.getY();
          take = () => this.api.projectileRegistry.steal(rp);
        }
      }
      if (bestX === null || !take) continue;

      take();
      s.lastGrabX = bestX;
      s.lastGrabY = bestY;
      s.lastGrabAt = this.now;
      this.fx(owner).grab(bestX, bestY, Math.atan2(bestY - f.y, bestX - f.x));
      this.api.showFloatingText(bestX, bestY - 16, '🐙 TAKEN', this.hex(DEA.shroud));
      Sfx.playAt('dark-drain', bestX, { volume: 0.6, rate: 0.8 });
    }
  }

  // ── The damage mirror ──────────────────────────────────────────────────────

  /**
   * "Deals less damage" has no attacker reference to hang on — `takeDamage` never learns who hit
   * it — so both of the kit's damage cuts are worn from the other end, by the person the weakened
   * fighter is shooting at. Same stand-in Subterfuge's Bribe and Shadow's Hopelessness use,
   * rewritten from scratch every frame onto a field of its own so it cannot stomp another kit's
   * armour.
   *
   * Styx's brand and a missing arm multiply: 45% off for the river and another 25% off for two
   * arms is 0.55 × 0.75, not 0.30. Whichever enemy is currently the least weakened sets the
   * number, since one field cannot tell two attackers apart.
   */
  private updateMirror(): void {
    // Cleared outright rather than pruned on death: the set is the kit's only record of who
    // still needs handing back, and a set that never empties would keep `hasLiveState` true
    // (and this whole loop running) for the rest of the match after a single brand.
    for (const f of this.touched) f.deathIncomingMult = 1;
    this.touched.clear();
    for (const owner of BOTH) {
      if (!this.isDeath(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      let factor = 1;
      for (const t of this.targetsOf(owner)) {
        const m = this.markOn(owner, t);
        const styx = m ? this.amped(t, STYX_STEP * m.stacks) : 0;
        // Everything the upgrades take off their damage rides the same field, and they multiply:
        // the river, the arms they no longer have, an open wound and a wall full of misses are
        // four separate reasons the same punch lands softer.
        const bleed = this.bleedOn(owner, t) ? this.amped(t, BLEED_DAMAGE) : 0;
        const shame = this.amped(t, Math.min(0.9, DISHONOR_STEP * this.dishonorOn(owner, t)));
        factor = Math.min(factor,
          (1 - styx) * AMP_ARM_DMG[this.limbCounts(t).arms] * (1 - bleed) * (1 - shame));
      }
      if (factor > 0.999) continue;
      f.deathIncomingMult = Math.max(0.1, factor);
      this.touched.add(f);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    const { scene } = this.api;
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      let av = this.avatar(owner);
      if (!is) {
        av?.destroy();
        if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
        continue;
      }
      const f = this.fighter(owner);
      const s = this.sides[owner];
      if (!av) {
        av = new DeathAvatar(scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const guarding = this.now < s.guardUntil;
      const ang = owner === 'player'
        ? Math.atan2(s.aimY - f.y, s.aimX - f.x)
        : Math.atan2(this.api.player.y - f.y, this.api.player.x - f.x);
      av.setFacing(ang);
      av.setDoom(this.doomOf(owner));
      av.setGuard(guarding);
      // The two-handed guard is the only sustained pose in the kit, so it owns `setHold`
      // outright — resolved from state here rather than at the cast site, or a Disarm mid-guard
      // would drop the blade for good.
      av.setHold(guarding ? 'brace' : null, ang);
      av.setIntensity(this.now < s.hasteUntil || s.deal?.phase === 'settled' ? 1.35 : 1);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, this.alive(f) ? 1 : 0);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  /**
   * The floor. Everything Death leaves on the ground is a stain rather than an object, so the
   * only thing down here is the trail a Styx shot drips as it crosses the arena.
   */
  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    this.paintWalls(g);

    // ── Death by 1000 Cuts ──
    // On the floor, under everybody: they are gashes in the ground, and a body standing in them
    // has to be standing *on top of* them for the picture to say what the ability does.
    for (const cut of this.cuts) {
      const k = Phaser.Math.Clamp((cut.diesAt - this.now) / CUT_LIFE_MS, 0, 1);
      const fresh = Phaser.Math.Clamp((this.now - cut.bornAt) / 130, 0, 1);
      cutMark(g, this.col(cut.owner), cut.x, cut.y, cut.ang, CUT_LEN * (0.5 + fresh * 0.5),
        (0.25 + k * 0.7) * fresh, { seed: cut.seed });
    }

    for (const sh of this.shots) {
      const tint = this.col(sh.owner);
      const ang = Math.atan2(sh.vy, sh.vx);
      for (let i = 1; i <= 4; i++) {
        const d = i * 22 + ((this.vizT * 60 + sh.seed) % 22);
        g.fillStyle(tint(DEA.deep), 0.16 - i * 0.03);
        g.fillEllipse(sh.x - Math.cos(ang) * d, sh.y - Math.sin(ang) * d + 12,
          9 - i * 1.4, 4 - i * 0.6);
      }
    }
  }

  /**
   * The stone, once Dishonor is watching it. Four faces standing inside the world bounds with
   * every miss still burnt into them — a wall that a shot can visibly *end on* is the whole
   * upgrade, because a penalty for missing is worth nothing if missing looks like nothing.
   */
  private paintWalls(g: Phaser.GameObjects.Graphics): void {
    const owner = BOTH.find((o) => this.isDeath(o) && this.up(o, 'r'));
    if (!owner) return;
    const wb = this.api.scene.physics.world.bounds;
    const tint = this.col(owner);
    const faces: [number, number, number, number, number][] = [
      [wb.left, wb.top, wb.left, wb.bottom, 0],
      [wb.right, wb.bottom, wb.right, wb.top, Math.PI],
      [wb.right, wb.top, wb.left, wb.top, Math.PI / 2],
      [wb.left, wb.bottom, wb.right, wb.bottom, -Math.PI / 2],
    ];
    for (let i = 0; i < faces.length; i++) {
      const [ax, ay, bx, by, inAng] = faces[i];
      wallFace(g, tint, ax, ay, bx, by, inAng, WALL_THICK, this.vizT, 0.85, { seed: 11 + i * 7 });
    }
    for (const sc of this.scars) {
      // Cools from white to blood over the twenty seconds the stack it bought is worth.
      const heat = Phaser.Math.Clamp((sc.diesAt - this.now) / DISHONOR_MS, 0, 1);
      wallScar(g, tint, sc.x, sc.y, sc.inAng, heat, 0.35 + heat * 0.6, { seed: sc.seed });
    }
  }

  /** Shots, cut bullets, brands, nooses and the held blade. */
  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    // ── Disarm afterimages ──
    // Over the fighters on purpose: it fades but never moves, so for most of a second the arc
    // and the person standing stunned inside it are the same picture.
    for (const im of this.afterimages) {
      const k = Phaser.Math.Clamp((this.now - im.bornAt) / (im.diesAt - im.bornAt), 0, 1);
      slashArc(g, this.col(im.owner), im.x, im.y, im.ang, DISARM_HALF,
        DISARM_REACH * 0.42, DISARM_REACH, (1 - k) * 0.75,
        { color: DEA.after, seed: im.seed, lines: 3 });
    }

    // ── Styx shurikens ──
    for (const sh of this.shots) {
      const tint = this.col(sh.owner);
      const ang = Math.atan2(sh.vy, sh.vx);
      // The wake: a smear of river behind the star, so a fan of three reads as a fan.
      g.fillStyle(shade(tint(DEA.deep), 1), 0.24);
      g.fillPoints([
        new Phaser.Geom.Point(sh.x - Math.cos(ang) * 30, sh.y - Math.sin(ang) * 30),
        new Phaser.Geom.Point(sh.x + Math.cos(ang + 1.9) * 7, sh.y + Math.sin(ang + 1.9) * 7),
        new Phaser.Geom.Point(sh.x + Math.cos(ang - 1.9) * 7, sh.y + Math.sin(ang - 1.9) * 7),
      ], true);
      // Two ghosts of the star trailing it, dimmer and further back down its own spin.
      for (let i = 2; i >= 1; i--) {
        const d = i * 9;
        shuriken(g, tint, sh.x - Math.cos(ang) * d, sh.y - Math.sin(ang) * d,
          sh.spin - i * 0.5, 10, 0.22 - i * 0.06, { seed: sh.seed, t: this.vizT });
      }
      shuriken(g, tint, sh.x, sh.y, sh.spin, 11, 0.95, { seed: sh.seed, t: this.vizT });
    }

    // ── Amputating dashes ──
    // The line he took, still hanging there for the length of the dash: a lead smear with a
    // white cutting edge down the middle of it.
    for (const owner of BOTH) {
      const d = this.sides[owner].dash;
      if (!d) continue;
      const f = this.fighter(owner);
      const tint = this.col(owner);
      const k = Phaser.Math.Clamp((d.endsAt - this.now) / AMP_MS, 0, 1);
      g.lineStyle(30, tint(DEA.void_), k * 0.3);
      g.lineBetween(d.x0, d.y0, f.x, f.y);
      g.lineStyle(2.4, tint(DEA.edge), k * 0.75);
      g.lineBetween(d.x0, d.y0, f.x, f.y);
      // Four ribs of steel crossing the wake, spaced back along it.
      for (let i = 0; i < 4; i++) {
        const t = (i + 1) / 5;
        const rx = d.x0 + (f.x - d.x0) * t;
        const ry = d.y0 + (f.y - d.y0) * t;
        const a = Math.atan2(f.y - d.y0, f.x - d.x0) + Math.PI / 2;
        const len = 13 * (1 - t) + 4;
        g.lineStyle(1.4, tint(DEA.blade), k * (0.55 - i * 0.1));
        g.lineBetween(rx - Math.cos(a) * len, ry - Math.sin(a) * len,
          rx + Math.cos(a) * len, ry + Math.sin(a) * len);
      }
    }

    // ── Cut bullets ──
    for (const h of this.halves) {
      const k = Phaser.Math.Clamp((h.diesAt - this.now) / HALF_LIFE_MS, 0, 1);
      slicedBullet(g, this.col(h.owner), h.x, h.y, h.ang, 13, k * 0.95,
        { seed: h.seed, side: h.side, color: h.color });
    }

    // ── Brands ──
    for (const owner of BOTH) {
      const tint = this.col(owner);
      for (const [victim, m] of this.marks[owner]) {
        if (!this.alive(victim) || this.now >= m.until) continue;
        const fade = Phaser.Math.Clamp((m.until - this.now) / 600, 0, 1);
        styxBrand(g, tint, victim.x, victim.y, 20 * victim.sizeMult, this.vizT, m.stacks, fade * 0.95);
      }
    }

    // ── Stumps ──
    // Painted for the rest of the match, in whoever's colours took the limb off — this is the
    // one thing the kit leaves behind that no timer ever clears.
    for (const [victim, set] of this.amputations) {
      if (!this.alive(victim) || set.size === 0) continue;
      const { arms, legs } = this.limbCounts(victim);
      stumps(g, this.col(victim === this.api.player ? 'npc' : 'player'),
        victim.x, victim.y, 20 * victim.sizeMult, arms, legs, this.vizT, 0.95);
    }

    // ── The guard ──
    // The avatar already holds the blade, so what is drawn here is the thing the blade is
    // doing: a faint plane of steel along the segment that shots are actually tested against.
    for (const owner of BOTH) {
      const seg = this.guardSegment(owner);
      if (!seg) continue;
      const tint = this.col(owner);
      const s = this.sides[owner];
      const k = Phaser.Math.Clamp((s.guardUntil - this.now) / RIPOSTE_MS, 0, 1);
      const shimmer = 0.3 + 0.2 * Math.sin(this.vizT * 9);
      g.lineStyle(RIPOSTE_R * 1.4, tint(DEA.blade), 0.06 + k * 0.05);
      g.lineBetween(seg.ax, seg.ay, seg.bx, seg.by);
      g.lineStyle(1.6, tint(DEA.edge), (0.35 + shimmer) * k);
      g.lineBetween(seg.ax, seg.ay, seg.bx, seg.by);
      // Two motes riding the edge, so a held blade never looks like a static line.
      for (let i = 0; i < 2; i++) {
        const t = ((this.vizT * 0.9 + i * 0.5) % 1);
        g.fillStyle(tint(DEA.edge), (1 - t) * 0.6 * k);
        g.fillCircle(seg.ax + (seg.bx - seg.ax) * t, seg.ay + (seg.by - seg.ay) * t, 2.4);
      }
    }

    // ── Disarmed weapons ──
    // Over everybody, with the leash drawn first so the core sits on top of its own line. The
    // errand is the ability, so the object at the end of it is never allowed to be hidden.
    for (const w of this.weapons) {
      const flying = this.now < w.landsAt;
      if (this.alive(w.victim)) {
        leash(g, this.col(w.owner), w.victim.x, w.victim.y, w.x, w.y, this.vizT, flying ? 0.5 : 0.9);
      }
      const spin = (this.now - w.bornAt) / 1000;
      weaponCore(g, this.col(w.owner), w.x, w.y, flying ? spin * 9 : Math.sin(this.vizT * 1.3) * 0.35,
        flying ? 9 : 11, 0.95, { color: w.color, seed: w.seed, t: this.vizT });
    }

    // ── True Grimdark ──
    // The arms first, so the mask sits in front of them and the face is never buried in ink.
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (!s.deal?.grim) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      const reaching = this.now - s.lastGrabAt < 260
        ? Math.atan2(s.lastGrabY - f.y, s.lastGrabX - f.x) : null;
      for (let i = 0; i < TENTACLES; i++) {
        // Fanned across his back and breathing on their own; one peels off to point at whatever
        // the last arm went for, so a grab reads as *this* body having done it.
        const base = -Math.PI / 2 + (i - (TENTACLES - 1) / 2) * 0.72
          + Math.sin(this.vizT * 1.1 + i * 1.9) * 0.3;
        const ang = reaching !== null && i === 2 ? reaching : base;
        const len = TENT_LEN * (0.72 + 0.28 * Math.sin(this.vizT * 2.3 + i * 2.1))
          * (reaching !== null && i === 2 ? 1.35 : 1);
        tentacle(g, tint, f.x + Math.cos(base) * 6, f.y + 4 + Math.sin(base) * 4, ang, len, 0.9,
          { seed: i * 37 + 5, t: this.vizT, curl: 1.1, thick: 7 });
      }
      if (s.maskCharges > 0) {
        deathMask(g, tint, f.x, f.y - 6, 9, MASK_CHARGES - s.maskCharges, 0.97,
          { seed: 3, t: this.vizT });
      }
    }

    // ── The sheath ──
    // At his hip while the katana is away, filling from the throat out. Drawn for a Death npc
    // too: a powered swing you could not see coming would just be an unexplained knockback.
    for (const owner of BOTH) {
      if (!this.isDeath(owner) || !this.up(owner, 'click')) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const charge = this.sheathCharge(owner);
      if (charge <= 0.02) continue;
      const hip = this.aimAngle(owner) + Math.PI * 0.62;
      sheath(g, this.col(owner), f.x + Math.cos(hip) * 9, f.y + 6 + Math.sin(hip) * 5,
        hip - 0.35, 34, charge, 0.9, { t: this.vizT });
    }

    // ── The handshake ──
    for (const owner of BOTH) {
      const d = this.sides[owner].deal;
      if (!d || d.phase !== 'shake' || !this.alive(d.victim)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const tint = this.col(owner);
      const mx = (f.x + d.victim.x) / 2;
      const my = (f.y + d.victim.y) / 2;
      const shake = Math.sin(this.vizT * 26) * 3;
      g.lineStyle(4, tint(DEA.void_), 0.8);
      g.lineBetween(f.x, f.y, mx, my + shake);
      g.lineBetween(d.victim.x, d.victim.y, mx, my + shake);
      g.fillStyle(tint(DEA.bone), 0.9);
      g.fillCircle(mx, my + shake, 7);
      g.fillStyle(tint(DEA.gold), 0.55 + 0.35 * Math.sin(this.vizT * 12));
      g.fillCircle(mx, my + shake, 3.4);
      // A shred of the contract fluttering off the grip.
      for (let i = 0; i < 3; i++) {
        const a = this.vizT * 2 + i * 2.1;
        g.fillStyle(tint(DEA.pale), 0.4);
        g.fillRect(mx + Math.cos(a) * 16, my + Math.sin(a) * 12 - 6 + shake, 5, 3);
      }
    }
  }

  // ── The dial ───────────────────────────────────────────────────────────────

  /**
   * The passive, in the corner. Drawn for a Death *npc* too, in blood rather than gold — a
   * minute you cannot see coming is not a mechanic, it is an ambush.
   */
  private paintClock(playerIs: boolean, npcIs: boolean): void {
    const owner: Owner | null = playerIs ? 'player' : npcIs ? 'npc' : null;
    if (!owner) {
      this.hudGfx?.setVisible(false);
      this.hudTitle?.setVisible(false);
      this.hudCount?.setVisible(false);
      return;
    }

    const { scene } = this.api;
    const cx = this.api.width - CLOCK_MARGIN_X;
    const cy = CLOCK_Y + (this.api.isInvasion ? CLOCK_INVASION_DY : 0);
    const mine = owner === 'player';
    const accent = mine ? DEA.gold : DEA.blood;

    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(CLOCK_DEPTH).setScrollFactor(0);
    if (!this.hudTitle) {
      this.hudTitle = scene.add.text(cx, cy - CLOCK_R - 13, 'MIDNIGHT', {
        fontSize: '11px', color: this.hex(accent), fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(CLOCK_DEPTH + 1).setScrollFactor(0);
    }
    if (!this.hudCount) {
      this.hudCount = scene.add.text(cx, cy + CLOCK_R + 6, '', {
        fontSize: '15px', color: '#e9e3d2', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(CLOCK_DEPTH + 1).setScrollFactor(0);
    }

    const s = this.sides[owner];
    const frac = Phaser.Math.Clamp(s.clockMs / MIDNIGHT_MS, 0, 1);
    const secs = s.clockSpent ? 0 : Math.ceil(s.clockMs / 1000);

    const g = this.hudGfx.setVisible(true);
    g.clear();
    // A shroud behind the dial so it never sits on bare arena, thrashing harder as it runs out.
    g.fillStyle(DEA.void_, 0.55);
    g.fillCircle(cx, cy, CLOCK_R + 9);
    clockFace(g, this.col(owner), cx, cy, CLOCK_R, frac, 1,
      { hostile: !mine || frac < 0.08, seed: 7 });

    this.hudTitle.setVisible(true).setPosition(cx, cy - CLOCK_R - 13)
      .setColor(this.hex(accent))
      .setText(mine ? 'MIDNIGHT' : 'YOUR MIDNIGHT');
    this.hudCount.setVisible(true).setPosition(cx, cy + CLOCK_R + 6)
      .setColor(this.hex(secs <= 10 ? DEA.blood : DEA.bone))
      .setText(s.clockSpent ? '—' : `${secs}s`);
  }

  // ── The limb picker ────────────────────────────────────────────────────────

  /**
   * Four rows, one key each, with what taking that limb would actually do to them spelled out
   * on the row — because the decision is the ability and a player should never have to guess at
   * it. Rows for limbs already gone are struck through rather than removed, so the numbers stay
   * in the same place from one cast to the next.
   */
  private paintPicker(playerIs: boolean): void {
    const open = playerIs && this.picking;
    if (!open) {
      this.pickGfx?.setVisible(false);
      this.pickTitle?.setVisible(false);
      for (const r of this.pickRows) r.setVisible(false);
      return;
    }

    const { scene } = this.api;
    const cx = this.api.width / 2;
    const top = Math.round(this.api.height * PICK_Y);
    const h = PICK_ROW * LIMBS.length + 46;

    if (!this.pickGfx) this.pickGfx = scene.add.graphics().setDepth(PICK_DEPTH).setScrollFactor(0);
    if (!this.pickTitle) {
      this.pickTitle = scene.add.text(cx, top + 14, '', {
        fontSize: '13px', color: this.hex(DEA.blade), fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(PICK_DEPTH + 1).setScrollFactor(0);
    }
    while (this.pickRows.length < LIMBS.length) {
      this.pickRows.push(scene.add.text(cx - PICK_W / 2 + 14, 0, '', {
        fontSize: '12px', color: '#e9e3d2',
      }).setOrigin(0, 0.5).setDepth(PICK_DEPTH + 1).setScrollFactor(0));
    }

    const victim = this.primaryVictim('player');
    const gone = victim ? this.limbsGone(victim) : new Set<Limb>();
    const left = AMP_MAX - gone.size;

    const g = this.pickGfx.setVisible(true);
    g.clear();
    g.fillStyle(DEA.void_, 0.86);
    g.fillRoundedRect(cx - PICK_W / 2, top, PICK_W, h, 8);
    g.lineStyle(1.6, DEA.blade, 0.55);
    g.strokeRoundedRect(cx - PICK_W / 2, top, PICK_W, h, 8);
    // A hairline of steel under the title, the width of the blade that is about to be used.
    g.lineStyle(1, DEA.edge, 0.35);
    g.lineBetween(cx - PICK_W / 2 + 12, top + 27, cx + PICK_W / 2 - 12, top + 27);

    this.pickTitle.setVisible(true).setPosition(cx, top + 14)
      .setText(`🗡️ AMPUTATE — ${left} LIMB${left === 1 ? '' : 'S'} LEFT TO TAKE`);

    for (let i = 0; i < LIMBS.length; i++) {
      const limb = LIMBS[i];
      const taken = gone.has(limb);
      // What the *next* count of that kind would cost them.
      const { arms, legs } = victim ? this.limbCounts(victim) : { arms: 0, legs: 0 };
      const effect = isLeg(limb)
        ? `−${Math.round((1 - AMP_LEG_SPEED[Math.min(2, legs + 1)]) * 100)}% speed`
        : `+${Math.round((AMP_ARM_CD[Math.min(2, arms + 1)] - 1) * 100)}% cd · `
          + `−${Math.round((1 - AMP_ARM_DMG[Math.min(2, arms + 1)]) * 100)}% dmg`;
      this.pickRows[i].setVisible(true)
        .setPosition(cx - PICK_W / 2 + 14, top + 40 + i * PICK_ROW)
        .setColor(taken ? this.hex(DEA.smoke) : '#e9e3d2')
        .setText(taken
          ? `[${i + 1}]  ${LIMB_EMOJI[limb]} ${LIMB_LABEL[limb]} — already gone`
          : `[${i + 1}]  ${LIMB_EMOJI[limb]} ${LIMB_LABEL[limb]} — ${effect}`);
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean, npcIs: boolean): void {
    const p = this.api.player;
    const s = this.sides.player;
    const foe = this.sides.npc;

    // The minute, from both ends. Yours sits with the passives; theirs sits at the very top of
    // the tray, because there is nothing on the screen that matters more.
    this.api.setStatusIndicator('death-midnight', playerIs ? {
      name: 'Midnight', emoji: '🕛', color: DEA.gold,
      description: 'Your doomsday clock. When it reaches zero your enemy dies where they stand, with no catch. Honouring a Deal with Death takes 10 seconds off it.',
      count: Math.ceil(s.clockMs / 1000), suffix: 's', priority: 152,
    } : null);

    this.api.setStatusIndicator('death-doomed', npcIs && !foe.clockSpent ? {
      name: 'Doomed', emoji: '⏳', color: DEA.blood,
      description: 'Their clock is running. When it strikes midnight you die instantly — there is no save and no counterplay except killing them first.',
      count: Math.ceil(foe.clockMs / 1000), suffix: 's', priority: 0,
    } : null);

    // Branded — on you, by them.
    const onMe = this.markOn('npc', p);
    const myPct = onMe ? Math.round(STYX_STEP * onMe.stacks * 100) : 0;
    this.api.setStatusIndicator('death-styx-on-me', onMe ? {
      name: 'Styx', emoji: '🌊', color: DEA.styx,
      description: `The river is in you: ${myPct}% slower and ${myPct}% less damage against whoever branded you. Three stacks, three seconds each, refreshed by every shot.`,
      until: onMe.until, count: onMe.stacks, priority: 8,
    } : null);

    // Branded — by you, on them. Worth a box of its own: it is the whole reason you survive.
    let theirs: { stacks: number; until: number; pct: number } | null = null;
    if (playerIs) {
      for (const [victim, m] of this.marks.player) {
        if (!this.alive(victim) || this.now >= m.until) continue;
        const pct = Math.round(STYX_STEP * m.stacks * 100);
        if (!theirs || pct > theirs.pct) theirs = { stacks: m.stacks, until: m.until, pct };
      }
    }
    this.api.setStatusIndicator('death-styx-out', theirs ? {
      name: 'Branded', emoji: '⚰️', color: DEA.deep,
      description: `Your enemy is carrying ${theirs.stacks} Styx stack${theirs.stacks === 1 ? '' : 's'} — ${theirs.pct}% slower, and ${theirs.pct}% less damage against you.`,
      until: theirs.until, count: theirs.stacks, priority: 118,
    } : null);

    // Amputations, from both ends. No `until` on either — this is the one thing in the game
    // that is simply true for the rest of the match.
    const mine = this.limbCounts(p);
    this.api.setStatusIndicator('death-amputated-me', mine.arms + mine.legs > 0 ? {
      name: 'Amputated', emoji: '🦴', color: DEA.blood,
      description: this.amputationBlurb(mine.arms, mine.legs, true),
      count: mine.arms + mine.legs, suffix: `/${AMP_MAX}`, priority: 1,
    } : null);

    let out: { arms: number; legs: number } | null = null;
    if (playerIs) {
      for (const t of this.targetsOf('player')) {
        const c = this.limbCounts(t);
        if (c.arms + c.legs === 0) continue;
        if (!out || c.arms + c.legs > out.arms + out.legs) out = c;
      }
    }
    this.api.setStatusIndicator('death-amputated-out', out ? {
      name: 'Amputated', emoji: '🦴', color: DEA.blood,
      description: this.amputationBlurb(out.arms, out.legs, false),
      count: out.arms + out.legs, suffix: `/${AMP_MAX}`, priority: 119,
    } : null);

    this.api.setStatusIndicator('death-guard', playerIs && this.now < s.guardUntil ? {
      name: 'Riposte', emoji: '🗡️', color: DEA.blade,
      description: 'The katana is out along your cursor. Any shot that reaches it is cut in half and both pieces go wide.',
      until: s.guardUntil, priority: 116,
    } : null);

    this.api.setStatusIndicator('death-haste', playerIs && this.now < s.hasteUntil ? {
      name: 'Quickened', emoji: '🌀', color: DEA.after,
      description: 'A landed Disarm has you moving 30% faster.',
      until: s.hasteUntil, priority: 130,
    } : null);

    // ── Upgrades ──
    // The sheath, only once it is a thing the player owns. It is a passive, so it sits up with
    // Midnight rather than down among the timers.
    this.api.setStatusIndicator('death-sheath', playerIs && this.up('player', 'click') ? {
      name: s.sheathed ? 'Sheathed' : 'Sheathing', emoji: '🗡️', color: s.sheathed ? DEA.edge : DEA.smoke,
      description: s.sheathed
        ? 'The blade is away and the next thing you draw it for comes out powered: the shurikens fly in a line, Disarm stuns a second longer and knocks them off their feet, Riposte gives back a fifth of everything it ate as a slow, Amputate leaves them exsanguinating, and a Deal will tolerate 75 damage.'
        : `Three seconds without casting anything and the katana goes back in the saya. ${Math.round(this.sheathCharge('player') * 100)}% of the way there.`,
      count: s.sheathed ? undefined : Math.round(this.sheathCharge('player') * 100),
      suffix: s.sheathed ? undefined : '%', priority: 151,
    } : null);

    // The mask, for as long as the deal it came with.
    this.api.setStatusIndicator('death-grimdark', playerIs && s.maskOn ? {
      name: 'True Grimdark', emoji: '🐙', color: DEA.shroud,
      description: `Tentacles are pulling shots out of the air around you, and the mask refuses the next ${s.maskCharges} instance${s.maskCharges === 1 ? '' : 's'} of damage outright — however big the hit is. Both go back in when the deal ends.`,
      count: s.maskCharges, suffix: `/${MASK_CHARGES}`, priority: 111,
    } : null);

    // Somebody's weapon on the floor, from both ends of the arena.
    const myWeapon = this.weapons.find((w) => w.victim === p);
    this.api.setStatusIndicator('death-unarmed', myWeapon ? {
      name: 'Unarmed', emoji: '🗡️', color: DEA.after,
      description: 'Your weapon has been knocked out of your hands and is lying on the floor. Nothing you press does anything until you walk over it and pick it up.',
      priority: 2,
    } : null);

    const theirWeapon = playerIs ? this.weapons.find((w) => w.owner === 'player' && w.victim !== p) : undefined;
    this.api.setStatusIndicator('death-unarmed-out', theirWeapon ? {
      name: 'Disarmed', emoji: '🗡️', color: DEA.after,
      description: 'You have taken their weapon off them. They cannot cast anything at all until they reach the core lying on the floor.',
      priority: 113,
    } : null);

    // Exsanguination.
    this.api.setStatusIndicator('death-bleed', this.bleedOn('npc', p) ? {
      name: 'Exsanguination', emoji: '🩸', color: DEA.blood,
      description: 'A blade went through you and did not close: 10% slower and 10% less damage for 15 seconds.',
      until: this.bleeds.npc.get(p), priority: 6,
    } : null);

    let bleedOut: Fighter | null = null;
    if (playerIs) for (const t of this.targetsOf('player')) if (this.bleedOn('player', t)) { bleedOut = t; break; }
    this.api.setStatusIndicator('death-bleed-out', bleedOut ? {
      name: 'Exsanguinating', emoji: '🩸', color: DEA.blood,
      description: 'Your enemy is bleeding out — 10% slower and 10% less damage against you for 15 seconds.',
      until: this.bleeds.player.get(bleedOut), priority: 114,
    } : null);

    // Dishonor: every shot they put into a wall.
    const shameOnMe = this.dishonorOn('npc', p);
    this.api.setStatusIndicator('death-dishonor', shameOnMe > 0 ? {
      name: 'Dishonor', emoji: '⚖️', color: DEA.ash,
      description: `${shameOnMe} of your shots have ended on a wall. Each one costs you 2% of your damage for 20 seconds — ${Math.round(shameOnMe * DISHONOR_STEP * 100)}% in total right now.`,
      count: shameOnMe, priority: 7,
    } : null);

    let shameOut = 0;
    if (playerIs) for (const t of this.targetsOf('player')) shameOut = Math.max(shameOut, this.dishonorOn('player', t));
    this.api.setStatusIndicator('death-dishonor-out', shameOut > 0 ? {
      name: 'Dishonored', emoji: '⚖️', color: DEA.ash,
      description: `Your enemy has missed ${shameOut} shot${shameOut === 1 ? '' : 's'} into the stone. That is ${Math.round(shameOut * DISHONOR_STEP * 100)}% off their damage, and the wall keeps each mark for 20 seconds.`,
      count: shameOut, priority: 115,
    } : null);

    // Standing in the cuts.
    this.api.setStatusIndicator('death-carved', this.carved.get(p) === 'npc' ? {
      name: 'Carved', emoji: '🗡️', color: DEA.blade,
      description: 'You are standing in a trail of open cuts. 25% slower, and every negative effect on you is half again as strong for as long as you stay in them.',
      priority: 3,
    } : null);

    let carvedOut = false;
    if (playerIs) for (const t of this.targetsOf('player')) if (this.carved.get(t) === 'player') { carvedOut = true; break; }
    this.api.setStatusIndicator('death-carved-out', carvedOut ? {
      name: 'Carving', emoji: '🗡️', color: DEA.blade,
      description: 'Your enemy is standing in your cuts: 25% slower, and everything else you have put on them is 1.5× as strong while they are in there.',
      priority: 117,
    } : null);

    // The parting wave.
    const shockOnMe = this.shocks.npc.get(p);
    this.api.setStatusIndicator('death-shock', shockOnMe && this.now < shockOnMe.until ? {
      name: 'Sundered', emoji: '🌊', color: DEA.blade,
      description: `The wave off a dropped guard has you ${Math.round(this.amped(p, shockOnMe.pct) * 100)}% slower — a fifth of everything that blade cut out of the air.`,
      until: shockOnMe.until, priority: 9,
    } : null);

    const deal = playerIs ? s.deal : null;
    const taken = deal && deal.phase === 'settled'
      ? Math.max(0, Math.round(this.api.player.rawDamageTaken - deal.rawAt0)) : 0;
    this.api.setStatusIndicator('death-deal', deal ? {
      name: deal.phase === 'shake' ? 'Shaking Hands' : 'Deal with Death', emoji: '🤝', color: DEA.gold,
      description: deal.phase === 'shake'
        ? 'You are shaking their hand. The bargain starts the moment you let go.'
        : `+33% speed and +33% dodge. Reach the end of the 10 seconds having taken under ${deal.toll} damage and the clock jumps 10 seconds closer to midnight. You have taken ${taken}.`,
      until: deal.phase === 'shake' ? deal.shakeUntil : deal.endsAt,
      count: deal.phase === 'settled' ? taken : undefined,
      suffix: deal.phase === 'settled' ? `/${deal.toll}` : undefined,
      priority: 112,
    } : null);
  }

  /** One sentence of arithmetic, written from whichever end of the blade you are standing on. */
  private amputationBlurb(arms: number, legs: number, mine: boolean): string {
    const who = mine ? 'You are' : 'They are';
    const your = mine ? 'Your' : 'Their';
    const parts: string[] = [];
    if (legs > 0) parts.push(`${Math.round((1 - AMP_LEG_SPEED[legs]) * 100)}% slower`);
    if (arms > 0) {
      parts.push(`${your.toLowerCase()} cooldowns are ${Math.round((AMP_ARM_CD[arms] - 1) * 100)}% longer`);
      parts.push(`${your.toLowerCase()} damage is cut by ${Math.round((1 - AMP_ARM_DMG[arms]) * 100)}%`);
    }
    const lost = [legs > 0 ? `${legs} leg${legs === 1 ? '' : 's'}` : '', arms > 0 ? `${arms} arm${arms === 1 ? '' : 's'}` : '']
      .filter(Boolean).join(' and ');
    return `${who} missing ${lost} — ${parts.join(', ')}. Nothing grows back, and a body only has ${AMP_MAX} to lose in a game.`;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMultFor('player'); }
  getNpcSpeedMult(): number { return this.speedMultFor('npc'); }

  /**
   * Styx's slow (from the *other* side's brands), the legs this body no longer has, and Death's
   * own two speed buffs, in one number. Pulled by ArenaScene rather than pushed from `update()`,
   * which runs after the frame's movement has already resolved.
   *
   * The missing legs are read off `f` regardless of who took them: an amputation is a fact about
   * the body standing there, not a debuff somebody is maintaining.
   */
  private speedMultFor(owner: Owner): number {
    const f = this.fighter(owner);
    if (!f) return 1;
    let mult = AMP_LEG_SPEED[this.limbCounts(f).legs];

    const foe = this.other(owner);
    const m = this.markOn(foe, f);
    if (m) mult *= Math.max(0.1, 1 - this.amped(f, STYX_STEP * m.stacks));

    // The upgrade slows, all of them read off the body rather than off the reaper: an open
    // wound, a parting wave still ringing, and the gashes he is dragging behind him.
    if (this.bleedOn(foe, f)) mult *= 1 - this.amped(f, BLEED_SLOW);
    const shock = this.shocks[foe].get(f);
    if (shock && this.now < shock.until) mult *= Math.max(0.1, 1 - this.amped(f, shock.pct));
    // The cuts are the amplifier, so their own quarter is never amplified by themselves.
    if (this.carved.get(f) === foe) mult *= 1 - CUT_SLOW;

    if (this.isDeath(owner)) {
      const s = this.sides[owner];
      if (this.now < s.hasteUntil) mult *= DISARM_HASTE;
      if (s.deal?.phase === 'settled') mult *= DEAL_HASTE;
      // Stood still for the handshake, or carried by the dash — the body is the kit's for
      // those frames and WASD must not add to it.
      if (s.deal?.phase === 'shake' || s.dash) mult = 0;
    }
    return mult;
  }

  /** True while the handshake or the dash owns the caster's body — the npc must not try to walk. */
  isBusy(owner: Owner): boolean {
    return this.sides[owner].deal?.phase === 'shake' || !!this.sides[owner].dash;
  }
  isGuarding(owner: Owner): boolean { return this.now < this.sides[owner].guardUntil; }
  isDealing(owner: Owner): boolean { return !!this.sides[owner].deal; }
  /** Stacks this side currently has on `f`, for the bot's "don't overcap" check. */
  markStacks(owner: Owner, f: Fighter): number { return this.markOn(owner, f)?.stacks ?? 0; }
  /** Limbs already off `f`, so the bot stops pressing F once the body has nothing left. */
  limbsTaken(f: Fighter): number { return this.limbsGone(f).size; }
  /** Seconds left on that side's doomsday clock. */
  clockSeconds(owner: Owner): number { return Math.ceil(this.sides[owner].clockMs / 1000); }

  /**
   * Where `f` has to walk to be able to cast again, or undefined when it is still holding its
   * own weapon. Read by ArenaScene into `NpcAiState.deathWeaponPoint`: a disarmed bot that kept
   * strafing would stand there pressing keys that do nothing for the rest of the match.
   */
  weaponPointFor(f: Fighter): { x: number; y: number } | undefined {
    const w = this.weapons.find((it) => it.victim === f);
    return w ? { x: w.x, y: w.y } : undefined;
  }

  /**
   * Ability tray fill. Two of the five spend most of their life showing a state rather than a
   * cooldown — the blade being held out, and the ten seconds of a deal.
   */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'death-riposte' && time < s.guardUntil) {
      return Phaser.Math.Clamp((s.guardUntil - time) / RIPOSTE_MS, 0, 1);
    }
    if (abilityId === 'death-deal' && s.deal) {
      if (s.deal.phase === 'shake') return 0.1;
      return 0.1 + 0.9 * Phaser.Math.Clamp((s.deal.endsAt - time) / DEAL_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }
}
