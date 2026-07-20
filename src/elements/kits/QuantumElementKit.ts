import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';

// ── Arena API ────────────────────────────────────────────────────────────────

export interface QuantumElementArenaApi {
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
  get elementId(): string;
  get npcElementId(): string;
  get sceneWidth(): number;
  get sceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  hasPerk(perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamage(owner: 'player' | 'npc', cx: number, cy: number, radius: number, damage: number): void;
  startCooldown(owner: 'player' | 'npc', abilityId: string): void;
  setSpeedMult(owner: 'player' | 'npc', mult: number): void;
  lockPlayer(durationMs: number): void;
  stunNpc(durationMs: number): void;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface QuantumBullet {
  sprite: Phaser.GameObjects.Arc;
  baseX: number;
  baseY: number;
  dirX: number;
  dirY: number;
  perpX: number;
  perpY: number;
  elapsed: number;
  freq: number;
  amplitude: number;
  endsAt: number;
  owner: 'player' | 'npc';
  damage: number;
  zone: 'red' | 'yellow' | 'green' | 'gold';
  waveSetId: number;
}

interface ChaosTelegraph {
  owner: 'player' | 'npc';
  form: 'red' | 'blue';
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  dirX: number;
  dirY: number;
  gfx: Phaser.GameObjects.Graphics;
  endsAt: number;
  resolved: boolean;
}

interface NhilegoShadow {
  circle: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  fireAt: number;
  owner: 'player' | 'npc';
}

// ── Constants ────────────────────────────────────────────────────────────────

const BAR_X = 30;
const BAR_Y = 120;
const BAR_W = 16;
const GOLD_H = 24;
const GREEN_H = 80;
const YELLOW_H = 160;
const RED_H = 160;
const BASE_BAR_H = GREEN_H + YELLOW_H + RED_H;
const INDICATOR_H = 8;
const BASE_BOUNCE_PERIOD_MS = 1500;
const FAST_BOUNCE_PERIOD_MS = 900;

// ── Style tier table ─────────────────────────────────────────────────────────

const STYLE_TIERS = [
  { letter: 'F', color: '#888888', fillColor: 0x555555, speedBonus: 0,    cdReduction: 0,    waveBullets: 20 },
  { letter: 'E', color: '#88ff88', fillColor: 0x44aa44, speedBonus: 0.05, cdReduction: 0.05, waveBullets: 22 },
  { letter: 'D', color: '#44ffff', fillColor: 0x44aaaa, speedBonus: 0.10, cdReduction: 0.10, waveBullets: 24 },
  { letter: 'C', color: '#ffff44', fillColor: 0xaaaa44, speedBonus: 0.15, cdReduction: 0.15, waveBullets: 26 },
  { letter: 'B', color: '#ff8844', fillColor: 0xaa5522, speedBonus: 0.20, cdReduction: 0.20, waveBullets: 28 },
  { letter: 'A', color: '#ff4444', fillColor: 0xaa2222, speedBonus: 0.25, cdReduction: 0.23, waveBullets: 30 },
  { letter: 'S', color: '#ff44ff', fillColor: 0xaa22aa, speedBonus: 0.30, cdReduction: 0.25, waveBullets: 32 },
] as const;

// ── Kit ──────────────────────────────────────────────────────────────────────

export class QuantumElementKit {
  private api: QuantumElementArenaApi;

  // ── Form state ──────────────────────────────────────────────────────────
  private playerForm: 'red' | 'blue' = 'red';
  private playerFormLockoutUntil = 0;
  private playerFormSwitchAt = 0;
  private playerRedAura: Phaser.GameObjects.Arc | null = null;
  private playerBlueAura: Phaser.GameObjects.Arc | null = null;
  private playerFormRing: Phaser.GameObjects.Graphics | null = null;

  // ── Stiff Strike (red proc) ─────────────────────────────────────────────
  private playerStiffStrikeReady = false;
  private playerStiffStrikeReadyAt = 0;

  // ── Auto-Dodge (blue proc) ──────────────────────────────────────────────
  private playerAutoDodgeReady = false;
  private playerAutoDodgeReadyAt = 0;
  private playerAutoDodgeBurstEnd = 0;

  // ── Quantum Mechanic (F) ────────────────────────────────────────────────
  private playerMechanicEnd = 0;
  private playerMechanicPrevForm: 'red' | 'blue' = 'red';
  private playerMechanicDamageDealt = 0;

  // ── Wave charge bar ──────────────────────────────────────────────────────
  private chargeBarGfx: Phaser.GameObjects.Graphics | null = null;
  private chargeBarIndicatorGfx: Phaser.GameObjects.Graphics | null = null;
  private chargeHoldStart = 0;
  private pointerWasDown = false;

  // ── Wave projectiles ─────────────────────────────────────────────────────
  private playerBullets: QuantumBullet[] = [];
  private npcBullets: QuantumBullet[] = [];
  private playerWaveSetEndsAt = 0;
  private npcWaveSetEndsAt = 0;
  private playerWaveTimers: Phaser.Time.TimerEvent[] = [];
  private npcWaveTimers: Phaser.Time.TimerEvent[] = [];
  private playerWaveStyleFeatFiredIds = new Set<number>();

  // ── Chaos telegraphs ─────────────────────────────────────────────────────
  private chaosTelegraphs: ChaosTelegraph[] = [];

  // ── Vibration (R) ────────────────────────────────────────────────────────
  private playerVibrationActive = false;
  private playerVibrationTargetUntil = 0;
  private playerVibrationAura: Phaser.GameObjects.Arc | null = null;
  private playerVibrationDashEnd = 0;
  private playerVibrationCastAngle = 0;
  private playerVibrationLaunchEnd = 0;
  private playerVibrationSpinning = false;
  private playerVibrationSpinEnd = 0;
  private playerVibrationCountdownText: Phaser.GameObjects.Text | null = null;

  // ── Atom-Nhilego (Q) ─────────────────────────────────────────────────────
  private playerNhilegoActive = false;
  private playerNhilegoRadius = 70;
  private playerNhilegoSuccessCount = 0;
  private playerNhilegoShadow: NhilegoShadow | null = null;

  // ── Ionization Energy (Q+) ───────────────────────────────────────────────
  private ionizationEnergyMs = 0;
  private ionizationFillFlag = false;
  private ionizationStandAccumMs = 0;
  private ionizationBarBg: Phaser.GameObjects.Rectangle | null = null;
  private ionizationBarFill: Phaser.GameObjects.Rectangle | null = null;

  // ── Style system (F+) ────────────────────────────────────────────────────
  private styleTier = 0;
  private stylePoints = 0;
  private styleDrainAccum = 0;
  private styleTierText: Phaser.GameObjects.Text | null = null;
  private styleBarBg: Phaser.GameObjects.Rectangle | null = null;
  private styleBarFill: Phaser.GameObjects.Rectangle | null = null;
  private styleBenefitsText: Phaser.GameObjects.Text | null = null;
  private styleFeatText: Phaser.GameObjects.Text | null = null;
  private styleFeatTween: Phaser.Tweens.Tween | null = null;
  private styleFreshChip: Phaser.GameObjects.Text | null = null;

  // ── Sonic Boom (perk: whip attack) ───────────────────────────────────────
  private sonicBoomWhipActive = false;
  private sonicBoomWhipStartTime = 0;
  private sonicBoomWhipAngle = 0;
  private sonicBoomWhipMaxRange = 200;
  private sonicBoomWhipDamage = 6;
  private sonicBoomWhipZone: 'red' | 'yellow' | 'green' | 'gold' = 'red';
  private sonicBoomWhipHit = false;
  private sonicBoomWhipGfx: Phaser.GameObjects.Graphics | null = null;
  private sonicBoomWhipGoldBonus = false;

  // ── NPC state ────────────────────────────────────────────────────────────
  private npcMechanicEnd = 0;
  private npcNhilegoActive = false;
  private npcNhilegoRadius = 70;
  private npcNhilegoSuccessCount = 0;
  private npcNhilegoShadow: NhilegoShadow | null = null;

  constructor(api: QuantumElementArenaApi) {
    this.api = api;
  }

  // ── Public getters ───────────────────────────────────────────────────────

  isNpcMechanicActive(): boolean { return this.api.scene.time.now < this.npcMechanicEnd; }
  isNpcNhilegoActive(): boolean { return this.npcNhilegoActive; }
  isNpcVibrationActive(): boolean { return false; }

  getPlayerSpeedMult(): number {
    const styleBonus = STYLE_TIERS[this.styleTier].speedBonus;
    const ionMult = this.ionizationEnergyMs > 0 ? 1.5 : 1;
    return (1 + styleBonus) * ionMult;
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  reset(): void {
    this.api.player.quantumIncomingMult = 1;

    this.playerForm = 'red';
    this.playerFormLockoutUntil = 0;
    this.playerFormSwitchAt = 0;
    this._destroyRedAura();
    this._destroyBlueAura();
    if (this.playerFormRing?.active) this.playerFormRing.destroy();
    this.playerFormRing = null;

    this.playerStiffStrikeReady = false;
    this.playerStiffStrikeReadyAt = 0;
    this.playerAutoDodgeReady = false;
    this.playerAutoDodgeReadyAt = 0;
    this.playerAutoDodgeBurstEnd = 0;
    this.playerMechanicEnd = 0;
    this.playerMechanicDamageDealt = 0;

    this.chargeBarGfx?.destroy();
    this.chargeBarGfx = null;
    this.chargeBarIndicatorGfx?.destroy();
    this.chargeBarIndicatorGfx = null;
    this.chargeHoldStart = 0;
    this.pointerWasDown = false;

    for (const ev of this.playerWaveTimers) ev.remove(false);
    this.playerWaveTimers = [];
    for (const ev of this.npcWaveTimers) ev.remove(false);
    this.npcWaveTimers = [];
    for (const b of this.playerBullets) { if (b.sprite?.active) b.sprite.destroy(); }
    this.playerBullets = [];
    for (const b of this.npcBullets) { if (b.sprite?.active) b.sprite.destroy(); }
    this.npcBullets = [];
    this.playerWaveSetEndsAt = 0;
    this.npcWaveSetEndsAt = 0;
    this.playerWaveStyleFeatFiredIds.clear();

    for (const t of this.chaosTelegraphs) { if (t.gfx?.active) t.gfx.destroy(); }
    this.chaosTelegraphs = [];

    this.playerVibrationActive = false;
    this.playerVibrationTargetUntil = 0;
    if (this.playerVibrationAura?.active) this.playerVibrationAura.destroy();
    this.playerVibrationAura = null;
    this.playerVibrationDashEnd = 0;
    this.playerVibrationLaunchEnd = 0;
    this.playerVibrationSpinning = false;
    this.playerVibrationSpinEnd = 0;
    if (this.playerVibrationCountdownText?.active) this.playerVibrationCountdownText.destroy();
    this.playerVibrationCountdownText = null;

    this.playerNhilegoActive = false;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    if (this.playerNhilegoShadow?.circle?.active) this.playerNhilegoShadow.circle.destroy();
    this.playerNhilegoShadow = null;

    this.ionizationEnergyMs = 0;
    this.ionizationFillFlag = false;
    this.ionizationStandAccumMs = 0;
    if (this.ionizationBarBg?.active) this.ionizationBarBg.destroy();
    this.ionizationBarBg = null;
    if (this.ionizationBarFill?.active) this.ionizationBarFill.destroy();
    this.ionizationBarFill = null;

    this.styleTier = 0;
    this.stylePoints = 0;
    this.styleDrainAccum = 0;
    this._teardownStyleHud();

    this.sonicBoomWhipGfx?.destroy();
    this.sonicBoomWhipGfx = null;
    this.sonicBoomWhipActive = false;
    this.sonicBoomWhipHit = false;
    this.sonicBoomWhipGoldBonus = false;

    this.npcMechanicEnd = 0;
    this.npcNhilegoActive = false;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    if (this.npcNhilegoShadow?.circle?.active) this.npcNhilegoShadow.circle.destroy();
    this.npcNhilegoShadow = null;

    this.api.player.cooldownMult = 1;
  }

  // ── Input (player only) ──────────────────────────────────────────────────

  handleInput(time: number, _delta: number, pointer: Phaser.Input.Pointer): void {
    const { api } = this;
    if (api.elementId !== 'quantum') return;
    if (api.nukeChanneling) return;

    const { player } = api;
    const isInMechanic = time < this.playerMechanicEnd;

    // ── E: Chaos Control ─────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(api.eKey)) {
      if (player.getCooldownRatio('chaos-control') >= 1) {
        this.doPlayerChaosControl(pointer.worldX, pointer.worldY, time);
        api.player.startCooldown('chaos-control');
      }
    }

    // ── R: Atom Vibration — free recast only while enemy has Vibration
    if (Phaser.Input.Keyboard.JustDown(api.rKey)) {
      if (this.playerVibrationActive || player.getCooldownRatio('atom-vibration') >= 1) {
        this.doPlayerAtomVibration(pointer.worldX, pointer.worldY, time);
      }
    }

    // ── F: Quantum Mechanic ──────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(api.fKey)) {
      if (time >= this.playerMechanicEnd && player.getCooldownRatio('quantum-mechanic') >= 1) {
        this.doPlayerMechanic(pointer.worldX, pointer.worldY, time);
      }
    }

    // ── Q: Atom-Nhilego ──────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(api.qKey)) {
      if (player.getCooldownRatio('atom-nhilego') >= 1) {
        this.doPlayerAtomNhilego(pointer.worldX, pointer.worldY, time);
      }
    }

    // ── Click: Wave Reducer charge bar ───────────────────────────────────
    const hasGold = api.hasUpgrade('click');
    const goldH = hasGold ? GOLD_H : 0;
    const totalBarH = goldH + BASE_BAR_H;
    const bouncePeriod = hasGold ? FAST_BOUNCE_PERIOD_MS : BASE_BOUNCE_PERIOD_MS;
    const isDown = pointer.isDown;

    if (isDown && !this.pointerWasDown) {
      this.chargeHoldStart = time;
      this.chargeBarGfx = api.scene.add.graphics().setDepth(100).setScrollFactor(0);
      const g = this.chargeBarGfx;
      if (hasGold) {
        g.fillStyle(0xffdd44, 0.85); g.fillRect(BAR_X, BAR_Y, BAR_W, goldH);
      }
      g.fillStyle(0x44cc44, 0.7); g.fillRect(BAR_X, BAR_Y + goldH, BAR_W, GREEN_H);
      g.fillStyle(0xcccc44, 0.7); g.fillRect(BAR_X, BAR_Y + goldH + GREEN_H, BAR_W, YELLOW_H);
      g.fillStyle(0xcc4444, 0.7); g.fillRect(BAR_X, BAR_Y + goldH + GREEN_H + YELLOW_H, BAR_W, RED_H);
      g.lineStyle(2, 0xffffff, 0.8); g.strokeRect(BAR_X, BAR_Y, BAR_W, totalBarH);
      this.chargeBarIndicatorGfx = api.scene.add.graphics().setDepth(101).setScrollFactor(0);
    } else if (isDown && this.chargeBarIndicatorGfx) {
      const elapsed = (time - this.chargeHoldStart + bouncePeriod) % (bouncePeriod * 2);
      const t = elapsed / (bouncePeriod * 2);
      const frac = t < 0.5 ? t * 2 : (1 - t) * 2;
      const y = BAR_Y + frac * (totalBarH - INDICATOR_H);
      this.chargeBarIndicatorGfx.clear();
      this.chargeBarIndicatorGfx.fillStyle(0xff2222, 1);
      this.chargeBarIndicatorGfx.fillRect(BAR_X - 4, y, BAR_W + 8, INDICATOR_H);
    } else if (!isDown && this.pointerWasDown) {
      const holdMs = time - this.chargeHoldStart;
      let zone: 'red' | 'yellow' | 'green' | 'gold';
      if (holdMs < 120) {
        zone = 'red';
      } else {
        const elapsed = (holdMs + bouncePeriod) % (bouncePeriod * 2);
        const t = elapsed / (bouncePeriod * 2);
        const frac = t < 0.5 ? t * 2 : (1 - t) * 2;
        const indicatorY = BAR_Y + frac * (totalBarH - INDICATOR_H);
        if (hasGold && indicatorY < BAR_Y + goldH) zone = 'gold';
        else if (indicatorY < BAR_Y + goldH + GREEN_H) zone = 'green';
        else if (indicatorY < BAR_Y + goldH + GREEN_H + YELLOW_H) zone = 'yellow';
        else zone = 'red';
      }
      this.chargeBarGfx?.destroy();
      this.chargeBarGfx = null;
      this.chargeBarIndicatorGfx?.destroy();
      this.chargeBarIndicatorGfx = null;
      this.chargeHoldStart = 0;
      if (time >= this.playerWaveSetEndsAt) {
        if (this.api.hasPerk('sonic-boom')) {
          this.doSonicBoomWhip(pointer.worldX, pointer.worldY, zone, time);
        } else {
          this.doPlayerQuantumWave(pointer.worldX, pointer.worldY, zone, time);
        }
      }
    }

    void isInMechanic;
    this.pointerWasDown = isDown;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { api } = this;
    const dt = delta / 1000;

    if (api.elementId === 'quantum') {
      // Lazy HUD init — safe here because player exists by the time update() runs
      if (api.hasUpgrade('f') && !this.styleTierText) this._initStyleHud();

      this._tickPlayerPassives(time, delta);
      this._tickAutoDodge(time);
      this._tickStyleDrain(delta);
      this._tickIonization(time, delta);

      // Apply style cooldown reduction
      if (api.hasUpgrade('f')) {
        api.player.cooldownMult = 1 - STYLE_TIERS[this.styleTier].cdReduction;
      } else {
        api.player.cooldownMult = 1;
      }
    }

    this._updateBullets(this.playerBullets, time, dt, 'player');
    this._updateBullets(this.npcBullets, time, dt, 'npc');
    this._updateChaos(time);

    if (api.elementId === 'quantum') {
      this._tickVibration(time);
      this._tickSonicBoomWhip(time);
    }

    if (this.playerNhilegoActive) this._tickNhilego(time, 'player');
    if (this.npcNhilegoActive) this._tickNhilego(time, 'npc');

    this._tickMechanic(time);
  }

