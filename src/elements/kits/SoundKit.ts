import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import {
  ArmGesture, SOUND, SoundAura, SoundAvatar, SoundColorFn, SoundFx, SoundInstrument, TrackNoteKind,
} from './SoundVisuals';
import { CustomStatus } from './StatusHudKit';

// ── SoundArenaApi ─────────────────────────────────────────────────────────

export interface SoundArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  /** Jukebox (R+) reads Space directly. Consuming the JustDown here suppresses the dodge. */
  readonly spaceKey: Phaser.Input.Keyboard.Key;
  readonly width: number;
  readonly height: number;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  hasUpgrade(slot: string): boolean;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Publish (or with `null`, clear) one of this kit's buffs in the top-right effect tray. */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  soundColor(owner: 'player' | 'npc', base: number): number;
  // ── Mastery (no Sound mastery is defined yet; this only drives the avatar's tell) ──
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── The metronome ─────────────────────────────────────────────────────────

/**
 * Sound's passive. Every ability restarts a two-second meter; an ability played inside a narrow
 * window around the far end of it comes out *harmonized* and hits harder. Nothing accumulates
 * and nothing is spent — the only resource this element has is your sense of time.
 */
const BEAT_MS = 2000;
/** Half-width of the window around the beat that counts as on time. */
const HARMONY_WINDOW = 200;
/** How long the meter stays on screen past the beat before it goes away. */
const METRO_TAIL = 420;

// ── Click: Staccato ───────────────────────────────────────────────────────

const STACCATO_DMG = 10;
const STACCATO_HARM_DMG = 15;
const WAVE_SPEED = 780;
const WAVE_RANGE = 470;
/**
 * Half-angle of the crescent. Sound's click used to be a wall across a fifth of the room; it is
 * now a fifth of that — a struck note rather than a broadside. Encore Streak (Click+) is the
 * only thing that grows it back.
 */
const WAVE_SPREAD = 0.1;
/** Half-thickness of the band that bites, in pixels — about one body radius. */
const WAVE_THICK = 28;

// ── Click+: Encore Streak ─────────────────────────────────────────────────

/** Every unbroken harmonized cast makes the next shockwave this much wider. */
const STREAK_SIZE_PER = 0.01;

// ── E: Disc Dice ──────────────────────────────────────────────────────────

const DISC_RADIUS = 130;
const DISC_DMG = 15;
const DISC_SPEED_PER_HIT = 0.15;
const DISC_SPEED_MS = 3000;
const DISC_SPEED_MAX_STACKS = 6;
/** How long the record stays in hand after it is slung. */
const DISC_HOLD_MS = 620;

/** The three records, in the order the deck cycles them. Accelerando is loaded at match start. */
type DiscMode = 'accelerando' | 'bass' | 'calm';
const DISC_ORDER: DiscMode[] = ['accelerando', 'bass', 'calm'];
const DISC_COLORS: Record<DiscMode, number> = {
  accelerando: SOUND.mint,
  bass: SOUND.crimson,
  calm: SOUND.flow,
};
const DISC_NAMES: Record<DiscMode, string> = {
  accelerando: 'ACCELERANDO',
  bass: 'BASS',
  calm: 'CALM',
};
const ACCEL_SPEED_BONUS = 0.20;
/** Cooldowns pulled forward by this fraction of real time while Accelerando is spinning. */
const ACCEL_CD_RATE = 0.25;
const BASS_DAMAGE_MULT = 1.2;
const CALM_HEAL_PER_SEC = 2;

// ── E+: Sound System ──────────────────────────────────────────────────────

/** What one fighter cut by each record is permanently worth, once Sound System is bought. */
const DISC_BANK_MOVE = 0.03;
const DISC_BANK_DMG = 0.02;
const DISC_BANK_RES = 0.01;
/** Floor under the banked armour — a long match must not make anyone untouchable. */
const BANK_RES_FLOOR = 0.25;

// ── R: Boombox ────────────────────────────────────────────────────────────

const BOOMBOX_MS = 8000;
const BOOMBOX_RADIUS = 150;
const BOOMBOX_RADIUS_GOLD = 205;
/** Attack speed banked per second spent standing in the field. No cap, and it never decays. */
const BOOMBOX_ATK_PER_SEC = 0.01;
/** Move speed, but only while you are actually inside — this half of the buff is positional. */
const BOOMBOX_MOVE_BONUS = 0.20;
const BOOMBOX_PULSE_MS = 3000;
/** How far the pulse throws a fighter, and the floor it puts under a bounced projectile. */
const BOOMBOX_SHOVE_DIST = 190;
const BOOMBOX_PROJ_SPEED = 300;
/** A harmonized box makes every buff handed out inside it this much stronger. */
const BOOMBOX_POTENCY = 1.5;

/** Both movement systems rewrite velocity every frame, so a shove is played out as position. */
const SHOVE_MS = 260;

// ── R+: Jukebox ───────────────────────────────────────────────────────────

/** Hype off the ladder to put a coin in the box. Only ever paid once per boombox. */
const JUKEBOX_HYPE_COST = 10;
const JUKEBOX_RADIUS_MULT = 1.33;
const JUKEBOX_PULSE_MS = 2000;
/** How far outside the field you can still reach the buttons. */
const JUKEBOX_REACH = 40;

// ── F: Bugle ──────────────────────────────────────────────────────────────

/** One landed note on the bugle bar: +1% move *and* attack speed, permanently. */
const BUGLE_NOTE_GAIN = 0.01;
/** A harmonized opening buys one mistake — and taking it winds the bar up by this much. */
const BUGLE_SLIP_SPEEDUP = 1.2;
const BUGLE_HOLD_MS = 700;
/** What the NPC gets per blow, since it has no bar to play. */
const NPC_BUGLE_GAIN = 0.04;

// ── The performance bar (the bugle minigame, and Coda's Solo) ─────────────

const PERF_NOTE_SPEED = 470;
const PERF_SPAWN_MIN = 420;
const PERF_SPAWN_MAX = 940;
const PERF_TOLERANCE = 42;
const PERF_NOTE_WIDTH = 30;
/**
 * Beat of quiet after taking the stage before the bar starts feeding. Kept short because the
 * runway itself — half a screen at `PERF_NOTE_SPEED` — is already well over a second of standing
 * still, and the performer cannot move while any of it is running.
 */
const PERF_GRACE_MS = 400;

const SOLO_NOTE_DMG = 12;
const SOLO_ACCENT_DMG = 22;
const SOLO_ACCENT_CHANCE = 0.18;

// ── F+: Perfect Pitch — the two notes that are not struck ─────────────────

/** A red note left alone. Struck, it is a mistake instead. */
const RED_NOTE_DMG = 0.01;
/** A green hold note carried the whole way. Anything short pays pro rata. */
const HOLD_NOTE_ATK = 0.03;
/** Length of a hold note's tail, in pixels of track. */
const HOLD_NOTE_LEN = 150;
/** How often the bar asks for one of the two. It leans on you after your first slip. */
const FANCY_NOTE_CHANCE = 0.16;
const FANCY_NOTE_CHANCE_AFTER_SLIP = 0.34;

// ── Q: Coda ───────────────────────────────────────────────────────────────

/** Hype needed for one level. Overflow carries, so a huge burn can climb two rungs at once. */
const CODA_PER_LEVEL = 200;
const CODA_MAX_LEVEL = 3;
/** Indexed by the level just reached. Level 1 is where everyone starts, so it heals nothing. */
const CODA_HEAL = [0, 0, 150, 200];
/** Every percentage this kit hands out is scaled by the level you are on. */
const CODA_BOOST_MULT = [1, 1, 1.25, 1.5];
/** The instrument getting louder: a guitar hits harder than a violin, and an electric harder still. */
const CODA_DAMAGE_MULT = [1, 1, 1.3, 1.6];
const CODA_DASH_LEN_MULT = 2;
const CODA_DASH_SPEED_BONUS = 0.20;
const CODA_DASH_SPEED_MS = 3000;
/**
 * Q is two abilities on one cooldown: climbing the ladder is cheap and comes back in a second,
 * but once Coda is maxed the key becomes Solo and pays the full ultimate price. Expressed as a
 * multiple of the 1s cooldown declared on the ability so the two can never drift apart.
 */
const SOLO_COOLDOWN_MULT = 25;

// ── Q+: Raise the Roof / PARTY MODE ───────────────────────────────────────

/** How long Q has to be held for the ball to reach the bottom of its rope. */
const PARTY_HOLD_MS = 3000;
const PARTY_MS = 12000;
/** Playing the room instead of yourself pays double — which is the whole trade. */
const PARTY_HYPE_MULT = 2;
/** A multiple of the 1s cooldown declared on the ability, as with Solo above. */
const PARTY_COOLDOWN_MULT = 15;

const BALL_RADIUS = 34;
const BALL_SWING_DMG = 20;
/** Pendulum constants: gravity over rope length, and how fast a swing bleeds out. */
const BALL_GRAVITY = 5.2;
const BALL_DAMP = 0.5;
/** What one click puts into the swing, and the ceiling repeated clicks cannot pass. */
const BALL_PUSH = 2.2;
const BALL_SPIN_MAX = 4;
/** Below this the ball is hanging, not swinging, and cannot hurt anybody. */
const BALL_SWING_MIN = 0.8;
const BALL_HIT_COOLDOWN = 700;

// ── Bass perk (water + sound) ─────────────────────────────────────────────

const BASS_CHARGE_COUNT = 5;
const BASS_CHARGE_SPACING = 52;
const BASS_CHARGE_DAMAGE = 10;
const BASS_CHARGE_RADIUS = 48;
const BASS_FUSE_MS = 480;
const BASS_FUSE_STEP_MS = 80;

// ── Harmony perk (slime + sound + light) ──────────────────────────────────

const HARMONY_COOLDOWN_MS = 3000;
const HARMONY_FUSE_MS = 900;
const HARMONY_RADIUS = 100;
const HARMONY_DAMAGE = 20;
const HARMONY_BONUS_PER_STACK = 0.15;
const HARMONY_MAX_STACKS = 4;
const HARMONY_BUFF_MS = 20000;

// ── Types ─────────────────────────────────────────────────────────────────

/** A shockwave in flight: a crescent of front travelling out from where it was struck. */
interface Shock {
  owner: 'player' | 'npc';
  x: number;
  y: number;
  ang: number;
  travelled: number;
  range: number;
  speed: number;
  spread: number;
  thick: number;
  damage: number;
  color: number;
  /** Each fighter takes one wave once — a wall passes through you, it does not saw at you. */
  hit: Set<Fighter>;
}

/**
 * A boombox on the floor. It deals no damage at all: what it does is hand its owner buffs for
 * standing near it and shove everyone else — and everyone else's shots — back out of it.
 */
interface Boombox {
  owner: 'player' | 'npc';
  x: number;
  y: number;
  /** Placed on the beat: bigger, four-coned, and every buff inside it is worth 1.5×. */
  golden: boolean;
  radius: number;
  expiresAt: number;
  lastPulseAt: number;
  nextPulseAt: number;
  /** How long between pulses. Jukebox (R+) buys this down for the rest of the box's life. */
  pulseMs: number;
  /** True once a coin has gone in. One per box — the buttons only take the one. */
  jukebox: boolean;
}

/** A knockback in progress, played out as position because velocity is stomped every frame. */
interface Shove {
  target: Fighter;
  vx: number;
  vy: number;
  until: number;
}

/** One water charge laid down by the Bass perk. */
interface BassCharge {
  x: number;
  y: number;
  owner: 'player' | 'npc';
  armedAt: number;
  explodeAt: number;
}

/** A note on the performance bar. */
interface PerfNote {
  sprite: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  accent: boolean;
  /** Strike it, leave it, or hold it. Anything but `note` needs Perfect Pitch (F+). */
  kind: TrackNoteKind;
  /** Hold notes: length of the tail in pixels, and how much of it was carried. */
  len: number;
  held: number;
  /** True between catching a hold note's head and its tail clearing the line. */
  holding: boolean;
}

/** Which performance is on the bar: the bugle's buff run, or Coda's damaging Solo. */
type PerfMode = 'bugle' | 'solo';

/**
 * The mirror ball Raise the Roof winds out of the ceiling. It is a pendulum on a rope tied to
 * the top of the arena: the rope pays out while Q is held, and a click sends the ball across
 * the room hard enough to flatten anyone standing in the arc.
 */
interface DiscoBall {
  anchorX: number;
  anchorY: number;
  /** Live rope length, easing toward `targetRope`. */
  rope: number;
  targetRope: number;
  /** Angle from straight down, and its rate, in radians. */
  ang: number;
  angVel: number;
  x: number;
  y: number;
  /** Per-fighter re-hit gate, so one pass does not saw through somebody. */
  hitAt: Map<Fighter, number>;
  /** Set when the party is over: the rope winds back in and the ball is dropped. */
  leaving: boolean;
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  staccato: 'punch',
  'disc-dice': 'sweep',
  boombox: 'slam',
  bugle: 'raise',
  coda: 'raise',
};

// ── SoundKit ──────────────────────────────────────────────────────────────

export class SoundKit {
  // ── Visuals ─────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: SoundColorFn;
  private readonly ncol: SoundColorFn;
  private readonly pfx: SoundFx;
  private readonly nfx: SoundFx;
  private playerAvatar: SoundAvatar | null = null;
  private npcAvatar: SoundAvatar | null = null;
  /** Stance tells. The disc aura sits lowest so the record reads under everything else. */
  private discAura: SoundAura | null = null;
  private bugleAura: SoundAura | null = null;
  private soloAura: SoundAura | null = null;
  private codaAura: SoundAura | null = null;
  private harmonyAura: SoundAura | null = null;
  /**
   * Three world layers, because these objects are not in the same place: boomboxes and bass
   * charges lie on the floor, shockwaves and the resonator ride over the fighters, and the
   * performance stage is furniture everything else stands on.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private stageGfx: Phaser.GameObjects.Graphics | null = null;
  /** PARTY MODE's deck. Its own layer because it covers the whole arena, under everything else. */
  private partyGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer to face. */
  private lastAimX = 0;
  private lastAimY = 0;
  /** 0 → 1 across a bow stroke or a strum. Held past 1 so the arm settles between them. */
  private bowT = 1;

