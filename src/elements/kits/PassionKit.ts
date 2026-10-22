import Phaser from 'phaser';
import { Fighter, GAZE_AVERT_CONE } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import { Projectile } from '../../combat/Projectile';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import type { SummonPurgeTarget } from '../../combat/SummonPurge';
import {
  DEV, PassionAvatar, PassionColorFn, PassionFx, ascendBand, chariot, crashMark,
  crucifixAura, crucifixPost, faithBar, firePillar, glory, halo, handGrenade, holyWaterPuddle,
  pillarCrosshair, skyPriest, vial, arkGround, arkOfCovenant, gazeThread, prayerSigil, blessingShell,
} from './PassionVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { LOVE_LINES, heartAura, heartChariot, heartStaff, loveArk, loveBar } from './skins/PassionSkinFx';

/** The priest, or a skin's rig — which offers the same two hooks when it has them. */
type DevotionAvatar = BaseAvatar & { setPreach?(v: number): void; handTip?(): { x: number; y: number } };
import { meterGain } from '../../combat/Meters';
import { measureDebuffs } from '../../combat/StatusEffects';

/**
 * Devotion — the holy priest. (The element id is still `passion`, so the files and classes keep
 * the old name, exactly as Gold kept `fortune`.)
 *
 * Devotion deals no damage at all. Everything it does pours **faith** into the enemy, and the
 * moment their faith reaches the cap (200 in a duel) they are converted: killed on the spot by
 * the same pierce + netApplied execute the old love bar used, so no shield, armour, clotted pool
 * or absorber can save them. Nothing lowers faith.
 *
 * Faith also changes the believer on the way up:
 * - **25%** — it starts filling on its own, 2 a second.
 * - **50%** — their blows soften: the priest takes 20% less damage from them.
 * - **75%** — they are drawn, gently, toward the priest's nearest holy water, and every attack
 *   that lands faith on them lands 25% more.
 *
 * Faith lives on the victim (`Fighter.devotionFaith`) so the status tray and the online mirror
 * see it without help. Online, only the attacker's sim ever *adds* faith or converts — the
 * victim's copy is mirrored in and only drawn — while anything that moves a body (the 75% drag,
 * the crucifix's exclusion) runs on whichever sim owns that body.
 */

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

const ARENA_PAD = 32;

// ── Passive: faith ───────────────────────────────────────────────────────────
/** The cap in a duel. Husks and bosses scale it by their max HP against a duelist's 400. */
const FAITH_MAX = 200;
const FAITH_HP_REF = 400;
const FAITH_MIN_CAP = 30;
const STAGE_MARKS = [0.25, 0.5, 0.75];
const STAGE_LABEL = ['', '🕯️ KINDLED', '🙏 FAITHFUL', '✨ DEVOUT'];
/** 25%: faith fills itself. */
const KINDLED_PER_SEC = 2;
/** 50%: the believer's damage against the priest. */
const FAITHFUL_DAMAGE_MULT = 0.8;
/** 75%: how hard they are drawn toward the holy water, and how much more every attack lands. */
const DEVOUT_DRAG_SPEED = 55;
const DEVOUT_FAITH_MULT = 1.25;
const FAITH_BAR_W = 52;
const FAITH_BAR_H = 5;
/** Sits above the health bar (y-38) and above the charge bar that can appear over it. */
const FAITH_BAR_Y = -54;

// ── Sermon (Click) ───────────────────────────────────────────────────────────
const SERMON_MIN_LETTERS = 4;
const SERMON_MAX_LETTERS = 12;
const SERMON_MIN_FAITH = 3;
const SERMON_MAX_FAITH = 6;
const SERMON_CHARGE_MS = 1400;
/** A press shorter than this is a tap: the smallest sermon. */
const SERMON_TAP_MS = 160;
const LETTER_SPEED = 560;
const LETTER_LIFE_MS = 1100;
const LETTER_HIT_R = 14;
/** The letters leave one after another, not in a single clump. */
const LETTER_STAGGER_MS = 34;
const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'ξ', 'π', 'σ', 'φ', 'χ', 'ψ', 'ω', 'Σ', 'Ω', 'Δ', 'Φ', 'Ψ'];

// ── Holy Water (E) ───────────────────────────────────────────────────────────
const WATER_CHARGES = 2;
const WATER_RECHARGE_MS = 7000;
const WATER_RANGE = 380;
const WATER_FLIGHT_MS = 520;
const PUDDLE_R = 72;
const PUDDLE_MS = 8000;
const PUDDLE_FAITH_PER_SEC = 9;
const PUDDLE_TEXT_MS = 900;

// ── Holy Hand Grenade (R) ────────────────────────────────────────────────────
const GRENADE_FUSE_MS = 3000;
const GRENADE_RANGE = 420;
/** How long the throw takes to reach the cursor; after that it is just bouncing. */
const GRENADE_TRAVEL_S = 0.55;
/** Ground drag on the roll, per second (exponential). */
const GRENADE_DRAG = 1.6;
const GRENADE_RESTITUTION = 0.78;
const GRENADE_R = 8;
/** The little hops it takes off the floor — purely a z-height for the art. */
const GRENADE_HOP_V = 210;
const GRENADE_GRAVITY = 900;
const BURST_R = 130;
const BURST_FAITH = 45;

// ── Mount Crucifix (F) ───────────────────────────────────────────────────────
const CRUCIFIX_RANGE = 440;
const AURA_R = 90;
const SHOT_FAITH = 1;

// ── Ascendance (Q) ───────────────────────────────────────────────────────────
const ASCEND_WARN_MS = 3000;
const BAND_HALF = 37;
const CHARIOT_SPEED = 1500;
const CHARIOT_FAITH = 60;
const RIDE_MS = 2000;
/** The crash's ground mark shows for the last stretch of the ride. */
const CRASH_MARK_MS = 700;
const CRASH_R = 120;
const CRASH_FAITH = 80;

// ── Shop upgrades ────────────────────────────────────────────────────────────
/** Click+ Disarming Words: what a letter does to an enemy shot it passes through. */
const DISARM_DAMAGE_MULT = 0.8;
const DISARM_SPEED_MULT = 0.8;
const DISARM_TINT = 0xffd54a;
const DISARM_R = LETTER_HIT_R + 8;
/**
 * E+ Purge Sins: faith for what the holy water washed off — a flat amount per effect, more for
 * every second a timed one still had to run (capped per effect), and more per stack.
 */
const PURGE_FAITH_PER_EFFECT = 4;
const PURGE_FAITH_PER_SEC = 2;
const PURGE_SEC_CAP = 10;
const PURGE_FAITH_PER_STACK = 2;
const PURGE_FAITH_MAX = 60;
/** R+ Repentance: two more blasts after the first, 3s apart, at these fractions of the first. */
const REPENT_FUSE_MS = 3000;
const REPENT_FAITH = [1, 0.5, 0.33];
/** The leap toward the enemy takes this long, then it is bouncing again. */
const REPENT_LEAP_S = 0.5;
/** Q+ Pillars of Fire: the sky ride, and what it rains down. */
const SKY_RIDE_MS = 8000;
const PILLARS = 3;
const PILLAR_R = 46;
/** The column's fall from the sky before it burns. */
const PILLAR_DROP_MS = 180;
const PILLAR_MS = 1000;
const PILLAR_FAITH_PER_SEC = 28;
const PILLAR_SLOW_MS = 1500;
/** The bot's pillar cadence on the sky ride. */
const NPC_PILLAR_FIRST_MS = 1200;
const NPC_PILLAR_EVERY_MS = 2000;

// ── Mastery ──────────────────────────────────────────────────────────────────
/** Pray Always: a prayer every 8s, answered 5s after it is said. */
const PRAYER_EVERY_MS = 8000;
const PRAYER_ANSWER_MS = 5000;
/** How long the priest's hands stay pressed together after a prayer is said. */
const PRAYER_POSE_MS = 700;
const BLESS_ARMOUR_MULT = 0.75;
const BLESS_ARMOUR_MS = 5000;
const BLESS_HEAL = 50;
const BLESS_RAY_FAITH = 35;
const ANSWERS = ['armour', 'heal', 'ray'] as const;
type Answer = typeof ANSWERS[number];
/** Ark of the Covenant (R/F/Q). */
export const ARK_ID = 'ark-of-the-covenant';
const ARK_COOLDOWN_MS = 18000;
const ARK_MS = 12000;
const ARK_RANGE = 380;
/** The chest's half-width, which is also how wide it looks from afar. */
const ARK_R = 26;
/** Beyond this nobody is looking at it — they cannot make it out. */
const ARK_SIGHT_RANGE = 640;
/** A look within this of the Ark's edge is a stare. */
const ARK_STARE_HALF = Phaser.Math.DegToRad(18);
const ARK_FAITH_PER_SEC = 5;
const ARK_TEXT_MS = 1000;
/** Over half faith the Ark pulls the believer's sight this far toward it, more as faith rises. */
const GAZE_PULL_MIN = Phaser.Math.DegToRad(5);
const GAZE_PULL_MAX = Phaser.Math.DegToRad(14);
/** Under half faith a bot or husk tries to look this far away from it. */
const GAZE_AVERT = Phaser.Math.DegToRad(16);
/** How long one frame's gaze write lasts — a little past a frame, so it lapses on its own. */
const GAZE_HOLD_MS = 250;
/** The bot's Ark placement: how far along the line to the player, and the angle off it at 50%+. */
const NPC_ARK_ALONG = 0.45;
const NPC_ARK_OFFSET = Phaser.Math.DegToRad(32);
const NPC_ARK_THINK_MS = 500;

// ── World objects ────────────────────────────────────────────────────────────

interface Letter {
  owner: Owner;
  glyph: string;
  /** Pending until this time: the barrage leaves one letter at a time. */
  launchAt: number;
  launched: boolean;
  ang: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  diesAt: number;
  faith: number;
  seed: number;
  text: Phaser.GameObjects.Text | null;
  reg: RegisteredProjectile | null;
}

interface Bottle {
  owner: Owner;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  bornAt: number;
}

interface Puddle {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  diesAt: number;
  seed: number;
  /** Per-victim pop-up throttle. */
  nextText: Map<Fighter, number>;
  /** E+ Purge Sins: who is standing in it, so stepping in can be told from standing in. */
  inside: Set<Fighter>;
}

interface Grenade {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Hop height above the floor, for the art. */
  z: number;
  vz: number;
  spin: number;
  explodeAt: number;
  /** R+ Repentance: 0 for the first blast, then 1 and 2 for the two that follow it. */
  stage: number;
}

interface Crucifix {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  /** Lights up for a moment whenever something bounces off it. */
  flareUntil: number;
  /** F+ Pocket Crucifix: in the priest's hand rather than in the floor. */
  held: boolean;
  /** Held *and* brandished: the aura stands round the priest and walks with them. */
  raised: boolean;
}

/** Mastery — the Ark of the Covenant, set down on the floor. */
interface Ark {
  owner: Owner;
  x: number;
  y: number;
  bornAt: number;
  diesAt: number;
  /** 0–1, eased toward 1 while somebody stares at it — the light it gives off. */
  stare: number;
  /** Per-watcher pop-up throttle. */
  nextText: Map<Fighter, number>;
}

/** Q+ — a pillar of yellow fire dropped from the sky ride. */
interface Pillar {
  owner: Owner;
  x: number;
  y: number;
  landAt: number;
  diesAt: number;
  landed: boolean;
  seed: number;
  nextText: Map<Fighter, number>;
}

