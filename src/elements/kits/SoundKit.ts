import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  ArmGesture, SOUND, SoundAura, SoundAvatar, SoundColorFn, SoundFx,
} from './SoundVisuals';

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
  readonly npcCastId: string | null;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  setIsDodging(v: boolean): void;
  applyNpcSpeedMult(factor: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  soundColor(owner: 'player' | 'npc', base: number): number;
  // ── Mastery ──
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBestStat(key: string, value: number): void;
}

type NoteType = 'normal' | 'red' | 'blue' | 'purple' | 'bass';

interface SoundNote {
  /** A container of drawn note art — see `createRhythmNoteSprite`. */
  sprite: Phaser.GameObjects.Container;
  /** The Graphics inside it, repainted each frame so the note visibly rings as it travels. */
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  isRed: boolean;
  noteType: NoteType;
  damage: number;
  isHold: boolean;
  holdActive: boolean;
  /** How far from the hit line this note still counts as struck. Solo notes are wider. */
  tolerance: number;
  /** Drawn length, fixed at spawn — a tempo change mid-flight must not resize a live note. */
  width: number;
}

interface ComposedNote {
  xFrac: number;
  type: NoteType;
}

/** Bass fires no wave of its own — its damage is in the charges it lays. */
const NOTE_DMGS: Record<NoteType, number> = { normal: 20, red: 30, blue: 20, purple: 20, bass: 0 };
const COMPOSE_COSTS: Record<NoteType, number> = { normal: 1, red: 3, blue: 2, purple: 3, bass: 5 };
const NOTE_COLORS: Record<NoteType, number> = {
  normal: SOUND.rose,
  red: SOUND.crimson,
  blue: SOUND.flow,
  purple: SOUND.violet,
  bass: SOUND.aqua,
};
const NOTE_TOOLTIPS: Record<NoteType, string> = {
  normal: 'Normal — 20 dmg on hit.',
  red: 'Red — 30 dmg on hit (crit).',
  blue: 'Blue — 20 dmg + slows the enemy 30% for 2s.',
  purple: 'Purple — 20 dmg + grants you +25% speed for 3s.',
  bass: 'Bass — lays 7 water charges in a line through your cursor, 10 dmg each.',
};

// ── Bass (Bass perk) ──────────────────────────────────────────────────────
const BASS_CHARGE_COUNT = 7;
/** Gap between charges along the aim line. Seven of these span most of the arena's width. */
const BASS_CHARGE_SPACING = 46;
const BASS_CHARGE_DAMAGE = 10;
const BASS_CHARGE_RADIUS = 48;
/** Fuse on the first charge; each one further out goes off this much later again. */
const BASS_FUSE_MS = 520;
const BASS_FUSE_STEP_MS = 70;

/** One water charge laid down by a struck Bass note. */
interface BassCharge {
  x: number;
  y: number;
  owner: 'player' | 'npc';
  armedAt: number;
  explodeAt: number;
}
/**
 * F+ Grace Notes: how many times a note-timed grapple hands the cooldown straight back.
 * Two refreshes means three grapples land in a row and the third one finally starts the
 * cooldown — the chain has a hard end rather than a fourth free cast.
 */
const GRACE_NOTE_MAX_REFRESHES = 2;
const GRACE_NOTE_CHAIN_LEN = GRACE_NOTE_MAX_REFRESHES + 1;

const NOTE_WIDTH = 26;
/**
 * Solo runs the track 3× faster, so its notes are drawn twice as long — and the window
 * to strike one grows with them, or the tempo alone would decide the performance.
 */
const SOLO_NOTE_WIDTH = NOTE_WIDTH * 2;
const NOTE_TOLERANCE = 30;

const HOLD_COLOR = SOUND.mint;
// Green hold notes are long sustained bars — you hold Click the whole time the
// bar overlaps the hit line. Width sets how long that hold window lasts.
const HOLD_NOTE_WIDTH = 170;
// Screech Barrier is a hollow ring: only the wall itself bites. Standing in the quiet
// middle is safe, so the barrier reads as something you cross rather than something you
// avoid. The radius matches the ~80px visual with a little body-size forgiveness.
const SCREECH_RADIUS = 88;
/** How thick the damaging wall is, measured inward from `SCREECH_RADIUS`. */
const SCREECH_BAND = 26;

