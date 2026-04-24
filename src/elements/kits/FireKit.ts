import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── FireArenaApi ──────────────────────────────────────────────────────────

export interface FireArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  spawnFlamethrowerCone(px: number, py: number, tx: number, ty: number): void;
  damagePlayerTargets(cx: number, cy: number, radius: number, damage: number, color: number): void;
}

// ── FireKit ───────────────────────────────────────────────────────────────

export class FireKit {
  // ── Player state ─────────────────────────────────────────────────────
  private flameBodyActive = false;
  private flameBodyTickAccum = 0;
  private flameBodyAura: Phaser.GameObjects.Arc | null = null;
  private flamethrowerHoldMs = 0;
  private flamethrowerTickAccum = 0;
  private enhancedFlameBody = false;
  private flameChargeWaiting = false;
  private flameChargeWaitingSince = 0;
  private flameChargeWaitVisual: Phaser.GameObjects.Arc | null = null;
  private flameChargePending: { x: number; y: number; fireAt: number; visual: Phaser.GameObjects.Arc } | null = null;
  private playerLastMovedAt = 0;
  private pressureCharging = false;
  private pressureChargeStart = 0;
  private pressureChargeVisual: Phaser.GameObjects.Arc | null = null;
  private pressureTremorAccum = 0;
  private pressureLastMouseX = 0;
  private pressureLastMouseY = 0;
  private firePointerWasDown = false;

  // ── NPC state ─────────────────────────────────────────────────────────
  private npcFlameBodyActive = false;
  private npcFlameBodyTickAccum = 0;
  private npcFlameBodyAura: Phaser.GameObjects.Arc | null = null;
  private npcEnhancedFlameBody = false;

  // ── Candle perk: golem minions (player + NPC) ─────────────────────────
  private candleGolems: Array<{
    sprite: Phaser.GameObjects.Image;
    hp: number;
    x: number; y: number;
    vx: number; vy: number;
    meltAt: number;
    owner: 'player' | 'npc';
    ignited: 'none' | 'click' | 'q';
    aoeAccum: number;
    ignitedAura: Phaser.GameObjects.Arc | null;
  }> = [];

