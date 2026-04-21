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
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamage(owner: 'player' | 'npc', cx: number, cy: number, radius: number, damage: number): void;
  startCooldown(owner: 'player' | 'npc', abilityId: string): void;
  setSpeedMult(owner: 'player' | 'npc', mult: number): void;
  lockPlayer(durationMs: number): void;
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
}

interface QuantumRock {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  endsAt: number;
  firstHitAfter: number;
  owner: 'player' | 'npc';
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
const GREEN_H = 80;
const YELLOW_H = 160;
const RED_H = 160;
const BAR_H = GREEN_H + YELLOW_H + RED_H;
const INDICATOR_H = 8;
const BOUNCE_PERIOD_MS = 1500;

// ── Kit ──────────────────────────────────────────────────────────────────────

export class QuantumElementKit {
  private api: QuantumElementArenaApi;

  // ── Form state ──────────────────────────────────────────────────────────
  private playerForm: 'red' | 'blue' = 'red';
  private playerFormLockoutUntil = 0;
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

  // ── Rocks ────────────────────────────────────────────────────────────────
  private rocks: QuantumRock[] = [];

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

  // ── Atom-Nhilego (Q) ─────────────────────────────────────────────────────
  private playerNhilegoActive = false;
  private playerNhilegoRadius = 70;
  private playerNhilegoSuccessCount = 0;
  private playerNhilegoShadow: NhilegoShadow | null = null;

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

  // ── Reset ────────────────────────────────────────────────────────────────

  reset(): void {
    this.api.player.quantumIncomingMult = 1;

    this.playerForm = 'red';
    this.playerFormLockoutUntil = 0;
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

    for (const r of this.rocks) { if (r.sprite?.active) r.sprite.destroy(); }
    this.rocks = [];

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

    this.playerNhilegoActive = false;
    this.playerNhilegoRadius = 70;
    this.playerNhilegoSuccessCount = 0;
    if (this.playerNhilegoShadow?.circle?.active) this.playerNhilegoShadow.circle.destroy();
    this.playerNhilegoShadow = null;

    this.npcMechanicEnd = 0;
    this.npcNhilegoActive = false;
    this.npcNhilegoRadius = 70;
    this.npcNhilegoSuccessCount = 0;
    if (this.npcNhilegoShadow?.circle?.active) this.npcNhilegoShadow.circle.destroy();
    this.npcNhilegoShadow = null;
  }

  // ── Input (player only) ──────────────────────────────────────────────────

