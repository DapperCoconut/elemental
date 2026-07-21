import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── Arena API interface ────────────────────────────────────────────────────

export interface VoidArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly pointerWasDown: boolean;

  // Cross-cutting state — doVoidReturnStripBuffs
  getNpcHuntBloodMoonActive(): boolean;
  setNpcHuntBloodMoonActive(v: boolean): void;
  getNpcPlasmaIncarnateActive(): boolean;
  setNpcPlasmaIncarnateActive(v: boolean): void;
  getNpcDeathSoulSplitUntil(): number;
  setNpcDeathSoulSplitUntil(v: number): void;
  getHuntBloodMoonActive(): boolean;
  setHuntBloodMoonActive(v: boolean): void;
  getPlasmaIncarnateActive(): boolean;
  setPlasmaIncarnateActive(v: boolean): void;
  getDeathSoulSplitUntil(): number;
  setDeathSoulSplitUntil(v: number): void;
  getMagnetNpcSpeedBuffUntil(): number;
  setMagnetNpcSpeedBuffUntil(v: number): void;
  getMagnetPlayerSpeedBuffUntil(): number;
  setMagnetPlayerSpeedBuffUntil(v: number): void;
  getLightNpcPhotonSpeedBoostUntil(): number;
  setLightNpcPhotonSpeedBoostUntil(v: number): void;
  getLightNpcPhotoAccelUntil(): number;
  setLightNpcPhotoAccelUntil(v: number): void;
  getLightNpcPhotoSlowUntil(): number;
  setLightNpcPhotoSlowUntil(v: number): void;
  getLightPhotonSpeedBoostUntil(): number;
  setLightPhotonSpeedBoostUntil(v: number): void;
  getLightPhotoAccelUntil(): number;
  setLightPhotoAccelUntil(v: number): void;

  // Cross-cutting state — doVoidReLapseEffect + flame-freeze
  getNpcMetalChainTetherEnd(): number;
  setNpcMetalChainTetherEnd(v: number): void;
  getNpcMetalArmorEnd(): number;
  setNpcMetalArmorEnd(v: number): void;
  getNpcHuntSlowUntil(): number;
  setNpcHuntSlowUntil(v: number): void;
  getNpcHuntConfusedUntil(): number;
  setNpcHuntConfusedUntil(v: number): void;
  getNpcAggressiveBleedUntil(): number;
  setNpcAggressiveBleedUntil(v: number): void;
  getPlayerBleedingUntil(): number;
  setPlayerBleedingUntil(v: number): void;
  getPlayerFrozenUntil(): number;
  setPlayerFrozenUntil(v: number): void;
  getPlayerBurningUntil(): number;
  setPlayerBurningUntil(v: number): void;
  getPlayerToxicUntil(): number;
  setPlayerToxicUntil(v: number): void;
  getPlayerHuntSlowUntil(): number;
  setPlayerHuntSlowUntil(v: number): void;

  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
}

// ── VoidKit ───────────────────────────────────────────────────────────────

export class VoidKit {
  // ── Floaters ─────────────────────────────────────────────────────────
  private voidFloaters: Array<{ sprite: Phaser.GameObjects.Arc; damage: number; owner: 'player' | 'npc'; enhanced: boolean }> = [];
  private voidFloaterText: Phaser.GameObjects.Text | null = null;

  // ── Return to Void (E) ───────────────────────────────────────────────
  private voidReturnActive = false;
  private voidReturnFireAt = 0;
  private voidReturnConeGfx: Phaser.GameObjects.Graphics | null = null;
  private voidReturnTargetX = 0;
  private voidReturnTargetY = 0;
  private npcVoidReturnActive = false;
  private npcVoidReturnFireAt = 0;

  // ── Re-Lapse pulse projectiles (R) ───────────────────────────────────
  private voidPulseProjs: Array<{ sprite: Phaser.GameObjects.Arc; x: number; y: number; vx: number; vy: number; owner: 'player' | 'npc'; expiresAt: number }> = [];

  // ── Void Ash (F) ─────────────────────────────────────────────────────
  private voidAshActive = false;
  private voidAshX = 0;
  private voidAshY = 0;
  private voidAshEnd = 0;
  private voidAshSprite: Phaser.GameObjects.Arc | null = null;
  private voidAshTickAccum = 0;
  private npcVoidAshActive = false;
  private npcVoidAshX = 0;
  private npcVoidAshY = 0;
  private npcVoidAshEnd = 0;
  private npcVoidAshSprite: Phaser.GameObjects.Arc | null = null;
  private npcVoidAshTickAccum = 0;

  // ── Void of Hell (Q) ─────────────────────────────────────────────────
  private voidOfHellActive = false;
  private voidOfHellEnd = 0;
  private voidOfHellFlames: Array<{ sprite: Phaser.GameObjects.Arc; x: number; y: number; owner: 'player' | 'npc' }> = [];
  private voidOfHellPlayerFlameTickAccum = 0;
  private voidOfHellNpcFlameTickAccum = 0;

