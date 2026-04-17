import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── LightArenaApi ─────────────────────────────────────────────────────────

export interface LightArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly npcCastId: string | null;
  applyNpcSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
}

// ── LightKit ──────────────────────────────────────────────────────────────

export class LightKit {
  // ── Player state ─────────────────────────────────────────────────────
  private lightSpeedText: Phaser.GameObjects.Text | null = null;
  private lightMarkedExpiry = 0;
  private lightSpearHolding = false;
  private lightSpearPointerDownX = 0;
  private lightSpearPointerDownY = 0;
  private lightSpearClickArmed = false;
  private lightSpearHoldStart = 0;
  private lightSpearSprite: Phaser.GameObjects.Rectangle | null = null;
  private lightSpearHitCooldown = 0;
  private lightPhotoSlowUntil = 0;
  private lightPhotoAccelStart = 0;
  private lightPhotoAccelUntil = 0;
  private lightPhotoStillSince = 0;
  private lightPhotoRegenAccum = 0;
  private lightPhotonOrbs: Array<{ sprite: Phaser.GameObjects.Arc; orbitAngle: number }> = [];
  private lightPhotonCdStartedAt = -999999;
  private lightPhotonSpeedBoostUntil = 0;
  private lightOverstimUntil = 0;
  private lightOverstimTickAccum = 0;
  private lightSkewerModeUntil = 0;
  private lightSkewerTargetHooked = false;
  private lightSkewerInitialDealt = false;
  private lightAngelActive = false;
  private lightAngelUntil = 0;
  private lightAngelSprite: Phaser.GameObjects.Arc | null = null;
  private lightAngelOrbitAngle = 0;
  private lightAngelBladeAccum = 0;
  private lightAngelLink: Phaser.GameObjects.Graphics | null = null;

  // ── NPC state ─────────────────────────────────────────────────────────
  private npcLightMarkedExpiry = 0;
  private npcLightPhotonOrbs: Array<{ sprite: Phaser.GameObjects.Arc; orbitAngle: number }> = [];
  private npcLightPhotonCdStartedAt = -999999;
  private npcLightPhotonSpeedBoostUntil = 0;
  private npcLightOverstimUntil = 0;
  private npcLightOverstimTickAccum = 0;
  private npcLightPhotoSlowUntil = 0;
  private npcLightPhotoAccelStart = 0;
  private npcLightPhotoAccelUntil = 0;
  private npcLightSkewerModeUntil = 0;
  private npcLightSkewerTargetHooked = false;
  private npcLightAngelActive = false;
  private npcLightAngelUntil = 0;
  private npcLightAngelSprite: Phaser.GameObjects.Arc | null = null;
  private npcLightAngelOrbitAngle = 0;
  private npcLightAngelBladeAccum = 0;
  private npcLightAngelLink: Phaser.GameObjects.Graphics | null = null;

  constructor(private arena: LightArenaApi) {}

  // ── Public accessors for cross-cutting arena references ──────────────

  getPhotoAccelUntil(): number { return this.lightPhotoAccelUntil; }
  getPhotoAccelStart(): number { return this.lightPhotoAccelStart; }
  getPhotonSpeedBoostUntil(): number { return this.lightPhotonSpeedBoostUntil; }
  setPhotonSpeedBoostUntil(v: number): void { this.lightPhotonSpeedBoostUntil = v; }
  setPhotoAccelUntil(v: number): void { this.lightPhotoAccelUntil = v; }
  isAngelActive(): boolean { return this.lightAngelActive; }
  getSkewerModeUntil(): number { return this.lightSkewerModeUntil; }

  getNpcPhotoAccelUntil(): number { return this.npcLightPhotoAccelUntil; }
  setNpcPhotoAccelUntil(v: number): void { this.npcLightPhotoAccelUntil = v; }
  getNpcPhotonSpeedBoostUntil(): number { return this.npcLightPhotonSpeedBoostUntil; }
  setNpcPhotonSpeedBoostUntil(v: number): void { this.npcLightPhotonSpeedBoostUntil = v; }
  getNpcPhotoSlowUntil(): number { return this.npcLightPhotoSlowUntil; }
  setNpcPhotoSlowUntil(v: number): void { this.npcLightPhotoSlowUntil = v; }