  // ── Player passive tick ──────────────────────────────────────────────────

  private _tickPlayerPassives(time: number, _delta: number): void {
    const { api } = this;
    const { player } = api;
    const isInMechanic = time < this.playerMechanicEnd;
    const isLocked = !isInMechanic && time < this.playerFormLockoutUntil;

    // Blue-form damage reduction (stacks with ionization)
    let incomingMult = 1;
    if (!isLocked && (this.playerForm === 'blue' || isInMechanic)) {
      incomingMult = 0.85;
    }
    // Ionization energy reduces incoming damage by 25%
    if (this.ionizationEnergyMs > 0) {
      incomingMult = Math.min(incomingMult, 0.75);
    }
    player.quantumIncomingMult = incomingMult;

    if (!isLocked && (this.playerForm === 'red' || isInMechanic)) {
      if (!this.playerStiffStrikeReady && time >= this.playerStiffStrikeReadyAt) {
        this.playerStiffStrikeReady = true;
        if (!this.playerRedAura) this._spawnRedAura();
      }
    }

    if (!isLocked && (this.playerForm === 'blue' || isInMechanic)) {
      if (!this.playerAutoDodgeReady && time >= this.playerAutoDodgeReadyAt) {
        this.playerAutoDodgeReady = true;
        if (!this.playerBlueAura) this._spawnBlueAura();
      }
    }

    if (this.playerRedAura?.active) this.playerRedAura.setPosition(player.x, player.y);
    if (this.playerBlueAura?.active) this.playerBlueAura.setPosition(player.x, player.y);

    // ── Persistent form ring ───────────────────────────────────────────────
    if (!this.playerFormRing || !this.playerFormRing.active) {
      this.playerFormRing = api.scene.add.graphics().setDepth(6);
    }
    this.playerFormRing.clear();
    if (isInMechanic) {
      const flip = Math.floor(time / 120) % 2 === 0;
      const col = flip ? 0xff4422 : 0x44aaff;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.012);
      this.playerFormRing.lineStyle(4, col, pulse);
      this.playerFormRing.strokeCircle(player.x, player.y, 22);
      this.playerFormRing.lineStyle(2, flip ? 0x44aaff : 0xff4422, pulse * 0.5);
      this.playerFormRing.strokeCircle(player.x, player.y, 28);
    } else if (this.playerForm === 'red') {
      const pulse = 0.55 + 0.35 * Math.sin(time * 0.005);
      this.playerFormRing.lineStyle(3, 0xff4422, pulse);
      this.playerFormRing.strokeCircle(player.x, player.y, 22);
      this.playerFormRing.lineStyle(1, 0xff8833, pulse * 0.6);
      this.playerFormRing.strokeCircle(player.x, player.y, 27);
    } else {
      const pulse = 0.55 + 0.35 * Math.sin(time * 0.003);
      this.playerFormRing.lineStyle(3, 0x44aaff, pulse);
      this.playerFormRing.strokeCircle(player.x, player.y, 22);
      this.playerFormRing.lineStyle(1, 0xaaddff, pulse * 0.5);
      this.playerFormRing.strokeCircle(player.x, player.y, 29);
    }

