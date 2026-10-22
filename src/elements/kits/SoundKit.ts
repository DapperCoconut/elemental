import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  SOUND, SONG_COLORS, SONG_NAMES, SONG_ORDER, SONG_PALE, SoulSong, SoundAvatar, SoundColorFn, SoundFx,
  musicNote, musicNoteLayered,
  PIANO, PIANO_SEMIS, pianoKeyAt, drawPiano, drawPianoAirborne, drawPianoTarget, drawAutotuneToggle,
} from './SoundVisuals';
import { CustomStatus } from './StatusHudKit';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { RockstarFx, drawGuitar, drawRockStage, drawGiantCymbal } from './skins/RockstarFx';
import { meterGain } from '../../combat/Meters';
import { Sfx } from '../../audio';
import { FONT_DISPLAY } from '../../ui/Theme';

type Owner = 'player' | 'npc';
/** The rig the kit drives: the drum major, or a skin's character with the same optional surface. */
type SoundRig = BaseAvatar & {
  setSong?(color: number, pale: number): void;
  setDance?(v: number): void;
  setInstrument?(i: 'none' | 'bugle'): void;
  drumHit?(big?: boolean): void;
};
const BOTH: Owner[] = ['player', 'npc'];

// ── SoundArenaApi ─────────────────────────────────────────────────────────

export interface SoundArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly width: number;
  readonly height: number;
  readonly isOnline: boolean;
  readonly isInvasion: boolean;
  /** The bot's difficulty rung, 1–5 — how often it keeps time on the metronome and the solo. */
  readonly npcLevel: number;
  readonly masteryActive: boolean;
  readonly npcMasteryActive: boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  /** That side's shop upgrade: the player's own loadout, the bot's or the peer's for the npc. */
  hasUpgrade(owner: Owner, slot: string): boolean;
  /** Whether that side is playing Sound right now (Quantum's active half included). */
  isSound(owner: Owner): boolean;
  /** Invasion: hidden or not-yet-arrived husks are not fair game. */
  isTargetable(f: Fighter): boolean;
  /** Publish (or with `null`, clear) one of this kit's buffs in the top-right effect tray. */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  soundColor(owner: Owner, base: number): number;
  /** The owner's equipped skin id, or null. */
  skinId(owner: Owner): string | null;
  /** Online: presses that are not cooldown casts travel as pseudo-cast ids. */
  broadcastMasteryCast(id: string): void;
  /** Which mastery enhancement each side dropped over an R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
  /** The player's HP bar (centre y and height) — Autotune's switch hangs just under it. */
  readonly hpBarY: number;
  readonly hpBarH: number;
}

// ── Passive: the metronome ────────────────────────────────────────────────

/** One sweep of the beat bar. Faster than the old two-second meter. */
const BEAT_MS = 1100;
/** The gold window at the end of each sweep — a third of the bar, far wider than it used to be. */
const WINDOW_MS = 380;
/** A click this soon after the note lands still counts for it. */
const GRACE_MS = 90;
const SPIN_PER_HIT = 0.13;
const SPIN_PER_FUMBLE = 0.08;
const SPIN_PER_DROPPED = 0.05;
/** Spin bleeds off on its own, a little every second. Staccato halves it. */
const SPIN_DECAY = 0.06;
/** How often the bot keeps time, by difficulty rung. */
const NPC_BEAT_CHANCE = [0.35, 0.5, 0.65, 0.78, 0.9];

// ── Click: the baton ──────────────────────────────────────────────────────

const BATON_RANGE = 170;
const BATON_SPEED = 280;
const BATON_SPEED_SPIN = 640;
const BATON_HIT_R = 24;
const BATON_REHIT_MS = 300;
const BATON_DMG = 3;
const BATON_DMG_SPIN = 9;
/** Radians a second, at a standstill and at full spin. */
const BATON_ROT = 3;
const BATON_ROT_SPIN = 25;
/** How often the player's baton position travels to the peer. */
const BATON_RELAY_MS = 180;

// ── E: Crescendo ──────────────────────────────────────────────────────────

const DANCE_MS = 2000;
const DANCE_SPEED_FROM = 1.2;
const DANCE_SPEED_TO = 2.4;
const DANCE_TRAIL_MS = 1300;
const DANCE_TRAIL_STEP = 10;
const WAVE_RADIUS = 180;
const WAVE_DMG = 30;

// ── R: Fermata ────────────────────────────────────────────────────────────

const FERMATA_DASH_MS = 170;
const SLAM_LEN = 130;
const SLAM_HALF_W = 40;
const SLAM_RADIUS = 46;
const SLAM_DMG = 20;
const TUNE_MS = 8000;
const DETONATE_DMG = 25;
const DETONATE_STUN_MS = 500;

// ── F: Hum — the soul songs ───────────────────────────────────────────────

const STACCATO_DMG = 1.2;
const STACCATO_BATON_SPEED = 1.3;
const STACCATO_DECAY = 0.5;
const MELODY_SPEED = 1.25;
/** 20% shorter cooldowns = recharging 25% faster. */
const MELODY_CD_RATE = 0.25;
const SMOOTH_RES = 0.8;
const SMOOTH_REGEN = 3;

// ── Q: Call of the Void ───────────────────────────────────────────────────

const SOLO_MAX_MS = 15000;
const SOLO_LEAD_IN = 1300;
const SOLO_NOTE_DMG = 15;
/** Scroll speed of the staff, px per ms. */
const SOLO_SCROLL = 0.32;
const SOLO_TOLERANCE = 125;
/** How long a slur may be played on the wrong line before it breaks — time to make the switch. */
const SLUR_LANE_GRACE = 160;
const NPC_SOLO_CHANCE = [0.45, 0.55, 0.68, 0.8, 0.9];

// ── Perks ─────────────────────────────────────────────────────────────────

const BASS_CHARGE_COUNT = 5;
const BASS_CHARGE_SPACING = 52;
const BASS_CHARGE_DAMAGE = 10;
const BASS_CHARGE_RADIUS = 48;
const BASS_FUSE_MS = 480;
const BASS_FUSE_STEP_MS = 80;

/** Harmony: every eighth beat in a row lobs a resonator at the baton. */
const HARMONY_EVERY = 8;
const HARMONY_COOLDOWN_MS = 3000;
const HARMONY_FUSE_MS = 900;
const HARMONY_RADIUS = 100;
const HARMONY_DAMAGE = 20;
const HARMONY_BONUS_PER_STACK = 0.15;
const HARMONY_MAX_STACKS = 4;
const HARMONY_BUFF_MS = 20000;

// ── Shop upgrades ─────────────────────────────────────────────────────────

// Click+ Musical Perfection
/** A sliver of richer gold in the middle of the beat window. */
const PERFECT_AT = BEAT_MS - WINDOW_MS / 2;
const PERFECT_MS = 70;
const SPIN_PER_PERFECT = 0.22;
/** Touching your own baton: a short burst of speed, once per touch. */
const SELF_TAP_R = 30;
const SELF_TAP_SPEED = 1.35;
const SELF_TAP_MS = 550;
const SELF_TAP_GAP_MS = 900;

// E+ Infectious Moves
const INFECT_DANCE_MS = 2000;

// R+ Harmony
/** How close the baton has to be for R to tune up instead of slamming. */
const TUNE_GRAB_R = 36;
const ECHO_ORBIT_R = 62;
const ECHO_ORBIT_SPEED = 4.2;
const ECHO_DMG = 6;
const ECHO_REHIT_MS = 450;
/** In Tune: the soul song plays half again as strong. */
const IN_TUNE_POWER = 1.5;
/** HP a second at the start, falling by this much every second — into self-damage past 6s. */
const IN_TUNE_REGEN = 12;
const IN_TUNE_REGEN_FALL = 2;
const IN_TUNE_MAX_MS = 14000;

// F+ Practice Makes Perfect
const PRACTICE_HITS_PER_LEVEL = 5;
const PRACTICE_MAX_LEVEL = 10;
const PRACTICE_POWER_PER_LEVEL = 0.08;

// Q+ Big Finish
/** Tempo gained a second while Space is held. It never comes back down. */
const FLAIR_RATE = 0.12;
const FLAIR_MAX_TEMPO = 2;
/** Gong damage at full flair (double tempo); scales linearly down to nothing at 1×. */
const GONG_DMG = 150;
const GONG_WINDUP_MS = 560;
const GONG_MS = 1600;
const DEAF_MS = 8000;

// ── Mastery ───────────────────────────────────────────────────────────────

const PIANO_ID = 'forte-piano';
/** From the crash, not the cast — the five seconds at the keys and the flight come first. */
const PIANO_COOLDOWN_MS = 12000;
const PIANO_PLAY_MS = 5000;
const PIANO_FLIGHT_MS = 2000;
/** The drop stops following the cursor this long before it lands — the dodge window. */
const PIANO_LOCK_MS = 450;
const PIANO_RADIUS = 90;
const PIANO_DMG_MIN = 20;
const PIANO_DMG_MAX = 110;
/** Charge from which the crash leaves everyone it crushes out of tune. */
const PIANO_TUNE_AT = 0.6;
const PIANO_DETONATE_DMG = 30;
/** Charge a perfectly melodious note is worth; a sour one takes a little back. */
const PIANO_CHARGE_PER_NOTE = 0.085;
const PIANO_SOUR_AT = 0.45;
const PIANO_SOUR_COST = 0.12;
/** Two keys this close together is mashing, not playing. */
const PIANO_MASH_MS = 110;
/** Ending on a C (either one) resolves the tune. */
const PIANO_CADENCE = 0.08;
/** How sweet each interval sounds, by scale steps apart (0 = the same key, 7 = the octave). */
const INTERVAL_SCORE = [0.35, 1, 0.95, 0.55, 0.85, 0.5, 0.3, 0.9];
/** The anchor is kept this far inside the field, so the keys and the lid stay on screen. */
const PIANO_EDGE_X = 124;
const PIANO_EDGE_TOP = 112;
const PIANO_EDGE_BOTTOM = 210;
/** Dissonance — out of tune from a Fermata and the piano at once: a bleed, ticked. */
const DISSONANCE_TICK_MS = 500;
const DISSONANCE_TICK_DMG = 3;
/** The bot plays: how steady its rhythm is and how often it picks a sweet interval, by rung. */
const NPC_PIANO_GAP_MS = 400;
const NPC_PIANO_SWEET = [0.4, 0.52, 0.64, 0.76, 0.88];
const NPC_PIANO_RANGE = 460;

// Autotune
const AUTOTUNE_LOW_HP = 0.35;
const AUTOTUNE_HIGH_HP = 0.6;
/** "Fighting distance": a little past the baton's reach. */
const AUTOTUNE_CLOSE = BATON_RANGE + 40;
const AUTOTUNE_CHECK_MS = 300;
/** Once it has switched, it holds the new song this long before it will switch again. */
const AUTOTUNE_HOLD_MS = 1200;
/** A song picked by hand with F is left alone this long. */
const AUTOTUNE_MANUAL_MS = 3000;
const TOGGLE_W = 124;
const TOGGLE_H = 16;

/**
 * The Autotune switch. Module-level so it survives `reset()`: flicked off once, it stays off for
 * the rest of the session rather than springing back on every match.
 */
let autotuneOn = true;

// ── Types ─────────────────────────────────────────────────────────────────

type NoteKind = 'quarter' | 'eighth' | 'sixteenth' | 'slur';

/** One note of the solo chart. `at` is ms from the start of the solo, when the head reaches the bar. */
interface SoloNote {
  at: number;
  lane: number;
  kind: NoteKind;
  /** Slurs: how long the click has to be held, and the line the tail moves to partway. */
  len: number;
  laneTo: number;
  switchAt: number;
  state: 'pending' | 'hit' | 'missed' | 'holding' | 'held' | 'broken';
  /** Slurs: when the hold was last on the wrong line (0 while it is on the right one). */
  wrongSince: number;
}

interface Solo {
  start: number;
  /** Chart time: ms of the chart played so far. Runs faster than the clock once Big Finish speeds it up. */
  el: number;
  /** Chart time at which the solo is over. */
  endEl: number;
  /** Big Finish: 1 → 2, raised by holding Space, never lowered. */
  tempo: number;
  /** The player is holding Space this frame. */
  speeding: boolean;
  x: number;
  y: number;
  notes: SoloNote[];
  lane: number;
  hits: number;
  combo: number;
  /** Absorber installed for the solo and the one it chained in front of. */
  absorber: ((amount: number) => boolean) | null;
  prevAbsorber: ((amount: number) => boolean) | null;
  /** Bot: each note's roll, made once. */
  rolled: Set<SoloNote>;
}

interface Dash {
  fromX: number; fromY: number; toX: number; toY: number;
  start: number; end: number;
  aimX: number; aimY: number;
}

interface Gong { x: number; y: number; dir: 1 | -1; start: number; struck: boolean; flair: number }

/** Sound Mastery — the grand piano: at the keys, then in the air. */
interface Piano {
  phase: 'play' | 'fly';
  /** Where the drum major sits — the piano is built round this. */
  x: number; y: number;
  /** When the current phase began (scene time). */
  start: number;
  charge: number;
  /** White keys played, as scale steps 0–7, and when. */
  notes: { deg: number; at: number }[];
  lastGap: number;
  /** 0–1 glow per key: the 8 white, then the 5 black. */
  flash: number[];
  /** The drop point, following the cursor until it locks. */
  tx: number; ty: number;
  locked: boolean;
  /** Bot: when it plays its next key. */
  npcNextAt: number;
  /** Online: the relay counter, so every key gets an id of its own past the cast dedupe. */
  seq: number;
}

interface BassCharge { x: number; y: number; owner: Owner; armedAt: number; explodeAt: number }

interface Side {
  song: SoulSong;
  // Metronome + baton
  metroStart: number;
  lastHitBeat: number;
  lastSeenBeat: number;
  spin: number;
  combo: number;
  bx: number; by: number; rot: number;
  aimX: number; aimY: number;
  batonHits: Map<Fighter, number>;
  batonPlaced: boolean;
  /** Bot: the beat it last decided about, and whether it is going to hit it. */
  npcBeat: number;
  npcBeatHit: boolean;
  npcBeatAt: number;
  // Crescendo
  danceStart: number;
  danceUntil: number;
  trail: { x: number; y: number; at: number }[];
  // Fermata
  dash: Dash | null;
  grabUntil: number;
  /** Everyone this side's slam put out of tune, and when that stack runs out (Date.now). */
  tuned: Map<Fighter, number>;
  // Songs
  regenAccum: number;
  resOwned: boolean;
  path: { x: number; y: number }[];
  walkAccum: number;
  // Solo
  solo: Solo | null;
  // Click+ Musical Perfection
  selfTouching: boolean;
  selfTapUntil: number;
  selfTapReadyAt: number;
  // R+ Harmony
  inTune: boolean;
  inTuneStart: number;
  /** Net HP the regeneration has given (negative once it has taken more back) — the recast's burst. */
  tuneNet: number;
  tuneAccum: number;
  echoAng: number;
  echoX: number; echoY: number;
  echoHits: Map<Fighter, number>;
  // F+ Practice Makes Perfect
  practice: Record<SoulSong, number>;
  /** A replica's level of the song it is playing, as relayed. */
  netLevel: number;
  sparkleAt: number;
  // Q+ Big Finish
  gong: Gong | null;
  deafUntil: number;
  // Mastery — Forte Piano
  piano: Piano | null;
  /** The last crash (scene time). Starts a cooldown in the past so it is ready. */
  pianoAt: number;
  /** Everyone the piano put out of tune, and when that stack runs out (Date.now). */
  pianoTuned: Map<Fighter, number>;
  /** Dissonance: each double-stacked victim's next bleed tick and when it started (scene time). */
  dissonance: Map<Fighter, { next: number; since: number }>;
  // Mastery — Autotune
  autotuneAt: number;
  autotuneHoldUntil: number;
  /** All three songs maxed has been counted toward the mastery this match. */
  songsMaxedSeen: boolean;
}

function freshSide(): Side {
  return {
    song: 'staccato',
    metroStart: 0, lastHitBeat: -1, lastSeenBeat: -1, spin: 0, combo: 0,
    bx: 0, by: 0, rot: 0, aimX: 0, aimY: 0, batonHits: new Map(), batonPlaced: false,
    npcBeat: -1, npcBeatHit: false, npcBeatAt: 0,
    danceStart: 0, danceUntil: 0, trail: [],
    dash: null, grabUntil: 0, tuned: new Map(),
    regenAccum: 0, resOwned: false, path: [], walkAccum: 0,
    solo: null,
    selfTouching: false, selfTapUntil: 0, selfTapReadyAt: 0,
    inTune: false, inTuneStart: 0, tuneNet: 0, tuneAccum: 0, echoAng: 0, echoX: 0, echoY: 0, echoHits: new Map(),
    practice: { staccato: 0, melody: 0, smooth: 0 }, netLevel: 0, sparkleAt: 0,
    gong: null, deafUntil: 0,
    piano: null, pianoAt: -PIANO_COOLDOWN_MS, pianoTuned: new Map(), dissonance: new Map(),
    autotuneAt: 0, autotuneHoldUntil: 0, songsMaxedSeen: false,
  };
}

const LANES = 3;

// ── SoundKit ──────────────────────────────────────────────────────────────

