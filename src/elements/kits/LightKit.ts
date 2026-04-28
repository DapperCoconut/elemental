import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

// ── LightArenaApi ─────────────────────────────────────────────────────────

export interface LightArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly npcCastId: string | null;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  hasPerk(perkId: string): boolean;
  applyNpcSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  getNearestEnemy(x: number, y: number): Fighter;
}

// ── LightKit ──────────────────────────────────────────────────────────────

export class LightKit {
  // ── Player state ─────────────────────────────────────────────────────
  private lightSpeedText: Phaser.GameObjects.Text | null = null;
  private lightDodgeText: Phaser.GameObjects.Text | null = null;
  private lightMarkedExpiry = 0;
  private lightMarkedTarget: Fighter | null = null;
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
  private lightEnemyOverstim = new Map<Fighter, { until: number; tickAccum: number }>();
  private lightSkewerModeUntil = 0;
  private lightSkewerTargetHooked = false;
  private lightSkewerTarget: Fighter | null = null;
  private lightSkewerInitialDealt = false;
  private lightAngelActive = false;
  private lightAngelIsFallen = false;
  private lightAngelUntil = 0;
  private lightAngelSprite: Phaser.GameObjects.Arc | null = null;
  private lightAngelOrbitAngle = 0;
  private lightAngelBladeAccum = 0;
  private lightAngelLink: Phaser.GameObjects.Graphics | null = null;
  private lightDisarmClickCooldown = 0;
  private lightBackstabDashing = false;
  private lightBackstabUntil = 0;
  private lightBackstabVx = 0;
  private lightBackstabVy = 0;
  private lightShadowTrail: Array<{ sprite: Phaser.GameObjects.Arc; until: number }> = [];
  private lightShadowTrailAccum = 0;
  private lightDisarmIndicators: Map<Fighter, Phaser.GameObjects.Text> = new Map();
  private lightFallenAngelDaggerAccum = 0;
  private lightAllUpgradesTextureSwapped = false;

  // ── Flicker perk state ────────────────────────────────────────────────
  private flickerSpearActive = false;
  private flickerSpearX = 0;
  private flickerSpearY = 0;
  private flickerSpearVx = 0;
  private flickerSpearVy = 0;
  private flickerSpearAngle = 0;
  private flickerSpearStuck = false;
  private flickerSpearStuckAt = 0;
  private flickerSpearHitEnemies: Set<Fighter> = new Set();
  private flickerSpearPullDealt = false;

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

  // ── Public accessors ──────────────────────────────────────────────────

  getPhotoAccelUntil(): number { return this.lightPhotoAccelUntil; }
  getPhotoAccelStart(): number { return this.lightPhotoAccelStart; }
  getPhotonSpeedBoostUntil(): number { return this.lightPhotonSpeedBoostUntil; }
  setPhotonSpeedBoostUntil(v: number): void { this.lightPhotonSpeedBoostUntil = v; }
  setPhotoAccelUntil(v: number): void { this.lightPhotoAccelUntil = v; }
  isAngelActive(): boolean { return this.lightAngelActive; }
  getSkewerModeUntil(): number { return this.lightSkewerModeUntil; }
  getAngelSpeedMult(): number {
    if (!this.lightAngelActive) return 1;
    return this.lightAngelIsFallen ? 1.15 : 1.25;
  }

  getNpcPhotoAccelUntil(): number { return this.npcLightPhotoAccelUntil; }
  setNpcPhotoAccelUntil(v: number): void { this.npcLightPhotoAccelUntil = v; }
  getNpcPhotonSpeedBoostUntil(): number { return this.npcLightPhotonSpeedBoostUntil; }
  setNpcPhotonSpeedBoostUntil(v: number): void { this.npcLightPhotonSpeedBoostUntil = v; }
  getNpcPhotoSlowUntil(): number { return this.npcLightPhotoSlowUntil; }
  setNpcPhotoSlowUntil(v: number): void { this.npcLightPhotoSlowUntil = v; }

