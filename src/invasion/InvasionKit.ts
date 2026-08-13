import Phaser from 'phaser';
import { Husk, HuskWorld, BossAoeOpts, BossShotOpts } from './Husk';
import { Fighter } from '../entities/Fighter';
import { Projectile } from '../combat/Projectile';
import { HP_SCALE } from '../data/Balance';
import { Sfx, Music } from '../audio';
import { Mansion, ROOM_META, ROOM_COUNT, HALL_ROOM, ROOM_MAX_HP, CELLAR_ROOM } from './Mansion';
import { HuskEffectEngine, EffectWorld } from './HuskEffects';
import { RoomFeatures, RoomFeatureHooks } from './RoomFeatures';
import { ApocalypseKit, ApocalypseWorld } from './Apocalypse';
import { JournalBook } from './HuskJournal';
import { Observatory } from './Constellations';
import { RecordPlayer } from './RecordPlayer';
import * as PlayerData from '../data/PlayerData';
import {
  HuskVariantDef,
  BASIC_HUSK,
  CORRUPT_KIN,
  InvasionTheme,
  getInvasionTheme,
  rollLightningVariant,
  rollBossVariant,
  isBossWave,
  huskVariantIndex,
  getHuskVariant,
} from './HuskVariants';

/** Narrow surface the invasion kit needs from ArenaScene. */
export interface InvasionArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get enemies(): Fighter[];
  /** Register a husk with the arena's enemies list + physics enemy group. */
  addEnemy(husk: Husk): void;
  /** Remove a husk from the arena's enemies list + physics enemy group. */
  removeEnemy(husk: Husk): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /** End the run now (banks shards earned and shows the results screen). */
  endRun(): void;
  /** Life's plants — husks prefer these over the player, and bites land on them. */
  plantTargets(): Fighter[];
  /** Player upgrade check, for on-hit status gates (e.g. fire's Flameshredder). */
  hasUpgrade(slot: string): boolean;
  /** The local player's element id — gates the element-specific wave achievements. */
  get elementId(): string;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  /**
   * Apply one frost stack to an arbitrary fighter. ArenaScene's own
   * addFrostStack() only speaks 'player' | 'npc', and a husk is neither.
   */
  addFrostStackTo(target: Fighter): void;
  /** Bleed aura + drips on a fighter (ArenaScene owns the visual lifecycle). */
  applyBleedVisual(target: Fighter): void;
  /** Silence: player is invisible / away in the hallway — husks can't target them. */
  isSilencePlayerHidden(): boolean;
  /** Silence: an invisible player has stalkers out — husks fire blind to hunt them. */
  silenceStalkerHunt(): boolean;
  /** Silence: a husk shot landed here — kills a player stalker in radius. Returns true if it did. */
  tryHitSilenceStalker(x: number, y: number, radius: number): boolean;
  /** Soul: a real husk died — feeds the player's corpse queue if they're playing Soul. */
  notifyHuskDefeated?(husk: Husk): void;
  /** Where the local player is pointing — the apocalypse torch follows the cursor. */
  aim(): { x: number; y: number };
}

const INTERMISSION_MS = 2600;
const FIRST_WAVE_DELAY_MS = 2500;
/** How long the "husks are coming for THE KITCHEN" warning gives you to walk there. */
const ROOM_WARNING_MS = 5200;

/** Wave a Life player must clear for the Plants vs Zombies achievement (and the Wither skin). */
const PLANTS_VS_ZOMBIES_WAVE = 8;

/** Husk projectiles (ranged variants / ranger shots). */
const SHOT_SPEED = 290;
const SHOT_LIFETIME_MS = 3200;
const SHOT_RADIUS = 7;
const SHOT_HIT_RADIUS = 22;
/** Psychic husk orbs: slower, but they turn toward you. */
const HOMING_SHOT_SPEED = 190;
const HOMING_TURN_RAD_PER_S = 2.2;

const BLASTER_BOOM_RADIUS = 130;
/** Explosion damage to *other husks*, as a fraction of its damage to players. */
const BLASTER_HUSK_DAMAGE_FRAC = 1.5;

const POSSESS_HP_MULT = 2.5;
const POSSESS_SPEED_MULT = 1.8;
const POSSESS_DAMAGE_MULT = 2;
const POSSESS_SIZE_MULT = 1.25;
const POSSESS_TINT = 0xaa1133;

/** Air husks at tier 3 would otherwise become literally undodgeable. */
const MAX_HUSK_SPEED = 430;

/** Ceiling on live husks, so a titan fight or an ignored room can't spiral. */
const MAX_LIVE_HUSKS = 45;

/** Base husk statline — flat now; only variants and difficulty scale it. */
const BASE_HP = 24;
const BASE_SPEED = 92;
const BASE_BITE = 6;

/** More husks than this in one room and it starts taking damage. */
const ROOM_CROWD_LIMIT = 12;
/** Room HP lost per second, per husk over the crowd limit. */
const ROOM_GNAW_PER_EXTRA = 1;

/**
 * The arena's player health bar is centred at y=18 and 24px tall, so anything
 * above y≈34 collides with it. Both the wave/husk readout and the big wave
 * banner sit below it.
 */
export const WAVE_LABEL_Y = 46;
export const WAVE_BANNER_Y = 96;

/**
 * Shared by the solo director and the co-op guest so both HUDs read identically.
 * During an intermission (no husks left) the wave number stays on screen instead
 * of the whole readout blanking out.
 */
export function formatWaveLabel(wave: number, remaining: number, roomName?: string): string {
  if (wave <= 0) return '';
  if (remaining <= 0) return `WAVE ${wave} CLEARED`;
  const where = roomName ? `  →  ${roomName}` : '';
  return `WAVE ${wave}${where}  —  🧟 ${remaining}`;
}

export type InvasionDifficultyId = 'normal' | 'brutal' | 'masochistic';

export interface InvasionDifficultyDef {
  id: InvasionDifficultyId;
  label: string;
  description: string;
  /** 0xRRGGBB, for UI accents (button strokes, etc.). */
  color: number;
  /** '#rrggbb', for Phaser Text color strings. */
  colorHex: string;
  hpMult: number;
  dmgMult: number;
  shardMult: number;
}

export const INVASION_DIFFICULTIES: InvasionDifficultyDef[] = [
  {
    id: 'normal', label: 'NORMAL', color: 0x88cc44, colorHex: '#88cc44',
    description: 'Defend the mansion.  Elemental lightning brands husks with the fifteen ordinary elements.',
    hpMult: 1, dmgMult: 1, shardMult: 1,
  },
  {
    id: 'brutal', label: 'BRUTAL', color: 0xff8844, colorHex: '#ff8844',
    description: '2× husk health.  The lightning strikes more often — and now carries the ABSTRACT elements.  2× corrupt shards.',
    hpMult: 2, dmgMult: 1, shardMult: 2,
  },
  {
    id: 'masochistic', label: 'MASOCHISTIC', color: 0xff2244, colorHex: '#ff2244',
    description: '3× husk health.  2× husk damage.  Constant lightning, and the CORRUPT elements walk.  3× corrupt shards.',
    hpMult: 3, dmgMult: 2, shardMult: 3,
  },
];

export function getInvasionDifficulty(id: string | undefined): InvasionDifficultyDef {
  return INVASION_DIFFICULTIES.find((d) => d.id === id) ?? INVASION_DIFFICULTIES[0];
}

/**
 * An on-hit status a player's projectile inflicts on a husk. Sent over the
 * wire when a co-op guest lands the hit, since only the host simulates husks.
 */
export type HuskStatus =
  | { k: 'burn'; ms: number }
  | { k: 'toxic'; ms: number; dps: number }
  | { k: 'frost'; stacks: number; shatter: boolean }
  | { k: 'bleed'; ms: number }
  // Silence remaster: click-only lockout, 20% attack whiffs, permanent grabber slow.
  | { k: 'silence'; ms: number }
  | { k: 'halluc'; ms: number }
  | { k: 'atkslow'; mult: number }
  // Silence E+ seeker cone: stabs on a panicked target drain only 50 stealth.
  | { k: 'panic'; ms: number };

/**
 * One-shot visual effects the co-op guest replays locally. Husk *behaviour* is
 * simulated only on the host, so these carry just enough to look right — the
 * host stays the sole authority on any damage they represent. `r` is the room
 * the effect happened in; the guest skips effects it isn't looking at.
 */
export type InvasionFx =
  | { k: 'boom'; x: number; y: number; r: number; c?: number; rm?: number }
  | { k: 'lane'; x: number; y: number; x2: number; y2: number; c: number; ms: number; rm?: number }
  | { k: 'heal'; x: number; y: number; r: number; rm?: number }
  | { k: 'shot'; x: number; y: number; vx: number; vy: number; ms: number; c?: number; rr?: number; rm?: number }
  | { k: 'possess'; x: number; y: number; rm?: number }
  // A boss telegraph: the floor lighting up before it goes off.
  | { k: 'warn'; x: number; y: number; r: number; c: number; ms: number; ring?: boolean; rm?: number }
  // Elemental lightning branding a fresh spawn.
  | { k: 'bolt'; x: number; y: number; c: number; rm?: number }
  // A ground zone (puddle / slick / lava / goo) appearing.
  | { k: 'zone'; x: number; y: number; r: number; c: number; ms: number; rm?: number };

/**
 * Invasion co-op hooks — wired in by InvasionCoopKit on the host side only.
 * Lets InvasionKit stay the single source of truth for wave/husk simulation
 * while the co-op layer handles all networking.
 */
