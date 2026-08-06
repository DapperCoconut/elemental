import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  ArmGesture, SOUND, SoundAura, SoundAvatar, SoundColorFn, SoundFx, SoundInstrument,
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
  readonly width: number;
  readonly height: number;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  showFloatingText(x: number, y: number, text: string, color: string): void;
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
/** Half-angle of the crescent. A shockwave is a wall, not a bullet. */
const WAVE_SPREAD = 0.5;
/** Half-thickness of the band that bites, in pixels — about one body radius. */
const WAVE_THICK = 28;

// ── R: Conduct ────────────────────────────────────────────────────────────

const VIOLIN_MAX = 3;
const VIOLIN_DMG = 5;
const VIOLIN_HARM_DMG = 10;
const GOLD_VIOLIN_DMG = 8;
const GOLD_VIOLIN_HARM_DMG = 12;
const MINI_SPEED = 640;
const MINI_RANGE = 330;
const MINI_SPREAD = 0.62;
const MINI_THICK = 22;

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

// ── F: Bugle ──────────────────────────────────────────────────────────────

const BUGLE_GAIN = 0.02;
/** A harmonized *opening* note is worth more; every note after it is worth the usual 2%. */
const BUGLE_OPENING_HARM_GAIN = 0.05;
const BUGLE_CAP = 0.30;
/** Percentage points shed per second. Slow enough that blowing on the beat still builds. */
const BUGLE_DECAY_PER_SEC = 0.004;
const BUGLE_HOLD_MS = 700;

// ── Q: Soli ───────────────────────────────────────────────────────────────

const SOLI_NOTE_SPEED = 470;
const SOLI_SPAWN_MIN = 420;
const SOLI_SPAWN_MAX = 940;
const SOLI_NOTE_DMG = 12;
const SOLI_ACCENT_DMG = 22;
const SOLI_ACCENT_CHANCE = 0.18;
const SOLI_TOLERANCE = 42;
const SOLI_NOTE_WIDTH = 30;
/**
 * Beat of quiet after taking the stage before the bar starts feeding. Kept short because the
 * runway itself — half a screen at `SOLI_NOTE_SPEED` — is already well over a second of
 * standing still, and the performer cannot move while any of it is running.
 */
const SOLI_GRACE_MS = 400;

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

/** A conducted phantom violin. It never expires; only a fourth placement or a purge removes one. */
interface PhantomViolin {
  owner: 'player' | 'npc';
  x: number;
  y: number;
  /** Placed on the beat: gold, and worth more per stroke. */
  golden: boolean;
  /** Ramps to 1 in the frames after it plays, so the art visibly saws. */
  charge: number;
}

/** One water charge laid down by the Bass perk. */
interface BassCharge {
  x: number;
  y: number;
  owner: 'player' | 'npc';
  armedAt: number;
  explodeAt: number;
}

/** A note on the Soli bar. */
interface SoliNote {
  sprite: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  accent: boolean;
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  staccato: 'punch',
  'disc-dice': 'sweep',
  conduct: 'slam',
  bugle: 'raise',
  soli: 'raise',
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
  private soliAura: SoundAura | null = null;
  private harmonyAura: SoundAura | null = null;
  /**
   * Three world layers, because these objects are not in the same place: phantom violins and
   * bass charges lie on the floor, shockwaves and the resonator ride over the fighters, and the
   * Soli stage is furniture everything else stands on.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private stageGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer to face. */
  private lastAimX = 0;
  private lastAimY = 0;
  /** 0 → 1 across a bow stroke. Held past 1 so the arm settles between strokes. */
  private bowT = 1;

  // ── HUD ─────────────────────────────────────────────────────────────
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private discLabel: Phaser.GameObjects.Text | null = null;
  private bugleLabel: Phaser.GameObjects.Text | null = null;
  private soliLabel: Phaser.GameObjects.Text | null = null;

  // ── Metronome ────────────────────────────────────────────────────────
  private metroAt = 0;
  private npcMetroAt = 0;
  /** 1 the instant a harmonized cast lands, decaying — flares the beat weight and the HUD. */
  private harmonyFlash = 0;