  reset(): void {
    if (this.lightSpeedText) { this.lightSpeedText.destroy(); this.lightSpeedText = null; }
    if (this.lightDodgeText) { this.lightDodgeText.destroy(); this.lightDodgeText = null; }
    this.lightMarkedExpiry = 0;
    this.lightMarkedTarget = null;
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
    this.lightEnemyOverstim.clear();
    this.lightSkewerModeUntil = 0;
    this.lightSkewerTargetHooked = false;
    this.lightSkewerTarget = null;
    this.lightSkewerInitialDealt = false;
    this.lightAngelActive = false;
    this.lightAngelIsFallen = false;
    this.lightAngelUntil = 0;
    if (this.lightAngelSprite) { this.lightAngelSprite.destroy(); this.lightAngelSprite = null; }
    this.lightAngelOrbitAngle = 0;
    this.lightAngelBladeAccum = 0;
    if (this.lightAngelLink) { this.lightAngelLink.destroy(); this.lightAngelLink = null; }
    this.lightDisarmClickCooldown = 0;
    this.lightBackstabDashing = false;
    this.lightBackstabUntil = 0;
    this.lightBackstabVx = 0;
    this.lightBackstabVy = 0;
    this.lightShadowTrail.forEach((t) => t.sprite.destroy());
    this.lightShadowTrail = [];
    this.lightShadowTrailAccum = 0;
    this.lightDisarmIndicators.forEach((t) => t.destroy());
    this.lightDisarmIndicators.clear();
    this.lightFallenAngelDaggerAccum = 0;
    this.lightAllUpgradesTextureSwapped = false;

    // Flicker perk
    this.flickerSpearActive = false;
    this.flickerSpearX = 0;
    this.flickerSpearY = 0;
    this.flickerSpearVx = 0;
    this.flickerSpearVy = 0;
    this.flickerSpearAngle = 0;
    this.flickerSpearStuck = false;
    this.flickerSpearStuckAt = 0;
    this.flickerSpearHitEnemies = new Set();
    this.flickerSpearPullDealt = false;

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
      const hasClickUp = this.arena.hasUpgrade('click');
      const hasEUp = this.arena.hasUpgrade('e');
      const hasRUp = this.arena.hasUpgrade('r');
      const hasFUp = this.arena.hasUpgrade('f');
      const hasQUp = this.arena.hasUpgrade('q');
      const allUpgrades = hasClickUp && hasEUp && hasRUp && hasFUp && hasQUp;

      if (this.lightSpeedText) this.lightSpeedText.setText(`🏃 ${Math.round(speedMag)} px/s`);

      // All 5 upgrades owned → swap player texture to blue
      if (allUpgrades && !this.lightAllUpgradesTextureSwapped) {
        player.setTexture('elem-light-blue');
        this.lightAllUpgradesTextureSwapped = true;
      } else if (!allUpgrades && this.lightAllUpgradesTextureSwapped) {
        player.setTexture('elem-light');
        this.lightAllUpgradesTextureSwapped = false;
      }

      // Dodge chance display above player
      if (player.dodgeChance > 0) {
        if (!this.lightDodgeText) {
          this.lightDodgeText = scene.add.text(0, 0, '', { fontSize: '10px', color: '#88ddff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        }
        this.lightDodgeText.setText(`${Math.round(player.dodgeChance * 100)}% DODGE`);
        this.lightDodgeText.setPosition(player.x, player.y - 52);
      } else if (this.lightDodgeText) {
        this.lightDodgeText.destroy();
        this.lightDodgeText = null;
      }

      // Shadow trail cosmetic (all 5 upgrades)
      if (allUpgrades) {
        this.lightShadowTrailAccum += delta;
        if (this.lightShadowTrailAccum >= 80) {
          this.lightShadowTrailAccum = 0;
          const dot = scene.add.circle(player.x, player.y, 8, 0x000000, 0.4).setDepth(3);
          this.lightShadowTrail.push({ sprite: dot, until: time + 500 });
        }
      }
      for (let i = this.lightShadowTrail.length - 1; i >= 0; i--) {
        const t = this.lightShadowTrail[i];
        if (time >= t.until) {
          t.sprite.destroy();
          this.lightShadowTrail.splice(i, 1);
        } else {
          const alpha = 0.4 * (1 - (time - (t.until - 500)) / 500);
          t.sprite.setAlpha(Math.max(0, alpha));
        }
      }

      // Disarm indicators above enemies
      for (const enemy of this.arena.enemies) {
        const disarmed = enemy.active && enemy.disarmedUntil > time;
        const existing = this.lightDisarmIndicators.get(enemy);
        if (disarmed) {
          if (!existing) {
            const txt = scene.add.text(enemy.x, enemy.y - 38, '🚫', { fontSize: '14px' }).setOrigin(0.5).setDepth(12);
            this.lightDisarmIndicators.set(enemy, txt);
          } else {
            existing.setPosition(enemy.x, enemy.y - 38);
          }
        } else if (existing) {
          existing.destroy();
          this.lightDisarmIndicators.delete(enemy);
        }
      }

      // Backstab dash movement
      if (this.lightBackstabDashing && time < this.lightBackstabUntil) {
        playerBody.setVelocity(this.lightBackstabVx, this.lightBackstabVy);
      } else if (this.lightBackstabDashing) {
        this.lightBackstabDashing = false;
        playerBody.setVelocity(0, 0);
      }

      // Mark: target takes 15% more damage
      if (time < this.lightMarkedExpiry && this.lightMarkedTarget) {
        const mt = this.lightMarkedTarget;
        if (mt.active && mt.hp > 0) {
          mt.incomingDamageMultiplier = Math.max(mt.incomingDamageMultiplier, 1.15);
        } else {
          this.lightMarkedTarget = null;
          this.lightMarkedExpiry = 0;
        }
      } else if (this.lightMarkedTarget) {
        if (this.lightMarkedTarget.incomingDamageMultiplier === 1.15) this.lightMarkedTarget.incomingDamageMultiplier = 1;
        this.lightMarkedTarget = null;
      }

      // Photosynthespark stand-still regen (only when not using E+ dodge)
      if (!hasEUp && time < this.lightPhotoAccelUntil) {
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

      // Angel DR buff (base angel only, not fallen angel)
      if (this.lightAngelActive && !this.lightAngelIsFallen) {
        player.incomingDamageMultiplier = Math.min(player.incomingDamageMultiplier, 0.75);
      }

      // Held spear: reposition + contact damage on all enemies
      if (this.lightSpearHolding && this.lightSpearSprite) {
        const ang = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
        const spearX = player.x + Math.cos(ang) * 36;
        const spearY = player.y + Math.sin(ang) * 36;
        this.lightSpearSprite.setPosition(spearX, spearY);
        this.lightSpearSprite.setRotation(ang);

        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(spearX, spearY, t.x, t.y);
          if (d < 30 && time >= this.lightSpearHitCooldown) {
            const dmg = hasClickUp
              ? 6 + Math.round(100 * player.dodgeChance)
              : 6 + Math.round(Math.hypot(playerBody.velocity.x, playerBody.velocity.y) / 15);
            t.takeDamage(dmg);
            this.arena.spawnHitFlash(t.x, t.y, 0xfff4a8);
            this.lightSpearHitCooldown = time + 300;
            // Click+ Disarm
            if (hasClickUp && time >= this.lightDisarmClickCooldown) {
              t.applyDisarm(1000);
              this.lightDisarmClickCooldown = time + 5000;
              this.arena.showFloatingText(t.x, t.y - 28, '🚫 DISARMED', '#88ddff');
            }
            if (!hasFUp && time < this.lightSkewerModeUntil && !this.lightSkewerTargetHooked) {
              this.lightSkewerTargetHooked = true;
              this.lightSkewerTarget = t;
              this.lightSkewerInitialDealt = false;
              this.arena.showFloatingText(t.x, t.y - 20, '🗡 SKEWERED', '#fff4a8');
            }
            break;
          }
        }
      } else if (this.lightSkewerTargetHooked) {
        this.lightSkewerTargetHooked = false;
        this.lightSkewerTarget = null;
      }

      // Skewer: drag target + wall slam (only when F+ not owned)
      if (!hasFUp && this.lightSkewerTargetHooked && this.lightSkewerTarget && time < this.lightSkewerModeUntil) {
        const skewerTarget = this.lightSkewerTarget;
        if (!skewerTarget.active || skewerTarget.hp <= 0) {
          this.lightSkewerTargetHooked = false;
          this.lightSkewerTarget = null;
        } else {
          const ang = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
          const tethX = player.x + Math.cos(ang) * 60;
          const tethY = player.y + Math.sin(ang) * 60;
          skewerTarget.setPosition(tethX, tethY);
          (skewerTarget.body as Phaser.Physics.Arcade.Body).reset(tethX, tethY);
          const margin = 32;
          const hitWall = tethX < margin || tethX > W - margin || tethY < margin || tethY > H - margin;
          if (hitWall) {
            const wallDmg = Math.min(150, 50 + Math.round(speedMag / 50));
            skewerTarget.takeDamage(wallDmg);
            this.arena.spawnHitFlash(skewerTarget.x, skewerTarget.y, 0xfff4a8);
            this.arena.showFloatingText(skewerTarget.x, skewerTarget.y - 20, `💥 WALL SLAM ${wallDmg}`, '#fff4a8');
            this.lightSkewerTargetHooked = false;
            this.lightSkewerTarget = null;
            this.lightSkewerModeUntil = 0;
          }
        }
      } else if (!hasFUp && time >= this.lightSkewerModeUntil && this.lightSkewerTargetHooked) {
        this.lightSkewerTargetHooked = false;
        this.lightSkewerTarget = null;
      }

      // Photon orbs orbit + contact
      const orbR = 44;
      for (let i = this.lightPhotonOrbs.length - 1; i >= 0; i--) {
        const orb = this.lightPhotonOrbs[i];
        orb.orbitAngle += delta * 0.003;
        const ang = orb.orbitAngle + i * Math.PI;
        orb.sprite.setPosition(player.x + Math.cos(ang) * orbR, player.y + Math.sin(ang) * orbR);
        let orbConsumed = false;
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, t.x, t.y);
          if (d < 22) {
            orb.sprite.destroy();
            this.lightPhotonOrbs.splice(i, 1);
            if (hasRUp) {
              // R+ contact: stun + disarm
              t.frozenUntil = Math.max(t.frozenUntil, time + 1500);
              t.applyDisarm(1500);
              this.arena.showFloatingText(t.x, t.y - 20, '🧊 STUN 1.5s', '#88ddff');
            } else {
              const existing = this.lightEnemyOverstim.get(t);
              this.lightEnemyOverstim.set(t, { until: time + 5000, tickAccum: existing?.tickAccum ?? 0 });
              this.arena.showFloatingText(t.x, t.y - 20, '✨ OVERSTIM', '#fff4a8');
            }
            if (this.lightPhotonOrbs.length === 0) this.lightPhotonCdStartedAt = time;
            orbConsumed = true;
            break;
          }
        }
        if (orbConsumed) continue;
      }

      // Overstim tick damage (per enemy, base R behavior)
      if (!hasRUp) {
        for (const [t, overstim] of this.lightEnemyOverstim) {
          if (!t.active || t.hp <= 0) { this.lightEnemyOverstim.delete(t); continue; }
          if (time < overstim.until) {
            overstim.tickAccum += delta;
            if (overstim.tickAccum >= 250) {
              overstim.tickAccum -= 250;
              const tBody = t.body as Phaser.Physics.Arcade.Body;
              const tSpeed = Math.hypot(tBody.velocity.x, tBody.velocity.y);
              let tickDmg = 0;
              if (tSpeed < 10) tickDmg = 0;
              else if (tSpeed < 150) tickDmg = 2;
              else if (tSpeed < 350) tickDmg = 4;
              else tickDmg = 6;
              if (tickDmg > 0) {
                t.takeDamage(tickDmg);
                this.arena.spawnHitFlash(t.x, t.y, 0xfff4a8);
              }
            }
          } else {
            this.lightEnemyOverstim.delete(t);
          }
        }
      }

      // Prayer / Fallen Angel orbit + blades
      if (this.lightAngelActive) {
        if (time >= this.lightAngelUntil) {
          if (this.lightAngelSprite) { this.lightAngelSprite.destroy(); this.lightAngelSprite = null; }
          if (this.lightAngelLink) { this.lightAngelLink.destroy(); this.lightAngelLink = null; }
          this.lightAngelActive = false;
          if (!this.lightAngelIsFallen) {
            player.incomingDamageMultiplier = Math.max(1, player.incomingDamageMultiplier / 0.75);
          } else {
            player.dodgeChance = Math.max(0, player.dodgeChance - 1.0);
          }
          this.lightAngelIsFallen = false;
        } else {
          this.lightAngelOrbitAngle += delta * 0.0015;
          const angelX = player.x + Math.cos(this.lightAngelOrbitAngle) * 80;
          const angelY = player.y + Math.sin(this.lightAngelOrbitAngle) * 80;
          if (this.lightAngelSprite) this.lightAngelSprite.setPosition(angelX, angelY);
          if (this.lightAngelLink) {
            this.lightAngelLink.clear();
            this.lightAngelLink.lineStyle(2, this.lightAngelIsFallen ? 0x9966cc : 0xfff4a8, 0.6);
            this.lightAngelLink.lineBetween(player.x, player.y, angelX, angelY);
          }
          if (time > this.lightMarkedExpiry - 1500) {
            if (!this.lightMarkedTarget || !this.lightMarkedTarget.active || this.lightMarkedTarget.hp <= 0) {
              this.lightMarkedTarget = this.arena.getNearestEnemy(player.x, player.y);
            }
            this.lightMarkedExpiry = time + 2500;
          }
          this.lightAngelBladeAccum += delta;
          if (this.lightAngelIsFallen) {
            // Fallen Angel: 3 daggers every 2s, disarm on hit
            if (this.lightFallenAngelDaggerAccum >= 2000) {
              this.lightFallenAngelDaggerAccum -= 2000;
              const nearest = this.arena.getNearestEnemy(angelX, angelY);
              if (nearest && nearest.active && nearest.hp > 0) {
                const baseAng = Math.atan2(nearest.y - angelY, nearest.x - angelX);
                for (let di = -1; di <= 1; di++) {
                  const dAng = baseAng + di * (Math.PI / 8);
                  const proj = new Projectile(scene, angelX, angelY, 'proj-holy-blade', 12, true);
                  this.arena.projectiles.add(proj);
                  proj.launch(Math.cos(dAng) * 400, Math.sin(dAng) * 400);
                  (proj as any).isFallenAngelDagger = true;
                }
              }
              this.arena.showFloatingText(angelX, angelY - 20, '🗡 DAGGERS', '#9966cc');
            }
            this.lightFallenAngelDaggerAccum += delta;
          } else {
            // Base angel: 8 blades every 3s
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
      }

      // ── Flicker spear flight / pull ──────────────────────────────────
      if (this.flickerSpearActive) {
        const dt = delta / 1000;
        const worldW = scene.scale.width;
        const worldH = scene.scale.height;

        if (!this.flickerSpearStuck) {
          // Move spear
          this.flickerSpearX += this.flickerSpearVx * dt;
          this.flickerSpearY += this.flickerSpearVy * dt;
          // Update sprite
          if (this.lightSpearSprite) {
            this.lightSpearSprite.x = this.flickerSpearX;
            this.lightSpearSprite.y = this.flickerSpearY;
            this.lightSpearSprite.rotation = this.flickerSpearAngle;
          }
          // Pierce enemies
          for (const enemy of this.arena.enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (this.flickerSpearHitEnemies.has(enemy)) continue;
            const dist = Phaser.Math.Distance.Between(this.flickerSpearX, this.flickerSpearY, enemy.x, enemy.y);
            if (dist < 20) {
              this.flickerSpearHitEnemies.add(enemy);
              enemy.takeDamage(10);
              // Mark the enemy (same as tap-click: 2s, +15% incoming damage)
              this.lightMarkedTarget = enemy;
              this.lightMarkedExpiry = Math.max(this.lightMarkedExpiry, time + 2000);
              this.arena.showFloatingText(enemy.x, enemy.y - 28, '✨ HIGHLIGHTED', '#fff4a8');
              this.arena.spawnHitFlash(enemy.x, enemy.y, 0xfff4a8);
            }
          }
          // Wall check
          if (this.flickerSpearX < 0 || this.flickerSpearX > worldW ||
              this.flickerSpearY < 0 || this.flickerSpearY > worldH) {
            this.flickerSpearX = Math.max(8, Math.min(worldW - 8, this.flickerSpearX));
            this.flickerSpearY = Math.max(8, Math.min(worldH - 8, this.flickerSpearY));
            this.flickerSpearStuck = true;
            this.flickerSpearStuckAt = time;
            this.flickerSpearVx = 0;
            this.flickerSpearVy = 0;
            if (this.lightSpearSprite) {
              this.lightSpearSprite.x = this.flickerSpearX;
              this.lightSpearSprite.y = this.flickerSpearY;
            }
          }
        } else {
          // Stuck — wait 1 second then pull player
          if (!this.flickerSpearPullDealt && time >= this.flickerSpearStuckAt + 1000) {
            this.flickerSpearPullDealt = true;
            const dx = this.flickerSpearX - player.x;
            const dy = this.flickerSpearY - player.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              const speed = 540;
              playerBody.setVelocity((dx / len) * speed, (dy / len) * speed);
              const travelMs = Math.min(700, (len / speed) * 1000);
              const stuckX = this.flickerSpearX;
              const stuckY = this.flickerSpearY;
              scene.time.delayedCall(travelMs, () => {
                if (player.active) playerBody.setVelocity(0, 0);
                const hasClickUp = this.arena.hasUpgrade('click');
                for (const enemy of this.arena.enemies) {
                  if (!enemy.active || enemy.hp <= 0) continue;
                  if (Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) < 40) {
                    const dmg = hasClickUp
                      ? 6 + Math.round(100 * player.dodgeChance)
                      : 6 + Math.round(Math.hypot(playerBody.velocity.x, playerBody.velocity.y) / 15);
                    enemy.takeDamage(Math.max(6, dmg));
                    this.arena.spawnHitFlash(enemy.x, enemy.y, 0xfff4a8);
                    this.arena.showFloatingText(enemy.x, enemy.y - 20, `💥 ${Math.max(6, dmg)}`, '#fff4a8');
                  }
                }
                void stuckX; void stuckY;
              });
            }
            // Destroy spear after pull completes
            scene.time.delayedCall(800, () => {
              this.lightSpearSprite?.destroy();
              this.lightSpearSprite = null;
              this.flickerSpearActive = false;
              this.flickerSpearStuck = false;
            });
          }
        }
      }

      void speedMag;
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
          const playerBody2 = player.body as Phaser.Physics.Arcade.Body;
          const pSpeed = Math.hypot(playerBody2.velocity.x, playerBody2.velocity.y);
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

      // Fallen angel dagger hit: apply disarm to player
      if (isNpcLight) {
        // (NPC doesn't use Fallen Angel — no upgrade branch for NPC)
      }

      void npcSpeed;
      void W; void H;
    }

    // Handle fallen angel dagger hits on enemies
    if (isPlayerLight) {
      // Dagger disarm: proj with isFallenAngelDagger flag — handled in ArenaScene's normal proj hit pipeline,
      // but we need to apply disarm when they hit. We tag the projectile; ArenaScene applyProjectileToNpc
      // will deal damage. The disarm is applied via the onFallenAngelDaggerHit helper below.
    }
  }