/** Distance from a point to a segment — the lane test behind Sound's own hitscan. */
function pointToSegmentDist(
  px: number, py: number, ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** True while a fighter is standing in the barrier wall rather than inside or outside it. */
function inScreechWall(cx: number, cy: number, t: Fighter): boolean {
  const d = Phaser.Math.Distance.Between(cx, cy, t.x, t.y);
  return d <= SCREECH_RADIUS && d >= SCREECH_RADIUS - SCREECH_BAND;
}

// ── Sound Mastery ─────────────────────────────────────────────────────────

/** Resonance Barrier: shield laid down per note landed. Uncapped — only a miss ends it. */
const RESONANCE_SHIELD_PER_NOTE = 10;
/** Floating text only at these round numbers, so a note every second isn't a wall of text. */
const RESONANCE_ANNOUNCE_STEP = 50;

const BUGLE_COOLDOWN_MS = 15000;
/** How long the horn is held to the lips before the caravan comes over the horizon. */
const BUGLE_BLOW_MS = 550;

const CARAVAN_DAMAGE = 35;
const CARAVAN_SPEED = 760;
/** Peak shove speed, decayed to nothing across `CARAVAN_SHOVE_MS`. */
const CARAVAN_KNOCKBACK = 700;
const CARAVAN_SHOVE_MS = 420;
/** Half the wagon's hit box — generous vertically so a clipped fighter still gets run down. */
const CARAVAN_HALF_W = 78;
const CARAVAN_HALF_H = 44;
const CARAVAN_BODY_W = 150;

const VIBRATION_MS = 15000;
const VIBRATION_NOTE_DMG = 5;
/**
 * Online only. A remote bugler's own note hits are never broadcast, so their vibration
 * ticks on this sim at the base rhythm tempo instead — roughly what they'd shake out of
 * us by landing every note themselves.
 */
const NPC_VIBRATION_TICK_MS = 1100;

interface SoundCaravan {
  owner: 'player' | 'npc';
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  /** +1 runs left-to-right, -1 the other way. */
  dir: 1 | -1;
  /** Everything already run down — the caravan only hits each fighter once. */
  hit: Set<Fighter>;
  wheelPhase: number;
}

/** A decaying push applied after the AI/input has set velocity, so it actually lands. */
interface CaravanShove {
  f: Fighter;
  vx: number;
  vy: number;
  until: number;
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'rhythm-shot': 'punch',
  'flow-mode': 'flex',
  'screech-barrier': 'slam',
  'sound-grapple': 'dash',
  solo: 'raise',
};

// ── SoundKit ──────────────────────────────────────────────────────────────

export class SoundKit {
  // ── Visuals ─────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: SoundColorFn;
  private readonly ncol: SoundColorFn;
  private readonly pfx: SoundFx;
  private readonly nfx: SoundFx;
  /** The performer rig (cone hands, eyes, note crown) for each sound fighter. */
  private playerAvatar: SoundAvatar | null = null;
  private npcAvatar: SoundAvatar | null = null;
  /** Stance tells. Resonance sits lowest so the mastery shell reads under everything else. */
  private resonanceAura: SoundAura | null = null;
  private flowAura: SoundAura | null = null;
  private soloAura: SoundAura | null = null;
  private harmonyAura: SoundAura | null = null;
  /** One shaking tell per fighter still ringing from a caravan hit. */
  private vibrationAuras = new Map<Fighter, SoundAura>();
  /**
   * Three world layers, because these objects are not all in the same place: barriers lie on the
   * floor and must pass under the fighters, the grenade and the caravan sit in the air over them,
   * and the Solo stage is furniture that everything else stands on.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private stageGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer to face. */
  private lastAimX = 0;
  private lastAimY = 0;
  /** 0 = mid-strum, 1 = settled. Drives the pick hand and the ringing strings during a Solo. */
  private strumT = 1;

  // ── HUD ─────────────────────────────────────────────────────────────
  private soundHitRing: Phaser.GameObjects.Arc | null = null;
  private soundStreakText: Phaser.GameObjects.Text | null = null;
  private soundAccidentalSprites: Phaser.GameObjects.Rectangle[] = [];

  // ── Rhythm state ─────────────────────────────────────────────────────
  private soundNotes: SoundNote[] = [];
  private soundLastSpawnAt = 0;
  private soundNoteStreak = 0;
  private soundFlowActive = false;
  private soundFlowCancelRequestedAt = 0;
  private soundPointerWasDown = false;
  private soundLastClickTime = 0;
  private soundAccidentals = 0;
  private soundNoteSpawnCount = 0;

  // ── Screech state ─────────────────────────────────────────────────────
  // The barrier is painted into `groundGfx` every frame rather than owning a sprite, so its
  // wall can actually ring. `token` is only an identity for takeDamage's stationary-source
  // check — a fresh object per placement, so each barrier is its own source.
  private soundScreechX = 0;
  private soundScreechY = 0;
  private soundScreechExpiry = 0;
  private soundScreechToken: object | null = null;
  private soundScreechRed = false;
  private soundScreechTickAccum = 0;
  private soundScreechIsStar = false;

  // ── NPC screech ───────────────────────────────────────────────────────
  private npcSoundScreechX = 0;
  private npcSoundScreechY = 0;
  private npcSoundScreechExpiry = 0;
  private npcSoundScreechToken: object | null = null;
  private npcSoundScreechRed = false;
  private npcSoundScreechTickAccum = 0;

  // ── Grapple ───────────────────────────────────────────────────────────
  private soundFGrappleExplodes = false;
  private soundGrappleActive = false;
  private soundGrappleRefreshes = 0;
  /**
   * Note-timed grapples landed back-to-back without the cooldown ever running. Distinct
   * from the refresh count: the last grapple of a chain gets no refresh but still counts.
   */
  private soundGrappleChain = 0;
  private soundGrappleCdWasReady = true;

  // ── E+ hold note ──────────────────────────────────────────────────────
  /** Endpoint of the sustain beam while a hold note is being played, or null. */
  private soundHoldBeamTo: Fighter | null = null;
  private soundHoldBeamAccum = 0;
  private soundSelfSlowUntil = 0;
  private soundHoldMissHandled = false;

  // ── Click+ composing ──────────────────────────────────────────────────
  private soundComposingActive = false;
  private soundRightPointerWasDown = false;
  private soundComposurePoints = 20;
  private soundComposedPattern: ComposedNote[] = [];
  private soundComposingLooperIdx = 0;
  private soundComposingLastSpawn = 0;
  private soundComposePalette: Phaser.GameObjects.GameObject[] = [];
  private soundComposedNoteSprites: Array<{
    sprite: Phaser.GameObjects.Container;
    type: NoteType;
    xFrac: number;
    patternIdx: number;
  }> = [];

  // ── Q: Solo (guitar performance mode) ─────────────────────────────────
  private soundSoloActive = false;
  private soundSoloReturnX = 0;
  private soundSoloReturnY = 0;
  private soundSoloGraceUntil = 0;
  /** Where the stage and the ball hang for this performance — the set is drawn, not spawned. */
  private soloBallX = 0;
  private soloBallY = 0;
  private soloStageY = 0;

  // ── Q+ crescendo speed (reserved for a future Solo+) ──────────────────
  private soundCrescendoSpeedUntil = 0;
  private soundCrescendoSpeedBonus = 0;

  // ── Bass (perk): water charges in flight ──────────────────────────────
  private bassCharges: BassCharge[] = [];

  // ── Purple/blue note effects ──────────────────────────────────────────
  private soundComposeSpeedUntil = 0;
  private soundComposeSpeedBonus = 0;
  private soundNpcSlowUntil = 0;

  // ── Harmony perk: sonic grenade + star buffs ──────────────────────────
  /** Live position of the thrown resonator. Tweened as a plain object; the art is painted. */
  private harmonyGrenade: { x: number; y: number } | null = null;
  private harmonyGrenadeX = 0;
  private harmonyGrenadeY = 0;
  private harmonyGrenadeExplodeAt = 0;
  private harmonyGrenadeArmedAt = 0;
  private harmonySongSpeedBonus = 0;
  private harmonySongSpeedUntil = 0;
  private harmonyMoveSpeedBonus = 0;
  private harmonyMoveSpeedUntil = 0;
  private harmonyStarAuraUntil = 0;

  // ── Mastery: Resonance Barrier + Bugle ────────────────────────────────
  private caravans: SoundCaravan[] = [];
  private caravanShoves: CaravanShove[] = [];
  /** Horns at someone's lips, repainted each frame so the call keeps ringing out of the bell. */
  private bugles: Array<{ gfx: Phaser.GameObjects.Graphics; owner: 'player' | 'npc'; dir: 1 | -1 }> = [];
  /**
   * Seeded a full cooldown in the past. The kit's very first match runs the constructor
   * rather than `reset()`, and readiness is measured against absolute `scene.time.now`,
   * so a plain 0 would lock the horn out for the opening 15 seconds.
   */
  private bugleLastCastAt = -BUGLE_COOLDOWN_MS;
  private resonanceAnnounced = 0;
  private npcVibrationAccum = 0;

  constructor(private arena: SoundArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.soundColor('player', base);
    this.ncol = (base) => arena.soundColor('npc', base);
    this.pfx = new SoundFx(arena.scene, this.pcol);
    this.nfx = new SoundFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): SoundFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): SoundColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Sound. */
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

  /** The Solo set — stage, ball, guitar. Under the fighters, over the floor. */
  private stage(): Phaser.GameObjects.Graphics {
    if (!this.stageGfx || !this.stageGfx.active) {
      this.stageGfx = this.arena.scene.add.graphics().setDepth(4);
    }
    return this.stageGfx;
  }

  // ── Public accessors ──────────────────────────────────────────────────

  getNoteStreak(): number { return this.soundNoteStreak; }
  isFlowActive(): boolean { return this.soundFlowActive; }
  isSoloActive(): boolean { return this.soundSoloActive; }
  isSelfSlowActive(time: number): boolean { return time < this.soundSelfSlowUntil; }
  isNpcSlowActive(time: number): boolean { return time < this.soundNpcSlowUntil; }
  getCrescendoSpeedBonus(): number { return this.soundCrescendoSpeedBonus; }
  getCrescendoSpeedUntil(): number { return this.soundCrescendoSpeedUntil; }
  getComposeSpeedBonus(): number { return this.soundComposeSpeedBonus; }
  getComposeSpeedUntil(): number { return this.soundComposeSpeedUntil; }
  isComposingActive(): boolean { return this.soundComposingActive; }
  getHarmonyMoveSpeedBonus(): number { return this.harmonyMoveSpeedBonus; }
  getHarmonyMoveSpeedUntil(): number { return this.harmonyMoveSpeedUntil; }

  // ── Reset ────────────────────────────────────────────────────────────

  reset(isSoundMatch = false): void {
    const { scene } = this.arena;

    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.resonanceAura) { this.resonanceAura.destroy(); this.resonanceAura = null; }
    if (this.flowAura) { this.flowAura.destroy(); this.flowAura = null; }
    if (this.soloAura) { this.soloAura.destroy(); this.soloAura = null; }
    if (this.harmonyAura) { this.harmonyAura.destroy(); this.harmonyAura = null; }
    for (const a of this.vibrationAuras.values()) a.destroy();
    this.vibrationAuras.clear();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    if (this.stageGfx) { this.stageGfx.destroy(); this.stageGfx = null; }
    this.vizT = 0;
    this.strumT = 1;

    for (const n of this.soundNotes) n.sprite.destroy();
    this.soundNotes = [];
    this.soundLastSpawnAt = 0;
    this.soundNoteStreak = 0;
    this.soundFlowActive = false;
    this.soundFlowCancelRequestedAt = 0;
    this.soundPointerWasDown = false;
    this.soundLastClickTime = 0;
    this.soundAccidentals = 0;
    this.soundNoteSpawnCount = 0;

    this.soundScreechX = 0; this.soundScreechY = 0; this.soundScreechExpiry = 0;
    this.soundScreechRed = false; this.soundScreechTickAccum = 0;
    this.soundScreechIsStar = false;
    this.soundScreechToken = null;

    this.npcSoundScreechX = 0; this.npcSoundScreechY = 0; this.npcSoundScreechExpiry = 0;
    this.npcSoundScreechRed = false; this.npcSoundScreechTickAccum = 0;
    this.npcSoundScreechToken = null;

    this.soundFGrappleExplodes = false;
    this.soundGrappleActive = false;
    this.soundGrappleRefreshes = 0;
    this.soundGrappleChain = 0;
    this.soundGrappleCdWasReady = true;

    this.soundHoldBeamTo = null;
    this.soundHoldBeamAccum = 0;
    this.soundSelfSlowUntil = 0;
    this.soundHoldMissHandled = false;

    this.soundComposingActive = false;
    this.soundRightPointerWasDown = false;
    this.soundComposurePoints = 20;
    this.soundComposedPattern = [];
    this.soundComposingLooperIdx = 0;
    this.soundComposingLastSpawn = 0;
    for (const o of this.soundComposePalette) { if ((o as Phaser.GameObjects.Arc).active) (o as Phaser.GameObjects.Arc).destroy(); }
    this.soundComposePalette = [];
    for (const o of this.soundComposedNoteSprites) { if (o.sprite.active) o.sprite.destroy(); }
    this.soundComposedNoteSprites = [];

    this.soundSoloActive = false;
    this.soundSoloReturnX = 0;
    this.soundSoloReturnY = 0;
    this.soundSoloGraceUntil = 0;
    this.soloBallX = 0; this.soloBallY = 0; this.soloStageY = 0;

    this.soundCrescendoSpeedUntil = 0;
    this.soundCrescendoSpeedBonus = 0;
    this.soundComposeSpeedUntil = 0;
    this.soundComposeSpeedBonus = 0;
    this.soundNpcSlowUntil = 0;

    this.bassCharges = [];

    this.harmonyGrenade = null;
    this.harmonyGrenadeExplodeAt = 0;
    this.harmonyGrenadeArmedAt = 0;
    this.harmonySongSpeedBonus = 0;
    this.harmonySongSpeedUntil = 0;
    this.harmonyMoveSpeedBonus = 0;
    this.harmonyMoveSpeedUntil = 0;
    this.harmonyStarAuraUntil = 0;

    for (const c of this.caravans) c.gfx.destroy();
    this.caravans = [];
    this.caravanShoves = [];
    for (const b of this.bugles) { if (b.gfx.active) b.gfx.destroy(); }
    this.bugles = [];
    this.bugleLastCastAt = -BUGLE_COOLDOWN_MS;
    this.resonanceAnnounced = 0;
    this.npcVibrationAccum = 0;

    if (this.soundHitRing) { this.soundHitRing.destroy(); this.soundHitRing = null; }
    if (this.soundStreakText) { this.soundStreakText.destroy(); this.soundStreakText = null; }
    for (const s of this.soundAccidentalSprites) { if (s.active) s.destroy(); }
    this.soundAccidentalSprites = [];

    if (isSoundMatch) this.buildHUD(scene);
  }

  private buildHUD(scene: Phaser.Scene): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const trackY = this.getTrackY();

    scene.add.rectangle(W / 2, trackY, W, 28, SOUND.shade, 0.92)
      .setStrokeStyle(1, SOUND.plum, 1).setDepth(20);

    this.soundHitRing = scene.add.circle(W / 2, trackY, 13, 0x000000, 0).setDepth(22);
    this.soundHitRing.setStrokeStyle(3, SOUND.magenta, 0.9);

    this.soundStreakText = scene.add.text(W - 8, trackY, '🎵 0', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffaadd',
    }).setOrigin(1, 0.5).setDepth(23);

    scene.add.text(6, trackY, 'RHYTHM', {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#884466',
    }).setOrigin(0, 0.5).setDepth(23);

    // Accidental markers (3 boxes to the left of streak text)
    const markerBaseX = W - 80;
    for (let i = 0; i < 3; i++) {
      const rect = scene.add.rectangle(markerBaseX - i * 14, trackY, 9, 12, 0x000000, 0)
        .setStrokeStyle(1.5, SOUND.magenta, 0.7).setDepth(23);
      this.soundAccidentalSprites.push(rect);
    }

    void H;
  }

  private getTrackY(): number {
    return (this.arena.height - 30) - 48 - 14;
  }

  private updateAccidentalHUD(): void {
    for (let i = 0; i < 3; i++) {
      const s = this.soundAccidentalSprites[i];
      if (!s?.active) continue;
      if (i < this.soundAccidentals) {
        s.setFillStyle(SOUND.magenta, 0.85);
      } else {
        s.setFillStyle(0x000000, 0);
      }
    }
  }

  // ── Input (called only when player element is sound) ─────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, rKey, fKey, qKey, scene } = this.arena;
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;
    const W = this.arena.width;
    const soundHitLineX = W / 2;
    const soundTolerance = 30;
    const tY = this.getTrackY();

    // ── Click+: Composing mode (right-click to toggle) ─────────────────
    if (this.arena.hasUpgrade('click')) {
      const rightJustDown = pointer.rightButtonDown() && !this.soundRightPointerWasDown;
      if (rightJustDown) {
        if (!this.soundComposingActive) {
          this.enterComposingMode(scene, time);
        } else {
          this.exitComposingMode(scene, time);
          if (this.soundComposedPattern.length > 0) {
            this.arena.showFloatingText(player.x, player.y - 40, '🎵 Pattern saved', '#ffaadd');
          }
        }
      }

      // While composing, skip other input
      if (this.soundComposingActive) {
        this.soundPointerWasDown = pointer.isDown;
        this.soundRightPointerWasDown = pointer.rightButtonDown();
        return;
      }
    }

    // ── Click: rhythm hit or miss ─────────────────────────────────────
    const soundClickJustDown = pointer.isDown && !this.soundPointerWasDown;
    if (soundClickJustDown && time - this.soundLastClickTime >= 200) {
      this.soundLastClickTime = time;
      const hitNote = this.soundNotes.find(n => !n.isHold && Math.abs(n.x - soundHitLineX) <= n.tolerance);
      if (hitNote) {
        // During Solo, hits auto-aim the nearest enemy instead of the cursor.
        let aimX = mouseX, aimY = mouseY;
        if (this.soundSoloActive) {
          const tgt = this.findNearestEnemy();
          if (tgt) { aimX = tgt.x; aimY = tgt.y; }
        }
        const shotColor = NOTE_COLORS[hitNote.noteType];
        if (hitNote.noteType === 'bass') {
          // Bass doesn't fire down the lane — it lays the lane.
          this.layBassRow(time, player.x, player.y, aimX, aimY);
        } else {
          this.soundHitscan('player', player.x, player.y, aimX, aimY, hitNote.damage, shotColor,
            hitNote.isRed ? 1.5 : 1);
        }
        this.strumT = 0;
        this.playerAvatar?.play('punch', Math.atan2(aimY - player.y, aimX - player.x));
        this.soundNoteStreak++;
        this.onNoteHit(time);

        if (hitNote.noteType === 'blue') {
          this.soundNpcSlowUntil = time + 2000;
          this.arena.showFloatingText(mouseX, mouseY - 20, '🎵 SLOW', '#3388ff');
        }
        if (hitNote.noteType === 'purple') {
          this.soundComposeSpeedUntil = time + 3000;
          this.soundComposeSpeedBonus = 0.25;
          this.arena.showFloatingText(player.x, player.y - 30, '🎵 SPEED!', '#cc88ff');
        }

        const label = hitNote.isRed ? '🔴 CRIT HIT!' : '🎵 HIT';
        const col = hitNote.isRed ? '#ff4444' : '#ff88cc';
        const ht = scene.add.text(hitNote.sprite.x, tY - 16, label, {
          fontSize: '10px', color: col, fontFamily: 'Arial Black',
        }).setOrigin(0.5).setDepth(25);
        scene.tweens.add({ targets: ht, y: ht.y - 16, alpha: 0, duration: 800, onComplete: () => ht.destroy() });
        // The note breaks up into its own colour where it was struck, on the track itself.
        this.pfx.notes(hitNote.sprite.x, tY, 3, {
          speed: 90, size: 5, life: 620, depth: 22, color: shotColor, rise: 18,
        });
        hitNote.sprite.destroy();
        const idx = this.soundNotes.indexOf(hitNote);
        if (idx !== -1) this.soundNotes.splice(idx, 1);
        this.flashHitRing(scene, hitNote.isRed ? SOUND.crimson : SOUND.blush);
      } else if (this.isHoldBarOverLine(soundHitLineX, soundTolerance)) {
        // Pressing while a green hold bar covers the line begins a hold — not a miss.
      } else {
        // Miss — consume accidental, end a solo, or take damage
        if (this.soundAccidentals > 0) {
          this.soundAccidentals--;
          this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
        } else if (this.soundSoloActive) {
          this.endSolo(time);
        } else {
          this.onNoteMiss();
          player.applySelfDamage(10);
          this.pfx.discord(player.x, player.y);
          const mt = scene.add.text(player.x, player.y - 30, 'MISS -10', {
            fontSize: '11px', color: '#ff4466', fontFamily: 'Arial Black',
          }).setOrigin(0.5).setDepth(12);
          scene.tweens.add({ targets: mt, y: mt.y - 20, alpha: 0, duration: 1000, onComplete: () => mt.destroy() });
          this.soundNoteStreak = 0;
          this.flashMissRing(scene);
        }
      }
    }
    this.soundPointerWasDown = pointer.isDown;
    this.soundRightPointerWasDown = pointer.rightButtonDown();

    // While performing a Solo, only Q responds (to end it early) — the
    // performer is locked into the rhythm and can't Flow/Screech/Grapple.
    if (this.soundSoloActive) {
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.endSolo(time);
      return;
    }

    // ── Mastery: Bugle takes over whichever slot it was bound to ──────
    const bugSlot = this.bugleSlot();
    if (bugSlot) {
      const bugKey = bugSlot === 'e' ? eKey : bugSlot === 'r' ? rKey : bugSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(bugKey)) this.tryCastBugle(time, mouseX, mouseY);
    }

    // ── E: Toggle Flow Mode (3s cancel delay) ─────────────────────────
    if (bugSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      if (!this.soundFlowActive) {
        this.soundFlowActive = true;
        this.soundFlowCancelRequestedAt = 0;
        // Ignition: the tempo doubling, drawn as three cold fronts leaving the body at once.
        this.playerAvatar?.play('flex');
        this.pfx.ripple(player.x, player.y, 12, 74, SOUND.flow, 460, 5, 6, 9);
        this.pfx.ripple(player.x, player.y, 8, 46, SOUND.flowPale, 340, 3, 6, 6);
        this.pfx.notes(player.x, player.y, 4, { speed: 130, color: SOUND.flow, depth: 8 });
        this.arena.showFloatingText(player.x, player.y - 30, '🌊 FLOW ON', '#4488ff');
        if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, SOUND.flow, 0.9);
      } else if (this.soundFlowCancelRequestedAt === 0) {
        this.soundFlowCancelRequestedAt = time;
        this.arena.showFloatingText(player.x, player.y - 30, '♪ FLOW ENDING…', '#aaddff');
      } else {
        // Cancel the cancel
        this.soundFlowCancelRequestedAt = 0;
        this.arena.showFloatingText(player.x, player.y - 30, '🌊 FLOW KEPT', '#4488ff');
      }
    }

    // ── R: Screech Barrier ────────────────────────────────────────────
    if (bugSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) {
      if (player.castAbility('screech-barrier', this.arena.buildPlayerContext(mouseX, mouseY))) {
        // A barrier laid down on the beat is "perfect" whether or not R+ is owned —
        // only the star screech itself needs the upgrade.
        const timedNote = this.soundNotes.find(n => Math.abs(n.x - soundHitLineX) <= n.tolerance * 1.5);
        if (timedNote) this.arena.recordMasteryStat('perfectScreeches', 1);

        // R+: perfect note timing → star screech
        const matchedNote = this.arena.hasUpgrade('r') ? timedNote : undefined;
        const isStar = matchedNote != null;
        if (isStar && matchedNote) {
          this.soundNoteStreak++;
          matchedNote.sprite.destroy();
          const mi = this.soundNotes.indexOf(matchedNote);
          if (mi !== -1) this.soundNotes.splice(mi, 1);
          this.onNoteHit(time);
        }

        this.soundScreechIsStar = isStar;
        this.soundScreechX = mouseX;
        this.soundScreechY = mouseY;
        this.soundScreechExpiry = time + 5000;
        this.soundScreechRed = this.soundFlowActive;
        this.soundScreechTickAccum = 0;
        this.soundScreechToken = {};

        // Planting it: the wall snaps outward from the cursor and settles into a standing wave.
        const bc = isStar ? SOUND.gold : this.soundScreechRed ? SOUND.crimson : SOUND.magenta;
        this.playerAvatar?.play('slam', Math.atan2(mouseY - player.y, mouseX - player.x));
        this.pfx.waveBurst(player.x, player.y, Math.atan2(mouseY - player.y, mouseX - player.x), 1.1, 9, bc);
        this.pfx.ripple(mouseX, mouseY, 6, SCREECH_RADIUS, bc, 420, 6, 6, 10);
        this.pfx.flash(mouseX, mouseY, 20, 8, bc);
        if (isStar) this.pfx.sparkle(mouseX, mouseY, 8, SCREECH_RADIUS * 0.7, 10, SOUND.gold);

        const bl = isStar ? '⭐ STARSONG!' : (this.soundScreechRed ? '🔴 SCREECH' : '🎵 SCREECH');
        const blColor = isStar ? '#ffee44' : (this.soundScreechRed ? '#ff4444' : '#ff88cc');
        this.arena.showFloatingText(mouseX, mouseY - 92, bl, blColor);
      }
    }

    // ── F: Sonic Grapple or Sonic Grenade (Harmony perk) ──────────────
    if (bugSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('sound-grapple', this.arena.buildPlayerContext(mouseX, mouseY))) {
        // Grant accidental
        if (this.soundAccidentals < 3) {
          this.soundAccidentals++;
          this.arena.showFloatingText(player.x, player.y - 40, '♪ +1 ACCIDENTAL', '#ffaadd');
        }

        // Check for perfect note timing (shared by both modes)
        const matchedNote = this.soundNotes.find(n => Math.abs(n.x - soundHitLineX) <= n.tolerance * 1.5);
        const captureExplodes = matchedNote != null;
        if (captureExplodes && matchedNote) {
          this.soundNoteStreak++;
          matchedNote.sprite.destroy();
          const mi = this.soundNotes.indexOf(matchedNote);
          if (mi !== -1) this.soundNotes.splice(mi, 1);
          this.onNoteHit(time);
        }

        if (this.arena.hasPerk('player', 'harmony')) {
          // ── Harmony: sonic grenade ──────────────────────────────
          const gx = mouseX, gy = mouseY;
          const gdx = gx - player.x;
          const gdy = gy - player.y;
          const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
          const travelMs = Math.max(100, Math.min(400, (glen / 1200) * 1000));

          // A plain object, not a sprite: the resonator's art is painted every frame in the
          // air layer, and a tween drives any target with x/y just as happily.
          const gren = { x: player.x, y: player.y };
          this.harmonyGrenade = gren;
          this.playerAvatar?.play('punch', Math.atan2(gy - player.y, gx - player.x));
          this.pfx.waveBurst(player.x, player.y, Math.atan2(gy - player.y, gx - player.x), 1, 9, SOUND.rose);

          this.arena.showFloatingText(player.x, player.y - 30, captureExplodes ? '🎶 SONIC GRENADE!!' : '🎶 SONIC GRENADE', '#ff99ff');

          scene.tweens.add({
            targets: gren,
            x: gx, y: gy,
            duration: travelMs,
            ease: 'Linear',
            onComplete: () => {
              if (!player.active) { this.harmonyGrenade = null; return; }
              this.harmonyGrenadeX = gx;
              this.harmonyGrenadeY = gy;
              // Note-timed: auto-explode immediately; otherwise wait 2s
              const delay = captureExplodes ? 0 : 2000;
              this.harmonyGrenadeArmedAt = scene.time.now;
              this.harmonyGrenadeExplodeAt = scene.time.now + delay;
            },
          });
        } else {
          // ── Standard grapple ────────────────────────────────────
          const gx = mouseX, gy = mouseY;
          const gdx = gx - player.x;
          const gdy = gy - player.y;
          const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
          const gspeed = 1200;
          const gTravelTime = Math.min(350, (glen / gspeed) * 1000);
          const gbody = player.body as Phaser.Physics.Arcade.Body;
          gbody.setVelocity((gdx / glen) * gspeed, (gdy / glen) * gspeed);
          this.arena.setIsDodging(true);
          this.soundGrappleActive = true;

          if (captureExplodes) {
            this.soundFGrappleExplodes = true;
            this.arena.showFloatingText(player.x, player.y - 30, '🎵 SONIC GRAPPLE!', '#ff88cc');
          } else {
            this.soundFGrappleExplodes = false;
          }

          // The line the grapple rides, and the kick off the wall behind you.
          const startX = player.x, startY = player.y;
          this.playerAvatar?.play('dash', Math.atan2(gdy, gdx));
          this.pfx.dashTrail(startX, startY, gx, gy, captureExplodes ? SOUND.gold : SOUND.magenta, 13);

          scene.time.delayedCall(gTravelTime, () => {
            if (!player.active) return;
            this.arena.setIsDodging(false);
            this.soundGrappleActive = false;
            gbody.setVelocity(0, 0);
            this.soundFGrappleExplodes = false;

            if (captureExplodes) {
              const ex = player.x, ey = player.y;
              this.pfx.boom(ex, ey, 100, { color: SOUND.magenta, petals: 8, notes: 5 });
              scene.cameras.main.shake(150, 0.004);
              for (const t of this.arena.enemies) {
                if (!t.active || t.hp <= 0) continue;
                if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) <= 100) {
                  t.takeDamage(20);
                  this.pfx.ripple(t.x, t.y, 6, 34, SOUND.blush, 300, 3, 8, 7);
                }
              }
              // F+: grace note — the cooldown comes straight back, but only twice, so the
              // third grapple of the chain lands and then the cooldown finally runs.
              this.noteGraceNote(ex, ey - 40);
            }
          });
        }
      }
    }

    // ── Q: Solo — enter the guitar performance (end is handled above) ──
    if (bugSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (player.getCooldownRatio('solo') >= 1) {
        player.triggerCooldown('solo');
        this.startSolo(scene, time);
      }
    }
  }

  // ── Q: Solo ────────────────────────────────────────────────────────────

  private startSolo(scene: Phaser.Scene, time: number): void {
    const { player } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;

    // Cancel Flow Mode instantly so the speed bonuses don't stack.
    if (this.soundFlowActive || this.soundFlowCancelRequestedAt > 0) {
      this.soundFlowActive = false;
      this.soundFlowCancelRequestedAt = 0;
      if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, SOUND.magenta, 0.9);
    }

    // Clear the track and grant a 2s grace before notes start scrolling in.
    for (const n of this.soundNotes) n.sprite.destroy();
    this.soundNotes = [];
    this.soundSoloGraceUntil = time + 2000;

    this.soundSoloActive = true;
    this.soundSoloReturnX = player.x;
    this.soundSoloReturnY = player.y;

    // Disco ball hangs above; the stage sits below it, centered. The whole set is painted from
    // these three numbers every frame — nothing here is a sprite, so it can all animate.
    const ballX = W / 2;
    const ballY = H * 0.30;
    const stageY = H * 0.55;
    const px = ballX;
    const py = stageY - 18;
    this.soloBallX = ballX;
    this.soloBallY = ballY;
    this.soloStageY = stageY;

    // Teleport the performer onto the stage.
    player.setPosition(px, py);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(px, py);
    body.setVelocity(0, 0);

    // The lights coming up: a burst off the ball and gold rings opening over the boards.
    this.pfx.flash(ballX, ballY, 46, 10, SOUND.gold);
    this.pfx.ripple(ballX, stageY, 20, 170, SOUND.gold, 620, 6, 5, 9);
    this.pfx.notes(px, py, 7, { speed: 190, color: SOUND.gold, depth: 10, size: 8 });
    this.pfx.sparkle(ballX, ballY, 10, 60, 11, SOUND.white);
    scene.cameras.main.shake(220, 0.005);
    this.playerAvatar?.play('raise', -Math.PI / 2, 900);
    this.strumT = 0;

    this.arena.showFloatingText(px, py - 44, '🎸 SOLO!', '#ffdd44');
  }

  private endSolo(time: number): void {
    if (!this.soundSoloActive) return;
    this.soundSoloActive = false;

    // The set goes dark: one last flare off the ball before the stage is struck.
    this.pfx.ripple(this.soloBallX, this.soloStageY, 30, 150, SOUND.gold, 480, 5, 5, 7);
    this.pfx.notes(this.soloBallX, this.soloStageY - 20, 6, { speed: 150, color: SOUND.gold, depth: 10 });
    if (this.stageGfx?.active) this.stageGfx.clear();

    // Return to where the solo began.
    const { player } = this.arena;
    player.setPosition(this.soundSoloReturnX, this.soundSoloReturnY);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.soundSoloReturnX, this.soundSoloReturnY);
    body.setVelocity(0, 0);

    this.pfx.waveBurst(player.x, player.y, -Math.PI / 2, 1.3, 9, SOUND.gold, 1.4);
    this.arena.showFloatingText(player.x, player.y - 40, '🎸 ENCORE!', '#ffdd44');
    void time;
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    this.vizT += delta / 1000;
    // Strum decays back to rest, so the pick hand and the ringing strings settle after a hit.
    if (this.strumT < 1) this.strumT = Math.min(1, this.strumT + delta / 260);

    // Caravans carry an owner and can belong to either side, so they tick on both sims.
    this.updateCaravans(time, delta);
    this.updateCaravanShoves(time);
    this.updateBassCharges(time);
    if (isPlayerSound) this.updatePlayerSound(time, delta);
    if (isNpcSound) {
      this.updateNpcScreech(time, delta);
      this.updateNpcVibration(time, delta);
    }
    this.paintWorld(time);
    this.updateAvatars(time, delta, isPlayerSound, isNpcSound);
  }

  /**
   * Every per-frame painter in one pass: the two barriers on the floor, the Solo set, the
   * airborne resonator and the sustain beam. Each layer is cleared and redrawn from live state,
   * so a barrier's wall rings and the disco ball turns instead of sitting there as a sprite.
   */
  private paintWorld(time: number): void {
    const anyBarrier = time < this.soundScreechExpiry || time < this.npcSoundScreechExpiry;
    const anyAir = this.harmonyGrenade !== null || this.soundHoldBeamTo !== null
      || this.bugles.length > 0 || this.bassCharges.length > 0;

    if (anyBarrier || this.groundGfx) {
      const g = this.ground();
      g.clear();
      if (time < this.soundScreechExpiry) {
        SoundFx.drawBarrier(
          g, this.pcol, this.soundScreechX, this.soundScreechY, SCREECH_RADIUS, SCREECH_BAND,
          this.vizT, this.soundScreechRed ? SOUND.crimson : SOUND.magenta,
          // The last half second fades out, so a barrier visibly expires rather than vanishing.
          Math.min(1, (this.soundScreechExpiry - time) / 500), this.soundScreechIsStar,
        );
      }
      if (time < this.npcSoundScreechExpiry) {
        SoundFx.drawBarrier(
          g, this.ncol, this.npcSoundScreechX, this.npcSoundScreechY, SCREECH_RADIUS, SCREECH_BAND,
          this.vizT, this.npcSoundScreechRed ? SOUND.crimson : SOUND.flow,
          Math.min(1, (this.npcSoundScreechExpiry - time) / 500), false,
        );
      }
    }

    if (anyAir || this.airGfx) {
      const g = this.air();
      g.clear();
      // The resonator, either in flight or sitting armed with its fuse ring closing.
      if (this.harmonyGrenade) {
        const fuse = this.harmonyGrenadeExplodeAt > 0
          ? 1 - Phaser.Math.Clamp(
            (this.harmonyGrenadeExplodeAt - time) / Math.max(1, this.harmonyGrenadeExplodeAt - this.harmonyGrenadeArmedAt), 0, 1)
          : 0;
        SoundFx.drawGrenade(g, this.pcol, this.harmonyGrenade.x, this.harmonyGrenade.y, this.vizT, fuse);
      }
      // Bass charges sit on the floor but must be seen over the fighters standing on them.
      this.paintBassCharges(g, time);
      // The sustain beam opened by a green hold note.
      const beamTo = this.soundHoldBeamTo;
      if (beamTo?.active && beamTo.hp > 0) {
        const { player } = this.arena;
        SoundFx.drawSustainBeam(g, this.pcol, player.x, player.y, beamTo.x, beamTo.y, this.vizT, SOUND.mint);
      }
    }

    // Horns own their own Graphics (they sit above the fighters, not in the air layer).
    for (const b of this.bugles) {
      const caster = b.owner === 'player' ? this.arena.player : this.arena.npc;
      if (b.gfx.active) SoundFx.drawBugle(b.gfx, this.col(b.owner), caster.x, caster.y, b.dir, this.vizT);
    }

    // The Solo set: stage, ball and the guitar in the performer's hands.
    if (this.soundSoloActive) {
      const g = this.stage();
      g.clear();
      const { player } = this.arena;
      SoundFx.drawStage(g, this.pcol, this.soloBallX, this.soloStageY, 150, this.vizT);
      SoundFx.drawDiscoBall(g, this.pcol, this.soloBallX, this.soloBallY, 22, this.vizT,
        this.soloStageY - this.soloBallY + 40);
      // The guitar is *held*, so it goes on the air layer — the stage layer passes under the
      // performer and the instrument would disappear behind them.
      SoundFx.drawGuitar(this.air(), this.pcol, player.x + 4, player.y + 6, 0.34, 0.9, this.strumT);
    } else if (this.stageGfx?.active) {
      this.stageGfx.clear();
    }
  }

  /**
   * The character rigs and every stance aura, for whichever sides are playing Sound. Built
   * lazily so a scene restart (which destroys them all) simply rebuilds on the next frame, and
   * torn down the moment a side stops being Sound.
   */
  private updateAvatars(time: number, delta: number, isPlayerSound: boolean, isNpcSound: boolean): void {
    const { scene, player, npc } = this.arena;

    if (isPlayerSound && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new SoundAvatar(scene, this.pcol, 'player');
      // During a Solo the performer's shots auto-aim, so the rig looks where they land; a
      // sustain beam pins the aim to whatever it is playing into; otherwise, the cursor.
      const target = this.soundHoldBeamTo ?? (this.soundSoloActive ? this.findNearestEnemy() : null);
      const aim = target
        ? Math.atan2(target.y - player.y, target.x - player.x)
        : Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x);
      this.playerAvatar.setFacing(aim);
      this.playerAvatar.setIntensity(this.soundSoloActive ? 1.45 : this.soundFlowActive ? 1.18 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Single owner of setHold: working the guitar takes both hands and outranks everything;
      // a sustain beam holds them forward; otherwise the idle sway runs.
      this.playerAvatar.setHold(
        this.soundSoloActive ? 'brace' : this.soundHoldBeamTo ? 'spray' : null, aim);
      const alpha = player.forceInvisible ? 0 : player.alpha;
      this.playerAvatar.update(delta, player.x, player.y, alpha);

      // Resonance shell sits lowest, so the mastery passive stacks under the stance auras
      // instead of fighting them for the same silhouette.
      if (this.arena.masteryActive && player.shieldHp > 0) {
        if (!this.resonanceAura) this.resonanceAura = new SoundAura(scene, this.pcol, 'resonance', 30, 2);
        this.resonanceAura.setIntensity(player.shieldHp / RESONANCE_ANNOUNCE_STEP);
        this.resonanceAura.update(delta, player.x, player.y, alpha);
      } else if (this.resonanceAura) {
        this.resonanceAura.destroy();
        this.resonanceAura = null;
      }

      if (this.soundFlowActive) {
        if (!this.flowAura) this.flowAura = new SoundAura(scene, this.pcol, 'flow', 24, 3);
        this.flowAura.update(delta, player.x, player.y, alpha);
      } else if (this.flowAura) {
        this.flowAura.destroy();
        this.flowAura = null;
      }

      if (this.soundSoloActive) {
        if (!this.soloAura) this.soloAura = new SoundAura(scene, this.pcol, 'solo', 26, 3);
        this.soloAura.update(delta, player.x, player.y, alpha);
      } else if (this.soloAura) {
        this.soloAura.destroy();
        this.soloAura = null;
      }

      if (time < this.harmonyStarAuraUntil) {
        if (!this.harmonyAura) this.harmonyAura = new SoundAura(scene, this.pcol, 'harmony', 30, 4);
        this.harmonyAura.update(delta, player.x, player.y, alpha);
      } else if (this.harmonyAura) {
        this.harmonyAura.destroy();
        this.harmonyAura = null;
      }
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcSound && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new SoundAvatar(scene, this.ncol, 'npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }

    // One shaking tell per fighter still ringing from a caravan, on whichever side owns them.
    // Deduped: `enemies` already contains the npc in a normal match, and updating one aura
    // twice in a frame would run its shake at double speed.
    for (const f of new Set([player, npc, ...this.arena.enemies])) {
      if (!f) continue;
      const ringing = f.active && f.hp > 0 && time < f.vibrationUntil;
      let aura = this.vibrationAuras.get(f);
      if (ringing) {
        if (!aura) {
          aura = new SoundAura(scene, this.pcol, 'vibration', 24, 4);
          this.vibrationAuras.set(f, aura);
        }
        aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
      } else if (aura) {
        aura.destroy();
        this.vibrationAuras.delete(f);
      }
    }
  }

  private updatePlayerSound(time: number, delta: number): void {
    const { player, scene } = this.arena;
    const W = this.arena.width;
    const soundHitLineX = W / 2;
    const soundTolerance = 30;

    // The cooldown running to completion is exactly what ends a chain, so both the
    // refresh budget and the chain length reset the moment the grapple comes back.
    const grappleCdReady = player.getCooldownRatio('sound-grapple') >= 1;
    if (grappleCdReady && !this.soundGrappleCdWasReady) {
      this.soundGrappleRefreshes = 0;
      this.soundGrappleChain = 0;
    }
    this.soundGrappleCdWasReady = grappleCdReady;
    const harmonyBoost = time < this.harmonySongSpeedUntil ? (1 + this.harmonySongSpeedBonus) : 1;
    // Solo runs the track 3× faster than the normal tempo (240 / 1100ms).
    const soundBaseSpeed = (this.soundSoloActive ? 720 : (this.soundFlowActive ? 360 : 240)) * harmonyBoost;
    const soundSpawnInterval = this.soundSoloActive ? 367 : (this.soundFlowActive ? 550 : 1100);
    const tY = this.getTrackY();

    // ── Flow cancel 3s delay ──────────────────────────────────────────
    if (this.soundFlowCancelRequestedAt > 0 && time >= this.soundFlowCancelRequestedAt + 3000) {
      this.soundFlowActive = false;
      this.soundFlowCancelRequestedAt = 0;
      this.arena.showFloatingText(player.x, player.y - 30, '💨 FLOW OFF', '#aaddff');
      if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, SOUND.magenta, 0.9);
    }

    // Strobe hit ring during cancel window
    if (this.soundFlowCancelRequestedAt > 0 && this.soundHitRing) {
      this.soundHitRing.setAlpha(0.5 + 0.5 * Math.sin(time * 0.01));
    } else if (this.soundHitRing) {
      this.soundHitRing.setAlpha(1);
    }

    // ── Note spawning (suppressed during the Solo grace window) ───────
    if (!this.soundComposingActive && time >= this.soundSoloGraceUntil) {
      if (this.soundComposedPattern.length > 0) {
        this.updateComposedLooper(time, soundBaseSpeed, soundSpawnInterval, tY);
      } else if (time - this.soundLastSpawnAt >= soundSpawnInterval) {
        this.soundLastSpawnAt = time;
        this.soundNoteSpawnCount++;

        // E+: every 6th note in flow mode is a green hold note
        const isHold = this.arena.hasUpgrade('e') && this.soundFlowActive && (this.soundNoteSpawnCount % 6 === 0);
        const isRed = !isHold && Math.random() < 0.04;
        const noteType: NoteType = isRed ? 'red' : 'normal';

        const metrics = this.noteMetrics();
        const built = this.createRhythmNoteSprite(W + 20, tY, noteType, metrics.width, isHold);

        this.soundNotes.push({
          sprite: built.sprite,
          gfx: built.gfx,
          x: W + 20,
          isRed,
          noteType,
          damage: NOTE_DMGS[noteType],
          isHold,
          holdActive: false,
          tolerance: metrics.tolerance,
          width: metrics.width,
        });
      }
    }

    // ── Move notes + process ──────────────────────────────────────────
    const pointerIsDown = scene.input.activePointer.isDown;
    for (let i = this.soundNotes.length - 1; i >= 0; i--) {
      const note = this.soundNotes[i];
      if (!this.soundComposingActive) {
        note.x -= soundBaseSpeed * delta / 1000;
        note.sprite.setX(note.x);
      }

      // E+: green hold note processing — holdable while the long bar overlaps the hit line
      const holdHalfW = HOLD_NOTE_WIDTH / 2;
      const holdOverLine = note.x - holdHalfW - soundTolerance <= soundHitLineX
        && soundHitLineX <= note.x + holdHalfW + soundTolerance;
      if (note.isHold && holdOverLine) {
        if (pointerIsDown) {
          note.holdActive = true;
          this.soundHoldMissHandled = false;
          this.soundHoldBeamAccum += delta;
          if (this.soundHoldBeamAccum >= 100) {
            this.soundHoldBeamAccum -= 100;
            const nearest = this.findNearestEnemy();
            if (nearest) {
              nearest.takeDamage(3);
              // A pulse arriving at the far end every tick, so the sustain visibly lands.
              this.pfx.ripple(nearest.x, nearest.y, 4, 26, SOUND.mint, 260, 2.4, 8, 6);
            }
          }
          // The beam itself is painted in the air layer; this only says where it ends. The
          // matching arm hold is set in updateAvatars, which is the single owner of setHold.
          this.soundHoldBeamTo = this.findNearestEnemy();
        } else if (note.holdActive && !this.soundHoldMissHandled) {
          this.soundHoldMissHandled = true;
          this.soundSelfSlowUntil = time + 3000;
          this.onNoteMiss();
          player.applySelfDamage(10);
          this.pfx.discord(player.x, player.y);
          this.arena.showFloatingText(player.x, player.y - 30, '♪ HOLD MISSED -10', '#ff4444');
          this.soundHoldBeamTo = null;
        }
      }

      // Note fell off left edge
      if (!this.soundComposingActive && note.x < -20) {
        if (note.isHold) {
          if (!note.holdActive && !this.soundHoldMissHandled) {
            this.soundSelfSlowUntil = time + 3000;
            this.onNoteMiss();
            player.applySelfDamage(10);
            this.arena.showFloatingText(player.x, player.y - 30, '♪ HOLD MISSED -10', '#ff4444');
          }
          this.soundHoldBeamTo = null;
        } else if (this.soundSoloActive) {
          // Solo: a dropped note ends the performance unless an accidental saves it.
          if (this.soundAccidentals > 0) {
            this.soundAccidentals--;
            this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
          } else {
            this.endSolo(time);
          }
        } else if (this.soundFlowActive) {
          // Flow penalty — consume accidental or take damage
          if (this.soundAccidentals > 0) {
            this.soundAccidentals--;
            this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
          } else {
            this.onNoteMiss();
            player.applySelfDamage(5);
            this.pfx.discord(player.x, player.y);
            const lt = scene.add.text(player.x, player.y - 30, '♪ FLOW -5', {
              fontSize: '10px', color: '#ff4444', fontFamily: 'Arial Black',
            }).setOrigin(0.5).setDepth(12);
            scene.tweens.add({ targets: lt, y: lt.y - 18, alpha: 0, duration: 900, onComplete: () => lt.destroy() });
          }
        } else {
          // A note that simply scrolled past outside Flow costs no HP, but the barrier
          // does not care why it was dropped.
          this.onNoteMiss();
        }
        if (this.soundNoteStreak > 0) this.soundNoteStreak = 0;
        note.sprite.destroy();
        this.soundNotes.splice(i, 1);
        continue;
      }
    }

    // Clear beam if no active hold note
    const hasActiveHold = this.soundNotes.some(n =>
      n.isHold && n.holdActive && pointerIsDown
      && n.x - HOLD_NOTE_WIDTH / 2 - soundTolerance <= soundHitLineX
      && soundHitLineX <= n.x + HOLD_NOTE_WIDTH / 2 + soundTolerance
    );
    if (!hasActiveHold) this.soundHoldBeamTo = null;

    // ── Star screech tracking ─────────────────────────────────────────
    if (this.soundScreechIsStar && time < this.soundScreechExpiry) {
      const nearest = this.findNearestEnemy();
      if (nearest) {
        const dx = nearest.x - this.soundScreechX;
        const dy = nearest.y - this.soundScreechY;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const moveSpeed = 40 * delta / 1000;
        this.soundScreechX += (dx / d) * moveSpeed;
        this.soundScreechY += (dy / d) * moveSpeed;
      }
    }

    // ── Player screech barrier damages enemies ────────────────────────
    if (time < this.soundScreechExpiry) {
      const barrierDmg = this.soundScreechRed ? 25 : 15;
      const screechHits: Fighter[] = [];
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (inScreechWall(this.soundScreechX, this.soundScreechY, t)) screechHits.push(t);
      }
      if (screechHits.length > 0) {
        this.soundScreechTickAccum += delta;
        if (this.soundScreechTickAccum >= 500) {
          this.soundScreechTickAccum -= 500;
          const bc = this.soundScreechIsStar ? SOUND.gold : this.soundScreechRed ? SOUND.crimson : SOUND.magenta;
          for (const t of screechHits) {
            t.takeDamage(barrierDmg, { source: this.soundScreechToken ?? undefined, sourceX: this.soundScreechX, sourceY: this.soundScreechY });
            // The wall biting: a front off the barrier into whoever is standing in it.
            this.pfx.waveBurst(t.x, t.y, Math.atan2(t.y - this.soundScreechY, t.x - this.soundScreechX), 0.9, 8, bc);
          }
        }
      } else {
        this.soundScreechTickAccum = 0;
      }
    } else if (this.soundScreechExpiry > 0 && time >= this.soundScreechExpiry) {
      // Dying wall: it collapses inward rather than blinking out.
      this.pfx.ripple(this.soundScreechX, this.soundScreechY, SCREECH_RADIUS, 8,
        this.soundScreechRed ? SOUND.crimson : SOUND.magenta, 380, 4, 6, 9);
      this.soundScreechExpiry = 0;
      this.soundScreechToken = null;
    }

    // ── NPC slow from blue notes ──────────────────────────────────────
    if (time < this.soundNpcSlowUntil) {
      this.arena.applyNpcSpeedMult(0.7);
    }

    // ── Harmony: grenade detonation ───────────────────────────────────
    if (this.harmonyGrenadeExplodeAt > 0 && time >= this.harmonyGrenadeExplodeAt) {
      this.harmonyGrenadeExplodeAt = 0;
      const ex = this.harmonyGrenadeX, ey = this.harmonyGrenadeY;
      this.harmonyGrenade = null;
      this.pfx.boom(ex, ey, 100, { color: SOUND.rose, petals: 9, notes: 6 });
      scene.cameras.main.shake(160, 0.005);

      let hitAny = false;
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(ex, ey, t.x, t.y) <= 100) {
          t.takeDamage(20);
          this.pfx.ripple(t.x, t.y, 6, 34, SOUND.rose, 300, 3, 8, 7);
          hitAny = true;
        }
      }

      if (hitAny) {
        // Stack speed bonuses
        this.harmonySongSpeedBonus += 0.15;
        this.harmonySongSpeedUntil = time + 20000;
        this.harmonyMoveSpeedBonus += 0.15;
        this.harmonyMoveSpeedUntil = time + 20000;
        this.harmonyStarAuraUntil = time + 20000;

        // The stars themselves ride on the harmony aura, built lazily in updateAvatars.
        this.pfx.sparkle(player.x, player.y, 9, 34, 10, SOUND.gold);
        this.arena.showFloatingText(ex, ey - 30, `🌟 HARMONY x${(this.harmonySongSpeedBonus / 0.15).toFixed(0)}`, '#ffeecc');
        // F+ grace note refresh
        this.noteGraceNote(ex, ey - 50);
      }
    }

    // ── Harmony: buff expiry (the orbiting stars are the aura, torn down with it) ──
    if (this.harmonyStarAuraUntil > 0 && time >= this.harmonyStarAuraUntil) {
      this.harmonyStarAuraUntil = 0;
      this.harmonySongSpeedBonus = 0;
      this.harmonySongSpeedUntil = 0;
      this.harmonyMoveSpeedBonus = 0;
      this.harmonyMoveSpeedUntil = 0;
    }

    // ── HUD update ────────────────────────────────────────────────────
    this.paintTrackNotes();
    if (this.soundStreakText) {
      if (this.soundSoloActive) {
        this.soundStreakText.setText('🎸 SOLO').setColor('#ffdd44');
      } else {
        this.soundStreakText.setText(`🎵 ${this.soundNoteStreak}`).setColor('#ffaadd');
      }
    }
    this.updateAccidentalHUD();
  }

  private updateNpcScreech(time: number, delta: number): void {
    const { player } = this.arena;
    if (time < this.npcSoundScreechExpiry) {
      const npcBDmg = this.npcSoundScreechRed ? 25 : 15;
      if (inScreechWall(this.npcSoundScreechX, this.npcSoundScreechY, player)) {
        this.npcSoundScreechTickAccum += delta;
        if (this.npcSoundScreechTickAccum >= 500) {
          this.npcSoundScreechTickAccum -= 500;
          player.takeDamage(npcBDmg, { source: this.npcSoundScreechToken ?? undefined, sourceX: this.npcSoundScreechX, sourceY: this.npcSoundScreechY });
          this.nfx.waveBurst(
            player.x, player.y,
            Math.atan2(player.y - this.npcSoundScreechY, player.x - this.npcSoundScreechX),
            0.9, 8, this.npcSoundScreechRed ? SOUND.crimson : SOUND.flow,
          );
        }
      } else {
        this.npcSoundScreechTickAccum = 0;
      }
    } else if (this.npcSoundScreechToken && time >= this.npcSoundScreechExpiry) {
      this.nfx.ripple(this.npcSoundScreechX, this.npcSoundScreechY, SCREECH_RADIUS, 8, SOUND.flow, 380, 4, 6, 9);
      this.npcSoundScreechToken = null;
    }
  }

  // Called from ArenaScene's npcCastId reaction block
  handleNpcCast(castId: string | null, time: number): void {
    const { scene, npc, player } = this.arena;
    if (!castId) return;

    // Mirror the player's gestures on the NPC rig, so a sound opponent visibly casts.
    const gesture = CAST_GESTURES[castId];
    if (gesture) this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));

    if (castId === 'screech-barrier') {
      const px = player.x, py = player.y;
      this.npcSoundScreechX = px;
      this.npcSoundScreechY = py;
      this.npcSoundScreechExpiry = time + 5000;
      this.npcSoundScreechRed = false;
      this.npcSoundScreechTickAccum = 0;
      this.npcSoundScreechToken = {};
      this.nfx.waveBurst(npc.x, npc.y, Math.atan2(py - npc.y, px - npc.x), 1.1, 9, SOUND.flow);
      this.nfx.ripple(px, py, 6, SCREECH_RADIUS, SOUND.flow, 420, 6, 6, 10);
      this.nfx.flash(px, py, 20, 8, SOUND.flow);
    }
    if (castId === 'sound-grapple') {
      const sgdx = player.x - npc.x;
      const sgdy = player.y - npc.y;
      const sglen = Math.sqrt(sgdx * sgdx + sgdy * sgdy) || 1;
      const sgspeed = 1200;
      const sgTravel = Math.min(350, (sglen / sgspeed) * 1000);
      const sgbody = npc.body as Phaser.Physics.Arcade.Body;
      sgbody.setVelocity((sgdx / sglen) * sgspeed, (sgdy / sglen) * sgspeed);
      this.nfx.dashTrail(npc.x, npc.y, npc.x + sgdx, npc.y + sgdy, SOUND.flow, 12);
      scene.time.delayedCall(sgTravel, () => {
        if (npc.active) sgbody.setVelocity(0, 0);
      });
    }
    if (castId === 'rhythm-shot') {
      this.soundHitscan('npc', npc.x, npc.y, player.x, player.y, 25, SOUND.flow, 1);
    }
  }

  /**
   * Sound's own hitscan. The shot is a pressure wave, so it is drawn as one and resolved here
   * rather than borrowing Air's lance — same 900px reach and 30px lane, different physics.
   */
  private soundHitscan(
    owner: 'player' | 'npc',
    sx: number, sy: number, tx: number, ty: number,
    damage: number, color: number, scale = 1,
  ): void {
    const dx = tx - sx, dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const endX = sx + (dx / len) * 900;
    const endY = sy + (dy / len) * 900;
    const fx = this.fx(owner);
    fx.waveLance(sx, sy, endX, endY, color, 6 * scale);

    const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (pointToSegmentDist(t.x, t.y, sx, sy, endX, endY) > 30) continue;
      const hx = t.x, hy = t.y;
      t.takeDamage(damage);
      fx.boom(hx, hy, 42 * scale, { color, mark: false, notes: 2, duration: 320 });
    }
  }

  // ── Bass (perk) ───────────────────────────────────────────────────────

  /**
   * Lay a row of water charges along the line from the caster through the cursor, centred on
   * the cursor, so the row covers both the ground short of where you pointed and the ground
   * past it. They go off from the near end outward, which makes the row read as a wave rolling
   * away from you rather than as seven simultaneous puffs.
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
      // Each charge lands with a splash of its own, so the row is visibly *laid*.
      this.pfx.ripple(cx, cy, 4, 20, SOUND.aqua, 260, 2.4, 8, 6);
    }
    this.pfx.waveBurst(sx, sy, Math.atan2(dy, dx), 1.3, 10, SOUND.aqua);
    this.arena.showFloatingText(sx, sy - 40, '🎵 BASS DROP', '#88ddff');
  }

  /** Fuses tick down; anything still in the blast when one comes due takes it. */
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

  /** Every live charge repainted in one pass, each with its own fuse ring. */
  private paintBassCharges(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const c of this.bassCharges) {
      const total = c.explodeAt - c.armedAt;
      const fuse = total > 0 ? Phaser.Math.Clamp((c.explodeAt - time) / total, 0, 1) : 0;
      SoundFx.drawBassCharge(g, this.col(c.owner), c.x, c.y, this.vizT, fuse);
    }
  }

  /**
   * F+ Grace Notes, run after a note-timed grapple lands. The first two of a chain hand
   * the cooldown straight back; the third gets nothing, so the chain closes on exactly
   * three grapples and the cooldown then runs as normal. The chain counter only survives
   * while the cooldown never completes, so its high-water mark is what the mastery's
   * "three in a row" requirement measures.
   */
  private noteGraceNote(x: number, y: number): void {
    if (!this.arena.hasUpgrade('f')) return;
    this.soundGrappleChain++;
    this.arena.recordMasteryBestStat('grappleChain', this.soundGrappleChain);

    if (this.soundGrappleRefreshes < GRACE_NOTE_MAX_REFRESHES) {
      this.soundGrappleRefreshes++;
      this.arena.player.resetCooldown('sound-grapple');
      // Refreshing makes the cooldown ready this instant, which the chain-reset detector
      // in updatePlayerSound would otherwise read as "the cooldown ran out" and hand the
      // budget straight back — an endless supply of free grapples. Close the latch here
      // so only a cooldown that genuinely elapsed ends the chain.
      this.soundGrappleCdWasReady = true;
      this.arena.showFloatingText(x, y, `✨ GRACE NOTE ${this.soundGrappleChain}/${GRACE_NOTE_CHAIN_LEN}`, '#ffeecc');
    } else {
      this.arena.showFloatingText(x, y, `🎵 CHAIN COMPLETE ${GRACE_NOTE_CHAIN_LEN}/${GRACE_NOTE_CHAIN_LEN}`, '#ffeecc');
    }
  }

  // ── Mastery: Resonance Barrier (passive) ──────────────────────────────

  /**
   * Every note that lands. Records the grind stats unconditionally — that is how the
   * mastery is earned — then, once it is on, lays another plate onto the Resonance
   * Barrier and shakes damage out of anything still ringing from a bugle blast.
   */
  private onNoteHit(time: number): void {
    if (this.soundSoloActive) this.arena.recordMasteryStat('soloNotes', 1);
    else if (this.soundFlowActive) this.arena.recordMasteryStat('flowNotes', 1);
    if (!this.arena.masteryActive) return;

    const { player } = this.arena;
    player.shieldHp += RESONANCE_SHIELD_PER_NOTE;

    // Another plate laid onto the shell — a ring rather than floating text, since a note lands
    // every second or so and the status tray already carries the running total.
    this.pfx.ripple(player.x, player.y, 18, 36, SOUND.white, 320, 3, 6, 10);

    const milestone = Math.floor(player.shieldHp / RESONANCE_ANNOUNCE_STEP);
    if (milestone > this.resonanceAnnounced) {
      this.resonanceAnnounced = milestone;
      this.arena.showFloatingText(player.x, player.y - 46, `🛡 ${Math.round(player.shieldHp)} RESONANCE`, '#ffffff');
    }

    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0 || time >= t.vibrationUntil) continue;
      t.takeDamage(VIBRATION_NOTE_DMG);
      // The note shaking loose out of whatever the caravan set ringing.
      this.pfx.ripple(t.x, t.y, 8, 30, SOUND.blush, 260, 2.4, 8, 9);
    }
  }

  /**
   * A note got away. An accidental will spend itself to cover the miss; without one the
   * whole barrier shatters. Notes dropped mid-Solo never reach here — the performance
   * ending is punishment enough — and neither does a miss an accidental already ate
   * upstream, since that path never calls in.
   */
  private onNoteMiss(): void {
    if (!this.arena.masteryActive) return;
    const { player } = this.arena;
    if (player.shieldHp <= 0) { this.resonanceAnnounced = 0; return; }

    if (this.soundAccidentals > 0) {
      this.soundAccidentals--;
      this.arena.showFloatingText(player.x, player.y - 30, '♪ SAVED!', '#ffaadd');
      return;
    }

    const lost = Math.round(player.shieldHp);
    player.shieldHp = 0;
    this.resonanceAnnounced = 0;
    this.arena.showFloatingText(player.x, player.y - 52, `💥 BARRIER SHATTERED  -${lost}`, '#ffffff');

    // The shell coming apart: plates of standing wave spinning off it, and one last discord.
    this.pfx.shatter(player.x, player.y, 28, 10);
    this.pfx.discord(player.x, player.y);
    this.pfx.ripple(player.x, player.y, 26, 78, SOUND.white, 420, 4, 7, 12);
  }

  // ── Mastery: Bugle (bindable) ─────────────────────────────────────────

  /** The slot Bugle is bound over this match, or null when it isn't bound. */
  private bugleSlot(): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.arena.masteryActive) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'bugle') return s;
    }
    return null;
  }

  /** 0 = just blown, 1 = ready. */
  getBugleCooldownRatio(time: number): number {
    return Math.min(1, (time - this.bugleLastCastAt) / BUGLE_COOLDOWN_MS);
  }

  private tryCastBugle(time: number, tx: number, ty: number): void {
    if (time - this.bugleLastCastAt < BUGLE_COOLDOWN_MS) return;
    this.bugleLastCastAt = time;
    // Private timer, so this never flows through onCastStamp — broadcast it by hand.
    this.arena.broadcastMasteryCast('bugle');
    this.blowBugle('player', tx, ty);
  }

  /** Online replay: the remote Sound player sounded their horn at (tx, ty) on our sim. */
  doNpcBugle(tx: number, ty: number): void {
    this.blowBugle('npc', tx, ty);
  }

  /**
   * The horn call. The bugle is raised for a beat and three blasts ripple out of the
   * bell before anything arrives — that wind-up is the tell the other side gets.
   */
  private blowBugle(owner: 'player' | 'npc', tx: number, ty: number): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const faceRight = tx >= caster.x;
    const dir: 1 | -1 = faceRight ? 1 : -1;

    const fx = this.fx(owner);
    const gfx = scene.add.graphics().setDepth(12);
    const bugle = { gfx, owner, dir };
    this.bugles.push(bugle);
    this.avatar(owner)?.play('raise', dir > 0 ? 0 : Math.PI, BUGLE_BLOW_MS);

    // Three blasts out of the bell, each one further than the last, calling the wagon in.
    const bellX = caster.x + dir * 50;
    const bellY = caster.y - 6;
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 150, () => {
        fx.waveBurst(bellX, bellY, dir > 0 ? 0 : Math.PI, 1.4 + i * 0.4, 11, SOUND.brassHi, 0.9);
      });
    }
    fx.notes(bellX, bellY, 4, { speed: 150, angle: dir > 0 ? 0 : Math.PI, spread: 0.7, color: SOUND.brass, depth: 11 });

    this.arena.showFloatingText(caster.x, caster.y - 48, '🎺 SOUND THE CHARGE!', '#ffe9a8');

    scene.time.delayedCall(BUGLE_BLOW_MS, () => {
      if (gfx.active) gfx.destroy();
      this.bugles = this.bugles.filter((b) => b !== bugle);
      this.spawnCaravan(owner, ty, dir);
    });
  }

  private spawnCaravan(owner: 'player' | 'npc', y: number, dir: 1 | -1): void {
    const { scene } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    const gfx = scene.add.graphics().setDepth(7);
    this.caravans.push({
      owner,
      gfx,
      // Rolls in from the edge behind the direction it was called toward.
      x: dir > 0 ? -CARAVAN_BODY_W : W + CARAVAN_BODY_W,
      // Kept clear of the rhythm track and the top of the arena so the wagon reads whole.
      y: Phaser.Math.Clamp(y, 70, H - 110),
      dir,
      hit: new Set<Fighter>(),
      wheelPhase: 0,
    });
    scene.cameras.main.shake(260, 0.006);
  }

  private updateCaravans(time: number, delta: number): void {
    if (this.caravans.length === 0) return;
    const W = this.arena.width;

    for (let i = this.caravans.length - 1; i >= 0; i--) {
      const c = this.caravans[i];
      const step = c.dir * CARAVAN_SPEED * delta / 1000;
      c.x += step;
      c.wheelPhase += step / 22;
      SoundFx.drawCaravan(c.gfx, this.col(c.owner), c.x, c.y, c.dir, CARAVAN_BODY_W, c.wheelPhase, this.vizT);

      const targets = c.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
      for (const t of targets) {
        if (!t.active || t.hp <= 0 || c.hit.has(t)) continue;
        if (Math.abs(t.x - c.x) > CARAVAN_HALF_W || Math.abs(t.y - c.y) > CARAVAN_HALF_H) continue;
        c.hit.add(t);
        const hx = t.x, hy = t.y;
        t.takeDamage(CARAVAN_DAMAGE);
        t.vibrationUntil = Math.max(t.vibrationUntil, time + Math.round(VIBRATION_MS * t.statusDurMult));
        // Run down: the impact throws the victim's own ringing off in the wagon's direction.
        this.fx(c.owner).boom(hx, hy, 72, { color: SOUND.brassHi, notes: 4, mark: false });
        this.fx(c.owner).notes(hx, hy, 4, { speed: 220, angle: c.dir > 0 ? 0 : Math.PI, spread: 0.8, color: SOUND.gold, depth: 9 });
        this.arena.showFloatingText(t.x, t.y - 38, '📳 VIBRATING', '#eeeeff');
        if (!t.knockbackImmune) {
          this.caravanShoves = this.caravanShoves.filter((s) => s.f !== t);
          this.caravanShoves.push({
            f: t,
            vx: c.dir * CARAVAN_KNOCKBACK,
            vy: -180,
            until: time + CARAVAN_SHOVE_MS,
          });
        }
      }

      if (c.x < -CARAVAN_BODY_W - 80 || c.x > W + CARAVAN_BODY_W + 80) {
        c.gfx.destroy();
        this.caravans.splice(i, 1);
      }
    }
  }

  /**
   * Re-apply the shove every frame while it lasts. The kit updates after both the WASD
   * pass and the NPC AI have already written velocity, so a one-frame push would be
   * overwritten before it moved anybody.
   */
  private updateCaravanShoves(time: number): void {
    for (let i = this.caravanShoves.length - 1; i >= 0; i--) {
      const s = this.caravanShoves[i];
      if (time >= s.until || !s.f.active || s.f.hp <= 0 || s.f.knockbackImmune) {
        this.caravanShoves.splice(i, 1);
        continue;
      }
      const k = (s.until - time) / CARAVAN_SHOVE_MS;
      (s.f.body as Phaser.Physics.Arcade.Body).setVelocity(s.vx * k, s.vy * k);
    }
  }

  /**
   * Online: a remote bugler's note hits are never broadcast, so their vibration ticks
   * here on the base rhythm tempo instead of on their actual notes.
   */
  private updateNpcVibration(time: number, delta: number): void {
    if (!this.arena.npcMasteryActive) return;
    const { player } = this.arena;
    if (!player.active || player.hp <= 0 || time >= player.vibrationUntil) {
      this.npcVibrationAccum = 0;
      return;
    }
    this.npcVibrationAccum += delta;
    if (this.npcVibrationAccum < NPC_VIBRATION_TICK_MS) return;
    this.npcVibrationAccum -= NPC_VIBRATION_TICK_MS;
    player.takeDamage(VIBRATION_NOTE_DMG);
    this.nfx.ripple(player.x, player.y, 8, 30, SOUND.blush, 260, 2.4, 8, 9);
  }

  // ── Composing mode ────────────────────────────────────────────────────

  private enterComposingMode(scene: Phaser.Scene, _time: number): void {
    this.soundComposingActive = true;
    this.soundComposurePoints = 20;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🎼 COMPOSING', '#ffaadd');
    this.buildComposePalette(scene);
  }

  private exitComposingMode(_scene: Phaser.Scene, time: number): void {
    this.soundComposingActive = false;
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, '🎼 EXIT COMPOSE', '#aaddff');
    this.teardownComposePalette();
    // Destroy preview dots placed on the track during composing
    for (const o of this.soundComposedNoteSprites) {
      if (o.sprite.active) o.sprite.destroy();
    }
    this.soundComposedNoteSprites = [];
    // Reset looper so composed pattern starts fresh
    this.soundComposingLooperIdx = 0;
    this.soundComposingLastSpawn = time;
  }

  private buildComposePalette(scene: Phaser.Scene): void {
    this.teardownComposePalette();
    const W = this.arena.width;
    const cy = 40;

    // Bass (perk) is a fifth token, so the panel has to grow to hold it.
    const types: NoteType[] = this.arena.hasPerk('player', 'bass')
      ? ['normal', 'red', 'blue', 'purple', 'bass']
      : ['normal', 'red', 'blue', 'purple'];
    const labels: Record<NoteType, string> = {
      normal: 'N', red: 'R', blue: 'B', purple: 'P', bass: 'BASS',
    };
    const panelW = 300 + (types.length - 4) * 60;

    const panel = scene.add.rectangle(W / 2, cy, panelW, 54, SOUND.night, 0.95)
      .setStrokeStyle(2, SOUND.magenta, 0.8).setDepth(50);
    this.soundComposePalette.push(panel);

    const tooltip = scene.add.text(W / 2, cy + 34, '', {
      fontSize: '9px', color: '#ffddee', fontFamily: 'Arial', align: 'center',
      wordWrap: { width: 280 },
    }).setOrigin(0.5, 0).setDepth(53).setVisible(false).setName('composeTooltip');
    this.soundComposePalette.push(tooltip);

    const startX = W / 2 - (types.length - 1) * 30;

    for (let i = 0; i < types.length; i++) {
      const nx = startX + i * 60;
      const noteType = types[i];
      const cost = COMPOSE_COSTS[noteType];
      const color = NOTE_COLORS[noteType];

      const token = scene.add.rectangle(nx, cy - 6, 20, 18, color, 0.9).setDepth(52);
      token.setInteractive({ useHandCursor: true });
      scene.input.setDraggable(token);

      token.on('pointerover', () => tooltip.setText(NOTE_TOOLTIPS[noteType]).setVisible(true));
      token.on('pointerout', () => tooltip.setVisible(false));

      const originX = nx, originY = cy - 6;
      const tY = this.getTrackY();

      token.on('drag', (_ptr: unknown, dragX: number, dragY: number) => {
        token.setPosition(dragX, dragY);
      });

      token.on('dragend', () => {
        const px = token.x, py = token.y;
        if (Math.abs(py - tY) <= 20 && px > 20 && px < W - 20) {
          if (this.soundComposurePoints >= cost) {
            this.soundComposurePoints -= cost;
            const xFrac = px / W;
            const patIdx = this.soundComposedPattern.length;
            this.soundComposedPattern.push({ xFrac, type: noteType });

            // Drawn as a real note so a composed bar reads the same as the live track does.
            const placedGfx = scene.add.graphics();
            SoundFx.drawTrackNote(placedGfx, this.pcol, NOTE_WIDTH, color, false, 0);
            placedGfx.lineStyle(1.5, this.pcol(SOUND.white), 0.6);
            placedGfx.strokeCircle(0, 0, 13);
            const placed = scene.add.container(px, tY, [placedGfx]).setDepth(22);
            placed.setInteractive({
              hitArea: new Phaser.Geom.Rectangle(-13, -13, 26, 26),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
              useHandCursor: true,
            });
            const entry = { sprite: placed, type: noteType, xFrac, patternIdx: patIdx };
            this.soundComposedNoteSprites.push(entry);

            placed.on('pointerover', () => tooltip.setText(NOTE_TOOLTIPS[entry.type]).setVisible(true));
            placed.on('pointerout', () => tooltip.setVisible(false));

            // Left-click to remove placed note (right-click exits Composing Mode)
            placed.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (ptr.leftButtonDown()) {
                this.soundComposedPattern.splice(entry.patternIdx, 1);
                this.soundComposedNoteSprites = this.soundComposedNoteSprites.filter(e => e !== entry);
                this.soundComposurePoints += COMPOSE_COSTS[entry.type];
                for (let j = 0; j < this.soundComposedNoteSprites.length; j++) {
                  this.soundComposedNoteSprites[j].patternIdx = j;
                }
                placed.destroy();
                tooltip.setVisible(false);
                this.refreshComposeLabel();
              }
            });

            this.refreshComposeLabel();
          } else {
            this.arena.showFloatingText(px, py - 20, '✖ NOT ENOUGH COMPOSURE', '#ff4444');
          }
        }
        token.setPosition(originX, originY);
      });

      this.soundComposePalette.push(token);

      const lbl = scene.add.text(nx, cy + 7, `${labels[noteType]}(${cost})`, {
        fontSize: '8px', color: '#ccaadd', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(52);
      this.soundComposePalette.push(lbl);
    }

    // Composure counter label, pinned to the panel's inner edge so a wider panel doesn't
    // leave it sitting on top of the last token.
    const compLabel = scene.add.text(W / 2 + panelW / 2 - 8, cy, `${this.soundComposurePoints}/20`, {
      fontSize: '10px', color: '#ffaadd', fontFamily: 'Arial Black',
    }).setOrigin(1, 0.5).setDepth(52).setName('composeLabel');
    this.soundComposePalette.push(compLabel);
  }

  private refreshComposeLabel(): void {
    const lbl = this.soundComposePalette.find(
      o => (o as Phaser.GameObjects.Text).name === 'composeLabel'
    ) as Phaser.GameObjects.Text | undefined;
    if (lbl) lbl.setText(`${this.soundComposurePoints}/20`);
  }

  private teardownComposePalette(): void {
    for (const o of this.soundComposePalette) {
      if ((o as Phaser.GameObjects.Arc).active) (o as Phaser.GameObjects.Arc).destroy();
    }
    this.soundComposePalette = [];
  }

  private updateComposedLooper(time: number, _baseSpeed: number, spawnInterval: number, tY: number): void {
    if (this.soundComposedPattern.length === 0) return;
    const W = this.arena.width;
    if (time - this.soundComposingLastSpawn >= spawnInterval) {
      this.soundComposingLastSpawn = time;
      const pattern = this.soundComposedPattern[this.soundComposingLooperIdx % this.soundComposedPattern.length];
      this.soundComposingLooperIdx++;
      const noteType = pattern.type;
      const isRed = noteType === 'red';
      const metrics = this.noteMetrics();
      const built = this.createRhythmNoteSprite(W + 20, tY, noteType, metrics.width, false);
      this.soundNotes.push({
        sprite: built.sprite,
        gfx: built.gfx,
        x: W + 20,
        isRed,
        noteType,
        damage: NOTE_DMGS[noteType],
        isHold: false,
        holdActive: false,
        tolerance: metrics.tolerance,
        width: metrics.width,
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** True while any green hold bar overlaps the hit line (so a press starts a hold). */
  private isHoldBarOverLine(hitLineX: number, tolerance: number): boolean {
    const halfW = HOLD_NOTE_WIDTH / 2;
    return this.soundNotes.some(n =>
      n.isHold
      && n.x - halfW - tolerance <= hitLineX
      && hitLineX <= n.x + halfW + tolerance
    );
  }

  /** Note length + hit window for whichever tempo is currently running. */
  private noteMetrics(): { width: number; tolerance: number } {
    return this.soundSoloActive
      ? { width: SOLO_NOTE_WIDTH, tolerance: NOTE_TOLERANCE * 2 }
      : { width: NOTE_WIDTH, tolerance: NOTE_TOLERANCE };
  }

  /**
   * A rhythm note on the track: a container holding one Graphics, repainted every frame in
   * `paintTrackNotes` so the note rings as it travels instead of sliding along as a flat tile.
   * A container (not a bare Graphics) because the note is *positioned* by the track logic and
   * *drawn* in its own local space.
   */
  private createRhythmNoteSprite(
    x: number, tY: number, noteType: NoteType, width: number, isHold: boolean,
  ): { sprite: Phaser.GameObjects.Container; gfx: Phaser.GameObjects.Graphics } {
    const gfx = this.arena.scene.add.graphics();
    SoundFx.drawTrackNote(gfx, this.pcol, isHold ? HOLD_NOTE_WIDTH : width,
      isHold ? HOLD_COLOR : NOTE_COLORS[noteType], isHold, 0);
    const sprite = this.arena.scene.add.container(x, tY, [gfx]).setDepth(21);
    return { sprite, gfx };
  }

  /** Repaint every live note, so the whole track breathes on the beat. */
  private paintTrackNotes(): void {
    for (const n of this.soundNotes) {
      if (!n.gfx.active) continue;
      SoundFx.drawTrackNote(
        n.gfx, this.pcol,
        n.isHold ? HOLD_NOTE_WIDTH : n.width,
        n.isHold ? HOLD_COLOR : NOTE_COLORS[n.noteType],
        n.isHold, this.vizT + n.x * 0.01,
      );
    }
  }

  private flashHitRing(scene: Phaser.Scene, color: number): void {
    if (!this.soundHitRing) return;
    scene.tweens.killTweensOf(this.soundHitRing);
    this.soundHitRing.setScale(1);
    this.soundHitRing.setStrokeStyle(5, color, 1);
    scene.tweens.add({ targets: this.soundHitRing, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true, onComplete: () => {
      if (this.soundHitRing) {
        this.soundHitRing.setScale(1);
        this.soundHitRing.setStrokeStyle(3, this.soundFlowActive ? SOUND.flow : SOUND.magenta, 0.9);
      }
    }});
  }

  private flashMissRing(scene: Phaser.Scene): void {
    if (!this.soundHitRing) return;
    scene.tweens.killTweensOf(this.soundHitRing);
    this.soundHitRing.setScale(1);
    this.soundHitRing.setStrokeStyle(5, SOUND.crimson, 1);
    scene.tweens.add({ targets: this.soundHitRing, duration: 300, onComplete: () => {
      if (this.soundHitRing) this.soundHitRing.setStrokeStyle(3, this.soundFlowActive ? SOUND.flow : SOUND.magenta, 0.9);
    }});
  }

  private findNearestEnemy(): Fighter | null {
    const player = this.arena.player;
    let nearest: Fighter | null = null;
    let nearestDist = Infinity;
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
      if (d < nearestDist) { nearestDist = d; nearest = t; }
    }
    return nearest;
  }
}