  // ── Shockwaves ───────────────────────────────────────────────────────
  private waves: Shock[] = [];

  // ── Phantom violins ──────────────────────────────────────────────────
  private violins: PhantomViolin[] = [];

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

  // ── Bugle ────────────────────────────────────────────────────────────
  private bugleBonus = 0;
  private bugleOpened = false;
  private bugleHoldUntil = 0;
  private npcBugleBonus = 0;
  private npcBugleHoldUntil = 0;

  // ── Soli ─────────────────────────────────────────────────────────────
  private soliActive = false;
  private soliReturnX = 0;
  private soliReturnY = 0;
  private soliGraceUntil = 0;
  private soliStageX = 0;
  private soliStageY = 0;
  private soliNotes: SoliNote[] = [];
  private soliNextSpawnAt = 0;
  private soliStreak = 0;
  private pointerWasDown = false;
  private lastClickAt = 0;
  /** Online: a remote soloist's performance is replayed as timed walls rather than a bar. */
  private npcSoliUntil = 0;
  private npcSoliNextAt = 0;

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

  /** The Soli set. Under the fighters, over the floor. */
  private stage(): Phaser.GameObjects.Graphics {
    if (!this.stageGfx || !this.stageGfx.active) {
      this.stageGfx = this.arena.scene.add.graphics().setDepth(4);
    }
    return this.stageGfx;
  }

  /**
   * Screen-space HUD strip. Depth 20 puts it under the Soli notes (21) and the labels (23), so
   * the hit ring reads as a target sitting *behind* the note you are aiming at.
   */
  private hud(): Phaser.GameObjects.Graphics {
    if (!this.hudGfx || !this.hudGfx.active) {
      this.hudGfx = this.arena.scene.add.graphics().setDepth(20);
    }
    return this.hudGfx;
  }

  // ── Public accessors ──────────────────────────────────────────────────

  isSoliActive(): boolean { return this.soliActive; }