  // ── HUD ─────────────────────────────────────────────────────────────
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private discLabel: Phaser.GameObjects.Text | null = null;
  private buffLabel: Phaser.GameObjects.Text | null = null;
  private perfLabel: Phaser.GameObjects.Text | null = null;
  private hypeLabel: Phaser.GameObjects.Text | null = null;
  /** Everything the upgrades have banked, on its own line under the ladder. */
  private bankLabel: Phaser.GameObjects.Text | null = null;

  // ── Metronome ────────────────────────────────────────────────────────
  private metroAt = 0;
  private npcMetroAt = 0;
  /** 1 the instant a harmonized cast lands, decaying — flares the beat weight and the HUD. */
  private harmonyFlash = 0;

  // ── Shockwaves ───────────────────────────────────────────────────────
  private waves: Shock[] = [];

  // ── Boomboxes ────────────────────────────────────────────────────────
  private boomboxes: Boombox[] = [];
  private shoves: Shove[] = [];

  // ── Records ──────────────────────────────────────────────────────────
  private discIdx = 0;
  private npcDiscIdx = 0;
  private discSpeedStacks = 0;
  private discSpeedUntil = 0;
  private discHoldUntil = 0;
  /**
   * The damage multiplier this kit currently has pushed into `outgoingDamageMult`. Divided back
   * out before a new one is multiplied in, so swapping records never leaves a factor behind.
   */
  private discDmgApplied = 1;
  private calmAccum = 0;

  // ── The upgrade banks ────────────────────────────────────────────────
  /**
   * Unbroken harmonized casts (Click+ — Encore Streak). Each one is worth 1% of shockwave, and
   * the whole run is worth its own count in hype when Q burns it.
   */
  private clickStreak = 0;
  /**
   * Percentages banked by Sound System (E+) and Perfect Pitch (F+). Permanent for the match,
   * like tempo, and burned by Q along with everything else.
   */
  private bank = { move: 0, atk: 0, dmg: 0, res: 0 };
  /** True once this side has written a non-1 `soundIncomingMult`, so it can be handed back. */
  private resOwned = false;

  // ── The two banked buff pools ────────────────────────────────────────
  /** Tempo: move *and* attack speed, +1% a note off the bugle bar. It never decays. */
  private tempo = 0;
  private npcTempo = 0;
  /** Attack speed only, banked a percent a second for standing in your own boombox. */
  private boomAtk = 0;
  private npcBoomAtk = 0;
  private bugleHoldUntil = 0;
  private npcBugleHoldUntil = 0;

  // ── The performance bar ──────────────────────────────────────────────
  private perfMode: PerfMode | null = null;
  private perfNotes: PerfNote[] = [];
  private perfNextSpawnAt = 0;
  private perfGraceUntil = 0;
  private perfStreak = 0;
  /** Winds up as slips are spent, so a saved run gets harder rather than free. */
  private perfSpeed = 1;
  private perfSlips = 0;
  /** Perfect Pitch: the bar starts asking for the awkward notes once you have slipped. */
  private perfSlipSpent = false;
  private perfReturnX = 0;
  private perfReturnY = 0;
  private perfStageX = 0;
  private perfStageY = 0;
  private pointerWasDown = false;
  private lastClickAt = 0;
  /** Online: a remote soloist's performance is replayed as timed walls rather than a bar. */
  private npcSoloUntil = 0;
  private npcSoloNextAt = 0;

  // ── Coda ─────────────────────────────────────────────────────────────
  /** 1 = violin, 2 = guitar, 3 = electric. Never goes back down. */
  private codaLevel = 1;
  private hype = 0;
  private codaDashUntil = 0;
  private npcCodaLevel = 1;
  private npcHype = 0;

  // ── Q+: Raise the Roof / PARTY MODE ──────────────────────────────────
  /** When the current Q hold started, or 0 if the key is not being wound. */
  private partyHoldStart = 0;
  /** True once this hold has been called out — a tap is a plain Coda and says nothing. */
  private partyHoldAnnounced = false;
  private partyUntil = 0;
  private ball: DiscoBall | null = null;
  /**
   * The buff bundle handed to the other side for the length of the party. Move speed is pulled
   * by ArenaScene, attack speed is spent per frame, and the damage share is pushed once and
   * divided back out — the same single-writer arrangement the records use.
   */
  private partyGift = { move: 0, atk: 0, dmg: 0, until: 0 };
  private partyDmgApplied = 1;

  // ── Bass perk ────────────────────────────────────────────────────────
  private bassCharges: BassCharge[] = [];

  // ── Harmony perk ─────────────────────────────────────────────────────
  /** Live position of the thrown resonator. Tweened as a plain object; the art is painted. */
  private harmonyGrenade: { x: number; y: number } | null = null;
  private harmonyGrenadeX = 0;
  private harmonyGrenadeY = 0;
  private harmonyArmedAt = 0;
  private harmonyExplodeAt = 0;
  private harmonyNextThrowAt = 0;
  private harmonyStacks = 0;
  private harmonyUntil = 0;

