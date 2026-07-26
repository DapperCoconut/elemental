import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import { CustomStatus } from './StatusHudKit';
import { ArmGesture, FireAvatar, FireColorFn, FireFx, FireWreath, FIRE } from './FireVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';

// ── Heatwave (Fire Mastery) constants ───────────────────────────────────
const HEATWAVE_COOLDOWN_MS = 6000;
const HEATWAVE_RANGE = 420;
const HEATWAVE_SPEED = 520;        // px/s
const HEATWAVE_HALF_WIDTH = 45;    // perpendicular half-extent of the rectangle
const HEATWAVE_HALF_THICKNESS = 13;
const HEATWAVE_HIT_PAD = 18;       // target body radius, forgives the sweep band
const EXPOSED_DURATION_MS = 5000;
const MOLTEN_DAMAGE_PER_SEC = 5;

/** A travelling Heatwave band. Pierces — `hit` tracks who it has already exposed. */
interface Heatwave {
  /** Stacked rectangles (outer haze → hot core) moved together each frame. */
  rects: Phaser.GameObjects.Rectangle[];
  x: number; y: number;
  cos: number; sin: number;
  travelled: number;
  hit: Set<Fighter>;
  /** 'player' waves expose enemies; 'npc' waves (online replay) expose the local player. */
  owner: 'player' | 'npc';
}

/** Which arm gesture the opponent's rig plays when the NPC lands each ability. */
const NPC_GESTURES: Record<string, ArmGesture> = {
  'fireball': 'punch',
  'flame-dash': 'dash',
  'pressure-bomb': 'slam',
  'flame-body': 'flex',
  'flame-nuke': 'raise',
};

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
  /** Live projectile group — scanned each frame so fireballs can be given a burning trail. */
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly width: number;
  readonly height: number;
  readonly masteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  lockCaster(durationMs: number): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Skins: maps a fire visual color through the owner's equipped skin (Candle → violet). */
  fireColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  /** Idempotent achievement unlock with in-arena popup. */
  unlockAchievement(id: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  damagePlayerTargets(cx: number, cy: number, radius: number, damage: number, color: number): void;
  dealFlameNukeDamage(cx: number, cy: number, radius: number, damage: number): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Fire Mastery — Burning Body: instantly clears all DOT effects currently on the player. */
  clearPlayerDots(): void;
  /** Show/clear an element-specific effect in the top-right status tray (player-side only). */
  setStatusIndicator(id: string, status: CustomStatus | null): void;
}

// ── FireKit ───────────────────────────────────────────────────────────────

