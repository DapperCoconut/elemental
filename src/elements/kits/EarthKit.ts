import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext, Ability } from '../Ability';
import { Husk } from '../../invasion/Husk';
import {
  ArmGesture, ArmHold, EARTH, EarthAura, EarthAvatar, EarthColorFn, EarthFx, EarthGather,
  ErosionAura, StoneGolem, StoneShield, stoneChunkLayered,
} from './EarthVisuals';

// ── Earth Mastery constants ─────────────────────────────────────────────

const DUST_SCREEN_COOLDOWN_MS = 10000;
const DUST_SCREEN_RANGE = 180;
const DUST_SCREEN_HALF_ANGLE_DEG = 40;
const DUST_SCREEN_EFFECT_MS = 5000;

// ── Titan Form constants (Earth Q+) ─────────────────────────────────────
// The golem is drawn far larger than the arena on purpose: only the head (hanging
// over the top edge) and the two arms (running down the left/right edges) ever fit.

const TITAN_DURATION_MS = 20000;
const TITAN_HEAD_RX = 250;
const TITAN_HEAD_RY = 205;
const TITAN_HEAD_CY = -30;      // head centre sits above the top edge; chin lands at ~175
const TITAN_MOUTH_Y = 128;      // beam origin
const TITAN_SMASH_CD_MS = 1400;
const TITAN_TREMOR_CD_MS = 5000;
const TITAN_TREMOR_MS = 10000;
const TITAN_TSUNAMI_CD_MS = 13000;
const TITAN_BEAM_CD_MS = 10000;
const TITAN_BEAM_MS = 5000;
const TITAN_ROCK_FALL_MS = 2000; // telegraph window for every falling rock
const TITAN_PAD = 32;            // arena border inset — keeps effects off the HUD strip

/** Mirrors an NPC earth cast onto its rig. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'bash': 'dash',
  'repair': 'flex',
  'rock-dance': 'flex',
  'quake': 'slam',
  'golem-ritual': 'raise',
};

interface TitanArm {
  side: -1 | 1;
  shoulderX: number; shoulderY: number;
  elbowX: number; elbowY: number;
  restX: number; restY: number;
  fistX: number; fistY: number;
  fromX: number; fromY: number;   // lerp source for the current phase
  toX: number; toY: number;       // lerp destination for the current phase
  targetX: number; targetY: number;
  phase: 'rest' | 'raise' | 'strike' | 'recover';
  phaseStart: number;
  phaseEnd: number;
  marker: Phaser.GameObjects.Graphics | null;
}

interface TitanRock {
  g: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Ellipse;
  sx: number; sy: number;
  lx: number; ly: number;
  startAt: number; landAt: number;
  peak: number; spin: number; size: number;
  dmg: number; radius: number;
}

interface TitanTremor {
  x: number;
  expiresAt: number;
  g: Phaser.GameObjects.Graphics;
  nextHit: Map<Fighter, number>;
}

interface TitanWave {
  x: number;
  speed: number;
  g: Phaser.GameObjects.Graphics;
  hit: Set<Fighter>;
  slammed: boolean;
}

interface TitanBeam {
  until: number;
  x: number; y: number;
  nextTickAt: number;
  nextScorchAt: number;
  g: Phaser.GameObjects.Graphics;
}

/** A golem's Fault Line: slabs jammed up out of the ground, drawn while they rise then held. */
interface FaultWall {
  g: Phaser.GameObjects.Graphics;
  x: number; y: number;
  angle: number;
  spawnedAt: number;
  expiresAt: number;
}

/** One plate thrown by Shield Splinter. Tumbles, trails grit, and shatters on whatever it hits. */
interface SplinterShard {
  g: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  spin: number;
  spawnedAt: number;
  trailAccum: number;
  colour: number;
}

// ── EarthArenaApi ─────────────────────────────────────────────────────────

export interface EarthArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly enemies: Fighter[];
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly npcCastId: string | null;
  readonly pointerWasDown: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly width: number;
  readonly height: number;
  readonly playerAbilities: Ability[];
  readonly abilityBars: Array<{ lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  isDodging: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is earth AND Earth Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  /** `SkinsKit.earthColor` — one owner's skin, or the identity. */
  earthColor(owner: 'player' | 'npc', base: number): number;
}

// ── EarthKit ──────────────────────────────────────────────────────────────

export class EarthKit {
  // ── Visuals ─────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a future skin recolours one side. */
  private readonly pcol: EarthColorFn;
  private readonly ncol: EarthColorFn;
  private readonly pfx: EarthFx;
  private readonly nfx: EarthFx;
  /** The stone character rig (boulder hands, eyes, crown of slabs) for each earth fighter. */
  private playerAvatar: EarthAvatar | null = null;
  private npcAvatar: EarthAvatar | null = null;
  /** Sustained rig pose and when it lapses — nothing may strand a hold. */
  private playerHold: ArmHold = null;
  private playerHoldUntil = 0;
  private playerHoldAngle = 0;
  /** Last aim, cached in handleInput so update() can steer the rig (it has no pointer). */
  private lastMouseX = 0;
  private lastMouseY = 0;
  /** Dust Screen blur on the local human — owned here, not by ArenaScene. */
  private screenBlurUntil = 0;

  // ── Player shield state ────────────────────────────────────────────────
  private earthShieldHp = 0;
  private earthShieldMaxHp = 75;
  private earthShieldEnhanced = false;
  private earthShieldSprite: StoneShield | null = null;
  private earthShieldAngle = 0;
  private earthShieldRespawnAt = 0;
  private earthShieldBroken = false;
  private earthShieldLabel: Phaser.GameObjects.Text | null = null;
  /**
   * Erosion perk (divine): the plates are replaced by this belt of rock and sand. It carries
   * the shield's whole HP pool in `earthShieldHp`, so every reader of that number — the bash,
   * the golem ritual, Shield Splinter — keeps working without knowing the difference.
   */
  private erosionAura: ErosionAura | null = null;

  // ── Player bash state (click, hold-to-charge) ──────────────────────────
  private earthBashActive = false;
  private earthBashEnd = 0;
  private earthBashDirX = 0;
  private earthBashDirY = 0;
  private earthBashHitDealt = false;
  private earthBashStartX = 0;
  private earthBashStartY = 0;
  private earthBashShieldDmg = 0;
  private earthBashStabDmg = 0;
  private earthBashFullCharge = false;
  private earthBashCharging = false;
  private earthBashChargeStart = 0;
  private earthBashChargeRatio = 0;

  // ── Player repair / rocks / quake / golem state ─────────────────────────
  private earthRepairActive = false;
  private earthRepairStart = 0;
  private earthRepairEnd = 0;
  private earthRepairAura: EarthAura | null = null;
  private earthRocks: Array<{ sprite: Phaser.GameObjects.Graphics; hitCdUntil: number }> = [];
  private earthRockOrbitAngle = 0;
  private earthLaunchedRocks: Array<{
    sprite: Phaser.GameObjects.Graphics; vx: number; vy: number; spawnedAt: number; trailAccum: number;
  }> = [];
  private earthQuakeSprite: Phaser.GameObjects.Graphics | null = null;
  private earthQuakeExpiry = 0;
  private earthQuakeX = 0;
  private earthQuakeY = 0;
  private earthQuakeTickAccum = 0;
  private earthQuakeStunUntil = 0;
  private earthGolemActive = false;
  private earthGolemHp = 0;
  private earthGolemMaxHp = 150;
  private earthGolemX = 0;
  private earthGolemY = 0;
  private earthGolemSprite: StoneGolem | null = null;
  private earthGolemLink: Phaser.GameObjects.Graphics | null = null;
  private earthGolemUntil = 0;
  private earthGolemPunchCdUntil = 0;
  private earthGolemFaultCdUntil = 0;
  private earthGolemPoundCdUntil = 0;
  private earthGolemFaultWall: FaultWall | null = null;
  private earthGolemHpLabel: Phaser.GameObjects.Text | null = null;
  private playerEarthCastId: string | null = null;
  private playerEarthStunnedUntil = 0;

  // ── Earth upgrade state (Click+: dual shield) ───────────────────────────
  private earthBackShieldHp = 0;
  private earthBackShieldMaxHp = 50;
  private earthBackShieldSprite: StoneShield | null = null;
  private earthBackShieldLabel: Phaser.GameObjects.Text | null = null;
  // Earth upgrade state (E+: shield splinter)
  private earthSplinterHolding = false;
  private earthSplinterHoldStart = 0;
  private earthSplinterReady = false;
  private earthSplinterRepairFast = false;
  /** Shards thrown by Shield Splinter — drawn plates, tumbling, with a grit trail. */
  private earthSplinterShards: SplinterShard[] = [];
  // Earth upgrade state (R+: lava rocks)
  private earthQuakeMagmified = false;
  private earthQuakeStandAccum = 0;
  /** Quake-perk ridges (spawnQuakeWave) — shared with other elements' perk code. */
  private earthTsunamiWaves: Array<{
    sprite: Phaser.GameObjects.Graphics; vx: number; vy: number; expiresAt: number; owner?: 'player' | 'npc';
  }> = [];
  // Earth upgrade state (Q+: Titan Form — hold Q to become the titanic golem)
  private earthTitanChargeHolding = false;
  private earthTitanChargeStart = 0;
  private earthTitanChargeVisual: EarthGather | null = null;
  private titanActive = false;
  private titanUntil = 0;
  private titanPreHp = 0;
  /** While > time the player is still being flung back into the arena: frozen + untouchable. */
  private titanLandingUntil = 0;
  private titanHeadG: Phaser.GameObjects.Graphics | null = null;
  private titanArmsG: Phaser.GameObjects.Graphics | null = null;
  private titanTimerLabel: Phaser.GameObjects.Text | null = null;
  private titanArms: TitanArm[] = [];
  private titanSmashCdUntil = 0;
  private titanTremorCdUntil = 0;
  private titanTsunamiCdUntil = 0;
  private titanBeamCdUntil = 0;
  // World effects the titan leaves behind — these outlive the form itself, so they
  // are ticked every frame regardless of `titanActive`.
  private titanRocks: TitanRock[] = [];
  private titanTremorLine: TitanTremor | null = null;
  private titanWave: TitanWave | null = null;
  private titanBeam: TitanBeam | null = null;
  private titanScorch: Array<{ sprite: Phaser.GameObjects.Graphics; x: number; y: number; r: number; expiresAt: number }> = [];
  private titanScorchAccum = 0;
  private titanEruptionsLeft = 0;
  private titanEruptionNextAt = 0;

  // ── NPC mirror state ────────────────────────────────────────────────────
  private npcEarthShieldHp = 0;
  private npcEarthShieldMaxHp = 75;
  private npcEarthShieldEnhanced = false;
  private npcEarthShieldSprite: StoneShield | null = null;
  private npcEarthShieldAngle = 0;
  private npcEarthShieldRespawnAt = 0;
  private npcEarthShieldBroken = false;
  private npcEarthShieldLabel: Phaser.GameObjects.Text | null = null;
  private npcEarthBashActive = false;
  private npcEarthBashEnd = 0;
  private npcEarthBashDirX = 0;
  private npcEarthBashDirY = 0;
  private npcEarthBashHitDealt = false;
  private npcEarthBashStartX = 0;
  private npcEarthBashStartY = 0;
  private npcEarthBashShieldDmg = 0;
  private npcEarthBashStabDmg = 0;
  private npcEarthBashFullCharge = false;
  private npcEarthRepairActive = false;
  private npcEarthRepairStart = 0;
  private npcEarthRepairEnd = 0;
  private npcEarthRepairAura: EarthAura | null = null;
  private npcEarthRocks: Array<{ sprite: Phaser.GameObjects.Graphics; hitCdUntil: number }> = [];
  private npcEarthRockOrbitAngle = 0;
  private npcEarthLaunchedRocks: Array<{
    sprite: Phaser.GameObjects.Graphics; vx: number; vy: number; spawnedAt: number; trailAccum: number;
  }> = [];
  private npcEarthQuakeSprite: Phaser.GameObjects.Graphics | null = null;
  private npcEarthQuakeExpiry = 0;
  private npcEarthQuakeX = 0;
  private npcEarthQuakeY = 0;
  private npcEarthQuakeTickAccum = 0;
  private npcEarthQuakeStunUntil = 0;
  private npcEarthGolemActive = false;
  private npcEarthGolemHp = 0;
  private npcEarthGolemX = 0;
  private npcEarthGolemY = 0;
  private npcEarthGolemSprite: StoneGolem | null = null;
  private npcEarthGolemLink: Phaser.GameObjects.Graphics | null = null;
  private npcEarthGolemUntil = 0;
  private npcEarthGolemPunchCdUntil = 0;
  private npcEarthGolemFaultCdUntil = 0;
  private npcEarthGolemPoundCdUntil = 0;
  private npcEarthGolemFaultWall: FaultWall | null = null;
  private npcEarthGolemHpLabel: Phaser.GameObjects.Text | null = null;

  // ── Earth Mastery: Dust Screen ──────────────────────────────────────────
  private dustScreenLastCastAt = -Infinity;

  constructor(private arena: EarthArenaApi) {
    // Built here rather than as field initialisers so they see the injected arena.
    this.pcol = (base) => arena.earthColor('player', base);
    this.ncol = (base) => arena.earthColor('npc', base);
    this.pfx = new EarthFx(arena.scene, this.pcol);
    this.nfx = new EarthFx(arena.scene, this.ncol);
  }

  // ── Public accessors for cross-cutting arena state ─────────────────────

  getPlayerStunnedUntil(): number { return this.playerEarthStunnedUntil; }
  isRepairActive(): boolean { return this.earthRepairActive; }
  /** Titan Form (Q+): the player is the golem — rooted, hidden and untouchable. */
  isTitanActive(): boolean { return this.titanActive || this.titanLandingUntil > this.arena.scene.time.now; }

  /**
   * Ruin Mastery — Second Skin. The titan is the largest form in the game: a different body, a
   * different ability bar and a player who isn't standing on the floor any more.
   * `exitTitanForm` is the kit's own dismount — it crumbles the head and arms, restores the HP
   * the form was holding, hands the real ability cards back and puts the shield on its timer.
   *
   * `erupt` is false: the Q self-destruct is a *choice*, and being torn out of the form is not
   * allowed to hand out its carpet bombing as a consolation.
   */
  revertForms(f: Fighter): string[] {
    if (f !== this.arena.player || !this.titanActive) return [];
    this.exitTitanForm(this.arena.scene.time.now, false);
    return ['Titan Form'];
  }
  getNpcShieldHp(): number { return this.npcEarthShieldHp; }
  getNpcRocksActive(): boolean { return this.npcEarthRocks.length > 0; }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.playerHold = null;
    this.playerHoldUntil = 0;
    this.playerHoldAngle = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.screenBlurUntil = 0;

    // Earth new kit reset
    // Obsidian perk raises base shield HP: 100 single, or 75 each with Double Shield upgrade
    const obsidianOn = this.arena.hasPerk('player', 'obsidian') && this.arena.elementId === 'earth';
    const baseShieldHp = obsidianOn ? 100 : 75;
    this.earthShieldHp = baseShieldHp;
    this.earthShieldMaxHp = baseShieldHp;
    this.earthShieldEnhanced = false;
    this.earthShieldSprite = null;
    this.earthShieldAngle = 0;
    this.earthShieldRespawnAt = 0;
    this.earthShieldBroken = false;
    this.earthShieldLabel = null;
    this.erosionAura = null;
    this.earthBashActive = false;
    this.earthBashEnd = 0;
    this.earthBashDirX = 0;
    this.earthBashDirY = 0;
    this.earthBashHitDealt = false;
    this.earthBashStartX = 0;
    this.earthBashStartY = 0;
    this.earthBashShieldDmg = 0;
    this.earthBashStabDmg = 0;
    this.earthBashFullCharge = false;
    this.earthBashCharging = false;
    this.earthBashChargeStart = 0;
    this.earthBashChargeRatio = 0;
    this.earthRepairActive = false;
    this.earthRepairStart = 0;
    this.earthRepairEnd = 0;
    if (this.earthRepairAura) { this.earthRepairAura.destroy(); this.earthRepairAura = null; }
    this.earthRocks.forEach(r => r.sprite.destroy());
    this.earthRocks = [];
    this.earthRockOrbitAngle = 0;
    this.earthLaunchedRocks.forEach(r => r.sprite.destroy());
    this.earthLaunchedRocks = [];
    this.earthQuakeSprite = null;
    this.earthQuakeExpiry = 0;
    this.earthQuakeX = 0;
    this.earthQuakeY = 0;
    this.earthQuakeTickAccum = 0;
    this.earthQuakeStunUntil = 0;
    this.earthGolemActive = false;
    this.earthGolemHp = 0;
    this.earthGolemX = 0;
    this.earthGolemY = 0;
    this.earthGolemSprite = null;
    this.earthGolemLink = null;
    this.earthGolemUntil = 0;
    this.earthGolemPunchCdUntil = 0;
    this.earthGolemFaultCdUntil = 0;
    this.earthGolemPoundCdUntil = 0;
    this.earthGolemFaultWall = null;
    this.earthGolemHpLabel = null;
    this.playerEarthCastId = null;
    this.playerEarthStunnedUntil = 0;
    // Earth upgrade resets
    const obsidianBackShieldHp = (this.arena.hasPerk('player', 'obsidian') && this.arena.elementId === 'earth') ? 75 : 50;
    this.earthBackShieldHp = 0;
    this.earthBackShieldMaxHp = obsidianBackShieldHp;
    if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
    if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
    this.earthSplinterHolding = false;
    this.earthSplinterHoldStart = 0;
    this.earthSplinterReady = false;
    this.earthSplinterRepairFast = false;
    this.earthSplinterShards.forEach(s => s.g.destroy());
    this.earthSplinterShards = [];
    this.earthQuakeMagmified = false;
    this.earthQuakeStandAccum = 0;
    this.earthTsunamiWaves.forEach(w => w.sprite.destroy());
    this.earthTsunamiWaves = [];
    this.earthTitanChargeHolding = false;
    this.earthTitanChargeStart = 0;
    if (this.earthTitanChargeVisual) { this.earthTitanChargeVisual.destroy(); this.earthTitanChargeVisual = null; }
    this.clearTitanState();
    // NPC earth new kit reset
    this.npcEarthShieldHp = 75;
    this.npcEarthShieldMaxHp = 75;
    this.npcEarthShieldEnhanced = false;
    this.npcEarthShieldSprite = null;
    this.npcEarthShieldAngle = 0;
    this.npcEarthShieldRespawnAt = 0;
    this.npcEarthShieldBroken = false;
    this.npcEarthShieldLabel = null;
    this.npcEarthBashActive = false;
    this.npcEarthBashEnd = 0;
    this.npcEarthBashDirX = 0;
    this.npcEarthBashDirY = 0;
    this.npcEarthBashHitDealt = false;
    this.npcEarthBashStartX = 0;
    this.npcEarthBashStartY = 0;
    this.npcEarthBashShieldDmg = 0;
    this.npcEarthBashStabDmg = 0;
    this.npcEarthBashFullCharge = false;
    this.npcEarthRepairActive = false;
    this.npcEarthRepairStart = 0;
    this.npcEarthRepairEnd = 0;
    if (this.npcEarthRepairAura) { this.npcEarthRepairAura.destroy(); this.npcEarthRepairAura = null; }
    this.npcEarthRocks.forEach(r => r.sprite.destroy());
    this.npcEarthRocks = [];
    this.npcEarthRockOrbitAngle = 0;
    this.npcEarthLaunchedRocks.forEach(r => r.sprite.destroy());
    this.npcEarthLaunchedRocks = [];
    this.npcEarthQuakeSprite = null;
    this.npcEarthQuakeExpiry = 0;
    this.npcEarthQuakeX = 0;
    this.npcEarthQuakeY = 0;
    this.npcEarthQuakeTickAccum = 0;
    this.npcEarthQuakeStunUntil = 0;
    this.npcEarthGolemActive = false;
    this.npcEarthGolemHp = 0;
    this.npcEarthGolemX = 0;
    this.npcEarthGolemY = 0;
    this.npcEarthGolemSprite = null;
    this.npcEarthGolemLink = null;
    this.npcEarthGolemUntil = 0;
    this.npcEarthGolemPunchCdUntil = 0;
    this.npcEarthGolemFaultCdUntil = 0;
    this.npcEarthGolemPoundCdUntil = 0;
    this.npcEarthGolemFaultWall = null;
    this.npcEarthGolemHpLabel = null;
    this.dustScreenLastCastAt = -Infinity;
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    void H;
    const ptr = this.arena.scene.input.activePointer;
    const player = this.arena.player;
    const npc = this.arena.npc;

