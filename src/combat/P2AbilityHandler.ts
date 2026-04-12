import Phaser from 'phaser';
import { CastContext } from '../elements/Ability';
import { P2InputState } from '../network/P2InputState';
import { Fighter } from '../entities/Fighter';
import { Projectile } from './Projectile';
import { Element } from '../elements/Element';
import { fireHitscan, fireBounceHitscan } from '../elements/air';

/**
 * Subset of ArenaScene that processP2Abilities reads and writes.
 * ArenaScene passes `this as unknown as P2Scene` at the call site.
 */
export interface P2Scene {
  // ── Phaser scene systems ─────────────────────────────────────────
  readonly add: Phaser.GameObjects.GameObjectFactory;
  readonly tweens: Phaser.Tweens.TweenManager;
  readonly time: Phaser.Time.Clock;
  readonly scale: Phaser.Scale.ScaleManager;
  readonly projectiles: Phaser.Physics.Arcade.Group;

  // ── Input state ──────────────────────────────────────────────────
  readonly p2Input: P2InputState;
  readonly p2PrevInput: P2InputState;

  // ── Fighter objects ──────────────────────────────────────────────
  readonly npc: Fighter;
  readonly player: Fighter;

  // ── Element identity ─────────────────────────────────────────────
  readonly npcElement: Element;

  // ── Arena helpers (methods on ArenaScene) ────────────────────────
  hasP2Upgrade(slot: string): boolean;
  buildNpcContext(tx: number, ty: number): CastContext;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnFlamethrowerCone(px: number, py: number, tx: number, ty: number): void;
  spawnShadowDarkCloud(x: number, y: number, owner: 'player' | 'npc'): void;
  createPainRain(owner: 'player' | 'npc', damage?: number, minX?: number, maxX?: number): void;
  npcConvertToLifePlant(): void;
  npcConvertToThornPlant(): void;
  npcTriggerOvergrowth(): void;

  // ── Read-only arena state ────────────────────────────────────────
  readonly npcEarthSlamActive: boolean;
  readonly npcEarthSlamBouncing: boolean;
  readonly npcBullRushActive: boolean;
  readonly npcHuntBeastForm: boolean;
  readonly npcDrones: { length: number };
  readonly playerBleeding: boolean;

  // ── Mutable state: fire ──────────────────────────────────────────
  playerBurningUntil: number;
  p2FlamethrowerHoldMs: number;
  p2FlamethrowerTickAccum: number;
  p2FKeyHeldSince: number;
  p2PressureCharging: boolean;
  p2PressureChargeStart: number;
  p2PressureTremorAccum: number;
  p2PressureLastTargetX: number;
  p2PressureLastTargetY: number;
  p2PressureChargeVisual: Phaser.GameObjects.Arc | null;
  npcEnhancedFlameBody: boolean;
  npcFlameBodyActive: boolean;
  npcFlameBodyTickAccum: number;
  npcFlameBodyAura: Phaser.GameObjects.Arc | null;
  npcNukeChanneling: boolean;
  npcNukeChannelEnd: number;
  npcArmageddonActive: boolean;

  // ── Mutable state: water ─────────────────────────────────────────
  npcSplashActiveUntil: number;
  npcSplashDropAccum: number;
  p2PainRainHolding: boolean;
  p2PainRainHoldAccum: number;

  // ── Mutable state: earth ─────────────────────────────────────────
  npcSpeedMult: number;
  p2EarthShieldShedHolding: boolean;
  p2EarthShieldShedStart: number;
  npcEarthShieldShedActive: boolean;
  npcEarthShieldShedEnd: number;
  npcEarthShieldShedBonus: number;
  npcEarthShieldShedAura: Phaser.GameObjects.Arc | null;

  // ── Mutable state: soul ──────────────────────────────────────────
  npcSoulGhosts: number;
  p2SoulEHolding: boolean;
  p2SoulEHoldStart: number;
  p2SoulEHoldVisual: Phaser.GameObjects.Arc | null;

  // ── Mutable state: air ───────────────────────────────────────────
  npcAirElectroCharged: boolean;
  npcAirConsecutiveHits: number;
  npcQuickShotCharged: boolean;
  npcAirBeamWalking: boolean;
  p2AirElectroHolding: boolean;
  p2AirElectroHeldSince: number;
  p2AirElectroChargeVisual: Phaser.GameObjects.Arc | null;

  // ── Mutable state: oil ───────────────────────────────────────────
  npcFirewallSprite: Phaser.GameObjects.Rectangle | null;
  npcFirewallHp: number;
  npcFirewallX: number;
  npcFirewallY: number;
  npcFirewallAngle: number;
  npcOverdriveActive: boolean;
  npcOverdriveEnd: number;
  npcOverdriveAngle: number;
  npcOverdriveTickAccum: number;
  npcOverdriveGraphics: Phaser.GameObjects.Graphics | null;

  // ── Mutable state: life ──────────────────────────────────────────
  p2LifeRHolding: boolean;
  p2LifeRHoldStart: number;
  p2LifeRChargeVisual: Phaser.GameObjects.Arc | null;
  p2LifeFHolding: boolean;
  p2LifeFHoldStart: number;
  p2LifeFChargeVisual: Phaser.GameObjects.Arc | null;
  p2LifeQHolding: boolean;
  p2LifeQHoldStart: number;
  p2LifeQChargeVisual: Phaser.GameObjects.Arc | null;
  npcThornDragActiveUntil: number;
  npcThornDragTickAccum: number;
  npcThornDragAura: Phaser.GameObjects.Arc | null;

  // ── Mutable state: shadow ────────────────────────────────────────
  p2ShadowDrainHoldAccum: number;
  p2ShadowDrainCloudAccum: number;
  npcShadowDanceCharge: number;
  npcShadowBlackHoleCharging: boolean;
  npcShadowBlackHoleChargeStart: number;
  npcShadowBlackHoleChargeVisual: Phaser.GameObjects.Arc | null;