  /** Called by ArenaScene when a fallen angel dagger projectile hits an enemy — applies disarm. */
  onFallenAngelDaggerHit(enemy: Fighter, time: number): void {
    enemy.applyDisarm(1000);
    this.arena.showFloatingText(enemy.x, enemy.y - 20, '🚫 DISARMED', '#9966cc');
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, scene } = this.arena;
    const { eKey, fKey, rKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const hasClickUp = this.arena.hasUpgrade('click');
    const hasEUp = this.arena.hasUpgrade('e');
    const hasRUp = this.arena.hasUpgrade('r');
    const hasFUp = this.arena.hasUpgrade('f');
    const hasQUp = this.arena.hasUpgrade('q');

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
        const spearLen = hasClickUp ? 80 : 60;
        const spearColor = hasClickUp ? 0x66aaff : 0xfff4a8;
        this.lightSpearSprite = scene.add.rectangle(0, 0, spearLen, 10, spearColor).setDepth(10).setStrokeStyle(1, 0xffffff);
      }
    }

    if (!clickDown && this.lightSpearClickArmed) {
      const heldMs = time - this.lightSpearHoldStart;
      if (heldMs < 150) {
        player.castAbility('light-stab', playerCtx);
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(mouseX, mouseY, t.x, t.y);
          if (dist < 50) {
            this.lightMarkedTarget = t;
            this.lightMarkedExpiry = time + 2000;
            this.arena.showFloatingText(t.x, t.y - 20, '✨ HIGHLIGHTED', '#fff4a8');
            break;
          }
        }
      }
      // Release of held spear: Flicker perk launches it, otherwise despawn
      if (heldMs >= 150 && this.arena.hasPerk('flicker')) {
        const ang = Math.atan2(mouseY - player.y, mouseX - player.x);
        this.flickerSpearActive = true;
        this.flickerSpearX = this.lightSpearSprite?.x ?? player.x + Math.cos(ang) * 36;
        this.flickerSpearY = this.lightSpearSprite?.y ?? player.y + Math.sin(ang) * 36;
        this.flickerSpearVx = Math.cos(ang) * 700;
        this.flickerSpearVy = Math.sin(ang) * 700;
        this.flickerSpearAngle = ang;
        this.flickerSpearStuck = false;
        this.flickerSpearStuckAt = 0;
        this.flickerSpearHitEnemies = new Set();
        this.flickerSpearPullDealt = false;
        // Keep sprite alive — update() will drive it
      } else {
        if (this.lightSpearSprite) { this.lightSpearSprite.destroy(); this.lightSpearSprite = null; }
      }
      this.lightSpearClickArmed = false;
      this.lightSpearHolding = false;
      this.lightSkewerTargetHooked = false;
      this.lightSkewerTarget = null;
    }

    // E: Photosynthespark (or E+ Retinal Flash)
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (hasEUp) {
        // E+: instant +75% dodge chance
        if (player.castAbility('photo-spark', playerCtx)) {
          player.dodgeChance += 0.75;
          this.arena.showFloatingText(player.x, player.y - 30, '👁 +75% DODGE', '#88ddff');
        }
      } else {
        if (player.castAbility('photo-spark', playerCtx)) {
          this.lightPhotoSlowUntil = 0;
          this.lightPhotoAccelStart = time;
          this.lightPhotoAccelUntil = time + 5000;
          this.lightPhotoStillSince = time;
          this.lightPhotoRegenAccum = 0;
          this.arena.showFloatingText(player.x, player.y - 30, '🌞 PHOTOSYNTHESPARK', '#fff4a8');
        }
      }
    }

    // R: Photon Orbs (or R+ Infrared Photons)
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      const orbColor = hasRUp ? 0x3388ff : 0xfff4a8;
      const orbStroke = hasRUp ? 0x88ccff : 0xffffff;
      if (this.lightPhotonOrbs.length > 0) {
        const orb = this.lightPhotonOrbs.pop()!;
        orb.sprite.destroy();
        if (hasRUp) {
          // R+: consume = +50% dodge
          player.dodgeChance += 0.5;
          this.arena.showFloatingText(player.x, player.y - 20, '⚡ +50% DODGE', '#88ddff');
        } else {
          this.lightPhotonSpeedBoostUntil = time + 1500;
          this.arena.showFloatingText(player.x, player.y - 20, '✨ SPEED BURST', '#fff4a8');
        }
        if (this.lightPhotonOrbs.length === 0) this.lightPhotonCdStartedAt = time;
      } else if (time - this.lightPhotonCdStartedAt >= 20000 || this.lightPhotonCdStartedAt < -1000) {
        if (player.castAbility('photon-orbs', playerCtx)) {
          for (let i = 0; i < 2; i++) {
            const sprite = scene.add.circle(player.x, player.y, 9, orbColor, 0.9).setDepth(8).setStrokeStyle(1, orbStroke);
            this.lightPhotonOrbs.push({ sprite, orbitAngle: i * Math.PI });
          }
          const label = hasRUp ? '⚡ INFRARED PHOTONS' : '✨ PHOTON ORBS';
          this.arena.showFloatingText(player.x, player.y - 30, label, hasRUp ? '#88ddff' : '#fff4a8');
        }
      }
    }

    // F: Skewer mode (or F+ Backstab)
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (hasFUp) {
        // F+: Backstab or Dash
        if (player.castAbility('skewer', playerCtx)) {
          if (this.lightSpearHolding) {
            // Backstab: teleport behind nearest enemy
            const nearest = this.arena.getNearestEnemy(player.x, player.y);
            if (nearest && nearest.active && nearest.hp > 0) {
              const dx = nearest.x - player.x;
              const dy = nearest.y - player.y;
              const dist = Math.hypot(dx, dy) || 1;
              const behindX = nearest.x + (dx / dist) * 40;
              const behindY = nearest.y + (dy / dist) * 40;
              player.setPosition(behindX, behindY);
              playerBody.reset(behindX, behindY);
              nearest.frozenUntil = Math.max(nearest.frozenUntil, time + 150);
              const baseDmg = 6 + Math.round(100 * player.dodgeChance);
              const backstabDmg = baseDmg * 2;
              nearest.takeDamage(backstabDmg);
              this.arena.spawnHitFlash(nearest.x, nearest.y, 0xff88aa);
              player.dodgeChance = Math.max(0, player.dodgeChance - 0.2);
              this.arena.showFloatingText(nearest.x, nearest.y - 36, '🗡 BACKSTAB', '#ff4466');
            }
          } else {
            // Dash forward toward cursor
            const ang = Math.atan2(mouseY - player.y, mouseX - player.x);
            this.lightBackstabDashing = true;
            this.lightBackstabUntil = time + 150;
            this.lightBackstabVx = Math.cos(ang) * 1000;
            this.lightBackstabVy = Math.sin(ang) * 1000;
            this.arena.showFloatingText(player.x, player.y - 30, '⚡ DASH', '#88ddff');
          }
        }
      } else {
        // Base: Skewer mode
        if (player.castAbility('skewer', playerCtx)) {
          this.lightSkewerModeUntil = time + 5000;
          this.lightSkewerTargetHooked = false;
          this.lightSkewerTarget = null;
          this.lightSkewerInitialDealt = false;
          this.arena.showFloatingText(player.x, player.y - 30, '🗡 SKEWER MODE', '#fff4a8');
        }
      }
    }

    // Q: Prayer (or Q+ Fallen Angel)
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (!this.lightAngelActive) {
        if (hasQUp) {
          // Q+: Fallen Angel
          if (player.castAbility('prayer', playerCtx)) {
            const angelSprite = scene.add.circle(player.x, player.y, 28, 0x6644aa, 0.9).setDepth(8).setStrokeStyle(2, 0x4422aa);
            this.lightAngelSprite = angelSprite;
            this.lightAngelLink = scene.add.graphics().setDepth(5);
            this.lightAngelActive = true;
            this.lightAngelIsFallen = true;
            this.lightAngelUntil = time + 8000;
            this.lightAngelOrbitAngle = 0;
            this.lightAngelBladeAccum = 0;
            this.lightFallenAngelDaggerAccum = 0;
            player.dodgeChance += 1.0;
            this.arena.showFloatingText(player.x, player.y - 30, '👼 FALLEN ANGEL', '#9966cc');
          }
        } else {
          // Base: Prayer
          if (player.castAbility('prayer', playerCtx)) {
            const angelSprite = scene.add.circle(player.x, player.y, 14, 0xfff4a8, 0.9).setDepth(8).setStrokeStyle(2, 0xffffff);
            this.lightAngelSprite = angelSprite;
            this.lightAngelLink = scene.add.graphics().setDepth(5);
            this.lightAngelActive = true;
            this.lightAngelIsFallen = false;
            this.lightAngelUntil = time + 8000;
            this.lightAngelOrbitAngle = 0;
            this.lightAngelBladeAccum = 0;
            player.incomingDamageMultiplier *= 0.75;
            this.arena.showFloatingText(player.x, player.y - 30, '😇 PRAYER', '#fff4a8');
          }
        }
      }
    }

    void mouseX; void mouseY;
  }
}