    if (player.isInvincible && this.playerAutoDodgeBurstEnd > 0 && time >= this.playerAutoDodgeBurstEnd) {
      player.isInvincible = false;
      this.playerAutoDodgeBurstEnd = 0;
    }
  }

  // ── Auto-dodge ───────────────────────────────────────────────────────────

  private _tickAutoDodge(time: number): void {
    const isInMechanic = time < this.playerMechanicEnd;
    const isLocked = !isInMechanic && time < this.playerFormLockoutUntil;
    if (isLocked) return;
    if (this.playerForm !== 'blue' && !isInMechanic) return;
    if (!this.playerAutoDodgeReady) return;

    const { player } = this.api;
    const body = player.body as Phaser.Physics.Arcade.Body;

    for (const go of this.api.projectiles.getChildren()) {
      const p = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
      if (!p.active || p.isFromPlayer === true) continue;
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const dToBullet = Math.hypot(dx, dy);
      if (dToBullet > 80) continue;
      const pb = p.body as Phaser.Physics.Arcade.Body;
      const vx = pb.velocity.x;
      const vy = pb.velocity.y;
      const speed = Math.hypot(vx, vy);
      if (speed < 1) continue;
      const toLen = dToBullet || 1;
      const approachDot = (vx / speed) * (-dx / toLen) + (vy / speed) * (-dy / toLen);
      if (approachDot < 0.4) continue;

      body.setVelocity(-vy / speed * 520, vx / speed * 520);
      player.isInvincible = true;
      this.playerAutoDodgeBurstEnd = time + 280;
      this.playerAutoDodgeReady = false;
      this.playerAutoDodgeReadyAt = time + 5000;
      this._destroyBlueAura();
      this.api.showFloatingText(player.x, player.y - 30, 'Auto-Dodge', '#66aaff');
      if (this.api.hasUpgrade('f')) this.addStyle('autoDodge', 1);
      return;
    }
  }

  // ── Mechanic expiry ──────────────────────────────────────────────────────

  private _tickMechanic(time: number): void {
    if (this.playerMechanicEnd > 0 && time >= this.playerMechanicEnd) {
      this.playerMechanicEnd = 0;
      const { player } = this.api;
      // Check mechanic damage feat
      if (this.api.hasUpgrade('f') && this.playerMechanicDamageDealt >= 25) {
        this.addStyle('mechanicDamage25', 3);
      }
      this.playerMechanicDamageDealt = 0;
      this.api.lockPlayer(2000);
      this.playerForm = this.playerMechanicPrevForm;
      if (this.playerForm === 'red') this._destroyBlueAura();
      else this._destroyRedAura();
      this.api.showFloatingText(player.x, player.y - 35, 'Mechanic End', '#dd88ff');
      this.api.startCooldown('player', 'quantum-mechanic');
    }

    if (this.npcMechanicEnd > 0 && time >= this.npcMechanicEnd) {
      this.npcMechanicEnd = 0;
    }
  }

  // ── Style drain tick ─────────────────────────────────────────────────────

  private _tickStyleDrain(delta: number): void {
    if (!this.api.hasUpgrade('f')) return;
    this.styleDrainAccum += delta;
    while (this.styleDrainAccum >= 2000) {
      this.styleDrainAccum -= 2000;
      if (this.stylePoints > 0) {
        this.stylePoints -= 1;
      } else if (this.styleTier > 0) {
        this.styleTier--;
        this.stylePoints = 9;
      }
    }
    this._renderStyleHud(this.api.scene.time.now);
  }

  // ── Ionization energy tick ───────────────────────────────────────────────

  private _tickIonization(time: number, delta: number): void {
    if (!this.api.hasUpgrade('q')) {
      if (this.ionizationBarBg?.active) { this.ionizationBarBg.destroy(); this.ionizationBarBg = null; }
      if (this.ionizationBarFill?.active) { this.ionizationBarFill.destroy(); this.ionizationBarFill = null; }
      return;
    }

    const { player, scene } = this.api;
    const shadow = this.playerNhilegoShadow;
    const inOwnShadow = !!shadow && !!shadow.circle?.active &&
      Phaser.Math.Distance.Between(shadow.x, shadow.y, player.x, player.y) <= shadow.radius;

    const prevMs = this.ionizationEnergyMs;
    if (inOwnShadow) {
      this.ionizationEnergyMs = Math.min(10000, this.ionizationEnergyMs + delta);
      this.ionizationStandAccumMs += delta;
      const newSeconds = Math.floor(this.ionizationStandAccumMs / 1000);
      const prevSeconds = Math.floor((this.ionizationStandAccumMs - delta) / 1000);
      if (newSeconds > prevSeconds && this.api.hasUpgrade('f')) {
        this.addStyle('nhilegoShadowStand', 1);
      }
      // ionizationMax style feat
      if (prevMs < 10000 && this.ionizationEnergyMs >= 10000 && !this.ionizationFillFlag) {
        this.ionizationFillFlag = true;
        if (this.api.hasUpgrade('f')) this.addStyle('ionizationMax', 2);
      }
    } else {
      this.ionizationEnergyMs = Math.max(0, this.ionizationEnergyMs - delta);
      this.ionizationStandAccumMs = 0;
      if (this.ionizationEnergyMs < 10000) this.ionizationFillFlag = false;
    }

    // Render bar above player
    const BAR_W2 = 60;
    const BAR_H2 = 6;
    const bx = player.x;
    const by = player.y - 52;
    const fillW = (this.ionizationEnergyMs / 10000) * BAR_W2;

    if (!this.ionizationBarBg || !this.ionizationBarBg.active) {
      this.ionizationBarBg = scene.add.rectangle(bx, by, BAR_W2, BAR_H2, 0x222244, 0.7).setDepth(21).setOrigin(0.5, 0.5) as Phaser.GameObjects.Rectangle;
      this.ionizationBarFill = scene.add.rectangle(bx - BAR_W2 / 2, by, 0, BAR_H2, 0x66ff88, 0.95).setDepth(22).setOrigin(0, 0.5) as Phaser.GameObjects.Rectangle;
    }
    this.ionizationBarBg.setPosition(bx, by);
    this.ionizationBarFill!.setPosition(bx - BAR_W2 / 2, by).setSize(fillW, BAR_H2);
    const alpha = this.ionizationEnergyMs > 0 ? 0.95 : 0.3;
    this.ionizationBarBg.setAlpha(alpha * 0.7);
    this.ionizationBarFill!.setAlpha(alpha);

    void time;
  }

  // ── Bullet update ────────────────────────────────────────────────────────

  private _updateBullets(bullets: QuantumBullet[], time: number, dt: number, owner: 'player' | 'npc'): void {
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;
    const target = owner === 'player' ? this.api.npc : this.api.player;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.sprite?.active) { bullets.splice(i, 1); continue; }
      if (time >= b.endsAt) { b.sprite.destroy(); bullets.splice(i, 1); continue; }

      b.elapsed += dt;
      const progress = 320 * b.elapsed;
      const offset = b.amplitude * Math.sin(2 * Math.PI * b.freq * b.elapsed);
      const nx = b.baseX + b.dirX * progress + b.perpX * offset;
      const ny = b.baseY + b.dirY * progress + b.perpY * offset;
      b.sprite.setPosition(nx, ny);

      if (nx < 0 || nx > W || ny < 0 || ny > H) {
        b.sprite.destroy();
        bullets.splice(i, 1);
        continue;
      }

      if (target.hp > 0 && Math.hypot(target.x - nx, target.y - ny) < 22) {
        target.takeDamage(b.damage);
        this.api.spawnHitFlash(target.x, target.y, 0xaa44ff);
        // Award style feat on first hit of this wave set (player only)
        if (owner === 'player' && this.api.hasUpgrade('f') && !this.playerWaveStyleFeatFiredIds.has(b.waveSetId)) {
          this.playerWaveStyleFeatFiredIds.add(b.waveSetId);
          if (b.zone === 'gold') this.addStyle('clickGold', 3);
          else if (b.zone === 'green') this.addStyle('clickGreen', 2);
          else if (b.zone === 'yellow') this.addStyle('clickYellow', 1);
        }
        b.sprite.destroy();
        bullets.splice(i, 1);
      }
    }
  }

  // ── Chaos telegraph update ───────────────────────────────────────────────

  private _updateChaos(time: number): void {
    for (const t of this.chaosTelegraphs) {
      if (!t.gfx?.active) continue;
      if (t.resolved) continue;
      if (time >= t.endsAt) {
        t.resolved = true;
        this._resolveChaos(t, time);
        t.gfx.destroy();
        continue;
      }
      const caster = t.owner === 'player' ? this.api.player : this.api.npc;
      t.cx = caster.x;
      t.cy = caster.y;

      if (t.owner === 'player') {
        const dx = this.api.pointer.worldX - t.cx;
        const dy = this.api.pointer.worldY - t.cy;
        const d = Math.hypot(dx, dy) || 1;
        t.dirX = dx / d;
        t.dirY = dy / d;
      } else {
        const target = this.api.player;
        const dx = target.x - t.cx;
        const dy = target.y - t.cy;
        const d = Math.hypot(dx, dy) || 1;
        t.dirX = dx / d;
        t.dirY = dy / d;
      }

      if (t.form === 'red') {
        const ex = t.cx + t.dirX * 90;
        const ey = t.cy + t.dirY * 90;
        t.gfx.clear();
        t.gfx.fillStyle(0x882222, 0.35);
        t.gfx.lineStyle(2, 0xff4488, 0.8);
        t.gfx.fillCircle(ex, ey, 80);
        t.gfx.strokeCircle(ex, ey, 80);
      } else {
        this._drawCone(t.gfx, t.cx, t.cy, t.cx + t.dirX * 200, t.cy + t.dirY * 200);
      }
    }
    this.chaosTelegraphs = this.chaosTelegraphs.filter(t => !t.resolved);
  }

  private _drawCone(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, tx: number, ty: number): void {
    const halfCone = Math.PI / 9;
    const range = 200;
    const angle = Math.atan2(ty - cy, tx - cx);
    gfx.clear();
    gfx.fillStyle(0x4488cc, 0.3);
    gfx.lineStyle(2, 0x66aaff, 0.7);
    gfx.beginPath();
    gfx.moveTo(cx, cy);
    gfx.arc(cx, cy, range, angle - halfCone, angle + halfCone);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
  }

  private _resolveChaos(t: ChaosTelegraph, time: number): void {
    const { scene } = this.api;
    const isInMechanic = t.owner === 'player' ? time < this.playerMechanicEnd : false;

    if (t.form === 'red') {
      const ex = t.cx + t.dirX * 90;
      const ey = t.cy + t.dirY * 90;
      this._applyDamage(t.owner, ex, ey, 30, 80, time);

      if (t.owner === 'player' && this.api.hasUpgrade('f')) {
        const featId = isInMechanic ? 'chaosMechanic' : 'chaosControl';
        const pts = isInMechanic ? 3 : 2;
        this.addStyle(featId, pts);
      }

      if (t.owner === 'player' && this.api.hasUpgrade('e')) {
        const capDirX = t.dirX, capDirY = t.dirY, capOwner = t.owner;
        scene.time.delayedCall(450, () => {
          this._castRelapse(capOwner, capDirX, capDirY, 'red', scene.time.now);
        });
      }
    } else {
      const target = t.owner === 'player' ? this.api.npc : this.api.player;
      const targetAngle = Math.atan2(target.y - t.cy, target.x - t.cx);
      const baseAngle = Math.atan2(t.dirY, t.dirX);
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(targetAngle - baseAngle));
      const nDist = Math.hypot(target.x - t.cx, target.y - t.cy);
      if (nDist <= 200 && angleDiff <= Math.PI / 9) {
        this._applyDamage(t.owner, target.x, target.y, 30, 1, time);
        const slowTarget = t.owner === 'player' ? 'npc' : 'player';
        this.api.setSpeedMult(slowTarget, 0.85);
        this.api.scene.time.delayedCall(3000, () => this.api.setSpeedMult(slowTarget, 1));
        this.api.showFloatingText(target.x, target.y - 25, 'Slowed', '#66aaff');

        if (t.owner === 'player' && this.api.hasUpgrade('f')) {
          const featId = isInMechanic ? 'chaosMechanic' : 'chaosControl';
          const pts = isInMechanic ? 3 : 2;
          this.addStyle(featId, pts);
        }
      }

      if (t.owner === 'player' && this.api.hasUpgrade('e')) {
        const capDirX = t.dirX, capDirY = t.dirY, capOwner = t.owner;
        scene.time.delayedCall(450, () => {
          this._castRelapse(capOwner, capDirX, capDirY, 'blue', scene.time.now);
        });
      }
    }
  }

  private _castRelapse(owner: 'player' | 'npc', dirX: number, dirY: number, form: 'red' | 'blue', time: number): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const isInMechanic = owner === 'player' ? time < this.playerMechanicEnd : false;

    if (form === 'red') {
      const ex = caster.x + dirX * 90;
      const ey = caster.y + dirY * 90;
      const flash = scene.add.circle(ex, ey, 40, 0xcc44ff, 0.5).setDepth(12) as Phaser.GameObjects.Arc;
      flash.setStrokeStyle(2, 0xee88ff, 0.8);
      scene.time.delayedCall(250, () => { if (flash?.active) flash.destroy(); });
      this._applyDamage(owner, ex, ey, 15, 40, time);
      this.api.showFloatingText(ex, ey - 25, 'Relapse!', '#cc66ff');

      if (owner === 'player' && this.api.hasUpgrade('f')) {
        const featId = isInMechanic ? 'chaosRelapseMechanic' : 'chaosRelapse';
        const pts = isInMechanic ? 4 : 3;
        this.addStyle(featId, pts);
      }
    } else {
      const target = owner === 'player' ? this.api.npc : this.api.player;
      const targetAngle = Math.atan2(target.y - caster.y, target.x - caster.x);
      const baseAngle = Math.atan2(dirY, dirX);
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(targetAngle - baseAngle));
      const nDist = Math.hypot(target.x - caster.x, target.y - caster.y);
      if (nDist <= 100 && angleDiff <= Math.PI / 9) {
        this._applyDamage(owner, target.x, target.y, 15, 1, time);
        const slowTarget: 'player' | 'npc' = owner === 'player' ? 'npc' : 'player';
        this.api.setSpeedMult(slowTarget, 0.85);
        scene.time.delayedCall(1500, () => this.api.setSpeedMult(slowTarget, 1));
        this.api.showFloatingText(target.x, target.y - 25, 'Relapse!', '#cc66ff');

        if (owner === 'player' && this.api.hasUpgrade('f')) {
          const featId = isInMechanic ? 'chaosRelapseMechanic' : 'chaosRelapse';
          const pts = isInMechanic ? 4 : 3;
          this.addStyle(featId, pts);
        }
      }
    }
  }

  // ── Vibration tick ───────────────────────────────────────────────────────

  private _tickVibration(time: number): void {
    const { player, npc } = this.api;

    if (this.playerVibrationSpinning) {
      const dx = this.api.pointer.worldX - player.x;
      const dy = this.api.pointer.worldY - player.y;
      const angle = Math.atan2(dy, dx);
      this.playerVibrationCastAngle = angle;

      const orbitRadius = 60;
      const orbitX = player.x + Math.cos(angle) * orbitRadius;
      const orbitY = player.y + Math.sin(angle) * orbitRadius;
      const nb = npc.body as Phaser.Physics.Arcade.Body;
      nb.reset(orbitX, orbitY);

      if (time >= this.playerVibrationSpinEnd) {
        this.playerVibrationSpinning = false;
        npc.isInvincible = false;
        nb.reset(npc.x, npc.y);
        nb.setVelocity(Math.cos(angle) * 8400, Math.sin(angle) * 8400);
        this.playerVibrationLaunchEnd = time + 650;
        this.playerVibrationActive = true;
        this.playerVibrationTargetUntil = time + 12000;
        if (this.playerVibrationAura?.active) this.playerVibrationAura.destroy();
        this.playerVibrationAura = this.api.scene.add
          .circle(npc.x, npc.y, 28, 0x66ccff, 0.4)
          .setDepth(9) as Phaser.GameObjects.Arc;
        this.api.showFloatingText(npc.x, npc.y - 25, 'Vibration!', '#66ccff');
        if (this.api.hasUpgrade('f')) this.addStyle('atomVibrationHit', 2);
      }
      return;
    }

    if (this.playerVibrationDashEnd > 0 && time < this.playerVibrationDashEnd) {
      if (!this.playerVibrationActive && Math.hypot(npc.x - player.x, npc.y - player.y) < 36) {
        this._grabAndVibrate(time);
      }
    } else if (this.playerVibrationDashEnd > 0 && time >= this.playerVibrationDashEnd) {
      this.playerVibrationDashEnd = 0;
      if (!this.playerVibrationActive) {
        const body = player.body as Phaser.Physics.Arcade.Body;
        if (body?.enable) body.setVelocity(0, 0);
        this.api.startCooldown('player', 'atom-vibration');
      }
    }

    if (this.playerVibrationLaunchEnd > 0 && time >= this.playerVibrationLaunchEnd) {
      this.playerVibrationLaunchEnd = 0;
      const body = npc.body as Phaser.Physics.Arcade.Body;
      if (body?.enable) body.setVelocity(0, 0);
    }

    if (this.playerVibrationActive && this.playerVibrationAura?.active) {
      this.playerVibrationAura.setPosition(npc.x, npc.y);
      const alpha = 0.2 + 0.3 * Math.sin(time * 0.008);
      const tAnim = 0.5 + 0.5 * Math.sin(time * 0.004);
      const r = Math.round(Phaser.Math.Linear(0x66, 0xcc, tAnim));
      const g = Math.round(Phaser.Math.Linear(0xcc, 0x66, tAnim));
      this.playerVibrationAura.setFillStyle((r << 16) | (g << 8) | 0xff, alpha);
      this.playerVibrationAura.setAlpha(alpha);
    }

    // R+ countdown text above vibrating NPC
    if (this.playerVibrationActive && this.api.hasUpgrade('r')) {
      if (!this.playerVibrationCountdownText || !this.playerVibrationCountdownText.active) {
        this.playerVibrationCountdownText = this.api.scene.add.text(npc.x, npc.y - 36, '', {
          fontSize: '14px', fontFamily: '"Arial Black"',
          color: '#66ccff', stroke: '#000022', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(20);
      }
      const remaining = this.playerVibrationTargetUntil - time;
      const secs = Math.ceil(remaining / 1000);
      const isLastSec = remaining <= 1000;
      this.playerVibrationCountdownText
        .setText(`${secs}`)
        .setPosition(npc.x, npc.y - 36)
        .setColor(isLastSec ? '#ff4444' : '#66ccff');
    }

    if (this.playerVibrationActive && time >= this.playerVibrationTargetUntil) {
      this.playerVibrationActive = false;
      this.playerVibrationTargetUntil = 0;
      if (this.playerVibrationAura?.active) this.playerVibrationAura.destroy();
      this.playerVibrationAura = null;
      if (this.playerVibrationCountdownText?.active) this.playerVibrationCountdownText.destroy();
      this.playerVibrationCountdownText = null;
      this.api.startCooldown('player', 'atom-vibration');
      this.api.showFloatingText(npc.x, npc.y - 25, 'Vibration End', '#66ccff');
    }
  }

  private _grabAndVibrate(time: number): void {
    const { player, npc } = this.api;

    // Player is the caster stopping itself to grab — self-directed, not gated.
    const pb = player.body as Phaser.Physics.Arcade.Body;
    if (pb?.enable) pb.setVelocity(0, 0);

    // npc is the grabbed opponent — Unbreakable prevents the forced hold in place.
    const nb = npc.body as Phaser.Physics.Arcade.Body;
    if (nb?.enable && !npc.knockbackImmune) nb.setVelocity(0, 0);

    this.playerVibrationDashEnd = 0;
    this.playerVibrationSpinning = true;
    this.playerVibrationSpinEnd = time + 1000;
    npc.isInvincible = true;
    npc.frozenUntil = time + 1000;

    this.api.showFloatingText(npc.x, npc.y - 25, 'Grabbed!', '#66ccff');
  }

  // ── Nhilego tick ─────────────────────────────────────────────────────────

  private _tickNhilego(time: number, owner: 'player' | 'npc'): void {
    const shadow = owner === 'player' ? this.playerNhilegoShadow : this.npcNhilegoShadow;
    if (!shadow || !shadow.circle?.active) return;
    if (time < shadow.fireAt) return;
    this._nhilegoImpact(shadow, owner, time);
  }

  private _nhilegoImpact(shadow: NhilegoShadow, owner: 'player' | 'npc', time: number): void {
    const { api } = this;
    const { scene } = api;
    const { x, y, radius } = shadow;
    const caster = owner === 'player' ? api.player : api.npc;

    const flash = scene.add.circle(x, y, radius, 0xcc88ff, 0.8).setDepth(12) as Phaser.GameObjects.Arc;
    scene.time.delayedCall(300, () => { if (flash?.active) flash.destroy(); });
    this._applyDamage(owner, x, y, 25, radius, time);

    const dist = Math.hypot(caster.x - x, caster.y - y);
    if (dist <= radius) {
      if (owner === 'player') {
        this.playerNhilegoRadius *= 1.1;
        this.playerNhilegoSuccessCount++;
      } else {
        this.npcNhilegoRadius *= 1.1;
        this.npcNhilegoSuccessCount++;
      }
      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      api.showFloatingText(x, y - 30, `Hit! (${successCount})`, '#cc88ff');
      shadow.circle.destroy();
      this._spawnNhilegoShadow(owner, time);
    } else {
      shadow.circle.destroy();
      if (owner === 'player') this.playerNhilegoShadow = null;
      else this.npcNhilegoShadow = null;

      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      if (owner === 'player') {
        this.playerNhilegoActive = false;
        // Style feats for streak end
        if (this.api.hasUpgrade('f')) {
          if (successCount >= 10) this.addStyle('nhilegoStreak10', 5);
          else if (successCount >= 5) this.addStyle('nhilegoStreak5', 3);
        }
      } else {
        this.npcNhilegoActive = false;
      }

      const healAmt = successCount * 10;
      if (healAmt > 0) {
        caster.heal(healAmt);
        api.showFloatingText(caster.x, caster.y - 35, `+${healAmt}`, '#aaffaa');
      }
    }
  }

  private _spawnNhilegoShadow(owner: 'player' | 'npc', time: number): void {
    const { scene } = this.api;
    const radius = owner === 'player' ? this.playerNhilegoRadius : this.npcNhilegoRadius;
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;
    const pad = 100;
    const x = pad + Math.random() * (W - pad * 2);
    const y = pad + Math.random() * (H - pad * 2);

    const circle = scene.add
      .circle(x, y, radius, 0x221144, 0.7)
      .setDepth(4) as Phaser.GameObjects.Arc;
    circle.setStrokeStyle(2, 0x8844cc, 0.8);

    scene.tweens.add({
      targets: circle,
      scaleX: 0.9, scaleY: 0.9,
      yoyo: true, repeat: -1,
      duration: 700,
      ease: 'Sine.easeInOut',
    });

    const shadowObj: NhilegoShadow = { circle, x, y, radius, fireAt: time + 3000, owner };
    if (owner === 'player') this.playerNhilegoShadow = shadowObj;
    else this.npcNhilegoShadow = shadowObj;
  }

  // ── Aura helpers ─────────────────────────────────────────────────────────

  private _spawnRedAura(): void {
    const { player, scene } = this.api;
    if (this.playerRedAura?.active) this.playerRedAura.destroy();
    this.playerRedAura = scene.add.circle(player.x, player.y, 30, 0xff2200, 0.45)
      .setStrokeStyle(2, 0xff8844, 0.9)
      .setDepth(8) as Phaser.GameObjects.Arc;
    scene.tweens.add({
      targets: this.playerRedAura,
      scaleX: 1.25, scaleY: 1.25,
      yoyo: true, repeat: -1,
      duration: 280,
      ease: 'Quad.easeInOut',
    });
  }

  private _spawnBlueAura(): void {
    const { player, scene } = this.api;
    if (this.playerBlueAura?.active) this.playerBlueAura.destroy();
    this.playerBlueAura = scene.add.circle(player.x, player.y, 32, 0x0088cc, 0.25)
      .setStrokeStyle(2, 0xaaeeff, 0.85)
      .setDepth(8) as Phaser.GameObjects.Arc;
    scene.tweens.add({
      targets: this.playerBlueAura,
      scaleX: 1.12, scaleY: 1.12,
      yoyo: true, repeat: -1,
      duration: 1100,
      ease: 'Sine.easeInOut',
    });
  }

  private _destroyRedAura(): void {
    if (this.playerRedAura?.active) this.playerRedAura.destroy();
    this.playerRedAura = null;
  }

  private _destroyBlueAura(): void {
    if (this.playerBlueAura?.active) this.playerBlueAura.destroy();
    this.playerBlueAura = null;
  }

  // ── Damage with form bonuses ──────────────────────────────────────────────

  private _applyDamage(owner: 'player' | 'npc', cx: number, cy: number, damage: number, radius: number, time: number): void {
    const isInMechanic = owner === 'player' ? time < this.playerMechanicEnd : time < this.npcMechanicEnd;
    const isLocked = owner === 'player' && !isInMechanic && time < this.playerFormLockoutUntil;

    let mult = 1;
    if (!isLocked && (owner === 'npc' || this.playerForm === 'red' || isInMechanic)) {
      mult = 1.15;
    }

    if (owner === 'player' && this.playerStiffStrikeReady && !isLocked) {
      mult *= 1.5;
      this.playerStiffStrikeReady = false;
      this.playerStiffStrikeReadyAt = time + 5000;
      this._destroyRedAura();
      const finalDamage = Math.floor(damage * mult) - 1;
      this.api.dealAoeDamage(owner, cx, cy, radius, finalDamage);
      if (isInMechanic) this.playerMechanicDamageDealt += finalDamage;
      this.api.showFloatingText(cx, cy - 50, 'Stiff Strike!', '#ff8844');
      if (this.api.hasUpgrade('f')) this.addStyle('swiftStrike', 1);
      return;
    }

    const scaledDamage = damage * mult;
    this.api.dealAoeDamage(owner, cx, cy, radius, scaledDamage);
    if (owner === 'player' && isInMechanic) this.playerMechanicDamageDealt += scaledDamage;
  }

  // ── Threatened-by-projectile helper ──────────────────────────────────────

  private _isThreatenedByProjectile(px: number, py: number): boolean {
    for (const go of this.api.projectiles.getChildren()) {
      const p = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean };
      if (!p.active || p.isFromPlayer === true) continue;
      const dx = p.x - px;
      const dy = p.y - py;
      const dToBullet = Math.hypot(dx, dy);
      if (dToBullet > 80) continue;
      const pb = p.body as Phaser.Physics.Arcade.Body;
      const vx = pb.velocity.x;
      const vy = pb.velocity.y;
      const speed = Math.hypot(vx, vy);
      if (speed < 1) continue;
      const toLen = dToBullet || 1;
      const approachDot = (vx / speed) * (-dx / toLen) + (vy / speed) * (-dy / toLen);
      if (approachDot >= 0.4) return true;
    }
    return false;
  }

  // ── Form toggle (called by ArenaScene on Space dodge) ────────────────────

  toggleFormForDodge(time: number): void {
    const { player } = this.api;
    this.playerForm = this.playerForm === 'red' ? 'blue' : 'red';
    this.playerFormLockoutUntil = time + 5000;
    this.playerFormSwitchAt = time;
    this._destroyRedAura();
    this._destroyBlueAura();
    player.quantumIncomingMult = 1;
    this.playerStiffStrikeReady = false;
    this.playerStiffStrikeReadyAt = 0;
    this.playerAutoDodgeReady = false;
    this.playerAutoDodgeReadyAt = 0;

    this.api.showFloatingText(player.x, player.y - 35,
      this.playerForm === 'red' ? 'Entropy' : 'Order',
      this.playerForm === 'red' ? '#ff6644' : '#66aaff');

    // F+: award auto-dodge feat if a projectile was threatening
    if (this.api.hasUpgrade('f')) {
      const threatened = this._isThreatenedByProjectile(player.x, player.y);
      if (threatened) this.addStyle('autoDodge', 1);
    }
  }

  // ── Style system ─────────────────────────────────────────────────────────

  addStyle(featId: string, basePoints: number): void {
    if (!this.api.hasUpgrade('f')) return;
    const time = this.api.scene.time.now;

    let pts = basePoints;
    if (time - this.playerFormSwitchAt < 3000) {
      pts = Math.ceil(pts * 1.5);
    }

    this.styleDrainAccum = 0;
    this.stylePoints += pts;
    while (this.stylePoints >= 10 && this.styleTier < 6) {
      this.stylePoints -= 10;
      this.styleTier++;
    }
    if (this.styleTier >= 6) {
      this.styleTier = 6;
      if (this.stylePoints > 10) this.stylePoints = 10;
    }

    const W = this.api.scene.scale.width;
    const featLabels: Record<string, string> = {
      clickYellow:       '+1 Yellow Wave',
      clickGreen:        '+2 Green Wave',
      clickGold:         '+3 Gold Wave',
      chaosControl:      '+2 Chaos Control',
      chaosMechanic:     '+3 Chaos in Mechanic',
      chaosRelapse:      '+3 Relapse Hit',
      chaosRelapseMechanic: '+4 Relapse in Mechanic',
      atomVibrationHit:  '+2 Vibration Launch',
      vibrationActivate: '+1 Detonate',
      vibrationLastSecond: '+3 Last Second Detonate',
      swiftStrike:       '+1 Stiff Strike',
      autoDodge:         '+1 Auto Dodge',
      nhilegoShadowStand: '+1 Shadow Stand',
      nhilegoStreak5:    '+3 Streak x5',
      nhilegoStreak10:   '+5 Streak x10',
      ionizationMax:     '+2 Max Ionization',
      mechanicDamage25:  '+3 Mechanic Damage',
    };
    const label = featLabels[featId] ?? `+${pts} STYLE`;
    const displayText = pts !== basePoints ? `${label} (Fresh!)` : label;

    if (this.styleFeatText?.active) {
      this.styleFeatTween?.stop();
      this.styleFeatText.setText(displayText).setAlpha(1);
      const scene = this.api.scene;
      this.styleFeatTween = scene.tweens.add({
        targets: this.styleFeatText, alpha: 0, duration: 1200, delay: 600,
        onComplete: () => { if (this.styleFeatText?.active) this.styleFeatText.setAlpha(0); },
      });
    }
  }

  private _initStyleHud(): void {
    const { scene } = this.api;
    const W = scene.scale.width;
    const hudY = 8;
    const cx = W / 2;

    this.styleTierText = scene.add.text(cx - 120, hudY + 10, 'F', {
      fontSize: '26px', fontFamily: '"Arial Black"', color: '#888888',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(25).setScrollFactor(0);

    this.styleBarBg = scene.add.rectangle(cx, hudY + 10, 160, 12, 0x222244, 0.8)
      .setDepth(25).setScrollFactor(0).setOrigin(0.5, 0.5) as Phaser.GameObjects.Rectangle;

    this.styleBarFill = scene.add.rectangle(cx - 80, hudY + 10, 0, 12, 0x555555, 0.95)
      .setDepth(26).setScrollFactor(0).setOrigin(0, 0.5) as Phaser.GameObjects.Rectangle;

    this.styleBenefitsText = scene.add.text(cx, hudY + 24, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#aaccff',
    }).setOrigin(0.5, 0).setDepth(25).setScrollFactor(0);

    this.styleFeatText = scene.add.text(cx, hudY + 36, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffdd66',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(25).setScrollFactor(0).setAlpha(0);

    this.styleFreshChip = scene.add.text(cx + 90, hudY + 10, '', {
      fontSize: '11px', fontFamily: '"Arial Black"', color: '#66ff66',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(25).setScrollFactor(0);
  }

  private _teardownStyleHud(): void {
    this.styleFeatTween?.stop();
    this.styleFeatTween = null;
    if (this.styleTierText?.active) this.styleTierText.destroy();
    this.styleTierText = null;
    if (this.styleBarBg?.active) this.styleBarBg.destroy();
    this.styleBarBg = null;
    if (this.styleBarFill?.active) this.styleBarFill.destroy();
    this.styleBarFill = null;
    if (this.styleBenefitsText?.active) this.styleBenefitsText.destroy();
    this.styleBenefitsText = null;
    if (this.styleFeatText?.active) this.styleFeatText.destroy();
    this.styleFeatText = null;
    if (this.styleFreshChip?.active) this.styleFreshChip.destroy();
    this.styleFreshChip = null;
  }

  private _renderStyleHud(time: number): void {
    if (!this.styleTierText?.active) return;
    const tier = STYLE_TIERS[this.styleTier];

    this.styleTierText.setText(tier.letter).setColor(tier.color);

    const fillW = (this.stylePoints / 10) * 160;
    (this.styleBarFill as Phaser.GameObjects.Rectangle).setSize(fillW, 12).setFillStyle(tier.fillColor, 0.95);

    const speedPct = Math.round(tier.speedBonus * 100);
    const cdPct = Math.round(tier.cdReduction * 100);
    const bullets = tier.waveBullets;
    const benefitsStr = speedPct > 0
      ? `Speed +${speedPct}% • CD -${cdPct}% • Wave ×${(bullets / 20).toFixed(1)}`
      : 'Earn style to gain benefits';
    (this.styleBenefitsText as Phaser.GameObjects.Text).setText(benefitsStr);

    const isFresh = time - this.playerFormSwitchAt < 3000;
    (this.styleFreshChip as Phaser.GameObjects.Text)
      .setText(isFresh ? 'Fresh!' : 'Stale')
      .setColor(isFresh ? '#66ff66' : '#888888');
  }

  // ── Public speed/cd accessors for ArenaScene ─────────────────────────────

  getStyleCdMult(): number {
    if (!this.api.hasUpgrade('f')) return 1;
    return 1 - STYLE_TIERS[this.styleTier].cdReduction;
  }

  // ── Player ability dispatchers ────────────────────────────────────────────

  doPlayerQuantumWave(tx: number, ty: number, zone: 'red' | 'yellow' | 'green' | 'gold' = 'red', time?: number): void {
    if (this.api.elementId !== 'quantum') return;

    const t = time ?? this.api.scene.time.now;
    const { player, scene } = this.api;

    let freq: number, amplitude: number, perBulletDamage: number;
    if (zone === 'gold') { freq = 6; amplitude = 28; perBulletDamage = 2; }
    else if (zone === 'green') { freq = 6; amplitude = 28; perBulletDamage = 1; }
    else if (zone === 'yellow') { freq = 4; amplitude = 20; perBulletDamage = 1; }
    else { freq = 2; amplitude = 12; perBulletDamage = 1; }

    const angle = Math.atan2(ty - player.y, tx - player.x);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const bulletDuration = 1500;
    const interval = 70;
    const bulletCount = this.api.hasUpgrade('f') ? STYLE_TIERS[this.styleTier].waveBullets : 20;
    const waveSetId = t;

    for (const ev of this.playerWaveTimers) ev.remove(false);
    this.playerWaveTimers = [];

    for (let i = 0; i < bulletCount; i++) {
      const ev = scene.time.delayedCall(i * interval, () => {
        if (!player.active) return;
        const sprite = scene.add.circle(player.x, player.y, 4, 0xaa44ff).setDepth(10) as Phaser.GameObjects.Arc;
        this.playerBullets.push({
          sprite, baseX: player.x, baseY: player.y,
          dirX, dirY, perpX: -dirY, perpY: dirX,
          elapsed: 0, freq, amplitude,
          endsAt: scene.time.now + bulletDuration,
          owner: 'player',
          damage: perBulletDamage,
          zone,
          waveSetId,
        });
      });
      this.playerWaveTimers.push(ev);
    }
    this.playerWaveSetEndsAt = t + (bulletCount - 1) * interval + bulletDuration;
  }

  private doSonicBoomWhip(tx: number, ty: number, zone: 'red' | 'yellow' | 'green' | 'gold', time: number): void {
    const player = this.api.player;
    const angle = Math.atan2(ty - player.y, tx - player.x);

    const stats: Record<string, { maxRange: number; damage: number }> = {
      red:    { maxRange: 200, damage: 6  },
      yellow: { maxRange: 350, damage: 10 },
      green:  { maxRange: 500, damage: 16 },
      gold:   { maxRange: 500, damage: 16 },
    };

    this.sonicBoomWhipActive = true;
    this.sonicBoomWhipStartTime = time;
    this.sonicBoomWhipAngle = angle;
    this.sonicBoomWhipMaxRange = stats[zone].maxRange;
    this.sonicBoomWhipDamage = stats[zone].damage;
    this.sonicBoomWhipZone = zone;
    this.sonicBoomWhipHit = false;
    this.sonicBoomWhipGoldBonus = zone === 'gold';

    if (this.sonicBoomWhipGfx) { this.sonicBoomWhipGfx.destroy(); }
    this.sonicBoomWhipGfx = this.api.scene.add.graphics().setDepth(11);

    const colors: Record<string, number> = {
      red: 0xff4444, yellow: 0xffcc00, green: 0x44ff88, gold: 0xffdd00,
    };
    (this.sonicBoomWhipGfx as any)._whipColor = colors[zone];
  }

  private _tickSonicBoomWhip(time: number): void {
    if (!this.sonicBoomWhipActive) return;

    const WHIP_DURATION_MS = 300;
    const elapsed = time - this.sonicBoomWhipStartTime;
    const t = Math.min(elapsed / WHIP_DURATION_MS, 1);

    const player = this.api.player;
    const gfx = this.sonicBoomWhipGfx;

    if (gfx && gfx.active) {
      gfx.clear();
      const color: number = (gfx as any)._whipColor ?? 0xffffff;
      gfx.lineStyle(4, color, 1);
      gfx.beginPath();

      const SEGMENTS = 10;
      const angle = this.sonicBoomWhipAngle;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const px = -Math.sin(angle); // perpendicular
      const py = Math.cos(angle);

      for (let i = 0; i <= SEGMENTS; i++) {
        const frac = (i / SEGMENTS) * t;
        const dist = frac * this.sonicBoomWhipMaxRange;
        const perpOffset = Math.sin(frac * Math.PI) * 20;
        const wx = player.x + dx * dist + px * perpOffset;
        const wy = player.y + dy * dist + py * perpOffset;
        if (i === 0) gfx.moveTo(wx, wy);
        else gfx.lineTo(wx, wy);
      }
      gfx.strokePath();

      // Hit detection
      if (!this.sonicBoomWhipHit) {
        const npc = this.api.npc;
        if (npc.active) {
          for (let i = 1; i <= SEGMENTS; i++) {
            const frac = (i / SEGMENTS) * t;
            const dist = frac * this.sonicBoomWhipMaxRange;
            const perpOffset = Math.sin(frac * Math.PI) * 20;
            const wx = player.x + dx * dist + px * perpOffset;
            const wy = player.y + dy * dist + py * perpOffset;

            const distToEnemy = Phaser.Math.Distance.Between(wx, wy, npc.x, npc.y);
            if (distToEnemy < 16) {
              this.sonicBoomWhipHit = true;
              const isMaxRange = frac >= 0.85;
              const dmg = isMaxRange ? this.sonicBoomWhipDamage * 2 : this.sonicBoomWhipDamage;
              npc.takeDamage(dmg);
              this.api.spawnHitFlash(npc.x, npc.y, color);
              this.api.spawnDamageNumber(npc.x, npc.y, dmg);
              if (isMaxRange) {
                this.api.stunNpc(500);
                this.api.showFloatingText(npc.x, npc.y - 36, 'MAX RANGE!', '#44ffcc');
              }
              break;
            }
          }
        }
      }

      // Gold zone bonus: AoE flash at tip when fully extended
      if (t >= 1 && this.sonicBoomWhipGoldBonus) {
        this.sonicBoomWhipGoldBonus = false;
        const tipX = player.x + dx * this.sonicBoomWhipMaxRange;
        const tipY = player.y + dy * this.sonicBoomWhipMaxRange;
        const flash = this.api.scene.add.circle(tipX, tipY, 40, 0xffdd00, 0.6).setDepth(10);
        this.api.scene.tweens.add({
          targets: flash, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 300,
          onComplete: () => { if (flash?.active) flash.destroy(); },
        });
        const npc = this.api.npc;
        if (npc.active && Phaser.Math.Distance.Between(tipX, tipY, npc.x, npc.y) < 40) {
          npc.takeDamage(8);
          this.api.spawnHitFlash(npc.x, npc.y, 0xffdd00);
          this.api.spawnDamageNumber(npc.x, npc.y, 8);
        }
      }
    }

    if (t >= 1) {
      this.sonicBoomWhipGfx?.destroy();
      this.sonicBoomWhipGfx = null;
      this.sonicBoomWhipActive = false;
    }
  }

  doNpcQuantumWave(tx: number, ty: number): void {
    const t = this.api.scene.time.now;
    if (t < this.npcWaveSetEndsAt) return;
    const { npc, scene } = this.api;
    const angle = Math.atan2(ty - npc.y, tx - npc.x);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const bulletDuration = 1500;
    const interval = 70;

    for (const ev of this.npcWaveTimers) ev.remove(false);
    this.npcWaveTimers = [];

    for (let i = 0; i < 20; i++) {
      const ev = scene.time.delayedCall(i * interval, () => {
        if (!npc.active) return;
        const sprite = scene.add.circle(npc.x, npc.y, 4, 0xaa44ff).setDepth(10) as Phaser.GameObjects.Arc;
        this.npcBullets.push({
          sprite, baseX: npc.x, baseY: npc.y,
          dirX, dirY, perpX: -dirY, perpY: dirX,
          elapsed: 0, freq: 2, amplitude: 12,
          endsAt: scene.time.now + bulletDuration,
          owner: 'npc',
          damage: 1,
          zone: 'red',
          waveSetId: t,
        });
      });
      this.npcWaveTimers.push(ev);
    }
    this.npcWaveSetEndsAt = t + 19 * interval + bulletDuration;
  }

  doPlayerChaosControl(tx: number, ty: number, time?: number): void {
    if (this.api.elementId !== 'quantum') return;
    const t = time ?? this.api.scene.time.now;
    const isInMechanic = t < this.playerMechanicEnd;

    if (isInMechanic) {
      this._chaosCast('player', tx, ty, 'red', t);
      this._chaosCast('player', tx, ty, 'blue', t);
    } else if (this.playerForm === 'red') {
      this._chaosCast('player', tx, ty, 'red', t);
    } else {
      this._chaosCast('player', tx, ty, 'blue', t);
    }
  }

  doNpcChaosControl(tx: number, ty: number): void {
    this._chaosCast('npc', tx, ty, 'red', this.api.scene.time.now);
  }

  private _chaosCast(owner: 'player' | 'npc', tx: number, ty: number, form: 'red' | 'blue', time: number): void {
    const { scene } = this.api;
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const cx = caster.x;
    const cy = caster.y;

    const gfx = scene.add.graphics().setDepth(9);

    if (form === 'red') {
      const dx = tx - cx;
      const dy = ty - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const dirX = dx / dist;
      const dirY = dy / dist;
      const ex = cx + dirX * 90;
      const ey = cy + dirY * 90;
      gfx.fillStyle(0x882222, 0.35);
      gfx.lineStyle(2, 0xff4488, 0.8);
      gfx.fillCircle(ex, ey, 80);
      gfx.strokeCircle(ex, ey, 80);

      this.chaosTelegraphs.push({
        owner, form: 'red',
        cx, cy, tx, ty, dirX, dirY,
        gfx,
        endsAt: time + 2000,
        resolved: false,
      });
    } else {
      const dx = tx - cx;
      const dy = ty - cy;
      const dist = Math.hypot(dx, dy) || 1;
      this._drawCone(gfx, cx, cy, tx, ty);
      this.chaosTelegraphs.push({
        owner, form: 'blue',
        cx, cy, tx, ty, dirX: dx / dist, dirY: dy / dist,
        gfx,
        endsAt: time + 2000,
        resolved: false,
      });
    }
  }

  doPlayerAtomVibration(tx: number, ty: number, time?: number): void {
    if (this.api.elementId !== 'quantum') return;
    const t = time ?? this.api.scene.time.now;
    const { player } = this.api;

    if (this.playerVibrationActive) {
      this._detonateVibration(t);
      return;
    }
    if (this.playerVibrationDashEnd > 0) return;

    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.playerVibrationCastAngle = Math.atan2(dy, dx);

    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / dist) * 1600, (dy / dist) * 1600);
    this.playerVibrationDashEnd = t + 400;
  }

  private _detonateVibration(time: number): void {
    const { npc } = this.api;
    const isLastSecond = this.api.hasUpgrade('r') && (this.playerVibrationTargetUntil - time) <= 1000;
    const dmg = isLastSecond ? 30 : 20;
    const stunMs = isLastSecond ? 2000 : 1000;

    this._applyDamage('player', npc.x, npc.y, dmg, 1, time);
    npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, time + stunMs);
    this.api.showFloatingText(npc.x, npc.y - 30, isLastSecond ? 'Last Second!' : 'Detonate!', '#66ccff');

    // Style feats (mutually exclusive)
    if (this.api.hasUpgrade('f')) {
      if (isLastSecond) this.addStyle('vibrationLastSecond', 3);
      else this.addStyle('vibrationActivate', 1);
    }

    this.playerVibrationActive = false;
    this.playerVibrationTargetUntil = 0;
    if (this.playerVibrationAura?.active) this.playerVibrationAura.destroy();
    this.playerVibrationAura = null;
    if (this.playerVibrationCountdownText?.active) this.playerVibrationCountdownText.destroy();
    this.playerVibrationCountdownText = null;
    this.api.startCooldown('player', 'atom-vibration');
  }

  doNpcAtomVibration(tx: number, ty: number): void {
    const { npc } = this.api;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const dist = Math.hypot(dx, dy) || 1;
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / dist) * 600, (dy / dist) * 600);
    const t = this.api.scene.time.now;
    this.api.scene.time.delayedCall(300, () => {
      if (body?.enable) body.setVelocity(0, 0);
      this._applyDamage('npc', tx, ty, 35, 70, this.api.scene.time.now);
      this.api.player.earthStunnedUntil = Math.max(this.api.player.earthStunnedUntil, this.api.scene.time.now + 1000);
      this.api.showFloatingText(tx, ty - 25, 'Slam!', '#cc88ff');
    });
    void t;
  }

  doPlayerMechanic(tx: number, ty: number, time?: number): void {
    if (this.api.elementId !== 'quantum') return;
    const t = time ?? this.api.scene.time.now;
    const { player } = this.api;

    this.playerMechanicPrevForm = this.playerForm;
    this.playerMechanicEnd = t + 8000;
    this.playerMechanicDamageDealt = 0;
    this.playerFormLockoutUntil = 0;

    if (!this.playerRedAura) this._spawnRedAura();
    if (!this.playerBlueAura) this._spawnBlueAura();

    this.playerStiffStrikeReady = true;
    this.playerAutoDodgeReady = true;

    this.api.showFloatingText(player.x, player.y - 35, 'Quantum Mechanic!', '#dd88ff');
    void tx; void ty;
  }

  doNpcMechanic(tx: number, ty: number): void {
    const t = this.api.scene.time.now;
    this.npcMechanicEnd = t + 8000;
    this._chaosCast('npc', tx, ty, 'red', t);
  }

  doPlayerAtomNhilego(_tx: number, _ty: number, time?: number): void {
    if (this.api.elementId !== 'quantum') return;
    if (this.playerNhilegoActive) return;
    const t = time ?? this.api.scene.time.now;
    this.playerNhilegoActive = true;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    this.ionizationStandAccumMs = 0;
    this.api.startCooldown('player', 'atom-nhilego');
    this._spawnNhilegoShadow('player', t);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 35, 'Atom-Nhilego!', '#8844cc');
  }

  doNpcAtomNhilego(_tx: number, _ty: number): void {
    if (this.npcNhilegoActive) return;
    const t = this.api.scene.time.now;
    this.npcNhilegoActive = true;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    this._spawnNhilegoShadow('npc', t);
  }
}