  handleInput(time: number, _delta: number, pointer: Phaser.Input.Pointer): void {
    const { api } = this;
    if (api.elementId !== 'quantum') return;
    if (api.nukeChanneling) return;

    const { player } = api;
    const isInMechanic = time < this.playerMechanicEnd;

    // ── Space: form-swap dash ────────────────────────────────────────────
    if (!isInMechanic && Phaser.Input.Keyboard.JustDown(api.spaceKey)) {
      const dx = pointer.worldX - player.x;
      const dy = pointer.worldY - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      const body = player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity((dx / dist) * 1000, (dy / dist) * 1000);
      api.scene.time.delayedCall(220, () => { if (body?.enable) body.setVelocity(0, 0); });

      this.playerForm = this.playerForm === 'red' ? 'blue' : 'red';
      this.playerFormLockoutUntil = time + 5000;
      this._destroyRedAura();
      this._destroyBlueAura();
      player.quantumIncomingMult = 1;
      this.playerStiffStrikeReady = false;
      this.playerStiffStrikeReadyAt = 0;
      this.playerAutoDodgeReady = false;
      this.playerAutoDodgeReadyAt = 0;

      api.showFloatingText(player.x, player.y - 35,
        this.playerForm === 'red' ? 'Entropy' : 'Order',
        this.playerForm === 'red' ? '#ff6644' : '#66aaff');
    }

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
    const isDown = pointer.isDown;
    if (isDown && !this.pointerWasDown) {
      this.chargeHoldStart = time;
      this.chargeBarGfx = api.scene.add.graphics().setDepth(100).setScrollFactor(0);
      const g = this.chargeBarGfx;
      g.fillStyle(0x44cc44, 0.7); g.fillRect(BAR_X, BAR_Y, BAR_W, GREEN_H);
      g.fillStyle(0xcccc44, 0.7); g.fillRect(BAR_X, BAR_Y + GREEN_H, BAR_W, YELLOW_H);
      g.fillStyle(0xcc4444, 0.7); g.fillRect(BAR_X, BAR_Y + GREEN_H + YELLOW_H, BAR_W, RED_H);
      g.lineStyle(2, 0xffffff, 0.8); g.strokeRect(BAR_X, BAR_Y, BAR_W, BAR_H);
      this.chargeBarIndicatorGfx = api.scene.add.graphics().setDepth(101).setScrollFactor(0);
    } else if (isDown && this.chargeBarIndicatorGfx) {
      // elapsed offset by BOUNCE_PERIOD_MS so frac=1 at start → indicator begins at bottom (red)
      const elapsed = (time - this.chargeHoldStart + BOUNCE_PERIOD_MS) % (BOUNCE_PERIOD_MS * 2);
      const t = elapsed / (BOUNCE_PERIOD_MS * 2);
      const frac = t < 0.5 ? t * 2 : (1 - t) * 2;
      const y = BAR_Y + frac * (BAR_H - INDICATOR_H);
      this.chargeBarIndicatorGfx.clear();
      this.chargeBarIndicatorGfx.fillStyle(0xff2222, 1);
      this.chargeBarIndicatorGfx.fillRect(BAR_X - 4, y, BAR_W + 8, INDICATOR_H);
    } else if (!isDown && this.pointerWasDown) {
      const holdMs = time - this.chargeHoldStart;
      let zone: 'red' | 'yellow' | 'green';
      if (holdMs < 120) {
        zone = 'red';
      } else {
        const elapsed = (holdMs + BOUNCE_PERIOD_MS) % (BOUNCE_PERIOD_MS * 2);
        const t = elapsed / (BOUNCE_PERIOD_MS * 2);
        const frac = t < 0.5 ? t * 2 : (1 - t) * 2;
        const indicatorY = BAR_Y + frac * (BAR_H - INDICATOR_H);
        if (indicatorY < BAR_Y + GREEN_H) zone = 'green';
        else if (indicatorY < BAR_Y + GREEN_H + YELLOW_H) zone = 'yellow';
        else zone = 'red';
      }
      this.chargeBarGfx?.destroy();
      this.chargeBarGfx = null;
      this.chargeBarIndicatorGfx?.destroy();
      this.chargeBarIndicatorGfx = null;
      this.chargeHoldStart = 0;
      if (time >= this.playerWaveSetEndsAt) {
        this.doPlayerQuantumWave(pointer.worldX, pointer.worldY, zone, time);
      }
    }
    this.pointerWasDown = isDown;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { api } = this;
    const dt = delta / 1000;

    if (api.elementId === 'quantum') {
      this._tickPlayerPassives(time);
      this._tickAutoDodge(time);
    }

    this._updateBullets(this.playerBullets, time, dt, 'player');
    this._updateBullets(this.npcBullets, time, dt, 'npc');
    this._updateRocks(time, dt);
    this._updateChaos(time);

    if (api.elementId === 'quantum') {
      this._tickVibration(time);
    }

    if (this.playerNhilegoActive) this._tickNhilego(time, 'player');
    if (this.npcNhilegoActive) this._tickNhilego(time, 'npc');

    this._tickMechanic(time);
  }

  // ── Player passive tick ──────────────────────────────────────────────────

