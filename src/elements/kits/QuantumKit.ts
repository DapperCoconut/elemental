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
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  get npcElementId(): string;
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

// Keep old export name so ArenaScene import still compiles during migration
export type QuantumArenaApi = EchoArenaApi;

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
    void time;
    const player = this.arena.player;
    const enemy = this.arena.npc;
    // Block input during bat attach
    if (this.playerBatAttach) return;
    // Block non-shot input during bat form
    const batBlocked = this.playerBatFormActive;

    // Click — Echolocation
    if (Phaser.Input.Keyboard.JustDown(this.arena.scene.input.keyboard!.addKey('SPACE') as Phaser.Input.Keyboard.Key)) {
      // space is dodge, skip
    }
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
      if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
        if (player.getCooldownRatio('echo-guess') >= 1) {
          let etx = mx, ety = my;
          if (this.playerEyePowerUpArmed) { etx = enemy.x; ety = enemy.y; this.playerEyePowerUpArmed = false; }
          this.doGuess(etx, ety, 'player');
          player.startCooldown('echo-guess');
        }
      }

      // R — Lantern (Beacon perk: battery-gated)
      if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
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
      if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
        if (player.getCooldownRatio('echo-eclipse') >= 1) {
          let qtx = mx, qty = my;
          if (this.playerEyePowerUpArmed) { qtx = enemy.x; qty = enemy.y; this.playerEyePowerUpArmed = false; }
          this.doEclipse(qtx, qty, 'player');
          player.startCooldown('echo-eclipse');
        }
      }
    }

    // F — Bat Form (F+ allows recast to cancel; otherwise only usable outside bat form)
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
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

      // Player reveal
      if (this.arena.hasPerk('player', 'beacon')) {
        const ptr = this.arena.pointer;
        const aimAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        const range = this.playerBatFormActive ? 60 : this.playerBeaconConeBoostUntil > time ? 156 : 130;
        const halfAngle = Phaser.Math.DegToRad(35);
        this.fogEraser.beginPath();
        this.fogEraser.moveTo(player.x, player.y);
        this.fogEraser.arc(player.x, player.y, range, aimAngle - halfAngle, aimAngle + halfAngle, false);
        this.fogEraser.closePath();
        this.fogEraser.fillPath();
      } else {
        const playerRadius = this.playerBatFormActive ? 45 : this.playerLanternActive ? 128 : 90;
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

  doGuess(tx: number, ty: number, owner: 'player' | 'npc'): void {
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
      // E+ spawn psychic eye
      if (owner === 'player' && this.arena.hasUpgrade('e')) {
        this.spawnPsychicEye();
      }
    } else {
      // AoE check
      const aoeDist = Phaser.Math.Distance.Between(tx, ty, enemy.x, enemy.y);
      if (aoeDist <= 72 && enemy.hp > 0) {
        enemy.takeDamage(15);
        this.arena.spawnHitFlash(enemy.x, enemy.y, 0xaaaaff);
        this.guessReveals.push({ x: enemy.x, y: enemy.y, expiresAt: time + 500 });
      } else {
        // Miss — slow caster
        if (owner === 'player') {
          this.playerGuessSlowUntil = time + 3000;
          this.arena.showFloatingText(caster.x, caster.y - 36, 'Disoriented!', '#ff8888');
        } else {
          this.npcGuessSlowUntil = time + 3000;
        }
      }
    }
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
      // Q+ grant 3 psychic eyes
      if (owner === 'player' && this.arena.hasUpgrade('q')) {
        for (let i = 0; i < 3; i++) this.spawnPsychicEye();
        this.arena.showFloatingText(caster.x, caster.y - 54, '👁 ×3', '#aaddff');
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

  // ── NPC dispatchers ───────────────────────────────────────────────────────

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

// Keep old export name for ArenaScene
export class QuantumKit extends EchoKit {}