  // ── Mutable state: hunt ──────────────────────────────────────────
  p2HuntGrenadeHolding: boolean;
  p2HuntGrenadeHoldStart: number;
  p2HuntGrenadeVisual: Phaser.GameObjects.Arc | null;

  // ── Mutable state: sand / time ───────────────────────────────────
  p2TimeBarrageActive: boolean;
  npcTimeBarrageStart: number;
  npcTimeBarrageAccum: number;
}

/**
 * Translates P2 input state into NPC-state-driven ability calls.
 * Extracted from ArenaScene.processP2Abilities() to keep the scene file smaller.
 *
 * Call as: processP2Abilities(this as unknown as P2Scene, time, delta, p2Ctx, p2TargetX, p2TargetY)
 */
export function processP2Abilities(
  scene: P2Scene,
  time: number,
  delta: number,
  p2Ctx: CastContext,
  p2TargetX: number,
  p2TargetY: number,
): string | null {
  const eid = scene.npcElement.id;

  if (eid === 'fire') {
    if (!scene.npcNukeChanneling || scene.npcArmageddonActive) {
      // ── U: Fireball / Flamethrower ────────────────────────
      if (scene.p2Input.click) {
        const justPressed = !scene.p2PrevInput.click;
        scene.p2FlamethrowerHoldMs += delta;
        if (justPressed) {
          scene.npc.castAbility('fireball', p2Ctx);
        } else if (scene.p2FlamethrowerHoldMs > 120) {
          scene.p2FlamethrowerTickAccum += delta;
          if (scene.p2FlamethrowerTickAccum >= 100) {
            scene.p2FlamethrowerTickAccum -= 100;
            const dist = Phaser.Math.Distance.Between(scene.npc.x, scene.npc.y, scene.player.x, scene.player.y);
            if (dist <= 180) {
              const dirX = p2TargetX - scene.npc.x;
              const dirY = p2TargetY - scene.npc.y;
              const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
              const dot = (dirX / dirLen) * ((scene.player.x - scene.npc.x) / dist)
                        + (dirY / dirLen) * ((scene.player.y - scene.npc.y) / dist);
              if (dot > 0.866) {
                const ftDmg = scene.npcEnhancedFlameBody ? 8 : 4;
                scene.player.takeDamage(ftDmg);
                scene.spawnHitFlash(scene.player.x, scene.player.y, 0xff5500);
                if (scene.hasP2Upgrade('click')) {
                  scene.playerBurningUntil = Math.max(scene.playerBurningUntil, time + 3000);
                }
              }
            }
            scene.spawnFlamethrowerCone(scene.npc.x, scene.npc.y, p2TargetX, p2TargetY);
          }
        }
      } else {
        scene.p2FlamethrowerHoldMs = 0;
        scene.p2FlamethrowerTickAccum = 0;
      }

      // ── O: Flame Dash ──────────────────────────────────────
      if (!scene.npcArmageddonActive && scene.p2Input.e && !scene.p2PrevInput.e) {
        const dashStartX = scene.npc.x;
        const dashStartY = scene.npc.y;
        if (scene.npc.castAbility('flame-dash', p2Ctx) && scene.hasP2Upgrade('e')) {
          for (let i = 1; i <= 4; i++) {
            scene.time.delayedCall(i * 70, () => {
              if (!scene.npc.active) return;
              const t = i / 4;
              const ex = dashStartX + (scene.npc.x - dashStartX) * t;
              const ey = dashStartY + (scene.npc.y - dashStartY) * t;
              const distToPlayer = Phaser.Math.Distance.Between(ex, ey, scene.player.x, scene.player.y);
              if (distToPlayer <= 50) {
                scene.player.takeDamage(Phaser.Math.Between(5, 8));
                scene.spawnHitFlash(scene.player.x, scene.player.y, 0xff6600);
              }
              const ring = scene.add.circle(ex, ey, 8, 0xff6600, 0.8).setDepth(4);
              scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
            });
          }
        }
      }

      // ── P: Pressure Bomb / Pressure Charge upgrade ─────────
      if (!scene.npcArmageddonActive) {
        if (scene.hasP2Upgrade('r')) {
          if (scene.p2Input.r) {
            if (!scene.p2PressureCharging && scene.npc.getCooldownRatio('pressure-bomb') >= 1) {
              scene.p2PressureCharging = true;
              scene.p2PressureChargeStart = time;
              scene.p2PressureTremorAccum = 0;
              scene.npc.incomingDamageMultiplier = 1.5;
              const cv = scene.add.circle(scene.npc.x, scene.npc.y, 12, 0xff8800, 0.6).setDepth(4);
              scene.tweens.add({ targets: cv, scaleX: 0.5, scaleY: 0.5, yoyo: true, repeat: -1, duration: 300 });
              scene.p2PressureChargeVisual = cv;
            }
            if (scene.p2PressureCharging) {
              if (scene.p2PressureChargeVisual) scene.p2PressureChargeVisual.setPosition(scene.npc.x, scene.npc.y);
              scene.p2PressureLastTargetX = p2TargetX;
              scene.p2PressureLastTargetY = p2TargetY;
              const heldMs = time - scene.p2PressureChargeStart;
              const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
              scene.npc.chargeRatio = Math.min(1, heldMs / 6000);
              if (chargeLevel >= 1) {
                scene.p2PressureTremorAccum += delta;
                if (scene.p2PressureTremorAccum >= 1000) {
                  scene.p2PressureTremorAccum -= 1000;
                  const tremorDmg = chargeLevel === 2 ? 6 : 3;
                  for (let ti = 0; ti < 5; ti++) {
                    const ang = (Math.PI * 2 / 5) * ti;
                    const tx = p2TargetX + Math.cos(ang) * 70;
                    const ty = p2TargetY + Math.sin(ang) * 70;
                    if (Phaser.Math.Distance.Between(tx, ty, scene.player.x, scene.player.y) <= 40) {
                      scene.player.takeDamage(tremorDmg);
                    }
                    const tremor = scene.add.circle(tx, ty, 6, 0xff6600, 0.7).setDepth(4);
                    scene.tweens.add({ targets: tremor, scaleX: 4, scaleY: 4, alpha: 0, duration: 300, onComplete: () => tremor.destroy() });
                  }
                }
              } else {
                scene.p2PressureTremorAccum = 0;
              }
            }
          } else if (scene.p2PressureCharging) {
            scene.p2PressureCharging = false;
            scene.npc.chargeRatio = 0;
            scene.npc.incomingDamageMultiplier = 1;
            if (scene.p2PressureChargeVisual) { scene.p2PressureChargeVisual.destroy(); scene.p2PressureChargeVisual = null; }
            const heldMs = time - scene.p2PressureChargeStart;
            const chargeLevel = heldMs >= 6000 ? 2 : heldMs >= 3000 ? 1 : 0;
            const dmgMult = chargeLevel === 2 ? 2 : chargeLevel === 1 ? 1.5 : 1;
            const finalDmg = Math.round(32 * dmgMult);
            const mx = scene.p2PressureLastTargetX;
            const my = scene.p2PressureLastTargetY;
            if (Phaser.Math.Distance.Between(mx, my, scene.player.x, scene.player.y) <= 100) {
              scene.player.takeDamage(finalDmg);
              scene.spawnHitFlash(scene.player.x, scene.player.y, 0xff8800);
            }
            const ring = scene.add.circle(mx, my, 10, 0xff8800, 0.9).setDepth(4);
            scene.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
            const core = scene.add.circle(mx, my, 6, 0xffffff, 0.95).setDepth(5);
            scene.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
            scene.npc.triggerCooldown('pressure-bomb');
          }
        } else {
          if (scene.p2Input.r && !scene.p2PrevInput.r) {
            scene.npc.castAbility('pressure-bomb', p2Ctx);
          }
        }
      }

      // ── ;: Flame Body / Flame Affinity upgrade ─────────────
      if (!scene.npcArmageddonActive) {
        if (scene.hasP2Upgrade('f')) {
          const fDown = scene.p2Input.f;
          if (fDown) {
            if (!scene.p2PrevInput.f) scene.p2FKeyHeldSince = time;
            const held = time - scene.p2FKeyHeldSince;
            if (held >= 1000 && !scene.npcEnhancedFlameBody) {
              scene.npcEnhancedFlameBody = true;
              scene.npcFlameBodyActive = true;
              scene.npcFlameBodyTickAccum = 0;
              if (scene.npcFlameBodyAura) scene.npcFlameBodyAura.destroy();
              scene.npcFlameBodyAura = scene.add.circle(scene.npc.x, scene.npc.y, 40, 0xff2200, 0.4).setDepth(3);
            } else if (!scene.npcEnhancedFlameBody) {
              scene.npc.chargeRatio = Math.min(1, held / 1000);
            }
          } else {
            if (scene.p2PrevInput.f) {
              const held = time - scene.p2FKeyHeldSince;
              if (held < 1000) {
                const wasActive = scene.npcFlameBodyActive;
                scene.npcFlameBodyActive = !wasActive;
                scene.npcEnhancedFlameBody = false;
                scene.npcFlameBodyTickAccum = 0;
                if (scene.npcFlameBodyAura) { scene.npcFlameBodyAura.destroy(); scene.npcFlameBodyAura = null; }
                if (scene.npcFlameBodyActive) {
                  scene.npcFlameBodyAura = scene.add.circle(scene.npc.x, scene.npc.y, 30, 0xff6600, 0.25).setDepth(3);
                  return 'flame-body';
                }
              }
            }
          }
        } else {
          if (scene.p2Input.f && !scene.p2PrevInput.f) {
            return 'flame-body';
          }
        }
      }

      // ── ': Flame Nuke / Armageddon upgrade ────────────────
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        if (scene.hasP2Upgrade('q') && scene.npc.getCooldownRatio('flame-nuke') >= 1) {
          scene.npc.triggerCooldown('flame-nuke');
          scene.npcNukeChanneling = true;
          scene.npcNukeChannelEnd = time + 2000;
          scene.npcArmageddonActive = true;

          const charge = scene.add.circle(scene.npc.x, scene.npc.y, 10, 0xff2200, 0.6).setDepth(6);
          scene.tweens.add({ targets: charge, scaleX: 22, scaleY: 22, alpha: 0.15, duration: 2000, onComplete: () => charge.destroy() });

          scene.time.delayedCall(2000, () => {
            scene.npcArmageddonActive = false;
            scene.npcNukeChanneling = false;
            const isBurning = scene.playerBurningUntil > scene.time.now;
            const dmg = isBurning ? 120 : 80;
            const radius = 264;
            const distToPlayer = Phaser.Math.Distance.Between(scene.npc.x, scene.npc.y, scene.player.x, scene.player.y);
            if (distToPlayer <= radius) {
              scene.player.takeDamage(dmg);
              scene.spawnHitFlash(scene.player.x, scene.player.y, 0xff4400);
            }
            const boom = scene.add.circle(scene.npc.x, scene.npc.y, 12, 0xff4400, 0.9).setDepth(5);
            scene.tweens.add({ targets: boom, scaleX: 22, scaleY: 22, alpha: 0, duration: 700, onComplete: () => boom.destroy() });
            const boomCore = scene.add.circle(scene.npc.x, scene.npc.y, 8, 0xffffff, 1).setDepth(6);
            scene.tweens.add({ targets: boomCore, scaleX: 9, scaleY: 9, alpha: 0, duration: 320, onComplete: () => boomCore.destroy() });
          });
        } else if (!scene.hasP2Upgrade('q')) {
          scene.npc.castAbility('flame-nuke', scene.buildNpcContext(scene.npc.x, scene.npc.y));
        }
      }
    }
  } else if (eid === 'ice') {
    if (!scene.npcNukeChanneling) {
      // Click: Ice Spike
      if (scene.p2Input.click) {
        scene.npc.castAbility('ice-spike', p2Ctx);
      }
      // E: Frost Blast
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('frost-blast', p2Ctx);
      }
      // R: Block Up
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('block-up', p2Ctx);
      }
      // F: Skate
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('skate', p2Ctx);
      }
      // Q: Frozen Solid
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.npc.castAbility('frozen-solid', p2Ctx);
      }
    }
  } else if (eid === 'crystal') {
    if (!scene.npcNukeChanneling) {
      // Click: Crystal Laser
      if (scene.p2Input.click) {
        scene.npc.castAbility('crystal-laser', p2Ctx);
      }
      // E: Place Crystal
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('crystal-place', p2Ctx);
      }
      // R: Crystal Barrage
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('crystal-barrage', p2Ctx);
      }
      // F: Crystal Portal
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('crystal-portal', p2Ctx);
      }
      // Q: Trick of Light
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.npc.castAbility('crystal-trick', p2Ctx);
      }
    }
  } else if (eid === 'oil') {
    if (!scene.npcNukeChanneling) {
      // Click: Drone Command
      if (scene.p2Input.click) {
        scene.npc.castAbility('drone-command', p2Ctx);
      }
      // E: Drone Summon
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('drone-summon', p2Ctx);
      }
      // R: Drone Destroy (launch toward aim)
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('drone-destroy', scene.buildNpcContext(p2TargetX, p2TargetY));
      }
      // F: Firewall — handled directly (NPC context is a no-op); long side faces P2
      if (scene.p2Input.f && !scene.p2PrevInput.f && scene.npc.getCooldownRatio('firewall') >= 1) {
        scene.npc.triggerCooldown('firewall');
        if (scene.npcFirewallSprite) scene.npcFirewallSprite.destroy();
        const fwAngle = Math.atan2(scene.npc.y - p2TargetY, scene.npc.x - p2TargetX) - Math.PI / 2;
        scene.npcFirewallAngle = fwAngle;
        scene.npcFirewallSprite = scene.add.rectangle(p2TargetX, p2TargetY, 120, 60, 0xff6600, 0.45)
          .setStrokeStyle(2, 0xff9900, 0.9).setDepth(7).setRotation(fwAngle);
        scene.npcFirewallHp = 100;
        scene.npcFirewallX = p2TargetX;
        scene.npcFirewallY = p2TargetY;
      }
      // Q: Overdrive — handled directly (NPC context is a no-op)
      if (scene.p2Input.q && !scene.p2PrevInput.q
          && scene.npc.getCooldownRatio('overdrive') >= 1
          && scene.npcDrones.length > 0) {
        scene.npc.triggerCooldown('overdrive');
        const duration = 500 * scene.npcDrones.length;
        scene.npcOverdriveActive = true;
        scene.npcOverdriveEnd = time + duration;
        scene.npcOverdriveAngle = Math.atan2(p2TargetY - scene.npc.y, p2TargetX - scene.npc.x);
        scene.npcOverdriveTickAccum = 0;
        scene.npcNukeChanneling = true;
        scene.npcNukeChannelEnd = scene.npcOverdriveEnd;
        if (!scene.npcOverdriveGraphics) {
          scene.npcOverdriveGraphics = scene.add.graphics().setDepth(7);
        }
      }
    }
  } else if (eid === 'growth') {
    if (!scene.npcNukeChanneling) {
      // Click: Growth Click (form depends on npcGrowthMorphType)
      if (scene.p2Input.click) {
        scene.npc.castAbility('growth-click', p2Ctx);
      }
      // E: Mutate
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('mutate', p2Ctx);
      }
      // R: Infect
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        p2Ctx.fireInfect(p2TargetX, p2TargetY);
      }
      // F: Bloat
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        p2Ctx.activateBloat();
      }
      // Q: Mutant Morph
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.npc.castAbility('mutant-morph', p2Ctx);
      }
    }
  } else if (eid === 'water') {
    // Click: Water Cut
    if (scene.p2Input.click) {
      scene.npc.castAbility('water-cut', p2Ctx);
    }
    // E: Splash
    if (scene.p2Input.e && !scene.p2PrevInput.e) {
      if (scene.npc.castAbility('splash', p2Ctx)) {
        scene.npcSplashActiveUntil = time + 2000;
        scene.npcSplashDropAccum = 0;
      }
    }
    // R: Geyser
    if (scene.p2Input.r && !scene.p2PrevInput.r) {
      scene.npc.castAbility('geyser', p2Ctx);
    }
    // F: Water Shield
    if (scene.p2Input.f && !scene.p2PrevInput.f) {
      scene.npc.castAbility('water-shield', p2Ctx);
    }
    // Q: Pain Rain (upgrade: hold to channel)
    if (scene.hasP2Upgrade('q')) {
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        if (scene.npc.castAbility('pain-rain', p2Ctx)) {
          scene.p2PainRainHolding = true;
          scene.p2PainRainHoldAccum = 0;
        }
      }
      if (scene.p2Input.q && scene.p2PainRainHolding) {
        scene.p2PainRainHoldAccum += delta;
        if (scene.p2PainRainHoldAccum >= 250) {
          scene.p2PainRainHoldAccum -= 250;
          scene.createPainRain('npc', 15, 0, 100);
        }
      }
      if (!scene.p2Input.q) scene.p2PainRainHolding = false;
    } else {
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.npc.castAbility('pain-rain', p2Ctx);
      }
    }
  } else if (eid === 'earth') {
    if (!scene.npcEarthSlamActive && !scene.npcEarthSlamBouncing && !scene.npcBullRushActive) {
      // E: Shield Up — hold to charge
      if (scene.p2Input.e && scene.npc.shieldHp < 100) {
        scene.npc.shieldHp = Math.min(100, scene.npc.shieldHp + 8.75 * (delta / 1000));
      }
      if (!scene.p2Input.e) {
        // Click: Stab (damage scales with speed if upgraded)
        if (scene.p2Input.click) {
          if (scene.hasP2Upgrade('click')) {
            const speedScale = scene.npcSpeedMult;
            const scaledCtx = { ...p2Ctx, dealMeleeDamage: (range: number, dmg: number, kb = 0) => p2Ctx.dealMeleeDamage(range, Math.round(dmg * speedScale), kb) };
            scene.npc.castAbility('stab', scaledCtx);
          } else {
            scene.npc.castAbility('stab', p2Ctx);
          }
        }
        // R: Shield Slam
        if (scene.p2Input.r && !scene.p2PrevInput.r) {
          scene.npc.castAbility('shield-slam', p2Ctx);
        }
        // F: Shield Break / Shield Shed (upgrade)
        if (scene.hasP2Upgrade('f')) {
          if (scene.p2Input.f && !scene.p2PrevInput.f) {
            scene.p2EarthShieldShedHolding = true;
            scene.p2EarthShieldShedStart = time;
            scene.npc.chargeRatio = 0;
          }
          if (scene.p2EarthShieldShedHolding) {
            scene.npc.chargeRatio = Math.min(1, (time - scene.p2EarthShieldShedStart) / 2000);
            if (!scene.p2Input.f) {
              scene.p2EarthShieldShedHolding = false;
              scene.npc.chargeRatio = 0;
              scene.npc.castAbility('shield-break', p2Ctx);
            } else if (time - scene.p2EarthShieldShedStart >= 2000) {
              scene.p2EarthShieldShedHolding = false;
              scene.npc.chargeRatio = 0;
              const shedAmount = scene.npc.shieldHp;
              scene.npc.shieldHp = 0;
              const bonus = shedAmount * 0.03;
              scene.npcEarthShieldShedActive = true;
              scene.npcEarthShieldShedEnd = time + 6000;
              scene.npcEarthShieldShedBonus = bonus;
              if (scene.npcEarthShieldShedAura) scene.npcEarthShieldShedAura.destroy();
              scene.npcEarthShieldShedAura = scene.add.circle(scene.npc.x, scene.npc.y, 32, 0xffcc44, 0.5).setDepth(6);
              scene.tweens.add({ targets: scene.npcEarthShieldShedAura, alpha: 0.1, yoyo: true, repeat: -1, duration: 300 });
              scene.spawnHitFlash(scene.npc.x, scene.npc.y, 0xffcc44);
            }
          }
        } else {
          if (scene.p2Input.f && !scene.p2PrevInput.f) {
            scene.npc.castAbility('shield-break', p2Ctx);
          }
        }
        // Q: Bull Rush
        if (scene.p2Input.q && !scene.p2PrevInput.q) {
          scene.npc.castAbility('bull-rush', p2Ctx);
        }
      }
    }
  } else if (eid === 'soul') {
    // Click: Spirit Propel orb (on first press)
    if (scene.p2Input.click && !scene.p2PrevInput.click) {
      p2Ctx.fireSoulOrb(p2TargetX, p2TargetY);
    }
    // R: Sacrifice
    if (scene.p2Input.r && !scene.p2PrevInput.r) {
      p2Ctx.soulSacrifice();
    }
    // F: Consume
    if (scene.p2Input.f && !scene.p2PrevInput.f) {
      p2Ctx.soulConsume();
    }
    // Q: Undead Charge (costs 5 ghosts)
    if (scene.p2Input.q && !scene.p2PrevInput.q) {
      if (scene.npcSoulGhosts >= 5) {
        p2Ctx.summonGhost('knight');
      }
    }
    // E: Summon — hold mechanic (tap=basic, 1s=ghoul, 2s=banshee)
    if (scene.p2Input.e && !scene.p2SoulEHolding) {
      scene.p2SoulEHolding = true;
      scene.p2SoulEHoldStart = time;
      if (scene.p2SoulEHoldVisual) scene.p2SoulEHoldVisual.destroy();
      scene.p2SoulEHoldVisual = scene.add.circle(scene.npc.x, scene.npc.y - 36, 8, 0xccaaff, 0.6).setDepth(15);
      scene.tweens.add({ targets: scene.p2SoulEHoldVisual, scaleX: 1.5, scaleY: 1.5, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
    } else if (!scene.p2Input.e && scene.p2SoulEHolding) {
      scene.p2SoulEHolding = false;
      if (scene.p2SoulEHoldVisual) { scene.p2SoulEHoldVisual.destroy(); scene.p2SoulEHoldVisual = null; }
      const holdMs = time - scene.p2SoulEHoldStart;
      if (holdMs < 200) {
        p2Ctx.summonGhost('basic');
      } else {
        let ghostType: 'basic' | 'ghoul' | 'banshee' = 'basic';
        if (holdMs >= 2000 && scene.npcSoulGhosts >= 3) ghostType = 'banshee';
        else if (holdMs >= 1000 && scene.npcSoulGhosts >= 2) ghostType = 'ghoul';
        p2Ctx.summonGhost(ghostType);
      }
    }
  } else if (eid === 'air') {
    if (!scene.npcNukeChanneling) {
      // ── Click: Air Snipe (or electro charged shot) ────────────
      if (scene.p2Input.click) {
        const snipeBase = scene.buildNpcContext(p2TargetX, p2TargetY);
        if (scene.npcAirElectroCharged && scene.npc.getCooldownRatio('air-snipe') >= 1) {
          // Electro charged shot: instant, 1.5× damage, miss = 20 self-damage
          scene.npc.triggerCooldown('air-snipe');
          scene.npcAirElectroCharged = false;
          if (scene.p2AirElectroChargeVisual) { scene.p2AirElectroChargeVisual.destroy(); scene.p2AirElectroChargeVisual = null; }
          scene.npc.chargeRatio = 0;
          const electroCtx = {
            ...snipeBase,
            lockCaster: () => {},
            quickShotActive: true,
            reportAirSnipeResult: (hit: boolean) => {
              if (hit) { scene.npcAirConsecutiveHits = Math.min(scene.npcAirConsecutiveHits + 1, 3); }
              else {
                scene.npcAirConsecutiveHits = 0;
                scene.npc.applySelfDamage(20);
                scene.spawnHitFlash(scene.npc.x, scene.npc.y, 0xaaddff);
              }
            },
          };
          fireHitscan(electroCtx, 45, 0xffee44, true);
        } else {
          // Normal snipe — P2 click upgrade removes lock
          const noLockCtx = scene.hasP2Upgrade('click')
            ? { ...snipeBase, lockCaster: (_d: number) => {} }
            : snipeBase;
          if (scene.npc.castAbility('air-snipe', noLockCtx)) {
            if (scene.npcQuickShotCharged) scene.npcQuickShotCharged = false;
          }
        }
      }

      // ── E: Quick Shot / Electro Charge (upgrade) ──────────────
      if (scene.hasP2Upgrade('e')) {
        if (scene.p2Input.e && !scene.p2PrevInput.e) {
          scene.p2AirElectroHolding = true;
          scene.p2AirElectroHeldSince = time;
          if (scene.p2AirElectroChargeVisual) scene.p2AirElectroChargeVisual.destroy();
          scene.p2AirElectroChargeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 10, 0xffee44, 0.9).setDepth(8);
        }
        if (scene.p2AirElectroHolding) {
          if (scene.p2AirElectroChargeVisual) scene.p2AirElectroChargeVisual.setPosition(scene.npc.x, scene.npc.y);
          if (!scene.p2Input.e) {
            // Released early → normal quick-shot
            scene.p2AirElectroHolding = false;
            if (scene.p2AirElectroChargeVisual) { scene.p2AirElectroChargeVisual.destroy(); scene.p2AirElectroChargeVisual = null; }
            scene.npc.chargeRatio = 0;
            scene.npc.castAbility('quick-shot', p2Ctx);
          } else if (time - scene.p2AirElectroHeldSince >= 1500) {
            // Fully charged
            scene.p2AirElectroHolding = false;
            scene.npcAirElectroCharged = true;
            if (scene.p2AirElectroChargeVisual) { scene.p2AirElectroChargeVisual.destroy(); scene.p2AirElectroChargeVisual = null; }
            scene.p2AirElectroChargeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 22, 0xffee44, 0.7).setDepth(8);
            scene.tweens.add({ targets: scene.p2AirElectroChargeVisual, alpha: 0.2, yoyo: true, repeat: -1, duration: 280 });
          }
        }
        if (scene.npcAirElectroCharged && scene.p2AirElectroChargeVisual) {
          scene.p2AirElectroChargeVisual.setPosition(scene.npc.x, scene.npc.y);
        }
      } else {
        if (scene.p2Input.e && !scene.p2PrevInput.e) {
          scene.npc.castAbility('quick-shot', p2Ctx);
        }
      }

      // ── R: Wind Trap ──────────────────────────────────────────
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('wind-trap', scene.buildNpcContext(p2TargetX, p2TargetY));
      }

      // ── F: Grapple ────────────────────────────────────────────
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('grapple', scene.buildNpcContext(p2TargetX, p2TargetY));
      }

      // ── Q: Charged Beam (upgrade: bounce + walk) ──────────────
      if (scene.p2Input.q && !scene.p2PrevInput.q && scene.npcAirConsecutiveHits >= 3) {
        if (scene.hasP2Upgrade('q')) {
          if (scene.npc.getCooldownRatio('charged-beam') >= 1) {
            scene.npc.triggerCooldown('charged-beam');
            scene.npcAirConsecutiveHits = 0;
            scene.npcNukeChanneling = true;
            scene.npcAirBeamWalking = true;
            scene.npcNukeChannelEnd = time + 1500;
            const capX = p2TargetX, capY = p2TargetY;
            const { width: W, height: H } = scene.scale;
            const chargeVis = scene.add.circle(scene.npc.x, scene.npc.y, 14, 0x88ccff, 0.8).setDepth(8);
            scene.tweens.add({ targets: chargeVis, scaleX: 5, scaleY: 5, alpha: 0.1, duration: 1500, onComplete: () => chargeVis.destroy() });
            scene.time.delayedCall(1500, () => {
              scene.npcAirBeamWalking = false;
              scene.npcNukeChanneling = false;
              scene.npc.chargeRatio = 0;
              fireBounceHitscan(
                scene.buildNpcContext(capX, capY),
                100, 3, W, H,
              );
            });
          }
        } else {
          if (scene.npc.castAbility('charged-beam', scene.buildNpcContext(p2TargetX, p2TargetY))) {
            scene.npcAirConsecutiveHits = 0;
          }
        }
      }
    }
  } else if (eid === 'life') {
    // ── Click: Petal Shotgun (or Petal Burst upgrade) ─────────────
    if (scene.p2Input.click) {
      if (scene.hasP2Upgrade('click')) {
        if (scene.npc.getCooldownRatio('petal-shotgun') >= 1) {
          scene.npc.triggerCooldown('petal-shotgun');
          const FIVE_ANGLES = [-30, -15, 0, 15, 30];
          const dx = p2TargetX - scene.npc.x;
          const dy = p2TargetY - scene.npc.y;
          const baseAngle = Math.atan2(dy, dx);
          const speed = 480;
          const spawnDist = 32;
          for (const deg of FIVE_ANGLES) {
            const angle = baseAngle + deg * (Math.PI / 180);
            const proj = new Projectile(
              scene as unknown as Phaser.Scene,
              scene.npc.x + Math.cos(angle) * spawnDist,
              scene.npc.y + Math.sin(angle) * spawnDist,
              'proj-life', 5, false,
            );
            scene.projectiles.add(proj);
            proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
          }
        }
      } else {
        scene.npc.castAbility('petal-shotgun', p2Ctx);
      }
    }

    // ── E: Plant ────────────────────────────────────────────────
    if (scene.p2Input.e && !scene.p2PrevInput.e) {
      scene.npc.castAbility('plant', p2Ctx);
    }

    // ── R: Grow / Life Root upgrade ──────────────────────────────
    if (scene.hasP2Upgrade('r')) {
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.p2LifeRHolding = true;
        scene.p2LifeRHoldStart = time;
        if (scene.p2LifeRChargeVisual) scene.p2LifeRChargeVisual.destroy();
        scene.p2LifeRChargeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 28, 0x88ffaa, 0.4).setDepth(4);
      }
      if (scene.p2Input.r && scene.p2LifeRHolding) {
        if (scene.p2LifeRChargeVisual) scene.p2LifeRChargeVisual.setPosition(scene.npc.x, scene.npc.y);
        scene.npc.chargeRatio = Math.min(1, (time - scene.p2LifeRHoldStart) / 3000);
        if (time - scene.p2LifeRHoldStart >= 3000) {
          scene.p2LifeRHolding = false;
          if (scene.p2LifeRChargeVisual) { scene.p2LifeRChargeVisual.destroy(); scene.p2LifeRChargeVisual = null; }
          scene.npc.chargeRatio = 0;
          scene.npcConvertToLifePlant();
          scene.npc.triggerCooldown('grow');
        }
      }
      if (!scene.p2Input.r && scene.p2PrevInput.r && scene.p2LifeRHolding) {
        scene.p2LifeRHolding = false;
        if (scene.p2LifeRChargeVisual) { scene.p2LifeRChargeVisual.destroy(); scene.p2LifeRChargeVisual = null; }
        scene.npc.chargeRatio = 0;
        scene.npc.castAbility('grow', p2Ctx);
      }
    } else {
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('grow', p2Ctx);
      }
    }

    // ── F: Thorns / Thorn Trap upgrade ──────────────────────────
    if (scene.hasP2Upgrade('f')) {
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.p2LifeFHolding = true;
        scene.p2LifeFHoldStart = time;
        if (scene.p2LifeFChargeVisual) scene.p2LifeFChargeVisual.destroy();
        scene.p2LifeFChargeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 28, 0xff4444, 0.4).setDepth(4);
      }
      if (scene.p2Input.f && scene.p2LifeFHolding) {
        if (scene.p2LifeFChargeVisual) scene.p2LifeFChargeVisual.setPosition(scene.npc.x, scene.npc.y);
        scene.npc.chargeRatio = Math.min(1, (time - scene.p2LifeFHoldStart) / 3000);
        if (time - scene.p2LifeFHoldStart >= 3000) {
          scene.p2LifeFHolding = false;
          if (scene.p2LifeFChargeVisual) { scene.p2LifeFChargeVisual.destroy(); scene.p2LifeFChargeVisual = null; }
          scene.npc.chargeRatio = 0;
          scene.npcConvertToThornPlant();
          scene.npc.triggerCooldown('thorns');
        }
      }
      if (!scene.p2Input.f && scene.p2PrevInput.f && scene.p2LifeFHolding) {
        scene.p2LifeFHolding = false;
        if (scene.p2LifeFChargeVisual) { scene.p2LifeFChargeVisual.destroy(); scene.p2LifeFChargeVisual = null; }
        scene.npc.chargeRatio = 0;
        scene.npc.castAbility('thorns', p2Ctx);
      }
    } else {
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('thorns', p2Ctx);
      }
    }

    // ── Q: Thorn Drag / Overgrowth upgrade ──────────────────────
    if (scene.hasP2Upgrade('q')) {
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.p2LifeQHolding = true;
        scene.p2LifeQHoldStart = time;
        if (scene.p2LifeQChargeVisual) scene.p2LifeQChargeVisual.destroy();
        scene.p2LifeQChargeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 35, 0x44ff44, 0.3).setDepth(4);
      }
      if (scene.p2Input.q && scene.p2LifeQHolding) {
        if (scene.p2LifeQChargeVisual) scene.p2LifeQChargeVisual.setPosition(scene.npc.x, scene.npc.y);
        scene.npc.chargeRatio = Math.min(1, (time - scene.p2LifeQHoldStart) / 8000);
        if (time - scene.p2LifeQHoldStart >= 8000) {
          scene.p2LifeQHolding = false;
          if (scene.p2LifeQChargeVisual) { scene.p2LifeQChargeVisual.destroy(); scene.p2LifeQChargeVisual = null; }
          scene.npc.chargeRatio = 0;
          scene.npcTriggerOvergrowth();
          scene.npc.triggerCooldown('thorn-drag');
        }
      }
      if (!scene.p2Input.q && scene.p2PrevInput.q && scene.p2LifeQHolding) {
        scene.p2LifeQHolding = false;
        if (scene.p2LifeQChargeVisual) { scene.p2LifeQChargeVisual.destroy(); scene.p2LifeQChargeVisual = null; }
        scene.npc.chargeRatio = 0;
        if (scene.npc.castAbility('thorn-drag', p2Ctx)) {
          scene.npcThornDragActiveUntil = time + 2000;
          scene.npcThornDragTickAccum = 0;
          scene.npcThornDragAura = scene.add.circle(scene.npc.x, scene.npc.y, 30, 0x44ff44, 0.3).setDepth(3);
        }
      }
    } else {
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        if (scene.npc.castAbility('thorn-drag', p2Ctx)) {
          scene.npcThornDragActiveUntil = time + 2000;
          scene.npcThornDragTickAccum = 0;
          scene.npcThornDragAura = scene.add.circle(scene.npc.x, scene.npc.y, 30, 0x44ff44, 0.3).setDepth(3);
        }
      }
    }
  } else if (eid === 'shadow') {
    if (!scene.npcNukeChanneling) {
      // ── Click: Dark Drain (tap = bomb, hold = clouds) ─────────
      if (scene.p2Input.click) {
        scene.p2ShadowDrainHoldAccum += delta;
        if (scene.p2ShadowDrainHoldAccum >= 300) {
          // Cloud mode
          scene.p2ShadowDrainCloudAccum += delta;
          if (scene.p2ShadowDrainCloudAccum >= 600) {
            scene.p2ShadowDrainCloudAccum -= 600;
            scene.spawnShadowDarkCloud(p2TargetX, p2TargetY, 'npc');
          }
        }
      } else {
        if (scene.p2PrevInput.click && scene.p2ShadowDrainHoldAccum < 300) {
          // Tap: launch dark bomb
          scene.npc.castAbility('dark-drain', scene.buildNpcContext(p2TargetX, p2TargetY));
        }
        scene.p2ShadowDrainHoldAccum = 0;
        scene.p2ShadowDrainCloudAccum = 0;
      }

      // ── E: Tentacle ────────────────────────────────────────────
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('tentacle', scene.buildNpcContext(p2TargetX, p2TargetY));
      }

      // ── R: Snap Trap ───────────────────────────────────────────
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('snap-trap', p2Ctx);
      }

      // ── F: Shadow Dance (manual: check npcShadowDanceCharge) ──
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        if (scene.npcShadowDanceCharge >= 35 && scene.npc.getCooldownRatio('shadow-dance') >= 1) {
          scene.npc.triggerCooldown('shadow-dance');
          scene.npcShadowDanceCharge = 0;
          scene.npc.heal(25);
          const flash = scene.add.circle(scene.npc.x, scene.npc.y, 40, 0x8800cc, 0.5).setDepth(8);
          scene.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
        }
      }

      // ── Q: Black Hole (manual: NPC context is no-op) ──────────
      if (scene.p2Input.q && !scene.p2PrevInput.q && scene.npc.getCooldownRatio('black-hole') >= 1) {
        scene.npc.triggerCooldown('black-hole');
        scene.npcShadowBlackHoleCharging = true;
        scene.npcShadowBlackHoleChargeStart = time;
        if (scene.npcShadowBlackHoleChargeVisual) scene.npcShadowBlackHoleChargeVisual.destroy();
        scene.npcShadowBlackHoleChargeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 24, 0xffcc00, 0.6).setDepth(9);
        scene.tweens.add({ targets: scene.npcShadowBlackHoleChargeVisual, scaleX: 1.3, scaleY: 1.3, alpha: 0.3, yoyo: true, repeat: -1, duration: 300 });
        scene.npcNukeChanneling = true;
        scene.npcNukeChannelEnd = time + 3100;
      }
    }
  } else if (eid === 'hunt') {
    const inBeastForm = scene.npcHuntBeastForm;
    if (!inBeastForm) {
      // ── Normal form ──────────────────────────────────────────

      // Click: Shotgun
      if (scene.p2Input.click && !scene.p2PrevInput.click) {
        scene.npc.castAbility('hunt-shotgun', p2Ctx);
      }

      // E: Grenade hold mechanic
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        if (scene.npc.getCooldownRatio('hunt-grenade') >= 1) {
          scene.npc.triggerCooldown('hunt-grenade');
          scene.p2HuntGrenadeHoldStart = time;
          scene.p2HuntGrenadeHolding = true;
          if (scene.p2HuntGrenadeVisual) scene.p2HuntGrenadeVisual.destroy();
          scene.p2HuntGrenadeVisual = scene.add.circle(scene.npc.x, scene.npc.y, 10, 0xff6600, 0.9).setDepth(12);
        }
      }
      if (!scene.p2Input.e && scene.p2HuntGrenadeHolding) {
        const holdMs = time - scene.p2HuntGrenadeHoldStart;
        if (holdMs < 3000) {
          p2Ctx.huntThrowGrenade(p2TargetX, p2TargetY, holdMs);
        }
        scene.p2HuntGrenadeHolding = false;
        if (scene.p2HuntGrenadeVisual) { scene.p2HuntGrenadeVisual.destroy(); scene.p2HuntGrenadeVisual = null; }
      }

      // R: Hunter's Trail
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('hunt-trail', p2Ctx);
      }

      // F: Blood Pact
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('hunt-blood-pact', p2Ctx);
      }

      // Q: Transform
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.npc.castAbility('hunt-transform', p2Ctx);
      }
    } else {
      // ── Beast form ───────────────────────────────────────────

      // Click: Slash
      if (scene.p2Input.click && !scene.p2PrevInput.click) {
        scene.npc.castAbility('hunt-slash', p2Ctx);
      }

      // E: Explosive Leap
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('hunt-leap', p2Ctx);
      }

      // R: Blood Hunt (requires player to be bleeding)
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        if (scene.playerBleeding) scene.npc.castAbility('hunt-blood-hunt', p2Ctx);
      }

      // F: Blood Moon
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('hunt-blood-moon', p2Ctx);
      }

      // Q: Untransform
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        scene.npc.castAbility('hunt-untransform', p2Ctx);
      }
    }
  } else if (eid === 'sand') {
    // Click: Barrage (hold to fire, accelerates over 3s)
    if (scene.p2Input.click) {
      if (!scene.p2TimeBarrageActive) {
        scene.p2TimeBarrageActive = true;
        scene.npcTimeBarrageStart = time;
        scene.npcTimeBarrageAccum = 0;
      }
    } else {
      if (scene.p2TimeBarrageActive) {
        scene.p2TimeBarrageActive = false;
        scene.npcTimeBarrageStart = time;
        scene.npcTimeBarrageAccum = 0;
      }
    }

    // E/R/F/Q blocked while barrage is held
    if (!scene.p2TimeBarrageActive) {
      // E: Time Warp
      if (scene.p2Input.e && !scene.p2PrevInput.e) {
        scene.npc.castAbility('time-warp', p2Ctx);
      }

      // R: Remain
      if (scene.p2Input.r && !scene.p2PrevInput.r) {
        scene.npc.castAbility('time-remain', p2Ctx);
      }

      // F: Halt
      if (scene.p2Input.f && !scene.p2PrevInput.f) {
        scene.npc.castAbility('time-halt', p2Ctx);
      }

      // Q: Timeless (charge-gated, no CD)
      if (scene.p2Input.q && !scene.p2PrevInput.q) {
        p2Ctx.timeTimeless();
      }
    }
  }

  return null;
}