  reset(): void {
    if (this.lightSpeedText) { this.lightSpeedText.destroy(); this.lightSpeedText = null; }
    this.lightMarkedExpiry = 0;
    this.lightSpearHolding = false;
    this.lightSpearPointerDownX = 0;
    this.lightSpearPointerDownY = 0;
    this.lightSpearClickArmed = false;
    this.lightSpearHoldStart = 0;
    if (this.lightSpearSprite) { this.lightSpearSprite.destroy(); this.lightSpearSprite = null; }
    this.lightSpearHitCooldown = 0;
    this.lightPhotoSlowUntil = 0;
    this.lightPhotoAccelStart = 0;
    this.lightPhotoAccelUntil = 0;
    this.lightPhotoStillSince = 0;
    this.lightPhotoRegenAccum = 0;
    this.lightPhotonOrbs.forEach((o) => o.sprite.destroy());
    this.lightPhotonOrbs = [];
    this.lightPhotonCdStartedAt = -999999;
    this.lightPhotonSpeedBoostUntil = 0;
    this.lightOverstimUntil = 0;
    this.lightOverstimTickAccum = 0;
    this.lightSkewerModeUntil = 0;
    this.lightSkewerTargetHooked = false;
    this.lightSkewerInitialDealt = false;
    this.lightAngelActive = false;
    this.lightAngelUntil = 0;
    if (this.lightAngelSprite) { this.lightAngelSprite.destroy(); this.lightAngelSprite = null; }
    this.lightAngelOrbitAngle = 0;
    this.lightAngelBladeAccum = 0;
    if (this.lightAngelLink) { this.lightAngelLink.destroy(); this.lightAngelLink = null; }

    this.npcLightMarkedExpiry = 0;
    this.npcLightPhotonOrbs.forEach((o) => o.sprite.destroy());
    this.npcLightPhotonOrbs = [];
    this.npcLightPhotonCdStartedAt = -999999;
    this.npcLightPhotonSpeedBoostUntil = 0;
    this.npcLightOverstimUntil = 0;
    this.npcLightOverstimTickAccum = 0;
    this.npcLightPhotoSlowUntil = 0;
    this.npcLightPhotoAccelStart = 0;
    this.npcLightPhotoAccelUntil = 0;
    this.npcLightSkewerModeUntil = 0;
    this.npcLightSkewerTargetHooked = false;
    this.npcLightAngelActive = false;
    this.npcLightAngelUntil = 0;
    if (this.npcLightAngelSprite) { this.npcLightAngelSprite.destroy(); this.npcLightAngelSprite = null; }
    this.npcLightAngelOrbitAngle = 0;
    this.npcLightAngelBladeAccum = 0;
    if (this.npcLightAngelLink) { this.npcLightAngelLink.destroy(); this.npcLightAngelLink = null; }
  }