export interface InvasionCoopHooks {
  /** Multiplies wave spawn counts (2× for co-op, to balance the extra player). */
  spawnMultiplier: number;
  /** Extra chase/bite targets besides the local player (the ally replica). */
  extraTargets: () => Fighter[];
  /** A husk hurt a target that isn't the local player — forward the hit to them. */
  onAllyBite: (damage: number, x: number, y: number) => void;
  onHuskDefeated: (husk: Husk, reward: number) => void;
  onWaveCleared: (wave: number, bonus: number) => void;
  /** Mirror a one-shot visual onto the guest's screen. */
  onFx: (fx: InvasionFx) => void;
  /** A boss just spawned — the guest shows the same banner. */
  onBossSpawned: (name: string, colorHex: string) => void;
  /** A new wave was announced — the guest shows the target-room warning. */
  onWaveAnnounced: (wave: number, room: number) => void;
  /** A room fell — the guest seals it too. */
  onRoomLost: (room: number) => void;
  /** The eye in the cellar was woken — the guest's mansion goes with it. */
  onApocalypse: () => void;
  /** A tonic left the shelf. The shelf is shared, so the guest must see it go. */
  onTonicTaken: (slot: number) => void;
  /** A room's corruption changed state — the guest shows the same banner. */
  onCorruption: (room: number, kind: 'seeded' | 'taken' | 'cleansed') => void;
}

interface HuskShot {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  expiresAt: number;
  room: number;
  /** Elemental flavour of the shooter (psychic orbs home, depths shots splash). */
  elementId?: string;
  /** Bends toward whatever it can see (psychic orbs, the Dreamer's). */
  homing?: boolean;
  /** Contact radius; boss orbs are fatter than a spitter's gob. */
  hitRadius?: number;
}

type WavePhase = 'idle' | 'warning' | 'active' | 'rest';

/**
 * Invasion mode director — mansion defense.
 *
 * Five rooms: the grand hall and four wings. Every wave picks a room still
 * standing (the hall included — it just can't fall), warns the player with
 * plenty of time to walk over, then pours husks in through that room's
 * windows. Each spawn risks an elemental lightning strike
 * that brands it with one of 47 elemental variants (tiered I–III; abstract
 * variants join on BRUTAL, corrupt ones on MASOCHISTIC). Husks left to crowd a
 * room gnaw it down; a room at zero is abandoned for the rest of the run, and
 * when all four wings have fallen the mansion is lost. Every kill pays corrupt
 * shards; clearing a wave pays a bonus. Every tenth wave adds a boss.
 */
export class InvasionKit implements HuskWorld, EffectWorld {
  private wave = 0;
  private phase: WavePhase = 'idle';
  private phaseEndsAt = 0;
  private pendingSpawns = 0;
  private nextSpawnAt = 0;
  /** Boss queued for the current wave, spawned alongside the first regular husks. */
  private pendingBoss: HuskVariantDef | null = null;
  private shards = 0;
  private clearedWaves = 0;
  /** Husks still owed this wave: alive on the field + not yet spawned. */
  private remaining = 0;
  private difficulty: InvasionDifficultyDef = INVASION_DIFFICULTIES[0];
  private coopHooks: InvasionCoopHooks | null = null;
  private nextHuskId = 1;
  private shots: HuskShot[] = [];
  private targetRoom = -1;
  /** Apocalypse co-op: a second room under attack at the same time, or -1. */
  private targetRoom2 = -1;
  private lastTargetRoom = -1;
  /** Alternates which of the two targeted rooms the next spawn climbs into. */
  private spawnFlip = false;
  private nextGnawTickAt = 0;
  private lastGnawWarnAt = 0;
  private ending = false;

  /** Mansion + effect engine exist only after reset() — a co-op guest's kit never resets. */
  private mansion: Mansion | null = null;
  private effects: HuskEffectEngine | null = null;
  /** Co-op guest's current room, injected by InvasionCoopKit for the targetable gate. */
  private guestRoom = -1;
  /** Co-op host: the ally's current room, from their state packets. */
  private allyRoom = 0;

  /** Elemental hazard slow on the local player (ice bites, oil slicks, gum). */
  private slowMult = 1;
  private slowUntil = 0;

  /** Campaign world theme: kin-only lightning strikes and an element-tinted manor. */
  private theme: InvasionTheme | null = null;

  // ── The mansion's own contents ────────────────────────────────────
  /** Table, shelf, goo and telescope — the four things you can press E on. */
  private features: RoomFeatures | null = null;
  /** Everything the woken eye brings: dark, traps, infection, corruption. */
  private apocalypse: ApocalypseKit | null = null;
  /** The Study's bestiary. */
  private journal: JournalBook | null = null;
  /** The Observatory's constellation sky and the run's aligned buffs. */
  private observatory: Observatory | null = null;
  /** The cellar's gramophone — pay banked shards, skip the night forward. */
  private record: RecordPlayer | null = null;
  /** True once the needle has been moved. Locks the wave-8 achievement out. */
  private wavesWereSkipped = false;
  /**
   * Bumped every reset(). Boss blasts land on a delayed call, and the scene's
   * timers outlive a match restart — the epoch is what stops a gavel swung in
   * one run from going off in the next.
   */
  private bossEpoch = 0;
  /** Shards already spent on the sky, subtracted from the banked total. */
  private shardsSpent = 0;
  /**
   * True on a co-op guest, which owns its own props, torch and traps but never a
   * husk — so it must not advance corruption, and its prop use has to be relayed
   * to the host rather than acted on locally.
   */
  private guestSide = false;
  /**
   * Co-op: where the other player is, from whichever side is asking. Set by
   * InvasionCoopKit on both peers so the torch and the prop relay have one
   * source instead of two half-working ones.
   */
  allyProbe: (() => { fighter: Fighter; room: number } | null) | null = null;
  /** Co-op guest → host relay for props the guest used. Null on host and solo. */
  guestRelay: {
    onTonic(slot: number): void;
    onApocalypse(): void;
    onSpend(amount: number): void;
  } | null = null;
  /** Co-op guest: its mansion belongs to InvasionCoopKit — this unfolds that one. */
  guestMansionHook: ((on: boolean) => void) | null = null;
  /** Variant ids already in the saved journal — the localStorage write guard. */
  private journalKnown = new Set<string>();

  private waveBanner: Phaser.GameObjects.Text | null = null;
  private waveLabel: Phaser.GameObjects.Text | null = null;
  private shardLabel: Phaser.GameObjects.Text | null = null;
  private difficultyLabel: Phaser.GameObjects.Text | null = null;
  private leaveBtn: Phaser.GameObjects.Rectangle | null = null;
  private leaveLabel: Phaser.GameObjects.Text | null = null;

  constructor(private arena: InvasionArenaApi) {}

  /** Banked at the end of the run — what the sky took is already gone. */
  get shardsEarned(): number { return Math.max(0, this.shards - this.shardsSpent); }
  get wavesCompleted(): number { return this.clearedWaves; }
  get isApocalypse(): boolean { return !!this.apocalypse?.isActive; }

