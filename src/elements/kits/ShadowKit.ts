import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── Shadow world-object types ───────────────────────────────────────────

interface DarkCloud {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface SnapTrap {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  expiresAt: number;
  x: number;
  y: number;
  triggered: boolean;
  radius: number;
  owner: 'player' | 'npc';
  isPlume?: boolean;
}

// ── ShadowArenaApi ───────────────────────────────────────────────────────

export interface ShadowArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly pointerWasDown: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly width: number;
  readonly height: number;
  readonly hpBarY: number;
  readonly hpBarW: number;
  readonly hpBarH: number;
  get npcSpeedMult(): number;
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  /** True only when the player is shadow AND Shadow Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── ShadowKit ────────────────────────────────────────────────────────────

export class ShadowKit {
  // ── Player shadow ────────────────────────────────────────────────────
  private shadowDrainHoldAccum = 0;
  private shadowDrainCloudAccum = 0;
  private shadowTentacleActive = false;
  private shadowTentacleEnd = 0;
  private shadowTentacleX = 0;
  private shadowTentacleY = 0;
  private shadowTentacleHooked = false; // true when NPC is hooked and being dragged
  private shadowTentacleSprite: Phaser.GameObjects.Graphics | null = null;
  private shadowNpcSnaredUntil = 0;
  private shadowNpcStunnedUntil = 0;
  private shadowNpcThrowUntil = 0;
  private shadowDanceCharge = 0;
  private shadowDanceChargeBar: Phaser.GameObjects.Rectangle | null = null;
  // Darkness bar pinned below the top-of-screen HP bar (shadow players only)
  private darknessBarBg: Phaser.GameObjects.Rectangle | null = null;
  private darknessBarFill: Phaser.GameObjects.Rectangle | null = null;
  private shadowBlackHoleActive = false;
  private shadowBlackHoleEnd = 0;
  private shadowBlackHoleX = 0;
  private shadowBlackHoleY = 0;
  private shadowBlackHoleDamageAccum = 0;
  private shadowBlackHoleHealAccum = 0;
  private shadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;
  // Shared cloud/trap arrays
  private shadowDarkClouds: DarkCloud[] = [];
  private shadowSnapTraps: SnapTrap[] = [];

  // ── NPC shadow ───────────────────────────────────────────────────────
  private npcShadowTentacleActive = false;
  private npcShadowTentacleHooked = false;
  private npcShadowTentacleEnd = 0;
  private npcShadowTentacleX = 0;
  private npcShadowTentacleY = 0;
  private npcShadowTentacleSprite: Phaser.GameObjects.Graphics | null = null;
  private npcShadowDragTargetX = 0;
  private npcShadowDragTargetY = 0;
  private npcShadowDragNextChangeAt = 0;
  private shadowPlayerSnaredUntil = 0;
  private shadowPlayerStunnedUntil = 0;
  private npcShadowDanceCharge = 0;
  private npcShadowBlackHoleCharging = false;
  private npcShadowBlackHoleChargeStart = 0;
  private npcShadowBlackHoleChargeVisual: Phaser.GameObjects.Arc | null = null;
  private npcShadowBlackHoleActive = false;
  private npcShadowBlackHoleEnd = 0;
  private npcShadowBlackHoleSprite: Phaser.GameObjects.Graphics | null = null;

  // ── Shadow — upgrade state ──────────────────────────────────────────
  private shadowConsumeActive = false;
  private shadowConsumeEnd = 0;
  private shadowConsumeTickAccum = 0;
  private shadowConsumeAura: Phaser.GameObjects.Arc | null = null;
  private shadowConfusionUntil = 0;
  private shadowConfusionAngle = 0;
  private shadowConfusionNextChange = 0;
  private shadowCloudExposureAccum = 0;
  private shadowDanceUpgradeDodgeUntil = 0;
  private shadowDanceUpgradeCooldownUntil = 0;
  private shadowBHPuddleAccum = 0;

  // ── Shadow Mastery ───────────────────────────────────────────────────
  private darkResonanceAccum = 0;
  private finalEclipseActive = false;
  private finalEclipseAngle = 0;
  private finalEclipseSprite: Phaser.GameObjects.Graphics | null = null;
  private finalEclipseTickAccum = 0;

  constructor(private arena: ShadowArenaApi) {}

  // ── Public accessors for cross-cutting arena state ─────────────────────

  isConsumeActive(): boolean { return this.shadowConsumeActive; }
  getNpcThrowUntil(): number { return this.shadowNpcThrowUntil; }
  isPlayerSnared(time: number): boolean { return time < this.shadowPlayerSnaredUntil || time < this.shadowPlayerStunnedUntil; }
  getDanceUpgradeDodgeUntil(): number { return this.shadowDanceUpgradeDodgeUntil; }
  isNpcTentacleDragging(): boolean { return this.npcShadowTentacleHooked && this.npcShadowTentacleActive; }
  getNpcDragTargetX(): number { return this.npcShadowDragTargetX; }
  getNpcDragTargetY(): number { return this.npcShadowDragTargetY; }
  /** True while the player's Black Hole is up — used by ArenaScene to attribute mastery kills. */
  isBlackHoleActive(): boolean { return this.shadowBlackHoleActive; }
  /** Darkness-readiness gauge for the Final Eclipse HUD bar: 0 mid-channel, else fill toward the 20% cast threshold. */
  getFinalEclipseChargeRatio(time: number): number {
    void time;
    if (this.finalEclipseActive) return 0;
    return Math.min(1, this.shadowDanceCharge / (35 * 0.2));
  }