  update(time: number, delta: number, isPlayerLight: boolean, isNpcLight: boolean): void {
    const { player, npc, scene } = this.arena;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const npcBody = npc.body as Phaser.Physics.Arcade.Body;
    const { width: W, height: H } = scene.scale;
    const ptr = scene.input.activePointer;

    // ── Player Light ─────────────────────────────────────────────────
    if (isPlayerLight) {
      const speedMag = Math.hypot(playerBody.velocity.x, playerBody.velocity.y);
      const speedBonus = Math.round(speedMag / 15);

      if (this.lightSpeedText) this.lightSpeedText.setText(`🏃 ${Math.round(speedMag)} px/s`);

      // Mark: NPC takes 15% more damage
      if (time < this.lightMarkedExpiry) {
        npc.incomingDamageMultiplier = Math.max(npc.incomingDamageMultiplier, 1.15);
      } else {
        if (npc.incomingDamageMultiplier === 1.15) npc.incomingDamageMultiplier = 1;
      }

      // Photosynthespark stand-still regen
      if (time < this.lightPhotoAccelUntil) {
        if (speedMag > 8) {
          this.lightPhotoStillSince = time;
          this.lightPhotoRegenAccum = 0;
        } else if (time - this.lightPhotoStillSince >= 500) {
          this.lightPhotoRegenAccum += delta;
          if (this.lightPhotoRegenAccum >= 1000) {
            this.lightPhotoRegenAccum -= 1000;
            player.hp = Math.min(player.maxHp, player.hp + 8);
            this.arena.showFloatingText(player.x, player.y - 20, '+8 🌞 REGEN', '#fff4a8');
          }
        }
      }

      // Angel DR buff
      if (this.lightAngelActive) {
        player.incomingDamageMultiplier = Math.min(player.incomingDamageMultiplier, 0.75);
      }

      // Held spear: reposition + contact damage
      if (this.lightSpearHolding && this.lightSpearSprite) {
        const ang = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        const spearX = player.x + Math.cos(ang) * 36;
        const spearY = player.y + Math.sin(ang) * 36;
        this.lightSpearSprite.setPosition(spearX, spearY);
        this.lightSpearSprite.setRotation(ang);

        const d = Phaser.Math.Distance.Between(spearX, spearY, npc.x, npc.y);
        if (d < 30 && time >= this.lightSpearHitCooldown) {
          const dmg = 6 + speedBonus;
          npc.takeDamage(dmg);
          this.arena.spawnHitFlash(npc.x, npc.y, 0xfff4a8);
          this.lightSpearHitCooldown = time + 300;

          if (time < this.lightSkewerModeUntil && !this.lightSkewerTargetHooked) {
            this.lightSkewerTargetHooked = true;
            this.lightSkewerInitialDealt = false;
            this.arena.showFloatingText(npc.x, npc.y - 20, '🗡 SKEWERED', '#fff4a8');
          }
        }
      } else if (this.lightSkewerTargetHooked) {
        this.lightSkewerTargetHooked = false;
      }

      // Skewer: drag target + wall slam
      if (this.lightSkewerTargetHooked && time < this.lightSkewerModeUntil) {
        const ang = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        const tethX = player.x + Math.cos(ang) * 60;
        const tethY = player.y + Math.sin(ang) * 60;
        npc.setPosition(tethX, tethY);
        npcBody.reset(tethX, tethY);
        const margin = 32;
        const hitWall = tethX < margin || tethX > W - margin || tethY < margin || tethY > H - margin;
        if (hitWall) {
          const wallDmg = Math.min(150, 50 + Math.round(speedMag / 50));
          npc.takeDamage(wallDmg);
          this.arena.spawnHitFlash(npc.x, npc.y, 0xfff4a8);
          this.arena.showFloatingText(npc.x, npc.y - 20, `💥 WALL SLAM ${wallDmg}`, '#fff4a8');
          this.lightSkewerTargetHooked = false;
          this.lightSkewerModeUntil = 0;
        }
      } else if (time >= this.lightSkewerModeUntil && this.lightSkewerTargetHooked) {
        this.lightSkewerTargetHooked = false;
      }

      // Photon orbs orbit + overstim contact
      const orbR = 44;
      for (let i = this.lightPhotonOrbs.length - 1; i >= 0; i--) {
        const orb = this.lightPhotonOrbs[i];
        orb.orbitAngle += delta * 0.003;
        const ang = orb.orbitAngle + i * Math.PI;
        orb.sprite.setPosition(player.x + Math.cos(ang) * orbR, player.y + Math.sin(ang) * orbR);
        const d = Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, npc.x, npc.y);
        if (d < 22) {
          orb.sprite.destroy();
          this.lightPhotonOrbs.splice(i, 1);
          this.lightOverstimUntil = time + 5000;
          this.arena.showFloatingText(npc.x, npc.y - 20, '✨ OVERSTIM', '#fff4a8');
          if (this.lightPhotonOrbs.length === 0) this.lightPhotonCdStartedAt = time;
        }
      }

      // Overstim tick damage
      if (time < this.lightOverstimUntil) {
        this.lightOverstimTickAccum += delta;
        if (this.lightOverstimTickAccum >= 250) {
          this.lightOverstimTickAccum -= 250;
          const npcSpeed = Math.hypot(npcBody.velocity.x, npcBody.velocity.y);
          let tickDmg = 0;
          if (npcSpeed < 10) tickDmg = 0;
          else if (npcSpeed < 150) tickDmg = 2;
          else if (npcSpeed < 350) tickDmg = 4;
          else tickDmg = 6;
          if (tickDmg > 0) {
            npc.takeDamage(tickDmg);
            this.arena.spawnHitFlash(npc.x, npc.y, 0xfff4a8);
          }
        }
      }

      // Prayer angel orbit + auto-mark + holy blades
      if (this.lightAngelActive) {
        if (time >= this.lightAngelUntil) {
          if (this.lightAngelSprite) { this.lightAngelSprite.destroy(); this.lightAngelSprite = null; }
          if (this.lightAngelLink) { this.lightAngelLink.destroy(); this.lightAngelLink = null; }
          this.lightAngelActive = false;
          player.incomingDamageMultiplier = Math.max(1, player.incomingDamageMultiplier / 0.75);
        } else {
          this.lightAngelOrbitAngle += delta * 0.0015;
          const angelX = player.x + Math.cos(this.lightAngelOrbitAngle) * 80;
          const angelY = player.y + Math.sin(this.lightAngelOrbitAngle) * 80;
          if (this.lightAngelSprite) this.lightAngelSprite.setPosition(angelX, angelY);
          if (this.lightAngelLink) {
            this.lightAngelLink.clear();
            this.lightAngelLink.lineStyle(2, 0xfff4a8, 0.6);
            this.lightAngelLink.lineBetween(player.x, player.y, angelX, angelY);
          }
          if (time > this.lightMarkedExpiry - 1500) {
            this.lightMarkedExpiry = time + 2500;
          }
          this.lightAngelBladeAccum += delta;
          if (this.lightAngelBladeAccum >= 3000) {
            this.lightAngelBladeAccum -= 3000;
            for (let i = 0; i < 8; i++) {
              const bAng = i * Math.PI / 4;
              const proj = new Projectile(scene, angelX, angelY, 'proj-holy-blade', 12, true);
              this.arena.projectiles.add(proj);
              proj.launch(Math.cos(bAng) * 350, Math.sin(bAng) * 350);
            }
            this.arena.showFloatingText(angelX, angelY - 20, '😇 HOLY BLADES', '#fff4a8');
          }
        }
      }

      void speedBonus;
    }

