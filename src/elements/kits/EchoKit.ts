import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { HealthBar } from '../../combat/HealthBar';

// ── Arena API ────────────────────────────────────────────────────────────────

export interface EchoArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get pointer(): Phaser.Input.Pointer;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  get npcElementId(): string;
  /** The ability id the NPC cast this frame, or null. Drives Vibration Detection's cast pings. */
  get npcCastId(): string | null;
  /** Echo Mastery is on for the local player this match. */
  get masteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  broadcastMasteryCast(enhId: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageToNpc(cx: number, cy: number, radius: number, damage: number): void;
  dealAoeDamageToPlayer(cx: number, cy: number, radius: number, damage: number): void;
  lockCaster(owner: 'player' | 'npc', durationMs: number): void;
  healCaster(owner: 'player' | 'npc', amount: number): void;
  startCooldown(owner: 'player' | 'npc', abilityId: string): void;
  getSceneWidth(): number;
  getSceneHeight(): number;
  fogOverlay(): Phaser.GameObjects.RenderTexture | null;
  isEclipseRevealActive(): boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface EchoProj {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounceCount: number;
  lastBounceAt: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface GuessReveal {
  x: number;
  y: number;
  expiresAt: number;
}

interface EchoSummon {
  sprite: Phaser.GameObjects.Arc;
  hpBar: HealthBar;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  owner: 'player' | 'npc';
  expiresAt: number;
  shootAccum: number;
  lightGfx: Phaser.GameObjects.Graphics | null;
}

interface EclipseLine {
  gfx: Phaser.GameObjects.Graphics;
  cx: number;
  cy: number;
  angle: number;
  len: number;
  detonateAt: number;
  owner: 'player' | 'npc';
}

interface BatAttach {
  targetRef: Fighter;
  drainAccum: number;
  endsAt: number;
  owner: 'player' | 'npc';
}

interface PsychicEye {
  sprite: Phaser.GameObjects.Image;
  angleOffset: number;
}

interface LightTrail {
  gfx: Phaser.GameObjects.Graphics;
  pts: { x: number; y: number }[];
  expiresAt: number;
  lastTickAt: number;
}

interface BatTracker {
  targetRef: Fighter;
  expiresAt: number;
  lastPingAt: number;
}

// ── Mastery: Echo Bloom ──────────────────────────────────────────────────────

const BLOOM_COOLDOWN_MS = 12000;
/** Blooms one owner may keep planted. Planting past this replaces the oldest. */
const BLOOM_MAX = 3;
const BLOOM_SEED_SPEED = 540;
/** Hold the bound key this long to open the bloom's eye instead of planting a seed. */
const BLOOM_HOLD_MS = 220;
const BLOOM_VIEW_RADIUS = 76;
/** Terror blooms see by heat trail, so their own pool of light is deliberately meaner. */
const TERROR_VIEW_RADIUS = 50;
const BLOOM_SHOT_COOLDOWN_MS = 350;
const BLOOM_SHOT_SPEED = 620;
const BLOOM_SHOT_DAMAGE = 5;
const TERROR_SHOT_DAMAGE = 10;
const BLOOM_SHOT_LIFETIME_MS = 2200;
const TERROR_LIFETIME_MS = 15000;
/** Outgoing-damage multiplier applied to whoever a terror bloom is rooted in. */
const TERROR_WEAKEN_MULT = 0.75;
const VIEW_SHIELD_HP = 100;
const VIEW_SELF_SHOT_SHIELD = 25;
const TERROR_WARP_WEAK_HP = 100;
const BIOLUM_MS = 8000;
const BIOLUM_RADIUS_MULT = 1.25;
/** How far back the heat trail a terror bloom paints reaches. */
const HEAT_TRAIL_MS = 6000;
const HEAT_TRAIL_SAMPLE_MS = 70;
const ECHO_BLOOM_COLOR = 0xaab4ff;
const TERROR_BLOOM_COLOR = 0xdd2c44;

interface Blossom {
  kind: 'echo' | 'terror';
  x: number;
  y: number;
  gfx: Phaser.GameObjects.Graphics;
  /** Fighter the bloom is rooted in; null once it is planted in scenery (or its host died). */
  host: Fighter | null;
  offX: number;
  offY: number;
  bornAt: number;
  /** Infinity for echo blooms — they only ever leave by being replaced or spent. */
  expiresAt: number;
  owner: 'player' | 'npc';
  /** True while this bloom's 25% weaken is folded into its host's outgoingDamageMult. */
  weakenApplied: boolean;
  swaySeed: number;
}

interface BloomSeed {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  trail: { x: number; y: number }[];
}

interface BloomBullet {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  kind: 'echo' | 'terror';
  owner: 'player' | 'npc';
  bornAt: number;
}

/** One quadrant flare of the Vibration Detection ring. */
interface VibeArc {
  quadrant: number;
  bornAt: number;
  strong: boolean;
}

interface HeatSample {
  x: number;
  y: number;
  at: number;
}

// ── EchoKit ──────────────────────────────────────────────────────────────────

export class EchoKit {
  private arena: EchoArenaApi;

  // Fog
  private fogEraser: Phaser.GameObjects.Graphics | null = null;
  private fogInitialized = false;
  private _eclipseRevealActive = false;
  private eclipseRevealUntil = 0;

  // Echolocation projectiles
  private echoProjs: EchoProj[] = [];

  // Guess
  private guessReveals: GuessReveal[] = [];
  private playerGuessSlowUntil = 0;
  private npcGuessSlowUntil = 0;

  // Q+ Hypersense (auto-dodge window granted by a non-direct eclipse)
  private playerHypersenseUntil = 0;

  // Lantern
  private playerLanternActive = false;
  private playerLanternHp = 0;
  private npcLanternActive = false;
  private playerLanternIndicator: Phaser.GameObjects.Arc | null = null;

  // Echo summons
  private echoSummons: EchoSummon[] = [];

  // Bat form
  private playerBatFormActive = false;
  private playerBatFormEndsAt = 0;
  private playerBatAttach: BatAttach | null = null;
  private npcBatFormActive = false;
  private npcBatFormEndsAt = 0;
  private npcBatAttach: BatAttach | null = null;

  // Eclipse lines
  private eclipseLines: EclipseLine[] = [];
  private eclipseRevealNpcRandomDir = 0;
  private eclipseRevealNpcChangeDirAt = 0;

  // NPC cooldown tracking
  private npcShotAt = 0;
  private npcGuessAt = 0;
  private npcLanternAt = 0;
  private npcBatAt = 0;
  private npcEclipseAt = 0;

  // Psychic eyes (E+/Q+)
  private playerEyes: PsychicEye[] = [];
  private playerEyePowerUpArmed = false;
  private playerLightTrails: LightTrail[] = [];
  private _prevRightDown = false;

  // Lantern heal (R+)
  private playerLanternHealAccum = 0;
  private playerLanternHealTextAccum = 0;

  // Bat tracker (F+)
  private playerBatTracker: BatTracker | null = null;

  // Beacon perk (abstract-triple)
  private playerBeaconBatteries = 3;
  private playerBeaconRechargeAt: number[] = [0, 0, 0];
  private playerBeaconBatteryIcons: Phaser.GameObjects.Text[] = [];
  private playerBeaconConeBoostUntil = 0;
  private playerBeaconIconsCreated = false;

  // ── Mastery: Echo Bloom ─────────────────────────────────────────────
  private playerBlossoms: Blossom[] = [];
  private npcBlossoms: Blossom[] = [];
  private bloomSeeds: BloomSeed[] = [];
  private bloomBullets: BloomBullet[] = [];
  private bloomLastCastAt = -BLOOM_COOLDOWN_MS;
  private bloomKeyDownAt = 0;
  /** Set once a hold has opened the eye, so the matching key-up doesn't also plant a seed. */
  private bloomHoldConsumed = false;
  private viewing = false;
  private viewIndex = 0;
  private lastBloomShotAt = -BLOOM_SHOT_COOLDOWN_MS;
  private playerBiolumUntil = 0;
  private biolumGfx: Phaser.GameObjects.Graphics | null = null;
  /** Which bloom the remote echo player is looking through, mirrored for their shots. */
  private npcViewIndex = 0;

  // ── Mastery: Vibration Detection ────────────────────────────────────
  private vibeGfx: Phaser.GameObjects.Graphics | null = null;
  private vibeArcs: VibeArc[] = [];
  private vibeLastEnemyX = 0;
  private vibeLastEnemyY = 0;
  private vibeNextSampleAt = 0;
  private vibeNextMoveArcAt = 0;

  // Heat trail (painted only while looking through a terror bloom)
  private heatTrail: HeatSample[] = [];
  private heatNextSampleAt = 0;
  private heatGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(arena: EchoArenaApi) {
    this.arena = arena;
  }

  reset(): void {
    // Destroy all active graphics
    for (const p of this.echoProjs) p.gfx.destroy();
    this.echoProjs = [];
    for (const s of this.echoSummons) { s.sprite.destroy(); s.hpBar.destroy(); }
    this.echoSummons = [];
    for (const l of this.eclipseLines) l.gfx.destroy();
    this.eclipseLines = [];
    this.guessReveals = [];

    this.playerGuessSlowUntil = 0;
    this.npcGuessSlowUntil = 0;
    this.playerHypersenseUntil = 0;
    this.playerLanternActive = false;
    this.npcLanternActive = false;
    if (this.playerLanternIndicator?.active) { this.playerLanternIndicator.destroy(); }
    this.playerLanternIndicator = null;
    this.playerBatFormActive = false;
    this.playerBatFormEndsAt = 0;
    this.playerBatAttach = null;
    this.npcBatFormActive = false;
    this.npcBatFormEndsAt = 0;
    this.npcBatAttach = null;
    this._eclipseRevealActive = false;
    this.eclipseRevealUntil = 0;

    // Psychic eyes / light trails
    for (const eye of this.playerEyes) eye.sprite.destroy();
    this.playerEyes = [];
    this.playerEyePowerUpArmed = false;
    for (const trail of this.playerLightTrails) trail.gfx.destroy();
    this.playerLightTrails = [];
    this.playerLanternHealAccum = 0;
    this.playerLanternHealTextAccum = 0;
    this.playerBatTracker = null;

    // Beacon perk reset
    this.playerBeaconBatteries = 3;
    this.playerBeaconRechargeAt = [0, 0, 0];
    for (const icon of this.playerBeaconBatteryIcons) icon.destroy();
    this.playerBeaconBatteryIcons = [];
    this.playerBeaconConeBoostUntil = 0;
    this.playerBeaconIconsCreated = false;

    // Mastery — Echo Bloom
    for (const b of [...this.playerBlossoms, ...this.npcBlossoms]) this.releaseBlossom(b);
    this.playerBlossoms = [];
    this.npcBlossoms = [];
    for (const s of this.bloomSeeds) s.gfx.destroy();
    this.bloomSeeds = [];
    for (const b of this.bloomBullets) b.gfx.destroy();
    this.bloomBullets = [];
    this.bloomLastCastAt = -BLOOM_COOLDOWN_MS;
    this.bloomKeyDownAt = 0;
    this.bloomHoldConsumed = false;
    this.viewing = false;
    this.viewIndex = 0;
    this.npcViewIndex = 0;
    this.lastBloomShotAt = -BLOOM_SHOT_COOLDOWN_MS;
    this.playerBiolumUntil = 0;

    // Mastery — Vibration Detection. Graphics are rebuilt lazily; a scene shutdown
    // destroys the old ones, so drop the stale handles rather than reusing them.
    this.vibeArcs = [];
    this.vibeNextSampleAt = 0;
    this.vibeNextMoveArcAt = 0;
    this.vibeLastEnemyX = 0;
    this.vibeLastEnemyY = 0;
    this.heatTrail = [];
    this.heatNextSampleAt = 0;
    for (const g of [this.vibeGfx, this.heatGfx, this.biolumGfx]) g?.destroy();
    this.vibeGfx = null;
    this.heatGfx = null;
    this.biolumGfx = null;

    // Initialize fog eraser — recreate if destroyed (scene shutdown destroys game objects)
    if (!this.fogEraser || !this.fogEraser.active) {
      this.fogEraser = this.arena.scene.add.graphics();
      this.fogEraser.setVisible(false);
    }
    this.fogInitialized = false;
  }

  // Called by ArenaScene to know if eclipse is active (for NPC random aim)
  isEclipseRevealActive(): boolean {
    return this._eclipseRevealActive;
  }

  /** Q+ Hypersense window — ArenaScene auto-dodges incoming attacks while this is true. */
  isHypersenseActive(): boolean {
    return this.arena.scene.time.now < this.playerHypersenseUntil;
  }

  // Speed mults for ArenaScene to apply
  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    if (this.playerBatFormActive) return 2.0;
    if (this.playerBatAttach) return 0; // locked during attach
    if (this.playerGuessSlowUntil > time) return 0.5;
    return 1.0;
  }

  getNpcSpeedMult(): number {
    const time = this.arena.scene.time.now;
    if (this.npcBatFormActive) return 2.0;
    if (this.npcBatAttach) return 0;
    if (this.npcGuessSlowUntil > time) return 0.5;
    return 1.0;
  }

  isPlayerBatAttaching(): boolean {
    return this.playerBatAttach !== null;
  }

  isNpcBatAttaching(): boolean {
    return this.npcBatAttach !== null;
  }

  // ── Player input ─────────────────────────────────────────────────────────

  handleInput(time: number, _delta: number, pointer: Phaser.Input.Pointer, mx: number, my: number): void {
    const player = this.arena.player;
    const enemy = this.arena.npc;

    // Mastery — Echo Bloom owns whichever slot it is bound to, and while its eye is
    // open it owns click/right-click/Space too. Run it before the bat-attach guard so
    // the eye can still be closed if something roots you mid-view.
    const bloomSlot = this.arena.masteryActive ? this.bloomSlot() : null;
    if (bloomSlot) this.handleBloomInput(time, bloomSlot, pointer, mx, my);
    if (this.viewing) {
      this._prevPointerDown = pointer.isDown;
      this._prevRightDown = pointer.rightButtonDown();
      return;
    }

    // Block input during bat attach
    if (this.playerBatAttach) return;
    // Block non-shot input during bat form
    const batBlocked = this.playerBatFormActive;

    // Click — Echolocation
    if (pointer.isDown && !this._prevPointerDown) {
      if (player.getCooldownRatio('echo-shot') >= 1) {
        this.doEcholocation(mx, my, 'player');
        player.startCooldown('echo-shot');
      }
    }
    this._prevPointerDown = pointer.isDown;

    // Right-click — Psychic Energy power-up (E+/Q+)
    const rightDown = pointer.rightButtonDown();
    if (rightDown && !this._prevRightDown && this.playerEyes.length > 0 && !this.playerEyePowerUpArmed) {
      if (this.arena.hasUpgrade('e') || this.arena.hasUpgrade('q')) {
        const consumedEye = this.playerEyes.shift()!;
        consumedEye.sprite.destroy();
        this.playerEyePowerUpArmed = true;
        this.arena.showFloatingText(player.x, player.y - 36, '👁 Power!', '#ff5566');
      }
    }
    this._prevRightDown = rightDown;

    if (!batBlocked) {
      // E — Guess
      if (bloomSlot !== 'e' && Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
        if (player.getCooldownRatio('echo-guess') >= 1) {
          let etx = mx, ety = my;
          if (this.playerEyePowerUpArmed) { etx = enemy.x; ety = enemy.y; this.playerEyePowerUpArmed = false; }
          const hit = this.doGuess(etx, ety, 'player');
          player.startCooldown('echo-guess');
          // E+ Paranoia: a correct guess drops the guess cooldown to 1s (base 5s).
          if (hit && this.arena.hasUpgrade('e')) {
            player.reduceCooldown('echo-guess', 4000);
            this.arena.showFloatingText(player.x, player.y - 52, '👁 Paranoia', '#ffbbff');
          }
        }
      }

      // R — Lantern (Beacon perk: battery-gated)
      if (bloomSlot !== 'r' && Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
        if (player.getCooldownRatio('echo-lantern') >= 1) {
          let rtx = mx, rty = my;
          if (this.playerEyePowerUpArmed) { rtx = enemy.x; rty = enemy.y; this.playerEyePowerUpArmed = false; }
          if (this.arena.hasPerk('player', 'beacon')) {
            const nearEnemy = Phaser.Math.Distance.Between(rtx, rty, enemy.x, enemy.y) <= 35 && enemy.hp > 0;
            const need = nearEnemy ? 2 : 1;
            if (this.playerBeaconBatteries >= need) {
              const now = this.arena.scene.sys.game.loop.now;
              this._spendBeaconBatteries(need, now);
              if (!nearEnemy) this.playerBeaconConeBoostUntil = now + 2000;
              this.doLantern(rtx, rty, 'player');
              player.startCooldown('echo-lantern');
              this._updateBeaconIcons();
            } else {
              this.arena.showFloatingText(player.x, player.y - 36, '🔋 EMPTY', '#ff9900');
            }
          } else {
            this.doLantern(rtx, rty, 'player');
            player.startCooldown('echo-lantern');
          }
        }
      }

      // Q — Eclipse
      if (bloomSlot !== 'q' && Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
        if (player.getCooldownRatio('echo-eclipse') >= 1) {
          let qtx = mx, qty = my;
          if (this.playerEyePowerUpArmed) { qtx = enemy.x; qty = enemy.y; this.playerEyePowerUpArmed = false; }
          this.doEclipse(qtx, qty, 'player');
          player.startCooldown('echo-eclipse');
        }
      }
    }

    // F — Bat Form (F+ allows recast to cancel; otherwise only usable outside bat form)
    if (bloomSlot !== 'f' && Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (this.playerBatFormActive && !this.playerBatAttach && this.arena.hasUpgrade('f')) {
        // Alpha Bat cancel — free, no cooldown spent
        this.playerBatFormActive = false;
        this.playerBatFormEndsAt = 0;
        player.setScale(1.0);
        player.clearTint();
      } else if (!batBlocked && player.getCooldownRatio('echo-bat') >= 1) {
        let ftx = mx, fty = my;
        if (this.playerEyePowerUpArmed) { ftx = enemy.x; fty = enemy.y; this.playerEyePowerUpArmed = false; }
        this.doBatForm(ftx, fty, 'player');
        player.startCooldown('echo-bat');
      }
    }
  }

  private _prevPointerDown = false;

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayer: boolean, isNpc: boolean): void {
    this.updateFog(time);
    this.updateEchoProjs(time, delta);
    this.updateEchoSummons(time, delta, isPlayer);
    this.updateEclipseLines(time, isPlayer);
    this.updateGuessReveals(time);
    if (isPlayer) this.updateBatForm(time, 'player');
    if (isNpc) this.updateBatForm(time, 'npc');
    this.checkLanternShatter(time, isPlayer, isNpc);
    if (isNpc) this.updateNpcEclipseRandom(time);
    if (isPlayer) this.updateLanternIndicator();
    if (isPlayer) {
      this.updateEyes(time);
      this.updateLightTrails(time);
      this.updateLanternHeal(delta);
      this.updateBatTracker(time);
      this.updateBeaconBatteries(time);
    }
    // Mastery — the bloom sim runs for either side; the passive is player-only.
    if (isPlayer && this.arena.masteryActive) {
      this.updateVibrationDetection(time);
      this.updateHeatTrail(time);
      this.updateBiolum(time);
    }
    this.updateBloomSeeds(time, delta);
    this.updateBlossoms(time);
    this.updateBloomBullets(time, delta);
    if (isPlayer && this.arena.masteryActive) this.updateViewing();
  }

  private updateBeaconBatteries(time: number): void {
    if (!this.arena.hasPerk('player', 'beacon')) return;
    const player = this.arena.player;
    // Lazy-create battery icons
    if (!this.playerBeaconIconsCreated) {
      this.playerBeaconIconsCreated = true;
      for (let i = 0; i < 3; i++) {
        const icon = this.arena.scene.add.text(0, 0, '🔋', { fontSize: '14px' }).setOrigin(0.5).setDepth(20);
        this.playerBeaconBatteryIcons.push(icon);
      }
    }
    // Recharge spent batteries
    for (let i = 0; i < 3; i++) {
      if (this.playerBeaconRechargeAt[i] > 0 && time >= this.playerBeaconRechargeAt[i]) {
        this.playerBeaconRechargeAt[i] = 0;
        this.playerBeaconBatteries = Math.min(3, this.playerBeaconBatteries + 1);
        this.arena.showFloatingText(player.x, player.y - 50, '🔋 +1', '#ffee44');
        this._updateBeaconIcons();
      }
    }
    // Reposition icons above player
    for (let i = 0; i < this.playerBeaconBatteryIcons.length; i++) {
      const icon = this.playerBeaconBatteryIcons[i];
      icon.setPosition(player.x + (i - 1) * 16, player.y - 48);
      icon.setAlpha(i < this.playerBeaconBatteries ? 1 : 0.3);
    }
  }

  private _spendBeaconBatteries(count: number, now: number): void {
    for (let spent = 0; spent < count; spent++) {
      this.playerBeaconBatteries = Math.max(0, this.playerBeaconBatteries - 1);
      // Fill lowest empty recharge slot
      for (let j = 0; j < 3; j++) {
        if (this.playerBeaconRechargeAt[j] === 0) {
          this.playerBeaconRechargeAt[j] = now + 8000;
          break;
        }
      }
    }
  }

  private _updateBeaconIcons(): void {
    for (let i = 0; i < this.playerBeaconBatteryIcons.length; i++) {
      this.playerBeaconBatteryIcons[i].setAlpha(i < this.playerBeaconBatteries ? 1 : 0.3);
    }
  }

  private updateLanternIndicator(): void {
    const player = this.arena.player;
    if (this.playerLanternActive) {
      if (!this.playerLanternIndicator || !this.playerLanternIndicator.active) {
        this.playerLanternIndicator = this.arena.scene.add.circle(0, 0, 6, 0xffffaa, 0.9)
          .setStrokeStyle(1, 0xffffff, 0.7)
          .setDepth(20);
      }
      this.playerLanternIndicator.setPosition(player.x, player.y - 26);
    } else if (this.playerLanternIndicator?.active) {
      this.playerLanternIndicator.destroy();
      this.playerLanternIndicator = null;
    }
  }

  // ── Fog of War ────────────────────────────────────────────────────────────

  private updateFog(time: number): void {
    const rt = this.arena.fogOverlay();
    if (!rt || !this.fogEraser) return;

    const player = this.arena.player;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    // Fill RT solid black
    rt.fill(0x000000, 0.95);

    // Build reveal circles on the eraser graphics
    this.fogEraser.clear();
    this.fogEraser.fillStyle(0xffffff, 1);

    if (this._eclipseRevealActive && time < this.eclipseRevealUntil) {
      // Full reveal
      this.fogEraser.fillRect(0, 0, W, H);
    } else {
      if (this._eclipseRevealActive) {
        this._eclipseRevealActive = false;
      }

      // Mastery — while an eye is open you see out of the bloom, not out of yourself.
      const viewed = this.viewing ? this.activeBlossom() : null;
      if (viewed) {
        this.fogEraser.fillCircle(viewed.x, viewed.y,
          viewed.kind === 'terror' ? TERROR_VIEW_RADIUS : BLOOM_VIEW_RADIUS);
      } else if (this.arena.hasPerk('player', 'beacon')) {
        const ptr = this.arena.pointer;
        const aimAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        let range = this.playerBatFormActive ? 60 : this.playerBeaconConeBoostUntil > time ? 156 : 130;
        if (time < this.playerBiolumUntil) range *= BIOLUM_RADIUS_MULT;
        const halfAngle = Phaser.Math.DegToRad(35);
        this.fogEraser.beginPath();
        this.fogEraser.moveTo(player.x, player.y);
        this.fogEraser.arc(player.x, player.y, range, aimAngle - halfAngle, aimAngle + halfAngle, false);
        this.fogEraser.closePath();
        this.fogEraser.fillPath();
      } else {
        let playerRadius = this.playerBatFormActive ? 45 : this.playerLanternActive ? 128 : 90;
        if (time < this.playerBiolumUntil) playerRadius *= BIOLUM_RADIUS_MULT;
        this.fogEraser.fillCircle(player.x, player.y, playerRadius);
      }

      // Guess reveals (temporary)
      for (const r of this.guessReveals) {
        if (time < r.expiresAt) this.fogEraser.fillCircle(r.x, r.y, 80);
      }

      // Echo summon reveals — only the sprite itself, no surrounding area
      for (const s of this.echoSummons) {
        if (s.owner === 'player') this.fogEraser.fillCircle(s.x, s.y, 14);
      }
    }

    rt.erase(this.fogEraser, 0, 0);
  }

  // ── Echolocation (Click) ──────────────────────────────────────────────────

  doEcholocation(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 440;
    const gfx = this.arena.scene.add.graphics().setDepth(17);
    this.echoProjs.push({
      gfx,
      x: caster.x,
      y: caster.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bounceCount: 0,
      lastBounceAt: 0,
      owner,
      active: true,
    });
  }

  private updateEchoProjs(time: number, delta: number): void {
    const MARGIN = 36;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();
    const dt = delta / 1000;

    for (let i = this.echoProjs.length - 1; i >= 0; i--) {
      const p = this.echoProjs[i];
      if (!p.active) {
        p.gfx.destroy();
        this.echoProjs.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wall bounce (0.5s cooldown per bounce)
      if (time - p.lastBounceAt >= 500) {
        let bounced = false;
        if (p.x <= MARGIN || p.x >= W - MARGIN) { p.vx *= -1; bounced = true; }
        if (p.y <= MARGIN || p.y >= H - MARGIN) { p.vy *= -1; bounced = true; }
        if (bounced) {
          p.bounceCount++;
          p.lastBounceAt = time;
          if (p.bounceCount > 5) { p.active = false; continue; }
          // Click+ Re-location: bend toward cursor (player) or player position (NPC)
          if (this.arena.hasUpgrade('click')) {
            const homeX = p.owner === 'player' ? this.arena.pointer.worldX : this.arena.player.x;
            const homeY = p.owner === 'player' ? this.arena.pointer.worldY : this.arena.player.y;
            const desiredAngle = Math.atan2(homeY - p.y, homeX - p.x);
            const currentAngle = Math.atan2(p.vy, p.vx);
            const spd = Math.hypot(p.vx, p.vy);
            const blended = Phaser.Math.Angle.RotateTo(currentAngle, desiredAngle, 0.6);
            p.vx = Math.cos(blended) * spd;
            p.vy = Math.sin(blended) * spd;
          }
        }
      }

      p.x = Phaser.Math.Clamp(p.x, MARGIN, W - MARGIN);
      p.y = Phaser.Math.Clamp(p.y, MARGIN, H - MARGIN);

      // Damage check
      const enemy = p.owner === 'player' ? this.arena.npc : this.arena.player;
      if (enemy.hp > 0 && Phaser.Math.Distance.Between(p.x, p.y, enemy.x, enemy.y) <= 28) {
        enemy.takeDamage(18);
        this.arena.spawnHitFlash(enemy.x, enemy.y, 0xccccff);
        if (p.owner === 'player') this.arena.recordMasteryStat('echolocationHits', 1);
        p.active = false;
        continue;
      }

      // Draw as rotated rectangle (8×40), perpendicular to travel direction
      const angle = Math.atan2(p.vy, p.vx);
      const hw = 4, hh = 20;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      p.gfx.clear();
      p.gfx.fillStyle(0xffffff, 0.92);
      p.gfx.fillPoints([
        new Phaser.Geom.Point(p.x + cos * hw - sin * hh, p.y + sin * hw + cos * hh),
        new Phaser.Geom.Point(p.x - cos * hw - sin * hh, p.y - sin * hw + cos * hh),
        new Phaser.Geom.Point(p.x - cos * hw + sin * hh, p.y - sin * hw - cos * hh),
        new Phaser.Geom.Point(p.x + cos * hw + sin * hh, p.y + sin * hw - cos * hh),
      ], true);
    }
  }

  // ── Guess (E) ─────────────────────────────────────────────────────────────

  /** Returns true if the guess correctly landed on the enemy (direct or AoE hit). */
  doGuess(tx: number, ty: number, owner: 'player' | 'npc'): boolean {
    const time = this.arena.scene.time.now;
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;

    const directDist = Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y);
    const directHit = directDist <= 35;

    // Visual AoE circle at cursor
    const aoeR = directHit ? 44 : 72;
    const flash = this.arena.scene.add.circle(tx, ty, aoeR, 0xaaaaff, 0.35).setDepth(17);
    this.arena.scene.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

    if (directHit) {
      // Direct hit
      enemy.takeDamage(30);
      this.arena.spawnHitFlash(enemy.x, enemy.y, 0xaaaaff);
      this.arena.showFloatingText(caster.x, caster.y - 40, 'Vision', '#ffdd44');
      this.guessReveals.push({ x: enemy.x, y: enemy.y, expiresAt: time + 500 });
      if (owner === 'player') this.arena.recordMasteryStat('correctGuesses', 1);
      return true;
    }

    // AoE check
    const aoeDist = Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y);
    if (aoeDist <= 72 && enemy.hp > 0) {
      enemy.takeDamage(15);
      this.arena.spawnHitFlash(enemy.x, enemy.y, 0xaaaaff);
      this.guessReveals.push({ x: enemy.x, y: enemy.y, expiresAt: time + 500 });
      if (owner === 'player') this.arena.recordMasteryStat('correctGuesses', 1);
      return true;
    }

    // Miss — slow caster
    if (owner === 'player') {
      this.playerGuessSlowUntil = time + 3000;
      this.arena.showFloatingText(caster.x, caster.y - 36, 'Disoriented!', '#ff8888');
    } else {
      this.npcGuessSlowUntil = time + 3000;
    }
    return false;
  }

  private updateGuessReveals(time: number): void {
    for (let i = this.guessReveals.length - 1; i >= 0; i--) {
      if (time > this.guessReveals[i].expiresAt) this.guessReveals.splice(i, 1);
    }
  }

  // ── Lantern (R) ───────────────────────────────────────────────────────────

  doLantern(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const directDist = Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y);

    if (directDist <= 35 && enemy.hp > 0) {
      // Summon an Echo of the enemy
      this.spawnEchoSummon(enemy.x + 40, enemy.y, owner);
      this.arena.showFloatingText(caster.x, caster.y - 40, 'Vision', '#ffdd44');
    } else if (owner === 'player') {
      // Toggle lantern
      if (this.playerLanternActive) {
        this.playerLanternActive = false;
        this.playerLanternHealAccum = 0;
        this.playerLanternHealTextAccum = 0;
        this.arena.showFloatingText(caster.x, caster.y - 36, 'Lantern Off', '#aaaaff');
      } else {
        this.playerLanternActive = true;
        this.playerLanternHp = caster.hp;
        this.arena.showFloatingText(caster.x, caster.y - 36, 'Lantern', '#ffffaa');
      }
    } else {
      this.npcLanternActive = !this.npcLanternActive;
    }
  }

  private spawnEchoSummon(x: number, y: number, owner: 'player' | 'npc'): void {
    const time = this.arena.scene.time.now;
    const sprite = this.arena.scene.add.circle(x, y, 14, 0x8888cc, 0.85)
      .setDepth(17)
      .setStrokeStyle(2, 0xddddff);
    const hpBar = new HealthBar(this.arena.scene, 25);
    hpBar['graphics'].setDepth(17); // bump above fog
    const lightGfx = this.arena.hasUpgrade('r') ? this.arena.scene.add.graphics().setDepth(15) : null;
    this.echoSummons.push({
      sprite, hpBar, hp: 25, maxHp: 25, x, y, owner,
      expiresAt: time + 10000, shootAccum: 0, lightGfx,
    });
  }

  private updateEchoSummons(time: number, delta: number, isPlayer: boolean): void {
    const player = this.arena.player;
    const npc = this.arena.npc;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    for (let i = this.echoSummons.length - 1; i >= 0; i--) {
      const s = this.echoSummons[i];

      if (s.hp <= 0 || time > s.expiresAt) {
        s.sprite.destroy();
        s.hpBar.destroy();
        if (s.lightGfx) s.lightGfx.destroy();
        this.echoSummons.splice(i, 1);
        continue;
      }

      // Summon chases the enemy of its owner
      const target = s.owner === 'player' ? npc : player;
      const dist = Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y);
      if (dist > 40) {
        const speed = 80 * (delta / 1000);
        const angle = Math.atan2(target.y - s.y, target.x - s.x);
        s.x += Math.cos(angle) * speed;
        s.y += Math.sin(angle) * speed;
        s.x = Phaser.Math.Clamp(s.x, 36, W - 36);
        s.y = Phaser.Math.Clamp(s.y, 36, H - 36);
      }

      s.sprite.setPosition(s.x, s.y);
      s.hpBar.update(s.x, s.y, s.hp);
      if (s.lightGfx) {
        s.lightGfx.clear();
        s.lightGfx.fillStyle(0xfff7cc, 0.18);
        s.lightGfx.fillCircle(s.x, s.y, 28);
        s.lightGfx.fillStyle(0xfff7cc, 0.35);
        s.lightGfx.fillCircle(s.x, s.y, 14);
      }

      // Take incoming hits (simple proximity damage check from projectiles)
      // Note: ArenaScene projectiles are Phaser physics objects; we check overlap manually
      const projGroup = this.arena.projectiles;
      for (const go of projGroup.getChildren()) {
        const proj = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
        if (!proj.active) continue;
        // Summoned by player → vulnerable to NPC projectiles
        const fromEnemy = s.owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!fromEnemy) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, s.x, s.y) <= 20) {
          s.hp -= 8;
          this.arena.spawnHitFlash(s.x, s.y, 0xccccff);
          proj.setActive(false).setVisible(false);
        }
      }

      // Shoot toward enemy every 2s (slower than base)
      if (isPlayer || s.owner === 'player') {
        s.shootAccum += delta;
        if (s.shootAccum >= 2000) {
          s.shootAccum = 0;
          this.fireSummonShot(s, target);
        }
      }
    }
  }

  private fireSummonShot(s: EchoSummon, target: Fighter): void {
    if (target.hp <= 0) return;
    const scene = this.arena.scene;
    const angle = Math.atan2(target.y - s.y, target.x - s.x);
    const speed = 160; // 40% of typical ~400 speed
    const ball = scene.add.circle(s.x, s.y, 6, 0x8888cc, 0.9).setDepth(17);
    let bx = s.x, by = s.y;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    let hit = false;
    let ticks = 0;

    scene.time.addEvent({
      delay: 16,
      repeat: 80,
      callback: () => {
        if (hit) return;
        ticks++;
        bx += vx * 0.016;
        by += vy * 0.016;
        ball.setPosition(bx, by);
        if (target.hp > 0 && Phaser.Math.Distance.Between(bx, by, target.x, target.y) <= 24) {
          target.takeDamage(5);
          this.arena.spawnHitFlash(target.x, target.y, 0x8888cc);
          ball.destroy();
          hit = true;
        } else if (ticks >= 80) {
          ball.destroy();
        }
      },
    });
  }

  private checkLanternShatter(time: number, isPlayer: boolean, _isNpc: boolean): void {
    void time;
    if (!isPlayer || !this.playerLanternActive) return;
    const player = this.arena.player;
    if (player.hp < this.playerLanternHp) {
      // Took damage — shatter
      this.playerLanternActive = false;
      this.playerLanternHealAccum = 0;
      this.playerLanternHealTextAccum = 0;
      this.arena.showFloatingText(player.x, player.y - 40, 'Lantern Shattered!', '#ff8844');
      this.arena.spawnHitFlash(player.x, player.y, 0xffffaa);
    }
    this.playerLanternHp = player.hp;
  }

  // ── Bat Form (F) ──────────────────────────────────────────────────────────

  doBatForm(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const time = this.arena.scene.time.now;
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const directDist = Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y);

    if (directDist <= 35 && enemy.hp > 0) {
      // Attach mode — dash to enemy
      this.arena.showFloatingText(caster.x, caster.y - 40, 'Vision', '#ffdd44');
      if (owner === 'player') {
        this.playerBatAttach = { targetRef: enemy, drainAccum: 0, endsAt: time + 3000, owner: 'player' };
        caster.isInvincible = true;
        // Bug 1 fix: also show bat form visually during attach
        this.playerBatFormActive = true;
        this.playerBatFormEndsAt = time + 3000;
        caster.setScale(0.5);
        if (this.arena.hasUpgrade('f')) {
          caster.setTint(0x888888);
          this.playerBatTracker = { targetRef: enemy, expiresAt: time + 8000, lastPingAt: time };
        }
      } else {
        this.npcBatAttach = { targetRef: enemy, drainAccum: 0, endsAt: time + 3000, owner: 'npc' };
        caster.isInvincible = true;
        // Bug 1 fix (NPC mirror)
        this.npcBatFormActive = true;
        this.npcBatFormEndsAt = time + 3000;
        caster.setScale(0.5);
      }
    } else {
      // Bat form mode
      if (owner === 'player') {
        this.playerBatFormActive = true;
        this.playerBatFormEndsAt = time + 5000;
        caster.setScale(0.5);
        this.arena.showFloatingText(caster.x, caster.y - 40, 'Bat Form!', '#ccccff');
        if (this.arena.hasUpgrade('f')) caster.setTint(0x888888);
      } else {
        this.npcBatFormActive = true;
        this.npcBatFormEndsAt = time + 5000;
        caster.setScale(0.5);
      }
    }
  }

  private updateBatForm(time: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const attach = owner === 'player' ? this.playerBatAttach : this.npcBatAttach;

    // Handle attach
    if (attach) {
      const target = attach.targetRef;
      if (target.hp <= 0 || time > attach.endsAt) {
        // Detach
        caster.isInvincible = false;
        if (owner === 'player') {
          this.playerBatAttach = null;
          this.playerBatFormActive = false; // Bug 1 fix
        } else {
          this.npcBatAttach = null;
          this.npcBatFormActive = false; // Bug 1 fix
        }
        caster.setScale(1.0);
        caster.clearTint();
        return;
      }

      // Move toward target
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist > 8) {
        const angle = Math.atan2(target.y - caster.y, target.x - caster.x);
        const body = caster.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);
      } else {
        const body = caster.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
      }

      // Drain HP every 0.5s
      attach.drainAccum += 16; // approximate delta; update() calls every frame ~16ms
      if (attach.drainAccum >= 500) {
        attach.drainAccum -= 500;
        if (target.hp > 0) {
          target.takeDamage(3);
          this.arena.spawnHitFlash(target.x, target.y, 0x8888cc);
          this.arena.showFloatingText(target.x, target.y - 25, '3', '#ccccff');
        }
      }
      return;
    }

    // Handle bat form timeout
    const batActive = owner === 'player' ? this.playerBatFormActive : this.npcBatFormActive;
    if (batActive && time > (owner === 'player' ? this.playerBatFormEndsAt : this.npcBatFormEndsAt)) {
      caster.setScale(1.0);
      caster.clearTint();
      if (owner === 'player') {
        this.playerBatFormActive = false;
        this.arena.showFloatingText(caster.x, caster.y - 36, 'Returned', '#aaaaff');
      } else {
        this.npcBatFormActive = false;
      }
    }

    // Prevent attacking while attached (handled in handleInput check)
    // Apply speed boost via getPlayerSpeedMult() read by ArenaScene

    // Dodge projectiles during bat attach (handled by isInvincible)
    // Visual: enemy indicator
    if (attach) {
      this.arena.spawnHitFlash(caster.x, caster.y, 0x8888cc);
    }
  }

  // ── Eclipse (Q) ───────────────────────────────────────────────────────────

  doEclipse(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const time = this.arena.scene.time.now;
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const directDist = Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y);
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    if (directDist <= 35 && enemy.hp > 0) {
      // Line bombs
      this.arena.showFloatingText(caster.x, caster.y - 40, 'Vision', '#ffdd44');
      for (let i = 0; i < 8; i++) {
        const cx = Phaser.Math.Between(80, W - 80);
        const cy = Phaser.Math.Between(80, H - 80);
        const angle = Math.random() * Math.PI * 2;
        const len = Math.sqrt(W * W + H * H);
        const gfx = this.arena.scene.add.graphics().setDepth(17);
        gfx.lineStyle(14, 0xffffff, 0.85);
        gfx.lineBetween(
          cx - Math.cos(angle) * len / 2, cy - Math.sin(angle) * len / 2,
          cx + Math.cos(angle) * len / 2, cy + Math.sin(angle) * len / 2,
        );
        this.eclipseLines.push({ gfx, cx, cy, angle, len, detonateAt: time + 3000, owner });
      }
    } else {
      // Reveal mode
      this._eclipseRevealActive = true;
      this.eclipseRevealUntil = time + 4000;
      this.eclipseRevealNpcChangeDirAt = 0; // force immediate direction change
      this.arena.showFloatingText(caster.x, caster.y - 36, 'Total Eclipse!', '#ffffaa');
      // Bug 2 fix: actually scramble enemy aim via the standard offset channel
      enemy.aimOffsetBonusDeg = 90;
      enemy.aimOffsetBonusUntil = time + 4000;
      // Q+ Hypersense: for the 4s reveal you auto-dodge incoming attacks (see ArenaScene).
      if (owner === 'player' && this.arena.hasUpgrade('q')) {
        this.playerHypersenseUntil = time + 4000;
        this.arena.showFloatingText(caster.x, caster.y - 54, '👁 Hypersense!', '#aaddff');
      }
    }
  }

  private updateEclipseLines(time: number, isPlayer: boolean): void {
    const player = this.arena.player;
    const npc = this.arena.npc;

    for (let i = this.eclipseLines.length - 1; i >= 0; i--) {
      const l = this.eclipseLines[i];
      if (time >= l.detonateAt) {
        // Detonate — point-to-line-segment distance check
        const enemy = l.owner === 'player' ? npc : player;
        const ax = l.cx - Math.cos(l.angle) * l.len / 2;
        const ay = l.cy - Math.sin(l.angle) * l.len / 2;
        const bx = l.cx + Math.cos(l.angle) * l.len / 2;
        const by = l.cy + Math.sin(l.angle) * l.len / 2;
        const ddx = bx - ax, ddy = by - ay;
        const lenSq = ddx * ddx + ddy * ddy;
        const tt = lenSq > 0 ? Math.max(0, Math.min(1, ((enemy.x - ax) * ddx + (enemy.y - ay) * ddy) / lenSq)) : 0;
        const closestDist = Phaser.Math.Distance.Between(enemy.x, enemy.y, ax + tt * ddx, ay + tt * ddy);
        if (enemy.hp > 0 && closestDist <= 35) {
          enemy.takeDamage(60);
          this.arena.spawnHitFlash(enemy.x, enemy.y, 0xffffff);
        }
        // Detonation flash
        const flash = this.arena.scene.add.graphics().setDepth(17);
        flash.lineStyle(24, 0xffffff, 0.9);
        flash.lineBetween(
          l.cx - Math.cos(l.angle) * l.len / 2, l.cy - Math.sin(l.angle) * l.len / 2,
          l.cx + Math.cos(l.angle) * l.len / 2, l.cy + Math.sin(l.angle) * l.len / 2,
        );
        if (this.arena.hasUpgrade('q') && l.owner === 'player') {
          this.arena.scene.tweens.add({ targets: flash, alpha: 0, duration: 300, delay: 2000, onComplete: () => flash.destroy() });
        } else {
          this.arena.scene.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
        }
        l.gfx.destroy();
        this.eclipseLines.splice(i, 1);
        continue;
      }

      // Pulse warning
      const timeLeft = l.detonateAt - time;
      const pulse = timeLeft < 1000 ? 0.5 + 0.5 * Math.sin(time * 0.02) : 0.85;
      l.gfx.clear();
      l.gfx.lineStyle(14, 0xffffff, pulse);
      l.gfx.lineBetween(
        l.cx - Math.cos(l.angle) * l.len / 2, l.cy - Math.sin(l.angle) * l.len / 2,
        l.cx + Math.cos(l.angle) * l.len / 2, l.cy + Math.sin(l.angle) * l.len / 2,
      );
    }
    void isPlayer; // suppress unused warning
  }

  private updateNpcEclipseRandom(time: number): void {
    if (!this._eclipseRevealActive || time >= this.eclipseRevealUntil) return;
    if (time >= this.eclipseRevealNpcChangeDirAt) {
      this.eclipseRevealNpcRandomDir = Math.random() * Math.PI * 2;
      this.eclipseRevealNpcChangeDirAt = time + Phaser.Math.Between(400, 800);
    }
  }

  /** Returns random aim direction during eclipse reveal, or null otherwise. */
  getEclipseNpcAimDir(): { x: number; y: number } | null {
    if (!this._eclipseRevealActive) return null;
    const time = this.arena.scene.time.now;
    if (time >= this.eclipseRevealUntil) return null;
    const npc = this.arena.npc;
    const dist = 300;
    return {
      x: npc.x + Math.cos(this.eclipseRevealNpcRandomDir) * dist,
      y: npc.y + Math.sin(this.eclipseRevealNpcRandomDir) * dist,
    };
  }

  // ── Psychic Eyes (E+/Q+) ─────────────────────────────────────────────────

  private spawnPsychicEye(): void {
    if (this.playerEyes.length >= 5) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '(max)', '#888888');
      return;
    }
    const player = this.arena.player;
    const sprite = this.arena.scene.add.image(player.x, player.y - 24, 'echo-psychic-eye')
      .setDepth(20).setScale(0.9);
    this.playerEyes.push({ sprite, angleOffset: Math.random() * Math.PI * 2 });
  }

  private updateEyes(time: number): void {
    if (this.playerEyes.length === 0) return;
    const player = this.arena.player;
    for (const eye of this.playerEyes) {
      const ex = player.x + Math.cos(time / 600 + eye.angleOffset) * 26;
      const ey = player.y + Math.sin(time / 600 + eye.angleOffset) * 26;
      eye.sprite.setPosition(ex, ey);
      eye.sprite.setTint(this.playerEyePowerUpArmed ? 0xff5566 : 0xffffff);
    }
  }

  // Public: called from ArenaScene dodge handler
  tryConsumeEyeForDodge(x: number, y: number, dx: number, dy: number): void {
    if (this.playerEyes.length === 0) return;
    if (!this.arena.hasUpgrade('e') && !this.arena.hasUpgrade('q')) return;
    const eye = this.playerEyes.shift()!;
    eye.sprite.destroy();
    const time = this.arena.scene.time.now;
    const totalDist = 520 * 0.28;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 6; i++) {
      pts.push({ x: x + dx * totalDist * (i / 6), y: y + dy * totalDist * (i / 6) });
    }
    const gfx = this.arena.scene.add.graphics().setDepth(18);
    this.playerLightTrails.push({ gfx, pts, expiresAt: time + 3000, lastTickAt: 0 });
  }

  private updateLightTrails(time: number): void {
    const npc = this.arena.npc;
    for (let i = this.playerLightTrails.length - 1; i >= 0; i--) {
      const trail = this.playerLightTrails[i];
      if (time > trail.expiresAt) {
        trail.gfx.destroy();
        this.playerLightTrails.splice(i, 1);
        continue;
      }

      // Damage tick every 800 ms
      if (time - trail.lastTickAt >= 800) {
        trail.lastTickAt = time;
        if (npc.hp > 0) {
          let hit = false;
          for (let j = 0; j < trail.pts.length - 1 && !hit; j++) {
            const ax = trail.pts[j].x, ay = trail.pts[j].y;
            const bx = trail.pts[j + 1].x, by = trail.pts[j + 1].y;
            const ddx = bx - ax, ddy = by - ay;
            const lenSq = ddx * ddx + ddy * ddy;
            const t = lenSq > 0 ? Math.max(0, Math.min(1, ((npc.x - ax) * ddx + (npc.y - ay) * ddy) / lenSq)) : 0;
            const closestDist = Phaser.Math.Distance.Between(npc.x, npc.y, ax + t * ddx, ay + t * ddy);
            if (closestDist <= 14) {
              npc.takeDamage(8, { source: trail, sourceX: ax + t * ddx, sourceY: ay + t * ddy });
              this.arena.spawnHitFlash(npc.x, npc.y, 0xffffaa);
              this.arena.showFloatingText(npc.x, npc.y - 24, 'Light', '#ffffaa');
              hit = true;
            }
          }
        }
      }

      // Render fading polyline
      const elapsed = time - (trail.expiresAt - 3000);
      const alpha = Math.max(0, 0.9 * (1 - elapsed / 3000));
      trail.gfx.clear();
      trail.gfx.lineStyle(8, 0xffffff, alpha);
      trail.gfx.beginPath();
      trail.gfx.moveTo(trail.pts[0].x, trail.pts[0].y);
      for (let j = 1; j < trail.pts.length; j++) {
        trail.gfx.lineTo(trail.pts[j].x, trail.pts[j].y);
      }
      trail.gfx.strokePath();
    }
  }

  // ── Lantern Heal (R+) ────────────────────────────────────────────────────

  private updateLanternHeal(delta: number): void {
    if (!this.playerLanternActive || !this.arena.hasUpgrade('r')) return;
    this.playerLanternHealAccum += delta;
    if (this.playerLanternHealAccum >= 200) {
      this.playerLanternHealAccum -= 200;
      this.arena.healCaster('player', 1);
      this.arena.recordMasteryStat('lanternHealed', 1);
      this.playerLanternHealTextAccum += 200;
      if (this.playerLanternHealTextAccum >= 1000) {
        this.playerLanternHealTextAccum -= 1000;
        const player = this.arena.player;
        this.arena.showFloatingText(player.x, player.y - 42, '+1 ❤', '#88ff88');
      }
    }
  }

  // ── Bat Tracker (F+) ────────────────────────────────────────────────────

  private updateBatTracker(time: number): void {
    if (!this.playerBatTracker) return;
    const t = this.playerBatTracker;
    if (time > t.expiresAt || t.targetRef.hp <= 0) {
      this.playerBatTracker = null;
      return;
    }
    if (time - t.lastPingAt >= 3000) {
      t.lastPingAt = time;
      const scene = this.arena.scene;
      const ping = scene.add.graphics().setDepth(22);
      ping.fillStyle(0x44ff66, 0.6);
      ping.fillCircle(t.targetRef.x, t.targetRef.y, 10);
      scene.tweens.add({
        targets: ping,
        scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 600,
        onComplete: () => ping.destroy(),
      });
      this.arena.showFloatingText(t.targetRef.x, t.targetRef.y - 28, 'ping', '#44ff66');
    }
  }

  // ── Mastery — Vibration Detection (passive) ───────────────────────────────

  /**
   * Quadrant the given world point falls into relative to the player: 0 = right,
   * 1 = down, 2 = left, 3 = up. Deliberately coarse — the ring is meant to say
   * "over there somewhere", never how far.
   */
  private quadrantOf(x: number, y: number): number {
    const player = this.arena.player;
    const a = Math.atan2(y - player.y, x - player.x) + Math.PI / 4;
    const norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(norm / (Math.PI / 2)) % 4;
  }

  private updateVibrationDetection(time: number): void {
    const enemy = this.arena.npc;
    if (!this.vibeGfx || !this.vibeGfx.active) {
      this.vibeGfx = this.arena.scene.add.graphics().setDepth(20);
    }

    // A cast is a much louder disturbance than a footstep — it always registers.
    if (this.arena.npcCastId && enemy.hp > 0) {
      this.vibeArcs.push({ quadrant: this.quadrantOf(enemy.x, enemy.y), bornAt: time, strong: true });
    }

    if (time >= this.vibeNextSampleAt) {
      this.vibeNextSampleAt = time + 90;
      const moved = Phaser.Math.Distance.Between(this.vibeLastEnemyX, this.vibeLastEnemyY, enemy.x, enemy.y);
      // First sample of the match just seeds the baseline — a spawn is not a footstep.
      if (this.vibeLastEnemyX !== 0 || this.vibeLastEnemyY !== 0) {
        if (moved > 6 && enemy.hp > 0 && time >= this.vibeNextMoveArcAt) {
          this.vibeNextMoveArcAt = time + 220;
          this.vibeArcs.push({ quadrant: this.quadrantOf(enemy.x, enemy.y), bornAt: time, strong: false });
        }
      }
      this.vibeLastEnemyX = enemy.x;
      this.vibeLastEnemyY = enemy.y;
    }

    const player = this.arena.player;
    const g = this.vibeGfx;
    g.clear();
    for (let i = this.vibeArcs.length - 1; i >= 0; i--) {
      const arc = this.vibeArcs[i];
      const life = arc.strong ? 700 : 420;
      const t = (time - arc.bornAt) / life;
      if (t >= 1) { this.vibeArcs.splice(i, 1); continue; }
      const fade = 1 - t;
      const mid = arc.quadrant * (Math.PI / 2);
      const half = Phaser.Math.DegToRad(arc.strong ? 42 : 32);
      const radius = (arc.strong ? 40 : 34) + t * (arc.strong ? 9 : 5);
      g.lineStyle(arc.strong ? 4 : 2.5, arc.strong ? 0xffcc55 : 0x99ffee, fade * (arc.strong ? 0.85 : 0.55));
      g.beginPath();
      g.arc(player.x, player.y, radius, mid - half, mid + half, false);
      g.strokePath();
      // Faint inner echo of the same segment, so a cast reads as a double pulse.
      if (arc.strong) {
        g.lineStyle(2, 0xffee99, fade * 0.4);
        g.beginPath();
        g.arc(player.x, player.y, radius - 8, mid - half * 0.7, mid + half * 0.7, false);
        g.strokePath();
      }
    }
  }

  /** Rolling record of where the enemy has been — painted by terror-bloom vision. */
  private updateHeatTrail(time: number): void {
    const enemy = this.arena.npc;
    if (time >= this.heatNextSampleAt) {
      this.heatNextSampleAt = time + HEAT_TRAIL_SAMPLE_MS;
      if (enemy.hp > 0) this.heatTrail.push({ x: enemy.x, y: enemy.y, at: time });
    }
    while (this.heatTrail.length > 0 && time - this.heatTrail[0].at > HEAT_TRAIL_MS) this.heatTrail.shift();

    if (!this.heatGfx || !this.heatGfx.active) {
      this.heatGfx = this.arena.scene.add.graphics().setDepth(18);
    }
    const g = this.heatGfx;
    g.clear();
    const viewed = this.viewing ? this.activeBlossom() : null;
    if (!viewed || viewed.kind !== 'terror') return;

    // Heat-seeker read: hot where they just were, cooling to deep red behind them.
    for (const s of this.heatTrail) {
      const age = (time - s.at) / HEAT_TRAIL_MS;
      const heat = 1 - age;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(0x66, 0x00, 0x11),
        new Phaser.Display.Color(0xff, 0xdd, 0x55),
        100, Math.round(heat * 100),
      );
      const tint = (color.r << 16) | (color.g << 8) | color.b;
      g.fillStyle(tint, 0.1 + 0.4 * heat);
      g.fillCircle(s.x, s.y, 5 + 9 * heat);
    }
  }

  private updateBiolum(time: number): void {
    if (time >= this.playerBiolumUntil) {
      if (this.biolumGfx?.active) { this.biolumGfx.destroy(); this.biolumGfx = null; }
      return;
    }
    if (!this.biolumGfx || !this.biolumGfx.active) {
      this.biolumGfx = this.arena.scene.add.graphics().setDepth(6);
    }
    const player = this.arena.player;
    const g = this.biolumGfx;
    g.clear();
    const fade = Phaser.Math.Clamp((this.playerBiolumUntil - time) / 1200, 0, 1);
    const pulse = 0.75 + 0.25 * Math.sin(time / 180);
    g.fillStyle(0x66ffcc, 0.1 * fade * pulse);
    g.fillCircle(player.x, player.y, 34 * pulse);
    g.fillStyle(0x99ffdd, 0.2 * fade);
    g.fillCircle(player.x, player.y, 20);
    // Motes drifting off the glowing skin.
    for (let i = 0; i < 6; i++) {
      const a = time / 700 + (i / 6) * Math.PI * 2;
      const r = 18 + 8 * Math.sin(time / 300 + i);
      g.fillStyle(0xccffee, 0.55 * fade);
      g.fillCircle(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, 1.8);
    }
  }

  // ── Mastery — Echo Bloom ──────────────────────────────────────────────────

  private bloomSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'echo-bloom') return s;
    }
    return null;
  }

  /** Ability-bar fill: full while the eye is open, otherwise the seed recharge. */
  getBloomCooldownRatio(time: number): number {
    if (this.viewing) return 1;
    return Math.min(1, (time - this.bloomLastCastAt) / BLOOM_COOLDOWN_MS);
  }

  /** True while the player is looking out of a bloom — ArenaScene suppresses aiming feedback. */
  isViewingThroughBloom(): boolean {
    return this.viewing;
  }

  private handleBloomInput(
    time: number,
    slot: 'e' | 'r' | 'f' | 'q',
    pointer: Phaser.Input.Pointer,
    mx: number,
    my: number,
  ): void {
    const key = slot === 'e' ? this.arena.eKey
      : slot === 'r' ? this.arena.rKey
      : slot === 'f' ? this.arena.fKey
      : this.arena.qKey;

    if (Phaser.Input.Keyboard.JustDown(key)) {
      this.bloomKeyDownAt = time;
      this.bloomHoldConsumed = false;
    }
    // Held past the threshold with something planted: open the eye instead of planting.
    if (key.isDown && !this.viewing && !this.bloomHoldConsumed
        && this.bloomKeyDownAt > 0 && time - this.bloomKeyDownAt >= BLOOM_HOLD_MS
        && this.playerBlossoms.length > 0) {
      this.enterViewing(time);
      this.bloomHoldConsumed = true;
    }
    if (Phaser.Input.Keyboard.JustUp(key)) {
      this.bloomKeyDownAt = 0;
      if (this.viewing) this.exitViewing('Eye Closed');
      else if (!this.bloomHoldConsumed) this.tryCastBloom(time, mx, my);
      this.bloomHoldConsumed = false;
      return;
    }

    if (!this.viewing) return;

    // Click — spit a bullet from the bloom toward the cursor.
    if (pointer.isDown && !this._prevPointerDown) this.fireBloomBullet(time, mx, my, 'player');

    // Right-click — hop to the next bloom.
    const rightDown = pointer.rightButtonDown();
    if (rightDown && !this._prevRightDown) this.cycleView(1);

    // Space — teleport to the bloom, spending it. Consuming JustDown here stops
    // ArenaScene's dodge from also firing (it reads the same key later this frame).
    if (Phaser.Input.Keyboard.JustDown(this.arena.spaceKey)) this.warpToBlossom(time);
  }

  private tryCastBloom(time: number, mx: number, my: number): void {
    if (time - this.bloomLastCastAt < BLOOM_COOLDOWN_MS) return;
    this.bloomLastCastAt = time;
    this.castBloom(mx, my, 'player');
    this.arena.broadcastMasteryCast('echo-bloom');
  }

  /** Aimed straight at an enemy: a terror bloom erupts out of them. Otherwise: launch a seed. */
  private castBloom(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;

    if (enemy.hp > 0 && Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y) <= 35) {
      this.plantBlossom('terror', enemy.x, enemy.y, owner, enemy);
      this.arena.showFloatingText(caster.x, caster.y - 40, 'Vision', '#ffdd44');
      this.arena.showFloatingText(enemy.x, enemy.y - 34, '🌺 TERROR BLOOM', '#ff5566');
      return;
    }

    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const gfx = this.arena.scene.add.graphics().setDepth(17);
    this.bloomSeeds.push({
      gfx,
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * BLOOM_SEED_SPEED,
      vy: Math.sin(angle) * BLOOM_SEED_SPEED,
      owner,
      trail: [],
    });
    this.arena.showFloatingText(caster.x, caster.y - 36, '🌱 Seed', '#ccd4ff');
  }

  private plantBlossom(
    kind: 'echo' | 'terror',
    x: number,
    y: number,
    owner: 'player' | 'npc',
    host: Fighter | null,
  ): void {
    const list = owner === 'player' ? this.playerBlossoms : this.npcBlossoms;
    // Blooms never wilt on their own — going over the cap is the only thing that
    // uproots an echo bloom, and it always takes the oldest.
    if (list.length >= BLOOM_MAX) this.dropBlossom(list, 0, owner);

    const time = this.arena.scene.time.now;
    const b: Blossom = {
      kind, x, y,
      gfx: this.arena.scene.add.graphics().setDepth(host ? 15 : 17),
      host,
      offX: host ? x - host.x : 0,
      offY: host ? y - host.y : 0,
      bornAt: time,
      expiresAt: kind === 'terror' ? time + TERROR_LIFETIME_MS : Infinity,
      owner,
      weakenApplied: false,
      swaySeed: Math.random() * Math.PI * 2,
    };
    if (kind === 'terror' && host) {
      host.outgoingDamageMult *= TERROR_WEAKEN_MULT;
      b.weakenApplied = true;
    }
    list.push(b);
    this.arena.spawnHitFlash(x, y, kind === 'terror' ? TERROR_BLOOM_COLOR : ECHO_BLOOM_COLOR);
  }

  /** Undo a bloom's lingering effects and free its graphics. Never touches the owning list. */
  private releaseBlossom(b: Blossom): void {
    if (b.weakenApplied && b.host) {
      b.host.outgoingDamageMult /= TERROR_WEAKEN_MULT;
      b.weakenApplied = false;
    }
    if (b.gfx.active) b.gfx.destroy();
  }

  /** Remove index `i` from `list`, keeping the owner's view cursor pointing somewhere sane. */
  private dropBlossom(list: Blossom[], i: number, owner: 'player' | 'npc'): void {
    this.releaseBlossom(list[i]);
    list.splice(i, 1);
    if (owner === 'player') {
      if (this.viewIndex > i) this.viewIndex--;
      if (this.viewIndex >= list.length) this.viewIndex = 0;
    } else {
      if (this.npcViewIndex > i) this.npcViewIndex--;
      if (this.npcViewIndex >= list.length) this.npcViewIndex = 0;
    }
  }

  private activeBlossom(): Blossom | null {
    return this.playerBlossoms[this.viewIndex] ?? null;
  }

  private enterViewing(time: number): void {
    if (this.playerBlossoms.length === 0) return;
    this.viewing = true;
    if (this.viewIndex >= this.playerBlossoms.length) this.viewIndex = 0;
    this.lastBloomShotAt = time - BLOOM_SHOT_COOLDOWN_MS;
    const player = this.arena.player;
    player.shieldHp += VIEW_SHIELD_HP;
    this.arena.showFloatingText(player.x, player.y - 44, '👁 VIEWING', '#ccd4ff');
  }

  private exitViewing(reason: string): void {
    if (!this.viewing) return;
    this.viewing = false;
    const player = this.arena.player;
    // Whatever shield is left belongs to the eye, not to you.
    player.shieldHp = 0;
    this.arena.showFloatingText(player.x, player.y - 44, reason, '#8899cc');
  }

  private cycleView(step: number): void {
    if (this.playerBlossoms.length <= 1) return;
    this.viewIndex = (this.viewIndex + step + this.playerBlossoms.length) % this.playerBlossoms.length;
    const b = this.activeBlossom();
    if (b) this.arena.spawnHitFlash(b.x, b.y, b.kind === 'terror' ? TERROR_BLOOM_COLOR : ECHO_BLOOM_COLOR);
    this.arena.broadcastMasteryCast('echo-bloom-cycle');
  }

  private warpToBlossom(time: number): void {
    const b = this.activeBlossom();
    if (!b) return;
    const player = this.arena.player;
    const wasTerror = b.kind === 'terror';
    const tx = b.x, ty = b.y;

    this.dropBlossom(this.playerBlossoms, this.viewIndex, 'player');
    this.exitViewing('Warped');

    player.setPosition(tx, ty);
    (player.body as Phaser.Physics.Arcade.Body).reset(tx, ty);
    this.playerBiolumUntil = time + BIOLUM_MS;
    this.arena.spawnHitFlash(tx, ty, 0x99ffdd);
    this.arena.showFloatingText(tx, ty - 40, '✨ BIOLUMINESCENT', '#66ffcc');
    if (wasTerror) {
      player.weakHp += TERROR_WARP_WEAK_HP;
      this.arena.showFloatingText(tx, ty - 56, `+${TERROR_WARP_WEAK_HP} 🩶`, '#cccccc');
    }
    this.arena.broadcastMasteryCast('echo-bloom-warp');
  }

  private fireBloomBullet(time: number, tx: number, ty: number, owner: 'player' | 'npc'): void {
    if (owner === 'player' && time - this.lastBloomShotAt < BLOOM_SHOT_COOLDOWN_MS) return;
    const list = owner === 'player' ? this.playerBlossoms : this.npcBlossoms;
    const b = list[owner === 'player' ? this.viewIndex : this.npcViewIndex];
    if (!b) return;
    if (owner === 'player') this.lastBloomShotAt = time;

    const angle = Math.atan2(ty - b.y, tx - b.x);
    this.bloomBullets.push({
      gfx: this.arena.scene.add.graphics().setDepth(18),
      x: b.x, y: b.y,
      vx: Math.cos(angle) * BLOOM_SHOT_SPEED,
      vy: Math.sin(angle) * BLOOM_SHOT_SPEED,
      damage: b.kind === 'terror' ? TERROR_SHOT_DAMAGE : BLOOM_SHOT_DAMAGE,
      kind: b.kind,
      owner,
      bornAt: time,
    });
    if (owner === 'player') this.arena.broadcastMasteryCast('echo-bloom-shot');
  }

  private updateBloomSeeds(time: number, delta: number): void {
    const dt = delta / 1000;
    const MARGIN = 34;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    for (let i = this.bloomSeeds.length - 1; i >= 0; i--) {
      const s = this.bloomSeeds[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 8) s.trail.shift();

      const enemy = s.owner === 'player' ? this.arena.npc : this.arena.player;
      if (enemy.hp > 0 && Phaser.Math.Distance.Between(s.x, s.y, enemy.x, enemy.y) <= 26) {
        this.plantBlossom('echo', enemy.x, enemy.y, s.owner, enemy);
        s.gfx.destroy();
        this.bloomSeeds.splice(i, 1);
        continue;
      }
      if (s.x <= MARGIN || s.x >= W - MARGIN || s.y <= MARGIN || s.y >= H - MARGIN) {
        this.plantBlossom('echo',
          Phaser.Math.Clamp(s.x, MARGIN, W - MARGIN),
          Phaser.Math.Clamp(s.y, MARGIN, H - MARGIN),
          s.owner, null);
        s.gfx.destroy();
        this.bloomSeeds.splice(i, 1);
        continue;
      }

      // A dart with a fading wisp behind it.
      const a = Math.atan2(s.vy, s.vx);
      const g = s.gfx;
      g.clear();
      for (let t = 0; t < s.trail.length; t++) {
        const p = s.trail[t];
        g.fillStyle(ECHO_BLOOM_COLOR, 0.06 + 0.22 * (t / s.trail.length));
        g.fillCircle(p.x, p.y, 1.5 + 2.5 * (t / s.trail.length));
      }
      g.fillStyle(0xe8ecff, 0.95);
      g.fillTriangle(
        s.x + Math.cos(a) * 9, s.y + Math.sin(a) * 9,
        s.x - Math.cos(a) * 5 - Math.sin(a) * 3.5, s.y - Math.sin(a) * 5 + Math.cos(a) * 3.5,
        s.x - Math.cos(a) * 5 + Math.sin(a) * 3.5, s.y - Math.sin(a) * 5 - Math.cos(a) * 3.5,
      );
    }
  }

  private updateBlossoms(time: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const list = owner === 'player' ? this.playerBlossoms : this.npcBlossoms;
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        if (time >= b.expiresAt) {
          this.arena.showFloatingText(b.x, b.y - 26, 'Wilted', '#886677');
          this.dropBlossom(list, i, owner);
          continue;
        }
        if (b.host) {
          // A dead host drops the bloom where it stood, weaken and all.
          if (b.host.hp <= 0 || !b.host.active) {
            if (b.weakenApplied) { b.host.outgoingDamageMult /= TERROR_WEAKEN_MULT; b.weakenApplied = false; }
            b.host = null;
            b.gfx.setDepth(17);
          } else {
            b.x = b.host.x + b.offX;
            b.y = b.host.y + b.offY;
          }
        }
        this.drawBlossom(b, time, owner === 'player' && this.viewing && i === this.viewIndex);
      }
    }
  }

  /**
   * Six (terror: seven) tapered petals swaying around a central eye, opening as the
   * bloom grows in and pulsing a sonar ring once it is fully open.
   */
  private drawBlossom(b: Blossom, time: number, active: boolean): void {
    const g = b.gfx;
    g.clear();
    const terror = b.kind === 'terror';
    const base = terror ? TERROR_BLOOM_COLOR : ECHO_BLOOM_COLOR;
    const deep = terror ? 0x551122 : 0x445588;
    const petals = terror ? 7 : 6;
    const age = time - b.bornAt;
    const grow = Phaser.Math.Clamp(age / 420, 0, 1);
    const scale = (0.35 + 0.65 * grow) * (active ? 1.18 : 1);
    const life = b.expiresAt === Infinity ? 1 : Phaser.Math.Clamp((b.expiresAt - time) / 1500, 0, 1);
    const alpha = 0.35 + 0.65 * life;

    g.fillStyle(0x000000, 0.3 * alpha);
    g.fillEllipse(b.x, b.y + 11 * scale, 30 * scale, 10 * scale);

    // Petal outline in axis-local coords: fraction along the petal, fraction of its
    // half-width. Traced up one side and back down the other, so the silhouette is a
    // leaf that swells past halfway and tapers to a point.
    const OUTLINE: [number, number][] = [
      [0.14, 0.0], [0.30, 0.55], [0.58, 0.98], [0.84, 0.62], [1.0, 0.0],
      [0.84, -0.62], [0.58, -0.98], [0.30, -0.55],
    ];

    for (let i = 0; i < petals; i++) {
      const sway = Math.sin(time / 420 + b.swaySeed + i * 0.7) * 0.16;
      const a = (i / petals) * Math.PI * 2 + sway;
      // Each petal breathes on its own clock — a bloom that pulses in lockstep reads mechanical.
      const breathe = 1 + 0.07 * Math.sin(time / 330 + b.swaySeed * 2 + i);
      const len = (terror ? 23 : 20) * scale * breathe;
      const wid = (terror ? 6.5 : 9) * scale;
      const cos = Math.cos(a), sin = Math.sin(a);
      const pts = OUTLINE.map(([u, v]) => new Phaser.Geom.Point(
        b.x + cos * len * u - sin * wid * v,
        b.y + sin * len * u + cos * wid * v,
      ));
      g.fillStyle(base, 0.72 * alpha);
      g.fillPoints(pts, true);
      g.lineStyle(1, deep, 0.85 * alpha);
      g.strokePoints(pts, true);
      // Spine highlight — catches the light down the middle of each petal.
      g.lineStyle(1.4, terror ? 0xff8899 : 0xe4e8ff, 0.5 * alpha);
      g.lineBetween(
        b.x + cos * len * 0.2, b.y + sin * len * 0.2,
        b.x + cos * len * 0.88, b.y + sin * len * 0.88,
      );
      if (terror) {
        // Barbed tips — a terror bloom is a hooked thing, not a flower.
        const tx = b.x + cos * len, ty = b.y + sin * len;
        g.fillStyle(0xff6677, 0.9 * alpha);
        g.fillTriangle(
          tx + cos * 5 * scale, ty + sin * 5 * scale,
          tx - sin * 2.5 * scale, ty + cos * 2.5 * scale,
          tx + sin * 2.5 * scale, ty - cos * 2.5 * scale,
        );
      }
    }

    // Calyx: a ring of short sepals tucked under the petals, hiding where they meet.
    for (let i = 0; i < petals; i++) {
      const a = ((i + 0.5) / petals) * Math.PI * 2 + Math.sin(time / 500 + b.swaySeed) * 0.1;
      const cos = Math.cos(a), sin = Math.sin(a);
      g.fillStyle(deep, 0.85 * alpha);
      g.fillTriangle(
        b.x + cos * 12 * scale, b.y + sin * 12 * scale,
        b.x - sin * 3.5 * scale, b.y + cos * 3.5 * scale,
        b.x + sin * 3.5 * scale, b.y - cos * 3.5 * scale,
      );
    }

    // The eye. It tracks your cursor while you are behind it, and idles otherwise.
    const look = active
      ? Math.atan2(this.arena.pointer.worldY - b.y, this.arena.pointer.worldX - b.x)
      : time / 900 + b.swaySeed;
    g.fillStyle(terror ? 0xffdddd : 0xf2f4ff, 0.95 * alpha);
    g.fillCircle(b.x, b.y, 7 * scale);
    g.fillStyle(terror ? 0xaa1122 : 0x5566aa, 0.9 * alpha);
    g.fillCircle(b.x + Math.cos(look) * 2 * scale, b.y + Math.sin(look) * 2 * scale, 4.4 * scale);
    g.fillStyle(0x080810, 0.95 * alpha);
    g.fillCircle(b.x + Math.cos(look) * 3 * scale, b.y + Math.sin(look) * 3 * scale, 2.2 * scale);

    if (grow >= 1) {
      const ping = (age % 1600) / 1600;
      g.lineStyle(1.5, base, (1 - ping) * 0.45 * alpha);
      g.strokeCircle(b.x, b.y, 12 + ping * 26);
    }
    if (active) {
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokeCircle(b.x, b.y, 24 * scale);
    }
  }

  private updateBloomBullets(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    for (let i = this.bloomBullets.length - 1; i >= 0; i--) {
      const p = this.bloomBullets[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const caster = p.owner === 'player' ? this.arena.player : this.arena.npc;
      const enemy = p.owner === 'player' ? this.arena.npc : this.arena.player;
      let done = false;

      if (enemy.hp > 0 && Phaser.Math.Distance.Between(p.x, p.y, enemy.x, enemy.y) <= 24) {
        enemy.takeDamage(p.damage);
        this.arena.spawnHitFlash(enemy.x, enemy.y, p.kind === 'terror' ? TERROR_BLOOM_COLOR : ECHO_BLOOM_COLOR);
        done = true;
      } else if (Phaser.Math.Distance.Between(p.x, p.y, caster.x, caster.y) <= 24) {
        // Shooting yourself feeds the eye instead of hurting you — but only while it is open.
        if (p.owner === 'player' && this.viewing) {
          caster.shieldHp += VIEW_SELF_SHOT_SHIELD;
          this.arena.showFloatingText(caster.x, caster.y - 40, `+${VIEW_SELF_SHOT_SHIELD} 💠`, '#44ccff');
          this.arena.spawnHitFlash(caster.x, caster.y, 0x44ccff);
          done = true;
        }
      }

      if (done || time - p.bornAt > BLOOM_SHOT_LIFETIME_MS
          || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        p.gfx.destroy();
        this.bloomBullets.splice(i, 1);
        continue;
      }

      const color = p.kind === 'terror' ? TERROR_BLOOM_COLOR : ECHO_BLOOM_COLOR;
      const a = Math.atan2(p.vy, p.vx);
      const g = p.gfx;
      g.clear();
      g.fillStyle(color, 0.25);
      g.fillCircle(p.x - Math.cos(a) * 8, p.y - Math.sin(a) * 8, 4);
      g.fillStyle(color, 0.9);
      g.fillCircle(p.x, p.y, 4.5);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(p.x, p.y, 2);
    }
  }

  /** Close the eye when the bloom, the shield, or you run out. */
  private updateViewing(): void {
    if (!this.viewing) return;
    const player = this.arena.player;
    if (player.hp <= 0 || !player.active) { this.exitViewing('Eye Closed'); return; }
    if (this.playerBlossoms.length === 0) { this.exitViewing('Bloom Lost'); return; }
    if (player.shieldHp <= 0) {
      this.exitViewing('💠 SHIELD BROKEN');
      this.arena.spawnHitFlash(player.x, player.y, 0x44ccff);
      return;
    }
    if (this.viewIndex >= this.playerBlossoms.length) this.viewIndex = 0;
  }

  // ── NPC dispatchers ───────────────────────────────────────────────────────

  /** Online: the remote echo player planted a bloom (seed or terror). */
  doNpcEchoBloom(tx: number, ty: number): void {
    this.castBloom(tx, ty, 'npc');
  }

  /** Online: the remote echo player spat a bullet out of the bloom they are behind. */
  doNpcBloomShot(tx: number, ty: number): void {
    this.fireBloomBullet(this.arena.scene.time.now, tx, ty, 'npc');
  }

  /** Online: the remote echo player hopped to their next bloom. */
  doNpcBloomCycle(): void {
    if (this.npcBlossoms.length <= 1) return;
    this.npcViewIndex = (this.npcViewIndex + 1) % this.npcBlossoms.length;
  }

  /** Online: the remote echo player warped to a bloom, spending it. Their position syncs itself. */
  doNpcBloomWarp(): void {
    if (this.npcBlossoms.length === 0) return;
    const b = this.npcBlossoms[this.npcViewIndex];
    if (b) this.arena.spawnHitFlash(b.x, b.y, 0x99ffdd);
    this.dropBlossom(this.npcBlossoms, this.npcViewIndex, 'npc');
  }

  doNpcEcholocation(tx: number, ty: number): void {
    this.doEcholocation(tx, ty, 'npc');
  }

  doNpcGuess(tx: number, ty: number): void {
    this.doGuess(tx, ty, 'npc');
  }

  doNpcLantern(tx: number, ty: number): void {
    this.doLantern(tx, ty, 'npc');
  }

  doNpcBatForm(tx: number, ty: number): void {
    this.doBatForm(tx, ty, 'npc');
  }

  doNpcEclipse(tx: number, ty: number): void {
    this.doEclipse(tx, ty, 'npc');
  }
}
