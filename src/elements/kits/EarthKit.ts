import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext, Ability } from '../Ability';
import { Husk } from '../../invasion/Husk';

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
  marker: Phaser.GameObjects.Arc | null;
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
  sprite: Phaser.GameObjects.Rectangle;
  crest: Phaser.GameObjects.Rectangle;
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
  /** Dust Screen hitting the local human in online PvP: blur their canvas for `ms`. */
  applyScreenBlur(ms: number): void;
}

// ── EarthKit ──────────────────────────────────────────────────────────────

export class EarthKit {
  // ── Player shield state ────────────────────────────────────────────────
  private earthShieldHp = 0;
  private earthShieldMaxHp = 75;
  private earthShieldEnhanced = false;
  private earthShieldSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthShieldAngle = 0;
  private earthShieldRespawnAt = 0;
  private earthShieldBroken = false;
  private earthShieldLabel: Phaser.GameObjects.Text | null = null;

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
  private earthRepairEnd = 0;
  private earthRepairAura: Phaser.GameObjects.Arc | null = null;
  private earthRocks: Array<{ sprite: Phaser.GameObjects.Arc; hitCdUntil: number }> = [];
  private earthRockOrbitAngle = 0;
  private earthLaunchedRocks: Array<{ sprite: Phaser.GameObjects.Arc; vx: number; vy: number; spawnedAt: number }> = [];
  private earthQuakeSprite: Phaser.GameObjects.Arc | null = null;
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
  private earthGolemSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthGolemLink: Phaser.GameObjects.Graphics | null = null;
  private earthGolemUntil = 0;
  private earthGolemPunchCdUntil = 0;
  private earthGolemFaultCdUntil = 0;
  private earthGolemPoundCdUntil = 0;
  private earthGolemFaultWallSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthGolemFaultWallUntil = 0;
  private earthGolemHpLabel: Phaser.GameObjects.Text | null = null;
  private playerEarthCastId: string | null = null;
  private playerEarthStunnedUntil = 0;

  // ── Earth upgrade state (Click+: dual shield) ───────────────────────────
  private earthBackShieldHp = 0;
  private earthBackShieldMaxHp = 50;
  private earthBackShieldSprite: Phaser.GameObjects.Rectangle | null = null;
  private earthBackShieldLabel: Phaser.GameObjects.Text | null = null;
  // Earth upgrade state (E+: shield splinter)
  private earthSplinterHolding = false;
  private earthSplinterHoldStart = 0;
  private earthSplinterReady = false;
  private earthSplinterAura: Phaser.GameObjects.Rectangle | null = null;
  private earthSplinterRepairFast = false;
  // Earth upgrade state (R+: lava rocks)
  private earthLavaRockFirePools: Array<{ sprite: Phaser.GameObjects.Arc; expiresAt: number }> = [];
  private earthQuakeMagmified = false;
  private earthQuakeStandAccum = 0;
  // Earth upgrade state (F+: tsunami waves — kept for legacy cleanup only, no longer spawned)
  private earthTsunamiWaves: Array<{ sprite: Phaser.GameObjects.Rectangle; vx: number; vy: number; expiresAt: number; owner?: 'player' | 'npc' }> = [];
  // Earth upgrade state (Q+: Titan Form — hold Q to become the titanic golem)
  private earthTitanChargeHolding = false;
  private earthTitanChargeStart = 0;
  private earthTitanChargeVisual: Phaser.GameObjects.Arc | null = null;
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
  private titanScorch: Array<{ sprite: Phaser.GameObjects.Arc; x: number; y: number; r: number; expiresAt: number }> = [];
  private titanScorchAccum = 0;
  private titanEruptionsLeft = 0;
  private titanEruptionNextAt = 0;

  // ── NPC mirror state ────────────────────────────────────────────────────
  private npcEarthShieldHp = 0;
  private npcEarthShieldMaxHp = 75;
  private npcEarthShieldEnhanced = false;
  private npcEarthShieldSprite: Phaser.GameObjects.Rectangle | null = null;
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
  private npcEarthRepairEnd = 0;
  private npcEarthRocks: Array<{ sprite: Phaser.GameObjects.Arc; hitCdUntil: number }> = [];
  private npcEarthRockOrbitAngle = 0;
  private npcEarthLaunchedRocks: Array<{ sprite: Phaser.GameObjects.Arc; vx: number; vy: number; spawnedAt: number }> = [];
  private npcEarthQuakeSprite: Phaser.GameObjects.Arc | null = null;
  private npcEarthQuakeExpiry = 0;
  private npcEarthQuakeX = 0;
  private npcEarthQuakeY = 0;
  private npcEarthQuakeTickAccum = 0;
  private npcEarthQuakeStunUntil = 0;
  private npcEarthGolemActive = false;
  private npcEarthGolemHp = 0;
  private npcEarthGolemX = 0;
  private npcEarthGolemY = 0;
  private npcEarthGolemSprite: Phaser.GameObjects.Rectangle | null = null;
  private npcEarthGolemLink: Phaser.GameObjects.Graphics | null = null;
  private npcEarthGolemUntil = 0;
  private npcEarthGolemPunchCdUntil = 0;
  private npcEarthGolemFaultCdUntil = 0;
  private npcEarthGolemPoundCdUntil = 0;
  private npcEarthGolemFaultWallSprite: Phaser.GameObjects.Rectangle | null = null;
  private npcEarthGolemFaultWallUntil = 0;
  private npcEarthGolemHpLabel: Phaser.GameObjects.Text | null = null;

  // ── Earth Mastery: Dust Screen ──────────────────────────────────────────
  private dustScreenLastCastAt = -Infinity;

  constructor(private arena: EarthArenaApi) {}

  // ── Public accessors for cross-cutting arena state ─────────────────────

  getPlayerStunnedUntil(): number { return this.playerEarthStunnedUntil; }
  isRepairActive(): boolean { return this.earthRepairActive; }
  /** Titan Form (Q+): the player is the golem — rooted, hidden and untouchable. */
  isTitanActive(): boolean { return this.titanActive || this.titanLandingUntil > this.arena.scene.time.now; }
  getNpcShieldHp(): number { return this.npcEarthShieldHp; }
  getNpcRocksActive(): boolean { return this.npcEarthRocks.length > 0; }