    // ── NPC Light ─────────────────────────────────────────────────────
    if (isNpcLight) {
      const npcSpeed = Math.hypot(npcBody.velocity.x, npcBody.velocity.y);

      // NPC mark on player
      if (time < this.npcLightMarkedExpiry) {
        player.incomingDamageMultiplier = Math.max(player.incomingDamageMultiplier, 1.15);
      } else {
        if (player.incomingDamageMultiplier === 1.15) player.incomingDamageMultiplier = 1;
      }

      // NPC photospark phases (speed applied via arena api)
      if (time < this.npcLightPhotoSlowUntil) {
        this.arena.applyNpcSpeedMult(0.2);
      } else if (time < this.npcLightPhotoAccelUntil) {
        const t = Math.min(1, (time - this.npcLightPhotoAccelStart) / 5000);
        const peakT = Math.min(t / 0.9, 1);
        this.arena.applyNpcSpeedMult(1.15 + (2.0 - 1.15) * peakT);
      }

      if (time < this.npcLightPhotonSpeedBoostUntil) this.arena.applyNpcSpeedMult(3);

      if (this.npcLightAngelActive) {
        this.arena.applyNpcSpeedMult(1.25);
        npc.incomingDamageMultiplier = Math.min(npc.incomingDamageMultiplier, 0.75);
      }

      // NPC photon orbs orbit + overstim contact
      for (let i = this.npcLightPhotonOrbs.length - 1; i >= 0; i--) {
        const orb = this.npcLightPhotonOrbs[i];
        orb.orbitAngle += delta * 0.003;
        const ang = orb.orbitAngle + i * Math.PI;
        orb.sprite.setPosition(npc.x + Math.cos(ang) * 44, npc.y + Math.sin(ang) * 44);
        const d = Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, player.x, player.y);
        if (d < 22) {
          orb.sprite.destroy();
          this.npcLightPhotonOrbs.splice(i, 1);
          this.npcLightOverstimUntil = time + 5000;
          this.arena.showFloatingText(player.x, player.y - 20, '✨ OVERSTIM', '#fff4a8');
          if (this.npcLightPhotonOrbs.length === 0) this.npcLightPhotonCdStartedAt = time;
        }
      }