interface Side {
  owner: Owner;
  // Click — Sermon
  /** When the current press started, or 0 while the button is up. */
  chargeStartedAt: number;
  /**
   * The charge the next `doSermon` fires at; set just before the cast and spent by it. Online,
   * the peer's relayed charge lands here ahead of their cast.
   */
  pendingCharge: number;
  // E — Holy Water
  waterCharges: number;
  /** Refill times, oldest first. */
  waterRefills: number[];
  // F — the one standing crucifix (Crucifix lives in `crucifixes`)
  // Q — Ascendance
  lineY: number;
  lineDir: number;
  warnStartedAt: number;
  /** When the chariot sets off, or 0 when no line is up. */
  chariotAt: number;
  chariotX: number;
  chariotDone: boolean;
  /** The chariot has set off — the frame it does is the thunder. */
  chariotRolling: boolean;
  /** Everyone the chariot has already run over this pass. */
  struck: Fighter[];
  // The ride
  rideUntil: number;
  rideX: number;
  rideY: number;
  /** True if the kit, not something else, turned the caster's invincibility on. */
  rideOwnsInvincible: boolean;
  /** Q+: this ride is the long one, up in the sky with pillars to drop. */
  skyRide: boolean;
  pillarsLeft: number;
  /** The bot's next pillar on a sky ride. */
  nextPillarAt: number;
  /** F+: the bot's next pocket-crucifix decision. */
  nextPocketAt: number;
  // Mastery — Pray Always
  /** The next prayer, or 0 until mastery first sees this side. */
  prayAt: number;
  /** When the prayer said last is answered, or 0 when none is waiting. */
  answerAt: number;
  prayPoseUntil: number;
  /** The armour answer's end (scene time). */
  blessUntil: number;
  // Mastery — Ark of the Covenant
  /** The last Ark (scene time). Starts a cooldown in the past so it is ready. */
  arkAt: number;
  nextArkThinkAt: number;
  // Aim
  aimX: number;
  aimY: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner,
    chargeStartedAt: 0, pendingCharge: 0,
    waterCharges: WATER_CHARGES, waterRefills: [],
    lineY: 0, lineDir: 1, warnStartedAt: 0, chariotAt: 0, chariotX: 0, chariotDone: true,
    chariotRolling: false, struck: [],
    rideUntil: 0, rideX: 0, rideY: 0, rideOwnsInvincible: false,
    skyRide: false, pillarsLeft: 0, nextPillarAt: 0, nextPocketAt: 0,
    prayAt: 0, answerAt: 0, prayPoseUntil: 0, blessUntil: 0,
    arkAt: -ARK_COOLDOWN_MS, nextArkThinkAt: 0,
    aimX: 0, aimY: 0,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PassionArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** ArenaScene's shared physics group of `Projectile`s. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Kit-local travelling shots that registered themselves. */
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
  /** Online 1v1: the npc is a replica whose body and faith belong to the peer's sim. */
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** A boss fight: the boss drives its own body through set pieces, so nothing here moves it. */
  get bossFight(): boolean;
  isTargetable(f: Fighter): boolean;
  /** Invasion: husk shots inside a circle, with who fired them. Empty outside Invasion. */
  huskShotsNear(x: number, y: number, r: number): { key: object; from: Fighter | null }[];
  /** Skins: maps a Devotion visual colour through that side's equipped skin. */
  passionColor(owner: Owner, base: number): number;
  /** Skins: the skin id that side has equipped, or null. */
  skinId(owner: Owner): string | null;
  /** Shop upgrades: the local player's own, or the opponent's (online handshake / bot loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  /** Strips every discrete debuff off a fighter (the arena's one cleanse); returns how many. */
  purgeDebuffs(f: Fighter): number;
  /** Invasion: bless husk shots near a point (Click+). Empty outside Invasion. */
  disarmHuskShotsNear(
    x: number, y: number, r: number, damageMult: number, speedMult: number, color: number,
  ): { x: number; y: number }[];
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
  /** The real cursor in world space, before any Ark has bent it. */
  get pointer(): { x: number; y: number };
  /** Pseudo-casts relayed to the peer: the sermon's charge and the chariot's crash point. */
  broadcastMasteryCast(enhId: string): void;
}

// ── PassionKit ───────────────────────────────────────────────────────────────

export class PassionKit implements SummonPurgeTarget {
  private api: PassionArenaApi;

  // ── Visuals ──
  private readonly pcol: PassionColorFn;
  private readonly ncol: PassionColorFn;
  private readonly pfx: PassionFx;
  private readonly nfx: PassionFx;
  private playerAvatar: DevotionAvatar | null = null;
  private npcAvatar: DevotionAvatar | null = null;
  /** Puddles, crucifix auras, the Ascendance band — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Crucifixes, bottles, grenades, the chariot — over the fighters. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Halos and the faith bars — above `HealthBar` (depth 10). */
  private faceGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  /** Each victim's cap, latched the first frame Devotion sees them. */
  private caps = new Map<Fighter, number>();
  /** How many thresholds have been announced per victim — mirrored faith announces too. */
  private stages = new Map<Fighter, number>();
  /** Bodies already converted, so the execute fires once. */
  private converted = new WeakSet<Fighter>();
  private letters: Letter[] = [];
  private bottles: Bottle[] = [];
  private puddles: Puddle[] = [];
  private grenades: Grenade[] = [];
  private crucifixes: Crucifix[] = [];
  /** Enemy shots that have already paid their faith to a crucifix. */
  private blessedShots = new WeakSet<object>();
  /** Click+: enemy shots a letter has turned gold, so each is softened once and untinted when spent. */
  private disarmed = new Set<Projectile>();
  /** Q+: pillars of yellow fire on the floor. */
  private pillars: Pillar[] = [];
  private nextPruneAt = 0;
  /** Victim → time of the last passive pop-up, so "+2" shows once a second rather than per frame. */
  private passiveTextAt = new Map<Fighter, number>();
  /** Mastery — at most one Ark per side. */
  private arks: Ark[] = [];
  /** Mastery — this frame's sight-lines to an Ark, for the painter: who, whose Ark, and the bend. */
  private gazes: { owner: Owner; ark: Ark; f: Fighter; pull: number }[] = [];
  /** Mastery progress: holy-water faith not yet recorded as a whole point. */
  private waterFaithBank = 0;