  reset(): void {
    this.shadowDrainHoldAccum = 0;
    this.shadowDrainCloudAccum = 0;
    this.shadowTentacleActive = false;
    this.shadowTentacleHooked = false;
    this.shadowTentacleEnd = 0;
    this.shadowTentacleX = 0;
    this.shadowTentacleY = 0;
    this.shadowTentacleSprite = null;
    this.shadowNpcSnaredUntil = 0;
    this.shadowNpcStunnedUntil = 0;
    this.shadowNpcThrowUntil = 0;
    this.shadowDanceCharge = 0;
    this.shadowDanceChargeBar = null;
    if (this.darknessBarBg) { this.darknessBarBg.destroy(); this.darknessBarBg = null; }
    if (this.darknessBarFill) { this.darknessBarFill.destroy(); this.darknessBarFill = null; }
    this.shadowBlackHoleActive = false;
    this.shadowBlackHoleEnd = 0;
    this.shadowBlackHoleX = 0;
    this.shadowBlackHoleY = 0;
    this.shadowBlackHoleDamageAccum = 0;
    this.shadowBlackHoleHealAccum = 0;
    this.shadowBlackHoleSprite = null;
    this.shadowDarkClouds = [];
    this.shadowSnapTraps = [];
    this.npcShadowTentacleActive = false;
    this.npcShadowTentacleHooked = false;
    this.npcShadowTentacleEnd = 0;
    this.npcShadowTentacleX = 0;
    this.npcShadowTentacleY = 0;
    this.npcShadowTentacleSprite = null;
    this.npcShadowDragTargetX = 0;
    this.npcShadowDragTargetY = 0;
    this.npcShadowDragNextChangeAt = 0;
    this.shadowPlayerSnaredUntil = 0;
    this.shadowPlayerStunnedUntil = 0;
    this.npcShadowDanceCharge = 0;
    this.npcShadowBlackHoleCharging = false;
    this.npcShadowBlackHoleChargeStart = 0;
    this.npcShadowBlackHoleChargeVisual = null;
    this.npcShadowBlackHoleActive = false;
    this.npcShadowBlackHoleEnd = 0;
    this.npcShadowBlackHoleSprite = null;
    this.shadowConsumeActive = false;
    this.shadowConsumeEnd = 0;
    this.shadowConsumeTickAccum = 0;
    if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
    this.shadowConfusionUntil = 0;
    this.shadowConfusionAngle = 0;
    this.shadowConfusionNextChange = 0;
    this.shadowCloudExposureAccum = 0;
    this.shadowDanceUpgradeDodgeUntil = 0;
    this.shadowDanceUpgradeCooldownUntil = 0;
    this.shadowBHPuddleAccum = 0;
    this.darkResonanceAccum = 0;
    this.finalEclipseActive = false;
    this.finalEclipseAngle = 0;
    if (this.finalEclipseSprite) { this.finalEclipseSprite.destroy(); this.finalEclipseSprite = null; }
    this.finalEclipseTickAccum = 0;
  }