      // NPC overstim tick damage
      if (time < this.npcLightOverstimUntil) {
        this.npcLightOverstimTickAccum += delta;
        if (this.npcLightOverstimTickAccum >= 250) {
          this.npcLightOverstimTickAccum -= 250;
          const pSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.y);
          let tickDmg = 0;
          if (pSpeed < 10) tickDmg = 0;
          else if (pSpeed < 150) tickDmg = 2;
          else if (pSpeed < 350) tickDmg = 4;
          else tickDmg = 6;
          if (tickDmg > 0) {
            player.takeDamage(tickDmg);
            this.arena.spawnHitFlash(player.x, player.y, 0xfff4a8);
          }
        }
      }

      // NPC angel orbit
      if (this.npcLightAngelActive) {
        if (time >= this.npcLightAngelUntil) {
          if (this.npcLightAngelSprite) { this.npcLightAngelSprite.destroy(); this.npcLightAngelSprite = null; }
          if (this.npcLightAngelLink) { this.npcLightAngelLink.destroy(); this.npcLightAngelLink = null; }
          this.npcLightAngelActive = false;
          npc.incomingDamageMultiplier = Math.max(1, npc.incomingDamageMultiplier / 0.75);
        } else {
          this.npcLightAngelOrbitAngle += delta * 0.0015;
          const angelX = npc.x + Math.cos(this.npcLightAngelOrbitAngle) * 80;
          const angelY = npc.y + Math.sin(this.npcLightAngelOrbitAngle) * 80;
          if (this.npcLightAngelSprite) this.npcLightAngelSprite.setPosition(angelX, angelY);
          if (this.npcLightAngelLink) {
            this.npcLightAngelLink.clear();
            this.npcLightAngelLink.lineStyle(2, 0xfff4a8, 0.6);
            this.npcLightAngelLink.lineBetween(npc.x, npc.y, angelX, angelY);
          }
          if (time > this.npcLightMarkedExpiry - 1500) this.npcLightMarkedExpiry = time + 2500;
          this.npcLightAngelBladeAccum += delta;
          if (this.npcLightAngelBladeAccum >= 3000) {
            this.npcLightAngelBladeAccum -= 3000;
            for (let i = 0; i < 8; i++) {
              const bAng = i * Math.PI / 4;
              const proj = new Projectile(scene, angelX, angelY, 'proj-holy-blade', 12, false);
              this.arena.projectiles.add(proj);
              proj.launch(Math.cos(bAng) * 350, Math.sin(bAng) * 350);
            }
            this.arena.showFloatingText(angelX, angelY - 20, '😇 HOLY BLADES', '#fff4a8');
          }
        }
      }

      // React to npcCastId for NPC Light abilities
      const npcCastId = this.arena.npcCastId;
      if (npcCastId === 'light-stab') {
        this.npcLightMarkedExpiry = time + 2000;
        this.arena.showFloatingText(player.x, player.y - 20, '✨ HIGHLIGHTED', '#fff4a8');
      }
      if (npcCastId === 'photo-spark') {
        this.npcLightPhotoSlowUntil = time + 3000;
        this.npcLightPhotoAccelStart = time + 3000;
        this.npcLightPhotoAccelUntil = time + 8000;
        this.arena.showFloatingText(npc.x, npc.y - 30, '🌞 PHOTOSYNTHESPARK', '#fff4a8');
      }
      if (npcCastId === 'photon-orbs' && this.npcLightPhotonOrbs.length === 0 && (time - this.npcLightPhotonCdStartedAt >= 20000 || this.npcLightPhotonCdStartedAt < -1000)) {
        for (let i = 0; i < 2; i++) {
          const sprite = scene.add.circle(npc.x, npc.y, 9, 0xfff4a8, 0.9).setDepth(8).setStrokeStyle(1, 0xffffff);
          this.npcLightPhotonOrbs.push({ sprite, orbitAngle: i * Math.PI });
        }
        this.arena.showFloatingText(npc.x, npc.y - 30, '✨ PHOTON ORBS', '#fff4a8');
      } else if (npcCastId === 'photon-orbs' && this.npcLightPhotonOrbs.length > 0) {
        const orb = this.npcLightPhotonOrbs.pop()!;
        orb.sprite.destroy();
        this.npcLightPhotonSpeedBoostUntil = time + 1500;
        if (this.npcLightPhotonOrbs.length === 0) this.npcLightPhotonCdStartedAt = time;
      }
      if (npcCastId === 'prayer' && !this.npcLightAngelActive) {
        const angelSprite = scene.add.circle(npc.x, npc.y, 14, 0xfff4a8, 0.9).setDepth(8).setStrokeStyle(2, 0xffffff);
        this.npcLightAngelSprite = angelSprite;
        this.npcLightAngelLink = scene.add.graphics().setDepth(5);
        this.npcLightAngelActive = true;
        this.npcLightAngelUntil = time + 8000;
        this.npcLightAngelOrbitAngle = 0;
        this.npcLightAngelBladeAccum = 0;
        npc.incomingDamageMultiplier *= 0.75;
        this.arena.showFloatingText(npc.x, npc.y - 30, '😇 PRAYER', '#fff4a8');
      }

      void npcSpeed;
      void W;
    }
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, npc, scene } = this.arena;
    const { eKey, fKey, rKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Click: tap-vs-hold detection
    const clickDown = pointer.leftButtonDown();
    const clickJustDown = clickDown && !this.lightSpearClickArmed && !this.lightSpearHolding;
    if (clickJustDown) {
      this.lightSpearClickArmed = true;
      this.lightSpearPointerDownX = mouseX;
      this.lightSpearPointerDownY = mouseY;
      this.lightSpearHoldStart = time;
    }

    if (this.lightSpearClickArmed && clickDown) {
      const heldMs = time - this.lightSpearHoldStart;
      if (heldMs >= 150 && !this.lightSpearHolding) {
        this.lightSpearHolding = true;
        if (this.lightSpearSprite) this.lightSpearSprite.destroy();
        this.lightSpearSprite = scene.add.rectangle(0, 0, 60, 10, 0xfff4a8).setDepth(10).setStrokeStyle(1, 0xffffff);
      }
    }

    if (!clickDown && this.lightSpearClickArmed) {
      const heldMs = time - this.lightSpearHoldStart;
      if (heldMs < 150) {
        player.castAbility('light-stab', playerCtx);
        const dist = Phaser.Math.Distance.Between(mouseX, mouseY, npc.x, npc.y);
        if (dist < 50) {
          this.lightMarkedExpiry = time + 2000;
          this.arena.showFloatingText(npc.x, npc.y - 20, '✨ HIGHLIGHTED', '#fff4a8');
        }
      }
      this.lightSpearClickArmed = false;
      this.lightSpearHolding = false;
      this.lightSkewerTargetHooked = false;
      if (this.lightSpearSprite) { this.lightSpearSprite.destroy(); this.lightSpearSprite = null; }
    }

    // E: Photosynthespark
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (player.castAbility('photo-spark', playerCtx)) {
        this.lightPhotoSlowUntil = 0;
        this.lightPhotoAccelStart = time;
        this.lightPhotoAccelUntil = time + 5000;
        this.lightPhotoStillSince = time;
        this.lightPhotoRegenAccum = 0;
        this.arena.showFloatingText(player.x, player.y - 30, '🌞 PHOTOSYNTHESPARK', '#fff4a8');
      }
    }

    // R: Photon Orbs
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      if (this.lightPhotonOrbs.length > 0) {
        const orb = this.lightPhotonOrbs.pop()!;
        orb.sprite.destroy();
        this.lightPhotonSpeedBoostUntil = time + 1500;
        this.arena.showFloatingText(player.x, player.y - 20, '✨ SPEED BURST', '#fff4a8');
        if (this.lightPhotonOrbs.length === 0) this.lightPhotonCdStartedAt = time;
      } else if (time - this.lightPhotonCdStartedAt >= 20000 || this.lightPhotonCdStartedAt < -1000) {
        if (player.castAbility('photon-orbs', playerCtx)) {
          for (let i = 0; i < 2; i++) {
            const sprite = scene.add.circle(player.x, player.y, 9, 0xfff4a8, 0.9).setDepth(8).setStrokeStyle(1, 0xffffff);
            this.lightPhotonOrbs.push({ sprite, orbitAngle: i * Math.PI });
          }
          this.arena.showFloatingText(player.x, player.y - 30, '✨ PHOTON ORBS', '#fff4a8');
        }
      }
    }

    // F: Skewer mode
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (player.castAbility('skewer', playerCtx)) {
        this.lightSkewerModeUntil = time + 5000;
        this.lightSkewerTargetHooked = false;
        this.lightSkewerInitialDealt = false;
        this.arena.showFloatingText(player.x, player.y - 30, '🗡 SKEWER MODE', '#fff4a8');
      }
    }

    // Q: Prayer
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (!this.lightAngelActive && player.castAbility('prayer', playerCtx)) {
        const angelSprite = scene.add.circle(player.x, player.y, 14, 0xfff4a8, 0.9).setDepth(8).setStrokeStyle(2, 0xffffff);
        this.lightAngelSprite = angelSprite;
        this.lightAngelLink = scene.add.graphics().setDepth(5);
        this.lightAngelActive = true;
        this.lightAngelUntil = time + 8000;
        this.lightAngelOrbitAngle = 0;
        this.lightAngelBladeAccum = 0;
        player.incomingDamageMultiplier *= 0.75;
        this.arena.showFloatingText(player.x, player.y - 30, '😇 PRAYER', '#fff4a8');
      }
    }

    void mouseX; void mouseY;
  }
}
