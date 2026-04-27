import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';

interface StormCloud {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  expiresAt: number;
  pulseAccum: number;
  owner: 'player';
}

interface BallLightning {
  proj: Phaser.GameObjects.Image & { isFromPlayer?: boolean };
  tier: 1 | 2 | 3 | 4; // 1=25k, 2=50k, 3=75k, 4=100k
  expiresAt: number;
  shockAccum: number;
  lastHitByEnemy: Map<Fighter, number>;
}

// ── ElectricityArenaApi ───────────────────────────────────────────────────

export interface ElectricityArenaApi {
  readonly player: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  get playerSpeedMult(): number;
  set playerSpeedMult(v: number);
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter;
  buildPlayerContext(x: number, y: number): CastContext;
}

// ── ElectricityKit ────────────────────────────────────────────────────────

export class ElectricityKit {
  // HUD
  private kineticPowerText: Phaser.GameObjects.Text | null = null;

  // Kinetic power
  private kineticPower = 0;

  // Electro dash recast
  private electroDashCanRecast = false;
  private electroDashRecastExpiry = 0;

  // Pain battery
  private painBatteryHolding = false;
  private painBatteryHoldStart = 0;
  private painBatterySelfDmgDealt = 0;
  private painBatteryTickAccum = 0;
  private painBatteryVisual: Phaser.GameObjects.Arc | null = null;

  // Overcharge (Q ability)
  private overchargeActive = false;
  private overchargeUntil = 0;
  private overchargeVisual: Phaser.GameObjects.Arc | null = null;

  // Regen (repurposed by F+ jumpstart; no longer used by base Restart revive)
  private electricRegenActive = false;
  private electricRegenSecondsLeft = 0;
  private electricRegenAccum = 0;

  // Per-projectile shock tracking
  private electroShockTimers: Map<Projectile, { count: number; last: number }> = new Map();

  // Click+ ball lightning
  private clickHoldStart = 0;
  private clickHolding = false;
  private clickKineticDrained = 0;
  private ballLightnings: BallLightning[] = [];

  // E+ storm clouds
  private stormClouds: StormCloud[] = [];

  // Phoenix perk
  private playerPhoenixUntil = 0;
  private playerPhoenixSpeedBaseline = 1;
  private playerPhoenixFlames: { sprite: Phaser.GameObjects.Arc; x: number; y: number; expiresAt: number; healSecondsLeft: number; healTickAccum: number }[] = [];
  private playerPhoenixFlameAccum = 0;
  private playerPhoenixAura: Phaser.GameObjects.Arc | null = null;

  constructor(private arena: ElectricityArenaApi) {}

  // ── Public accessors ──────────────────────────────────────────────────