  constructor(private arena: FireArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  isPressureCharging(): boolean { return this.pressureCharging; }
  isFlameBodyActive(): boolean { return this.flameBodyActive; }
  isEnhancedFlameBody(): boolean { return this.enhancedFlameBody; }
  isNpcFlameBodyActive(): boolean { return this.npcFlameBodyActive; }
  getCandleGolems() { return this.candleGolems; }

  reset(): void {
    // Player
    this.flameBodyActive = false;
    this.flameBodyTickAccum = 0;
    if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
    this.flamethrowerHoldMs = 0;
    this.flamethrowerTickAccum = 0;
    this.enhancedFlameBody = false;
    this.flameChargeWaiting = false;
    this.flameChargeWaitingSince = 0;
    if (this.flameChargeWaitVisual) { this.flameChargeWaitVisual.destroy(); this.flameChargeWaitVisual = null; }
    this.flameChargePending = null;
    this.playerLastMovedAt = 0;
    this.pressureCharging = false;
    this.pressureChargeStart = 0;
    if (this.pressureChargeVisual) { this.pressureChargeVisual.destroy(); this.pressureChargeVisual = null; }
    this.pressureTremorAccum = 0;
    this.pressureLastMouseX = 0;
    this.pressureLastMouseY = 0;
    this.firePointerWasDown = false;

    // NPC
    this.npcFlameBodyActive = false;
    this.npcFlameBodyTickAccum = 0;
    if (this.npcFlameBodyAura) { this.npcFlameBodyAura.destroy(); this.npcFlameBodyAura = null; }
    this.npcEnhancedFlameBody = false;

    // Candle golems
    this.candleGolems.forEach((g) => { g.sprite.destroy(); g.ignitedAura?.destroy(); });
    this.candleGolems = [];
  }

  update(time: number, delta: number, isPlayerFire: boolean, _isNpcFire: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerFire) {
      // Flame body ticks (self-damage every 250ms)
      if (this.flameBodyActive) {
        this.flameBodyTickAccum += delta;
        if (this.flameBodyTickAccum >= 250) {
          this.flameBodyTickAccum -= 250;
          const fbDmg = this.enhancedFlameBody ? 4 : 2;
          player.applySelfDamage(fbDmg);
        }
        if (this.flameBodyAura) this.flameBodyAura.setPosition(player.x, player.y);
      }

      // Flame charge: track movement for standstill detection
      const playerVel = player.body as Phaser.Physics.Arcade.Body;
      if (Math.abs(playerVel.velocity.x) > 1 || Math.abs(playerVel.velocity.y) > 1) {
        this.playerLastMovedAt = time;
      }

      // Waiting for standstill to commit charge location
      if (this.flameChargeWaiting) {
        if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.setPosition(player.x, player.y);
        const stillFor = time - this.playerLastMovedAt;
        if (stillFor >= 500) {
          this.flameChargeWaiting = false;
          if (this.flameChargeWaitVisual) { this.flameChargeWaitVisual.destroy(); this.flameChargeWaitVisual = null; }
          const cx = player.x, cy = player.y;
          const fuseVis = scene.add.circle(cx, cy, 14, 0xff4400, 0.8).setDepth(7);
          scene.tweens.add({ targets: fuseVis, alpha: 0.2, yoyo: true, repeat: -1, duration: 250 });
          this.flameChargePending = { x: cx, y: cy, fireAt: time + 3000, visual: fuseVis };
        }
      }

      // Fuse detonation
      if (this.flameChargePending && time >= this.flameChargePending.fireAt) {
        const { x: fx, y: fy, visual } = this.flameChargePending;
        this.flameChargePending = null;
        visual.destroy();
        const radius = 220;
        this.arena.damagePlayerTargets(fx, fy, radius, 80, 0xff4400);
        if (Phaser.Math.Distance.Between(fx, fy, player.x, player.y) <= radius) {
          player.applySelfDamage(80);
          this.arena.showFloatingText(player.x, player.y - 28, '🔥 Self-Dmg!', '#ff4400');
        }
        const boom = scene.add.circle(fx, fy, 12, 0xff4400, 0.9).setDepth(5);
        scene.tweens.add({ targets: boom, scaleX: 22, scaleY: 22, alpha: 0, duration: 700, onComplete: () => boom.destroy() });
        const boomCore = scene.add.circle(fx, fy, 8, 0xffffff, 1).setDepth(6);
        scene.tweens.add({ targets: boomCore, scaleX: 9, scaleY: 9, alpha: 0, duration: 320, onComplete: () => boomCore.destroy() });
        this.arena.showFloatingText(fx, fy - 28, '💥 Flame Charge!', '#ff6600');
      }

      // Charge ratio (shows enhanced flame body status when not pressure-charging)
      if (!this.pressureCharging) {
        player.chargeRatio = this.enhancedFlameBody ? 1 : 0;
      }
    }

    // NPC flame body tick (runs whenever NPC is fire regardless of player element)
    if (this.npcFlameBodyActive) {
      this.npcFlameBodyTickAccum += delta;
      if (this.npcFlameBodyTickAccum >= 250) this.npcFlameBodyTickAccum -= 250;
      if (this.npcFlameBodyAura) this.npcFlameBodyAura.setPosition(npc.x, npc.y);
    }
  }

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, scene, eKey, fKey, rKey, qKey, nukeChanneling } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    if (!nukeChanneling) {
      // ── Click: Fireball / Flamethrower ────────────────────────────
      if (pointer.isDown) {
        const justPressed = !this.firePointerWasDown;
        this.flamethrowerHoldMs += delta;
        if (justPressed) {
          player.castAbility('fireball', playerCtx);
        } else if (this.flamethrowerHoldMs > 120) {
          this.flamethrowerTickAccum += delta;
          if (this.flamethrowerTickAccum >= 100) {
            this.flamethrowerTickAccum -= 100;
            const dirX = mouseX - player.x;
            const dirY = mouseY - player.y;
            const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
            for (const t of this.arena.enemies) {
              if (!t.active || t.hp <= 0) continue;
              const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
              if (dist <= 180) {
                const dot = (dirX / dirLen) * ((t.x - player.x) / dist)
                          + (dirY / dirLen) * ((t.y - player.y) / dist);
                if (dot > 0.866) {
                  const ftDmg = this.enhancedFlameBody ? 8 : 4;
                  t.takeDamage(ftDmg);
                  this.arena.spawnHitFlash(t.x, t.y, 0xff5500);
                  if (this.arena.hasUpgrade('click')) {
                    t.burningUntil = Math.max(t.burningUntil, time + 3000);
                  }
                }
              }
            }
            this.arena.spawnFlamethrowerCone(player.x, player.y, mouseX, mouseY);
          }
        }
      } else {
        this.flamethrowerHoldMs = 0;
        this.flamethrowerTickAccum = 0;
      }

      // ── E: Flame Dash (+ Propulsion upgrade / Candle perk) ────────
      if (Phaser.Input.Keyboard.JustDown(eKey)) {
        const dashStartX = player.x;
        const dashStartY = player.y;
        if (this.arena.hasPerk('player', 'candle')) {
          if (player.getCooldownRatio('flame-dash') >= 1) {
            player.castAbility('flame-dash', playerCtx);
            const golemCount = this.arena.hasUpgrade('e') ? 2 : 1;
            const ownedGolems = this.candleGolems.filter((g) => g.owner === 'player');
            for (let gi = 0; gi < golemCount; gi++) {
              while (ownedGolems.length >= golemCount) {
                const oldest = ownedGolems.shift()!;
                oldest.sprite.destroy();
                if (oldest.ignitedAura) oldest.ignitedAura.destroy();
                const idx = this.candleGolems.indexOf(oldest);
                if (idx >= 0) this.candleGolems.splice(idx, 1);
              }
              const jx = dashStartX + Phaser.Math.Between(-20, 20);
              const jy = dashStartY + Phaser.Math.Between(-20, 20);
              const gspr = scene.add.image(jx, jy, 'perk-golem').setDepth(6).setScale(1.2);
              this.candleGolems.push({ sprite: gspr, hp: 25, x: jx, y: jy, vx: 0, vy: 0, meltAt: scene.time.now + 8000, owner: 'player', ignited: 'none', aoeAccum: 0, ignitedAura: null });
              this.arena.showFloatingText(jx, jy - 20, '🕯️ GOLEM', '#ffaa55');
              ownedGolems.push(this.candleGolems[this.candleGolems.length - 1]);
            }
          }
        } else if (player.castAbility('flame-dash', playerCtx) && this.arena.hasUpgrade('e')) {
          // Propulsion: spawn 4 explosions sampled during the 280ms dash
          for (let i = 1; i <= 4; i++) {
            scene.time.delayedCall(i * 70, () => {
              if (!player.active) return;
              const t = i / 4;
              const ex = dashStartX + (player.x - dashStartX) * t;
              const ey = dashStartY + (player.y - dashStartY) * t;
              for (const enemy of this.arena.enemies) {
                if (!enemy.active || enemy.hp <= 0) continue;
                if (Phaser.Math.Distance.Between(ex, ey, enemy.x, enemy.y) <= 50) {
                  enemy.takeDamage(Phaser.Math.Between(5, 8));
                  this.arena.spawnHitFlash(enemy.x, enemy.y, 0xff6600);
                }
              }
              const ring = scene.add.circle(ex, ey, 8, 0xff6600, 0.8).setDepth(4);
              scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
            });
          }
        }
      }

      // ── R: Pressure Bomb / Pressure Charge upgrade ────────────────
      if (this.arena.hasUpgrade('r')) {
        if (rKey.isDown) {
          if (!this.pressureCharging && player.getCooldownRatio('pressure-bomb') >= 1) {
            this.pressureCharging = true;
            this.pressureChargeStart = time;
            this.pressureTremorAccum = 0;
            player.incomingDamageMultiplier = 1.5;
            const cv = scene.add.circle(player.x, player.y, 12, 0xff8800, 0.6).setDepth(4);
            scene.tweens.add({ targets: cv, scaleX: 0.5, scaleY: 0.5, yoyo: true, repeat: -1, duration: 300 });
            this.pressureChargeVisual = cv;
          }
          if (this.pressureCharging) {
            if (this.pressureChargeVisual) this.pressureChargeVisual.setPosition(player.x, player.y);
            this.pressureLastMouseX = mouseX;
            this.pressureLastMouseY = mouseY;
            const heldMs = time - this.pressureChargeStart;
            const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
            player.chargeRatio = Math.min(1, heldMs / 6000);
            if (chargeLevel >= 1) {
              this.pressureTremorAccum += delta;
              if (this.pressureTremorAccum >= 1000) {
                this.pressureTremorAccum -= 1000;
                const tremorDmg = chargeLevel === 2 ? 10 : 5;
                for (const t of this.arena.enemies) {
                  if (!t.active || t.hp <= 0) continue;
                  if (Phaser.Math.Distance.Between(mouseX, mouseY, t.x, t.y) <= 60) {
                    t.takeDamage(tremorDmg);
                    this.arena.spawnHitFlash(t.x, t.y, 0xff6600);
                  }
                }
                const tremor = scene.add.circle(mouseX, mouseY, 8, 0xff6600, 0.75).setDepth(4);
                scene.tweens.add({ targets: tremor, scaleX: 5, scaleY: 5, alpha: 0, duration: 350, onComplete: () => tremor.destroy() });
              }
            } else {
              this.pressureTremorAccum = 0;
            }
          }
        } else if (this.pressureCharging) {
          // Released — fire the charged bomb
          this.pressureCharging = false;
          player.chargeRatio = 0;
          player.incomingDamageMultiplier = 1;
          if (this.pressureChargeVisual) { this.pressureChargeVisual.destroy(); this.pressureChargeVisual = null; }
          const heldMs = time - this.pressureChargeStart;
          const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
          const dmgMult = chargeLevel === 2 ? 2 : chargeLevel === 1 ? 1.5 : 1;
          const finalDmg = Math.round(32 * dmgMult);
          const mx = this.pressureLastMouseX;
          const my = this.pressureLastMouseY;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(mx, my, t.x, t.y) <= 100) {
              t.takeDamage(finalDmg);
              this.arena.spawnHitFlash(t.x, t.y, 0xff8800);
            }
          }
          // Candle perk: ignite golems in blast radius
          if (this.arena.hasPerk('player', 'candle')) {
            for (const golem of this.candleGolems) {
              if (golem.owner !== 'player' || golem.ignited !== 'none') continue;
              if (Phaser.Math.Distance.Between(mx, my, golem.x, golem.y) <= 120) {
                golem.ignited = 'q';
                golem.sprite.setTint(0xff2200);
                this.arena.showFloatingText(golem.x, golem.y - 20, '💥 IGNITED!', '#ff2200');
                if (golem.ignitedAura) golem.ignitedAura.destroy();
                golem.ignitedAura = scene.add.circle(golem.x, golem.y, 30, 0xff2200, 0.35).setDepth(5);
                scene.tweens.add({ targets: golem.ignitedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
              }
            }
          }
          const ring = scene.add.circle(mx, my, 10, 0xff8800, 0.9).setDepth(4);
          scene.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
          const core = scene.add.circle(mx, my, 6, 0xffffff, 0.95).setDepth(5);
          scene.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
          player.triggerCooldown('pressure-bomb');
        }
      } else {
        if (Phaser.Input.Keyboard.JustDown(rKey)) {
          if (player.castAbility('pressure-bomb', playerCtx) && this.arena.hasPerk('player', 'candle')) {
            for (const golem of this.candleGolems) {
              if (golem.owner !== 'player' || golem.ignited !== 'none') continue;
              if (Phaser.Math.Distance.Between(mouseX, mouseY, golem.x, golem.y) <= 120) {
                golem.ignited = 'q';
                golem.sprite.setTint(0xff2200);
                this.arena.showFloatingText(golem.x, golem.y - 20, '💥 IGNITED!', '#ff2200');
                if (golem.ignitedAura) golem.ignitedAura.destroy();
                golem.ignitedAura = scene.add.circle(golem.x, golem.y, 30, 0xff2200, 0.35).setDepth(5);
                scene.tweens.add({ targets: golem.ignitedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
              }
            }
          }
        }
      }

      // ── F: Flame Body / Flame Affinity upgrade ────────────────────
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        if (this.arena.hasUpgrade('f')) {
          // Flame Affinity: toggle with enhanced effects
          this.flameBodyActive = !this.flameBodyActive;
          this.enhancedFlameBody = this.flameBodyActive;
          this.flameBodyTickAccum = 0;
          if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
          if (this.flameBodyActive) {
            this.flameBodyAura = scene.add.circle(player.x, player.y, 40, 0xff2200, 0.4).setDepth(3);
          }
        } else {
          // Base: original toggle
          this.flameBodyActive = !this.flameBodyActive;
          this.enhancedFlameBody = false;
          this.flameBodyTickAccum = 0;
          if (this.flameBodyActive) {
            this.flameBodyAura = scene.add.circle(player.x, player.y, 30, 0xff6600, 0.25).setDepth(3);
          } else {
            if (this.flameBodyAura) { this.flameBodyAura.destroy(); this.flameBodyAura = null; }
          }
        }
      }

      // ── Q: Flame Nuke / Flame Charge upgrade ──────────────────────
      if (Phaser.Input.Keyboard.JustDown(qKey)) {
        if (this.arena.hasUpgrade('q') && (this.flameBodyActive || this.enhancedFlameBody) && player.getCooldownRatio('flame-nuke') >= 1) {
          if (!this.flameChargeWaiting && !this.flameChargePending) {
            this.flameChargeWaiting = true;
            this.playerLastMovedAt = time;
            player.triggerCooldown('flame-nuke');
            if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.destroy();
            this.flameChargeWaitVisual = scene.add.circle(player.x, player.y, 20, 0xff8800, 0.5).setDepth(6);
            scene.tweens.add({ targets: this.flameChargeWaitVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 200 });
            this.arena.showFloatingText(player.x, player.y - 28, '🔥 Stand still...', '#ff8800');
          }
        } else if (!this.arena.hasUpgrade('q') || !(this.flameBodyActive || this.enhancedFlameBody)) {
          player.castAbility('flame-nuke', this.arena.buildPlayerContext(player.x, player.y));
        }
      }
    }

    this.firePointerWasDown = pointer.isDown;
  }

  handleNpcCastId(npcCastId: string | null, time: number): void {
    const { npc, scene } = this.arena;

    // Candle perk: NPC flame-dash spawns a golem
    if (npcCastId === 'flame-dash' && this.arena.hasPerk('npc', 'candle')) {
      const npcGolems = this.candleGolems.filter((g) => g.owner === 'npc');
      const maxGolems = 1;
      while (npcGolems.length >= maxGolems) {
        const oldest = npcGolems.shift()!;
        oldest.sprite.destroy();
        if (oldest.ignitedAura) oldest.ignitedAura.destroy();
        const idx = this.candleGolems.indexOf(oldest);
        if (idx >= 0) this.candleGolems.splice(idx, 1);
      }
      const gspr = scene.add.image(npc.x, npc.y, 'perk-golem').setDepth(6).setScale(1.2);
      this.candleGolems.push({ sprite: gspr, hp: 25, x: npc.x, y: npc.y, vx: 0, vy: 0, meltAt: time + 8000, owner: 'npc', ignited: 'none', aoeAccum: 0, ignitedAura: null });
      this.arena.showFloatingText(npc.x, npc.y - 20, '🕯️ GOLEM', '#ffaa55');
    }

    // Flame body toggle for NPC
    if (npcCastId === 'flame-body') {
      this.npcFlameBodyActive = !this.npcFlameBodyActive;
      this.npcFlameBodyTickAccum = 0;
      if (this.npcFlameBodyActive) {
        this.npcFlameBodyAura = scene.add.circle(npc.x, npc.y, 30, 0xff6600, 0.25).setDepth(3);
      } else {
        if (this.npcFlameBodyAura) { this.npcFlameBodyAura.destroy(); this.npcFlameBodyAura = null; }
      }
    }

    void time;
  }
}
