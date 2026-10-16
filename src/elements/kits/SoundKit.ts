import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  SOUND, SONG_COLORS, SONG_NAMES, SONG_ORDER, SONG_PALE, SoulSong, SoundAvatar, SoundColorFn, SoundFx,
  musicNote, musicNoteLayered,
} from './SoundVisuals';
import { CustomStatus } from './StatusHudKit';
import { meterGain } from '../../combat/Meters';
import { Sfx } from '../../audio';

type Owner = 'player' | 'npc';
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
  /** The bot's difficulty rung, 1–5 — how often it keeps time on the metronome and the solo. */
  readonly npcLevel: number;
  readonly masteryActive: boolean;
  readonly npcMasteryActive: boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  /** Whether that side is playing Sound right now (Quantum's active half included). */
  isSound(owner: Owner): boolean;
  /** Invasion: hidden or not-yet-arrived husks are not fair game. */
  isTargetable(f: Fighter): boolean;
  /** Publish (or with `null`, clear) one of this kit's buffs in the top-right effect tray. */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  soundColor(owner: Owner, base: number): number;
  /** Online: presses that are not cooldown casts travel as pseudo-cast ids. */
  broadcastMasteryCast(id: string): void;
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
  end: number;
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
  tuned: Set<Fighter>;
  // Songs
  regenAccum: number;
  resOwned: boolean;
  path: { x: number; y: number }[];
  walkAccum: number;
  // Solo
  solo: Solo | null;
}

function freshSide(): Side {
  return {
    song: 'staccato',
    metroStart: 0, lastHitBeat: -1, lastSeenBeat: -1, spin: 0, combo: 0,
    bx: 0, by: 0, rot: 0, aimX: 0, aimY: 0, batonHits: new Map(), batonPlaced: false,
    npcBeat: -1, npcBeatHit: false, npcBeatAt: 0,
    danceStart: 0, danceUntil: 0, trail: [],
    dash: null, grabUntil: 0, tuned: new Set(),
    regenAccum: 0, resOwned: false, path: [], walkAccum: 0,
    solo: null,
  };
}

const LANES = 3;

// ── SoundKit ──────────────────────────────────────────────────────────────

