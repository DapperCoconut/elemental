import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

interface AlcoholPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number; y: number;
  radius: number;
  expiresAt: number;
  ignited: boolean;
  ignitedAura: Phaser.GameObjects.Arc | null;
  igniteTickAccum: number;
  owner: 'player' | 'npc';
  enemyTimeIn: Map<Fighter, number>;
}

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
  lockCaster(durationMs: number): void;
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

  // ── Alcohol perk state ────────────────────────────────────────────────
  private alcoholFlaskCount = 0;
  private alcoholFlaskVisual: Phaser.GameObjects.Text | null = null;
  private alcoholEHoldStart = 0;
  private alcoholEWasDown = false;
  private alcoholPuddles: AlcoholPuddle[] = [];
  private alcoholHeatAura: Phaser.GameObjects.Arc | null = null;
  private alcoholHeatAuraTickAccum = 0;
  private alcoholFlyingFlask: { sprite: Phaser.GameObjects.Arc; targetX: number; targetY: number; arriveAt: number } | null = null;

  constructor(private arena: FireArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  isPressureCharging(): boolean { return this.pressureCharging; }
  isFlameBodyActive(): boolean { return this.flameBodyActive; }
  isEnhancedFlameBody(): boolean { return this.enhancedFlameBody; }
  isNpcFlameBodyActive(): boolean { return this.npcFlameBodyActive; }
  getAlcoholPuddles(): AlcoholPuddle[] { return this.alcoholPuddles; }

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

    // Alcohol perk
    this.alcoholFlaskCount = 0;
    if (this.alcoholFlaskVisual) { this.alcoholFlaskVisual.destroy(); this.alcoholFlaskVisual = null; }
    this.alcoholEHoldStart = 0;
    this.alcoholEWasDown = false;
    for (const p of this.alcoholPuddles) { p.sprite.destroy(); p.ignitedAura?.destroy(); }
    this.alcoholPuddles = [];
    if (this.alcoholHeatAura) { this.alcoholHeatAura.destroy(); this.alcoholHeatAura = null; }
    this.alcoholHeatAuraTickAccum = 0;
    if (this.alcoholFlyingFlask) { this.alcoholFlyingFlask.sprite.destroy(); this.alcoholFlyingFlask = null; }
  }

  update(time: number, delta: number, isPlayerFire: boolean, _isNpcFire: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerFire) {
      // Flame body ticks (self-damage every 250ms — only for unupgraded base form, not in flame puddle)
      if (this.flameBodyActive) {
        if (!this.enhancedFlameBody && !this.isPlayerInFlamePuddle(time)) {
          this.flameBodyTickAccum += delta;
          if (this.flameBodyTickAccum >= 250) {
            this.flameBodyTickAccum -= 250;
            const intoxicated = player.intoxicatedUntil > time;
            player.applySelfDamage(intoxicated ? 4 : 2);
          }
        }
        if (this.flameBodyAura) this.flameBodyAura.setPosition(player.x, player.y);
      }

      // Waiting for 1s channel lock to expire, then commit charge location
      if (this.flameChargeWaiting) {
        if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.setPosition(player.x, player.y);
        if (time >= this.flameChargeWaitingSince + 1000) {
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

      // Alcohol perk updates
      if (this.arena.hasPerk('player', 'alcohol')) {
        this.updateAlcohol(time, delta, player, scene);
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
          if (this.arena.hasPerk('player', 'alcohol')) {
            this.igniteAlcoholPuddlesNear(mouseX, mouseY, 60, scene);
          }
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
                    t.burningUntil = Math.max(t.burningUntil, time + Math.round(3000 * t.statusDurMult));
                  }
                }
              }
            }
            this.arena.spawnFlamethrowerCone(player.x, player.y, mouseX, mouseY);
            if (this.arena.hasPerk('player', 'alcohol')) {
              this.igniteAlcoholPuddlesNear(mouseX, mouseY, 40, scene);
            }
          }
        }
      } else {
        this.flamethrowerHoldMs = 0;
        this.flamethrowerTickAccum = 0;
      }

      // ── E: Flame Dash / Drink Up! (Alcohol perk) ─────────────────
      const eJustDown = Phaser.Input.Keyboard.JustDown(eKey);
      const eJustUp = this.alcoholEWasDown && !eKey.isDown;

      if (this.arena.hasPerk('player', 'alcohol')) {
        if (eJustDown) this.alcoholEHoldStart = time;
        if (eJustUp && this.alcoholEHoldStart > 0) {
          const heldMs = time - this.alcoholEHoldStart;
          this.alcoholEHoldStart = 0;

          if (player.getCooldownRatio('flame-dash') >= 1) {
            player.triggerCooldown('flame-dash');

            if (this.alcoholFlaskCount === 0) {
              // No flask: pick up a new one
              this.alcoholFlaskCount = 1;
              this.arena.showFloatingText(player.x, player.y - 30, '🍺 Flask!', '#c97a3a');
            } else if (heldMs >= 250) {
              // Hold ≥250ms with flask: throw puddle
              this.alcoholFlaskCount = 0;
              this.throwAlcoholFlask(time, scene, player);
            } else {
              // Tap with flask: drink (consume flask)
              this.alcoholFlaskCount = 0;
              this.drinkAlcohol(time, player);
            }
          }
        }
      } else {
        if (eJustDown) {
          const dashStartX = player.x;
          const dashStartY = player.y;
          if (player.castAbility('flame-dash', playerCtx) && this.arena.hasUpgrade('e')) {
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
      }
      this.alcoholEWasDown = eKey.isDown;

      // ── R: Pressure Bomb / Pressure Charge upgrade ────────────────
      if (this.arena.hasUpgrade('r')) {
        if (rKey.isDown) {
          if (!this.pressureCharging && player.getCooldownRatio('pressure-bomb') >= 1) {
            this.pressureCharging = true;
            this.pressureChargeStart = time;
            this.pressureTremorAccum = 0;
            player.incomingDamageMultiplier = this.enhancedFlameBody ? 2 : 1.5;
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
          player.incomingDamageMultiplier = this.enhancedFlameBody ? 2 : 1;
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
          // Alcohol perk: ignite any alcohol puddles in blast radius
          if (this.arena.hasPerk('player', 'alcohol')) {
            this.igniteAlcoholPuddlesNear(mx, my, 120, scene);
          }
          const ring = scene.add.circle(mx, my, 10, 0xff8800, 0.9).setDepth(4);
          scene.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
          const core = scene.add.circle(mx, my, 6, 0xffffff, 0.95).setDepth(5);
          scene.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
          player.triggerCooldown('pressure-bomb');
          // Chaos Cluster (R+): 5 scattered explosions around the blast site
          if (this.arena.hasUpgrade('r')) {
            for (let i = 0; i < 5; i++) {
              scene.time.delayedCall(i * 500, () => {
                if (!player.active) return;
                const ang = Math.random() * Math.PI * 2;
                const dist = Math.random() * 150;
                const cx = mx + Math.cos(ang) * dist;
                const cy = my + Math.sin(ang) * dist;
                this.arena.damagePlayerTargets(cx, cy, 60, 5, 0xff8800);
                const ring = scene.add.circle(cx, cy, 12, 0xff8800, 0.85).setDepth(4);
                scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
                const core = scene.add.circle(cx, cy, 6, 0xffffff, 1).setDepth(5);
                scene.tweens.add({ targets: core, scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => core.destroy() });
              });
            }
          }
        }
      } else {
        if (Phaser.Input.Keyboard.JustDown(rKey)) {
          if (player.castAbility('pressure-bomb', playerCtx) && this.arena.hasPerk('player', 'alcohol')) {
            this.igniteAlcoholPuddlesNear(mouseX, mouseY, 120, scene);
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
          player.incomingDamageMultiplier = this.flameBodyActive ? 2 : 1;
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
            this.flameChargeWaitingSince = time;
            player.triggerCooldown('flame-nuke');
            this.arena.lockCaster(1000);
            if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.destroy();
            this.flameChargeWaitVisual = scene.add.circle(player.x, player.y, 20, 0xff8800, 0.5).setDepth(6);
            scene.tweens.add({ targets: this.flameChargeWaitVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 200 });
            this.arena.showFloatingText(player.x, player.y - 28, '🔥 Channeling...', '#ff8800');
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

  // ── Alcohol perk helpers ──────────────────────────────────────────────

  private drinkAlcohol(time: number, player: Fighter): void {
    if (player.intoxicatedUntil > time) {
      // Already intoxicated: reset timer, bank extra slowness
      player.intoxicatedUntil = time + 6000;
      player.intoxicationPendingSlowExtra += 2000;
      this.arena.showFloatingText(player.x, player.y - 30, '🍺 Another round...', '#c97a3a');
    } else {
      player.intoxicatedUntil = time + 6000;
      player.incomingDamageMultiplier = 0.75;
      this.arena.showFloatingText(player.x, player.y - 30, '🍺 Intoxicated!', '#c97a3a');
    }
  }

  private throwAlcoholFlask(time: number, scene: Phaser.Scene, player: Fighter): void {
    const angle = Math.atan2(
      (this.arena.npc.y - player.y),
      (this.arena.npc.x - player.x),
    );
    const dist = 167;
    const targetX = player.x + Math.cos(angle) * dist;
    const targetY = player.y + Math.sin(angle) * dist;
    const sprite = scene.add.circle(player.x, player.y, 7, 0xc97a3a, 0.9).setDepth(6);
    sprite.setStrokeStyle(2, 0xffcc88, 0.8);
    this.alcoholFlyingFlask = { sprite, targetX, targetY, arriveAt: time + 700 };
    scene.tweens.add({ targets: sprite, x: targetX, y: targetY, duration: 700, ease: 'Linear' });
    this.arena.showFloatingText(player.x, player.y - 30, '🍺 Thrown!', '#c97a3a');
  }

  private spawnAlcoholPuddle(time: number, x: number, y: number, owner: 'player' | 'npc', scene: Phaser.Scene): void {
    const sprite = scene.add.circle(x, y, 120, 0xc97a3a, 0.35).setDepth(2);
    sprite.setStrokeStyle(3, 0xffcc88, 0.5);
    this.alcoholPuddles.push({
      sprite, x, y, radius: 120,
      expiresAt: time + 6000,
      ignited: false,
      ignitedAura: null,
      igniteTickAccum: 0,
      owner,
      enemyTimeIn: new Map(),
    });
  }

  igniteAlcoholPuddlesNear(cx: number, cy: number, range: number, scene: Phaser.Scene): void {
    for (const p of this.alcoholPuddles) {
      if (p.ignited) continue;
      if (Phaser.Math.Distance.Between(cx, cy, p.x, p.y) <= range + p.radius) {
        p.ignited = true;
        p.sprite.setFillStyle(0xff4400, 0.4);
        p.sprite.setStrokeStyle(3, 0xff6600, 0.8);
        if (p.ignitedAura) p.ignitedAura.destroy();
        p.ignitedAura = scene.add.circle(p.x, p.y, p.radius * 0.9, 0xff4400, 0.2).setDepth(2);
        scene.tweens.add({ targets: p.ignitedAura, alpha: 0.05, yoyo: true, repeat: -1, duration: 400 });
      }
    }
  }

  private updateAlcohol(time: number, delta: number, player: Fighter, scene: Phaser.Scene): void {
    // Flask visual — shown while player holds a flask
    if (this.alcoholFlaskCount > 0) {
      if (!this.alcoholFlaskVisual) {
        this.alcoholFlaskVisual = scene.add.text(0, 0, '🍺', { fontSize: '18px' }).setDepth(9).setOrigin(0.5, 0.5);
      }
      this.alcoholFlaskVisual.setPosition(player.x + 18, player.y - 18);
    } else {
      if (this.alcoholFlaskVisual) { this.alcoholFlaskVisual.destroy(); this.alcoholFlaskVisual = null; }
    }

    // Flying flask landing
    if (this.alcoholFlyingFlask && time >= this.alcoholFlyingFlask.arriveAt) {
      const { targetX: tx, targetY: ty, sprite } = this.alcoholFlyingFlask;
      sprite.destroy();
      this.alcoholFlyingFlask = null;
      this.spawnAlcoholPuddle(time, tx, ty, 'player', scene);
    }

    // Intoxication expiry → slow
    if (player.intoxicatedUntil > 0 && time >= player.intoxicatedUntil) {
      player.intoxicatedUntil = 0;
      player.incomingDamageMultiplier = 1;
      player.intoxicationSlowUntil = time + 2000 + player.intoxicationPendingSlowExtra;
      player.intoxicationPendingSlowExtra = 0;
      this.arena.showFloatingText(player.x, player.y - 30, '🌀 Hangover!', '#8888ff');
    }

    // Heat aura while intoxicated + flame body/affinity
    const intoxicated = player.intoxicatedUntil > time;
    if (intoxicated && this.flameBodyActive) {
      if (!this.alcoholHeatAura) {
        this.alcoholHeatAura = scene.add.circle(player.x, player.y, 50, 0xff5500, 0.3).setDepth(3);
        scene.tweens.add({ targets: this.alcoholHeatAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
      }
      this.alcoholHeatAura.setPosition(player.x, player.y);
      // Tick damage to enemies in heat aura
      this.alcoholHeatAuraTickAccum += delta;
      if (this.alcoholHeatAuraTickAccum >= 333) {
        this.alcoholHeatAuraTickAccum -= 333;
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 50) {
            t.takeDamage(2);
            this.arena.spawnHitFlash(t.x, t.y, 0xff5500);
          }
        }
      }
    } else if (this.alcoholHeatAura) {
      this.alcoholHeatAura.destroy();
      this.alcoholHeatAura = null;
      this.alcoholHeatAuraTickAccum = 0;
    }

    // Alcohol puddles update
    for (let i = this.alcoholPuddles.length - 1; i >= 0; i--) {
      const p = this.alcoholPuddles[i];
      if (time >= p.expiresAt) {
        p.sprite.destroy();
        p.ignitedAura?.destroy();
        this.alcoholPuddles.splice(i, 1);
        continue;
      }

      if (p.ignited) {
        // Flame puddle: burn enemies in radius
        p.igniteTickAccum += delta;
        if (p.igniteTickAccum >= 500) {
          p.igniteTickAccum -= 500;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= p.radius) {
              t.oilyBurnUntil = Math.max(t.oilyBurnUntil, time + 5000);
              t.takeDamage(3);
              this.arena.spawnHitFlash(t.x, t.y, 0xff4400);
            }
          }
        }
        // Caster in flame puddle: negate self-damage (handled in main update by isPlayerInFlamePuddle)
      } else {
        // Unignited: confuse enemies standing inside ≥2s; intoxicate player inside
        for (const t of this.arena.enemies) {
          if (!t.active || t.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y);
          if (dist <= p.radius) {
            const prev = p.enemyTimeIn.get(t) ?? 0;
            const newTime = prev + delta;
            p.enemyTimeIn.set(t, newTime);
            if (newTime >= 2000 && prev < 2000) {
              t.slimeConfusedUntil = time + 4000;
              this.arena.showFloatingText(t.x, t.y - 20, '😵 Confused!', '#c97a3a');
            }
          } else {
            p.enemyTimeIn.delete(t);
          }
        }
        // Caster standing inside: top up intoxication
        if (p.owner === 'player' && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.radius) {
          player.intoxicatedUntil = Math.max(player.intoxicatedUntil, time + 1000);
          if (player.incomingDamageMultiplier > 0.75) player.incomingDamageMultiplier = 0.75;
        }
      }

      // Ignition by fireball/flamethrower nearby (proximity check against player's attack position)
      // This is done externally via igniteAlcoholPuddlesNear calls in handleInput
    }
  }

  isPlayerInFlamePuddle(time: number): boolean {
    const { player } = this.arena;
    return this.alcoholPuddles.some(p =>
      p.ignited && time < p.expiresAt &&
      Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) <= p.radius
    );
  }
}