  constructor(private arena: SoundArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.soundColor('player', base);
    this.ncol = (base) => arena.soundColor('npc', base);
    this.pfx = new SoundFx(arena.scene, this.pcol);
    this.nfx = new SoundFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ────────────────────────────────────────────────────

  private fx(owner: 'player' | 'npc'): SoundFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: 'player' | 'npc'): SoundColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: 'player' | 'npc'): SoundAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(3);
    }
    return this.groundGfx;
  }

  /** The airborne layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(9);
    }
    return this.airGfx;
  }

  /** PARTY MODE's dance floor — the whole arena, under every other layer this kit owns. */
  private party(): Phaser.GameObjects.Graphics {
    if (!this.partyGfx || !this.partyGfx.active) {
      this.partyGfx = this.arena.scene.add.graphics().setDepth(2);
    }
    return this.partyGfx;
  }

  /** The performance set. Under the fighters, over the floor. */
  private stage(): Phaser.GameObjects.Graphics {
    if (!this.stageGfx || !this.stageGfx.active) {
      this.stageGfx = this.arena.scene.add.graphics().setDepth(4);
    }
    return this.stageGfx;
  }

  /**
   * Screen-space HUD strip. Depth 20 puts it under the bar's notes (21) and the labels (23), so
   * the hit ring reads as a target sitting *behind* the note you are aiming at.
   */
  private hud(): Phaser.GameObjects.Graphics {
    if (!this.hudGfx || !this.hudGfx.active) {
      this.hudGfx = this.arena.scene.add.graphics().setDepth(20);
    }
    return this.hudGfx;
  }

  // ── Public accessors ──────────────────────────────────────────────────

  /** True while the player is stood on the bar and cannot move — either performance counts. */
  isPerforming(): boolean { return this.perfMode !== null; }

  /**
   * Everything this element does to move speed, in one number ArenaScene pulls each frame:
   * the loaded record, the Disc Dice stacks, the tempo buff, the boombox field, Coda's dash
   * and the Harmony perk.
   */
  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    const pot = this.potency('player');
    let m = 1;
    if (this.disc() === 'accelerando') m *= (1 + ACCEL_SPEED_BONUS);
    if (time < this.discSpeedUntil) m *= (1 + DISC_SPEED_PER_HIT * this.discSpeedStacks);
    m *= (1 + this.tempo * this.boostMult('player') * pot);
    if (this.bank.move > 0) m *= (1 + this.bank.move * this.boostMult('player') * pot);
    if (this.standingInOwnBox('player')) m *= (1 + BOOMBOX_MOVE_BONUS * pot);
    if (time < this.codaDashUntil) m *= (1 + CODA_DASH_SPEED_BONUS * pot);
    if (time < this.harmonyUntil) m *= (1 + HARMONY_BONUS_PER_STACK * this.harmonyStacks);
    return m;
  }

  /**
   * PARTY MODE's half of the trade: for twelve seconds the enemy walks around wearing every
   * percentage of move speed the soloist had banked. Pulled by ArenaScene each frame, as the
   * player's is — pushing it would be stomped by whatever writes `npcSpeedMult` next.
   */
  getNpcSpeedMult(): number {
    if (this.arena.scene.time.now >= this.partyGift.until) return 1;
    return 1 + this.partyGift.move;
  }

  /**
   * Coda level 2 doubles the length of the Space dash. Read by ArenaScene's `executeDodge`, which
   * owns the dash for every element.
   */
  getDashLengthMult(): number { return this.codaLevel >= 2 ? CODA_DASH_LEN_MULT : 1; }

  /** Called by ArenaScene right after a dash: the note trail and the burst of speed behind it. */
  onPlayerDash(): void {
    if (this.codaLevel < 2) return;
    const { player } = this.arena;
    const time = this.arena.scene.time.now;
    this.codaDashUntil = time + CODA_DASH_SPEED_MS;
    this.pfx.notes(player.x, player.y, 7, {
      speed: 150, size: 7, life: 720, depth: 8,
      color: this.codaLevel >= 3 ? SOUND.neon : SOUND.magenta, rise: 26,
    });
    this.pfx.sparkle(player.x, player.y, 5, 26, 9, SOUND.gold);
    this.arena.showFloatingText(player.x, player.y - 44, '🎶 RIFF DASH', '#ff99dd');
  }

  /** Which record is on the deck. */
  private disc(): DiscMode { return DISC_ORDER[this.discIdx % DISC_ORDER.length]; }
  private npcDisc(): DiscMode { return DISC_ORDER[this.npcDiscIdx % DISC_ORDER.length]; }

  /** Coda's scaling on every percentage this kit hands out. */
  private boostMult(owner: 'player' | 'npc'): number {
    return CODA_BOOST_MULT[owner === 'player' ? this.codaLevel : this.npcCodaLevel];
  }

  /** Coda's scaling on everything this kit hits with. */
  private damageMult(owner: 'player' | 'npc'): number {
    return CODA_DAMAGE_MULT[owner === 'player' ? this.codaLevel : this.npcCodaLevel];
  }

  // ── Reset ────────────────────────────────────────────────────────────

  reset(isSoundMatch = false): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of [this.discAura, this.bugleAura, this.soloAura, this.codaAura, this.harmonyAura]) a?.destroy();
    this.discAura = null; this.bugleAura = null; this.soloAura = null;
    this.codaAura = null; this.harmonyAura = null;
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    if (this.stageGfx) { this.stageGfx.destroy(); this.stageGfx = null; }
    if (this.partyGfx) { this.partyGfx.destroy(); this.partyGfx = null; }
    if (this.hudGfx) { this.hudGfx.destroy(); this.hudGfx = null; }
    if (this.discLabel) { this.discLabel.destroy(); this.discLabel = null; }
    if (this.buffLabel) { this.buffLabel.destroy(); this.buffLabel = null; }
    if (this.perfLabel) { this.perfLabel.destroy(); this.perfLabel = null; }
    if (this.hypeLabel) { this.hypeLabel.destroy(); this.hypeLabel = null; }
    if (this.bankLabel) { this.bankLabel.destroy(); this.bankLabel = null; }
    this.vizT = 0;
    this.bowT = 1;

    this.metroAt = 0;
    this.npcMetroAt = 0;
    this.harmonyFlash = 0;

    this.waves = [];
    this.boomboxes = [];
    this.shoves = [];

    // Accelerando is the record loaded at the start of every match.
    this.discIdx = 0;
    this.npcDiscIdx = 0;
    this.discSpeedStacks = 0;
    this.discSpeedUntil = 0;
    this.discHoldUntil = 0;
    // The old fighters die with the old match, so the factor dies with them — this only has to
    // forget that it was ever pushed, or the next match would divide a fresh 1 back out.
    this.discDmgApplied = 1;
    this.calmAccum = 0;

    // Same reasoning as `discDmgApplied`: the old fighters carried the armour away with them,
    // so this only has to forget it was ever written.
    this.clickStreak = 0;
    this.bank = { move: 0, atk: 0, dmg: 0, res: 0 };
    this.resOwned = false;

    this.tempo = 0;
    this.npcTempo = 0;
    this.boomAtk = 0;
    this.npcBoomAtk = 0;
    this.bugleHoldUntil = 0;
    this.npcBugleHoldUntil = 0;

    this.perfMode = null;
    for (const n of this.perfNotes) n.sprite.destroy();
    this.perfNotes = [];
    this.perfNextSpawnAt = 0;
    this.perfGraceUntil = 0;
    this.perfStreak = 0;
    this.perfSpeed = 1;
    this.perfSlips = 0;
    this.perfSlipSpent = false;
    this.perfReturnX = 0;
    this.perfReturnY = 0;
    this.perfStageX = 0;
    this.perfStageY = 0;
    this.pointerWasDown = false;
    this.lastClickAt = 0;
    this.npcSoloUntil = 0;
    this.npcSoloNextAt = 0;

    this.codaLevel = 1;
    this.hype = 0;
    this.codaDashUntil = 0;
    this.npcCodaLevel = 1;
    this.npcHype = 0;

    this.partyHoldStart = 0;
    this.partyHoldAnnounced = false;
    this.partyUntil = 0;
    this.ball = null;
    this.partyGift = { move: 0, atk: 0, dmg: 0, until: 0 };
    this.partyDmgApplied = 1;

    this.bassCharges = [];

    this.harmonyGrenade = null;
    this.harmonyGrenadeX = 0;
    this.harmonyGrenadeY = 0;
    this.harmonyArmedAt = 0;
    this.harmonyExplodeAt = 0;
    this.harmonyNextThrowAt = 0;
    this.harmonyStacks = 0;
    this.harmonyUntil = 0;

    void isSoundMatch;
  }

  // ── The metronome ─────────────────────────────────────────────────────

  /**
   * Stamp an ability cast onto the metronome and report whether it landed on the beat. Every
   * cast restarts the meter, so a harmonized cast is also the start of the next window — a
   * whole performance can be played on the beat if you can keep time.
   */
  private beat(owner: 'player' | 'npc', time: number): boolean {
    const at = owner === 'player' ? this.metroAt : this.npcMetroAt;
    const harmonized = at > 0 && Math.abs(time - (at + BEAT_MS)) <= HARMONY_WINDOW;
    if (owner === 'player') this.metroAt = time; else this.npcMetroAt = time;
    if (harmonized && owner === 'player') this.harmonyFlash = 1;
    // Encore Streak (Click+). A bar and a Solo are played on the stage's own clock rather than
    // the metronome's, so nothing struck up there is allowed to break the run.
    if (owner === 'player') {
      if (harmonized) this.clickStreak++;
      else if (!this.perfMode) this.clickStreak = 0;
    }
    return harmonized;
  }

  /** The streak, or zero if Encore Streak was never bought. */
  private streak(): number {
    return this.arena.hasUpgrade('click') ? this.clickStreak : 0;
  }

  /** Announce a harmonized cast and throw the perk resonator if it is owned. */
  private onHarmonized(time: number, label: string): void {
    const { player } = this.arena;
    this.arena.showFloatingText(player.x, player.y - 52, `🎼 ${label}`, '#ffdd44');
    this.pfx.sparkle(player.x, player.y, 8, 34, 11, SOUND.gold);
    this.pfx.ripple(player.x, player.y, 12, 46, SOUND.gold, 340, 3, 7, 9);
    this.throwResonator(time);
  }

  // ── Input ─────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    const clickJustDown = pointer.isDown && !this.pointerWasDown;
    this.pointerWasDown = pointer.isDown;

    // ── On the bar: it owns the click, and only its own key gets you off it ──
    if (this.perfMode) {
      // Clicks during the opening beat are free — ending the run on a click thrown before the
      // first note was even on the bar would read as the ability being broken.
      if (clickJustDown && time >= this.perfGraceUntil && time - this.lastClickAt >= 140) {
        this.lastClickAt = time;
        this.strikePerfNote(time);
      }
      if (this.perfMode === 'bugle' && Phaser.Input.Keyboard.JustDown(fKey)) {
        this.endPerformance(time, 'CURTAIN');
      }
      if (this.perfMode === 'solo' && Phaser.Input.Keyboard.JustDown(qKey)) {
        this.endPerformance(time, 'ENCORE!');
      }
      return;
    }

    // ── R+ Jukebox: Space at the box, paid for out of the hype bar ─────
    if (this.arena.hasUpgrade('r')) this.tryJukebox(time);

    // ── Click: Staccato ────────────────────────────────────────────────
    if (clickJustDown && player.castAbility('staccato', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playStaccato(time, mouseX, mouseY);
    }

    // ── E: Disc Dice ───────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(eKey)
      && player.castAbility('disc-dice', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playDiscDice(time, mouseX, mouseY);
    }

    // ── R: Boombox ─────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(rKey)
      && player.castAbility('boombox', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playBoombox(time, mouseX, mouseY);
    }

    // ── F: Bugle ───────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)
      && player.castAbility('bugle', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playBugle(time, mouseX, mouseY);
    }

    // ── Q: Coda — or, once it is maxed, Solo. Q+ turns the key into a hold ──
    if (this.arena.hasUpgrade('q')) {
      this.handleRaiseTheRoof(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(qKey)
      && player.castAbility('coda', this.arena.buildPlayerContext(mouseX, mouseY))) {
      if (this.codaLevel >= CODA_MAX_LEVEL) {
        player.scaleStampedCooldown('coda', SOLO_COOLDOWN_MULT);
        this.startPerformance(time, 'solo', 0);
      } else this.playCoda(time);
    }
  }

  // ── Click: Staccato ───────────────────────────────────────────────────

  private playStaccato(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);
    const ang = Math.atan2(aimY - player.y, aimX - player.x);
    const base = harmonized ? STACCATO_HARM_DMG : STACCATO_DMG;
    const dmg = Math.round(base * this.damageMult('player'));

    // Encore Streak: a run of harmonized casts widens the crescent a percent at a time. The
    // streak is counted by `beat` above, so the cast that starts a run is already worth 1%.
    const size = 1 + STREAK_SIZE_PER * this.streak();

    this.bowT = 0;
    this.playerAvatar?.play('punch', ang);
    this.fireWave('player', player.x, player.y, ang, dmg, {
      color: this.codaLevel >= 3 ? SOUND.neon : harmonized ? SOUND.gold : SOUND.magenta,
      range: WAVE_RANGE, speed: WAVE_SPEED, spread: WAVE_SPREAD * size, thick: WAVE_THICK * size,
    });
    this.pfx.waveBurst(player.x, player.y, ang, (harmonized ? 1.3 : 1) * size, 9,
      harmonized ? SOUND.gold : SOUND.magenta);

    // The mirror ball is furniture until somebody puts a note through it.
    this.strikeBall(aimX, aimY);

    // Bass (divine perk): with the red record on the deck, the stroke lays a row of charges.
    if (this.disc() === 'bass' && this.arena.hasPerk('player', 'bass')) {
      this.layBassRow(time, player.x, player.y, aimX, aimY);
    }

    if (harmonized) this.onHarmonized(time, 'HARMONIZED');
  }

  // ── E: Disc Dice ──────────────────────────────────────────────────────

  private playDiscDice(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);
    const color = DISC_COLORS[this.disc()];

    this.discHoldUntil = time + DISC_HOLD_MS;
    this.playerAvatar?.play('sweep', Math.atan2(aimY - player.y, aimX - player.x));
    this.pfx.discSlice(player.x, player.y, DISC_RADIUS, color);

    let hits = 0;
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) > DISC_RADIUS) continue;
      hits++;
      t.takeDamage(Math.round(DISC_DMG * this.damageMult('player')));
      this.pfx.waveBurst(t.x, t.y, Math.atan2(t.y - player.y, t.x - player.x), 0.9, 8, color);
    }

    if (hits > 0) {
      this.discSpeedStacks = Math.min(DISC_SPEED_MAX_STACKS, this.discSpeedStacks + hits);
      this.discSpeedUntil = time + DISC_SPEED_MS;
      this.arena.showFloatingText(player.x, player.y - 34,
        `💿 +${Math.round(DISC_SPEED_PER_HIT * this.discSpeedStacks * 100)}% SPEED`, '#ffaadd');
      // Sound System (E+): what the record is worth is banked for the rest of the match, and
      // which stat it banks is whichever record was on the deck when it cut somebody.
      if (this.arena.hasUpgrade('e')) this.bankDiscHits(hits);
    }

    // Harmonized: change the record. This is the only way the deck ever advances.
    if (harmonized) {
      this.discIdx = (this.discIdx + 1) % DISC_ORDER.length;
      const next = this.disc();
      this.pfx.ripple(player.x, player.y, 16, 90, DISC_COLORS[next], 460, 5, 7, 9);
      this.pfx.notes(player.x, player.y, 5, { speed: 150, color: DISC_COLORS[next], depth: 9 });
      this.onHarmonized(time, `${DISC_NAMES[next]} DISC`);
    }
  }

  /**
   * Sound System (E+). Green pays in stride, red in weight and blue in armour — one bank per
   * record, permanent for the match, and all three burn for hype like everything else this
   * element carries.
   */
  private bankDiscHits(hits: number): void {
    const { player } = this.arena;
    const mode = this.disc();
    if (mode === 'accelerando') {
      this.bank.move += DISC_BANK_MOVE * hits;
      this.arena.showFloatingText(player.x, player.y - 50,
        `💚 +${Math.round(this.bank.move * 100)}% SPEED BANKED`, '#9cffcc');
    } else if (mode === 'bass') {
      this.bank.dmg += DISC_BANK_DMG * hits;
      this.arena.showFloatingText(player.x, player.y - 50,
        `🔴 +${Math.round(this.bank.dmg * 100)}% DAMAGE BANKED`, '#ff8888');
    } else {
      this.bank.res += DISC_BANK_RES * hits;
      this.arena.showFloatingText(player.x, player.y - 50,
        `🔵 +${Math.round(this.bank.res * 100)}% RESIST BANKED`, '#9ecdff');
    }
    this.pfx.sparkle(player.x, player.y, 5, 26, 10, DISC_COLORS[mode]);
  }

  // ── R: Boombox ────────────────────────────────────────────────────────

  private playBoombox(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);
    this.placeBoombox('player', aimX, aimY, harmonized, time);
    this.playerAvatar?.play('slam', Math.atan2(aimY - player.y, aimX - player.x));
    if (harmonized) this.onHarmonized(time, 'STACKED BOOMBOX');
    else this.arena.showFloatingText(aimX, aimY - 46, '📻 BOOMBOX', '#ff88cc');
  }

  /** One box per owner: dropping a second one packs the first away rather than stacking them. */
  private placeBoombox(
    owner: 'player' | 'npc', x: number, y: number, golden: boolean, time: number,
  ): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const bx = Phaser.Math.Clamp(x, 40, W - 40);
    const by = Phaser.Math.Clamp(y, 40, H - 40);

    for (let i = this.boomboxes.length - 1; i >= 0; i--) {
      const b = this.boomboxes[i];
      if (b.owner !== owner) continue;
      this.fx(owner).shatter(b.x, b.y, 24, 8, 9, b.golden ? SOUND.gold : SOUND.magenta);
      this.boomboxes.splice(i, 1);
    }

    const radius = golden ? BOOMBOX_RADIUS_GOLD : BOOMBOX_RADIUS;
    this.boomboxes.push({
      owner, x: bx, y: by, golden, radius,
      expiresAt: time + BOOMBOX_MS,
      lastPulseAt: time,
      nextPulseAt: time + BOOMBOX_PULSE_MS,
      pulseMs: BOOMBOX_PULSE_MS,
      jukebox: false,
    });

    const fx = this.fx(owner);
    const col = golden ? SOUND.gold : SOUND.magenta;
    fx.ripple(bx, by, 10, radius, col, 520, 6, 7, 9);
    fx.notes(bx, by, 6, { speed: 170, color: col, depth: 9 });
    if (golden) fx.sparkle(bx, by, 10, 40, 10, SOUND.gold);
  }

  /** The owner's live box, or null. There is never more than one. */
  private boxOf(owner: 'player' | 'npc'): Boombox | null {
    return this.boomboxes.find((b) => b.owner === owner) ?? null;
  }

  private standingInOwnBox(owner: 'player' | 'npc'): boolean {
    const box = this.boxOf(owner);
    if (!box) return false;
    const f = owner === 'player' ? this.arena.player : this.arena.npc;
    return Phaser.Math.Distance.Between(f.x, f.y, box.x, box.y) <= box.radius;
  }

  /**
   * How much every buff this kit hands out is worth right now. A harmonized boombox makes
   * everything you pick up inside its field 1.5× stronger — the tempo you are already carrying,
   * the attack speed the box itself banks, and the speed off a Coda dash.
   */
  private potency(owner: 'player' | 'npc'): number {
    const box = this.boxOf(owner);
    if (!box || !box.golden) return 1;
    return this.standingInOwnBox(owner) ? BOOMBOX_POTENCY : 1;
  }

  private updateBoomboxes(time: number, delta: number): void {
    for (let i = this.boomboxes.length - 1; i >= 0; i--) {
      const b = this.boomboxes[i];
      if (time >= b.expiresAt) {
        this.fx(b.owner).shatter(b.x, b.y, 26, 9, 9, b.golden ? SOUND.gold : SOUND.magenta);
        this.fx(b.owner).notes(b.x, b.y, 4, { speed: 120, color: SOUND.plum, depth: 9 });
        this.boomboxes.splice(i, 1);
        continue;
      }

      // ── Banking attack speed for whoever is stood in their own field ──
      const f = b.owner === 'player' ? this.arena.player : this.arena.npc;
      if (f?.active && f.hp > 0
        && Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) <= b.radius) {
        const gain = (delta / 1000) * BOOMBOX_ATK_PER_SEC * (b.golden ? BOOMBOX_POTENCY : 1);
        if (b.owner === 'player') this.boomAtk += gain; else this.npcBoomAtk += gain;
      }

      // ── The pulse ──
      if (time >= b.nextPulseAt) {
        b.lastPulseAt = time;
        b.nextPulseAt = time + b.pulseMs;
        this.pulseBoombox(b, time);
      }
    }
    this.updateShoves(delta / 1000);
  }

  /** The three-second wave: nothing takes damage, everything hostile gets thrown back out. */
  private pulseBoombox(b: Boombox, time: number): void {
    const fx = this.fx(b.owner);
    const col = b.golden ? SOUND.gold : SOUND.magenta;
    fx.bounceWave(b.x, b.y, b.radius, col);
    this.arena.scene.cameras.main.shake(120, 0.003);

    // Fighters on the wrong side of the box.
    const targets = b.owner === 'player' ? this.arena.enemies : [this.arena.player];
    let caught = 0;
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y);
      if (d > b.radius) continue;
      caught++;
      const ang = d < 1 ? Math.random() * Math.PI * 2 : Math.atan2(t.y - b.y, t.x - b.x);
      this.shove(t, ang, BOOMBOX_SHOVE_DIST * (b.golden ? 1.25 : 1), time);
      fx.waveBurst(t.x, t.y, ang, 1, 9, col);
    }

    // …and their shots, turned around and sent back out of the field.
    for (const obj of this.arena.projectiles.getChildren().slice()) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal) continue;
      // A box only bounces the *other* side's shots.
      if (p.isFromPlayer === (b.owner === 'player')) continue;
      if (Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y) > b.radius) continue;
      const body = p.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      const ang = Math.atan2(p.y - b.y, p.x - b.x);
      const speed = Math.max(BOOMBOX_PROJ_SPEED, Math.hypot(body.velocity.x, body.velocity.y));
      body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      p.setRotation(ang);
      fx.waveBurst(p.x, p.y, ang, 0.6, 9, SOUND.white);
      caught++;
    }

    if (caught > 0 && b.owner === 'player') {
      this.arena.showFloatingText(b.x, b.y - b.radius * 0.55, `📻 BOUNCE ×${caught}`, '#ff88cc');
    }
  }

  /**
   * Jukebox (R+). Space at the box — and only Space, which is why the dodge does not fire on the
   * same press — takes ten hype off the ladder and buys the field a third again as wide and a
   * pulse every two seconds instead of every three, for whatever is left of the box's life.
   *
   * The JustDown is read *last*, after every reason to refuse has been checked, because reading
   * it is what consumes it: an early read would eat a dodge the player never got.
   */
  private tryJukebox(time: number): void {
    const box = this.boxOf('player');
    if (!box || box.jukebox || this.hype < JUKEBOX_HYPE_COST) return;
    const { player, spaceKey } = this.arena;
    if (Phaser.Math.Distance.Between(player.x, player.y, box.x, box.y) > box.radius + JUKEBOX_REACH) return;
    if (!Phaser.Input.Keyboard.JustDown(spaceKey)) return;

    this.hype -= JUKEBOX_HYPE_COST;
    box.jukebox = true;
    box.radius *= JUKEBOX_RADIUS_MULT;
    box.pulseMs = JUKEBOX_PULSE_MS;
    box.nextPulseAt = Math.min(box.nextPulseAt, time + JUKEBOX_PULSE_MS);

    const col = box.golden ? SOUND.gold : SOUND.magenta;
    this.pfx.ripple(box.x, box.y, 14, box.radius, col, 620, 7, 7, 9);
    this.pfx.notes(box.x, box.y, 8, { speed: 190, color: col, depth: 9, size: 8 });
    this.pfx.sparkle(box.x, box.y, 10, 44, 10, SOUND.gold);
    this.arena.scene.cameras.main.shake(180, 0.004);
    this.arena.showFloatingText(box.x, box.y - 52, '🎛️ JUKEBOX!', '#ffdd44');
    this.arena.showFloatingText(player.x, player.y - 44, `🔥 −${JUKEBOX_HYPE_COST} HYPE`, '#ff88cc');
  }

  private shove(target: Fighter, ang: number, distance: number, time: number): void {
    const speed = distance / (SHOVE_MS / 1000);
    this.shoves = this.shoves.filter((s) => s.target !== target);
    this.shoves.push({
      target, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, until: time + SHOVE_MS,
    });
  }

  private updateShoves(dt: number): void {
    if (!this.shoves.length) return;
    const now = this.arena.scene.time.now;
    const W = this.arena.width;
    const H = this.arena.height;
    for (const s of this.shoves) {
      const t = s.target;
      if (!t || !t.active) continue;
      // Eases out over its life, so a bounce decelerates instead of stopping dead.
      const left = Phaser.Math.Clamp((s.until - now) / SHOVE_MS, 0, 1);
      t.setPosition(
        Phaser.Math.Clamp(t.x + s.vx * dt * left * 2, 24, W - 24),
        Phaser.Math.Clamp(t.y + s.vy * dt * left * 2, 24, H - 24),
      );
    }
    this.shoves = this.shoves.filter((s) => s.until > now && s.target?.active);
  }

  // ── F: Bugle ──────────────────────────────────────────────────────────

  /**
   * The bugle no longer hands out a buff for being pressed — it puts you on a rhythm bar and pays
   * a percent a note. Harmonized, it also buys you one mistake, at the price of the bar winding
   * up 1.2× faster the moment you spend it.
   */
  private playBugle(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);

    this.bugleHoldUntil = time + BUGLE_HOLD_MS;
    this.blowBugle('player', aimX, aimY);
    this.startPerformance(time, 'bugle', harmonized ? 1 : 0);

    if (harmonized) {
      this.arena.showFloatingText(player.x, player.y - 62, '🎺 ONE SLIP ALLOWED', '#ffe9a8');
      this.onHarmonized(time, 'FANFARE');
    }
  }

  /** The horn coming up to the lips: three blasts out of the bell, widening each time. */
  private blowBugle(owner: 'player' | 'npc', tx: number, ty: number): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dir = tx >= caster.x ? 1 : -1;
    const fx = this.fx(owner);
    this.avatar(owner)?.play('raise', dir > 0 ? 0 : Math.PI, BUGLE_HOLD_MS);

    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 150, () => {
        if (!caster.active) return;
        fx.waveBurst(caster.x + dir * 44, caster.y - 6, dir > 0 ? 0 : Math.PI,
          1.3 + i * 0.35, 11, SOUND.brassHi, 0.9);
      });
    }
    fx.notes(caster.x + dir * 44, caster.y - 6, 4,
      { speed: 150, angle: dir > 0 ? 0 : Math.PI, spread: 0.7, color: SOUND.brass, depth: 11 });
    void ty;
  }

  // ── The performance bar ───────────────────────────────────────────────

  /**
   * Take the stage. Both performances run the same bar: the bugle's pays in tempo and the Solo's
   * pays in walls of music, but the note track, the miss rule and the lock in place are one
   * system, because the player has to learn the timing exactly once.
   */
  private startPerformance(time: number, mode: PerfMode, slips: number): void {
    const { player, scene } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;

    this.perfMode = mode;
    this.perfReturnX = player.x;
    this.perfReturnY = player.y;
    this.perfStageX = W / 2;
    this.perfStageY = H * 0.52;
    this.perfStreak = 0;
    this.perfSpeed = 1;
    this.perfSlips = slips;
    this.perfSlipSpent = false;
    // Taking the stage abandons whatever Q was winding — the bar owns the click from here, so
    // any ball that is not part of a running party goes back up.
    this.partyHoldStart = 0;
    if (this.ball && time >= this.partyUntil) this.ball.leaving = true;
    this.perfGraceUntil = time + PERF_GRACE_MS;
    this.perfNextSpawnAt = time + PERF_GRACE_MS;
    for (const n of this.perfNotes) n.sprite.destroy();
    this.perfNotes = [];

    // Take the stage.
    const px = this.perfStageX;
    const py = this.perfStageY - 18;
    player.setPosition(px, py);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(px, py);
    body.setVelocity(0, 0);

    const col = mode === 'solo' ? SOUND.gold : SOUND.brass;
    this.pfx.ripple(px, this.perfStageY, 20, 190, col, 640, 6, 5, 9);
    this.pfx.notes(px, py, 8, { speed: 200, color: col, depth: 10, size: 8 });
    this.pfx.sparkle(px, py - 20, 10, 60, 11, SOUND.white);
    scene.cameras.main.shake(220, 0.005);
    this.playerAvatar?.play('raise', -Math.PI / 2, 900);
    this.bowT = 0;
    this.arena.showFloatingText(px, py - 48,
      mode === 'solo' ? '🎸 SOLO!' : '🎺 BUGLE CALL!', mode === 'solo' ? '#ffdd44' : '#ffe9a8');
  }

  private endPerformance(time: number, label: string): void {
    const mode = this.perfMode;
    if (!mode) return;
    this.perfMode = null;

    const col = mode === 'solo' ? SOUND.gold : SOUND.brass;
    this.pfx.ripple(this.perfStageX, this.perfStageY, 30, 160, col, 480, 5, 5, 7);
    this.pfx.notes(this.perfStageX, this.perfStageY - 20, 6, { speed: 150, color: col, depth: 10 });
    if (this.stageGfx?.active) this.stageGfx.clear();
    for (const n of this.perfNotes) n.sprite.destroy();
    this.perfNotes = [];

    const { player } = this.arena;
    player.setPosition(this.perfReturnX, this.perfReturnY);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.perfReturnX, this.perfReturnY);
    body.setVelocity(0, 0);

    // The bugle's cooldown is counted from the end of the run, not from stepping onto the bar —
    // otherwise a long, well-played performance would eat its own downtime and a fumbled one
    // would be handed the horn straight back.
    if (mode === 'bugle') player.restampCooldown('bugle');
    void time;

    this.pfx.waveBurst(player.x, player.y, -Math.PI / 2, 1.3, 9, col, 1.4);
    this.arena.showFloatingText(player.x, player.y - 40,
      `${mode === 'solo' ? '🎸' : '🎺'} ${label}`, mode === 'solo' ? '#ffdd44' : '#ffe9a8');
  }

  /**
   * A missed note. The harmonized bugle's one slip is spent here — and spending it winds the bar
   * up rather than letting you off, so the mercy costs something.
   */
  private missPerfNote(time: number, reason: string): void {
    this.pfx.discord(this.arena.player.x, this.arena.player.y);
    if (this.perfSlips > 0) {
      this.perfSlips--;
      this.perfSlipSpent = true;
      this.perfSpeed *= BUGLE_SLIP_SPEEDUP;
      this.arena.scene.cameras.main.shake(160, 0.004);
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 56,
        '🎺 SLIP! ×1.2 FASTER', '#ff8866');
      return;
    }
    this.endPerformance(time, reason);
  }

  /** A click while on the bar: land the note under the line, or bring the house down. */
  private strikePerfNote(time: number): void {
    const hitLineX = this.arena.width / 2;
    const idx = this.perfNotes.findIndex((n) => Math.abs(n.x - hitLineX) <= PERF_TOLERANCE);
    if (idx === -1) {
      this.missPerfNote(time, 'FLUBBED!');
      return;
    }

    const note = this.perfNotes[idx];

    // Perfect Pitch: a red note is the one you are supposed to let go past. Playing it is the
    // mistake — which is why letting it run off the end of the bar is not.
    if (note.kind === 'red') {
      note.sprite.destroy();
      this.perfNotes.splice(idx, 1);
      this.missPerfNote(time, 'WRONG NOTE!');
      return;
    }

    // …and a hold note is caught here and paid for later, as its tail crosses the line.
    if (note.kind === 'hold') {
      if (note.holding) return;
      note.holding = true;
      this.perfStreak++;
      this.bowT = 0;
      this.pfx.waveBurst(this.arena.player.x, this.arena.player.y - 6, -Math.PI / 2, 1, 10, SOUND.mint, 0.9);
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 56, '🎵 HOLD IT', '#9cffcc');
      return;
    }

    note.sprite.destroy();
    this.perfNotes.splice(idx, 1);
    this.perfStreak++;
    this.bowT = 0;
    if (this.perfMode === 'solo') this.playSoloWall(note.accent);
    else this.landBugleNote();
  }

  /** A landed bugle note: a flat percent onto both stats, worth more inside a harmonized box. */
  private landBugleNote(): void {
    const { player } = this.arena;
    const gain = BUGLE_NOTE_GAIN * this.potency('player');
    this.tempo += gain;
    this.pfx.waveBurst(player.x, player.y - 6, -Math.PI / 2, 1, 10, SOUND.brassHi, 0.9);
    this.pfx.notes(player.x, player.y - 10, 2, { speed: 130, color: SOUND.brass, depth: 10 });
    this.arena.showFloatingText(player.x, player.y - 56,
      `🎺 +${(gain * 100).toFixed(gain > 0.0105 ? 1 : 0)}% · ${Math.round(this.tempo * 100)}%`, '#ffe9a8');
  }

  /** The wall of music every landed Solo note throws across the entire room. */
  private playSoloWall(accent: boolean): void {
    const { player, scene } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    const reach = Math.hypot(W, H);
    const dmg = Math.round((accent ? SOLO_ACCENT_DMG : SOLO_NOTE_DMG) * this.damageMult('player'));
    const color = accent ? SOUND.gold : SOUND.neon;

    this.pfx.musicWall(player.x, player.y, reach, color);
    this.playerAvatar?.play('punch', -Math.PI / 2);
    scene.cameras.main.shake(accent ? 200 : 120, accent ? 0.005 : 0.003);

    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      t.takeDamage(dmg);
      this.pfx.ripple(t.x, t.y, 8, 40, color, 320, 3, 8, 8);
    }
    this.arena.showFloatingText(player.x, player.y - 56,
      accent ? `⭐ ACCENT! ×${this.perfStreak}` : `🎵 ×${this.perfStreak}`,
      accent ? '#ffdd44' : '#ff88cc');
  }

  /**
   * Which note the bar asks for next. Perfect Pitch (F+) only ever writes on the bugle's bar —
   * a Solo is a wall of music a note, and there is nothing there to hold or to leave alone.
   */
  private rollNoteKind(): TrackNoteKind {
    if (this.perfMode !== 'bugle' || !this.arena.hasUpgrade('f')) return 'note';
    const chance = this.perfSlipSpent ? FANCY_NOTE_CHANCE_AFTER_SLIP : FANCY_NOTE_CHANCE;
    if (Math.random() >= chance) return 'note';
    return Math.random() < 0.5 ? 'red' : 'hold';
  }

  private noteColor(n: { kind: TrackNoteKind; accent: boolean }, solo: boolean): number {
    if (n.kind === 'red') return SOUND.crimson;
    if (n.kind === 'hold') return SOUND.mint;
    return n.accent ? SOUND.gold : solo ? SOUND.rose : SOUND.brass;
  }

  private updatePerformance(time: number, delta: number): void {
    const W = this.arena.width;
    const hitLineX = W / 2;
    const trackY = this.trackY();
    const solo = this.perfMode === 'solo';

    // Randomised spacing: the bar is meant to be read, not memorised.
    if (time >= this.perfGraceUntil && time >= this.perfNextSpawnAt) {
      const kind = this.rollNoteKind();
      const len = kind === 'hold' ? HOLD_NOTE_LEN : 0;
      // A hold note occupies the bar for as long as its tail does, so the next one waits it out.
      const gap = PERF_SPAWN_MIN + Math.random() * (PERF_SPAWN_MAX - PERF_SPAWN_MIN)
        + (len / PERF_NOTE_SPEED) * 1000;
      this.perfNextSpawnAt = time + gap / this.perfSpeed;
      const accent = kind === 'note' && solo && Math.random() < SOLO_ACCENT_CHANCE;
      const gfx = this.arena.scene.add.graphics();
      SoundFx.drawTrackNote(gfx, this.pcol, PERF_NOTE_WIDTH,
        this.noteColor({ kind, accent }, solo), accent, 0, kind, len, 0);
      const sprite = this.arena.scene.add.container(W + 24 + len, trackY, [gfx]).setDepth(21);
      this.perfNotes.push({ sprite, gfx, x: W + 24 + len, accent, kind, len, held: 0, holding: false });
    }

    for (let i = this.perfNotes.length - 1; i >= 0; i--) {
      const n = this.perfNotes[i];
      const prevX = n.x;
      n.x -= PERF_NOTE_SPEED * this.perfSpeed * delta / 1000;
      n.sprite.setX(n.x);
      n.sprite.setY(trackY);

      // ── Hold notes: the reading head is the hit line, and the tail is paid for by the
      //    pixel as it crosses. Let go and the rest of it simply goes unpaid. ──
      if (n.kind === 'hold') {
        const before = Phaser.Math.Clamp(hitLineX - prevX, 0, n.len);
        const now = Phaser.Math.Clamp(hitLineX - n.x, 0, n.len);
        if (n.holding && this.pointerWasDown) n.held += now - before;
        if (now >= n.len) {
          n.sprite.destroy();
          this.perfNotes.splice(i, 1);
          if (n.held <= 0) {
            this.missPerfNote(time, 'DROPPED!');
            return;
          }
          this.landHoldNote(n.held / n.len);
          continue;
        }
      }

      if (n.gfx.active) {
        SoundFx.drawTrackNote(n.gfx, this.pcol, PERF_NOTE_WIDTH,
          this.noteColor(n, solo), n.accent, this.vizT + n.x * 0.01, n.kind, n.len, n.held);
      }

      // A note that reaches the far edge is a note you dropped — unless it is red, in which
      // case letting it get there is exactly what it was asking for.
      if (n.x < -24) {
        n.sprite.destroy();
        this.perfNotes.splice(i, 1);
        if (n.kind === 'red') {
          this.landRedNote();
          continue;
        }
        this.missPerfNote(time, 'MISSED!');
        return;
      }
    }
  }

  /** A green hold note carried across the line. Pays attack speed in proportion to how much. */
  private landHoldNote(frac: number): void {
    const { player } = this.arena;
    const gain = HOLD_NOTE_ATK * Phaser.Math.Clamp(frac, 0, 1) * this.potency('player');
    this.bank.atk += gain;
    this.pfx.notes(player.x, player.y - 10, 3, { speed: 140, color: SOUND.mint, depth: 10 });
    this.pfx.sparkle(player.x, player.y, frac > 0.95 ? 9 : 4, 30, 10, SOUND.mintPale);
    this.arena.showFloatingText(player.x, player.y - 56,
      `${frac > 0.95 ? '⭐ PERFECT HOLD' : '🎵 HELD'} +${(gain * 100).toFixed(1)}% ATK`, '#9cffcc');
  }

  /** A red note allowed to run off the end of the bar, which is the whole trick of them. */
  private landRedNote(): void {
    const { player } = this.arena;
    this.bank.dmg += RED_NOTE_DMG;
    this.pfx.sparkle(player.x, player.y, 4, 26, 10, SOUND.crimson);
    this.arena.showFloatingText(player.x, player.y - 56,
      `🔴 RESTED +${Math.round(this.bank.dmg * 100)}% DMG`, '#ff8888');
  }

  // ── Q: Coda ───────────────────────────────────────────────────────────

  /**
   * Burn everything you have banked. Percentages become hype at a point apiece — tempo counts
   * twice because it buffs two stats — and every 200 hype is a rung up the ladder.
   */
  /**
   * Everything the soloist is carrying, in hype points — a point a percent. Tempo counts twice
   * because it buffs two stats, and Encore Streak counts once because each rung of it is worth
   * exactly one percent of shockwave.
   */
  private bankedHype(): number {
    return Math.round(
      this.tempo * 100 * 2 + this.boomAtk * 100
      + (this.bank.move + this.bank.atk + this.bank.dmg + this.bank.res) * 100
      + this.streak());
  }

  /** Hand back every percentage this element has banked. Q is the only thing that calls it. */
  private clearBanks(): void {
    this.tempo = 0;
    this.boomAtk = 0;
    this.bank = { move: 0, atk: 0, dmg: 0, res: 0 };
    this.clickStreak = 0;
  }

  /** Put hype on the ladder and climb whatever rungs it reaches. */
  private gainHype(gained: number): void {
    this.hype += gained;
    while (this.hype >= CODA_PER_LEVEL && this.codaLevel < CODA_MAX_LEVEL) {
      this.hype -= CODA_PER_LEVEL;
      this.codaLevel++;
      this.codaLevelUp();
    }
  }

  private playCoda(time: number): void {
    const { player, scene } = this.arena;
    const gained = this.bankedHype();

    if (gained <= 0) {
      // Nothing to burn. Hand the ultimate straight back rather than eating the cooldown for it.
      player.resetCooldown('coda');
      this.arena.showFloatingText(player.x, player.y - 46, '🎸 NOTHING TO BURN', '#997788');
      return;
    }

    this.clearBanks();

    this.playerAvatar?.play('raise', -Math.PI / 2, 700);
    this.pfx.boom(player.x, player.y, 90, { color: SOUND.neon, petals: 9, notes: 7 });
    this.pfx.sparkle(player.x, player.y, 12, 44, 11, SOUND.gold);
    scene.cameras.main.shake(200, 0.005);
    this.arena.showFloatingText(player.x, player.y - 46, `🔥 +${gained} HYPE`, '#ff66cc');

    this.gainHype(gained);
    void time;
  }

  private codaLevelUp(): void {
    const { player, scene } = this.arena;
    const lv = this.codaLevel;
    const heal = CODA_HEAL[lv];
    if (heal > 0) player.heal(heal);

    const col = lv >= 3 ? SOUND.neon : SOUND.gold;
    this.pfx.boom(player.x, player.y, lv >= 3 ? 170 : 130, { color: col, petals: 12, notes: 10 });
    this.pfx.ripple(player.x, player.y, 20, 220, SOUND.white, 700, 6, 9, 9);
    this.pfx.sparkle(player.x, player.y, 18, 70, 12, SOUND.gold);
    scene.cameras.main.shake(400, 0.009);
    this.arena.showFloatingText(player.x, player.y - 68,
      lv >= 3 ? '⚡ LEVEL 3 — ELECTRIC!' : '🎸 LEVEL 2 — GUITAR!', lv >= 3 ? '#ff44bb' : '#ffdd44');
    this.arena.showFloatingText(player.x, player.y - 88, `💚 +${heal} HP`, '#66ff99');
  }

  // ── Q+: Raise the Roof ────────────────────────────────────────────────

  /** Where the ball hangs when the rope is all the way out. */
  private fullRope(): number { return this.arena.height * 0.45; }

  /**
   * Q+ turns the key into a hold. Pressing it starts winding a mirror ball down out of the
   * ceiling; three full seconds of that is PARTY MODE. At max Coda the tap underneath is still
   * Solo, so letting go early plays the ultimate and holding through plays the room instead.
   */
  private handleRaiseTheRoof(time: number, aimX: number, aimY: number): void {
    const { player, qKey } = this.arena;
    const maxed = this.codaLevel >= CODA_MAX_LEVEL;

    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      // Nothing comes out of the ceiling until the key can actually pay for what it is winding.
      if (player.getCooldownRatio('coda') < 1) return;
      this.partyHoldStart = time;
      this.partyHoldAnnounced = false;
      this.dropBall();
      return;
    }

    if (this.partyHoldStart === 0) return;

    // Announced once the press is unmistakably a hold, so a plain Coda tap says nothing.
    if (!this.partyHoldAnnounced && time - this.partyHoldStart >= 450) {
      this.partyHoldAnnounced = true;
      this.arena.showFloatingText(player.x, player.y - 62, '🪩 RAISE THE ROOF', '#ccddff');
    }

    if (!qKey.isDown) {
      this.partyHoldStart = 0;
      // Let go early and the ball goes back up — unless the party is already running, in which
      // case it is not this hold's ball to take away.
      if (this.ball && time >= this.partyUntil) this.ball.leaving = true;
      // The tap underneath the hold is untouched: Coda climbing the ladder, or Solo once it
      // is maxed. Raise the Roof is what the *hold* buys, not a replacement for the key.
      if (!player.castAbility('coda', this.arena.buildPlayerContext(aimX, aimY))) return;
      if (maxed) {
        player.scaleStampedCooldown('coda', SOLO_COOLDOWN_MULT);
        this.startPerformance(time, 'solo', 0);
      } else this.playCoda(time);
      return;
    }

    if (time - this.partyHoldStart >= PARTY_HOLD_MS) {
      this.partyHoldStart = 0;
      if (player.castAbility('coda', this.arena.buildPlayerContext(aimX, aimY))) {
        player.scaleStampedCooldown('coda', PARTY_COOLDOWN_MULT);
        this.startParty(time);
      } else if (this.ball) {
        this.ball.leaving = true;
      }
    }
  }

  private dropBall(): void {
    if (this.ball) { this.ball.leaving = false; return; }
    this.ball = {
      anchorX: this.arena.width / 2,
      anchorY: -14,
      rope: 6,
      targetRope: 6,
      ang: 0,
      angVel: 0,
      x: this.arena.width / 2,
      y: -8,
      hitAt: new Map<Fighter, number>(),
      leaving: false,
    };
  }

  /**
   * PARTY MODE. Everything the soloist has banked is stripped off and handed to the other side
   * for twelve seconds; in exchange the burn pays double hype, the room turns into a dance floor
   * and the mirror ball stays down, where a click can swing it through somebody for real damage.
   */
  private startParty(time: number): void {
    const { player, scene } = this.arena;
    const gained = Math.round(this.bankedHype() * PARTY_HYPE_MULT);

    // Read the bundle before the burn eats it — this is what changes hands.
    this.partyGift = {
      move: this.tempo + this.bank.move,
      atk: this.tempo + this.boomAtk + this.bank.atk,
      dmg: this.bank.dmg,
      until: time + PARTY_MS,
    };
    this.clearBanks();
    this.discSpeedStacks = 0;
    this.discSpeedUntil = 0;
    this.codaDashUntil = 0;
    this.partyUntil = time + PARTY_MS;
    this.dropBall();

    this.playerAvatar?.play('raise', -Math.PI / 2, 900);
    this.pfx.boom(player.x, player.y, 160, { color: SOUND.neon, petals: 12, notes: 12 });
    this.pfx.ripple(player.x, player.y, 24, 260, SOUND.white, 720, 6, 9, 9);
    this.pfx.sparkle(player.x, player.y, 20, 80, 12, SOUND.gold);
    scene.cameras.main.shake(420, 0.009);
    this.arena.showFloatingText(player.x, player.y - 70, '🪩 PARTY MODE!', '#ffffff');
    if (gained > 0) {
      this.arena.showFloatingText(player.x, player.y - 46, `🔥 +${gained} HYPE (×2)`, '#ff66cc');
      this.gainHype(gained);
    }
    const shared = Math.round((this.partyGift.move + this.partyGift.atk + this.partyGift.dmg) * 100);
    const { npc } = this.arena;
    if (shared > 0 && npc?.active) {
      this.arena.showFloatingText(npc.x, npc.y - 54, `🎁 +${shared}% SHARED`, '#ffaa55');
    }
  }

  /**
   * The other half of the trade, ticked every frame regardless of who is playing Sound. Move
   * speed is pulled by ArenaScene, attack speed is spent here, and the damage share is pushed
   * once and divided back out when the party ends.
   */
  private updatePartyGift(time: number, delta: number): void {
    const { npc } = this.arena;
    const live = time < this.partyGift.until;
    const wantDmg = live ? 1 + this.partyGift.dmg : 1;
    if (npc?.active && wantDmg !== this.partyDmgApplied) {
      npc.outgoingDamageMult = npc.outgoingDamageMult / this.partyDmgApplied * wantDmg;
      this.partyDmgApplied = wantDmg;
    }
    if (live && npc?.active && this.partyGift.atk > 0) {
      npc.reduceCooldowns(delta * this.partyGift.atk);
    }
    // The lights come up. The ball is wound back in rather than deleted, so it reads as leaving.
    if (!live && this.partyUntil > 0 && time >= this.partyUntil) {
      this.partyUntil = 0;
      if (this.ball && this.partyHoldStart === 0) this.ball.leaving = true;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 52,
        '🪩 LIGHTS UP', '#ccddff');
    }
  }

  /**
   * The mirror ball, as a pendulum on a rope tied to the ceiling. The rope pays out while Q is
   * held and winds back in when the party ends; everything else is a swing, and a swing that is
   * actually moving is a wrecking ball.
   */
  private updateBall(time: number, delta: number): void {
    const b = this.ball;
    if (!b) return;
    const dt = Math.min(delta, 50) / 1000;

    b.targetRope = b.leaving ? 4
      : this.partyHoldStart > 0
        ? Math.max(24, this.fullRope() * Phaser.Math.Clamp((time - this.partyHoldStart) / PARTY_HOLD_MS, 0, 1))
        : this.fullRope();
    b.rope = Phaser.Math.Linear(b.rope, b.targetRope, Math.min(1, dt * 3.4));
    if (b.leaving && b.rope <= 8) { this.ball = null; return; }

    // Pendulum, damped. Rope length is folded into BALL_GRAVITY rather than divided out, so a
    // half-wound ball swings at the same rate as a fully wound one and reads as one object.
    b.angVel += -BALL_GRAVITY * Math.sin(b.ang) * dt;
    b.angVel *= Math.exp(-BALL_DAMP * dt);
    b.ang += b.angVel * dt;
    b.x = b.anchorX + Math.sin(b.ang) * b.rope;
    b.y = b.anchorY + Math.cos(b.ang) * b.rope;

    // Only a party ball is a wrecking ball. One still being wound out of the ceiling can be
    // shoved around, but it cannot be farmed for damage by tapping Q and letting go again.
    if (time >= this.partyUntil || Math.abs(b.angVel) < BALL_SWING_MIN) return;
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > BALL_RADIUS + 18) continue;
      if (time < (b.hitAt.get(t) ?? 0)) continue;
      b.hitAt.set(t, time + BALL_HIT_COOLDOWN);
      const hx = t.x, hy = t.y;
      t.takeDamage(BALL_SWING_DMG);
      this.pfx.shatter(hx, hy, 34, 11, 11, SOUND.glint);
      this.pfx.boom(hx, hy, 60, { color: SOUND.mirrorLit, mark: false, notes: 3, duration: 340 });
      this.arena.scene.cameras.main.shake(200, 0.006);
      this.arena.showFloatingText(hx, hy - 46, '🪩 WRECKED!', '#e6f0ff');
    }
  }

  /** A click that lands on the glass sends it across the room. */
  private strikeBall(aimX: number, aimY: number): void {
    const b = this.ball;
    if (!b || b.leaving || b.rope < 24) return;
    if (Phaser.Math.Distance.Between(aimX, aimY, b.x, b.y) > BALL_RADIUS + 16) return;

    const { player } = this.arena;
    const push = b.x >= player.x ? 1 : -1;
    b.angVel = Phaser.Math.Clamp(b.angVel + push * BALL_PUSH, -BALL_SPIN_MAX, BALL_SPIN_MAX);
    // A fresh shove is a fresh pass, so everyone is allowed to be hit by it again.
    b.hitAt.clear();
    this.pfx.sparkle(b.x, b.y, 14, 46, 11, SOUND.glint);
    this.pfx.notes(b.x, b.y, 5, { speed: 170, color: SOUND.white, depth: 11 });
    this.arena.showFloatingText(b.x, b.y - BALL_RADIUS - 12, '🪩 SWING!', '#ffffff');
  }

  // ── Shockwaves ────────────────────────────────────────────────────────

  private fireWave(
    owner: 'player' | 'npc', x: number, y: number, ang: number, damage: number,
    o: { color: number; range: number; speed: number; spread: number; thick: number },
  ): void {
    this.waves.push({
      owner, x, y, ang, travelled: 0, damage,
      range: o.range, speed: o.speed, spread: o.spread, thick: o.thick, color: o.color,
      hit: new Set<Fighter>(),
    });
  }

  private updateWaves(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const s = this.waves[i];
      s.travelled += s.speed * dt;

      const targets = s.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0 || s.hit.has(t)) continue;
        const d = Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y);
        if (Math.abs(d - s.travelled) > s.thick) continue;
        const off = Phaser.Math.Angle.Wrap(Math.atan2(t.y - s.y, t.x - s.x) - s.ang);
        if (Math.abs(off) > s.spread) continue;
        s.hit.add(t);
        const hx = t.x, hy = t.y;
        t.takeDamage(s.damage);
        this.fx(s.owner).boom(hx, hy, 40, { color: s.color, mark: false, notes: 2, duration: 320 });
      }

      if (s.travelled >= s.range) this.waves.splice(i, 1);
    }
  }

  private paintWaves(g: Phaser.GameObjects.Graphics): void {
    for (const s of this.waves) {
      const life = 1 - s.travelled / s.range;
      SoundFx.drawShockwave(g, this.col(s.owner), s.x, s.y, s.ang, s.travelled,
        s.spread, s.thick, this.vizT, s.color, Math.max(0, Math.min(1, life * 1.6)));
    }
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    this.vizT += delta / 1000;
    if (this.bowT < 1) this.bowT = Math.min(1, this.bowT + delta / 260);
    if (this.harmonyFlash > 0) this.harmonyFlash = Math.max(0, this.harmonyFlash - delta / 420);

    // Waves, boxes and charges carry an owner, so they tick whichever side is playing Sound.
    this.updateWaves(delta);
    this.updateBoomboxes(time, delta);
    this.updateBassCharges(time);
    // Both of these outlive whoever started them, so they tick outside the per-side blocks.
    this.updatePartyGift(time, delta);
    this.updateBall(time, delta);
    if (isPlayerSound) this.updatePlayer(time, delta);
    if (isNpcSound) this.updateNpc(time, delta);
    this.paintWorld(time);
    this.updateAvatars(time, delta, isPlayerSound, isNpcSound);
    if (isPlayerSound) {
      this.paintHud(time);
      this.pushStatuses(time);
    }
  }

  private updatePlayer(time: number, delta: number): void {
    const { player } = this.arena;

    // ── The loaded record ───────────────────────────────────────────
    const mode = this.disc();
    if (mode === 'accelerando') player.reduceCooldowns(delta * ACCEL_CD_RATE);
    if (mode === 'calm') {
      this.calmAccum += delta;
      while (this.calmAccum >= 1000 / CALM_HEAL_PER_SEC) {
        this.calmAccum -= 1000 / CALM_HEAL_PER_SEC;
        if (player.hp > 0 && player.hp < player.maxHp) player.heal(1);
      }
    } else {
      this.calmAccum = 0;
    }
    // Bass is a standing multiplier, so it is pushed once and divided back out on a swap. The
    // red record's bank rides the same factor rather than a second one, so the two can never
    // leave a stray multiplier behind between them.
    const wantDmg = (mode === 'bass' ? BASS_DAMAGE_MULT : 1) * (1 + this.bank.dmg);
    if (wantDmg !== this.discDmgApplied) {
      player.outgoingDamageMult = player.outgoingDamageMult / this.discDmgApplied * wantDmg;
      this.discDmgApplied = wantDmg;
    }

    // ── The blue record's armour, rewritten from scratch every frame ──
    if (this.bank.res > 0) {
      player.soundIncomingMult = Math.max(BANK_RES_FLOOR, 1 - this.bank.res);
      this.resOwned = true;
    } else if (this.resOwned) {
      player.soundIncomingMult = 1;
      this.resOwned = false;
    }

    // ── Attack speed: the tempo you have played for, the boombox's bank, and the held notes ──
    const atk = (this.tempo + this.boomAtk + this.bank.atk)
      * this.boostMult('player') * this.potency('player');
    if (atk > 0) player.reduceCooldowns(delta * atk);

    // Harmony (perk) drives attack speed the same way it drives movement.
    if (time < this.harmonyUntil) {
      player.reduceCooldowns(delta * HARMONY_BONUS_PER_STACK * this.harmonyStacks);
    } else if (this.harmonyStacks > 0) {
      this.harmonyStacks = 0;
    }

    if (this.perfMode) this.updatePerformance(time, delta);
    this.updateResonator(time);
  }

  private updateNpc(time: number, delta: number): void {
    const { player, npc } = this.arena;
    const atk = (this.npcTempo + this.npcBoomAtk) * this.boostMult('npc') * this.potency('npc');
    if (atk > 0) npc.reduceCooldowns(delta * atk);

    // Online: a remote soloist's bar never reaches this sim, so their performance is replayed
    // as walls arriving on the beat instead.
    if (time < this.npcSoloUntil && time >= this.npcSoloNextAt) {
      this.npcSoloNextAt = time + 900;
      const reach = Math.hypot(this.arena.width, this.arena.height);
      this.nfx.musicWall(npc.x, npc.y, reach, SOUND.flow);
      if (player.active && player.hp > 0) {
        player.takeDamage(Math.round(SOLO_NOTE_DMG * this.damageMult('npc')));
        this.nfx.ripple(player.x, player.y, 8, 40, SOUND.flow, 320, 3, 8, 8);
      }
    }
  }

  /**
   * Every per-frame painter in one pass: the boomboxes and bass charges on the floor, the
   * shockwaves and the resonator in the air, and the stage under the performer.
   */
  private paintWorld(time: number): void {
    const anyGround = this.boomboxes.length > 0 || this.bassCharges.length > 0;
    const anyAir = this.waves.length > 0 || this.harmonyGrenade !== null || this.ball !== null;

    // ── PARTY MODE's deck, under everything ──
    if (this.partyUntil > time) {
      const g = this.party();
      g.clear();
      SoundFx.drawDanceFloor(g, this.pcol, this.arena.width, this.arena.height, this.vizT,
        Phaser.Math.Clamp((this.partyUntil - time) / 900, 0, 1));
    } else if (this.partyGfx?.active) {
      this.partyGfx.clear();
    }

    if (anyGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      for (const b of this.boomboxes) {
        const span = b.nextPulseAt - b.lastPulseAt;
        const charge = span > 0 ? Phaser.Math.Clamp(1 - (b.nextPulseAt - time) / span, 0, 1) : 0;
        // The box fades out over its last second rather than blinking away.
        const left = Phaser.Math.Clamp((b.expiresAt - time) / 900, 0, 1);
        SoundFx.drawBoomboxField(g, this.col(b.owner), b.x, b.y, b.radius, this.vizT, b.golden, left, charge);
        SoundFx.drawBoombox(g, this.col(b.owner), b.x, b.y, this.vizT, b.golden, left, charge);
      }
      for (const c of this.bassCharges) {
        const total = c.explodeAt - c.armedAt;
        const fuse = total > 0 ? Phaser.Math.Clamp((c.explodeAt - time) / total, 0, 1) : 0;
        SoundFx.drawBassCharge(g, this.col(c.owner), c.x, c.y, this.vizT, fuse);
      }
    }

    if (anyAir || this.airGfx) {
      const g = this.air();
      g.clear();
      this.paintWaves(g);
      if (this.harmonyGrenade) {
        const fuse = this.harmonyExplodeAt > 0
          ? 1 - Phaser.Math.Clamp(
            (this.harmonyExplodeAt - time) / Math.max(1, this.harmonyExplodeAt - this.harmonyArmedAt), 0, 1)
          : 0;
        SoundFx.drawGrenade(g, this.pcol, this.harmonyGrenade.x, this.harmonyGrenade.y, this.vizT, fuse);
      }
      if (this.ball) {
        const b = this.ball;
        SoundFx.drawDiscoBall(g, this.pcol, b.anchorX, b.anchorY, b.x, b.y,
          BALL_RADIUS * Phaser.Math.Clamp(b.rope / 60, 0.25, 1), this.vizT, b.ang,
          Phaser.Math.Clamp(b.rope / 40, 0, 1));
      }
    }

    if (this.perfMode) {
      const g = this.stage();
      g.clear();
      SoundFx.drawStage(g, this.pcol, this.perfStageX, this.perfStageY, 160, this.vizT);
    } else if (this.stageGfx?.active) {
      this.stageGfx.clear();
    }
  }

  // ── The rigs ──────────────────────────────────────────────────────────

  private updateAvatars(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    const { scene, player, npc } = this.arena;

    if (isPlayerSound && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new SoundAvatar(scene, this.pcol, 'player');
      const av = this.playerAvatar;
      const aim = Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x);
      const instrument = this.playerInstrument(time);
      av.setFacing(aim);
      av.setIntensity(this.perfMode ? 1.45 : this.discSpeedStacks > 0 && time < this.discSpeedUntil ? 1.15 : 1);
      av.setMastered(this.arena.masteryActive);
      av.setInstrument(instrument);
      av.setBowDraw(this.bowT < 1 ? this.bowT : (Math.sin(this.vizT * 1.6) + 1) / 2);
      av.setDiscColor(DISC_COLORS[this.disc()]);
      // Both hands are on the instrument unless it is a record being flung.
      av.setHold(instrument === 'record' ? 'spray' : 'brace', aim);
      const alpha = player.forceInvisible ? 0 : player.alpha;
      av.update(delta, player.x, player.y, alpha);

      this.discAura = this.syncAura(this.discAura, true, 'disc', 22, 2, alpha, delta, player);
      this.discAura?.setColor(DISC_COLORS[this.disc()]);
      this.bugleAura = this.syncAura(this.bugleAura, this.tempo > 0.001, 'bugle', 24, 3, alpha, delta, player);
      this.bugleAura?.setIntensity(Phaser.Math.Clamp(this.tempo / 0.3, 0, 1.5));
      this.soloAura = this.syncAura(this.soloAura, this.perfMode !== null, 'solo', 26, 3, alpha, delta, player);
      this.codaAura = this.syncAura(this.codaAura, this.codaLevel > 1, 'coda', 30, 2, alpha, delta, player);
      this.codaAura?.setIntensity(this.codaLevel - 1);
      this.harmonyAura = this.syncAura(
        this.harmonyAura, time < this.harmonyUntil, 'harmony', 30, 4, alpha, delta, player);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcSound && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new SoundAvatar(scene, this.ncol, 'npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.setInstrument(this.npcInstrument(time));
      this.npcAvatar.setBowDraw((Math.sin(this.vizT * 1.6) + 1) / 2);
      this.npcAvatar.setDiscColor(DISC_COLORS[this.npcDisc()]);
      this.npcAvatar.setHold('brace', Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Build-or-tear-down for one stance aura, so each of the five is a single line above. */
  private syncAura(
    aura: SoundAura | null, want: boolean,
    style: 'disc' | 'bugle' | 'solo' | 'coda' | 'harmony', radius: number, depth: number,
    alpha: number, delta: number, on: Fighter,
  ): SoundAura | null {
    if (!want) {
      aura?.destroy();
      return null;
    }
    const a = aura ?? new SoundAura(this.arena.scene, this.pcol, style, radius, depth);
    a.update(delta, on.x, on.y, alpha);
    return a;
  }

  /** What the soloist is holding: the horn while blowing it, the record mid-throw, else Coda's. */
  private playerInstrument(time: number): SoundInstrument {
    if (this.perfMode === 'bugle' || time < this.bugleHoldUntil) return 'bugle';
    if (time < this.discHoldUntil) return 'record';
    return this.codaLevel >= 3 ? 'electric' : this.codaLevel >= 2 ? 'guitar' : 'violin';
  }

  private npcInstrument(time: number): SoundInstrument {
    if (time < this.npcBugleHoldUntil) return 'bugle';
    return this.npcCodaLevel >= 3 ? 'electric' : this.npcCodaLevel >= 2 ? 'guitar' : 'violin';
  }

  // ── HUD ───────────────────────────────────────────────────────────────

  /** Centre line of the metronome strip / the performance bar — clear of the ability bar. */
  private trackY(): number { return this.arena.height - 93; }

  private paintHud(time: number): void {
    const { scene } = this.arena;
    const W = this.arena.width;
    const cx = W / 2;
    const y = this.trackY();
    const g = this.hud();
    g.clear();

    if (!this.discLabel) {
      this.discLabel = scene.add.text(cx + 58, y - 22, '', {
        fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      }).setOrigin(0.5).setDepth(23);
    }
    if (!this.buffLabel) {
      this.buffLabel = scene.add.text(cx - 104, y - 22, '', {
        fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffe9a8',
      }).setOrigin(0.5).setDepth(23);
    }
    if (!this.perfLabel) {
      this.perfLabel = scene.add.text(W - 8, y, '', {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffdd44',
      }).setOrigin(1, 0.5).setDepth(23);
    }
    if (!this.hypeLabel) {
      this.hypeLabel = scene.add.text(cx - 122, y + 27, '', {
        fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ff88cc',
      }).setOrigin(0, 0.5).setDepth(23);
    }
    if (!this.bankLabel) {
      this.bankLabel = scene.add.text(cx, y + 41, '', {
        fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffcdee',
      }).setOrigin(0.5).setDepth(23);
    }
    this.bankLabel.setText(this.bankText());

    if (this.perfMode) {
      this.paintPerfBar(g, y);
      this.discLabel.setVisible(false);
      this.buffLabel.setVisible(false);
      this.hypeLabel.setVisible(false);
      this.perfLabel.setVisible(true).setText(
        this.perfMode === 'solo'
          ? `🎸 SOLO  ×${this.perfStreak}`
          : `🎺 ${Math.round(this.tempo * 100)}%  ×${this.perfStreak}${this.perfSlips > 0 ? '  ♥' : ''}`);
      return;
    }
    this.perfLabel.setVisible(false);
    this.discLabel.setVisible(true);
    this.buffLabel.setVisible(true);
    this.hypeLabel.setVisible(true);

    // ── The plate ───────────────────────────────────────────────────
    g.fillStyle(this.pcol(SOUND.shade), 0.9);
    g.fillRoundedRect(cx - 125, y - 16, 250, 32, 6);
    g.lineStyle(1, this.pcol(SOUND.plum), 0.95);
    g.strokeRoundedRect(cx - 125, y - 16, 250, 32, 6);

    // ── The metronome ───────────────────────────────────────────────
    // The rod swings left to right across the two seconds and is at the far right exactly on
    // the beat; the bar under it runs a little further, to the end of the forgiving window.
    const since = this.metroAt > 0 ? time - this.metroAt : Infinity;
    const live = since <= BEAT_MS + METRO_TAIL;
    const span = BEAT_MS + HARMONY_WINDOW;
    const p = live ? Phaser.Math.Clamp(since / span, 0, 1) : 0;
    const swing = live
      ? -1 + 2 * Phaser.Math.Clamp(since / BEAT_MS, 0, 1)
      : Math.sin(this.vizT * 2.2) * 0.35;
    const inWindow = live && Math.abs(since - BEAT_MS) <= HARMONY_WINDOW;
    SoundFx.drawMetronome(g, this.pcol, cx - 104, y, 0.9, swing,
      Math.max(this.harmonyFlash, inWindow ? 0.7 : 0));

    // ── The beat bar: the window you are aiming at is drawn on it ────
    const barX = cx - 84;
    const barW = 122;
    g.fillStyle(this.pcol(SOUND.night), 0.95);
    g.fillRoundedRect(barX, y - 5, barW, 10, 3);
    // The window, as a gold band running to the far end of the bar.
    const winFrom = barX + barW * ((BEAT_MS - HARMONY_WINDOW) / span);
    g.fillStyle(this.pcol(SOUND.gold), inWindow ? 0.75 : 0.32);
    g.fillRoundedRect(winFrom, y - 5, barX + barW - winFrom, 10, 3);
    if (live) {
      g.fillStyle(this.pcol(inWindow ? SOUND.gold : SOUND.magenta), 0.95);
      g.fillRoundedRect(barX, y - 5, Math.max(1, barW * p), 10, 3);
      // The playhead itself.
      const hx = barX + barW * p;
      g.fillStyle(this.pcol(SOUND.white), 1);
      g.fillRect(hx - 1, y - 8, 2, 16);
    }
    g.lineStyle(1, this.pcol(SOUND.plum), 0.9);
    g.strokeRoundedRect(barX, y - 5, barW, 10, 3);

    // ── The record on the deck ──────────────────────────────────────
    const mode = this.disc();
    SoundFx.drawRecord(g, this.pcol, cx + 58, y, 13, this.vizT * 3.4, DISC_COLORS[mode]);
    this.discLabel.setText(DISC_NAMES[mode]).setColor(`#${DISC_COLORS[mode].toString(16).padStart(6, '0')}`);

    // ── The two banked pools ────────────────────────────────────────
    const tempoPct = Math.round(this.tempo * 100);
    const boomPct = Math.round(this.boomAtk * 100);
    const parts: string[] = [];
    if (tempoPct > 0) parts.push(`🎺+${tempoPct}%`);
    if (boomPct > 0) parts.push(`📻+${boomPct}%`);
    this.buffLabel.setText(parts.join(' '));
    if (tempoPct + boomPct > 0) {
      g.fillStyle(this.pcol(SOUND.brass), 0.9);
      g.fillRect(cx - 118, y + 10, Math.min(28, (tempoPct + boomPct) * 0.5), 3);
    }

    // ── The live boombox, as a countdown pip at the right of the plate ──
    const box = this.boxOf('player');
    if (box) {
      const left = Phaser.Math.Clamp((box.expiresAt - time) / BOOMBOX_MS, 0, 1);
      const bx = cx + 100;
      g.fillStyle(this.pcol(box.golden ? SOUND.gold : SOUND.magenta), 0.25);
      g.fillCircle(bx, y, 10);
      g.lineStyle(2.4, this.pcol(box.golden ? SOUND.gold : SOUND.magenta), 0.95);
      g.beginPath();
      g.arc(bx, y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false);
      g.strokePath();
      // A speaker cone in the middle, pumping on the box's own beat.
      g.fillStyle(this.pcol(SOUND.cone), 1);
      g.fillCircle(bx, y, 5 + Math.sin(this.vizT * 7) * 0.6);
      g.fillStyle(this.pcol(box.golden ? SOUND.gold : SOUND.magenta), 1);
      g.fillCircle(bx, y, 2.2);
    }

    // ── The streak, as a run of pips along the top of the plate ─────
    const streak = this.streak();
    if (streak > 0) {
      g.fillStyle(this.pcol(SOUND.gold), 0.9);
      for (let i = 0; i < Math.min(20, streak); i++) g.fillRect(cx - 118 + i * 5, y - 13, 3, 3);
    }

    // ── Coda: the level ladder, as a strip under the plate ──────────
    const maxed = this.codaLevel >= CODA_MAX_LEVEL;
    const frac = maxed ? 1 : Phaser.Math.Clamp(this.hype / CODA_PER_LEVEL, 0, 1);
    g.fillStyle(this.pcol(SOUND.night), 0.9);
    g.fillRoundedRect(cx - 125, y + 21, 250, 12, 4);
    g.fillStyle(this.pcol(maxed ? SOUND.neon : SOUND.magenta), 0.95);
    if (frac > 0) g.fillRoundedRect(cx - 125, y + 21, Math.max(4, 250 * frac), 12, 4);
    g.lineStyle(1, this.pcol(maxed ? SOUND.neon : SOUND.plum), 0.95);
    g.strokeRoundedRect(cx - 125, y + 21, 250, 12, 4);
    // The two rungs, marked on the strip so the ladder is legible before it is climbed.
    if (!maxed) {
      g.fillStyle(this.pcol(SOUND.white), 0.5);
      g.fillRect(cx + 123, y + 21, 2, 12);
    }
    this.hypeLabel.setText(maxed
      ? `⚡ LV3 · SOLO READY · ${this.hype} HYPE`
      : `${this.codaLevel >= 2 ? '🎸' : '🎻'} LV${this.codaLevel} · ${this.hype}/${CODA_PER_LEVEL} HYPE`)
      .setColor(maxed ? '#ff44bb' : '#ff88cc');

    // ── Raise the Roof: the rope paying out, drawn over the ladder ───
    if (this.partyHoldStart > 0) {
      const wind = Phaser.Math.Clamp((time - this.partyHoldStart) / PARTY_HOLD_MS, 0, 1);
      g.fillStyle(this.pcol(SOUND.glint), 0.95);
      g.fillRoundedRect(cx - 125, y + 36, Math.max(3, 250 * wind), 4, 2);
    } else if (time < this.partyUntil) {
      const left = (this.partyUntil - time) / PARTY_MS;
      g.fillStyle(this.pcol(SOUND.mirrorLit), 0.9);
      g.fillRoundedRect(cx - 125, y + 36, Math.max(3, 250 * left), 4, 2);
    }
  }

  /** The upgrade banks, in one line under the ladder. Empty pools are simply not shown. */
  private bankText(): string {
    const parts: string[] = [];
    const streak = this.streak();
    if (this.partyUntil > this.arena.scene.time.now) parts.push('🪩 PARTY MODE');
    if (streak > 0) parts.push(`🎼 ×${streak} · +${streak}% SIZE`);
    if (this.bank.move > 0) parts.push(`💚+${Math.round(this.bank.move * 100)}%`);
    if (this.bank.atk > 0) parts.push(`🎵+${Math.round(this.bank.atk * 100)}%`);
    if (this.bank.dmg > 0) parts.push(`🔴+${Math.round(this.bank.dmg * 100)}%`);
    if (this.bank.res > 0) parts.push(`🔵+${Math.round(this.bank.res * 100)}%`);
    return parts.join('  ');
  }

  /**
   * Every percentage this element is currently handing the player, published to the top-right
   * effect tray. The plate above the ability bar carries the same numbers, but it is Sound's own
   * furniture — these boxes are where the rest of the game expects to read a buff, and where
   * hovering one explains what earned it.
   *
   * Percentages are shown *as they land*: the tempo bank is scaled by Coda's level and by a
   * golden boombox exactly the way `updatePlayer` spends it, so the box and the stat agree.
   */
  private pushStatuses(time: number): void {
    const pct = (v: number) => Math.round(v * 100);
    // What every banked percentage is really worth right now.
    const scale = this.boostMult('player') * this.potency('player');

    // ── The record on the deck ────────────────────────────────────────
    const mode = this.disc();
    this.arena.setStatusIndicator('sound-disc', {
      name: `${DISC_NAMES[mode]} Record`,
      emoji: mode === 'accelerando' ? '💚' : mode === 'bass' ? '🔴' : '🔵',
      color: this.pcol(DISC_COLORS[mode]), priority: 124,
      description: mode === 'accelerando'
        ? `Green is spinning: +${pct(ACCEL_SPEED_BONUS)}% move speed, and your cooldowns run `
          + `${pct(ACCEL_CD_RATE)}% of real time faster. Harmonize E to change the record.`
        : mode === 'bass'
          ? `Red is spinning: everything you deal is worth ×${BASS_DAMAGE_MULT}. `
            + 'Harmonize E to change the record.'
          : `Blue is spinning: ${CALM_HEAL_PER_SEC} HP a second, for as long as it is on the deck. `
            + 'Harmonize E to change the record.',
    });

    // ── The two pools that never decay ────────────────────────────────
    const tempo = pct(this.tempo * scale);
    this.arena.setStatusIndicator('sound-tempo', tempo > 0 ? {
      name: 'Tempo', emoji: '🎺', color: this.pcol(SOUND.brass), priority: 126,
      description: `+${tempo}% move speed *and* +${tempo}% attack speed. Every note landed on the `
        + 'bugle bar is worth another percent, and nothing takes it back except burning it for hype.',
      count: tempo, suffix: '%',
    } : null);

    const amped = pct(this.boomAtk * scale);
    this.arena.setStatusIndicator('sound-amp', amped > 0 ? {
      name: 'Amplified', emoji: '📻', color: this.pcol(SOUND.magenta), priority: 125,
      description: `+${amped}% attack speed, banked a percent a second for standing in your own `
        + 'boombox. It never decays.',
      count: amped, suffix: '%',
    } : null);

    // ── Standing in your own field ────────────────────────────────────
    const box = this.boxOf('player');
    const inBox = box !== null && this.standingInOwnBox('player');
    this.arena.setStatusIndicator('sound-field', inBox && box ? {
      name: box.golden ? 'Golden Field' : 'In the Field', emoji: '🔊',
      color: this.pcol(box.golden ? SOUND.gold : SOUND.magenta), priority: 127,
      description: `+${pct(BOOMBOX_MOVE_BONUS)}% move speed while you stand in your own boombox`
        + (box.golden
          ? `, and every percentage this element hands you is worth ×${BOOMBOX_POTENCY} inside a `
            + 'harmonized one.'
          : '.'),
      until: box.expiresAt,
    } : null);

    // ── Disc Dice's timed stacks ──────────────────────────────────────
    const spun = time < this.discSpeedUntil ? this.discSpeedStacks : 0;
    this.arena.setStatusIndicator('sound-spun', spun > 0 ? {
      name: 'Spun Up', emoji: '💨', color: this.pcol(SOUND.mint), priority: 128,
      description: `+${pct(DISC_SPEED_PER_HIT * spun)}% move speed — ${pct(DISC_SPEED_PER_HIT)}% per `
        + `fighter the record cut, up to ${DISC_SPEED_MAX_STACKS} of them.`,
      until: this.discSpeedUntil, count: pct(DISC_SPEED_PER_HIT * spun), suffix: '%',
    } : null);

    // ── Coda's ladder ─────────────────────────────────────────────────
    this.arena.setStatusIndicator('sound-coda', this.codaLevel > 1 ? {
      name: this.codaLevel >= 3 ? 'Electric' : 'Guitar',
      emoji: this.codaLevel >= 3 ? '⚡' : '🎸',
      color: this.pcol(this.codaLevel >= 3 ? SOUND.neon : SOUND.magenta), priority: 129,
      description: `Coda level ${this.codaLevel}. Every percentage this element hands you is worth `
        + `×${CODA_BOOST_MULT[this.codaLevel]}, everything it hits with is worth `
        + `×${CODA_DAMAGE_MULT[this.codaLevel]}, and your dash is ${CODA_DASH_LEN_MULT}× as long.`,
      count: this.codaLevel,
    } : null);

    this.arena.setStatusIndicator('sound-riff', time < this.codaDashUntil ? {
      name: 'Riff Dash', emoji: '🎶', color: this.pcol(SOUND.magenta), priority: 121,
      description: `+${pct(CODA_DASH_SPEED_BONUS)}% move speed off the back of a dash.`,
      until: this.codaDashUntil,
    } : null);

    // ── Harmony (perk) ────────────────────────────────────────────────
    const harm = time < this.harmonyUntil ? this.harmonyStacks : 0;
    this.arena.setStatusIndicator('sound-harmony', harm > 0 ? {
      name: 'Harmony', emoji: '🔔', color: this.pcol(SOUND.glint), priority: 122,
      description: `+${pct(HARMONY_BONUS_PER_STACK * harm)}% move *and* attack speed — `
        + `${pct(HARMONY_BONUS_PER_STACK)}% a resonator stack, up to ${HARMONY_MAX_STACKS}.`,
      until: this.harmonyUntil, count: harm,
    } : null);

    // ── The upgrade banks ─────────────────────────────────────────────
    const bMove = pct(this.bank.move * scale);
    this.arena.setStatusIndicator('sound-bank-move', bMove > 0 ? {
      name: 'Banked Stride', emoji: '💚', color: this.pcol(SOUND.mint), priority: 118,
      description: `+${bMove}% move speed, cut out of everyone the green record has hit. `
        + 'Permanent for the match, and burned with everything else when Coda goes off.',
      count: bMove, suffix: '%',
    } : null);

    const bAtk = pct(this.bank.atk * scale);
    this.arena.setStatusIndicator('sound-bank-atk', bAtk > 0 ? {
      name: 'Banked Rhythm', emoji: '🎵', color: this.pcol(SOUND.brass), priority: 117,
      description: `+${bAtk}% attack speed, carried off the hold notes on the bugle bar. `
        + 'Permanent for the match, and burned with everything else when Coda goes off.',
      count: bAtk, suffix: '%',
    } : null);

    const bDmg = pct(this.bank.dmg);
    this.arena.setStatusIndicator('sound-bank-dmg', bDmg > 0 ? {
      name: 'Banked Weight', emoji: '🔴', color: this.pcol(SOUND.crimson), priority: 119,
      description: `Everything you deal is worth +${bDmg}%, cut out of everyone the red record `
        + 'has hit. Permanent for the match, and burned when Coda goes off.',
      count: bDmg, suffix: '%',
    } : null);

    // The armour is floored, so show what is actually being taken off rather than the raw bank.
    const bRes = pct(1 - Math.max(BANK_RES_FLOOR, 1 - this.bank.res));
    this.arena.setStatusIndicator('sound-bank-res', bRes > 0 ? {
      name: 'Banked Armour', emoji: '🔵', color: this.pcol(SOUND.flow), priority: 120,
      description: `Everything hitting you is dealing ${bRes}% less, cut out of everyone the blue `
        + `record has hit. It cannot pass ${pct(1 - BANK_RES_FLOOR)}%, and Coda burns it.`,
      count: bRes, suffix: '%',
    } : null);

    // ── Encore Streak ─────────────────────────────────────────────────
    const streak = this.streak();
    this.arena.setStatusIndicator('sound-streak', streak > 0 ? {
      name: 'Encore Streak', emoji: '🎼', color: this.pcol(SOUND.gold), priority: 123,
      description: `${streak} harmonized casts in a row: your shockwave is `
        + `+${pct(STREAK_SIZE_PER * streak)}% wider, and the run is worth ${streak} hype when Q `
        + 'burns it. One mistimed cast ends it.',
      count: streak,
    } : null);

    // ── PARTY MODE ────────────────────────────────────────────────────
    this.arena.setStatusIndicator('sound-party', time < this.partyUntil ? {
      name: 'PARTY MODE', emoji: '🪩', color: this.pcol(SOUND.mirrorLit), priority: 131,
      description: 'You played the room instead of yourself. Everything you had banked is on the '
        + 'enemy for the length of the party — and every point of hype it pays is worth double.',
      until: this.partyUntil,
    } : null);
  }

  private paintPerfBar(g: Phaser.GameObjects.Graphics, y: number): void {
    const W = this.arena.width;
    const solo = this.perfMode === 'solo';
    g.fillStyle(this.pcol(SOUND.shade), 0.92);
    g.fillRect(0, y - 15, W, 30);
    g.lineStyle(1, this.pcol(SOUND.plum), 1);
    g.strokeRect(0, y - 15, W, 30);
    // The hit line, ringing on its own.
    const pulse = 0.7 + 0.3 * Math.sin(this.vizT * 8);
    const col = solo ? SOUND.gold : SOUND.brass;
    g.lineStyle(3, this.pcol(col), pulse);
    g.strokeCircle(W / 2, y, 15);
    g.fillStyle(this.pcol(col), 0.2 * pulse);
    g.fillCircle(W / 2, y, 15);
  }

  // ── NPC casts (local AI and the online relay both land here) ──────────

  handleNpcCast(castId: string | null, time: number): void {
    const { npc, player } = this.arena;
    if (!castId) return;

    const gesture = CAST_GESTURES[castId];
    if (gesture) this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));
    const harmonized = this.beat('npc', time);
    const ang = Math.atan2(player.y - npc.y, player.x - npc.x);

    switch (castId) {
      case 'staccato': {
        const base = harmonized ? STACCATO_HARM_DMG : STACCATO_DMG;
        this.fireWave('npc', npc.x, npc.y, ang, Math.round(base * this.damageMult('npc')), {
          color: harmonized ? SOUND.gold : SOUND.flow,
          range: WAVE_RANGE, speed: WAVE_SPEED, spread: WAVE_SPREAD, thick: WAVE_THICK,
        });
        this.nfx.waveBurst(npc.x, npc.y, ang, 1, 9, harmonized ? SOUND.gold : SOUND.flow);
        break;
      }
      case 'disc-dice': {
        const color = DISC_COLORS[this.npcDisc()];
        this.nfx.discSlice(npc.x, npc.y, DISC_RADIUS, color);
        if (player.active && player.hp > 0
          && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= DISC_RADIUS) {
          player.takeDamage(Math.round(DISC_DMG * this.damageMult('npc')));
          this.nfx.waveBurst(player.x, player.y, ang, 0.9, 8, color);
        }
        if (harmonized) this.npcDiscIdx = (this.npcDiscIdx + 1) % DISC_ORDER.length;
        break;
      }
      case 'boombox':
        // Dropped on itself: the field is a self-buff first and a shove second.
        this.placeBoombox('npc', npc.x, npc.y, harmonized, time);
        break;
      case 'bugle':
        // No bar reaches this sim, so a blow is worth a flat block of what a run would pay.
        this.npcTempo += NPC_BUGLE_GAIN;
        this.npcBugleHoldUntil = time + BUGLE_HOLD_MS;
        this.blowBugle('npc', player.x, player.y);
        break;
      case 'coda': {
        if (this.npcCodaLevel >= CODA_MAX_LEVEL) {
          npc.scaleStampedCooldown('coda', SOLO_COOLDOWN_MULT);
          this.npcSoloUntil = time + 8000;
          this.npcSoloNextAt = time + 1200;
          this.nfx.ripple(npc.x, npc.y, 20, 190, SOUND.gold, 640, 6, 5, 9);
          this.arena.showFloatingText(npc.x, npc.y - 48, '🎸 SOLO!', '#ffdd44');
          break;
        }
        const gained = Math.round(this.npcTempo * 100 * 2 + this.npcBoomAtk * 100);
        this.npcTempo = 0;
        this.npcBoomAtk = 0;
        this.npcHype += gained;
        this.nfx.boom(npc.x, npc.y, 90, { color: SOUND.flow, petals: 9, notes: 7 });
        this.arena.showFloatingText(npc.x, npc.y - 46, `🔥 +${gained} HYPE`, '#66aaff');
        while (this.npcHype >= CODA_PER_LEVEL && this.npcCodaLevel < CODA_MAX_LEVEL) {
          this.npcHype -= CODA_PER_LEVEL;
          this.npcCodaLevel++;
          const heal = CODA_HEAL[this.npcCodaLevel];
          if (heal > 0) npc.heal(heal);
          this.nfx.boom(npc.x, npc.y, 150, { color: SOUND.flow, petals: 12, notes: 10 });
          this.arena.showFloatingText(npc.x, npc.y - 68,
            this.npcCodaLevel >= 3 ? '⚡ LEVEL 3!' : '🎸 LEVEL 2!', '#66aaff');
        }
        break;
      }
      default:
        break;
    }
  }

  // ── Bass (divine perk) ────────────────────────────────────────────────

  /**
   * Lay a row of water charges along the line from the caster through the cursor, centred on the
   * cursor. They go off from the near end outward, so the row reads as a wave rolling away from
   * you rather than as five simultaneous puffs.
   */
  private layBassRow(time: number, sx: number, sy: number, tx: number, ty: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const half = (BASS_CHARGE_COUNT - 1) / 2;

    for (let i = 0; i < BASS_CHARGE_COUNT; i++) {
      const off = (i - half) * BASS_CHARGE_SPACING;
      const cx = Phaser.Math.Clamp(tx + ux * off, 16, W - 16);
      const cy = Phaser.Math.Clamp(ty + uy * off, 16, H - 16);
      this.bassCharges.push({
        x: cx, y: cy, owner: 'player',
        armedAt: time,
        explodeAt: time + BASS_FUSE_MS + i * BASS_FUSE_STEP_MS,
      });
      this.pfx.ripple(cx, cy, 4, 20, SOUND.aqua, 260, 2.4, 8, 6);
    }
    this.arena.showFloatingText(sx, sy - 44, '🎵 BASS DROP', '#88ddff');
  }

  private updateBassCharges(time: number): void {
    for (let i = this.bassCharges.length - 1; i >= 0; i--) {
      const c = this.bassCharges[i];
      if (time < c.explodeAt) continue;
      this.bassCharges.splice(i, 1);

      const fx = this.fx(c.owner);
      fx.boom(c.x, c.y, BASS_CHARGE_RADIUS, { color: SOUND.aqua, petals: 7, notes: 3, duration: 380 });
      fx.ripple(c.x, c.y, 8, BASS_CHARGE_RADIUS, SOUND.foam, 340, 3.5, 7, 7);

      const targets = c.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > BASS_CHARGE_RADIUS) continue;
        t.takeDamage(BASS_CHARGE_DAMAGE, { source: c, sourceX: c.x, sourceY: c.y });
        fx.waveBurst(t.x, t.y, Math.atan2(t.y - c.y, t.x - c.x), 0.8, 7, SOUND.foam);
      }
    }
  }

  // ── Harmony (abstract-triple perk) ────────────────────────────────────

  /**
   * Harmony hangs off the passive rather than off any one ability: every cast you land on the
   * beat also lobs a brass resonator at the cursor. It has its own short cooldown, so playing a
   * whole bar on the beat does not bury the arena in grenades.
   */
  private throwResonator(time: number): void {
    if (!this.arena.hasPerk('player', 'harmony')) return;
    if (time < this.harmonyNextThrowAt || this.harmonyGrenade) return;
    this.harmonyNextThrowAt = time + HARMONY_COOLDOWN_MS;

    const { player, scene } = this.arena;
    const gx = this.lastAimX;
    const gy = this.lastAimY;
    const travel = Phaser.Math.Clamp(Phaser.Math.Distance.Between(player.x, player.y, gx, gy) / 1.2, 100, 400);

    const gren = { x: player.x, y: player.y };
    this.harmonyGrenade = gren;
    this.pfx.waveBurst(player.x, player.y, Math.atan2(gy - player.y, gx - player.x), 1, 9, SOUND.rose);
    this.arena.showFloatingText(player.x, player.y - 68, '🎶 RESONATOR', '#ff99ff');

    scene.tweens.add({
      targets: gren, x: gx, y: gy, duration: travel, ease: 'Linear',
      onComplete: () => {
        if (!player.active) { this.harmonyGrenade = null; return; }
        this.harmonyGrenadeX = gx;
        this.harmonyGrenadeY = gy;
        this.harmonyArmedAt = scene.time.now;
        this.harmonyExplodeAt = scene.time.now + HARMONY_FUSE_MS;
      },
    });
  }

  private updateResonator(time: number): void {
    if (this.harmonyExplodeAt === 0 || time < this.harmonyExplodeAt) return;
    this.harmonyExplodeAt = 0;
    const ex = this.harmonyGrenadeX, ey = this.harmonyGrenadeY;
    this.harmonyGrenade = null;

    const { player, scene } = this.arena;
    this.pfx.boom(ex, ey, HARMONY_RADIUS, { color: SOUND.rose, petals: 9, notes: 6 });
    scene.cameras.main.shake(160, 0.005);

    let hitAny = false;
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) > HARMONY_RADIUS) continue;
      t.takeDamage(HARMONY_DAMAGE);
      this.pfx.ripple(t.x, t.y, 6, 34, SOUND.rose, 300, 3, 8, 7);
      hitAny = true;
    }
    if (!hitAny) return;

    this.harmonyStacks = Math.min(HARMONY_MAX_STACKS, this.harmonyStacks + 1);
    this.harmonyUntil = time + HARMONY_BUFF_MS;
    this.pfx.sparkle(player.x, player.y, 9, 34, 10, SOUND.gold);
    this.arena.showFloatingText(ex, ey - 30, `🌟 HARMONY ×${this.harmonyStacks}`, '#ffeecc');
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * The boomboxes on the floor.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.boomboxes.length - 1; i >= 0; i--) {
      const b = this.boomboxes[i];
      if (b.owner === exceptOwner) continue;
      if (Phaser.Math.Distance.Between(x, y, b.x, b.y) > radius) continue;
      report?.(b.x, b.y);
      this.fx(b.owner).shatter(b.x, b.y, 24, 9, 9, b.golden ? SOUND.gold : SOUND.magenta);
      this.boomboxes.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