  reset(
    difficulty: InvasionDifficultyDef = INVASION_DIFFICULTIES[0],
    coopHooks: InvasionCoopHooks | null = null,
    campaignWorldId: string | null = null,
  ): void {
    const scene = this.arena.scene;
    this.wave = 0;
    this.phase = 'idle';
    this.phaseEndsAt = scene.time.now + FIRST_WAVE_DELAY_MS;
    this.pendingSpawns = 0;
    this.nextSpawnAt = 0;
    this.pendingBoss = null;
    this.shards = 0;
    this.clearedWaves = 0;
    this.remaining = 0;
    this.difficulty = difficulty;
    this.coopHooks = coopHooks;
    this.nextHuskId = 1;
    this.targetRoom = -1;
    this.lastTargetRoom = -1;
    this.nextGnawTickAt = 0;
    this.lastGnawWarnAt = 0;
    this.ending = false;
    this.guestRoom = -1;
    this.allyRoom = 0;
    this.slowMult = 1;
    this.slowUntil = 0;
    this.targetRoom2 = -1;
    this.spawnFlip = false;
    this.shardsSpent = 0;
    this.wavesWereSkipped = false;
    this.bossEpoch++;
    for (const s of this.shots) s.gfx.destroy();
    this.shots = [];

    this.theme = getInvasionTheme(campaignWorldId);

    if (!this.mansion) {
      this.mansion = new Mansion(scene, { onRoomChanged: () => this.refreshRoomVisibility() });
    }
    this.mansion.setTheme(this.theme?.color ?? null);
    this.mansion.reset();
    if (!this.effects) this.effects = new HuskEffectEngine(this);
    this.effects.reset();

    this.buildMansionContents();

    const { width } = scene.scale;
    this.waveBanner?.destroy();
    this.waveBanner = scene.add.text(width / 2, WAVE_BANNER_Y, '', {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#88cc44', stroke: '#1d2e0f', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25);
    this.waveLabel?.destroy();
    this.waveLabel = scene.add.text(width / 2, WAVE_LABEL_Y, '', {
      fontSize: '14px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aacc88',
      stroke: '#101c08', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.shardLabel?.destroy();
    this.shardLabel = scene.add.text(width - 16, 16, '🩸 0', {
      fontSize: '16px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc44ff',
    }).setOrigin(1, 0).setDepth(25);

    // Difficulty badge — only shown for the two non-default modes so a normal
    // run's HUD stays exactly as it was before difficulties existed.
    this.difficultyLabel?.destroy();
    this.difficultyLabel = difficulty.id === 'normal' ? null : scene.add.text(
      width - 16, 38, difficulty.label,
      { fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: difficulty.colorHex },
    ).setOrigin(1, 0).setDepth(25);

    // Leave button — retreat with the shards earned so far
    this.leaveBtn?.destroy();
    this.leaveLabel?.destroy();
    this.leaveBtn = scene.add.rectangle(62, 30, 92, 30, 0x221111, 0.9)
      .setStrokeStyle(1, 0xcc4444).setDepth(25).setInteractive({ useHandCursor: true });
    this.leaveLabel = scene.add.text(62, 30, '🚪 LEAVE', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc6666',
    }).setOrigin(0.5).setDepth(26);
    this.leaveBtn
      .on('pointerover', () => { this.leaveBtn!.setStrokeStyle(2, 0xff8888); this.leaveLabel!.setColor('#ffaaaa'); })
      .on('pointerout',  () => { this.leaveBtn!.setStrokeStyle(1, 0xcc4444); this.leaveLabel!.setColor('#cc6666'); })
      .on('pointerdown', () => this.arena.endRun());
  }

  /**
   * Build (once) and reset the four props, the bestiary, the sky and the
   * apocalypse. All four are lazy for the same reason the kit itself is: a
   * co-op guest never calls reset(), and must not pay for a mansion it doesn't
   * simulate — its own copies are built by InvasionCoopKit through
   * `prepareGuestContents()` instead.
   */
  private buildMansionContents(): void {
    const arena = this.arena;
    this.journalKnown = new Set(PlayerData.getHuskJournal());
    if (!this.journal) this.journal = new JournalBook(arena.scene);
    if (!this.observatory) {
      this.observatory = new Observatory(arena.scene, {
        availableShards: () => this.shardsEarned,
        spendShards: (n) => {
          if (this.shardsEarned < n) return false;
          this.shardsSpent += n;
          // The purse is shared in co-op and the host banks it, so a guest's
          // alignment has to be charged on the host's ledger too.
          this.guestRelay?.onSpend(n);
          return true;
        },
        get player() { return arena.player; },
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
      });
    }
    if (!this.apocalypse) {
      const world: ApocalypseWorld = {
        get scene() { return arena.scene; },
        get player() { return arena.player; },
        currentRoom: () => this.currentRoom(),
        // Traps spring on the local player only, and never while they are
        // downed or reading — neither is a state you can step off a plate from.
        localTargets: (r) => (r === this.currentRoom() && !this.isOverlayOpen()
          ? [arena.player, ...arena.plantTargets()].filter((f) => f.active && f.hp > 0 && !f.downed)
          : []),
        damageTarget: (t, a) => this.damageTargetInternal(t, a),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        livingHusks: () => this.livingHusks(),
        huntableIn: (r) => this.targetsInRoomInternal(r).length > 0,
        spawnCorruptKin: (x, y, room) => this.spawnChild(CORRUPT_KIN, x, y, room),
        corruptibleRooms: () => {
          const m = this.mansion;
          return m ? [HALL_ROOM, ...m.standingRooms()] : [];
        },
        torchMult: () => this.observatory?.torchMult ?? 1,
        aimAngle: () => {
          const p = arena.player;
          const a = arena.aim();
          return Math.atan2(a.y - p.y, a.x - p.x);
        },
        allyTorch: () => {
          const ally = this.allyProbe?.();
          if (!ally || ally.room !== this.currentRoom() || !ally.fighter.active) return null;
          return { x: ally.fighter.x, y: ally.fighter.y, angle: ally.fighter.facingAngle };
        },
        // Husks have exactly one owner, and corruption grows husks.
        ownsCorruption: () => !this.guestSide,
        onCorruptionEvent: (room, kind) => this.coopHooks?.onCorruption(room, kind),
      };
      this.apocalypse = new ApocalypseKit(world);
    }
    if (!this.record) {
      this.record = new RecordPlayer({
        get scene() { return arena.scene; },
        currentWave: () => this.wave,
        difficultyId: () => this.difficulty.id,
        apocalypseActive: () => !!this.apocalypse?.isActive,
        skipTo: (wave) => this.skipToWave(wave),
        // Husks have one owner, and skipping a wave is a statement about husks.
        readOnly: () => this.guestSide,
      });
    }
    if (!this.features) {
      const hooks: RoomFeatureHooks = {
        get scene() { return arena.scene; },
        get player() { return arena.player; },
        currentRoom: () => this.currentRoom(),
        showFloatingText: (x, y, t, c) => arena.showFloatingText(x, y, t, c),
        openJournal: () => this.journal?.toggle(),
        openTelescope: () => this.observatory?.toggle(),
        openRecordPlayer: () => this.record?.toggle(),
        drinkTonic: (slot) => this.drinkTonic(slot),
        wakeTheEye: () => this.wakeTheEye(),
        apocalypseActive: () => !!this.apocalypse?.isActive,
        overlayOpen: () => this.isOverlayOpen(),
        closeOverlays: () => {
          this.journal?.close();
          this.observatory?.close();
          this.record?.close();
        },
      };
      this.features = new RoomFeatures(hooks);
    }

    this.journal.close();
    this.observatory.reset();
    this.record.reset();
    this.apocalypse.reset();
    this.features.reset();
  }

  /**
   * The E key, before the element gets a look at it. Returns true when a prop
   * (or an open overlay) claimed the frame, so ArenaScene can skip ability input
   * rather than casting into the wine racks.
   */
  handleInteractInput(eKey: Phaser.Input.Keyboard.Key, delta: number): boolean {
    return this.features?.handleInput(eKey, delta) ?? false;
  }

  /** The journal, the telescope or the gramophone is up — nothing else should read input. */
  isOverlayOpen(): boolean {
    return !!this.journal?.isOpen || !!this.observatory?.isOpen || !!this.record?.isOpen;
  }

  /** Tear down everything with a display list presence (scene shutdown). */
  destroyContents(): void {
    this.journal?.destroy();
    this.observatory?.destroy();
    this.record?.destroy();
    this.apocalypse?.destroy();
    this.features?.destroy();
  }

  // ── The four props ────────────────────────────────────────────────

  /**
   * The tonics have been on that shelf a very long time. Whatever they were,
   * they are now 15 points of harm and a bad afternoon — but there are still
   * only three of them, and in co-op the whole team shares the shelf.
   */
  private drinkTonic(slot: number): void {
    if (!this.features?.tonicsLeft[slot]) return;
    this.features.consumeTonic(slot);
    if (this.coopHooks) this.coopHooks.onTonicTaken(slot);
    else this.guestRelay?.onTonic(slot);
    const p = this.arena.player;
    Sfx.play('potion-drink');
    Sfx.play('status-poison');
    Fighter.asNonAllyDamage(() => p.takeDamage(15));
    this.arena.spawnHitFlash(p.x, p.y, 0x6a8a2a);
    this.arena.showFloatingText(p.x, p.y - 54, '🤢 EXPIRED — IT WAS NOT A TONIC', '#88cc44');
    this.arena.scene.cameras.main.shake(200, 0.004);
  }

  /**
   * Five seconds of contact with the thing in the goo. The house answers.
   * Also the guest's entry point (via the co-op kit) so both sides flip together.
   */
  private wakeTheEye(): void {
    if (this.apocalypse?.isActive) return;
    PlayerData.markApocalypseSeen();
    this.beginApocalypse();
    if (this.coopHooks) this.coopHooks.onApocalypse();
    else this.guestRelay?.onApocalypse();
  }

  /**
   * Flip the whole run over. Called on both sides of the wire: the mansion
   * unfolds its corner wings and repaints as a ruin, and the apocalypse kit
   * takes over the lighting.
   */
  beginApocalypse(): void {
    if (this.apocalypse?.isActive) return;
    this.mansion?.setApocalypse(true);
    this.guestMansionHook?.(true);
    this.apocalypse?.activate();
  }

  /**
   * Co-op guest entry point. The guest never calls `reset()` (it simulates no
   * husks), but it still walks the same house, so it needs its own props, book,
   * sky and apocalypse layer. Everything built here is local-only: the tonics
   * and the eye relay to the host, corruption arrives in snaps.
   */
  prepareGuestContents(): void {
    this.guestSide = true;
    this.buildMansionContents();
  }

  /** Guest-side per-frame tick for everything reset() would otherwise drive. */
  updateGuestContents(time: number, delta: number): void {
    this.features?.update(time);
    this.record?.update(delta);
    this.apocalypse?.update(time, delta);
  }

  /** Guest-side: the host's corruption readout, for the stain and the minimap. */
  applyRemoteCorruption(levels: number[]): number[] {
    this.apocalypse?.applyRemoteCorruption(levels);
    return this.apocalypse?.corruptionLevels() ?? [];
  }

  /** Co-op guest: replay a corruption banner the host reported. */
  showCorruptionBanner(room: number, kind: 'seeded' | 'taken' | 'cleansed'): void {
    this.apocalypse?.showCorruptionBanner(room, kind);
  }

  /** Co-op guest: the host says this tonic is gone. */
  applyRemoteTonics(mask: number): void {
    this.features?.applyRemoteTonics(mask);
  }

  /** The other player took a bottle off the shared shelf. No damage — theirs. */
  noteTonicTaken(slot: number): void {
    this.features?.consumeTonic(slot);
  }

  /** Co-op host: the guest bought a constellation out of the shared purse. */
  noteRemoteSpend(amount: number): void {
    this.shardsSpent += Math.max(0, amount);
  }

  /**
   * Co-op guest: the run's shard total lives in InvasionCoopKit (it arrives in
   * snaps), so the telescope has to be told what the purse holds.
   */
  setGuestShardTotal(total: number): void {
    if (!this.guestSide) return;
    // The host's figure is already net of everything either of us has aligned —
    // including the guest's own relayed spend — so the local tally is cleared
    // rather than subtracted twice.
    this.shards = total;
    this.shardsSpent = 0;
  }

  /** Guest-side wave tick — the Kindled Torch's per-wave shield charge. */
  onWaveBeganLocal(): void {
    this.observatory?.onWaveBegan();
  }

  update(time: number, delta: number): void {
    const player = this.arena.player;
    const alive = this.livingHusks();
    const mansion = this.mansion;
    if (!mansion) return;

    // Wave cleared → pay bonus, rest, then warn about the next room.
    if (this.phase === 'active' && this.pendingSpawns === 0 && !this.pendingBoss && alive.length === 0) {
      this.clearedWaves = this.wave;
      const bonus = Math.round(this.wave * 3 * this.difficulty.shardMult);
      this.shards += bonus;
      this.arena.showFloatingText(player.x, player.y - 50, `WAVE ${this.wave} CLEARED  +${bonus} 🩸`, '#88ff44');
      this.phase = 'rest';
      this.phaseEndsAt = time + INTERMISSION_MS;
      this.targetRoom = -1;
      mansion.setTarget(-1);
      this.coopHooks?.onWaveCleared(this.wave, bonus);
      // Achievement — Plants vs Zombies: hold the line to wave 8 with a garden.
      // Paying the gramophone to get there is not holding the line.
      if (this.wave >= PLANTS_VS_ZOMBIES_WAVE && !this.wavesWereSkipped && this.arena.elementId === 'life') {
        this.arena.unlockAchievement('plants-vs-zombies');
      }
    }

    // Rest over (or first-wave delay) → announce the next wave's target room.
    if ((this.phase === 'rest' || this.phase === 'idle') && time >= this.phaseEndsAt && !this.ending) {
      this.announceWave(this.wave + 1, time);
    }

    // Warning over → the husks arrive.
    if (this.phase === 'warning' && time >= this.phaseEndsAt) {
      this.beginWave(time);
    }

    // Trickle out this wave's spawns through the target room's windows.
    while (this.phase === 'active' && (this.pendingSpawns > 0 || this.pendingBoss) && time >= this.nextSpawnAt) {
      if (this.targetRoom < 0 && this.targetRoom2 < 0) { this.pendingSpawns = 0; this.pendingBoss = null; break; }
      if (this.targetRoom < 0) { this.targetRoom = this.targetRoom2; this.targetRoom2 = -1; }
      if (this.pendingBoss) {
        const boss = this.pendingBoss;
        this.pendingBoss = null;
        const spawned = this.spawnWaveHusk(boss);
        this.announceBoss(boss, !!spawned?.infected);
      } else {
        this.pendingSpawns--;
        const struck = rollLightningVariant(this.wave, this.difficulty.id, Math.random, this.theme);
        this.spawnWaveHusk(struck ?? BASIC_HUSK, !!struck);
      }
      this.nextSpawnAt = time + Math.max(600, 1800 - this.wave * 60);
    }

    // Husks act. Each one only sees the fighters standing in its own room.
    const stalkerHunt = this.arena.silenceStalkerHunt();
    const currentRoom = mansion.currentRoom;
    for (const husk of alive) {
      husk.huntInvisibleTargets = stalkerHunt && husk.roomIndex === currentRoom;
      husk.update(this.targetsInRoom(husk.roomIndex), time, delta);
    }

    this.effects?.update(time, delta);
    this.updateShots(time, delta);
    this.tickRoomPressure(time, alive);

    // The mansion's own contents: props first (they may open an overlay), then
    // the apocalypse, which runs last so its dormancy stomp on the corrupt-kin
    // wins over the husk AI that ran at the top of this frame.
    this.features?.update(time);
    this.record?.update(delta);
    this.apocalypse?.update(time, delta);
    if (this.apocalypse) mansion.setCorruptionReadout(this.apocalypse.corruptionLevels());

    // Mansion: door travel, door pulses, minimap (with live husk counts).
    const counts = new Array<number>(ROOM_COUNT).fill(0);
    for (const h of alive) counts[h.roomIndex] = (counts[h.roomIndex] ?? 0) + 1;
    mansion.update(time, player, counts);

    this.shardLabel?.setText(`🩸 ${this.shardsEarned}`);
    this.remaining = alive.length + this.pendingSpawns + (this.pendingBoss ? 1 : 0);
    const roomName = this.targetRoom >= 0
      ? `${ROOM_META[this.targetRoom].emoji} ${ROOM_META[this.targetRoom].name}`
        + (this.targetRoom2 >= 0 ? ` + ${ROOM_META[this.targetRoom2].emoji} ${ROOM_META[this.targetRoom2].name}` : '')
      : undefined;
    this.waveLabel?.setText(formatWaveLabel(this.wave, this.remaining, roomName));
  }

  // ── Wave flow ─────────────────────────────────────────────────────

  private announceWave(waveNum: number, time: number): void {
    const mansion = this.mansion!;
    const standing = mansion.standingRooms();
    if (standing.length === 0) return;
    // The grand hall is fair game too — it just can't be gnawed down.
    const candidates = [HALL_ROOM, ...standing];
    // Prefer somewhere new, so the defence keeps you moving through the house.
    const options = candidates.filter((r) => r !== this.lastTargetRoom);
    // The first wave always comes up through the cellar — it is where the house
    // is thinnest, and it puts you next to the record player on night one.
    const room = waveNum === 1 && candidates.includes(CELLAR_ROOM)
      ? CELLAR_ROOM
      : options[Math.floor(Math.random() * options.length)] ?? candidates[0];

    // Apocalypse co-op: from wave three on, the house sometimes comes at both of
    // you at once and you have to split up. Solo runs never get this — one
    // defender cannot be in two rooms, and losing a wing to arithmetic isn't a
    // fight.
    let second = -1;
    if (this.coopHooks && this.apocalypse?.isActive && waveNum >= 3 && Math.random() < 0.45) {
      const rest = candidates.filter((r) => r !== room);
      second = rest[Math.floor(Math.random() * rest.length)] ?? -1;
    }

    this.wave = waveNum;
    this.targetRoom = room;
    this.targetRoom2 = second;
    this.spawnFlip = false;
    this.lastTargetRoom = room;
    this.phase = 'warning';
    // The corner wings are a room further out, and you can no longer see across
    // the floor to find them — the ruined house gives you longer to get there.
    this.phaseEndsAt = time + (this.apocalypse?.isActive ? ROOM_WARNING_MS + 1800 : ROOM_WARNING_MS);
    mansion.setTarget(room, second);
    this.coopHooks?.onWaveAnnounced(waveNum, room);
    if (second >= 0) this.coopHooks?.onWaveAnnounced(waveNum, second);

    Sfx.play('countdown-go', { rate: Math.min(1.6, 0.9 + waveNum * 0.04) });
    Music.setIntensity(Math.min(1, 0.35 + waveNum * 0.05));
    this.showWaveWarning(waveNum, room);
  }

  /** Also used by the co-op guest so both players get the same warning. */
  showWaveWarning(waveNum: number, room: number): void {
    if (!this.waveBanner) return;
    const meta = ROOM_META[room];
    this.waveBanner
      .setText(`WAVE ${waveNum}  —  ${meta.emoji} THEY'RE COMING FOR THE ${meta.name}!`)
      .setFontSize(20).setColor('#ffcc66').setAlpha(1);
    this.arena.scene.tweens.killTweensOf(this.waveBanner);
    this.arena.scene.tweens.add({ targets: this.waveBanner, alpha: 0, delay: ROOM_WARNING_MS - 900, duration: 700 });
  }

  private beginWave(time: number): void {
    this.phase = 'active';
    // A split wave is bigger, but not twice as big — you are still two people.
    const split = this.targetRoom2 >= 0 ? 1.5 : 1;
    this.pendingSpawns = Math.round(
      (4 + 3 * (this.wave - 1)) * (this.coopHooks?.spawnMultiplier ?? 1) * split);
    this.pendingBoss = isBossWave(this.wave) ? rollBossVariant(Math.random, this.wave) : null;
    this.nextSpawnAt = time;
    this.observatory?.onWaveBegan();

    if (!this.waveBanner) return;
    this.waveBanner.setText(`WAVE ${this.wave}`).setFontSize(28).setColor('#88cc44').setAlpha(1);
    this.arena.scene.tweens.killTweensOf(this.waveBanner);
    this.arena.scene.tweens.add({ targets: this.waveBanner, alpha: 0, delay: 1400, duration: 600 });
  }

  private announceBoss(boss: HuskVariantDef, infected: boolean): void {
    // An infected boss is announced as one: the eye goes on the banner and the
    // name is read in the corruption's colour, so you know before it moves.
    const hex = infected ? '#ff5577' : `#${boss.color.toString(16).padStart(6, '0')}`;
    const name = `${boss.emoji ?? ''} ${infected ? `INFECTED ${boss.name}` : boss.name}`.trim();
    this.showBossBanner(name, hex);
    this.coopHooks?.onBossSpawned(name, hex);
  }

  /**
   * The gramophone was paid. Everything the current wave still owes is called
   * off and everything it already put on the floor walks back out — killed off
   * the books, paying nothing and writing no journal entry, so a skip can never
   * be a way to farm one. Then the counter is set so the *next* wave announced
   * is `target`, and the run continues from a night that never happened.
   *
   * The corruption's own brood is deliberately left standing: corrupt-kin are
   * not part of any wave, and clearing a room of them is supposed to cost you
   * a fight rather than a coin.
   */
  private skipToWave(target: number): void {
    const scene = this.arena.scene;
    if (this.ending || target <= this.wave) return;
    const from = this.wave;

    this.pendingSpawns = 0;
    this.pendingBoss = null;
    for (const h of this.livingHusks()) {
      if (h.variant.id === 'corrupt-kin') continue;
      h.boss?.clear();
      // Unbind any superposition first, so neither half is left pointing at the other.
      if (h.possessing) { h.possessing.possessedBy = null; h.possessing = null; }
      if (h.possessedBy) { h.possessedBy.possessing = null; h.possessedBy = null; }
      h.noRewardKill = true;
      this.effects?.unregister(h);
      this.apocalypse?.forget(h);
      this.arena.removeEnemy(h);
      h.hideHealthBar();
      h.setActive(false);
      scene.tweens.add({
        targets: h, alpha: 0, duration: 450,
        onComplete: () => { if (h.scene) h.destroy(); },
      });
    }
    for (const s of this.shots) s.gfx.destroy();
    this.shots = [];

    this.wavesWereSkipped = true;
    this.wave = target - 1;
    this.clearedWaves = Math.max(this.clearedWaves, target - 1);
    this.remaining = 0;
    this.targetRoom = -1;
    this.targetRoom2 = -1;
    this.mansion?.setTarget(-1);
    this.phase = 'rest';
    this.phaseEndsAt = scene.time.now + INTERMISSION_MS;

    Sfx.play('boss-phase', { rate: 1.4 });
    Music.setIntensity(Math.min(1, 0.35 + target * 0.05));
    const player = this.arena.player;
    this.arena.showFloatingText(player.x, player.y - 50,
      `🎵 THE NIGHT SKIPS  —  WAVE ${from} → ${target}`, '#e8c88a');
    if (this.waveBanner) {
      this.waveBanner.setText(`🎵  THE NEEDLE JUMPS TO WAVE ${target}`)
        .setFontSize(22).setColor('#e8c88a').setAlpha(1);
      scene.tweens.killTweensOf(this.waveBanner);
      scene.tweens.add({ targets: this.waveBanner, alpha: 0, delay: 1500, duration: 700 });
    }
  }

  /** Also called on the guest side (via the co-op kit) so both players see it. */
  showBossBanner(name: string, colorHex: string): void {
    Sfx.play('boss-phase');
    const scene = this.arena.scene;
    const { width } = scene.scale;
    const text = scene.add.text(width / 2, WAVE_BANNER_Y + 40, `☠  ${name}  ☠`, {
      fontSize: '30px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: colorHex, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(26);
    scene.tweens.add({ targets: text, alpha: 0, scaleX: 1.3, scaleY: 1.3, delay: 1400, duration: 800, onComplete: () => text.destroy() });
    scene.cameras.main.shake(400, 0.006);
  }

  // ── Room pressure ─────────────────────────────────────────────────

  /** Crowded rooms take damage: each husk over the limit gnaws at the walls. */
  private tickRoomPressure(time: number, alive: Husk[]): void {
    const mansion = this.mansion;
    if (!mansion || this.ending || time < this.nextGnawTickAt) return;
    this.nextGnawTickAt = time + 1000;

    const counts = new Map<number, number>();
    for (const h of alive) counts.set(h.roomIndex, (counts.get(h.roomIndex) ?? 0) + 1);

    for (const [room, count] of counts) {
      if (room === HALL_ROOM || mansion.lost[room]) continue;
      const extra = count - ROOM_CROWD_LIMIT;
      if (extra <= 0) continue;
      const nowLost = mansion.damageRoom(room, extra * ROOM_GNAW_PER_EXTRA);
      if (nowLost) {
        this.onRoomLost(room);
      } else if (time - this.lastGnawWarnAt > 4000) {
        this.lastGnawWarnAt = time;
        const meta = ROOM_META[room];
        const player = this.arena.player;
        this.arena.showFloatingText(player.x, player.y - 64,
          `🏚️ THE ${meta.name} IS BEING TORN APART! (${Math.ceil(mansion.hp[room])}/${ROOM_MAX_HP})`, '#ff8855');
        this.arena.scene.cameras.main.shake(120, 0.002);
      }
    }
  }

  private onRoomLost(room: number): void {
    const mansion = this.mansion!;
    const scene = this.arena.scene;
    const meta = ROOM_META[room];
    Sfx.play('boss-phase');
    scene.cameras.main.shake(500, 0.008);
    this.showRoomLostBanner(room);
    this.coopHooks?.onRoomLost(room);

    // Whatever was chewing on it wanders off into the dark — no rewards.
    for (const h of this.livingHusks()) {
      if (h.roomIndex !== room) continue;
      h.noRewardKill = true;
      this.effects?.unregister(h);
      this.arena.removeEnemy(h);
      h.hideHealthBar();
      scene.tweens.add({
        targets: h, alpha: 0, duration: 500,
        onComplete: () => { if (h.scene) h.destroy(); },
      });
    }
    // A wave aimed at the fallen room has nothing left to send.
    if (this.targetRoom === room) {
      this.pendingSpawns = 0;
      this.pendingBoss = null;
      this.targetRoom = -1;
    }

    if (mansion.allOuterRoomsLost()) {
      this.ending = true;
      const { width, height } = scene.scale;
      const doom = scene.add.text(width / 2, height / 2 - 40, '🏚️ THE MANSION HAS FALLEN', {
        fontSize: '34px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ff5544', stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(41);
      scene.tweens.add({ targets: doom, scaleX: 1.15, scaleY: 1.15, duration: 1800 });
      scene.time.delayedCall(2200, () => { doom.destroy(); this.arena.endRun(); });
    }
    void meta;
  }

  /** Also called on the guest side so both players mourn the same room. */
  showRoomLostBanner(room: number): void {
    const scene = this.arena.scene;
    const { width } = scene.scale;
    const meta = ROOM_META[room];
    const text = scene.add.text(width / 2, WAVE_BANNER_Y + 40, `💥 THE ${meta.name} IS LOST`, {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ff5544', stroke: '#220000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(26);
    scene.tweens.add({ targets: text, alpha: 0, delay: 1800, duration: 700, onComplete: () => text.destroy() });
  }

  // ── Targeting / rooms ─────────────────────────────────────────────

  /** Public: also the effect engine's view of the field (EffectWorld). */
  livingHusks(): Husk[] {
    return this.arena.enemies.filter((e): e is Husk => e instanceof Husk && e.active && e.hp > 0);
  }

  /** Who a husk standing in `room` may chase and shoot at right now. */
  private targetsInRoomInternal(room: number): Fighter[] {
    const mansion = this.mansion;
    const playerHere = mansion ? mansion.currentRoom === room : true;
    // Life's plants pull aggro — but a garden only guards the room it's planted
    // in, which is wherever its keeper is standing.
    if (playerHere) {
      const plants = this.arena.plantTargets();
      if (plants.length > 0) return plants;
    }
    const out: Fighter[] = [];
    if (playerHere && !this.arena.isSilencePlayerHidden()) out.push(this.arena.player);
    if (this.coopHooks && this.allyRoom === room) out.push(...this.coopHooks.extraTargets());
    return out;
  }

  /** Alive husks standing in `room`. */
  private husksInRoom(room: number): number {
    let n = 0;
    for (const e of this.arena.enemies) {
      if (e instanceof Husk && e.active && e.roomIndex === room) n++;
    }
    return n;
  }

  /** Route husk-sourced damage to whichever fighter ate it (ally hits go over the wire). */
  private damageTargetInternal(target: Fighter, amount: number): void {
    if (amount <= 0) return;
    const isLocal = target === this.arena.player || this.arena.plantTargets().includes(target);
    if (isLocal) {
      // Husks are the one thing that may hit a co-op player through their
      // friendly-fire block.
      Fighter.asNonAllyDamage(() => target.takeDamage(amount));
      this.arena.spawnHitFlash(target.x, target.y, 0x88aa33);
    } else {
      // Co-op: hit the ally, not the local player — forward it to them.
      this.coopHooks?.onAllyBite(amount, target.x, target.y);
    }
  }

  /**
   * Room gate for ArenaScene: projectiles, colliders and kit AoEs should only
   * touch husks standing in the room the local player is looking at.
   */
  isHuskTargetable(husk: Husk): boolean {
    if (this.mansion) return husk.roomIndex === this.mansion.currentRoom;
    if (this.guestRoom >= 0) return husk.roomIndex === this.guestRoom;
    return true;
  }

  /** Co-op guest: InvasionCoopKit tells the kit which room the guest is viewing. */
  setGuestRoom(room: number): void {
    this.guestRoom = room;
  }

  /** Co-op host: the ally told us which room they're standing in. */
  setAllyRoom(room: number): void {
    this.allyRoom = room;
  }

  /**
   * Everything the invasion does to how fast the player walks: elemental hazards
   * (ice bites, oil slicks, gum trails) slowing them down, and the Swift Hare
   * constellation speeding them up. Pulled by ArenaScene rather than pushed into
   * `playerSpeedMult`, which a dozen kits already rewrite every frame.
   */
  playerHazardSpeedMult(time: number): number {
    const slow = time < this.slowUntil ? this.slowMult : 1;
    return slow * (this.observatory?.speedMult() ?? 1);
  }

  /** Mansion snapshot for the co-op wire: room HPs, lost mask, targets, ruin state. */
  mansionState(): {
    hp: number[]; lost: number; target: number; t2: number;
    ap: boolean; co: number[]; tn: number;
  } {
    const m = this.mansion;
    const blank = new Array<number>(ROOM_COUNT - 1).fill(ROOM_MAX_HP);
    if (!m) {
      return { hp: blank, lost: 0, target: -1, t2: -1, ap: false, co: [], tn: 7 };
    }
    let mask = 0;
    for (let r = 1; r < ROOM_COUNT; r++) if (m.lost[r]) mask |= 1 << (r - 1);
    return {
      hp: blank.map((_, i) => m.hp[i + 1]),
      lost: mask,
      target: this.targetRoom,
      t2: this.targetRoom2,
      ap: m.isApocalypse,
      // Quantised to a byte apiece: the guest only paints with this.
      co: (this.apocalypse?.corruptionLevels() ?? []).map((v) => Math.round(v * 255)),
      tn: this.features?.tonicMask() ?? 7,
    };
  }

  /** Show/hide every husk (and its health bar) as the player changes rooms. */
  private refreshRoomVisibility(): void {
    const current = this.mansion?.currentRoom ?? 0;
    for (const e of this.arena.enemies) {
      if (!(e instanceof Husk) || !e.active) continue;
      const inRoom = e.roomIndex === current;
      e.setVisible(inRoom && !e.possessing);
      e.setHealthBarVisible(inRoom && !e.possessing && e.hp > 0);
    }
    for (const s of this.shots) s.gfx.setVisible(s.room === current);
  }

  // ── Spawning ──────────────────────────────────────────────────────

  private spawnWaveHusk(variant: HuskVariantDef, struck = false): Husk | null {
    // A split wave alternates between its two rooms, so neither is ever the
    // "real" one you could safely camp.
    let room = this.targetRoom;
    if (this.targetRoom2 >= 0) {
      this.spawnFlip = !this.spawnFlip;
      room = this.spawnFlip ? this.targetRoom2 : this.targetRoom;
    }
    if (room < 0) return null;
    const pos = this.mansion!.windowSpawn(room, Math.random);
    const husk = this.spawnHusk(variant, pos, room);
    if (husk && struck) this.lightningFx(pos.x, pos.y, variant.color, room);
    return husk;
  }

  private spawnHusk(
    variant: HuskVariantDef,
    at: { x: number; y: number },
    room: number,
    opts: { hpFrac?: number; alpha?: number; noReward?: boolean } = {},
  ): Husk | null {
    const scene = this.arena.scene;
    const hp = Math.max(1, Math.round(
      BASE_HP * this.difficulty.hpMult * HP_SCALE * variant.hpMult * (opts.hpFrac ?? 1)));
    const speed = Math.min(MAX_HUSK_SPEED, BASE_SPEED * variant.speedMult);
    const biteDamage = Math.round(BASE_BITE * this.difficulty.dmgMult * variant.damageMult);

    const husk = new Husk(scene, at.x, at.y, hp, speed, biteDamage, 950, variant);
    husk.netId = this.nextHuskId++;
    husk.world = this;
    husk.roomIndex = room;
    husk.noRewardKill = !!(opts.noReward || variant.noReward);
    if (opts.alpha !== undefined) husk.setAlpha(opts.alpha);
    husk.onBite = (dmg, target) => {
      this.damageTargetInternal(target, dmg);
      this.effects?.onBiteLanded(husk, target);
    };
    husk.on('damaged', (amount: number) => {
      if (amount > 0 && husk.active && husk.visible) this.arena.spawnDamageNumber(husk.x, husk.y - 20, amount);
    });
    husk.once('defeated', () => this.onHuskKilled(husk));
    this.arena.addEnemy(husk);
    this.effects?.register(husk);
    // Infection rides on top of the elemental brand rather than replacing it —
    // an infected Magma Husk III is exactly as bad as it sounds. Corrupt-kin are
    // already the corruption's own and are left alone. A boss is held to a
    // higher bar: only a room the corruption has most of the way taken changes
    // one, and when it does it gets a move it otherwise never has.
    if (variant.id !== 'corrupt-kin' && this.apocalypse) {
      const infect = variant.isBoss
        ? this.apocalypse.shouldInfectBoss(room)
        : this.apocalypse.shouldInfect(room);
      if (infect) this.apocalypse.infect(husk, !!variant.isBoss);
    }

    const inView = !this.mansion || this.mansion.currentRoom === room;
    if (!inView) {
      husk.setVisible(false);
      husk.setHealthBarVisible(false);
    } else {
      // Spawn poof
      const poof = scene.add.circle(at.x, at.y, 26 * variant.sizeMult, variant.color, 0.5).setDepth(4);
      scene.tweens.add({ targets: poof, scaleX: 0.2, scaleY: 0.2, alpha: 0, duration: 350, onComplete: () => poof.destroy() });
    }
    return husk;
  }

  /**
   * The elemental lightning. A jagged bolt from the ceiling in the element's
   * colour, a flash, and the fresh husk stands branded.
   */
  private lightningFx(x: number, y: number, color: number, room: number): void {
    this.coopHooks?.onFx({ k: 'bolt', x, y, c: color, rm: room });
    if (this.mansion && this.mansion.currentRoom !== room) return;
    this.drawLightning(x, y, color);
  }

  /** Also replayed on the co-op guest. */
  drawLightning(x: number, y: number, color: number): void {
    const scene = this.arena.scene;
    const g = scene.add.graphics().setDepth(8);
    let px = x + Phaser.Math.Between(-30, 30);
    let py = 0;
    g.lineStyle(4, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(px, py);
    while (py < y - 14) {
      px += Phaser.Math.Between(-22, 22);
      py += Phaser.Math.Between(24, 44);
      g.lineTo(Math.min(px, x + 60), Math.min(py, y));
    }
    g.lineTo(x, y);
    g.strokePath();
    g.lineStyle(2, color, 1);
    g.beginPath();
    g.moveTo(x + Phaser.Math.Between(-26, 26), 0);
    g.lineTo(x, y);
    g.strokePath();
    const flash = scene.add.circle(x, y, 34, color, 0.75).setDepth(8);
    scene.cameras.main.flash(120, 255, 255, 255);
    scene.tweens.add({
      targets: [g, flash], alpha: 0, duration: 260,
      onComplete: () => { g.destroy(); flash.destroy(); },
    });
  }

  private onHuskKilled(husk: Husk): void {
    this.arena.removeEnemy(husk);

    // Anything a boss had queued dies with it — a gavel must not land after
    // the thing that swung it is gone.
    husk.boss?.clear();
    // A boss riding this husk is set loose rather than dying with it.
    husk.possessedBy?.releasePossession(this.arena.scene.time.now);
    // Cleaning up a demon mid-possession must not strand its victim's flag.
    if (husk.possessing) { husk.possessing.possessedBy = null; husk.possessing = null; }

    if (husk.variant.explodes) this.detonate(husk);
    this.effects?.onHuskDeath(husk);
    this.effects?.unregister(husk);
    const wasInfected = !!this.apocalypse?.isInfected(husk);
    this.apocalypse?.forget(husk);

    // The journal writes itself, and only off your own kills. The in-memory set
    // is checked first so the common case (a variant already in the book) never
    // touches localStorage — this runs on every husk that dies.
    if (!husk.noRewardKill && !this.journalKnown.has(husk.variant.id)) {
      this.journalKnown.add(husk.variant.id);
      if (PlayerData.recordHuskKill(husk.variant.id)) {
        this.arena.showFloatingText(husk.x, husk.y - 46, '📓 NEW JOURNAL ENTRY', '#e4d7b4');
      }
    }
    // The Leech: every kill is a sip.
    const leech = this.observatory?.killHeal ?? 0;
    if (leech > 0 && !husk.noRewardKill) this.arena.player.heal(leech);

    if (!husk.noRewardKill) {
      const base = 1 + Math.floor((this.wave - 1) / 3);
      // Fortune husks are walking purses — twice the shards if you can pin one.
      const gild = husk.variant.elementId === 'fortune' ? 2 : 1;
      // Corrupt-kin pay well: cutting a corruption out is the point.
      const kin = husk.variant.id === 'corrupt-kin' ? 4 : 1;
      const reward = Math.round(
        base * this.difficulty.shardMult * (husk.variant.isBoss ? 10 : 1) * gild * kin
        * (wasInfected ? 1.5 : 1) * (this.observatory?.shardMult() ?? 1));
      this.shards += reward;
      if (husk.visible) this.arena.showFloatingText(husk.x, husk.y - 30, `+${reward} 🩸`, '#cc44ff');
      this.coopHooks?.onHuskDefeated(husk, reward);
      this.arena.notifyHuskDefeated?.(husk);
    } else {
      this.coopHooks?.onHuskDefeated(husk, 0);
    }
    husk.hideHealthBar();
    husk.setTint(0x334411);
    this.arena.scene.tweens.add({
      targets: husk,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
  }

  /** Explosive death blast — hurts players *and* other husks caught in it. */
  private detonate(blaster: Husk): void {
    const r = BLASTER_BOOM_RADIUS;
    const dmg = blaster.biteDamage * 2;
    const room = blaster.roomIndex;
    if (!this.mansion || this.mansion.currentRoom === room) this.boomVisual(blaster.x, blaster.y, r, 0xff5522);
    this.coopHooks?.onFx({ k: 'boom', x: blaster.x, y: blaster.y, r, rm: room });

    for (const t of this.targetsInRoomInternal(room)) {
      if (Phaser.Math.Distance.Between(blaster.x, blaster.y, t.x, t.y) <= r) this.damageTargetInternal(t, dmg);
    }
    for (const other of this.livingHusks()) {
      if (other === blaster || other.roomIndex !== room) continue;
      if (Phaser.Math.Distance.Between(blaster.x, blaster.y, other.x, other.y) <= r) {
        other.takeDamage(Math.round(dmg * BLASTER_HUSK_DAMAGE_FRAC));
      }
    }
  }

  private boomVisual(x: number, y: number, radius: number, color: number): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(x, y, radius, color, 0.45).setDepth(6).setScale(0.25);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    scene.cameras.main.shake(160, 0.004);
  }

  // ── EffectWorld (the elemental effect engine's window on the arena) ──

  get scene(): Phaser.Scene { return this.arena.scene; }

  targetsInRoom(room: number): Fighter[] {
    return this.targetsInRoomInternal(room);
  }

  damageTarget(target: Fighter, amount: number): void {
    this.damageTargetInternal(target, amount);
  }

  roomOf(husk: Husk): number {
    return husk.roomIndex;
  }

  currentRoom(): number {
    if (this.mansion) return this.mansion.currentRoom;
    // Guest side: the mansion belongs to InvasionCoopKit, which feeds us the room.
    return this.guestRoom >= 0 ? this.guestRoom : 0;
  }

  showFloatingText(x: number, y: number, text: string, color: string): void {
    this.arena.showFloatingText(x, y, text, color);
  }

  slowPlayer(mult: number, ms: number): void {
    const now = this.arena.scene.time.now;
    if (now >= this.slowUntil) this.slowMult = 1;
    this.slowMult = Math.min(this.slowMult, mult);
    this.slowUntil = Math.max(this.slowUntil, now + ms);
  }

  spawnChild(
    variant: HuskVariantDef,
    x: number,
    y: number,
    room: number,
    opts: { hpFrac?: number; alpha?: number; noReward?: boolean } = {},
  ): Husk | null {
    if (this.livingHusks().length >= MAX_LIVE_HUSKS) return null;
    return this.spawnHusk(variant, { x, y }, room, opts);
  }

  mirrorZone(x: number, y: number, r: number, color: number, ms: number, room: number): void {
    this.coopHooks?.onFx({ k: 'zone', x, y, r, c: color, ms, rm: room });
  }

  // ── HuskWorld (variant world-effects) ────────────────────────────

  fireShot(from: Husk, tx: number, ty: number, damage: number): void {
    const scene = this.arena.scene;
    const elementId = from.variant.elementId;
    const speed = elementId === 'psychic' ? HOMING_SHOT_SPEED : SHOT_SPEED;
    const ang = Math.atan2(ty - from.y, tx - from.x);
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;
    const gfx = scene.add.circle(from.x, from.y, SHOT_RADIUS, from.variant.color, 1)
      .setDepth(7).setStrokeStyle(2, 0x220022, 0.8);
    if (this.mansion && this.mansion.currentRoom !== from.roomIndex) gfx.setVisible(false);
    this.shots.push({
      gfx, vx, vy, damage,
      expiresAt: scene.time.now + SHOT_LIFETIME_MS,
      room: from.roomIndex,
      elementId,
      homing: elementId === 'psychic',
    });
    this.coopHooks?.onFx({ k: 'shot', x: from.x, y: from.y, vx, vy, ms: SHOT_LIFETIME_MS, rm: from.roomIndex });
  }

  summon(count: number, x: number, y: number): void {
    // A titan summons on a fixed timer, so a long boss fight would otherwise
    // pile up husks without bound and stall the frame rate. Past the cap it
    // just skips the summon until the field thins out again.
    const alive = this.livingHusks().length;
    if (alive >= MAX_LIVE_HUSKS) return;
    count = Math.min(count, MAX_LIVE_HUSKS - alive);

    // The titan calls its dead up wherever it stands, in its own room.
    const titan = this.livingHusks().find((h) => h.x === x && h.y === y);
    const room = titan?.roomIndex ?? this.targetRoom;
    if (room < 0) return;
    const wb = (this.arena.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world.bounds;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const d = 70 + Math.random() * 40;
      this.spawnHusk(BASIC_HUSK, {
        x: Phaser.Math.Clamp(x + Math.cos(ang) * d, wb.x + 40, wb.right - 40),
        y: Phaser.Math.Clamp(y + Math.sin(ang) * d, wb.y + 40, wb.bottom - 40),
      }, room);
    }
    if (!this.mansion || this.mansion.currentRoom === room) {
      this.arena.showFloatingText(x, y - 50, 'SUMMON!', '#bb88ff');
    }
  }

  healNearbyHusks(source: Husk, radius: number, frac: number): void {
    const scene = this.arena.scene;
    if (!this.mansion || this.mansion.currentRoom === source.roomIndex) {
      const ring = scene.add.circle(source.x, source.y, radius, 0x66ff88, 0.18).setDepth(3).setScale(0.4);
      scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    }
    this.coopHooks?.onFx({ k: 'heal', x: source.x, y: source.y, r: radius, rm: source.roomIndex });

    for (const other of this.livingHusks()) {
      if (other === source || other.hp >= other.maxHp || other.roomIndex !== source.roomIndex) continue;
      if (this.arena.scene.time.now < other.purgedUntil) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, other.x, other.y) > radius) continue;
      other.heal(Math.max(1, Math.round(other.maxHp * frac)));
      if (other.visible) this.arena.showFloatingText(other.x, other.y - 26, '+', '#66ff88');
    }
  }

  telegraph(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    // The lane starts under the charger's feet — recover its room from that.
    let room = this.currentRoom();
    let bestDist = Infinity;
    for (const h of this.livingHusks()) {
      const d = Phaser.Math.Distance.Between(h.x, h.y, x1, y1);
      if (d < bestDist) { bestDist = d; room = h.roomIndex; }
    }
    if (!this.mansion || this.mansion.currentRoom === room) this.drawLane(x1, y1, x2, y2, color, durationMs);
    this.coopHooks?.onFx({ k: 'lane', x: x1, y: y1, x2, y2, c: color, ms: durationMs, rm: room });
  }

  /** Also called on the guest side to replay a rusher telegraph. */
  drawLane(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    const scene = this.arena.scene;
    const line = scene.add.line(0, 0, x1, y1, x2, y2, color, 0.55)
      .setOrigin(0, 0).setLineWidth(6).setDepth(3);
    scene.tweens.add({
      targets: line,
      alpha: { from: 0.25, to: 0.85 },
      duration: durationMs / 2,
      yoyo: true,
      onComplete: () => line.destroy(),
    });
  }

  findPossessTarget(demon: Husk): Husk | null {
    let best: Husk | null = null;
    let bestDist = Infinity;
    for (const h of this.livingHusks()) {
      if (h === demon || h.variant.isBoss || h.possessedBy || h.roomIndex !== demon.roomIndex) continue;
      const d = Phaser.Math.Distance.Between(demon.x, demon.y, h.x, h.y);
      if (d < bestDist) { bestDist = d; best = h; }
    }
    return best;
  }

  possess(demon: Husk, victim: Husk): void {
    demon.possessing = victim;
    victim.possessedBy = demon;

    victim.setMaxHp(Math.round(victim.maxHp * POSSESS_HP_MULT));
    victim.speed = Math.min(MAX_HUSK_SPEED, victim.speed * POSSESS_SPEED_MULT);
    victim.biteDamage = Math.round(victim.biteDamage * POSSESS_DAMAGE_MULT);
    victim.sizeMult *= POSSESS_SIZE_MULT;
    victim.applySizeMult();
    victim.setTint(POSSESS_TINT);

    // Untouchable and hidden while riding — the only way to hurt it is to kill the host.
    demon.isInvincible = true;
    demon.setVisible(false);
    demon.hideHealthBar();

    if (victim.visible) this.arena.showFloatingText(victim.x, victim.y - 44, 'POSSESSED!', '#ff4466');
    if (!this.mansion || this.mansion.currentRoom === victim.roomIndex) this.boomVisual(victim.x, victim.y, 60, 0x880022);
    this.coopHooks?.onFx({ k: 'possess', x: victim.x, y: victim.y, rm: victim.roomIndex });
  }

  // ── HuskWorld: the boss half ─────────────────────────────────────
  //
  // Everything the three tenth-wave brains can do to the room. The brains own
  // *when* and *where*; this owns the pixels, the damage and the co-op mirror.

  /** Is this room the one the local player is looking at? */
  private inView(room: number): boolean {
    return !this.mansion || this.mansion.currentRoom === room;
  }

  bossSay(from: Husk, text: string, colorHex: string): void {
    if (!from.visible || !this.inView(from.roomIndex)) return;
    this.arena.showFloatingText(from.x, from.y - 58, text, colorHex);
  }

  /** A boss two rooms away is not something you should be able to hear. */
  bossSfx(from: Husk, name: string): void {
    if (!this.inView(from.roomIndex)) return;
    Sfx.play(name);
  }

  bossWanderPoint(from: Husk): { x: number; y: number } {
    const { width: W, height: H } = this.arena.scene.scale;
    // Well inside the wall band, and never right on top of where it already is.
    for (let tries = 0; tries < 8; tries++) {
      const x = 90 + Math.random() * (W - 180);
      const y = 130 + Math.random() * (H - 230);
      if (Phaser.Math.Distance.Between(x, y, from.x, from.y) > 150) return { x, y };
    }
    return { x: W / 2, y: H / 2 };
  }

  bossBlink(from: Husk, x: number, y: number, color: number): void {
    const room = from.roomIndex;
    this.bossFlash(from.x, from.y, 34, color, room);
    (from.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
    this.bossFlash(x, y, 34, color, room);
  }

  private bossFlash(x: number, y: number, r: number, color: number, room: number): void {
    this.coopHooks?.onFx({ k: 'boom', x, y, r, c: color, rm: room });
    if (!this.inView(room)) return;
    const ring = this.arena.scene.add.circle(x, y, r, color, 0.5).setDepth(6).setScale(1.4);
    this.arena.scene.tweens.add({
      targets: ring, scaleX: 0.2, scaleY: 0.2, alpha: 0, duration: 240,
      onComplete: () => ring.destroy(),
    });
  }

  bossHit(from: Husk, target: Fighter, amount: number, color: number): void {
    this.damageTargetInternal(target, amount);
    if (this.inView(from.roomIndex)) this.arena.spawnHitFlash(target.x, target.y, color);
  }

  bossSlow(mult: number, ms: number): void {
    this.slowPlayer(mult, ms);
  }

  bossZone(
    from: Husk, x: number, y: number, radius: number, color: number,
    ms: number, tickDamage: number, slowMult?: number,
  ): void {
    this.effects?.spawnZone(x, y, radius, color, from.roomIndex, ms, { tickDamage, slowMult });
  }

  bossShot(from: Husk, angle: number, o: BossShotOpts): void {
    const scene = this.arena.scene;
    const lifetime = o.lifetimeMs ?? SHOT_LIFETIME_MS;
    const vx = Math.cos(angle) * o.speed;
    const vy = Math.sin(angle) * o.speed;
    const gfx = scene.add.circle(from.x, from.y, o.radius, o.color, 1)
      .setDepth(7).setStrokeStyle(2, 0x0a0014, 0.85);
    if (!this.inView(from.roomIndex)) gfx.setVisible(false);
    this.shots.push({
      gfx, vx, vy,
      damage: o.damage,
      expiresAt: scene.time.now + lifetime,
      room: from.roomIndex,
      homing: o.homing,
      hitRadius: o.radius + 12,
    });
    this.coopHooks?.onFx({
      k: 'shot', x: from.x, y: from.y, vx, vy, ms: lifetime,
      c: o.color, rr: o.radius, rm: from.roomIndex,
    });
  }

  bossSpawn(from: Husk, variantId: string, count: number): void {
    const variant = getHuskVariant(variantId);
    const room = from.roomIndex;
    const alive = this.livingHusks().length;
    const n = Math.min(count, MAX_LIVE_HUSKS - alive);
    if (n <= 0) return;
    const wb = (this.arena.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world.bounds;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const d = 76 + Math.random() * 46;
      this.spawnHusk(variant, {
        x: Phaser.Math.Clamp(from.x + Math.cos(ang) * d, wb.x + 46, wb.right - 46),
        y: Phaser.Math.Clamp(from.y + Math.sin(ang) * d, wb.y + 46, wb.bottom - 46),
      }, room);
    }
  }

  /**
   * A telegraphed blast. The warning is drawn immediately and the damage lands
   * when it finishes, so the only thing standing between you and it is having
   * walked out — which is the entire fight against all three of them.
   */
  bossAoe(from: Husk, o: BossAoeOpts): void {
    const room = from.roomIndex;
    this.drawBossWarning(o.x, o.y, o.radius, o.color, o.warnMs, o.ring, room);
    this.coopHooks?.onFx({
      k: 'warn', x: o.x, y: o.y, r: o.radius, c: o.color, ms: o.warnMs, ring: o.ring, rm: room,
    });
    const epoch = this.bossEpoch;
    this.arena.scene.time.delayedCall(o.warnMs, () => {
      if (this.ending || epoch !== this.bossEpoch) return;
      if (this.inView(room)) {
        this.boomVisual(o.x, o.y, o.radius, o.color);
        Sfx.play(o.radius > 200 ? 'explosion-medium' : 'explosion-small');
      }
      this.coopHooks?.onFx({ k: 'boom', x: o.x, y: o.y, r: o.radius, c: o.color, rm: room });
      for (const t of this.targetsInRoomInternal(room)) {
        if (!t.active || t.hp <= 0 || t.downed) continue;
        if (Phaser.Math.Distance.Between(o.x, o.y, t.x, t.y) > o.radius) continue;
        this.damageTargetInternal(t, o.damage);
        if (o.slowMult !== undefined && o.slowMs) {
          // Only the local player has legs this can take; an ally slows on their own sim.
          if (t === this.arena.player) this.slowPlayer(o.slowMult, o.slowMs);
        }
      }
    });
  }

  /** Also replayed on the co-op guest, which never simulates the blast itself. */
  drawBossWarning(
    x: number, y: number, radius: number, color: number, ms: number, ring: boolean | undefined, room: number,
  ): void {
    if (!this.inView(room)) return;
    const scene = this.arena.scene;
    if (ring) {
      // Room-wide reads: a rim that sweeps outward to the edge it will reach.
      const sweep = scene.add.circle(x, y, radius, color, 0)
        .setDepth(3.4).setStrokeStyle(5, color, 0.9).setScale(0.12);
      scene.tweens.add({
        targets: sweep, scaleX: 1, scaleY: 1, duration: ms, ease: 'Quad.easeIn',
        onComplete: () => sweep.destroy(),
      });
      const floor = scene.add.circle(x, y, radius, color, 0.1).setDepth(3.3);
      scene.tweens.add({
        targets: floor, alpha: { from: 0.05, to: 0.26 }, duration: ms,
        onComplete: () => floor.destroy(),
      });
      return;
    }
    // Ground slams: a filled plate that darkens and a rim that closes in on it.
    const plate = scene.add.circle(x, y, radius, color, 0.18).setDepth(3.3)
      .setStrokeStyle(3, color, 0.85);
    scene.tweens.add({
      targets: plate, alpha: { from: 0.18, to: 0.5 }, duration: ms * 0.5, yoyo: true, repeat: 1,
      onComplete: () => plate.destroy(),
    });
    const closing = scene.add.circle(x, y, radius, color, 0)
      .setDepth(3.35).setStrokeStyle(4, 0xffffff, 0.55);
    scene.tweens.add({
      targets: closing, scaleX: 0.15, scaleY: 0.15, duration: ms, ease: 'Quad.easeIn',
      onComplete: () => closing.destroy(),
    });
  }

  // ── Husk projectiles ─────────────────────────────────────────────

  private updateShots(time: number, delta: number): void {
    if (this.shots.length === 0) return;
    const dt = delta / 1000;
    const wb = (this.arena.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics }).physics.world.bounds;
    const current = this.currentRoom();

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const targets = this.targetsInRoomInternal(s.room);

      // Homing orbs bend toward the nearest thing they can see.
      if (s.homing && targets.length > 0) {
        const t = targets[0];
        const want = Math.atan2(t.y - s.gfx.y, t.x - s.gfx.x);
        const have = Math.atan2(s.vy, s.vx);
        const turn = Phaser.Math.Angle.RotateTo(have, want, HOMING_TURN_RAD_PER_S * dt);
        const spd = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(turn) * spd;
        s.vy = Math.sin(turn) * spd;
      }

      s.gfx.x += s.vx * dt;
      s.gfx.y += s.vy * dt;
      s.gfx.setVisible(s.room === current);

      let done = time >= s.expiresAt
        || s.gfx.x < wb.x || s.gfx.x > wb.right || s.gfx.y < wb.y || s.gfx.y > wb.bottom;

      const hitR = s.hitRadius ?? SHOT_HIT_RADIUS;
      // Blind-fire shots can clip a silence stalker — one hit kills it.
      if (!done && s.room === current && this.arena.tryHitSilenceStalker(s.gfx.x, s.gfx.y, hitR)) done = true;

      if (!done) {
        for (const t of targets) {
          if (!t.active || t.hp <= 0 || t.downed) continue;
          // Illusion Dance: a husk shot is a projectile like any other, so it passes through.
          if (t.projectilePhase) continue;
          if (Phaser.Math.Distance.Between(s.gfx.x, s.gfx.y, t.x, t.y)
              <= hitR + 22 * t.sizeMult * t.shapeSizeMult) {
            this.damageTargetInternal(t, s.damage);
            done = true;
            break;
          }
        }
      }

      if (done) {
        // Depths shots burst into a brief tidepool where they land.
        if (s.elementId === 'depths' && time < s.expiresAt) {
          this.effects?.spawnZone(s.gfx.x, s.gfx.y, 30, 0x0e8f9c, s.room, 2600, { tickDamage: 2 });
        }
        s.gfx.destroy();
        this.shots.splice(i, 1);
      }
    }
  }

  /**
   * Co-op **guest-only** player-projectile hit path (solo runs and the host
   * route husks through ArenaScene.applyProjectileToEnemy — the same full
   * pipeline that hits the 1v1 npc). Guests can't simulate: they deal
   * feedback-only ghost damage (reported to the host via onGhostDamage) and
   * report any inflicted status via onGhostStatus the same way.
   */
  onProjectileHitHusk(proj: Projectile, husk: Husk): void {
    if (proj.isHeal) return;
    // A possessing demon is untouchable — shots pass straight through it.
    if (husk.possessing) return;
    const player = this.arena.player;
    husk.setIncomingCritContext(player.critChance, player.critMult);
    husk.takeDamage(Math.round(proj.damage * player.cardOutgoingDamageMult));
    const status = this.statusForProjectile(proj, husk);
    if (status) husk.onGhostStatus?.(status);
    this.arena.spawnHitFlash(proj.x, proj.y, 0xff6600);
    proj.setActive(false).setVisible(false);
    (proj.body as Phaser.Physics.Arcade.Body).stop();
  }

  /**
   * Which status (if any) this projectile inflicts — the co-op guest's wire
   * mirror of the applyProjectileToEnemy gates, using the guest's own
   * upgrades (they're the attacker). Kit-internal effects (thorn vine, water
   * cut, disarm…) aren't mirrored: the guest's raw damage still lands, and
   * the host remains authoritative for everything else.
   */
  private statusForProjectile(proj: Projectile, husk: Husk): HuskStatus | null {
    switch (proj.texture.key) {
      case 'proj-fire':
        // Flameshredder (Click+): fireball hits also apply the burning DOT.
        return this.arena.hasUpgrade('click')
          ? { k: 'burn', ms: Math.round(3000 * husk.statusDurMult) }
          : null;
      case 'proj-ice':
        return {
          k: 'frost',
          stacks: proj.isPowered ? 2 : 1,
          // Shattering a freeze pays out three stacks instead of one.
          shatter: husk.frozenUntil > this.arena.scene.time.now,
        };
      default:
        return null;
    }
  }

  /** Apply a status to a real (host-side or solo) husk. */
  applyHuskStatus(husk: Husk, s: HuskStatus): void {
    const now = this.arena.scene.time.now;
    switch (s.k) {
      case 'burn':
        husk.burningUntil = Math.max(husk.burningUntil, now + s.ms);
        break;
      case 'toxic':
        husk.toxicUntil = now + s.ms;
        husk.toxicDps = s.dps;
        husk.toxicTickAccum = 0;
        break;
      case 'frost':
        if (s.shatter) husk.frozenUntil = 0;
        for (let i = 0; i < (s.shatter ? 3 : s.stacks); i++) this.arena.addFrostStackTo(husk);
        break;
      case 'bleed':
        husk.bleeding = true;
        husk.bleedingUntil = Math.max(husk.bleedingUntil, now + s.ms);
        this.arena.applyBleedVisual(husk);
        break;
      // Silence statuses are Date.now()-based (checked against Date.now() in Husk).
      case 'silence':
        husk.silencedUntil = Math.max(husk.silencedUntil, Date.now() + s.ms);
        break;
      case 'halluc':
        husk.hallucinatingUntil = Math.max(husk.hallucinatingUntil, Date.now() + s.ms);
        break;
      case 'atkslow':
        husk.attackIntervalMult *= s.mult;
        husk.cooldownMult *= s.mult;
        break;
      case 'panic':
        husk.panickedUntil = Math.max(husk.panickedUntil, Date.now() + s.ms);
        break;
    }
  }

  /** Co-op host: apply a status the guest's projectile inflicted. */
  applyNetworkStatus(huskId: number, s: HuskStatus): void {
    const husk = this.arena.enemies.find((e): e is Husk => e instanceof Husk && e.netId === huskId);
    if (!husk || husk.possessing) return;
    this.applyHuskStatus(husk, s);
  }

  /** Co-op host: apply a damage report from the guest to one of our real husks. */
  applyNetworkDamage(huskId: number, amount: number): void {
    const husk = this.arena.enemies.find((e): e is Husk => e instanceof Husk && e.netId === huskId);
    if (!husk || husk.possessing) return;
    husk.takeDamage(amount);
  }

  /**
   * Co-op host: the guest's Silence Mastery has taken hold of one of our husks. Hold
   * its AI off (`Husk.update` yields on `puppetControlledUntil`) and put the body where
   * the guest says it is — they are driving their replica and streaming it back.
   */
  applyNetworkPuppet(huskId: number, on: boolean, x: number, y: number): void {
    const husk = this.arena.enemies.find((e): e is Husk => e instanceof Husk && e.netId === huskId);
    if (!husk || !husk.active) return;
    if (!on) {
      husk.puppetControlledUntil = 0;
      return;
    }
    // Generous window: at 20 Hz a dropped packet or two must not hand control back.
    husk.puppetControlledUntil = this.arena.scene.time.now + 400;
    (husk.body as Phaser.Physics.Arcade.Body | null)?.reset(x, y);
  }

  get currentWave(): number { return this.wave; }

  /** Husks left in the current wave, including ones still queued to spawn. */
  get remainingThisWave(): number { return this.remaining; }

  /** Variant index per live husk, for the co-op snapshot. */
  variantIndexOf(husk: Husk): number { return huskVariantIndex(husk.variant); }
}