  constructor(api: PassionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.passionColor('player', base);
    this.ncol = (base) => api.passionColor('npc', base);
    this.pfx = new PassionFx(api.scene, this.pcol);
    this.nfx = new PassionFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PassionFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PassionColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  private avatar(owner: Owner): DevotionAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private makeAvatar(owner: Owner): DevotionAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene) ?? new PassionAvatar(this.api.scene, this.col(owner));
  }
  /** The Passion skin: love art in place of the holy art, for that owner only. Visual only. */
  private isLove(owner: Owner): boolean { return this.api.skinId(owner) === 'passion'; }
  /** A floating-text line in that owner's voice. */
  private line(owner: Owner, text: string): string {
    return this.isLove(owner) ? (LOVE_LINES[text] ?? text) : text;
  }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }
  private clampX(x: number): number { return Phaser.Math.Clamp(x, this.left, this.right); }
  private clampY(y: number): number { return Phaser.Math.Clamp(y, this.top, this.bottom); }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): f is Fighter {
    return !!f && f.active && f.hp > 0;
  }

  private isDevotion(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'passion' : this.api.npcElementId === 'passion';
  }

  /** A Devotion side with that shop upgrade equipped. */
  private up(owner: Owner, slot: string): boolean {
    return this.isDevotion(owner) && this.api.hasUpgrade(owner, slot);
  }

  /**
   * The refusals `castAbility` would make, for the actions that bypass it (picking up, setting
   * down and brandishing the pocket crucifix). `isClick` actions survive Silence, as a click does.
   */
  private canAct(f: Fighter, isClick: boolean): boolean {
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.stunnedUntil) return false;
    if (!isClick && wall < f.silencedUntil) return false;
    return f.lockRemaining('passion-crucifix') <= 0;
  }

  /**
   * Whether this sim decides faith for `owner`. Online, the opponent's faith-giving is resolved
   * on their machine and mirrored onto us through `devotionFaith`; adding it here as well would
   * count every sermon twice.
   */
  private authority(owner: Owner): boolean {
    return !(owner === 'npc' && this.api.isOnline);
  }

  /** Everything this side is allowed to convert. In Invasion the npc slot is never an enemy. */
  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc') return this.api.isInvasion ? [] : [this.api.player].filter((f) => this.alive(f));
    return this.api.enemies.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /**
   * Whether this sim may move `t`'s body. Online the npc is a replica — its body belongs to the
   * peer's sim, which runs the same rule against it. Bosses drive their own bodies, and
   * Unbreakable/Unstoppable outrank every shove in the game.
   */
  private canMove(t: Fighter): boolean {
    if (this.api.isOnline && t === this.api.npc) return false;
    if (this.api.bossFight && t === this.api.npc) return false;
    return !t.knockbackImmune && !t.unstoppable;
  }

  // ── Faith ──────────────────────────────────────────────────────────────────

  /** The victim's cap, latched on first sight so a chipped husk is not cheaper than a fresh one. */
  private capOf(f: Fighter): number {
    let c = this.caps.get(f);
    if (c === undefined) {
      const duel = (f === this.api.player || f === this.api.npc) && !this.api.bossFight && !this.api.isInvasion;
      c = duel ? FAITH_MAX : Math.max(FAITH_MIN_CAP, Math.round(FAITH_MAX * (f.maxHp / FAITH_HP_REF)));
      this.caps.set(f, c);
    }
    return c;
  }

  /** 0–1 for anyone Devotion is working on. */
  faithRatio(f: Fighter | null | undefined): number {
    if (!f) return 0;
    return Phaser.Math.Clamp(f.devotionFaith / this.capOf(f), 0, 1);
  }

  private stageOf(ratio: number): number {
    let s = 0;
    for (const m of STAGE_MARKS) if (ratio >= m) s++;
    return s;
  }

  /**
   * The one way faith is ever added. Nothing anywhere takes it away.
   *
   * `passive` marks the 25% self-fill, which is not an attack and so does not get the 75%
   * stage's +25%. `icon` tags the pop-up; the number in it is what actually landed.
   */
  private addFaith(owner: Owner, victim: Fighter, amount: number, icon?: string, passive = false): number {
    if (amount <= 0 || !this.alive(victim) || !this.authority(owner)) return 0;
    if (this.converted.has(victim)) return 0;
    const cap = this.capOf(victim);
    let mult = 1;
    if (!passive && this.stageOf(victim.devotionFaith / cap) >= 3) mult = DEVOUT_FAITH_MULT;
    // Ruin's Combo Breaker halves every meter in the game, faith included. It is the priest's
    // meter even though it hangs over the victim, so it is the priest who is taxed.
    const applied = meterGain(this.fighter(owner), amount * mult);
    victim.devotionFaith = Math.min(cap, victim.devotionFaith + applied);

    if (icon) {
      this.api.showFloatingText(victim.x, victim.y - 34, `+${Math.round(applied)} ${icon}`,
        this.hex(mult > 1 ? DEV.white : DEV.holy));
    }
    if (victim.devotionFaith >= cap) this.convert(owner, victim);
    return applied;
  }

  /**
   * The bar filled. `pierce` + `netApplied` is the only combination in `takeDamage` that means
   * "exactly this number, no mitigation and no absorb layer", so a meter that cannot be lowered
   * cannot be shielded out of either. Online the hit lands on the replica and is relayed by the
   * ghost hook, so the victim dies on their own machine.
   */
  private convert(owner: Owner, victim: Fighter): void {
    if (this.converted.has(victim)) return;
    this.converted.add(victim);
    this.record(owner, 'souls');
    victim.devotionFaith = this.capOf(victim);
    this.fx(owner).convert(victim.x, victim.y);
    this.api.showFloatingText(victim.x, victim.y - 56, this.line(owner, '✝️ CONVERTED'), this.hex(this.col(owner)(DEV.white)));
    this.api.spawnHitFlash(victim.x, victim.y, DEV.holy);
    Sfx.playAt('reward-big', victim.x, { volume: 0.9, rate: 0.8 });
    Sfx.playAt('crystal-chime', victim.x, { volume: 0.8, rate: 0.9 });
    victim.takeDamage(Math.max(1, victim.hp), { pierce: true, netApplied: true });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      const s = this.sides[owner];
      if (f) {
        // Hand back everything this kit wrote onto a fighter.
        if (f.passionIncomingMult !== 1) f.passionIncomingMult = 1;
        if (s.rideOwnsInvincible) f.isInvincible = false;
        if (s.rideUntil > 0) { f.forceInvisible = false; if (f.active) f.setAlpha(1); }
        f.devotionFaith = 0;
        f.gazeTurnRad = 0;
        f.gazeUntil = 0;
      }
    }
    for (const l of this.letters) {
      l.text?.destroy();
      if (l.reg) this.api.projectileRegistry?.remove(l.reg);
    }
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.caps.clear();
    this.stages.clear();
    this.converted = new WeakSet();
    this.letters = [];
    this.bottles = [];
    this.puddles = [];
    this.grenades = [];
    this.crucifixes = [];
    this.blessedShots = new WeakSet();
    for (const p of this.disarmed) if (p.active) p.clearTint();
    this.disarmed.clear();
    this.pillars = [];
    this.passiveTextAt.clear();
    this.arks = [];
    this.gazes = [];
    this.waterFaithBank = 0;
    this.vizT = 0;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.faceGfx?.destroy(); this.faceGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.api.elementId !== 'passion') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const pressed = pointer.isDown && !this.api.pointerWasDown;
    // Riding the chariot: nothing is castable, and the cursor is choosing where to land. On the
    // Q+ sky ride a click drops one of the pillars of fire on it.
    if (s.rideUntil > 0) {
      s.chargeStartedAt = 0;
      if (pressed && s.skyRide && s.pillarsLeft > 0) {
        this.firePillar('player', mouseX, mouseY);
        this.api.broadcastMasteryCast('devotion-pillar');
      }
      return;
    }

    const p = this.api.player;
    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);
    // Mastery: whichever of R/F/Q the Ark was dropped on is the Ark's key now — the pocket
    // crucifix's pick-up and set-down included.
    const bound = this.arkSlot('player');
    for (const [k, key] of [['r', this.api.rKey], ['f', this.api.fKey], ['q', this.api.qKey]] as const) {
      if (bound === k && Phaser.Input.Keyboard.JustDown(key)) this.tryArk('player', mouseX, mouseY);
    }

    // F+ Pocket Crucifix: with the cross in hand, the click brandishes it instead of preaching.
    const held = this.crucifixes.find((c) => c.owner === 'player' && c.held);
    if (held) {
      s.chargeStartedAt = 0;
      if (pressed && this.canAct(p, true)) {
        this.setRaised('player', !held.raised);
        this.api.broadcastMasteryCast(held.raised ? 'devotion-raise' : 'devotion-lower');
      }
    }

    // Click — Sermon. Press starts preaching, release looses the barrage. A press while the
    // sermon is still cooling down is simply ignored rather than charging into nothing.
    if (!held && pressed && s.chargeStartedAt === 0 && p.getCooldownRatio('passion-sermon') >= 1) {
      s.chargeStartedAt = time;
    }
    if (!pointer.isDown && s.chargeStartedAt > 0) {
      const held = time - s.chargeStartedAt;
      s.chargeStartedAt = 0;
      const charge = held < SERMON_TAP_MS ? 0 : Phaser.Math.Clamp(held / SERMON_CHARGE_MS, 0, 1);
      s.pendingCharge = charge;
      // The charge rides ahead of the cast on the same ordered channel, so the peer's replay of
      // `passion-sermon` fires at the size we released, not at a tap.
      if (charge > 0) this.api.broadcastMasteryCast(`devotion-charge:${Math.round(charge * 100)}`);
      p.castAbility('passion-sermon', ctx());
    }

    // E — Holy Water spends a bottle; with none in hand the press is refused before the cast,
    // so it doesn't stamp a cooldown, play a sound or relay a phantom throw.
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      if (s.waterCharges > 0) p.castAbility('passion-holy-water', ctx());
      else this.api.showFloatingText(p.x, p.y - 44, '💧 NO HOLY WATER', this.hex(DEV.water));
    }
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('passion-grenade', ctx());
    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(this.api.fKey) && !this.pocketPress('player')) {
      p.castAbility('passion-crucifix', ctx());
    }
    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('passion-ascendance', ctx());
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Sermon. A staggered barrage of Greek letters, sized by how long it was preached. */
  doSermon(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    // The bot cannot hold a button; the kit decides how long it would have preached.
    const charge = owner === 'npc' && !this.api.isOnline ? this.npcSermonCharge() : s.pendingCharge;
    s.pendingCharge = 0;
    // F+: a priest with the cross in hand brandishes it on the click instead of preaching.
    if (this.crucifixes.some((c) => c.owner === owner && c.held)) return;

    const n = Math.round(Phaser.Math.Linear(SERMON_MIN_LETTERS, SERMON_MAX_LETTERS, charge));
    const faith = Phaser.Math.Linear(SERMON_MIN_FAITH, SERMON_MAX_FAITH, charge);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    // One straight file along the aim: the stagger alone spaces the letters out.
    for (let i = 0; i < n; i++) {
      const a = ang;
      this.letters.push({
        owner, glyph: GREEK[Math.floor(Math.random() * GREEK.length)],
        launchAt: this.now + i * LETTER_STAGGER_MS, launched: false,
        ang: a, x: f.x, y: f.y, vx: 0, vy: 0, diesAt: 0, faith,
        seed: Math.random() * 99,
        text: null, reg: null,
      });
    }

    const av = this.avatar(owner);
    av?.play('punch', ang);
    const tip = av?.handTip?.();
    this.fx(owner).preach(tip?.x ?? f.x + Math.cos(ang) * 20, tip?.y ?? f.y + Math.sin(ang) * 20, ang, charge);
    if (charge >= 0.99) {
      this.api.showFloatingText(f.x, f.y - 50, this.line(owner, '📖 GREAT SERMON'), this.hex(this.col(owner)(DEV.white)));
      Sfx.playAt('holy-chord', f.x, { volume: 0.6, rate: 1.1 });
    }
  }

  /** E — Holy Water. Lobs a vial that shatters into a boiling puddle where it lands. */
  doHolyWater(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const s = this.side(owner);
    // A replay of the peer's throw is trusted: their sim already spent the bottle.
    if (this.authority(owner)) {
      if (s.waterCharges <= 0) return;
      s.waterCharges--;
      // Refills queue: the second bottle starts its 7s only once the first is back.
      const last = s.waterRefills[s.waterRefills.length - 1] ?? this.now;
      s.waterRefills.push(Math.max(this.now, last) + WATER_RECHARGE_MS);
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(WATER_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    this.bottles.push({
      owner, fromX: f.x, fromY: f.y,
      toX: this.clampX(f.x + Math.cos(ang) * d), toY: this.clampY(f.y + Math.sin(ang) * d),
      bornAt: this.now,
    });
    this.avatar(owner)?.play('punch', ang);
    Sfx.playAt('whoosh', f.x, { volume: 0.5, rate: 1.3 });
  }

  /** R — Holy Hand Grenade. Thrown at the cursor; it arrives, then bounces about until the fuse. */
  doGrenade(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(GRENADE_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    // Exponential drag: pick the launch speed that covers exactly `d` in the travel time, so it
    // is at the cursor right as its first big bounce is spent.
    const v0 = (d * GRENADE_DRAG) / (1 - Math.exp(-GRENADE_DRAG * GRENADE_TRAVEL_S));
    this.grenades.push({
      owner, x: f.x + Math.cos(ang) * 16, y: f.y + Math.sin(ang) * 16,
      vx: Math.cos(ang) * v0, vy: Math.sin(ang) * v0,
      z: 4, vz: GRENADE_HOP_V * 1.3, spin: 0,
      explodeAt: this.now + GRENADE_FUSE_MS, stage: 0,
    });
    this.avatar(owner)?.play('slam', ang);
    this.api.showFloatingText(f.x, f.y - 50, this.line(owner, '💣 HALLELUJAH'), this.hex(this.col(owner)(DEV.gold)));
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 0.9 });
  }

  /** F — Mount Crucifix. Plants at the cursor; the old one comes down as the new one goes up. */
  doCrucifix(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(CRUCIFIX_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    const x = Phaser.Math.Clamp(f.x + Math.cos(ang) * d, this.left + 20, this.right - 20);
    const y = Phaser.Math.Clamp(f.y + Math.sin(ang) * d, this.top + 40, this.bottom - 10);

    const old = this.crucifixes.findIndex((c) => c.owner === owner);
    if (old >= 0) {
      const c = this.crucifixes[old];
      this.fx(owner).sparkle(c.x, c.y - 40, 8, 30, DEV.pale, 600);
      this.crucifixes.splice(old, 1);
    }
    this.crucifixes.push({ owner, x, y, bornAt: this.now, flareUntil: 0, held: false, raised: false });
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).plant(x, y, AURA_R);
    this.api.showFloatingText(x, y - 70, this.line(owner, '✝️ CRUCIFIX'), this.hex(this.col(owner)(DEV.holy)));
    Sfx.playAt('stone-slam', x, { volume: 0.7, rate: 1.1 });
  }

  /** Q — Ascendance. Draws the line where the priest stands; the chariot comes three seconds on. */
  doAscendance(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    void ty;
    const s = this.side(owner);
    s.lineY = this.clampY(f.y);
    // It runs toward the side the priest is aiming at, coming in from the opposite wall.
    s.lineDir = tx >= f.x ? 1 : -1;
    s.warnStartedAt = this.now;
    s.chariotAt = this.now + ASCEND_WARN_MS;
    s.chariotX = s.lineDir > 0 ? this.left - 120 : this.right + 120;
    s.chariotDone = false;
    s.chariotRolling = false;
    s.struck = [];
    this.avatar(owner)?.play('raise');
    this.fx(owner).ring(f.x, f.y, 10, 90, DEV.fire, 700);
    this.api.showFloatingText(f.x, f.y - 56, this.line(owner, '🔥 ASCENDANCE'), this.hex(this.col(owner)(DEV.fire)));
    Sfx.playAt('holy-chord', f.x, { volume: 0.8, rate: 0.85 });
  }

  /** Online: the peer told us how long their next sermon was preached. */
  setNpcSermonCharge(relayId: string): void {
    const pct = Number(relayId.split(':')[1] ?? 0);
    this.sides.npc.pendingCharge = Phaser.Math.Clamp((Number.isFinite(pct) ? pct : 0) / 100, 0, 1);
  }

  /** Online: the peer's priest came down off the chariot. Visual only — their sim paid the faith. */
  doNpcCrash(tx: number, ty: number): void {
    const s = this.sides.npc;
    s.rideUntil = 0;
    this.fx('npc').crash(tx, ty, CRASH_R);
    this.api.scene.cameras.main.shake(260, 0.008);
    Sfx.playAt('explosion-large', tx, { volume: 0.9, rate: 0.8 });
  }

  // ── Shop upgrades: the pocket crucifix (F+) and the sky ride's pillars (Q+) ──

  /**
   * F+ — an F press that the pocket crucifix takes instead of a fresh plant: with the cross in
   * hand it goes back down at the priest's feet; standing in its aura picks it up. Neither costs
   * the cooldown. False when the press should be an ordinary cast.
   */
  private pocketPress(owner: Owner): boolean {
    if (!this.up(owner, 'f')) return false;
    const f = this.fighter(owner);
    const c = this.crucifixes.find((x) => x.owner === owner);
    if (!c || !this.alive(f)) return false;
    if (c.held) {
      if (!this.canAct(f, false)) return true;
      this.setDownCrucifix(owner);
      if (owner === 'player') this.api.broadcastMasteryCast('devotion-place');
      return true;
    }
    if (Phaser.Math.Distance.Between(f.x, f.y, c.x, c.y) > AURA_R) return false;
    if (!this.canAct(f, false)) return true;
    this.pickUpCrucifix(owner);
    if (owner === 'player') this.api.broadcastMasteryCast('devotion-pickup');
    return true;
  }

  private pickUpCrucifix(owner: Owner): void {
    const c = this.crucifixes.find((x) => x.owner === owner);
    const f = this.fighter(owner);
    if (!c || c.held || !f) return;
    this.fx(owner).sparkle(c.x, c.y - 40, 8, 30, DEV.pale, 500);
    c.held = true;
    c.raised = false;
    this.api.showFloatingText(f.x, f.y - 56, this.line(owner, '✝️ IN HAND'), this.hex(this.col(owner)(DEV.holy)));
    Sfx.playAt('whoosh', f.x, { volume: 0.4, rate: 1.4 });
  }

  /** Back into the floor, where the priest is standing now. */
  private setDownCrucifix(owner: Owner): void {
    const c = this.crucifixes.find((x) => x.owner === owner);
    const f = this.fighter(owner);
    if (!c || !c.held || !f) return;
    c.held = false;
    c.raised = false;
    c.x = Phaser.Math.Clamp(f.x, this.left + 20, this.right - 20);
    c.y = Phaser.Math.Clamp(f.y, this.top + 40, this.bottom - 10);
    c.bornAt = this.now;
    this.avatar(owner)?.play('slam');
    this.fx(owner).plant(c.x, c.y, AURA_R);
    this.api.showFloatingText(c.x, c.y - 70, this.line(owner, '✝️ SET DOWN'), this.hex(this.col(owner)(DEV.holy)));
    Sfx.playAt('stone-slam', c.x, { volume: 0.6, rate: 1.2 });
  }

  /** Brandished: the aura goes up round the priest and walks with them. */
  private setRaised(owner: Owner, raised: boolean): void {
    const c = this.crucifixes.find((x) => x.owner === owner && x.held);
    const f = this.fighter(owner);
    if (!c || !f || c.raised === raised) return;
    c.raised = raised;
    if (raised) {
      c.bornAt = this.now;
      this.fx(owner).ring(f.x, f.y, 20, AURA_R, DEV.gold, 500);
      this.api.showFloatingText(f.x, f.y - 60, this.line(owner, '✝️ BEHOLD'), this.hex(this.col(owner)(DEV.white)));
      Sfx.playAt('holy-chord', f.x, { volume: 0.5, rate: 1.25 });
    } else {
      this.fx(owner).sparkle(f.x, f.y - 30, 6, 26, DEV.pale, 420);
    }
  }

  /** Q+ — a pillar of yellow fire dropped on (x, y) from the sky ride. */
  private firePillar(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    // A replay of the peer's pillar is trusted: their sim already counted it.
    if (this.authority(owner)) {
      if (s.pillarsLeft <= 0) return;
      s.pillarsLeft--;
    } else {
      s.pillarsLeft = Math.max(0, s.pillarsLeft - 1);
    }
    const x = this.clampX(tx);
    const y = this.clampY(ty);
    this.pillars.push({
      owner, x, y, landAt: this.now + PILLAR_DROP_MS, diesAt: this.now + PILLAR_DROP_MS + PILLAR_MS,
      landed: false, seed: Math.random() * 9, nextText: new Map(),
    });
    if (owner === 'player' || !this.api.isOnline) {
      this.api.showFloatingText(x, y - 64, `🔥 PILLAR ${PILLARS - s.pillarsLeft}/${PILLARS}`, this.hex(DEV.gold));
    }
    Sfx.playAt('whoosh', x, { volume: 0.6, rate: 0.7 });
  }

  /**
   * Online: one of the peer's upgrade actions that bypass `castAbility`. Their sim decided it;
   * this one mirrors the object so it is drawn and — for a brandished crucifix — so the aura's
   * exclusion runs here, where our body is.
   */
  replayNpcUpgradeAct(id: string, tx: number, ty: number): void {
    switch (id) {
      case 'devotion-pickup': this.pickUpCrucifix('npc'); break;
      case 'devotion-place': this.setDownCrucifix('npc'); break;
      case 'devotion-raise': this.setRaised('npc', true); break;
      case 'devotion-lower': this.setRaised('npc', false); break;
      case 'devotion-pillar': this.firePillar('npc', tx, ty); break;
      case 'devotion-pray': this.sayPrayer('npc'); break;
      default:
        // Mastery: the peer's prayer was answered — their sim rolled which way.
        if (id.startsWith('devotion-answer:')) {
          const k = id.slice('devotion-answer:'.length) as Answer;
          if ((ANSWERS as readonly string[]).includes(k)) this.answerPrayer('npc', k);
        }
        break;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const playerIs = this.isDevotion('player');
    const npcIs = this.isDevotion('npc');
    // World objects outlive their caster's element only for as long as they would anyway — but a
    // match with no Devotion in it has none to tick.
    if (!playerIs && !npcIs && !this.letters.length && !this.puddles.length && !this.grenades.length
      && !this.crucifixes.length && !this.pillars.length && !this.disarmed.size && !this.arks.length) return;

    this.vizT += delta / 1000;
    this.ensureLayers();
    const dt = delta / 1000;

    for (const owner of BOTH) {
      if (!this.isDevotion(owner)) continue;
      const targets = this.targetsOf(owner);
      for (const t of targets) this.capOf(t);
      this.updateRefills(owner, time);
      this.updatePassive(owner, targets, time, dt);
      this.updateDrag(owner, targets, dt);
      this.updateArmour(owner, targets);
      this.updateAscend(owner, time, delta);
      this.updateRide(owner, time);
      this.updatePrayer(owner, time);
    }
    this.updateNpcPocket(time);
    this.updateArks(time, dt);
    this.updateNpcMastery(time);

    this.updateLetters(time, dt);
    this.updateDisarmed();
    this.updateBottles(time);
    this.updatePuddles(time, dt);
    this.updateGrenades(time, dt);
    this.updatePillars(time, dt);
    this.updateCrucifixes();
    this.updateStages();
    this.prune(time);
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir(time);
    this.paintFaces();
    this.paintMastery();
    this.pushStatuses(playerIs, time);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5 and their health bars at 10.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.faceGfx) this.faceGfx = scene.add.graphics().setDepth(11);
  }

  private updateRefills(owner: Owner, time: number): void {
    const s = this.side(owner);
    while (s.waterRefills.length && time >= s.waterRefills[0]) {
      s.waterRefills.shift();
      s.waterCharges = Math.min(WATER_CHARGES, s.waterCharges + 1);
    }
  }

  /** 25%: faith fills on its own. Announced once a second rather than every frame. */
  private updatePassive(owner: Owner, targets: Fighter[], time: number, dt: number): void {
    if (!this.authority(owner)) return;
    for (const t of targets) {
      if (this.stageOf(this.faithRatio(t)) < 1) continue;
      this.addFaith(owner, t, KINDLED_PER_SEC * dt, undefined, true);
      if (time >= (this.passiveTextAt.get(t) ?? 0)) {
        this.passiveTextAt.set(t, time + 1000);
        this.api.showFloatingText(t.x + 14, t.y - 30, `+${KINDLED_PER_SEC} 🕯️`, this.hex(DEV.pale));
      }
    }
  }

  /**
   * 75%: drawn toward the nearest holy water this priest has on the floor. Written as a position
   * nudge after movement, so it is a pull they can walk against but never ignore. Runs on
   * whichever sim owns the body, reading faith that may have been mirrored in.
   */
  private updateDrag(owner: Owner, targets: Fighter[], dt: number): void {
    const pools = this.puddles.filter((p) => p.owner === owner);
    if (!pools.length) return;
    for (const t of targets) {
      if (this.stageOf(this.faithRatio(t)) < 3 || !this.canMove(t)) continue;
      let best: Puddle | null = null;
      let bd = Infinity;
      for (const p of pools) {
        const d = Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (!best || bd < PUDDLE_R * 0.4) continue;
      const a = Math.atan2(best.y - t.y, best.x - t.x);
      const step = Math.min(bd, DEVOUT_DRAG_SPEED * dt);
      const nx = t.x + Math.cos(a) * step;
      const ny = t.y + Math.sin(a) * step;
      const b = this.body(t);
      t.setPosition(nx, ny);
      b?.reset(nx, ny);
    }
  }

  /**
   * 50%: the believer's blows soften against the priest. There is no outgoing-damage chokepoint
   * in the game, so — like the old rose — it is armour on the priest: a victim-side
   * `passionIncomingMult`, written every frame by this one writer. With several enemies (an
   * Invasion room) it follows the nearest of them, which is almost always the one swinging.
   *
   * Online, a remote priest's armour travels in their own `dm` field, so this sim leaves the
   * replica's multiplier alone rather than counting it twice.
   */
  private updateArmour(owner: Owner, targets: Fighter[]): void {
    const f = this.fighter(owner);
    if (!f || !this.authority(owner)) return;
    let nearest: Fighter | null = null;
    let nd = Infinity;
    for (const t of targets) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < nd) { nd = d; nearest = t; }
    }
    let mult = nearest && this.stageOf(this.faithRatio(nearest)) >= 2 ? FAITHFUL_DAMAGE_MULT : 1;
    // Mastery — a prayer answered with armour. Same single writer, so it rides `dm` online too.
    if (this.side(owner).blessUntil > this.now) mult *= BLESS_ARMOUR_MULT;
    if (f.passionIncomingMult !== mult) f.passionIncomingMult = mult;
  }

  // ── Ascendance ────────────────────────────────────────────────────────────

  private updateAscend(owner: Owner, time: number, delta: number): void {
    const s = this.side(owner);
    if (s.chariotDone || s.chariotAt <= 0) return;
    if (time < s.chariotAt) return;
    const f = this.fighter(owner);

    // The first frame of the run: the thunder.
    if (!s.chariotRolling) {
      s.chariotRolling = true;
      this.api.scene.cameras.main.shake(300, 0.004);
      Sfx.playAt('meteor', this.api.width / 2, { volume: 0.6, rate: 0.7 });
    }

    const prevX = s.chariotX;
    s.chariotX += s.lineDir * CHARIOT_SPEED * (delta / 1000);
    const lo = Math.min(prevX, s.chariotX);
    const hi = Math.max(prevX, s.chariotX);
    const inBand = (b: Fighter): boolean => Math.abs(b.y - s.lineY) <= BAND_HALF + 14;

    for (const t of this.targetsOf(owner)) {
      if (s.struck.includes(t) || t.x < lo - 20 || t.x > hi + 20 || !inBand(t)) continue;
      s.struck.push(t);
      this.api.spawnHitFlash(t.x, t.y, DEV.fire);
      this.fx(owner).sparkle(t.x, t.y, 10, 34, DEV.fireHot, 600);
      this.addFaith(owner, t, CHARIOT_FAITH, '🔥');
    }

    // Caught in it yourself: the chariot hauls you aboard. On the peer's replay this is only
    // drawn — their sim decides the ride and tells us where it came down.
    if (this.alive(f) && s.rideUntil === 0 && f.x >= lo - 20 && f.x <= hi + 20 && inBand(f)) {
      this.startRide(owner);
    }

    const off = s.lineDir > 0 ? s.chariotX > this.api.width + 200 : s.chariotX < -200;
    if (off) {
      s.chariotDone = true;
      s.chariotAt = 0;
    }
  }

  private startRide(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    // Q+: the long ride — eight seconds up in the sky with three pillars of fire to drop.
    s.skyRide = this.up(owner, 'q');
    s.pillarsLeft = s.skyRide ? PILLARS : 0;
    s.nextPillarAt = this.now + NPC_PILLAR_FIRST_MS;
    s.rideUntil = this.now + (s.skyRide ? SKY_RIDE_MS : RIDE_MS);
    s.rideX = f.x;
    s.rideY = f.y;
    this.record(owner, 'chariotRides');
    this.fx(owner).liftOff(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 56, this.line(owner, s.skyRide ? '🙌 TAKEN UP · 🔥×3' : '🙌 TAKEN UP'), this.hex(this.col(owner)(DEV.fireHot)));
    if (owner === 'player' || !this.api.isOnline) {
      if (!f.isInvincible) { f.isInvincible = true; s.rideOwnsInvincible = true; }
    }
    f.forceInvisible = true;
    f.setAlpha(0);
  }

  /** The ride: held out of the fight, then dropped on the cursor (the bot drops on its target). */
  private updateRide(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (s.rideUntil <= 0) return;
    const f = this.fighter(owner);
    if (!f || !f.active) { this.endRide(owner); return; }

    // Held where it was taken, invisible: nothing aims at it and nothing walks it anywhere.
    if (!(owner === 'npc' && this.api.isOnline)) {
      f.setPosition(s.rideX, s.rideY);
      this.body(f)?.reset(s.rideX, s.rideY);
    }
    f.setAlpha(0);
    if (owner === 'npc') {
      const p = this.api.player;
      if (this.alive(p)) { s.aimX = p.x; s.aimY = p.y; }
      // The bot's sky ride: a pillar on the player's lead every couple of seconds. Online the
      // peer drops their own and the relay brings them.
      if (s.skyRide && !this.api.isOnline && s.pillarsLeft > 0 && time >= s.nextPillarAt && this.alive(p)) {
        s.nextPillarAt = time + NPC_PILLAR_EVERY_MS;
        const pb = this.body(p);
        this.firePillar('npc', p.x + (pb?.velocity.x ?? 0) * 0.25, p.y + (pb?.velocity.y ?? 0) * 0.25);
      }
    }
    if (time < s.rideUntil) return;

    // A remote priest lands where their sim says — `doNpcCrash` brings the news.
    if (owner === 'npc' && this.api.isOnline) {
      if (time > s.rideUntil + 1500) this.endRide(owner);
      return;
    }

    const x = this.clampX(s.aimX);
    const y = this.clampY(s.aimY);
    this.endRide(owner);
    f.setPosition(x, y);
    this.body(f)?.reset(x, y);
    if (owner === 'player') this.api.broadcastMasteryCast('devotion-crash');
    this.fx(owner).crash(x, y, CRASH_R);
    this.api.scene.cameras.main.shake(320, 0.009);
    Sfx.playAt('explosion-large', x, { volume: 1, rate: 0.75 });
    this.api.showFloatingText(x, y - 60, this.line(owner, '☄️ DESCENT'), this.hex(this.col(owner)(DEV.fire)));
    // The burst lands with the comet, a beat after the body.
    this.api.scene.time.delayedCall(200, () => {
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > CRASH_R + 16) continue;
        this.addFaith(owner, t, CRASH_FAITH, '☄️');
      }
    });
  }

  private endRide(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.rideUntil = 0;
    s.skyRide = false;
    s.pillarsLeft = 0;
    if (!f) return;
    if (s.rideOwnsInvincible) { f.isInvincible = false; s.rideOwnsInvincible = false; }
    f.forceInvisible = false;
    if (f.active) f.setAlpha(1);
  }

  // ── Projectiles and world objects ─────────────────────────────────────────

  private updateLetters(time: number, dt: number): void {
    const reg = this.api.projectileRegistry;
    for (let i = this.letters.length - 1; i >= 0; i--) {
      const l = this.letters[i];
      if (!l.launched) {
        if (time < l.launchAt) continue;
        const f = this.fighter(l.owner);
        if (!this.alive(f) || !this.isDevotion(l.owner)) { this.letters.splice(i, 1); continue; }
        const av = this.avatar(l.owner);
        const tip = av?.handTip?.();
        l.x = tip && Number.isFinite(tip.x) ? tip.x : f.x + Math.cos(l.ang) * 18;
        l.y = tip && Number.isFinite(tip.y) ? tip.y : f.y + Math.sin(l.ang) * 18;
        const v = LETTER_SPEED;
        l.vx = Math.cos(l.ang) * v;
        l.vy = Math.sin(l.ang) * v;
        l.diesAt = time + LETTER_LIFE_MS;
        l.launched = true;
        l.text = this.api.scene.add.text(l.x, l.y, l.glyph, {
          fontSize: '17px', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'bold',
          color: this.hex(this.col(l.owner)(DEV.pale)),
          stroke: this.hex(this.col(l.owner)(DEV.umber)), strokeThickness: 3,
        }).setOrigin(0.5).setDepth(9.5);
        const entry: RegisteredProjectile = {
          owner: l.owner, damage: 0,
          getX: () => l.x, getY: () => l.y,
          steal: () => { l.diesAt = 0; l.faith = 0; },
        };
        l.reg = entry;
        reg?.add(entry);
      }

      const age = 1 - (l.diesAt - time) / LETTER_LIFE_MS;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      // Click+ Disarming Words: the letter blesses every enemy shot it passes through, and flies on.
      if (l.faith > 0 && this.up(l.owner, 'click')) this.disarmNear(l.owner, l.x, l.y);

      const gone = time >= l.diesAt || l.x < this.left - 40 || l.x > this.right + 40
        || l.y < this.top - 40 || l.y > this.bottom + 40;
      let hit: Fighter | null = null;
      if (!gone && l.faith > 0) {
        for (const t of this.targetsOf(l.owner)) {
          if (Phaser.Math.Distance.Between(l.x, l.y, t.x, t.y) <= LETTER_HIT_R + 16) { hit = t; break; }
        }
      }
      if (hit) {
        this.fx(l.owner).letterHit(hit.x, hit.y - 4, l.ang);
        this.addFaith(l.owner, hit, l.faith, '✝');
        Sfx.playAt('crystal-chime', hit.x, { volume: 0.25, rate: 1.6 + Math.random() * 0.3 });
      }
      if (gone || hit) {
        l.text?.destroy();
        if (l.reg) reg?.remove(l.reg);
        this.letters.splice(i, 1);
        continue;
      }
      l.text?.setPosition(l.x, l.y);
      l.text?.setAlpha(age > 0.85 ? (1 - age) / 0.15 : 1);
    }
  }

  /**
   * Click+ — every enemy shot within reach of a letter that has not been blessed yet turns gold:
   * 20% less damage and 20% slower, once. Each sim blesses its own copies, and since a shot's
   * damage is resolved on its shooter's sim, the letters there (the replay of ours) are the ones
   * that count online.
   */
  private disarmNear(owner: Owner, x: number, y: number): void {
    // In Invasion the npc slot is an ally; its shots are not the enemy's.
    if (!this.api.isInvasion) {
      const enemyIsPlayer = owner === 'npc';
      for (const obj of this.api.projectiles?.getChildren() ?? []) {
        if (!(obj instanceof Projectile) || !obj.active || obj.isHeal) continue;
        if (obj.isFromPlayer !== enemyIsPlayer || this.disarmed.has(obj)) continue;
        if (Phaser.Math.Distance.Between(obj.x, obj.y, x, y) > DISARM_R) continue;
        this.disarmed.add(obj);
        obj.damage *= DISARM_DAMAGE_MULT;
        const b = obj.body as Phaser.Physics.Arcade.Body | null;
        b?.velocity.scale(DISARM_SPEED_MULT);
        obj.setTint(DISARM_TINT);
        this.blessedShot(owner, obj.x, obj.y);
      }
    } else if (owner === 'player') {
      for (const at of this.api.disarmHuskShotsNear(x, y, DISARM_R, DISARM_DAMAGE_MULT, DISARM_SPEED_MULT, DISARM_TINT)) {
        this.blessedShot(owner, at.x, at.y);
      }
    }
  }

  private blessedShot(owner: Owner, x: number, y: number): void {
    this.fx(owner).disarm(x, y);
    this.api.showFloatingText(x, y - 18, '✨ DISARMED', this.hex(DEV.gold));
    Sfx.playAt('crystal-chime', x, { volume: 0.2, rate: 1.9 });
  }

  /** A spent shot hands its tint back — the projectile group may recycle the object. */
  private updateDisarmed(): void {
    for (const p of this.disarmed) {
      if (p.active) continue;
      p.clearTint();
      this.disarmed.delete(p);
    }
  }

  private updateBottles(time: number): void {
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i];
      if (time - b.bornAt < WATER_FLIGHT_MS) continue;
      this.bottles.splice(i, 1);
      this.puddles.push({
        owner: b.owner, x: b.toX, y: b.toY, bornAt: time, diesAt: time + PUDDLE_MS,
        seed: Math.random() * 999, nextText: new Map(), inside: new Set(),
      });
      this.fx(b.owner).shatter(b.toX, b.toY, PUDDLE_R);
      Sfx.playAt('ice-shatter', b.toX, { volume: 0.6, rate: 1.2 });
      Sfx.playAt('bubble', b.toX, { volume: 0.6, rate: 0.7 });
    }
  }

  private updatePuddles(time: number, dt: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time >= p.diesAt) { this.puddles.splice(i, 1); continue; }
      if (!this.isDevotion(p.owner)) continue;
      for (const t of this.targetsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y) > PUDDLE_R) { p.inside.delete(t); continue; }
        // E+ Purge Sins: the step in (or the splash landing on them) washes them clean.
        if (!p.inside.has(t)) {
          p.inside.add(t);
          if (this.up(p.owner, 'e')) this.purgeSins(p.owner, t);
        }
        const landed = this.addFaith(p.owner, t, PUDDLE_FAITH_PER_SEC * dt);
        if (p.owner === 'player' && landed > 0) {
          this.waterFaithBank += landed;
          const whole = Math.floor(this.waterFaithBank);
          if (whole > 0) { this.waterFaithBank -= whole; this.record('player', 'holyWaterFaith', whole); }
        }
        if (time >= (p.nextText.get(t) ?? 0) && this.authority(p.owner)) {
          p.nextText.set(t, time + PUDDLE_TEXT_MS);
          this.api.showFloatingText(t.x - 14, t.y - 34, `+${PUDDLE_FAITH_PER_SEC} 💧`, this.hex(DEV.water));
        }
      }
    }
  }

  /**
   * E+ — every negative effect on the believer comes off in the holy water, and the priest is
   * paid faith for how much there was: per effect, per second the timed ones had left, per stack.
   *
   * The cleanse runs on every sim (each clears its own copy; online the victim's own machine is
   * the one holding their real timers), the faith only where the priest has authority.
   */
  private purgeSins(owner: Owner, t: Fighter): void {
    const m = measureDebuffs(t, Date.now(), this.now, PURGE_SEC_CAP);
    const n = Math.max(m.count, this.api.purgeDebuffs(t));
    if (n <= 0) return;
    const extra = Math.max(0, n - m.count);
    const faith = Math.min(PURGE_FAITH_MAX, (m.count + extra) * PURGE_FAITH_PER_EFFECT
      + m.seconds * PURGE_FAITH_PER_SEC + m.stacks * PURGE_FAITH_PER_STACK);
    this.fx(owner).purge(t.x, t.y, Phaser.Math.Clamp(faith / PURGE_FAITH_MAX, 0, 1));
    this.api.showFloatingText(t.x, t.y - 60, `🫧 SINS PURGED ×${n}`, this.hex(DEV.waterLit));
    Sfx.playAt('bubble', t.x, { volume: 0.7, rate: 1.1 });
    this.addFaith(owner, t, faith, '🫧');
  }

  private updateGrenades(time: number, dt: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      // Roll, with drag.
      const keep = Math.exp(-GRENADE_DRAG * dt);
      gr.vx *= keep;
      gr.vy *= keep;
      gr.x += gr.vx * dt;
      gr.y += gr.vy * dt;
      gr.spin += Math.hypot(gr.vx, gr.vy) * dt * 0.08;
      // Hop off the floor — each landing a little lower, and every landing kicks it again so it
      // never quite settles before the fuse.
      gr.vz -= GRENADE_GRAVITY * dt;
      gr.z += gr.vz * dt;
      if (gr.z <= 0) {
        gr.z = 0;
        gr.vz = Math.max(GRENADE_HOP_V * 0.45, Math.abs(gr.vz) * 0.6);
        // A bounce off the floor kicks it off in a slightly new direction.
        const turn = (Math.random() - 0.5) * 0.9;
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const sp = Math.max(Math.hypot(gr.vx, gr.vy), 70);
        const a = Math.atan2(gr.vy, gr.vx);
        gr.vx = Math.cos(a) * sp * c - Math.sin(a) * sp * s;
        gr.vy = Math.sin(a) * sp * c + Math.cos(a) * sp * s;
        Sfx.playAt('boing', gr.x, { volume: 0.15, rate: 1.6 });
      }
      // Walls.
      if (gr.x < this.left + GRENADE_R) { gr.x = this.left + GRENADE_R; gr.vx = Math.abs(gr.vx) * GRENADE_RESTITUTION; }
      if (gr.x > this.right - GRENADE_R) { gr.x = this.right - GRENADE_R; gr.vx = -Math.abs(gr.vx) * GRENADE_RESTITUTION; }
      if (gr.y < this.top + GRENADE_R) { gr.y = this.top + GRENADE_R; gr.vy = Math.abs(gr.vy) * GRENADE_RESTITUTION; }
      if (gr.y > this.bottom - GRENADE_R) { gr.y = this.bottom - GRENADE_R; gr.vy = -Math.abs(gr.vy) * GRENADE_RESTITUTION; }
      // Enemy bodies, and the rim of an *enemy* crucifix, are walls too. Its own crucifix lets
      // it through — so a grenade lobbed past your cross keeps rattling around the believer
      // who is pinned against its edge.
      for (const t of this.targetsOf(gr.owner)) this.bounceOff(gr, t.x, t.y, 22);
      for (const c of this.crucifixes) {
        if (c.owner !== gr.owner && (!c.held || c.raised)) this.bounceOff(gr, c.x, c.y, AURA_R);
      }

      if (time < gr.explodeAt) continue;
      const share = REPENT_FAITH[gr.stage] ?? 1;
      this.fx(gr.owner).holyBurst(gr.x, gr.y, BURST_R, gr.stage ? 0.8 : 1);
      this.api.scene.cameras.main.shake(260, gr.stage ? 0.004 : 0.007);
      Sfx.playAt('explosion-medium', gr.x, { volume: gr.stage ? 0.7 : 0.9, rate: 1.05 + gr.stage * 0.1 });
      Sfx.playAt('holy-chord', gr.x, { volume: 0.6, rate: 1.3 + gr.stage * 0.1 });
      for (const t of this.targetsOf(gr.owner)) {
        if (Phaser.Math.Distance.Between(gr.x, gr.y, t.x, t.y) > BURST_R + 14) continue;
        this.addFaith(gr.owner, t, BURST_FAITH * share, '💥');
        this.record(gr.owner, 'grenadeHits');
      }
      // R+ Repentance: it survives its own blast and leaps at the enemy, twice.
      if (gr.stage < REPENT_FAITH.length - 1 && this.up(gr.owner, 'r')) {
        this.repentLeap(gr, time);
        continue;
      }
      this.grenades.splice(i, 1);
    }
  }

  /** R+ — the grenade jumps up off its own blast toward the nearest enemy and re-arms. */
  private repentLeap(gr: Grenade, time: number): void {
    gr.stage++;
    gr.explodeAt = time + REPENT_FUSE_MS;
    let target: Fighter | null = null;
    let bd = Infinity;
    for (const t of this.targetsOf(gr.owner)) {
      const d = Phaser.Math.Distance.Between(gr.x, gr.y, t.x, t.y);
      if (d < bd) { bd = d; target = t; }
    }
    const ang = target ? Math.atan2(target.y - gr.y, target.x - gr.x) : Math.random() * Math.PI * 2;
    const d = target ? Math.min(GRENADE_RANGE, bd) : 120;
    const v0 = (d * GRENADE_DRAG) / (1 - Math.exp(-GRENADE_DRAG * REPENT_LEAP_S));
    gr.vx = Math.cos(ang) * v0;
    gr.vy = Math.sin(ang) * v0;
    gr.z = Math.max(gr.z, 4);
    gr.vz = GRENADE_HOP_V * 1.8;
    this.api.showFloatingText(gr.x, gr.y - 30, gr.stage === 1 ? '🙏 REPENT' : '🙏 REPENT AGAIN', this.hex(DEV.gold));
    Sfx.playAt('boing', gr.x, { volume: 0.4, rate: 0.9 });
  }

  /**
   * Q+ — the pillars burn for a second after they land: faith every frame to anyone inside, and a
   * slow written on the priest's sim (online the status mirror carries it to the victim).
   */
  private updatePillars(time: number, dt: number): void {
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pl = this.pillars[i];
      if (time >= pl.diesAt) { this.pillars.splice(i, 1); continue; }
      if (time < pl.landAt) continue;
      if (!pl.landed) {
        pl.landed = true;
        this.fx(pl.owner).pillarLand(pl.x, pl.y, PILLAR_R);
        this.api.scene.cameras.main.shake(140, 0.004);
        Sfx.playAt('explosion-medium', pl.x, { volume: 0.55, rate: 1.4 });
      }
      for (const t of this.targetsOf(pl.owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, pl.x, pl.y) > PILLAR_R + 14) continue;
        if (!this.authority(pl.owner)) continue;
        this.addFaith(pl.owner, t, PILLAR_FAITH_PER_SEC * dt);
        if (!t.unstoppable) t.devotionSlowUntil = Math.max(t.devotionSlowUntil, Date.now() + PILLAR_SLOW_MS);
        if (time >= (pl.nextText.get(t) ?? 0)) {
          pl.nextText.set(t, time + 400);
          this.api.showFloatingText(t.x + 12, t.y - 36, `+${Math.round(PILLAR_FAITH_PER_SEC * 0.4)} 🔥`, this.hex(DEV.gold));
        }
      }
    }
  }

  /** Reflects the grenade off a circle of radius `r` it has strayed inside. */
  private bounceOff(gr: Grenade, cx: number, cy: number, r: number): void {
    const d = Phaser.Math.Distance.Between(gr.x, gr.y, cx, cy);
    if (d >= r + GRENADE_R || d < 0.01) return;
    const nx = (gr.x - cx) / d;
    const ny = (gr.y - cy) / d;
    gr.x = cx + nx * (r + GRENADE_R);
    gr.y = cy + ny * (r + GRENADE_R);
    const dot = gr.vx * nx + gr.vy * ny;
    if (dot < 0) {
      gr.vx = (gr.vx - 2 * dot * nx) * GRENADE_RESTITUTION;
      gr.vy = (gr.vy - 2 * dot * ny) * GRENADE_RESTITUTION;
    }
  }

  /**
   * The crucifix's two rules. Enemies cannot set foot in the aura — anyone inside is set back on
   * its rim, on whichever sim owns their body — and every enemy shot that crosses into it pays
   * its shooter 1 faith, once per shot.
   */
  private updateCrucifixes(): void {
    for (const c of this.crucifixes) {
      if (!this.isDevotion(c.owner)) continue;
      // F+ — a cross in the hand goes where the priest goes; only a brandished one has an aura.
      if (c.held) {
        const f = this.fighter(c.owner);
        if (f) { c.x = f.x; c.y = f.y; }
        if (!c.raised || !this.alive(f) || this.side(c.owner).rideUntil > 0) continue;
      }
      for (const t of this.targetsOf(c.owner)) {
        const d = Phaser.Math.Distance.Between(t.x, t.y, c.x, c.y);
        if (d >= AURA_R || !this.canMove(t)) continue;
        const a = d < 0.5 ? Math.random() * Math.PI * 2 : Math.atan2(t.y - c.y, t.x - c.x);
        const rim = this.rimPoint(c, t, a);
        // No spot on the rim the body fits (the aura fills a corner): leave it be rather than
        // fighting the world bounds every frame.
        if (!rim) continue;
        const { x: nx, y: ny } = rim;
        // `reset` zeroes velocity. Hand back everything but the push into the aura, so a body
        // on the rim slides around it instead of sticking to it.
        const b = this.body(t);
        const vx = b?.velocity.x ?? 0;
        const vy = b?.velocity.y ?? 0;
        t.setPosition(nx, ny);
        b?.reset(nx, ny);
        if (b) {
          const ox = Math.cos(rim.ang);
          const oy = Math.sin(rim.ang);
          const out = vx * ox + vy * oy;
          b.setVelocity(out < 0 ? vx - out * ox : vx, out < 0 ? vy - out * oy : vy);
        }
        if (c.flareUntil < this.now) {
          this.fx(c.owner).blessShot(nx, ny);
          Sfx.playAt('ui-denied', nx, { volume: 0.25, rate: 1.4 });
        }
        c.flareUntil = this.now + 160;
      }
      this.blessShots(c);
    }
  }

  /**
   * Where on the aura's rim to set a body down: straight out along `ang` if it fits inside the
   * arena, otherwise the nearest rim angle that does. A crucifix planted near a wall has part of
   * its rim outside the world bounds, and a body pushed there is pushed straight back in by the
   * bounds every frame — that tug-of-war is what pinned players in place.
   */
  private rimPoint(c: Crucifix, t: Fighter, ang: number): { x: number; y: number; ang: number } | null {
    const wb = this.api.scene.physics.world.bounds;
    const b = this.body(t);
    const rx = (b?.halfWidth ?? 22) + 1;
    const ry = (b?.halfHeight ?? 22) + 1;
    const fits = (x: number, y: number): boolean =>
      x >= wb.left + rx && x <= wb.right - rx && y >= wb.top + ry && y <= wb.bottom - ry;
    const step = Math.PI / 36;
    for (let k = 0; k <= 36; k++) {
      for (const sign of k === 0 ? [1] : [1, -1]) {
        const a = ang + sign * k * step;
        const x = c.x + Math.cos(a) * AURA_R;
        const y = c.y + Math.sin(a) * AURA_R;
        if (fits(x, y)) return { x, y, ang: a };
      }
    }
    return null;
  }

  private blessShots(c: Crucifix): void {
    const enemySide: Owner = c.owner === 'player' ? 'npc' : 'player';
    // The shooter: in a duel the one fighter on the other side; in Invasion a shared-group shot
    // has no shooter to pay, so only husk shots (which carry one) count there.
    const duelShooter = this.api.isInvasion ? null : this.fighter(enemySide);
    const pay = (key: object, x: number, y: number, shooter: Fighter | null): void => {
      if (this.blessedShots.has(key)) return;
      this.blessedShots.add(key);
      this.fx(c.owner).blessShot(x, y);
      c.flareUntil = this.now + 160;
      if (shooter && this.alive(shooter) && this.targetsOf(c.owner).includes(shooter)) {
        this.addFaith(c.owner, shooter, SHOT_FAITH, '✝');
      }
    };

    const group = this.api.projectiles;
    if (group) {
      for (const obj of group.getChildren()) {
        if (!(obj instanceof Projectile) || !obj.active || obj.isHeal) continue;
        const fromPlayer = obj.isFromPlayer;
        if ((enemySide === 'player') !== fromPlayer) continue;
        if (Phaser.Math.Distance.Between(obj.x, obj.y, c.x, c.y) > AURA_R) continue;
        pay(obj, obj.x, obj.y, duelShooter);
      }
    }
    for (const p of this.api.projectileRegistry?.within(enemySide, c.x, c.y, AURA_R) ?? []) {
      pay(p, p.getX(), p.getY(), duelShooter);
    }
    if (this.api.isInvasion && c.owner === 'player') {
      for (const s of this.api.huskShotsNear(c.x, c.y, AURA_R)) pay(s.key, c.x, c.y, s.from);
    }
  }

  /** Stage announcements, for every victim — mirrored faith (online) announces as well. */
  private updateStages(): void {
    for (const owner of BOTH) {
      if (!this.isDevotion(owner)) continue;
      for (const t of this.targetsOf(owner)) {
        const stage = this.stageOf(this.faithRatio(t));
        const shown = this.stages.get(t) ?? 0;
        if (stage <= shown) continue;
        this.stages.set(t, stage);
        this.api.showFloatingText(t.x, t.y - 52, this.line(owner, STAGE_LABEL[stage]), this.hex(this.col(owner)(DEV.white)));
        this.fx(owner).sparkle(t.x, t.y - 20, 4 + stage * 3, 24 + stage * 6, DEV.holy, 700);
        Sfx.playAt('crystal-chime', t.x, { volume: 0.5 + stage * 0.1, rate: 0.8 + stage * 0.15 });
      }
    }
  }

  /** Drops the maps' references to anyone who is gone — an Invasion run retires husks by the hundred. */
  private prune(time: number): void {
    if (time < this.nextPruneAt) return;
    this.nextPruneAt = time + 3000;
    for (const f of [...this.caps.keys()]) if (!f.active) this.caps.delete(f);
    for (const f of [...this.stages.keys()]) if (!f.active) this.stages.delete(f);
    for (const f of [...this.passiveTextAt.keys()]) if (!f.active) this.passiveTextAt.delete(f);
    for (const a of this.arks) for (const f of [...a.nextText.keys()]) if (!f.active) a.nextText.delete(f);
    for (const p of this.puddles) {
      for (const f of [...p.nextText.keys()]) if (!f.active) p.nextText.delete(f);
      for (const f of [...p.inside]) if (!f.active) p.inside.delete(f);
    }
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    if (playerIs && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (npcIs && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');

    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!f || !f.active || s.rideUntil > 0) { av.update(delta, f?.x ?? -999, f?.y ?? -999, 0); continue; }

      const target = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : { x: this.api.player.x, y: this.api.player.y };
      av.setFacing(Math.atan2(target.y - f.y, target.x - f.x));
      const preach = s.chargeStartedAt > 0
        ? Phaser.Math.Clamp((this.now - s.chargeStartedAt) / SERMON_CHARGE_MS, 0, 1) : 0;
      av.setPreach?.(preach);
      const raised = this.crucifixes.some((c) => c.owner === owner && c.held && c.raised);
      // Mastery: hands pressed together for a moment as each prayer is said.
      av.setHold(s.chargeStartedAt > 0 || s.prayPoseUntil > this.now ? 'brace' : raised ? 'reach' : null);
      av.setIntensity(1 + preach * 0.3);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    const now = this.now;

    for (const p of this.puddles) {
      const life = (now - p.bornAt) / (p.diesAt - p.bornAt);
      holyWaterPuddle(g, this.col(p.owner), p.x, p.y, PUDDLE_R, t, p.seed, life);
    }
    for (const c of this.crucifixes) {
      if (c.held && (!c.raised || this.side(c.owner).rideUntil > 0)) continue;
      const rise = Phaser.Math.Clamp((now - c.bornAt) / 260, 0, 1);
      (this.isLove(c.owner) ? heartAura : crucifixAura)(g, this.col(c.owner), c.x, c.y, AURA_R * rise, t, 1, c.flareUntil > now ? 1 : 0);
    }
    for (const pl of this.pillars) {
      const drop = Phaser.Math.Clamp(1 - (pl.landAt - now) / PILLAR_DROP_MS, 0, 1);
      const life = Phaser.Math.Clamp((now - pl.landAt) / PILLAR_MS, 0, 1);
      if (drop >= 1) firePillar(g, this.col(pl.owner), pl.x, pl.y, PILLAR_R, 1, life, t, pl.seed);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.chariotAt <= 0 || s.chariotDone) continue;
      const progress = Phaser.Math.Clamp((now - s.warnStartedAt) / ASCEND_WARN_MS, 0, 1);
      ascendBand(g, this.col(owner), 0, this.api.width, s.lineY, BAND_HALF, progress, s.lineDir, t);
    }
  }

  private paintAir(time: number): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    // Glows under the letters (the glyphs themselves are Text objects).
    for (const l of this.letters) {
      if (!l.launched) continue;
      const tint = this.col(l.owner);
      g.fillStyle(tint(DEV.holy), 0.22);
      g.fillCircle(l.x, l.y, 11);
      g.fillStyle(tint(DEV.pale), 0.12);
      g.fillCircle(l.x - l.vx * 0.02, l.y - l.vy * 0.02, 8);
    }

    for (const b of this.bottles) {
      const k = Phaser.Math.Clamp((time - b.bornAt) / WATER_FLIGHT_MS, 0, 1);
      const x = Phaser.Math.Linear(b.fromX, b.toX, k);
      const y = Phaser.Math.Linear(b.fromY, b.toY, k) - Math.sin(k * Math.PI) * 60;
      const tint = this.col(b.owner);
      g.fillStyle(tint(DEV.ink), 0.25);
      g.fillEllipse(Phaser.Math.Linear(b.fromX, b.toX, k), Phaser.Math.Linear(b.fromY, b.toY, k) + 8, 12, 4);
      vial(g, tint, x, y, k * 9, 1);
    }

    for (const gr of this.grenades) {
      const tint = this.col(gr.owner);
      const fuse = Phaser.Math.Clamp(1 - (gr.explodeAt - time) / GRENADE_FUSE_MS, 0, 1);
      g.fillStyle(tint(DEV.ink), 0.3);
      g.fillEllipse(gr.x, gr.y + 7, 14 - gr.z * 0.05, 5);
      handGrenade(g, tint, gr.x, gr.y - gr.z, gr.spin, 1, fuse, t);
      // The last second: the count, sung.
      const left = gr.explodeAt - time;
      if (left < 1000) {
        g.lineStyle(1.6, tint(DEV.white), 0.5 + 0.5 * Math.sin(t * 30));
        g.strokeCircle(gr.x, gr.y, BURST_R * (left / 1000));
      }
    }

    for (const c of this.crucifixes) {
      if (c.held) {
        // In the hand: carried low at the side facing the aim, or held aloft over the head.
        const s = this.side(c.owner);
        const f = this.fighter(c.owner);
        if (!f || !f.active || s.rideUntil > 0) continue;
        const aimX = c.owner === 'player' ? s.aimX : this.api.player.x;
        const dir = aimX >= f.x ? 1 : -1;
        const post = this.isLove(c.owner) ? heartStaff : crucifixPost;
        if (c.raised) post(g, this.col(c.owner), f.x + dir * 6, f.y - 24, f.alpha, t, 1, 0.55);
        else post(g, this.col(c.owner), f.x + dir * 20, f.y + 16, f.alpha, t, 1, 0.42);
        continue;
      }
      const rise = Phaser.Math.Clamp((this.now - c.bornAt) / 260, 0, 1);
      (this.isLove(c.owner) ? heartStaff : crucifixPost)(g, this.col(c.owner), c.x, c.y, 1, t, rise);
    }
    // Q+ pillars still falling: the shaft comes down over the fighters.
    for (const pl of this.pillars) {
      const drop = Phaser.Math.Clamp(1 - (pl.landAt - time) / PILLAR_DROP_MS, 0, 1);
      if (drop < 1) firePillar(g, this.col(pl.owner), pl.x, pl.y, PILLAR_R, drop, 0, t, pl.seed);
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      const tint = this.col(owner);
      if (s.chariotAt > 0 && !s.chariotDone && time >= s.chariotAt) {
        (this.isLove(owner) ? heartChariot : chariot)(g, tint, s.chariotX, s.lineY, s.lineDir, t, 1, s.rideUntil > 0);
      }
      // The ground mark where the priest will come down.
      if (s.rideUntil > 0 && !(owner === 'npc' && this.api.isOnline)) {
        const left = s.rideUntil - time;
        if (left < CRASH_MARK_MS) {
          crashMark(g, tint, this.clampX(s.aimX), this.clampY(s.aimY), CRASH_R, 1 - left / CRASH_MARK_MS, t);
        }
      }
      // Q+ — the sky ride: the priest as a small sun over the arena once the chariot is gone, and
      // (for your own ride) the crosshair where the next pillar lands.
      if (s.rideUntil > 0 && s.skyRide && (s.chariotDone || time > s.chariotAt + 600)) {
        const sx = owner === 'npc' && this.api.isOnline ? s.rideX : this.clampX(s.aimX);
        skyPriest(g, tint, sx, this.top + 18, t);
        if (owner === 'player') {
          pillarCrosshair(g, tint, this.clampX(s.aimX), this.clampY(s.aimY), PILLAR_R, s.pillarsLeft, PILLARS, t);
        }
      }
    }
  }

  /**
   * The faith bar and the halo forming over every believer: dotted at a quarter, a solid ring at
   * half, a blazing glory at three quarters.
   */
  private paintFaces(): void {
    const g = this.faceGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const owner of BOTH) {
      if (!this.isDevotion(owner)) continue;
      const tint = this.col(owner);
      for (const v of this.targetsOf(owner)) {
        const ratio = this.faithRatio(v);
        if (ratio <= 0) continue;
        const stage = this.stageOf(ratio);
        const a = v.alpha;
        (this.isLove(owner) ? loveBar : faithBar)(g, tint, v.x, v.y + FAITH_BAR_Y, FAITH_BAR_W, FAITH_BAR_H, ratio, t);
        const hy = v.y - 30;
        if (stage === 1) halo(g, tint, v.x, hy, 13, a * 0.9, 2.4, true, t);
        if (stage >= 2) halo(g, tint, v.x, hy, 13 + (stage - 2) * 2, a, 2.4);
        if (stage >= 3) {
          glory(g, tint, v.x, hy, 8, 9 + Math.sin(t * 4) * 2, 10, t * 0.6, a * 0.55, 1.6);
          g.fillStyle(tint(DEV.holy), a * 0.1);
          g.fillCircle(v.x, v.y, 30);
        }
      }
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(playerIsDevotion: boolean, time: number): void {
    const s = this.sides.player;
    const p = this.api.player;

    this.api.setStatusIndicator('passion-water', playerIsDevotion ? {
      name: 'Holy Water', emoji: '💧', color: DEV.water,
      description: `${s.waterCharges} of ${WATER_CHARGES} bottles in hand. One refills every `
        + `${WATER_RECHARGE_MS / 1000}s.`,
      count: s.waterCharges, priority: 60,
    } : null);

    this.api.setStatusIndicator('passion-sanctified',
      playerIsDevotion && p.passionIncomingMult < 1 ? {
        name: 'Sanctified', emoji: '🙏', color: DEV.holy,
        description: 'Your nearest enemy is at half faith or more. Their blows land 20% softer on you.',
        priority: 98,
      } : null);

    this.api.setStatusIndicator('passion-ride', playerIsDevotion && s.rideUntil > time ? {
      name: s.skyRide ? 'In the Sky' : 'Taken Up', emoji: '🔥', color: DEV.fire,
      description: s.skyRide
        ? `High above the arena. You cannot be hurt. Click to drop a pillar of yellow fire on the `
          + `crosshair (${s.pillarsLeft} of ${PILLARS} left); you crash down on the cursor when the ride ends.`
        : 'Riding the chariot. You cannot be hurt. Aim the cursor — you crash down there.',
      until: s.rideUntil, priority: 130,
      ...(s.skyRide ? { count: s.pillarsLeft } : {}),
    } : null);

    // Mastery — Pray Always, the armour it answers with, and (as the believer) the Ark's pull.
    const praying = playerIsDevotion && this.masteryOn('player');
    this.api.setStatusIndicator('passion-prayer', praying ? (s.answerAt > time ? {
      name: 'Prayer Said', emoji: '🙏', color: DEV.pale,
      description: 'Your prayer is rising. It will be answered with shelter (25% less damage for 5s), '
        + `mercy (+${BLESS_HEAL} HP) or revelation (a ray of light: ${BLESS_RAY_FAITH} faith to the nearest enemy).`,
      until: s.answerAt, priority: 62,
    } : {
      name: 'Pray Always', emoji: '📿', color: DEV.ochre,
      description: `Every ${PRAYER_EVERY_MS / 1000}s you say a prayer of your own accord; it is answered `
        + `${PRAYER_ANSWER_MS / 1000}s later.`,
      ...(s.prayAt > time ? { until: s.prayAt } : {}), priority: 40,
    }) : null);
    this.api.setStatusIndicator('passion-shelter', praying && s.blessUntil > time ? {
      name: 'Shelter', emoji: '🛡️', color: DEV.gold,
      description: `A prayer answered: you take ${Math.round((1 - BLESS_ARMOUR_MULT) * 100)}% less damage.`,
      until: s.blessUntil, priority: 99,
    } : null);
    this.api.setStatusIndicator('passion-ark-gaze', p.gazeTurnRad > 0 && p.gazeUntil > Date.now() ? {
      name: 'Drawn to the Ark', emoji: '👁️', color: DEV.gold,
      description: 'Your faith is past half and the Ark is pulling your sight toward it — your aim '
        + 'bends its way (the small gold ring is where you are really aiming). Looking at it gives you faith.',
      priority: 97,
    } : null);

    const c = playerIsDevotion ? this.crucifixes.find((x) => x.owner === 'player') : undefined;
    this.api.setStatusIndicator('passion-crucifix', c ? {
      name: c.held ? (c.raised ? 'Crucifix Raised' : 'Crucifix in Hand') : 'Crucifix', emoji: '✝️', color: DEV.gold,
      description: c.held
        ? (c.raised
          ? `Held aloft: its ${AURA_R}px aura stands round you and moves with you. Click to lower it, F to set it down here.`
          : 'Carried. Click to raise it — the aura goes up round you — or press F to set it down where you stand.')
        : `Standing. No enemy can enter its ${AURA_R}px aura, and every shot they fire into `
          + 'it gives them 1 faith. Plant another to move it.',
      priority: 58,
    } : null);
  }

  // ── Mastery ────────────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are Devotion. */
  private masteryOn(owner: Owner): boolean {
    return this.isDevotion(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which slot the Ark was dropped on, or null. */
  private arkSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const k of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(k) : this.api.npcMasteryBindFor(k);
      if (bind === ARK_ID) return k;
    }
    return null;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's, not the bot's — and not
   * gated on the mastery being on, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && this.isDevotion('player')) this.api.recordMasteryStat(key, amount);
  }

  /**
   * Pray Always. Every 8 seconds the priest says a prayer, and 5 seconds later it is answered.
   * Only the priest's own sim keeps the clock and rolls the answer; the peer's prayers arrive as
   * `devotion-pray` / `devotion-answer:<k>` and are only drawn here (their armour rides `dm`,
   * their heal is their own HP, and their ray's faith was added on their machine).
   */
  private updatePrayer(owner: Owner, time: number): void {
    const s = this.side(owner);
    if (!this.masteryOn(owner)) { s.prayAt = 0; s.answerAt = 0; return; }
    if (!this.authority(owner)) {
      // A lost answer must not leave the sigil hanging over their head.
      if (s.answerAt > 0 && time > s.answerAt + 1500) s.answerAt = 0;
      return;
    }
    if (!this.alive(this.fighter(owner))) return;
    if (s.prayAt === 0) s.prayAt = time + PRAYER_EVERY_MS;
    if (s.answerAt > 0 && time >= s.answerAt) this.answerPrayer(owner, this.pickAnswer(owner));
    // Nobody hears a prayer said from the chariot; it is said the moment the priest is down.
    if (time >= s.prayAt && s.rideUntil <= 0) {
      s.prayAt = time + PRAYER_EVERY_MS;
      this.sayPrayer(owner);
    }
  }

  private sayPrayer(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    s.prayPoseUntil = this.now + PRAYER_POSE_MS;
    s.answerAt = this.now + PRAYER_ANSWER_MS;
    this.fx(owner).pray(f.x, f.y);
    this.api.showFloatingText(f.x, f.y - 70, '🙏 A PRAYER…', this.hex(DEV.pale));
    Sfx.playAt('incantation', f.x, { volume: 0.35, rate: 1.5 });
    if (owner === 'player') this.api.broadcastMasteryCast('devotion-pray');
  }

  /** Whichever answers would do something right now: no heal at full health, no ray with nobody to hit. */
  private pickAnswer(owner: Owner): Answer {
    const f = this.fighter(owner);
    const options = ANSWERS.filter((k) => (k !== 'heal' || f.hp < f.maxHp - 1)
      && (k !== 'ray' || this.nearestTarget(owner) !== null));
    const pool = options.length ? options : ANSWERS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bd = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private answerPrayer(owner: Owner, k: Answer): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.answerAt = 0;
    if (!this.alive(f)) return;
    if (owner === 'player') this.api.broadcastMasteryCast(`devotion-answer:${k}`);
    Sfx.playAt('holy-chord', f.x, { volume: 0.55, rate: 1.35 });
    if (k === 'armour') {
      s.blessUntil = this.now + BLESS_ARMOUR_MS;
      this.fx(owner).answerArmour(f.x, f.y);
      this.api.showFloatingText(f.x, f.y - 70, '🛡️ ANSWERED: SHELTER', this.hex(DEV.gold));
      return;
    }
    if (k === 'heal') {
      if (this.authority(owner)) f.heal(BLESS_HEAL);
      this.fx(owner).answerHeal(f.x, f.y);
      this.api.showFloatingText(f.x, f.y - 70, '💛 ANSWERED: MERCY', this.hex(DEV.pale));
      return;
    }
    const t = this.nearestTarget(owner);
    this.api.showFloatingText(f.x, f.y - 70, '☀️ ANSWERED: REVELATION', this.hex(DEV.white));
    if (!t) return;
    this.fx(owner).heavenRay(t.x, t.y);
    this.addFaith(owner, t, BLESS_RAY_FAITH, '☀️');
  }

  /**
   * Ark of the Covenant, from the bound key, the bot, or an online peer's replay. It never goes
   * through `castAbility` (the enhancement is not in the element's ability list), so the refusals
   * that gate every other key are repeated here. A replica's Ark is trusted: their sim checked.
   */
  private tryArk(owner: Owner, tx: number, ty: number): boolean {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return false;
    if (this.authority(owner)) {
      if (s.rideUntil > 0 || !this.canAct(f, false)) return false;
      if (this.now - s.arkAt < ARK_COOLDOWN_MS) return false;
    }
    s.arkAt = this.now;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const d = Math.min(ARK_RANGE, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
    const x = Phaser.Math.Clamp(f.x + Math.cos(ang) * d, this.left + 30, this.right - 30);
    const y = Phaser.Math.Clamp(f.y + Math.sin(ang) * d, this.top + 40, this.bottom - 10);
    const old = this.arks.findIndex((a) => a.owner === owner);
    if (old >= 0) {
      const a = this.arks[old];
      this.fx(owner).sparkle(a.x, a.y - 20, 10, 30, DEV.gold, 600);
      this.arks.splice(old, 1);
    }
    this.arks.push({ owner, x, y, bornAt: this.now, diesAt: this.now + ARK_MS, stare: 0, nextText: new Map() });
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).arkLand(x, y);
    this.api.showFloatingText(x, y - 64, this.line(owner, '✨ ARK OF THE COVENANT'), this.hex(this.col(owner)(DEV.gold)));
    Sfx.playAt('holy-chord', x, { volume: 0.75, rate: 0.75 });
    this.api.scene.time.delayedCall(220, () => Sfx.playAt('stone-slam', x, { volume: 0.6, rate: 0.9 }));
    if (owner === 'player') this.api.broadcastMasteryCast(ARK_ID);
    return true;
  }

  /** Online: the peer set their Ark down. */
  replayArk(tx: number, ty: number): void {
    if (this.isDevotion('npc')) this.tryArk('npc', tx, ty);
  }

  /**
   * Which way `t` is looking, the Ark's bend included. The local player looks at their cursor;
   * an online peer's facing is mirrored in (their own sim bent it); a bot or husk looks at whoever
   * it is fighting — the priest.
   */
  private lookOf(owner: Owner, t: Fighter): number {
    if (this.api.isOnline && t === this.api.npc) return t.facingAngle;
    let base: number;
    if (t === this.api.player) {
      const c = this.api.pointer;
      base = Math.atan2(c.y - t.y, c.x - t.x);
    } else {
      const f = this.fighter(owner);
      base = Math.atan2(f.y - t.y, f.x - t.x);
    }
    return t.bendGaze(base);
  }

  /**
   * The Ark at work. For everyone who can make it out: their sight is bent on the sim that owns
   * their aim (over half faith it is pulled toward the Ark; under half a bot or husk tries to
   * look away, a player does not), and anyone whose look then falls on it gains faith slowly.
   */
  private updateArks(time: number, dt: number): void {
    for (let i = this.arks.length - 1; i >= 0; i--) {
      if (time >= this.arks[i].diesAt) this.arks.splice(i, 1);
    }
    this.gazes = [];
    const wall = Date.now();
    for (const a of this.arks) {
      if (!this.isDevotion(a.owner)) continue;
      const ax = a.x;
      const ay = a.y - 14;
      let watched = false;
      for (const t of this.targetsOf(a.owner)) {
        const d = Phaser.Math.Distance.Between(t.x, t.y, ax, ay);
        if (d > ARK_SIGHT_RANGE || d < 1) continue;
        const ownsAim = !(this.api.isOnline && t === this.api.npc);
        if (ownsAim) {
          const ratio = this.faithRatio(t);
          let turn = 0;
          if (ratio >= 0.5) turn = Phaser.Math.Linear(GAZE_PULL_MIN, GAZE_PULL_MAX, Phaser.Math.Clamp((ratio - 0.5) / 0.5, 0, 1));
          else if (t !== this.api.player) turn = -GAZE_AVERT;
          t.gazeX = ax;
          t.gazeY = ay;
          t.gazeTurnRad = turn;
          t.gazeUntil = wall + GAZE_HOLD_MS;
        }
        const look = this.lookOf(a.owner, t);
        // Online the priest's machine reads our look off the facing we send.
        if (ownsAim && t === this.api.player && this.api.isOnline
          && this.api.elementId !== 'silence' && this.api.elementId !== 'radiation') {
          t.facingAngle = look;
        }
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(ay - t.y, ax - t.x) - look));
        const turnNow = t.gazeUntil > wall ? t.gazeTurnRad : 0;
        if (off > ARK_STARE_HALF + Math.atan2(ARK_R, d)) {
          if (turnNow < 0 && off < GAZE_AVERT_CONE + GAZE_AVERT) this.gazes.push({ owner: a.owner, ark: a, f: t, pull: -1 });
          continue;
        }
        watched = true;
        this.gazes.push({ owner: a.owner, ark: a, f: t, pull: 0.3 + 0.7 * Math.max(0, turnNow) / GAZE_PULL_MAX });
        const landed = this.addFaith(a.owner, t, ARK_FAITH_PER_SEC * dt);
        if (landed > 0 && time >= (a.nextText.get(t) ?? 0)) {
          a.nextText.set(t, time + ARK_TEXT_MS);
          this.api.showFloatingText(t.x - 12, t.y - 34, `+${ARK_FAITH_PER_SEC} 👁️`, this.hex(DEV.gold));
        }
      }
      a.stare += ((watched ? 1 : 0) - a.stare) * Math.min(1, dt * 4);
    }
  }

  /**
   * The bot's Ark, fired by the kit (Mag-Lev style) since the enhancement is not in the ability
   * list the AI casts from. Offline duels only; online the peer presses their own key.
   */
  private updateNpcMastery(time: number): void {
    if (this.api.isOnline || this.api.isInvasion || !this.arkSlot('npc')) return;
    const s = this.sides.npc;
    if (time < s.nextArkThinkAt) return;
    s.nextArkThinkAt = time + NPC_ARK_THINK_MS;
    if (this.now - s.arkAt < ARK_COOLDOWN_MS || s.rideUntil > 0) return;
    const pt = this.npcArkPoint();
    if (pt) this.tryArk('npc', pt.x, pt.y);
  }

  /**
   * Where the bot's Ark goes. Side-effect free. The synergy is the gaze itself: a player aims at
   * the bot, so under half faith the Ark goes *on that line* — every shot they line up is a stare.
   * Over half their sight is pulled toward it, so it goes *off* the line instead: the pull drags
   * their aim off the bot, and the dragged aim is still a stare.
   */
  private npcArkPoint(): { x: number; y: number } | null {
    const npc = this.api.npc;
    const p = this.api.player;
    if (!this.alive(npc) || !this.alive(p)) return null;
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, p.x, p.y);
    if (dist < 120 || dist > ARK_SIGHT_RANGE + 80) return null;
    if (this.faithRatio(p) < 0.5) {
      const along = Math.min(dist * NPC_ARK_ALONG, ARK_RANGE);
      const a = Math.atan2(p.y - npc.y, p.x - npc.x);
      return { x: npc.x + Math.cos(a) * along, y: npc.y + Math.sin(a) * along };
    }
    const fromPlayer = Math.atan2(npc.y - p.y, npc.x - p.x) + (Math.random() < 0.5 ? -1 : 1) * NPC_ARK_OFFSET;
    return { x: p.x + Math.cos(fromPlayer) * dist * 0.6, y: p.y + Math.sin(fromPlayer) * dist * 0.6 };
  }

  /** The mastery card. */
  getArkCooldownRatio(): number {
    return Phaser.Math.Clamp((this.now - this.sides.player.arkAt) / ARK_COOLDOWN_MS, 0, 1);
  }

  /** Which slot the bot gave up for the Ark, so its rotation leaves that key alone. */
  npcArkSlot(): 'r' | 'f' | 'q' | undefined {
    return this.arkSlot('npc') ?? undefined;
  }

  /** The Ark, the sight-lines to it, the prayer waiting over the priest and the armour round them. */
  private paintMastery(): void {
    const ground = this.groundGfx;
    const air = this.airGfx;
    const face = this.faceGfx;
    if (!ground || !air || !face) return;
    const t = this.vizT;
    const now = this.now;
    for (const a of this.arks) {
      const rise = (now - a.bornAt) / 260;
      const fade = Phaser.Math.Clamp((a.diesAt - now) / 500, 0, 1);
      arkGround(ground, this.col(a.owner), a.x, a.y, 34, rise, t, a.stare, fade);
      (this.isLove(a.owner) ? loveArk : arkOfCovenant)(air, this.col(a.owner), a.x, a.y, rise, t, a.stare, fade);
    }
    for (const gz of this.gazes) {
      gazeThread(ground, this.col(gz.owner), gz.f.x, gz.f.y - 6, gz.ark.x, gz.ark.y - 14, gz.pull, t, gz.f.alpha);
    }
    for (const owner of BOTH) {
      if (!this.masteryOn(owner)) continue;
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!this.alive(f) || s.rideUntil > 0 || f.alpha < 0.05) continue;
      if (s.answerAt > now) {
        const wait = 1 - (s.answerAt - now) / PRAYER_ANSWER_MS;
        prayerSigil(face, this.col(owner), f.x, f.y - 68, wait, t, f.alpha);
      }
      if (s.blessUntil > now) {
        blessingShell(air, this.col(owner), f.x, f.y, t, f.alpha * Phaser.Math.Clamp((s.blessUntil - now) / 400, 0, 1));
      }
    }
    // Your own sight, pulled: a small gold ring where your aim has actually gone.
    const p = this.api.player;
    if (this.alive(p) && p.gazeTurnRad > 0 && p.gazeUntil > Date.now()) {
      const c = this.api.pointer;
      const b = p.bendGazePoint(c.x, c.y);
      const tint = this.col(this.isDevotion('npc') ? 'npc' : 'player');
      face.lineStyle(1, tint(DEV.gold), 0.45);
      face.lineBetween(c.x, c.y, b.x, b.y);
      face.lineStyle(2, tint(DEV.holy), 0.85);
      face.strokeCircle(b.x, b.y, 6);
      face.fillStyle(tint(DEV.white), 0.9);
      face.fillCircle(b.x, b.y, 1.6);
    }
  }

  // ── SummonPurgeTarget ──────────────────────────────────────────────────────

  /** A crucifix is a thing somebody built. Puddles and grenades are not, and survive. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.crucifixes.length - 1; i >= 0; i--) {
      const c = this.crucifixes[i];
      if (c.owner === exceptOwner || c.held) continue;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) > radius) continue;
      this.crucifixes.splice(i, 1);
      razed++;
      report?.(c.x, c.y);
      this.fx(c.owner).sparkle(c.x, c.y - 40, 10, 30, DEV.pale, 600);
    }
    // The Ark is a thing somebody set down, too.
    for (let i = this.arks.length - 1; i >= 0; i--) {
      const a = this.arks[i];
      if (a.owner === exceptOwner || Phaser.Math.Distance.Between(x, y, a.x, a.y) > radius) continue;
      this.arks.splice(i, 1);
      razed++;
      report?.(a.x, a.y);
      this.fx(a.owner).sparkle(a.x, a.y - 20, 12, 34, DEV.gold, 700);
    }
    return razed;
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  isRiding(owner: Owner): boolean {
    return this.sides[owner].rideUntil > 0;
  }

  npcWaterCharges(): number {
    return this.sides.npc.waterCharges;
  }

  /**
   * F+ Pocket Crucifix for the bot. Picking up, raising and setting down bypass `castAbility`, so
   * — like Conquest's economy — the kit plays them itself rather than publishing them to the AI.
   * Offline only; online the peer presses their own keys and the relay brings the result.
   *
   * The synergy: pressed up close while standing in its own aura, the bot takes the sanctuary
   * with it — picks it up and raises it, so the aura walks with the bot and shoves the player off.
   * Once the player backs off past 220px it lowers the cross and sets it back down at its feet,
   * where it is a wall again and the click goes back to preaching.
   */
  private updateNpcPocket(time: number): void {
    if (this.api.isOnline || !this.up('npc', 'f')) return;
    const s = this.sides.npc;
    if (time < s.nextPocketAt || s.rideUntil > 0) return;
    s.nextPocketAt = time + 400;
    const npc = this.api.npc;
    const p = this.api.player;
    const c = this.crucifixes.find((x) => x.owner === 'npc');
    if (!c || !this.alive(npc) || !this.alive(p)) return;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, p.x, p.y);
    if (!c.held) {
      if (d < 170 && Phaser.Math.Distance.Between(npc.x, npc.y, c.x, c.y) <= AURA_R && this.canAct(npc, false)) {
        this.pickUpCrucifix('npc');
        if (this.canAct(npc, true)) this.setRaised('npc', true);
      }
      return;
    }
    if (d < 220) {
      if (!c.raised && this.canAct(npc, true)) this.setRaised('npc', true);
      return;
    }
    if (c.raised && this.canAct(npc, true)) this.setRaised('npc', false);
    if (this.canAct(npc, false)) this.setDownCrucifix('npc');
  }

  /**
   * How long the bot "held" its sermon. Long when the target is a sitting duck — standing in
   * the bot's holy water, pinned on its crucifix's rim, or already devout (where every letter is
   * worth 25% more) — and short otherwise.
   */
  private npcSermonCharge(): number {
    const p = this.api.player;
    if (!this.alive(p)) return 0;
    if (this.npcTargetPinned() || this.stageOf(this.faithRatio(p)) >= 3) return 1;
    return Math.random() * 0.5;
  }

  /** The player is standing in the bot's holy water, or pressed against its crucifix's rim. */
  private npcTargetPinned(): boolean {
    const p = this.api.player;
    if (!this.alive(p)) return false;
    if (this.puddles.some((w) => w.owner === 'npc' && Phaser.Math.Distance.Between(p.x, p.y, w.x, w.y) < PUDDLE_R)) return true;
    return this.crucifixes.some((c) => c.owner === 'npc'
      && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < AURA_R + 40);
  }

  /**
   * Bot synergies, computed owner-side and published to the AI. Every read is side-effect free.
   *
   * - **Holy water** goes where the player will be, unless a puddle is already there. At 75%
   *   faith any puddle drags them, so it is thrown even when they are not standing on it.
   * - **Crucifix** is a sanctuary up close (planted on the bot's own feet, so the player is shoved
   *   out to the rim) and a wall at range (planted between them, so every shot fired across it
   *   pays faith).
   * - **Grenade** is thrown at a player who cannot easily leave the blast: standing in holy
   *   water, pressed on the crucifix's rim, or at half faith where the burst finishes the job.
   * - **Ascendance** is cast when the player is level with the bot, so both are on the line —
   *   the chariot runs them over *and* carries the bot to crash down on them.
   */
  npcOpportunities(): {
    waterPoint?: { x: number; y: number };
    crucifixPoint?: { x: number; y: number };
    grenadePoint?: { x: number; y: number };
    ascendNow: boolean;
    holdLineY?: number;
  } {
    const npc = this.api.npc;
    const p = this.api.player;
    const out: ReturnType<PassionKit['npcOpportunities']> = { ascendNow: false };
    if (!this.isDevotion('npc') || !this.alive(npc) || !this.alive(p) || this.api.isOnline) return out;
    const s = this.sides.npc;
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, p.x, p.y);
    const pb = this.body(p);
    const lead = { x: p.x + (pb?.velocity.x ?? 0) * 0.45, y: p.y + (pb?.velocity.y ?? 0) * 0.45 };

    if (s.waterCharges > 0 && dist < WATER_RANGE + 40
      && !this.puddles.some((w) => w.owner === 'npc' && Phaser.Math.Distance.Between(lead.x, lead.y, w.x, w.y) < PUDDLE_R * 0.8)) {
      out.waterPoint = lead;
    }

    const mine = this.crucifixes.find((c) => c.owner === 'npc');
    if (dist < 150) {
      if (!mine || Phaser.Math.Distance.Between(mine.x, mine.y, npc.x, npc.y) > AURA_R * 0.6) {
        out.crucifixPoint = { x: npc.x, y: npc.y };
      }
    } else if (!mine) {
      out.crucifixPoint = { x: Phaser.Math.Linear(npc.x, p.x, 0.45), y: Phaser.Math.Linear(npc.y, p.y, 0.45) };
    }

    if (dist < GRENADE_RANGE && (this.npcTargetPinned() || this.stageOf(this.faithRatio(p)) >= 2)) {
      out.grenadePoint = { x: p.x, y: p.y };
    }

    out.ascendNow = s.chariotAt <= 0 && Math.abs(p.y - npc.y) < 34 && dist < 700;
    // During the wind-up, stay on the line so the chariot picks the bot up.
    if (s.chariotAt > 0 && !s.chariotDone) out.holdLineY = s.lineY;
    return out;
  }

  /** HUD cards. */
  getBarRatio(abilityId: string, time: number): number {
    const s = this.sides.player;
    if (abilityId === 'passion-sermon' && s.chargeStartedAt > 0) {
      return Phaser.Math.Clamp((time - s.chargeStartedAt) / SERMON_CHARGE_MS, 0, 1);
    }
    if (abilityId === 'passion-holy-water') {
      if (s.waterCharges >= WATER_CHARGES) return 1;
      const next = s.waterRefills[0] ?? time;
      const into = 1 - Phaser.Math.Clamp((next - time) / WATER_RECHARGE_MS, 0, 1);
      return Phaser.Math.Clamp((s.waterCharges + into) / WATER_CHARGES, 0, 1);
    }
    if (abilityId === 'passion-ascendance' && s.chariotAt > time) {
      return Phaser.Math.Clamp((s.chariotAt - time) / ASCEND_WARN_MS, 0, 1);
    }
    return this.api.player.getCooldownRatio(abilityId);
  }
}