  reset(): void {
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
    this.earthRepairEnd = 0;
    this.earthRepairAura = null;
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
    this.earthGolemFaultWallSprite = null;
    this.earthGolemFaultWallUntil = 0;
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
    if (this.earthSplinterAura) { this.earthSplinterAura.destroy(); this.earthSplinterAura = null; }
    this.earthSplinterRepairFast = false;
    this.earthLavaRockFirePools.forEach(p => p.sprite.destroy());
    this.earthLavaRockFirePools = [];
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
    this.npcEarthRepairEnd = 0;
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
    this.npcEarthGolemFaultWallSprite = null;
    this.npcEarthGolemFaultWallUntil = 0;
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

    // ── Player earth ──────────────────────────────────────────────
    if (this.arena.elementId === 'earth') {
      const playerBody = player.body as Phaser.Physics.Arcade.Body;

      // Lazy-spawn initial shield (HP starts at 75 from reset() but sprite doesn't exist yet)
      if (this.earthShieldHp > 0 && !this.earthShieldSprite && !this.earthShieldBroken && !this.earthGolemActive && !this.titanActive) {
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
      if (this.earthShieldSprite) this.updateEarthShieldSpritePosition(true);

      // Repair active — slow + aura
      if (this.earthRepairActive) {
        if (time >= this.earthRepairEnd) {
          this.earthRepairActive = false;
          if (this.earthRepairAura) { this.earthRepairAura.destroy(); this.earthRepairAura = null; }
          // Apply repair effect
          const hasDualShield = this.arena.hasUpgrade('click');
          if (this.earthGolemActive) {
            this.earthGolemHp = Math.min(this.earthGolemMaxHp, this.earthGolemHp + 50);
            this.arena.showFloatingText(player.x, player.y - 30, '🔧 GOLEM REPAIR +50', '#ccaa66');
          } else if (this.earthShieldBroken) {
            this.spawnEarthShield(true);
            this.arena.showFloatingText(player.x, player.y - 30, '🔧 SHIELD RESTORED', '#ccaa66');
          } else {
            // Determine max HPs
            const fMaxHp = hasDualShield ? (this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50)) : this.earthShieldMaxHp;
            const bMaxHp = hasDualShield ? (this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50)) : fMaxHp;
            // Check if both shields are at ≥90% to allow enhancement
            const frontReady = this.earthShieldHp >= 0.9 * fMaxHp;
            const backReady = !hasDualShield || (this.earthBackShieldHp > 0 && this.earthBackShieldHp >= 0.9 * bMaxHp);
            const canEnhance = frontReady && backReady && !this.earthShieldEnhanced;
            if (canEnhance) {
              // Enhance both shields to gold
              this.earthShieldEnhanced = true;
              this.earthShieldMaxHp = hasDualShield ? 100 : 125;
              this.earthShieldHp = this.earthShieldMaxHp;
              if (this.earthShieldSprite) {
                this.earthShieldSprite.setSize(55, 14);
                this.earthShieldSprite.setFillStyle(0xffcc44);
                this.earthShieldSprite.setStrokeStyle(2, 0xffe899);
              }
              if (hasDualShield) {
                this.earthBackShieldHp = 100;
                if (this.earthBackShieldSprite) {
                  this.earthBackShieldSprite.setSize(55, 14);
                  this.earthBackShieldSprite.setFillStyle(0xffcc44);
                  this.earthBackShieldSprite.setStrokeStyle(2, 0xffe899);
                }
                this.arena.showFloatingText(player.x, player.y - 30, '⚒ SHIELDS ENHANCED!', '#ffcc44');
              } else {
                this.arena.showFloatingText(player.x, player.y - 30, '⚒ SHIELD ENHANCED!', '#ffcc44');
              }
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
        } else {
          if (this.earthRepairAura) this.earthRepairAura.setPosition(player.x, player.y);
        }
      }

      // Bash — dash phase
      if (this.earthBashActive) {
        if (time >= this.earthBashEnd) {
          this.earthBashActive = false;
          this.arena.isDodging = false;
          playerBody.setVelocity(0, 0);
        } else {
          // Check hit against enemies
          if (!this.earthBashHitDealt) {
            for (const t of this.arena.enemies) {
              if (!t.active || t.hp <= 0) continue;
              const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
              if (dist < 70) {
                this.earthBashHitDealt = true;
                if (this.earthShieldHp > 0) {
                  t.takeDamage(this.earthBashShieldDmg);
                  this.arena.spawnHitFlash(t.x, t.y, 0x887755);
                  this.arena.showFloatingText(t.x, t.y - 20, `🛡 BASH ${this.earthBashShieldDmg}`, '#ccaa66');
                } else {
                  t.takeDamage(this.earthBashStabDmg);
                  this.arena.spawnHitFlash(t.x, t.y, 0x887755);
                  this.arena.showFloatingText(t.x, t.y - 20, `🗡 STAB ${this.earthBashStabDmg}`, '#aa8844');
                }
                // Full-charge bash stuns on hit (reuses the same stun field the rock launch uses)
                if (this.earthBashFullCharge) {
                  t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 700);
                  this.arena.recordMasteryStat('bashStuns', 1);
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
        if (time >= rock.hitCdUntil) {
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            const d = Phaser.Math.Distance.Between(rock.sprite.x, rock.sprite.y, t.x, t.y);
            if (d < 22) {
              t.takeDamage(8);
              this.arena.spawnHitFlash(t.x, t.y, lavaRocks ? 0xff4400 : 0x887755);
              this.arena.showFloatingText(t.x, t.y - 20, '🪨 8', '#aa8844');
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
        // R+: lava rock ignites quake zone on pass-through (not just on enemy hit)
        if (lavaRocks && this.earthQuakeSprite && this.earthQuakeExpiry > time && !this.earthQuakeMagmified) {
          const qZoneR = this.arena.hasUpgrade('f') ? 100 : 80;
          if (Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, this.earthQuakeX, this.earthQuakeY) < qZoneR) {
            this.earthQuakeMagmified = true;
            this.earthQuakeSprite.setFillStyle(0xff0000, 0.3);
            this.earthQuakeSprite.setStrokeStyle(2, 0xff2200, 0.9);
            this.arena.showFloatingText(this.earthQuakeX, this.earthQuakeY - 20, '🌋 MAGMA QUAKE', '#ff2200');
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
            this.arena.spawnHitFlash(t.x, t.y, lavaRocks ? 0xff4400 : 0x887755);
            this.arena.showFloatingText(t.x, t.y - 20, lavaRocks ? `🔥 LAVA HIT ${launchDmg}` : `🪨 LAUNCH STUN ${launchDmg}`, '#ffcc44');
            t.earthStunnedUntil = Math.max(t.earthStunnedUntil, time + 3000);
            if (lavaRocks) {
              t.lavaRockBurnUntil = Math.max(t.lavaRockBurnUntil, time + 3000);
              const poolSpr = this.arena.scene.add.circle(t.x, t.y, 32, 0xff4400, 0.4).setDepth(3);
              this.arena.scene.tweens.add({ targets: poolSpr, scaleX: 1.1, scaleY: 1.1, alpha: 0.1, duration: 2500, onComplete: () => poolSpr.destroy() });
              this.earthLavaRockFirePools.push({ sprite: poolSpr, expiresAt: time + 2500 });
              // Magmify quake if enemy is inside quake zone
              if (this.earthQuakeSprite && this.earthQuakeExpiry > time) {
                const qZoneR = this.arena.hasUpgrade('f') ? 100 : 80;
                const qd = Phaser.Math.Distance.Between(t.x, t.y, this.earthQuakeX, this.earthQuakeY);
                if (qd < qZoneR) {
                  this.earthQuakeMagmified = true;
                  this.earthQuakeSprite.setFillStyle(0xff0000, 0.3);
                  this.earthQuakeSprite.setStrokeStyle(2, 0xff2200, 0.9);
                  this.arena.showFloatingText(this.earthQuakeX, this.earthQuakeY - 20, '🌋 MAGMA QUAKE', '#ff2200');
                }
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
            t.takeDamage(2); this.arena.spawnHitFlash(t.x, t.y, 0xff4400);
          }
        } else {
          t.lavaRockBurnAccum = 0;
        }
      }
      // Lava fire pool cleanup
      for (let i = this.earthLavaRockFirePools.length - 1; i >= 0; i--) {
        if (time >= this.earthLavaRockFirePools[i].expiresAt) {
          this.earthLavaRockFirePools[i].sprite.destroy();
          this.earthLavaRockFirePools.splice(i, 1);
        }
      }

      // Quake zone
      const quakeRadius = this.arena.hasUpgrade('f') ? 100 : 80;
      if (this.earthQuakeSprite && time < this.earthQuakeExpiry) {
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
              this.arena.spawnHitFlash(t.x, t.y, this.earthQuakeMagmified ? 0xff4400 : 0x887755);
              this.arena.showFloatingText(t.x, t.y - 20, this.earthQuakeMagmified ? `🌋 MAGMA ${tripDmg}` : `⚡ TRIP ${tripDmg}`, '#ccaa66');
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
          }
        } else {
          this.earthQuakeStandAccum = 0;
        }
      }

      // Tsunami waves (legacy, no longer spawned)
      for (let ti = this.earthTsunamiWaves.length - 1; ti >= 0; ti--) {
        const wave = this.earthTsunamiWaves[ti];
        wave.sprite.x += wave.vx * (delta / 1000);
        wave.sprite.y += wave.vy * (delta / 1000);
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
            this.arena.spawnHitFlash(t.x, t.y, 0x88ddff);
            if (!wave.owner) this.arena.showFloatingText(t.x, t.y - 20, '🌊 TSUNAMI 35', '#88ddff');
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

      // E+ Shield Splinter: throb visual
      if (this.earthSplinterHolding && this.earthSplinterReady && this.earthShieldSprite) {
        const t2 = (Math.sin(time / 100) + 1) / 2; // oscillate 0→1
        const scale = 0.9 + t2 * 0.3;
        this.earthShieldSprite.setScale(scale);
        this.earthShieldSprite.setFillStyle(0xff2222);
      } else if (this.earthShieldSprite && !this.earthSplinterHolding) {
        this.earthShieldSprite.setScale(1);
      }

      // Q+ Titan Form: charge bar visual
      if (this.earthTitanChargeHolding && this.earthTitanChargeVisual) {
        const holdPct = Math.min(1, (time - this.earthTitanChargeStart) / 5000);
        this.earthTitanChargeVisual.setRadius(10 + holdPct * 24);
        this.earthTitanChargeVisual.setPosition(player.x, player.y - 36);
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
      if (this.npcEarthShieldSprite) this.updateEarthShieldSpritePosition(false);

      // NPC Repair
      if (this.npcEarthRepairActive) {
        if (time >= this.npcEarthRepairEnd) {
          this.npcEarthRepairActive = false;
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
            if (this.npcEarthShieldSprite) this.npcEarthShieldSprite.setSize(55, 14);
          }
        }
      }

      // NPC Bash
      if (this.npcEarthBashActive) {
        if (time >= this.npcEarthBashEnd) {
          this.npcEarthBashActive = false;
          npcBody.setVelocity(0, 0);
        } else if (!this.npcEarthBashHitDealt) {
          const dist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
          if (dist < 70) {
            this.npcEarthBashHitDealt = true;
            if (this.npcEarthShieldHp > 0) {
              player.takeDamage(this.npcEarthBashShieldDmg);
              this.arena.spawnHitFlash(player.x, player.y, 0x887755);
              this.arena.showFloatingText(player.x, player.y - 20, `🛡 BASH ${this.npcEarthBashShieldDmg}`, '#ccaa66');
            } else {
              player.takeDamage(this.npcEarthBashStabDmg);
              this.arena.spawnHitFlash(player.x, player.y, 0x887755);
              this.arena.showFloatingText(player.x, player.y - 20, `🗡 STAB ${this.npcEarthBashStabDmg}`, '#aa8844');
            }
            if (this.npcEarthBashFullCharge) {
              player.earthStunnedUntil = Math.max(player.earthStunnedUntil, time + 700);
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
        if (time >= rock.hitCdUntil) {
          const d = Phaser.Math.Distance.Between(rock.sprite.x, rock.sprite.y, player.x, player.y);
          if (d < 22) {
            player.takeDamage(8);
            this.arena.spawnHitFlash(player.x, player.y, 0x887755);
            this.arena.showFloatingText(player.x, player.y - 20, '🪨 8', '#aa8844');
            rock.hitCdUntil = time + 500;
          }
        }
      }
      for (let i = this.npcEarthLaunchedRocks.length - 1; i >= 0; i--) {
        const lr = this.npcEarthLaunchedRocks[i];
        lr.sprite.x += lr.vx * (delta / 1000);
        lr.sprite.y += lr.vy * (delta / 1000);
        const d = Phaser.Math.Distance.Between(lr.sprite.x, lr.sprite.y, player.x, player.y);
        const hitWall = lr.sprite.x < 20 || lr.sprite.x > W - 20 || lr.sprite.y < 20 || lr.sprite.y > H - 20;
        const expired = time - lr.spawnedAt > 1200;
        if (d < 28) {
          player.takeDamage(40);
          this.arena.spawnHitFlash(player.x, player.y, 0x887755);
          this.arena.showFloatingText(player.x, player.y - 20, '🪨 LAUNCH STUN 40', '#ffcc44');
          this.playerEarthStunnedUntil = Math.max(this.playerEarthStunnedUntil, time + 3000);
          lr.sprite.destroy();
          this.npcEarthLaunchedRocks.splice(i, 1);
        } else if (hitWall || expired) {
          lr.sprite.destroy();
          this.npcEarthLaunchedRocks.splice(i, 1);
        }
      }

      // NPC Quake zone
      if (this.npcEarthQuakeSprite && time < this.npcEarthQuakeExpiry) {
        this.npcEarthQuakeTickAccum += delta;
        if (this.npcEarthQuakeTickAccum >= 750) {
          this.npcEarthQuakeTickAccum -= 750;
          const d = Phaser.Math.Distance.Between(this.npcEarthQuakeX, this.npcEarthQuakeY, player.x, player.y);
          if (d < 80 && time > (this.npcEarthQuakeStunUntil ?? 0) && Math.random() < 0.35) {
            player.takeDamage(5, { source: this.npcEarthQuakeSprite, sourceX: this.npcEarthQuakeX, sourceY: this.npcEarthQuakeY });
            this.arena.spawnHitFlash(player.x, player.y, 0x887755);
            this.arena.showFloatingText(player.x, player.y - 20, '⚡ TRIP 5', '#ccaa66');
            this.playerEarthStunnedUntil = Math.max(this.playerEarthStunnedUntil, time + 500);
            this.npcEarthQuakeStunUntil = time + 500;
          }
        }
      } else if (this.npcEarthQuakeSprite && time >= this.npcEarthQuakeExpiry) {
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
      }
      if (this.arena.npcCastId === 'quake') {
        const qx = player.x + Phaser.Math.Between(-60, 60);
        const qy = player.y + Phaser.Math.Between(-60, 60);
        if (this.npcEarthQuakeSprite) this.npcEarthQuakeSprite.destroy();
        this.npcEarthQuakeSprite = this.arena.scene.add.circle(qx, qy, 80, 0x887755, 0.2).setDepth(4).setStrokeStyle(2, 0xccaa66, 0.8);
        this.npcEarthQuakeX = qx; this.npcEarthQuakeY = qy;
        this.npcEarthQuakeExpiry = time + 5000;
        this.npcEarthQuakeTickAccum = 0;
        this.arena.showFloatingText(qx, qy, '⛰ QUAKE', '#ccaa66');
      }
      if (this.arena.npcCastId === 'repair') {
        this.npcEarthRepairActive = true;
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
      }
      if (this.playerEarthCastId === 'quake') {
        const ptr2 = this.arena.scene.input.activePointer;
        const hasTectonic = this.arena.hasUpgrade('f');
        const qRadius = hasTectonic ? 100 : 80;
        const qDuration = hasTectonic ? 6000 : 5000;
        const qColor = hasTectonic ? 0xffffff : 0x887755;
        const qStroke = hasTectonic ? 0xdddddd : 0xccaa66;
        if (this.earthQuakeSprite) this.earthQuakeSprite.destroy();
        this.earthQuakeSprite = this.arena.scene.add.circle(ptr2.worldX, ptr2.worldY, qRadius, qColor, 0.15).setDepth(4).setStrokeStyle(2, qStroke, 0.8);
        this.earthQuakeX = ptr2.worldX; this.earthQuakeY = ptr2.worldY;
        this.earthQuakeExpiry = time + qDuration;
        this.earthQuakeTickAccum = 0;
        this.earthQuakeMagmified = false;
        this.earthQuakeStandAccum = 0;
        this.arena.showFloatingText(ptr2.worldX, ptr2.worldY, hasTectonic ? '⛰ TECTONIC QUAKE' : '⛰ QUAKE', '#ccaa66');
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
    if (this.titanWave) { this.titanWave.sprite.destroy(); this.titanWave.crest.destroy(); this.titanWave = null; }
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
    if (this.earthShieldLabel) { this.earthShieldLabel.destroy(); this.earthShieldLabel = null; }
    if (this.earthBackShieldHp > 0) {
      this.earthBackShieldHp = 0;
      if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
      if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
    }

    this.titanArmsG = this.arena.scene.add.graphics().setDepth(30);
    this.titanHeadG = this.arena.scene.add.graphics().setDepth(31);
    this.titanTimerLabel = this.arena.scene.add.text(W / 2, 200, '', {
      fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#ffbb55',
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

    // Rise: dust wall along the top, a long heavy quake.
    this.shake(1200, 0.028);
    for (let i = 0; i < 14; i++) {
      const dx = 40 + Math.random() * (W - 80);
      const puff = this.arena.scene.add.circle(dx, 30 + Math.random() * 120, 10 + Math.random() * 26, 0x6b5a44, 0.55).setDepth(29);
      this.arena.scene.tweens.add({
        targets: puff, y: puff.y + 90 + Math.random() * 70, scale: 2.4, alpha: 0,
        duration: 700 + Math.random() * 500, onComplete: () => puff.destroy(),
      });
    }
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

    // Debris shower from where the head and arms were.
    for (let i = 0; i < 18; i++) {
      const cx = Math.random() < 0.5 ? Phaser.Math.Between(W / 2 - 240, W / 2 + 240) : (Math.random() < 0.5 ? Phaser.Math.Between(10, 90) : Phaser.Math.Between(W - 90, W - 10));
      const chunk = this.arena.scene.add.rectangle(cx, Phaser.Math.Between(20, 200), Phaser.Math.Between(10, 26), Phaser.Math.Between(10, 26), 0x5b4c39, 0.9)
        .setDepth(27).setStrokeStyle(2, 0x3a3025);
      this.arena.scene.tweens.add({
        targets: chunk, y: chunk.y + Phaser.Math.Between(120, 400), x: chunk.x + Phaser.Math.Between(-90, 90),
        angle: Phaser.Math.Between(-360, 360), alpha: 0, duration: 700 + Math.random() * 500,
        onComplete: () => chunk.destroy(),
      });
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
        const ring = this.arena.scene.add.circle(player.x, player.y, 14, 0x887755, 0.75).setDepth(6);
        this.arena.scene.tweens.add({ targets: ring, scaleX: 9, scaleY: 9, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
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
          this.arena.spawnHitFlash(t.x, t.y, 0xff8844);
          this.arena.showFloatingText(t.x, t.y - 26, '⛰ TREMOR', '#ffaa55');
          this.shake(180, 0.012);
        }
      }
    }

    // ── Tsunami ─────────────────────────────────────────────────────────
    if (this.titanWave) {
      const w = this.titanWave;
      w.x += w.speed * dt;
      w.sprite.setX(w.x);
      w.crest.setX(w.x + 92);
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
          const splash = this.arena.scene.add.circle(W - 20, t.y, 20, 0xaaeeff, 0.7).setDepth(6);
          this.arena.scene.tweens.add({ targets: splash, scaleX: 6, scaleY: 6, alpha: 0, duration: 450, onComplete: () => splash.destroy() });
        }
      }
      if (w.x > W + 160) {
        w.sprite.destroy();
        w.crest.destroy();
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
            this.arena.spawnHitFlash(t.x, t.y, 0xff9933);
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
          this.arena.spawnHitFlash(t.x, t.y, 0xff6622);
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
    g.fillStyle(0x5b4c39, 1);
    g.fillPoints(pts, true);
    g.lineStyle(5, 0x342b20, 1);
    g.strokePoints(pts, true);

    // Cheek plates — lighter slabs so the face reads as stacked rock
    g.fillStyle(0x6d5c45, 1);
    g.fillTriangle(cx - 200, cy + 60, cx - 120, cy + 40, cx - 140, cy + 150);
    g.fillTriangle(cx + 200, cy + 60, cx + 120, cy + 40, cx + 140, cy + 150);
    g.fillStyle(0x4a3d2d, 1);
    g.fillTriangle(cx - 70, cy + 150, cx + 70, cy + 150, cx, cy + 205);

    // Brow ridge
    g.fillStyle(0x403527, 1);
    g.fillRect(cx - 210, cy + 30, 420, 26);

    // Eyes — molten, pulsing
    const pulse = 0.72 + 0.28 * Math.sin(time / 220);
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 104;
      const ey = cy + 88;
      g.fillStyle(0x1a1008, 1);
      g.fillEllipse(ex, ey, 92, 54);
      g.fillStyle(0xff6a10, pulse);
      g.fillEllipse(ex, ey, 62 * pulse + 12, 32 * pulse + 8);
      g.fillStyle(0xffd070, pulse);
      g.fillEllipse(ex, ey, 26 * pulse + 6, 15 * pulse + 4);
      // heavy stone lid
      g.fillStyle(0x5b4c39, 1);
      g.fillTriangle(ex - 54, ey - 30, ex + 54, ey - 30, ex + sx * 20, ey - 6);
    }

    // Jagged mouth with lava between the teeth — kept locked to the beam origin
    // so Titan Beam always fires from between the jaws, sway included.
    const mouthY = TITAN_MOUTH_Y + (cy - TITAN_HEAD_CY);
    g.fillStyle(0x120a04, 1);
    g.fillRect(cx - 130, mouthY - 20, 260, 40);
    g.fillStyle(0xff5a0f, 0.5 + 0.3 * Math.sin(time / 300));
    g.fillRect(cx - 126, mouthY - 8, 252, 16);
    g.fillStyle(0x8b7a5f, 1);
    for (let i = 0; i < 7; i++) {
      const tx = cx - 126 + i * 38;
      g.fillTriangle(tx, mouthY - 20, tx + 34, mouthY - 20, tx + 17, mouthY + 8);
      g.fillTriangle(tx + 8, mouthY + 20, tx + 42, mouthY + 20, tx + 25, mouthY - 6);
    }

    // Lava cracks crawling down the face
    g.lineStyle(4, 0xff5a0f, 0.55 + 0.25 * Math.sin(time / 260));
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
    g.fillStyle(0x5b4c39, 1);
    g.fillPoints(quad, true);
    g.lineStyle(5, 0x342b20, 1);
    g.strokePoints(quad, true);
    // Plate seams across the limb
    g.lineStyle(3, 0x40352b, 0.9);
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
      g.fillStyle(0x6d5c45, 1);
      g.fillCircle(ex, ey, 54);
      g.lineStyle(5, 0x342b20, 1);
      g.strokeCircle(ex, ey, 54);

      // Fist: craggy knuckled boulder
      const r = 56;
      const fpts: Phaser.Geom.Point[] = [];
      const j = EarthKit.HEAD_JITTER;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        fpts.push(new Phaser.Geom.Point(a.fistX + Math.cos(ang) * r * j[i], a.fistY + Math.sin(ang) * r * j[(i + 3) % j.length]));
      }
      g.fillStyle(0x6d5c45, 1);
      g.fillPoints(fpts, true);
      g.lineStyle(5, 0x342b20, 1);
      g.strokePoints(fpts, true);
      g.fillStyle(0x7d6a50, 1);
      for (let k = 0; k < 4; k++) {
        g.fillCircle(a.fistX - 33 + k * 22, a.fistY - 22, 13);
      }
      // Knuckle lava glow while the arm is winding up or striking
      if (a.phase !== 'rest') {
        g.lineStyle(4, 0xff6a10, 0.5 + 0.4 * Math.sin(time / 90));
        g.strokeCircle(a.fistX, a.fistY, r + 6);
      }
      g.lineStyle(4, 0xff5a0f, 0.35 + 0.2 * Math.sin(time / 300 + a.side));
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
    g.fillStyle(0x1c1208, 0.85);
    g.fillRect(tr.x - 24, top, 48, bot - top);
    // …with a jagged molten seam down the middle.
    for (const [w, c, a] of [[10, 0xff5a0f, flicker], [4, 0xffd070, flicker * 0.9]] as const) {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(tr.x, top);
      for (let y = top; y <= bot; y += 40) g.lineTo(seam(y), y);
      g.lineTo(seam(bot), bot);
      g.strokePath();
    }
    // Broken slabs along both lips
    g.fillStyle(0x4a3d2d, 1);
    for (let y = top + 10; y < bot - 30; y += 66) {
      g.fillRect(tr.x - 34, y, 14, 30);
      g.fillRect(tr.x + 20, Math.min(y + 30, bot - 30), 14, 30);
    }
  }

  private drawTitanBeam(b: TitanBeam, time: number): void {
    const W = this.arena.width;
    const g = b.g;
    g.clear();
    const ox = W / 2;
    const oy = TITAN_MOUTH_Y;
    const jitter = Math.sin(time / 40) * 3;

    g.lineStyle(46 + jitter, 0x7a2a05, 0.35);
    g.lineBetween(ox, oy, b.x, b.y);
    g.lineStyle(26 + jitter, 0xff5a0f, 0.75);
    g.lineBetween(ox, oy, b.x, b.y);
    g.lineStyle(10, 0xffd070, 0.95);
    g.lineBetween(ox, oy, b.x, b.y);

    // Molten pool where it lands
    g.fillStyle(0xff5a0f, 0.5 + 0.2 * Math.sin(time / 100));
    g.fillCircle(b.x, b.y, 30 + Math.sin(time / 90) * 4);
    g.fillStyle(0xffd070, 0.8);
    g.fillCircle(b.x, b.y, 14);

    // Sparks kicking off the impact point
    g.lineStyle(3, 0xffbb55, 0.8);
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
      if (a.marker) a.marker.setScale(0.8 + 0.35 * Math.sin(time / 70));
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
    arm.marker = this.arena.scene.add.circle(tx, ty, 74, 0xff5a0f, 0.16).setDepth(4).setStrokeStyle(4, 0xff8844, 0.8);
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
      this.arena.spawnHitFlash(t.x, t.y, 0x665533);
      hit = true;
    }
    this.arena.showFloatingText(arm.targetX, arm.targetY - 40, hit ? '🖐 TITAN SMASH' : '🖐 SMASH', '#ccaa66');

    // Impact crater + dust ring
    const ring = this.arena.scene.add.circle(arm.targetX, arm.targetY, 20, 0x8b7a5f, 0.7).setDepth(5);
    this.arena.scene.tweens.add({ targets: ring, scaleX: 6, scaleY: 6, alpha: 0, duration: 460, onComplete: () => ring.destroy() });
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const puff = this.arena.scene.add.circle(arm.targetX, arm.targetY, 8 + Math.random() * 10, 0x6b5a44, 0.6).setDepth(5);
      this.arena.scene.tweens.add({
        targets: puff, x: arm.targetX + Math.cos(a) * (70 + Math.random() * 70), y: arm.targetY + Math.sin(a) * (70 + Math.random() * 70),
        alpha: 0, scale: 1.9, duration: 500, onComplete: () => puff.destroy(),
      });
    }

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
    const H = this.arena.height;
    if (this.titanWave) { this.titanWave.sprite.destroy(); this.titanWave.crest.destroy(); }
    const wallH = H - TITAN_PAD * 2;
    const sprite = this.arena.scene.add.rectangle(-110, H / 2, 180, wallH, 0x2f7d9e, 0.72).setDepth(18).setStrokeStyle(4, 0x88ddff, 0.8);
    const crest = this.arena.scene.add.rectangle(-18, H / 2, 34, wallH, 0xcdf3ff, 0.55).setDepth(19);
    this.titanWave = { x: -110, speed: 720, sprite, crest, hit: new Set<Fighter>(), slammed: false };
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
    // Craggy chunk drawn once around its own origin, then flown as a whole.
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = size * (0.72 + Math.random() * 0.5);
      pts.push(new Phaser.Geom.Point(Math.cos(a) * r, Math.sin(a) * r));
    }
    g.fillStyle(0x6d5c45, 1);
    g.fillPoints(pts, true);
    g.lineStyle(3, 0x342b20, 1);
    g.strokePoints(pts, true);
    g.lineStyle(2, 0xff5a0f, 0.7);
    g.lineBetween(-size * 0.4, -size * 0.2, size * 0.3, size * 0.4);
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
    const scene = this.arena.scene;
    const ring = scene.add.circle(r.lx, r.ly, 10, 0x8b7a5f, 0.7).setDepth(5);
    scene.tweens.add({ targets: ring, scaleX: 4.5, scaleY: 4.5, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    if (r.dmg <= 0) return;
    this.shake(170, 0.012);
    for (const t of this.titanTargets()) {
      if (Phaser.Math.Distance.Between(r.lx, r.ly, t.x, t.y) > r.radius) continue;
      t.takeDamage(r.dmg);
      this.arena.spawnHitFlash(t.x, t.y, 0x8b7a5f);
      this.arena.showFloatingText(t.x, t.y - 26, '🪨 ROCKFALL', '#ccaa66');
    }
  }

  private spawnTitanScorch(x: number, y: number, r: number, expiresAt: number): void {
    const sprite = this.arena.scene.add.circle(x, y, r, 0xff5522, 0.42).setDepth(3).setStrokeStyle(3, 0xffaa33, 0.7);
    this.titanScorch.push({ sprite, x, y, r, expiresAt });
    // Cap the ground clutter so a long beam + a full eruption can't pile up forever.
    while (this.titanScorch.length > 90) {
      const old = this.titanScorch.shift();
      old?.sprite.destroy();
    }
  }

  private titanExplosion(x: number, y: number, time: number): void {
    const scene = this.arena.scene;
    this.shake(220, 0.022);
    const blast = scene.add.circle(x, y, 18, 0xff7733, 0.85).setDepth(7);
    scene.tweens.add({ targets: blast, scaleX: 4.4, scaleY: 4.4, alpha: 0, duration: 380, onComplete: () => blast.destroy() });
    const core = scene.add.circle(x, y, 10, 0xffe08a, 0.95).setDepth(8);
    scene.tweens.add({ targets: core, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 240, onComplete: () => core.destroy() });
    for (const t of this.titanTargets()) {
      if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > 76) continue;
      t.takeDamage(20);
      this.arena.spawnHitFlash(t.x, t.y, 0xff7733);
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

  private spawnTsunamiWaves(): void {
    const W = this.arena.width;
    const H = this.arena.height;
    for (let ti = 0; ti < 2; ti++) {
      const horizontal = Math.random() < 0.5;
      let wx: number, wy: number, vx: number, vy: number;
      const speed = 420;
      if (horizontal) {
        const fromLeft = Math.random() < 0.5;
        wx = fromLeft ? -60 : W + 60;
        wy = Phaser.Math.Between(60, H - 60);
        vx = fromLeft ? speed : -speed;
        vy = 0;
      } else {
        const fromTop = Math.random() < 0.5;
        wx = Phaser.Math.Between(60, W - 60);
        wy = fromTop ? -60 : H + 60;
        vx = 0;
        vy = fromTop ? speed : -speed;
      }
      const wSpr = horizontal
        ? this.arena.scene.add.rectangle(wx, wy, 80, 200, 0x88ddff, 0.6).setDepth(5).setStrokeStyle(3, 0xaaeeff, 0.9)
        : this.arena.scene.add.rectangle(wx, wy, 200, 80, 0x88ddff, 0.6).setDepth(5).setStrokeStyle(3, 0xaaeeff, 0.9);
      this.earthTsunamiWaves.push({ sprite: wSpr, vx, vy, expiresAt: this.arena.scene.time.now + 4000 });
    }
    this.arena.showFloatingText(W / 2, H / 2 - 80, '🌊 TSUNAMI!', '#88ddff');
  }

  /** Quake perk (Gravity/other elements): spawn a single smaller tsunami wave radiating from an impact point. Public — called from non-earth perk code elsewhere in ArenaScene. */
  spawnQuakeWave(owner: 'player' | 'npc', impactX: number, impactY: number): void {
    const W = this.arena.width;
    const H = this.arena.height;
    // Push outward from impact toward either horizontal or vertical edge
    const horizontal = Math.random() < 0.5;
    let vx = 0, vy = 0;
    const speed = 300;
    if (horizontal) { vx = impactX < W / 2 ? speed : -speed; }
    else             { vy = impactY < H / 2 ? speed : -speed; }
    const wSpr = horizontal
      ? this.arena.scene.add.rectangle(impactX, impactY, 60, 120, 0x8844cc, 0.55).setDepth(5).setStrokeStyle(2, 0xcc88ff, 0.8)
      : this.arena.scene.add.rectangle(impactX, impactY, 120, 60, 0x8844cc, 0.55).setDepth(5).setStrokeStyle(2, 0xcc88ff, 0.8);
    this.earthTsunamiWaves.push({ sprite: wSpr, vx, vy, expiresAt: this.arena.scene.time.now + 3000, owner });
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
      const hp = hasDual
        ? (this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50))
        : this.earthShieldMaxHp;
      this.earthShieldHp = hp;
      if (!hasDual) this.earthShieldMaxHp = hp;
      this.earthShieldBroken = false;
      this.earthShieldRespawnAt = 0;
      if (this.earthShieldSprite) this.earthShieldSprite.destroy();
      const w = this.earthShieldEnhanced ? 55 : 46;
      const h = this.earthShieldEnhanced ? 14 : 12;
      const color = this.earthShieldEnhanced ? 0xffcc44 : (hasDual ? 0x888888 : 0x887755);
      const strokeColor = this.earthShieldEnhanced ? 0xffe899 : (hasDual ? 0xbbbbbb : 0xccaa66);
      this.earthShieldSprite = scene.add.rectangle(player.x, player.y, w, h, color).setDepth(7);
      this.earthShieldSprite.setStrokeStyle(2, strokeColor);
      if (!this.earthShieldLabel) {
        this.earthShieldLabel = scene.add.text(player.x, player.y - 30, '', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: hasDual ? '#bbbbbb' : '#ccaa66',
        }).setOrigin(0.5).setDepth(11);
      }
      // Also spawn back shield if Click+
      if (hasDual) {
        this.spawnEarthBackShield();
      }
      // Wire shield as damage absorber — directional: front blocks frontal hits, back blocks rear hits
      player.damageAbsorber = (amount: number) => {
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
      const w = this.npcEarthShieldEnhanced ? 55 : 46;
      const h = this.npcEarthShieldEnhanced ? 14 : 12;
      const npcShieldColor = this.npcEarthShieldEnhanced ? 0xffcc44 : 0x887755;
      const npcShieldStroke = this.npcEarthShieldEnhanced ? 0xffe899 : 0xccaa66;
      this.npcEarthShieldSprite = scene.add.rectangle(npc.x, npc.y, w, h, npcShieldColor).setDepth(7);
      this.npcEarthShieldSprite.setStrokeStyle(2, npcShieldStroke);
      if (!this.npcEarthShieldLabel) {
        this.npcEarthShieldLabel = scene.add.text(npc.x, npc.y - 30, '', {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ccaa66',
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

  private spawnEarthBackShield(): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    if (this.earthBackShieldSprite) this.earthBackShieldSprite.destroy();
    const maxHp = this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50);
    this.earthBackShieldMaxHp = maxHp;
    if (this.earthBackShieldHp <= 0) this.earthBackShieldHp = maxHp;
    const w = this.earthShieldEnhanced ? 55 : 46;
    const h = this.earthShieldEnhanced ? 14 : 12;
    this.earthBackShieldSprite = scene.add.rectangle(player.x, player.y, w, h, 0x888888).setDepth(6);
    this.earthBackShieldSprite.setStrokeStyle(2, 0xaaaaaa);
    if (!this.earthBackShieldLabel) {
      this.earthBackShieldLabel = scene.add.text(player.x, player.y - 30, '', {
        fontSize: '9px', fontFamily: '"Arial Black", sans-serif', color: '#aaaaaa',
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
        if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
        if (this.earthBackShieldSprite) { this.earthBackShieldSprite.destroy(); this.earthBackShieldSprite = null; }
        if (this.earthBackShieldLabel) { this.earthBackShieldLabel.destroy(); this.earthBackShieldLabel = null; }
        // Spawn new front shield with the transferred HP
        const maxHp = this.earthShieldEnhanced ? 100 : 50;
        const w = this.earthShieldEnhanced ? 55 : 46;
        const h = this.earthShieldEnhanced ? 14 : 12;
        this.earthShieldSprite = scene.add.rectangle(player.x, player.y, w, h, 0x888888).setDepth(7);
        this.earthShieldSprite.setStrokeStyle(2, 0xbbbbbb);
        this.earthShieldBroken = false;
        this.earthShieldRespawnAt = 0;
        void maxHp;
        this.arena.showFloatingText(player.x, player.y - 30, '🛡 BACK SHIELD ACTIVATED', '#aaaaaa');
        return;
      }
      this.earthShieldHp = 0;
      this.earthShieldBroken = true;
      this.earthShieldRespawnAt = respawnAt;
      if (this.earthShieldSprite) { this.earthShieldSprite.destroy(); this.earthShieldSprite = null; }
      player.damageAbsorber = null;
      this.arena.showFloatingText(player.x, player.y - 30, '💥 SHIELD BROKEN', '#ff8844');
    } else {
      this.npcEarthShieldHp = 0;
      this.npcEarthShieldBroken = true;
      this.npcEarthShieldRespawnAt = respawnAt;
      if (this.npcEarthShieldSprite) { this.npcEarthShieldSprite.destroy(); this.npcEarthShieldSprite = null; }
      npc.damageAbsorber = null;
      this.arena.showFloatingText(npc.x, npc.y - 30, '💥 SHIELD BROKEN', '#ff8844');
    }
  }

  private updateEarthShieldSpritePosition(isPlayer: boolean): void {
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
      sprite.setPosition(fighter.x + Math.cos(ang) * shieldDist, fighter.y + Math.sin(ang) * shieldDist);
      sprite.setRotation(ang + Math.PI / 2);
    }
    if (label) {
      label.setPosition(fighter.x + Math.cos(ang) * 36, fighter.y + Math.sin(ang) * 36 - 16);
      label.setText(`🛡${Math.floor(hp)}/${maxHp}`);
    }
    // Back shield (Click+ only)
    if (isPlayer && this.earthBackShieldSprite && this.earthBackShieldHp > 0) {
      const backAng = ang + Math.PI;
      const backDist = 28;
      this.earthBackShieldSprite.setPosition(
        fighter.x + Math.cos(backAng) * backDist,
        fighter.y + Math.sin(backAng) * backDist,
      );
      this.earthBackShieldSprite.setRotation(backAng + Math.PI / 2);
      if (this.earthBackShieldLabel) {
        this.earthBackShieldLabel.setPosition(
          fighter.x + Math.cos(backAng) * 36,
          fighter.y + Math.sin(backAng) * 36 - 14,
        );
        const bMaxHp = this.earthShieldEnhanced ? 100 : (this.arena.hasPerk('player', 'obsidian') ? 75 : 50);
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
    const color = lava ? 0xff4400 : 0x887755;
    const strokeColor = lava ? 0xff8844 : 0xccaa66;
    const r = this.arena.scene.add.circle(0, 0, 8, color).setDepth(8).setStrokeStyle(1, strokeColor);
    const rock = { sprite: r, hitCdUntil: 0 };
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
    launched.push({ sprite: rock.sprite, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, spawnedAt: this.arena.scene.time.now });
    if (isPlayer) this.earthRocks.splice(idx, 1); else this.npcEarthRocks.splice(idx, 1);
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
    } else {
      this.npcEarthShieldHp = 0;
      this.npcEarthShieldBroken = true;
      this.npcEarthShieldRespawnAt = 0;
      if (this.npcEarthShieldSprite) { this.npcEarthShieldSprite.destroy(); this.npcEarthShieldSprite = null; }
    }

    const sprite = scene.add.rectangle(shieldX, shieldY, 48, 48, 0x665533).setDepth(6).setStrokeStyle(2, 0xbbaa77);
    const link = scene.add.graphics().setDepth(5);
    const hpLabel = scene.add.text(shieldX, shieldY - 36, '💪 150', {
      fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#ccaa66',
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
        this.arena.spawnHitFlash(this.earthGolemX, this.earthGolemY, 0x665533);
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
  }

  private endEarthGolem(isPlayer: boolean): void {
    const scene = this.arena.scene;
    if (isPlayer) {
      if (this.earthGolemSprite) { this.earthGolemSprite.destroy(); this.earthGolemSprite = null; }
      if (this.earthGolemLink) { this.earthGolemLink.destroy(); this.earthGolemLink = null; }
      if (this.earthGolemFaultWallSprite) { this.earthGolemFaultWallSprite.destroy(); this.earthGolemFaultWallSprite = null; }
      if (this.earthGolemHpLabel) { this.earthGolemHpLabel.destroy(); this.earthGolemHpLabel = null; }
      this.earthGolemActive = false;
      this.earthGolemHp = 0;
      this.arena.player.damageAbsorber = null; // clear golem redirect
      this.earthShieldRespawnAt = scene.time.now + 8000; // shield respawn starts now
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '🗿 GOLEM FALLS', '#887755');
    } else {
      if (this.npcEarthGolemSprite) { this.npcEarthGolemSprite.destroy(); this.npcEarthGolemSprite = null; }
      if (this.npcEarthGolemLink) { this.npcEarthGolemLink.destroy(); this.npcEarthGolemLink = null; }
      if (this.npcEarthGolemFaultWallSprite) { this.npcEarthGolemFaultWallSprite.destroy(); this.npcEarthGolemFaultWallSprite = null; }
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

    if (golemSprite) golemSprite.setPosition(moveX, moveY);
    if (golemLink) {
      golemLink.clear();
      golemLink.lineStyle(2, 0x887755, 0.7);
      golemLink.lineBetween(owner.x, owner.y, moveX, moveY);
    }
    if (golemHpLabel) {
      golemHpLabel.setPosition(moveX, moveY - 36);
      golemHpLabel.setText(`💪 ${Math.ceil(golemHp)}`);
    }

    // Golem abilities
    if (dist > 260 && time >= faultCdUntil) {
      // Fault Line: spawn wall at midpoint, deal 25 dmg
      const midX = (golemX + target.x) / 2;
      const midY = (golemY + target.y) / 2;
      const wallSprite = this.arena.scene.add.rectangle(midX, midY, 140, 18, 0x887755).setDepth(7).setStrokeStyle(2, 0xccaa66);
      this.arena.showFloatingText(midX, midY - 20, '⛰ FAULT LINE', '#ccaa66');
      target.takeDamage(25);
      this.arena.spawnHitFlash(target.x, target.y, 0x887755);
      const wallExpiry = time + 1500;
      if (isPlayer) {
        if (this.earthGolemFaultWallSprite) this.earthGolemFaultWallSprite.destroy();
        this.earthGolemFaultWallSprite = wallSprite;
        this.earthGolemFaultWallUntil = wallExpiry;
        this.earthGolemFaultCdUntil = time + 5000;
      } else {
        if (this.npcEarthGolemFaultWallSprite) this.npcEarthGolemFaultWallSprite.destroy();
        this.npcEarthGolemFaultWallSprite = wallSprite;
        this.npcEarthGolemFaultWallUntil = wallExpiry;
        this.npcEarthGolemFaultCdUntil = time + 5000;
      }
    } else if (dist < 90 && time >= poundCdUntil) {
      // Pound: heavy AoE close range
      target.takeDamage(45);
      this.arena.spawnHitFlash(target.x, target.y, 0x887755);
      const ring = this.arena.scene.add.circle(moveX, moveY, 10, 0x887755, 0.8).setDepth(6);
      this.arena.scene.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      this.arena.showFloatingText(target.x, target.y - 20, '💥 POUND', '#ccaa66');
      if (isPlayer) this.earthGolemPoundCdUntil = time + 10000; else this.npcEarthGolemPoundCdUntil = time + 10000;
    } else if (dist < 90 && time >= punchCdUntil) {
      // Punch: quick melee hit
      target.takeDamage(18);
      this.arena.spawnHitFlash(target.x, target.y, 0x887755);
      this.arena.showFloatingText(target.x, target.y - 20, '👊 PUNCH', '#ccaa66');
      if (isPlayer) this.earthGolemPunchCdUntil = time + 2000; else this.npcEarthGolemPunchCdUntil = time + 2000;
    }

    // Fault wall cleanup
    const faultWall = isPlayer ? this.earthGolemFaultWallSprite : this.npcEarthGolemFaultWallSprite;
    const faultUntil = isPlayer ? this.earthGolemFaultWallUntil : this.npcEarthGolemFaultWallUntil;
    if (faultWall && time >= faultUntil) {
      faultWall.destroy();
      if (isPlayer) this.earthGolemFaultWallSprite = null; else this.npcEarthGolemFaultWallSprite = null;
    }
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void delta;
    const player = this.arena.player;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

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
        this.earthTitanChargeVisual = this.arena.scene.add.circle(player.x, player.y - 36, 10, 0x665533, 0.7).setDepth(14);
        this.arena.scene.tweens.add({ targets: this.earthTitanChargeVisual, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
      }
      if (!this.arena.qKey.isDown && this.earthTitanChargeHolding) {
        const heldMs = time - this.earthTitanChargeStart;
        if (this.earthTitanChargeVisual) { this.earthTitanChargeVisual.destroy(); this.earthTitanChargeVisual = null; }
        this.earthTitanChargeHolding = false;
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
        }
      }
    }

    if (this.earthBashCharging) {
      const hasDual = this.arena.hasUpgrade('click');
      const baseShieldColor = this.earthShieldEnhanced ? 0xffcc44 : (hasDual ? 0x888888 : 0x887755);
      if (clickDown) {
        const held = time - this.earthBashChargeStart;
        this.earthBashChargeRatio = Math.min(1, held / 900);
        if (this.arena.elementId === 'earth') player.chargeRatio = this.earthBashChargeRatio;
        if (this.earthShieldSprite) {
          // Lerp the shield's fill color from its normal color toward red as charge builds.
          const lerped = Phaser.Display.Color.ObjectToColor(
            Phaser.Display.Color.Interpolate.ColorWithColor(
              Phaser.Display.Color.IntegerToColor(baseShieldColor),
              Phaser.Display.Color.IntegerToColor(0xff2222),
              100,
              Math.round(this.earthBashChargeRatio * 100),
            ),
          ).color;
          this.earthShieldSprite.setFillStyle(lerped);
        }
      } else {
        const ratio = this.earthBashChargeRatio;
        this.earthBashCharging = false;
        this.earthBashChargeRatio = 0;
        if (this.arena.elementId === 'earth') player.chargeRatio = 0;
        if (this.earthShieldSprite) this.earthShieldSprite.setFillStyle(baseShieldColor);
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
      }
      if (this.arena.eKey.isDown && this.earthSplinterHolding && !this.earthSplinterReady && time - this.earthSplinterHoldStart >= 2000) {
        this.earthSplinterReady = true;
        this.arena.showFloatingText(player.x, player.y - 30, '💥 SPLINTER READY', '#ff4444');
      }
      if (!this.arena.eKey.isDown && this.earthSplinterHolding) {
        const heldMs = time - this.earthSplinterHoldStart;
        this.earthSplinterHolding = false;
        this.earthSplinterReady = false;
        if (this.earthShieldSprite) this.earthShieldSprite.setScale(1).setFillStyle(this.arena.hasUpgrade('click') ? 0x888888 : 0x887755);
        if (heldMs >= 2000 && this.earthShieldHp > 0) {
          // Explode: AoE = 1/3 combined shield HP
          const totalHp = this.earthShieldHp + (this.arena.hasUpgrade('click') ? this.earthBackShieldHp : 0);
          const aoeDmg = Math.round(totalHp / 3);
          const dist = Phaser.Math.Distance.Between(player.x, player.y, this.arena.npc.x, this.arena.npc.y);
          if (dist < 120) {
            this.arena.npc.takeDamage(aoeDmg);
            this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, 0xff2222);
            this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 20, `💥 SPLINTER ${aoeDmg}`, '#ff4444');
            if (this.arena.npc.hp <= 0) this.arena.recordMasteryStat('splinterKills', 1);
          }
          const ring = this.arena.scene.add.circle(player.x, player.y, 10, 0xff2222, 0.8).setDepth(6);
          this.arena.scene.tweens.add({ targets: ring, scaleX: 14, scaleY: 14, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
          // Launch a shield projectile forward
          const ang = this.earthShieldAngle;
          const projSpr = this.arena.scene.add.rectangle(player.x, player.y, 20, 8, 0xcccccc).setDepth(8).setRotation(ang + Math.PI / 2);
          const pvx = Math.cos(ang) * 600;
          const pvy = Math.sin(ang) * 600;
          const projSpawnedAt = time;
          const projRef = { x: player.x, y: player.y, spr: projSpr, hit: false, spawnedAt: projSpawnedAt };
          const projTimer = this.arena.scene.time.addEvent({ delay: 16, loop: true, callback: () => {
            if (projRef.hit || this.arena.scene.time.now - projRef.spawnedAt > 1500) {
              if (!projRef.hit) projSpr.destroy();
              projTimer.remove();
              return;
            }
            projRef.x += pvx * 0.016;
            projRef.y += pvy * 0.016;
            projSpr.setPosition(projRef.x, projRef.y);
            const pd = Phaser.Math.Distance.Between(projRef.x, projRef.y, this.arena.npc.x, this.arena.npc.y);
            if (pd < 28) {
              projRef.hit = true;
              this.arena.npc.takeDamage(20);
              this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, 0xcccccc);
              this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 20, '🛡 SHARD 20', '#cccccc');
              if (this.arena.npc.hp <= 0) this.arena.recordMasteryStat('splinterKills', 1);
              this.earthSplinterRepairFast = true; // next break → 4s repair
              projSpr.destroy();
              projTimer.remove();
            }
          }});
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
            this.earthRepairActive = true;
            this.earthRepairEnd = time + 3000;
            if (this.earthRepairAura) this.earthRepairAura.destroy();
            this.earthRepairAura = this.arena.scene.add.circle(player.x, player.y, 28, 0x887755, 0.4).setDepth(6);
            this.arena.scene.tweens.add({ targets: this.earthRepairAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 400 });
            this.arena.showFloatingText(player.x, player.y - 30, '🔧 REPAIR', '#ccaa66');
          }
        }
      }
    } else {
      // Base E: Repair
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
        if (player.castAbility('repair', playerCtx)) {
          this.earthRepairActive = true;
          this.earthRepairEnd = time + 3000;
          if (this.earthRepairAura) this.earthRepairAura.destroy();
          this.earthRepairAura = this.arena.scene.add.circle(player.x, player.y, 28, 0x887755, 0.4).setDepth(6);
          this.arena.scene.tweens.add({ targets: this.earthRepairAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 400 });
          this.arena.showFloatingText(player.x, player.y - 30, '🔧 REPAIR', '#ccaa66');
        }
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

    const gfx = this.arena.scene.add.graphics().setDepth(4);
    gfx.fillStyle(0xaa9977, 0.32);
    gfx.slice(origin.x, origin.y, DUST_SCREEN_RANGE, angle - halfAngleRad, angle + halfAngleRad, false);
    gfx.fillPath();
    this.arena.scene.tweens.add({ targets: gfx, alpha: 0, duration: 450, onComplete: () => gfx.destroy() });
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
        this.arena.applyScreenBlur(DUST_SCREEN_EFFECT_MS);
      }
    }
  }
}