  getKineticPower(): number { return this.kineticPower; }
  isOverchargeActive(): boolean { return this.overchargeActive; }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  // isPlayerElement: only true when the player picked electricity
  reset(isPlayerElement: boolean): void {
    // Destroy any lingering game objects from the previous match
    if (this.kineticPowerText) { this.kineticPowerText.destroy(); this.kineticPowerText = null; }
    if (this.painBatteryVisual) { this.painBatteryVisual.destroy(); this.painBatteryVisual = null; }
    if (this.overchargeVisual) { this.overchargeVisual.destroy(); this.overchargeVisual = null; }

    this.kineticPower = 0;
    this.electroDashCanRecast = false;
    this.electroDashRecastExpiry = 0;
    this.painBatteryHolding = false;
    this.painBatteryHoldStart = 0;
    this.painBatterySelfDmgDealt = 0;
    this.painBatteryTickAccum = 0;
    this.overchargeActive = false;
    this.overchargeUntil = 0;
    this.electricRegenActive = false;
    this.electricRegenSecondsLeft = 0;
    this.electricRegenAccum = 0;
    this.electroShockTimers = new Map();
    this.clickHolding = false;
    this.clickHoldStart = 0;
    this.clickKineticDrained = 0;
    for (const bl of this.ballLightnings) bl.proj.destroy();
    this.ballLightnings = [];
    for (const sc of this.stormClouds) sc.sprite.destroy();
    this.stormClouds = [];

    this.playerPhoenixUntil = 0;
    this.playerPhoenixSpeedBaseline = 1;
    for (const f of this.playerPhoenixFlames) f.sprite.destroy();
    this.playerPhoenixFlames = [];
    this.playerPhoenixFlameAccum = 0;
    if (this.playerPhoenixAura) { this.playerPhoenixAura.destroy(); this.playerPhoenixAura = null; }

    if (isPlayerElement) {
      const scene = this.arena.scene;
      const cx = scene.scale.width / 2;
      const cap = this.arena.hasUpgrade('r') ? 100 : 50;
      this.kineticPowerText = scene.add.text(cx, 52, `⚡ 0/${cap}`, {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#ffee00',
        stroke: '#664400', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
    }
  }

  // Called from ArenaScene's player 'damaged' event
  onDamageReceived(amount: number, time: number): void {
    if (amount <= 0) return;
    const cap = this.arena.hasUpgrade('r') ? 100 : 50;
    this.kineticPower = Math.min(cap, this.kineticPower + amount);
    this.updateHud(cap);

    const player = this.arena.player;

    // Cancel regen if hit while regenerating
    if (this.electricRegenActive) {
      this.electricRegenActive = false;
      this.arena.showFloatingText(player.x, player.y - 20, 'Regen cancelled', '#ffee00');
    }

    // Overcharge: prevent death (intercept before 'defeated' fires)
    if (this.overchargeActive && player.hp <= 0) {
      this.overchargeActive = false;
      if (this.overchargeVisual) { this.overchargeVisual.destroy(); this.overchargeVisual = null; }
      // Revive to HP equal to kinetic power, consuming all kinetic
      player.hp = Math.max(1, Math.min(player.maxHp, this.kineticPower));
      this.kineticPower = 0;
      this.updateHud(cap);
      this.arena.showFloatingText(player.x, player.y - 30, 'RESTARTED!', '#ffee00');
      const flash = this.arena.scene.add.circle(player.x, player.y, 12, 0xffee00, 0.8).setDepth(10);
      this.arena.scene.tweens.add({ targets: flash, scaleX: 6, scaleY: 6, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
      if (this.arena.hasPerk('player', 'phoenix')) this._activatePhoenix(time);
      return;
    }

    // Q+ auto-restart on death (if Q+ upgrade owned, overcharge not yet active, Q on cooldown)
    if (this.arena.hasUpgrade('q') && player.hp <= 0 && !this.overchargeActive) {
      if (player.getCooldownRatio('restart') >= 1) {
        player.triggerCooldown('restart');
        player.hp = Math.max(1, Math.min(player.maxHp, Math.floor(this.kineticPower / 2)));
        this.kineticPower = 0;
        this.updateHud(cap);
        this.arena.showFloatingText(player.x, player.y - 30, 'AUTO-RESTARTED!', '#ffee00');
        const flash = this.arena.scene.add.circle(player.x, player.y, 12, 0xffee00, 0.8).setDepth(10);
        this.arena.scene.tweens.add({ targets: flash, scaleX: 6, scaleY: 6, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
        if (this.arena.hasPerk('player', 'phoenix')) this._activatePhoenix(time);
      }
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { player, enemies, projectiles } = this.arena;
    const cap = this.arena.hasUpgrade('r') ? 100 : 50;
    this.updateHud(cap);

    // Overcharge visual follow + expiry
    if (this.overchargeActive) {
      if (this.overchargeVisual) this.overchargeVisual.setPosition(player.x, player.y);
      if (time >= this.overchargeUntil) {
        this.overchargeActive = false;
        if (this.overchargeVisual) { this.overchargeVisual.destroy(); this.overchargeVisual = null; }
      }
    }

    // Regen ticks (5 HP/sec when active)
    if (this.electricRegenActive && this.electricRegenSecondsLeft > 0) {
      this.electricRegenAccum += delta;
      const tickMs = 200; // 5 HP/s
      while (this.electricRegenAccum >= tickMs) {
        this.electricRegenAccum -= tickMs;
        player.heal(1);
        this.electricRegenSecondsLeft = Math.max(0, this.electricRegenSecondsLeft - (tickMs / 1000));
        if (this.electricRegenSecondsLeft <= 0) { this.electricRegenActive = false; break; }
      }
    }

    // Pain battery visual follow
    if (this.painBatteryHolding && this.painBatteryVisual) {
      this.painBatteryVisual.setPosition(player.x, player.y);
    }

    // Electro dash recast window expiry
    if (this.electroDashCanRecast && time >= this.electroDashRecastExpiry) {
      this.electroDashCanRecast = false;
    }

    // Shock logic: electro balls near enemies
    // 20+ kinetic: shocks once; 50+ kinetic: shocks twice (300ms apart)
    const shockRadius = this.kineticPower >= 50 ? 120 : 80;
    const maxShocks = this.kineticPower >= 50 ? 2 : 1;
    if (this.kineticPower >= 20) {
      for (const go of projectiles.getChildren()) {
        const proj = go as Projectile;
        if (!proj.active || proj.texture.key !== 'proj-electro' || !proj.isFromPlayer) continue;
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, t.x, t.y);
          if (dist <= shockRadius) {
            const shockData = this.electroShockTimers.get(proj) ?? { count: 0, last: 0 };
            if (shockData.count < maxShocks && (shockData.count === 0 || time - shockData.last >= 300)) {
              shockData.count++;
              shockData.last = time;
              this.electroShockTimers.set(proj, shockData);
              t.takeDamage(4);
              this.arena.spawnHitFlash(t.x, t.y, 0xffee00);
              this.arena.showFloatingText(t.x, t.y - 20, '4', '#ffee00');
              const arc = this.arena.scene.add.graphics().setDepth(8);
              arc.lineStyle(2, 0xffff88, 0.9);
              arc.lineBetween(proj.x, proj.y, t.x, t.y);
              this.arena.scene.time.delayedCall(80, () => arc.destroy());
            }
          }
        }
      }
    }
    // Clean up shock timer map for destroyed projectiles
    for (const [proj] of this.electroShockTimers) {
      if (!proj.active) this.electroShockTimers.delete(proj);
    }

    // Click+ ball lightning update
    for (let i = this.ballLightnings.length - 1; i >= 0; i--) {
      const bl = this.ballLightnings[i];
      if (!bl.proj.active || time >= bl.expiresAt) {
        bl.proj.destroy();
        this.ballLightnings.splice(i, 1);
        continue;
      }

      // Contact damage with 1s per-enemy cooldown
      for (const t of enemies) {
        if (!t.active || t.hp <= 0) continue;
        const dist = Phaser.Math.Distance.Between(bl.proj.x, bl.proj.y, t.x, t.y);
        const hitRadius = 14 + (bl.tier - 1) * 5;
        if (dist <= hitRadius) {
          const lastHit = bl.lastHitByEnemy.get(t) ?? 0;
          if (time - lastHit >= 1000) {
            bl.lastHitByEnemy.set(t, time);
            const dmgTable = [18, 28, 40, 55];
            t.takeDamage(dmgTable[bl.tier - 1]);
            this.arena.spawnHitFlash(t.x, t.y, 0xcc88ff);
            this.arena.showFloatingText(t.x, t.y - 20, `${dmgTable[bl.tier - 1]}`, '#cc88ff');
          }
        }
      }

      // Shock aura pulse
      const cadenceTable = [1000, 500, 500, 333];
      const shockRadiusTable = [80, 100, 120, 140];
      bl.shockAccum += delta;
      if (bl.shockAccum >= cadenceTable[bl.tier - 1]) {
        bl.shockAccum -= cadenceTable[bl.tier - 1];
        const sRadius = shockRadiusTable[bl.tier - 1];
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(bl.proj.x, bl.proj.y, t.x, t.y) <= sRadius) {
            t.takeDamage(4);
            this.arena.spawnHitFlash(t.x, t.y, 0xffee00);
            this.arena.showFloatingText(t.x, t.y - 20, '4', '#ffee00');
            const arc = this.arena.scene.add.graphics().setDepth(8);
            arc.lineStyle(2, 0xffff88, 0.9);
            arc.lineBetween(bl.proj.x, bl.proj.y, t.x, t.y);
            this.arena.scene.time.delayedCall(80, () => arc.destroy());
          }
        }
      }
    }

    // E+ storm cloud update
    for (let i = this.stormClouds.length - 1; i >= 0; i--) {
      const sc = this.stormClouds[i];
      if (time >= sc.expiresAt) {
        sc.sprite.destroy();
        this.stormClouds.splice(i, 1);
        continue;
      }
      sc.pulseAccum += delta;
      if (sc.pulseAccum >= 2000) {
        sc.pulseAccum -= 2000;
        // Lightning pulse AoE
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(sc.x, sc.y, t.x, t.y) <= 70) {
            t.takeDamage(18);
            this.arena.spawnHitFlash(t.x, t.y, 0x88ccff);
            this.arena.showFloatingText(t.x, t.y - 20, '18', '#88ccff');
          }
        }
        // Visual flash at cloud center
        const bolt = this.arena.scene.add.circle(sc.x, sc.y, 8, 0xaaddff, 0.9).setDepth(5);
        this.arena.scene.tweens.add({ targets: bolt, scaleX: 8, scaleY: 8, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
      }
    }

    // Phoenix perk: active mode tracking + flame spawning
    if (this.playerPhoenixUntil > 0) {
      if (this.playerPhoenixAura) this.playerPhoenixAura.setPosition(player.x, player.y);
      if (time >= this.playerPhoenixUntil) {
        // Phoenix mode expired
        this.playerPhoenixUntil = 0;
        player.damageAbsorber = null;
        this.arena.playerSpeedMult = this.playerPhoenixSpeedBaseline;
        if (this.playerPhoenixAura) { this.playerPhoenixAura.destroy(); this.playerPhoenixAura = null; }
        this.arena.showFloatingText(player.x, player.y - 30, 'PHOENIX END', '#ff9900');
      } else {
        this.playerPhoenixFlameAccum += delta;
        while (this.playerPhoenixFlameAccum >= 1000) {
          this.playerPhoenixFlameAccum -= 1000;
          const sprite = this.arena.scene.add.circle(player.x, player.y, 7, 0xff6600, 0.85)
            .setStrokeStyle(1, 0xffcc00, 0.7).setDepth(3) as Phaser.GameObjects.Arc;
          this.playerPhoenixFlames.push({ sprite, x: player.x, y: player.y, expiresAt: time + 30000, healSecondsLeft: 0, healTickAccum: 0 });
        }
      }
    }

    // Phoenix flames: consume (step on) or expire
    for (let i = this.playerPhoenixFlames.length - 1; i >= 0; i--) {
      const f = this.playerPhoenixFlames[i];
      f.sprite.setPosition(f.x, f.y);
      if (time >= f.expiresAt) {
        f.sprite.destroy();
        this.playerPhoenixFlames.splice(i, 1);
        continue;
      }
      if (f.healSecondsLeft <= 0 && this.playerPhoenixUntil <= 0) {
        // Check if player touches flame
        if (Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) <= 28) {
          f.healSecondsLeft = 3;
          f.sprite.destroy();
          this.playerPhoenixFlames.splice(i, 1);
          // Separate heal aura tracking via delayedCall ticks
          let remaining = 3;
          const tick = () => {
            if (remaining <= 0 || !player.active) return;
            player.heal(5);
            this.arena.showFloatingText(player.x, player.y - 24, '🔥 +5', '#ff6600');
            remaining--;
            if (remaining > 0) this.arena.scene.time.delayedCall(1000, tick);
          };
          this.arena.scene.time.delayedCall(0, tick);
          continue;
        }
      }
    }
  }

  // ── Input handling ────────────────────────────────────────────────────

  handleInput(
    time: number,
    delta: number,
    mouseX: number,
    mouseY: number,
    pointer: Phaser.Input.Pointer,
  ): void {
    const { player, enemies } = this.arena;
    const scene = this.arena.scene;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // ── Click: Electro Ball / Ball Lightning (Click+) ────────────────
    if (this.arena.hasUpgrade('click')) {
      if (pointer.isDown) {
        if (!this.clickHolding) {
          this.clickHolding = true;
          this.clickHoldStart = time;
          this.clickKineticDrained = 0;
        } else {
          // Drain kinetic at 25/sec while held
          const drainRate = 25 / 1000; // per ms
          const prevDrained = this.clickKineticDrained;
          const totalDrained = Math.min(
            this.kineticPower + prevDrained,
            (time - this.clickHoldStart) * drainRate,
          );
          const newDrain = totalDrained - prevDrained;
          if (newDrain > 0) {
            this.clickKineticDrained = totalDrained;
            const cap = this.arena.hasUpgrade('r') ? 100 : 50;
            this.kineticPower = Math.max(0, this.kineticPower - newDrain);
            this.updateHud(cap);
          }
        }
      } else if (this.clickHolding) {
        // Released
        this.clickHolding = false;
        const holdDuration = time - this.clickHoldStart;
        const drained = this.clickKineticDrained;
        this.clickKineticDrained = 0;

        if (holdDuration < 200 || drained < 25) {
          // Short tap — fire normal electro-ball
          if (player.castAbility('electro-ball', playerCtx)) {
            if (this.kineticPower >= 50) {
              const children = this.arena.projectiles.getChildren();
              const last = children[children.length - 1] as Projectile | undefined;
              if (last && last.texture.key === 'proj-electro') last.setScale(1.25);
            }
          }
        } else {
          // Fire ball lightning based on kinetic consumed
          const cap = this.arena.hasUpgrade('r') ? 100 : 50;
          const tier: 1 | 2 | 3 | 4 =
            drained >= 100 && cap >= 100 ? 4 :
            drained >= 75  && cap >= 100 ? 3 :
            drained >= 50  ? 2 : 1;
          this.spawnBallLightning(player.x, player.y, mouseX, mouseY, tier, time);
        }
      }
    } else {
      // No Click+ — normal electro-ball
      if (pointer.isDown) {
        if (player.castAbility('electro-ball', playerCtx)) {
          if (this.kineticPower >= 50) {
            const children = this.arena.projectiles.getChildren();
            const last = children[children.length - 1] as Projectile | undefined;
            if (last && last.texture.key === 'proj-electro') last.setScale(1.25);
          }
        }
      }
    }

    // ── E: Electro Dash ───────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
      const canRecast = this.electroDashCanRecast && time < this.electroDashRecastExpiry && this.kineticPower >= 15;
      const onCooldown = player.getCooldownRatio('electro-dash') < 1;
      if (canRecast || !onCooldown) {
        const cap = this.arena.hasUpgrade('r') ? 100 : 50;
        if (canRecast) {
          this.kineticPower = Math.max(0, this.kineticPower - 15);
          this.updateHud(cap);
          this.electroDashCanRecast = false;
        } else {
          player.triggerCooldown('electro-dash');
          this.electroDashCanRecast = true;
          this.electroDashRecastExpiry = time + 1500;
        }
        // Teleport 215 units toward cursor
        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const startX = player.x;
        const startY = player.y;
        const endX = startX + (dx / len) * 215;
        const endY = startY + (dy / len) * 215;
        const W = scene.scale.width;
        const H = scene.scale.height;
        const clampedX = Phaser.Math.Clamp(endX, 30, W - 30);
        const clampedY = Phaser.Math.Clamp(endY, 30, H - 30);
        (player.body as Phaser.Physics.Arcade.Body).reset(clampedX, clampedY);
        // Path damage
        const segDX = clampedX - startX;
        const segDY = clampedY - startY;
        const segLen = Math.sqrt(segDX * segDX + segDY * segDY) || 1;
        for (const et of enemies) {
          if (!et.active || et.hp <= 0) continue;
          const tParam = Phaser.Math.Clamp(
            ((et.x - startX) * segDX + (et.y - startY) * segDY) / (segLen * segLen), 0, 1,
          );
          const closestX = startX + tParam * segDX;
          const closestY = startY + tParam * segDY;
          if (Phaser.Math.Distance.Between(closestX, closestY, et.x, et.y) <= 45) {
            et.takeDamage(15);
            this.arena.spawnHitFlash(et.x, et.y, 0xffee00);
            this.arena.showFloatingText(et.x, et.y - 20, '15', '#ffee00');
          }
        }
        // Visuals
        const flash = scene.add.circle(clampedX, clampedY, 8, 0xffee00, 0.6).setDepth(8);
        scene.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
        const trail = scene.add.circle(startX, startY, 8, 0xffcc00, 0.4).setDepth(7);
        scene.tweens.add({ targets: trail, scaleX: 3, scaleY: 3, alpha: 0, duration: 200, onComplete: () => trail.destroy() });

        // E+: spawn storm cloud at landing point
        if (this.arena.hasUpgrade('e')) {
          const cloudSprite = scene.add.image(clampedX, clampedY, 'fx-storm-cloud')
            .setAlpha(0.65).setDepth(2);
          this.stormClouds.push({
            sprite: cloudSprite, x: clampedX, y: clampedY,
            expiresAt: time + 8000, pulseAccum: 0, owner: 'player',
          });
        }
      }
    }

    // ── R: Kinetic Discharge ──────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (player.getCooldownRatio('kinetic-discharge') >= 1 && this.kineticPower >= 20) {
        player.triggerCooldown('kinetic-discharge');
        const cap = this.arena.hasUpgrade('r') ? 100 : 50;
        // Damage: ½ kinetic power; with R+ and kinetic > 50, scales stronger
        let dmg = Math.floor(this.kineticPower * 0.5);
        if (this.arena.hasUpgrade('r') && this.kineticPower > 50) {
          dmg = Math.floor(50 * 0.5 + (this.kineticPower - 50) * 0.8);
        }
        this.kineticPower = Math.max(0, this.kineticPower - 20);
        this.updateHud(cap);
        for (const t of enemies) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(mouseX, mouseY, t.x, t.y) <= 100) {
            t.takeDamage(dmg);
            this.arena.spawnHitFlash(t.x, t.y, 0xffee00);
            if (dmg > 0) this.arena.showFloatingText(t.x, t.y - 20, `${dmg}`, '#ffee00');
          }
        }
        const ring = scene.add.circle(mouseX, mouseY, 10, 0xffee00, 0.9).setDepth(4);
        scene.tweens.add({ targets: ring, scaleX: 10, scaleY: 10, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        const core = scene.add.circle(mouseX, mouseY, 6, 0xffffff, 0.95).setDepth(5);
        scene.tweens.add({ targets: core, scaleX: 4, scaleY: 4, alpha: 0, duration: 180, onComplete: () => core.destroy() });
      }
    }