  // ── Decay system ─────────────────────────────────────────────────────
  private playerVoidDecayActive = false;
  private playerVoidDecayUntil = 0;
  private playerVoidDecayDmgAccum = 0;
  private playerVoidDecayVulnStack = 0;
  private playerVoidDecayText: Phaser.GameObjects.Text | null = null;
  private npcVoidDecayActive = false;
  private npcVoidDecayUntil = 0;
  private npcVoidDecayDmgAccum = 0;
  private npcVoidDecayVulnStack = 0;
  private npcVoidDecayText: Phaser.GameObjects.Text | null = null;

  // ── Nothing status ────────────────────────────────────────────────────
  private playerVoidNothingUntil = 0;
  private npcVoidNothingUntil = 0;
  private playerVoidNothingText: Phaser.GameObjects.Text | null = null;
  private npcVoidNothingText: Phaser.GameObjects.Text | null = null;

  constructor(private arena: VoidArenaApi) {}

  // ── HUD init (called from createSpecialAbilityHud when player is void) ──

  initHud(cx: number): void {
    if (this.voidFloaterText) { this.voidFloaterText.destroy(); this.voidFloaterText = null; }
    this.voidFloaterText = this.arena.scene.add.text(cx, 52, '🌑 0', {
      fontSize: '18px', fontFamily: '"Arial Black", sans-serif',
      color: '#cc88ff', stroke: '#110022', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
  }

  reset(): void {
    for (const f of this.voidFloaters) f.sprite.destroy();
    this.voidFloaters = [];
    if (this.voidFloaterText) { this.voidFloaterText.destroy(); this.voidFloaterText = null; }
    this.voidReturnActive = false; this.voidReturnFireAt = 0;
    if (this.voidReturnConeGfx) { this.voidReturnConeGfx.destroy(); this.voidReturnConeGfx = null; }
    this.voidReturnTargetX = 0; this.voidReturnTargetY = 0;
    this.npcVoidReturnActive = false; this.npcVoidReturnFireAt = 0;
    for (const p of this.voidPulseProjs) p.sprite.destroy();
    this.voidPulseProjs = [];
    this.voidAshActive = false;
    if (this.voidAshSprite) { this.voidAshSprite.destroy(); this.voidAshSprite = null; }
    this.voidAshTickAccum = 0;
    this.npcVoidAshActive = false;
    if (this.npcVoidAshSprite) { this.npcVoidAshSprite.destroy(); this.npcVoidAshSprite = null; }
    this.npcVoidAshTickAccum = 0;
    this.voidOfHellActive = false; this.voidOfHellEnd = 0;
    for (const fl of this.voidOfHellFlames) fl.sprite.destroy();
    this.voidOfHellFlames = [];
    this.voidOfHellPlayerFlameTickAccum = 0; this.voidOfHellNpcFlameTickAccum = 0;
    this.playerVoidDecayActive = false; this.playerVoidDecayUntil = 0;
    this.playerVoidDecayDmgAccum = 0; this.playerVoidDecayVulnStack = 0;
    if (this.playerVoidDecayText) { this.playerVoidDecayText.destroy(); this.playerVoidDecayText = null; }
    this.npcVoidDecayActive = false; this.npcVoidDecayUntil = 0;
    this.npcVoidDecayDmgAccum = 0; this.npcVoidDecayVulnStack = 0;
    if (this.npcVoidDecayText) { this.npcVoidDecayText.destroy(); this.npcVoidDecayText = null; }
    this.playerVoidNothingUntil = 0; this.npcVoidNothingUntil = 0;
    if (this.playerVoidNothingText) { this.playerVoidNothingText.destroy(); this.playerVoidNothingText = null; }
    if (this.npcVoidNothingText) { this.npcVoidNothingText.destroy(); this.npcVoidNothingText = null; }
  }

  handleInput(
    _time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    if (this.arena.nukeChanneling) return;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    if (pointer.isDown && !this.arena.pointerWasDown) {
      this.arena.player.castAbility('void-floater', playerCtx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
      this.arena.player.castAbility('void-return', playerCtx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      this.arena.player.castAbility('void-relapse', playerCtx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      this.arena.player.castAbility('void-ash', playerCtx);
    }

    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      this.arena.player.castAbility('void-of-hell', playerCtx);
    }
  }

  update(time: number, delta: number): void {
    const pointer = this.arena.scene.input.activePointer;
    const mouseX = pointer.worldX;
    const mouseY = pointer.worldY;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    // ── Floater movement ──────────────────────────────────────────
    for (let i = this.voidFloaters.length - 1; i >= 0; i--) {
      const f = this.voidFloaters[i];
      const target = f.owner === 'player'
        ? { x: mouseX, y: mouseY }
        : { x: this.arena.player.x, y: this.arena.player.y };
      const dx = target.x - f.sprite.x;
      const dy = target.y - f.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 250 * (delta / 1000);
      const move = Math.min(speed, dist);
      f.sprite.x += (dx / dist) * move;
      f.sprite.y += (dy / dist) * move;

      if (!f.enhanced) {
        for (const fl of this.voidOfHellFlames) {
          if (fl.owner !== f.owner) continue;
          if (Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, fl.x, fl.y) <= 75 + 10) {
            f.enhanced = true;
            f.damage = 25;
            f.sprite.setFillStyle(0xcc44ff, 0.95);
            f.sprite.setStrokeStyle(2, 0xffffff, 1);
            f.sprite.setRadius(16);
            break;
          }
        }
      }

      const enemy = f.owner === 'player' ? this.arena.npc : this.arena.player;
      const hitDist = Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, enemy.x, enemy.y);
      if (hitDist <= 22) {
        enemy.takeDamage(f.damage);
        this.arena.spawnHitFlash(enemy.x, enemy.y, 0x8800cc);
        this.arena.showFloatingText(enemy.x, enemy.y - 32, '🌑 Floater', '#cc44ff');
        f.sprite.destroy();
        this.voidFloaters.splice(i, 1);
        if (f.owner === 'player' && this.voidFloaterText) {
          this.voidFloaterText.setText(`🌑 ${this.voidFloaters.filter(fl => fl.owner === 'player').length}`);
        }
      }
    }

    // ── Return to Void cone telegraph (player) ───────────────────
    if (this.voidReturnActive) {
      const caster = this.arena.player;
      const angle = Math.atan2(mouseY - caster.y, mouseX - caster.x);
      const halfCone = 20 * (Math.PI / 180);
      const range = 200;

      if (this.voidReturnConeGfx) {
        this.voidReturnConeGfx.clear();
        this.voidReturnConeGfx.fillStyle(0x440066, 0.35);
        this.voidReturnConeGfx.beginPath();
        this.voidReturnConeGfx.moveTo(caster.x, caster.y);
        this.voidReturnConeGfx.arc(caster.x, caster.y, range, angle - halfCone, angle + halfCone, false);
        this.voidReturnConeGfx.closePath();
        this.voidReturnConeGfx.fillPath();
        this.voidReturnConeGfx.lineStyle(2, 0xcc44ff, 0.7);
        this.voidReturnConeGfx.strokePath();
      }

      if (time >= this.voidReturnFireAt) {
        this.voidReturnActive = false;
        if (this.voidReturnConeGfx) { this.voidReturnConeGfx.destroy(); this.voidReturnConeGfx = null; }

        const nx = this.arena.npc.x - caster.x;
        const ny = this.arena.npc.y - caster.y;
        const nDist = Math.sqrt(nx * nx + ny * ny);
        const nAngle = Math.atan2(ny, nx);
        let angleDiff = nAngle - angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        if (nDist <= range && Math.abs(angleDiff) <= halfCone) {
          this.arena.npc.takeDamage(15);
          this.arena.spawnHitFlash(this.arena.npc.x, this.arena.npc.y, 0x8800cc);
          this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 36, '🌑 Return to Void!', '#cc44ff');
          const stripped = this.doVoidReturnStripBuffs('npc', time);
          if (stripped > 0) {
            this.npcVoidNothingUntil = Math.max(this.npcVoidNothingUntil, time + stripped * 5000);
            this.arena.showFloatingText(this.arena.npc.x, this.arena.npc.y - 50, `+Nothing ${stripped * 5}s`, '#aa44ff');
          }
        }
      }
    }

    // ── NPC Return to Void ───────────────────────────────────────
    if (this.npcVoidReturnActive && time >= this.npcVoidReturnFireAt) {
      this.npcVoidReturnActive = false;
      const caster = this.arena.npc;
      const dx = this.arena.player.x - caster.x;
      const dy = this.arena.player.y - caster.y;
      const angle = Math.atan2(dy, dx);
      const halfCone = 20 * (Math.PI / 180);
      const range = 200;
      const pDist = Phaser.Math.Distance.Between(caster.x, caster.y, this.arena.player.x, this.arena.player.y);
      const pAngle = Math.atan2(this.arena.player.y - caster.y, this.arena.player.x - caster.x);
      let angleDiff = pAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      if (pDist <= range && Math.abs(angleDiff) <= halfCone) {
        this.arena.player.takeDamage(15);
        this.arena.spawnHitFlash(this.arena.player.x, this.arena.player.y, 0x8800cc);
        this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🌑 Return to Void!', '#cc44ff');
        const stripped = this.doVoidReturnStripBuffs('player', time);
        if (stripped > 0) {
          this.playerVoidNothingUntil = Math.max(this.playerVoidNothingUntil, time + stripped * 5000);
          this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 50, `+Nothing ${stripped * 5}s`, '#aa44ff');
        }
      }
    }

    // ── Re-Lapse pulse projectile movement ───────────────────────
    for (let i = this.voidPulseProjs.length - 1; i >= 0; i--) {
      const p = this.voidPulseProjs[i];
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.sprite.setPosition(p.x, p.y);

      if (time >= p.expiresAt || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        p.sprite.destroy();
        this.voidPulseProjs.splice(i, 1);
        continue;
      }

      const enemy = p.owner === 'player' ? this.arena.npc : this.arena.player;
      const dist = Phaser.Math.Distance.Between(p.x, p.y, enemy.x, enemy.y);
      if (dist <= 30) {
        p.sprite.destroy();
        this.voidPulseProjs.splice(i, 1);
        enemy.takeDamage(12);
        this.arena.spawnHitFlash(enemy.x, enemy.y, 0x8800cc);
        const doubled = this.doVoidReLapseEffect(p.owner === 'player' ? 'npc' : 'player', time);
        if (doubled) {
          this.arena.showFloatingText(enemy.x, enemy.y - 44, 'RE-LAPSE ×2', '#cc44ff');
        }
      }
    }

    // ── Void Ash — player (follows cursor) ───────────────────────
    if (this.voidAshActive) {
      if (time >= this.voidAshEnd) {
        this.voidAshActive = false;
        if (this.voidAshSprite) { this.voidAshSprite.destroy(); this.voidAshSprite = null; }
      } else {
        this.voidAshX += (mouseX - this.voidAshX) * 0.12;
        this.voidAshY += (mouseY - this.voidAshY) * 0.12;
        if (this.voidAshSprite) this.voidAshSprite.setPosition(this.voidAshX, this.voidAshY);

        const ashRadius = 80;
        const npcDist = Phaser.Math.Distance.Between(this.voidAshX, this.voidAshY, this.arena.npc.x, this.arena.npc.y);
        if (npcDist <= ashRadius) {
          this.voidAshTickAccum += delta;
          if (this.voidAshTickAccum >= 2000) {
            this.voidAshTickAccum -= 2000;
            this.arena.npc.takeDamage(10);
          }
          this.applyVoidDecay('npc', time);
        }
      }
    }

    // ── Void Ash — NPC (follows player) ─────────────────────────
    if (this.npcVoidAshActive) {
      if (time >= this.npcVoidAshEnd) {
        this.npcVoidAshActive = false;
        if (this.npcVoidAshSprite) { this.npcVoidAshSprite.destroy(); this.npcVoidAshSprite = null; }
      } else {
        this.npcVoidAshX += (this.arena.player.x - this.npcVoidAshX) * 0.08;
        this.npcVoidAshY += (this.arena.player.y - this.npcVoidAshY) * 0.08;
        if (this.npcVoidAshSprite) this.npcVoidAshSprite.setPosition(this.npcVoidAshX, this.npcVoidAshY);

        const ashRadius = 80;
        const pDist = Phaser.Math.Distance.Between(this.npcVoidAshX, this.npcVoidAshY, this.arena.player.x, this.arena.player.y);
        if (pDist <= ashRadius) {
          this.npcVoidAshTickAccum += delta;
          if (this.npcVoidAshTickAccum >= 2000) {
            this.npcVoidAshTickAccum -= 2000;
            this.arena.player.takeDamage(10);
          }
          this.applyVoidDecay('player', time);
        }
      }
    }

    // ── Void of Hell — expiry + flame damage ─────────────────────
    if (this.voidOfHellActive && time >= this.voidOfHellEnd) {
      this.voidOfHellActive = false;
      for (let i = this.voidOfHellFlames.length - 1; i >= 0; i--) {
        if (this.voidOfHellFlames[i].owner === 'player') {
          this.voidOfHellFlames[i].sprite.destroy();
          this.voidOfHellFlames.splice(i, 1);
        }
      }
    }

    let playerFlameHitsNpc = 0;
    let npcFlameHitsPlayer = 0;
    for (const fl of this.voidOfHellFlames) {
      const target = fl.owner === 'player' ? this.arena.npc : this.arena.player;
      const dist = Phaser.Math.Distance.Between(fl.x, fl.y, target.x, target.y);
      if (dist <= 60) {
        if (fl.owner === 'player') { playerFlameHitsNpc++; }
        else { npcFlameHitsPlayer++; }
        this.applyVoidDecay(fl.owner === 'player' ? 'npc' : 'player', time);
      }
    }
    if (playerFlameHitsNpc > 0) {
      this.voidOfHellPlayerFlameTickAccum += delta;
      while (this.voidOfHellPlayerFlameTickAccum >= 1000) {
        this.voidOfHellPlayerFlameTickAccum -= 1000;
        this.arena.npc.takeDamage(8 * playerFlameHitsNpc);
      }
    } else {
      this.voidOfHellPlayerFlameTickAccum = 0;
    }
    if (npcFlameHitsPlayer > 0) {
      this.voidOfHellNpcFlameTickAccum += delta;
      while (this.voidOfHellNpcFlameTickAccum >= 1000) {
        this.voidOfHellNpcFlameTickAccum -= 1000;
        this.arena.player.takeDamage(8 * npcFlameHitsPlayer);
      }
    } else {
      this.voidOfHellNpcFlameTickAccum = 0;
    }

    // Freeze negative-effect timers while target is inside a flame
    const npcInPlayerFlame = this.isInVoidFlame(this.arena.npc.x, this.arena.npc.y, 'player');
    if (npcInPlayerFlame) {
      if (this.npcVoidDecayUntil > time) this.npcVoidDecayUntil += delta;
      if (this.arena.npc.bleedingUntil > time) this.arena.npc.bleedingUntil += delta;
      if (this.arena.npc.frozenUntil > time) this.arena.npc.frozenUntil += delta;
      if (this.arena.npc.burningUntil > time) this.arena.npc.burningUntil += delta;
      if (this.arena.npc.toxicUntil > time) this.arena.npc.toxicUntil += delta;
      const npcMCTE = this.arena.getNpcMetalChainTetherEnd();
      if (npcMCTE > time) this.arena.setNpcMetalChainTetherEnd(npcMCTE + delta);
      const npcHSU = this.arena.getNpcHuntSlowUntil();
      if (npcHSU > time) this.arena.setNpcHuntSlowUntil(npcHSU + delta);
      const npcHCU = this.arena.getNpcHuntConfusedUntil();
      if (npcHCU > time) this.arena.setNpcHuntConfusedUntil(npcHCU + delta);
    }

    const playerInNpcFlame = this.isInVoidFlame(this.arena.player.x, this.arena.player.y, 'npc');
    if (playerInNpcFlame) {
      if (this.playerVoidDecayUntil > time) this.playerVoidDecayUntil += delta;
      const pBU = this.arena.getPlayerBleedingUntil();
      if (pBU > time) this.arena.setPlayerBleedingUntil(pBU + delta);
      const pFU = this.arena.getPlayerFrozenUntil();
      if (pFU > time) this.arena.setPlayerFrozenUntil(pFU + delta);
      const pBnU = this.arena.getPlayerBurningUntil();
      if (pBnU > time) this.arena.setPlayerBurningUntil(pBnU + delta);
      const pTU = this.arena.getPlayerToxicUntil();
      if (pTU > time) this.arena.setPlayerToxicUntil(pTU + delta);
      const pHSU = this.arena.getPlayerHuntSlowUntil();
      if (pHSU > time) this.arena.setPlayerHuntSlowUntil(pHSU + delta);
    }

    // ── Decay system ─────────────────────────────────────────────
    if (this.npcVoidDecayActive) {
      if (time >= this.npcVoidDecayUntil) {
        this.npcVoidDecayActive = false;
        this.npcVoidDecayVulnStack = 0;
        this.arena.npc.incomingDamageMultiplier = 1;
        if (this.npcVoidDecayText) { this.npcVoidDecayText.destroy(); this.npcVoidDecayText = null; }
      } else {
        this.npcVoidDecayDmgAccum += delta;
        if (this.npcVoidDecayDmgAccum >= 1000) {
          this.npcVoidDecayDmgAccum -= 1000;
          this.arena.npc.takeDamage(3);
          this.npcVoidDecayVulnStack = Math.min(20, this.npcVoidDecayVulnStack + 1);
          this.arena.npc.incomingDamageMultiplier = 1 + this.npcVoidDecayVulnStack * 0.05;
        }
        const remaining = this.npcVoidDecayUntil - time;
        if (!this.npcVoidDecayText) {
          this.npcVoidDecayText = this.arena.scene.add.text(this.arena.npc.x, this.arena.npc.y - 50,
            `🌑 ${Math.ceil(remaining / 1000)}s`, {
              fontSize: '13px', color: '#cc44ff', stroke: '#110022', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(12);
        } else {
          this.npcVoidDecayText.setPosition(this.arena.npc.x, this.arena.npc.y - 50);
          this.npcVoidDecayText.setText(`🌑 ${Math.ceil(remaining / 1000)}s`);
        }
      }
    }

    if (this.playerVoidDecayActive) {
      if (time >= this.playerVoidDecayUntil) {
        this.playerVoidDecayActive = false;
        this.playerVoidDecayVulnStack = 0;
        this.arena.player.incomingDamageMultiplier = 1;
        if (this.playerVoidDecayText) { this.playerVoidDecayText.destroy(); this.playerVoidDecayText = null; }
      } else {
        this.playerVoidDecayDmgAccum += delta;
        if (this.playerVoidDecayDmgAccum >= 1000) {
          this.playerVoidDecayDmgAccum -= 1000;
          this.arena.player.takeDamage(3);
          this.playerVoidDecayVulnStack = Math.min(20, this.playerVoidDecayVulnStack + 1);
          this.arena.player.incomingDamageMultiplier = 1 + this.playerVoidDecayVulnStack * 0.05;
        }
        const remaining = this.playerVoidDecayUntil - time;
        if (!this.playerVoidDecayText) {
          this.playerVoidDecayText = this.arena.scene.add.text(this.arena.player.x, this.arena.player.y - 50,
            `🌑 ${Math.ceil(remaining / 1000)}s`, {
              fontSize: '13px', color: '#cc44ff', stroke: '#110022', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(12);
        } else {
          this.playerVoidDecayText.setPosition(this.arena.player.x, this.arena.player.y - 50);
          this.playerVoidDecayText.setText(`🌑 ${Math.ceil(remaining / 1000)}s`);
        }
      }
    }

    // ── Nothing status indicator ─────────────────────────────────
    if (this.npcVoidNothingUntil > time) {
      const remaining = this.npcVoidNothingUntil - time;
      if (!this.npcVoidNothingText) {
        this.npcVoidNothingText = this.arena.scene.add.text(this.arena.npc.x, this.arena.npc.y - 65,
          `🚫 NOTHING ${Math.ceil(remaining / 1000)}s`, {
            fontSize: '11px', color: '#aa44ff', stroke: '#110022', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(12);
      } else {
        this.npcVoidNothingText.setPosition(this.arena.npc.x, this.arena.npc.y - 65);
        this.npcVoidNothingText.setText(`🚫 NOTHING ${Math.ceil(remaining / 1000)}s`);
      }
    } else if (this.npcVoidNothingText) {
      this.npcVoidNothingText.destroy(); this.npcVoidNothingText = null;
    }

    if (this.playerVoidNothingUntil > time) {
      const remaining = this.playerVoidNothingUntil - time;
      if (!this.playerVoidNothingText) {
        this.playerVoidNothingText = this.arena.scene.add.text(this.arena.player.x, this.arena.player.y - 65,
          `🚫 NOTHING ${Math.ceil(remaining / 1000)}s`, {
            fontSize: '11px', color: '#aa44ff', stroke: '#110022', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(12);
      } else {
        this.playerVoidNothingText.setPosition(this.arena.player.x, this.arena.player.y - 65);
        this.playerVoidNothingText.setText(`🚫 NOTHING ${Math.ceil(remaining / 1000)}s`);
      }
    } else if (this.playerVoidNothingText) {
      this.playerVoidNothingText.destroy(); this.playerVoidNothingText = null;
    }

    void W; void H;
  }

  // ── do* methods — called from ArenaScene context builders ─────────────

  doVoidFloater(owner: 'player' | 'npc'): void {
    const myFloaters = this.voidFloaters.filter(f => f.owner === owner);
    if (myFloaters.length >= 3) {
      const oldest = myFloaters[0];
      oldest.sprite.destroy();
      this.voidFloaters.splice(this.voidFloaters.indexOf(oldest), 1);
    }

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const spr = this.arena.scene.add.circle(caster.x, caster.y, 10, 0x330044, 0.9)
      .setStrokeStyle(2, 0xaa00ff, 1).setDepth(7) as Phaser.GameObjects.Arc;

    this.voidFloaters.push({ sprite: spr, damage: 12, owner, enhanced: false });

    if (owner === 'player' && this.voidFloaterText) {
      const count = this.voidFloaters.filter(f => f.owner === 'player').length;
      this.voidFloaterText.setText(`🌑 ${count}`);
    }
  }

  doVoidReturnToVoid(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    if (owner === 'player') {
      this.voidReturnActive = true;
      this.voidReturnFireAt = this.arena.scene.time.now + 2000;
      this.voidReturnTargetX = tx;
      this.voidReturnTargetY = ty;
      if (this.voidReturnConeGfx) { this.voidReturnConeGfx.destroy(); this.voidReturnConeGfx = null; }
      this.voidReturnConeGfx = this.arena.scene.add.graphics().setDepth(6);
    } else {
      this.npcVoidReturnActive = true;
      this.npcVoidReturnFireAt = this.arena.scene.time.now + 2000;
    }
    this.arena.showFloatingText(caster.x, caster.y - 30, '🌑 Return to Void…', '#cc44ff');
    void tx; void ty;
  }

  doVoidReLapse(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 350;

    const spr = this.arena.scene.add.circle(caster.x, caster.y, 7, 0x220033, 1)
      .setStrokeStyle(2, 0x8800cc, 1).setDepth(7) as Phaser.GameObjects.Arc;

    this.voidPulseProjs.push({
      sprite: spr,
      x: caster.x, y: caster.y,
      vx: (dx / len) * speed, vy: (dy / len) * speed,
      owner,
      expiresAt: this.arena.scene.time.now + 3000,
    });
  }

  doVoidAsh(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const myFloaters = this.voidFloaters.filter(f => f.owner === owner);
    const floaterCount = myFloaters.length;
    const duration = (2 + 2 * floaterCount) * 1000;

    for (const f of myFloaters) f.sprite.destroy();
    this.voidFloaters = this.voidFloaters.filter(f => f.owner !== owner);

    if (owner === 'player') {
      if (this.voidFloaterText) this.voidFloaterText.setText('🌑 0');
      this.voidAshActive = true;
      this.voidAshX = tx;
      this.voidAshY = ty;
      this.voidAshEnd = this.arena.scene.time.now + duration;
      this.voidAshTickAccum = 0;
      if (this.voidAshSprite) this.voidAshSprite.destroy();
      this.voidAshSprite = this.arena.scene.add.circle(tx, ty, 80, 0x110011, 0.65)
        .setStrokeStyle(3, 0x440066, 0.9).setDepth(3) as Phaser.GameObjects.Arc;
      this.arena.showFloatingText(tx, ty - 90, '🌑 Void Ash!', '#cc44ff');
    } else {
      this.npcVoidAshActive = true;
      this.npcVoidAshX = tx;
      this.npcVoidAshY = ty;
      this.npcVoidAshEnd = this.arena.scene.time.now + duration;
      this.npcVoidAshTickAccum = 0;
      if (this.npcVoidAshSprite) this.npcVoidAshSprite.destroy();
      this.npcVoidAshSprite = this.arena.scene.add.circle(tx, ty, 80, 0x110011, 0.65)
        .setStrokeStyle(3, 0x440066, 0.9).setDepth(3) as Phaser.GameObjects.Arc;
      this.arena.showFloatingText(tx, ty - 90, '🌑 Void Ash!', '#cc44ff');
    }
  }

  doVoidOfHell(owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const pad = 32;

    for (let i = this.voidOfHellFlames.length - 1; i >= 0; i--) {
      if (this.voidOfHellFlames[i].owner === owner) {
        this.voidOfHellFlames[i].sprite.destroy();
        this.voidOfHellFlames.splice(i, 1);
      }
    }

    const flamePositions: { x: number; y: number }[] = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const perimeter = 2 * (W - 2 * pad) + 2 * (H - 2 * pad);
      const pos = t * perimeter;
      const topLen = W - 2 * pad;
      const rightLen = H - 2 * pad;
      const botLen = W - 2 * pad;
      if (pos < topLen) {
        flamePositions.push({ x: pad + pos, y: pad + 20 });
      } else if (pos < topLen + rightLen) {
        flamePositions.push({ x: W - pad - 20, y: pad + (pos - topLen) });
      } else if (pos < topLen + rightLen + botLen) {
        flamePositions.push({ x: W - pad - (pos - topLen - rightLen), y: H - pad - 20 });
      } else {
        flamePositions.push({ x: pad + 20, y: H - pad - (pos - topLen - rightLen - botLen) });
      }
    }

    for (const fp of flamePositions) {
      const spr = scene.add.circle(fp.x, fp.y, 75, 0x6600aa, 0.45)
        .setStrokeStyle(3, 0xcc44ff, 0.8).setDepth(3) as Phaser.GameObjects.Arc;
      scene.tweens.add({ targets: spr, alpha: 0.65, yoyo: true, repeat: -1, duration: 700 });
      this.voidOfHellFlames.push({ sprite: spr, x: fp.x, y: fp.y, owner });
    }

    if (owner === 'player') {
      this.voidOfHellActive = true;
      this.voidOfHellEnd = scene.time.now + 15000;
    }

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.arena.showFloatingText(caster.x, caster.y - 40, '🔥 VOID OF HELL', '#cc44ff');
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private applyVoidDecay(target: 'player' | 'npc', time: number): void {
    if (target === 'npc') {
      this.npcVoidDecayActive = true;
      this.npcVoidDecayUntil = time + 5000;
    } else {
      this.playerVoidDecayActive = true;
      this.playerVoidDecayUntil = time + 5000;
    }
  }

  private isInVoidFlame(px: number, py: number, by: 'player' | 'npc'): boolean {
    for (const fl of this.voidOfHellFlames) {
      if (fl.owner !== by) continue;
      if (Phaser.Math.Distance.Between(px, py, fl.x, fl.y) <= 60) return true;
    }
    return false;
  }

  private doVoidReLapseEffect(target: 'player' | 'npc', time: number): boolean {
    let doubled = false;
    const doublify = (get: () => number, set: (v: number) => void) => {
      const val = get();
      if (val > time) {
        const remaining = val - time;
        set(time + remaining * 2);
        doubled = true;
      }
    };

    if (target === 'npc') {
      doublify(() => this.npcVoidDecayUntil, v => { this.npcVoidDecayUntil = v; });
      doublify(() => this.arena.npc.bleedingUntil, v => { this.arena.npc.bleedingUntil = v; });
      doublify(() => this.arena.npc.frozenUntil, v => { this.arena.npc.frozenUntil = v; });
      doublify(() => this.arena.npc.burningUntil, v => { this.arena.npc.burningUntil = v; });
      doublify(() => this.arena.npc.toxicUntil, v => { this.arena.npc.toxicUntil = v; });
      doublify(() => this.arena.getNpcMetalChainTetherEnd(), v => { this.arena.setNpcMetalChainTetherEnd(v); });
      doublify(() => this.arena.getNpcMetalArmorEnd(), v => { this.arena.setNpcMetalArmorEnd(v); });
      doublify(() => this.arena.getNpcHuntSlowUntil(), v => { this.arena.setNpcHuntSlowUntil(v); });
      doublify(() => this.arena.getNpcHuntConfusedUntil(), v => { this.arena.setNpcHuntConfusedUntil(v); });
      doublify(() => this.arena.npc.earthStunnedUntil, v => { this.arena.npc.earthStunnedUntil = v; });
      doublify(() => this.arena.getNpcAggressiveBleedUntil(), v => { this.arena.setNpcAggressiveBleedUntil(v); });
      doublify(() => this.arena.getLightNpcPhotoSlowUntil(), v => { this.arena.setLightNpcPhotoSlowUntil(v); });
    } else {
      doublify(() => this.playerVoidDecayUntil, v => { this.playerVoidDecayUntil = v; });
      doublify(() => this.arena.getPlayerBleedingUntil(), v => { this.arena.setPlayerBleedingUntil(v); });
      doublify(() => this.arena.getPlayerFrozenUntil(), v => { this.arena.setPlayerFrozenUntil(v); });
      doublify(() => this.arena.getPlayerBurningUntil(), v => { this.arena.setPlayerBurningUntil(v); });
      doublify(() => this.arena.getPlayerToxicUntil(), v => { this.arena.setPlayerToxicUntil(v); });
      doublify(() => this.arena.getPlayerHuntSlowUntil(), v => { this.arena.setPlayerHuntSlowUntil(v); });
    }
    return doubled;
  }

  private doVoidReturnStripBuffs(target: 'player' | 'npc', time: number): number {
    let stripped = 0;
    if (target === 'npc') {
      if (this.arena.npc.shieldCharges > 0) { this.arena.npc.shieldCharges = 0; stripped++; }
      if (this.arena.npc.shieldHp > 0) { this.arena.npc.shieldHp = 0; stripped++; }
      if (this.arena.getNpcHuntBloodMoonActive()) { this.arena.setNpcHuntBloodMoonActive(false); stripped++; }
      if (this.arena.getNpcPlasmaIncarnateActive()) { this.arena.setNpcPlasmaIncarnateActive(false); stripped++; }
      if (this.arena.getNpcDeathSoulSplitUntil() > time) { this.arena.setNpcDeathSoulSplitUntil(0); stripped++; }
      if (this.arena.getMagnetNpcSpeedBuffUntil() > time) { this.arena.setMagnetNpcSpeedBuffUntil(0); stripped++; }
      if (this.arena.getLightNpcPhotonSpeedBoostUntil() > time) { this.arena.setLightNpcPhotonSpeedBoostUntil(0); stripped++; }
      if (this.arena.getLightNpcPhotoAccelUntil() > time) { this.arena.setLightNpcPhotoAccelUntil(0); stripped++; }
    } else {
      if (this.arena.player.shieldCharges > 0) { this.arena.player.shieldCharges = 0; stripped++; }
      if (this.arena.player.shieldHp > 0) { this.arena.player.shieldHp = 0; stripped++; }
      if (this.arena.getHuntBloodMoonActive()) { this.arena.setHuntBloodMoonActive(false); stripped++; }
      if (this.arena.getPlasmaIncarnateActive()) { this.arena.setPlasmaIncarnateActive(false); stripped++; }
      if (this.arena.getDeathSoulSplitUntil() > time) { this.arena.setDeathSoulSplitUntil(0); stripped++; }
      if (this.arena.getMagnetPlayerSpeedBuffUntil() > time) { this.arena.setMagnetPlayerSpeedBuffUntil(0); stripped++; }
      if (this.arena.getLightPhotonSpeedBoostUntil() > time) { this.arena.setLightPhotonSpeedBoostUntil(0); stripped++; }
      if (this.arena.getLightPhotoAccelUntil() > time) { this.arena.setLightPhotoAccelUntil(0); stripped++; }
    }
    return stripped;
  }
}