export class SoundKit {
  private readonly pcol: SoundColorFn;
  private readonly ncol: SoundColorFn;
  private readonly pfx: SoundFx;
  private readonly nfx: SoundFx;
  private playerAvatar: SoundRig | null = null;
  private npcAvatar: SoundRig | null = null;
  /** Rockstar skin one-shots, one per side (lazily built). */
  private rockFx: Partial<Record<Owner, RockstarFx>> = {};
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private stageGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private songLabel: Phaser.GameObjects.Text | null = null;
  private soloLabel: Phaser.GameObjects.Text | null = null;
  private practiceLabel: Phaser.GameObjects.Text | null = null;
  private autotuneLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: freshSide(), npc: freshSide() };
  private pointerWasDown = false;
  private laneUpWas = false;
  private laneDownWas = false;
  private lastBatonRelayAt = 0;
  /** 1 the instant a beat is hit (or fumbled), decaying — flashes the HUD window. */
  private beatFlash = 0;
  private fumbleFlash = 0;
  private perfectFlash = 0;
  private keySpace: Phaser.Input.Keyboard.Key | null = null;

  /** Every hard stun this kit has handed out, in scene time. */
  private stuns = new Map<Fighter, number>();
  /** Fighters whose latest misfire has already been called out. */
  private missSeen = new WeakMap<Fighter, number>();

  private bassCharges: BassCharge[] = [];
  private harmonyGrenade: { x: number; y: number } | null = null;
  private harmonyArmedAt = 0;
  private harmonyExplodeAt = 0;
  private harmonyNextThrowAt = 0;
  private harmonyStacks = 0;
  private harmonyUntil = 0;

  private keyW: Phaser.Input.Keyboard.Key | null = null;
  private keyS: Phaser.Input.Keyboard.Key | null = null;
  private keyUp: Phaser.Input.Keyboard.Key | null = null;
  private keyDown: Phaser.Input.Keyboard.Key | null = null;

  constructor(private arena: SoundArenaApi) {
    this.pcol = (base) => arena.soundColor('player', base);
    this.ncol = (base) => arena.soundColor('npc', base);
    this.pfx = new SoundFx(arena.scene, this.pcol);
    this.nfx = new SoundFx(arena.scene, this.ncol);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private get now(): number { return this.arena.scene.time.now; }
  private fx(owner: Owner): SoundFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): SoundColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.arena.player : this.arena.npc; }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  /** Online, the npc side is the peer: its effects on our player arrive by relay, not by replay. */
  private isReplica(owner: Owner): boolean { return owner === 'npc' && this.arena.isOnline; }

  private targets(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.arena.enemies : [this.arena.player];
    return list.filter((t) => this.alive(t) && this.arena.isTargetable(t));
  }

  /** A shop upgrade, only while that side is actually playing Sound. */
  private up(owner: Owner, slot: string): boolean {
    return this.arena.isSound(owner) && this.arena.hasUpgrade(owner, slot);
  }

  /** Practice Makes Perfect: a song's level, from the beats played while it was on. */
  private songLevel(owner: Owner, song: SoulSong = this.sides[owner].song): number {
    if (!this.up(owner, 'f')) return 0;
    const s = this.sides[owner];
    if (this.isReplica(owner)) return song === s.song ? s.netLevel : 0;
    return Math.min(PRACTICE_MAX_LEVEL, Math.floor(s.practice[song] / PRACTICE_HITS_PER_LEVEL));
  }

  /** How strongly the soul song plays: its practice level, and half again while In Tune. */
  private songPower(owner: Owner): number {
    const s = this.sides[owner];
    return (1 + PRACTICE_POWER_PER_LEVEL * this.songLevel(owner)) * (s.inTune ? IN_TUNE_POWER : 1);
  }

  private dmgMult(owner: Owner): number {
    return this.sides[owner].song === 'staccato' ? 1 + (STACCATO_DMG - 1) * this.songPower(owner) : 1;
  }

  /** Big Finish's price: for 8 seconds after the gong, nothing this side does deals damage. */
  private isDeaf(owner: Owner): boolean { return this.now < this.sides[owner].deafUntil; }

  /** The one place this kit deals damage. A replica never hurts our player — the relay does. */
  private strike(owner: Owner, t: Fighter, base: number, x: number, y: number): void {
    if (this.isReplica(owner) && t === this.arena.player) return;
    if (this.isDeaf(owner)) return;
    t.takeDamage(Math.round(base * this.dmgMult(owner)), { sourceX: x, sourceY: y });
  }

  private stun(owner: Owner, f: Fighter, ms: number): void {
    if (this.isReplica(owner) && f === this.arena.player) return;
    this.stuns.set(f, Math.max(this.stuns.get(f) ?? 0, this.now + ms));
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.arena.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private announce(x: number, y: number, text: string, color: number, size = 12): void {
    const { scene } = this.arena;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#0b0306', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1000, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) this.groundGfx = this.arena.scene.add.graphics().setDepth(3);
    return this.groundGfx;
  }
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) this.airGfx = this.arena.scene.add.graphics().setDepth(9);
    return this.airGfx;
  }
  private stage(): Phaser.GameObjects.Graphics {
    if (!this.stageGfx || !this.stageGfx.active) this.stageGfx = this.arena.scene.add.graphics().setDepth(4);
    return this.stageGfx;
  }
  /** Depth 20: under the labels (23), over the field. */
  private hud(): Phaser.GameObjects.Graphics {
    if (!this.hudGfx || !this.hudGfx.active) this.hudGfx = this.arena.scene.add.graphics().setDepth(20);
    return this.hudGfx;
  }

  // ── Public accessors ──────────────────────────────────────────────────

  /** True while the player is on the stage (or at the piano) and cannot move. */
  isPerforming(): boolean { return this.onStage('player'); }

  /** Rooted and busy with an instrument: the solo, or seated at the piano. */
  private onStage(owner: Owner): boolean {
    const s = this.sides[owner];
    return s.solo !== null || s.piano?.phase === 'play';
  }

  getPlayerSpeedMult(): number { return this.speedMult('player'); }

  /** The bot's own speed — pulled by ArenaScene. The peer's replica moves by the network. */
  getNpcSpeedMult(): number { return this.arena.isOnline ? 1 : this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    const s = this.sides[owner];
    const now = this.now;
    let m = 1;
    if (s.song === 'melody') m *= 1 + (MELODY_SPEED - 1) * this.songPower(owner);
    if (now < s.selfTapUntil) m *= SELF_TAP_SPEED;
    if (now < s.danceUntil) {
      const k = Phaser.Math.Clamp((now - s.danceStart) / DANCE_MS, 0, 1);
      m *= DANCE_SPEED_FROM + (DANCE_SPEED_TO - DANCE_SPEED_FROM) * k;
    }
    if (owner === 'player' && now < this.harmonyUntil) m *= 1 + HARMONY_BONUS_PER_STACK * this.harmonyStacks;
    return m;
  }

  // ── Reset ────────────────────────────────────────────────────────────

  reset(): void {
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.rockFx = {};
    for (const g of [this.groundGfx, this.airGfx, this.stageGfx, this.hudGfx]) g?.destroy();
    this.groundGfx = null; this.airGfx = null; this.stageGfx = null; this.hudGfx = null;
    for (const t of [this.hudLabel, this.songLabel, this.soloLabel, this.practiceLabel, this.autotuneLabel]) t?.destroy();
    this.hudLabel = null; this.songLabel = null; this.soloLabel = null; this.practiceLabel = null; this.autotuneLabel = null;
    this.vizT = 0;
    // The old fighters (and any absorber hung on them) died with the old match.
    this.sides = { player: freshSide(), npc: freshSide() };
    this.pointerWasDown = false;
    this.laneUpWas = false;
    this.laneDownWas = false;
    this.lastBatonRelayAt = 0;
    this.beatFlash = 0;
    this.fumbleFlash = 0;
    this.perfectFlash = 0;
    this.keySpace = null;
    this.stuns.clear();
    this.missSeen = new WeakMap();
    this.bassCharges = [];
    this.harmonyGrenade = null;
    this.harmonyArmedAt = 0;
    this.harmonyExplodeAt = 0;
    this.harmonyNextThrowAt = 0;
    this.harmonyStacks = 0;
    this.harmonyUntil = 0;
    this.keyW = null; this.keyS = null; this.keyUp = null; this.keyDown = null;
  }

  // ── Input ─────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const down = pointer.isDown;
    const justDown = down && !this.pointerWasDown;
    this.pointerWasDown = down;

    // Mastery: the Autotune switch under the HP bar eats the click that lands on it.
    if (justDown && this.masteryOn('player') && this.overAutotuneToggle(mouseX, mouseY)) {
      autotuneOn = !autotuneOn;
      Sfx.play(autotuneOn ? 'ui-toggle-on' : 'ui-toggle-off');
      if (autotuneOn) s.autotuneHoldUntil = 0;
      return;
    }
    // Mastery: whichever of R/F/Q Forte Piano was dropped on is the piano's key now.
    const bound = this.pianoSlot('player');
    const boundKey = bound === 'r' ? rKey : bound === 'f' ? fKey : bound === 'q' ? qKey : null;
    if (s.piano?.phase === 'play') {
      if (justDown) this.pianoClick('player', mouseX, mouseY);
      if (boundKey && Phaser.Input.Keyboard.JustDown(boundKey)) this.flingPiano('player');
      return;
    }

    if (s.solo) {
      this.soloInput(time, justDown, down);
      if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) this.endSolo('player', true, true);
      return;
    }
    if (s.dash) return;

    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);
    if (justDown) player.castAbility('baton', ctx());
    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('crescendo', ctx());
    if (boundKey && Phaser.Input.Keyboard.JustDown(boundKey)) {
      // The piano's recast pops its own Out of Tune first — free, and it outranks a fresh piano.
      if (this.tunedAlive('player', 'piano')) this.detonate('player', 'piano');
      else this.tryPiano('player');
    }
    if (bound !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      // Harmony's recast comes first — its timing is the whole game. Then the detonation, which is
      // free and outranks a fresh slam: anyone still out of tune gets it.
      if (s.inTune) this.releaseInTune('player');
      else if (this.tunedAlive('player')) this.detonate('player');
      else player.castAbility('fermata', ctx());
    }
    if (bound !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('hum', ctx());
    if (bound !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('call-of-the-void', ctx());
  }

  /** Every ability of the element lands here, from `ctx.soundCast`, for either side. */
  cast(owner: Owner, id: string, tx: number, ty: number): void {
    // A foreign caster (Subterfuge's stolen Q, a Dream boon) borrowing one of these ids must not
    // start a solo or a dance this kit is never going to tick for them.
    if (!this.arena.isSound(owner)) return;
    const s = this.sides[owner];
    switch (id) {
      case 'baton':
        s.aimX = tx; s.aimY = ty;
        if (!this.isReplica(owner)) this.judgeBeat(owner, this.now);
        break;
      case 'crescendo': this.startDance(owner); break;
      case 'fermata': {
        // With Harmony, the peer's press could have been either — it says which by pseudo-cast.
        if (this.isReplica(owner) && this.up(owner, 'r')) break;
        const tuneUp = this.up(owner, 'r') && this.batonOnTop(owner);
        if (tuneUp) this.startInTune(owner);
        else this.startFermata(owner, tx, ty);
        if (owner === 'player' && this.arena.isOnline && this.up('player', 'r')) {
          this.arena.broadcastMasteryCast(tuneUp ? 'sound-harmony' : 'sound-fermata');
        }
        break;
      }
      case 'hum': this.cycleSong(owner); break;
      case 'call-of-the-void': this.startSolo(owner); break;
      // The bot's free recast — not an ability, so it never goes through castAbility.
      case 'fermata-detonate': if (owner === 'npc') this.doNpcDetonate(); break;
      case PIANO_ID: if (owner === 'npc') this.tryPiano('npc'); break;
      case 'harmony-release': if (owner === 'npc' && !this.isReplica(owner)) this.releaseInTune('npc'); break;
    }
  }

  /** Online: the peer's presses that were not cooldown casts. */
  replayNet(id: string, tx: number, ty: number): void {
    const s = this.sides.npc;
    if (id.startsWith('sound-baton:')) {
      s.aimX = tx; s.aimY = ty;
      const [spin, lvl] = id.slice('sound-baton:'.length).split(':');
      s.spin = Phaser.Math.Clamp(Number(spin) / 100 || 0, 0, 1);
      s.netLevel = Phaser.Math.Clamp(Math.floor(Number(lvl) || 0), 0, PRACTICE_MAX_LEVEL);
    } else if (id === 'sound-detonate') {
      this.detonate('npc');
    } else if (id === 'sound-piano-detonate') {
      this.detonate('npc', 'piano');
    } else if (id.startsWith('sound-piano') || id.startsWith('sound-song:')) {
      this.replayMastery(id);
    } else if (id === 'sound-solo-end') {
      this.endSolo('npc', false);
    } else if (id === 'sound-fermata') {
      this.startFermata('npc', tx, ty);
    } else if (id === 'sound-harmony') {
      this.startInTune('npc');
    } else if (id.startsWith('sound-harmony-end:')) {
      this.endInTune('npc', Number(id.slice('sound-harmony-end:'.length)) || 0);
    } else if (id.startsWith('sound-gong:')) {
      this.startGong('npc', Phaser.Math.Clamp(Number(id.slice('sound-gong:'.length)) / 100 || 0, 0, 1));
    } else if (id.startsWith('sound-solo-hit')) {
      const big = id.endsWith(':big');
      const solo = s.solo;
      const { player } = this.arena;
      if (solo && this.alive(player)) {
        if (this.rock('npc')) {
          this.rfx('npc').crash(solo.x + 26, solo.y - 10, big);
          this.rfx('npc').boltShot(solo.x + 26, solo.y - 10, player.x, player.y, this.ncol(SOUND.gold), big);
          this.npcAvatar?.drumHit?.(big);
        } else this.nfx.noteShot(solo.x + 30, solo.y - 26, player.x, player.y, SOUND.gold, big);
      }
    }
  }

  // ── The metronome ─────────────────────────────────────────────────────

  private beatIndex(owner: Owner, time: number): { idx: number; phase: number } {
    const s = this.sides[owner];
    if (s.metroStart <= 0) s.metroStart = time;
    const el = time - s.metroStart;
    const idx = Math.floor(el / BEAT_MS);
    return { idx, phase: el - idx * BEAT_MS };
  }

  /**
   * A click, judged against the beat bar. Inside the gold window (or a hair after the note lands)
   * and not already played: a hit, and the baton spins faster. Anywhere else: a fumble.
   */
  private judgeBeat(owner: Owner, time: number): void {
    const s = this.sides[owner];
    const { idx, phase } = this.beatIndex(owner, time);
    let beat = -1;
    if (phase >= BEAT_MS - WINDOW_MS) beat = idx;
    else if (phase <= GRACE_MS) beat = idx - 1;
    if (beat >= 0 && beat !== s.lastHitBeat) {
      s.lastHitBeat = beat;
      // Musical Perfection: the richer sliver in the middle of the window spins it up harder.
      const perfect = beat === idx && this.up(owner, 'click') && Math.abs(phase - PERFECT_AT) <= PERFECT_MS / 2;
      s.spin = Math.min(1, s.spin + (perfect ? SPIN_PER_PERFECT : SPIN_PER_HIT));
      s.combo++;
      this.record(owner, 'metronomeHits');
      this.fx(owner).batonFlourish(s.bx, s.by - 10, perfect ? SOUND.goldRich : SONG_COLORS[s.song]);
      if (perfect) {
        this.fx(owner).sparkle(s.bx, s.by - 12, 6, 22, 11, SOUND.goldRichHi);
        this.announce(s.bx, s.by - 36, '✦ PERFECT', SOUND.goldRich, 10);
      }
      this.practise(owner);
      if (owner === 'player') {
        this.beatFlash = 1;
        if (perfect) this.perfectFlash = 1;
        if (s.combo > 0 && s.combo % HARMONY_EVERY === 0) this.throwResonator(time);
      }
      return;
    }
    if (beat >= 0) return; // A second click on a beat already played is ignored.
    s.spin = Math.max(0, s.spin - SPIN_PER_FUMBLE);
    s.combo = 0;
    this.fx(owner).batonFumble(s.bx, s.by - 10);
    if (owner === 'player') this.fumbleFlash = 1;
  }

  /** A beat that went past with nobody playing it costs a little spin and the combo. */
  private tickMetronome(owner: Owner, time: number, delta: number): void {
    const s = this.sides[owner];
    const { idx, phase } = this.beatIndex(owner, time);
    if (idx !== s.lastSeenBeat && phase > GRACE_MS) {
      const prev = idx - 1;
      if (prev >= 0 && s.lastHitBeat !== prev && s.lastSeenBeat >= 0) {
        s.spin = Math.max(0, s.spin - SPIN_PER_DROPPED);
        s.combo = 0;
      }
      s.lastSeenBeat = idx;
    }
    const decay = SPIN_DECAY * (s.song === 'staccato' ? Math.max(0.1, 1 - (1 - STACCATO_DECAY) * this.songPower(owner)) : 1);
    s.spin = Math.max(0, s.spin - decay * delta / 1000);
  }

  /**
   * The bot keeps time kit-side: once per beat it decides — by difficulty — whether it is going to
   * play this one, then plays it a little inside the window, like a person would.
   */
  private botMetronome(time: number): void {
    const s = this.sides.npc;
    const { idx } = this.beatIndex('npc', time);
    if (idx !== s.npcBeat) {
      s.npcBeat = idx;
      const lvl = Phaser.Math.Clamp(this.arena.npcLevel, 1, 5);
      s.npcBeatHit = Math.random() < NPC_BEAT_CHANCE[lvl - 1];
      // Where in the sweep it clicks: in the window when it means to, early when it fumbles. With
      // Musical Perfection it aims for the sliver in the middle, tighter the sharper it is.
      const inWin = this.up('npc', 'click')
        ? 0.5 + (Math.random() - 0.5) * (0.7 - 0.1 * lvl)
        : 0.25 + Math.random() * 0.6;
      s.npcBeatAt = s.metroStart + idx * BEAT_MS
        + (s.npcBeatHit ? BEAT_MS - WINDOW_MS * inWin : BEAT_MS * (0.3 + Math.random() * 0.25));
      // A fumble only happens some of the time; the rest of the misses are just silence.
      if (!s.npcBeatHit && Math.random() < 0.6) s.npcBeatAt = Infinity;
    }
    if (time >= s.npcBeatAt) {
      s.npcBeatAt = Infinity;
      if (!(Date.now() < this.arena.npc.disarmedUntil)) this.judgeBeat('npc', time);
    }
  }

  // ── The baton ─────────────────────────────────────────────────────────

  private updateBaton(owner: Owner, time: number, delta: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    if (!s.batonPlaced) { s.bx = f.x + 40; s.by = f.y; s.batonPlaced = true; }
    const dt = delta / 1000;

    // The bot's baton hunts the player — or comes home, when the bot wants it on top of itself
    // (a Harmony tune-up, or a Musical Perfection tap to sprint). The peer's follows their cursor.
    if (owner === 'npc' && !this.arena.isOnline) {
      const { player } = this.arena;
      if (this.npcWantsBatonHome(time)) { s.aimX = f.x; s.aimY = f.y; } else { s.aimX = player.x; s.aimY = player.y; }
    }
    let tx = s.aimX, ty = s.aimY;
    const dx = tx - f.x, dy = ty - f.y;
    const d = Math.hypot(dx, dy);
    if (d > BATON_RANGE) { tx = f.x + dx / d * BATON_RANGE; ty = f.y + dy / d * BATON_RANGE; }

    if (this.onStage(owner)) { tx = f.x - 18; ty = f.y + 12; }
    if (s.dash) {
      // In hand: the baton rides the glove through the dash.
      const ha = Math.atan2(s.dash.aimY - f.y, s.dash.aimX - f.x);
      s.bx = f.x + Math.cos(ha) * 22;
      s.by = f.y + Math.sin(ha) * 22;
    } else if (time < s.grabUntil) {
      // Just slammed: it stands where it was driven in for a beat before it lifts off again.
    } else {
      const speed = (BATON_SPEED + BATON_SPEED_SPIN * s.spin)
        * (s.song === 'staccato' ? 1 + (STACCATO_BATON_SPEED - 1) * this.songPower(owner) : 1);
      const ex = tx - s.bx, ey = ty - s.by;
      const ed = Math.hypot(ex, ey);
      const step = speed * dt;
      if (ed <= step) { s.bx = tx; s.by = ty; } else { s.bx += ex / ed * step; s.by += ey / ed * step; }
      // The leash holds even when the drum major outruns the baton.
      const lx = s.bx - f.x, ly = s.by - f.y;
      const ld = Math.hypot(lx, ly);
      if (ld > BATON_RANGE + 30) { s.bx = f.x + lx / ld * (BATON_RANGE + 30); s.by = f.y + ly / ld * (BATON_RANGE + 30); }
    }
    s.rot += (BATON_ROT + BATON_ROT_SPIN * s.spin) * dt;

    // Musical Perfection: tapping yourself with the baton is a short burst of speed — once per
    // touch, so a baton parked on top of you gives one and has to leave before it gives another.
    if (this.up(owner, 'click') && !this.onStage(owner) && !s.dash) {
      const touching = Phaser.Math.Distance.Between(s.bx, s.by, f.x, f.y) <= SELF_TAP_R;
      if (touching && !s.selfTouching && time >= s.selfTapReadyAt) {
        s.selfTapUntil = time + SELF_TAP_MS;
        s.selfTapReadyAt = time + SELF_TAP_GAP_MS;
        this.fx(owner).batonFlourish(f.x, f.y - 12, SOUND.goldRich);
        this.fx(owner).ripple(f.x, f.y, 8, 30, SONG_COLORS[s.song], 260, 2.4, 7, 6);
        this.announce(f.x, f.y - 46, '♪ TEMPO!', SOUND.goldRichHi, 10);
      }
      s.selfTouching = touching;
    }

    // Contact damage — not while it is in hand, and not on the stage (or at the piano).
    if (this.onStage(owner) || s.dash || time < s.grabUntil) return;
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(s.bx, s.by, t.x, t.y) > BATON_HIT_R + 16) continue;
      if (time - (s.batonHits.get(t) ?? -Infinity) < BATON_REHIT_MS) continue;
      s.batonHits.set(t, time);
      this.strike(owner, t, BATON_DMG + BATON_DMG_SPIN * s.spin, s.bx, s.by);
      this.fx(owner).waveBurst(t.x, t.y, Math.atan2(t.y - s.by, t.x - s.bx), 0.5 + s.spin * 0.6, 9,
        s.spin > 0.6 ? SOUND.gold : SOUND.maroonPale);
    }
  }

  // ── E: Crescendo ──────────────────────────────────────────────────────

  private startDance(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const now = this.now;
    s.danceStart = now;
    s.danceUntil = now + DANCE_MS;
    s.trail = [{ x: f.x, y: f.y, at: now }];
    this.avatar(owner)?.play('raise', undefined, 500);
    this.fx(owner).sparkle(f.x, f.y, 6, 26, 10, SONG_COLORS[s.song]);
    this.announce(f.x, f.y - 50, '♪ CRESCENDO', SOUND.goldHi, 11);
  }

  private updateDance(owner: Owner, time: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (s.danceUntil > 0 && this.alive(f)) {
      const last = s.trail[s.trail.length - 1];
      if (time < s.danceUntil && (!last || Math.hypot(f.x - last.x, f.y - last.y) >= DANCE_TRAIL_STEP)) {
        s.trail.push({ x: f.x, y: f.y + 8, at: time });
      }
      if (time >= s.danceUntil) {
        s.danceUntil = 0;
        this.releaseWave(owner);
      }
    }
    while (s.trail.length && time - s.trail[0].at > DANCE_TRAIL_MS) s.trail.shift();
  }

  private releaseWave(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.fx(owner).musicWave(f.x, f.y, WAVE_RADIUS, SONG_COLORS[s.song]);
    this.avatar(owner)?.play('flex', undefined, 420);
    Sfx.playAt('sonic-pulse', f.x, { rate: 0.8, volume: 0.8 });
    this.arena.scene.cameras.main.shake(120, 0.004);
    const infect = this.up(owner, 'e');
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > WAVE_RADIUS + 14) continue;
      this.strike(owner, t, WAVE_DMG, f.x, f.y);
      // Infectious Moves: they catch the rhythm and dance — free to move, unable to attack. A
      // replica leaves our player alone; the peer's sim puts it on and the status mirror brings it.
      if (!infect || !this.alive(t) || (this.isReplica(owner) && t === this.arena.player)) continue;
      t.soundDanceUntil = Math.max(t.soundDanceUntil, Date.now() + INFECT_DANCE_MS);
      t.applyDisarm(INFECT_DANCE_MS);
      this.announce(t.x, t.y - 48, '💃 DANCE!', SOUND.goldHi, 11);
    }
  }

  // ── R: Fermata ────────────────────────────────────────────────────────

  private startFermata(owner: Owner, tx: number, ty: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    const now = this.now;
    // The bot slams at the player; everyone else at their cursor.
    if (owner === 'npc' && !this.arena.isOnline) { tx = this.arena.player.x; ty = this.arena.player.y; }
    s.dash = { fromX: f.x, fromY: f.y, toX: s.bx, toY: s.by, start: now, end: now + FERMATA_DASH_MS, aimX: tx, aimY: ty };
    this.fx(owner).dashTrail(f.x, f.y, s.bx, s.by, SOUND.maroonHi, 12, 4);
    Sfx.playAt('whoosh', f.x, { rate: 1.2, volume: 0.7 });
  }

  private updateDash(owner: Owner, time: number): void {
    const s = this.sides[owner];
    const d = s.dash;
    if (!d) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { s.dash = null; return; }
    const k = Phaser.Math.Clamp((time - d.start) / (d.end - d.start), 0, 1);
    // Position lerp rather than a velocity: both movement systems rewrite velocity every frame.
    if (!this.isReplica(owner)) {
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      const W = this.arena.width, H = this.arena.height;
      const x = Phaser.Math.Clamp(Phaser.Math.Linear(d.fromX, d.toX, k), 20, W - 20);
      const y = Phaser.Math.Clamp(Phaser.Math.Linear(d.fromY, d.toY, k), 20, H - 20);
      body?.reset(x, y);
    }
    if (k < 1) return;
    s.dash = null;
    s.grabUntil = time + 260;
    this.slam(owner, d.aimX, d.aimY);
  }

  private slam(owner: Owner, aimX: number, aimY: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const px = this.isReplica(owner) ? s.bx : f.x;
    const py = this.isReplica(owner) ? s.by : f.y;
    const ang = Math.atan2(aimY - py, aimX - px);
    const ix = px + Math.cos(ang) * 26, iy = py + Math.sin(ang) * 26;
    this.avatar(owner)?.play('slam', ang, 380);
    this.fx(owner).slam(ix, iy, ang, SLAM_LEN, SLAM_HALF_W, SOUND.maroonHi);
    Sfx.playAt('stone-slam', ix, { rate: 1.3, volume: 0.8 });
    this.arena.scene.cameras.main.shake(110, 0.005);
    // The baton is left where it was driven in.
    s.bx = ix + Math.cos(ang) * 10; s.by = iy + Math.sin(ang) * 10;

    const cos = Math.cos(ang), sin = Math.sin(ang);
    let tuned = 0;
    for (const t of this.targets(owner)) {
      const rx = t.x - ix, ry = t.y - iy;
      const along = rx * cos + ry * sin;
      const across = Math.abs(-rx * sin + ry * cos);
      const inLine = along >= -10 && along <= SLAM_LEN && across <= SLAM_HALF_W + 14;
      if (!inLine && Math.hypot(rx, ry) > SLAM_RADIUS + 14) continue;
      this.strike(owner, t, SLAM_DMG, ix, iy);
      // A replica only keeps the books on our player (so its detonation knows who it popped);
      // the tune itself arrives by the status mirror.
      s.tuned.set(t, Date.now() + TUNE_MS);
      if (this.isReplica(owner) && t === this.arena.player) continue;
      t.outOfTuneUntil = Math.max(t.outOfTuneUntil, Date.now() + TUNE_MS);
      tuned++;
      this.announce(t.x, t.y - 44, '♭ OUT OF TUNE', SOUND.sour, 11);
    }
    if (tuned === 0 && owner === 'player') this.announce(ix, iy - 30, 'FERMATA', SOUND.goldHi, 10);

    // Bass (water + sound): a Staccato slam drops a row of water charges along the line.
    if (s.song === 'staccato' && this.arena.hasPerk(owner, 'bass')) {
      this.layBassRow(owner, ix, iy, ix + cos * SLAM_LEN * 0.75, iy + sin * SLAM_LEN * 0.75);
    }
  }

  private tunedAlive(owner: Owner, kind: 'fermata' | 'piano' = 'fermata'): boolean {
    const now = Date.now();
    const s = this.sides[owner];
    for (const [t, until] of kind === 'fermata' ? s.tuned : s.pianoTuned) if (this.alive(t) && until > now) return true;
    return false;
  }

  /** Both stacks live on `t`: a Fermata's and a Forte Piano's from this side. */
  private isDissonant(owner: Owner, t: Fighter): boolean {
    const s = this.sides[owner];
    const now = Date.now();
    return (s.tuned.get(t) ?? 0) > now && (s.pianoTuned.get(t) ?? 0) > now;
  }

  /**
   * Recast: every fighter this side put out of tune (with a Fermata, or with the piano) is
   * detonated — damage, a short stun, and notes sprouting out of them. Free, so it relays as a
   * pseudo-cast rather than a cooldown. A victim wearing **both** stacks has both go off at once,
   * whichever recast it was.
   */
  private detonate(owner: Owner, kind: 'fermata' | 'piano' = 'fermata'): void {
    const s = this.sides[owner];
    const now = Date.now();
    const book = kind === 'fermata' ? s.tuned : s.pianoTuned;
    const other = kind === 'fermata' ? s.pianoTuned : s.tuned;
    const victims = [...book].filter(([t, until]) => this.alive(t) && until > now).map(([t]) => t);
    // The peer's detonation: our player is the one wearing it. The damage and the stun arrive by
    // relay; what has to happen here is the picture, and the tune coming off — a mirror only
    // ever extends a timer, so nothing else would ever shorten it.
    if (this.isReplica(owner)) {
      const { player } = this.arena;
      // Our books on the peer's hits are only as good as our copy of where they landed, so the
      // tune comes off unless all we know of is the *other* kind of stack on our player.
      const otherOnly = (other.get(player) ?? 0) > now && !((book.get(player) ?? 0) > now);
      if (player.outOfTuneUntil > now && !otherOnly) {
        player.outOfTuneUntil = 0;
        player.soundDissonantUntil = 0;
        this.nfx.sprout(player.x, player.y - 4, SOUND.gold);
      }
      for (const t of victims) { if (t !== player) this.nfx.sprout(t.x, t.y - 4, SOUND.gold); }
      book.delete(player); other.delete(player);
      for (const t of victims) { book.delete(t); other.delete(t); }
      return;
    }
    let doubles = 0;
    for (const t of victims) {
      const x = t.x, y = t.y;
      const both = (other.get(t) ?? 0) > now;
      const dmg = (kind === 'fermata' ? DETONATE_DMG : PIANO_DETONATE_DMG)
        + (both ? (kind === 'fermata' ? PIANO_DETONATE_DMG : DETONATE_DMG) : 0);
      this.strike(owner, t, dmg, x, y);
      this.stun(owner, t, DETONATE_STUN_MS);
      t.outOfTuneUntil = 0;
      t.soundDissonantUntil = 0;
      book.delete(t);
      other.delete(t);
      s.dissonance.delete(t);
      this.fx(owner).sprout(x, y - 4, SOUND.gold);
      if (both) {
        doubles++;
        this.fx(owner).sprout(x + 10, y - 10, SOUND.goldRich);
        this.fx(owner).ripple(x, y, 10, 60, SOUND.goldRich, 420, 3, 8, 8);
        this.announce(x, y - 48, `♪♪ DOUBLE RESOLVE ${Math.round(dmg * this.dmgMult(owner))}`, SOUND.goldRichHi, 12);
      } else {
        this.announce(x, y - 48, '♪ RESOLVED', SOUND.goldHi, 11);
      }
      this.record(owner, 'tuneDetonations');
    }
    const f = this.fighter(owner);
    this.avatar(owner)?.play('clap', undefined, 360);
    Sfx.playAt('holy-chord', f.x, { rate: doubles > 0 ? 1.1 : 1.4, volume: 0.7 });
    if (owner === 'player') this.arena.broadcastMasteryCast(kind === 'fermata' ? 'sound-detonate' : 'sound-piano-detonate');
  }

  /**
   * Bot: whether a stack of this kind is worth popping now — about to run out, or sour long enough
   * to have made them misfire. Double-stacked, it waits for the Dissonance bleed to do its work.
   */
  private npcWantsDetonate(kind: 'fermata' | 'piano'): boolean {
    if (this.arena.isOnline) return false;
    const s = this.sides.npc;
    const now = Date.now();
    for (const [t, until] of kind === 'fermata' ? s.tuned : s.pianoTuned) {
      if (!this.alive(t) || until <= now) continue;
      const left = until - now;
      if (left < 1500) return true;
      if (this.isDissonant('npc', t)) {
        const d = s.dissonance.get(t);
        if (d && this.now - d.since >= 3000) return true;
        continue;
      }
      if (left < TUNE_MS - 3500) return true;
    }
    return false;
  }

  /** Bot: the detonation is worth pressing once the victim has been sour long enough to matter. */
  npcDetonateReady(): boolean { return this.npcWantsDetonate('fermata'); }

  /** Bot side of the free recast — reached through `ctx.soundCast('fermata-detonate')`. */
  doNpcDetonate(): void {
    if (this.tunedAlive('npc')) this.detonate('npc');
  }

  // ── R+ Harmony ────────────────────────────────────────────────────────

  private batonOnTop(owner: Owner): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    return this.alive(f) && !s.dash && !s.solo && Phaser.Math.Distance.Between(s.bx, s.by, f.x, f.y) <= TUNE_GRAB_R;
  }

  /** In Tune's regeneration right now, in HP a second — negative once it has turned on you. */
  private tuneRate(owner: Owner): number {
    const s = this.sides[owner];
    return IN_TUNE_REGEN - IN_TUNE_REGEN_FALL * (this.now - s.inTuneStart) / 1000;
  }

  /** R with the baton on top of you: the echo baton spins up round you and you are In Tune. */
  private startInTune(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.inTune) return;
    s.inTune = true;
    s.inTuneStart = this.now;
    s.tuneNet = 0;
    s.tuneAccum = 0;
    s.echoAng = Math.atan2(s.by - f.y, s.bx - f.x);
    s.echoHits.clear();
    this.avatar(owner)?.play('raise', undefined, 500);
    this.fx(owner).ripple(f.x, f.y, 10, 56, SONG_COLORS[s.song], 520, 3, 9, 8);
    this.fx(owner).notes(f.x, f.y - 16, 7, { speed: 80, size: 7, life: 800, color: SONG_COLORS[s.song], rise: 40, angle: -Math.PI / 2, spread: 1.4 });
    this.announce(f.x, f.y - 56, '♪ IN TUNE', SOUND.goldHi, 12);
    Sfx.playAt('holy-chord', f.x, { rate: 1.1, volume: 0.6 });
  }

  /** The regeneration (its own body's machine only) and the echo baton orbiting. */
  private updateInTune(owner: Owner, time: number, delta: number): void {
    const s = this.sides[owner];
    if (!s.inTune) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.endInTune(owner, 0); return; }
    if (!this.isReplica(owner)) {
      s.tuneAccum += this.tuneRate(owner) * delta / 1000;
      while (s.tuneAccum >= 1) {
        s.tuneAccum -= 1;
        if (f.hp < f.maxHp) { f.heal(1); s.tuneNet += 1; }
      }
      while (s.tuneAccum <= -1) {
        s.tuneAccum += 1;
        f.takeDamage(1, { selfInflicted: true });
        s.tuneNet -= 1;
      }
      if (time - s.inTuneStart >= IN_TUNE_MAX_MS) { this.endInTune(owner, 0); this.relayTuneEnd(owner, 0); return; }
    }
    // The echo: a ghost of the baton circling the drum major.
    s.echoAng += ECHO_ORBIT_SPEED * delta / 1000;
    s.echoX = f.x + Math.cos(s.echoAng) * ECHO_ORBIT_R;
    s.echoY = f.y + Math.sin(s.echoAng) * ECHO_ORBIT_R * 0.8;
    if (s.solo) return;
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(s.echoX, s.echoY, t.x, t.y) > BATON_HIT_R + 14) continue;
      if (time - (s.echoHits.get(t) ?? -Infinity) < ECHO_REHIT_MS) continue;
      s.echoHits.set(t, time);
      this.strike(owner, t, ECHO_DMG, s.echoX, s.echoY);
      this.fx(owner).waveBurst(t.x, t.y, Math.atan2(t.y - s.echoY, t.x - s.echoX), 0.6, 9, SONG_PALE[s.song]);
    }
  }

  /** The recast: a burst worth everything the regeneration has netted so far — which can be negative. */
  private releaseInTune(owner: Owner): void {
    const s = this.sides[owner];
    if (!s.inTune) return;
    const f = this.fighter(owner);
    const burst = Math.round(s.tuneNet);
    if (this.alive(f) && !this.isReplica(owner)) {
      if (burst > 0) f.heal(burst);
      else if (burst < 0) f.takeDamage(-burst, { selfInflicted: true });
    }
    this.endInTune(owner, burst);
    this.relayTuneEnd(owner, burst);
  }

  private relayTuneEnd(owner: Owner, burst: number): void {
    if (owner === 'player' && this.arena.isOnline) this.arena.broadcastMasteryCast(`sound-harmony-end:${burst}`);
  }

  /** Off it comes. `burst` is only for the picture — the HP has already moved. */
  private endInTune(owner: Owner, burst: number): void {
    const s = this.sides[owner];
    if (!s.inTune) return;
    s.inTune = false;
    s.echoHits.clear();
    const f = this.fighter(owner);
    if (!this.alive(f) || burst === 0) return;
    if (burst > 0) {
      this.fx(owner).ripple(f.x, f.y, 12, 70, SOUND.smooth, 560, 4, 9, 9);
      this.fx(owner).sparkle(f.x, f.y, 10, 36, 11, SOUND.smoothPale);
      this.announce(f.x, f.y - 58, `♪ RESOLVED +${burst}`, SOUND.smoothPale, 12);
      this.avatar(owner)?.play('clap', undefined, 360);
      Sfx.playAt('holy-chord', f.x, { rate: 1.5, volume: 0.7 });
    } else {
      this.fx(owner).misfire(f.x, f.y);
      this.announce(f.x, f.y - 58, `♭ SOUR ${burst}`, SOUND.sour, 12);
      Sfx.playAt('ui-denied', f.x, { rate: 0.7, volume: 0.7 });
    }
  }

  // ── F: Hum ────────────────────────────────────────────────────────────

  private cycleSong(owner: Owner): void {
    const s = this.sides[owner];
    // Autotune leaves a song picked by hand alone for a moment.
    if (this.masteryOn(owner)) s.autotuneHoldUntil = this.now + AUTOTUNE_MANUAL_MS;
    this.setSong(owner, SONG_ORDER[(SONG_ORDER.indexOf(s.song) + 1) % SONG_ORDER.length], false);
  }

  /** Change the soul song — by F, or by Autotune (`auto`), which relays it as an absolute. */
  private setSong(owner: Owner, next: SoulSong, auto: boolean): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    s.song = next;
    if (!this.alive(f)) return;
    this.fx(owner).notes(f.x, f.y - 16, 6, { speed: 90, size: 7, life: 760, color: SONG_COLORS[next], rise: 40, angle: -Math.PI / 2, spread: 1.2 });
    this.fx(owner).ripple(f.x, f.y, 10, 40, SONG_COLORS[next], 360, 3, 7, 7);
    this.avatar(owner)?.play('flex', undefined, 360);
    this.announce(f.x, f.y - 52, auto ? `♪ AUTOTUNE · ${SONG_NAMES[next]}` : `♪ ${SONG_NAMES[next]}`, SONG_COLORS[next], 11);
    if (auto && owner === 'player' && this.arena.isOnline) this.arena.broadcastMasteryCast(`sound-song:${next}`);
  }

  /** Bot: the song this bot wants right now. The kit decides; the rotation presses until it matches. */
  npcWantedSong(): SoulSong {
    // With the mastery on, Autotune picks the song — the rotation never needs to press Hum.
    if (this.masteryOn('npc')) return this.sides.npc.song;
    const { npc, player } = this.arena;
    const hp = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
    if (this.isDeaf('npc')) return hp < 0.5 ? 'smooth' : 'melody';
    if (hp < 0.4) return 'smooth';
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
    if (d > BATON_RANGE + 140) return 'melody';
    return 'staccato';
  }

  npcSong(): SoulSong { return this.sides.npc.song; }

  /** The standing effects of whichever song is playing. A replica's buffs live on the peer's sim. */
  private updateSong(owner: Owner, delta: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || this.isReplica(owner)) return;
    const power = this.songPower(owner);
    if (s.song === 'melody') f.reduceCooldowns(delta * MELODY_CD_RATE * power);
    if (s.song === 'smooth') {
      f.soundIncomingMult = Math.max(0.4, 1 - (1 - SMOOTH_RES) * power);
      s.resOwned = true;
      s.regenAccum += delta;
      const per = 1000 / (SMOOTH_REGEN * power);
      while (s.regenAccum >= per) {
        s.regenAccum -= per;
        if (f.hp < f.maxHp) f.heal(1);
      }
    } else {
      s.regenAccum = 0;
      if (s.resOwned) { f.soundIncomingMult = 1; s.resOwned = false; }
    }
  }

  /** Practice Makes Perfect: every beat played levels up whichever song is on, for the round. */
  private practise(owner: Owner): void {
    if (!this.up(owner, 'f') || this.isReplica(owner)) return;
    const s = this.sides[owner];
    const before = this.songLevel(owner);
    s.practice[s.song]++;
    const after = this.songLevel(owner);
    if (after <= before) return;
    // Mastery progress: all three songs taken to the top in one match.
    if (owner === 'player' && !s.songsMaxedSeen && SONG_ORDER.every((song) => this.songLevel(owner, song) >= PRACTICE_MAX_LEVEL)) {
      s.songsMaxedSeen = true;
      this.record(owner, 'songsMaxed');
    }
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.fx(owner).notes(f.x, f.y - 16, 4 + after, { speed: 110, size: 6, life: 800, color: SONG_COLORS[s.song], rise: 50, angle: -Math.PI / 2, spread: 1.5 });
    this.fx(owner).sparkle(f.x, f.y, 6 + after, 30, 11, SONG_PALE[s.song]);
    this.announce(f.x, f.y - 56, `♪ ${SONG_NAMES[s.song]} LV ${after}`, SONG_COLORS[s.song], 11);
  }

  /** Higher-level songs throw off more: sparkles round the body, quicker and fuller each level. */
  private emitPractice(owner: Owner, time: number): void {
    const lvl = this.songLevel(owner);
    if (lvl <= 0) return;
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || f.forceInvisible || f.alpha < 0.2 || time < s.sparkleAt) return;
    s.sparkleAt = time + Math.max(150, 1000 - lvl * 85);
    this.fx(owner).sparkle(f.x, f.y, 1 + Math.floor(lvl / 3), 22 + lvl * 2, 7, SONG_COLORS[s.song]);
    if (lvl >= 5) {
      this.fx(owner).notes(f.x, f.y - 8, Math.floor((lvl - 3) / 2), { speed: 30, size: 4 + lvl * 0.2, life: 700, depth: 7, color: SONG_PALE[s.song], rise: 30 });
    }
  }

  /** Sample the walk so the song's notes can follow along behind. */
  private trackPath(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const last = s.path[0];
    if (!last || Math.hypot(f.x - last.x, f.y - last.y) >= 4) {
      s.path.unshift({ x: f.x, y: f.y });
      if (s.path.length > 40) s.path.pop();
      if (last) {
        s.walkAccum += Math.hypot(f.x - last.x, f.y - last.y);
        if (s.walkAccum > 46) {
          s.walkAccum = 0;
          this.fx(owner).notes(f.x, f.y + 10, 1 + Math.floor(this.songLevel(owner) / 3), { speed: 14, size: 4, life: 700, depth: 4, color: SONG_COLORS[s.song], rise: 16 });
        }
      }
    }
  }

  /** Three notes in the song's colour trailing along the walk, bobbing as they go. */
  private paintFollowers(g: Phaser.GameObjects.Graphics, owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || f.alpha < 0.05 || f.forceInvisible) return;
    const want = [22, 38, 54];
    let acc = 0;
    let wi = 0;
    let prev = { x: f.x, y: f.y };
    const pts: { x: number; y: number }[] = [];
    for (const p of s.path) {
      acc += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = p;
      while (wi < want.length && acc >= want[wi]) { pts.push(p); wi++; }
      if (wi >= want.length) break;
    }
    // Standing still, the notes gather in a little orbit at the shoulder instead.
    while (pts.length < want.length) {
      const i = pts.length;
      const a = this.vizT * 1.6 + i * 2.1;
      pts.push({ x: f.x + Math.cos(a) * 26, y: f.y - 6 + Math.sin(a) * 10 });
    }
    pts.forEach((p, i) => {
      const bob = Math.sin(this.vizT * 4 + i * 1.3) * 3;
      musicNoteLayered(g, this.col(owner), p.x, p.y - 14 + bob, 5 - i * 0.6, Math.sin(this.vizT * 2 + i) * 0.3,
        SONG_COLORS[s.song], f.alpha * (0.9 - i * 0.18), { flags: i % 2 ? 2 : 1 });
    });
  }

  // ── Q: Call of the Void ───────────────────────────────────────────────

  /**
   * The chart. Easy quarters first, then eighths with the odd slur, then runs, more lane changes
   * and slurs that move line halfway through. Built fresh every solo, so it is never learnt by rote.
   */
  private buildChart(): SoloNote[] {
    const notes: SoloNote[] = [];
    let lane = 1;
    const walk = (p: number): number => {
      if (Math.random() < p) lane = Phaser.Math.Clamp(lane + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1);
      return lane;
    };
    const push = (at: number, kind: NoteKind, len = 0, laneTo = lane, switchAt = 1): void => {
      notes.push({ at, lane, kind, len, laneTo, switchAt, state: 'pending', wrongSince: 0 });
    };
    let t = SOLO_LEAD_IN;
    // Phase one: quarter notes, mostly on one line.
    while (t < 5000) { walk(0.35); push(t, 'quarter'); t += 600; }
    // Phase two: eighths, and a slur now and then.
    while (t < 9600) {
      if (Math.random() < 0.18) {
        walk(0.5);
        const len = 600 + Math.random() * 220;
        push(t, 'slur', len);
        t += len + 330;
      } else {
        walk(0.45);
        push(t, 'eighth');
        t += 330;
      }
    }
    // Phase three: runs of sixteenths, eighths, and slurs that change line.
    while (t < SOLO_MAX_MS - 1400) {
      const r = Math.random();
      if (r < 0.28) {
        for (let i = 0; i < 4; i++) { walk(0.5); push(t, 'sixteenth'); t += 175; }
        t += 120;
      } else if (r < 0.55) {
        walk(0.4);
        const len = 700 + Math.random() * 300;
        const to = Phaser.Math.Clamp(lane + (lane === 0 ? 1 : lane === LANES - 1 ? -1 : (Math.random() < 0.5 ? -1 : 1)), 0, LANES - 1);
        push(t, 'slur', len, to, 0.45 + Math.random() * 0.15);
        lane = to;
        t += len + 300;
      } else {
        walk(0.55);
        push(t, 'eighth');
        t += 280;
      }
    }
    return notes;
  }

  private startSolo(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.solo) return;
    const now = this.now;
    const notes = this.buildChart();
    const lastEnd = notes.reduce((m, n) => Math.max(m, n.at + n.len), 0);
    const solo: Solo = {
      start: now, el: 0, endEl: Math.min(SOLO_MAX_MS, lastEnd + 800), tempo: 1, speeding: false,
      x: f.x, y: f.y, notes, lane: 1, hits: 0, combo: 0,
      absorber: null, prevAbsorber: null, rolled: new Set(),
    };
    // You cannot be hurt on the stage. Chained in front of whatever absorber was already there.
    const prev = f.damageAbsorber;
    const mine = (amount: number): boolean => {
      if (this.sides[owner].solo === solo) return true;
      return prev ? prev(amount) : false;
    };
    solo.prevAbsorber = prev;
    solo.absorber = mine;
    f.damageAbsorber = mine;
    s.solo = solo;
    s.danceUntil = 0;
    s.dash = null;
    s.gong = null;
    if (this.rock(owner)) {
      this.rfx(owner).pyro(f.x, f.y);
      this.announce(f.x, f.y - 60, '🥁 DRUM SOLO', SOUND.goldHi, 13);
    } else {
      this.fx(owner).fanfare(f.x, f.y);
      this.announce(f.x, f.y - 60, '🎺 CALL OF THE VOID', SOUND.goldHi, 13);
    }
    Sfx.playAt('train-horn', f.x, { rate: 1.5, volume: 0.6 });
  }

  /**
   * `finale`: the solo was played out (or bowed out of) rather than cut short by death or a
   * dormant Quantum half — with Big Finish, that is when the gong gets struck.
   */
  private endSolo(owner: Owner, relay: boolean, finale = false): void {
    const s = this.sides[owner];
    const solo = s.solo;
    if (!solo) return;
    s.solo = null;
    const f = this.fighter(owner);
    if (solo.absorber && f.damageAbsorber === solo.absorber) f.damageAbsorber = solo.prevAbsorber;
    // The cooldown runs from the end of the solo, not the start of it.
    if (!this.isReplica(owner)) f.restampCooldown('call-of-the-void');
    if (this.alive(f)) {
      this.fx(owner).notes(f.x, f.y - 20, 10, { speed: 160, size: 8, life: 900, color: SOUND.gold, rise: 50 });
      this.announce(f.x, f.y - 60, `ENCORE! ×${solo.hits}`, SOUND.goldHi, 13);
    }
    if (relay && owner === 'player') this.arena.broadcastMasteryCast('sound-solo-end');
    // Big Finish: how far it was sped up is the flair. None at all, and there is no gong.
    const flair = (solo.tempo - 1) / (FLAIR_MAX_TEMPO - 1);
    if (finale && !this.isReplica(owner) && this.up(owner, 'q') && flair > 0.005 && this.alive(f)) {
      this.startGong(owner, flair);
      if (owner === 'player' && this.arena.isOnline) this.arena.broadcastMasteryCast(`sound-gong:${Math.round(flair * 100)}`);
    }
  }

  /** Whether the Space bar belongs to the solo right now — ArenaScene skips the dodge while it does. */
  suppressesDodge(): boolean {
    return this.sides.player.solo !== null && this.up('player', 'q');
  }

  // ── Q+ Big Finish ─────────────────────────────────────────────────────

  private startGong(owner: Owner, flair: number): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    // The gong stands on the enemy's side of the drum major, so the swing is toward them.
    const foe = this.targets(owner)[0];
    const dir: 1 | -1 = foe && foe.x < f.x ? -1 : 1;
    const W = this.arena.width;
    const gx = Phaser.Math.Clamp(f.x + dir * (60 + flair * 10), 50, W - 50);
    s.gong = { x: gx, y: f.y, dir, start: this.now, struck: false, flair };
    this.avatar(owner)?.play('raise', undefined, GONG_WINDUP_MS);
    this.announce(f.x, f.y - 62, `${this.rock(owner) ? '⚡' : '🔔'} BIG FINISH ×${solo2(1 + flair * (FLAIR_MAX_TEMPO - 1))}`, SOUND.goldRichHi, 12);
  }

  private updateGong(owner: Owner, time: number): void {
    const s = this.sides[owner];
    const g = s.gong;
    if (!g) return;
    const f = this.fighter(owner);
    if (!g.struck && time >= g.start + GONG_WINDUP_MS) {
      g.struck = true;
      const dmg = Math.round(GONG_DMG * g.flair);
      // Every enemy on the field hears it, wherever they are — the gong is the last note.
      for (const t of this.targets(owner)) this.strike(owner, t, dmg, g.x, g.y);
      if (this.alive(f)) this.avatar(owner)?.play('slam', g.dir > 0 ? 0 : Math.PI, 380);
      this.fx(owner).boom(g.x, g.y - 6, 90 + g.flair * 90, { color: SOUND.bronzeHi, petals: 10, notes: 8, duration: 620 });
      this.fx(owner).ripple(g.x, g.y - 6, 30, 220 + g.flair * 200, SOUND.goldHi, 900, 5, 10, 10);
      this.arena.scene.cameras.main.shake(260, 0.006 + g.flair * 0.008);
      Sfx.playAt('stone-slam', g.x, { rate: 0.55, volume: 1 });
      Sfx.playAt('holy-chord', g.x, { rate: 0.6, volume: 0.9 });
      this.announce(g.x, g.y - 70, `BONG! ${dmg}`, SOUND.goldRichHi, 16);
      // The price: your own ears are ringing.
      s.deafUntil = time + DEAF_MS;
      if (this.alive(f)) this.announce(f.x, f.y - 46, '🔇 DEAF', SOUND.steel, 11);
    }
    if (time >= g.start + GONG_MS) s.gong = null;
  }

  /** The player's hands on the bugle: W/S or the arrows pick the line, the click plays it. */
  private soloInput(time: number, justDown: boolean, down: boolean): void {
    const solo = this.sides.player.solo;
    if (!solo) return;
    const kb = this.arena.scene.input.keyboard;
    if (kb && !this.keyW) {
      this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.keyDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    }
    // Edges tracked by hand: reading JustDown would consume the flag the movement code shares.
    const up = !!(this.keyW?.isDown || this.keyUp?.isDown);
    const dn = !!(this.keyS?.isDown || this.keyDown?.isDown);
    if (up && !this.laneUpWas) solo.lane = Math.max(0, solo.lane - 1);
    if (dn && !this.laneDownWas) solo.lane = Math.min(LANES - 1, solo.lane + 1);
    this.laneUpWas = up;
    this.laneDownWas = dn;
    // Big Finish: Space held speeds the solo up. isDown only — JustDown would eat the dodge's flag.
    if (kb && !this.keySpace) this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    solo.speeding = this.up('player', 'q') && !!this.keySpace?.isDown;

    const el = solo.el;
    if (justDown) {
      // The earliest unplayed note in reach of the bar.
      let best: SoloNote | null = null;
      for (const n of solo.notes) {
        if (n.state !== 'pending') continue;
        if (Math.abs(n.at - el) > SOLO_TOLERANCE) continue;
        if (!best || n.at < best.at) best = n;
      }
      if (best) {
        if (best.lane === solo.lane) this.landSoloNote('player', best, el);
        else { best.state = 'missed'; solo.combo = 0; this.fumbleFlash = 1; }
      }
    }
    // Slurs being carried.
    for (const n of solo.notes) {
      if (n.state !== 'holding') continue;
      const want = el < n.at + n.len * n.switchAt ? n.lane : n.laneTo;
      if (!down && el < n.at + n.len - 70) { n.state = 'broken'; solo.combo = 0; continue; }
      if (solo.lane !== want) {
        if (n.wrongSince === 0) n.wrongSince = time;
        else if (time - n.wrongSince > SLUR_LANE_GRACE) { n.state = 'broken'; solo.combo = 0; continue; }
      } else n.wrongSince = 0;
      if (el >= n.at + n.len) { n.state = 'held'; this.payNote('player', true); }
    }
  }

  private landSoloNote(owner: Owner, n: SoloNote, el: number): void {
    void el;
    const solo = this.sides[owner].solo;
    if (!solo) return;
    n.state = n.kind === 'slur' ? 'holding' : 'hit';
    this.payNote(owner, false);
    if (owner === 'player') this.beatFlash = 1;
  }

  /** One note played: 15 to the nearest enemy, wherever they are, flown there off the bell. */
  private payNote(owner: Owner, big: boolean): void {
    const s = this.sides[owner];
    const solo = s.solo;
    if (!solo) return;
    solo.hits++;
    solo.combo++;
    this.record(owner, 'voidNotes');
    const f = this.fighter(owner);
    let target: Fighter | null = null;
    let bd = Infinity;
    for (const t of this.targets(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bd) { bd = d; target = t; }
    }
    const dir = target && target.x < f.x ? -1 : 1;
    const bellX = f.x + dir * 50, bellY = f.y - 2;
    if (target) {
      const tx = target.x, ty = target.y;
      if (this.rock(owner)) {
        // Off the crash cymbal rather than the bell; the strike itself is unchanged.
        const cx = f.x + dir * 26, cy = f.y - 10;
        this.rfx(owner).crash(cx, cy, big);
        this.rfx(owner).boltShot(cx, cy, tx, ty, this.col(owner)(big ? SOUND.goldHi : SONG_COLORS[s.song]), big);
        this.avatar(owner)?.drumHit?.(big);
      } else {
        this.fx(owner).noteShot(bellX, bellY, tx, ty, big ? SOUND.goldHi : SONG_COLORS[s.song], big);
      }
      this.strike(owner, target, SOLO_NOTE_DMG, bellX, bellY);
    }
    if (owner === 'player') this.arena.broadcastMasteryCast(big ? 'sound-solo-hit:big' : 'sound-solo-hit');
  }

  private updateSolo(owner: Owner, time: number, delta: number): void {
    const s = this.sides[owner];
    const solo = s.solo;
    if (!solo) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.endSolo(owner, false); return; }
    // Rooted on the stage.
    if (!this.isReplica(owner)) (f.body as Phaser.Physics.Arcade.Body | null)?.reset(solo.x, solo.y);
    // Big Finish: the bot speeds its solo up to a target set by its rung — but not when it is
    // low, since the gong leaves it deaf for eight seconds.
    if (owner === 'npc' && !this.isReplica(owner) && this.up('npc', 'q')) {
      const lvl = Phaser.Math.Clamp(this.arena.npcLevel, 1, 5);
      const hp = f.maxHp > 0 ? f.hp / f.maxHp : 1;
      solo.speeding = hp > 0.35 && solo.tempo < 1 + 0.16 * lvl;
    }
    if (solo.speeding) solo.tempo = Math.min(FLAIR_MAX_TEMPO, solo.tempo + FLAIR_RATE * delta / 1000);
    solo.el += delta * solo.tempo;
    const el = solo.el;
    if (owner === 'player') {
      for (const n of solo.notes) {
        if (n.state === 'pending' && el - n.at > SOLO_TOLERANCE) { n.state = 'missed'; solo.combo = 0; }
      }
    } else if (!this.isReplica(owner)) {
      // The bot plays its own chart, rolling each note once as it reaches the bar.
      const lvl = Phaser.Math.Clamp(this.arena.npcLevel, 1, 5);
      // Faster is harder, for a bot as much as anyone.
      const p = NPC_SOLO_CHANCE[lvl - 1] * (1 - (solo.tempo - 1) * 0.3);
      for (const n of solo.notes) {
        if (n.state === 'pending' && el >= n.at && !solo.rolled.has(n)) {
          solo.rolled.add(n);
          if (Math.random() < p) { n.state = n.kind === 'slur' ? 'holding' : 'hit'; this.payNote('npc', false); }
          else n.state = 'missed';
        }
        if (n.state === 'holding' && el >= n.at + n.len) {
          if (Math.random() < p * 0.85) { n.state = 'held'; this.payNote('npc', true); } else n.state = 'broken';
        }
      }
    }
    // The replica keeps its own clock; the peer ends it by relay, which is always sooner.
    if (el >= solo.endEl) this.endSolo(owner, owner === 'player', true);
  }

  /** Bot: on stage, the rotation stands down — the kit is playing the solo. */
  npcSoloing(): boolean { return this.onStage('npc'); }

  // ── Bot: upgrade synergies (all side-effect-free reads) ──

  /** Harmony is worth tuning up for: hurt, R ready, upgrade owned, not already in tune. */
  private npcWantsHarmony(): boolean {
    const { npc } = this.arena;
    const s = this.sides.npc;
    if (this.arena.isOnline || !this.up('npc', 'r') || s.inTune || s.solo || !this.alive(npc)) return false;
    return npc.hp / Math.max(1, npc.maxHp) < 0.7 && npc.getCooldownRatio('fermata') >= 1;
  }

  /** The bot's baton heads home: to tune up, or to tap itself for a sprint when the player is far. */
  private npcWantsBatonHome(time: number): boolean {
    if (this.npcWantsHarmony()) return true;
    const { npc, player } = this.arena;
    const s = this.sides.npc;
    return this.up('npc', 'click') && time >= s.selfTapReadyAt && !s.selfTouching
      && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) > 380;
  }

  /** R+ synergy: the baton is home and the bot wants the heal — press R and it tunes up. */
  npcHarmonyReady(): boolean { return this.npcWantsHarmony() && this.batonOnTop('npc'); }

  /** R+ synergy: the regeneration has peaked — the recast pays the most it ever will. */
  npcHarmonyRelease(): boolean {
    const s = this.sides.npc;
    return !this.arena.isOnline && s.inTune && this.tuneRate('npc') <= 0.5;
  }

  /** Q+ aftermath: deaf, nothing it presses will hurt — the rotation stands down. */
  npcDeaf(): boolean { return !this.arena.isOnline && this.isDeaf('npc'); }

  /** E+ synergy: the player is dancing and cannot hit back — a free window to slam. */
  npcVictimDancing(): boolean {
    const { player } = this.arena;
    return !this.arena.isOnline && this.up('npc', 'e') && player.soundDanceUntil > Date.now();
  }

  // ── Mastery ───────────────────────────────────────────────────────────

  /** Whether Element Mastery is on for whichever side is asking, and they are the drum major. */
  private masteryOn(owner: Owner): boolean {
    return this.arena.isSound(owner) && (owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive);
  }

  /** Which slot Forte Piano was dropped on, or null. */
  private pianoSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const k of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.arena.masteryBindFor(k) : this.arena.npcMasteryBindFor(k);
      if (bind === PIANO_ID) return k;
    }
    return null;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's, not the bot's — and not
   * gated on the mastery being on, since earning it is the point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player' && this.arena.isSound('player')) this.arena.recordMasteryStat(key, amount);
  }

  // ── Autotune ──

  /** Where the switch sits: centred, just under the HP bar's housing. */
  private toggleRect(): { cx: number; cy: number } {
    return { cx: this.arena.width / 2, cy: this.arena.hpBarY + this.arena.hpBarH / 2 + 18 };
  }

  private overAutotuneToggle(x: number, y: number): boolean {
    const { cx, cy } = this.toggleRect();
    return Math.abs(x - cx) <= TOGGLE_W / 2 + 2 && Math.abs(y - cy) <= TOGGLE_H / 2 + 3;
  }

  /** The song the moment calls for, or null where Autotune leaves it alone. */
  private autotuneWants(owner: Owner): SoulSong | null {
    const f = this.fighter(owner);
    const hp = f.maxHp > 0 ? f.hp / f.maxHp : 1;
    if (hp < AUTOTUNE_LOW_HP) return 'smooth';
    let near = Infinity;
    for (const t of this.targets(owner)) near = Math.min(near, Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y));
    if (near <= AUTOTUNE_CLOSE) return 'staccato';
    if (hp >= AUTOTUNE_HIGH_HP) return 'melody';
    return null;
  }

  /**
   * Passive: the soul song follows the situation. Runs on the singer's own machine only — online
   * the change travels as an absolute `sound-song:` relay. The bot's is always on.
   */
  private updateAutotune(owner: Owner, time: number): void {
    if (!this.masteryOn(owner) || this.isReplica(owner)) return;
    if (owner === 'player' && !autotuneOn) return;
    const s = this.sides[owner];
    if (s.solo || time < s.autotuneAt || time < s.autotuneHoldUntil || !this.alive(this.fighter(owner))) return;
    s.autotuneAt = time + AUTOTUNE_CHECK_MS;
    const want = this.autotuneWants(owner);
    if (!want || want === s.song) return;
    s.autotuneHoldUntil = time + AUTOTUNE_HOLD_MS;
    this.setSong(owner, want, true);
  }

  // ── Forte Piano ──

  /**
   * Forte Piano, from the bound key, the bot, or an online peer's replay. It never goes through
   * `castAbility` (the enhancement is not in the element's ability list), so the refusals that
   * gate every other key are repeated here.
   */
  private tryPiano(owner: Owner): boolean {
    const f = this.fighter(owner);
    const s = this.sides[owner];
    if (!this.alive(f) || s.piano) return false;
    if (!this.isReplica(owner)) {
      const wall = Date.now();
      if (wall < f.disarmedUntil || wall < f.chickenUntil || wall < f.silencedUntil || wall < f.stunnedUntil) return false;
      if (this.now - s.pianoAt < PIANO_COOLDOWN_MS) return false;
      if (s.solo || s.dash) return false;
    }
    // Pull up to a spot where the whole instrument fits on the field.
    const W = this.arena.width, H = this.arena.height;
    const ax = this.isReplica(owner) ? f.x : Phaser.Math.Clamp(f.x, PIANO_EDGE_X, W - PIANO_EDGE_X);
    const ay = this.isReplica(owner) ? f.y : Phaser.Math.Clamp(f.y, PIANO_EDGE_TOP, H - PIANO_EDGE_BOTTOM);
    s.piano = {
      phase: 'play', x: ax, y: ay, start: this.now, charge: 0, notes: [], lastGap: 0,
      flash: new Array(PIANO_SEMIS.length).fill(0), tx: ax, ty: ay, locked: false,
      npcNextAt: this.now + 500, seq: 0,
    };
    s.danceUntil = 0;
    this.endInTune(owner, 0);
    this.fx(owner).sparkle(ax, ay, 10, 60, 10, SOUND.goldHi);
    this.fx(owner).ripple(ax, ay, 14, 90, SOUND.gold, 520, 3, 9, 9);
    this.announce(ax, ay - 110, '🎹 FORTE PIANO', SOUND.goldHi, 13);
    Sfx.playAt('piano-key', ax, { rate: 1, volume: 0.6 });
    if (owner === 'player') this.arena.broadcastMasteryCast('sound-piano');
    return true;
  }

  /** A click while seated: which key it hit, if any. */
  private pianoClick(owner: Owner, x: number, y: number): void {
    const p = this.sides[owner].piano;
    if (!p || p.phase !== 'play') return;
    const key = pianoKeyAt(x, y, p.x, p.y);
    if (key >= 0) this.playKey(owner, key);
  }

  /**
   * One key struck. White keys score by how sweetly they follow the last one — the interval, and
   * whether the rhythm holds — and feed the charge. Black keys sound, but count for nothing.
   */
  private playKey(owner: Owner, key: number): void {
    const s = this.sides[owner];
    const p = s.piano;
    if (!p || p.phase !== 'play') return;
    const now = this.now;
    p.flash[key] = 1;
    const left = p.x - (PIANO.whiteKeys * PIANO.keyW) / 2;
    const white = key < PIANO.whiteKeys;
    const kx = white
      ? left + (key + 0.5) * PIANO.keyW
      : left + (PIANO.blackAfter[key - PIANO.whiteKeys] + 1) * PIANO.keyW;
    const ky = p.y + PIANO.top + 10;
    Sfx.playAt('piano-key', kx, { rate: Math.pow(2, PIANO_SEMIS[key] / 12), volume: white ? 0.75 : 0.4 });
    if (owner === 'player' && this.arena.isOnline) this.arena.broadcastMasteryCast(`sound-piano-key:${key}:${p.seq++}`);
    if (!white) {
      this.fx(owner).notes(kx, ky - 12, 1, { speed: 30, size: 4, life: 500, color: SOUND.steel, rise: 20 });
      return;
    }
    // The replica sounds the keys; its charge arrives with the fling.
    if (this.isReplica(owner)) {
      this.fx(owner).notes(kx, ky - 14, 1, { speed: 40, size: 5, life: 600, color: SOUND.goldHi, rise: 30 });
      return;
    }
    const q = this.scoreNote(p, key, now);
    p.notes.push({ deg: key, at: now });
    if (q >= PIANO_SOUR_AT) p.charge = Math.min(1, p.charge + q * PIANO_CHARGE_PER_NOTE);
    else p.charge = Math.max(0, p.charge - (PIANO_SOUR_AT - q) * PIANO_SOUR_COST);
    const sweet = q >= 0.9;
    const sour = q < PIANO_SOUR_AT;
    this.fx(owner).notes(kx, ky - 14, sweet ? 3 : 1, {
      speed: sweet ? 70 : 40, size: sweet ? 6 : 5, life: 700,
      color: sour ? SOUND.sour : sweet ? SOUND.goldRich : SOUND.goldHi, rise: 36,
    });
    if (sweet) this.fx(owner).sparkle(kx, ky - 16, 3, 14, 11, SOUND.goldRichHi);
    if (sour) this.fx(owner).misfire(kx, ky - 6);
  }

  /** How melodious a white key is after the ones before it, about 0–1.25. */
  private scoreNote(p: Piano, deg: number, at: number): number {
    const prev = p.notes[p.notes.length - 1];
    if (!prev) return deg === 0 || deg === 7 ? 0.9 : 0.6;
    const gap = at - prev.at;
    if (gap < PIANO_MASH_MS) return 0.1;
    let q = INTERVAL_SCORE[Math.abs(deg - prev.deg)] ?? 0.3;
    // The same key three times running is a drone, not a tune.
    const prev2 = p.notes[p.notes.length - 2];
    if (deg === prev.deg && prev2 && prev2.deg === deg) q = 0.1;
    // In time: the same gap as the last, or half or double it.
    if (p.lastGap > 0) {
      const r = gap / p.lastGap;
      if ([0.5, 1, 2].some((m) => Math.abs(r - m) <= m * 0.2)) q += 0.25;
    }
    p.lastGap = gap;
    return q;
  }

  /** Up off the floor and into the air — the five seconds are over, or the key was pressed again. */
  private flingPiano(owner: Owner, netCharge?: number): void {
    const s = this.sides[owner];
    const p = s.piano;
    if (!p || p.phase !== 'play') return;
    if (netCharge !== undefined) p.charge = netCharge;
    else if (p.notes.length >= 4) {
      // Ending on a C resolves the tune.
      const last = p.notes[p.notes.length - 1].deg;
      if (last === 0 || last === 7) p.charge = Math.min(1, p.charge + PIANO_CADENCE);
    }
    p.phase = 'fly';
    p.start = this.now;
    p.tx = s.aimX; p.ty = s.aimY;
    const f = this.fighter(owner);
    this.avatar(owner)?.play('raise', undefined, 500);
    this.fx(owner).ripple(p.x, p.y, 16, 110, SOUND.goldHi, 480, 3, 10, 9);
    this.fx(owner).notes(p.x, p.y - 30, 8, { speed: 150, size: 7, life: 900, color: SOUND.gold, rise: 60, angle: -Math.PI / 2, spread: 1.2 });
    this.announce(p.x, p.y - 110, `🎹 FORTE! ${Math.round(p.charge * 100)}%`, p.charge >= PIANO_TUNE_AT ? SOUND.goldRichHi : SOUND.goldHi, 13);
    Sfx.playAt('whoosh', this.alive(f) ? f.x : p.x, { rate: 0.6, volume: 0.9 });
    if (owner === 'player' && this.arena.isOnline) this.arena.broadcastMasteryCast(`sound-piano-fling:${Math.round(p.charge * 100)}`);
  }

  /** Seated: rooted at the keys, the bot playing its own tune. In the air: steering, then the crash. */
  private updatePiano(owner: Owner, time: number, delta: number): void {
    const s = this.sides[owner];
    const p = s.piano;
    if (!p) return;
    const f = this.fighter(owner);
    for (let i = 0; i < p.flash.length; i++) p.flash[i] = Math.max(0, p.flash[i] - delta / 220);
    if (p.phase === 'play') {
      if (!this.alive(f)) { s.piano = null; return; }
      if (!this.isReplica(owner)) {
        (f.body as Phaser.Physics.Arcade.Body | null)?.reset(p.x, p.y);
        if (owner === 'npc') this.botPlay(p, time);
        if (time - p.start >= PIANO_PLAY_MS) this.flingPiano(owner);
      } else if (time - p.start >= PIANO_PLAY_MS + 1500) {
        // The fling relay never came: let it go up on our own clock.
        this.flingPiano(owner);
      }
      return;
    }
    // In the air: the drop point follows the cursor (the bot's follows the player) until it locks.
    const el = time - p.start;
    if (!p.locked) {
      if (owner === 'npc' && !this.arena.isOnline) { p.tx = this.arena.player.x; p.ty = this.arena.player.y; }
      else { p.tx = s.aimX; p.ty = s.aimY; }
      p.tx = Phaser.Math.Clamp(p.tx, 20, this.arena.width - 20);
      p.ty = Phaser.Math.Clamp(p.ty, 20, this.arena.height - 20);
      if (el >= PIANO_FLIGHT_MS - PIANO_LOCK_MS) p.locked = true;
    }
    if (this.isReplica(owner)) {
      // The peer's crash lands where their relay says; this only waits for it.
      if (el >= PIANO_FLIGHT_MS + 1500) s.piano = null;
      return;
    }
    if (el >= PIANO_FLIGHT_MS) this.crashPiano(owner, p.tx, p.ty, p.charge);
  }

  /** The bot at the keys: a steady beat, and a sweet interval as often as its rung allows. */
  private botPlay(p: Piano, time: number): void {
    if (time < p.npcNextAt || time - p.start > PIANO_PLAY_MS - 150) return;
    const lvl = Phaser.Math.Clamp(this.arena.npcLevel, 1, 5);
    const prev = p.notes[p.notes.length - 1];
    let key: number;
    if (!prev) key = Math.random() < 0.5 ? 0 : 7;
    else if (Math.random() < NPC_PIANO_SWEET[lvl - 1]) {
      const steps = [1, 2, 4, -1, -2, -4, 7, -7].filter((d) => prev.deg + d >= 0 && prev.deg + d < PIANO.whiteKeys);
      key = prev.deg + steps[Math.floor(Math.random() * steps.length)];
    } else key = Math.floor(Math.random() * PIANO.whiteKeys);
    // Near the end, a sharp bot comes home to a C.
    if (time - p.start > PIANO_PLAY_MS - 700 && Math.random() < lvl / 5) key = prev && prev.deg >= 4 ? 7 : 0;
    this.playKey('npc', key);
    p.npcNextAt = time + NPC_PIANO_GAP_MS + (Math.random() - 0.5) * (6 - lvl) * 70;
  }

  /** Down it comes: damage by charge, and at high charge everyone under it out of tune. */
  private crashPiano(owner: Owner, x: number, y: number, charge: number): void {
    const s = this.sides[owner];
    s.piano = null;
    s.pianoAt = this.now;
    const dmg = Math.round(PIANO_DMG_MIN + (PIANO_DMG_MAX - PIANO_DMG_MIN) * charge);
    const tunes = charge >= PIANO_TUNE_AT;
    let hit = 0;
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > PIANO_RADIUS + 14) continue;
      hit++;
      this.strike(owner, t, dmg, x, y);
      if (!tunes) continue;
      // A replica keeps the books on our player too, so its detonation knows who it popped.
      s.pianoTuned.set(t, Date.now() + TUNE_MS);
      if (this.isReplica(owner) && t === this.arena.player) continue;
      t.outOfTuneUntil = Math.max(t.outOfTuneUntil, Date.now() + TUNE_MS);
      this.announce(t.x, t.y - 44, this.isDissonant(owner, t) ? '♭♭ DISSONANT' : '♭ OUT OF TUNE', SOUND.sour, 11);
    }
    const fx = this.fx(owner);
    fx.pianoCrash(x, y, PIANO_RADIUS, charge);
    fx.boom(x, y, PIANO_RADIUS * (0.8 + charge * 0.4), { color: tunes ? SOUND.goldRich : SOUND.gold, petals: 10, notes: 6 + Math.round(charge * 6), duration: 560 });
    fx.shatter(x, y, 30, 10, 9, SOUND.ivory);
    this.arena.scene.cameras.main.shake(220, 0.006 + charge * 0.008);
    Sfx.playAt('piano-crash', x, { volume: 0.9 });
    Sfx.playAt('stone-slam', x, { rate: 0.7, volume: 0.8 });
    this.announce(x, y - 64, hit > 0 ? `🎹 CRASH! ${Math.round(dmg * this.dmgMult(owner))}` : '🎹 CRASH!', tunes ? SOUND.goldRichHi : SOUND.goldHi, 15);
    if (owner === 'player' && this.arena.isOnline) {
      this.arena.broadcastMasteryCast(`sound-piano-land:${Math.round(charge * 100)}:${Math.round(x)}:${Math.round(y)}`);
    }
  }

  /**
   * Dissonance: out of tune from both a Fermata and the piano. The victim moves slower (the
   * mirrored `soundDissonantUntil`, read by every mover) and bleeds until a detonation — or until
   * either stack runs out. Ticked on the attacker's machine; the bleed is attacker-authoritative.
   */
  private updateDissonance(owner: Owner, time: number): void {
    const s = this.sides[owner];
    if (this.isReplica(owner)) return;
    const now = Date.now();
    for (const [t, until] of s.tuned) if (until <= now || !this.alive(t)) s.tuned.delete(t);
    for (const [t, until] of s.pianoTuned) if (until <= now || !this.alive(t)) s.pianoTuned.delete(t);
    for (const [t, until] of s.pianoTuned) {
      const fu = s.tuned.get(t) ?? 0;
      if (fu <= now) continue;
      const ends = Math.min(until, fu);
      t.soundDissonantUntil = Math.max(t.soundDissonantUntil, ends);
      let d = s.dissonance.get(t);
      if (!d) {
        d = { next: time + DISSONANCE_TICK_MS, since: time };
        s.dissonance.set(t, d);
        this.announce(t.x, t.y - 62, '♭♭ DISSONANCE', SOUND.sour, 12);
        this.fx(owner).misfire(t.x, t.y);
      }
      if (time >= d.next) {
        d.next = time + DISSONANCE_TICK_MS;
        this.strike(owner, t, DISSONANCE_TICK_DMG, t.x, t.y);
      }
    }
    for (const t of s.dissonance.keys()) if (!this.isDissonant(owner, t)) s.dissonance.delete(t);
  }

  /** Online: the peer's piano, key by key, and their Autotune's songs. */
  private replayMastery(id: string): void {
    const s = this.sides.npc;
    if (id === 'sound-piano') { this.tryPiano('npc'); return; }
    if (id.startsWith('sound-song:')) {
      const song = id.slice('sound-song:'.length) as SoulSong;
      if (SONG_ORDER.includes(song) && song !== s.song) this.setSong('npc', song, true);
      return;
    }
    const parts = id.split(':');
    if (parts[0] === 'sound-piano-key') {
      const key = Phaser.Math.Clamp(Math.floor(Number(parts[1]) || 0), 0, PIANO_SEMIS.length - 1);
      this.playKey('npc', key);
    } else if (parts[0] === 'sound-piano-fling') {
      this.flingPiano('npc', Phaser.Math.Clamp(Number(parts[1]) / 100 || 0, 0, 1));
    } else if (parts[0] === 'sound-piano-land') {
      const charge = Phaser.Math.Clamp(Number(parts[1]) / 100 || 0, 0, 1);
      const x = Number(parts[2]), y = Number(parts[3]);
      if (Number.isFinite(x) && Number.isFinite(y)) this.crashPiano('npc', x, y, charge);
    }
  }

  /**
   * The bot's half of Forte Piano, fired here rather than from `NpcOpponent` (the rotation only
   * has to leave the bound key alone and stand down while it is seated). The synergy it is cast
   * for: a player the bot has already slammed out of tune — the crash makes it a double stack,
   * Dissonance. Its own recast is kit-fired too, held while the Dissonance bleed works.
   */
  private updateNpcMastery(): void {
    if (this.arena.isOnline || this.arena.isInvasion || !this.pianoSlot('npc')) return;
    const n = this.arena.npc;
    const p = this.arena.player;
    const s = this.sides.npc;
    if (!this.alive(n) || !this.alive(p)) return;
    if (this.tunedAlive('npc', 'piano') && this.npcWantsDetonate('piano')) { this.detonate('npc', 'piano'); return; }
    if (s.piano || s.solo || s.dash || this.now - s.pianoAt < PIANO_COOLDOWN_MS) return;
    const wall = Date.now();
    if (wall < n.disarmedUntil || wall < n.stunnedUntil || wall < n.silencedUntil) return;
    const dist = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    if (dist > NPC_PIANO_RANGE) return;
    const slammed = (s.tuned.get(p) ?? 0) > wall + PIANO_PLAY_MS + PIANO_FLIGHT_MS * 0.5;
    // Five seconds rooted at the keys is a risk up close; it only sits down with room, or for the combo.
    const roomy = dist > 200 && n.hp / Math.max(1, n.maxHp) > 0.45;
    if (slammed || (roomy && Math.random() < 0.004)) this.tryPiano('npc');
  }

  /** Bot synergy: the player wears the piano's Out of Tune but not a slam's — a Fermata makes it Dissonance. */
  npcWantsDoubleStack(): boolean {
    if (this.arena.isOnline) return false;
    const s = this.sides.npc;
    const p = this.arena.player;
    const now = Date.now();
    return (s.pianoTuned.get(p) ?? 0) > now + 1000 && (s.tuned.get(p) ?? 0) <= now;
  }

  /** Which slot the bot gave up for Forte Piano, so its rotation leaves that key alone. */
  npcPianoSlot(): 'r' | 'f' | 'q' | undefined {
    return this.pianoSlot('npc') ?? undefined;
  }

  /** The mastery card: empty while the piano is out, filling from the crash. */
  getPianoCooldownRatio(): number {
    const s = this.sides.player;
    if (s.piano) return 0;
    return Phaser.Math.Clamp((this.now - s.pianoAt) / PIANO_COOLDOWN_MS, 0, 1);
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    this.vizT += delta / 1000;
    this.beatFlash = Math.max(0, this.beatFlash - delta / 300);
    this.fumbleFlash = Math.max(0, this.fumbleFlash - delta / 300);
    this.perfectFlash = Math.max(0, this.perfectFlash - delta / 400);

    for (const owner of BOTH) {
      const on = owner === 'player' ? isPlayerSound : isNpcSound;
      if (!on) {
        // A dormant half (Quantum) must not stay on stage with its absorber hung on the fighter.
        if (this.sides[owner].solo) this.endSolo(owner, false);
        this.endInTune(owner, 0);
        this.sides[owner].gong = null;
        this.sides[owner].piano = null;
        continue;
      }
      const f = this.fighter(owner);
      if (!f) continue;
      if (owner === 'player' || !this.isReplica(owner)) this.tickMetronome(owner, time, delta);
      if (owner === 'npc' && !this.arena.isOnline) this.botMetronome(time);
      this.updateDash(owner, time);
      this.updateBaton(owner, time, delta);
      this.updateDance(owner, time);
      this.updateSong(owner, delta);
      this.updateInTune(owner, time, delta);
      this.updateSolo(owner, time, delta);
      this.updateGong(owner, time);
      this.updatePiano(owner, time, delta);
      this.updateDissonance(owner, time);
      this.updateAutotune(owner, time);
      if (this.alive(f)) { this.trackPath(owner); this.emitPractice(owner, time); }
    }
    if (isPlayerSound) {
      const p = this.sides.player;
      if (this.arena.isOnline && time - this.lastBatonRelayAt >= BATON_RELAY_MS && !p.solo) {
        this.lastBatonRelayAt = time;
        this.arena.broadcastMasteryCast(`sound-baton:${Math.round(p.spin * 100)}:${this.songLevel('player')}`);
      }
      if (time < this.harmonyUntil) {
        this.arena.player.reduceCooldowns(delta * HARMONY_BONUS_PER_STACK * this.harmonyStacks);
      } else this.harmonyStacks = 0;
      this.updateResonator(time);
    }
    if (isNpcSound) this.updateNpcMastery();
    this.updateBassCharges(time);
    this.updateStuns();
    this.watchMisfires();
    this.paintWorld(time);
    this.updateAvatars(delta, isPlayerSound, isNpcSound);
    if (isPlayerSound) {
      this.paintHud(time);
      this.pushStatuses(time);
    }
  }

  /**
   * Hold every stunned fighter still, post-movement. Ours from the map; the player's also from
   * `stunnedUntil`, which is how a peer's stun reaches this sim.
   */
  private updateStuns(): void {
    const now = this.now;
    for (const [f, until] of this.stuns) {
      if (now < until && f.active) { (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0); continue; }
      this.stuns.delete(f);
    }
    const { player } = this.arena;
    if (player?.active && player.stunnedUntil > Date.now()) {
      (player.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
  }

  /** Call out every misfire an Out of Tune fighter suffers. */
  private watchMisfires(): void {
    const list = [this.arena.player, this.arena.npc, ...this.arena.enemies];
    for (const f of list) {
      if (!f?.active || f.lastTuneMissAt <= 0) continue;
      if (this.missSeen.get(f) === f.lastTuneMissAt) continue;
      this.missSeen.set(f, f.lastTuneMissAt);
      if (Date.now() - f.lastTuneMissAt > 500) continue;
      this.pfx.misfire(f.x, f.y);
      this.announce(f.x, f.y - 50, '♭ MISFIRE', SOUND.sour, 11);
      Sfx.playAt('ui-denied', f.x, { rate: 0.8, volume: 0.6 });
    }
  }

  // ── Painting ──────────────────────────────────────────────────────────

  private paintWorld(time: number): void {
    const g = this.ground();
    const a = this.air();
    const st = this.stage();
    g.clear(); a.clear(); st.clear();
    const now = Date.now();

    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      const on = owner === 'player' ? this.playerAvatar !== null : this.npcAvatar !== null;
      if (!on || !f?.active) continue;
      const col = this.col(owner);
      if (s.trail.length > 1) SoundFx.drawMusicTrail(g, col, s.trail, time, DANCE_TRAIL_MS, SONG_COLORS[s.song]);
      const rock = this.rock(owner);
      if (s.solo) {
        if (rock) drawRockStage(st, s.solo.x, s.solo.y + 16, this.vizT);
        else SoundFx.drawStage(st, col, s.solo.x, s.solo.y + 16, this.vizT);
      }
      // The leash, faint, so the reach of the baton is readable.
      if (owner === 'player' && !s.solo) {
        g.lineStyle(1, col(SOUND.maroonPale), 0.08);
        g.strokeCircle(f.x, f.y, BATON_RANGE);
      }
      const vis = f.forceInvisible ? 0 : f.alpha;
      if (!s.solo) {
        if (rock) drawGuitar(a, s.bx, s.by, s.rot, s.spin, this.vizT, vis, col(SONG_COLORS[s.song]));
        else SoundFx.drawBaton(a, col, s.bx, s.by, s.rot, s.spin, this.vizT, vis, SONG_COLORS[s.song]);
        if (owner === 'player') this.paintMiniBeat(a, time, s.bx, s.by + 24);
      }
      if (s.inTune) {
        SoundFx.drawInTune(g, col, f.x, f.y, this.vizT, this.tuneRate(owner) / IN_TUNE_REGEN, SONG_COLORS[s.song], vis);
        if (!s.solo) {
          g.lineStyle(1, col(SONG_PALE[s.song]), 0.18 * vis);
          g.strokeEllipse(f.x, f.y, ECHO_ORBIT_R * 2, ECHO_ORBIT_R * 1.6);
          if (rock) drawGuitar(a, s.echoX, s.echoY, s.rot * 1.4 + 1.2, 0.8, this.vizT, vis * 0.6, col(SONG_PALE[s.song]));
          else SoundFx.drawBaton(a, col, s.echoX, s.echoY, s.rot * 1.4 + 1.2, 0.8, this.vizT, vis * 0.6, SONG_PALE[s.song]);
        }
      }
      if (s.gong) {
        const k = Phaser.Math.Clamp((time - s.gong.start) / GONG_WINDUP_MS, 0, 1);
        const ring = s.gong.struck ? time - s.gong.start - GONG_WINDUP_MS : 0;
        const fade = Phaser.Math.Clamp((s.gong.start + GONG_MS - time) / 300, 0, 1);
        const ringK = Math.max(0.001, ring) * (s.gong.struck ? 1 : 0);
        if (rock) drawGiantCymbal(st, s.gong.x, s.gong.y, s.gong.dir, k, ringK, s.gong.flair, fade);
        else SoundFx.drawGong(st, col, s.gong.x, s.gong.y, s.gong.dir, this.vizT, k, ringK, s.gong.flair, fade);
      }
      if (this.isDeaf(owner)) SoundFx.drawDeaf(a, col, f.x, f.y - 30, this.vizT, vis * Math.min(1, (s.deafUntil - time) / 400));
      if (s.piano) this.paintPiano(st, a, owner, s.piano, time);
      this.paintFollowers(a, owner);
    }

    // Everyone dancing to an Infectious Crescendo gets the floor and the notes.
    const dancers = new Set<Fighter>();
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f?.active || dancers.has(f) || f.soundDanceUntil <= now || f.hp <= 0) continue;
      dancers.add(f);
      const left = f.soundDanceUntil - now;
      SoundFx.drawDancing(g, this.pcol, f.x, f.y, this.vizT, SOUND.staccato, Math.min(1, left / 300) * (f.forceInvisible ? 0 : 1));
    }

    // Everyone out of tune wears the discordant line.
    const seen = new Set<Fighter>();
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f?.active || seen.has(f) || f.outOfTuneUntil <= now || f.hp <= 0) continue;
      seen.add(f);
      const left = f.outOfTuneUntil - now;
      SoundFx.drawOutOfTune(a, this.pcol, f.x, f.y, this.vizT, Math.min(1, left / 400) * (f.forceInvisible ? 0 : 1));
      // Dissonance: a second sour line beating against the first.
      if (f.soundDissonantUntil > now) {
        SoundFx.drawOutOfTune(a, this.pcol, f.x + 3, f.y - 12, this.vizT * 1.37 + 0.5, (f.forceInvisible ? 0 : 0.85));
      }
    }

    for (const c of this.bassCharges) {
      const total = c.explodeAt - c.armedAt;
      const fuse = total > 0 ? Phaser.Math.Clamp((c.explodeAt - time) / total, 0, 1) : 0;
      SoundFx.drawBassCharge(g, this.col(c.owner), c.x, c.y, this.vizT, fuse);
    }
    if (this.harmonyGrenade) {
      const fuse = this.harmonyExplodeAt > 0
        ? 1 - Phaser.Math.Clamp((this.harmonyExplodeAt - time) / Math.max(1, this.harmonyExplodeAt - this.harmonyArmedAt), 0, 1)
        : 0;
      SoundFx.drawGrenade(a, this.pcol, this.harmonyGrenade.x, this.harmonyGrenade.y, this.vizT, fuse);
    }
  }

  /**
   * A pocket copy of the HUD's beat bar riding under the player's baton, so the beat can be kept
   * without looking away from the fight: the gold window at the end, the note sweeping into it.
   */
  private paintMiniBeat(g: Phaser.GameObjects.Graphics, time: number, x: number, y: number): void {
    const s = this.sides.player;
    const col = this.pcol;
    const { phase, idx } = this.beatIndex('player', time);
    const p = phase / BEAT_MS;
    const inWin = phase >= BEAT_MS - WINDOW_MS;
    const played = s.lastHitBeat === idx;
    const w = 56, h = 8, L = x - w / 2, T = y - h / 2;

    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(L + 1, T + 1.5, w, h, 3);
    g.fillStyle(col(SOUND.night), 0.88);
    g.fillRoundedRect(L, T, w, h, 3);
    const winX = L + w * (1 - WINDOW_MS / BEAT_MS);
    g.fillStyle(col(SOUND.gold), inWin ? 0.4 + this.beatFlash * 0.45 : 0.16);
    g.fillRect(winX, T + 1, L + w - winX - 1, h - 2);
    if (this.up('player', 'click')) {
      const px = L + w * ((PERFECT_AT - PERFECT_MS / 2) / BEAT_MS);
      g.fillStyle(col(SOUND.goldRich), 0.6 + this.perfectFlash * 0.4);
      g.fillRect(px, T + 1, w * PERFECT_MS / BEAT_MS, h - 2);
    }
    if (this.fumbleFlash > 0) {
      g.fillStyle(col(SOUND.sour), 0.45 * this.fumbleFlash);
      g.fillRoundedRect(L, T, w, h, 3);
    }
    g.lineStyle(1, col(SOUND.maroonPale), 0.3);
    g.lineBetween(L + 3, y, L + w - 3, y);
    g.lineStyle(1, col(SOUND.gold), 0.85);
    g.strokeRoundedRect(L, T, w, h, 3);
    // The double bar the note lands on.
    const tx = L + w - 3;
    g.lineStyle(1.6, col(SOUND.goldHi), 0.95);
    g.lineBetween(tx, T - 1, tx, T + h + 1);
    // The note, haloed while the window is open.
    const nx = L + 4 + (w - 8) * p;
    if (inWin && !played) { g.fillStyle(col(SOUND.goldHi), 0.3); g.fillCircle(nx, y, 4.5); }
    g.fillStyle(col(played ? SOUND.goldHi : inWin ? SOUND.gold : SOUND.ivory), played ? 0.45 : 1);
    g.fillCircle(nx, y, 2.4);
  }

  private avatar(owner: Owner): SoundRig | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }

  /** Skin rig if one is equipped, else the drum major. */
  private makeAvatar(owner: Owner): SoundRig {
    return (makeSkinAvatar(this.arena.skinId(owner), this.arena.scene) as SoundRig | null)
      ?? new SoundAvatar(this.arena.scene, this.col(owner), owner);
  }

  /** The Rockstar skin swaps the band's gear for concert gear — drawing only. */
  private rock(owner: Owner): boolean { return this.arena.skinId(owner) === 'rockstar'; }
  private rfx(owner: Owner): RockstarFx {
    return (this.rockFx[owner] ??= new RockstarFx(this.arena.scene, this.col(owner)));
  }

  private updateAvatars(delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    const { scene } = this.arena;
    const now = this.now;
    for (const owner of BOTH) {
      const want = owner === 'player' ? isPlayerSound : isNpcSound;
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!want || !f?.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = this.makeAvatar(owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      const faceAt = s.solo
        ? Math.atan2(0, (this.targets(owner)[0]?.x ?? f.x + 1) - f.x)
        : Math.atan2(s.by - f.y, s.bx - f.x);
      av.setFacing(faceAt);
      av.setMastered(owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive);
      // A skin rig paints raw colours, so it is handed the song already through the owner's skin.
      const skinned = !(av instanceof SoundAvatar);
      const songC = SONG_COLORS[s.song], songP = SONG_PALE[s.song];
      av.setSong?.(skinned ? this.col(owner)(songC) : songC, skinned ? this.col(owner)(songP) : songP);
      const dancing = now < s.danceUntil;
      av.setDance?.(dancing ? Phaser.Math.Clamp((now - s.danceStart) / DANCE_MS, 0.3, 1) : 0);
      av.setInstrument?.(s.solo ? 'bugle' : 'none');
      av.setIntensity(s.solo ? 1.4 : dancing ? 1.25 : 1 + s.spin * 0.15);
      // The leading glove reaches toward the baton, conducting it.
      av.setHold(s.solo ? 'brace' : dancing ? 'ride' : s.spin > 0.05 || now < s.grabUntil ? 'reach' : null, faceAt);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────

  private trackY(): number { return this.arena.height - 93; }

  private paintHud(time: number): void {
    const { scene } = this.arena;
    const W = this.arena.width;
    const cx = W / 2;
    const y = this.trackY();
    const g = this.hud();
    g.clear();
    const s = this.sides.player;
    const font = FONT_DISPLAY;
    if (!this.hudLabel) {
      this.hudLabel = scene.add.text(cx - 128, y, '', { fontSize: '10px', fontFamily: font, color: '#ffe8a6', stroke: '#1a0508', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(23);
    }
    if (!this.songLabel) {
      this.songLabel = scene.add.text(cx + 128, y, '', { fontSize: '9px', fontFamily: font, stroke: '#1a0508', strokeThickness: 3, align: 'center' })
        .setOrigin(0.5).setDepth(23).setLineSpacing(2);
    }
    if (!this.soloLabel) {
      this.soloLabel = scene.add.text(cx, 0, '', { fontSize: '12px', fontFamily: font, color: '#ffe8a6', stroke: '#1a0508', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(23);
    }

    this.paintAutotuneToggle(g);
    if (s.solo) {
      this.hudLabel.setVisible(false);
      this.songLabel.setVisible(false);
      this.practiceLabel?.setVisible(false);
      this.paintSoloStaff(g, time, s.solo);
      return;
    }
    this.soloLabel.setVisible(false);
    this.hudLabel.setVisible(true);
    this.songLabel.setVisible(true);

    const col = this.pcol;
    const songCol = SONG_COLORS[s.song];
    const { phase, idx } = this.beatIndex('player', time);
    const p = phase / BEAT_MS;
    const inWin = phase >= BEAT_MS - WINDOW_MS;

    // The plate: a maroon velvet music-stand board in a gold braid frame, with a drop shadow.
    const L = cx - 156, T = y - 17, PW = 312, PH = 34;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(L + 2, T + 3, PW, PH, 7);
    g.fillStyle(col(SOUND.maroonDeep), 0.94);
    g.fillRoundedRect(L, T, PW, PH, 7);
    g.fillStyle(col(SOUND.maroon), 0.55);
    g.fillRoundedRect(L + 2, T + 2, PW - 4, PH * 0.45, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.lineStyle(2, col(SOUND.goldShade), 1);
    g.strokeRoundedRect(L, T, PW, PH, 7);
    g.lineStyle(1, col(SOUND.gold), 0.95);
    g.strokeRoundedRect(L + 2, T + 2, PW - 4, PH - 4, 5);
    // Braid ticks along the top and bottom edge.
    g.fillStyle(col(SOUND.goldHi), 0.55);
    for (let bx = L + 14; bx < L + PW - 10; bx += 9) {
      g.fillRect(bx, T + 0.5, 3, 1.2);
      g.fillRect(bx + 4, T + PH - 1.7, 3, 1.2);
    }
    // Brass studs in the corners.
    for (const [sx, sy] of [[L + 6, T + 6], [L + PW - 6, T + 6], [L + 6, T + PH - 6], [L + PW - 6, T + PH - 6]]) {
      g.fillStyle(col(SOUND.goldShade), 1); g.fillCircle(sx, sy, 2.4);
      g.fillStyle(col(SOUND.goldHi), 1); g.fillCircle(sx - 0.6, sy - 0.6, 1.1);
    }

    // Practice Makes Perfect: the song and its level on a small tab just above the beat bar.
    this.paintPracticeTab(g, cx - 4, T - 6);

    // The spin gauge at the left: a brass medallion with the baton turning at its real speed,
    // ringed by a gold arc that fills with the spin.
    const gx = cx - 128, gy = y - 1;
    g.fillStyle(col(SOUND.night), 1);
    g.fillCircle(gx, gy, 14);
    g.lineStyle(2, col(SOUND.brassShade), 1);
    g.strokeCircle(gx, gy, 14);
    if (s.spin > 0.01) {
      g.lineStyle(2.4, col(songCol), 0.95);
      g.beginPath();
      g.arc(gx, gy, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.spin, false);
      g.strokePath();
    }
    g.lineStyle(1, col(SOUND.brassHi), 0.5);
    g.beginPath(); g.arc(gx, gy, 11.5, Math.PI * 1.1, Math.PI * 1.7, false); g.strokePath();
    if (this.rock('player')) drawGuitar(g, gx, gy + 3, s.rot, s.spin, this.vizT, 0.95, col(songCol), 0.62, false);
    else SoundFx.drawBaton(g, col, gx, gy + 3, s.rot, s.spin, this.vizT, 0.95, songCol);
    this.hudLabel.setPosition(gx, y + 11).setText(`${Math.round(s.spin * 100)}%`);

    // The beat bar, written as a stave: five lines, a clef, a moving note that lands on the
    // double bar at the far end on the beat.
    const barX = cx - 104, barW = 200, barT = y - 10, barH = 20;
    g.fillStyle(col(SOUND.night), 0.97);
    g.fillRoundedRect(barX, barT, barW, barH, 4);
    // The beat window as a warm gold spotlight that blooms when it is open.
    const winX = barX + barW * (1 - WINDOW_MS / BEAT_MS);
    const winA = inWin ? 0.4 + this.beatFlash * 0.45 : 0.14;
    for (let i = 0; i < 3; i++) {
      g.fillStyle(col(SOUND.gold), winA * (0.35 + i * 0.25));
      g.fillRect(winX + (barX + barW - winX) * i * 0.22, barT + 1, (barX + barW - winX) * (1 - i * 0.22) - 1, barH - 2);
    }
    // Musical Perfection: the small, richer gold bar in the middle of the window.
    if (this.up('player', 'click')) {
      const px = barX + barW * ((PERFECT_AT - PERFECT_MS / 2) / BEAT_MS);
      const pw = barW * PERFECT_MS / BEAT_MS;
      g.fillStyle(col(SOUND.goldRich), (inWin ? 0.75 : 0.5) + this.perfectFlash * 0.25);
      g.fillRect(px, barT + 1, pw, barH - 2);
      g.lineStyle(1, col(SOUND.goldRichHi), 0.9);
      g.lineBetween(px, barT + 1, px, barT + barH - 1);
      g.lineBetween(px + pw, barT + 1, px + pw, barT + barH - 1);
      if (this.perfectFlash > 0) {
        g.fillStyle(col(SOUND.goldRichHi), 0.5 * this.perfectFlash);
        g.fillRect(px - 3, barT - 2, pw + 6, barH + 4);
      }
    }
    if (this.fumbleFlash > 0) {
      g.fillStyle(col(SOUND.sour), 0.38 * this.fumbleFlash);
      g.fillRoundedRect(barX, barT, barW, barH, 4);
    }
    g.lineStyle(1, col(SOUND.maroonPale), 0.32);
    for (let i = -2; i <= 2; i++) g.lineBetween(barX + 4, y + i * 3.6, barX + barW - 4, y + i * 3.6);
    // Measure bars sliding left with the beat, so the stave reads as music moving past.
    g.lineStyle(1, col(SOUND.maroonPale), 0.28);
    for (let k = 0; k < 4; k++) {
      const mx = barX + 24 + ((k / 4 + (1 - p) / 4) % 1) * (barW - 40);
      g.lineBetween(mx, y - 7.2, mx, y + 7.2);
    }
    drawClef(g, barX + 10, y, 9, col(SOUND.goldHi), 0.85);
    g.lineStyle(1, col(SOUND.gold), 0.9);
    g.strokeRoundedRect(barX, barT, barW, barH, 4);
    // The double bar the note lands on.
    const tx = barX + barW - 7;
    g.lineStyle(1.2, col(SOUND.goldHi), 0.95);
    g.lineBetween(tx - 3, barT + 2, tx - 3, barT + barH - 2);
    g.lineStyle(2.6, col(SOUND.goldHi), 0.95);
    g.lineBetween(tx, barT - 1, tx, barT + barH + 1);
    // A little brass metronome pendulum above the target, swinging on the beat.
    const swing = Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5;
    g.lineStyle(1.4, col(SOUND.brass), 0.95);
    g.lineBetween(tx, barT - 1, tx + Math.sin(swing) * 9, barT - 1 - Math.cos(swing) * 9);
    g.fillStyle(col(SOUND.brassHi), 1);
    g.fillCircle(tx + Math.sin(swing) * 6, barT - 1 - Math.cos(swing) * 6, 1.8);
    // The note itself, with a soft halo while it is inside the window.
    const played = s.lastHitBeat === idx;
    const nx = barX + 22 + (barW - 30) * p;
    if (inWin && !played) { g.fillStyle(col(SOUND.goldHi), 0.25); g.fillCircle(nx, y + 2, 8); }
    g.fillStyle(col(played ? SOUND.goldHi : inWin ? SOUND.gold : SOUND.ivory), played ? 0.45 : 1);
    musicNote(g, nx, y + 3, 5, -0.15, { flags: 1 });

    // The song on the right: its name over a soft spotlight in the song's colour, with a gold
    // rule beneath and the combo under that.
    const jx = cx + 128;
    g.fillStyle(col(songCol), 0.16 + 0.06 * Math.sin(this.vizT * 4));
    g.fillEllipse(jx, y, 54, 26);
    g.lineStyle(1, col(SOUND.gold), 0.6);
    g.lineBetween(jx - 18, y + 1, jx + 18, y + 1);
    g.fillStyle(col(SOUND.goldHi), 0.9);
    g.fillCircle(jx, y + 1, 1.4);
    this.songLabel.setPosition(jx, y).setText(`${SONG_NAMES[s.song]}${s.combo >= 2 ? `\n×${s.combo}` : ''}`)
      .setColor(`#${col(songCol).toString(16).padStart(6, '0')}`);
  }

  /** Mastery: the Autotune switch under the HP bar — only there while the mastery is on. */
  private paintAutotuneToggle(g: Phaser.GameObjects.Graphics): void {
    if (!this.masteryOn('player')) { this.autotuneLabel?.setVisible(false); return; }
    const { cx, cy } = this.toggleRect();
    const s = this.sides.player;
    const ptr = this.arena.scene.input.activePointer;
    const hover = ptr && this.overAutotuneToggle(ptr.worldX, ptr.worldY) ? 1 : 0;
    drawAutotuneToggle(g, this.pcol, cx, cy, TOGGLE_W, TOGGLE_H, autotuneOn, SONG_COLORS[s.song], hover);
    if (!this.autotuneLabel) {
      this.autotuneLabel = this.arena.scene.add.text(0, 0, '', {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color: '#ffe8a6', stroke: '#1a0508', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(23);
    }
    this.autotuneLabel.setVisible(true).setPosition(cx - 15, cy)
      .setText(autotuneOn ? '♪ AUTOTUNE ON' : '♪ AUTOTUNE OFF')
      .setColor(autotuneOn ? '#ffe8a6' : '#8a90a6');
  }

  /** The grand piano at the keys, or the piano in the air and the shadow it is falling into. */
  private paintPiano(st: Phaser.GameObjects.Graphics, a: Phaser.GameObjects.Graphics, owner: Owner, p: Piano, time: number): void {
    const col = this.col(owner);
    const el = time - p.start;
    if (p.phase === 'play') {
      drawPiano(st, col, p.x, p.y, p.flash, p.charge, this.vizT);
      // Seconds left at the keys, in a little gold count over the lid.
      const left = Math.max(0, PIANO_PLAY_MS - el) / PIANO_PLAY_MS;
      st.lineStyle(2, col(SOUND.goldHi), 0.85);
      st.beginPath();
      st.arc(p.x + 98, p.y - 70, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false);
      st.strokePath();
      return;
    }
    const k = Phaser.Math.Clamp(el / PIANO_FLIGHT_MS, 0, 1);
    drawPianoTarget(st, col, p.tx, p.ty, PIANO_RADIUS, k, p.locked, this.vizT);
    // Up off the floor for the first fifth, gone above the field, then down onto the mark.
    if (k < 0.22) {
      const u = k / 0.22;
      drawPiano(st, col, p.x, p.y, p.flash, p.charge, this.vizT, 1 - u, u * 3);
      drawPianoAirborne(a, col, p.x, p.y - 60 - u * u * 420, 1.6 - u * 0.6, u * 2.5, this.vizT);
    } else if (k > 0.78) {
      const u = (k - 0.78) / 0.22;
      drawPianoAirborne(a, col, p.tx, p.ty - (1 - u * u) * 480, 0.7 + u * 0.9, (1 - u) * 3 + 0.2, this.vizT);
    }
  }

  /** The level tab: song name and level on the left, ten pips filling on the right. */
  private paintPracticeTab(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    if (!this.up('player', 'f')) { this.practiceLabel?.setVisible(false); return; }
    const s = this.sides.player;
    const col = this.pcol;
    const songCol = SONG_COLORS[s.song];
    const lvl = this.songLevel('player');
    const into = lvl >= PRACTICE_MAX_LEVEL ? 1 : (s.practice[s.song] % PRACTICE_HITS_PER_LEVEL) / PRACTICE_HITS_PER_LEVEL;
    const w = 150, h = 12;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 1.5, w, h, { tl: 5, tr: 5, bl: 0, br: 0 });
    g.fillStyle(col(SOUND.maroonDeep), 0.94);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, { tl: 5, tr: 5, bl: 0, br: 0 });
    g.lineStyle(1, col(SOUND.gold), 0.85);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, { tl: 5, tr: 5, bl: 0, br: 0 });
    for (let i = 0; i < PRACTICE_MAX_LEVEL; i++) {
      const px = x + 12 + i * 6, py = y;
      g.fillStyle(col(SOUND.night), 1);
      g.fillCircle(px, py, 2.3);
      if (i < lvl) { g.fillStyle(col(songCol), 1); g.fillCircle(px, py, 2.1); }
      else if (i === lvl && into > 0) { g.fillStyle(col(songCol), 0.35 + into * 0.4); g.fillCircle(px, py, 2.1 * into); }
    }
    if (!this.practiceLabel) {
      this.practiceLabel = this.arena.scene.add.text(0, 0, '', {
        fontSize: '8px', fontFamily: FONT_DISPLAY, stroke: '#1a0508', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(23);
    }
    this.practiceLabel.setVisible(true).setPosition(x - 34, y)
      .setText(`${SONG_NAMES[s.song]} · LV ${lvl}`)
      .setColor(`#${col(songCol).toString(16).padStart(6, '0')}`);
  }

  /** The solo's staff: three lines, the bar on the left, notes scrolling in from the right. */
  private paintSoloStaff(g: Phaser.GameObjects.Graphics, time: number, solo: Solo): void {
    const W = this.arena.width;
    const cx = W / 2;
    const panelW = Math.min(640, W - 40);
    const left = cx - panelW / 2;
    const top = this.arena.height - 210;
    const panelH = 104;
    const gap = 26;
    const midY = top + panelH / 2 + 4;
    const laneY = (i: number) => midY + (i - 1) * gap;
    const hitX = left + 70;
    const el = solo.el;
    const col = this.pcol;

    // A concert-hall score board: drop shadow, maroon velvet, a gilt double frame with
    // scrolled corners, and stage-light sheen sweeping across.
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(left + 3, top + 4, panelW, panelH, 10);
    g.fillStyle(col(SOUND.maroonDeep), 0.93);
    g.fillRoundedRect(left, top, panelW, panelH, 10);
    g.fillStyle(col(SOUND.shade), 0.75);
    g.fillRoundedRect(left + 6, top + 6, panelW - 12, panelH - 12, 7);
    const sheen = left + ((this.vizT * 90) % (panelW + 120)) - 60;
    g.fillStyle(col(SOUND.goldHi), 0.05);
    g.fillPoints([
      new Phaser.Geom.Point(sheen, top + 6), new Phaser.Geom.Point(sheen + 34, top + 6),
      new Phaser.Geom.Point(sheen + 6, top + panelH - 6), new Phaser.Geom.Point(sheen - 28, top + panelH - 6),
    ].map((pt) => new Phaser.Geom.Point(Phaser.Math.Clamp(pt.x, left + 6, left + panelW - 6), pt.y)), true);
    g.lineStyle(2.5, col(SOUND.goldShade), 1);
    g.strokeRoundedRect(left, top, panelW, panelH, 10);
    g.lineStyle(1.2, col(SOUND.gold), 0.95);
    g.strokeRoundedRect(left + 3, top + 3, panelW - 6, panelH - 6, 8);
    g.lineStyle(1, col(SOUND.maroonHi), 0.9);
    g.strokeRoundedRect(left + 6, top + 6, panelW - 12, panelH - 12, 7);
    for (const [kx, ky, sx, sy] of [[left, top, 1, 1], [left + panelW, top, -1, 1], [left, top + panelH, 1, -1], [left + panelW, top + panelH, -1, -1]]) {
      g.lineStyle(1.4, col(SOUND.goldHi), 0.9);
      g.beginPath();
      g.arc(kx + sx * 14, ky + sy * 14, 6, 0, Math.PI * 2);
      g.strokePath();
      g.fillStyle(col(SOUND.gold), 1);
      g.fillCircle(kx + sx * 14, ky + sy * 14, 2.4);
      g.lineBetween(kx + sx * 20, ky + sy * 14, kx + sx * 34, ky + sy * 14);
      g.lineBetween(kx + sx * 14, ky + sy * 20, kx + sx * 14, ky + sy * 30);
    }

    // The line you are on, lit.
    g.fillStyle(col(SOUND.gold), 0.12);
    g.fillRect(left + 8, laneY(solo.lane) - gap / 2 + 2, panelW - 16, gap - 4);
    for (let i = 0; i < LANES; i++) {
      g.lineStyle(i === solo.lane ? 2 : 1.4, col(i === solo.lane ? SOUND.goldHi : SOUND.maroonPale), i === solo.lane ? 0.95 : 0.6);
      g.lineBetween(left + 14, laneY(i), left + panelW - 14, laneY(i));
    }
    // A treble clef at the head of the staff, spanning all three lines.
    drawClef(g, left + 24, midY, gap * 0.9, col(SOUND.goldHi), 0.85);

    // The bar you play on, with the bugle bell sitting on your line.
    g.fillStyle(col(SOUND.gold), 0.2 + this.beatFlash * 0.35);
    g.fillRect(hitX - 14, top + 10, 28, panelH - 20);
    g.lineStyle(2.5, col(SOUND.goldHi), 0.95);
    g.lineBetween(hitX, top + 10, hitX, top + panelH - 10);
    if (this.fumbleFlash > 0) {
      g.fillStyle(col(SOUND.sour), 0.3 * this.fumbleFlash);
      g.fillRect(hitX - 14, top + 10, 28, panelH - 20);
    }
    g.fillStyle(col(SOUND.brass), 1);
    g.fillTriangle(hitX - 22, laneY(solo.lane), hitX - 34, laneY(solo.lane) - 9, hitX - 34, laneY(solo.lane) + 9);
    g.fillStyle(col(SOUND.brassHi), 1);
    g.fillCircle(hitX - 34, laneY(solo.lane), 3);

    const xOf = (at: number) => hitX + (at - el) * SOLO_SCROLL;
    const right = left + panelW - 14;
    for (const n of solo.notes) {
      const hx = xOf(n.at);
      const tailEnd = xOf(n.at + n.len);
      if (hx > right + 20) continue;
      if (n.kind !== 'slur' && hx < left + 6) continue;
      if (n.kind === 'slur' && tailEnd < left + 6) continue;
      const done = n.state === 'hit' || n.state === 'held';
      const bad = n.state === 'missed' || n.state === 'broken';
      const c = done ? SOUND.goldHi : bad ? SOUND.steelDark : n.kind === 'slur' ? SOUND.melodyPale : SOUND.ivory;
      const a = done ? 0.35 : bad ? 0.5 : 1;

      if (n.kind === 'slur') {
        // The tail: a band along the line, stepping to the next line where the slur moves,
        // with the slur's arc drawn over the top of it.
        const sx = Math.max(left + 8, hx);
        const midX = xOf(n.at + n.len * n.switchAt);
        const ex = Math.min(right, tailEnd);
        const live = n.state === 'holding';
        g.fillStyle(col(live ? SOUND.gold : c), (live ? 0.75 : 0.45) * (bad ? 0.5 : 1));
        if (sx < Math.min(midX, ex)) g.fillRect(sx, laneY(n.lane) - 4, Math.min(midX, ex) - sx, 8);
        if (n.laneTo !== n.lane && midX < ex) {
          g.fillRect(Math.max(sx, midX), laneY(n.laneTo) - 4, ex - Math.max(sx, midX), 8);
          if (midX > sx && midX < ex) g.fillRect(midX - 3, Math.min(laneY(n.lane), laneY(n.laneTo)) - 4, 6, gap + 8);
        } else if (midX < ex) {
          g.fillRect(Math.max(sx, midX), laneY(n.lane) - 4, ex - Math.max(sx, midX), 8);
        }
        // The arc.
        const arcY = Math.min(laneY(n.lane), laneY(n.laneTo)) - 16;
        g.lineStyle(2, col(c), a);
        g.beginPath();
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const px = hx + (tailEnd - hx) * u;
          const py = arcY - Math.sin(Math.PI * u) * 8;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        if (tailEnd <= right) { g.fillStyle(col(c), a); g.fillCircle(tailEnd, laneY(n.laneTo), 4); }
      }
      if (hx >= left + 6 && hx <= right + 20) {
        const flags = n.kind === 'eighth' ? 1 : n.kind === 'sixteenth' ? 2 : 0;
        const ny = laneY(n.lane);
        if (!done && !bad) { g.fillStyle(col(SOUND.gold), 0.18); g.fillCircle(hx, ny, 11); }
        g.fillStyle(col(c), a);
        musicNote(g, hx, ny, 7, -0.25, { flags, stemDown: n.lane === 0 });
      }
    }

    // Big Finish: a flair gauge in the top-right corner of the board, filling with the tempo.
    const finish = this.up('player', 'q');
    if (finish) {
      const fw = 110, fx0 = left + panelW - fw - 22, fy = top + 12;
      const k = (solo.tempo - 1) / (FLAIR_MAX_TEMPO - 1);
      g.fillStyle(col(SOUND.night), 0.95);
      g.fillRoundedRect(fx0, fy, fw, 7, 3);
      g.fillStyle(col(k > 0.66 ? SOUND.goldRich : SOUND.bronze), 1);
      if (k > 0) g.fillRoundedRect(fx0, fy, Math.max(4, fw * k), 7, 3);
      g.lineStyle(1, col(SOUND.goldHi), 0.8);
      g.strokeRoundedRect(fx0, fy, fw, 7, 3);
      if (solo.speeding) { g.fillStyle(col(SOUND.goldRichHi), 0.3 + 0.2 * Math.sin(this.vizT * 20)); g.fillRoundedRect(fx0 - 2, fy - 2, fw + 4, 11, 4); }
    }
    const left2 = Math.max(0, Math.ceil((solo.endEl - solo.el) / solo.tempo / 1000));
    this.soloLabel!.setVisible(true).setPosition(cx, top - 12)
      .setText(`🎺 CALL OF THE VOID   ×${solo.combo}   ${solo.hits} hit   ${left2}s${finish ? `   ${solo2(solo.tempo)}× flair` : ''}   [W/S · ↑/↓ line · click${finish ? ' · hold Space: faster' : ''} · Q bow]`);
  }

  private pushStatuses(time: number): void {
    const s = this.sides.player;
    const song = s.song;
    const pw = this.songPower('player');
    const pct = (v: number): number => Math.round(v * pw * 100);
    const desc: Record<SoulSong, string> = {
      staccato: `+${pct(STACCATO_DMG - 1)}% damage. The baton travels ${pct(STACCATO_BATON_SPEED - 1)}% faster and loses its spin ${Math.round(Math.min(0.9, (1 - STACCATO_DECAY) * pw) * 100)}% slower.`,
      melody: `+${pct(MELODY_SPEED - 1)}% move speed and ${pct(MELODY_CD_RATE)}% faster cooldowns.`,
      smooth: `${Math.round(Math.min(0.6, (1 - SMOOTH_RES) * pw) * 100)}% damage resistance and ${(SMOOTH_REGEN * pw).toFixed(1)} HP a second.`,
    };
    const lvl = this.songLevel('player');
    this.arena.setStatusIndicator('sound-song', {
      name: `Soul Song: ${SONG_NAMES[song][0]}${SONG_NAMES[song].slice(1).toLowerCase()}`,
      emoji: song === 'staccato' ? '🔴' : song === 'melody' ? '🔵' : '🟢',
      color: this.pcol(SONG_COLORS[song]), priority: 124,
      description: `${desc[song]}${lvl > 0 ? ` Practised to level ${lvl}.` : ''} F changes the song.`,
    });
    const spin = Math.round(s.spin * 100);
    this.arena.setStatusIndicator('sound-spin', spin > 0 ? {
      name: 'Baton Spin', emoji: '🪄', color: this.pcol(SOUND.gold), priority: 125,
      description: `Your baton hits for ${Math.round((BATON_DMG + BATON_DMG_SPIN * s.spin) * this.dmgMult('player'))} on contact. Click on the metronome's notes to spin it faster.`,
      count: spin, suffix: '%',
    } : null);
    this.arena.setStatusIndicator('sound-dance', time < s.danceUntil ? {
      name: 'Crescendo', emoji: '💃', color: this.pcol(SOUND.goldHi), priority: 126,
      description: 'Dancing — speeding up, and about to let go a wave of music.', until: s.danceUntil,
    } : null);
    this.arena.setStatusIndicator('sound-harmony', time < this.harmonyUntil && this.harmonyStacks > 0 ? {
      name: 'Harmony', emoji: '🌟', color: this.pcol(SOUND.goldHi), priority: 127,
      description: `+${Math.round(this.harmonyStacks * HARMONY_BONUS_PER_STACK * 100)}% move and attack speed.`,
      until: this.harmonyUntil, count: this.harmonyStacks,
    } : null);
    const rate = s.inTune ? this.tuneRate('player') : 0;
    this.arena.setStatusIndicator('sound-intune', s.inTune ? {
      name: 'In Tune', emoji: rate >= 0 ? '🎶' : '🎵', color: this.pcol(rate >= 0 ? SOUND.smooth : SOUND.sour), priority: 128,
      description: `Your soul song plays ${Math.round((IN_TUNE_POWER - 1) * 100)}% stronger and an echo baton circles you. `
        + `${rate >= 0 ? `Healing ${rate.toFixed(1)} HP a second` : `Hurting you ${(-rate).toFixed(1)} HP a second`}, falling. `
        + `R now: ${s.tuneNet >= 0 ? `+${Math.round(s.tuneNet)} HP` : `${Math.round(s.tuneNet)} HP`}.`,
      until: s.inTuneStart + IN_TUNE_MAX_MS,
    } : null);
    this.arena.setStatusIndicator('sound-deaf', this.isDeaf('player') ? {
      name: 'Deaf', emoji: '🔇', color: this.pcol(SOUND.steel), priority: 129,
      description: 'Your ears are still ringing from the gong. Nothing you do deals damage.',
      until: s.deafUntil,
    } : null);
    const pi = s.piano;
    this.arena.setStatusIndicator('sound-piano', pi ? {
      name: 'Forte Piano', emoji: '🎹', color: this.pcol(pi.charge >= PIANO_TUNE_AT ? SOUND.goldRich : SOUND.gold), priority: 131,
      description: pi.phase === 'play'
        ? `At the keys — click the white ones. Charge ${Math.round(pi.charge * 100)}%: the crash will hit for ${Math.round(PIANO_DMG_MIN + (PIANO_DMG_MAX - PIANO_DMG_MIN) * pi.charge)}${pi.charge >= PIANO_TUNE_AT ? ' and leave them Out of Tune' : ''}.`
        : 'In the air — it comes down on your cursor.',
      count: Math.round(pi.charge * 100), suffix: '%',
    } : null);
    this.arena.setStatusIndicator('sound-tempo', time < s.selfTapUntil ? {
      name: 'Tempo', emoji: '⏩', color: this.pcol(SOUND.goldRich), priority: 130,
      description: `+${Math.round((SELF_TAP_SPEED - 1) * 100)}% move speed — you tapped yourself with the baton.`,
      until: s.selfTapUntil,
    } : null);
  }

  // ── Bass perk (water + sound) ─────────────────────────────────────────

  private layBassRow(owner: Owner, sx: number, sy: number, tx: number, ty: number): void {
    const W = this.arena.width, H = this.arena.height;
    const dx = tx - sx, dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const half = (BASS_CHARGE_COUNT - 1) / 2;
    const time = this.now;
    for (let i = 0; i < BASS_CHARGE_COUNT; i++) {
      const off = (i - half) * BASS_CHARGE_SPACING;
      const cx = Phaser.Math.Clamp(tx + ux * off, 16, W - 16);
      const cy = Phaser.Math.Clamp(ty + uy * off, 16, H - 16);
      this.bassCharges.push({ x: cx, y: cy, owner, armedAt: time, explodeAt: time + BASS_FUSE_MS + i * BASS_FUSE_STEP_MS });
      this.fx(owner).ripple(cx, cy, 4, 20, SOUND.aqua, 260, 2.4, 8, 6);
    }
  }

  private updateBassCharges(time: number): void {
    for (let i = this.bassCharges.length - 1; i >= 0; i--) {
      const c = this.bassCharges[i];
      if (time < c.explodeAt) continue;
      this.bassCharges.splice(i, 1);
      const fx = this.fx(c.owner);
      fx.boom(c.x, c.y, BASS_CHARGE_RADIUS, { color: SOUND.aqua, petals: 7, notes: 3, duration: 380 });
      fx.ripple(c.x, c.y, 8, BASS_CHARGE_RADIUS, SOUND.foam, 340, 3.5, 7, 7);
      for (const t of this.targets(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > BASS_CHARGE_RADIUS) continue;
        if (this.isReplica(c.owner) && t === this.arena.player) continue;
        if (this.isDeaf(c.owner)) continue;
        t.takeDamage(BASS_CHARGE_DAMAGE, { source: c, sourceX: c.x, sourceY: c.y });
      }
    }
  }

  // ── Harmony perk (slime + sound + light) ──────────────────────────────

  /** Every eighth beat in a row lobs a brass resonator at the baton. */
  private throwResonator(time: number): void {
    if (!this.arena.hasPerk('player', 'harmony')) return;
    if (time < this.harmonyNextThrowAt || this.harmonyGrenade) return;
    this.harmonyNextThrowAt = time + HARMONY_COOLDOWN_MS;
    const { player, scene } = this.arena;
    const s = this.sides.player;
    const gx = s.bx, gy = s.by;
    const travel = Phaser.Math.Clamp(Phaser.Math.Distance.Between(player.x, player.y, gx, gy) / 1.2, 100, 400);
    const gren = { x: player.x, y: player.y };
    this.harmonyGrenade = gren;
    this.pfx.waveBurst(player.x, player.y, Math.atan2(gy - player.y, gx - player.x), 1, 9, SOUND.gold);
    scene.tweens.add({
      targets: gren, x: gx, y: gy, duration: travel, ease: 'Linear',
      onComplete: () => {
        if (!player.active) { this.harmonyGrenade = null; return; }
        this.harmonyArmedAt = scene.time.now;
        this.harmonyExplodeAt = scene.time.now + HARMONY_FUSE_MS;
      },
    });
  }

  private updateResonator(time: number): void {
    if (this.harmonyExplodeAt === 0 || time < this.harmonyExplodeAt || !this.harmonyGrenade) return;
    this.harmonyExplodeAt = 0;
    const ex = this.harmonyGrenade.x, ey = this.harmonyGrenade.y;
    this.harmonyGrenade = null;
    const { player, scene } = this.arena;
    this.pfx.boom(ex, ey, HARMONY_RADIUS, { color: SOUND.gold, petals: 9, notes: 6 });
    scene.cameras.main.shake(160, 0.005);
    let hitAny = false;
    for (const t of this.targets('player')) {
      if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) > HARMONY_RADIUS) continue;
      if (this.isDeaf('player')) continue;
      t.takeDamage(HARMONY_DAMAGE);
      hitAny = true;
    }
    if (!hitAny) return;
    this.harmonyStacks = Math.min(HARMONY_MAX_STACKS, this.harmonyStacks + meterGain(player, 1));
    this.harmonyUntil = time + HARMONY_BUFF_MS;
    this.pfx.sparkle(player.x, player.y, 9, 34, 10, SOUND.gold);
    this.announce(ex, ey - 30, `🌟 HARMONY ×${this.harmonyStacks}`, SOUND.goldHi, 11);
  }

  // ── Ruin contract ─────────────────────────────────────────────────────

  /** Sound leaves nothing standing on the field for a purge to raze. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    void x; void y; void radius; void exceptOwner; void report;
    return 0;
  }
}

/** A tempo, written the way a conductor would call it: 1.35. */
function solo2(v: number): string { return v.toFixed(2); }

/** A treble clef in one stroked path: the curl round the G line, the tall loop, the tail. */
function drawClef(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, color: number, alpha: number): void {
  g.lineStyle(1.4, color, alpha);
  g.beginPath();
  // Spiral out from the G line.
  const cy = y + h * 0.25;
  for (let i = 0; i <= 18; i++) {
    const u = i / 18;
    const a = Math.PI * 0.5 + u * Math.PI * 2.1;
    const r = h * 0.12 + u * h * 0.32;
    const px = x + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  // Up to the top loop, over, and straight down the spine to the tail.
  g.lineTo(x + h * 0.25, y - h * 0.7);
  g.lineTo(x + h * 0.05, y - h * 1.05);
  g.lineTo(x - h * 0.1, y - h * 0.75);
  g.lineTo(x + h * 0.1, y + h * 0.95);
  g.lineTo(x - h * 0.12, y + h * 1.1);
  g.strokePath();
  g.fillStyle(color, alpha);
  g.fillCircle(x - h * 0.12, y + h * 1.05, 1.5);
}