export class FireKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours the right side. */
  private readonly pcol: FireColorFn;
  private readonly ncol: FireColorFn;
  private readonly pfx: FireFx;
  private readonly nfx: FireFx;
  /**
   * The character rig for each fire-element fighter — fire's own by default, or whatever
   * that side's equipped skin installs instead. Typed as the base rig because the kit only
   * ever drives it through poses and gestures, which every rig has.
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  private projTrailAccum = 0;

  // ── Player state ─────────────────────────────────────────────────────
  private flameBodyActive = false;
  private flameBodyTickAccum = 0;
  private flameBodyWreath: FireWreath | null = null;
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
  private npcFlameBodyWreath: FireWreath | null = null;
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

  // ── Fire Mastery state ──────────────────────────────────────────────────
  private burningBodyWreath: FireWreath | null = null;
  private burningBodyTickAccum = 0;
  /** Shared throttle for the lava drips shed by molten targets. */
  private moltenDripAccum = 0;
  private heatwaveLastCastAt = 0;
  private heatwaves: Heatwave[] = [];

  constructor(private arena: FireArenaApi) {
    this.pcol = (base) => arena.fireColor('player', base);
    this.ncol = (base) => arena.fireColor('npc', base);
    this.pfx = new FireFx(arena.scene, this.pcol);
    this.nfx = new FireFx(arena.scene, this.ncol);
  }

  // ── Public accessors ──────────────────────────────────────────────────

  isPressureCharging(): boolean { return this.pressureCharging; }
  isFlameBodyActive(): boolean { return this.flameBodyActive; }
  isEnhancedFlameBody(): boolean { return this.enhancedFlameBody; }
  isNpcFlameBodyActive(): boolean { return this.npcFlameBodyActive; }
  getAlcoholPuddles(): AlcoholPuddle[] { return this.alcoholPuddles; }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.aimX = 0;
    this.aimY = 0;
    this.projTrailAccum = 0;

    // Player
    this.flameBodyActive = false;
    this.flameBodyTickAccum = 0;
    if (this.flameBodyWreath) { this.flameBodyWreath.destroy(); this.flameBodyWreath = null; }
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
    if (this.npcFlameBodyWreath) { this.npcFlameBodyWreath.destroy(); this.npcFlameBodyWreath = null; }
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

    // Fire Mastery
    if (this.burningBodyWreath) { this.burningBodyWreath.destroy(); this.burningBodyWreath = null; }
    this.burningBodyTickAccum = 0;
    this.heatwaveLastCastAt = 0;
    for (const w of this.heatwaves) for (const r of w.rects) r.destroy();
    this.heatwaves = [];
  }

  update(time: number, delta: number, isPlayerFire: boolean, isNpcFire: boolean): void {
    const { player, npc, scene } = this.arena;

    this.updateAvatars(delta, isPlayerFire, isNpcFire);
    this.updateFireballTrails(delta);

    if (isPlayerFire) {
      // Status tray: Flame Body is a toggle with no expiry, so mirror it every frame.
      this.arena.setStatusIndicator('flame-body', this.flameBodyActive ? {
        name: 'Flame Body', emoji: '🔆', color: 0xff9900, priority: 118,
        description: this.enhancedFlameBody
          ? 'Wreathed in flame: double outgoing damage, but double damage taken.'
          : 'Wreathed in flame: burns anything you touch, at the cost of steady self-damage.',
      } : null);

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
        this.flameBodyWreath?.update(delta, player.x, player.y, player.alpha);
      }

      // Waiting for 1s channel lock to expire, then commit charge location
      if (this.flameChargeWaiting) {
        if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.setPosition(player.x, player.y);
        if (time >= this.flameChargeWaitingSince + 1000) {
          this.flameChargeWaiting = false;
          if (this.flameChargeWaitVisual) { this.flameChargeWaitVisual.destroy(); this.flameChargeWaitVisual = null; }
          const cx = player.x, cy = player.y;
          const fuseVis = scene.add.circle(cx, cy, 14, this.pcol(FIRE.core), 0.8).setDepth(7);
          fuseVis.setStrokeStyle(3, this.pcol(FIRE.yellow), 0.9);
          scene.tweens.add({ targets: fuseVis, alpha: 0.2, yoyo: true, repeat: -1, duration: 250 });
          // 3s fuse: fire gathers into the charge and the containment ring squeezes shut.
          this.pfx.channelCharge(cx, cy, 110, 3000);
          this.pfx.scorch(cx, cy, 30);
          this.flameChargePending = { x: cx, y: cy, fireAt: time + 3000, visual: fuseVis };
        }
      }

      // Fuse detonation
      if (this.flameChargePending && time >= this.flameChargePending.fireAt) {
        const { x: fx, y: fy, visual } = this.flameChargePending;
        this.flameChargePending = null;
        visual.destroy();
        const radius = 220;
        this.arena.dealFlameNukeDamage(fx, fy, radius, 80);
        if (Phaser.Math.Distance.Between(fx, fy, player.x, player.y) <= radius) {
          player.applySelfDamage(80);
          this.arena.showFloatingText(player.x, player.y - 28, '🔥 Self-Dmg!', '#ff4400');
          // Oops achievement: blew yourself up with your own Flame Charge.
          if (player.hp <= 0) this.arena.unlockAchievement('oops');
        }
        this.pfx.explosion(fx, fy, radius, { shards: 30, smoke: 8, duration: 680 });
        this.pfx.firePillar(fx, fy, 52, 170);
        scene.cameras.main.shake(320, 0.010);
        this.arena.showFloatingText(fx, fy - 28, '💥 Flame Charge!', '#ff6600');
      }

      // Charge ratio: only meaningful during pressure-charging
      if (!this.pressureCharging) {
        player.chargeRatio = 0;
      }

      // Alcohol perk updates
      if (this.arena.hasPerk('player', 'alcohol')) {
        this.updateAlcohol(time, delta, player, scene);
      }

      // Fire Mastery — Burning Body: always-on passive while mastery is enabled
      if (this.arena.masteryActive) {
        if (!this.burningBodyWreath) {
          // Sits under the Flame Body wreath (depth 2) so the two read as one bonfire.
          this.burningBodyWreath = new FireWreath(scene, this.pcol, 40, 0.85, 2, 8);
        }
        this.burningBodyWreath.update(delta, player.x, player.y, player.alpha);
        this.burningBodyTickAccum += delta;
        if (this.burningBodyTickAccum >= 500) {
          this.burningBodyTickAccum -= 500;
          for (const t of this.arena.enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 50) {
              t.takeDamage(3, { fireDot: true });
              this.arena.spawnHitFlash(t.x, t.y, this.pcol(FIRE.ember));
              this.pfx.embers(t.x, t.y, 2, { speed: 70, size: 2.6, life: 380 });
            }
          }
        }
        this.arena.clearPlayerDots();
      } else if (this.burningBodyWreath) {
        this.burningBodyWreath.destroy();
        this.burningBodyWreath = null;
        this.burningBodyTickAccum = 0;
      }

      // Fire Mastery — Heatwave projectiles and the Exposed / molten fire chain
      this.updateHeatwaves(time, delta);
      this.updateExposedAndMolten(time, delta);
    } else if (isNpcFire) {
      // Online: opponent is fire. Advance their replayed Heatwaves and keep the
      // Exposed/molten upkeep running so their debuff lands on our local fighter.
      this.updateHeatwaves(time, delta);
      this.updateExposedAndMolten(time, delta);
    }

    // NPC flame body tick (runs whenever NPC is fire regardless of player element)
    if (this.npcFlameBodyActive) {
      this.npcFlameBodyTickAccum += delta;
      if (this.npcFlameBodyTickAccum >= 250) this.npcFlameBodyTickAccum -= 250;
      this.npcFlameBodyWreath?.update(delta, npc.x, npc.y, npc.alpha);
    }
  }

  // ── Fire character rig ────────────────────────────────────────────────

  /**
   * That side's rig: the skin's if one is equipped, fire's living flame otherwise. Built
   * lazily in `updateAvatars` and torn down in `reset`, so changing skin between matches
   * swaps the character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.arena;
    const col = owner === 'player' ? this.pcol : this.ncol;
    return makeSkinAvatar(this.arena.skinId(owner), scene) ?? new FireAvatar(scene, col);
  }

  /**
   * Builds (on first frame) and drives the ball-arm avatar for whichever fighters are fire.
   * The player faces the cursor; the NPC faces whoever it is fighting.
   */
  private updateAvatars(delta: number, isPlayerFire: boolean, isNpcFire: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerFire && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      this.playerAvatar.setIntensity(this.enhancedFlameBody ? 1.5 : this.flameBodyActive ? 1.25 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpcFire && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcEnhancedFlameBody ? 1.5 : this.npcFlameBodyActive ? 1.25 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Every live fireball drags a shrinking tail of embers behind it. */
  private updateFireballTrails(delta: number): void {
    this.projTrailAccum += delta;
    if (this.projTrailAccum < 45) return;
    this.projTrailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-fire') continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      // Trail streams out of the back of the shot rather than puffing symmetrically.
      const back = body ? Math.atan2(-body.velocity.y, -body.velocity.x) : 0;
      fx.embers(proj.x, proj.y, 2, { angle: back, spread: 0.45, speed: 40, size: 2.8, life: 300, rise: 8, depth: 4 });
    }
  }

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, scene, eKey, fKey, rKey, qKey, nukeChanneling } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Whichever slot the player bound Heatwave onto replaces that slot's normal ability.
    const hwSlot = this.arena.masteryActive ? this.heatwaveSlot() : null;
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;
    const aimAngle = Math.atan2(mouseY - player.y, mouseX - player.x);

    if (!nukeChanneling) {
      // ── Click: Fireball / Flamethrower ────────────────────────────
      if (pointer.isDown) {
        const justPressed = !this.firePointerWasDown;
        this.flamethrowerHoldMs += delta;
        if (justPressed) {
          // Arms jab first so the throw reads as coming out of a hand.
          if (player.castAbility('fireball', playerCtx)) this.playerAvatar?.play('punch', aimAngle);
          if (this.arena.hasPerk('player', 'alcohol')) {
            this.igniteAlcoholPuddlesNear(mouseX, mouseY, 60, scene);
          }
        } else if (this.flamethrowerHoldMs > 120) {
          this.playerAvatar?.setHold('spray', aimAngle);
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
                  this.arena.spawnHitFlash(t.x, t.y, this.arena.fireColor('player', 0xff5500));
                  if (this.arena.hasUpgrade('click')) {
                    const wasBurning = t.burningUntil > time;
                    t.burningUntil = Math.max(t.burningUntil, time + Math.round(3000 * t.statusDurMult));
                    if (!wasBurning) this.arena.recordMasteryStat('clickIgnites', 1);
                  }
                }
              }
            }
            this.pfx.flameJet(player.x, player.y, aimAngle, this.enhancedFlameBody ? 190 : 160);
            if (this.arena.hasPerk('player', 'alcohol')) {
              this.igniteAlcoholPuddlesNear(mouseX, mouseY, 40, scene);
            }
          }
        }
      } else {
        this.flamethrowerHoldMs = 0;
        this.flamethrowerTickAccum = 0;
        this.playerAvatar?.setHold(null);
      }

      // ── E: Flame Dash / Drink Up! (Alcohol perk) ─────────────────
      const eJustDown = Phaser.Input.Keyboard.JustDown(eKey);
      const eJustUp = this.alcoholEWasDown && !eKey.isDown;

      if (hwSlot === 'e') {
        if (eJustDown) this.tryCastHeatwave(time, mouseX, mouseY);
      } else if (this.arena.hasPerk('player', 'alcohol')) {
        if (eJustDown) this.alcoholEHoldStart = time;
        if (eJustUp && this.alcoholEHoldStart > 0) {
          const heldMs = time - this.alcoholEHoldStart;
          this.alcoholEHoldStart = 0;

          if (player.getCooldownRatio('flame-dash') >= 1) {
            player.triggerCooldown('flame-dash');

            if (this.alcoholFlaskCount === 0) {
              // No flask: pick up a new one
              this.alcoholFlaskCount = 1;
              this.playerAvatar?.play('clap', aimAngle);
              this.arena.showFloatingText(player.x, player.y - 30, '🍺 Flask!', '#c97a3a');
            } else if (heldMs >= 250) {
              // Hold ≥250ms with flask: throw puddle
              this.alcoholFlaskCount = 0;
              this.playerAvatar?.play('punch', aimAngle);
              this.throwAlcoholFlask(time, scene, player);
            } else {
              // Tap with flask: drink (consume flask)
              this.alcoholFlaskCount = 0;
              this.playerAvatar?.play('flex');
              this.drinkAlcohol(time, player);
            }
          }
        }
      } else {
        if (eJustDown) {
          const dashStartX = player.x;
          const dashStartY = player.y;
          const dashed = player.castAbility('flame-dash', playerCtx);
          if (dashed) this.playerAvatar?.play('dash', aimAngle);
          if (dashed && this.arena.hasUpgrade('e')) {
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
                    this.arena.spawnHitFlash(enemy.x, enemy.y, this.pcol(FIRE.orange));
                  }
                }
                this.pfx.explosion(ex, ey, 50, { shards: 6, smoke: 0, scorch: false, duration: 300, depth: 4 });
              });
            }
          }
        }
      }
      this.alcoholEWasDown = eKey.isDown;

      // ── R: Pressure Bomb / Pressure Charge upgrade ────────────────
      if (hwSlot === 'r') {
        if (Phaser.Input.Keyboard.JustDown(rKey)) this.tryCastHeatwave(time, mouseX, mouseY);
      } else if (this.arena.hasUpgrade('r')) {
        if (rKey.isDown) {
          if (!this.pressureCharging && player.getCooldownRatio('pressure-bomb') >= 1) {
            this.pressureCharging = true;
            this.pressureChargeStart = time;
            this.pressureTremorAccum = 0;
            player.incomingDamageMultiplier = this.enhancedFlameBody ? 2 : 1.5;
            const cv = scene.add.circle(player.x, player.y, 12, this.pcol(FIRE.amber), 0.6).setDepth(4);
            cv.setStrokeStyle(2, this.pcol(FIRE.yellow), 0.8);
            scene.tweens.add({ targets: cv, scaleX: 0.5, scaleY: 0.5, yoyo: true, repeat: -1, duration: 300 });
            this.pressureChargeVisual = cv;
          }
          if (this.pressureCharging) {
            // Arms whirl in tight against the body while pressure builds.
            this.playerAvatar?.setHold('charge');
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
                    this.arena.spawnHitFlash(t.x, t.y, this.pcol(FIRE.orange));
                  }
                }
                // Ground tremor under the cursor: the ordnance rattling before release.
                this.pfx.ring(mouseX, mouseY, 8, 62, FIRE.orange, 350, 4, 4);
                this.pfx.embers(mouseX, mouseY, 5, { speed: 90, size: 2.8, life: 400, depth: 4 });
              }
            } else {
              this.pressureTremorAccum = 0;
            }
          }
        } else if (this.pressureCharging) {
          // Released — fire the charged bomb
          this.pressureCharging = false;
          this.playerAvatar?.setHold(null);
          this.playerAvatar?.play('slam', Math.atan2(this.pressureLastMouseY - player.y, this.pressureLastMouseX - player.x));
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
              this.arena.spawnHitFlash(t.x, t.y, this.pcol(FIRE.amber));
            }
          }
          // Alcohol perk: ignite any alcohol puddles in blast radius
          if (this.arena.hasPerk('player', 'alcohol')) {
            this.igniteAlcoholPuddlesNear(mx, my, 120, scene);
          }
          // Overcharging makes the blast visibly meatier without changing its radius.
          this.pfx.explosion(mx, my, 100, { shards: 14 + chargeLevel * 8, smoke: 3 + chargeLevel, duration: 380 + chargeLevel * 120 });
          if (chargeLevel > 0) this.pfx.firePillar(mx, my, 34, 90 + chargeLevel * 50);
          scene.cameras.main.shake(140 + chargeLevel * 70, 0.004 + chargeLevel * 0.003);
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
                this.arena.damagePlayerTargets(cx, cy, 60, 5, this.pcol(FIRE.amber));
                this.pfx.explosion(cx, cy, 60, { shards: 8, smoke: 1, duration: 340 });
              });
            }
          }
        }
      } else {
        if (Phaser.Input.Keyboard.JustDown(rKey)) {
          if (player.castAbility('pressure-bomb', playerCtx)) {
            this.playerAvatar?.play('slam', aimAngle);
            if (this.arena.hasPerk('player', 'alcohol')) {
              this.igniteAlcoholPuddlesNear(mouseX, mouseY, 120, scene);
            }
          }
        }
      }

      // ── F: Flame Body / Flame Affinity upgrade ────────────────────
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        if (hwSlot === 'f') {
          this.tryCastHeatwave(time, mouseX, mouseY);
        } else if (this.arena.hasUpgrade('f')) {
          // Flame Affinity: toggle with enhanced effects
          this.flameBodyActive = !this.flameBodyActive;
          this.enhancedFlameBody = this.flameBodyActive;
          this.flameBodyTickAccum = 0;
          player.incomingDamageMultiplier = this.flameBodyActive ? 2 : 1;
          if (this.flameBodyActive) { player.cardOutgoingDamageMult *= 2; } else { player.cardOutgoingDamageMult /= 2; }
          this.setFlameBodyWreath(this.flameBodyActive, 44, 1.35);
        } else {
          // Base: original toggle
          this.flameBodyActive = !this.flameBodyActive;
          this.enhancedFlameBody = false;
          this.flameBodyTickAccum = 0;
          this.setFlameBodyWreath(this.flameBodyActive, 34, 1);
        }
      }

      // ── Q: Flame Nuke / Flame Charge upgrade ──────────────────────
      if (Phaser.Input.Keyboard.JustDown(qKey)) {
        if (hwSlot === 'q') {
          this.tryCastHeatwave(time, mouseX, mouseY);
        } else if (this.arena.hasUpgrade('q') && (this.flameBodyActive || this.enhancedFlameBody) && player.getCooldownRatio('flame-nuke') >= 1) {
          if (!this.flameChargeWaiting && !this.flameChargePending) {
            this.flameChargeWaiting = true;
            this.flameChargeWaitingSince = time;
            player.triggerCooldown('flame-nuke');
            this.arena.lockCaster(1000);
            this.playerAvatar?.play('raise', aimAngle, 1000);
            if (this.flameChargeWaitVisual) this.flameChargeWaitVisual.destroy();
            this.flameChargeWaitVisual = scene.add.circle(player.x, player.y, 20, this.pcol(FIRE.amber), 0.5).setDepth(6);
            scene.tweens.add({ targets: this.flameChargeWaitVisual, alpha: 0.1, yoyo: true, repeat: -1, duration: 200 });
            // The caster is locked in place, so the gather tracks them only for safety.
            this.pfx.channelCharge(player.x, player.y, 70, 1000, () => player.active ? { x: player.x, y: player.y } : null);
            this.arena.showFloatingText(player.x, player.y - 28, '🔥 Channeling...', '#ff8800');
          }
        } else if (!this.arena.hasUpgrade('q') || !(this.flameBodyActive || this.enhancedFlameBody)) {
          if (player.castAbility('flame-nuke', this.arena.buildPlayerContext(player.x, player.y))) {
            this.playerAvatar?.play('raise', aimAngle, 2000);
          }
        }
      }

    }

    this.firePointerWasDown = pointer.isDown;
  }

  /** The ability slot Heatwave is bound over this match, or null if it isn't bound anywhere. */
  private heatwaveSlot(): string | null {
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.arena.masteryBindFor(slot) === 'heatwave') return slot;
    }
    return null;
  }

  /**
   * Raise or drop the Flame Body wreath. Toggling it on throws a burst of flame outward so the
   * transformation lands with some weight instead of a circle blinking into existence.
   */
  private setFlameBodyWreath(on: boolean, radius: number, intensity: number): void {
    const { player, scene } = this.arena;
    if (this.flameBodyWreath) { this.flameBodyWreath.destroy(); this.flameBodyWreath = null; }
    if (!on) return;
    this.flameBodyWreath = new FireWreath(scene, this.pcol, radius, intensity, 3);
    this.playerAvatar?.play('flex');
    this.pfx.bloom(player.x, player.y, radius * 2.1, 12);
    this.pfx.ring(player.x, player.y, 10, radius * 2.4, FIRE.pale, 380, 5, 4);
  }

  private tryCastHeatwave(time: number, mouseX: number, mouseY: number): void {
    if (time - this.heatwaveLastCastAt < HEATWAVE_COOLDOWN_MS) return;
    this.heatwaveLastCastAt = time;
    this.playerAvatar?.play('sweep', Math.atan2(mouseY - this.arena.player.y, mouseX - this.arena.player.x));
    this.castHeatwave(mouseX, mouseY, 'player');
    // Online: replay on the opponent's sim so their (locally-owned) fighter is Exposed.
    this.arena.broadcastMasteryCast('heatwave');
  }

  /** Online replay: the remote fire player cast Heatwave — send a wave from the npc replica. */
  doNpcHeatwave(tx: number, ty: number): void {
    const { npc } = this.arena;
    this.npcAvatar?.play('sweep', Math.atan2(ty - npc.y, tx - npc.x));
    this.castHeatwave(tx, ty, 'npc');
  }

  /** 0–1 cooldown fill for the Heatwave HUD card. */
  getHeatwaveCooldownRatio(time: number): number {
    return Math.min(1, (time - this.heatwaveLastCastAt) / HEATWAVE_COOLDOWN_MS);
  }

  /** Fire Mastery — Heatwave: a piercing yellow rectangle that deals no damage but Exposes everything it passes through. */
  private castHeatwave(aimX: number, aimY: number, owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const origin = owner === 'player' ? player : npc;
    const angle = Math.atan2(aimY - origin.y, aimX - origin.x);
    const col = owner === 'player' ? this.pcol : this.ncol;
    const fx = owner === 'player' ? this.pfx : this.nfx;

    // Three stacked bands — a wide soft haze, the yellow body, and a thin white-hot spine.
    const bands: { t: number; w: number; c: number; a: number }[] = [
      { t: 2.1, w: 1.25, c: FIRE.gold, a: 0.22 },
      { t: 1.0, w: 1.0, c: FIRE.yellow, a: 0.55 },
      { t: 0.35, w: 0.6, c: FIRE.white, a: 0.75 },
    ];
    const rects = bands.map(b => {
      const r = scene.add.rectangle(
        origin.x, origin.y,
        HEATWAVE_HALF_THICKNESS * 2 * b.t, HEATWAVE_HALF_WIDTH * 2 * b.w,
        col(b.c), b.a,
      ).setDepth(6);
      r.setRotation(angle);
      return r;
    });
    rects[1].setStrokeStyle(2, col(FIRE.pale), 0.9);

    this.heatwaves.push({
      rects,
      x: origin.x, y: origin.y,
      cos: Math.cos(angle), sin: Math.sin(angle),
      travelled: 0,
      hit: new Set(),
      owner,
    });

    fx.bloom(origin.x, origin.y, 60, 8);
    this.arena.showFloatingText(origin.x, origin.y - 28, '☀️ Heatwave!', '#ffdd33');
  }

  /** Advances every live Heatwave and Exposes any enemy inside its rectangle. Pierces — no despawn on hit. */
  private updateHeatwaves(time: number, delta: number): void {
    const step = HEATWAVE_SPEED * (delta / 1000);

    for (let i = this.heatwaves.length - 1; i >= 0; i--) {
      const w = this.heatwaves[i];
      w.x += w.cos * step;
      w.y += w.sin * step;
      w.travelled += step;
      // Bands shimmer out of phase with each other and fade as the wave loses heat.
      const fade = 1 - Math.pow(w.travelled / HEATWAVE_RANGE, 2);
      for (let b = 0; b < w.rects.length; b++) {
        const r = w.rects[b];
        r.setPosition(w.x, w.y);
        r.setScale(1, 1 + Math.sin(time / 55 + b * 1.9) * 0.09);
        r.setAlpha(fade);
      }

      const targets = w.owner === 'npc' ? [this.arena.player] : this.arena.enemies;
      for (const t of targets) {
        if (!t.active || t.hp <= 0 || w.hit.has(t)) continue;
        const dx = t.x - w.x;
        const dy = t.y - w.y;
        // Project into the wave's local frame: `along` is travel axis, `perp` is its width.
        const along = dx * w.cos + dy * w.sin;
        const perp = -dx * w.sin + dy * w.cos;
        if (Math.abs(along) > HEATWAVE_HALF_THICKNESS + HEATWAVE_HIT_PAD) continue;
        if (Math.abs(perp) > HEATWAVE_HALF_WIDTH + HEATWAVE_HIT_PAD) continue;

        w.hit.add(t);
        this.applyExposed(t, time);
      }

      if (w.travelled >= HEATWAVE_RANGE) {
        for (const r of w.rects) r.destroy();
        this.heatwaves.splice(i, 1);
      }
    }
  }

  private applyExposed(t: Fighter, time: number): void {
    t.exposedUntil = Math.max(t.exposedUntil, time + Math.round(EXPOSED_DURATION_MS * t.statusDurMult));
    // Sun-flare snap on the moment of exposure.
    this.pfx.ring(t.x, t.y, 6, 46, FIRE.pale, 340, 4, 7);
    this.pfx.embers(t.x, t.y, 5, { speed: 80, size: 2.4, life: 420, depth: 7 });
    this.arena.showFloatingText(t.x, t.y - 34, '☀️ Exposed!', '#ffdd33');
  }

  /**
   * Per-frame upkeep for the Heatwave debuff chain: the sun icon over exposed targets,
   * the burn → molten upgrade, and the molten DOT tick.
   */
  private updateExposedAndMolten(time: number, delta: number): void {
    const { scene } = this.arena;

    // Player is included because an online opponent's Heatwave Exposes our own fighter.
    for (const t of [this.arena.player, ...this.arena.enemies]) {
      if (!t.active) continue;

      // Exposed icon
      if (t.exposedUntil > time) {
        if (!t.exposedIcon) {
          t.exposedIcon = scene.add.text(t.x, t.y - 40, '☀️', { fontSize: '16px' }).setOrigin(0.5).setDepth(9);
        }
        t.exposedIcon.setPosition(t.x, t.y - 40);
      } else if (t.exposedIcon) {
        t.exposedIcon.destroy();
        t.exposedIcon = null;
      }

      // Igniting an exposed target burns molten instead of normal. The grace window catches
      // the common case where the same hit both consumed exposed and applied the burn.
      const justConsumed = t.exposedConsumedAt > 0 && time - t.exposedConsumedAt <= 200;
      if (t.burningUntil > time && (t.exposedUntil > time || justConsumed)) {
        t.moltenUntil = Math.max(t.moltenUntil, t.burningUntil);
        t.burningUntil = 0;
        t.burnTickAccum = 0;
        if (t.burnAura) { t.burnAura.destroy(); t.burnAura = null; }
        t.exposedUntil = 0;
        t.exposedConsumedAt = 0;
        if (t.exposedIcon) { t.exposedIcon.destroy(); t.exposedIcon = null; }
        this.arena.showFloatingText(t.x, t.y - 34, '🌋 Molten!', '#ff9900');
      }

      // Molten DOT
      if (t.moltenUntil > time) {
        if (!t.moltenAura) {
          t.moltenAura = scene.add.circle(t.x, t.y, 28, 0xff9900, 0.38).setDepth(7);
        }
        t.moltenAura.setPosition(t.x, t.y);
        // Molten targets steam constantly, not just on the tick, so the debuff reads at a glance.
        t.moltenAura.setScale(1 + Math.sin(time / 90) * 0.08);
        t.moltenTickAccum += delta;
        if (t.moltenTickAccum >= 1000) {
          t.moltenTickAccum -= 1000;
          t.takeDamage(Math.round(MOLTEN_DAMAGE_PER_SEC * t.statusDmgMult), { fireDot: true });
          this.arena.spawnHitFlash(t.x, t.y, 0xff9900);
        }
        this.moltenDripAccum += delta;
        if (this.moltenDripAccum >= 140) {
          this.moltenDripAccum = 0;
          this.pfx.embers(t.x + (Math.random() - 0.5) * 24, t.y + 8, 1, { speed: 12, size: 3, life: 620, rise: -18, depth: 6 });
        }
      } else {
        t.moltenTickAccum = 0;
        if (t.moltenAura) { t.moltenAura.destroy(); t.moltenAura = null; }
      }
    }
  }

  handleNpcCastId(npcCastId: string | null, time: number): void {
    const { player, npc, scene } = this.arena;
    if (!npcCastId) return;

    // Flame body toggle for NPC
    if (npcCastId === 'flame-body') {
      this.npcFlameBodyActive = !this.npcFlameBodyActive;
      this.npcFlameBodyTickAccum = 0;
      if (this.npcFlameBodyWreath) { this.npcFlameBodyWreath.destroy(); this.npcFlameBodyWreath = null; }
      if (this.npcFlameBodyActive) {
        this.npcFlameBodyWreath = new FireWreath(scene, this.ncol, 34, 1, 3);
        this.nfx.bloom(npc.x, npc.y, 70, 12);
      }
    }

    // Mirror the player's cast gestures on the opponent's rig.
    const gesture = NPC_GESTURES[npcCastId];
    if (gesture) {
      this.npcAvatar?.play(
        gesture,
        Math.atan2(player.y - npc.y, player.x - npc.x),
        npcCastId === 'flame-nuke' ? 2000 : undefined,
      );
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
              t.takeDamage(3, { source: p, sourceX: p.x, sourceY: p.y });
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