export class SoundKit {
  private readonly pcol: SoundColorFn;
  private readonly ncol: SoundColorFn;
  private readonly pfx: SoundFx;
  private readonly nfx: SoundFx;
  private playerAvatar: SoundAvatar | null = null;
  private npcAvatar: SoundAvatar | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private stageGfx: Phaser.GameObjects.Graphics | null = null;
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private hudLabel: Phaser.GameObjects.Text | null = null;
  private songLabel: Phaser.GameObjects.Text | null = null;
  private soloLabel: Phaser.GameObjects.Text | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: freshSide(), npc: freshSide() };
  private pointerWasDown = false;
  private laneUpWas = false;
  private laneDownWas = false;
  private lastBatonRelayAt = 0;
  /** 1 the instant a beat is hit (or fumbled), decaying — flashes the HUD window. */
  private beatFlash = 0;
  private fumbleFlash = 0;

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

  private dmgMult(owner: Owner): number {
    return this.sides[owner].song === 'staccato' ? STACCATO_DMG : 1;
  }

  /** The one place this kit deals damage. A replica never hurts our player — the relay does. */
  private strike(owner: Owner, t: Fighter, base: number, x: number, y: number): void {
    if (this.isReplica(owner) && t === this.arena.player) return;
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

  /** True while the player is on the stage and cannot move. */
  isPerforming(): boolean { return this.sides.player.solo !== null; }

  getPlayerSpeedMult(): number { return this.speedMult('player'); }

  /** The bot's own speed — pulled by ArenaScene. The peer's replica moves by the network. */
  getNpcSpeedMult(): number { return this.arena.isOnline ? 1 : this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    const s = this.sides[owner];
    const now = this.now;
    let m = 1;
    if (s.song === 'melody') m *= MELODY_SPEED;
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
    for (const g of [this.groundGfx, this.airGfx, this.stageGfx, this.hudGfx]) g?.destroy();
    this.groundGfx = null; this.airGfx = null; this.stageGfx = null; this.hudGfx = null;
    for (const t of [this.hudLabel, this.songLabel, this.soloLabel]) t?.destroy();
    this.hudLabel = null; this.songLabel = null; this.soloLabel = null;
    this.vizT = 0;
    // The old fighters (and any absorber hung on them) died with the old match.
    this.sides = { player: freshSide(), npc: freshSide() };
    this.pointerWasDown = false;
    this.laneUpWas = false;
    this.laneDownWas = false;
    this.lastBatonRelayAt = 0;
    this.beatFlash = 0;
    this.fumbleFlash = 0;
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

    if (s.solo) {
      this.soloInput(time, justDown, down);
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.endSolo('player', true);
      return;
    }
    if (s.dash) return;

    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);
    if (justDown) player.castAbility('baton', ctx());
    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('crescendo', ctx());
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      // The detonation is free and outranks a fresh slam: anyone still out of tune gets it.
      if (this.tunedAlive('player')) this.detonate('player');
      else player.castAbility('fermata', ctx());
    }
    if (Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('hum', ctx());
    if (Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('call-of-the-void', ctx());
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
      case 'fermata': this.startFermata(owner, tx, ty); break;
      case 'hum': this.cycleSong(owner); break;
      case 'call-of-the-void': this.startSolo(owner); break;
      // The bot's free recast — not an ability, so it never goes through castAbility.
      case 'fermata-detonate': if (owner === 'npc') this.doNpcDetonate(); break;
    }
  }

  /** Online: the peer's presses that were not cooldown casts. */
  replayNet(id: string, tx: number, ty: number): void {
    const s = this.sides.npc;
    if (id.startsWith('sound-baton:')) {
      s.aimX = tx; s.aimY = ty;
      s.spin = Phaser.Math.Clamp(Number(id.slice('sound-baton:'.length)) / 100 || 0, 0, 1);
    } else if (id === 'sound-detonate') {
      this.detonate('npc');
    } else if (id === 'sound-solo-end') {
      this.endSolo('npc', false);
    } else if (id.startsWith('sound-solo-hit')) {
      const big = id.endsWith(':big');
      const solo = s.solo;
      const { player } = this.arena;
      if (solo && this.alive(player)) this.nfx.noteShot(solo.x + 30, solo.y - 26, player.x, player.y, SOUND.gold, big);
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
      s.spin = Math.min(1, s.spin + SPIN_PER_HIT);
      s.combo++;
      this.fx(owner).batonFlourish(s.bx, s.by - 10, SONG_COLORS[s.song]);
      if (owner === 'player') {
        this.beatFlash = 1;
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
    const decay = SPIN_DECAY * (s.song === 'staccato' ? STACCATO_DECAY : 1);
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
      // Where in the sweep it clicks: in the window when it means to, early when it fumbles.
      s.npcBeatAt = s.metroStart + idx * BEAT_MS
        + (s.npcBeatHit ? BEAT_MS - WINDOW_MS * (0.25 + Math.random() * 0.6) : BEAT_MS * (0.3 + Math.random() * 0.25));
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

    // The bot's baton hunts the player; the peer's follows their relayed cursor.
    if (owner === 'npc' && !this.arena.isOnline) {
      const { player } = this.arena;
      s.aimX = player.x; s.aimY = player.y;
    }
    let tx = s.aimX, ty = s.aimY;
    const dx = tx - f.x, dy = ty - f.y;
    const d = Math.hypot(dx, dy);
    if (d > BATON_RANGE) { tx = f.x + dx / d * BATON_RANGE; ty = f.y + dy / d * BATON_RANGE; }

    if (s.solo) { tx = f.x - 18; ty = f.y + 12; }
    if (s.dash) {
      // In hand: the baton rides the glove through the dash.
      const ha = Math.atan2(s.dash.aimY - f.y, s.dash.aimX - f.x);
      s.bx = f.x + Math.cos(ha) * 22;
      s.by = f.y + Math.sin(ha) * 22;
    } else if (time < s.grabUntil) {
      // Just slammed: it stands where it was driven in for a beat before it lifts off again.
    } else {
      const speed = (BATON_SPEED + BATON_SPEED_SPIN * s.spin) * (s.song === 'staccato' ? STACCATO_BATON_SPEED : 1);
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

    // Contact damage — not while it is in hand, and not on the stage.
    if (s.solo || s.dash || time < s.grabUntil) return;
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
    for (const t of this.targets(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > WAVE_RADIUS + 14) continue;
      this.strike(owner, t, WAVE_DMG, f.x, f.y);
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
      if (this.isReplica(owner) && t === this.arena.player) continue;
      t.outOfTuneUntil = Math.max(t.outOfTuneUntil, Date.now() + TUNE_MS);
      s.tuned.add(t);
      tuned++;
      this.announce(t.x, t.y - 44, '♭ OUT OF TUNE', SOUND.sour, 11);
    }
    if (tuned === 0 && owner === 'player') this.announce(ix, iy - 30, 'FERMATA', SOUND.goldHi, 10);

    // Bass (water + sound): a Staccato slam drops a row of water charges along the line.
    if (s.song === 'staccato' && this.arena.hasPerk(owner, 'bass')) {
      this.layBassRow(owner, ix, iy, ix + cos * SLAM_LEN * 0.75, iy + sin * SLAM_LEN * 0.75);
    }
  }

  private tunedAlive(owner: Owner): boolean {
    const now = Date.now();
    for (const t of this.sides[owner].tuned) if (this.alive(t) && t.outOfTuneUntil > now) return true;
    return false;
  }

  /**
   * Recast: every fighter this side put out of tune is detonated — damage, a short stun, and
   * notes sprouting out of them. Free, so it relays as a pseudo-cast rather than a cooldown.
   */
  private detonate(owner: Owner): void {
    const s = this.sides[owner];
    const now = Date.now();
    const victims = [...s.tuned].filter((t) => this.alive(t) && t.outOfTuneUntil > now);
    // The peer's detonation: our player is the one wearing it. The damage and the stun arrive by
    // relay; what has to happen here is the picture, and the tune coming off — a mirror only
    // ever extends a timer, so nothing else would ever shorten it.
    if (this.isReplica(owner)) {
      const { player } = this.arena;
      if (player.outOfTuneUntil > now) {
        player.outOfTuneUntil = 0;
        this.nfx.sprout(player.x, player.y - 4, SOUND.gold);
      }
      for (const t of victims) { if (t !== player) { t.outOfTuneUntil = 0; this.nfx.sprout(t.x, t.y - 4, SOUND.gold); } }
      s.tuned.clear();
      return;
    }
    for (const t of victims) {
      const x = t.x, y = t.y;
      this.strike(owner, t, DETONATE_DMG, x, y);
      this.stun(owner, t, DETONATE_STUN_MS);
      t.outOfTuneUntil = 0;
      this.fx(owner).sprout(x, y - 4, SOUND.gold);
      this.announce(x, y - 48, '♪ RESOLVED', SOUND.goldHi, 11);
    }
    s.tuned.clear();
    const f = this.fighter(owner);
    this.avatar(owner)?.play('clap', undefined, 360);
    Sfx.playAt('holy-chord', f.x, { rate: 1.4, volume: 0.7 });
    if (owner === 'player') this.arena.broadcastMasteryCast('sound-detonate');
  }

  /** Bot: the detonation is worth pressing once the victim has been sour long enough to matter. */
  npcDetonateReady(): boolean {
    if (this.arena.isOnline) return false;
    const now = Date.now();
    for (const t of this.sides.npc.tuned) {
      if (!this.alive(t) || t.outOfTuneUntil <= now) continue;
      const left = t.outOfTuneUntil - now;
      // Either it is about to run out, or it has had a few seconds to make them misfire.
      if (left < 1500 || left < TUNE_MS - 3500) return true;
    }
    return false;
  }

  /** Bot side of the free recast — reached through `ctx.soundCast('fermata-detonate')`. */
  doNpcDetonate(): void {
    if (this.tunedAlive('npc')) this.detonate('npc');
  }

  // ── F: Hum ────────────────────────────────────────────────────────────

  private cycleSong(owner: Owner): void {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    const next = SONG_ORDER[(SONG_ORDER.indexOf(s.song) + 1) % SONG_ORDER.length];
    s.song = next;
    this.fx(owner).notes(f.x, f.y - 16, 6, { speed: 90, size: 7, life: 760, color: SONG_COLORS[next], rise: 40, angle: -Math.PI / 2, spread: 1.2 });
    this.fx(owner).ripple(f.x, f.y, 10, 40, SONG_COLORS[next], 360, 3, 7, 7);
    this.avatar(owner)?.play('flex', undefined, 360);
    this.announce(f.x, f.y - 52, `♪ ${SONG_NAMES[next]}`, SONG_COLORS[next], 11);
  }

  /** Bot: the song this bot wants right now. The kit decides; the rotation presses until it matches. */
  npcWantedSong(): SoulSong {
    const { npc, player } = this.arena;
    const hp = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
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
    if (s.song === 'melody') f.reduceCooldowns(delta * MELODY_CD_RATE);
    if (s.song === 'smooth') {
      f.soundIncomingMult = SMOOTH_RES;
      s.resOwned = true;
      s.regenAccum += delta;
      const per = 1000 / SMOOTH_REGEN;
      while (s.regenAccum >= per) {
        s.regenAccum -= per;
        if (f.hp < f.maxHp) f.heal(1);
      }
    } else {
      s.regenAccum = 0;
      if (s.resOwned) { f.soundIncomingMult = 1; s.resOwned = false; }
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
          this.fx(owner).notes(f.x, f.y + 10, 1, { speed: 14, size: 4, life: 700, depth: 4, color: SONG_COLORS[s.song], rise: 16 });
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
      start: now, end: now + Math.min(SOLO_MAX_MS, lastEnd + 800),
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
    this.fx(owner).fanfare(f.x, f.y);
    this.announce(f.x, f.y - 60, '🎺 CALL OF THE VOID', SOUND.goldHi, 13);
    Sfx.playAt('train-horn', f.x, { rate: 1.5, volume: 0.6 });
  }

  private endSolo(owner: Owner, relay: boolean): void {
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

    const el = time - solo.start;
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
      this.fx(owner).noteShot(bellX, bellY, tx, ty, big ? SOUND.goldHi : SONG_COLORS[s.song], big);
      this.strike(owner, target, SOLO_NOTE_DMG, bellX, bellY);
    }
    if (owner === 'player') this.arena.broadcastMasteryCast(big ? 'sound-solo-hit:big' : 'sound-solo-hit');
  }

  private updateSolo(owner: Owner, time: number): void {
    const s = this.sides[owner];
    const solo = s.solo;
    if (!solo) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.endSolo(owner, false); return; }
    // Rooted on the stage.
    if (!this.isReplica(owner)) (f.body as Phaser.Physics.Arcade.Body | null)?.reset(solo.x, solo.y);
    const el = time - solo.start;
    if (owner === 'player') {
      for (const n of solo.notes) {
        if (n.state === 'pending' && el - n.at > SOLO_TOLERANCE) { n.state = 'missed'; solo.combo = 0; }
      }
    } else if (!this.isReplica(owner)) {
      // The bot plays its own chart, rolling each note once as it reaches the bar.
      const lvl = Phaser.Math.Clamp(this.arena.npcLevel, 1, 5);
      const p = NPC_SOLO_CHANCE[lvl - 1];
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
    if (time >= solo.end) this.endSolo(owner, owner === 'player');
  }

  /** Bot: on stage, the rotation stands down — the kit is playing the solo. */
  npcSoloing(): boolean { return this.sides.npc.solo !== null; }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    this.vizT += delta / 1000;
    this.beatFlash = Math.max(0, this.beatFlash - delta / 300);
    this.fumbleFlash = Math.max(0, this.fumbleFlash - delta / 300);

    for (const owner of BOTH) {
      const on = owner === 'player' ? isPlayerSound : isNpcSound;
      if (!on) {
        // A dormant half (Quantum) must not stay on stage with its absorber hung on the fighter.
        if (this.sides[owner].solo) this.endSolo(owner, false);
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
      this.updateSolo(owner, time);
      if (this.alive(f)) this.trackPath(owner);
    }
    if (isPlayerSound) {
      const p = this.sides.player;
      if (this.arena.isOnline && time - this.lastBatonRelayAt >= BATON_RELAY_MS && !p.solo) {
        this.lastBatonRelayAt = time;
        this.arena.broadcastMasteryCast(`sound-baton:${Math.round(p.spin * 100)}`);
      }
      if (time < this.harmonyUntil) {
        this.arena.player.reduceCooldowns(delta * HARMONY_BONUS_PER_STACK * this.harmonyStacks);
      } else this.harmonyStacks = 0;
      this.updateResonator(time);
    }
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
      if (s.solo) SoundFx.drawStage(st, col, s.solo.x, s.solo.y + 16, this.vizT);
      // The leash, faint, so the reach of the baton is readable.
      if (owner === 'player' && !s.solo) {
        g.lineStyle(1, col(SOUND.maroonPale), 0.08);
        g.strokeCircle(f.x, f.y, BATON_RANGE);
      }
      if (!s.solo) {
        SoundFx.drawBaton(a, col, s.bx, s.by, s.rot, s.spin, this.vizT, f.forceInvisible ? 0 : f.alpha, SONG_COLORS[s.song]);
      }
      this.paintFollowers(a, owner);
    }

    // Everyone out of tune wears the discordant line.
    const seen = new Set<Fighter>();
    for (const f of [this.arena.player, this.arena.npc, ...this.arena.enemies]) {
      if (!f?.active || seen.has(f) || f.outOfTuneUntil <= now || f.hp <= 0) continue;
      seen.add(f);
      const left = f.outOfTuneUntil - now;
      SoundFx.drawOutOfTune(a, this.pcol, f.x, f.y, this.vizT, Math.min(1, left / 400) * (f.forceInvisible ? 0 : 1));
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

  private avatar(owner: Owner): SoundAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }

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
        av = new SoundAvatar(scene, this.col(owner), owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      const faceAt = s.solo
        ? Math.atan2(0, (this.targets(owner)[0]?.x ?? f.x + 1) - f.x)
        : Math.atan2(s.by - f.y, s.bx - f.x);
      av.setFacing(faceAt);
      av.setMastered(owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive);
      av.setSong(SONG_COLORS[s.song], SONG_PALE[s.song]);
      const dancing = now < s.danceUntil;
      av.setDance(dancing ? Phaser.Math.Clamp((now - s.danceStart) / DANCE_MS, 0.3, 1) : 0);
      av.setInstrument(s.solo ? 'bugle' : 'none');
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
    const font = '"Arial Black", "Segoe UI Black", Impact, sans-serif';
    if (!this.hudLabel) {
      this.hudLabel = scene.add.text(cx - 128, y, '', { fontSize: '10px', fontFamily: font, color: '#ffe8a6' })
        .setOrigin(0.5).setDepth(23);
    }
    if (!this.songLabel) {
      this.songLabel = scene.add.text(cx + 128, y, '', { fontSize: '9px', fontFamily: font }).setOrigin(0.5).setDepth(23);
    }
    if (!this.soloLabel) {
      this.soloLabel = scene.add.text(cx, 0, '', { fontSize: '12px', fontFamily: font, color: '#ffe8a6' })
        .setOrigin(0.5).setDepth(23);
    }

    if (s.solo) {
      this.hudLabel.setVisible(false);
      this.songLabel.setVisible(false);
      this.paintSoloStaff(g, time, s.solo);
      return;
    }
    this.soloLabel.setVisible(false);
    this.hudLabel.setVisible(true);
    this.songLabel.setVisible(true);

    // The plate.
    g.fillStyle(this.pcol(SOUND.shade), 0.9);
    g.fillRoundedRect(cx - 156, y - 16, 312, 32, 6);
    g.lineStyle(1, this.pcol(SOUND.maroonHi), 0.95);
    g.strokeRoundedRect(cx - 156, y - 16, 312, 32, 6);

    // The spin gauge at the left: a little baton turning at the real speed, over a fill.
    SoundFx.drawBaton(g, this.pcol, cx - 128, y + 4, s.rot, s.spin, this.vizT, 0.95, SONG_COLORS[s.song]);
    this.hudLabel.setPosition(cx - 128, y + 10).setText(`${Math.round(s.spin * 100)}%`);

    // The beat bar: a note slides along it and lands at the far end on the beat.
    const barX = cx - 100, barW = 196;
    const { phase } = this.beatIndex('player', time);
    const p = phase / BEAT_MS;
    const inWin = phase >= BEAT_MS - WINDOW_MS;
    g.fillStyle(this.pcol(SOUND.night), 0.95);
    g.fillRoundedRect(barX, y - 7, barW, 14, 4);
    // Three thin staff lines run the length of it.
    g.lineStyle(1, this.pcol(SOUND.maroonPale), 0.25);
    for (let i = -1; i <= 1; i++) g.lineBetween(barX + 3, y + i * 4, barX + barW - 3, y + i * 4);
    const winX = barX + barW * (1 - WINDOW_MS / BEAT_MS);
    g.fillStyle(this.pcol(SOUND.gold), inWin ? 0.55 + this.beatFlash * 0.4 : 0.22);
    g.fillRoundedRect(winX, y - 7, barX + barW - winX, 14, 4);
    if (this.fumbleFlash > 0) {
      g.fillStyle(this.pcol(SOUND.sour), 0.35 * this.fumbleFlash);
      g.fillRoundedRect(barX, y - 7, barW, 14, 4);
    }
    g.lineStyle(1, this.pcol(SOUND.maroonHi), 0.9);
    g.strokeRoundedRect(barX, y - 7, barW, 14, 4);
    // The target the note lands on.
    g.lineStyle(2, this.pcol(SOUND.goldHi), 0.9);
    g.lineBetween(barX + barW - 6, y - 10, barX + barW - 6, y + 10);
    // The note itself.
    const played = s.lastHitBeat === this.beatIndex('player', time).idx;
    const nx = barX + 6 + (barW - 12) * p;
    g.fillStyle(this.pcol(played ? SOUND.goldHi : inWin ? SOUND.gold : SOUND.ivory), played ? 0.45 : 1);
    musicNote(g, nx, y + 3, 5, -0.15, { flags: 1 });

    // The song on the right, and the combo.
    const song = s.song;
    this.songLabel.setPosition(cx + 128, y).setText(`${SONG_NAMES[song]}${s.combo >= 2 ? `\n×${s.combo}` : ''}`)
      .setColor(`#${SONG_COLORS[song].toString(16).padStart(6, '0')}`).setAlign('center');
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
    const el = time - solo.start;
    const col = this.pcol;

    g.fillStyle(col(SOUND.shade), 0.88);
    g.fillRoundedRect(left, top, panelW, panelH, 10);
    g.lineStyle(2, col(SOUND.gold), 0.9);
    g.strokeRoundedRect(left, top, panelW, panelH, 10);
    g.lineStyle(1, col(SOUND.maroonHi), 0.9);
    g.strokeRoundedRect(left + 4, top + 4, panelW - 8, panelH - 8, 8);

    // The line you are on, lit.
    g.fillStyle(col(SOUND.gold), 0.12);
    g.fillRect(left + 8, laneY(solo.lane) - gap / 2 + 2, panelW - 16, gap - 4);
    for (let i = 0; i < LANES; i++) {
      g.lineStyle(i === solo.lane ? 2 : 1.4, col(i === solo.lane ? SOUND.goldHi : SOUND.maroonPale), i === solo.lane ? 0.95 : 0.6);
      g.lineBetween(left + 14, laneY(i), left + panelW - 14, laneY(i));
    }
    // A treble clef stand-in at the head of the staff: an S of crescents.
    g.fillStyle(col(SOUND.maroonPale), 0.8);
    musicNote(g, left + 28, laneY(2) - 2, 6, 0.2, { flags: 2 });

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

    const left2 = Math.max(0, Math.ceil((solo.end - time) / 1000));
    this.soloLabel!.setVisible(true).setPosition(cx, top - 12)
      .setText(`🎺 CALL OF THE VOID   ×${solo.combo}   ${solo.hits} hit   ${left2}s   [W/S · ↑/↓ line · click · Q bow]`);
  }

  private pushStatuses(time: number): void {
    const s = this.sides.player;
    const song = s.song;
    const desc: Record<SoulSong, string> = {
      staccato: `+${Math.round((STACCATO_DMG - 1) * 100)}% damage. The baton travels ${Math.round((STACCATO_BATON_SPEED - 1) * 100)}% faster and loses its spin half as fast.`,
      melody: `+${Math.round((MELODY_SPEED - 1) * 100)}% move speed and 20% shorter cooldowns.`,
      smooth: `${Math.round((1 - SMOOTH_RES) * 100)}% damage resistance and ${SMOOTH_REGEN} HP a second.`,
    };
    this.arena.setStatusIndicator('sound-song', {
      name: `Soul Song: ${SONG_NAMES[song][0]}${SONG_NAMES[song].slice(1).toLowerCase()}`,
      emoji: song === 'staccato' ? '🔴' : song === 'melody' ? '🔵' : '🟢',
      color: this.pcol(SONG_COLORS[song]), priority: 124,
      description: `${desc[song]} F changes the song.`,
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