  private _tickPlayerPassives(time: number): void {
    const { api } = this;
    const { player } = api;
    const isInMechanic = time < this.playerMechanicEnd;
    const isLocked = !isInMechanic && time < this.playerFormLockoutUntil;

    if (!isLocked && (this.playerForm === 'blue' || isInMechanic)) {
      player.quantumIncomingMult = 0.85;
    } else {
      player.quantumIncomingMult = 1;
    }

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
      // Rapidly flicker both colors during Quantum Mechanic
      const flip = Math.floor(time / 120) % 2 === 0;
      const col = flip ? 0xff4422 : 0x44aaff;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.012);
      this.playerFormRing.lineStyle(4, col, pulse);
      this.playerFormRing.strokeCircle(player.x, player.y, 22);
      this.playerFormRing.lineStyle(2, flip ? 0x44aaff : 0xff4422, pulse * 0.5);
      this.playerFormRing.strokeCircle(player.x, player.y, 28);
    } else if (this.playerForm === 'red') {
      // Entropy — spiky double ring, warm red-orange
      const pulse = 0.55 + 0.35 * Math.sin(time * 0.005);
      this.playerFormRing.lineStyle(3, 0xff4422, pulse);
      this.playerFormRing.strokeCircle(player.x, player.y, 22);
      this.playerFormRing.lineStyle(1, 0xff8833, pulse * 0.6);
      this.playerFormRing.strokeCircle(player.x, player.y, 27);
    } else {
      // Order — clean double ring, cool blue
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
      return;
    }
  }

  // ── Mechanic expiry ──────────────────────────────────────────────────────

  private _tickMechanic(time: number): void {
    if (this.playerMechanicEnd > 0 && time >= this.playerMechanicEnd) {
      this.playerMechanicEnd = 0;
      const { player } = this.api;
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
        target.takeDamage(1);
        this.api.spawnHitFlash(target.x, target.y, 0xaa44ff);
        b.sprite.destroy();
        bullets.splice(i, 1);
      }
    }
  }

  // ── Rock update ──────────────────────────────────────────────────────────

  private _updateRocks(time: number, dt: number): void {
    const W = this.api.sceneWidth;
    const H = this.api.sceneHeight;
    for (const r of this.rocks) {
      if (!r.sprite?.active) continue;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.sprite.setPosition(r.x, r.y);

      if (time >= r.endsAt || r.x < 0 || r.x > W || r.y < 0 || r.y > H) {
        r.sprite.destroy();
        continue;
      }

      const target = r.owner === 'player' ? this.api.npc : this.api.player;
      if (time >= r.firstHitAfter && Math.hypot(target.x - r.x, target.y - r.y) < 30) {
        this._applyDamage(r.owner, target.x, target.y, 40, 1, time);
        target.earthStunnedUntil = Math.max(target.earthStunnedUntil, time + 3000);
        r.sprite.destroy();
      }
    }
    this.rocks = this.rocks.filter(r => r.sprite?.active);
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

      // Direction: player follows mouse, NPC follows its target
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
    if (t.form === 'red') {
      const ex = t.cx + t.dirX * 90;
      const ey = t.cy + t.dirY * 90;
      this._applyDamage(t.owner, ex, ey, 30, 80, time);
      this._spawnRock(ex, ey, 0, t.owner, time);
      this._spawnRock(ex, ey, Math.PI * 2 / 3, t.owner, time);
      this._spawnRock(ex, ey, Math.PI * 4 / 3, t.owner, time);
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
      }
    }
  }

  // ── Vibration tick ───────────────────────────────────────────────────────

  private _tickVibration(time: number): void {
    const { player, npc } = this.api;

    // ── Spin phase: orbit NPC around player at mouse angle ────────────────
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
        // Launch in the current facing direction
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
      }
      return;
    }

    // ── Dash phase: check for grab ────────────────────────────────────────
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

    if (this.playerVibrationActive && time >= this.playerVibrationTargetUntil) {
      this.playerVibrationActive = false;
      this.playerVibrationTargetUntil = 0;
      if (this.playerVibrationAura?.active) this.playerVibrationAura.destroy();
      this.playerVibrationAura = null;
      this.api.startCooldown('player', 'atom-vibration');
      this.api.showFloatingText(npc.x, npc.y - 25, 'Vibration End', '#66ccff');
    }
  }

  private _grabAndVibrate(time: number): void {
    const { player, npc } = this.api;

    // Stop player dash
    const pb = player.body as Phaser.Physics.Arcade.Body;
    if (pb?.enable) pb.setVelocity(0, 0);

    // Stop NPC so it starts orbiting from where it is
    const nb = npc.body as Phaser.Physics.Arcade.Body;
    if (nb?.enable) nb.setVelocity(0, 0);

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
      this._spawnRock(x, y, 0, owner, time);
      this._spawnRock(x, y, Math.PI * 2 / 3, owner, time);
      this._spawnRock(x, y, Math.PI * 4 / 3, owner, time);
      api.showFloatingText(x, y - 30, `Hit! (${successCount})`, '#cc88ff');
      shadow.circle.destroy();
      this._spawnNhilegoShadow(owner, time);
    } else {
      shadow.circle.destroy();
      if (owner === 'player') this.playerNhilegoShadow = null;
      else this.npcNhilegoShadow = null;

      const successCount = owner === 'player' ? this.playerNhilegoSuccessCount : this.npcNhilegoSuccessCount;
      if (owner === 'player') this.playerNhilegoActive = false;
      else this.npcNhilegoActive = false;

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
    // Stiff Strike: bright red fill, fast erratic pulse
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
    // Auto-Dodge: cool cyan ring, slow steady breath
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

  private _spawnRock(x: number, y: number, angle: number, owner: 'player' | 'npc', time: number): void {
    const sprite = this.api.scene.add
      .circle(x, y, 8, 0x887755)
      .setDepth(8) as Phaser.GameObjects.Arc;
    sprite.setStrokeStyle(1, 0xccaa66);
    this.rocks.push({
      sprite, x, y,
      vx: Math.cos(angle) * 500,
      vy: Math.sin(angle) * 500,
      endsAt: time + 1500,
      firstHitAfter: time + 200,
      owner,
    });
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
      this.api.showFloatingText(cx, cy - 50, 'Stiff Strike!', '#ff8844');
      return;
    }

    this.api.dealAoeDamage(owner, cx, cy, radius, damage * mult);
  }

  // ── Player ability dispatchers ────────────────────────────────────────────

  doPlayerQuantumWave(tx: number, ty: number, zone: 'red' | 'yellow' | 'green' = 'red', time?: number): void {
    if (this.api.elementId !== 'quantum') return;

    const t = time ?? this.api.scene.time.now;
    const { player, scene } = this.api;

    let freq: number, amplitude: number;
    if (zone === 'green') { freq = 6; amplitude = 28; }
    else if (zone === 'yellow') { freq = 4; amplitude = 20; }
    else { freq = 2; amplitude = 12; }

    const angle = Math.atan2(ty - player.y, tx - player.x);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const bulletDuration = 1500;
    const interval = 70;

    for (const ev of this.playerWaveTimers) ev.remove(false);
    this.playerWaveTimers = [];

    for (let i = 0; i < 20; i++) {
      const ev = scene.time.delayedCall(i * interval, () => {
        if (!player.active) return;
        const sprite = scene.add.circle(player.x, player.y, 4, 0xaa44ff).setDepth(10) as Phaser.GameObjects.Arc;
        this.playerBullets.push({
          sprite, baseX: player.x, baseY: player.y,
          dirX, dirY, perpX: -dirY, perpY: dirX,
          elapsed: 0, freq, amplitude,
          endsAt: scene.time.now + bulletDuration,
          owner: 'player',
        });
      });
      this.playerWaveTimers.push(ev);
    }
    this.playerWaveSetEndsAt = t + 19 * interval + bulletDuration;
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
    this._applyDamage('player', npc.x, npc.y, 20, 1, time);
    npc.earthStunnedUntil = Math.max(npc.earthStunnedUntil, time + 1000);
    this.api.showFloatingText(npc.x, npc.y - 30, 'Detonate!', '#66ccff');

    this.playerVibrationActive = false;
    this.playerVibrationTargetUntil = 0;
    if (this.playerVibrationAura?.active) this.playerVibrationAura.destroy();
    this.playerVibrationAura = null;
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
    this.playerFormLockoutUntil = 0;

    if (!this.playerRedAura) this._spawnRedAura();
    if (!this.playerBlueAura) this._spawnBlueAura();

    this.playerStiffStrikeReady = true;
    this.playerAutoDodgeReady = true;

    this.api.showFloatingText(player.x, player.y - 35, 'Quantum Mechanic!', '#dd88ff');
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