  private spawnDarkCloud(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const voidOn = this.arena.hasPerk(owner, 'void-shade');
    const radius = voidOn ? 43 : 36;
    const duration = voidOn ? 9000 : 6000;
    const spr = scene.add.circle(x, y, radius, 0x330044, 0.55).setDepth(3);
    spr.setStrokeStyle(1, 0x8800cc, 0.5);
    scene.tweens.add({ targets: spr, scaleX: 1.2, scaleY: 1.2, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    this.shadowDarkClouds.push({ sprite: spr, expiresAt: scene.time.now + duration, x, y, radius, tickAccum: 0, owner });
  }

  // ── Ability-cast methods (invoked via CastContext delegates) ──────────

  doLaunchDarkBomb(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc, enemies } = this.arena;
    if (isPlayer) {
      const bomb = scene.add.circle(player.x, player.y, 10, 0x660088, 0.95)
        .setStrokeStyle(2, 0xcc44ff).setDepth(8);
      scene.tweens.add({
        targets: bomb, x, y, duration: 380, ease: 'Power2',
        onComplete: () => {
          const boom = scene.add.circle(x, y, 8, 0x8800cc, 0.8).setDepth(8);
          scene.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
          bomb.destroy();
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(x, y, t.x, t.y) <= 50) {
              t.takeDamage(10);
              this.arena.spawnHitFlash(t.x, t.y, 0x8800cc);
            }
          }
          this.spawnDarkCloud(x, y, 'player');
        },
      });
    } else {
      const bomb = scene.add.circle(npc.x, npc.y, 10, 0x440066, 0.85)
        .setStrokeStyle(2, 0x8800cc).setDepth(8);
      scene.tweens.add({
        targets: bomb, x, y, duration: 380, ease: 'Power2',
        onComplete: () => {
          const boom = scene.add.circle(x, y, 8, 0x440066, 0.7).setDepth(8);
          scene.tweens.add({ targets: boom, scaleX: 7, scaleY: 7, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
          bomb.destroy();
          if (Phaser.Math.Distance.Between(x, y, player.x, player.y) <= 50) {
            player.takeDamage(10);
            this.arena.spawnHitFlash(player.x, player.y, 0x8800cc);
          }
          this.spawnDarkCloud(x, y, 'npc');
        },
      });
    }
  }

  doActivateTentacle(x: number, y: number, isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc, enemies } = this.arena;
    if (isPlayer) {
      const hookDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
      this.shadowTentacleActive = true;
      this.shadowTentacleHooked = hookDist <= 110;
      // R+: check if a trap is near cursor — extend duration for drag
      const hasTrapNearby = this.arena.hasUpgrade('r') && this.shadowSnapTraps.some(
        t => t.owner === 'player' && !t.triggered &&
             Phaser.Math.Distance.Between(t.x, t.y, x, y) <= 55,
      );
      this.shadowTentacleEnd = scene.time.now + (this.shadowTentacleHooked ? 3000 : hasTrapNearby ? 3000 : 600);
      // Tentacle endpoint: toward cursor but clamped to 100px range
      const angle = Math.atan2(y - player.y, x - player.x);
      const reach = Math.min(100, Phaser.Math.Distance.Between(player.x, player.y, x, y));
      this.shadowTentacleX = player.x + Math.cos(angle) * reach;
      this.shadowTentacleY = player.y + Math.sin(angle) * reach;
      if (!this.shadowTentacleSprite) {
        this.shadowTentacleSprite = scene.add.graphics().setDepth(6);
      }
      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 110) {
          t.takeDamage(10);
          this.arena.spawnHitFlash(t.x, t.y, 0x8800cc);
        }
      }
    } else {
      const hookDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
      this.npcShadowTentacleActive = true;
      this.npcShadowTentacleHooked = hookDist <= 110;
      this.npcShadowTentacleEnd = scene.time.now + (this.npcShadowTentacleHooked ? 3000 : 600);
      if (!this.npcShadowTentacleSprite) {
        this.npcShadowTentacleSprite = scene.add.graphics().setDepth(6);
      }
      if (this.npcShadowTentacleHooked) {
        player.takeDamage(10);
        this.arena.spawnHitFlash(player.x, player.y, 0x440066);
        // Pick initial random drag target
        const { width, height } = this.arena;
        this.npcShadowDragTargetX = Phaser.Math.Between(80, width - 80);
        this.npcShadowDragTargetY = Phaser.Math.Between(80, height - 80);
        this.npcShadowDragNextChangeAt = scene.time.now + 700;
      }
    }
  }

  doPlaceSnapTrap(isPlayer: boolean): void {
    const scene = this.arena.scene;
    const { player, npc } = this.arena;
    if (isPlayer) {
      const isPlume = this.arena.hasPerk('player', 'plume');
      const baseR = this.arena.hasUpgrade('r') ? 27 : 18;
      const trapRadius = isPlume ? (this.arena.hasUpgrade('r') ? 36 : 25) : baseR;
      const trapColor = isPlume ? 0x6633aa : 0x440066;
      const strokeColor = isPlume ? 0xcc88ff : 0xcc44ff;
      const trapLabel = isPlume ? '☁️' : '⚡';
      const spr = scene.add.circle(player.x, player.y, trapRadius, trapColor, 0.85)
        .setStrokeStyle(2, strokeColor).setDepth(3);
      const lbl = scene.add.text(player.x, player.y, trapLabel, { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
      this.shadowSnapTraps.push({
        sprite: spr, label: lbl,
        expiresAt: scene.time.now + 12000,
        x: player.x, y: player.y,
        triggered: false, radius: trapRadius, owner: 'player',
        isPlume,
      });
    } else {
      const isNpcPlume = this.arena.hasPerk('npc', 'plume');
      const npcTrapR = isNpcPlume ? 25 : 18;
      const npcTrapColor = isNpcPlume ? 0x6633aa : 0x220033;
      const npcTrapLabel = isNpcPlume ? '☁️' : '⚡';
      const spr = scene.add.circle(npc.x, npc.y, npcTrapR, npcTrapColor, 0.75)
        .setStrokeStyle(2, isNpcPlume ? 0xcc88ff : 0x8800cc).setDepth(3);
      const lbl = scene.add.text(npc.x, npc.y, npcTrapLabel, { fontSize: '10px' }).setOrigin(0.5).setDepth(4);
      this.shadowSnapTraps.push({
        sprite: spr, label: lbl,
        expiresAt: scene.time.now + 12000,
        x: npc.x, y: npc.y,
        triggered: false, radius: npcTrapR, owner: 'npc', isPlume: isNpcPlume,
      });
    }
  }

  /** Player-only: NPC never tracks shadow dance charge / casts this. */
  doActivateShadowDance(): void {
    const scene = this.arena.scene;
    const player = this.arena.player;
    if (this.arena.hasUpgrade('f')) {
      if (this.shadowDanceCharge <= 0 || scene.time.now < this.shadowDanceUpgradeCooldownUntil) return;
      this.shadowDanceUpgradeCooldownUntil = scene.time.now + 2000;
      const ratio = Math.min(1, this.shadowDanceCharge / 35);
      const wasFull = this.shadowDanceCharge >= 35;
      this.shadowDanceCharge = 0;
      const healAmt = wasFull ? 38 : Math.round((5 + ratio * 15) * 1.5);
      player.heal(healAmt);
      if (wasFull) {
        this.shadowDanceUpgradeDodgeUntil = scene.time.now + 8000;
        const dTxt = scene.add.text(player.x, player.y - 44, '👻 PHANTOM STEP', { fontSize: '10px', color: '#cc44ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        scene.tweens.add({ targets: dTxt, y: dTxt.y - 18, alpha: 0, duration: 1400, onComplete: () => dTxt.destroy() });
      }
    } else {
      if (this.shadowDanceCharge < 35) return;
      this.shadowDanceCharge = 0;
      player.heal(38);
    }
    const flash = scene.add.circle(player.x, player.y, 40, 0x8800cc, 0.5).setDepth(8);
    scene.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
  }

  /** Player-only: NPC never uses black hole. */
  doStartBlackHole(x: number, y: number): void {
    const scene = this.arena.scene;
    this.shadowBlackHoleActive = true;
    this.shadowBlackHoleEnd = scene.time.now + 3000;
    this.shadowBlackHoleX = x;
    this.shadowBlackHoleY = y;
    this.shadowBlackHoleDamageAccum = 0;
    this.shadowBlackHoleHealAccum = 0;
    if (this.shadowBlackHoleSprite) this.shadowBlackHoleSprite.destroy();
    this.shadowBlackHoleSprite = scene.add.graphics().setDepth(5);
  }

  // ── Per-frame update (runs before NPC AI so cast state is fresh) ──────

  update(time: number, delta: number, isPlayerShadow: boolean, isNpcShadow: boolean): void {
    if (!isPlayerShadow && !isNpcShadow) return;
    const { player, npc, enemies, scene } = this.arena;

    // Dark cloud ticks (both owners)
    for (let ci = this.shadowDarkClouds.length - 1; ci >= 0; ci--) {
      const cloud = this.shadowDarkClouds[ci];
      if (time >= cloud.expiresAt) {
        cloud.sprite.destroy();
        this.shadowDarkClouds.splice(ci, 1);
        continue;
      }
      cloud.tickAccum += delta;
      if (cloud.tickAccum >= 400) {
        cloud.tickAccum -= 400;
        if (cloud.owner === 'player') {
          // Heal player, damage NPC
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, player.x, player.y) <= cloud.radius + 14) {
            const prevHp = player.hp;
            player.heal(1.5);
            const healed = player.hp - prevHp;
            if (healed > 0) {
              this.shadowDanceCharge = Math.min(35, this.shadowDanceCharge + healed * 2);
            }
          }
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(cloud.x, cloud.y, t.x, t.y) <= cloud.radius + 14) {
              t.takeDamage(2);
              this.arena.spawnHitFlash(t.x, t.y, 0x660088);
            }
          }
        } else {
          // NPC cloud: heal NPC, damage player
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, npc.x, npc.y) <= cloud.radius + 14) {
            const prevNpcHp = npc.hp;
            npc.heal(1.5);
            const npcHealed = npc.hp - prevNpcHp;
            if (npcHealed > 0) {
              this.npcShadowDanceCharge = Math.min(35, this.npcShadowDanceCharge + npcHealed);
            }
          }
          if (Phaser.Math.Distance.Between(cloud.x, cloud.y, player.x, player.y) <= cloud.radius + 14) {
            player.takeDamage(2);
          }
        }
      }
    }

    // Snap trap checks
    for (let ti = this.shadowSnapTraps.length - 1; ti >= 0; ti--) {
      const trap = this.shadowSnapTraps[ti];
      if (time >= trap.expiresAt || trap.triggered) {
        trap.sprite.destroy(); trap.label.destroy();
        this.shadowSnapTraps.splice(ti, 1);
        continue;
      }
      if (trap.owner === 'player') {
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(trap.x, trap.y, t.x, t.y) <= trap.radius + 10) {
            trap.triggered = true;
            this.arena.recordMasteryStat('trapped', 1);
            const dmg = trap.isPlume ? 28 : 20;
            t.takeDamage(dmg);
            this.arena.spawnHitFlash(t.x, t.y, trap.isPlume ? 0x9933cc : 0xcc44ff);
            if (trap.isPlume) {
              for (let ci = 0; ci < 5; ci++) {
                const jx = trap.x + Phaser.Math.Between(-60, 60);
                const jy = trap.y + Phaser.Math.Between(-60, 60);
                const cloud = scene.add.circle(jx, jy, 28, 0x6633aa, 0.55).setDepth(5);
                scene.tweens.add({ targets: cloud, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 1200, onComplete: () => cloud.destroy() });
                if (Phaser.Math.Distance.Between(jx, jy, t.x, t.y) <= 50) {
                  t.takeDamage(5);
                  this.arena.spawnHitFlash(t.x, t.y, 0x9933cc);
                }
              }
              this.arena.showFloatingText(trap.x, trap.y - 20, '💨 PLUME', '#cc88ff');
            } else {
              this.shadowNpcStunnedUntil = time + 2000;
            }
            break;
          }
        }
      } else {
        if (Phaser.Math.Distance.Between(trap.x, trap.y, player.x, player.y) <= trap.radius + 10) {
          trap.triggered = true;
          const dmg = trap.isPlume ? 28 : 20;
          player.takeDamage(dmg);
          this.arena.spawnHitFlash(player.x, player.y, trap.isPlume ? 0x9933cc : 0xcc44ff);
          if (trap.isPlume) {
            for (let ci = 0; ci < 5; ci++) {
              const jx = trap.x + Phaser.Math.Between(-60, 60);
              const jy = trap.y + Phaser.Math.Between(-60, 60);
              const cloud = scene.add.circle(jx, jy, 28, 0x6633aa, 0.55).setDepth(5);
              scene.tweens.add({ targets: cloud, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 1200, onComplete: () => cloud.destroy() });
              if (Phaser.Math.Distance.Between(jx, jy, player.x, player.y) <= 50) {
                player.takeDamage(5);
                this.arena.spawnHitFlash(player.x, player.y, 0x9933cc);
              }
            }
            this.arena.showFloatingText(trap.x, trap.y - 20, '💨 PLUME', '#cc88ff');
          } else {
            this.shadowPlayerStunnedUntil = time + 2000;
          }
        }
      }
    }

    // ── Player shadow per-frame ─────────────────────────────────────
    if (isPlayerShadow) {
      const ptr = scene.input.activePointer;

      // Tentacle draw + drag
      if (this.shadowTentacleActive) {
        if (time >= this.shadowTentacleEnd) {
          this.shadowTentacleActive = false;
          this.shadowTentacleHooked = false;
          if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
        } else {
          const tSpr = this.shadowTentacleSprite;
          if (tSpr) {
            tSpr.clear();
            if (this.shadowTentacleHooked) {
              // Hooked: draw from player to NPC, show drag chain
              tSpr.lineStyle(6, 0x8800cc, 0.85);
              tSpr.lineBetween(player.x, player.y, npc.x, npc.y);
              tSpr.lineStyle(2, 0xcc44ff, 0.5);
              tSpr.lineBetween(player.x, player.y, npc.x, npc.y);
            } else {
              // Miss/drag: track cursor for trap drag (R+)
              if (this.arena.hasUpgrade('r')) {
                this.shadowTentacleX = ptr.worldX;
                this.shadowTentacleY = ptr.worldY;
              }
              tSpr.lineStyle(4, 0x8800cc, 0.6);
              tSpr.lineBetween(player.x, player.y, this.shadowTentacleX, this.shadowTentacleY);
            }
          }
        }
      }

      // (NPC drag + stun handled in updateAfterAI so they take effect)

      // Shadow dance charge bar (small bar above player)
      if (!this.shadowDanceChargeBar) {
        this.shadowDanceChargeBar = scene.add.rectangle(
          player.x, player.y - 40, 0, 5, 0x8800cc, 0.8,
        ).setDepth(12).setOrigin(0, 0.5);
      }
      const barMaxW = 40;
      const barX = player.x - barMaxW / 2;
      this.shadowDanceChargeBar.setPosition(barX, player.y - 40);
      this.shadowDanceChargeBar.setSize(Math.min(barMaxW, (this.shadowDanceCharge / 35) * barMaxW), 5);
      this.shadowDanceChargeBar.setFillStyle(this.shadowDanceCharge >= 35 ? 0x888888 : 0x8800cc, 0.8);

      // Darkness bar pinned to the HUD, just below the top-of-screen HP bar
      const dW = this.arena.width;
      const dBarY = this.arena.hpBarY + this.arena.hpBarH / 2 + 8;
      const dBarH = 10;
      const dLeft = dW / 2 - this.arena.hpBarW / 2;
      if (!this.darknessBarBg) {
        this.darknessBarBg = scene.add.rectangle(dW / 2, dBarY, this.arena.hpBarW + 4, dBarH + 4, 0x0a0a18, 0.9)
          .setStrokeStyle(2, 0x445577).setDepth(20);
        this.darknessBarFill = scene.add.rectangle(dLeft, dBarY, 0, dBarH, 0x8800cc, 1)
          .setOrigin(0, 0.5).setDepth(21);
      }
      if (this.darknessBarFill) {
        const dRatio = Math.min(1, this.shadowDanceCharge / 35);
        this.darknessBarFill.setSize(this.arena.hpBarW * dRatio, dBarH);
        this.darknessBarFill.setFillStyle(this.shadowDanceCharge >= 35 ? 0xcc88ff : 0x8800cc, 1);
      }

      // Black hole active: draw + tick damage + Q+ effects (enemy drag handled in updateAfterAI)
      if (this.shadowBlackHoleActive) {
        if (time >= this.shadowBlackHoleEnd) {
          this.shadowBlackHoleActive = false;
          if (this.shadowBlackHoleSprite) { this.shadowBlackHoleSprite.destroy(); this.shadowBlackHoleSprite = null; }
        } else {
          // Follow the live cursor for the duration of the effect
          const bhPtr = scene.input.activePointer;
          this.shadowBlackHoleX = bhPtr.worldX;
          this.shadowBlackHoleY = bhPtr.worldY;

          if (this.shadowBlackHoleSprite) {
            const pulse = 18 + Math.sin(time * 0.006) * 4;
            this.shadowBlackHoleSprite.clear();
            this.shadowBlackHoleSprite.fillStyle(0x000000, 0.6);
            this.shadowBlackHoleSprite.fillCircle(this.shadowBlackHoleX, this.shadowBlackHoleY, pulse);
            this.shadowBlackHoleSprite.lineStyle(3, 0x8800cc, 0.85);
            this.shadowBlackHoleSprite.strokeCircle(this.shadowBlackHoleX, this.shadowBlackHoleY, pulse + 8);
          }

          // Tick damage to enemy, 5/sec, regardless of position
          this.shadowBlackHoleDamageAccum += delta;
          if (this.shadowBlackHoleDamageAccum >= 1000) {
            this.shadowBlackHoleDamageAccum -= 1000;
            npc.takeDamage(5);
            this.arena.spawnHitFlash(npc.x, npc.y, 0x8800cc);
            this.arena.showFloatingText(npc.x, npc.y - 30, '-5', '#cc44ff');
          }

          // Q+ Void Singularity: heal caster + spawn shadow clouds right on the black hole
          if (this.arena.hasUpgrade('q')) {
            this.shadowBlackHoleHealAccum += delta;
            if (this.shadowBlackHoleHealAccum >= 1000) {
              this.shadowBlackHoleHealAccum -= 1000;
              player.heal(15);
              this.arena.showFloatingText(player.x, player.y - 40, '+15', '#66ff99');
            }
            this.shadowBHPuddleAccum += delta;
            if (this.shadowBHPuddleAccum >= 500) {
              this.shadowBHPuddleAccum -= 500;
              this.spawnDarkCloud(this.shadowBlackHoleX, this.shadowBlackHoleY, 'player');
            }
          }
        }
      }

      // Click+ confusion: track NPC exposure to player clouds
      if (this.arena.hasUpgrade('click')) {
        const npcInCloud = this.shadowDarkClouds.some(
          c => c.owner === 'player' && Phaser.Math.Distance.Between(c.x, c.y, npc.x, npc.y) <= c.radius + 14,
        );
        if (npcInCloud) {
          this.shadowCloudExposureAccum += delta;
          if (this.shadowCloudExposureAccum >= 3000 && time > this.shadowConfusionUntil) {
            this.shadowConfusionUntil = time + 6000;
            this.shadowCloudExposureAccum = 0;
            this.arena.spawnHitFlash(npc.x, npc.y, 0x8800cc);
            const confTxt = scene.add.text(npc.x, npc.y - 30, '😵 CONFUSED', { fontSize: '11px', color: '#cc44ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
            scene.tweens.add({ targets: confTxt, y: confTxt.y - 20, alpha: 0, duration: 1200, onComplete: () => confTxt.destroy() });
          }
        } else {
          this.shadowCloudExposureAccum = Math.max(0, this.shadowCloudExposureAccum - delta * 0.5);
        }
      }

      // R+ snap trap drag: traps near tentacle endpoint follow it
      if (this.arena.hasUpgrade('r') && this.shadowTentacleActive) {
        const tipX = this.shadowTentacleHooked ? npc.x : this.shadowTentacleX;
        const tipY = this.shadowTentacleHooked ? npc.y : this.shadowTentacleY;
        for (const trap of this.shadowSnapTraps) {
          if (trap.owner !== 'player' || trap.triggered) continue;
          if (Phaser.Math.Distance.Between(trap.x, trap.y, tipX, tipY) <= 55) {
            trap.x = tipX;
            trap.y = tipY;
            trap.sprite.setPosition(tipX, tipY);
            trap.label.setPosition(tipX, tipY);
          }
        }
      }

      // Shadow Mastery — Dark Resonance: slow passive darkness regen
      if (this.arena.masteryActive) {
        this.darkResonanceAccum += delta;
        if (this.darkResonanceAccum >= 1500) {
          this.darkResonanceAccum -= 1500;
          if (this.shadowDanceCharge < 35) this.shadowDanceCharge = Math.min(35, this.shadowDanceCharge + 2);
        }
      }

      // Shadow Mastery — Final Eclipse: channelled beam that burns darkness
      if (this.finalEclipseActive) this.updateFinalEclipse(time, delta);
    }

    // ── NPC shadow per-frame ────────────────────────────────────────
    if (isNpcShadow) {
      // NPC tentacle
      if (this.npcShadowTentacleActive) {
        if (time >= this.npcShadowTentacleEnd) {
          this.npcShadowTentacleActive = false;
          this.npcShadowTentacleHooked = false;
          if (this.npcShadowTentacleSprite) { this.npcShadowTentacleSprite.destroy(); this.npcShadowTentacleSprite = null; }
        } else {
          if (this.npcShadowTentacleSprite) {
            this.npcShadowTentacleSprite.clear();
            if (this.npcShadowTentacleHooked) {
              // Draw tentacle from NPC to player
              this.npcShadowTentacleSprite.lineStyle(6, 0x440066, 0.9);
              this.npcShadowTentacleSprite.lineBetween(npc.x, npc.y, player.x, player.y);
              this.npcShadowTentacleSprite.lineStyle(2, 0x8800cc, 0.5);
              this.npcShadowTentacleSprite.lineBetween(npc.x, npc.y, player.x, player.y);
            } else {
              // Miss whip
              const angle = Math.atan2(player.y - npc.y, player.x - npc.x);
              this.npcShadowTentacleSprite.lineStyle(4, 0x440066, 0.6);
              this.npcShadowTentacleSprite.lineBetween(
                npc.x, npc.y,
                npc.x + Math.cos(angle) * 100,
                npc.y + Math.sin(angle) * 100,
              );
            }
          }

          // Periodically pick a new random drag target
          if (this.npcShadowTentacleHooked && time >= this.npcShadowDragNextChangeAt) {
            const { width, height } = this.arena;
            this.npcShadowDragTargetX = Phaser.Math.Between(80, width - 80);
            this.npcShadowDragTargetY = Phaser.Math.Between(80, height - 80);
            this.npcShadowDragNextChangeAt = time + 700;
          }
        }
      }

      // Player stun from NPC snap trap
      if (time < this.shadowPlayerStunnedUntil) {
        (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }

      // NPC black hole (P2 shadow Q ability): chargeup → activation
      if (this.npcShadowBlackHoleCharging) {
        if (this.npcShadowBlackHoleChargeVisual) {
          this.npcShadowBlackHoleChargeVisual.setPosition(npc.x, npc.y);
        }
        if (time >= this.npcShadowBlackHoleChargeStart + 3000) {
          this.npcShadowBlackHoleCharging = false;
          this.arena.npcNukeChanneling = false;
          if (this.npcShadowBlackHoleChargeVisual) { this.npcShadowBlackHoleChargeVisual.destroy(); this.npcShadowBlackHoleChargeVisual = null; }
          this.npcShadowBlackHoleActive = true;
          this.npcShadowBlackHoleEnd = time + 10000;
          this.npcShadowBlackHoleSprite = scene.add.graphics().setDepth(5);
        }
      }

      // NPC black hole active: draw + pull player toward NPC
      if (this.npcShadowBlackHoleActive) {
        if (time >= this.npcShadowBlackHoleEnd) {
          this.npcShadowBlackHoleActive = false;
          if (this.npcShadowBlackHoleSprite) { this.npcShadowBlackHoleSprite.destroy(); this.npcShadowBlackHoleSprite = null; }
        } else {
          if (this.npcShadowBlackHoleSprite) {
            const pulse = 18 + Math.sin(time * 0.006) * 4;
            this.npcShadowBlackHoleSprite.clear();
            this.npcShadowBlackHoleSprite.fillStyle(0x000000, 0.6);
            this.npcShadowBlackHoleSprite.fillCircle(npc.x, npc.y, pulse);
            this.npcShadowBlackHoleSprite.lineStyle(3, 0x8800cc, 0.85);
            this.npcShadowBlackHoleSprite.strokeCircle(npc.x, npc.y, pulse + 8);
          }
          // Pull player toward NPC
          const bDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
          if (bDist > 12) {
            const bAngle = Math.atan2(npc.y - player.y, npc.x - player.x);
            (player.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(bAngle) * 67, Math.sin(bAngle) * 67);
          }
        }
      }
    }
  }

  // ── Post-AI overrides (must run after doAI so drag velocities win) ────

  updateAfterAI(time: number, delta: number): void {
    const { player, npc, enemies, scene } = this.arena;
    const nBody = npc.body as Phaser.Physics.Arcade.Body;

    // Black hole: violently drag the enemy to the cursor
    if (this.shadowBlackHoleActive && time < this.shadowBlackHoleEnd) {
      const bhDist = Phaser.Math.Distance.Between(this.shadowBlackHoleX, this.shadowBlackHoleY, npc.x, npc.y);
      if (bhDist > 12) {
        const bhAngle = Math.atan2(this.shadowBlackHoleY - npc.y, this.shadowBlackHoleX - npc.x);
        nBody.setVelocity(Math.cos(bhAngle) * 550, Math.sin(bhAngle) * 550);
      } else {
        nBody.setVelocity(0, 0);
      }
    }

    // Tentacle: drag NPC toward cursor
    if (this.shadowTentacleHooked && this.shadowTentacleActive) {
      // E+ consume trigger: NPC dragged to player
      if (this.arena.hasUpgrade('e') && !this.shadowConsumeActive) {
        const cDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        if (cDist <= 22) {
          this.shadowConsumeActive = true;
          this.arena.recordMasteryStat('consumed', 1);
          this.shadowConsumeEnd = time + 3000;
          this.shadowConsumeTickAccum = 0;
          this.shadowTentacleActive = false;
          this.shadowTentacleHooked = false;
          if (this.shadowTentacleSprite) { this.shadowTentacleSprite.destroy(); this.shadowTentacleSprite = null; }
          if (this.shadowConsumeAura) this.shadowConsumeAura.destroy();
          this.shadowConsumeAura = scene.add.circle(player.x, player.y, 30, 0x8800cc, 0.4).setDepth(7);
          scene.tweens.add({ targets: this.shadowConsumeAura, alpha: 0.85, yoyo: true, repeat: -1, duration: 180 });
        }
      }
      if (!this.shadowConsumeActive) {
        const tMx = scene.input.activePointer.worldX;
        const tMy = scene.input.activePointer.worldY;
        const dragDist = Phaser.Math.Distance.Between(npc.x, npc.y, tMx, tMy);
        if (dragDist > 20) {
          const dragAngle = Math.atan2(tMy - npc.y, tMx - npc.x);
          nBody.setVelocity(Math.cos(dragAngle) * 200, Math.sin(dragAngle) * 200);
        } else {
          nBody.setVelocity(0, 0);
        }
      }
    }

    // E+ consume: NPC held at player position, taking damage
    if (this.shadowConsumeActive) {
      const cBody = npc.body as Phaser.Physics.Arcade.Body;
      if (time >= this.shadowConsumeEnd) {
        this.shadowConsumeActive = false;
        if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
      } else {
        cBody.reset(player.x, player.y);
        cBody.setVelocity(0, 0);
        if (this.shadowConsumeAura) this.shadowConsumeAura.setPosition(player.x, player.y);
        this.shadowConsumeTickAccum += delta;
        if (this.shadowConsumeTickAccum >= 1000) {
          this.shadowConsumeTickAccum -= 1000;
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            t.takeDamage(2);
            this.arena.spawnHitFlash(t.x, t.y, 0x8800cc);
          }
        }
      }
    }

    // Stun from snap trap
    if (time < this.shadowNpcStunnedUntil) nBody.setVelocity(0, 0);

    // Click+ confusion: random movement
    if (this.arena.hasUpgrade('click') && time < this.shadowConfusionUntil) {
      if (time >= this.shadowConfusionNextChange) {
        this.shadowConfusionAngle = Math.random() * Math.PI * 2;
        this.shadowConfusionNextChange = time + Phaser.Math.Between(400, 800);
      }
      const confBody = npc.body as Phaser.Physics.Arcade.Body;
      confBody.setVelocity(
        Math.cos(this.shadowConfusionAngle) * 130 * this.arena.npcSpeedMult,
        Math.sin(this.shadowConfusionAngle) * 130 * this.arena.npcSpeedMult,
      );
    }
  }

  // ── Shadow Mastery: Final Eclipse ──────────────────────────────────────

  /** The slot Final Eclipse is bound over this match, or null when it isn't bound anywhere. */
  private finalEclipseSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'final-eclipse') return s;
    }
    return null;
  }

  private toggleFinalEclipse(time: number): void {
    if (this.finalEclipseActive) {
      this.endFinalEclipse();
      return;
    }
    if (this.shadowDanceCharge < 35 * 0.2) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'NEED DARKNESS', '#888888');
      return;
    }
    const player = this.arena.player;
    const ptr = this.arena.scene.input.activePointer;
    this.finalEclipseActive = true;
    this.finalEclipseAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    this.finalEclipseTickAccum = 0;
    if (!this.finalEclipseSprite) this.finalEclipseSprite = this.arena.scene.add.graphics().setDepth(6);
    this.arena.showFloatingText(player.x, player.y - 30, '🌑 FINAL ECLIPSE', '#000000');
  }

  private endFinalEclipse(): void {
    this.finalEclipseActive = false;
    if (this.finalEclipseSprite) { this.finalEclipseSprite.destroy(); this.finalEclipseSprite = null; }
  }

  private updateFinalEclipse(time: number, delta: number): void {
    const { player, enemies, scene } = this.arena;

    if (this.shadowDanceCharge <= 0) {
      this.endFinalEclipse();
      return;
    }

    // Rotate toward the cursor, but very slowly (25 deg/sec max).
    const ptr = scene.input.activePointer;
    const targetAngle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    const maxTurn = Phaser.Math.DegToRad(25) * (delta / 1000);
    const diff = Phaser.Math.Angle.Wrap(targetAngle - this.finalEclipseAngle);
    this.finalEclipseAngle += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);

    const endX = player.x + Math.cos(this.finalEclipseAngle) * 1200;
    const endY = player.y + Math.sin(this.finalEclipseAngle) * 1200;
    if (this.finalEclipseSprite) {
      this.finalEclipseSprite.clear();
      this.finalEclipseSprite.lineStyle(24, 0x000000, 0.5);
      this.finalEclipseSprite.lineBetween(player.x, player.y, endX, endY);
      this.finalEclipseSprite.lineStyle(10, 0x8800cc, 0.85);
      this.finalEclipseSprite.lineBetween(player.x, player.y, endX, endY);
    }

    // Burn 20% of the darkness bar per second.
    this.shadowDanceCharge = Math.max(0, this.shadowDanceCharge - (35 * 0.2 / 1000) * delta);

    // 2 damage every 0.1s to anything the thick beam is touching.
    this.finalEclipseTickAccum += delta;
    if (this.finalEclipseTickAccum >= 100) {
      this.finalEclipseTickAccum -= 100;
      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (this.distToSegment(t.x, t.y, player.x, player.y, endX, endY) <= 32) {
          t.takeDamage(2);
          this.arena.spawnHitFlash(t.x, t.y, 0x000000);
        }
      }
    }

    if (this.shadowDanceCharge <= 0) this.endFinalEclipse();
  }

  private distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1) : 0;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Phaser.Math.Distance.Between(px, py, cx, cy);
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    if (pointer.isDown) {
      this.shadowDrainHoldAccum += delta;
      if (this.shadowDrainHoldAccum >= 300) {
        // Cloud mode: spawn dark cloud every 600ms
        this.shadowDrainCloudAccum += delta;
        if (this.shadowDrainCloudAccum >= 600) {
          this.shadowDrainCloudAccum -= 600;
          this.spawnDarkCloud(mouseX, mouseY, 'player');
        }
      }
    } else {
      if (this.arena.pointerWasDown && this.shadowDrainHoldAccum < 300) {
        // Tap: launch dark bomb
        player.castAbility('dark-drain', playerCtx);
      }
      this.shadowDrainHoldAccum = 0;
      this.shadowDrainCloudAccum = 0;
    }
    // Shadow Mastery — Final Eclipse may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const eclipseSlot = this.finalEclipseSlot();

    if (eclipseSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.toggleFinalEclipse(time);
    } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.shadowConsumeActive && this.arena.hasUpgrade('e')) {
        // Throw NPC toward cursor — stun briefly so AI doesn't cancel velocity
        this.shadowConsumeActive = false;
        if (this.shadowConsumeAura) { this.shadowConsumeAura.destroy(); this.shadowConsumeAura = null; }
        const throwAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(
          Math.cos(throwAngle) * 800, Math.sin(throwAngle) * 800,
        );
        this.shadowNpcThrowUntil = Math.max(this.shadowNpcThrowUntil, time + 600);
      } else {
        player.castAbility('tentacle', playerCtx);
      }
    }
    if (eclipseSlot === 'r') {
      if (Phaser.Input.Keyboard.JustDown(rKey)) this.toggleFinalEclipse(time);
    } else if (Phaser.Input.Keyboard.JustDown(rKey)) {
      player.castAbility('snap-trap', playerCtx);
    }
    if (eclipseSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(fKey)) this.toggleFinalEclipse(time);
    } else if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (this.arena.hasUpgrade('f')) {
        if (this.shadowDanceCharge > 0 && time >= this.shadowDanceUpgradeCooldownUntil) {
          player.castAbility('shadow-dance', playerCtx);
        }
      } else if (this.shadowDanceCharge >= 35) {
        player.castAbility('shadow-dance', playerCtx);
      }
    }
    if (eclipseSlot === 'q') {
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.toggleFinalEclipse(time);
    } else if (Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('black-hole', playerCtx);
    }
  }
}