    // Unbreakable passive — masteries are player-only progression, so this never touches npc.
    player.knockbackImmune = this.arena.masteryActive;
    player.hardDamageCap = this.arena.masteryActive ? 50 : 0;

    this.updateAvatars(time, delta);
    this.updateSplinterShards(time, delta);

    // ── Player earth ──────────────────────────────────────────────
    if (this.arena.elementId === 'earth') {
      const playerBody = player.body as Phaser.Physics.Arcade.Body;

      // Lazy-spawn initial shield (HP starts at 75 from reset() but sprite doesn't exist yet)
      if (this.earthShieldHp > 0 && !this.playerShieldBuilt() && !this.earthShieldBroken && !this.earthGolemActive && !this.titanActive) {
        // With Click+: adjust initial HP to 50
        if (this.arena.hasUpgrade('click') && this.earthShieldMaxHp === 75) {
          this.earthShieldHp = 50;
          this.earthShieldMaxHp = 50;
        }
        this.spawnEarthShield(true);
      }

      // Update shield facing angle toward cursor
      if (this.earthShieldHp > 0) {
        this.earthShieldAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
      }

      // Shield respawn check (only if not golem-active or in titan form)
      if (!this.earthGolemActive && !this.titanActive && this.earthShieldBroken && this.earthShieldRespawnAt > 0 && time >= this.earthShieldRespawnAt) {
        this.spawnEarthShield(true);
        this.arena.showFloatingText(player.x, player.y - 30, '🛡 SHIELD RESTORED', '#ccaa66');
      }

      // Update shield sprite position
      if (this.playerShieldBuilt()) this.updateEarthShieldSpritePosition(true, delta);

      // Repair active — slow + aura
      if (this.earthRepairActive) {
        if (time >= this.earthRepairEnd) {
          this.earthRepairActive = false;
          if (this.earthRepairAura) { this.earthRepairAura.destroy(); this.earthRepairAura = null; }
          // The work lands: the scaffold slams shut around whatever it was mending.
          this.pfx.ring(player.x, player.y, 34, 8, EARTH.dust, 320, 4, 6);
          this.pfx.grit(player.x, player.y, 8, { speed: 60, size: 2.4, life: 520, fall: 60, depth: 6 });
          // Apply repair effect
          const hasDualShield = this.arena.hasUpgrade('click');
          if (this.earthGolemActive) {
            this.earthGolemHp = Math.min(this.earthGolemMaxHp, this.earthGolemHp + 50);
            this.arena.showFloatingText(player.x, player.y - 30, '🔧 GOLEM REPAIR +50', '#ccaa66');
          } else if (this.earthShieldBroken) {
            this.spawnEarthShield(true);
            this.arena.showFloatingText(player.x, player.y - 30, '🔧 SHIELD RESTORED', '#ccaa66');
          } else {
            // Determine max HPs. Erosion has no second plate to check or to top up — its
            // whole pool is the front one, so it reads its own max rather than a plate's.
            const erosionOn = this.arena.hasPerk('player', 'erosion');
            const fMaxHp = hasDualShield && !erosionOn
              ? (this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50))
              : this.earthShieldMaxHp;
            const bMaxHp = hasDualShield ? (this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50)) : fMaxHp;
            // Check if both shields are at ≥90% to allow enhancement
            const frontReady = this.earthShieldHp >= 0.9 * fMaxHp;
            const backReady = !hasDualShield || erosionOn || (this.earthBackShieldHp > 0 && this.earthBackShieldHp >= 0.9 * bMaxHp);
            const canEnhance = frontReady && backReady && !this.earthShieldEnhanced;
            if (canEnhance) {
              // Enhance both shields to gold
              this.earthShieldEnhanced = true;
              this.earthShieldMaxHp = hasDualShield ? (erosionOn ? 200 : 100) : 125;
              this.earthShieldHp = this.earthShieldMaxHp;
              this.earthShieldSprite?.setEnhanced(true);
              if (hasDualShield && !erosionOn) {
                this.earthBackShieldHp = 100;
                this.earthBackShieldSprite?.setEnhanced(true);
                this.arena.showFloatingText(player.x, player.y - 30, '⚒ SHIELDS ENHANCED!', '#ffcc44');
              } else {
                this.arena.showFloatingText(player.x, player.y - 30, '⚒ SHIELD ENHANCED!', '#ffcc44');
              }
              // Brass poured into the plate: a bright flare off the shield itself.
              this.pfx.flash(
                player.x + Math.cos(this.earthShieldAngle) * 28,
                player.y + Math.sin(this.earthShieldAngle) * 28, 22, 9,
              );
              this.pfx.ring(player.x, player.y, 20, 62, EARTH.brassLit, 420, 4, 8);
            } else {
              // Heal front shield
              if (this.earthShieldHp < fMaxHp) {
                this.earthShieldHp = fMaxHp;
                this.arena.showFloatingText(player.x, player.y - 30, '🔧 SHIELD HEALED', '#ccaa66');
              }
              // Also heal back shield (Click+)
              if (hasDualShield && this.earthBackShieldHp > 0 && this.earthBackShieldHp < bMaxHp) {
                this.earthBackShieldHp = bMaxHp;
                this.arena.showFloatingText(player.x, player.y - 50, '🔧 BACK SHIELD HEALED', '#aaaaaa');
              }
            }
          }
        } else if (this.earthRepairAura) {
          const span = Math.max(1, this.earthRepairEnd - this.earthRepairStart);
          this.earthRepairAura.update(delta, player.x, player.y, (time - this.earthRepairStart) / span);
        }
      }

      // Bash — dash phase
      if (this.earthBashActive) {
        if (time >= this.earthBashEnd) {
          this.earthBashActive = false;
          this.arena.isDodging = false;
          playerBody.setVelocity(0, 0);
          // Ploughed furrow from where the charge began to where it stopped.
          this.pfx.furrow(this.earthBashStartX, this.earthBashStartY, player.x, player.y);
        } else {
          // Check hit against enemies
          if (!this.earthBashHitDealt) {
            for (const t of this.arena.enemies) {
              if (!t.active || t.hp <= 0) continue;
              const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
              if (dist < 70) {
                this.earthBashHitDealt = true;
                const shielded = this.earthShieldHp > 0;
                if (shielded) {
                  t.takeDamage(this.earthBashShieldDmg);
                  this.arena.spawnHitFlash(t.x, t.y, EARTH.clay);
                  this.arena.showFloatingText(t.x, t.y - 20, `🛡 BASH ${this.earthBashShieldDmg}`, '#ccaa66');
                } else {
                  t.takeDamage(this.earthBashStabDmg);
                  this.arena.spawnHitFlash(t.x, t.y, EARTH.clay);
                  this.arena.showFloatingText(t.x, t.y - 20, `🗡 STAB ${this.earthBashStabDmg}`, '#aa8844');
                }
                // The collision itself: a slab of shield driven through someone. Scales with
                // the charge, so a full-power bash reads as heavier and not merely redder.
                const bashAng = Math.atan2(t.y - player.y, t.x - player.x);
                const power = this.earthBashFullCharge ? 1 : 0.55;
                this.pfx.impact(t.x, t.y, (shielded ? 62 : 44) * (0.7 + power * 0.5), {
                  shards: shielded ? 10 : 6, dust: 2, crater: false, depth: 7,
                });
                this.pfx.debris(t.x, t.y, shielded ? 8 : 5, {
                  angle: bashAng, spread: 0.8, speed: 260 * power, size: 4, life: 560, fall: 130, depth: 7,
                });
                this.arena.scene.cameras.main.shake(140 + power * 110, 0.006 + power * 0.006);
                // Full-charge bash stuns on hit (reuses the same stun field the rock launch uses)
                if (this.earthBashFullCharge) {
                  t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 700);
                  this.arena.recordMasteryStat('bashStuns', 1);
                  // Stunned: the ground itself gives out under them.
                  this.pfx.pillar(t.x, t.y, 16, 40, 7);
                  this.pfx.ring(t.x, t.y, 12, 92, EARTH.gold, 420, 5, 7);
                }
              }
            }
          }
        }
      }

      // Orbiting rocks tick + launched rocks
      const lavaRocks = this.arena.hasUpgrade('r');
      const orbitR = lavaRocks ? 38 : 52; // R+: smaller orbit radius
      const orbitSpeed = lavaRocks ? 0.004375 : 0.0028; // R+: 25% faster than 0.0035
      this.earthRockOrbitAngle += delta * orbitSpeed;
      const rockCount = this.earthRocks.length;
      for (let ri = 0; ri < rockCount; ri++) {
        const rock = this.earthRocks[ri];
        const ang = this.earthRockOrbitAngle + ri * (Math.PI * 2 / rockCount);
        rock.sprite.setPosition(player.x + Math.cos(ang) * orbitR, player.y + Math.sin(ang) * orbitR);
        // Rocks tumble as they orbit rather than sliding round face-on, which is the whole
        // difference between four escorts and four stickers.
        rock.sprite.setRotation(ang * (lavaRocks ? 2.4 : 1.7) + ri);
        if (time >= rock.hitCdUntil) {
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const d = Phaser.Math.Distance.Between(rock.sprite.x, rock.sprite.y, t.x, t.y);
            if (d < 22) {
              t.takeDamage(8);
              this.arena.spawnHitFlash(t.x, t.y, lavaRocks ? EARTH.ember : EARTH.clay);
              this.arena.showFloatingText(t.x, t.y - 20, '🪨 8', '#aa8844');
              // A glancing blow: chips off the rock, not a full detonation.
              this.pfx.debris(rock.sprite.x, rock.sprite.y, 4, {
                angle: ang, spread: 1.1, speed: 130, size: 2.6, life: 420, fall: 70,
                depth: 8, molten: lavaRocks,
              });
              this.pfx.ring(t.x, t.y, 6, 26, lavaRocks ? EARTH.magma : EARTH.dust, 260, 3, 7);
              if (lavaRocks) {
                t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 2000);
              }
              rock.hitCdUntil = time + 500;
              break;
            }
          }
        }
      }
      for (let i = this.earthLaunchedRocks.length - 1; i >= 0; i--) {
        const lr = this.earthLaunchedRocks[i];
        lr.sprite.x += lr.vx * (delta / 1000);
        lr.sprite.y += lr.vy * (delta / 1000);
        lr.sprite.rotation += (delta / 1000) * 9;
        // Grit shed out of the *back* of the shot, so the trail reads as speed.
        lr.trailAccum += delta;
        if (lr.trailAccum >= 45) {
          lr.trailAccum = 0;
          this.pfx.grit(lr.sprite.x, lr.sprite.y, 1, {
            angle: Math.atan2(-lr.vy, -lr.vx), spread: 0.5, speed: 40, size: 2.4,
            life: 380, fall: 24, depth: 7, molten: lavaRocks,
          });
        }
        // R+: lava rock ignites quake zone on pass-through (not just on enemy hit)
        if (lavaRocks && this.earthQuakeSprite && this.earthQuakeExpiry > time && !this.earthQuakeMagmified) {
          const qZoneR = this.arena.hasUpgrade('f') ? 100 : 80;
          if (Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, this.earthQuakeX, this.earthQuakeY) < qZoneR) {
            this.magmifyQuake();
          }
        }
        const hitWall = lr.sprite.x < 20 || lr.sprite.x > W - 20 || lr.sprite.y < 20 || lr.sprite.y > H - 20;
        const expired = time - lr.spawnedAt > 1200;
        let rockHit = false;
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, t.x, t.y);
          if (d < 28) {
            const launchDmg = lavaRocks ? 60 : 40;
            t.takeDamage(launchDmg);
            this.arena.spawnHitFlash(t.x, t.y, lavaRocks ? EARTH.ember : EARTH.clay);
            this.arena.showFloatingText(t.x, t.y - 20, lavaRocks ? `🔥 LAVA HIT ${launchDmg}` : `🪨 LAUNCH STUN ${launchDmg}`, '#ffcc44');
            t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 3000);
            // A boulder at 500px/s meeting a body: the full detonation stack, upgraded to the
            // molten flavour when it is a lava rock rather than merely recoloured.
            this.pfx.impact(t.x, t.y, lavaRocks ? 96 : 74, {
              shards: lavaRocks ? 16 : 11, dust: 3, molten: lavaRocks, depth: 7,
              duration: lavaRocks ? 520 : 420,
            });
            this.arena.scene.cameras.main.shake(lavaRocks ? 260 : 190, lavaRocks ? 0.016 : 0.011);
            if (lavaRocks) {
              t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 3000);
              // Splattered magma left cooking on the floor.
              this.pfx.crater(t.x, t.y, 30, 3, true);
              this.pfx.pillar(t.x, t.y, 18, 46, 8);
              // Magmify quake if enemy is inside quake zone
              if (this.earthQuakeSprite && this.earthQuakeExpiry > time) {
                const qZoneR = this.arena.hasUpgrade('f') ? 100 : 80;
                const qd = Phaser.Math.Distance.Between(t.x, t.y, this.earthQuakeX, this.earthQuakeY);
                if (qd < qZoneR) this.magmifyQuake();
              }
            }
            lr.sprite.destroy();
            this.earthLaunchedRocks.splice(i, 1);
            rockHit = true;
            break;
          }
        }
        if (rockHit) continue;
        if (hitWall || expired) {
          // Rocks don't wink out — a rock that hit a wall breaks against it.
          this.pfx.impact(lr.sprite.x, lr.sprite.y, 40, {
            shards: 6, dust: 1, crater: false, depth: 7, duration: 300, molten: lavaRocks,
          });
          lr.sprite.destroy();
          this.earthLaunchedRocks.splice(i, 1);
        }
      }
      // Lava fire DOT from R+ rocks
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (t.lavaRockBurnUntil > time) {
          t.lavaRockBurnAccum += delta;
          if (t.lavaRockBurnAccum >= 500) {
            t.lavaRockBurnAccum -= 500;
            t.takeDamage(2);
            this.arena.spawnHitFlash(t.x, t.y, EARTH.ember);
            // A continuous tell, so the burn is readable on the victim between ticks.
            this.pfx.grit(t.x, t.y - 6, 2, {
              speed: 26, size: 1.8, life: 420, fall: -18, depth: 8, molten: true,
            });
          }
        } else {
          t.lavaRockBurnAccum = 0;
        }
      }

      // Quake zone
      const quakeRadius = this.arena.hasUpgrade('f') ? 100 : 80;
      if (this.earthQuakeSprite && time < this.earthQuakeExpiry) {
        // The floor won't hold still: the whole field is repainted every frame.
        this.earthQuakeSprite.clear();
        EarthFx.drawQuakeField(
          this.earthQuakeSprite, this.pcol, this.earthQuakeX, this.earthQuakeY,
          quakeRadius, time / 1000, this.earthQuakeMagmified, this.arena.hasUpgrade('f'),
        );
        this.earthQuakeTickAccum += delta;
        const isQuakeF = this.arena.hasUpgrade('f');
        const tripInterval = this.earthQuakeMagmified ? (isQuakeF ? 350 : 500) : (isQuakeF ? 500 : 750);
        const tripDmg = this.earthQuakeMagmified ? 10 : 5;
        if (this.earthQuakeTickAccum >= tripInterval) {
          this.earthQuakeTickAccum -= tripInterval;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const d = Phaser.Math.Distance.Between(this.earthQuakeX, this.earthQuakeY, t.x, t.y);
            if (d < quakeRadius && time > (this.earthQuakeStunUntil ?? 0) && Math.random() < 0.35) {
              t.takeDamage(tripDmg, { source: this.earthQuakeSprite, sourceX: this.earthQuakeX, sourceY: this.earthQuakeY });
              this.arena.spawnHitFlash(t.x, t.y, this.earthQuakeMagmified ? EARTH.ember : EARTH.clay);
              this.arena.showFloatingText(t.x, t.y - 20, this.earthQuakeMagmified ? `🌋 MAGMA ${tripDmg}` : `⚡ TRIP ${tripDmg}`, '#ccaa66');
              // Tripped: a plate kicks up under their feet and dumps them off it.
              this.pfx.pillar(t.x, t.y + 6, 12, this.earthQuakeMagmified ? 34 : 24, 7);
              this.pfx.debris(t.x, t.y, this.earthQuakeMagmified ? 7 : 4, {
                speed: 120, size: 3, life: 460, fall: 90, depth: 7, molten: this.earthQuakeMagmified,
              });
              t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 500);
              this.earthQuakeStunUntil = time + 500;
              this.arena.recordMasteryStat('quakeTrips', 1);
              if (this.earthQuakeMagmified) {
                t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 1500);
              }
            }
          }
        }
      } else if (this.earthQuakeSprite && time >= this.earthQuakeExpiry) {
        // Settles rather than vanishing: the broken ground sinks back and throws up dust.
        this.pfx.dust(this.earthQuakeX, this.earthQuakeY, 4, quakeRadius * 0.8, 5);
        this.pfx.ring(this.earthQuakeX, this.earthQuakeY, quakeRadius, quakeRadius * 0.4,
          this.earthQuakeMagmified ? EARTH.magma : EARTH.umber, 460, 4, 4);
        this.earthQuakeSprite.destroy(); this.earthQuakeSprite = null;
        this.earthQuakeMagmified = false;
        this.earthQuakeStandAccum = 0;
      }

      // R+: stand in own quake 3s → spawn orbiting rock (max 4, shared with Rock Dance)
      if (this.arena.hasUpgrade('r') && this.earthQuakeSprite && time < this.earthQuakeExpiry) {
        const qR = this.arena.hasUpgrade('f') ? 100 : 80;
        const inQuake = Phaser.Math.Distance.Between(this.earthQuakeX, this.earthQuakeY, player.x, player.y) < qR;
        if (inQuake) {
          this.earthQuakeStandAccum += delta;
          if (this.earthQuakeStandAccum >= 3000 && this.earthRocks.length < 4) {
            this.earthQuakeStandAccum = 0;
            this.spawnEarthRock(true, 0);
            this.arena.showFloatingText(player.x, player.y - 30, '🪨 QUAKE ROCK', '#ccaa66');
            // Torn out of the shaking floor at the player's feet.
            this.pfx.pillar(player.x, player.y + 10, 13, 30, 7);
            this.pfx.ring(player.x, player.y, 10, 44, EARTH.dust, 320, 3, 6);
          }
        } else {
          this.earthQuakeStandAccum = 0;
        }
      }

      // Quake-perk ridges: a lip of upheaved ground rolling outward from an impact.
      for (let ti = this.earthTsunamiWaves.length - 1; ti >= 0; ti--) {
        const wave = this.earthTsunamiWaves[ti];
        wave.sprite.x += wave.vx * (delta / 1000);
        wave.sprite.y += wave.vy * (delta / 1000);
        // Grinding along: the ridge sheds grit as it travels.
        if (Math.random() < 0.35) {
          this.pfx.grit(wave.sprite.x, wave.sprite.y + Phaser.Math.Between(-40, 40), 1,
            { angle: Math.atan2(wave.vy, wave.vx), spread: 0.9, speed: 60, size: 2.4, life: 420, fall: 60, depth: 6 });
        }
        if (time >= wave.expiresAt || wave.sprite.x < -100 || wave.sprite.x > W + 100 || wave.sprite.y < -100 || wave.sprite.y > H + 100) {
          wave.sprite.destroy();
          this.earthTsunamiWaves.splice(ti, 1);
          continue;
        }
        // Damage enemies on contact (owner-aware: quake waves can hurt the player)
        const waveOwner = wave.owner ?? 'player';
        const waveDamage = wave.owner ? 12 : 35; // quake waves deal less damage
        const waveHitRadius = wave.owner ? 40 : 55;
        const waveTargets = waveOwner === 'player' ? (this.arena.enemies as Fighter[]) : [player as Fighter];
        for (const t of waveTargets) {
          if (!t.active || t.hp <= 0) continue;
          const wd = Phaser.Math.Distance.Between(wave.sprite.x, wave.sprite.y, t.x, t.y);
          if (wd < waveHitRadius) {
            t.takeDamage(waveDamage);
            this.arena.spawnHitFlash(t.x, t.y, EARTH.dust);
            this.pfx.impact(t.x, t.y, 52, { shards: 7, dust: 1, crater: false, depth: 7, duration: 340 });
            const tb = t.body as Phaser.Physics.Arcade.Body;
            tb.setVelocity(wave.vx * 0.8, wave.vy * 0.8);
            t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 500);
            wave.sprite.destroy();
            this.earthTsunamiWaves.splice(ti, 1);
            break;
          }
        }
      }

      // Golem AI
      if (this.earthGolemActive) {
        if (this.earthGolemHp <= 0 || time >= this.earthGolemUntil) {
          this.endEarthGolem(true);
        } else {
          // Damage sharing: incoming player damage is intercepted in takeDamage via damageAbsorber
          this.updateGolemAI(true, time, delta);
        }
      }

      // E+ Shield Splinter: the plate cooks itself from the inside before it lets go.
      if (this.earthShieldSprite) {
        if (this.earthSplinterHolding) {
          const wind = Phaser.Math.Clamp((time - this.earthSplinterHoldStart) / 2000, 0, 1);
          this.earthShieldSprite.setSplinter(this.earthSplinterReady ? 1 : wind * 0.7);
          // Once armed it starts flinging chips off itself.
          if (this.earthSplinterReady && Math.random() < 0.3) {
            const sa = this.earthShieldAngle;
            this.pfx.grit(player.x + Math.cos(sa) * 28, player.y + Math.sin(sa) * 28, 1,
              { speed: 70, size: 2.2, life: 420, fall: 60, depth: 9, molten: true });
          }
        } else {
          this.earthShieldSprite.setSplinter(0);
        }
      }

      // Q+ Titan Form: rock hauled off the floor and stacked onto the caster.
      if (this.earthTitanChargeHolding && this.earthTitanChargeVisual) {
        const holdPct = Math.min(1, (time - this.earthTitanChargeStart) / 5000);
        this.earthTitanChargeVisual.update(delta, player.x, player.y, holdPct);
      }

      // Q+ Titan Form: the golem itself plus everything it left lying around
      this.updateTitan(time, delta);
    }

    // ── NPC earth ─────────────────────────────────────────────────
    if (this.arena.npcElementId === 'earth') {
      const npcBody = npc.body as Phaser.Physics.Arcade.Body;
      void npcBody;

      // Lazy-spawn initial NPC shield
      if (this.npcEarthShieldHp > 0 && !this.npcEarthShieldSprite && !this.npcEarthShieldBroken && !this.npcEarthGolemActive) {
        this.spawnEarthShield(false);
      }

      // Update NPC shield facing toward player
      if (this.npcEarthShieldHp > 0) {
        this.npcEarthShieldAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
      }

      // Shield respawn
      if (!this.npcEarthGolemActive && this.npcEarthShieldBroken && this.npcEarthShieldRespawnAt > 0 && time >= this.npcEarthShieldRespawnAt) {
        this.spawnEarthShield(false);
        this.arena.showFloatingText(npc.x, npc.y - 30, '🛡 SHIELD RESTORED', '#ccaa66');
      }
      if (this.npcEarthShieldSprite) this.updateEarthShieldSpritePosition(false, delta);

      // NPC Repair
      if (this.npcEarthRepairActive) {
        if (time < this.npcEarthRepairEnd) {
          if (!this.npcEarthRepairAura) {
            this.npcEarthRepairAura = new EarthAura(this.arena.scene, this.ncol, 30, 4);
          }
          const span = Math.max(1, this.npcEarthRepairEnd - this.npcEarthRepairStart);
          this.npcEarthRepairAura.update(delta, npc.x, npc.y, (time - this.npcEarthRepairStart) / span);
        } else {
          this.npcEarthRepairActive = false;
          if (this.npcEarthRepairAura) { this.npcEarthRepairAura.destroy(); this.npcEarthRepairAura = null; }
          this.nfx.ring(npc.x, npc.y, 34, 8, EARTH.dust, 320, 4, 6);
          this.nfx.grit(npc.x, npc.y, 8, { speed: 60, size: 2.4, life: 520, fall: 60, depth: 6 });
          if (this.npcEarthGolemActive) {
            this.npcEarthGolemHp = Math.min(this.earthGolemMaxHp, this.npcEarthGolemHp + 50);
            this.arena.showFloatingText(npc.x, npc.y - 30, '🔧 GOLEM REPAIR +50', '#ccaa66');
          } else if (this.npcEarthShieldBroken) {
            this.spawnEarthShield(false);
          } else if (this.npcEarthShieldHp < this.npcEarthShieldMaxHp) {
            this.npcEarthShieldHp = this.npcEarthShieldMaxHp;
          } else if (!this.npcEarthShieldEnhanced) {
            this.npcEarthShieldEnhanced = true;
            this.npcEarthShieldMaxHp = 125;
            this.npcEarthShieldHp = 125;
            this.npcEarthShieldSprite?.setEnhanced(true);
            this.nfx.flash(
              npc.x + Math.cos(this.npcEarthShieldAngle) * 28,
              npc.y + Math.sin(this.npcEarthShieldAngle) * 28, 22, 9,
            );
          }
        }
      }

      // NPC Bash
      if (this.npcEarthBashActive) {
        if (time >= this.npcEarthBashEnd) {
          this.npcEarthBashActive = false;
          npcBody.setVelocity(0, 0);
          this.nfx.furrow(this.npcEarthBashStartX, this.npcEarthBashStartY, npc.x, npc.y);
        } else if (!this.npcEarthBashHitDealt) {
          const dist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
          if (dist < 70) {
            this.npcEarthBashHitDealt = true;
            const shielded = this.npcEarthShieldHp > 0;
            if (shielded) {
              player.takeDamage(this.npcEarthBashShieldDmg);
              this.arena.spawnHitFlash(player.x, player.y, EARTH.clay);
              this.arena.showFloatingText(player.x, player.y - 20, `🛡 BASH ${this.npcEarthBashShieldDmg}`, '#ccaa66');
            } else {
              player.takeDamage(this.npcEarthBashStabDmg);
              this.arena.spawnHitFlash(player.x, player.y, EARTH.clay);
              this.arena.showFloatingText(player.x, player.y - 20, `🗡 STAB ${this.npcEarthBashStabDmg}`, '#aa8844');
            }
            const bashAng = Math.atan2(player.y - npc.y, player.x - npc.x);
            const power = this.npcEarthBashFullCharge ? 1 : 0.55;
            this.nfx.impact(player.x, player.y, (shielded ? 62 : 44) * (0.7 + power * 0.5), {
              shards: shielded ? 10 : 6, dust: 2, crater: false, depth: 7,
            });
            this.nfx.debris(player.x, player.y, shielded ? 8 : 5, {
              angle: bashAng, spread: 0.8, speed: 260 * power, size: 4, life: 560, fall: 130, depth: 7,
            });
            this.arena.scene.cameras.main.shake(140 + power * 110, 0.006 + power * 0.006);
            if (this.npcEarthBashFullCharge) {
              player.earthStunnedUntil = Math.max(player.earthStunnedUntil, time + 700);
              this.nfx.pillar(player.x, player.y, 16, 40, 7);
              this.nfx.ring(player.x, player.y, 12, 92, EARTH.gold, 420, 5, 7);
            }
          }
        }
      }

      // NPC orbiting rocks
      this.npcEarthRockOrbitAngle += delta * 0.0028;
      const npcRockCount = this.npcEarthRocks.length;
      for (let nri = 0; nri < npcRockCount; nri++) {
        const rock = this.npcEarthRocks[nri];
        const ang = this.npcEarthRockOrbitAngle + nri * (Math.PI * 2 / npcRockCount);
        rock.sprite.setPosition(npc.x + Math.cos(ang) * 52, npc.y + Math.sin(ang) * 52);
        rock.sprite.setRotation(ang * 1.7 + nri);
        if (time >= rock.hitCdUntil) {
          const d = Phaser.Math.Distance.Between(rock.sprite.x, rock.sprite.y, player.x, player.y);
          if (d < 22) {
            player.takeDamage(8);
            this.arena.spawnHitFlash(player.x, player.y, EARTH.clay);
            this.arena.showFloatingText(player.x, player.y - 20, '🪨 8', '#aa8844');
            this.nfx.debris(rock.sprite.x, rock.sprite.y, 4,
              { angle: ang, spread: 1.1, speed: 130, size: 2.6, life: 420, fall: 70, depth: 8 });
            this.nfx.ring(player.x, player.y, 6, 26, EARTH.dust, 260, 3, 7);
            rock.hitCdUntil = time + 500;
          }
        }
      }
      for (let i = this.npcEarthLaunchedRocks.length - 1; i >= 0; i--) {
        const lr = this.npcEarthLaunchedRocks[i];
        lr.sprite.x += lr.vx * (delta / 1000);
        lr.sprite.y += lr.vy * (delta / 1000);
        lr.sprite.rotation += (delta / 1000) * 9;
        lr.trailAccum += delta;
        if (lr.trailAccum >= 45) {
          lr.trailAccum = 0;
          this.nfx.grit(lr.sprite.x, lr.sprite.y, 1, {
            angle: Math.atan2(-lr.vy, -lr.vx), spread: 0.5, speed: 40, size: 2.4,
            life: 380, fall: 24, depth: 7,
          });
        }
        const d = Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, player.x, player.y);
        const hitWall = lr.sprite.x < 20 || lr.sprite.x > W - 20 || lr.sprite.y < 20 || lr.sprite.y > H - 20;
        const expired = time - lr.spawnedAt > 1200;
        if (d < 28) {
          player.takeDamage(40);
          this.arena.spawnHitFlash(player.x, player.y, EARTH.clay);
          this.arena.showFloatingText(player.x, player.y - 20, '🪨 LAUNCH STUN 40', '#ffcc44');
          this.playerEarthStunnedUntil = Math.max(this.playerEarthStunnedUntil, time + 3000);
          this.nfx.impact(player.x, player.y, 74, { shards: 11, dust: 3, depth: 7, duration: 420 });
          this.arena.scene.cameras.main.shake(190, 0.011);
          lr.sprite.destroy();
          this.npcEarthLaunchedRocks.splice(i, 1);
        } else if (hitWall || expired) {
          this.nfx.impact(lr.sprite.x, lr.sprite.y, 40,
            { shards: 6, dust: 1, crater: false, depth: 7, duration: 300 });
          lr.sprite.destroy();
          this.npcEarthLaunchedRocks.splice(i, 1);
        }
      }

      // NPC Quake zone
      if (this.npcEarthQuakeSprite && time < this.npcEarthQuakeExpiry) {
        this.npcEarthQuakeSprite.clear();
        EarthFx.drawQuakeField(this.npcEarthQuakeSprite, this.ncol,
          this.npcEarthQuakeX, this.npcEarthQuakeY, 80, time / 1000, false, false);
        this.npcEarthQuakeTickAccum += delta;
        if (this.npcEarthQuakeTickAccum >= 750) {
          this.npcEarthQuakeTickAccum -= 750;
          const d = Phaser.Math.Distance.Between(this.npcEarthQuakeX, this.npcEarthQuakeY, player.x, player.y);
          if (d < 80 && time > (this.npcEarthQuakeStunUntil ?? 0) && Math.random() < 0.35) {
            player.takeDamage(5, { source: this.npcEarthQuakeSprite, sourceX: this.npcEarthQuakeX, sourceY: this.npcEarthQuakeY });
            this.arena.spawnHitFlash(player.x, player.y, EARTH.clay);
            this.arena.showFloatingText(player.x, player.y - 20, '⚡ TRIP 5', '#ccaa66');
            this.nfx.pillar(player.x, player.y + 6, 12, 24, 7);
            this.nfx.debris(player.x, player.y, 4, { speed: 120, size: 3, life: 460, fall: 90, depth: 7 });
            this.playerEarthStunnedUntil = Math.max(this.playerEarthStunnedUntil, time + 500);
            this.npcEarthQuakeStunUntil = time + 500;
          }
        }
      } else if (this.npcEarthQuakeSprite && time >= this.npcEarthQuakeExpiry) {
        this.nfx.dust(this.npcEarthQuakeX, this.npcEarthQuakeY, 4, 64, 5);
        this.npcEarthQuakeSprite.destroy(); this.npcEarthQuakeSprite = null;
      }

      // NPC Golem AI
      if (this.npcEarthGolemActive) {
        if (this.npcEarthGolemHp <= 0 || time >= this.npcEarthGolemUntil) {
          this.endEarthGolem(false);
        } else {
          this.updateGolemAI(false, time, delta);
        }
      }

      // React to npcCastId for earth abilities (signals from doEarthAbilities)
      this.handleNpcCastId(this.arena.npcCastId);
      if (this.arena.npcCastId === 'bash') {
        // Launch a rock if shield is active and one is within ±45° of shield angle
        let npcLaunchedRock = false;
        if (this.npcEarthShieldHp > 0 && this.npcEarthRocks.length > 0) {
          for (let i = this.npcEarthRocks.length - 1; i >= 0; i--) {
            const rock = this.npcEarthRocks[i];
            const rockAng = Math.atan2(rock.sprite.y - npc.y, rock.sprite.x - npc.x);
            const diff = Math.abs(Phaser.Math.Angle.ShortestBetween(
              Phaser.Math.RadToDeg(rockAng),
              Phaser.Math.RadToDeg(this.npcEarthShieldAngle)
            ));
            if (diff <= 45) {
              this.launchEarthRock(false, i);
              npcLaunchedRock = true;
              break;
            }
          }
        }
        if (!npcLaunchedRock) {
          const dx = player.x - npc.x;
          const dy = player.y - npc.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // NPCs don't hold-charge; roll a random charge so they occasionally land the full stun too.
          const npcChargeRatio = 0.3 + Math.random() * 0.7;
          this.performEarthBash(false, npc.x + (dx / len) * 10, npc.y + (dy / len) * 10, npcChargeRatio);
        }
      }
      if (this.arena.npcCastId === 'rock-dance' && this.npcEarthRocks.length === 0) {
        for (let i = 0; i < 4; i++) this.spawnEarthRock(false, i * Math.PI / 2);
        this.arena.showFloatingText(npc.x, npc.y - 30, '🪨 ROCK DANCE', '#ccaa66');
        this.rockDanceBurst(this.nfx, npc.x, npc.y, false);
      }
      if (this.arena.npcCastId === 'quake') {
        const qx = player.x + Phaser.Math.Between(-60, 60);
        const qy = player.y + Phaser.Math.Between(-60, 60);
        if (this.npcEarthQuakeSprite) this.npcEarthQuakeSprite.destroy();
        this.npcEarthQuakeSprite = this.arena.scene.add.graphics().setDepth(4);
        this.npcEarthQuakeX = qx; this.npcEarthQuakeY = qy;
        this.npcEarthQuakeExpiry = time + 5000;
        this.npcEarthQuakeTickAccum = 0;
        this.arena.showFloatingText(qx, qy, '⛰ QUAKE', '#ccaa66');
        this.quakeOpeningBurst(this.nfx, qx, qy, 80, false);
      }
      if (this.arena.npcCastId === 'repair') {
        this.npcEarthRepairActive = true;
        this.npcEarthRepairStart = time;
        this.npcEarthRepairEnd = time + 3000;
        this.arena.showFloatingText(npc.x, npc.y - 30, '🔧 REPAIR', '#ccaa66');
      }
      if (this.arena.npcCastId === 'golem-ritual') {
        if (this.npcEarthShieldHp > 0 && !this.npcEarthGolemActive) {
          this.spawnEarthGolem(false);
        }
      }
    }

    // ── NpcCastId earth dispatch (player-cast side) ────────────────
    if (this.arena.elementId === 'earth' && this.playerEarthCastId) {
      if (this.playerEarthCastId === 'rock-dance' && this.earthRocks.length === 0) {
        for (let i = 0; i < 4; i++) this.spawnEarthRock(true, i * Math.PI / 2);
        this.arena.showFloatingText(player.x, player.y - 30, '🪨 ROCK DANCE', '#ccaa66');
        this.playPlayerGesture('flex');
        this.rockDanceBurst(this.pfx, player.x, player.y, this.arena.hasUpgrade('r'));
      }
      if (this.playerEarthCastId === 'quake') {
        const ptr2 = this.arena.scene.input.activePointer;
        const hasTectonic = this.arena.hasUpgrade('f');
        const qRadius = hasTectonic ? 100 : 80;
        const qDuration = hasTectonic ? 6000 : 5000;
        if (this.earthQuakeSprite) this.earthQuakeSprite.destroy();
        this.earthQuakeSprite = this.arena.scene.add.graphics().setDepth(4);
        this.earthQuakeX = ptr2.worldX; this.earthQuakeY = ptr2.worldY;
        this.earthQuakeExpiry = time + qDuration;
        this.earthQuakeTickAccum = 0;
        this.earthQuakeMagmified = false;
        this.earthQuakeStandAccum = 0;
        this.arena.showFloatingText(ptr2.worldX, ptr2.worldY, hasTectonic ? '⛰ TECTONIC QUAKE' : '⛰ QUAKE', '#ccaa66');
        this.playPlayerGesture('slam', Math.atan2(ptr2.worldY - player.y, ptr2.worldX - player.x));
        this.quakeOpeningBurst(this.pfx, ptr2.worldX, ptr2.worldY, qRadius, hasTectonic);
      }
      if (this.playerEarthCastId === 'golem-ritual') {
        if (this.earthShieldHp > 0 && !this.earthGolemActive) {
          // Click+: only removes front shield, keeps back shield
          if (this.arena.hasUpgrade('click') && this.earthBackShieldHp > 0) {
            // Front shield consumed, back shield stays
            this.earthShieldHp = 0;
            this.earthShieldBroken = true;
            this.earthShieldRespawnAt = 0;
            if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
          }
          this.spawnEarthGolem(true);
        }
      }
      this.playerEarthCastId = null;
    }
  }

  // ── Character rig ───────────────────────────────────────────────────────

  /** One-shot arm gesture on the player's rig, aimed at the cursor unless told otherwise. */
  private playPlayerGesture(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.playerAvatar?.play(gesture, angle ?? this.playerAim(), duration);
  }

  /** Sustained pose for the length of a channel. Lapses on its own so nothing can strand it. */
  private setPlayerHold(hold: ArmHold, durationMs = 0, angle?: number): void {
    this.playerHold = hold;
    this.playerHoldAngle = angle ?? this.playerAim();
    this.playerHoldUntil = hold ? this.arena.scene.time.now + durationMs : 0;
  }

  private playerAim(): number {
    const { player } = this.arena;
    const ax = this.lastMouseX || player.x + 1;
    const ay = this.lastMouseY || player.y;
    return Math.atan2(ay - player.y, ax - player.x);
  }

  /**
   * Builds (on first frame) and drives the stone avatar for whichever fighters are earth. The
   * player faces the cursor; the NPC faces whoever it is fighting. Both are destroyed the
   * moment their side stops being earth, so a mid-match element swap can't strand a rig.
   */
  private updateAvatars(time: number, delta: number): void {
    const { player, npc, scene } = this.arena;
    const isPlayerEarth = this.arena.elementId === 'earth';
    const isNpcEarth = this.arena.npcElementId === 'earth';

    if (isPlayerEarth && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new EarthAvatar(scene, this.pcol);
      this.playerAvatar.setFacing(this.playerAim());
      // Standing in a golem or a titan makes the character itself read heavier.
      this.playerAvatar.setIntensity(this.titanActive ? 1.5 : this.earthGolemActive ? 1.25 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      if (this.playerHold && time >= this.playerHoldUntil) this.playerHold = null;
      this.playerAvatar.setHold(this.playerHold, this.playerHoldAngle);
      // Titan Form hides the player outright — the rig has to go with them.
      const alpha = player.forceInvisible || this.titanActive ? 0 : player.alpha;
      this.playerAvatar.update(delta, player.x, player.y, alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcEarth && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new EarthAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcEarthGolemActive ? 1.25 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Mirrors the opponent's casts onto their rig. */
  private handleNpcCastId(id: string | null): void {
    if (!id) return;
    const gesture = NPC_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));
  }

  // ── Shared cast flourishes ──────────────────────────────────────────────

  /** Four rocks torn out of the ground and thrown into orbit. */
  private rockDanceBurst(fx: EarthFx, x: number, y: number, lava: boolean): void {
    const orbit = lava ? 38 : 52;
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      fx.pillar(x + Math.cos(a) * orbit, y + Math.sin(a) * orbit * 0.85, 10, 26, 7);
    }
    fx.ring(x, y, 12, orbit + 16, lava ? EARTH.magma : EARTH.dust, 420, 4, 6);
    fx.dust(x, y, 3, orbit, 4);
    this.arena.scene.cameras.main.shake(180, 0.007);
  }

  /** The floor opening up where a quake lands. Scales with the Tectonic upgrade. */
  private quakeOpeningBurst(fx: EarthFx, x: number, y: number, radius: number, tectonic: boolean): void {
    fx.impact(x, y, radius * (tectonic ? 1.05 : 0.85), {
      shards: tectonic ? 16 : 10, dust: tectonic ? 5 : 3, crater: false, depth: 5,
      duration: tectonic ? 520 : 400,
    });
    // Tectonic gets extra spires around the rim — the upgrade adds content, not just radius.
    const spires = tectonic ? 7 : 4;
    for (let i = 0; i < spires; i++) {
      const a = (i / spires) * Math.PI * 2 + Math.random();
      const d = radius * (0.4 + Math.random() * 0.5);
      fx.pillar(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, 12, tectonic ? 44 : 30, 6);
    }
    this.arena.scene.cameras.main.shake(tectonic ? 420 : 300, tectonic ? 0.018 : 0.012);
  }

  /** Both E paths (base tap and the short hold under Shield Splinter) start Repair here. */
  private startRepair(time: number): void {
    const player = this.arena.player;
    this.earthRepairActive = true;
    this.earthRepairStart = time;
    this.earthRepairEnd = time + 3000;
    if (this.earthRepairAura) this.earthRepairAura.destroy();
    this.earthRepairAura = new EarthAura(this.arena.scene, this.pcol, 32, 4);
    this.arena.showFloatingText(player.x, player.y - 30, '🔧 REPAIR', '#ccaa66');
    // Hands drop low to the work for the whole three seconds.
    this.setPlayerHold('sow', 3000);
    this.pfx.ring(player.x, player.y, 8, 40, EARTH.dust, 380, 3, 5);
  }

  /** R+ lava rock met the quake zone: the whole field turns over into magma. */
  private magmifyQuake(): void {
    if (this.earthQuakeMagmified) return;
    this.earthQuakeMagmified = true;
    const r = this.arena.hasUpgrade('f') ? 100 : 80;
    this.arena.showFloatingText(this.earthQuakeX, this.earthQuakeY - 20, '🌋 MAGMA QUAKE', '#ff2200');
    // The ignition itself: fire spreading out from the middle to the rim.
    this.pfx.ring(this.earthQuakeX, this.earthQuakeY, 8, r * 1.15, EARTH.gold, 520, 6, 5);
    this.pfx.ring(this.earthQuakeX, this.earthQuakeY, 8, r * 0.7, EARTH.ember, 380, 5, 5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const d = r * (0.3 + Math.random() * 0.55);
      this.pfx.pillar(this.earthQuakeX + Math.cos(a) * d, this.earthQuakeY + Math.sin(a) * d * 0.85, 13, 40, 6);
    }
    this.pfx.debris(this.earthQuakeX, this.earthQuakeY, 14,
      { speed: r * 2, size: 4, life: 700, fall: 150, depth: 6, molten: true });
    this.arena.scene.cameras.main.shake(380, 0.016);
  }

  /** Plates thrown by Shield Splinter: tumble, trail grit, shatter on contact. */
  private updateSplinterShards(time: number, delta: number): void {
    const npc = this.arena.npc;
    for (let i = this.earthSplinterShards.length - 1; i >= 0; i--) {
      const s = this.earthSplinterShards[i];
      s.x += s.vx * (delta / 1000);
      s.y += s.vy * (delta / 1000);
      s.g.setPosition(s.x, s.y);
      s.g.rotation += s.spin * (delta / 1000);
      s.trailAccum += delta;
      if (s.trailAccum >= 40) {
        s.trailAccum = 0;
        this.pfx.grit(s.x, s.y, 1, {
          angle: Math.atan2(-s.vy, -s.vx), spread: 0.5, speed: 34, size: 2, life: 320, fall: 20, depth: 7,
        });
      }

      const hit = npc.active && npc.hp > 0 && Phaser.Math.Distance.Between(s.x, s.y, npc.x, npc.y) < 28;
      if (hit) {
        npc.takeDamage(20);
        this.arena.spawnHitFlash(npc.x, npc.y, s.colour);
        this.arena.showFloatingText(npc.x, npc.y - 20, '🛡 SHARD 20', '#cccccc');
        if (npc.hp <= 0) this.arena.recordMasteryStat('splinterKills', 1);
        this.earthSplinterRepairFast = true; // next break → 4s repair
        this.pfx.shatter(s.x, s.y, Math.atan2(s.vy, s.vx), s.colour, 7, 8);
      }
      if (hit || time - s.spawnedAt > 1500) {
        if (!hit) this.pfx.shatter(s.x, s.y, Math.atan2(s.vy, s.vx), s.colour, 4, 8);
        s.g.destroy();
        this.earthSplinterShards.splice(i, 1);
      }
    }
  }

  /**
   * Dust Screen landing on the local human: blur the canvas for `ms`, extending an existing
   * blur rather than letting an earlier call clear it early. Lives here rather than in
   * ArenaScene because Dust Screen is the only thing in the game that uses it.
   */
  private applyScreenBlur(durationMs: number): void {
    const scene = this.arena.scene;
    this.screenBlurUntil = Math.max(this.screenBlurUntil, scene.time.now + durationMs);
    const canvas = scene.game.canvas as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.filter = 'blur(5px)';
    scene.time.delayedCall(durationMs, () => {
      if (scene.time.now >= this.screenBlurUntil) {
        const c = scene.game.canvas as HTMLCanvasElement | undefined;
        if (c) c.style.filter = '';
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Q+ TITAN FORM
  //  Hold Q for 5s to become a titanic golem that looms over the arena: only
  //  its head (over the top edge) and its two arms (down the left/right edges)
  //  fit on screen. 20s, untouchable, five bespoke world-scale attacks.
  // ══════════════════════════════════════════════════════════════════════

  /** Fixed craggy jitter for the skull silhouette — deterministic so the head doesn't boil. */
  private static readonly HEAD_JITTER = [1.03, 0.93, 1.07, 0.9, 1.09, 0.95, 1.02, 0.91, 1.08, 0.94, 1.01, 0.92, 1.06, 0.97, 1.04, 0.9];

  private shake(ms: number, intensity: number): void {
    this.arena.scene.cameras.main.shake(ms, intensity);
  }

  private titanTargets(): Fighter[] {
    return this.arena.enemies.filter(t => t.active && t.hp > 0);
  }

  /** Destroys every titan-owned display object and zeroes the state. Safe to call any time. */
  private clearTitanState(): void {
    this.titanActive = false;
    this.titanUntil = 0;
    this.titanPreHp = 0;
    this.titanLandingUntil = 0;
    if (this.titanHeadG) { this.titanHeadG.destroy(); this.titanHeadG = null; }
    if (this.titanArmsG) { this.titanArmsG.destroy(); this.titanArmsG = null; }
    if (this.titanTimerLabel) { this.titanTimerLabel.destroy(); this.titanTimerLabel = null; }
    this.titanArms.forEach(a => a.marker?.destroy());
    this.titanArms = [];
    this.titanSmashCdUntil = 0;
    this.titanTremorCdUntil = 0;
    this.titanTsunamiCdUntil = 0;
    this.titanBeamCdUntil = 0;
    this.titanRocks.forEach(r => { r.g.destroy(); r.shadow.destroy(); });
    this.titanRocks = [];
    if (this.titanTremorLine) { this.titanTremorLine.g.destroy(); this.titanTremorLine = null; }
    if (this.titanWave) { this.titanWave.g.destroy(); this.titanWave = null; }
    if (this.titanBeam) { this.titanBeam.g.destroy(); this.titanBeam = null; }
    this.titanScorch.forEach(s => s.sprite.destroy());
    this.titanScorch = [];
    this.titanScorchAccum = 0;
    this.titanEruptionsLeft = 0;
    this.titanEruptionNextAt = 0;
  }

  private enterTitanForm(time: number): void {
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;

    this.clearTitanState();
    this.titanActive = true;
    this.titanUntil = time + TITAN_DURATION_MS;
    this.titanPreHp = player.hp;

    // The player *is* the golem now: hidden, rooted (ArenaScene zeroes their speed
    // via isTitanActive()) and immune to everything.
    player.forceInvisible = true;
    player.setAlpha(0);
    player.setHealthBarVisible(false);
    player.isInvincible = true;
    player.damageAbsorber = () => true;
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // Shields are absorbed into the transformation.
    this.earthShieldHp = 0;
    this.earthShieldBroken = true;
    this.earthShieldRespawnAt = 0;
    if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
    if (this.erosionAura) { this.erosionAura.destroy(); this.erosionAura = null; }
    if (this.earthShieldLabel) { this.earthShieldLabel.destroy(); this.earthShieldLabel = null; }
    if (this.earthBackShieldHp > 0) {
      this.earthBackShieldHp = 0;
      if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
      if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
    }

    this.titanArmsG = this.arena.scene.add.graphics().setDepth(30);
    this.titanHeadG = this.arena.scene.add.graphics().setDepth(31);
    this.titanTimerLabel = this.arena.scene.add.text(W / 2, 200, '', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffbb55',
      stroke: '#2a1c0c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(32);

    const mkArm = (side: -1 | 1): TitanArm => {
      const sx = side < 0 ? -70 : W + 70;
      const ex = side < 0 ? 46 : W - 46;
      const rx = side < 0 ? 68 : W - 68;
      const ry = H * 0.78;
      return {
        side,
        shoulderX: sx, shoulderY: -70,
        elbowX: ex, elbowY: H * 0.36,
        restX: rx, restY: ry,
        fistX: rx, fistY: ry,
        fromX: rx, fromY: ry, toX: rx, toY: ry,
        targetX: rx, targetY: ry,
        phase: 'rest', phaseStart: 0, phaseEnd: 0, marker: null,
      };
    };
    this.titanArms = [mkArm(-1), mkArm(1)];

    // Ability bar takes on the titan's kit.
    const titanCards: Array<[string, string]> = [
      ['[Click] Titan Smash', 'Hand slam: 20 dmg, 3 rocks fall'],
      ['[E] Titan Tremor', 'Rift splits arena: 15 dmg/1s'],
      ['[R] Titan Tsunami', 'Wave pins to wall, 50 rocks'],
      ['[F] Titan Beam', '5s beam + molten ground'],
      ['[Q] Titan Eruption', 'Self-destruct: 20 blasts'],
    ];
    this.arena.abilityBars.forEach((bar, idx) => {
      if (idx >= titanCards.length) return;
      bar.lbl?.setText(titanCards[idx][0]);
      bar.desc?.setText(titanCards[idx][1]);
    });

    // Rise: a wall of dust and debris torn along the top edge, and a long heavy quake.
    this.shake(1200, 0.028);
    for (let i = 0; i < 5; i++) {
      const dx = 60 + (i / 4) * (W - 120);
      this.pfx.dust(dx, 90 + Math.random() * 70, 4, 70, 29);
      this.pfx.debris(dx, 150, 6, { speed: 190, size: 7, life: 900, fall: 240, depth: 29 });
    }
    this.pfx.ring(W / 2, 170, 60, W * 0.7, EARTH.dust, 900, 7, 29);
    this.playPlayerGesture('raise', -Math.PI / 2, 1200);
    this.arena.showFloatingText(W / 2, 240, '🗿 TITAN GOLEM RISES!', '#ffbb55');
  }

  /** `erupt` = the Q self-destruct (flings the player back in + carpet bombs the arena). */
  private exitTitanForm(time: number, erupt: boolean): void {
    const player = this.arena.player;
    const W = this.arena.width;
    const H = this.arena.height;
    if (!this.titanActive) return;

    this.titanActive = false;
    this.titanUntil = 0;

    // Crumble the body away — the world effects it spawned keep running.
    if (this.titanHeadG) { this.titanHeadG.destroy(); this.titanHeadG = null; }
    if (this.titanArmsG) { this.titanArmsG.destroy(); this.titanArmsG = null; }
    if (this.titanTimerLabel) { this.titanTimerLabel.destroy(); this.titanTimerLabel = null; }
    this.titanArms.forEach(a => a.marker?.destroy());
    this.titanArms = [];
    if (this.titanBeam) { this.titanBeam.g.destroy(); this.titanBeam = null; }

    // Debris shower from where the head and arms were — the body falling apart, mid-air.
    for (const cx of [W / 2 - 160, W / 2, W / 2 + 160, 50, W - 50]) {
      this.pfx.debris(cx, Phaser.Math.Between(60, 180), 8, {
        speed: 130, size: 9, life: 1100, fall: 460, depth: 27, molten: cx === W / 2,
      });
      this.pfx.dust(cx, 140, 3, 80, 26);
    }

    // Player comes back to earth. Restoring HP mirrors the old fusion: the form
    // is a detour, not a heal — but it never costs you anything either.
    player.hp = Math.max(1, this.titanPreHp);
    player.forceInvisible = false;
    player.setHealthBarVisible(true);
    this.earthShieldBroken = true;
    this.earthShieldHp = 0;
    this.earthShieldRespawnAt = time + 8000;

    // Restore the real ability bar cards.
    const originalAbilities = this.arena.playerAbilities;
    this.arena.abilityBars.forEach((bar, idx) => {
      if (idx >= originalAbilities.length) return;
      const ab = originalAbilities[idx];
      bar.lbl?.setText(`[${ab.displayKey}] ${ab.name}`);
      bar.desc?.setText(ab.description);
    });

    if (erupt) {
      // Hurled out of the collapsing golem: land somewhere central, stay a rock
      // until you touch down, then 20 staggered eruptions walk across the arena.
      const landX = Phaser.Math.Clamp(W / 2 + Phaser.Math.Between(-140, 140), 60, W - 60);
      const landY = Phaser.Math.Clamp(H * 0.62 + Phaser.Math.Between(-60, 60), 120, H - 60);
      player.setPosition(landX, landY);
      (player.body as Phaser.Physics.Arcade.Body).reset(landX, landY);
      player.setAlpha(0);
      this.titanLandingUntil = time + 620;
      this.spawnTitanRock(W / 2, TITAN_MOUTH_Y, landX, landY, 620, 0, 0, 30);
      this.titanEruptionsLeft = 20;
      this.titanEruptionNextAt = time + 700;
      this.shake(900, 0.045);
      this.arena.showFloatingText(W / 2, 240, '🌋 TITAN ERUPTION!', '#ff7733');
    } else {
      player.setAlpha(1);
      player.isInvincible = false;
      player.damageAbsorber = null;
      this.titanLandingUntil = 0;
      this.shake(700, 0.02);
      this.arena.showFloatingText(player.x, player.y - 34, '🗿 TITAN CRUMBLES', '#887755');
    }
  }

  // ── Titan per-frame ─────────────────────────────────────────────────────

  private updateTitan(time: number, delta: number): void {
    const player = this.arena.player;

    if (this.titanActive) {
      // Rooted and untouchable for the whole 20s — reasserted every frame so
      // nothing else (dodge end, a cleanse, a knockback) can chip away at it.
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      player.isInvincible = true;
      player.damageAbsorber = () => true;
      player.setAlpha(0);

      if (time >= this.titanUntil) {
        this.exitTitanForm(time, false);
      } else {
        this.updateTitanArms(time);
        this.drawTitanHead(time);
        this.drawTitanArms(time);
        if (this.titanTimerLabel) {
          this.titanTimerLabel.setText(`🗿 TITAN  ${((this.titanUntil - time) / 1000).toFixed(1)}s`);
        }
      }
    } else if (this.titanLandingUntil > 0) {
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      player.isInvincible = true;
      if (time >= this.titanLandingUntil) {
        this.titanLandingUntil = 0;
        player.isInvincible = false;
        player.damageAbsorber = null;
        player.setAlpha(1);
        // Touchdown: you land as the last piece of the golem to hit the floor.
        this.pfx.impact(player.x, player.y, 84, { shards: 12, dust: 3, depth: 6, duration: 460 });
        this.shake(320, 0.02);
      }
    }

    this.updateTitanWorld(time, delta);
  }

  /** Falling rocks, the tremor rift, the tsunami, the beam, scorched ground and the eruption queue. */
  private updateTitanWorld(time: number, delta: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const dt = delta / 1000;

    // ── Falling rocks (Smash + Tsunami + the eruption launch) ───────────
    for (let i = this.titanRocks.length - 1; i >= 0; i--) {
      const r = this.titanRocks[i];
      const t = Phaser.Math.Clamp((time - r.startAt) / Math.max(1, r.landAt - r.startAt), 0, 1);
      const x = Phaser.Math.Linear(r.sx, r.lx, t);
      const y = Phaser.Math.Linear(r.sy, r.ly, t) - Math.sin(t * Math.PI) * r.peak;
      r.g.setPosition(x, y);
      r.g.setRotation(t * r.spin);
      const sw = Math.max(8, r.size * 2 * (0.3 + 0.7 * t));
      r.shadow.setSize(sw, sw * 0.42);
      r.shadow.setAlpha(0.14 + 0.36 * t);
      if (t >= 1) {
        this.titanRockImpact(r, time);
        r.g.destroy();
        r.shadow.destroy();
        this.titanRocks.splice(i, 1);
      }
    }

    // ── Tremor rift ─────────────────────────────────────────────────────
    if (this.titanTremorLine) {
      const tr = this.titanTremorLine;
      if (time >= tr.expiresAt) {
        tr.g.destroy();
        this.titanTremorLine = null;
      } else {
        this.drawTitanTremor(tr, time);
        for (const t of this.titanTargets()) {
          if (Math.abs(t.x - tr.x) > 26) continue;
          const next = tr.nextHit.get(t) ?? 0;
          if (time < next) continue;
          tr.nextHit.set(t, time + 1000);       // 1s collision cooldown per target
          t.takeDamage(15);
          this.arena.spawnHitFlash(t.x, t.y, EARTH.magma);
          this.arena.showFloatingText(t.x, t.y - 26, '⛰ TREMOR', '#ffaa55');
          this.shake(180, 0.012);
        }
      }
    }

    // ── Tsunami ─────────────────────────────────────────────────────────
    if (this.titanWave) {
      const w = this.titanWave;
      w.x += w.speed * dt;
      this.drawTitanWave(w, time);
      const front = w.x + 78;
      for (const t of this.titanTargets()) {
        if (t.x > front) continue;
        if (!w.hit.has(t)) {
          w.hit.add(t);
          t.takeDamage(25);
          this.arena.spawnHitFlash(t.x, t.y, 0x88ddff);
          this.arena.showFloatingText(t.x, t.y - 26, '🌊 TITAN TSUNAMI', '#88ddff');
        }
        // Shoved along the wall of water.
        const pushX = Math.min(W - TITAN_PAD - 12, front);
        t.setPosition(pushX, t.y);
        const tb = t.body as Phaser.Physics.Arcade.Body | null;
        if (tb) tb.setVelocity(w.speed, tb.velocity.y * 0.4);
      }
      if (!w.slammed && front >= W - 30) {
        w.slammed = true;
        this.shake(520, 0.04);
        for (const t of this.titanTargets()) {
          if (t.x < W - 170) continue;
          t.takeDamage(30);
          t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 700);
          this.arena.spawnHitFlash(t.x, t.y, 0x88ddff);
          this.arena.showFloatingText(t.x, t.y - 40, '💥 SLAMMED INTO THE WALL', '#aaeeff');
          // Crushed against the far wall: the wall itself gives way behind them.
          this.pfx.impact(W - 20, t.y, 96, { shards: 14, dust: 3, crater: false, depth: 20, duration: 480 });
        }
      }
      if (w.x > W + 160) {
        w.g.destroy();
        this.titanWave = null;
        // …and then the sky falls in.
        for (let i = 0; i < 50; i++) {
          const lx = Phaser.Math.Between(TITAN_PAD + 20, W - TITAN_PAD - 20);
          const ly = Phaser.Math.Between(TITAN_PAD + 40, H - TITAN_PAD - 20);
          this.spawnTitanRock(lx + Phaser.Math.Between(-60, 60), -90 - Math.random() * 120, lx, ly,
            TITAN_ROCK_FALL_MS + Phaser.Math.Between(0, 400), 12, 46, 11 + Math.random() * 8);
        }
        this.arena.showFloatingText(W / 2, 250, '☄ THE SKY FALLS', '#ccaa66');
      }
    }

    // ── Beam ────────────────────────────────────────────────────────────
    if (this.titanBeam) {
      const b = this.titanBeam;
      if (time >= b.until) {
        b.g.destroy();
        this.titanBeam = null;
      } else {
        const ptr = this.arena.scene.input.activePointer;
        b.x = Phaser.Math.Clamp(ptr.worldX, 10, W - 10);
        b.y = Phaser.Math.Clamp(ptr.worldY, TITAN_MOUTH_Y + 20, H - TITAN_PAD);
        this.drawTitanBeam(b, time);
        if (time >= b.nextTickAt) {
          b.nextTickAt = time + 200;
          for (const t of this.titanTargets()) {
            if (this.distToSegment(t.x, t.y, W / 2, TITAN_MOUTH_Y, b.x, b.y) > 34) continue;
            t.takeDamage(5);
            this.arena.spawnHitFlash(t.x, t.y, EARTH.magma);
          }
        }
        if (time >= b.nextScorchAt) {
          b.nextScorchAt = time + 110;
          this.spawnTitanScorch(b.x, b.y, 32, time + 7000);
          this.shake(90, 0.004);
        }
      }
    }

    // ── Scorched ground ─────────────────────────────────────────────────
    if (this.titanScorch.length > 0) {
      for (let i = this.titanScorch.length - 1; i >= 0; i--) {
        const s = this.titanScorch[i];
        if (time >= s.expiresAt) { s.sprite.destroy(); this.titanScorch.splice(i, 1); continue; }
        s.sprite.setAlpha(0.36 + 0.16 * Math.sin(time / 160 + s.x));
      }
      this.titanScorchAccum += delta;
      if (this.titanScorchAccum >= 500) {
        this.titanScorchAccum = 0;
        for (const t of this.titanTargets()) {
          const burning = this.titanScorch.some(s => Phaser.Math.Distance.Between(t.x, t.y, s.x, s.y) <= s.r);
          if (!burning) continue;
          t.takeDamage(5);
          this.arena.spawnHitFlash(t.x, t.y, EARTH.ember);
        }
      }
    }

    // ── Eruption carpet (fires after the titan is already gone) ─────────
    if (this.titanEruptionsLeft > 0 && time >= this.titanEruptionNextAt) {
      this.titanEruptionsLeft--;
      this.titanEruptionNextAt = time + 140;
      this.titanExplosion(Phaser.Math.Between(TITAN_PAD + 30, W - TITAN_PAD - 30), Phaser.Math.Between(TITAN_PAD + 40, H - TITAN_PAD - 30), time);
    }
  }

  // ── Titan drawing ───────────────────────────────────────────────────────

  private headPoints(cx: number, cy: number): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    const j = EarthKit.HEAD_JITTER;
    for (let i = 0; i < j.length; i++) {
      const a = (i / j.length) * Math.PI * 2;
      pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * TITAN_HEAD_RX * j[i], cy + Math.sin(a) * TITAN_HEAD_RY * j[i]));
    }
    return pts;
  }

  private drawTitanHead(time: number): void {
    const g = this.titanHeadG;
    if (!g) return;
    const W = this.arena.width;
    g.clear();

    const sway = Math.sin(time / 1100) * 7;
    const cx = W / 2 + sway;
    const cy = TITAN_HEAD_CY + Math.sin(time / 800) * 3;

    // Skull
    const pts = this.headPoints(cx, cy);
    g.fillStyle(this.pcol(EARTH.stone), 1);
    g.fillPoints(pts, true);
    g.lineStyle(5, this.pcol(EARTH.umber), 1);
    g.strokePoints(pts, true);

    // Cheek plates — lighter slabs so the face reads as stacked rock
    g.fillStyle(this.pcol(EARTH.rock), 1);
    g.fillTriangle(cx - 200, cy + 60, cx - 120, cy + 40, cx - 140, cy + 150);
    g.fillTriangle(cx + 200, cy + 60, cx + 120, cy + 40, cx + 140, cy + 150);
    g.fillStyle(this.pcol(EARTH.shale), 1);
    g.fillTriangle(cx - 70, cy + 150, cx + 70, cy + 150, cx, cy + 205);

    // Brow ridge
    g.fillStyle(this.pcol(EARTH.umber), 1);
    g.fillRect(cx - 210, cy + 30, 420, 26);

    // Eyes — molten, pulsing
    const pulse = 0.72 + 0.28 * Math.sin(time / 220);
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 104;
      const ey = cy + 88;
      g.fillStyle(this.pcol(EARTH.crevice), 1);
      g.fillEllipse(ex, ey, 92, 54);
      g.fillStyle(this.pcol(EARTH.ember), pulse);
      g.fillEllipse(ex, ey, 62 * pulse + 12, 32 * pulse + 8);
      g.fillStyle(this.pcol(EARTH.gold), pulse);
      g.fillEllipse(ex, ey, 26 * pulse + 6, 15 * pulse + 4);
      // heavy stone lid
      g.fillStyle(this.pcol(EARTH.stone), 1);
      g.fillTriangle(ex - 54, ey - 30, ex + 54, ey - 30, ex + sx * 20, ey - 6);
    }

    // Jagged mouth with lava between the teeth — kept locked to the beam origin
    // so Titan Beam always fires from between the jaws, sway included.
    const mouthY = TITAN_MOUTH_Y + (cy - TITAN_HEAD_CY);
    g.fillStyle(this.pcol(EARTH.crevice), 1);
    g.fillRect(cx - 130, mouthY - 20, 260, 40);
    g.fillStyle(this.pcol(EARTH.ember), 0.5 + 0.3 * Math.sin(time / 300));
    g.fillRect(cx - 126, mouthY - 8, 252, 16);
    g.fillStyle(this.pcol(EARTH.sand), 1);
    for (let i = 0; i < 7; i++) {
      const tx = cx - 126 + i * 38;
      g.fillTriangle(tx, mouthY - 20, tx + 34, mouthY - 20, tx + 17, mouthY + 8);
      g.fillTriangle(tx + 8, mouthY + 20, tx + 42, mouthY + 20, tx + 25, mouthY - 6);
    }

    // Lava cracks crawling down the face
    g.lineStyle(4, this.pcol(EARTH.ember), 0.55 + 0.25 * Math.sin(time / 260));
    g.beginPath();
    g.moveTo(cx - 168, cy + 20); g.lineTo(cx - 150, cy + 72); g.lineTo(cx - 176, cy + 120); g.lineTo(cx - 152, cy + 168);
    g.moveTo(cx + 172, cy + 34); g.lineTo(cx + 148, cy + 86); g.lineTo(cx + 178, cy + 134);
    g.moveTo(cx + 20, cy + 8); g.lineTo(cx - 6, cy + 54);
    g.strokePath();
  }

  /** One tapered stone limb segment plus its joint cap. */
  private limbSegment(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number): void {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const nx = Math.cos(a + Math.PI / 2);
    const ny = Math.sin(a + Math.PI / 2);
    const quad = [
      new Phaser.Geom.Point(x1 + nx * w1, y1 + ny * w1),
      new Phaser.Geom.Point(x2 + nx * w2, y2 + ny * w2),
      new Phaser.Geom.Point(x2 - nx * w2, y2 - ny * w2),
      new Phaser.Geom.Point(x1 - nx * w1, y1 - ny * w1),
    ];
    g.fillStyle(this.pcol(EARTH.stone), 1);
    g.fillPoints(quad, true);
    g.lineStyle(5, this.pcol(EARTH.umber), 1);
    g.strokePoints(quad, true);
    // Plate seams across the limb
    g.lineStyle(3, this.pcol(EARTH.shale), 0.9);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const px = Phaser.Math.Linear(x1, x2, t);
      const py = Phaser.Math.Linear(y1, y2, t);
      const pw = Phaser.Math.Linear(w1, w2, t) * 0.92;
      g.lineBetween(px + nx * pw, py + ny * pw, px - nx * pw, py - ny * pw);
    }
  }

  private drawTitanArms(time: number): void {
    const g = this.titanArmsG;
    if (!g) return;
    g.clear();

    for (const a of this.titanArms) {
      // Elbow drifts with the fist so the arm bends instead of hinging rigidly.
      const midX = (a.shoulderX + a.fistX) / 2 + a.side * 46;
      const midY = (a.shoulderY + a.fistY) / 2;
      const ex = Phaser.Math.Linear(a.elbowX, midX, 0.55);
      const ey = Phaser.Math.Linear(a.elbowY, midY, 0.55);

      this.limbSegment(g, a.shoulderX, a.shoulderY, ex, ey, 62, 50);
      this.limbSegment(g, ex, ey, a.fistX, a.fistY, 50, 40);

      // Elbow boulder
      g.fillStyle(this.pcol(EARTH.rock), 1);
      g.fillCircle(ex, ey, 54);
      g.lineStyle(5, this.pcol(EARTH.umber), 1);
      g.strokeCircle(ex, ey, 54);

      // Fist: craggy knuckled boulder
      const r = 56;
      const fpts: Phaser.Geom.Point[] = [];
      const j = EarthKit.HEAD_JITTER;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        fpts.push(new Phaser.Geom.Point(a.fistX + Math.cos(ang) * r * j[i], a.fistY + Math.sin(ang) * r * j[(i + 3) % j.length]));
      }
      g.fillStyle(this.pcol(EARTH.rock), 1);
      g.fillPoints(fpts, true);
      g.lineStyle(5, this.pcol(EARTH.umber), 1);
      g.strokePoints(fpts, true);
      g.fillStyle(this.pcol(EARTH.sand), 1);
      for (let k = 0; k < 4; k++) {
        g.fillCircle(a.fistX - 33 + k * 22, a.fistY - 22, 13);
      }
      // Knuckle lava glow while the arm is winding up or striking
      if (a.phase !== 'rest') {
        g.lineStyle(4, this.pcol(EARTH.ember), 0.5 + 0.4 * Math.sin(time / 90));
        g.strokeCircle(a.fistX, a.fistY, r + 6);
      }
      g.lineStyle(4, this.pcol(EARTH.ember), 0.35 + 0.2 * Math.sin(time / 300 + a.side));
      g.lineBetween(a.fistX - 26, a.fistY + 20, a.fistX + 12, a.fistY + 34);
    }
  }

  private drawTitanTremor(tr: TitanTremor, time: number): void {
    const top = TITAN_PAD;
    const bot = this.arena.height - TITAN_PAD;
    const g = tr.g;
    g.clear();
    const flicker = 0.55 + 0.25 * Math.sin(time / 180);
    const seam = (y: number) => tr.x + Math.sin((y + time / 6) / 55) * 13;

    // Wide dark rift…
    g.fillStyle(this.pcol(EARTH.crevice), 0.85);
    g.fillRect(tr.x - 24, top, 48, bot - top);
    // …with a jagged molten seam down the middle.
    for (const [w, c, a] of [[10, this.pcol(EARTH.ember), flicker], [4, this.pcol(EARTH.gold), flicker * 0.9]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(tr.x, top);
      for (let y = top; y <= bot; y += 40) g.lineTo(seam(y), y);
      g.lineTo(seam(bot), bot);
      g.strokePath();
    }
    // Broken slabs along both lips
    g.fillStyle(this.pcol(EARTH.shale), 1);
    for (let y = top + 10; y < bot - 30; y += 66) {
      g.fillRect(tr.x - 34, y, 14, 30);
      g.fillRect(tr.x + 20, Math.min(y + 30, bot - 30), 14, 30);
    }
  }

  /**
   * The tsunami wall: a slab of water with a churning foam crest at its leading edge, plus
   * spray blown off the top. A plain rectangle read as a UI wipe rather than as water.
   */
  private drawTitanWave(w: TitanWave, time: number): void {
    const top = TITAN_PAD;
    const bot = this.arena.height - TITAN_PAD;
    const g = w.g;
    g.clear();
    const t = time / 1000;

    // Body: deep water behind, lighter toward the front.
    g.fillStyle(0x1d4f6b, 0.68);
    g.fillRect(w.x - 200, top, 260, bot - top);
    g.fillStyle(0x2f7d9e, 0.72);
    g.fillRect(w.x - 100, top, 170, bot - top);

    // Crest: a boiling column of foam lobes at the leading edge, so the front churns.
    for (let y = top; y <= bot; y += 22) {
      const bulge = Math.sin(y / 40 + t * 6) * 11 + Math.sin(y / 17 - t * 9) * 5;
      g.fillStyle(0xcdf3ff, 0.5);
      g.fillCircle(w.x + 66 + bulge, y, 17);
      g.fillStyle(0x88ddff, 0.65);
      g.fillCircle(w.x + 54 + bulge * 0.7, y + 8, 13);
      g.fillStyle(0xffffff, 0.42);
      g.fillCircle(w.x + 72 + bulge, y - 5, 7);
    }

    // Spray thrown ahead of the front.
    for (let i = 0; i < 16; i++) {
      const y = top + ((i * 97 + Math.floor(t * 220)) % (bot - top));
      const lead = ((i * 53 + Math.floor(t * 300)) % 60);
      g.fillStyle(0xcdf3ff, 0.5 * (1 - lead / 60));
      g.fillCircle(w.x + 78 + lead, y, 4 - lead / 22);
    }

    // Undertow streaks raking backward through the body.
    g.lineStyle(3, 0x88ddff, 0.3);
    for (let i = 0; i < 7; i++) {
      const y = top + ((i / 7) * (bot - top)) + Math.sin(t * 3 + i) * 14;
      g.lineBetween(w.x - 190, y, w.x + 40, y + 10);
    }
  }

  private drawTitanBeam(b: TitanBeam, time: number): void {
    const W = this.arena.width;
    const g = b.g;
    g.clear();
    const ox = W / 2;
    const oy = TITAN_MOUTH_Y;
    const jitter = Math.sin(time / 40) * 3;

    g.lineStyle(46 + jitter, this.pcol(EARTH.crevice), 0.35);
    g.lineBetween(ox, oy, b.x, b.y);
    g.lineStyle(26 + jitter, this.pcol(EARTH.ember), 0.75);
    g.lineBetween(ox, oy, b.x, b.y);
    g.lineStyle(10, this.pcol(EARTH.gold), 0.95);
    g.lineBetween(ox, oy, b.x, b.y);

    // Molten pool where it lands
    g.fillStyle(this.pcol(EARTH.ember), 0.5 + 0.2 * Math.sin(time / 100));
    g.fillCircle(b.x, b.y, 30 + Math.sin(time / 90) * 4);
    g.fillStyle(this.pcol(EARTH.gold), 0.8);
    g.fillCircle(b.x, b.y, 14);

    // Sparks kicking off the impact point
    g.lineStyle(3, this.pcol(EARTH.gold), 0.8);
    for (let i = 0; i < 5; i++) {
      const a = (time / 120) + (i / 5) * Math.PI * 2;
      const len = 20 + ((i * 37 + Math.floor(time / 60)) % 22);
      g.lineBetween(b.x, b.y, b.x + Math.cos(a) * len, b.y + Math.sin(a) * len);
    }
  }

  // ── Titan attacks ───────────────────────────────────────────────────────

  private updateTitanArms(time: number): void {
    for (const a of this.titanArms) {
      if (a.phase === 'rest') {
        a.fistX = a.restX + Math.sin(time / 780 + a.side) * 5;
        a.fistY = a.restY + Math.sin(time / 560 + a.side) * 7;
        continue;
      }
      const span = Math.max(1, a.phaseEnd - a.phaseStart);
      const t = Phaser.Math.Clamp((time - a.phaseStart) / span, 0, 1);
      const e = a.phase === 'strike' ? t * t : 1 - (1 - t) * (1 - t);
      a.fistX = Phaser.Math.Linear(a.fromX, a.toX, e);
      a.fistY = Phaser.Math.Linear(a.fromY, a.toY, e);
      if (a.marker) EarthFx.drawSmashMarker(a.marker, this.pcol, a.targetX, a.targetY, 74, time);
      if (t >= 1) {
        if (a.phase === 'raise') {
          a.phase = 'strike';
          a.phaseStart = time; a.phaseEnd = time + 110;
          a.fromX = a.fistX; a.fromY = a.fistY;
          a.toX = a.targetX; a.toY = a.targetY;
        } else if (a.phase === 'strike') {
          this.titanSmashImpact(a, time);
          a.phase = 'recover';
          a.phaseStart = time; a.phaseEnd = time + 480;
          a.fromX = a.fistX; a.fromY = a.fistY;
          a.toX = a.restX; a.toY = a.restY;
        } else {
          a.phase = 'rest';
        }
      }
    }
  }

  /** Click — Titan Smash: bring a hand down on the cursor. */
  private titanSmash(time: number, mx: number, my: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    const preferred = mx < W / 2 ? -1 : 1;
    const arm = this.titanArms.find(a => a.side === preferred && a.phase === 'rest')
      ?? this.titanArms.find(a => a.phase === 'rest');
    if (!arm) return;

    const tx = Phaser.Math.Clamp(mx, TITAN_PAD + 20, W - TITAN_PAD - 20);
    const ty = Phaser.Math.Clamp(my, TITAN_PAD + 40, H - TITAN_PAD - 20);
    arm.targetX = tx;
    arm.targetY = ty;
    arm.phase = 'raise';
    arm.phaseStart = time;
    arm.phaseEnd = time + 200;
    arm.fromX = arm.fistX; arm.fromY = arm.fistY;
    arm.toX = tx; arm.toY = ty - 250;

    arm.marker?.destroy();
    arm.marker = this.arena.scene.add.graphics().setDepth(4);
    this.titanSmashCdUntil = time + TITAN_SMASH_CD_MS;
    this.shake(160, 0.008);
  }

  private titanSmashImpact(arm: TitanArm, time: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    arm.marker?.destroy();
    arm.marker = null;

    this.shake(430, 0.032);
    let hit = false;
    for (const t of this.titanTargets()) {
      if (Phaser.Math.Distance.Between(arm.targetX, arm.targetY, t.x, t.y) > 96) continue;
      t.takeDamage(20);
      this.arena.spawnHitFlash(t.x, t.y, EARTH.stone);
      hit = true;
    }
    this.arena.showFloatingText(arm.targetX, arm.targetY - 40, hit ? '🖐 TITAN SMASH' : '🖐 SMASH', '#ccaa66');

    // A hand the size of a car landing on the arena floor.
    this.pfx.impact(arm.targetX, arm.targetY, 130, {
      shards: 18, dust: 6, depth: 5, duration: 560,
    });

    // Three chunks of arena kicked into the air; they come back down 2s later.
    for (let i = 0; i < 3; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 150;
      const lx = Phaser.Math.Clamp(arm.targetX + Math.cos(ang) * dist, TITAN_PAD + 20, W - TITAN_PAD - 20);
      const ly = Phaser.Math.Clamp(arm.targetY + Math.sin(ang) * dist, TITAN_PAD + 40, H - TITAN_PAD - 20);
      this.spawnTitanRock(arm.targetX, arm.targetY, lx, ly, TITAN_ROCK_FALL_MS, 10, 46, 13 + Math.random() * 7);
    }
    void time;
  }

  /** E — Titan Tremor: a rift splitting the arena vertically at the cursor. */
  private titanTremorCast(time: number, mx: number): void {
    const W = this.arena.width;
    if (this.titanTremorLine) this.titanTremorLine.g.destroy();
    this.titanTremorLine = {
      x: Phaser.Math.Clamp(mx, 40, W - 40),
      expiresAt: time + TITAN_TREMOR_MS,
      g: this.arena.scene.add.graphics().setDepth(4),
      nextHit: new Map<Fighter, number>(),
    };
    this.titanTremorCdUntil = time + TITAN_TREMOR_CD_MS;
    this.shake(700, 0.03);
    this.arena.showFloatingText(this.titanTremorLine.x, 250, '⛰ TITAN TREMOR', '#ffaa55');
  }

  /** R — Titan Tsunami: a wall of water sweeps the arena and pins the enemy to the far wall. */
  private titanTsunamiCast(time: number): void {
    if (this.titanWave) this.titanWave.g.destroy();
    this.titanWave = {
      x: -110, speed: 720,
      g: this.arena.scene.add.graphics().setDepth(18),
      hit: new Set<Fighter>(), slammed: false,
    };
    this.titanTsunamiCdUntil = time + TITAN_TSUNAMI_CD_MS;
    this.shake(1600, 0.016);
    this.arena.showFloatingText(this.arena.width / 2, 250, '🌊 TITAN TSUNAMI!', '#88ddff');
  }

  /** F — Titan Beam: a 5s molten beam that scorches everything it is dragged across. */
  private titanBeamCast(time: number, mx: number, my: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    if (this.titanBeam) this.titanBeam.g.destroy();
    this.titanBeam = {
      until: time + TITAN_BEAM_MS,
      x: Phaser.Math.Clamp(mx, 10, W - 10),
      y: Phaser.Math.Clamp(my, TITAN_MOUTH_Y + 20, H - TITAN_PAD),
      nextTickAt: time,
      nextScorchAt: time,
      g: this.arena.scene.add.graphics().setDepth(28),
    };
    this.titanBeamCdUntil = time + TITAN_BEAM_CD_MS;
    this.shake(400, 0.02);
    this.arena.showFloatingText(W / 2, 250, '☀ TITAN BEAM', '#ffbb55');
  }

  // ── Titan shared effects ────────────────────────────────────────────────

  private spawnTitanRock(sx: number, sy: number, lx: number, ly: number, flightMs: number, dmg: number, radius: number, size: number): void {
    const scene = this.arena.scene;
    const g = scene.add.graphics().setDepth(17);
    // Craggy chunk drawn once around its own origin, then flown as a whole. Rocks torn off a
    // titan carry its heat, so these get the molten variant.
    EarthFx.drawRock(g, this.pcol, size, Math.random(), true);
    g.setPosition(sx, sy);

    const shadow = scene.add.ellipse(lx, ly, 10, 4, 0x000000, 0.2).setDepth(3);
    this.titanRocks.push({
      g, shadow, sx, sy, lx, ly,
      startAt: this.arena.scene.time.now,
      landAt: this.arena.scene.time.now + flightMs,
      // Rocks kicked up off the ground arc high; ones already falling out of the
      // sky just come straight down (an arc would park them off-screen).
      peak: sy < 0 ? 0 : 160 + Math.random() * 90,
      spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4),
      size, dmg, radius,
    });
  }

  private titanRockImpact(r: TitanRock, time: number): void {
    void time;
    // Even a harmless rock breaks when it lands — no rock in this game just disappears.
    this.pfx.impact(r.lx, r.ly, r.dmg > 0 ? 64 : 34, {
      shards: r.dmg > 0 ? 9 : 5, dust: r.dmg > 0 ? 2 : 1,
      crater: r.dmg > 0, depth: 5, duration: r.dmg > 0 ? 380 : 280,
    });
    if (r.dmg <= 0) return;
    this.shake(170, 0.012);
    for (const t of this.titanTargets()) {
      if (Phaser.Math.Distance.Between(r.lx, r.ly, t.x, t.y) > r.radius) continue;
      t.takeDamage(r.dmg);
      this.arena.spawnHitFlash(t.x, t.y, EARTH.sand);
      this.arena.showFloatingText(t.x, t.y - 26, '🪨 ROCKFALL', '#ccaa66');
    }
  }

  /** A patch of ground cooked to slag: crusted plates over a glowing seam network. */
  private spawnTitanScorch(x: number, y: number, r: number, expiresAt: number): void {
    const sprite = this.arena.scene.add.graphics().setDepth(3);
    sprite.fillStyle(this.pcol(EARTH.crevice), 0.55);
    sprite.fillCircle(x, y, r);
    sprite.fillStyle(this.pcol(EARTH.ember), 0.5);
    sprite.fillCircle(x, y, r * 0.78);
    // Cooling crust floating on it, with molten cracks showing between the plates.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random();
      const d = r * (0.15 + Math.random() * 0.5);
      sprite.fillStyle(this.pcol(EARTH.umber), 0.85);
      stoneChunkLayered(sprite, this.pcol,
        x + Math.cos(a) * d, y + Math.sin(a) * d, a, r * 0.4, r * 0.2, 0.9, i * 0.6);
    }
    sprite.lineStyle(3, this.pcol(EARTH.gold), 0.8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      sprite.lineBetween(x, y, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    }
    this.titanScorch.push({ sprite, x, y, r, expiresAt });
    // Cap the ground clutter so a long beam + a full eruption can't pile up forever.
    while (this.titanScorch.length > 90) {
      const old = this.titanScorch.shift();
      old?.sprite.destroy();
    }
  }

  private titanExplosion(x: number, y: number, time: number): void {
    this.shake(220, 0.022);
    // The full molten detonation stack, plus a spire of magma punched through the floor.
    this.pfx.impact(x, y, 92, { shards: 13, dust: 3, molten: true, crater: false, depth: 7, duration: 440 });
    this.pfx.pillar(x, y, 20, 58, 8);
    for (const t of this.titanTargets()) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > 76) continue;
      t.takeDamage(20);
      this.arena.spawnHitFlash(t.x, t.y, EARTH.magma);
      this.arena.showFloatingText(t.x, t.y - 30, '🌋 ERUPTION', '#ff9955');
    }
    this.spawnTitanScorch(x, y, 46, time + 9000);
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
    return Phaser.Math.Distance.Between(px, py, x1 + dx * t, y1 + dy * t);
  }

  /**
   * Quake perk (Gravity and friends): a ridge of upheaved ground rolling away from an impact.
   * Public — called from non-earth perk code elsewhere in ArenaScene, which is why the ridge
   * is painted in the perk's violet rather than out of the EARTH palette.
   */
  spawnQuakeWave(owner: 'player' | 'npc', impactX: number, impactY: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    // Push outward from impact toward either horizontal or vertical edge
    const horizontal = Math.random() < 0.5;
    let vx = 0, vy = 0;
    const speed = 300;
    if (horizontal) { vx = impactX < W / 2 ? speed : -speed; }
    else             { vy = impactY < H / 2 ? speed : -speed; }

    // Drawn once around its own origin as a line of tilted slabs, then translated.
    const violet: EarthColorFn = (base) => (base === EARTH.stone ? 0x8844cc
      : base === EARTH.sand ? 0xcc88ff
      : base === EARTH.umber ? 0x3a1a55
      : base === EARTH.dust ? 0xe0b8ff : base);
    const g = this.arena.scene.add.graphics().setDepth(5);
    const along = horizontal ? Math.PI / 2 : 0;      // the ridge lies across its travel
    for (let i = -3; i <= 3; i++) {
      const f = i / 3;
      const ox = Math.cos(along) * i * 22;
      const oy = Math.sin(along) * i * 22;
      stoneChunkLayered(g, violet, ox, oy, Math.atan2(vy, vx),
        30 + (1 - Math.abs(f)) * 22, 11 + (1 - Math.abs(f)) * 5, 0.85, i * 0.7);
    }
    g.setPosition(impactX, impactY);

    this.earthTsunamiWaves.push({ sprite: g, vx, vy, expiresAt: this.arena.scene.time.now + 3000, owner });
    this.arena.showFloatingText(impactX, impactY - 20, '🌊 QUAKE', '#cc88ff');
  }

  // ── Shield helpers ──────────────────────────────────────────────────────

  private spawnEarthShield(isPlayer: boolean): void {
    const player = this.arena.player;
    const npc = this.arena.npc;
    const scene = this.arena.scene;
    const hasDual = isPlayer && this.arena.hasUpgrade('click');
    // With Click+: base HP = 50 each, enhanced = 100 each; color = gray
    // Without upgrade: base HP = 75, enhanced = 125; color = brown
    if (isPlayer) {
      // Erosion (divine): whatever the plates would have carried is poured into one belt, so
      // Double Shield hands over both plates' worth rather than one plate and a spare.
      const erosion = this.arena.hasPerk('player', 'erosion');
      const plate = this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50);
      const hp = hasDual
        ? (erosion ? plate * 2 : plate)
        : this.earthShieldMaxHp;
      this.earthShieldHp = hp;
      if (!hasDual || erosion) this.earthShieldMaxHp = hp;
      this.earthShieldBroken = false;
      this.earthShieldRespawnAt = 0;
      if (erosion) {
        this.spawnErosionAura();
      } else {
      if (this.earthShieldSprite) this.earthShieldSprite.destroy();
      this.earthShieldSprite = new StoneShield(scene, this.pcol, {
        steel: hasDual, enhanced: this.earthShieldEnhanced, depth: 7,
      });
      }
      if (erosion) {
        // The belt is torn up off the floor all the way round instead of hauled up in front.
        this.pfx.dust(player.x, player.y, 7, 54, 4);
        this.pfx.ring(player.x, player.y, 8, 58, EARTH.sand, 380, 4, 6);
      } else {
      // Hauled up out of the ground in front of you rather than blinking into existence.
      this.pfx.pillar(
        player.x + Math.cos(this.earthShieldAngle) * 28,
        player.y + Math.sin(this.earthShieldAngle) * 28, 14, 30, 8,
      );
      this.pfx.ring(player.x, player.y, 10, 46, EARTH.dust, 340, 3, 6);
      }
      if (!this.earthShieldLabel) {
        this.earthShieldLabel = scene.add.text(player.x, player.y - 30, '', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: erosion ? '#ddbb77' : (hasDual ? '#bbbbbb' : '#ccaa66'),
        }).setOrigin(0.5).setDepth(11);
      }
      // Also spawn back shield if Click+ — Erosion already banked that plate into the belt.
      if (hasDual && !erosion) {
        this.spawnEarthBackShield();
      }
      // Wire shield as damage absorber — directional: front blocks frontal hits, back blocks rear hits.
      // Erosion covers every side, so it never asks where the hit came from.
      player.damageAbsorber = (amount: number) => {
        if (erosion) {
          if (this.earthShieldHp <= 0) return false;
          const absorbed = Math.min(this.earthShieldHp, amount);
          this.earthShieldHp -= absorbed;
          this.arena.recordMasteryStat('shieldBlocked', absorbed);
          if (this.earthShieldHp <= 0) this.breakEarthShield(true);
          const remaining = amount - absorbed;
          if (remaining > 0) {
            player.hp = Math.max(0, player.hp - remaining);
            if (player.hp <= 0) player.emit('defeated');
          }
          return true;
        }
        // Determine if hit comes from front (NPC in front of player relative to shield facing)
        const angleToNpc = Math.atan2(npc.y - player.y, npc.x - player.x);
        const angDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
          Phaser.Math.RadToDeg(angleToNpc),
          Phaser.Math.RadToDeg(this.earthShieldAngle)
        ));
        const fromFront = angDiff < 90;

        if (fromFront && this.earthShieldHp > 0) {
          // Front shield absorbs frontal hit
          const absorbed = Math.min(this.earthShieldHp, amount);
          this.earthShieldHp -= absorbed;
          this.arena.recordMasteryStat('shieldBlocked', absorbed);
          if (this.earthShieldHp <= 0) this.breakEarthShield(true);
          const remaining = amount - absorbed;
          if (remaining > 0) {
            player.hp = Math.max(0, player.hp - remaining);
            if (player.hp <= 0) player.emit('defeated');
          }
          return true;
        } else if (!fromFront && hasDual && this.earthBackShieldHp > 0) {
          // Back shield absorbs rear hit
          const absorbed = Math.min(this.earthBackShieldHp, amount);
          this.earthBackShieldHp -= absorbed;
          this.arena.recordMasteryStat('shieldBlocked', absorbed);
          if (this.earthBackShieldHp <= 0) {
            if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
            if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
          }
          const remaining = amount - absorbed;
          if (remaining > 0) {
            player.hp = Math.max(0, player.hp - remaining);
            if (player.hp <= 0) player.emit('defeated');
          }
          return true;
        }
        return false;
      };
    } else {
      const hp = this.npcEarthShieldMaxHp;
      this.npcEarthShieldHp = hp;
      this.npcEarthShieldBroken = false;
      this.npcEarthShieldRespawnAt = 0;
      if (this.npcEarthShieldSprite) this.npcEarthShieldSprite.destroy();
      this.npcEarthShieldSprite = new StoneShield(scene, this.ncol, {
        enhanced: this.npcEarthShieldEnhanced, depth: 7,
      });
      this.nfx.pillar(
        npc.x + Math.cos(this.npcEarthShieldAngle) * 28,
        npc.y + Math.sin(this.npcEarthShieldAngle) * 28, 14, 30, 8,
      );
      this.nfx.ring(npc.x, npc.y, 10, 46, EARTH.dust, 340, 3, 6);
      if (!this.npcEarthShieldLabel) {
        this.npcEarthShieldLabel = scene.add.text(npc.x, npc.y - 30, '', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ccaa66',
        }).setOrigin(0.5).setDepth(11);
      }
      // Wire NPC shield as damage absorber
      npc.damageAbsorber = (amount: number) => {
        if (this.npcEarthShieldHp <= 0) return false;
        const absorbed = Math.min(this.npcEarthShieldHp, amount);
        this.npcEarthShieldHp -= absorbed;
        if (this.npcEarthShieldHp <= 0) this.breakEarthShield(false);
        const remaining = amount - absorbed;
        if (remaining > 0) {
          npc.hp = Math.max(0, npc.hp - remaining);
          if (npc.hp <= 0) npc.emit('defeated');
        }
        return true;
      };
    }
  }

  /** Erosion: (re)builds the belt. One aura only — a rebuild replaces whatever was left. */
  private spawnErosionAura(): void {
    if (this.erosionAura) this.erosionAura.destroy();
    this.erosionAura = new ErosionAura(this.arena.scene, this.pcol, 44, 7);
    this.erosionAura.setPose(this.arena.player.x, this.arena.player.y);
  }

  /** True while the player's shield — plate or belt — is standing. */
  private playerShieldBuilt(): boolean {
    return this.earthShieldSprite !== null || this.erosionAura !== null;
  }

  private spawnEarthBackShield(): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    if (this.earthBackShieldSprite) this.earthBackShieldSprite.destroy();
    const maxHp = this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50);
    this.earthBackShieldMaxHp = maxHp;
    if (this.earthBackShieldHp <= 0) this.earthBackShieldHp = maxHp;
    this.earthBackShieldSprite = new StoneShield(scene, this.pcol, {
      steel: true, enhanced: this.earthShieldEnhanced, depth: 6,
    });
    if (!this.earthBackShieldLabel) {
      this.earthBackShieldLabel = scene.add.text(player.x, player.y - 30, '', {
        fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(10);
    }
  }

  private breakEarthShield(isPlayer: boolean): void {
    const player = this.arena.player;
    const npc = this.arena.npc;
    const scene = this.arena.scene;
    const hasDual = isPlayer && this.arena.hasUpgrade('click');
    const respawnAt = scene.time.now + (this.earthSplinterRepairFast ? 4000 : 8000);
    if (isPlayer) { this.earthSplinterRepairFast = false; }
    if (isPlayer) {
      if (hasDual && this.earthBackShieldHp > 0) {
        // Back shield replaces front shield
        this.earthShieldHp = this.earthBackShieldHp;
        this.earthBackShieldHp = 0;
        if (this.earthShieldSprite) {
          this.earthShieldSprite.shatter(this.pfx);
          this.earthShieldSprite.destroy();
          this.earthShieldSprite = null;
        }
        if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
        if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
        // The plate off your back swings round into the gap.
        this.earthShieldSprite = new StoneShield(scene, this.pcol, {
          steel: true, enhanced: this.earthShieldEnhanced, depth: 7,
        });
        this.earthShieldBroken = false;
        this.earthShieldRespawnAt = 0;
        this.pfx.ring(player.x, player.y, 34, 12, EARTH.chrome, 320, 4, 8);
        this.arena.showFloatingText(player.x, player.y - 30, '🛡 BACK SHIELD ACTIVATED', '#aaaaaa');
        return;
      }
      this.earthShieldHp = 0;
      this.earthShieldBroken = true;
      this.earthShieldRespawnAt = respawnAt;
      if (this.earthShieldSprite) {
        this.earthShieldSprite.shatter(this.pfx);
        this.earthShieldSprite.destroy();
        this.earthShieldSprite = null;
      }
      if (this.erosionAura) {
        this.erosionAura.shatter(this.pfx);
        this.erosionAura.destroy();
        this.erosionAura = null;
      }
      this.arena.scene.cameras.main.shake(200, 0.01);
      player.damageAbsorber = null;
      this.arena.showFloatingText(
        player.x, player.y - 30,
        this.arena.hasPerk('player', 'erosion') ? '💥 AURA SCATTERED' : '💥 SHIELD BROKEN', '#ff8844',
      );
    } else {
      this.npcEarthShieldHp = 0;
      this.npcEarthShieldBroken = true;
      this.npcEarthShieldRespawnAt = respawnAt;
      if (this.npcEarthShieldSprite) {
        this.npcEarthShieldSprite.shatter(this.nfx);
        this.npcEarthShieldSprite.destroy();
        this.npcEarthShieldSprite = null;
      }
      npc.damageAbsorber = null;
      this.arena.showFloatingText(npc.x, npc.y - 30, '💥 SHIELD BROKEN', '#ff8844');
    }
  }

  private updateEarthShieldSpritePosition(isPlayer: boolean, delta: number): void {
    // Erosion: the belt rides the player rather than standing off at an angle, and it takes
    // the splinter wind-up straight from the hold instead of through a plate.
    if (isPlayer && this.erosionAura) {
      const p = this.arena.player;
      const time = this.arena.scene.time.now;
      const maxHp = Math.max(1, this.earthShieldMaxHp);
      this.erosionAura.setPose(p.x, p.y);
      this.erosionAura.setHp(this.earthShieldHp / maxHp);
      this.erosionAura.setSplinter(
        this.earthSplinterHolding
          ? (this.earthSplinterReady ? 1 : Phaser.Math.Clamp((time - this.earthSplinterHoldStart) / 2000, 0, 1) * 0.7)
          : 0,
      );
      this.erosionAura.update(delta, p.forceInvisible ? 0 : p.alpha);
      if (this.earthShieldLabel) {
        this.earthShieldLabel.setPosition(p.x, p.y - 44);
        this.earthShieldLabel.setText(`🪨${Math.floor(this.earthShieldHp)}/${maxHp}`);
      }
      return;
    }
    const fighter = isPlayer ? this.arena.player : this.arena.npc;
    const sprite = isPlayer ? this.earthShieldSprite : this.npcEarthShieldSprite;
    const label = isPlayer ? this.earthShieldLabel : this.npcEarthShieldLabel;
    const hp = isPlayer ? this.earthShieldHp : this.npcEarthShieldHp;
    const maxHp = isPlayer && this.arena.hasUpgrade('click')
      ? (this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50))
      : (isPlayer ? this.earthShieldMaxHp : this.npcEarthShieldMaxHp);
    const ang = isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle;
    if (sprite) {
      const shieldDist = 28;
      sprite.setPose(fighter.x + Math.cos(ang) * shieldDist, fighter.y + Math.sin(ang) * shieldDist, ang);
      sprite.setHp(maxHp > 0 ? hp / maxHp : 0);
      if (isPlayer) sprite.setCharge(this.earthBashCharging ? this.earthBashChargeRatio : 0);
      sprite.update(delta);
    }
    if (label) {
      label.setPosition(fighter.x + Math.cos(ang) * 36, fighter.y + Math.sin(ang) * 36 - 16);
      label.setText(`🛡${Math.floor(hp)}/${maxHp}`);
    }
    // Back shield (Click+ only)
    if (isPlayer && this.earthBackShieldSprite && this.earthBackShieldHp > 0) {
      const backAng = ang + Math.PI;
      const backDist = 28;
      const bMaxHp = this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50);
      this.earthBackShieldSprite.setPose(
        fighter.x + Math.cos(backAng) * backDist,
        fighter.y + Math.sin(backAng) * backDist,
        backAng,
      );
      this.earthBackShieldSprite.setHp(this.earthBackShieldHp / bMaxHp);
      this.earthBackShieldSprite.update(delta);
      if (this.earthBackShieldLabel) {
        this.earthBackShieldLabel.setPosition(
          fighter.x + Math.cos(backAng) * 36,
          fighter.y + Math.sin(backAng) * 36 - 14,
        );
        this.earthBackShieldLabel.setText(`🛡${Math.floor(this.earthBackShieldHp)}/${bMaxHp}`);
      }
    }
  }

  /** Returns true if a hit with the given incoming angle is blocked by the shield. */
  private earthShieldBlocks(isPlayer: boolean, fromX: number, fromY: number): boolean {
    const fighter = isPlayer ? this.arena.player : this.arena.npc;
    const hp = isPlayer ? this.earthShieldHp : this.npcEarthShieldHp;
    const ang = isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle;
    if (hp <= 0) return false;
    // Erosion covers every side, so anything the belt is still standing for counts as blocked.
    if (isPlayer && this.erosionAura) return true;
    const incomingAng = Math.atan2(fromY - fighter.y, fromX - fighter.x);
    const diff = Phaser.Math.Angle.Wrap(incomingAng - ang);
    return Math.abs(diff) < Math.PI * (60 / 180);
  }

  private earthAbsorbShieldDamage(isPlayer: boolean, amount: number, fromX: number, fromY: number): number {
    if (!this.earthShieldBlocks(isPlayer, fromX, fromY)) return amount;
    if (isPlayer) {
      const absorbed = Math.min(this.earthShieldHp, amount);
      this.earthShieldHp -= absorbed;
      if (this.earthShieldHp <= 0) this.breakEarthShield(true);
      return amount - absorbed;
    } else {
      const absorbed = Math.min(this.npcEarthShieldHp, amount);
      this.npcEarthShieldHp -= absorbed;
      if (this.npcEarthShieldHp <= 0) this.breakEarthShield(false);
      return amount - absorbed;
    }
  }

  // ── Rocks / bash / golem helpers ────────────────────────────────────────

  private spawnEarthRock(isPlayer: boolean, _angle: number): void {
    const lava = isPlayer && this.arena.hasUpgrade('r');
    // Painted once around its own origin, then flown and tumbled as a whole.
    const g = this.arena.scene.add.graphics().setDepth(8);
    EarthFx.drawRock(g, isPlayer ? this.pcol : this.ncol, 9, Math.random(), lava);
    const rock = { sprite: g, hitCdUntil: 0 };
    if (isPlayer) this.earthRocks.push(rock); else this.npcEarthRocks.push(rock);
  }

  private launchEarthRock(isPlayer: boolean, idx: number): void {
    const rocks = isPlayer ? this.earthRocks : this.npcEarthRocks;
    const launched = isPlayer ? this.earthLaunchedRocks : this.npcEarthLaunchedRocks;
    const fighter = isPlayer ? this.arena.player : this.arena.npc;
    const ang = isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle;
    const rock = rocks[idx];
    if (!rock) return;
    const lava = isPlayer && this.arena.hasUpgrade('r');
    const speed = 500;
    launched.push({
      sprite: rock.sprite, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      spawnedAt: this.arena.scene.time.now, trailAccum: 0,
    });
    if (isPlayer) this.earthRocks.splice(idx, 1); else this.npcEarthRocks.splice(idx, 1);
    // The shield slamming into the rock: recoil out of the muzzle, and an arm to match.
    const fx = isPlayer ? this.pfx : this.nfx;
    fx.muzzleRubble(rock.sprite.x, rock.sprite.y, ang, lava ? 1.25 : 1, 8, lava);
    if (isPlayer) this.playPlayerGesture('punch', ang);
    else this.npcAvatar?.play('punch', ang);
    if (lava) {
      this.arena.showFloatingText(fighter.x, fighter.y - 30, '🔥 LAVA LAUNCH!', '#ff8844');
    } else {
      this.arena.showFloatingText(fighter.x, fighter.y - 30, '🪨 LAUNCH!', '#ccaa66');
    }
  }

  /**
   * Executes a bash dash. `chargeRatio` (0–1) scales dash speed/duration and hit damage;
   * a full-charge (>=0.95) hit also applies a 700ms stun. Ratio 0 reproduces the original
   * instant-bash baseline values, so a quick tap still works like before.
   */
  private performEarthBash(isPlayer: boolean, mouseX: number, mouseY: number, chargeRatio: number): void {
    const fighter = isPlayer ? this.arena.player : this.arena.npc;
    const targetX = isPlayer ? mouseX : this.arena.player.x;
    const targetY = isPlayer ? mouseY : this.arena.player.y;
    const dx = targetX - fighter.x;
    const dy = targetY - fighter.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / len;
    const ndy = dy / len;

    const ratio = Phaser.Math.Clamp(chargeRatio, 0, 1);
    const dashSpeed = 550 + (800 - 550) * ratio;
    const dashDurationMs = 200 + (320 - 200) * ratio;
    const shieldDmg = Math.round(30 + (45 - 30) * ratio);
    const stabDmg = Math.round(15 + (30 - 15) * ratio);
    const fullCharge = ratio >= 0.95;

    if (isPlayer) {
      this.earthBashActive = true;
      this.earthBashEnd = this.arena.scene.time.now + dashDurationMs;
      this.earthBashDirX = ndx;
      this.earthBashDirY = ndy;
      this.earthBashHitDealt = false;
      this.earthBashStartX = fighter.x;
      this.earthBashStartY = fighter.y;
      this.earthBashShieldDmg = shieldDmg;
      this.earthBashStabDmg = stabDmg;
      this.earthBashFullCharge = fullCharge;
      (fighter.body as Phaser.Physics.Arcade.Body).setVelocity(ndx * dashSpeed, ndy * dashSpeed);
      this.arena.isDodging = true;
      this.setPlayerHold(null);
      this.playPlayerGesture('dash', Math.atan2(ndy, ndx));
      this.pfx.debris(fighter.x, fighter.y, 5 + Math.round(ratio * 6), {
        angle: Math.atan2(-ndy, -ndx), spread: 0.8, speed: 130 + ratio * 130,
        size: 3.4, life: 480, fall: 90, depth: 6,
      });
      if (fullCharge) this.pfx.ring(fighter.x, fighter.y, 10, 56, EARTH.gold, 340, 4, 6);
    } else {
      this.npcEarthBashActive = true;
      this.npcEarthBashEnd = this.arena.scene.time.now + dashDurationMs;
      this.npcEarthBashDirX = ndx;
      this.npcEarthBashDirY = ndy;
      this.npcEarthBashHitDealt = false;
      this.npcEarthBashStartX = fighter.x;
      this.npcEarthBashStartY = fighter.y;
      this.npcEarthBashShieldDmg = shieldDmg;
      this.npcEarthBashStabDmg = stabDmg;
      this.npcEarthBashFullCharge = fullCharge;
      (fighter.body as Phaser.Physics.Arcade.Body).setVelocity(ndx * dashSpeed, ndy * dashSpeed);
      this.nfx.debris(fighter.x, fighter.y, 5 + Math.round(ratio * 6), {
        angle: Math.atan2(-ndy, -ndx), spread: 0.8, speed: 130 + ratio * 130,
        size: 3.4, life: 480, fall: 90, depth: 6,
      });
    }
  }

  /** Public: also triggered by Subterfuge's Dark Treachery (earth-Q copy — the
   * summoner keeps attacking normally since Subterfuge has no golem input takeover). */
  spawnEarthGolem(isPlayer: boolean): void {
    const player = this.arena.player;
    const npc = this.arena.npc;
    const scene = this.arena.scene;
    const fighter = isPlayer ? player : npc;
    const shieldX = fighter.x + Math.cos(isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle) * 28;
    const shieldY = fighter.y + Math.sin(isPlayer ? this.earthShieldAngle : this.npcEarthShieldAngle) * 28;

    // Consume shield first
    if (isPlayer) {
      this.earthShieldHp = 0;
      this.earthShieldBroken = true;
      // No 8s respawn yet — only after golem ends
      this.earthShieldRespawnAt = 0;
      if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
      if (this.erosionAura) { this.erosionAura.destroy(); this.erosionAura = null; }
    } else {
      this.npcEarthShieldHp = 0;
      this.npcEarthShieldBroken = true;
      this.npcEarthShieldRespawnAt = 0;
      if (this.npcEarthShieldSprite) { this.npcEarthShieldSprite.destroy(); this.npcEarthShieldSprite = null; }
    }

    const tint = isPlayer ? this.pcol : this.ncol;
    const fx = isPlayer ? this.pfx : this.nfx;
    const sprite = new StoneGolem(scene, tint, 6);
    const link = scene.add.graphics().setDepth(5);
    const hpLabel = scene.add.text(shieldX, shieldY - 36, '💪 150', {
      fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ccaa66',
    }).setOrigin(0.5).setDepth(11);

    if (isPlayer) {
      this.earthGolemActive = true;
      this.earthGolemHp = this.earthGolemMaxHp;
      this.earthGolemX = shieldX;
      this.earthGolemY = shieldY;
      this.earthGolemSprite = sprite;
      this.earthGolemLink = link;
      this.earthGolemUntil = scene.time.now + 15000;
      this.earthGolemPunchCdUntil = 0;
      this.earthGolemFaultCdUntil = 0;
      this.earthGolemPoundCdUntil = 0;
      this.earthGolemHpLabel = hpLabel;
      // 50% of incoming player damage redirected to golem
      player.damageAbsorber = (amount: number) => {
        if (!this.earthGolemActive) return false;
        const half = Math.ceil(amount * 0.5);
        this.earthGolemHp = Math.max(0, this.earthGolemHp - half);
        this.arena.spawnHitFlash(this.earthGolemX, this.earthGolemY, EARTH.stone);
        player.hp = Math.max(0, player.hp - (amount - half));
        player.emit('damaged', amount - half);
        if (player.hp <= 0) player.emit('defeated');
        return true;
      };
    } else {
      this.npcEarthGolemActive = true;
      this.npcEarthGolemHp = this.earthGolemMaxHp;
      this.npcEarthGolemX = shieldX;
      this.npcEarthGolemY = shieldY;
      this.npcEarthGolemSprite = sprite;
      this.npcEarthGolemLink = link;
      this.npcEarthGolemUntil = scene.time.now + 15000;
      this.npcEarthGolemPunchCdUntil = 0;
      this.npcEarthGolemFaultCdUntil = 0;
      this.npcEarthGolemPoundCdUntil = 0;
      this.npcEarthGolemHpLabel = hpLabel;
    }
    this.arena.showFloatingText(shieldX, shieldY - 40, '🗿 GOLEM RISES', '#ccaa66');
    // The shield doesn't vanish — it is torn open and the golem climbs out of the hole.
    fx.impact(shieldX, shieldY, 78, { shards: 12, dust: 3, depth: 5, duration: 460 });
    fx.pillar(shieldX, shieldY, 22, 62, 7);
    fx.ring(shieldX, shieldY, 14, 104, EARTH.dust, 520, 5, 5);
    if (isPlayer) this.playPlayerGesture('raise');
    this.arena.scene.cameras.main.shake(420, 0.018);
  }

  private endEarthGolem(isPlayer: boolean): void {
    const scene = this.arena.scene;
    const fx = isPlayer ? this.pfx : this.nfx;
    const gx = isPlayer ? this.earthGolemX : this.npcEarthGolemX;
    const gy = isPlayer ? this.earthGolemY : this.npcEarthGolemY;
    // It comes apart where it stood: the pieces fall, they don't fade.
    fx.impact(gx, gy, 66, { shards: 14, dust: 3, depth: 6, duration: 520 });
    fx.debris(gx, gy - 10, 10, { speed: 110, size: 6, life: 780, fall: 190, depth: 6 });
    this.arena.scene.cameras.main.shake(300, 0.012);

    if (isPlayer) {
      if (this.earthGolemSprite) { this.earthGolemSprite.destroy(); this.earthGolemSprite = null; }
      if (this.earthGolemLink) { this.earthGolemLink.destroy(); this.earthGolemLink = null; }
      if (this.earthGolemFaultWall) { this.earthGolemFaultWall.g.destroy(); this.earthGolemFaultWall = null; }
      if (this.earthGolemHpLabel) { this.earthGolemHpLabel.destroy(); this.earthGolemHpLabel = null; }
      this.earthGolemActive = false;
      this.earthGolemHp = 0;
      this.arena.player.damageAbsorber = null; // clear golem redirect
      this.earthShieldRespawnAt = scene.time.now + 8000; // shield respawn starts now
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '🗿 GOLEM FALLS', '#887755');
    } else {
      if (this.npcEarthGolemSprite) { this.npcEarthGolemSprite.destroy(); this.npcEarthGolemSprite = null; }
      if (this.npcEarthGolemLink) { this.npcEarthGolemLink.destroy(); this.npcEarthGolemLink = null; }
      if (this.npcEarthGolemFaultWall) { this.npcEarthGolemFaultWall.g.destroy(); this.npcEarthGolemFaultWall = null; }
      if (this.npcEarthGolemHpLabel) { this.npcEarthGolemHpLabel.destroy(); this.npcEarthGolemHpLabel = null; }
      this.npcEarthGolemActive = false;
      this.npcEarthGolemHp = 0;
      this.npcEarthShieldRespawnAt = scene.time.now + 8000;
      this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 30, '🗿 GOLEM FALLS', '#887755');
    }
  }

  private updateGolemAI(isPlayer: boolean, time: number, delta: number): void {
    const golemX = isPlayer ? this.earthGolemX : this.npcEarthGolemX;
    const golemY = isPlayer ? this.earthGolemY : this.npcEarthGolemY;
    const golemSprite = isPlayer ? this.earthGolemSprite : this.npcEarthGolemSprite;
    const golemLink = isPlayer ? this.earthGolemLink : this.npcEarthGolemLink;
    const golemHpLabel = isPlayer ? this.earthGolemHpLabel : this.npcEarthGolemHpLabel;
    const golemHp = isPlayer ? this.earthGolemHp : this.npcEarthGolemHp;
    const owner = isPlayer ? this.arena.player : this.arena.npc;
    const target = isPlayer ? this.arena.npc : this.arena.player;
    const punchCdUntil = isPlayer ? this.earthGolemPunchCdUntil : this.npcEarthGolemPunchCdUntil;
    const faultCdUntil = isPlayer ? this.earthGolemFaultCdUntil : this.npcEarthGolemFaultCdUntil;
    const poundCdUntil = isPlayer ? this.earthGolemPoundCdUntil : this.npcEarthGolemPoundCdUntil;
    const fx = isPlayer ? this.pfx : this.nfx;
    const tint = isPlayer ? this.pcol : this.ncol;

    const dist = Phaser.Math.Distance.Between(golemX, golemY, target.x, target.y);
    const speed = 40;

    // Golem movement toward target
    const gdx = target.x - golemX;
    const gdy = target.y - golemY;
    const glen = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
    const moveX = golemX + (gdx / glen) * speed * (delta / 1000);
    const moveY = golemY + (gdy / glen) * speed * (delta / 1000);
    if (isPlayer) { this.earthGolemX = moveX; this.earthGolemY = moveY; }
    else { this.npcEarthGolemX = moveX; this.npcEarthGolemY = moveY; }

    if (golemSprite) {
      const stepped = golemSprite.update(
        delta, moveX, moveY,
        golemHp / this.earthGolemMaxHp,
        Math.atan2(target.y - moveY, target.x - moveX),
      );
      // Each footfall puts dust under it, so the walk has weight.
      if (stepped) fx.grit(moveX, moveY + 18, 3, { speed: 30, size: 2.2, life: 460, fall: 30, depth: 5 });
    }
    if (golemLink) {
      golemLink.clear();
      EarthFx.drawTether(golemLink, tint, owner.x, owner.y, moveX, moveY, time / 1000);
    }
    if (golemHpLabel) {
      golemHpLabel.setPosition(moveX, moveY - 36);
      golemHpLabel.setText(`💪 ${Math.ceil(golemHp)}`);
    }

    // Golem abilities
    if (dist > 260 && time >= faultCdUntil) {
      // Fault Line: the ground splits between them and heaves into a wall.
      const midX = (golemX + target.x) / 2;
      const midY = (golemY + target.y) / 2;
      const wallAngle = Math.atan2(target.y - golemY, target.x - golemX) + Math.PI / 2;
      const wall: FaultWall = {
        g: this.arena.scene.add.graphics().setDepth(7),
        x: midX, y: midY, angle: wallAngle,
        spawnedAt: time, expiresAt: time + 1500,
      };
      this.arena.showFloatingText(midX, midY - 20, '⛰ FAULT LINE', '#ccaa66');
      target.takeDamage(25);
      this.arena.spawnHitFlash(target.x, target.y, EARTH.clay);
      golemSprite?.swing('pound');
      fx.debris(midX, midY, 10, {
        angle: wallAngle, spread: 0.5, speed: 190, size: 4, life: 640, fall: 150, depth: 8,
      });
      fx.dust(midX, midY, 3, 60, 6);
      this.arena.scene.cameras.main.shake(260, 0.012);
      if (isPlayer) {
        if (this.earthGolemFaultWall) this.earthGolemFaultWall.g.destroy();
        this.earthGolemFaultWall = wall;
        this.earthGolemFaultCdUntil = time + 5000;
      } else {
        if (this.npcEarthGolemFaultWall) this.npcEarthGolemFaultWall.g.destroy();
        this.npcEarthGolemFaultWall = wall;
        this.npcEarthGolemFaultCdUntil = time + 5000;
      }
    } else if (dist < 90 && time >= poundCdUntil) {
      // Pound: heavy AoE close range
      target.takeDamage(45);
      this.arena.spawnHitFlash(target.x, target.y, EARTH.clay);
      golemSprite?.swing('pound');
      fx.impact(moveX, moveY, 92, { shards: 13, dust: 3, depth: 6, duration: 460 });
      this.arena.scene.cameras.main.shake(320, 0.016);
      this.arena.showFloatingText(target.x, target.y - 20, '💥 POUND', '#ccaa66');
      if (isPlayer) this.earthGolemPoundCdUntil = time + 10000; else this.npcEarthGolemPoundCdUntil = time + 10000;
    } else if (dist < 90 && time >= punchCdUntil) {
      // Punch: quick melee hit
      target.takeDamage(18);
      this.arena.spawnHitFlash(target.x, target.y, EARTH.clay);
      golemSprite?.swing('punch');
      fx.debris(target.x, target.y, 5, {
        angle: Math.atan2(target.y - moveY, target.x - moveX), spread: 0.7,
        speed: 170, size: 3, life: 420, fall: 90, depth: 7,
      });
      fx.ring(target.x, target.y, 8, 38, EARTH.dust, 280, 3, 7);
      this.arena.showFloatingText(target.x, target.y - 20, '👊 PUNCH', '#ccaa66');
      if (isPlayer) this.earthGolemPunchCdUntil = time + 2000; else this.npcEarthGolemPunchCdUntil = time + 2000;
    }

    // Fault wall: rises over its first 300ms, then holds until it crumbles.
    const faultWall = isPlayer ? this.earthGolemFaultWall : this.npcEarthGolemFaultWall;
    if (faultWall) {
      if (time >= faultWall.expiresAt) {
        fx.dust(faultWall.x, faultWall.y, 2, 50, 5);
        faultWall.g.destroy();
        if (isPlayer) this.earthGolemFaultWall = null; else this.npcEarthGolemFaultWall = null;
      } else {
        faultWall.g.clear();
        EarthFx.drawFaultWall(
          faultWall.g, tint, faultWall.x, faultWall.y, 70, faultWall.angle,
          time / 1000, (time - faultWall.spawnedAt) / 300,
        );
      }
    }
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void delta;
    const player = this.arena.player;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // update() has no pointer, so the rig's aim is cached here.
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;

    // ── Titan Form (Q+ upgrade) — the whole kit is replaced while it's up ──
    if (this.titanActive) {
      // Click: Titan Smash
      if (pointer.isDown && !this.arena.pointerWasDown && time >= this.titanSmashCdUntil) {
        this.titanSmash(time, mouseX, mouseY);
      }
      // E: Titan Tremor
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey) && time >= this.titanTremorCdUntil) {
        this.titanTremorCast(time, mouseX);
      }
      // R: Titan Tsunami
      if (Phaser.Input.Keyboard.JustDown(this.arena.rKey) && time >= this.titanTsunamiCdUntil) {
        this.titanTsunamiCast(time);
      }
      // F: Titan Beam
      if (Phaser.Input.Keyboard.JustDown(this.arena.fKey) && time >= this.titanBeamCdUntil) {
        this.titanBeamCast(time, mouseX, mouseY);
      }
      // Q: Titan Eruption — self-destruct
      if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
        this.exitTitanForm(time, true);
      }
      return; // block normal inputs while titanic
    }
    // Still being flung back into the arena after an eruption: no input yet.
    if (this.titanLandingUntil > time) return;

    // ── Earth Mastery — Dust Screen takes over whichever slot it's bound to ──
    const dustScreenSlot = this.arena.masteryActive ? this.dustScreenSlot() : null;
    if (dustScreenSlot) {
      const dsKey = dustScreenSlot === 'e' ? this.arena.eKey
        : dustScreenSlot === 'r' ? this.arena.rKey
        : dustScreenSlot === 'f' ? this.arena.fKey
        : this.arena.qKey;
      if (Phaser.Input.Keyboard.JustDown(dsKey)) {
        this.tryCastDustScreen(time, mouseX, mouseY);
      }
    }

    // ── Q+ Titan Form hold charge (tap Q still casts the plain Golem Ritual) ──
    if (dustScreenSlot !== 'q' && this.arena.hasUpgrade('q')) {
      if (this.arena.qKey.isDown && !this.earthTitanChargeHolding && !this.earthGolemActive && !this.titanActive) {
        this.earthTitanChargeHolding = true;
        this.earthTitanChargeStart = time;
        if (this.earthTitanChargeVisual) this.earthTitanChargeVisual.destroy();
        this.earthTitanChargeVisual = new EarthGather(this.arena.scene, this.pcol, 84, 14);
        this.setPlayerHold('charge', 5200);
      }
      if (!this.arena.qKey.isDown && this.earthTitanChargeHolding) {
        const heldMs = time - this.earthTitanChargeStart;
        if (this.earthTitanChargeVisual) { this.earthTitanChargeVisual.destroy(); this.earthTitanChargeVisual = null; }
        this.earthTitanChargeHolding = false;
        this.setPlayerHold(null);
        if (heldMs >= 5000) {
          this.enterTitanForm(time);
        } else {
          // Short tap: cast normal golem ritual
          if (!this.earthGolemActive && this.earthShieldHp > 0) {
            if (player.castAbility('golem-ritual', playerCtx)) {
              this.playerEarthCastId = 'golem-ritual';
            }
          } else if (!this.earthGolemActive) {
            this.arena.showFloatingText(player.x, player.y - 30, 'NEED SHIELD', '#ff8844');
          }
        }
      }
    }

    // ── Normal input (skip if golem fusion holding) ────────────────

    // Click: Rock Launch (if shield active + rock in front) fires instantly on press;
    // otherwise holding charges Bash, and releasing executes it (see update()'s charge ramp below).
    const clickDown = pointer.isDown;
    const clickJustDown = clickDown && !this.arena.pointerWasDown;

    if (clickJustDown && !this.earthBashActive && !this.earthBashCharging) {
      if (Date.now() >= player.disarmedUntil && player.getCooldownRatio('bash') >= 1) {
        let didLaunch = false;
        // Click+ back shield cannot launch rocks — only front shield can
        if (this.earthShieldHp > 0 && this.earthRocks.length > 0) {
          for (let i = this.earthRocks.length - 1; i >= 0; i--) {
            const rock = this.earthRocks[i];
            const rockAng = Math.atan2(rock.sprite.y - player.y, rock.sprite.x - player.x);
            const diff = Math.abs(Phaser.Math.Angle.ShortestBetween(
              Phaser.Math.RadToDeg(rockAng),
              Phaser.Math.RadToDeg(this.earthShieldAngle)
            ));
            if (diff <= 45) {
              this.launchEarthRock(true, i);
              didLaunch = true;
              break;
            }
          }
        }
        if (didLaunch) {
          player.triggerCooldown('bash');
          this.playerEarthCastId = null;
        } else {
          // Start charging. Cooldown is consumed on release (see below), not here.
          this.earthBashCharging = true;
          this.earthBashChargeStart = time;
          this.earthBashChargeRatio = 0;
          // Hands drawn in behind the plate, braced against what is coming.
          this.setPlayerHold('brace', 2000, Math.atan2(mouseY - player.y, mouseX - player.x));
        }
      }
    }

    if (this.earthBashCharging) {
      if (clickDown) {
        const held = time - this.earthBashChargeStart;
        const wasFull = this.earthBashChargeRatio >= 1;
        this.earthBashChargeRatio = Math.min(1, held / 900);
        if (this.arena.elementId === 'earth') player.chargeRatio = this.earthBashChargeRatio;
        // The plate is drawn by StoneShield.setCharge in updateEarthShieldSpritePosition;
        // topping out is the one moment worth a separate flourish.
        if (!wasFull && this.earthBashChargeRatio >= 1) {
          const sa = this.earthShieldAngle;
          this.pfx.ring(player.x + Math.cos(sa) * 28, player.y + Math.sin(sa) * 28, 30, 8, EARTH.gold, 300, 4, 9);
          this.arena.showFloatingText(player.x, player.y - 44, '⚒ FULL CHARGE', '#ffd070');
        }
        this.setPlayerHold('brace', 2000, Math.atan2(mouseY - player.y, mouseX - player.x));
      } else {
        const ratio = this.earthBashChargeRatio;
        this.earthBashCharging = false;
        this.earthBashChargeRatio = 0;
        if (this.arena.elementId === 'earth') player.chargeRatio = 0;
        this.earthShieldSprite?.setCharge(0);
        player.triggerCooldown('bash');
        this.performEarthBash(true, mouseX, mouseY, ratio);
        this.playerEarthCastId = null;
      }
    }

    // E: Repair (E+ hold = Shield Splinter) — skipped entirely when Dust Screen owns this slot
    if (dustScreenSlot !== 'e') {
    if (this.arena.hasUpgrade('e')) {
      if (this.arena.eKey.isDown && !this.earthSplinterHolding) {
        this.earthSplinterHolding = true;
        this.earthSplinterHoldStart = time;
        this.earthSplinterReady = false;
        this.setPlayerHold('charge', 3000);
      }
      if (this.arena.eKey.isDown && this.earthSplinterHolding && !this.earthSplinterReady && time - this.earthSplinterHoldStart >= 2000) {
        this.earthSplinterReady = true;
        this.arena.showFloatingText(player.x, player.y - 30, '💥 SPLINTER READY', '#ff4444');
        this.pfx.ring(player.x, player.y, 44, 14, EARTH.ember, 340, 4, 9);
      }
      if (!this.arena.eKey.isDown && this.earthSplinterHolding) {
        const heldMs = time - this.earthSplinterHoldStart;
        this.earthSplinterHolding = false;
        this.earthSplinterReady = false;
        this.setPlayerHold(null);
        this.earthShieldSprite?.setSplinter(0);
        if (heldMs >= 2000 && this.earthShieldHp > 0) {
          // Explode: AoE = 1/3 combined shield HP
          const totalHp = this.earthShieldHp + (this.arena.hasUpgrade('click') ? this.earthBackShieldHp : 0);
          const aoeDmg = Math.round(totalHp / 3);
          const dist = Phaser.Math.Distance.Between(player.x, player.y, this.arena.npc.x, this.arena.npc.y);
          if (dist < 120) {
            this.arena.npc.takeDamage(aoeDmg);
            this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, EARTH.ember);
            this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 20, `💥 SPLINTER ${aoeDmg}`, '#ff4444');
            if (this.arena.npc.hp <= 0) this.arena.recordMasteryStat('splinterKills', 1);
          }
          this.playPlayerGesture('clap', this.earthShieldAngle);
          // The plate lets go: a molten blast whose reach tracks how much shield went into it.
          this.pfx.impact(player.x, player.y, 100 + totalHp * 0.32, {
            shards: 12 + Math.round(totalHp / 12), dust: 4, molten: true, crater: false,
            depth: 7, duration: 480,
          });
          this.arena.scene.cameras.main.shake(300 + totalHp, 0.014 + totalHp * 0.00004);
          // …and the biggest fragment is thrown forward as a weapon.
          const ang = this.earthShieldAngle;
          const shardColour = this.earthShieldEnhanced ? EARTH.brass
            : (this.arena.hasUpgrade('click') ? EARTH.chrome : EARTH.sand);
          const shardG = this.arena.scene.add.graphics().setDepth(8);
          shardG.fillStyle(this.pcol(EARTH.umber), 1);
          stoneChunkLayered(shardG, this.pcol, -11, 0, 0, 22, 6, 1, 0.4);
          shardG.fillStyle(this.pcol(shardColour), 0.8);
          stoneChunkLayered(shardG, this.pcol, -8, 0, 0, 16, 3.6, 0.9, 1.6);
          shardG.setPosition(player.x, player.y).setRotation(ang);
          this.earthSplinterShards.push({
            g: shardG, x: player.x, y: player.y,
            vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600,
            spin: 14, spawnedAt: time, trailAccum: 0, colour: shardColour,
          });
          this.pfx.muzzleRubble(player.x, player.y, ang, 1.3, 9, true);
          // Break the shield(s)
          this.breakEarthShield(true);
          if (this.arena.hasUpgrade('click') && this.earthBackShieldHp > 0) {
            this.earthBackShieldHp = 0;
            if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
            if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
          }
        } else {
          // Short hold: trigger Repair as normal
          if (player.castAbility('repair', playerCtx)) {
            this.startRepair(time);
          }
        }
      }
    } else {
      // Base E: Repair
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
        if (player.castAbility('repair', playerCtx)) this.startRepair(time);
      }
    }
    }

    // R: Rock Dance
    if (dustScreenSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (player.castAbility('rock-dance', playerCtx)) {
        this.playerEarthCastId = 'rock-dance';
      }
    }

    // F: Quake
    if (dustScreenSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (player.castAbility('quake', playerCtx)) {
        this.playerEarthCastId = 'quake';
      }
    }

    // Q: Golem Ritual (Q+ uses hold mechanic above; base Q is instant)
    if (dustScreenSlot !== 'q' && !this.arena.hasUpgrade('q') && Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (this.earthShieldHp > 0 && !this.earthGolemActive) {
        if (player.castAbility('golem-ritual', playerCtx)) {
          this.playerEarthCastId = 'golem-ritual';
        }
      } else if (!this.earthGolemActive) {
        this.arena.showFloatingText(player.x, player.y - 30, 'NEED SHIELD', '#ff8844');
      }
    }
  }

  // ── Earth Mastery: Dust Screen ──────────────────────────────────────────

  /** The slot Dust Screen is bound over this match, or null when it isn't bound anywhere. */
  private dustScreenSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'dust-screen') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar for the bound slot. */
  getDustScreenCooldownRatio(time: number): number {
    return Math.min(1, (time - this.dustScreenLastCastAt) / DUST_SCREEN_COOLDOWN_MS);
  }

  private tryCastDustScreen(time: number, mouseX: number, mouseY: number): void {
    if (time - this.dustScreenLastCastAt < DUST_SCREEN_COOLDOWN_MS) return;
    this.dustScreenLastCastAt = time;
    // triggerCooldown already broadcasts the cast id online; the peer replays via doNpcDustScreen.
    this.arena.player.triggerCooldown('dust-screen');
    this.castDustScreen(mouseX, mouseY, 'player', time);
  }

  /** Online replay: the remote earth player cast Dust Screen — blind/blur us from the npc cone. */
  doNpcDustScreen(tx: number, ty: number): void {
    this.castDustScreen(tx, ty, 'npc', this.arena.scene.time.now);
  }

  private castDustScreen(aimX: number, aimY: number, owner: 'player' | 'npc', time: number): void {
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;

    const angle = Math.atan2(aimY - origin.y, aimX - origin.x);
    const halfAngleRad = Phaser.Math.DegToRad(DUST_SCREEN_HALF_ANGLE_DEG);

    // A wall of grit kicked forward off the ground, not a flat wedge of tint.
    const fx = owner === 'player' ? this.pfx : this.nfx;
    fx.dustCone(origin.x, origin.y, angle, DUST_SCREEN_RANGE, halfAngleRad);
    fx.debris(origin.x, origin.y, 7, {
      angle, spread: halfAngleRad, speed: DUST_SCREEN_RANGE * 1.5,
      size: 3.4, life: 620, fall: 120, depth: 6,
    });
    if (owner === 'player') this.playPlayerGesture('sweep', angle);
    else this.npcAvatar?.play('sweep', angle);
    this.arena.showFloatingText(origin.x, origin.y - 30, '💨 DUST SCREEN', '#aa9977');

    // 'npc' cones (online replay) blur the local player; 'player' cones blind enemies/husks.
    const targets = owner === 'npc' ? [this.arena.player] : this.arena.enemies;
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(origin.x, origin.y, t.x, t.y) > DUST_SCREEN_RANGE) continue;
      const toTarget = Math.atan2(t.y - origin.y, t.x - origin.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toTarget - angle)) > halfAngleRad) continue;

      if (t instanceof Husk) {
        // Husk.update() reads both fields: melee/charger/titan/demon wander, ranged/ranger/medic jitter aim.
        t.confusedWanderUntil = time + DUST_SCREEN_EFFECT_MS;
        t.aimOffsetBonusDeg = 80;
        t.aimOffsetBonusUntil = time + DUST_SCREEN_EFFECT_MS;
        this.arena.showFloatingText(t.x, t.y - 30, '😵 CONFUSED', '#aa9977');
      } else if (t === this.arena.npc) {
        // Reuses the exact aim-inaccuracy mechanism NpcOpponent.doAI already reads.
        t.aimOffsetBonusDeg = 80;
        t.aimOffsetBonusUntil = time + DUST_SCREEN_EFFECT_MS;
        this.arena.showFloatingText(t.x, t.y - 30, '😵 BLINDED', '#aa9977');
      } else if (t === this.arena.player) {
        // Only reachable if a future caller ever invokes this with the local human as a target
        // (e.g. an opponent's cast replicated over the network) — solo NPCs never own mastery.
        this.applyScreenBlur(DUST_SCREEN_EFFECT_MS);
      }
    }
  }
}