  /**
   * Everything this element does to move speed, in one number ArenaScene pulls each frame:
   * the loaded record, the Disc Dice stacks, the bugle buff and the Harmony perk.
   */
  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    let m = 1;
    if (this.disc() === 'accelerando') m *= (1 + ACCEL_SPEED_BONUS);
    if (time < this.discSpeedUntil) m *= (1 + DISC_SPEED_PER_HIT * this.discSpeedStacks);
    m *= (1 + this.bugleBonus);
    if (time < this.harmonyUntil) m *= (1 + HARMONY_BONUS_PER_STACK * this.harmonyStacks);
    return m;
  }

  /** Which record is on the deck. */
  private disc(): DiscMode { return DISC_ORDER[this.discIdx % DISC_ORDER.length]; }
  private npcDisc(): DiscMode { return DISC_ORDER[this.npcDiscIdx % DISC_ORDER.length]; }

  // ── Reset ────────────────────────────────────────────────────────────

  reset(isSoundMatch = false): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    for (const a of [this.discAura, this.bugleAura, this.soliAura, this.harmonyAura]) a?.destroy();
    this.discAura = null; this.bugleAura = null; this.soliAura = null; this.harmonyAura = null;
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    if (this.stageGfx) { this.stageGfx.destroy(); this.stageGfx = null; }
    if (this.hudGfx) { this.hudGfx.destroy(); this.hudGfx = null; }
    if (this.discLabel) { this.discLabel.destroy(); this.discLabel = null; }
    if (this.bugleLabel) { this.bugleLabel.destroy(); this.bugleLabel = null; }
    if (this.soliLabel) { this.soliLabel.destroy(); this.soliLabel = null; }
    this.vizT = 0;
    this.bowT = 1;

    this.metroAt = 0;
    this.npcMetroAt = 0;
    this.harmonyFlash = 0;

    this.waves = [];
    this.violins = [];

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

    this.bugleBonus = 0;
    this.bugleOpened = false;
    this.bugleHoldUntil = 0;
    this.npcBugleBonus = 0;
    this.npcBugleHoldUntil = 0;

    this.soliActive = false;
    this.soliReturnX = 0;
    this.soliReturnY = 0;
    this.soliGraceUntil = 0;
    this.soliStageX = 0;
    this.soliStageY = 0;
    for (const n of this.soliNotes) n.sprite.destroy();
    this.soliNotes = [];
    this.soliNextSpawnAt = 0;
    this.soliStreak = 0;
    this.pointerWasDown = false;
    this.lastClickAt = 0;
    this.npcSoliUntil = 0;
    this.npcSoliNextAt = 0;

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
    return harmonized;
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

    // ── On stage: the bar owns the click, and only Q gets you off it ────
    if (this.soliActive) {
      // Clicks during the opening beat are free — ending the performance to a click thrown
      // before the first note was even on the bar would read as the ability being broken.
      if (clickJustDown && time >= this.soliGraceUntil && time - this.lastClickAt >= 140) {
        this.lastClickAt = time;
        this.strikeSoliNote(time);
      }
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.endSoli(time, 'ENCORE!');
      return;
    }

    // ── Click: Staccato ────────────────────────────────────────────────
    if (clickJustDown && player.castAbility('staccato', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playStaccato(time, mouseX, mouseY);
    }

    // ── E: Disc Dice ───────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(eKey)
      && player.castAbility('disc-dice', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playDiscDice(time, mouseX, mouseY);
    }

    // ── R: Conduct ─────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(rKey)
      && player.castAbility('conduct', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playConduct(time, mouseX, mouseY);
    }

    // ── F: Bugle ───────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)
      && player.castAbility('bugle', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.playBugle(time, mouseX, mouseY);
    }

    // ── Q: Soli ────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(qKey)
      && player.castAbility('soli', this.arena.buildPlayerContext(mouseX, mouseY))) {
      this.startSoli(time);
    }
  }

  // ── Click: Staccato ───────────────────────────────────────────────────

  private playStaccato(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);
    const ang = Math.atan2(aimY - player.y, aimX - player.x);
    const dmg = harmonized ? STACCATO_HARM_DMG : STACCATO_DMG;

    this.bowT = 0;
    this.playerAvatar?.play('punch', ang);
    this.fireWave('player', player.x, player.y, ang, dmg, {
      color: harmonized ? SOUND.gold : SOUND.magenta,
      range: WAVE_RANGE, speed: WAVE_SPEED, spread: WAVE_SPREAD, thick: WAVE_THICK,
    });
    this.pfx.waveBurst(player.x, player.y, ang, harmonized ? 1.3 : 1, 9,
      harmonized ? SOUND.gold : SOUND.magenta);

    // Every phantom violin plays with you, on the same stroke.
    for (const v of this.violins) {
      if (v.owner !== 'player') continue;
      v.charge = 1;
      const target = this.nearestTo(v.x, v.y, this.arena.enemies);
      const vAng = target ? Math.atan2(target.y - v.y, target.x - v.x) : ang;
      const base = v.golden
        ? (harmonized ? GOLD_VIOLIN_HARM_DMG : GOLD_VIOLIN_DMG)
        : (harmonized ? VIOLIN_HARM_DMG : VIOLIN_DMG);
      // The bugle buff rides the phantoms too — harder strokes, thrown further out.
      this.fireWave('player', v.x, v.y, vAng, Math.round(base * (1 + this.bugleBonus)), {
        color: v.golden ? SOUND.gold : SOUND.rose,
        range: MINI_RANGE, speed: MINI_SPEED * (1 + this.bugleBonus),
        spread: MINI_SPREAD, thick: MINI_THICK,
      });
      this.fx('player').waveBurst(v.x, v.y, vAng, 0.7, 9, v.golden ? SOUND.gold : SOUND.rose);
    }

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
      t.takeDamage(DISC_DMG);
      this.pfx.waveBurst(t.x, t.y, Math.atan2(t.y - player.y, t.x - player.x), 0.9, 8, color);
    }

    if (hits > 0) {
      this.discSpeedStacks = Math.min(DISC_SPEED_MAX_STACKS, this.discSpeedStacks + hits);
      this.discSpeedUntil = time + DISC_SPEED_MS;
      this.arena.showFloatingText(player.x, player.y - 34,
        `💿 +${Math.round(DISC_SPEED_PER_HIT * this.discSpeedStacks * 100)}% SPEED`, '#ffaadd');
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

  // ── R: Conduct ────────────────────────────────────────────────────────

  private playConduct(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);
    this.placeViolin('player', aimX, aimY, harmonized);
    this.playerAvatar?.play('slam', Math.atan2(aimY - player.y, aimX - player.x));
    if (harmonized) this.onHarmonized(time, 'GOLDEN VIOLIN');
    else this.arena.showFloatingText(aimX, aimY - 40, '🎻 CONDUCTED', '#ff88cc');
  }

  private placeViolin(owner: 'player' | 'npc', x: number, y: number, golden: boolean): void {
    const mine = this.violins.filter((v) => v.owner === owner);
    if (mine.length >= VIOLIN_MAX) {
      // A fourth replaces the oldest, so the stage never fills up beyond a trio.
      const oldest = mine[0];
      const i = this.violins.indexOf(oldest);
      if (i !== -1) this.violins.splice(i, 1);
      this.fx(owner).shatter(oldest.x, oldest.y, 20, 7, 9,
        oldest.golden ? SOUND.gold : SOUND.magenta);
    }
    this.violins.push({ owner, x, y, golden, charge: 0 });

    const fx = this.fx(owner);
    const col = golden ? SOUND.gold : SOUND.magenta;
    fx.ripple(x, y, 8, 54, col, 460, 5, 7, 9);
    fx.notes(x, y, 4, { speed: 130, color: col, depth: 9 });
    if (golden) fx.sparkle(x, y, 8, 30, 10, SOUND.gold);
  }

  // ── F: Bugle ──────────────────────────────────────────────────────────

  private playBugle(time: number, aimX: number, aimY: number): void {
    const { player } = this.arena;
    const harmonized = this.beat('player', time);
    const opening = !this.bugleOpened;
    const gain = opening && harmonized ? BUGLE_OPENING_HARM_GAIN : BUGLE_GAIN;

    this.bugleBonus = Math.min(BUGLE_CAP, this.bugleBonus + gain);
    this.bugleHoldUntil = time + BUGLE_HOLD_MS;
    this.blowBugle('player', aimX, aimY);

    // The opening note is free, and so is every later note struck on the beat.
    if (opening || harmonized) {
      player.resetCooldown('bugle');
      this.arena.showFloatingText(player.x, player.y - 62,
        opening ? '🎺 OPENING NOTE — FREE' : '🎺 ON THE BEAT — FREE', '#ffe9a8');
    }
    this.bugleOpened = true;

    this.arena.showFloatingText(player.x, player.y - 40,
      `🎺 +${Math.round(this.bugleBonus * 100)}% TEMPO`, '#ffe9a8');
    if (harmonized) this.onHarmonized(time, 'FANFARE');
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

  // ── Q: Soli ───────────────────────────────────────────────────────────

  private startSoli(time: number): void {
    const { player, scene } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    this.beat('player', time);

    this.soliActive = true;
    this.soliReturnX = player.x;
    this.soliReturnY = player.y;
    this.soliStageX = W / 2;
    this.soliStageY = H * 0.52;
    this.soliStreak = 0;
    this.soliGraceUntil = time + SOLI_GRACE_MS;
    this.soliNextSpawnAt = time + SOLI_GRACE_MS;
    for (const n of this.soliNotes) n.sprite.destroy();
    this.soliNotes = [];

    // Take the stage.
    const px = this.soliStageX;
    const py = this.soliStageY - 18;
    player.setPosition(px, py);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(px, py);
    body.setVelocity(0, 0);

    this.pfx.ripple(px, this.soliStageY, 20, 190, SOUND.gold, 640, 6, 5, 9);
    this.pfx.notes(px, py, 8, { speed: 200, color: SOUND.gold, depth: 10, size: 8 });
    this.pfx.sparkle(px, py - 20, 10, 60, 11, SOUND.white);
    scene.cameras.main.shake(220, 0.005);
    this.playerAvatar?.play('raise', -Math.PI / 2, 900);
    this.bowT = 0;
    this.arena.showFloatingText(px, py - 48, '🎻 SOLI!', '#ffdd44');
  }

  private endSoli(time: number, label: string): void {
    if (!this.soliActive) return;
    this.soliActive = false;
    void time;

    this.pfx.ripple(this.soliStageX, this.soliStageY, 30, 160, SOUND.gold, 480, 5, 5, 7);
    this.pfx.notes(this.soliStageX, this.soliStageY - 20, 6, { speed: 150, color: SOUND.gold, depth: 10 });
    if (this.stageGfx?.active) this.stageGfx.clear();
    for (const n of this.soliNotes) n.sprite.destroy();
    this.soliNotes = [];

    const { player } = this.arena;
    player.setPosition(this.soliReturnX, this.soliReturnY);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.soliReturnX, this.soliReturnY);
    body.setVelocity(0, 0);

    this.pfx.waveBurst(player.x, player.y, -Math.PI / 2, 1.3, 9, SOUND.gold, 1.4);
    this.arena.showFloatingText(player.x, player.y - 40, `🎻 ${label}`, '#ffdd44');
  }

  /** A click while on stage: land the note under the line, or bring the house down. */
  private strikeSoliNote(time: number): void {
    const hitLineX = this.arena.width / 2;
    const idx = this.soliNotes.findIndex((n) => Math.abs(n.x - hitLineX) <= SOLI_TOLERANCE);
    if (idx === -1) {
      this.pfx.discord(this.arena.player.x, this.arena.player.y);
      this.endSoli(time, 'FLUBBED!');
      return;
    }

    const note = this.soliNotes[idx];
    note.sprite.destroy();
    this.soliNotes.splice(idx, 1);
    this.soliStreak++;
    this.bowT = 0;
    this.playSoliWall(note.accent);
  }

  /** The wall of music every landed note throws across the entire room. */
  private playSoliWall(accent: boolean): void {
    const { player, scene } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    const reach = Math.hypot(W, H);
    const dmg = accent ? SOLI_ACCENT_DMG : SOLI_NOTE_DMG;
    const color = accent ? SOUND.gold : SOUND.magenta;

    this.pfx.musicWall(player.x, player.y, reach, color);
    this.playerAvatar?.play('punch', -Math.PI / 2);
    scene.cameras.main.shake(accent ? 200 : 120, accent ? 0.005 : 0.003);

    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      t.takeDamage(dmg);
      this.pfx.ripple(t.x, t.y, 8, 40, color, 320, 3, 8, 8);
    }
    this.arena.showFloatingText(player.x, player.y - 56,
      accent ? `⭐ ACCENT! ×${this.soliStreak}` : `🎵 ×${this.soliStreak}`,
      accent ? '#ffdd44' : '#ff88cc');
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
    for (const v of this.violins) if (v.charge > 0) v.charge = Math.max(0, v.charge - delta / 500);

    // Waves and charges carry an owner, so they tick whichever side is playing Sound.
    this.updateWaves(delta);
    this.updateBassCharges(time);
    if (isPlayerSound) this.updatePlayer(time, delta);
    if (isNpcSound) this.updateNpc(time, delta);
    this.paintWorld(time);
    this.updateAvatars(time, delta, isPlayerSound, isNpcSound);
    if (isPlayerSound) this.paintHud(time);
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
    // Bass is a standing multiplier, so it is pushed once and divided back out on a swap.
    const wantDmg = mode === 'bass' ? BASS_DAMAGE_MULT : 1;
    if (wantDmg !== this.discDmgApplied) {
      player.outgoingDamageMult = player.outgoingDamageMult / this.discDmgApplied * wantDmg;
      this.discDmgApplied = wantDmg;
    }

    // ── The bugle buff: attack speed, then the decay that eats it ────
    if (this.bugleBonus > 0) {
      player.reduceCooldowns(delta * this.bugleBonus);
      this.bugleBonus = Math.max(0, this.bugleBonus - BUGLE_DECAY_PER_SEC * delta / 1000);
    }
    // Harmony (perk) drives attack speed the same way it drives movement.
    if (time < this.harmonyUntil) {
      player.reduceCooldowns(delta * HARMONY_BONUS_PER_STACK * this.harmonyStacks);
    } else if (this.harmonyStacks > 0) {
      this.harmonyStacks = 0;
    }

    if (this.soliActive) this.updateSoli(time, delta);
    this.updateResonator(time);
  }

  private updateSoli(time: number, delta: number): void {
    const W = this.arena.width;
    const trackY = this.trackY();

    // Randomised spacing: the bar is meant to be read, not memorised.
    if (time >= this.soliGraceUntil && time >= this.soliNextSpawnAt) {
      this.soliNextSpawnAt = time + SOLI_SPAWN_MIN + Math.random() * (SOLI_SPAWN_MAX - SOLI_SPAWN_MIN);
      const accent = Math.random() < SOLI_ACCENT_CHANCE;
      const gfx = this.arena.scene.add.graphics();
      SoundFx.drawTrackNote(gfx, this.pcol, SOLI_NOTE_WIDTH,
        accent ? SOUND.gold : SOUND.rose, accent, 0);
      const sprite = this.arena.scene.add.container(W + 24, trackY, [gfx]).setDepth(21);
      this.soliNotes.push({ sprite, gfx, x: W + 24, accent });
    }

    for (let i = this.soliNotes.length - 1; i >= 0; i--) {
      const n = this.soliNotes[i];
      n.x -= SOLI_NOTE_SPEED * delta / 1000;
      n.sprite.setX(n.x);
      n.sprite.setY(trackY);
      if (n.gfx.active) {
        SoundFx.drawTrackNote(n.gfx, this.pcol, SOLI_NOTE_WIDTH,
          n.accent ? SOUND.gold : SOUND.rose, n.accent, this.vizT + n.x * 0.01);
      }
      // A note that reaches the far edge is a note you dropped.
      if (n.x < -24) {
        n.sprite.destroy();
        this.soliNotes.splice(i, 1);
        this.pfx.discord(this.arena.player.x, this.arena.player.y);
        this.endSoli(time, 'MISSED!');
        return;
      }
    }
  }

  private updateNpc(time: number, delta: number): void {
    const { player, npc } = this.arena;
    if (this.npcBugleBonus > 0) {
      npc.reduceCooldowns(delta * this.npcBugleBonus);
      this.npcBugleBonus = Math.max(0, this.npcBugleBonus - BUGLE_DECAY_PER_SEC * delta / 1000);
    }
    // Online: a remote soloist's bar never reaches this sim, so their performance is replayed
    // as walls arriving on the beat instead.
    if (time < this.npcSoliUntil && time >= this.npcSoliNextAt) {
      this.npcSoliNextAt = time + 900;
      const reach = Math.hypot(this.arena.width, this.arena.height);
      this.nfx.musicWall(npc.x, npc.y, reach, SOUND.flow);
      if (player.active && player.hp > 0) {
        player.takeDamage(SOLI_NOTE_DMG);
        this.nfx.ripple(player.x, player.y, 8, 40, SOUND.flow, 320, 3, 8, 8);
      }
    }
  }

  /**
   * Every per-frame painter in one pass: the phantom violins and bass charges on the floor, the
   * shockwaves and the resonator in the air, and the Soli set under the performer.
   */
  private paintWorld(time: number): void {
    const anyGround = this.violins.length > 0 || this.bassCharges.length > 0;
    const anyAir = this.waves.length > 0 || this.harmonyGrenade !== null;

    if (anyGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      for (const v of this.violins) {
        SoundFx.drawPhantomViolin(g, this.col(v.owner), v.x, v.y, this.vizT, v.golden, 1, v.charge);
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
    }

    if (this.soliActive) {
      const g = this.stage();
      g.clear();
      SoundFx.drawStage(g, this.pcol, this.soliStageX, this.soliStageY, 160, this.vizT);
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
      av.setFacing(aim);
      av.setIntensity(this.soliActive ? 1.45 : this.discSpeedStacks > 0 && time < this.discSpeedUntil ? 1.15 : 1);
      av.setMastered(this.arena.masteryActive);
      av.setInstrument(this.playerInstrument(time));
      av.setBowDraw(this.bowT < 1 ? this.bowT : (Math.sin(this.vizT * 1.6) + 1) / 2);
      av.setDiscColor(DISC_COLORS[this.disc()]);
      // Both hands are on the instrument unless it is a record being flung.
      av.setHold(this.playerInstrument(time) === 'record' ? 'spray' : 'brace', aim);
      const alpha = player.forceInvisible ? 0 : player.alpha;
      av.update(delta, player.x, player.y, alpha);

      this.discAura = this.syncAura(this.discAura, true, 'disc', 22, 2, alpha, delta, player);
      this.discAura?.setColor(DISC_COLORS[this.disc()]);
      this.bugleAura = this.syncAura(this.bugleAura, this.bugleBonus > 0.001, 'bugle', 24, 3, alpha, delta, player);
      this.bugleAura?.setIntensity(this.bugleBonus / BUGLE_CAP);
      this.soliAura = this.syncAura(this.soliAura, this.soliActive, 'solo', 26, 3, alpha, delta, player);
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
      this.npcAvatar.setInstrument(time < this.npcBugleHoldUntil ? 'bugle' : 'violin');
      this.npcAvatar.setBowDraw((Math.sin(this.vizT * 1.6) + 1) / 2);
      this.npcAvatar.setDiscColor(DISC_COLORS[this.npcDisc()]);
      this.npcAvatar.setHold('brace', Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Build-or-tear-down for one stance aura, so each of the four is a single line above. */
  private syncAura(
    aura: SoundAura | null, want: boolean,
    style: 'disc' | 'bugle' | 'solo' | 'harmony', radius: number, depth: number,
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

  private playerInstrument(time: number): SoundInstrument {
    if (time < this.bugleHoldUntil) return 'bugle';
    if (time < this.discHoldUntil) return 'record';
    return 'violin';
  }

  // ── HUD ───────────────────────────────────────────────────────────────

  /** Centre line of the metronome strip / the Soli bar — clear of the ability bar below it. */
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
    if (!this.bugleLabel) {
      this.bugleLabel = scene.add.text(cx - 104, y - 22, '', {
        fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffe9a8',
      }).setOrigin(0.5).setDepth(23);
    }
    if (!this.soliLabel) {
      this.soliLabel = scene.add.text(W - 8, y, '', {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#ffdd44',
      }).setOrigin(1, 0.5).setDepth(23);
    }

    if (this.soliActive) {
      this.paintSoliBar(g, y);
      this.discLabel.setVisible(false);
      this.bugleLabel.setVisible(false);
      this.soliLabel.setVisible(true).setText(`🎻 SOLI  ×${this.soliStreak}`);
      return;
    }
    this.soliLabel.setVisible(false);
    this.discLabel.setVisible(true);
    this.bugleLabel.setVisible(true);

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

    // ── The bugle buff ──────────────────────────────────────────────
    if (this.bugleBonus > 0.001) {
      this.bugleLabel.setText(`🎺 +${Math.round(this.bugleBonus * 100)}%`);
      const k = this.bugleBonus / BUGLE_CAP;
      g.fillStyle(this.pcol(SOUND.brass), 0.9);
      g.fillRect(cx - 118, y + 10, 28 * k, 3);
    } else {
      this.bugleLabel.setText('');
    }

    // ── Conducted violins, as pips down the right of the plate ──────
    const mine = this.violins.filter((v) => v.owner === 'player');
    for (let i = 0; i < VIOLIN_MAX; i++) {
      const px = cx + 84 + i * 12;
      const v = mine[i];
      g.fillStyle(this.pcol(v ? (v.golden ? SOUND.gold : SOUND.magenta) : SOUND.plum), v ? 1 : 0.45);
      g.fillCircle(px, y, v ? 4 : 2.6);
    }
  }

  private paintSoliBar(g: Phaser.GameObjects.Graphics, y: number): void {
    const W = this.arena.width;
    g.fillStyle(this.pcol(SOUND.shade), 0.92);
    g.fillRect(0, y - 15, W, 30);
    g.lineStyle(1, this.pcol(SOUND.plum), 1);
    g.strokeRect(0, y - 15, W, 30);
    // The hit line, ringing on its own.
    const pulse = 0.7 + 0.3 * Math.sin(this.vizT * 8);
    g.lineStyle(3, this.pcol(SOUND.gold), pulse);
    g.strokeCircle(W / 2, y, 15);
    g.fillStyle(this.pcol(SOUND.gold), 0.2 * pulse);
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
        this.fireWave('npc', npc.x, npc.y, ang, harmonized ? STACCATO_HARM_DMG : STACCATO_DMG, {
          color: harmonized ? SOUND.gold : SOUND.flow,
          range: WAVE_RANGE, speed: WAVE_SPEED, spread: WAVE_SPREAD, thick: WAVE_THICK,
        });
        this.nfx.waveBurst(npc.x, npc.y, ang, 1, 9, harmonized ? SOUND.gold : SOUND.flow);
        for (const v of this.violins) {
          if (v.owner !== 'npc') continue;
          v.charge = 1;
          const vAng = Math.atan2(player.y - v.y, player.x - v.x);
          const base = v.golden
            ? (harmonized ? GOLD_VIOLIN_HARM_DMG : GOLD_VIOLIN_DMG)
            : (harmonized ? VIOLIN_HARM_DMG : VIOLIN_DMG);
          this.fireWave('npc', v.x, v.y, vAng, Math.round(base * (1 + this.npcBugleBonus)), {
            color: v.golden ? SOUND.gold : SOUND.flowPale,
            range: MINI_RANGE, speed: MINI_SPEED, spread: MINI_SPREAD, thick: MINI_THICK,
          });
        }
        break;
      }
      case 'disc-dice': {
        const color = DISC_COLORS[this.npcDisc()];
        this.nfx.discSlice(npc.x, npc.y, DISC_RADIUS, color);
        if (player.active && player.hp > 0
          && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= DISC_RADIUS) {
          player.takeDamage(DISC_DMG);
          this.nfx.waveBurst(player.x, player.y, ang, 0.9, 8, color);
        }
        if (harmonized) this.npcDiscIdx = (this.npcDiscIdx + 1) % DISC_ORDER.length;
        break;
      }
      case 'conduct':
        this.placeViolin('npc', player.x, player.y, harmonized);
        break;
      case 'bugle':
        this.npcBugleBonus = Math.min(BUGLE_CAP, this.npcBugleBonus + BUGLE_GAIN);
        this.npcBugleHoldUntil = time + BUGLE_HOLD_MS;
        this.blowBugle('npc', player.x, player.y);
        break;
      case 'soli':
        this.npcSoliUntil = time + 8000;
        this.npcSoliNextAt = time + 1200;
        this.nfx.ripple(npc.x, npc.y, 20, 190, SOUND.gold, 640, 6, 5, 9);
        this.arena.showFloatingText(npc.x, npc.y - 48, '🎻 SOLI!', '#ffdd44');
        break;
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

  private nearestTo(x: number, y: number, pool: Fighter[]): Fighter | null {
    let nearest: Fighter | null = null;
    let best = Infinity;
    for (const t of pool) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < best) { best = d; nearest = t; }
    }
    return nearest;
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * The conducted phantom violins.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (let i = this.violins.length - 1; i >= 0; i--) {
      const v = this.violins[i];
      if (v.owner === exceptOwner) continue;
      if (Phaser.Math.Distance.Between(x, y, v.x, v.y) > radius) continue;
      report?.(v.x, v.y);
      this.fx(v.owner).shatter(v.x, v.y, 20, 8, 9, v.golden ? SOUND.gold : SOUND.magenta);
      this.violins.splice(i, 1);
      razed++;
    }
    return razed;
  }
}