    // ── F: Pain Battery (hold) / Jumpstart (tap, F+ only) ────────────
    if (this.arena.fKey.isDown) {
      if (!this.painBatteryHolding) {
        this.painBatteryHolding = true;
        this.painBatteryHoldStart = time;
        this.painBatterySelfDmgDealt = 0;
        this.painBatteryTickAccum = 0;
        if (this.painBatteryVisual) this.painBatteryVisual.destroy();
        this.painBatteryVisual = scene.add.circle(player.x, player.y, 30, 0xdd8800, 0.35).setDepth(3);
        scene.tweens.add({ targets: this.painBatteryVisual, alpha: 0.6, yoyo: true, repeat: -1, duration: 200 });
      }
      this.painBatteryTickAccum += delta;
      if (this.painBatteryTickAccum >= 250) {
        this.painBatteryTickAccum -= 250;
        this.painBatterySelfDmgDealt += 5;
        player.applySelfDamage(5);
      }
    } else if (this.painBatteryHolding) {
      this.painBatteryHolding = false;
      if (this.painBatteryVisual) { this.painBatteryVisual.destroy(); this.painBatteryVisual = null; }
      const holdDuration = time - this.painBatteryHoldStart;

      if (this.arena.hasUpgrade('f') && holdDuration < 200) {
        // Tap F: Jumpstart — 20 dmg to nearest enemy, 5 HP/s regen for 6s
        // (self-damage already dealt is 0 since first tick is 250ms)
        const nearest = this.arena.getNearestEnemy(player.x, player.y);
        if (nearest && nearest.active && Phaser.Math.Distance.Between(player.x, player.y, nearest.x, nearest.y) <= 200) {
          nearest.takeDamage(20);
          this.arena.spawnHitFlash(nearest.x, nearest.y, 0xffee00);
          this.arena.showFloatingText(nearest.x, nearest.y - 20, '20', '#ffee00');
        }
        this.electricRegenActive = true;
        this.electricRegenSecondsLeft = 6;
        this.electricRegenAccum = 0;
        this.arena.showFloatingText(player.x, player.y - 30, 'JUMPSTART!', '#ffee00');
      } else {
        // Normal Pain Battery release — AoE blast
        const blastDmg = Math.floor(this.painBatterySelfDmgDealt * 0.75);
        if (blastDmg > 0) {
          for (const t of enemies) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= 120) {
              t.takeDamage(blastDmg);
              this.arena.spawnHitFlash(t.x, t.y, 0xffaa00);
              this.arena.showFloatingText(t.x, t.y - 20, `${blastDmg}`, '#ffaa00');
            }
          }
          const ring = scene.add.circle(player.x, player.y, 10, 0xffaa00, 0.85).setDepth(4);
          scene.tweens.add({ targets: ring, scaleX: 12, scaleY: 12, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
        }
      }
      this.painBatterySelfDmgDealt = 0;
      this.painBatteryTickAccum = 0;
    }

    // ── Q: Restart ────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (player.getCooldownRatio('restart') >= 1) {
        player.triggerCooldown('restart');
        this.overchargeActive = true;
        this.overchargeUntil = time + 5000;
        if (this.overchargeVisual) this.overchargeVisual.destroy();
        this.overchargeVisual = scene.add.circle(player.x, player.y, 36, 0xffee00, 0.2)
          .setStrokeStyle(3, 0xffee00, 0.9).setDepth(3);
        scene.tweens.add({ targets: this.overchargeVisual, alpha: 0.45, yoyo: true, repeat: -1, duration: 300 });
        this.arena.showFloatingText(player.x, player.y - 30, 'OVERCHARGED!', '#ffee00');
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private _activatePhoenix(now: number): void {
    const player = this.arena.player;
    this.playerPhoenixUntil = now + 5000;
    this.playerPhoenixSpeedBaseline = this.arena.playerSpeedMult;
    this.arena.playerSpeedMult = this.playerPhoenixSpeedBaseline * 2;
    player.damageAbsorber = () => true;
    this.playerPhoenixFlameAccum = 0;
    if (this.playerPhoenixAura) this.playerPhoenixAura.destroy();
    this.playerPhoenixAura = this.arena.scene.add.circle(player.x, player.y, 34, 0xff6600, 0.22)
      .setStrokeStyle(2, 0xffcc00, 0.8).setDepth(3) as Phaser.GameObjects.Arc;
    this.arena.scene.tweens.add({ targets: this.playerPhoenixAura, alpha: 0.45, yoyo: true, repeat: -1, duration: 250 });
    this.arena.showFloatingText(player.x, player.y - 44, '🔥 PHOENIX MODE', '#ff6600');
  }

  private updateHud(cap: number): void {
    if (this.kineticPowerText) {
      this.kineticPowerText.setText(`⚡ ${Math.floor(this.kineticPower)}/${cap}`);
    }
  }

  private spawnBallLightning(
    fromX: number, fromY: number,
    toX: number, toY: number,
    tier: 1 | 2 | 3 | 4,
    time: number,
  ): void {
    const scene = this.arena.scene;
    const scale = 1 + (tier - 1) * 0.25;
    const speed = 55;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;

    const img = scene.physics.add.image(fromX, fromY, 'proj-ball-lightning')
      .setScale(scale)
      .setDepth(6);
    (img as unknown as Phaser.Physics.Arcade.Image).setVelocity(vx, vy);

    const bl: BallLightning = {
      proj: img as unknown as BallLightning['proj'],
      tier,
      expiresAt: time + 6000,
      shockAccum: 0,
      lastHitByEnemy: new Map(),
    };
    this.ballLightnings.push(bl);
  }
}
